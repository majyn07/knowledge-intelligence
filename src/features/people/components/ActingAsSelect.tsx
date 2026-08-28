"use client";

import { UserRound } from "lucide-react";

import { Input } from "@/components/ui/input";

import { usePeople } from "../providers/PeopleProvider";

/**
 * Quem está operando o produto.
 *
 * Com conta, isto deixou de ser escolha: quem opera é quem entrou, e o campo
 * vira informação. Era a ressalva registrada desde o começo. Permissão sobre
 * um seletor livre seria ficção enquanto qualquer um pudesse escolher qualquer
 * pessoa. Agora não é mais seletor.
 *
 * Sem servidor não há login, e o campo volta a ser texto: melhor um nome
 * digitado que um histórico com autoria vazia.
 */
export function ActingAsSelect() {
  const { me, currentPerson, setCurrentPerson } = usePeople();

  if (me) {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" aria-hidden />

        <span className="font-medium text-foreground">{me.name}</span>

        {me.role && <span className="hidden sm:inline">· {me.role}</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UserRound className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />

      <Input
        aria-label="Atuando como"
        placeholder="Atuando como"
        value={currentPerson}
        onChange={(event) => setCurrentPerson(event.target.value)}
        className="h-8 w-auto min-w-40 border-dashed text-xs"
      />
    </div>
  );
}
