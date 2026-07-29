"use client";

import { CheckCircle2, FileText, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { OpportunityStatusLabel, OpportunityTypeLabel } from "@/features/analysis/types/KnowledgeOpportunity";

export function PlansWorkspace() {
  const { analyses, updateOpportunityStatus } = useKnowledgeLifecycle();
  const opportunities = analyses.flatMap((analysis) => analysis.result.opportunities.map((opportunity) => ({ analysis, opportunity }))).filter(({ opportunity }) => opportunity.status !== "discarded");

  return <div className="space-y-8">
    <PageHeader overline="Ciclo de conhecimento" title="Fila de melhorias" description="Acompanhe as oportunidades aprovadas até a criação do rascunho na Base de Conhecimento." icon={<ListTodo className="h-6 w-6" />} />
    <PageSection title="Oportunidades" description="Itens em proposta, aprovados ou em rascunho, vinculados à análise de origem.">
      {opportunities.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não há oportunidades para acompanhar. Execute e revise uma análise no Workspace.</div> : <div className="divide-y divide-border/70">{opportunities.map(({ analysis, opportunity }) => <article key={`${analysis.id}-${opportunity.id}`} className="py-6 first:pt-0"><div className="flex flex-col justify-between gap-5 lg:flex-row"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge variant={opportunity.status === "approved" ? "success" : opportunity.status === "draft" ? "info" : "warning"}>{OpportunityStatusLabel[opportunity.status]}</StatusBadge><span className="text-xs text-muted-foreground">{OpportunityTypeLabel[opportunity.type]} · Atendimento #{analysis.ticketId}</span></div><h2 className="mt-3 font-semibold">{opportunity.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{opportunity.description}</p><p className="mt-3 max-w-3xl border-l-2 border-primary/30 pl-3 text-sm leading-6">{opportunity.justification}</p></div><div className="flex shrink-0 items-start gap-2">{opportunity.status === "proposed" && <Button onClick={() => updateOpportunityStatus(analysis.id, opportunity.id, "approved")}>Aprovar</Button>}{opportunity.status === "approved" && <Button onClick={() => updateOpportunityStatus(analysis.id, opportunity.id, "draft")}><FileText className="mr-2 h-4 w-4" />Criar rascunho</Button>}{opportunity.status === "draft" && <Button variant="outline"><CheckCircle2 className="mr-2 h-4 w-4" />Ver na Biblioteca</Button>}</div></div></article>)}</div>}
    </PageSection>
  </div>;
}
