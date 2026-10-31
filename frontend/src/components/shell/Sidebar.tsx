import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button, Tooltip } from '@/components/ui';
import { initials } from '@/lib/format';
import { springs } from '@/lib/motion';
import { usePrefs } from '@/lib/prefs';
import { getTeacher } from '@/api/catalog/catalog.store';
import { APP_NAME, NAV } from './nav';

const label = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } };

export function Sidebar() {
  const { prefs, set } = usePrefs();
  const { pathname } = useLocation();
  const [narrow, setNarrow] = useState(() => innerWidth < 1100);
  useEffect(() => {
    const m = matchMedia('(max-width: 1100px)');
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  const collapsed = prefs.sidebarCollapsed || narrow;
  const teacher = getTeacher();
  const toggleLabel = collapsed ? 'Expandir menu' : 'Recolher menu';

  return (
    <motion.nav className="sidebar" aria-label="Principal" initial={false} animate={{ width: collapsed ? 72 : 256 }} transition={springs.snappy}>
      <div className="brand" style={collapsed ? { paddingLeft: 0, justifyContent: 'center' } : undefined}>
        {!collapsed && <strong>{APP_NAME}</strong>}
        {!narrow && (
          <Tooltip label={toggleLabel} side="right">
            <Button variant="ghost" size="sm" icon aria-label={toggleLabel} aria-expanded={!collapsed} onClick={() => set('sidebarCollapsed', !prefs.sidebarCollapsed)}>
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </Tooltip>
        )}
      </div>
      <ul className="nav">
        {NAV.map(({ to, label: text, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to}>
              <Tooltip label={text} side="right" disabled={!collapsed}>
                <NavLink to={to} className="nav-item" aria-label={collapsed ? text : undefined}>
                  {active && <motion.i className="nav-indicator" layoutId="nav-indicator" transition={springs.snappy} />}
                  <Icon aria-hidden />
                  <AnimatePresence initial={false}>{!collapsed && <motion.span {...label}>{text}</motion.span>}</AnimatePresence>
                </NavLink>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <div className="side-foot">
        {!collapsed && <p className="demo-note">Dados fictícios de demonstração</p>}
        <NavLink to="/configuracoes" className="me" aria-label={`${teacher.name}, ${teacher.role}`}>
          <span className="avatar" aria-hidden>{initials(teacher.name)}</span>
          {!collapsed && <div><strong>{teacher.name}</strong><small>Matemática</small></div>}
        </NavLink>
      </div>
    </motion.nav>
  );
}
