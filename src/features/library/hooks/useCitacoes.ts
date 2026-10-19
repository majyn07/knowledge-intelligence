"use client";

import { useMemo } from "react";

import { useTickets } from "@/features/analysis/providers/TicketsProvider";

import { citacoesDoSuporte, type Citacoes } from "../citations";
import { useLibrary } from "../providers/LibraryProvider";

/**
 * Quantos atendimentos o suporte respondeu com cada artigo.
 *
 * `null` até as conversas chegarem: antes disso, "citado em 0" seria afirmar
 * que ninguém usa o artigo quando a verdade é que ainda não se sabe.
 */
export function useCitacoes(): Citacoes | null {
  const { conversations, isHydrated } = useTickets();
  const { items } = useLibrary();

  return useMemo(
    () => (isHydrated ? citacoesDoSuporte(conversations, items) : null),
    [conversations, isHydrated, items]
  );
}
