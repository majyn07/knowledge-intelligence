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
import { articleStatusLabel, type ArticleStatus, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { articleService } from "@/features/library/services/articleService";

const STORAGE_KEY = "visus-library";

function parseArticles(raw: string): KnowledgeArticle[] {
  return (JSON.parse(raw) as KnowledgeArticle[]).map((article) => ({
    ...article,
    // Conteúdos gravados antes da unificação não possuem estes campos.
    summary: article.summary ?? "",
    content: article.content ?? "",
    product: article.product ?? "",
    module: article.module ?? "",
    keywords: article.keywords ?? [],
    tags: article.tags ?? [],
    createdAt: new Date(article.createdAt),
    updatedAt: new Date(article.updatedAt),
  }));
}

interface LibraryContextValue {
  items: KnowledgeArticle[];
  totalItems: number;
  createItem: (data: LibraryFormData) => void;
  updateItem: (id: string, data: LibraryFormData) => void;
  changeStatus: (id: string, status: ArticleStatus) => void;
  deleteItem: (id: string) => void;
  createItemFromPlan: (plan: PlanWorkspaceItem) => { item: KnowledgeArticle; created: boolean };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = usePersistedState<KnowledgeArticle[]>({
    key: STORAGE_KEY,
    fallback: articleService.getSeed(),
    parse: parseArticles,
  });

  const createItem = useCallback(
    (data: LibraryFormData) => {
      const newItem = articleService.create(data);
      setItems((previous) => [newItem, ...previous]);
      toast.success("Artigo criado como rascunho.");
    },
    [setItems]
  );

  const updateItem = useCallback(
    (id: string, data: LibraryFormData) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      if (!articleService.canTransitionStatus(currentItem.status, data.status)) {
        toast.error(
          `Não é possível ir de "${articleStatusLabel[currentItem.status]}" para "${articleStatusLabel[data.status]}".`
        );
        return;
      }

      const updatedItem = articleService.update(currentItem, data);
      setItems((previous) =>
        previous.map((item) => (item.id === id ? updatedItem : item))
      );

      toast.success("Artigo atualizado.");
    },
    [items, setItems]
  );

  const changeStatus = useCallback(
    (id: string, status: ArticleStatus) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      if (!articleService.canTransitionStatus(currentItem.status, status)) {
        toast.error(
          `Não é possível ir de "${articleStatusLabel[currentItem.status]}" para "${articleStatusLabel[status]}".`
        );
        return;
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? articleService.changeStatus(item, status) : item
        )
      );

      toast.success(`Artigo movido para "${articleStatusLabel[status]}".`);
    },
    [items, setItems]
  );

  const createItemFromPlan = useCallback(
    (plan: PlanWorkspaceItem) => {
      const existing = items.find((item) => item.source?.planId === plan.id);
      if (existing) return { item: existing, created: false };

      const newItem = articleService.createFromPlan(plan);
      setItems((previous) => [newItem, ...previous]);
      toast.success("Rascunho criado a partir do plano de melhoria.");
      return { item: newItem, created: true };
    },
    [items, setItems]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((previous) => previous.filter((item) => item.id !== id));
      toast.success("Artigo excluído.");
    },
    [setItems]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems: items.length,
      createItem,
      updateItem,
      changeStatus,
      deleteItem,
      createItemFromPlan,
    }),
    [changeStatus, createItem, createItemFromPlan, deleteItem, items, updateItem]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary deve ser utilizado dentro de LibraryProvider.");
  return context;
}
