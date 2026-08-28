/**
 * Exclusão reversível.
 *
 * O registro sai da vista e continua existindo. Com dado compartilhado isso
 * deixou de ser conforto e virou necessidade: quem apaga apaga para catorze
 * pessoas, e o diálogo de confirmação é a única barreira, que quem clica
 * rápido não lê.
 *
 * Sem prazo de expurgo automático, de propósito. Apagar trabalho sozinho, num
 * horário que ninguém escolheu, é o mesmo problema que a exclusão direta tem.
 * Esvaziar a lixeira é ato de alguém, e diz o que vai levar antes.
 */

/** Tudo que pode ir para a lixeira carrega isto. */
export interface Trashable {
  /** ISO de quando foi excluído. Vazio ou ausente é "vivo". */
  deletedAt?: string;
}

export function isTrashed<T extends Trashable>(item: T): boolean {
  return (item.deletedAt ?? "") !== "";
}

/** O que está em uso. É o que quase toda tela quer. */
export function alive<T extends Trashable>(items: T[]): T[] {
  return items.filter((item) => !isTrashed(item));
}

/** O que está na lixeira, do mais recente para o mais antigo. */
export function trashed<T extends Trashable>(items: T[]): T[] {
  return items
    .filter(isTrashed)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

/**
 * O que ficaria apontando para o vazio se este registro sumisse.
 *
 * Não impede a exclusão: a equipe é treinada e decide, como em publicar. Mas
 * o número aparece antes do clique: "excluir este atendimento" e "excluir este
 * atendimento, a análise dele e o plano que ele originou" são decisões
 * diferentes, e hoje a tela apresentava as duas do mesmo jeito.
 */
export interface Orphans {
  analyses: number;
  plans: number;
  articles: number;
  total: number;
}

export function countOrphans(input: {
  analyses: { ticketId?: string; projectId?: string }[];
  plans: { source?: { ticketId?: string }; projectId?: string }[];
  articles: { source?: { ticketId?: string }; projectId?: string }[];
  of: { kind: "ticket" | "project"; id: string };
}): Orphans {
  const { analyses, plans, articles, of } = input;

  const matches = (registro: { ticketId?: string; projectId?: string; source?: { ticketId?: string } }) =>
    of.kind === "project"
      ? registro.projectId === of.id
      : (registro.ticketId ?? registro.source?.ticketId) === of.id;

  const contagem = {
    analyses: analyses.filter(matches).length,
    plans: plans.filter(matches).length,
    articles: articles.filter(matches).length,
  };

  return { ...contagem, total: contagem.analyses + contagem.plans + contagem.articles };
}
