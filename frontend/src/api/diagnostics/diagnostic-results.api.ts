import { mutate } from '../client/http';

/** Simula as respostas impressas: os resultados voltam aos perfis e ao painel. */
export const receiveAnswers = (id: string) => mutate('POST', `/diagnostics/${id}/answers`);
