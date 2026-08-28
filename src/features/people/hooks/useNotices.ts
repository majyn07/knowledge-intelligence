"use client";

import { useCallback, useMemo } from "react";

import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/lib/storage";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { parseMentions } from "@/features/plans/mentions";

import { useFollows } from "../providers/FollowsProvider";
import { usePeople } from "../providers/PeopleProvider";
import { buildNotices, unreadCount, type MentionHit } from "../notices";

/**
 * A central de avisos, montada a partir do que já está em memória.
 *
 * Nenhuma consulta nova: histórico, planos, acervo e acompanhamentos já estão
 * nos providers, e a central é uma leitura deles. Pela mesma razão de o painel
 * não custar consulta.
 *
 * **A última visita fica no navegador**, e isso é um limite conhecido: quem ler
 * um aviso no computador vai encontrá-lo como novo no celular. A alternativa é
 * uma coluna por pessoa no banco, que é a versão certa e é outra peça. Guardar
 * aqui responde "o que mudou desde a última vez que eu olhei **nesta
 * máquina**", que é verdade, e é melhor que não avisar nada.
 */
export function useNotices() {
  const { events } = useActivity();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { myFollows } = useFollows();
  const { currentPerson, me } = usePeople();

  const currentPersonId = me?.id ?? "";

  const [since, setSince] = usePersistedState<string>({
    key: STORAGE_KEYS.noticesSeenAt,
    fallback: "",
  });

  /*
    A menção guarda identificador; quem lê resolve. Aqui a comparação é com o
    id da conta e, sem conta, com o nome digitado no cabeçalho, que é o que
    identifica a pessoa no modo local.
  */
  const mentions = useMemo<MentionHit[]>(() => {
    const eu = [currentPersonId, currentPerson].filter((value) => value !== "");
    if (eu.length === 0) return [];

    const encontradas: MentionHit[] = [];

    for (const plan of plans) {
      for (const comment of plan.comments) {
        const refs = parseMentions(comment.message).map((mention) => mention.ref);
        if (!refs.some((ref) => eu.includes(ref))) continue;

        encontradas.push({
          id: comment.id,
          planId: plan.id,
          planTitle: plan.title,
          author: comment.author,
          at: comment.date,
          excerpt: comment.message.slice(0, 180),
        });
      }
    }

    return encontradas;
  }, [plans, currentPerson, currentPersonId]);

  /** O que está atribuído a esta pessoa, por identificador ou por nome. */
  const mine = useMemo(() => {
    const eu = new Set([currentPersonId, currentPerson].filter((value) => value !== ""));
    const ids = new Set<string>();

    for (const plan of plans) if (eu.has(plan.owner)) ids.add(plan.id);
    for (const article of articles) if (eu.has(article.author)) ids.add(article.id);

    return ids;
  }, [plans, articles, currentPerson, currentPersonId]);

  const notices = useMemo(
    () =>
      buildNotices({
        events,
        mentions,
        follows: myFollows,
        mine,
        me: currentPerson,
        since,
      }),
    [events, mentions, myFollows, mine, currentPerson, since]
  );

  /*
    Marcar como visto grava o instante de agora, e não o do aviso mais recente:
    entre abrir a central e fechá-la pode ter chegado outro, e usar o instante
    do aviso deixaria o novo marcado como já visto.
  */
  const markSeen = useCallback(() => {
    setSince(new Date().toISOString());
  }, [setSince]);

  return { notices, unread: unreadCount(notices), markSeen };
}
