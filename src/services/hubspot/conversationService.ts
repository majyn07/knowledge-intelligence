import "server-only";

import { items, record, text } from "@/lib/shape";
import type { SupportConversationMessage } from "@/models/SupportConversation";

import { attachmentsOf, type HubSpotAttachment } from "./attachments";
import {
  actorIdsOf,
  nextCursor,
  parseActors,
  toConversationMessages,
  type HubSpotActor,
} from "./conversationMapping";
import { hubspot } from "./hubspotClient";

/**
 * A conversa de um atendimento, trazida da HubSpot.
 *
 * É a única coisa que a API entrega e o arquivo não: a exportação da HubSpot
 * traz o ticket, não o histórico de mensagens. O atendimento em si continua vindo
 * daqui: o escopo `tickets` não está na credencial, e isso está registrado em
 * `docs/hubspot-pendencias.md`.
 */

/** Alto o bastante para a conversa caber num pedido, e o teto da API é 100. */
const POR_PAGINA = 100;

/** Trava de segurança: conversa nenhum tem 5 mil mensagens, mas laço sem teto trava. */
const MAXIMO_DE_PAGINAS = 50;

export interface HubSpotConversation {
  threadIds: string[];
  messages: SupportConversationMessage[];
}

async function mensagensDaConversa(threadId: string): Promise<unknown[]> {
  const todas: unknown[] = [];
  let cursor: string | null = null;
  let voltas = 0;

  do {
    const query = new URLSearchParams({ limit: String(POR_PAGINA) });
    if (cursor) query.set("after", cursor);

    const pagina: unknown = await hubspot.get(
      `/conversations/v3/conversations/threads/${threadId}/messages?${query}`
    );

    todas.push(...items(record(pagina).results));

    /*
      O fim é a **ausência** do cursor, nunca a página vazia: medido, `limit=3`
      devolveu zero registros com o cursor presente e a conversa tinha 38. Parar no
      vazio gravaria conversa vazia, e conversa vazia faz a análise achar que
      tem evidência quando não tem.
    */
    cursor = nextCursor(pagina);
    voltas += 1;
  } while (cursor && voltas < MAXIMO_DE_PAGINAS);

  return todas;
}

async function resolverAtores(brutas: unknown[]): Promise<Map<string, HubSpotActor>> {
  const ids = actorIdsOf(brutas);
  if (ids.length === 0) return new Map();

  /*
    Um pedido por conversa, não um por mensagem: uma conversa de 38 mensagens costuma ter
    quatro atores distintos.
  */
  const resposta = await hubspot.post("/conversations/v3/conversations/actors/batch/read", {
    inputs: ids,
  });

  return parseActors(resposta);
}

export const hubspotConversationService = {
  async byExternalId(externalId: string): Promise<HubSpotConversation> {
    const query = new URLSearchParams({ associatedTicketId: externalId, limit: "10" });

    const conversas: unknown = await hubspot.get(
      `/conversations/v3/conversations/threads?${query}`
    );

    const threadIds = items(record(conversas).results)
      .map((conversa) => text(record(conversa).id))
      .filter((id) => id !== "");

    const brutas: unknown[] = [];
    for (const threadId of threadIds) {
      brutas.push(...(await mensagensDaConversa(threadId)));
    }

    const atores = await resolverAtores(brutas);

    return { threadIds, messages: toConversationMessages(brutas, atores) };
  },

  /**
   * Os anexos de um atendimento, com a assinatura de agora.
   *
   * Pedido **na hora de exibir**, e não guardado na importação: a URL vem
   * assinada com o prazo dentro dela, e a que foi medida valia cerca de um dia.
   * Gravada, funcionaria hoje e estaria quebrada amanhã.
   *
   * Não resolve ator, ao contrário de `byExternalId`: quem quer ver o print não
   * precisa saber quem mandou — isso a conversa já diz. É um pedido a menos por
   * chamada contra o servidor de suporte.
   */
  async anexosDoAtendimento(externalId: string): Promise<HubSpotAttachment[]> {
    const query = new URLSearchParams({ associatedTicketId: externalId, limit: "10" });

    const conversas: unknown = await hubspot.get(
      `/conversations/v3/conversations/threads?${query}`
    );

    const brutas: unknown[] = [];

    for (const conversa of items(record(conversas).results)) {
      const threadId = text(record(conversa).id);

      if (threadId !== "") brutas.push(...(await mensagensDaConversa(threadId)));
    }

    return attachmentsOf(brutas);
  },
};
