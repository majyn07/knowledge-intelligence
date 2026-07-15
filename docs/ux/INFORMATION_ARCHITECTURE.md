# Information Architecture

## Estrutura Geral

O sistema é organizado em torno de Workspaces.

Cada Workspace representa um ambiente de análise independente.

Dentro dele ficam todos os dados relacionados às análises realizadas.

---

# Estrutura

Workspace

├── Dashboard

├── Análises

├── Plano de Melhoria

├── Biblioteca

├── Indicadores

├── Importações

├── Exportações

└── Configurações

---

# Dashboard

Objetivo:

Mostrar onde o usuário parou.

Exibe:

- atividades recentes;
- análises em andamento;
- últimas importações;
- últimas exportações;
- atalhos rápidos.

---

# Análises

Responsável pela avaliação dos atendimentos.

Cada análise pode conter:

- arquivos importados;
- sugestões da IA;
- classificação;
- observações;
- vínculos com artigos da Base de Conhecimento.

---

# Plano de Melhoria

Agrupa oportunidades identificadas durante as análises.

Cada item possui:

- prioridade;
- status;
- responsável;
- observações;
- histórico.

---

# Biblioteca

Representa a Base de Conhecimento analisada.

Permite visualizar:

- artigos;
- cobertura;
- oportunidades;
- categorias;
- histórico de melhorias.

---

# Indicadores

Apresenta métricas consolidadas.

Exemplos:

- cobertura da base;
- principais dúvidas;
- categorias recorrentes;
- evolução temporal;
- produtividade.

---

# Importações

Responsável pela entrada de dados.

Suporta múltiplos formatos.

Exemplos:

- JSON

- CSV

- XLSX

- PDF

- HTML

- TXT

- ZIP

- Exportações HubSpot

- Outros formatos futuros.

---

# Exportações

Permite gerar resultados em diversos formatos.

Exemplos:

- PDF

- Excel

- CSV

- JSON

- Markdown

- HTML

---

# Configurações

Configurações específicas do Workspace.

Exemplos:

- preferências;

- modelos;

- parâmetros da IA;

- regras;

- integrações futuras.