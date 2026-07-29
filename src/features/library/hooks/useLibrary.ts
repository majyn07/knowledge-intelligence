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

import { LibraryService } from "@/features/library/services/libraryService";

const STORAGE_KEY = "visus-library";

function loadLibrary(): Library[] {
  if (typeof window === "undefined") {
    return LibraryService.getAll();
  }

  const storedItems =
    localStorage.getItem(STORAGE_KEY);

  if (!storedItems) {
    return LibraryService.getAll();
  }

  try {
    const parsedItems = JSON.parse(
      storedItems
    ) as Library[];

    return parsedItems.map((item) => ({
      ...item,
      status: (item.status as string) === "review" ? "draft" : item.status,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch {
    console.error(
      "Erro ao carregar biblioteca do localStorage."
    );

    return LibraryService.getAll();
  }
}

export function useLibrary() {
  const [items, setItems] =
    useState<Library[]>(loadLibrary);

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
