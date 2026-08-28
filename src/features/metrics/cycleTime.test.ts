import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

import { cycleTime } from "./cycleTime";

let sequencia = 0;

const atendimento = (id: string, date: string): Ticket => ({
  id,
  projectId: "p1",
  title: `Atendimento ${id}`,
  solution: "Resolvido.",
  company: "Construtora",
  date,
});

const artigo = (id: string, ticketId: string): KnowledgeArticle => ({
  id,
  title: `Artigo ${id}`,
  summary: "",
  content: "",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-1",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "markdown",
  source: {
    projectId: "p1",
    ticketId,
    analysisId: "",
    opportunityId: "",
    planId: "",
  },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
});

const publicacao = (articleId: string, at: string): ActivityEvent => ({
  id: `ev-${(sequencia += 1)}`,
  type: "article_status_changed",
  projectId: "",
  at,
  actor: "Alguém",
  subject: { kind: "article", id: articleId, label: "Artigo" },
  detail: "",
  transition: { from: "review", to: "published" },
});

describe("cycleTime", () => {
  it("mede do dia do atendimento até a publicação", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1")],
      [atendimento("t1", "2026-08-01")],
      [publicacao("a1", "2026-08-11T12:00:00.000Z")]
    );

    expect(resultado.measured).toBe(1);
    expect(resultado.averageDays).toBeGreaterThan(9);
    expect(resultado.averageDays).toBeLessThan(11);
  });

  /*
    Um artigo recolhido e publicado de novo fechou o ciclo na primeira vez. A
    segunda é manutenção, e contá-la faria uma correção de vírgula parecer
    atraso de meses.
  */
  it("conta a primeira publicação, e não a última", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1")],
      [atendimento("t1", "2026-08-01")],
      [
        publicacao("a1", "2026-12-20T12:00:00.000Z"),
        publicacao("a1", "2026-08-11T12:00:00.000Z"),
      ]
    );

    expect(resultado.averageDays).toBeLessThan(11);
  });

  /*
    A média mente aqui: um artigo antigo publicado hoje sozinho a leva para
    centenas de dias, e quem lê conclui que o ciclo é lento.
  */
  it("traz a mediana ao lado da média", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1"), artigo("a2", "t2"), artigo("a3", "t3")],
      [
        atendimento("t1", "2026-08-01"),
        atendimento("t2", "2026-08-01"),
        atendimento("t3", "2024-01-01"),
      ],
      [
        publicacao("a1", "2026-08-03T12:00:00.000Z"),
        publicacao("a2", "2026-08-04T12:00:00.000Z"),
        publicacao("a3", "2026-08-05T12:00:00.000Z"),
      ]
    );

    expect(resultado.medianDays).toBeLessThan(10);
    expect(resultado.averageDays).toBeGreaterThan(200);
  });

  it("ignora artigo que não nasceu de atendimento", () => {
    const semOrigem = { ...artigo("a1", "t1"), source: undefined };

    const resultado = cycleTime(
      [semOrigem],
      [atendimento("t1", "2026-08-01")],
      [publicacao("a1", "2026-08-11T12:00:00.000Z")]
    );

    expect(resultado.measured).toBe(0);
    expect(resultado.ignored.semAtendimento).toBe(0);
  });

  it("ignora artigo que ainda não foi publicado", () => {
    const resultado = cycleTime([artigo("a1", "t1")], [atendimento("t1", "2026-08-01")], []);

    expect(resultado.measured).toBe(0);
  });

  /* Ressalva, não silêncio. */
  it("conta separadamente o atendimento que não está mais aqui", () => {
    const resultado = cycleTime(
      [artigo("a1", "sumiu")],
      [],
      [publicacao("a1", "2026-08-11T12:00:00.000Z")]
    );

    expect(resultado.ignored.semAtendimento).toBe(1);
    expect(resultado.measured).toBe(0);
  });

  it("conta separadamente a data que não dá para situar no tempo", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1")],
      [atendimento("t1", "ontem")],
      [publicacao("a1", "2026-08-11T12:00:00.000Z")]
    );

    expect(resultado.ignored.semDataUtil).toBe(1);
  });

  /* Publicado antes de o cliente perguntar: alguém corrigiu uma das duas datas. */
  it("conta separadamente a ordem impossível", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1")],
      [atendimento("t1", "2026-08-20")],
      [publicacao("a1", "2026-08-01T12:00:00.000Z")]
    );

    expect(resultado.ignored.ordemImpossivel).toBe(1);
    expect(resultado.measured).toBe(0);
  });

  /* Média de nada é nada, não zero: zero diria "publica no mesmo dia". */
  it("devolve nulo quando nada fechou o ciclo", () => {
    const resultado = cycleTime([], [], []);

    expect(resultado.averageDays).toBeNull();
    expect(resultado.medianDays).toBeNull();
  });

  it("lista os mais demorados primeiro", () => {
    const resultado = cycleTime(
      [artigo("rapido", "t1"), artigo("lento", "t2")],
      [atendimento("t1", "2026-08-01"), atendimento("t2", "2026-01-01")],
      [
        publicacao("rapido", "2026-08-03T12:00:00.000Z"),
        publicacao("lento", "2026-08-03T12:00:00.000Z"),
      ]
    );

    expect(resultado.slowest[0].articleId).toBe("lento");
  });

  /* A data do atendimento é dia de calendário: sem fuso, não vira véspera. */
  it("lê a data brasileira que os registros antigos guardam", () => {
    const resultado = cycleTime(
      [artigo("a1", "t1")],
      [atendimento("t1", "01/08/2026")],
      [publicacao("a1", "2026-08-11T12:00:00.000Z")]
    );

    expect(resultado.measured).toBe(1);
  });
});
