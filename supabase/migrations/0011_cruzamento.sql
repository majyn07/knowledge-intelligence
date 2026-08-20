-- Segunda quebra no painel.
--
-- Uma dimensão responde "quantos por estágio". Duas respondem "quantos por
-- estágio em cada seção do portal", que é a pergunta que de fato se faz numa
-- reunião de cobertura — e a que obrigava a montar seis painéis e comparar de
-- cabeça.
--
-- Coluna de verdade e não `jsonb` porque ela é lida em toda montagem de tela,
-- junto com a primeira. Nulo é o normal: o cruzamento é a exceção.
alter table public.dashboard_panels
  add column breakdown_2 text;
