import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import { HouseAdminPage } from '../pages/HouseAdminPage';
import { createPolicyQueryClient } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { IN_FLIGHT_TEXT } from './txNotice';

// T5 con la máquina real (useHouseCap, useHouse, useTxTarget y las tres acciones); kit y `sui/execution` mockeados. El kit
// se mockea sin importarlo (regla de capas de components/), como en GameActions.machine.test.tsx.
const kit = vi.hoisted(() => ({
  address: '',
  signAndExecuteTransaction: vi.fn(),
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
}));
vi.mock('@mysten/dapp-kit-react', () => ({
  useCurrentAccount: () => (kit.address === '' ? null : { address: kit.address }),
  useCurrentClient: () => ({ getObject: kit.getObject, listOwnedObjects: kit.listOwnedObjects }),
  useDAppKit: () => ({ signAndExecuteTransaction: kit.signAndExecuteTransaction }),
}));
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureObject = { objectId: string; version: string; digest: string; type: string; owner: { $kind: string; AddressOwner?: string }; content: string };
type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: { eventType: string; bcs: string }[] };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; houseCapId: string };
  houseCapListing: { admin: { objects: FixtureObject[]; hasNextPage: boolean; cursor: string | null } };
  houseCapObject: FixtureObject;
  house: FixtureObject;
  executed: Record<'updateFeeRate' | 'updateBetLimits' | 'withdrawFees', { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/house-admin.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/house-admin.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: fixture.ids.packageId,
  originalPackageId: fixture.ids.originalPackageId,
  houseId: fixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
};
const ADMIN = fixture.houseCapObject.owner.AddressOwner ?? '';

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
/** La House real después del retiro, con `fees_collected` = 0,01 SUI (offset 42: id 32 + version 8 + fee_rate 2). */
function houseContent(): Uint8Array {
  const content = bytes(fixture.house.content);
  new DataView(content.buffer).setBigUint64(42, 10_000_000n, true);
  return content;
}
const capListing = () =>
  Promise.resolve({ ...fixture.houseCapListing.admin, objects: fixture.houseCapListing.admin.objects.map((o) => ({ ...o, content: bytes(o.content) })) });
