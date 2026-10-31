// Checagem de gabaritos. O modelo erra conta (ex.: arccos). Então uma segunda chamada,
// SEM ver o gabarito, escreve só a expressão que resolve cada questão; o código executa
// a expressão e compara com o gabarito.

import { chamarModelo } from "./llm.js";

const INSTRUCOES = `Você recebe questões de matemática SEM gabarito.
Para cada questão com resposta numérica, escreva uma expressão JavaScript que calcule o valor
numérico da resposta a partir dos dados do enunciado.
Regras da expressão: só números, + - * / **, parênteses e Math.* (Math.sqrt, Math.sin, Math.cos,
Math.acos, Math.PI...). Ângulos em graus: converta com *Math.PI/180. Funções inversas
(Math.acos, Math.asin, Math.atan) devolvem radianos: multiplique por 180/Math.PI para dar graus.
Se a questão não tem resposta numérica, use null.
Responda SOMENTE com JSON: {"itens":[{"indice":0,"expressao":"..."}]}`;

const EXPRESSAO_SEGURA = /^[\d\s+\-*/().,]*(Math\.(sqrt|sin|cos|tan|asin|acos|atan|PI|pow|abs|cbrt|log|log10|exp)|[\d\s+\-*/().,])*$/;

export function calcularExpressao(expr) {
  if (typeof expr !== "string" || !EXPRESSAO_SEGURA.test(expr)) return null;
  try {
    const v = new Function(`"use strict"; return (${expr});`)();
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// Extrai o número do gabarito: aceita "3/10", "86 km", "109,7°". Símbolos como √ ou π: não verificável.
export function numeroDoGabarito(q) {
  let texto = String(q.gabarito);
  if (q.tipo === "multipla_escolha") {
    const letra = texto.trim().charAt(0).toUpperCase();
    const alt = (q.alternativas || []).find((a) => a.trim().toUpperCase().startsWith(letra));
    if (!alt) return null;
    texto = alt.replace(/^\s*[A-Za-z]\)\s*/, "");
  }
  if (/[√π]/.test(texto)) return null;
  const frac = texto.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (frac) return parseFloat(frac[1].replace(",", ".")) / parseFloat(frac[2].replace(",", "."));
  const num = texto.match(/-?\d+(?:[.,]\d+)?/);
  return num ? parseFloat(num[0].replace(",", ".")) : null;
}

export function comparar(calculado, esperado) {
  return Math.abs(calculado - esperado) <= Math.max(0.02 * Math.abs(esperado), 0.5);
}

// Marca q.verificacao em cada questão: ok | divergente | nao_verificavel.
export async function verificarQuestoes(questoes) {
  let itens = [];
  try {
    const semGabarito = questoes.map((q, indice) => ({
      indice,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
    }));
    const texto = await chamarModelo([
      { role: "system", content: INSTRUCOES },
      { role: "user", content: JSON.stringify(semGabarito, null, 2) },
    ]);
    const json = JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1));
    itens = json.itens || [];
  } catch {
    // Sem a segunda chamada, nada é verificado; o professor revisa como sempre.
  }

  questoes.forEach((q, i) => {
    const item = itens.find((x) => x.indice === i);
    const calculado = item ? calcularExpressao(item.expressao) : null;
    const esperado = numeroDoGabarito(q);
    if (calculado === null || esperado === null) {
      q.verificacao = { status: "nao_verificavel" };
    } else if (comparar(calculado, esperado)) {
      q.verificacao = { status: "ok", calculado };
    } else {
      q.verificacao = { status: "divergente", calculado, esperado };
    }
  });
  return questoes;
}
