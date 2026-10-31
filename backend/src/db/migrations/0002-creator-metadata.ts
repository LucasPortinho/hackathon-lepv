/** Migração aditiva: preserva IDs, conteúdo, respostas, views e triggers da versão 1. */
export const creatorMetadataMigration = `
ALTER TABLE questions ADD COLUMN alternatives TEXT NOT NULL DEFAULT '[]' CHECK (CASE WHEN json_valid(alternatives) THEN json_type(alternatives) = 'array' ELSE 0 END);
ALTER TABLE questions ADD COLUMN answer_key TEXT;
ALTER TABLE questions ADD COLUMN solution TEXT;
ALTER TABLE questions ADD COLUMN difficulty TEXT CHECK (difficulty IN ('facil', 'media', 'dificil'));
ALTER TABLE questions ADD COLUMN check_result TEXT NOT NULL DEFAULT 'nao_verificavel' CHECK (check_result IN ('ok', 'divergente', 'nao_verificavel'));
ALTER TABLE competency_gaps ADD COLUMN prerequisite TEXT CHECK (prerequisite IS NULL OR length(trim(prerequisite)) > 0);
ALTER TABLE diagnostic_items ADD COLUMN alternatives TEXT NOT NULL DEFAULT '[]' CHECK (CASE WHEN json_valid(alternatives) THEN json_type(alternatives) = 'array' ELSE 0 END);
ALTER TABLE diagnostic_items ADD COLUMN answer_key TEXT;
ALTER TABLE diagnostic_items ADD COLUMN solution TEXT;
ALTER TABLE diagnostic_items ADD COLUMN difficulty TEXT CHECK (difficulty IN ('facil', 'media', 'dificil'));
ALTER TABLE diagnostic_items ADD COLUMN check_result TEXT NOT NULL DEFAULT 'nao_verificavel' CHECK (check_result IN ('ok', 'divergente', 'nao_verificavel'));
ALTER TABLE diagnostic_items ADD COLUMN prerequisite TEXT CHECK (prerequisite IS NULL OR length(trim(prerequisite)) > 0);
`;
