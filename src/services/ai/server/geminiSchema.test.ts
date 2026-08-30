import { describe, expect, it } from "vitest";

import { getAnalysisResponseJsonSchema } from "../prompts/analysisResponseSchema";
import { paraGemini } from "./geminiSchema";

describe("paraGemini", () => {
  /*
    `.strict()` do Zod vira `additionalProperties: false`, e o Gemini recusa o
    pedido inteiro por causa dela. A regra continua valendo do nosso lado: a
    resposta passa pelo Zod na volta de qualquer jeito.
  */
  it("tira o que o Gemini não conhece", () => {
    const reduzido = paraGemini({
      type: "object",
      additionalProperties: false,
      properties: { nome: { type: "string", minLength: 1 } },
      required: ["nome"],
    }) as Record<string, unknown>;

    expect(reduzido).toEqual({
      type: "object",
      properties: { nome: { type: "string" } },
      required: ["nome"],
    });
  });

  it("mantém o que ele entende", () => {
    const reduzido = paraGemini({
      type: "array",
      description: "as oportunidades",
      minItems: 0,
      items: { type: "string", enum: ["faq", "tip"] },
    });

    expect(reduzido).toEqual({
      type: "array",
      description: "as oportunidades",
      minItems: 0,
      items: { type: "string", enum: ["faq", "tip"] },
    });
  });

  /*
    `properties` é um mapa de nome para schema, e não um schema: descer nele
    como se fosse um apagaria os nomes dos campos.
  */
  it("não confunde nome de campo com palavra-chave", () => {
    const reduzido = paraGemini({
      type: "object",
      properties: {
        type: { type: "string" },
        required: { type: "string" },
        items: { type: "string", minLength: 3 },
      },
    }) as { properties: Record<string, unknown> };

    expect(Object.keys(reduzido.properties).sort()).toEqual(["items", "required", "type"]);
    expect(reduzido.properties.items).toEqual({ type: "string" });
  });

  /*
    `format` é aceito, mas só em alguns valores: `email` ou `uri` fariam o
    pedido ser recusado inteiro por causa de um campo.
  */
  it("só deixa passar o formato que ele reconhece", () => {
    expect(paraGemini({ type: "string", format: "date-time" })).toEqual({
      type: "string",
      format: "date-time",
    });

    expect(paraGemini({ type: "string", format: "email" })).toEqual({ type: "string" });
  });

  it("desce em objetos aninhados e em listas", () => {
    const reduzido = paraGemini({
      type: "object",
      properties: {
        lista: { type: "array", items: { type: "object", additionalProperties: false } },
      },
    }) as { properties: { lista: { items: Record<string, unknown> } } };

    expect(reduzido.properties.lista.items).toEqual({ type: "object" });
  });

  /*
    O contrato de verdade tem de atravessar sem sobrar chave estranha: uma
    delas derruba a análise inteira, e o defeito só aparece contra a API real.
  */
  it("o contrato da análise sai limpo", () => {
    const chaves = new Set<string>();

    const percorrer = (valor: unknown) => {
      if (Array.isArray(valor)) return valor.forEach(percorrer);
      if (typeof valor !== "object" || valor === null) return;

      for (const [chave, sub] of Object.entries(valor as Record<string, unknown>)) {
        chaves.add(chave);

        /* Nomes de campo não são palavras-chave, e não entram na conferência. */
        if (chave !== "properties") percorrer(sub);
      }
    };

    percorrer(paraGemini(getAnalysisResponseJsonSchema()));

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

    expect([...chaves].filter((chave) => !permitidas.has(chave))).toEqual([]);
  });

  it("valor que não é objeto atravessa como veio", () => {
    expect(paraGemini("texto")).toBe("texto");
    expect(paraGemini(7)).toBe(7);
    expect(paraGemini(null)).toBe(null);
  });
});
