import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { sectionSuggestionRequestSchema } from "@/services/ai/classify/sectionSuggestion";
import { suggestSectionService } from "@/services/ai/classify/suggestSectionService";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";

/**
 * Sugestão de seção para artigos sem classificação.
 *
 * O vocabulário chega do cliente junto com os artigos, pela mesma razão da
 * análise: o acervo e o cadastro vivem no navegador, e o servidor recebe a
 * evidência já resolvida em vez de sair procurando.
 *
 * O teto de artigos por pedido está no schema. Sem ele, alguém com mil e
 * oitocentos artigos sem seção mandaria os mil e oitocentos num prompt só, e o
 * modelo devolveria uma resposta truncada que ninguém saberia estar truncada.
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

  const parsed = sectionSuggestionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: invalidRequestMessage("Dados inválidos para sugerir seção.", parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const suggestions = await suggestSectionService.execute(parsed.data);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("SUGGEST_SECTION_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}
