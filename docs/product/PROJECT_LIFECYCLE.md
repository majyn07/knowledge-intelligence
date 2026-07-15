# Ciclo de Vida de um Projeto

## Objetivo

Um Projeto representa uma iniciativa de evolução da Base de Conhecimento.

Durante sua execução, são importadas as bases necessárias, realizadas análises e geradas recomendações para melhoria contínua da documentação.

---

# Fluxo

Criar Projeto

↓

Importar Base de Atendimentos

↓

Importar Base de Conhecimento

↓

Executar Análises

↓

Gerar Recomendações

↓

Consolidar Plano de Melhoria

↓

Atualizar Documentação Oficial

↓

Importar nova versão da Base

↓

Executar nova rodada de análises

---

# Entradas

Um Projeto recebe duas fontes principais de dados:

- Base de Atendimentos;
- Base de Conhecimento.

Ambas poderão ser importadas por API ou exportação manual.

---

# Base de Atendimentos

Contém os atendimentos utilizados pela IA durante as análises.

Cada atendimento pertence a uma solução específica.

Exemplos:

- Workflow
- Collab
- Planning

---

# Base de Conhecimento

Representa uma cópia da documentação oficial.

É utilizada exclusivamente como contexto durante as análises.

A documentação oficial permanece sendo a única fonte de verdade.

---

# Análises

Cada análise utiliza:

- um atendimento;
- uma Base de Conhecimento;
- uma versão específica da Base.

As análises permanecem vinculadas à versão utilizada durante sua execução.

---

# Recomendações

Uma análise poderá recomendar:

- utilizar um artigo existente;
- atualizar um artigo existente;
- criar um novo artigo;
- consolidar artigos;
- eliminar redundâncias.

---

# Plano de Melhoria

As recomendações aprovadas passam a compor um Plano de Melhoria.

Esse plano organiza todas as alterações documentais previstas para o Projeto.

---

# Encerramento

Após a atualização da documentação oficial, uma nova Base poderá ser importada.

Novas análises utilizarão automaticamente essa versão atualizada.