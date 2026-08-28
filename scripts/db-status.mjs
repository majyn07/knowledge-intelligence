/**
 * Quantos registros existem em cada tabela do workspace compartilhado.
 *
 * Existe porque decidir se algo precisa ser apagado sem antes olhar é como
 * apagar no escuro, e apagar dado compartilhado apaga para a equipe inteira.
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

/**
 * A conexão, lida da URL **sem** `new URL()`.
 *
 * Duas coisas quebraram aqui, e as duas em silêncio:
 *
 * - A senha do Supabase traz caractere que precisaria estar codificado, e
 *   `new URL()` recusa a string inteira com um "Invalid URL" que não fala em
 *   senha. Por isso a divisão é manual, e pelo **último** `@`: assim a senha
 *   pode conter o que quiser.
 * - `POSTGRES_HOST` aponta para o host direto, que deixou de resolver quando a
 *   Supabase passou as conexões diretas para IPv6. Quem responde é o pooler, e
 *   ele só existe dentro da URL.
 */
function conexaoDaUrl(url) {
  const semEsquema = url.replace(/^postgres(ql)?:\/\//, "");
  const corte = semEsquema.lastIndexOf("@");

  if (corte === -1) return null;

  const credencial = semEsquema.slice(0, corte);
  const destino = semEsquema.slice(corte + 1);

  const doisPontos = credencial.indexOf(":");
  const user = doisPontos === -1 ? credencial : credencial.slice(0, doisPontos);
  const password = doisPontos === -1 ? "" : credencial.slice(doisPontos + 1);

  const [hostPorta, resto = ""] = destino.split("/");
  const [host, porta] = hostPorta.split(":");

  return {
    host,
    port: Number(porta || 5432),
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    database: resto.split("?")[0] || "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

const url = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;
const conexao = url ? conexaoDaUrl(url) : null;

if (!conexao) {
  console.error("Sem conexão configurada. Rode `npx vercel env pull` antes.");
  process.exit(1);
}

const client = new pg.Client(conexao);
await client.connect();

/*
  A ordem é a de dependência. Projeto antes de atendimento, atendimento antes
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
