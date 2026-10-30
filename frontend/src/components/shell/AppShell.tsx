import { motion } from 'motion/react';
import { Tooltip } from 'radix-ui';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui';
import { transitions, variants } from '@/lib/motion';
import { CommandPalette } from './CommandPalette';
import { CrumbsProvider } from './Crumbs';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './shell.css';

/** Sheets on /dashboard must not retrigger the page transition, so the key stops at the section. */
const pageKey = (path: string) => (path.startsWith('/dashboard') ? '/dashboard' : path.split('/').slice(0, 4).join('/'));

export function AppShell() {
  const { pathname } = useLocation();
  const [search, setSearch] = useState(false);
  return (
    <Tooltip.Provider delayDuration={250}>
      <CrumbsProvider>
        <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
        <div className="shell">
          <Sidebar />
          <div className="main">
            <TopBar onSearch={() => setSearch(true)} />
            <main className="content" id="conteudo" tabIndex={-1}>
              {/* No exit animation: the old page is replaced at once, so a blank frame can never appear. */}
              <motion.div key={pageKey(pathname)} className="page" initial="hidden" animate="shown" variants={variants.page} transition={transitions.page}>
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
        <CommandPalette open={search} onOpenChange={setSearch} />
        <Toaster />
      </CrumbsProvider>
    </Tooltip.Provider>
  );
}
