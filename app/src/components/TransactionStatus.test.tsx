import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TxOutcome, TxStage } from '../hooks/useExecuteTransaction';
import { TransactionStatus } from './TransactionStatus';

const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';

function show(stage: TxStage, outcome: TxOutcome<string> | null, network: 'localnet' | 'testnet' = 'localnet') {
  return render(<TransactionStatus stage={stage} outcome={outcome} network={network} successText="Partida cancelada" />);
}

describe('TransactionStatus', () => {
  it.each([
    ['preflight', 'Verificando la transacción…'],
    ['signing', 'Esperando la firma en la wallet…'],
    ['confirming', 'Confirmando en la red…'],
    ['indexing', 'Actualizando datos…'],
  ] as [TxStage, string][])('shows the %s stage', (stage, text) => {
    show(stage, null);
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });

  it.each(['idle', 'done'] as TxStage[])('shows nothing at %s without outcome', (stage) => {
    const { container } = show(stage, null);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a success with the digest as text in localnet and the network cost', () => {
    show('done', { kind: 'success', digest: DIGEST, value: 'x', indexed: true, cost: 3_941_200n });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Partida cancelada');
    expect(status).toHaveTextContent('Transacción 7VXtB8…q7YH · Costo de red: 0.0039412 SUI');
    expect(screen.getByTitle(DIGEST).tagName).toBe('CODE');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(status).not.toHaveTextContent('La lista puede tardar');
  });

  it('links the digest to the explorer in testnet', () => {
    show('done', { kind: 'success', digest: DIGEST, value: 'x', indexed: true, cost: 1n }, 'testnet');
    expect(screen.getByRole('link', { name: '7VXtB8…q7YH' })).toHaveAttribute('href', expect.stringContaining(`/tx/${DIGEST}`) as string);
  });

  it('warns that the list may take a few seconds when not indexed', () => {
    show('done', { kind: 'success', digest: DIGEST, value: 'x', indexed: false, cost: 1n });
    expect(screen.getByRole('status')).toHaveTextContent('La lista puede tardar unos segundos en mostrarlo');
  });

  it('shows an unconfirmed transaction with its digest and without Reintentar', () => {
    show('done', { kind: 'unconfirmed', digest: DIGEST });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar');
    expect(alert).toHaveTextContent('7VXtB8…q7YH');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a failure with digest and cost when it was executed', () => {
    show('done', { kind: 'failure', message: 'Solo quien creó la partida puede cancelarla. (código game/3)', digest: DIGEST, cost: 1_000_294n });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Solo quien creó la partida puede cancelarla. (código game/3)');
    expect(alert).toHaveTextContent('Transacción 7VXtB8…q7YH · Costo de red: 0.001000294 SUI');
  });

  it('shows a failure without digest before execution', () => {
    show('done', { kind: 'failure', message: 'Conecta tu wallet', digest: null, cost: null });
    expect(screen.getByRole('alert')).toHaveTextContent('Conecta tu wallet');
    expect(screen.queryByText(/Transacción/)).not.toBeInTheDocument();
  });
});
