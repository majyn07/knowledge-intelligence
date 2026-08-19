"use client";

import { ListTodo } from "lucide-react";

import { PageHeader } from "@/components/common/page/PageHeader";
import { useProject } from "@/providers/ProjectProvider";
import { useLibrary } from "@/features/library/hooks/useLibrary";

import { PlanContextPanel } from "./components/PlanContextPanel";
import { PlanDocument } from "./components/PlanDocument";
import { PlansNavigator } from "./components/PlansNavigator";
import { usePlans } from "./providers/PlansProvider";

export function PlansWorkspace() {
  const { plans, selectedPlan, search, status, setSearch, setStatus, selectPlan, toggleTask, linkPlanToArticle } = usePlans();
  const { createItemFromPlan } = useLibrary();
  const { activeProject, activeProjectId } = useProject();
  const projectPlans = plans.filter((plan) => plan.projectId === activeProjectId);
  const currentPlan = projectPlans.find((plan) => plan.id === selectedPlan?.id) ?? projectPlans[0];

  if (!currentPlan) {
    return <div className="w-full space-y-7"><PageHeader overline="Fase de execução" title="Plano de melhorias" description="Transforme as decisões da revisão humana em conteúdo, atividades e critérios claros para publicação." icon={<ListTodo className="h-6 w-6" />} /><div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Nenhum plano de melhoria está disponível para {activeProject?.name ?? "o projeto ativo"}.</div></div>;
  }

  return <div className="w-full space-y-7"><PageHeader overline="Fase de execução" title="Plano de melhorias" description="Transforme as decisões da revisão humana em conteúdo, atividades e critérios claros para publicação." icon={<ListTodo className="h-6 w-6" />} /><div className="grid gap-6 xl:grid-cols-[minmax(17rem,0.3fr)_minmax(0,1fr)_minmax(18rem,0.32fr)]"><PlansNavigator plans={projectPlans} selectedPlanId={currentPlan.id} search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} onSelectPlan={selectPlan} /><PlanDocument plan={currentPlan} onToggleTask={(taskId) => toggleTask(currentPlan.id, taskId)} onCreateKnowledgeContent={() => { const result = createItemFromPlan(currentPlan); linkPlanToArticle(currentPlan.id, result.item.id); }} /><PlanContextPanel plan={currentPlan} /></div></div>;
}
