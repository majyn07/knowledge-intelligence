-- Administrador: a única distinção entre pessoas neste produto.
--
-- Não há papéis aqui, por decisão registrada: a equipe é treinada, o histórico
-- responde por quem fez o quê, e todo mundo vê as mesmas coisas. Isso não muda.
--
-- O que muda é uma coisa só: hoje a política é `for all using (is_member())`
-- em todas as tabelas, e `profiles` é uma delas. Ou seja, qualquer pessoa
-- autenticada pode editar e apagar o perfil de qualquer outra, inclusive
-- trocar o nome de um colega. Isso nunca foi decisão, foi consequência de a
-- política ser a mesma para tudo.
--
-- Então o administrador não ganha poderes: ele é quem continua podendo mexer
-- no perfil dos outros, e todo o resto passa a mexer só no próprio.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Pode editar e desativar o perfil de outras pessoas. Não afeta o que se enxerga: todos veem tudo.';

-- Quem já está aqui não pode ficar sem ninguém que administre, e o produto não
-- tem tela de instalação para eleger o primeiro. O perfil mais antigo é quem
-- montou o espaço de trabalho, e é o administrador inicial.
--
-- Nenhum e-mail escrito aqui de propósito: nome de colaborador não vive no
-- código deste produto, e um e-mail numa migração é a mesma coisa com outro
-- nome. Depois disso, quem administra promove quem quiser pela tela.
update public.profiles
set is_admin = true
where id = (select id from public.profiles order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where is_admin);

-- Quem sou eu, para a política perguntar sem recursão.
--
-- `security definer` pela mesma razão de `is_member()`: a política de
-- `profiles` vai chamar esta função, e ler a tabela de dentro da política dela
-- mesma dispara recursão infinita. Está registrado em 0004.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- A política de `profiles` deixa de ser a genérica.
--
-- Ler continua sendo de todos: a lista de pessoas é o que preenche "atribuir a"
-- em toda tela, e esconder colega de colega quebraria o produto sem proteger
-- nada.
--
-- Escrever passa a ser o próprio perfil, ou qualquer um se for administrador.
drop policy if exists profiles_membros on public.profiles;

create policy profiles_leitura on public.profiles
  for select to authenticated
  using (public.is_member());

create policy profiles_escrita_propria on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Conta não se apaga, se desativa: o histórico já registrou o que a pessoa fez,
-- e apagar deixaria esses registros apontando para o vazio. A regra é a mesma
-- desde 0006, e agora ela está na política em vez de só no costume.
create policy profiles_insercao on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
