import { NextResponse } from "next/server";

import { requireAdmin } from "@/features/auth/requireAdmin";

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
 * `GET` devolve uma página da listagem: cem conversas, barato, e o cursor da
 * próxima. `POST` lê um lote de conversas: caro, uma requisição à HubSpot por conversa.
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

  /*
    A porta é aqui, e não no botão.

    Esconder o botão da tela não controla nada: quem sabe o endereço chama a
    rota direto, e até agora ela não pedia nada. Uma varredura de três meses são
    cinquenta e cinco mil idas ao servidor de suporte da AltoQi, que é máquina
    que atende cliente.
  */
  const autorizado = await requireAdmin();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
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

    /*
      A janela é obrigatória, e não tem padrão. Sem ela a lista sai do mais
      antigo e não para: são mais de setenta mil conversas na caixa do suporte, e
      alcançar o mês corrente custaria mais de mil requisições.
    */
    const desde = (url.searchParams.get("desde") ?? "").trim();

    if (desde === "") {
      return NextResponse.json(
        { message: "Informe a partir de quando buscar." },
        { status: 400 }
      );
    }

    const cursor = (url.searchParams.get("apos") ?? "").trim();
    const pagina = await umaPaginaDeFios(inbox, desde, cursor || undefined);

    return NextResponse.json({ configured: true, ...pagina });
  } catch (error) {
    return responderFalha(error);
  }
}

/** Lê um lote de conversas. Caro: uma ida à HubSpot por conversa, mais a associação. */
export async function POST(request: Request) {
  const autorizado = await requireAdmin();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
  }

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

  const bruto = body && typeof body === "object" && "conversas" in body ? body.conversas : null;
  const conversas = Array.isArray(bruto) ? bruto : [];

  if (conversas.length === 0) {
    return NextResponse.json({ message: "Informe as conversas a ler." }, { status: 400 });
  }

  if (conversas.length > POR_LOTE) {
    return NextResponse.json(
      { message: `O lote não pode passar de ${POR_LOTE} conversas.` },
      { status: 400 }
    );
  }

  try {
    const lote = conversas.map((conversa) => {
      const registro = conversa as Record<string, unknown>;

      return {
        id: String(registro.id ?? "").trim(),
        criadoEm: String(registro.criadoEm ?? ""),
        ...(registro.ultimaMensagemEm
          ? { ultimaMensagemEm: String(registro.ultimaMensagemEm) }
          : {}),
      };
    });

    if (lote.some((conversa) => conversa.id === "")) {
      return NextResponse.json({ message: "Há conversa sem identificador." }, { status: 400 });
    }

    return NextResponse.json(await lerLote(lote));
  } catch (error) {
    return responderFalha(error);
  }
}
