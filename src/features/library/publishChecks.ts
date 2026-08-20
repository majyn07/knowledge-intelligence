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
      label: "Produto e módulo definidos",
      ok: article.product.trim().length > 0 && article.module.trim().length > 0,
      hint: "Sem eles o artigo não aparece agrupado nem nos filtros por produto.",
    },
    {
      label: "Categoria definida",
      ok: article.category.trim().length > 0,
      hint: "A categoria diz que tipo de ajuda o artigo oferece.",
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
