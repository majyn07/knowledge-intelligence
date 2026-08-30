@AGENTS.md

# Visus Knowledge Intelligence

Plataforma interna da AltoQi para transformar atendimentos de suporte em
conhecimento publicado, com decisão humana no centro.

## O ciclo

```
Projeto → Atendimento → Análise por IA → Revisão humana
       → Oportunidade → Plano de Melhoria → Conhecimento → Governança
```

O produto é um **hub**: um lugar só onde o atendimento vira levantamento, o
levantamento vira melhoria e a melhoria vira conteúdo publicado. Ele nasceu de
um trabalho manual (alguém percorrer o acervo para descobrir o que criar,
atualizar ou revisar) e existe para que esse levantamento deixe de ser manual.

**O Levantamento é a tela que carrega esse propósito.** Ela responde "o que o
acervo está pedindo", e cada achado diz o que fazer, por que, e leva para onde
se faz. Sem o "por que" seria lista de tarefas, e sem o destino seria painel.

O que dá para derivar dos dados é **calculado e rotulado como tal**; só o que
exige ler texto e comparar sentido pede modelo, e esse vem marcado como
proposta. Achado que não pode ser verificado não é gerado: quem segue a lista
uma vez e encontra trabalho inexistente para de seguir a lista.

Achado se agrupa quando a granularidade vira ruído, e isso apareceu duas vezes.
Uma linha por seção descoberta produziu **117 achados**: a lista do portal
inteiro, afogando os três que alguém resolveria naquele dia. Por categoria, a
mesma informação vira mapa: "50 de 50 seções do Builder" diz onde o acervo está
ausente sem mandar ninguém escrever cinquenta artigos. Depois, com o acervo
importado, "artigo sem seção" produziu **600**, e acima de um punhado vira um
achado só, porque ali o caminho deixa de ser abrir um registro e passa a ser o
mutirão da Biblioteca.

Disso decorre a divisão que organiza tudo:

**O acervo é do hub, e não tem recorte.** Ele espelha **um** portal, com uma
taxonomia, e o lugar do artigo é a seção. A Biblioteca, a cobertura documental
e o aviso de duplicata trabalham sobre o acervo inteiro, sempre.

**O Projeto é uma iniciativa de melhoria**, não a unidade de contexto de tudo:
um esforço datado, com meta, que os atendimentos alimentam. Ele recorta o que é
**trabalho** (atendimento, análise, oportunidade, plano) e nunca o acervo.

Confundir os dois já custou um defeito real: a Biblioteca filtrava por projeto
enquanto o mapa de cobertura media todos, e a semente tinha um artigo invisível
por estar noutra iniciativa. Com a importação, o mesmo erro carimbaria mil e
oitocentos artigos do portal com uma iniciativa que não os originou.

Essa confusão também estava **no esquema**: `articles.project_id` nasceu
obrigatório e com `on delete cascade`, de quando todo artigo vinha de um
projeto. O `localStorage` não tem chave estrangeira, então ninguém notou. Até
mil oitocentos e vinte e dois artigos do portal serem recusados pelo Postgres no
fim de uma varredura de quarenta e cinco minutos. Hoje aceita nulo, e apagar
uma iniciativa não leva junto artigo que nunca foi dela.

E estava **nas telas**, em quatro lugares, cada um errando de um jeito
diferente pelo mesmo motivo. O pior: a busca que a análise faz por artigos
relacionados recortava pelo projeto do atendimento, então toda análise
respondia "nada cobre isto" sobre um portal que cobre. Os outros três: o
histórico não mostrava nada do acervo, o funil perdia a última perna e o cartão
"Conteúdos publicados" marcava zero com a Biblioteca cheia.

Nenhum deles aparecia enquanto o acervo cabia numa iniciativa. O que os revelou
foi o `projectId` vazio de mil oitocentos e vinte e dois artigos: a mesma
mudança, vista de quatro ângulos.

Evento sem iniciativa é do acervo e **acompanha qualquer uma**, porque não
existe iniciativa a que ele pertença; quem decide isso é `eventsInScope`, numa
peça só, para as duas telas não divergirem. Já vazio da iniciativa continua
sendo sobre **trabalho**: contar o acervo ali faria uma iniciativa recém-criada
nunca parecer nova.

O projeto ativo vem do `ProjectProvider`. Nunca leia projeto de outro lugar,
e, antes de escopar algo por ele, pergunte se aquilo é trabalho ou acervo.

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

As onze features: `activities`, `analysis`, `dashboard`, `library`, `metrics`,
`people`, `plans`, `projects`, `search`, `survey`, `taxonomy`.

### Cadeia de dados

```
UI → hook → service → repository → localStorage
```

Persistência sempre atrás de um provider ou repository. **Nunca** leia ou
escreva `localStorage` direto num componente, e nunca mute um array de mock
importado: o mock é semente, não banco.

**A semente é o que é real e estrutural, e nada além.** Taxonomia do portal,
equipes do suporte e painéis padrão ficam; projeto, atendimento, conversa,
análise, plano, artigo e pessoa foram esvaziados quando o produto passou a
receber dado de verdade. Dado inventado num hub de conhecimento é pior que tela
vazia: quem entra pela primeira vez não tem como saber que aquilo não é
trabalho da equipe, e o levantamento passaria a apontar tarefa que não existe.

O banco compartilhado se limpa por script, nunca à mão: `npm run db:status`
conta o que existe, e `npm run db:limpar-demo` só apaga com `--confirmar`, numa
transação, preservando taxonomia, equipes, perfis e painéis. Apagar dado
compartilhado apaga para catorze pessoas.

Todo acesso ao armazenamento passa por `lib/storage`. Escrever pode falhar
(cota estourada, modo privado, acesso negado) e sem tratamento o erro sobe de
dentro de um efeito e derruba a aplicação inteira. Ali a falha vira resultado,
nunca exceção. Não chame `localStorage` diretamente em lugar nenhum.

**Todo dado lido do armazenamento passa por um normalizador.** Um registro foi
gravado por alguma versão do produto, possivelmente anterior à atual, e não
conhece campos que vieram depois. O normalizador recebe `unknown` e garante a
forma completa do modelo, usando os utilitários de `lib/shape`. Sem isso, a
primeira leitura de um campo ausente derruba a tela. Foi o que aconteceu com
`author` na Biblioteca. Campo novo no modelo é campo novo no normalizador.

Acervos não têm teto artificial. Cortar análises ou artigos antigos para caber
seria apagar trabalho do usuário em silêncio: preferimos falhar avisando. A
exceção é o histórico de atividades, que tem limite por ser append-only.

### Providers

Ordem em `app/layout.tsx`, de fora para dentro:

```
BrandTheme → Taxonomy → People → Activity → Project
           → Tickets → KnowledgeLifecycle → Plans → Library
           → Panels → Follows → SavedViews
```

`Taxonomy` fica logo abaixo do tema porque não depende de ninguém e quase todo
mundo depende dela: a Biblioteca precisa do vocabulário para migrar o que leu
do armazenamento, e os filtros de artigo e de projeto leem as opções dali.

`Activity` fica acima dos domínios porque todos registram eventos nele. Depende
só de `People`, e por um motivo: o evento carimba **quem** age, e perguntar num
lugar só é o que impede vinte e dois chamadores de divergirem. `Tickets` fica acima de `KnowledgeLifecycle` porque a análise
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
Vale para qualquer coisa que só o navegador conhece, `localStorage`,
`window.innerWidth`, `matchMedia`, parâmetros de URL (`useQueryParam`). Nunca
resolva com `suppressHydrationWarning` nem `dynamic({ ssr: false })`.

Há **uma** exceção, no `<html>`: o script de aparência escreve
`data-appearance` antes da primeira pintura, e o servidor não tem como saber a
preferência de quem vai abrir. A supressão vale só para os atributos daquele
elemento (nada dentro dele deixa de ser comparado) e sem ela o console
acusava divergência em toda página.

**Enquanto o dado não chegou, a tela mostra esqueleto.** Os providers de
coleção devolvem `isHydrated`, e a semente não deve ser exibida como se fosse
o acervo de quem abriu: piscar conteúdo falso é pior que dizer "ainda não
sei". Os esqueletos vivem em `components/common/page/LoadingSkeleton`, um por
forma de conteúdo, e servidor e primeiro render produzem o mesmo: a regra
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

O mesmo aviso sobe um nível: enquanto houver alteração pendente, o guarda
registra no `ReleaseProvider` que existe trabalho aberto, e é isso que faz o
aviso de nova versão dizer "salve antes" em vez de oferecer um recarregar que
descarta o texto. Quem fecha a aba inteira merece a mesma pergunta de quem
fecha o diálogo, por isso também há `beforeunload` enquanto houver pendência.

**Perguntar só serve para quem está lá.** Aba fechada por engano, navegador
reiniciado e queda de energia não perguntam nada, e até então o texto
simplesmente deixava de existir. `useDraftRecovery` grava o que está sendo
digitado um segundo e meio depois de a digitação parar (a cada tecla seriam
centenas de escritas síncronas num artigo longo) e o formulário oferece
restaurar na próxima abertura.

Fica **no navegador**, mesmo no modo compartilhado: texto pela metade no
servidor ficaria visível para a equipe antes de a pessoa decidir mostrar, e a
decisão de mostrar é dela. Mesma razão de "vistos recentemente" não
sincronizar.

O aviso só aparece quando o guardado **difere** do que o registro tem hoje.
Igual significa que a gravação aconteceu, e pedir decisão sobre nada é o que
ensina alguém a ignorar avisos. Restaurar devolve o texto aos campos e não
grava: salvar continua sendo ato de quem edita.

A chave é uma por registro, com prefixo. Duas abas em artigos diferentes se
sobrescreveriam. Por isso `clearAppStorage` varre também as chaves derivadas
de uma nossa: apagar só os nomes exatos deixaria conteúdo para trás na tela que
promete voltar à semente.

### Versão publicada

`/api/version` devolve o identificador do deploy, e o navegador de quem está
com a página aberta compara de cinco em cinco minutos e ao voltar para a aba.
A referência é a **primeira versão que aquela aba viu**, e não uma constante
embutida na compilação: assim o aviso funciona sem depender de a plataforma
expor o identificador do deploy para o navegador.

Recarregar sozinho está fora de questão. Quem está no meio de um artigo
perderia o texto, e o produto teria decidido por ela. O aviso fica no canto,
não bloqueia, e atualizar é ato de alguém.

Fora da Vercel a versão é fixa: no desenvolvimento o servidor reinicia a cada
salvamento, e um aviso a cada tecla seria ruído.

### Falhas

`app/error.tsx`, `app/global-error.tsx` e `app/not-found.tsx` existem. Um erro
de render não pode deixar a tela em branco.

Como os dados vivem no navegador, a causa provável de um erro de render é
conteúdo guardado em formato inesperado. Por isso a tela de falha oferece
apagar o armazenamento e voltar à semente, com a consequência escrita antes do
clique.

## Regras de produto

**Nada inventado.** Se um número não pode ser derivado dos dados reais, ele não
aparece. Não rotule métrica calculada como saída de IA. Estado vazio honesto é
sempre melhor que preenchimento. Quando uma seção não tem como ser verdadeira,
ela sai. Foi assim com anexos e "Copiloto de IA" no Plano.

**A Biblioteca é a Base de Conhecimento.** Existe um único acervo,
`KnowledgeArticle`. Só artigo **publicado** conta como cobertura documental: a
análise não enxerga rascunho nem revisão.

**Excluir manda para a lixeira.** O registro sai da vista e continua
existindo. Com dado compartilhado, quem apaga apaga para catorze pessoas, e o
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

A coleção guarda vivo e excluído juntos, e **quem separa é o provider**, não
cada tela. Foi o que impede um artigo na lixeira de contar como cobertura
documental numa análise.

**Máquinas de estado têm caminho de volta.** Artigo e plano podem retroceder:
revisão reprovada volta para rascunho, publicado pode ser recolhido. Um fluxo que
só avança esconde o erro em vez de corrigi-lo.

**Publicar exige intenção, não permissão.** Artigo e plano passam por
`PublishConfirmDialog`, que mostra o que continua incompleto (medido nos
próprios campos) e o efeito da publicação. Nada bloqueia: a equipe é treinada e
decide. Fricção que informa, não que atrapalha.

