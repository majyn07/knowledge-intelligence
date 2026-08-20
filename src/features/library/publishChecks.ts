import type { PublishCheck } from "@/components/common/PublishConfirmDialog";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/** Mede o preparo do artigo pelos próprios campos — nada é inferido. */
export function articlePublishChecks(article: KnowledgeArticle): PublishCheck[] {
  return [
    {
      label: "Tem resumo",
      ok: article.summary.trim().length > 0,
      hint: "O resumo é o que a análise lê ao avaliar cobertura documental.",
    },
    {
      label: "Tem conteúdo escrito",
      ok: article.content.trim().length > 0,
      hint: "Publicar sem corpo entrega uma página vazia a quem procura ajuda.",
    },
    {
      label: "Seção definida",
      ok: article.sectionId.trim().length > 0,
      hint: "É a seção do portal onde o artigo vai morar. Sem ela não há para onde publicar.",
    },
    {
      label: "Gênero definido",
      ok: article.genreId.trim().length > 0,
      hint: "Diz que tipo de ajuda o texto oferece a quem chega nele.",
    },
    {
      label: "Tem palavras-chave",
      ok: article.keywords.length > 0,
      hint: "São os termos que o cliente usa. Têm peso alto na busca da análise.",
    },
    {
      label: "Tem autor",
      ok: article.author.trim().length > 0,
      hint: "Quem conduziu o conteúdo fica registrado no histórico.",
    },
  ];
}
