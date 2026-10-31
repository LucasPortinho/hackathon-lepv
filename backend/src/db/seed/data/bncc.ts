import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Subject } from '../../../types/domain';

interface BnccSkill {
  nome: string;
  descricao_bncc: string;
  anos: number[];
  unidade_tematica: string;
  objeto_conhecimento: string;
  palavras_chave: string[];
  pre_requisitos: string[];
  nivel: number;
  ordem: number;
}
interface BnccFile { disciplina: string; habilidades: Record<string, BnccSkill> }

const FILES = { mat: 'matematica', por: 'portugues', cie: 'ciencias', his: 'historia', geo: 'geografia' };

const read = (file: string): BnccFile => JSON.parse(readFileSync(join(__dirname, 'bncc', `${file}.json`), 'utf8'));

const sources = Object.entries(FILES).map(([subjectId, file]) => ({ subjectId, ...read(file) }));
const skillsOf = (source: (typeof sources)[number]) => Object.entries(source.habilidades);

export const bnccSubjects: Subject[] = sources.map((s) => ({ id: s.subjectId, name: s.disciplina }));

/** Cada habilidade é um subtópico: o código da BNCC é o id, e `ordem` já dá uma sequência de estudo válida. */
export const bnccSubtopics = sources.flatMap((source) => skillsOf(source).map(([code, skill]) => ({
  id: code,
  subjectId: source.subjectId,
  name: skill.nome,
  short: code.replace(/^EF/, ''),
  position: skill.ordem,
  unit: skill.unidade_tematica,
  knowledgeObject: skill.objeto_conhecimento,
  description: skill.descricao_bncc,
  years: skill.anos,
  keywords: skill.palavras_chave,
  level: skill.nivel,
})));

export const bnccPrerequisites = sources.flatMap((source) => skillsOf(source).flatMap(([code, skill]) =>
  skill.pre_requisitos.map((prerequisiteId) => ({ subtopicId: code, prerequisiteId }))));
