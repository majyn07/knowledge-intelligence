/**
 * O que pode ser reservado a quem administra.
 *
 * Este produto nasceu **sem papéis**, e a razão está registrada: a equipe é
 * treinada e o histórico responde por quem fez o quê. Publicar, excluir e
 * classificar seguem de qualquer um, e isso não muda aqui.
 *
 * O que muda é que existem ações cujo custo não é do conteúdo. Buscar na
 * HubSpot gasta requisições contra uma máquina que atende cliente; esvaziar a
 * lixeira apaga para catorze pessoas de uma vez; importar um arquivo reescreve
 * mil registros num clique. Para essas, "a equipe é treinada" não é resposta
 * suficiente, porque o erro de uma pessoa cai sobre todas.
 *
 * A lista é curta de propósito, e cada entrada precisou justificar por que não
 * bastava o histórico. Guardar tudo seria trocar um produto onde ninguém trava
 * por um onde todo mundo espera aprovação, que é o oposto do que ele é.
 *
 * **Onde a regra é conferida está escrito em cada uma**, e não é detalhe: a
 * porta de verdade é o servidor. Ação sem rota nossa é conferida na tela, o que
 * impede o clique e não impede quem conhece o caminho. Dizer isso é a diferença
 * entre uma trava e a aparência de uma.
 */

export type GuardedActionKey =
  | "hubspot"
  | "esvaziarLixeira"
  | "importarArquivo"
  | "editarTaxonomia"
  | "restaurarPaineis"
  | "excluirProjeto";

/** Quem pode. `todos` é o comportamento de sempre. */
export type GuardLevel = "todos" | "administradores";

export interface GuardedAction {
  key: GuardedActionKey;
  label: string;
  /** Por que ela está nesta lista, e não fora dela. */
  motivo: string;
  /**
   * Onde a regra é conferida.
   *
   * `servidor` é trava: a requisição é recusada mesmo que alguém chame a rota
   * direto. `tela` esconde o caminho e nada mais — a escrita continua indo pela
   * política do banco, que é a mesma para toda a equipe.
   */
  conferida: "servidor" | "tela";
  /**
   * Não pode ser afrouxada.
   *
   * Só a HubSpot, e por pedido de quem conduz a área: o custo é externo e recai
   * sobre o servidor de suporte da AltoQi. As outras nascem em `todos`, que é
   * como o produto sempre funcionou, e quem administra decide apertar.
   */
  fixa?: boolean;
  padrao: GuardLevel;
}

export const GUARDED_ACTIONS: readonly GuardedAction[] = [
  {
    key: "hubspot",
    label: "Buscar atendimentos na HubSpot",
    motivo:
      "Gasta requisições contra o servidor de suporte da AltoQi, que é máquina que atende cliente. Varrer três meses são dezenas de milhares de idas.",
    conferida: "servidor",
    fixa: true,
    padrao: "administradores",
  },
  {
    key: "esvaziarLixeira",
    label: "Esvaziar a lixeira",
    motivo:
      "Apaga de vez, e para as catorze pessoas ao mesmo tempo. É a única ação do produto sem caminho de volta.",
    conferida: "tela",
    padrao: "todos",
  },
  {
    key: "importarArquivo",
    label: "Importar artigos e atendimentos por arquivo",
    motivo:
      "Um clique reescreve milhares de registros. O plano é mostrado antes, mas o desfazer não existe.",
    conferida: "tela",
    padrao: "todos",
  },
  {
    key: "editarTaxonomia",
    label: "Editar categorias e seções do portal",
    motivo:
      "Remover uma categoria leva as seções dela e deixa os artigos apontando para o vazio. O vínculo é o identificador, e ele não volta.",
    conferida: "tela",
    padrao: "todos",
  },
  {
    key: "restaurarPaineis",
    label: "Restaurar os painéis padrão",
    motivo: "Descarta os painéis que a equipe montou, e eles são de todos.",
    conferida: "tela",
    padrao: "todos",
  },
  {
    key: "excluirProjeto",
    label: "Excluir uma iniciativa",
    motivo:
      "Leva junto o trabalho ligado a ela. O acervo fica, mas atendimento, análise e plano são da iniciativa.",
    conferida: "tela",
    padrao: "todos",
  },
];

export type GuardMap = Record<GuardedActionKey, GuardLevel>;

export function defaultGuards(): GuardMap {
  return Object.fromEntries(
    GUARDED_ACTIONS.map((acao) => [acao.key, acao.padrao])
  ) as GuardMap;
}

/**
 * Lê o que está guardado, campo a campo, recusando o que não reconhece.
 *
 * Mesma regra do resto: o registro foi gravado por alguma versão do produto e
 * pode não conhecer uma ação que entrou depois. Valor estranho volta ao padrão
 * em vez de derrubar a tela — e a ação fixa **ignora o que estiver gravado**,
 * senão bastaria escrever `todos` no banco para abrir a porta da HubSpot.
 */
export function normalizeGuards(bruto: unknown): GuardMap {
  const lido = typeof bruto === "object" && bruto !== null ? (bruto as Record<string, unknown>) : {};

  return Object.fromEntries(
    GUARDED_ACTIONS.map((acao) => {
      if (acao.fixa) return [acao.key, acao.padrao];

      const valor = lido[acao.key];

      return [
        acao.key,
        valor === "administradores" || valor === "todos" ? valor : acao.padrao,
      ];
    })
  ) as GuardMap;
}

/**
 * Pode fazer?
 *
 * Sem fundação compartilhada não há conta, e sem conta não há administrador:
 * quem roda no navegador é dono da própria máquina, e travar ali seria uma
 * porta sem chave. É a mesma decisão de `requireAdmin`.
 */
export function podeFazer(
  acao: GuardedActionKey,
  guards: GuardMap,
  souAdministrador: boolean
): boolean {
  return guards[acao] === "todos" || souAdministrador;
}
