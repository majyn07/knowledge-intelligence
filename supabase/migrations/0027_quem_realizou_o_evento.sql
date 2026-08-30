-- Quem realizou, como identificador e não só como rótulo.
--
-- O evento guarda `actor` em texto, e isso está certo: o rótulo é o que sobra
-- quando a conta some, e "excluído por Ana" continua legível depois de a Ana
-- sair. O histórico registra o que aconteceu e não se reescreve.
--
-- Só que o rótulo sozinho não responde "foi a mesma pessoa?". A auditoria
-- mostrou o efeito no acervo real: uma conta criada como "raoni.silva" e
-- renomeada para "Raoni Teste" aparece como **duas** pessoas no filtro, com 21
-- eventos numa e 22 na outra, e quem procura o que ela fez escolhe uma e perde
-- metade. É a mesma lição que a atribuição e a menção já tinham aprendido.
--
-- Os dois convivem de propósito: o identificador responde "foi a mesma
-- pessoa?", o rótulo responde "como ela se chamava quando isto aconteceu?".
--
-- Aceita nulo, e sem preencher o que já existe: os eventos anteriores não têm
-- como saber, e chutar a partir do nome seria inventar vínculo. Ali o rótulo é
-- tudo que há, e a tela diz isso.
alter table public.activity_events
  add column if not exists actor_id text;

comment on column public.activity_events.actor_id is
  'Quem realizou, por identificador. Nulo nos eventos anteriores a esta coluna.';

notify pgrst, 'reload schema';
