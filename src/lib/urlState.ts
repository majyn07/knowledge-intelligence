/**
 * O recorte da tela, escrito na URL.
 *
 * Filtro, busca, ordenação e página não viviam no endereço, então não existia
 * link que reproduzisse a tela exata — que é justamente o que se cola no chat
 * da equipe para dizer "olha isto aqui". Com o acervo importado isso passou a
 * pesar: apontar para "os 187 sem seção" precisa de um endereço.
 *
 * Puro de propósito. Quem mexe no `window` é o hook; aqui só entra e sai texto,
 * o que permite testar as regras que de fato erram — valor inválido vindo de
 * link antigo, parâmetro de outra tela sendo apagado sem querer, e URL que
 * cresce com o que é igual ao padrão.
 */

export type ParamValues = Record<string, string>;

/**
 * Aplica os valores sobre a busca atual, preservando o que não é nosso.
 *
 * Reescrever a query inteira apagaria parâmetros de outra funcionalidade —
 * `?ticket=` e `?plan=` já existem, e um deles sumir por causa de um filtro
 * seria a tela derrubando a navegação de outra.
 *
 * O que está no padrão **sai** da URL. Endereço que carrega
 * `status=all&categoria=all&pagina=1` é mais difícil de ler e não diz nada
 * além do que a tela já faria sozinha.
 */
export function applyParams(
  currentSearch: string,
  values: ParamValues,
  defaults: ParamValues
): string {
  const params = new URLSearchParams(currentSearch);

  for (const key of Object.keys(defaults)) {
    const value = values[key] ?? defaults[key];

    if (value === defaults[key] || value === "") params.delete(key);
    else params.set(key, value);
  }

  const query = params.toString();

  return query === "" ? "" : `?${query}`;
}

/**
 * Lê os valores conhecidos, com o padrão para o que falta.
 *
 * Só as chaves declaradas em `defaults` são lidas. Aceitar qualquer parâmetro
 * deixaria a tela obedecer a algo que ninguém escreveu — e o endereço vem de
 * fora, colado por outra pessoa.
 */
export function readParams(search: string, defaults: ParamValues): ParamValues {
  const params = new URLSearchParams(search);
  const resultado: ParamValues = { ...defaults };

  for (const key of Object.keys(defaults)) {
    const value = params.get(key);
    if (value !== null && value !== "") resultado[key] = value;
  }

  return resultado;
}

/**
 * Devolve o valor se ele for aceitável, e o padrão se não for.
 *
 * Link colado envelhece: a categoria pode ter sido removida do cadastro, o
 * estágio pode ter mudado de nome. Filtrar por um valor que não existe mais
 * mostra uma tela vazia com cara de acervo vazio — e quem abriu o link não tem
 * como saber que o problema é o link.
 */
export function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Página fora do intervalo volta para a primeira, em vez de mostrar vazio. */
export function pageNumber(value: string | undefined, total: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) return 1;

  return parsed > total ? 1 : parsed;
}
