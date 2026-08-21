import { describe, expect, it } from "vitest";

import type { Team } from "@/models/Assignment";
import type { Taxonomy } from "@/models/Taxonomy";

import { suggestTeam, teamsOfCategory } from "./suggestTeam";

const taxonomy: Taxonomy = {
  categories: [
    { id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 },
    { id: "cat-visus", name: "AltoQi Visus", isProduct: true, order: 1 },
    { id: "cat-onboarding", name: "QiOnboarding", isProduct: false, order: 2 },
  ],
  sections: [
    { id: "sec-eletrica", categoryId: "cat-builder", name: "Elétrica", order: 0 },
    { id: "sec-hidraulica", categoryId: "cat-builder", name: "Hidráulica", order: 1 },
    { id: "sec-collab", categoryId: "cat-visus", name: "Collab", order: 0 },
    { id: "sec-canais", categoryId: "cat-onboarding", name: "Canais", order: 0 },
  ],
  genres: [],
  opportunityTypes: [],
};

const team = (id: string, categoryIds: string[], sectionIds: string[] = []): Team => ({
  id,
  name: id,
  order: 0,
  categoryIds,
  sectionIds,
});

describe("suggestTeam", () => {
  it("sugere a equipe que declarou a categoria da seção", () => {
    const teams = [team("eq-eletrica", ["cat-builder"]), team("eq-visus", ["cat-visus"])];

    expect(suggestTeam("sec-collab", taxonomy, teams)).toBe("eq-visus");
  });

  it("categoria sem equipe não sugere nada", () => {
    /*
      QiOnboarding e Novidades de Release não têm equipe óbvia. Chutar uma
      seria exatamente o que a sugestão existe para não fazer.
    */
    const teams = [team("eq-visus", ["cat-visus"])];

    expect(suggestTeam("sec-canais", taxonomy, teams)).toBe("");
  });

  it("duas equipes na mesma categoria desligam a sugestão", () => {
    /*
      Escolher a primeira seria arbitrário — e arbitrário com cara de sugestão
      é pior que campo vazio, porque ninguém desconfia do que já veio
      preenchido.
    */
    const teams = [team("eq-a", ["cat-visus"]), team("eq-b", ["cat-visus"])];

    expect(suggestTeam("sec-collab", taxonomy, teams)).toBe("");
  });

  it("seção que não existe não sugere nada", () => {
    // Artigo sem seção, ou de uma categoria removida.
    const teams = [team("eq-visus", ["cat-visus"])];

    expect(suggestTeam("", taxonomy, teams)).toBe("");
    expect(suggestTeam("sec-que-sumiu", taxonomy, teams)).toBe("");
  });

  it("equipe que cita categoria removida simplesmente não sugere", () => {
    // Não há chave estrangeira de propósito: remover categoria não pode
    // falhar porque alguém a citava.
    const teams = [team("eq-orfa", ["cat-que-sumiu"])];

    expect(suggestTeam("sec-collab", taxonomy, teams)).toBe("");
  });

  it("a seção declarada vence a categoria", () => {
    /*
      O suporte do Builder é dividido por disciplina, e disciplina no portal é
      seção. As duas equipes têm de responder pela mesma categoria — declarar
      só ela desligaria a sugestão de ambas.
    */
    const teams = [
      team("eq-eletrica", ["cat-builder"], ["sec-eletrica"]),
      team("eq-hidraulica", ["cat-builder"], ["sec-hidraulica"]),
    ];

    expect(suggestTeam("sec-eletrica", taxonomy, teams)).toBe("eq-eletrica");
    expect(suggestTeam("sec-hidraulica", taxonomy, teams)).toBe("eq-hidraulica");
  });

  it("seção sem dono cai na categoria, e duas donas dela não sugerem", () => {
    /*
      A categoria continua valendo para quem responde pelo produto inteiro.
      Mas se a seção não foi declarada por ninguém e a categoria tem duas
      equipes, voltamos ao empate — e empate não sugere.
    */
    const comSecao = [
      team("eq-eletrica", ["cat-builder"], ["sec-eletrica"]),
      team("eq-hidraulica", ["cat-builder"], ["sec-hidraulica"]),
    ];

    expect(suggestTeam("sec-collab", taxonomy, comSecao)).toBe("");

    const umaSo = [team("eq-builder", ["cat-builder"], ["sec-eletrica"])];

    expect(suggestTeam("sec-hidraulica", taxonomy, umaSo)).toBe("eq-builder");
  });

  it("duas equipes na mesma seção desligam a sugestão", () => {
    const teams = [
      team("eq-a", [], ["sec-eletrica"]),
      team("eq-b", ["cat-builder"], ["sec-eletrica"]),
    ];

    expect(suggestTeam("sec-eletrica", taxonomy, teams)).toBe("");
  });

  it("uma equipe pode responder por mais de uma categoria", () => {
    const teams = [team("eq-tudo", ["cat-builder", "cat-visus"])];

    expect(suggestTeam("sec-eletrica", taxonomy, teams)).toBe("eq-tudo");
    expect(suggestTeam("sec-collab", taxonomy, teams)).toBe("eq-tudo");
  });
});

describe("teamsOfCategory", () => {
  it("devolve todas as que declararam, para a tela poder avisar", () => {
    const teams = [team("eq-a", ["cat-visus"]), team("eq-b", ["cat-visus"]), team("eq-c", [])];

    expect(teamsOfCategory("cat-visus", teams).map((item) => item.id)).toEqual(["eq-a", "eq-b"]);
  });
});
