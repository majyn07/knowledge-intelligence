/**
 * A página de indicadores como uma planilha só.
 *
 * Os painéis já exportavam um a um, e um a um é o que não serve para quem leva
 * o resultado a uma reunião: são doze arquivos para montar um slide. Aqui sai
 * tudo que está na tela, com o recorte que a gerou escrito em cima.
 *
 * A ressalva vai junto de cada número que tem uma. Uma planilha que circula sem
 * ela é um número parcial apresentado como completo, e fora da tela ninguém
 * tem como saber o que ficou de fora.
 */

export interface IndicatorRow {
  /** A que bloco da tela o número pertence. */
  group: string;
  label: string;
  value: string | number;
  /** O que o número não conta. Vazio quando não há o que ressalvar. */
  note?: string;
}

/**
 * Escapa um campo para CSV.
 *
 * Mesma regra do `panelCsv`: aspas duplicadas, e o campo inteiro entre aspas
 * quando há separador, aspa ou quebra de linha. Sem isto, "Elétrica, geral"
 * viraria duas colunas e o arquivo abriria torto sem nada indicando por quê.
 */
function field(value: string | number): string {
  const text = String(value);

  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Ponto e vírgula porque o Excel em pt-BR usa vírgula como separador decimal e
 * abriria tudo numa coluna só. BOM pelo mesmo motivo: sem ele o Excel lê como
 * ANSI e "Elétrica" chega quebrado.
 */
export function indicatorsToCsv(cabecalho: string[], rows: IndicatorRow[]): string {
  const linhas: string[] = cabecalho.map((linha) => [field(linha), "", "", ""].join(";"));

  linhas.push("", ["Bloco", "Indicador", "Valor", "Ressalva"].map(field).join(";"));

  for (const row of rows) {
    linhas.push(
      [field(row.group), field(row.label), field(row.value), field(row.note ?? "")].join(";")
    );
  }

  return `﻿${linhas.join("\r\n")}\r\n`;
}

/** Nome de arquivo com o dia, porque a planilha envelhece e a de ontem circula. */
export function indicatorsFileName(dia: string): string {
  return `indicadores-${dia}.csv`;
}
