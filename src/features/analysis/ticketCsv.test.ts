import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";
import { emptyClassification } from "@/models/TicketClassification";

import { ticketsToCsv } from "./ticketCsv";
import type { TicketCycle } from "./ticketTableView";

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: "tic-1",
  projectId: "p1",
  title: "Flecha em viga",
  solution: "Ajustada a inércia.",
  company: "Construtora Alfa",
  ...emptyClassification(),
  date: "2026-08-14",
  ...extra,
});

const vazio: TicketCycle = { analisados: new Set(), comArtigo: new Set() };

describe("ticketsToCsv", () => {
  it("põe o rótulo da coluna no cabeçalho", () => {
    const csv = ticketsToCsv([], ["title", "company"], vazio);

    expect(csv).toContain("Assunto;Empresa");
  });

  it("exporta o mesmo valor que a lista mostra", () => {
    const csv = ticketsToCsv([atendimento()], ["title", "date", "stage"], vazio);

    expect(csv).toContain("Flecha em viga;14/08/2026;A analisar");
  });

  /* O ponto e vírgula do texto quebraria a coluna sem as aspas. */
  it("protege o campo que tem o separador dentro", () => {
    const csv = ticketsToCsv(
      [atendimento({ title: "Erro; depois trava" })],
      ["title"],
      vazio
    );

    expect(csv).toContain('"Erro; depois trava"');
  });

  it("dobra a aspas que está dentro do texto", () => {
    const csv = ticketsToCsv([atendimento({ title: 'Erro "grave"' })], ["title"], vazio);

    expect(csv).toContain('"Erro ""grave"""');
  });

  it("protege a quebra de linha dentro da solução", () => {
    const csv = ticketsToCsv(
      [atendimento({ solution: "Primeiro passo\nSegundo passo" })],
      ["solution"],
      vazio
    );

    expect(csv).toContain('"Primeiro passo\nSegundo passo"');
  });

  /* Sem o BOM o Excel em pt-BR lê como ANSI e "Elétrica" chega quebrado. */
  it("começa com o BOM que o Excel espera", () => {
    expect(ticketsToCsv([], ["title"], vazio).startsWith("﻿")).toBe(true);
  });

  it("exporta só as colunas escolhidas, na ordem escolhida", () => {
    const csv = ticketsToCsv([atendimento()], ["company", "title"], vazio);

    expect(csv).toContain("Empresa;Assunto");
    expect(csv).toContain("Construtora Alfa;Flecha em viga");
  });
});
