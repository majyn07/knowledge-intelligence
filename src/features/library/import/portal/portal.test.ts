import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import {
  articleBodyOf,
  breadcrumbOf,
  decodeEntities,
  extractArticle,
  tidySummary,
} from "./portalArticlePage";
import type { PortalArticle } from "./portalArticlePage";
import { buildPortalImportPlan } from "./portalImportPlan";
import { articleUrls, isForeignLocale, parseSitemap, portalIdOf } from "./portalSitemap";

const taxonomy: Taxonomy = {
  categories: [
    { id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 },
    { id: "cat-eberick", name: "AltoQi Eberick", isProduct: true, order: 1 },
  ],
  sections: [
    { id: "sec-geral", categoryId: "cat-builder", name: "Geral", order: 0 },
    { id: "sec-lajes", categoryId: "cat-eberick", name: "Lajes | Dimensionamento", order: 1 },
    // Nome repetido entre categorias: é o caso real que a categoria desempata.
    { id: "sec-inst-b", categoryId: "cat-builder", name: "Instalação", order: 2 },
    { id: "sec-inst-e", categoryId: "cat-eberick", name: "Instalação", order: 3 },
  ],
  genres: [],
  opportunityTypes: [],
};

function pagina(extra: Partial<PortalArticle> = {}): PortalArticle {
  return {
    portalArticleId: "4403543493655",
    url: "https://suporte.altoqi.com.br/hc/pt-br/articles/4403543493655",
    title: "Como ocultar elementos",
    summary: "Resumo do artigo",
    contentHtml: "<p>Conteúdo</p>",
    categoryName: "AltoQi Builder",
    sectionName: "Geral",
    ...extra,
  };
}

const existente = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: "art-1",
  title: "Antigo",
  summary: "",
  content: "",
  projectId: "",
  genreId: "gen-tutorial",
  status: "published",
  sectionId: "sec-geral",
  portalArticleId: "4403543493655",
  tags: [],
  keywords: [],
  author: "Equipe Builder",
  contentFormat: "html",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...extra,
});

const AGORA = new Date("2026-08-27T10:00:00.000Z");

describe("parseSitemap", () => {
  it("lê endereço e data de alteração", () => {
    const entradas = parseSitemap(
      "<urlset>" +
        "<url><loc>https://p/hc/pt-br/articles/1</loc><lastmod>2026-08-01T10:00:00Z</lastmod></url>" +
        "<url><loc>https://p/hc/pt-br/articles/2</loc></url>" +
        "</urlset>"
    );

    expect(entradas).toEqual([
      { url: "https://p/hc/pt-br/articles/1", lastmod: "2026-08-01T10:00:00Z" },
      { url: "https://p/hc/pt-br/articles/2", lastmod: "" },
    ]);
  });
});

describe("portalIdOf", () => {
  it("usa o número quando a URL o traz", () => {
    expect(portalIdOf("https://p/hc/pt-br/articles/4403543493655")).toBe("4403543493655");
  });

  /*
    Cerca de 140 artigos do portal usam só o slug, e o canonical confirma o
    slug — não há número em lugar nenhum. Sem identidade, reimportar duplicaria.
  */
  it("cai no slug quando não há número", () => {
    expect(portalIdOf("https://p/hc/pt-br/comandos-de-manipulacao")).toBe(
      "comandos-de-manipulacao"
    );
  });

  it("decodifica o slug escapado", () => {
    expect(portalIdOf("https://p/hc/pt-br/comandos-de-manipula%C3%A7%C3%A3o")).toBe(
      "comandos-de-manipulação"
    );
  });
});

describe("isForeignLocale", () => {
  it("reconhece o prefixo de outra língua", () => {
    expect(isForeignLocale("https://p/es-mx/hc/pt-br/reinstalacion")).toBe(true);
    expect(isForeignLocale("https://p/hc/pt-br/articles/1")).toBe(false);
  });

  it("filtra a lista de visitas", () => {
    const entradas = [
      { url: "https://p/hc/pt-br/articles/1", lastmod: "" },
      { url: "https://p/es-mx/hc/pt-br/algo", lastmod: "" },
    ];

    expect(articleUrls(entradas).map((e) => e.url)).toEqual([
      "https://p/hc/pt-br/articles/1",
    ]);
  });
});

