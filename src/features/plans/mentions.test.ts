import { describe, expect, it } from "vitest";

import type { Person, Team } from "@/models/Assignment";

import {
  insertMention,
  mentionName,
  mentionQuery,
  mentionSegments,
  parseMentions,
  plainMentionText,
} from "./mentions";

const teams: Team[] = [{ id: "eq-visus", name: "Suporte Visus", order: 0, categoryIds: [], sectionIds: [] }];

const people: Person[] = [
  {
    id: "pes-1",
    name: "Raoni Milioli",
    role: "Suporte",
    email: "r@altoqi.com.br",
    teamId: "eq-visus",
    avatarUrl: "",
    isActive: true, isAdmin: false,
  },
];

describe("parseMentions", () => {
  it("encontra quem foi mencionado", () => {
    const mentions = parseMentions("@[Raoni](pes-1) pode olhar com @[Suporte Visus](eq-visus)?");

    expect(mentions).toEqual([
      { ref: "pes-1", label: "Raoni" },
      { ref: "eq-visus", label: "Suporte Visus" },
    ]);
  });

  it("a mesma pessoa mencionada duas vezes conta uma", () => {
    expect(parseMentions("@[R](pes-1) e de novo @[R](pes-1)")).toHaveLength(1);
  });

  it("arroba solta não é menção", () => {
    expect(parseMentions("mandei e-mail para r@altoqi.com.br")).toEqual([]);
  });
});

describe("mentionSegments", () => {
  it("parte o texto entre trecho comum e menção", () => {
    expect(mentionSegments("oi @[Raoni](pes-1), veja")).toEqual([
      { kind: "text", value: "oi " },
      { kind: "mention", label: "Raoni", ref: "pes-1" },
      { kind: "text", value: ", veja" },
    ]);
  });

  it("texto sem menção vira um segmento só", () => {
    expect(mentionSegments("sem menção")).toEqual([{ kind: "text", value: "sem menção" }]);
  });

  it("menção no fim não deixa segmento vazio sobrando", () => {
    expect(mentionSegments("veja @[Raoni](pes-1)")).toHaveLength(2);
  });
});

describe("mentionName", () => {
  it("mostra o nome atual, e não o gravado", () => {
    /*
      O nome é editável pela própria pessoa. Guardar só o rótulo faria a menção
      envelhecer no dia em que alguém se renomeasse.
    */
    expect(mentionName({ ref: "pes-1", label: "Raoni" }, people, teams)).toBe("Raoni Milioli");
  });

  it("conta que sumiu deixa o rótulo guardado", () => {
    // A menção aconteceu; apagá-la reescreveria o que foi dito.
    expect(mentionName({ ref: "pes-9", label: "Alguém" }, people, teams)).toBe("Alguém");
  });
});

describe("plainMentionText", () => {
  it("tira a marcação e deixa o texto legível", () => {
    expect(plainMentionText("@[Raoni](pes-1) confere")).toBe("@Raoni confere");
  });
});

describe("mentionQuery", () => {
  it("devolve o que está sendo digitado depois do arroba", () => {
    expect(mentionQuery("veja @rao", 9)).toBe("rao");
  });

  it("arroba recém-aberta busca todo mundo", () => {
    expect(mentionQuery("veja @", 6)).toBe("");
  });

  it("espaço encerra a busca", () => {
    // "@ " é uma arroba solta no texto, não alguém sendo procurado.
    expect(mentionQuery("veja @ algo", 11)).toBeNull();
  });

  it("arroba no meio de palavra não abre menção", () => {
    // Senão digitar um e-mail abriria a lista no meio da frase.
    expect(mentionQuery("r@altoqi", 8)).toBeNull();
  });

  it("sem arroba não há menção em curso", () => {
    expect(mentionQuery("texto comum", 11)).toBeNull();
  });
});

describe("insertMention", () => {
  it("substitui o trecho digitado pela menção completa", () => {
    const resultado = insertMention("veja @rao", 9, "pes-1", "Raoni Milioli");

    expect(resultado.text).toBe("veja @[Raoni Milioli](pes-1) ");
    expect(resultado.cursor).toBe(resultado.text.length);
  });

  it("o cursor fica depois da menção, e não no fim do texto", () => {
    // Sem isso, escolher alguém obrigaria a voltar com o mouse para continuar
    // escrevendo onde se estava.
    const resultado = insertMention("veja @rao e responda", 9, "pes-1", "Raoni");

    expect(resultado.text).toBe("veja @[Raoni](pes-1)  e responda");
    expect(resultado.cursor).toBe("veja @[Raoni](pes-1) ".length);
  });
});
