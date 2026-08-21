import { NextResponse, type NextRequest } from "next/server";

/**
 * Código de acesso que chegou na raiz é encaminhado para quem sabe trocá-lo.
 *
 * A Supabase manda o link do e-mail para o destino pedido pelo produto — mas
 * só quando esse destino está na lista de permitidos. Fora disso ela usa a
 * `site_url`, e o código cai em `/`, onde nada acontecia: a pessoa via a tela
 * de acesso de novo, sem uma linha explicando por quê.
 *
 * Isso não é hipótese. Todo link já enviado carrega o destino que valia na
 * hora do envio, então e-mail antigo continua caindo aqui mesmo com a
 * configuração corrigida — e uma configuração futura errada faria o mesmo.
 *
 * Encaminhar é seguro: `/auth/callback` valida o código contra a Supabase e
 * responde com motivo na URL quando ele não presta. Aqui não se decide nada
 * sobre o código, só para onde ele vai.
 */
export function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (request.nextUrl.pathname !== "/" || !code) return NextResponse.next();

  const destino = new URL("/auth/callback", request.url);
  destino.searchParams.set("code", code);

  return NextResponse.redirect(destino);
}

export const config = {
  /*
    Só a raiz. Deixar isto ver toda requisição custaria uma passagem em cada
    arquivo estático para resolver um caso que só acontece em uma rota.
  */
  matcher: "/",
};
