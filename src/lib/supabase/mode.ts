/**
 * O produto tem dois modos, e a resposta é a mesma dos dois lados da fronteira.
 *
 * Este arquivo existe por causa dessa fronteira: `client.ts` é `"use client"`,
 * então o servidor não pode chamar nada dele. A regra do administrador vale nos
 * dois lados (a tela esconde o botão, a rota recusa o pedido), e as duas
 * precisam ler o mesmo lugar: escritas em separado, divergem, e a divergência
 * apareceria como um botão escondido para quem a rota deixaria passar.
 *
 * A virada é uma variável própria porque a integração da Vercel injeta as
 * credenciais do Supabase em todos os ambientes assim que é provisionada. Se a
 * presença delas decidisse, o primeiro deploy trancaria todo mundo numa tela de
 * login com a camada de dados pela metade.
 */
export function isSharedWorkspace(): boolean {
  return (process.env.NEXT_PUBLIC_SHARED_WORKSPACE ?? "").trim().toLowerCase() === "on";
}
