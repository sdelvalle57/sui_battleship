import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ConfigError } from './components/ConfigError';
import { loadConfig } from './sui/config';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('No se encontró el elemento #root en index.html');
}

const result = loadConfig();

createRoot(rootElement).render(
  <StrictMode>{result.ok ? <App /> : <ConfigError message={result.error} />}</StrictMode>,
);
