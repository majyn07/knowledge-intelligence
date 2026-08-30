import { describe, expect, it } from "vitest";

import {
  actorIdsOf,
  authorLabel,
  nextCursor,
  parseActors,
  stripHtml,
  toConversationMessages,
  type HubSpotActor,
} from "./conversationMapping";

const atores = new Map<string, HubSpotActor>([
  ["A-1", { id: "A-1", name: "Ana Suporte", type: "AGENT" }],
  ["V-2", { id: "V-2", name: "Fulano Cliente", type: "VISITOR" }],
  ["B-3", { id: "B-3", name: "Bot", type: "BOT" }],
  ["S-4", { id: "S-4", name: "", type: "SYSTEM" }],
]);

const msg = (extra: Record<string, unknown> = {}) => ({
  id: "m1",
  type: "MESSAGE",
  text: "Olá",
  createdAt: "2026-08-01T10:00:00.000Z",
  createdBy: "A-1",
  ...extra,
});

describe("stripHtml", () => {
  /*
    Entidade numérica também: `&#xa0;` chegou em 115 mensagens e virou a palavra
    "xa0", que o Levantamento exibiu como um dos termos que descrevem um grupo
    de treze atendimentos. A mesma coisa tem duas escritas, e a lista de
    entidades nomeadas só cobre uma.
  */
  it("decodifica entidade numérica, hexadecimal e decimal", () => {
    expect(stripHtml("motivo do contato:&#xa0;: Setup")).toBe("motivo do contato: : Setup");
    expect(stripHtml("caf&#233; da manh&#227;")).toBe("café da manhã");
  });

  it("espaço inquebrável vira espaço, e não vira palavra", () => {
    expect(stripHtml("Erro&#xa0;ao&#xa0;abrir")).toBe("Erro ao abrir");
  });

  it("remove tag do corpo, que vem mesmo no campo de texto puro", () => {
    expect(stripHtml("<p>O Aviso 101 indica algo</p>")).toBe("O Aviso 101 indica algo");
  });

  it("transforma quebra e fim de parágrafo em linha", () => {
    expect(stripHtml("<p>um</p><p>dois</p>")).toBe("um\ndois");
    expect(stripHtml("um<br>dois")).toBe("um\ndois");
  });

  it("decodifica as entidades comuns", () => {
    expect(stripHtml("a &amp; b &nbsp;c &lt;d&gt;")).toBe("a & b c <d>");
  });

  it("devolve vazio para ausência", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });
});

describe("authorLabel", () => {
  /*
    O nome do cliente não entra: trazer dado pessoal para o hub é decisão de
    produto, e o levantamento lê o problema, não quem relatou.
  */
  it("rotula o visitante genericamente, sem usar o nome", () => {
    expect(authorLabel(atores.get("V-2"))).toBe("Cliente");
  });

  it("usa o nome de quem atendeu", () => {
    expect(authorLabel(atores.get("A-1"))).toBe("Ana Suporte");
  });

  it("nomeia atendente sem nome em vez de gravar vazio", () => {
    expect(authorLabel({ id: "A-9", name: "", type: "AGENT" })).toBe("Suporte");
  });

  it("separa automação de sistema", () => {
    expect(authorLabel(atores.get("B-3"))).toBe("Automação");
    expect(authorLabel(atores.get("S-4"))).toBe("Sistema");
  });

  it("não inventa autor para ator que não resolveu", () => {
    expect(authorLabel(undefined)).toBe("Desconhecido");
  });
});

describe("toConversationMessages", () => {
  /*
    O endpoint mistura fala com evento de sistema. Gravar tudo faria a análise
    tratar mudança de status como evidência.
  */
  it("descarta o que não é fala de alguém", () => {
    const resultado = toConversationMessages(
      [
        msg({ id: "m1" }),
        msg({ id: "m2", type: "THREAD_STATUS_CHANGE", text: "" }),
        msg({ id: "m3", type: "ASSIGNMENT", text: "" }),
        msg({ id: "m4", type: "WELCOME_MESSAGE", text: "Bem-vindo" }),
      ],
      atores
    );

    expect(resultado.map((m) => m.id)).toEqual(["m1"]);
  });

  /*
    A API devolve do mais novo para o mais antigo. Sem inverter, a análise lê a
    resposta antes da pergunta.
  */
  it("inverte para ordem cronológica", () => {
    const resultado = toConversationMessages(
      [
        msg({ id: "resposta", createdAt: "2026-08-01T11:00:00.000Z" }),
        msg({ id: "pergunta", createdAt: "2026-08-01T10:00:00.000Z" }),
      ],
      atores
    );

    expect(resultado.map((m) => m.id)).toEqual(["pergunta", "resposta"]);
  });

  it("limpa o corpo e rotula o autor", () => {
    const [primeira] = toConversationMessages(
      [msg({ text: "<p>Resolvido</p>", createdBy: "V-2" })],
      atores
    );

    expect(primeira.body).toBe("Resolvido");
    expect(primeira.author).toBe("Cliente");
  });

  it("descarta mensagem que sobrou vazia depois da limpeza", () => {
    expect(toConversationMessages([msg({ text: "<p></p>" })], atores)).toEqual([]);
  });
});

describe("actorIdsOf", () => {
  it("junta os atores sem repetir, para um pedido só por conversa", () => {
    const ids = actorIdsOf([
      msg({ createdBy: "A-1" }),
      msg({ createdBy: "V-2" }),
      msg({ createdBy: "A-1" }),
      msg({ createdBy: "" }),
    ]);

    expect(ids).toEqual(["A-1", "V-2"]);
  });
});

describe("parseActors", () => {
  it("indexa por identificador e ignora ator sem id", () => {
    const mapa = parseActors({
      results: [
        { id: "A-1", name: "Ana", type: "AGENT" },
        { name: "sem id", type: "AGENT" },
      ],
    });

    expect(mapa.size).toBe(1);
    expect(mapa.get("A-1")?.name).toBe("Ana");
  });
});

describe("nextCursor", () => {
  /*
    A armadilha medida: página vazia com cursor presente. O fim é a ausência do
    cursor, nunca a lista vazia, parar no vazio grava conversa vazia.
  */
  it("segue quando há cursor, mesmo com a página vazia", () => {
    expect(nextCursor({ results: [], paging: { next: { after: "abc" } } })).toBe("abc");
  });

  it("para quando não há cursor, mesmo com a página cheia", () => {
    expect(nextCursor({ results: [msg()] })).toBeNull();
  });

  it("trata resposta sem paginação", () => {
    expect(nextCursor({})).toBeNull();
    expect(nextCursor(null)).toBeNull();
  });
});
