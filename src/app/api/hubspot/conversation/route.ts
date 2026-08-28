import { NextResponse } from "next/server";

import {
  HubSpotFailure,
  hubspotConfigured,
  type HubSpotFailureKind,
} from "@/services/hubspot/hubspotClient";
import { hubspotConversationService } from "@/services/hubspot/conversationService";

/**
 * A conversa de um atendimento, pelo número dele na HubSpot.
 *
 * O acervo vive no navegador, mas a credencial não pode: ela é server-only, e
 * é por isso que este pedido existe em vez de a tela falar direto com a API.
 */

const STATUS_POR_FALHA: Record<HubSpotFailureKind, number> = {
  "sem-credencial": 503,
  "credencial-recusada": 502,
  "sem-permissao": 502,
  "prazo-esgotado": 504,
  falha: 502,
};

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

  const externalId =
    body && typeof body === "object" && "externalId" in body
      ? String((body as { externalId: unknown }).externalId ?? "").trim()
      : "";

  if (!externalId) {
    return NextResponse.json(
      { message: "Informe o número do atendimento na HubSpot." },
      { status: 400 }
    );
  }

  try {
    const { messages, threadIds } = await hubspotConversationService.byExternalId(externalId);
    return NextResponse.json({ messages, threads: threadIds.length });
  } catch (error) {
    if (error instanceof HubSpotFailure) {
      /*
        Credencial ausente é estado previsto e não merece barulho no log; o
        resto é problema de quem administra e precisa aparecer.
      */
      if (error.kind !== "sem-credencial") console.error("HUBSPOT_CONVERSATION_ERROR", error);

      return NextResponse.json(
        { message: error.message },
        { status: STATUS_POR_FALHA[error.kind] }
      );
    }

    console.error("HUBSPOT_CONVERSATION_ERROR", error);
    return NextResponse.json(
      { message: "Não foi possível trazer a conversa da HubSpot." },
      { status: 500 }
    );
  }
}

/** A tela pergunta antes de oferecer o botão: botão morto é pior que botão ausente. */
export async function GET() {
  return NextResponse.json({ configured: hubspotConfigured() });
}