**Pessoa é conta; equipe é cadastro.** No modo compartilhado a lista de
pessoas é quem entrou, não há cadastro manual, e nenhum nome de colaborador
vive no código. Enquanto um colega não acessa, a equipe dele recebe a
atribuição. Sem servidor não há login, e o campo "atuando como" volta a ser
texto: melhor um nome digitado que histórico com autoria vazia.

**Acompanhar não é assumir.** Quem abriu o atendimento que originou o plano
quer saber quando ele publica, e não vai virar responsável por isso. O
acompanhamento é a única coleção **por pessoa** do produto (o resto descreve
trabalho, ele descreve interesse) e fica numa lista separada de "Meu
trabalho": juntar as duas faria a fila de alguém crescer por interesse dos
outros. A política do banco continua a mesma; quem filtra por pessoa é a tela.

**O produto avisa por si, porque não há e-mail para avisar.** A menção existia
e não chegava a lugar nenhum: quem era mencionado só descobria abrindo a tela
certa por acaso. A central reúne três coisas (menção a você, movimento no que
você acompanha e movimento no que está atribuído a você) e é montada do que já
está em memória, como o painel: nenhuma consulta nova.

**Nem tudo vira aviso**, e a lista é curta de propósito. Um produto que avisa
demais é um produto cujos avisos ninguém lê, e aí o aviso que importava se
perde junto. "Alguém editou um artigo" não entra; mudança de estágio, plano
criado, oportunidade aprovada e exclusão entram.

O que **você** fez não é notícia para você, e menção que você escreveu também
não. Seria o produto conversando consigo. Quando o mesmo registro é
acompanhado *e* atribuído, a razão exibida é acompanhar: é a escolha explícita
de quem lê, enquanto a atribuição pode ter vindo de outra pessoa.

O já visto continua na lista, marcado como lido. Escondê-lo deixaria a central
vazia na segunda abertura, e quem quer reencontrar o que leu ontem não teria
onde procurar. Marcar como visto acontece ao **fechar**: quem abre ainda não
leu, e marcar antes apagaria o destaque do que a pessoa está olhando.

**Limite conhecido:** a última visita fica no navegador, então ler no
computador não marca como lido no celular. A versão certa é uma coluna por
pessoa no banco, e é outra peça. Guardar aqui responde "o que mudou desde a
última vez que eu olhei nesta máquina", que é verdade, e é melhor que não
avisar nada.

**Menção guarda identificador, como a atribuição.** O comentário grava
`@[Nome](id)`; quem exibe resolve o id e mostra o nome de hoje. O rótulo vai
junto porque é o que sobra quando a conta some, e sobrar "@Raoni" é melhor
que sobrar "@pes-7f3a". Menção que não resolve mais **não é apagada**: o
comentário é registro do que foi dito, e não se reescreve.

**Não há papéis, por decisão.** A equipe é treinada e o histórico responde por
quem fez o quê. A política do banco é a mesma em todas as tabelas; se um dia
houver papéis, ela muda ali e em nenhum outro lugar.

**A exceção é curta e está escrita numa tela.** Existem ações cujo custo não é
do conteúdo: buscar na HubSpot gasta requisições contra uma máquina que atende
cliente, esvaziar a lixeira apaga para catorze pessoas, importar um arquivo
reescreve mil registros num clique. Para essas, "a equipe é treinada" não basta,
porque o erro de uma cai sobre todas.

São seis, e cada uma precisou justificar por que o histórico não resolvia.
Guardar tudo trocaria um produto onde ninguém trava por um onde todo mundo
espera aprovação, que é o oposto do que ele é.

**Onde a regra é conferida vai na tela**, e não é detalhe: a porta de verdade é
o servidor, e só a HubSpot tem rota nossa. As outras são escondidas na tela, o
que impede o clique e não impede quem conhece o caminho. Apresentar as duas do
mesmo jeito seria vender uma trava que não existe.

**A da HubSpot não se afrouxa**, e o normalizador do servidor a defende mesmo de
quem chame a rota direto: bastaria gravar `todos` no banco para abrir a porta.
As outras nascem em `todos`, que é como o produto sempre funcionou, e quem
administra decide apertar.

**Ler a lista é de todos.** Quem encontra um botão escondido precisa poder
descobrir por quê, e onde se muda. Esconder a regra de quem não pode mudá-la
transforma configuração em folclore: "acho que só o fulano consegue".

**A auditoria é o mesmo histórico, com outras perguntas.** A linha do tempo
responde "o que aconteceu neste projeto"; quem administra pergunta "o que esta
pessoa fez" e "o que mudou na semana passada", e a resposta **atravessa
iniciativas** — recortar por projeto deixaria de fora justamente quem trabalhou
noutro. Não há registro paralelo: eventos são acrescentados e nunca editados, e
um segundo registro divergiria do primeiro, sendo o segundo o que ninguém
confere.

O dia do evento é o de quem lê, nunca os dez primeiros caracteres do ISO: um
evento das 21h de 27 de agosto no Brasil cairia em 28, e quem procura "o dia 27"
não acharia o que fez à noite. Evento com data ilegível fica **fora** de janela,
e continua na lista sem janela: esconder porque a data não se lê seria perder o
registro de que ele existiu.

**Quem fez guarda identificador, além do rótulo.** O evento sempre guardou
`actor` em texto, e isso continua: o rótulo é o que sobra quando a conta some, e
"excluído por Ana" segue legível depois de a Ana sair. Só que ele não responde
"foi a mesma pessoa?", e a auditoria mostrou o custo: uma conta criada como
`raoni.silva` e renomeada para `Raoni Teste` aparecia como **duas** pessoas, com
21 eventos numa e 22 na outra, e quem procurava o que ela fez escolhia uma e
perdia metade. É a mesma lição que a atribuição e a menção já tinham aprendido.

Os dois convivem: o identificador responde "foi a mesma pessoa?", o rótulo
responde "como ela se chamava quando isto aconteceu?", e a segunda resposta não
se reescreve. A lista de pessoas do filtro mostra o nome de hoje com os
anteriores ao lado.

O carimbo é **no funil**, dentro de `record`, e não nos vinte e dois chamadores:
foi por espalhar que o `actor` divergiu. Isso torna `Activity` dependente de
`People` — ela já ficava abaixo na ordem, então nada se moveu; o que muda é o
motivo.

**Evento anterior à coluna não é preenchido.** Casar pelo nome seria inventar
vínculo, e `raoni.silva` parecer o prefixo de um e-mail é coincidência, não
prova. Ali o rótulo é tudo que há, e a tela mostra assim.

**Quem fez não é quem responde**, e a auditoria expôs a confusão no dado real.
O evento gravava `currentPerson || item.author`, e autor e responsável guardam
identificador — inclusive de **equipe**, porque classificar um artigo preenche o
autor a partir da categoria. O resultado era `team-suporte-estruturas` listado
como pessoa que criou artigos. Sem sessão a resposta certa é vazia, e a tela diz
"não registrado": afirmar que alguém fez algo que não fez é pior que não saber.

**A equipe é sugerida, nunca derivada.** Cada equipe declara em Configurações
por quais categorias do portal responde, e classificar um artigo preenche o
autor a partir disso. Sem sobrescrever quem já foi escolhido, e dizendo na
tela que a sugestão foi dela. Derivar automaticamente criaria um responsável
que ninguém escolheu, e em QiOnboarding ou Novidades de Release, que não têm
equipe óbvia, o palpite apareceria com cara de decisão. Duas equipes na mesma
categoria desligam a sugestão: escolher uma seria arbitrário, e arbitrário com
cara de sugestão é pior que campo vazio.

**A seção vence a categoria** quando alguma equipe a declarou. O suporte do
Builder é dividido por disciplina, e disciplina no portal é seção, não
categoria: Builder Elétrica e Builder Hidráulica teriam de declarar a mesma
categoria e desligariam a sugestão uma da outra. Quem responde pelo produto
inteiro (Visus, Eberick) declara só a categoria, e a seção que ninguém
declarou continua caindo nela.

Por isso a categoria disputada só vira aviso quando **nenhuma** seção dela foi
declarada: apontar como defeito o arranjo que a própria tela pediu seria
ensinar a desconfiar da orientação certa.

O mapa é **cadastro, não constante**, mesma razão do resto da classificação:
as categorias do portal mudam e as equipes mudam, e ninguém vai abrir o código
para acompanhar. Vale para o nome da equipe também: renomear preserva o id, que
é o vínculo com tudo que já foi atribuído.

**Atribuição guarda identificador, não nome.** Era nome, com a justificativa de
que remover alguém não apagaria o registro de quem conduziu. Com conta, o nome
passou a ser editável pela própria pessoa, e renomear orfanaria tudo. Quem
preserva o passado é o histórico, que guarda o rótulo do evento.

O resolvedor reconhece nome também, então registro anterior continua legível e
vira identificador sozinho na próxima gravação, sem migração de dados. O que
não resolve é exibido como veio, nunca como "sem responsável".

**Referências a HubSpot, Zendesk, Vercel e CRMs são pedidos de maturidade**
funcional e de UX, nunca de integração ou de importar o domínio deles. Traduza o
princípio para o nosso ciclo.

**Integração real exige autorização explícita.** Ligar rede ou credencial exige
pedir antes.

**O acesso à HubSpot é REST direto, somente leitura**, e isso reverteu a decisão
anterior de mediá-lo pela Claude. A fronteira vive em `services/hubspot`, com
falha tipada em cinco causas. `credencial-recusada` tem nome próprio porque o
token é de outra pessoa e pode ser rotacionado sem aviso.

**O que a credencial alcança foi medido, e é pouco.** O escopo `tickets` não
está nela: o objeto foi procurado por sete endereços (v3, versionado, singular,
por `objectTypeId`, registro individual) e todos devolvem 403, enquanto
`schemas`, `contacts`, `companies` e `owners` respondem 200 no mesmo token. Não
é rota errada: é o objeto que está fechado.

Sobra a conversa, e ela é o que o arquivo não traz: a exportação da HubSpot traz
o ticket, não o histórico de mensagens. O conversa se liga ao atendimento pelo
`associatedTicketId`, que vem **pelo lado da conversa** e não exige o escopo
ausente.

O que falta e por que está registrado em `docs/hubspot-pendencias.md`, escrito
para quem administra o app privado. **Publicar de volta na HubSpot fica para a
sprint ProjetoAprovado**, editar aqui é trabalho interno; escrever no portal é
publicar para o cliente.

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

A restrição de domínio vive **no banco**. `check constraint` na tabela de
perfis e gatilho em `auth.users`. A conferência na interface existe só para
dar erro legível, e o `hd` que o produto manda ao Google é conveniência pelo
mesmo motivo: parâmetro que sai do navegador não restringe ninguém.

Não há senha em lugar nenhum. São dois caminhos: a conta Google da AltoQi, que
é o principal, e o link por e-mail como alternativa.

**O botão do Google só aparece quando está ligado do outro lado**, declarado
por `NEXT_PUBLIC_GOOGLE_SIGN_IN=on`. Mesma razão do modo compartilhado, e um
defeito concreto: com o provedor desligado, a Supabase responde `400
Unsupported provider` à navegação, e a pessoa saía do produto para um JSON em
inglês, sem botão de voltar. Deduzir do navegador exigiria perguntar ao
servidor a cada abertura da tela. Botão que às vezes leva a lugar nenhum é pior
que botão que ainda não existe.

Enquanto ele está desligado, a tela diz que a entrada é pelo link, em vez de
prometer dois caminhos e oferecer um.

O que falta para a equipe entrar não é código, e está escrito em
`docs/acesso-da-equipe.md`: o serviço de e-mail embutido tem teto por hora
**travado enquanto não houver SMTP próprio**, e só entrega para endereços da
equipe do projeto.

**O caminho escolhido é o SMTP**, e não o Google: criar credencial no Google
Cloud Console da empresa depende da TI, que está adiada junto com o resto do
bloco de credenciais. O Google continua sendo o desenho principal do código,
só não é o próximo passo.

