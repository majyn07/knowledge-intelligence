import { chaveDoTrecho, paragrafosDe, trechosRepetidosEm } from "@/lib/repeatedText";
import type { SupportConversation, SupportConversationMessage } from "@/models/SupportConversation";

/**
 * A conversa que vai ao provedor de IA, sem o que nenhum modelo precisa ler.
 *
 * O transcrito ia inteiro: rodapé do e-mail, assinatura, aviso de segurança do
 * servidor, clique de menu do bot e histórico citado. Medido no acervo, isso é
 * **27% do texto** — 6,19 milhões de caracteres virando 4,54.
 *
 * Não é só custo. O modelo lê "Atenciosamente," em 67% das conversas e
 * "Selecione a opção que melhor descreve o motivo do seu contato" em 42%: é
 * contexto que compete com a descrição do problema pela atenção dele.
 *
 * A regra é a mesma da triagem, e sai do próprio acervo — trecho repetido em
 * muitas conversas é enfeite. A diferença é o alcance: aqui entram **todos os
 * papéis**, porque o rodapé do suporte pesa tanto quanto o do cliente. Na
 * triagem só a fala do cliente conta, porque lá a pergunta é o que ele pediu.
 */

/**
 * O teto do transcrito, em caracteres.
 *
 * Não havia teto, e a conversa não é curta: a maior do acervo tem 407.519
 * caracteres, que são cerca de **cem mil tokens** num pedido só. O p99 é 14.800
 * tokens. Um pedido desses custa caro, chega perto do limite do modelo, e volta
 * cortado sem ninguém saber por quê — que foi exatamente o defeito da resposta
 * truncada, do outro lado.
 *
 * Quarenta mil caracteres cobrem 95% das conversas inteiras. Acima disso a
 * ressalva vai junto, como no artigo: resposta baseada em meia conversa
 * apresentada como se fosse sobre a inteira é erro que ninguém percebe.
 */
const MAXIMO_DE_CARACTERES = 40_000;

const cache = new WeakMap<readonly SupportConversation[], Set<string>>();

/**
 * Os trechos que se repetem pela conversa toda, de qualquer papel.
 *
 * Uma passada por coleção, guardada num `WeakMap`: quando as conversas mudam, a
 * chave muda junto.
 */
export function enfeiteDaConversa(conversas: readonly SupportConversation[]): Set<string> {
  const guardado = cache.get(conversas);

  if (guardado) return guardado;

  /* Todos os papéis: o rodapé do suporte pesa tanto quanto o do cliente. */
  const enfeite = trechosRepetidosEm(conversas, (conversa) =>
    conversa.messages.map((mensagem) => mensagem.body)
  );

  cache.set(conversas, enfeite);

  return enfeite;
}

export interface TranscriptPreparado {
  messages: SupportConversationMessage[];
  /**
   * A conversa não coube inteira, e o modelo é avisado disso.
   *
   * Havia aqui também um `descartadas`, contando as mensagens que sumiram por
   * serem só enfeite. Ninguém lia: um campo no contrato sugere um aviso na tela
   * que não existe, e no acervo real são 4.075 mensagens. Se um dia virar aviso,
   * ele volta com o consumidor junto.
   */
  truncated: boolean;
}

/**
 * A conversa pronta para o pedido: limpa, e dentro do teto.
 *
 * Corta pelo **fim**, e não pelo começo: numa conversa de suporte o problema é
 * descrito no início e o fim costuma ser confirmação e despedida. Cortar a
 * cabeça deixaria o modelo com a resposta e sem a pergunta.
 *
 * Mensagem que fica vazia depois da limpeza sai: era só o clique de menu ou a
 * assinatura, e uma linha de autor sem corpo só ocupa espaço.
 */
export function prepararTranscrito(
  conversa: SupportConversation | undefined,
  enfeite: ReadonlySet<string>
): TranscriptPreparado {
  if (!conversa) return { messages: [], truncated: false };

  const limpas: SupportConversationMessage[] = [];

  for (const mensagem of conversa.messages) {
    const corpo = paragrafosDe(mensagem.body)
      .filter((trecho) => !enfeite.has(chaveDoTrecho(trecho)))
      .join("\n\n");

    /* Linha de autor sem corpo só ocupa espaço no pedido. */
    if (corpo === "") continue;

    limpas.push({ ...mensagem, body: corpo });
  }

  const dentro: SupportConversationMessage[] = [];
  let usados = 0;
  let truncated = false;

  for (const mensagem of limpas) {
    if (usados + mensagem.body.length > MAXIMO_DE_CARACTERES) {
      truncated = true;
      break;
    }

    dentro.push(mensagem);
    usados += mensagem.body.length;
  }

  /*
    Uma mensagem sozinha maior que o teto ainda entra, cortada: devolver
    conversa vazia porque a primeira fala é longa seria pior que devolver
    metade dela, e a ressalva diz que foi cortada.
  */
  if (dentro.length === 0 && limpas.length > 0) {
    dentro.push({ ...limpas[0], body: limpas[0].body.slice(0, MAXIMO_DE_CARACTERES) });
    truncated = true;
  }

  return { messages: dentro, truncated };
}
