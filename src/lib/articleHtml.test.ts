import { describe, expect, it } from "vitest";

import {
  buildArticleHtml,
  portalArticleIdFromHref,
  withCallouts,
  withHeadingIds,
  withResolvedLinks,
  withoutFixedColors,
} from "./articleHtml";

describe("withHeadingIds", () => {
  /* Sem isto o índice lateral existe e nenhum item dele leva a lugar algum. */
  it("dá âncora aos títulos, com o mesmo id que o Markdown produz", () => {
    expect(withHeadingIds("<h2>Ocultar elementos</h2>")).toBe(
      '<h2 id="ocultar-elementos">Ocultar elementos</h2>'
    );
  });

  it("ignora marcação e espaço ao montar o id", () => {
    expect(withHeadingIds("<h3>  <strong>Erro</strong> L24&nbsp;  </h3>")).toContain(
      'id="erro-l24"'
    );
  });

  it("preserva os atributos que já existiam", () => {
    expect(withHeadingIds('<h2 class="x">Título</h2>')).toBe(
      '<h2 class="x" id="titulo">Título</h2>'
    );
  });

  /* Id do portal é do portal: reescrever quebraria link que já aponta para ele. */
  it("respeita título que já tem id", () => {
    const html = '<h2 id="proprio">Título</h2>';
    expect(withHeadingIds(html)).toBe(html);
  });

  it("não mexe em título sem texto", () => {
    const html = "<h2><img src=\"/a.png\"></h2>";
    expect(withHeadingIds(html)).toBe(html);
  });

  it("não toca em h4 em diante, que o índice não usa", () => {
    expect(withHeadingIds("<h4>Detalhe</h4>")).toBe("<h4>Detalhe</h4>");
  });
});

describe("withoutFixedColors", () => {
  /*
    O portal escreve `color: #000000` no atributo. Dentro do produto isso vira
    texto preto sobre fundo escuro — ilegível no tema escuro.
  */
  it("remove a cor cravada e mantém o que é estrutura", () => {
    expect(
      withoutFixedColors('<p style="box-sizing: border-box; color: #000000; text-align: justify;">a</p>')
      // O ponto e vírgula final some junto: a função normaliza o que sobra.
    ).toBe('<p style="box-sizing: border-box; text-align: justify">a</p>');
  });

  it("remove o atributo inteiro quando só havia aparência", () => {
    expect(withoutFixedColors('<p style="color: #000; font-family: Arial;">a</p>')).toBe("<p>a</p>");
  });

  it("remove fundo e tamanho de fonte junto", () => {
    expect(withoutFixedColors('<span style="background-color: #ff0; font-size: 22px;">a</span>')).toBe(
      "<span>a</span>"
    );
  });

  it("deixa passar o que não tem estilo", () => {
    expect(withoutFixedColors("<p>a</p>")).toBe("<p>a</p>");
  });

  it("preserva margem e largura, que descrevem o texto e não o tema", () => {
    expect(withoutFixedColors('<div style="margin-bottom: 0px; width: 50%;">a</div>')).toBe(
      '<div style="margin-bottom: 0px; width: 50%">a</div>'
    );
  });
});

describe("portalArticleIdFromHref", () => {
  it("lê o número do endereço de artigo", () => {
    expect(portalArticleIdFromHref("https://suporte.altoqi.com.br/hc/pt-br/articles/440")).toBe("440");
  });

  it("lê o slug quando não há número", () => {
    expect(portalArticleIdFromHref("https://suporte.altoqi.com.br/hc/pt-br/comandos")).toBe("comandos");
  });

  it("ignora endereço que não é do portal", () => {
    expect(portalArticleIdFromHref("https://google.com/x")).toBe("");
    expect(portalArticleIdFromHref("/library/abc")).toBe("");
  });
});

describe("withResolvedLinks", () => {
  const paraInterno = (id: string) => (id === "440" ? "/library/art-1" : null);

  /*
    O acervo deixa de ser mil e oitocentos textos soltos quando a citação entre
    eles vira navegação de verdade.
  */
  it("leva para dentro o artigo que já temos", () => {
    const html = '<a href="https://suporte.altoqi.com.br/hc/pt-br/articles/440">veja</a>';

    expect(withResolvedLinks(html, paraInterno)).toContain('href="/library/art-1"');
    expect(withResolvedLinks(html, paraInterno)).toContain('data-artigo-interno="sim"');
  });

  /* Reescrever para artigo que não temos criaria destino quebrado dentro de casa. */
  it("deixa no portal o que não temos, abrindo noutra aba", () => {
    const html = '<a href="https://suporte.altoqi.com.br/hc/pt-br/articles/999">veja</a>';
    const saida = withResolvedLinks(html, paraInterno);

    expect(saida).toContain('href="https://suporte.altoqi.com.br/hc/pt-br/articles/999"');
    expect(saida).toContain('target="_blank"');
    expect(saida).toContain('rel="noopener noreferrer"');
  });

  it("não mexe em âncora do próprio artigo", () => {
    const html = '<a href="#secao">volta</a>';
    expect(withResolvedLinks(html, paraInterno)).toBe(html);
  });

  it("respeita o alvo que já estava declarado", () => {
    const html = '<a href="https://x.com" target="_self">x</a>';
    expect(withResolvedLinks(html, paraInterno)).toBe(html);
  });
});

describe("withCallouts", () => {
  it("reconhece o aviso que o portal escreve em negrito", () => {
    expect(withCallouts("<p><strong>Observação</strong>: cuidado</p>")).toContain(
      'class="article-callout"'
    );
  });

  it("aceita as variantes e ignora acento", () => {
    for (const palavra of ["Importante", "Atenção", "Atencao", "Nota", "Dica"]) {
      expect(withCallouts(`<p><strong>${palavra}:</strong> x</p>`)).toContain("article-callout");
    }
  });

  /* Reconhecer demais transformaria parágrafo comum em aviso. */
  it("não marca parágrafo que só começa em negrito", () => {
    const html = "<p><strong>O comando Ocultar</strong> permite...</p>";
    expect(withCallouts(html)).toBe(html);
  });

  it("preserva a classe que já existia", () => {
    expect(withCallouts('<p class="x"><strong>Nota</strong>: y</p>')).toContain(
      'class="x article-callout"'
    );
  });
});

describe("buildArticleHtml", () => {
  /*
    A ordem é o que garante que a limpeza não apague o que a tela acrescenta, e
    que a busca não marque dentro de atributo.
  */
  it("limpa, tematiza, ancora e marca, nessa ordem", () => {
    const { html, matches } = buildArticleHtml(
      '<script>x()</script><h2 style="color:#000">Vigas</h2><p>uma viga</p>',
      { highlight: "viga" }
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("color:");
    expect(html).toContain('id="vigas"');
    expect(matches).toBe(2);
  });

  it("não marca nada sem termo de busca", () => {
    expect(buildArticleHtml("<p>viga</p>").matches).toBe(0);
  });
});
