import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";
import type { Taxonomy } from "@/models/Taxonomy";

import { buildSurvey, surveySummary, type Finding } from "./survey";

const now = new Date("2026-08-21T12:00:00.000Z");
const diasAtras = (n: number) => new Date(now.getTime() - n * 86_400_000);

const taxonomy: Taxonomy = {
  categories: [
    { id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 },
    { id: "cat-apoio", name: "Quero falar com o Suporte", isProduct: false, order: 1 },
  ],
  sections: [
    { id: "sec-eletrica", categoryId: "cat-builder", name: "Elétrica", order: 0 },
    { id: "sec-spda", categoryId: "cat-builder", name: "SPDA", order: 1 },
    { id: "sec-contato", categoryId: "cat-apoio", name: "Contato", order: 0 },
  ],
  genres: [],
  opportunityTypes: [],
};

const artigo = (over: Partial<KnowledgeArticle>): KnowledgeArticle => ({
  id: "a1",
  title: "Artigo",
  summary: "Um resumo.",
  content: "",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-eletrica",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "markdown",
  createdAt: diasAtras(5),
  updatedAt: diasAtras(5),
  ...over,
});

const atendimento = (over: Partial<Ticket>): Ticket => ({
  id: "t1",
  projectId: "p1",
  title: "Erro ao exportar",
  solution: "Resolvido reinstalando.",
  company: "",
  date: "2026-08-01",
  ...over,
});

const survey = (articles: KnowledgeArticle[], tickets: Ticket[] = []): Finding[] =>
  buildSurvey({ articles, tickets, taxonomy, now });

const kinds = (findings: Finding[]) => findings.map((finding) => finding.kind);

describe("seção sem artigo", () => {
  it("agrupa por categoria, e diz quais seções estão descobertas", () => {
    /*
      Uma linha por seção produziu 117 achados na primeira execução real: a
      lista do portal inteiro, afogando os três que alguém resolveria hoje.
    */
    const achados = survey([artigo({})]);
    const achado = achados.find((f) => f.kind === "secao-vazia");

    expect(achados.filter((f) => f.kind === "secao-vazia")).toHaveLength(1);
    expect(achado?.subject).toBe("AltoQi Builder");
    expect(achado?.why).toContain("1 de 2 seções");
    expect(achado?.why).toContain("SPDA");
  });

  it("rascunho não cobre seção", () => {
    /*
      Mesma regra do resto do produto: só publicado conta como cobertura. Quem
      chega no portal não vê rascunho.
    */
    const achados = survey([artigo({ sectionId: "sec-spda", status: "draft" })]);
    const achado = achados.find((f) => f.kind === "secao-vazia");

    expect(achado?.why).toContain("2 de 2 seções");
  });

  it("seção de categoria de apoio não vira lacuna", () => {
    /*
      "Quero falar com o Suporte" não descreve assunto técnico, e apareceria
      como lacuna eterna que ninguém vai fechar.
    */
    const achados = survey([artigo({}), artigo({ id: "a2", sectionId: "sec-spda" })]);

    expect(achados.filter((f) => f.kind === "secao-vazia")).toEqual([]);
  });
});

describe("artigo sem seção", () => {
  it("publicado sem seção é achado de severidade alta", () => {
    // Existe, está no ar e não conta como cobertura em lugar nenhum.
    const achados = survey([artigo({ sectionId: "" })]);
    const achado = achados.find((f) => f.kind === "sem-secao");

    expect(achado?.severity).toBe("alta");
    expect(achado?.why).toContain("não conta como cobertura");
  });

  it("rascunho sem seção é média, e não alta", () => {
    const achados = survey([artigo({ sectionId: "", status: "draft" })]);

    expect(achados.find((f) => f.kind === "sem-secao")?.severity).toBe("media");
  });

  it("muitos sem seção viram um achado só, com o caminho do mutirão", () => {
    /*
      Depois de uma importação, "sem seção" é a condição de centenas de uma vez.
      A primeira execução com acervo real produziu 600 linhas iguais: a mesma
      falha das seções vazias, e a lista deixa de dizer por onde começar.
    */
    const muitos = Array.from({ length: 40 }, (_, i) =>
      artigo({ id: `a${i}`, sectionId: "" })
    );

    const achados = survey(muitos).filter((f) => f.kind === "sem-secao");

    expect(achados).toHaveLength(1);
    expect(achados[0].action).toContain("40 artigos");
    expect(achados[0].href).toBe("/library?categoria=unset");
    expect(achados[0].why).toContain("sugere a seção de todos");
  });

  it("poucos continuam um a um, porque dá para resolver abrindo", () => {
    const poucos = [artigo({ id: "a1", sectionId: "" }), artigo({ id: "a2", sectionId: "" })];
    const achados = survey(poucos).filter((f) => f.kind === "sem-secao");

    expect(achados).toHaveLength(2);
    expect(achados[0].href).toBe("/library/a1");
  });

  it("seção que não existe mais no cadastro conta como sem seção", () => {
    // Remover categoria deixa artigos apontando para o vazio, de propósito.
    expect(kinds(survey([artigo({ sectionId: "sec-que-sumiu" })]))).toContain("sem-secao");
  });
});

