import type { Person } from "@/models/Person";

/**
 * Nenhuma pessoa no código.
 *
 * A lista de pessoas é quem entrou: no modo compartilhado ela vem dos perfis, e
 * no navegador o cabeçalho pergunta "atuando como". A semente antiga repetia as
 * quatro equipes como se fossem pessoas. Resquício de quando pessoa e equipe
 * dividiam o mesmo registro, e trazia um nome de colaborador para dentro do
 * repositório.
 *
 * Equipe é estrutura e continua semeada em `mock/teams`. Pessoa é conta.
 */
export const people: Person[] = [];
