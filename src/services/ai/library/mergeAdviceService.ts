import "server-only";

import { buildMergePrompt } from "../prompts/mergePrompt";
import { activeProvider } from "../server/providerRegistry";
import { getMergeJsonSchema, parseMergeAdvice, type MergeAdvice, type MergeRequest } from "./mergeAdvice";

/**
 * A leitura dos dois artigos.
 *
 * O provedor é resolvido a cada chamada, como no resto da fronteira, e a
 * geração é restringida pelo contrato: pedir JSON por texto voltou prosa uma
 * vez em duas quando isto foi medido na análise.
 */
export const mergeAdviceService = {
  async advise(request: MergeRequest): Promise<MergeAdvice> {
    const bruto = await activeProvider().complete(buildMergePrompt(request), {
      json: true,
      schema: getMergeJsonSchema(),
    });

    return parseMergeAdvice(bruto, [request.a.id, request.b.id]);
  },
};
