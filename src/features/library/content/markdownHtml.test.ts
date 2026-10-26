import { describe, expect, it } from "vitest";

import { markdownParaHtml } from "./markdownHtml";

describe("markdownParaHtml", () => {
  it("segue a tela: # vira h2, porque o h1 do portal é o título", () => {
    expect(markdownParaHtml("# Passo a passo\n## Detalhe")).toBe(
      "<h2>Passo a passo</h2>\n<h3>Detalhe</h3>"
    );
  });

  it("parágrafo, negrito e lista", () => {
    expect(markdownParaHtml("Abra o **Eberick**.\n\n- um\n- dois")).toBe(
      "<p>Abra o <strong>Eberick</strong>.</p>\n<ul><li>um</li><li>dois</li></ul>"
    );
  });

  it("tabela com cabeçalho", () => {
    expect(markdownParaHtml("| Campo | Valor |\n| --- | --- |\n| Altura | 20 cm |")).toBe(
      "<table><thead><tr><th>Campo</th><th>Valor</th></tr></thead>" +
        "<tbody><tr><td>Altura</td><td>20 cm</td></tr></tbody></table>"
    );
  });

  it("bloco de código é escapado e não interpreta negrito", () => {
    expect(markdownParaHtml("```\n<b>**x**</b>\n```")).toBe(
      "<pre><code>&lt;b&gt;**x**&lt;/b&gt;</code></pre>"
    );
  });

  it("escapa o texto: o que alguém escreveu como exemplo não vira marcação no portal", () => {
    expect(markdownParaHtml('Use <script> e "aspas" & mais')).toBe(
      "<p>Use &lt;script&gt; e &quot;aspas&quot; &amp; mais</p>"
    );
  });

  it("sai sem classe nenhuma", () => {
    expect(markdownParaHtml("# T\n- a\n| a | b |\n| - | - |\n| 1 | 2 |")).not.toContain("class=");
  });
});
