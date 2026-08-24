import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import { parseDelimited } from "@/lib/delimited";
import { buildImportPlan, readInstant, resolveSection, splitKeywords } from "./importPlan";
import { guessMapping, type ColumnMapping } from "./mapping";

const taxonomy: Taxonomy = {
  categories: [
    { id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 },
    { id: "cat-visus", name: "AltoQi Visus", isProduct: true, order: 1 },
  ],
  sections: [
    { id: "sec-eletrica", categoryId: "cat-builder", name: "Elétrica", order: 0 },
    { id: "sec-inst-builder", categoryId: "cat-builder", name: "Instalação", order: 1 },
    { id: "sec-inst-visus", categoryId: "cat-visus", name: "Instalação", order: 0 },
  ],
  genres: [],
  opportunityTypes: [],
};

const options = {
  projectId: "p1",
  contentFormat: "html" as const,
  defaultStatus: "published" as const,
  now: new Date("2026-08-21T12:00:00.000Z"),
};

function planFrom(csv: string, mapping?: ColumnMapping, existing: KnowledgeArticle[] = []) {
  const table = parseDelimited(csv);
  return buildImportPlan(table, mapping ?? guessMapping(table.headers), taxonomy, existing, options);
}

describe("resolveSection", () => {
  it("casa pelo nome, ignorando acento e caixa", () => {
    expect(resolveSection(taxonomy, "eletrica", "")).toBe("sec-eletrica");
    expect(resolveSection(taxonomy, "  ELÉTRICA ", "")).toBe("sec-eletrica");
  });

  it("nome repetido em dois produtos precisa da categoria", () => {
    /*
      "Instalação" existe no Builder e no Visus. Escolher uma seria arbitrário,
      e arbitrário contamina mil e oitocentos registros de uma vez.
    */
    expect(resolveSection(taxonomy, "Instalação", "")).toBe("");
    expect(resolveSection(taxonomy, "Instalação", "AltoQi Visus")).toBe("sec-inst-visus");
  });

  it("seção que não existe no cadastro vira vazio, e não a mais parecida", () => {
    // Encaixar por semelhança é a classificação inventada que o produto recusa.
    expect(resolveSection(taxonomy, "Elétrica Predial", "")).toBe("");
  });
});

describe("readInstant", () => {
  it("lê ISO e dd/mm/aaaa", () => {
    expect(readInstant("2026-03-10T08:00:00.000Z")?.getUTCFullYear()).toBe(2026);
    expect(readInstant("10/03/2026")?.getMonth()).toBe(2);
  });

  it("dia que não existe não vira o mês seguinte", () => {
    expect(readInstant("31/02/2026")).toBeNull();
  });

  it("o que não dá para situar no tempo devolve nulo em vez de chutar", () => {
    // Data inventada faz o painel contar um mês em que nada aconteceu.
    expect(readInstant("ontem")).toBeNull();
    expect(readInstant("")).toBeNull();
  });
});

describe("splitKeywords", () => {
  it("aceita vírgula e ponto e vírgula, e descarta vazio", () => {
    expect(splitKeywords("laje, viga ; pilar,")).toEqual(["laje", "viga", "pilar"]);
  });
});

