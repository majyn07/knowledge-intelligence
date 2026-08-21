@AGENTS.md

# Visus Knowledge Intelligence

Plataforma interna da AltoQi para transformar atendimentos de suporte em
conhecimento publicado, com decisão humana no centro.

## O ciclo

```
Projeto → Atendimento → Análise por IA → Revisão humana
       → Oportunidade → Plano de Melhoria → Conhecimento → Governança
```

O **Projeto** é a unidade de contexto: tudo é escopado a ele, e o projeto ativo
vem do `ProjectProvider`. Nunca leia projeto de outro lugar.

## Arquitetura

Feature-first, conforme `docs/adr/ADR-001.md`. `src/app` contém apenas rotas;
regra de negócio vive em `src/features`.

```
src/app          rotas e API routes
src/features     um diretório por domínio
src/models       contratos compartilhados entre features
src/components   ui (shadcn/base-ui), common, layout, brand
src/services/ai  fronteira de IA, server-only
src/hooks        utilitários de React sem domínio
```

As dez features: `activities`, `analysis`, `dashboard`, `library`, `metrics`,
`people`, `plans`, `projects`, `search`, `taxonomy`.

### Cadeia de dados

```
UI → hook → service → repository → localStorage
```

Persistência sempre atrás de um provider ou repository. **Nunca** leia ou
escreva `localStorage` direto num componente, e nunca mute um array de mock
importado — o mock é semente, não banco.

Todo acesso ao armazenamento passa por `lib/storage`. Escrever pode falhar —
cota estourada, modo privado, acesso negado — e sem tratamento o erro sobe de
dentro de um efeito e derruba a aplicação inteira. Ali a falha vira resultado,
nunca exceção. Não chame `localStorage` diretamente em lugar nenhum.

**Todo dado lido do armazenamento passa por um normalizador.** Um registro foi
gravado por alguma versão do produto, possivelmente anterior à atual, e não
conhece campos que vieram depois. O normalizador recebe `unknown` e garante a
forma completa do modelo, usando os utilitários de `lib/shape`. Sem isso, a
primeira leitura de um campo ausente derruba a tela — foi o que aconteceu com
`author` na Biblioteca. Campo novo no modelo é campo novo no normalizador.

Acervos não têm teto artificial. Cortar análises ou artigos antigos para caber
seria apagar trabalho do usuário em silêncio: preferimos falhar avisando. A
exceção é o histórico de atividades, que tem limite por ser append-only.

### Providers

Ordem em `app/layout.tsx`, de fora para dentro:

```
BrandTheme → Taxonomy → People → Activity → Project
           → Tickets → KnowledgeLifecycle → Plans → Library
           → Panels → Follows
```

`Taxonomy` fica logo abaixo do tema porque não depende de ninguém e quase todo
mundo depende dela: a Biblioteca precisa do vocabulário para migrar o que leu
do armazenamento, e os filtros de artigo e de projeto leem as opções dali.

`Activity` fica acima dos domínios porque todos registram eventos nele e ele não
depende de ninguém. `Tickets` fica acima de `KnowledgeLifecycle` porque a análise
parte do atendimento. `Panels` fica por último pelo motivo inverso: não depende
de ninguém, e quem lê os painéis precisa de todos os domínios acima para contar.

Estado de uma entidade que várias telas consomem é **provider**, não hook solto.
Já pagamos essa dívida uma vez com a Biblioteca.

### Estado persistido e hidratação

Use `usePersistedState` de `src/hooks`. As páginas são pré-renderizadas: se o
estado inicial vier do `localStorage`, servidor e cliente divergem e a
hidratação quebra.

A regra: **servidor e primeiro render do cliente produzem o mesmo HTML**, a
partir da semente canônica. O valor guardado entra num efeito após a montagem.
Vale para qualquer coisa que só o navegador conhece — `localStorage`,
`window.innerWidth`, `matchMedia`, parâmetros de URL (`useQueryParam`). Nunca
resolva com `suppressHydrationWarning` nem `dynamic({ ssr: false })`.

