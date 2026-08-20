import { describe, expect, it } from "vitest";

import { InvalidAnalysisResponseError } from "../analysis/analysisErrors";
import { parseAnalysisResponse } from "./analysisResponseParser";

function response(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    identification: {
      ticketId: "45812",
      title: "Erro ao autenticar",
      company: "Alpha",
      solution: "Workflow",
      analyzedAt: "2026-08-20T12:00:00.000Z",
    },
    summary: {
      resume: "Resumo",
      customerProblem: "Problema",
      rootCause: "Causa",
      supportAction: "Ação",
      outcome: "Desfecho",
    },
    classification: { documentationStatus: "partial", confidenceLevel: "high" },
    confidence: 92,
    relatedArticles: 3,
    opportunities: [
      {
        type: "update_article",
        title: "Atualizar artigo",
        description: "Descrição",
        justification: "Justificativa",
      },
    ],
    ...overrides,
  });
}

describe("parseAnalysisResponse", () => {
  it("aceita uma resposta completa e válida", () => {
    const result = parseAnalysisResponse(response());

    expect(result.confidence).toBe(92);
    expect(result.classification.documentationStatus).toBe("partial");
  });

  it("tolera espaços em volta do JSON", () => {
    expect(() => parseAnalysisResponse(`\n  ${response()}  \n`)).not.toThrow();
  });

  it("atribui identificador e estado a cada oportunidade", () => {
    const [opportunity] = parseAnalysisResponse(response()).opportunities;

    expect(opportunity.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(opportunity.status).toBe("proposed");
  });

  it("gera identificadores distintos para oportunidades diferentes", () => {
    const result = parseAnalysisResponse(
      response({
        opportunities: [
          { type: "faq", title: "A", description: "d", justification: "j" },
          { type: "tip", title: "B", description: "d", justification: "j" },
        ],
      })
    );

    expect(result.opportunities[0].id).not.toBe(result.opportunities[1].id);
  });

  it("aceita análise sem nenhuma oportunidade", () => {
    expect(parseAnalysisResponse(response({ opportunities: [] })).opportunities).toEqual([]);
  });

  it("recusa texto que não é JSON", () => {
    expect(() => parseAnalysisResponse("Claro! Aqui está a análise:")).toThrow(
      InvalidAnalysisResponseError
    );
  });

  it("recusa JSON com campo obrigatório ausente", () => {
    const semSumario = JSON.parse(response());
    delete semSumario.summary;

    expect(() => parseAnalysisResponse(JSON.stringify(semSumario))).toThrow(
      InvalidAnalysisResponseError
    );
  });

  it("recusa valor fora do conjunto permitido", () => {
    expect(() =>
      parseAnalysisResponse(
        response({ classification: { documentationStatus: "excelente", confidenceLevel: "high" } })
      )
    ).toThrow(InvalidAnalysisResponseError);
  });

  it("recusa confiança fora da faixa", () => {
    expect(() => parseAnalysisResponse(response({ confidence: 140 }))).toThrow(
      InvalidAnalysisResponseError
    );
  });

  it("recusa campo extra: o contrato é estrito", () => {
    expect(() => parseAnalysisResponse(response({ inventado: true }))).toThrow(
      InvalidAnalysisResponseError
    );
  });

  it("recusa a IA tentando definir o estado da oportunidade", () => {
    expect(() =>
      parseAnalysisResponse(
        response({
          opportunities: [
            {
              type: "faq",
              title: "A",
              description: "d",
              justification: "j",
              status: "approved",
            },
          ],
        })
      )
    ).toThrow(InvalidAnalysisResponseError);
  });

  it("recusa data de análise fora do formato ISO", () => {
    const invalida = JSON.parse(response());
    invalida.identification.analyzedAt = "20/08/2026";

    expect(() => parseAnalysisResponse(JSON.stringify(invalida))).toThrow(
      InvalidAnalysisResponseError
    );
  });
});
