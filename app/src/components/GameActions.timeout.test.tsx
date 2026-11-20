import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExpiredGame, TimedOutGame } from '../sui/gameTx';
import { useAcceptGame } from '../hooks/useAcceptGame';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import { useClaimTimeout } from '../hooks/useClaimTimeout';
import type { UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useRefundStalled } from '../hooks/useRefundStalled';
import { useRejectGame } from '../hooks/useRejectGame';
import { useSuiBalance } from '../hooks/useSuiBalance';
import type { TxNotice, TxResult, TxView } from '../hooks/txSession';
import { useTxTarget, type TxTargetState } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { shortAddress } from '../sui/format';
import { CLAIM_GRACE_MS } from '../sui/gameRegistry';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, CREATOR, GAME_ID, THIRD, activeState, duelRow } from '../test/duelRows';
import { GameActions } from './GameActions';

// UX-8, UX-9 y UX-10 (#73, TASK-8b): las acciones de tiempo de una partida activa con reloj, con los hooks de 8a mockeados y un
// reloj de pantalla inyectado. La máquina real (candado, "sin confirmar") se prueba aparte, con `GameActions.machine`.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useCancelGame', () => ({ useCancelGame: vi.fn() }));
vi.mock('../hooks/useRejectGame', () => ({ useRejectGame: vi.fn() }));
vi.mock('../hooks/useAcceptGame', () => ({ useAcceptGame: vi.fn() }));
vi.mock('../hooks/useClaimTimeout', () => ({ useClaimTimeout: vi.fn() }));
vi.mock('../hooks/useRefundStalled', () => ({ useRefundStalled: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));

const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 200_000);
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
const VIEW: TxView = { target: { kind: 'game', gameId: GAME_ID }, viewId: 1, key: ['tx', 'game', GAME_ID], accountKey: ['tx'], targetHash: '' };
const claimFn = vi.fn();
const refundFn = vi.fn();
const acknowledge = vi.fn();

const claimResult: TimedOutGame = {
  gameId: GAME_ID,
  creator: CREATOR,
  acceptor: ACCEPTOR,
  winner: ACCEPTOR,
  pot: 4_000_000n,
  fee: 100_000n,
  payout: 3_900_000n,
  claimedBy: THIRD,
  transactionDigest: DIGEST,
};
const refundResult: ExpiredGame = { gameId: GAME_ID, creator: CREATOR, acceptor: ACCEPTOR, refundEach: 2_000_000n, transactionDigest: DIGEST };
const success = <T,>(value: T): TxResult<T> => ({ kind: 'success', digest: DIGEST, value, indexed: true, cost: 1_000_000n });

type SetupOptions = {
  account?: string | null;
  target?: Partial<TxTargetState<TxView['target']>>;
  claim?: Partial<UseExecuteTransaction<TimedOutGame | null>>;
  refund?: Partial<UseExecuteTransaction<ExpiredGame | null>>;
  sample?: boolean;
};
function setup(options: SetupOptions = {}) {
  const { account = ACCEPTOR, target = {}, claim = {}, refund = {}, sample = true } = options;
  vi.mocked(useWalletAccount).mockReturnValue({ address: account, short: account === null ? null : 'x' });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge, ...target });
  vi.mocked(useClaimTimeout).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), claim: claimFn, ...claim });
  vi.mocked(useRefundStalled).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), refund: refundFn, ...refund });
  vi.mocked(useCancelGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), cancel: vi.fn() });
  vi.mocked(useRejectGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), reject: vi.fn() });
  vi.mocked(useAcceptGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), accept: vi.fn() });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  const fake = createFakeScreenClock();
  if (sample) fake.sample(CHAIN_NOW);
  return fake;
}
function show(fake: ReturnType<typeof createFakeScreenClock>, row = duelRow(activeState(1, DEADLINE)), variant: 'detail' | 'row' = 'detail') {
  return render(withScreenClock(fake.clock, <GameActions game={row} variant={variant} />));
}
const advance = (fake: ReturnType<typeof createFakeScreenClock>, ms: number) => {
  act(() => {
    fake.advance(ms);
  });
};
const claimButton = () => screen.getByRole('button', { name: 'Reclamar victoria' });
const refundButton = () => screen.getByRole('button', { name: 'Reembolsar' });

