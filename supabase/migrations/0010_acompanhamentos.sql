-- Acompanhar um registro sem ser dono dele.
--
-- Até aqui só existia atribuição: ou o plano é seu, ou ele não aparece para
-- você em lugar nenhum. Mas boa parte do trabalho de suporte é interesse sem
-- responsabilidade. Quem abriu o atendimento que originou o plano quer saber
-- quando ele publica, e não vai assumi-lo por isso.
--
-- Não é atribuição disfarçada: acompanhar não move responsabilidade, não muda
-- a fila de ninguém e some quando a pessoa quiser.

create table public.follows (
  id text primary key,

  -- Quem acompanha. Sem chave estrangeira para `profiles` de propósito: no
  -- modo sem servidor não há conta, e o registro fica com identificador vazio
  -- porque ali só existe uma pessoa: a que está no navegador.
  person_id text not null default '',

  subject_kind text not null,
  subject_id text not null,

  -- O rótulo do registro no momento em que passou a ser acompanhado.
  -- Mesma razão do histórico: o acompanhamento sobrevive à exclusão do
  -- registro, e a lista continua legível em vez de mostrar um identificador.
  subject_label text not null default '',

  project_id text not null default '',
  created_at text not null default '',

  -- Acompanhar duas vezes é acompanhar uma. Sem isto, um clique duplo criaria
  -- duas linhas e a lista mostraria o mesmo plano repetido.
  unique (person_id, subject_kind, subject_id)
);

create index on public.follows (person_id);

alter table public.follows enable row level security;

-- A política é a mesma de todas as tabelas: quem é da casa alcança tudo. Não
-- há papéis, e quem filtra por pessoa é a tela. Fechar por `person_id` aqui
-- criaria a primeira regra de visibilidade individual do produto, e essa
-- decisão não é desta sprint.
create policy follows_membros on public.follows
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

grant select, insert, update, delete on public.follows to authenticated;

alter publication supabase_realtime add table public.follows;