As chaves privilegiadas (service role, secret e JWT) **foram removidas do
ambiente**. Elas ignoram as políticas de acesso, e nenhuma operação do produto
precisa disso. As `POSTGRES_*` ficam porque `npm run db:migrate` depende delas
via `vercel env pull`, e nenhuma vai para o navegador.

### Configuração de acesso

Vive em `supabase/config.toml`, versionada como as migrações: configuração de
acesso decidida em silêncio no painel é configuração que ninguém sabe explicar
depois.

**O SMTP próprio foi ligado no painel em 21/08/2026**, e não está declarado no
arquivo porque a senha de envio não entra no repositório. Isso cria um risco
que está anotado em maiúsculas dentro dele: um `config push` desligaria o SMTP
e devolveria a equipe ao serviço embutido (dois e-mails por hora, e só para
quem está na equipe do projeto), sem nada no push avisando que foi isso.

**`supabase config push` aplica o arquivo inteiro, e o que não está declarado
volta ao padrão da CLI.** Isso não é teoria: um push que só pretendia ajustar
duas URLs baixou o tamanho do código de acesso de 8 para 6, encurtou o
intervalo mínimo entre e-mails de um minuto para um segundo e desligou o
segundo fator. Por isso o arquivo declara valores que não são preferência
nossa. São os que o projeto já tinha. **Confira o diff que o push imprime
antes de aceitar.**

`site_url` e `additional_redirect_urls` precisam conter o destino que o
produto pede. Fora da lista, a Supabase ignora o pedido e manda o link para a
`site_url`. Foi assim que todo link de acesso caiu em `localhost`.

Código que chega em `/` é encaminhado por `src/proxy.ts` para
`/auth/callback`, que é quem o troca por sessão. Todo link já enviado carrega
o destino que valia na hora do envio, então e-mail antigo continua caindo na
raiz mesmo com a configuração certa, e antes disso nada acontecia ali.

O serviço de e-mail embutido da Supabase entrega **dois por hora e recusa
endereços de fora da equipe do projeto**. Não sustenta uma equipe: ou há SMTP
próprio, ou o acesso é pelo Google.

Erro de envio passa por `signInError`: a mensagem crua da Supabase apareceu em
inglês na tela. O que não é reconhecido **vai junto**, porque a mensagem
original é a única pista de quem administra.

Schema em `supabase/migrations`, aplicado por `npm run db:migrate`. Coluna de
verdade para o que é filtrado, ordenado ou contado; `jsonb` para o conteúdo
profundo que só é lido inteiro.

Tabela nova precisa de `grant` explícito para `authenticated`: RLS decide
quais linhas aparecem depois que a tabela é alcançável, não se ela é
alcançável. E precisa de `notify pgrst, 'reload schema'`: o PostgREST guarda o
schema em cache, e sem o aviso ele responde como se a tabela não existisse.

**O mapa de tabelas tipadas está cheio.** A décima sexta entrada estoura o
limite de inferência do TypeScript no genérico da Supabase, e o efeito não é um
erro na tabela nova: **as outras quinze colapsam para `never`**, e a queixa
aparece longe, em `profiles`, como se `is_admin` não existisse. Quem fica de
fora do mapa não pode usar `from()`: ele compila com um disfarce e não dispara
requisição nenhuma, sem erro e sem rede. O caminho é uma rota nossa, com o
cliente de servidor, que é onde a sessão vem do cookie.

### Como o dado chega às telas

`useSharedCollection` devolve `[itens, definir, hidratado]` (a mesma
assinatura de `usePersistedState`) e decide sozinho entre banco e navegador.
Provider não sabe de onde o dado vem, e não deve saber.

A escrita compara o estado anterior com o novo e manda só a diferença. O tempo
real relê a coleção inteira em vez de aplicar o evento recebido: aplicar erra
quando os eventos chegam fora de ordem ou quando um se perde na reconexão.

**Escrita grande vai em lotes, e a falha precisa aparecer.** Uma gravação de
mil e oitocentos registros num pedido só passa de vinte megabytes e falha, e
falhou, deixando o acervo em quatrocentos e quarenta com cara de acervo
inteiro. Vinte e cinco por pedido, com o erro chegando à tela: `void` numa
promessa engole a exceção, e o laço morre calado.

**A releitura relê só o que mudou.** Ela continua buscando o estado atual em
vez de aplicar o evento, pelo motivo de sempre, mas em dois passos: a lista de
identificadores com o carimbo de gravação, e depois só as linhas cujo carimbo
mudou. Um colega classificando **um** artigo custava onze pedidos e 22,7 MB em
cada aba aberta da equipe; agora custa três pedidos e 221 ms, medido.

O carimbo é `synced_at`, do gatilho, e **não** `updated_at`. Os dois têm donos
diferentes: `updated_at` é do produto e guarda o `lastmod` do portal, que é como
a varredura sabe o que já está em dia; salvar rascunho não o toca e restaurar da
lixeira também não. Um gatilho sobre ele consertaria a releitura e faria a
varredura rebaixar 1.822 páginas a cada execução.

Ela recua para a releitura inteira sempre que não puder responder com certeza:
banco sem a coluna, memória sem carimbo, quase tudo mudado, falha ao buscar. O
contrário, tela com dado velho, é o defeito que ninguém percebe.

É **opção por coleção**, e não padrão, porque exige `fromRows` que converta
linha a linha: quem decide algo olhando o conjunto não pode receber um pedaço
dele. Hoje só o acervo a liga, que é a coleção que a justifica.

**E a leitura paginada ordena por `id`.** Não era ordenada, e paginar com
`range` sobre consulta sem ordem é indefinido no Postgres: entre duas páginas o
planejador pode repetir uma linha e pular outra, e a coleção chegaria com um
artigo duplicado e outro ausente, sem erro nenhum.

**E a abertura lê o navegador antes de perguntar ao banco.** A releitura
incremental resolveu o eco do tempo real; a abertura continuava custando os
22,7 MB, toda vez, para catorze pessoas várias vezes por dia. O acervo fica no
IndexedDB (o `localStorage` tem teto de 5 a 10 MB e não caberia), e o que se
guarda são as **linhas**, não os registros convertidos: a conversão é onde mora
o normalizador. Medido: de 12 pedidos e 3.653 ms para **3 pedidos e 1.366 ms**.

Três defeitos meus no caminho, e todos silenciosos:

Converter as linhas do cache **duas vezes** produzia dois arrays de objetos
diferentes, e a gravação compara identidade: os 1.822 pareciam alterados e o
produto os **regravava no banco** a cada abertura.

Abrir e fechar o IndexedDB por operação fazia as chamadas se atropelarem; o
`close()` de uma derrubava a transação da outra, quem recebia `null` entendia
"sem cache" e baixava tudo. Uma conexão só, guardada como promessa.

E a carga inicial rodava a cada render. A guarda é uma ref, e com ela o `alive`
da limpeza teve de sair: o React desmonta e remonta, a limpeza marcava
`alive = false` com a leitura no ar, a segunda execução saía pela guarda, e o
resultado chegava para ser descartado. A tela ficava em esqueleto, sem erro.

**E o tempo real não pode reler durante a nossa própria escrita.** Cada lote
gravado dispara um evento, a releitura devolve uma visão **parcial** do banco,
e ela substitui o estado local no meio do caminho: a escrita competindo
consigo mesma. Enquanto a gravação está em curso, o eco é ignorado.

Taxonomia é a exceção. São três tabelas compondo um objeto, com repositório
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

**E o espelho se faz pelo portal público, não pela API.** Não existe API de
Base de Conhecimento na HubSpot: o escopo `cms.knowledge_base.articles.read`
está concedido e não tem endpoint atrás. Seis caminhos candidatos devolvem
404, não 403. Ver o escopo marcado na lista não significa que a API existe.

O portal, sendo público, entrega mais do que a API entregaria: o `sitemap.xml`
lista **1.827 artigos**, todos com `lastmod`; a página traz título, resumo,
corpo e a trilha que dá categoria e seção. O corpo mora no campo de texto rico
da HubSpot (`data-hs-cos-type="inline_richtext_field"`), e **não** no
`<article>`, que envolve dezenove `div` de grade do layout. Importar o
`<article>` trazia o andaime junto com o texto.

O artigo aponta para `sectionId`, e a categoria vem da seção, guardar as duas
permitiria que divergissem. `portalArticleId` guarda a identidade no portal,
sem a qual sincronizar criaria duplicata a cada importação.

**A classificação do atendimento é outra, e continua separada.** O suporte
classifica o ticket na HubSpot por `[Support] Produto` (Builder, Eberick,
Visus, Área do Cliente, Produtos anteriores, Não é produto) e por uma lista de
23 categorias dentro do produto: Cabeamento, Climatização, Elétrico, Elétrico |
Barramento, Elétrico | Fotovoltaico, Gás, Hidrossanitário, Incêndio, SPDA, as
seis Estrutural, as sete Visus e Geral / Plataforma.

A forma é a mesma da nossa (produto em cima, disciplina embaixo), mas o
vocabulário responde a outra pergunta: um classifica o **atendimento**, o outro
classifica o **artigo publicado**. Unificar os dois foi considerado e recusado:
os artigos já apontam para seções do portal, e trocar o cadastro deixaria todos
em "Sem seção". Que é exatamente a classificação inventada que o resto deste
documento evita. O "Responde por" da equipe lê o portal.

A classificação da HubSpot entraria com os atendimentos remotos, como
vocabulário do atendimento e não por cima deste. **Eles não entraram**: o escopo
está ausente, e a decisão não é nossa.

**Nada de classificação é fixo no código.** Categoria, seção, gênero e tipo de
oportunidade são cadastro, editável em Configurações. A semente é a estrutura
do portal como levantada (13 categorias e 146 seções), mas o portal muda e
ninguém vai abrir o código para acompanhar.

Disso decorre uma regra: **filtro lê do cadastro, nunca de constante**. Vale
para a Biblioteca e para Projetos. Antes eram listas fixas, e o formulário
podia discordar do filtro sobre quais produtos existem.

Vazio é estado legítimo em `sectionId` e `genreId`. Quando a migração de um
registro antigo não encontra correspondência, ela **deixa vazio em vez de
chutar**: encaixar na seção mais parecida seria classificação inventada, e
ninguém saberia que foi palpite. O artigo aparece no filtro "Sem seção" e
alguém decide.

Renomear preserva o id: o vínculo com o artigo é o identificador, não o
texto. Remover categoria leva junto as seções dela e deixa os artigos
apontando para o vazio, de propósito, pelo mesmo motivo.

Máquina de estado **não** é lista de preenchimento: o estágio do artigo e do
plano continua fixo no código, porque tem transição, teste e indicador
amarrados. O status da oportunidade também.

## Identidade visual

O kit de marca vive em `brand/`, **fora de `public/`**. São arquivos de
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
Não voltar para fonte do Google: a marca não depende de terceiro.

### Aparência

A aparência vive em `data-appearance` no `<html>`, e não numa classe. O tema
precisa estar aplicado antes da primeira pintura, senão a tela pisca clara.
Isso exige um script antes do React, e mexer em `className` do `<html>` nesse
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
de `analysisAIService`. GPT e Claude saíram do roadmap, e hoje o catálogo tem
um provedor só. A escolha entre dois continua no código e continua testada, com
um catálogo de teste: a regra vale quando um segundo aparecer, e escrevê-la de
novo depois custaria mais que mantê-la.

**Somar um provedor é escrever um arquivo e citá-lo no registro.** O contrato é
`AIProvider`, e o que ele realmente faz é `complete(mensagens)`. `chat` e
`analyze` são atalhos escritos sobre ela. Antes o construtor de prompt da
análise vivia dentro do provider, o que obrigava toda operação nova a virar um
método novo do contrato; agora o prompt fica onde é assunto do produto, e nada
acima de `services/ai/server` conhece SDK, nome de modelo ou formato de
mensagem.

**A IA propõe seção; a revisão humana aprova.** A importação por arquivo deixa
artigo sem seção de propósito, e classificar centenas à mão é o problema
seguinte. O vocabulário vai inteiro no pedido e a resposta escolhe dentro dele
, e o identificador é **conferido na volta**, porque instrução não é garantia:
seção que o modelo inventou vira ausência, não classificação. Artigo que não
cabe em nenhuma seção é omitido de propósito; ficar de fora é resposta
legítima, e melhor que palpite. Nada é aplicado sem alguém deixar marcado.

