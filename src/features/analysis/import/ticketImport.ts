import type { Ticket } from "@/models/Ticket";
import { toIsoDate } from "@/lib/dates";
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
};

/** Sem assunto a linha não identifica atendimento nenhum. */
export const TICKET_REQUIRED: TicketField[] = ["title"];

/**
 * Correspondência exata, como na importação de artigos.
 *
 * "assunto" e "motivo do contato" são os nomes que a HubSpot usa; casar por
 * trecho faria "data de fechamento" e "data de criação" disputarem o mesmo
 * campo, e a que ganhasse contaminaria o arquivo inteiro.
 */
const KNOWN: Record<TicketField, string[]> = {
  title: ["assunto", "subject", "titulo", "title", "motivo do contato", "ticket name"],
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

    const ticket: Ticket = {
      id: existente?.id ?? jaNoPlano?.id ?? crypto.randomUUID(),
      projectId: existente?.projectId ?? options.projectId,
      title,
      solution,
      company: cell(row, mapping, "company"),
      date,
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
