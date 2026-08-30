import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";
import { assistantRequestSchema } from "@/services/ai/assistant/assistant";
import { assistantService } from "@/services/ai/assistant/assistantService";
import { resolveActiveProvider } from "@/services/ai/providers/catalog";

/**
 * Conversar com a IA sobre a tela aberta.
 *
 * O retrato da tela chega junto do pedido, pela mesma razão da análise e da
 * consulta sobre o artigo: os dados vivem no navegador, e o servidor recebe a
 * evidência já resolvida em vez de sair procurando.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "O corpo da solicitação deve ser um JSON válido." },
      { status: 400 }
    );
  }

  const parsed = assistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: invalidRequestMessage("Dados inválidos para conversar com a IA.", parsed.error) },
      { status: 400 }
    );
  }

  try {
    const message = await assistantService.ask(parsed.data);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("ASSISTANT_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}

/**
 * Se há provedor configurado.
 *
 * A tela pergunta antes de oferecer o painel: botão que às vezes leva a lugar
 * nenhum é pior que botão que ainda não existe. É a mesma regra do botão de
 * entrar com a conta Google.
 */
export async function GET() {
  const ativo = resolveActiveProvider(process.env);

  return NextResponse.json({ configured: ativo.id !== null, provider: ativo.id });
}
