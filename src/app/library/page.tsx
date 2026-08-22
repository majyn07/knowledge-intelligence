"use client";

import { useEffect, useRef, useState } from "react";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/layout/AppShell";
import { DiscardChangesDialog } from "@/components/common/DiscardChangesDialog";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { useUrlState } from "@/hooks/useUrlState";
import {
  fromParams,
  LIBRARY_URL_DEFAULTS,
  sameParams,
  toParams,
} from "@/features/library/libraryUrlState";
import { PageHeader } from "@/components/common/page/PageHeader";
import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";

import { LibraryDeleteDialog } from "@/features/library/components/LibraryDeleteDialog";
import { LibraryDialog } from "@/features/library/components/LibraryDialog";
import { LibraryForm } from "@/features/library/components/LibraryForm";
import { LibraryGrid } from "@/features/library/components/LibraryGrid";
import { LibraryToolbar } from "@/features/library/components/LibraryToolbar";
import { LibraryTable } from "@/features/library/components/LibraryTable";
import { LibraryViewBar } from "@/features/library/components/LibraryViewBar";
import { BulkActions } from "@/features/library/components/BulkActions";
import { ImportButton, ImportDialog } from "@/features/library/components/ImportDialog";
import { SuggestSectionDialog } from "@/features/library/components/SuggestSectionDialog";
import { findSection } from "@/models/Taxonomy";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { Sparkles } from "lucide-react";
import { useLibraryTable } from "@/features/library/hooks/useLibraryTable";
import { useSavedViews } from "@/features/library/providers/SavedViewsProvider";
import { articlesToCsv } from "@/features/library/articleCsv";
import { normalizeSavedView, type SavedView } from "@/features/library/savedViews";

import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useLibraryDialogs } from "@/features/library/hooks/useLibraryDialogs";
import { useLibraryFilters } from "@/features/library/hooks/useLibraryFilters";
import { articleService } from "@/features/library/services/articleService";

import { useProject } from "@/providers/ProjectProvider";

