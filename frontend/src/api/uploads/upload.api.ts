import type { UploadSummary } from '@/types/domain';
import type { NewFile } from '@/types/inputs';
import { mutate } from '../client/http';

// Só os metadados dos arquivos vão à API: o agente de correção da demonstração não lê os bytes.
export const createBatch = (examId: string, files: NewFile[]) => mutate<{ id: string }>('POST', '/uploads/batch', { examId, files });
export const processBatch = (batchId: string) => mutate<UploadSummary>('POST', `/uploads/batch/${batchId}/process`);
