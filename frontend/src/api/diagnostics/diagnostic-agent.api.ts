import type { Diagnostic } from '@/types/domain';
import { mutate } from '../client/http';

/** Avança o pipeline em um agente. A tela controla o ritmo. */
export const advanceDiagnostic = (id: string) => mutate<Diagnostic>('POST', `/diagnostics/${id}/run-agent`);
