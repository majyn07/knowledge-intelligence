import { NextResponse } from "next/server";
import { requireMember } from "@/features/auth/requireAdmin";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { analysisChatRequestSchema } from "@/services/ai/analysis/analysisRequestSchema";
import { analysisAIService } from "@/services/ai/analysis/analysisAIService";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";

export async function POST(request: Request) {
  /*
    Entrou? Estas rotas gastam cota do provedor de IA ou fazem o servidor falar
    com maquina de fora, e estavam abertas para qualquer um que soubesse o
    endereco. A porta e o servidor, nao a tela: esconder o botao impede o clique
    e nao impede quem conhece o caminho.
  */
  const sessao = await requireMember();

  if (!sessao.ok) {
    return NextResponse.json({ message: sessao.message }, { status: sessao.status });
  }


  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "O corpo da solicitação deve ser um JSON válido." }, { status: 400 });
  }

  const parsedRequest = analysisChatRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({
        message: invalidRequestMessage("Dados inválidos para a conversa com a IA.", parsedRequest.error),
      }, { status: 400 });
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
