import type { Ticket } from "@/models/Ticket";

/**
 * Nenhum atendimento de demonstração.
 *
 * Atendimento inventado alimenta análise inventada, que vira oportunidade
 * inventada — e o levantamento passaria a apontar trabalho que não existe,
 * que é exatamente o que faz alguém parar de confiar na lista.
 */
export const tickets: Ticket[] = [];
