"use client";

import { Trash2, X } from "lucide-react";

import { PersonSelect } from "@/features/people/components/PersonSelect";
import { Button } from "@/components/ui/button";
import {
  allowedArticleTransitions,
  articleStatusLabel,
  type ArticleStatus,
  type KnowledgeArticle,
} from "@/models/KnowledgeArticle";

interface BulkActionsProps {
  selected: KnowledgeArticle[];
  onChangeStatus: (status: ArticleStatus) => void;
  onAssign: (ref: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Ações sobre a seleção.
 *
 * Mudar estágio, atribuir e excluir. Excluir só entrou depois do desfazer em
 * lote: um clique que manda duzentos artigos para a lixeira precisa de um
 * caminho de volta do mesmo tamanho, e desfazer duzentas vezes não é caminho
 * de volta.
 *
 * O estágio oferecido é só o que **toda** a seleção pode alcançar. Oferecer o
 * que vale para parte dela aplicaria a metade e falharia na outra, em
 * silêncio.
 */
export function BulkActions({ selected, onChangeStatus, onAssign, onDelete, onClear }: BulkActionsProps) {
  if (selected.length === 0) return null;

  const comuns = (Object.keys(articleStatusLabel) as ArticleStatus[]).filter((status) =>
    selected.every((article) => allowedArticleTransitions[article.status].includes(status))
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--ring)] bg-accent p-3">
      <span className="text-sm font-medium">
        {selected.length} selecionado{selected.length > 1 ? "s" : ""}
      </span>

      <span className="flex flex-wrap items-center gap-2">
        {comuns.length > 0 ? (
          comuns.map((status) => (
            <Button key={status} size="sm" variant="outline" onClick={() => onChangeStatus(status)}>
              Mover para {articleStatusLabel[status].toLowerCase()}
            </Button>
          ))
        ) : (
          /*
            Seleção com estágios incompatíveis — um rascunho e um publicado não
            têm destino em comum. Dizer isso é melhor que uma barra sem botão
            nenhum, que pareceria defeito.
          */
          <span className="text-xs text-muted-foreground">
            Nenhum estágio serve para todos os selecionados. Refine a seleção.
          </span>
        )}
      </span>

      <span className="flex min-w-48 items-center gap-2">
        <PersonSelect id="bulk-author" value="" onChange={onAssign} placeholder="Atribuir a…" />
      </span>

      <Button size="sm" variant="outline" onClick={onDelete}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Excluir
      </Button>

      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
        <X className="mr-1.5 h-3.5 w-3.5" />
        Limpar seleção
      </Button>
    </div>
  );
}
