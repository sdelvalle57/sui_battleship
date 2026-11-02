import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import type { AppConfig } from '../sui/config';
import { GameNotFoundError, PaginationStalledError } from '../sui/readErrors';
import { ReadState } from './ReadState';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));

const CONFIG = { network: 'localnet' } as AppConfig;

beforeEach(() => {
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
});

describe('ReadState', () => {
  it.each([
    [{ kind: 'loading' } as const, 'Cargando…'],
    [{ kind: 'retrying', attempt: 2, max: 3 } as const, 'Reintentando… (intento 2 de 3)'],
    [{ kind: 'paused' } as const, 'Sin conexión a internet: se reintentará al volver'],
  ])('shows %o', (status, text) => {
    render(<ReadState status={status} onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });

  it('renders nothing when ready', () => {
    const { container } = render(<ReadState status={{ kind: 'ready', refreshing: false }} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the read error message with the network and retries on click', () => {
    const onRetry = vi.fn();
    render(<ReadState status={{ kind: 'error', error: new GameNotFoundError('0x6') }} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No existe una partida con ese ID en localnet');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables Reintentar while the query is already fetching', () => {
    render(<ReadState status={{ kind: 'error', error: new PaginationStalledError() }} onRetry={vi.fn()} busy />);
    expect(screen.getByRole('alert')).toHaveTextContent('La búsqueda no avanzó');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
  });
});