describe("decodeEntities", () => {
  it("resolve nomeadas, decimais e hexadecimais", () => {
    expect(decodeEntities("Mensagem &quot;n&#227;o&quot; &amp; &#x41;")).toBe(
      'Mensagem "não" & A'
    );
  });

  it("deixa passar o que não reconhece", () => {
    expect(decodeEntities("&naoexiste;")).toBe("&naoexiste;");
  });

  /*
    O portal escreve `&amp;quot;AF-8&amp;quot;` no `meta description`: uma
    passada devolve `&quot;`, que era o que aparecia na tela.
  */
  it("resolve entidade codificada duas vezes", () => {
    expect(decodeEntities("&amp;quot;AF-8&amp;quot;")).toBe('"AF-8"');
  });

  it("resolve as letras acentuadas em nome", () => {
    expect(decodeEntities("c&iacute;rculos e op&ccedil;&otilde;es")).toBe("círculos e opções");
  });

  /* O teto de duas passadas é deliberado: um artigo que fala sobre `&amp;` fica. */
  it("não decodifica sem parar", () => {
    expect(decodeEntities("&amp;amp;amp;")).toBe("&amp;");
  });
});

describe("breadcrumbOf", () => {
  const trilha = (degraus: string[]) =>
    '<nav class="breadcrumbs">' +
    degraus.map((d) => `<a href="/x">${d}</a>`).join("") +
    "</nav>";

  it("lê os três degraus", () => {
    expect(breadcrumbOf(trilha(["AltoQi Suporte", "AltoQi Builder", "Geral"]))).toEqual([
      "AltoQi Suporte",
      "AltoQi Builder",
      "Geral",
    ]);
  });

  /* Artigo com categoria e sem seção existe no portal, e é legítimo. */
  it("aceita trilha de dois degraus", () => {
    expect(breadcrumbOf(trilha(["AltoQi Suporte", "AltoQi Builder"]))).toHaveLength(2);
  });

  it("devolve vazio quando não há trilha", () => {
    expect(breadcrumbOf("<div>nada</div>")).toEqual([]);
  });
});

describe("extractArticle", () => {
  /*
    A estrutura real do portal: o `<article>` envolve o layout inteiro da
    HubSpot, e o corpo mora num campo de texto rico lá dentro. Importar o
    `<article>` trazia dezenove `div` de grade junto com o texto.
  */
  const corpo =
    '<div id="hs_cos_wrapper_kb-article-module-5_" class="hs_cos_wrapper" ' +
    'data-hs-cos-general-type="widget" data-hs-cos-type="inline_richtext_field">' +
    "<p>Os comandos ficam na guia Operações.</p>" +
    "</div>";

  const rodape =
    '<div data-hs-cos-type="inline_richtext_field"><p>Copyright AltoQi.</p></div>';

  const html =
    "<html><head>" +
    '<meta property="og:title" content="Como ocultar/exibir elementos" />' +
    '<meta name="description" content="No decorrer de um projeto&#8230;" />' +
    "</head><body>" +
    '<nav class="breadcrumbs"><a href="/">AltoQi Suporte</a><a href="/b">AltoQi Builder</a><a href="/b#g">Geral</a></nav>' +
    '<article><div class="container-fluid article-wrapper"><div class="row-fluid">' +
    corpo +
    "</div></div></article>" +
    rodape +
    "</body></html>";

  it("monta o artigo a partir da página", () => {
    const artigo = extractArticle(html, "https://p/hc/pt-br/articles/440");

    expect(artigo).toMatchObject({
      portalArticleId: "440",
      title: "Como ocultar/exibir elementos",
      categoryName: "AltoQi Builder",
      sectionName: "Geral",
      contentHtml: "<p>Os comandos ficam na guia Operações.</p>",
    });
  });

  it("decodifica o resumo, que chega escapado do atributo", () => {
    expect(extractArticle(html, "https://p/hc/pt-br/articles/440")?.summary).toBe(
      "No decorrer de um projeto…"
    );
  });

  /*
    Página sem corpo entraria como artigo vazio na Biblioteca, com cara de
    artigo existente. Vira contagem no plano, não registro.
  */
  it("recusa página sem campo de texto rico", () => {
    const semCorpo = html.replace(/data-hs-cos-type="inline_richtext_field"/g, "");
    expect(extractArticle(semCorpo, "https://p/hc/pt-br/articles/440")).toBeNull();
  });

  /*
    O andaime da HubSpot é o que aparecia na tela como texto. O corpo extraído
    não pode conter nenhum `div` de grade.
  */
  it("traz só o corpo, sem o andaime de layout", () => {
    const extraido = extractArticle(html, "https://p/hc/pt-br/articles/440")!.contentHtml;

    expect(extraido).not.toContain("container-fluid");
    expect(extraido).not.toContain("row-fluid");
    expect(extraido).toBe("<p>Os comandos ficam na guia Operações.</p>");
  });

  /* O rodapé do portal também é campo de texto rico: vale o de mais texto. */
  it("escolhe o bloco de mais texto quando há mais de um", () => {
    expect(articleBodyOf(html)).toBe("<p>Os comandos ficam na guia Operações.</p>");
  });

  it("devolve vazio quando não há campo de texto rico", () => {
    expect(articleBodyOf("<article><p>solto</p></article>")).toBe("");
  });

  it("recusa página sem título", () => {
    const semTitulo = html
      .replace(/<meta property="og:title"[^>]*\/>/, "")
      .replace(/<title[^>]*>[\s\S]*?<\/title>/, "");

    expect(extractArticle(semTitulo, "https://p/hc/pt-br/articles/440")).toBeNull();
  });
});

