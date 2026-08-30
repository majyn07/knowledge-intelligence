import {
  chaveDoTrecho,
  paragrafosDe,
  trechosRepetidosEm,
} from "@/lib/repeatedText";
import type { SupportConversation } from "@/models/SupportConversation";

/**
 * O que o **cliente** escreveu, que é a pergunta e não a resposta.
 *
 * A triagem agrupava por `título + solução`, e "solução" é o e-mail inteiro que
 * o suporte respondeu. O Levantamento mostrou o resultado contra dado real:
 * "156 atendimentos usam as mesmas palavras (ajuda, conhecimento, entendermos,
 * hesite)" — que é *"Precisa de Ajuda? Base de Conhecimento"* e *"não hesite em
 * nos contatar"*. O grupo era o **rodapé**, e ele apresentava metade do acervo
 * como um assunto só.
 *
 * **Cortar por frequência não resolve aqui**, e isso foi medido. No corpo do
 * e-mail do suporte, a faixa de 8% a 30% é rodapé quase inteira — "balão",
 * "canto", "inferior", "rosa", "hesite", os nomes de quem atendeu — e no meio
 * dela estão "builder" (19%) e "eberick" (11%), que são justamente o que
 * distingue um chamado do outro. Não há corte que separe os dois.
 *
 * O que separa é **de quem é a fala**. A resposta do suporte é um modelo; a
 * descrição do cliente é dele. Medido: 5.843 termos distintos no e-mail do
 * suporte contra 11.799 na fala do cliente, nos mesmos 1.025 atendimentos.
 *
 * **E a fala do cliente também vem com rodapé.** Trocar a assinatura do suporte
 * pela do cliente não seria conserto: o maior grupo passou a colar por
 * "andressa, bancarios, centro, commercial", que é o bloco de contato de quem
 * enviou. Quem corta isso é `corpoEscrito`, por marcador estrutural — medido,
 * 527 falas cortadas e 32% menos texto, e os grupos com mais de um atendimento
 * caíram de 80 para 64, que é o ruído saindo.
 */

const cache = new WeakMap<readonly SupportConversation[], Set<string>>();

/**
 * Os trechos que são enfeite, apurados do próprio acervo.
 *
 * Uma passada por coleção, guardada num `WeakMap` como os outros índices:
 * quando as conversas mudam, a chave muda junto e a medição se refaz.
 */
export function trechosRepetidos(conversas: readonly SupportConversation[]): Set<string> {
  const guardado = cache.get(conversas);

  if (guardado) return guardado;

  /* Só a fala do cliente: aqui a pergunta é o que **ele** pediu. */
  const repetidos = trechosRepetidosEm(conversas, (conversa) =>
    conversa.messages.filter((mensagem) => mensagem.role === "cliente").map((m) => m.body)
  );

  cache.set(conversas, repetidos);

  return repetidos;
}

/**
 * O que o cliente descreveu, sem o que ele apenas clicou nem o que a
 * ferramenta carimbou.
 *
 * Vazio quando a conversa não existe ou só tem cliques — e vazio é resposta:
 * quem chama decide o que fazer com isso, e no caso da triagem é voltar para o
 * título, que é pouco mas é do atendimento.
 */
export function falaDoCliente(
  conversa: SupportConversation | undefined,
  repetidos: ReadonlySet<string>
): string {
  if (!conversa) return "";

  return conversa.messages
    .filter((mensagem) => mensagem.role === "cliente")
    .flatMap((mensagem) => paragrafosDe(mensagem.body))
    .filter((trecho) => !repetidos.has(chaveDoTrecho(trecho)))
    .join(" ")
    .trim();
}
