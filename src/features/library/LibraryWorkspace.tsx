"use client";

import { useEffect, useMemo, useState } from "react";

import { ArticleEditor } from "./components/ArticleEditor";
import { ArticleViewer } from "./components/ArticleViewer";
import { libraryService } from "./services/libraryService";

import { useApp } from "@/providers/AppProvider";

export function LibraryWorkspace() {
  const { currentProjectId } = useApp();

  const projectKnowledgeBases = useMemo(
    () =>
      libraryService.getKnowledgeBases(
        currentProjectId
      ),
    [currentProjectId]
  );

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] =
    useState(projectKnowledgeBases[0]?.id ?? "");

  const [selectedArticleId, setSelectedArticleId] =
    useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [isEditingArticle, setIsEditingArticle] =
    useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (projectKnowledgeBases.length > 0) {
      setSelectedKnowledgeBaseId(projectKnowledgeBases[0].id);
    } else {
      setSelectedKnowledgeBaseId("");
    }

    setSearchTerm("");
    setSelectedArticleId("");
    setIsEditingArticle(false);
  }, [projectKnowledgeBases]);

  const selectedKnowledgeBase = projectKnowledgeBases.find(
    (base) => base.id === selectedKnowledgeBaseId
  );

  const knowledgeBaseArticles = useMemo(() => {
    return libraryService
      .getArticles(selectedKnowledgeBaseId)
      .filter((article) =>
        article.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
  }, [
    selectedKnowledgeBaseId,
    searchTerm,
    refreshKey,
  ]);

  const selectedArticle =
    knowledgeBaseArticles.find(
      (article) =>
        article.id === selectedArticleId
    );

  if (projectKnowledgeBases.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Nenhuma Base de Conhecimento encontrada para o projeto selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          Base de Conhecimento
        </h1>

        <p className="mt-2 text-muted-foreground">
          Gerencie as Bases de Conhecimento utilizadas durante as análises.
        </p>
      </div>

      <div className="grid gap-4">
        {projectKnowledgeBases.map((base) => {
          const selected =
            base.id === selectedKnowledgeBaseId;

          return (
            <button
              key={base.id}
              onClick={() => {
                setSelectedKnowledgeBaseId(base.id);
                setSelectedArticleId("");
                setIsEditingArticle(false);
              }}
              className={`rounded-xl border p-6 text-left transition-colors ${
                selected
                  ? "border-primary bg-muted"
                  : "bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {base.solution}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {base.source}
                  </p>
                </div>

                <span className="rounded-md border px-3 py-1 text-xs">
                  {base.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">
                    Versão
                  </p>

                  <p className="font-medium">
                    {base.version}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Artigos
                  </p>

                  <p className="font-medium">
                    {base.articles}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Última importação
                  </p>

                  <p className="font-medium">
                    {base.importedAt}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedKnowledgeBase && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Artigos — {selectedKnowledgeBase.solution}
            </h2>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Buscar artigo..."
              className="w-72 rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          {knowledgeBaseArticles.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum artigo encontrado.
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3">
                {knowledgeBaseArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticleId(article.id);
                      setIsEditingArticle(false);
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedArticleId === article.id
                        ? "border-primary bg-muted"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <h3 className="font-medium">
                      {article.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {article.sourceUrl}
                    </p>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Última atualização:{" "}
                      {article.lastUpdated}
                    </p>
                  </button>
                ))}
              </div>

              {selectedArticle &&
                (isEditingArticle ? (
                  <ArticleEditor
                    article={selectedArticle}
                    onSave={(article) => {
                      libraryService.updateArticle(
                        article
                      );

                      setRefreshKey(
                        (value) => value + 1
                      );

                      setIsEditingArticle(false);
                    }}
                    onCancel={() =>
                      setIsEditingArticle(false)
                    }
                  />
                ) : (
                  <ArticleViewer
                    article={selectedArticle}
                    onEdit={() =>
                      setIsEditingArticle(true)
                    }
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}