describe("buildPortalImportPlan", () => {
  it("cria o que não existe e atualiza o que já existe", () => {
    const plan = buildPortalImportPlan(
      [pagina(), pagina({ portalArticleId: "999", url: "https://p/hc/pt-br/articles/999" })],
      taxonomy,
      [existente()],
      { now: AGORA }
    );

    expect(plan.update).toHaveLength(1);
    expect(plan.create).toHaveLength(1);
    expect(plan.update[0].id).toBe("art-1");
  });

  it("classifica pela trilha, desempatando pela categoria", () => {
    const plan = buildPortalImportPlan(
      [pagina({ sectionName: "Instalação", categoryName: "AltoQi Eberick" })],
      taxonomy,
      [],
      { now: AGORA }
    );

    expect(plan.create[0].sectionId).toBe("sec-inst-e");
  });

  /* Nome que não existe no cadastro vira vazio e é contado, nunca encaixado. */
  it("deixa sem seção o que o cadastro não reconhece", () => {
    const plan = buildPortalImportPlan(
      [pagina({ sectionName: "Seção Inventada" })],
      taxonomy,
      [],
      { now: AGORA }
    );

    expect(plan.create[0].sectionId).toBe("");
    expect(plan.withoutSection).toBe(1);
  });

  /*
    Artigo de trilha curta não pode apagar a classificação que alguém fez aqui:
    seria a importação desfazendo revisão humana.
  */
  it("preserva a seção existente quando o portal não traz nenhuma", () => {
    const plan = buildPortalImportPlan(
      [pagina({ sectionName: "" })],
      taxonomy,
      [existente({ sectionId: "sec-lajes" })],
      { now: AGORA }
    );

    expect(plan.update[0].sectionId).toBe("sec-lajes");
    expect(plan.keptExistingSection).toBe(1);
    expect(plan.withoutSection).toBe(0);
  });

  it("preserva gênero e responsável, que são nossos e não do portal", () => {
    const plan = buildPortalImportPlan([pagina()], taxonomy, [existente()], { now: AGORA });

    expect(plan.update[0].genreId).toBe("gen-tutorial");
    expect(plan.update[0].author).toBe("Equipe Builder");
  });

  it("nunca carimba iniciativa, e declara o formato", () => {
    const plan = buildPortalImportPlan([pagina()], taxonomy, [], { now: AGORA });

    expect(plan.create[0].projectId).toBe("");
    expect(plan.create[0].contentFormat).toBe("html");
    expect(plan.create[0].status).toBe("published");
  });

  it("conta a página que não entregou conteúdo", () => {
    const plan = buildPortalImportPlan([null, pagina()], taxonomy, [], { now: AGORA });

    expect(plan.skippedNoContent).toBe(1);
    expect(plan.create).toHaveLength(1);
  });

  it("usa a data do sitemap como atualização", () => {
    const plan = buildPortalImportPlan([pagina()], taxonomy, [], {
      now: AGORA,
      lastmodByUrl: new Map([[pagina().url, "2026-07-15T08:00:00.000Z"]]),
    });

    expect(plan.create[0].updatedAt.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("conta repetido dentro do lote sem duplicar registro", () => {
    const plan = buildPortalImportPlan([pagina(), pagina()], taxonomy, [], { now: AGORA });

    expect(plan.duplicated).toBe(1);
    expect(plan.create).toHaveLength(1);
  });
});

describe("tidySummary", () => {
  /*
    O portal corta o `meta description` em duzentos caracteres, no meio da
    palavra. Trinta e sete de quarenta artigos da amostra chegavam assim.
  */
  it("corta na última palavra inteira e marca que há mais", () => {
    expect(tidySummary("siga direto ao item 5 do presente artigo antes de le")).toBe(
      "siga direto ao item 5 do presente artigo antes de…"
    );
  });

  it("não toca em frase que termina normalmente", () => {
    expect(tidySummary("O comando fica na guia Operações.")).toBe(
      "O comando fica na guia Operações."
    );
    expect(tidySummary("Já resumido…")).toBe("Já resumido…");
  });

  it("descarta vírgula solta antes das reticências", () => {
    expect(tidySummary("primeiro, segundo, ter")).toBe("primeiro, segundo…");
  });

  it("devolve como veio quando não há palavra anterior a preservar", () => {
    expect(tidySummary("palavraunica")).toBe("palavraunica");
  });

  it("lida com resumo vazio", () => {
    expect(tidySummary("   ")).toBe("");
  });
});
