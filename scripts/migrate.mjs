/**
 * Aplica as migrações de `supabase/migrations` que ainda não rodaram.
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
  console.error(
    "Sem conexão configurada. Rode `npx vercel env pull` ou provisione o banco antes."
  );
  process.exit(1);
}

/**
 * Escapa usuário e senha dentro da URL.
 *
 * O `pg` entrega a string ao `new URL`, e a senha que o Supabase gerou tem
 * espaço e barra: a URL era recusada antes de qualquer conexão, com um
 * `ERR_INVALID_URL` que não diz qual parte está errada. Foi por isso que a
 * migração do registro cru acabou colada à mão no editor de SQL do painel.
 *
 * Nada é impresso aqui, como no resto do arquivo.
 */
function escaparCredencial(bruta) {
  const barras = bruta.indexOf("//");
  const arroba = bruta.lastIndexOf("@");

  if (barras === -1 || arroba === -1) return bruta;

  const esquema = bruta.slice(0, barras + 2);
  const credencial = bruta.slice(barras + 2, arroba);
  const resto = bruta.slice(arroba);

  const doisPontos = credencial.indexOf(":");
  if (doisPontos === -1) return bruta;

  const usuario = decodeURIComponent(credencial.slice(0, doisPontos));
  const senha = decodeURIComponent(credencial.slice(doisPontos + 1));

  return `${esquema}${encodeURIComponent(usuario)}:${encodeURIComponent(senha)}${resto}`;
}

/*
  O `pg` recente trata `sslmode=require` como verificação completa da cadeia, e
  o certificado do Supabase não resolve por CA pública. `uselibpqcompat`
  devolve o significado clássico: conexão cifrada, sem verificar a CA.
*/
const comCredencial = escaparCredencial(url);

const connectionString = comCredencial.includes("uselibpqcompat")
  ? comCredencial
  : `${comCredencial}${comCredencial.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`;

const client = new pg.Client({ connectionString });
await client.connect();

await client.query(`
  create table if not exists public.schema_migrations (
    file text primary key,
    applied_at timestamptz not null default now()
  )
`);

const files = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort();

const { rows: applied } = await client.query("select file from public.schema_migrations");
const done = new Set(applied.map((row) => row.file));

/*
  Ponte única: a primeira migração rodou antes de existir registro. Se o
  registro está vazio mas as tabelas dela existem, ela é dada como aplicada em
  vez de tentar rodar de novo e falhar em "relation already exists".
*/
if (done.size === 0) {
  const { rows } = await client.query(`
    select to_regclass('public.profiles') is not null as existe
  `);

  if (rows[0].existe && files.length > 0) {
    await client.query("insert into public.schema_migrations (file) values ($1)", [files[0]]);
    done.add(files[0]);
    console.log(`${files[0]} já estava aplicada antes do registro existir; anotada.`);
  }
}

let count = 0;

for (const file of files) {
  if (done.has(file)) continue;

  process.stdout.write(`aplicando ${file} ... `);

  /*
    Cada migração roda numa transação: falhar na metade deixaria o banco num
    estado que nem o registro nem o arquivo descrevem.
  */
  try {
    await client.query("begin");
    await client.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await client.query("insert into public.schema_migrations (file) values ($1)", [file]);
    await client.query("commit");

    console.log("ok");
    count += 1;
  } catch (error) {
    await client.query("rollback");
    console.log("FALHOU");
    console.error(`  ${error.message}`);
    if (error.detail) console.error(`  detalhe: ${error.detail}`);
    if (error.hint) console.error(`  dica: ${error.hint}`);
    await client.end();
    process.exit(1);
  }
}

console.log(count === 0 ? "\nnada a aplicar." : `\n${count} migração(ões) aplicada(s).`);

const { rows } = await client.query(
  `select table_name from information_schema.tables
   where table_schema = 'public' order by table_name`
);

console.log(`${rows.length} tabelas em public: ${rows.map((r) => r.table_name).join(", ")}`);

await client.end();
