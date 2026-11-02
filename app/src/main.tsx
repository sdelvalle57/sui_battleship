import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ConfigError } from './components/ConfigError';
import { AppProviders } from './providers/AppProviders';
import { loadConfig } from './sui/config';
import { createAppDAppKit } from './sui/dappKit';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('No se encontró el elemento #root en index.html');
}

function rootContent(): ReactNode {
  const result = loadConfig();
  if (!result.ok) {
    return <ConfigError message={result.error} />;
  }
  const dAppKit = createAppDAppKit(result.config);
  return (
    <AppProviders dAppKit={dAppKit} config={result.config}>
      <App />
    </AppProviders>
  );
}

createRoot(rootElement).render(<StrictMode>{rootContent()}</StrictMode>);
