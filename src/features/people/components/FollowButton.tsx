"use client";

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { FollowKind } from "../follows";
import { useFollows } from "../providers/FollowsProvider";

interface FollowButtonProps {
  kind: FollowKind;
  subjectId: string;
  subjectLabel: string;
  projectId: string;
}

/**
 * Acompanhar sem assumir.
 *
 * Quem abriu o atendimento que originou o plano quer saber quando ele publica,
 * e não vai virar responsável por isso. Até aqui a única forma de ver um
 * registro na própria lista era ser dono dele, e assumir o que não é seu para
 * conseguir acompanhar sujaria a atribuição de todo mundo.
 */
export function FollowButton({
  kind,
  subjectId,
  subjectLabel,
  projectId,
}: FollowButtonProps) {
  const { isFollowing, toggleFollow } = useFollows();
  const following = isFollowing(kind, subjectId);

  return (
    <Button
      size="sm"
      variant={following ? "default" : "outline"}
      aria-pressed={following}
      onClick={() => toggleFollow({ kind, subjectId, subjectLabel, projectId })}
      title={
        following
          ? "Sai da sua lista. A responsabilidade não muda. Ela nunca foi sua por acompanhar."
          : "Entra na sua lista sem virar sua responsabilidade."
      }
    >
      {following ? (
        <BellOff className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <Bell className="mr-1.5 h-3.5 w-3.5" />
      )}

      {following ? "Deixar de acompanhar" : "Acompanhar"}
    </Button>
  );
}
