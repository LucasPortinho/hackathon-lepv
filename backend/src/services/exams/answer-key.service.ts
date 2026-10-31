import { extname } from 'node:path';
import { transaction } from '../../db';
import { singleFlight } from '../../lib/async';
import { newId } from '../../lib/ids';
import { agentsEnabled } from '../../lib/llm';
import { loadPageImages } from '../../lib/page-images';
import * as examRepository from '../../repositories/exam.repository';
import type { Exam, SolutionReadResult } from '../../types/domain';
import { readSolution } from '../agents/solution.agent';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireExam } from '../shared/guards';
import { ACCEPTED_FILES, saveFile } from '../uploads/correction.service';
import { orderedQuestions } from './exam.service';

function requireOpenKey(teacherId: string, examId: string) {
  const exam = requireExam(teacherId, examId);
  if (exam.status === 'corrigida') throw new ConflictError('A prova já foi corrigida: mudar o gabarito não refaz as notas.');
  return exam;
}

/** Caminho 1: o professor informa o gabarito ou a resolução da questão. */
export function setQuestionKey(teacherId: string, examId: string, questionId: string, key: { answerKey: string | null; solution: string | null }) {
  const exam = requireOpenKey(teacherId, examId);
  if (!exam.questionIds.includes(questionId)) throw new ValidationError('A questão não pertence à prova.');
  examRepository.setQuestionKey(examId, questionId, { ...key, keySource: key.answerKey || key.solution ? 'professor' : null });
}

async function pagesOfSolution(examId: string, name: string, content: Buffer) {
  const path = await saveFile(`resolucao-${examId}`, `${newId('f')}${extname(name).toLowerCase()}`, content);
  return loadPageImages(path).catch(() => { throw new ValidationError('Não foi possível abrir o arquivo.'); });
}

/** O que o professor digitou prevalece: a leitura só preenche o restante. */
async function applySolution(exam: Exam, pages: Buffer[]): Promise<SolutionReadResult> {
  const questions = orderedQuestions(exam);
  const { keys, failedPages } = await readSolution(pages, questions.map((q) => q.statement));
  if (!keys.length) throw new ValidationError('Não encontramos a resolução de nenhuma questão neste arquivo.');
  const open = keys.filter((k) => questions[k.index].keySource !== 'professor');
  transaction(() => open.forEach(({ index, answerKey, solution }) =>
    examRepository.setQuestionKey(exam.id, questions[index].id, { answerKey, solution, keySource: 'resolucao' })));
  return { read: open.length, kept: keys.length - open.length, total: questions.length, failedPages };
}

/** Caminho 2: a resolução escaneada vira o mesmo gabarito por questão, que o professor pode conferir. */
export function uploadSolution(teacherId: string, examId: string, name: string, content: Buffer) {
  return singleFlight(`solution:${examId}`, async () => {
    const exam = requireOpenKey(teacherId, examId);
    if (!ACCEPTED_FILES.test(name)) throw new ValidationError('Formato não aceito. Use PDF, PNG ou JPG.');
    if (!agentsEnabled()) throw new ConflictError('A leitura da resolução usa a IA, que está desligada. Digite o gabarito de cada questão.');
    return applySolution(exam, await pagesOfSolution(examId, name, content));
  });
}
