import { articleVocabulary } from "@/features/library/content/articleTerms";
import { jaccard, semCorrespondencia, termsOf } from "@/lib/vocabulary";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

/**
 * Quais atendimentos valem uma análise.
 *
 * Este é o problema que só existe em escala. Com três atendimentos na tela,
 * analisa-se os três. Com mil, analisar tudo custaria mil chamadas de IA e
 * semanas de revisão humana, e a maior parte delas responderia "isto já está
 * documentado".
 *
 * A pergunta certa não é "o que este atendimento diz", é **"o que muitos
 * clientes perguntam e o acervo não responde"**. É o levantamento manual que
 * originou o produto, e é a única forma dele que precisa dos dois lados: sem
 * atendimento não há demanda, sem acervo não há como saber o que falta.
 *
 * Tudo aqui é **calculado**. Agrupar por vocabulário em comum não é dizer que
 * dois atendimentos são a mesma dúvida, é dizer que usam as mesmas palavras
 * incomuns, e a tela diz isso. Concluir que são a mesma dúvida exige ler, e
 * ler é o que a análise faz depois, sobre a fila que sai daqui.
 */

/**
 * Quanto vocabulário dois atendimentos precisam dividir para entrarem no mesmo
 * grupo.
 *
 * Mais baixo que o limiar de sobreposição entre artigos, e de propósito: o
 * texto de um atendimento é curto (assunto e solução), então o vocabulário em
 * comum entre dois que falam do mesmo problema é naturalmente menor que entre
 * dois artigos sobre o mesmo assunto.
 */
export const LIMIAR_DE_GRUPO = 0.28;

/**
 * Acima disto o agrupamento aos pares fica caro e é anunciado, não pulado.
 *
 * Mil atendimentos são quinhentas mil comparações, o que roda em fração de
 * segundo. O teto existe para o caso em que alguém importa o histórico inteiro
 * do suporte: número parcial apresentado como completo é pior que número com
 * ressalva.
 */
export const MAXIMO_DE_ATENDIMENTOS = 4_000;

/** Abaixo disto o atendimento não tem texto suficiente para agrupar por palavra. */
const TERMOS_MINIMOS = 3;

export interface TriageGroup {
  id: string;
  /** O assunto do atendimento mais antigo do grupo, que é o rótulo. */
  subject: string;
  tickets: Ticket[];
  /** As palavras que unem o grupo, das mais frequentes para as menos. */
  terms: string[];
  /**
   * Quanto do vocabulário do grupo o acervo publicado já cobre, de 0 a 1.
   *
   * Não é "existe artigo sobre isto": é quanto das palavras que descrevem a
   * dúvida aparecem em algum artigo publicado. Baixo significa que o assunto
   * não está no acervo com estas palavras, e é aí que quem procura não acha.
   */
  coverage: number;
  /** A força do sinal: quantos perguntaram, contra o quanto já está escrito. */
  score: number;
}

export interface TriageResult {
  groups: TriageGroup[];
  /** Atendimentos que não entraram na fila, e por quê. */
  ignorados: {
    semSolucao: number;
    jaVirouArtigo: number;
    jaAnalisado: number;
    semTextoSuficiente: number;
  };
  /** Quando o acervo passou do teto e a comparação não foi feita. */
  excedeuTeto: boolean;
}

interface TicketComTermos {
  ticket: Ticket;
  termos: Set<string>;
}

/** O que um atendimento diz, para efeito de comparação. */
function corpusDo(ticket: Ticket): string {
  return semCorrespondencia(`${ticket.title} ${ticket.solution}`);
}

/** O vocabulário de um atendimento, já sem o que a correspondência traz junto. */
export function ticketTerms(ticket: Ticket): string[] {
  return termsOf(corpusDo(ticket));
}

/**
 * O vocabulário de tudo que está publicado, num conjunto só.
 *
 * Um passo sobre o acervo, e depois cada grupo se mede contra ele por
 * interseção. Rodar a busca por grupo custaria varrer os 1.822 artigos uma vez
 * por grupo, que é o mesmo trabalho repetido centenas de vezes.
 */
function vocabularioPublicado(articles: KnowledgeArticle[]): Set<string> {
  const todas = new Set<string>();

  for (const article of articles) {
    if (article.status !== "published") continue;

    for (const palavra of articleVocabulary(article)) todas.add(palavra);
  }

  return todas;
}

