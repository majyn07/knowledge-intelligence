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
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { articleStatusLabel, type ArticleStatus, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { articleService } from "@/features/library/services/articleService";
import { parseArticles } from "@/features/library/normalizeArticle";

const STORAGE_KEY = "visus-library";

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
  const { record } = useActivity();
  const { currentPerson } = usePeople();
  const [items, setItems] = usePersistedState<KnowledgeArticle[]>({
    key: STORAGE_KEY,
    fallback: articleService.getSeed(),
    parse: parseArticles,
  });

  const createItem = useCallback(
    (data: LibraryFormData) => {
      const newItem = articleService.create(data);
      setItems((previous) => [newItem, ...previous]);
      record({
        type: "article_created",
        projectId: newItem.projectId,
        actor: currentPerson || newItem.author,
        subject: { kind: "article", id: newItem.id, label: newItem.title },
        detail: "Artigo criado como rascunho.",
      });
      toast.success("Artigo criado como rascunho.");
    },
    [currentPerson, record, setItems]
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

      record({
        type: updatedItem.status === currentItem.status ? "article_updated" : "article_status_changed",
        projectId: updatedItem.projectId,
        actor: currentPerson || updatedItem.author,
        subject: { kind: "article", id: updatedItem.id, label: updatedItem.title },
        detail: updatedItem.status === currentItem.status
          ? "Conteúdo ou classificação alterados."
          : articleStatusLabel[currentItem.status] + " → " + articleStatusLabel[updatedItem.status],
      });
      toast.success("Artigo atualizado.");
    },
    [currentPerson, items, record, setItems]
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

      record({
        type: "article_status_changed",
        projectId: currentItem.projectId,
        actor: currentPerson || currentItem.author,
        subject: { kind: "article", id: currentItem.id, label: currentItem.title },
        detail: articleStatusLabel[currentItem.status] + " → " + articleStatusLabel[status],
      });
      toast.success(`Artigo movido para "${articleStatusLabel[status]}".`);
    },
    [currentPerson, items, record, setItems]
  );

  const createItemFromPlan = useCallback(
    (plan: PlanWorkspaceItem) => {
      const existing = items.find((item) => item.source?.planId === plan.id);
      if (existing) return { item: existing, created: false };

      const newItem = articleService.createFromPlan(plan);
      setItems((previous) => [newItem, ...previous]);
      record({
        type: "article_created",
        projectId: newItem.projectId,
        actor: currentPerson || newItem.author,
        subject: { kind: "article", id: newItem.id, label: newItem.title },
        detail: "Rascunho gerado a partir do plano de melhoria.",
      });
      toast.success("Rascunho criado a partir do plano de melhoria.");
      return { item: newItem, created: true };
    },
    [currentPerson, items, record, setItems]
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
