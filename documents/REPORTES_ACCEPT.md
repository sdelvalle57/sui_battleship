# REPORTES_ACCEPT
> Issue: #12 | Plan: PLAN_ACCEPT v2 | Handoff: HANDOFF_ACCEPT v1.2 | Branch: `feature/issue-12-accept-resolve`

## TASK-1

## Task completado: HANDOFF_ACCEPT — TASK-1 (fixtures reales de aceptar y sondas)

### Branch (con SHA corto del HEAD)
`feature/issue-12-accept-resolve` @ `7839dfc`. Sin commits; los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- `app/scripts/capture-tx-fixtures.mjs`: selección y casos de aceptar, rol `C`.
- `contracts/fixtures/game-tx.localnet.json`: recapturado entero en una génesis nueva (de 47 kB a 90 kB).
- `contracts/README.md`: fila de la tabla de rutas, "Fixture de transacciones" y "Recaptura de la fixture de transacciones".
- `app/src/sui/errors.test.ts` y `app/src/sui/house.test.ts`: ajuste mínimo para leer el valor de la fixture (Desviación 4).

### Qué se implementó (3 líneas máx)
El script captura además 4 `SimulationError` de aceptar (`game`/9, 5, 4 y 10) y 4 transacciones de aceptar: gana el creador, gana el aceptante, invitación y el fallo ejecutado `game`/4. El rol `C` sale del sender de ese fallo, y `G_CANCEL` exige partida abierta.
Fixture recapturada entera en una localnet aislada nueva; sondas S-1..S-6 respondidas; reserva propuesta **`ACCEPT_GAS_RESERVE_MIST = 10_000_000n`**.

