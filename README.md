# Visus Knowledge Intelligence

Plataforma interna da AltoQi para transformar atendimentos de suporte em
conhecimento publicado, com decisão humana no centro do ciclo.

```
Projeto → Atendimento → Análise por IA → Revisão humana
       → Oportunidade → Plano de Melhoria → Conhecimento → Governança
```

**No ar:** <https://knowledge-intelligence.vercel.app>, com entrada por e-mail
`@altoqi.com.br`. O que tem dentro hoje, o que funciona e o que está bloqueado
está em [`docs/estado-do-produto.md`](docs/estado-do-produto.md).

## Os dois modos

O produto roda de dois jeitos, e a diferença é **declarada**, não deduzida da
presença de credencial.

| | Modo navegador | Modo compartilhado |
| --- | --- | --- |
| Liga com | nada (é o padrão) | `NEXT_PUBLIC_SHARED_WORKSPACE=on` e o Supabase configurado |
| Dados | `localStorage` e IndexedDB, de quem abriu | Postgres da Supabase, da equipe inteira |
| Entrada | não há | link por e-mail `@altoqi.com.br` |
| Uso | desenvolver e conferir sem banco | produção |

## Rodando

```bash
npm install
npm run dev
```

A aplicação sobe em <http://localhost:3000> com o que estiver no `.env.local`.

```bash
npm run dev:local
```

Sobe em <http://localhost:3100> no modo navegador, **sem tocar no
`.env.local`**. É o jeito de conferir o produto sem banco: editar o arquivo e
esquecer de desfazer deixaria a máquina apontando para lugar nenhum.

### Variáveis

O `.env.local` vem da Vercel (`vercel env pull`). **Antes de `vercel link` ou
`env pull`, copie o arquivo**: os dois o reescrevem com o que está na Vercel, e
o que só existia localmente se perde.

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_SHARED_WORKSPACE` | `on` liga o modo compartilhado |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | o banco e a entrada |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN` | `on` mostra o botão do Google; só ligue com o provedor ativo na Supabase |
| `GEMINI_API_KEY` | a IA. Sem ela tudo funciona, e as telas de IA dizem que não há provedor |
| `AI_PROVIDER` | qual provedor vale, quando houver mais de um ([`docs/ligar-a-ia.md`](docs/ligar-a-ia.md)) |
| `HUBSPOT_ACCESS_TOKEN` | leitura de conversas na HubSpot, só no servidor |
| `POSTGRES_URL_NON_POOLING` | usada só pelos scripts de banco, nunca pelo navegador |

Nenhuma chave privilegiada (service role, secret, JWT) faz parte do ambiente,
e não deve voltar: nenhuma operação do produto precisa ignorar as políticas de
acesso.

## Banco

```bash
npm run db:migrate   # aplica o que falta de supabase/migrations
npm run db:status    # conta o que existe, sem alterar nada
```

O banco é compartilhado por toda a equipe. Limpeza é por script
(`npm run db:limpar-demo -- --confirmar`), nunca à mão. Configuração de acesso
vive em `supabase/config.toml`; **leia o aviso no topo do arquivo antes de um
`supabase config push`**, que devolve ao padrão o que não está declarado ali.
Detalhes em [`docs/acesso-da-equipe.md`](docs/acesso-da-equipe.md).

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

As quatro rodam em todo PR (`.github/workflows/ci.yml`), no modo navegador e
sem segredo nenhum. `npm test` não faz typecheck: erro de tipo em arquivo de
teste só aparece no `typecheck`.

Um hook do Claude Code roda `typecheck` e `test` em segundo plano após edições
em `.ts`/`.tsx` (`.claude/settings.json`).

## Onde olhar primeiro

- [`CLAUDE.md`](CLAUDE.md): arquitetura, convenções e as regras de produto, com
  o porquê de cada uma
- [`docs/o-que-cada-tela-faz.md`](docs/o-que-cada-tela-faz.md): cada tela e a
  pergunta que ela responde
- [`docs/estado-do-produto.md`](docs/estado-do-produto.md): números medidos e o
  que está bloqueado
- [`docs/roteiro-de-mvps.md`](docs/roteiro-de-mvps.md): o que vem a seguir
- [`docs/adr/ADR-001.md`](docs/adr/ADR-001.md): a organização por feature
