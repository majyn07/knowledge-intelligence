import { panelSourceLabel, panelWindowLabel, type PanelSpec } from "./panelSpec";
import type { PanelResult } from "./runPanel";

/**
 * O painel como imagem.
 *
 * Desenhado em SVG por uma função **pura**: o mesmo painel produz sempre o
 * mesmo arquivo, e o desenho pode ser conferido por teste em vez de ser
 * inspecionado a olho. A conversão para PNG acontece depois, no navegador, e
 * é a única parte que precisa de `canvas`.
 *
 * As cores vêm escritas no arquivo, e não das variáveis do tema: a imagem sai
 * daqui para uma apresentação ou um chat, onde não existe `:root` nenhum para
 * resolver `var(--primary)`.
 */

const LARGURA = 720;
const MARGEM = 32;
const LINHA = 34;

const COR = {
  fundo: "#ffffff",
  texto: "#0d1117",
  apagado: "#5b6472",
  barra: "#00A861",
  trilho: "#e6e9ee",
  borda: "#d5d9e0",
};

/**
 * Escapa texto para XML.
 *
 * O título é escrito por uma pessoa e vai direto para dentro de um documento
 *: um `&` sem escapar produz um arquivo inválido que nenhum visualizador
 * abre, e um `<` produziria marcação.
 */
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Corta o texto que não cabe, com reticência, em vez de deixá-lo vazar. */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function subtitle(spec: PanelSpec): string {
  return `${panelSourceLabel[spec.source]} · ${panelWindowLabel(spec.window)}`;
}

function text(
  value: string,
  x: number,
  y: number,
  options: { size?: number; color?: string; weight?: number; anchor?: string } = {}
): string {
  const { size = 14, color = COR.texto, weight = 400, anchor = "start" } = options;

  return `<text x="${x}" y="${y}" font-family="Poppins, Segoe UI, system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escape(value)}</text>`;
}

export function panelToSvg(spec: PanelSpec, result: PanelResult): string {
  const corpo: string[] = [];

  let y = MARGEM + 22;

  corpo.push(text(truncate(spec.title, 60), MARGEM, y, { size: 20, weight: 600 }));
  y += 22;
  corpo.push(text(subtitle(spec), MARGEM, y, { size: 12, color: COR.apagado }));
  y += 30;

  if (result.total === 0) {
    corpo.push(text("Nada neste recorte.", MARGEM, y + 16, { size: 14, color: COR.apagado }));
    y += 40;
  } else if (result.matrix) {
    const { columns, rows } = result.matrix;

    const rotulo = 200;
    const disponível = LARGURA - MARGEM * 2 - rotulo;
    const coluna = disponível / (columns.length + 1);

    corpo.push(
      ...columns.map((column, index) =>
        text(truncate(column.label, 12), MARGEM + rotulo + coluna * index + coluna - 8, y, {
          size: 11,
          color: COR.apagado,
          anchor: "end",
        })
      ),
      text("Total", LARGURA - MARGEM, y, { size: 11, color: COR.apagado, anchor: "end" })
    );

    y += 8;

    for (const row of rows) {
      corpo.push(
        `<line x1="${MARGEM}" y1="${y}" x2="${LARGURA - MARGEM}" y2="${y}" stroke="${COR.borda}" />`
      );

      y += 22;

      corpo.push(
        text(truncate(row.label, 26), MARGEM, y, { size: 13 }),
        ...row.values.map((value, index) =>
          text(String(value), MARGEM + rotulo + coluna * index + coluna - 8, y, {
            size: 13,
            anchor: "end",
          })
        ),
        text(String(row.total), LARGURA - MARGEM, y, { size: 13, weight: 600, anchor: "end" })
      );

      y += 8;
    }

    y += 16;
  } else if (spec.visual === "number") {
    corpo.push(text(String(result.total), MARGEM, y + 34, { size: 44, weight: 600 }));
    y += 60;
  } else {
    const pico = Math.max(1, ...result.rows.map((row) => row.value));
    const trilho = LARGURA - MARGEM * 2;

    for (const row of result.rows) {
      corpo.push(
        text(truncate(row.label, 46), MARGEM, y + 12, { size: 13 }),
        text(String(row.value), LARGURA - MARGEM, y + 12, {
          size: 13,
          weight: 600,
          anchor: "end",
        }),
        `<rect x="${MARGEM}" y="${y + 20}" width="${trilho}" height="8" rx="4" fill="${COR.trilho}" />`,
        `<rect x="${MARGEM}" y="${y + 20}" width="${(row.value / pico) * trilho}" height="8" rx="4" fill="${COR.barra}" />`
      );

      y += LINHA;
    }

    y += 8;
    corpo.push(text(`Total: ${result.total}`, MARGEM, y, { size: 12, color: COR.apagado }));
    y += 12;
  }

  if (result.caveat) {
    /*
      A ressalva vai na imagem. Ela é o que impede o número de ser lido como
      completo, e uma imagem circula muito mais longe da tela onde a ressalva
      estava escrita.
    */
    y += 14;

    for (const linha of wrap(result.caveat, 92)) {
      corpo.push(text(linha, MARGEM, y, { size: 11, color: COR.apagado }));
      y += 15;
    }
  }

  const altura = Math.round(y + MARGEM);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${altura}" viewBox="0 0 ${LARGURA} ${altura}">`,
    `<rect width="${LARGURA}" height="${altura}" fill="${COR.fundo}" />`,
    ...corpo,
    "</svg>",
  ].join("");
}

/** Quebra o texto em linhas de no máximo `max` caracteres, sem partir palavra. */
export function wrap(value: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of value.split(/\s+/).filter(Boolean)) {
    if (atual === "") {
      atual = palavra;
      continue;
    }

    if (`${atual} ${palavra}`.length <= max) {
      atual = `${atual} ${palavra}`;
      continue;
    }

    linhas.push(atual);
    atual = palavra;
  }

  if (atual !== "") linhas.push(atual);

  return linhas;
}
