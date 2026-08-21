-- Os nomes que as equipes têm de fato.
--
-- A primeira versão usou "Suporte X" para as quatro, por simetria. A equipe se
-- chama Builder Elétrica, Builder Hidráulica, Eberick Estruturas e Suporte
-- Visus — e nome de equipe não é rótulo nosso para inventar simetria.
--
-- Os identificadores não mudam: eles são o vínculo com tudo que já foi
-- atribuído, e é a mesma regra que vale para categoria e seção. Renomear
-- preserva o passado; trocar o id o apagaria.
update public.teams set name = 'Builder Elétrica'   where id = 'team-suporte-builder-eletrica';
update public.teams set name = 'Builder Hidráulica' where id = 'team-suporte-builder-hidraulica';
update public.teams set name = 'Eberick Estruturas' where id = 'team-suporte-estruturas';
update public.teams set name = 'Suporte Visus'      where id = 'team-suporte-visus';
