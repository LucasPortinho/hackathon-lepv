import { changed } from './invalidation';
import { getScenario, SLOW_MS } from './scenario';

const BASE = '/api/v1';
const GENERIC_ERROR = 'Não foi possível concluir a operação.';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function connect(method: Method, path: string, body: unknown) {
  try {
    return await fetch(BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API.', 0, 'NETWORK_ERROR');
  }
}

async function toApiError(response: Response) {
  const payload = await response.json().catch(() => null);
  return new ApiError(payload?.error?.message ?? GENERIC_ERROR, response.status, payload?.error?.code ?? 'UNKNOWN');
}

/** Chamada crua: sem cenário de demonstração e sem invalidar consultas. */
export async function send<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await connect(method, path, body);
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export async function sendFile<T = void>(path: string, file: File): Promise<T> {
  const response = await fetch(BASE + path, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
    .catch(() => { throw new ApiError('Não foi possível enviar o arquivo.', 0, 'NETWORK_ERROR'); });
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Leitura das telas. Os cenários mostram carregamento, erro e vazio sob demanda. */
export async function get<T>(path: string, options: { empty?: T } = {}): Promise<T> {
  const scenario = getScenario();
  if (scenario === 'lento') await wait(SLOW_MS);
  if (scenario === 'erro') throw new ApiError('Não foi possível carregar os dados.', 0, 'SCENARIO');
  if (scenario === 'vazio' && options.empty !== undefined) return options.empty;
  return send<T>('GET', path);
}

/** Escritas ignoram os cenários: a demonstração nunca perde uma aprovação. */
export async function mutate<T = void>(method: Exclude<Method, 'GET'>, path: string, body?: unknown): Promise<T> {
  const result = await send<T>(method, path, body);
  changed();
  return result;
}

/** Escrita que também muda o catálogo: as telas só atualizam depois de ele estar em dia. */
export async function mutateCatalog<T = void>(method: Exclude<Method, 'GET'>, path: string, body: unknown, reload: () => Promise<void>): Promise<T> {
  const result = await send<T>(method, path, body);
  await reload();
  changed();
  return result;
}

export const withQuery = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params)}`;
