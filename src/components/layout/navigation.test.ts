import { describe, expect, it } from "vitest";

import { buildTrail } from "./navigation";

describe("buildTrail", () => {
  it("a raiz não tem trilha a mostrar", () => {
    expect(buildTrail("/")).toEqual([{ label: "Início" }]);
  });

  it("uma listagem vem do Início", () => {
    expect(buildTrail("/library")).toEqual([
      { label: "Início", href: "/" },
      { label: "Biblioteca" },
    ]);
  });

  it("o último degrau não é link para onde a pessoa já está", () => {
    const trilha = buildTrail("/indicators");

    expect(trilha[trilha.length - 1].href).toBeUndefined();
  });

  it("o registro aberto entra pelo nome que a tela conhece", () => {
    expect(buildTrail("/library/abc-123", "Como configurar o lançamento")).toEqual([
      { label: "Início", href: "/" },
      { label: "Biblioteca", href: "/library" },
      { label: "Como configurar o lançamento" },
    ]);
  });

  it("sem nome, o identificador não vira degrau — e a seção continua link", () => {
    /*
      Mostrar um `uuid` na trilha seria pior que trilha curta: ele não diz
      nada e ocupa o lugar de quem diria.

      A Biblioteca segue clicável de propósito: quem está no artigo não está
      na listagem, e é justamente ali que ela quer voltar.
    */
    expect(buildTrail("/library/abc-123")).toEqual([
      { label: "Início", href: "/" },
      { label: "Biblioteca", href: "/library" },
    ]);
  });

  it("rota fora do cadastro não inventa degrau", () => {
    // Sobra só o Início, e a trilha de um degrau não chega a ser exibida.
    expect(buildTrail("/rota-que-nao-existe")).toEqual([{ label: "Início", href: "/" }]);
  });

  it("os rótulos são os do menu, e não uma segunda lista", () => {
    // Duas listas do mesmo vocabulário divergem, e a divergência apareceria
    // como o menu dizendo "Métricas" e a trilha dizendo outra coisa.
    expect(buildTrail("/indicators")).toEqual([
      { label: "Início", href: "/" },
      { label: "Métricas" },
    ]);
  });
});
