# O que cada tela faz, e para que serve

Guia de uso do Visus Knowledge Intelligence. Escrito para quem vai **usar** o
produto, não para quem vai mexer no código — as decisões de arquitetura estão no
`CLAUDE.md`.

---

## O ciclo, em uma frase

O produto existe para uma coisa: **transformar atendimento de suporte em
conhecimento publicado, sem que alguém precise ler o acervo inteiro à mão.**

```
Atendimento → Análise por IA → Revisão humana
            → Oportunidade → Plano → Artigo → Governança
```

Duas regras atravessam tudo e explicam quase todas as escolhas de tela:

**Nada é inventado.** Se um número não pode ser derivado dos dados reais, ele não
aparece. O que o produto calculou vem rotulado como calculado; o que um modelo
propôs vem marcado como proposta.

**A decisão é sempre de uma pessoa.** A IA lê, resume, compara e propõe. Publicar,
excluir, unir e classificar continuam sendo cliques de gente.

---

## Levantamento

**Responde:** "o que o acervo está me pedindo hoje?"

É a tela que carrega o propósito do produto. Antes dela, alguém percorria o
acervo à mão para descobrir o que criar, atualizar ou revisar. Aqui a resposta é
derivada dos dados, e cada achado diz **o que fazer**, **por que**, e leva para
onde se faz.

Os achados são todos **calculados**, nenhum vem de modelo:

| Achado | O que ele viu |
| --- | --- |
| Seção vazia | Uma categoria do portal sem nenhum artigo publicado |
| Artigo sem seção | O artigo não aparece na cobertura de nenhuma seção |
| Sem resumo | O artigo não tem resumo, e a busca depende dele |
| Parado | Nada aconteceu com o registro há muito tempo |
| Envelhecido | O artigo está publicado há muito e nunca foi revisto |
| Atendimento sem cobertura | Foi resolvido e o acervo não responde àquilo |
| Sobreposição | Dois artigos da mesma seção dividem muito vocabulário |
| Título repetido | Dois artigos com o mesmo nome |

**Por que os achados são agrupados.** Uma linha por seção descoberta produziu 117
achados na primeira execução — a lista do portal inteiro, afogando os três que
alguém resolveria naquele dia. Acima de um punhado, o achado vira um só e o
caminho deixa de ser "abra este registro" e passa a ser um mutirão.

**Avaliar as sobreposições.** O botão manda a IA ler cada par e dizer se cobrem a
mesma dúvida. O vocabulário em comum que a tela mostra é contagem de palavras, e
não veredito: dois artigos podem citar "licença" e responder coisas diferentes.
A varredura custa um pedido por par e mostra o preço antes do clique; dá para
escolher quantos e parar no meio.

---

## Atendimentos

**Responde:** "o que chegou do suporte, e por onde eu começo?"

A tela tem duas vistas, porque são duas perguntas diferentes.

### Atender

Um help desk de três colunas: a lista à esquerda, a conversa no centro, o
contexto à direita, e a análise embaixo. A identidade fica acima da conversa —
número da HubSpot, cliente e assunto.

**A busca alcança o que o cliente escreveu**, e não só os campos: metade dos
assuntos começa com "Ticket AltoQi nº", e quem procura "modelo IFC deslocado"
procura uma frase da terceira mensagem.

