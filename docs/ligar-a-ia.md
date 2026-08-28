# Ligar um provedor de IA

O que fazer no dia em que a chave chegar. Nada aqui exige escrever código novo
além de um arquivo, e a razão é a sprint 12: a fronteira de provider existe, e
somar um modelo é implementar um contrato de três métodos e declarar o que ele
lê.

## O que já está pronto

| Peça | Onde |
| --- | --- |
| Contrato do provedor | `services/ai/providers/AIProvider.ts` |
| Catálogo e escolha | `services/ai/providers/catalog.ts` |
| Registro de implementações | `services/ai/server/providerRegistry.ts` |
| Classificação de falhas | `services/ai/providers/providerFailure.ts` |
| Resposta das rotas | `services/ai/analysis/aiErrorResponse.ts` |
| Tela de estado | `/integrations`. Lê do mesmo catálogo |

O Gemini já passa por tudo isso e funciona hoje. O caminho abaixo é o mesmo
para qualquer provedor.

## Se a chave é de um provedor que já está implementado

Só isto:

1. Vercel → **Settings → Environment Variables** → criar a variável da chave
   (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`).
2. Redeploy.
3. Conferir em `/integrations`: o provedor aparece como **Em uso** ou
   **Configurada**.

Com **um** provedor configurado ele é escolhido sozinho. Com **dois**, declare
qual vale em `AI_PROVIDER` (`gemini`, ou o que for escrito). Sem essa declaração o
produto usa a ordem escrita no catálogo e **diz na tela** que foi ela que
escolheu, o que é aviso, não conforto.

Declarar um provedor sem a chave dele **não cai em outro**: quem declarou quis
aquele, e substituir por conta própria faria um erro de digitação virar uma
análise feita por outro modelo sem ninguém saber. A tela nomeia o problema.

## Se o provedor ainda não está implementado

Três passos, e o terceiro é o único que exige atenção.

**1. Escrever o arquivo.** `services/ai/server/novoService.ts`, no molde do
`geminiService`. O que ele precisa fazer:

```ts
export const novoService: AIProvider = {
  id: "novo",
  complete,                       // fala com a API, e é só isto
  chat: (r) => complete(buildAnalysisPrompt(r)),
  analyze: (r) => complete(buildStructuredAnalysisPrompt(r), { json: true }),
};
```

Dentro de `complete`, quatro coisas não são opcionais:

- **Prazo.** `AbortSignal.timeout(AI_TIMEOUT_MS)`. Sem ele um pedido pendurado
  prende a rota até o teto da plataforma, e quem pediu fica olhando um botão
  girar.
- **Chave ausente vira `AIConfigurationError("novo")`**, e não uma exceção
  crua do SDK.
- **Qualquer outra falha vira `AIProviderError("novo",
  classifyProviderFailure(error))`.** É o que separa "chave recusada" de "cota
  estourada" de "modelo sobrecarregado": as três davam a mesma frase antes, e
  "tente novamente" com a chave errada é convite a tentar para sempre.
- **`options.files`, se você declarar que lê arquivo.** O anexo chega em base64
  com o tipo declarado (o formato que a maioria dos provedores aceita), e
  converter para o que o SDK espera é trabalho deste arquivo. **Ignorar a opção
  não é opção**: o modelo responderia sobre nada, sem erro, e quem anexou
  concluiria que o documento não tinha a informação.

**2. Citar no registro, e declarar o que ele lê.** Uma linha em
`providerRegistry.ts`:

```ts
const REGISTRY = { gemini: geminiService, novo: novoService };
```

E `readsFiles` no catálogo, em `providers/catalog.ts`. É o que faz a tela
esconder o botão de anexar em vez de oferecer um caminho que termina em erro.
Mesma regra do botão de entrar com a conta Google. Um teste cobra a declaração
de todo provedor do catálogo, justamente para que somar um obrigue a decidir.

**Provedor novo além destes dois** (GPT, por exemplo) entra somando o `id` em
`AIProviderId`, a entrada em `AI_PROVIDERS` com a variável de ambiente da chave,
e o arquivo do serviço. Nada acima de `services/ai/server` muda: nem rota, nem
tela, nem prompt.

**3. Conferir contra a resposta real, e não contra a documentação.** É a única
parte que não dá para adiantar. O mínimo:

- uma análise de verdade, ponta a ponta, comparando o JSON devolvido com o
  `analysisResponseSchema`;
- uma chave inválida de propósito, para ver se a mensagem que chega na tela
  fala de configuração e não manda tentar de novo;
- um pedido grande, para saber se o prazo de 90 segundos serve.

## O que muda no produto quando a IA fica melhor

Nada de estrutura, e isso é de propósito. A troca de modelo não toca prompt,
schema, tela nem rota. O que muda é a qualidade das propostas em dois lugares:

- **Sugestão de seção** (`/library` → "Sugerir seção"), que classifica o que a
  importação deixou sem seção.
- **Levantamento** (`/survey`), onde o achado semântico ainda não existe: "cinco
  atendimentos perguntam a mesma coisa e nenhum artigo responde". Hoje a tela
  só mostra o que é **calculado**, e diz isso no cabeçalho. O achado de IA
  entra marcado como `proposto`, ao lado dos calculados, e nunca no lugar
  deles.

## O que não muda nunca

A decisão continua humana. A IA propõe, a revisão aprova, e nada rotulado como
saída de modelo entra no acervo sem alguém dizer sim. Identificador devolvido
pelo modelo é **conferido contra o cadastro** antes de virar classificação.
Instrução no prompt não é garantia, e seção inventada vira ausência, não
palpite gravado.
