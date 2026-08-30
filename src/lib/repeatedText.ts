/**
 * O que se repete à risca por um acervo de conversas é enfeite, não descrição.
 *
 * A regra saiu de duas medições sobre as 974 conversas reais e vale para as
 * duas leituras que o produto faz do mesmo texto:
 *
 * - **Só a fala do cliente**, para a triagem agrupar pelo que ele pediu: 9.005
 *   parágrafos distintos, 8.717 numa conversa só, e 29 acima de 2%.
 * - **Todos os papéis**, para o transcrito que vai ao provedor de IA, onde o
 *   rodapé do suporte pesa tanto quanto o do cliente: 19.505 distintos e 134
 *   acima de 2%.
 *
 * Os dois alcances justificam duas chamadas, e não duas cópias: o limiar e o
 * piso escritos em dois arquivos divergem no dia em que alguém medir de novo, e
 * aí a triagem agrupa por um critério e a IA lê outro, sem nada indicando. É o
 * defeito que o cadastro de rotas e as chaves de armazenamento já produziram.
 */

import { corpoEscrito } from "@/lib/emailBody";

/**
 * A fração de conversas acima da qual um trecho idêntico deixa de ser
 * descrição.
 *
 * Acima de 2% sobra o que é enfeite de verdade: o clique de menu ("Estou ciente
 * e desejo continuar", 44%), "Atenciosamente," (67%), o rodapé de descadastro,
 * o endereço da empresa e as três linhas do aviso de segurança que o servidor
 * de e-mail injeta.
 */
const REPETICAO = 0.02;

/**
 * E nunca menos que isto, por mais raso que seja o acervo.
 *
 * Com duas conversas, 2% dá 0,04 e **qualquer** trecho passa — a descrição
 * inteira viraria enfeite e a triagem cairia no título sem ninguém entender por
 * quê. Três porque menos que isso não é repetição: duas pessoas escreverem "bom
 * dia" não faz de "bom dia" um enfeite.
 */
const MINIMO_DE_CONVERSAS = 3;

/** Comparação insensível a caixa e espaço, que é como o mesmo trecho chega. */
export function chaveDoTrecho(texto: string): string {
  return texto.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

/**
 * Os parágrafos de uma mensagem, já sem o que vem pendurado embaixo.
 *
 * `corpoEscrito` corta o que é estrutural e raro — o `--` da convenção de
 * e-mail, o aviso jurídico, a citação. A contagem por repetição pega o que é
 * comum e não tem forma. Um sozinho não basta: a assinatura de quem escreveu
 * uma vez só não se repete, e o banner do gateway não tem delimitador.
 */
export function paragrafosDe(corpo: string): string[] {
  return corpoEscrito(corpo)
    .split(/\n\s*\n/)
    .map((trecho) => trecho.trim())
    .filter((trecho) => trecho !== "");
}

/**
 * Os trechos repetidos de uma coleção, contados **por conversa**.
 *
 * Quem clica duas vezes no mesmo botão, ou responde três e-mails com a mesma
 * assinatura, não torna aquilo mais repetido do que já é.
 *
 * `textoDa` decide o alcance: quem chama passa as mensagens que interessam.
 */
export function trechosRepetidosEm<T>(
  conversas: readonly T[],
  textoDa: (conversa: T) => string[]
): Set<string> {
  const emQuantas = new Map<string, number>();

  for (const conversa of conversas) {
    const distintos = new Set(textoDa(conversa).flatMap(paragrafosDe).map(chaveDoTrecho));

    for (const trecho of distintos) emQuantas.set(trecho, (emQuantas.get(trecho) ?? 0) + 1);
  }

  const teto = Math.max(MINIMO_DE_CONVERSAS, conversas.length * REPETICAO);

  return new Set(
    [...emQuantas].filter(([, quantas]) => quantas > teto).map(([trecho]) => trecho)
  );
}
