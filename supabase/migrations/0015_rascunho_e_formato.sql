-- Rascunho convivendo com a versão publicada, e o formato do conteúdo.
--
-- Editar um artigo publicado exigia recolhê-lo para revisão. Enquanto isso a
-- análise deixava de contá-lo como cobertura documental — corrigir uma vírgula
-- fazia uma seção do portal parecer descoberta.
--
-- Agora o artigo publicado continua publicado, e a próxima versão é preparada
-- ao lado. `jsonb` porque o rascunho é lido inteiro, nunca por um campo só, e
-- nulo é o normal: quase nenhum artigo tem versão em preparo.
alter table public.articles
  add column draft jsonb;

-- O formato do conteúdo, declarado e não adivinhado.
--
-- O que escrevemos aqui é Markdown. O que vier do portal é HTML, e converter
-- nos dois sentidos degrada a cada ida e volta: tabela com atributo, âncora,
-- classe e mídia embutida não sobrevivem à viagem. Guardar o formato junto
-- com o conteúdo é o que permite não converter nunca.
--
-- Padrão `markdown` porque é o que todo artigo existente é.
alter table public.articles
  add column content_format text not null default 'markdown';