**A IA lê o artigo com quem avalia.** Com o portal importado, avaliar o acervo é
o trabalho, e fazê-lo sozinho significa reler mil e oitocentos textos. O painel
fica ao lado do artigo, porque a pergunta nasce enquanto se lê.

O prompt separa **dois tipos de pergunta**, e a separação foi exigida pelo teste
contra o modelo real: perguntado "resuma este artigo", ele abria com "o artigo
não trata disso" e só então resumia. Pergunta **sobre** o artigo (resumir,
avaliar, apontar lacuna) se responde com o texto em mãos. A recusa vale para
pergunta **respondida pelo** artigo, onde completar com conhecimento de
treinamento produziria uma resposta com cara de quem leu o texto, e quem avalia
o acervo não teria como distinguir.

Artigo longo vai cortado num teto, e **a tela e o modelo são avisados disso**:
resposta baseada em meio artigo apresentada como se fosse sobre o inteiro é erro
que ninguém percebe.

**Instrução de sistema não é uma só.** O provedor Gemini pegava a primeira e
descartava as demais em silêncio: o artigo ia no segundo bloco e o modelo
respondia "como o artigo não foi fornecido", sem erro em lugar nenhum. Quem monta
prompt tem motivo para separar regra de contexto: a regra é fixa e o contexto
muda a cada registro.

**A IA preenche formulário; a revisão aprova.** O cadastro era digitação, e
quem registra um atendimento costuma ter a informação num documento que
ninguém vai transcrever. `FillPanel` é uma peça só, em três telas (projeto,
atendimento e artigo), e recebe os campos de quem a monta: o formato "descreva
e a IA propõe" é o mesmo nas três, e um painel por tela faria três prompts
divergirem.

Campo de escolha só aceita valor do catálogo que foi no pedido, conferido na
volta como na sugestão de seção. **Substituição não vem marcada**: preencher
campo vazio é ganho, cobrir texto que alguém escreveu é decisão, e a tela diz
qual é qual antes do clique. O que o texto não sustenta **vira pergunta**, e é
metade do recurso. Preenchimento que chuta obriga a conferir todos os campos,
o que custa mais que digitar todos.

Identificador fica de fora: responsável, autor, seção e gênero continuam
virando pergunta, porque a atribuição guarda id e o modelo só devolve texto.

Arquivo tem dois caminhos, e a diferença é econômica antes de técnica. Texto é
lido no navegador e segue como texto, base64 de um `.csv` custa um terço a
mais de tokens pelo mesmo conteúdo. PDF e imagem vão ao provedor como anexo,
porque precisam ser **vistos**: extrair texto de PDF no navegador resolveria o
digital e falharia no escaneado, que é o que mais chega de um suporte. **O
anexo vai e não fica**. Existe durante o pedido e é descartado com a resposta.

**Quem lê arquivo é declarado no catálogo (`readsFiles`), nunca suposto.**
Provedor que não lê e ignorasse a opção produziria a pior resposta possível:
campos vazios, sem erro, com o documento descartado em silêncio. Declarado, o
pedido é recusado antes de sair e a tela nem oferece o anexo. Mesma regra do
botão de entrar com a conta Google.

A varredura vai em **lotes de 25, em série**, com o progresso na tela. Em
paralelo seriam vinte e quatro pedidos simultâneos e o limite de taxa do
provedor logo em seguida. Lote que falha **não derruba o que já veio**: depois
de vinte pedidos bem sucedidos, perder tudo por causa do vigésimo primeiro
seria jogar fora revisão pronta: a tela guarda e diz onde parou. E dá para
parar no meio, porque quem começou vinte e quatro pedidos pode mudar de ideia
no terceiro.

Aplicar é **uma** escrita, **um** evento e **um** aviso. Uma a uma custaria
seiscentos avisos empilhados, seiscentas idas ao servidor e seiscentas linhas
iguais enterrando o histórico.

**Qual provedor vale é declarado, não deduzido da presença de chave**, pelo
mesmo motivo do modo compartilhado: chave provisionada em ambiente é acidente
de infraestrutura, não decisão de produto. `AI_PROVIDER` nomeia; sem ele, vale
o único configurado. Com dois configurados e nenhum declarado vale a ordem
escrita em `AI_PROVIDERS`, e **a tela de Integrações diz que foi ela**. Como a
ressalva de data no painel, resultado de critério que ninguém escolheu precisa
ser anunciado.

Declarar um provedor sem chave **não cai em outro**. Quem declarou quis aquele,
e substituir por conta própria faria um erro de digitação virar uma análise
feita por outro modelo, sem ninguém saber.

A tela de Integrações lê do **mesmo catálogo** que o servidor usa para
escolher. Duas listas do mesmo vocabulário divergem, e a divergência apareceria
como a tela dizendo "conectado" sobre um provedor que a análise não usa.

