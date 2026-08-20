import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Destino do link enviado por e-mail: troca o código por sessão e devolve a
 * pessoa ao produto.
 *
 * Falha vira redirecionamento com motivo na URL, nunca página de erro crua —
 * quem clicou num link expirado precisa entender o que aconteceu e ter para
 * onde ir.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/?acesso=sem-servidor`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?acesso=link-invalido`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?acesso=link-expirado`);
  }

  return NextResponse.redirect(origin);
}
