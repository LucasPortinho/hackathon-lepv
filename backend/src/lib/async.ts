/** Como `Promise.all` com `map`, com no máximo `limit` itens em andamento. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const running = new Map<string, Promise<unknown>>();

/** Quem pede a mesma operação em andamento recebe a mesma promessa, em vez de repeti-la. */
export function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const current = running.get(key) as Promise<T> | undefined;
  if (current) return current;
  const started = run().finally(() => running.delete(key));
  running.set(key, started);
  return started;
}

export const AGENT_CONCURRENCY = 8;
/** Trabalho em segundo plano não pode tirar a vez de quem está esperando na tela. */
export const BACKGROUND_CONCURRENCY = 2;
