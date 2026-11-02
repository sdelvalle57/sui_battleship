import { useContext } from 'react';
import type { AppConfig } from '../sui/config';
import { ConfigContext } from './configContext';

/** Devuelve la config de la app. Lanza si se usa fuera de `AppProviders` (error de programación, no de datos). */
export function useAppConfig(): AppConfig {
  const config = useContext(ConfigContext);
  if (config === null) {
    throw new Error('useAppConfig se usó fuera de AppProviders');
  }
  return config;
}
