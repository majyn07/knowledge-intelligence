import { NextResponse } from "next/server";

import {
  HubSpotFailure,
  hubspotConfigured,
  type HubSpotFailureKind,
} from "@/services/hubspot/hubspotClient";
import { hubspotTicketService } from "@/services/hubspot/ticketService";

/**
 * Os atendimentos da HubSpot.
 *
 * Escrita antes de a credencial poder chamá-la: hoje toda chamada volta 502
 * com `sem-permissao`, porque o escopo `tickets` não está no app privado. A
 * rota existe assim mesmo porque o que falta é permissão de terceiro, e o
 * código que depende dela é conferível por teste desde já.
 *
 * O mesmo mapa de falha da conversa, e de propósito: escritos em separado, os
 * dois divergem.
 */

const STATUS_POR_FALHA: Record<HubSpotFailureKind, number> = {
  "sem-credencial": 503,
  "credencial-recusada": 502,
  "sem-permissao": 502,
  "prazo-esgotado": 504,
  falha: 502,
};

/** Teto do pedido. Sem ele, um número grande na URL prenderia a rota por minutos. */
const LIMITE_MAXIMO = 500;

function responderFalha(error: unknown, contexto: string) {
  if (error instanceof HubSpotFailure) {
    /*
      Credencial ausente é estado previsto e não merece barulho no log; o
      resto é problema de quem administra e precisa aparecer.
    */
    if (error.kind !== "sem-credencial") console.error(contexto, error);

    return NextResponse.json({ message: error.message }, { status: STATUS_POR_FALHA[error.kind] });
  }

  console.error(contexto, error);

  return NextResponse.json(
    { message: "Não foi possível trazer os atendimentos da HubSpot." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  if (!hubspotConfigured()) {
    return NextResponse.json({ configured: false, tickets: [], ilegiveis: 0 });
  }

  const url = new URL(request.url);
  const externalId = (url.searchParams.get("externalId") ?? "").trim();

  try {
    if (externalId) {
      const ticket = await hubspotTicketService.byExternalId(externalId);

      return ticket
        ? NextResponse.json({ configured: true, tickets: [ticket], ilegiveis: 0 })
        : NextResponse.json(
            { message: "A HubSpot não tem atendimento com esse número." },
            { status: 404 }
          );
    }

    const bruto = Number(url.searchParams.get("limite") ?? "100");
    const limite = Number.isFinite(bruto) ? Math.min(Math.max(1, bruto), LIMITE_MAXIMO) : 100;

    const { tickets, ilegiveis } = await hubspotTicketService.list({ limite });

    return NextResponse.json({ configured: true, tickets, ilegiveis });
  } catch (error) {
    return responderFalha(error, "HUBSPOT_TICKETS_ERROR");
  }
}
