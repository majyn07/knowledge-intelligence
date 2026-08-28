/**
 * Apaga do banco compartilhado o que era demonstração.
 *
 * O que **sai**: projeto, atendimento, conversa, análise, plano, artigo e
 * histórico. Tudo isso foi semeado para o produto ter o que mostrar antes de
 * existir dado real, e dado inventado num hub de conhecimento é pior que tela
 * vazia, decisão tomada sobre ele é decisão perdida.
 *
 * O que **fica**, e a distinção é o ponto:
 *
 * - `taxonomy_*`: a estrutura do portal, levantada do `suporte.altoqi.com.br`.
 *   É real, e é o vocabulário contra o qual todo artigo importado será
 *   classificado.
 * - `teams`: as quatro equipes do suporte, com os nomes que elas têm.
 * - `profiles`. Quem entrou de fato. Apagar perfil apaga conta de gente.
 * - `dashboard_panels`, painel guarda a pergunta, não a resposta. Não é dado.
 *
 * A ordem é a de dependência ao contrário: conversa antes de atendimento,
 * atendimento antes de projeto. Apagar o pai primeiro esbarraria na chave
 * estrangeira e deixaria a limpeza pela metade.
 *
 * Uso: `npm run db:limpar-demo -- --confirmar`
 */

import { readFileSync } from "node:fs";
import pg from "pg";

function readEnvFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        return [
          line.slice(0, at).trim(),
          line.slice(at + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      })
  );
}

const env = readEnvFile(".env.local");
const url = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;

if (!url) {
  console.error("Sem conexão configurada. Rode `npx vercel env pull` antes.");
  process.exit(1);
}

const connectionString = url.includes("uselibpqcompat")
  ? url
  : `${url}${url.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`;

/** De folha para raiz. */
const APAGAR = [
  "activity_events",
  "support_conversations",
  "analyses",
  "plans",
  "articles",
  "tickets",
  "projects",
];

const PRESERVAR = [
  "taxonomy_categories",
  "taxonomy_sections",
  "taxonomy_entries",
  "teams",
  "profiles",
  "dashboard_panels",
  "saved_views",
  "follows",
];

const client = new pg.Client({ connectionString });
await client.connect();

console.log("Vai apagar:");
let total = 0;

for (const tabela of APAGAR) {
  const { rows } = await client.query(`select count(*)::int as n from public.${tabela}`);
  total += rows[0].n;
  console.log(`  ${String(rows[0].n).padStart(5)}  ${tabela}`);
}

console.log("\nVai preservar:");
for (const tabela of PRESERVAR) {
  const { rows } = await client.query(`select count(*)::int as n from public.${tabela}`);
  console.log(`  ${String(rows[0].n).padStart(5)}  ${tabela}`);
}

/*
  Sem a confirmação, o script só conta. Um comando de apagar que apaga por ser
  chamado transforma um engano de terminal em perda para catorze pessoas.
*/
if (!process.argv.includes("--confirmar")) {
  console.log(`\n${total} registro(s). Rode de novo com --confirmar para apagar.`);
  await client.end();
  process.exit(0);
}

// Numa transação: metade apagada é pior que nada apagado, porque deixa filho
// apontando para pai que não existe mais.
await client.query("begin");

try {
  for (const tabela of APAGAR) {
    await client.query(`delete from public.${tabela}`);
  }

  await client.query("commit");
  console.log(`\n${total} registro(s) apagados.`);
} catch (error) {
  await client.query("rollback");
  console.error("\nNada foi apagado:", error.message);
  process.exitCode = 1;
}

await client.end();
