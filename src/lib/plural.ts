/**
 * Texto que concorda em número.
 *
 * O produto já dizia isto sobre o diálogo de exclusão: "3 artigo(s) vai para a
 * lixeira e pode ser restaurado" é uma frase escrita para um caso e usada
 * noutro, e quem lê rápido uma frase que não concorda desconfia da tela
 * inteira. A regra valia, e mesmo assim havia 89 lugares escrevendo "(s)".
 *
 * Num lugar só porque a alternativa é um ternário em cada frase, e ternário
 * repetido oitenta e nove vezes é onde alguém erra o plural de "visível".
 */

/** Só a palavra, concordando: `concordar(3, "publicado")` → "publicados". */
export function concordar(quantidade: number, singular: string, plural?: string): string {
  return quantidade === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * O número com a palavra: `contar(3, "artigo")` → "3 artigos".
 *
 * O plural irregular vai explícito — "sugestão"/"sugestões",
 * "visível"/"visíveis" — porque acrescentar `s` erraria os dois em silêncio.
 */
export function contar(quantidade: number, singular: string, plural?: string): string {
  return `${quantidade} ${concordar(quantidade, singular, plural)}`;
}
