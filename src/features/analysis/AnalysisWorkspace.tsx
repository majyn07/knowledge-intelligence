"use client";

import { useEffect, useState } from "react";

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

import { useApp } from "@/providers/AppProvider";
import { usePlans } from "../plans/providers/PlansProvider";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { PageHeader } from "@/components/common/page/PageHeader";
import { Sparkles } from "lucide-react";

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

    const tickets =
      ticketService.getTickets(currentProjectId);

    setProjectTickets(tickets);

    setSelectedTicketId((current) => {
      if (
        current &&
        tickets.some(
          (ticket) => ticket.id === current
        )
      ) {
        return current;
      }

      return tickets[0]?.id ?? "";
    });

    setAnalysisResult(null);
    setMessages([]);
  }, [currentProjectId]);

  const selectedTicket =
    projectTickets.find(
      (ticket) => ticket.id === selectedTicketId
    ) ?? projectTickets[0];

  const context =
    useAnalysisContext(selectedTicket);

  async function handleAnalyze() {
    if (!selectedTicket) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setMessages([]);

    try {
      const response =
        await analysisService.startAnalysis(
          context
        );

      setAnalysisResult(
        response.analysisResult
      );

      setMessages(response.messages);
    } catch (error) {
      console.error(error);
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

    setProjectTickets(
      ticketService.getTickets(currentProjectId)
    );
  }

  function handleDeleteTicket(ticketId: string) {
    ticketService.deleteTicket(ticketId);

    if (!currentProjectId) {
      return;
    }

    const remainingTickets =
      ticketService.getTickets(currentProjectId);

    setProjectTickets(remainingTickets);

    if (selectedTicketId === ticketId) {
      setSelectedTicketId(
        remainingTickets[0]?.id ?? ""
      );

      resetAnalysis();
    }
  }

  function handleApproveRecommendation(
    recommendation: Recommendation
  ) {
    setImprovementPlan((current) =>
      plansService.approveRecommendation(
        current,
        recommendation
      )
    );
  }

  function handleDiscardRecommendation(
    recommendation: Recommendation
  ) {
    console.log(
      "Descartada:",
      recommendation
    );
  }

  if (!selectedTicket) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        Nenhum atendimento encontrado para o projeto
        selecionado.
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

      <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[330px_minmax(0,1.25fr)_480px]">
        <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
          <AnalysisPanel
            analysisResult={analysisResult}
            messages={messages}
            setMessages={setMessages}
            context={context}
            onApproveRecommendation={
              handleApproveRecommendation
            }
            onDiscardRecommendation={
              handleDiscardRecommendation
            }
          />
        </aside>
      </div>
    </div>
  );
}