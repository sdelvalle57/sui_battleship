# Reportes del ciclo — #5 Game

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador (el harness
> no deja escribir archivos de reporte a los subagentes); las 51 líneas `[ PASS ]` se listan una vez.

## Task completado: HANDOFF_GAME — TASK-1

Gates en verde: build 0 warnings, `--lint` 0 lints, **51/51 PASS** (26 House + 25 Game), `Move.lock` sin
cambios. Sin STOP. Sin commits, pushes ni cambios de branch.

### Branch (con SHA corto del HEAD)
`feature/issue-5-game` @ `d487776` (trabajo sin commitear). Merge-base con `master`: `b00c093`.

### Archivos modificados/creados
- Creado: `contracts/sources/game.move` (214 líneas): módulo `battleship::game`.
- Creado: `contracts/tests/game_tests.move` (511 líneas): 25 tests, 14 `expected_failure`.
- Modificado: `contracts/tests/house_tests.move`: solo las 3 líneas de cabecera D-14 (`numstat` `3	0`).

### Qué se implementó (3 líneas máx)
1. `battleship::game` según §3.2: aborts 0-6, `Game` (`key` sin `store`), `GameState` (`Pending | Cancelled | Resolved{acceptor, winner}`), `GameCreated`, `GameCancelled`, y `create_game`/`cancel_game`/`reject_game` `entry` con los aborts en el orden del handoff.
2. `refund_creator` privado (`withdraw_all` → `Coin` → `game.creator`), sin House ni versión; `is_pending` con `match`; 12 helpers `#[test_only]`.
3. 25 tests de §5 con los nombres literales; cabecera D-14 en los tres `.move`.

