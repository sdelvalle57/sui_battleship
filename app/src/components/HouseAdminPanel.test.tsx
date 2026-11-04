import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import type { UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useHouse } from '../hooks/useHouse';
import { useHouseCap } from '../hooks/useHouseCap';
import type { TxView } from '../hooks/txSession';
import { useTxTarget, type TxTargetState } from '../hooks/useTxTarget';
import { useUpdateBetLimits } from '../hooks/useUpdateBetLimits';
import { useUpdateFeeRate } from '../hooks/useUpdateFeeRate';
import { useWithdrawFees } from '../hooks/useWithdrawFees';
import type { AppConfig } from '../sui/config';
import type { House } from '../sui/house';
import type { BetLimitsUpdatedEvent, FeeRateUpdatedEvent } from '../sui/houseAdmin';
import { HouseAdminPanel } from './HouseAdminPanel';
import { IN_FLIGHT_TEXT } from './txNotice';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useHouseCap', () => ({ useHouseCap: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useUpdateFeeRate', () => ({ useUpdateFeeRate: vi.fn() }));
vi.mock('../hooks/useUpdateBetLimits', () => ({ useUpdateBetLimits: vi.fn() }));
vi.mock('../hooks/useWithdrawFees', () => ({ useWithdrawFees: vi.fn() }));

const CAP_ID = `0x${'c'.repeat(64)}`;
const HOUSE: House = { id: `0x${'b'.repeat(64)}`, version: 1n, feeRate: 250, feesCollected: 10_000_000n, minBet: 2_000_000n, maxBet: 10_000_000_000n };
const VIEW: TxView = { target: { kind: 'house' }, viewId: 1, key: ['tx', 'house'], accountKey: ['tx'], targetHash: '' };
const updateFee = vi.fn();
const updateLimits = vi.fn();
const withdraw = vi.fn();
const refetchHouse = vi.fn();
const refetchCap = vi.fn();

