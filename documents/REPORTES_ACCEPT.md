# Reportes del ciclo — #6 Aceptar + coinflip

> Reportes del DEV, evidencia del smoke y revisiones del MID, una sección por task. Transcritos por el
> orquestador (el harness no deja escribir archivos de reporte a los subagentes). La salida de `sui move
> test` se transcribe con las 83 líneas `[ PASS ]` agrupadas por suite; el DEV la pegó íntegra.

## Task completado: HANDOFF_ACCEPT — TASK-1

Sin STOP: la superficie on-chain compiló exactamente como §3.1-3.3, sin plan B y sin warnings.

### Branch (con SHA corto del HEAD)
`feature/issue-6-accept` @ `d31716e` (cambios sin commitear). Merge-base `b7ab390`.

### Archivos modificados/creados
- `contracts/sources/game.move` (+151/−3) · `contracts/tests/game_tests.move` (+679).
- Sin tocar: `house.move`, `house_tests.move`, `Move.toml`, `Move.lock`, `.github/`, `documents/`, `agents.md`, `contracts/README.md`, `~/.sui/`.

### Qué se implementó (3 líneas máx)
`entry fun accept_game` (no `public`): `assert_acceptable` → `collect_pot` (comisión floor `u128` sobre el pozo, `add_fees` siempre y antes del sorteo) → `r.new_generator` + `generate_u8_in_range(0, 1)` → `pay_winner` (sin ramas: `vector[creator, acceptor]` + `borrow(índice)`); evento `GameResolved`, aborts 7-10, `BPS_DENOMINATOR`, 5 helpers `#[test_only]`, todo literal de §3. 31 tests 27-57 con los nombres exactos (`diff` contra la tabla de §5: idénticos).

