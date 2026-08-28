"use client";

import { Users } from "lucide-react";

import { resolveAssignment } from "@/models/Assignment";

import { usePeople } from "../providers/PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";

/**
 * O retrato de quem assinou, a partir da referência guardada.
 *
 * A autoria pode ser uma pessoa, uma equipe ou (nos registros anteriores) um
 * nome solto. Os três casos aparecem: equipe com o símbolo dela, pessoa com o
 * retrato ou as iniciais, e o nome antigo pelas iniciais, que continuam
 * distinguindo mesmo sem cadastro por trás.
 */
export function CommentAvatar({ author }: { author: string }) {
  const { people, teams } = usePeople();

  const resolved = resolveAssignment(author, people, teams);

  if (!resolved) {
    return (
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
      >
        ?
      </span>
    );
  }

  if (resolved.kind === "team") {
    return (
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted"
      >
        <Users className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  }

  const person = people.find((item) => item.id === author);

  return (
    <PersonAvatar
      person={person ?? { name: resolved.name, avatarUrl: "" }}
      className="h-6 w-6 text-[10px]"
    />
  );
}
