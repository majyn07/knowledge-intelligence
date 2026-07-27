"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "sonner";

import type { Library } from "@/models/Library";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

import { LibraryService } from "@/features/library/services/LibraryService";

const STORAGE_KEY = "visus-library";

export function useLibrary() {
  const [items, setItems] = useState<Library[]>(
    LibraryService.getAll()
  );

  useEffect(() => {
    const storedItems =
      localStorage.getItem(STORAGE_KEY);

    if (!storedItems) {
      return;
    }

    try {
      const parsedItems = JSON.parse(
        storedItems
      ) as Library[];

      setItems(
        parsedItems.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }))
      );
    } catch {
      console.error(
        "Erro ao carregar biblioteca do localStorage."
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  }, [items]);

  const createItem = useCallback(
    (data: LibraryFormData) => {
      const newItem = LibraryService.create(data);

      setItems((previous) => [
        newItem,
        ...previous,
      ]);

      toast.success("Conteúdo criado com sucesso.");
    },
    []
  );

  const updateItem = useCallback(
    (id: string, data: LibraryFormData) => {
      setItems((previous) =>
        previous.map((item) =>
          item.id === id
            ? LibraryService.update(item, data)
            : item
        )
      );

      toast.success("Conteúdo atualizado com sucesso.");
    },
    []
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );

      toast.success("Conteúdo excluído com sucesso.");
    },
    []
  );

  const totalItems = useMemo(
    () => items.length,
    [items]
  );

  return {
    items,
    totalItems,
    createItem,
    updateItem,
    deleteItem,
  };
}