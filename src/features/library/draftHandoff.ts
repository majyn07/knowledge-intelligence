import { readJSON, remove, STORAGE_KEYS, writeJSON } from "@/lib/storage";

/**
 * Um rascunho a caminho do formulário de artigo.
 *
 * A fila de triagem descobre o assunto, a IA avalia se o acervo cobre e escreve
 * o rascunho — e o artigo nasce noutra tela. Sem entrega, quem chega ao
 * formulário chega com ele em branco e o rascunho fica para trás, que é o
 * mesmo que não tê-lo escrito.
 *
 * **É entrega, não estado.** Quem escreve retira na chegada e a chave some: se
 * ficasse, abrir o formulário na semana seguinte traria de volta um rascunho
 * que a pessoa já decidiu não usar.
 *
 * Fica no **navegador**, e não no banco, pela mesma razão da recuperação de
 * texto não salvo: texto pela metade no servidor ficaria visível para a equipe
 * antes de a pessoa decidir mostrar, e a decisão de mostrar é dela.
 */

export interface RascunhoEntregue {
  title: string;
  summary: string;
  content: string;
  /** De onde ele veio, para a tela dizer, e para o histórico não inventar origem. */
  origem: string;
}

export function guardarRascunho(rascunho: RascunhoEntregue): void {
  writeJSON(STORAGE_KEYS.articleHandoff, rascunho);
}

/**
 * Retira o rascunho, se houver. A chave some na leitura.
 *
 * Passa por normalizador como todo dado lido do armazenamento: ele foi gravado
 * por alguma versão do produto, possivelmente anterior a esta, e a primeira
 * leitura de um campo ausente derrubaria o formulário.
 */
export function retirarRascunho(): RascunhoEntregue | null {
  const bruto = readJSON<unknown>(STORAGE_KEYS.articleHandoff, null);

  remove(STORAGE_KEYS.articleHandoff);

  return normalizarRascunho(bruto);
}

export function normalizarRascunho(bruto: unknown): RascunhoEntregue | null {
  if (typeof bruto !== "object" || bruto === null) return null;

  const { title, summary, content, origem } = bruto as Record<string, unknown>;

  const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

  /*
    Sem título e sem conteúdo não há rascunho, e abrir o formulário anunciando
    uma entrega vazia é pior que abrir em branco.
  */
  if (texto(title) === "" && texto(content) === "") return null;

  return {
    title: texto(title),
    summary: texto(summary),
    content: texto(content),
    origem: texto(origem),
  };
}
