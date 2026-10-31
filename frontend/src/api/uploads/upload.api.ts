import type { UploadSummary } from '@/types/domain';
import type { NewFile } from '@/types/inputs';
import { mutate, send, sendFile } from '../client/http';

interface Batch { id: string; files: { id: string; error: string | null }[] }
type Target = { examId: string } | { diagnosticId: string };

const toMetadata = (file: File): NewFile => ({ name: file.name, size: file.size, kind: 'respostas' });

const sendContent = (batchId: string, fileId: string, file: File) =>
  sendFile(`/uploads/batch/${batchId}/files/${fileId}/content`, file);

/** Cria o lote com as provas respondidas pelos alunos, envia cada arquivo aceito e devolve o id para processar. */
export async function uploadFiles(target: Target, files: File[]) {
  const batch = await send<Batch>('POST', '/uploads/batch', { ...target, files: files.map(toMetadata) });
  await Promise.all(batch.files.flatMap((created, i) => (created.error ? [] : [sendContent(batch.id, created.id, files[i])])));
  return batch.id;
}

/** Lê as folhas com o agente de correção. Pode levar alguns minutos em lotes grandes. */
export const processBatch = (batchId: string) => mutate<UploadSummary>('POST', `/uploads/batch/${batchId}/process`);
