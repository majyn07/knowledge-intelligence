"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RelativeDate } from "@/components/common/RelativeDate";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";

import { planStatusLabel, type PlanStatus, type PlanWorkspaceItem } from "../types/PlanWorkspace";
import { AssigneeName, useAssigneeName } from "@/features/people/components/AssigneeName";
import { contar } from "@/lib/plural";

interface PlansNavigatorProps {
  plans: PlanWorkspaceItem[];
  selectedPlanId: string;
  search: string;
  status: PlanStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PlanStatus | "all") => void;
  onSelectPlan: (id: string) => void;
}

const statusFilters: (PlanStatus | "all")[] = [
  "all",
  "analysis",
  "development",
  "review",
  "approved",
  "published",
];

const statusVariant: Record<PlanStatus, "info" | "warning" | "success" | "default"> = {
  analysis: "default",
  development: "info",
  review: "warning",
  approved: "success",
  published: "success",
};

export function PlansNavigator({
  plans,
  selectedPlanId,
  search,
  status,
  onSearchChange,
  onStatusChange,
  onSelectPlan,
}: PlansNavigatorProps) {
  const assigneeName = useAssigneeName();

  const term = search.toLocaleLowerCase("pt-BR");
  const filteredPlans = plans.filter(
    (plan) =>
      (status === "all" || plan.status === status) &&
      `${plan.title} ${plan.projectName} ${assigneeName(plan.owner, "")}`
        .toLocaleLowerCase("pt-BR")
        .includes(term)
  );

  return (
    <aside className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border/70 bg-card xl:h-[calc(100vh-15rem)]">
      <header className="border-b border-border/70 p-4">
        <h2 className="font-semibold">Planos de melhoria</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Documentos vivos que transformam decisões em execução.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 bg-muted/40 pl-8 text-xs"
            placeholder="Buscar por título ou responsável..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estágio">
          {statusFilters.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={status === item ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => onStatusChange(item)}
            >
              {item === "all" ? "Todos" : planStatusLabel[item]}
            </Button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredPlans.map((plan) => {
          const completed = plan.tasks.filter((task) => task.completed).length;

          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className={`w-full border-b border-border/60 p-4 text-left transition-colors ${
                plan.id === selectedPlanId ? "bg-primary/8" : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-medium leading-5">{plan.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <AssigneeName value={plan.owner} />
                  </p>
                </div>

                <StatusBadge variant={statusVariant[plan.status]}>
                  {planStatusLabel[plan.status]}
                </StatusBadge>
              </div>

              <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                {plan.tasks.length > 0
                  ? `${completed}/${contar(plan.tasks.length, "atividade")}`
                  : "Sem atividades"}
                {" · atualizado "}
                <RelativeDate value={plan.updatedAt} />
              </p>
            </button>
          );
        })}

        {filteredPlans.length === 0 && (
          <p className="px-4 py-10 text-center text-xs leading-5 text-muted-foreground">
            Nenhum plano corresponde aos filtros atuais.
          </p>
        )}
      </div>
    </aside>
  );
}
