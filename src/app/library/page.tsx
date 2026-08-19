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

import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useLibraryDialogs } from "@/features/library/hooks/useLibraryDialogs";
import { useLibraryFilters } from "@/features/library/hooks/useLibraryFilters";
import { articleService } from "@/features/library/services/articleService";

import { useProject } from "@/providers/ProjectProvider";

export default function LibraryPage() {
  const { activeProject, activeProjectId, projects } = useProject();
  const { items, createItem, updateItem, deleteItem } = useLibrary();

  const { filters, setFilters, filteredItems } = useLibraryFilters(
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

  const publishedCount = filteredItems.filter((item) => item.status === "published").length;

  function handleSubmit(data: LibraryFormData) {
    if (selectedItem) {
      updateItem(selectedItem.id, data);
    } else {
      createItem(data);
    }

    closeDialog();
  }

  function handleConfirmDelete() {
    if (!selectedItem) return;

    deleteItem(selectedItem.id);
    closeDeleteDialog();
  }

  return (
    <AppShell>
      <div className="w-full space-y-9">
        <PageHeader
          overline="Base de Conhecimento"
          title="Biblioteca"
          description={`O acervo de ${activeProject?.name ?? "este projeto"}. Os artigos publicados são o que a análise consulta ao avaliar a cobertura documental.`}
          actions={
            <Button onClick={openCreateDialog}>Novo artigo</Button>
          }
        />

        <LibraryToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onNewItem={openCreateDialog}
        />

        {filteredItems.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} artigo(s) · {publishedCount} publicado(s) e visível(is) para a análise.
          </p>
        )}

        <LibraryGrid
          items={filteredItems}
          projects={projectOptions}
          onItemEdit={openEditDialog}
          onItemDelete={openDeleteDialog}
        />

        <LibraryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={selectedItem ? "Editar artigo" : "Novo artigo"}
          description={
            selectedItem
              ? "Atualize o conteúdo, a classificação e o estágio editorial."
              : "Todo artigo novo nasce como rascunho e precisa passar por revisão antes de ser publicado."
          }
        >
          <LibraryForm
            projects={projectOptions}
            initialData={selectedItem ? articleService.toFormData(selectedItem) : undefined}
            submitLabel={selectedItem ? "Atualizar" : "Salvar"}
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
