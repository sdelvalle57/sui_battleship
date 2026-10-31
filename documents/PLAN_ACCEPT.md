# PLAN_ACCEPT v2
> Issue: #6 (+ notas de #5 en sus comentarios) | Áreas: contracts / docs | Fecha: 2026-10-30
> Branch: `feature/issue-6-accept` (desde `master` @ `b7ab390`; la creó el orquestador) | Autor: MID | Estado: **v2 para re-revisión del delta por el MAYOR**
> (aplica `documents/REVISION_PLAN_ACCEPT.md`: B1, M1, M2, m1-m10, s1, s2; cambios en §Changelog al final)
> **STOPs decididos (D-20261030-16):** D2 = (a) floor, D3 = (a) sobre el pozo, D4 = (a) solo `GameResolved`, D5 = (a)
> firma, aborts 7-10 y orden, D6 = (a) sorteo por índice sin ramas y `add_fees` siempre.
>
> Decisión (2026-10-30): se optó por las recomendaciones del plan en D2-D6 — aprobado por el usuario (D-20261030-16).
> Precisión de D5 por la revisión del MAYOR (M1), sin reabrirla: la comisión se cobra (`add_fees`) al final de las
> validaciones y **antes** del sorteo; el orquestador la comunica al usuario.
>
> Decisiones aplicadas sin reabrir: D-20261030-06 (§1 resolución **atómica** al aceptar = #6 D1; §3 el `Game` copia el
> `fee_rate` al crear; §4 el invitado puede rechazar), -11 (§5 abort codes clásicos `const E…: u64`; fee por defecto 0;
> `MAX_FEE_BPS` 1000), -12 (§2 accessors de la House versionados; §4 ningún reembolso bloqueado por versión), -14
> (cabecera Apache-2.0), -15 (D3 objeto terminal conservado, storage a medir en este smoke; D4 sin Escrow; D8 `entry`
> no `public`; DV `game.version` comparada solo al aceptar), -16 (D2-D6 de este plan), -07 (config sin claves; ver la
> excepción acotada de TASK-3 para claves desechables de localnet).

## Historia de usuario

**Como** jugador que ve una partida abierta (o que recibió una invitación), **quiero** aceptarla igualando la apuesta
exacta y saber en la misma transacción quién ganó, cobrando el pozo menos la comisión si gano, **para** jugar sin
depender de nadie más y con un sorteo que ninguno de los dos jugadores puede manipular ni deshacer cuando no le
conviene; **y como** owner de la House, **quiero** que la comisión de cada partida entre sola a la House, **para**
retirarla con el `HouseCap` sin intervenir en las partidas.

**Scope en una frase:** la función de aceptar de `battleship::game` con el coinflip de `sui::random`, el reparto del
pozo (comisión a la House + pago al ganador) con conservación exacta probada, el evento de resolución, los tests
pendientes de #5, la documentación del contrato y un smoke en localnet del ciclo completo (crear, cancelar,
rechazar, aceptar, retirar comisiones) que mide el costo de storage y captura respuestas reales de `getObject` para #10.

