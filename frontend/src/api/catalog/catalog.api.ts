import type { Class, Need, Period, Subject, Subtopic, TeacherProfile } from '@/types/domain';
import { send } from '../client/http';

// Chamadas de bootstrap: dados estáveis, lidos uma vez ao abrir o app.
export const fetchTeacher = () => send<TeacherProfile>('GET', '/teachers/me');
export const fetchSubjects = () => send<Subject[]>('GET', '/subjects');
export const fetchSubtopics = (subjectId: string) => send<Subtopic[]>('GET', `/subjects/${subjectId}/subtopics`);
export const fetchPeriods = () => send<Period[]>('GET', '/periods');
export const fetchNeeds = () => send<Need[]>('GET', '/needs');
export const fetchClasses = () => send<Class[]>('GET', '/classes');
