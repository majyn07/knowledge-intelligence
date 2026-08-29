"use client";

import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";
import type { ConversaListada } from "@/services/hubspot/helpDeskSchedule";

/**
 * A varredura da caixa do suporte, sem tela.
 *
 * Ela vivia dentro do diálogo, entrelaçada com `setState`. Enquanto a busca era
 * só um botão isso bastava; com a busca automática passou a haver **dois**
 * chamadores, e duas cópias da mesma varredura divergem, como divergiram as
 * três listas de palavras comuns deste produto.
 *
 * Aqui não há React: entram os parâmetros, sai o resultado, e o progresso volta
 * por função. Quem tem tela passa `setState`; quem não tem passa nada.
 */

/** Quantas conversas por lote de leitura. O servidor recusa acima disso. */
export const POR_LOTE = 20;

export interface Trazido {
  ticket: Ticket;
  conversation: SupportConversation;
}

/** Um pedido à nossa rota, com o erro do servidor chegando como erro. */
async function pedir(url: string, corpo?: unknown): Promise<Record<string, unknown>> {
  const resposta = await fetch(url, {
    method: corpo ? "POST" : "GET",
    ...(corpo
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }
      : {}),
  });

  const dados: unknown = await resposta.json();

  if (!resposta.ok) {
    const mensagem =
      typeof dados === "object" && dados !== null && "message" in dados
        ? String((dados as { message: unknown }).message)
        : "Não foi possível falar com a HubSpot.";

    throw new Error(mensagem);
  }

  return dados as Record<string, unknown>;
}

/** As caixas declaradas no ambiente. Varrer sem saber quais existem é às cegas. */
export async function caixasDoSuporte(): Promise<string[]> {
  const inicio = await pedir("/api/hubspot/help-desk");

  return (inicio.caixas as string[]) ?? [];
}

/**
 * Primeira passada: lista o que existe nas caixas dentro da janela.
 *
 * A janela vai para o servidor, e é o que torna isto viável. A caixa do suporte
 * tem mais de setenta mil conversas e a lista sai do mais antigo: alcançar o mês
 * corrente sem filtrar custaria mais de mil requisições. Com a janela, três
 * meses são 110 páginas.
 */
export async function listarConversas({
  caixas,
  desde,
  aoProgredir,
  parou,
}: {
  caixas: string[];
  desde: string;
  aoProgredir?: (quantas: number) => void;
  parou?: () => boolean;
}): Promise<ConversaListada[]> {
  const conversas: ConversaListada[] = [];

  for (const caixa of caixas) {
    let cursor: string | undefined;

    do {
      if (parou?.()) break;

      const query = new URLSearchParams({ caixa, desde });
      if (cursor) query.set("apos", cursor);

      const pagina = await pedir(`/api/hubspot/help-desk?${query}`);

      conversas.push(...((pagina.conversas as ConversaListada[]) ?? []));
      cursor = (pagina.proxima as string | null) ?? undefined;

      aoProgredir?.(conversas.length);
    } while (cursor);
  }

  return conversas;
}

export interface ResultadoDaLeitura {
  trazidos: Trazido[];
  lidos: number;
  falhas: number;
  /*
    Por que as conversas que não viraram atendimento ficaram de fora. A tela
    dizia só "0 viraram atendimento", e zero sem motivo é indistinguível de
    defeito.
  */
  descartados: { semChamado: number; semResposta: number; semAssunto: number };
}

/**
 * Segunda passada: lê as conversas do plano, em lotes.
 *
 * Lote que falha não derruba o que já veio: depois de vinte pedidos bem
 * sucedidos, perder tudo por causa do vigésimo primeiro seria jogar fora
 * trabalho pronto. Quem chama recebe o que deu certo junto com o erro.
 */
export async function lerConversas({
  visitar,
  projectId,
  aoProgredir,
  aoLote,
  parou,
}: {
  visitar: ConversaListada[];
  projectId: string;
  aoProgredir?: (parcial: ResultadoDaLeitura) => void;
  /** Chamado a cada lote. É onde a tranca dá sinal de vida. */
  aoLote?: () => void;
  parou?: () => boolean;
}): Promise<ResultadoDaLeitura> {
  const trazidos: Trazido[] = [];
  let lidos = 0;
  let falhas = 0;
  const descartados = { semChamado: 0, semResposta: 0, semAssunto: 0 };

  for (let inicio = 0; inicio < visitar.length; inicio += POR_LOTE) {
    if (parou?.()) break;

    const lote = visitar.slice(inicio, inicio + POR_LOTE);
    const resposta = await pedir("/api/hubspot/help-desk", { conversas: lote });

    aoLote?.();

    const atendimentos = (resposta.atendimentos as Record<string, never>[]) ?? [];
    falhas += Number(resposta.falhas ?? 0);

    const motivos = (resposta.descartados ?? {}) as Record<string, unknown>;

    for (const chave of ["semChamado", "semResposta", "semAssunto"] as const) {
      descartados[chave] += Number(motivos[chave] ?? 0);
    }
    lidos += lote.length;

    for (const bruto of atendimentos) {
      const dados = bruto as unknown as {
        ticket: { externalId: string; title: string; solution: string; date: string };
        messages: SupportConversation["messages"];
        contato?: { nome: string; empresa: string };
        raw: Record<string, unknown>;
      };

      const id = `hs-${dados.ticket.externalId}`;

      trazidos.push({
        ticket: {
          id,
          projectId,
          title: dados.ticket.title,
          solution: dados.ticket.solution,
          /*
            A empresa vem do contato associado. É dado pessoal, e entrou por
            pedido explícito de quem conduz o projeto: sem ela não dá para
            reencontrar o atendimento na HubSpot, que é o que a equipe faz.
          */
          company: dados.contato?.empresa ?? "",
          /*
            Vazias, e não é omissão: a causa e o motivo de contato vivem em
            propriedades do ticket, e o escopo `tickets` não está na credencial.
            Elas entram pelo relatório exportado do suporte, que é a mesma porta
            por onde o atendimento já entra por arquivo.
          */
          causa: "",
          motivoDeContato: "",
          date: dados.ticket.date,
          source: {
            provider: "hubspot",
            externalId: dados.ticket.externalId,
            importedAt: new Date().toISOString(),
          },
          raw: dados.raw,
        },
        conversation: {
          id: `conv-${dados.ticket.externalId}`,
          ticketId: id,
          messages: dados.messages,
          source: {
            provider: "hubspot",
            externalId: dados.ticket.externalId,
            importedAt: new Date().toISOString(),
          },
        },
      });
    }

    aoProgredir?.({ trazidos, lidos, falhas, descartados });
  }

  return { trazidos, lidos, falhas, descartados };
}
