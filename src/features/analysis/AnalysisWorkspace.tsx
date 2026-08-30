"use client";

import { useMemo, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page/PageHeader";
import { HelpDeskButton, HelpDeskDialog } from "./components/HelpDeskDialog";
import { TicketImportButton, TicketImportDialog } from "./components/TicketImportDialog";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQueryParam } from "@/hooks/useQueryParam";
import { countOrphans } from "@/models/Trash";
import { useProject } from "@/providers/ProjectProvider";

import { AnalysisPanel } from "./components/AnalysisPanel";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { AutoSyncSwitch } from "./components/AutoSyncSwitch";
import { TicketConversation } from "./components/TicketConversation";
import { TicketHeader } from "./components/TicketHeader";
import { TicketDetails } from "./components/TicketDetails";
import { TicketList } from "./components/TicketList";
import { TriageQueue } from "./components/TriageQueue";
import { triageTickets } from "./triage";
import { useTicketRecorte } from "./hooks/useTicketRecorte";
import type { TicketCycle } from "./ticketTableView";
import { TicketDeleteDialog } from "./components/TicketDialogs";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { useKnowledgeLifecycle } from "./providers/KnowledgeLifecycleProvider";
import {
  aiOpportunityName,
  type AIOpportunityKey,
} from "@/features/analysis/types/KnowledgeOpportunity";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { analysisService } from "./services/analysisService";
import { useTickets } from "./providers/TicketsProvider";
import { usePlans } from "../plans/providers/PlansProvider";
import { useLibrary } from "../library/providers/LibraryProvider";
import { useListaPorTeclado } from "./hooks/useListaPorTeclado";

const SIDEBAR_STORAGE_KEY = "visus-workspace-sidebar-collapsed";

