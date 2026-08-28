import { describe, expect, it } from "vitest";

import type { Follow } from "@/features/people/follows";
import type { Person, Team } from "@/models/Assignment";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { buildWatching } from "./watching";
import type { PlanComment, PlanWorkspaceItem } from "./types/PlanWorkspace";

const teams: Team[] = [{ id: "eq-visus", name: "Suporte Visus", order: 0, categoryIds: [], sectionIds: [] }];

const me: Person = {
  id: "pes-1",
  name: "Raoni",
  role: "Suporte",
  email: "r@altoqi.com.br",
  teamId: "eq-visus",
  avatarUrl: "",
  isActive: true, isAdmin: false,
};

const people = [me];

function plano(over: Partial<PlanWorkspaceItem> = {}): PlanWorkspaceItem {
  return {
    id: "pl1",
    title: "Plano Um",
    projectId: "p1",
    status: "development",
    comments: [],
    document: { notes: "" },
    ...over,
  } as PlanWorkspaceItem;
}

const comentário = (message: string): PlanComment => ({
  id: "c1",
  author: "outra",
  message,
  date: "",
});

function follow(over: Partial<Follow> = {}): Follow {
  return {
    id: "f1",
    personId: "pes-1",
    kind: "plan",
    subjectId: "pl1",
    subjectLabel: "Plano Um",
    projectId: "p1",
    createdAt: "",
    ...over,
  };
}

const base = { plans: [], articles: [] as KnowledgeArticle[], follows: [], me, people, teams };

describe("buildWatching", () => {
  it("menção a mim traz o plano", () => {
    const items = buildWatching({
      ...base,
      plans: [plano({ comments: [comentário("@[Raoni](pes-1) confere?")] })],
    });

    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("mencionado");
  });

  it("menção à minha equipe também é minha", () => {
    /*
      Enquanto a maior parte do time não entrou, mencionar a equipe é o caminho
      que de fato existe. Ignorá-lo esvaziaria a lista de quem mais precisa.
    */
    const items = buildWatching({
      ...base,
      plans: [plano({ comments: [comentário("@[Suporte Visus](eq-visus) alguém vê?")] })],
    });

    expect(items).toHaveLength(1);
  });

  it("menção a outra pessoa não é minha", () => {
    const items = buildWatching({
      ...base,
      plans: [plano({ comments: [comentário("@[Outro](pes-9) confere?")] })],
    });

    expect(items).toEqual([]);
  });

  it("sem conta identificada não há menção a mim", () => {
    const items = buildWatching({
      ...base,
      me: null,
      plans: [plano({ comments: [comentário("@[Raoni](pes-1) confere?")] })],
    });

    expect(items).toEqual([]);
  });

  it("acompanhar traz o registro sem ser dono dele", () => {
    const items = buildWatching({ ...base, plans: [plano()], follows: [follow()] });

    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("acompanhando");
  });

  it("acompanhar e ser mencionado no mesmo registro é uma linha só", () => {
    // E a escolha explícita vence a menção, que pode ter sido de passagem.
    const items = buildWatching({
      ...base,
      plans: [plano({ comments: [comentário("@[Raoni](pes-1) veja")] })],
      follows: [follow()],
    });

    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("acompanhando");
  });

  it("registro excluído continua legível pelo rótulo guardado", () => {
    /*
      Some o registro, não o fato de alguém ter escolhido acompanhá-lo. Sem o
      rótulo, a linha viraria um identificador solto.
    */
    const items = buildWatching({
      ...base,
      follows: [follow({ subjectId: "sumiu", subjectLabel: "Plano Antigo" })],
    });

    expect(items[0].title).toBe("Plano Antigo");
    expect(items[0].isClosed).toBe(true);
  });

  it("o que ainda se move vem antes do que já terminou", () => {
    const items = buildWatching({
      ...base,
      plans: [
        plano({ id: "aberto", title: "Aberto" }),
        plano({ id: "fechado", title: "Fechado", status: "published" }),
      ],
      follows: [
        follow({ id: "f1", subjectId: "aberto" }),
        follow({ id: "f2", subjectId: "fechado" }),
      ],
    });

    expect(items.map((item) => item.id)).toEqual(["aberto", "fechado"]);
  });

  it("acompanhamento de outra pessoa não entra na minha lista", () => {
    // Quem filtra por pessoa é o provider; aqui a lista já chega filtrada, e o
    // teste registra que ela é a fonte, não há segunda checagem escondida.
    const items = buildWatching({ ...base, plans: [plano()], follows: [] });

    expect(items).toEqual([]);
  });
});
