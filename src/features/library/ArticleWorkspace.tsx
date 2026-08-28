"use client";

import { useMemo, useState } from "react";
import { projectLabel } from "@/features/projects/projectLabel";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileSearch, Link2, Sparkles } from "lucide-react";

import { ActivityTimeline } from "@/features/activities/components/ActivityTimeline";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { ArticleAssistant } from "./components/ArticleAssistant";
import { ArticleReader } from "./components/ArticleReader";
import { PageHeader } from "@/components/common/page/PageHeader";
import { FollowButton } from "@/features/people/components/FollowButton";
import { PageSection } from "@/components/common/page/PageSection";
import { PropertyGrid } from "@/components/common/data/PropertyGrid";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  allowedArticleTransitions,
  articleStatusLabel,
  type ArticleStatus,
} from "@/models/KnowledgeArticle";
import { findCategory, findSection } from "@/models/Taxonomy";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { useAssigneeName } from "@/features/people/components/AssigneeName";
import { useProject } from "@/providers/ProjectProvider";
import { useStaleRecordWarning } from "@/hooks/useStaleRecordWarning";

import { PublishConfirmDialog } from "@/components/common/PublishConfirmDialog";

import { ArticleTableOfContents } from "./components/ArticleTableOfContents";
import { LibraryDialog } from "./components/LibraryDialog";
import { LibraryForm } from "./components/LibraryForm";
import { DraftPanel } from "./components/DraftPanel";
import { EditingNotice } from "./components/EditingNotice";
import { acceptsDraft, editableContent } from "./draft";
import { useEditingPresence } from "./useEditingPresence";
import { RelatedArticles } from "./components/RelatedArticles";
import { findSimilarArticles } from "./search/findSimilarArticles";
import { articlePublishChecks } from "./publishChecks";
import { useLibrary } from "./providers/LibraryProvider";
import { articleService } from "./services/articleService";
import type { LibraryFormData } from "./types/LibraryFormData";

interface ArticleWorkspaceProps {
  articleId: string;
}

const statusVariant: Record<ArticleStatus, "default" | "warning" | "success"> = {
  draft: "default",
  review: "warning",
  published: "success",
  archived: "default",
};