### Tests y gates (output pegado)
```
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ printf 'n\n' | sui client active-env
testnet
$ (cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ (cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ (cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors); echo "exit=$?"
Running Move unit tests
[ PASS ] battleship::house_tests::* — las 26 de #4, sin cambios
[ PASS ] battleship::game_tests::* — las 26 de #5 + test_cancel_rejects_resolved_game + test_reject_rejects_resolved_game
[ PASS ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS ] battleship::game_tests::test_accept_invite_by_invitee_resolves
[ PASS ] battleship::game_tests::test_accept_max_bet_with_max_fee_does_not_overflow
[ PASS ] battleship::game_tests::test_accept_open_game_acceptor_wins_pays_payout_and_fee
[ PASS ] battleship::game_tests::test_accept_open_game_creator_wins_pays_payout_and_fee
[ PASS ] battleship::game_tests::test_accept_rejects_cancelled_game
[ PASS ] battleship::game_tests::test_accept_rejects_game_of_older_version
[ PASS ] battleship::game_tests::test_accept_rejects_higher_stake
[ PASS ] battleship::game_tests::test_accept_rejects_house_of_newer_version
[ PASS ] battleship::game_tests::test_accept_rejects_lower_stake
[ PASS ] battleship::game_tests::test_accept_rejects_non_invited
[ PASS ] battleship::game_tests::test_accept_rejects_other_house
[ PASS ] battleship::game_tests::test_accept_rejects_own_game
[ PASS ] battleship::game_tests::test_accept_rejects_resolved_game
[ PASS ] battleship::game_tests::test_accept_reports_house_before_authz
[ PASS ] battleship::game_tests::test_accept_reports_state_before_stake
[ PASS ] battleship::game_tests::test_accept_reports_version_before_authz
[ PASS ] battleship::game_tests::test_accept_reports_version_before_house
[ PASS ] battleship::game_tests::test_accept_rounds_fee_down_on_indivisible_pot
[ PASS ] battleship::game_tests::test_accept_uses_fee_rate_copied_at_creation
[ PASS ] battleship::game_tests::test_accept_with_max_fee_charges_ten_percent
[ PASS ] battleship::game_tests::test_accept_with_random_reaches_both_outcomes
[ PASS ] battleship::game_tests::test_accept_with_random_resolves_and_conserves_funds
[ PASS ] battleship::game_tests::test_accept_with_zero_fee_pays_whole_pot
[ PASS ] battleship::game_tests::test_fees_from_two_games_accumulate_and_withdraw_exactly
Test result: OK. Total tests: 83; passed: 83; failed: 0
exit=0
$ git diff --exit-code -- contracts/Move.lock; echo "exit=$?"
exit=0
coverage summary: battleship::house 100.00 · battleship::game 100.00 · total 100.00 (exit=0)
$ git status --porcelain
 M contracts/sources/game.move
 M contracts/tests/game_tests.move
merge-base=b7ab39010d8bf757d3dc055a8c1e46aae7a339e7
$ git diff --stat "$B" -- contracts/Move.toml contracts/Move.lock contracts/sources/house.move contracts/tests/house_tests.move
(vacío)
$ grep -nE 'collect_pot\(|new_generator|pay_winner\(' contracts/sources/game.move
155:    let (payout, pot, fee) = game.collect_pot(house, payment);
156:    let mut generator = r.new_generator(ctx);
158:    game.pay_winner(payout, pot, fee, acceptor, winner_index as u64, ctx);
197:fun collect_pot(game: &mut Game, house: &mut House, payment: Coin<SUI>): (Balance<SUI>, u64, u64) {
210:fun pay_winner(
325:    let (payout, pot, fee) = game.collect_pot(house, payment);
326:    game.pay_winner(payout, pot, fee, acceptor, winner_index, ctx);
$ grep -nE 'epoch|timestamp|Clock|tx_hash|fresh_object_address' contracts/sources/game.move
(vacío)
$ grep -n 'if (' contracts/sources/game.move
(vacío)
$ grep -nE 'public fun (accept_game|collect_pot|pay_winner|assert_acceptable|fee_amount)\(|entry fun accept_game' contracts/sources/game.move
142:entry fun accept_game(
```
Secretos (`git diff -U0 "$B" | grep '^\+' | grep -inE 'suiprivkey|recoveryPhrase|recovery_phrase|mnemonic|PRIVATE KEY'`): 6 líneas, todas en documentos del ciclo (`HANDOFF_ACCEPT.md` y `PLAN_ACCEPT.md`: la propia línea del comando; `REVISION_PLAN_ACCEPT.md`: cita del campo `recovery_phrase` de la CLI y el patrón en el hallazgo n4). En `contracts/`: exit 1. Untracked: ninguno.

### Verificación manual
Smoke = TASK-3. **Mutaciones** (copia en el scratchpad, borrada; el repo nunca se tocó), las 9 detectadas:

| Mutación en `game.move` | Tests que fallan |
|---|---|
| M1 `fee_amount` en `u64` | `test_accept_huge_pot_needs_u128_intermediate` |
| M2 redondeo hacia arriba | `…rounds_fee_down_on_indivisible_pot`, `…fees_from_two_games_accumulate_and_withdraw_exactly` |
| M3 `vector[acceptor, creator]` | 10 tests de reparto (27-35, 57) |
| M4 House antes que versión | `…reports_version_before_house` |
| M5 estado antes que authZ | `…by_creator_on_cancelled_game_reports_self_play`, `…by_other_on_cancelled_invite_reports_not_invited` |
| M6 `payment.value() >= bet` | `…rejects_higher_stake` |
| M7 sin chequeo de versión | 45, 46, 51, 53 |
| M8 comisión sobre `bet` | 11 tests |
| M9 `ENotInvited` antes que `ESelfPlay` | `…by_creator_on_own_invite_reports_self_play` |

### Desviaciones del handoff
`game.move`: ninguna (literal de §3). Tests: (1) helpers extra `random_round`, `other_house`, `accept_on_house`, `assert_resolved`; `accept` delega en `accept_on_house` (House por ID, como pide §5); (2) `SEED` = `x"1F"` × 32 (el vector de `random_tests.move:24` tiene 31 bytes); (3) test 37 con 4 partidas y semillas `x"01"…x"04"` × 32, comisión 250, exige ambos resultados; (4) test 36 con asserts inline.

