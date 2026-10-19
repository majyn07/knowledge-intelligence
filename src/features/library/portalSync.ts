import { impressao } from "@/lib/fingerprint";
import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/**
 * O que foi publicado aqui e ainda não está no portal.
 *
 * Não existe API de Base de Conhecimento na HubSpot, então a última perna do
 * ciclo é colar à mão no editor de lá. O produto preparava o artigo e parava, e
 * nada dizia o que ficou sem colar: "publicado" aqui e desatualizado para o
 * cliente parecia a mesma coisa.
 *
 * Calculado, nunca suposto. A comparação é contra a impressão do texto que o
 * portal tinha na última importação, e não contra datas: classificar ou atribuir
 * um artigo move `updatedAt` sem mudar nada do que o cliente lê.
 */

export const PORTAL_STATES = ["em-dia", "aguardando", "fora-do-portal", "a-conferir"] as const;

export type PortalState = (typeof PORTAL_STATES)[number];

export const portalStateLabel: Record<PortalState, string> = {
  "em-dia": "Igual ao portal",
  aguardando: "Aguardando o portal",
  "fora-do-portal": "Não existe no portal",
  "a-conferir": "Conferir com o portal",
};

/** A impressão do que o cliente lê: título, resumo e corpo. */
export function impressaoDoPortal(
  article: Pick<KnowledgeArticle, "title" | "summary" | "content">
): string {
  return impressao(JSON.stringify([article.title, article.summary, article.content]));
}

/**
 * Os artigos que tiveram conteúdo mexido aqui, segundo o histórico.
 *
 * Só serve para os importados antes de a impressão existir. O evento não
 * distingue "conteúdo" de "classificação" (o texto é "Conteúdo ou classificação
 * alterados"), e por isso o que ele aponta vira **a conferir**, não
 * "aguardando": afirmar que falta colar algo que talvez não falte é o achado
 * que faz parar de seguir a lista.
 */
export function editadosAqui(events: ActivityEvent[]): Set<string> {
  const ids = new Set<string>();

  for (const event of events) {
    if (event.type === "article_updated" && event.subject.kind === "article") {
      ids.add(event.subject.id);
    }
  }

  return ids;
}

/**
 * Onde o artigo está em relação ao portal. `null` quando a pergunta não se
 * aplica: rascunho e revisão não foram publicados aqui, e não há o que levar.
 */
export function estadoNoPortal(
  article: KnowledgeArticle,
  editados: Set<string>
): PortalState | null {
  if (article.status !== "published" || article.deletedAt) return null;

  /*
    Publicado aqui e sem identidade no portal: nasceu neste produto. O cliente
    não o encontra em lugar nenhum até alguém criá-lo lá.
  */
  if (!article.portalArticleId) return "fora-do-portal";

  if (article.portalBaseline) {
    return impressaoDoPortal(article) === article.portalBaseline ? "em-dia" : "aguardando";
  }

  /*
    Importado antes da impressão: sem a versão do portal guardada, o histórico
    é o que resta. Sem edição registrada, nada mudou aqui desde a importação.
  */
  return editados.has(article.id) ? "a-conferir" : "em-dia";
}

export type LeituraDoEndereco =
  | { ok: true; portalArticleId: string; url: string }
  | { ok: false; motivo: string };

/**
 * O endereço que alguém colou depois de criar o artigo no portal.
 *
 * A importação casa artigo por `portalArticleId`, e o que nasceu aqui não tem
 * um. Sem esta ligação, o artigo criado lá entraria na próxima importação como
 * **outro** artigo, duplicando o acervo. Casar pelo título seria inventar
 * vínculo: quem sabe qual página é a deste artigo é quem a criou.
 *
 * O host precisa ser o do portal que o acervo já espelha: o identificador sai
 * do caminho, e o de um site qualquer seria um número sem sentido aqui.
 */
export function lerEnderecoDoPortal(
  colado: string,
  artigoId: string,
  articles: KnowledgeArticle[],
  portalIdOf: (url: string) => string
): LeituraDoEndereco {
  let endereco: URL;

  try {
    endereco = new URL(colado.trim());
  } catch {
    return { ok: false, motivo: "Isto não é um endereço. Copie da barra do navegador, na página do artigo." };
  }

  const hostsDoAcervo = new Set(
    articles
      .map((article) => article.url ?? "")
      .filter(Boolean)
      .map((url) => {
        try {
          return new URL(url).hostname;
        } catch {
          return "";
        }
      })
      .filter(Boolean)
  );

  if (hostsDoAcervo.size > 0 && !hostsDoAcervo.has(endereco.hostname)) {
    return {
      ok: false,
      motivo: `O endereço não é do portal (${[...hostsDoAcervo].join(", ")}).`,
    };
  }

  const portalArticleId = portalIdOf(endereco.toString());

  if (!portalArticleId) {
    return { ok: false, motivo: "Não deu para ler o artigo neste endereço. Abra a página do artigo e copie de lá." };
  }

  const dono = articles.find(
    (article) => article.portalArticleId === portalArticleId && article.id !== artigoId
  );

  /* O banco recusaria: a identidade no portal é única. Melhor dizer qual é o outro. */
  if (dono) {
    return { ok: false, motivo: `Esta página já está ligada a "${dono.title}".` };
  }

  return { ok: true, portalArticleId, url: endereco.toString() };
}

export interface PortalSummary {
  aguardando: KnowledgeArticle[];
  foraDoPortal: KnowledgeArticle[];
  aConferir: KnowledgeArticle[];
}

export function resumoDoPortal(
  articles: KnowledgeArticle[],
  editados: Set<string>
): PortalSummary {
  const resumo: PortalSummary = { aguardando: [], foraDoPortal: [], aConferir: [] };

  for (const article of articles) {
    const estado = estadoNoPortal(article, editados);

    if (estado === "aguardando") resumo.aguardando.push(article);
    else if (estado === "fora-do-portal") resumo.foraDoPortal.push(article);
    else if (estado === "a-conferir") resumo.aConferir.push(article);
  }

  return resumo;
}
