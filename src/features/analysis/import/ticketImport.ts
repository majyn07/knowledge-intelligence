import type { Ticket } from "@/models/Ticket";
import { toIsoDate } from "@/lib/dates";
import {
  TICKET_CLASSIFICATION_FIELDS,
  TICKET_CLASSIFICATIONS,
  type TicketClassificationField,
} from "@/models/TicketClassification";
import type { DelimitedTable } from "@/lib/delimited";

/**
 * Atendimentos por arquivo.
 *
 * O atendimento é a entrada do ciclo e era digitado à mão, um a um. A HubSpot
 * exporta CSV, e o leitor já existe: o que faltava era o vocabulário do
 * atendimento e a regra de o que fazer com cada linha.
 *
 * As mesmas duas regras da importação de artigos, e pelos mesmos motivos:
 * reconhecimento **exato** do cabeçalho, deixando em branco o que não bate; e o
 * plano calculado antes de gravar, com o número na frente de quem confirma.
 */

export const TICKET_FIELDS = [
  "title",
  "solution",
  "company",
  "date",
  ...TICKET_CLASSIFICATION_FIELDS,
  "externalId",
] as const;

export type TicketField = (typeof TICKET_FIELDS)[number];

export type TicketMapping = Record<TicketField, number | null>;

export const ticketFieldLabel: Record<TicketField, string> = {
  title: "Assunto",
  solution: "Solução",
  company: "Empresa",
  date: "Data do atendimento",
  externalId: "Identificador na HubSpot",
  ...Object.fromEntries(TICKET_CLASSIFICATIONS.map((item) => [item.key, item.label])),
} as Record<TicketField, string>;

/** Sem assunto a linha não identifica atendimento nenhum. */
export const TICKET_REQUIRED: TicketField[] = ["title"];

/**
 * Correspondência exata, como na importação de artigos.
 *
 * Casar por trecho faria "data de fechamento" e "data de criação" disputarem o
 * mesmo campo, e a que ganhasse contaminaria o arquivo inteiro.
 *
 * "Motivo do contato" saiu de `title` e virou campo próprio. Ele estava ali de
 * quando o assunto era a única coisa que descrevia o atendimento, e mapeá-lo
 * para o assunto agora apagaria a classificação no mesmo movimento em que ela
 * chega: a coluna existe justamente para responder outra pergunta.
 */
const KNOWN: Record<TicketField, string[]> = {
  title: ["assunto", "subject", "titulo", "title", "ticket name"],
  solution: ["solucao", "solution", "resolucao", "resposta", "descricao", "description"],
  company: ["empresa", "company", "cliente", "conta", "associated company"],
  date: [
    "data",
    "date",
    "data do atendimento",
    "data de criacao",
    "create date",
    "created at",
  ],
  /*
    Os cabeçalhos da classificação saem do registro em `TicketClassification`,
    e não de uma segunda cópia aqui: a importação, a contagem e a tela precisam
    concordar sobre quais campos existem. Duas listas do mesmo vocabulário
    divergem, e a divergência apareceria como a tela oferecendo uma lista que a
    importação nunca preenche.
  */
  ...(Object.fromEntries(
    TICKET_CLASSIFICATIONS.map((item) => [item.key, item.headers])
  ) as Record<TicketClassificationField, string[]>),
  externalId: ["id", "ticket id", "record id", "id do ticket", "identificador"],
};

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function emptyTicketMapping(): TicketMapping {
  return Object.fromEntries(TICKET_FIELDS.map((field) => [field, null])) as TicketMapping;
}

export function guessTicketMapping(headers: string[]): TicketMapping {
  const mapping = emptyTicketMapping();
  const usadas = new Set<number>();
  const normalizados = headers.map(normalizeHeader);

  for (const field of TICKET_FIELDS) {
    const indice = normalizados.findIndex(
      (header, i) => !usadas.has(i) && KNOWN[field].includes(header)
    );

    if (indice >= 0) {
      mapping[field] = indice;
      usadas.add(indice);
    }
  }

  return mapping;
}

export function ticketMappingIsComplete(mapping: TicketMapping): boolean {
  return TICKET_REQUIRED.every((field) => mapping[field] !== null);
}

export interface TicketImportPlan {
  create: Ticket[];
  update: Ticket[];
  /** Linhas sem assunto. */
  skippedNoTitle: number;
  /** Repetidas dentro do próprio arquivo, casadas pelo identificador. */
  duplicatedInFile: number;
  /** Quantos entram sem data legível, ficam fora de toda janela de painel. */
  unreadableDate: number;
  /** Quantos ainda não têm solução registrada. */
  withoutSolution: number;
  unusedColumns: string[];
}

