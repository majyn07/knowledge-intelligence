"use client";

import { useState } from "react";

import { tickets } from "./mock/tickets";

import { TicketList } from "./components/TicketList";
import { TicketDetails } from "./components/TicketDetails";
import { AnalysisPanel } from "./components/AnalysisPanel";

type AnalysisResult = {
  classification: "strong" | "partial" | "none";
  relatedArticles: number;
  updates: number;
};

export function AnalysisWorkspace() {
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0].id);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId)!;

  async function handleAnalyze() {
    setIsAnalyzing(true);

    setAnalysisResult(null);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setAnalysisResult({
      classification: "partial",
      relatedArticles: 2,
      updates: 1,
    });

    setIsAnalyzing(false);
  }

  function handleSelectTicket(id: string) {
    setSelectedTicketId(id);
    setAnalysisResult(null);
  }

  return (
    <div className="flex h-full gap-6">

      <TicketList
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onSelectTicket={handleSelectTicket}
      />

      <TicketDetails
        ticket={selectedTicket}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
      />

      <AnalysisPanel
        analysisResult={analysisResult}
      />

    </div>
  );
}