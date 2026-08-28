import "server-only";

import { record, text } from "@/lib/shape";
import type { SupportConversationMessage } from "@/models/SupportConversation";

import { nextCursor, toConversationMessages, type HubSpotActor } from "./conversationMapping";
import type { FioListado } from "./helpDeskSchedule";
import { hubspot } from "./hubspotClient";
import { toOwnerTeams, type OwnerTeams } from "./ownerTeams";
import { produtosNoTexto } from "./produtoDoAtendimento";
import {
  chamadoDaAssociacao,
  threadsDaPagina,
  toThreadTicket,
  type ThreadTicket,
} from "./threadTicketMapping";

/**
 * A caixa do suporte, lida em pedaços.
 *
 * É a porta que não depende do escopo bloqueado: o objeto de ticket está
 * fechado, mas a conversa que o gerou não. E a conversa é o que o arquivo
 * exportado nunca traz.
 *
 * Cada função aqui faz **um** pedaço: uma página da listagem, um lote de
 * leitura. Quem conduz o laço é a tela, como na varredura do portal, e por
 * duas razões. A listagem inteira são umas 550 páginas, que estouraria o prazo
 * de uma requisição só; e quem começou uma varredura de minutos precisa poder
 * ver onde está e parar no meio.
 */

/**
 * As caixas de onde o atendimento vem.
 *
 * São duas, e isso foi medido: `Help Desk` recebe e-mail e chat, `Setup` recebe
 * WhatsApp e chat. As outras oito da conta são marketing, vendas, social e
 * teste, e o que cai nelas não é atendimento.
 *
 * Declarado em `HUBSPOT_INBOXES` em vez de fixo aqui, pela mesma razão do
 * provedor de IA: caixa é coisa que a empresa cria e renomeia, e ninguém vai
 * abrir o código para acompanhar.
 */
export const CAIXAS_PADRAO = [
  { id: "474522581", nome: "Help Desk" },
  { id: "1566897190", nome: "Caixa de Entrada | Setup" },
];

