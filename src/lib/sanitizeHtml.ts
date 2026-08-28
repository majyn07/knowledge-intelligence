/**
 * Limpeza do HTML que veio de fora, antes de ser injetado na página.
 *
 * O conteúdo do portal é HTML e o modelo guarda `contentFormat` justamente
 * para não convertê-lo — mas exibir HTML de terceiro sem tratar é abrir a
 * página para o que estiver escrito lá dentro. Mesmo sendo o nosso portal:
 * quem publica um artigo não devia conseguir executar código na ferramenta
 * interna sem querer.
 *
 * **É remoção do perigoso conhecido, não lista de permitidos.** Um sanitizador
 * de verdade parte do que é permitido e descarta o resto, e isso exige um
 * analisador de HTML — biblioteca nova no projeto. Para conteúdo do próprio
 * portal, exibido internamente, esta troca está declarada e é consciente: se
 * um dia entrar HTML de origem não confiável, esta função não basta.
 */

/** Elementos que executam, carregam ou enviam coisas. Vão inteiros, com o conteúdo. */
const PERIGOSOS = ["script", "style", "iframe", "object", "embed", "form", "noscript"];

/** Elementos sem fechamento que também não têm por que aparecer no corpo. */
const SOLTOS = ["link", "meta", "base", "input", "button"];

export function sanitizeHtml(raw: string): string {
  let limpo = raw;

  for (const tag of PERIGOSOS) {
    limpo = limpo.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    // Sobra de tag aberta e nunca fechada não pode virar um elemento vivo.
    limpo = limpo.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }

  for (const tag of SOLTOS) {
    limpo = limpo.replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  return (
    limpo
      // Comentário condicional e sobra de template não acrescentam nada ao texto.
      .replace(/<!--[\s\S]*?-->/g, "")
      // `onclick=`, `onerror=` e parentes, com ou sem aspas.
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
      // `href="javascript:..."` e `src="data:text/html..."`.
      .replace(/\s(href|src|xlink:href)\s*=\s*"(?:javascript|vbscript|data:text\/html)[^"]*"/gi, "")
      .replace(/\s(href|src|xlink:href)\s*=\s*'(?:javascript|vbscript|data:text\/html)[^']*'/gi, "")
      .trim()
  );
}
