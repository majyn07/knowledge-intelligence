import { NextResponse } from "next/server";

import {
  AIConfigurationError,
  AIProviderError,
  InvalidAnalysisResponseError,
} from "@/services/ai/analysis/analysisErrors";
import { startAnalysisRequestSchema } from "@/services/ai/analysis/analysisRequestSchema";
import { startAnalysisService } from "@/services/ai/analysis/startAnalysisService";

function errorResponse(error: unknown) {
  if (error instanceof AIConfigurationError) {
    return NextResponse.json({ message: "O serviço de IA não está configurado." }, { status: 503 });
  }
  if (error instanceof AIProviderError) {
    return NextResponse.json({ message: "O serviço de IA está indisponível. Tente novamente." }, { status: 503 });
  }
  if (error instanceof InvalidAnalysisResponseError) {
    return NextResponse.json({ message: "A IA retornou uma análise inválida. Tente novamente." }, { status: 422 });
  }
  console.error("START_ANALYSIS_ERROR");
  return NextResponse.json({ message: "Não foi possível processar a análise." }, { status: 500 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "O corpo da solicitação deve ser um JSON válido." }, { status: 400 });
  }

  const parsedRequest = startAnalysisRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ message: "Dados inválidos para iniciar a análise." }, { status: 400 });
  }

  try {
    return NextResponse.json(await startAnalysisService.execute(parsedRequest.data));
  } catch (error) {
    return errorResponse(error);
  }
}
