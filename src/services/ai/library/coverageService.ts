import "server-only";

import { buildCoveragePrompt } from "../prompts/coveragePrompt";
import { activeProvider } from "../server/providerRegistry";
import {
  getCoverageJsonSchema,
  parseCoverage,
  type CoverageRequest,
  type CoverageResult,
} from "./coverage";

/**
 * Avalia se o acervo já responde o assunto, e escreve o rascunho quando não.
 *
 * O contrato vai como `schema` e não só como instrução: a análise do
 * atendimento já mostrou que pedir JSON por prompt volta prosa uma vez em duas,
 * e aqui a resposta tem forma demais para se perder assim.
 *
 * A conferência de identificador acontece na volta, em `parseCoverage`: artigo
 * que o modelo inventou vira ausência, não referência.
 */
export const coverageService = {
  async execute(request: CoverageRequest): Promise<CoverageResult | null> {
    const raw = await activeProvider().complete(buildCoveragePrompt(request), {
      json: true,
      schema: getCoverageJsonSchema(),
    });

    return parseCoverage(raw, request);
  },
};
