/**
 * O Markdown escrito aqui, como HTML limpo para colar no editor da HubSpot.
 *
 * Não há API para publicar no portal, e a última perna é colar. O editor de lá
 * recebe HTML; Markdown colado vira texto com asterisco e cerquilha à mostra.
 *
 * Segue **as mesmas regras** de `MarkdownContent`, que é o que a tela mostra:
 * o que vai para o cliente precisa ser o que a pessoa conferiu aqui. E sai sem
 * classe nenhuma — as do Tailwind que a tela usa não significam nada no portal,
 * e entrariam no artigo do cliente como enfeite sem efeito.
 */
export function markdownParaHtml(markdown: string): string {
  const linhas = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocos: string[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.startsWith("```")) {
      const codigo: string[] = [];
      i += 1;
      while (i < linhas.length && !linhas[i].startsWith("```")) codigo.push(linhas[i++]);
      i += 1;
      blocos.push(`<pre><code>${escapar(codigo.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{1,3}\s/.test(linha)) {
      /* `#` vira h2, como na tela: o h1 do portal é o título do artigo. */
      const nivel = (linha.match(/^#+/)?.[0].length ?? 1) + 1;
      blocos.push(`<h${nivel}>${emLinha(linha.replace(/^#{1,3}\s/, ""))}</h${nivel}>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[-*]\s+/.test(linhas[i])) {
        itens.push(`<li>${emLinha(linhas[i++].replace(/^[-*]\s+/, ""))}</li>`);
      }
      blocos.push(`<ul>${itens.join("")}</ul>`);
      continue;
    }

    if (/^\|/.test(linha) && linhas[i + 1]?.includes("---")) {
      const celulas = (valor: string) =>
        valor
          .split("|")
          .slice(1, -1)
          .map((celula) => celula.trim());

      const cabecalho = celulas(linha)
        .map((celula) => `<th>${emLinha(celula)}</th>`)
        .join("");
      i += 2;

      const linhasDaTabela: string[] = [];
      while (i < linhas.length && /^\|/.test(linhas[i])) {
        linhasDaTabela.push(
          `<tr>${celulas(linhas[i++])
            .map((celula) => `<td>${emLinha(celula)}</td>`)
            .join("")}</tr>`
        );
      }

      blocos.push(
        `<table><thead><tr>${cabecalho}</tr></thead><tbody>${linhasDaTabela.join("")}</tbody></table>`
      );
      continue;
    }

    if (linha.trim()) blocos.push(`<p>${emLinha(linha)}</p>`);
    i += 1;
  }

  return blocos.join("\n");
}

/** Só negrito, que é o que a tela reconhece. Escapa antes, marca depois. */
function emLinha(texto: string): string {
  return escapar(texto).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
