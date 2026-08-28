import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { startAnalysisRequestSchema } from "@/services/ai/analysis/analysisRequestSchema";
import { startAnalysisService } from "@/services/ai/analysis/startAnalysisService";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "O corpo da solicitação deve ser um JSON válido." }, { status: 400 });
  }

  const parsedRequest = startAnalysisRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({
        message: invalidRequestMessage("Dados inválidos para iniciar a análise.", parsedRequest.error),
      }, { status: 400 });
  }

  try {
    return NextResponse.json(await startAnalysisService.execute(parsedRequest.data));
  } catch (error) {
    /*
      A classificação vive em `aiErrorResponse`, compartilhada com a rota de
      conversa: escritas em separado, as duas divergem. O registro no servidor
      guarda o erro inteiro, que não vai para a resposta.
    */
    console.error("START_ANALYSIS_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}