export default function LibraryPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { activeProject, activeProjectId, projects } = useProject();
  const {
    items,
    isHydrated,
    createItem,
    updateItem,
    deleteItem,
    changeStatusMany,
    assignMany,
    deleteMany,
  } = useLibrary();
  const { views, saveView, removeView } = useSavedViews();

  const { filters, setFilters, filteredItems, unclassifiedCount } = useLibraryFilters(
    items.filter((item) => item.projectId === activeProjectId)
  );

  const [params, writeParams, urlRead] = useUrlState(LIBRARY_URL_DEFAULTS);

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

  const { taxonomy } = useTaxonomy();

  /*
    Sem seção é estado legítimo — o importado entra assim de propósito quando o
    nome não bate com o cadastro. O botão de sugerir só existe quando existe o
    problema que ele resolve.
  */
  const semSecao = items.filter(
    (item) =>
      item.projectId === activeProjectId && findSection(taxonomy, item.sectionId) === undefined
  );

  const table = useLibraryTable(filteredItems);

  /*
    Dois efeitos, e a ordem entre eles importa. O primeiro lê o endereço uma vez
    — quando alguém abre um link colado — e o segundo escreve o que a pessoa
    escolhe daí em diante. Eles não se realimentam porque o segundo só escreve
    quando o recorte de fato mudou; escrever o que já está lá reiniciaria o
    primeiro num laço.
  */
  const urlApplied = useRef(false);

  useEffect(() => {
    if (!urlRead || urlApplied.current) return;
    urlApplied.current = true;

    const recorte = fromParams(params, taxonomy, table.page.pages);

    setFilters(recorte.filters);
    table.setSort(recorte.sort);
    table.setPage(recorte.page);
  }, [urlRead, params, taxonomy, table, setFilters]);

  useEffect(() => {
    if (!urlApplied.current) return;

    const atual = toParams(filters, table.sort, table.page.page);
    if (sameParams(atual, params)) return;

    writeParams(atual);
  }, [filters, table.sort, table.page.page, params, writeParams]);

  const guard = useUnsavedGuard(closeDialog);

  /*
    Exporta o recorte que está na tela — filtros, ordenação e colunas —, e não
    o acervo inteiro. Quem exporta acabou de montar o recorte; entregar outra
    coisa obrigaria a refazer o trabalho na planilha.
  */
  function exportCsv() {
    const csv = articlesToCsv(table.sorted, table.columns, table.context);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));

    const link = document.createElement("a");
    link.href = url;
    link.download = "biblioteca.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function applyView(view: SavedView) {
    setFilters(view.filters);
    table.setColumns(view.columns);
  }

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
            <div className="flex flex-wrap gap-2">
              {semSecao.length > 0 && (
                <Button variant="outline" onClick={() => setSuggestOpen(true)}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Sugerir seção ({semSecao.length})
                </Button>
              )}

              <ImportButton onClick={() => setImportOpen(true)} />
              <Button onClick={openCreateDialog}>Novo artigo</Button>
            </div>
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

            <LibraryViewBar
              mode={table.mode}
              onModeChange={table.setMode}
              columns={table.columns}
              onColumnsChange={table.setColumns}
              views={views}
              filters={filters}
              sort={table.sort}
              onApplyView={applyView}
              onSaveView={(name) =>
                saveView(
                  normalizeSavedView({
                    id: crypto.randomUUID(),
                    name,
                    filters,
                    sort: table.sort,
                    columns: table.columns,
                  })
                )
              }
              onRemoveView={removeView}
              onExport={exportCsv}
              exportCount={filteredItems.length}
            />

            {filteredItems.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {filteredItems.length} artigo(s) · {publishedCount} publicado(s) e visível(is) para a análise.
              </p>
            )}

            {table.mode === "table" && (
              <BulkActions
                selected={table.selectedArticles}
                onChangeStatus={(status) => {
                  changeStatusMany(table.selectedArticles.map((item) => item.id), status);
                  table.clear();
                }}
                onAssign={(ref) => {
                  assignMany(table.selectedArticles.map((item) => item.id), ref);
                  table.clear();
                }}
                onDelete={() => setBulkDeleteOpen(true)}
                onClear={table.clear}
              />
            )}

            {table.mode === "cards" ? (
              <LibraryGrid
                items={filteredItems}
                projects={projectOptions}
                onItemEdit={openEditDialog}
                onItemDelete={openDeleteDialog}
              />
            ) : (
              <>
                <LibraryTable
                  articles={table.page.items}
                  columns={table.columns}
                  sort={table.sort}
                  context={table.context}
                  selected={table.selected}
                  onToggle={table.toggle}
                  onToggleAll={table.toggleAll}
                  onSort={table.toggleSort}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />

                {table.page.pages > 1 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Página {table.page.page} de {table.page.pages} · {table.page.total} artigo(s)
                    </span>

                    <span className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={table.page.page === 1}
                        onClick={() => table.setPage(table.page.page - 1)}
                      >
                        Anterior
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={table.page.page === table.page.pages}
                        onClick={() => table.setPage(table.page.page + 1)}
                      >
                        Próxima
                      </Button>
                    </span>
                  </div>
                )}
              </>
            )}
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

        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

        <SuggestSectionDialog
          open={suggestOpen}
          onOpenChange={setSuggestOpen}
          articles={semSecao}
        />

        {/*
          A confirmação diz o número antes do clique, como a de um registro só —
          e diz também que há volta, porque é a existência do desfazer em lote
          que permitiu esta ação existir.
        */}
        <LibraryDeleteDialog
          open={bulkDeleteOpen}
          itemTitle=""
          count={table.selectedArticles.length}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={() => {
            deleteMany(table.selectedArticles.map((item) => item.id));
            table.clear();
            setBulkDeleteOpen(false);
          }}
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
