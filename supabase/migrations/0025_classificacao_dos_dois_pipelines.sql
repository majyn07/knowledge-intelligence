-- A classificação dos dois pipelines, cada campo no seu.
--
-- A 0024 criou `motivo_contato` supondo uma pergunta só. O ticket real mostrou
-- dois pipelines com vocabulários próprios: o de Setup pergunta a causa raiz e
-- chama o motivo de "sintoma", o de Suporte tem só a categoria e não tem causa.
-- Um chamado passa por um dos dois, e fundir os campos misturaria dois
-- vocabulários num ranking sem que quem lê tivesse como saber.
--
-- `motivo_contato` sai em vez de ser renomeada: ela nasceu ontem, nenhum
-- registro a preencheu (a classificação só entra por arquivo, e o arquivo ainda
-- não chegou), e deixá-la ao lado de `categoria` e `sintoma` criaria uma
-- terceira resposta para a mesma pergunta.
--
-- Colunas de verdade, e não `jsonb`, porque todas são contadas e agrupadas.
-- Vazio é estado legítimo em todas: os 1.025 que entraram pela conversa não
-- trazem nenhuma, e a tela conta quantos faltam em vez de fingir classificação.
alter table public.tickets
  drop column if exists motivo_contato,
  add column if not exists categoria text not null default '',
  add column if not exists sintoma text not null default '',
  add column if not exists tipo_problema text not null default '',
  add column if not exists fechamento text not null default '',
  add column if not exists quem_abriu text not null default '',
  add column if not exists protecao_tecnologica text not null default '';

comment on column public.tickets.categoria is
  '[Support] Categoria | Motivo principal do contato. Pipeline de Suporte.';

comment on column public.tickets.sintoma is
  '[Setup] Sintoma | Motivo detalhado do contato. Pipeline de Setup.';

comment on column public.tickets.causa is
  '[Setup] Causa | Qual a causa raiz que gerou o problema? Pipeline de Setup.';

comment on column public.tickets.tipo_problema is
  '[Setup] Tipo de Problema. Pipeline de Setup.';

comment on column public.tickets.fechamento is
  'Fechamento | Qual o motivo do encerramento do ticket?';

notify pgrst, 'reload schema';
