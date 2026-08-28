/**
 * O que resgatar de um link de acesso que caiu na raiz.
 *
 * A Supabase manda o link do e-mail para o destino pedido pelo produto, mas
 * só quando esse destino está na lista de permitidos. Fora dela usa a
 * `site_url`, e o link cai em `/`, onde nada acontece: a pessoa vê a tela de
 * acesso de novo, sem uma linha explicando por quê.
 *
 * Isso não é hipótese. Todo link já enviado carrega o destino que valia na
 * hora do envio, então e-mail antigo continua caindo aqui mesmo com a
 * configuração corrigida, e uma configuração futura errada faria o mesmo.
 *
 * **Os dois formatos são resgatados, e não só um.** O `code` do PKCE já era; o
 * `token_hash` entrou junto com o link que não depende do navegador de origem.
 * Encaminhar um e esquecer o outro deixaria metade dos links caindo no
 * silêncio que este arquivo existe para impedir, e seria a metade nova, que
 * ninguém ainda sabe diagnosticar.
 *
 * Aqui não se decide nada sobre o código: `/auth/callback` é quem o valida e
 * responde com motivo na URL quando ele não presta.
 */

/** Os parâmetros a levar para o callback, ou `null` quando não há o que levar. */
export function authLandingParams(search: URLSearchParams): URLSearchParams | null {
  const code = search.get("code");
  const tokenHash = search.get("token_hash");

  if (!code && !tokenHash) return null;

  const destino = new URLSearchParams();

  /*
    `token_hash` primeiro, pela mesma razão da ordem no callback: é o caminho
    que funciona em qualquer navegador. Um link que trouxesse os dois: o que
    nenhum template nosso produz, mas que um ambiente mal configurado poderia.
    Seria resolvido pelo mais robusto.
  */
  if (tokenHash) {
    destino.set("token_hash", tokenHash);
    /*
      O tipo acompanha o hash quando vier. O callback tem padrão para a
      ausência dele, e repeti-lo aqui criaria dois lugares decidindo o mesmo.
    */
    const type = search.get("type");
    if (type) destino.set("type", type);

    return destino;
  }

  destino.set("code", code!);

  return destino;
}
