"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { toast } from "sonner";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { STORAGE_KEYS } from "@/lib/storage";

import { defaultPanels } from "./defaultPanels";
import { fromPanel, parsePanels, toPanel } from "./normalizePanel";
import { reconcileSpec, type PanelSpec } from "./panelSpec";

interface PanelsContextValue {
  panels: PanelSpec[];
  isHydrated: boolean;

  savePanel: (spec: PanelSpec) => void;
  removePanel: (id: string) => void;
  movePanel: (id: string, direction: -1 | 1) => void;
  restoreDefaults: () => void;
}

const PanelsContext = createContext<PanelsContextValue | null>(null);

/**
 * Os painéis da equipe.
 *
 * Compartilhados, como o resto do produto: não há papéis, e inventar "meu
 * painel" criaria uma noção de dono que nada mais aqui tem. Quem monta um
 * painel na reunião monta para todo mundo, e com a aba aberta, aparece sem
 * recarregar.
 */
export function PanelsProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels, isHydrated] = useSharedCollection<PanelSpec>({
    key: STORAGE_KEYS.panels,
    table: "dashboard_panels",
    fallback: defaultPanels,
    parseLocal: parsePanels,
    fromRows: (rows) => rows.map(toPanel).sort((a, b) => a.order - b.order),
    toRow: fromPanel,
    identify: (panel) => panel.id,
  });

  const savePanel = useCallback(
    (spec: PanelSpec) => {
      // Reconcilia na gravação também: a tela pode ter sido fechada no meio de
      // uma combinação que a origem não responde.
      const corrigido = reconcileSpec(spec);

      setPanels((current) => {
        const existe = current.some((panel) => panel.id === corrigido.id);

        return existe
          ? current.map((panel) => (panel.id === corrigido.id ? corrigido : panel))
          : [...current, { ...corrigido, order: current.length }];
      });
    },
    [setPanels]
  );

  const removePanel = useCallback(
    (id: string) => {
      setPanels((current) =>
        current
          .filter((panel) => panel.id !== id)
          .map((panel, index) => ({ ...panel, order: index }))
      );
    },
    [setPanels]
  );

  const movePanel = useCallback(
    (id: string, direction: -1 | 1) => {
      setPanels((current) => {
        const ordenados = [...current].sort((a, b) => a.order - b.order);
        const from = ordenados.findIndex((panel) => panel.id === id);

        const to = from + direction;
        if (from < 0 || to < 0 || to >= ordenados.length) return current;

        const [movido] = ordenados.splice(from, 1);
        ordenados.splice(to, 0, movido);

        /*
          Reordenar reescreve todos: `order` é posição, não identidade, e
          gravar só os dois trocados deixaria buracos que a próxima leitura
          resolveria de forma arbitrária.
        */
        return ordenados.map((panel, index) => ({ ...panel, order: index }));
      });
    },
    [setPanels]
  );

  const restoreDefaults = useCallback(() => {
    setPanels((current) => {
      const padrão = new Map(defaultPanels.map((panel) => [panel.id, panel]));

      // Os painéis criados pela equipe continuam; só os padrão voltam ao que eram.
      const próprios = current.filter((panel) => !padrão.has(panel.id));

      return [...defaultPanels, ...próprios].map((panel, index) => ({ ...panel, order: index }));
    });

    toast.success("Painéis padrão restaurados. Os que a equipe criou continuam onde estavam.");
  }, [setPanels]);

  const value = useMemo(
    () => ({
      panels: [...panels].sort((a, b) => a.order - b.order),
      isHydrated,
      savePanel,
      removePanel,
      movePanel,
      restoreDefaults,
    }),
    [isHydrated, movePanel, panels, removePanel, restoreDefaults, savePanel]
  );

  return <PanelsContext.Provider value={value}>{children}</PanelsContext.Provider>;
}

export function usePanels() {
  const context = useContext(PanelsContext);
  if (!context) throw new Error("usePanels deve ser utilizado dentro de PanelsProvider.");
  return context;
}
