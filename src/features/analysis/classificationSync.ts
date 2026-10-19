import type { Ticket } from "@/models/Ticket";
import type { TicketClassificationField } from "@/models/TicketClassification";

import { chamadoDo } from "./ticketTableView";

/** O teto da rota, que é o teto de `batch/read` na HubSpot. */
export const POR_LOTE = 100;

export interface PlanoDeClassificacao {
  /** Números de chamado, em lotes que a rota aceita. */
  lotes: string[][];
  /** De número de chamado para os nossos atendimentos com ele. */
  porChamado: Map<string, string[]>;
  /** Atendimentos sem número da HubSpot: cadastrados à mão ou por arquivo. */
  semNumero: number;
}

/**
 * Quem pedir à HubSpot, e em quantas idas.
 *
 * Só atendimento com número de chamado: o que foi cadastrado à mão não tem
 * onde ser procurado, e é contado à parte para a tela não prometer o acervo
 * inteiro. Número repetido vai uma vez só.
 */
export function planejarClassificacao(tickets: readonly Ticket[]): PlanoDeClassificacao {
  const porChamado = new Map<string, string[]>();
  let semNumero = 0;

  for (const ticket of tickets) {
    if (ticket.deletedAt) continue;

    const chamado = chamadoDo(ticket).trim();

    if (chamado === "") {
      semNumero += 1;
      continue;
    }

    porChamado.set(chamado, [...(porChamado.get(chamado) ?? []), ticket.id]);
  }

  const numeros = [...porChamado.keys()];
  const lotes: string[][] = [];

  for (let i = 0; i < numeros.length; i += POR_LOTE) lotes.push(numeros.slice(i, i + POR_LOTE));

  return { lotes, porChamado, semNumero };
}

/** As respostas da rota, por atendimento nosso. */
export function aplicacaoDe(
  respostas: Record<string, Record<TicketClassificationField, string>>,
  porChamado: Map<string, string[]>
): Map<string, Record<TicketClassificationField, string>> {
  const porTicket = new Map<string, Record<TicketClassificationField, string>>();

  for (const [chamado, classificacao] of Object.entries(respostas)) {
    for (const ticketId of porChamado.get(chamado) ?? []) porTicket.set(ticketId, classificacao);
  }

  return porTicket;
}
