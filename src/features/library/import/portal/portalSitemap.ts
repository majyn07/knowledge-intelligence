/**
 * O sitemap do portal, que é a lista de artigos.
 *
 * Existe porque a HubSpot não tem API de Base de Conhecimento — o escopo que
 * parecia ser isso não tem endpoint atrás dele, e o site search exige uma
 * permissão que a credencial não tem e ainda assim não devolveria o corpo.
 * O portal é público, e entrega mais do que a API entregaria.
 */

export interface PortalUrl {
  url: string;
  /** ISO de quando o portal diz que a página mudou. Vazio quando não veio. */
  lastmod: string;
}

/**
 * URLs de outra língua.
 *
 * O portal publica um punhado de artigos em espanhol, sob um prefixo de
 * idioma antes de `/hc/`. Eles ficam de fora e são **contados**: a taxonomia
 * do cadastro é a do portal em português, e um artigo cuja trilha diz
 * "Instalación y Activación" não encontraria seção nenhuma — entraria como
 * "sem seção" sem que ninguém entendesse por quê.
 */
export function isForeignLocale(url: string): boolean {
  return /\/(es-mx|es|en-us|en)\/hc\//i.test(url);
}

/**
 * O identificador do artigo no portal.
 *
 * A maioria das URLs traz um número; cerca de 140 usam apenas o slug, e para
 * essas o canonical confirma o slug — não há número em lugar nenhum. As duas
 * formas são identidade estável do portal, então as duas servem. Sem isto,
 * reimportar criaria duplicata em vez de atualizar.
 */
export function portalIdOf(url: string): string {
  const numerico = url.match(/\/articles\/(\d+)/);
  if (numerico) return numerico[1];

  try {
    const caminho = new URL(url).pathname.replace(/\/+$/, "");
    return decodeURIComponent(caminho.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

export function parseSitemap(xml: string): PortalUrl[] {
  const entradas = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];

  return entradas
    .map((entrada) => {
      const bloco = entrada[1];
      const loc = (bloco.match(/<loc>([^<]+)<\/loc>/) ?? [])[1] ?? "";
      const lastmod = (bloco.match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1] ?? "";
      return { url: loc.trim(), lastmod: lastmod.trim() };
    })
    .filter((entrada) => entrada.url !== "");
}

/** As páginas que valem visitar: artigo, em português. */
export function articleUrls(entradas: PortalUrl[]): PortalUrl[] {
  return entradas.filter((entrada) => !isForeignLocale(entrada.url) && portalIdOf(entrada.url) !== "");
}
