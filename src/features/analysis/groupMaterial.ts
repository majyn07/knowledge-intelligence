import { corpoEscrito } from "@/lib/emailBody";
import { trechosRepetidosEm } from "@/lib/repeatedText";
import type { SupportConversation } from "@/models/SupportConversation";

import { falaDoCliente } from "./clientVoice";
import type { TriageGroup } from "./triage";

/**
 * Um grupo da fila virando material para escrever o artigo.
 *
 * É a última perna do ciclo que ainda era manual: a triagem agrupa, a IA
 * prioriza, a avaliação de cobertura sabe dizer se o acervo responde e escrever
 * o rascunho — e entre "estes 24 atendimentos" e "avalie este material" havia
 * uma pessoa relendo 24 conversas e resumindo à mão.
 *
 * **A pergunta é do cliente; a resposta é do suporte.** As duas precisam ir: só
 * a pergunta produz um artigo que descreve o problema e não o resolve, e só a
 * resposta produz um artigo que resolve algo que ninguém sabe procurar. É a
 * mesma divisão que a triagem já faz para agrupar.
 *
 * **E as duas vão limpas.** A fala do cliente perde o que se repete no acervo
 * (o clique de menu, o aviso de segurança do servidor), e a resposta perde
 * assinatura, rodapé e citação. Sem isso, 38% do que iria ao modelo seria
 * enfeite — medido no acervo — e o modelo leria "Atenciosamente," competindo com
 * a descrição do problema.
 */

/** Quantos atendimentos do grupo entram. Amostra, e a tela diz que é amostra. */
export const ATENDIMENTOS_NO_MATERIAL = 6;

/** Quanto de cada atendimento entra. O grupo inteiro não cabe, e não precisa. */
const POR_ATENDIMENTO = 2_000;

export interface MaterialDoGrupo {
  /** O texto que vai ao modelo como "material a documentar". */
  material: string;
  /** Quantos atendimentos entraram. */
  usados: number;
  /** Quantos o grupo tem ao todo, para a tela dizer que é amostra. */
  total: number;
}

export function materialDoGrupo(
  grupo: TriageGroup,
  conversas: readonly SupportConversation[]
): MaterialDoGrupo {
  const porAtendimento = new Map(conversas.map((conversa) => [conversa.ticketId, conversa]));

  /*
    O que se repete no acervo é enfeite, e quem diz isso é o corpus: passando de
    2% das conversas, o trecho é o clique de menu, o rodapé de descadastro ou o
    aviso do servidor de e-mail. O alcance é de quem chama, e aqui é a fala do
    cliente, como na triagem.
  */
  const repetidos = trechosRepetidosEm(conversas, (conversa) =>
    conversa.messages.filter((mensagem) => mensagem.role === "cliente").map((m) => m.body)
  );

  /*
    Os mais recentes primeiro. Um assunto que chega há dois anos mudou de forma
    no caminho — versão do produto, nome de menu — e o artigo tem de responder
    ao que chega hoje.
  */
  const escolhidos = [...grupo.tickets]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, ATENDIMENTOS_NO_MATERIAL);

  const partes = escolhidos.map((ticket, indice) => {
    const pergunta = falaDoCliente(porAtendimento.get(ticket.id), repetidos).slice(
      0,
      POR_ATENDIMENTO
    );

    /* A solução é o e-mail inteiro: sem o corte, entra assinatura e expediente. */
    const resposta = corpoEscrito(ticket.solution).slice(0, POR_ATENDIMENTO);

    return [
      `## Atendimento ${indice + 1}`,
      `Assunto: ${ticket.title}`,
      pergunta ? `O que o cliente relatou: ${pergunta}` : "",
      resposta ? `Como o suporte resolveu: ${resposta}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  /*
    O cabeçalho diz o que este material é, e diz o número.
    "24 atendimentos pediram isto" é o que separa um artigo que vale escrever de
    um que atende um caso só, e o modelo não tem como saber disso pelos textos.
  */
  const cabecalho = [
    `Assunto recorrente no suporte: ${grupo.subject}`,
    `${grupo.tickets.length} atendimentos sobre isto.`,
    grupo.terms.length > 0 ? `Palavras que unem o grupo: ${grupo.terms.join(", ")}.` : "",
    escolhidos.length < grupo.tickets.length
      ? `Abaixo, os ${escolhidos.length} mais recentes, como amostra.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    material: [cabecalho, ...partes].join("\n\n").trim(),
    usados: escolhidos.length,
    total: grupo.tickets.length,
  };
}