Há **uma** exceção, no `<html>`: o script de aparência escreve
`data-appearance` antes da primeira pintura, e o servidor não tem como saber a
preferência de quem vai abrir. A supressão vale só para os atributos daquele
elemento — nada dentro dele deixa de ser comparado — e sem ela o console
acusava divergência em toda página.

**Enquanto o dado não chegou, a tela mostra esqueleto.** Os providers de
coleção devolvem `isHydrated`, e a semente não deve ser exibida como se fosse
o acervo de quem abriu: piscar conteúdo falso é pior que dizer "ainda não
sei". Os esqueletos vivem em `components/common/page/LoadingSkeleton`, um por
forma de conteúdo, e servidor e primeiro render produzem o mesmo — a regra
acima continua valendo.

### Formulários

O estado do formulário **nasce do prop e não é sincronizado depois**. Para trocar
o registro em edição, o pai remonta o componente com `key={registro.id}`.

Nunca use `useEffect(() => setForm(initialData), [initialData])`: `initialData`
costuma ser um objeto novo a cada render do pai, e o efeito apaga o que está
sendo digitado. Esse defeito já custou uma sessão de depuração.

Campos de texto longo usam `MarkdownField` de `components/common/markdown`, que
já traz barra de formatação e pré-visualização.

Fechar um formulário com alteração pendente pede confirmação. Use
`useUnsavedGuard`: o formulário avisa que ficou sujo via `onDirty`, o diálogo
consulta antes de fechar. Descartar trabalho em silêncio não é opção.

### Falhas

`app/error.tsx`, `app/global-error.tsx` e `app/not-found.tsx` existem. Um erro
de render não pode deixar a tela em branco.

Como os dados vivem no navegador, a causa provável de um erro de render é
conteúdo guardado em formato inesperado — por isso a tela de falha oferece
apagar o armazenamento e voltar à semente, com a consequência escrita antes do
clique.

## Regras de produto

**Nada inventado.** Se um número não pode ser derivado dos dados reais, ele não
aparece. Não rotule métrica calculada como saída de IA. Estado vazio honesto é
sempre melhor que preenchimento. Quando uma seção não tem como ser verdadeira,
ela sai — foi assim com anexos e "Copiloto de IA" no Plano.

**A Biblioteca é a Base de Conhecimento.** Existe um único acervo,
`KnowledgeArticle`. Só artigo **publicado** conta como cobertura documental — a
análise não enxerga rascunho nem revisão.

**Excluir manda para a lixeira.** O registro sai da vista e continua
existindo — com dado compartilhado, quem apaga apaga para catorze pessoas, e o
diálogo de confirmação era a única barreira. Não há prazo de expurgo
automático: apagar trabalho sozinho, num horário que ninguém escolheu, é o
mesmo problema que a exclusão direta tem. Esvaziar é ato de alguém, e a tela
diz o que vai levar antes.

O aviso de exclusão oferece **desfazer**, e é outra necessidade: quem clicou
errado percebe no mesmo segundo e não deveria abrir outra tela para consertar.
A lixeira é a rede durável; o desfazer é a imediata.

Excluir **não bloqueia** por causa do que deriva do registro, mas diz o número
antes do clique: "excluir este atendimento" e "excluir este atendimento, a
análise dele e o plano que ele originou" são decisões diferentes, e a tela
apresentava as duas do mesmo jeito.

A coleção guarda vivo e excluído juntos, e **quem separa é o provider** — não
cada tela. Foi o que impede um artigo na lixeira de contar como cobertura
documental numa análise.

**Máquinas de estado têm caminho de volta.** Artigo e plano podem retroceder:
revisão reprovada volta para rascunho, publicado pode ser recolhido. Um fluxo que
só avança esconde o erro em vez de corrigi-lo.

**Publicar exige intenção, não permissão.** Artigo e plano passam por
`PublishConfirmDialog`, que mostra o que continua incompleto — medido nos
próprios campos — e o efeito da publicação. Nada bloqueia: a equipe é treinada e
decide. Fricção que informa, não que atrapalha.

