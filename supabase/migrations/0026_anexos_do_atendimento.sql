-- Onde o print que o cliente mandou fica guardado.
--
-- A conversa de e-mail carrega arquivo, e é a maior parte do acervo: dos 445
-- fios que nunca passaram pelo bot, 378 são e-mail. Medido em dez deles, 27
-- anexos em 209 mensagens — quase sempre a captura de tela que mostra o erro,
-- que é justamente a evidência que falta quando se lê o chamado.
--
-- **A URL da HubSpot não se guarda.** Ela vem assinada, com o prazo dentro dela
-- (`?Expires=…&Signature=…`), e a que foi medida valia cerca de um dia. Gravada
-- junto do atendimento, funcionaria hoje e estaria quebrada amanhã — imagem
-- morta dentro de um registro, sem erro nenhum dizendo por quê.
--
-- Buscar de novo a cada exibição resolveria, e foi recusado: seriam duas
-- requisições contra o servidor de suporte toda vez que alguém abrisse um
-- chamado para olhar uma figura. O freio existe justamente para isso não
-- acontecer.
--
-- Então o arquivo é copiado **uma vez** e servido daqui em diante. A cópia
-- acontece na primeira vez que alguém pede aquele atendimento, e não em lote na
-- varredura: copiar tudo seriam milhares de arquivos, a maioria que ninguém vai
-- abrir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos-atendimento',
  'anexos-atendimento',
  -- **Privado, e aqui a decisão é o contrário da do balde de artigos.**
  --
  -- Lá o conteúdo é público por natureza: o acervo espelha um portal aberto, e
  -- URL assinada que expira deixaria artigo com imagem quebrada. Aqui é print
  -- de tela de cliente, com nome de projeto, caminho de arquivo e o que mais
  -- estivesse na tela dele. Isso não é material público, e um balde aberto
  -- entrega tudo a quem descobrir o endereço.
  --
  -- Quem exibe pede uma URL assinada de curta duração, e ela é gerada para
  -- quem já entrou.
  false,
  -- 10 MB. Print de tela cabe folgado; anexo de projeto às vezes não, e o que
  -- não couber simplesmente não é copiado — a tela diz que ele existe.
  10485760,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ler é de quem entrou, e só.
--
-- `to authenticated` e não `to public`: é a diferença que faz o balde ser
-- privado de verdade. Sem isto, a política do balde de artigos e a deste
-- seriam a mesma coisa com nomes diferentes.
drop policy if exists "anexos atendimento read" on storage.objects;

create policy "anexos atendimento read" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos-atendimento' and public.is_member());

-- Escrever é de quem entrou, porque quem escreve é a cópia feita pelo servidor
-- com a sessão de quem pediu. Não há upload manual aqui: o conteúdo é espelho
-- da HubSpot, e espelho não se edita.
drop policy if exists "anexos atendimento insert" on storage.objects;

create policy "anexos atendimento insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos-atendimento' and public.is_member());

-- Apagar existe para a lixeira do produto poder levar o anexo junto um dia, e
-- para consertar cópia corrompida. Não há tela que use isto hoje.
drop policy if exists "anexos atendimento delete" on storage.objects;

create policy "anexos atendimento delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos-atendimento' and public.is_member());
