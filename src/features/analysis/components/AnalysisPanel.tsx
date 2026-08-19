"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";

import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { AnalysisRecord, OpportunityWorkflowStatus } from "@/models/KnowledgeLifecycle";
import { ConfidenceLevelLabel, DocumentationStatusLabel } from "@/features/analysis/types/KnowledgeClassification";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";

import { AnalysisEvidence } from "./AnalysisEvidence";
import { OpportunityEditorDialog } from "./OpportunityEditorDialog";
import { RecommendationCard } from "./RecommendationCard";
import { RelatedArticlesPanel } from "./RelatedArticlesPanel";
import { AnalysisConversation } from "./chat/AnalysisConversation";

interface AnalysisPanelProps {
  analysisRecord?: AnalysisRecord;
  context: AIContext;
  onMessagesChange: (messages: AnalysisMessage[]) => void;
  onOpportunityStatusChange: (opportunityId: string, status: OpportunityWorkflowStatus) => void;
  onOpportunityUpdate: (opportunityId: string, changes: Pick<KnowledgeOpportunity, "title" | "description" | "justification">) => void;
  onFinalize: () => void;
}

export function AnalysisPanel({ analysisRecord, context, onMessagesChange, onOpportunityStatusChange, onOpportunityUpdate, onFinalize }: AnalysisPanelProps) {
  const [editingOpportunity, setEditingOpportunity] = useState<KnowledgeOpportunity | null>(null);

  if (!analysisRecord) return <PageSection title="Aguardando análise" description="Selecione um atendimento e execute a análise para iniciar a revisão técnica."><div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center"><Sparkles className="h-6 w-6 text-primary" /><h2 className="mt-4 font-semibold">A IA ainda não gerou recomendações</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">O próximo passo é analisar o atendimento selecionado. Depois, você poderá avaliar evidências e decidir o destino de cada oportunidade.</p></div></PageSection>;

  const { result } = analysisRecord;
  const approved = result.opportunities.filter((opportunity) => opportunity.status === "approved").length;
  const discarded = result.opportunities.filter((opportunity) => opportunity.status === "discarded").length;
  const deferred = result.opportunities.filter((opportunity) => opportunity.status === "deferred").length;
  const pending = result.opportunities.filter((opportunity) => opportunity.status === "proposed").length;
  const canFinalize = pending === 0 && analysisRecord.status !== "completed";

  return <div className="space-y-8"><PageSection title="Resultado da análise" description="A IA organizou os sinais do atendimento. Agora a decisão é sua."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Cobertura" value={DocumentationStatusLabel[result.classification.documentationStatus]} /><MetricCard label="Confiança da IA" value={`${result.confidence.toFixed(0)}%`} description={ConfidenceLevelLabel[result.classification.confidenceLevel]} /><MetricCard label="Artigos relacionados" value={analysisRecord.relatedArticles.length} description="Encontrados na Base de Conhecimento" /><MetricCard label="Decisões pendentes" value={pending} description={pending === 0 ? "Revisão pronta para finalizar" : "Avalie cada oportunidade"} /></div></PageSection><AnalysisEvidence analysis={analysisRecord} /><RelatedArticlesPanel articles={analysisRecord.relatedArticles} /><PageSection title="Decisão humana" description="Aprove, descarte, adie ou ajuste cada proposta antes de concluir esta revisão."><div className="space-y-3">{result.opportunities.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} readOnly={analysisRecord.status === "completed"} onApprove={() => onOpportunityStatusChange(recommendation.id, "approved")} onDiscard={() => onOpportunityStatusChange(recommendation.id, "discarded")} onDefer={() => onOpportunityStatusChange(recommendation.id, "deferred")} onEdit={setEditingOpportunity} />)}</div></PageSection><PageSection title={analysisRecord.status === "completed" ? "Análise concluída" : "Encaminhamento"} description={analysisRecord.status === "completed" ? "As decisões foram registradas e as oportunidades aprovadas seguem para a fila de melhorias." : pending > 0 ? "Conclua todas as decisões para liberar a finalização da análise." : "A revisão está completa. Finalize para encaminhar as oportunidades aprovadas ao Plano de Melhorias."}><div className="flex flex-col gap-5 rounded-xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2"><StatusBadge variant="success">{approved} aprovada(s)</StatusBadge><StatusBadge variant="danger">{discarded} descartada(s)</StatusBadge><StatusBadge variant="default">{deferred} adiada(s)</StatusBadge></div>{analysisRecord.status === "completed" ? <Button variant="outline" render={<Link href="/improvement-plan" />}><FileText className="mr-2 h-4 w-4" />Ver no Plano de Melhorias</Button> : <Button disabled={!canFinalize} onClick={onFinalize}><CheckCircle2 className="mr-2 h-4 w-4" />Finalizar e enviar ao plano</Button>}</div></PageSection><AnalysisConversation context={context} messages={analysisRecord.messages} setMessages={onMessagesChange} /><OpportunityEditorDialog opportunity={editingOpportunity} onOpenChange={(open) => { if (!open) setEditingOpportunity(null); }} onSave={(changes) => { if (editingOpportunity) onOpportunityUpdate(editingOpportunity.id, changes); }} /></div>;
}