**Pessoa é conta; equipe é cadastro.** No modo compartilhado a lista de
pessoas é quem entrou — não há cadastro manual, e nenhum nome de colaborador
vive no código. Enquanto um colega não acessa, a equipe dele recebe a
atribuição. Sem servidor não há login, e o campo "atuando como" volta a ser
texto: melhor um nome digitado que histórico com autoria vazia.

**Acompanhar não é assumir.** Quem abriu o atendimento que originou o plano
quer saber quando ele publica, e não vai virar responsável por isso. O
acompanhamento é a única coleção **por pessoa** do produto — o resto descreve
trabalho, ele descreve interesse — e fica numa lista separada de "Meu
trabalho": juntar as duas faria a fila de alguém crescer por interesse dos
outros. A política do banco continua a mesma; quem filtra por pessoa é a tela.

**Menção guarda identificador, como a atribuição.** O comentário grava
`@[Nome](id)`; quem exibe resolve o id e mostra o nome de hoje. O rótulo vai
junto porque é o que sobra quando a conta some — e sobrar "@Raoni" é melhor
que sobrar "@pes-7f3a". Menção que não resolve mais **não é apagada**: o
comentário é registro do que foi dito, e não se reescreve.

**Não há papéis, por decisão.** A equipe é treinada e o histórico responde por
quem fez o quê. A política do banco é a mesma em todas as tabelas; se um dia
houver papéis, ela muda ali e em nenhum outro lugar.

**A equipe é sugerida, nunca derivada.** Cada equipe declara em Configurações
por quais categorias do portal responde, e classificar um artigo preenche o
autor a partir disso — sem sobrescrever quem já foi escolhido, e dizendo na
tela que a sugestão foi dela. Derivar automaticamente criaria um responsável
que ninguém escolheu, e em QiOnboarding ou Novidades de Release, que não têm
equipe óbvia, o palpite apareceria com cara de decisão. Duas equipes na mesma
categoria desligam a sugestão: escolher uma seria arbitrário, e arbitrário com
cara de sugestão é pior que campo vazio.

O mapa é **cadastro, não constante** — mesma razão do resto da classificação:
as categorias do portal mudam e as equipes mudam, e ninguém vai abrir o código
para acompanhar.

**Atribuição guarda identificador, não nome.** Era nome, com a justificativa de
que remover alguém não apagaria o registro de quem conduziu. Com conta, o nome
passou a ser editável pela própria pessoa, e renomear orfanaria tudo. Quem
preserva o passado é o histórico, que guarda o rótulo do evento.

O resolvedor reconhece nome também, então registro anterior continua legível e
vira identificador sozinho na próxima gravação — sem migração de dados. O que
não resolve é exibido como veio, nunca como "sem responsável".

**Referências a HubSpot, Zendesk, Vercel e CRMs são pedidos de maturidade**
funcional e de UX, nunca de integração ou de importar o domínio deles. Traduza o
princípio para o nosso ciclo.

**Integração real exige autorização explícita.** Ligar rede ou credencial exige
pedir antes. O acesso à HubSpot será mediado pela Claude, não por adapter REST
direto — a fronteira será desenhada na sprint de Atendimentos remotos, contra a
forma que a Claude realmente devolver.

## Fundação compartilhada

O produto tem **dois modos**, e a diferença é declarada, não deduzida.

Sem `NEXT_PUBLIC_SHARED_WORKSPACE=on`, tudo roda sobre o `localStorage` como
sempre rodou. Com ela, e com o Supabase configurado, o acesso passa a exigir
e-mail `@altoqi.com.br` e os dados vêm do banco.

A virada é uma variável própria porque a integração da Vercel injeta as
credenciais do Supabase em todos os ambientes assim que é provisionada. Se a
presença delas decidisse, o primeiro deploy trancaria todo mundo numa tela de
login com a camada de dados pela metade.

`getSupabase()` devolve `null` quando não há backend. Ausência de servidor é
estado previsto, não erro: nenhuma variável faltando vira exceção dentro de um
efeito.

