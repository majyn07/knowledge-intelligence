import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { portalIdOf, type PortalUrl } from "./portalSitemap";

/**
 * Quais páginas precisam ser visitadas de verdade.
 *
 * Sem isto, parar a varredura no meio não adianta nada: a próxima passada
 * recomeça do primeiro e busca de novo tudo que já veio. São ~1.800 páginas do
 * servidor da própria AltoQi, e repetir o que não mudou é gastar a máquina de
 * quem atende cliente para chegar ao mesmo resultado.
 *
 * O `lastmod` do sitemap é o que permite a comparação, e ele veio preenchido
 * em todas as 1.827 URLs. A importação grava esse mesmo instante em
 * `updatedAt`, então a segunda passada encontra os dois iguais e pula.
 */

export interface PortalVisitPlan {
  /** O que vale buscar agora. */
  toVisit: PortalUrl[];
  /** Não existe aqui: entra novo. */
  missing: number;
  /** Existe e o portal diz que mudou depois da última importação. */
  outdated: number;
  /** Existe e está em dia, pulado. */
  upToDate: number;
  /** Sem `lastmod` no sitemap: visitado, porque não dá para afirmar que está em dia. */
  undated: number;
}

function parseLastmod(valor: string): number | null {
  if (!valor.trim()) return null;
  const instante = new Date(valor).getTime();
  return Number.isNaN(instante) ? null : instante;
}

export function planVisits(
  entradas: PortalUrl[],
  existing: KnowledgeArticle[],
  /** Ignora o que está em dia e busca tudo de novo. */
  revisitAll = false
): PortalVisitPlan {
  const porPortalId = new Map<string, KnowledgeArticle>();
  for (const article of existing) {
    if (article.portalArticleId) porPortalId.set(article.portalArticleId, article);
  }

  const plan: PortalVisitPlan = {
    toVisit: [],
    missing: 0,
    outdated: 0,
    upToDate: 0,
    undated: 0,
  };

  for (const entrada of entradas) {
    if (revisitAll) {
      plan.toVisit.push(entrada);
      continue;
    }

    const existente = porPortalId.get(portalIdOf(entrada.url));

    if (!existente) {
      plan.missing += 1;
      plan.toVisit.push(entrada);
      continue;
    }

    const doPortal = parseLastmod(entrada.lastmod);

    /*
      Sem data no sitemap não dá para afirmar que está em dia, e pular sem saber
      deixaria uma alteração de fora para sempre. Na dúvida, visita, e a
      contagem diz quantas foram por esse motivo.
    */
    if (doPortal === null) {
      plan.undated += 1;
      plan.toVisit.push(entrada);
      continue;
    }

    /*
      `updatedAt` maior que o `lastmod` acontece quando alguém editou o artigo
      aqui depois de importar. Não é motivo para revisitar: o portal continua
      sem novidade, e sobrescrever apagaria a edição de quem editou. Quem quiser
      a versão do portal de volta pede "revisitar todas".
    */
    if (existente.updatedAt.getTime() >= doPortal) {
      plan.upToDate += 1;
      continue;
    }

    plan.outdated += 1;
    plan.toVisit.push(entrada);
  }

  return plan;
}
