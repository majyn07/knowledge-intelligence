import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileWarning, ListTodo, ScanSearch } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";

interface ProjectAttentionProps {
  metrics: ProjectMetrics;
  onNavigate: (href: string) => void;
}

interface AttentionItem {
  icon: typeof ScanSearch;
  label: string;
  detail: string;
  href: string;
  action: string;
}

/**
 * Combina indicadores que já são calculados; não introduz métrica nova.
 * Cada item aponta o próximo passo concreto do ciclo de conhecimento.
 */
function buildItems(metrics: ProjectMetrics): AttentionItem[] {
  const items: AttentionItem[] = [];

  const pendingAnalyses = metrics.analysis.open + metrics.analysis.inReview;
  if (pendingAnalyses > 0) {
    items.push({
      icon: ClipboardCheck,
      label: `${pendingAnalyses} análise(s) aguardando revisão humana`,
      detail: "As oportunidades propostas ainda não receberam decisão.",
      href: "/analysis",
      action: "Revisar",
    });
  }

  if (metrics.opportunity.approvedWithoutPlan > 0) {
    items.push({
      icon: ListTodo,
      label: `${metrics.opportunity.approvedWithoutPlan} oportunidade(s) aprovada(s) sem plano`,
      detail: "Foram aprovadas na revisão, mas ainda não viraram execução.",
      href: "/improvement-plan",
      action: "Ver planos",
    });
  }

  const unfinishedArticles = metrics.article.draft + metrics.article.review;
  if (unfinishedArticles > 0) {
    items.push({
      icon: FileWarning,
      label: `${unfinishedArticles} conteúdo(s) sem publicação`,
      detail: `${metrics.article.draft} em rascunho e ${metrics.article.review} em revisão.`,
      href: "/library",
      action: "Abrir Biblioteca",
    });
  }

  const unanalyzedTickets = metrics.ticket.total - metrics.ticket.analyzed;
  if (unanalyzedTickets > 0) {
    items.push({
      icon: ScanSearch,
      label: `${unanalyzedTickets} atendimento(s) ainda não analisado(s)`,
      detail: "Podem conter lacunas de documentação não identificadas.",
      href: "/analysis",
      action: "Analisar",
    });
  }

  return items;
}

export function ProjectAttention({ metrics, onNavigate }: ProjectAttentionProps) {
  const items = buildItems(metrics);

  return (
    <PageSection
      title="Precisa de atenção"
      description="O que trava o ciclo de conhecimento deste projeto agora."
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-5 py-6 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            Nada pendente neste projeto. Analisar um novo atendimento é o próximo passo natural.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(({ icon: Icon, label, detail, href, action }) => (
            <li
              key={label}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-medium leading-6">{label}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                render={<Link href={href} />} nativeButton={false}
                onClick={() => onNavigate(href)}
              >
                {action}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
