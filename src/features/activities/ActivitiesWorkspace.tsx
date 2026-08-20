"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageHeader } from "@/components/common/page/PageHeader";
import { TimelineSkeleton } from "@/components/common/page/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { activityStage } from "@/models/ActivityEvent";
import { useProject } from "@/providers/ProjectProvider";

import { ActivityTimeline } from "./components/ActivityTimeline";
import { useActivity } from "./providers/ActivityProvider";

type StageFilter = "all" | "analise" | "decisao" | "execucao" | "conhecimento" | "projeto";

const stageFilters: { value: StageFilter; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "analise", label: "Análise" },
  { value: "decisao", label: "Decisão" },
  { value: "execucao", label: "Plano" },
  { value: "conhecimento", label: "Conhecimento" },
  { value: "projeto", label: "Projeto" },
];

function dayLabel(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ActivitiesWorkspace() {
  const { events, isHydrated } = useActivity();
  const { activeProject, activeProjectId } = useProject();
  const [stage, setStage] = useState<StageFilter>("all");

  const projectEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.projectId === activeProjectId &&
          (stage === "all" || activityStage[event.type] === stage)
      ),
    [activeProjectId, events, stage]
  );

  const byDay = useMemo(() => {
    const groups = new Map<string, typeof projectEvents>();

    for (const event of projectEvents) {
      const key = dayLabel(event.at);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }

    return [...groups.entries()];
  }, [projectEvents]);

  return (
    <div className="w-full space-y-8">
      <PageHeader
        overline="Histórico"
        title="Atividades"
        description={`Tudo que aconteceu no ciclo de conhecimento de ${activeProject?.name ?? "este projeto"}, do mais recente ao mais antigo.`}
        icon={<History className="h-6 w-6" />}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por etapa do ciclo">
        {stageFilters.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={stage === filter.value ? "default" : "outline"}
            onClick={() => setStage(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {!isHydrated ? (
        <TimelineSkeleton />
      ) : projectEvents.length === 0 ? (
        <BrandEmptyState
          title={stage === "all" ? "Nenhuma atividade registrada" : "Nada nesta etapa"}
          description={
            stage === "all"
              ? "Analisar um atendimento, decidir uma oportunidade ou publicar um artigo passa a aparecer aqui."
              : "Escolha outra etapa do ciclo para ver o que já aconteceu."
          }
        />
      ) : (
        <div className="space-y-8">
          {byDay.map(([day, dayEvents]) => (
            <section key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {day}
              </h2>

              <div className="mt-4">
                <ActivityTimeline events={dayEvents} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
