/**
 * O que sobrou de uma edição que nunca foi salva.
 *
 * O produto já avisa antes de descartar e guarda na lixeira o que é excluído,
 * mas o texto que ainda não foi gravado não tinha rede nenhuma: fechar a aba no
 * meio de um artigo longo perdia tudo, e o aviso do navegador só serve para
 * quem está lá para lê-lo. Queda de energia, aba fechada por engano e
 * navegador reiniciado não perguntam nada.
 *
 * Fica **no navegador**, mesmo no modo compartilhado. Um texto pela metade
 * subindo para o servidor ficaria visível para a equipe antes de a pessoa
 * decidir mostrar, e a decisão de mostrar é dela. É a mesma razão de "vistos
 * recentemente" não sincronizar.
 *
 * Este módulo é puro: guarda a forma e compara. Quem escreve é o hook.
 */

export interface RecoveredDraft {
  /** Qual registro estava em edição. Vazio quando era um artigo novo. */
  id: string;
  title: string;
  summary: string;
  content: string;
  /** Instante ISO da última digitação. */
  at: string;
}

export interface RecoverableFields {
  title: string;
  summary: string;
  content: string;
}

/** Uma chave por registro: duas edições abertas não podem se sobrescrever. */
export function recoveryKey(prefix: string, id: string): string {
  return `${prefix}:${id || "novo"}`;
}

export function isEmptyDraft(fields: RecoverableFields): boolean {
  return (
    fields.title.trim() === "" &&
    fields.summary.trim() === "" &&
    fields.content.trim() === ""
  );
}

/**
 * Vale oferecer a recuperação?
 *
 * Só quando o que ficou guardado **difere** do que o registro tem hoje. Igual
 * significa que a gravação aconteceu e o resto é sobra; oferecer restaurar ali
 * seria pedir uma decisão sobre nada, e ensinar a pessoa a ignorar o aviso,
 * que é como um aviso deixa de funcionar quando importa.
 *
 * Vazio também não vale: abrir o formulário, digitar e apagar não é trabalho
 * a recuperar.
 */
export function shouldOffer(
  recovered: RecoveredDraft | null,
  current: RecoverableFields
): boolean {
  if (!recovered) return false;
  if (isEmptyDraft(recovered)) return false;

  return (
    recovered.title !== current.title ||
    recovered.summary !== current.summary ||
    recovered.content !== current.content
  );
}

/**
 * Lê o que estava guardado, recusando o que não tem a forma esperada.
 *
 * O registro pode ter sido gravado por uma versão anterior do produto. Como em
 * todo o resto, o que não tem forma vira ausência, e não uma tela quebrada na
 * abertura de um formulário.
 */
export function parseRecovered(raw: unknown): RecoveredDraft | null {
  if (typeof raw !== "object" || raw === null) return null;

  const record = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : "");

  const at = text(record.at);
  if (at === "") return null;

  return {
    id: text(record.id),
    title: text(record.title),
    summary: text(record.summary),
    content: text(record.content),
    at,
  };
}
