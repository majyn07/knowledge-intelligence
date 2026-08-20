"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { STORAGE_KEYS } from "@/lib/storage";

import {
  followKey,
  followsOf,
  fromFollow,
  parseFollows,
  toFollow,
  type Follow,
  type FollowKind,
} from "../follows";
import { usePeople } from "./PeopleProvider";

interface FollowsContextValue {
  /** Só os desta pessoa — a lista completa não interessa a nenhuma tela. */
  myFollows: Follow[];
  isFollowing: (kind: FollowKind, subjectId: string) => boolean;
  toggleFollow: (input: {
    kind: FollowKind;
    subjectId: string;
    subjectLabel: string;
    projectId: string;
  }) => void;
  isHydrated: boolean;
}

const FollowsContext = createContext<FollowsContextValue | null>(null);

/**
 * O que cada pessoa escolheu acompanhar.
 *
 * É a única coleção do produto que é **por pessoa** e não da equipe: o resto é
 * compartilhado porque descreve o trabalho, e este descreve interesse. A
 * política do banco continua a mesma — não há papéis, todo mundo alcança tudo
 * — e quem filtra é a tela.
 *
 * Acompanhar não é atribuir: não move responsabilidade, não muda a fila de
 * ninguém e sai com um clique.
 */
export function FollowsProvider({ children }: { children: ReactNode }) {
  const { me } = usePeople();

  const [follows, setFollows, isHydrated] = useSharedCollection<Follow>({
    key: STORAGE_KEYS.follows,
    table: "follows",
    fallback: [],
    parseLocal: parseFollows,
    fromRows: (rows) => rows.map(toFollow),
    toRow: fromFollow,
    identify: (follow) => follow.id,
  });

  // Sem conta há uma pessoa só — a que está no navegador — e ela é a vazia.
  const personId = me?.id ?? "";

  const myFollows = useMemo(() => followsOf(follows, personId), [follows, personId]);

  const isFollowing = useCallback(
    (kind: FollowKind, subjectId: string) =>
      myFollows.some((follow) => follow.kind === kind && follow.subjectId === subjectId),
    [myFollows]
  );

  const toggleFollow = useCallback(
    (input: {
      kind: FollowKind;
      subjectId: string;
      subjectLabel: string;
      projectId: string;
    }) => {
      setFollows((current) => {
        const existente = current.find(
          (follow) =>
            follow.personId === personId &&
            follow.kind === input.kind &&
            follow.subjectId === input.subjectId
        );

        if (existente) {
          return current.filter((follow) => follow.id !== existente.id);
        }

        return [
          ...current,
          {
            /*
              O identificador carrega pessoa e assunto para que a mesma pessoa
              acompanhando o mesmo registro produza sempre a mesma linha. É a
              restrição do banco escrita também aqui, para o modo sem servidor
              não divergir dela.
            */
            id: `${personId}:${followKey(input.kind, input.subjectId)}`,
            personId,
            kind: input.kind,
            subjectId: input.subjectId,
            subjectLabel: input.subjectLabel,
            projectId: input.projectId,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    },
    [personId, setFollows]
  );

  const value = useMemo(
    () => ({ myFollows, isFollowing, toggleFollow, isHydrated }),
    [isFollowing, isHydrated, myFollows, toggleFollow]
  );

  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows() {
  const context = useContext(FollowsContext);
  if (!context) throw new Error("useFollows deve ser utilizado dentro de FollowsProvider.");
  return context;
}
