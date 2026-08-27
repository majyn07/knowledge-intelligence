# Trazer o acervo do portal para a Biblioteca

Como o `suporte.altoqi.com.br` vira o acervo do hub, o que esperar de cada
passo, e o que fazer quando algo sai diferente.

Escrito para quem vai operar isso, não para quem escreveu o código.

---

## O que é, em uma frase

A Biblioteca espelha o portal publicado. A importação lê o site **público** —
sem credencial, sem API, sem tocar em nada do lado da HubSpot — e grava os
artigos aqui, com a seção onde cada um mora.

**Nada é escrito no portal.** Não existe caminho para isso no produto, e
publicar de volta está reservado para uma sprint futura.

---

## Como rodar

**Biblioteca → Do portal.**

1. **Ver o que há no portal** — um pedido, alguns segundos. Mostra quantos
   artigos existem e quantos já estão em dia aqui.
2. **Visitar N página(s)** — cerca de meia hora para o portal inteiro. Tem
   progresso e botão de parar.
3. **Importar N artigo(s)** — grava. Até aqui nada foi gravado.

### Dá para fatiar

Pare em trezentos, feche, volte amanhã. Ao reabrir, a tela diz quantos estão em
dia e visita só o resto. A comparação é pelo `lastmod` que o portal publica, e
não por adivinhação.

**Não feche a aba durante a varredura.** O que já veio fica, mas a parte não
visitada se perde e precisa ser refeita.

---

## Os números que a tela mostra antes do clique

| | |
| --- | --- |
| artigos no portal | 1.825 |
| fora da importação | 7, em espanhol |
| entram novos / serão atualizados | depende do que já existe aqui |
| sem seção | ~133 |
| páginas sem conteúdo | 3 |

**Os 7 em espanhol ficam de fora de propósito.** A taxonomia cadastrada é a do
portal em português; eles entrariam sem seção sem que ninguém entendesse por
quê.

**Os ~133 sem seção** são artigos cuja trilha no portal tem só dois degraus —
categoria, sem seção. É estado legítimo: eles aparecem no filtro "Sem seção" da
Biblioteca, e a sugestão de seção por IA classifica todos de uma vez.

**As 3 páginas sem conteúdo** não entram. Artigo vazio na Biblioteca teria cara
de artigo existente.

---

## O que a importação preserva

Reimportar **não apaga o trabalho feito aqui dentro**:

- **gênero e responsável** são nossos, não do portal
- a **seção classificada aqui** fica, quando o portal não traz nenhuma
- o **conteúdo** é substituído pelo do portal, que é a fonte

O casamento é pelo identificador do artigo no portal. Cerca de 140 artigos usam
endereço com nome em vez de número, e para esses o nome é a identidade — as
duas formas são estáveis.

---

## Quando algo sai diferente

**"Não foi possível gravar: ... foreign key constraint"**
Falta aplicar a migração `0018_artigo_sem_iniciativa.sql`. O artigo do acervo
não pertence a nenhuma iniciativa, e o banco precisava aprender isso. Aplique
pelo SQL Editor do painel da Supabase.

**"A gravação foi interrompida"**
Um lote falhou. O que entrou está no banco; rode a importação de novo e ela
completa só o que falta.

**A contagem para de subir e nada acontece**
Confira se a aba continua aberta e se o servidor não foi reiniciado. Editar
qualquer arquivo em `src/` durante o desenvolvimento força um recarregamento
que mata a varredura em curso.

**A varredura fica muito mais lenta que meia hora**
É o servidor do portal do outro lado. A varredura é em série e com pausa de
propósito — varrer a toda velocidade é falta de educação com uma máquina que
atende cliente. Pare e continue depois; nada se perde.

---

## O custo, para quem perguntar

Uma importação completa são **1.826 requisições de leitura** ao portal, a cerca
de duas por segundo. Nenhuma escrita, nenhuma chamada à API da HubSpot, nenhum
consumo de cota deles. O `robots.txt` do portal permite `/hc/` e não declara
intervalo mínimo.

Depois da primeira carga, o custo permanente é só o que o portal alterar.
