import { NextResponse, type NextRequest } from "next/server";

import { authLandingParams } from "@/app/auth/authLanding";

/**
 * Link de acesso que chegou na raiz é encaminhado para quem sabe abri-lo.
 *
 * O que decide vive em `authLanding.ts`, e não aqui: a regra é lógica e se
 * testa, o encaminhamento é plataforma e não se testa. Os dois formatos: o
 * `code` do PKCE e o `token_hash` do link que abre em qualquer navegador. São
 * resgatados, porque encaminhar um e esquecer o outro deixaria metade dos
 * links no silêncio que este arquivo existe para impedir.
 *
 * Encaminhar é seguro: `/auth/callback` valida contra a Supabase e responde
 * com motivo na URL quando não presta. Aqui não se decide nada sobre o
 * conteúdo, só para onde ele vai.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") return NextResponse.next();

  const params = authLandingParams(request.nextUrl.searchParams);

  if (!params) return NextResponse.next();

  const destino = new URL("/auth/callback", request.url);
  destino.search = params.toString();

  return NextResponse.redirect(destino);
}

export const config = {
  /*
    Só a raiz. Deixar isto ver toda requisição custaria uma passagem em cada
    arquivo estático para resolver um caso que só acontece em uma rota.
  */
  matcher: "/",
};
