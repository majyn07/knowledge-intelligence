/**
 * Leitor de arquivo delimitado.
 *
 * Escrito aqui e não trazido de biblioteca porque o problema é pequeno e os
 * casos que importam são específicos do que a HubSpot exporta: conteúdo de
 * artigo tem vírgula, aspas e quebra de linha **dentro** do campo, e um leitor
 * que parte a linha no `\n` corta o artigo ao meio sem avisar.
 *
 * Puro: recebe texto e devolve linhas. Quem lê o arquivo é a tela.
 */

export interface DelimitedTable {
  headers: string[];
  rows: string[][];
  /** O separador que foi detectado, para a tela poder dizer qual usou. */
  delimiter: string;
}

/**
 * Qual separador o arquivo usa.
 *
 * Exportação brasileira sai com ponto e vírgula, porque o Excel em pt-BR usa a
 * vírgula como decimal. Adivinhar errado transforma o arquivo inteiro numa
 * coluna só, e a tela mostraria uma tabela de uma coluna sem dizer por quê.
 *
 * A contagem é feita **fora das aspas**: um campo de conteúdo cheio de
 * vírgulas venceria a votação sozinho.
 */
export function detectDelimiter(text: string): string {
  const candidatos = [",", ";", "\t"];
  const primeiraLinha = readFirstRow(text);

  let melhor = ",";
  let maior = 0;

  for (const candidato of candidatos) {
    const total = primeiraLinha(candidato);
    if (total > maior) {
      maior = total;
      melhor = candidato;
    }
  }

  return melhor;
}

/** Conta ocorrências do separador na primeira linha lógica, ignorando aspas. */
function readFirstRow(text: string): (delimiter: string) => number {
  return (delimiter: string) => {
    let total = 0;
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          i += 1;
          continue;
        }
        quoted = !quoted;
        continue;
      }

      if (!quoted && (char === "\n" || char === "\r")) break;
      if (!quoted && char === delimiter) total += 1;
    }

    return total;
  };
}

/**
 * Lê o texto inteiro.
 *
 * Linha vazia é descartada: exportação costuma terminar com quebra, e uma
 * linha de campos vazios viraria um artigo sem título.
 */
export function parseDelimited(text: string, delimiter?: string): DelimitedTable {
  // O Excel grava BOM no começo, e sem tirar ele o primeiro cabeçalho vem com
  // um caractere invisível, que faz o mapeamento não reconhecer a coluna.
  const limpo = text.replace(/^﻿/, "");
  const sep = delimiter ?? detectDelimiter(limpo);

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let quoted = false;

  const fecharCampo = () => {
    linha.push(campo);
    campo = "";
  };

  const fecharLinha = () => {
    fecharCampo();
    if (linha.some((valor) => valor.trim() !== "")) linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < limpo.length; i += 1) {
    const char = limpo[i];

    if (quoted) {
      if (char === '"') {
        // Aspas dobradas dentro de campo entre aspas são uma aspa literal.
        if (limpo[i + 1] === '"') {
          campo += '"';
          i += 1;
          continue;
        }
        quoted = false;
        continue;
      }

      campo += char;
      continue;
    }

    if (char === '"' && campo === "") {
      quoted = true;
      continue;
    }

    if (char === sep) {
      fecharCampo();
      continue;
    }

    if (char === "\r") {
      // CRLF conta como uma quebra só.
      if (limpo[i + 1] === "\n") i += 1;
      fecharLinha();
      continue;
    }

    if (char === "\n") {
      fecharLinha();
      continue;
    }

    campo += char;
  }

  if (campo !== "" || linha.length > 0) fecharLinha();

  if (linhas.length === 0) return { headers: [], rows: [], delimiter: sep };

  const [headers, ...rows] = linhas;

  return {
    headers: headers.map((header) => header.trim()),
    rows,
    delimiter: sep,
  };
}

/**
 * Um valor de exemplo da coluna, para quem não conhece o formato do arquivo.
 *
 * O nome do cabeçalho nem sempre diz o que a coluna guarda. Exportação sai
 * com `hs_body`, `col_12` e coisas piores., e sem ver o conteúdo o mapeamento
 * vira adivinhação de outro tipo. Pega o primeiro valor **não vazio**: a
 * primeira linha costuma ter campo em branco, e mostrar vazio não informa nada.
 */
export function columnSample(table: DelimitedTable, index: number, limit = 60): string {
  for (const row of table.rows) {
    const valor = (row[index] ?? "").trim();
    if (valor === "") continue;

    // Quebra de linha dentro do campo desmontaria a linha da tela.
    const linha = valor.replace(/\s+/g, " ");

    return linha.length > limit ? `${linha.slice(0, limit)}…` : linha;
  }

  return "";
}
