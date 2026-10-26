# Roteiro de MVPs — revisão de 19/10/2026

Revisão feita contra o `main` em `4f1aef1`. Lint, typecheck e os **1.408 testes
(122 arquivos)** passam. Nada abaixo é defeito de compilação: são lacunas de
produto, de operação e de manutenção, ordenadas pelo que destrava mais.

Cada MVP traz: o problema, a evidência que o sustenta, a entrega mínima, o que
conta como pronto e o que precisa ser **discutido** antes de começar.

---

## Andamento

Atualizado a cada sprint. Cada uma tem branch e PR próprios, empilhados: o PR
de uma sprint parte da anterior, e o `main` só muda quando alguém integra.

| # | Sprint | Branch | PR | Estado |
| --- | --- | --- | --- | --- |
| 1 | Higiene de engenharia | `sprint/higiene` | [#33](https://github.com/majyn07/knowledge-intelligence/pull/33) | Integrado |
| 2 | Veredito de IA guardado | `sprint/veredito-guardado` | [#34](https://github.com/majyn07/knowledge-intelligence/pull/34) | Integrado |
| 3 | Fila "levar ao portal" | `sprint/levar-ao-portal` | [#35](https://github.com/majyn07/knowledge-intelligence/pull/35) | Integrado |
| 7 | Avisos lidos por pessoa | `sprint/avisos-por-pessoa` | [#36](https://github.com/majyn07/knowledge-intelligence/pull/36) | Integrado |
| Extra | UX e UI: quebras e acabamento | `sprint/ux-ui` | [#37](https://github.com/majyn07/knowledge-intelligence/pull/37) | Integrado; conferido em produção em 26/10 |
| 6 | Artigos citados pelo suporte | `sprint/artigos-citados` | [#38](https://github.com/majyn07/knowledge-intelligence/pull/38) | Integrado; conferido em produção (39 citações no artigo mais usado) |
| 5 | O artigo resolveu? | `sprint/origem-do-artigo` | a abrir | **Pré-requisito feito** (o artigo guarda a origem, migração `0033` aplicada); a medição em si espera artigos publicados pelo ciclo |
| 4 | Conferir IA contra casos reais | — | — | **Em curso.** Sobreposição conferida (3 pares, vereditos certos); as outras três esperam o Gemini sair da sobrecarga |
| 10 | Manutenção | `sprint/manutencao` | a abrir | Mapa tipado destravado (a causa era `interface`, não a contagem) |
| 8, 9 | Discussões | — | — | Esperam decisão |
| 12 | Classificação da HubSpot no produto | `sprint/classificacao-hubspot` | [#40](https://github.com/majyn07/knowledge-intelligence/pull/40) | **Integrado e em produção.** Classificação trazida em 26/10: 1.022 atendimentos |
| 11 | Segurança | — | — | Aguardando instruções |

---

## Visão geral

| # | MVP | Natureza | Tamanho |
| --- | --- | --- | --- |
| 1 | Higiene de engenharia (CI, README, docs) | Manutenção | P |
| 2 | Veredito de IA que fica guardado | Produto | M |
| 3 | Fila "levar ao portal" | Produto | M |
| 4 | Fechar a verificação das quatro funções de IA | Qualidade | P |
| 5 | O artigo resolveu? (impacto pós-publicação) | Produto | M |
| 6 | Artigos que o suporte já usa para responder | Produto | P–M |
| 7 | Avisos lidos por pessoa, no banco | Produto | P |
| 8 | Sincronização sem aba aberta | Infra / discussão | M–G |
| 9 | Busca semântica para cobertura | Discussão | G |
| 10 | Manutenção do código e do `CLAUDE.md` | Manutenção | M |
| 11 | **Segurança** | **A definir por você** | — |

---

## MVP 1 — Higiene de engenharia

**Problema.** O que protege o `main` hoje é disciplina, não processo.

**Evidência.**
- Não existe `.github/workflows`: os PRs são integrados sem lint, typecheck,
  teste ou build automáticos. O hook do Claude Code só roda na máquina de quem
  edita, e em segundo plano.
- O `README.md` diz "Não há backend nem autenticação" e "Os dados vivem no
  `localStorage`". Está duas fundações atrasado.
- `docs/hubspot-pendencias.md` está com o Markdown escapado (`\*\*`, `` \` ``,
  `\>`): renderiza como texto cru.
- `AGENTS.md` está vazio, e o `CLAUDE.md` o importa.
- Doze branches remotas já integradas (`fix/*`, `feat/*`) e a worktree
  `claude/practical-kare-bc8ffa` continuam existindo.

**Entrega mínima.**
1. Workflow de CI no PR: `lint`, `typecheck`, `test`, `build`.
2. README reescrito: os dois modos, `dev:local`, variáveis declaradas,
   `db:migrate`, link para `estado-do-produto.md`.
3. `hubspot-pendencias.md` desescapado.
4. Limpeza das branches integradas (com sua confirmação, uma lista antes).

**Pronto quando** um PR com teste quebrado não fica verde.

**Discutir.** Proteção de branch no `main` (exigir CI verde) é configuração do
GitHub, fora do código: quer ligar?

---

## MVP 2 — Veredito de IA que fica guardado

**Problema.** Três varreduras caras produzem resultado que **some ao fechar o
diálogo**: sobreposições (`OverlapSweepDialog`), cobertura dos marcados
(`BatchCoverageDialog`) e sugestão de seção (`SuggestSectionDialog`). Nenhuma
persiste o que leu.

**Evidência.**
- 20 pares de sobreposição levam ~11 minutos e cota do provedor. Fechar a aba
  joga isso fora.
- `estado-do-produto.md` §5: "Varredura das 137 sobreposições — nunca terminou
  até o fim". Sem guardar, ela **não pode** terminar em mais de uma sessão.
- O veredito é visto por quem rodou, e só. Outro colega roda de novo o mesmo
  par, pagando de novo.

**Entrega mínima.** Uma coleção `ai_verdicts` (tipo, chave do assunto — par de
artigos, atendimento, artigo —, resposta validada, provedor, quando, quem, e o
`synced_at`/`updatedAt` dos registros lidos). A varredura **pula o que já tem
veredito válido** e retoma de onde parou. O Levantamento passa a mostrar
"complementares / mesmo assunto / diferentes" ao lado do par.

**Pronto quando** a varredura das 137 termina em duas ou três sessões sem
repetir pedido, e o resultado aparece para a equipe inteira.

**Discutir.**
- Quando um veredito **vence**? Proposta: quando qualquer dos artigos lidos
  muda de conteúdo depois dele (comparação por carimbo). Prazo fixo seria
  arbitrário.
- O mapa de tabelas tipadas está cheio (16 entradas). Ou esta tabela vai por
  rota própria, como o `CLAUDE.md` já prescreve, ou é hora de resolver o limite
  (ver MVP 10).
- Rotular como **proposta**, nunca como achado calculado — regra do Levantamento.

### Feito (sprint 2)

- **Escopo:** começou pelas sobreposições, que são o caso caro (um pedido de
  ~30 s por par, 137 pares). Cobertura dos marcados e sugestão de seção ficam
  para depois, porque já ficam visíveis no próprio fluxo (a sugestão é aplicada,
  a cobertura vira artigo).
- **Validade:** decidida pela impressão do pedido (o texto cortado que foi ao
  modelo), e não por prazo. Mudou o texto, o veredito vence, é dito na tela e o
  par volta para a fila.
- **Tabela:** `ai_verdicts` (migração `0029`), fora do mapa tipado, por
  `/api/library/verdicts`. No modo navegador, `lib/storage`.
- **Telas:** a varredura do Levantamento pula o que já foi avaliado e diz
  quantos faltam; a comparação lado a lado mostra o veredito guardado sem novo
  pedido, com "Avaliar de novo".
- **Verificado** no modo navegador contra o Gemini real: avaliar, recarregar,
  abrir a comparação sem novo `POST` e o veredito vencer ao mudar o texto.
  Escrita anônima na tabela nova é recusada pela RLS.
- **Não verificado:** o caminho do banco com uma sessão de verdade (exige
  entrar na tela de login).

---

## MVP 3 — Fila "levar ao portal"

**Problema.** A última perna do ciclo é manual (não há API de Base de
Conhecimento na HubSpot) e **ninguém sabe o que está pendente dela**. O KI
prepara o artigo, alguém cola na HubSpot... ou não.

**Evidência.** Não há estado, campo nem tela que diga "editado aqui, ainda não
está no portal". `updatedAt` é o `lastmod` do portal; quando o KI grava, o
artigo passa a divergir do portal em silêncio. A próxima importação até
resolve sozinha quando alguém colou — mas se ninguém colou, nada aponta.

**Entrega mínima.**
- Derivar, sem campo novo se possível: artigo com `portalArticleId` cujo
  conteúdo gravado aqui é posterior ao `lastmod` do portal → "aguardando
  portal". Artigo novo, publicado aqui e sem `portalArticleId` → "não existe no
  portal".
- Um achado no Levantamento e um filtro na Biblioteca.
- Botão **"Copiar HTML para a HubSpot"** no artigo (o HTML preservado, sem a
  camada de apresentação), e o link direto para o editor do artigo no portal
  quando houver id.
- A próxima importação que trouxer `lastmod` posterior **fecha** a pendência e
  registra evento.

**Pronto quando** dá para responder "o que publicamos aqui e o cliente ainda
não vê?" com um número e uma lista.

**Discutir.** Precisa de um carimbo "gravado aqui em" separado de `updatedAt`
(que é do portal) e de `synced_at` (que é do gatilho). Um terceiro carimbo é a
saída honesta, mas é coluna nova: decidir o nome e o dono.

### Feito (sprint 3)

- **A decisão do "Discutir" mudou na prática:** carimbo de data não serve,
  porque `updatedAt` também se move ao classificar e atribuir (e se move ao
  publicar rascunho). O que ficou é uma **impressão do texto do portal**
  (`portal_baseline`, migração `0030`), gravada pela importação. Diferente do
  texto de hoje é "aguardando o portal"; reimportar fecha.
- **Os 1.831 importados antes do campo:** decididos pelo histórico. Medido no
  banco: só **2** têm edição registrada aqui e ficam "a conferir"; os outros
  ficam "igual ao portal".
- **Telas:** achado "Levar ao portal" no Levantamento (agrupado acima de cinco),
  filtro "portal" na Biblioteca vindo da URL, aviso no artigo com **Copiar para
  a HubSpot** e **Ver no portal**.
- **Achado no caminho:** o artigo nascido aqui, depois de criado no portal,
  entraria na importação seguinte como **duplicata**, porque a importação casa
  por `portalArticleId`. O aviso agora pede o endereço da página criada, confere
  o host e recusa a página que já é de outro artigo.
- **Verificado** no modo navegador: achado, filtro pela URL, recusa e ligação
  pelo endereço.
- **Não verificado:** o sucesso da cópia, que pede o clique de uma pessoa (com
  o painel escondido o navegador recusa, e a tela diz isso); e o fechamento da
  pendência por uma reimportação real do portal.

---

## MVP 4 — Fechar a verificação das quatro funções de IA

**Problema.** `estado-do-produto.md` §5 lista quatro funções com contrato
testado e **resposta do modelo nunca conferida contra caso real**: fila →
artigo, varredura de sobreposição, atualizar artigo com material, avaliar
atendimentos marcados.

**Entrega mínima.** Para cada uma, dois casos reais escolhidos com você, a
resposta registrada, e o defeito que aparecer corrigido. Um script em
`scripts/` (como `hubspot:conferir`) que roda os casos e salva as respostas,
para a próxima troca de modelo ou de prompt ter com o que comparar.

**Pronto quando** o §5 do estado do produto perde essa linha.

**Discutir.** Quais atendimentos e artigos servem de caso? Prefiro que venham
de quem usa, não de mim.

### Em curso (26/10/2026)

- **Varredura de sobreposição**, em produção: 3 pares avaliados e guardados,
  todos "mesma dúvida" e certos. Mas eram o **mesmo artigo duas vezes** —
  título idêntico, 100% do vocabulário —, o que já é achado de duplicata sem
  IA. Corrigido: duplicata sai da fila da varredura.
- O Gemini respondeu **503 "high demand"** na maior parte das tentativas. A
  varredura esperou, tentou de novo e parou dizendo onde. A frase de parada
  saía com ".," e foi corrigida.
- **Avaliar atendimentos marcados estava quebrado em produção** desde 17/09:
  o diálogo só era montado na vista da fila, e a marcação vive na de atender. O
  botão não fazia nada, sem erro. Achado ao exercitar a função; corrigido.
- **Marcados, depois do conserto do botão, em produção:** "erro ao processar
  pórtico espacial" voltou "não existe". Parecia certo e não era: os candidatos
  eram cinco artigos sobre o atendimento, casados pelo e-mail do suporte, e a
  tela oferecia atualizar cada um. Corrigido no PR #44: a busca usa a consulta
  sem correspondência, e "ausente" não traz artigo para atualizar.
- **Reteste depois do #44, em produção (26/10/2026):** o pórtico voltou
  **"já coberto"**, apontando "Erro no processamento do pórtico espacial", o
  artigo que existia e que a busca anterior nem entregava ao modelo. O
  "não existe" de antes estava errado. O DWG/DXF voltou **"coberto em parte"**,
  com "Como importar uma arquitetura no Eberick?" e a lacuna exata: o artigo não
  explica por que o comando fica cinza fora da janela Desenho. Os dois oferecem
  atualizar e, no parcial, criar com o rascunho.
- **Arestas que ficaram:** com "já coberto", a tela ainda oferece "Atualizar
  este artigo" em artigo com "Falta: nenhuma", e listou "Nossos Canais de
  Atendimento" porque o cliente perguntou como falar com alguém.
- **Faltam:** fila vira artigo e atualizar artigo com material.

---

## MVP 5 — O artigo resolveu?

**Problema.** O produto mede o caminho até publicar (funil, tempo do ciclo) e
**para ali**. A pergunta que justifica o hub — "publicar diminuiu o que chega?"
— não tem resposta.

**Evidência.** O tempo do ciclo termina no evento de publicação. Nenhum
indicador olha atendimentos **depois** dela. A triagem já agrupa por assunto e
já sabe que grupo um artigo cobre.

**Entrega mínima.** Para cada artigo publicado a partir de um atendimento (ou
de um grupo da fila), contar atendimentos do mesmo grupo nas N semanas antes e
depois da publicação. Exibir no artigo e num painel, **calculado e rotulado
como tal**, com a ressalva de que correlação não é causa.

**Pronto quando** a página de Métricas tem "assuntos que diminuíram depois do
artigo", com o número de antes e depois.

**Discutir.**
- Janela (4? 8 semanas?) e o mínimo de volume para mostrar — abaixo de um
  punhado o número é ruído.
- O agrupamento por vocabulário muda quando o acervo muda; o "mesmo grupo"
  antes e depois precisa ser estável. Talvez fixar os termos do grupo no
  momento da publicação.

### Medido e adiado (19/10/2026)

Contado no banco: **nenhum** dos 1.831 artigos publicados tem atendimento de
origem registrado (`source`), e o histórico tem **uma** publicação com destino.
Os artigos são do portal, importados; o ciclo atendimento → artigo ainda não
publicou nada pelo produto. Construir agora daria uma tela vazia, ou pior, uma
correlação inventada com o `lastmod` do portal.

**Pré-requisito, e é ele que vale fazer primeiro:** quando um artigo nasce da
fila ("estes 24 atendimentos") ou dos marcados, gravar no artigo **quais**
atendimentos e **quais termos** do grupo o originaram. Hoje `source` guarda um
atendimento só, e a entrega do rascunho não guarda nenhum. Com isso, cada
publicação pelo ciclo passa a ter o "antes" fixado, e o "depois" se mede
sozinho com o tempo. É mudança de modelo e de fluxo, por isso fica para
conversar.

### Pré-requisito feito (26/10/2026)

- O artigo passou a guardar `origemAtendimentos`: os atendimentos e os termos
  do grupo de onde nasceu, e quando (migração `0033`, já aplicada).
- Preenchida pela fila (criar e atualizar) e pelos atendimentos marcados
  (criar e atualizar), na gravação do artigo. Atualizar soma, não troca.
- O artigo mostra "Escrito a partir de N atendimentos", com o assunto de quando
  nasceu.
- **A medição antes e depois continua por fazer**, e por um motivo honesto: só
  existe a partir do primeiro artigo publicado por esse caminho. Quando houver
  alguns com semanas de publicação, ela passa a ter dado.

---

## MVP 6 — Artigos que o suporte já usa para responder

**Problema.** Cobertura hoje é estimada por vocabulário. Existe um sinal
**medido** e ignorado: as respostas do suporte trazem links para
`suporte.altoqi.com.br`.

**Evidência.** Nenhum código lê esses links nas conversas (só um teste da
triagem menciona o domínio, para descartá-lo como ruído).

**Entrega mínima.** Extrair dos 974 fios os links do portal nas mensagens do
suporte, resolver para o artigo do acervo (o resolvedor de link interno já
existe para a leitura) e mostrar:
- no artigo: "citado em N atendimentos" — os artigos que mais trabalham;
- no Levantamento: artigos **nunca** citados há 12 meses (candidatos a revisão,
  não a exclusão);
- na análise: "o suporte respondeu este caso com o artigo X" como evidência.

**Pronto quando** a Biblioteca ordena por "mais citados".

**Discutir.** É dado do suporte sobre o acervo, sem custo de IA nem de
HubSpot (as mensagens já estão aqui). Combina com o MVP 5: artigo citado é
artigo que está resolvendo.

### Feito (sprint 6)

- **Medido antes de construir** (só contagens, nas 975 conversas): 620
  mensagens do suporte com link do portal, **256 artigos** citados em **383
  atendimentos**; 3 links para artigo fora do acervo.
- **Achado na medição:** o primeiro lugar, "Como funciona o Suporte AltoQi?"
  (180 atendimentos), era o link do **rodapé** do e-mail. A contagem usa o mesmo
  corte de texto repetido de `lib/repeatedText` e só a fala do suporte.
- **Telas:** cartão no artigo ("o suporte respondeu N atendimentos com este
  artigo", com os atendimentos) e coluna "Citado pelo suporte" na tabela,
  ordenável por número.
- **Ficou de fora:** o achado "nunca citados" no Levantamento. Seriam ~1.570
  artigos, um achado sem ação; e a evidência na análise do atendimento, que
  pede mexer no prompt e merece conversa.
- **Verificado** no modo navegador com conversas sintéticas.

---

## MVP 7 — Avisos lidos por pessoa, no banco

**Problema.** Limite já anotado no `CLAUDE.md`: a última visita à central de
avisos fica no navegador; ler no computador não marca no celular.

**Entrega mínima.** Coluna `notices_seen_at` em `profiles` (a política de
escrita própria já cobre), com o navegador como recurso no modo local.

**Pronto quando** abrir a central em duas máquinas dá o mesmo estado.

### Feito (sprint 7)

- `profiles.notices_seen_at` (migração `0031`), gravado ao fechar a central.
- Vale a visita **mais recente** entre o navegador e o perfil: nada lido volta a
  ser novo, e o modo sem servidor continua igual.
- **Achado no caminho:** o Postgres devolve a data como `+00` e a central
  compara texto com `Z`; sem converter na leitura, aviso novo sumiria sem ter
  sido lido. Coberto por teste.
- **Não verificado** na tela: exige entrar com duas sessões.

**Discutir.** Nada além do óbvio; está aqui por ser barato e já reconhecido.

---

## MVP 8 — Sincronização sem aba aberta

**Problema.** A busca automática na HubSpot só roda com alguém com o produto
aberto e a aba **em primeiro plano** (20 conversas em 25 min com a aba atrás).
De madrugada e no fim de semana nada entra, e a retomada cobre o vão depois.

**Por que não foi feito.** Cron no servidor não tem sessão, e as políticas
exigem sessão; a chave que ignora RLS foi removida de propósito.

**Caminhos para discutir** (nenhum é código ainda):
1. **Função no banco com escopo mínimo**: um papel Postgres que só escreve em
   `tickets` e `support_conversations` e só via função `security definer`
   chamada por um job (`pg_cron` + `pg_net` ou Edge Function). Não devolve a
   service role ao ambiente.
2. **Conta de serviço comum**: um perfil `@altoqi.com.br` dedicado, cuja
   sessão o job usa. Mais simples, mas é uma credencial longa guardada em
   algum lugar.
3. **Manter como está** e só mover a varredura para um Web Worker, que sofre
   menos estrangulamento em segundo plano. Mitiga, não resolve.

**Discutir.** Isso toca a decisão de segurança da chave privilegiada — talvez
pertença ao MVP 11.

---

## MVP 9 — Busca semântica para cobertura (discussão)

**Problema.** Cobertura, relacionados e "isto já existe?" começam por busca
léxica. Já foi muito melhorada (limiar medido no acervo, corte do e-mail), mas
"modelo IFC deslocado" e "IFC fora da posição" continuam sem se encontrar.

**Opção.** `pgvector` no Supabase e embeddings do Gemini para os 1.824 artigos
(custo único pequeno; reprocessa só o que muda, pelo `synced_at`). A busca
léxica continua como primeira camada e como explicação legível; a semântica
amplia os candidatos que o modelo julga.

**Discutir.** Custo e cota; onde roda o cálculo (servidor, com sessão); como
explicar ao usuário **por que** um artigo é relacionado quando não há palavra
em comum — sem isso, quebra a regra de "o que se mostra se confere".

---

## MVP 10 — Manutenção do código e do `CLAUDE.md`

**Problema.** Três pontos de atrito acumulando:

- **O mapa de tabelas tipadas da Supabase está cheio** (16). Toda tabela nova
  vira rota própria. Vale medir se gerar tipos com `supabase gen types` e
  dividir o `Database` por esquema, ou tipar `from()` por tabela, resolve o
  colapso para `never`.
- **Componentes de 500–850 linhas**: `HelpDeskDialog` (853), `useSharedCollection`
  (759), `LibraryForm` (629), `TicketForm` (593), `LibraryProvider` (563),
  `TicketList` (529). O `useSharedCollection` concentra cache, releitura
  incremental, lotes e eco do tempo real — os três defeitos silenciosos
  registrados no `CLAUDE.md` nasceram ali. Separar em peças testáveis
  (plano de escrita, plano de releitura, cache) reduz o risco do próximo.
- **O `CLAUDE.md` passou de mil linhas.** É o registro de decisões mais valioso
  do projeto, e é carregado inteiro em toda sessão de agente. Proposta: manter
  ali as regras (curtas, imperativas) e mover a narrativa de cada decisão para
  `docs/decisoes/*.md`, com link. A lista de "o que os testes cobrem" virou um
  parágrafo de uma frase só, que ninguém confere.

**Discutir.** O `CLAUDE.md` é seu estilo de documentação; a divisão muda como
ele é lido. Só faço com seu aval e com o formato que você preferir.

### Feito (sprint 10, 26/10/2026)

- **O mapa tipado nunca esteve cheio.** Medido: com 16 tabelas e a linha como
  `type`, compila; volta a `interface`, e os onze erros de `never` reaparecem
  exatamente como o `CLAUDE.md` descrevia. A causa era o genérico da Supabase
  exigir `Record<string, unknown>`, que `interface` não satisfaz.
- `app_settings` e `ai_verdicts` entraram no mapa (17 tabelas), e os oito
  `as never` das rotas saíram. Uma trava de compilação
  (`TODAS_AS_LINHAS_SAO_TYPE`) aponta a tabela culpada se alguém declarar
  `interface` de novo — conferido, o erro nomeia `ai_verdicts`.
- **Ficou de fora:** quebrar os componentes de 500 a 850 linhas, que pede
  sessão própria e medição antes, e dividir o `CLAUDE.md`, que espera o seu
  aval.

---

## MVP extra — UX e UI

**Pedido em 19/10/2026**, com o print da lista de atendimentos cortando filtros,
busca e botão.

**Como foi auditado.** O site em produção fica atrás da proteção de deploy da
Vercel, e o painel do app estava escondido (sem desenhar, sem print). A auditoria
foi por **medição**: cada tela carregada num iframe em 1280, 1440, 768 e 375 px,
com dados **sintéticos** no formato real (mil atendimentos, títulos "Ticket AltoQi
nº…", nomes compostos, conversas longas, 300 artigos). Um script aponta texto
que transborda sem reticências, elemento que sai do pai ou da tela, reticências
em menos de 110 px e texto de ajuda que não cabe. Dado real de cliente não foi
usado: a primeira tentativa o pôs num arquivo servido pelo `public/`, o controle
de permissões barrou, e o arquivo foi apagado.

| Onde | Defeito | Medido antes | Correção |
| --- | --- | --- | --- |
| Atendimentos, lista | Título espremido pela etiqueta de etapa ao lado | ~100 px a 1280 | Etapa na linha do número; título com 187 px |
| Atendimentos, lista | Filtros cortando "Todos os clien", "Qualquer prod" | 108 px cada | Largura mínima; descem de linha |
| Atendimentos, lista | Barra de marcados sem quebra | botão saindo da caixa | `flex-wrap` |
| Atendimentos, vazio | "registrado **em este** projeto" | — | "neste projeto" |
| Atendimentos, análise | Passos com 75 px a 768 | "Atendimento" vazando | Colunas `auto-fit` |
| Biblioteca e Projetos | Busca esmagada pelos filtros | **48 px** a 1280 e 1440 | Barra empilhada |
| Biblioteca | Texto de ajuda não dizia que a busca alcança o texto | — | "Buscar no acervo" + `title` |
| Configurações | Regras de permissão espremidas | 67 px a 375 | Largura mínima real |
| Configurações | Nome da categoria | **3 px** a 375 | Largura mínima e quebra |
| Configurações | Cadastros em duas colunas com o menu aberto | campo com 37 px a 768 | Duas colunas só em `xl` |
| Indicadores | Painéis mais largos que a tela | 413 px em 375 | `min-w-0` no cartão |
| Indicadores | Mapa de cobertura e assuntos | 40–58 px | Largura mínima e quebra |
| Indicadores | Frase longa dentro de etiqueta | passava da tela | Parágrafo |
| Comparar artigos | Valores espremidos ao lado dos rótulos | 47 px a 375 | Rótulo menor no celular, valor quebra |
| Todas | Título do cabeçalho no celular | "Configurações" passava da tela | Ícone some abaixo de `sm`, título 24 px |
| Todas | Rótulos de acessibilidade em inglês | "Toggle Sidebar", "Close", "More" | Em português |
| Projetos | "Novo Projeto" × "Novo artigo" | — | Mesma caixa |

**Pendente e por quê:**

- **Conferência visual.** Tudo acima foi medido, não visto: com o app
  escondido o painel não desenha. Vale abrir as quatro telas no navegador antes
  de integrar.
- **A lista de atendimentos a 1280 continua estreita** (a coluna tem o mínimo de
  16rem). Ficou legível, mas a solução estrutural é a lateral de contexto
  recolher abaixo de 1536 px, como a lista já recolhe. Mexe na regra de altura
  das três colunas, que tem medição própria no `CLAUDE.md`: fica para conversar.
- **Densidade de texto.** Várias telas explicam a própria regra em parágrafos
  longos (Configurações, Indicadores). É coerente com o produto, mas no celular
  empurra o conteúdo para baixo. Proposta: o porquê recolhido atrás de "Por
  quê?", aberto na primeira visita.
- **Teclado e foco:** não auditados nesta sprint.

**Repetida em produção em 26/10/2026**, com os dados reais e a classificação da
HubSpot já trazida (1.022 atendimentos). Achou quatro quebras que o dado
sintético não mostrava, todas das mesmas regras: listas de classificação em duas
colunas a 768 px, cartões de 450 px em 375, o seletor de equipe do perfil e as
ações de pessoa. Corrigidas em `fix/layout-dados-reais`. A tabela de auditoria
passa da tela de propósito: ela tem rolagem horizontal própria.

---

## MVP 12 — Classificação da HubSpot no produto

**Origem.** Em 19/10/2026 a chave ganhou `crm.objects.tickets.read`. Medido só
lendo (nada foi alterado na HubSpot): dos nossos 1.020 atendimentos, a HubSpot
devolve motivo do fechamento em 610, quem abriu em 627, categoria em 461,
produto em 463, causa raiz em 196. No produto, os sete campos estão vazios nos
1.025. Detalhe em `estado-do-produto.md` §3.2.

**Entrega mínima.**

1. Rever o vocabulário (`models/TicketClassification`) contra os catorze
   campos de hoje: a HubSpot ganhou "[Support] Causa", "[Support] Produto" e
   "[Support] Especialidade técnica" desde agosto. Migração para as colunas que
   faltarem.
2. Preencher os 1.025 por `batch/read` (cerca de 11 pedidos de 100), atrás da
   porta de administrador e do freio, como a varredura. Só **leitura** na
   HubSpot; quem grava é o nosso banco.
3. A varredura e a busca por número passam a trazer a classificação junto.
4. **"[Support] Produto" substitui a dedução pelo texto** no recorte por
   produto, com a dedução como recurso onde o campo está vazio — e a tela diz
   qual dos dois.

**Discutir.**

- **Pesquisas de satisfação** (42.091, associáveis ao ticket): dariam "assunto
  com satisfação baixa", que é um sinal forte para a fila. Mas é dado de
  avaliação de cliente: decidir se entra e o que se guarda.
- O freio de requisições vale também para este preenchimento: 11 pedidos é
  pouco, mas é o mesmo servidor.

### Feito (sprint 12)

- **Trava de só leitura no código** (`services/hubspot/readOnly`): o cliente recusa
  todo POST que não seja busca ou leitura em lote. Os três que o produto usava
  passam.
- **Onze campos**, com a propriedade da HubSpot de cada um; os quatro novos do
  Suporte em colunas próprias (migração `0032`).
- **`/api/hubspot/classificacao`**: cem chamados por pedido, rótulo e não valor
  interno, administrador e freio. Verificado contra a HubSpot real pela rota local.
- **Botão nos Indicadores** para quem administra, com progresso, parada e
  aplicação numa escrita só.
- **Filtro de produto** prefere o "[Support] Produto" de quem atendeu.
- **Adaptação à chave nova:** `/api/hubspot/tickets` passou a exigir
  administrador e freio (com o escopo ela funciona, e lista até 500); textos da
  tela de Integrações, do filtro e dos comentários deixam de dizer que o escopo
  falta.
- **Não feito:** clicar o botão em produção (cabe a quem administra, para o
  histórico registrar quem); as pesquisas de satisfação; e conferir se o token
  da HubSpot existe nas pré-visualizações da Vercel (a CLI está com o login
  expirado).

---

## MVP 11 — Segurança

**Reservado. Você define o escopo e a ordem.**

Para informar a decisão, registro o que encontrei na revisão, **sem ter
alterado nada**:

| Achado | Onde | Gravidade |
| --- | --- | --- |
| Qualquer membro pode se tornar administrador: a política `profiles_escrita_propria` permite `update` da própria linha sem restringir colunas, e nada protege `is_admin`. Um `update profiles set is_admin = true where id = auth.uid()` pela API com a chave pública e a sessão própria passa | `supabase/migrations/0020_administrador.sql:73` | **Alta** — anula a única trava de servidor (HubSpot, freio, configurações) |
| O histórico é "acrescentado, nunca editado" só por convenção: a política genérica de `0001` dá `update` e `delete` em `activity_events` a todo membro. A auditoria pode ser reescrita | `supabase/migrations/0001_fundacao.sql:236-270` | Média |
| Cinco das seis ações guardadas são só escondidas na tela (a própria tela diz isso). Esvaziar lixeira e importar em massa poderiam ser conferidos em política ou função no banco | `settings/permissions` | Média — decisão de produto já registrada |
| Rotas de IA sem teto por pessoa: qualquer membro pode consumir a cota diária do provedor num laço | `src/app/api/*` | Baixa–média |
| `src/proxy.ts` só cobre `/` e não renova a sessão da Supabase como o padrão do `@supabase/ssr` sugere; hoje funciona porque o cliente do navegador renova o cookie | `src/proxy.ts` | Baixa — conferir |
| Balde `article-images` público na leitura (decisão registrada) | `0023_imagens_do_artigo.sql` | Informativo |
| O papel `anon` alcança tabelas novas (os privilégios padrão do `public` concedem), e só a RLS impede a leitura: `ai_verdicts` responde `200 []` sem sessão, como as outras. Escrita anônima é recusada. Vale decidir se tabela nova também revoga de `anon` | `0029_vereditos_da_ia.sql` | Baixa — observado na sprint 2 |

Aguardo suas instruções para este bloco.
