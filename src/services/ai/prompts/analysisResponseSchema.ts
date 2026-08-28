import { z } from "zod";

const opportunityTypes = [
  "new_article",
  "update_article",
  "faq",
  "tip",
  "warning",
] as const;

const documentationStatuses = [
  "adequate",
  "partial",
  "missing",
  "outdated",
] as const;

const confidenceLevels = ["high", "medium", "low"] as const;

/**
 * External contract requested from the AI provider. Workflow fields such as
 * opportunity id and status are intentionally internal and added by the parser.
 */
export const analysisResponseSchema = z.object({
  identification: z.object({
    ticketId: z.string().min(1),
    title: z.string().min(1),
    company: z.string(),
    solution: z.string().min(1),
    analyst: z.string().min(1).optional(),
    analyzedAt: z.string().datetime(),
  }).strict(),
  summary: z.object({
    resume: z.string().min(1),
    customerProblem: z.string().min(1),
    rootCause: z.string().min(1),
    supportAction: z.string().min(1),
    outcome: z.string().min(1),
  }).strict(),
  classification: z.object({
    documentationStatus: z.enum(documentationStatuses),
    confidenceLevel: z.enum(confidenceLevels),
  }).strict(),
  confidence: z.number().min(0).max(100),
  relatedArticles: z.number().int().nonnegative(),
  opportunities: z.array(z.object({
    type: z.enum(opportunityTypes),
    title: z.string().min(1),
    description: z.string().min(1),
    justification: z.string().min(1),
  }).strict()),
}).strict();

export type GeneratedAnalysisResponse = z.infer<typeof analysisResponseSchema>;

/**
 * O contrato como o modelo o vê, sem o cabeçalho do formato.
 *
 * `z.toJSONSchema` acrescenta `$schema`, que declara qual dialeto de JSON
 * Schema o documento usa. É metadado do documento, não campo da resposta, e o
 * modelo não tem como saber a diferença: mostrado um objeto com `$schema`
 * dentro e a instrução de responder nesta forma, ele devolvia `$schema` junto.
 *
 * O contrato de saída é estrito de propósito, então a chave a mais derrubava a
 * análise inteira. Toda vez, com "não foi possível concluir a análise" na tela,
 * que é a mesma frase de quando a chave da API está errada.
 */
export function getAnalysisResponseJsonSchema() {
  const contrato: Record<string, unknown> = z.toJSONSchema(analysisResponseSchema);
  delete contrato.$schema;

  return contrato;
}
