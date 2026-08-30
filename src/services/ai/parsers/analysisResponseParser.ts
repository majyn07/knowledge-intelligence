import type { KnowledgeAnalysisResult } from "@/features/analysis/types/KnowledgeAnalysisResult";

import { InvalidAnalysisResponseError } from "../analysis/analysisErrors";
import { analysisResponseSchema } from "../prompts/analysisResponseSchema";
import { jsonDoModelo } from "./jsonDoModelo";

export function parseAnalysisResponse(response: string): KnowledgeAnalysisResult {
  /*
    O mesmo leitor dos outros dois parsers.

    Este chamava `JSON.parse` direto e morria com a cerca de crase que o modelo
    às vezes acrescenta — enquanto a sugestão de seção e o preenchimento de
    formulário já a toleravam. Contra a API real isso foi uma análise perdida em
    duas.
  */
  const parsedResponse = jsonDoModelo(response);

  if (parsedResponse === null) {
    /*
      O começo do que veio vai para o registro do servidor, e não para a tela.

      "A resposta não é um JSON" sozinho não diz se o modelo devolveu uma
      desculpa em português, um bloco cercado por crases ou um JSON cortado — e
      as três pedem providências diferentes. É o mesmo princípio das falhas de
      provedor: o texto original é a única pista de quem administra.

      Só no servidor porque a resposta pode conter o caso do cliente, e nenhum
      conteúdo do pedido é copiado para a resposta da rota.
    */
    console.error("ANALYSIS_RESPONSE_NOT_JSON", response.trim().slice(0, 400));

    throw new InvalidAnalysisResponseError(["a resposta não é um JSON"]);
  }

  const validation = analysisResponseSchema.safeParse(parsedResponse);

  if (!validation.success) {
    throw new InvalidAnalysisResponseError(
      validation.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "raiz"}: ${issue.message}`)
    );
  }

  return {
    ...validation.data,
    opportunities: validation.data.opportunities.map((opportunity) => ({
      ...opportunity,
      id: crypto.randomUUID(),
      status: "proposed",
    })),
  };
}
