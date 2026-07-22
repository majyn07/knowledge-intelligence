"use client";

import { useEffect, useMemo, useState } from "react";

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

export function AnalysisWorkspace() {
  const { currentProjectId } = useApp();

  const { setImprovementPlan } = usePlans();

  const [refreshKey, setRefreshKey] = useState(0);

  const projectTickets = useMemo(
    () =>
      currentProjectId
        ? ticketService.getTickets(currentProjectId)
        : [],
    [currentProjectId, refreshKey]
  );

  const [selectedTicketId, setSelectedTicketId] =
    useState(projectTickets[0]?.id ?? "");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const [messages, setMessages] = useState<
    AnalysisMessage[]
  >([]);

  const selectedTicket =
    projectTickets.find(
      (ticket) => ticket.id === selectedTicketId
    ) ?? projectTickets[0];

  const context = useAnalysisContext(selectedTicket);

  useEffect(() => {
    if (projectTickets.length > 0) {
      setSelectedTicketId(projectTickets[0].id);
      setAnalysisResult(null);
      setMessages([]);
    }
  }, [projectTickets]);

  async function handleAnalyze() {
    if (!selectedTicket) {
      return;
    }

    setIsAnalyzing(true);

    setAnalysisResult(null);
    setMessages([]);

    try {
      const response =
        await analysisService.startAnalysis(context);

      setAnalysisResult(response.analysisResult);
      setMessages(response.messages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSelectTicket(id: string) {
    setSelectedTicketId(id);
    setAnalysisResult(null);
    setMessages([]);
  }

  function handleUpdateTicket(ticket: Ticket) {
    ticketService.updateTicket(ticket);

    setRefreshKey((value) => value + 1);
  }

  function handleDeleteTicket(ticketId: string) {
    ticketService.deleteTicket(ticketId);

    setRefreshKey((value) => value + 1);

    if (selectedTicketId === ticketId) {
      const remainingTickets = currentProjectId
        ? ticketService.getTickets(currentProjectId)
        : [];

      setSelectedTicketId(
        remainingTickets[0]?.id ?? ""
      );

      setAnalysisResult(null);
      setMessages([]);
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
    console.log("Descartada:", recommendation);
  }

  if (!selectedTicket) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Nenhum atendimento encontrado para o projeto selecionado.
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      <TicketList
        tickets={projectTickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={handleSelectTicket}
      />

      <TicketDetails
        ticket={selectedTicket}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
        onSave={handleUpdateTicket}
        onDelete={handleDeleteTicket}
      />

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
    </div>
  );
}