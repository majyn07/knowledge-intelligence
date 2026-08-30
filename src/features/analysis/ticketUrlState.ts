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

export const TICKET_SORTS: TicketSort[] = [
  "atividade",
  "recentes",
  "antigos",
  "assunto",
  "empresa",
  "cliente",
];

export const TICKET_URL_DEFAULTS: ParamValues = {
  busca: "",
  etapa: "all",
  empresa: "all",
  cliente: "all",
  produto: "all",
  ordem: "atividade",
  pagina: "1",
};

export interface TicketFilters {
  search: string;
  stage: TicketStageFilter;
  company: string;
  /** Quem abriu. Com mil na lista, é por aqui que a equipe procura. */
  client: string;
  /**
   * O produto que o cliente citou: Builder, Eberick, Visus.
   *
   * É **derivado** do texto, e não campo do registro: a classificação que o
   * suporte faz na HubSpot está atrás do escopo `tickets`, que a credencial não
   * alcança. A tela diz que foi deduzido, para ninguém tratar como o que o
   * atendente escolheu.
   */
  product: string;
}

export const defaultTicketFilters: TicketFilters = {
  search: "",
  stage: "all",
  company: "all",
  client: "all",
  product: "all",
};

/**
 * A fila abre pela atividade, e não pela data do atendimento.
 *
 * É a ordem de um help desk: um chamado aberto na semana passada e respondido
 * hoje é trabalho de hoje. A data do atendimento diz quando ele nasceu, que é
 * outra pergunta, e continua ali como opção.
 */
export const defaultTicketSort: TicketSort = "atividade";

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
    cliente: filters.client,
    produto: filters.product,
    ordem: sort,
    pagina: String(page),
  };
}

/**
 * Lê o recorte, conferindo tudo contra o que existe hoje.
 *
 * A empresa, o cliente e o produto são conferidos contra o que aparece nos
 * atendimentos de **agora**, e não contra um cadastro: nenhum dos três é
 * entidade aqui. Empresa e cliente vêm do que a HubSpot devolveu, e produto é
 * deduzido do texto. Um valor que sumiu da base volta para "todos", em vez de
 * filtrar por um nome que ninguém mais tem e mostrar tela vazia com cara de
 * fila vazia.
 */
export function readTicketRecorte(
  params: ParamValues,
  empresas: string[],
  totalPages: number,
  clientes: string[] = [],
  produtos: string[] = []
): TicketRecorte {
  return {
    filters: {
      search: params.busca ?? "",
      stage: oneOf(params.etapa, TICKET_STAGE_FILTERS, "all"),
      company: oneOf(params.empresa, ["all", ...empresas], "all"),
      client: oneOf(params.cliente, ["all", ...clientes], "all"),
      product: oneOf(params.produto, ["all", ...produtos], "all"),
    },
    sort: oneOf(params.ordem, TICKET_SORTS, defaultTicketSort),
    page: pageNumber(params.pagina, totalPages),
  };
}
