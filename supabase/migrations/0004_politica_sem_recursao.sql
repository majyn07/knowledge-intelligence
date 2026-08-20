-- Corrige recursão infinita nas políticas de acesso.
--
-- `is_member()` verificava a existência de uma linha em `profiles`. Mas a
-- política de `profiles` chama `is_member()` — então ler a tabela dispara a
-- política, que consulta a tabela, que dispara a política. O Postgres derruba
-- com "stack depth limit exceeded", e o erro aparece na primeira escrita.
--
-- A correção não é marcar a função como `security definer` para escapar da
-- política: é não precisar de tabela nenhuma. O e-mail está no próprio token
-- da sessão, assinado pelo servidor de autenticação.
--
-- Isso também deixa a regra mais forte do que era. Antes bastava existir uma
-- linha de perfil; agora o domínio é conferido a cada requisição, contra a
-- credencial que veio junto com ela.

create or replace function public.is_member()
returns boolean
language sql
stable
as $$
  select public.is_altoqi_email(coalesce(auth.jwt() ->> 'email', ''))
$$;
