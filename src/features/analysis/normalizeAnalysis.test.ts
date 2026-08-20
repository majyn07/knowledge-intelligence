import { describe, expect, it } from "vitest";

import { normalizeAnalysis, parseAnalyses } from "./normalizeAnalysis";

const analise = {
  id: "an1",
  projectId: "p1",
  ticketId: "45812",
  status: "completed",
  startedAt: "2026-05-01T10:00:00.000Z",
  completedAt: "2026-05-01T10:02:00.000Z",
  result: {
    identification: { title: "Falha de autenticação" },
    opportunities: [
      {
        id: "op1",
        type: "opp-novo-artigo",
        title: "Documentar o novo fluxo",
        description: "d",
        justification: "j",
        status: "proposed",
      },
    ],
  },
  relatedArticles: [],
  messages: [],
};

describe("normalizeAnalysis", () => {
  it("preserva o envelope e as oportunidades", () => {
    const result = normalizeAnalysis(analise);

    expect(result.ticketId).toBe("45812");
    expect(result.status).toBe("completed");
    expect(result.result.opportunities).toHaveLength(1);
    expect(result.result.opportunities[0].type).toBe("opp-novo-artigo");
  });

  it("preserva o resto do resultado, que vem validado da fronteira da IA", () => {
    const result = normalizeAnalysis(analise) as unknown as {
      result: { identification: { title: string } };
    };

    expect(result.result.identification.title).toBe("Falha de autenticação");
  });

  it("recusa estágio desconhecido da análise e da oportunidade", () => {
    const result = normalizeAnalysis({
      ...analise,
      status: "quase",
      result: { opportunities: [{ id: "op1", status: "talvez" }] },
    });

    expect(result.status).toBe("open");
    expect(result.result.opportunities[0].status).toBe("proposed");
  });

  it("registro gravado antes da evidência existir não quebra", () => {
    // `relatedArticles` e `messages` passaram a ser gravados depois.
    const result = normalizeAnalysis({ id: "an2", result: {} });

    expect(result.relatedArticles).toEqual([]);
    expect(result.messages).toEqual([]);
    expect(result.result.opportunities).toEqual([]);
  });

  it("não inventa data de conclusão quando ela não existe", () => {
    const { completedAt, ...semConclusao } = analise;
    void completedAt;

    expect(normalizeAnalysis(semConclusao).completedAt).toBeUndefined();
  });

  it("tipo de oportunidade vazio é estado legítimo", () => {
    // A IA sugeriu algo que a equipe não tem cadastrado; a revisão decide.
    const result = normalizeAnalysis({
      ...analise,
      result: { opportunities: [{ id: "op1" }] },
    });

    expect(result.result.opportunities[0].type).toBe("");
  });
});

describe("parseAnalyses", () => {
  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseAnalyses('{"a":1}')).toEqual([]);
  });
});
