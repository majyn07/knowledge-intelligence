import { NextResponse } from "next/server";

import {
  caixasConfiguradas,
  donosComEquipe,
  lerLote,
  POR_LOTE,
  umaPaginaDeFios,
} from "@/services/hubspot/helpDeskService";
import {
  HubSpotFailure,
  hubspotConfigured,
  type HubSpotFailureKind,
} from "@/services/hubspot/hubspotClient";

/**
 * A caixa do suporte, um pedaço por requisição.
 *
 * `GET` devolve uma página da listagem: cem fios, barato, e o cursor da
 * próxima. `POST` lê um lote de fios: caro, uma requisição à HubSpot por fio.
 *
 * Quem conduz o laço é a tela, como na varredura do portal. A listagem inteira
 * são umas 550 páginas e estouraria o prazo de uma requisição só, e quem
 * começou uma varredura de minutos precisa ver onde está e poder parar.
 */

const STATUS_POR_FALHA: Record<HubSpotFailureKind, number> = {
  "sem-credencial": 503,
  "credencial-recusada": 502,
  "sem-permissao": 502,
  "prazo-esgotado": 504,
  falha: 502,
};

function responderFalha(error: unknown) {
  if (error instanceof HubSpotFailure) {
    if (error.kind !== "sem-credencial") console.error("HUBSPOT_HELP_DESK_ERROR", error);

    return NextResponse.json({ message: error.message }, { status: STATUS_POR_FALHA[error.kind] });
  }

  console.error("HUBSPOT_HELP_DESK_ERROR", error);

  return NextResponse.json(
    { message: "Não foi possível falar com a HubSpot." },
    { status: 500 }
  );
}

/**
 * Uma página da listagem, ou as caixas quando ninguém pediu uma.
 *
 * A tela pergunta as caixas antes de começar: elas são declaradas no ambiente,
 * e oferecer varrer sem saber quais existem seria oferecer botão às cegas.
 */
export async function GET(request: Request) {
  if (!hubspotConfigured()) {
    return NextResponse.json({ configured: false, caixas: [] });
  }

  const url = new URL(request.url);
  const caixas = caixasConfiguradas(process.env);
  const inbox = (url.searchParams.get("caixa") ?? "").trim();

  try {
    if (inbox === "") {
      return NextResponse.json({ configured: true, caixas, donos: await donosComEquipe() });
    }

    /*
      Caixa fora da lista é recusada. O identificador vem da URL, e buscar
      qualquer caixa que alguém digitasse faria esta rota ler conversa de
      marketing e de vendas, que não é atendimento.
    */
    if (!caixas.includes(inbox)) {
      return NextResponse.json(
        { message: "Esta caixa não está declarada como origem de atendimento." },
        { status: 400 }
      );
    }

    const cursor = (url.searchParams.get("apos") ?? "").trim();
    const pagina = await umaPaginaDeFios(inbox, cursor || undefined);

    return NextResponse.json({ configured: true, ...pagina });
  } catch (error) {
    return responderFalha(error);
  }
}

/** Lê um lote de fios. Caro: uma ida à HubSpot por fio, mais a associação. */
export async function POST(request: Request) {
  if (!hubspotConfigured()) {
    return NextResponse.json(
      { message: "Não há credencial da HubSpot neste ambiente." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const bruto = body && typeof body === "object" && "fios" in body ? body.fios : null;
  const fios = Array.isArray(bruto) ? bruto : [];

  if (fios.length === 0) {
    return NextResponse.json({ message: "Informe os fios a ler." }, { status: 400 });
  }

  if (fios.length > POR_LOTE) {
    return NextResponse.json(
      { message: `O lote não pode passar de ${POR_LOTE} fios.` },
      { status: 400 }
    );
  }

  try {
    const lote = fios.map((fio) => {
      const registro = fio as Record<string, unknown>;

      return {
        id: String(registro.id ?? "").trim(),
        criadoEm: String(registro.criadoEm ?? ""),
        ...(registro.ultimaMensagemEm
          ? { ultimaMensagemEm: String(registro.ultimaMensagemEm) }
          : {}),
      };
    });

    if (lote.some((fio) => fio.id === "")) {
      return NextResponse.json({ message: "Há fio sem identificador." }, { status: 400 });
    }

    return NextResponse.json(await lerLote(lote));
  } catch (error) {
    return responderFalha(error);
  }
}
