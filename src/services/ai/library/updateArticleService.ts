import "server-only";

import { buildUpdateArticlePrompt } from "../prompts/updateArticlePrompt";
import { activeProvider } from "../server/providerRegistry";
import {
  getUpdateArticleJsonSchema,
  parseUpdatedArticle,
  type UpdateArticleRequest,
  type UpdatedArticle,
} from "./updateArticle";

/**
 * A atualização de um artigo com material novo.
 *
 * Geração restringida pelo contrato, como no resto da fronteira. E o resultado
 * é proposta: nada é gravado aqui. Quem abre o editor com o texto atualizado
 * decide se salva, e o publicado continua no ar enquanto isso.
 */
export const updateArticleService = {
  async execute(request: UpdateArticleRequest): Promise<UpdatedArticle> {
    const bruto = await activeProvider().complete(buildUpdateArticlePrompt(request), {
      json: true,
      schema: getUpdateArticleJsonSchema(),
    });

    return parseUpdatedArticle(bruto);
  },
};
