import { items, record, text } from "@/lib/shape";

/**
 * A equipe de quem atende, vinda da HubSpot.
 *
 * Existe porque nenhum nome de colaborador vive no código deste produto, e nem
 * deve: pessoa é conta, e a lista é quem entrou. O que a HubSpot acrescenta é
 * o vínculo entre o e-mail de quem entrou e a equipe em que ele já está lá.
 *
 * Isso **sugere**, nunca decide. É a mesma regra da equipe sugerida pela
 * categoria do artigo: propor poupa digitação, derivar cria um responsável que
 * ninguém escolheu.
 */

export interface OwnerTeams {
  /** O e-mail, em minúsculas, que é como o casamento acontece. */
  email: string;
  /** Os nomes das equipes, como a HubSpot as chama. */
  teams: string[];
}

/**
 * O que interessa das equipes: as de atendimento.
 *
 * Quem atende costuma estar também em equipes de outras áreas, e trazer todas
 * faria a sugestão oferecer "Marketing" para quem responde chamado.
 */
const DE_ATENDIMENTO = /^(setup|suporte)/i;

/** Os donos da HubSpot, reduzidos ao vínculo e-mail → equipes. */
export function toOwnerTeams(bruto: unknown): OwnerTeams[] {
  return items(record(bruto).results)
    .map((entrada) => record(entrada))
    .filter((dono) => dono.archived !== true)
    .map((dono) => ({
      email: text(dono.email).trim().toLowerCase(),
      teams: items(dono.teams)
        .map((equipe) => text(record(equipe).name).trim())
        .filter((nome) => nome !== "" && DE_ATENDIMENTO.test(nome)),
    }))
    .filter((dono) => dono.email !== "" && dono.teams.length > 0);
}

/**
 * A equipe proposta para um e-mail, ou nada.
 *
 * Devolve **uma** quando há uma só, e nada quando há várias: as seis equipes de
 * Suporte da conta têm exatamente as mesmas dezoito pessoas, então propor uma
 * delas seria escolher por sorteio e apresentar isso como decisão. Duas equipes
 * na mesma pessoa desligam a sugestão, como duas equipes na mesma categoria
 * desligam a do artigo.
 */
export function sugerirEquipe(donos: OwnerTeams[], email: string): string | null {
  const alvo = email.trim().toLowerCase();

  if (alvo === "") return null;

  const dono = donos.find((candidato) => candidato.email === alvo);

  if (!dono) return null;

  /*
    Nomes repetidos contam uma vez. A HubSpot devolve a mesma equipe mais de
    uma vez quando ela aparece em hierarquias diferentes.
  */
  const unicas = [...new Set(dono.teams)];

  return unicas.length === 1 ? unicas[0] : null;
}

/** Todas as equipes de atendimento que existem, para a tela oferecer a lista. */
export function equipesDeAtendimento(donos: OwnerTeams[]): string[] {
  const nomes = new Set<string>();

  for (const dono of donos) for (const equipe of dono.teams) nomes.add(equipe);

  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