A restrição de domínio vive **no banco** — `check constraint` na tabela de
perfis e gatilho em `auth.users`. A conferência na interface existe só para
dar erro legível. Não há senha em lugar nenhum: o acesso é por link no e-mail.

A chave de serviço está no ambiente e **não é usada em lugar nenhum**. Ela
ignora as políticas de acesso, e nenhuma operação do produto precisa disso.

Schema em `supabase/migrations`, aplicado por `npm run db:migrate`. Coluna de
verdade para o que é filtrado, ordenado ou contado; `jsonb` para o conteúdo
profundo que só é lido inteiro.

Tabela nova precisa de `grant` explícito para `authenticated`: RLS decide
quais linhas aparecem depois que a tabela é alcançável, não se ela é
alcançável.

### Como o dado chega às telas

`useSharedCollection` devolve `[itens, definir, hidratado]` — a mesma
assinatura de `usePersistedState` — e decide sozinho entre banco e navegador.
Provider não sabe de onde o dado vem, e não deve saber.

A escrita compara o estado anterior com o novo e manda só a diferença. O tempo
real relê a coleção inteira em vez de aplicar o evento recebido: aplicar erra
quando os eventos chegam fora de ordem ou quando um se perde na reconexão.

Taxonomia é a exceção — são três tabelas compondo um objeto, com repositório
próprio, porque a ordem entre elas importa: categoria entra antes de seção e
sai depois.

**Chave de armazenamento vem de `STORAGE_KEYS`**, nunca de literal. Cada
provider repetia a própria, e a duplicação já produziu divergência real: a
migração procurou `visus-plans` enquanto o provider gravava em
`visus-improvement-plans`.

Serviço constrói registro; **quem persiste é a coleção**. O `projectService`
escrevia direto no armazenamento, o que o prendia a uma fonte só.

Ordem de subida importa e não pode ser paralelizada: projeto, atendimento,
conversa, análise, plano, artigo, histórico. Atendimento referencia projeto,
conversa referencia atendimento, artigo referencia projeto e seção. Painel vai
por último, sem consequência: ele não referencia ninguém.

## Taxonomia

O `suporte.altoqi.com.br` **é** a base de conhecimento publicada, em HubSpot
Knowledge Base. A Biblioteca é o espelho local dele, não um acervo paralelo, e
a estrutura é a dele: **categoria → seção → artigo**. O portal não tem campo
de tipo.

O artigo aponta para `sectionId`, e a categoria vem da seção — guardar as duas
permitiria que divergissem. `portalArticleId` guarda a identidade no portal,
sem a qual sincronizar criaria duplicata a cada importação.

**Nada de classificação é fixo no código.** Categoria, seção, gênero e tipo de
oportunidade são cadastro, editável em Configurações. A semente é a estrutura
do portal como levantada — 13 categorias e 146 seções —, mas o portal muda e
ninguém vai abrir o código para acompanhar.

Disso decorre uma regra: **filtro lê do cadastro, nunca de constante**. Vale
para a Biblioteca e para Projetos. Antes eram listas fixas, e o formulário
podia discordar do filtro sobre quais produtos existem.

Vazio é estado legítimo em `sectionId` e `genreId`. Quando a migração de um
registro antigo não encontra correspondência, ela **deixa vazio em vez de
chutar**: encaixar na seção mais parecida seria classificação inventada, e
ninguém saberia que foi palpite. O artigo aparece no filtro "Sem seção" e
alguém decide.

Renomear preserva o id — o vínculo com o artigo é o identificador, não o
texto. Remover categoria leva junto as seções dela e deixa os artigos
apontando para o vazio, de propósito, pelo mesmo motivo.

Máquina de estado **não** é lista de preenchimento: o estágio do artigo e do
plano continua fixo no código, porque tem transição, teste e indicador
amarrados. O status da oportunidade também.

## Identidade visual

