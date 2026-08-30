import { describe, expect, it } from "vitest";

import type { Finding } from "@/features/survey/survey";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";
import type { Ticket } from "@/models/Ticket";

import { pageFacts, type EntradaDosFatos } from "./pageFacts";

let sequencia = 0;

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: `art-${(sequencia += 1)}`,
  title: "Exportando o modelo IFC do Eberick",
  summary: "",
  content: "",
  contentFormat: "markdown",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-ifc",
  tags: [],
  keywords: [],
  author: "",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  ...extra,
});

const ticket = (extra: Partial<Ticket> = {}): Ticket =>
  ({
    id: `tic-${(sequencia += 1)}`,
    title: "Modelo IFC abre deslocado",
    solution: "Reposicionado na origem.",
    ...extra,
  }) as Ticket;

const taxonomy: Taxonomy = {
  categories: [{ id: "cat-eberick", name: "Eberick", isProduct: true }],
  sections: [{ id: "sec-ifc", categoryId: "cat-eberick", name: "Exportação" }],
  genres: [],
  opportunityTypes: [],
} as unknown as Taxonomy;

const achado = (extra: Partial<Finding> = {}): Finding => ({
  id: `ach-${(sequencia += 1)}`,
  kind: "sobreposicao",
  origin: "calculado",
  severity: "alta",
  action: "Comparar dois artigos",
  subject: "Exportação",
  why: "Dividem 18 termos de vocabulário.",
  href: "/library",
  ...extra,
});

const entrada = (extra: Partial<EntradaDosFatos> = {}): EntradaDosFatos => ({
  rota: "/library",
  articles: [],
  tickets: [],
  conversations: [],
  taxonomy,
  achados: [],
  ...extra,
});

describe("pageFacts", () => {
  it("na Biblioteca conta o acervo e separa o que está sem seção", () => {
    const retrato = pageFacts(
      entrada({
        articles: [artigo(), artigo({ sectionId: "" }), artigo({ status: "draft" })],
      })
    );

    expect(retrato.tela).toContain("Biblioteca");
    expect(retrato.fatos).toContainEqual({ rotulo: "Artigos no acervo", valor: "3" });
    expect(retrato.fatos).toContainEqual({ rotulo: "Publicados", valor: "2" });
    expect(retrato.fatos).toContainEqual({ rotulo: "Sem seção", valor: "1" });
  });

  /*
    "Sem seção" aparecia duas vezes na conferência da tela, com 56 e 55: uma
    como contagem do acervo, outra como se fosse uma seção. Números diferentes
    sob o mesmo rótulo leem como contradição, e as duas linhas ainda colidiam
    na chave do React.
  */
  it("não repete rótulo entre os fatos", () => {
    const retrato = pageFacts(
      entrada({ articles: [artigo(), artigo({ sectionId: "" }), artigo({ sectionId: "" })] })
    );

    const rotulos = retrato.fatos.map((fato) => fato.rotulo);

    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  it("a quebra por seção não inclui quem está sem seção", () => {
    const retrato = pageFacts(entrada({ articles: [artigo(), artigo({ sectionId: "" })] }));

    expect(retrato.fatos).toContainEqual({ rotulo: "Seção Exportação", valor: "1" });
    expect(retrato.fatos.filter((fato) => fato.rotulo.includes("Sem seção"))).toHaveLength(1);
  });

  /*
    A pergunta que originou o painel: "existe conteúdo repetido ou artigos que
    poderiam estar em um só?". Ela se responde com os achados já apurados, e o
    "por que" tem de ir junto — sem ele o modelo teria de supor a evidência.
  */
  it("leva os achados com a evidência de cada um", () => {
    const retrato = pageFacts(entrada({ achados: [achado()] }));

    expect(retrato.achados).toEqual([
      {
        titulo: "Comparar dois artigos — Exportação",
        porque: "Dividem 18 termos de vocabulário.",
      },
    ]);
  });

  /*
    O retrato é retrato, e não acervo: 1.822 artigos não cabem num pedido, e a
    amostra existe para o modelo ter exemplo concreto, não para ele afirmar
    coisas sobre o todo a partir dela.
  */
  it("a amostra tem teto, mesmo com o acervo inteiro", () => {
    const retrato = pageFacts(
      entrada({ articles: Array.from({ length: 1_822 }, () => artigo()) })
    );

    expect(retrato.amostra.length).toBeLessThanOrEqual(12);
    expect(retrato.fatos).toContainEqual({ rotulo: "Artigos no acervo", valor: "1822" });
  });

  it("a lista de achados tem teto", () => {
    const retrato = pageFacts(
      entrada({ achados: Array.from({ length: 60 }, () => achado()) })
    );

    expect(retrato.achados.length).toBeLessThanOrEqual(15);
  });

  it("em Atendimentos conta a fila, não o acervo", () => {
    const retrato = pageFacts(
      entrada({
        rota: "/analysis",
        articles: [artigo()],
        tickets: [ticket(), ticket({ solution: "" })],
      })
    );

    expect(retrato.tela).toContain("Atendimentos");
    expect(retrato.fatos).toContainEqual({ rotulo: "Atendimentos", valor: "2" });
    expect(retrato.fatos).toContainEqual({ rotulo: "Sem solução registrada", valor: "1" });
    expect(retrato.fatos.map((f) => f.rotulo)).not.toContain("Artigos no acervo");
  });

  it("no Levantamento agrupa os achados por gravidade", () => {
    const retrato = pageFacts(
      entrada({
        rota: "/survey",
        achados: [achado(), achado({ severity: "baixa" })],
      })
    );

    expect(retrato.fatos).toContainEqual({ rotulo: "Achados", valor: "2" });
    expect(retrato.fatos).toContainEqual({ rotulo: "alta", valor: "1" });
  });

  /* Rota desconhecida responde o geral, e não quebra nem inventa recorte. */
  it("rota sem recorte próprio devolve o retrato geral", () => {
    const retrato = pageFacts(
      entrada({ rota: "/settings", articles: [artigo()], tickets: [ticket()] })
    );

    expect(retrato.tela).toContain("Visus");
    expect(retrato.fatos).toContainEqual({ rotulo: "Artigos", valor: "1" });
  });

  it("espaço de trabalho vazio devolve retrato zerado, e não quebra", () => {
    const retrato = pageFacts(entrada());

    expect(retrato.fatos).toContainEqual({ rotulo: "Artigos no acervo", valor: "0" });
    expect(retrato.amostra).toEqual([]);
  });

  /*
    Campo de texto vazio não diz o que a ferramenta alcança, e quem não sabe o
    que ela sabe pergunta o que ela não pode responder.
  */
  it("toda tela sugere o que perguntar ali", () => {
    for (const rota of ["/library", "/analysis", "/survey", "/indicators", "/settings"]) {
      expect(pageFacts(entrada({ rota })).sugestoes.length).toBeGreaterThan(0);
    }
  });

  /* A pergunta que originou o painel é oferecida onde ela se responde. */
  it("a Biblioteca sugere a pergunta sobre conteúdo repetido", () => {
    expect(pageFacts(entrada({ rota: "/library" })).sugestoes.join(" ")).toContain("repetido");
  });

  /*
    O `alcance` existe para o modelo não prometer o que não alcança: ele recebe
    um retrato, e perguntas que exigiriam ler o acervo não têm resposta aqui.
  */
  it("toda tela declara o que a IA alcança ali", () => {
    for (const rota of ["/library", "/analysis", "/survey", "/indicators", "/settings"]) {
      expect(pageFacts(entrada({ rota })).alcance.length).toBeGreaterThan(20);
    }
  });
});
