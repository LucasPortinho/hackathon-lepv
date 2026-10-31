// Roda o CRIA com os diagnósticos de exemplo.
//   npm start       chama o modelo (precisa da chave no .env)
//   npm run dry     só mostra o que seria enviado, sem chamar o modelo

import { readFile } from "node:fs/promises";
import { criarQuestoes, montarPedido } from "./cria.js";

const dry = process.argv.includes("--dry");
const url = new URL("../exemplos/diagnosticos.json", import.meta.url);
const diagnosticos = JSON.parse(await readFile(url, "utf8"));

for (const d of diagnosticos) {
  console.log(`\n=== ${d.aluno} | ${d.competencia} | score ${d.score} ===`);
  if (dry) {
    const { foco } = montarPedido(d);
    console.log(`Foco escolhido: ${foco.assunto}`);
    console.log(`Motivo: ${foco.motivo}`);
    continue;
  }
  try {
    const resultado = await criarQuestoes(d);
    console.log(JSON.stringify(resultado, null, 2));
  } catch (erro) {
    console.error(erro.message);
  }
}
