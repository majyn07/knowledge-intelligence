import { ReactNode } from "react";

interface PageToolbarProps {
  start?: ReactNode;
  end?: ReactNode;
}

/**
 * A busca em cima, os filtros embaixo.
 *
 * Eram lado a lado, e isso quebrava em silêncio: o grupo de filtros entra na
 * linha com a largura de todo o seu conteúdo e só cede o que sobra, e a busca
 * (base zero) ficava com o resto. Medido a 1280 px, com os cinco estágios, as
 * categorias e o filtro do portal, o campo de busca da Biblioteca tinha
 * **48 px** — uma fresta onde não cabia nem o texto de ajuda. Empilhado, a busca
 * tem a largura que pediu e os filtros quebram linha quando precisam.
 */
export function PageToolbar({
  start,
  end,
}: PageToolbarProps) {
  if (!start && !end) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-y border-border/70 py-4">
      {start && <div className="flex min-w-0 items-center gap-3">{start}</div>}

      {end && <div className="flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}
