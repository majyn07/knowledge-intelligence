"use client";

import { useCallback, useState } from "react";

import type { Project } from "@/models/Project";

export function useProjectDialogs() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const openCreateDialog = useCallback(() => {
    setSelectedProject(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback(
    (project: Project) => {
      setSelectedProject(project);
      setDialogOpen(true);
    },
    []
  );

  const openDeleteDialog = useCallback(
    (project: Project) => {
      setSelectedProject(project);
      setDeleteDialogOpen(true);
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedProject(null);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  }, []);

  return {
    dialogOpen,
    deleteDialogOpen,
    selectedProject,

    setDialogOpen,

    openCreateDialog,
    openEditDialog,
    openDeleteDialog,

    closeDialog,
    closeDeleteDialog,
  };
}