export function ArticleWorkspace({ articleId }: ArticleWorkspaceProps) {
  const {
    items,
    updateItem,
    changeStatus,
    saveDraft,
    publishArticleDraft,
    discardArticleDraft,
  } = useLibrary();
  const { eventsFor } = useActivity();
  const { projects } = useProject();
  const { taxonomy } = useTaxonomy();
  const assigneeName = useAssigneeName();
  const [isEditing, setIsEditing] = useState(false);
  const editors = useEditingPresence(articleId);
  const [isPublishing, setIsPublishing] = useState(false);

  const article = items.find((item) => item.id === articleId);

  /*
    Com o trabalho compartilhado, duas pessoas podem abrir o mesmo artigo. A
    decisão foi avisar e deixar decidir, em vez de sobrescrever em silêncio.
  */
  const { isStale, acceptRemote } = useStaleRecordWarning(article, isEditing);

  const related = useMemo(
    () =>
      article
        ? findSimilarArticles({
            articles: items,
            text: `${article.title} ${article.summary} ${article.keywords.join(" ")}`,
            excludeId: article.id,
          })
        : [],
    [article, items]
  );

  if (!article) {
    return (
      <div className="w-full space-y-7">
        <Button variant="ghost" size="sm" render={<Link href="/library" />} nativeButton={false}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Toda a Biblioteca
        </Button>

        <BrandEmptyState
          title="Artigo não encontrado"
          description="Este conteúdo pode ter sido excluído. Volte para a Biblioteca e selecione outro."
        />
      </div>
    );
  }

  const projectName =
    projectLabel(projects, article.projectId);
  const transitions = allowedArticleTransitions[article.status];

  /*
    Classificação resolvida contra o cadastro. Quando a seção não existe mais
    — categoria removida, ou artigo migrado sem correspondência — o resultado
    é vazio, e a tela diz "não definida" em vez de mostrar um id solto.
  */
  const section = findSection(taxonomy, article.sectionId);
  const categoryName = section ? findCategory(taxonomy, section.categoryId)?.name ?? "" : "";
  const genreName = taxonomy.genres.find((entry) => entry.id === article.genreId)?.name ?? "";
  const history = eventsFor("article", article.id);

  /**
   * Salvar um artigo publicado prepara a próxima versão, sem tirar a atual do ar.
   *
   * A classificação vale na hora: seção, gênero, responsável e estágio são
   * atributos do **artigo**, não do texto, e segurá-los junto do rascunho
   * criaria duas respostas para "em que seção isto está".
   */
  function handleSubmit(data: LibraryFormData) {
    const alvo = article!;

    if (acceptsDraft(alvo)) {
      updateItem(alvo.id, {
        ...data,
        title: alvo.title,
        summary: alvo.summary,
        content: alvo.content,
      });

      saveDraft(alvo.id, {
        title: data.title,
        summary: data.summary,
        content: data.content,
      });
    } else {
      updateItem(alvo.id, data);
    }

    setIsEditing(false);
  }

  return (
    <div className="w-full space-y-8">
      <PageHeader
        overline={`Base de Conhecimento · ${genreName || "Sem gênero"}`}
        title={article.title}
        trailLeaf={article.title}
        description={article.summary || "Sem resumo registrado."}
        actions={
          <div className="flex flex-wrap gap-2">
            <FollowButton
              kind="article"
              subjectId={article.id}
              subjectLabel={article.title}
              projectId={article.projectId}
            />

            {transitions.map((status) =>
              status === "published" ? (
                <Button key={status} onClick={() => setIsPublishing(true)}>
                  Publicar artigo
                </Button>
              ) : (
                <Button
                  key={status}
                  variant="outline"
                  onClick={() => changeStatus(article.id, status)}
                >
                  Mover para {articleStatusLabel[status].toLowerCase()}
                </Button>
              )
            )}

            <Button onClick={() => setIsEditing(true)}>Editar artigo</Button>
          </div>
        }
      />

      <DraftPanel
        article={article}
        onPublish={() => publishArticleDraft(article.id)}
        onDiscard={() => discardArticleDraft(article.id)}
        onEdit={() => setIsEditing(true)}
      />

      <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusVariant[article.status]}>
            {articleStatusLabel[article.status]}
          </StatusBadge>

          {article.status === "published" ? (
            <span className="text-xs text-muted-foreground">
              Publicado: a análise considera este artigo ao avaliar a cobertura documental.
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Ainda não publicado: a análise não considera este conteúdo como cobertura.
            </span>
          )}
        </div>

        <PropertyGrid
          className="mt-6"
          columns={4}
          items={[
            { label: "Projeto", value: projectName },
            { label: "Categoria", value: categoryName || "Não definida" },
            { label: "Seção", value: section?.name || "Não definida" },
            { label: "Gênero", value: genreName || "Não definido" },
            { label: "Autor", value: assigneeName(article.author, "Não definido") },
            { label: "Criado em", value: article.createdAt.toLocaleDateString("pt-BR") },
            { label: "Atualizado em", value: article.updatedAt.toLocaleDateString("pt-BR") },
          ]}
        />

        {(article.tags.length > 0 || article.keywords.length > 0) && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs">
                #{tag}
              </span>
            ))}
            {article.keywords.map((keyword) => (
              <span key={keyword} className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                {keyword}
              </span>
            ))}
          </div>
        )}

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir versão publicada
          </a>
        )}
      </section>

      <PageSection title="Conteúdo" description="Como o artigo será lido por quem procura ajuda.">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.28fr)]">
          {/*
            O leitor carrega o acervo inteiro para resolver as citações entre
            artigos: o texto do portal aponta para outros artigos do portal, e
            quando já os temos aqui o link leva para dentro em vez de jogar
            quem lê para fora.
          */}
          <ArticleReader article={article} acervo={items} />

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ArticleTableOfContents content={article.content} format={article.contentFormat} />

            {/*
              A IA fica ao lado do texto, e não numa tela à parte: a pergunta
              nasce enquanto se lê, e mandar alguém para outro lugar para
              perguntar é o mesmo que não oferecer.
            */}
            <ArticleAssistant article={article} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Histórico do artigo" description="Cada mudança de conteúdo e de estágio, na ordem em que aconteceu.">
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada desde que o histórico passou a ser guardado.</p>
        ) : (
          <ActivityTimeline events={history} hideSubject />
        )}
      </PageSection>

      <RelatedArticles results={related} />

      {article.source && (
        <PageSection
          title="Origem no ciclo de conhecimento"
          description="Este conteúdo nasceu de uma decisão registrada, e o caminho até ela está preservado."
        >
          <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Atendimento #{article.source.ticketId}
              </li>
              <li aria-hidden className="text-muted-foreground">→</li>
              <li className="text-muted-foreground">Análise</li>
              <li aria-hidden className="text-muted-foreground">→</li>
              <li className="text-muted-foreground">Oportunidade aprovada</li>
              <li aria-hidden className="text-muted-foreground">→</li>
              <li className="font-medium">Plano de melhoria</li>
            </ol>

            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" render={<Link href="/analysis" />} nativeButton={false}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Análise
              </Button>

              <Button size="sm" variant="outline" render={<Link href="/improvement-plan" />} nativeButton={false}>
                <FileSearch className="mr-1.5 h-3.5 w-3.5" />
                Plano
              </Button>
            </div>
          </div>
        </PageSection>
      )}

      <PublishConfirmDialog
        open={isPublishing}
        title="Publicar na Base de Conhecimento"
        subject={article.title}
        consequence="A partir daí o artigo passa a contar como cobertura documental: a análise vai considerá-lo ao avaliar se um atendimento já está documentado."
        checks={articlePublishChecks(article)}
        confirmLabel="Publicar artigo"
        onCancel={() => setIsPublishing(false)}
        onConfirm={() => {
          changeStatus(article.id, "published");
          setIsPublishing(false);
        }}
      />

      <LibraryDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        title="Editar artigo"
        description="Atualize o conteúdo, a classificação e o estágio editorial."
      >
        <EditingNotice editors={editors} />

        {isStale && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-[var(--ring)] bg-accent p-4 text-sm"
          >
            <p className="font-semibold">Este artigo mudou no servidor.</p>

            <p className="mt-1 text-muted-foreground">
              Alguém salvou uma versão enquanto você edita. Se continuar e
              salvar, o trabalho dessa pessoa será substituído pelo seu.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Recarregar e perder o que digitei
              </Button>

              <Button size="sm" variant="ghost" onClick={acceptRemote}>
                Continuar assim mesmo
              </Button>
            </div>
          </div>
        )}

        <LibraryForm
          key={article.id + (article.draft ? "-rascunho" : "")}
          projects={projects.map((project) => ({ id: project.id, name: project.name }))}
          articles={items}
          editingId={article.id}
          initialData={{ ...articleService.toFormData(article), ...editableContent(article) }}
          submitLabel="Atualizar"
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </LibraryDialog>
    </div>
  );
}
