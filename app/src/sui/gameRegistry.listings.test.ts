import { describe, expect, it } from 'vitest';
import { duelEventPrefix, eventTypeFamily } from './events';
import { buildGameRegistry, eventLiterals, matchEvent, selectedGames, type DuelSource, type RegistryConfig, type TypeOrigin } from './gameRegistry';

type ReadsFixture = {
  ids: { originalPackageId: string; packageId: string; upgrades: { version: number; packageId: string; txDigest: string }[] };
  typeOrigins: TypeOrigin[];
  events: Record<'duelCreatedOpen', { eventType: string }>;
};
type ClockFixture = { _meta: { sandbox: boolean }; objects: { pending: { type: string } }; rawListEventsPage: { frames: { event?: { eventType: string } }[] } };

const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-clock.localnet.json'
] as ClockFixture;

const UPGRADED: RegistryConfig = { originalPackageId: reads.ids.originalPackageId, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins };
const LEGACY_ONLY: RegistryConfig = { originalPackageId: reads.ids.originalPackageId };
const registry = buildGameRegistry(UPGRADED);
const duel = registry[0]?.sources.find((source): source is DuelSource => source.kind === 'duel');
const legacy = registry[0]?.sources.find((source) => source.kind === 'legacy');
if (duel === undefined || legacy === undefined) throw new Error('el registro de la fixture debe tener las dos fuentes');
const DEFINING = reads.ids.packageId;
const ORIGINAL = reads.ids.originalPackageId;

describe('duelEventPrefix and eventTypeFamily (TASK-7b)', () => {
  it('the prefix is the event of duel with the definingId and NO type parameters', () => {
    expect(duelEventPrefix(DEFINING, 'DuelCreated')).toBe(`${DEFINING}::duel::DuelCreated`);
    expect(duelEventPrefix(DEFINING, 'DuelResolved')).toBe(`${DEFINING}::duel::DuelResolved`);
  });

  it('completes addresses to 64 hex (a framework type, and an abbreviated definingId)', () => {
    expect(eventTypeFamily('0x2::sui::SUI')).toBe(`0x${'0'.repeat(63)}2::sui::SUI`);
    expect(duelEventPrefix('0xa', 'DuelCreated')).toBe(`0x${'0'.repeat(63)}a::duel::DuelCreated`);
  });

  it('the family of a full tag drops the type parameters, whichever G it carries', () => {
    expect(eventTypeFamily(duel.eventTypes.created)).toBe(duelEventPrefix(DEFINING, 'DuelCreated'));
    expect(eventTypeFamily(`${DEFINING}::duel::DuelCreated<${ORIGINAL}::unknown::Game>`)).toBe(duelEventPrefix(DEFINING, 'DuelCreated'));
  });

  it('is null for something that is not a struct tag', () => {
    expect(eventTypeFamily('not a tag')).toBeNull();
    expect(eventTypeFamily('')).toBeNull();
  });

  it('the registry exposes the prefixes of the events the listings read, from typeOrigins (the definingId)', () => {
    expect(duel.eventPrefixes).toEqual({
      created: `${DEFINING}::duel::DuelCreated`,
      resolved: `${DEFINING}::duel::DuelResolved`,
    });
    expect(DEFINING).not.toBe(ORIGINAL);
  });
});

