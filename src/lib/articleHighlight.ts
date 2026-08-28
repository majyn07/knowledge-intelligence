/**
 * Busca dentro de um artigo já renderizado.
 *
 * Um artigo do portal chega a vinte mil caracteres. Sem isto, achar a frase que
 * interessa é rolar a página inteira — e quem opera um acervo de mil e
 * oitocentos faz isso o dia todo.
 *
 * A marcação é aplicada **só no texto**, nunca dentro de uma tag: trocar dentro
 * de um atributo quebraria o endereço de uma imagem ou de um link.
 */

/** Tira o acento preservando o tamanho, para o índice do texto continuar valendo. */
function dobrar(texto: string): string {
  return [...texto]
    .map((caractere) => {
      const base = caractere.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return base.length === 1 ? base : caractere;
    })
    .join("")
    .toLowerCase();
}

export interface ArticleHighlight {
  html: string;
  /** Quantas ocorrências foram marcadas. */
  count: number;
}

/**
 * Marca as ocorrências do termo, devolvendo quantas foram.
 *
 * Acento não atrapalha: quem digita "secao" encontra "seção", porque procurar
 * exigindo o acento certo é fazer a pessoa errar duas vezes antes de achar.
 */
export function withHighlight(html: string, term: string): ArticleHighlight {
  const alvo = dobrar(term.trim());

  if (alvo.length < 2) return { html, count: 0 };

  let count = 0;

  /*
    A divisão separa marcação de texto: os pedaços ímpares são tags e passam
    intocados. Sem isto, procurar "img" marcaria o nome da tag em vez do texto.
  */
  const pedacos = html.split(/(<[^>]*>)/g);

  const marcado = pedacos.map((pedaco, indice) => {
    if (indice % 2 === 1 || pedaco === "") return pedaco;

    const dobrado = dobrar(pedaco);
    let saida = "";
    let de = 0;

    for (;;) {
      const em = dobrado.indexOf(alvo, de);
      if (em === -1) break;

      saida += pedaco.slice(de, em);
      saida += `<mark class="article-hit" data-ocorrencia="${count}">${pedaco.slice(em, em + alvo.length)}</mark>`;

      count += 1;
      de = em + alvo.length;
    }

    return saida + pedaco.slice(de);
  });

  return { html: marcado.join(""), count };
}
