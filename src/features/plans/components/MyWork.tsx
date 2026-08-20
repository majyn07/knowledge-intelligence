"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlarmClock, BookOpen, ListTodo, PauseCircle } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { useProject } from "@/providers/ProjectProvider";
import { articleStatusLabel } from "@/models/KnowledgeArticle";

import { usePlans } from "../providers/PlansProvider";
import { buildMyWork } from "../myWork";
import { planStatusLabel, type PlanStatus } from "../types/PlanWorkspace";
import type { ArticleStatus } from "@/models/KnowledgeArticle";

/**
 * O trabalho de quem está usando, atravessando projetos.
 *
 * A fila da tela de projeto responde "o que trava este projeto". Esta responde
 * "o que trava você" — e ninguém trabalha em um projeto de cada vez, que era o
 * limite da anterior.
 */
export function MyWork() {
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { events } = useActivity();
  const { me, people, teams } = usePeople();
  const { projects } = useProject();

  const items = useMemo(
    () => buildMyWork({ plans, articles, events, me, people, teams }, new Date()),
    [articles, events, me, people, plans, teams]
  );

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? "";

  if (!me) {
    return (
      <PageSection
        title="Meu trabalho"
        description="O que está atribuído a você, em todos os projetos."
      >
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Sem conta identificada não há como saber o que é seu. Isto aparece
          quando o acesso por e-mail estiver ligado.
        </p>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Meu trabalho"
      description="O que está atribuído a você ou à sua equipe, em todos os projetos, na ordem em que pede atenção."
    >
      {items.length === 0 ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Nada atribuído a você em aberto. O que estava sob sua responsabilidade
          já foi publicado ou passou adiante.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const urgent = item.rank <= 1;
            const stalled = item.rank === 2;

            const stage =
              item.kind === "plan"
                ? planStatusLabel[item.stage as PlanStatus]
                : articleStatusLabel[item.stage as ArticleStatus];

            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {urgent ? (
                      <AlarmClock className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    ) : stalled ? (
                      <PauseCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : item.kind === "plan" ? (
                      <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : (
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.title}</span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {stage}
                        {projectName(item.projectId) && ` · ${projectName(item.projectId)}`}
                      </span>
                    </span>
                  </span>

                  <StatusBadge
                    variant={urgent ? "danger" : stalled ? "warning" : "default"}
                  >
                    {item.reason}
                  </StatusBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
