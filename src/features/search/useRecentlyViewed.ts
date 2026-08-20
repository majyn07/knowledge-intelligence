"use client";

import { useCallback } from "react";

import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/lib/storage";

import { parseRecent, remember, type RecentEntry } from "./recentlyViewed";

/**
 * Onde a pessoa estava.
 *
 * Fica no navegador mesmo no modo compartilhado, e de propósito: "os últimos
 * registros que **eu** abri" é sobre esta máquina e esta sessão de trabalho,
 * não sobre a equipe. Sincronizar isso entre catorze pessoas transformaria a
 * lista em ruído.
 */
export function useRecentlyViewed() {
  const [recent, setRecent] = usePersistedState<RecentEntry[]>({
    key: STORAGE_KEYS.recent,
    fallback: [],
    parse: parseRecent,
  });

  const record = useCallback(
    (entry: Omit<RecentEntry, "at">) => {
      setRecent((current) => remember(current, entry, new Date()));
    },
    [setRecent]
  );

  return { recent, record };
}
