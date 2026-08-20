import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Person, Team } from "@/models/Assignment";

import { buildMyWork } from "./myWork";
import type { PlanWorkspaceItem } from "./types/PlanWorkspace";

const agora = new Date("2026-08-20T18:00:00.000Z");
const dia = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const teams: Team[] = [{ id: "team-suporte-visus", name: "Suporte Visus", order: 0, categoryIds: [] }];

const eu: Person = {
  id: "pessoa-1",
  name: "Raoni Milioli da Silva",
  role: "",
  email: "raoni.silva@altoqi.com.br",
  teamId: "team-suporte-visus",
  avatarUrl: "",
  isActive: true,
};

const outra: Person = { ...eu, id: "pessoa-2", name: "Outra", email: "outra@altoqi.com.br" };
const people = [eu, outra];

function plano(id: string, owner: string, extra: Partial<PlanWorkspaceItem> = {}): PlanWorkspaceItem {
  return {
    id, title: `Plano ${id}`, projectName: "", projectId: "p1",
    status: "development", priority: "normal", owner,
    createdAt: dia(-40), updatedAt: dia(-1),
    source: { projectId: "p1", ticketId: "", analysisId: "", opportunityId: "", analysisLabel: "", opportunityTitle: "" },
    document: { executiveSummary: "", context: "", problem: "", diagnosis: "", evidence: [], decisions: [], proposal: "", acceptanceCriteria: [], notes: "", references: [] },
    tasks: [], comments: [],
    ...extra,
  };
}

function artigo(id: string, author: string, status: KnowledgeArticle["status"] = "draft"): KnowledgeArticle {
  return {
    id, title: `Artigo ${id}`, summary: "", content: "", projectId: "p2",
    genreId: "gen-artigo", status, sectionId: "sec-altoqi-visus-workflow",
    tags: [], keywords: [], author,
    createdAt: new Date(dia(-40)), updatedAt: new Date(dia(-1)),
  };
}

const evento = (kind: "plan" | "article", id: string, at: string): ActivityEvent => ({
  id: `ev-${id}-${at}`, at, type: "plan_updated", projectId: "p1", actor: "",
  subject: { kind, id, label: "" }, detail: "",
});

const base = { people, teams, me: eu };

describe("buildMyWork", () => {
  it("sem identificação não afirma nada", () => {
    const items = buildMyWork(
      { ...base, me: null, plans: [plano("a", "pessoa-1")], articles: [], events: [] },
      agora
    );

    expect(items).toEqual([]);
  });

  it("traz o que é meu e deixa o que é de outra pessoa", () => {
    const items = buildMyWork(
      { ...base, plans: [plano("meu", "pessoa-1"), plano("dela", "pessoa-2")], articles: [], events: [] },
      agora
    );

    expect(items.map((i) => i.id)).toEqual(["meu"]);
  });

  it("inclui o que está atribuído à minha equipe", () => {
    /*
      Enquanto a maior parte do time não entrou, a equipe é onde a atribuição
      de fato mora — ignorá-la deixaria a tela vazia justamente para quem mais
      precisa dela.
    */
    const items = buildMyWork(
      { ...base, plans: [plano("da-equipe", "team-suporte-visus")], articles: [], events: [] },
      agora
    );

    expect(items.map((i) => i.id)).toEqual(["da-equipe"]);
  });

  it("reconhece atribuição guardada como nome por versão anterior", () => {
    const items = buildMyWork(
      { ...base, plans: [plano("antigo", "Raoni Milioli da Silva")], articles: [], events: [] },
      agora
    );

    expect(items.map((i) => i.id)).toEqual(["antigo"]);
  });

  it("atravessa projetos, que era o limite da fila por projeto", () => {
    const items = buildMyWork(
      {
        ...base,
        plans: [plano("p", "pessoa-1")],
        articles: [artigo("a", "pessoa-1")],
        events: [],
      },
      agora
    );

    expect(items.map((i) => i.projectId).sort()).toEqual(["p1", "p2"]);
  });

  it("o que terminou sai da lista", () => {
    const items = buildMyWork(
      {
        ...base,
        plans: [plano("pub", "pessoa-1", { status: "published" })],
        articles: [artigo("pub", "pessoa-1", "published"), artigo("arq", "pessoa-1", "archived")],
        events: [],
      },
      agora
    );

    expect(items).toEqual([]);
  });

  it("ordena por urgência: atrasado antes de parado, parado antes do resto", () => {
    const items = buildMyWork(
      {
        ...base,
        plans: [
          plano("tranquilo", "pessoa-1", { dueDate: dia(30) }),
          plano("atrasado", "pessoa-1", { dueDate: dia(-2) }),
          plano("parado", "pessoa-1"),
        ],
        articles: [],
        events: [
          evento("plan", "tranquilo", dia(-1)),
          evento("plan", "atrasado", dia(-1)),
          evento("plan", "parado", dia(-20)),
        ],
      },
      agora
    );

    expect(items.map((i) => i.id)).toEqual(["atrasado", "parado", "tranquilo"]);
  });

  it("artigo sem prazo nunca chega ao topo — só a parada o move", () => {
    const items = buildMyWork(
      {
        ...base,
        plans: [plano("atrasado", "pessoa-1", { dueDate: dia(-1) })],
        articles: [artigo("parado", "pessoa-1")],
        events: [evento("plan", "atrasado", dia(-1)), evento("article", "parado", dia(-20))],
      },
      agora
    );

    expect(items.map((i) => i.kind)).toEqual(["plan", "article"]);
    expect(items[1].reason).toBe("sem movimento há 20 dias");
  });

  it("diz o motivo de cada linha", () => {
    const items = buildMyWork(
      { ...base, plans: [plano("a", "pessoa-1", { dueDate: dia(0) })], articles: [], events: [] },
      agora
    );

    expect(items[0].reason).toBe("vence hoje");
  });
});