O kit de marca vive em `brand/`, **fora de `public/`** — são arquivos de
impressão, de até 2,6 MB, que ninguém deve baixar pelo navegador. Em
`public/brand/` ficam só as versões de web, geradas a partir dele com `sharp`
e recortadas na margem transparente: nenhuma passa de 8 kB.

A regra de uso sai dos próprios arquivos, que são variantes de fundo:

| Sufixo | Uso |
| --- | --- |
| `-1` | colorida, fundo claro |
| `-4` | colorida, fundo escuro |
| `-2` | monocromática escura |
| sem sufixo | toda branca |

O sidebar é escuro, então usa `-4`. Marca em imagem dentro de container
flex-column **precisa de `self-start`**: o padrão é esticar, e a marca sai
deformada na largura.

Poppins é a fonte da identidade e vem de `src/fonts`, servida por
`next/font/local`. A família tem 18 pesos; a interface carrega quatro.
Não voltar para fonte do Google — a marca não depende de terceiro.

### Aparência

A aparência vive em `data-appearance` no `<html>`, e não numa classe. O tema
precisa estar aplicado antes da primeira pintura, senão a tela pisca clara —
isso exige um script antes do React, e mexer em `className` do `<html>` nesse
momento produziria divergência de hidratação. Atributo que não aparece no JSX
o React não compara.

O bloco escuro usa `:root[data-appearance="dark"]`, com o `:root` deliberado:
os temas de produto têm a mesma especificidade e vêm antes no arquivo. Sem
ele, a primária do produto venceria o escuro.

Cada produto tem bloco próprio dentro do escuro. Sem isso os três ficariam
idênticos, porque a primária viria toda do verde institucional.

### Duas cores por tema, não uma

`--brand` é o tom exato da marca, medido do arquivo. `--primary` é esse tom
escurecido até texto branco fechar 4,5:1. Onde a cor é identidade vale
`--brand`; onde ela vira fundo de botão vale `--primary`.

Sem a separação, ou a marca sai errada ou o botão fica ilegível: o verde
AltoQi `#00CC78` puro dá 2,4:1 com branco, e o laranja Builder dá 2,8:1.

Cor nova passa por medição de contraste antes de entrar. Estimar a olho já
produziu dois valores reprovados nesta mesma sprint.

## IA

Gemini é o provider atual (`services/ai/server/geminiService.ts`), isolado atrás
de `analysisAIService`. GPT saiu do roadmap; Claude entra numa sprint própria.

O acervo vive no navegador, então a **busca de artigos roda no cliente** e o
contexto chega ao servidor com a evidência já resolvida — atendimento, conversa e
artigos relacionados. O servidor valida com schema estrito
(`analysisRequestSchema`) e monta o prompt. A resposta estruturada também é
validada (`analysisResponseSchema`); id e status de oportunidade são atribuídos
internamente, **nunca pelo modelo** — quem decide é a revisão humana.

## Prazos

Data só é data em **ISO 8601**, e a leitura recusa o resto. `new Date("15 jul.
2026")` funciona em alguns motores e falha em outros — aceitar significaria o
mesmo registro mostrando prazos diferentes em máquinas diferentes, sem nada
indicando o problema.

**Dia de calendário não é instante.** A data do atendimento é o dia em que ele
aconteceu, e dia não tem fuso: `lib/dates` trabalha sobre os componentes do
texto e nunca sobre um `Date`, porque `new Date("2026-08-01")` é meia-noite em
Greenwich — 31 de julho no Brasil. O erro só aparece na virada do mês, que é
justamente onde ninguém olharia para conferir. Instante continua em ISO
completo; dia fica em `aaaa-mm-dd`.

Campo de data é **campo de data**, não texto livre. O do atendimento aceitava
"ontem", e o que não dá para situar no tempo cai fora de toda janela. O
normalizador converte o `dd/mm/aaaa` que está gravado e esvazia o que não é
data — a tela diz que falta, em vez de deixar o campo parecer preenchido.

