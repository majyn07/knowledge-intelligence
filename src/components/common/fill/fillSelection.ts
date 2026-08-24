/**
 * O que acontece entre a proposta da IA e os campos do formulário.
 *
 * Existe separado da tela porque é a parte que pode errar em silêncio: aplicar
 * o que não foi marcado, ou apagar o que a pessoa já tinha digitado. Componente
 * não se testa neste produto; isto se testa.
 */

export interface FillProposal {
  name: string;
  value: string;
  reason: string;
}

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
export interface ReviewableProposal extends FillProposal {
  label: string;
  current: string;
  overwrites: boolean;
}

/**
 * Cruza o que a IA propôs com o que o formulário tem e sabe nomear.
 *
 * Proposta para campo que a tela não conhece é descartada aqui também, e não
 * só no servidor: as duas pontas conferem porque a lista de campos pode mudar
 * entre o pedido e a resposta — alguém troca de aba, o formulário remonta — e
 * escrever num campo que não existe mais é escrever no nada.
 */
export function toReviewable(
  proposals: FillProposal[],
  labels: Record<string, string>,
  current: Record<string, string>
): ReviewableProposal[] {
  return proposals
    .filter((proposal) => proposal.name in labels)
    .map((proposal) => {
      const atual = (current[proposal.name] ?? "").trim();

      return {
        ...proposal,
        label: labels[proposal.name] ?? proposal.name,
        current: atual,
        /*
          Valor igual ao que já está lá não é substituição: marcar como tal
          faria a tela avisar sobre uma perda que não existe, e aviso que não
          corresponde a nada é o que ensina alguém a ignorar avisos.
        */
        overwrites: atual !== "" && atual !== proposal.value.trim(),
      };
    });
}

/**
 * O que vem marcado quando a lista aparece.
 *
 * Só o que preenche campo vazio. Substituir texto que alguém escreveu é
 * decisão, e decisão não vem tomada por padrão — quem quiser troca a marca, e
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
): Record<string, string> {
  const resultado: Record<string, string> = {};

  for (const proposal of proposals) {
    if (selected.has(proposal.name)) resultado[proposal.name] = proposal.value;
  }

  return resultado;
}
