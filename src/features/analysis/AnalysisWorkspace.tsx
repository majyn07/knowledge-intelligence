"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page/PageHeader";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQueryParam } from "@/hooks/useQueryParam";
import type { Ticket } from "@/models/Ticket";
import { useProject } from "@/providers/ProjectProvider";

import { AnalysisPanel } from "./components/AnalysisPanel";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { TicketDetails } from "./components/TicketDetails";
import { TicketList } from "./components/TicketList";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { useKnowledgeLifecycle } from "./providers/KnowledgeLifecycleProvider";
import { analysisService } from "./services/analysisService";
import { ticketService } from "./services/ticketService";
import { usePlans } from "../plans/providers/PlansProvider";
import { useLibrary } from "../library/providers/LibraryProvider";

const SIDEBAR_STORAGE_KEY = "visus-workspace-sidebar-collapsed";

export function AnalysisWorkspace() {
  const { activeProject, activeProjectId } = useProject();
  const {
    getAnalysis,
    saveAnalysis,
    setAnalysisStatus,
    updateMessages,
    updateOpportunity,
    updateOpportunityStatus,
    linkOpportunityToPlan,
  } = useKnowledgeLifecycle();
  const { createPlanFromApprovedOpportunity } = usePlans();
  const { items: articles } = useLibrary();
  const requestedTicketId = useQueryParam("ticket");

  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState<boolean>({
    key: SIDEBAR_STORAGE_KEY,
    fallback: false,
  });

  useEffect(() => {
    if (!activeProjectId) return;
    const tickets = ticketService.getTickets(activeProjectId);
    setProjectTickets(tickets);
    setSelectedTicketId((current) => {
      // Um atendimento pedido pela busca tem precedência sobre a seleção atual.
      if (requestedTicketId && tickets.some((ticket) => ticket.id === requestedTicketId)) {
        return requestedTicketId;
      }
      return tickets.some((ticket) => ticket.id === current) ? current : tickets[0]?.id ?? "";
    });
  }, [activeProjectId, requestedTicketId]);

  const selectedTicket =
    projectTickets.find((ticket) => ticket.id === selectedTicketId) ??
    projectTickets[0];
  const context = useAnalysisContext(articles, selectedTicket);
  const analysis =
    selectedTicket && activeProjectId
      ? getAnalysis(activeProjectId, selectedTicket.id)
      : undefined;

  async function handleAnalyze() {
    if (!selectedTicket || !activeProjectId) return;
    setIsAnalyzing(true);
    try {
      const response = await analysisService.startAnalysis(context);
      saveAnalysis({
        projectId: activeProjectId,
        ticketId: selectedTicket.id,
        result: response.analysisResult,
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

  if (!selectedTicket) {
    return (
      <div className="flex min-h-96 items-center justify-center border-y border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhum atendimento encontrado para o projeto ativo. Selecione outro
        projeto quando houver novos atendimentos disponíveis.
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
            tickets={projectTickets}
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
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
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
    </div>
  );
}
