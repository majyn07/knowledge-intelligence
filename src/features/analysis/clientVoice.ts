import { corpoEscrito } from "@/lib/emailBody";
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

/**
 * A fração de conversas acima da qual um trecho idêntico deixa de ser descrição.
 *
 * Medido nas 973 conversas: são **9.005 parágrafos distintos** na fala do
 * cliente, e **8.717 aparecem numa conversa só**. Passando de 2%, sobram
 * **vinte e nove** — e os vinte e nove são enfeite: o clique de menu ("Estou
 * ciente e desejo continuar", 44%), o rodapé de descadastro, o endereço da
 * empresa, "Technical Support Analyst", e as três linhas do aviso de segurança
 * que o servidor de e-mail injeta.
 *
 * **O parágrafo é a unidade certa, e não a mensagem inteira.** O aviso de
 * segurança vem **antes** do texto da pessoa: cortar por marcador estrutural,
 * que corta para baixo, não o alcança, e descartar a mensagem inteira jogaria
 * fora a descrição junto. Ele colava "pagamento de boleto" com "exportar do
 * Builder para o Revit" — a mesma falha do rodapé, num lugar novo.
 *
 * A regra sai do corpus e não de uma lista escrita à mão, então acompanha o bot
 * quando o suporte mudar o menu, e o gateway quando a TI mudar o aviso.
 */
const REPETICAO_DE_ENFEITE = 0.02;

/**
 * E nunca menos que isto, por mais raso que seja o acervo.
 *
 * A fração sozinha tem um buraco em acervo pequeno: com duas conversas, 2%
 * dá 0,04, e **qualquer** fala passa do limiar — a descrição do cliente
 * inteira seria descartada como botão, e a triagem cairia no título sem
 * ninguém entender por quê. O defeito apareceu num teste de duas conversas, e
 * ele vale igual para uma equipe que está começando.
 *
 * Três porque menos que isso não é repetição: duas pessoas escreverem "bom
 * dia" não faz de "bom dia" um enfeite.
 */
const MINIMO_DE_CONVERSAS = 3;

const cache = new WeakMap<readonly SupportConversation[], Set<string>>();

/**
 * Os parágrafos de uma mensagem, já sem o que vem pendurado embaixo.
 *
 * `corpoEscrito` corta assinatura, aviso jurídico e citação — o que é
 * estrutural e não se repete o bastante para ser pego pela contagem, como a
 * assinatura de um cliente que escreveu uma vez só. Os dois se somam: um pega o
 * que é raro e tem forma, o outro pega o que é comum e não tem.
 */
function paragrafos(corpo: string): string[] {
  return corpoEscrito(corpo)
    .split(/\n\s*\n/)
    .map((trecho) => trecho.trim())
    .filter((trecho) => trecho !== "");
}

/** Comparação insensível a caixa e espaço, que é como o mesmo botão chega. */
function chave(texto: string): string {
  return texto.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

/**
 * Os trechos que são enfeite, apurados do próprio acervo.
 *
 * Uma passada por coleção, guardada num `WeakMap` como os outros índices:
 * quando as conversas mudam, a chave muda junto e a medição se refaz.
 */
export function trechosRepetidos(conversas: readonly SupportConversation[]): Set<string> {
  const guardado = cache.get(conversas);

  if (guardado) return guardado;

  const emQuantas = new Map<string, number>();

  for (const conversa of conversas) {
    /*
      Por conversa, e não por ocorrência: quem clica duas vezes no mesmo botão,
      ou responde três e-mails com a mesma assinatura, não torna aquilo mais
      repetido do que já é.
    */
    const distintas = new Set(
      conversa.messages
        .filter((mensagem) => mensagem.role === "cliente")
        .flatMap((mensagem) => paragrafos(mensagem.body))
        .map(chave)
    );

    for (const texto of distintas) emQuantas.set(texto, (emQuantas.get(texto) ?? 0) + 1);
  }

  const teto = Math.max(MINIMO_DE_CONVERSAS, conversas.length * REPETICAO_DE_ENFEITE);

  const repetidos = new Set(
    [...emQuantas].filter(([, quantas]) => quantas > teto).map(([trecho]) => trecho)
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
    .flatMap((mensagem) => paragrafos(mensagem.body))
    .filter((trecho) => !repetidos.has(chave(trecho)))
    .join(" ")
    .trim();
}
