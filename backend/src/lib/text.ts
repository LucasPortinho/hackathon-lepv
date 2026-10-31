export const firstName = (name: string) => name.split(' ')[0];
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
