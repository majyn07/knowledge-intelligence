import { items, oneOf, record, text } from "@/lib/shape";
import {
  ACTIVITY_SUBJECT_KINDS,
  ACTIVITY_TYPES,
  type ActivityEvent,
} from "@/models/ActivityEvent";

/**
 * Garante a forma do evento.
 *
 * O histórico é acrescentado e nunca editado, então um registro gravado por
 * uma versão anterior fica lá para sempre — e vai ser lido por versões que não
 * conhecem o formato dele. Tipo ou assunto desconhecido não derruba a lista:
 * cai no valor mais genérico e o evento continua visível, porque perder um
 * fato do histórico é pior que exibi-lo com rótulo impreciso.
 */
export function normalizeEvent(raw: unknown): ActivityEvent {
  const value = record(raw);
  const subject = record(value.subject);

  return {
    id: text(value.id) || crypto.randomUUID(),
    at: text(value.at),
    type: oneOf(value.type, ACTIVITY_TYPES, "project_updated"),
    projectId: text(value.projectId),
    actor: text(value.actor),
    subject: {
      kind: oneOf(subject.kind, ACTIVITY_SUBJECT_KINDS, "project"),
      id: text(subject.id),
      label: text(subject.label),
    },
    detail: text(value.detail),
  };
}

export function parseEvents(raw: string): ActivityEvent[] {
  return items(JSON.parse(raw)).map(normalizeEvent);
}
