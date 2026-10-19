# Estado do produto

Levantado em 02/09/2026 e atualizado em 21/09/2026, contra o banco e a
aplicação em produção. Números medidos, não estimados.

**No ar:** <https://knowledge-intelligence.vercel.app>
**Acesso:** e-mail `@altoqi.com.br`, entrada por link. Sem senha.

---

## 1. O que tem dentro hoje

| | |
| --- | --- |
| Artigos do portal | **1.824** (1.823 publicados, 4 sem seção) |
| Atendimentos | **1.025** (974 com conversa completa) |
| Atendimentos com classificação do suporte | **0 no produto**; até 627 disponíveis na HubSpot desde 19/10 — ver 3.2 |
| Análises feitas | 13 |
| Planos de melhoria | 3 |
| Pessoas com acesso | 5 |

---

## 2. O que funciona

Tudo abaixo foi verificado contra os dados reais, não em ambiente de teste.

### Acervo

- **Importação do portal.** Os 1.824 artigos vieram do `suporte.altoqi.com.br`.
  Reimportar só busca o que mudou.
- **Busca.** Alcança o corpo do artigo, não só o título. Mostra o trecho onde
  casou.
- **Edição.** O artigo é editável dentro do KI, preservando o HTML original.
- **Comparação.** Dois artigos lado a lado, e a IA diz se cobrem a mesma dúvida.
- **Avaliar antes de escrever.** A IA varre o acervo e diz se o assunto já está
  coberto. Quando não está, escreve o rascunho. Quando está em parte, devolve
  **o artigo existente já atualizado**, com a lista do que mudou.
- **O que o suporte cita.** Desde 19/10, cada artigo mostra em quantos
  atendimentos o suporte respondeu com ele, contado nos links das respostas e
  sem o rodapé do e-mail: 256 artigos citados em 383 atendimentos.
- **Assistente em toda tela.** Responde do que a tela mediu e do que a busca
  acha no acervo sobre a pergunta — "isto já existe?" tem resposta.

### Atendimentos

- **Entrada pela HubSpot.** 1.025 atendimentos e 974 conversas vieram da API.
  Dois modos: por período, ou **pelo número do chamado** — traz só aqueles, sem
  varrer. Funciona em produção desde 17/09/2026.
- **Marcar vários e avaliar.** Marca cinco atendimentos na lista, e a IA diz,
  para cada um, se já existe artigo, se existe em parte ou se falta — com o
  botão de criar ou de atualizar em cada linha.
- **Busca e recortes** por cliente, empresa e produto.
- **Fila de triagem.** Agrupa os resolvidos por assunto e ordena por volume
  contra cobertura do acervo.
- **Análise por IA.** Verificado: responde em ~31 segundos, propõe oportunidades,
  a revisão humana decide.
- **Anexos.** O print do cliente é copiado uma vez e servido daqui.

### Governança

- Histórico de tudo, com auditoria por pessoa e por período.
- Painéis, indicadores, exportação.
- Lixeira com desfazer.

---

## 3. O que não funciona, e por quê

### 3.1 Publicar artigo de volta no portal

**Não existe API de Base de Conhecimento na HubSpot.** Não é permissão, não é
escopo, não é configuração. A plataforma não oferece.

Verificado: seis endereços de leitura devolvem **404** (inexistente, não
proibido), e a documentação pública da HubSpot confirma que não há API e registra
o pedido como "not currently planned".

O escopo `cms.knowledge_base.articles.read` **está concedido no nosso app e não
tem endpoint atrás dele**. Ver o escopo marcado não significa que existe API.

**Como estamos fazendo:**

| Etapa | Como funciona |
| --- | --- |
| Trazer os artigos | Pelo site público. O `sitemap.xml` lista todos, e a página traz título, resumo, corpo e a seção |
| Editar | Dentro do KI, com editor próprio que preserva o HTML do portal |
| Publicar no portal | **À mão.** Alguém abre o editor da HubSpot e cola. Desde 19/10 o produto aponta o que falta colar (Levantamento e filtro "portal" da Biblioteca), entrega o HTML pronto e liga o artigo nascido aqui à página criada lá |

O KI prepara o artigo pronto. A última etapa é manual, e vai continuar sendo
até a HubSpot oferecer a API.

### 3.2 Classificação do atendimento — **destravada em 19/10/2026**

O escopo de leitura de tickets foi concedido. Medido só lendo, sem alterar nada
na HubSpot: dos nossos 1.020 atendimentos com número, a HubSpot devolve

| Campo | Preenchidos |
| --- | --- |
| Quem abriu? | 627 |
| Fechamento: motivo do encerramento | 610 |
| [Support] Especialidade técnica | 464 |
| [Support] Produto | 463 |
| [Support] Categoria: motivo principal | 461 |
| [Support] Sintoma: motivo detalhado | 379 |
| [Setup] Sintoma e Tipo de Problema | 214 |
| Proteção tecnológica | 215 |
| [Support] Causa raiz | 196 |
| [Setup] Causa raiz | 126 |

**Ainda vazio no produto**: falta trazer. Os sete campos que o produto tem
precisam ser revistos contra estes catorze, porque a HubSpot ganhou campos
("[Support] Causa", "Especialidade técnica", "Produto") desde agosto.

Também liberado: as **pesquisas de satisfação** (42.091, associáveis ao
ticket). Continuam fechados: site search (403), webhooks do app (403) e a API
de Base de Conhecimento (404, não existe).

O que o bot pergunta ao cliente continua valendo ao lado: é a escolha dele, e
não a classificação de quem atendeu.

---

## 4. O pedido

Atendido. O escopo de tickets foi concedido em 19/10/2026.

---

## 5. O que falta do nosso lado

| O quê | Situação |
| --- | --- |
| Quatro funções de IA sem verificação contra o modelo | Fila→artigo, varredura de sobreposição, atualizar artigo com material, avaliar atendimentos marcados. Código e contrato testados; resposta do modelo depende de teste com caso real |
| Varredura das 137 sobreposições | Nunca terminou até o fim. Desde 19/10 o veredito fica guardado e a varredura retoma de onde parou, então ela já pode ser feita em várias sessões. Falta rodar |
| 4 artigos sem seção | O modelo se recusou a classificar, e a recusa está correta (política institucional, artigo que atravessa produtos). Podem ficar assim |
| Entrar com conta Google | Depende da TI criar a credencial. Não bloqueia: o link por e-mail funciona |

---

## 6. Uma correção que vale registrar

Este documento já afirmou que a leitura de artigo dependia do escopo
`site-search-read`. **Não depende.** O portal público entrega mais do que aquele
escopo daria — inclusive a seção onde cada artigo mora, que a API não traria. O
pedido caiu.

Do mesmo modo, a imagem do atendimento já chega sem escopo nenhum: o anexo vem
na resposta de `conversations.read`, com URL de CDN que abre sem autenticação.
