import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "@/features/library/content/articleText";

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
 * Palavras que aparecem em quase todo artigo do portal.
 *
 * Sem esta lista, dois artigos quaisquer do Builder se parecem: os dois falam
 * de projeto, janela, comando e clique. O que distingue um artigo do outro é o
 * termo técnico, não o vocabulário da ferramenta.
 */
const COMUNS = new Set([
  "para", "com", "que", "dos", "das", "por", "uma", "nao", "como", "mais", "sem",
  "sobre", "pode", "ser", "esta", "este", "isso", "quando", "onde", "seu", "sua",
  "aos", "nas", "nos", "foi", "sao", "tem", "caso", "deve", "todos", "toda", "cada",
  "altoqi", "artigo", "builder", "eberick", "visus", "plataforma", "programa",
  "projeto", "usuario", "arquivo", "clique", "clicar", "opcao", "opcoes", "janela",
  "comando", "desenho", "tela", "menu", "botao", "figura", "abaixo", "acima",
  "seguir", "conforme", "atraves", "possivel", "necessario", "utilizar", "forma",
  "apresentado", "apresentada", "exemplo", "mostrado", "selecionar", "existe",
]);

/** Abaixo disso a palavra é curta demais para distinguir assunto. */
const TAMANHO_MINIMO = 5;

/**
 * A partir de quanto de vocabulário em comum vale olhar.
 *
 * Abaixo disto o par tende a ser só dois artigos da mesma seção falando do
 * mesmo produto, que é o esperado — e um levantamento que aponta o esperado
 * deixa de ser lido.
 *
 * **O número precisa ser calibrado contra o acervo importado**, medindo a
 * distribuição real das semelhanças por seção. Enquanto isso não acontece, ele
 * é um ponto de partida conservador: erra para menos achados, que é o lado
 * seguro de errar num levantamento.
 */
export const LIMIAR_DE_SOBREPOSICAO = 0.34;

/**
 * Teto de artigos por seção comparados aos pares.
 *
 * A comparação é quadrática. Uma seção com quinhentos artigos daria cento e
 * vinte mil pares, e o levantamento roda a cada abertura da tela. Acima do teto
 * a seção é **anunciada como não comparada** em vez de silenciosamente pulada.
 */
export const MAXIMO_POR_SECAO = 120;

function vocabulario(article: KnowledgeArticle): Set<string> {
  const bruto = `${article.title} ${article.summary} ${articleText(article)}`;

  const palavras = bruto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length >= TAMANHO_MINIMO && !COMUNS.has(palavra));

  return new Set(palavras);
}

/** Quanto do vocabulário dos dois é o mesmo, de 0 a 1. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let comuns = 0;
  const menor = a.size <= b.size ? a : b;
  const maior = menor === a ? b : a;

  for (const palavra of menor) if (maior.has(palavra)) comuns += 1;

  return comuns / (a.size + b.size - comuns);
}

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

    const vocabularios = lista.map(vocabulario);

    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        const score = similarity(vocabularios[i], vocabularios[j]);
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
