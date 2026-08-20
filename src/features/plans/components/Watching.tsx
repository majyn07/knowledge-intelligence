"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AtSign, Bell, BookOpen, ListTodo } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useFollows } from "@/features/people/providers/FollowsProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { useProject } from "@/providers/ProjectProvider";

import { usePlans } from "../providers/PlansProvider";
import { buildWatching } from "../watching";

/**
 * O que chega até você sem ser seu.
 *
 * Fica separada de "Meu trabalho" de propósito: misturar as duas faria
 * acompanhar parecer assumir, e a fila de trabalho de alguém passaria a
 * crescer por interesse dos outros.
 */
export function Watching() {
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { myFollows } = useFollows();
  const { me, people, teams } = usePeople();
  const { projects } = useProject();

  const items = useMemo(
    () => buildWatching({ plans, articles, follows: myFollows, me, people, teams }),
    [articles, me, myFollows, people, plans, teams]
  );

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? "";

  if (items.length === 0) return null;

  return (
    <PageSection
      title="Acompanhando"
      description="Registros que você escolheu seguir ou onde mencionaram você. Não são sua responsabilidade — estão aqui para você não perder de vista."
    >
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={item.href}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {item.kind === "plan" ? (
                  <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}

                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.title}</span>

                  <span className="block truncate text-xs text-muted-foreground">
                    {item.isClosed ? "encerrado" : "em andamento"}
                    {projectName(item.projectId) && ` · ${projectName(item.projectId)}`}
                  </span>
                </span>
              </span>

              <StatusBadge variant="default">
                <span className="flex items-center gap-1.5">
                  {item.reason === "acompanhando" ? (
                    <Bell className="h-3 w-3" aria-hidden />
                  ) : (
                    <AtSign className="h-3 w-3" aria-hidden />
                  )}
                  {item.reason === "acompanhando" ? "acompanhando" : "mencionaram você"}
                </span>
              </StatusBadge>
            </Link>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
