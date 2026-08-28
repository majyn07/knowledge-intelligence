import { describe, expect, it } from "vitest";

import { isCommonWord, isMeaningfulTerm, semCorrespondencia } from "./vocabulary";

describe("semCorrespondencia", () => {
  /*
    Os dois casos reais que a exigiram: na triagem, o grupo era a assinatura de
    quem respondeu; na análise, o artigo relacionado era o que dividia
    "situação, neste, atendimento, identificamos" com o chamado.
  */
  it("tira a cortesia do e-mail do suporte", () => {
    const limpo = semCorrespondencia(
      "Prezado cliente, identificamos a situação neste atendimento. Atenciosamente, equipe de suporte."
    );

    for (const ruido of ["Prezado", "identificamos", "situação", "atendimento", "Atenciosamente"]) {
      expect(limpo).not.toContain(ruido);
    }
  });

  it("tira endereço e e-mail", () => {
    const limpo = semCorrespondencia(
      "Veja https://suporte.altoqi.com.br/hc/artigo ou escreva para suporte@altoqi.com.br sobre a laje"
    );

    expect(limpo).not.toContain("altoqi.com.br");
    expect(limpo).toContain("laje");
  });

  /* O rodapé de horário juntou importação de IFC com falha ao abrir o programa. */
  it("tira hora de relógio", () => {
    const limpo = semCorrespondencia("Atendemos das 9h as 12h e das 13h30 as 17h30");

    for (const hora of ["9h", "12h", "13h30", "17h30"]) expect(limpo).not.toContain(hora);
  });

  /*
    Devolve texto com acento porque quem consome casa palavra contra o corpo do
    artigo, que também tem acento: "fissuracao" não acharia "fissuração".
  */
  it("preserva o acento do termo técnico", () => {
    expect(semCorrespondencia("fissuração na viga contínua")).toBe("fissuração na viga contínua");
  });

  it("texto vazio continua vazio", () => {
    expect(semCorrespondencia("")).toBe("");
  });
});

describe("isCommonWord", () => {
  it("reconhece a palavra comum do produto", () => {
    expect(isCommonWord("projeto")).toBe(true);
    expect(isCommonWord("janela")).toBe(true);
  });

  /* `47968252511` é chamado e `2024` é ano, em qualquer texto daqui. */
  it("reconhece número solto", () => {
    expect(isCommonWord("47968252511")).toBe(true);
    expect(isCommonWord("2024")).toBe(true);
  });

  /*
    A barra de tamanho é de quem chama, e não da lista: na busca por
    relacionados, "laje" e "ifc" são justamente o que separa um artigo do outro.
  */
  it("deixa passar o termo curto que distingue assunto", () => {
    expect(isCommonWord("laje")).toBe(false);
    expect(isCommonWord("ifc")).toBe(false);
    expect(isCommonWord("spda")).toBe(false);
  });
});

describe("isMeaningfulTerm", () => {
  /* A comparação entre dois artigos longos quer a barra alta. */
  it("descarta o termo curto que não é código", () => {
    expect(isMeaningfulTerm("laje")).toBe(false);
  });

  it("mantém código com letra e dígito", () => {
    expect(isMeaningfulTerm("d15")).toBe(true);
    expect(isMeaningfulTerm("v10")).toBe(true);
  });

  it("descarta número solto mesmo sendo longo", () => {
    expect(isMeaningfulTerm("537686325")).toBe(false);
  });
});
