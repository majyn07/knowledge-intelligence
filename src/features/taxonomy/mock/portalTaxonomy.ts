import {
  type Taxonomy,
  type TaxonomyCategory,
  type TaxonomyEntry,
  type TaxonomySection,
  taxonomyId,
} from "@/models/Taxonomy";

/**
 * A estrutura do suporte.altoqi.com.br como levantada em 20/08/2026.
 *
 * É semente, não verdade permanente: o portal muda e o cadastro é editável.
 *
 * O Visus é uma **linha com sete módulos**. Plataforma, Collab, Planning,
 * Bid, Tracking, Cost Management, Workflow e Control Tower,, confirmados em
 * `altoqi.com.br/visus/*`. Eles aparecem duas vezes de propósito: como seções
 * dentro de `AltoQi Visus` e, para dois deles, como categoria própria no
 * portal. Isso é o portal, não um erro de levantamento, e espelhá-lo é o
 * trabalho desta semente.
 *
 * Duas categorias ficam sem seções, e as duas foram conferidas no portal:
 * `AltoQi Visus Workflow`, que no dia do levantamento não tinha nenhuma, e
 * `Quero falar com o Suporte`, que é categoria de verdade. Aparece entre as
 * treze da página inicial, mas serve de porta de entrada para o atendimento,
 * não de prateleira de artigo. Ficam vazias porque é o que elas são;
 * inventar seção seria pior que admitir a lacuna.
 */
