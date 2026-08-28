import { items, record, text } from "@/lib/shape";

import { stripHtml } from "./conversationMapping";
import type { FioListado } from "./helpDeskSchedule";

/**
 * O atendimento nascendo da conversa.
 *
 * A caixa `Help Desk` é quem gera o atendimento na HubSpot, e os dois canais
 * dela contam: chat ao vivo e e-mail são atendimento igual. O objeto de ticket
 * continua fechado pelo escopo que falta, mas a conversa não, e ela é o que o
 * arquivo exportado nunca traz.
 *
 * A diferença entre os dois canais é a única coisa que complica, e ela é
 * declarada em vez de escondida: e-mail tem `subject` na mensagem, chat não
 * tem. Quando não tem, o assunto sai da primeira coisa que o cliente escreveu,
 * e o registro diz que foi assim. Apresentar as duas origens como se fossem a
 * mesma faria metade dos títulos parecer dado quando é recorte.
 */

/** De onde veio o assunto. A distinção é regra de produto, não detalhe. */
export type TitleOrigin = "assunto" | "primeira-mensagem";

export interface ThreadTicket {
  /** O id do fio, que é como reimportar casa em vez de duplicar. */
  externalId: string;
  title: string;
  titleOrigin: TitleOrigin;
  /** O que o suporte respondeu por último antes de fechar. */
  solution: string;
  /** Dia do fechamento, ou da criação enquanto está aberto. */
  date: string;
  /** Quantas mensagens de gente havia no fio, para a tela dizer o tamanho. */
  messageCount: number;
}

/** Acima disso o assunto recortado vira parágrafo e deixa de identificar a linha. */
const MAXIMO_DO_TITULO = 120;

function primeiraLinha(bruto: string): string {
  const limpo = stripHtml(bruto).replace(/\s+/g, " ").trim();

  if (limpo.length <= MAXIMO_DO_TITULO) return limpo;

  /*
    Corta na palavra, e não no meio dela. Título terminando em "config" faz
    quem lê a lista achar que o registro está truncado por defeito.
  */
  const corte = limpo.slice(0, MAXIMO_DO_TITULO);
  const espaco = corte.lastIndexOf(" ");

  return `${(espaco > 40 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

interface Mensagem {
  texto: string;
  assunto: string;
  entrando: boolean;
  em: string;
}

function mensagensDe(brutas: unknown[]): Mensagem[] {
  return brutas
    .map((bruta) => record(bruta))
    .filter((m) => text(m.type) === "MESSAGE")
    .map((m) => ({
      texto: stripHtml(m.text ?? m.richText),
      assunto: text(m.subject).trim(),
      entrando: text(m.direction) === "INCOMING",
      em: text(m.createdAt),
    }))
    .filter((m) => m.texto !== "")
    .sort((a, b) => a.em.localeCompare(b.em));
}

/**
 * Um fio virando atendimento, ou `null` quando não há o que registrar.
 *
 * Fio sem nenhuma mensagem de gente é evento de sistema (atribuição, mudança
 * de estado) e não atendimento. Gravá-lo criaria uma linha sem assunto e sem
 * conversa, e a análise trataria isso como evidência.
 */
export function toThreadTicket(fio: unknown, mensagensBrutas: unknown[]): ThreadTicket | null {
  const raiz = record(fio);
  const externalId = text(raiz.id).trim();

  if (externalId === "") return null;

  const mensagens = mensagensDe(mensagensBrutas);

  if (mensagens.length === 0) return null;

  const doCliente = mensagens.filter((m) => m.entrando);
  const doSuporte = mensagens.filter((m) => !m.entrando);

  /*
    O assunto do e-mail vence, quando existe. É o que a pessoa escreveu para
    dizer do que se tratava, e nenhum recorte nosso é melhor que isso.
  */
  const assunto = mensagens.find((m) => m.assunto !== "")?.assunto ?? "";
  const primeiraDoCliente = doCliente[0] ?? mensagens[0];

  const title = assunto === "" ? primeiraLinha(primeiraDoCliente.texto) : primeiraLinha(assunto);

  if (title === "") return null;

  /*
    A última resposta do suporte é a solução mais provável, e "mais provável"
    é o que dá para afirmar: o campo de solução não existe na conversa. Quem
    revisa lê o fio inteiro ao lado, que veio junto.
  */
  const solution = doSuporte.at(-1)?.texto ?? "";

  const fechamento = text(raiz.closedAt).slice(0, 10);
  const criacao = text(raiz.createdAt).slice(0, 10);

  return {
    externalId,
    title,
    titleOrigin: assunto === "" ? "primeira-mensagem" : "assunto",
    solution,
    date: fechamento || criacao,
    messageCount: mensagens.length,
  };
}

/**
 * Os fios de uma página da listagem, já reduzidos ao que interessa.
 *
 * O carimbo da última mensagem vem junto porque é por ele que a próxima
 * varredura sabe se o fio andou. Sem ele, reexecutar releria tudo.
 */
export function threadsDaPagina(bruto: unknown): FioListado[] {
  return items(record(bruto).results)
    .map((fio) => record(fio))
    .map((fio) => ({
      id: text(fio.id).trim(),
      criadoEm: text(fio.createdAt),
      ...(text(fio.latestMessageTimestamp)
        ? { ultimaMensagemEm: text(fio.latestMessageTimestamp) }
        : {}),
    }))
    .filter((fio) => fio.id !== "");
}
