import { Skeleton } from "@/components/ui/skeleton";

/**
 * Espera com a forma do que vem.
 *
 * Enquanto o conteúdo guardado não é lido, a tela mostra a semente, e a
 * semente tem cara de dado real. Quem abre a Biblioteca vê artigos que não são
 * dela e, um instante depois, vê a lista trocar. Piscar conteúdo falso é pior
 * que dizer "ainda não sei": o esqueleto diz.
 *
 * Vale a regra de hidratação sem exceção: servidor e primeiro render do
 * cliente produzem o esqueleto, porque `isHydrated` é falso nos dois. O
 * conteúdo entra depois da montagem, como todo valor que só o navegador
 * conhece.
 */

/** Cartões em grade, Projetos, painéis, cartões de indicador. */
export function CardsSkeleton({ count = 6, columns = "sm:grid-cols-2 xl:grid-cols-3" }) {
  return (
    <div className={`grid gap-4 ${columns}`} role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border/70 bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Linhas empilhadas, Biblioteca, Planos, Atendimentos. */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />

          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>

          <Skeleton className="hidden h-6 w-20 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Números lado a lado: a faixa de indicadores. */
export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      role="status"
      aria-label="Carregando"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border/70 bg-card p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Eventos em coluna: o histórico. */
export function TimelineSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Carregando">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />

          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
