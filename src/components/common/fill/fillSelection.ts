/**
 * O que acontece entre a proposta da IA e os campos do formulário.
 *
 * Existe separado da tela porque é a parte que pode errar em silêncio: aplicar
 * o que não foi marcado, ou apagar o que a pessoa já tinha digitado. Componente
 * não se testa neste produto; isto se testa.
 */

export type FillProposal =
  | { kind: "valor"; name: string; value: string; reason: string }
  | { kind: "lista"; name: string; items: Record<string, string>[]; reason: string };

/** O que vai para o formulário: um texto, ou uma sequência de itens. */
export type FillValue = string | Record<string, string>[];

/**
 * A proposta, já cruzada com o que o formulário mostra hoje.
 *
 * `label` vem do formulário e não da IA: o modelo devolve o `name` técnico, e
 * "goal" na tela de revisão não diz a ninguém qual campo vai mudar.
 *
 * `overwrites` é a informação que decide o clique. Preencher campo vazio é
 * ganho puro; substituir o que alguém escreveu é perda possível, e a tela tem
 * de dizer qual é qual **antes**, como o diálogo de exclusão diz o número
 * antes do clique.
 */
export type ReviewableProposal = FillProposal & {
  label: string;
  /** O que o campo mostra hoje, em texto, para a lista, quantos itens já há. */
  current: string;
  overwrites: boolean;
};

/**
 * Cruza o que a IA propôs com o que o formulário tem e sabe nomear.
 *
 * Proposta para campo que a tela não conhece é descartada aqui também, e não
 * só no servidor: as duas pontas conferem porque a lista de campos pode mudar
 * entre o pedido e a resposta (alguém troca de aba, o formulário remonta) e
 * escrever num campo que não existe mais é escrever no nada.
 */
export function toReviewable(
  proposals: FillProposal[],
  labels: Record<string, string>,
  current: Record<string, FillValue>
): ReviewableProposal[] {
  return proposals
    .filter((proposal) => proposal.name in labels)
    .map((proposal) => {
      const label = labels[proposal.name] ?? proposal.name;
      const atual = current[proposal.name];

      /*
        **Lista soma, não substitui**, e por isso nunca é marcada como perda.

        Quem já digitou uma mensagem à mão antes de anexar o documento não
        deveria perdê-la, e substituir seria a única forma de isso acontecer.
        O que já está lá é informado para quem revisa saber o que vai ficar
        ao lado do que entra, e não para avisar de um estrago que não existe:
        aviso que não corresponde a nada é o que ensina alguém a ignorar
        avisos.
      */
      if (proposal.kind === "lista") {
        const quantos = Array.isArray(atual) ? atual.length : 0;

        return {
          ...proposal,
          label,
          current: quantos === 0 ? "" : `${quantos} ${quantos === 1 ? "item" : "itens"}`,
          overwrites: false,
        };
      }

      const texto = (typeof atual === "string" ? atual : "").trim();

      return {
        ...proposal,
        label,
        current: texto,
        /*
          Valor igual ao que já está lá não é substituição: marcar como tal
          faria a tela avisar sobre uma perda que não existe, e aviso que não
          corresponde a nada é o que ensina alguém a ignorar avisos.
        */
        overwrites: texto !== "" && texto !== proposal.value.trim(),
      };
    });
}

/**
 * O que vem marcado quando a lista aparece.
 *
 * Só o que preenche campo vazio. Substituir texto que alguém escreveu é
 * decisão, e decisão não vem tomada por padrão. Quem quiser troca a marca, e
 * a tela diz o que a troca custa.
 */
export function defaultSelection(proposals: ReviewableProposal[]): Set<string> {
  return new Set(
    proposals.filter((proposal) => !proposal.overwrites).map((proposal) => proposal.name)
  );
}

/**
 * Os valores a aplicar, na forma que o formulário grava.
 *
 * Devolve só o que está marcado. Nada aqui salva: o formulário recebe os
 * valores nos campos, e salvar continua sendo ato de quem edita.
 */
export function applySelection(
  proposals: ReviewableProposal[],
  selected: Set<string>
): Record<string, FillValue> {
  const resultado: Record<string, FillValue> = {};

  for (const proposal of proposals) {
    if (!selected.has(proposal.name)) continue;

    resultado[proposal.name] =
      proposal.kind === "lista" ? proposal.items : proposal.value;
  }

  return resultado;
}
