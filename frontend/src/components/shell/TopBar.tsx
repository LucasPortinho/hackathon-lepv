import { Bell, Search } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { listNotifications, markAllRead, markRead } from '@/api/notifications/notification.api';
import { Breadcrumbs } from './Crumbs';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery(listNotifications, []);
  const unread = data.filter((n) => !n.read).length;

  return (
    <header className="topbar">
      <Breadcrumbs />
      <button className="search-btn" onClick={onSearch} aria-label="Buscar">
        <Search aria-hidden /><span>Buscar alunos, provas…</span><kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button variant="ghost" icon className="bell" aria-label={unread ? `Notificações, ${unread} não lidas` : 'Notificações'}>
            <Bell />{unread > 0 && <span className="bell-dot" aria-hidden>{unread}</span>}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="popover notif-pop" align="end" sideOffset={8}>
            <div className="notif-head">
              <h2>Notificações</h2>
              {unread > 0 && <Button variant="ghost" size="sm" onClick={() => markAllRead()}>Marcar como lidas</Button>}
            </div>
            {data.length === 0 && <p className="muted" style={{ padding: 'var(--s-3)' }}>Nada novo por aqui.</p>}
            <ul>
              {data.map((n) => (
                <li key={n.id}>
                  <button className="notif" data-unread={!n.read} onClick={() => { markRead(n.id); setOpen(false); if (n.to) nav(n.to); }}>
                    <strong>{n.title}</strong><p>{n.body}</p><small>{relativeTime(n.at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </header>
  );
}
