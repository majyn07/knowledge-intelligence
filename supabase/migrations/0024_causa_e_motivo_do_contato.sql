-- A classificação que o suporte já faz, espelhada aqui.
--
-- "Assuntos que mais chegam" agrupava por vocabulário em comum, que é palpite
-- calculado: palavra compartilhada não é a mesma dúvida, e a tela dizia isso.
-- O suporte, porém, já classifica cada chamado na HubSpot por causa e por
-- motivo de contato — decisão de gente, tomada com o caso em mãos. Espelhar é
-- melhor que deduzir.
--
-- São **duas** perguntas e ficam em duas colunas. "Por que aconteceu" e "por
-- que ele nos procurou" têm respostas diferentes, e juntá-las num campo só
-- perderia justamente a distinção que faz a lista servir para alguma coisa.
--
-- Coluna de verdade, e não `jsonb`, porque são contadas e agrupadas.
--
-- Vazio é estado legítimo: o atendimento que entrou pela conversa não traz
-- nenhuma das duas (o escopo `tickets` não está na credencial), e o cadastrado
-- à mão também não. A tela conta quantos faltam em vez de fingir classificação.
alter table public.tickets
  add column if not exists causa text not null default '',
  add column if not exists motivo_contato text not null default '';

comment on column public.tickets.causa is
  'Por que o problema aconteceu, como o suporte classificou na HubSpot. Vazio quando não veio.';

comment on column public.tickets.motivo_contato is
  'Por que o cliente procurou o suporte, como ele classificou na HubSpot. Vazio quando não veio.';

notify pgrst, 'reload schema';
