-- Campos que a primeira migração não cobriu.
--
-- Escrevi o schema a partir dos modelos compartilhados em `src/models`, e dois
-- deles guardam mais do que aquilo: a análise carrega o próprio ciclo, e o
-- plano guarda o nome do projeto além do identificador.

-- ============================================================
-- Análise
-- ============================================================

alter table public.analyses
  add column status text not null default 'open'
    check (status in ('open', 'in_review', 'completed')),
  add column started_at text not null default '',
  add column completed_at text,
  -- Artigos que a busca no cliente resolveu como evidência, e a conversa com
  -- o modelo. Lidos inteiros, nunca filtrados por dentro.
  add column related_articles jsonb not null default '[]'::jsonb,
  add column messages jsonb not null default '[]'::jsonb;

create index on public.analyses (project_id, status);

-- ============================================================
-- Plano
-- ============================================================

-- O nome do projeto é denormalizado no modelo. Guardar aqui preserva a forma
-- exata do registro; normalizar isso é decisão de produto, não de migração,
-- e mudaria o modelo em vez do banco.
alter table public.plans
  add column project_name text not null default '';
