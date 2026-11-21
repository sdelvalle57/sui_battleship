import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { parseDuelObject } from './duel';
import { gameEventType, parseGameCreated, type RawGameEvent } from './events';
import {
  buildGameRegistry,
  CLAIM_GRACE_MS,
  controlLabel,
  definingIdOf,
  registryTypeKeys,
  TIME_CONTROLS,
  timeControlById,
  type DuelSource,
  type LegacySource,
  type RegistryConfig,
  type TypeOrigin,
} from './gameRegistry';
import { parseGameObject, resolutionAmounts } from './game';
import { ReadDataError } from './readErrors';

type FixtureObject = { objectId: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type FixtureEvent = { eventType: string; bcs: string; transactionDigest: string; checkpoint: string };
type FixtureResolvedEvent = FixtureEvent & { json: Record<string, string | number | null> };
type ReadsFixture = {
  ids: {
    originalPackageId: string;
    packageId: string;
    upgrades: { version: number; packageId: string; txDigest: string }[];
    duelType: string;
    coinflipTag: string;
  };
  typeOrigins: TypeOrigin[];
  objects: Record<'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'cancelledByInvitee' | 'resolvedCreatorWins' | 'resolvedAcceptorWins', FixtureObject>;
  events: Record<'duelCreatedOpen' | 'duelCancelledByCreator' | 'duelActivatedCreatorWins', FixtureEvent> &
    Record<'duelResolvedCreatorWins' | 'duelResolvedAcceptorWins', FixtureResolvedEvent>;
  rawListEventsPages: {
    union: { frames: { event?: { eventType: string; contents: { value: string }; transactionDigest: string; checkpoint: string } }[] };
  };
};
type ClockFixture = {
  _meta: { sandbox: boolean; sandboxConstants: Record<string, number> };
  ids: Record<string, unknown>;
  objects: { pending: FixtureObject };
};
type GameReadsFixture = {
  objects: { pendingOpen: FixtureObject; resolved: FixtureObject };
  events: { gameCreatedOpen: FixtureEvent; gameResolved: FixtureResolvedEvent };
};

const READS_PATH = '../../../contracts/fixtures/duel-reads.localnet.json';
const CLOCK_PATH = '../../../contracts/fixtures/duel-clock.localnet.json';
const GAME_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', {
  eager: true,
  import: 'default',
})[READS_PATH] as ReadsFixture;
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', {
  eager: true,
  import: 'default',
})[CLOCK_PATH] as ClockFixture;
const gameReads = import.meta.glob<GameReadsFixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[GAME_PATH] as GameReadsFixture;

const TEST_GAME_TAG = Object.values(clock.ids).find((v): v is string => typeof v === 'string' && /^0x[0-9a-f]{64}::\w+::\w+$/.test(v)) ?? '';
const TEST_TURN_MS = BigInt(Object.entries(clock._meta.sandboxConstants).find(([key]) => key.endsWith('_TURN_MS'))?.[1] ?? -1);

const ORIGINAL = reads.ids.originalPackageId;
const UPGRADE = reads.ids.packageId;
const UPGRADED: RegistryConfig = { originalPackageId: ORIGINAL, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins };

function duelSource(config: RegistryConfig): DuelSource {
  const source = buildGameRegistry(config)[0]?.sources.find((s): s is DuelSource => s.kind === 'duel');
  if (source === undefined) throw new Error('el registro no tiene la fuente duel');
  return source;
}
function legacySource(config: RegistryConfig): LegacySource {
  const source = buildGameRegistry(config)[0]?.sources.find((s): s is LegacySource => s.kind === 'legacy');
  if (source === undefined) throw new Error('el registro no tiene la fuente legacy');
  return source;
}
const rawEvent = (e: FixtureEvent): RawGameEvent => ({
  eventType: e.eventType,
  bcs: fromBase64(e.bcs),
  transactionDigest: e.transactionDigest,
  checkpoint: BigInt(e.checkpoint),
});
const objectInput = (o: FixtureObject) => ({ type: o.type, owner: o.owner, content: fromBase64(o.content) });

function errorOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'sin error';
}

describe('time controls mirror (R.2 of the handoff)', () => {
  it('has the 8 controls, ids 0-7 in order, with the turn_ms of the contract', () => {
    expect(TIME_CONTROLS.map((c) => [c.id, c.turnMs])).toEqual([
      [0, 0n],
      [1, 600_000n],
      [2, 1_200_000n],
      [3, 1_800_000n],
      [4, 3_600_000n],
      [5, 86_400_000n],
      [6, 259_200_000n],
      [7, 604_800_000n],
    ]);
  });

  it.each([
    [0, 'sin reloj'],
    [1, '10 min por jugada'],
    [2, '20 min por jugada'],
    [3, '30 min por jugada'],
    [4, '60 min por jugada'],
    [5, '1 día por jugada'],
    [6, '3 días por jugada'],
    [7, '7 días por jugada'],
  ])('labels the control %i as "%s"', (id, label) => {
    expect(timeControlById(id)?.label).toBe(label);
    expect(controlLabel(TIME_CONTROLS[id]?.turnMs ?? -1n)).toBe(label);
  });

  it.each([8, 9, 255, -1])('does not know the control id %i (a future upgrade may add it)', (id) => {
    expect(timeControlById(id)).toBeNull();
  });

  it('mirrors CLAIM_GRACE_MS of the contract: 7 days', () => {
    expect(CLAIM_GRACE_MS).toBe(604_800_000n);
  });
});

describe('controlLabel: a turn_ms outside the mirror uses the generic format and is never an error', () => {
  it.each([
    [45_000n, '45 s por jugada'],
    [90_000n, '90 s por jugada'],
    [1_000n, '1 s por jugada'],
    [300_000n, '5 min por jugada'],
    [9_000_000n, '150 min por jugada'],
    [7_200_000n, '2 h por jugada'],
    [172_800_000n, '2 días por jugada'],
    [1_209_600_000n, '14 días por jugada'],
    [1_500n, '1500 ms por jugada'],
  ])('formats %s ms as "%s"', (turnMs, label) => {
    expect(controlLabel(turnMs)).toBe(label);
  });

  it('lets the table win over the generic format', () => {
    expect(controlLabel(3_600_000n)).toBe('60 min por jugada');
    expect(controlLabel(86_400_000n)).toBe('1 día por jugada');
  });

  it('formats the maximum u64 without losing precision', () => {
    expect(controlLabel(18_446_744_073_709_551_615n)).toBe('18446744073709551615 ms por jugada');
  });

  it('formats the value read from the clock fixture (sandbox) in the generic format', () => {
    expect(clock._meta.sandbox).toBe(true);
    expect(TIME_CONTROLS.some((c) => c.turnMs === TEST_TURN_MS)).toBe(false);
    expect(controlLabel(TEST_TURN_MS)).toBe(`${String(TEST_TURN_MS / 1_000n)} s por jugada`);
  });
});

describe('definingIdOf looks a type up by (module, name), never by module alone (S-2)', () => {
  const A = `0x${'a'.repeat(64)}`;
  const B = `0x${'b'.repeat(64)}`;
  const origins: TypeOrigin[] = [
    { module: 'duel', name: 'Duel', definingId: A },
    { module: 'duel', name: 'DuelFuture', definingId: B },
    { module: 'game', name: 'Duel', definingId: B },
  ];

  it('tells two types of the same module with different defining ids apart', () => {
    expect(definingIdOf(origins, 'duel', 'Duel')).toBe(A);
    expect(definingIdOf(origins, 'duel', 'DuelFuture')).toBe(B);
  });

  it('tells the same name in two modules apart', () => {
    expect(definingIdOf(origins, 'game', 'Duel')).toBe(B);
    expect(definingIdOf(origins, 'coinflip', 'Duel')).toBeNull();
  });

  it('returns null for a type without entry instead of falling back to the module', () => {
    expect(definingIdOf(origins, 'duel', 'DuelTurn')).toBeNull();
    expect(definingIdOf([], 'duel', 'Duel')).toBeNull();
  });
});

