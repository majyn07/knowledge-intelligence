import { describe, expect, it } from "vitest";

import {
  assignmentName,
  migrateAssignment,
  resolveAssignment,
  type Person,
  type Team,
} from "./Assignment";

const teams: Team[] = [
  { id: "team-suporte-visus", name: "Suporte Visus", order: 0 },
  { id: "team-suporte-estruturas", name: "Suporte Estruturas", order: 1 },
];

const people: Person[] = [
  {
    id: "3f1c8a2e-0000-4000-8000-000000000001",
    name: "Raoni Milioli da Silva",
    role: "Conhecimento",
    email: "raoni.silva@altoqi.com.br",
    teamId: "team-suporte-visus",
    avatarUrl: "",
    isActive: true,
  },
];

describe("resolveAssignment", () => {
  it("distingue pessoa de equipe", () => {
    expect(resolveAssignment(people[0].id, people, teams)?.kind).toBe("person");
    expect(resolveAssignment("team-suporte-visus", people, teams)?.kind).toBe("team");
  });

  it("sem atribuição devolve nulo, e espaço em branco conta como sem", () => {
    expect(resolveAssignment("", people, teams)).toBeNull();
    expect(resolveAssignment("   ", people, teams)).toBeNull();
  });

  it("referência que não resolve é exibida como veio, não descartada", () => {
    // Registro anterior guardava o nome; se a migração não encontrou a pessoa,
    // dizer "sem responsável" apagaria informação que existe.
    const resolved = resolveAssignment("Alguém que saiu", people, teams);

    expect(resolved).toEqual({ kind: "unknown", name: "Alguém que saiu" });
  });
});

describe("assignmentName", () => {
  it("devolve o nome atual da pessoa, não o guardado", () => {
    expect(assignmentName(people[0].id, people, teams)).toBe("Raoni Milioli da Silva");
  });

  it("vazio quando não há atribuição", () => {
    expect(assignmentName("", people, teams)).toBe("");
  });
});

describe("migrateAssignment", () => {
  it("converte nome de equipe no identificador", () => {
    expect(migrateAssignment("Suporte Visus", people, teams)).toBe("team-suporte-visus");
  });

  it("converte nome de pessoa no identificador", () => {
    expect(migrateAssignment("Raoni Milioli da Silva", people, teams)).toBe(people[0].id);
  });

  it("ignora acento e caixa ao corresponder", () => {
    expect(migrateAssignment("suporte estruturas", people, teams)).toBe("team-suporte-estruturas");
  });

  it("preserva o texto quando não encontra correspondência", () => {
    // Não encaixar é melhor que encaixar errado — a mesma regra da seção.
    expect(migrateAssignment("Mariana Costa", people, teams)).toBe("Mariana Costa");
  });

  it("não mexe no que já é identificador", () => {
    expect(migrateAssignment("team-suporte-visus", people, teams)).toBe("team-suporte-visus");
    expect(migrateAssignment(people[0].id, people, teams)).toBe(people[0].id);
  });

  it("vazio continua vazio", () => {
    expect(migrateAssignment("", people, teams)).toBe("");
  });
});

describe("compatibilidade com registros anteriores", () => {
  it("resolve o nome guardado por versão anterior, sem migrar o dado", () => {
    // Evita uma migração de dados inteira: o registro antigo continua legível,
    // e vira identificador sozinho na próxima vez que alguém o salvar.
    expect(resolveAssignment("Suporte Visus", people, teams)).toEqual({
      kind: "team",
      name: "Suporte Visus",
    });

    expect(resolveAssignment("Raoni Milioli da Silva", people, teams)).toEqual({
      kind: "person",
      name: "Raoni Milioli da Silva",
    });
  });

  it("nome de alguém que saiu continua visível como veio", () => {
    expect(resolveAssignment("Mariana Costa", people, teams)).toEqual({
      kind: "unknown",
      name: "Mariana Costa",
    });
  });

  it("renomear a pessoa atualiza tudo que aponta para ela", () => {
    // Era o motivo de trocar nome por identificador: com nome guardado, mudar
    // o próprio nome orfanaria todas as atribuições.
    const renomeada = [{ ...people[0], name: "R. Milioli" }];

    expect(assignmentName(people[0].id, renomeada, teams)).toBe("R. Milioli");
  });
});
