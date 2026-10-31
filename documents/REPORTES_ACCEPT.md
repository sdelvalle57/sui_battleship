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

## Task completado: HANDOFF_ACCEPT — TASK-2 (docs)

> Reporte del DEV transcrito por el orquestador (los greps de criterio y secretos, literales; la salida de test, resumida: 83 líneas `[ PASS ]`, las mismas de TASK-1).

Docs alineadas con `accept_game`; gates cero delta; sin STOP. Branch @ `1630eaa`, cambios sin commitear. `git diff --stat HEAD`: `agents.md` +120, `contracts/README.md` +167, `ESTANDARES.md` 6, `FLUJO_AGENTES.md` 2, `STATUS.md` 17 (243+/69−). Sin tocar código, `Move.*`, DECISIONES, REPORTES, SMOKE, plan, handoff, README raíz ni `~/.sui/`. No se hizo el smoke.

### Qué se implementó (3 líneas máx)
- `contracts/README.md`: sección `battleship::game` completa 1:1 con `game.move` (`accept_game` con aborts en orden, 4 privadas, `GameResolved`, códigos 7-10, comisión, Aleatoriedad, Cancelaciones del runtime, PTB con `Random`, Carreras, Versionado en 3 casos, Contención); referencias "(#6)" de la sección House actualizadas.
- `agents.md`: §3 nueva subsección "Localnet aislada (smokes)" con el procedimiento completo (n1); §2 (`contracts/fixtures/`), §6, §7 (3 gotchas nuevos), §8, §9.
- ESTANDARES v1.6 (PROY-5/7 por D-16), FLUJO §6 (localnet aislada), STATUS (baseline 83 / 100 % sobre `1630eaa`, H7/H9 ✅, roadmap, fila #6).

### Tests y gates (output pegado)
```
$ grep -nE "\(#6\)|GameAccepted|resolve_game|Active" contracts/README.md agents.md documents/ESTANDARES.md contracts/sources/game.move
documents/ESTANDARES.md:70:- **PROY-10 — Upgrades.** … comparada solo al aceptar (#6); …
agents.md:190:> D-20261030-15 (#5), y **comisión y aceptar/coinflip** por D-20261030-16 (#6); contrato en
contracts/README.md:181:Sin estado `Active` y **sin expiración** (D-20261030-06 §1-§2): `accept_game` acepta y resuelve en la misma
$ grep -n "\(#6\)" contracts/sources/game.move; echo "exit=$?"
exit=1
$ grep -n "force-regenesis" agents.md documents/FLUJO_AGENTES.md
agents.md:85:**Motivo:** con `--force-regenesis` y sin `SUI_CONFIG_DIR`, `sui start` reescribe
agents.md:122:4. **Génesis y arranque** (sin `--force-regenesis` ni faucet; la génesis crea 5 cuentas con fondos y un
agents.md:239:- **Localnet sin aislar:** `sui start --with-faucet --force-regenesis` sin `SUI_CONFIG_DIR` reescribe
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ printf 'n\n' | sui client active-env
testnet
build --warnings-are-errors: exit=0 · --lint --warnings-are-errors: exit=0
test --warnings-are-errors: Test result: OK. Total tests: 83; passed: 83; failed: 0 · exit=0
$ git diff --exit-code -- contracts/Move.lock; echo "exit=$?"
exit=0
$ git diff --stat HEAD -- contracts/sources contracts/tests contracts/Move.toml contracts/Move.lock documents/DECISIONES.md documents/REPORTES_ACCEPT.md documents/SMOKE_ACCEPT.md
(vacío)
grep de orden: idéntico a TASK-1 (7 líneas; `new_generator` una vez) · azar alternativo y `if (`: vacíos · visibilidad: solo `142:entry fun accept_game(`
$ git diff -U0 "$B" | grep -E '^\+' | grep -inE 'suiprivkey|recoveryPhrase|recovery_phrase|mnemonic|PRIVATE KEY'
(7 líneas: comando en HANDOFF_ACCEPT.md ×2 y PLAN_ACCEPT.md ×2; transcripción del comando en REPORTES_ACCEPT.md; cita de `recovery_phrase` y patrón del hallazgo n4 en REVISION_PLAN_ACCEPT.md)
$ git diff -U0 HEAD | grep -E '^\+' | grep -inE '…'   (cambios de TASK-2)
exit=1
```
Clasificación del grep de criterio: `game.move` vacío (guarda); `ESTANDARES.md:70` y `agents.md:190` atribuciones históricas; `README.md:181` negación (ejemplo del handoff). Tablas del README: 10/10 firmas literales, códigos y eventos cotejados.

### Desviaciones del handoff
- `agents.md` §3 suma línea base `stat`/`ls` de `~/.sui/sui_config/`, publicación efímera con `test-publish --pubfile-path` (+ `git checkout -- contracts/Move.lock`) y chequeo de `Pub.*.toml`/`Published.toml` en el cierre (copias literales del handoff/runbook; completan el procedimiento para #17).
- README: Contención propia, ejemplo `sui client ptb` de aceptar, "el resultado se lee de `GameResolved` o del objeto"; referencias de House a `accept_game`.

### Riesgos / pendientes
- `documents/agentes/AGENTE_DEV.md:63` y `AGENTE_MID.md:166` siguen recomendando `sui start --with-faucet --force-regenesis` (fuera del alcance de TASK-2).
- PROY-10 conserva "(#6)" (histórico).
- Procedimiento de localnet sin probar: lo valida TASK-3.

## Revisión TASK-2: PASA (con retoques literales H1-H4, aplicados por el orquestador)

> Revisión del MID transcrita por el orquestador.

README 1:1 con `game.move` @ `1630eaa` (10 funciones, firmas carácter por carácter; aborts de `accept_game` 7 → 8 → 9 → 5 → 4 → 10 → `house::EWrongVersion`; tabla 7-10 = `game.move:23-26`; `GameResolved` = `:75-83`; versionado en 3 casos; comisión, aleatoriedad, PTB, cancelaciones del runtime, carreras y contención = código y D-16). `agents.md` §3 "Localnet aislada" (`:83-141`) correcta y completa (7 puntos de n1), salvo H1; desviaciones del DEV aceptadas. Resto del diff correcto; secretos solo en líneas de `REPORTES_ACCEPT.md` que transcriben el patrón, 0 en `contracts/`. Decisiones: `AGENTE_DEV.md:63` y `AGENTE_MID.md:166-167` se corrigen ya (H2); el "(#6)" de PROY-10 se queda (atribución histórica).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | PROY-20 | `agents.md:129` | Publicación efímera en el paso 4 usa `$ADMIN` del paso 5 | Texto literal del MID (después del paso 5) — aplicado |
| H2 | SEG-3, D-07, FLUJO §6 | `AGENTE_DEV.md:63`; `AGENTE_MID.md:166-167` | Recomiendan `sui start --with-faucet --force-regenesis` | Texto literal del MID — aplicado |
| H3 | Sugerencia | `agents.md:139` | `rm -rf` con la red aún escribiendo | Confirmar fin con `kill -0` antes de borrar — aplicado |
| H4 | STATUS | `STATUS.md` fila #6 | "TASK-2 en revisión" | `TASK-2 ✅ (docs, MID PASA)` — aplicado |
| H5 | Proceso | este archivo | build/lint resumidos | Sin acción; en TASK-3 output literal |

Verificación del orquestador: `git diff --stat HEAD -- contracts/` vacío; `grep -rn force-regenesis documents/agentes/` vacío. **TASK-3 autorizado.**

### Mensaje de commit propuesto
`docs: document accept_game and the isolated localnet procedure (#6)`.
