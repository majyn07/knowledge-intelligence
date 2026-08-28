import type { KnowledgeAnalysisResult } from "@/features/analysis/types/KnowledgeAnalysisResult";

import { InvalidAnalysisResponseError } from "../analysis/analysisErrors";
import { analysisResponseSchema } from "../prompts/analysisResponseSchema";

export function parseAnalysisResponse(response: string): KnowledgeAnalysisResult {
  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(response.trim());
  } catch {
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
