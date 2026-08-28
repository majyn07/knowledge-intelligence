export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}

/**
 * Uma página da lista.
 *
 * Página e não rolagem infinita: com mil linhas a rolagem esconde onde a
 * pessoa está e impede voltar ao mesmo ponto. E página não exige biblioteca
 * nova no projeto, virtualizar exigiria.
 *
 * Página fora do intervalo é corrigida em vez de devolver vazio: filtrar
 * enquanto se está na página 7 deixaria a tela em branco com registros logo
 * ali.
 *
 * Vive em `lib` porque as duas listas do produto pedem a mesma coisa. Ela
 * nasceu na Biblioteca, com 1.822 artigos, e o lado do atendimento chegou ao
 * mesmo lugar assim que passou de algumas dezenas.
 */
export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;

  return {
    items: items.slice(start, start + size),
    page: current,
    pages,
    total: items.length,
  };
}
