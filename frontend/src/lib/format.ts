export const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
export const dateLong = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
export const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Date-only strings are calendar days: parsing them as UTC would show the previous day in Brazil. */
const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
export const formatDate = (iso: string) => dateFmt.format(toDate(iso)).replace('.', '');
export const formatDateLong = (iso: string) => dateLong.format(toDate(iso));

export function relativeTime(iso: string, now = Date.now()) {
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const firstName = (name: string) => name.split(' ')[0];
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const fileSize = (bytes: number) => (bytes > 1e6 ? `${(bytes / 1e6).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);
