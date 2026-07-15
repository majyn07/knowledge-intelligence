# Modelo de Domínio

## Projeto

Representa um conjunto organizado de análises.

Cada projeto possui:

- nome;
- descrição;
- responsável;
- data de criação;
- status;
- múltiplas análises.

---

## Análise

Representa uma execução de análise realizada sobre um ou mais atendimentos.

Cada análise pertence obrigatoriamente a um Projeto.

Uma análise pode gerar:

- insights;
- planos de melhoria;
- indicadores;
- backlog documental.

---

## Atendimento

Representa o dado de entrada.

Pode ser:

- ticket;
- conversa;
- exportação;
- planilha;
- documento.

Os atendimentos nunca são alterados pelo sistema.

---

## Insight

Representa um conhecimento identificado durante uma análise.

Exemplos:

- dúvida recorrente;
- documentação ausente;
- artigo desatualizado;
- dificuldade de encontrabilidade.

---

## Plano de Melhoria

Representa um conjunto organizado de ações para evolução da Base de Conhecimento.

Pode conter:

- novos artigos;
- revisões;
- consolidações;
- reorganizações;
- melhorias de taxonomia.

---

## Base de Conhecimento

Representa o conjunto de artigos utilizados durante a análise.

Cada projeto utiliza apenas a Base de Conhecimento correspondente à solução Visus analisada.

---

## Solução Visus

Representa um produto da plataforma Visus.

Exemplos:

- Workflow
- Collab
- Cost Management
- Control Tower
- Planning
- Tracking
- BID

A solução determina qual Base de Conhecimento será utilizada durante toda a análise.