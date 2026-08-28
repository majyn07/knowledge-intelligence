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

/** De cinco em cinco minutos: publicação não é evento de segundo. */
const INTERVALO = 5 * 60 * 1000;

type ReleaseValue = {
  /** Há uma versão publicada mais nova que a que esta aba carregou. */
  hasUpdate: boolean;
  /** Quantas edições abertas têm alteração não salva. */
  unsaved: number;
  /** Marca que existe trabalho pendente; a devolução libera a marca. */
  hold: () => () => void;
};

const ReleaseContext = createContext<ReleaseValue>({
  hasUpdate: false,
  unsaved: 0,
  hold: () => () => {},
});

export const useRelease = () => useContext(ReleaseContext);

/**
 * Avisa quando uma nova versão do produto foi publicada, sem interromper.
 *
 * Recarregar sozinho está fora de questão: quem está no meio de um artigo
 * perderia o texto, e o produto teria decidido por ela. O aviso aparece, e
 * atualizar é ato de alguém.
 *
 * O registro de trabalho pendente existe pelo mesmo motivo. Um formulário sujo
 * informa aqui que existe, e o aviso passa a dizer que há o que salvar antes.
 * Em vez de oferecer um botão que descarta o trabalho sem falar nisso. É a
 * mesma regra do `useUnsavedGuard`, um nível acima: quem fecha a aba inteira
 * merece a mesma pergunta de quem fecha o diálogo.
 *
 * A versão de referência é a **primeira que esta aba viu**, e não uma constante
 * embutida na compilação: assim o aviso funciona sem depender de a plataforma
 * expor o identificador do deploy para o navegador.
 */
export function ReleaseProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Aba escondida não olha: quem não está vendo não precisa ser avisado, e
      // catorze abas esquecidas somariam consultas sem ninguém para ler.
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;

        const body: unknown = await response.json();
        const version =
          typeof body === "object" && body !== null && "version" in body
            ? String((body as { version: unknown }).version)
            : "";

        if (cancelled || version === "") return;

        setLoaded((first) => first ?? version);
        setCurrent(version);
      } catch {
        /*
          Rede fora, servidor reiniciando, aba em segundo plano: nada disso é
          erro para quem está usando o produto. Falhar em silêncio aqui só
          significa perguntar de novo daqui a pouco.
        */
      }
    }

    void check();

    const timer = window.setInterval(check, INTERVALO);
    document.addEventListener("visibilitychange", check);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  /*
    Fechar ou recarregar a aba com edição aberta passa pela pergunta do próprio
    navegador. É a única barreira que existe para o caminho que não passa pela
    nossa interface. Atalho de teclado, botão de recarregar, fechar a janela.
  */
  useEffect(() => {
    if (unsaved === 0) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const hold = useCallback(() => {
    setUnsaved((count) => count + 1);

    let released = false;

    return () => {
      if (released) return;
      released = true;
      setUnsaved((count) => Math.max(0, count - 1));
    };
  }, []);

  const value = useMemo(
    () => ({
      hasUpdate: loaded !== null && current !== null && loaded !== current,
      unsaved,
      hold,
    }),
    [loaded, current, unsaved, hold]
  );

  return <ReleaseContext.Provider value={value}>{children}</ReleaseContext.Provider>;
}

/**
 * Declara que existe trabalho não salvo enquanto `isDirty` for verdadeiro.
 *
 * Usado pelo `useUnsavedGuard`, para o aviso de nova versão saber que há o que
 * salvar antes de recarregar.
 */
export function useUnsavedWork(isDirty: boolean) {
  const { hold } = useRelease();

  useEffect(() => {
    if (!isDirty) return;

    return hold();
  }, [isDirty, hold]);
}
