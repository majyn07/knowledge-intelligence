import type { ActivityEvent } from "@/models/ActivityEvent";

/**
 * O que uma iniciativa recorta do histórico.
 *
 * O Projeto recorta **trabalho**, atendimento, análise, oportunidade, plano.
 * O acervo é do hub e não tem iniciativa: os 1.822 artigos importados do portal
 * têm `projectId` vazio, e o evento que eles geram nasce vazio junto.
 *
 * Recortar só por igualdade escondia esse evento de toda tela: importar,
 * classificar, publicar e excluir artigo não apareciam em iniciativa nenhuma,
 * porque não existe iniciativa a que eles pertençam. O mutirão de classificar
 * 133 seções produziria um histórico que ninguém encontraria.
 *
 * Por isso o evento sem iniciativa acompanha qualquer uma: ele é do hub, e o
 * hub está sempre aberto.
 */
export function eventsInScope(
  events: ActivityEvent[],
  activeProjectId: string
): ActivityEvent[] {
  if (!activeProjectId) return events;

  return events.filter(
    (event) => event.projectId === activeProjectId || event.projectId === ""
  );
}
