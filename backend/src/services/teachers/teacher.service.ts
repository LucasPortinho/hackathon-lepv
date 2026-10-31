import * as teacherRepository from '../../repositories/teacher.repository';
import type { Preferences } from '../../repositories/teacher.repository';
import { requireTeacher } from '../shared/guards';

export const getTeacher = requireTeacher;

export function getPreferences(teacherId: string) {
  return updatePreferences(teacherId, {});
}

export function updatePreferences(teacherId: string, prefs: Partial<Preferences>) {
  requireTeacher(teacherId);
  teacherRepository.savePreferences(teacherId, prefs);
  return teacherRepository.findPreferences(teacherId)!;
}
