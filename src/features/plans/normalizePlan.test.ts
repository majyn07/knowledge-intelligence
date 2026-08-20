import { describe, expect, it } from "vitest";

import { normalizePlan, parsePlans } from "./normalizePlan";

describe("normalizePlan", () => {
  it("reconstrói o documento quando ele não existe no registro guardado", () => {
    const plan = normalizePlan({ id: "p1", title: "Plano" });

    expect(plan.document.acceptanceCriteria).toEqual([]);
    expect(plan.document.evidence).toEqual([]);
    expect(plan.document.executiveSummary).toBe("");
  });

  it("garante listas de atividades e comentários", () => {
    const plan = normalizePlan({ id: "p1" });

    expect(plan.tasks).toEqual([]);
    expect(plan.comments).toEqual([]);
  });

  it("o registro incompleto sobrevive às operações da tela", () => {
    const plan = normalizePlan({ id: "p1" });

    expect(() => plan.tasks.filter((task) => task.completed)).not.toThrow();
    expect(() => plan.owner.trim()).not.toThrow();
  });

  it("recusa estágio e prioridade desconhecidos", () => {
    const plan = normalizePlan({
      id: "p1",
      status: "publicadissimo",
      priority: "urgentissima",
    });

    expect(plan.status).toBe("analysis");
    expect(plan.priority).toBe("normal");
  });

  it("preserva a origem e só inclui o artigo quando existe", () => {
    const semArtigo = normalizePlan({ id: "p1", source: { ticketId: "45812" } });
    const comArtigo = normalizePlan({
      id: "p1",
      source: { ticketId: "45812", articleId: "a1" },
    });

    expect(semArtigo.source.ticketId).toBe("45812");
    expect(semArtigo.source.articleId).toBeUndefined();
    expect(comArtigo.source.articleId).toBe("a1");
  });

  it("dá identificador a atividades que não têm", () => {
    const plan = normalizePlan({
      id: "p1",
      tasks: [{ label: "Sem id", completed: false, owner: "" }],
    });

    expect(plan.tasks[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("parsePlans", () => {
  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parsePlans("null")).toEqual([]);
  });
});
