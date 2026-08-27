/**
 * O que a chave da HubSpot realmente alcança, e a prova de ponta a ponta.
 *
 * Existe porque sondar endpoint por endpoint conclui por eliminação e erra: foi
 * assim que `cms.knowledge_base.articles.read` quase passou por "a Biblioteca
 * dá" — o escopo está concedido e não há API atrás dele. Perguntar ao token
 * quais escopos ele carrega é a única resposta que não é palpite.
 *
 * Somente leitura, em série. Sem argumento são sete pedidos; com um número de
 * atendimento, dois a mais.
 *
 * Uso:  npm run hubspot:conferir
 *       npm run hubspot:conferir -- 47673917220
 */

import { readFileSync } from "node:fs";

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

const token = readEnvFile(".env.local").HUBSPOT_ACCESS_TOKEN;

if (!token) {
  console.error(
    "HUBSPOT_ACCESS_TOKEN está vazio em .env.local.\n" +
      "Cole o token do app privado na linha que já existe lá e rode de novo."
  );
  process.exit(1);
}

const BASE = "https://api.hubapi.com";
const TIMEOUT_MS = 20000;

async function get(caminho) {
  try {
    const r = await fetch(`${BASE}${caminho}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: r.status, corpo: await r.text(), headers: r.headers };
  } catch (erro) {
    const causa = erro?.name === "TimeoutError" ? `sem resposta em ${TIMEOUT_MS} ms` : erro.message;
    return { status: 0, corpo: causa, headers: new Headers() };
  }
}

const risca = "=".repeat(70);

/* ------------------------------------------------------------------ escopos */

console.log(risca);
console.log("1. O QUE A CHAVE CARREGA  (perguntado ao próprio token)");
console.log(risca);

const info = await fetch(`${BASE}/oauth/v2/private-apps/get/access-token-info`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ tokenKey: token }),
  signal: AbortSignal.timeout(TIMEOUT_MS),
});

let escopos = [];

if (!info.ok) {
  console.log(`  não foi possível ler os escopos: ${info.status}`);
} else {
  const d = await info.json();
  escopos = d.scopes ?? [];
  console.log(`  hub ${d.hubId} · app ${d.appId} · ${escopos.length} escopos concedidos`);
}

/*
  Só os que decidem alguma coisa para o nosso ciclo. Os outros trinta e poucos
  são objeto de CRM comercial — deals, quotes, carts — que o produto não toca.
*/
const QUE_IMPORTAM = [
  ["conversations.read", "ler fios e mensagens"],
  ["crm.objects.owners.read", "resolver autor da mensagem para nome"],
  ["crm.objects.contacts.read", "resolver o contato do fio"],
  ["tickets", "ler o atendimento na HubSpot"],
  ["site-search-read", "ler artigo do portal pelo site search"],
  ["cms.knowledge_base.articles.read", "ARMADILHA: concedido, mas sem API"],
];

console.log("");
for (const [escopo, para] of QUE_IMPORTAM) {
  const tem = escopos.includes(escopo);
  console.log(`  ${tem ? "concedido" : "AUSENTE  "}  ${escopo.padEnd(34)} ${para}`);
}

/* ------------------------------------------------------------- o que responde */

console.log("");
console.log(risca);
console.log("2. O QUE RESPONDE DE VERDADE");
console.log(risca);

async function conferir(rotulo, caminho, esperado) {
  const { status, corpo, headers } = await get(caminho);
  const cota = headers.get("x-hubspot-ratelimit-remaining");
  console.log(`  ${status === esperado ? "ok" : "??"} ${String(status).padEnd(4)} ${rotulo}`);
  console.log(`        ${caminho}`);
  if (cota) console.log(`        cota: ${cota} restantes na janela`);
  if (status !== 200) {
    let msg;
    try { msg = JSON.parse(corpo).message ?? corpo; } catch { msg = corpo.slice(0, 90); }
    console.log(`        ${String(msg).slice(0, 110)}`);
  }
  console.log("");
}

await conferir("Fios de conversa", "/conversations/v3/conversations/threads?limit=1", 200);
await conferir("Responsáveis (autor da mensagem)", "/crm/v3/owners?limit=1", 200);
await conferir("Atendimentos", "/crm/v3/objects/tickets?limit=1", 403);
await conferir("Atendimentos, endpoint versionado", "/crm/objects/2026-03/tickets?limit=1", 403);
await conferir("Artigos pelo site search", "/cms/v3/site-search/search?type=KNOWLEDGE_ARTICLE&limit=1", 403);
await conferir("Artigos pela API de KB (não existe)", "/cms/v3/knowledge-base/articles?limit=1", 404);

/* ------------------------------------------------------------ ponta a ponta */

console.log(risca);
console.log("3. PONTA A PONTA  (o número da HubSpot vira conversa nossa)");
console.log(risca);

const alvo = process.argv[2];

if (!alvo) {
  console.log("  pulado. Passe um número de atendimento da HubSpot para provar:");
  console.log("    npm run hubspot:conferir -- 47673917220");
  console.log("  O mesmo número abre na HubSpot e dá para comparar linha a linha.");
} else {
  const bruto = await get(`/conversations/v3/conversations/threads?associatedTicketId=${alvo}&limit=5`);

  if (bruto.status !== 200) {
    console.log(`  ${bruto.status} ${bruto.corpo.slice(0, 150)}`);
  } else {
    const fios = JSON.parse(bruto.corpo).results ?? [];
    console.log(`  atendimento ${alvo} -> ${fios.length} fio(s)`);

    for (const fio of fios) {
      console.log(`\n  fio ${fio.id} · ${fio.status} · última mensagem ${fio.latestMessageTimestamp}`);
      const m = await get(`/conversations/v3/conversations/threads/${fio.id}/messages?limit=50`);
      if (m.status !== 200) {
        console.log(`    mensagens: ${m.status}`);
        continue;
      }

      const todas = JSON.parse(m.corpo).results ?? [];
      /*
        O endpoint mistura mensagem com evento de sistema (THREAD_STATUS_CHANGE,
        sem campo `text`). Gravar tudo faria a análise tratar mudança de status
        como evidência — por isso o filtro entra aqui, não depois.
      */
      const reais = todas.filter((x) => x.type === "MESSAGE");
      console.log(`    ${todas.length} registros, dos quais ${reais.length} são mensagem`);

      for (const x of reais.slice(0, 5)) {
        const texto = (x.text ?? "").replace(/\s+/g, " ").slice(0, 60);
        console.log(`      [${(x.direction ?? "?").padEnd(8)}] ${x.createdAt?.slice(0, 10)}  ${texto}`);
      }
      if (reais.length > 5) console.log(`      ... e mais ${reais.length - 5}`);
    }
  }
}

console.log("");
console.log(risca);
console.log("Confira na HubSpot: os escopos em Configurações > Integrações >");
console.log("Aplicativos privados, e o fio abrindo o mesmo atendimento por lá.");
console.log(risca);
