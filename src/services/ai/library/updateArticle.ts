import { z } from "zod";

import { jsonDoModelo } from "../parsers/jsonDoModelo";

/**
 * Atualizar um artigo existente com material novo.
 *
 * A avaliação de cobertura já dizia, com "parcial", **o que falta** no artigo
 * existente — e parava aí. O rascunho que ela escrevia era um artigo novo, e
 * quem queria atualizar o existente ia lá e inseria à mão o que ela apontou.
 * Para o caso mais comum do suporte, uma versão nova do software com conteúdo
 * para acrescentar, isso era meio caminho.
 *
 * Aqui o modelo recebe o artigo inteiro e o material, e devolve **o artigo
 * atualizado**: mesma estrutura, mesmo tom, mesmo formato, com o que o material
 * acrescenta inserido no lugar certo. Quem revisa lê a diferença, e não
 * reescreve.
 *
 * O que mudou vem listado à parte. Sem isso, quem revisa um artigo de oito mil
 * caracteres precisaria comparar as duas versões inteiras para saber onde o
 * modelo mexeu — e um modelo que "melhora" um parágrafo que ninguém pediu para
 * tocar é exatamente o que a lista existe para expor.
 */

/** Quanto do artigo vai. Igual ao teto da comparação: os dois cabem no pedido. */
export const ARTIGO_NO_PEDIDO = 14_000;

/** Quanto de material vai. Um changelog de versão inteiro cabe folgado. */
export const MATERIAL_NO_PEDIDO = 20_000;

export const updateArticleRequestSchema = z
  .object({
    article: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        summary: z.string(),
        content: z.string().min(1).max(ARTIGO_NO_PEDIDO),
        /*
          O formato vai junto, e o modelo devolve no mesmo. O acervo do portal é
          HTML; devolver Markdown trocaria o formato do artigo na gravação, que
          é o defeito que a `contentFormat` foi criada para impedir.
        */
        contentFormat: z.enum(["markdown", "html"]),
        truncated: z.boolean(),
      })
      .strict(),
    material: z.string().min(1).max(MATERIAL_NO_PEDIDO),
  })
  .strict();

export type UpdateArticleRequest = z.infer<typeof updateArticleRequestSchema>;

export const updateArticleResponseSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    content: z.string().min(1),
    /** O que foi acrescentado ou alterado, item a item. É o que quem revisa lê primeiro. */
    mudancas: z.array(z.string().min(1)).min(1).max(20),
  })
  .strict();

export type UpdatedArticle = z.infer<typeof updateArticleResponseSchema>;

export function getUpdateArticleJsonSchema() {
  const contrato: Record<string, unknown> = z.toJSONSchema(updateArticleResponseSchema);
  delete contrato.$schema;

  return contrato;
}

export function parseUpdatedArticle(bruto: string): UpdatedArticle {
  return updateArticleResponseSchema.parse(jsonDoModelo(bruto));
}
