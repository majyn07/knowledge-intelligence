import type { Team } from "@/models/Assignment";
import { findSection, type Taxonomy } from "@/models/Taxonomy";

/**
 * Qual equipe responde por uma seção do portal.
 *
 * É **sugestão**, e a diferença importa: derivar a atribuição
 * automaticamente criaria um responsável que ninguém escolheu, e num cadastro
 * incompleto — QiOnboarding e Novidades de Release não têm equipe óbvia — o
 * palpite apareceria com cara de decisão. Aqui o formulário chega preenchido
 * e quem preenche troca se estiver errado.
 *
 * Devolve vazio quando **duas ou mais** equipes declaram a mesma categoria.
 * Escolher a primeira seria arbitrário, e arbitrário com cara de sugestão é
 * pior que campo vazio: ninguém desconfia do que já veio preenchido.
 */
export function suggestTeam(
  sectionId: string,
  taxonomy: Taxonomy,
  teams: Team[]
): string {
  const section = findSection(taxonomy, sectionId);
  if (!section) return "";

  const candidatas = teams.filter((team) => team.categoryIds.includes(section.categoryId));

  return candidatas.length === 1 ? candidatas[0].id : "";
}

/**
 * As equipes que respondem por uma categoria.
 *
 * A tela de cadastro usa para avisar quando duas declararam a mesma — o que é
 * permitido, mas desliga a sugestão.
 */
export function teamsOfCategory(categoryId: string, teams: Team[]): Team[] {
  return teams.filter((team) => team.categoryIds.includes(categoryId));
}
