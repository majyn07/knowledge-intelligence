import { items, record, text } from "@/lib/shape";
import type { FollowRow } from "@/lib/supabase/types";

/** O que se pode acompanhar. Os dois que têm tela própria e ciclo de estágio. */
export const FOLLOW_KINDS = ["plan", "article"] as const;
export type FollowKind = (typeof FOLLOW_KINDS)[number];

export interface Follow {
  id: string;
  /** Quem acompanha. Vazio quando não há conta: o navegador é a pessoa. */
  personId: string;
  kind: FollowKind;
  subjectId: string;
  /**
   * O rótulo no momento em que passou a acompanhar.
   *
   * Guardado pelo mesmo motivo do histórico: o acompanhamento sobrevive à
   * exclusão do registro, e a lista continua legível em vez de mostrar um
   * identificador solto.
   */
  subjectLabel: string;
  projectId: string;
  createdAt: string;
}

export function followKey(kind: FollowKind, subjectId: string): string {
  return `${kind}:${subjectId}`;
}

export function normalizeFollow(raw: unknown): Follow {
  const value = record(raw);

  const kind = text(value.kind);

  return {
    id: text(value.id) || crypto.randomUUID(),
    personId: text(value.personId),
    kind: (FOLLOW_KINDS as readonly string[]).includes(kind) ? (kind as FollowKind) : "plan",
    subjectId: text(value.subjectId),
    subjectLabel: text(value.subjectLabel),
    projectId: text(value.projectId),
    createdAt: text(value.createdAt),
  };
}

export function parseFollows(raw: string): Follow[] {
  return items(JSON.parse(raw)).map(normalizeFollow);
}

export function toFollow(row: unknown): Follow {
  const value = record(row);

  return normalizeFollow({
    id: value.id,
    personId: value.person_id,
    kind: value.subject_kind,
    subjectId: value.subject_id,
    subjectLabel: value.subject_label,
    projectId: value.project_id,
    createdAt: value.created_at,
  });
}

export function fromFollow(follow: Follow): FollowRow {
  return {
    id: follow.id,
    person_id: follow.personId,
    subject_kind: follow.kind,
    subject_id: follow.subjectId,
    subject_label: follow.subjectLabel,
    project_id: follow.projectId,
    created_at: follow.createdAt,
  };
}

/**
 * Os acompanhamentos de uma pessoa.
 *
 * Sem conta, `personId` é vazio nos dois lados e a comparação continua
 * valendo: no modo sem servidor existe uma pessoa só, a que está no navegador.
 */
export function followsOf(follows: Follow[], personId: string): Follow[] {
  return follows.filter((follow) => follow.personId === personId);
}
