/**
 * Sobe o produto no modo navegador, com a fundação compartilhada desligada.
 *
 * Existe porque a virada é uma variável do `.env.local`, e conferir o modo sem
 * servidor obrigava a editar o arquivo e lembrar de desfazer. Esquecer o
 * desfazer é a falha provável, e ela deixa a equipe inteira sem banco.
 *
 * Variável já presente em `process.env` tem precedência sobre `.env.local` no
 * Next — é o que faz isto funcionar sem tocar no arquivo.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const port = process.env.PORT ?? "3100";

/*
  Chama o binário do Next pelo Node em vez de passar por `npx`: no Windows o
  `npx.cmd` é um script de shell, e o Node recusa executá-lo direto com
  `EINVAL`.
*/
const next = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [next, "dev", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_SHARED_WORKSPACE: "off" },
});

child.on("exit", (code) => process.exit(code ?? 0));
