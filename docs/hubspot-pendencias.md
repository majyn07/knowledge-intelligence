# HubSpot: o que está bloqueado, e de quem é cada coisa

> **Atualizado em 27/08, e o quadro melhorou.** O lado do **artigo** deixou de
> depender da HubSpot: o acervo do portal entra pelo site público, e a
> Biblioteca já está sendo carregada com os 1.822 artigos. Sobrou **um** pedido,
> e é o do escopo `tickets`, sem ele metade do ciclo do produto continua sem
> entrada. Ver a seção 4.

Levantado em 26 e 27/08/2026 contra a API real, com o token de app privado
`pat-na1-…` (hub `44552714`, app `50542060`, 41 escopos).

Tudo abaixo é leitura. Nenhuma chamada escreveu nada na HubSpot, e nenhum
registro de lá foi alterado.

Para reproduzir qualquer item: `npm run hubspot:conferir`.

---

## 1. Para quem emitiu a chave

Dois escopos ausentes bloqueiam metade do que a integração precisa. **Não são
erro de código nosso**: os endpoints estão certos e foram testados em mais de
uma forma.

### 1.1 Falta o escopo `tickets`. Bloqueia ler o atendimento

O atendimento foi procurado por **sete endereços**, para descartar que fosse
questão de rota, de nomenclatura ou de versão da API:

| Endpoint | Resposta |
| --- | --- |
| `GET /crm/v3/objects/tickets` | 403 |
| `GET /crm/objects/2026-03/tickets` | 403 |
| `GET /crm/v3/objects/tickets/{id}` | 403 |
| `GET /crm/v3/objects/ticket` (singular) | 403 |
| `GET /crm/v3/objects/0-5` (pelo objectTypeId) | 403 |
| `GET /crm/v4/objects/0-5` | 403 |
| `GET /crm/v3/objects/0-5/47673917220` (um registro) | 403 |

Todos com a mesma mensagem: *"The scope needed for this API call isn't
available for public use."*

**O bloqueio é do objeto `0-5`, não de um caminho.** No mesmo token e na mesma
sessão, `/crm/v3/schemas`, `/crm/v3/objects/contacts`, `/crm/v3/objects/companies`
e `/crm/v3/owners` respondem **200** normalmente. Não é rota errada, não é nome
errado, não é versão velha.

Também foi descartado que o chamado estivesse modelado como **objeto
customizado**: o catálogo da conta tem seis, e todos são comerciais.
`contratos`, `produtos`, `produtos_do_cliente`, `produtos_do_cliente_v2`,
`data_setup`, `n_meros_de_s_rie_dos_produtos`. Nenhum de suporte. O chamado é o
ticket nativo.

Repare que a mensagem **não nomeia o escopo**, diferente do 403 do item 1.2.
Pode ser escopo não marcado no app, mas pode também ser limitação do produto
contratado na conta. Quem administra o app consegue distinguir; de fora não dá.

**O que isso impede:** trazer assunto, empresa, data e solução do atendimento.
Hoje o número do chamado é alcançável (ver 1.3), mas o registro dele não.

### 1.2 Falta o escopo `site-search-read`. Bloqueia ler o portal

`GET /cms/v3/site-search/search?type=KNOWLEDGE_ARTICLE` → **403**, com o escopo
nomeado: *"requires any of [site-search-read]"*.

**O que isso impede:** a leitura do artigo **pela API da HubSpot**. Mas existe
caminho melhor, que não depende de escopo nenhum, ver a seção 6. Por isso este
escopo **saiu** da lista de pedidos.

### 1.3 O que a chave já alcança, e funciona

- `conversations.read`. Fios, mensagens e o número do atendimento associado
- `crm.objects.owners.read`. Quem atendeu
- `crm.objects.contacts.read` / `companies.read`: o cliente e a empresa dele

Foi com isso que a leitura de conversa foi provada de ponta a ponta: o
atendimento `47673917220` devolveu 1 fio com 32 mensagens reais.