describe('registryTypeKeys', () => {
  it('lists the 4 legacy types without upgrades and adds Duel, its 7 events and Coinflip with upgrades', () => {
    expect(registryTypeKeys(false).map((k) => `${k.module}::${k.name}`)).toEqual([
      'game::Game',
      'game::GameCreated',
      'game::GameCancelled',
      'game::GameResolved',
    ]);
    expect(registryTypeKeys(true)).toHaveLength(4 + 9);
    expect(new Set(registryTypeKeys(true).map((k) => `${k.module}::${k.name}`)).size).toBe(13);
  });

  it('is exactly what the registry resolves: building with those entries works and dropping any one of them fails', () => {
    const origins: TypeOrigin[] = registryTypeKeys(true).map((key, i) => ({ ...key, definingId: `0x${(i + 1).toString(16).padStart(64, '0')}` }));
    const config: RegistryConfig = { originalPackageId: ORIGINAL, upgrades: reads.ids.upgrades, typeOrigins: origins };
    expect(() => buildGameRegistry(config)).not.toThrow();
    for (const key of registryTypeKeys(true)) {
      const without = origins.filter((o) => !(o.module === key.module && o.name === key.name));
      expect(errorOf(() => buildGameRegistry({ ...config, typeOrigins: without }))).toContain(`${key.module}::${key.name}`);
    }
  });
});

describe('buildGameRegistry without upgrades (packageVersion 1, the testnet.json of today)', () => {
  const config: RegistryConfig = { originalPackageId: ORIGINAL };
  const [coinflip, ...others] = buildGameRegistry(config);

  it('has a single game, Coinflip, with only the legacy source and everything falling back to the original id', () => {
    expect(others).toHaveLength(0);
    expect(coinflip).toMatchObject({ key: 'coinflip', label: 'Coinflip', creatable: true, usesClock: false, controlIds: [], createSource: 'legacy' });
    expect(coinflip?.sources.map((s) => s.kind)).toEqual(['legacy']);
    expect(legacySource(config)).toMatchObject({
      objectType: `${ORIGINAL}::game::Game`,
      eventTypes: {
        created: gameEventType(ORIGINAL, 'GameCreated'),
        cancelled: gameEventType(ORIGINAL, 'GameCancelled'),
        resolved: gameEventType(ORIGINAL, 'GameResolved'),
      },
    });
  });

  it('declares the creation and the resolution as the events a player sends', () => {
    const source = legacySource(config);
    expect(source.sentEventTypes).toEqual([source.eventTypes.created, source.eventTypes.resolved]);
  });

  it('parses a real legacy Game and its GameCreated through the source', () => {
    const pkg = gameReads.objects.pendingOpen.type.split('::')[0] ?? '';
    const source = legacySource({ originalPackageId: pkg });
    expect(source.parseObject(objectInput(gameReads.objects.pendingOpen))).toEqual(parseGameObject(objectInput(gameReads.objects.pendingOpen), pkg));
    expect(source.parseCreated(rawEvent(gameReads.events.gameCreatedOpen))).toEqual(parseGameCreated(rawEvent(gameReads.events.gameCreatedOpen), pkg));
  });

  it('does not create a duel source even if typeOrigins is present', () => {
    const withOrigins = buildGameRegistry({ originalPackageId: ORIGINAL, typeOrigins: reads.typeOrigins });
    expect(withOrigins[0]?.sources.map((s) => s.kind)).toEqual(['legacy']);
  });
});

