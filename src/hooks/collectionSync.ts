/**
 * O que releer quando outra pessoa mexeu na coleção.
 *
 * O tempo real relê o estado atual em vez de aplicar o evento recebido, e essa
 * decisão continua: aplicar erra quando os eventos chegam fora de ordem ou
 * quando um se perde na reconexão. O problema é o preço da releitura. Com o
 * portal importado, um colega classificando **um** artigo fazia cada aba aberta
 * da equipe baixar os 22,7 MB do acervo inteiro.
 *
 * A saída é reler em dois passos, sem abrir mão de ler o estado atual: primeiro
 * a lista de identificadores com o carimbo de gravação, que são cento e dez
 * kilobytes, e depois só as linhas cujo carimbo mudou. Um artigo editado passa
 * a custar uma linha em vez de mil oitocentas e vinte e duas.
 *
 * O carimbo é `synced_at`, e não `updated_at`, e a diferença é o que torna isto
 * seguro. `updated_at` é do produto: a importação do portal grava ali o
 * `lastmod` do artigo publicado, e é por ele que a varredura sabe o que já está
 * em dia. Salvar um rascunho não o toca, restaurar da lixeira também não.
 * Carimbo de produto não responde "esta linha mudou no banco", e um que não
 * responde isso deixaria a tela com dado velho sem nada indicando.
 */

/** Uma linha vista de fora: quem ela é e quando foi gravada. */
export interface Carimbo {
  id: string;
  syncedAt: string;
}

export interface PlanoDeReleitura {
  /** Linhas a buscar inteiras: novas ou gravadas de novo. */
  buscar: string[];
  /** Some da memória: saiu da tabela. */
  remover: string[];
  /** Continua igual ao que já está aqui. */
  intactos: number;
}

/**
 * Compara o que está na memória com o que o banco tem agora.
 *
 * `local` é o que a aba guarda, `remoto` é o que a consulta de carimbos
 * devolveu. Carimbo que não conhecemos conta como mudado: é o caso da primeira
 * releitura depois de uma carga que não guardou carimbo, e buscar a linha é o
 * lado seguro do erro.
 */
export function planejarReleitura(
  local: Map<string, string>,
  remoto: Carimbo[]
): PlanoDeReleitura {
  const buscar: string[] = [];
  let intactos = 0;

  const vistos = new Set<string>();

  for (const linha of remoto) {
    vistos.add(linha.id);

    const daMemoria = local.get(linha.id);

    if (daMemoria !== undefined && daMemoria === linha.syncedAt) {
      intactos += 1;
      continue;
    }

    buscar.push(linha.id);
  }

  const remover = [...local.keys()].filter((id) => !vistos.has(id));

  return { buscar, remover, intactos };
}

/**
 * Junta o que já estava aqui com o que veio do banco, na ordem do banco.
 *
 * A ordem é a do carimbo remoto de propósito: ela é a mesma que uma releitura
 * inteira teria produzido, e a lista não pode se reorganizar sozinha na tela de
 * quem está olhando só porque um colega editou algo.
 */
export function aplicarReleitura<T>({
  local,
  ordem,
  buscados,
  identify,
}: {
  local: T[];
  /** Os identificadores na ordem em que o banco os devolveu. */
  ordem: string[];
  /** As linhas relidas inteiras, já convertidas. */
  buscados: T[];
  identify: (item: T) => string;
}): T[] {
  const porId = new Map<string, T>();

  for (const item of local) porId.set(identify(item), item);
  for (const item of buscados) porId.set(identify(item), item);

  const resultado: T[] = [];

  for (const id of ordem) {
    const item = porId.get(id);
    if (item !== undefined) resultado.push(item);
  }

  return resultado;
}

/**
 * As mesmas linhas cruas, com as que mudaram no lugar das antigas.
 *
 * Existe para o **cache do navegador**, e não para a tela: a releitura
 * incremental já conserta o que está em memória, mas o cache guarda linhas, e
 * até aqui só a releitura inteira o reescrevia.
 *
 * O efeito era permanente, e não "um pouco velho": medido depois de classificar
 * 52 artigos, o cache continuou com as 52 linhas antigas, e **toda abertura**
 * voltava a baixar as mesmas 52. Nada convergia, porque nada reescrevia. Para
 * catorze pessoas várias vezes por dia, a conta só cresce.
 *
 * A recusa anterior era não inventar um segundo caminho de conversão,
 * reconvertendo registro em linha. Ela continua valendo — e não é preciso
 * converter nada: as linhas cruas que a releitura acabou de buscar são
 * exatamente o que o cache quer guardar.
 */
export function mesclarLinhas({
  local,
  ordem,
  buscadas,
}: {
  /** As linhas que o cache tinha. */
  local: unknown[];
  /** Os identificadores na ordem em que o banco os devolveu. */
  ordem: string[];
  /** As linhas cruas relidas agora. */
  buscadas: unknown[];
}): unknown[] {
  const porId = new Map<string, unknown>();

  for (const linha of [...local, ...buscadas]) {
    const id = identificarLinha(linha);
    if (id !== null) porId.set(id, linha);
  }

  /*
    A ordem é a do carimbo remoto, como em `aplicarReleitura`, e quem não está
    nela sai: é assim que o registro apagado deixa o cache em vez de reaparecer
    na próxima abertura.
  */
  const resultado: unknown[] = [];

  for (const id of ordem) {
    const linha = porId.get(id);
    if (linha !== undefined) resultado.push(linha);
  }

  return resultado;
}

/** Linha sem `id` legível não entra: guardá-la seria guardar algo que não se acha. */
function identificarLinha(linha: unknown): string | null {
  if (typeof linha !== "object" || linha === null) return null;

  const { id } = linha as { id?: unknown };

  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Quantos identificadores cabem num pedido.
 *
 * O filtro `in` vai na URL, e identificador de artigo tem trinta e poucos
 * caracteres: acima disto o endereço passa do que o servidor aceita, e a falha
 * chega como erro genérico.
 */
export const POR_PEDIDO_DE_IDS = 100;

/**
 * Acima disto, releitura incremental deixa de compensar.
 *
 * Se quase tudo mudou, os dois passos custam mais que um: a consulta de
 * carimbos vira desperdício e as linhas vêm em pedidos de cem em vez de páginas
 * de duzentas. É o caso da importação do portal vista de outra aba.
 */
export const FRACAO_QUE_NAO_COMPENSA = 0.5;

export function valeIncremental(plano: PlanoDeReleitura, total: number): boolean {
  if (total === 0) return false;

  return plano.buscar.length / total < FRACAO_QUE_NAO_COMPENSA;
}