describe("buildImportPlan", () => {
  it("cria os registros que ainda não existem", () => {
    const plan = planFrom("titulo,resumo,secao\nComo lançar viga,Passo a passo,Elétrica");

    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].title).toBe("Como lançar viga");
    expect(plan.create[0].sectionId).toBe("sec-eletrica");
    expect(plan.create[0].contentFormat).toBe("html");
  });

  it("linha sem título é recusada, e contada", () => {
    /*
      Sem título a linha não identifica registro nenhum. Contar em vez de
      sumir é o que permite quem importa perceber que o arquivo tem lixo.
    */
    const plan = planFrom("titulo,resumo\n,sem sujeito\nCom título,ok");

    expect(plan.create).toHaveLength(1);
    expect(plan.skippedNoTitle).toBe(1);
  });

  it("o mesmo id do portal atualiza em vez de duplicar", () => {
    const existente: KnowledgeArticle = {
      id: "a1",
      title: "Título antigo",
      summary: "",
      content: "",
      projectId: "p1",
      genreId: "gen-faq",
      status: "published",
      sectionId: "sec-eletrica",
      portalArticleId: "360001",
      tags: [],
      keywords: [],
      author: "Suporte Visus",
      contentFormat: "html",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const plan = planFrom(
      "id,titulo,secao\n360001,Título novo,Elétrica",
      undefined,
      [existente]
    );

    expect(plan.create).toHaveLength(0);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].id).toBe("a1");
    expect(plan.update[0].title).toBe("Título novo");
  });

  it("atualizar preserva o que o arquivo não traz", () => {
    /*
      O gênero é nosso, não do portal, e a reimportação não pode apagá-lo — a
      pessoa classificou o artigo aqui dentro.
    */
    const existente = {
      id: "a1",
      title: "Antigo",
      summary: "",
      content: "",
      projectId: "p1",
      genreId: "gen-faq",
      status: "published" as const,
      sectionId: "sec-eletrica",
      portalArticleId: "360001",
      tags: [],
      keywords: [],
      author: "Suporte Visus",
      contentFormat: "html" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const plan = planFrom("id,titulo\n360001,Novo", undefined, [existente]);

    expect(plan.update[0].genreId).toBe("gen-faq");
    expect(plan.update[0].author).toBe("Suporte Visus");
    expect(plan.update[0].createdAt).toEqual(existente.createdAt);
  });

  it("o mesmo artigo duas vezes no arquivo vira um registro só", () => {
    // Fica com a última: numa exportação em duas passagens, é a mais recente.
    const plan = planFrom("id,titulo\n360001,Primeira\n360001,Segunda");

    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].title).toBe("Segunda");
    expect(plan.duplicatedInFile).toBe(1);
  });

  it("conta quantos entram sem seção, para alguém reclassificar", () => {
    /*
      É o número que decide se vale importar agora ou arrumar a planilha
      antes — e sem ele a pessoa descobre depois, com o acervo dentro.
    */
    const plan = planFrom("titulo,secao\nA,Elétrica\nB,Seção inexistente\nC,");

    expect(plan.withoutSection).toBe(2);
  });

  it("data ilegível recebe a data da importação, e é contada", () => {
    const plan = planFrom("titulo,atualizado em\nA,2026-03-10\nB,ontem");

    expect(plan.unreadableDate).toBe(1);
    expect(plan.create[1].updatedAt).toEqual(options.now);
  });

  it("estágio do arquivo vence o padrão, quando é reconhecido", () => {
    const plan = planFrom("titulo,status\nA,Rascunho\nB,\nC,coisa estranha");

    expect(plan.create[0].status).toBe("draft");
    expect(plan.create[1].status).toBe("published");
    // O que não é reconhecido cai no padrão declarado, e não num estado inventado.
    expect(plan.create[2].status).toBe("published");
  });

  it("coluna que ninguém lê é anunciada", () => {
    /*
      Uma coluna importante deixada de fora por engano é invisível depois da
      gravação. Antes dela, é uma linha na tela.
    */
    const plan = planFrom("titulo,uma coluna qualquer\nA,x");

    expect(plan.unusedColumns).toEqual(["uma coluna qualquer"]);
  });

  it("o formato do conteúdo é o declarado, nunca farejado", () => {
    // Converter nos dois sentidos degrada a cada ida e volta.
    const table = parseDelimited("titulo,conteudo\nA,<p>html de verdade</p>");
    const plan = buildImportPlan(table, guessMapping(table.headers), taxonomy, [], {
      ...options,
      contentFormat: "markdown",
    });

    expect(plan.create[0].contentFormat).toBe("markdown");
  });
});
