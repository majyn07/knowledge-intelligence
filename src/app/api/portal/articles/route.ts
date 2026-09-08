import { NextResponse } from "next/server";
import { requireMember } from "@/features/auth/requireAdmin";

import { extractArticle } from "@/features/library/import/portal/portalArticlePage";
import {
  MAXIMO_POR_LOTE,
  fetchPortalPages,
  isPortalUrl,
} from "@/services/portal/portalClient";

/**
 * Um lote de páginas do portal, já extraídas.
 *
 * O lote é pequeno e o cliente é quem pagina, pela mesma razão da varredura de
 * classificação por IA: um pedido que segurasse 1.800 buscas estouraria o teto
 * da plataforma, e lote que falha não pode derrubar o que já veio.
 *
 * O HTML não volta para o navegador, só o que foi extraído. São ~180 KB por
 * página, e mandar isso de volta seria trafegar 300 MB para descartar quase
 * tudo do outro lado.
 */
export async function POST(request: Request) {
  /*
    Entrou? Estas rotas gastam cota do provedor de IA ou fazem o servidor falar
    com maquina de fora, e estavam abertas para qualquer um que soubesse o
    endereco. A porta e o servidor, nao a tela: esconder o botao impede o clique
    e nao impede quem conhece o caminho.
  */
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

  const bruto =
    body && typeof body === "object" && "urls" in body ? (body as { urls: unknown }).urls : null;

  if (!Array.isArray(bruto) || bruto.length === 0) {
    return NextResponse.json({ message: "Informe as páginas a visitar." }, { status: 400 });
  }

  if (bruto.length > MAXIMO_POR_LOTE) {
    return NextResponse.json(
      { message: `No máximo ${MAXIMO_POR_LOTE} páginas por vez.` },
      { status: 400 }
    );
  }

  const urls = bruto.map((item) => String(item));

  /*
    O destino é nosso, não de quem chama. Sem isto a rota viraria proxy aberto:
    qualquer pedido faria o servidor buscar qualquer endereço, inclusive dentro
    da rede onde ele roda.
  */
  const forasteira = urls.find((url) => !isPortalUrl(url));

  if (forasteira) {
    return NextResponse.json(
      { message: "Esta importação só visita o portal de suporte." },
      { status: 400 }
    );
  }

  try {
    const paginas = await fetchPortalPages(urls);

    const articles = paginas.map(({ url, html, failure }) => ({
      url,
      /*
        `null` quando a página não entregou o que identifica um artigo. Quem
        conta é o plano, e o número aparece antes do clique, nunca some.
      */
      article: html === null ? null : extractArticle(html, url),
      failure,
    }));

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("PORTAL_ARTICLES_ERROR", error);

    return NextResponse.json(
      { message: "Não foi possível visitar as páginas do portal." },
      { status: 502 }
    );
  }
}
