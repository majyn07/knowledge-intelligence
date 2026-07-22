import type { AIChatRequest } from "@/models/AIChatRequest";
import type { StartAnalysisResponse } from "@/models/StartAnalysisResponse";

import { buildAIContext } from "../context/aiContextBuilder";
import { geminiService } from "../server/geminiService";

import { mockAnalysisResult } from "@/features/analysis/mock/analysisResult";
import { analysisConversation } from "@/features/analysis/mock/analysisConversation";

export const startAnalysisService = {
  async execute(
    request: AIChatRequest
  ): Promise<StartAnalysisResponse> {
    const context = await buildAIContext(request);

    const firstResponse = await geminiService.chat({
      ...request,
      context,
    });

    const messages = [
      ...analysisConversation,
      {
        id: crypto.randomUUID(),
        author: "assistant" as const,
        message: firstResponse,
        createdAt: new Date().toLocaleString(),
        status: "completed" as const,
      },
    ];

    return {
      analysisResult: mockAnalysisResult,
      messages,
      context: context!,
    };
  },
};