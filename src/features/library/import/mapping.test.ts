import { describe, expect, it } from "vitest";

import { emptyMapping, guessMapping, mappingIsComplete } from "./mapping";

describe("guessMapping", () => {
  it("reconhece os cabeçalhos conhecidos, com ou sem acento", () => {
    const mapping = guessMapping(["Título", "Resumo", "Conteúdo", "Seção"]);

    expect(mapping.title).toBe(0);
    expect(mapping.summary).toBe(1);
    expect(mapping.content).toBe(2);
    expect(mapping.sectionName).toBe(3);
  });

  it("cabeçalho desconhecido fica vazio, e não no campo mais parecido", () => {
    /*
      "nome do autor" casaria com "nome" numa comparação por trecho, e o
      resultado seria mil e oitocentos artigos intitulados com quem escreveu.
    */
    const mapping = guessMapping(["nome do autor", "coisa qualquer"]);

    expect(mapping.title).toBeNull();
    expect(mapping.author).toBeNull();
  });

  it("uma coluna alimenta um campo só", () => {
    // Duplicar gravaria o mesmo texto em dois lugares sem ninguém pedir.
    const mapping = guessMapping(["titulo"]);
    const usos = Object.values(mapping).filter((index) => index === 0);

    expect(usos).toHaveLength(1);
  });

  it("reconhece os nomes em inglês da exportação", () => {
    const mapping = guessMapping(["Article ID", "Name", "Article body", "Public URL"]);

    expect(mapping.portalArticleId).toBe(0);
    expect(mapping.title).toBe(1);
    expect(mapping.content).toBe(2);
    expect(mapping.url).toBe(3);
  });
});

describe("mappingIsComplete", () => {
  it("sem título não dá para importar", () => {
    expect(mappingIsComplete(emptyMapping())).toBe(false);
    expect(mappingIsComplete({ ...emptyMapping(), title: 0 })).toBe(true);
  });
});
