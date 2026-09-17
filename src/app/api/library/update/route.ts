import { NextResponse } from "next/server";

import { requireMember } from "@/features/auth/requireAdmin";
import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";
import { updateArticleRequestSchema } from "@/services/ai/library/updateArticle";
import { updateArticleService } from "@/services/ai/library/updateArticleService";

/**
 * Atualizar um artigo existente com material novo.
 *
 * O artigo chega junto do pedido: o acervo vive no navegador. Nada é gravado
 * aqui — a resposta abre no editor, e quem revisa decide.
 */
export async function POST(request: Request) {
  const sessao = await requireMember();

  if (!sessao.ok) {
    return NextResponse.json({ message: sessao.message }, { status: sessao.status });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "O corpo da solicitação deve ser um JSON válido." },
      { status: 400 }
    );
  }

  const parsed = updateArticleRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: invalidRequestMessage("Dados inválidos para atualizar o artigo.", parsed.error) },
      { status: 400 }
    );
  }

  try {
    const updated = await updateArticleService.execute(parsed.data);
    return NextResponse.json({ updated });
  } catch (error) {
    console.error("UPDATE_ARTICLE_ERROR", error);

    const { status, message, retriable } = aiErrorResponse(error);
    return NextResponse.json({ message, retriable }, { status });
  }
}
