/**
 * Quantos registros existem em cada tabela do workspace compartilhado.
 *
 * Existe porque decidir se algo precisa ser apagado sem antes olhar é como
 * apagar no escuro — e apagar dado compartilhado apaga para a equipe inteira.
 * Só conta: nada aqui escreve.
 *
 * Uso: `npm run db:status`
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

const client = new pg.Client({ connectionString });
await client.connect();

/*
  A ordem é a de dependência — projeto antes de atendimento, atendimento antes
  de conversa. Ela é a mesma da migração e a mesma que uma limpeza teria de
  seguir de trás para frente.
*/
const tabelas = [
  "projects",
  "tickets",
  "support_conversations",
  "analyses",
  "plans",
  "articles",
  "activity_events",
  "dashboard_panels",
  "saved_views",
  "follows",
  "profiles",
  "teams",
  "taxonomy_categories",
  "taxonomy_sections",
  "taxonomy_entries",
];

for (const tabela of tabelas) {
  const { rows } = await client.query(`select count(*)::int as total from public.${tabela}`);
  console.log(`${String(rows[0].total).padStart(6)}  ${tabela}`);
}

await client.end();