---

## 2. Limitações da própria HubSpot

Não são falha de ninguém aqui, mas condicionam o que dá para prometer.

### 2.1 Não existe API de Base de Conhecimento

Artigo de KB só é criado ou alterado pela interface da HubSpot. O único caminho
de leitura é o site search do item 1.2.

**E há uma armadilha:** o escopo `cms.knowledge_base.articles.read` **está
concedido neste token e não tem API atrás dele**. A própria documentação da
HubSpot reconhece que ele aparece na tela de configuração sem endpoint
correspondente. Seis caminhos candidatos foram testados e todos deram **404**
(inexistente), não 403.

Ou seja: ver esse escopo marcado na lista **não** significa que dá para ler
artigo. Vale dizer isso a quem for mexer nos escopos, para não fechar o assunto
achando que já está liberado.

### 2.2 Armadilhas da API de conversas

Cada uma delas quebra uma integração escrita de forma óbvia. As quatro já estão
tratadas do nosso lado.

| O que acontece | Por que quebra |
| --- | --- |
| Página pode voltar **vazia com cursor presente** | Parar na página vazia grava conversa vazia. `limit=3` devolveu 0 registros e o cursor seguiu por mais 13 voltas, totalizando 38. O fim é a **ausência** de `paging.next.after`. |
| Mensagens vêm em **ordem decrescente** | Sem inverter, a análise lê a resposta antes da pergunta. |
| O campo `text` **contém HTML** | 3 de 13 mensagens traziam `<p>` dentro de `text`, que deveria ser texto puro. E é assimétrico: no que sai do suporte a tag está lá, no que entra do cliente não. |
| O endpoint mistura **quatro tipos** | `MESSAGE`, `THREAD_STATUS_CHANGE`, `ASSIGNMENT`, `WELCOME_MESSAGE`. Só o primeiro é evidência; `WELCOME_MESSAGE` é saudação automática. |

Mais duas que custaram tentativa:

- `sort=latestMessageTimestamp` **exige** `latestMessageTimestampAfter`, senão
  400. `sort=-latestMessageTimestamp` não existe.
- `/crm/v3/owners` pagina em 100. São 197 responsáveis: parar na primeira
  página produz "não existe" para quem existe.

### 2.3 Nem todo fio tem atendimento

Em amostras de 50 fios, entre **16% e 40%** traziam `associatedTicketId`,
variando por período. Fios de 2024 não traziam nenhum. Fio sem associação é
conversa que não virou atendimento. É esperado, não é erro.

---

## 3. Falha do nosso lado. Corrigida em 27/08

O modelo `Ticket` sempre teve `source.externalId`, e o banco sempre teve a
coluna. Mas **o campo só tinha um caminho de entrada**: a importação por CSV
(`ticketImport.ts`). O formulário não tinha o campo, `TicketFormData` não tinha
a propriedade, o `ticketService.create` não montava a procedência e o
preenchimento por IA não declarava o campo.

Consequência concreta: o único atendimento real do acervo se chama
`Ticket AltoQi nº47673917220 - Instalação/Aces…`: a IA leu o número no
documento e o único lugar onde ele coube foi o **título**.

Sem isso, a conversa que a API traz não tem a qual atendimento se ligar.

**Corrigido:** o número virou campo do formulário, entrou no preenchimento por
IA, e o serviço passa a gravar a procedência. Preservando a data original
quando o número não muda, e apagando a procedência quando o número é apagado.

---

## 4. O que decidir

1. **Os dois escopos do item 1**. Vale pedir, e a resposta muda o tamanho do
   que dá para entregar. Sem `tickets`, o atendimento precisa nascer do fio, e
   assunto e solução não têm origem automática.
2. **Dado pessoal de cliente.** A cadeia fio → contato → empresa funciona. Como
   está hoje, o visitante é gravado como "Cliente", sem nome nem e-mail. Trazer
   a identificação do cliente para dentro do hub é decisão de produto, não
   detalhe de implementação.

