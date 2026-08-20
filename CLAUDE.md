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

### Cadeia de dados

```
UI → hook → service → repository → localStorage
```

Persistência sempre atrás de um provider ou repository. **Nunca** leia ou
escreva `localStorage` direto num componente, e nunca mute um array de mock
importado — o mock é semente, não banco.

### Providers

Ordem em `app/layout.tsx`, de fora para dentro:

```
BrandTheme → People → Activity → Project → KnowledgeLifecycle → Plans → Library
```

`Activity` fica acima dos domínios porque todos registram eventos nele e ele não
depende de ninguém.

Estado de uma entidade que várias telas consomem é **provider**, não hook solto.
Já pagamos essa dívida uma vez com a Biblioteca.

### Estado persistido e hidratação

Use `usePersistedState` de `src/hooks`. As páginas são pré-renderizadas: se o
estado inicial vier do `localStorage`, servidor e cliente divergem e a
hidratação quebra.

A regra: **servidor e primeiro render do cliente produzem o mesmo HTML**, a
partir da semente canônica. O valor guardado entra num efeito após a montagem.
Vale para qualquer coisa que só o navegador conhece — `localStorage`,
`window.innerWidth`, `matchMedia`. Nunca resolva com `suppressHydrationWarning`
nem `dynamic({ ssr: false })`.

## Regras de produto

**Nada inventado.** Se um número não pode ser derivado dos dados reais, ele não
aparece. Não rotule métrica calculada como saída de IA. Estado vazio honesto é
sempre melhor que preenchimento.

**A Biblioteca é a Base de Conhecimento.** Existe um único acervo,
`KnowledgeArticle`. Só artigo **publicado** conta como cobertura documental — a
análise não enxerga rascunho nem revisão.

**Referências a HubSpot, Zendesk, Vercel e CRMs são pedidos de maturidade**
funcional e de UX, nunca de integração ou de importar o domínio deles. Traduza o
princípio para o nosso ciclo.

**Integração real exige autorização explícita.** Contratos, mappers e fronteiras
inertes podem ser preparados; ligar rede ou credencial, não.

## IA

Gemini é o provider atual (`services/ai/server/geminiService.ts`), isolado atrás
de `analysisAIService`. GPT saiu do roadmap; Claude entra numa sprint própria.

O acervo vive no navegador, então a **busca de artigos roda no cliente** e o
contexto chega ao servidor com a evidência já resolvida. O servidor valida com
schema estrito (`analysisRequestSchema`) e monta o prompt. A resposta estruturada
também é validada (`analysisResponseSchema`); id e status de oportunidade são
atribuídos internamente, nunca pelo modelo.

## Convenções

- Serviços em camelCase: `articleService`, `projectService`, `planService`
- Diretórios `repositories/` no plural, `mock/` no singular
- Tipos compartilhados em `src/models`; locais em `features/*/types`
- Texto de interface em pt-BR; erros tipados, não strings soltas
- `import "server-only"` em tudo que toca chave de API
- Comentário explica **por que**, não o que o código já diz
- JSX legível: nada de componente inteiro numa única linha

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Testes cobrem lógica pura — motor de busca, transições, métricas, parsing. Ao
mexer em qualquer uma delas, o teste vem junto.
