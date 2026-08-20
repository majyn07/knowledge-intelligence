-- Conversas do atendimento.
--
-- Faltaram na primeira migração: o provider de atendimentos guarda duas
-- coleções, e só a de tickets tinha tabela. É o conteúdo que a análise lê para
-- entender o problema pelas palavras do cliente, então não é acessório.
--
-- As mensagens ficam em `jsonb` e não em tabela própria: são lidas sempre
-- inteiras, na ordem em que aconteceram, e nunca filtradas por dentro.

create table public.support_conversations (
  id text primary key,
  ticket_id text not null references public.tickets (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  source jsonb
);

create index on public.support_conversations (ticket_id);

alter table public.support_conversations enable row level security;

create policy support_conversations_membros on public.support_conversations
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

grant select, insert, update, delete on public.support_conversations to authenticated;

alter publication supabase_realtime add table public.support_conversations;
