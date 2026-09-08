import { NextResponse } from "next/server";
import { requireMember } from "@/features/auth/requireAdmin";

import { articleUrls, parseSitemap } from "@/features/library/import/portal/portalSitemap";
import { fetchSitemap } from "@/services/portal/portalClient";

/**
 * A lista de artigos do portal.
 *
 * Um pedido só, e é o que o cliente usa para saber quantas páginas visitar e
 * quais mudaram desde a última importação: o `lastmod` é o que faz a segunda
 * varredura custar quase nada.
 */
export async function GET() {
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


  try {
    const xml = await fetchSitemap();
    const entradas = parseSitemap(xml);
    const artigos = articleUrls(entradas);

    return NextResponse.json({
      articles: artigos,
      /*
        Os números vão junto porque o plano mostra tudo antes do clique: quantas
        URLs o sitemap trouxe e quantas ficaram de fora por serem de outra
        língua. Diferença sem explicação é o que faz alguém desconfiar da tela.
      */
      total: entradas.length,
      skippedForeignLocale: entradas.length - artigos.length,
    });
  } catch (error) {
    console.error("PORTAL_SITEMAP_ERROR", error);

    return NextResponse.json(
      { message: "Não foi possível ler a lista de artigos do portal." },
      { status: 502 }
    );
  }
}
