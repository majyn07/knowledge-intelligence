import "server-only";

import { items, record } from "@/lib/shape";

import { HubSpotFailure, hubspot, hubspotConfigured } from "./hubspotClient";
import {
  PROPRIEDADES_PADRAO,
  propriedadesPedidas,
  proximaPagina,
  toTicket,
  type HubSpotTicket,
  type TicketPropertyMap,
} from "./ticketMapping";

/**
 * Os atendimentos, trazidos da HubSpot.
 *
 * Escrito antes de a credencial poder chamá-lo. Hoje toda chamada aqui volta
 * como `sem-permissao`, porque o escopo `tickets` não está no app privado, e
 * isso está registrado em `docs/hubspot-pendencias.md`. No dia em que o escopo
 * entrar, este arquivo funciona sem alteração: quem muda é o mapa de
 * propriedades, se os nomes da conta não forem os padrão.
 *
 * O atendimento continua entrando por arquivo enquanto isso, e as duas portas
 * casam pelo mesmo `source.externalId`. Reimportar por um caminho não duplica
 * o que entrou pelo outro.
 */

/** O teto da API é 100, e pedir menos só aumentaria o número de idas. */
const POR_PAGINA = 100;

/**
 * Trava de laço. Cem mil atendimentos é muito acima do que o suporte tem, e
 * laço sem teto trava a rota até o limite da plataforma se a API repetir
 * cursor.
 */
const MAXIMO_DE_PAGINAS = 1_000;

export interface BuscaDeAtendimentos {
  /** Quantos no máximo. Quem chama decide, porque a tela mostra o número antes. */
  limite: number;
  mapa?: TicketPropertyMap;
}

/** O que a credencial alcança do objeto de atendimento, hoje, de verdade. */
export type AlcanceDoAtendimento =
  | { alcanca: true }
  | { alcanca: false; motivo: string; configurado: boolean };

export const hubspotTicketService = {
  /**
   * Pergunta à HubSpot em vez de afirmar.
   *
   * A tela de Integrações diz o que a credencial alcança, e afirmar isso sem
   * conferir é exatamente o que este produto não faz. O pedido é o menor
   * possível, um registro só, e a resposta que importa é o 403.
   *
   * A mensagem crua vai junto porque é a única pista de quem administra o app
   * privado, como na tradução do erro de acesso.
   */
  async alcance(): Promise<AlcanceDoAtendimento> {
    if (!hubspotConfigured()) {
      return { alcanca: false, motivo: "Não há credencial neste ambiente.", configurado: false };
    }

    try {
      await hubspot.get("/crm/v3/objects/tickets?limit=1&properties=subject");
      return { alcanca: true };
    } catch (error) {
      return {
        alcanca: false,
        configurado: true,
        motivo:
          error instanceof HubSpotFailure
            ? error.message
            : "Não foi possível falar com a HubSpot.",
      };
    }
  },

  /**
   * Um atendimento pelo número dele na HubSpot.
   *
   * É o caminho que o produto usa hoje para a conversa, então é o que a tela
   * de um atendimento já sabe pedir.
   */
  async byExternalId(
    externalId: string,
    mapa: TicketPropertyMap = PROPRIEDADES_PADRAO
  ): Promise<HubSpotTicket | null> {
    const query = new URLSearchParams({ properties: propriedadesPedidas(mapa).join(",") });

    const bruto: unknown = await hubspot.get(
      `/crm/v3/objects/tickets/${encodeURIComponent(externalId)}?${query}`
    );

    return toTicket(bruto, mapa);
  },

  /**
   * A lista, página a página.
   *
   * Em série e não em paralelo, como a varredura do portal: do outro lado tem
   * limite de taxa, e estourá-lo devolveria erro no meio de uma leitura que
   * já custou minutos.
   *
   * O que não vira atendimento legível é **contado**, não descartado calado:
   * quem importa precisa saber que o número da tela não é o número da conta.
   */
  async list({
    limite,
    mapa = PROPRIEDADES_PADRAO,
  }: BuscaDeAtendimentos): Promise<{ tickets: HubSpotTicket[]; ilegiveis: number }> {
    const tickets: HubSpotTicket[] = [];
    let ilegiveis = 0;
    let cursor: string | null = null;
    let voltas = 0;

    do {
      const query = new URLSearchParams({
        limit: String(Math.min(POR_PAGINA, limite - tickets.length)),
        properties: propriedadesPedidas(mapa).join(","),
      });

      if (cursor) query.set("after", cursor);

      const pagina: unknown = await hubspot.get(`/crm/v3/objects/tickets?${query}`);

      for (const linha of items(record(pagina).results)) {
        const ticket = toTicket(linha, mapa);

        if (ticket) tickets.push(ticket);
        else ilegiveis += 1;
      }

      cursor = proximaPagina(pagina);
      voltas += 1;
    } while (cursor && tickets.length < limite && voltas < MAXIMO_DE_PAGINAS);

    return { tickets: tickets.slice(0, limite), ilegiveis };
  },
};
