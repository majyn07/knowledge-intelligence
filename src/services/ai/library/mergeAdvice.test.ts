import { describe, expect, it } from "vitest";

import { parseMergeAdvice } from "./mergeAdvice";

const resposta = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    relacao: "complementares",
    motivo: "O primeiro cobre a exportação; o segundo, a conferência do modelo.",
    manter: "art-a",
    levarJunto: ["A checagem de colisão"],
    recomendacao: "Levar a checagem para o primeiro e arquivar o segundo.",
    ...extra,
  });

describe("parseMergeAdvice", () => {
  it("lê o veredito", () => {
    const advice = parseMergeAdvice(resposta(), ["art-a", "art-b"]);

    expect(advice.relacao).toBe("complementares");
    expect(advice.manter).toBe("art-a");
  });

  /* Mesma regra da sugestão de seção e da cobertura, e pelo mesmo motivo. */
  it("artigo que o modelo inventou vira ausência, e não recomendação", () => {
    const advice = parseMergeAdvice(resposta({ manter: "art-inventado" }), ["art-a", "art-b"]);

    expect(advice.manter).toBeNull();
  });

  it("aceita a cerca de crase que o modelo às vezes acrescenta", () => {
    const advice = parseMergeAdvice("```json\n" + resposta() + "\n```", ["art-a", "art-b"]);

    expect(advice.relacao).toBe("complementares");
  });

  it("assuntos diferentes não guardam artigo a manter", () => {
    const advice = parseMergeAdvice(
      resposta({ relacao: "assuntos-diferentes", manter: null, levarJunto: [] }),
      ["art-a", "art-b"]
    );

    expect(advice.manter).toBeNull();
    expect(advice.levarJunto).toEqual([]);
  });

  it("resposta fora do contrato é recusada, e não passa meio veredito", () => {
    expect(() => parseMergeAdvice(JSON.stringify({ relacao: "unir" }), ["art-a"])).toThrow();
  });
});
