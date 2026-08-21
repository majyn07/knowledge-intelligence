/**
 * O que dizer quando o link de acesso não sai.
 *
 * A Supabase devolve a mensagem crua em inglês — `email rate limit exceeded` —
 * e ela apareceu na tela de acesso do produto. Além de estar no idioma errado,
 * ela nomeia a causa técnica e esconde a única coisa que quem lê precisa
 * saber: o que fazer agora.
 *
 * O caso que motivou isto: o serviço de e-mail embutido da Supabase entrega no
 * máximo dois por hora **e recusa endereços que não sejam da equipe do
 * projeto**. Sem SMTP próprio, a maior parte da equipe nunca receberia nada — e
 * o produto respondia com três palavras em inglês.
 */

interface Match {
  /** Trecho da mensagem original, em minúsculas. */
  contains: string;
  message: string;
}

const KNOWN: Match[] = [
  {
    contains: "rate limit",
    message:
      "O envio de e-mails atingiu o limite. O serviço de e-mail configurado neste projeto tem teto por hora — avise quem administra, porque isso se resolve na configuração e não esperando.",
  },
  {
    contains: "not authorized",
    message:
      "Este endereço não está autorizado a receber o link neste projeto. Avise quem administra o acesso.",
  },
  {
    contains: "invalid",
    message: "Este endereço não foi aceito. Confira se está escrito corretamente.",
  },
  {
    contains: "signups not allowed",
    message:
      "O cadastro de novas contas está desligado neste projeto. Avise quem administra o acesso.",
  },
];

/**
 * Traduz o que dá para traduzir, e devolve o resto como veio.
 *
 * Mensagem desconhecida não vira texto genérico: "não foi possível enviar" sem
 * o motivo original tira de quem administra a única pista que existe. Ela vai
 * junto, marcada como detalhe.
 */
export function signInErrorMessage(original: string): string {
  const texto = original.trim();
  if (texto === "") return "Não foi possível enviar o link de acesso.";

  const conhecido = KNOWN.find((item) => texto.toLowerCase().includes(item.contains));

  return conhecido
    ? conhecido.message
    : `Não foi possível enviar o link de acesso: ${texto}`;
}
