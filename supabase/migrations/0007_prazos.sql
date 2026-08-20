-- Prazo do plano.
--
-- A tarefa também ganha prazo, mas dentro do `jsonb` de `tasks`: ela é lida
-- sempre junto do plano e nunca filtrada por dentro. O plano precisa de coluna
-- porque a fila de atenção ordena e compara por ela.
--
-- `text` e não `date` pelo mesmo motivo de `created_at`: o modelo guarda ISO em
-- string, e a leitura já recusa qualquer coisa que não seja ISO válido.
alter table public.plans
  add column due_date text;

create index on public.plans (due_date);