export function caixasConfiguradas(env: Record<string, string | undefined>): string[] {
  const declarado = (env.HUBSPOT_INBOXES ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

  return declarado.length > 0 ? declarado : CAIXAS_PADRAO.map((caixa) => caixa.id);
}

/** O teto da API. Pedir menos só aumentaria o número de idas. */
const POR_PAGINA = 100;

/**
 * Quantos fios um lote de leitura visita.
 *
 * Cada fio custa duas ou três requisições à HubSpot, então vinte por lote dá
 * uma requisição nossa de poucos segundos: curta o bastante para caber no
 * prazo, longa o bastante para o progresso não virar mil idas ao servidor.
 */
export const POR_LOTE = 20;

/**
 * Pausa entre requisições dentro do lote.
 *
 * É o CRM de produção da empresa do outro lado. Varrer a toda velocidade
 * encontra o limite de taxa e devolve erro no meio de uma leitura que já
 * custou minutos.
 */
const PAUSA_MS = 120;

const espera = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface PaginaDeFios {
  fios: FioListado[];
  /** O cursor da próxima página, ou `null` quando a caixa acabou. */
  proxima: string | null;
}

/**
 * Uma página da listagem de uma caixa, dentro da janela.
 *
 * A janela vai para o servidor, e essa é a diferença entre viável e inviável.
 * Sem ela a lista sai do mais antigo e não para: a caixa do suporte tem mais de
 * setenta mil fios, e depois de setecentas páginas a varredura ainda estava em
 * 2025. Alcançar o mês corrente custaria mais de mil requisições, toda vez.
 *
 * **Os dois parâmetros só funcionam juntos**, e isso não está óbvio em lugar
 * nenhum: `latestMessageTimestampAfter` sozinho é ignorado em silêncio, e
 * `sort=latestMessageTimestamp` sozinho devolve 400 dizendo que o outro
 * precisa estar presente. Foi a mensagem de erro que entregou a combinação.
 *
 * Medido: três meses da caixa do suporte são 10.978 fios em 110 páginas.
 */
export async function umaPaginaDeFios(
  inboxId: string,
  desde: string,
  cursor?: string
): Promise<PaginaDeFios> {
  const query = new URLSearchParams({
    limit: String(POR_PAGINA),
    inboxId,
    sort: "latestMessageTimestamp",
    latestMessageTimestampAfter: desde,
  });

  if (cursor) query.set("after", cursor);

  const pagina: unknown = await hubspot.get(`/conversations/v3/conversations/threads?${query}`);

  return { fios: threadsDaPagina(pagina), proxima: nextCursor(pagina) };
}

export interface AtendimentoDoFio {
  ticket: ThreadTicket;
  messages: SupportConversationMessage[];
  /** Quem abriu, e de qual empresa. Vazio quando o fio não tem contato ligado. */
  contato?: ContatoDoFio;
  /**
   * O identificador do chamado na HubSpot.
   *
   * Obrigatório: fio sem chamado associado não entra, porque não é atendimento.
   */
  ticketId: string;
  /** O registro cru, como a origem devolveu. */
  raw: Record<string, unknown>;
}

async function mensagensDoFio(threadId: string): Promise<unknown[]> {
  const query = new URLSearchParams({ limit: String(POR_PAGINA) });

  const pagina: unknown = await hubspot.get(
    `/conversations/v3/conversations/threads/${threadId}/messages?${query}`
  );

  const bruto = record(pagina).results;

  return Array.isArray(bruto) ? bruto : [];
}

/**
 * O chamado ligado ao fio.
 *
 * A leitura do objeto de ticket é 403, mas a **associação** não: ela devolve o
 * identificador, e é o que permite o registro daqui carregar o número real do
 * chamado. Falha em silêncio de propósito: sem o número o atendimento continua
 * válido, e derrubar a varredura por causa disso sairia caro demais.
 */
async function chamadoDoFio(threadId: string): Promise<string | undefined> {
  try {
    const resposta: unknown = await hubspot.get(
      `/crm/v4/objects/conversation/${threadId}/associations/ticket`
    );

    return chamadoDaAssociacao(resposta);
  } catch {
    return undefined;
  }
}

export interface ContatoDoFio {
  nome: string;
  empresa: string;
}

/**
 * Quem abriu o atendimento, e de qual empresa.
 *
 * Duas idas: a associação dá o identificador do contato, e a leitura dá os
 * campos. São dado pessoal de cliente, e por isso vieram por pedido explícito
 * de quem conduz o projeto: sem o nome não dá para reencontrar o atendimento na
 * HubSpot, que é o que a equipe faz o dia inteiro.
 *
 * Pede só nome e empresa. Telefone e e-mail existem no contato e não são
 * pedidos: eles não ajudam a reencontrar nada aqui, e dado que não serve não
 * entra.
 *
 * Falha em silêncio, como o chamado: sem contato o atendimento continua válido.
 */
async function contatoDoFio(threadId: string): Promise<ContatoDoFio | undefined> {
  try {
    const assoc: unknown = await hubspot.get(
      `/crm/v4/objects/conversation/${threadId}/associations/contact`
    );

    const id = chamadoDaAssociacao(assoc);
    if (!id) return undefined;

    const query = new URLSearchParams({ properties: "firstname,lastname,company" });
    const contato: unknown = await hubspot.get(`/crm/v3/objects/contacts/${id}?${query}`);
    const props = record(record(contato).properties);

    const nome = [text(props.firstname), text(props.lastname)]
      .map((parte) => parte.trim())
      .filter(Boolean)
      .join(" ");

    const empresa = text(props.company).trim();

    return nome === "" && empresa === "" ? undefined : { nome, empresa };
  } catch {
    return undefined;
  }
}

async function resolverAtores(brutas: unknown[]): Promise<Map<string, HubSpotActor>> {
  const ids = new Set<string>();

  for (const bruta of brutas) {
    const id = text(record(bruta).createdBy).trim();
    if (id !== "") ids.add(id);
  }

  if (ids.size === 0) return new Map();

  const resposta = await hubspot.post("/conversations/v3/conversations/actors/batch/read", {
    inputs: [...ids],
  });

  const atores = new Map<string, HubSpotActor>();
  const lista = record(resposta).results;

  for (const bruto of Array.isArray(lista) ? lista : []) {
    const id = text(record(bruto).id).trim();

    if (id !== "") {
      atores.set(id, {
        id,
        name: text(record(bruto).name),
        type: text(record(bruto).type),
      } as HubSpotActor);
    }
  }

  return atores;
}

/**
 * Lê um lote de fios, um por vez.
 *
 * Em série dentro do lote: são dezenas de milhares de fios do outro lado, e o
 * limite de taxa chegaria no primeiro lote paralelo.
 *
 * O que falha não derruba o que já veio. Quem começou uma varredura de mil não
 * pode perder tudo por causa do fio setecentos, e a contagem de falhas volta
 * para a tela dizer quantos ficaram para trás.
 */
export async function lerLote(
  fios: FioListado[]
): Promise<{ atendimentos: AtendimentoDoFio[]; falhas: number }> {
  const atendimentos: AtendimentoDoFio[] = [];
  let falhas = 0;

  for (const fio of fios) {
    try {
      const brutas = await mensagensDoFio(fio.id);

      /*
        Os atores vêm antes do mapeamento, e não depois: é por eles que se
        distingue o agente do robô de triagem, e a solução sai da última fala
        de gente do suporte.
      */
      const [atores, ticketId, contato] = await Promise.all([
        resolverAtores(brutas),
        chamadoDoFio(fio.id),
        contatoDoFio(fio.id),
      ]);

      const ticket = toThreadTicket({ id: fio.id, createdAt: fio.criadoEm }, brutas, atores);

      /*
        Duas condições, e as duas vieram de errar antes.
        
        **Chamado associado.** Se o CRM não gerou ticket, não era um chamado:
        disparo de marketing e fluxo de página não viram atendimento.
        
        **E alguém do suporte falou.** Só a associação não basta, e isso foi
        medido: o fluxo de consentimento do WhatsApp ("Estou ciente e desejo
        continuar") gera ticket igual, e numa busca de trinta ele era a maioria.
        O que ele não tem é resposta de gente.
        
        A regra já existia no produto, do outro lado: atendimento sem solução não
        entra na fila de triagem, porque escrever exige saber a resposta. Aqui
        ela entra antes, na porta: sem resposta do suporte não há o que analisar,
        e trazer esses registros só afogaria os que têm.
      */
      if (ticket && ticketId && ticket.solution.trim() !== "") {

        atendimentos.push({
          ticket,
          messages: toConversationMessages(brutas, atores),
          ticketId,
          ...(contato ? { contato } : {}),
          /*
            O registro cru guarda o que o nosso modelo não tem onde pôr, e é o
            que a análise lê inteiro. Não é normalizado: conferir a forma seria
            decidir de antemão o que a origem pode ter.
          */
          raw: {
            threadId: fio.id,
            criadoEm: fio.criadoEm,
            ...(fio.ultimaMensagemEm ? { ultimaMensagemEm: fio.ultimaMensagemEm } : {}),
            hubspotTicketId: ticketId,
            origemDoTitulo: ticket.titleOrigin,
            mensagens: ticket.messageCount,
            ...(contato ? { contato } : {}),
            /*
              Quais soluções da AltoQi o atendimento trata. "Solução" aqui é o
              produto, que é como a empresa fala, e não a resposta que o suporte
              deu. Sai do título porque `ia_produto` está atrás do 403; o que o
              título não disser fica vazio.
            */
            produtos: produtosNoTexto(
              [
                ticket.title,
                ...toConversationMessages(brutas, atores)
                  .filter((mensagem) => mensagem.role === "cliente")
                  .map((mensagem) => mensagem.body),
              ].join(" ")
            ),
          },
        });
      }
    } catch {
      falhas += 1;
    }

    await espera(PAUSA_MS);
  }

  return { atendimentos, falhas };
}

/**
 * Os donos e suas equipes, numa passada por varredura.
 *
 * Resolve o vínculo e-mail → equipe uma vez, e não uma vez por fio. Vale
 * lembrar o que a medição mostrou: as seis equipes de Suporte da conta têm as
 * mesmas dezoito pessoas, então isso distingue Setup de Suporte e não diz de
 * qual produto o atendimento é.
 */
export async function donosComEquipe(): Promise<OwnerTeams[]> {
  const donos: OwnerTeams[] = [];
  let cursor: string | null = null;
  let voltas = 0;

  do {
    const query = new URLSearchParams({ limit: String(POR_PAGINA) });
    if (cursor) query.set("after", cursor);

    const pagina: unknown = await hubspot.get(`/crm/v3/owners?${query}`);

    donos.push(...toOwnerTeams(pagina));
    cursor = nextCursor(pagina);
    voltas += 1;

    if (cursor) await espera(PAUSA_MS);
  } while (cursor && voltas < 20);

  return donos;
}
