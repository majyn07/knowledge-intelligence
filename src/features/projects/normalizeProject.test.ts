import { describe, expect, it } from "vitest";

import { normalizeProject, parseProjects } from "./normalizeProject";

const projeto = {
  id: "p1",
  name: "Base Visus Produção",
  client: "AltoQi",
  description: "",
  status: "active",
  product: "AltoQi Visus",
  module: "Workflow",
  goal: "",
  owner: "Suporte Visus",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

describe("normalizeProject", () => {
  it("preserva o registro completo e converte datas", () => {
    const result = normalizeProject(projeto);

    expect(result.name).toBe("Base Visus Produção");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("recusa estágio desconhecido em vez de propagá-lo", () => {
    expect(normalizeProject({ ...projeto, status: "pausado" }).status).toBe("active");
  });

  it("data inválida vira a época, para nunca produzir Invalid Date na tela", () => {
    expect(normalizeProject({ ...projeto, createdAt: "ontem" }).createdAt.getTime()).toBe(0);
  });

  it("campo ausente vira string vazia e sobrevive a .trim()", () => {
    const result = normalizeProject({ id: "p2" });

    expect(() => [result.name, result.client, result.owner].map((f) => f.trim())).not.toThrow();
  });

  it("gera identificador quando o registro não tem", () => {
    expect(normalizeProject({ name: "Sem id" }).id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("parseProjects", () => {
  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseProjects("null")).toEqual([]);
  });
});
