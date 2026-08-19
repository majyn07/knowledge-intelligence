"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { usePersistedState } from "@/hooks/usePersistedState";
import type { Library } from "@/models/Library";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { LibraryService } from "@/features/library/services/libraryService";

const STORAGE_KEY = "visus-library";

function parseLibrary(raw: string): Library[] {
  return (JSON.parse(raw) as Library[]).map((item) => ({
    ...item,
    content: item.content ?? "",
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

interface LibraryContextValue {
  items: Library[];
  totalItems: number;
  createItem: (data: LibraryFormData) => void;
  updateItem: (id: string, data: LibraryFormData) => void;
  deleteItem: (id: string) => void;
  createItemFromPlan: (plan: PlanWorkspaceItem) => { item: Library; created: boolean };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = usePersistedState<Library[]>({
    key: STORAGE_KEY,
    fallback: LibraryService.getAll(),
    parse: parseLibrary,
  });

  const createItem = useCallback(
    (data: LibraryFormData) => {
      const newItem = LibraryService.create(data);
      setItems((previous) => [newItem, ...previous]);
      toast.success("Conteúdo criado com sucesso.");
    },
    [setItems]
  );

  const updateItem = useCallback(
    (id: string, data: LibraryFormData) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem || !LibraryService.canTransitionStatus(currentItem.status, data.status)) {
        toast.error("Transição de status inválida para o ciclo de conhecimento.");
        return;
      }

      const updatedItem = LibraryService.update(currentItem, data);
      setItems((previous) =>
        previous.map((item) => (item.id === id ? updatedItem : item))
      );

      toast.success("Conteúdo atualizado com sucesso.");
    },
    [items, setItems]
  );

  const createItemFromPlan = useCallback(
    (plan: PlanWorkspaceItem) => {
      const existing = items.find((item) => item.source?.planId === plan.id);
      if (existing) return { item: existing, created: false };

      const newItem = LibraryService.createFromPlan(plan);
      setItems((previous) => [newItem, ...previous]);
      toast.success("Rascunho criado a partir do plano de melhoria.");
      return { item: newItem, created: true };
    },
    [items, setItems]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((previous) => previous.filter((item) => item.id !== id));
      toast.success("Conteúdo excluído com sucesso.");
    },
    [setItems]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems: items.length,
      createItem,
      updateItem,
      deleteItem,
      createItemFromPlan,
    }),
    [createItem, createItemFromPlan, deleteItem, items, updateItem]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary deve ser utilizado dentro de LibraryProvider.");
  return context;
}
