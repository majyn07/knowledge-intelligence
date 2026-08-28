-- O artigo do acervo não pertence a uma iniciativa.
--
-- O esquema nasceu quando todo artigo vinha de um projeto: `project_id` era
-- obrigatório e apagar o projeto levava o artigo junto. O produto decidiu o
-- contrário desde então — o acervo é do hub, espelho de um portal, e o lugar do
-- artigo é a seção. Carimbá-lo com a iniciativa ativa esconderia o portal de
-- quem trocasse de projeto.
--
-- A importação do portal expôs a contradição da pior forma possível: 1.822
-- artigos com `project_id` vazio foram recusados pela chave estrangeira, no fim
-- de uma varredura de quarenta e cinco minutos.
--
-- Duas mudanças, e a segunda é tão importante quanto a primeira:
--
--   1. `project_id` passa a aceitar nulo, que é o estado do artigo importado.
--   2. `on delete cascade` vira `on delete set null` — apagar uma iniciativa
--      não pode apagar artigo do acervo que nunca foi dela. É a mesma razão
--      pela qual `section_id` já usava `set null`.

alter table public.articles
  drop constraint articles_project_id_fkey;

alter table public.articles
  alter column project_id drop not null;

-- Texto vazio não é ausência para o Postgres: quem já está gravado assim
-- precisa virar nulo, senão continua sem casar com projeto nenhum.
update public.articles
  set project_id = null
  where project_id = '';

alter table public.articles
  add constraint articles_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete set null;
