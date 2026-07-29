"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelRightClose, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { TicketList } from "./components/TicketList";
import { TicketDetails } from "./components/TicketDetails";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { analysisService } from "./services/analysisService";
import { ticketService } from "./services/ticketService";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { useKnowledgeLifecycle } from "./providers/KnowledgeLifecycleProvider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page/PageHeader";
import { useApp } from "@/providers/AppProvider";
import type { Ticket } from "@/models/Ticket";

export function AnalysisWorkspace() {
  const { currentProjectId } = useApp();
  const { getAnalysis, saveAnalysis, setAnalysisStatus, updateMessages, updateOpportunityStatus } = useKnowledgeLifecycle();
  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTickets, setShowTickets] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);

  useEffect(() => {
    if (!currentProjectId) return;
    const tickets = ticketService.getTickets(currentProjectId);
    setProjectTickets(tickets);
    setSelectedTicketId((current) => tickets.some((ticket) => ticket.id === current) ? current : tickets[0]?.id ?? "");
  }, [currentProjectId]);

  const selectedTicket = projectTickets.find((ticket) => ticket.id === selectedTicketId) ?? projectTickets[0];
  const context = useAnalysisContext(selectedTicket);
  const analysis = selectedTicket && currentProjectId ? getAnalysis(currentProjectId, selectedTicket.id) : undefined;

  async function handleAnalyze() {
    if (!selectedTicket || !currentProjectId) return;
    setIsAnalyzing(true);
    try {
      const response = await analysisService.startAnalysis(context);
      saveAnalysis({ projectId: currentProjectId, ticketId: selectedTicket.id, result: response.analysisResult, messages: response.messages });
      setShowAnalysis(true);
      toast.success("Análise pronta para revisão humana.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir a análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleUpdateTicket(ticket: Ticket) {
    ticketService.updateTicket(ticket);
    if (currentProjectId) setProjectTickets(ticketService.getTickets(currentProjectId));
  }

  function handleDeleteTicket(ticketId: string) {
    ticketService.deleteTicket(ticketId);
    if (!currentProjectId) return;
    const remaining = ticketService.getTickets(currentProjectId);
    setProjectTickets(remaining);
    if (selectedTicketId === ticketId) setSelectedTicketId(remaining[0]?.id ?? "");
  }

  if (!selectedTicket) return <div className="flex min-h-96 items-center justify-center border-y border-dashed py-12 text-center text-sm text-muted-foreground">Nenhum atendimento encontrado para o projeto selecionado.</div>;

  const gridColumns = `${showTickets ? "minmax(15rem,0.7fr)" : "0px"} minmax(0,1.2fr) ${showAnalysis ? "minmax(20rem,1fr)" : "0px"}`;

  return (
    <div className="space-y-7">
      <PageHeader overline="Workspace de análise" title="Transforme atendimentos em conhecimento" description="Analise, revise e finalize oportunidades que evoluem a Base de Conhecimento." icon={<Sparkles className="h-6 w-6" />} actions={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setShowTickets((value) => !value)}><PanelLeftClose className="mr-2 h-4 w-4" />Atendimentos</Button><Button variant="outline" size="sm" onClick={() => setShowAnalysis((value) => !value)}><PanelRightClose className="mr-2 h-4 w-4" />Análise</Button></div>} />
      <div className="grid gap-5 xl:h-[calc(100vh-17rem)]" style={{ gridTemplateColumns: gridColumns }}>
        {showTickets && <aside className="min-w-0 xl:min-h-0 xl:overflow-y-auto"><TicketList tickets={projectTickets.slice(0, 5)} selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} /></aside>}
        <main className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1"><TicketDetails ticket={selectedTicket} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onSave={handleUpdateTicket} onDelete={handleDeleteTicket} analysisStatus={analysis?.status} onFinalize={() => analysis && setAnalysisStatus(analysis.id, "completed")} /></main>
        {showAnalysis && <aside className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1"><AnalysisPanel analysisRecord={analysis} context={context} onMessagesChange={(messages) => analysis && updateMessages(analysis.id, messages)} onOpportunityStatusChange={(opportunityId, status) => analysis && updateOpportunityStatus(analysis.id, opportunityId, status)} /></aside>}
      </div>
    </div>
  );
}