const portal: { name: string; isProduct: boolean; sections: string[] }[] = [
  {
    name: "AltoQi Builder",
    isProduct: true,
    sections: [
      "Interface",
      "Criação, abertura e salvamento de projetos",
      "Arquitetura e Desenhos Base | Base 2D",
      "Arquitetura e Desenhos Base | Interoperabilidade BIM (arquivos IFC e referências 3D externas)",
      "Arquitetura e Desenhos Base | Recursos de CAD (ferramentas de desenho)",
      "Projetos Multidisciplinares e Integração entre Disciplinas",
      "Visualização do Projeto e Níveis de Desenho",
      "Pavimentos e Níveis de Projeto",
      "Cadastro",
      "Simbologias",
      "Condutos",
      "Peças, Conexões e Elementos Genéricos",
      "Avisos e Indicações",
      "Colunas e Prumadas",
      "Geral",
      "Disciplina Cabeamento",
      "Disciplina Alvenaria",
      "Disciplina Climatização",
      "Disciplina Elétrico | Pontos elétricos e comandos",
      "Disciplina Elétrico | Sistemas Fotovoltaicos",
      "Disciplina Gás",
      "Disciplina Hidráulico | Reservatórios (caixa d'água)",
      "Disciplina Hidráulico | Alimentação, hidrômetros e bombas de recalque",
      "Disciplina Hidráulico | Colunas, Prumadas e Barriletes de Distribuição",
      "Disciplina Hidráulico | Condutos (tubulações) e lançamentos",
      "Disciplina Hidráulico | Ramais e Ambientes Molhados",
      "Disciplina Hidráulico | Peças e materiais (PEX, registros, conexões)",
      "Disciplina Hidráulico | Aquecedores, Reservatórios Térmicos e Placas Solares",
      "Disciplina Hidráulico | Piscinas",
      "Disciplina Hidráulico | Verificação de pressões, vazões e perdas de carga",
      "Disciplina Hidráulico | Soluções para pressão (pressurizadores e VRP)",
      "Disciplina Sanitário | Colunas Sanitárias, Ventilação e Tubos de Queda",
      "Disciplina Sanitário | Ramais e Ambientes Sanitários",
      "Disciplina Sanitário | Peças e componentes (ralos, sifões, conexões)",
      "Disciplina Sanitário | Caixas de passagem, gordura e sifonadas",
      "Disciplina Sanitário | Rede Pluvial, Calhas e Coletores",
      "Disciplina Sanitário | Unidades de Tratamento",
      "Disciplina Sanitário | Estações elevatórias e bombas submersíveis",
      "Disciplina Sanitário | Verificações e dimensionamento",
      "Disciplina Incêndio | Configurações, normas e mensagens gerais",
      "Disciplina Incêndio | Bombas de Incêndio",
      "Disciplina Incêndio | Sprinklers: lançamento, critérios e dimensionamento",
      "Disciplina Incêndio | Hidrantes e mangotinhos",
      "Disciplina Incêndio | Planilha de Pressão, perdas de carga e comportamento hidráulico",
      "Disciplina Incêndio | Sinalização, preventivo e equipamentos auxiliares",
      "Disciplina SPDA",
      "Relatórios",
      "Visão 3D",
      "Cortes, detalhes e esquemas",
      "Pranchas",
    ],
  },
  {
    name: "AltoQi Eberick",
    isProduct: true,
    sections: [
      "Interface",
      "Criação, abertura e salvamento de projetos",
      "Pavimentos e níveis intermediários",
      "Desenhos e Arquitetura",
      "Desenhos e Arquitetura | Interoperabilidade BIM",
      "Pilares | Lançamento",
      "Pilares | Erros e Avisos",
      "Pilares | Dimensionamento e Detalhamento",
      "Vigas | Lançamento",
      "Vigas | Erros e Avisos",
      "Vigas | Dimensionamento e Detalhamento",
      "Lajes | Lançamento",
      "Lajes | Erros e Avisos",
      "Lajes | Dimensionamento",
      "Lajes | Detalhamento",
      "Fundações | Lançamento",
      "Fundações | Erros e Avisos",
      "Fundações | Dimensionamento e Detalhamento",
      "Cargas",
      "Escadas",
      "Escadas | Exemplos de Lançamento",
      "Reservatórios",
      "Reservatórios | Exemplos de lançamento",
      "Paredes de contenção",
      "Muros de Arrimo",
      "Elementos genéricos e perfis metálicos",
      "Estruturas de Alvenaria Estrutural",
      "Estruturas de Protensão",
      "Estruturas Pré-Moldadas",
      "Estruturas Pré-Moldadas | Erros e Avisos",
      "Processamento",
      "Análise da estrutura",
      "Estabilidade global",
      "Deslocamentos e durabilidade",
      "Planta de fôrma e locação",
      "Pranchas e detalhamentos",
      "Configurações",
      "Outros",
    ],
  },
  {
    name: "Elétrico",
    isProduct: true,
    sections: [
      "Módulo Fotovoltaico",
      "Cadastro",
      "Lâmpadas e comandos | Lançamento",
      "Tomadas | Lançamento",
      "Quadros | Lançamento",
      "Pontos em geral | Lançamento",
      "Condutos | Lançamento",
      "Quadros | Operações",
      "Circuitos | Operações",
      "Condutos | Operações",
      "Fiação | Operações",
      "Fiação | Configurações",
      "Dimensionamento",
      "Erros de dimensionamento",
      "Erros e Avisos",
      "Quadros e Diagramas | Detalhamentos",
      "Legendas e Relatórios | Detalhamentos",
      "Outros",
    ],
  },
  {
    name: "AltoQi Visus",
    isProduct: true,
    sections: [
      "Plataforma AltoQi Visus",
      "Cost Management",
      "Planning",
      "Collab",
      "Workflow",
      "Bid",
      "Tracking",
      "Control Tower",
    ],
  },
  {
    name: "Editor de Armaduras",
    isProduct: true,
    sections: [
      "Pranchas e detalhamentos",
      "Integração com o Eberick",
      "Configurações",
      "Resumo de materiais",
    ],
  },
  {
    name: "AltoQi Visus Cost Management",
    isProduct: true,
    sections: [
      "Versões AltoQi Visus Cost Management",
      "Licença do AltoQi Visus Cost Management",
    ],
  },
  { name: "AltoQi Visus Workflow", isProduct: true, sections: [] },
  {
    name: "QiOnboarding",
    isProduct: false,
    sections: [
      "Nossos Canais de Atendimento AltoQi",
      "Seus primeiros passos na Área do Cliente",
      "Explore nossos conteúdos na Plataforma AltoQi Education",
      "Faça parte da Comunidade AltoQi",
    ],
  },
  {
    name: "Instalação, Ativação e Área do Cliente",
    isProduct: false,
    sections: [
      "Requisitos de Sistema Operacional e Compatibilidade",
      "Firewall, Proxy e Antivírus",
      "Recursos Gráficos e Placa de Vídeo",
      "Instalação & Acesso por Login Integrado",
      "Versões demonstrativas",
      "Instalação & Acesso por Chave de Ativação EID | Em migração",
      "Versões anteriores",
      "Outros",
    ],
  },
  {
    name: "Novidades de Release",
    isProduct: false,
    sections: [
      "Atualizações AltoQi Eberick",
      "Atualizações AltoQi Builder",
      "Atualizações AltoQi Visus",
      "Atualizações AltoQi Visus Cost Management",
      "Atualizações AltoQi Visus Collab",
      "Atualizações AltoQi Visus WorkFlow",
    ],
  },
  {
    name: "Arquitetura e Interoperabilidade BIM",
    isProduct: false,
    sections: [
      "Preparação da Arquitetura",
      "Interoperabilidade BIM",
      "Colaboração BIM",
      "Exportação e Importação de Modelos 3D (formato Q3D)",
      "Integração com Revit",
      "Visualização em Realidade Aumentada (RA)",
    ],
  },
  {
    name: "AltoQi Education",
    isProduct: false,
    sections: [
      "Guia de Navegação na Nova Plataforma AltoQi Education",
      "Tutorial de emissão de certificado de cursos Plataforma AltoQi Education",
    ],
  },
  { name: "Quero falar com o Suporte", isProduct: false, sections: [] },
];

