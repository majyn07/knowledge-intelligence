import { headingId } from "@/features/library/content/headings";

import { withHighlight } from "./articleHighlight";
import { sanitizeHtml } from "./sanitizeHtml";

/**
 * Ajustes no HTML que veio do portal, para ele viver dentro do produto.
 *
 * Nada aqui converte o conteúdo: o modelo guarda `contentFormat` justamente
 * para isso não acontecer. O que estas funções fazem é o mínimo para que o
 * texto do portal seja legível na nossa tela: âncora nos títulos e nenhuma cor
 * fixa disputando com o tema.
 */

/**
 * Âncoras nos títulos.
 *
 * O índice lateral aponta para `#id`, e o Markdown ganha esse `id` do próprio
 * renderizador. O HTML do portal chega sem nenhum. Então o índice existiria e
 * nenhum item dele levaria a lugar algum. O `id` sai da mesma função nos dois
 * formatos, então a âncora é a mesma venha o artigo de onde vier.
 */
export function withHeadingIds(html: string): string {
  return html.replace(
    /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (inteiro, nivel, atributos, conteudo) => {
      // Título que já traz `id` é respeitado: não é nosso para reescrever.
      if (/\bid\s*=/.test(String(atributos))) return inteiro;

      const texto = String(conteudo)
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!texto) return inteiro;

      return `<h${nivel}${atributos} id="${headingId(texto)}">${conteudo}</h${nivel}>`;
    }
  );
}

/** Declarações que disputam com o tema em vez de descrever a estrutura do texto. */
const DE_APARENCIA = /(^|;)\s*(color|background|background-color|font-family|font-size)\s*:[^;]*/gi;

/**
 * Tira as cores fixas do conteúdo do portal.
 *
 * O portal escreve `color: #000000` direto no atributo `style` dos parágrafos.
 * Dentro do produto isso vira texto preto sobre fundo escuro. Ilegível no tema
 * escuro, e é o mesmo motivo de a aparência viver em variáveis e não em valor
 * cravado.
 *
 * O que descreve **estrutura** fica: `text-align`, `margin`, `padding`,
 * `width`. O que descreve **aparência** sai, porque quem decide isso aqui é o
 * tema.
 */
export function withoutFixedColors(html: string): string {
  return html.replace(/\sstyle\s*=\s*"([^"]*)"/gi, (inteiro, regras) => {
    const restante = String(regras)
      .replace(DE_APARENCIA, "")
      .replace(/^;+|;+$/g, "")
      .replace(/;\s*;+/g, ";")
      .trim();

    return restante ? ` style="${restante}"` : "";
  });
}

/**
 * Links do corpo, resolvidos.
 *
 * O artigo do portal cita outros artigos do portal, e, sem tratamento, cada
 * citação joga quem lê para fora do produto. Se o artigo citado já está no
 * acervo, o link passa a levar para a nossa página dele: o acervo deixa de ser
 * mil e oitocentos textos soltos e vira uma coisa navegável.
 *
 * O que não resolve **continua apontando para o portal**, e abre em outra aba.
 * Reescrever um link para um artigo que não temos criaria destino quebrado
 * dentro de casa, que é pior do que sair.
 */
export function withResolvedLinks(
  html: string,
  /** Devolve o caminho interno do artigo, ou `null` quando não o temos. */
  paraInterno: (portalId: string) => string | null
): string {
  return html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/gi, (inteiro, antes, href, depois) => {
    const atributos = `${antes}${depois}`;

    // Âncora interna do próprio artigo: nada a fazer.
    if (href.startsWith("#")) return inteiro;

    const interno = paraInterno(portalArticleIdFromHref(href));

    if (interno) return `<a${antes}href="${interno}"${depois} data-artigo-interno="sim">`;

    /*
      Saiu do produto: abre noutra aba. Sem isto, clicar numa citação
      substituiria a tela em que a pessoa estava trabalhando.
    */
    if (/\btarget=/.test(atributos)) return inteiro;

    return `<a${antes}href="${href}"${depois} target="_blank" rel="noopener noreferrer">`;
  });
}

/**
 * O identificador de artigo dentro de um endereço do portal.
 *
 * Vazio quando o endereço não é de artigo. Categoria, seção, âncora de
 * navegação, ou quando não é do portal.
 */
export function portalArticleIdFromHref(href: string): string {
  if (!/suporte\.altoqi\.com\.br|^\/hc\//i.test(href)) return "";

  const numerico = href.match(/\/articles\/(\d+)/);
  if (numerico) return numerico[1];

  const semAncora = href.split("#")[0].replace(/\/+$/, "");
  const ultimo = semAncora.split("/").pop() ?? "";

  /*
    O portal usa `/hc/pt-br/<slug>` tanto para artigo quanto para categoria. Sem
    saber qual é, quem resolve decide: aqui só devolvemos o candidato, e o
    chamador só encontra se o artigo existir no acervo.
  */
  try {
    return decodeURIComponent(ultimo);
  } catch {
    return ultimo;
  }
}

/** Palavras com que o portal abre um aviso dentro do texto. */
const MARCADORES = ["observação", "observacao", "importante", "atenção", "atencao", "nota", "dica"];

/**
 * Destaca os avisos do texto.
 *
 * O portal não marca aviso com estrutura: escreve `<strong>Observação</strong>:`
 * e segue no mesmo parágrafo. Como é o recurso visual mais usado nos artigos,
 * vale reconhecê-lo, e o reconhecimento é **só de apresentação**: nada do que
 * está guardado muda, e o parágrafo que não for reconhecido continua um
 * parágrafo comum. Errar aqui não perde informação.
 */
export function withCallouts(html: string): string {
  return html.replace(
    /<p\b([^>]*)>(\s*<strong[^>]*>\s*([^<]{2,20}?)\s*<\/strong>)/gi,
    (inteiro, atributos, abertura, palavra) => {
      const limpa = String(palavra).toLowerCase().replace(/[:：\s]+$/, "").trim();

      if (!MARCADORES.includes(limpa)) return inteiro;
      if (/\bclass\s*=/.test(String(atributos))) {
        return `<p${String(atributos).replace(/class="([^"]*)"/i, 'class="$1 article-callout"')}>${abertura}`;
      }

      return `<p${atributos} class="article-callout">${abertura}`;
    }
  );
}

export interface BuiltArticleHtml {
  html: string;
  /** Quantas ocorrências o termo de busca encontrou no texto. */
  matches: number;
}

export interface BuildArticleHtmlOptions {
  /** Caminho interno do artigo citado, quando ele existe no acervo. */
  resolveInternalHref?: (portalArticleId: string) => string | null;
  /** Termo procurado dentro do artigo. */
  highlight?: string;
}

/**
 * O HTML do portal, pronto para a tela.
 *
 * A ordem importa e não é arbitrária: primeiro sai o que executa, depois o que
 * disputa com o tema, e só então entra o que a tela acrescenta. Âncora,
 * destaque, link resolvido e marcação da busca. Inverter faria a limpeza apagar
 * o que acabou de ser posto, e a busca marcaria dentro de atributo.
 */
export function buildArticleHtml(
  content: string,
  options: BuildArticleHtmlOptions = {}
): BuiltArticleHtml {
  let html = withoutFixedColors(sanitizeHtml(content));

  html = withHeadingIds(html);
  html = withCallouts(html);

  if (options.resolveInternalHref) {
    html = withResolvedLinks(html, options.resolveInternalHref);
  }

  if (options.highlight) {
    const marcado = withHighlight(html, options.highlight);
    return { html: marcado.html, matches: marcado.count };
  }

  return { html, matches: 0 };
}
