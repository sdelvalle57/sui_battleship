import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACCEPTED, REJECTED_STRINGS, REJECTED_STRINGS_ENV } from '../test/localnetCorpus';
import { loadConfig, resolveConfig } from './config';
import { NETWORKS } from './networks';

const fixtures = import.meta.glob<unknown>('../../../contracts/scripts/fixtures/localnet.deployment.json', {
  eager: true,
  import: 'default',
});
const localnetFixture = fixtures['../../../contracts/scripts/fixtures/localnet.deployment.json'];

const LOCALNET_KEY = '../../../contracts/deployments/localnet.json';
const TESTNET_KEY = '../../../contracts/deployments/testnet.json';

/** JSON sintético de testnet con los IDs ficticios del ejemplo de `contracts/README.md` ("Despliegues"). */
const TESTNET_DEPLOYMENT = {
  schemaVersion: 1,
  network: 'testnet',
  chainId: '4c78adac',
  packageId: '0x1111111111111111111111111111111111111111111111111111111111111111',
  originalPackageId: '0x1111111111111111111111111111111111111111111111111111111111111111',
  packageVersion: 1,
  upgradeCapId: '0x2222222222222222222222222222222222222222222222222222222222222222',
  houseId: '0x3333333333333333333333333333333333333333333333333333333333333333',
  houseCapId: '0x4444444444444444444444444444444444444444444444444444444444444444',
  publishTxDigest: '11111111111111111111111111111111',
  publishTimestamp: '2026-11-05T14:03:12.345Z',
  sourceCommit: '5555555555555555555555555555555555555555',
  suiCliVersion: '1.83.0-16d2dc1e05ed',
  frameworkRev: '719fb2960ccfbf9f4d33041f8ea5146d30671696',
};

const TESTNET_ENV = { VITE_SUI_NETWORK: 'testnet', DEV: false };

/** `testnet.json` con campos reemplazados; un valor `undefined` quita la clave (como un campo ausente del JSON). */
function testnetWith(overrides: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...TESTNET_DEPLOYMENT, ...overrides };
  return { [TESTNET_KEY]: Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined)) };
}

function errorOf(result: ReturnType<typeof resolveConfig>): string {
  if (result.ok) {
    throw new Error('se esperaba un error de configuración');
  }
  return result.error;
}

describe('resolveConfig: valid deployments', () => {
  it('resolves the real localnet fixture', () => {
    expect(resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: false }, { [LOCALNET_KEY]: localnetFixture })).toEqual({
      ok: true,
      config: {
        network: 'localnet',
        grpcUrl: 'http://127.0.0.1:9000',
        chainId: 'cb1e492c',
        packageId: '0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d',
        originalPackageId: '0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d',
        houseId: '0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035',
        publishTxDigest: 'BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH',
        burnerWalletEnabled: false,
      },
    });
  });

  it('resolves a synthetic testnet deployment', () => {
    expect(resolveConfig(TESTNET_ENV, { [TESTNET_KEY]: TESTNET_DEPLOYMENT })).toEqual({
      ok: true,
      config: {
        network: 'testnet',
        grpcUrl: 'https://fullnode.testnet.sui.io:443',
        chainId: '4c78adac',
        packageId: TESTNET_DEPLOYMENT.packageId,
        originalPackageId: TESTNET_DEPLOYMENT.originalPackageId,
        houseId: TESTNET_DEPLOYMENT.houseId,
        publishTxDigest: TESTNET_DEPLOYMENT.publishTxDigest,
        burnerWalletEnabled: false,
      },
    });
  });

  it('keeps packageId and originalPackageId apart after an upgrade', () => {
    const upgraded = `0x${'a'.repeat(64)}`;
    const result = resolveConfig(TESTNET_ENV, testnetWith({ packageId: upgraded }));
    expect(result.ok && result.config.packageId).toBe(upgraded);
    expect(result.ok && result.config.originalPackageId).toBe(TESTNET_DEPLOYMENT.originalPackageId);
  });

  it('picks the file for the selected network when both are present', () => {
    const result = resolveConfig(TESTNET_ENV, { [LOCALNET_KEY]: localnetFixture, [TESTNET_KEY]: TESTNET_DEPLOYMENT });
    expect(result.ok && result.config.network).toBe('testnet');
  });

  it('ignores unknown keys and absent unused fields', () => {
    const { schemaVersion, network, chainId, packageId, originalPackageId, houseId, publishTxDigest } = TESTNET_DEPLOYMENT;
    const minimal = { schemaVersion, network, chainId, packageId, originalPackageId, houseId, publishTxDigest, futureField: { x: 1 } };
    expect(resolveConfig(TESTNET_ENV, { [TESTNET_KEY]: minimal }).ok).toBe(true);
  });
});

