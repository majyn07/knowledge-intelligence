"use client";

import { useCallback, useState } from "react";

import type { Library } from "@/models/Library";

export function useLibraryDialogs() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState<Library | null>(null);

  const openCreateDialog = useCallback(() => {
    setSelectedItem(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((item: Library) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((item: Library) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedItem(null);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    dialogOpen,
    deleteDialogOpen,
    selectedItem,

    setDialogOpen,
    setDeleteDialogOpen,

    openCreateDialog,
    openEditDialog,
    openDeleteDialog,

    closeDialog,
    closeDeleteDialog,
  };
}