Isso vale para o que o produto **grava**, e não só para o que ele lê: o plano
nascia com `createdAt` em texto de exibição — "20 de ago. de 2026, 18:23" —
apesar de o modelo dizer ISO, e por isso o painel de planos por mês não
contava nenhum plano criado dentro do produto. Quem formata é a tela, na
leitura, com `RelativeDate`.

A conferência de transbordo vale só para `YYYY-MM-DD`: `2026-02-30` viraria
2 de março em silêncio. Com hora e sem fuso a leitura é local, e comparar
componentes UTC recusaria datas legítimas do fim do dia a oeste de Greenwich.

**Atrasado e parado são perguntas separadas.** Um plano sem prazo pode estar
parado; um com prazo distante também. Juntar as duas esconderia metade do
problema.

Parada se mede pelo último evento do histórico, nunca por `updatedAt`: o
histórico registra o que aconteceu, e `updatedAt` muda por gravação
incidental — uma delas faria um plano parado há um mês parecer recém-tocado.

Contador e fila convivem porque respondem coisas diferentes: um diz que existe
trabalho, a outra diz por onde começar.

## Histórico

Todo fato relevante do ciclo vira um `ActivityEvent`, gravado pelo provider da
própria feature. Eventos são **acrescentados, nunca editados**: registram o que
aconteceu, não o estado atual. O evento guarda o rótulo do assunto, então o
registro sobrevive à exclusão do registro original.

Mudança de estágio grava `transition: { from, to }` em **chave**, não em
rótulo: rótulo é apresentação e muda, chave é contrato. Antes disso o destino
vivia só no texto do `detail`, e "quantos artigos foram publicados neste mês"
não tinha resposta sem interpretar frase.

Eventos anteriores ao campo não têm transição e ficam de fora das contagens por
destino — **a tela diz isso**. Preenchê-los exigiria interpretar o texto, que é
o problema que o campo resolve; e número parcial apresentado como completo é
pior que número com ressalva.

O funil conta **chegadas**, não registros parados no estágio: um artigo que
passou por revisão e foi publicado passou pelos dois, e contar só onde ele está
agora esconderia metade do caminho.

Média de nada é `null`, nunca zero — zero diria "chega instantaneamente".

Relógio nunca é lido durante o render. Use `useNow`: ler no render é impuro e
diverge na hidratação, porque servidor e cliente têm horas diferentes.

## Painéis

O painel guarda a **pergunta**, não a resposta: origem, quebra, janela e forma
de visualizar. O número é recalculado a cada abertura, sobre os dados que
existem agora — gravar o resultado seria gravar um número que envelhece em
silêncio.

`runPanel(spec, dados, agora)` é puro e recebe tudo pronto: os providers já têm
as coleções em memória, então somar mais um cartão não custa consulta nenhuma.

**Nem toda quebra serve a toda origem.** `allowedBreakdowns` diz o que cada uma
sabe responder, e `reconcileSpec` conserta a combinação impossível em vez de
gravá-la — "atendimentos por gênero" produziria uma coluna vazia com cara de
dado. A correção acontece na frente de quem edita, não depois.

Painel é **compartilhado**, como o resto do produto: não há papéis, e inventar
"meu painel" criaria uma noção de dono que nada mais aqui tem. Os padrão são
semente editável, com `defaultPanels` de volta pelo botão de restaurar — e os
que a equipe criou continuam onde estavam.

A quebra para em **duas dimensões**. Três não cabem numa tabela que se lê de
relance, e a leitura passaria a exigir girar um cubo — que é outro tipo de
ferramenta, não uma versão mais completa desta. Cruzamento só sai em tabela:
barra empilhada esconderia metade dos números.

A imagem é desenhada por `panelToSvg`, que é **puro** — o mesmo painel produz
sempre o mesmo arquivo, e o desenho é conferido por teste em vez de olhado. Só
a rasterização para PNG precisa do navegador. As cores vão escritas no
arquivo: a imagem sai daqui para uma apresentação, onde não existe `:root`
para resolver `var(--primary)`.

Classificação vazia vira "Não definido" e **continua na tabela**: escondê-la
faria a soma das linhas não bater com o total, sem ninguém saber por quê.

