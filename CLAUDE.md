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

As dez features: `activities`, `analysis`, `dashboard`, `library`, `metrics`,
`people`, `plans`, `projects`, `search`, `taxonomy`.

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

**Todo dado lido do armazenamento passa por um normalizador.** Um registro foi
gravado por alguma versão do produto, possivelmente anterior à atual, e não
conhece campos que vieram depois. O normalizador recebe `unknown` e garante a
forma completa do modelo, usando os utilitários de `lib/shape`. Sem isso, a
primeira leitura de um campo ausente derruba a tela — foi o que aconteceu com
`author` na Biblioteca. Campo novo no modelo é campo novo no normalizador.

Acervos não têm teto artificial. Cortar análises ou artigos antigos para caber
seria apagar trabalho do usuário em silêncio: preferimos falhar avisando. A
exceção é o histórico de atividades, que tem limite por ser append-only.

### Providers

Ordem em `app/layout.tsx`, de fora para dentro:

```
BrandTheme → Taxonomy → People → Activity → Project
           → Tickets → KnowledgeLifecycle → Plans → Library
```

`Taxonomy` fica logo abaixo do tema porque não depende de ninguém e quase todo
mundo depende dela: a Biblioteca precisa do vocabulário para migrar o que leu
do armazenamento, e os filtros de artigo e de projeto leem as opções dali.

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

## Taxonomia

O `suporte.altoqi.com.br` **é** a base de conhecimento publicada, em HubSpot
Knowledge Base. A Biblioteca é o espelho local dele, não um acervo paralelo, e
a estrutura é a dele: **categoria → seção → artigo**. O portal não tem campo
de tipo.

O artigo aponta para `sectionId`, e a categoria vem da seção — guardar as duas
permitiria que divergissem. `portalArticleId` guarda a identidade no portal,
sem a qual sincronizar criaria duplicata a cada importação.

**Nada de classificação é fixo no código.** Categoria, seção, gênero e tipo de
oportunidade são cadastro, editável em Configurações. A semente é a estrutura
do portal como levantada — 13 categorias e 146 seções —, mas o portal muda e
ninguém vai abrir o código para acompanhar.

Disso decorre uma regra: **filtro lê do cadastro, nunca de constante**. Vale
para a Biblioteca e para Projetos. Antes eram listas fixas, e o formulário
podia discordar do filtro sobre quais produtos existem.

Vazio é estado legítimo em `sectionId` e `genreId`. Quando a migração de um
registro antigo não encontra correspondência, ela **deixa vazio em vez de
chutar**: encaixar na seção mais parecida seria classificação inventada, e
ninguém saberia que foi palpite. O artigo aparece no filtro "Sem seção" e
alguém decide.

Renomear preserva o id — o vínculo com o artigo é o identificador, não o
texto. Remover categoria leva junto as seções dela e deixa os artigos
apontando para o vazio, de propósito, pelo mesmo motivo.

Máquina de estado **não** é lista de preenchimento: o estágio do artigo e do
plano continua fixo no código, porque tem transição, teste e indicador
amarrados. O status da oportunidade também.

## Identidade visual

O kit de marca vive em `brand/`, **fora de `public/`** — são arquivos de
impressão, de até 2,6 MB, que ninguém deve baixar pelo navegador. Em
`public/brand/` ficam só as versões de web, geradas a partir dele com `sharp`
e recortadas na margem transparente: nenhuma passa de 8 kB.

A regra de uso sai dos próprios arquivos, que são variantes de fundo:

| Sufixo | Uso |
| --- | --- |
| `-1` | colorida, fundo claro |
| `-4` | colorida, fundo escuro |
| `-2` | monocromática escura |
| sem sufixo | toda branca |

O sidebar é escuro, então usa `-4`. Marca em imagem dentro de container
flex-column **precisa de `self-start`**: o padrão é esticar, e a marca sai
deformada na largura.

Poppins é a fonte da identidade e vem de `src/fonts`, servida por
`next/font/local`. A família tem 18 pesos; a interface carrega quatro.
Não voltar para fonte do Google — a marca não depende de terceiro.

### Duas cores por tema, não uma

`--brand` é o tom exato da marca, medido do arquivo. `--primary` é esse tom
escurecido até texto branco fechar 4,5:1. Onde a cor é identidade vale
`--brand`; onde ela vira fundo de botão vale `--primary`.

Sem a separação, ou a marca sai errada ou o botão fica ilegível: o verde
AltoQi `#00CC78` puro dá 2,4:1 com branco, e o laranja Builder dá 2,8:1.

Cor nova passa por medição de contraste antes de entrar. Estimar a olho já
produziu dois valores reprovados nesta mesma sprint.

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

Testes cobrem lógica pura, nunca componentes: motor de busca e busca
transversal, transições de artigo e de plano, métricas por projeto e por
período, parsing da resposta da IA, índice do artigo, critérios de publicação,
fronteira de armazenamento, o cadastro de taxonomia com a migração da
classificação antiga, e os normalizadores de artigo, plano e atendimento.
Ao mexer em qualquer uma delas, o teste vem junto.

Dois cuidados que já custaram tempo: `npm test` **não** faz typecheck — só o
`typecheck` pega erro de tipo em arquivo de teste; e o hook roda em segundo
plano, então o aviso de falha chega depois da edição, não junto dela.
