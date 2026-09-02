import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { StartAnalysisResponse } from "@/models/StartAnalysisResponse";

/**
 * O motivo que o servidor deu, e nao uma frase nossa.
 *
 * As rotas de IA respondem { message, retriable }: elas ja distinguem cota
 * estourada de chave recusada e de prazo, e dizem o que fazer em cada caso.
 * Trocar isso por texto generico manda repetir um pedido que vai falhar igual, e
 * apaga a unica pista de quem administra.
 */
async function motivoDaFalha(response: Response, padrao: string): Promise<string> {
  try {
    const corpo: unknown = await response.json();

    if (typeof corpo === "object" && corpo !== null && "message" in corpo) {
      const { message } = corpo as { message: unknown };
      if (typeof message === "string" && message.trim() !== "") return message;
    }
  } catch {
    /* Resposta sem JSON: fica o padrao, que ao menos diz o que falhou. */
  }

  return padrao;
}

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
      throw new Error(await motivoDaFalha(response, "Não foi possível iniciar a análise."));
    }

    return response.json();
  },

  async sendMessage(
    context: AIContext,
    messages: AnalysisMessage[]
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
      createdAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
