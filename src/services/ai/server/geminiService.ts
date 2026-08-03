import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildAnalysisPrompt } from "../prompts/analysisPromptBuilder";
import { buildStructuredAnalysisPrompt } from "../prompts/structuredAnalysisPromptBuilder";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

async function generate(
  request: AIChatRequest,
  builder: (request: AIChatRequest) => {
    role: "system" | "user" | "assistant";
    content: string;
  }[]
): Promise<string> {
  const prompt = builder(request);

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
      .map(
        (message) =>
          `### ${message.role.toUpperCase()}\n${message.content}`
      )
      .join("\n\n"),
  });

  return response.text ?? "";
}

export const geminiService = {
  chat(request: AIChatRequest) {
    return generate(request, buildAnalysisPrompt);
  },

  analyze(request: AIChatRequest) {
    return generate(request, buildStructuredAnalysisPrompt);
  },
};
