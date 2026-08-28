# Visus Knowledge Intelligence

Plataforma interna da AltoQi para transformar atendimentos de suporte em
conhecimento publicado, com decisão humana no centro do ciclo.

```
Projeto → Atendimento → Análise por IA → Revisão humana
       → Oportunidade → Plano de Melhoria → Conhecimento → Governança
```

## Rodando

```bash
npm install
npm run dev
```

A aplicação sobe em http://localhost:3000.

A análise usa o Gemini e precisa de `GEMINI_API_KEY` num arquivo `.env.local`
na raiz. Sem a chave, todas as demais telas funcionam; só a análise responde
que o serviço de IA não está configurado.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Um hook do Claude Code roda `typecheck` e `test` automaticamente após edições
em arquivos `.ts`/`.tsx`, veja `.claude/settings.json`.

## Estado dos dados

Os dados vivem no `localStorage` do navegador, semeados por mocks. Não há
backend nem autenticação. A arquitetura mantém a fronteira
`UI → hook → service → repository` justamente para que a troca por fontes reais
não alcance a interface.

## Onde olhar primeiro

- `CLAUDE.md`. Arquitetura, convenções e regras de produto
- `docs/product/VISION.md`: o que o produto se propõe a fazer
- `docs/adr/ADR-001.md`: a decisão de organizar por feature
