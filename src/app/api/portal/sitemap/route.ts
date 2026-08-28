import { NextResponse } from "next/server";

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
