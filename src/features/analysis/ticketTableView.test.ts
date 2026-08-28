import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";

import {
  matchesTicket,
  sortTickets,
  ticketCellValue,
  ticketStage,
  type TicketCycle,
} from "./ticketTableView";

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: "tic-1",
  projectId: "p1",
  title: "Flecha excessiva em viga contínua",
  solution: "Ajustada a inércia fissurada.",
  company: "Construtora Alfa",
  date: "2026-08-14",
  ...extra,
});

const vazio: TicketCycle = { analisados: new Set(), comArtigo: new Set() };

describe("ticketStage", () => {
  it("sem solução ainda nem pode virar conhecimento", () => {
    expect(ticketStage(atendimento({ solution: "  " }), vazio)).toBe("sem-solucao");
  });

  it("resolvido e não lido entra na fila", () => {
    expect(ticketStage(atendimento(), vazio)).toBe("a-analisar");
  });

  it("analisado sai da fila", () => {
    const ciclo = { analisados: new Set(["tic-1"]), comArtigo: new Set<string>() };

    expect(ticketStage(atendimento(), ciclo)).toBe("analisado");
  });

  /* Virou artigo vence analisado: é o fim do ciclo, não o meio. */
  it("o artigo publicado vence a análise", () => {
    const ciclo = { analisados: new Set(["tic-1"]), comArtigo: new Set(["tic-1"]) };

    expect(ticketStage(atendimento(), ciclo)).toBe("publicado");
  });
});

describe("ticketCellValue", () => {
  it("mostra a data no formato de quem lê", () => {
    expect(ticketCellValue(atendimento(), "date", vazio)).toBe("14/08/2026");
  });

  it("deixa vazio o que não tem data", () => {
    expect(ticketCellValue(atendimento({ date: "" }), "date", vazio)).toBe("");
  });

  it("mostra o rótulo do estágio, não a chave", () => {
    expect(ticketCellValue(atendimento(), "stage", vazio)).toBe("A analisar");
  });
});

describe("sortTickets", () => {
  const a = atendimento({ id: "a", date: "2026-01-10", title: "Zebra", company: "Beta" });
  const b = atendimento({ id: "b", date: "2026-08-01", title: "Alfa", company: "Alfa" });
  const semData = atendimento({ id: "c", date: "", title: "Meio", company: "Gama" });

  it("mais recentes primeiro", () => {
    expect(sortTickets([a, b], "recentes").map((t) => t.id)).toEqual(["b", "a"]);
  });

  /*
    O que não dá para situar no tempo não é nem recente nem antigo, e no topo
    faria a lista abrir com o que menos se sabe.
  */
  it("data vazia vai para o fim nas duas ordens", () => {
    expect(sortTickets([semData, a, b], "recentes").at(-1)?.id).toBe("c");
    expect(sortTickets([semData, a, b], "antigos").at(-1)?.id).toBe("c");
  });

  it("por assunto e por empresa", () => {
    expect(sortTickets([a, b], "assunto").map((t) => t.id)).toEqual(["b", "a"]);
    expect(sortTickets([a, b], "empresa").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("não muda a lista recebida", () => {
    const lista = [a, b];
    sortTickets(lista, "assunto");

    expect(lista.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("matchesTicket", () => {
  it("acha sem acento", () => {
    expect(matchesTicket(atendimento(), "continua")).toBe(true);
  });

  /* Casa por termo: quem digita duas palavras espera as duas, em qualquer ordem. */
  it("exige todos os termos, em qualquer ordem", () => {
    expect(matchesTicket(atendimento(), "flecha viga")).toBe(true);
    expect(matchesTicket(atendimento(), "viga flecha")).toBe(true);
    expect(matchesTicket(atendimento(), "flecha laje")).toBe(false);
  });

  it("olha a solução e a empresa também", () => {
    expect(matchesTicket(atendimento(), "fissurada")).toBe(true);
    expect(matchesTicket(atendimento(), "construtora alfa")).toBe(true);
  });

  it("acha pelo número do chamado na HubSpot", () => {
    const t = atendimento({
      source: { provider: "hubspot", externalId: "47673917220", importedAt: "" },
    });

    expect(matchesTicket(t, "47673917220")).toBe(true);
  });

  /* Busca curta não tem termo, e ainda assim precisa funcionar. */
  it("cai para trecho quando a busca é curta demais para virar termo", () => {
    expect(matchesTicket(atendimento(), "vig")).toBe(true);
    expect(matchesTicket(atendimento(), "xyz")).toBe(false);
  });

  it("busca vazia não filtra nada", () => {
    expect(matchesTicket(atendimento(), "   ")).toBe(true);
  });
});
