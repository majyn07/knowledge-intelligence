"use client";

import { resolveAssignment } from "@/models/Assignment";

import { usePeople } from "../providers/PeopleProvider";

/**
 * Nome de quem responde por um registro.
 *
 * O campo guarda identificador; o nome vem do cadastro no momento da leitura.
 * É o que faz renomear uma pessoa atualizar tudo que está atribuído a ela, em
 * vez de orfanar.
 *
 * Referência que não resolve é mostrada como veio, com a ressalva — ela é um
 * nome guardado por versão anterior, e some se for tratada como vazio.
 */
export function AssigneeName({
  value,
  fallback = "Sem responsável",
}: {
  value: string;
  fallback?: string;
}) {
  const { people, teams } = usePeople();
  const resolved = resolveAssignment(value, people, teams);

  if (!resolved) return <>{fallback}</>;

  if (resolved.kind === "unknown") {
    return (
      <span title="Atribuição de um registro anterior, sem correspondência no cadastro atual">
        {resolved.name}
      </span>
    );
  }

  return <>{resolved.name}</>;
}

/** Mesma resolução, para onde só cabe texto. */
export function useAssigneeName() {
  const { people, teams } = usePeople();

  return (value: string, fallback = "Sem responsável") =>
    resolveAssignment(value, people, teams)?.name ?? fallback;
}
