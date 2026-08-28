import type { Ticket } from "@/models/Ticket";

import {
  ticketCellValue,
  ticketColumnLabel,
  type TicketColumn,
  type TicketCycle,
} from "./ticketTableView";

/**
 * O recorte de atendimentos como planilha.
 *
 * Exporta **o que está na tela**, com filtro e ordenação aplicados, e não a
 * base inteira. Quem exporta acabou de montar o recorte; entregar outra coisa
 * obrigaria a refazer o trabalho no Excel.
 *
 * Passa por `ticketCellValue`, o mesmo da lista: exibir e exportar escritos em
 * separado é como os dois passam a discordar.
 */

function campo(valor: string): string {
  return /[;"\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function ticketsToCsv(
  tickets: Ticket[],
  columns: TicketColumn[],
  ciclo: TicketCycle
): string {
  const linhas = [columns.map((column) => campo(ticketColumnLabel[column])).join(";")];

  for (const ticket of tickets) {
    linhas.push(
      columns.map((column) => campo(ticketCellValue(ticket, column, ciclo))).join(";")
    );
  }

  /*
    Ponto e vírgula e BOM pela mesma razão da Biblioteca: o Excel em pt-BR usa
    vírgula como separador decimal, e sem o BOM lê o arquivo como ANSI, então
    "Elétrica" chega quebrado.
  */
  return `﻿${linhas.join("\r\n")}\r\n`;
}
