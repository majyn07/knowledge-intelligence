"use client";

import { useCallback, useMemo } from "react";

import { useUrlState } from "@/hooks/useUrlState";
import { paginate } from "@/lib/pagination";
import type { Ticket } from "@/models/Ticket";

import {
  clienteDo,
  matchesTicket,
  produtosDoTicket,
  sortTickets,
  ticketStage,
  type TicketCycle,
  type TicketSort,
} from "../ticketTableView";
import {
  defaultTicketFilters,
  defaultTicketSort,
  readTicketRecorte,
  TICKET_URL_DEFAULTS,
  toTicketParams,
  type TicketFilters,
} from "../ticketUrlState";

/**
 * O recorte dos atendimentos: filtro, ordem, página, e tudo na URL.
 *
 * A lista antiga renderizava todos os atendimentos numa barra rolante. Isso
 * funcionava com três e vira o problema dos 1.800 cartões com mil, que é
 * exatamente para onde este lado vai quando o histórico do suporte entrar.
 *
 * O primeiro render devolve o padrão e a URL entra depois, num efeito, como
 * todo estado que só o navegador conhece: servidor e primeiro render do
 * cliente têm de produzir o mesmo HTML.
 */

/** Quantos por página. Alto o bastante para varrer, baixo para desenhar rápido. */
export const POR_PAGINA = 25;

export interface TicketRecorteResult {
  filters: TicketFilters;
  sort: TicketSort;
  /** Os atendimentos da página atual. */
  pagina: Ticket[];
  /** Todos os que passaram no filtro, para contar e exportar. */
  filtrados: Ticket[];
  page: number;
  pages: number;
  total: number;
  empresas: string[];
  clientes: string[];
  produtos: string[];
  setFilters: (proximo: TicketFilters) => void;
  setSort: (proximo: TicketSort) => void;
  setPage: (proxima: number) => void;
  limpar: () => void;
  temRecorte: boolean;
}

export function useTicketRecorte(tickets: Ticket[], ciclo: TicketCycle): TicketRecorteResult {
  const [params, escrever] = useUrlState(TICKET_URL_DEFAULTS);

  /*
    Empresa aqui não é cadastro, é o que veio escrito no arquivo. A lista sai
    dos atendimentos de agora, então uma que sumiu da base some do filtro em
    vez de continuar oferecida.
  */
  const empresas = useMemo(() => {
    const nomes = new Set<string>();

    for (const ticket of tickets) {
      const nome = ticket.company.trim();
      if (nome !== "") nomes.add(nome);
    }

    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tickets]);

  /*
    Cliente sai do registro cru, pelo mesmo motivo da empresa: não é cadastro, é
    quem apareceu nos atendimentos que estão aqui.
  */
  const clientes = useMemo(() => {
    const nomes = new Set<string>();

    for (const ticket of tickets) {
      const nome = clienteDo(ticket).trim();
      if (nome !== "") nomes.add(nome);
    }

    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tickets]);

  /*
    Produto é **deduzido** do que o cliente escreveu, e por isso a lista sai do
    mesmo lugar que a tela do atendimento usa: duas deduções do mesmo texto
    divergem, e a divergência apareceria como o filtro escondendo um
    atendimento que a tela de detalhe marca como Builder.
  */
  const produtos = useMemo(() => {
    const nomes = new Set<string>();

    for (const ticket of tickets) {
      for (const produto of produtosDoTicket(ticket)) nomes.add(produto);
    }

    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tickets]);

  const recorte = useMemo(
    () => readTicketRecorte(params, empresas, Number.MAX_SAFE_INTEGER, clientes, produtos),
    [clientes, empresas, params, produtos]
  );

  const filtrados = useMemo(() => {
    const { filters } = recorte;

    const passou = tickets.filter((ticket) => {
      if (filters.stage !== "all" && ticketStage(ticket, ciclo) !== filters.stage) return false;
      if (filters.company !== "all" && ticket.company.trim() !== filters.company) return false;
      if (filters.client !== "all" && clienteDo(ticket).trim() !== filters.client) return false;

      if (filters.product !== "all" && !produtosDoTicket(ticket).includes(filters.product)) {
        return false;
      }

      return matchesTicket(ticket, filters.search);
    });

    return sortTickets(passou, recorte.sort);
  }, [ciclo, recorte, tickets]);

  const page = paginate(filtrados, recorte.page, POR_PAGINA);

  const escreverRecorte = useCallback(
    (filters: TicketFilters, sort: TicketSort, pagina: number) => {
      escrever(toTicketParams(filters, sort, pagina));
    },
    [escrever]
  );

  return {
    filters: recorte.filters,
    sort: recorte.sort,
    pagina: page.items,
    filtrados,
    page: page.page,
    pages: page.pages,
    total: page.total,
    empresas,
    clientes,
    produtos,

    /* Mudar o filtro volta para a primeira página: a sétima pode não existir mais. */
    setFilters: (proximo) => escreverRecorte(proximo, recorte.sort, 1),
    setSort: (proximo) => escreverRecorte(recorte.filters, proximo, 1),
    setPage: (proxima) => escreverRecorte(recorte.filters, recorte.sort, proxima),
    limpar: () => escreverRecorte(defaultTicketFilters, defaultTicketSort, 1),

    temRecorte:
      recorte.filters.search.trim() !== "" ||
      recorte.filters.stage !== "all" ||
      recorte.filters.company !== "all",
  };
}
