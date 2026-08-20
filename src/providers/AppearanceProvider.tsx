"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { readRaw, writeRaw } from "@/lib/storage";

export type Appearance = "light" | "dark" | "system";

const STORAGE_KEY = "visus-appearance";

/**
 * Script aplicado antes da primeira pintura.
 *
 * Sem ele a tela abre clara e escurece — o clarão que denuncia tema escuro mal
 * feito. Ele roda antes do React justamente por isso, e escreve num atributo
 * em vez de numa classe — mexer em `className` do `<html>` produziria
 * divergência de conteúdo, que é bem pior.
 *
 * A divergência de **atributo** continua existindo, e é por isso que o `<html>`
 * leva `suppressHydrationWarning`: o servidor não tem como saber a preferência
 * de quem vai abrir a página. É a única supressão do produto, e ela vale só
 * para os atributos deste elemento — nada dentro dele deixa de ser comparado.
 *
 * A preferência é lida com `try` porque modo privado e armazenamento bloqueado
 * não podem impedir a página de abrir.
 */
export const appearanceScript = `
(function () {
  try {
    var saved = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var dark = saved === "dark" ||
      ((!saved || saved === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.dataset.appearance = "dark";
  } catch (e) {}
})();
`.trim();

interface AppearanceContextValue {
  appearance: Appearance;
  /** O que está de fato aplicado agora — "system" já resolvido. */
  resolved: "light" | "dark";
  setAppearance: (next: Appearance) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function prefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(appearance: Appearance) {
  const dark = appearance === "dark" || (appearance === "system" && prefersDark());

  if (dark) {
    document.documentElement.dataset.appearance = "dark";
  } else {
    delete document.documentElement.dataset.appearance;
  }

  return dark ? "dark" : "light";
}

/**
 * Claro, escuro ou o que o sistema pedir.
 *
 * O tema escuro existia inteiro no CSS desde o começo e nunca teve como ser
 * alcançado: as variantes estavam escritas, e nada ligava o seletor. Este
 * provider é a única peça que faltava.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // A preferência guardada entra depois da montagem, como todo estado do
  // navegador. O script acima já cuidou de não haver clarão nesse intervalo.
  useEffect(() => {
    const saved = readRaw(STORAGE_KEY) as Appearance | null;
    const next = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";

    setState(next);
    setResolved(apply(next));
  }, []);

  // Seguir o sistema significa acompanhá-lo enquanto ele muda, e não só na carga.
  useEffect(() => {
    if (appearance !== "system" || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  const setAppearance = useCallback((next: Appearance) => {
    setState(next);
    setResolved(apply(next));
    writeRaw(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ appearance, resolved, setAppearance }),
    [appearance, resolved, setAppearance]
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error("useAppearance deve ser utilizado dentro de AppearanceProvider.");
  }

  return context;
}