const CLAIM_FUNDS_FOR_ACCEPTOR = 'El pozo (0.004 SUI) menos la comisión (0.0001 SUI) va a ti; no necesariamente a quien ejecuta.';
const REFUND_FUNDS = 'Cada jugador recupera su apuesta (0.002 SUI). Sin comisión.';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('time actions: claim before and after the deadline (UX-8, UX-9)', () => {
  it('UX-9: before the deadline "Reclamar victoria" is disabled and says why, with the time left, next to the button', () => {
    show(setup());
    expect(claimButton()).toBeDisabled();
    expect(claimButton()).toHaveAccessibleDescription(`Aún no venció el plazo (quedan 3 min 20 s) ${CLAIM_FUNDS_FOR_ACCEPTOR}`);
    expect(document.querySelector('.duel-reason')).toHaveTextContent('Aún no venció el plazo (quedan 3 min 20 s)');
  });

  it('UX-9: the reason follows the counter (3 min 20 s → 3 min 19 s) and does not change while the cause is the same', () => {
    const fake = setup();
    show(fake);
    advance(fake, 1_000);
    expect(claimButton()).toHaveAccessibleDescription(`Aún no venció el plazo (quedan 3 min 19 s) ${CLAIM_FUNDS_FOR_ACCEPTOR}`);
    expect(claimButton()).toBeDisabled();
  });

  it('UX-8: once the deadline passed the button is enabled, keeps the funds text and drops the reason', () => {
    const fake = setup();
    show(fake);
    advance(fake, 200_000);
    expect(claimButton()).toBeEnabled();
    expect(claimButton()).toHaveAccessibleDescription(CLAIM_FUNDS_FOR_ACCEPTOR);
    expect(document.querySelector('.duel-reason')).toBeNull();
  });

  it('UX-8: the funds text says who gets the pot, for a third account and for the one who gets it', () => {
    show(setup({ account: THIRD }));
    expect(claimButton()).toHaveAccessibleDescription(
      `Aún no venció el plazo (quedan 3 min 20 s) El pozo (0.004 SUI) menos la comisión (0.0001 SUI) va a ${shortAddress(ACCEPTOR)}; no necesariamente a quien ejecuta.`,
    );
  });

  it('wires the claim hook of 8a to the row (its source and game) and shows its transaction status and result', () => {
    const fake = setup({ claim: { stage: 'done', outcome: success(claimResult) } });
    show(fake);
    expect(useClaimTimeout).toHaveBeenCalledWith(VIEW, expect.objectContaining({ source: 'duel', gameKey: 'coinflip' }));
    expect(screen.getByRole('status')).toHaveTextContent('¡Ganaste por tiempo! Recibiste 0.0039 SUI');
    expect(screen.getByRole('status')).toHaveTextContent('Transacción');
  });

  it('claims through the hook of 8a when the button is used after the deadline', () => {
    const fake = setup();
    show(fake);
    advance(fake, 200_000);
    fireEvent.click(claimButton());
    expect(claimFn).toHaveBeenCalledTimes(1);
    expect(refundFn).not.toHaveBeenCalled();
  });

  it('does not offer a button to play: only the time actions exist for an active game', () => {
    const fake = setup();
    show(fake);
    advance(fake, 200_000);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Reclamar victoria']);
  });

  it('UX-9: tells the user that without a claim, after the grace, anyone can refund both players', () => {
    show(setup());
    expect(document.querySelector('.duel-note')).toHaveTextContent(
      'Si nadie reclama en 7 días tras el plazo, cualquiera podrá reembolsar a los dos jugadores.',
    );
  });
});

