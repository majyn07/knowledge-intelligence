/**
 * O vocabulário do produto, num lugar só.
 *
 * Toda comparação por palavra passa por aqui: a sobreposição entre artigos, a
 * comparação de dois deles e a triagem que agrupa atendimentos pela mesma
 * dúvida. Duas listas do mesmo vocabulário divergem, e a divergência
 * apareceria como o Levantamento apontando um par que a tela de comparação
 * depois descreve de outro jeito.
 *
 * Subiu para `lib` quando o segundo domínio passou a precisar dela. Antes
 * vivia dentro da Biblioteca, e a triagem do atendimento a importaria por cima
 * da fronteira de feature.
 */

/**
 * Palavras que aparecem em quase todo texto deste produto.
 *
 * Sem esta lista, dois artigos quaisquer do Builder se parecem: os dois falam
 * de projeto, janela, comando e clique. O que distingue um do outro é o termo
 * técnico, não o vocabulário da ferramenta. Vale igual para o atendimento, que
 * é escrito pelas mesmas pessoas sobre os mesmos produtos.
 */
const COMUNS = new Set([
  "para", "com", "que", "dos", "das", "por", "uma", "nao", "como", "mais", "sem",
  "sobre", "pode", "ser", "esta", "este", "isso", "quando", "onde", "seu", "sua",
  "aos", "nas", "nos", "foi", "sao", "tem", "caso", "deve", "todos", "toda", "cada",
  "altoqi", "artigo", "builder", "eberick", "visus", "plataforma", "programa",
  "projeto", "usuario", "arquivo", "clique", "clicar", "opcao", "opcoes", "janela",
  "comando", "desenho", "tela", "menu", "botao", "figura", "abaixo", "acima",
  "seguir", "conforme", "atraves", "possivel", "necessario", "utilizar", "forma",
  "apresentado", "apresentada", "exemplo", "mostrado", "selecionar", "existe",
]);

/** Abaixo disso a palavra comum é curta demais para distinguir assunto. */
const TAMANHO_MINIMO = 5;

/**
 * Códigos entram mesmo sendo curtos, e essa regra veio da medição.
 *
 * Numa base técnica o que separa dois textos vizinhos costuma ser justamente
 * um código curto: `D15` e `D16` são erros diferentes, `V9` e `V10` são versões
 * diferentes. Com o corte por tamanho, esses pares apareciam como **idênticos**,
 * porque o único termo que os distinguia era o descartado.
 *
 * O critério é misturar letra e dígito: é o formato de código de erro, versão e
 * norma, e não pega palavra comum nenhuma.
 */
const CODIGO = /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/;

/**
 * Número solto não é assunto.
 *
 * O corte por tamanho deixava passar qualquer sequência de cinco dígitos, e com
 * os atendimentos da HubSpot dentro isso virou vocabulário de verdade:
 * `47968252511` é o número do chamado, `537686325` sai de um endereço, `2024` é
 * ano. Nenhum deles descreve dúvida nenhuma, e dois textos que dividem só um
 * número não dividem assunto.
 *
 * `D15` e `V10` continuam entrando: eles têm letra, e é a letra que os torna
 * código de erro em vez de contagem.
 */
const SO_DIGITOS = /^\d+$/;

/**
 * A palavra não distingue assunto nenhum, seja qual for o tamanho.
 *
 * Separada de `isMeaningfulTerm` porque a **lista** é compartilhada e o
 * **tamanho mínimo** não é. Comparar dois artigos longos quer uma barra alta,
 * senão qualquer par do Builder se parece. Casar uma consulta contra o acervo
 * quer a barra baixa: "laje", "viga", "SPDA" e "IFC" têm três ou quatro letras
 * e são exatamente o que separa um artigo do outro aqui.
 *
 * Antes disso eram três listas de palavras comuns no produto, e elas
 * divergiam: a comparação entre artigos descartava "projeto" e "janela", e a
 * busca por relacionados as deixava passar.
 */
export function isCommonWord(palavra: string): boolean {
  return COMUNS.has(palavra) || SO_DIGITOS.test(palavra);
}

export function isMeaningfulTerm(palavra: string): boolean {
  if (isCommonWord(palavra)) return false;
  if (CODIGO.test(palavra)) return true;

  return palavra.length >= TAMANHO_MINIMO;
}

