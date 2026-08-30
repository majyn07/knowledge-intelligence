/**
 * O que a pessoa escreveu, sem o que o cliente de e-mail pendurou embaixo.
 *
 * A triagem passou a agrupar pela fala do cliente, e o Levantamento cobrou de
 * novo: o maior grupo colava por "andressa, bancarios, centro, commercial" — o
 * **bloco de assinatura** de quem enviou. Trocar o rodapé do suporte pelo do
 * cliente não é conserto.
 *
 * Aqui o corte é **estrutural**, e não por lista de palavras. E-mail tem uma
 * convenção antiga: o texto novo vem em cima, e embaixo vêm assinatura, aviso
 * jurídico, rodapé de lista e a mensagem citada. Cortar no primeiro marcador
 * guarda o que a pessoa digitou e descarta o que a ferramenta acrescentou.
 *
 * **Os marcadores foram medidos antes de virar regra**, nas 7.709 falas de
 * cliente do acervo: `--` sozinho numa linha (73), rodapé de descadastro (331),
 * aviso de confidencialidade (113), citação "…escreveu:" (177). Escrever regra
 * para o que não ocorre é inventar manutenção.
 *
 * **`De:` e `From:` ficaram de fora**, apesar de aparecerem em 317. Num e-mail
 * encaminhado, o pedido costuma estar **dentro** do trecho encaminhado, e
 * cortar ali jogaria fora justamente a descrição. Ambíguo demais para uma
 * regra que roda sobre mil registros sem ninguém olhar.
 */

/**
 * Onde o texto da pessoa termina.
 *
 * Cada um vale como **linha inteira** ou como abertura de bloco: um `--` no
 * meio de uma frase é hífen, e "esta mensagem" no meio de um parágrafo é a
 * pessoa falando da mensagem dela.
 */
const MARCADORES: RegExp[] = [
  /*
    O delimitador de assinatura da convenção de e-mail: dois hífens sozinhos
    numa linha. É o que vem antes de "Andressa Franciele Silva / Commercial
    Specialist / Rua Saldanha Marinho, 392 | Centro".
  */
  /^[ \t]*--[ \t]*$/m,

  /* Rodapé de lista de discussão, que a ferramenta acrescenta sem ninguém pedir. */
  /^.*to unsubscribe from this group.*$/im,

  /*
    Aviso jurídico. Longo, idêntico em toda mensagem da mesma empresa, e por
    isso pesado: ele sozinho dobra o vocabulário de uma fala curta.

    Ancorado no **começo da linha**, e não em qualquer posição: quem escreve
    "recebi esta mensagem e seus anexos abriram normalmente" está descrevendo o
    caso, e cortar ali apagaria o problema em vez do rodapé. Aspas e asteriscos
    passam antes porque o aviso costuma vir citado ou em itálico.
  */
  /^[ 	>*"“']*(esta mensagem e seus anexos|aviso de confidencialidade|confidentiality notice|this (e-?mail|message) and (its|any) attachments)/im,

  /* A citação do que veio antes: "Em qui., 20 de ago. de 2026 às 11:58, AltoQI escreveu:" */
  /^[ \t>]*Em .{0,160}escreveu:[ \t]*$/im,
  /^[ \t>]*On .{0,160}wrote:[ \t]*$/im,

  /* "Enviado do meu iPhone" e parentes. */
  /^[ \t]*enviado (do|de) meu .*$/im,

  /* O pedido de não imprimir, que costuma fechar o aviso jurídico. */
  /^.*antes de imprimir.*$/im,
];

/**
 * A saudação de abertura, que é enfeite **em cima** e não embaixo.
 *
 * Os marcadores acima cortam para baixo, porque a convenção de e-mail põe o
 * rodapé no fim. A saudação escapava por estar antes de tudo, e ela pesa por
 * dois motivos.
 *
 * **Ela carrega o nome do cliente.** Medido nas 1.025 soluções do acervo: 301
 * (29%) abrem com saudação e **95 (9%) trazem um nome próprio nela** — "Boa
 * tarde, Uesley!", "Bom dia, Eduardo, tudo bem?". Esse texto vai ao provedor de
 * IA, e nome de cliente ali sai do nosso domínio e entra no de terceiro. É a
 * mesma decisão que tirou o nome do cliente do transcrito, alcançando o lugar
 * que aquela mudança não alcançava.
 *
 * **E ela não descreve nada.** "Boa tarde, tudo bem?" aparece em quase um terço
 * do acervo: para a triagem, é vocabulário que aproxima atendimentos que não têm
 * nada a ver um com o outro.
 *
 * Só a **primeira** linha não vazia, e só se ela for curta. Um parágrafo que
 * começa com "Olá" e segue explicando é a resposta, não o cumprimento.
 */
const SAUDACAO =
  /^[ \t>*"']*(bom dia|boa tarde|boa noite|ol[áa]|oi|prezad[oa]s?|car[oa]s?)\b[^\n]{0,60}$/i;

function semSaudacao(texto: string): string {
  const quebra = texto.indexOf("\n");
  const primeira = quebra === -1 ? texto : texto.slice(0, quebra);

  /*
    Linha em branco antes da saudação não impede o corte: o e-mail costuma abrir
    com uma, e exigir que a saudação seja o primeiro caractere deixaria passar a
    maioria.
  */
  if (primeira.trim() === "") return quebra === -1 ? texto : semSaudacao(texto.slice(quebra + 1));

  return SAUDACAO.test(primeira) && quebra !== -1 ? texto.slice(quebra + 1).trimStart() : texto;
}

/**
 * Corta no **primeiro** marcador, e não em cada um.
 *
 * O que vem depois do primeiro já é rodapé: cortar pedaço a pedaço deixaria
 * passar o texto entre um marcador e o seguinte, que é assinatura tanto quanto
 * o resto.
 */
export function corpoEscrito(texto: string): string {
  let corte = texto.length;

  for (const marcador of MARCADORES) {
    const achado = marcador.exec(texto);

    if (achado && achado.index < corte) corte = achado.index;
  }

  return semSaudacao(texto.slice(0, corte).trim()).trim();
}