/**
 * Gênero do artigo: os mesmos valores que o produto já usava. Decisão
 * explícita de não mexer neles: o que muda é deixarem de ser enum fixo no
 * código e passarem a ser cadastro, não o conteúdo da lista.
 */
const seedGenres = [
  "Artigo",
  "FAQ",
  "Workflow",
  "Documento",
  "Template",
];

/**
 * O que uma oportunidade pode ser. Começa com o que o produto já usava, para
 * que nada mude de comportamento na virada, e daqui em diante é a equipe que
 * define. Foi decisão explícita não adotar a classificação do CRM.
 */
const seedOpportunityTypes = [
  "Novo artigo",
  "Atualizar artigo",
  "FAQ",
  "Dica",
  "Alerta",
];

function entries(prefix: string, names: string[]): TaxonomyEntry[] {
  return names.map((name, index) => ({
    id: taxonomyId(prefix, name),
    name,
    order: index,
  }));
}

/**
 * Monta a semente com identificadores estáveis.
 *
 * A seção leva a categoria no próprio id porque os nomes se repetem entre
 * categorias. "Interface", "Cadastro", "Configurações" e "Outros" aparecem em
 * mais de uma. A guarda de sufixo cobre o resto: dois nomes distintos podem
 * produzir o mesmo slug depois de perderem acento e pontuação.
 */
export function buildPortalTaxonomy(): Taxonomy {
  const categories: TaxonomyCategory[] = [];
  const sections: TaxonomySection[] = [];
  const used = new Set<string>();

  portal.forEach((entry, categoryIndex) => {
    const categoryId = taxonomyId("cat", entry.name);
    categories.push({
      id: categoryId,
      name: entry.name,
      isProduct: entry.isProduct,
      order: categoryIndex,
    });

    entry.sections.forEach((name, sectionIndex) => {
      const base = taxonomyId(categoryId.replace(/^cat-/, "sec-"), name);

      let id = base;
      let attempt = 2;
      while (used.has(id)) {
        id = `${base}-${attempt}`;
        attempt += 1;
      }
      used.add(id);

      sections.push({ id, categoryId, name, order: sectionIndex });
    });
  });

  return {
    categories,
    sections,
    genres: entries("gen", seedGenres),
    opportunityTypes: entries("opp", seedOpportunityTypes),
  };
}
