/** Migração da versão 2: gabarito por prova, memória de perfis e o nome correto das folhas de resposta. */
export const examAnswerKeysMigration = `
ALTER TABLE exam_questions ADD COLUMN answer_key TEXT;
ALTER TABLE exam_questions ADD COLUMN solution TEXT;
ALTER TABLE exam_questions ADD COLUMN key_source TEXT CHECK (key_source IN ('professor', 'resolucao'));
CREATE TABLE profile_history (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  overall REAL NOT NULL,
  summary TEXT NOT NULL,
  competencies TEXT NOT NULL,
  review TEXT NOT NULL CHECK (review IN ('aprovado', 'editado')),
  recorded_at TEXT NOT NULL
) STRICT;
CREATE INDEX profile_history_student_idx ON profile_history (student_id, subject_id, recorded_at);
CREATE TABLE upload_files_v3 (
  id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('prova', 'respostas')),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  storage_path TEXT,
  error TEXT
) STRICT;
INSERT INTO upload_files_v3 (id, batch_id, name, size, kind, progress, storage_path, error)
  SELECT id, batch_id, name, size, CASE kind WHEN 'gabarito' THEN 'respostas' ELSE kind END, progress, storage_path, error FROM upload_files;
DROP TABLE upload_files;
ALTER TABLE upload_files_v3 RENAME TO upload_files;
CREATE INDEX upload_files_batch_idx ON upload_files (batch_id);
`;
