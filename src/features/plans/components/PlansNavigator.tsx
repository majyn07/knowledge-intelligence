"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import type { PlanStatus, PlanWorkspaceItem } from "../types/PlanWorkspace";

interface PlansNavigatorProps {
  plans: PlanWorkspaceItem[];
  selectedPlanId: string;
  search: string;
  status: PlanStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PlanStatus | "all") => void;
  onSelectPlan: (id: string) => void;
}

const statusLabel: Record<PlanStatus, string> = { analysis: "Em análise", development: "Em desenvolvimento", review: "Em revisão", approved: "Aprovado", published: "Publicado" };

export function PlansNavigator({ plans, selectedPlanId, search, status, onSearchChange, onStatusChange, onSelectPlan }: PlansNavigatorProps) {
  const filteredPlans = plans.filter((plan) => (status === "all" || plan.status === status) && `${plan.title} ${plan.projectName}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <aside className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border/70 bg-card xl:h-[calc(100vh-15rem)]"><header className="border-b border-border/70 p-4"><h2 className="font-semibold">Planos de melhoria</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Documentos vivos que transformam decisões em execução.</p><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 bg-muted/40 pl-8 text-xs" placeholder="Buscar plano..." value={search} onChange={(event) => onSearchChange(event.target.value)} /></div><div className="mt-3 flex flex-wrap gap-1.5">{(["all", "development", "review"] as const).map((item) => <button key={item} onClick={() => onStatusChange(item)} className={`rounded-md px-2 py-1 text-xs ${status === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{item === "all" ? "Todos" : statusLabel[item]}</button>)}</div></header><div className="min-h-0 flex-1 overflow-y-auto">{filteredPlans.map((plan) => <button key={plan.id} onClick={() => onSelectPlan(plan.id)} className={`w-full border-b border-border/60 p-4 text-left transition-colors ${plan.id === selectedPlanId ? "bg-primary/8" : "hover:bg-muted/40"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-medium leading-5">{plan.title}</h3><p className="mt-2 text-xs text-muted-foreground">{plan.projectName}</p></div><StatusBadge variant={plan.status === "development" ? "info" : plan.status === "review" ? "warning" : "default"}>{statusLabel[plan.status]}</StatusBadge></div><p className="mt-3 text-xs text-muted-foreground">Atualizado {plan.updatedAt}</p></button>)}{filteredPlans.length === 0 && <p className="px-4 py-10 text-center text-xs leading-5 text-muted-foreground">Nenhum plano corresponde aos filtros atuais.</p>}</div></aside>;
}
