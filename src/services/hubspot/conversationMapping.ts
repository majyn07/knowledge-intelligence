import { items, record, text } from "@/lib/shape";
import type {
  SupportConversationMessage,
  SupportMessageRole,
} from "@/models/SupportConversation";

/**
 * O que a API de conversas devolve, virando mensagem nossa.
 *
 * Este arquivo é puro e não conhece rede: as quatro regras abaixo foram
 * medidas contra a API real, e cada uma delas quebra a importação de um jeito
 * diferente se for esquecida.
 */

/** Só isto é fala de alguém. */
const TIPO_MENSAGEM = "MESSAGE";

const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * O corpo vem com HTML mesmo no campo `text`, que deveria ser texto puro, e
 * de forma assimétrica: no que sai do suporte a tag está lá, no que entra do
 * cliente não.
 *
 * Converter aqui não degrada nada nosso, porque a mensagem nunca volta para a
 * HubSpot. É o oposto do corpo do artigo, que guarda `contentFormat`
 * justamente para não ser convertido em viagem de ida e volta.
 */
export function stripHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/gi, (m) => ENTIDADES[m.toLowerCase()] ?? m)
    /*
      Entidade **numérica** também, e ela não era teoria: `&#xa0;` chegou em 115
      mensagens e virou a palavra "xa0", que o Levantamento chegou a exibir
      como um dos termos que descrevem um grupo de treze atendimentos. As
      nomeadas acima não a cobrem, porque a mesma coisa tem duas escritas.
    */
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d{1,7});/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    /* O espaço inquebrável vira espaço: ele é separador, não palavra. */
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface HubSpotActor {
  id: string;
  name: string;
  type: string;
}

/**
 * O rótulo do autor.
 *
 * `VISITOR` vira "Cliente" de propósito: o nome de quem abriu o chamado não
 * acrescenta nada ao levantamento de conhecimento, e trazer dado pessoal de
 * cliente para dentro do hub é decisão de produto, não consequência de uma
 * importação. Os rótulos são os mesmos que o formulário já usa à mão.
 */
export function authorRole(actor: HubSpotActor | undefined): SupportMessageRole {
  switch (actor?.type) {
    case "VISITOR":
      return "cliente";
    case "BOT":
      return "automacao";
    case "AGENT":
      return "suporte";
    default:
      return "sistema";
  }
}

/** O canal da mensagem, traduzido do número que a HubSpot usa. */
const CANAIS: Record<string, string> = {
  "1000": "Chat",
  "1001": "Messenger",
  "1002": "E-mail",
  "1003": "Formulário",
  "1004": "Portal do cliente",
  "1007": "WhatsApp",
  "1008": "Ligação",
  "1009": "SMS",
};

export function channelLabel(channelId: string): string {
  return CANAIS[channelId] ?? "";
}

export function authorLabel(actor: HubSpotActor | undefined): string {
  if (!actor) return "Desconhecido";

  switch (actor.type) {
    /*
      O nome de quem escreveu, e não "Cliente".

      Era genérico de propósito, de quando trazer dado pessoal de cliente para
      dentro do hub ainda não estava decidido. A decisão mudou pela metade
      sozinha: a lista já mostra o nome quando existe contato associado ao
      chamado, e ficava vazia quando não existia — o que acontece em quase todo
      e-mail, porque a associação nasce do chat.

      O nome vem no mesmo pedido de atores que a varredura já faz, então não
      custa requisição nenhuma. Visitante sem nome continua "Cliente": campo
      vazio não é identificação.
    */
    case "VISITOR":
      return actor.name || "Cliente";
    case "BOT":
      return "Automação";
    case "SYSTEM":
      return "Sistema";
    case "AGENT":
      return actor.name || "Suporte";
    default:
      return actor.name || "Desconhecido";
  }
}

export function parseActors(raw: unknown): Map<string, HubSpotActor> {
  const lista = items(record(raw).results).map((entry) => {
    const actor = record(entry);
    return {
      id: text(actor.id),
      name: text(actor.name),
      type: text(actor.type),
    };
  });

  return new Map(lista.filter((actor) => actor.id).map((actor) => [actor.id, actor]));
}

/** Os identificadores de ator citados nas mensagens, sem repetição. */
export function actorIdsOf(rawMessages: unknown[]): string[] {
  const ids = rawMessages
    .map((entry) => text(record(entry).createdBy))
    .filter((id) => id !== "");

  return [...new Set(ids)];
}

/**
 * As mensagens de uma conversa, prontas para o formulário.
 *
 * Duas regras que não são óbvias e foram medidas:
 *
 * - O endpoint mistura fala com evento de sistema (`THREAD_STATUS_CHANGE`,
 *   `ASSIGNMENT`, `WELCOME_MESSAGE`). Gravar tudo faria a análise tratar
 *   mudança de status como evidência.
 * - A API devolve do mais novo para o mais antigo. Sem inverter, a análise lê
 *   a resposta antes da pergunta.
 */
export function toConversationMessages(
  rawMessages: unknown[],
  actors: Map<string, HubSpotActor>
): SupportConversationMessage[] {
  return rawMessages
    .map((entry) => record(entry))
    .filter((message) => text(message.type) === TIPO_MENSAGEM)
    .map((message) => ({
      id: text(message.id) || crypto.randomUUID(),
      author: authorLabel(actors.get(text(message.createdBy))),
      role: authorRole(actors.get(text(message.createdBy))),
      body: stripHtml(message.text),
      createdAt: text(message.createdAt),
      channel: channelLabel(text(message.channelId)),
    }))
    .filter((message) => message.body !== "")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * O cursor da próxima página, ou `null` no fim.
 *
 * Existe como função nomeada porque a armadilha mora aqui: **uma página pode
 * voltar vazia e ainda ter continuação**. Medido. `limit=3` devolveu zero
 * registros com o cursor presente, e a conversa tinha 38. Parar na lista vazia
 * grava conversa vazia, que é pior que não importar.
 */
export function nextCursor(raw: unknown): string | null {
  const paging = record(record(raw).paging);
  const proximo = record(paging.next);
  return text(proximo.after) || null;
}

/**
 * Quem abriu o chamado, pelo ator da conversa.
 *
 * Serve de recurso quando não há contato associado ao fio — o que é o caso de
 * quase todo e-mail, porque a associação nasce do chat. O nome já vem no
 * pedido de atores que a varredura faz de qualquer jeito, então não custa
 * requisição a mais.
 *
 * Só `VISITOR`: `AGENT` é quem atendeu, e confundir os dois poria gente do
 * suporte na coluna de cliente.
 */
export function visitanteDaConversa(actors: Map<string, HubSpotActor>): string {
  for (const actor of actors.values()) {
    if (actor.type === "VISITOR" && actor.name.trim() !== "") return actor.name.trim();
  }

  return "";
}