export interface TicketImportOptions {
  /** A iniciativa que este lote alimenta. Diferente do artigo, aqui faz sentido. */
  projectId: string;
  now: Date;
}

function cell(row: string[], mapping: TicketMapping, field: TicketField): string {
  const index = mapping[field];
  if (index === null) return "";

  return (row[index] ?? "").trim();
}

export function buildTicketImportPlan(
  table: DelimitedTable,
  mapping: TicketMapping,
  existing: Ticket[],
  options: TicketImportOptions
): TicketImportPlan {
  const porExterno = new Map<string, Ticket>();

  for (const ticket of existing) {
    if (ticket.source?.externalId) porExterno.set(ticket.source.externalId, ticket);
  }

  const create: Ticket[] = [];
  const update: Ticket[] = [];

  const plan: TicketImportPlan = {
    create,
    update,
    skippedNoTitle: 0,
    duplicatedInFile: 0,
    unreadableDate: 0,
    withoutSolution: 0,
    unusedColumns: [],
  };

  const usadas = new Set(
    Object.values(mapping).filter((index): index is number => index !== null)
  );

  plan.unusedColumns = table.headers.filter((_, index) => !usadas.has(index));

  const noPlano = new Map<string, Ticket>();
  const importedAt = options.now.toISOString();

  for (const row of table.rows) {
    const title = cell(row, mapping, "title");

    if (title === "") {
      plan.skippedNoTitle += 1;
      continue;
    }

    const externalId = cell(row, mapping, "externalId");
    const solution = cell(row, mapping, "solution");

    /*
      A data é dia de calendário, e `toIsoDate` recusa o que não dá para situar
      no tempo. Chutar produziria atendimento contado no mês errado: o painel
      já teve esse defeito uma vez.
    */
    const bruta = cell(row, mapping, "date");
    const date = toIsoDate(bruta);

    if (bruta !== "" && date === "") plan.unreadableDate += 1;
    if (solution === "") plan.withoutSolution += 1;

    const existente = externalId ? porExterno.get(externalId) : undefined;
    const jaNoPlano = externalId ? noPlano.get(externalId) : undefined;

    /*
      A reimportação **atualiza**, e o que o arquivo não traz é preservado.

      Antes o atendimento era reconstruído do zero, e isso ficou perigoso no dia
      em que ele passou a chegar por dois caminhos: os 1.025 que vieram pela
      conversa carregam `raw`, e é de lá que saem o nome do cliente e o número
      do chamado que a lista mostra. Importar o relatório do suporte só para
      somar a classificação teria apagado os dois, em silêncio, em mil linhas.

      Coluna mapeada manda, inclusive vazia: se o relatório diz que o campo está
      em branco, isso é informação. Coluna que não foi mapeada não opina.
      Qual é qual está na tela de mapeamento, antes do clique.
    */
    const trazido = (campo: TicketField, valor: string, anterior: string) =>
      mapping[campo] === null ? anterior : valor;

    const ticket: Ticket = {
      ...existente,
      id: existente?.id ?? jaNoPlano?.id ?? crypto.randomUUID(),
      projectId: existente?.projectId ?? options.projectId,
      title,
      solution: trazido("solution", solution, existente?.solution ?? ""),
      company: trazido("company", cell(row, mapping, "company"), existente?.company ?? ""),
      ...(Object.fromEntries(
        TICKET_CLASSIFICATION_FIELDS.map((campo) => [
          campo,
          trazido(campo, cell(row, mapping, campo), existente?.[campo] ?? ""),
        ])
      ) as Record<TicketClassificationField, string>),
      date: trazido("date", date, existente?.date ?? ""),
      ...(externalId
        ? { source: { provider: "hubspot" as const, externalId, importedAt } }
        : {}),
    };

    if (jaNoPlano) {
      plan.duplicatedInFile += 1;

      const lista = existente ? update : create;
      const posicao = lista.findIndex((item) => item.id === jaNoPlano.id);
      if (posicao >= 0) lista[posicao] = ticket;

      noPlano.set(externalId, ticket);
      continue;
    }

    if (existente) update.push(ticket);
    else create.push(ticket);

    if (externalId) noPlano.set(externalId, ticket);
  }

  return plan;
}
