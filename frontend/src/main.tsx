import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import '@/components/ui/ui.css';
import '@/components/shell/shell.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyMotionTokens } from './lib/motion';
import { PrefsProvider } from './lib/prefs';

applyMotionTokens(document.documentElement);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
      <App />
    </PrefsProvider>
  </StrictMode>,
);
