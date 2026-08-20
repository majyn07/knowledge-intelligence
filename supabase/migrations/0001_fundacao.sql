-- Fundação compartilhada do Visus Knowledge Intelligence.
--
-- Até aqui o produto vivia no `localStorage` de cada navegador: duas pessoas
-- usando o site viam acervos desconectados. Este schema é o que torna o
-- trabalho comum à equipe.
--
-- Critério de modelagem: coluna de verdade para tudo que é filtrado, ordenado
-- ou contado; `jsonb` para o conteúdo profundo que só é lido inteiro. O
-- documento de um plano nunca entra num `WHERE`; o estágio dele entra sempre.

create extension if not exists "pgcrypto";

-- ============================================================
-- Identidade
-- ============================================================

-- Espelho de `auth.users` com o que a interface precisa mostrar.
-- Não há papéis nem permissões aqui: a decisão sobre isso é da sprint de
-- contas, e inventar uma coluna `role` agora seria fingir uma regra que não
-- existe. `role` abaixo é cargo, texto livre, como já era.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Só e-mail corporativo entra. A restrição vive no banco, e não apenas na
-- configuração de autenticação, porque configuração se troca por engano e
-- constraint não.
create or replace function public.is_altoqi_email(address text)
returns boolean
language sql
immutable
as $$
  select lower(address) like '%@altoqi.com.br'
$$;

alter table public.profiles
  add constraint profiles_dominio_altoqi
  check (public.is_altoqi_email(email));

-- Cria o perfil no primeiro acesso, recusando quem está fora do domínio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_altoqi_email(new.email) then
    raise exception 'Acesso restrito a e-mails @altoqi.com.br';
  end if;

  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Taxonomia
-- ============================================================

-- Tabelas de verdade, e não um documento único, porque as restrições importam:
-- seção pertence a exatamente uma categoria, nome não se repete dentro dela, e
-- remover a categoria leva as seções junto.
create table public.taxonomy_categories (
  id text primary key,
  name text not null,
  is_product boolean not null default true,
  position integer not null default 0
);

create table public.taxonomy_sections (
  id text primary key,
  category_id text not null references public.taxonomy_categories (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  unique (category_id, name)
);

-- Gênero de artigo e tipo de oportunidade compartilham a forma porque
-- compartilham o comportamento: criar, renomear, remover, ordenar.
create table public.taxonomy_entries (
  id text primary key,
  list text not null check (list in ('genres', 'opportunity_types')),
  name text not null,
  position integer not null default 0,
  unique (list, name)
);

-- ============================================================
-- Ciclo
-- ============================================================

create table public.projects (
  id text primary key,
  name text not null,
  client text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  product text not null default '',
  module text not null default '',
  goal text not null default '',
  owner text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tickets (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null default '',
  solution text not null default '',
  company text not null default '',
  -- Texto, e não `date`: hoje o campo é livre. Vira data quando o atendimento
  -- vier da HubSpot com formato garantido.
  occurred_on text not null default '',
  source jsonb
);

create table public.analyses (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  ticket_id text not null,
  -- Resposta estruturada da IA, incluindo as oportunidades. É lida inteira e
  -- nunca filtrada por dentro.
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.plans (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null default '',
  status text not null default 'analysis',
  priority text not null default 'normal',
  owner text not null default '',
  source jsonb not null default '{}'::jsonb,
  document jsonb not null default '{}'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),

  -- `set null` e não `cascade`: apagar uma seção não pode apagar o artigo.
  -- Ele fica sem classificação e aparece em "Sem seção" para ser reclassificado.
  section_id text references public.taxonomy_sections (id) on delete set null,
  genre_id text references public.taxonomy_entries (id) on delete set null,

  -- Identidade no portal publicado. Sem ela, sincronizar duplicaria a cada
  -- importação em vez de atualizar o que já existe.
  portal_article_id text unique,
  url text,

  tags text[] not null default '{}',
  keywords text[] not null default '{}',
  author text not null default '',
  source jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O histórico é acrescentado, nunca editado: registra o que aconteceu, não o
-- estado atual. Sem `updated_at` de propósito.
create table public.activity_events (
  id text primary key,
  at timestamptz not null default now(),
  type text not null,
  project_id text not null,
  actor text not null default '',
  subject jsonb not null,
  detail text not null default ''
);

-- ============================================================
-- Índices
-- ============================================================

create index on public.tickets (project_id);
create index on public.analyses (project_id);
create index on public.analyses (ticket_id);
create index on public.plans (project_id, status);
create index on public.articles (project_id, status);
create index on public.articles (section_id);
create index on public.activity_events (project_id, at desc);

-- Busca de artigo no servidor. Era feita no cliente porque o acervo cabia no
-- navegador; com o espelho do portal serão cerca de 1.800, e deixa de caber.
create index articles_busca on public.articles
  using gin (to_tsvector('portuguese', title || ' ' || summary || ' ' || content));

-- ============================================================
-- Acesso
-- ============================================================

-- Toda tabela é fechada por padrão. A regra é a mesma em todas: quem está
-- autenticado e tem e-mail do domínio lê e escreve tudo.
--
-- Isso é deliberado e não é descuido. O produto nunca teve permissão por
-- papel, e a equipe inteira conduz o mesmo ciclo. Quando papéis existirem, a
-- política muda aqui e em nenhum outro lugar.
create or replace function public.is_member()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
  )
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'taxonomy_categories', 'taxonomy_sections', 'taxonomy_entries',
    'projects', 'tickets', 'analyses', 'plans', 'articles', 'activity_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())',
      t || '_membros', t
    );
  end loop;
end;
$$;

-- ============================================================
-- Tempo real
-- ============================================================

-- Atualização com a tela aberta, sem recarregar. `activity_events` entra
-- porque o histórico aparece ao vivo; `profiles` fica de fora porque muda uma
-- vez por pessoa.
alter publication supabase_realtime add table
  public.taxonomy_categories,
  public.taxonomy_sections,
  public.taxonomy_entries,
  public.projects,
  public.tickets,
  public.analyses,
  public.plans,
  public.articles,
  public.activity_events;