/**
 * O que todo e-mail do suporte tem, e por isso não distingue nenhum.
 *
 * É a mesma razão de `COMUNS`, um andar ao lado: lá são as palavras do
 * produto, aqui são as da correspondência. Fica separada e **opt-in** porque só
 * o texto do atendimento a quer: artigo publicado não abre com "prezado", e
 * "acesso" ou "atendimento" são assunto legítimo dentro de um artigo.
 *
 * Ela não era teoria. Um atendimento sobre multa de cancelamento e outro sobre
 * pagamento de dívida entraram no mesmo grupo da triagem dividindo
 * "atenciosamente, atendentes, acesse, agradecemos": o grupo era a assinatura
 * de quem respondeu. E a análise de um chamado de importação de IFC no Eberick
 * trouxe como artigo relacionado um texto sobre o Visus Cost Management, ligado
 * por "situação, neste, atendimento, identificamos, solicitação".
 */
const RUIDO_DE_CORRESPONDENCIA = new Set([
  "prezado", "prezada", "prezados", "atenciosamente", "cordialmente", "abracos",
  "abraco", "obrigado", "obrigada", "agradecemos", "agradeco", "aguardamos",
  "disposicao", "disposicoes", "atendentes", "atendente", "atendimento",
  "atendimentos", "suporte", "equipe", "contato", "contatos", "mensagem",
  "mensagens", "email", "emails", "resposta", "responder", "respondido",
  "chamado", "ticket", "protocolo", "solicitacao", "solicitado", "solicitamos",
  "duvida", "duvidas", "acesse", "acessar", "acesso", "segue", "conforme",
  "informacoes", "informacao", "gentileza", "favor", "dia", "tarde",
  "noite", "ola", "boa", "bom", "cliente", "senhor", "senhora", "assunto",
  "horario", "horarios", "atendemos", "expediente", "segunda", "terca",
  "quarta", "quinta", "sexta", "sabado", "domingo", "feriado", "feriados",
  "util", "uteis", "situacao", "neste", "nesta", "identificamos", "orientacoes",
  "orientacao", "ainda", "esse", "essa", "estao", "sou", "seguir", "abaixo",
]);

/**
 * Hora de relógio não é código de erro.
 *
 * `12h`, `13h30` e `9h` misturam letra e dígito, então passam pela regra que
 * existe para deixar `D15` e `V10` entrarem. Com o rodapé de horário de
 * atendimento em todo e-mail do suporte, isso bastou para juntar num grupo só
 * um problema de importação de IFC e uma falha ao abrir o programa: o que os
 * dois dividiam era o expediente de quem respondeu.
 */
const RELOGIO = /^\d{1,2}h(\d{2})?$/;

/** Endereço não é vocabulário: é onde uma coisa está, não o que ela é. */
const ENDERECO = /(https?:\/\/|www\.|@[\w-]+\.)/i;

/** Sem acento e sem caixa, que é a forma em que as listas são escritas. */
export function deacentuar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * O mesmo texto, sem o que a correspondência do suporte traz junto.
 *
 * Devolve **texto**, e com acento, porque quem o consome depois casa palavra
 * contra o corpo do artigo, que também tem acento. Tirar o acento aqui faria
 * "fissuracao" deixar de encontrar "fissuração".
 */
export function semCorrespondencia(texto: string): string {
  return texto
    .split(/\s+/)
    .filter((palavra) => {
      if (ENDERECO.test(palavra)) return false;

      const nu = deacentuar(palavra).replace(/[^a-z0-9]/g, "");

      return nu !== "" && !RELOGIO.test(nu) && !RUIDO_DE_CORRESPONDENCIA.has(nu);
    })
    .join(" ");
}

/** As palavras de um texto qualquer, já normalizadas. */
export function termsOf(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(isMeaningfulTerm);
}

/**
 * As palavras de uma **busca**, que não é a mesma coisa que o vocabulário.
 *
 * `termsOf` descarta o que é curto e o que é comum, e está certo: ele existe
 * para comparar dois textos, e "projeto" não distingue nada num produto de
 * projeto. Numa busca isso vira defeito. Quem digita "laje" quer que "laje"
 * conte, e ver voltar tudo que fala de flecha porque a segunda palavra foi
 * jogada fora é a busca ignorando metade do que se pediu.
 *
 * Aqui entra tudo que a pessoa escreveu, sem acento e sem caixa.
 */
export function searchTerms(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra !== "");
}

/** Quanto do vocabulário dos dois é o mesmo, de 0 a 1. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let comuns = 0;
  const menor = a.size <= b.size ? a : b;
  const maior = menor === a ? b : a;

  for (const palavra of menor) if (maior.has(palavra)) comuns += 1;

  return comuns / (a.size + b.size - comuns);
}

/** As palavras de um texto, com quantas vezes cada uma aparece. */
export function termFrequency(texto: string): Map<string, number> {
  const contagem = new Map<string, number>();

  for (const palavra of termsOf(texto)) {
    contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
  }

  return contagem;
}