describe('buildGameRegistry with upgrades (real typeOrigins of duel-reads)', () => {
  it('has the legacy and the duel sources and creates in the new one', () => {
    const [coinflip] = buildGameRegistry(UPGRADED);
    expect(coinflip?.sources.map((s) => s.kind)).toEqual(['legacy', 'duel']);
    expect(coinflip).toMatchObject({ createSource: 'duel', usesClock: false, controlIds: [] });
  });

  it('builds the types with the id of the upgrade for duel and coinflip and the original id for game', () => {
    const duel = duelSource(UPGRADED);
    expect(duel.objectType).toBe(reads.ids.duelType);
    expect(duel.gameTag).toBe(reads.ids.coinflipTag);
    expect(duel.objectType.startsWith(UPGRADE)).toBe(true);
    expect(legacySource(UPGRADED).objectType).toBe(`${ORIGINAL}::game::Game`);
  });

  it('builds exactly the event types that the node reports', () => {
    const { eventTypes } = duelSource(UPGRADED);
    expect(eventTypes.created).toBe(reads.events.duelCreatedOpen.eventType);
    expect(eventTypes.cancelled).toBe(reads.events.duelCancelledByCreator.eventType);
    expect(eventTypes.activated).toBe(reads.events.duelActivatedCreatorWins.eventType);
    expect(eventTypes.resolved).toBe(reads.events.duelResolvedCreatorWins.eventType);
    expect(eventTypes.turn).toBe(`${UPGRADE}::duel::DuelTurn<${reads.ids.coinflipTag}>`);
    expect(eventTypes.timedOut).toBe(`${UPGRADE}::duel::DuelTimedOut<${reads.ids.coinflipTag}>`);
    expect(eventTypes.expired).toBe(`${UPGRADE}::duel::DuelExpired<${reads.ids.coinflipTag}>`);
  });

  it('declares the creation and the resolution as the events a player sends', () => {
    const source = duelSource(UPGRADED);
    expect(source.sentEventTypes).toEqual([source.eventTypes.created, source.eventTypes.resolved]);
  });

  it.each(Object.keys(reads.objects) as (keyof ReadsFixture['objects'])[])('parses the real object %s through the source', (name) => {
    const source = duelSource(UPGRADED);
    expect(source.parseObject(objectInput(reads.objects[name]))).toEqual(parseDuelObject(objectInput(reads.objects[name]), reads.ids.duelType));
  });

  it('parses the events of both sources from one raw ListEvents page that mixes them', () => {
    const legacy = legacySource(UPGRADED);
    const duel = duelSource(UPGRADED);
    const frames = reads.rawListEventsPages.union.frames.flatMap((f) => (f.event ? [f.event] : []));
    let legacyCount = 0;
    let duelCount = 0;
    for (const frame of frames) {
      const event: RawGameEvent = {
        eventType: frame.eventType,
        bcs: fromBase64(frame.contents.value),
        transactionDigest: frame.transactionDigest,
        checkpoint: BigInt(frame.checkpoint),
      };
      if (frame.eventType === legacy.eventTypes.created) {
        expect(legacy.parseCreated(event).creator).toMatch(/^0x[0-9a-f]{64}$/);
        legacyCount++;
      } else if (frame.eventType === duel.eventTypes.created) {
        expect(duel.parseCreated(event)).toMatchObject({ control: 0, turnMs: 0n });
        duelCount++;
      }
    }
    expect([legacyCount, duelCount]).toEqual([6, 4]);
  });

  it('keeps each source from reading the events of the other', () => {
    const legacy = legacySource(UPGRADED);
    const duel = duelSource(UPGRADED);
    const duelCreated = rawEvent(reads.events.duelCreatedOpen);
    expect(() => legacy.parseCreated(duelCreated)).toThrow(ReadDataError);
    expect(() => duel.parseCreated(rawEvent(gameReads.events.gameCreatedOpen))).toThrow(ReadDataError);
  });

  it('builds the type of an event from its own defining id, not from the one of its module siblings (S-2)', () => {
    const eventId = `0x${'c'.repeat(64)}`;
    const gameId = `0x${'d'.repeat(64)}`;
    const origins = reads.typeOrigins.map((o) => {
      if (o.module === 'duel' && o.name === 'DuelTurn') return { ...o, definingId: eventId };
      if (o.module === 'coinflip' && o.name === 'Coinflip') return { ...o, definingId: gameId };
      return o;
    });
    const source = duelSource({ ...UPGRADED, typeOrigins: origins });
    expect(source.eventTypes.turn).toBe(`${eventId}::duel::DuelTurn<${gameId}::coinflip::Coinflip>`);
    expect(source.eventTypes.created).toBe(`${UPGRADE}::duel::DuelCreated<${gameId}::coinflip::Coinflip>`);
    expect(source.objectType).toBe(`${UPGRADE}::duel::Duel<${gameId}::coinflip::Coinflip>`);
    expect(source.gameTag).toBe(`${gameId}::coinflip::Coinflip`);
  });
});

