import { describe, expect, it } from "vitest";

import { parseSectionSuggestions, type SectionSuggestionRequest } from "./sectionSuggestion";

const request: SectionSuggestionRequest = {
  articles: [
    { id: "a1", title: "Como lançar viga", summary: "", excerpt: "" },
    { id: "a2", title: "Erro ao exportar", summary: "", excerpt: "" },
  ],
  sections: [
    { id: "sec-eletrica", path: "AltoQi Builder › Elétrica" },
    { id: "sec-estrutural", path: "AltoQi Eberick › Estrutural" },
  ],
};

const ok = [
  { articleId: "a1", sectionId: "sec-estrutural", confidence: "alta", reason: "Fala de viga." },
];

describe("parseSectionSuggestions", () => {
  it("lê o que veio válido", () => {
    const resultado = parseSectionSuggestions({ suggestions: ok }, request);

    expect(resultado).toEqual([
      { articleId: "a1", sectionId: "sec-estrutural", confidence: "alta", reason: "Fala de viga." },
    ]);
  });

  it("aceita a lista solta, sem o envelope", () => {
    expect(parseSectionSuggestions(ok, request)).toHaveLength(1);
  });

  it("lê JSON em texto, com ou sem a cerca de crase", () => {
    /*
      O modelo devolve o JSON cercado apesar de pedirmos que não. Recusar por
      causa da cerca desperdiçaria uma resposta correta.
    */
    const cercado = "```json\n" + JSON.stringify({ suggestions: ok }) + "\n```";

    expect(parseSectionSuggestions(cercado, request)).toHaveLength(1);
    expect(parseSectionSuggestions(JSON.stringify(ok), request)).toHaveLength(1);
  });

  it("descarta seção que o modelo inventou", () => {
    /*
      Modelo devolve identificador plausível que nunca existiu. Aceitar
      apontaria o artigo para o vazio com cara de classificação.
    */
    const inventada = [{ articleId: "a1", sectionId: "sec-hidraulica", confidence: "alta", reason: "" }];

    expect(parseSectionSuggestions(inventada, request)).toEqual([]);
  });

  it("descarta artigo que não foi perguntado", () => {
    // Resposta desalinhada classificaria o registro errado.
    const outro = [{ articleId: "a99", sectionId: "sec-eletrica", confidence: "alta", reason: "" }];

    expect(parseSectionSuggestions(outro, request)).toEqual([]);
  });

  it("uma sugestão por artigo, e fica com a primeira", () => {
    // Duas seriam duas respostas para a mesma pergunta, e a tela teria de
    // escolher sozinha — que é exatamente o que a revisão humana existe para
    // não precisar fazer.
    const duas = [
      { articleId: "a1", sectionId: "sec-eletrica", confidence: "alta", reason: "" },
      { articleId: "a1", sectionId: "sec-estrutural", confidence: "alta", reason: "" },
    ];

    const resultado = parseSectionSuggestions(duas, request);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].sectionId).toBe("sec-eletrica");
  });

  it("confiança desconhecida vira baixa, e não some", () => {
    /*
      Descartar por causa do rótulo perderia uma sugestão possivelmente certa;
      tratá-la como alta afirmaria o que não foi dito. Baixa é o que sobra.
    */
    const estranha = [{ articleId: "a1", sectionId: "sec-eletrica", confidence: "certeza", reason: "" }];

    expect(parseSectionSuggestions(estranha, request)[0].confidence).toBe("baixa");
  });

  it("resposta que não é lista devolve nada, em vez de quebrar", () => {
    expect(parseSectionSuggestions(null, request)).toEqual([]);
    expect(parseSectionSuggestions("não sou json", request)).toEqual([]);
    expect(parseSectionSuggestions({ erro: "deu ruim" }, request)).toEqual([]);
  });
});
