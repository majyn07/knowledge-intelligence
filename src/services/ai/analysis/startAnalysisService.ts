import type { AIChatRequest } from "@/models/AIChatRequest";
import type { StartAnalysisResponse } from "@/models/StartAnalysisResponse";

import { buildAIContext } from "../context/aiContextBuilder";
import { parseAnalysisResponse } from "../parsers/analysisResponseParser";
import { analysisAIService } from "./analysisAIService";

import { analysisConversation } from "@/features/analysis/mock/analysisConversation";

export const startAnalysisService = {
  async execute(
    request: AIChatRequest
  ): Promise<StartAnalysisResponse> {
    const context = await buildAIContext(request);

    const response = await analysisAIService.analyze({
      ...request,
      context,
    });

    const analysisResult = parseAnalysisResponse(response);

    const messages = [
      ...analysisConversation,
      {
        id: crypto.randomUUID(),
        author: "assistant" as const,
        message:
          "Análise concluída. Consulte os resultados estruturados ao lado.",
        createdAt: new Date().toLocaleString(),
        status: "completed" as const,
      },
    ];

    return {
      analysisResult,
      messages,
      context: context!,
    };
  },
};
