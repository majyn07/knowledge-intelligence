import type { AIChatRequest } from "@/models/AIChatRequest";
import type { StartAnalysisResponse } from "@/models/StartAnalysisResponse";

import { parseAnalysisResponse } from "../parsers/analysisResponseParser";
import { analysisAIService } from "./analysisAIService";

export const startAnalysisService = {
  async execute(
    request: AIChatRequest
  ): Promise<StartAnalysisResponse> {
    const response = await analysisAIService.analyze(request);

    const analysisResult = parseAnalysisResponse(response);

    const messages = [
      {
        id: crypto.randomUUID(),
        author: "assistant" as const,
        message:
          "Análise concluída. Consulte os resultados estruturados ao lado.",
        createdAt: new Date().toISOString(),
        status: "completed" as const,
      },
    ];

    return {
      analysisResult,
      messages,
      context: request.context!,
    };
  },
};
