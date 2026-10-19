/**
 * A classificação que o suporte faz na HubSpot, como vocabulário único.
 *
 * Ela chega por três lugares — a importação por arquivo reconhece o cabeçalho,
 * a contagem agrupa por campo, a tela desenha a lista — e as três precisam
 * concordar sobre quais campos existem e como se chamam. Escritas em separado,
 * divergem: já aconteceu com o cadastro de rotas e com as chaves de
 * armazenamento, e a divergência aparece como a tela oferecendo um filtro que
 * a importação nunca preenche.
 *
 * **São dois pipelines com vocabulários próprios**, e é por isso que os campos
 * não se fundem. O de Setup pergunta a causa raiz e chama o motivo de
 * "sintoma"; o de Suporte tem só a categoria, e não tem causa nenhuma. Um
 * chamado passa por um dos dois, então cada lista cobre uma parte do acervo —
 * somar as duas num ranking só misturaria dois vocabulários sem que quem lê
 * tivesse como saber.
 *
 * Os cabeçalhos vieram do ticket real, com o prefixo do pipeline e a pergunta
 * inteira, que é como a exportação os escreve.
 */

export type TicketClassificationField =
  | "categoria"
  | "sintoma"
  | "causa"
  | "tipoDeProblema"
  | "fechamento"
  | "quemAbriu"
  | "protecaoTecnologica"
  | "suporteSintoma"
  | "suporteCausa"
  | "produto"
  | "especialidade";

export interface TicketClassificationSpec {
  key: TicketClassificationField;
  /** Como a lista se chama na tela. */
  label: string;
  /** A pergunta que o campo responde, em uma linha. */
  pergunta: string;
  /** De qual pipeline ele vem. */
  pipeline: "suporte" | "setup";
  /**
   * Os cabeçalhos aceitos na importação, já normalizados (sem acento, minúsculos).
   *
   * Correspondência exata, como no resto da importação: casar por trecho faria
   * "causa" e "causa raiz" disputarem colunas diferentes do mesmo arquivo.
   */
  headers: string[];
  /**
   * A propriedade do ticket na HubSpot de onde o campo vem.
   *
   * Nome interno, lido da conta em 19/10/2026 (`GET /crm/v3/properties/tickets`),
   * e não o rótulo: o rótulo é texto que alguém renomeia no painel. Junto do
   * cabeçalho do arquivo, porque são duas portas para o mesmo campo.
   */
  hubspot: string;
}

