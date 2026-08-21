-- Visões salvas da Biblioteca.
--
-- Um recorte útil — "Elétrica sem responsável", "em revisão há mais de uma
-- semana" — hoje é remontado à mão toda vez que alguém precisa dele. A visão
-- guarda a combinação de filtros e como a tabela estava, e reabre igual.
--
-- Compartilhada, como painel: "Elétrica pendentes" é útil para quem trabalha
-- em Elétrica, não só para quem montou. Não há papéis no produto, e inventar
-- "minha visão" criaria uma noção de dono que só o acompanhamento tem — e ele
-- é sobre interesse, não sobre trabalho.

create table public.saved_views (
  id text primary key,
  name text not null,

  -- A qual tela pertence. Hoje só a Biblioteca, mas a coluna existe para a
  -- segunda tela não exigir outra tabela.
  screen text not null default 'library',

  -- Colunas de verdade porque são o que a tela lê para montar o recorte.
  search text not null default '',
  status text not null default 'all',
  category_id text not null default 'all',

  sort_column text not null default 'updatedAt',
  sort_direction text not null default 'desc',

  -- Lista lida inteira, nunca filtrada por um item.
  columns jsonb not null default '[]'::jsonb,

  position integer not null default 0
);

alter table public.saved_views enable row level security;

create policy saved_views_membros on public.saved_views
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

grant select, insert, update, delete on public.saved_views to authenticated;

alter publication supabase_realtime add table public.saved_views;
