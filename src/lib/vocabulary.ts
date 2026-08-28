/**
 * O vocabulário do produto, num lugar só.
 *
 * Toda comparação por palavra passa por aqui: a sobreposição entre artigos, a
 * comparação de dois deles e a triagem que agrupa atendimentos pela mesma
 * dúvida. Duas listas do mesmo vocabulário divergem, e a divergência
 * apareceria como o Levantamento apontando um par que a tela de comparação
 * depois descreve de outro jeito.
 *
 * Subiu para `lib` quando o segundo domínio passou a precisar dela. Antes
 * vivia dentro da Biblioteca, e a triagem do atendimento a importaria por cima
 * da fronteira de feature.
 */

/**
 * Palavras que aparecem em quase todo texto deste produto.
 *
 * Sem esta lista, dois artigos quaisquer do Builder se parecem: os dois falam
 * de projeto, janela, comando e clique. O que distingue um do outro é o termo
 * técnico, não o vocabulário da ferramenta. Vale igual para o atendimento, que
 * é escrito pelas mesmas pessoas sobre os mesmos produtos.
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

/** Abaixo disso a palavra comum é curta demais para distinguir assunto. */
const TAMANHO_MINIMO = 5;

/**
 * Códigos entram mesmo sendo curtos, e essa regra veio da medição.
 *
 * Numa base técnica o que separa dois textos vizinhos costuma ser justamente
 * um código curto: `D15` e `D16` são erros diferentes, `V9` e `V10` são versões
 * diferentes. Com o corte por tamanho, esses pares apareciam como **idênticos**,
 * porque o único termo que os distinguia era o descartado.
 *
 * O critério é misturar letra e dígito: é o formato de código de erro, versão e
 * norma, e não pega palavra comum nenhuma.
 */
const CODIGO = /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/;

/**
 * Número solto não é assunto.
 *
 * O corte por tamanho deixava passar qualquer sequência de cinco dígitos, e com
 * os atendimentos da HubSpot dentro isso virou vocabulário de verdade:
 * `47968252511` é o número do chamado, `537686325` sai de um endereço, `2024` é
 * ano. Nenhum deles descreve dúvida nenhuma, e dois textos que dividem só um
 * número não dividem assunto.
 *
 * `D15` e `V10` continuam entrando: eles têm letra, e é a letra que os torna
 * código de erro em vez de contagem.
 */
const SO_DIGITOS = /^\d+$/;

export function isMeaningfulTerm(palavra: string): boolean {
  if (COMUNS.has(palavra)) return false;
  if (SO_DIGITOS.test(palavra)) return false;
  if (CODIGO.test(palavra)) return true;

  return palavra.length >= TAMANHO_MINIMO;
}

/** As palavras de um texto qualquer, já normalizadas. */
export function termsOf(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(isMeaningfulTerm);
}

/**
 * As palavras de uma **busca**, que não é a mesma coisa que o vocabulário.
 *
 * `termsOf` descarta o que é curto e o que é comum, e está certo: ele existe
 * para comparar dois textos, e "projeto" não distingue nada num produto de
 * projeto. Numa busca isso vira defeito. Quem digita "laje" quer que "laje"
 * conte, e ver voltar tudo que fala de flecha porque a segunda palavra foi
 * jogada fora é a busca ignorando metade do que se pediu.
 *
 * Aqui entra tudo que a pessoa escreveu, sem acento e sem caixa.
 */
export function searchTerms(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra !== "");
}

/** Quanto do vocabulário dos dois é o mesmo, de 0 a 1. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let comuns = 0;
  const menor = a.size <= b.size ? a : b;
  const maior = menor === a ? b : a;

  for (const palavra of menor) if (maior.has(palavra)) comuns += 1;

  return comuns / (a.size + b.size - comuns);
}

/** As palavras de um texto, com quantas vezes cada uma aparece. */
export function termFrequency(texto: string): Map<string, number> {
  const contagem = new Map<string, number>();

  for (const palavra of termsOf(texto)) {
    contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
  }

  return contagem;
}
