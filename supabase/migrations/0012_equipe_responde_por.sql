-- Por quais categorias do portal cada equipe responde.
--
-- Existe para o produto **sugerir** o responsável no formulário, em vez de
-- deixar todo artigo nascer sem dono e alguém escolher de novo a cada vez.
--
-- É cadastro, e não um mapa fixo no código, pela mesma razão de todo o resto
-- da classificação: as categorias do portal mudam, as equipes do suporte
-- mudam, e ninguém vai abrir o código para acompanhar. Um mapa em constante
-- estaria errado no dia em que a AltoQi lançasse um produto.
--
-- `jsonb` e não coluna por categoria: a lista é lida inteira, nunca filtrada
-- por um item só. E sem chave estrangeira para `taxonomy_categories` de
-- propósito. Remover uma categoria não pode falhar porque uma equipe a
-- citava; a referência órfã simplesmente deixa de sugerir.
alter table public.teams
  add column category_ids jsonb not null default '[]'::jsonb;
