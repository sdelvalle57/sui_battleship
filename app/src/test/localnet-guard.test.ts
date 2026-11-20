import { describe, expect, it } from 'vitest';
import { assertDeployment, checkLocalnetArgs, isLoopbackUrl, LOCALNET_URL } from '../../scripts/localnet-guard.mjs';
import { ACCEPTED, NON_STRINGS, REJECTED_STRINGS } from './localnetCorpus';

// Guarda de los scripts de captura (`app/scripts/localnet-guard.mjs`, #75): solo funciones puras, sin `process` ni red.
// `assertLocalnetUrl` (escribe por stderr y sale con 2) se verifica corriendo los tres `capture-*.mjs` con una URL hostil.
// Las listas del corpus (`ACCEPTED`, `REJECTED_STRINGS`, `NON_STRINGS`) viven en `localnetCorpus.ts` (#77): un solo corpus.

describe('isLoopbackUrl', () => {
  it('keeps the default URL on the default port', () => {
    expect(LOCALNET_URL).toBe('http://127.0.0.1:9000');
  });

  it.each(ACCEPTED)('accepts %s', (url) => {
    expect(isLoopbackUrl(url)).toBe(true);
  });

  it.each(REJECTED_STRINGS)('rejects %j', (url) => {
    expect(isLoopbackUrl(url)).toBe(false);
  });

  it.each(NON_STRINGS)('rejects a non-string value: %s', (_label, value) => {
    expect(isLoopbackUrl(value)).toBe(false);
  });
});

describe('checkLocalnetArgs', () => {
  it('uses the default URL without arguments', () => {
    expect(checkLocalnetArgs([])).toEqual({ ok: true, url: LOCALNET_URL });
  });

  it.each(ACCEPTED)('accepts --url %s and returns it', (url) => {
    expect(checkLocalnetArgs(['--url', url])).toEqual({ ok: true, url });
  });

  it.each(REJECTED_STRINGS)('rejects --url %j', (url) => {
    const result = checkLocalnetArgs(['--url', url]);
    expect(result.ok).toBe(false);
  });

  it('explains the allowed range and the default port in the rejection message', () => {
    const result = checkLocalnetArgs(['--url', 'http://localhost:19000']);
    expect(result).toEqual({
      ok: false,
      message:
        'solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); ' +
        'recibido --url http://localhost:19000.',
    });
  });

  it('rejects --url without a value', () => {
    expect(checkLocalnetArgs(['--url']).ok).toBe(false);
  });

  it('rejects a repeated --url, even when both values are valid', () => {
    expect(checkLocalnetArgs(['--url', 'http://127.0.0.1:19000', '--url', 'http://127.0.0.1:19000']).ok).toBe(false);
  });

  it('rejects an unknown argument next to a valid URL', () => {
    const result = checkLocalnetArgs(['--url', 'http://127.0.0.1:19000', '--force']);
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toContain('argumentos desconocidos: --force');
  });

  it('rejects an unknown argument without --url', () => {
    expect(checkLocalnetArgs(['--force']).ok).toBe(false);
  });

  it('rejects the --url=<value> form', () => {
    expect(checkLocalnetArgs(['--url=http://127.0.0.1:19000']).ok).toBe(false);
  });
});

describe('assertDeployment', () => {
  it('accepts a localnet deployment whose chain id matches the node', () => {
    expect(() => {
      assertDeployment({ network: 'localnet', chainId: 'cb1e492c' }, 'cb1e492c');
    }).not.toThrow();
  });

  it('throws when the deployment is not from localnet', () => {
    expect(() => {
      assertDeployment({ network: 'testnet', chainId: 'cb1e492c' }, 'cb1e492c');
    }).toThrow(/declara network "testnet"/);
  });

  it('throws when the node chain id differs from the deployment one', () => {
    expect(() => {
      assertDeployment({ network: 'localnet', chainId: 'cb1e492c' }, '4c78adac');
    }).toThrow(/otra génesis/);
  });
});
