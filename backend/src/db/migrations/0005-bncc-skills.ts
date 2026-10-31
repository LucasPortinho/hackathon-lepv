/**
 * Migração da versão 4: subtópicos passam a descrever habilidades da BNCC, com o grafo de pré-requisitos,
 * e a turma ganha o ano escolar. Só muda a estrutura; o catálogo entra por `npm run db:reset`.
 */
export const bnccSkillsMigration = `
ALTER TABLE subtopics ADD COLUMN unit TEXT NOT NULL DEFAULT 'Outros conteúdos' CHECK (length(trim(unit)) > 0);
ALTER TABLE subtopics ADD COLUMN knowledge_object TEXT NOT NULL DEFAULT '';
ALTER TABLE subtopics ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE subtopics ADD COLUMN years TEXT NOT NULL DEFAULT '[]' CHECK (CASE WHEN json_valid(years) THEN json_type(years) = 'array' ELSE 0 END);
ALTER TABLE subtopics ADD COLUMN keywords TEXT NOT NULL DEFAULT '[]' CHECK (CASE WHEN json_valid(keywords) THEN json_type(keywords) = 'array' ELSE 0 END);
ALTER TABLE subtopics ADD COLUMN level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0);
ALTER TABLE classes ADD COLUMN grade INTEGER CHECK (grade IS NULL OR grade BETWEEN 1 AND 9);
CREATE TABLE subtopic_prerequisites (
  subtopic_id TEXT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  prerequisite_id TEXT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  PRIMARY KEY (subtopic_id, prerequisite_id),
  CHECK (subtopic_id != prerequisite_id)
) STRICT;
CREATE INDEX subtopic_prerequisites_prerequisite_idx ON subtopic_prerequisites (prerequisite_id);
`;
