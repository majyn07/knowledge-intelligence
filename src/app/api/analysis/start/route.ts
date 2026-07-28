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
    console.error("========== START ANALYSIS ERROR ==========");
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
      },
      {
        status: 500,
      }
    );
  }
}