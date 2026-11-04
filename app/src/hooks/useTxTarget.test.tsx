import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import { onlineManager, QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import {
  confirmTransaction,
  PREFLIGHT_NETWORK_MESSAGE,
  PreflightNetworkError,
  preflightTransaction,
  waitForCheckpoint,
  type NodeTransactionResult,
} from '../sui/execution';
import { createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { deferred, useGameView } from '../test/txHarness';
import { useAppConfig } from './useAppConfig';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: { bcs: string }[] };
type FixtureResult = { $kind: 'Transaction'; Transaction: FixtureTx } | { $kind: 'FailedTransaction'; FailedTransaction: FixtureTx };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: Record<'open' | 'invite', string> };
  executed: Record<'cancel' | 'acceptNotPendingExecuted', FixtureResult>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const ACCOUNT = `0x${'d'.repeat(64)}`;
const OTHER_ACCOUNT = `0x${'e'.repeat(64)}`;
const GAME = fixture.ids.games.open;
const OTHER_GAME = fixture.ids.games.invite;
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

function nodeResult(entry: FixtureResult): NodeTransactionResult {
  const tx = entry.$kind === 'Transaction' ? entry.Transaction : entry.FailedTransaction;
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: entry.$kind, [entry.$kind]: converted } as unknown as NodeTransactionResult;
}
const CANCEL_OK = nodeResult(fixture.executed.cancel);
const DIGEST = (fixture.executed.cancel as { Transaction: FixtureTx }).Transaction.digest;
const GAME4_TEXT = 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)';

const signAndExecuteTransaction = vi.fn();
let queryClient: QueryClient;

function asAccount(address: string) {
  vi.mocked(useCurrentAccount).mockReturnValue({ address } as ReturnType<typeof useCurrentAccount>);
}
const renderView = (gameId: string = GAME) => renderHook(() => useGameView(gameId), { wrapper: queryWrapper(queryClient) });
const renderTwoViews = () =>
  renderHook(() => ({ a: useGameView(GAME), b: useGameView(GAME) }), { wrapper: queryWrapper(queryClient) });