describe('time actions: refund (UX-8, UX-9)', () => {
  it('UX-1/UX-9: with both pending there is no claim (nobody wins) and the refund waits for the deadline, with its reason', () => {
    const fake = setup();
    show(fake, duelRow(activeState(3, DEADLINE)));
    expect(screen.queryByRole('button', { name: 'Reclamar victoria' })).not.toBeInTheDocument();
    expect(refundButton()).toBeDisabled();
    expect(refundButton()).toHaveAccessibleDescription(`Aún no venció el plazo (quedan 3 min 20 s) ${REFUND_FUNDS}`);
    expect(document.querySelector('.duel-note')).toHaveTextContent('Si el plazo vence con los dos pendientes, nadie gana: se devuelve la apuesta a cada jugador.');
    advance(fake, 200_000);
    expect(refundButton()).toBeEnabled();
    expect(refundButton()).toHaveAccessibleDescription(REFUND_FUNDS);
    fireEvent.click(refundButton());
    expect(refundFn).toHaveBeenCalledTimes(1);
  });

  it('with one pending the refund appears only once the grace passed, next to the claim that still works', () => {
    const fake = setup();
    show(fake);
    // En tres pasos, como los ticks reales: la vista se renderiza entre un paso y otro (el de 1 min de lo vencido).
    advance(fake, 200_000);
    advance(fake, Number(CLAIM_GRACE_MS) - 60_000);
    expect(screen.queryByRole('button', { name: 'Reembolsar' })).not.toBeInTheDocument();
    advance(fake, 60_000);
    expect(refundButton()).toBeEnabled();
    expect(claimButton()).toBeEnabled();
    expect(refundButton()).toHaveAccessibleDescription(REFUND_FUNDS);
  });
});

