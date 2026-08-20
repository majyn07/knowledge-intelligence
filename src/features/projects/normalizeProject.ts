import { date, items, oneOf, record, text } from "@/lib/shape";
import type { Project, ProjectStatus } from "@/models/Project";

const STATUSES: readonly ProjectStatus[] = ["active", "inactive", "archived"];

/**
 * Garante a forma do projeto.
 *
 * Faltava: o projeto era lido do armazenamento sem passar por normalizador
 * nenhum, ao contrário de artigo, plano e atendimento. A regra vale para
 * todos, e agora vale mesmo — com o dado vindo da rede, a chance de ler um
 * registro de formato diferente só aumenta.
 */
export function normalizeProject(raw: unknown): Project {
  const value = record(raw);

  return {
    id: text(value.id) || crypto.randomUUID(),
    name: text(value.name),
    client: text(value.client),
    description: text(value.description),
    status: oneOf(value.status, STATUSES, "active"),
    product: text(value.product),
    module: text(value.module),
    goal: text(value.goal),
    owner: text(value.owner),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  };
}

export function parseProjects(raw: string): Project[] {
  return items(JSON.parse(raw)).map(normalizeProject);
}
