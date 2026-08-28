import { describe, expect, it } from "vitest";

import { isEmptyDraft, parseRecovered, recoveryKey, shouldOffer } from "./recovery";

const guardado = {
  id: "a1",
  title: "Título em andamento",
  summary: "",
  content: "Texto longo",
  at: "2026-08-21T18:00:00.000Z",
};

const atual = { title: "Título antigo", summary: "", content: "" };

describe("recoveryKey", () => {
  it("uma chave por registro", () => {
    // Duas edições abertas não podem se sobrescrever.
    expect(recoveryKey("visus-rec", "a1")).not.toBe(recoveryKey("visus-rec", "a2"));
  });

  it("artigo novo tem chave própria e estável", () => {
    expect(recoveryKey("visus-rec", "")).toBe("visus-rec:novo");
  });
});

describe("shouldOffer", () => {
  it("oferece quando o guardado difere do registro", () => {
    expect(shouldOffer(guardado, atual)).toBe(true);
  });

  it("não oferece quando é igual ao que já está gravado", () => {
    /*
      Igual significa que a gravação aconteceu e o resto é sobra. Pedir uma
      decisão sobre nada ensina a ignorar o aviso, que é como um aviso deixa
      de funcionar quando importa.
    */
    expect(
      shouldOffer(guardado, {
        title: guardado.title,
        summary: guardado.summary,
        content: guardado.content,
      })
    ).toBe(false);
  });

  it("não oferece o que está vazio", () => {
    // Abrir, digitar e apagar não é trabalho a recuperar.
    expect(shouldOffer({ ...guardado, title: "", content: "" }, atual)).toBe(false);
    expect(shouldOffer({ ...guardado, title: "   ", content: "  " }, atual)).toBe(false);
  });

  it("sem nada guardado não há o que oferecer", () => {
    expect(shouldOffer(null, atual)).toBe(false);
  });
});

describe("isEmptyDraft", () => {
  it("só espaço conta como vazio", () => {
    expect(isEmptyDraft({ title: " ", summary: "\n", content: "  " })).toBe(true);
    expect(isEmptyDraft({ title: "a", summary: "", content: "" })).toBe(false);
  });
});

describe("parseRecovered", () => {
  it("lê o que tem forma", () => {
    expect(parseRecovered(guardado)?.title).toBe("Título em andamento");
  });

  it("registro sem instante é recusado", () => {
    /*
      Sem o instante a tela não tem o que dizer sobre quando aquilo foi
      digitado, e "restaurar algo de sabe-se lá quando" não é uma decisão que
      dê para tomar.
    */
    expect(parseRecovered({ ...guardado, at: "" })).toBeNull();
  });

  it("o que não tem forma vira ausência, e não tela quebrada", () => {
    // Pode ter sido gravado por uma versão anterior do produto.
    expect(parseRecovered(null)).toBeNull();
    expect(parseRecovered("texto solto")).toBeNull();
    expect(parseRecovered({ at: "2026-08-21T18:00:00.000Z", title: 42 })?.title).toBe("");
  });
});
