-- Quando cada pessoa fechou a central de avisos pela última vez.
--
-- Vivia só no navegador, e isso era um limite anotado: ler no computador não
-- marcava como lido no celular. A política de escrita do perfil já é a certa
-- (cada um escreve o próprio), então basta a coluna.
--
-- Nulo é nunca: a central mostra tudo como novo, que é o que ela fazia para
-- quem abria pela primeira vez num navegador.
alter table public.profiles add column if not exists notices_seen_at timestamptz;

comment on column public.profiles.notices_seen_at is
  'Última vez que a pessoa fechou a central de avisos. Nulo é nunca.';

notify pgrst, 'reload schema';
