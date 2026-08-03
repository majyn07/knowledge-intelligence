import { NextResponse } from "next/server";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { analysisAIService } from "@/services/ai/analysis/analysisAIService";
import { buildAIContext } from "@/services/ai/context/aiContextBuilder";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context, messages } = body;

    const chatRequest: AIChatRequest = {
      context,
      messages,
    };

    const enrichedContext = await buildAIContext(chatRequest);

    const response = await analysisAIService.chat({
      ...chatRequest,
      context: enrichedContext,
    });

    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error("ANALYSIS_CHAT_ERROR", error);

    return NextResponse.json(
      {
        message: "Ocorreu um erro ao processar a solicitação. Tente novamente.",
      },
      {
        status: 500,
      }
    );
  }
}