**Lo que NO entrega:** UI (lobby #10, crear/cancelar #11, aceptar y resultado #12); formato de `deployments/` y
script de publicación (#7); publicación en testnet (#8); borrado del objeto terminal (D-15 D3, futuro); esquema
commit-reveal en dos transacciones (descartado en D-16); fixtures de eventos y del formato gRPC/GraphQL para #10 (se
capturan en su ciclo); la corrección del `README.md` raíz (#16); la batalla naval real (#18).

## Contexto y alcance

Hoy existen crear, cancelar y rechazar (`contracts/sources/game.move:69-118`); el camino del segundo jugador no
existe: la tabla del README lo marca "(#6)" (`contracts/README.md:201, 222, 229-230, 274, 283-285`) y `agents.md`
§6 deja abierta "la base de la comisión y la mecánica de aceptar/coinflip" (`agents.md:127-129`). Piezas que #5 y #4
dejaron listas para #6 y que este plan **consume sin cambiarlas**:

| Pieza | Dónde | Uso en #6 |
|---|---|---|
| `Game.version`, `house_id`, `bet`, `stake`, `fee_rate`, `opponent` | `game.move:24-40` | chequeos de aceptar y liquidación |
| `GameState::Resolved { acceptor, winner }` | `game.move:43-47` | estado final (hoy sin construir) |
| `is_pending` (privada) | `game.move:135-140` | `ENotPending` de aceptar; con #6 el brazo `Resolved` queda cubierto (STATUS: `game` 98,02 %) |
| `ENotPending` (4), `ENotInvited` (5) | `game.move:19-20` | se **reusan** en aceptar: misma condición, mismo significado (LIM-8) |
| `house::add_fees` (`public(package)`, chequea versión, acepta 0) | `house.move:149-153` | entrada de la comisión; cierra `house.version == house::VERSION` en la misma transacción, antes del sorteo |
| `house.version()` sin chequeo | `house.move:179-183` | comparación con `game.version` al principio |
| `update_bet_limits`, `update_fee_rate`, `withdraw_fees` | `house.move:96-147` | tests (fee, `max_bet` alto, acumulación) y smoke |

**Notas obligatorias de #5 (comentario del issue, 2026-10-31) que este plan incorpora:** (1) tests de `cancel_game` y
`reject_game` sobre una partida `Resolved` con `ENotPending` (llevan `game` al 100 %); (2) test que fije "authZ antes
que estado" en aceptar; (3) `game.version == house.version()` **al principio** de aceptar, en la misma transacción
que `add_fees` (revisión v1.1-3 del plan de #5: `git show a69fe7c:documents/REVISION_PLAN_GAME.md`, fila v1.1-3); (4)
aborts desde el 7 y evento `GameResolved`. Además: `house_id` del `Game` contra la House recibida (`EWrongHouse`),
conservación exacta (pozo = pago + comisión) y smoke en localnet.

### Investigación de `sui::random` (evidencia)

Framework compilado: `Move.lock` → `719fb2960ccfbf9f4d33041f8ea5146d30671696` (citas `@719fb29`); CLI y red local:
`testnet-v1.83.0` (citas `@v1.83.0`). Fuentes descargadas con `gh api repos/MystenLabs/sui/contents/<ruta>?ref=<rev>`.

| Hecho | Evidencia |
|---|---|
| `Random` es el objeto compartido de sistema `0x8`; solo se recibe como `&Random` (inmutable) | `crates/sui-framework/packages/sui-framework/sources/random.move:24-29, 54-58` @719fb29; docs: "Random has a reserved address 0x8 … inaccessible for mutable operations" ([Onchain Randomness](https://docs.sui.io/guides/developer/advanced/randomness-onchain)) |
| El generador se crea **dentro** de la función: `new_generator(r: &Random, ctx: &mut TxContext)`; su semilla es `hmac(random_bytes, ctx.fresh_object_address())` | `random.move:143-150` @719fb29; docs §"Instantiating RandomGenerator": nunca recibir un `RandomGenerator` como parámetro |
| `generate_u8_in_range(g, min, max)` = `min + rand % (max-min+1)` con 9 bytes (sesgo 2^-64), **sin ramas que dependan del valor** (con generador recién creado el buffer está vacío y `derive_next_block` corre siempre) | `random.move:179-194, 234-252, 274-277` @719fb29 |
| Función con `Random` = `entry` **no** `public`: un módulo ajeno no puede llamarla y abortar si pierde ("test-and-abort"). El lint `public_random` marca `public` con `Random`/`RandomGenerator`; está en `LintLevel::Default`, así que sale **también en el build sin `--lint`** y con `--warnings-are-errors` es error | `external-crates/move/crates/move-compiler/src/sui_mode/linters/public_random.rs:14-48` y `linters/mod.rs:119-122, 172-179` @v1.83.0; docs §"Use (non-public) entry functions"; `crates/sui-prompt/src/skills/sui-move-security-review/time-and-randomness.md` (SM-L2) @719fb29 |
| **Restricción de PTB:** después del primer comando que usa el input `Random`, solo se admiten `TransferObjects` o `MergeCoins`; si no, la transacción se rechaza antes de ejecutarse (`PostRandomCommandRestrictions`). Comandos **antes** sí se permiten (p. ej. `SplitCoins`) | `crates/sui-types/src/transaction.rs:1732-1760` @v1.83.0; tests `crates/sui-adapter-transactional-tests/tests/random/{happy_flows.move, move_call_u64_after_random.snap, two_move_calls_with_random.snap, move_call_clock_after_random_and_transfer.snap}` @719fb29 |
| **Gas como recurso atacable:** el que firma fija el presupuesto de gas; si el camino perdedor gasta más que el ganador, puede elegir un presupuesto que solo alcance para ganar. Remedio: mismo trabajo en todos los resultados y nada que pueda abortar después del sorteo | docs §"Limited resources and Random dependent flows", §"Resource usage" y §"Best practices" ("Balance gas usage across all outcome paths") |
| Aleatoriedad habilitada en localnet (cadena distinta de mainnet/testnet) y en testnet desde PV 48 | `crates/sui-protocol-config/src/lib.rs:3456-3461, 3662-3667` @v1.83.0 |
| Si la DKG de la época no terminó, la transacción con `Random` se **cancela**: efectos `status = failure` con `ExecutionCancelledDueToRandomnessUnavailable`, sin `MoveAbort`. Con un objeto compartido congestionado (`&mut House`) puede llegar `ExecutionCancelledDueToSharedObjectCongestion` | `crates/sui-types/src/execution_status.rs:259, 270-271` @v1.83.0; `crates/sui-e2e-tests/tests/randomness_tests.rs:133-144` @v1.83.0 |
| Tests: `random::create_for_testing(ctx)` y `update_randomness_state_for_testing(&mut Random, round, bytes, ctx)` exigen `sender == @0x0`; la primera actualización es la ronda 0 y cada siguiente la anterior + 1 | `random.move:42-44, 61-64, 89-118, 120-128` @719fb29; modelo `crates/sui-framework/packages/sui-framework/tests/random_tests.move:14-32` @719fb29 |
| TypeScript (#12): el input es `tx.object.random()` | docs §"Accessing Random from TypeScript" |

**Alcance:** `contracts/sources/game.move`, `contracts/tests/game_tests.move`, `contracts/README.md`, `agents.md`
(§2, §3, §6, §7, §8, §9), `documents/ESTANDARES.md` (PROY-5, PROY-7), `documents/FLUJO_AGENTES.md` (§6),
`documents/STATUS.md`, el runbook `documents/SMOKE_ACCEPT.md` y fixtures nuevas en
`contracts/fixtures/localnet/jsonrpc/`.

**Fuera de alcance:** ver HU. No se tocan `house.move`, `house_tests.move`, `Move.toml` ni `Move.lock` (sin repin,
H13); no se crea `app/` ni `contracts/deployments/`; no se publica en testnet; ningún agente lee, crea ni modifica nada
en `~/.sui/`.

## Contrato on-chain (D-16 D5, con la precisión M1)

> Superficie nueva; queda congelada al publicar (#8). Hasta #8 no hay restricción de compatibilidad de upgrade.

### Abort codes nuevos (D-11 §5; siguen desde el 7)

| Código | Constante | Condición | Funciones |
|---|---|---|---|
| 7 | `EVersionMismatch` | `game.version != house.version()` | `accept_game` |
| 8 | `EWrongHouse` | `object::id(house) != game.house_id` | `accept_game` |
| 9 | `ESelfPlay` | `sender == game.creator` | `accept_game` |
| 10 | `EWrongStake` | `payment.value() != game.bet` | `accept_game` |
| 4 | `ENotPending` (existente) | estado ≠ `Pending` | `cancel_game`, `reject_game`, **`accept_game`** |
| 5 | `ENotInvited` (existente) | `game.opponent == some(a)` y `sender != a` | `reject_game`, **`accept_game`** |

Además `accept_game` puede abortar con **`house::EWrongVersion` (3, módulo `house`)** dentro de `add_fees`, en el
cobro de la comisión (código de un paquete viejo sobre una House migrada con una partida de la versión nueva).

> Decisión (2026-10-30): `EVersionMismatch` y no `EWrongVersion` — D-16 D5 (evita dos `EWrongVersion` con distinto
> número y significado).

### Orden (parte del contrato)

1. `EVersionMismatch` — al principio (nota (3) de #5).
2. `EWrongHouse` — configuración de la partida.
3. `ESelfPlay` — authZ (el creador, aunque la partida sea una invitación a otro).
4. `ENotInvited` — authZ (solo si hay `opponent`).
5. `ENotPending` — estado (**authZ antes que estado**, como cancelar/rechazar: un no autorizado no aprende el estado).
6. `EWrongStake` — el pago.
7. `house::EWrongVersion` — en el **cobro** (`add_fees`).
8. **Sorteo.** Después del sorteo solo hay operaciones que no abortan: elegir la dirección por índice, cambiar el
   estado, emitir el evento y transferir el pago.

`EWrongHouse` es defensa en profundidad: `init` corre una sola vez por línea de paquete y la House de otra publicación
tiene otro tipo, así que en producción solo existe una House; el abort solo es alcanzable en tests.

### Constantes nuevas

`const BPS_DENOMINATOR: u128 = 10_000;` (LIM-6; `house` tiene `MAX_FEE_BPS` pero no el denominador).

### Evento nuevo (PROY-7, `has copy, drop`; D-16 D4)

```move
/// Emitted by `accept_game`: the game was accepted and resolved in the same transaction.
public struct GameResolved has copy, drop {
    game_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,     // 2 × bet
    fee: u64,     // to the House
    payout: u64,  // to the winner; pot == payout + fee
}
```

### Funciones (modelo; el DEV lo replica con `///` y comentarios del POR QUÉ, LIM-7)

```move
use sui::balance::Balance; // ya importado
use sui::random::Random;

/// Accepts a pending game matching its bet exactly and resolves it with a coinflip in the same transaction:
/// the fee goes to the House and the winner gets the pot minus the fee. Only the invitee (if any), never the
/// creator. Emits `GameResolved`.
entry fun accept_game(
    game: &mut Game,
    house: &mut House,
    payment: Coin<SUI>,
    r: &Random,
    ctx: &mut TxContext,
) {
    let acceptor = ctx.sender();
    game.assert_acceptable(house, &payment, acceptor);
    // Everything that can abort (checks and the fee, which does not depend on the outcome) runs before the
    // draw. Non-public `entry` + generator created here (SEG-5): no other module can call this and abort on a
    // loss, and after the draw both outcomes execute the same non-aborting instructions.
    let (payout, pot, fee) = game.collect_pot(house, payment);
    let mut generator = r.new_generator(ctx);
    let winner_index = generator.generate_u8_in_range(0, 1);
    game.pay_winner(payout, pot, fee, acceptor, winner_index as u64, ctx);
}

// All accept checks, in contract order (README), before any randomness is drawn.
fun assert_acceptable(game: &Game, house: &House, payment: &Coin<SUI>, acceptor: address) {
    assert!(game.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == game.house_id, EWrongHouse);
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

// Pays the winner. Branch-free on the outcome (SEG-5, D-16 D6): `winner_index` (0 or 1) only selects an
// address; same state change, event and transfer for both outcomes, and nothing here can abort.
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

// Fee in basis points over the whole pot (D-16 D3). u128 intermediate (SEG-6): with a high `max_bet` the
// product pot × fee_rate overflows u64. Integer division rounds down: the remainder goes to the winner and the
// House never charges more than the rate (D-16 D2).
fun fee_amount(pot: u64, fee_rate: u16): u64 {
    ((pot as u128) * (fee_rate as u128) / BPS_DENOMINATOR) as u64
}
```

> Decisión (2026-10-30): `assert_acceptable` recibe `acceptor: address` y no `&TxContext` (evita `prefer_mut_tx_context`,
> H12, y deja una sola lectura de `ctx.sender()`); validación, cobro y pago en tres funciones privadas para que el
> wrapper `#[test_only]` recorra exactamente las mismas piezas que `accept_game` sustituyendo solo el índice — MID,
> validado por el MAYOR.

- **"Nada aborta tras el sorteo":** `players.borrow(i)` solo abortaría con `i ≥ 2`, imposible desde
  `generate_u8_in_range(0, 1)`; `GameState`, `event::emit`, `from_balance` y `public_transfer` no abortan con estos
  argumentos. Verificación por código: en `accept_game` el orden de líneas es `collect_pot` → `new_generator` →
  `pay_winner`, y `grep -n 'if (' game.move` sigue vacío.
- **Aritmética (SEG-6):** `pot ≤ suministro total de SUI` (10^19 MIST < `u64::MAX` ≈ 1,8 × 10^19), así que `join` no
  desborda; `pot × fee_rate` sí puede superar `u64` con un `max_bet` alto (sin techo en `update_bet_limits`), de ahí
  el `u128` (lo prueba el test 57). `fee_rate ≤ 1000 < 10_000` (invariante de la House, copiado al crear) ⇒
  `fee ≤ pot / 10`, `split` nunca falla y `payout ≥ 0,9 × pot`.
- **Helpers `#[test_only]` nuevos** (sufijo `_for_testing`, PROY-1): `accept_with_winner_for_testing(game, house,
  payment, winner_index: u64, ctx)` (= `assert_acceptable` + `collect_pot` + `pay_winner` con el índice dado),
  `is_resolved_for_testing(&Game): bool`, `acceptor_for_testing(&Game): Option<address>`,
  `winner_for_testing(&Game): Option<address>` (`none` si no está `Resolved`) y
  `new_game_resolved_for_testing(game_id, creator, acceptor, winner, pot, fee, payout): GameResolved`.
- **Sin cambios:** `Game`, `GameState`, `GameCreated`, `GameCancelled`, `create_game`, `cancel_game`, `reject_game`,
  `refund_creator`, `is_pending` y todo `house.move`. El comentario de `game.move:134` pasa a nombrar `accept_game`; el
  de `game.move:14` (`#6 continues from 7`) se reemplaza por las constantes.

### Impacto en la app y en upgrades

- `app/src/sui/` no existe (#9). Para #11/#12: mapear por **módulo + código** (`game` 4, 5, 7, 8, 9, 10 y
  `house::EWrongVersion` 3 desde aceptar); PTB de aceptar = `splitCoins(gas, [bet])` → `accept_game(game, house,
  coin, tx.object.random())` y **nada después** salvo `TransferObjects`/`MergeCoins`; el resultado se lee de
  `GameResolved` o del objeto (`Resolved { acceptor, winner }`).
- Las cancelaciones del runtime (`ExecutionCancelledDueToRandomnessUnavailable`,
  `ExecutionCancelledDueToSharedObjectCongestion`) llegan como `effects.status = failure` con ese `kind` y **sin**
  `MoveAbort`: #12 las muestra como "reintentar", nunca como éxito ni como error del contrato (SEG-10).
- Upgrades: sin publicación aún. Tras #8, `accept_game` es `entry` no `public` (su firma puede cambiar en un upgrade);
  `GameResolved`, los códigos 7-10 y su significado quedan congelados (PROY-2).

## Flujo de fondos

| Camino | Entrada | Custodia | Salida | Comisión |
|---|---|---|---|---|
| Crear (#5) | `Coin` del creador = `bet` | `Game.stake` | — | — |
| Cancelar / rechazar (#5) | — | `Game.stake` = `bet` | `Coin` por `bet` → `game.creator` | ninguna |
| **Aceptar (#6)** | `Coin` del aceptante = `bet` (exacto, `EWrongStake`) | pozo `2 × bet` en un `Balance` local (`stake.withdraw_all` + `join`) | **antes del sorteo** House: `fee` por `add_fees`; **después** ganador: `Coin` por `payout = pot − fee` | `fee = ⌊pot × game.fee_rate / 10_000⌋` (D-16 D2, D3) |

**Invariante de conservación (aceptar):** `bet` del creador + `bet` del aceptante = `payout` + `fee`;
`fees_collected` sube exactamente `fee`; `Game.stake == 0` y estado `Resolved { acceptor, winner }` (PROY-8). Ningún
camino crea ni destruye valor. Si la transacción aborta o se cancela, revierte entera: el aceptante solo pierde gas y
conserva su `Coin`; la partida sigue `Pending`.

**Ejemplo numérico (fee 250 bps = 2,5 %, `bet` = 10 SUI):** pozo 20 SUI → comisión 0,5 SUI a la House → el ganador
recibe 19,5 SUI. Con `bet = 1_000_001` MIST: pozo `2_000_002`, comisión `⌊50_000,05⌋ = 50_000`, pago `1_950_002`.

**Storage (D-15 D3):** crear deposita el storage del `Game` (lo paga el creador). Al aceptar, quien firma (el
aceptante) cobra el rebate de la versión `Pending` y paga el de la versión `Resolved` (dos direcciones más): el
depósito sigue inmovilizado en el objeto terminal. Los valores exactos los mide TASK-3 y van al README.

**Contención:** `accept_game` toma `&mut House`: las resoluciones se serializan sobre la House (aceptable en el MVP,
`contracts/README.md:141-145`). `Random` es un input compartido inmutable.

**Carreras:** cancelar/rechazar vs aceptar, o dos aceptantes: el consenso ordena; la segunda aborta con
`ENotPending` (o con su error de authZ) y no pierde su `Coin`.

## Decisiones del usuario (D-20261030-16, no reabrir)

| STOP | Decisión | Qué fija en este plan |
|---|---|---|
| D2 — Redondeo | (a) hacia abajo (floor) | `fee_amount` con división entera; ejemplo `bet = 1_000_001`, 250 bps → `fee = 50_000`, `payout = 1_950_002`; la House nunca cobra más que el porcentaje anunciado (diferencia ≤ 1 MIST por partida) |
| D3 — Base | (a) pozo completo (`2 × bet`) | ejemplo 10 SUI cada uno, 2,5 % → comisión 0,5, pago 19,5; con 10 % → 2 y 18 |
| D4 — Eventos | (a) solo `GameResolved` | sin `GameAccepted`; PROY-7 y `agents.md` §8 listan `GameCreated`, `GameCancelled`, `GameResolved` |
| D5 — Superficie | (a) firma, aborts 7-10, reuso de 4 y 5, orden versión → House → authZ → estado → monto | más la precisión M1: `house::EWrongVersion` del cobro va después del monto y antes del sorteo |
| D6 — Sorteo | (a) índice `generate_u8_in_range(0, 1)` sobre `[creador, aceptante]`, sin ramas; `add_fees` siempre | descartados `generate_bool` + `if` (ataque de presupuesto de gas) y commit-reveal (reabre D-06 §1) |

Evidencia y opciones completas de cada STOP: v1 de este plan (en el historial de git cuando se commitee) y
`documents/DECISIONES.md` (D-20261030-16).

## Tasks (ordenados por dependencia; contratos antes que docs y smoke)

### TASK-1: `accept_game`, cobro, pago, `GameResolved` y suite de tests — área: contracts
- **Entregable:** `game.move` según §Contrato on-chain y `game_tests.move` ampliado; gates verdes.
- **Archivos afectados:** `contracts/sources/game.move`, `contracts/tests/game_tests.move`. **No tocar:**
  `house.move`, `house_tests.move`, `Move.toml`, `Move.lock`, `.github/`, `.gitignore`, docs.
- **Cambios:** los de §Contrato on-chain; orden del módulo como hoy (`use`, abort codes con comentario de condición,
  constantes, structs/enum, eventos, `entry`, privadas, `#[test_only]`).
- **AuthZ:** `accept_game`: cualquiera menos el creador (`ESelfPlay`); con invitación, solo `game.opponent`
  (`ENotInvited`). Cada denegación con `expected_failure` (SEG-2).
- **Helpers de test** en `game_tests.move`: `ACCEPTOR = @0xE` (aceptante de partidas abiertas); `set_fee_rate(scenario,
  bps)` y `set_bet_limits(scenario, min, max)` como `PUBLISHER` (modelo `game_tests.move:136-142`);
  `random_ready(scenario)` = `next_tx(@0x0)`, `random::create_for_testing`, `next_tx(@0x0)`, `take_shared<Random>()`,
  `update_randomness_state_for_testing(0, SEED, ctx)`, `return_shared` (modelo `random_tests.move:14-32`; sender
  `@0x0` obligatorio, `random.move:43, 96`); un helper que acepta con el `Random` real y otro con
  `accept_with_winner_for_testing`; `sum_coins(scenario, account): u64` que suma todos los `Coin<SUI>` de una cuenta
  (`ids_for_address` + `take_from_address_by_id` + `return_to_address`).
- **Conservación:** en tests de **una** partida: el ganador tiene **un** `Coin` de valor `payout` (`assert_single_coin`,
  `game_tests.move:56-61`), el perdedor ninguno, `fees_collected` subió `fee`, `stake == 0`, `is_resolved`,
  `acceptor`/`winner` correctos, `GameResolved` igual al esperado y `payout + fee == 2 × bet`. En tests de **varias**
  partidas (35, 37): `sum_coins(creador) + sum_coins(aceptante) == Σ payout`, `fees_collected == Σ fee` y cada `Game`
  con `stake == 0`.
- **Tests esperados** (nombres = comportamiento, LIM-11; deterministas; los abort tests usan el **`accept_game` real**
  para fijar el orden del entry; los de reparto, el wrapper con índice 0 = creador, 1 = aceptante):
  27. `test_accept_open_game_creator_wins_pays_payout_and_fee` — fee 250, `BET`, índice 0.
  28. `test_accept_open_game_acceptor_wins_pays_payout_and_fee` — fee 250, `BET`, índice 1.
  29. `test_accept_invite_by_invitee_resolves` — el invitado acepta (índice 1).
  30. `test_accept_with_zero_fee_pays_whole_pot` — fee por defecto 0: `fee = 0`, `payout = pot`, `fees_collected` 0.
  31. `test_accept_with_max_fee_charges_ten_percent` — 1000 bps: `fee = pot / 10`.
  32. `test_accept_rounds_fee_down_on_indivisible_pot` — `bet = 1_000_001`, 250 bps → `fee = 50_000`, `payout = 1_950_002`.
  33. `test_accept_max_bet_with_max_fee_does_not_overflow` — `bet = MAX_BET` por defecto, 1000 bps →
      `fee = 10_000_000_000`, `payout = 90_000_000_000` (criterio literal del issue).
  34. `test_accept_uses_fee_rate_copied_at_creation` — crear con 250, subir a 500, aceptar: comisión al 250 (D-06 §3).
  35. `test_fees_from_two_games_accumulate_and_withdraw_exactly` — dos partidas aceptadas (conservación multipartida);
      `withdraw_fees` devuelve un `Coin` = Σ `fee` y la House queda en 0.
  36. `test_accept_with_random_resolves_and_conserves_funds` — `accept_game` real con `Random` de test: ganador ∈
      {creador, aceptante}; conservación para el ganador que salió.
  37. `test_accept_with_random_reaches_both_outcomes` — N partidas (N ≤ 8) con el `Random` real y semillas fijas
      (rondas 0..N-1): al menos una gana el creador y otra el aceptante; conservación multipartida. N y semillas en
      constantes; determinista.
  38. `test_accept_rejects_own_game` — `ESelfPlay` (partida abierta).
  39. `test_accept_rejects_non_invited` — `ENotInvited` (OTHER sobre una invitación a INVITEE).
  40. `test_accept_rejects_lower_stake` — `EWrongStake` (`BET - 1`).
  41. `test_accept_rejects_higher_stake` — `EWrongStake` (`BET + 1`).
  42. `test_accept_rejects_cancelled_game` — `ENotPending`.
  43. `test_accept_rejects_resolved_game` — `ENotPending` (segunda aceptación).
  44. `test_accept_rejects_other_house` — `EWrongHouse` (segunda House con `init_for_testing`, `take_shared_by_id`).
  45. `test_accept_rejects_game_of_older_version` — `EVersionMismatch` (`game.set_version_for_testing(OLDER_VERSION)`).
  46. `test_accept_rejects_house_of_newer_version` — `EVersionMismatch` (House en `NEWER_VERSION`, partida en 1).
  47. `test_accept_from_old_package_aborts_in_fee_collection` — `house::EWrongVersion`: partida creada en v1, luego House
      y partida en `NEWER_VERSION`; pasa los chequeos de la partida y aborta en `add_fees` dentro de `collect_pot`,
      **antes** del sorteo (el orden lo fija el código: `collect_pot` precede a `new_generator`). No leer
      `fees_collected()` con la House en otra versión.
  48. `test_accept_by_other_on_cancelled_invite_reports_not_invited` — `ENotInvited` (authZ antes que estado; nota (2) de #5).
  49. `test_accept_by_creator_on_cancelled_game_reports_self_play` — `ESelfPlay` (authZ antes que estado).
  50. `test_accept_by_creator_on_own_invite_reports_self_play` — `ESelfPlay`: el creador acepta **su** invitación a
      INVITEE (fallan `ESelfPlay` y `ENotInvited`; fija 3 antes que 4).
  51. `test_accept_reports_version_before_authz` — `EVersionMismatch` (OTHER sobre invitación con versión distinta).
  52. `test_accept_reports_house_before_authz` — `EWrongHouse` (el creador acepta su partida contra otra House).
  53. `test_accept_reports_version_before_house` — `EVersionMismatch` (otra House **y** en otra versión).
  54. `test_accept_reports_state_before_stake` — `ENotPending` (partida cancelada con monto incorrecto).
  55. `test_cancel_rejects_resolved_game` — `ENotPending` (nota (1) de #5).
  56. `test_reject_rejects_resolved_game` — `ENotPending` (invitación aceptada; luego el invitado rechaza).
  57. `test_accept_huge_pot_needs_u128_intermediate` — `update_bet_limits(MIN_BET, 9_000_000_000_000_000_000)`, fee
      1000 bps, `bet = 9_000_000_000_000_000_000` (`pot = 18_000_000_000_000_000_000 < u64::MAX`; `pot × 1000 ≈
      1,8 × 10^22` desborda `u64`) → `fee = 1_800_000_000_000_000_000`, `payout = 16_200_000_000_000_000_000`,
      conservación completa. Con la fórmula en `u64` este test aborta por overflow.
- **Criterio de aceptación (DoD):**
  - Firma, visibilidad (`entry` sin `public`), abort codes, orden (incluido cobro antes del sorteo), evento y fórmula
    exactamente como §Contrato on-chain.
  - Gates canónicos (agents.md §3) exit 0: build 0 warnings, `--lint` 0 lints, test **≥ 83 tests PASS** (26 House +
    ≥ 57 Game: 26 existentes + 31 nuevos). Coverage informativo: `battleship::game` **100 %**.
  - Contra el merge-base: diff vacío en `Move.toml`, `Move.lock`, `house.move`, `house_tests.move`.
  - Greps de §Verificación con sus resultados esperados.
- **Riesgos / rollback:** si `vector[...]` + `borrow` o `generate_u8_in_range` no compilan como en el modelo, el DEV usa
  la forma sin ramas que compile sin warnings y la declara; si fuera imposible, **STOP al MID** (no se cae a `if`: es
  D-16 D6). Si una tupla de retorno con `Balance` diera problemas, `collect_pot` puede devolver solo el `Balance` y
  `pay_winner` recalcular `pot = payout + fee` con los valores del evento (declarar). Si el test 37 no encuentra ambos
  resultados con N ≤ 8, cambiar semillas. Rollback: `git checkout master -- contracts/sources/game.move
  contracts/tests/game_tests.move`.

### TASK-2: Documentación del contrato y del proceso — área: docs
- **Entregable:** README de contratos, `agents.md`, ESTANDARES, FLUJO y STATUS alineados 1:1 con TASK-1.
- **Archivos afectados:** `contracts/README.md`, `agents.md`, `documents/ESTANDARES.md`, `documents/FLUJO_AGENTES.md`,
  `documents/STATUS.md`. **No tocar:** código, tests, `documents/DECISIONES.md` (D-16 ya la registró el orquestador),
  `README.md` raíz.
- **Cambios:**
  - `contracts/README.md` (sección Game): intro sin "(#6)" pendientes; diagrama `Pending → Resolved: accept_game`;
    filas de `accept_game` (firma, `entry`, quién, aborts **en orden** con `house::EWrongVersion` del cobro, evento) y
    de las privadas `assert_acceptable`, `collect_pot`, `pay_winner`, `fee_amount`; `is_pending` usada también por
    aceptar; evento `GameResolved`; abort codes 7-10 y 4/5 extendidos a `accept_game`; autorización de aceptar; flujo de
    fondos con el invariante y "comisión antes del sorteo, pago después"; **Comisión**: fórmula, base (D3), redondeo
    (D2), `add_fees` siempre aunque sea 0; **Aleatoriedad** (nueva): `entry` no `public`, generador interno, todo lo
    que puede abortar antes del sorteo y nada después, sorteo por índice sin ramas (D6); **Cancelaciones del runtime**:
    `ExecutionCancelledDueToRandomnessUnavailable` y `ExecutionCancelledDueToSharedObjectCongestion` = `effects.status
    failure` con ese `kind`, sin `MoveAbort`, "reintentar" en #12 (SEG-10); **PTB** de aceptar: `Random` en el último
    `MoveCall`, después solo `TransferObjects`/`MergeCoins` (`transaction.rs:1732-1760` @v1.83.0),
    `tx.object.random()`; Carreras con aceptar; Versionado del `Game` (los tres casos: partida vieja → 7, House migrada
    → 7, código viejo con partida nueva → `house::EWrongVersion` en el cobro); Contención.
  - `agents.md`: §3 fila de `sui start` con la advertencia de aislamiento (`SUI_CONFIG_DIR`/`TMPDIR` en la **misma**
    invocación; sin ellos, `--force-regenesis` reescribe `~/.sui/sui_config/client.yaml`, `sui_commands.rs:1271-1273`)
    y referencia al procedimiento de `documents/SMOKE_ACCEPT.md`; §6 nota de cabecera (comisión y aceptar fijadas por
    D-16), bullets **Comisión** (base y redondeo) y **Coinflip** (orden cobro → sorteo → pago, PTB); §7 gotchas de PTB
    con `Random`, de cancelaciones del runtime y de aislamiento de localnet; §8 API de `battleship::game` con
    `accept_game`, `GameResolved`, aborts 0-10; §2 layout con `contracts/fixtures/` (TASK-3); §9 entidades.
  - `documents/ESTANDARES.md`: PROY-7 (`GameResolved` en aceptar, con `acceptor`, `winner`, `pot`, `fee`, `payout`);
    PROY-5 (nota: "todo lo que puede abortar va antes del sorteo; el sorteo elige por índice, sin ramas; el `Random` va
    en el último `MoveCall` del PTB"); versión 1.6 en el encabezado.
  - `documents/FLUJO_AGENTES.md` §6: una línea: "localnet siempre aislada (`SUI_CONFIG_DIR`/`TMPDIR`/`HOME` del smoke
    cargados en la misma invocación que cada `sui`; ver `agents.md` §3); nunca `sui start` a secas".
  - `documents/STATUS.md`: H7 ✅ y H9 ✅ (con SHA de TASK-1), roadmap (Game ✅, Tests ✅), baseline nuevo con el SHA que
    indique el orquestador, fila del ciclo activo de #6.
- **Criterio de aceptación:** tablas del README 1:1 con `game.move` (el MID contrasta función por función y código por
  código, incluido el orden cobro → sorteo → pago); `grep -nE "\(#6\)|GameAccepted|resolve_game|Active"
  contracts/README.md agents.md documents/ESTANDARES.md` solo devuelve menciones históricas; sin cambios de código.
- **Tests esperados:** no aplica; el DEV re-corre los gates para confirmar cero delta respecto de TASK-1.
- **Riesgos / rollback:** desalineación tabla ↔ código (mitigada por la revisión 1:1). Rollback: revertir esos archivos.

### TASK-3: Smoke en localnet, storage medido y fixtures de `getObject` — área: contracts (smoke) + docs
- **Entregable:** `documents/SMOKE_ACCEPT.md` completado durante la corrida (lo redacta el MID según §M5 al aprobar
  TASK-2; el DEV llena las columnas de resultado), tres fixtures reales y los valores de storage en el README.
- **Archivos afectados:** `documents/SMOKE_ACCEPT.md` (resultados), `contracts/fixtures/localnet/jsonrpc/game_pending.json`,
  `game_cancelled.json`, `game_resolved.json` (nuevos), `contracts/README.md` (storage medido; fixtures en "Lectura
  desde la app"), `documents/STATUS.md` (fila del smoke). **No tocar:** código, tests, `Move.lock`.

#### Excepción acotada a D-07 (claves desechables de localnet)
FLUJO §6 prevé "direcciones de prueba de la CLI" para los smokes en localnet (`documents/FLUJO_AGENTES.md:121`). Este
task crea claves **solo** de una localnet efímera, **solo** dentro de `$SMOKE_DIR`, **nunca** leídas, impresas ni
pegadas, y **borradas** al cerrar (`rm -rf "$SMOKE_DIR"`). No es una clave del owner ni de testnet; D-07 sigue
vigente para todo lo demás (nada en `~/.sui/`).

#### Aislamiento (B1): las variables NO persisten entre llamadas
**El DEV corre cada comando en un shell nuevo: un `export` no sobrevive a la llamada siguiente.** Por eso:
1. **Una sola vez**, en una llamada sin `sui`: elegir `SMOKE_DIR` = directorio nuevo dentro del scratchpad del DEV (ruta
   **absoluta literal**, p. ej. `/tmp/claude-…/scratchpad/smoke-6`), resolver `command -v sui` (→ ruta absoluta
   literal, hoy `~/.local/bin/sui` expandido) y crear `"$SMOKE_DIR"/{net,tmp,home}` y `"$SMOKE_DIR/env.sh"` con las
   rutas escritas **literalmente** (sin variables heredadas del shell):

   ```sh
   # <SMOKE_DIR>/env.sh — se carga al principio de CADA llamada que invoque sui: `. <SMOKE_DIR>/env.sh && …`
   SMOKE_DIR=<SMOKE_DIR>                 # ruta absoluta literal
   SUI=<ruta absoluta del binario sui>   # resuelta antes de aislar HOME
   export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
   [ "$SUI_CONFIG_DIR" = "$SMOKE_DIR/net" ] && [ "$HOME" = "$SMOKE_DIR/home" ] && [ -x "$SUI" ] \
     || { echo GUARD-FAIL; return 97; }
   # Antes de cualquier sui client / start / publish: config del smoke presente y env localnet.
   smoke_guard() {
     [ -f "$SUI_CONFIG_DIR/client.yaml" ] \
       && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] \
       || { echo GUARD-FAIL; return 97; }
   }
   ```
   `HOME` aislado es la segunda barrera: si algún camino del CLI ignorara `SUI_CONFIG_DIR`, caería en
   `$SMOKE_DIR/home/.sui`, nunca en `~/.sui/`. `MOVE_HOME` conserva la caché de dependencias Move
   (`external-crates/move/crates/move-command-line-common/src/env.rs:28-37` @v1.83.0); si el sistema de paquetes la
   ignorara y descargara de nuevo en `$SMOKE_DIR/home`, se declara (solo cuesta tiempo).
2. **Toda** llamada que invoque `sui` empieza con `. <SMOKE_DIR>/env.sh &&` en la **misma** línea, y todas menos la de
   génesis siguen con `smoke_guard &&`. Siempre `printf 'n\n' | "$SUI" …`.
3. **Red sin `--force-regenesis` y sin faucet** (m6, alternativa elegida): génesis en el directorio del smoke, que crea
   5 cuentas con fondos y un `client.yaml` con `active_env = localnet` **sin imprimir frases** (solo logs con rutas;
   `crates/sui/src/sui_commands.rs:1373-1630` @v1.83.0: cuentas `genesis_config.rs:299-302, 315-320`, `client.yaml`
   `:1594-1620`):
   `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?"`.
   Arranque en segundo plano con el env en la misma orden, log a archivo y PID (m7):
   `. <SMOKE_DIR>/env.sh && smoke_guard && { nohup "$SUI" start --network.config "$SUI_CONFIG_DIR" > "$SMOKE_DIR/sui-start.log" 2>&1 & echo $! > "$SMOKE_DIR/sui.pid"; }`.
   Con `--network.config <dir>`, `sui start` usa ese directorio y solo actualiza **su** `client.yaml`
   (`sui_commands.rs:940-976, 1267-1269`); la rama que reescribe el `client.yaml` de `sui_config_dir()` exige
   `--force-regenesis` (`:1271-1273`). Se aparta del comando literal del issue (`--with-faucet --force-regenesis`)
   para no crear claves con salida por stdout y no depender del faucet; se declara.
4. Cuentas: `. <SMOKE_DIR>/env.sh && smoke_guard && printf 'n\n' | "$SUI" client addresses --json` (solo alias y
   direcciones); las cuatro primeras se anotan como `ADMIN`, `ALICE`, `BOB`, `CAROL` en `"$SMOKE_DIR/ids.env"` (que
   también recibe `PKG`, `HOUSE`, `CAP`, IDs de partidas) y cada llamada posterior lo carga tras `env.sh`. **Nunca**
   `new-address` (su JSON trae la frase, `client_commands.rs:2886-2891`).
5. Los logs (`genesis.log`, `sui-start.log`) **no se pegan**: solo líneas puntuales si algo falla.
6. Evidencia de `~/.sui/` intacto: `stat -c '%y %s %n' /home/<usuario>/.sui/sui_config/client.yaml` y
   `ls /home/<usuario>/.sui/sui_config/` (ruta absoluta del HOME **real**, sin cargar `env.sh`) antes del paso 1 y en
   el cierre; nunca `cat`.
7. Cierre: `kill "$(cat <SMOKE_DIR>/sui.pid)"` (nunca `pkill`), `rm -rf <SMOKE_DIR>`, `git status --porcelain` solo
   con los archivos del task, `git diff --exit-code -- contracts/Move.lock`, sin `contracts/Pub.*.toml`.

- **Publicación en localnet (no es testnet; no requiere la autorización de D-09):** desde `contracts/`, como `ADMIN`:
  `. <SMOKE_DIR>/env.sh && . <SMOKE_DIR>/ids.env && smoke_guard && printf 'n\n' | "$SUI" client switch --address "$ADMIN" && cd <repo>/contracts && printf 'n\n' | "$SUI" client test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --json > "$SMOKE_DIR/publish.json"`
  (publicación efímera sin tocar `Published.toml`; ver `sui client test-publish --help`). Si falla la verificación de
  dependencias por el framework del binario local, reintentar con `--skip-dependency-verification` y declararlo. Si la
  publicación modifica `Move.lock`, se restaura con `git checkout -- contracts/Move.lock` antes de cerrar y se declara
  (un smoke local no repinea el lock de testnet, PROY-11).
- **Pasos del smoke** (borrador para `SMOKE_ACCEPT.md`; un resultado verificable por paso; digests en el documento;
  cada llamada con `. env.sh && . ids.env && smoke_guard &&` delante):

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | `stat`/`ls` de `~/.sui/sui_config/` (HOME real); crear `SMOKE_DIR`, `env.sh`; génesis; `sui start` en segundo plano | `genesis` exit 0; red arriba (`sui client chain-identifier` responde); `smoke_guard` OK (`active-env` = `localnet`) |
| 2 | `client addresses --json`; anotar `ADMIN`/`ALICE`/`BOB`/`CAROL`; `client balance` de cada una | 4 direcciones con saldo > 0 |
| 3 | `test-publish` como `ADMIN`; anotar `PKG`, `HOUSE`, `CAP`; `client object 0x8 --json` | publicación OK; `0x8` es `0x2::random::Random` |
| 4 | `update_fee_rate` a 250 (`ADMIN`, `CAP`) | evento `FeeRateUpdated` 0 → 250 |
| 5 | `ALICE` crea G1 abierta con `bet = 1_000_001` (PTB `--split-coins gas "[1000001]" --assign c --move-call $PKG::game::create_game @$HOUSE c.0 none`) | `GameCreated`; G1 `Pending`; gas summary y `storageRebate` del objeto anotados |
| 6 | `sui_getObject` de G1 por JSON-RPC (`curl` a `http://127.0.0.1:9000`, opciones `showType`, `showOwner`, `showContent`, `showStorageRebate`, `showPreviousTransaction`) → `game_pending.json` | `state` = `{"type": …, "variant": "Pending", "fields": {}}`; `bet` como string |
| 7 | `ALICE` crea G2 y la cancela | `GameCancelled` (`cancelled_by` = `ALICE`, `refund` = bet); `game_cancelled.json` |
| 8 | `ALICE` crea G3 como invitación a `BOB`; `CAROL` intenta aceptarla **con `--gas-budget` explícito** | tx `failure`, `MoveAbort` en `game`, código **5**; `CAROL` solo pierde gas; G3 sigue `Pending` |
| 9 | `BOB` rechaza G3 | `GameCancelled` (`cancelled_by` = `BOB`); `ALICE` recupera `bet` |
| 10 | `ALICE` crea G4 (descartable, s1); `BOB` arma un PTB `accept_game` sobre G4 **seguido** de `--split-coins gas "[1]"` | rechazado antes de ejecutar: "Commands following a command with Random can only be TransferObjects or MergeCoins"; G4 sigue `Pending` |
| 11 | `BOB` acepta G1 (`--split-coins gas "[1000001]" --assign c --move-call $PKG::game::accept_game @$G1 @$HOUSE c.0 @0x8`) | `GameResolved` con `pot = 2000002`, `fee = 50000`, `payout = 1950002`; `balanceChanges` del ganador `+payout` (si es `BOB`, neto `payout − bet − gas`); `fees_collected` = 50000; `game_resolved.json` (`variant: "Resolved"`, `fields: {acceptor, winner}`). Si sale cancelada por DKG (`failure` con `ExecutionCancelledDueToRandomnessUnavailable`), esperar y repetir; anotarlo |
| 12 | Crear (`ALICE`) + aceptar (`BOB`) hasta ver **ambos** resultados (máx. **12** partidas, G4 incluida) | al menos un `winner` = `ALICE` y uno = `BOB`; conservación en cada una; `gasUsed` completo (`computationCost`, `storageCost`, `storageRebate`, `nonRefundableStorageFee`) de un resultado y del otro registrado: **consistente** con D6 (no es prueba: el cómputo se redondea a 1000 unidades, `sui-protocol-config/src/lib.rs:3302`; la evidencia de D6 es el código) |
| 13 | `ADMIN` retira: `--move-call $PKG::house::withdraw_fees @$HOUSE @$CAP --assign f --transfer-objects "[f]" @$ADMIN` | `FeesWithdrawn.amount` = Σ `fee`; `fees_collected` = 0 |
| 14 | Storage: `storageCost`/`storageRebate`/`nonRefundableStorageFee` de crear, cancelar, rechazar y aceptar, y `storageRebate` del objeto en `Pending`, `Cancelled` y `Resolved` | valores registrados; README "Objeto terminal y storage" actualizado (reemplaza "≈ 0,002–0,003 SUI") |
| 15 | Cierre: `kill` por PID, `rm -rf <SMOKE_DIR>`, `stat`/`ls` de `~/.sui/sui_config/` iguales al paso 1, `git status --porcelain`, `git diff --exit-code -- contracts/Move.lock` | sin cambios en `~/.sui/`; solo los archivos del task en el árbol; lock intacto |

- **Fixtures (s2):** `contracts/fixtures/localnet/jsonrpc/` con la respuesta `result` completa de `sui_getObject` de G1
  (`Pending` antes de aceptar, `Resolved` después) y G2 (`Cancelled`), formateados con `jq .`. Solo direcciones e IDs de
  localnet efímera. El formato gRPC/GraphQL lo captura #10 si elige esa API (comentario en #10 al aprobar). Si el
  fullnode local no sirve JSON-RPC, **STOP al MID** con el output.
  > Decisión (2026-10-30): fixtures en `contracts/fixtures/localnet/jsonrpc/` (sobreviven al housekeeping; nombradas
  > por API) y las tres variantes del enum, porque el parser de #10 debe reconocer las tres y tratar una desconocida
  > como error (SEG-10, `contracts/README.md:317`); agrega la carpeta al layout de `agents.md` §2 — MID, validado por
  > el MAYOR.
  > Decisión (2026-10-30): runbook `documents/SMOKE_ACCEPT.md` (convención §M5) en lugar de `SMOKE_GAME.md` que nombra
  > el issue, para no confundirlo con el ciclo GAME de #5 — MID, validado por el MAYOR.
- **`SMOKE_ACCEPT.md` (al redactarlo, MID):** sus Precondiciones repiten textualmente "las variables NO persisten entre
  llamadas", el contenido de `env.sh` y la regla `. env.sh && smoke_guard &&` en cada llamada.
- **Criterio de aceptación:** 15/15 pasos PASA con digests; fixtures válidos (`jq empty`); README con storage medido;
  sin secretos (greps de abajo); `~/.sui/` sin cambios; árbol limpio salvo el task.
- **Riesgos / rollback:** DKG lenta al arrancar la red (reintentar); puerto 9000 u otros de la red ocupados (detener **por PID** la
  otra red propia; si no es propia, STOP); `test-publish` con verificación de dependencias (ver arriba); `GUARD-FAIL`
  en cualquier llamada ⇒ no se ejecuta nada más y se reporta. Un paso fallido ⇒ smoke NO PASA y no hay revisión de
  integración (FLUJO §6). Rollback: borrar fixtures y revertir README/STATUS.

**Suma de tasks = issue #6:** criterios de validación, `entry` + `&Random`, simetría de gas, liquidación, eventos y tests
→ TASK-1; README completo y docs → TASK-2; smoke → TASK-3 (con `withdraw_fees` y la medición de storage de D-15);
gates/coverage en los tres; "CI verde": la CI gatea el PR. El criterio "Si #5 D1 eligió resolución separada" no aplica
(D-06 §1).

**Al aprobarse el plan (orquestador):** comunicar al usuario la precisión M1 de D5 (cobro antes del sorteo); comentar en
#10/#12 la ubicación de las fixtures (`jsonrpc/`), la regla de PTB con `Random` y las cancelaciones del runtime.

## Verificación que el DEV pega en cada reporte (comando + output literal completo)

Desde la raíz, cada `cd` en subshell, con la config sin claves de D-07 (TASK-3 corre sus comandos del smoke con
`env.sh` y después vuelve a correr este bloque **sin** cargarlo):

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

**Resultados esperados:** `active-env` = `testnet`; exits 0 en los tres gates y en `Move.lock`; 0 warnings; 0 lints;
≥ 83 tests PASS (TASK-1 en adelante); `merge-base` = `b7ab390…` mientras `master` no avance; `--stat` vacío; el grep
de `collect_pot`/`new_generator`/`pay_winner` muestra, dentro de `accept_game`, las tres llamadas en ese orden de líneas
(más las definiciones de `collect_pot` y `pay_winner`), con `new_generator` una sola vez; greps de azar alternativo e
`if (` vacíos; el grep de visibilidad muestra **solo** `entry fun accept_game`.

**Greps de secretos — matches esperados:** **solo líneas que contienen el propio patrón** (la línea del comando en
este plan, el handoff, el `SMOKE_ACCEPT.md` y los reportes/revisiones del ciclo). Ningún artefacto del ciclo escribe
esos términos fuera del comando. En `contracts/` (código, tests, README y fixtures): **ningún** match. El DEV pega el
output literal completo y clasifica cada match; **cualquier otro es BLOCKER** (SEG-3). Fuera de TASK-3, nada de
`sui client` salvo `active-env`; nunca leer, crear ni pegar `client.yaml` ni claves de `~/.sui/`.

## Changelog

- **v2 (2026-10-30)**, aplica `documents/REVISION_PLAN_ACCEPT.md` y D-20261030-16:
  - B1: aislamiento de TASK-3 con `env.sh` (rutas literales, guarda, `HOME` aislado + `MOVE_HOME`), `. env.sh &&
    smoke_guard &&` en cada llamada, `sui start` con el env en la misma orden, `active-env = localnet` comprobado antes
    de todo `sui client`; aviso explícito "las variables NO persisten entre llamadas" para handoff y `SMOKE_ACCEPT.md`.
  - M1: cobro (`collect_pot`: pozo, `split`, `add_fees`) antes de `new_generator`; tras el sorteo solo `pay_winner`
    (índice, estado, evento, transferencia); orden de aborts con `house::EWrongVersion` antes del sorteo; test 47
    reescrito; README y grep de orden ajustados.
  - M2: test 57 `test_accept_huge_pot_needs_u128_intermediate` (`max_bet = bet = 9 × 10^18`, 1000 bps).
  - m1: D2-D6 marcados como decididos por D-20261030-16 (tabla de registro, sin "si se elige otra").
  - m2: regex de visibilidad con nombres exactos y `\(`; esperado solo `entry fun accept_game`.
  - m3: paso 12 "consistente con D6", `gasUsed` completo, máximo 12 partidas; evidencia de D6 en el código.
  - m4: test 50 `test_accept_by_creator_on_own_invite_reports_self_play` (3 antes que 4).
  - m5: conservación multipartida con `sum_coins` en los tests 35 y 37.
  - m6: excepción acotada a D-07 declarada (FLUJO §6); cuentas por `sui genesis --working-dir` (sin `new-address`, sin
    frases en stdout) y `sui start --network.config`, sin faucet ni `--force-regenesis`.
  - m7: logs de génesis y de `sui start` a archivo (no se pegan), PID en archivo y `kill` por PID.
  - m8: TASK-2 agrega el aviso de aislamiento a `agents.md` §3/§7 y a `FLUJO_AGENTES.md` §6.
  - m9: cancelaciones del runtime (DKG y congestión) = `failure` con su `kind`, sin `MoveAbort`; README y #12 "reintentar".
  - m10: `public_random` está en `LintLevel::Default` (sale también sin `--lint`).
  - s1: el PTB rechazado del paso 10 usa una partida descartable (G4).
  - s2: fixtures en `contracts/fixtures/localnet/jsonrpc/`; gRPC/GraphQL para #10.
  - Tests: 31 nuevos (27-57), DoD ≥ 83.
- **v1 (2026-10-30):** primera versión.
