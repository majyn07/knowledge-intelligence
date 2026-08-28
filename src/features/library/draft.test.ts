import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import {
  acceptsDraft,
  discardDraft,
  draftChanges,
  editableContent,
  hasDraft,
  publishDraft,
} from "./draft";

const agora = new Date("2026-08-21T12:00:00.000Z");

function artigo(over: Partial<KnowledgeArticle> = {}): KnowledgeArticle {
  return {
    id: "a1",
    title: "Como publicar",
    summary: "Resumo publicado",
    content: "Conteúdo publicado",
    projectId: "p1",
    genreId: "gen-faq",
    status: "published",
    sectionId: "sec-collab",
    tags: [],
    keywords: [],
    author: "eq-visus",
    contentFormat: "markdown",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
  };
}

const rascunho = {
  title: "Como publicar (revisado)",
  summary: "Resumo publicado",
  content: "Conteúdo novo",
  updatedAt: "2026-08-21T10:00:00.000Z",
  author: "pes-1",
};

describe("acceptsDraft", () => {
  it("só o publicado aceita rascunho ao lado", () => {
    /*
      Onde não há versão publicada a preservar, o texto em edição já é o
      artigo: uma segunda cópia seria confusão sem ganho.
    */
    expect(acceptsDraft(artigo({ status: "published" }))).toBe(true);
    expect(acceptsDraft(artigo({ status: "draft" }))).toBe(false);
    expect(acceptsDraft(artigo({ status: "review" }))).toBe(false);
    expect(acceptsDraft(artigo({ status: "archived" }))).toBe(false);
  });
});

describe("editableContent", () => {
  it("mostra o rascunho quando existe", () => {
    expect(editableContent(artigo({ draft: rascunho })).content).toBe("Conteúdo novo");
  });

  it("mostra o publicado quando não existe", () => {
    expect(editableContent(artigo()).content).toBe("Conteúdo publicado");
  });
});

describe("draftChanges", () => {
  it("lista só o que foi tocado", () => {
    // Serve para responder "vale republicar?", e para isso basta saber o quê.
    expect(draftChanges(artigo({ draft: rascunho }))).toEqual(["title", "content"]);
  });

  it("rascunho idêntico ao publicado não mudou nada", () => {
    const igual = artigo();
    const comRascunho = artigo({
      draft: {
        title: igual.title,
        summary: igual.summary,
        content: igual.content,
        updatedAt: "",
        author: "",
      },
    });

    expect(draftChanges(comRascunho)).toEqual([]);
  });

  it("sem rascunho não há mudança", () => {
    expect(draftChanges(artigo())).toEqual([]);
  });
});

describe("publishDraft", () => {
  it("o rascunho vira o artigo e some", () => {
    const publicado = publishDraft(artigo({ draft: rascunho }), agora);

    expect(publicado.title).toBe("Como publicar (revisado)");
    expect(publicado.content).toBe("Conteúdo novo");
    expect(hasDraft(publicado)).toBe(false);
    expect(publicado.updatedAt).toBe(agora);
  });

  it("não altera o artigo recebido", () => {
    /*
      O resto do produto trata registro como imutável, e o histórico depende
      disso para guardar o antes.
    */
    const original = artigo({ draft: rascunho });
    publishDraft(original, agora);

    expect(original.title).toBe("Como publicar");
    expect(hasDraft(original)).toBe(true);
  });

  it("sem rascunho, publicar não faz nada", () => {
    const sem = artigo();

    expect(publishDraft(sem, agora)).toBe(sem);
  });

  it("a classificação não é tocada", () => {
    // Seção, gênero e responsável são atributos do artigo, não do texto.
    const publicado = publishDraft(artigo({ draft: rascunho }), agora);

    expect(publicado.sectionId).toBe("sec-collab");
    expect(publicado.author).toBe("eq-visus");
    expect(publicado.status).toBe("published");
  });
});

describe("discardDraft", () => {
  it("o publicado continua exatamente como estava", () => {
    const limpo = discardDraft(artigo({ draft: rascunho }));

    expect(limpo.title).toBe("Como publicar");
    expect(limpo.content).toBe("Conteúdo publicado");
    expect(hasDraft(limpo)).toBe(false);
  });
});
