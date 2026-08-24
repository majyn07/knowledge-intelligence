/**
 * O que dizer a quem clicou num link de acesso que não abriu.
 *
 * A rota `/auth/callback` sempre soube nomear a falha: ela redireciona para
 * `/?acesso=<motivo>` em vez de mostrar página de erro crua. Faltava a outra
 * metade — ninguém lia o parâmetro. Quem clicava num link que não funcionou
 * voltava para a tela de acesso **sem uma palavra**, e a reação natural é
 * pedir outro link.
 *
 * Foi o que aconteceu no primeiro teste com alguém de fora da administração,
 * em 24/08/2026: o acesso "só funcionava no segundo e-mail". Não era o
 * segundo e-mail que funcionava — era o segundo pedido que passava a sair do
 * navegador certo, e o silêncio da tela escondia isso.
 *
 * Motivo desconhecido devolve `null` de propósito: um código que não
 * reconhecemos não vira frase genérica na cara de quem está tentando entrar.
 */

export const ACCESS_FAILURES = [
  "sem-servidor",
  "link-invalido",
  "link-expirado",
  "outro-navegador",
] as const;

export type AccessFailure = (typeof ACCESS_FAILURES)[number];

const MESSAGES: Record<AccessFailure, string> = {
  "sem-servidor":
    "Esta instalação está sem servidor configurado, então o link não tem como abrir uma sessão. Avise quem administra o acesso.",

  "link-invalido":
    "Este endereço não tem um link de acesso válido. Peça um novo e-mail abaixo.",

  "link-expirado":
    "Este link não vale mais — ou já foi usado, ou passou do prazo. Peça um novo abaixo; o mais recente é sempre o que funciona.",

  /*
    O caso que parecia falha de entrega de e-mail.

    Vale a pena nomear o navegador em vez de dizer só "link inválido": o
    problema não está no link nem na caixa de entrada, e mandar pedir outro
    sem explicar leva a pessoa a repetir o mesmo erro. Dizer onde clicar é o
    que encerra o ciclo.
  */
  "outro-navegador":
    "Este link foi pedido em outro navegador e por isso não abre aqui. Peça um novo e-mail nesta janela e clique no link a partir dela.",
};

function isAccessFailure(value: string): value is AccessFailure {
  return (ACCESS_FAILURES as readonly string[]).includes(value);
}

/**
 * Traduz o `?acesso=` da URL, ou `null` quando não há nada a dizer.
 */
export function accessFailureMessage(code: string | null | undefined): string | null {
  if (!code) return null;

  const limpo = code.trim().toLowerCase();

  return isAccessFailure(limpo) ? MESSAGES[limpo] : null;
}

/**
 * Lê o motivo de uma query string.
 *
 * Recebe a string em vez de tocar em `window`: o que decide a mensagem é
 * lógica, e lógica se testa sem navegador. Quem chama passa
 * `window.location.search`.
 */
export function accessFailureFromSearch(search: string): string | null {
  return accessFailureMessage(new URLSearchParams(search).get("acesso"));
}
