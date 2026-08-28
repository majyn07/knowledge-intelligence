import { panelSourceLabel, panelWindowLabel, type PanelSpec } from "./panelSpec";
import type { PanelResult } from "./runPanel";

/**
 * Escapa um campo para CSV.
 *
 * Aspas duplicadas e o campo inteiro entre aspas quando há separador, aspa ou
 * quebra de linha. Sem isto, uma seção chamada "Elétrica, geral" viraria duas
 * colunas, e o arquivo abriria torto sem nada indicando por quê.
 */
function field(value: string | number): string {
  const text = String(value);

  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * O painel como planilha.
 *
 * Ponto e vírgula porque o Excel em pt-BR usa vírgula como separador decimal e
 * abre CSV com vírgula tudo numa coluna só. BOM pelo mesmo motivo: sem ele o
 * Excel lê o arquivo como ANSI e "Elétrica" chega quebrado.
 *
 * As duas primeiras linhas dizem de onde o número veio. Uma planilha que
 * circula sem o recorte que a gerou é um número sem procedência.
 */
export function panelToCsv(spec: PanelSpec, result: PanelResult): string {
  const linhas: string[] = [
    [field(spec.title), ""].join(";"),
    [
      field(`${panelSourceLabel[spec.source]} · ${panelWindowLabel(spec.window)}`),
      "",
    ].join(";"),
    "",
  ];

  if (result.matrix) {
    /*
      A tabela cruzada sai como tabela: uma coluna por valor da segunda
      dimensão. Achatá-la em pares "linha, coluna, valor" seria mais fácil de
      gerar e mais difícil de ler, e a planilha existe para ser lida.
    */
    linhas.push(["", ...result.matrix.columns.map((column) => column.label), "Total"].map(field).join(";"));

    for (const row of result.matrix.rows) {
      linhas.push([field(row.label), ...row.values.map(field), field(row.total)].join(";"));
    }
  } else {
    linhas.push(["Item", "Total"].map(field).join(";"));

    for (const row of result.rows) {
      linhas.push([field(row.label), field(row.value)].join(";"));
    }
  }

  linhas.push("", [field("Total"), field(result.total)].join(";"));

  if (result.caveat) linhas.push("", [field(result.caveat), ""].join(";"));

  return `﻿${linhas.join("\r\n")}\r\n`;
}

/** Nome de arquivo a partir do título, sem acento nem caractere proibido. */
export function panelFileName(spec: PanelSpec): string {
  const slug = spec.title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${slug || "painel"}.csv`;
}
