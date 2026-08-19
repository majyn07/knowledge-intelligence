import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Servidor e primeiro render do cliente assumem sempre desktop, para que o
 * HTML coincida. A largura real é medida logo após a montagem — ler
 * `window.innerWidth` no inicializador causava divergência de hidratação,
 * porque o Sidebar troca de árvore entre os dois modos.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );

    setIsMobile(mql.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
