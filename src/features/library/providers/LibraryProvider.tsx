"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { bulkTrashToast, trashToast } from "@/components/common/trashToast";
import { alive, trashed } from "@/models/Trash";
import { useSharedCollection } from "@/hooks/useSharedCollection";
import { fromArticle, toArticle } from "@/lib/supabase/rows";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { articleStatusLabel, type ArticleStatus, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { articleService } from "@/features/library/services/articleService";
import { discardDraft, draftChanges, draftFieldLabel, publishDraft } from "@/features/library/draft";
import { parseArticles } from "@/features/library/normalizeArticle";
import { STORAGE_KEYS } from "@/lib/storage";
import { concordar, contar } from "@/lib/plural";

const STORAGE_KEY = STORAGE_KEYS.articles;

interface LibraryContextValue {
  items: KnowledgeArticle[];
  /** O que está na lixeira, para a tela de recuperação. */
  deletedItems: KnowledgeArticle[];
  restoreItem: (id: string) => void;
  purgeItem: (id: string) => void;
  /** Falso até o conteúdo guardado ser lido, após a montagem. */
  isHydrated: boolean;
  totalItems: number;
  createItem: (data: LibraryFormData) => void;
  updateItem: (id: string, data: LibraryFormData) => void;
  changeStatus: (id: string, status: ArticleStatus) => void;
  /** A próxima versão, preparada sem tirar a atual do ar. */
  saveDraft: (id: string, draft: { title: string; summary: string; content: string }) => void;
  publishArticleDraft: (id: string) => void;
  discardArticleDraft: (id: string) => void;
  /** Ações em lote sobre a seleção da tabela. */
  changeStatusMany: (ids: string[], status: ArticleStatus) => void;
  assignMany: (ids: string[], author: string) => void;
  /** Aplica seção a muitos artigos numa passada, depois da revisão humana. */
  classifyMany: (atribuicoes: { id: string; sectionId: string }[]) => void;
  /** Exclusão em lote, com desfazer do mesmo tamanho. */
  deleteMany: (ids: string[]) => void;
  /** Grava o resultado de uma importação: novos e atualizados de uma vez. */
  importArticles: (create: KnowledgeArticle[], update: KnowledgeArticle[]) => void;
  deleteItem: (id: string) => void;
  createItemFromPlan: (plan: PlanWorkspaceItem) => { item: KnowledgeArticle; created: boolean };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { currentPerson } = usePeople();
  const { taxonomy } = useTaxonomy();
  const [allItems, setItems, isHydrated] = useSharedCollection<KnowledgeArticle>({
    key: STORAGE_KEY,
    table: "articles",
    fallback: articleService.getSeed(),
    fromRows: (rows) => rows.map(toArticle),
    toRow: fromArticle,
    identify: (article) => article.id,
    /*
      O acervo é a coleção que justifica isto: são 1.822 artigos e 22,7 MB, e
      sem a releitura incremental um colega classificando **um** deles fazia
      cada aba aberta da equipe baixar o acervo inteiro. `fromRows` aqui é um
      `map` linha a linha, que é o que a opção exige.
    */
    releituraIncremental: true,
    /*
      E a abertura lê o que já está no navegador antes de perguntar o que mudou.
      Sem isto, cada abertura do produto baixava os 22,7 MB de novo, e são
      catorze pessoas abrindo várias vezes por dia.
    */
    usaCache: true,
    // O vocabulário é capturado na montagem, que é quando a migração acontece.
    parseLocal: (raw) => parseArticles(raw, taxonomy),
  });

  /*
    A coleção guarda vivos e excluídos juntos; as telas só querem os vivos.
    Separar aqui, e não em cada tela, é o que impede um artigo na lixeira de
    reaparecer numa listagem, ou, pior, de contar como cobertura documental
    numa análise.
  */
  const items = useMemo(() => alive(allItems), [allItems]);
  const deletedItems = useMemo(() => trashed(allItems), [allItems]);

  const createItem = useCallback(
    (data: LibraryFormData) => {
      const newItem = articleService.create(data);
      setItems((previous) => [newItem, ...previous]);
      record({
        type: "article_created",
        projectId: newItem.projectId,
        /*
          Quem fez, e não quem responde.

          Era `currentPerson || newItem.author`, e o autor guarda identificador
          — inclusive de **equipe**, porque classificar um artigo preenche o
          autor a partir da categoria. A auditoria mostrou o resultado:
          "team-suporte-estruturas" listado como pessoa que criou artigos.

          São duas perguntas: quem executou a ação e quem responde pelo artigo.
          Sem sessão, a resposta certa é vazia, e a tela diz "não registrado" —
          afirmar que alguém fez algo que não fez é pior que não saber.
        */
        actor: currentPerson,
        subject: { kind: "article", id: newItem.id, label: newItem.title },
        detail: "Artigo criado como rascunho.",
      });
      toast.success("Artigo criado como rascunho.");
    },
    [currentPerson, record, setItems]
  );

  const updateItem = useCallback(
    (id: string, data: LibraryFormData) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      if (!articleService.canTransitionStatus(currentItem.status, data.status)) {
        toast.error(
          `Não é possível ir de "${articleStatusLabel[currentItem.status]}" para "${articleStatusLabel[data.status]}".`
        );
        return;
      }

      const updatedItem = articleService.update(currentItem, data);
      setItems((previous) =>
        previous.map((item) => (item.id === id ? updatedItem : item))
      );

      record({
        type: updatedItem.status === currentItem.status ? "article_updated" : "article_status_changed",
        projectId: updatedItem.projectId,
        /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
        subject: { kind: "article", id: updatedItem.id, label: updatedItem.title },
        detail: updatedItem.status === currentItem.status
          ? "Conteúdo ou classificação alterados."
          : articleStatusLabel[currentItem.status] + " → " + articleStatusLabel[updatedItem.status],
      });
      toast.success("Artigo atualizado.");
    },
    [currentPerson, items, record, setItems]
  );

  const changeStatus = useCallback(
    (id: string, status: ArticleStatus) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      if (!articleService.canTransitionStatus(currentItem.status, status)) {
        toast.error(
          `Não é possível ir de "${articleStatusLabel[currentItem.status]}" para "${articleStatusLabel[status]}".`
        );
        return;
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? articleService.changeStatus(item, status) : item
        )
      );

      record({
        type: "article_status_changed",
        projectId: currentItem.projectId,
        /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
        subject: { kind: "article", id: currentItem.id, label: currentItem.title },
        detail: articleStatusLabel[currentItem.status] + " → " + articleStatusLabel[status],
        // Chave e não rótulo: rótulo é apresentação e muda; chave é contrato.
        transition: { from: currentItem.status, to: status },
      });
      toast.success(`Artigo movido para "${articleStatusLabel[status]}".`);
    },
    [currentPerson, items, record, setItems]
  );

  const createItemFromPlan = useCallback(
    (plan: PlanWorkspaceItem) => {
      const existing = items.find((item) => item.source?.planId === plan.id);
      if (existing) return { item: existing, created: false };

      const newItem = articleService.createFromPlan(plan);
      setItems((previous) => [newItem, ...previous]);
      record({
        type: "article_created",
        projectId: newItem.projectId,
        /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
        subject: { kind: "article", id: newItem.id, label: newItem.title },
        detail: "Rascunho gerado a partir do plano de melhoria.",
      });
      toast.success("Rascunho criado a partir do plano de melhoria.");
      return { item: newItem, created: true };
    },
    [currentPerson, items, record, setItems]
  );


  /**
   * Mesma mudança de estágio, para muitos.
   *
   * Não é um laço sobre `changeStatus`: cada chamada dispararia um aviso, e
   * duzentos avisos empilhados escondem o que aconteceu em vez de contar. Aqui
   * a gravação é uma só e o aviso também, mas o histórico continua ganhando
   * um evento por artigo, porque cada um se moveu de fato.
   *
   * O que não pode fazer a transição fica de fora e aparece na ressalva. Parar
   * tudo por causa de um seria pior; aplicar em silêncio, também.
   */
  const changeStatusMany = useCallback(
    (ids: string[], status: ArticleStatus) => {
      const alvos = items.filter((item) => ids.includes(item.id));
      const podem = alvos.filter((item) => articleService.canTransitionStatus(item.status, status));

      if (podem.length === 0) {
        toast.error(
          `Nenhum dos selecionados pode ir para "${articleStatusLabel[status]}".`
        );
        return;
      }

      const permitidos = new Set(podem.map((item) => item.id));

      setItems((previous) =>
        previous.map((item) =>
          permitidos.has(item.id) ? articleService.changeStatus(item, status) : item
        )
      );

      for (const item of podem) {
        record({
          type: "article_status_changed",
          projectId: item.projectId,
          /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
          subject: { kind: "article", id: item.id, label: item.title },
          detail: articleStatusLabel[item.status] + " → " + articleStatusLabel[status],
          transition: { from: item.status, to: status },
        });
      }

      const fora = alvos.length - podem.length;

      toast.success(
        `${contar(podem.length, "artigo")} ${concordar(podem.length, "movido")} para "${articleStatusLabel[status]}".`,
        fora > 0
          ? {
              description: `${fora} ficou(ram) de fora: o estágio atual não permite essa transição.`,
            }
          : undefined
      );
    },
    [currentPerson, items, record, setItems]
  );

  /** Mesma atribuição, para muitos. */
  const assignMany = useCallback(
    (ids: string[], author: string) => {
      const alvos = new Set(ids);

      setItems((previous) =>
        previous.map((item) =>
          alvos.has(item.id) ? { ...item, author, updatedAt: new Date() } : item
        )
      );

      toast.success(`${contar(ids.length, "artigo")} ${concordar(ids.length, "reatribuído")}.`);
    },
    [setItems]
  );

  /**
   * Classifica muitos artigos de uma vez.
   *
   * Aplicar as sugestões com `updateItem` num laço custaria um aviso e uma
   * gravação por artigo. Com seiscentos, são seiscentos avisos empilhados e
   * seiscentas idas ao servidor. E, pior, o histórico ficaria com seiscentas
   * linhas iguais enterrando tudo que aconteceu antes.
   *
   * Um evento, um aviso, uma escrita, como a importação.
   */
  const classifyMany = useCallback(
    (atribuicoes: { id: string; sectionId: string }[]) => {
      if (atribuicoes.length === 0) return;

      const porId = new Map(atribuicoes.map((item) => [item.id, item.sectionId]));
      const at = new Date();

      setItems((previous) =>
        previous.map((item) => {
          const sectionId = porId.get(item.id);
          return sectionId === undefined ? item : { ...item, sectionId, updatedAt: at };
        })
      );

      const primeiro = items.find((item) => porId.has(item.id));

      record({
        type: "article_updated",
        projectId: primeiro?.projectId ?? "",
        actor: currentPerson,
        subject: {
          kind: "article",
          id: "classificacao",
          label: `Classificação de ${atribuicoes.length} artigos`,
        },
        detail: "Seção aplicada a partir de sugestão revisada.",
      });

      toast.success(`${contar(atribuicoes.length, "artigo")} ${concordar(atribuicoes.length, "classificado")}.`);
    },
    [currentPerson, items, record, setItems]
  );

  /**
   * Grava uma importação inteira numa passada só.
   *
   * Numa passada porque cada gravação da coleção compartilhada é uma ida ao
   * servidor: mil e oitocentos artigos em mil e oitocentas chamadas levaria
   * minutos e deixaria o acervo pela metade se qualquer uma falhasse.
   *
   * O histórico recebe **um** evento, e não um por artigo. Mil e oitocentas
   * linhas iguais não são registro do que aconteceu: são ruído que enterra
   * tudo que aconteceu antes.
   */
  const importArticles = useCallback(
    (create: KnowledgeArticle[], update: KnowledgeArticle[]) => {
      if (create.length === 0 && update.length === 0) return;

      const porId = new Map(update.map((item) => [item.id, item]));

      setItems((previous) => [
        ...previous.map((item) => porId.get(item.id) ?? item),
        ...create,
      ]);

      const partes = [
        create.length > 0 ? `${contar(create.length, "novo")}` : "",
        update.length > 0 ? `${contar(update.length, "atualizado")}` : "",
      ].filter(Boolean);

      record({
        type: "article_created",
        projectId: (create[0] ?? update[0]).projectId,
        actor: currentPerson,
        subject: {
          kind: "article",
          id: "import",
          label: `Importação de ${create.length + update.length} artigos`,
        },
        detail: partes.join(", "),
      });

      toast.success(`Importação concluída: ${partes.join(", ")}.`);
    },
    [currentPerson, record, setItems]
  );

  /**
   * Guarda a próxima versão sem tirar a atual do ar.
   *
   * Editar um publicado exigia recolhê-lo para revisão, e enquanto isso a
   * análise deixava de contá-lo como cobertura documental: corrigir uma
   * vírgula fazia uma seção do portal parecer descoberta.
   */
  const saveDraft = useCallback(
    (id: string, draft: { title: string; summary: string; content: string }) => {
      setItems((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                draft: { ...draft, updatedAt: new Date().toISOString(), author: currentPerson },
              }
            : item
        )
      );
    },
    [currentPerson, setItems]
  );

  const publishArticleDraft = useCallback(
    (id: string) => {
      const article = items.find((item) => item.id === id);
      if (!article?.draft) return;

      const mudou = draftChanges(article);

      setItems((previous) =>
        previous.map((item) => (item.id === id ? publishDraft(item, new Date()) : item))
      );

      record({
        type: "article_updated",
        projectId: article.projectId,
        /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
        subject: { kind: "article", id: article.id, label: article.title },
        detail: `Nova versão publicada: ${mudou.length > 0 ? mudou.map((campo) => draftFieldLabel[campo]).join(", ") : "sem alteração"}`,
      });

      toast.success("Nova versão publicada.");
    },
    [currentPerson, items, record, setItems]
  );

  const discardArticleDraft = useCallback(
    (id: string) => {
      setItems((previous) => previous.map((item) => (item.id === id ? discardDraft(item) : item)));

      toast.success("Rascunho descartado. A versão publicada continua como está.");
    },
    [setItems]
  );

  const restoreItem = useCallback(
    (id: string) => {
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, deletedAt: "" } : item))
      );
    },
    [setItems]
  );

  /** Sai do banco de vez. Só a lixeira chama, e ela avisa antes. */
  const purgeItem = useCallback(
    (id: string) => {
      setItems((previous) => previous.filter((item) => item.id !== id));
    },
    [setItems]
  );

  /** Excluir manda para a lixeira: quem apaga apaga para a equipe inteira. */
  const deleteItem = useCallback(
    (id: string) => {
      const article = items.find((item) => item.id === id);
      if (!article) return;

      const at = new Date().toISOString();
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, deletedAt: at } : item))
      );

      /*
        A exclusão também é fato do ciclo. Ela não era registrada, e o
        histórico de um artigo terminava no último "atualizado", sem dizer que
        ele saiu de vista, nem por quem.
      */
      record({
        type: "article_deleted",
        projectId: article.projectId,
        /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
        subject: { kind: "article", id: article.id, label: article.title },
        detail: "Movido para a lixeira.",
      });

      trashToast({
        label: "Artigo",
        subject: article.title,
        onUndo: () => restoreItem(id),
      });
    },
    [currentPerson, items, record, restoreItem, setItems]
  );

  /**
   * Exclusão em lote, com o desfazer do mesmo tamanho.
   *
   * Ela ficou de fora até agora justamente por isso: sem um desfazer em lote,
   * um clique que manda duzentos artigos para a lixeira só teria volta registro
   * a registro.
   *
   * O desfazer devolve **os que foram levados agora**, e não tudo que está na
   * lixeira. Restaurar por engano o que alguém excluiu ontem seria o desfazer
   * criando o problema que veio consertar.
   */
  const deleteMany = useCallback(
    (ids: string[]) => {
      const alvos = items.filter((item) => ids.includes(item.id));
      if (alvos.length === 0) return;

      const levados = new Set(alvos.map((item) => item.id));
      const at = new Date().toISOString();

      setItems((previous) =>
        previous.map((item) => (levados.has(item.id) ? { ...item, deletedAt: at } : item))
      );

      for (const item of alvos) {
        record({
          type: "article_deleted",
          projectId: item.projectId,
          /* Quem fez, e não quem responde. Ver o comentário em `createItem`. */
        actor: currentPerson,
          subject: { kind: "article", id: item.id, label: item.title },
          detail: "Movido para a lixeira em lote.",
        });
      }

      bulkTrashToast({
        count: alvos.length,
        label: "artigo",
        onUndo: () =>
          setItems((previous) =>
            previous.map((item) =>
              levados.has(item.id) ? { ...item, deletedAt: undefined } : item
            )
          ),
      });
    },
    [currentPerson, items, record, setItems]
  );

  const value = useMemo(
    () => ({
      items,
      deletedItems,
      restoreItem,
      purgeItem,
      totalItems: items.length,
      isHydrated,
      createItem,
      updateItem,
      changeStatus,
      saveDraft,
      publishArticleDraft,
      discardArticleDraft,
      changeStatusMany,
      assignMany,
      classifyMany,
      importArticles,
      deleteItem,
      deleteMany,
      createItemFromPlan,
    }),
    [assignMany, changeStatus, classifyMany, changeStatusMany, discardArticleDraft, publishArticleDraft, saveDraft, createItem, createItemFromPlan, deleteItem, deleteMany, deletedItems, importArticles, isHydrated, items, purgeItem, restoreItem, updateItem]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary deve ser utilizado dentro de LibraryProvider.");
  return context;
}
