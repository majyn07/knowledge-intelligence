"use client";

import { useState } from "react";
import { Bookmark, Columns3, Download, LayoutGrid, Table2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { matchesView, type SavedView } from "../savedViews";
import {
  ARTICLE_COLUMNS,
  columnLabel,
  REQUIRED_COLUMNS,
  type ArticleColumn,
  type Sort,
} from "../tableView";
import type { LibraryFilters } from "../types/LibraryFilters";

export type LibraryMode = "cards" | "table";

interface LibraryViewBarProps {
  mode: LibraryMode;
  onModeChange: (mode: LibraryMode) => void;

  columns: ArticleColumn[];
  onColumnsChange: (columns: ArticleColumn[]) => void;

  views: SavedView[];
  filters: LibraryFilters;
  sort: Sort;
  onApplyView: (view: SavedView) => void;
  onSaveView: (name: string) => void;
  onRemoveView: (id: string) => void;

  onExport: () => void;
  exportCount: number;
}

/**
 * A barra que controla a forma da listagem.
 *
 * Cartão e tabela **convivem**. A grade responde "o que tem aqui" e é boa para
 * poucos; a tabela responde "onde está este e o que falta nele", que é a
 * pergunta de quem opera 1.800 artigos. Trocar uma pela outra responderia
 * metade.
 */
export function LibraryViewBar({
  mode,
  onModeChange,
  columns,
  onColumnsChange,
  views,
  filters,
  sort,
  onApplyView,
  onSaveView,
  onRemoveView,
  onExport,
  exportCount,
}: LibraryViewBarProps) {
  const [isPickingColumns, setPickingColumns] = useState(false);
  const [isNaming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const toggleColumn = (column: ArticleColumn) => {
    // O título não sai: sem ele a linha deixa de identificar o registro.
    if (REQUIRED_COLUMNS.includes(column)) return;

    const próximas = columns.includes(column)
      ? columns.filter((item) => item !== column)
      : ARTICLE_COLUMNS.filter((item) => columns.includes(item) || item === column);

    onColumnsChange(próximas);
  };

  const confirmSave = () => {
    if (name.trim() === "") return;

    onSaveView(name.trim());
    setName("");
    setNaming(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Forma da listagem">
          <Button
            size="sm"
            variant={mode === "cards" ? "default" : "outline"}
            onClick={() => onModeChange("cards")}
          >
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            Cartões
          </Button>

          <Button
            size="sm"
            variant={mode === "table" ? "default" : "outline"}
            onClick={() => onModeChange("table")}
          >
            <Table2 className="mr-1.5 h-3.5 w-3.5" />
            Tabela
          </Button>
        </div>

        {mode === "table" && (
          <Button size="sm" variant="outline" onClick={() => setPickingColumns((open) => !open)}>
            <Columns3 className="mr-1.5 h-3.5 w-3.5" />
            Colunas
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={() => setNaming(true)}>
          <Bookmark className="mr-1.5 h-3.5 w-3.5" />
          Salvar visão
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={onExport}
          disabled={exportCount === 0}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Exportar {exportCount} em CSV
        </Button>
      </div>

      {isPickingColumns && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/70 p-3">
          {ARTICLE_COLUMNS.map((column) => {
            const on = columns.includes(column);
            const fixa = REQUIRED_COLUMNS.includes(column);

            return (
              <button
                key={column}
                type="button"
                aria-pressed={on}
                disabled={fixa}
                onClick={() => toggleColumn(column)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:border-primary/30"
                } ${fixa ? "opacity-60" : ""}`}
                title={fixa ? "O título sempre aparece" : undefined}
              >
                {columnLabel[column]}
              </button>
            );
          })}
        </div>
      )}

      {isNaming && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 p-3">
          <Input
            autoFocus
            className="h-8 max-w-xs text-sm"
            value={name}
            placeholder="Ex.: Elétrica sem responsável"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") confirmSave();
              if (event.key === "Escape") setNaming(false);
            }}
          />

          <Button size="sm" onClick={confirmSave} disabled={name.trim() === ""}>
            Salvar
          </Button>

          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
            Cancelar
          </Button>

          <p className="w-full text-xs text-muted-foreground">
            Guarda os filtros, a ordenação e as colunas — não os artigos. A lista é refeita a cada
            abertura, e a visão fica disponível para a equipe.
          </p>
        </div>
      )}

      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {views.map((view) => {
            const ativa = matchesView(view, filters, sort);

            return (
              <span
                key={view.id}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  ativa
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground"
                }`}
              >
                <button type="button" onClick={() => onApplyView(view)}>
                  {view.name}
                </button>

                <button
                  type="button"
                  aria-label={`Remover a visão ${view.name}`}
                  className="opacity-60 transition-opacity hover:opacity-100"
                  onClick={() => onRemoveView(view.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
