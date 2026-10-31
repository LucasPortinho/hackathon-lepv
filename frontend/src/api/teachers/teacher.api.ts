import type { Prefs } from '@/types/domain';
import { send } from '../client/http';

// Preferências mudam só a aparência: não há consulta a invalidar.
export const updatePreferences = (prefs: Partial<Prefs>) => send<Prefs>('PUT', '/teachers/me/preferences', prefs);