/** Deja la confirmación del nodo en curso hasta que el test la resuelva. */
function holdConfirmation() {
  const confirm = deferred<NodeTransactionResult>();
  vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
  return confirm;
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({} as SuiGrpcClient);
  asAccount(ACCOUNT);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(confirmTransaction).mockResolvedValue(CANCEL_OK);
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: DIGEST } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('global lock across views (T3-1)', () => {
  it('runs one preflight and one signature for two executes of two views in the same tick', async () => {
    const { result } = renderTwoViews();
    act(() => {
      result.current.a.cancel.cancel();
      result.current.b.reject.reject();
    });
    await waitFor(() => {
      expect(result.current.a.target.busy).toBe(false);
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    expect(signAndExecuteTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('remount and other targets (T3-2, T3-3)', () => {
  it('T3-2: a new view of the same target sees the running one as busy and in_flight, blocks it and is released at the end', async () => {
    const confirm = holdConfirmation();
    const first = renderView();
    act(() => {
      first.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    first.unmount();
    const second = renderView();
    expect(second.result.current.target.busy).toBe(true);
    expect(second.result.current.target.notice).toEqual({ kind: 'in_flight' });
    act(() => {
      second.result.current.cancel.cancel();
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    await act(async () => {
      confirm.resolve(CANCEL_OK);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(second.result.current.target.busy).toBe(false);
    });
    expect(second.result.current.target.notice).toMatchObject({ kind: 'adopted', adopted: { action: 'cancel' } });
  });

  it('T3-3: another target of the same account is blocked too; another account is free', async () => {
    const confirm = holdConfirmation();
    const first = renderView();
    act(() => {
      first.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    const sameAccount = renderView(OTHER_GAME);
    expect(sameAccount.result.current.target.busy).toBe(true);
    expect(sameAccount.result.current.target.notice).toEqual({ kind: 'in_flight' });
    act(() => {
      sameAccount.result.current.reject.reject();
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    sameAccount.unmount();
    first.unmount();

    asAccount(OTHER_ACCOUNT);
    const otherAccount = renderView();
    expect(otherAccount.result.current.target.busy).toBe(false);
    expect(otherAccount.result.current.target.notice).toBeNull();
    act(() => {
      otherAccount.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(preflightTransaction).toHaveBeenCalledTimes(2);
    });
    confirm.resolve(CANCEL_OK);
  });
});

describe('own mutations (T3-4, T3-5, T3-6)', () => {
  it('T3-4: no self-blocking notice: while its own cancel runs, notice is null and busy is true', async () => {
    const confirm = holdConfirmation();
    const { result } = renderView();
    act(() => {
      result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    expect(result.current.target.busy).toBe(true);
    expect(result.current.target.notice).toBeNull();
    act(() => {
      result.current.reject.reject();
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    await act(async () => {
      confirm.resolve(CANCEL_OK);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.cancel.outcome?.kind).toBe('success');
    });
    expect(result.current.target.notice).toBeNull();
  });

  async function runUnconfirmed() {
    vi.mocked(confirmTransaction).mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    const hook = renderView();
    act(() => {
      hook.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(hook.result.current.target.unconfirmed).not.toBeNull();
    });
    return hook;
  }

  it('T3-5: an own unconfirmed shows only in the view; both actions have outcome null and executing does nothing', async () => {
    const { result } = await runUnconfirmed();
    expect(result.current.target.unconfirmed).toEqual({ digest: DIGEST });
    expect(result.current.cancel.outcome).toBeNull();
    expect(result.current.reject.outcome).toBeNull();
    expect(result.current.target.busy).toBe(false);
    act(() => {
      result.current.cancel.cancel();
      result.current.reject.reject();
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
  });

  it('T3-6: acknowledge removes the mutation, the outcome stays null and executing works again', async () => {
    const { result } = await runUnconfirmed();
    act(() => {
      result.current.target.acknowledge();
    });
    await waitFor(() => {
      expect(result.current.target.unconfirmed).toBeNull();
    });
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(result.current.cancel.outcome).toBeNull();
    act(() => {
      result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(result.current.cancel.outcome?.kind).toBe('success');
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(2);
  });
});

describe('adoption (T3-7 … T3-10)', () => {
  it('T3-7: a view mounted while a foreign mutation runs adopts its node failure (game/4)', async () => {
    const confirm = holdConfirmation();
    const first = renderView();
    act(() => {
      first.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    first.unmount();
    const second = renderView();
    await act(async () => {
      confirm.resolve(nodeResult(fixture.executed.acceptNotPendingExecuted));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(second.result.current.target.notice?.kind).toBe('adopted');
    });
    expect(second.result.current.target.notice).toEqual({
      kind: 'adopted',
      adopted: { action: 'cancel', outcome: { kind: 'failure', message: GAME4_TEXT, digest: DIGEST, cost: expect.any(BigInt) as bigint } },
    });
  });

  it('T3-8: a foreign mutation that starts and ends in the same tick after mounting is adopted (id > maxId)', async () => {
    vi.mocked(preflightTransaction).mockRejectedValue(new Error('boom'));
    const { result } = renderTwoViews();
    act(() => {
      result.current.a.cancel.cancel();
    });
    await waitFor(() => {
      expect(result.current.b.target.notice?.kind).toBe('adopted');
    });
    expect(result.current.b.target.notice).toEqual({
      kind: 'adopted',
      adopted: { action: 'cancel', outcome: { kind: 'failure', message: 'No se pudo preparar la transacción: boom', digest: null, cost: null } },
    });
    expect(result.current.a.target.notice).toBeNull();
  });

  it('T3-9: an own launch drops the adopted notice, also after it finishes', async () => {
    const { result } = renderTwoViews();
    act(() => {
      result.current.a.cancel.cancel();
    });
    await waitFor(() => {
      expect(result.current.b.target.notice?.kind).toBe('adopted');
    });
    act(() => {
      result.current.b.reject.reject();
    });
    expect(result.current.b.target.notice).toBeNull();
    await waitFor(() => {
      expect(result.current.b.reject.outcome?.kind).toBe('success');
    });
    expect(result.current.b.target.notice).toBeNull();
  });

  it('T3-9: with two adopted foreign mutations, only the newest is shown', async () => {
    const { result } = renderTwoViews();
    act(() => {
      result.current.a.cancel.cancel();
    });
    await waitFor(() => {
      expect(result.current.a.cancel.outcome?.kind).toBe('success');
    });
    await waitFor(() => {
      expect(result.current.a.target.busy).toBe(false);
    });
    act(() => {
      result.current.a.reject.reject();
    });
    await waitFor(() => {
      expect(result.current.b.target.notice).toMatchObject({ kind: 'adopted', adopted: { action: 'reject' } });
    });
  });

  it('T3-10: what finished before mounting is not adopted; an unconfirmed one still blocks', async () => {
    const first = renderView();
    act(() => {
      first.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(first.result.current.cancel.outcome?.kind).toBe('success');
    });
    first.unmount();
    const afterSuccess = renderView();
    expect(afterSuccess.result.current.target.notice).toBeNull();
    afterSuccess.unmount();

    vi.mocked(confirmTransaction).mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    const second = renderView(OTHER_GAME);
    act(() => {
      second.result.current.reject.reject();
    });
    await waitFor(() => {
      expect(second.result.current.target.unconfirmed).not.toBeNull();
    });
    second.unmount();
    const afterUnconfirmed = renderView(OTHER_GAME);
    expect(afterUnconfirmed.result.current.target.unconfirmed).toEqual({ digest: DIGEST });
    expect(afterUnconfirmed.result.current.target.notice).toBeNull();
  });
});

describe('view identity (T3-11)', () => {
  function Probe() {
    const { target, cancel } = useGameView(GAME);
    return (
      <div>
        <p data-testid="view">{target.view.viewId}</p>
        <p data-testid="notice">{target.notice?.kind ?? 'none'}</p>
        <button type="button" onClick={cancel.cancel}>
          go
        </button>
      </div>
    );
  }
  const tree = (key: number) => (
    <QueryClientProvider client={queryClient}>
      <Probe key={key} />
    </QueryClientProvider>
  );

  it('gives distinct viewIds to two successive mounts in the same position; the first one is foreign to the second', async () => {
    const confirm = holdConfirmation();
    const { rerender } = render(tree(1));
    const firstId = screen.getByTestId('view').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    rerender(tree(2));
    expect(screen.getByTestId('view').textContent).not.toBe(firstId);
    expect(screen.getByTestId('notice')).toHaveTextContent('in_flight');
    confirm.resolve(CANCEL_OK);
  });

  it('uses neither crypto.randomUUID nor useId in hooks/ and components/', () => {
    const sources = Object.values(
      import.meta.glob<string>(['./*.{ts,tsx}', '../components/*.{ts,tsx}', '!./*.test.*', '!../components/*.test.*'], {
        query: '?raw',
        import: 'default',
        eager: true,
      }),
    );
    expect(sources.length).toBeGreaterThan(10);
    // Solo el código: el JSDoc de `useTxTarget` explica por qué no se usan.
    const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const source of sources) expect(code(source)).not.toMatch(/randomUUID|useId\(/);
    expect(sources.some((source) => /randomUUID/.test(source))).toBe(true);
  });
});

describe('networkMode (T3-12)', () => {
  it('runs offline: the preflight fails with the network text and busy goes back to false', async () => {
    vi.mocked(preflightTransaction).mockRejectedValue(new PreflightNetworkError());
    onlineManager.setOnline(false);
    try {
      const { result } = renderView();
      act(() => {
        result.current.cancel.cancel();
      });
      await waitFor(() => {
        expect(result.current.cancel.outcome).toEqual({ kind: 'failure', message: PREFLIGHT_NETWORK_MESSAGE, digest: null, cost: null });
      });
      expect(result.current.target.busy).toBe(false);
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