function txHook<T>(): UseExecuteTransaction<T> {
  return { stage: 'idle', outcome: null, execute: vi.fn() };
}
type Hooks = {
  fee?: Partial<UseExecuteTransaction<FeeRateUpdatedEvent | null>>;
  limits?: Partial<UseExecuteTransaction<BetLimitsUpdatedEvent | null>>;
};
/** La House que devuelve `useHouse` (también para cambiarla entre renders). */
function mockHouse(house: House | null) {
  vi.mocked(useHouse).mockReturnValue({
    house,
    status: house === null ? { kind: 'loading' } : { kind: 'ready', refreshing: false },
    isFetching: false,
    refetch: refetchHouse,
  });
}
function setup(house: House | null = HOUSE, target: Partial<TxTargetState<TxView['target']>> = {}, hooks: Hooks = {}) {
  mockHouse(house);
  vi.mocked(useHouseCap).mockReturnValue({
    kind: 'account',
    address: `0x${'a'.repeat(64)}`,
    cap: { kind: 'known', cap: { id: CAP_ID, owner: `0x${'a'.repeat(64)}` } },
    status: { kind: 'ready', refreshing: false },
    isFetching: false,
    refetch: refetchCap,
  });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge: vi.fn(), ...target });
  vi.mocked(useUpdateFeeRate).mockReturnValue({ ...txHook<FeeRateUpdatedEvent | null>(), ...hooks.fee, update: updateFee });
  vi.mocked(useUpdateBetLimits).mockReturnValue({ ...txHook<BetLimitsUpdatedEvent | null>(), ...hooks.limits, update: updateLimits });
  vi.mocked(useWithdrawFees).mockReturnValue({ ...txHook<bigint | null>(), withdraw });
  return render(<HouseAdminPanel capId={CAP_ID} />);
}
const block = (container: HTMLElement, action: string) => {
  const element = container.querySelector(`[data-house-action="${action}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`falta el bloque ${action}`);
  return element;
};
const button = (name: string) => screen.getByRole('button', { name });
const feeInput = () => screen.getByLabelText('Nueva comisión (bps)');
const minInput = () => screen.getByLabelText('Mínimo (SUI)');
const maxInput = () => screen.getByLabelText('Máximo (SUI)');
const type = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('HouseAdminPanel: configuration (T5-4)', () => {
  it('shows fee in bps and %, limits, collected fees and version, and "Actualizar" rereads House and cap', () => {
    const { container } = setup();
    const config = container.querySelector('.house-config');
    expect(config).toHaveTextContent('Comisión: 250 bps (2.5 %)');
    expect(config).toHaveTextContent('Apuesta mínima: 0.002 SUI');
    expect(config).toHaveTextContent('Apuesta máxima: 10 SUI');
    expect(config).toHaveTextContent('Comisiones acumuladas: 0.01 SUI');
    expect(config).toHaveTextContent('Versión de la House: 1');
    fireEvent.click(button('Actualizar'));
    expect(refetchHouse).toHaveBeenCalledTimes(1);
    expect(refetchCap).toHaveBeenCalledTimes(1);
  });

  it('shows only the read state, without actions, while the House has no data', () => {
    const { container } = setup(null);
    expect(container.querySelector('.house-config')).toHaveTextContent('Cargando…');
    expect(container.querySelector('[data-house-action]')).toBeNull();
  });
});

describe('HouseAdminPanel: fee (T5-6)', () => {
  it('starts with the current fee, its live %, the button disabled and no error until touched', () => {
    const { container } = setup();
    expect(feeInput()).toHaveValue('250');
    expect(block(container, 'fee')).toHaveTextContent('= 2.5 %');
    expect(button('Actualizar comisión')).toBeDisabled();
    expect(block(container, 'fee').querySelector('.field-error')).toBeNull();
    expect(block(container, 'fee')).toHaveTextContent(
      'Las partidas ya creadas conservan la comisión con que se crearon; la nueva se aplica a las que se creen desde ahora.',
    );
  });

  it.each([
    ['', 'Escribe la comisión en bps'],
    [' 250', 'Solo números enteros (bps), sin signo, decimales ni espacios'],
    ['-1', 'Solo números enteros (bps), sin signo, decimales ni espacios'],
    ['2.5', 'Solo números enteros (bps), sin signo, decimales ni espacios'],
    ['1001', 'El máximo es 1000 bps (10 %)'],
    ['250', 'Es la comisión actual'],
  ])('shows the error of %o and keeps the button disabled', (text, error) => {
    const { container } = setup();
    type(feeInput(), 'x');
    type(feeInput(), text);
    expect(block(container, 'fee').querySelector('.field-error')).toHaveTextContent(error);
    expect(button('Actualizar comisión')).toBeDisabled();
    expect(block(container, 'fee').querySelector('.house-summary')).toBeNull();
  });

  it('with 250 valid and the current fee at 0, shows the live %, the summary and sends the bps', () => {
    const { container } = setup({ ...HOUSE, feeRate: 0 });
    type(feeInput(), '250');
    expect(block(container, 'fee')).toHaveTextContent('= 2.5 %');
    expect(block(container, 'fee').querySelector('.house-summary')).toHaveTextContent('De 0 bps (0 %) a 250 bps (2.5 %)');
    fireEvent.click(button('Actualizar comisión'));
    expect(updateFee).toHaveBeenCalledWith({ capId: CAP_ID, feeRate: 250 });
  });
});

describe('HouseAdminPanel: limits (T5-7)', () => {
  it('starts with the current limits and the button disabled (unchanged)', () => {
    setup();
    expect(minInput()).toHaveValue('0.002');
    expect(maxInput()).toHaveValue('10');
    expect(button('Actualizar límites')).toBeDisabled();
  });

  it.each([
    ['min', '', 'Escribe un monto'],
    ['min', '-1', 'El monto no puede ser negativo'],
    ['min', '1,5', 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles'],
    ['min', '0.0000000001', 'Máximo 9 decimales'],
    ['min', '18446744073.709551616', 'Monto demasiado grande'],
    ['min', '0', 'El mínimo tiene que ser mayor que 0'],
    ['max', '', 'Escribe un monto'],
    ['max', '5 ', 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles'],
  ])('shows the %s error of %o', (field, text, error) => {
    const { container } = setup();
    type(field === 'min' ? minInput() : maxInput(), text);
    expect(block(container, 'limits').querySelector('.field-error')).toHaveTextContent(error);
    expect(button('Actualizar límites')).toBeDisabled();
  });

  it.each([
    ['0.5', '0.1', 'El mínimo no puede superar el máximo'],
    ['0.002', '10.0', 'Son los límites actuales'],
  ])('shows the pair error of %s–%s', (min, max, error) => {
    const { container } = setup();
    type(minInput(), min);
    type(maxInput(), max);
    expect(block(container, 'limits').querySelector('.field-error')).toHaveTextContent(error);
    expect(button('Actualizar límites')).toBeDisabled();
  });

  it('with valid new limits shows the summary and sends the amounts in MIST', () => {
    const { container } = setup();
    type(minInput(), '0.003');
    type(maxInput(), '20');
    expect(block(container, 'limits').querySelector('.house-summary')).toHaveTextContent('De 0.002–10 SUI a 0.003–20 SUI');
    expect(block(container, 'limits')).toHaveTextContent('Los límites solo se aplican al crear partidas: las pendientes no cambian.');
    fireEvent.click(button('Actualizar límites'));
    expect(updateLimits).toHaveBeenCalledWith({ capId: CAP_ID, minBet: 3_000_000n, maxBet: 20_000_000_000n });
  });
});

describe('HouseAdminPanel: withdraw (T5-8)', () => {
  it('is disabled with 0 fees and says there is nothing to withdraw', () => {
    const { container } = setup({ ...HOUSE, feesCollected: 0n });
    expect(button('Retirar 0 SUI a tu cuenta')).toBeDisabled();
    expect(block(container, 'withdraw')).toHaveTextContent('No hay comisiones para retirar.');
  });

  it('withdraws everything with 0.01 SUI collected, with the note on the real amount', () => {
    const { container } = setup();
    expect(block(container, 'withdraw')).not.toHaveTextContent('No hay comisiones para retirar.');
    expect(block(container, 'withdraw')).toHaveTextContent('Se retira todo lo acumulado al momento de ejecutarse; el monto real sale de la transacción.');
    fireEvent.click(button('Retirar 0.01 SUI a tu cuenta'));
    expect(withdraw).toHaveBeenCalledWith({ capId: CAP_ID });
  });
});

describe('HouseAdminPanel: lock and notices', () => {
  it('disables the three buttons while the account is busy, without the in-flight text for an own transaction', () => {
    setup(HOUSE, { busy: true });
    type(feeInput(), '300');
    expect(button('Actualizar comisión')).toBeDisabled();
    expect(button('Actualizar límites')).toBeDisabled();
    expect(button('Retirar 0.01 SUI a tu cuenta')).toBeDisabled();
    expect(screen.queryByText(IN_FLIGHT_TEXT)).toBeNull();
  });

  it('shows the in-flight text once for a foreign transaction', () => {
    setup(HOUSE, { busy: true, notice: { kind: 'in_flight' } });
    expect(screen.getAllByText(IN_FLIGHT_TEXT)).toHaveLength(1);
  });

  it('shows one unconfirmed alert with "Ya la revisé" and disables the three buttons', () => {
    const acknowledge = vi.fn();
    setup(HOUSE, { unconfirmed: { digest: '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH' }, acknowledge });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(button('Retirar 0.01 SUI a tu cuenta')).toBeDisabled();
    fireEvent.click(button('Ya la revisé'));
    expect(acknowledge).toHaveBeenCalledTimes(1);
  });
});

describe('HouseAdminPanel: fields follow the current House (TASK-5b, SM-1 of the smoke)', () => {
  const OLD: House = { ...HOUSE, feeRate: 0, minBet: 1_000_000n, maxBet: 50_000_000_000n };
  const NEW: House = { ...HOUSE, feeRate: 250, minBet: 2_000_000n, maxBet: 10_000_000_000n };
  /** La House cambia (relectura, otra pestaña, adoptado) sin remontar el panel. */
  function houseChanges(view: ReturnType<typeof setup>, house: House) {
    mockHouse(house);
    view.rerender(<HouseAdminPanel capId={CAP_ID} />);
  }
  const summary = (container: HTMLElement, action: string) => block(container, action).querySelector('.house-summary');
  const errors = (container: HTMLElement, action: string) => block(container, action).querySelectorAll('.field-error');

  it('T5-16: untouched fields show the new House after a rerender, without summary or error, buttons disabled', () => {
    const view = setup(OLD);
    houseChanges(view, NEW);
    expect(feeInput()).toHaveValue('250');
    expect(minInput()).toHaveValue('0.002');
    expect(maxInput()).toHaveValue('10');
    for (const action of ['fee', 'limits']) {
      expect(summary(view.container, action)).toBeNull();
      expect(errors(view.container, action)).toHaveLength(0);
    }
    expect(button('Actualizar comisión')).toBeDisabled();
    expect(button('Actualizar límites')).toBeDisabled();
  });

  it('T5-17 (SM-1): mounted with the stale 0.001–50 SUI, the House moves to 0.002–10 SUI and the panel never offers to revert it', () => {
    const view = setup(OLD);
    houseChanges(view, NEW);
    expect(view.container).not.toHaveTextContent('De 0.002–10 SUI a 0.001–50 SUI');
    expect(summary(view.container, 'limits')).toBeNull();
    expect(button('Actualizar límites')).toBeDisabled();
    expect(view.container).not.toHaveTextContent('De 250 bps (2.5 %) a 0 bps (0 %)');
    expect(button('Actualizar comisión')).toBeDisabled();
  });

  it('T5-18: an edited field keeps its text when the House changes; the untouched one follows the House', () => {
    const view = setup(OLD);
    type(minInput(), '0.005');
    houseChanges(view, NEW);
    expect(minInput()).toHaveValue('0.005');
    expect(maxInput()).toHaveValue('10');
    expect(summary(view.container, 'limits')).toHaveTextContent('De 0.002–10 SUI a 0.005–10 SUI');
    expect(button('Actualizar límites')).toBeEnabled();
  });

  it('T5-18: an edited text equal to the new current value is unchanged and the button is disabled', () => {
    const view = setup(OLD);
    type(feeInput(), '250');
    houseChanges(view, NEW);
    expect(feeInput()).toHaveValue('250');
    expect(errors(view.container, 'fee')[0]).toHaveTextContent('Es la comisión actual');
    expect(button('Actualizar comisión')).toBeDisabled();
  });

  it('T5-19: launching the fee update sends 260 and clears the draft; with the reread House the field shows 260', () => {
    const view = setup({ ...HOUSE, feeRate: 0 });
    type(feeInput(), '260');
    fireEvent.click(button('Actualizar comisión'));
    expect(updateFee).toHaveBeenCalledWith({ capId: CAP_ID, feeRate: 260 });
    expect(feeInput()).toHaveValue('0');
    expect(errors(view.container, 'fee')).toHaveLength(0);
    houseChanges(view, { ...HOUSE, feeRate: 260 });
    expect(feeInput()).toHaveValue('260');
    expect(summary(view.container, 'fee')).toBeNull();
    expect(errors(view.container, 'fee')).toHaveLength(0);
  });

  it('T5-19: launching the limits update sends the amounts and clears both drafts; with the reread House the fields follow it', () => {
    const view = setup();
    type(minInput(), '0.003');
    type(maxInput(), '20');
    fireEvent.click(button('Actualizar límites'));
    expect(updateLimits).toHaveBeenCalledWith({ capId: CAP_ID, minBet: 3_000_000n, maxBet: 20_000_000_000n });
    expect(minInput()).toHaveValue('0.002');
    expect(maxInput()).toHaveValue('10');
    houseChanges(view, { ...HOUSE, minBet: 3_000_000n, maxBet: 20_000_000_000n });
    expect(minInput()).toHaveValue('0.003');
    expect(maxInput()).toHaveValue('20');
    expect(summary(view.container, 'limits')).toBeNull();
    expect(errors(view.container, 'limits')).toHaveLength(0);
  });

  it('T5-20: after a failed action the fields show the current value and the block keeps the error message', () => {
    const failure = { kind: 'failure', message: 'La comisión supera el máximo que permite el contrato. (código house/0)', digest: null, cost: null } as const;
    const view = setup({ ...HOUSE, feeRate: 0 }, {}, { fee: { stage: 'done', outcome: failure }, limits: { stage: 'done', outcome: failure } });
    type(feeInput(), '260');
    fireEvent.click(button('Actualizar comisión'));
    type(minInput(), '0.003');
    fireEvent.click(button('Actualizar límites'));
    expect(feeInput()).toHaveValue('0');
    expect(minInput()).toHaveValue('0.002');
    expect(block(view.container, 'fee').querySelector('.tx-failure')).toHaveTextContent(failure.message);
    expect(block(view.container, 'limits').querySelector('.tx-failure')).toHaveTextContent(failure.message);
  });
});