function cobertura(termos: Set<string>, acervo: Set<string>): number {
  if (termos.size === 0) return 1;

  let cobertos = 0;
  for (const palavra of termos) if (acervo.has(palavra)) cobertos += 1;

  return cobertos / termos.size;
}

/**
 * A fila de triagem.
 *
 * `analisados` são os identificadores de atendimento que já têm análise: quem
 * já foi lido não volta para a fila de leitura.
 */
export function triageTickets(
  tickets: Ticket[],
  articles: KnowledgeArticle[],
  analisados: Set<string>,
  limiar = LIMIAR_DE_GRUPO
): TriageResult {
  const ignorados = {
    semSolucao: 0,
    jaVirouArtigo: 0,
    jaAnalisado: 0,
    semTextoSuficiente: 0,
  };

  if (tickets.length > MAXIMO_DE_ATENDIMENTOS) {
    return { groups: [], ignorados, excedeuTeto: true };
  }

  const comArtigoDeOrigem = new Set(
    articles.map((article) => article.source?.ticketId).filter((id): id is string => !!id)
  );

  const candidatos: TicketComTermos[] = [];

  for (const ticket of tickets) {
    /*
      Atendimento sem solução não tem resposta para virar artigo. Ele pode ser
      dúvida recorrente e ainda assim não há o que escrever: escrever exige
      saber a resposta, e quem sabe é quem resolveu.
    */
    if (ticket.solution.trim() === "") {
      ignorados.semSolucao += 1;
      continue;
    }

    if (comArtigoDeOrigem.has(ticket.id)) {
      ignorados.jaVirouArtigo += 1;
      continue;
    }

    if (analisados.has(ticket.id)) {
      ignorados.jaAnalisado += 1;
      continue;
    }

    const termos = new Set(ticketTerms(ticket));

    if (termos.size < TERMOS_MINIMOS) {
      ignorados.semTextoSuficiente += 1;
      continue;
    }

    candidatos.push({ ticket, termos });
  }

  const acervo = vocabularioPublicado(articles);
  const grupos: TicketComTermos[][] = [];
  const usados = new Set<string>();

  /*
    Agrupamento guloso: cada atendimento ainda solto vira semente de um grupo e
    puxa os parecidos. Não é o agrupamento ótimo, e não precisa ser — o
    resultado é uma fila de leitura para gente, não uma classificação final.
    O ótimo custaria muito mais e mudaria a ordem, não o conteúdo.
  */
  for (const semente of candidatos) {
    if (usados.has(semente.ticket.id)) continue;

    usados.add(semente.ticket.id);
    const grupo = [semente];

    for (const outro of candidatos) {
      if (usados.has(outro.ticket.id)) continue;
      if (jaccard(semente.termos, outro.termos) < limiar) continue;

      usados.add(outro.ticket.id);
      grupo.push(outro);
    }

    grupos.push(grupo);
  }

  const groups = grupos.map((grupo) => {
    const contagem = new Map<string, number>();

    for (const { termos } of grupo) {
      for (const palavra of termos) contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
    }

    /* O que só um dos atendimentos disse não descreve o grupo. */
    const doGrupo =
      grupo.length === 1
        ? new Set(grupo[0].termos)
        : new Set([...contagem].filter(([, n]) => n > 1).map(([palavra]) => palavra));

    const termos = [...doGrupo].sort(
      (a, b) => (contagem.get(b) ?? 0) - (contagem.get(a) ?? 0) || a.localeCompare(b)
    );

    const ordenados = [...grupo].sort((a, b) => a.ticket.date.localeCompare(b.ticket.date));
    const cobre = cobertura(doGrupo, acervo);

    return {
      id: `triagem:${ordenados[0].ticket.id}`,
      subject: ordenados[0].ticket.title,
      tickets: ordenados.map((item) => item.ticket),
      terms: termos.slice(0, 12),
      coverage: cobre,
      /*
        Quantos perguntaram, contra o quanto já está escrito. Dez atendimentos
        sobre algo que o acervo não menciona vence um atendimento sobre algo
        igualmente ausente, e vence dez sobre algo já documentado.
      */
      score: grupo.length * (1 - cobre),
    };
  });

  groups.sort((a, b) => b.score - a.score || b.tickets.length - a.tickets.length);

  return { groups, ignorados, excedeuTeto: false };
}
