import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import '@/components/ui/ui.css';
import '@/components/shell/shell.css';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapCatalog } from '@/api/catalog/catalog.store';
import { ApiError } from '@/api/client/http';
import { ErrorState, toast } from '@/components/ui';
import { App } from './App';
import { applyMotionTokens } from './lib/motion';
import { PrefsProvider } from './lib/prefs';

applyMotionTokens(document.documentElement);

const root = createRoot(document.getElementById('root')!);

const render = (content: ReactNode) => root.render(
  <StrictMode>
    <PrefsProvider>{content}</PrefsProvider>
  </StrictMode>,
);

/** Falha de escrita não derruba a tela: a mensagem da API vira um aviso. */
addEventListener('unhandledrejection', (event) => {
  if (!(event.reason instanceof ApiError)) return;
  event.preventDefault();
  toast(event.reason.message);
});

bootstrapCatalog().then(
  () => render(<App />),
  () => render(<ErrorState message="A API não respondeu. Inicie o backend e tente de novo." onRetry={() => location.reload()} />),
);
