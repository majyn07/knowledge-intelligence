import type { AIChatRequest } from "@/models/AIChatRequest";

import { geminiService } from "../server/geminiService";

export const chatAnalysisService = {
  async execute(
    request: AIChatRequest
  ): Promise<string> {
    return geminiService.chat(request);
  },
};