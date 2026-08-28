-- Configuração que é da equipe, e não de cada navegador.
--
-- O tema, a forma da lista e as colunas ficam no navegador de propósito:
-- "prefiro tabela" é sobre esta máquina. O interruptor da busca automática é o
-- contrário: ele decide se o produto vai falar com o servidor de suporte da
-- AltoQi, e essa decisão vale para as catorze pessoas ao mesmo tempo. Guardá-la
-- no navegador faria cada um ter a sua, e a máquina do outro lado sentiria a
-- soma de todas.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Quem mexeu por último. O histórico responde por quem fez o quê, e desligar
  -- a entrada de atendimentos é coisa que alguém vai querer saber quem fez.
  updated_by uuid references auth.users (id) on delete set null,
  synced_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Configuração compartilhada da equipe. Preferência de máquina continua no navegador.';

-- O mesmo carimbo de gravação das outras tabelas, pelo mesmo motivo: é dele que
-- a releitura incremental sabe o que mudou.
drop trigger if exists carimbo_de_gravacao on public.app_settings;

create trigger carimbo_de_gravacao
  before insert or update on public.app_settings
  for each row execute function public.marcar_gravacao();

grant select, insert, update on public.app_settings to authenticated;

alter table public.app_settings enable row level security;

-- Ler é de todos: a tela precisa dizer que a busca automática está ligada mesmo
-- para quem não pode mexer nela. Esconder o estado faria a pessoa não entender
-- por que atendimentos aparecem sozinhos.
drop policy if exists app_settings_leitura on public.app_settings;

create policy app_settings_leitura on public.app_settings
  for select to authenticated
  using (public.is_member());

-- Escrever é de quem administra, e é a mesma exceção da busca na HubSpot: não é
-- sobre conteúdo, é sobre gastar requisições contra uma máquina que atende
-- cliente.
drop policy if exists app_settings_escrita on public.app_settings;

create policy app_settings_escrita on public.app_settings
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists app_settings_atualizacao on public.app_settings;

create policy app_settings_atualizacao on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Nasce desligada.
--
-- Ligar é decisão de alguém, e um produto que começa falando sozinho com o CRM
-- de produção no primeiro deploy é o oposto disso. A linha existe para a tela
-- ter o que ler; o valor dentro dela é `false`.
insert into public.app_settings (key, value)
values ('hubspot_auto_sync', '{"ligado": false, "ultimaEm": ""}'::jsonb)
on conflict (key) do nothing;