describe('resolveConfig: VITE_SUI_NETWORK', () => {
  it('rejects a missing variable', () => {
    expect(errorOf(resolveConfig({ DEV: true }, { [LOCALNET_KEY]: localnetFixture }))).toBe(
      'Falta VITE_SUI_NETWORK (localnet o testnet); ver app/.env.example',
    );
  });

  it('rejects an empty variable', () => {
    expect(errorOf(resolveConfig({ VITE_SUI_NETWORK: '', DEV: true }, {}))).toBe(
      'Falta VITE_SUI_NETWORK (localnet o testnet); ver app/.env.example',
    );
  });

  it('rejects mainnet as out of MVP scope', () => {
    expect(errorOf(resolveConfig({ VITE_SUI_NETWORK: 'mainnet', DEV: false }, {}))).toContain(
      'fuera de alcance del MVP',
    );
  });

  it.each(['devnet', 'Testnet', 'toString'])('rejects unsupported network %j', (value) => {
    expect(errorOf(resolveConfig({ VITE_SUI_NETWORK: value, DEV: false }, {}))).toBe(
      `VITE_SUI_NETWORK=${JSON.stringify(value)} no es una red admitida: usar localnet o testnet`,
    );
  });
});

describe('resolveConfig: deployment file', () => {
  it('rejects a missing file for the selected network when another network file is present', () => {
    expect(errorOf(resolveConfig(TESTNET_ENV, { [LOCALNET_KEY]: localnetFixture }))).toBe(
      'Falta contracts/deployments/testnet.json: en localnet, generarlo con el script de #7 (agents.md §3, paso 4, variante B); en testnet lo publica #8',
    );
  });

  it('matches by exact file name, not by suffix', () => {
    const deployments = { '../../../contracts/deployments/old-testnet.json': TESTNET_DEPLOYMENT };
    expect(errorOf(resolveConfig(TESTNET_ENV, deployments))).toContain('Falta contracts/deployments/testnet.json');
  });

  it.each([
    ['null', null],
    ['an array', [TESTNET_DEPLOYMENT]],
    ['a string', 'testnet'],
  ])('rejects content that is %s', (_label, content) => {
    expect(errorOf(resolveConfig(TESTNET_ENV, { [TESTNET_KEY]: content }))).toContain(
      'contracts/deployments/testnet.json no contiene un objeto JSON',
    );
  });

  it('rejects schemaVersion 2 naming the version found', () => {
    expect(errorOf(resolveConfig(TESTNET_ENV, testnetWith({ schemaVersion: 2 })))).toContain(
      'contracts/deployments/testnet.json tiene schemaVersion 2 y la app solo admite 1',
    );
  });

  it('rejects a missing schemaVersion', () => {
    expect(errorOf(resolveConfig(TESTNET_ENV, testnetWith({ schemaVersion: undefined })))).toContain(
      'tiene schemaVersion ausente',
    );
  });

  it('rejects a localnet.json whose network differs from the variable', () => {
    const deployments = { [LOCALNET_KEY]: { ...TESTNET_DEPLOYMENT, network: 'testnet' } };
    expect(errorOf(resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: true }, deployments))).toContain(
      'contracts/deployments/localnet.json declara network "testnet", distinta de VITE_SUI_NETWORK=localnet',
    );
  });

  it('rejects a testnet.json whose network is localnet', () => {
    expect(errorOf(resolveConfig(TESTNET_ENV, testnetWith({ network: 'localnet' })))).toContain(
      'contracts/deployments/testnet.json declara network "localnet", distinta de VITE_SUI_NETWORK=testnet',
    );
  });
});

