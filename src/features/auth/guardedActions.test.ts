import { describe, expect, it } from "vitest";

import {
  defaultGuards,
  GUARDED_ACTIONS,
  normalizeGuards,
  podeFazer,
} from "./guardedActions";

describe("GUARDED_ACTIONS", () => {
  /*
    A lista é curta de propósito: guardar tudo trocaria um produto onde ninguém
    trava por um onde todo mundo espera aprovação. Cada entrada precisa dizer
    por que o histórico não bastava.
  */
  it("toda ação explica por que está na lista", () => {
    for (const acao of GUARDED_ACTIONS) {
      expect(acao.motivo.length).toBeGreaterThan(20);
    }
  });

  /*
    Onde a regra é conferida não é detalhe: a porta de verdade é o servidor, e
    "tela" impede o clique mas não quem conhece o caminho. Dizer isso é a
    diferença entre uma trava e a aparência de uma.
  */
  it("toda ação declara onde é conferida", () => {
    for (const acao of GUARDED_ACTIONS) {
      expect(["servidor", "tela"]).toContain(acao.conferida);
    }
  });

  it("as ações começam como o produto sempre funcionou", () => {
    const padrao = defaultGuards();

    expect(padrao.esvaziarLixeira).toBe("todos");
    expect(padrao.importarArquivo).toBe("todos");
  });

  /* A da HubSpot é pedido de quem conduz a área, e o custo é externo. */
  it("a busca na HubSpot nasce fechada e é fixa", () => {
    const hubspot = GUARDED_ACTIONS.find((acao) => acao.key === "hubspot");

    expect(hubspot?.padrao).toBe("administradores");
    expect(hubspot?.fixa).toBe(true);
    expect(hubspot?.conferida).toBe("servidor");
  });
});

describe("normalizeGuards", () => {
  it("lê o que está guardado", () => {
    expect(normalizeGuards({ esvaziarLixeira: "administradores" }).esvaziarLixeira).toBe(
      "administradores"
    );
  });

  /*
    O registro foi gravado por alguma versão do produto e pode não conhecer uma
    ação que entrou depois. Valor estranho volta ao padrão em vez de derrubar a
    tela.
  */
  it("valor desconhecido volta ao padrão", () => {
    const guards = normalizeGuards({ esvaziarLixeira: "talvez", importarArquivo: 7 });

    expect(guards.esvaziarLixeira).toBe("todos");
    expect(guards.importarArquivo).toBe("todos");
  });

  it("registro vazio ou estranho devolve a forma completa", () => {
    for (const bruto of [null, undefined, "texto", 42, {}]) {
      expect(Object.keys(normalizeGuards(bruto)).sort()).toEqual(
        GUARDED_ACTIONS.map((acao) => acao.key).sort()
      );
    }
  });

  /*
    Bastaria escrever `todos` no banco para abrir a porta da HubSpot, e ela é a
    única cujo custo recai sobre uma máquina que não é nossa.
  */
  it("a ação fixa ignora o que estiver gravado", () => {
    expect(normalizeGuards({ hubspot: "todos" }).hubspot).toBe("administradores");
  });
});

describe("podeFazer", () => {
  it("em todos, qualquer pessoa faz", () => {
    expect(podeFazer("esvaziarLixeira", defaultGuards(), false)).toBe(true);
  });

  it("em administradores, só quem administra", () => {
    const guards = normalizeGuards({ esvaziarLixeira: "administradores" });

    expect(podeFazer("esvaziarLixeira", guards, false)).toBe(false);
    expect(podeFazer("esvaziarLixeira", guards, true)).toBe(true);
  });
});
