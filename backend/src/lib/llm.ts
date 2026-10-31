import 'dotenv/config';

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage { role: 'system' | 'user'; content: string | ContentPart[] }
export type ModelFn = (messages: ChatMessage[]) => Promise<string>;

// Escolhido por teste: corrige certo, lê imagem e aguenta chamadas simultâneas. Modelos que ocupam
// mais concorrência, como o Kimi, enfileiram: 4 chamadas juntas levavam 50 s, contra 4 s neste.
const DEFAULT_MODEL = 'google/gemma-4-26B-A4B-it';
const TIMEOUT_MS = 120_000;
const MAX_TRIES = 3;
const RETRY_MS = 1500;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Sem chave, ou com AGENTS_MODE=regras, os agentes usam as regras locais. */
export const agentsEnabled = () => process.env.AGENTS_MODE !== 'regras' && Boolean(process.env.FEATHERLESS_API_KEY);

class TransientError extends Error {}

async function requestCompletion(messages: ChatMessage[]) {
  const key = process.env.FEATHERLESS_API_KEY;
  if (!key) throw new Error('Falta FEATHERLESS_API_KEY no .env.');
  const baseUrl = process.env.FEATHERLESS_BASE_URL ?? 'https://api.featherless.ai/v1';
  const model = process.env.FEATHERLESS_MODEL || DEFAULT_MODEL;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    // Modelos que raciocinam gastam tokens antes de responder: com limite baixo a resposta sai cortada.
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 6000 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const detail = `Erro ${response.status} da API`;
  if (RETRYABLE.has(response.status)) throw new TransientError(detail);
  if (!response.ok) throw new Error(`${detail}: ${(await response.text()).slice(0, 300)}`);
  const data = (await response.json()) as { choices: { message: { content?: string | null } }[] };
  const content = data.choices[0]?.message.content?.trim();
  if (!content) throw new TransientError('O modelo devolveu uma resposta vazia.');
  return content;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (error: unknown) =>
  error instanceof TransientError || (error instanceof Error && ['TimeoutError', 'TypeError'].includes(error.name));

/** Chama o modelo pela API da Featherless (formato OpenAI). Configuração em FEATHERLESS_* no .env. */
export const callModel: ModelFn = async (messages) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await requestCompletion(messages);
    } catch (error) {
      if (attempt === MAX_TRIES || !isTransient(error)) throw error;
      await wait(RETRY_MS * attempt);
    }
  }
};

/** Conserta os deslizes mais comuns do modelo: LaTeX sem escape e vírgula sobrando. */
const repairJson = (json: string) => json.replace(/\\(?!["\\/bfnrtu])/g, '\\\\').replace(/,(\s*[}\]])/g, '$1');

/** O modelo às vezes cerca o JSON com ``` ou escreve texto antes: extraímos só o JSON. */
export function parseJson<T>(text: string): T {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('A resposta não contém JSON.');
  const json = text.slice(start, end + 1);
  try {
    return JSON.parse(json) as T;
  } catch {
    return JSON.parse(repairJson(json)) as T;
  }
}

export const imagePart = (png: Buffer): ContentPart =>
  ({ type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } });
