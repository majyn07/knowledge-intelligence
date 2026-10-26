-- De quais atendimentos um artigo nasceu, e com quais termos do grupo.
--
-- Pré-requisito do "o artigo resolveu?": medido em 19/10/2026, nenhum dos 1.831
-- publicados tinha atendimento de origem, porque a fila e os atendimentos
-- marcados escreviam o rascunho sem dizer de onde ele vinha. Sem o "antes"
-- fixado quando o artigo nasce, medir o que chega depois seria inventar.
--
-- jsonb, e não tabela de ligação: é lido inteiro, junto do artigo, e nunca
-- filtrado por atendimento. Nulo é "não nasceu de atendimento", que é o caso dos
-- artigos importados do portal.
alter table public.articles add column if not exists origem_atendimentos jsonb;

comment on column public.articles.origem_atendimentos is
  'Atendimentos e termos do grupo que originaram o artigo: {ticketIds, termos, em}. Nulo é importado.';

notify pgrst, 'reload schema';
