import { oneOf, pageNumber, type ParamValues } from "@/lib/urlState";

import { ticketStageLabel, type TicketSort, type TicketStage } from "./ticketTableView";

/**
 * O recorte dos atendimentos, traduzido de e para a URL.
 *
 * Mesma razão da Biblioteca: com mil registros, apontar para "os resolvidos
 * que ninguém leu" precisa de um endereço, porque é isso que se cola no chat
 * da equipe. Antes disso a tela do atendimento não guardava nem a busca.
 *
 * A parte que erra é **valor vindo de fora**: link colado envelhece, e filtrar
 * por algo que não existe mais mostra tela vazia com cara de fila vazia, sem
 * quem abriu ter como saber que o problema é o link.
 */

export type TicketStageFilter = TicketStage | "all";

export const TICKET_STAGE_FILTERS: TicketStageFilter[] = [
  "all",
  "a-analisar",
  "analisado",
  "publicado",
  "sem-solucao",
];

export const ticketStageFilterLabel: Record<TicketStageFilter, string> = {
  all: "Todos",
  ...ticketStageLabel,
};

export const TICKET_SORTS: TicketSort[] = ["recentes", "antigos", "assunto", "empresa"];

export const TICKET_URL_DEFAULTS: ParamValues = {
  busca: "",
  etapa: "all",
  empresa: "all",
  ordem: "recentes",
  pagina: "1",
};

export interface TicketFilters {
  search: string;
  stage: TicketStageFilter;
  company: string;
}

export const defaultTicketFilters: TicketFilters = {
  search: "",
  stage: "all",
  company: "all",
};

export const defaultTicketSort: TicketSort = "recentes";

export interface TicketRecorte {
  filters: TicketFilters;
  sort: TicketSort;
  page: number;
}

export function toTicketParams(
  filters: TicketFilters,
  sort: TicketSort,
  page: number
): ParamValues {
  return {
    busca: filters.search.trim(),
    etapa: filters.stage,
    empresa: filters.company,
    ordem: sort,
    pagina: String(page),
  };
}

/**
 * Lê o recorte, conferindo tudo contra o que existe hoje.
 *
 * A empresa é conferida contra a lista de quem aparece nos atendimentos de
 * agora, e não contra um cadastro: empresa aqui não é entidade, é o que veio
 * escrito no arquivo. Uma que sumiu da base volta para "todas", em vez de
 * filtrar por um nome que ninguém mais tem.
 */
export function readTicketRecorte(
  params: ParamValues,
  empresas: string[],
  totalPages: number
): TicketRecorte {
  return {
    filters: {
      search: params.busca ?? "",
      stage: oneOf(params.etapa, TICKET_STAGE_FILTERS, "all"),
      company: oneOf(params.empresa, ["all", ...empresas], "all"),
    },
    sort: oneOf(params.ordem, TICKET_SORTS, defaultTicketSort),
    page: pageNumber(params.pagina, totalPages),
  };
}
