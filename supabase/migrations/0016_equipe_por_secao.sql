-- A equipe também responde por seção, e não só por categoria.
--
-- O primeiro desenho assumiu que a divisão do suporte acompanhava as
-- categorias do portal. Acompanha para Visus e Eberick: uma equipe cobre
-- todas as categorias do produto dela. Não acompanha para o Builder: ali as
-- disciplinas são **seções** (Disciplina Elétrico, Disciplina Hidráulico,
-- Disciplina Incêndio, SPDA, Cabeamento…), e são 30 delas dentro de uma
-- categoria só.
--
-- Sem isto, "Builder Elétrica" e "Builder Hidráulica" teriam de declarar a
-- mesma categoria, e duas equipes na mesma categoria desligam a sugestão,
-- que era justamente o caso em que ela mais ajudaria.
--
-- `jsonb` porque a lista é lida inteira, nunca filtrada por um item. Sem chave
-- estrangeira pelo mesmo motivo da coluna de categorias: remover uma seção não
-- pode falhar porque uma equipe a citava.
alter table public.teams
  add column section_ids jsonb not null default '[]'::jsonb;
