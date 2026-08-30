import { describe, expect, it } from "vitest";

import { getCoverageJsonSchema, parseCoverage, type CoverageRequest } from "./coverage";
import { paraGemini } from "../server/geminiSchema";

const pedido = (extra: Partial<CoverageRequest> = {}): CoverageRequest => ({
  material: "Ao importar o IFC no Eberick o modelo abre deslocado da origem.",
  candidatos: [
    { id: "a1", title: "Importar IFC no Eberick", summary: "", excerpt: "Passo a passo" },
  ],
  modelos: [],
  ...extra,
});

const resposta = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    cobertura: "parcial",
    motivo: "O artigo trata da importação mas não do ponto de origem.",
    artigos: [{ id: "a1", jaCobre: "o passo a passo", falta: "o ponto de origem" }],
    ...extra,
  });

describe("parseCoverage", () => {
  it("lê o veredito e o que falta em cada artigo", () => {
    const lido = parseCoverage(resposta(), pedido());

    expect(lido).toMatchObject({ cobertura: "parcial" });
    expect(lido?.artigos[0]).toMatchObject({ id: "a1", falta: "o ponto de origem" });
  });

  /*
    Instrução não é garantia. Artigo que o modelo inventou viraria um link para
    um registro que não existe — é a mesma conferência da sugestão de seção.
  */
  it("artigo que não foi enviado é descartado", () => {
    const lido = parseCoverage(
      resposta({ artigos: [{ id: "inventado", jaCobre: "tudo", falta: "nada" }] }),
      pedido()
    );

    expect(lido?.artigos).toEqual([]);
  });

  /*
    Sem artigo reconhecido, "coberta" é afirmação sem evidência: o veredito
    dependia de apontar qual artigo cobre. Cair para "ausente" é o lado certo do
    erro — um rascunho a mais custa menos que um artigo que não foi escrito.
  */
  it("veredito sem artigo que o sustente vira ausente", () => {
    const lido = parseCoverage(
      resposta({ cobertura: "coberta", artigos: [{ id: "x", jaCobre: "", falta: "" }] }),
      pedido()
    );

    expect(lido?.cobertura).toBe("ausente");
  });

  it("ausente sem artigo nenhum continua ausente", () => {
    const lido = parseCoverage(
      resposta({ cobertura: "ausente", artigos: [], rascunho: { title: "T", summary: "S", content: "C" } }),
      pedido({ candidatos: [] })
    );

    expect(lido).toMatchObject({ cobertura: "ausente" });
    expect(lido?.rascunho?.title).toBe("T");
  });

  /* A cerca de crase que o modelo às vezes acrescenta não derruba a resposta. */
  it("tolera a cerca de crase", () => {
    expect(parseCoverage("```json\n" + resposta() + "\n```", pedido())).toMatchObject({
      cobertura: "parcial",
    });
  });

  it("resposta fora do contrato devolve nulo, e não um resultado vazio", () => {
    expect(parseCoverage("desculpe, não consegui avaliar", pedido())).toBe(null);
    expect(parseCoverage(JSON.stringify({ cobertura: "talvez" }), pedido())).toBe(null);
  });
});

describe("getCoverageJsonSchema", () => {
  it("não leva o cabeçalho do formato", () => {
    expect(Object.keys(getCoverageJsonSchema())).not.toContain("$schema");
  });

  /*
    Uma chave que o Gemini não conhece derruba o pedido antes de sair, e o
    defeito só apareceria contra a API real.
  */
  it("atravessa a redução do provedor sem sobrar chave estranha", () => {
    const permitidas = new Set([
      "type",
      "description",
      "enum",
      "items",
      "properties",
      "required",
      "minItems",
      "maxItems",
      "nullable",
      "anyOf",
      "format",
    ]);

    const chaves = new Set<string>();

    const percorrer = (valor: unknown) => {
      if (Array.isArray(valor)) return valor.forEach(percorrer);
      if (typeof valor !== "object" || valor === null) return;

      for (const [chave, sub] of Object.entries(valor as Record<string, unknown>)) {
        chaves.add(chave);
        if (chave !== "properties") percorrer(sub);
      }
    };

    percorrer(paraGemini(getCoverageJsonSchema()));

    expect([...chaves].filter((chave) => !permitidas.has(chave))).toEqual([]);
  });
});
