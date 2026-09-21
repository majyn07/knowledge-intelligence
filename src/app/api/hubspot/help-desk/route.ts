import { NextResponse } from "next/server";

import { requireAdmin } from "@/features/auth/requireAdmin";

import {
  buscarContatos,
  caixasConfiguradas,
  conversasDoChamado,
  conversasDoContato,
  donosComEquipe,
  lerLote,
  NUMEROS_POR_PEDIDO,
  POR_LOTE,
  umaPaginaDeFios,
} from "@/services/hubspot/helpDeskService";
import type { ConversaListada } from "@/services/hubspot/helpDeskSchedule";
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

  /*
    Buscar o cliente antes de trazer qualquer coisa. É a confirmação de conta
    que a importação por cliente pede: a tela lista quem casou, a pessoa
    escolhe, e só então as conversas são lidas.
  */
  const termo = (url.searchParams.get("contato") ?? "").trim();

  if (termo !== "") {
    if (termo.length < 3) {
      return NextResponse.json({ message: "Digite pelo menos três caracteres." }, { status: 400 });
    }

    try {
      return NextResponse.json({ configured: true, contatos: await buscarContatos(termo) });
    } catch (error) {
      return responderFalha(error);
    }
  }

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

  /*
    Pelo número do chamado, sem varrer.

    Alguém do suporte tem cinco casos de três meses atrás e precisa deles aqui.
    Varrer a caixa desde lá seriam dezenas de milhares de requisições; o filtro
    da listagem responde cada número com uma. É o mesmo `lerLote` da varredura
    depois: a conversa vira atendimento pelo mesmo caminho.
  */
  const numerosBrutos =
    body && typeof body === "object" && "numeros" in body ? body.numeros : null;

  if (Array.isArray(numerosBrutos)) {
    const numeros = [...new Set(numerosBrutos.map((n) => String(n ?? "").replace(/\D/g, "")))].filter(
      (n) => n !== ""
    );

    if (numeros.length === 0) {
      return NextResponse.json({ message: "Informe os números dos chamados." }, { status: 400 });
    }

    if (numeros.length > NUMEROS_POR_PEDIDO) {
      return NextResponse.json(
        { message: `No máximo ${NUMEROS_POR_PEDIDO} números por vez.` },
        { status: 400 }
      );
    }

    try {
      const listadas: ConversaListada[] = [];
      const semConversa: string[] = [];

      for (const numero of numeros) {
        const conversas = await conversasDoChamado(numero);
        if (conversas.length === 0) semConversa.push(numero);
        listadas.push(...conversas);
      }

      const lote = listadas.length > 0 ? await lerLote(listadas) : null;

      return NextResponse.json({
        atendimentos: lote?.atendimentos ?? [],
        falhas: lote?.falhas ?? 0,
        descartados: lote?.descartados ?? { semChamado: 0, semResposta: 0, semAssunto: 0 },
        /* Número que não achou conversa é dito, e não somado ao silêncio. */
        semConversa,
      });
    } catch (error) {
      return responderFalha(error);
    }
  }

  /* Por cliente: as conversas do contato escolhido, pelo mesmo lerLote. */
  const contactId =
    body && typeof body === "object" && "contactId" in body
      ? String((body as { contactId: unknown }).contactId ?? "").trim()
      : "";

  if (contactId !== "") {
    try {
      const listadas = await conversasDoContato(contactId);
      const lote = listadas.length > 0 ? await lerLote(listadas) : null;

      return NextResponse.json({
        atendimentos: lote?.atendimentos ?? [],
        falhas: lote?.falhas ?? 0,
        descartados: lote?.descartados ?? { semChamado: 0, semResposta: 0, semAssunto: 0 },
        conversas: listadas.length,
      });
    } catch (error) {
      return responderFalha(error);
    }
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
