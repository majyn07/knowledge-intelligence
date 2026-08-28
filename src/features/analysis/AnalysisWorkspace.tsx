"use client";

import { useMemo, useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page/PageHeader";
import { TicketImportButton, TicketImportDialog } from "./components/TicketImportDialog";
import { Button } from "@/components/ui/button";
import { DiscardChangesDialog } from "@/components/common/DiscardChangesDialog";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { useQueryParam } from "@/hooks/useQueryParam";
import { countOrphans } from "@/models/Trash";
import { useProject } from "@/providers/ProjectProvider";

import { AnalysisPanel } from "./components/AnalysisPanel";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { TicketDetails } from "./components/TicketDetails";
import { TicketList } from "./components/TicketList";
import { useTicketRecorte } from "./hooks/useTicketRecorte";
import type { TicketCycle } from "./ticketTableView";
import { TicketForm } from "./components/TicketForm";
import { TicketDeleteDialog, TicketDialog } from "./components/TicketDialogs";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { useKnowledgeLifecycle } from "./providers/KnowledgeLifecycleProvider";
import {
  aiOpportunityName,
  type AIOpportunityKey,
} from "@/features/analysis/types/KnowledgeOpportunity";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { analysisService } from "./services/analysisService";
import { ticketService } from "./services/ticketService";
import { useTickets } from "./providers/TicketsProvider";
import type { TicketFormData } from "./types/TicketFormData";
import { usePlans } from "../plans/providers/PlansProvider";
import { useLibrary } from "../library/providers/LibraryProvider";

const SIDEBAR_STORAGE_KEY = "visus-workspace-sidebar-collapsed";

export function AnalysisWorkspace() {
  const { activeProject, activeProjectId, projects } = useProject();
  const { ticketsOf, conversationOf, createTicket, updateTicket, deleteTicket } = useTickets();
  const {
    getAnalysis,
    saveAnalysis,
    setAnalysisStatus,
    updateMessages,
    updateOpportunity,
    updateOpportunityStatus,
    linkOpportunityToPlan,
    analyses,
  } = useKnowledgeLifecycle();
  const { createPlanFromApprovedOpportunity, plans } = usePlans();
  const { items: articles } = useLibrary();
  const requestedTicketId = useQueryParam("ticket");

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState<boolean>({
    key: SIDEBAR_STORAGE_KEY,
    fallback: false,
  });

  const createGuard = useUnsavedGuard(() => setIsCreating(false));
  const editGuard = useUnsavedGuard(() => setEditingTicketId(null));

  const projectTickets = ticketsOf(activeProjectId);

  /*
    Onde cada atendimento esta no ciclo. Sai de duas fontes ja em memoria: as
    analises deste projeto e os artigos que nasceram de um atendimento. Nenhuma
    consulta nova, como o painel.
  */
  const ciclo = useMemo<TicketCycle>(
    () => ({
      analisados: new Set(
        analyses
          .filter((analysis) => analysis.projectId === activeProjectId)
          .map((analysis) => analysis.ticketId)
      ),
      comArtigo: new Set(
        articles
          .map((article) => article.source?.ticketId)
          .filter((id): id is string => Boolean(id))
      ),
    }),
    [activeProjectId, analyses, articles]
  );

  const recorte = useTicketRecorte(projectTickets, ciclo);

  useEffect(() => {
    setSelectedTicketId((current) => {
      // Um atendimento pedido pela busca tem precedência sobre a seleção atual.
      if (requestedTicketId && projectTickets.some((ticket) => ticket.id === requestedTicketId)) {
        return requestedTicketId;
      }
      return projectTickets.some((ticket) => ticket.id === current)
        ? current
        : projectTickets[0]?.id ?? "";
    });
  }, [projectTickets, requestedTicketId]);

  const selectedTicket =
    projectTickets.find((ticket) => ticket.id === selectedTicketId) ?? projectTickets[0];
  const selectedConversation = selectedTicket ? conversationOf(selectedTicket.id) : undefined;
  const context = useAnalysisContext(articles, selectedTicket, selectedConversation);
  const analysis =
    selectedTicket && activeProjectId
      ? getAnalysis(activeProjectId, selectedTicket.id)
      : undefined;

  const editingTicket = projectTickets.find((ticket) => ticket.id === editingTicketId);
  const deletingTicket = projectTickets.find((ticket) => ticket.id === deletingTicketId);
  const { taxonomy } = useTaxonomy();

  const projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));

  async function handleAnalyze() {
    if (!selectedTicket || !activeProjectId) return;
    setIsAnalyzing(true);
    try {
      const response = await analysisService.startAnalysis(context);

      /*
        O modelo devolve as chaves que ele conhece; o produto trabalha com o
        cadastro da equipe. A tradução é por nome, e chave sem correspondência
        vira tipo vazio: a revisão humana decide, que é a regra do ciclo.

        Enquanto isso, id e status continuam atribuídos aqui e nunca pelo modelo.
      */
      const opportunityTypeId = (key: string) => {
        const name = aiOpportunityName[key as AIOpportunityKey];
        if (!name) return "";

        return (
          taxonomy.opportunityTypes.find((entry) => entry.name === name)?.id ?? ""
        );
      };

      saveAnalysis({
        projectId: activeProjectId,
        ticketId: selectedTicket.id,
        result: {
          ...response.analysisResult,
          opportunities: response.analysisResult.opportunities.map((opportunity) => ({
            ...opportunity,
            type: opportunityTypeId(opportunity.type),
          })),
        },
        relatedArticles: response.context?.relatedArticles ?? [],
        messages: response.messages,
      });
      toast.success("Análise pronta para revisão humana.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir a análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleFinalize() {
    if (!analysis || !activeProject) return;

    const approvedOpportunities = analysis.result.opportunities.filter(
      (opportunity) => opportunity.status === "approved"
    );
    const createdPlans = approvedOpportunities.filter((opportunity) => {
      const result = createPlanFromApprovedOpportunity({
        projectName: activeProject.name,
        analysis,
        opportunity,
      });
      linkOpportunityToPlan(analysis.id, opportunity.id, result.plan.id);
      return result.created;
    });

    setAnalysisStatus(analysis.id, "completed");
    toast.success(
      createdPlans.length > 0
        ? `${createdPlans.length} plano(s) criado(s) a partir de oportunidade(s) aprovada(s).`
        : "Revisão finalizada. Nenhuma nova oportunidade aprovada aguardava plano."
    );
  }

  function handleCreate(data: TicketFormData) {
    const ticket = createTicket(data);
    setSelectedTicketId(ticket.id);
    setIsCreating(false);
  }

  function handleUpdate(data: TicketFormData) {
    if (!editingTicketId) return;
    updateTicket(editingTicketId, data);
    setEditingTicketId(null);
  }

  function handleDelete() {
    if (!deletingTicketId) return;
    deleteTicket(deletingTicketId);
    setDeletingTicketId(null);
  }

  const [importOpen, setImportOpen] = useState(false);

  const dialogs = (
    <>
      <TicketImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <TicketDialog
        open={isCreating}
        onOpenChange={(open) => { if (!open) createGuard.requestClose(); }}
        title="Novo atendimento"
        description="Registre o caso e a conversa que o sustenta. É essa troca que a análise vai ler."
      >
        <TicketForm
          key={isCreating ? "novo" : "fechado"}
          isNew
          projects={projectOptions}
          initialData={
            activeProjectId
              ? {
                  title: "",
                  company: "",
                  solution: "",
                  externalId: "",
                  // Vazia: quem preenche com hoje é o próprio formulário,
                  // depois da montagem. Ler o relógio aqui seria no render.
                  date: "",
                  projectId: activeProjectId,
                  messages: [],
                }
              : undefined
          }
          submitLabel="Criar atendimento"
          onSubmit={(data) => { createGuard.reset(); handleCreate(data); }}
          onCancel={createGuard.requestClose}
          onDirty={createGuard.markDirty}
        />
      </TicketDialog>

      <TicketDialog
        open={Boolean(editingTicket)}
        onOpenChange={(open) => { if (!open) editGuard.requestClose(); }}
        title="Editar atendimento"
        description="Atualize os dados do caso ou o registro da conversa."
      >
        {editingTicket && (
          <TicketForm
            key={editingTicket.id}
            projects={projectOptions}
            initialData={ticketService.toFormData(editingTicket, conversationOf(editingTicket.id))}
            submitLabel="Atualizar"
            onSubmit={(data) => { editGuard.reset(); handleUpdate(data); }}
            onCancel={editGuard.requestClose}
            onDirty={editGuard.markDirty}
          />
        )}
      </TicketDialog>

      <DiscardChangesDialog
        open={createGuard.isConfirming || editGuard.isConfirming}
        onKeepEditing={createGuard.isConfirming ? createGuard.keepEditing : editGuard.keepEditing}
        onDiscard={createGuard.isConfirming ? createGuard.confirmDiscard : editGuard.confirmDiscard}
      />

      <TicketDeleteDialog
        open={Boolean(deletingTicket)}
        ticketTitle={deletingTicket?.title ?? ""}
        orphans={countOrphans({
          analyses,
          plans,
          articles,
          of: { kind: "ticket", id: deletingTicket?.id ?? "" },
        })}
        onCancel={() => setDeletingTicketId(null)}
        onConfirm={handleDelete}
      />
    </>
  );

  if (!selectedTicket) {
    return (
      <div className="w-full space-y-7">
        <PageHeader
          overline={`Projeto ativo${activeProject ? ` · ${activeProject.name}` : ""}`}
          title="Conduza a evolução do conhecimento"
          description="Do atendimento à decisão humana: valide as evidências da IA e encaminhe apenas as oportunidades que fazem sentido para este projeto."
          icon={<Sparkles className="h-6 w-6" />}
          actions={
            <div className="flex flex-wrap gap-2">
              <TicketImportButton onClick={() => setImportOpen(true)} />

              <Button onClick={() => setIsCreating(true)} disabled={!activeProjectId}>
                <Plus className="mr-1.5 h-4 w-4" />
                Novo atendimento
              </Button>
            </div>
          }
        />

        <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center text-sm leading-6 text-muted-foreground">
          Nenhum atendimento registrado em {activeProject?.name ?? "este projeto"}. Registre o
          primeiro para começar o ciclo de conhecimento.
        </div>

        {dialogs}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        overline={`Projeto ativo${
          activeProject ? ` · ${activeProject.name}` : ""
        }`}
        title="Conduza a evolução do conhecimento"
        description="Do atendimento à decisão humana: valide as evidências da IA e encaminhe apenas as oportunidades que fazem sentido para este projeto."
        icon={<Sparkles className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <TicketImportButton onClick={() => setImportOpen(true)} />

            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo atendimento
            </Button>
          </div>
        }
      />

      <AnalysisProgress analysis={analysis} />

      <div
        className={`grid gap-6 transition-all duration-300 ${
          isSidebarCollapsed
            ? "grid-cols-[auto_minmax(0,1fr)]"
            : "xl:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)]"
        }`}
      >
        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <TicketList
            recorte={recorte}
            ciclo={ciclo}
            selectedTicketId={selectedTicketId}
            onSelectTicket={setSelectedTicketId}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() =>
              setIsSidebarCollapsed((collapsed) => !collapsed)
            }
          />
        </aside>

        <main className="min-w-0 space-y-8">
          <TicketDetails
            ticket={selectedTicket}
            conversation={selectedConversation}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
            onEdit={() => setEditingTicketId(selectedTicket.id)}
            onDelete={() => setDeletingTicketId(selectedTicket.id)}
            analysisStatus={analysis?.status}
          />

          <AnalysisPanel
            analysisRecord={analysis}
            context={context}
            onMessagesChange={(messages) =>
              analysis && updateMessages(analysis.id, messages)
            }
            onOpportunityStatusChange={(opportunityId, status) =>
              analysis && updateOpportunityStatus(analysis.id, opportunityId, status)
            }
            onOpportunityUpdate={(opportunityId, changes) =>
              analysis && updateOpportunity(analysis.id, opportunityId, changes)
            }
            onFinalize={handleFinalize}
          />
        </main>
      </div>

      {dialogs}
    </div>
  );
}
