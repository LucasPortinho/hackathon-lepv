import * as classRepository from '../../repositories/class.repository';

export const listClasses = (teacherId: string) => classRepository.listByTeacher(teacherId);