### Tests y gates (output pegado, por área tocada)
```
++ git rev-parse --short HEAD
d487776
++ sui --version   (con printf 'n\n')
sui 1.83.0-16d2dc1e05ed
++ sui client active-env   (con printf 'n\n')
testnet
++ cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
++ cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
++ cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[ PASS    ] battleship::game_tests::test_cancel_by_other_on_cancelled_game_reports_not_creator
[ PASS    ] battleship::game_tests::test_cancel_invite_game_by_creator
[ PASS    ] battleship::game_tests::test_cancel_refunds_full_stake_and_emits_event
[ PASS    ] battleship::game_tests::test_cancel_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_cancel_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_cancel_rejects_invitee
[ PASS    ] battleship::game_tests::test_cancel_rejects_other_address
[ PASS    ] battleship::game_tests::test_cancel_rejects_rejected_game
[ PASS    ] battleship::game_tests::test_create_accepts_bet_equal_to_max_bet
[ PASS    ] battleship::game_tests::test_create_accepts_bet_equal_to_min_bet
[ PASS    ] battleship::game_tests::test_create_copies_fee_rate_at_creation
[ PASS    ] battleship::game_tests::test_create_invite_game_stores_opponent
[ PASS    ] battleship::game_tests::test_create_open_game_stores_fields_and_emits_event
[ PASS    ] battleship::game_tests::test_create_rejects_bet_above_max
[ PASS    ] battleship::game_tests::test_create_rejects_bet_below_min
[ PASS    ] battleship::game_tests::test_create_rejects_house_with_wrong_version
[ PASS    ] battleship::game_tests::test_create_rejects_self_invite
[ PASS    ] battleship::game_tests::test_create_reports_bet_error_before_self_invite
[ PASS    ] battleship::game_tests::test_games_of_same_creator_are_independent
[ PASS    ] battleship::game_tests::test_reject_refunds_creator_and_emits_event
[ PASS    ] battleship::game_tests::test_reject_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_reject_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_reject_rejects_creator
[ PASS    ] battleship::game_tests::test_reject_rejects_open_game
[ PASS    ] battleship::game_tests::test_reject_rejects_other_address
[ PASS    ] battleship::house_tests::* (las 26 de #4, sin cambios)
Test result: OK. Total tests: 51; passed: 51; failed: 0
exit=0
++ cd contracts && git diff --exit-code -- Move.lock
exit=0
```
(En el output original las líneas `game_tests` y `house_tests` aparecen intercaladas; las 26 de House son las mismas de #4.)

**Coverage (informativo):**
```
Test result: OK. Total tests: 51; passed: 51; failed: 0
Module …::house
>>> % Module coverage: 100.00
Module …::game
>>> % Module coverage: 98.02
| % Move Coverage: 99.03  |
exit=0
```
Único bloque sin cubrir en `game`: B3 de `is_pending` (instrucciones 15-18), el `_ => false` con estado `Resolved`, inalcanzable hasta que #6 construya `Resolved`.

**Verificaciones de §8 (literal):**
```
$ git status --porcelain --untracked-files=all
 M contracts/tests/house_tests.move
?? contracts/sources/game.move
?? contracts/tests/game_tests.move
merge-base=b00c093a6b12cf8fbe55c1f6f9132d5dbd9414d0
$ git diff --stat "$B" -- contracts/Move.toml contracts/Move.lock contracts/sources/house.move
(vacío)
$ git diff --numstat "$B" -- contracts/tests/house_tests.move
3	0	contracts/tests/house_tests.move
$ head -3 contracts/sources/game.move contracts/tests/game_tests.move contracts/tests/house_tests.move
(las tres: "// Copyright (c) 2025-2026 sdelvalle57" / "// SPDX-License-Identifier: Apache-2.0" / línea en blanco)
$ grep -nE "GamePool|GameRequest|TurnCap|fun init|Active|Clock|epoch_timestamp_ms" contracts/sources/game.move
exit=1
$ grep -n "ctx.sender()" contracts/sources/game.move
82:    let creator = ctx.sender();
103:    let sender = ctx.sender();
114:    let sender = ctx.sender();
$ grep -nE "fun (cancel_game|reject_game|refund_creator)" contracts/sources/game.move
102:entry fun cancel_game(game: &mut Game, ctx: &mut TxContext) {
112:entry fun reject_game(game: &mut Game, ctx: &mut TxContext) {
122:fun refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext) {
$ grep -n "version" contracts/sources/game.move
26:    /// Package version that created the game (`house.version()` at creation). Never read by refund paths.
27:    version: u64,
87:        version: house.version(),
120:// Refunds the whole stake to the creator, without fee. Takes no House and checks no version on purpose:
173:public fun version_for_testing(game: &Game): u64 {
174:    game.version
191:public fun set_version_for_testing(game: &mut Game, version: u64) {
192:    game.version = version;
$ git diff -U0 "$B" | grep -E "^\+" | grep -inE "suiprivkey|mnemonic|recovery|private.?key|keystore"
(7 líneas: 6 son el propio comando en HANDOFF_GAME.md y PLAN_GAME.md; 1 es la línea declarada de PLAN_GAME.md que nombra keystore/recovery — matches esperados)
$ git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
exit=123
$ grep -rinE 'suiprivkey|mnemonic|recovery|private.?key|keystore' contracts/sources contracts/tests
exit=1
```
`cancel_game`, `reject_game` y `refund_creator` (líneas 100-129) no mencionan `House`.

### Verificación manual
- Smoke: no aplica (§6, se difiere a #6).
- **Mutaciones** (copia en el scratchpad, sin tocar el repo): M1 reembolso a `cancelled_by` en vez de `game.creator` → 49/51; M2 estado antes que authZ en `cancel_game` → 50/51; M3 `ESelfInvite` antes que `EBetTooLow` → 50/51; M4 `fee_rate: 0` en vez de copiarlo → 50/51. Las 4 detectadas.

### Desviaciones del handoff (o "ninguna")
Ninguna toca la superficie on-chain. (1) Firma de `create_game` en varias líneas (ancho 100). (2) Helpers de test: `create_expecting_abort(mut scenario, bet, opponent)` (tests 6, 7, 8, 9, 25) y `assert_single_coin(scenario, account, amount)` (más estricto que `take_from_sender`). (3) Eventos de tests 1-2 leídos antes del `next_tx` y comparados después (el ID sale de `most_recent_id_shared<Game>()`). (4) Asserts extra en tests 1, 10, 11, 16, 21, 22, 23. (5) `is_pending` con `match` (sin usar la libertad `==`).

### Riesgos / pendientes (o "ninguno")
- Coverage de `game` 98,02 %: brazo `Resolved` de `is_pending` inalcanzable hasta #6. Opciones: (a) aceptarlo, se cubre en #6 — recomendada; (b) usar `game.state == GameState::Pending`; (c) helper `#[test_only]` que fuerce `Resolved` (no recomendado).
- Conservación: todo camino reembolsa el 100 % al creador y deja `stake == 0`.

### Documentación
- READMEs / `agents.md`: en TASK-2.
- Snippet STATUS: baseline `contracts/` @ `feature/issue-5-game` (TASK-1 de #5): build 0 warnings, lint 0, **51 tests** (26 + 25), `Move.lock` sin delta; coverage `house` 100 %, `game` 98,02 %, total 99,03 %.

## Revisión TASK-1: NO PASA (solo falta un test)

> Revisión del MID transcrita por el orquestador. El MID leyó entero `game.move` (214), `game_tests.move` (511), el diff de `house_tests.move` y `git status`.

**Aprobado sin cambios:** `game.move` = §3.2 línea por línea (cabecera, `use`, aborts 0-6 `:15-21`, `Game has key` sin `store` con 9 campos `:24-40`, `GameState` `:43-47`, eventos `:50-64`, tres `entry` sin `public` `:69-118`, `refund_creator`/`is_pending` privados `:122-140`, 12 helpers `_for_testing` `:142-214`; sin `init`/OTW/`Active`/`Clock`/debug). AuthZ antes que estado (`cancel_game:105-106`; `reject_game:113-116` con `ENoInvitation` primero; `create_game:76-83` House → apuesta → auto-invitación). D-12 §4 cumplido. Conservación SEG-4: `Coin` entero a `Balance`; reembolso `withdraw_all` → `game.creator` (`:131`); todo `Pending` con salida incondicional; terminal con `stake == 0`. 25 tests verifican lo que dicen sus nombres; M1-M4 detectadas. Gates del reporte OK.

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | 🟡 PROY-9, SEG-2, LIM-8 (hueco del handoff, MID) | `game.move:115-116`; falta en `game_tests.move`; `HANDOFF_GAME.md:342-384` | El orden de aborts de `reject_game` no lo fija ningún test (mover `ENotPending` al principio deja 51/51 en verde) | Test 26 `test_reject_by_other_on_cancelled_invite_reports_not_invited` (`expected_failure(abort_code = battleship::game::ENotInvited)`: invitación a INVITEE, el creador cancela, `next_tx(OTHER)` + `reject_game`); reportar mutación M5. Total 52/52 |
| 2 | ℹ️ coverage | `game.move:136-139` | `game` 98,02 % por el brazo `Resolved` | Opción (a): se acepta, se cubre en #6 |
| 3 | ℹ️ reporte | `REPORTES_GAME.md` | Resúmenes de PASS de House y del grep de secretos | Aceptado |

### Siguiente paso: correcciones al DEV (solo el delta)
Agregar solo el test 26; `game.move` y `house_tests.move` intactos (`sha256sum` antes/después); re-correr gates de §8 (52/52, `game` 98,02 %). TASK-2 se autoriza al pasar el delta. Ajustes al handoff (v1.1): "≥ 52 (≥ 26 de Game)" en §0/§5/§7/§8 e ítem 26 en §5; notas para #6 (tests de cancelar/rechazar sobre `Resolved` → `ENotPending`; test de authZ antes que estado en aceptar).

### Mensaje de commit propuesto (cuando pase el delta)
`contracts: add battleship::game with create, cancel and reject (#5)`.

## Re-entrega TASK-1 (delta: test 26)

> Reporte del DEV transcrito por el orquestador.

- Agregado solo el test 26 `test_reject_by_other_on_cancelled_invite_reports_not_invited` (`#[test, expected_failure(abort_code = battleship::game::ENotInvited)]`): invitación a INVITEE, el creador cancela, `next_tx(OTHER)` + `reject_game`, limpieza como el test 24. `grep -cE '^#\[test(\]|,)' contracts/tests/game_tests.move` → `26`.
- `sha256sum` antes = después: `game.move` `ccf17617…6543`, `house_tests.move` `0177deea…333c`.
- Gates (desde `contracts/`, `sui 1.83.0-16d2dc1e05ed`, `active-env` testnet; guard escrito como `printf n |`): build exit 0 / 0 warnings; `--lint` exit 0 / 0 lints; test exit 0 con `Test result: OK. Total tests: 52; passed: 52; failed: 0` (26 `game_tests` incl. el nuevo + 26 `house_tests`); `git diff --exit-code -- Move.lock` exit 0; coverage `house` 100 %, `game` 98,02 %, total 99,03 %.
- §8: `--stat` de `Move.toml`/`Move.lock`/`house.move` vacío; `numstat` de `house_tests.move` `3	0`; secretos: 7 matches esperados en el diff (iguales a la entrega anterior), en untracked solo líneas de comando de `REPORTES_GAME.md`, 0 en `contracts/`.
- **M5** (copia en el scratchpad): `assert!(game.is_pending(), ENotPending)` al principio de `reject_game` ⇒ `[ FAIL ] …test_reject_by_other_on_cancelled_invite_reports_not_invited`, `Test result: FAILED. Total tests: 52; passed: 51; failed: 1`. Solo el test 26 la detecta.
- Desviaciones: ninguna nueva. Riesgos: ninguno nuevo (coverage `game` 98,02 % → #6).

## Re-revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador.

Test 26 (`game_tests.move:513-528`) coincide con lo pedido (26 tests, 15 `expected_failure`; M5 solo la detecta el 26). `sha256sum` locales = reportados (`game.move` `ccf17617…136543`, `house_tests.move` `0177deea…62e333c`); diff de `house_tests.move` = solo cabecera. Gates reportados 52/52, build/lint 0, `Move.lock` sin delta, coverage `game` 98,02 % (aceptado). Guard `printf n |` equivalente; en TASK-2 usar la forma canónica. **TASK-2 autorizado** (handoff v1.1, con la versión del encabezado y la nota para #6 corregidas por el orquestador).

### Mensaje de commit propuesto
`contracts: add battleship::game with create, cancel and reject (#5)`.
