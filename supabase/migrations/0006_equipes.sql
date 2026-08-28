-- Equipes, e a pessoa deixando de ser lista para virar conta.
--
-- Até aqui "pessoa" era um registro digitado em Configurações, e equipe era
-- outro registro na mesma lista. Por isso a semente misturava "Suporte Visus"
-- com um nome próprio. Com login de verdade, os dois se separam: a equipe é
-- cadastro, a pessoa é quem entrou.
--
-- Consequência deliberada: **não se atribui a quem nunca acessou**. Enquanto
-- um colega não entra, a equipe dele recebe a atribuição. Isso é melhor que
-- manter uma lista paralela de nomes que ninguém confirma.

create table public.teams (
  id text primary key,
  name text not null unique,
  position integer not null default 0
);

alter table public.teams enable row level security;

create policy teams_membros on public.teams
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

grant select, insert, update, delete on public.teams to authenticated;

alter publication supabase_realtime add table public.teams;

-- A pessoa pertence a uma equipe. Foi decisão de produto: no suporte AltoQi
-- alguém é de Elétrica ou de Hidráulica, não das duas. Se um dia houver
-- sobreposição real, isto vira tabela de ligação, e a mudança é aqui.
--
-- `set null` e não `cascade`: remover a equipe não pode apagar a conta de
-- ninguém. A pessoa fica sem equipe e alguém reatribui.
alter table public.profiles
  add column team_id text references public.teams (id) on delete set null;

create index on public.profiles (team_id);

-- Conta desativada em vez de removida. O histórico já registrou o que a
-- pessoa fez, e apagar a conta deixaria esses registros apontando para o
-- vazio. Quem sai para de aparecer nas atribuições novas e continua no
-- passado, que é o que de fato aconteceu.
alter table public.profiles
  add column is_active boolean not null default true;

-- As quatro equipes reais do suporte AltoQi.
insert into public.teams (id, name, position) values
  ('team-suporte-builder-eletrica',   'Suporte Builder Elétrica',   0),
  ('team-suporte-builder-hidraulica', 'Suporte Builder Hidráulica', 1),
  ('team-suporte-estruturas',         'Suporte Estruturas',         2),
  ('team-suporte-visus',              'Suporte Visus',              3)
on conflict (id) do nothing;
