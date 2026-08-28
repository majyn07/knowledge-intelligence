import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { articleChatRequestSchema } from "@/services/ai/library/articleChat";
import { articleChatService } from "@/services/ai/library/articleChatService";
import { resolveActiveProvider } from "@/services/ai/providers/catalog";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";

/**
 * Consultar a IA sobre o artigo aberto.
 *
 * O acervo vive no navegador, então o artigo chega junto do pedido. Mesma
 * forma da análise e da sugestão de seção: o servidor recebe a evidência já
 * resolvida em vez de sair procurando.
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

  const parsed = articleChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: invalidRequestMessage("Dados inválidos para consultar a IA sobre o artigo.", parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const message = await articleChatService.ask(parsed.data);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("ARTICLE_CHAT_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}

/**
 * Se há provedor configurado.
 *
 * A tela pergunta antes de oferecer o painel, pela mesma razão do botão de
 * entrar com a conta Google e do botão de trazer a conversa: botão que às vezes
 * leva a lugar nenhum é pior que botão que ainda não existe.
 */
export async function GET() {
  /*
    Um provedor **em uso**, não apenas configurado: com chave declarada e
    ausente, `resolveActiveProvider` devolve `id: null`, e oferecer o painel
    ali levaria a um erro que a tela já sabia que ia acontecer.
  */
  const ativo = resolveActiveProvider(process.env);

  return NextResponse.json({ configured: ativo.id !== null, provider: ativo.id });
}
