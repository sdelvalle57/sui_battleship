# HANDOFF_ACCEPT
> Plan: PLAN_ACCEPT v2 (aprobado por el MAYOR, "Revisión v2" de `documents/REVISION_PLAN_ACCEPT.md`) | Issue: #6 |
> Branch: `feature/issue-6-accept` | Versión: v1 | Fecha: 2026-10-30 | Autor: MID
> Aplica además los hallazgos de la revisión v2 a resolver en el handoff: n1, n2, n3, n4, s3, s5, s6.
> Un solo archivo con los tres tasks. El orquestador autoriza cada task después de la revisión MID del anterior.

## 0. Baseline de gates verificado (2026-10-30)

| Ítem | Valor | Fuente |
|---|---|---|
| `master` | `b7ab390` (merge de #31, housekeeping de #5) | `git log` |
| Branch | `feature/issue-6-accept` @ `0da1b3e` (solo docs: plan v2, revisión, D-20261030-16) = mismo código que `master` | `git log --oneline -2` |
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`, `suiup`) | STATUS, Toolchain |
| Framework | `Move.lock` → `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139; testnet en 140, H13: sin repin en #6) | STATUS H13 |
| `sui move build -e testnet --warnings-are-errors` | exit 0, **0 warnings** | STATUS, medido en `67fa60d` (mismo código que `b7ab390`) |
| `sui move build -e testnet --lint --warnings-are-errors` | exit 0, **0 lints** | ídem |
| `sui move test -e testnet --warnings-are-errors` | exit 0, **52 tests PASS** (26 `house_tests` + 26 `game_tests`); `Move.lock` sin delta | ídem |
| Coverage (informativo) | `house` 100 %, `game` 98,02 % (falta el brazo `Resolved` de `is_pending`) | ídem |
| CI | job `contracts` **success** en `b7ab390` (run 41167621065, `push`) | `gh run list --branch master` |
| App | no existe | — |

Cero delta = mismos conteos. Al terminar TASK-1 el baseline nuevo es: 0 warnings, 0 lints, **≥ 83 tests** (26 + ≥ 57).

## Decisiones del owner (no reabrir)

| ID | Decisión que aplica a este handoff |
|---|---|
| D-20261030-06 | §1 resolución **atómica** al aceptar (sin `Active`); §3 el `Game` copia el `fee_rate` al crear y es el que se aplica; §4 el invitado puede rechazar |
| D-20261030-11 | §5 abort codes clásicos `const E…: u64`, números estables; fee por defecto 0; `MAX_FEE_BPS` = 1000 |
| D-20261030-12 | §2 accessors y `add_fees` de la House chequean versión; §4 ningún reembolso (cancelar/rechazar) bloqueado por versión |
| D-20261030-14 | cabecera `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0` (ya presente; no se toca) |
| D-20261030-15 | D3 objeto terminal conservado (storage a medir en TASK-3); D8 funciones `entry` no `public`; DV `game.version` comparada solo al aceptar |
| D-20261030-16 | D2 floor; D3 comisión sobre el pozo completo; D4 solo `GameResolved`; D5 `accept_game` + aborts 7-10 + reuso de 4 y 5 + orden versión → House → authZ → estado → monto; D6 sorteo por índice sin ramas y `add_fees` siempre |
| Precisión de D5 (M1, revisión MAYOR) | la comisión se cobra (`add_fees`) después del monto y **antes** del sorteo; tras el sorteo nada que dependa del resultado puede abortar |
| D-20261030-07 + FLUJO §6 | sin claves en `~/.sui/` ni por agentes; **excepción acotada** de TASK-3: claves desechables de localnet solo dentro de `$SMOKE_DIR`, nunca leídas, impresas ni pegadas, borradas al cerrar |

Reglas de proceso para los tres tasks: sin commits, pushes ni cambios de branch (el orquestador commitea tras la
revisión MID); todo `sui` con `printf 'n\n' |` delante; fuera de TASK-3, nada de `sui client` salvo
`printf 'n\n' | sui client active-env`; nunca leer, crear, copiar ni pegar `client.yaml` ni claves de `~/.sui/`.

---

## TASK-1: `accept_game`, cobro, pago, `GameResolved` y suite de tests — área: contracts

### 1. Historia de usuario del task

**Como** jugador que ve una partida abierta (o que recibió una invitación), **quiero** aceptarla igualando la apuesta
exacta y que el contrato decida el ganador en la misma transacción, cobrando el pozo menos la comisión si gano,
**para** jugar sin depender de nadie y con un sorteo que nadie puede deshacer cuando pierde; **y como** owner,
**quiero** que la comisión entre sola a la House.

**Scope:** `accept_game` y sus funciones privadas en `game.move`, el evento `GameResolved` y 31 tests nuevos.
**Lo que NO entrega:** docs (TASK-2), smoke (TASK-3), UI (#10-#12), cambios en `house.move`.

### 2. Contexto (qué existe hoy)

- `contracts/sources/game.move`: `Game` (`:24-40`: `version`, `house_id`, `creator`, `opponent`, `bet`, `stake`,
  `fee_rate`, `state`), `GameState` con `Resolved { acceptor, winner }` sin construir (`:43-47`), eventos
  `GameCreated`/`GameCancelled` (`:50-64`), `create_game`/`cancel_game`/`reject_game` (`:69-118`), `refund_creator`
  (`:122-132`), `is_pending` (`:135-140`), helpers `#[test_only]` (`:142-214`). Abort codes 0-6 (`:15-21`).
- `contracts/sources/house.move`: `add_fees` `public(package)` con chequeo de versión, acepta 0 (`:149-153`);
  `version()` sin chequeo (`:179-183`); `update_fee_rate`, `update_bet_limits`, `withdraw_fees` (`:96-147`);
  `init_for_testing`, `set_version_for_testing` (`:190-198`).
- `contracts/tests/game_tests.move`: modelo de estilo a **replicar** — constantes de direcciones y montos (`:14-23`),
  `publish()` (`:26-31`), `create()` (`:35-43`), `create_expecting_abort()` (`:46-53`), `assert_single_coin()`
  (`:56-61`), comparación de eventos `event::events_by_type<T>() == vector[expected]` antes del `next_tx` (`:75-87`),
  cambio de fee como `PUBLISHER` (`:136-142`), versiones con `set_version_for_testing` (`:405-433`),
  `expected_failure(abort_code = battleship::game::E…)` con ruta completa (`:187`).
- `sui::random` @ `719fb29` (`crates/sui-framework/packages/sui-framework/sources/random.move`):
  `new_generator(r: &Random, ctx: &mut TxContext)` (`:143-150`); `generate_u8_in_range` (`:274-277`, sin ramas por
  valor, `:179-194, 234-252`); `create_for_testing(ctx)` (`:61-64`) y `update_randomness_state_for_testing(&mut Random,
  round, bytes, ctx)` (`:120-128`) **exigen `sender == @0x0`** (`:43, 96`); primera ronda 0, luego +1 (`:98-112`).
  Modelo de test: `crates/sui-framework/packages/sui-framework/tests/random_tests.move:14-32`.
- Lint `public_random` (nivel por defecto): una función `public` con `Random`/`RandomGenerator` sale como warning en
  el build y como error con `--warnings-are-errors` (`move-compiler/src/sui_mode/linters/public_random.rs:14-48`,
  `linters/mod.rs:172-179` @ `testnet-v1.83.0`). `entry` privada no lo dispara.

### 3. Qué implementar

**3.1 Constantes** (después de las existentes, mismo estilo con comentario de condición; borrar el comentario
`// #6 continues from 7` de `:14` dejando "Abort codes: stable numbers, never reused for another condition."):

```move
const EVersionMismatch: u64 = 7; // game.version != house.version()
const EWrongHouse: u64 = 8; // object::id(house) != game.house_id
const ESelfPlay: u64 = 9; // sender == game.creator
const EWrongStake: u64 = 10; // payment value != game.bet

const BPS_DENOMINATOR: u128 = 10_000; // basis points per unit
```

**3.2 Evento** (después de `GameCancelled`):

```move
/// Emitted by `accept_game`: the game was accepted and resolved in the same transaction
/// (`pot == payout + fee`).
public struct GameResolved has copy, drop {
    game_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,
    fee: u64,
    payout: u64,
}
```

**3.3 Funciones** (`use sui::random::Random;` junto a los demás `use`; `Balance` ya está importado en `:9`). Copiar
este modelo; los comentarios explican el POR QUÉ (LIM-7) y se conservan:

```move
/// Accepts a pending game matching its bet exactly and resolves it with a coinflip in the same transaction:
/// the fee goes to the House and the winner gets the pot minus the fee. Anyone but the creator; for an
/// invitation, only the invitee. Emits `GameResolved`.
entry fun accept_game(
    game: &mut Game,
    house: &mut House,
    payment: Coin<SUI>,
    r: &Random,
    ctx: &mut TxContext,
) {
    let acceptor = ctx.sender();
    game.assert_acceptable(house, &payment, acceptor);
    // Everything that can abort regardless of the outcome (checks and the fee, which does not depend on it)
    // runs before the draw. Non-public `entry` + generator created here (SEG-5): no other module can call
    // this and abort on a loss. After the draw nothing that depends on the outcome can abort; the global
    // transaction limits and gas affect both outcomes alike.
    let (payout, pot, fee) = game.collect_pot(house, payment);
    let mut generator = r.new_generator(ctx);
    let winner_index = generator.generate_u8_in_range(0, 1);
    game.pay_winner(payout, pot, fee, acceptor, winner_index as u64, ctx);
}

// All accept checks, in contract order (README), before any randomness is drawn.
fun assert_acceptable(game: &Game, house: &House, payment: &Coin<SUI>, acceptor: address) {
    assert!(game.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == game.house_id, EWrongHouse);
    // AuthZ before state: an unauthorized caller never learns the game state (deny by default).
    assert!(acceptor != game.creator, ESelfPlay);
    assert!(game.opponent.is_none() || *game.opponent.borrow() == acceptor, ENotInvited);
    assert!(game.is_pending(), ENotPending);
    assert!(payment.value() == game.bet, EWrongStake);
}

// Joins both stakes and sends the fee to the House; returns (payout balance, pot, fee). Runs before the draw:
// `add_fees` is always called, even with a zero fee, and its House version check (house::EWrongVersion,
// D-20261030-12 §2) aborts here, never after the outcome is known.
fun collect_pot(game: &mut Game, house: &mut House, payment: Coin<SUI>): (Balance<SUI>, u64, u64) {
    let mut pot = game.stake.withdraw_all();
    pot.join(payment.into_balance());
    let pot_value = pot.value();
    let fee = pot.split(fee_amount(pot_value, game.fee_rate));
    let fee_value = fee.value();
    house.add_fees(fee);
    (pot, pot_value, fee_value)
}

// Pays the winner. Branch-free on the outcome (SEG-5, D-20261030-16 D6): `winner_index` (0 or 1) only selects
// an address; both outcomes run the same state change, event and transfer, and nothing that depends on the
// outcome can abort here (transaction limits and gas weigh the same on both paths).
fun pay_winner(
    game: &mut Game,
    payout: Balance<SUI>,
    pot: u64,
    fee: u64,
    acceptor: address,
    winner_index: u64,
    ctx: &mut TxContext,
) {
    let players = vector[game.creator, acceptor];
    let winner = *players.borrow(winner_index);
    game.state = GameState::Resolved { acceptor, winner };
    event::emit(GameResolved {
        game_id: object::id(game),
        creator: game.creator,
        acceptor,
        winner,
        pot,
        fee,
        payout: payout.value(),
    });
    transfer::public_transfer(coin::from_balance(payout, ctx), winner);
}

// Fee in basis points over the whole pot (D-20261030-16 D3). u128 intermediate (SEG-6): with a high `max_bet`
// the product pot × fee_rate overflows u64. Integer division rounds down: the remainder goes to the winner and
// the House never charges more than the rate (D-20261030-16 D2).
fun fee_amount(pot: u64, fee_rate: u16): u64 {
    ((pot as u128) * (fee_rate as u128) / BPS_DENOMINATOR) as u64
}
```

- Ubicación: `accept_game` después de `reject_game`; las privadas después de `refund_creator`/`is_pending`. Actualizar
  el comentario de `is_pending` (`:134`) a `// Used by cancel_game, reject_game and accept_game.`
- **Sin plan B (s3):** Move admite tuplas con valores sin `drop` (`Balance`); `collect_pot` devuelve
  `(Balance<SUI>, u64, u64)` tal cual. Si `vector[...]` + `borrow` o `generate_u8_in_range` no compilaran como está,
  el DEV usa la forma **sin ramas** que compile sin warnings y la declara; si no existiera, **STOP al MID** (nunca un
  `if` sobre el resultado: es D-16 D6).
- **Helpers `#[test_only]` nuevos** en `game.move` (al final, mismo estilo que `:142-214`):

```move
#[test_only]
public fun accept_with_winner_for_testing(
    game: &mut Game,
    house: &mut House,
    payment: Coin<SUI>,
    winner_index: u64,
    ctx: &mut TxContext,
) {
    let acceptor = ctx.sender();
    game.assert_acceptable(house, &payment, acceptor);
    let (payout, pot, fee) = game.collect_pot(house, payment);
    game.pay_winner(payout, pot, fee, acceptor, winner_index, ctx);
}

#[test_only]
public fun is_resolved_for_testing(game: &Game): bool { /* match Resolved => true, _ => false */ }

#[test_only]
public fun acceptor_for_testing(game: &Game): Option<address> { /* some(acceptor) si Resolved, si no none */ }

#[test_only]
public fun winner_for_testing(game: &Game): Option<address> { /* some(winner) si Resolved, si no none */ }

#[test_only]
public fun new_game_resolved_for_testing(
    game_id: ID, creator: address, acceptor: address, winner: address, pot: u64, fee: u64, payout: u64,
): GameResolved {
    GameResolved { game_id, creator, acceptor, winner, pot, fee, payout }
}
```

**AuthZ por función:** `accept_game`: cualquiera menos `game.creator` (`ESelfPlay`); si `opponent = some(a)`, solo `a`
(`ENotInvited`). Cada denegación con su test `expected_failure` (SEG-2).

**Orden de aborts (contrato):** `EVersionMismatch` (7) → `EWrongHouse` (8) → `ESelfPlay` (9) → `ENotInvited` (5) →
`ENotPending` (4) → `EWrongStake` (10) → `house::EWrongVersion` (3, en `add_fees` de `collect_pot`) → sorteo.

**Flujo de fondos:** pozo = `stake` (= `bet`) + pago (= `bet`); `fee = ⌊pot × game.fee_rate / 10_000⌋` a la House por
`add_fees` antes del sorteo; `payout = pot − fee` al ganador como `Coin` después. Invariante: `payout + fee == 2 × bet`,
`fees_collected += fee`, `stake == 0`, estado `Resolved { acceptor, winner }`.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/sources/game.move`, `contracts/tests/game_tests.move`.
- **NO tocar:** `contracts/sources/house.move`, `contracts/tests/house_tests.move`, `contracts/Move.toml`,
  `contracts/Move.lock`, `.github/`, `.gitignore`, `agents.md`, `documents/` (salvo el reporte que pida el
  orquestador), `contracts/README.md`.

### 5. Tests obligatorios (`contracts/tests/game_tests.move`)

**Imports:** agregar `GameResolved` al `use battleship::game::{…}` y `use sui::random::{Self, Random};`.

**Constantes nuevas:** `ACCEPTOR: address = @0xE` (aceptante de partidas abiertas); `SYSTEM: address = @0x0` (sender
obligatorio para crear/actualizar `Random`); `SEED: vector<u8>` de 32 bytes fijos (p. ej. el de
`random_tests.move:24`) y, para el test 37, un vector de semillas o una regla determinista para derivarlas;
`HUGE_BET: u64 = 9_000_000_000_000_000_000`.

**Helpers nuevos** (mismo estilo que `:25-61`):
- `set_fee_rate(scenario, bps)` y `set_bet_limits(scenario, min, max)`: `next_tx(PUBLISHER)`, `take_shared<House>`,
  `take_from_sender<HouseCap>`, llamada, devolver ambos (modelo `:137-142`).
- `random_ready(scenario)`: `next_tx(SYSTEM)`; `random::create_for_testing(scenario.ctx())`; `next_tx(SYSTEM)`;
  `let mut r = scenario.take_shared<Random>()`; `r.update_randomness_state_for_testing(0, SEED, scenario.ctx())`;
  `test_scenario::return_shared(r)`. Una vez por escenario; para más rondas (test 37), rondas 1, 2, … con `SYSTEM`.
- `accept(scenario, game_id, acceptor, amount)`: `next_tx(acceptor)`; `take_shared_by_id<Game>`, `take_shared<House>`,
  `take_shared<Random>`; `coin::mint_for_testing<SUI>(amount, …)`; `game::accept_game(&mut game, &mut house, payment,
  &random, scenario.ctx())`; devolver los tres compartidos. Lo usan los tests de abort (fijan el orden del `entry`
  real) y los 36-37.
- `accept_forced(scenario, game_id, acceptor, amount, winner_index)`: igual con `accept_with_winner_for_testing` (sin
  `Random`).
- `sum_coins(scenario, account): u64`: suma todos los `Coin<SUI>` de `account` (`test_scenario::ids_for_address`,
  `take_from_address_by_id`, `return_to_address`).

**Conservación (SEG-4):** en tests de **una** partida, tras el `next_tx`: el ganador tiene **un** `Coin` de valor
`payout` (`assert_single_coin`), el perdedor ninguno (`!has_most_recent_for_address<Coin<SUI>>`), `fees_collected`
subió `fee`, `stake_value == 0`, `is_resolved`, `acceptor_for_testing`/`winner_for_testing` correctos,
`events_by_type<GameResolved>() == vector[expected]` (leído **antes** del `next_tx`) y `payout + fee == 2 × bet`. En
tests de **varias** partidas (35, 37): `sum_coins(creador) + sum_coins(aceptante) == Σ payout`,
`fees_collected == Σ fee` y cada `Game` con `stake_value == 0`. Ojo (tests 45-47, 51-53): con la House en otra versión,
`fees_collected()` aborta con `house::EWrongVersion`; ahí la House solo se lee con `version()` o no se lee.

**Lista** (nombres exactos; 27-57, a continuación de los 26 existentes):

| # | Test | Qué fija |
|---|---|---|
| 27 | `test_accept_open_game_creator_wins_pays_payout_and_fee` | fee 250, `BET`, índice 0 (forzado) |
| 28 | `test_accept_open_game_acceptor_wins_pays_payout_and_fee` | fee 250, `BET`, índice 1 |
| 29 | `test_accept_invite_by_invitee_resolves` | el invitado acepta (índice 1) |
| 30 | `test_accept_with_zero_fee_pays_whole_pot` | fee por defecto 0: `fee = 0`, `payout = pot`, `fees_collected` 0 |
| 31 | `test_accept_with_max_fee_charges_ten_percent` | 1000 bps: `fee = pot / 10` |
| 32 | `test_accept_rounds_fee_down_on_indivisible_pot` | `bet = 1_000_001`, 250 bps → `fee = 50_000`, `payout = 1_950_002` |
| 33 | `test_accept_max_bet_with_max_fee_does_not_overflow` | `bet = MAX_BET`, 1000 bps → `fee = 10_000_000_000`, `payout = 90_000_000_000` |
| 34 | `test_accept_uses_fee_rate_copied_at_creation` | crear con 250, subir a 500, aceptar → comisión al 250 |
| 35 | `test_fees_from_two_games_accumulate_and_withdraw_exactly` | dos partidas; conservación multipartida; `withdraw_fees` (como `PUBLISHER`) = Σ `fee`, House en 0 |
| 36 | `test_accept_with_random_resolves_and_conserves_funds` | `accept_game` real: ganador ∈ {creador, aceptante}; conservación para el que salió |
| 37 | `test_accept_with_random_reaches_both_outcomes` | N ≤ 8 partidas con `Random` real y semillas fijas: al menos una gana el creador y otra el aceptante; conservación multipartida; N y semillas en constantes |
| 38 | `test_accept_rejects_own_game` | `ESelfPlay` (abierta) |
| 39 | `test_accept_rejects_non_invited` | `ENotInvited` (OTHER sobre invitación a INVITEE) |
| 40 | `test_accept_rejects_lower_stake` | `EWrongStake` (`BET - 1`) |
| 41 | `test_accept_rejects_higher_stake` | `EWrongStake` (`BET + 1`) |
| 42 | `test_accept_rejects_cancelled_game` | `ENotPending` |
| 43 | `test_accept_rejects_resolved_game` | `ENotPending` (segunda aceptación) |
| 44 | `test_accept_rejects_other_house` | `EWrongHouse`: crear la partida **antes** de la segunda House; luego `house::init_for_testing` otra vez, `next_tx`, ID con `most_recent_id_shared<House>()` y `take_shared_by_id` |
| 45 | `test_accept_rejects_game_of_older_version` | `EVersionMismatch` (`game.set_version_for_testing(OLDER_VERSION)`) |
| 46 | `test_accept_rejects_house_of_newer_version` | `EVersionMismatch` (House en `NEWER_VERSION`, partida en 1) |
| 47 | `test_accept_from_old_package_aborts_in_fee_collection` | `battleship::house::EWrongVersion`: partida creada en v1; luego House **y** partida en `NEWER_VERSION`; pasa los chequeos y aborta en `add_fees` dentro de `collect_pot`, antes del sorteo |
| 48 | `test_accept_by_other_on_cancelled_invite_reports_not_invited` | `ENotInvited` (authZ antes que estado, nota (2) de #5) |
| 49 | `test_accept_by_creator_on_cancelled_game_reports_self_play` | `ESelfPlay` (authZ antes que estado) |
| 50 | `test_accept_by_creator_on_own_invite_reports_self_play` | `ESelfPlay`: el creador acepta **su** invitación a INVITEE (9 antes que 5) |
| 51 | `test_accept_reports_version_before_authz` | `EVersionMismatch` (OTHER sobre invitación con versión distinta) |
| 52 | `test_accept_reports_house_before_authz` | `EWrongHouse` (el creador acepta su partida contra otra House) |
| 53 | `test_accept_reports_version_before_house` | `EVersionMismatch` (otra House **y** en `NEWER_VERSION`) |
| 54 | `test_accept_reports_state_before_stake` | `ENotPending` (partida cancelada, monto incorrecto) |
| 55 | `test_cancel_rejects_resolved_game` | `ENotPending` (nota (1) de #5) |
| 56 | `test_reject_rejects_resolved_game` | `ENotPending` (invitación aceptada; luego el invitado rechaza) |
| 57 | `test_accept_huge_pot_needs_u128_intermediate` | **antes de crear (s5):** `set_bet_limits(MIN_BET, HUGE_BET)` y `set_fee_rate(1000)` (el fee se copia al crear); `bet = HUGE_BET` → `pot = 18_000_000_000_000_000_000`, `fee = 1_800_000_000_000_000_000`, `payout = 16_200_000_000_000_000_000`, conservación completa. Con la fórmula en `u64` este test aborta por overflow |

Los abort tests (38-54) usan `accept` con el `entry` real y `random_ready` previo; los de reparto (27-35, 57), el wrapper
forzado. Todos deterministas, sin red.

### 6. Smoke

No aplica en TASK-1 (lo cubre TASK-3).

### 7. Criterios de aceptación

- Firma, visibilidad (`entry` sin `public`), constantes, evento, orden de aborts y orden de líneas
  `collect_pot` → `new_generator` → `pay_winner` exactamente como §3.
- Gates canónicos exit 0: build **0 warnings**, `--lint` **0 lints**, test **≥ 83 PASS** (26 + 57); `Move.lock` sin
  delta. Coverage informativo: `battleship::game` **100 %**.
- Verificación (§Verificación al final) con los resultados esperados.

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 (Branch + SHA corto, archivos, qué se implementó, tests y
gates con output pegado, verificación, desviaciones o "ninguna", riesgos, documentación + snippet para STATUS). Sin
commits ni pushes.

---

## TASK-2: Documentación del contrato y del proceso — área: docs

### 1. Historia de usuario del task

**Como** desarrollador de la app (#10-#12) y del panel (#14), **quiero** la referencia completa de aceptar (firma,
aborts en orden, evento, comisión, aleatoriedad, PTB, cancelaciones del runtime) y un procedimiento seguro para
levantar localnet, **para** consumir el contrato sin leer Move y correr smokes sin tocar las claves del owner.

**Scope:** docs alineadas 1:1 con TASK-1 y el procedimiento de localnet aislada en docs que sobreviven al housekeeping.
**Lo que NO entrega:** código; valores de storage medidos y fixtures (TASK-3).

### 2. Contexto

`contracts/README.md` marca lo pendiente con "(#6)" (`:157, 164, 187, 200-201, 222, 229-230, 274-275, 283-285`);
`agents.md` §6 deja abierta la base de la comisión (`:127-129`), §3 recomienda `sui start --with-faucet
--force-regenesis` a secas (`:74`) y §8 anuncia lo que agrega #6 (`:183-190`); PROY-7 dice "los de la resolución los
fija #6" (`documents/ESTANDARES.md:67`); FLUJO §6 recomienda el mismo `sui start` (`documents/FLUJO_AGENTES.md:121`).
Hallazgo a documentar: con `--force-regenesis` y sin `SUI_CONFIG_DIR`, `sui start` reescribe
`~/.sui/sui_config/client.yaml` (`crates/sui/src/sui_commands.rs:1271-1273, 1921-1940` @ `testnet-v1.83.0`).

### 3. Qué implementar

- **`contracts/README.md`** (sección `battleship::game`, mismo formato que hoy):
  - Intro y tabla de objetos sin "(#6)" pendientes; diagrama `Pending --> Resolved: accept_game (atómico con el
    coinflip)`.
  - Funciones: fila de `accept_game(game: &mut Game, house: &mut House, payment: Coin<SUI>, r: &Random, ctx: &mut
    TxContext)` (`entry`; cualquiera menos el creador, con invitación solo el invitado; aborts **en orden**:
    `EVersionMismatch` (7), `EWrongHouse` (8), `ESelfPlay` (9), `ENotInvited` (5), `ENotPending` (4), `EWrongStake`
    (10), `house::EWrongVersion` (3, en el cobro); `GameResolved`); filas de las privadas `assert_acceptable`,
    `collect_pot`, `pay_winner`, `fee_amount`; `is_pending` usada también por `accept_game`.
  - Bullet **Aceptar**: authZ antes que estado; versión y House primero; cobro de la comisión antes del sorteo; tras el
    sorteo nada que dependa del resultado puede abortar (los límites globales de la transacción y el gas afectan igual
    a ambos caminos, n3).
  - Eventos: `GameResolved` con `game_id`, `creator`, `acceptor`, `winner`, `pot`, `fee`, `payout` (`pot == payout + fee`).
  - Abort codes: filas 7-10; 4 y 5 extendidas a `accept_game`; nota de `house::EWrongVersion` desde `accept_game`.
  - Autorización y Flujo de fondos de aceptar (invariante; comisión antes del sorteo, pago después).
  - **Comisión**: `fee = ⌊pot × fee_rate / 10_000⌋` (intermedio `u128`), base = pozo completo (D3), redondeo hacia
    abajo con el resto al ganador (D2), `add_fees` siempre (también 0); ejemplo `bet = 1_000_001`, 250 bps → 50_000 /
    1_950_002.
  - **Aleatoriedad** (nueva): `entry` no `public` (lint `public_random`), generador creado dentro, sorteo por índice
    `generate_u8_in_range(0, 1)` sin ramas (D6), todo lo que puede abortar va antes.
  - **Cancelaciones del runtime** (nueva): `ExecutionCancelledDueToRandomnessUnavailable` (DKG sin terminar) y
    `ExecutionCancelledDueToSharedObjectCongestion` (`&mut House` congestionada) llegan como `effects.status = failure`
    con ese `kind` y **sin** `MoveAbort` (`crates/sui-types/src/execution_status.rs:259, 270-271`); #12 las muestra como
    "reintentar", nunca como éxito ni como error del contrato (SEG-10).
  - **PTB** de aceptar: `splitCoins(gas, [bet])` → `accept_game(game, house, coin, random)` con `tx.object.random()`;
    después del comando que usa `Random` solo `TransferObjects`/`MergeCoins` (si no, la transacción se rechaza antes de
    ejecutarse: `crates/sui-types/src/transaction.rs:1732-1760` @ `testnet-v1.83.0`).
  - Carreras con aceptar; Versionado del `Game` con los tres casos (partida vieja → 7; House migrada → 7; código viejo
    con partida nueva → `house::EWrongVersion` en el cobro); Contención (`accept_game` toma `&mut House`).
  - "Objeto terminal y storage": dejar "(valor exacto: smoke de #6, TASK-3)"; TASK-3 pone los números.
- **`agents.md`:**
  - §3: reemplazar la fila `sui start --with-faucet --force-regenesis` por "Red local para smokes: **solo aislada**
    (ver Localnet aislada)" y agregar una subsección **"Localnet aislada (smokes)"** con el procedimiento completo
    copiado aquí, no solo citado (n1, porque el housekeeping borra `SMOKE_ACCEPT.md`):
    1. las variables NO persisten entre llamadas del agente;
    2. plantilla de `env.sh` (la de TASK-3 §6.2) con `SUI_CONFIG_DIR`, `TMPDIR`, `HOME`, `MOVE_HOME`, `SUI`,
       `smoke_guard`;
    3. `. <SMOKE_DIR>/env.sh && smoke_guard &&` delante de cada `"$SUI"`;
    4. `sui genesis --working-dir` + `sui start --network.config` (sin `--force-regenesis` ni faucet), lanzado con
       `exec` desde un comando en segundo plano y con PID en archivo;
    5. `client addresses --json` (nunca `new-address`);
    6. ningún archivo de `$SMOKE_DIR/net` se lee, copia ni pega (n4);
    7. cierre con `kill` por PID y `rm -rf`.

    Motivo con la cita `sui_commands.rs:1271-1273`.
  - §6: nota de cabecera (comisión y aceptar fijadas por D-20261030-16); bullets **Comisión** (base pozo, floor) y
    **Coinflip** (orden validar → cobrar → sortear → pagar; PTB con `Random` al final).
  - §7: gotchas de PTB con `Random`, de cancelaciones del runtime y de localnet sin aislar.
  - §8: API de `battleship::game` con `accept_game`, `GameResolved`, aborts 0-10 (+ `house::EWrongVersion`).
  - §2: layout con `contracts/fixtures/` (fixtures reales de RPC, TASK-3). §9: evento de resolución.
- **`documents/ESTANDARES.md`:** PROY-7 → "Partidas: `GameCreated` (crear), `GameCancelled` (cancelar y rechazar, con
  `cancelled_by`) y `GameResolved` (aceptar, con `acceptor`, `winner`, `pot`, `fee`, `payout`)"; PROY-5 → agregar
  "todo lo que puede abortar va antes del sorteo; el sorteo elige por índice, sin ramas; el `Random` va en el último
  `MoveCall` del PTB"; encabezado versión 1.6 con "(PROY-5 y PROY-7 por D-20261030-16, #6)".
- **`documents/FLUJO_AGENTES.md` §6:** cambiar "localnet con `sui start --with-faucet --force-regenesis`" por
  "localnet **aislada** según `agents.md` §3 (Localnet aislada); nunca `sui start` a secas".
- **`documents/STATUS.md`:** H7 ✅ y H9 ✅ (con el SHA de TASK-1 que indique el orquestador); roadmap: Game ✅, Tests ✅;
  baseline nuevo (≥ 83 tests, coverage del reporte de TASK-1); fila del ciclo activo de #6; Toolchain sin cambios.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/README.md`, `agents.md`, `documents/ESTANDARES.md`, `documents/FLUJO_AGENTES.md`,
  `documents/STATUS.md`.
- **NO tocar:** `contracts/sources/`, `contracts/tests/`, `Move.toml`, `Move.lock`, `documents/DECISIONES.md`,
  `README.md` raíz, `documents/PLAN_ACCEPT.md`, `documents/HANDOFF_ACCEPT.md`.

### 5. Tests obligatorios

No aplica (docs). El DEV re-corre los gates canónicos y confirma cero delta respecto de TASK-1.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- Tablas del README 1:1 con `game.move` (el MID contrasta función por función, código por código y el orden de aborts).
- `grep -nE "\(#6\)|GameAccepted|resolve_game|Active" contracts/README.md agents.md documents/ESTANDARES.md` solo
  devuelve menciones históricas (p. ej. "sin estado `Active`"); el DEV pega el output y clasifica cada línea.
- `grep -n "force-regenesis" agents.md documents/FLUJO_AGENTES.md` solo devuelve la advertencia de aislamiento.
- Sin cambios de código; gates en cero delta.

### 8. Al terminar

Reporte con la plantilla de FLUJO §5. Sin commits ni pushes.

---

## TASK-3: Smoke en localnet, storage medido y fixtures de `getObject` — área: contracts (smoke) + docs

### 1. Historia de usuario del task

**Como** owner, **quiero** ver el ciclo completo funcionando en una red real (local) —crear, cancelar, rechazar,
aceptar con aleatoriedad real, retirar comisiones— con los costos de storage medidos, **para** saber que el contrato se
comporta como dicen los tests antes de publicarlo en testnet (#8) y darle a #10 respuestas reales del RPC.

**Scope:** smoke en localnet aislada con `documents/SMOKE_ACCEPT.md` completado durante la corrida, tres fixtures
JSON-RPC y los valores de storage en el README.
**Lo que NO entrega:** testnet, publicación real (#8), fixtures gRPC/GraphQL o de eventos (#10).

### 2. Contexto

- Runbook: `documents/SMOKE_ACCEPT.md` (pasos, comandos y columnas a completar). Este task lo ejecuta y lo llena.
- Procedimiento de localnet aislada: `agents.md` §3 "Localnet aislada" (TASK-2) = §6.2 de este task.
- Precio de storage 76 y rebate 9999 iguales a testnet (`crates/sui-protocol-config/src/lib.rs:3232, 4907` @
  `testnet-v1.83.0`); aleatoriedad habilitada en localnet (`:3456-3461`).

### 3. Qué implementar

Nada de código. Archivos producidos: `contracts/fixtures/localnet/jsonrpc/game_pending.json`, `game_cancelled.json`,
`game_resolved.json`; secciones de resultados de `documents/SMOKE_ACCEPT.md`; README "Objeto terminal y storage" con
los valores medidos y "Lectura desde la app" con la ruta de las fixtures; fila del smoke en STATUS. Si la corrida
obliga a ajustar el procedimiento de localnet, también `agents.md` §3 (y se declara).

### 4. Archivos a tocar / NO tocar

- **Tocar:** `documents/SMOKE_ACCEPT.md`, `contracts/fixtures/localnet/jsonrpc/*.json` (nuevos), `contracts/README.md`
  (storage + fixtures), `documents/STATUS.md`, `agents.md` §3 solo si hubo ajuste.
- **NO tocar:** código, tests, `Move.toml`, `Move.lock` (si `test-publish` lo modifica: `git checkout --
  contracts/Move.lock` y declararlo), `Published.toml` (no debe aparecer), nada en `~/.sui/`.

### 5. Tests obligatorios

No hay tests nuevos. Al final, con el árbol limpio de artefactos del smoke, los gates canónicos (sin cargar `env.sh`)
en cero delta respecto de TASK-2.

### 6. Smoke

#### 6.1 Qué ejecuta el DEV y qué devuelve

- **Ejecuta, todo en local** (sin push, sin testnet, sin wallet del owner): génesis y arranque de una localnet en un
  directorio del scratchpad, publicación efímera del paquete en ella, las transacciones de los 16 pasos (0-15) de
  `SMOKE_ACCEPT.md`, la captura de 3 respuestas `sui_getObject` y el cierre (detener la red y borrar el directorio).
- **Devuelve** (en `SMOKE_ACCEPT.md` y en el reporte): por paso, el resultado obtenido con digest, `status`, eventos,
  `gasUsed` y `balanceChanges` extraídos con `jq`; la tabla de storage; las 3 fixtures; el `stat`/`ls` de
  `~/.sui/sui_config/` antes y después; `git status --porcelain`, `git diff --exit-code -- contracts/Move.lock`; la
  verificación de §Verificación sin `env.sh`. **Nunca** devuelve el contenido de `$SMOKE_DIR/net`, de los logs
  completos ni de ningún archivo de configuración.

#### 6.2 Aislamiento obligatorio (excepción acotada a D-07)

**Las variables NO persisten entre llamadas: cada llamada del DEV es un shell nuevo.** Un `export` hecho en una
llamada no existe en la siguiente. Reglas:

1. **Preparación** (una llamada sin `sui`): elegir `SMOKE_DIR` = directorio nuevo dentro del scratchpad del DEV (ruta
   absoluta literal); resolver `command -v sui` (ruta absoluta literal); anotar el HOME real; crear
   `<SMOKE_DIR>/{net,tmp,home}` vacíos y `<SMOKE_DIR>/env.sh` con las rutas **escritas literalmente**:

   ```sh
   # <SMOKE_DIR>/env.sh — cargar al principio de CADA llamada que invoque sui: `. <SMOKE_DIR>/env.sh && …`
   SMOKE_DIR=<SMOKE_DIR>
   SUI=<ruta absoluta del binario sui>
   export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
   [ -x "$SUI" ] && [ -d "$SUI_CONFIG_DIR" ] || { echo GUARD-FAIL; return 97; }
   smoke_guard() {
     [ -f "$SUI_CONFIG_DIR/client.yaml" ] \
       && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] \
       || { echo GUARD-FAIL; return 97; }
   }
   suic() { printf 'n\n' | "$SUI" client "$@"; }
   act_as() { suic switch --address "$1" > /dev/null; }
   ```
   `HOME` aislado es la segunda barrera (si un camino ignorara `SUI_CONFIG_DIR`, caería en `$SMOKE_DIR/home/.sui`);
   `MOVE_HOME` conserva la caché de dependencias Move (`move-command-line-common/src/env.rs:28-37`); si aun así se
   descargaran de nuevo, se declara.
2. **Cada** llamada que invoque `sui` empieza con `. <SMOKE_DIR>/env.sh &&` y, salvo la de génesis, sigue con
   `{ . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`. Siempre `"$SUI"`/`suic` (nunca `sui` a secas: sin `env.sh`,
   `"$SUI"` está vacío y la llamada falla sin tocar nada). Un `GUARD-FAIL` detiene el smoke y se reporta.
3. **Génesis** (sin claves por stdout; 5 cuentas con fondos; `client.yaml` con `active_env = localnet`):
   `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?"`
4. **Arranque (s6):** como **comando en segundo plano del harness** (`run_in_background`), con el env en la misma
   orden y `exec` (el PID guardado es el de la red):
   `. <SMOKE_DIR>/env.sh && smoke_guard && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" > "$SMOKE_DIR/sui-start.log" 2>&1`
   Nunca `nohup … &` dentro de una llamada normal. Comprobar que está arriba en otra llamada:
   `. <SMOKE_DIR>/env.sh && smoke_guard && suic chain-identifier`.
5. **Cuentas:** `suic addresses --json` (solo alias y direcciones); las cuatro primeras → `ADMIN`, `ALICE`, `BOB`,
   `CAROL` en `<SMOKE_DIR>/ids.env` (`export ADMIN=0x…`), que también recibe `PKG`, `HOUSE`, `CAP`, `G1`… **Nunca**
   `new-address` (su `--json` incluye la frase, `crates/sui/src/client_commands.rs:2886-2891`).
6. **Archivos prohibidos (n4):** ningún archivo de `<SMOKE_DIR>/net` (keystore, `client.yaml`, `network.yaml`,
   `genesis.blob`, YAML de validadores y fullnode, todos con claves en formatos que el grep de secretos no detecta) se
   lee, copia, muestra ni pega; solo los usan los comandos `sui`. Los logs (`genesis.log`, `sui-start.log`) no se pegan
   (solo líneas puntuales si algo falla, revisadas antes). Las fixtures salen **únicamente** del `curl` a JSON-RPC.
7. **`~/.sui/` intacto:** `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y `ls <HOME real>/.sui/sui_config/`
   (sin cargar `env.sh`) antes de la preparación y en el cierre; nunca `cat`.
8. **Cierre:** `kill "$(cat <SMOKE_DIR>/sui.pid)"` (nunca `pkill`); `rm -rf <SMOKE_DIR>`; `git status --porcelain`;
   `git diff --exit-code -- contracts/Move.lock`; `ls contracts/Pub.*.toml contracts/Published.toml` sin resultados.

#### 6.3 Pasos

Los 16 pasos (0-15), con comandos y columnas a completar, están en `documents/SMOKE_ACCEPT.md`. El DEV llena "Resultado
obtenido" y "Estado" **durante** la corrida (nunca por adelantado) y el "Reporte final". Un paso fallido ⇒ smoke NO
PASA con evidencia (FLUJO §6).

### 7. Criterios de aceptación

- 16/16 pasos (0-15) PASA con digests en `SMOKE_ACCEPT.md`.
- Fixtures válidas (`jq empty` exit 0) con las tres variantes (`Pending`, `Cancelled`, `Resolved`).
- README con storage medido (reemplaza "≈ 0,002–0,003 SUI") y ruta de fixtures.
- `~/.sui/sui_config/` con el mismo `stat`/`ls` antes y después; árbol limpio salvo los archivos del task; lock intacto.
- Greps de secretos según §Verificación (en `contracts/`, incluidas las fixtures: ningún match).

### 8. Al terminar

Reporte con la plantilla de FLUJO §5; en "Verificación manual", los digests y el resumen del `SMOKE_ACCEPT.md`. Sin
commits ni pushes.

---

## Verificación que el DEV pega en cada reporte (comando + output literal completo)

Desde la raíz, cada `cd` en subshell, con la config sin claves de D-07 y **sin** cargar `env.sh`:

```bash
printf 'n\n' | sui --version
printf 'n\n' | sui client active-env
(cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors); echo "exit=$?"
git diff --exit-code -- contracts/Move.lock; echo "exit=$?"
# solo TASK-1 (informativo):
(cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
git status --porcelain
B=$(git merge-base master HEAD); echo "merge-base=$B"
git diff --stat "$B" -- contracts/Move.toml contracts/Move.lock contracts/sources/house.move contracts/tests/house_tests.move
grep -nE 'collect_pot\(|new_generator|pay_winner\(' contracts/sources/game.move
grep -nE 'epoch|timestamp|Clock|tx_hash|fresh_object_address' contracts/sources/game.move
grep -n 'if (' contracts/sources/game.move
grep -nE 'public fun (accept_game|collect_pot|pay_winner|assert_acceptable|fee_amount)\(|entry fun accept_game' contracts/sources/game.move
# secretos: solo líneas agregadas del diff + archivos nuevos sin trackear
git diff -U0 "$B" | grep -E '^\+' | grep -inE 'suiprivkey|recoveryPhrase|recovery_phrase|mnemonic|PRIVATE KEY'; echo "exit=$?"
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|recoveryPhrase|recovery_phrase|mnemonic|PRIVATE KEY'; echo "exit=$?"
```

**Resultados esperados:**
- `active-env` = `testnet`; exits 0 en los tres gates y en `Move.lock`; 0 warnings; 0 lints; 52 tests en el baseline
  y **≥ 83 PASS** desde TASK-1.
- `merge-base` = `b7ab390…` mientras `master` no avance. `--stat` vacío.
- Grep de orden (n2), **7 líneas**:
  - las definiciones `fun collect_pot(` y `fun pay_winner(`;
  - dentro de `accept_game`, en este orden de líneas: `game.collect_pot(`, `r.new_generator(`, `game.pay_winner(`;
  - dentro de `accept_with_winner_for_testing`: `game.collect_pot(` y `game.pay_winner(`.

  `new_generator` aparece **una sola vez**.
- Greps de azar alternativo y de `if (`: vacíos. Grep de visibilidad: **solo** `entry fun accept_game`.
- Greps de secretos: **solo líneas que contienen el propio patrón** (la línea del comando en `PLAN_ACCEPT.md`, este
  handoff, `SMOKE_ACCEPT.md` y los reportes/revisiones del ciclo). En `contracts/` (código, tests, README, fixtures):
  **ningún** match. El DEV pega el output literal completo y clasifica cada match; **cualquier otro es BLOCKER** (SEG-3).