describe("sem resumo", () => {
  it("publicado sem resumo aparece", () => {
    // O resumo é o que a busca e a análise leem antes do conteúdo.
    expect(kinds(survey([artigo({ summary: "   " })]))).toContain("sem-resumo");
  });

  it("rascunho sem resumo não aparece", () => {
    // Rascunho está sendo escrito; cobrar resumo dele é cobrar trabalho no meio.
    expect(kinds(survey([artigo({ summary: "", status: "draft" })]))).not.toContain("sem-resumo");
  });
});

describe("parado", () => {
  it("rascunho intocado há mais de um mês vira achado", () => {
    const achados = survey([artigo({ status: "draft", updatedAt: diasAtras(45) })]);
    const achado = achados.find((f) => f.kind === "parado");

    expect(achado?.why).toContain("45 dias");
    expect(achado?.severity).toBe("media");
  });

  it("parado há muito tempo sobe de severidade", () => {
    const achados = survey([artigo({ status: "review", updatedAt: diasAtras(120) })]);

    expect(achados.find((f) => f.kind === "parado")?.severity).toBe("alta");
  });

  it("rascunho de ontem não é cobrado", () => {
    expect(kinds(survey([artigo({ status: "draft", updatedAt: diasAtras(2) })]))).not.toContain(
      "parado"
    );
  });

  it("a ação depende do estágio", () => {
    const revisao = survey([artigo({ status: "review", updatedAt: diasAtras(40) })]);
    const rascunho = survey([artigo({ status: "draft", updatedAt: diasAtras(40) })]);

    expect(revisao.find((f) => f.kind === "parado")?.action).toBe("Concluir a revisão");
    expect(rascunho.find((f) => f.kind === "parado")?.action).toBe("Retomar ou descartar");
  });
});

describe("envelhecido", () => {
  it("publicado há mais de um ano pede conferência, sem acusar", () => {
    /*
      Idade não é defeito: um artigo de dois anos pode estar perfeito. O achado
      é convite a olhar, e a frase precisa dizer isso.
    */
    const achados = survey([artigo({ updatedAt: diasAtras(400) })]);
    const achado = achados.find((f) => f.kind === "envelhecido");

    expect(achado?.severity).toBe("baixa");
    expect(achado?.action).toContain("Conferir");
  });

  it("publicado recente não aparece", () => {
    expect(kinds(survey([artigo({ updatedAt: diasAtras(60) })]))).not.toContain("envelhecido");
  });
});

describe("atendimento sem artigo", () => {
  it("atendimento resolvido que não virou conteúdo é achado alto", () => {
    // É o sinal que originou o produto.
    const achados = survey([artigo({})], [atendimento({})]);
    const achado = achados.find((f) => f.kind === "atendimento-sem-cobertura");

    expect(achado?.severity).toBe("alta");
    expect(achado?.href).toBe("/analysis?ticket=t1");
  });

  it("atendimento que já gerou artigo não é cobrado de novo", () => {
    const comOrigem = artigo({
      id: "a9",
      source: {
        projectId: "",
        ticketId: "t1",
        analysisId: "",
        opportunityId: "",
        planId: "",
      },
    });

    expect(kinds(survey([comOrigem], [atendimento({})]))).not.toContain(
      "atendimento-sem-cobertura"
    );
  });

  it("atendimento sem solução ainda não é candidato", () => {
    // Sem solução registrada não há o que virar conhecimento.
    expect(kinds(survey([artigo({})], [atendimento({ solution: "" })]))).not.toContain(
      "atendimento-sem-cobertura"
    );
  });
});

describe("a lista inteira", () => {
  it("vem do mais grave para o menos", () => {
    const achados = survey([
      artigo({ id: "velho", updatedAt: diasAtras(400) }),
      artigo({ id: "orfao", sectionId: "" }),
    ]);

    expect(achados[0].severity).toBe("alta");
    expect(achados[achados.length - 1].severity).toBe("baixa");
  });

  it("tudo que é derivado é marcado como calculado, e não como IA", () => {
    /*
      Regra de produto: não rotular métrica calculada como saída de modelo. A
      distinção existe para a revisão saber o que conferir com mais atenção.
    */
    const achados = survey([artigo({ sectionId: "" })], [atendimento({})]);

    expect(achados.every((finding) => finding.origin === "calculado")).toBe(true);
  });

  it("acervo saudável não inventa tarefa", () => {
    /*
      Um levantamento que inventa trabalho custa mais que nenhum: quem segue a
      lista uma vez e encontra tarefa inexistente para de seguir a lista.
    */
    const saudavel = [artigo({}), artigo({ id: "a2", sectionId: "sec-spda" })];

    expect(survey(saudavel, [])).toEqual([]);
  });

  it("o resumo conta o que foi achado, e nada além", () => {
    const achados = survey([artigo({ sectionId: "" })], [atendimento({})]);
    const resumo = surveySummary(achados);

    expect(resumo.total).toBe(achados.length);
    expect(resumo.alta).toBe(2);
    expect(resumo.propostos).toBe(0);
  });
});
