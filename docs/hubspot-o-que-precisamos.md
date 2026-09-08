# HubSpot: o que precisamos da API

Uma página, para encaminhar a quem administra o app privado `50542060`
(hub `44552714`).

---

## 1. O pedido

Conceder ao app privado **um escopo de leitura**:

```
crm.objects.tickets.read
```

Opcional, se for simples conceder junto: `crm.schemas.tickets.read`.

Só leitura. O produto não escreve nada na HubSpot.

---

## 2. Todas as chamadas que o produto faz

Estas são as chamadas reais, tiradas do código. Não há outras.

### Funcionam hoje

| Chamada | O que faz | Quando roda |
| --- | --- | --- |
| `GET /conversations/v3/conversations/threads` | Lista as conversas da caixa Help Desk | 1x a cada 100 conversas |
| `GET /conversations/v3/conversations/threads/{id}/messages` | As mensagens da conversa | 1x por conversa |
| `POST /conversations/v3/conversations/actors/batch/read` | Nome de quem falou (cliente e atendente) | 1x por conversa |
| `GET /crm/v4/objects/conversation/{id}/associations/ticket` | O número do chamado | 1x por conversa |
| `GET /crm/v4/objects/conversation/{id}/associations/contact` | Qual contato abriu | 1x por conversa |
| `GET /crm/v3/objects/contacts/{id}` | Nome e empresa do cliente | 1x por conversa com contato |
| `GET /crm/v3/owners` | Quem atendeu | 1x por varredura |

O `POST` da lista é uma leitura em lote (`batch/read`). Não grava nada.

### Bloqueadas — 403

| Chamada | O que traria | Status |
| --- | --- | --- |
| `GET /crm/v3/objects/tickets` | A classificação que o suporte faz no chamado | **403** |
| `GET /crm/v3/properties/tickets` | O vocabulário dos campos | **403** |

---

## 3. O que está bloqueado, em concreto

O suporte classifica cada chamado na HubSpot. Sete campos:

| Campo | Pipeline |
| --- | --- |
| `[Support] Categoria \| Motivo principal do contato` | Suporte |
| `[Setup] Sintoma \| Motivo detalhado do contato` | Setup |
| `[Setup] Causa \| Qual a causa raiz que gerou o problema?` | Setup |
| `[Setup] Tipo de Problema` | Setup |
| `Fechamento \| Qual o motivo do encerramento do ticket?` | Setup |
| `Quem abriu?` | Setup |
| `Proteção tecnológica` | Setup |

Os sete já existem no produto: coluna no banco, importação e tela prontas.
Estão vazios nos 1.025 atendimentos porque não há de onde ler.

**Consequência:** o produto não consegue responder "qual o motivo mais comum de
contato" nem "qual a causa raiz mais frequente" com a classificação de quem
atendeu.

---

## 4. Por que não há outro caminho

**Não é rota errada.** O objeto ticket foi procurado por sete endereços
diferentes (v3, versionado, singular, por `objectTypeId`, registro individual,
busca, batch). Todos devolvem 403. No mesmo token e na mesma sessão,
`contacts`, `companies`, `owners` e `schemas` respondem 200.

**Não é objeto customizado.** A conta tem seis objetos customizados e todos são
comerciais (contratos, produtos, data setup). O chamado é o ticket nativo.

**Exportar o relatório em CSV resolveria**, e o produto tem essa porta pronta,
casando pelo `Ticket ID`. A exportação não está disponível para a equipe.

---

## 5. Como estamos hoje sem isso

O bot do atendimento pergunta ao cliente antes de abrir o chamado, e a resposta
é mensagem da conversa — que o escopo atual alcança. Medido em 974 conversas:

| Pergunta do bot | Respostas |
| --- | --- |
| "melhor descreve o motivo do seu contato" | 409 |
| "melhor representa o tipo da sua solicitação" | 314 |

É a escolha do cliente, não a classificação de quem atendeu. A tela deixa isso
explícito.

**Causa raiz não tem substituto.** É o diagnóstico do atendente, preenchido no
formulário do ticket. Não passa pela conversa.

---

## 6. A pergunta objetiva para quem administra

Na aba de escopos do app `50542060`, `crm.objects.tickets.read` **aparece como
opção para marcar**?

- **Se aparece:** era só configuração. Marcar resolve.
- **Se não aparece:** é limitação do plano contratado. Nesse caso o atendimento
  não entra por API, e a alternativa é liberar a exportação em CSV do relatório
  de tickets para a equipe.

---

## 7. Duas coisas que não são pedido

**Imagem do atendimento: não precisa de escopo.** O anexo já vem na resposta que
`conversations.read` devolve, com URL de CDN que responde 200 sem autenticação.
Já está implementado.

**Artigos do portal: não precisam da API.** O `suporte.altoqi.com.br` é público.
Os 1.822 artigos já foram importados por ali. Não existe API de Knowledge Base
na HubSpot — seis endereços testados devolvem 404, e a documentação deles
confirma que não há.

Isso vale também para o caminho inverso: **não há API para publicar artigo de
volta no portal.** Se isso entrar no escopo, é pergunta para a HubSpot, não
configuração do app.
