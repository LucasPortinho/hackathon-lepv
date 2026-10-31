import { transaction } from '../../db';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as scoreRepository from '../../repositories/score.repository';
import type { Diagnostic } from '../../types/domain';
import { recordRun } from '../agent-runs/agent-run.service';
import { periodWindow } from '../catalog/catalog.service';
import { refreshProfile } from '../profiles/profile.service';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { ConflictError } from '../shared/errors';
import { requireDiagnostic } from '../shared/guards';

const ANSWERS_BONUS = 7;
const MAX_SCORE = 100;

function raiseScores(d: Diagnostic, studentId: string, periodId: string, scoreOf: ClassScores['scoreOf']) {
  for (const subtopicId of d.subtopicIds) {
    const value = scoreOf(studentId, subtopicId, periodId);
    if (value !== null) scoreRepository.updateValue({ studentId, subtopicId, periodId, value: Math.min(MAX_SCORE, value + ANSWERS_BONUS) });
  }
}

function completeSteps({ id, perStudent }: Diagnostic) {
  diagnosticRepository.updateStep(id, 'respostas', { status: 'concluido', result: `${perStudent.length} respostas recebidas` });
  diagnosticRepository.updateStep(id, 'devolutiva', { status: 'concluido', result: 'Perfis e painel atualizados' });
  diagnosticRepository.setStage(id, 'concluida');
}

/** Substituto de demonstração do envio das respostas: sobe as notas estudadas e refaz os perfis. */
export function receiveAnswers(teacherId: string, id: string) {
  const d = requireDiagnostic(teacherId, id);
  if (d.stage !== 'respostas') throw new ConflictError('A avaliação não está aguardando respostas.');
  const periodId = periodWindow().current.id;
  const { students, scoreOf } = loadClassScores(d.classId);
  const selected = students.filter((s) => d.perStudent.some((p) => p.studentId === s.id));

  transaction(() => {
    completeSteps(d);
    selected.forEach((s) => raiseScores(d, s.id, periodId, scoreOf));
    selected.forEach((s) => refreshProfile(s, d.subjectId));
    recordRun({
      teacherId, diagnosticId: id, agent: 'pedagogico', status: 'atencao',
      summary: `Atualizou ${selected.length} perfis com os resultados de ${d.title}`, detail: 'Os perfis voltaram para a sua revisão.',
      link: { label: 'Abrir painel', to: '/dashboard' },
    });
  });
}
