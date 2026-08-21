import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { cellValue, columnLabel, type ArticleColumn, type ColumnContext } from "./tableView";

/**
 * O recorte atual como planilha.
 *
 * Exporta **o que está na tela** — filtros, ordenação e colunas aplicados —, e
 * não o acervo inteiro. Quem exporta acabou de montar um recorte; entregar
 * outra coisa obrigaria a refazer o trabalho no Excel.
 *
 * As colunas usam `cellValue`, o mesmo da tabela: exibir e exportar em separado
 * é como os dois passam a discordar.
 */

function field(value: string | number): string {
  const text = String(value);

  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function articlesToCsv(
  articles: KnowledgeArticle[],
  columns: ArticleColumn[],
  context: ColumnContext
): string {
  const linhas = [columns.map((column) => field(columnLabel[column])).join(";")];

  for (const article of articles) {
    linhas.push(columns.map((column) => field(cellValue(article, column, context))).join(";"));
  }

  /*
    Ponto e vírgula e BOM pela mesma razão do painel: o Excel em pt-BR usa
    vírgula como separador decimal, e sem o BOM lê o arquivo como ANSI —
    "Elétrica" chega quebrado.
  */
  return `﻿${linhas.join("\r\n")}\r\n`;
}