describe('eventLiterals (the literals of a listing filter)', () => {
  it('"Todos": the exact legacy event with the ORIGINAL id and ONE prefix literal for the duel event (no type parameters)', () => {
    expect(eventLiterals(registry, 'all', 'created')).toEqual([`${ORIGINAL}::game::GameCreated`, `${DEFINING}::duel::DuelCreated`]);
    expect(eventLiterals(registry, 'all', 'resolved')).toEqual([`${ORIGINAL}::game::GameResolved`, `${DEFINING}::duel::DuelResolved`]);
  });

  it('one game: the legacy tag and the FULL tag of G (never the prefix)', () => {
    expect(eventLiterals(registry, 'coinflip', 'created')).toEqual([`${ORIGINAL}::game::GameCreated`, duel.eventTypes.created]);
    expect(duel.eventTypes.created).toContain('<');
  });

  it('without upgrades there is only the legacy literal', () => {
    expect(eventLiterals(buildGameRegistry(LEGACY_ONLY), 'all', 'created')).toEqual([`${ORIGINAL}::game::GameCreated`]);
  });

  it('never repeats a literal and never uses the emit module', () => {
    const literals = eventLiterals(registry, 'all', 'created');
    expect(new Set(literals).size).toBe(literals.length);
    expect(literals.join(' ')).not.toContain('emit');
  });

  it('selectedGames keeps the registry order for "all" and filters by key', () => {
    expect(selectedGames(registry, 'all')).toEqual(registry);
    expect(selectedGames(registry, 'coinflip').map((game) => game.key)).toEqual(['coinflip']);
  });
});

describe('matchEvent (dispatch by the type of the event)', () => {
  it('an event of the registered duel source is matched with its game, source and logical event', () => {
    expect(matchEvent(registry, reads.events.duelCreatedOpen.eventType)).toMatchObject({ kind: 'source', event: 'created', source: { kind: 'duel' }, game: { key: 'coinflip' } });
    expect(matchEvent(registry, duel.eventTypes.resolved)).toMatchObject({ kind: 'source', event: 'resolved', source: { kind: 'duel' } });
  });

  it('an event of the legacy source is matched with the legacy source', () => {
    expect(matchEvent(registry, `${ORIGINAL}::game::GameCreated`)).toMatchObject({ kind: 'source', event: 'created', source: { kind: 'legacy' } });
  });

  it('an unnormalized (abbreviated) tag still matches: the comparison normalizes the received type', () => {
    expect(matchEvent(buildGameRegistry({ originalPackageId: `0x${'0'.repeat(63)}a` }), '0xa::game::GameCreated')).toMatchObject({ kind: 'source' });
  });

  it('S-1: the same duel event of a G that the registry does not know is "foreign" (ignored), not unknown', () => {
    expect(matchEvent(registry, `${DEFINING}::duel::DuelCreated<${ORIGINAL}::other::Other>`)).toEqual({ kind: 'foreign' });
    expect(matchEvent(registry, `${DEFINING}::duel::DuelResolved<${ORIGINAL}::other::Other>`)).toEqual({ kind: 'foreign' });
  });

  it('S-1 with the real page of the ensayo fixture: the unregistered G is foreign for the production registry', () => {
    expect(clock._meta.sandbox).toBe(true);
    const types = clock.rawListEventsPage.frames.flatMap((frame) => (frame.event === undefined ? [] : [frame.event.eventType]));
    const matches = types.map((type) => matchEvent(registry, type).kind);
    // Dos instanciaciones de `G` en la misma página: la registrada (coinflip) y la de ensayo, que el registro de producción no incluye.
    expect(new Set(types.map((type) => type.slice(type.indexOf('<')))).size).toBe(2);
    expect(matches).toEqual(['source', 'foreign', 'foreign', 'foreign']);
    // El tag de la `G` de ensayo se deriva del argumento de tipo de `objects.pending.type`, no de un valor con forma de tag en `ids` (N-1).
    const sandboxTag = clock.objects.pending.type.slice(clock.objects.pending.type.indexOf('<') + 1, -1);
    expect(registry.flatMap((game) => game.sources).some((source) => source.kind === 'duel' && source.gameTag === sandboxTag)).toBe(false);
  });

  it('an event that nothing in the registry explains is unknown', () => {
    expect(matchEvent(registry, `${ORIGINAL}::game::GameCancelled`)).toEqual({ kind: 'unknown' });
    expect(matchEvent(registry, '0x2::sui::SUI')).toEqual({ kind: 'unknown' });
    expect(matchEvent(registry, 'garbage')).toEqual({ kind: 'unknown' });
  });
});
