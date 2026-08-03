"use client";

import { ListTodo } from "lucide-react";

import { PageHeader } from "@/components/common/page/PageHeader";

import { PlanContextPanel } from "./components/PlanContextPanel";
import { PlanDocument } from "./components/PlanDocument";
import { PlansNavigator } from "./components/PlansNavigator";
import { usePlans } from "./providers/PlansProvider";

export function PlansWorkspace() {
  const { plans, selectedPlan, search, status, setSearch, setStatus, selectPlan, toggleTask } = usePlans();

  return <div className="w-full space-y-7"><PageHeader overline="Fase de execução" title="Plano de melhorias" description="Transforme as decisões da revisão humana em conteúdo, atividades e critérios claros para publicação." icon={<ListTodo className="h-6 w-6" />} /><div className="grid gap-6 xl:grid-cols-[minmax(17rem,0.3fr)_minmax(0,1fr)_minmax(18rem,0.32fr)]"><PlansNavigator plans={plans} selectedPlanId={selectedPlan.id} search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} onSelectPlan={selectPlan} /><PlanDocument plan={selectedPlan} onToggleTask={(taskId) => toggleTask(selectedPlan.id, taskId)} /><PlanContextPanel plan={selectedPlan} /></div></div>;
}
