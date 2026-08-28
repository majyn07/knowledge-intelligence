-- Um carimbo que responde "esta linha mudou no banco", e nada além disso.
--
-- O tempo real relê o estado atual em vez de aplicar o evento recebido, e essa
-- decisão continua: aplicar erra quando os eventos chegam fora de ordem ou
-- quando um se perde na reconexão. O que não dá para manter é o preço. Com o
-- portal importado, um colega classificando **um** artigo faz cada aba aberta
-- da equipe baixar os 22,7 MB do acervo inteiro.
--
-- Com o carimbo, a releitura vira dois passos: a lista de identificadores com o
-- carimbo, que são cento e dez kilobytes, e depois só as linhas cujo carimbo
-- mudou.
--
-- `updated_at` não serve para isso, e é importante dizer por quê. Ele é do
-- produto: a importação do portal grava ali o `lastmod` do artigo publicado, e
-- é por ele que a varredura sabe o que já está em dia. Salvar rascunho não o
-- toca, restaurar da lixeira também não. Um trigger que o sobrescrevesse
-- consertaria a releitura e quebraria a varredura, que passaria a rebaixar
-- 1.822 páginas do portal a cada execução.
--
-- Então são dois carimbos com dois donos. `updated_at` é da equipe e aparece na
-- tela; `synced_at` é da infraestrutura, nunca é exibido, e nenhuma regra de
-- produto o lê.
alter table public.projects        add column if not exists synced_at timestamptz not null default now();
alter table public.tickets         add column if not exists synced_at timestamptz not null default now();
alter table public.analyses        add column if not exists synced_at timestamptz not null default now();
alter table public.plans           add column if not exists synced_at timestamptz not null default now();
alter table public.articles        add column if not exists synced_at timestamptz not null default now();
alter table public.activity_events add column if not exists synced_at timestamptz not null default now();

comment on column public.articles.synced_at is
  'Quando a linha foi gravada. Da infraestrutura, para a releitura incremental saber o que mudou. Não é updated_at, que é do produto e guarda o lastmod do portal.';

-- O carimbo é do banco, e não do cliente.
--
-- Se dependesse do que a aplicação manda, ele herdaria o problema que veio
-- resolver: bastaria um caminho de escrita esquecer de preenchê-lo para a
-- releitura passar por cima de uma mudança, e ninguém veria. Aqui o valor que
-- vier junto é descartado.
create or replace function public.marcar_gravacao()
returns trigger
language plpgsql
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

do $$
declare
  nome text;
begin
  foreach nome in array array[
    'projects', 'tickets', 'analyses', 'plans', 'articles', 'activity_events'
  ]
  loop
    execute format('drop trigger if exists carimbo_de_gravacao on public.%I', nome);

    execute format(
      'create trigger carimbo_de_gravacao before insert or update on public.%I
         for each row execute function public.marcar_gravacao()',
      nome
    );
  end loop;
end;
$$;

-- Sem índice novo, de propósito.
--
-- A releitura pede **todos** os carimbos, não uma faixa deles, e as duas
-- consultas ordenam por `id` para paginar de forma estável: a chave primária já
-- responde por isso. Índice em `synced_at` só pagaria por si se alguém
-- filtrasse por ele, e ninguém filtra.
