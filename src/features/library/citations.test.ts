import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { SupportConversation, SupportMessageRole } from "@/models/SupportConversation";

import { citacoesDoSuporte } from "./citations";

const quando = new Date("2026-10-19T12:00:00.000Z");

const artigo = (id: string, portalArticleId?: string): KnowledgeArticle => ({
  id,
  title: id,
  summary: "",
  content: "",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "",
  ...(portalArticleId ? { portalArticleId } : {}),
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "html",
  createdAt: quando,
  updatedAt: quando,
});

const link = (id: string) => `https://suporte.altoqi.com.br/hc/pt-br/articles/${id}-algum-titulo`;

const conversa = (
  ticketId: string,
  mensagens: [SupportMessageRole, string][]
): SupportConversation => ({
  id: `c-${ticketId}`,
  ticketId,
  messages: mensagens.map(([role, body], i) => ({
    id: `${ticketId}-${i}`,
    author: role,
    role,
    body,
    createdAt: quando.toISOString(),
  })),
});

const RODAPE = `Precisa de ajuda? Conheça o suporte: ${link("900")}`;

/* Volume para o rodapé passar do piso de três conversas. */
const comRodape = (ticketId: string, corpo: string) =>
  conversa(ticketId, [["suporte", `${corpo}\n\n${RODAPE}`]]);

const acervo = [artigo("laje", "100"), artigo("ifc", "200"), artigo("suporte", "900")];

describe("citacoesDoSuporte", () => {
  it("conta o atendimento em que o suporte respondeu com o artigo", () => {
    const { porArtigo } = citacoesDoSuporte(
      [
        conversa("t1", [["suporte", `Veja o passo a passo: ${link("100")}`]]),
        conversa("t2", [["suporte", `Siga ${link("100")} e depois ${link("200")}`]]),
      ],
      acervo
    );

    expect(porArtigo.get("laje")).toEqual(["t1", "t2"]);
    expect(porArtigo.get("ifc")).toEqual(["t2"]);
  });

  it("o link da assinatura que se repete pelo acervo não é citação", () => {
    const conversas = [
      comRodape("t1", `Segue: ${link("100")}`),
      comRodape("t2", "Resolvido por telefone."),
      comRodape("t3", "Pode reinstalar."),
      comRodape("t4", "Encaminhei ao time."),
    ];

    const { porArtigo } = citacoesDoSuporte(conversas, acervo);

    expect(porArtigo.has("suporte")).toBe(false);
    expect(porArtigo.get("laje")).toEqual(["t1"]);
  });

  it("o mesmo artigo citado duas vezes na conversa conta um atendimento", () => {
    const { porArtigo } = citacoesDoSuporte(
      [conversa("t1", [["suporte", link("100")], ["suporte", `de novo: ${link("100")}`]])],
      acervo
    );

    expect(porArtigo.get("laje")).toEqual(["t1"]);
  });

  it("link mandado pelo cliente não é o suporte respondendo", () => {
    const { porArtigo } = citacoesDoSuporte(
      [conversa("t1", [["cliente", `li isto e não resolveu: ${link("100")}`]])],
      acervo
    );

    expect(porArtigo.size).toBe(0);
  });

  it("artigo que não está no acervo é contado à parte, e não inventa vínculo", () => {
    const { porArtigo, foraDoAcervo } = citacoesDoSuporte(
      [conversa("t1", [["suporte", link("777")]])],
      acervo
    );

    expect(porArtigo.size).toBe(0);
    expect(foraDoAcervo).toBe(1);
  });
});
