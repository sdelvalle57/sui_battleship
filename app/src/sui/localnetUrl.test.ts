import { describe, expect, it } from 'vitest';
import * as guard from '../../scripts/localnet-guard.mjs';
import { ACCEPTED, NON_STRINGS, REJECTED_STRINGS, REJECTED_STRINGS_ENV } from '../test/localnetCorpus';
import { isLoopbackUrl, LOCALNET_URL } from './localnetUrl.mjs';

// Regla única de la URL de una localnet (#77), compartida por la guarda de las capturas y por la config de la app. Funciones
// puras, sin red. El corpus vive en `src/test/localnetCorpus.ts`: nadie declara una copia.

describe('localnetUrl: shared rule', () => {
  it('keeps the default URL on the default port 9000', () => {
    expect(LOCALNET_URL).toBe('http://127.0.0.1:9000');
  });

  it('is the very same function and constant the capture guard uses (one rule, not two copies)', () => {
    expect(guard.isLoopbackUrl).toBe(isLoopbackUrl);
    expect(guard.LOCALNET_URL).toBe(LOCALNET_URL);
  });

  it.each(ACCEPTED)('accepts %s', (url) => {
    expect(isLoopbackUrl(url)).toBe(true);
  });

  it.each(REJECTED_STRINGS)('rejects %j', (url) => {
    expect(isLoopbackUrl(url)).toBe(false);
  });

  it.each(REJECTED_STRINGS_ENV)('rejects the form that can arrive from a .env file: %j', (url) => {
    expect(isLoopbackUrl(url)).toBe(false);
  });

  it.each(NON_STRINGS)('rejects a non-string value: %s', (_label, value) => {
    expect(isLoopbackUrl(value)).toBe(false);
  });
});

// Higiene de las fronteras (D6, M-2): lee el código fuente de `src/` sin los tests y sin los arneses de `src/test/`.
const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Rutas de los archivos de `src/` (relativas a `src/`) cuyo código fuente cumple `pattern`. */
function filesMatching(pattern: RegExp): string[] {
  return Object.entries(sources)
    .filter(([, text]) => pattern.test(text))
    .map(([path]) => (path.startsWith('./') ? `sui/${path.slice(2)}` : path.replace(/^\.\.\//, '')))
    .sort();
}

describe('config boundary: where the endpoint and the environment are read', () => {
  it('finds the source files of src without the tests', () => {
    expect(filesMatching(/\bexport\b/)).toContain('sui/config.ts');
  });

  it('names NETWORKS next to grpcUrl only in config.ts and networks.ts', () => {
    expect(filesMatching(/NETWORKS(?=[\s\S]*grpcUrl)|grpcUrl(?=[\s\S]*NETWORKS)/)).toEqual([
      'sui/config.ts',
      'sui/networks.ts',
    ]);
  });

  it('reads a grpcUrl property only in config.ts and dappKit.ts, and config.grpcUrl only in dappKit.ts', () => {
    expect(filesMatching(/\.grpcUrl/)).toEqual(['sui/config.ts', 'sui/dappKit.ts']);
    expect(filesMatching(/config\.grpcUrl/)).toEqual(['sui/dappKit.ts']);
  });

  it('names VITE_LOCALNET_URL only in config.ts and vite-env.d.ts', () => {
    expect(filesMatching(/VITE_LOCALNET_URL/)).toEqual(['sui/config.ts', 'vite-env.d.ts']);
  });

  it('reads import.meta.env only in config.ts, and only by property, never as an object', () => {
    expect(filesMatching(/import\.meta\.env/)).toEqual(['sui/config.ts']);
    expect(filesMatching(/import\.meta\.env(?![.])/)).toEqual([]);
  });
});

describe('localnetCorpus: size', () => {
  it('keeps every list of the shared corpus at its recorded size, so shrinking it breaks a test', () => {
    expect(ACCEPTED).toHaveLength(4);
    expect(REJECTED_STRINGS).toHaveLength(33);
    expect(NON_STRINGS).toHaveLength(5);
    expect(REJECTED_STRINGS_ENV).toHaveLength(6);
  });
});
