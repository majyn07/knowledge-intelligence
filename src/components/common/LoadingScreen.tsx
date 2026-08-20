import Image from "next/image";

/**
 * Espera de tela cheia.
 *
 * Existe porque `null` durante o carregamento produz uma página em branco, e
 * página em branco é indistinguível de aplicação quebrada — foi exatamente o
 * que aconteceu quando a leitura da sessão falhou sem tratamento. Enquanto
 * algo está sendo resolvido, a tela precisa dizer isso.
 */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6"
      role="status"
      aria-live="polite"
    >
      <Image
        src="/brand/altoqi-symbol.png"
        alt=""
        width={96}
        height={83}
        priority
        className="h-9 w-auto object-contain opacity-80 motion-safe:animate-pulse"
      />

      <p className="text-sm text-muted-foreground">{label}</p>
    </main>
  );
}
