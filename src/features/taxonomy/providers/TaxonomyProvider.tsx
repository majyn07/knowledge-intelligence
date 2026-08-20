"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { usePersistedState } from "@/hooks/usePersistedState";
import type { Taxonomy } from "@/models/Taxonomy";

import { buildPortalTaxonomy } from "../mock/portalTaxonomy";
import { parseTaxonomy } from "../normalizeTaxonomy";
import {
  addCategory,
  addEntry,
  addSection,
  type EntryList,
  removeCategory,
  removeEntry,
  removeSection,
  renameCategory,
  renameEntry,
  renameSection,
} from "../taxonomyService";

const STORAGE_KEY = "visus-taxonomy";

interface TaxonomyContextValue {
  taxonomy: Taxonomy;
  isHydrated: boolean;

  createCategory: (name: string, isProduct: boolean) => void;
  editCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  createSection: (categoryId: string, name: string) => void;
  editSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;

  createEntry: (list: EntryList, name: string) => void;
  editEntry: (list: EntryList, id: string, name: string) => void;
  deleteEntry: (list: EntryList, id: string) => void;

  /** Devolve o cadastro à estrutura do portal como levantada. */
  resetToPortal: () => void;
}

const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

/**
 * Cadastro da taxonomia.
 *
 * A semente é a estrutura do portal, mas nada aqui é fixo: categoria, seção,
 * gênero e tipo de oportunidade são criados, renomeados e removidos por quem
 * usa. Os filtros e os formulários leem daqui, então o que muda no cadastro
 * aparece e some sozinho nas telas.
 */
export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [taxonomy, setTaxonomy, isHydrated] = usePersistedState<Taxonomy>({
    key: STORAGE_KEY,
    fallback: buildPortalTaxonomy(),
    parse: parseTaxonomy,
  });

  /**
   * As operações são puras e devolvem a taxonomia inalterada quando recusam —
   * nome vazio, repetido, último item da lista. Comparar a referência é o que
   * permite avisar sem duplicar a regra aqui dentro.
   */
  const apply = useCallback(
    (operation: (current: Taxonomy) => Taxonomy, rejection: string) => {
      setTaxonomy((current) => {
        const next = operation(current);

        if (next === current) {
          toast.error(rejection);
          return current;
        }

        return next;
      });
    },
    [setTaxonomy]
  );

  const createCategory = useCallback(
    (name: string, isProduct: boolean) =>
      apply(
        (current) => addCategory(current, name, isProduct),
        "Categoria não criada: o nome está vazio ou já existe."
      ),
    [apply]
  );

  const editCategory = useCallback(
    (id: string, name: string) =>
      apply(
        (current) => renameCategory(current, id, name),
        "O nome da categoria não pode ficar vazio."
      ),
    [apply]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setTaxonomy((current) => {
        const category = current.categories.find((item) => item.id === id);
        const next = removeCategory(current, id);

        if (category) {
          toast.success(
            `Categoria "${category.name}" removida. Artigos que apontavam para as seções dela aparecem em "Sem seção".`
          );
        }

        return next;
      });
    },
    [setTaxonomy]
  );

  const createSection = useCallback(
    (categoryId: string, name: string) =>
      apply(
        (current) => addSection(current, categoryId, name),
        "Seção não criada: o nome está vazio ou já existe nesta categoria."
      ),
    [apply]
  );

  const editSection = useCallback(
    (id: string, name: string) =>
      apply(
        (current) => renameSection(current, id, name),
        "O nome da seção não pode ficar vazio."
      ),
    [apply]
  );

  const deleteSection = useCallback(
    (id: string) => setTaxonomy((current) => removeSection(current, id)),
    [setTaxonomy]
  );

  const createEntry = useCallback(
    (list: EntryList, name: string) =>
      apply(
        (current) => addEntry(current, list, name),
        "Não criado: o nome está vazio ou já existe na lista."
      ),
    [apply]
  );

  const editEntry = useCallback(
    (list: EntryList, id: string, name: string) =>
      apply(
        (current) => renameEntry(current, list, id, name),
        "O nome não pode ficar vazio."
      ),
    [apply]
  );

  const deleteEntry = useCallback(
    (list: EntryList, id: string) =>
      apply(
        (current) => removeEntry(current, list, id),
        "A lista precisa manter ao menos um item, senão o formulário fica sem opção."
      ),
    [apply]
  );

  const resetToPortal = useCallback(() => {
    setTaxonomy(buildPortalTaxonomy());
    toast.success("Cadastro devolvido à estrutura do portal.");
  }, [setTaxonomy]);

  const value = useMemo(
    () => ({
      taxonomy,
      isHydrated,
      createCategory,
      editCategory,
      deleteCategory,
      createSection,
      editSection,
      deleteSection,
      createEntry,
      editEntry,
      deleteEntry,
      resetToPortal,
    }),
    [
      createCategory,
      createEntry,
      createSection,
      deleteCategory,
      deleteEntry,
      deleteSection,
      editCategory,
      editEntry,
      editSection,
      isHydrated,
      resetToPortal,
      taxonomy,
    ]
  );

  return (
    <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  const context = useContext(TaxonomyContext);

  if (!context) {
    throw new Error("useTaxonomy deve ser utilizado dentro de TaxonomyProvider.");
  }

  return context;
}
