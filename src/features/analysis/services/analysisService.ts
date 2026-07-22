import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { StartAnalysisResponse } from "@/models/StartAnalysisResponse";

export const analysisService = {
  async startAnalysis(
    context: AIContext
  ): Promise<StartAnalysisResponse> {
    const response = await fetch(
      "/api/analysis/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          messages: [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Erro ao iniciar a análise."
      );
    }

    return response.json();
  },

  async sendMessage(
    context: AIContext,
    messages: AnalysisMessage[],
    message: string
  ): Promise<AnalysisMessage> {
    const response = await fetch(
      "/api/analysis/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          messages,
          message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Erro ao comunicar com a IA."
      );
    }

    const data = await response.json();

    return {
      id: crypto.randomUUID(),
      author: "assistant",
      message: data.message,
      createdAt: new Date().toLocaleString(),
      status: "completed",
    };
  },
};