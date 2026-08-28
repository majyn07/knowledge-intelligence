"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { RelativeDate } from "@/components/common/RelativeDate";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { articleStatusLabel, type KnowledgeArticle } from "@/models/KnowledgeArticle";

import {
  cellValue,
  columnLabel,
  type ArticleColumn,
  type ColumnContext,
  type Sort,
} from "../tableView";

interface LibraryTableProps {
  articles: KnowledgeArticle[];
  columns: ArticleColumn[];
  sort: Sort;
  context: ColumnContext;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSort: (column: ArticleColumn) => void;
  onEdit: (article: KnowledgeArticle) => void;
  onDelete: (article: KnowledgeArticle) => void;
}

const statusVariant: Record<KnowledgeArticle["status"], "default" | "info" | "success"> = {
  draft: "default",
  review: "info",
  published: "success",
  archived: "default",
};

export function LibraryTable({
  articles,
  columns,
  sort,
  context,
  selected,
  onToggle,
  onToggleAll,
  onSort,
  onEdit,
  onDelete,
}: LibraryTableProps) {
  const allSelected = articles.length > 0 && articles.every((article) => selected.has(article.id));

  return (
    /*
      Rola dentro do próprio container: com seis colunas e nomes de seção
      longos, deixar a página rolar na horizontal quebraria o resto da tela.
    */
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                aria-label="Selecionar todos desta página"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>

            {columns.map((column) => {
              const active = sort.column === column;

              return (
                <th
                  key={column}
                  className="px-3 py-2.5 text-left font-medium"
                  aria-sort={
                    active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => onSort(column)}
                  >
                    {columnLabel[column]}

                    {active &&
                      (sort.direction === "asc" ? (
                        <ArrowUp className="h-3 w-3" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden />
                      ))}
                  </button>
                </th>
              );
            })}

            <th className="w-20 px-3 py-2.5" />
          </tr>
        </thead>

        <tbody>
          {articles.map((article) => (
            <tr
              key={article.id}
              className="border-b border-border/60 last:border-0 hover:bg-muted/30"
            >
              <td className="px-3 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`Selecionar ${article.title}`}
                  checked={selected.has(article.id)}
                  onChange={() => onToggle(article.id)}
                />
              </td>

              {columns.map((column) => (
                <td key={column} className="max-w-[18rem] truncate px-3 py-2.5">
                  {column === "title" ? (
                    <Link
                      href={`/library/${article.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {article.title || "Sem título"}
                    </Link>
                  ) : column === "status" ? (
                    <StatusBadge variant={statusVariant[article.status]}>
                      {articleStatusLabel[article.status]}
                    </StatusBadge>
                  ) : column === "updatedAt" ? (
                    <span className="text-muted-foreground">
                      <RelativeDate value={article.updatedAt.toISOString()} />
                    </span>
                  ) : (
                    /*
                      Vazio vira travessão e não texto inventado: "sem seção" é
                      informação, e é o que o filtro "Sem seção" existe para
                      encontrar.
                    */
                    <span className="text-muted-foreground">
                      {cellValue(article, column, context) || "."}
                    </span>
                  )}
                </td>
              ))}

              <td className="px-3 py-2.5">
                <span className="flex justify-end gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Editar ${article.title}`}
                    onClick={() => onEdit(article)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Excluir ${article.title}`}
                    onClick={() => onDelete(article)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