### Riesgos / pendientes
- Comentarios "(#6)" en `game.move:4-5` y `:36` (doc del módulo y de `house_id`): limpiar en TASK-2 o dejarlos; decide el MID.
- Test 37 depende del sorteo determinista de `test_scenario` (si una CLI futura cambia la derivación, falla visiblemente, nunca en falso).

### Documentación
- README / `agents.md` / ESTANDARES / STATUS: TASK-2.
- Snippet STATUS: baseline `contracts/` @ `feature/issue-6-accept` (TASK-1 de #6): build 0, lint 0, **83 tests** (26 + 57), `Move.lock` sin delta, coverage `house` 100 %, `game` **100 %**.

## Revisión TASK-1: PASA (condicionado a H1, solo comentarios)

> Revisión del MID transcrita por el orquestador.

Código literal a §3.1-3.3 y D-16 (incluida la precisión M1); 31 nombres idénticos a §5 (`diff`); los 26 tests previos sin cambios. Línea por línea: `accept_game` (`:142-159`) `entry` sin `public`, `collect_pot` `:155` → `new_generator` `:156` → `pay_winner` `:158`; `assert_acceptable` (`:184-192`) 7 → 8 → 9 → 5 → 4 → 10, solo lee `house.version()` (sin chequeo), `||` en cortocircuito; `collect_pot` (`:197-205`) `withdraw_all`, `add_fees` siempre antes del sorteo, `split(fee)` no aborta (fee ≤ pot), `join` sin desborde práctico; `fee_amount` (`:237-239`) floor con `u128`, cast seguro; `pay_winner` (`:210-232`) sin ramas, solo operaciones que no dependen del resultado; conservación exacta; `GameResolved` = §3.2. Tests: `expected_failure` con ruta completa (el 47 distingue `house::EWrongVersion` de `game::ENotCreator`), 47 con comisión 0, 57 desborda sin `u128` (M1), 36-37 con `Random` real (rondas consecutivas, determinista), 38-54 por el `entry` real; mutaciones M1-M9 detectadas; lo invisible a tests (`add_fees` tras el sorteo, `if`) lo cubren los greps. Desviaciones del DEV aceptadas.

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H1 | LIM-7, PROY-10 | `game.move:5`, `:35`, `:49` | Comentarios "(#6)" presentan lo implementado como futuro | Reemplazar solo esas 3 líneas (texto literal del MID); re-correr gates (0/0/83) y `grep -n '#[0-9]' game.move` vacío |
| H2 | Proceso | `REPORTES_ACCEPT.md` | Coverage y grep de secretos resumidos | Sin acción (el MID repitió el grep: 6 coincidencias en documentos del ciclo, 0 en `contracts/`); en TASK-2/3 output literal |
| H3 | Error del handoff (MID) | `HANDOFF_ACCEPT.md:255-256` | El `SEED` de `random_tests.move:24` tiene 31 bytes, no 32 | Anotado aquí; el DEV usó 32 correctamente |
| H4 | ARQ-7 | `game_tests.move:186-193` | `fees_before` de `assert_resolved` siempre 0 | Sin acción |

### Siguiente paso
DEV aplica H1 → commit de TASK-1 → TASK-2 autorizado (baseline 83 tests, `game` 100 %).

### Mensaje de commit propuesto
`contracts: add accept_game with coinflip, fee and GameResolved (#6)`.

## Corrección H1 (DEV) y verificación del orquestador

- Reemplazadas solo `game.move:5`, `:35` y `:49` con el texto literal del MID (script que exige coincidencia exacta del original).
- Gates (output literal pegado por el DEV): build exit 0 / 0 warnings; `--lint` exit 0 / 0 lints; test exit 0, `Test result: OK. Total tests: 83; passed: 83; failed: 0`; `Move.lock` sin delta; `grep -n '#[0-9]' contracts/sources/game.move` → exit 1 (vacío).
- Orquestador: `diff` entre la copia revisada por el MID y el archivo actual = exactamente esas 3 líneas.
