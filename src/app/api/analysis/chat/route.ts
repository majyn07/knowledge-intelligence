import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { analysisChatRequestSchema } from "@/services/ai/analysis/analysisRequestSchema";
import { analysisAIService } from "@/services/ai/analysis/analysisAIService";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "O corpo da solicitação deve ser um JSON válido." }, { status: 400 });
  }

  const parsedRequest = analysisChatRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ message: "Dados inválidos para a conversa com a IA." }, { status: 400 });
  }

  try {
    const message = await analysisAIService.chat(parsedRequest.data);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("ANALYSIS_CHAT_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}
