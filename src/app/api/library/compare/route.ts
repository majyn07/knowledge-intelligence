import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";
import { mergeRequestSchema } from "@/services/ai/library/mergeAdvice";
import { mergeAdviceService } from "@/services/ai/library/mergeAdviceService";
import { resolveActiveProvider } from "@/services/ai/providers/catalog";

/**
 * "Estes dois deveriam ser um só?"
 *
 * Os dois artigos chegam junto do pedido: o acervo vive no navegador, e o
 * servidor recebe a evidência já resolvida em vez de sair procurando. Mesma
 * forma da avaliação de cobertura e da consulta sobre o artigo.
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

  const parsed = mergeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: invalidRequestMessage("Dados inválidos para comparar os artigos.", parsed.error) },
      { status: 400 }
    );
  }

  try {
    const advice = await mergeAdviceService.advise(parsed.data);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("MERGE_ADVICE_ERROR", error);

    /*
      `retriable` vai junto porque a varredura em lote precisa decidir entre
      tentar de novo e parar, e limite estourado e provedor mal configurado
      respondem códigos que não os separam.
    */
    const { status, message, retriable } = aiErrorResponse(error);
    return NextResponse.json({ message, retriable }, { status });
  }
}

/** Se há provedor: a tela pergunta antes de oferecer o botão. */
export async function GET() {
  const ativo = resolveActiveProvider(process.env);

  return NextResponse.json({ configured: ativo.id !== null, provider: ativo.id });
}
