"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseEvents } from "@/features/activities/normalizeEvent";
import { parseAnalyses } from "@/features/analysis/normalizeAnalysis";
import { parseConversations, parseTickets } from "@/features/analysis/normalizeSupport";
import { parseArticles } from "@/features/library/normalizeArticle";
import { parsePlans } from "@/features/plans/normalizePlan";
import { parseProjects } from "@/features/projects/normalizeProject";
import { readRaw, STORAGE_KEYS } from "@/lib/storage";
import {
  fromAnalysis,
  fromConversation,
  fromEvent,
  fromPlan,
  fromProject,
  fromTicket,
} from "@/lib/supabase/domainRows";
import { fromArticle } from "@/lib/supabase/rows";
import type { Database } from "@/lib/supabase/types";
import type { Taxonomy } from "@/models/Taxonomy";

type Client = SupabaseClient<Database>;

export interface LocalWorkspace {
  projects: number;
  tickets: number;
  conversations: number;
  analyses: number;
  plans: number;
  articles: number;
  events: number;
}

/**
 * O que existe no navegador desta pessoa.
 *
 * Cada coleção passa pelo normalizador da própria feature: um registro
 * ilegível não deve impedir a migração das outras, e um registro de formato
 * antigo sobe corrigido em vez de subir quebrado.
 */
function readLocal(taxonomy: Taxonomy) {
  const parse = <T>(key: string, parser: (raw: string) => T[]): T[] => {
    const raw = readRaw(key);
    if (raw === null) return [];

    try {
      return parser(raw);
    } catch {
      return [];
    }
  };

  return {
    projects: parse(STORAGE_KEYS.projects, parseProjects),
    tickets: parse(STORAGE_KEYS.tickets, parseTickets),
    conversations: parse(STORAGE_KEYS.conversations, parseConversations),
    analyses: parse(STORAGE_KEYS.analyses, parseAnalyses),
    plans: parse(STORAGE_KEYS.plans, parsePlans),
    articles: parse(STORAGE_KEYS.articles, (raw) => parseArticles(raw, taxonomy)),
    events: parse(STORAGE_KEYS.activity, parseEvents),
  };
}

export function countLocal(taxonomy: Taxonomy): LocalWorkspace {
  const local = readLocal(taxonomy);

  return {
    projects: local.projects.length,
    tickets: local.tickets.length,
    conversations: local.conversations.length,
    analyses: local.analyses.length,
    plans: local.plans.length,
    articles: local.articles.length,
    events: local.events.length,
  };
}

/** O servidor já tem conteúdo? Se sim, não há o que migrar. */
export async function serverHasContent(client: Client): Promise<boolean> {
  const { count, error } = await client
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(error.message);

  return (count ?? 0) > 0;
}

/**
 * Envia o conteúdo local para o servidor.
 *
 * A ordem não é arbitrária e não pode ser paralelizada: atendimento referencia
 * projeto, conversa referencia atendimento, e artigo referencia projeto e
 * seção. Subir tudo de uma vez produziria violação de chave estrangeira num
 * caminho que ninguém entenderia.
 *
 * O que já está no servidor não é tocado: esta função só roda quando ele está
 * vazio, e quem chega depois lê o que o primeiro enviou em vez de sobrescrever
 * com a própria cópia.
 */
export async function pushLocalWorkspace(
  client: Client,
  taxonomy: Taxonomy
): Promise<void> {
  const local = readLocal(taxonomy);

  const send = async (
    table: keyof Database["public"]["Tables"],
    rows: Record<string, unknown>[]
  ) => {
    if (rows.length === 0) return;

    const alvo = client.from(table) as unknown as {
      upsert: (payload: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    };

    const { error } = await alvo.upsert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  await send("projects", local.projects.map(fromProject));
  await send("tickets", local.tickets.map(fromTicket));
  await send("support_conversations", local.conversations.map(fromConversation));
  await send("analyses", local.analyses.map(fromAnalysis));
  await send("plans", local.plans.map(fromPlan));
  await send("articles", local.articles.map(fromArticle));
  await send("activity_events", local.events.map(fromEvent));
}
