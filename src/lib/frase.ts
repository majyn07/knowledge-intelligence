/**
 * A mensagem sem a pontuação final, para outra frase vir depois.
 *
 * As varreduras dizem onde pararam juntando a mensagem do servidor com "parou
 * no par 3 de 10". A do servidor já termina em ponto, e a tela mostrava
 * "peça de novo., parou no par 1" — medido em produção, com o Gemini
 * sobrecarregado em 26/10/2026. Frase quebrada na hora da falha é a que mais
 * faz desconfiar da tela.
 */
export function semPontoFinal(texto: string): string {
  return texto.trim().replace(/[.!;:,\s]+$/u, "");
}
