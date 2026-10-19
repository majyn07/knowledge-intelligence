import { NextResponse } from "next/server";

import { requireAdmin } from "@/features/auth/requireAdmin";
import {
  HubSpotFailure,
  hubspotConfigured,
  type HubSpotFailureKind,
} from "@/services/hubspot/hubspotClient";
import {
  CLASSIFICACOES_POR_PEDIDO,
  hubspotTicketService,
} from "@/services/hubspot/ticketService";

/**
 * A classificação que o suporte fez, para os chamados que já estão aqui.
 *
 * Só leitura na HubSpot: dois pedidos por chamada desta rota, um pelo
 * vocabulário e um pelos chamados em lote. Quem grava é o nosso banco, pela
 * tela, numa escrita e num evento.
 *
 * A porta é a mesma da varredura — administrador e freio — porque é a mesma
 * máquina do outro lado. Cem chamados por pedido é o teto da HubSpot; o acervo
 * inteiro são onze idas, e quem chama vai em série.
 */

const STATUS_POR_FALHA: Record<HubSpotFailureKind, number> = {
  "sem-credencial": 503,
  "credencial-recusada": 502,
  "sem-permissao": 502,
  "prazo-esgotado": 504,
  falha: 502,
};

export async function POST(request: Request) {
  const autorizado = await requireAdmin();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
  }

  if (!hubspotConfigured()) {
    return NextResponse.json(
      { message: "A integração com a HubSpot não está configurada neste ambiente." },
      { status: 503 }
    );
  }

  let ids: string[] = [];

  try {
    const corpo: unknown = await request.json();
    const lista = (corpo as { ids?: unknown })?.ids;
    if (Array.isArray(lista)) ids = lista.filter((id): id is string => typeof id === "string");
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  if (ids.length === 0 || ids.length > CLASSIFICACOES_POR_PEDIDO) {
    return NextResponse.json(
      { message: `Mande de 1 a ${CLASSIFICACOES_POR_PEDIDO} números de chamado por pedido.` },
      { status: 400 }
    );
  }

  try {
    const { porId, ausentes } = await hubspotTicketService.classificacoes(ids);

    return NextResponse.json({ classificacoes: Object.fromEntries(porId), ausentes });
  } catch (error) {
    if (error instanceof HubSpotFailure) {
      if (error.kind !== "sem-credencial") console.error("HUBSPOT_CLASSIFICACAO_ERROR", error);

      return NextResponse.json({ message: error.message }, { status: STATUS_POR_FALHA[error.kind] });
    }

    console.error("HUBSPOT_CLASSIFICACAO_ERROR", error);

    return NextResponse.json(
      { message: "Não foi possível ler a classificação na HubSpot." },
      { status: 500 }
    );
  }
}
