-- A impressão do texto que o portal tinha na última importação.
--
-- Não há API para publicar de volta na HubSpot, e a última perna do ciclo é
-- colar à mão. Sem guardar a versão do portal, nada aponta o que foi publicado
-- aqui e ainda não chegou ao cliente. `updated_at` não serve: ele guarda o
-- `lastmod` do portal, e classificar ou atribuir um artigo também o move.
--
-- Nulo nos importados antes desta coluna, e nulo é desconhecido: quem decide
-- nesse caso é o histórico. A próxima importação que revisitar o artigo a
-- preenche.
alter table public.articles add column if not exists portal_baseline text;

comment on column public.articles.portal_baseline is
  'Impressão de título, resumo e conteúdo como vieram do portal. Nulo é desconhecido.';

notify pgrst, 'reload schema';
