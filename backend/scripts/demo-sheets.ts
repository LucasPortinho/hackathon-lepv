// Gera folhas de resposta fictícias em demo-sheets/, para testar o agente de correção.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { DEMO_TEACHER_ID as T } from '../src/db/seed/data/catalog';
import { mapLimit } from '../src/lib/async';
import { callModel } from '../src/lib/llm';
import { getDiagnostic } from '../src/services/diagnostics/diagnostic.service';
import { getExam } from '../src/services/exams/exam.service';
import { loadClassScores } from '../src/services/shared/class-scores';

const OUT = 'demo-sheets';
const WIDTH = 900;
const LINE = 34;
const SHEETS_PER_EXAM = 4;

function wrap(text: string, max = 62) {
  return text.split('\n').flatMap((line) => {
    const out: string[] = [];
    let current = '';
    for (const word of line.split(' ')) {
      if (`${current} ${word}`.length > max) { out.push(current); current = word; } else current = current ? `${current} ${word}` : word;
    }
    return [...out, current];
  });
}

function render(title: string, student: string, answers: string[]) {
  const lines = [title, '', `Aluno: ${student}`, '', ...answers.flatMap((a, i) => [...wrap(`Questão ${i + 1}: ${a}`), ''])];
  const canvas = createCanvas(WIDTH, 80 + lines.length * LINE);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  ctx.font = '26px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 40, 50 + i * LINE));
  return canvas.toBuffer('image/png');
}

function save(folder: string, name: string, png: Buffer) {
  mkdirSync(join(OUT, folder), { recursive: true });
  writeFileSync(join(OUT, folder, `${name.replace(/\s+/g, '-')}.png`), png);
}

const solve = (statement: string) =>
  callModel([{ role: 'user', content: `Resolva em no máximo duas linhas, como um aluno, em texto simples e sem LaTeX:\n${statement}` }]);

/** Mistura respostas certas e erradas, para a correção ter o que diferenciar. */
const isWrong = (student: number, question: number) => (student + question) % 3 === 0;

async function examSheets(examId: string) {
  const { exam, questions } = getExam(T, examId);
  const { students } = loadClassScores(exam.classId);
  const solutions = await mapLimit(questions, 4, (q) => solve(q.statement));
  students.slice(0, SHEETS_PER_EXAM).forEach((s, i) => {
    save(`prova-${examId}`, s.name, render(exam.title, s.name, solutions.map((answer, q) => (isWrong(i, q) ? 'Não consegui terminar a conta.' : answer))));
  });
}

async function diagnosticSheets(id: string) {
  const { diagnostic, students } = getDiagnostic(T, id);
  for (const [i, plan] of diagnostic.perStudent.slice(0, SHEETS_PER_EXAM).entries()) {
    const name = students[plan.studentId].name;
    save(`diagnostico-${id}`, name, render(diagnostic.title, name, await mapLimit(plan.items, 4, (item, q) => (isWrong(i, q) ? Promise.resolve('Em branco') : item.answerKey ? Promise.resolve(item.answerKey) : solve(item.statement)))));
  }
}

Promise.all([examSheets(process.argv[2] ?? 'e-pitagoras'), diagnosticSheets(process.argv[3] ?? 'd-pitagoras')])
  .then(() => console.log(`Folhas geradas em ${OUT}/.`));