describe('resolveConfig: field formats', () => {
  const validId = 'ab'.repeat(32);
  const idCases: [string, unknown][] = [
    ['missing', undefined],
    ['not a string', 123],
    ['uppercase', `0x${validId.toUpperCase()}`],
    ['without 0x', validId],
    ['too short', `0x${validId.slice(1)}`],
    ['too long', `0x${validId}3`],
  ];
  const chainIdCases: [string, unknown][] = [
    ['missing', undefined],
    ['not a string', 0x4c78adac],
    ['uppercase', '4C78ADAC'],
    ['with 0x', '0x4c78adac'],
    ['too short', '4c78ada'],
    ['too long', '4c78adac0'],
  ];
  const digestCases: [string, unknown][] = [
    ['missing', undefined],
    ['not a string', 123],
    ['not base58', '0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'],
    ['too short', 'abc'],
    ['hex instead of base58', `0x${validId}`],
  ];
  const cases = [
    ...chainIdCases.map(([cause, value]) => ['chainId', cause, value] as const),
    ...digestCases.map(([cause, value]) => ['publishTxDigest', cause, value] as const),
    ...['packageId', 'originalPackageId', 'houseId'].flatMap((field) =>
      idCases.map(([cause, value]) => [field, cause, value] as const),
    ),
  ];

  it.each(cases)('rejects %s %s', (field, _cause, value) => {
    const error = errorOf(resolveConfig(TESTNET_ENV, testnetWith({ [field]: value })));
    expect(error).toContain(`contracts/deployments/testnet.json: el campo ${field} (`);
    expect(error).toContain('no tiene el formato esperado');
  });
});

describe('resolveConfig: burnerWalletEnabled', () => {
  it('is true only on localnet in DEV', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: true }, { [LOCALNET_KEY]: localnetFixture });
    expect(result.ok && result.config.burnerWalletEnabled).toBe(true);
  });

  it('is false on localnet outside DEV', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: false }, { [LOCALNET_KEY]: localnetFixture });
    expect(result.ok).toBe(true);
    expect(result.ok && result.config.burnerWalletEnabled).toBe(false);
  });

  it('is false on testnet even in DEV', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'testnet', DEV: true }, { [TESTNET_KEY]: TESTNET_DEPLOYMENT });
    expect(result.ok).toBe(true);
    expect(result.ok && result.config.burnerWalletEnabled).toBe(false);
  });
});

/** Mensaje de D4 (#77) para un valor recibido: fijo, nombra la variable, lo recibido entre comillas y lo admitido. */
function localnetUrlError(value: string): string {
  return `VITE_LOCALNET_URL=${JSON.stringify(value)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`;
}

const LOCALNET_DEPLOYMENTS = { [LOCALNET_KEY]: localnetFixture };

