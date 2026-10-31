import { transaction } from '../../db';
import { nowIso } from '../../lib/time';
import * as profileRepository from '../../repositories/profile.repository';
import { ValidationError } from '../shared/errors';
import { requireStudent, requireSubject } from '../shared/guards';
import { ensureProfile } from './profile.service';

function requireProfile(teacherId: string, studentId: string, subjectId: string) {
  requireSubject(subjectId);
  return ensureProfile(requireStudent(teacherId, studentId), subjectId);
}

export function approveProfile(teacherId: string, studentId: string, subjectId: string) {
  requireProfile(teacherId, studentId, subjectId);
  profileRepository.setReview(studentId, subjectId, 'aprovado', nowIso());
}

export function reopenProfile(teacherId: string, studentId: string, subjectId: string) {
  requireProfile(teacherId, studentId, subjectId);
  profileRepository.setReview(studentId, subjectId, 'rascunho', null);
}

export function saveProfileEdit(teacherId: string, studentId: string, subjectId: string, summary: string, gapNotes: Record<string, string>) {
  if (!summary.trim()) throw new ValidationError('O resumo do perfil não pode ficar vazio.');
  const editableGaps = requireProfile(teacherId, studentId, subjectId).gaps.filter((g) => g.id in gapNotes);
  transaction(() => {
    profileRepository.setSummary(studentId, subjectId, summary);
    profileRepository.setReview(studentId, subjectId, 'editado', null);
    editableGaps.forEach((g) => profileRepository.setGapNote(g.id, gapNotes[g.id]));
  });
}
