import { ArrowRight, Brain, Clock3, FileText, HelpCircle, Pencil, ShieldAlert } from "lucide-react";

import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import { OpportunityStatusLabel } from "@/features/analysis/types/KnowledgeOpportunity";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

interface RecommendationCardProps {
  recommendation: KnowledgeOpportunity;
  onApprove: (recommendation: KnowledgeOpportunity) => void;
  onDiscard: (recommendation: KnowledgeOpportunity) => void;
  onDefer: (recommendation: KnowledgeOpportunity) => void;
  onEdit: (recommendation: KnowledgeOpportunity) => void;
  readOnly?: boolean;
}

/**
   Ícone por nome do tipo. A lista é cadastro, então nome desconhecido cai no
   genérico em vez de quebrar — igual ao gênero do artigo.
*/
function getIcon(name: string) {
  if (name.startsWith("Novo artigo") || name.startsWith("Atualizar")) {
    return <FileText className="h-4 w-4" />;
  }
  if (name === "FAQ") return <HelpCircle className="h-4 w-4" />;
  if (name === "Alerta") return <ShieldAlert className="h-4 w-4" />;
  return <Brain className="h-4 w-4" />;
}

function getStatusVariant(status: KnowledgeOpportunity["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "discarded") return "danger" as const;
  if (status === "deferred") return "default" as const;
  if (status === "draft") return "info" as const;
  return "warning" as const;
}

export function RecommendationCard({ recommendation, onApprove, onDiscard, onDefer, onEdit, readOnly = false }: RecommendationCardProps) {
  const { taxonomy } = useTaxonomy();

  const typeName =
    taxonomy.opportunityTypes.find((entry) => entry.id === recommendation.type)?.name ?? "";

  const isPending = recommendation.status === "proposed";

  return <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{getIcon(typeName)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{typeName || "Tipo não definido"}</p><StatusBadge variant={getStatusVariant(recommendation.status)}>{OpportunityStatusLabel[recommendation.status]}</StatusBadge></div><h3 className="mt-2 text-base font-semibold tracking-tight">{recommendation.title}</h3></div></div><div className="mt-5 space-y-4 text-sm leading-6"><div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposta da IA</p><p>{recommendation.description}</p></div><div className="border-l-2 border-primary/30 pl-4"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidência e justificativa</p><p className="text-muted-foreground">{recommendation.justification}</p></div></div></div>{!readOnly && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-56 lg:justify-end">{isPending && <><Button size="sm" variant="ghost" onClick={() => onEdit(recommendation)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button><Button size="sm" variant="ghost" onClick={() => onDefer(recommendation)}><Clock3 className="mr-1.5 h-3.5 w-3.5" />Adiar</Button><Button size="sm" variant="ghost" onClick={() => onDiscard(recommendation)}>Descartar</Button><Button size="sm" onClick={() => onApprove(recommendation)}>Aprovar<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></>}{!isPending && <Button size="sm" variant="ghost" onClick={() => onEdit(recommendation)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar decisão</Button>}</div>}</div></article>;
}
