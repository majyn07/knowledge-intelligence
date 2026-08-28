"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { STORAGE_KEYS } from "@/lib/storage";

import {
  fromSavedView,
  parseSavedViews,
  toSavedView,
  type SavedView,
} from "../savedViews";

interface SavedViewsContextValue {
  views: SavedView[];
  saveView: (view: SavedView) => void;
  removeView: (id: string) => void;
  isHydrated: boolean;
}

const SavedViewsContext = createContext<SavedViewsContextValue | null>(null);

/**
 * Os recortes que a equipe guardou.
 *
 * Compartilhados, como os painéis: "Elétrica pendentes" é útil para quem
 * trabalha em Elétrica, não só para quem montou. Inventar "minha visão" criaria
 * uma noção de dono que, no produto, só o acompanhamento tem, e ele descreve
 * interesse, enquanto isto descreve trabalho.
 */
export function SavedViewsProvider({ children }: { children: ReactNode }) {
  const [views, setViews, isHydrated] = useSharedCollection<SavedView>({
    key: STORAGE_KEYS.savedViews,
    table: "saved_views",
    fallback: [],
    parseLocal: parseSavedViews,
    fromRows: (rows) => rows.map(toSavedView).sort((a, b) => a.order - b.order),
    toRow: fromSavedView,
    identify: (view) => view.id,
  });

  const saveView = useCallback(
    (view: SavedView) => {
      setViews((current) => {
        const existe = current.some((item) => item.id === view.id);

        return existe
          ? current.map((item) => (item.id === view.id ? view : item))
          : [...current, { ...view, order: current.length }];
      });
    },
    [setViews]
  );

  const removeView = useCallback(
    (id: string) => {
      setViews((current) =>
        current.filter((view) => view.id !== id).map((view, index) => ({ ...view, order: index }))
      );
    },
    [setViews]
  );

  const value = useMemo(
    () => ({
      views: [...views].sort((a, b) => a.order - b.order),
      saveView,
      removeView,
      isHydrated,
    }),
    [isHydrated, removeView, saveView, views]
  );

  return <SavedViewsContext.Provider value={value}>{children}</SavedViewsContext.Provider>;
}

export function useSavedViews() {
  const context = useContext(SavedViewsContext);
  if (!context) throw new Error("useSavedViews deve ser utilizado dentro de SavedViewsProvider.");
  return context;
}
