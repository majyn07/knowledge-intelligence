/**
 * O JSON que o modelo devolveu, tolerando a cerca de crase.
 *
 * O modelo às vezes cerca a resposta com ```` ```json ````, apesar de pedirmos
 * que não. Recusar por causa da cerca desperdiça uma resposta correta.
 *
 * **Havia três parsers e só dois toleravam.** A sugestão de seção e o
 * preenchimento de formulário limpavam a cerca; a análise chamava `JSON.parse`
 * direto e morria com "a resposta não é um JSON" — e foi o que apareceu contra a
 * API real, uma vez em duas. É a mesma divergência que o cadastro de rotas e as
 * chaves de armazenamento já tinham produzido: a mesma decisão escrita em três
 * lugares vira três decisões diferentes.
 *
 * Não substitui o `responseSchema`, que impede a cerca de aparecer. É a defesa
 * de trás: o provedor que não souber restringir a geração continua atendido.
 */
export function jsonDoModelo(raw: string): unknown {
  const limpo = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(limpo);
  } catch {
    return null;
  }
}
