import type { NeedId } from '@/types/domain';

export const NEEDS: { id: NeedId; label: string; hint: string }[] = [
  { id: 'daltonismo', label: 'Daltonismo', hint: 'Figuras identificadas por rótulo, não por cor' },
  { id: 'tdah', label: 'TDAH', hint: 'Enunciados em etapas curtas' },
  { id: 'tea', label: 'TEA', hint: 'Linguagem direta, sem sentido figurado' },
  { id: 'dislexia', label: 'Dislexia', hint: 'Frases curtas e dados destacados' },
  { id: 'discalculia', label: 'Discalculia', hint: 'Valores simplificados e fórmula de apoio' },
];

export const needLabel = (id: NeedId) => NEEDS.find((n) => n.id === id)!.label;
export const needsLabel = (ids: NeedId[]) => ids.map(needLabel).join(' + ');
