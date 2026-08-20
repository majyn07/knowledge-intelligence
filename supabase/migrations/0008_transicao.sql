-- Estágio de destino no evento.
--
-- O histórico guardava a transição só como texto — "Rascunho → Publicado" — e
-- por isso os indicadores conseguiam contar que houve movimento, mas não para
-- onde. "Quantos artigos foram publicados neste mês", que é a pergunta da
-- VISION sobre reduzir recorrência, não tinha resposta.
--
-- `jsonb` e não duas colunas: o par é lido sempre junto e nunca filtrado por
-- uma metade só.
--
-- Eventos anteriores ficam com o campo nulo, de propósito. Preenchê-los
-- exigiria interpretar o texto do `detail`, que é exatamente o problema que
-- esta coluna resolve — e a tela diz que o histórico é parcial em vez de
-- apresentar um número incompleto como se fosse completo.
alter table public.activity_events
  add column transition jsonb;

create index on public.activity_events ((transition ->> 'to'));
