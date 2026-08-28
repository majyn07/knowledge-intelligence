-- Painéis montados pela equipe.
--
-- Os indicadores até aqui eram os que o código decidiu contar. Toda pergunta
-- nova exigia deploy, e por isso as perguntas simplesmente não eram feitas.
-- Esta tabela guarda o **enunciado** do painel: o que contar, como quebrar,
-- em que janela, e não o resultado: o número é recalculado a cada leitura,
-- sobre os dados que existem agora.
--
-- Guardar o resultado seria guardar um número que envelhece em silêncio.

create table public.dashboard_panels (
  id text primary key,
  title text not null,

  -- Colunas de verdade porque são filtradas e ordenadas na montagem da tela.
  source text not null,
  breakdown text not null default 'none',
  visual text not null default 'number',

  -- Nulo é "desde o início", e não "sem janela definida". A ausência de teto
  -- é uma escolha do painel, não um campo por preencher.
  window_days integer,

  -- Só a origem "chegadas" usa. Nulo nas demais.
  stage text,

  scoped_to_project boolean not null default false,
  position integer not null default 0
);

alter table public.dashboard_panels enable row level security;

-- Painel é compartilhado, como todo o resto do produto: não há papéis, e
-- inventar "meu painel" criaria uma noção de dono que nada mais aqui tem.
create policy dashboard_panels_membros on public.dashboard_panels
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

-- RLS decide quais linhas aparecem depois que a tabela é alcançável, não se
-- ela é alcançável. Sem este grant a tabela não existe para quem entrou.
grant select, insert, update, delete on public.dashboard_panels to authenticated;

-- Com a aba aberta e sem recarregar: alguém montando um painel na reunião
-- aparece na tela de quem está assistindo.
alter publication supabase_realtime add table public.dashboard_panels;
