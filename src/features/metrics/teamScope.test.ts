import { describe, expect, it } from "vitest";

import type { Person, Team } from "@/models/Assignment";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { scopeToTeam, teamOfAssignment } from "./teamScope";

const teams: Team[] = [
  { id: "eq-visus", name: "Suporte Visus", order: 0, categoryIds: [], sectionIds: [] },
  { id: "eq-eletrica", name: "Suporte Builder Elétrica", order: 1, categoryIds: [], sectionIds: [] },
];

const people: Person[] = [
  {
    id: "pes-1",
    name: "Raoni",
    role: "Suporte",
    email: "r@altoqi.com.br",
    teamId: "eq-visus",
    avatarUrl: "",
    isActive: true, isAdmin: false,
  },
];

const plano = (id: string, owner: string) => ({ id, owner }) as PlanWorkspaceItem;
const artigo = (id: string, author: string) => ({ id, author }) as KnowledgeArticle;

describe("teamOfAssignment", () => {
  it("a equipe responde por si mesma", () => {
    expect(teamOfAssignment("eq-visus", people, teams)).toBe("eq-visus");
  });

  it("a pessoa responde pela equipe dela", () => {
    // Medir por equipe é o recorte desta fase; o individual vem depois.
    expect(teamOfAssignment("pes-1", people, teams)).toBe("eq-visus");
  });

  it("nome guardado por versão anterior continua resolvendo", () => {
    expect(teamOfAssignment("Suporte Builder Elétrica", people, teams)).toBe("eq-eletrica");
  });

  it("o que não resolve não vira equipe nenhuma", () => {
    expect(teamOfAssignment("Fulano de Tal", people, teams)).toBe("");
    expect(teamOfAssignment("", people, teams)).toBe("");
    expect(teamOfAssignment(undefined, people, teams)).toBe("");
  });
});

describe("scopeToTeam", () => {
  const plans = [plano("p1", "eq-visus"), plano("p2", "eq-eletrica"), plano("p3", "")];
  const articles = [artigo("a1", "pes-1"), artigo("a2", "eq-eletrica")];

  it("sem equipe escolhida, nada é recortado", () => {
    const escopo = scopeToTeam({ teamId: null, plans, articles, people, teams });

    expect(escopo.isScoped).toBe(false);
    expect(escopo.plans).toHaveLength(3);
    expect(escopo.articles).toHaveLength(2);
  });

  it("recorta plano e artigo pela equipe", () => {
    const escopo = scopeToTeam({ teamId: "eq-visus", plans, articles, people, teams });

    expect(escopo.plans.map((plan) => plan.id)).toEqual(["p1"]);
    // O artigo é de uma pessoa da equipe, e entra por ela.
    expect(escopo.articles.map((article) => article.id)).toEqual(["a1"]);
  });

  it("separa quem é de outra equipe de quem não é de nenhuma", () => {
    /*
      As duas coisas ficam de fora do recorte, mas por motivos diferentes: uma
      é trabalho de outra equipe, a outra é trabalho sem responsável. Somá-las
      esconderia a segunda, que é a que alguém precisa resolver.
    */
    const escopo = scopeToTeam({ teamId: "eq-visus", plans, articles, people, teams });

    expect(escopo.excluded).toBe(2);
    expect(escopo.unassigned).toBe(1);
  });

  it("equipe sem nada devolve vazio, e não a lista inteira", () => {
    const escopo = scopeToTeam({
      teamId: "eq-estruturas",
      plans,
      articles,
      people,
      teams,
    });

    expect(escopo.plans).toHaveLength(0);
    expect(escopo.articles).toHaveLength(0);
    expect(escopo.isScoped).toBe(true);
  });
});