---

## 5. Inventário: o que cada escopo entrega de fato

> **Honestidade sobre o método, antes da tabela.** São **41** escopos no token.
> Testei **33 endpoints**, todos com `GET` e `limit=1`, em série. O que **não**
> foi testado está dito na íntegra ao fim desta seção. Inclusive, e
> principalmente, **nenhuma chamada de escrita**: a regra do projeto é não
> alterar nada na HubSpot, e testar escrita arriscaria criar ou modificar
> registro de vocês.

### Tabela por escopo

Cada linha traz o endereço exato usado e o que voltou. Reproduzível com
`npm run hubspot:conferir`.

| Escopo | Endpoint testado | Resultado |
| --- | --- | --- |
| `oauth` | `POST /oauth/v2/private-apps/get/access-token-info` | 200. Hub, app e a lista de escopos |
| `conversations.read` | `GET /conversations/v3/conversations/threads` | 200. Fios, mensagens, `associatedTicketId` |
| `crm.objects.owners.read` | `GET /crm/v3/owners` | 200. 197 responsáveis, com nome, e-mail e equipes |
| `crm.objects.contacts.read` | `GET /crm/v3/objects/contacts` | 200 |
| `crm.objects.companies.read` | `GET /crm/v3/objects/companies` | 200 |
| `crm.objects.deals.read` | `GET /crm/v3/objects/deals` | 200 |
| `crm.objects.quotes.read` | `GET /crm/v3/objects/quotes` | 200 |
| `crm.objects.courses.read` | `GET /crm/v3/objects/courses` | 200 |
| `crm.objects.services.read` | `GET /crm/v3/objects/services` | 200 |
| `crm.objects.users.read` | `GET /crm/v3/objects/users` | 200 |
| `crm.objects.goals.read` | `GET /crm/v3/objects/goal_targets` | 200 |
| `crm.objects.custom.read` | `GET /crm/v3/objects/2-25175098` | 200 |
| `crm.lists.read` | `GET /crm/v3/lists` | 200 |
| `crm.objects.carts.read` | `GET /crm/v3/objects/carts` | 200, **vazio na conta** |
| `crm.objects.commercepayments.read` | `GET /crm/v3/objects/commerce_payments` | 200, vazio |
| `crm.objects.appointments.read` | `GET /crm/v3/objects/appointments` | 200, vazio |
| `crm.objects.contracts.read` | `GET /crm/v3/objects/contracts` | 200, vazio |
| `crm.dealsplits.read_write` | `GET /crm/v3/objects/deal_split` | 200, vazio |
| `crm.extensions_calling_transcripts.read` | `GET /crm/v3/objects/calls` | 200, **489.059** chamadas |
| `crm.schemas.custom.read` | `GET /crm/v3/schemas` | 200. 6 objetos customizados, todos comerciais |
| `crm.schemas.contacts.read` | `GET /crm/v3/schemas/contacts` | 200 |
| `crm.schemas.companies.read` | `GET /crm/v3/schemas/companies` | 200 |
| `crm.schemas.deals.read` | `GET /crm/v3/schemas/deals` | 200 |
| `crm.schemas.line_items.read` | `GET /crm/v3/schemas/line_items` | 200 |
| `crm.schemas.appointments.read` | `GET /crm/v3/schemas/appointments` | 200 |
| `crm.schemas.services.read` | `GET /crm/v3/schemas/services` | 200 |
| `crm.schemas.listings.read` | `GET /crm/v3/schemas/listings` | 200 |
| `communication_preferences.read` | `GET /communication-preferences/v4/definitions` | 200, 15 definições |
| `conversations.custom_channels.read` | `GET /conversations/v3/custom-channels` | **401**, exige OAuth 2.0; token de app privado não serve |
| `cms.knowledge_base.articles.read` | `GET /cms/v3/knowledge-base/articles` | **404** |
| `cms.knowledge_base.settings.read` | `GET /cms/v3/knowledge-base/settings` | **404** |
| **ausente:** `tickets` | 7 endereços (ver seção 1.1) | **403** em todos |
| **ausente:** `site-search-read` | `GET /cms/v3/site-search/search` | **403**, com o escopo nomeado |

