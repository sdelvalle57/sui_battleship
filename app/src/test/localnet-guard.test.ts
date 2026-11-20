import { describe, expect, it } from 'vitest';
import { assertDeployment, checkLocalnetArgs, isLoopbackUrl, LOCALNET_URL } from '../../scripts/localnet-guard.mjs';

// Guarda de los scripts de captura (`app/scripts/localnet-guard.mjs`, #75): solo funciones puras, sin `process` ni red.
// `assertLocalnetUrl` (escribe por stderr y sale con 2) se verifica corriendo los tres `capture-*.mjs` con una URL hostil.

const ACCEPTED = [
  'http://127.0.0.1:9000',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:1024',
  'http://127.0.0.1:65535',
] as const;

const REJECTED_STRINGS = [
  // puerto fuera de 1024-65535 o mal formado
  'http://127.0.0.1:1023',
  'http://127.0.0.1:0',
  'http://127.0.0.1:65536',
  'http://127.0.0.1:099999',
  'http://127.0.0.1:019000',
  'http://127.0.0.1:99999', // la regex lo acepta; lo frena el rango
  'http://127.0.0.1',
  'http://127.0.0.1:',
  'http://127.0.0.1:19000:1',
  'http://127.0.0.1:١٩٠٠٠', // dígitos arábigo-índicos
  'http://127.0.0.1:１９０００', // dígitos de ancho completo
  // path, query, fragmento, espacios y saltos de línea
  'http://127.0.0.1:19000/',
  'http://127.0.0.1:19000/x',
  'http://127.0.0.1:19000?x=1',
  'http://127.0.0.1:19000#x',
  'http://127.0.0.1:19000 ',
  ' http://127.0.0.1:19000',
  'http://127.0.0.1:19000\n',
  // esquema y host
  'https://127.0.0.1:19000',
  'HTTP://127.0.0.1:19000',
  'http://localhost:19000',
  'http://127.0.0.2:19000',
  'http://127.1:19000',
  'http://2130706433:19000',
  'http://0x7f.0.0.1:19000',
  'http://0.0.0.0:19000',
  'http://[::1]:19000',
  'http://192.168.1.10:19000',
  'http://127.0.0.1.evil.com:19000',
  // credenciales y confusión de host
  'http://127.0.0.1:9000@evil.com',
  'http://127.0.0.1:19000@evil.com',
  'http://user:pw@127.0.0.1:19000',
  '',
] as const;

const NON_STRINGS: readonly (readonly [string, unknown])[] = [
  ['undefined', undefined],
  ['null', null],
  ['number', 19000],
  ['array with the URL (coercible)', ['http://127.0.0.1:19000']],
  // El objeto String es coercible a una URL válida: solo lo frena el `typeof`.
  ['String object (coercible)', new String('http://127.0.0.1:19000')],
];

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
