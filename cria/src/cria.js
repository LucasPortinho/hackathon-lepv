// Agente CRIA: diagnóstico do PED -> questões personalizadas.

import { SYSTEM_PROMPT, montarMensagem } from "./prompt.js";
import { chamarModelo } from "./llm.js";
import { verificarQuestoes } from "./verificar.js";

const LIMITE_LACUNA = 60; // abaixo disso, a base está fraca: volta ao pré-requisito

// Decide o assunto das questões. Regra do projeto: se a lacuna vem de uma
// matéria anterior, o CRIA volta até ela.
export function escolherFoco(d) {
  if (d.causa === "tecnica" && d.prerequisito && d.score < LIMITE_LACUNA) {
    return {
      assunto: d.prerequisito,
      motivo: `A dificuldade em "${d.competencia}" vem de uma base fraca em "${d.prerequisito}".`,
    };
  }
  return {
    assunto: d.competencia,
    motivo: `O aluno precisa reforçar "${d.competencia}".`,
  };
}

function validarDiagnostico(d) {
  const faltando = ["aluno", "materia", "competencia", "score", "causa"].filter(
    (c) => d[c] === undefined || d[c] === null
  );
  if (faltando.length) throw new Error(`Diagnóstico incompleto, faltam: ${faltando.join(", ")}`);
  if (typeof d.score !== "number" || d.score < 1 || d.score > 100) {
    throw new Error("score deve ser um número de 1 a 100");
  }
}

// O modelo às vezes cerca o JSON com ``` ou escreve texto antes. Extraímos o JSON.
function extrairJson(texto) {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1) throw new Error("A resposta não contém JSON.");
  return JSON.parse(texto.slice(inicio, fim + 1));
}

function validarQuestoes(resultado) {
  if (!Array.isArray(resultado.questoes) || resultado.questoes.length === 0) {
    throw new Error("Resposta sem lista de questões.");
  }
  for (const q of resultado.questoes) {
    for (const campo of ["enunciado", "tipo", "gabarito", "resolucao", "dificuldade"]) {
      if (!q[campo]) throw new Error(`Questão sem o campo "${campo}".`);
    }
    if (!Array.isArray(q.alternativas)) q.alternativas = [];
  }
}

export function montarPedido(diagnostico, quantidade = 3) {
  validarDiagnostico(diagnostico);
  const foco = escolherFoco(diagnostico);
  return {
    foco,
    mensagens: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: montarMensagem(diagnostico, foco, quantidade) },
    ],
  };
}

export async function criarQuestoes(diagnostico, quantidade = 3, tentativas = 2) {
  const { foco, mensagens } = montarPedido(diagnostico, quantidade);
  let melhor = null;
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const texto = await chamarModelo(mensagens);
      const resultado = extrairJson(texto);
      validarQuestoes(resultado);
      await verificarQuestoes(resultado.questoes);
      const divergentes = resultado.questoes.filter((q) => q.verificacao.status === "divergente").length;
      if (!melhor || divergentes < melhor.divergentes) melhor = { questoes: resultado.questoes, divergentes };
      if (divergentes === 0) break; // gabaritos conferem: não precisa tentar de novo
    } catch (erro) {
      ultimoErro = erro; // JSON malformado: tenta de novo
    }
  }
  if (!melhor) {
    throw new Error(`Falha ao criar questões para ${diagnostico.aluno}: ${ultimoErro.message}`);
  }
  return { aluno: diagnostico.aluno, foco, questoes: melhor.questoes };
}
