import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { planVisits } from "./portalSchedule";

const url = (id: string) => `https://suporte.altoqi.com.br/hc/pt-br/articles/${id}`;

const artigo = (portalArticleId: string, updatedAt: string): KnowledgeArticle => ({
  id: `art-${portalArticleId}`,
  title: "Artigo",
  summary: "",
  content: "<p>x</p>",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-1",
  portalArticleId,
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "html",
  createdAt: new Date(updatedAt),
  updatedAt: new Date(updatedAt),
});

describe("planVisits", () => {
  it("visita o que ainda não existe aqui", () => {
    const plan = planVisits([{ url: url("1"), lastmod: "2026-08-01T00:00:00Z" }], []);

    expect(plan.toVisit).toHaveLength(1);
    expect(plan.missing).toBe(1);
  });

  /*
    É o ponto do recurso: parar a varredura no meio e continuar depois sem
    buscar de novo o que já veio. Sem isto, a segunda passada repete tudo.
  */
  it("pula o que já temos e não mudou no portal", () => {
    const plan = planVisits(
      [{ url: url("1"), lastmod: "2026-08-01T00:00:00Z" }],
      [artigo("1", "2026-08-01T00:00:00Z")]
    );

    expect(plan.toVisit).toHaveLength(0);
    expect(plan.upToDate).toBe(1);
  });

  it("visita de novo o que o portal alterou depois da importação", () => {
    const plan = planVisits(
      [{ url: url("1"), lastmod: "2026-08-20T00:00:00Z" }],
      [artigo("1", "2026-08-01T00:00:00Z")]
    );

    expect(plan.toVisit).toHaveLength(1);
    expect(plan.outdated).toBe(1);
  });

  /*
    Edição feita aqui deixa `updatedAt` na frente do `lastmod`. O portal não
    mudou, então não há o que buscar, e sobrescrever apagaria a edição.
  */
  it("não revisita por causa de edição feita aqui dentro", () => {
    const plan = planVisits(
      [{ url: url("1"), lastmod: "2026-08-01T00:00:00Z" }],
      [artigo("1", "2026-08-25T00:00:00Z")]
    );

    expect(plan.toVisit).toHaveLength(0);
    expect(plan.upToDate).toBe(1);
  });

  /* Na dúvida, visita, e diz quantas foram por não ter data. */
  it("visita o que o sitemap não datou", () => {
    const plan = planVisits(
      [{ url: url("1"), lastmod: "" }],
      [artigo("1", "2026-08-01T00:00:00Z")]
    );

    expect(plan.toVisit).toHaveLength(1);
    expect(plan.undated).toBe(1);
  });

  it("visita o que tem data ilegível, em vez de pular no escuro", () => {
    const plan = planVisits(
      [{ url: url("1"), lastmod: "ontem" }],
      [artigo("1", "2026-08-01T00:00:00Z")]
    );

    expect(plan.undated).toBe(1);
  });

  it("casa pelo slug quando a URL não tem número", () => {
    const plan = planVisits(
      [{ url: "https://suporte.altoqi.com.br/hc/pt-br/comandos", lastmod: "2026-08-01T00:00:00Z" }],
      [artigo("comandos", "2026-08-01T00:00:00Z")]
    );

    expect(plan.upToDate).toBe(1);
  });

  it("revisita tudo quando alguém pede, ignorando o que está em dia", () => {
    const plan = planVisits(
      [
        { url: url("1"), lastmod: "2026-08-01T00:00:00Z" },
        { url: url("2"), lastmod: "2026-08-01T00:00:00Z" },
      ],
      [artigo("1", "2026-08-01T00:00:00Z"), artigo("2", "2026-08-01T00:00:00Z")],
      true
    );

    expect(plan.toVisit).toHaveLength(2);
    expect(plan.upToDate).toBe(0);
  });

  it("separa os motivos numa lista misturada", () => {
    const plan = planVisits(
      [
        { url: url("1"), lastmod: "2026-08-01T00:00:00Z" },
        { url: url("2"), lastmod: "2026-08-20T00:00:00Z" },
        { url: url("3"), lastmod: "2026-08-01T00:00:00Z" },
        { url: url("4"), lastmod: "" },
      ],
      [
        artigo("1", "2026-08-01T00:00:00Z"),
        artigo("2", "2026-08-01T00:00:00Z"),
        artigo("4", "2026-08-01T00:00:00Z"),
      ]
    );

    expect(plan.upToDate).toBe(1);
    expect(plan.outdated).toBe(1);
    expect(plan.missing).toBe(1);
    expect(plan.undated).toBe(1);
    expect(plan.toVisit).toHaveLength(3);
  });
});
