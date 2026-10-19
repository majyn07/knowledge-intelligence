"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { flag, items, record, text, textList } from "@/lib/shape";
import type { Database, ProfileRow } from "@/lib/supabase/types";
import type { Person, Team } from "@/models/Assignment";

type Client = SupabaseClient<Database>;

/**
 * Pessoas e equipes vindas do servidor.
 *
 * A pessoa é o perfil de quem entrou, não há cadastro manual. A defesa de
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
    // Ausente é "não": administrador se concede, nunca se presume.
    isAdmin: flag(row.is_admin),
    ...noticesSeenAt(row.notices_seen_at),
  };
}

/**
 * A última visita aos avisos, no mesmo formato do resto.
 *
 * O Postgres devolve `2026-10-19 12:00:00+00` e o produto grava `…Z`, e a
 * central compara **texto**: sem converter, um evento das 12h01 pareceria mais
 * antigo que uma visita às 12h00, porque `+` vem antes de `Z` na tabela de
 * caracteres. Data ilegível é como nunca ter visto: melhor um aviso a mais que
 * um a menos.
 */
function noticesSeenAt(valor: unknown): { noticesSeenAt?: string } {
  const instante = new Date(text(valor));

  return Number.isNaN(instante.getTime()) || text(valor) === ""
    ? {}
    : { noticesSeenAt: instante.toISOString() };
}

/**
 * Grava quando a pessoa fechou a central.
 *
 * Coluna própria, e não `updateProfile`: aquela avisa "perfil atualizado" a
 * cada gravação, e fechar a central não é editar o perfil.
 */
export async function setNoticesSeenAt(client: Client, id: string, iso: string): Promise<void> {
  const { error } = await client.from("profiles").update({ notices_seen_at: iso }).eq("id", id);
  if (error) throw new Error(error.message);
}

export function toTeam(raw: unknown): Team {
  const row = record(raw);

  return {
    id: text(row.id),
    name: text(row.name),
    order: typeof row.position === "number" ? row.position : 0,
    // Equipes gravadas antes da coluna existir não têm o campo.
    categoryIds: textList(row.category_ids),
    sectionIds: textList(row.section_ids),
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
 * Atualiza um perfil.
 *
 * Quem pode escrever em qual linha é decidido pelo **banco**, e não por esta
 * função: a política permite o próprio perfil, ou qualquer um se quem chama for
 * administrador. Repetir a regra aqui criaria duas respostas para a mesma
 * pergunta, e a do banco é a que vale mesmo se alguém chamar por fora da tela.
 */
export async function updateProfile(
  client: Client,
  id: string,
  fields: { name?: string; role?: string; teamId?: string; avatarUrl?: string; isAdmin?: boolean }
): Promise<void> {
  const payload: Partial<ProfileRow> = {};

  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.role !== undefined) payload.role = fields.role.trim();
  if (fields.teamId !== undefined) payload.team_id = fields.teamId || null;
  // Vazio limpa o retrato, e limpar é uma operação legítima.
  if (fields.avatarUrl !== undefined) payload.avatar_url = fields.avatarUrl || null;
  if (fields.isAdmin !== undefined) payload.is_admin = fields.isAdmin;

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
export async function setTeamScope(
  client: Client,
  id: string,
  ids: { categoryIds?: string[]; sectionIds?: string[] }
): Promise<void> {
  const payload: { category_ids?: string[]; section_ids?: string[] } = {};

  if (ids.categoryIds !== undefined) payload.category_ids = ids.categoryIds;
  if (ids.sectionIds !== undefined) payload.section_ids = ids.sectionIds;

  if (Object.keys(payload).length === 0) return;

  const { error } = await client
    .from("teams")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
