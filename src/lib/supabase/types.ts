/**
 * Forma das tabelas, escrita à mão a partir de `supabase/migrations`.
 *
 * Escrita à mão de propósito enquanto o projeto não existe: gerar do banco
 * exige o banco. Quando ele existir, isto vira saída de `supabase gen types` e
 * a divergência entre schema e tipo deixa de ser possível.
 *
 * Nada que sai daqui é confiável sem normalizar. O tipo descreve o contrato do
 * banco; o normalizador é quem garante que o registro lido tem a forma que o
 * modelo espera: a mesma disciplina que valia para o `localStorage`.
 */

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  team_id: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
};

export type DashboardPanelRow = {
  id: string;
  title: string;
  source: string;
  breakdown: string;
  /** Segunda quebra. Nulo é o normal: o cruzamento é a exceção. */
  breakdown_2: string | null;
  visual: string;
  /** Nulo é "desde o início", e não campo por preencher. */
  window_days: number | null;
  stage: string | null;
  scoped_to_project: boolean;
  position: number;
};

export type FollowRow = {
  id: string;
  person_id: string;
  subject_kind: string;
  subject_id: string;
  subject_label: string;
  project_id: string;
  created_at: string;
};

export type SavedViewRow = {
  id: string;
  name: string;
  screen: string;
  search: string;
  status: string;
  category_id: string;
  sort_column: string;
  sort_direction: string;
  columns: string[];
  position: number;
};

export type TeamRow = {
  id: string;
  name: string;
  position: number;
  /** Categorias do portal pelas quais a equipe responde. */
  category_ids: string[];
  /** Seções. Mais específicas que a categoria, e decidem primeiro. */
  section_ids: string[];
};

export type TaxonomyCategoryRow = {
  id: string;
  name: string;
  is_product: boolean;
  position: number;
};

export type TaxonomySectionRow = {
  id: string;
  category_id: string;
  name: string;
  position: number;
};

export type TaxonomyEntryRow = {
  id: string;
  list: "genres" | "opportunity_types";
  name: string;
  position: number;
};

export type ProjectRow = {
  /** ISO de quando foi para a lixeira. Nulo é "em uso". */
  deleted_at: string | null;
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
};

export type TicketRow = {
  /** ISO de quando foi para a lixeira. Nulo é "em uso". */
  deleted_at: string | null;
  id: string;
  project_id: string;
  title: string;
  solution: string;
  company: string;
  occurred_on: string;
  source: unknown;
};

export type AnalysisRow = {
  /** ISO de quando foi para a lixeira. Nulo é "em uso". */
  deleted_at: string | null;
  id: string;
  project_id: string;
  ticket_id: string;
  result: unknown;
  created_at: string;
};

export type PlanRow = {
  /** ISO de quando foi para a lixeira. Nulo é "em uso". */
  deleted_at: string | null;
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
};

export type ArticleRow = {
  /** ISO de quando foi para a lixeira. Nulo é "em uso". */
  deleted_at: string | null;
  /** `markdown` ou `html`. Declarado, para nunca haver conversão. */
  content_format: string;
  /** A próxima versão, quando existe. Nulo é o normal. */
  draft: unknown;
  id: string;
  /** Nulo é o normal: o artigo do acervo é do hub, não de uma iniciativa. */
  project_id: string | null;
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
};

export type SupportConversationRow = {
  id: string;
  ticket_id: string;
  messages: unknown;
  source: unknown;
};

export type ActivityEventRow = {
  id: string;
  at: string;
  type: string;
  project_id: string;
  actor: string;
  subject: unknown;
  detail: string;
};

/**
 * Forma que o cliente tipado do Supabase espera. `Relationships`, `Views`,
 * `Functions`, `Enums` e `CompositeTypes` são obrigatórios mesmo vazios:
 * sem eles o tipo da linha esperada em `insert` colapsa para `never`.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; email: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      taxonomy_categories: {
        Row: TaxonomyCategoryRow;
        Insert: TaxonomyCategoryRow;
        Update: Partial<TaxonomyCategoryRow>;
        Relationships: [];
      };
      taxonomy_sections: {
        Row: TaxonomySectionRow;
        Insert: TaxonomySectionRow;
        Update: Partial<TaxonomySectionRow>;
        Relationships: [];
      };
      taxonomy_entries: {
        Row: TaxonomyEntryRow;
        Insert: TaxonomyEntryRow;
        Update: Partial<TaxonomyEntryRow>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectRow;
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: TicketRow;
        Update: Partial<TicketRow>;
        Relationships: [];
      };
      analyses: {
        Row: AnalysisRow;
        Insert: AnalysisRow;
        Update: Partial<AnalysisRow>;
        Relationships: [];
      };
      plans: {
        Row: PlanRow;
        Insert: PlanRow;
        Update: Partial<PlanRow>;
        Relationships: [];
      };
      articles: {
        Row: ArticleRow;
        Insert: ArticleRow;
        Update: Partial<ArticleRow>;
        Relationships: [];
      };
      activity_events: {
        Row: ActivityEventRow;
        Insert: ActivityEventRow;
        Update: Partial<ActivityEventRow>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: TeamRow;
        Update: Partial<TeamRow>;
        Relationships: [];
      };
      saved_views: {
        Row: SavedViewRow;
        Insert: SavedViewRow;
        Update: Partial<SavedViewRow>;
        Relationships: [];
      };
      follows: {
        Row: FollowRow;
        Insert: FollowRow;
        Update: Partial<FollowRow>;
        Relationships: [];
      };
      dashboard_panels: {
        Row: DashboardPanelRow;
        Insert: DashboardPanelRow;
        Update: Partial<DashboardPanelRow>;
        Relationships: [];
      };
      support_conversations: {
        Row: SupportConversationRow;
        Insert: SupportConversationRow;
        Update: Partial<SupportConversationRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

/**
 * Configuração que vale para a equipe, e não para uma máquina.
 *
 * Tema e forma da lista ficam no navegador porque são preferência de quem está
 * ali. Isto é o contrário: decide se o produto fala com o servidor do suporte, e
 * essa decisão é uma só para catorze pessoas.
 *
 * **Fica fora do mapa `Tables` de propósito.** Declará-la ali é a décima sexta
 * tabela, e o genérico da Supabase estoura o limite de inferência do
 * TypeScript: todas as outras colapsam para `never`, e o erro aparece longe
 * daqui, em `profiles`, como se `is_admin` não existisse. Quem lê e escreve
 * esta tabela converte na mão, que é o mesmo caminho que `useSharedCollection`
 * já usa pelo mesmo motivo.
 */
export interface AppSettingRow {
  key: string;
  /*
    O conteúdo, em `jsonb`. `unknown` e não um tipo por chave: cada
    configuração tem a sua forma, e quem lê é que a normaliza, como todo dado
    que vem do armazenamento.
  */
  value: unknown;
  updated_at: string;
  updated_by: string;
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
  "support_conversations",
  "teams",
  "profiles",
  "dashboard_panels",
  "follows",
  "saved_views",
] as const;

export type RealtimeTable = (typeof REALTIME_TABLES)[number];