describe('resolveConfig: VITE_LOCALNET_URL on localnet', () => {
  it('uses the default port 9000 without the variable (today behavior, real localnet fixture)', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: true }, LOCALNET_DEPLOYMENTS);
    expect(result.ok && result.config.grpcUrl).toBe('http://127.0.0.1:9000');
    expect(result.ok && result.config.grpcUrl).toBe(NETWORKS.localnet.grpcUrl);
  });

  it.each(ACCEPTED)('uses %s as the endpoint and keeps the rest of the config unchanged', (url) => {
    const without = resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: true }, LOCALNET_DEPLOYMENTS);
    const withUrl = resolveConfig({ VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: url, DEV: true }, LOCALNET_DEPLOYMENTS);
    if (!without.ok || !withUrl.ok) {
      throw new Error('se esperaba una config válida');
    }
    expect(withUrl.config.grpcUrl).toBe(url);
    expect(withUrl.config).toEqual({ ...without.config, grpcUrl: url });
  });

  it.each([...REJECTED_STRINGS, ...REJECTED_STRINGS_ENV, ' '])(
    'rejects the invalid value %j with the D4 message and never falls back to 9000',
    (value) => {
      const result = resolveConfig(
        { VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: value, DEV: true },
        LOCALNET_DEPLOYMENTS,
      );
      expect(result).toEqual({ ok: false, error: localnetUrlError(value) });
    },
  );

  it('treats the empty string as an error, not as the default (an unset shell variable must not reach port 9000)', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: '', DEV: true }, LOCALNET_DEPLOYMENTS);
    expect(result).toEqual({ ok: false, error: localnetUrlError('') });
  });

  it('treats undefined as the only value that means the default', () => {
    const result = resolveConfig(
      { VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: undefined, DEV: true },
      LOCALNET_DEPLOYMENTS,
    );
    expect(result.ok && result.config.grpcUrl).toBe('http://127.0.0.1:9000');
  });

  it('reports an invalid value before a missing localnet.json (D5)', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: 'http://localhost:19000', DEV: true }, {});
    expect(result).toEqual({ ok: false, error: localnetUrlError('http://localhost:19000') });
  });

  it('reports the missing localnet.json as usual when the value is valid', () => {
    const result = resolveConfig({ VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: 'http://127.0.0.1:19000', DEV: true }, {});
    expect(errorOf(result)).toContain('Falta contracts/deployments/localnet.json');
  });

  it('does not change burnerWalletEnabled', () => {
    const result = resolveConfig(
      { VITE_SUI_NETWORK: 'localnet', VITE_LOCALNET_URL: 'http://127.0.0.1:19000', DEV: false },
      LOCALNET_DEPLOYMENTS,
    );
    expect(result.ok && result.config.burnerWalletEnabled).toBe(false);
  });
});

describe('resolveConfig: VITE_LOCALNET_URL on testnet', () => {
  const without = resolveConfig(TESTNET_ENV, { [TESTNET_KEY]: TESTNET_DEPLOYMENT });

  it.each([
    ['valid', 'http://127.0.0.1:19000'],
    ['invalid', 'http://evil.example:19000'],
    ['empty', ''],
  ])('ignores a %s value: same result as without it, with the testnet endpoint', (_label, value) => {
    const result = resolveConfig({ ...TESTNET_ENV, VITE_LOCALNET_URL: value }, { [TESTNET_KEY]: TESTNET_DEPLOYMENT });
    expect(result).toEqual(without);
    expect(result.ok && result.config.grpcUrl).toBe(NETWORKS.testnet.grpcUrl);
    expect(JSON.stringify(result)).not.toContain('VITE_LOCALNET_URL');
  });
});

describe('loadConfig: VITE_LOCALNET_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['http://127.0.0.1:19000', 'http://localhost:19000', ''])(
    'returns the usual testnet config on testnet even with VITE_LOCALNET_URL=%j',
    (value) => {
      vi.stubEnv('VITE_SUI_NETWORK', 'testnet');
      const baseline = loadConfig();
      vi.stubEnv('VITE_LOCALNET_URL', value);
      const result = loadConfig();
      expect(result).toEqual(baseline);
      expect(result.ok && result.config.grpcUrl).toBe(NETWORKS.testnet.grpcUrl);
    },
  );

  it.each(['http://localhost:19000', ''])(
    'reports the D4 error for the invalid value %j on localnet, whether or not localnet.json exists (D5)',
    (value) => {
      vi.stubEnv('VITE_SUI_NETWORK', 'localnet');
      vi.stubEnv('VITE_LOCALNET_URL', value);
      expect(loadConfig()).toEqual({ ok: false, error: localnetUrlError(value) });
    },
  );
  // El caso "valor válido y sin localnet.json" (el error de archivo ausente de siempre) lo prueba `resolveConfig` con `{}`
  // arriba; no se repite con `loadConfig` porque dependería de que no exista `contracts/deployments/localnet.json`, justo lo
  // que deja una localnet publicada (el flujo que habilita #77).
});
