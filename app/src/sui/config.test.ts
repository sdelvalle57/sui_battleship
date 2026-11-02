import { describe, expect, it } from 'vitest';
import { resolveConfig } from './config';

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
        chainId: '87818ef5',
        packageId: '0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e',
        originalPackageId: '0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e',
        houseId: '0xbcbcb0392aad3b13aeb43a007105a1467f4d33a3f40b28aff08f72f4c4da0930',
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
    const { schemaVersion, network, chainId, packageId, originalPackageId, houseId } = TESTNET_DEPLOYMENT;
    const minimal = { schemaVersion, network, chainId, packageId, originalPackageId, houseId, futureField: { x: 1 } };
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
  const cases = [
    ...chainIdCases.map(([cause, value]) => ['chainId', cause, value] as const),
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
