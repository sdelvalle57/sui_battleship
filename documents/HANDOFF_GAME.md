# HANDOFF_GAME
> Plan: `documents/PLAN_GAME.md` v1.1 (aprobado por el MAYOR, `documents/REVISION_PLAN_GAME.md` "Revisión v1.1") | Issue: #5 |
> Branch: `feature/issue-5-game` (desde `master` @ `b00c093`) | Versión: v1 | Fecha: 2026-10-30 | Autor: MID
> Aplica además los MINOR v1.1-1 (forma de la cabecera y `numstat` de `house_tests.move`) y v1.1-2 (forma exacta del
> enum por RPC) de la revisión v1.1, y v1.1-3/v1.1-4 como notas para #6 y para el README.
> Dos tasks, en orden: **TASK-1** (contracts) y **TASK-2** (docs). Un reporte por task (plantilla de
> `documents/FLUJO_AGENTES.md` §5); el MID revisa y autoriza el siguiente. **Sin commits ni pushes** (los hace el orquestador).

## 0. Baseline de gates verificado (2026-10-30)

Verificado por el MID con `git log`, `git diff`, `gh run list` y `documents/STATUS.md` (el MID no corre gates, D-20261030-02):

| Ítem | Valor |
|---|---|
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`, `suiup`, `~/.local/bin`); la misma versión fija la CI (`.github/workflows/ci.yml`, `SUI_VERSION`/`SUI_COMMIT`) |
| `master` | `b00c093` (merge del housekeeping de #3). `git diff --stat c2a1e42 b00c093 -- contracts` vacío: el código de contratos es el medido en `040f3c0`/`68d1afe` |
| Branch | `feature/issue-5-game` @ `40a1382` = `b00c093` + solo docs (`documents/DECISIONES.md`, `PLAN_GAME.md`, `REVISION_PLAN_GAME.md`, `STATUS.md`) |
| `sui move build -e testnet --warnings-are-errors` | 🟢 exit 0, **0 warnings** (único módulo: `contracts/sources/house.move`) |
| `sui move build -e testnet --lint --warnings-are-errors` | 🟢 exit 0, **0 lints** |
| `sui move test -e testnet --warnings-are-errors` | 🟢 exit 0, **26 tests PASS** (`contracts/tests/house_tests.move`) |
| `git diff --exit-code -- Move.lock` tras los gates | 🟢 sin cambios (lock v4, framework `719fb29…`, PV 139) |
| Coverage (informativo) | 100 % de `battleship::house` |
| CI en `master` | 🟢 job `contracts` success en el run push [41150550292](https://github.com/sdelvalle57/sui_battleship/actions/runs/41150550292) (`ae89cd5`, 26/26 con `--warnings-are-errors`) y en el run push 41150747000 (`b00c093`). `framework-drift` es informativo (warning H13 esperado) |
| Protección de `master` | el check `contracts` debe estar verde para mergear el PR de #5 (D-20261030-13) |

**Cero delta esperado en House:** los 26 tests de House siguen PASS sin cambios. El total sube a **≥ 51** (≥ 25 de Game).

## Decisiones del owner (no reabrir)

| ID | Decisión que aplica este handoff |
|---|---|
| D-20261030-06 | §1 aceptar resuelve en la misma transacción (#6): `Pending → Resolved \| Cancelled`, **sin `Active`**. §2 **sin expiración**. §3 el `Game` **copia el `fee_rate`** de la House al crearse. §4 **el invitado puede rechazar**: reembolso íntegro al creador, sin comisión; el creador sigue pudiendo cancelar |
| D-20261030-11 | §5 abort codes clásicos `const EAlgo: u64 = N;` con número estable. §7 versionado: "#5 replica el patrón en `Game`" (concretado por D-15 DV) |
| D-20261030-12 | §2 los accessors `fee_rate`/`min_bet`/`max_bet`/`fees_collected` de la House validan versión primero (`house::EWrongVersion`); `version()` no. §4 **invariante:** ningún camino de reembolso (cancelar/rechazar) puede quedar bloqueado por la versión |
| D-20261030-14 | Cabecera `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0` en los fuentes Move; incluye `contracts/tests/*.move` (indicación del orquestador, plan v1.1) |
| D-20261030-15 | **D3 = (a)** la partida terminada se conserva (`Cancelled`/`Resolved`, `Balance` 0); el depósito de storage (≈ 0,002–0,003 SUI, a medir en el smoke de #6) no se recupera. **D4 = (a)** sin módulo Escrow: la apuesta es `stake: Balance<SUI>` del `Game`. **D6 = (c)** sin timestamp en el contrato (la app usa el `timestampMs` del evento). **D8 = (a)** una sola `create_game(…, opponent: Option<address>, …)`; `create_game`, `cancel_game` y `reject_game` son `entry` (no `public`); el rechazo es una función propia. **DV = (b)** `Game.version` = `house.version()` al crear; solo la compara aceptar (#6); cancelar y rechazar nunca la leen |

Procesos vigentes: D-20261030-07 (config de la CLI sin claves), D-20261030-13 (gates con `--warnings-are-errors`, CI bloqueante).

---

## TASK-1: Módulo `battleship::game` (crear, cancelar, rechazar) + suite de tests — área: contracts

### 1. Historia de usuario del task

**Como** jugador creador, **quiero** crear una partida apostando SUI (abierta o como invitación a una dirección) y
cancelarla mientras nadie la acepte, recuperando el 100 %; **y como** invitado, **quiero** rechazar una invitación,
**para** que los fondos del creador solo estén bloqueados mientras la partida espera rival y nunca dependan del admin
ni de una versión del contrato para volver.

**Scope:** `contracts/sources/game.move` (nuevo) + `contracts/tests/game_tests.move` (nuevo) + cabecera D-14 en
`contracts/tests/house_tests.move`. **No entrega:** aceptar/coinflip/pago/comisión (#6), docs (TASK-2).

### 2. Contexto (qué existe hoy y qué replicar)

- `battleship::game` no existe (el stub 2025 se retiró en #2; **no** se usa como modelo: `GamePool`, `TurnCap`,
  `escrow: u64` y sus estados son justamente lo que se elimina).
- Se consume sin tocar `contracts/sources/house.move`: `min_bet`/`max_bet`/`fee_rate` (`:156-177`, abortan con
  `house::EWrongVersion` = 3 si la House está en otra versión), `version()` sin chequeo (`:181-183`),
  `init_for_testing` (`:190-193`), `set_version_for_testing` (`:195-198`), `update_fee_rate` (`entry`, `:98-104`).
- **Modelo a replicar:** `house.move` (cabecera `:1-3` = 2 líneas + 1 en blanco; abort codes con comentario de
  condición `:14-19`; `///` en todo lo público; eventos `has copy, drop`; constructores de eventos `#[test_only]`
  `:200-240`) y `house_tests.move` (helper `publish()` `:34-39`; eventos con
  `event::events_by_type<T>() == vector[expected]` **antes** del `next_tx` `:92`; conservación con
  `take_from_sender<Coin<SUI>>` `:222-225`; `expected_failure` con ruta completa `:112`; llamada a una función
  `entry` desde el test `:84`).
- APIs del framework @ `719fb29` (caché local `~/.move/git/…719fb2960ccfbf9f4d33041f8ea5146d30671696/crates/sui-framework/packages/`):
  `coin::value`/`from_balance`/`into_balance`/`mint_for_testing` (`coin.move:125, 140, 145, 572`),
  `balance::withdraw_all` (`balance.move:90`), `object::id` (`object.move:254`), `transfer::share_object`/`public_transfer`
  (`transfer.move:120, 63`), `event::emit`/`num_events`/`events_by_type` (`event.move:42, 63, 68`), `option::some`
  (`move-stdlib/sources/option.move:26`), `test_scenario::shared`/`take_from_address`/`take_from_sender`/
  `take_shared_by_id`/`most_recent_id_shared` (`test_scenario.move:436, 473, 509, 564, 567`).
- Hechos verificados por MID y MAYOR (CLI @ `testnet-v1.83.0`): los enums deben ser `public`
  (`move-compiler/src/parser/syntax.rs:3692-3712`) y solo el módulo que los define los construye o hace `match`; el
  `Pack` marca todos los campos como usados (`hlir/translate.rs:1371-1377`), así que `version`/`house_id` no avisan;
  no existe aviso de "variante sin uso" (`diagnostics/codes.rs:358-372`), así que `Resolved` sin construir no avisa;
  **sí** existe aviso de constante sin uso (`codes.rs:369`): no declarar los aborts de #6.

### 3. Qué implementar

#### 3.1 Cabecera (D-14, forma única — v1.1-1)

Las mismas 3 primeras líneas en `game.move`, `game_tests.move` **y** `house_tests.move` (en este último, se anteponen;
nada más cambia):

```move
// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

```

#### 3.2 `contracts/sources/game.move`

Orden del módulo (como `house.move`): cabecera, `///` de módulo, `module battleship::game;`, `use`, abort codes, struct,
enum, eventos, funciones `entry`, helpers privados, `#[test_only]`.

```move
/// Games of SUI Battleship: one shared object per game holding the creator's stake until the game is
/// cancelled, rejected or resolved (#6).
module battleship::game;

use battleship::house::House;
use sui::balance::Balance;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

// Abort codes: stable numbers, never reused for another condition. #6 continues from 7.
const EBetTooLow: u64 = 0; // stake value < house.min_bet()
const EBetTooHigh: u64 = 1; // stake value > house.max_bet()
const ESelfInvite: u64 = 2; // opponent == some(sender)
const ENotCreator: u64 = 3; // sender != game.creator
const ENotPending: u64 = 4; // game state != Pending
const ENotInvited: u64 = 5; // game.opponent == some(a) && sender != a
const ENoInvitation: u64 = 6; // reject on an open game (opponent == none)
```

(Si el compilador marca un `use` como sin uso, se ajusta y se declara.)

**Struct y enum** (`///` en los campos, como `house.move:32-34`):

```move
/// One shared game. No `store`: only this module can share it; nobody can transfer, wrap or freeze it.
public struct Game has key {
    id: UID,
    /// Package version that created the game (`house.version()` at creation). Never read by refund paths.
    version: u64,
    /// House the game settles against (#6: `EWrongHouse`).
    house_id: ID,
    creator: address,
    /// `none` = open game; `some(a)` = direct invitation to `a`.
    opponent: Option<address>,
    /// Bet in MIST; constant for the whole life of the object.
    bet: u64,
    /// Equals `bet` while `Pending`; 0 once `Cancelled` or `Resolved` (PROY-8).
    stake: Balance<SUI>,
    /// Fee in basis points copied from the House at creation (D-20261030-06 §3).
    fee_rate: u16,
    state: GameState,
}

/// Lifecycle (D-20261030-06 §1): Pending -> Cancelled (cancel/reject) | Resolved (accept, #6, atomic).
public enum GameState has copy, drop, store {
    Pending,
    Cancelled,
    Resolved { acceptor: address, winner: address },
}
```

`Resolved` la construye #6. Sin `Active`, sin timestamp, sin `init` ni OTW.

**Eventos** (`has copy, drop`, con `///`):

```move
/// Emitted by `create_game`.
public struct GameCreated has copy, drop {
    game_id: ID,
    creator: address,
    opponent: Option<address>,
    bet: u64,
    fee_rate: u16,
}

/// Emitted by `cancel_game` (`cancelled_by` = creator) and `reject_game` (`cancelled_by` = invitee).
public struct GameCancelled has copy, drop {
    game_id: ID,
    creator: address,
    cancelled_by: address,
    refund: u64,
}
```

**Funciones** (exactamente estas firmas y visibilidades; `///` en cada una):

| Firma | Visibilidad | Quién puede | Aborts, **en este orden** | Evento |
|---|---|---|---|---|
| `create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext)` | `entry` | cualquiera | `house::EWrongVersion` (3, módulo `house`), `EBetTooLow`, `EBetTooHigh`, `ESelfInvite` | `GameCreated` |
| `cancel_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo `game.creator` | `ENotCreator`, `ENotPending` | `GameCancelled` |
| `reject_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo el invitado | `ENoInvitation`, `ENotInvited`, `ENotPending` | `GameCancelled` |

```move
/// Creates a game with the whole `stake` as the bet (open if `opponent` is none, or an invitation).
/// The bet must be within the House limits; the House fee rate is copied into the game.
/// Emits `GameCreated`.
entry fun create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext) {
    // Version-checked House reads go first (D-20261030-12 §2): an old package aborts here after `migrate`.
    let min_bet = house.min_bet();
    let max_bet = house.max_bet();
    let fee_rate = house.fee_rate();
    let bet = stake.value();
    assert!(bet >= min_bet, EBetTooLow);
    assert!(bet <= max_bet, EBetTooHigh);
    let creator = ctx.sender();
    assert!(opponent != option::some(creator), ESelfInvite);
    let game = Game {
        id: object::new(ctx),
        // Equals house::VERSION here: the reads above already checked it (single source of truth).
        version: house.version(),
        house_id: object::id(house),
        creator,
        opponent,
        bet,
        stake: stake.into_balance(),
        fee_rate,
        state: GameState::Pending,
    };
    event::emit(GameCreated { game_id: object::id(&game), creator, opponent, bet, fee_rate });
    transfer::share_object(game);
}

/// Cancels a pending game and refunds the whole stake to the creator, without fee. Only the creator.
/// Emits `GameCancelled`.
entry fun cancel_game(game: &mut Game, ctx: &mut TxContext) {
    let sender = ctx.sender();
    // AuthZ before state: a third party never learns the game state (deny by default).
    assert!(sender == game.creator, ENotCreator);
    assert!(game.is_pending(), ENotPending);
    game.refund_creator(sender, ctx);
}

/// Rejects a pending invitation and refunds the whole stake to the creator, without fee. Only the invitee.
/// Emits `GameCancelled`.
entry fun reject_game(game: &mut Game, ctx: &mut TxContext) {
    assert!(game.opponent.is_some(), ENoInvitation);
    let sender = ctx.sender();
    assert!(*game.opponent.borrow() == sender, ENotInvited);
    assert!(game.is_pending(), ENotPending);
    game.refund_creator(sender, ctx);
}

// Refunds the whole stake to the creator, without fee. Takes no House and checks no version on purpose:
// a refund path can never be blocked by an upgrade (D-20261030-12 §4).
fun refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext) {
    let refund = game.stake.withdraw_all();
    game.state = GameState::Cancelled;
    event::emit(GameCancelled {
        game_id: object::id(game),
        creator: game.creator,
        cancelled_by,
        refund: refund.value(),
    });
    transfer::public_transfer(coin::from_balance(refund, ctx), game.creator);
}

// Used by cancel_game, reject_game and the accept of #6.
fun is_pending(game: &Game): bool {
    match (&game.state) {
        GameState::Pending => true,
        _ => false,
    }
}
```

Libertades acotadas (se declaran en "Desviaciones"): `game.state == GameState::Pending` en lugar del `match` si
compila sin warnings ni lints; ajustes de `use`; forma sintáctica equivalente de `opponent.borrow()`. **No** se
permite: cambiar firmas, visibilidad, orden de aborts, campos, variantes, eventos ni números de abort; recibir la
House o leer `version` en `cancel_game`/`reject_game`/`refund_creator`.

**Helpers `#[test_only]`** (todos con sufijo `_for_testing`; ninguno colisiona con el `is_pending` privado):

```move
#[test_only]
public fun creator_for_testing(game: &Game): address { game.creator }
#[test_only]
public fun opponent_for_testing(game: &Game): Option<address> { game.opponent }
#[test_only]
public fun bet_for_testing(game: &Game): u64 { game.bet }
#[test_only]
public fun stake_value_for_testing(game: &Game): u64 { game.stake.value() }
#[test_only]
public fun fee_rate_for_testing(game: &Game): u16 { game.fee_rate }
#[test_only]
public fun house_id_for_testing(game: &Game): ID { game.house_id }
#[test_only]
public fun version_for_testing(game: &Game): u64 { game.version }
#[test_only]
public fun is_pending_for_testing(game: &Game): bool { game.is_pending() }
#[test_only]
public fun is_cancelled_for_testing(game: &Game): bool {
    match (&game.state) { GameState::Cancelled => true, _ => false }
}
#[test_only]
public fun set_version_for_testing(game: &mut Game, version: u64) { game.version = version; }
#[test_only]
public fun new_game_created_for_testing(
    game_id: ID, creator: address, opponent: Option<address>, bet: u64, fee_rate: u16,
): GameCreated { GameCreated { game_id, creator, opponent, bet, fee_rate } }
#[test_only]
public fun new_game_cancelled_for_testing(
    game_id: ID, creator: address, cancelled_by: address, refund: u64,
): GameCancelled { GameCancelled { game_id, creator, cancelled_by, refund } }
```

(Formato según `sui move` / estilo de `house.move`, una función por bloque.)

**AuthZ (SEG-2):** `create_game`: cualquiera (no puede invitarse a sí mismo). `cancel_game`: solo `game.creator`.
`reject_game`: solo la dirección de `game.opponent`. Cada denegación tiene su `expected_failure`.

**Flujo de fondos (SEG-4):** crear: `Coin` entero → `Balance` (`stake == bet`). Cancelar y rechazar:
`withdraw_all` → `Coin` por el total → `game.creator` (nunca al invitado). Ninguno toca la House. Sin creación ni
destrucción de valor; el objeto terminal queda con `stake == 0` (PROY-8).

**Nota para #6 (no se implementa aquí; v1.1-3):** aceptar compara `game.version == house.version()` **en la misma
transacción** que una lectura con chequeo de versión de la House (`add_fees`); se recomienda ponerlo **al principio
de aceptar, antes del sorteo**, para no gastar el coinflip antes de abortar. El orden final de aborts lo fija el plan
de #6. Tras un upgrade + `migrate`, las partidas `Pending` de versiones anteriores solo se cancelan o rechazan.

#### 3.3 `contracts/tests/game_tests.move`

Cabecera §3.1, luego `#[test_only] module battleship::game_tests;`. Imports de `battleship::game::{Self, Game,
GameCreated, GameCancelled}`, `battleship::house::{Self, House, HouseCap}`, `sui::coin::{Self, Coin}`, `sui::event`,
`sui::sui::SUI`, `sui::test_scenario::{Self, Scenario}` (los que se usen).

```move
const PUBLISHER: address = @0xA; // House and HouseCap
const CREATOR: address = @0xB;
const INVITEE: address = @0xC;
const OTHER: address = @0xD;

const MIN_BET: u64 = 1_000_000;       // House default
const MAX_BET: u64 = 50_000_000_000;  // House default
const BET: u64 = 10_000_000;
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;
```

Helpers sugeridos (el DEV puede ajustarlos y lo declara):
- `publish(): Scenario` — como `house_tests.move:34-39`.
- `create(scenario: &mut Scenario, creator: address, bet: u64, opponent: Option<address>): ID` — `next_tx(creator)`,
  `take_shared<House>`, `coin::mint_for_testing<SUI>(bet, scenario.ctx())`, `game::create_game(...)`,
  `return_shared`, `next_tx(creator)` y devuelve `test_scenario::most_recent_id_shared<Game>().destroy_some()`.
- Partidas por ID con `scenario.take_shared_by_id<Game>(id)`.
- Reembolso: en un `next_tx(CREATOR)` posterior, `take_from_sender<Coin<SUI>>()` y comparar su valor con la apuesta.

### 4. Archivos a tocar / NO tocar

- **Crear:** `contracts/sources/game.move`, `contracts/tests/game_tests.move`.
- **Modificar:** `contracts/tests/house_tests.move` — **solo** anteponer las 3 líneas de §3.1 (`numstat` esperado `3	0`).
- **NO tocar:** `contracts/sources/house.move`, el resto de `house_tests.move`, `contracts/Move.toml`,
  `contracts/Move.lock`, `contracts/README.md`, `.gitignore`, `.github/`, `agents.md`, `documents/`.

### 5. Tests obligatorios (≥ 25; nombres = comportamiento, LIM-11)

`expected_failure(abort_code = battleship::game::E…)` salvo el 9 (`battleship::house::EWrongVersion`). En los
`expected_failure`, mantener las líneas de limpieza como en `house_tests.move`.

1. `test_create_open_game_stores_fields_and_emits_event` — `creator`, `opponent` none, `bet`, `stake_value == bet`,
   `fee_rate` = el de la House, `house_id == object::id(&house)`, `version == house.version()`, `is_pending`; el ID de
   la partida está en `test_scenario::shared(&effects)` del `next_tx` que cierra la creación; `GameCreated` igual al
   esperado (consultado **antes** de ese `next_tx`).
2. `test_create_invite_game_stores_opponent` — `opponent == some(INVITEE)`; evento con el invitado.
3. `test_create_copies_fee_rate_at_creation` — `update_fee_rate` 250 → crear → `update_fee_rate` 500: la partida conserva 250.
4. `test_create_accepts_bet_equal_to_min_bet`
5. `test_create_accepts_bet_equal_to_max_bet`
6. `test_create_rejects_bet_below_min` — `EBetTooLow` (`MIN_BET - 1`)
7. `test_create_rejects_bet_above_max` — `EBetTooHigh` (`MAX_BET + 1`)
8. `test_create_rejects_self_invite` — `ESelfInvite` (apuesta válida, `opponent = some(CREATOR)`)
9. `test_create_rejects_house_with_wrong_version` — `battleship::house::EWrongVersion`: House con
   `house::set_version_for_testing(NEWER_VERSION)` **y** apuesta < `MIN_BET` (la versión se reporta primero).
10. `test_cancel_refunds_full_stake_and_emits_event` — el creador recibe un `Coin` de valor `BET`;
    `stake_value == 0`; `is_cancelled`; `house.fees_collected()` igual que antes (0); `GameCancelled` con
    `cancelled_by = CREATOR`, `refund = BET`.
11. `test_cancel_invite_game_by_creator` — el creador cancela su invitación; reembolso `BET`.
12. `test_cancel_rejects_other_address` — `ENotCreator` (OTHER)
13. `test_cancel_rejects_invitee` — `ENotCreator` (INVITEE)
14. `test_cancel_rejects_cancelled_game` — `ENotPending` (el creador cancela dos veces)
15. `test_cancel_rejects_rejected_game` — `ENotPending` (el invitado rechazó antes)
16. `test_reject_refunds_creator_and_emits_event` — el **creador** recibe `BET`; INVITEE no tiene `Coin<SUI>`
    (`!has_most_recent_for_address<Coin<SUI>>(INVITEE)`); `stake_value == 0`; `is_cancelled`; `fees_collected`
    igual; evento con `cancelled_by = INVITEE`.
17. `test_reject_rejects_other_address` — `ENotInvited` (OTHER)
18. `test_reject_rejects_creator` — `ENotInvited` (CREATOR sobre su propia invitación)
19. `test_reject_rejects_open_game` — `ENoInvitation`
20. `test_reject_rejects_cancelled_game` — `ENotPending` (el creador canceló antes)
21. `test_cancel_refunds_regardless_of_versions` — invariante D-12 §4: `game::set_version_for_testing(OLDER_VERSION)`
    y House en `NEWER_VERSION`; cancelar devuelve `BET`. **Con la House en otra versión, `fees_collected()` aborta:**
    aquí la House solo se lee con `version()` o no se lee; se verifican el `Coin` del creador, `stake_value == 0` e
    `is_cancelled`.
22. `test_reject_refunds_regardless_of_versions` — ídem para rechazar (misma nota).
23. `test_games_of_same_creator_are_independent` — dos partidas del mismo creador, IDs distintos; cancelar una deja la
    otra `Pending` con `stake_value == BET`.
24. `test_cancel_by_other_on_cancelled_game_reports_not_creator` — `ENotCreator`: el creador cancela y luego OTHER
    intenta cancelar (fija "authZ antes que estado").
25. `test_create_reports_bet_error_before_self_invite` — `EBetTooLow`: apuesta < `MIN_BET` **y** `opponent = some(CREATOR)`.

### 6. Smoke

No aplica: el issue lo difiere a #6 (ciclo completo en localnet, donde además se mide el depósito de storage de D3).

### 7. Criterios de aceptación

- Firmas, visibilidades (`entry` sin `public` en las tres), struct, enum, eventos, abort codes y orden de aborts
  exactamente como §3.2.
- Gates (§8) en verde: build 0 warnings, `--lint` 0 lints, test con **≥ 51 tests** (26 House + ≥ 25 Game) todos
  PASS, todo con `--warnings-are-errors`; `Move.lock` sin cambios; coverage informativo (objetivo 100 % de `battleship::game`).
- Contra el merge-base: diff vacío en `Move.toml`, `Move.lock`, `house.move`; `house_tests.move` con `numstat` `3	0`.
- `head -3` de los tres archivos `.move` tocados = §3.1.
- `cancel_game`, `reject_game` y `refund_creator` no mencionan `House` ni `version`.
- No existen `GamePool`, `GameRequest`, `TurnCap`, `init`, OTW, `Active`, `Clock`, `epoch_timestamp_ms`.
- Riesgos: si el `match` o la comparación de enums no compila como se describe, usar la forma que compile sin
  warnings y declararla; si un enum con variante con campos sin construir diera un warning (no previsto), **STOP al
  MID** con el output (no silenciar con `#[allow]`); si comparar eventos con `Option` falla, usar los helpers
  `_for_testing` + `event::num_events()` y declararlo. Rollback: borrar los dos archivos nuevos y
  `git checkout -- contracts/tests/house_tests.move`.

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 (branch con SHA corto, archivos, qué se implementó, tests
y gates con output **completo**, desviaciones o "ninguna", riesgos o "ninguno", documentación: "TASK-2" y snippet de
STATUS). Comandos, desde la raíz, con el guard `printf 'n\n' |` delante de **todo** `sui`:

```bash
printf 'n\n' | sui --version
printf 'n\n' | sui client active-env
(cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && git diff --exit-code -- Move.lock); echo "exit=$?"
# informativo:
(cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
git status --porcelain --untracked-files=all
# base fija: merge-base con master
B=$(git merge-base master HEAD); echo "merge-base=$B"
git diff --stat "$B" -- contracts/Move.toml contracts/Move.lock contracts/sources/house.move
git diff --numstat "$B" -- contracts/tests/house_tests.move
head -3 contracts/sources/game.move contracts/tests/game_tests.move contracts/tests/house_tests.move
# legado, authZ e invariante de reembolso:
grep -nE "GamePool|GameRequest|TurnCap|fun init|Active|Clock|epoch_timestamp_ms" contracts/sources/game.move
grep -n "ctx.sender()" contracts/sources/game.move
grep -nE "fun (cancel_game|reject_game|refund_creator)" contracts/sources/game.move
grep -n "version" contracts/sources/game.move
# secretos: solo líneas agregadas del diff + archivos nuevos sin trackear
git diff -U0 "$B" | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
```

**Resultados esperados:** `sui 1.83.0-16d2dc1e05ed`; `active-env` = `testnet`; exits 0; 0 warnings; 0 lints;
≥ 51 tests PASS; `Move.lock` exit 0; `git status` muestra solo `game.move`, `game_tests.move`, `house_tests.move` y,
si existen, los reportes del ciclo (los artefactos de coverage están ignorados); `--stat` vacío; `numstat` = `3	0`;
`head -3` = §3.1 en los tres; grep de legado vacío; `ctx.sender()` solo dentro de `create_game`, `cancel_game` y
`reject_game`; las líneas de `cancel_game`/`reject_game`/`refund_creator` sin `House`; `version` solo en el `///` y
la declaración del campo, en el `Pack` (`house.version()`), en comentarios y en los helpers `_for_testing`.

**Greps de secretos — matches esperados:** **solo líneas que contienen el propio patrón** de búsqueda (las líneas de
comando de este handoff, de `documents/PLAN_GAME.md` y de los reportes del ciclo), más la línea de
`documents/PLAN_GAME.md` (commiteada en `40a1382`) que nombra a propósito los términos del patrón en su lista de
matches esperados. En `contracts/`: **ningún** match. Cualquier otro match es BLOCKER (SEG-3). Nada de `sui client`
salvo `active-env`; nunca leer, crear ni pegar `client.yaml` ni claves.

---

## TASK-2: `contracts/README.md` y docs del contrato — área: docs

### 1. Historia de usuario del task

**Como** desarrollador de la app (#10-#13) y del aceptar (#6), **quiero** la referencia del contrato `battleship::game`
(funciones, aborts en orden, eventos, estados, cómo se lee por RPC y qué no puede cambiar tras publicar), **para**
consumirlo sin leer el código Move y sin romper el invariante de reembolso.

**Scope:** sección Game de `contracts/README.md` + `agents.md`, `documents/ESTANDARES.md` y `documents/STATUS.md`
alineados con TASK-1. **No entrega:** código; `README.md` raíz (#16); `documents/DECISIONES.md` (lo hace el orquestador).

### 2. Contexto

- `contracts/README.md` tiene hoy solo la sección House; su formato (tablas de objetos, funciones, eventos, abort
  codes, autorización, versionado) es el modelo.
- `agents.md` §6 (`:125-153`) dice "las de partidas son propuesta hasta los planes de #5 y #6" y conserva bullets
  viejos (`Estados: Pending → Active → Resolved`, `:145`; `Cancelación: solo el creador`, `:149`; `Coinflip`, `:150`);
  §8 `battleship::game` (`:178`) dice "no existe hasta #5"; §9 (`:183`) lista "timestamps".
- `documents/ESTANDARES.md` v1.4: PROY-7 (`:67`) lista `accepted`; PROY-8 (`:68`); PROY-10 (`:70`) dice "la mecánica de
  versionado de `Game` la decide el plan de #5".
- `documents/STATUS.md`: roadmap (`:13-17`), H7 (`:66`), H9 (`:68`), baselines.

### 3. Qué implementar

**`contracts/README.md`**
- Tabla de rutas: filas `sources/game.move` (`battleship::game`) y `tests/game_tests.move`.
- Sección `## battleship::game`, mismo formato que House:
  - **Objetos:** `Game` (campos e invariantes: `stake == bet` en `Pending`, 0 en terminal) y `GameState`.
  - **Diagrama de estados** (bloque `mermaid` `stateDiagram-v2` o ASCII): `Pending → Cancelled` (cancelar/rechazar),
    `Pending → Resolved` (aceptar, #6, atómico); sin expiración.
  - **Funciones:** tabla de §3.2 de TASK-1 (firma, visibilidad, quién, aborts **en orden**, evento). Nota: "authZ
    antes que estado" en cancelar/rechazar; versión de la House primero en crear.
  - **Eventos** y **abort codes** (0-6), con la nota: `create_game` también aborta con `house::EWrongVersion` (3, del
    módulo `house`); #11 mapea por **módulo + código**; #6 sigue desde el 7.
  - **Autorización**, **flujo de fondos** (100 % al creador al cancelar o rechazar, sin comisión; la House no se toca)
    y **carreras** (el consenso ordena; la segunda transacción aborta con `ENotPending` y, al revertirse, no pierde su `Coin`).
  - **Comisión:** copiada al crear (D-06 §3).
  - **Versionado del `Game`** (D-15 DV): `version = house.version()` al crear; cancelar y rechazar no reciben la House
    ni leen la versión (invariante D-12 §4); aceptar (#6) la compara; tras un upgrade + `migrate`, las partidas
    pendientes de versiones anteriores **solo se cancelan o rechazan**, salvo que la versión nueva decida aceptarlas;
    `GameState` y el layout de `Game` se **congelan en #8** (un upgrade no agrega variantes ni campos): #18 necesitará
    un objeto nuevo o dynamic fields.
  - **Objeto terminal y storage** (D-15 D3): la partida terminada se conserva; crearla deposita storage
    (≈ 0,002–0,003 SUI, valor exacto del smoke de #6) que **no se recupera**; reversible en una versión futura con una
    función de borrado **restringida al creador** (`sender == creator`), porque el rebate va a quien firma la
    transacción que borra (v1.1-4). La UI (#11) muestra ese costo al crear.
  - **PTB:** `splitCoins(gas, [monto])` + `create_game(house, coin, opción)`; `opponent` es un `Option<address>` puro.
  - **Lectura desde la app** (v1.1-2, formas exactas):
    - Se lee con `getObject` con contenido; todos los campos llegan por RPC aunque no haya getters Move (no hay
      `public` a propósito, PROY-4; agregarlos después es compatible).
    - **JSON-RPC** (`getObject`): cada variante del enum llega con **tres** claves:
      `{"type": "<pkg>::game::GameState", "variant": "Pending", "fields": {}}`; `Resolved` trae
      `"fields": {"acceptor": "0x…", "winner": "0x…"}` (`crates/sui-json-rpc-types/src/sui_move.rs:394-408, 474-486,
      510-520` @ `testnet-v1.83.0`). Los `u64` llegan como **string** (`:457`); `stake` (`Balance`) llega aplanado como su valor.
    - **gRPC/GraphQL:** los campos de la variante van **al mismo nivel** que `"@variant"`:
      `{"@variant": "Resolved", "acceptor": "0x…", "winner": "0x…"}` (`crates/sui-types/src/object/rpc_visitor/mod.rs:247-262`).
    - El parser de #10 usa **un** formato y trata una variante desconocida como error, nunca como `Pending` (SEG-10).
    - La hora de creación es el `timestampMs` del evento `GameCreated` (D-15 D6; `crates/sui-json-rpc-types/src/sui_event.rs:62`).
  - Marcar con "(#6)" lo que agrega #6 (aceptar, `GameResolved`, aborts desde el 7).

**`agents.md`**
- §6: reescribir la nota de cabecera (las reglas de partidas quedan confirmadas por D-06 y D-15; sigue abierta la base
  de la comisión, #6) y los bullets **Fondos** (`stake: Balance<SUI>` dentro de cada `Game`; sin módulo Escrow),
  **Estados** (`Pending → Cancelled | Resolved`, sin `Active`), **Invitación directa** (el invitado también puede
  rechazar), **Cancelación** (creador cancela, invitado rechaza; 100 % al creador; sin comisión; sin expiración; nunca
  bloqueado por versión) y **Coinflip** (aceptar resuelve en la misma transacción, #6).
- §7: gotcha nuevo "Versionado de `Game`": tras `migrate` de la House, `create_game` del paquete viejo aborta con
  `house::EWrongVersion` y las pendientes de versiones anteriores solo se cancelan o rechazan, salvo que la versión
  nueva decida aceptarlas; cancelar y rechazar funcionan en cualquier versión. **No modificar** la línea existente del
  bullet "Repo público" (`:166`).
- §8: `battleship::game` con la API real de #5 (struct, enum, tres `entry`, eventos, aborts 0-6) + lo que agrega #6 +
  "`GameState` y el layout de `Game` quedan cerrados en #8: #18 usa un objeto nuevo o dynamic fields".
- §9: campos reales de `Game` (sin timestamps); `GameState` con sus variantes.

**`documents/ESTANDARES.md`** (versión 1.5 en el encabezado, citando D-20261030-15, #5)
- PROY-7: eventos de partida `GameCreated` y `GameCancelled` (cancelar y rechazar, con `cancelled_by`); los de la
  resolución los fija #6.
- PROY-8: `GameState` = `Pending | Cancelled | Resolved`.
- PROY-10: mecánica de `Game` (D-15 DV): `version` fijada al crear (`= house.version()`), comparada solo al aceptar;
  cancelar y rechazar no reciben la House ni leen la versión; `GameState` no admite variantes nuevas tras publicar.

**`documents/STATUS.md`**
- Roadmap: fila 3 (Game) 🚧 (#5 crear/cancelar/rechazar; #6 aceptar); fila 4 (Escrow) "absorbido en Game
  (D-20261030-15)"; fila 5 (Tests) con los tests de Game.
- H7: parcial (pool, escrow, `TurnCap` y estados resueltos en #5; resolución en #6). H9: parcial (suite de Game).
- Baseline nuevo de contracts (build/lint/test con `--warnings-are-errors`, N tests, coverage) con el SHA que indique
  el orquestador; fila del ciclo activo.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/README.md`, `agents.md`, `documents/ESTANDARES.md`, `documents/STATUS.md`.
- **NO tocar:** `contracts/sources/`, `contracts/tests/`, `Move.toml`, `Move.lock`, `.github/`, `README.md` raíz,
  `documents/DECISIONES.md`, `documents/PLAN_GAME.md`, `documents/REVISION_PLAN_GAME.md`, este handoff.

### 5. Tests obligatorios

No aplica (docs). Se re-corren los gates para confirmar cero delta respecto de TASK-1.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- Tablas del README 1:1 con `game.move` de TASK-1 (el MID las contrasta función por función y código por código).
- Formas del RPC exactamente como §3 (tres claves en JSON-RPC; campos al nivel de `"@variant"` en gRPC/GraphQL).
- `grep -nE "Active|resolve_game|GameAccepted" agents.md documents/ESTANDARES.md contracts/README.md` solo devuelve
  menciones explícitas a #6 o históricas.
- Gates con cero delta respecto de TASK-1; sin cambios en código; el grep de secretos sin matches nuevos en estos archivos.

### 8. Al terminar

Reporte con la plantilla §5. Comandos (guard en todo `sui`):

```bash
printf 'n\n' | sui --version
printf 'n\n' | sui client active-env
(cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && git diff --exit-code -- Move.lock); echo "exit=$?"
git status --porcelain --untracked-files=all
B=$(git merge-base master HEAD); echo "merge-base=$B"
git diff --stat "$B" -- contracts/sources contracts/tests contracts/Move.toml contracts/Move.lock
grep -nE "Active|resolve_game|GameAccepted" agents.md documents/ESTANDARES.md contracts/README.md
git diff -U0 "$B" | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
```

**Esperado:** igual que TASK-1 en gates y tests (cero delta); `--stat` muestra solo los archivos de TASK-1 (si ya
están commiteados, el mismo resultado que dejó TASK-1); greps de secretos con los mismos matches esperados que
TASK-1 (solo líneas que contienen el propio patrón + la línea declarada de `PLAN_GAME.md`) y **ninguno** en
`contracts/README.md`, `agents.md`, `ESTANDARES.md` ni `STATUS.md`.

---

## Para el orquestador (no es trabajo del DEV)

- Al aprobarse el ciclo: comentar en el issue #18 que `GameState` y el layout de `Game` se congelan en #8 y que la
  batalla naval real necesitará un objeto nuevo o dynamic fields (plan v1.1, hallazgo 5).
- Agregar a D-20261030-14 la aclaración "incluye `contracts/tests/*.move`" al registrar el cierre de #5 (v1.1-5).
- Nota para el plan de #6: chequeo de versión del `Game` al principio de aceptar (v1.1-3); medir en el smoke el
  depósito de storage de crear y cancelar (`storageCost`/`storageRebate`) y llevar el valor al README.
