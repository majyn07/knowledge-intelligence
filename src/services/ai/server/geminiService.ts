import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { AIConfigurationError, AIProviderError } from "../analysis/analysisErrors";
import { buildAnalysisPrompt } from "../prompts/analysisPromptBuilder";
import { buildStructuredAnalysisPrompt } from "../prompts/structuredAnalysisPromptBuilder";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIConfigurationError();
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
      model: "gemini-2.5-flash",
      contents,
      config: {
        ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
        ...(isJson ? { responseMimeType: "application/json" } : {}),
      },
    });

    if (!response.text) throw new AIProviderError();
    return response.text;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError();
  }
}

export const geminiService = {
  chat(request: AIChatRequest) {
    return generate(request, buildAnalysisPrompt);
  },
  analyze(request: AIChatRequest) {
    return generate(request, buildStructuredAnalysisPrompt, true);
  },
};
