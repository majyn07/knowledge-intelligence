import { describe, expect, it } from "vitest";

import { aiErrorResponse } from "./aiErrorResponse";
import {
  AIConfigurationError,
  AIProviderError,
  InvalidAnalysisResponseError,
} from "./analysisErrors";

const falha = (kind: "credencial" | "limite" | "prazo" | "indisponivel" | "desconhecida", detail = "") =>
  new AIProviderError("gemini", { kind, detail });

describe("aiErrorResponse", () => {
  it("chave recusada não manda tentar de novo", () => {
    /*
      "Tente novamente" com a chave errada é convite a tentar para sempre. A
      mensagem precisa dizer que o conserto é na configuração.
    */
    const resposta = aiErrorResponse(falha("credencial"));

    expect(resposta.message).toContain("configuração");
    expect(resposta.message).not.toContain("de novo mais tarde");
  });

  it("limite de uso responde 429, e não 503", () => {
    // São coisas diferentes: uma passa sozinha, a outra não.
    expect(aiErrorResponse(falha("limite")).status).toBe(429);
    expect(aiErrorResponse(falha("indisponivel")).status).toBe(503);
  });

  it("tempo limite responde 504", () => {
    expect(aiErrorResponse(falha("prazo")).status).toBe(504);
  });

  it("falha desconhecida carrega a mensagem original", () => {
    /*
      Ela é a única pista de quem administra. Trocá-la por texto genérico apaga
      a investigação inteira.
    */
    const resposta = aiErrorResponse(falha("desconhecida", "SAFETY: blocked by filter"));

    expect(resposta.message).toContain("SAFETY: blocked by filter");
    expect(resposta.status).toBe(502);
  });

  it("desconhecida sem mensagem não inventa motivo", () => {
    const resposta = aiErrorResponse(falha("desconhecida"));

    expect(resposta.message).toContain("sem dizer o motivo");
  });

  it("provedor declarado e indisponível é nomeado", () => {
    /*
      Um `AI_PROVIDER` escrito errado e um ambiente sem chave nenhuma são
      problemas diferentes, e quem administra precisa saber qual dos dois é.
    */
    const resposta = aiErrorResponse(new AIConfigurationError("claude"));

    expect(resposta.message).toContain("claude");
    expect(resposta.status).toBe(503);
  });

  it("sem nada configurado, a mensagem não nomeia provedor nenhum", () => {
    const resposta = aiErrorResponse(new AIConfigurationError());

    expect(resposta.message).toContain("não está configurado");
    expect(resposta.status).toBe(503);
  });

  it("análise em formato inválido é 422, não erro de servidor", () => {
    // O provedor respondeu; foi o conteúdo que não serviu.
    expect(aiErrorResponse(new InvalidAnalysisResponseError()).status).toBe(422);
  });

  it("erro que não é nosso vira 500 sem vazar detalhe", () => {
    const resposta = aiErrorResponse(new Error("ENOENT: /etc/segredo"));

    expect(resposta.status).toBe(500);
    expect(resposta.message).not.toContain("segredo");
  });
});
