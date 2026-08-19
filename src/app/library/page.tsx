"use client";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/page/PageHeader";


import { LibraryDeleteDialog } from "@/features/library/components/LibraryDeleteDialog";
import { LibraryDialog } from "@/features/library/components/LibraryDialog";
import { LibraryForm } from "@/features/library/components/LibraryForm";
import { LibraryGrid } from "@/features/library/components/LibraryGrid";
import { LibraryToolbar } from "@/features/library/components/LibraryToolbar";

import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useLibraryDialogs } from "@/features/library/hooks/useLibraryDialogs";
import { useLibraryFilters } from "@/features/library/hooks/useLibraryFilters";

import { useProject } from "@/providers/ProjectProvider";

export default function LibraryPage() {
  const { activeProjectId, projects } = useProject();
  const {
    items,
    createItem,
    updateItem,
    deleteItem,
  } = useLibrary();

  const {
    filters,
    setFilters,
    filteredItems,
  } = useLibraryFilters(
    items.filter((item) => item.projectId === activeProjectId)
  );

  const {
    dialogOpen,
    deleteDialogOpen,
    selectedItem,
    setDialogOpen,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    closeDeleteDialog,
  } = useLibraryDialogs();

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  function handleSubmit(data: LibraryFormData) {
    if (selectedItem) {
      updateItem(selectedItem.id, data);
    } else {
      createItem(data);
    }

    closeDialog();
  }

  function handleConfirmDelete() {
    if (!selectedItem) {
      return;
    }

    deleteItem(selectedItem.id);

    closeDeleteDialog();
  }

  return (
    <AppShell>
        <div className="space-y-9">
          <PageHeader
            overline="Workspace"
            title="Biblioteca"
            description="Gerencie os conteúdos da Base de Conhecimento."
            actions={
              <Button onClick={openCreateDialog}>
                Novo Conteúdo
              </Button>
            }
          />

          <LibraryToolbar
            filters={filters}
            onFiltersChange={setFilters}
            onNewItem={openCreateDialog}
          />

          <LibraryGrid
            items={filteredItems}
            projects={projectOptions}
            onItemClick={openEditDialog}
            onItemEdit={openEditDialog}
            onItemDelete={openDeleteDialog}
          />

          <LibraryDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title={
              selectedItem
                ? "Editar Conteúdo"
                : "Novo Conteúdo"
            }
            description={
              selectedItem
                ? "Atualize as informações do conteúdo."
                : "Preencha as informações para cadastrar um novo conteúdo."
            }
          >
            <LibraryForm
              projects={projectOptions}
              initialData={
                selectedItem
                  ? {
                      title: selectedItem.title,
                      description:
                        selectedItem.description,
                      content: selectedItem.content,
                      projectId:
                        selectedItem.projectId,
                      type: selectedItem.type,
                      status: selectedItem.status,
                      category:
                        selectedItem.category,
                      tags: selectedItem.tags,
                    }
                  : undefined
              }
              submitLabel={
                selectedItem
                  ? "Atualizar"
                  : "Salvar"
              }
              onSubmit={handleSubmit}
              onCancel={closeDialog}
            />
          </LibraryDialog>

          <LibraryDeleteDialog
            open={deleteDialogOpen}
            itemTitle={selectedItem?.title ?? ""}
            onCancel={closeDeleteDialog}
            onConfirm={handleConfirmDelete}
          />
        </div>
    </AppShell>
  );
}