export function AnalysisWorkspace() {
  const { activeProject, activeProjectId } = useProject();
  const { ticketsOf, conversationOf, deleteTicket, conversations } = useTickets();
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
  const { items: articles, isHydrated: acervoPronto } = useLibrary();
  const requestedTicketId = useQueryParam("ticket");

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState<boolean>({
    key: SIDEBAR_STORAGE_KEY,
    fallback: false,
  });

  /*
    Memorizado porque a **identidade** do array importa, e não só o conteúdo.

    `ticketsOf` filtra e devolve um array novo a cada chamada; a cada render,
    portanto, um array diferente com os mesmos mil atendimentos dentro. Quem
    guarda trabalho pesado por coleção (o índice da busca, num `WeakMap`; a
    triagem, num `useMemo`) via chave nova toda vez e refazia tudo. Medido: 4,4 s
    entre uma tecla e a lista responder.
  */
  const projectTickets = useMemo(
    () => ticketsOf(activeProjectId),
    [activeProjectId, ticketsOf]
  );

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

  const recorte = useTicketRecorte(projectTickets, ciclo, conversations);


  /*
    Duas perguntas, duas vistas. Atender é "este atendimento aqui"; a triagem é
    "por qual começar". Com mil na fila a segunda deixa de ser opcional, e ela
    estava só dentro do Levantamento, que é outra tela.
  */
  const [vista, setVista] = useState<"atender" | "triagem">("atender");

  const triagem = useMemo(
    () => triageTickets(projectTickets, articles, ciclo.analisados, conversations),
    [projectTickets, articles, ciclo.analisados, conversations]
  );

  useEffect(() => {
    setSelectedTicketId((current) => {
      // Um atendimento pedido pela busca tem precedência sobre a seleção atual.
      if (requestedTicketId && projectTickets.some((ticket) => ticket.id === requestedTicketId)) {
        return requestedTicketId;
      }
      return projectTickets.some((ticket) => ticket.id === current)
        ? current
        : (projectTickets[0]?.id ?? "");
    });
  }, [projectTickets, requestedTicketId]);

  const selectedTicket =
    projectTickets.find((ticket) => ticket.id === selectedTicketId) ?? projectTickets[0];
  const selectedConversation = selectedTicket ? conversationOf(selectedTicket.id) : undefined;
  const context = useAnalysisContext(articles, selectedTicket, selectedConversation);
  const analysis =
    selectedTicket && activeProjectId ? getAnalysis(activeProjectId, selectedTicket.id) : undefined;

  const deletingTicket = projectTickets.find((ticket) => ticket.id === deletingTicketId);
  const { taxonomy } = useTaxonomy();

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

        return taxonomy.opportunityTypes.find((entry) => entry.name === name)?.id ?? "";
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

  function handleDelete() {
    if (!deletingTicketId) return;
    deleteTicket(deletingTicketId);
    setDeletingTicketId(null);
  }

  const [importOpen, setImportOpen] = useState(false);
  const [helpDeskOpen, setHelpDeskOpen] = useState(false);

  /*
    Andar pela fila com o teclado, como num help desk. Desligado enquanto há
    diálogo aberto: ali as setas são de quem está no diálogo.
  */
  useListaPorTeclado({
    ids: recorte.pagina.map((ticket) => ticket.id),
    selecionado: selectedTicketId,
    aoSelecionar: setSelectedTicketId,
    ativo: !importOpen && !helpDeskOpen && deletingTicketId === null,
  });

  const dialogs = (
    <>
      <TicketImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <HelpDeskDialog open={helpDeskOpen} onOpenChange={setHelpDeskOpen} />

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
          title="Atendimentos"
          description="O atendimento entra como veio do suporte e não se edita aqui. Esta tela é onde ele vira análise, e a decisão sobre cada oportunidade é de gente."
          icon={<Sparkles className="h-6 w-6" />}
          actions={
            <div className="flex flex-wrap gap-2">
              <HelpDeskButton onClick={() => setHelpDeskOpen(true)} />
              <TicketImportButton onClick={() => setImportOpen(true)} />
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
        overline={`Projeto ativo${activeProject ? ` · ${activeProject.name}` : ""}`}
        title="Atendimentos"
        description="O atendimento entra como veio do suporte e não se edita aqui. Esta tela é onde ele vira análise, e a decisão sobre cada oportunidade é de gente."
        icon={<Sparkles className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <HelpDeskButton onClick={() => setHelpDeskOpen(true)} />
            <TicketImportButton onClick={() => setImportOpen(true)} />
          </div>
        }
      />

      <AutoSyncSwitch />

      <ViewSwitch vista={vista} onChange={setVista} naFila={triagem.groups.length} />

      {vista === "triagem" ? (
        <>
          <TriageQueue
            triagem={triagem}
            acervoPronto={acervoPronto}
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setVista("atender");
            }}
          />

          {dialogs}
        </>
      ) : (
        <>
          <AnalysisProgress analysis={analysis} />

          {/*
        Três colunas: a lista, a conversa e o contexto.

        É a forma do help desk, e ela vem do que se faz aqui: escolher na lista,
        **ler a conversa**, e olhar de lado quem é o cliente e o que já se sabe.
        A conversa fica no meio porque é o que ocupa o tempo de quem lê.

        Empilhado, como estava, o diálogo de noventa e quatro mensagens empurrava
        os atributos e a análise para fora da tela.

        A análise fica embaixo, em largura cheia: ela é um espaço de trabalho com
        oportunidades e conversa própria, e não cabe numa coluna estreita.
      */}
          <div
            className={`grid gap-5 transition-all duration-300 ${
              isSidebarCollapsed
                ? "grid-cols-[auto_minmax(0,1fr)]"
                : "xl:grid-cols-[minmax(16rem,0.26fr)_minmax(0,1fr)_minmax(17rem,0.28fr)]"
            }`}
          >
            <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <TicketList
                recorte={recorte}
                ciclo={ciclo}
                selectedTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              />
            </aside>

            <main className="flex min-w-0 flex-col xl:h-[calc(100vh-13rem)]">
              <TicketHeader
                ticket={selectedTicket}
                isAnalyzing={isAnalyzing}
                onAnalyze={handleAnalyze}
                onDelete={() => setDeletingTicketId(selectedTicket.id)}
                analysisStatus={analysis?.status}
              />

              <TicketConversation conversation={selectedConversation} ticket={selectedTicket} />
            </main>

            <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <TicketDetails
                ticket={selectedTicket}
                conversation={selectedConversation}
                analysisStatus={analysis?.status}
              />
            </aside>
          </div>

          <div className="space-y-8">
            <AnalysisPanel
              analysisRecord={analysis}
              context={context}
              onMessagesChange={(messages) => analysis && updateMessages(analysis.id, messages)}
              onOpportunityStatusChange={(opportunityId, status) =>
                analysis && updateOpportunityStatus(analysis.id, opportunityId, status)
              }
              onOpportunityUpdate={(opportunityId, changes) =>
                analysis && updateOpportunity(analysis.id, opportunityId, changes)
              }
              onFinalize={handleFinalize}
            />
          </div>

          {dialogs}
        </>
      )}
    </div>
  );
}

/**
 * A troca entre atender e triar.
 *
 * Fica acima do conteúdo e não no menu: são duas formas de olhar a mesma
 * coleção, e não dois lugares. O número na aba é o que faz alguém clicar; sem
 * ele a triagem é uma aba que ninguém sabe se tem algo dentro.
 */
function ViewSwitch({
  vista,
  onChange,
  naFila,
}: {
  vista: "atender" | "triagem";
  onChange: (proxima: "atender" | "triagem") => void;
  naFila: number;
}) {
  return (
    <div className="flex w-fit gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
      <Button
        size="sm"
        variant={vista === "atender" ? "secondary" : "ghost"}
        onClick={() => onChange("atender")}
      >
        Atender
      </Button>

      <Button
        size="sm"
        variant={vista === "triagem" ? "secondary" : "ghost"}
        onClick={() => onChange("triagem")}
      >
        Fila de triagem
        {naFila > 0 && (
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {naFila}
          </span>
        )}
      </Button>
    </div>
  );
}
