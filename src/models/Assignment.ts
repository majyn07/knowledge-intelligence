/**
 * Quem conduz o trabalho.
 *
 * Pessoa e equipe se separaram: até aqui as duas dividiam a mesma lista, e por
 * isso a semente misturava "Suporte Visus" com um nome próprio. A equipe é
 * cadastro; a pessoa é quem entrou no produto.
 */

export interface Team {
  id: string;
  name: string;
  order: number;
}

/**
 * Pessoa é conta, não registro digitado.
 *
 * Só existe quem acessou pelo menos uma vez — ninguém é cadastrado à mão, e
 * nenhum nome de colaborador vive no código. Enquanto um colega não entra, a
 * equipe dele recebe a atribuição.
 */
export interface Person {
  id: string;
  name: string;
  /** Cargo curto, que ajuda a distinguir homônimos na hora de atribuir. */
  role: string;
  email: string;
  /** Vazio enquanto ninguém definiu a equipe. */
  teamId: string;
  /**
   * Retrato da pessoa, embutido no próprio registro.
   *
   * Vazio é o normal: quem não enviou aparece pelas iniciais, que já
   * distinguem sem exigir nada de ninguém.
   */
  avatarUrl: string;
  /**
   * Quem sai da empresa é desativado, não removido: o histórico já registrou
   * o que a pessoa fez, e apagar deixaria esses registros apontando para o
   * vazio. Ela some das atribuições novas e continua no passado.
   */
  isActive: boolean;
}

/** Referência guardada nos campos de atribuição. Vazio é "sem responsável". */
export type AssignmentRef = string;

export interface ResolvedAssignment {
  kind: "person" | "team" | "unknown";
  name: string;
}

/**
 * Traduz a referência guardada para algo exibível.
 *
 * O terceiro caso — `unknown` — não é defensivo à toa. Os registros anteriores
 * guardavam o **nome** de quem conduzia, e a migração converte para
 * identificador só o que encontra correspondência. O que sobra continua sendo
 * o texto original, e é exibido como veio: dizer "sem responsável" apagaria
 * uma informação que existe.
 */
export function resolveAssignment(
  ref: AssignmentRef,
  people: Person[],
  teams: Team[]
): ResolvedAssignment | null {
  if (ref.trim() === "") return null;

  const person = people.find((item) => item.id === ref);
  if (person) return { kind: "person", name: person.name };

  const team = teams.find((item) => item.id === ref);
  if (team) return { kind: "team", name: team.name };

  /*
    Registro anterior guardava o nome. Reconhecê-lo aqui evita uma migração de
    dados inteira: o que está gravado continua resolvendo, e passa a ser
    identificador sozinho na próxima vez que alguém salvar aquele registro.
  */
  const byName = migrateAssignment(ref, people, teams);

  if (byName !== ref) {
    return resolveAssignment(byName, people, teams);
  }

  return { kind: "unknown", name: ref };
}

/** Nome para exibição, ou string vazia quando não há atribuição. */
export function assignmentName(
  ref: AssignmentRef,
  people: Person[],
  teams: Team[]
): string {
  return resolveAssignment(ref, people, teams)?.name ?? "";
}

/**
 * Converte um nome guardado por versão anterior no identificador atual.
 *
 * Devolve a referência original quando não encontra correspondência, em vez de
 * esvaziar. É a mesma regra da migração de seção: não encaixar é melhor que
 * encaixar errado, e o que não encaixou precisa continuar visível.
 */
export function migrateAssignment(
  ref: AssignmentRef,
  people: Person[],
  teams: Team[]
): AssignmentRef {
  if (ref.trim() === "") return "";
  if (people.some((item) => item.id === ref)) return ref;
  if (teams.some((item) => item.id === ref)) return ref;

  const comparable = (value: string) =>
    value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

  const target = comparable(ref);

  const team = teams.find((item) => comparable(item.name) === target);
  if (team) return team.id;

  const person = people.find((item) => comparable(item.name) === target);
  if (person) return person.id;

  return ref;
}
