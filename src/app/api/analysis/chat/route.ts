import { NextResponse } from "next/server";

import { AIConfigurationError, AIProviderError } from "@/services/ai/analysis/analysisErrors";
import { analysisChatRequestSchema } from "@/services/ai/analysis/analysisRequestSchema";
import { analysisAIService } from "@/services/ai/analysis/analysisAIService";
import { buildAIContext } from "@/services/ai/context/aiContextBuilder";

function errorResponse(error: unknown) {
  if (error instanceof AIConfigurationError) {
    return NextResponse.json({ message: "O serviço de IA não está configurado." }, { status: 503 });
  }
  if (error instanceof AIProviderError) {
    return NextResponse.json({ message: "O serviço de IA está indisponível. Tente novamente." }, { status: 503 });
  }
  console.error("ANALYSIS_CHAT_ERROR");
  return NextResponse.json({ message: "Não foi possível processar a solicitação." }, { status: 500 });
}

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
    const context = await buildAIContext(parsedRequest.data);
    const message = await analysisAIService.chat({ ...parsedRequest.data, context });
    return NextResponse.json({ message });
  } catch (error) {
    return errorResponse(error);
  }
}