### Tests y gates (output pegado, por área tocada)
- **Tests:** ninguno nuevo. Modifiqué 2 tests de #11 que dependían de valores de la captura vieja (Desviación 4). El total sigue en 630 tests en 46 archivos.
- **Contracts:** `sui 1.83.0-16d2dc1e05ed`; build 0 warnings; `--lint` 0 lints; 83 tests PASS; `node --test` 99 PASS; `check` da "0 despliegues"; `Move.lock` sin delta.
- **App:** `npm ci` 0 (293 paquetes); 292 firmas verificadas; 0 vulnerabilidades de producción; lint 0; typecheck 0; 630 PASS en 46 archivos; build `index-Dg-GHDX5.js` 877.90 kB (267.47 kB gzip), con el aviso informativo de chunk > 500 kB (#15).
- **Delta contra el baseline:** ninguno.
- **Otros:** `git diff --exit-code -- contracts/fixtures/game-reads.localnet.json` da 0. `package*.json` y el lock sin delta.
- **Tablas de contrato y `app/src/sui/`:** no aplica.

**Verificación del baseline** (primer paso, sobre `7839dfc` con árbol limpio): coincide con §0 del handoff.

```text
added 293 packages, and audited 295 packages in 8s
67 packages are looking for funding
11 moderate severity vulnerabilities
exit=0
audited 292 packages in 8s
292 packages have verified registry signatures
143 packages have verified attestations
exit=0
found 0 vulnerabilities
exit=0
> eslint . --max-warnings 0
exit=0
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json
exit=0
 RUN  v5.0.5 <repo>/app
 Test Files  46 passed (46)
      Tests  630 passed (630)
exit=0
dist/assets/index-Dg-GHDX5.js   877.90 kB │ gzip: 267.47 kB
(!) Some chunks are larger than 500 kB after minification. ...
exit=0
git status --porcelain --untracked-files=all: (vacío)
sui 1.83.0-16d2dc1e05ed / exit=0 ; build exit=0 ; --lint exit=0
Test result: OK. Total tests: 83; passed: 83; failed: 0 / exit=0
ℹ tests 99 ℹ pass 99 ℹ fail 0 / exit=0
0 despliegues / exit=0 ; git diff --exit-code -- Move.lock exit=0
```

Los 83 nombres de test Move del baseline son los mismos que los del final: comparé las listas ordenadas y coinciden (el orden de salida cambia porque corren en paralelo).

**Gate final, job `app`:**
```text
added 293 packages, and audited 295 packages in 9s
67 packages are looking for funding
  run `npm fund` for details
11 moderate severity vulnerabilities
To address all issues (including breaking changes), run:
  npm audit fix --force
Run `npm audit` for details.
exit=0
audited 292 packages in 9s
292 packages have verified registry signatures
143 packages have verified attestations
(use --json --include-attestations to view attestation details)
exit=0
found 0 vulnerabilities
exit=0
> lint
> eslint . --max-warnings 0
exit=0
> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json
exit=0
> test
> vitest run
 RUN  v5.0.5 <repo>/app
 Test Files  46 passed (46)
      Tests  630 passed (630)
   Start at  20:45:37
   Duration  16.77s (environment 66%, setup 10%, import 9%, tests 9%, transform 5%, worker 1%)
exit=0
> build
> vite build
vite v8.3.5 building client environment for production...
transforming...
✓ 584 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Dg-GHDX5.js   877.90 kB │ gzip: 267.47 kB
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 573ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/scripts/capture-tx-fixtures.mjs
 M app/src/sui/errors.test.ts
 M app/src/sui/house.test.ts
 M contracts/README.md
 M contracts/fixtures/game-tx.localnet.json
```

**Gate final, job `contracts`** (desde `<repo>/contracts`, forma canónica):
```text
sui 1.83.0-16d2dc1e05ed
exit=0
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[ PASS    ] battleship::house_tests::test_add_fees_accumulates_balance
[ PASS    ] battleship::house_tests::test_add_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fees_collected_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_init_sends_single_house_cap_to_publisher
[ PASS    ] battleship::house_tests::test_init_shares_exactly_one_house_with_defaults
[ PASS    ] battleship::house_tests::test_max_bet_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_migrate_bumps_version_and_emits_event
[ PASS    ] battleship::house_tests::test_migrate_rejects_current_version
[ PASS    ] battleship::house_tests::test_migrate_rejects_house_newer_than_package
[ PASS    ] battleship::house_tests::test_min_bet_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_transfer_house_cap_moves_cap_and_emits_event
[ PASS    ] battleship::house_tests::test_transferred_cap_lets_new_holder_administer
[ PASS    ] battleship::house_tests::test_update_bet_limits_accepts_equal_min_and_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_min_above_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS    ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS    ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS    ] battleship::game_tests::test_accept_invite_by_invitee_resolves
[ PASS    ] battleship::game_tests::test_accept_max_bet_with_max_fee_does_not_overflow
[ PASS    ] battleship::game_tests::test_accept_open_game_acceptor_wins_pays_payout_and_fee
[ PASS    ] battleship::game_tests::test_accept_open_game_creator_wins_pays_payout_and_fee
[ PASS    ] battleship::game_tests::test_accept_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_accept_rejects_game_of_older_version
[ PASS    ] battleship::game_tests::test_accept_rejects_higher_stake
[ PASS    ] battleship::game_tests::test_accept_rejects_house_of_newer_version
[ PASS    ] battleship::game_tests::test_accept_rejects_lower_stake
[ PASS    ] battleship::game_tests::test_accept_rejects_non_invited
[ PASS    ] battleship::game_tests::test_accept_rejects_other_house
[ PASS    ] battleship::game_tests::test_accept_rejects_own_game
[ PASS    ] battleship::game_tests::test_accept_rejects_resolved_game
[ PASS    ] battleship::game_tests::test_accept_reports_house_before_authz
[ PASS    ] battleship::game_tests::test_accept_reports_state_before_stake
[ PASS    ] battleship::game_tests::test_accept_reports_version_before_authz
[ PASS    ] battleship::game_tests::test_accept_reports_version_before_house
[ PASS    ] battleship::game_tests::test_accept_rounds_fee_down_on_indivisible_pot
[ PASS    ] battleship::game_tests::test_accept_uses_fee_rate_copied_at_creation
[ PASS    ] battleship::game_tests::test_accept_with_max_fee_charges_ten_percent
[ PASS    ] battleship::game_tests::test_accept_with_random_reaches_both_outcomes
[ PASS    ] battleship::game_tests::test_accept_with_random_resolves_and_conserves_funds
[ PASS    ] battleship::game_tests::test_accept_with_zero_fee_pays_whole_pot
[ PASS    ] battleship::game_tests::test_cancel_by_other_on_cancelled_game_reports_not_creator
[ PASS    ] battleship::game_tests::test_cancel_invite_game_by_creator
[ PASS    ] battleship::game_tests::test_cancel_refunds_full_stake_and_emits_event
[ PASS    ] battleship::game_tests::test_cancel_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_cancel_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_cancel_rejects_invitee
[ PASS    ] battleship::game_tests::test_cancel_rejects_other_address
[ PASS    ] battleship::game_tests::test_cancel_rejects_rejected_game
[ PASS    ] battleship::game_tests::test_cancel_rejects_resolved_game
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
[ PASS    ] battleship::game_tests::test_fees_from_two_games_accumulate_and_withdraw_exactly
[ PASS    ] battleship::game_tests::test_games_of_same_creator_are_independent
[ PASS    ] battleship::game_tests::test_reject_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::game_tests::test_reject_refunds_creator_and_emits_event
[ PASS    ] battleship::game_tests::test_reject_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_reject_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_reject_rejects_creator
[ PASS    ] battleship::game_tests::test_reject_rejects_open_game
[ PASS    ] battleship::game_tests::test_reject_rejects_other_address
[ PASS    ] battleship::game_tests::test_reject_rejects_resolved_game
Test result: OK. Total tests: 83; passed: 83; failed: 0
exit=0
✔ (99 tests de node --test, todos ✔: parsePublishOutput ×9, parseDryRunOutput ×2, buildDeployment, SEG-3, validateDeployment ×27, parsePublishedToml ×8, checkConsistency, readFrameworkRev, redactAddresses, normalizeId, runSui ×4, publishCliArgs, runGit, parseCliArgs ×2, main ×2, checkPublishArgs ×2, checkConfigDirGuard ×3, checkNetworkGuard ×2, readCliJson ×2, redactConfigDir, checkCliVersion, checkTestnetPreconditions, checkLockUnchanged, confirmación ×2, resolveRecordMeta ×3, checkDeployments ×9, fixtures/localnet.deployment.json, formatSummary, formatCliFailure ×5, interpretCliRun ×3, formatPostPublishFailure)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 174.967383
exit=0
0 despliegues
exit=0
exit=0
```

**Greps antes de entregar:**
- Claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key|seed phrase`) en todo el diff: vacío.
- Rutas personales (`/home/`, el usuario, el scratchpad, `.nvm/versions`): vacío.
- Hex de 40-64 en líneas agregadas fuera de `contracts/fixtures/game-tx.localnet.json`: vacío. Dentro de la fixture hay IDs y direcciones de la génesis desechable, como en #11.
- La fixture tiene 0 claves y 0 `signatures`. Sus 11 `sender` son roles (`A` ×5, `B` ×3, `C` ×2, `ADMIN` ×1). Un recorrido del JSON entero no encuentra ningún `sender`, `signature(s)` ni `publicKey` con una dirección.

### Verificación manual (localnet / testnet, digests de tx si hubo)
Localnet aislada según `agents.md` §3: `env.sh` + `ids.env` + `smoke_guard`, todo `suic` bajo B4 con `printf 'n\n' |`, y Node con `app.env`, nunca en la misma llamada que `env.sh`. Hubo dos génesis, una después de la otra y nunca a la vez (Desviación 1). Nada contra testnet.

Corrida válida: **chain id `8e50335e`**. Cuentas: `ADMIN`, `A`, `B`, `C`, y `E` solo para S-3 y S-5. Publicación con el script en variante B: `CEvxwsURXPeTUE8WKt67MW5hsfEJ3mjLDiKkJAvwxZku`.

| Paso | Transacción | Digest | Checkpoint | Resultado |
|---|---|---|---|---|
| 1 | `ADMIN` `update_fee_rate` 250 | `3BLixnkML2vqLSsX1ep23DAv5eCMhvBurru4nJHWHT7X` | 86 | `success` |
| 2.1 | `A` crea `G_OPEN` (`0xfe94…3bf7`) abierta, 1000001 | `F97hKB7xhx8aPn3SZ3cemR3b1D8cRMvpBnu2rKQDnq3` | 89 | gas 1000000/2941200/**0** (primera tx de `A`) |
| 2.1 | `A` crea `G_INV` (`0xf206…be8c`) invitando a `B`, 2000002 | `HQrofyetpRfBCEUQKahVZDfNVm6SYenozuSR6V6si7Rs` | 94 | `success` |
| 2.2 | `A` crea `G_CANCEL` (`0xda22…7e2d`) **abierta**, 3000003 | `6wyVcksfFzDsHPoRz3x934291nkNrJNaUE5TjB7py6dV` | 130 | `success` |
| 2.2 | `A` la cancela | `BkKjhHhBQA5GEWb6973wEmQvhYUSQx7XttbQ65DqQ9nk` | 133 | `refund` 3000003 |
| 2.2 | `A` crea `G_REJ` (`0x40e0…a045`) invitando a `B`, 4000004 | `8LAHnU6mxBEhfbEdA9xwdA6fjVWhMNHxueGL8bB2RDpN` | 137 | `success` |
| 2.2 | `B` la rechaza | `3tR2uDRdHsgdoEYeBRQpw2ywfJew651dC5akasTh2XJh` | 140 | `refund` 4000004 |
| 2.3 | `B` `cancel_game` sobre `G_OPEN` con `--gas-budget 100000000` | `3kxNrtPmR4kk8DhnfymUnpWcyp3JXSJpJ13L617uWNLu` | 169 | fallo ejecutado `game`/3. CLI: "1st command aborted within function '0x\<PKG\>::game::cancel_game' at instruction 16 with code 3" |
| 2.4 | `A` crea `G_ACC1` (`0x652e…02ec`), 1000001 | `iGpkUDGZMbAeJ832kNk8Z1MCrhE9iVEvavDiotX8YTE` | 323 | `success` |
| 2.4 | `B` acepta `G_ACC1` | `Bkp9XraLBSarbXUFTcE3o4wgGDWtNvQK3SiykmzD98Xk` | 327 | pozo 2000002, comisión 50000, pago 1950002; **gana el aceptante** |
| 2.4 | `A` crea `G_ACC2` (`0x4f48…4fe8`) | `8Dnf1mVdU4sSaaGa73jxcsDJW3KkeDiwAXRVsNKG99R6` | 331 | `success` |
| 2.4 | `B` acepta `G_ACC2` | `41AtxFZTQSUmdXXK6V79GNLRtfQhCpxHZP5KTMPUckML` | 337 | **gana el creador**. Ambos ganadores tras **2** aceptaciones (tope 8) |
| 2.5 | `A` crea `G_ACCINV` (`0x7cc4…ad77`) invitando a `B`, 1000001 | `BFU7tkr6qmhTcM7oDa3u26hts2EhCCSUFwpypEr8583p` | 372 | `success` |
| 2.5 | `B` acepta `G_ACCINV` | `FnnzEGffcsrRoNJ7RUxHoujeezT9Q6DSzmHL83TEWxk2` | 375 | gana el aceptante |
| 2.6 | `C` acepta `G_ACC1` con `--gas-budget 100000000` | `3CjS2GhFK2MSDmJ4gqucMCM48C5PaBNi4Jj5emGCzMCX` | 382 | fallo ejecutado `game`/4. CLI: "2nd command aborted within function '0x\<PKG\>::game::assert_acceptable' at instruction 75 with code 4" |

**Captura 1:**
```text
nodo http://127.0.0.1:9000, chain id 8e50335e = despliegue
eventos: 7 GameCreated, 2 GameCancelled, 3 GameResolved
simulationErrors: 11 casos
executed: 9 transacciones
escrito contracts/fixtures/game-tx.localnet.json
exit=0
```

**Contenido nuevo de la fixture:**
- **`simulationErrors`:** los 7 de #11 más `acceptSelfPlay` (`A`, `game`/9), `acceptNotInvited` (`C`, `game`/5), `acceptNotPending` (`C`, `game`/4) y `acceptWrongStake` (`B`, `game`/10). Los cuatro abortan en `game::assert_acceptable`.
- **`executed`:** los 5 de #11 más `acceptCreatorWins`, `acceptAcceptorWins`, `acceptInvite` y `acceptNotPendingExecuted`.
- **`ids.games`:** suma `acc1`, `accInvite`, `acceptCreatorWins`, `acceptAcceptorWins` y `acceptInvite`.
- **House:** `fees_collected` vale `"150000"`.
- **`runtimeCancelled`:** no existe (S-5 no la observó).

**Determinismo.** La captura 2, sobre la misma red, la corrí después de todas las sondas:
```text
5c5
<     "capturedAt": "2026-11-04T01:38:19.688Z",
---
>     "capturedAt": "2026-11-04T01:42:53.017Z",
```

**Guarda de URL.** Con una trampa de `fetch` y `net.Socket.connect` precargada, y control positivo contra `127.0.0.1:9` (nunca testnet):
```text
--- control positivo
TRAMPA: fetch http://127.0.0.1:9/
TRAMPA: net.Socket.connect [{"port":9,"host":"127.0.0.1"},null]
exit=0
--- guarda, URL de testnet
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:9000); recibido --url https://fullnode.testnet.sui.io:443. No se hizo ningún pedido.
exit=2
--- guarda, argumento desconocido
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:9000); recibido --url http://127.0.0.1:9000 y argumentos desconocidos: --dry-select. No se hizo ningún pedido.
exit=2
fixture intacta
```

**Abortos del script, sobre datos simulados.** Corrí el script real, sin cambios, con `node --import <scratchpad>/hooks.mjs`. El hook usa `module.registerHooks` y cambia `@mysten/sui/grpc` por una subclase del cliente real que altera las respuestas de la red según el escenario:
```text
=== SCENARIO=control
eventos: 7 GameCreated, 2 GameCancelled, 3 GameResolved
simulationErrors: 11 casos
executed: 9 transacciones
<repo>/app/scripts/capture-tx-fixtures.mjs:44  throw new Error('no se encontró el package.json de @mysten/sui');
exit=1
=== SCENARIO=gcancel-invitacion
Error: no hay una partida G_CANCEL (abierta y cancelada por su creador; una invitación cancelada no sirve) en la red: correr antes las transacciones del handoff (TASK-1)
exit=1
=== SCENARIO=sin-ganador-creador
eventos: 7 GameCreated, 2 GameCancelled, 2 GameResolved
Error: faltan los dos ganadores: no hay una aceptación de una partida abierta que gane el creador: correr antes las transacciones del handoff (TASK-1)
exit=1
=== SCENARIO=sin-ganador-aceptante
eventos: 7 GameCreated, 2 GameCancelled, 1 GameResolved
Error: faltan los dos ganadores: no hay una aceptación de una partida abierta que gane el aceptante: correr antes las transacciones del handoff (TASK-1)
exit=1
```
El control pasa toda la selección y se corta recién en `sdkVersion()`, porque el hook también redirige `import.meta.resolve`: es un efecto del arnés, no del script. Después de las cuatro corridas, `cmp` de la fixture contra la captura 2 da igual byte a byte: ninguna escribió.

**Sondas** (código descartable en `<scratchpad>`, solo gRPC):

| Sonda | Medido | Conclusión |
|---|---|---|
| **S-1** | `build({ client })` del PTB de DL-1 con `setSender(B)` sobre `G_OPEN`: 69, 31 y 33 ms. `commands` = `SplitCoins,MoveCall`. El input `0x8` se resuelve a `SharedObject{initialSharedVersion:"1", mutable:false}`. Los 4 aborts dan `SimulationError` con `executionError` `MoveAbort` en `assert_acceptable` (15-27 ms) | El nodo **sí simula con `Random`**. Sin STOP |
| **S-2** | El mismo PTB con un `splitCoins` después del `accept_game`: `SimulationError` "Error checking transaction input objects: Commands following a command with Random can only be TransferObjects or MergeCoins", sin `executionError`, con `cause` `RpcError` **`INVALID_ARGUMENT`** | Código fuera de `TRANSIENT_RPC_CODES` |
| **S-3** | Firma de la CLI (`suic ptb … --serialize-signed-transaction`, B4) y ejecución de esos bytes por gRPC desde Node, 3 muestras. `executeTransaction`: 806, 490 y 304 ms, con `checkpoint` `null`; `getObject` en ese momento todavía da `Pending`. `waitForTransaction` vuelve a los 1422, 1117 y 617 ms con `checkpoint` (1761, 1806, 1845) y 1 `GameResolved`; entonces `getObject` da `Resolved`. Digests `Ajo3pHsKLkdgucgFNAb9unhDMmASr2V4vmLUahwM9MEf`, `9Y1HKvZRE9wu6eyaSHwKkhPHCvKCEnjrviNtXWyWfnff`, `FDNuRWgS7XgyatFdB7ttdt769Gv3UnWWz7LNZsW2w9h7` | Confirmación en 0,6–1,4 s, muy por debajo de 10 s. Sin STOP |
| **S-4** | Budget de la preflight: **3474748** con una moneda de gas y **4474748** con `B` (2 monedas). La CLI eligió 4462748 en las abiertas y 4462772 en la invitación. `gasUsed` neto: acc1 2474847, acc2 1486946, accInvite 2474871, fallo de `C` 1988397. `balanceChanges`: acc1 `B` −1524846; acc2 `A` +1950002 y `B` −2486947; accInvite `B` −1524870 | **`ACCEPT_GAS_RESERVE_MIST = 10_000_000n` (0,01 SUI)**: 2 × 4474748, redondeado hacia arriba a múltiplos de 0,005 SUI. También cubre el caso sin rebate (1000000 + 6186400 = 7186400) |
| **S-5** | Aceptación lo antes posible tras arrancar, sobre un paquete aparte. Génesis 2: a 5,8 s, `success` (cp 23, `Fd2RtZy6bYG2YoDoMvwetkKQRDGCJij7XRqNZdmHPDtP`). Génesis 1: a 8,2 s, `success` (`FunSFkWBn85pMTrxPXwbyYWsxVEghZADQmNrWchcYv21`) | No se observó la cancelación por aleatoriedad. No hay `runtimeCancelled`; R-3 sigue abierto |
| **S-6** | Literal del handoff, `0x5ca1ab1e` con 5000000 MIST (fondeo `9PSqvhNco2KEQFGYMkw8ENFZKUiTexcLiA1rF9YD9amp`): la preflight **no falla**. S-6 bis: `0x5ca1ab1f` (2000000) y `0x5ca1ab2e` (500000) dan "Unable to perform gas selection due to insufficient SUI balance … required budget 3474748.", sin `executionError`, con `cause` **`INVALID_ARGUMENT`**. `0x5ca1ab3e` (4000000) da "InsufficientCoinBalance in command 0", **con** `executionError` `Unknown` y sin `cause` | Ningún rechazo permanente llega con código transitorio: `isPreflightNetworkCause = isTransientReadError(cause)` no necesita acotarse. Lo decide el MID |

**Cierre del paso 7** (las dos génesis, `26c1d19a` y `8e50335e`):
- `kill` por PID; el exit 144 del arranque es el esperado.
- `kill -0` falla; puertos 9000, 9123, 9184, 5003, 5173, 4173 y 9229 libres; sin procesos `sui`.
- `<SMOKE_DIR>` borrado, y los `signed-*.txt` antes que él.
- No quedan `contracts/deployments/`, `Pub.*.toml` ni `Published.toml`.
- `stat` de `<HOME real>/.sui/sui_config/client.yaml` da `2026-10-30 17:52:52.515735237 -0500 244` y `ls` solo `client.yaml`, igual que en la línea base, antes, entre las génesis y al final.
- `git diff --exit-code -- contracts/Move.lock` da 0.

**Firma con cuentas de la génesis (S-3), las tres condiciones:**
1. Las 5 firmas (3 iniciales; `signed-2` y `signed-3` rehechas) las hizo la CLI bajo el prefijo B4.
2. Ningún proceso de Node leyó `<SMOKE_DIR>/net`: solo `signed-<i>.txt`, `ids.env` y `s5.json`.
3. No se imprimió ninguna clave ni firma.

### Desviaciones del handoff
1. **Dos génesis en vez de una.**
   - Qué cambió: en la primera hice la S-5 con `A` y `B` antes de `G_OPEN`. Eso dejó `createOpen` con `storageRebate` 1975802, y los tests de #11 que usan su costo (`execution.test.ts:235`, `useExecuteTransaction.test.tsx:183`, 3941200 con rebate 0) habrían fallado. Cerré esa red entera con el paso 7 y repetí en serie. En la segunda, la S-5 la hacen `ADMIN` y `E` sobre un paquete aparte (variante A, `--out` y `--pubfile-path` dentro de `<SMOKE_DIR>`).
   - Por qué: `G_OPEN` no se puede deshacer, y el paquete aparte deja los eventos y la House de la S-5 fuera de la captura.
   - Verificación extra: en la corrida válida `createOpen` da 1000000/2941200/0, como en #11.
2. **S-3 sobre el paquete de la S-5.**
   - Por qué: aceptar sobre el paquete de la captura cambia la House y rompe el determinismo entre capturas.
   - Detalle: firmé una transacción por ejecución, porque las firmas hechas de antemano compartían la versión de la moneda de gas.
3. **S-6 bis.** Con 5000000 la preflight no falla, así que no respondía la pregunta de DL-10.
   - Agregué tres direcciones sin claves: `0x5ca1ab1f`, `0x5ca1ab2e` y `0x5ca1ab3e`.
   - Las fondeó la CLI desde `A`, después de la captura 1: `A5ikyNUXd8izFqiNCLfRBqm7qjG5tkiyFZhrPZQhyek8`, `8K9UFFzqn4VXLHHcoRgpKBwppCYxrjXHV3AZsujwcm9a`, `CjK6We6YD3JwSerqDbCTvtjFgCWYQNA7S77EgnPRGd5d`.
   - La captura 2 sigue igual salvo `capturedAt`.
4. **Toqué 2 tests de `app/src/`**, aunque §4 lo pone en "NO tocar". Me apoyé en TASK-1 §3.4: "si alguno depende de un valor concreto de la captura vieja, se ajusta para leerlo de la fixture y se declara".
   - `errors.test.ts:95` exigía que `simulationErrors` tuviera exactamente los 7 casos de #11. Ahora exige que los contenga (`expect.arrayContaining`). En TASK-2 (T2-6) puede volver a la igualdad exacta al sumar los 4 casos de aceptar a `CASES`.
   - `house.test.ts:53` esperaba `feesCollected: 0n`. Ahora usa `BigInt(HOUSE.json.fees_collected)`, el `json` del nodo. Sumé `json` al tipo `FixtureHouse` y cambié el nombre del test.
   - Verificación: siguen siendo 630 tests.
5. **Prueba de abortos con hooks de módulos, no con `--dry-select`.** La guarda compartida, que no se toca, rechaza cualquier argumento que no sea `--url`.
6. **Chequeos extra en el script.** Además de cuatro roles distintos, verifica que `A` cree todas las partidas y que `B` sea el que acepta.
7. **`ids.games` con IDs repetidos.** `accInvite` y `acceptInvite` son la misma partida, y en esta captura `acc1` coincide con `acceptAcceptorWins`. Dejé las claves que pide el handoff.
8. **Montos de `G_CANCEL` y `G_REJ`:** 3000003 y 4000004, como en #11, porque los tests de #11 los esperan.

### Riesgos / pendientes
- **DL-10:** el criterio no necesita acotarse. Ojo: con la reserva de 0,01 SUI, la app marcará `insufficient` un saldo de 5000000 que el nodo sí aceptaría. El texto no debería decir que no alcanza para el gas.
- **TASK-2:** los aborts de aceptar se ubican en `game::assert_acceptable`, no en `accept_game`. El mapeo por módulo y código no cambia.
- **R-3:** no se observó la cancelación por aleatoriedad.
- **Reserva de gas:** medida con precio de gas 1000; revisar en #17.
- **`app/README.md:284`:** sigue diciendo "7 `SimulationError` … 5 transacciones ejecutadas" (ahora son 11 y 9). No está entre los archivos a tocar de TASK-1, así que queda para TASK-5.

### Documentación
- **`contracts/README.md`:** actualizado con la fila de la fixture, el contenido nuevo, los roles, `G_CANCEL` abierta, `runtimeCancelled` opcional, y la lista ordenada de las 7 transacciones previas a la recaptura con la selección y los abortos.
- **`agents.md`:** no aplica.
- **Snippet propuesto para `documents/STATUS.md`:** `| localnet aislada @ feature/issue-12-accept-resolve (TASK-1 de #12), CLI 1.83.0, 2026-11-03 | recaptura de contracts/fixtures/game-tx.localnet.json + sondas | 🟢 chain 8e50335e: 11 simulationErrors (+game/9, 5, 4, 10 en assert_acceptable) y 9 executed (+gana creador, gana aceptante, invitación, fallo game/4); determinista. El nodo simula con Random (S-1); confirmación por el camino de la wallet 0,6-1,4 s (S-3); budget 3474748-4474748 MIST ⇒ reserva 0,01 SUI (S-4); sin cancelación por aleatoriedad a 5,8 s del arranque (S-5); rechazos permanentes con INVALID_ARGUMENT o executionError (S-2, S-6). App 630/46 y contracts 83/99 sin delta |`

## Revisión TASK-1: PASA

> MID, 2026-11-03. Revisé el diff real del árbol sobre `7839dfc` (5 archivos: `app/scripts/capture-tx-fixtures.mjs`,
> `contracts/fixtures/game-tx.localnet.json`, `contracts/README.md`, `app/src/sui/errors.test.ts`,
> `app/src/sui/house.test.ts`) y el JSON de la fixture recapturada. No corrí gates (D-20261030-02): verifico el output
> pegado.

**Checklist (`FLUJO_AGENTES.md` §5):**
- **Implementa lo pedido:** sí.
  - **Transacciones:** las 7 por CLI, en el orden de §3.2, con los dos ganadores en 2 aceptaciones.
  - **Script:** `G_CANCEL` exige `opponent === null` (MINOR-8 del plan). `G_ACC1` es la primera abierta resuelta. `acceptNotPendingExecuted` sale del `previousTransaction` de `G_ACC1` y se verifica que sea `MoveAbort` `game`/4. El rol `C` sale de su `sender` y no se escribe. Hay cuatro roles distintos, y además chequea que `A` cree todas las partidas y que `B` sea quien acepta.
  - **`acceptTx`:** tiene la forma de DL-1, con `tx.object.random()` como último comando.
  - **Fixture:** 11 `simulationErrors` y 9 `executed`.
  - **`contracts/README.md`:** fila de la fixture, contenido, roles y recaptura en orden, con la condición de que `createOpen` sea la primera transacción de `A`.
- **Fixture (SEG-3):** recorrí el JSON entero. Los únicos `sender` son 11 roles (`A`×5, `B`×3, `C`×2, `ADMIN`×1). No hay `signature(s)`, `publicKey`, `suiprivkey` ni `mnemonic`.
  - Los cuatro aborts de aceptar dan `game`/9, 5, 4 y 10, con `functionName` `assert_acceptable`.
  - Las tres aceptaciones son `Transaction` con un evento cada una.
  - El fallo ejecutado es `FailedTransaction` sin eventos.
  - `fees_collected` = 150000 (3 × 50000).
  - Los hex de 64 son IDs y direcciones de la génesis desechable, como en #10/#11.
- **Determinismo y guarda:** dos capturas solo difieren en `capturedAt`. Con la URL de testnet, exit 2 sin pedidos; la trampa de `fetch`/`net.Socket.connect` tiene control positivo contra `127.0.0.1:9`. Los abortos del script están probados con hooks de módulos (Desviación 5, correcta: la guarda rechaza `--dry-select`).
- **Gates:** sin delta.
  - Baseline: 630/46, lint 0, typecheck 0, build 877,90 kB; 83 Move, 99 `node --test`, "0 despliegues", `Move.lock` sin delta.
  - Final: idénticos.
  - `game-reads.localnet.json` y `package*.json` sin delta.
- **Localnet y B4:**
  - Las dos génesis corrieron en serie, cada una con su cierre del paso 7.
  - `~/.sui/sui_config/` quedó idéntico a la línea base (antes, entre las génesis y al final).
  - Puertos libres, `<SMOKE_DIR>` borrado y sin `deployments/` ni `Pub.*.toml`.
  - La firma de S-3 cumple las tres condiciones de §3.
- **Reporte (LIM, placeholders):** sin rutas personales ni hex largos (solo digests y IDs abreviados). Las desviaciones están declaradas con motivo y verificación.

**Desviaciones:**

| # | Evaluación |
|---|---|
| 1 (dos génesis) | **Aceptada.** `G_OPEN` no se puede deshacer y la S-5 previa contaminaba el `storageRebate` de `createOpen`, del que dependen tests de #11. Cerrar la red y repetir es lo correcto; la corrida válida da 1000000/2941200/0 como en #11. Variante A para el paquete de la S-5, con `--out` dentro de `<SMOKE_DIR>`, permitida por `agents.md` §3 |
| 2 (S-3 sobre el paquete de la S-5) | **Aceptada:** preserva el determinismo de la captura |
| 3 (S-6 bis) | **Aceptada y útil:** sin ella, S-6 no respondía DL-10 (con 5000000 la preflight no falla). Las tres direcciones nuevas no tienen claves, y la captura 2 no cambió |
| 4 (2 tests de `app/src/`) | **Aceptada.** La contradicción entre §3.4 y §4 era del handoff (la corrige v1.3). Los cambios son mínimos y leen la fixture. `errors.test.ts` vuelve a la igualdad exacta en TASK-2 (T2-6, v1.3) |
| 5-8 | **Aceptadas.** `ids.games` con claves repetidas: se dejan las del handoff; los tests usan cada clave con su sentido |

**Hallazgos:**

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| N-1 | LIM-1, LIM-11 | `app/src/sui/errors.test.ts:94-95` | El test se llama "has the 7 captured cases" pero ahora comprueba `arrayContaining` | En TASK-2 (T2-6, v1.3): `toEqual` exacto con los 11 casos y el nombre "has the 11 captured cases". No bloquea TASK-1 |
| N-2 | LIM-11 | `app/src/sui/house.test.ts:59` | El oráculo de `feesCollected` es el `json` del nodo. Es un control cruzado BCS↔JSON válido, pero no fija el valor esperado de la captura (150000 = 3 × 50000) | Opcional, en TASK-2: `150_000n` con un comentario de por qué. No bloquea |

**Lo medido y su efecto en el handoff (v1.3, escrita en este ciclo):**
- **DL-10:** queda `isPreflightNetworkCause = isTransientReadError(cause)`.
  - S-2 (regla de comandos tras `Random`) y S-6 bis (selección de gas) llegan con `INVALID_ARGUMENT`.
  - `InsufficientCoinBalance` llega con `executionError` `Unknown`.
  - Ningún rechazo permanente cae en `TRANSIENT_RPC_CODES`.
  - T2-7, T2-8 y T3-14 suman esos casos reales.
- **Reserva:** `ACCEPT_GAS_RESERVE_MIST = 10_000_000n`, aceptada (2 × 4474748, redondeado hacia arriba a 0,005 SUI).
  - Riesgo aceptado: una ventana ≤ 0,0055 SUI en la que la app marca "insuficiente" un saldo que el nodo aceptaría. Es la misma cortesía que asume crear (`CREATE_GAS_RESERVE_MIST`).
  - El texto pasa a "≈ 0.01 SUI de reserva para el gas" (TASK-4 y paso 6 del smoke).
  - Medida con precio de gas 1000; se revisa en #17.
- **T2-6:** aborts en `assert_acceptable`; el mapeo por módulo y código no cambia.
- **R-3:** sigue abierto, sin `runtimeCancelled`. DL-11 conserva las dos formas de texto y el plan B del paso 7 del smoke.
- **TASK-5:** se suma la actualización de "Fixtures de lectura" en `app/README.md` (11 simulaciones, 9 ejecutadas).

### Siguiente paso
TASK-2 autorizado con `HANDOFF_ACCEPT` v1.3.

### Mensajes de commit propuestos
1. Código y fixture: `app/scripts/capture-tx-fixtures.mjs`, `contracts/fixtures/game-tx.localnet.json`, `contracts/README.md`, `app/src/sui/errors.test.ts`, `app/src/sui/house.test.ts`.
   ```
   contracts: recapture tx fixtures with real accept cases (#12)

   Adds the four accept simulation aborts (game/9, 5, 4, 10), both coinflip
   outcomes, an accepted invitation and an executed game/4 failure, with role C
   taken from that failure. G_CANCEL must be an open game. Two #11 tests read the
   recaptured values from the fixture.
   ```
2. Docs: `documents/REPORTES_ACCEPT.md` y `documents/HANDOFF_ACCEPT.md`.
   ```
   docs: add #12 TASK-1 report and MID review, handoff v1.3 (#12)
   ```

### Snippet para STATUS.md
El que propone el DEV, sin cambios.

## Task completado: HANDOFF_ACCEPT (v1.3) — TASK-2 (capa pura de aceptar y ajustes de la maquinaria)

### Branch (con SHA corto del HEAD)
`feature/issue-12-accept-resolve` @ `b6177ae`. Sin commits del DEV; los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- **Código (`app/src/sui/`):**
  - `transactions/game.ts`: `buildAcceptGameTx`; `moveTarget` admite `'accept_game'`.
  - `gameTx.ts`: `parseResolvedGame`.
  - `gameActions.ts`: `AcceptState`, `acceptState` y `NOT_INVITED_HINT`.
  - `acceptGame.ts` (nuevo): `ACCEPT_GAS_RESERVE_MIST`, `acceptBalanceCheck`, `wonBy` y `playerResult`.
  - `errors.ts`: `RUNTIME_CANCELLED_MESSAGES`, `runtimeCancellation` y el orden nuevo de `transactionErrorMessage`.
  - `execution.ts`: `isPreflightNetworkCause` y la regla de DL-10 en `preflightTransaction`.
- **Tests:**
  - `transactions/game.test.ts` (T2-1).
  - `gameTx.test.ts` (T2-2).
  - `gameActions.test.ts` (T2-3, T2-4).
  - `acceptGame.test.ts` (nuevo, T2-5).
  - `errors.test.ts` (T2-6, T2-7, N-1).
  - `execution.test.ts` (T2-8).
  - `house.test.ts` (N-2).
- **Docs:** `documents/STATUS.md` suma la fila de TASK-1, tal cual la propuso el DEV. También esta sección.

### Qué se implementó (3 líneas máx)
Se agregaron el PTB de aceptar (el `MoveCall` con `Random` va último), el parser del `GameResolved` propio y las reglas de visibilidad (`acceptState`) y de saldo (reserva de 0,01 SUI), con el resultado para el jugador.
También los textos de las cancelaciones del runtime (DL-11) y la corrección de DL-10: un `SimulationError` sin `executionError` cuyo `cause` es un corte de red pasa a `PreflightNetworkError`.
No hay red, React ni `any`. Los textos nuevos de `errors.ts` están solo en `RUNTIME_CANCELLED_MESSAGES`.

### Tests y gates (output pegado, por área tocada)
- **Agregados o modificados (+58 tests; de 630 en 46 archivos a 688 en 47):**
  - `transactions/game.test.ts`: 15 → 23. T2-1: comandos `[SplitCoins(GasCoin, [Input 0 pure]), MoveCall]` con el `MoveCall` último; argumentos `[Input 1, Input 2, NestedResult [0,0], Input 3]`; `Random` = `UnresolvedObject` `normalizeSuiObjectId(SUI_RANDOM_OBJECT_ID)` con `mutable: false`; Game y House sin resolver; `bet` = `U64_MAX`; lanza con `packageId`, `houseId` o `gameId` inválidos, con `bet` 0 y con `bet` = `U64_MAX + 1`.
  - `gameTx.test.ts`: 7 → 14. T2-2: `acceptCreatorWins`, `acceptAcceptorWins` y `acceptInvite` reales dan ganador, `pot` 2000002, `fee` 50000 y `payout` 1950002; el aceptante también se reconoce en otro formato. Dan `null`: sin eventos, con dos `GameResolved`, con otra partida, con otro aceptante, con otro tipo de paquete, con otro `originalPackageId`, con BCS truncado y con una transacción de crear.
  - `gameActions.test.ts`: 11 → 19. T2-3 y T2-4: el orden de M-3, con `not_pending` probado con y sin cuenta, para abierta e invitación y para las 4 cuentas posibles. Además `NOT_INVITED_HINT === ABORT_MESSAGES.game[5]` y su texto.
  - `acceptGame.test.ts`: 10, archivo nuevo. T2-5.
  - `errors.test.ts`: 50 → 70.
    - T2-6: `CASES` suma los 4 de aceptar. El test de la lista vuelve a igualdad exacta y se llama "has the 11 captured cases" (N-1). Los 4 se ubican en `assert_acceptable`. `acceptNotInvited` da `game`/5 con su texto (D-20261103-02). `acceptNotPendingExecuted` da `game`/4 por gRPC y por `extractStatusFromEffectsBcs`.
    - T2-7: congestión; aleatoriedad por el nombre de la variante y por el texto Rust en mayúsculas; el mismo texto para un fallo de crear y uno de aceptar (resultados reales de la fixture con el estado reemplazado); `InsufficientCoinBalance` de S-6 bis no es una cancelación y da "La red no ejecutó…"; un abort propio en la cadena de `cause` gana sobre todo.
  - `execution.test.ts`: 20 → 25. T2-8: un `SimulationError` que envuelve un `RpcError` `UNAVAILABLE` da `PreflightNetworkError`, con `cause` = el `SimulationError`. Los dos rechazos medidos (S-2 y S-6 bis, mensajes reales con `INVALID_ARGUMENT`) salen tal cual, igual que el que no tiene `cause` y el que tiene `executionError` aunque traiga un `cause` transitorio. `isPreflightNetworkCause` tiene su prueba unitaria.
  - `house.test.ts`: 13, igual que antes. N-2: `feesCollected: 150_000n`; se quita el campo `json` del tipo, que había agregado TASK-1 y quedó sin uso.
- **Fix con test primero (DL-10, corrección de la máquina de #11):** con el `execution.ts` de `HEAD` (y un `isPreflightNetworkCause` vacío para que compile), fallan `turns a SimulationError that wraps a transient RpcError (UNAVAILABLE) into PreflightNetworkError (V-3)` y el de `isPreflightNetworkCause`: 2 failed, 23 passed. Con el cambio pasan 25 de 25.
- **Contracts:** no aplica (no se tocó `contracts/`).
- **App** (forma canónica de `agents.md` §3, desde `<repo>`, Node 26):

```text
v26.13.0
added 293 packages, and audited 295 packages in 13s
67 packages are looking for funding
  run `npm fund` for details
11 moderate severity vulnerabilities
To address all issues (including breaking changes), run:
  npm audit fix --force
Run `npm audit` for details.
exit=0
audited 292 packages in 13s
292 packages have verified registry signatures
143 packages have verified attestations
(use --json --include-attestations to view attestation details)
exit=0
found 0 vulnerabilities
exit=0
> lint
> eslint . --max-warnings 0
exit=0
> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json
exit=0
> test
> vitest run
 RUN  v5.0.5 <repo>/app
 Test Files  47 passed (47)
      Tests  688 passed (688)
   Start at  21:04:42
   Duration  16.30s (environment 64%, setup 10%, import 10%, tests 10%, transform 6%, worker 1%)
exit=0
> build
> vite build
vite v8.3.5 building client environment for production...
transforming...
✓ 584 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Dhz2ta6u.js   878.63 kB │ gzip: 267.72 kB
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 671ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/sui/errors.test.ts
 M app/src/sui/errors.ts
 M app/src/sui/execution.test.ts
 M app/src/sui/execution.ts
 M app/src/sui/gameActions.test.ts
 M app/src/sui/gameActions.ts
 M app/src/sui/gameTx.test.ts
 M app/src/sui/gameTx.ts
 M app/src/sui/house.test.ts
 M app/src/sui/transactions/game.test.ts
 M app/src/sui/transactions/game.ts
 M documents/STATUS.md
?? app/src/sui/acceptGame.test.ts
?? app/src/sui/acceptGame.ts
```

- **Delta contra el último reporte aprobado (TASK-1):** +58 tests y +1 archivo. El build pasa de 877.90 a 878.63 kB (de 267.47 a 267.72 kB gzip): entran el builder de aceptar y los textos nuevos. Lint, typecheck, `npm ci` y auditorías, sin cambios.
- **Alcance:** `git diff --exit-code` sobre `package.json`, `app/package.json`, `package-lock.json`, `contracts/`, `app/src/hooks`, `app/src/components`, `app/src/pages`, `config.ts` y `readPolicy.ts` da exit 0.
- **Greps** (diff completo más los dos archivos nuevos):
  - Claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key|seed phrase`): vacío.
  - Rutas personales: vacío.
  - Hex de 40-64: vacío (los IDs de test se arman con `'a'.repeat(64)`).
  - `any` y `console`: vacío.
- **Tablas de contrato y `app/src/sui/`:** no aplica (no cambia el contrato; `ABORT_MESSAGES` sin cambios).

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: es una capa pura (TASK-2 §6). No se levantó ninguna localnet ni se hizo nada contra testnet; los datos reales salen de la fixture de TASK-1.

### Desviaciones del handoff
1. **Cambió un test existente de `errors.test.ts`.**
   - Qué cambió: `transactionErrorMessage > reports a failure without abort as the network not executing it` tenía como casos `Unknown` `ExecutionCancelledDueToRandomnessUnavailable` y `CongestedObjects`, con la expectativa "La red no ejecutó…". DL-11 cambia a propósito ese comportamiento, así que esos dos casos pasan a T2-7 con sus textos nuevos. En el `it.each` quedan dos `Unknown` genéricos: `InsufficientCoinBalance in command 0` (el medido en S-6 bis) e `InsufficientGas`. La aserción no cambia.
   - Por qué: el comportamiento nuevo lo pide el handoff (DL-11 y T2-7). Sin el cambio, el test fallaba con el texto viejo.
   - Verificación extra: 70 de 70 en `errors.test.ts`.
2. **`house.test.ts` (N-2, opcional) no figura en la lista de archivos a tocar de TASK-2.** Lo pidió el orquestador como nit del MID. Usa `150_000n` literal con un comentario que lo explica (3 aceptaciones × 50000 de la captura de #12) y quita el campo `json` de `FixtureHouse`, que quedó sin uso. Una recaptura con otro número de aceptaciones exige actualizar ese literal.
3. **`NOT_INVITED_HINT = ABORT_MESSAGES.game[5] ?? ''`.** Con `noUncheckedIndexedAccess`, el índice tiene tipo `string | undefined`. El `?? ''` evita duplicar el texto, y el test fija el valor exacto ("Esta invitación es para otra dirección."), así que una vacía no pasa.
4. **`runtimeCancelled`:** no hay caso real en la fixture (S-5 no la observó). T2-7 cubre las dos formas de V-6 con datos armados, como prevé el handoff ("si existe").

### Riesgos / pendientes
- **`gameActions.ts` ahora importa `errors.ts`** (para `NOT_INVITED_HINT`). No hay ciclo: `errors.ts` solo importa `format.ts`.
- **El literal de N-2 (`150_000n`)** queda atado a la captura actual.
- **`runtimeCancellation` reconoce solo errores estructurados** (`findExecutionError`). Si una wallet de extensión serializa el error y solo deja el texto, una cancelación del runtime cae en "La wallet no completó la operación: …". El handoff no pide reconocerla por texto; lo anoto para el smoke (plan B del paso 7).
- **TASK-3/TASK-4:** consumen `buildAcceptGameTx`, `parseResolvedGame`, `acceptState`, `acceptBalanceCheck` y `playerResult` con las firmas de §4, sin cambios.

### Documentación
- **READMEs y `agents.md`:** no aplica en este task. El mapa de `app/src/sui/` en `app/README.md` suma `acceptGame.ts` en TASK-5, según el handoff.
- **`documents/STATUS.md`:** se agregó la fila de TASK-1 tal cual el snippet del reporte de TASK-1, primera fila de "Baselines de gates".
- **Snippet propuesto para `documents/STATUS.md`** (TASK-2): `| app @ feature/issue-12-accept-resolve (TASK-2 de #12), Node v26.13.0, 2026-11-03 | npm run lint / typecheck / npm test / build (VITE_SUI_NETWORK=testnet) | 🟢 exit 0. 0 problemas / 0 errores / **688 tests PASS en 47 archivos** (+58: transactions/game 23, gameTx 14, gameActions 19, acceptGame 10 nuevo, errors 70, execution 25) / index-*.js 878.63 kB (267.72 kB gzip). Capa pura de aceptar (PTB con Random último, GameResolved propio, acceptState, reserva 0,01 SUI), cancelaciones del runtime (DL-11) y SimulationError de red ⇒ PreflightNetworkError (DL-10) |`

## Revisión TASK-2: PASA

> MID, 2026-11-03. Revisé el diff real sobre `b6177ae`: 11 archivos modificados de `app/src/sui/`, más `acceptGame.ts` y
> `acceptGame.test.ts` nuevos y `documents/STATUS.md`. No corrí gates (D-20261030-02): verifico el output pegado.

**Checklist (`FLUJO_AGENTES.md` §5):**
- **Implementa lo pedido (TASK-2 §3, v1.3):**
  - **`buildAcceptGameTx`:** valida los tres IDs y `bet` en `1..U64_MAX`. El PTB es `splitCoins(gas, [bet])` + `accept_game(game, house, coin, tx.object.random())`, sin comandos después. El JSDoc explica la regla de `Random`.
  - **`parseResolvedGame`:** se queda con el único `GameResolved` de la partida, con un parser exacto y `sameAddress` para `gameId` y `acceptor`.
  - **`acceptState`:** sigue el orden de M-3, con `not_pending` antes de `no_account`. `NOT_INVITED_HINT` = `ABORT_MESSAGES.game[5]`.
  - **`acceptGame.ts`:** la reserva vale `10_000_000n` y su JSDoc cita S-4, el margen, la cortesía y #17. También están `acceptBalanceCheck`, `wonBy` y `playerResult`, con `sameAddress`.
  - **`runtimeCancellation` y el orden de `transactionErrorMessage`:** abort propio → cancelación → genérico. `RUNTIME_CANCELLED_MESSAGES` tiene los textos exactos de la v1.3.
  - **DL-10:** `isPreflightNetworkCause = isTransientReadError(cause)`; el envoltorio se aplica solo sin `executionError`.
- **Capas y tipado (ARQ-1, PROY-12, PROY-13):** sin React, red ni `any`, con montos en `bigint`. `gameActions.ts → errors.ts → format.ts`: sin ciclo (ARQ-5). El diff no toca `hooks/`, `components/`, `pages/`, `config.ts`, `readPolicy.ts`, `contracts/` ni `package*.json` (`git diff --exit-code` pegado).
- **Tests (LIM-11):** T2-1..T2-8 cubiertos, con datos reales de la fixture.
  - Builder: el `MoveCall` es el último comando; `Random` va como `UnresolvedObject` `0x8` `mutable: false`; los rechazos y el límite `U64_MAX`.
  - Parser: los tres reales, y siete casos que dan `null`.
  - `acceptState`: incluye `not_pending` con y sin cuenta (M-3).
  - Los 4 `SimulationError` de aceptar se ubican en `assert_acceptable`. El test de la lista vuelve a la igualdad exacta con 11 casos (N-1).
  - Fallo ejecutado por los dos caminos.
  - DL-11 con las dos formas, igual para crear y para aceptar, y con `InsufficientCoinBalance` como "no es cancelación".
  - DL-10 con el envoltorio real `UNAVAILABLE` y con los dos rechazos medidos (`INVALID_ARGUMENT`).
  - Fix con el test primero: con el `execution.ts` de `HEAD`, 2 tests fallaban. Bien.
- **Gates:** npm ci y auditorías en 0, lint 0, typecheck 0, **688 tests en 47 archivos** (+58: `transactions/game` 23, `gameTx` 14, `gameActions` 19, `acceptGame` 10, `errors` 70, `execution` 25) y build de 878,63 kB (+0,73 kB). Sin rojos.
- **Seguridad y limpieza:** sin secretos, rutas personales ni hex largos (los IDs de test salen de `'a'.repeat(64)`), sin `console` y sin código muerto. El campo `json` de `FixtureHouse`, que quedó sin uso, se quitó (N-2).

**Desviaciones:**

| # | Evaluación |
|---|---|
| 1 (test existente de `errors.test.ts`) | **Aceptada.** DL-11 cambia a propósito el texto de la aleatoriedad y de la congestión. Esos dos casos pasan a T2-7 con sus textos nuevos, y el `it.each` original sigue con dos `Unknown` genéricos sin cambiar la aserción |
| 2 (`house.test.ts`, N-2) | **Aceptada.** Era el nit opcional de la revisión de TASK-1. El literal `150_000n` lleva su comentario; al recapturar con otro número de aceptaciones se actualiza junto con la fixture |
| 3 (`?? ''` en `NOT_INVITED_HINT`) | **Aceptada.** Lo exige `noUncheckedIndexedAccess`. El test fija el texto exacto, así que una cadena vacía no pasa |
| 4 (sin `runtimeCancelled` real) | **Aceptada.** El handoff lo prevé ("si existe"); R-3 sigue abierto |

**Riesgo declarado (`runtimeCancellation` solo reconoce errores estructurados):** aceptado, sin cambios.
- Una cancelación del runtime ocurre al ejecutar, así que la transacción tiene efectos y digest. La app confirma con el nodo y clasifica el `status.error` estructurado de esa lectura (DL-2), no el texto de la wallet.
- Solo una wallet que lanzara **sin** digest ante una cancelación caería en "La wallet no completó…". Esa wallet ocultaría una transacción ejecutada, y eso no es comportamiento del kit.
- Queda anotado para #17, con una wallet de extensión real.

**Hallazgos:**

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| N-1 | PROY-20 (formato) | `documents/STATUS.md:40` | La fila de TASK-1 no sigue el formato de las otras filas de "Baselines de gates": la ref y el chain id van sin backticks (`feature/issue-12-accept-resolve`, `8e50335e`) y los conteos sin negrita | En TASK-5, al actualizar STATUS con la fila de #12, alinear el formato. No bloquea |

### Siguiente paso
TASK-3 (máquina global sobre crear, cancelar y rechazar) autorizado con `HANDOFF_ACCEPT` v1.3. Lo que consume de TASK-2 (`isPreflightNetworkCause`, `PREPARE_FAILED_PREFIX` y los mensajes reales de S-6 bis para T3-14) está disponible con las firmas de §4.

### Mensajes de commit propuestos
1. Código: `app/src/sui/` (11 modificados y 2 nuevos).
   ```
   app: add the pure accept layer and runtime cancellation texts (#12)

   buildAcceptGameTx puts the MoveCall with Random last; parseResolvedGame reads
   the single own GameResolved; acceptState, NOT_INVITED_HINT and acceptGame.ts
   hold visibility, the 0.01 SUI reserve and the player result. Runtime
   cancellations get an action-neutral retry text, and a SimulationError that
   only wraps a transient RpcError becomes PreflightNetworkError (fix of the #11
   preflight, V-3).
   ```
2. Docs: `documents/REPORTES_ACCEPT.md` y `documents/STATUS.md`.
   ```
   docs: add #12 TASK-2 report and MID review (#12)
   ```

### Snippet para STATUS.md
El que propone el DEV para TASK-2, sin cambios (con el formato de N-1 cuando TASK-5 alinee la tabla).
