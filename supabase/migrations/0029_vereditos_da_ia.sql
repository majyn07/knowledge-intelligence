-- O veredito que a IA deu sobre um par de artigos, guardado para a equipe.
--
-- A varredura das sobreposições leva cerca de meio minuto e um pedido de cota
-- por par, e o resultado vivia só no diálogo de quem rodou: fechar a aba jogava
-- fora o que já tinha sido lido, e os 137 pares do acervo real nunca foram
-- avaliados até o fim porque não cabiam numa sessão. Guardado aqui, a varredura
-- retoma de onde parou e o colega que abre o mesmo par não paga de novo.
--
-- Continua sendo proposta, não achado calculado: a tela diz quem pediu e quando.
create table if not exists public.ai_verdicts (
  kind text not null,
  -- O par, com os identificadores em ordem. A×B e B×A são o mesmo par.
  subject text not null,
  -- A impressão do texto que foi ao modelo. Mudou o texto, o veredito vence.
  fingerprint text not null,
  payload jsonb not null,
  actor_id uuid references auth.users (id) on delete set null default auth.uid(),
  -- O rótulo sobra quando a conta some, como no histórico.
  actor_label text not null default '',
  at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  primary key (kind, subject)
);

comment on table public.ai_verdicts is
  'Vereditos da IA guardados para a equipe. Proposta, não achado: quem decide é a revisão.';

drop trigger if exists carimbo_de_gravacao on public.ai_verdicts;

create trigger carimbo_de_gravacao
  before insert or update on public.ai_verdicts
  for each row execute function public.marcar_gravacao();

alter table public.ai_verdicts enable row level security;

-- A mesma regra do resto do conteúdo: quem é da equipe lê e grava. Não há
-- `delete`: um veredito é substituído pelo seguinte, nunca apagado sem outro no
-- lugar.
drop policy if exists ai_verdicts_leitura on public.ai_verdicts;

create policy ai_verdicts_leitura on public.ai_verdicts
  for select to authenticated
  using (public.is_member());

drop policy if exists ai_verdicts_insercao on public.ai_verdicts;

create policy ai_verdicts_insercao on public.ai_verdicts
  for insert to authenticated
  with check (public.is_member());

drop policy if exists ai_verdicts_atualizacao on public.ai_verdicts;

create policy ai_verdicts_atualizacao on public.ai_verdicts
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());

-- RLS decide quais linhas aparecem depois que a tabela é alcançável; o grant
-- decide se ela é.
grant select, insert, update on public.ai_verdicts to authenticated;

notify pgrst, 'reload schema';