**Falha de provedor tem tipo.** Chave recusada, cota estourada, modelo
sobrecarregado e pedido que passou do prazo eram a mesma frase ("tente
novamente"), inclusive quando tentar de novo não mudava nada. `classifyProvider‑
Failure` separa as quatro, e o que não é reconhecido **leva a mensagem original
junto**, como na tradução do erro de acesso: ela é a única pista de quem
administra. As duas rotas respondem pelo mesmo `aiErrorResponse`; escritas em
separado, divergem.

**O passo a passo de ligar um provedor está em `docs/ligar-a-ia.md`**: o que
já está pronto, o que é uma linha no registro, e o que só dá para conferir
contra a resposta real da API.

Todo pedido tem prazo (`AI_TIMEOUT_MS`). Sem ele um pedido pendurado prende a
rota até o teto da plataforma, e quem pediu a análise fica olhando um botão
girar.

O acervo vive no navegador, então a **busca de artigos roda no cliente** e o
contexto chega ao servidor com a evidência já resolvida, atendimento, conversa e
artigos relacionados. O servidor valida com schema estrito
(`analysisRequestSchema`) e monta o prompt. A resposta estruturada também é
validada (`analysisResponseSchema`); id e status de oportunidade são atribuídos
internamente, **nunca pelo modelo**. Quem decide é a revisão humana.

## Prazos

Data só é data em **ISO 8601**, e a leitura recusa o resto. `new Date("15 jul.
2026")` funciona em alguns motores e falha em outros. Aceitar significaria o
mesmo registro mostrando prazos diferentes em máquinas diferentes, sem nada
indicando o problema.

**Dia de calendário não é instante.** A data do atendimento é o dia em que ele
aconteceu, e dia não tem fuso: `lib/dates` trabalha sobre os componentes do
texto e nunca sobre um `Date`, porque `new Date("2026-08-01")` é meia-noite em
Greenwich, 31 de julho no Brasil. O erro só aparece na virada do mês, que é
justamente onde ninguém olharia para conferir. Instante continua em ISO
completo; dia fica em `aaaa-mm-dd`.

Campo de data é **campo de data**, não texto livre. O do atendimento aceitava
"ontem", e o que não dá para situar no tempo cai fora de toda janela. O
normalizador converte o `dd/mm/aaaa` que está gravado e esvazia o que não é
data: a tela diz que falta, em vez de deixar o campo parecer preenchido.

Isso vale para o que o produto **grava**, e não só para o que ele lê: o plano
nascia com `createdAt` em texto de exibição, "20 de ago. de 2026, 18:23".
Apesar de o modelo dizer ISO, e por isso o painel de planos por mês não
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
incidental: uma delas faria um plano parado há um mês parecer recém-tocado.

Contador e fila convivem porque respondem coisas diferentes: um diz que existe
trabalho, a outra diz por onde começar.

## Conteúdo e versionamento

**O formato é declarado, nunca adivinhado.** O artigo carrega
`contentFormat`: o que escrevemos aqui é Markdown, o que vier do portal é
HTML. Converter nos dois sentidos degrada a cada ida e volta (tabela com
atributo, âncora, classe e mídia embutida não sobrevivem à viagem), e guardar
o formato junto é o que permite **não converter nunca**.

**Guardar o formato só serve se quem exibe consultar.** A tela renderizava tudo
como Markdown, e o HTML do portal aparecia com as tags à mostra; pior, o
serviço cravava `contentFormat: "markdown"` em toda gravação, então abrir e
salvar um artigo importado convertia o registro em silêncio. Quem exibe é
`ArticleContent`, que decide pelo formato declarado.

**O editor rico edita no próprio HTML renderizado**, e é escolha deliberada
contra editor de esquema. TipTap, ProseMirror e Slate reserializam o documento
para o formato que entendem. Estilo em atributo, classe da HubSpot e `srcset`
não sobrevivem à ida e volta, que é exatamente a degradação que `contentFormat`
existe para evitar. Aqui o que ninguém tocar continua idêntico ao byte, ao
preço de usar `document.execCommand`, obsoleto na especificação e presente em
todo navegador que importa.

**A fidelidade foi medida, e ela se sustenta.** Salvar sem tocar em nada
devolve o artigo byte a byte (20.069 bytes, mesmo hash). Aplicar negrito num
trecho troca quinze caracteres por `<b>quinze</b>` e deixa os outros 19.895
idênticos. O `style`, o `lang` e a `class` da HubSpot atravessam.

**A colagem era o buraco dessa promessa.** Um `contenteditable` sem tratamento
aceita o que estiver na área de transferência, e o que costuma estar ali é
Word: `mso-fareast-font-family`, `<o:p>`, fonte em pontos. Entra inteiro, não
muda nada na tela de quem colou, e fica dentro de um artigo que vai para o
cliente. É a pior forma de degradar, porque não tem sintoma. Agora a colagem
traz **só o que a barra sabe produzir**.

E a inserção é pelo intervalo, não por `execCommand("insertHTML")`: medido, o
Chrome embrulha o que o `insertHTML` recebe num `<span>` com o estilo calculado
do ponto de inserção (`color: lab(96.52 ...)`, `font-size: 0.9375rem`). Seria
trocar a marcação do Word pela do navegador. O preço é o desfazer, que nem
sempre alcança uma inserção feita à mão.

**E o editor aceita imagem, porque o acervo é feito delas.** 1.771 dos 1.822
artigos do portal têm figura: um editor que formata texto e não recebe print
corrige frase e não documenta passo. O caminho principal é **colar**, e não
escolher arquivo: ninguém salva uma captura em disco para depois procurá-la.

As imagens do portal continuam onde estão, servidas pela HubSpot. O balde é só
para o que nasce aqui, e **nada dele vai para a HubSpot**.

O balde é público na leitura e a decisão é essa: URL assinada expira, e artigo
com imagem quebrada em três dias é pior que imagem que alguém com o endereço
consegue ver. O acervo espelha um portal público. O que não pode é qualquer um
**escrever**, e disso cuida a política.

SVG é recusado junto com o que passa de 5 MB. SVG carrega script, e a imagem de
um artigo interno não precisa executar nada.

O que a leitura acrescenta (âncora nos títulos, caixa de aviso, link resolvido
para dentro do acervo, cor removida para o tema não brigar) **não entra no
editor**: são camada de apresentação, e editar sobre elas gravaria enfeite
dentro do artigo.

**O publicado continua no ar enquanto a próxima versão é preparada.** Editar
um publicado exigia recolhê-lo para revisão, e enquanto estivesse recolhido a
análise deixava de contá-lo como cobertura. Corrigir uma vírgula fazia uma
seção do portal parecer descoberta. O rascunho guarda só título, resumo e
conteúdo: classificação e responsável são atributos do **artigo**, não do
texto, e duplicá-los criaria duas respostas para "em que seção isto está".

A comparação é **campo a campo**, e não linha a linha: ela responde "vale
republicar?", e para isso basta saber o que foi tocado.

**Quem está editando aparece; nada trava.** Travar o registro transformaria uma
aba esquecida aberta na sexta num artigo inacessível até segunda, sem ninguém
para destravar, não há papéis. A presença vem do tempo real e não de tabela:
numa tabela, quem fechasse o navegador sem avisar ficaria "editando" para
sempre. O aviso de presença cobre o antes; `useStaleRecordWarning` cobre o
depois, quando alguém gravou enquanto você digitava.

## Atendimentos

**A tela é um help desk, e a conversa fica no meio.** Três colunas: a lista à
esquerda, a conversa no centro, o contexto à direita, e a análise embaixo em
largura cheia. Empilhado, um diálogo de noventa e quatro mensagens empurrava os
atributos e a análise para fora da tela; a conversa rola dentro da própria
caixa e não arrasta a página.

A identidade fica **acima da conversa**, não na lateral. Número da HubSpot,
cliente e assunto dizem o que se está lendo, e na coluna estreita um assunto
como "Ticket AltoQi nº47954714157 - Falha Abrir Software - Builder" quebrava em
seis linhas. O número da HubSpot vem primeiro e o nosso identificador nem
aparece: `hs-6952014856` é o id da conversa e não acha nada na busca do CRM.

O contexto perdeu a grade de três colunas pelo mesmo motivo. O ponto de quebra
do Tailwind mede a **janela**, não a coluna: numa tela larga a lateral
continuaria tentando três células de dois centímetros.

### Procurar um atendimento entre mil

A busca varre assunto, **cliente**, empresa, solução e os dois identificadores.
O do chamado entrou porque a tela já o prometia e não o entregava: o campo dizia
"nº do chamado" e varria o id da **conversa**, então quem copiava `47954714157`
da HubSpot não achava nada e não tinha como saber que procurava o número certo
no campo errado.

O cliente entrou porque é assim que se procura: quem atendeu lembra do nome de
quem ligou muito antes do assunto que digitou. E porque empresa quase não vem
preenchida — cem dos mil e vinte e cinco.

Três recortes, e cada um responde uma pergunta: **cliente** ("o que este me
pediu"), **empresa** ("o que esta conta abriu") e **produto** ("quanto disto é
Eberick"). O produto é **deduzido do texto** e o rótulo diz isso: a
classificação que o suporte faz na HubSpot está atrás do escopo `tickets`, que a
credencial não alcança.

A dedução é **uma só**, compartilhada com a tela de detalhe. Duas divergem, e a
divergência apareceria como o filtro escondendo um atendimento que o detalhe
marca como Builder.

### O freio das chamadas à HubSpot

São **três** controles, e eles respondem perguntas diferentes.

**A busca é de quem administra.** Não é sobre conteúdo: publicar, excluir e
classificar seguem de qualquer um, porque a equipe é treinada e o histórico
responde por quem fez o quê. É sobre gastar requisições contra o servidor de
suporte da AltoQi, que é máquina que atende cliente.

**A porta é a rota, não o botão.** Até a sprint em que isto entrou,
`/api/hubspot/help-desk` não pedia nada: qualquer requisição disparava leitura
na HubSpot, sem sessão nenhuma. Esconder o botão é sobre não oferecer o que vai
ser recusado, e é a mesma regra do entrar com a conta Google.

**O freio de mão para tudo, inclusive o que já está rodando.** Desligar a
automática ainda deixa qualquer administrador varrer três meses à mão, e a
pergunta que originou o campo é outra: como impedir que alguém sobrecarregue.
Por isso ele é conferido **por requisição**, e não no começo da varredura: é o
que faz o interruptor parar uma varredura em curso, que é justamente quando
alguém quer parar. Responde `423`, e não `403`: o 403 diz "você não pode", e
aqui a pessoa poderia — o que impede é um estado que alguém ligou.

**Uma varredura por vez, e a tranca é do banco.** Sem ela, dois administradores
com a tela aberta disparam duas varreduras contra a mesma caixa e o servidor
sente as duas somadas. Ela dá sinal de vida a cada lote em vez de ser gravada
uma vez no começo: aba fechada no meio deixaria a tranca fechada para sempre.

**A varredura é uma peça só**, usada pelo diálogo e pela busca automática. Ela
vivia dentro do diálogo, entrelaçada com `setState`, e enquanto havia um
chamador isso bastava. Duas cópias divergem, e a que roda sozinha seria
justamente a que ninguém está olhando quando divergir.

### O anexo do cliente é copiado uma vez, não buscado sempre

**A conversa de e-mail carrega arquivo, e é a maior parte do acervo.** Dos 445
fios que nunca passaram pelo bot, 378 são e-mail; medido em dez deles, 27 anexos
em 209 mensagens. Quase sempre o print da tela com o erro, que é justamente a
evidência que falta quando se lê o chamado.

Isso corrigiu uma medição errada: a primeira amostra disse "zero imagens" e era
de chat e WhatsApp, onde o bot não recebe arquivo. **Vinte fios recentes de uma
caixa não representam o acervo, e o corte que importava era o canal.**

**Não é preciso escopo nenhum.** O anexo já vem completo na resposta que
`conversations.read` devolve: `fileId`, nome, uso e uma URL assinada de CDN que
responde 200 sem autenticação. `files/v3/files/{id}` dá 403, e não faz falta.

**Mas a URL não se guarda.** A assinatura tem prazo dentro dela
(`?Expires=…&Signature=…`), e a medida valia cerca de um dia: gravada junto do
atendimento, funcionaria hoje e estaria quebrada amanhã, sem erro nenhum
dizendo por quê.

Sobravam dois caminhos, e o de buscar de novo a cada exibição foi **recusado**:
seriam duas requisições contra o servidor de suporte toda vez que alguém
abrisse um chamado para olhar uma figura, que é exatamente o que o freio existe
para impedir. Então o arquivo é copiado **uma vez** e servido do nosso balde;
da segunda em diante a HubSpot nem fica sabendo.

A cópia é **por atendimento pedido**, e não em lote na varredura: copiar tudo
seriam milhares de arquivos, a maioria que ninguém vai abrir. E pedir é ato de
alguém, porque a maioria dos atendimentos não tem anexo e um pedido automático
por abertura gastaria uma requisição para descobrir que não havia nada. Pasta
vazia ganha marca, senão "não tem anexo" seria consultado para sempre.

**O balde é privado, e aqui a decisão é o contrário da do balde de artigos.**
Lá o conteúdo é público por natureza e URL que expira deixaria artigo com
imagem quebrada. Aqui é print de tela de cliente, com nome de projeto e caminho
de arquivo dentro. Quem exibe pede uma URL assinada de uma hora, gerada para
quem já entrou.

A porta **não** exige administrador: a varredura é de quem administra porque
gera milhares de requisições, e abrir um anexo gera uma. O atendimento que
entrou pela caixa guarda `raw.threadId`, e com ele a consulta por
`associatedTicketId` some — ela só servia para descobrir um identificador já
gravado aqui.

**O freio é conferido depois do balde, e não na entrada.** Conferido em cima, o
anexo já copiado também era recusado — e servi-lo não fala com a HubSpot.
Ligar o freio esconderia da equipe evidência que ela já tem em casa, e não é
para isso que ele existe. Verificado com ele ligado: o copiado abre, o que ainda
não foi copiado responde 423.

**Medido de ponta a ponta**, contra um chamado real de nove anexos: a primeira
busca leva 13 s e diz "hubspot"; a segunda leva 705 ms, diz "cópia" e não sai
uma requisição. Atendimento sem anexo nenhum responde em 147 ms na segunda vez,
por causa da marca.

**A varredura conta quantos anexos há**, com as mensagens já em mãos e zero
requisição a mais. Serve para a lista mostrar onde está a evidência sem ninguém
abrir chamado por chamado, e para a tela não oferecer "buscar anexos" onde
sabidamente não há nenhum. **Ausente é desconhecido, e não zero:** os 1.025 que
entraram antes deste campo continuam oferecendo o botão, porque sumir com a
seção neles esconderia anexo que existe.

**O nome do arquivo é codificado na chave, não sanitizado.** A primeira versão
trocava espaço e acento por hífen, e o efeito só aparecia na **segunda**
leitura: "erro eberick.png" voltava "erro-eberick.png", então o mesmo anexo
tinha nome diferente antes e depois da cópia. A ordem também é fixada, porque a
lista do balde e a da HubSpot não coincidem.

### O chamado é associado depois, e isso muda a janela

**Conversa recente costuma não ter ticket ainda.** Medido nas duas pontas da
mesma janela de três dias: nas conversas **mais antigas**, treze de vinte viram
atendimento; nas **mais recentes**, cento e dezenove de cento e quarenta e
quatro são descartadas por não ter chamado associado.

Não é defeito nosso e não é defeito da HubSpot: o ticket nasce quando alguém do
suporte trata a conversa, e isso leva horas. Ler o que acabou de chegar é ler
antes de existir o que se quer.

Duas consequências. **Buscar a última hora rende quase nada**, o que torna a
sincronização automática de hora em hora muito menos útil do que parecia.
E **conversa sem chamado volta a ser lida em toda varredura**, porque nunca
entra aqui e portanto nunca fica "em dia": o custo se repete até o ticket
aparecer.

Por isso a janela da busca automática é **atrasada**: ela termina alguns dias
antes do agora, e a conversa é lida quando já tem chamado. Vira atendimento na
primeira leitura, sem descarte e sem releitura.

**Quanto de atraso é cadastro, não constante.** Dois dias é a partida, e o
número certo depende de quanto o suporte demora para associar o ticket — coisa
que quem trabalha lá sabe melhor que qualquer medição nossa. Zero devolve o
comportamento antigo, e a tela diz o que ele custa.

O preço está na tela junto com o controle: o atendimento demora esse tanto para
aparecer aqui. É trocar rapidez que não entrega por lentidão que entrega, e
quem quiser o que caiu agora usa a busca à mão com o atalho de um dia.

**O cursor não é o instante da busca.** `ultimaEm` é quando alguém buscou;
`cursorEm` é o fim da janela que aquela busca cobriu. Com dois dias de atraso,
buscar hoje cobre até anteontem, e a próxima precisa partir de anteontem.
Confundir os dois faria a janela nunca andar, ou andar duas vezes sobre o mesmo.

### A varredura só anda com a aba em primeiro plano

O navegador estrangula aba em segundo plano, e a varredura é um laço de
`fetch` no cliente. Medido: com a aba ativa, oitenta conversas em meio minuto;
com ela atrás, vinte em vinte e cinco minutos. Um lote só.

É a mesma armadilha já anotada aqui sobre medição em aba oculta, e ela pesa
mais na sincronização automática que na busca à mão: quem clica em buscar fica
olhando, quem depende da automática tem o produto numa aba entre outras vinte.

### A sincronização automática não é um cron

Um cron roda no servidor **sem sessão de ninguém**, e as políticas de acesso
exigem sessão para escrever. Fazê-lo funcionar exigiria devolver ao ambiente
uma chave que ignora todas elas, removida de propósito. Então quem sincroniza é
o navegador de quem já está aqui, com a sessão que ele já tem.

**Ela acompanha a sessão, e não a rota.** Vivia dentro da tela de Atendimentos,
e ali só rodava enquanto alguém estava naquela tela — enquanto a própria tela
prometia "com o produto aberto". Ligada por duas horas com o produto aberto
noutra página, não rodou uma vez, e não havia erro para achar porque não havia
nada acontecendo. Hoje é um componente sem desenho, montado no layout; quem
mostra estado continua sendo o cartão em Atendimentos, onde a consequência
aparece.

**O preço está na tela, não escondido:** de madrugada e no fim de semana
ninguém tem a aba aberta, e nada entra. É por isso que a retomada cobre o
**intervalo perdido** e não a última hora: se a última busca foi na sexta, quem
abre na segunda precisa que ela alcance a sexta. Com folga além disso, porque
dois relógios não batem no milissegundo e a conversa que chega na virada cairia
no vão entre duas execuções, sem erro nenhum.

Dois limites, os dois deliberados. **A primeira busca é de gente:** sem registro
anterior não dá para saber o que ficou para trás, e escolher a janela sozinho é
disparar um tamanho que ninguém pediu. E **depois de duas semanas parada ela não
retoma:** isso é férias ou produto parado, e a retomada viraria a varredura do
histórico inteiro disparada sozinha.

O interruptor vive no banco, e não no navegador. Tema e forma da lista são
preferência de máquina; este decide se o produto fala com o servidor de suporte,
e vale para as catorze ao mesmo tempo. Nasce desligado.

### Procurar o atendimento, como num help desk

**A busca alcança o que o cliente escreveu.** Ela varria assunto, cliente,
empresa e solução, tudo que está **fora** da conversa, e metade dos assuntos
começa com "Ticket AltoQi nº". Quem procura "modelo IFC deslocado" procura uma
frase da terceira mensagem. É o mesmo movimento que a Biblioteca fez quando o
portal entrou.

Campo casa por **prefixo de palavra**, para a lista responder a "vig" enquanto
alguém digita; conversa casa por **trecho**, porque quebrar dezesseis mil
mensagens em palavras a cada tecla não se paga, e quem procura dentro da
conversa escreve a palavra inteira.

**A ordem padrão é a atividade, não a data do atendimento.** Um chamado aberto
semana passada e respondido hoje é trabalho de hoje. A data de abertura diz
quando ele nasceu, que é outra pergunta, e continua na lista.

**A contagem por etapa fica ao lado do filtro**, contada depois dos outros
filtros e antes do de etapa: "A analisar (812)" diz onde está o trabalho antes
de alguém clicar para descobrir. Contar depois do próprio filtro daria o total
da etapa escolhida e zero nas outras.

**Seta e `j`/`k` andam pela fila**, dentro da página e sem dar a volta: voltar
ao primeiro depois do último faz alguém reler sem perceber. Como todo atalho de
uma tecla, precisa da guarda de digitação, senão `k` no campo de busca move a
lista em vez de escrever. O selecionado acompanha a rolagem e se anuncia por
`aria-current`: o destaque é cor, e cor não chega a quem lê por leitor de tela.

**A identidade do array importa, e não só o conteúdo.** `ticketsOf` filtra e
devolve um array novo a cada chamada, então cada render entregava mil
atendimentos numa embalagem diferente. Todo trabalho guardado por coleção (o
índice da busca num `WeakMap`, a triagem num `useMemo`) via chave nova e refazia
tudo: **4,4 s entre a tecla e a lista responder**, medido, contra 120 ms depois.
O índice não era o gargalo; a chave dele era.

**Duas perguntas, duas vistas.** Atender é "este atendimento aqui"; a fila de
triagem é "por qual começar". Com mil na fila a segunda deixa de ser opcional, e
ela existia só dentro do Levantamento, que é outra tela: mandar quem trabalha os
atendimentos para outro lugar para descobrir por onde começar é o que faz
ninguém descobrir.

**A fila espera o acervo chegar.** A ordem sai de `score = quantos * (1 -
cobertura)`, e sem a Biblioteca a cobertura de todo grupo é zero, que é a
leitura mais alarmante possível: "o acervo não responde nada disto". Foi o que a
tela mostrou por alguns segundos rodando contra o banco, com os 1.822 artigos a
caminho. Enquanto não chegou, esqueleto.

### A análise, exercitada contra dado real

Ela estava quebrada de ponta a ponta, e a tela dizia sempre a mesma frase: "não
foi possível concluir a análise". Foram três defeitos empilhados, e nenhum deles
tinha como ser diagnosticado da tela.

**O pedido levava o registro cru junto.** O contexto passava o atendimento
inteiro, e o atendimento passou a carregar `raw`, que é o que a HubSpot devolveu
sem redução: e-mail, telefone e as 795 propriedades do objeto. Isso ia ao
provedor de IA **por acidente**, que é a pior forma de decidir sobre dado de
cliente, e o contrato estrito do servidor recusava todo pedido desde o dia em
que o campo entrou no modelo. Hoje os campos vão nomeados um a um; se um do
registro cru fizer falta ao prompt, alguém decide que ele vai.

**O contrato mostrado ao modelo tinha uma chave que não era resposta.**
`z.toJSONSchema` acrescenta `$schema`, que declara o dialeto do documento. O
modelo não tem como saber a diferença entre metadado e campo: mostrado o objeto
e mandado responder naquela forma, ele devolvia `$schema` junto, e o contrato de
saída, estrito, derrubava a análise.

**Resposta cortada não é resposta inválida.** Sem `maxOutputTokens` declarado
vale o teto do modelo, e a análise de uma conversa de oitenta mensagens chega
perto dele: o JSON vinha aberto e sem fechar. Isso subia como "formato inválido,
peça de novo", que manda repetir um pedido que vai ser cortado no mesmo lugar. O
`finishReason` decide, e o que não é `STOP` é dito como veio.

**E "dados inválidos" sozinho é detalhe nenhum.** As cinco rotas de IA
respondiam a frase e mais nada, nem na tela nem no registro do servidor. Agora
dizem o caminho do campo e o motivo, que é forma e não conteúdo: nenhum valor do
pedido é copiado para a resposta.

### A pergunta é do cliente; a resposta é um modelo

**A triagem agrupava pela resposta do suporte, e o Levantamento cobrou.** Com os
1.025 atendimentos reais, os dois maiores achados eram "156 atendimentos usam as
mesmas palavras (ajuda, conhecimento, entendermos, hesite)" — que é *"Precisa de
Ajuda? Base de Conhecimento"* e *"não hesite em nos contatar"*. O grupo era o
**rodapé**, e a tela apresentava metade do acervo como um assunto só.

**Cortar por frequência não separa aqui, e isso foi medido.** No e-mail do
suporte a faixa de 8% a 30% é rodapé quase inteira — "balão", "canto",
"inferior", "rosa", "hesite", os nomes de quem atendeu — e dentro dela estão
"builder" (19%) e "eberick" (11%), que é o que distingue um chamado do outro.
Não existe limiar que separe os dois, porque o corpus é dominado por um modelo
de e-mail só. Funciona no acervo de artigos porque lá os textos são diversos.

O que separa é **de quem é a fala**: 5.843 termos distintos na resposta do
suporte contra 11.799 na fala do cliente, nos mesmos atendimentos. Sem conversa,
volta para título e solução — são 119 dos 1.025.

**Enfeite não é descrição, e quem diz isso é o corpus.** A unidade é o
**parágrafo**: são 9.005 distintos na fala do cliente, e 8.717 aparecem numa
conversa só. Passando de 2%, sobram **vinte e nove**, e os vinte e nove são
enfeite — o clique de menu ("Estou ciente e desejo continuar", 44%), o rodapé de
descadastro, o endereço da empresa, "Technical Support Analyst", e as três
linhas do aviso de segurança que o servidor de e-mail injeta.

O parágrafo, e não a mensagem inteira, porque **o aviso de segurança vem
antes** do texto da pessoa: marcador estrutural corta para baixo e não o
alcança, e descartar a mensagem jogaria fora a descrição junto. Ele colava
"pagamento de boleto" com "exportar do Builder para o Revit".

**E a assinatura sai por dois caminhos, que se somam.** `corpoEscrito` corta o
que é estrutural e raro — o `--` da convenção de e-mail, o aviso jurídico, a
citação "…escreveu:" — e a contagem por parágrafo pega o que é comum e não tem
forma. Um sozinho não bastava: a assinatura de quem escreveu uma vez só não se
repete, e o banner do gateway não tem delimitador.

Em acervo raso a fração sozinha tem um buraco: com duas conversas, 2% dá 0,04 e
**qualquer** trecho passa, e a descrição inteira viraria enfeite. Daí o piso de
três conversas.

**Entidade numérica também é lixo de HTML.** `&#xa0;` chegou em 115 mensagens e
virou a palavra "xa0", exibida como um dos termos que descrevem um grupo de
treze atendimentos. A lista de entidades nomeadas não a cobria: a mesma coisa
tem duas escritas.

**E atendimento sozinho vira um achado só.** É a lição de "artigo sem seção" de
novo, e aqui ficou aritmética: são 679 grupos e só 80 têm mais de um
atendimento. Os outros 599 diriam, um a um, "foi resolvido e não virou artigo" —
verdade sobre quase todo atendimento, e inútil para escolher qual. Um punhado
ainda cabe individualmente; acima disso o caminho é a fila de triagem.

**A explicação do grupo desempata por raridade, não pelo alfabeto.** Quase todos
os termos empatam na contagem dentro do grupo, e o desempate era
`localeCompare`: a tela dizia "usam as mesmas palavras (abrir, absoluta,
anexos, antes)", que é um trecho de dicionário. O que descreve um grupo é o que
ele tem e os outros não.

**Sem fala do cliente sobra o título, e só ele.** Voltar para a solução traria o
e-mail do suporte de volta — o grupo com título "Estou ciente e desejo
continuar" reapareceu colado por "balão, canto, direito". São 876 atendimentos
pela fala, 104 só pelo título, e 45 que ficam de fora por não darem três
termos: "teste 2", "Pagamentos", "Atendimento AltoQi", que não descrevem nada.

**A barra de tamanho mínimo foi medida e não mexeu.** Baixar de 5 para 4 ou 3
mudava 61 grupos para 62, então ficou como está: medir e não mexer também é
resultado.

Medido de ponta a ponta na tela: **290 achados, com um grupo de 156 colado pelo
rodapé**, viraram **73, com o maior em 13 e os termos descrevendo o assunto**
("formalizacao, contrato, cancelamento"; "b2g, qionboarding, municipio").

### O e-mail do suporte não é vocabulário

O que a HubSpot devolve como solução é o **e-mail inteiro**, com saudação,
assinatura, links e horário de atendimento. Tokenizado cru, ele agrupava
atendimentos pela correspondência e não pelo assunto, e isso apareceu na
primeira vez que a fila rodou contra dado real:

- multa de cancelamento e pagamento de dívida no mesmo grupo, unidos por
  "atenciosamente, atendentes, acesse, agradecemos": o grupo era a **assinatura**
  de quem respondeu;
- importação de IFC e falha ao abrir o programa no mesmo grupo, unidos por
  "12h, 13h30, 17h30, 9h": o grupo era o **expediente**;
- `2e82`, `4abd` e `360002887154` listados como as palavras que descrevem um
  grupo, sendo pedaços de identificador dentro de uma URL.

São três cortes, e cada um responde a um desses. Endereço e e-mail saem antes de
virar palavra; a cortesia da correspondência tem lista própria; e hora de
relógio sai da regra que existe para deixar `D15` e `V10` entrarem. Número solto
sai junto das palavras comuns, porque `47968252511` é chamado e `2024` é ano em
qualquer texto deste produto.

A lista vive em `lib/vocabulary` e é **opt-in**: só o texto do atendimento a
pede. Artigo publicado não abre com "prezado", e "acesso" ou "atendimento" são
assunto legítimo dentro de um artigo.

E ela não vale só para a triagem. A busca por artigos relacionados que a análise
faz casava pela correspondência também: um chamado de importação de IFC no
Eberick trouxe um artigo sobre o Visus Cost Management, ligado por "situação,
neste, atendimento, identificamos, solicitação". Relacionado que não se sustenta
é pior que nenhum, porque a análise apresenta os cinco como o que o acervo tem
sobre o caso, e quem confia abre os cinco uma vez só.

**E a lista escrita à mão não dava conta.** A consulta que a análise faz é a
conversa inteira do atendimento, oitenta mensagens, e ali aparece todo o
português: a tela apresentava sessenta termos como o motivo de um artigo ser
relacionado, "você" e "etc" entre eles. Enumerar palavra comum de português é
lista sem fim.

Quem as descarta é o **próprio acervo**: termo que está em um quarto dele não
distingue artigo nenhum. Medido nos 1.822 publicados, são 15.105 termos
distintos e **119** passam do limiar, exatamente o ruído: "para" em 99%, "que"
em 98%, "projeto" em 76%, "selecione" em 50%. Custa alguns termos de engenharia
na fronteira, e é o lado certo do erro: o que está em quinhentos artigos não
estreita busca nenhuma.

A medição é uma passada por acervo, **158 ms medidos**, guardada num `WeakMap`
na própria lista: a segunda abertura não paga nada, e quando o acervo muda a
chave muda junto. Quando o portal mudar, ela muda sozinha, sem ninguém abrir o
código.

O cartão mostra **oito** e conta o resto. Uma parede de palavras não explica por
que o artigo é relacionado, ela esconde.

**Havia três listas de palavras comuns, e elas divergiam.** A comparação entre
artigos descartava "projeto" e "janela"; a busca por relacionados tinha as suas
trinta e cinco, sem tirar acento, e as deixava passar. Agora a **lista** é uma
só, e o **tamanho mínimo** continua de quem chama: comparar dois artigos longos
quer a barra alta, senão qualquer par do Builder se parece; casar uma consulta
contra o acervo quer a barra baixa, porque "laje", "viga", "SPDA" e "IFC" são
justamente o que separa um artigo do outro aqui.

A cobertura que a fila mostrava antes disso estava **inflada pelo mesmo ruído**:
o que o acervo "cobria" eram as palavras de cortesia.

## Operar em volume

Cartão e tabela **convivem**. A grade responde "o que tem aqui" e é boa para
poucos; a tabela responde "onde está este e o que falta nele", que é a
pergunta de quem opera um acervo de 1.800. Trocar uma pela outra responderia
metade.

Forma e colunas ficam **no navegador**. "prefiro tabela" é sobre esta máquina,
como o tema. O que é da equipe são as **visões salvas**, que guardam o recorte
inteiro: filtros, ordenação e colunas. Como o painel, a visão guarda a
pergunta e não a resposta.

O título não pode ser escondido: sem ele a linha deixa de identificar o
registro, e a tabela vira um conjunto de atributos sem sujeito.

**A busca olha o corpo do artigo.** Ela lia título, resumo, seção, tags e
palavras-chave, e com o portal importado o que se procura quase nunca está no
título, está no meio do texto. O texto limpo de cada artigo é indexado uma vez
por acervo, e não a cada tecla: refazer a limpeza de mil e oitocentos HTMLs por
letra digitada seriam vinte e dois megabytes de expressão regular por toque.

Quando a busca casa, o cartão mostra **o trecho com o termo destacado**. Sem
ele a lista informa que doze artigos casam e não diz por quê, e a pessoa abre os
doze. Acento não atrapalha em lugar nenhum: quem digita "secao" acha "seção",
porque exigir o acento certo é fazer errar duas vezes antes de achar.

**Título repetido não é sempre problema nosso, e a ação muda com isso.** Dos
seis títulos repetidos no acervo, **cinco são do portal**: cada artigo tem
endereço próprio lá, e apagar um aqui não resolve porque a próxima importação o
traz de volta. A decisão é de quem publica. O sexto é nosso: o portal serve a
mesma página por `/articles/<id>` e por `/<slug>`, e como a identidade sai da
URL, o mesmo texto entrou duas vezes.

Dizer "decidir qual fica" para os cinco primeiros seria mandar alguém fazer um
trabalho que volta sozinho na semana seguinte.

**Artigos que se sobrepõem é o achado que só o acervo inteiro permite.** Dois
artigos ensinando a mesma coisa, cada um respondendo metade, e quem procura
encontra um dos dois sem saber do outro. A comparação é **dentro da seção**.
Mais barata e mais significativa, porque parecidos em seções diferentes
costumam ser o mesmo assunto visto de ângulos diferentes, que é o desenho do
portal e não defeito.

O que o Levantamento calcula é **vocabulário em comum, não duplicata**: dizer
que dois artigos cobrem o mesmo assunto exige ler e comparar sentido. Seção
grande demais para comparar aos pares é **anunciada**, não pulada em silêncio.

E apontar não resolve: o achado leva para a tela de comparação, que responde a
pergunta de quem vai decidir, **o que este tem que aquele não tem?**. Ela não
funde nada; unir, arquivar ou deixar como está continua sendo decisão de quem
revisa.

**Paginação, não rolagem infinita.** Com 1.800 linhas a rolagem esconde onde a
pessoa está e impede voltar ao mesmo ponto, e página não exige biblioteca
nova no projeto, que virtualizar exigiria. Página fora do intervalo é
corrigida em vez de devolver vazio: filtrar estando na página 7 deixaria a
tela em branco com registros logo ali.

**Em lote só o que toda a seleção alcança.** O estágio oferecido é a interseção
das transições possíveis; oferecer o que vale para parte aplicaria a metade e
falharia na outra, em silêncio. Marcar tudo marca **a página**, e não o recorte
inteiro: o atrito é proposital.

Excluir em lote existe desde que o **desfazer em lote** existe, e nessa ordem.
Um clique que manda duzentos artigos para a lixeira precisa de um caminho de
volta do mesmo tamanho, e desfazer duzentas vezes não é caminho de volta.

O desfazer devolve **os que foram levados naquele clique**, e não tudo que
está na lixeira: restaurar por engano o que alguém excluiu ontem seria o
desfazer criando o problema que veio consertar.

O diálogo de confirmação concorda em número. "3 artigo(s) vai para a lixeira e
pode ser restaurado" é uma frase escrita para um caso e usada noutro, e quem
lê rápido uma frase que não concorda desconfia da tela inteira.

**O recorte vive na URL.** Filtro, busca, ordenação e página não viviam no
endereço, então não existia link que reproduzisse a tela exata, que é o que
se cola no chat da equipe. Com o acervo importado isso pesa: apontar para "os
que ficaram sem seção" precisa de um endereço.

O primeiro render devolve o padrão e a URL entra num efeito, como todo estado
que só o navegador conhece. A escrita é `replaceState`, e não `pushState`: cada
tecla na busca viraria uma entrada no histórico, e o botão de voltar deixaria
de voltar para a tela anterior para voltar letra por letra.

O que está no padrão **sai** da URL, e o que não é nosso **fica**: `?ticket=` e
`?plan=` já existem, e um deles sumir por causa de um filtro seria uma tela
derrubando a navegação de outra.

Valor vindo de fora é conferido contra o cadastro de hoje. Link colado
envelhece (categoria removida, coluna renomeada), e filtrar por algo que não
existe mais mostra tela vazia com cara de acervo vazio, sem quem abriu ter como
saber que o problema é o link.

Exportar entrega **o recorte que está na tela**, com as colunas escolhidas.
Quem exporta acabou de montá-lo. Exibir e exportar passam pelo mesmo
`cellValue`: escritos em separado, os dois divergem.

### Importar por arquivo

**Artigo e atendimento entram pela mesma porta.** O leitor delimitado vive em
`lib/delimited` porque não é assunto de nenhuma feature; o vocabulário e o
plano são de cada uma. O atendimento casa pelo `source.externalId` da HubSpot,
como o artigo casa pelo `portalArticleId`, e reimportar preserva a iniciativa
escolhida aqui dentro. Ela é decisão nossa, não do CRM.

A conversa **não** vem no lote. A exportação traz o ticket, não a conversa de
mensagens, e semear uma conversa vazia faria a análise achar que tem evidência
quando não tem.

O acervo entra por arquivo antes de entrar por integração. A HubSpot exporta
CSV, e arquivo não pede rede, credencial nem autorização de ninguém: o que a
API acrescenta é o *automático*, que é a segunda versão do problema.

**E entra pelo portal público, que acabou sendo o caminho melhor.** Duas portas,
e as duas continuam valendo: o arquivo serve a qualquer exportação e funciona
sem rede; o portal traz a seção onde cada artigo mora, que o CSV não dá.

A varredura é em lotes de dez, em série, com pausa entre as páginas. É o
servidor de suporte da AltoQi do outro lado, e varrer a toda velocidade é falta
de educação com uma máquina que atende cliente. Tem progresso na tela e botão
de parar, e **pula o que já está em dia** comparando o `lastmod` do sitemap com
o `updatedAt` do registro: sem isso, parar no meio e continuar depois custaria a
varredura inteira de novo.

A rota que busca as páginas confere que o destino é o portal, e mais nada. Sem
essa conferência ela seria um proxy aberto. Qualquer pedido faria o servidor
buscar qualquer endereço, inclusive dentro da rede onde ele roda.

**O mapeamento de colunas é uma tela, não uma adivinhação.** `guessMapping`
reconhece por correspondência exata e deixa em branco o que não reconhece.
Casar por trecho faria "nome do autor" virar título em mil e oitocentos
registros de uma vez, e ninguém revisa um por um para descobrir. Mesma regra
da seção: nome que não existe no cadastro vira vazio e é **contado**, nunca
encaixado no mais parecido.

O plano é calculado antes de gravar e mostrado inteiro. Quantos entram,
quantos atualizam, quantos ficam sem seção, quantas linhas o arquivo perde.
É a mesma regra do diálogo de exclusão: o número vem antes do clique.

**Não é preciso conhecer o formato do arquivo.** Cada coluna é oferecida com
um valor de exemplo, porque cabeçalho de exportação costuma ser `hs_body` ou
`col_12` e o nome não diz o que a coluna guarda. E a tela monta **o primeiro
registro como ele vai ficar**: contagem certa com mapeamento trocado é
perfeitamente possível (mil e oitocentos resumos no lugar do título somam mil
e oitocentos do mesmo jeito), e ver um registro pronto é o que denuncia.

Reimportar **atualiza** pelo `portalArticleId`, e o que o arquivo não traz é
preservado: gênero e responsável são nossos, não do portal, e a segunda
importação não pode apagar a classificação que alguém fez aqui dentro.

O leitor de CSV é nosso porque o caso que importa é específico: conteúdo de
artigo tem vírgula, aspas e quebra de linha **dentro** do campo, e um leitor
que parte no `\n` corta o artigo ao meio sem avisar. Ele também detecta o
separador (exportação brasileira sai com ponto e vírgula) e descarta o BOM
do Excel, que gruda invisível no primeiro cabeçalho e faz a coluna não ser
reconhecida.

A gravação é **uma** passada e **um** evento de histórico. Mil e oitocentas
chamadas ao servidor deixariam o acervo pela metade se uma falhasse, e mil e
oitocentas linhas iguais no histórico enterram tudo que aconteceu antes.

**A escala foi medida, e o acervo real cabe.** A projeção anterior dizia que
1.800 artigos estourariam o `localStorage`; ela estava errada. Com corpos de
HTML realistas, 1.800 artigos, 11,3 MB: a compilação de produção entrega:

| | |
| --- | --- |
| Ler o CSV e calcular o plano de importação | 833 ms |
| Gravar os 1.800 e mostrar | 179 ms |
| `JSON.parse` do acervo na abertura | 11 ms |
| Gravar o acervo inteiro no `localStorage` | 42 ms |
| Varrer título, resumo e conteúdo de todos numa busca | 9 ms |

Nada disso é gargalo, e a busca no cliente não precisa ir para o servidor.

**O gargalo era render, e só ele:** a grade de cartões recebia o recorte
inteiro enquanto a tabela paginava, 1.800 cartões, 81.163 nós no DOM. Agora as
duas paginam, e a mesma tela fica em 1.278 nós.

Medir em aba oculta não vale: o navegador estrangula o agendamento e o relógio
marca dez segundos com **zero tarefas longas** registradas. Quando o número de
parede discordar do tempo de CPU, é o instrumento que está errado.

O teto do `localStorage` continua existindo e varia por navegador, no Safari é
bem menor. Vale só para o modo local; no compartilhado o dado está no banco.

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
destino, **a tela diz isso**. Preenchê-los exigiria interpretar o texto, que é
o problema que o campo resolve; e número parcial apresentado como completo é
pior que número com ressalva.

O funil conta **chegadas**, não registros parados no estágio: um artigo que
passou por revisão e foi publicado passou pelos dois, e contar só onde ele está
agora esconderia metade do caminho.

Média de nada é `null`, nunca zero, zero diria "chega instantaneamente".

Relógio nunca é lido durante o render. Use `useNow`: ler no render é impuro e
diverge na hidratação, porque servidor e cliente têm horas diferentes.

## Indicadores

**O tempo do ciclo atravessa registros, e é o único que atravessa.** Do dia em
que o cliente perguntou até o evento que publicou o artigo nascido dali. O resto
do painel mede um artigo indo de rascunho a publicado, que é o tempo da
**redação**: o do ciclo inclui tudo que fica parado antes de alguém começar a
escrever, que é justamente onde ele trava.

`averageDaysTo` não responde isso e não deveria: ela conta da primeira aparição
**do registro** no histórico.

A mediana vai ao lado da média porque a média mente aqui. Um artigo antigo
publicado hoje, a partir de um atendimento de dois anos atrás, sozinho leva a
média a centenas de dias, e quem lê conclui que o ciclo é lento quando o normal
são duas semanas.

Conta a **primeira** publicação, não a última: um artigo recolhido e republicado
fechou o ciclo na primeira vez, e contar a segunda faria uma correção de vírgula
parecer atraso de meses. O que não fecha o ciclo fica fora, com ressalva por
motivo: sem atendimento de origem, sem data que dê para situar no tempo, ou
publicado antes da data do atendimento.

**São dois pipelines com vocabulários próprios, e os campos não se fundem.** O
de Setup pergunta a causa raiz e chama o motivo de "sintoma"; o de Suporte tem
só a categoria, e não tem causa nenhuma. Um chamado passa por um dos dois, então
cada lista cobre uma parte do acervo — somar Sintoma com Categoria num ranking
só misturaria dois vocabulários sem que quem lê tivesse como saber.

São sete campos, e os nomes saíram do ticket real: `[Setup] Causa | Qual a causa
raiz que gerou o problema?`, `[Setup] Sintoma | Motivo detalhado do contato`,
`[Setup] Tipo de Problema`, `[Support] Categoria | Motivo principal do contato`,
`Fechamento | Qual o motivo do encerramento do ticket?`, `Quem abriu?` e
`Proteção tecnológica`.

**O vocabulário vive num lugar só**, `models/TicketClassification`: a importação
reconhece o cabeçalho, a contagem agrupa e a tela desenha, e as três precisam
concordar sobre quais campos existem. Escritas em separado divergem — já
aconteceu com o cadastro de rotas e com as chaves de armazenamento — e aqui a
divergência apareceria como a tela oferecendo uma lista que a importação nunca
preenche. Cabeçalho repetido entre dois campos é recusado por teste: o
mapeamento escolhe a primeira coluna que casa, e a coluna cairia num campo por
acidente.

**As sete estão vazias, e vão continuar.** Elas entram pelo relatório
exportado, não pela API: o escopo `tickets` não está na credencial, e a
exportação em CSV não está disponível para a equipe. Nenhuma das duas portas é
decisão nossa.

**O que sobrou é o próprio cliente.** O bot pergunta antes de abrir o chamado, e
pergunta e resposta são mensagens da conversa, que já temos. Não é dedução: é a
opção que a pessoa clicou, copiada literal. Medido nas 974 conversas: 409 trazem
a área do contato e 314 o tipo da solicitação.

Elas ficam **ao lado** das propriedades do ticket e rotuladas pelo que são — a
escolha do cliente, não a classificação que o suporte fez depois de ler o caso.
As duas se parecem e respondem perguntas diferentes, e quem leva um número a uma
reunião precisa saber qual está lendo. Causa raiz não tem equivalente aqui: ela
é o diagnóstico de quem atendeu, e não existe na conversa.

**Escolha de menu não termina em ponto**, e isso precisou ser medido. O teto de
tamanho sozinho deixou passar "Bom dia, voltou o acesso. Está funcionando
normalmente." — cinquenta e cinco caracteres, dentro do limite, listada no
ranking como se uma pessoa a tivesse escolhido. Nenhuma das dezesseis opções
reais tem pontuação de fim. "Voltar ao menu anterior" também sai: é navegação, e
quem voltou respondeu depois.

Vazio é o estado de todos os 1.025 nas sete do suporte, e a tela diz isso **uma
vez**, com o caminho junto — sete caixas idênticas seriam sete vezes a mesma
frase.

A fatia é sobre os **classificados**, não sobre o total: dividir pelo total
misturaria "isto é raro" com "isto não foi classificado", e as duas pedem
providências diferentes. Quantos ficaram de fora vai escrito ao lado.

**A reimportação atualiza, e o que o arquivo não traz é preservado** — a mesma
regra do artigo, que o atendimento não seguia. Ele era reconstruído do zero, e
isso ficou perigoso quando ele passou a chegar por dois caminhos: importar o
relatório só para somar a classificação teria apagado o `raw` de mil e vinte e
cinco registros, que é de onde saem o nome do cliente e o número do chamado.
Coluna mapeada manda, inclusive vazia; coluna ausente não opina.

O mesmo valia para a **edição à mão**: montado campo a campo, o formulário
apagava `raw` ao corrigir uma data. Campo a campo tem esse preço, e quem
acrescenta campo ao modelo precisa citá-lo ali.

E "motivo do contato" mapeava para o **assunto**, de quando o assunto era a
única coisa que descrevia o atendimento. Deixar assim apagaria a classificação
no mesmo movimento em que ela chega.

**O que o provedor de IA vê do atendimento é escrito à mão, campo a campo.** Era
o modelo inteiro, e por isso o `raw` vazou para lá no dia em que o campo nasceu.
Um tipo que copia o modelo manda ao provedor todo campo que alguém acrescentar
depois, sem ninguém decidir: causa e motivo ficaram de fora por decisão, e não
por esquecimento.

**Os assuntos que mais chegam são a fila de triagem lida por outra pessoa.** A
mesma conta: lá ela diz "leia este primeiro", aqui diz "é isto que está
chegando, e o acervo cobre tanto por cento", que é a frase que se leva a uma
reunião. A ordem muda junto com a pergunta: a fila ordena por sinal
(`quantos × (1 - cobertura)`), esta lista ordena por **volume**, senão o número
na tela discordaria da lista embaixo dele.

**A página exporta inteira.** Os painéis já saíam um a um, e um a um é o que não
serve para quem monta um slide: eram doze arquivos. A planilha leva o recorte
que gerou os números escrito em cima e a ressalva ao lado de cada um que tem
uma, porque fora da tela ninguém sabe o que ficou de fora.

## Painéis

O painel guarda a **pergunta**, não a resposta: origem, quebra, janela e forma
de visualizar. O número é recalculado a cada abertura, sobre os dados que
existem agora. Gravar o resultado seria gravar um número que envelhece em
silêncio.

`runPanel(spec, dados, agora)` é puro e recebe tudo pronto: os providers já têm
as coleções em memória, então somar mais um cartão não custa consulta nenhuma.

**Nem toda quebra serve a toda origem.** `allowedBreakdowns` diz o que cada uma
sabe responder, e `reconcileSpec` conserta a combinação impossível em vez de
gravá-la. "atendimentos por gênero" produziria uma coluna vazia com cara de
dado. A correção acontece na frente de quem edita, não depois.

Painel é **compartilhado**, como o resto do produto: não há papéis, e inventar
"meu painel" criaria uma noção de dono que nada mais aqui tem. Os padrão são
semente editável, com `defaultPanels` de volta pelo botão de restaurar, e os
que a equipe criou continuam onde estavam.

A quebra para em **duas dimensões**. Três não cabem numa tabela que se lê de
relance, e a leitura passaria a exigir girar um cubo. Que é outro tipo de
ferramenta, não uma versão mais completa desta. Cruzamento só sai em tabela:
barra empilhada esconderia metade dos números.

A imagem é desenhada por `panelToSvg`, que é **puro**: o mesmo painel produz
sempre o mesmo arquivo, e o desenho é conferido por teste em vez de olhado. Só
a rasterização para PNG precisa do navegador. As cores vão escritas no
arquivo: a imagem sai daqui para uma apresentação, onde não existe `:root`
para resolver `var(--primary)`.

Classificação vazia vira "Não definido" e **continua na tabela**: escondê-la
faria a soma das linhas não bater com o total, sem ninguém saber por quê.

Data que não dá para situar no tempo fica fora da janela e **vira ressalva**.
`timeOf` lê ISO e `dd/mm/aaaa`, porque o atendimento guarda `"15/07/2026"`
desde a primeira versão. Sem isso o painel mostrava zero com três atendimentos
na tela. O que sobra, `"Ontem, 16:20"` dos planos migrados, não é chutado:
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
mexer no `.env.local`. Conferir o modo navegador exigia editar o arquivo e
lembrar de desfazer, e esquecer o desfazer deixa a equipe inteira sem banco.

Um hook `PostToolUse` em `.claude/settings.json` roda `typecheck` e `test` em
segundo plano após edições em `.ts`/`.tsx`, avisando só quando algo quebra.

As CLIs da Vercel e da Supabase estão instaladas e autenticadas, então dá para
conferir deploy, ambiente e configuração sem abrir painel. No PowerShell chame
`vercel.cmd`: a política de execução recusa o `.ps1`.

Data na tela é `RelativeDate`: relativo no texto, instante exato no título.
O valor relativo entra depois da montagem. Servidor e cliente têm relógios
diferentes, e "há 2 minutos" divergiria na hidratação.

A trilha de navegação sai do **mesmo cadastro de rotas** do menu
(`components/layout/navigation`): duas listas do mesmo vocabulário divergem, e
a divergência apareceria como o menu dizendo "Métricas" e a trilha dizendo
outra coisa. O identificador do registro só vira degrau quando a tela passa o
nome, `uuid` na trilha é pior que trilha curta.

Indicador tem **recorte por equipe**, e ele vale só para plano e artigo, que
têm responsável. Atendimento e análise não têm atribuição, e a tela diz isso
em vez de deixar supor que tudo foi recortado.

`Ctrl+K` abre busca, comandos e "onde você estava". Comando é navegação;
publicar, aprovar e excluir ficam de fora, porque pedem intenção e uma lista
percorrida com a seta não é lugar para isso. `/` faz o mesmo e `?` lista os
atalhos, convenção de mercado, não invenção nossa.

Atalho de tecla única precisa da guarda de digitação: `/` e `?` são caracteres
comuns em português, e sem ela escrever "e/ou" abriria a paleta no meio da
frase.

Vistos recentemente ficam no navegador mesmo no modo compartilhado: "onde
**eu** estava" é sobre esta máquina, e sincronizar entre catorze pessoas
viraria ruído.

Testes cobrem lógica pura, nunca componentes: a leitura do sitemap e da página
do portal com o plano de importação e a decisão do que revisitar, o preparo do
HTML do artigo (âncora, cor removida, link resolvido, destaque da busca) com
a limpeza do que executa, o trecho da busca, a sobreposição entre artigos com o vocabulário que os
compara e a duplicata de título com a distinção entre a do portal e a nossa, a porta da HubSpot com o freio dela e a decisão da busca
automática, a leitura do anexo do cliente, a janela da busca, a busca e os recortes do atendimento, a triagem dele e a consulta da análise com o corte
do que a correspondência traz junto e a medição do que o acervo repete, a recusa que diz qual campo, a comparação de dois, a leitura da conversa da HubSpot com a paginação que não
para na página vazia, o mapeamento de mensagens do provedor, a consulta da IA
sobre o artigo, o rótulo da iniciativa, motor de busca e busca
transversal, transições de artigo e de plano, métricas por projeto e por
período, o tempo do ciclo com as ressalvas dele e a planilha da página, parsing da resposta da IA, a escolha do provedor com a classificação
das falhas dele, a leitura da sugestão de seção, a leitura do preenchimento de
formulário com a seleção do que aplicar e a classificação do arquivo
anexado, o recorte na URL, a central de avisos, o catálogo de ações guardadas e a auditoria do histórico, o levantamento, índice do artigo, critérios de publicação,
fronteira de armazenamento com a divisão em lotes da
gravação compartilhada e o plano da releitura incremental, a leitura de arquivo delimitado com o mapeamento de
colunas e os planos de importação de artigo e de atendimento, a recuperação de texto não salvo, o cadastro
de taxonomia com a migração da
classificação antiga, a contagem da classificação com o vocabulário dos dois pipelines e a leitura da escolha que o cliente fez no bot, os normalizadores de artigo, plano e atendimento, o motor
e o desenho dos painéis, a trilha de navegação, o recorte por equipe, as
menções, o que se acompanha, a lixeira, a tabela com suas visões salvas, o rascunho do artigo e a tradução
do erro de acesso.
Ao mexer em qualquer uma delas, o teste vem junto.

Dois cuidados que já custaram tempo: `npm test` **não** faz typecheck, só o
`typecheck` pega erro de tipo em arquivo de teste; e o hook roda em segundo
plano, então o aviso de falha chega depois da edição, não junto dela.
