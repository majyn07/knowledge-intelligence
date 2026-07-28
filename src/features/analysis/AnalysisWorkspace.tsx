"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { TicketList } from "./components/TicketList";
import { TicketDetails } from "./components/TicketDetails";
import { AnalysisPanel } from "./components/AnalysisPanel";

import { analysisService } from "./services/analysisService";
import { ticketService } from "./services/ticketService";
import { plansService } from "../plans/services/plansService";

import type { AnalysisResult } from "@/models/AnalysisResult";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { Recommendation } from "@/models/Recommendation";
import type { Ticket } from "@/models/Ticket";

import { PageHeader } from "@/components/common/page/PageHeader";
import { useApp } from "@/providers/AppProvider";
import { usePlans } from "../plans/providers/PlansProvider";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { toast } from "sonner";

export function AnalysisWorkspace() {
  const { currentProjectId } = useApp();
  const { setImprovementPlan } = usePlans();

  const [projectTickets, setProjectTickets] =
    useState<Ticket[]>([]);

  const [selectedTicketId, setSelectedTicketId] =
    useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const [messages, setMessages] = useState<
    AnalysisMessage[]
  >([]);

  useEffect(() => {
    if (!currentProjectId) {
      setProjectTickets([]);
      setSelectedTicketId("");
      setAnalysisResult(null);
      setMessages([]);
      return;
    }

    const tickets = ticketService.getTickets(currentProjectId);

    setProjectTickets(tickets);

    setSelectedTicketId((current) => {
      if (current && tickets.some((ticket) => ticket.id === current)) {
        return current;
      }

      return tickets[0]?.id ?? "";
    });

    setAnalysisResult(null);
    setMessages([]);
  }, [currentProjectId]);

  const selectedTicket =
    projectTickets.find((ticket) => ticket.id === selectedTicketId) ??
    projectTickets[0];

  const context = useAnalysisContext(selectedTicket);

  async function handleAnalyze() {
    if (!selectedTicket) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setMessages([]);

    try {
      const response = await analysisService.startAnalysis(context);

      setAnalysisResult(response.analysisResult);
      setMessages(response.messages);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir a análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function resetAnalysis() {
    setAnalysisResult(null);
    setMessages([]);
  }

  function handleSelectTicket(id: string) {
    setSelectedTicketId(id);
    resetAnalysis();
  }

  function handleUpdateTicket(ticket: Ticket) {
    ticketService.updateTicket(ticket);

    if (!currentProjectId) {
      return;
    }

    setProjectTickets(ticketService.getTickets(currentProjectId));
  }

  function handleDeleteTicket(ticketId: string) {
    ticketService.deleteTicket(ticketId);

    if (!currentProjectId) {
      return;
    }

    const remainingTickets = ticketService.getTickets(currentProjectId);

    setProjectTickets(remainingTickets);

    if (selectedTicketId === ticketId) {
      setSelectedTicketId(remainingTickets[0]?.id ?? "");
      resetAnalysis();
    }
  }

  function handleApproveRecommendation(recommendation: Recommendation) {
    setImprovementPlan((current) =>
      plansService.approveRecommendation(current, recommendation)
    );
  }

  function handleDiscardRecommendation(recommendation: Recommendation) {
    toast.info("Recomendação descartada.", {
      description: recommendation.title,
    });
  }

  if (!selectedTicket) {
    return (
      <div className="flex min-h-96 items-center justify-center border-y border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhum atendimento encontrado para o projeto selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        overline="Workspace de análise"
        title="Transforme atendimentos em conhecimento"
        description="Compare o contexto do suporte com a leitura da IA e aprove apenas recomendações fundamentadas."
        icon={<Sparkles className="h-6 w-6" />}
      />

      <div className="grid gap-7 xl:h-[calc(100vh-17rem)] xl:grid-cols-[18rem_minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <TicketList
            tickets={projectTickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleSelectTicket}
          />
        </aside>

        <main className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <TicketDetails
            ticket={selectedTicket}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
            onSave={handleUpdateTicket}
            onDelete={handleDeleteTicket}
          />
        </main>

        <aside className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <AnalysisPanel
            analysisResult={analysisResult}
            messages={messages}
            setMessages={setMessages}
            context={context}
            onApproveRecommendation={handleApproveRecommendation}
            onDiscardRecommendation={handleDiscardRecommendation}
          />
        </aside>
      </div>
    </div>
  );
}
