import "server-only";

import { record, text } from "@/lib/shape";
import type { SupportConversationMessage } from "@/models/SupportConversation";

import { nextCursor, toConversationMessages, type HubSpotActor } from "./conversationMapping";
import { hubspot } from "./hubspotClient";
import { threadsDaPagina, toThreadTicket, type ThreadTicket } from "./threadTicketMapping";

/**
 * A caixa do suporte, varrida.
 *
 * É a porta que não depende do escopo bloqueado: o objeto de ticket está
 * fechado, mas a conversa que o gerou não. E a conversa é o que o arquivo
 * exportado nunca traz.
 *
 * Duas medições decidiram este desenho, e as duas estão em
 * `docs/hubspot-pendencias.md`:
 *
 * A lista sai sempre do mais antigo. `?sort=-createdAt` devolve 400 e o filtro
 * por data é ignorado, então alcançar os últimos meses exige percorrer a
 * paginação desde abril de 2024. Listar é barato: cem fios por requisição.
 *
 * O assunto está na mensagem, e não no fio. Cada fio que se queira ler custa
 * uma requisição própria, e são dezenas de milhares no total. Por isso a
 * varredura tem janela: lista tudo, lê só o que está dentro dela.
 */

/** A caixa do suporte. Cadastro e não constante, mas o padrão é o que existe hoje. */
export const HELP_DESK_INBOX = "474522581";

/** O teto da API. Pedir menos só aumentaria o número de idas. */
const POR_PAGINA = 100;

/**
 * Pausa entre requisições.
 *
 * É o CRM de produção da empresa do outro lado. Varrer a toda velocidade
 * encontra o limite de taxa e devolve erro no meio de uma leitura que já
 * custou minutos.
 */
const PAUSA_MS = 120;

/** Trava de laço, muito acima do volume real, para o caso de cursor repetido. */
const MAXIMO_DE_PAGINAS = 2_000;

const espera = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FioListado {
  id: string;
  criadoEm: string;
}

export interface ProgressoDaLista {
  paginas: number;
  fios: number;
  maisAntigo: string;
  maisRecente: string;
}

/**
 * Todos os fios da caixa, só a listagem.
 *
 * Sem ler mensagem nenhuma: é a passada barata que descobre o que existe, para
 * a passada cara só visitar o que interessa.
 */
export async function listarFios(
  inboxId: string,
  sinal?: AbortSignal,
  aoProgredir?: (progresso: ProgressoDaLista) => void
): Promise<FioListado[]> {
  const fios: FioListado[] = [];
  let cursor: string | null = null;
  let paginas = 0;

  do {
    if (sinal?.aborted) break;

    const query = new URLSearchParams({ limit: String(POR_PAGINA), inboxId });
    if (cursor) query.set("after", cursor);

    const pagina: unknown = await hubspot.get(
      `/conversations/v3/conversations/threads?${query}`
    );

    fios.push(...threadsDaPagina(pagina));
    paginas += 1;

    aoProgredir?.({
      paginas,
      fios: fios.length,
      maisAntigo: fios[0]?.criadoEm ?? "",
      maisRecente: fios.at(-1)?.criadoEm ?? "",
    });

    cursor = nextCursor(pagina);

    if (cursor) await espera(PAUSA_MS);
  } while (cursor && paginas < MAXIMO_DE_PAGINAS);

  return fios;
}

export interface AtendimentoDoFio {
  ticket: ThreadTicket;
  messages: SupportConversationMessage[];
}

async function mensagensDoFio(threadId: string): Promise<unknown[]> {
  const query = new URLSearchParams({ limit: String(POR_PAGINA) });

  const pagina: unknown = await hubspot.get(
    `/conversations/v3/conversations/threads/${threadId}/messages?${query}`
  );

  const bruto = record(pagina).results;

  return Array.isArray(bruto) ? bruto : [];
}

async function resolverAtores(brutas: unknown[]): Promise<Map<string, HubSpotActor>> {
  const ids = new Set<string>();

  for (const bruta of brutas) {
    for (const remetente of Array.isArray(record(bruta).senders) ? (record(bruta).senders as unknown[]) : []) {
      const id = text(record(remetente).actorId).trim();
      if (id !== "") ids.add(id);
    }
  }

  if (ids.size === 0) return new Map();

  const resposta = await hubspot.post("/conversations/v3/conversations/actors/batch/read", {
    inputs: [...ids],
  });

  const atores = new Map<string, HubSpotActor>();

  for (const bruto of Array.isArray(record(resposta).results) ? (record(resposta).results as unknown[]) : []) {
    const id = text(record(bruto).id).trim();
    if (id !== "") atores.set(id, record(bruto) as unknown as HubSpotActor);
  }

  return atores;
}

export interface ProgressoDaLeitura {
  lidos: number;
  total: number;
  aproveitados: number;
}

/**
 * Lê os fios escolhidos, um por vez.
 *
 * Em série, e não em paralelo: são dezenas de milhares de fios do outro lado, e
 * o limite de taxa chegaria no primeiro lote paralelo. O que falha não derruba
 * o que já veio: quem começou uma varredura de mil não pode perder tudo por
 * causa do fio setecentos.
 */
export async function lerFios(
  fios: FioListado[],
  sinal?: AbortSignal,
  aoProgredir?: (progresso: ProgressoDaLeitura) => void
): Promise<{ atendimentos: AtendimentoDoFio[]; falhas: number }> {
  const atendimentos: AtendimentoDoFio[] = [];
  let falhas = 0;

  for (const [indice, fio] of fios.entries()) {
    if (sinal?.aborted) break;

    try {
      const brutas = await mensagensDoFio(fio.id);
      const ticket = toThreadTicket({ id: fio.id, createdAt: fio.criadoEm }, brutas);

      if (ticket) {
        const atores = await resolverAtores(brutas);
        atendimentos.push({ ticket, messages: toConversationMessages(brutas, atores) });
      }
    } catch {
      falhas += 1;
    }

    aoProgredir?.({
      lidos: indice + 1,
      total: fios.length,
      aproveitados: atendimentos.length,
    });

    await espera(PAUSA_MS);
  }

  return { atendimentos, falhas };
}
