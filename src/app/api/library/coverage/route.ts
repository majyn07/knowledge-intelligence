import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/services/ai/analysis/aiErrorResponse";
import { invalidRequestMessage } from "@/services/ai/analysis/invalidRequest";
import { coverageRequestSchema } from "@/services/ai/library/coverage";
import { coverageService } from "@/services/ai/library/coverageService";

/**
 * "O acervo já responde isto?", perguntado na hora de escrever.
 *
 * Os candidatos e os modelos chegam do cliente já escolhidos, pela mesma razão
 * da análise e da sugestão de seção: o acervo vive no navegador, e o servidor
 * recebe a evidência resolvida em vez de tentar ler uma base à qual não tem
 * acesso.
 *
 * Os tetos de candidatos e modelos estão no schema. Sem eles, alguém mandaria o
 * acervo inteiro num prompt só e receberia uma resposta truncada que ninguém
 * saberia estar truncada.
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

  const parsed = coverageRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: invalidRequestMessage("Dados inválidos para avaliar o acervo.", parsed.error) },
      { status: 400 }
    );
  }

  try {
    const resultado = await coverageService.execute(parsed.data);

    /*
      Resposta que não passou no contrato não vira "nada encontrado": as duas
      levam a pessoa a escrever, e só uma delas é uma resposta. 422 é o mesmo
      código que a análise usa para o mesmo caso.
    */
    if (!resultado) {
      return NextResponse.json(
        { message: "A IA respondeu num formato inválido. Peça de novo." },
        { status: 422 }
      );
    }

    return NextResponse.json({ resultado });
  } catch (error) {
    console.error("COVERAGE_ERROR", error);

    const { status, message } = aiErrorResponse(error);
    return NextResponse.json({ message }, { status });
  }
}
