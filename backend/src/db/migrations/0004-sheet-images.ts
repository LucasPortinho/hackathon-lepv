/** Migração da versão 3: guarda a imagem de cada folha corrigida. Folhas antigas ficam sem imagem. */
export const sheetImagesMigration = `
ALTER TABLE exam_answer_sheets ADD COLUMN image_path TEXT;
`;
