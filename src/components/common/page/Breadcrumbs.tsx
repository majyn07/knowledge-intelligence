"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { buildTrail } from "@/components/layout/navigation";

interface BreadcrumbsProps {
  /**
   * Nome do registro aberto, quando a página mostra um.
   *
   * Sem ele, o identificador da rota não vira degrau: `uuid` na trilha é pior
   * que trilha curta.
   */
  leaf?: string;
}

/**
 * Onde a pessoa está, e como voltar.
 *
 * O menu lateral diz para onde se pode ir; a trilha diz de onde se veio. São
 * perguntas diferentes, e a segunda ficava sem resposta nas telas de detalhe.
 * Abrir um artigo pela busca deixava a pessoa sem caminho de volta para a
 * Biblioteca que não fosse o botão do navegador.
 */
export function Breadcrumbs({ leaf }: BreadcrumbsProps) {
  const pathname = usePathname();
  const trail = buildTrail(pathname, leaf);

  // Um degrau só é a própria página: não há trilha a mostrar.
  if (trail.length < 2) return null;

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {trail.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            )}

            <li className="min-w-0">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground hover:underline hover:underline-offset-2"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="block max-w-[24rem] truncate font-medium text-foreground"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
