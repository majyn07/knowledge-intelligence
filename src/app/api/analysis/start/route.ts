import { NextResponse } from "next/server";

import type { AIChatRequest } from "@/models/AIChatRequest";
import { startAnalysisService } from "@/services/ai/analysis/startAnalysisService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context, messages } = body;

    const chatRequest: AIChatRequest = {
      context,
      messages,
    };

    const result = await startAnalysisService.execute(chatRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error("START_ANALYSIS_ERROR", error);

    return NextResponse.json(
      {
        message: "Ocorreu um erro ao processar a análise. Tente novamente.",
      },
      {
        status: 500,
      }
    );
  }
}
