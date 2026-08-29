-- Onde as imagens dos artigos escritos aqui ficam.
--
-- 1.771 dos 1.822 artigos do portal têm imagem: o acervo é feito de prints.
-- Até aqui o editor sabia formatar texto e não sabia acrescentar uma figura, o
-- que deixava a edição pela aplicação capaz de corrigir uma frase e incapaz de
-- documentar um passo.
--
-- As imagens do portal continuam onde estão, servidas pela HubSpot: elas são do
-- artigo publicado e não se movem. Este balde é para o que nasce aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  -- Público na leitura, e é decisão.
  --
  -- O `<img src>` de um artigo precisa carregar para quem abre, e URL assinada
  -- expira: um artigo com imagem quebrada em três dias é pior que uma imagem
  -- que alguém com o endereço consegue ver. O acervo espelha um portal público,
  -- então o conteúdo já é público por natureza; o que não pode é qualquer um
  -- **escrever**, e disso cuida a política abaixo.
  true,
  -- 5 MB. Print de tela cabe folgado, e o teto existe para um vídeo colado por
  -- engano não virar um upload de duzentos megabytes.
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Escrever é de quem entrou, como todo o resto do produto.
--
-- Não há papéis aqui: quem pode editar o artigo pode pôr imagem nele. A
-- exceção do administrador vale para a HubSpot, que é gasto contra máquina de
-- terceiro, e não para o conteúdo.
drop policy if exists "article images insert" on storage.objects;

create policy "article images insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images' and public.is_member());

-- Trocar e remover também, pelo mesmo motivo: a imagem errada num artigo é
-- problema de quem edita o artigo, e mandar pedir para alguém é atrito sem
-- ganho.
drop policy if exists "article images update" on storage.objects;

create policy "article images update" on storage.objects
  for update to authenticated
  using (bucket_id = 'article-images' and public.is_member());

drop policy if exists "article images delete" on storage.objects;

create policy "article images delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'article-images' and public.is_member());

-- Ler é de todos, inclusive de quem não entrou: é o que faz o `<img>` carregar.
drop policy if exists "article images read" on storage.objects;

create policy "article images read" on storage.objects
  for select to public
  using (bucket_id = 'article-images');