### O que NÃO foi testado, e por quê

**As oito variantes `*.sensitive.read.v2` e `*.highly_sensitive.read.v2`**
(contacts, companies, deals, custom). Elas **não são endpoints próprios**:
liberam colunas adicionais nos mesmos endereços já testados. Para saber o que
acrescentam seria preciso pedir campo por campo, e nenhum deles serve ao ciclo
de conhecimento.

**Nenhuma chamada de escrita, `POST`, `PATCH`, `PUT`, `DELETE`.** Esta é a
lacuna que mais importa para a conversa com o dev, e é deliberada: a regra do
projeto é não alterar nada na HubSpot, e sondar escrita arriscaria criar ou
modificar registro real.

**Consequência honesta:** quando este documento diz que *não existe API de Base
de Conhecimento*, isso está apoiado em (a) seis endereços de **leitura**
devolvendo 404 (inexistente, não proibido) e (b) a documentação pública da
HubSpot, que afirma não haver API para o Knowledge Base e registra o pedido
como "not currently planned". **Não está apoiado em teste de escrita.**

Se o objetivo for publicar artigo de volta no portal, esta é a pergunta exata
para o dev:

> Existe algum endpoint (público, beta ou privado) que crie ou altere artigo
> de Knowledge Base? O escopo `cms.knowledge_base.articles.read` aparece
> concedido no app `50542060` e não responde em nenhum caminho que testamos.

### Volumes medidos, para dimensionar

| Objeto | Total na conta |
| --- | --- |
| `notes` | 3.369.334 |
| `tasks` | 583.505 |
| `calls` | 489.059 |
| `meetings` | 30.534 |
| `emails` |. **403**, escopo ausente |



Varredura de 27/08, um endpoint por escopo, em série, `limit=1`. Testado, não
deduzido.

### Entrega e serve ao ciclo

| Escopo | Entrega |
| --- | --- |
| `conversations.read` | fios, mensagens e `associatedTicketId`, **provado ponta a ponta** |
| `crm.objects.owners.read` | 197 responsáveis, com nome, e-mail e equipes |
| `crm.objects.contacts.read` | contato do fio; encadeia até a empresa |
| `crm.objects.companies.read` | nome e domínio da empresa |
| `oauth` | introspecção do próprio token |

### Entrega, mas é CRM comercial

`deals`, `quotes`, `courses`, `services`, `users`, `goals`, `lists`, os seis
objetos customizados (contratos, produtos, data setup, item do plano) e os sete
`crm.schemas.*`. Todos 200. Nada disso descreve atendimento.

Vazios na conta: `carts`, `commercepayments`, `appointments`, `contracts`,
`dealsplits`.

### Engajamentos: abertos, volumosos, e sem ligação com o atendimento

| Objeto | Total na conta | Corpo legível? |
| --- | --- | --- |
| `notes` | 3.369.334 | sim (`hs_note_body`) |
| `calls` | 489.059 | sim (`hs_call_title`, `hs_call_body`) |
| `tasks` | 583.505 | sim |
| `meetings` | 30.534 | sim |
| `emails` | (| **403, escopo não concedido** |

Foi investigado se dariam um caminho alternativo ao atendimento, já que
`/crm/v4/objects/notes/{id}/associations/tickets` responde **200 e não 403**)
a travessia até o ticket está aberta mesmo com o objeto ticket fechado.

**Mas nenhuma amostra encontrou ligação:** busca de notas e de chamadas
filtrando por `associations.ticket` do atendimento real `47673917220` devolveu
**total 0** nas duas; e as 5 notas mais recentes da conta (todas do dia)
devolveram **0 atendimentos associados** cada. O erro do lote é
`NO_ASSOCIATIONS_FOUND`, não permissão.

