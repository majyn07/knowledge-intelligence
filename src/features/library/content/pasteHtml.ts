import { sanitizeHtml } from "@/lib/sanitizeHtml";

/**
 * O que entra no artigo quando alguém cola.
 *
 * O editor edita o HTML do portal no próprio HTML, e a promessa dele é que o
 * que ninguém tocar continua idêntico ao byte. A colagem é o buraco dessa
 * promessa: um `contenteditable` sem tratamento aceita o que estiver na área de
 * transferência, e o que costuma estar ali é Word, Google Docs ou outra aba do
 * navegador.
 *
 * Do Word vem `<span style="mso-fareast-font-family:...">`, `<o:p>`, fonte em
 * pontos e cor de fundo branca. Do navegador vem a folha de estilo do site de
 * origem inteira, em atributo. Nada disso aparece na tela de quem colou: o
 * texto fica igual, e a marcação estranha entra num artigo que vai para o
 * cliente. É a pior forma de degradar, porque não há sintoma.
 *
 * Então a colagem passa a trazer **só a formatação que a própria barra sabe
 * produzir**. O que a barra não faz, o editor não aceita de fora.
 *
 * **O preço, declarado:** copiar um trecho de dentro do próprio artigo perde o
 * `style` e a `class` daquele trecho. É perda real, e é o lado certo da troca:
 * o caso comum é colar de fora, e para mover marcação fiel existe o `Ver HTML`,
 * que edita a fonte diretamente.
 */

/**
 * O que sobrevive a uma colagem.
 *
 * É a lista do que a barra de formatação produz, e nada além. Crescer esta
 * lista sem crescer a barra criaria conteúdo que o editor exibe e não sabe
 * refazer.
 */
const PERMITIDAS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
]);

/** Só o endereço sobrevive, e só no link. O resto é estilo de outra casa. */
const ATRIBUTO_MANTIDO = /^href$/i;

function atributosDe(bruto: string, tag: string): string {
  if (tag !== "a") return "";

  const href = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(bruto);

  if (!href) return "";

  const valor = href[2] ?? href[3] ?? href[4] ?? "";

  /*
    O endereço passa pelo mesmo crivo do sanitizador de exibição: `javascript:`
    numa âncora colada é execução dentro da ferramenta interna.
  */
  if (/^\s*(javascript|vbscript|data):/i.test(valor)) return "";

  return ` href="${valor.replace(/"/g, "&quot;")}"`;
}

/**
 * Reduz o HTML colado ao que a barra sabe fazer.
 *
 * Regex e não analisador de HTML, pela mesma razão declarada em
 * `sanitizeHtml`: um analisador é biblioteca nova no projeto. Aqui a troca é
 * mais confortável que lá, porque o pior caso desta função é **perder**
 * formatação, e não deixar passar.
 */
export function limparColagem(html: string): string {
  const seguro = sanitizeHtml(html);

  return (
    seguro
      /*
        O Word marca o que é dele com `<o:p>` e afins. Some inteiro, com o
        conteúdo: é marcação de escritório, não texto do artigo.
      */
      .replace(/<\/?[a-z]+:[^>]*>/gi, "")
      .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (inteiro, barra: string, tag: string) => {
        const nome = tag.toLowerCase();

        if (!PERMITIDAS.has(nome)) return "";

        return barra === "/" ? `</${nome}>` : `<${nome}${atributosDe(inteiro, nome)}>`;
      })
      /*
        Espaço em excesso vem junto do Word, que separa cada parágrafo com
        dezenas de quebras. Uma linha em branco basta para o texto respirar.
      */
      .replace(/(\r?\n\s*){3,}/g, "\n\n")
      .trim()
  );
}

/**
 * O texto puro, quando não veio HTML.
 *
 * Cada linha vira um parágrafo, porque colar num `contenteditable` sem isto
 * produz um bloco só, e quem colou três passos vê um parágrafo.
 */
export function textoComoHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escapado
    .split(/\r?\n\s*\r?\n/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => `<p>${bloco.replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

export { ATRIBUTO_MANTIDO };
