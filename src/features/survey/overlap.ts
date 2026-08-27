import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "@/features/library/content/articleText";
import { articleVocabulary, jaccard } from "@/features/library/content/articleTerms";

/**
 * Artigos que se sobrepõem dentro da mesma seção.
 *
 * É o problema clássico de uma base que cresceu por anos: dois artigos
 * ensinando a mesma coisa, cada um respondendo metade — e quem procura ajuda
 * encontra um dos dois, nunca sabe do outro. Só dá para enxergar isso com o
 * acervo inteiro na mão, que é o que a importação do portal passou a permitir.
 *
 * **O que é calculado aqui é vocabulário em comum, não duplicata.** Dizer que
 * dois artigos cobrem o mesmo assunto exige ler e comparar sentido, e isso é
 * trabalho de quem revisa — com a IA propondo, marcada como proposta. Aqui sai
 * o número e a evidência; a conclusão é de gente.
 */

/**
 * A partir de quanto de vocabulário em comum vale olhar.
 *
 * **Calibrado contra o acervo real**, com os 1.822 artigos do portal
 * importados: 19.580 pares comparados em 129 seções, e a semelhança se
 * distribui assim —
 *
 * | limiar | pares |
 * | --- | --- |
 * | 0,34 | 330 |
 * | 0,40 | 223 |
 * | 0,50 | 129 |
 * | 0,60 | 58  |
 * | 0,70 | 31  |
 *
 * Meio vocabulário em comum **dentro da mesma seção** já é muito, e abaixo
 * disso a lista enche de par esperado: dois artigos de instalação do mesmo
 * produto se parecem por serem o que são. Um levantamento que aponta o
 * esperado deixa de ser lido.
 */
export const LIMIAR_DE_SOBREPOSICAO = 0.5;

/**
 * Teto de artigos por seção comparados aos pares.
 *
 * A comparação é quadrática. Uma seção com quinhentos artigos daria cento e
 * vinte mil pares, e o levantamento roda a cada abertura da tela. Acima do teto
 * a seção é **anunciada como não comparada** em vez de silenciosamente pulada.
 */
export const MAXIMO_POR_SECAO = 120;

export interface OverlapPair {
  sectionId: string;
  a: KnowledgeArticle;
  b: KnowledgeArticle;
  /** De 0 a 1. É vocabulário em comum, não veredito de duplicata. */
  score: number;
  /** Os termos que os dois compartilham e que quase nenhum outro artigo tem. */
  shared: string[];
}

export interface OverlapResult {
  pairs: OverlapPair[];
  /** Seções grandes demais para comparar aos pares, anunciadas em vez de omitidas. */
  skippedSections: string[];
}

/**
 * Os pares que se sobrepõem, seção a seção.
 *
 * Comparar só dentro da seção é mais barato **e** mais significativo: dois
 * artigos parecidos em seções diferentes costumam ser o mesmo assunto visto de
 * ângulos diferentes, que é o desenho do portal, não defeito. Duplicata de
 * verdade mora ao lado.
 */
export function findOverlaps(
  articles: KnowledgeArticle[],
  limiar = LIMIAR_DE_SOBREPOSICAO
): OverlapResult {
  const porSecao = new Map<string, KnowledgeArticle[]>();

  for (const article of articles) {
    // Sem seção não há vizinhança para comparar: isso já é outro achado.
    if (article.status !== "published" || !article.sectionId) continue;

    const lista = porSecao.get(article.sectionId) ?? [];
    lista.push(article);
    porSecao.set(article.sectionId, lista);
  }

  const pairs: OverlapPair[] = [];
  const skippedSections: string[] = [];

  for (const [sectionId, lista] of porSecao) {
    if (lista.length < 2) continue;

    if (lista.length > MAXIMO_POR_SECAO) {
      skippedSections.push(sectionId);
      continue;
    }

    const vocabularios = lista.map(articleVocabulary);

    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        const score = jaccard(vocabularios[i], vocabularios[j]);
        if (score < limiar) continue;

        const shared = [...vocabularios[i]]
          .filter((palavra) => vocabularios[j].has(palavra))
          .slice(0, 8);

        pairs.push({ sectionId, a: lista[i], b: lista[j], score, shared });
      }
    }
  }

  pairs.sort((x, y) => y.score - x.score);

  return { pairs, skippedSections };
}

export interface DuplicateGroup {
  /** O título que se repete, como está escrito no primeiro deles. */
  title: string;
  sectionId: string;
  articles: KnowledgeArticle[];
  /** Verdadeiro quando os corpos são iguais caractere a caractere. */
  identical: boolean;
}

/**
 * O mesmo artigo publicado mais de uma vez.
 *
 * Diferente da sobreposição, isto **não é julgamento**: mesmo título, mesma
 * seção, corpo igual ou divergente. Não é preciso ler nada para saber que há um
 * problema — é preciso ler para decidir qual fica.
 *
 * Encontrado no acervo real: seis títulos repetidos somando treze artigos, um
 * deles publicado **três vezes** com o corpo idêntico. Corpo divergente é o
 * caso pior — duas versões do mesmo artigo no ar, e quem procura acha uma
 * delas sem saber que a outra existe e diz outra coisa.
 */
export function findDuplicates(articles: KnowledgeArticle[]): DuplicateGroup[] {
  const porChave = new Map<string, KnowledgeArticle[]>();

  for (const article of articles) {
    if (article.status !== "published") continue;

    const titulo = article.title.trim().toLowerCase();
    if (titulo === "") continue;

    /*
      Título **e** seção: o portal repete de propósito um título genérico em
      seções diferentes — "Interface" do Builder e "Interface" do Eberick são
      artigos distintos, e acusá-los seria apontar o desenho como defeito.
    */
    const chave = `${article.sectionId}::${titulo}`;
    const lista = porChave.get(chave) ?? [];
    lista.push(article);
    porChave.set(chave, lista);
  }

  const grupos: DuplicateGroup[] = [];

  for (const lista of porChave.values()) {
    if (lista.length < 2) continue;

    const textos = new Set(lista.map((article) => articleText(article)));

    grupos.push({
      title: lista[0].title,
      sectionId: lista[0].sectionId,
      articles: lista,
      identical: textos.size === 1,
    });
  }

  // Mais cópias primeiro: três no ar é pior que duas.
  return grupos.sort((a, b) => b.articles.length - a.articles.length);
}
