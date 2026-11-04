import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useHouseCap, type UseHouseCap } from '../hooks/useHouseCap';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { ReadDataError } from '../sui/readErrors';
import type { ReadStatus } from '../sui/readStatus';
import { HouseAdminPage } from './HouseAdminPage';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouseCap', () => ({ useHouseCap: vi.fn() }));
// El panel tiene sus propios tests: aquí solo importa si la página lo monta y con qué cap.
vi.mock('../components/HouseAdminPanel', () => ({
  HouseAdminPanel: ({ capId }: { capId: string }) => <div data-testid="panel">{capId}</div>,
}));

const ACCOUNT = `0x${'a'.repeat(64)}`;
const CAP = { id: `0x${'c'.repeat(64)}`, owner: ACCOUNT };
const READY: ReadStatus = { kind: 'ready', refreshing: false };
const refetch = vi.fn();
type AccountState = Extract<UseHouseCap, { kind: 'account' }>;
function withAccount(cap: AccountState['cap'], status: ReadStatus = READY, isFetching = false) {
  vi.mocked(useHouseCap).mockReturnValue({ kind: 'account', address: ACCOUNT, cap, status, isFetching, refetch });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useWalletAccount).mockReturnValue({ address: ACCOUNT, short: 'x' });
});

describe('HouseAdminPage', () => {
  it('T5-1: without account shows the fixed text and reads nothing', () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    const { container } = render(<HouseAdminPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Administrar House' })).toBeInTheDocument();
    expect(screen.getByText('Conecta la wallet que tiene el HouseCap para administrar la House')).toBeInTheDocument();
    expect(container.querySelector('section.house-admin')).not.toBeNull();
    expect(useHouseCap).not.toHaveBeenCalled();
  });

  it('T5-2: an unknown cap while loading shows only "Cargando…", never no-permission', () => {
    withAccount({ kind: 'unknown' }, { kind: 'loading' });
    const { container } = render(<HouseAdminPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(container.querySelector('.house-no-permission')).toBeNull();
    expect(screen.queryByTestId('panel')).toBeNull();
  });

  it.each([
    ['incomplete', new ReadDataError('incomplete', 'tope'), 'El nodo no completó la búsqueda del HouseCap; reintenta'],
    ['invariant', new ReadDataError('invariant', 'dos caps'), 'El nodo devolvió datos que la app no reconoce'],
  ])('T5-2: an unknown cap with a %s error shows its message and Reintentar, never no-permission', (_name, error, text) => {
    withAccount({ kind: 'unknown' }, { kind: 'error', error });
    const { container } = render(<HouseAdminPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(text);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.house-no-permission')).toBeNull();
    expect(screen.queryByTestId('panel')).toBeNull();
  });

  it('T5-3: a known null cap shows no-permission without the panel; "Volver a comprobar" refetches', () => {
    withAccount({ kind: 'known', cap: null });
    const { container } = render(<HouseAdminPage />);
    const box = container.querySelector('.house-no-permission');
    expect(box).toHaveTextContent('Sin permisos: esta cuenta no tiene el HouseCap de esta House.');
    expect(container.querySelector('.house-config')).toBeNull();
    expect(container.querySelector('[data-house-action]')).toBeNull();
    expect(screen.queryByTestId('panel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a comprobar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('T5-3: "Volver a comprobar" is disabled while it reads again, with the read state on top', () => {
    withAccount({ kind: 'known', cap: null }, { kind: 'retrying', attempt: 2, max: 3 }, true);
    const { container } = render(<HouseAdminPage />);
    expect(screen.getByRole('button', { name: 'Volver a comprobar' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Reintentando… (intento 2 de 3)');
    expect(container.querySelector('.house-no-permission')).not.toBeNull();
  });

  it('mounts the panel with the cap id, and keeps it under the error of a failed refetch (H-2)', () => {
    withAccount({ kind: 'known', cap: CAP });
    const { rerender } = render(<HouseAdminPage />);
    expect(screen.getByTestId('panel')).toHaveTextContent(CAP.id);
    expect(screen.queryByRole('alert')).toBeNull();
    withAccount({ kind: 'known', cap: CAP }, { kind: 'error', error: new Error('down') });
    rerender(<HouseAdminPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('down');
    expect(screen.getByTestId('panel')).toHaveTextContent(CAP.id);
  });
});
