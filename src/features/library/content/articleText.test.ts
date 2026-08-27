import { describe, expect, it } from "vitest";

import { articleText } from "./articleText";

describe("articleText", () => {
  /*
    Sem isto, procurar "div" ou "class" casaria com os mil e oitocentos artigos
    do portal de uma vez, e o buscador passaria a responder qualquer coisa.
  */
  it("tira a marcação do conteúdo em HTML", () => {
    expect(
      articleText({
        content: '<div class="x"><p>Ocultar <strong>elementos</strong></p></div>',
        contentFormat: "html",
      })
    ).toBe("Ocultar elementos");
  });

  it("resolve as entidades comuns", () => {
    expect(
      articleText({ content: "<p>a&nbsp;&amp;&nbsp;b &quot;c&quot;</p>", contentFormat: "html" })
    ).toBe('a & b "c"');
  });

  it("descarta script e estilo com o conteúdo dentro", () => {
    expect(
      articleText({
        content: "<style>p{color:red}</style><p>texto</p><script>x()</script>",
        contentFormat: "html",
      })
    ).toBe("texto");
  });

  /*
    O formato é declarado. Limpar por precaução estragaria quem escreve `<h2>`
    como exemplo dentro de um artigo em Markdown.
  */
  it("devolve o Markdown intacto", () => {
    const md = "## Título\n\nUse `<h2>` para subtítulos.";
    expect(articleText({ content: md, contentFormat: "markdown" })).toBe(md);
  });

  it("lida com conteúdo vazio", () => {
    expect(articleText({ content: "", contentFormat: "html" })).toBe("");
  });
});