Três recortes, cada um respondendo uma coisa: **cliente** ("o que este me
pediu"), **empresa** ("o que esta conta abriu") e **produto** ("quanto disto é
Eberick"). O produto é deduzido do texto, e o rótulo diz isso.

Seta, `j` e `k` andam pela fila sem dar a volta.

### Fila de triagem

**Responde:** "qual atendimento vale ler primeiro?"

Agrupa os atendimentos resolvidos que ninguém leu ainda, por vocabulário em
comum. A ordem sai de `quantos perguntaram × (1 − o quanto o acervo cobre)`: os
de cima são os que mais gente perguntou e o acervo menos responde.

**O agrupamento ouve o cliente, não o suporte.** Agrupando pela resposta, os dois
maiores achados eram 156 atendimentos colados pelo rodapé do e-mail — o grupo era
"Precisa de Ajuda? Base de Conhecimento" e "não hesite em nos contatar".

**Virar artigo** monta o material a documentar (o que os clientes relataram e como
o suporte resolveu), pergunta à IA se o acervo já cobre, e só escreve o rascunho
quando não cobre. O rascunho abre no formulário da Biblioteca para você conferir;
nada é publicado.

### Trazer da HubSpot

Busca conversas do help desk e transforma em atendimento. **É de quem
administra** — não por causa do conteúdo, mas porque gasta requisições contra o
servidor que atende cliente.

Há um interruptor que para tudo, inclusive uma varredura já em curso, e uma busca
automática que roda **com o produto aberto** (não é um serviço de servidor).

A janela da busca automática é **atrasada** alguns dias de propósito: o chamado é
associado à conversa horas depois, e ler o que acabou de chegar é ler antes de
existir o que se quer.

### Anexos

O print da tela com o erro costuma ser a evidência que falta. Buscar os anexos
copia os arquivos **uma vez** para o nosso balde; da segunda em diante a HubSpot
nem fica sabendo. A varredura já conta quantos há, então a tela não oferece
"buscar anexos" onde sabidamente não existe nenhum.

---

## Biblioteca

**Responde:** "o que o acervo tem, e o que falta nele?"

É o espelho local do `suporte.altoqi.com.br`, com a estrutura dele: **categoria →
seção → artigo**. Só artigo **publicado** conta como cobertura documental.

### Ver o acervo

**Cartão e tabela convivem.** A grade responde "o que tem aqui"; a tabela responde
"onde está este e o que falta nele", que é a pergunta de quem opera 1.800 artigos.
A forma e as colunas ficam nesta máquina; o que é da equipe são as **visões
salvas**, que guardam o recorte inteiro.

**A busca olha o corpo do artigo**, e mostra o trecho com o termo destacado —
sem ele a lista diz que doze artigos casam e não diz por quê. Acento não
atrapalha: quem digita "secao" acha "seção".

**O recorte vive na URL**, então dá para colar no chat da equipe um link que
reproduz a tela exata.

### Escrever e editar

O editor edita o HTML do portal **no próprio formato**, sem reserializar: o que
ninguém tocar continua idêntico. A colagem traz só o que a barra sabe produzir,
senão o Word entraria inteiro num artigo que vai para o cliente.

**Avaliar no acervo** é a função que originou o produto: antes de escrever, a IA
varre o acervo e diz se o assunto já está coberto —

- **coberta** — um artigo existente já resolve. Não vem rascunho.
- **parcial** — trata do assunto e deixa parte de fora, e ela diz **o que falta**.
- **ausente** — ninguém escreveu, e ela rascunha na forma dos artigos da seção.

Preferir atualizar é regra: um acervo de 1.822 piora mais por dobrar assunto do
que por ter um artigo a menos.

**Consultar a IA sobre este artigo** lê o texto com você: resume, aponta lacuna,
diz o que parece desatualizado. Ela responde **a partir do artigo** e avisa
quando ele não trata do assunto, em vez de completar com conhecimento geral.

**O publicado continua no ar** enquanto a próxima versão é preparada. Corrigir uma
vírgula não faz uma seção do portal parecer descoberta.

### Comparar artigos

Dois artigos lado a lado, com os atributos que diferem em destaque e o
vocabulário que cada um tem sozinho.

A IA lê os dois e responde: **mesma dúvida**, **complementares** ou **assuntos
diferentes** — e, quando faz sentido unir, diz qual fica e **o que precisa ser
levado do outro**. Essa lista é a parte que importa: é o que se perderia numa
união descuidada.

### Trazer artigos

Dois caminhos, os dois valem:

- **Do portal** — varre o `sitemap.xml` público, traz título, resumo, corpo e a
  trilha que dá categoria e seção. Pula o que já está em dia.
- **De arquivo** — CSV ou similar, com uma tela de mapeamento de colunas que
  mostra o primeiro registro pronto antes de gravar.

Reimportar **atualiza** e preserva o que é nosso: gênero e responsável não vêm do
portal, e a segunda importação não apaga a classificação que alguém fez aqui.

**Sugerir seção** manda a IA classificar os artigos que ficaram sem seção. Ela
propõe, você aprova, e o que ela não souber classificar fica sem seção mesmo —
que é estado legítimo.

---

## Projetos

**Responde:** "como vai esta iniciativa de melhoria?"

**Projeto é uma iniciativa, não a unidade de contexto de tudo.** Um esforço
datado, com meta, que os atendimentos alimentam. Ele recorta o que é **trabalho**
(atendimento, análise, oportunidade, plano) e **nunca o acervo** — a Biblioteca é
do hub e não tem recorte.

Cada projeto mostra o funil, o que pede atenção e os atalhos para cada módulo.

---

## Plano de Melhorias

**Responde:** "o que foi decidido virar trabalho, e em que pé está?"

Nasce de uma oportunidade aprovada na revisão da análise. Tem atividades,
critérios de publicação e responsável.

**Atrasado e parado são perguntas separadas:** um plano sem prazo pode estar
parado, e um com prazo distante também. Parada se mede pelo último evento do
histórico, nunca pela data de gravação.

**Acompanhar não é assumir.** Quem abriu o atendimento que originou o plano quer
saber quando ele publica sem virar responsável por isso.

---

## Métricas

**Responde:** "como o ciclo se moveu?"

Painéis que guardam a **pergunta**, e não a resposta: origem, quebra, janela e
forma de ver. O número é recalculado a cada abertura, sobre os dados de agora.

O **tempo do ciclo** é o único indicador que atravessa registros: do dia em que o
cliente perguntou até o artigo nascido dali ser publicado. A mediana vai ao lado
da média porque a média mente aqui — um artigo antigo publicado hoje leva a média
a centenas de dias.

**Os assuntos que mais chegam** é a fila de triagem lida por outra pessoa: lá ela
diz "leia este primeiro", aqui diz "é isto que está chegando, e o acervo cobre
tanto por cento", que é a frase que se leva a uma reunião.

A página exporta inteira, com o recorte escrito em cima e a ressalva ao lado de
cada número que tem uma.

---

## Atividades

**Responde:** "o que aconteceu, quem fez, e quando?"

Todo fato relevante do ciclo vira um evento. Eventos são **acrescentados, nunca
editados**: registram o que aconteceu, não o estado atual.

Para quem administra, a mesma lista responde outras perguntas — "o que esta
pessoa fez", "o que mudou na semana passada" — e a resposta **atravessa
iniciativas**, porque recortar por projeto deixaria de fora justamente quem
trabalhou noutro.

---

## Configurações

Quem conduz o trabalho e o que cada um pode fazer.

**Não há papéis, por decisão.** A equipe é treinada e o histórico responde por
quem fez o quê. A exceção é curta e está escrita na tela: **seis ações** cujo
custo não é do conteúdo — buscar na HubSpot gasta requisições contra uma máquina
que atende cliente, esvaziar a lixeira apaga para catorze pessoas, importar um
arquivo reescreve mil registros num clique.

A tela diz **onde cada regra é conferida**: a da HubSpot é conferida no servidor
e não se afrouxa; as outras são escondidas na tela, o que impede o clique e não
impede quem conhece o caminho. Apresentar as duas do mesmo jeito seria vender uma
trava que não existe.

Aqui também ficam a **taxonomia** (categorias, seções, gêneros — cadastro, não
constante) e o **"responde por"** de cada equipe, que é o que faz classificar um
artigo sugerir o autor.

---

## Integrações

Mostra o estado real do ambiente: qual provedor de IA está valendo e por quê,
e o que a credencial da HubSpot alcança.

Ela lê do **mesmo catálogo** que o servidor usa para escolher. Duas listas do
mesmo vocabulário divergem, e a divergência apareceria como a tela dizendo
"conectado" sobre um provedor que a análise não usa.

---

## O que atravessa todas as telas

### O assistente

O botão flutuante **"Falar com a IA"** abre um painel que você arrasta para onde
quiser. Ele sabe em que tela você está e responde **do que aquela tela mediu**.

Na Biblioteca: *"existe conteúdo repetido?"*. Nos Atendimentos: *"por qual eu
começo?"*. Cada resposta traz **"O que a IA está vendo desta tela"**, que abre e
lista os números que foram no pedido — você lê "56 sem seção" e confere que
aquilo veio medido.

**Ela não lê o acervo inteiro**, e diz isso quando a pergunta pede. São 1.822
artigos e 22 MB: não cabem num pedido, e as perguntas que motivaram o painel o
Levantamento já responde por medição. O trabalho do modelo é o que a lista de
números não faz — explicar, priorizar, ligar as pontas.

Trocar de tela recomeça a conversa, de propósito: continuar o fio faria a IA
responder sobre a Biblioteca com os números dos Atendimentos ainda em mãos.

### Preencher formulário com IA

Nas telas de projeto, atendimento e artigo: descreva o caso (ou anexe um PDF, uma
imagem, um `.csv`) e a IA propõe os campos.

**Substituição não vem marcada.** Preencher campo vazio é ganho; cobrir texto que
alguém escreveu é decisão, e a tela diz qual é qual antes do clique. O que o
texto não sustenta **vira pergunta** em vez de palpite. O anexo vai ao provedor
durante o pedido e é descartado com a resposta.

### Excluir e desfazer

**Excluir manda para a lixeira.** O registro sai da vista e continua existindo.
O aviso oferece **desfazer** na hora, e a lixeira é a rede durável.

Excluir não bloqueia por causa do que deriva do registro, mas **diz o número
antes do clique**: "excluir este atendimento" e "excluir este atendimento, a
análise dele e o plano que ele originou" são decisões diferentes.

### Avisos

A central reúne três coisas: menção a você, movimento no que você acompanha e
movimento no que está atribuído a você. A lista é curta de propósito — um produto
que avisa demais é um produto cujos avisos ninguém lê.

O que **você** fez não é notícia para você. O já visto continua na lista, marcado
como lido, e marcar acontece ao **fechar**: quem abre ainda não leu.

*Limite conhecido:* a última visita fica neste navegador, então ler no computador
não marca como lido no celular.

### Buscar e navegar

`Ctrl+K` (ou `/`) abre busca, comandos e "onde você estava". Comando é navegação —
publicar, aprovar e excluir ficam de fora, porque pedem intenção e uma lista
percorrida com a seta não é lugar para isso. `?` lista os atalhos.

### Texto não salvo

Fechar um formulário com alteração pendente pede confirmação, e fechar a aba
inteira também. Além disso, o que está sendo digitado é gravado **neste
navegador** um segundo e meio depois de a digitação parar, e o formulário oferece
restaurar na próxima abertura.

Fica no navegador mesmo no modo compartilhado: texto pela metade no servidor
ficaria visível para a equipe antes de a pessoa decidir mostrar.

### Nova versão publicada

Quando sai uma versão nova, aparece um aviso no canto. Ele **não recarrega
sozinho** — quem está no meio de um artigo perderia o texto — e diz "salve antes"
quando há trabalho aberto.

---

## O que o produto deliberadamente **não** faz

| | Por quê |
| --- | --- |
| Não escreve na HubSpot | Publicar no portal é publicar para o cliente. Fica para a sprint ProjetoAprovado — e hoje a HubSpot não expõe API de Base de Conhecimento para isso |
| Não une artigos sozinho | Um artigo apagado por engano não volta como estava |
| Não classifica no chute | Seção que a IA não souber fica vazia. "Sem seção" é estado legítimo, e palpite com cara de decisão é pior |
| Não apaga a lixeira sozinho | Apagar trabalho num horário que ninguém escolheu é o mesmo problema da exclusão direta |
| Não manda e-mail | Não há serviço de e-mail; os avisos vivem dentro do produto |
| Não tem papéis | A equipe é treinada e o histórico responde por quem fez o quê |

---

## Limites que valem conhecer

**A IA tem cota.** O provedor tem limite diário e por minuto. As varreduras em
lote vão em série, com pausa, e guardam o que já veio quando falham — mas uma
varredura grande pode parar no meio, e a tela diz onde parou.

**A varredura só anda com a aba em primeiro plano.** O navegador estrangula aba
em segundo plano: medido, oitenta conversas em meio minuto com a aba ativa contra
vinte em vinte e cinco minutos com ela atrás.

**A busca automática depende de alguém com o produto aberto.** De madrugada e no
fim de semana ninguém tem a aba aberta, e nada entra. Por isso a retomada cobre o
intervalo perdido, e não só a última hora.

**Sete campos de classificação do suporte estão vazios**, e vão continuar: eles
vêm do relatório exportado da HubSpot, e nem o escopo da API nem a exportação em
CSV estão disponíveis para a equipe. Nenhuma das duas portas é decisão nossa. O
que sobrou é a escolha que o próprio cliente fez no bot, que fica ao lado e
rotulada pelo que é.
