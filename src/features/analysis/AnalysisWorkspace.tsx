"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page/PageHeader";
import type { Ticket } from "@/models/Ticket";
import { useApp } from "@/providers/AppProvider";
import { projects } from "@/features/projects/mock/projects";

import { AnalysisPanel } from "./components/AnalysisPanel";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { TicketDetails } from "./components/TicketDetails";
import { TicketList } from "./components/TicketList";
import { useAnalysisContext } from "./hooks/useAnalysisContext";
import { useKnowledgeLifecycle } from "./providers/KnowledgeLifecycleProvider";
import { analysisService } from "./services/analysisService";
import { ticketService } from "./services/ticketService";

export function AnalysisWorkspace() {
  const { currentProjectId } = useApp();
  const { getAnalysis, saveAnalysis, setAnalysisStatus, updateMessages, updateOpportunity, updateOpportunityStatus } = useKnowledgeLifecycle();
  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => { if (!currentProjectId) return; const tickets = ticketService.getTickets(currentProjectId); setProjectTickets(tickets); setSelectedTicketId((current) => tickets.some((ticket) => ticket.id === current) ? current : tickets[0]?.id ?? ""); }, [currentProjectId]);

  const selectedTicket = projectTickets.find((ticket) => ticket.id === selectedTicketId) ?? projectTickets[0];
  const context = useAnalysisContext(selectedTicket);
  const analysis = selectedTicket && currentProjectId ? getAnalysis(currentProjectId, selectedTicket.id) : undefined;
  const activeProject = projects.find((project) => project.id === currentProjectId);

  async function handleAnalyze() { if (!selectedTicket || !currentProjectId) return; setIsAnalyzing(true); try { const response = await analysisService.startAnalysis(context); saveAnalysis({ projectId: currentProjectId, ticketId: selectedTicket.id, result: response.analysisResult, messages: response.messages }); toast.success("Análise pronta para revisão humana."); } catch (error) { console.error(error); toast.error("Não foi possível concluir a análise. Tente novamente."); } finally { setIsAnalyzing(false); } }
  function handleUpdateTicket(ticket: Ticket) { ticketService.updateTicket(ticket); if (currentProjectId) setProjectTickets(ticketService.getTickets(currentProjectId)); }
  function handleDeleteTicket(ticketId: string) { ticketService.deleteTicket(ticketId); if (!currentProjectId) return; const remaining = ticketService.getTickets(currentProjectId); setProjectTickets(remaining); if (selectedTicketId === ticketId) setSelectedTicketId(remaining[0]?.id ?? ""); }

  if (!selectedTicket) return <div className="flex min-h-96 items-center justify-center border-y border-dashed py-12 text-center text-sm text-muted-foreground">Nenhum atendimento encontrado para o projeto ativo. Selecione outro projeto quando houver novos atendimentos disponíveis.</div>;

  return <div className="space-y-7"><PageHeader overline={`Projeto ativo${activeProject ? ` · ${activeProject.name}` : ""}`} title="Conduza a evolução do conhecimento" description="Do atendimento à decisão humana: valide as evidências da IA e encaminhe apenas as oportunidades que fazem sentido para este projeto." icon={<Sparkles className="h-6 w-6" />} /><AnalysisProgress analysis={analysis} /><div className="grid gap-6 xl:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)]"><aside className="min-w-0 xl:sticky xl:top-6 xl:self-start"><TicketList tickets={projectTickets} selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} /></aside><main className="min-w-0 space-y-8"><TicketDetails ticket={selectedTicket} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onSave={handleUpdateTicket} onDelete={handleDeleteTicket} analysisStatus={analysis?.status} /><AnalysisPanel analysisRecord={analysis} context={context} onMessagesChange={(messages) => analysis && updateMessages(analysis.id, messages)} onOpportunityStatusChange={(opportunityId, status) => analysis && updateOpportunityStatus(analysis.id, opportunityId, status)} onOpportunityUpdate={(opportunityId, changes) => analysis && updateOpportunity(analysis.id, opportunityId, changes)} onFinalize={() => analysis && setAnalysisStatus(analysis.id, "completed")} /></main></div></div>;
}