Data que não dá para situar no tempo fica fora da janela e **vira ressalva**.
`timeOf` lê ISO e `dd/mm/aaaa`, porque o atendimento guarda `"15/07/2026"`
desde a primeira versão — sem isso o painel mostrava zero com três atendimentos
na tela. O que sobra — `"Ontem, 16:20"` dos planos migrados — não é chutado:
aparece contado à parte, na ressalva.

## Convenções

- Serviços em camelCase: `articleService`, `projectService`, `planService`
- Diretórios `repositories/` no plural, `mock/` no singular
- Tipos compartilhados em `src/models`; locais em `features/*/types`
- Texto de interface em pt-BR; erros tipados, não strings soltas
- `import "server-only"` em tudo que toca chave de API
- Comentário explica **por que**, não o que o código já diz
- JSX legível: nada de componente inteiro numa única linha
- Edição por script precisa normalizar fim de linha: o repositório usa
  `core.autocrlf`, e um `\r` sobrando quebra o `git diff --check`

## Trabalho por sprint

Uma branch por sprint, nomeada pelo que a sprint entrega
(`sprint/atendimentos`, `sprint/governanca`). Um commit por sprint, com o corpo
descrevendo o que mudou e o que ficou de fora. Não avance para a próxima sprint
sem apresentar o resultado e receber autorização.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run dev:local` sobe o produto com a fundação compartilhada desligada, sem
mexer no `.env.local` — conferir o modo navegador exigia editar o arquivo e
lembrar de desfazer, e esquecer o desfazer deixa a equipe inteira sem banco.

Um hook `PostToolUse` em `.claude/settings.json` roda `typecheck` e `test` em
segundo plano após edições em `.ts`/`.tsx`, avisando só quando algo quebra.

Data na tela é `RelativeDate`: relativo no texto, instante exato no título.
O valor relativo entra depois da montagem — servidor e cliente têm relógios
diferentes, e "há 2 minutos" divergiria na hidratação.

A trilha de navegação sai do **mesmo cadastro de rotas** do menu
(`components/layout/navigation`): duas listas do mesmo vocabulário divergem, e
a divergência apareceria como o menu dizendo "Métricas" e a trilha dizendo
outra coisa. O identificador do registro só vira degrau quando a tela passa o
nome — `uuid` na trilha é pior que trilha curta.

Indicador tem **recorte por equipe**, e ele vale só para plano e artigo, que
têm responsável. Atendimento e análise não têm atribuição, e a tela diz isso
em vez de deixar supor que tudo foi recortado.

`Ctrl+K` abre busca, comandos e "onde você estava". Comando é navegação;
publicar, aprovar e excluir ficam de fora, porque pedem intenção e uma lista
percorrida com a seta não é lugar para isso. `/` faz o mesmo e `?` lista os
atalhos — convenção de mercado, não invenção nossa.

Atalho de tecla única precisa da guarda de digitação: `/` e `?` são caracteres
comuns em português, e sem ela escrever "e/ou" abriria a paleta no meio da
frase.

Vistos recentemente ficam no navegador mesmo no modo compartilhado: "onde
**eu** estava" é sobre esta máquina, e sincronizar entre catorze pessoas
viraria ruído.

Testes cobrem lógica pura, nunca componentes: motor de busca e busca
transversal, transições de artigo e de plano, métricas por projeto e por
período, parsing da resposta da IA, índice do artigo, critérios de publicação,
fronteira de armazenamento, o cadastro de taxonomia com a migração da
classificação antiga, os normalizadores de artigo, plano e atendimento, o motor
e o desenho dos painéis, a trilha de navegação, o recorte por equipe, as
menções e o que se acompanha.
Ao mexer em qualquer uma delas, o teste vem junto.

Dois cuidados que já custaram tempo: `npm test` **não** faz typecheck — só o
`typecheck` pega erro de tipo em arquivo de teste; e o hook roda em segundo
plano, então o aviso de falha chega depois da edição, não junto dela.
