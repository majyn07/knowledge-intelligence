/**
 * Pessoa que pode ser atribuída como responsável ou autor.
 *
 * Não é usuário: não há login, sessão nem permissão associada. É um registro
 * de quem conduz o trabalho, para que atribuir deixe de ser texto livre.
 * Quando existir autenticação, este registro é o ponto natural de ligação.
 */
export interface Person {
  id: string;
  name: string;
  /** Papel curto que ajuda a distinguir homônimos na hora de atribuir. */
  role: string;
}
