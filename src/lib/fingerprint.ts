/**
 * A impressão de um texto: a resposta para "isto mudou?".
 *
 * Usada onde o produto precisa lembrar **qual versão** de um conteúdo ele viu —
 * o texto que a IA leu para dar um veredito, o texto que o portal tinha quando
 * foi importado. Comparar o texto inteiro exigiria guardá-lo duas vezes.
 *
 * cyrb53: rápido, síncrono e sem dependência. Não é segurança, é identidade, e
 * 53 bits tornam uma colisão entre duas versões do mesmo artigo algo que não vai
 * acontecer. `crypto.subtle` daria SHA-256, mas é assíncrono e não existe fora
 * de contexto seguro, e a impressão é calculada no meio do render de listas.
 *
 * **Mudar o algoritmo invalida toda impressão guardada.** Os vereditos venceriam
 * e o acervo inteiro pareceria divergir do portal de uma vez.
 */
export function impressao(texto: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
