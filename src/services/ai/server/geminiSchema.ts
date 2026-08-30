/**
 * O contrato de saída na forma que o Gemini aceita.
 *
 * Pedir JSON por instrução não basta, e o dado real mostrou: a mesma análise
 * voltava JSON numa vez e prosa na outra, e a tela dizia "a IA devolveu uma
 * análise em formato inválido. Peça de novo" — mandando repetir um pedido que
 * pode falhar de novo pelo mesmo motivo. Com `responseSchema`, a geração é
 * **restringida** ao contrato em vez de torcer para ele ser seguido.
 *
 * Só que o Gemini não aceita JSON Schema inteiro: ele lê um subconjunto do
 * OpenAPI, e uma chave que ele não conhece derruba o pedido antes de sair. O
 * que o Zod gera tem várias — `additionalProperties` (que vem de `.strict()`),
 * `minLength`, `minimum`, `exclusiveMinimum`.
 *
 * Então o schema é **reduzido**, e não reescrito: o que ele entende passa, o
 * resto sai. As regras que ficam de fora continuam valendo do nosso lado, onde
 * sempre valeram — a resposta passa pelo Zod na volta de qualquer jeito, e é
 * ele quem recusa o que não serve.
 */

/**
 * O que o Gemini entende, e nada além.
 *
 * Lista de permissão e não de bloqueio, de propósito: uma chave nova do Zod
 * numa versão futura passaria despercebida por uma lista de bloqueio e
 * derrubaria a análise em produção, que é o defeito que isto existe para
 * evitar.
 */
const ACEITAS = new Set([
  "type",
  "description",
  "enum",
  "items",
  "properties",
  "required",
  "minItems",
  "maxItems",
  "nullable",
  "anyOf",
]);

/**
 * `format` é aceito, mas só em alguns valores.
 *
 * `date-time` e `enum` são os que o Gemini reconhece para texto. Os outros que
 * o Zod produz (`email`, `uri`, `uuid`) fariam o pedido ser recusado inteiro
 * por causa de um campo.
 */
const FORMATOS = new Set(["date-time", "enum"]);

export function paraGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(paraGemini);

  if (typeof schema !== "object" || schema === null) return schema;

  const entrada = schema as Record<string, unknown>;
  const saida: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(entrada)) {
    if (chave === "format") {
      if (typeof valor === "string" && FORMATOS.has(valor)) saida.format = valor;
      continue;
    }

    if (!ACEITAS.has(chave)) continue;

    /*
      `properties` é um mapa de nome para schema, e não um schema: descer nele
      como se fosse um apagaria os nomes dos campos.
    */
    if (chave === "properties" && typeof valor === "object" && valor !== null) {
      saida.properties = Object.fromEntries(
        Object.entries(valor as Record<string, unknown>).map(([campo, sub]) => [
          campo,
          paraGemini(sub),
        ])
      );

      continue;
    }

    saida[chave] = paraGemini(valor);
  }

  return saida;
}
