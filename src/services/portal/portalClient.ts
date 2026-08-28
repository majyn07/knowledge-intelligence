import "server-only";

/**
 * A fronteira de rede com o portal público.
 *
 * Existe porque o navegador não alcança outro domínio, e porque a HubSpot não
 * entrega o artigo: o escopo que parecia ser isso não tem endpoint, e o site
 * search exige permissão que a credencial não tem — e ainda assim devolveria
 * o índice sem o corpo. O portal é público e entrega os dois.
 *
 * Somente leitura, em série, com pausa. São ~1.800 páginas do servidor da
 * própria AltoQi, e varrer isso a toda velocidade é falta de educação com uma
 * máquina que atende cliente.
 */

const PADRAO = "https://suporte.altoqi.com.br";
const PRAZO_MS = 20000;
const PAUSA_MS = 300;

/** Teto por pedido. O cliente pagina; a rota não pode segurar 1.800 buscas. */
export const MAXIMO_POR_LOTE = 10;

export function portalOrigin(): string {
  const bruto = process.env.PORTAL_BASE_URL?.trim() || PADRAO;
  try {
    return new URL(bruto).origin;
  } catch {
    return PADRAO;
  }
}

/**
 * Só o portal, e mais nada.
 *
 * Sem esta conferência a rota seria um proxy aberto: qualquer um poderia pedir
 * ao nosso servidor que buscasse qualquer endereço, inclusive dentro da rede
 * onde ele roda. O destino é decidido aqui, não por quem chama.
 */
export function isPortalUrl(url: string): boolean {
  try {
    return new URL(url).origin === portalOrigin();
  } catch {
    return false;
  }
}

const pausa = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface PortalFetch {
  url: string;
  html: string | null;
  /** Motivo, quando não veio. Vai para a contagem do plano, nunca para o silêncio. */
  failure: string | null;
}

async function buscarUma(url: string): Promise<PortalFetch> {
  try {
    const resposta = await fetch(url, {
      headers: { "User-Agent": "VisusKnowledgeIntelligence/1.0 (importador interno da AltoQi)" },
      signal: AbortSignal.timeout(PRAZO_MS),
      redirect: "follow",
    });

    if (!resposta.ok) {
      return { url, html: null, failure: `o portal respondeu ${resposta.status}` };
    }

    return { url, html: await resposta.text(), failure: null };
  } catch (error) {
    const causa =
      error instanceof Error && error.name === "TimeoutError"
        ? `sem resposta em ${PRAZO_MS} ms`
        : "falha de rede";

    return { url, html: null, failure: causa };
  }
}

/**
 * Em série, com pausa entre uma e outra.
 *
 * Em paralelo seriam dez conexões simultâneas por lote contra o portal — e o
 * ganho de tempo não compensa o risco de alguém do suporte ver a página lenta
 * por causa de uma importação nossa.
 */
export async function fetchPortalPages(urls: string[]): Promise<PortalFetch[]> {
  const resultados: PortalFetch[] = [];

  for (const url of urls) {
    if (resultados.length > 0) await pausa(PAUSA_MS);
    resultados.push(await buscarUma(url));
  }

  return resultados;
}

export async function fetchSitemap(): Promise<string> {
  const { html, failure } = await buscarUma(`${portalOrigin()}/sitemap.xml`);
  if (html === null) throw new Error(failure ?? "não foi possível ler o sitemap");
  return html;
}
