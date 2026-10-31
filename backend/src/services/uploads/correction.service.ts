import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AGENT_CONCURRENCY, mapLimit } from '../../lib/async';
import { loadPageImages } from '../../lib/page-images';
import * as uploadRepository from '../../repositories/upload.repository';
import type { SheetReadStatus } from '../../types/domain';
import { gradeSheet, identifySheet, matchStudent, type GradableQuestion, type GradedAnswer } from '../agents/correction.agent';
import { ConflictError } from '../shared/errors';

export const ACCEPTED_FILES = /\.(pdf|png|jpe?g)$/i;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
const UNREADABLE = 'Não foi possível ler esta folha.';
const UNIDENTIFIED = 'Aluno não identificado.';

export interface PageResult<S> {
  student: S | null;
  studentName: string | null;
  readStatus: SheetReadStatus;
  partialReason: string | null;
  extractedText: string | null;
  answers: GradedAnswer[];
}

export async function saveFile(batchId: string, fileName: string, content: Buffer) {
  const path = resolve(UPLOAD_DIR, batchId, fileName);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return path;
}

async function pagesOf(path: string): Promise<(Buffer | null)[]> {
  try {
    return await loadPageImages(path);
  } catch (error) {
    console.error(`Falha ao abrir ${path}:`, error);
    return [null];
  }
}

/** Páginas das folhas de resposta do lote; `null` marca um arquivo que não abriu. */
export async function loadAnswerPages(batchId: string) {
  const files = uploadRepository.listFiles(batchId).filter((f) => f.kind === 'respostas' && f.storagePath && !f.error);
  if (!files.length) throw new ConflictError('Envie ao menos um arquivo com as folhas de resposta.');
  return (await mapLimit(files, AGENT_CONCURRENCY, (f) => pagesOf(f.storagePath!))).flat();
}

const failedPage = <S>(reason: string): PageResult<S> =>
  ({ student: null, studentName: null, readStatus: 'erro', partialReason: reason, extractedText: null, answers: [] });

function gradedPage<S>(student: S | null, studentName: string | null, answers: GradedAnswer[]): PageResult<S> {
  const illegible = answers.filter((a) => a.awardedPoints === null).length;
  const reason = !student ? UNIDENTIFIED : illegible ? `${illegible} ${illegible === 1 ? 'questão ilegível' : 'questões ilegíveis'}` : null;
  return {
    student, studentName, answers, partialReason: reason,
    readStatus: reason ? 'parcial' : 'completa',
    extractedText: answers.map((a) => a.answer).filter(Boolean).join('\n') || null,
  };
}

async function correctPage<S extends { name: string }>(png: Buffer, students: S[], questionsFor: (student: S | null) => GradableQuestion[] | null): Promise<PageResult<S>> {
  try {
    const identity = await identifySheet(png, students.map((s) => s.name));
    if (!identity.legible) return failedPage(identity.reason ?? UNREADABLE);
    const student = matchStudent(identity.name, students);
    const questions = questionsFor(student);
    if (!questions) return { ...failedPage(UNIDENTIFIED), studentName: identity.name, readStatus: 'parcial' };
    return gradedPage(student, identity.name, await gradeSheet(png, questions));
  } catch (error) {
    console.error('Agente de correção falhou:', error);
    return failedPage(UNREADABLE);
  }
}

/** Falha de leitura vira folha sinalizada: a correção nunca inventa uma nota. */
export const correctPages = <S extends { name: string }>(pages: (Buffer | null)[], students: S[], questionsFor: (student: S | null) => GradableQuestion[] | null) =>
  mapLimit(pages, AGENT_CONCURRENCY, (png) => (png ? correctPage(png, students, questionsFor) : Promise.resolve(failedPage<S>(UNREADABLE))));
