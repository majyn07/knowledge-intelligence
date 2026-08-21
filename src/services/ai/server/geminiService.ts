import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { AIConfigurationError, AIProviderError } from "../analysis/analysisErrors";
import { buildAnalysisPrompt } from "../prompts/analysisPromptBuilder";
import { buildStructuredAnalysisPrompt } from "../prompts/structuredAnalysisPromptBuilder";
import { AI_TIMEOUT_MS, type AIProvider } from "../providers/AIProvider";
import { classifyProviderFailure } from "../providers/providerFailure";

const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIConfigurationError("gemini");
  return new GoogleGenAI({ apiKey });
}

async function generate(
  request: AIChatRequest,
  builder: (request: AIChatRequest) => { role: "system" | "user" | "assistant"; content: string }[],
  isJson = false
): Promise<string> {
  const client = getClient();
  const promptMessages = builder(request);
  const systemMessage = promptMessages.find((message) => message.role === "system");
  const contents = promptMessages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
    .join("\n\n");

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        // Sem prazo, um pedido pendurado prende a rota até o teto da
        // plataforma, e quem pediu a análise fica olhando um botão girar.
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
        ...(isJson ? { responseMimeType: "application/json" } : {}),
      },
    });

    /*
      Resposta vazia não é falha de rede: o modelo respondeu e não disse nada —
      filtro de segurança, ou geração interrompida. Vale a mesma classificação
      de desconhecida, mas com o motivo escrito, senão vira "indisponível" e
      manda tentar de novo para sempre.
    */
    if (!response.text) {
      throw new AIProviderError("gemini", {
        kind: "desconhecida",
        detail: "O modelo respondeu sem conteúdo.",
      });
    }

    return response.text;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;

    throw new AIProviderError("gemini", classifyProviderFailure(error));
  }
}

export const geminiService: AIProvider = {
  id: "gemini",

  chat(request: AIChatRequest) {
    return generate(request, buildAnalysisPrompt);
  },

  analyze(request: AIChatRequest) {
    return generate(request, buildStructuredAnalysisPrompt, true);
  },
};
