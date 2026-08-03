"use client";

import { useState } from "react";
import { Brain, Building2, CalendarDays, Boxes, ScanSearch } from "lucide-react";

import { PropertyGrid } from "@/components/common/data/PropertyGrid";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import type { AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type { Ticket } from "@/models/Ticket";

import { conversations } from "../mock/conversations";
import { TicketEditor } from "./TicketEditor";

interface TicketDetailsProps {
  ticket: Ticket;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSave: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
  analysisStatus?: AnalysisStatus;
}

type ConversationMessage = (typeof conversations)[keyof typeof conversations][number];

export function TicketDetails({ ticket, isAnalyzing, onAnalyze, onSave, onDelete, analysisStatus }: TicketDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const conversation: ConversationMessage[] = conversations[ticket.id as keyof typeof conversations] ?? [];

  if (isEditing) return <PageSection><TicketEditor ticket={ticket} onSave={(updatedTicket) => { onSave(updatedTicket); setIsEditing(false); }} onCancel={() => setIsEditing(false)} /></PageSection>;

  return <div className="space-y-7"><PageSection actions={<div className="flex flex-wrap gap-2"><Button disabled={isAnalyzing || analysisStatus === "in_review"} onClick={onAnalyze}><Brain className="mr-2 h-4 w-4" />{isAnalyzing ? "Analisando..." : analysisStatus === "completed" ? "Executar nova análise" : "Analisar com IA"}</Button><Button variant="outline" onClick={() => setIsEditing(true)}>Editar atendimento</Button><Button variant="destructive" onClick={() => onDelete(ticket.id)}>Excluir</Button></div>}><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ScanSearch className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atendimento #{ticket.id}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{ticket.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{analysisStatus === "in_review" ? "A análise está em revisão humana. Valide as evidências e decida sobre cada oportunidade." : "Revise o atendimento antes de solicitar a análise da IA."}</p></div></div><PropertyGrid className="mt-7" columns={3} items={[{ label: "Empresa", value: <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span>{ticket.company}</span></div> }, { label: "Solução", value: <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /><span>{ticket.solution}</span></div> }, { label: "Data", value: <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><span>{ticket.date}</span></div> }]} /></PageSection><PageSection title="Evidências do atendimento" description="Histórico que sustenta a revisão técnica e a decisão humana."><div className="space-y-4">{conversation.map((message, index) => { const isSupport = message.author.toLowerCase().includes("suporte"); return <div key={index} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}><article className={`max-w-[85%] rounded-2xl border px-5 py-4 ${isSupport ? "border-primary/15 bg-primary/5" : "border-border/70 bg-muted/20"}`}><div className="mb-3 flex items-center justify-between gap-6"><span className="text-sm font-semibold">{message.author}</span><span className="text-xs text-muted-foreground">{message.date}</span></div><p className="whitespace-pre-wrap text-sm leading-7">{message.message}</p></article></div>; })}</div></PageSection></div>;
}