function getObjectFromFixture({ objectId }: { objectId: string }) {
  if (objectId === CONFIG.houseId) return Promise.resolve({ object: { ...fixture.house, content: houseContent() } });
  return Promise.resolve({ object: { ...fixture.houseCapObject, content: undefined } });
}
function nodeResult(name: keyof Fixture['executed'], checkpoint?: string | null): NodeTransactionResult {
  const tx = fixture.executed[name].Transaction;
  const converted = {
    ...tx,
    checkpoint: checkpoint === undefined ? tx.checkpoint : checkpoint,
    effects: { ...tx.effects, bcs: bytes(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: bytes(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}
const digestOf = (name: keyof Fixture['executed']) => fixture.executed[name].Transaction.digest;
const FEE_SUCCESS = 'Comisión actualizada: de 0 bps (0 %) a 250 bps (2.5 %). Las partidas ya creadas conservan la suya.';
const LIMITS_SUCCESS = 'Límites actualizados: mínimo 0.002 SUI, máximo 10 SUI (antes 0.001–50 SUI).';

let queryClient: QueryClient;
const page = () => (
  <QueryClientProvider client={queryClient}>
    <HouseAdminPage />
  </QueryClientProvider>
);
/** Monta la página y espera al panel con la House leída. */
async function mountPanel() {
  const view = render(page());
  await waitFor(() => {
    expect(view.container.querySelector('[data-house-action="fee"]')).not.toBeNull();
  });
  return view;
}
const scope = (container: HTMLElement) => within(container);
function typeFee(container: HTMLElement, value: string) {
  fireEvent.change(scope(container).getByLabelText('Nueva comisión (bps)'), { target: { value } });
}
const buttons = (container: HTMLElement) => ({
  fee: scope(container).getByRole('button', { name: 'Actualizar comisión' }),
  limits: scope(container).getByRole('button', { name: 'Actualizar límites' }),
  withdraw: scope(container).getByRole('button', { name: 'Retirar 0.01 SUI a tu cuenta' }),
});
/** Deja los tres botones habilitables: comisión y límites con valores nuevos válidos. */
function fillForms(container: HTMLElement) {
  typeFee(container, '260');
  fireEvent.change(scope(container).getByLabelText('Mínimo (SUI)'), { target: { value: '0.003' } });
  fireEvent.change(scope(container).getByLabelText('Máximo (SUI)'), { target: { value: '20' } });
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useWalletAccount).mockReturnValue({ address: ADMIN, short: 'x' });
  kit.address = ADMIN;
  kit.getObject.mockImplementation(getObjectFromFixture);
  kit.listOwnedObjects.mockImplementation(capListing);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('HouseAdminPage with the real hooks and machine', () => {
  it('T5-1: without account shows the text and lists or reads nothing', () => {
    kit.address = '';
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    render(page());
    expect(screen.getByText('Conecta la wallet que tiene el HouseCap para administrar la House')).toBeInTheDocument();
    expect(kit.listOwnedObjects).not.toHaveBeenCalled();
    expect(kit.getObject).not.toHaveBeenCalled();
  });

  it('T5-5: after a success, a failing reread of the cap keeps the panel, shows the error on top and keeps the result', async () => {
    kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: digestOf('updateFeeRate') } });
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult('updateFeeRate'));
    const { container } = await mountPanel();
    // La relectura del cap que dispara la invalidación de H-5 devuelve dos caps (invariante roto, no transitorio).
    kit.listOwnedObjects.mockImplementation(() =>
      capListing().then((listing) => ({ ...listing, objects: [...listing.objects, { ...listing.objects[0], objectId: `0x${'e'.repeat(64)}` }] })),
    );
    typeFee(container, '260');
    fireEvent.click(buttons(container).fee);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('El nodo devolvió datos que la app no reconoce');
    });
    expect(container.querySelector('.house-config')).not.toBeNull();
    const fee = container.querySelector('[data-house-action="fee"]');
    expect(fee).toHaveTextContent(FEE_SUCCESS);
    expect(fee?.querySelector(`code[title="${digestOf('updateFeeRate')}"]`)).not.toBeNull();
    expect(fee).toHaveTextContent('Costo de red:');
  });

  it('T5-9: shows no success text during preflight, signing, confirming and indexing; then the text of the event', async () => {
    const preflight = deferred<Uint8Array>();
    const signing = deferred<unknown>();
    const confirm = deferred<NodeTransactionResult>();
    const indexing = deferred<boolean>();
    vi.mocked(preflightTransaction).mockReturnValueOnce(preflight.promise);
    kit.signAndExecuteTransaction.mockReturnValueOnce(signing.promise);
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    vi.mocked(waitForCheckpoint).mockReturnValueOnce(indexing.promise);
    const { container } = await mountPanel();
    const fee = () => container.querySelector('[data-house-action="fee"]');
    typeFee(container, '260');
    fireEvent.click(buttons(container).fee);
    const steps: [string, () => void][] = [
      ['Verificando la transacción…', () => { preflight.resolve(new Uint8Array()); }],
      ['Esperando la firma en la wallet…', () => { signing.resolve({ $kind: 'Transaction', Transaction: { digest: digestOf('updateFeeRate') } }); }],
      ['Confirmando en la red…', () => { confirm.resolve(nodeResult('updateFeeRate', null)); }],
      ['Actualizando datos…', () => { indexing.resolve(true); }],
    ];
    for (const [stageText, next] of steps) {
      await waitFor(() => {
        expect(fee()).toHaveTextContent(stageText);
      });
      expect(fee()).not.toHaveTextContent('Comisión actualizada');
      expect(container).not.toHaveTextContent('Comisión actualizada');
      await act(async () => {
        next();
        await Promise.resolve();
      });
    }
    await waitFor(() => {
      expect(fee()).toHaveTextContent(FEE_SUCCESS);
    });
  });

  it('T5-10: an own transaction disables the three buttons without the in-flight text; another view shows it once', async () => {
    const preflight = deferred<Uint8Array>();
    vi.mocked(preflightTransaction).mockReturnValueOnce(preflight.promise);
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult('withdrawFees'));
    kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: digestOf('withdrawFees') } });
    const own = await mountPanel();
    const other = await mountPanel();
    fillForms(own.container);
    fillForms(other.container);
    fireEvent.click(buttons(own.container).withdraw);
    await waitFor(() => {
      expect(preflightTransaction).toHaveBeenCalled();
    });
    for (const button of Object.values(buttons(own.container))) expect(button).toBeDisabled();
    expect(scope(own.container).queryByText(IN_FLIGHT_TEXT)).toBeNull();
    for (const button of Object.values(buttons(other.container))) expect(button).toBeDisabled();
    expect(scope(other.container).getAllByText(IN_FLIGHT_TEXT)).toHaveLength(1);
    await act(async () => {
      preflight.resolve(new Uint8Array());
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
    });
  });

  it('T5-11: an unconfirmed transaction shows one alert and one "Ya la revisé", with the three buttons disabled until pressed', async () => {
    kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: digestOf('withdrawFees') } });
    vi.mocked(confirmTransaction).mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    const { container } = await mountPanel();
    fillForms(container);
    fireEvent.click(buttons(container).withdraw);
    await waitFor(() => {
      expect(scope(container).getByRole('button', { name: 'Ya la revisé' })).toBeInTheDocument();
    });
    expect(scope(container).getAllByRole('button', { name: 'Ya la revisé' })).toHaveLength(1);
    expect(scope(container).getAllByText(/la red no la confirmó todavía/)).toHaveLength(1);
    for (const button of Object.values(buttons(container))) expect(button).toBeDisabled();
    fireEvent.click(scope(container).getByRole('button', { name: 'Ya la revisé' }));
    await waitFor(() => {
      expect(scope(container).queryByRole('button', { name: 'Ya la revisé' })).toBeNull();
    });
    for (const button of Object.values(buttons(container))) expect(button).toBeEnabled();
  });

  it('T5-12: a foreign updateBetLimits that finished after mounting is adopted with its success text', async () => {
    kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: digestOf('updateBetLimits') } });
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult('updateBetLimits'));
    const launcher = await mountPanel();
    const watcher = await mountPanel();
    fireEvent.change(scope(launcher.container).getByLabelText('Mínimo (SUI)'), { target: { value: '0.003' } });
    fireEvent.click(buttons(launcher.container).limits);
    await waitFor(() => {
      expect(launcher.container.querySelector('[data-house-action="limits"]')).toHaveTextContent(LIMITS_SUCCESS);
    });
    await waitFor(() => {
      expect(watcher.container.querySelector('[data-house-action="limits"]')).toHaveTextContent(LIMITS_SUCCESS);
    });
    expect(watcher.container.querySelector('[data-house-action="fee"]')).not.toHaveTextContent('actualizad');
  });
});
