-- Os quatro campos que o pipeline de Suporte ganhou na HubSpot depois de agosto.
--
-- Em 0025 o Suporte tinha "só a categoria, e não tem causa nenhuma". Em
-- 19/10/2026, com o escopo de leitura de tickets concedido, a conta mostrou que
-- isso mudou: o Suporte pergunta também sintoma, causa raiz, produto e
-- especialidade técnica, cada um com sua lista de opções. Ficam em coluna
-- própria, separados dos de Setup, pela mesma razão de antes: são vocabulários
-- diferentes, e somar os dois num ranking misturaria respostas a perguntas
-- distintas.
--
-- Vazio é estado legítimo, como nos outros sete.
alter table public.tickets
  add column if not exists suporte_sintoma text not null default '',
  add column if not exists suporte_causa text not null default '',
  add column if not exists produto text not null default '',
  add column if not exists especialidade text not null default '';

comment on column public.tickets.suporte_sintoma is
  '[Support] Sintoma | Motivo detalhado do contato. Pipeline de Suporte.';

comment on column public.tickets.suporte_causa is
  '[Support] Causa | Qual a causa raiz que gerou o problema? Pipeline de Suporte.';

comment on column public.tickets.produto is
  '[Support] Produto. A classificação de quem atendeu, e não a dedução pelo texto.';

comment on column public.tickets.especialidade is
  '[Support] Especialidade técnica | Solicitação sobre funcionalidades de alguma disciplina?';

notify pgrst, 'reload schema';
