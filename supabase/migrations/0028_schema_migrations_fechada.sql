-- A tabela de controle das migrações estava aberta pela API.
--
-- O linter da Supabase apontou em 13/09/2026: única tabela de `public` sem RLS,
-- e `anon` e `authenticated` tinham todos os privilégios nela, inclusive DELETE
-- e TRUNCATE. Ela não guarda dado de cliente — só o nome das migrações já
-- aplicadas —, mas qualquer um com a chave pública podia apagar essas linhas, e
-- o próximo `db:migrate` reaplicaria migrações sobre um banco que já as tem.
--
-- Quem lê e escreve nela é o script de migração, conectado como `postgres`,
-- que ignora RLS. Pela API ninguém precisa dela.

alter table public.schema_migrations enable row level security;

-- Sem política nenhuma: com RLS ligada e nenhuma política, a API não lê nem
-- escreve. E os privilégios saem também, para o aviso não voltar sob outro nome.
revoke all on table public.schema_migrations from anon, authenticated;

notify pgrst, 'reload schema';
