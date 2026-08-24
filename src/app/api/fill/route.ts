import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { fieldFillRequestSchema } from "@/services/ai/fill/fieldFill";
import { fieldFillService } from "@/services/ai/fill/fieldFillService";

/**
 * Preenchimento de formulário a partir do que a pessoa escreveu ou anexou.
 *
 * O vocabulário chega do cliente junto com o texto, pela mesma razão da
 * análise e da sugestão de seção: o cadastro vive no navegador, e o servidor
 * recebe a evidência já resolvida em vez de sair procurando.
 *
 * O teto de texto está no schema. Sem ele, um documento de duzentas páginas
 * entra inteiro num prompt só e volta truncado sem ninguém saber que truncou.
 *
 * Nada aqui grava. A resposta é proposta, e quem decide é quem abriu o
 * formulário.
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

  const parsed = fieldFillRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos para preencher o formulário." },
      { status: 400 }
    );
  }

  try {
    const result = await fieldFillService.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("FIELD_FILL_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}
