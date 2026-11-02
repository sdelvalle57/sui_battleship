import { createContext } from 'react';
import type { AppConfig } from '../sui/config';

/** Config resuelta de la app: la provee `AppProviders` y se lee con `useAppConfig`. `null` = sin provider. */
export const ConfigContext = createContext<AppConfig | null>(null);
