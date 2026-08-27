import { portalIdOf } from "./portalSitemap";

/**
 * O artigo, extraído da página pública.
 *
 * O template é uniforme: numa amostra de doze artigos espalhados pelo sitemap,
 * título, corpo e trilha saíram em todos, com corpos de 966 a 22.713
 * caracteres. Ainda assim nada aqui é obrigatório por suposição — página que
 * não entrega título ou corpo devolve `null` e é **contada**, nunca gravada
 * pela metade.
 */

export interface PortalArticle {
  portalArticleId: string;
  url: string;
  title: string;
  summary: string;
  /** HTML, como veio. O modelo guarda `contentFormat` justamente para não converter. */
  contentHtml: string;
  categoryName: string;
  sectionName: string;
}

const NOMEADAS: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

/** Título e resumo vêm de atributo de meta tag, então chegam escapados. */
export function decodeEntities(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&[a-z]+;/gi, (entidade) => NOMEADAS[entidade.toLowerCase()] ?? entidade);
}

function meta(html: string, atributo: string, valor: string): string {
  const re = new RegExp(
    `<meta[^>]+${atributo}=["']${valor}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  return decodeEntities((html.match(re) ?? [])[1] ?? "").trim();
}

/**
 * A trilha de navegação, que é onde categoria e seção moram.
 *
 * O primeiro degrau é sempre a raiz do portal ("AltoQi Suporte") e não
 * classifica nada. Artigo com trilha de dois degraus existe no portal e é
 * legítimo: ele tem categoria e não tem seção, e o modelo já prevê
 * `sectionId` vazio.
 */
export function breadcrumbOf(html: string): string[] {
  const bloco = html.match(/<(nav|ol|ul)[^>]*[Bb]readcrumb[^>]*>[\s\S]{0,3000}?<\/\1>/);
  if (!bloco) return [];

  return [...bloco[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
    .filter((texto) => texto !== "");
}

/**
 * O corpo do artigo, e só ele.
 *
 * O `<article>` do portal envolve o layout inteiro: dezenove `div` de grade da
 * HubSpot — `container-fluid`, `row-fluid`, `widget-span` — antes de chegar ao
 * texto. Importar isso trazia o andaime junto, e era o que aparecia na tela.
 *
 * A âncora certa é o campo de texto rico, que a HubSpot marca com
 * `data-hs-cos-type="inline_richtext_field"`. Numa amostra de oito artigos
 * espalhados pelo sitemap ele apareceu **uma vez em cada**, sempre com zero
 * wrappers de layout dentro.
 */
export function articleBodyOf(html: string): string {
  const fonte = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const abertura = /<div\b[^>]*data-hs-cos-type="inline_richtext_field"[^>]*>/gi;
  const blocos: string[] = [];
  let inicio: RegExpExecArray | null;

  while ((inicio = abertura.exec(fonte))) {
    let profundidade = 1;
    const tags = /<(\/?)div\b[^>]*>/gi;
    tags.lastIndex = inicio.index + inicio[0].length;

    let tag: RegExpExecArray | null;
    while ((tag = tags.exec(fonte))) {
      profundidade += tag[1] === "/" ? -1 : 1;

      if (profundidade === 0) {
        blocos.push(fonte.slice(inicio.index + inicio[0].length, tag.index));
        break;
      }
    }
  }

  /*
    Quando há mais de um, vale o de mais texto: o rodapé do portal também é um
    campo de texto rico, e ele traz só a linha de copyright.
  */
  return blocos
    .map((bloco) => ({ bloco, texto: bloco.replace(/<[^>]+>/g, " ").trim().length }))
    .sort((a, b) => b.texto - a.texto)[0]?.bloco.trim() ?? "";
}


/** Como uma frase termina quando ela termina de verdade. */
const FIM_DE_FRASE = /[.!?…:;]$/;

/**
 * O resumo, sem a palavra pela metade.
 *
 * O portal corta o `meta description` em duzentos caracteres, no meio da
 * palavra: numa amostra de quarenta artigos, **trinta e sete** vinham assim, e
 * só três terminavam em pontuação. Importar fielmente significa importar
 * "…siga direto ao item 5 do presente artigo antes de le".
 *
 * Cortar na última palavra inteira não inventa nada — descarta um fragmento
 * que não carrega informação — e as reticências dizem que há mais adiante.
 * Frase que termina normalmente não é tocada.
 */
export function tidySummary(bruto: string): string {
  const texto = bruto.trim();

  if (texto === "" || FIM_DE_FRASE.test(texto)) return texto;

  const ultimoEspaco = texto.lastIndexOf(" ");

  // Sem espaço não há palavra anterior para preservar: melhor devolver como veio.
  if (ultimoEspaco <= 0) return texto;

  return texto.slice(0, ultimoEspaco).replace(/[,;:\s]+$/, "") + "…";
}

export function extractArticle(html: string, url: string): PortalArticle | null {
  const title = meta(html, "property", "og:title")
    || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "").trim();

  const contentHtml = articleBodyOf(html);

  /*
    Sem título não há registro que identifique alguma coisa, e sem corpo o
    artigo entraria vazio na Biblioteca com cara de artigo existente. Os dois
    casos viram contagem no plano, na frente de quem confirma.
  */
  if (title === "" || contentHtml === "") return null;

  const trilha = breadcrumbOf(html);

  return {
    portalArticleId: portalIdOf(url),
    url,
    title,
    summary: tidySummary(meta(html, "name", "description")),
    contentHtml,
    categoryName: trilha[1] ?? "",
    sectionName: trilha[2] ?? "",
  };
}
