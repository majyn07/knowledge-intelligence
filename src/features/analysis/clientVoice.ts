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
 */

/**
 * A fração de conversas acima da qual uma fala idêntica deixa de ser descrição.
 *
 * Medido nas 974: são 5.318 falas distintas do cliente, e **5.148 aparecem numa
 * conversa só**. Passando de 2%, sobram **dezoito** — e as dezoito são clique de
 * menu ou saudação: "Estou ciente e desejo continuar" (44%), "Setup e Suporte ao
 * Produto" (30%), "ok", "oi", "1", "2".
 *
 * A regra sai do corpus e não de uma lista escrita à mão, então ela acompanha o
 * bot quando o suporte mudar o menu — que é a diferença entre uma decisão que
 * envelhece sozinha e uma que alguém precisa lembrar de revisar.
 */
const REPETICAO_DE_BOTAO = 0.02;

const cache = new WeakMap<readonly SupportConversation[], Set<string>>();

/** Comparação insensível a caixa e espaço, que é como o mesmo botão chega. */
function chave(texto: string): string {
  return texto.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

/**
 * As falas que são botão, apuradas do próprio acervo.
 *
 * Uma passada por coleção, guardada num `WeakMap` como os outros índices:
 * quando as conversas mudam, a chave muda junto e a medição se refaz.
 */
export function falasDeBotao(conversas: readonly SupportConversation[]): Set<string> {
  const guardado = cache.get(conversas);

  if (guardado) return guardado;

  const emQuantas = new Map<string, number>();

  for (const conversa of conversas) {
    /*
      Por conversa, e não por mensagem: quem clica duas vezes no mesmo botão
      não torna aquilo mais parecido com botão do que já é.
    */
    const distintas = new Set(
      conversa.messages
        .filter((mensagem) => mensagem.role === "cliente")
        .map((mensagem) => chave(mensagem.body))
        .filter((texto) => texto !== "")
    );

    for (const texto of distintas) emQuantas.set(texto, (emQuantas.get(texto) ?? 0) + 1);
  }

  const teto = conversas.length * REPETICAO_DE_BOTAO;

  const botoes = new Set(
    [...emQuantas].filter(([, quantas]) => quantas > teto).map(([texto]) => texto)
  );

  cache.set(conversas, botoes);

  return botoes;
}

/**
 * O que o cliente descreveu, sem o que ele apenas clicou.
 *
 * Vazio quando a conversa não existe ou só tem cliques — e vazio é resposta:
 * quem chama decide o que fazer com isso, e no caso da triagem é voltar para o
 * título, que é pouco mas é do atendimento.
 */
export function falaDoCliente(
  conversa: SupportConversation | undefined,
  botoes: ReadonlySet<string>
): string {
  if (!conversa) return "";

  return conversa.messages
    .filter((mensagem) => mensagem.role === "cliente" && !botoes.has(chave(mensagem.body)))
    .map((mensagem) => mensagem.body)
    .join(" ")
    .trim();
}