describe('resolutionAmounts stays valid for both sources (same fee formula, D10)', () => {
  const amountsOf = (e: FixtureResolvedEvent) => ({ pot: BigInt(String(e.json.pot)), fee: BigInt(String(e.json.fee)), payout: BigInt(String(e.json.payout)) });

  it('matches the DuelResolved event of each resolved Duel<Coinflip> (nonzero fee)', () => {
    const source = duelSource(UPGRADED);
    for (const [object, event] of [
      [reads.objects.resolvedCreatorWins, reads.events.duelResolvedCreatorWins],
      [reads.objects.resolvedAcceptorWins, reads.events.duelResolvedAcceptorWins],
    ] as const) {
      const duel = source.parseObject(objectInput(object));
      expect(duel.feeRate).toBeGreaterThan(0);
      expect(resolutionAmounts(duel.bet, duel.feeRate)).toEqual(amountsOf(event));
    }
  });

  it('matches the GameResolved event of the resolved legacy Game', () => {
    const pkg = gameReads.objects.resolved.type.split('::')[0] ?? '';
    const game = legacySource({ originalPackageId: pkg }).parseObject(objectInput(gameReads.objects.resolved));
    expect(resolutionAmounts(game.bet, game.feeRate)).toEqual(amountsOf(gameReads.events.gameResolved));
  });
});

describe('buildGameRegistry fails with a configuration error instead of an empty registry', () => {
  it('fails when there are upgrades and no typeOrigins at all', () => {
    expect(errorOf(() => buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: reads.ids.upgrades }))).toContain('Error de configuración');
  });

  it.each([
    ['duel', 'Duel'],
    ['duel', 'DuelTurn'],
    ['coinflip', 'Coinflip'],
    ['game', 'Game'],
    ['game', 'GameResolved'],
  ])('fails naming %s::%s when its entry is missing', (module, name) => {
    const origins = reads.typeOrigins.filter((o) => !(o.module === module && o.name === name));
    expect(errorOf(() => buildGameRegistry({ ...UPGRADED, typeOrigins: origins }))).toBe(
      `Error de configuración: typeOrigins no tiene una entrada para ${module}::${name}`,
    );
  });

  it('does not accept the entry of another module with the same name', () => {
    const origins = reads.typeOrigins.map((o) => (o.module === 'duel' && o.name === 'Duel' ? { ...o, module: 'game' } : o));
    expect(errorOf(() => buildGameRegistry({ ...UPGRADED, typeOrigins: origins }))).toContain('duel::Duel');
  });
});

describe('the production registry does not include the trial game of the clock fixture', () => {
  it('uses the tag of the coinflip, not the one of the trial game', () => {
    expect(clock._meta.sandbox).toBe(true);
    expect(duelSource(UPGRADED).gameTag).not.toBe(TEST_GAME_TAG);
    expect(duelSource(UPGRADED).gameTag).toBe(reads.ids.coinflipTag);
  });

  it('refuses to read a Duel of the trial game as a Duel of the coinflip', () => {
    expect(() => duelSource(UPGRADED).parseObject(objectInput(clock.objects.pending))).toThrow(ReadDataError);
  });
});
