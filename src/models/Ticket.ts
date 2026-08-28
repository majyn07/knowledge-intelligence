import type { Trashable } from "./Trash";

export interface Ticket extends Trashable {
  id: string;
  projectId: string;
  title: string;
  solution: string;
  company: string;
  date: string;
  source?: SupportRecordSource;
  /**
   * O registro como a origem devolveu, sem redução.
   *
   * O atendimento aqui é espelho, e espelho não se edita. Os campos acima
   * existem porque são filtrados, ordenados e contados; guardar só eles faria a
   * análise ler a nossa redução do atendimento em vez do que o suporte
   * registrou, e o que sobra é justamente a classificação que a equipe já fez.
   *
   * Vazio para o que foi cadastrado à mão ou veio por arquivo: ausência é
   * estado previsto, e a tela diz que não há origem em vez de fingir que há.
   */
  raw?: Record<string, unknown>;
}

/** External-system provenance, populated only when a future importer provides it. */
export interface SupportRecordSource {
  provider: "hubspot";
  externalId: string;
  importedAt: string;
}
