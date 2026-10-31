import type { NeedId, Student } from '../../../types/domain';

const NAMES_9B = [
  'Ana Beatriz Moreira', 'Arthur Vasconcelos', 'Bruno Takahashi', 'Camila Nascimento', 'Carolina Prado', 'Davi Oliveira', 'Eduarda Figueiredo', 'Enzo Martins',
  'Felipe Araújo', 'Gabriela Souza', 'Giovanna Ferreira', 'Guilherme Rocha', 'Heitor Cavalcanti', 'Helena Duarte', 'Igor Monteiro', 'Isabela Ramos',
  'João Pedro Lima', 'Júlia Fernandes Albuquerque de Castro', 'Kauã Silveira', 'Larissa Andrade', 'Lucas Gabriel Pereira', 'Manuela Costa', 'Matheus Ribeiro', 'Maria Eduarda Santos',
  'Nicole Teixeira', 'Otávio Barbosa', 'Pedro Henrique Dias', 'Pietra Mendes', 'Rafael Tavares', 'Sofia Carvalho', 'Thiago Correia', 'Valentina Lopes', 'Vinícius Azevedo', 'Yasmin Gomes',
];
const NAMES_9A = ['Alice Campos', 'Benício Nunes', 'Cecília Porto', 'Daniel Freitas', 'Elisa Moura', 'Fábio Antunes', 'Gustavo Reis', 'Lívia Batista', 'Miguel Pires', 'Natália Cunha', 'Samuel Viana', 'Tainá Rezende'];
const NAMES_9C = ['Amanda Braga', 'Caio Sampaio', 'Letícia Farias', 'Marcos Vieira', 'Paula Xavier', 'Renan Coelho'];

const DECLARED: Record<string, NeedId[]> = {
  'Gabriela Souza': ['dislexia'],
  'Heitor Cavalcanti': ['tdah'],
  'Manuela Costa': ['dislexia', 'tdah'],
  'Thiago Correia': ['daltonismo'],
  'Sofia Carvalho': ['tea'],
  'Otávio Barbosa': ['discalculia'],
  'Tainá Rezende': ['dislexia'],
};

const toStudents = (names: string[], classId: string): Student[] =>
  names.map((name, i) => ({ id: `${classId}-s${i + 1}`, name, classId, declaredNeeds: DECLARED[name] ?? [] }));

export const students: Student[] = [...toStudents(NAMES_9B, 'c-9b'), ...toStudents(NAMES_9A, 'c-9a'), ...toStudents(NAMES_9C, 'c-9c')];
