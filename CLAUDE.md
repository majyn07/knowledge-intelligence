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

As nove features: `activities`, `analysis`, `dashboard`, `library`, `metrics`,
`people`, `plans`, `projects`, `search`.

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

Acervos não têm teto artificial. Cortar análises ou artigos antigos para caber
seria apagar trabalho do usuário em silêncio: preferimos falhar avisando. A
exceção é o histórico de atividades, que tem limite por ser append-only.

### Providers

Ordem em `app/layout.tsx`, de fora para dentro:

```
BrandTheme → People → Activity → Project
           → Tickets → KnowledgeLifecycle → Plans → Library
```

`Activity` fica acima dos domínios porque todos registram eventos nele e ele não
depende de ninguém. `Tickets` fica acima de `KnowledgeLifecycle` porque a análise
parte do atendimento.

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

**Máquinas de estado têm caminho de volta.** Artigo e plano podem retroceder:
revisão reprovada volta para rascunho, publicado pode ser recolhido. Um fluxo que
só avança esconde o erro em vez de corrigi-lo.

**Publicar exige intenção, não permissão.** Artigo e plano passam por
`PublishConfirmDialog`, que mostra o que continua incompleto — medido nos
próprios campos — e o efeito da publicação. Nada bloqueia: a equipe é treinada e
decide. Fricção que informa, não que atrapalha.

**Não há autenticação, e nada finge que há.** O seletor "atuando como" no
cabeçalho registra quem está operando, para o histórico ter autoria em vez de
autor vazio. Não construa permissões sobre isso — seriam ficção enquanto
qualquer um puder escolher qualquer pessoa. O `actor` do evento é quem executou
a ação, caindo para a autoria do registro quando ninguém se identificou.

**Referências a HubSpot, Zendesk, Vercel e CRMs são pedidos de maturidade**
funcional e de UX, nunca de integração ou de importar o domínio deles. Traduza o
princípio para o nosso ciclo.

**Integração real exige autorização explícita.** Ligar rede ou credencial exige
pedir antes. O acesso à HubSpot será mediado pela Claude, não por adapter REST
direto — a fronteira será desenhada na sprint de Atendimentos remotos, contra a
forma que a Claude realmente devolver.

## IA

Gemini é o provider atual (`services/ai/server/geminiService.ts`), isolado atrás
de `analysisAIService`. GPT saiu do roadmap; Claude entra numa sprint própria.

O acervo vive no navegador, então a **busca de artigos roda no cliente** e o
contexto chega ao servidor com a evidência já resolvida — atendimento, conversa e
artigos relacionados. O servidor valida com schema estrito
(`analysisRequestSchema`) e monta o prompt. A resposta estruturada também é
validada (`analysisResponseSchema`); id e status de oportunidade são atribuídos
internamente, **nunca pelo modelo** — quem decide é a revisão humana.

## Histórico

Todo fato relevante do ciclo vira um `ActivityEvent`, gravado pelo provider da
própria feature. Eventos são **acrescentados, nunca editados**: registram o que
aconteceu, não o estado atual. O evento guarda o rótulo do assunto, então o
registro sobrevive à exclusão do registro original.

Os indicadores temporais leem esse log. Só reporte o que o evento expressa sem
ambiguidade — o destino de uma transição vive no texto e inferi-lo é adivinhação.

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

Um hook `PostToolUse` em `.claude/settings.json` roda `typecheck` e `test` em
segundo plano após edições em `.ts`/`.tsx`, avisando só quando algo quebra.

Testes cobrem lógica pura — motor de busca, busca transversal, transições de
artigo e de plano, métricas por projeto e por período, parsing da resposta da IA
e normalização de atendimento. Ao mexer em qualquer uma delas, o teste vem junto.
