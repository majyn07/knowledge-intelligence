import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";

import type { GlobalSearchInput } from "./globalSearch";
import { flattenGroups, searchEverything } from "./globalSearch";

const base: GlobalSearchInput = {
  taxonomy: buildPortalTaxonomy(),
  projects: [
    {
      id: "p1",
      name: "Base Visus Produção",
      description: "",
      status: "active",
      product: "AltoQi Visus",
      module: "Workflow",
      goal: "Reduzir chamados de autenticação",
      owner: "Raoni Milioli da Silva",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  tickets: [
    { id: "45812", projectId: "p1", title: "Erro ao autenticar", solution: "Workflow", company: "Alpha", date: "" },
  ],
  analyses: [],
  plans: [],
  articles: [
    {
      id: "ar1",
      title: "Autenticação após atualização",
      summary: "Como resolver falhas de login",
      content: "",
      projectId: "p1",
      genreId: "gen-artigo",
      status: "published",
      sectionId: "sec-altoqi-visus-workflow",
      tags: [],
      keywords: ["token"],
      author: "",
      contentFormat: "markdown" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  events: [],
};

describe("searchEverything", () => {
  it("exige pelo menos dois caracteres", () => {
    expect(searchEverything(base, "a")).toEqual([]);
    expect(searchEverything(base, " ")).toEqual([]);
  });

  it("encontra registros de tipos diferentes na mesma consulta", () => {
    const kinds = searchEverything(base, "autenticar").map((group) => group.kind);

    expect(kinds).toContain("ticket");
  });

  it("ignora acentuação na consulta e no dado", () => {
    const semAcento = searchEverything(base, "autenticacao");
    const comAcento = searchEverything(base, "autenticação");

    expect(flattenGroups(semAcento).map((r) => r.id)).toEqual(flattenGroups(comAcento).map((r) => r.id));
    expect(flattenGroups(semAcento).some((r) => r.id === "ar1")).toBe(true);
  });

  it("é conjuntiva: todos os termos precisam casar", () => {
    expect(flattenGroups(searchEverything(base, "autenticar alpha")).some((r) => r.kind === "ticket")).toBe(true);
    expect(flattenGroups(searchEverything(base, "autenticar inexistente"))).toHaveLength(0);
  });

  it("busca por identificador do atendimento", () => {
    const results = flattenGroups(searchEverything(base, "45812"));

    expect(results.some((result) => result.kind === "ticket")).toBe(true);
  });

  it("encontra o projeto pelo objetivo, não só pelo nome", () => {
    const results = flattenGroups(searchEverything(base, "reduzir chamados"));

    expect(results.some((result) => result.kind === "project")).toBe(true);
  });

  it("dá mais peso ao título que aos campos seguintes", () => {
    const input: GlobalSearchInput = {
      ...base,
      articles: [
        { ...base.articles[0], id: "titulo", title: "sincronizacao", summary: "", keywords: [] },
        { ...base.articles[0], id: "resumo", title: "Outro", summary: "sincronizacao", keywords: [] },
      ],
    };

    const [first, second] = flattenGroups(searchEverything(input, "sincronizacao"));

    expect(first.id).toBe("titulo");
    expect(first.score).toBeGreaterThan(second.score);
  });

  it("aponta cada resultado para o destino correto", () => {
    const results = flattenGroups(searchEverything(base, "autenticar"));
    const ticket = results.find((result) => result.kind === "ticket");

    expect(ticket?.href).toBe("/analysis?ticket=45812");
  });

  it("limita cada grupo a cinco resultados", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...base.articles[0],
      id: `ar${index}`,
      title: `Autenticar ${index}`,
    }));

    const [group] = searchEverything({ ...base, articles: many }, "autenticar");

    expect(group.results).toHaveLength(5);
  });

  it("não devolve grupos vazios", () => {
    const groups = searchEverything(base, "autenticar");

    expect(groups.every((group) => group.results.length > 0)).toBe(true);
  });
});
