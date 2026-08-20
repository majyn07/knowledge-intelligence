/**
 * Aplica as migrações de `supabase/migrations` no banco configurado.
 *
 * Lê a conexão de `.env.local`, que a CLI da Vercel preenche e o `.gitignore`
 * protege. Nenhum valor é impresso: o que sai daqui é nome de arquivo, nome de
 * tabela e mensagem de erro.
 *
 * Uso: `npm run db:migrate`
 */

import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

function readEnvFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        const key = line.slice(0, at).trim();
        const value = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

const env = readEnvFile(".env.local");
const url = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;

if (!url) {
  console.error(
    "Sem conexão configurada. Rode `npx vercel env pull` ou provisione o banco antes."
  );
  process.exit(1);
}

/*
  O `pg` recente trata `sslmode=require` como verificação completa da cadeia, e
  o certificado do Supabase não resolve por CA pública. `uselibpqcompat`
  devolve o significado clássico: conexão cifrada, sem verificar a CA.
*/
const connectionString = url.includes("uselibpqcompat")
  ? url
  : `${url}${url.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`;

const client = new pg.Client({ connectionString });
await client.connect();

const files = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  process.stdout.write(`aplicando ${file} ... `);

  try {
    await client.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
    console.log("ok");
  } catch (error) {
    console.log("FALHOU");
    console.error(`  ${error.message}`);
    if (error.detail) console.error(`  detalhe: ${error.detail}`);
    if (error.hint) console.error(`  dica: ${error.hint}`);
    await client.end();
    process.exit(1);
  }
}

const { rows } = await client.query(
  `select table_name from information_schema.tables
   where table_schema = 'public' order by table_name`
);

console.log(`\n${rows.length} tabelas em public: ${rows.map((r) => r.table_name).join(", ")}`);

await client.end();
