import { ClipboardList, FileText, GraduationCap, LayoutGrid, Settings, Users, type LucideIcon } from 'lucide-react';

export const APP_NAME = 'Crayon';

export const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/turmas', label: 'Turmas', icon: GraduationCap },
  { to: '/provas', label: 'Provas', icon: FileText },
  { to: '/diagnosticas', label: 'Avaliações Diagnósticas', icon: ClipboardList },
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];
