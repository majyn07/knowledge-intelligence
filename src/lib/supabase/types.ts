/**
 * Forma das tabelas, escrita à mão a partir de `supabase/migrations`.
 *
 * Escrita à mão de propósito enquanto o projeto não existe: gerar do banco
 * exige o banco. Quando ele existir, isto vira saída de `supabase gen types` e
 * a divergência entre schema e tipo deixa de ser possível.
 *
 * Nada que sai daqui é confiável sem normalizar. O tipo descreve o contrato do
 * banco; o normalizador é quem garante que o registro lido tem a forma que o
 * modelo espera — a mesma disciplina que valia para o `localStorage`.
 */

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TaxonomyCategoryRow {
  id: string;
  name: string;
  is_product: boolean;
  position: number;
}

export interface TaxonomySectionRow {
  id: string;
  category_id: string;
  name: string;
  position: number;
}

export interface TaxonomyEntryRow {
  id: string;
  list: "genres" | "opportunity_types";
  name: string;
  position: number;
}

export interface ProjectRow {
  id: string;
  name: string;
  client: string;
  description: string;
  status: string;
  product: string;
  module: string;
  goal: string;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface TicketRow {
  id: string;
  project_id: string;
  title: string;
  solution: string;
  company: string;
  occurred_on: string;
  source: unknown;
}

export interface AnalysisRow {
  id: string;
  project_id: string;
  ticket_id: string;
  result: unknown;
  created_at: string;
}

export interface PlanRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
  source: unknown;
  document: unknown;
  tasks: unknown;
  comments: unknown;
  created_at: string;
  updated_at: string;
}

export interface ArticleRow {
  id: string;
  project_id: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  section_id: string | null;
  genre_id: string | null;
  portal_article_id: string | null;
  url: string | null;
  tags: string[];
  keywords: string[];
  author: string;
  source: unknown;
  created_at: string;
  updated_at: string;
}

export interface ActivityEventRow {
  id: string;
  at: string;
  type: string;
  project_id: string;
  actor: string;
  subject: unknown;
  detail: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow> & { id: string; email: string }; Update: Partial<ProfileRow> };
      taxonomy_categories: { Row: TaxonomyCategoryRow; Insert: TaxonomyCategoryRow; Update: Partial<TaxonomyCategoryRow> };
      taxonomy_sections: { Row: TaxonomySectionRow; Insert: TaxonomySectionRow; Update: Partial<TaxonomySectionRow> };
      taxonomy_entries: { Row: TaxonomyEntryRow; Insert: TaxonomyEntryRow; Update: Partial<TaxonomyEntryRow> };
      projects: { Row: ProjectRow; Insert: ProjectRow; Update: Partial<ProjectRow> };
      tickets: { Row: TicketRow; Insert: TicketRow; Update: Partial<TicketRow> };
      analyses: { Row: AnalysisRow; Insert: AnalysisRow; Update: Partial<AnalysisRow> };
      plans: { Row: PlanRow; Insert: PlanRow; Update: Partial<PlanRow> };
      articles: { Row: ArticleRow; Insert: ArticleRow; Update: Partial<ArticleRow> };
      activity_events: { Row: ActivityEventRow; Insert: ActivityEventRow; Update: Partial<ActivityEventRow> };
    };
  };
}

/** Nomes de tabela que o tempo real acompanha. */
export const REALTIME_TABLES = [
  "taxonomy_categories",
  "taxonomy_sections",
  "taxonomy_entries",
  "projects",
  "tickets",
  "analyses",
  "plans",
  "articles",
  "activity_events",
] as const;

export type RealtimeTable = (typeof REALTIME_TABLES)[number];
