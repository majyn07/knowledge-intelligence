import { describe, expect, it } from "vitest";

import { limparColagem, textoComoHtml } from "./pasteHtml";

/* O que o Word põe na área de transferência, encurtado mas fiel na forma. */
const DO_WORD = `<p class="MsoNormal" style="mso-margin-top-alt:auto;line-height:normal">
  <span style="font-size:11.0pt;font-family:&quot;Calibri&quot;,sans-serif;mso-fareast-font-family:Calibri">
    Selecione a op<b>ção</b> desejada<o:p></o:p>
  </span>
</p>`;

describe("limparColagem", () => {
  /*
    O editor promete que o que ninguém tocar continua idêntico, e a colagem era
    o buraco: a marcação do Word entrava num artigo do cliente sem sintoma
    nenhum na tela.
  */
  it("descarta o estilo e a classe do Word", () => {
    const limpo = limparColagem(DO_WORD);

    expect(limpo).not.toContain("MsoNormal");
    expect(limpo).not.toContain("mso-");
    expect(limpo).not.toContain("style");
    expect(limpo).not.toContain("Calibri");
  });

  it("preserva o texto e a formatação que a barra sabe fazer", () => {
    const limpo = limparColagem(DO_WORD);

    expect(limpo).toContain("Selecione a op");
    expect(limpo).toContain("<b>ção</b>");
    expect(limpo).toContain("<p>");
  });

  /* `<o:p>` é marcação de escritório, não texto do artigo. */
  it("some com a marcação de espaço de nomes", () => {
    expect(limparColagem(DO_WORD)).not.toContain("o:p");
  });

  it("mantém o endereço do link e joga fora o resto", () => {
    const limpo = limparColagem(
      '<a href="https://suporte.altoqi.com.br/x" class="lk" target="_blank" style="color:red">ver</a>'
    );

    expect(limpo).toBe('<a href="https://suporte.altoqi.com.br/x">ver</a>');
  });

  /* Âncora colada com `javascript:` é execução dentro da ferramenta interna. */
  it("recusa endereço que executa", () => {
    const limpo = limparColagem(`<a href="javascript:alert(1)">clique</a>`);

    expect(limpo).toBe("<a>clique</a>");
  });

  it("mantém lista, título e ênfase", () => {
    const limpo = limparColagem(
      "<h2 style='x'>Passos</h2><ul class='y'><li>um</li><li><em>dois</em></li></ul>"
    );

    expect(limpo).toBe("<h2>Passos</h2><ul><li>um</li><li><em>dois</em></li></ul>");
  });

  /*
    O que a barra não produz, o editor não aceita de fora: aceitar criaria
    conteúdo que ele exibe e não sabe refazer.
  */
  it("desmonta a tabela e a div, preservando o texto", () => {
    const limpo = limparColagem("<div><table><tr><td>valor</td></tr></table></div>");

    expect(limpo).not.toContain("<table");
    expect(limpo).not.toContain("<div");
    expect(limpo).toContain("valor");
  });

  it("some com o que executa, junto com o conteúdo", () => {
    const limpo = limparColagem('<p>ok</p><script>alert(1)</script><style>p{color:red}</style>');

    expect(limpo).toContain("ok");
    expect(limpo).not.toContain("alert");
    expect(limpo).not.toContain("color:red");
  });

  it("imagem colada de fora não entra", () => {
    expect(limparColagem('<p>antes<img src="https://outro.site/x.png">depois</p>')).toBe(
      "<p>antesdepois</p>"
    );
  });

  it("texto sem marcação atravessa inteiro", () => {
    expect(limparColagem("apenas texto")).toBe("apenas texto");
  });
});

describe("textoComoHtml", () => {
  /* Colar três passos e ver um parágrafo só é o que acontece sem isto. */
  it("uma linha em branco separa parágrafos", () => {
    expect(textoComoHtml("primeiro\n\nsegundo")).toBe("<p>primeiro</p><p>segundo</p>");
  });

  it("quebra simples vira quebra de linha", () => {
    expect(textoComoHtml("uma\nduas")).toBe("<p>uma<br>duas</p>");
  });

  it("escapa o que pareceria marcação", () => {
    expect(textoComoHtml("use <b> para negrito")).toBe("<p>use &lt;b&gt; para negrito</p>");
  });

  it("texto vazio não vira parágrafo vazio", () => {
    expect(textoComoHtml("   \n\n  ")).toBe("");
  });
});
