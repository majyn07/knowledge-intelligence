"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { flag, items, record, text, textList } from "@/lib/shape";
import type { Database, ProfileRow } from "@/lib/supabase/types";
import type { Person, Team } from "@/models/Assignment";

type Client = SupabaseClient<Database>;

/**
 * Pessoas e equipes vindas do servidor.
 *
 * A pessoa é o perfil de quem entrou — não há cadastro manual. A defesa de
 * forma continua valendo: o que chega da rede não tem tipo garantido em tempo
 * de execução, e uma coluna adicionada depois não existe nos registros de
 * antes.
 */

export function toPerson(raw: unknown): Person {
  const row = record(raw);

  return {
    id: text(row.id),
    name: text(row.name),
    role: text(row.role),
    email: text(row.email),
    teamId: text(row.team_id),
    avatarUrl: text(row.avatar_url),
    // Perfis criados antes da coluna existir não têm o campo; ativo é o padrão.
    isActive: row.is_active === undefined ? true : flag(row.is_active),
  };
}

export function toTeam(raw: unknown): Team {
  const row = record(raw);

  return {
    id: text(row.id),
    name: text(row.name),
    order: typeof row.position === "number" ? row.position : 0,
    // Equipes gravadas antes da coluna existir não têm o campo.
    categoryIds: textList(row.category_ids),
  };
}

export async function readPeopleAndTeams(
  client: Client
): Promise<{ people: Person[]; teams: Team[] }> {
  const [profiles, teams] = await Promise.all([
    client.from("profiles").select("*"),
    client.from("teams").select("*"),
  ]);

  const failure = profiles.error ?? teams.error;
  if (failure) throw new Error(failure.message);

  return {
    people: items(profiles.data ?? [])
      .map(toPerson)
      .filter((person) => person.id !== "")
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    teams: items(teams.data ?? [])
      .map(toTeam)
      .filter((team) => team.id !== "")
      .sort((a, b) => a.order - b.order),
  };
}

/**
 * Atualiza o próprio perfil.
 *
 * Só o próprio: as políticas do banco permitem escrever em qualquer linha,
 * porque não há papéis — mas editar o nome ou a equipe de outra pessoa não é
 * uma operação que o produto ofereça, e a interface não expõe caminho para
 * isso. Quem entra ajusta os próprios dados.
 */
export async function updateProfile(
  client: Client,
  id: string,
  fields: { name?: string; role?: string; teamId?: string; avatarUrl?: string }
): Promise<void> {
  const payload: Partial<ProfileRow> = {};

  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.role !== undefined) payload.role = fields.role.trim();
  if (fields.teamId !== undefined) payload.team_id = fields.teamId || null;
  // Vazio limpa o retrato, e limpar é uma operação legítima.
  if (fields.avatarUrl !== undefined) payload.avatar_url = fields.avatarUrl || null;

  if (Object.keys(payload).length === 0) return;

  const { error } = await client.from("profiles").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Desativa em vez de remover, para o histórico não apontar para o vazio. */
export async function setPersonActive(
  client: Client,
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await client.from("profiles").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Define por quais categorias do portal a equipe responde.
 *
 * Sem servidor não há o que gravar: as equipes existem nos dois modos, mas a
 * edição do cadastro é uma operação compartilhada, e no navegador ela não
 * teria com quem ser compartilhada.
 */
export async function setTeamCategories(
  client: Client,
  id: string,
  categoryIds: string[]
): Promise<void> {
  const { error } = await client
    .from("teams")
    .update({ category_ids: categoryIds })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
