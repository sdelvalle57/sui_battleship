import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Game } from '../sui/game';
import { formatMist } from '../sui/format';
import { GameDetail } from './GameDetail';

// Las vistas no importan el SDK (capas, ARQ-1): el `Game` se arma desde el `json` real de la fixture, que TASK-2 ya
// cruzó campo por campo con el BCS.
type FixtureJson = {
  id: string;
  version: string;
  house_id: string;
  creator: string;
  opponent: string | null;
  bet: string;
  stake: string;
  fee_rate: number;
  state: { '@variant': 'Pending' | 'Cancelled' | 'Resolved'; acceptor?: string; winner?: string };
};
type Name = 'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'resolved';
type Fixture = { objects: Record<Name, { json: FixtureJson }>; events: { gameResolved: { json: Record<string, string> } } };
const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

function gameOf(name: Name): Game {
  const j = fixture.objects[name].json;
  const state: Game['state'] =
    j.state['@variant'] === 'Resolved'
      ? { kind: 'resolved', acceptor: j.state.acceptor ?? '', winner: j.state.winner ?? '' }
      : { kind: j.state['@variant'] === 'Pending' ? 'pending' : 'cancelled' };
  return {
    id: j.id,
    version: BigInt(j.version),
    houseId: j.house_id,
    creator: j.creator,
    opponent: j.opponent,
    bet: BigInt(j.bet),
    stake: BigInt(j.stake),
    feeRate: j.fee_rate,
    state,
  };
}
const value = (label: string) => screen.getByText(label).nextElementSibling;

describe('GameDetail', () => {
  it('shows an open pending game with the estimated split and no explorer link on localnet', () => {
    render(<GameDetail game={gameOf('pendingOpen')} lastActivityMs={null} network="localnet" account={null} />);
    expect(value('Estado')).toHaveTextContent('Abierta');
    expect(value('Oponente')).toHaveTextContent('abierta');
    expect(value('Apuesta')).toHaveTextContent('0.001000001 SUI');
    expect(value('Comisión')).toHaveTextContent('2.5 %');
    expect(screen.getByText('Pozo 0.002000002 SUI · comisión 0.00005 SUI · al ganador 0.001950002 SUI')).toBeInTheDocument();
    expect(value('Última actividad')).toHaveTextContent('—');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a pending invitation with the invited address and a Suiscan link on testnet', () => {
    const game = gameOf('pendingInvite');
    render(<GameDetail game={game} lastActivityMs={Date.UTC(2026, 10, 2, 17, 40)} network="testnet" account={null} />);
    expect(value('Estado')).toHaveTextContent(/^Invitación a 0x/);
    expect(value('Última actividad')).toHaveTextContent('2 nov 2026');
    expect(screen.getByRole('link', { name: 'Ver en el explorador' })).toHaveAttribute('href', `https://suiscan.xyz/testnet/object/${game.id}`);
  });

  it('shows a cancelled game without the split', () => {
    render(<GameDetail game={gameOf('cancelledByCreator')} lastActivityMs={null} network="localnet" account={null} />);
    expect(value('Estado')).toHaveTextContent('Cancelada');
    expect(screen.queryByText(/^Pozo /)).toBeNull();
  });

  it('shows a resolved game with the amounts of the fixture GameResolved, labelled as last activity', () => {
    const resolved = fixture.events.gameResolved.json;
    render(<GameDetail game={gameOf('resolved')} lastActivityMs={Date.UTC(2026, 10, 2, 17, 41)} network="localnet" account={null} />);
    expect(value('Estado')).toHaveTextContent('Resuelta');
    expect(value('Pozo')).toHaveTextContent(`${formatMist(BigInt(resolved.pot ?? ''))} SUI`);
    expect(value('Comisión cobrada')).toHaveTextContent(`${formatMist(BigInt(resolved.fee ?? ''))} SUI`);
    expect(value('Pago al ganador')).toHaveTextContent(`${formatMist(BigInt(resolved.payout ?? ''))} SUI (según la fórmula del contrato)`);
    expect(value('Ganador')).toHaveTextContent(/^0x/);
    expect(screen.getByText('Última actividad')).toBeInTheDocument();
    expect(screen.queryByText(/resuelta el|la resolvió/i)).toBeNull();
  });

  describe('Resultado para ti (T4-12, DL-12)', () => {
    const resolvedWith = (winner: 'creator' | 'acceptor'): Game => {
      const game = gameOf('resolved');
      if (game.state.kind !== 'resolved') throw new Error('fixture');
      return { ...game, state: { ...game.state, winner: winner === 'creator' ? game.creator : game.state.acceptor } };
    };
    const upper = (address: string) => address.toUpperCase().replace('0X', '0x');
    const resultFor = (game: Game, account: string | null) => {
      const { unmount } = render(<GameDetail game={game} lastActivityMs={null} network="localnet" account={account} />);
      const label = screen.queryByText('Resultado para ti');
      const text = label?.nextElementSibling?.textContent ?? null;
      unmount();
      return text;
    };

    it('says ganaste/perdiste to the creator and to the acceptor (addresses in another format)', () => {
      const creatorWins = resolvedWith('creator');
      const acceptorWins = resolvedWith('acceptor');
      const acceptor = creatorWins.state.kind === 'resolved' ? creatorWins.state.acceptor : '';
      expect(resultFor(creatorWins, creatorWins.creator)).toBe('ganaste');
      expect(resultFor(creatorWins, upper(acceptor))).toBe('perdiste');
      expect(resultFor(acceptorWins, acceptor)).toBe('ganaste');
      expect(resultFor(acceptorWins, upper(acceptorWins.creator))).toBe('perdiste');
    });

    it('shows nothing to a third account, without account or while pending', () => {
      expect(resultFor(resolvedWith('creator'), `0x${'f'.repeat(64)}`)).toBeNull();
      expect(resultFor(resolvedWith('creator'), null)).toBeNull();
      const pending = gameOf('pendingOpen');
      expect(resultFor(pending, pending.creator)).toBeNull();
    });
  });
});
