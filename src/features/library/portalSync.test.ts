import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import {
  editadosAqui,
  estadoNoPortal,
  impressaoDoPortal,
  lerEnderecoDoPortal,
  resumoDoPortal,
} from "./portalSync";

const quando = new Date("2026-10-19T12:00:00.000Z");

const artigo = (over: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: "a1",
  title: "Laje nervurada",
  summary: "Como configurar.",
  content: "<p>Texto do portal.</p>",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-x",
  portalArticleId: "1001",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "html",
  createdAt: quando,
  updatedAt: quando,
  ...over,
});

const comBase = (over: Partial<KnowledgeArticle> = {}) => {
  const base = artigo();
  return artigo({ portalBaseline: impressaoDoPortal(base), ...over });
};

const evento = (type: ActivityEvent["type"], id: string): ActivityEvent => ({
  id: `e-${id}-${type}`,
  at: quando.toISOString(),
  type,
  projectId: "",
  actor: "Ana",
  subject: { kind: "article", id, label: "x" },
  detail: "",
});

describe("estadoNoPortal", () => {
  it("igual ao portal enquanto o texto é o que veio de lá", () => {
    expect(estadoNoPortal(comBase(), new Set())).toBe("em-dia");
  });

  it("aguardando quando título, resumo ou conteúdo mudaram aqui", () => {
    expect(estadoNoPortal(comBase({ content: "<p>Reescrito.</p>" }), new Set())).toBe("aguardando");
    expect(estadoNoPortal(comBase({ title: "Outro título" }), new Set())).toBe("aguardando");
    expect(estadoNoPortal(comBase({ summary: "Outro resumo." }), new Set())).toBe("aguardando");
  });

  it("classificar ou atribuir não faz parecer que falta levar ao portal", () => {
    expect(
      estadoNoPortal(comBase({ sectionId: "sec-y", author: "p1", updatedAt: new Date() }), new Set())
    ).toBe("em-dia");
  });

  it("publicado aqui e sem identidade no portal não existe lá", () => {
    expect(estadoNoPortal(artigo({ portalArticleId: undefined }), new Set())).toBe(
      "fora-do-portal"
    );
  });

  it("não se aplica ao que não está publicado nem ao que está na lixeira", () => {
    expect(estadoNoPortal(comBase({ status: "draft" }), new Set())).toBeNull();
    expect(estadoNoPortal(comBase({ status: "review" }), new Set())).toBeNull();
    expect(estadoNoPortal(comBase({ deletedAt: quando.toISOString() }), new Set())).toBeNull();
  });

  describe("importado antes da impressão", () => {
    it("sem edição registrada, nada mudou aqui", () => {
      expect(estadoNoPortal(artigo(), new Set())).toBe("em-dia");
    });

    it("com edição registrada, fica a conferir e não é afirmado como pendente", () => {
      expect(estadoNoPortal(artigo(), new Set(["a1"]))).toBe("a-conferir");
    });
  });
});

describe("editadosAqui", () => {
  it("conta só edição de artigo, e não mudança de estágio ou criação", () => {
    const ids = editadosAqui([
      evento("article_updated", "a1"),
      evento("article_status_changed", "a2"),
      evento("article_created", "a3"),
      { ...evento("article_updated", "p1"), subject: { kind: "plan", id: "p1", label: "" } },
    ]);

    expect([...ids]).toEqual(["a1"]);
  });
});

describe("lerEnderecoDoPortal", () => {
  const portalIdOf = (url: string) => url.match(/\/articles\/(\d+)/)?.[1] ?? "";
  const acervo = [
    comBase({ id: "ja", url: "https://suporte.altoqi.com.br/hc/pt-br/articles/1001" }),
    artigo({ id: "novo", portalArticleId: undefined }),
  ];

  it("lê o identificador do endereço do portal", () => {
    expect(
      lerEnderecoDoPortal(
        " https://suporte.altoqi.com.br/hc/pt-br/articles/2002 ",
        "novo",
        acervo,
        portalIdOf
      )
    ).toEqual({
      ok: true,
      portalArticleId: "2002",
      url: "https://suporte.altoqi.com.br/hc/pt-br/articles/2002",
    });
  });

  it("recusa o que não é endereço, outro site e página sem artigo", () => {
    expect(lerEnderecoDoPortal("artigo 2002", "novo", acervo, portalIdOf).ok).toBe(false);
    expect(
      lerEnderecoDoPortal("https://outro.com/articles/2002", "novo", acervo, portalIdOf).ok
    ).toBe(false);
    expect(
      lerEnderecoDoPortal("https://suporte.altoqi.com.br/hc/pt-br", "novo", acervo, portalIdOf).ok
    ).toBe(false);
  });

  it("recusa a página que já é de outro artigo, dizendo qual", () => {
    const leitura = lerEnderecoDoPortal(
      "https://suporte.altoqi.com.br/hc/pt-br/articles/1001",
      "novo",
      acervo,
      portalIdOf
    );

    expect(leitura).toEqual({ ok: false, motivo: 'Esta página já está ligada a "Laje nervurada".' });
  });
});

describe("resumoDoPortal", () => {
  it("separa as três situações que pedem alguém", () => {
    const resumo = resumoDoPortal(
      [
        comBase({ id: "ok" }),
        comBase({ id: "pend", content: "<p>novo</p>" }),
        artigo({ id: "novo", portalArticleId: undefined }),
        artigo({ id: "velho" }),
      ],
      new Set(["velho"])
    );

    expect(resumo.aguardando.map((a) => a.id)).toEqual(["pend"]);
    expect(resumo.foraDoPortal.map((a) => a.id)).toEqual(["novo"]);
    expect(resumo.aConferir.map((a) => a.id)).toEqual(["velho"]);
  });
});
