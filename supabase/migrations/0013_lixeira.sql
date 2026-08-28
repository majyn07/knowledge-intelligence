-- Exclusão reversível.
--
-- Excluir apagava a linha. Com dado compartilhado isso mudou de tamanho: quem
-- apaga apaga para catorze pessoas, e o único recurso era o diálogo de
-- confirmação, que quem clica rápido não lê.
--
-- A partir daqui o registro sai da vista e continua existindo. Não há prazo de
-- expurgo automático de propósito: apagar trabalho sozinho, num horário que
-- ninguém escolheu, é exatamente o que este produto não faz. Esvaziar a
-- lixeira é ato de alguém.
--
-- `text` e não `timestamptz` pela mesma razão do resto das datas do produto:
-- o que é gravado é ISO, e a conversão fica na leitura.
alter table public.projects  add column deleted_at text;
alter table public.tickets   add column deleted_at text;
alter table public.analyses  add column deleted_at text;
alter table public.plans     add column deleted_at text;
alter table public.articles  add column deleted_at text;

-- Índice parcial: a lixeira é a exceção, e quase toda consulta pergunta pelo
-- que está vivo. Indexar a coluna inteira seria indexar sobretudo nulos.
create index on public.projects (deleted_at) where deleted_at is not null;
create index on public.tickets  (deleted_at) where deleted_at is not null;
create index on public.analyses (deleted_at) where deleted_at is not null;
create index on public.plans    (deleted_at) where deleted_at is not null;
create index on public.articles (deleted_at) where deleted_at is not null;

-- A conversa não ganha coluna: ela não tem vida própria, acompanha o
-- atendimento. Some e volta junto com ele.
--
-- O histórico também não. Ele é append-only e registra o que aconteceu: um
-- evento não deixa de ter acontecido porque o registro foi para a lixeira.
