import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sufixo do cookie que o cliente do navegador grava ao pedir o link.
 *
 * O PKCE guarda um verificador de um lado e manda o código pelo outro. Se o
 * e-mail abre num navegador diferente daquele que pediu, o verificador não
 * existe e a troca falha. Com a mesma mensagem de link expirado, que é
 * exatamente o que ele **não** é. Distinguir os dois casos aqui é o que
 * permite dizer à pessoa onde clicar em vez de mandá-la pedir outro e-mail e
 * repetir o erro.
 */
const VERIFIER_COOKIE_SUFFIX = "-code-verifier";

/**
 * Destino do link enviado por e-mail: abre a sessão e devolve a pessoa ao
 * produto.
 *
 * Falha vira redirecionamento com motivo na URL, nunca página de erro crua.
 * Quem clicou num link que não abriu precisa entender o que aconteceu e ter
 * para onde ir. Quem mostra o motivo é `accessError.ts`, na tela de acesso.
 *
 * Dois formatos entram aqui, e a ordem importa:
 *
 * - `token_hash`, do link por e-mail. **Não depende do navegador de origem**,
 *   e é por isso que é o caminho preferido: o link chega numa caixa de
 *   entrada, e caixa de entrada abre onde quiser.
 * - `code`, do retorno do Google. Aí o PKCE cabe, porque a navegação começou
 *   e termina no mesmo navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/?acesso=sem-servidor`);
  }

  const tokenHash = searchParams.get("token_hash");

  if (tokenHash) {
    /*
      `type` vem do próprio template de e-mail. Sem ele o padrão é `email`,
      que é o do link de acesso: o caminho que a equipe usa todo dia não pode
      depender de um parâmetro chegar.
    */
    const type = (searchParams.get("type") ?? "email") as EmailOtpType;

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    return error
      ? NextResponse.redirect(`${origin}/?acesso=link-expirado`)
      : NextResponse.redirect(origin);
  }

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?acesso=link-invalido`);
  }

  /*
    Conferido antes da troca, e não depois: a Supabase devolve o mesmo erro
    para código gasto e para verificador ausente, e depois da falha já não dá
    para separar os dois.
  */
  const temVerificador = request.cookies
    .getAll()
    .some((cookie) => cookie.name.endsWith(VERIFIER_COOKIE_SUFFIX));

  if (!temVerificador) {
    return NextResponse.redirect(`${origin}/?acesso=outro-navegador`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?acesso=link-expirado`);
  }

  return NextResponse.redirect(origin);
}
