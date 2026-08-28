import { describe, expect, it } from "vitest";

import { withHighlight } from "./articleHighlight";

describe("withHighlight", () => {
  it("marca a ocorrência no texto e conta", () => {
    const { html, count } = withHighlight("<p>Ocultar elemento</p>", "elemento");

    expect(count).toBe(1);
    expect(html).toBe('<p>Ocultar <mark class="article-hit" data-ocorrencia="0">elemento</mark></p>');
  });

  it("marca todas as ocorrências, em blocos diferentes", () => {
    const { count } = withHighlight("<p>viga</p><li>outra viga</li>", "viga");
    expect(count).toBe(2);
  });

  /*
    Procurar exigindo o acento certo faz a pessoa errar duas vezes antes de
    achar. "secao" tem de encontrar "seção".
  */
  it("ignora acento nos dois sentidos", () => {
    expect(withHighlight("<p>a seção do condutor</p>", "secao").count).toBe(1);
    expect(withHighlight("<p>a secao do condutor</p>", "seção").count).toBe(1);
  });

  it("preserva o texto original ao marcar", () => {
    const { html } = withHighlight("<p>A Seção</p>", "secao");
    expect(html).toContain(">Seção</mark>");
  });

  it("ignora maiúsculas", () => {
    expect(withHighlight("<p>PILAR</p>", "pilar").count).toBe(1);
  });

  /*
    Trocar dentro de uma tag quebraria o endereço de uma imagem ou de um link —
    procurar "img" não pode tocar em `<img src=...>`.
  */
  it("não marca dentro da marcação", () => {
    const html = '<img src="/img/viga.png" alt="x">';
    const resultado = withHighlight(html, "img");

    expect(resultado.count).toBe(0);
    expect(resultado.html).toBe(html);
  });

  it("não faz nada com termo curto demais", () => {
    const html = "<p>a e i o u</p>";
    expect(withHighlight(html, "a")).toEqual({ html, count: 0 });
    expect(withHighlight(html, "  ")).toEqual({ html, count: 0 });
  });

  it("numera as ocorrências em sequência", () => {
    const { html } = withHighlight("<p>viga viga</p>", "viga");

    expect(html).toContain('data-ocorrencia="0"');
    expect(html).toContain('data-ocorrencia="1"');
  });
});
