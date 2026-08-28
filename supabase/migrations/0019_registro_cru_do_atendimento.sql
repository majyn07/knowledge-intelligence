-- O registro cru do atendimento, como veio da origem.
--
-- O atendimento aqui é espelho, e espelho não se edita: o que a análise lê
-- precisa ser o que o suporte registrou, e não a nossa redução dele a quatro
-- campos. Título, empresa e data continuam em coluna de verdade porque são
-- filtrados, ordenados e contados; o resto vem inteiro e é lido inteiro, que é
-- exatamente o caso de `jsonb`.
--
-- Aceita nulo porque o atendimento cadastrado à mão e o que veio por arquivo
-- não têm registro de origem. Ausência é estado previsto, não erro.
alter table public.tickets
  add column if not exists raw jsonb;

comment on column public.tickets.raw is
  'O registro como a origem devolveu. Somente leitura: nada no produto o reescreve.';