Não é prova sobre 3,3 milhões de registros. `HAS_PROPERTY` não é aceito nesse
campo, então não deu para contar o acervo inteiro. Mas toda evidência colhida
aponta para o mesmo lado: os engajamentos existem para o uso comercial do CRM,
não para o atendimento.

### Concedidos e inutilizáveis

Três escopos estão na lista e não entregam nada:

| Escopo | O que acontece |
| --- | --- |
| `cms.knowledge_base.articles.read` | 404, não existe API (ver 2.1) |
| `cms.knowledge_base.settings.read` | 404, idem |
| `conversations.custom_channels.read` | **401**: o endpoint exige OAuth 2.0; token de app privado não serve |

Vale registrar junto com o pedido de escopos: ver um escopo marcado na lista
**não** significa que ele entrega alguma coisa.

### O que vale pedir

**Um escopo: `tickets`.**

Era para serem três. Os outros dois caíram:

- `site-search-read`, desnecessário: o portal público entrega mais do que ele
  daria (seção 6).
- `emails`, só faria sentido junto do `tickets`, e pedir uma coisa tem mais
  chance de resposta que pedir três. Fica para depois, se o atendimento entrar.

**A pergunta concreta para quem administra o app `50542060`:** na aba de
escopos, `tickets` **aparece como opção para marcar**? Se aparece, era só
configuração. Se não aparece, é limitação do produto contratado, e aí o
atendimento não entra por API de jeito nenhum.

---

## 6. O artigo não precisa da HubSpot, e isso já está funcionando

> **Resultado, 27/08:** o portal foi importado inteiro. 1.825 páginas
> visitadas, 1.822 artigos, 133 sem seção, 3 páginas sem conteúdo. A varredura
> é incremental pelo `lastmod`, então a próxima só busca o que mudou. Nenhuma
> chamada à API da HubSpot foi feita nesse caminho, e nada foi escrito no
> portal.

Descoberto em 27/08, depois que a API se mostrou fechada dos dois lados.

O `suporte.altoqi.com.br` é público, e entrega mais do que a API entregaria:

| O que | De onde | Verificado |
| --- | --- | --- |
| A lista de artigos | `sitemap.xml` | **1.694** URLs de artigo, de 1.834 no total |
| Quando cada um mudou | `<lastmod>` no sitemap | presente. Permite reimportar só o alterado |
| Identidade | o número na URL `/articles/<n>` | vira `portalArticleId` |
| Título e resumo | `<title>`, `og:title`, `meta description` | extraídos |
| **Corpo** | dentro de `<article>`, no HTML servido | 8.620 caracteres de texto, sem depender de JS |
| Categoria e seção | trilha de navegação | `AltoQi Builder > Geral`: o nosso vocabulário |

Os 1.694 batem com os ~1.800 artigos que o produto sempre citou; os outros 140
são páginas de categoria e seção.

**Isso é melhor que o `site-search-read`**, que devolveria o índice sem o corpo.

Ressalvas, para não prometer demais:

- **Uma página foi testada.** Antes de construir, conferir numa dezena: se a
  trilha ou o `<article>` variarem por categoria, o extrator precisa saber
  disso antes.
- **É leitura de site, não API**, quebra se o portal mudar de template. A
  defesa é a regra que a importação já usa: calcular o plano antes de gravar e
  mostrar o número. Se nenhuma página der corpo, a tela diz isso em vez de
  importar 1.694 artigos vazios.
- **São 1.694 requisições ao servidor da AltoQi**, em série e com pausa. O
  `lastmod` faz a segunda varredura custar quase nada.
- **Nota de correção:** as URLs são `/hc/pt-br/articles/`, padrão do Zendesk.
  Isso é herança de migração, não indício de plataforma: a página traz
  marcador de HubSpot e os endpoints de Zendesk dão 404. O portal é HubSpot,
  como o `CLAUDE.md` diz.
