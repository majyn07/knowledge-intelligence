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

export function getAnalysisResponseJsonSchema() {
  return z.toJSONSchema(analysisResponseSchema);
}
