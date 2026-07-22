import { GoogleGenAI } from "@google/genai";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildAnalysisPrompt } from "../prompts/analysisPromptBuilder";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export const geminiService = {
  async chat(request: AIChatRequest): Promise<string> {
    const prompt = buildAnalysisPrompt(request);

    const response =
      await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
          .map(
            (message) =>
              `### ${message.role.toUpperCase()}\n${message.content}`
          )
          .join("\n\n"),
      });

    return response.text ?? "";
  },
};