# Estado do produto

Levantado em 02/09/2026, contra o banco e a aplicação em produção.
Números medidos, não estimados.

**No ar:** <https://knowledge-intelligence.vercel.app>
**Acesso:** e-mail `@altoqi.com.br`, entrada por link. Sem senha.

---

## 1. O que tem dentro hoje

| | |
| --- | --- |
| Artigos do portal | **1.824** (1.823 publicados, 4 sem seção) |
| Atendimentos | **1.025** (974 com conversa completa) |
| Atendimentos com classificação do suporte | **0** — ver seção 4 |
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
  coberto. Quando não está, escreve o rascunho.

### Atendimentos

- **Entrada pela HubSpot.** 1.025 atendimentos e 974 conversas vieram da API.
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
| Publicar no portal | **À mão.** Alguém abre o editor da HubSpot e cola |

O KI prepara o artigo pronto. A última etapa é manual, e vai continuar sendo
até a HubSpot oferecer a API.

### 3.2 Classificação do atendimento

Os 1.025 atendimentos estão com os sete campos de classificação **vazios**.

O suporte classifica cada chamado na HubSpot (categoria, sintoma, causa raiz,
tipo de problema, motivo do fechamento). O produto tem coluna no banco,
importação e tela prontas para receber. Falta o dado.

**Motivo:** o escopo `crm.objects.tickets.read` não está concedido. Todas as
tentativas de ler o objeto ticket devolvem 403 — sete endereços diferentes,
enquanto contatos, empresas e responsáveis respondem 200 no mesmo token.

**Alternativa que também está fechada:** exportar o relatório em CSV e importar
por arquivo. O produto tem essa porta pronta. A exportação não está disponível
para a equipe.

**O que temos no lugar:** o bot pergunta ao cliente antes de abrir o chamado, e
a resposta é mensagem da conversa. Medido em 974 conversas: 409 trazem a área do
contato e 314 o tipo da solicitação. É a escolha do cliente, não a classificação
de quem atendeu — e a tela diz isso.

---

## 4. O pedido, em uma linha

Conceder ao app privado o escopo **`crm.objects.tickets.read`** (só leitura).

**A pergunta objetiva:** na aba de escopos do app `50542060`, ele aparece como
opção para marcar?

- Aparece → era configuração.
- Não aparece → é limitação do plano contratado. Nesse caso, a alternativa é
  liberar a exportação em CSV do relatório de tickets.

Detalhamento em [hubspot-o-que-precisamos.md](hubspot-o-que-precisamos.md).

---

## 5. O que falta do nosso lado

| O quê | Situação |
| --- | --- |
| Duas funções de IA nunca rodaram contra o modelo | Fila→artigo e varredura de sobreposição. Construídas quando a cota do provedor acabou. Código testado, resposta do modelo não verificada |
| Varredura das 137 sobreposições | Nunca terminou, mesmo motivo |
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
