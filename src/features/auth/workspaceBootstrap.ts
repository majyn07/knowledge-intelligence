"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseEvents } from "@/features/activities/normalizeEvent";
import { parseAnalyses } from "@/features/analysis/normalizeAnalysis";
import { parseConversations, parseTickets } from "@/features/analysis/normalizeSupport";
import { parseArticles } from "@/features/library/normalizeArticle";
import { fromFollow, parseFollows } from "@/features/people/follows";
import { defaultPanels } from "@/features/metrics/panels/defaultPanels";
import { fromPanel, parsePanels } from "@/features/metrics/panels/normalizePanel";
import { parsePlans } from "@/features/plans/normalizePlan";
import { parseProjects } from "@/features/projects/normalizeProject";
import { projectService } from "@/features/projects/services/ProjectService";
import { ticketRepository } from "@/features/analysis/repositories/ticketRepository";
import { articleService } from "@/features/library/services/articleService";
import { planWorkspaceMock } from "@/features/plans/mock/planWorkspace";
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
  panels: number;
  follows: number;
}

/**
 * O que existe no navegador desta pessoa.
 *
 * Cada coleção passa pelo normalizador da própria feature: um registro
 * ilegível não deve impedir a migração das outras, e um registro de formato
 * antigo sobe corrigido em vez de subir quebrado.
 */
function readLocal(taxonomy: Taxonomy) {
  /*
    Chave ausente cai na semente, e não em lista vazia.

    O produto mostra a semente enquanto ninguém editou aquela coleção — nunca
    chega a gravar nada. Tratar isso como "não há nada" quebraria o envio: os
    atendimentos, planos e artigos da semente referenciam os projetos dela por
    chave estrangeira, e subiriam apontando para projeto inexistente.

    O critério é o que a pessoa vê na tela, não o que por acaso foi gravado.
  */
  const parse = <T>(key: string, parser: (raw: string) => T[], seed: T[] = []): T[] => {
    const raw = readRaw(key);
    if (raw === null) return seed;

    try {
      return parser(raw);
    } catch {
      return seed;
    }
  };

  return {
    projects: parse(STORAGE_KEYS.projects, parseProjects, projectService.getSeed()),
    tickets: parse(STORAGE_KEYS.tickets, parseTickets, ticketRepository.getSeedTickets()),
    conversations: parse(
      STORAGE_KEYS.conversations,
      parseConversations,
      ticketRepository.getSeedConversations()
    ),
    analyses: parse(STORAGE_KEYS.analyses, parseAnalyses),
    plans: parse(STORAGE_KEYS.plans, parsePlans, planWorkspaceMock),
    articles: parse(
      STORAGE_KEYS.articles,
      (raw) => parseArticles(raw, taxonomy),
      articleService.getSeed()
    ),
    events: parse(STORAGE_KEYS.activity, parseEvents),
    panels: parse(STORAGE_KEYS.panels, parsePanels, defaultPanels),
    follows: parse(STORAGE_KEYS.follows, parseFollows),
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
    panels: local.panels.length,
    follows: local.follows.length,
  };
}

/** Tabela do banco correspondente a cada coleção. */
const tables: Record<keyof LocalWorkspace, keyof Database["public"]["Tables"]> = {
  projects: "projects",
  tickets: "tickets",
  conversations: "support_conversations",
  analyses: "analyses",
  plans: "plans",
  articles: "articles",
  events: "activity_events",
  panels: "dashboard_panels",
  follows: "follows",
};

/**
 * Quanto o servidor tem de cada coleção.
 *
 * Conta **todas**, e não só projetos. A primeira versão perguntava apenas se
 * havia projeto, e isso escondeu uma migração que subiu pela metade: os planos
 * falharam, o que vinha depois deles nem tentou, e como projetos já existia a
 * tela nunca mais voltou. O conteúdo ficou preso no navegador sem caminho de
 * volta.
 */
export async function serverCounts(client: Client): Promise<LocalWorkspace> {
  const entries = Object.entries(tables) as [keyof LocalWorkspace, keyof Database["public"]["Tables"]][];

  const counted = await Promise.all(
    entries.map(async ([key, table]) => {
      const { count, error } = await client
        .from(table)
        .select("id", { count: "exact", head: true });

      if (error) throw new Error(`${table}: ${error.message}`);

      return [key, count ?? 0] as const;
    })
  );

  return Object.fromEntries(counted) as unknown as LocalWorkspace;
}

/**
 * O que existe aqui e não existe lá.
 *
 * Só conta como pendente a coleção que está vazia no servidor: se ela já tem
 * qualquer linha, quem mandou foi alguém, e sobrescrever com a cópia deste
 * navegador seria descartar trabalho alheio.
 */
export function pendingCollections(
  local: LocalWorkspace,
  server: LocalWorkspace
): (keyof LocalWorkspace)[] {
  return (Object.keys(tables) as (keyof LocalWorkspace)[]).filter(
    (key) => local[key] > 0 && server[key] === 0
  );
}

/**
 * Envia o conteúdo local para o servidor.
 *
 * A ordem não é arbitrária e não pode ser paralelizada: atendimento referencia
 * projeto, conversa referencia atendimento, e artigo referencia projeto e
 * seção. Subir tudo de uma vez produziria violação de chave estrangeira num
 * caminho que ninguém entenderia.
 *
 * Envia tudo, mesmo o que já subiu: a gravação é por identificador, então
 * reenviar é inofensivo — e garante que os registros referenciados existam
 * antes de quem os referencia, inclusive quando só falta uma parte.
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

  // Painéis não referenciam ninguém, então ficam por último sem consequência.
  await send("dashboard_panels", local.panels.map(fromPanel));
  await send("follows", local.follows.map(fromFollow));
}
