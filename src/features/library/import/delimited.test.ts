import { describe, expect, it } from "vitest";

import { columnSample, detectDelimiter, parseDelimited } from "./delimited";

describe("detectDelimiter", () => {
  it("reconhece o ponto e vírgula da exportação brasileira", () => {
    /*
      O Excel em pt-BR usa vírgula como decimal e exporta com ponto e vírgula.
      Adivinhar errado transforma o arquivo inteiro numa coluna só.
    */
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("vírgula dentro de aspas não vence a votação", () => {
    // Um campo de conteúdo cheio de vírgulas venceria sozinho.
    expect(detectDelimiter('titulo;"a, b, c, d, e";secao')).toBe(";");
  });
});

describe("parseDelimited", () => {
  it("lê cabeçalho e linhas", () => {
    const tabela = parseDelimited("titulo,resumo\nA,primeiro\nB,segundo");

    expect(tabela.headers).toEqual(["titulo", "resumo"]);
    expect(tabela.rows).toEqual([
      ["A", "primeiro"],
      ["B", "segundo"],
    ]);
  });

  it("campo entre aspas guarda vírgula, aspas e quebra de linha", () => {
    /*
      Conteúdo de artigo tem os três. Um leitor que parte no `\n` corta o
      artigo ao meio sem avisar, e ninguém descobre até abrir o registro.
    */
    const tabela = parseDelimited(
      'titulo,conteudo\n"Passo a passo","Primeiro, clique em ""Salvar"".\nDepois feche."'
    );

    expect(tabela.rows[0][1]).toBe('Primeiro, clique em "Salvar".\nDepois feche.');
  });

  it("CRLF conta como uma quebra só", () => {
    // Exportação do Windows usa CRLF, e contar duas criaria linhas vazias.
    const tabela = parseDelimited("a,b\r\n1,2\r\n3,4");

    expect(tabela.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("o BOM do Excel não gruda no primeiro cabeçalho", () => {
    /*
      Com o caractere invisível colado, "titulo" deixa de ser reconhecido pelo
      mapeamento e a coluna aparece como não identificada.
    */
    const tabela = parseDelimited("﻿titulo,resumo\nA,B");

    expect(tabela.headers[0]).toBe("titulo");
  });

  it("linha vazia no fim não vira registro", () => {
    // Exportação costuma terminar com quebra, e isso viraria artigo sem título.
    const tabela = parseDelimited("a,b\n1,2\n\n");

    expect(tabela.rows).toHaveLength(1);
  });

  it("arquivo vazio devolve tabela vazia em vez de quebrar", () => {
    expect(parseDelimited("")).toEqual({ headers: [], rows: [], delimiter: "," });
  });

  it("campo vazio entre separadores é preservado", () => {
    // Perder a posição desalinharia todas as colunas seguintes.
    expect(parseDelimited("a,b,c\n1,,3").rows[0]).toEqual(["1", "", "3"]);
  });

  it("separador declarado vence a detecção", () => {
    // A tela deixa trocar quando a detecção erra, e a escolha tem de valer.
    expect(parseDelimited("a;b\n1;2", ";").headers).toEqual(["a", "b"]);
  });
});

describe("columnSample", () => {
  it("mostra o primeiro valor não vazio da coluna", () => {
    /*
      O nome do cabeçalho nem sempre diz o que a coluna guarda — exportação sai
      com `hs_body` e `col_12` —, e sem ver o conteúdo o mapeamento vira
      adivinhação de outro tipo. A primeira linha costuma ter campo em branco.
    */
    const tabela = parseDelimited("a,b\n,primeiro\nsegundo,x");

    expect(columnSample(tabela, 0)).toBe("segundo");
  });

  it("quebra de linha dentro do campo não desmonta a linha da tela", () => {
    const tabela = parseDelimited('titulo,corpo\nA,"linha um\nlinha dois"');

    expect(columnSample(tabela, 1)).toBe("linha um linha dois");
  });

  it("corta o que é longo demais, com reticência", () => {
    const tabela = parseDelimited("a\n" + "x".repeat(200));

    expect(columnSample(tabela, 0, 10)).toBe("xxxxxxxxxx…");
  });

  it("coluna toda vazia devolve vazio, e não quebra", () => {
    expect(columnSample(parseDelimited("a,b\nx,"), 1)).toBe("");
  });
});
