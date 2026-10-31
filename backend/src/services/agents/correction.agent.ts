import type { Student } from '../../types/domain';
import type { ReadSheet } from '../../types/inputs';

// Agente de correção simulado: não há OCR, e os arquivos enviados não são lidos.
// A leitura é determinística para a demonstração. Um agente real entra por `readSheets`.
const PARTIAL_EVERY = 16;
const PARTIAL_OFFSET = 8;
const PARTIAL_REASONS = ['Questão 3 ilegível', 'Folha digitalizada cortada'];

const isPartial = (index: number) => index % PARTIAL_EVERY === PARTIAL_OFFSET;

function readSheet(student: Pick<Student, 'id'>, index: number): ReadSheet {
  if (!isPartial(index)) return { studentId: student.id, readStatus: 'completa' };
  return { studentId: student.id, readStatus: 'parcial', partialReason: PARTIAL_REASONS[Math.floor(index / PARTIAL_EVERY) % PARTIAL_REASONS.length] };
}

export const readSheets = (students: Pick<Student, 'id'>[]) => students.map(readSheet);
