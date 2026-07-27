import { useState } from "react";

import type { Library } from "@/models/Library";

export function useLibraryDialogs() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState<Library | null>(null);

  function openCreateDialog() {
    setSelectedItem(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: Library) {
    setSelectedItem(item);
    setDialogOpen(true);
  }

  function openDeleteDialog(item: Library) {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelectedItem(null);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  }

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