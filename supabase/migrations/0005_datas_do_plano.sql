-- As datas do plano são texto de exibição, não instantes.
--
-- O modelo guarda `createdAt` e `updatedAt` como string em português —
-- "15 jul. 2026", "Hoje, 10:30", "Ontem, 16:20". Declarei as colunas como
-- `timestamptz` e a migração do conteúdo local morria ali, derrubando junto
-- tudo que vinha depois na ordem: artigos e histórico.
--
-- A coluna passa a ser `text`, que é o que o dado é. Converter seria pior:
-- "Ontem" só significa alguma coisa em relação a um momento que não está
-- guardado em lugar nenhum, e inventar esse instante daria ao registro uma
-- precisão que ele nunca teve.
--
-- O mesmo critério já valia em `tickets.occurred_on`. Quando a sprint de
-- prazos precisar ordenar e comparar, o campo vira data **no modelo** primeiro
-- — é decisão de produto, não de schema.

alter table public.plans
  alter column created_at type text using created_at::text,
  alter column updated_at type text using updated_at::text;

alter table public.plans
  alter column created_at set default '',
  alter column updated_at set default '';