export const TICKET_CLASSIFICATIONS: readonly TicketClassificationSpec[] = [
  {
    key: "categoria",
    hubspot: "categoria___suporte_tecnico",
    label: "Motivo principal do contato",
    pergunta: "Por que o cliente procurou o suporte.",
    pipeline: "suporte",
    headers: [
      "[support] categoria | motivo principal do contato",
      "[support] categoria",
      "motivo principal do contato",
      "motivo de contato",
      "motivo do contato",
    ],
  },
  {
    key: "sintoma",
    hubspot: "setup_motivo_do_contato",
    label: "Motivo detalhado (Setup)",
    pergunta: "Por que o cliente procurou, no vocabulário do Setup.",
    pipeline: "setup",
    headers: [
      "[setup] sintoma | motivo detalhado do contato",
      "[setup] sintoma",
      "motivo detalhado do contato",
      "sintoma",
    ],
  },
  {
    key: "causa",
    hubspot: "setup__causa",
    label: "Causa raiz (Setup)",
    pergunta: "O que gerou o problema, no vocabulário do Setup.",
    pipeline: "setup",
    headers: [
      "[setup] causa | qual a causa raiz que gerou o problema?",
      "[setup] causa",
      "causa",
      "causa raiz",
      "root cause",
    ],
  },
  {
    key: "tipoDeProblema",
    hubspot: "setup_tipo",
    label: "Tipo de problema",
    pergunta: "De que natureza é o problema.",
    pipeline: "setup",
    headers: ["[setup] tipo de problema", "tipo de problema"],
  },
  {
    key: "fechamento",
    hubspot: "cc__motivo_do_fechamento",
    label: "Motivo do encerramento",
    pergunta: "Como o atendimento terminou.",
    pipeline: "setup",
    headers: [
      "fechamento | qual o motivo do encerramento do ticket?",
      "fechamento",
      "motivo do encerramento",
    ],
  },
  {
    key: "quemAbriu",
    hubspot: "origem",
    label: "Quem abriu",
    pergunta: "De que lado veio o chamado.",
    pipeline: "setup",
    headers: ["quem abriu?", "quem abriu"],
  },
  {
    key: "protecaoTecnologica",
    hubspot: "drill_down___licencas",
    label: "Proteção tecnológica",
    pergunta: "Em que modalidade a licença roda.",
    pipeline: "setup",
    headers: ["protecao tecnologica"],
  },
  /*
    Os quatro abaixo surgiram na HubSpot depois de agosto, quando o pipeline de
    Suporte passou a perguntar sintoma, causa, produto e especialidade. O Suporte
    deixou de ter "só a categoria": agora os dois pipelines têm sintoma e causa,
    cada um com sua lista de opções, e por isso continuam campos separados.
  */
  {
    key: "suporteSintoma",
    hubspot: "suporte_motivo_do_contato",
    label: "Motivo detalhado (Suporte)",
    pergunta: "Por que o cliente procurou, no vocabulário do Suporte.",
    pipeline: "suporte",
    headers: ["[support] sintoma | motivo detalhado do contato", "[support] sintoma"],
  },
  {
    key: "suporteCausa",
    hubspot: "cc__causa_do_contato",
    label: "Causa raiz (Suporte)",
    pergunta: "O que gerou o problema, no vocabulário do Suporte.",
    pipeline: "suporte",
    headers: ["[support] causa | qual a causa raiz que gerou o problema?", "[support] causa"],
  },
  {
    key: "produto",
    hubspot: "produto",
    label: "Produto",
    pergunta: "Sobre qual produto foi o atendimento, segundo quem atendeu.",
    pipeline: "suporte",
    headers: ["[support] produto"],
  },
  {
    key: "especialidade",
    hubspot: "linha_do_produto",
    label: "Especialidade técnica",
    pergunta: "De qual disciplina era a dúvida.",
    pipeline: "suporte",
    headers: [
      "[support] especialidade tecnica | solicitacao sobre funcionalidades de alguma disciplina?",
      "[support] especialidade tecnica",
    ],
  },
];

export const TICKET_CLASSIFICATION_FIELDS = TICKET_CLASSIFICATIONS.map(
  (item) => item.key
);

export function classificationSpec(
  key: TicketClassificationField
): TicketClassificationSpec {
  const achado = TICKET_CLASSIFICATIONS.find((item) => item.key === key);

  /* O tipo garante que existe; a busca sem achado seria erro de programação. */
  if (!achado) throw new Error(`Classificação desconhecida: ${key}`);

  return achado;
}

/**
 * Todos os campos vazios.
 *
 * Quem constrói atendimento fora da importação (a varredura da HubSpot, o
 * cadastro à mão) não tem classificação para pôr, e citar sete campos um a um
 * em cada construtor é a receita para esquecer o oitavo.
 */
export function emptyClassification(): Record<TicketClassificationField, string> {
  return Object.fromEntries(TICKET_CLASSIFICATIONS.map((item) => [item.key, ""])) as Record<
    TicketClassificationField,
    string
  >;
}

/**
 * A classificação de um atendimento, isolada do resto do registro.
 *
 * Serve a quem monta o registro campo a campo — o formulário de edição — e
 * precisa preservar o que não edita. Campo a campo tem o preço de esquecer o
 * campo novo, e aqui o esquecimento apagaria classificação da equipe.
 */
export function classificationOf(ticket: Record<TicketClassificationField, string>): Record<
  TicketClassificationField,
  string
> {
  return Object.fromEntries(
    TICKET_CLASSIFICATIONS.map((item) => [item.key, ticket[item.key]])
  ) as Record<TicketClassificationField, string>;
}
