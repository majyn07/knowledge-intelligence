import type { AIChatRequest } from "@/models/AIChatRequest";

import { geminiService } from "../server/geminiService";

/**
 * Application-facing AI boundary for analysis workflows.
 * Provider selection remains isolated in the server provider layer.
 */
export const analysisAIService = {
  chat(request: AIChatRequest): Promise<string> {
    return geminiService.chat(request);
  },

  analyze(request: AIChatRequest): Promise<string> {
    return geminiService.analyze(request);
  },
};
