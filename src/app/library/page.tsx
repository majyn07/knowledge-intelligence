"use client";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/layout/AppShell";
import { DiscardChangesDialog } from "@/components/common/DiscardChangesDialog";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { PageHeader } from "@/components/common/page/PageHeader";
import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";

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
  const { items, isHydrated, createItem, updateItem, deleteItem } = useLibrary();

  const { filters, setFilters, filteredItems, unclassifiedCount } = useLibraryFilters(
    items.filter((item) => item.projectId === activeProjectId)
  );

  const {
    dialogOpen,
    deleteDialogOpen,
    selectedItem,
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

  const guard = useUnsavedGuard(closeDialog);

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

        {/*
          Enquanto o acervo não é lido, a barra de filtros e a contagem também
          esperam: filtrar sobre a semente e anunciar "4 artigos" que não são os
          desta pessoa é afirmar o que ainda não se sabe.
        */}
        {!isHydrated ? (
          <ListSkeleton />
        ) : (
          <>
            <LibraryToolbar
              filters={filters}
              onFiltersChange={setFilters}
              onNewItem={openCreateDialog}
              unclassifiedCount={unclassifiedCount}
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
          </>
        )}

        <LibraryDialog
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) guard.requestClose(); }}
          title={selectedItem ? "Editar artigo" : "Novo artigo"}
          description={
            selectedItem
              ? "Atualize o conteúdo, a classificação e o estágio editorial."
              : "Todo artigo novo nasce como rascunho e precisa passar por revisão antes de ser publicado."
          }
        >
          <LibraryForm
            key={selectedItem?.id ?? "novo"}
            projects={projectOptions}
            articles={items}
            editingId={selectedItem?.id}
            initialData={selectedItem ? articleService.toFormData(selectedItem) : undefined}
            submitLabel={selectedItem ? "Atualizar" : "Salvar como rascunho"}
            onSubmit={(data) => { guard.reset(); handleSubmit(data); }}
            onCancel={guard.requestClose}
            onDirty={guard.markDirty}
          />
        </LibraryDialog>

        <DiscardChangesDialog
          open={guard.isConfirming}
          onKeepEditing={guard.keepEditing}
          onDiscard={guard.confirmDiscard}
        />

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
