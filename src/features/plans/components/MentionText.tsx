"use client";

import { Fragment } from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";

import { mentionName, mentionSegments } from "../mentions";

/**
 * Comentário com as menções resolvidas.
 *
 * O nome exibido é o atual, lido do identificador guardado. Quem se renomeou
 * aparece com o nome de hoje em tudo que já foi escrito. Quando o
 * identificador não resolve mais, sobra o rótulo do dia em que a menção foi
 * feita: o comentário é um registro do que foi dito, e não se reescreve.
 */
export function MentionText({ text }: { text: string }) {
  const { people, teams } = usePeople();

  return (
    <>
      {mentionSegments(text).map((segment, index) =>
        segment.kind === "text" ? (
          <Fragment key={index}>{segment.value}</Fragment>
        ) : (
          <span
            key={index}
            className="rounded bg-primary/10 px-1 font-medium text-primary"
          >
            @{mentionName(segment, people, teams)}
          </span>
        )
      )}
    </>
  );
}