describe('time actions: why a button is not available (UX-9)', () => {
  const reasonText = () => document.querySelector('.duel-reason')?.textContent ?? null;

  it.each([
    ['there is no wallet account', { account: null }, 'Conecta tu wallet'],
    ['another transaction is in progress', { target: { busy: true } }, 'Hay otra transacción en curso: espera a que termine'],
    [
      'the last transaction was left unconfirmed',
      { target: { unconfirmed: { digest: DIGEST } } },
      'La transacción anterior quedó sin confirmar: revísala antes de volver a intentar',
    ],
    ['the chain time is not known yet', { sample: false }, 'Leyendo la hora de la red para saber si venció el plazo'],
    ['the claim already succeeded', { claim: { stage: 'done', outcome: success(claimResult) } }, 'Esta partida ya terminó'],
  ] as [string, SetupOptions, string][])('UX-9: even with the deadline passed, the button says why when %s', (_cause, options, expected) => {
    const fake = setup(options);
    show(fake);
    advance(fake, 200_000);
    expect(claimButton()).toBeDisabled();
    expect(reasonText()).toBe(expected);
    expect(claimButton()).toHaveAccessibleDescription(`${expected} ${claimFundsFor(options)}`);
  });

  it('UX-9: the reason changes only when the cause changes: wallet first, then the time left', () => {
    const fake = setup({ account: null });
    const view = show(fake);
    expect(reasonText()).toBe('Conecta tu wallet');
    advance(fake, 5_000);
    expect(reasonText()).toBe('Conecta tu wallet');
    view.unmount();
    setup();
    show(fake);
    expect(reasonText()).toMatch(/^Aún no venció el plazo \(quedan /);
  });

  it('the unconfirmed alert and "Ya la revisé" appear once, as in the other actions, and unlock with it', () => {
    const fake = setup({ target: { unconfirmed: { digest: DIGEST } } });
    show(fake);
    expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé' }));
    expect(acknowledge).toHaveBeenCalledTimes(1);
  });
});

function claimFundsFor(options: SetupOptions): string {
  const account = options.account === undefined ? ACCEPTOR : options.account;
  const who = account === ACCEPTOR ? 'ti' : shortAddress(ACCEPTOR);
  return `El pozo (0.004 SUI) menos la comisión (0.0001 SUI) va a ${who}; no necesariamente a quien ejecuta.`;
}

describe('time actions: accessible names in a list (UX-10)', () => {
  it('UX-10: in a row of "Mis partidas" each button names its game, so two rows never repeat a name', () => {
    const fake = setup();
    const first = duelRow(activeState(1, DEADLINE), { id: `0x${'1'.repeat(64)}` });
    const second = duelRow(activeState(1, DEADLINE), { id: `0x${'2'.repeat(64)}` });
    render(
      withScreenClock(
        fake.clock,
        <ul>
          <li>
            <GameActions game={first} variant="row" />
          </li>
          <li>
            <GameActions game={second} variant="row" />
          </li>
        </ul>,
      ),
    );
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([`Reclamar victoria (partida ${shortAddress(first.id)})`, `Reclamar victoria (partida ${shortAddress(second.id)})`]);
    expect(new Set(names).size).toBe(2);
    for (const button of screen.getAllByRole('button')) expect(button.textContent).toBe('Reclamar victoria');
  });

  it('UX-10: the detail has a single game, so its buttons keep the plain verbs', () => {
    show(setup());
    expect(claimButton()).not.toHaveAttribute('aria-label');
  });

  it('UX-10: the order of the elements that can take focus is the order of reading: the reason is text, then the next control', () => {
    const fake = setup();
    show(fake);
    advance(fake, 200_000);
    advance(fake, Number(CLAIM_GRACE_MS) - 60_000);
    advance(fake, 60_000);
    const focusable = [...document.querySelectorAll('button, [href], input, select, textarea, [tabindex]')];
    expect(focusable.map((element) => element.textContent)).toEqual(['Reclamar victoria', 'Reembolsar']);
    for (const element of focusable) expect(element.getAttribute('tabindex')).toBeNull();
  });

  it('UX-10: the texts that describe a button are in the same block as the button', () => {
    show(setup());
    const block = claimButton().closest('.duel-action-block');
    expect(block).not.toBeNull();
    expect(block?.querySelectorAll('p')).toHaveLength(2);
  });
});

describe('adopted results of a claim and a refund (TASK-8b)', () => {
  // La cuenta que mira es la que reclamó (un tercero), no la que cobra: así el texto aclara a quién fue el pago.
  const adopted = (notice: TxNotice) => setup({ account: THIRD, target: { notice } });

  it('shows what another tab claimed: who won by time and what they received', () => {
    const fake = adopted({ kind: 'adopted', adopted: { action: 'claim', outcome: success(claimResult) } });
    show(fake);
    expect(screen.getByRole('status')).toHaveTextContent(
      `Reclamo hecho: ganó por tiempo ${shortAddress(ACCEPTOR)}, el rival de quien no movió, y recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)`,
    );
  });

  it('shows an honest success that points to the detail when the claim result could not be read', () => {
    show(adopted({ kind: 'adopted', adopted: { action: 'claim', outcome: success(null) } }));
    expect(screen.getByRole('status')).toHaveTextContent('Reclamo enviado; no se pudo leer el resultado de la transacción');
  });

  it('shows what another tab refunded, or the honest success with no readable event', () => {
    show(adopted({ kind: 'adopted', adopted: { action: 'refundStalled', outcome: success(refundResult) } }));
    expect(screen.getByRole('status')).toHaveTextContent('Reembolso hecho: cada jugador recuperó su apuesta (0.002 SUI). Sin comisión.');
  });

  it('shows the refund with no readable event as an honest success', () => {
    show(adopted({ kind: 'adopted', adopted: { action: 'refundStalled', outcome: success(null) } }));
    expect(screen.getByRole('status')).toHaveTextContent('Reembolso enviado; no se pudo leer el resultado de la transacción');
  });

  it('after an adopted claim the buttons say the game already finished', () => {
    const fake = adopted({ kind: 'adopted', adopted: { action: 'claim', outcome: success(claimResult) } });
    show(fake);
    advance(fake, 200_000);
    expect(claimButton()).toBeDisabled();
    expect(document.querySelector('.duel-reason')).toHaveTextContent('Esta partida ya terminó');
  });

  it('an adopted failure keeps the failure text of the machine and does not mark the game as finished', () => {
    const fake = adopted({ kind: 'adopted', adopted: { action: 'claim', outcome: { kind: 'failure', message: 'Todavía no venció el plazo', digest: null, cost: null } } });
    show(fake);
    advance(fake, 200_000);
    expect(screen.getByRole('alert')).toHaveTextContent('Todavía no venció el plazo');
    expect(claimButton()).toBeEnabled();
  });
});
