import type { Article } from "@/models/Article";
import type { KnowledgeBase } from "@/models/KnowledgeBase";

import { articles } from "../mock/articles";
import { knowledgeBases } from "../mock/knowledgeBases";

export const libraryService = {
  getKnowledgeBases(
    projectId: string
  ): KnowledgeBase[] {
    return knowledgeBases.filter(
      (knowledgeBase) =>
        knowledgeBase.projectId === projectId
    );
  },

  getArticles(
    knowledgeBaseId: string
  ): Article[] {
    return articles.filter(
      (article) =>
        article.knowledgeBaseId ===
        knowledgeBaseId
    );
  },

  getArticle(
    articleId: string
  ): Article | undefined {
    return articles.find(
      (article) => article.id === articleId
    );
  },

  updateArticle(article: Article): Article {
    const index = articles.findIndex(
      (currentArticle) =>
        currentArticle.id === article.id
    );

    if (index === -1) {
      throw new Error("Artigo não encontrado.");
    }

    articles[index] = article;

    return article;
  },

  createArticle(article: Article): Article {
    articles.push(article);

    return article;
  },

  deleteArticle(articleId: string): void {
    const index = articles.findIndex(
      (article) => article.id === articleId
    );

    if (index === -1) {
      return;
    }

    articles.splice(index, 1);
  },
};