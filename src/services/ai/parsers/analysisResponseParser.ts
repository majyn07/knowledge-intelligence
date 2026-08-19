import type { KnowledgeAnalysisResult } from "@/features/analysis/types/KnowledgeAnalysisResult";

import { InvalidAnalysisResponseError } from "../analysis/analysisErrors";
import { analysisResponseSchema } from "../prompts/analysisResponseSchema";

export function parseAnalysisResponse(response: string): KnowledgeAnalysisResult {
  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(response.trim());
  } catch {
    throw new InvalidAnalysisResponseError();
  }

  const validation = analysisResponseSchema.safeParse(parsedResponse);
  if (!validation.success) throw new InvalidAnalysisResponseError();

  return {
    ...validation.data,
    opportunities: validation.data.opportunities.map((opportunity) => ({
      ...opportunity,
      id: crypto.randomUUID(),
      status: "proposed",
    })),
  };
}
