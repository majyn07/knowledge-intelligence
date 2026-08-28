import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("preserva o que é conteúdo", () => {
    const html = '<p style="text-align: justify;">Texto com <strong>ênfase</strong> e <a href="/x">link</a>.</p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("remove script com o conteúdo dentro", () => {
    expect(sanitizeHtml("<p>antes</p><script>alert(1)</script><p>depois</p>")).toBe(
      "<p>antes</p><p>depois</p>"
    );
  });

  /* Tag aberta e nunca fechada não pode sobrar viva na página. */
  it("remove sobra de tag perigosa sem fechamento", () => {
    expect(sanitizeHtml("<p>ok</p><iframe src=\"http://x\">")).toBe("<p>ok</p>");
  });

  it("remove estilo, formulário e objeto embutido", () => {
    expect(sanitizeHtml("<style>p{color:red}</style><form><p>a</p></form><p>b</p>")).toBe("<p>b</p>");
  });

  it("remove manipulador de evento, com e sem aspas", () => {
    expect(sanitizeHtml('<div onclick="roubar()">a</div>')).toBe("<div>a</div>");
    expect(sanitizeHtml("<div onmouseover='x()'>a</div>")).toBe("<div>a</div>");
    expect(sanitizeHtml("<img onerror=x() src=\"/a.png\">")).toBe('<img src="/a.png">');
  });

  it("remove endereço que executa em vez de navegar", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeHtml('<a href="/seguro">x</a>')).toBe('<a href="/seguro">x</a>');
  });

  it("mantém imagem do portal, que é conteúdo legítimo", () => {
    const img = '<img src="https://suporte.altoqi.com.br/hubfs/a.png" alt="Figura">';
    expect(sanitizeHtml(img)).toBe(img);
  });

  it("descarta comentário de template", () => {
    expect(sanitizeHtml("<p>a</p><!--end widget-span --><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });
});
