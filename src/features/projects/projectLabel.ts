/** Só o que a função precisa: quem chama nem sempre tem o projeto inteiro em mão. */
type ProjetoNomeado = { id: string; name: string };

/**
 * Como nomear a iniciativa de um registro.
 *
 * Vazio e ausente são coisas diferentes, e a tela dizia "Projeto não
 * encontrado" para os dois. Para o artigo vindo do portal isso é uma acusação
 * falsa: ele **nasce** sem iniciativa de propósito — o acervo é do hub, e
 * carimbá-lo com o projeto ativo esconderia o portal de quem trocasse de
 * projeto. Não há nada para encontrar.
 *
 * Já id preenchido que não resolve é outra história: ali algo se perdeu, e
 * dizer isso é o certo.
 */
export function projectLabel(projects: ProjetoNomeado[], projectId: string): string {
  if (!projectId.trim()) return "Sem iniciativa";

  return projects.find((project) => project.id === projectId)?.name ?? "Projeto não encontrado";
}
