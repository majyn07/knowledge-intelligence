import { searchTerms } from "@/lib/vocabulary";

/**
 * Qual solução da AltoQi o atendimento trata.
 *
 * "Solução" aqui é o produto, que é como a empresa fala: Builder, Eberick,
 * Visus. Não é a resposta que o suporte deu, e confundir os dois custou uma
 * tela inteira mostrando um e-mail no campo "Solução".
 *
 * O certo seria ler `ia_produto` do ticket, que a equipe já preenche. Ele está
 * atrás do 403, então o que sobra é o título, e o título costuma trazer:
 * "Ticket AltoQi nº47954714157 - Falha Abrir Software - **Builder**".
 *
 * Isto **não é adivinhação**: o vocabulário é o mesmo da HubSpot, lido do
 * esquema do ticket, e o que casa é nome de produto escrito por extenso. O que
 * o título não disser fica vazio, e vazio aqui é resposta legítima: melhor
 * campo em branco que produto chutado, que ninguém saberia ter sido chute.
 */

/**
 * Os produtos, com os nomes por que são chamados.
 *
 * A primeira forma de cada linha é o rótulo; as demais são como aparecem
 * escritos no assunto do chamado. `qibuilder` e `qieletrico` são os nomes
 * antigos, e continuam aparecendo em atendimento de cliente.
 */
const PRODUTOS: { rotulo: string; formas: string[] }[] = [
  { rotulo: "AltoQi Builder", formas: ["builder", "qibuilder"] },
  { rotulo: "AltoQi Eberick", formas: ["eberick", "qieberick"] },
  { rotulo: "AltoQi Visus", formas: ["visus"] },
  { rotulo: "Área do Cliente", formas: ["area do cliente"] },
  { rotulo: "Licenciamento", formas: ["licenciamento", "licenca"] },
  { rotulo: "AltoQi Education", formas: ["education"] },
  { rotulo: "QiSelect", formas: ["qiselect"] },
  { rotulo: "Editor de Armaduras", formas: ["editor de armaduras"] },
];

/**
 * Os produtos citados num texto, sem repetir e na ordem do cadastro.
 *
 * Casa por palavra inteira, e não por trecho: "licenca" dentro de
 * "licenciamento" produziria os dois, e um atendimento sobre licenciamento não
 * é sobre dois produtos.
 */
export function produtosNoTexto(texto: string): string[] {
  const palavras = searchTerms(texto);
  const frase = palavras.join(" ");
  const achados: string[] = [];

  for (const produto of PRODUTOS) {
    const citado = produto.formas.some((forma) =>
      forma.includes(" ") ? frase.includes(forma) : palavras.includes(forma)
    );

    if (citado) achados.push(produto.rotulo);
  }

  return achados;
}

/** Os rótulos existentes, para a tela oferecer o filtro sem inventar nomes. */
export function produtosConhecidos(): string[] {
  return PRODUTOS.map((produto) => produto.rotulo);
}
