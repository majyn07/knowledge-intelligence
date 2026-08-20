"use client";

import { ListTodo } from "lucide-react";

import { useEffect } from "react";

import { PageHeader } from "@/components/common/page/PageHeader";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useProject } from "@/providers/ProjectProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";

import { PlanContextPanel } from "./components/PlanContextPanel";
import { PlanDocument } from "./components/PlanDocument";
import { PlansNavigator } from "./components/PlansNavigator";
import { usePlans } from "./providers/PlansProvider";

export function PlansWorkspace() {
  const {
    plans,
    selectedPlan,
    search,
    status,
    setSearch,
    setStatus,
    selectPlan,
    linkPlanToArticle,
  } = usePlans();
  const { createItemFromPlan } = useLibrary();
  const { activeProject, activeProjectId } = useProject();
  const requestedPlanId = useQueryParam("plan");

  useEffect(() => {
    // Abre o plano indicado pela busca, quando ele pertence ao projeto ativo.
    if (requestedPlanId && plans.some((plan) => plan.id === requestedPlanId)) {
      selectPlan(requestedPlanId);
    }
  }, [plans, requestedPlanId, selectPlan]);

  const projectPlans = plans.filter((plan) => plan.projectId === activeProjectId);
  const currentPlan = projectPlans.find((plan) => plan.id === selectedPlan?.id) ?? projectPlans[0];

  const header = (
    <PageHeader
      overline="Fase de execução"
      title="Plano de melhorias"
      description="Transforme as decisões da revisão humana em conteúdo, atividades e critérios claros para publicação."
      icon={<ListTodo className="h-6 w-6" />}
    />
  );

  if (!currentPlan) {
    return (
      <div className="w-full space-y-7">
        {header}
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          Nenhum plano de melhoria está disponível para {activeProject?.name ?? "o projeto ativo"}.
          Aprove uma oportunidade na revisão humana para gerar o primeiro.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-7">
      {header}

      <div className="grid gap-6 xl:grid-cols-[minmax(17rem,0.3fr)_minmax(0,1fr)_minmax(19rem,0.34fr)]">
        <PlansNavigator
          plans={projectPlans}
          selectedPlanId={currentPlan.id}
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onSelectPlan={selectPlan}
        />

        <PlanDocument
          plan={currentPlan}
          onCreateKnowledgeContent={() => {
            const result = createItemFromPlan(currentPlan);
            linkPlanToArticle(currentPlan.id, result.item.id);
          }}
        />

        <PlanContextPanel plan={currentPlan} />
      </div>
    </div>
  );
}
