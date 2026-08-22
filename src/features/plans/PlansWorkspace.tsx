"use client";

import { ListTodo } from "lucide-react";

import { useEffect, useRef } from "react";

import { PageHeader } from "@/components/common/page/PageHeader";
import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useUrlState } from "@/hooks/useUrlState";
import { oneOf } from "@/lib/urlState";
import { planStatusLabel, type PlanStatus } from "./types/PlanWorkspace";
import { useProject } from "@/providers/ProjectProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";

import { PlanContextPanel } from "./components/PlanContextPanel";
import { PlanDocument } from "./components/PlanDocument";
import { PlansNavigator } from "./components/PlansNavigator";
import { usePlans } from "./providers/PlansProvider";

export function PlansWorkspace() {
  const {
    plans,
    isHydrated,
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

  /*
    O mesmo recorte na URL da Biblioteca, aqui. O parâmetro do plano aberto
    convive com os filtros: quem cola o link manda a fila e o registro juntos,
    e a escrita preserva o que não é dela.
  */
  const [params, writeParams, urlRead] = useUrlState({ busca: "", estagio: "all" });
  const urlApplied = useRef(false);

  useEffect(() => {
    if (!urlRead || urlApplied.current) return;
    urlApplied.current = true;

    setSearch(params.busca);
    setStatus(
      oneOf<PlanStatus | "all">(
        params.estagio,
        ["all", ...(Object.keys(planStatusLabel) as PlanStatus[])],
        "all"
      )
    );
  }, [urlRead, params, setSearch, setStatus]);

  useEffect(() => {
    if (!urlApplied.current) return;
    if (params.busca === search.trim() && params.estagio === status) return;

    writeParams({ busca: search.trim(), estagio: status });
  }, [search, status, params, writeParams]);

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

  /*
    "Nenhum plano disponível" e "ainda não li os planos" são coisas diferentes,
    e a segunda não pode ser apresentada como a primeira: quem chegasse aqui
    leria que não há trabalho a fazer.
  */
  if (!isHydrated) {
    return (
      <div className="w-full space-y-7">
        {header}
        <ListSkeleton count={4} />
      </div>
    );
  }

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
