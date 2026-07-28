import { NextResponse } from "next/server";

import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildAIContext } from "@/services/ai/context/aiContextBuilder";
import { geminiService } from "@/services/ai/server/geminiService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context, messages } = body;

    const chatRequest: AIChatRequest = {
      context,
      messages,
    };

    const enrichedContext = await buildAIContext(chatRequest);

    const response = await geminiService.chat({
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
