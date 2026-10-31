export const unique = <T>(items: T[]) => [...new Set(items)];

export function groupBy<T, K, V = T>(items: T[], keyOf: (item: T) => K, valueOf: (item: T) => V = (item) => item as unknown as V) {
  const groups = new Map<K, V[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(valueOf(item));
    else groups.set(key, [valueOf(item)]);
  }
  return groups;
}
