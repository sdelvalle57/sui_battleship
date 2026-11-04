# REPORTES_MY_GAMES
> Issue: #13 | Plan: PLAN_MY_GAMES v2 | Handoff: HANDOFF_MY_GAMES v1.1 (TASK-1 sin cambios desde la v1) | Branch: `feature/issue-13-my-games`

## TASK-1

## Task completado: HANDOFF_MY_GAMES — TASK-1 (sondas en localnet aislada)

### Branch (con SHA corto del HEAD)
`feature/issue-13-my-games` @ `928bb60`, sin commits del DEV. El único cambio del árbol es este archivo.

### Archivos modificados/creados
- `documents/REPORTES_MY_GAMES.md` (nuevo): este reporte.
- Ningún archivo de código ni de config del repo. Los scripts de las sondas quedaron en `<scratchpad>` y no se commitean.

### Qué se implementó (3 líneas máx)
Verifiqué el baseline con el gate completo (app + contracts) y coincide con §0. Levanté la localnet aislada, publiqué en la variante B y puse `update_fee_rate` en 250.
Corrí las transacciones de §3.3, incluido el PTB de 12 partidas de `C`, y las sondas S-1..S-4 por gRPC: las cuatro dan lo esperado. **Sin STOP**: el nodo local filtra por remitente, y la paginación con el cursor dentro de una transacción no repite ni pierde eventos.
El cierre del paso 7 quedó limpio y el gate final no tiene delta.

### Tests y gates (output pegado, por área tocada)
- **Tests agregados o modificados:** ninguno (el task no tiene código).
- **Contracts:**
  - `sui 1.83.0-16d2dc1e05ed`;
  - build con 0 warnings y `--lint` con 0 lints;
  - 83 tests PASS, `node --test` 99 PASS y `check` "0 despliegues";
  - `Move.lock` sin delta;
  - las listas ordenadas de nombres de test Move y de `node --test` son iguales en el baseline y en el final.
- **App:**
  - `npm ci` exit 0 (293 paquetes), 292 firmas verificadas;
  - 0 vulnerabilidades de producción (las 11 *moderate* de dev son las de #35);
  - lint 0 y typecheck 0;
  - **755 PASS en 52 archivos**;
  - build `index-CTgzBU_I.js` **887.10 kB** (270.12 kB gzip), con el aviso informativo de chunk > 500 kB (#15).
- **Delta contra el baseline de §0:** ninguno.
- **Tablas de contrato (`contracts/README.md`) y `app/src/sui/`:** no aplica.

**Verificación del baseline** (primer paso, antes de tocar nada):
- El job `app` corrió sobre `b1b62f1` mientras el MID editaba `documents/HANDOFF_MY_GAMES.md` (v1.1); el MID lo commiteó como `928bb60` durante el gate (Desviación 1).
- El job `contracts` corrió sobre `928bb60`.
```text
v26.13.0
11.20.0
b1b62f1

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 10s

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


 Test Files  52 passed (52)
      Tests  755 passed (755)
   Start at  23:21:38
   Duration  17.03s (environment 66%, tests 12%, import 10%, setup 10%, transform 1%, worker 1%)

Environment  jsdom was created 52 times · 105.01s total, 66% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 589 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-CTgzBU_I.js   887.10 kB │ gzip: 270.12 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 628ms
exit=0
--- git status --porcelain --untracked-files=all
 M documents/HANDOFF_MY_GAMES.md        ← edición del MID (v1.1), commiteada como 928bb60 segundos después

--- contracts (desde <repo>/contracts, forma canónica)
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
(83 líneas [ PASS ], las mismas que en el gate final de abajo)
Test result: OK. Total tests: 83; passed: 83; failed: 0
exit=0
(99 líneas ✔, las mismas que en el gate final de abajo)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 303.885503
exit=0
0 despliegues
exit=0
exit=0
```
El primer `npm test` del baseline lo corrí con `| tail -8`, que cortó la línea "Test Files". Lo repetí entero enseguida y es el que va arriba: 52/52 y 755/755, igual que la primera corrida.

**Gate final, job `app`** (sobre `928bb60`, después del cierre de la localnet):
```text
v26.13.0

added 293 packages, and audited 295 packages in 12s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 12s

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


 Test Files  52 passed (52)
      Tests  755 passed (755)
   Start at  23:28:32
   Duration  17.59s (environment 63%, tests 12%, import 10%, setup 10%, transform 5%, worker 1%)

Environment  jsdom was created 52 times · 103.67s total, 63% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 589 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-CTgzBU_I.js   887.10 kB │ gzip: 270.12 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 587ms
exit=0
--- git status --porcelain --untracked-files=all
```
(vacío)

**Gate final, job `contracts`** (desde `<repo>/contracts`, forma canónica; sin los tiempos por test de `node --test`):
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
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
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
✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real
✔ parsePublishOutput no depende de la posición en objectChanges
✔ parsePublishOutput rechaza una transacción que no terminó en success
✔ parsePublishOutput rechaza una salida sin objeto published
✔ parsePublishOutput rechaza dos Houses creadas
✔ parsePublishOutput rechaza una salida sin HouseCap
✔ parsePublishOutput rechaza una salida sin UpgradeCap
✔ parsePublishOutput rechaza una House de otro paquete
✔ parsePublishOutput rechaza una House no compartida
✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs
✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto
✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta
✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture
✔ validateDeployment: falta schemaVersion
✔ validateDeployment: falta network
✔ validateDeployment: falta chainId
✔ validateDeployment: falta packageId
✔ validateDeployment: falta originalPackageId
✔ validateDeployment: falta packageVersion
✔ validateDeployment: falta upgradeCapId
✔ validateDeployment: falta houseId
✔ validateDeployment: falta houseCapId
✔ validateDeployment: falta publishTxDigest
✔ validateDeployment: falta publishTimestamp
✔ validateDeployment: falta sourceCommit
✔ validateDeployment: falta suiCliVersion
✔ validateDeployment: falta frameworkRev
✔ validateDeployment rechaza: clave desconocida
✔ validateDeployment rechaza: ID corto
✔ validateDeployment rechaza: ID en mayúsculas
✔ validateDeployment rechaza: testnet con chain id ajeno
✔ validateDeployment rechaza: localnet con el chain id de testnet
✔ validateDeployment rechaza: localnet con el chain id de mainnet
✔ validateDeployment rechaza: sourceCommit null en testnet
✔ validateDeployment rechaza: network mainnet
✔ validateDeployment rechaza: publishTimestamp sin milisegundos
✔ validateDeployment rechaza: publishTimestamp sin Z
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error
✔ parsePublishedToml lee cada campo del fixture real
✔ parsePublishedToml rechaza una línea inesperada con su número
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado
✔ runSui invoca cada vector permitido
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca
✔ runSui no invoca sin un configDir validado
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/
✔ parseCliArgs: subcomandos y opciones válidos
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI)
✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet
✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath
✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id
✔ checkNetworkGuard: chain id según la red
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier
✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto
✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones
✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml
✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error
✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok
✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta
✔ confirmación: ninguna variable de entorno la omite
✔ resolveRecordMeta: usa meta.json si existe
✔ resolveRecordMeta: sin meta.json exige los flags
✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error
✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues
✔ checkDeployments: localnet válido sin entrada en Published.toml
✔ checkDeployments: testnet sin Published.toml ⇒ error
✔ checkDeployments: entrada de Published.toml sin json ⇒ error
✔ checkDeployments: nombre de archivo distinto de network ⇒ error
✔ checkDeployments: json inválido ⇒ error
✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error
✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3)
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos
✔ formatSummary: los 14 campos y el siguiente paso, sin direcciones de cuentas
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar
✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra
✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo
✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr
✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo
✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo)
✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2)
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout
✔ interpretCliRun: salida real ⇒ el resultado del parser
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 159.96613
exit=0
0 despliegues
exit=0
exit=0
```

**Greps antes de entregar** (sobre `git diff`, que está vacío, sobre el output pegado y sobre este reporte):
- Claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key|seed phrase`): vacío.
- Rutas personales (`/home/`, el usuario, `/tmp/claude`, `.nvm/versions`): vacío.
- Hex de 40-64: vacío. Los IDs y las direcciones van abreviados (`0x1234…abcd`) y los SHA de commit, cortos.

### Verificación manual (localnet / testnet, digests de tx si hubo)
Localnet aislada según `agents.md` §3, con una sola génesis:
- `env.sh`, `ids.env` y `smoke_guard`;
- todo `suic` lleva el prefijo B4 con `printf 'n\n' |`, también los de lectura (`active-env`, `chain-identifier`, `addresses`);
- Node corre con `app.env`, nunca en la misma llamada que `env.sh`; la única excepción son los resúmenes de la salida de la CLI (abajo);
- sin `new-address`, faucet, `pkill` ni `--force-regenesis`, y nada contra testnet.

**Línea base (paso 2):**
- `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` da `2026-10-30 17:52:52.515735237 -0500 244`, y `ls` muestra solo `client.yaml`.
- Puertos 9000, 9123, 9184, 5003, 5173, 4173 y 9229 libres; ningún `sui start` de otra sesión.
- No existen `contracts/deployments/`, `Pub.*.toml` ni `Published.toml`.

**Red:**
- Chain id **`89815ecf`**; `getServiceInfo` da `server=sui-node/unknown` y `lowestAvailableCheckpoint=0` (sin poda).
- Cuentas de la génesis en `ids.env`: `ADMIN` (`0x4ee7…10c0`), `A` (`0x7e4a…4cba`), `B` (`0xa429…7972`) y `C` (`0xc749…8056`). Son cuatro distintas, de las 5 de la génesis.
- Publicación con el script en la variante B (`act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`):
  - exit 0, digest `8ybNtRjr7pdvFADb1Jk41au5JJMFciDxJ3rsk1v9SCso`, checkpoint 148;
  - `PKG` `0x400d…36da`, `HOUSE` `0x3351…b2ba`, `CAP` `0xe940…d2a8`;
  - `contracts/deployments/localnet.json` ignorado por git (`.gitignore:7`); `Move.lock` sin delta.

| # | Transacción (todas con `PRE`) | Digest | Checkpoint | Resultado |
|---|---|---|---|---|
| 1 | `ADMIN` `update_fee_rate` 250 (`suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250`) | `2cnZEDDsVcw7P4ih7u4SCDLqLRSaeUQtYLsWqvXecW45` | 336 | `FeeRateUpdated` 0 → 250 |
| 2 | `A` crea `GA1` (`0x64be…1c04`), abierta, 1000000 | `CkEDVHdovtoSgQaDu9CmDJHB8w4qogjpA1kmbo5b7rhU` | 384 | `success` |
| 3 | `A` crea `GA2` (`0x4dc0…9766`), abierta, 1000000 | `FKRovtGBXnKgiuEJMRewU4WqTPiaTgRpeBUJNZvp8SjV` | 389 | `success` |
| 4 | `A` crea `GAinv` (`0x034b…e57f`), invitación a `B` (`"some(@$B)"`), 1000000 | `4ehh4o6LzQvDV8aQbccgaQcNnKR8LTxgB7aoEjgPXpgx` | 393 | `success` |
| 5 | `C` crea 12 abiertas en **un PTB**: `GC0`..`GC11` = `0x64c8…cd1e`, `0x95c5…5a83`, `0xc0d7…8f7c`, `0x9af8…572d`, `0xa702…eb1a`, `0xcbdd…82f8`, `0xafe8…c819`, `0xacf5…1d12`, `0xc234…32e9`, `0x306b…32bd`, `0xd8d8…57e9`, `0xb8d1…75c8` | `Ev8AhnUdu2DT3ogvoWwtQDKxhv8i23qWKinRWPNCg6iL` | 434 | `success`, 12 `GameCreated` con `eventSeq` 0..11; **sin** `--gas-budget` |
| 6 | `B` acepta `GA1` (`--move-call "$PKG::game::accept_game" @<GA1> @$HOUSE c.0 @0x8`) | `79zdq4A1T6MNu2S1zh5f9Gdw5xvuagA21vAo2k7jSiJQ` | 1001 | `GameResolved`: pozo 2000000, comisión 50000, pago 1950000; gana `A` (el creador) |

**Sintaxis de CLI del PTB de varias partidas** (para el paso 9 del smoke). Funcionó tal cual, sin `--gas-budget`:
```bash
. <SMOKE_DIR>/env.sh && { . "$SMOKE_DIR/ids.env" 2>/dev/null || true; } && smoke_guard && act_as "$C" && \
N=12 && amounts=$(printf '1000000,%.0s' $(seq $N)); amounts="[${amounts%,}]"; calls=(); \
for i in $(seq 0 $((N-1))); do calls+=(--move-call "$PKG::game::create_game" @$HOUSE c.$i none); done; \
suic ptb --split-coins gas "$amounts" --assign c "${calls[@]}" --json
```
Para invitaciones, `none` se cambia por `"some(@$AW)"`: queda como un solo elemento del array, porque el array preserva las comillas.

**Sondas** (Node 26 con `app.env`; código descartable en `<scratchpad>`):
- **Red:** solo `http://127.0.0.1:9000`, por gRPC.
- **Archivos que leen:** `contracts/deployments/localnet.json`, `ids.env` y dos listas de IDs escritas desde la salida `--json` de la CLI. Nada de `<SMOKE_DIR>/net`.
- **Código importado:** el SDK desde `<repo>/node_modules`, por ruta, y **el código real de la app**: `parseGameObject`, `parseGameCreated`, `parseGameResolved`, `gameEventType` y `fetchPublishCheckpoint` (Desviación 2).
- **`readMask`:** el del lobby, sin `sender` (`event_type`, `contents`, `checkpoint`, `transaction_digest`, `event_index`). El remitente se comprueba por el BCS: `creator` en `GameCreated` y `acceptor` en `GameResolved`.
- **`startCheckpoint`:** el checkpoint de la publicación (148). Es lo que daría `historyLowerBound` con piso 0 (`kind: 'publish'`). Todas las lecturas son descendentes.
- **Filtro DL-1 (A):** `terms: [{ literals: [sender = X, eventType = GameCreated] }, { literals: [sender = X, eventType = GameResolved] }]`, con `negated: false` y `oneofKind: 'sender' | 'eventType'`.

```text
nodo http://127.0.0.1:9000 chainId(base58)=AFmGgbJw… server=sui-node/unknown checkpointHeight=942 lowestAvailableCheckpoint=0 publishCheckpoint=148
[S-3 antes de aceptar] getObjects 15 IDs en 1 llamada: 15 resultados, 8 ms
  GA1(aceptada por B): owner=Shared version=4 (string) state=pending creator=A opponent=null bet=1000000 stake=1000000
  GA2: owner=Shared version=5 (string) state=pending creator=A opponent=null bet=1000000 stake=1000000
  GAinv(a B): owner=Shared version=6 (string) state=pending creator=A opponent=B bet=1000000 stake=1000000
  GC0..GC11 (12 líneas iguales): owner=Shared version=4 (string) state=pending creator=C opponent=null bet=1000000 stake=1000000
  => Shared 15/15, parseGameObject OK 15/15
  GA1 antes: version=4 state=pending

(B acepta GA1: 79zdq4A1T6MNu2S1zh5f9Gdw5xvuagA21vAo2k7jSiJQ)

nodo http://127.0.0.1:9000 chainId(base58)=AFmGgbJw… server=sui-node/unknown checkpointHeight=1032 lowestAvailableCheckpoint=0 publishCheckpoint=148

=== S-1: DNF de DL-1 (A), descendente, limit 50, startCheckpoint = publicación
sender=A: 3 eventos, frames=4 (watermarks=4), reason=CHECKPOINT_BOUND, 12 ms
  GameCreated GAinv(a B) creator=A opponent=B tx=4ehh4o6LzQvDV8aQbccgaQcNnKR8LTxgB7aoEjgPXpgx idx=0 cp=393
  GameCreated GA2 creator=A opponent=null tx=FKRovtGBXnKgiuEJMRewU4WqTPiaTgRpeBUJNZvp8SjV idx=0 cp=389
  GameCreated GA1(aceptada por B) creator=A opponent=null tx=CkEDVHdovtoSgQaDu9CmDJHB8w4qogjpA1kmbo5b7rhU idx=0 cp=384
sender=B: 1 eventos, frames=2 (watermarks=2), reason=CHECKPOINT_BOUND, 5 ms
  GameResolved GA1(aceptada por B) creator=A acceptor=B winner=A pot=2000000 fee=50000 payout=1950000 tx=79zdq4A1T6MNu2S1zh5f9Gdw5xvuagA21vAo2k7jSiJQ idx=0 cp=1001
sender=normalizeSuiAddress('0x5ca1ab1e'): 0 eventos, frames=1 (watermarks=1), reason=CHECKPOINT_BOUND, 4 ms

=== S-2: cursor dentro de una transacción (12 GameCreated de C en un PTB), limit 5, before = último watermark.cursor
referencia (limit 50): 12 GameCreated de C, digests distintos=1 (Ev8AhnUdu2DT3ogvoWwtQDKxhv8i23qWKinRWPNCg6iL), event_index=[11,10,9,8,7,6,5,4,3,2,1,0], reason=CHECKPOINT_BOUND
[DNF sender=C] página 1: 5 eventos idx=[11,10,9,8,7] frames=5 reason=ITEM_LIMIT cursor=sha256:dfdef16e4e (12 B) 4 ms
[DNF sender=C] página 2: 5 eventos idx=[6,5,4,3,2] frames=5 reason=ITEM_LIMIT cursor=sha256:1a8c015f46 (12 B) 4 ms
[DNF sender=C] página 3: 2 eventos idx=[1,0] frames=3 reason=CHECKPOINT_BOUND cursor=sha256:65a90526fb (12 B) 4 ms
[DNF sender=C] total=12 únicos=12 repetidos=0
[DNF sender=C] faltantes vs referencia=0 sobrantes=0; orden descendente idx=[11,10,9,8,7,6,5,4,3,2,1,0]
[DNF sender=C] game_id paginados = los 12 de games-C.txt: true
[GameCreated sin sender] página 1: 5 eventos idx=[11,10,9,8,7] frames=5 reason=ITEM_LIMIT cursor=sha256:dfdef16e4e (12 B) 4 ms
[GameCreated sin sender] página 2: 5 eventos idx=[6,5,4,3,2] frames=5 reason=ITEM_LIMIT cursor=sha256:1a8c015f46 (12 B) 4 ms
[GameCreated sin sender] página 3: 5 eventos idx=[1,0,0,0,0] frames=5 reason=ITEM_LIMIT cursor=sha256:c256e78caa (12 B) 8 ms
[GameCreated sin sender] página 4: 0 eventos idx=[] frames=1 reason=CHECKPOINT_BOUND cursor=sha256:65a90526fb (12 B) 3 ms
[GameCreated sin sender] total=15 únicos=15 repetidos=0
[GameCreated sin sender] referencia=15 (reason=CHECKPOINT_BOUND), faltantes=0 sobrantes=0

=== S-3: getObjects de los 15 IDs en una llamada, después de aceptar
[S-3 después de aceptar] getObjects 15 IDs en 1 llamada: 15 resultados, 6 ms
  GA1(aceptada por B): owner=Shared version=415 (string) state=resolved acceptor=B winner=A creator=A opponent=null bet=1000000 stake=0
  GA2: owner=Shared version=5 (string) state=pending creator=A opponent=null bet=1000000 stake=1000000
  GAinv(a B): owner=Shared version=6 (string) state=pending creator=A opponent=B bet=1000000 stake=1000000
  GC0..GC11 (12 líneas iguales): owner=Shared version=4 (string) state=pending creator=C opponent=null bet=1000000 stake=1000000
  => Shared 15/15, parseGameObject OK 15/15
  GA1 después: version=415 state=resolved

=== S-4: escaneo de GameCreated sin sender (DL-1 (B)), filtro opponent en la sonda
[escaneo] página 1: 15 eventos idx=[11,10,9,8,7,6,5,4,3,2,1,0,0,0,0] frames=16 reason=CHECKPOINT_BOUND cursor=sha256:65a90526fb (12 B) 5 ms
[escaneo] total=15 únicos=15 repetidos=0
escaneados=15; opponent==B: 1 [GAinv(a B) creator=A tx=4ehh4o6LzQvDV8aQbccgaQcNnKR8LTxgB7aoEjgPXpgx]
opponent==C: 0
```
Notas sobre el bloque:
- Es el output de la segunda corrida de las sondas: la primera mostraba el cursor como prefijo base64 y la segunda como `sha256` corto (Desviación 4).
- Las líneas `GC0..GC11` resumen 12 líneas iguales salvo el rótulo.

| Sonda | Esperado | Medido | Conclusión |
|---|---|---|---|
| **S-1** (T1-2) | `A` ⇒ sus 3 `GameCreated`; `B` ⇒ su `GameResolved`; `0x5ca1ab1e` ⇒ 0 y `CHECKPOINT_BOUND` | **`A`:** 3 `GameCreated`, todos con `creator = A`, y **sin** el `GameResolved` de `GA1` (lo firmó `B`); 4 frames, `CHECKPOINT_BOUND`, 9-12 ms. **`B`:** 1 `GameResolved` con `acceptor = B`; 2 frames, `CHECKPOINT_BOUND`, 4-5 ms. **`0x5ca1ab1e`:** 0 eventos, 1 frame, `CHECKPOINT_BOUND`, 4 ms | **El nodo local (`sui 1.83.0`) filtra por `sender ∧ eventType` con la DNF de dos términos.** DL-1 (A) queda como está. Sin STOP |
| **S-2** (T1-3) | 12 `GameCreated` de `C` con un mismo digest y `event_index` 0..11; `limit` 5 ⇒ 5 + 5 + 2, sin repetidos ni faltantes | Un solo digest, `event_index` 11..0 en orden descendente. Páginas de 5 + 5 + 2 (`ITEM_LIMIT`, `ITEM_LIMIT`, `CHECKPOINT_BOUND`) con tres cursores distintos. Por `(digest, event_index)`: 12 únicos, 0 repetidos y, contra la referencia con `limit` 50, 0 faltantes y 0 sobrantes. Los 12 `game_id` son los del PTB | **El cursor dentro de una transacción no repite ni pierde eventos** (RM-4). Sin STOP. Verificación extra con el filtro sin `sender` (fuente (B)): 5 + 5 + 5 + 0, 15 únicos |
| **S-3** (T1-4) | 15+ IDs en una llamada, todos `Shared`, legibles y con `version`; la versión de la aceptada sube | 15 IDs en **1** `getObjects` (6-8 ms): 15/15 `Shared`, 15/15 legibles con el `parseGameObject` real, y `version` siempre `string`. `GA1` antes: `4`, `pending`. Después: `415`, `resolved`, con `acceptor = B`, `winner = A` y `stake = 0` | Confirmado. La versión es Lamport: no sube de a 1 (Riesgo 2) |
| **S-4** (T1-5) | La invitación de `A` a `B`; ningún `GameCreated` con `opponent = C` | 15 `GameCreated` escaneados en 1 pedido, `CHECKPOINT_BOUND`. Con `opponent == B` sale exactamente `GAinv` (`creator = A`, tx `4ehh4o6L…`); con `opponent == C`, 0 | Confirmado |

**Cierre del paso 7 y del paso 18 del smoke** (T1-6):
1. Antes del `kill` confirmé con `ps` que el PID era el de `sui start --network.config <SMOKE_DIR>/net`. Maté ese PID; el harness reportó exit **144**, el esperado.
2. En otra llamada:
   - `kill -0` falla con "No such process";
   - puertos 9000, 9123, 9184, 5003, 5173, 4173 y 9229 libres;
   - `pgrep -x sui` vacío y ningún proceso con `<SMOKE_DIR>` en la línea de comando.
3. Recién entonces:
   - `rm -rf <SMOKE_DIR>` y `test ! -e` OK. El temporal del script de publicación estaba en `<SMOKE_DIR>/tmp` y se borró con él;
   - `rm -f contracts/deployments/localnet.json`, `rmdir contracts/deployments` y `test ! -e` OK;
   - no quedan `contracts/Pub.*.toml` ni `contracts/Published.toml`.
4. Sin cargar `env.sh`:
   - `stat` da `2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml`, y `ls` solo `client.yaml`: **idénticos a la línea base**;
   - `git diff --exit-code -- contracts/Move.lock` da 0;
   - `git status --porcelain --untracked-files=all` vacío.
5. No usé navegador: el Chrome del usuario no se tocó. El worktree de #8 no se leyó ni se escribió.

**Firma con cuentas de la génesis y Node (las tres condiciones de §3):**
1. Todas las firmas las hizo la CLI (`suic ptb`/`suic call`) bajo el prefijo B4. No hubo firma fuera de la CLI.
2. Ningún proceso de Node leyó `<SMOKE_DIR>/net`:
   - las sondas leyeron `localnet.json`, `ids.env` y las listas de IDs;
   - los resúmenes de la salida de la CLI (`suic … --json | "$NODE" txsum.mjs`, y la extracción de alias y direcciones de `suic addresses --json` a `ids.env`) leyeron solo su `stdin`.
3. No se imprimió ninguna clave. De la salida `--json` de la CLI solo pegué digest, estado, checkpoint y eventos, con direcciones e IDs abreviados.

### Desviaciones del handoff
1. **El baseline del job `app` corrió con la edición del MID en curso.**
   - **Qué cambió:** el `git status` final de ese gate muestra `M documents/HANDOFF_MY_GAMES.md`. Es la v1.1 del MID, commiteada como `928bb60` segundos después.
   - **Por qué:** el MID editaba el handoff en el mismo worktree, como anticipaba la consigna.
   - **Verificación extra:**
     - `git diff b1b62f1 928bb60` toca solo `documents/HANDOFF_MY_GAMES.md`;
     - la sección TASK-1 es idéntica en la v1 y en la v1.1 (el `diff` de la sección da vacío);
     - el código de `app/` y de `contracts/` no cambió;
     - el job `contracts` del baseline, la publicación (`sourceCommit` `928bb60`) y el gate final corrieron sobre `928bb60`.
2. **S-3 usa el `parseGameObject` real, no un esquema equivalente.**
   - **Cómo:** la sonda registra un hook de resolución (`module.registerHooks`) que agrega `.ts` a los imports relativos sin extensión de `app/src/sui/`. El type stripping de Node 26 hace el resto. Así también usé los parsers reales de eventos y `fetchPublishCheckpoint`.
   - **Por qué:** el handoff permite las dos opciones, y la real mide lo que va a correr la app.
   - **Verificación extra:** no se tocó el repo. El hook solo actúa sobre imports relativos desde archivos `.ts`.
3. **S-2 suma el filtro sin `sender`** (fuente (B)), con `limit` 5.
   - **Resultado:** 5 + 5 + 5 + 0, con el cursor cortando dentro del PTB de `C`; 15 únicos, sin repetidos ni faltantes.
   - **Por qué:** RM-4 también afecta a esa fuente.
   - **Remitente de S-1:** lo comprobé por el BCS (`creator`/`acceptor`) en vez de sumar `sender` al `readMask`, para usar la máscara de DL-2 tal cual.
4. **Las sondas corrieron dos veces sobre la misma red, sin transacciones nuevas en el medio.**
   - **Por qué:** la primera corrida mostraba el cursor como un prefijo base64 de 12 caracteres, que coincidía entre las páginas 1 y 2. La sonda ya comparaba el cursor completo y no había cortado. La segunda imprime `sha256` corto y longitud, y muestra tres cursores distintos.
   - **Resultado:** las demás líneas dan igual en las dos corridas, salvo los ms.
5. **`startCheckpoint` = checkpoint de la publicación (148).** El handoff no lo fija. Es la cota de la app con piso 0.
6. **Un intento fallido al escribir `ids.env`.**
   - **Qué pasó:** el primer `node -e` vio `SMOKE_DIR` como `undefined` (`env.sh` no lo exporta) y falló con `ENOENT` antes de escribir nada. Lo repetí con redirección del shell.
   - **Alcance:** ese proceso solo leyó el `stdin` de `suic addresses --json`, y no imprimió direcciones completas ni claves.

### Riesgos / pendientes
1. **`ITEM_LIMIT` cuando quedan exactamente `limit` eventos.** En el escaneo sin `sender`, la página 3 trajo los 5 últimos con `ITEM_LIMIT` y la página 4 vino vacía con `CHECKPOINT_BOUND`.
   - **Efecto:** `hasNextPage = true` puede llevar a una página **vacía**. "Cargar más actividad" o "Buscar más atrás" no traen filas, y recién entonces aparece el vacío definitivo (H-1).
   - **Por qué no es STOP:** el lobby ya se comporta igual.
   - **Sugerencia:**
     - en TASK-2, un caso de test "última página vacía con `CHECKPOINT_BOUND`" (T2-7/T2-16);
     - en TASK-5, no tratar ese caso como error.
2. **`objectVersion` es una versión Lamport, no un contador por objeto.**
   - **Lo medido:** `GA1` pasó de 4 a 415, y los 12 objetos de `C` comparten la versión 4.
   - **H-2 sigue siendo válida:** compara solo lecturas del mismo `gameId`, como `bigint`.
   - **A evitar:** ningún test ni código debería suponer "+1" ni comparar versiones entre partidas distintas.
3. **Frames del `ListEvents` crudo** (dato para los mocks de TASK-2):
   - cada frame trae `watermark.cursor`;
   - con `ITEM_LIMIT`, el `QueryEnd` llega en el frame del último evento (frames = eventos);
   - con `CHECKPOINT_BOUND` llega un frame extra (frames = eventos + 1);
   - el cursor final de un `CHECKPOINT_BOUND` es el del límite: el mismo con los dos filtros (`sha256:65a90526fb`), no el del último evento. Es coherente con usar el **último** `watermark.cursor`, como hace el lobby.
4. **El nodo local se anuncia como `server=sui-node/unknown`.** La comparación con testnet (`1.83.1`, V-2) se apoya en la versión de la CLI (`1.83.0-16d2dc1e05ed`) que levantó la red.
5. **Alcance:** ninguno de estos puntos cambia DL-1..DL-17 ni H-1..H-4. Los decide el MID.

### Documentación
- READMEs / `agents.md`: no aplica (el task no tiene código ni cambia comandos).
- **Snippet propuesto para `documents/STATUS.md`:** `| localnet aislada @ feature/issue-13-my-games (TASK-1 de #13), CLI 1.83.0, 2026-11-03 | sondas de "Mis partidas" | 🟢 chain 89815ecf: el nodo local filtra por la DNF [sender ∧ GameCreated] ∨ [sender ∧ GameResolved] (S-1; 0x5ca1ab1e ⇒ 0 y CHECKPOINT_BOUND); cursor dentro de un PTB de 12 GameCreated con limit 5 ⇒ 5+5+2 sin repetidos ni faltantes, también sin sender (S-2); getObjects de 15 IDs en 1 llamada, Shared y legibles, version Lamport 4 → 415 al aceptar (S-3); escaneo sin sender con opponent == B ⇒ solo la invitación de A (S-4). ITEM_LIMIT con exactamente limit restantes ⇒ página siguiente vacía. App 755/52 y contracts 83/99 sin delta |`

---

## Revisión TASK-1: PASA

Revisé el reporte contra `HANDOFF_MY_GAMES` v1.1, TASK-1 §3-§7 (sin cambios desde la v1), `documents/ESTANDARES.md` y
`agents.md` §3. Contrasté el bloque de sondas con el output crudo de la segunda corrida: S-1..S-4, los cursores
(`sha256` corto) y la versión 4 → 415 coinciden línea por línea. Grep del reporte: 0 hex de 40-64, 0 rutas personales y
0 claves. Los únicos aciertos son las líneas que enumeran los patrones del grep. Los digests van completos en base58,
como permite el handoff.

| Criterio | Resultado |
|---|---|
| T1-1 baseline | ✅ App 755/52, lint 0, typecheck 0, build 887.10 kB (270.12 kB gzip), `npm ci` 293, 292 firmas, 0 de producción; contracts 0 warnings / 0 lints / 83, `node --test` 99, "0 despliegues", `Move.lock` sin delta. Igual a §0 |
| T1-2 (S-1) | ✅ La DNF de DL-1 filtra por remitente en el nodo local: `A` ⇒ sus 3 `GameCreated` y no el `GameResolved` de `GA1`, que firmó `B`; `B` ⇒ su `GameResolved`; `0x5ca1ab1e` ⇒ 0 eventos, 1 frame, `CHECKPOINT_BOUND`. DL-1 (A) se mantiene |
| T1-3 (S-2) | ✅ 12 `GameCreated` de un PTB, un digest, `event_index` 11..0; con `limit` 5: 5 + 5 + 2, 0 repetidos y 0 faltantes contra la referencia, con los dos filtros. RM-4 cerrado |
| T1-4 (S-3) | ✅ 15 IDs en un `getObjects`, 15/15 `Shared` y legibles con el `parseGameObject` real, `version` como `string`; `GA1` sube de 4 a 415 al aceptar |
| T1-5 (S-4) | ✅ El escaneo sin `sender` con `opponent == B` da solo `GAinv`; con `opponent == C`, nada |
| T1-6 cierre | ✅ `kill` del PID verificado con `ps` (exit 144); `kill -0` falla en otra llamada; puertos libres; `<SMOKE_DIR>` borrado después; `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base; árbol limpio; `Move.lock` sin delta; sin `deployments/`, `Published.toml` ni `Pub.*.toml` |
| B4 y claves | ✅ Todo `suic` con el prefijo; ningún `new-address`, faucet, `--force-regenesis` ni `pkill`; ninguna lectura de `<SMOKE_DIR>/net` desde Node; firmas solo por la CLI |
| Alcance | ✅ Sin cambios en el repo salvo este archivo (lo creó el orquestador); sin dependencias; el worktree de #8 no se tocó |

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| N-1 (NIT) | `FLUJO_AGENTES.md` §4 (desviaciones declaradas) | `REPORTES_MY_GAMES.md`, "Verificación manual", 3.er punto | Los resúmenes de la salida de la CLI con `"$NODE"` en la misma llamada que `env.sh` aparecen como "excepción" en la verificación, no en "Desviaciones del handoff". No viola nada: `agents.md` §3 define `NODE` en `env.sh` y lo usa así para `publish.mjs`, el proceso solo leyó `stdin`, y el handoff solo prohíbe `env.sh` junto con `app.env` | A partir de TASK-2, cualquier apartamiento de las reglas de §3 del handoff va en "Desviaciones", aunque esté permitido por `agents.md` |

**Desviaciones 1-6:** todas aceptadas.

1. El job `app` del baseline corrió con la v1.1 del handoff en edición. `git diff b1b62f1 928bb60` solo toca el handoff;
   la sección TASK-1 es idéntica, y el gate final y el job `contracts` corrieron sobre `928bb60`.
2. Usar el `parseGameObject` real mediante un hook de módulos en la sonda era una de las dos opciones de §3.4. Mide mejor
   lo que va a correr la app y no toca el repo.
3. La sonda extra sin `sender` en S-2 suma cobertura a RM-4 para la fuente (B).
4. La segunda corrida de las sondas, sin transacciones nuevas en el medio, solo cambió cómo se imprimía el cursor.
5. `startCheckpoint` = la publicación (148) es lo que da `historyLowerBound` con piso 0.
6. El primer intento de escribir `ids.env` falló sin escribir nada; el proceso solo leyó `stdin`.

**Riesgos 1-4 del DEV → handoff v1.2** (ninguno cambia DL-1..DL-17 ni H-1..H-4):

- **Riesgo 1 y 3** pasan a V-9 en §2, con tres agregados:
  - T2-7: página vacía con `CHECKPOINT_BOUND` tras un `ITEM_LIMIT` ⇒ `items: []`, `hasNextPage: false`, `end: 'bound'`,
    sin error ni `stalled`; los mocks replican la forma de los frames;
  - T2-9: lo mismo dentro de la página de dos pedidos de las invitaciones;
  - T5-5: "Cargar más actividad" con una página siguiente vacía ⇒ texto definitivo, sin alert ni botón.
  - Además, una nota en `app/README.md` (TASK-6). Es el comportamiento del lobby; no es un error.
- **Riesgo 2** pasa a V-10: H-2 compara solo lecturas del mismo `gameId`, y T2-12 usa versiones no consecutivas y dos
  partidas con la misma versión.
- **Riesgo 4** pasa a V-11.
- **Smoke:**
  - el paso 9 copia la sintaxis de PTB medida por el DEV;
  - el paso 15 fija entre 101 y 150 partidas abiertas: con más de ~169, el paso 17 necesitaría dos pulsaciones de
    "Buscar más atrás".

### Siguiente paso: TASK-2 autorizado, con `HANDOFF_MY_GAMES` v1.2

TASK-2 en adelante: el gate de la app parte de este reporte (755/52, 887.10 kB).

### Mensaje de commit propuesto

```
docs: record #13 TASK-1 localnet probes, handoff v1.2 (#13)

TASK-1 (no code): in the isolated localnet the sender DNF filter works on
sui 1.83.0 and the cursor inside a 12-event PTB neither repeats nor drops
events; object version is Lamport (4 -> 415). The handoff v1.2 records the
ListEvents frame shape (an exact-limit page is followed by an empty
CHECKPOINT_BOUND page, a normal end), Lamport versions for the dedupe tests,
the measured multi-game PTB syntax, and bounds smoke step 15 to 101-150 games.
Baseline unchanged: app 755/52, build 887.10 kB; contracts 83/99.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

El del reporte del DEV, sin cambios (fila de baseline "localnet aislada @ feature/issue-13-my-games (TASK-1 de #13)").

## TASK-2

## Task completado: HANDOFF_MY_GAMES v1.2 — TASK-2 (capa pura de "mis partidas", `sui/`)

### Branch (con SHA corto del HEAD)
`feature/issue-13-my-games` @ `a62d373`. Sin commits: los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- **Nuevos:**
  - `app/src/sui/eventScan.ts`
  - `app/src/sui/eventScan.test.ts`
  - `app/src/sui/myGames.ts`
  - `app/src/sui/myGames.test.ts`
  - `app/src/test/scanHarness.ts`: cliente falso compartido (Desviación 1).
- **Modificados:**
  - `app/src/sui/lobby.ts`
  - `app/src/sui/lobby.test.ts`
  - `app/src/sui/explorer.ts`
  - `app/src/sui/explorer.test.ts`
  - `app/src/hooks/useLobby.ts`: solo el tipo de la cota.
- `components/LobbyList.tsx` no se tocó: no nombra el tipo.

### Qué se implementó (3 líneas máx)
- **`eventScan.ts`:** saqué del lobby, sin cambiar la lógica, la cota (`historyLowerBound`, `HISTORY_FLOOR_MARGIN_CHECKPOINTS`), `requestEvents` (filtro y `limit` como parámetros, `readMask` sin `sender`), `requestOrPruned` y `eventTypeFilter`. `lobby.ts` ahora los usa y se comporta igual.
- **`myGames.ts`:**
  - las dos fuentes: `myActivityFilter`, y `fetchMyActivityPage` con el invariante de remitente; `fetchInvitationsPage` con 50/2/20 y `unreadableEvents`;
  - la agrupación: `naturalSection`, `mergeMyGames` (H-2), `extendPins`, `groupMyGames` y `sectionFooter` (H-1).
- **`explorer.ts`:** se suma `explorerAccountUrl`.

### Tests y gates (output pegado, por área tocada)

**Tests agregados o modificados, por archivo** (conteo con `vitest --reporter=json` ahora y en `HEAD` con `git stash -u`, restaurado):

| Archivo | Antes → después | Qué |
|---|---|---|
| `src/sui/eventScan.test.ts` (nuevo) | 0 → 25 | T2-1 `historyLowerBound` (los 6 casos movidos), `eventTypeFilter` (1), T2-2 `requestEvents` (12: filtro, `limit`, máscara sin `sender`, `before` decodificado, último watermark, cursor de la cota en un `CHECKPOINT_BOUND` vacío (V-9), los 5 `reason`, cursor `null`, 3 malformados) y T2-3 `requestOrPruned` (5) |
| `src/sui/myGames.test.ts` (nuevo) | 0 → 51 | constantes (1), T2-4 (1), T2-5..T2-8 `fetchMyActivityPage` (8), T2-9/T2-10 `fetchInvitationsPage` (7), T2-11 `naturalSection` (14), T2-12/T2-14 `mergeMyGames` (6), T2-13 `extendPins` (4), T2-15 `groupMyGames` (2), T2-16 `sectionFooter` (8) |
| `src/sui/explorer.test.ts` | 15 → 24 | T2-17: URL en testnet, `null` en localnet, 6 direcciones inválidas y una inválida en localnet |
| `src/sui/lobby.test.ts` | 28 → 22 | T2-18: los 6 casos de `lobbyLowerBound` pasaron a `eventScan.test.ts`. Los otros 22 tienen el mismo nombre, siguen en verde y no cambió ningún valor esperado (comparé las listas de nombres de `HEAD` y de ahora: la única diferencia son esos 6) |
| **Total** | **755 → 834** (52 → 54 archivos) | |

**Diff de `lobby.test.ts`, resumido** (`git diff --stat`: 32 líneas, +7/−25). Solo hay tres tipos de cambio:
1. **Imports.**
   - Salen de `./lobby`: `LOBBY_FLOOR_MARGIN_CHECKPOINTS`, `lobbyLowerBound` y `LobbyClient`.
   - Entra `import { HISTORY_FLOOR_MARGIN_CHECKPOINTS, type EventScanClient } from './eventScan'`.
2. **Renombres.**
   - `LobbyClient` → `EventScanClient` (2 lugares: `makeClient` y `fetchPage`).
   - `LOBBY_FLOOR_MARGIN_CHECKPOINTS` → `HISTORY_FLOOR_MARGIN_CHECKPOINTS` (2 lugares: el test de constantes, que sigue esperando `[50, 2, 20, 16_000n]`, y el ex-`:314`, que sigue esperando `1_000n + margen`).
3. **El `describe('lobbyLowerBound')`** pasa entero a `eventScan.test.ts` como `describe('historyLowerBound')`, con los mismos 6 casos y valores.

La aserción `not.toContain('sender')` (ex-`:196`) no cambia y sigue en verde.

**Verificación extra (mutaciones).** Rompí `myGames.ts` a propósito, de a una por vez, y siempre falla al menos un test:

| Mutación | Tests que fallan |
|---|---|
| Sin el invariante de remitente | 1 |
| Vacío definitivo con error de "cargar más" | 1 |
| `mergeTwo` sin comparar `objectVersion` | 1 |
| Sin el chequeo de cursor que no avanza | 2 |
| Sin el contador de `unreadableEvents` | 1 |
| Ilegible gana a legible | 2 |
| Cancelada ajena va a `finished` | 3 |
| `extendPins` siempre devuelve un `Map` nuevo | 2 |

Después restauré el archivo (`cmp` igual).

**Contracts:** no aplica. `git diff --exit-code -- contracts/` da 0.
**App:** el gate completo en forma canónica va abajo. Lo corrí una segunda vez después del último cambio, que fue reemplazar un literal hex de test.

```text
v26.13.0
a62d373

added 293 packages, and audited 295 packages in 15s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 12s

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


 Test Files  54 passed (54)
      Tests  834 passed (834)
   Start at  23:55:17
   Duration  29.53s (environment 59%, import 11%, setup 11%, tests 11%, transform 7%, worker 1%)

Environment  jsdom was created 54 times · 163.44s total, 59% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 590 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-ClmC8kOI.js   887.14 kB │ gzip: 270.12 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 572ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/hooks/useLobby.ts
 M app/src/sui/explorer.test.ts
 M app/src/sui/explorer.ts
 M app/src/sui/lobby.test.ts
 M app/src/sui/lobby.ts
?? app/src/sui/eventScan.test.ts
?? app/src/sui/eventScan.ts
?? app/src/sui/myGames.test.ts
?? app/src/sui/myGames.ts
?? app/src/test/scanHarness.ts
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```
- **Delta contra el baseline (TASK-1):** +79 tests y +2 archivos de test (tabla de arriba). Build: 887.10 → 887.14 kB (+0,04 kB; 270.12 kB gzip, sin cambio). Lint, typecheck y auditorías sin delta.
- **Sin dependencias nuevas:** `package*.json` y el lock sin delta.
- **Tablas de contrato (`contracts/README.md`) y `app/src/sui/`:** no aplica. No cambian ni el contrato ni los layouts BCS.
- **Capas:** `eventScan.ts` y `myGames.ts` importan solo `@mysten/sui*` y módulos de `sui/`, sin React (lint en 0). Son funciones puras o reciben el cliente por parámetro (ARQ-3).
- **Greps sobre `git diff` y los 5 archivos nuevos:**
  - claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key|seed phrase`), rutas personales y hex de 40-64: vacíos;
  - `console`, `eslint-disable`, `TODO` y `debugger`: vacíos.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: no hubo localnet ni testnet en este task. Los mocks replican la forma de frames medida en TASK-1 (V-9):
- con `ITEM_LIMIT`, el `QueryEnd` va en el frame del último evento;
- con `CHECKPOINT_BOUND`, va en un frame extra;
- cada frame trae `watermark`.

T2-7 y T2-9 cubren la página vacía tras un `ITEM_LIMIT`. T2-12 usa versiones 4 y 415, y dos partidas con la misma versión (V-10).

### Desviaciones del handoff
1. **Archivo nuevo `app/src/test/scanHarness.ts`, que §4 no lista.**
   - **Qué cambió:** el cliente falso de `ListEvents`/`GetServiceInfo`/`getObjects` y los frames con la forma de V-9 están en un solo módulo, que usan `eventScan.test.ts` y `myGames.test.ts`.
   - **Por qué:** con una copia en cada archivo nuevo, más la de `lobby.test.ts`, serían tres copias, y LIM-5 obliga a extraer. La regla de capas de `src/**` prohíbe `@mysten/*` fuera de `sui/` y `hooks/`, así que el módulo no importa el SDK: el BCS de eventos y objetos lo arma cada test.
   - **Qué queda:** `lobby.test.ts` conserva su copia, porque el handoff limita sus cambios a imports y renombres. Quedan dos copias.
   - **Verificación extra:** lint en 0 sobre el módulo. Nada de la app lo importa (el build es el mismo).
2. **`eventScan.ts` exporta además el tipo `EventsRequest`**, los argumentos comunes de `requestEvents` y `requestOrPruned` (§4 los escribe como "mismos args"). Solo es un tipo.
3. **Invariante de la actividad.** Un `GameCreated` con `creator` ≠ cuenta, o un `GameResolved` con `acceptor` ≠ cuenta, da directamente un ítem `unreadable` con el `gameId` leído y el rol del tipo, sin lanzar y atrapar un `ReadDataError` `invariant`. El efecto es el mismo y nunca se muestra como `game` (T2-6). Si `mergeMyGames` encuentra esa partida legible en las invitaciones, gana la legible (H-2).
4. **Caso extra en `naturalSection`.** Un ítem con rol `acceptor` y el objeto en `Pending` (contradice el contrato: aceptar es resolver) da `null`. §3.6 no lo cubre; tiene test.
5. **Desempate de orden.** Con el mismo checkpoint, el digest mayor va primero: es determinista, porque §3.8 no fija el sentido. `null` va al final. `mergeMyGames` conserva el orden de primera aparición (actividad y después invitaciones).
6. **El bucle de página no se compartió con el lobby.** En `myGames.ts` es una función privada (`fetchSourcePage`) que usan las dos fuentes, con `target` infinito para la actividad. `lobby.ts` conserva su bucle, para no cambiar su comportamiento ni sus tests (ver Riesgos 1).

### Riesgos / pendientes
1. **Bucle duplicado (LIM-5, "dos veces = candidata").** El bucle de `fetchLobbyPage` y `fetchSourcePage` es el mismo (~30 líneas: piso, cota, pedidos, `stalled`, `history_pruned`, objetos en lote). Se podría pasar a `eventScan.ts` como un `scanPage` genérico y hacer que el lobby lo use, pero eso cambia `lobby.ts` más de lo que permite este handoff. Lo decide el MID: un issue de limpieza o un punto de TASK-6.
2. **`fetchInvitationsPage` no verifica `object.opponent`.** Confía en el `opponent` del evento, como pide §3.5; el `opponent` del objeto es inmutable y sale del mismo `create_game`. Si el MID quiere el chequeo defensivo (con el objeto distinto ⇒ ilegible), son 2 líneas y un test.
3. **El texto de `explorerAccountUrl` es "Dirección inválida: …".** La dirección no se normaliza, igual que en las otras funciones de `explorer.ts`.
4. Ninguno de estos puntos cambia DL-1..DL-17 ni H-1..H-4.

### Documentación
- READMEs / `agents.md`: no aplica en este task. El mapa de `sui/` de `app/README.md` es de TASK-6 (`eventScan.ts`, `myGames.ts`, `explorerAccountUrl`).
- **Snippet propuesto para `documents/STATUS.md`:** `| feature/issue-13-my-games (TASK-2 de #13), 2026-11-03 | capa pura de "mis partidas" | 🟢 sui/eventScan.ts extraído del lobby sin cambio de comportamiento (lobby.test.ts: solo imports, renombres y la cota movida); sui/myGames.ts con las dos fuentes (DNF por remitente con invariante; escaneo de invitaciones 50/2/20 con eventos ilegibles contados), naturalSection, mergeMyGames (H-2), extendPins, groupMyGames y sectionFooter (H-1); explorerAccountUrl. App 834/54 (+79), lint/typecheck 0, build 887.14 kB |`
=====

---

## Revisión TASK-2: PASA

Revisé el reporte contra el diff real del árbol, partiendo de `a62d373`:
- 5 archivos modificados: `lobby.ts`, `lobby.test.ts`, `explorer.ts`, `explorer.test.ts` y `useLobby.ts`;
- 5 nuevos: `eventScan.ts`, `eventScan.test.ts`, `myGames.ts`, `myGames.test.ts` y `test/scanHarness.ts`.

Los revisé contra `HANDOFF_MY_GAMES` v1.2, TASK-2, y `documents/ESTANDARES.md`. Grep del diff y de los archivos nuevos:
0 hex de 40-64, 0 rutas personales, 0 claves, sin `console`, `eslint-disable`, `debugger` ni `TODO`. Los únicos
aciertos de `todo` son la palabra "todos" en comentarios.

**Foco DL-2: `lobby.test.ts` sin cambios de valores.** Comprobado en el diff (+7/−25), que solo tiene tres tipos de
cambio:
- **imports:** salen `LOBBY_FLOOR_MARGIN_CHECKPOINTS`, `lobbyLowerBound` y `LobbyClient`; entran
  `HISTORY_FLOOR_MARGIN_CHECKPOINTS` y `EventScanClient`;
- **renombres:** `LobbyClient` → `EventScanClient` en `makeClient` y en `fetchPage`, y el margen en el test de constantes
  (sigue esperando `[50, 2, 20, 16_000n]`) y en el ex-`:314` (sigue `1_000n + margen`);
- **la cota movida:** se quita el `describe('lobbyLowerBound')`, que reaparece en `eventScan.test.ts:27-37` como
  `historyLowerBound`, con los mismos 6 casos y valores.

La aserción `not.toContain('sender')` no se tocó. Ningún valor esperado de `fetchLobbyPage` cambia.

**Extracción.** `eventScan.ts` es el código de `lobby.ts` movido sin cambiar la lógica:
- cota, `QueryEnd` → `hasNextPage`, último `watermark.cursor`, `OUT_OF_RANGE`/piso ⇒ `HistoryPrunedError` y relanzar el
  error original si falla la relectura del piso;
- `readMask` sin `sender` (MINOR-1);
- `eventTypeFilter` es el literal que estaba inline en `lobby.ts:82`.

`lobby.ts` conserva su bucle y solo cambia el pedido: `requestOrPruned` con `filter` y `limit: LOBBY_EVENTS_PER_REQUEST`.
`useLobby.ts` solo cambia el tipo de la cota.

| Revisión | Resultado |
|---|---|
| Implementa lo pedido (§3.1-§3.10) | ✅ `requestEvents`/`requestOrPruned`/`historyLowerBound`/`eventTypeFilter`; `myActivityFilter` = la DNF exacta con `sender` normalizado; `fetchMyActivityPage` con el invariante de remitente (`creator`/`acceptor` ≠ cuenta ⇒ `unreadable`, nunca `game`); `fetchInvitationsPage` con 50/2/20, `opponent == cuenta` sin descartar terminadas, y `unreadableEvents` en lugar de filas (MINOR-4); `naturalSection`, `mergeMyGames` (H-2: legible > ilegible; mayor `objectVersion`; rol `acceptor`; evento más nuevo), `extendPins` (misma instancia sin novedades, `Map` nuevo sin mutar), `groupMyGames` y `sectionFooter` (H-1: botón también con error, solo `stalled` lo oculta; alert con cualquier error); `explorerAccountUrl` valida antes de mirar la red |
| ARQ/PROY (capas, ARQ-3, ARQ-5) | ✅ `sui/` sin React; cliente por parámetro; `myGames → lobby` solo para las constantes (DL-8), sin ciclo; `test/scanHarness.ts` sin `@mysten/*` (regla de capas) |
| SEG-10 / DL-3 | ✅ Nada ajeno como propio (T2-6); un objeto inexistente se omite; un ilegible nunca se muestra como `Pending`; un `acceptor` con el objeto en `Pending` ⇒ `null` (Desviación 4) |
| V-9 / V-10 | ✅ Mocks con la forma medida (`scanFrames`: `end` en el último frame con `ITEM_LIMIT`, frame extra con `CHECKPOINT_BOUND`); página vacía tras `ITEM_LIMIT` = fin normal (T2-7: `myGames.test.ts:243`; T2-9: `:328`; `eventScan`: cursor de la cota). Versiones 4/415 y dos partidas con la misma versión (`:402`, `:411`) |
| MINOR-1 del handoff v1 | ✅ `extendPins` documenta que espera ítems deduplicados, y `myGames.test.ts:462-470` prueba el pin con lecturas distintas, legible contra legible y contra ilegible ⇒ `finished` |
| LIM | ✅ JSDoc con el porqué; sin código muerto; `mergeTwo`, `compareEvents` y `gameKey` privadas con un solo uso cada una |
| Tests | ✅ T2-1..T2-18 mapeados por archivo: 755 → 834 (+79), 52 → 54 archivos. Las mutaciones dirigidas (8 casos, cada una con ≥ 1 test que falla) muestran que los tests muerden |
| Gates | ✅ Completos y en forma canónica: `npm ci`, firmas, auditoría, lint 0, typecheck 0, 834/54, build 887.14 kB (+0,04, gzip igual); `contracts/` y `package*.json` sin delta |
| Docs | ✅ No aplica (es de TASK-6) |

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno bloqueante ni para corregir en este task | — |

**Desviaciones 1-6:** aceptadas.
1. **`test/scanHarness.ts`:** evita la tercera copia del cliente falso (LIM-5). No importa `@mysten/*`, el lint da 0 y
   nada de la app lo importa. Se incorpora a la lista de §4 en el próximo cambio del handoff.
2. **`EventsRequest`:** es el tipo de los "mismos args" de §4.
3. **Invariante como `unreadable` directo** en lugar de lanzar y atrapar un `ReadDataError`: mismo efecto observable, y
   T2-6 lo fija.
4. **`acceptor` con objeto `Pending` ⇒ `null`:** caso fuera de §3.6, con test. Es lo correcto: aceptar es resolver.
5. **Desempate determinista** por digest; `null` al final; `mergeMyGames` conserva el orden de primera aparición.
6. **El bucle no se compartió con el lobby:** ver Riesgo 1.

**Riesgos del DEV, decididos:**
- **Riesgo 1 (bucle duplicado entre `fetchLobbyPage` y `fetchSourcePage`):** va a un **issue de limpieza post-ciclo**, no
  a TASK-6.
  - **Por qué no en este ciclo:** LIM-5 lo marca como candidata (dos copias), no como obligatorio (tres). Moverlo cambia
    `lobby.ts` y sus tests más allá de DL-2. TASK-6 es solo de docs, y ARQ-7 pide no hacer refactors fuera del task.
  - **Alcance propuesto del issue:**
    - un `scanPage` genérico en `eventScan.ts` que usen el lobby y "Mis partidas";
    - migrar el `makeClient` de `lobby.test.ts` a `test/scanHarness.ts` (la segunda copia del cliente falso);
    - todos los valores esperados de `fetchLobbyPage` intactos.
  - Lo redacta el MAYOR al cerrar el ciclo y lo crea el orquestador.
- **Riesgo 2 (`fetchInvitationsPage` no verifica `object.opponent`):** **no se agrega.**
  - El filtro de invitaciones es del cliente, sobre el BCS exacto de un `GameCreated` del paquete original.
  - El `opponent` del objeto es inmutable y sale del mismo `create_game`.
  - No hay que desconfiar de ningún filtro del servidor, que es lo que justifica el invariante de la actividad (DL-3).
  - La actividad tampoco compara el objeto con el evento: es coherente. Si llegara un objeto inconsistente,
    `parseGameObject` ya valida tipo, dueño y BCS canónico.
- **Riesgo 3 (texto "Dirección inválida: …" sin normalizar):** se acepta. Es el mismo patrón que `explorerTxUrl` y
  `explorerObjectUrl`.

### Siguiente paso: TASK-3 autorizado, con `HANDOFF_MY_GAMES` v1.2

El gate de la app parte de este reporte: 834 tests en 54 archivos, build 887.14 kB.

### Mensaje de commit propuesto

```
app: add the my-games read layer and extract the event scan (#13)

sui/eventScan.ts takes the raw ListEvents scan out of the lobby without
changing it (lobby tests only change imports, renames and the moved bound
cases). sui/myGames.ts adds the two sources: own activity through the
server-side sender DNF with the creator/acceptor invariant, and the
invitation scan with unreadable events counted, not shown. It also adds the
pure grouping (mergeMyGames, extendPins, groupMyGames) and the honest section
footer (sectionFooter), plus explorerAccountUrl. App 834 tests in 54 files.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

El del reporte del DEV, sin cambios.

## TASK-3

## Task completado: HANDOFF_MY_GAMES v1.2 — TASK-3 (máquina: cambio de cuenta (MINOR-1 de #12) y tipos (NIT-1))

### Branch (con SHA corto del HEAD)
`feature/issue-13-my-games` @ `8d19872`. Sin commits: los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- **`app/src/hooks/txSession.ts`:**
  - recibe `TxAction`, `TxOutcome`, `TxResult`, `TxPrecheckStop` y `ExecuteInput`;
  - `ExecuteInput.interpret(nodeResult, signer)`;
  - `TxVariables` suma `account: UiWalletAccount | null` y `targetHash`.
- **`app/src/hooks/useExecuteTransaction.ts`:**
  - la etapa queda ligada a una clave (el `targetHash` del objetivo);
  - `run` recibe las variables y usa la cuenta capturada en el clic para la preflight, la firma con `{ transaction, account }`, `interpret` y la invalidación;
  - `execute` captura la cuenta y el `targetHash`.
- **`app/src/hooks/txInvalidation.ts`:** importa `TxAction` de `txSession` (el tipo sale de acá).
- **`app/src/hooks/useAcceptGame.ts` y `useCreateGame.ts`:** `interpret(result, signer)`. Les borré `useCurrentAccount` y su `sender`, que quedaban sin uso.
- **`app/src/components/GameActions.tsx` y `TransactionStatus.tsx`:** solo imports.
- **Tests:**
  - `hooks/useExecuteTransaction.test.tsx`: imports y 6 tests nuevos;
  - `hooks/txSession.test.ts`: imports y 1 test nuevo;
  - `components/CreateGameForm.test.tsx`, `GameActions.test.tsx` y `TransactionStatus.test.tsx`: solo imports.
- **Sin cambios, porque no hizo falta:**
  - `useCancelGame.ts` y `useRejectGame.ts` (su `interpret` ignora el segundo argumento);
  - `queryKeys.ts` y `useTxTarget.ts`;
  - `useAcceptGame.test.tsx`, `useCreateGame.test.tsx`, `GameActions.machine.test.tsx` y `CreateGameForm.machine.test.tsx`.

### Qué se implementó (3 líneas máx)
- **NIT-1:** los cinco tipos de la máquina viven en `txSession.ts`, que no importa nada de `./`. Ya no hay ciclos de imports de tipos y no hay re-exports.
- **MINOR-1 de #12 (DL-11):**
  - `execute` captura la cuenta y el `targetHash` en las variables de la mutación;
  - `run` firma con `signAndExecuteTransaction({ transaction, account })`, y `interpret` recibe la dirección que firmó;
  - la etapa se guarda como `{ key: targetHash, stage }`, y una vista de otra cuenta ve `idle`;
  - no usé `useRef` ni `useEffect`.

### Tests y gates (output pegado, por área tocada)

**Tests nuevos (T3-1..T3-9):**

| Test | Dónde | Qué verifica |
|---|---|---|
| T3-1 | todo el suite | Los 834 de antes siguen en verde, sin cambiar ninguna aserción |
| T3-2 + T3-3 | `useExecuteTransaction.test.tsx` | A en `confirming` → `switchTo(B)` ⇒ `stage: 'idle'`, `outcome: null`, `target.busy: false`, `target.notice: null`. La transacción termina mientras se ve B (sigue `idle`/`null`); al volver a A ⇒ `done` y el `success` de A |
| T3-4 | `useExecuteTransaction.test.tsx` | Cambio a B con la preflight diferida ⇒ preflight con la dirección de A; la wallet recibe `account` **=== el objeto de A**; `interpret` recibe la dirección de A; se invalida el saldo de A |
| T3-5 | `useExecuteTransaction.test.tsx` | "Sin confirmar" de A: B no lo ve y su `execute` llega a la wallet con `account` = B. Al volver a A, `unconfirmed` reaparece y un `execute` de A no hace pedidos |
| T3-6 (SUGGESTION-5) | `useExecuteTransaction.test.tsx` | A en curso → B lanza desde la **misma** instancia y termina → A queda "sin confirmar" → al volver a A, `outcome: null` y el objetivo de A sigue bloqueado (0 pedidos nuevos) |
| T3-7 | `useExecuteTransaction.test.tsx` | Sin cuenta ⇒ "Conecta tu wallet" sin pedidos, con `account: null` y el `targetHash` en las variables de la mutación |
| T3-8 | `txSession.test.ts` | `txVariablesOf` ignora `account`/`targetHash` (también con `account: null`) en las cuatro acciones; `toTxEntry` da la misma proyección |
| T3-9 | `useExecuteTransaction.test.tsx` | La wallet recibe `account` = A y la transacción sigue **sin** `sender`. El test viejo "builds the transaction for the wallet without constructing it" (ex-`:212-216`) sigue en verde sin tocarlo |

En T3-6, la etapa de A al volver es `done`, no `idle`: el `finally` de A corrió después que el de B. Con `outcome: null`, `TransactionStatus` no dibuja texto para `done` (`STAGE_TEXT` no tiene esa clave). Queda documentado en el test.

**Conteo por archivo:**

| Archivo | Antes → después |
|---|---|
| `useExecuteTransaction.test.tsx` | 28 → 34 |
| `txSession.test.ts` | 16 → 17 |
| Resto | Sin delta |
| **Total** | **834 → 841** (54 archivos) |

**Aserciones migradas (T3-1):** ninguna. En los cinco archivos de test modificados, las únicas líneas borradas son imports (`git diff -U0 | grep '^-'`):
- `CreateGameForm.test.tsx`: `TxOutcome`, de `../hooks/useExecuteTransaction` a `../hooks/txSession`.
- `GameActions.test.tsx`: `TxResult`, de `../hooks/useExecuteTransaction` a `../hooks/txSession`.
- `TransactionStatus.test.tsx`: `TxOutcome`, de `../hooks/useExecuteTransaction` a `../hooks/txSession` (`TxStage` se queda).
- `txSession.test.ts`: `TxOutcome` pasa al import de `./txSession`.
- `useExecuteTransaction.test.tsx`: `TxAction` (antes de `./txInvalidation`) y `ExecuteInput` (antes de `./useExecuteTransaction`) pasan a `./txSession`.

No hizo falta tocar ninguna expectativa de la wallet: las de antes no comparaban los argumentos completos, y `account` se verifica en los tests nuevos.

**Verificación extra (mutaciones sobre `useExecuteTransaction.ts`, restaurado con `cmp` igual):**

| Mutación | Resultado |
|---|---|
| Etapa sin clave (`stage = staged.stage`) | Falla T3-2/T3-3 |
| Firma sin `account` | Fallan T3-4, T3-5 y T3-9 |
| `run` con la cuenta del cierre del render, o `interpret` con `currentAccount` | 34/34 en verde: mutantes **equivalentes** |

Los dos últimos son equivalentes porque TanStack arma la mutación con la `mutationFn` del render del clic (`MutationObserver.mutate` usa `this.options` en ese momento). El cierre ya apuntaba a A. El fallo real de MINOR-1 era firmar sin `account` (la wallet usaba su cuenta seleccionada) y compartir la etapa. Capturar la cuenta en las variables hace explícito lo que antes dependía del cierre.

**Criterios de §7:**
```text
--- grep -n "from './" app/src/hooks/{txSession,queryKeys,txInvalidation,useExecuteTransaction}.ts
app/src/hooks/txInvalidation.ts:3:import { queryKeys } from './queryKeys';
app/src/hooks/txInvalidation.ts:4:import type { TxAction } from './txSession';
app/src/hooks/queryKeys.ts:3:import type { TxTarget } from './txSession';
app/src/hooks/useExecuteTransaction.ts:18:import { transactionInvalidations } from './txInvalidation';
app/src/hooks/useExecuteTransaction.ts:28:} from './txSession';
app/src/hooks/useExecuteTransaction.ts:29:import { useAppConfig } from './useAppConfig';
--- grep -rnE "\b(TxOutcome|TxResult|TxPrecheckStop|ExecuteInput|TxAction)\b.*from '.*(useExecuteTransaction|txInvalidation)'" app/src
(vacío, exit=1)
--- grep -rn "eslint-disable" app/src ; grep -n "useRef\|useEffect" app/src/hooks/useExecuteTransaction.ts
(vacío)
```
- `txSession.ts` no tiene ninguna línea en el primer grep.
- El resto forma un DAG: `queryKeys → txSession`; `txInvalidation → queryKeys, txSession`; `useExecuteTransaction → txInvalidation, txSession, useAppConfig`.
- `txSession.ts` importa solo de `@mysten/dapp-kit-react` (tipo `UiWalletAccount`, V-5), `@mysten/sui/transactions` (tipo), `@tanstack/react-query`, `../sui/events` y `../sui/execution` (tipos).
- La API pública del hook no cambia: `useExecuteTransaction<T>(view)` devuelve `{ stage, outcome, execute }` y sigue exportando `TxStage`, `UseExecuteTransaction`, `CONNECT_WALLET_MESSAGE` y `PREPARE_FAILED_PREFIX`.

**Gates:**
- **Contracts:** no aplica. `git diff --exit-code -- contracts/` da 0.
- **App:** gate completo en forma canónica.
```text
v26.13.0
8d19872

added 293 packages, and audited 295 packages in 12s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 14s

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


 Test Files  54 passed (54)
      Tests  841 passed (841)
   Start at  00:08:07
   Duration  28.87s (environment 63%, import 11%, setup 10%, tests 9%, transform 8%, worker 1%)

Environment  jsdom was created 54 times · 172.29s total, 63% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 590 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-D1kEuIdj.js   887.24 kB │ gzip: 270.17 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 572ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/components/CreateGameForm.test.tsx
 M app/src/components/GameActions.test.tsx
 M app/src/components/GameActions.tsx
 M app/src/components/TransactionStatus.test.tsx
 M app/src/components/TransactionStatus.tsx
 M app/src/hooks/txInvalidation.ts
 M app/src/hooks/txSession.test.ts
 M app/src/hooks/txSession.ts
 M app/src/hooks/useAcceptGame.ts
 M app/src/hooks/useCreateGame.ts
 M app/src/hooks/useExecuteTransaction.test.tsx
 M app/src/hooks/useExecuteTransaction.ts
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```

**Delta contra el baseline (TASK-2):**
- Tests: +7, en los mismos 54 archivos.
- Build: 887.14 → 887.24 kB (270.12 → 270.17 kB gzip).
- Lint, typecheck y auditorías: sin delta.
- `package*.json`, `contracts/` y `sui/`: sin cambios.

**Greps sobre `git diff`:** vacíos para claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key`), rutas personales, `console.`, `eslint-disable` y hex de 40-64 en líneas agregadas. Las direcciones de test se arman con `'e'.repeat(64)`.

**Tablas de contrato y `app/src/sui/`:** no aplica.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica. El handoff lo excluye: la burner no cambia de cuenta sin recargar. El cambio de cuenta con una wallet de extensión queda para #17 (RM-8, RM-9).

### Desviaciones del handoff
1. **Chequeo de cuenta en `run`.** Es `if (account === null) return failure(CONNECT_WALLET_MESSAGE)`, y después `const sender = account.address`.
   - **Qué cambió:** para eso pasé la definición de `invalidateAction` y `progress.invalidate` a **después** de ese chequeo.
   - **Por qué:** con la cuenta en las variables, `sender` deja de ser anulable desde ahí y no hace falta un segundo chequeo.
   - **Verificación extra:** el camino sin cuenta no invalida nada ni tiene digest, igual que antes (T3-7 y el test viejo de "Conecta tu wallet" en verde).
2. **Renombre interno:** la cuenta del render en `useExecuteTransaction` pasó a llamarse `currentAccount`, para no taparla con la `account` de las variables dentro de `run`.
3. **Archivos de §4 sin tocar:** `useCancelGame.ts`, `useRejectGame.ts`, `useAcceptGame.test.tsx`, `useCreateGame.test.tsx`, `GameActions.machine.test.tsx` y `CreateGameForm.machine.test.tsx`. No necesitaban cambios para compilar ni para pasar, y los tests nuevos cubren T3-1..T3-9 desde `useExecuteTransaction.test.tsx` y `txSession.test.ts`.
4. **T3-6 afirma además `stage: 'done'`**, la etapa de la ejecución de A, que terminó última. El handoff solo pide `outcome: null` y el objetivo bloqueado. Es el límite (b) de DL-11.

### Riesgos / pendientes
1. **Wallet que ya no expone la cuenta capturada (V-4).** El kit lanza antes de abrir la wallet, sin digest, y el resultado es `failure` con el texto de `transactionErrorMessage`. No le agregué un test propio, porque el camino es el mismo del test existente "fails with the wallet message when it rejects without digest". Se verifica con una wallet de extensión en #17 (RM-9).
2. **TASK-4:** la tabla de invalidación no cambió (`myGames` llega en TASK-4). La invalidación ya usa la cuenta capturada.

### Documentación
- **READMEs / `agents.md`:** no aplica en este task. La tabla de hooks y la máquina de `app/README.md` son de TASK-6 (tipos en `txSession.ts`, `interpret(result, signer)`, etapa por clave).
- **Snippet propuesto para `documents/STATUS.md`:** `| feature/issue-13-my-games (TASK-3 de #13), 2026-11-04 | máquina de transacciones | 🟢 NIT-1: TxAction/TxOutcome/TxResult/TxPrecheckStop/ExecuteInput en txSession.ts (sin imports de ./, sin ciclos); MINOR-1 de #12: cuenta y targetHash capturados en TxVariables, firma con { transaction, account }, interpret(result, signer), etapa por clave (otra cuenta ve idle; al volver, la etapa y el resultado). App 841/54 (+7), lint/typecheck 0, build 887.24 kB |`
=====

---

## Revisión TASK-3: PASA

Revisé el reporte contra el diff real partiendo de `8d19872`: 12 archivos de `app/src/hooks/` y `app/src/components/`,
+362/−86 sin contar este archivo. Lo contrasté con `HANDOFF_MY_GAMES` v1.2, TASK-3, y con `documents/ESTANDARES.md`.

**Foco 1: regresión de #11/#12 intacta.** `git diff -U0` de los cinco tests modificados: las **únicas** líneas borradas
son imports (`TxOutcome`/`TxResult`/`TxAction`/`ExecuteInput` pasan de `useExecuteTransaction`/`txInvalidation` a
`txSession`). No se migró, relajó ni borró ninguna aserción. Los 834 de TASK-2 siguen en verde dentro de los 841. En la
máquina, el diff solo cambia:
- de dónde sale la cuenta: las variables, en lugar del cierre del render;
- `account` en la firma;
- `interpret(nodeResult, sender)`;
- la etapa con clave;
- el chequeo de cuenta, que va antes de definir `invalidateAction` (Desviación 1).

Siguen sin tocar la preflight, DL-10, NIT-2, la confirmación, la indexación, la red de seguridad del `catch`, las
opciones de la mutación (`retry: false`, `gcTime: Infinity`, `networkMode: 'always'`) y el resultado por `runId`.

**Foco 2: SEG-10.** El resultado sigue saliendo solo de la confirmación del nodo y de `classifyExecution`. Ahora es más
estricto:
- `interpret` recibe la dirección de la cuenta que **firmó**, porque la firma va con `account` explícito y el kit hace
  `setSenderIfNotSet(account.address)` (V-4);
- `parseResolvedGame`/`parseCreatedGame` buscan el evento de esa cuenta, no de la conectada al terminar;
- la wallet sigue recibiendo la transacción sin `sender` (T3-9 y el test viejo, en verde sin tocar);
- con una cuenta que la wallet ya no expone, el rechazo llega sin digest ⇒ `failure` "La wallet no completó…", nunca un
  éxito.

**Foco 3: candado V-8 atómico.** `execute` sigue con la misma secuencia síncrona:
1. `isMutating({ mutationKey: view.accountKey })`;
2. el chequeo de "sin confirmar" del objetivo (`findAll({ mutationKey: view.key })`);
3. `nextRunId`/`setRunId`;
4. `mutateAsync`.

No hay ningún `await` en el medio, y las variables nuevas (`account`, `targetHash`) se arman en el mismo tick. El candado
sigue siendo **por cuenta**: una B que lanza mientras A está en curso no lo rompe (monedas de gas distintas; validado por
el MAYOR en la revisión del plan v2).

**Foco 4: la etapa por clave no oculta un "sin confirmar" ni permite doble envío.**
- **Lo que cambia:** la etapa solo afecta el texto de progreso del hook (`stage`). Una clave distinta muestra `idle`.
- **"Sin confirmar":** se deriva del `MutationCache` en `useTxTarget` (alerta y bloqueo de la vista) y en el chequeo de
  `execute`. No depende de `stage`: T3-5 lo prueba al volver a A (`unconfirmed` reaparece y `execute` no hace pedidos).
- **Doble envío:** los botones se deshabilitan con `useTxTarget().busy`/`unconfirmed`, no con `stage`, y el candado de
  `execute` es independiente de la etapa. Una misma cuenta no puede enviar dos veces, con o sin cambio de clave.
- **Mejora lateral:** si la misma instancia pasa a otro objetivo de la misma cuenta (otro `targetHash`, p. ej. el detalle
  de otra partida sin remontar), ya no arrastra la etapa del anterior.

| Revisión | Resultado |
|---|---|
| Implementa lo pedido (§3.1-§3.5) | ✅ Tipos movidos a `txSession.ts` sin re-exports; `interpret(nodeResult, signer)`; `TxVariables` con `account` y `targetHash`; `run(variables, …)` usa la cuenta capturada en `sender`, preflight, firma, `interpret` e invalidación; etapa `{ key, stage }` escrita con el `targetHash` de las variables, también en el `finally`; sin `useRef` ni `useEffect` |
| NIT-1 / ARQ-5 | ✅ `txSession.ts` sin imports de `./`; grep de tipos movidos vacío; DAG `queryKeys → txSession`, `txInvalidation → queryKeys, txSession`, `useExecuteTransaction → txInvalidation, txSession, useAppConfig`. `UiWalletAccount` como tipo desde la raíz de `@mysten/dapp-kit-react` (V-5) |
| API pública | ✅ `useExecuteTransaction<T>(view)` → `{ stage, outcome, execute }`; exporta `TxStage`, `UseExecuteTransaction`, `CONNECT_WALLET_MESSAGE` y `PREPARE_FAILED_PREFIX` |
| Tests T3-1..T3-9 | ✅ Seis nuevos en `useExecuteTransaction.test.tsx` y uno en `txSession.test.ts`, que cubren los nueve casos de §5. La mutación "etapa sin clave" rompe T3-2/T3-3 y "firma sin `account`" rompe T3-4/5/9. Los dos mutantes equivalentes están bien argumentados: `MutationObserver.mutate` usa las opciones del render del clic, así que el cierre ya apuntaba a A. El fallo real de MINOR-1 era la firma sin `account` y la etapa compartida, y los dos tienen test que muerde |
| LIM | ✅ Comentarios con el porqué (DL-11, V-4); sin código muerto (`useCurrentAccount` y `sender` quitados de `useAcceptGame`/`useCreateGame`); sin `eslint-disable` |
| Gates | ✅ Completos en forma canónica: 841 en 54 archivos (+7), lint y typecheck 0, build 887.24 kB (270.17 kB gzip); `contracts/` y `package*.json` sin delta |
| Docs | ✅ No aplica (TASK-6) |

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

**Desviaciones 1-4:** aceptadas.
1. **Chequeo de cuenta antes de `invalidateAction`:** sin cuenta no hay nada que invalidar ni digest. El camino es el
   mismo de antes y lo fijan T3-7 y el test viejo de "Conecta tu wallet".
2. **`currentAccount`:** nombre interno para no tapar la `account` de las variables.
3. **Archivos de §4 sin tocar** (`useCancelGame`, `useRejectGame`, `useAcceptGame.test`, `useCreateGame.test` y los dos
   `.machine.test`): la lista del handoff era el máximo permitido, no una obligación. Siguen en verde sin cambios, que es
   la mejor señal de que la regresión está intacta.
4. **T3-6 con `stage: 'done'`:** la etapa es la de A, que terminó última; con `outcome: null`, `TransactionStatus` no
   dibuja nada. Es el límite (b) de DL-11 y queda documentado en el test.

**Riesgos del DEV:** el 1 (wallet que ya no expone la cuenta) sigue en RM-9 para #17. El camino es el del test existente
de rechazo sin digest. El 2 (`myGames` en la tabla de invalidación) es TASK-4.

### Siguiente paso: TASK-4 autorizado, con `HANDOFF_MY_GAMES` v1.2

Incluye MINOR-1 de la v1.1 (`extendPins` sobre `mergeMyGames`; `useState(() => new Map())`). El gate de la app parte de
841 tests en 54 archivos y build de 887.24 kB.

### Mensaje de commit propuesto

```
app: sign with the captured account and key the stage by target (#13)

Fixes MINOR-1 of the #12 integration review: execute captures the account and
the target hash in the mutation variables, so preflight, wallet signing (with
an explicit account), interpret(result, signer) and invalidation all use the
clicking account. The stage is keyed by target, so another account sees idle
and the original sees its stage and result again. NIT-1: TxAction, TxOutcome,
TxResult, TxPrecheckStop and ExecuteInput move to txSession.ts, breaking the
type import cycles. No existing assertion changed; app 841 tests in 54 files.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

El del reporte del DEV, sin cambios.

## TASK-4

## Task completado: HANDOFF_MY_GAMES v1.2 — TASK-4 (hooks de "mis partidas")

### Branch (con SHA corto del HEAD)
`feature/issue-13-my-games` @ `e0d242e`. Sin commits: los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- **Nuevos:**
  - `app/src/hooks/useMyGames.ts`
  - `app/src/hooks/useAccountTxBusy.ts`
  - `app/src/hooks/useMyGames.test.tsx`: incluye también los tests de `useAccountTxBusy`.
- **Modificados:**
  - `app/src/hooks/queryKeys.ts`
  - `app/src/hooks/txInvalidation.ts`
  - `app/src/hooks/txInvalidation.test.ts`
  - `app/src/hooks/useExecuteTransaction.test.tsx`
  - `app/src/hooks/useAcceptGame.test.tsx` y `app/src/hooks/useCancelGame.test.tsx` (Desviación 1)
- No toqué `sui/`, `components/`, `pages/` ni la máquina de TASK-3. Tampoco `app/src/test/scanHarness.ts`.

### Qué se implementó (3 líneas máx)
- **Claves e invalidación:** `queryKeys` suma `myGames`/`myActivity`/`myInvitations` con la dirección normalizada. `transactionInvalidations` agrega `myGames` de la cuenta **al final** de `invalidate` en las cuatro acciones.
- **`useMyGames`:** dos `useInfiniteQuery` que esperan la cota de la publicación. Cada fuente tiene su `MyGamesSource`, que separa la primera carga de la relectura (DL-17). El fijado es `mergeMyGames` → `extendPins(pins, merged, address)` con `if (next !== pins) setPins(next)`. `refresh` reinicia los pins.
- **`useAccountTxBusy`:** `useIsMutating` con la clave de la cuenta; sin cuenta devuelve `false`.

### Tests y gates (output pegado, por área tocada)

**Tests nuevos:**

| Test | Archivo | Qué verifica |
|---|---|---|
| T4-1 | `txInvalidation.test.ts` (+9) | Las cuatro acciones con cuenta (escrita en mayúsculas) terminan con `myGames` de esa cuenta, una sola vez. Sin cuenta, ninguna incluye `myGames` ni `balance`. `myGames`/`myActivity`/`myInvitations` comparten prefijo con la dirección normalizada |
| T4-3 | `useMyGames.test.tsx` | Sin cuenta ⇒ `{ kind: 'no_account' }`. 0 llamadas a los fetchers y a `ledgerService.listEvents`/`getObjects` |
| T4-4 | `useMyGames.test.tsx` | `loading` mientras se espera la publicación y la primera página. `retrying` `{ attempt: 2, max: 3 }` y después `ready` con sus filas. Error de la publicación en las dos fuentes, sin pedir eventos |
| T4-5 | `useMyGames.test.tsx` | Error no transitorio de la actividad ⇒ esa fuente queda en `error`; las invitaciones, `ready` con su fila y `unreadableEvents` |
| T4-6 | `useMyGames.test.tsx` | Con datos, una relectura en reintento ⇒ `ready` con `refreshing: true`, `refreshRetrying` `{ 2, 3 }` y secciones intactas. Una relectura fallida ⇒ `refreshError`, secciones intactas. `retry` relee solo esa fuente |
| T4-7 | `useMyGames.test.tsx` | "Cargar más" de cada fuente con su cursor, sin pedir la otra. Un error no `stalled` deja `hasNextPage: true`, `ready` y `refreshError: null`. `PaginationStalledError` ⇒ `stalled` y `hasNextPage: false`. `history_pruned` ⇒ `end`/`lowerBound` de la última página |
| T4-8 | `useMyGames.test.tsx` | Las dos lecturas de G se resuelven en el mismo `act` (actividad `Resolved` v415 e invitaciones `Pending` v4) ⇒ G va a `finished` y queda fijada. Una relectura que solo la trae como invitación pendiente no la mueve |
| T4-8 bis | `useMyGames.test.tsx` | Invitación `Pending` → `invalidateQueries(myGames)` la trae `Resolved` ⇒ sigue en `invitations` (rol `acceptor`, estado `resolved`). `refresh` la pasa a `finished` |
| T4-9 | `useMyGames.test.tsx` | Una relectura sin IDs nuevos: 1 render. La misma con dos IDs nuevos: 2 renders (+1; el límite es ≤ +2). Un `advance` más: 0 renders, sin bucle |
| T4-10 | `useMyGames.test.tsx` | Al cambiar de cuenta, los fetchers piden con la dirección nueva, las claves son distintas (las dos quedan en el caché) y las secciones son solo de la cuenta nueva |
| T4-11 | `useMyGames.test.tsx` | Mutación en curso de la cuenta ⇒ `true`, y `false` al terminar. De otra cuenta ⇒ `false`. Sin cuenta ⇒ `false`. Esa misma cuenta escrita en mayúsculas ⇒ `true` |
| Extra | `useMyGames.test.tsx` | `refresh` vuelve a pedir una publicación fallida y a la primera página. `refetchOnWindowFocus: false` en las dos queries |

**Conteo por archivo:**
- `txInvalidation.test.ts`: 7 → 16.
- `useMyGames.test.tsx` (nuevo): 0 → 19.
- Resto: sin delta.
- **Total: 841 → 869** (54 → 55 archivos).

**T4-2: aserciones que cambian a propósito.** Solo se agrega `myGames` al final de la lista esperada de claves invalidadas.
- `useExecuteTransaction.test.tsx`: una constante nueva, `MY_GAMES = queryKeys.myGames('localnet', PKG, SENDER)` (`:133`), y 12 líneas:
  - `:202-204`: casos create/cancel/reject de "invalidates exactly the keys of %s, none immutable";
  - `:318`: "maps a real SimulationError of the fixture, applies the action invalidations and never opens the wallet";
  - `:369`: "is unconfirmed and still invalidates when the wallet returns a digest and confirmation times out";
  - `:378`: "is unconfirmed (never failure) and still invalidates when the node answer is malformed after the wallet digest";
  - `:391`: "fails with the effects message, digest and cost when the node says failure although the wallet said success";
  - `:401`: "succeeds with value null when interpret throws after the node confirmed (NIT-1), with normal invalidations";
  - `:428`: "succeeds with indexed false and still invalidates when the checkpoint never comes";
  - `:449`: "still invalidates when the component unmounts during confirming";
  - `:470`: "maps the SDK MoveAbort text of the wallet error and refreshes the data of the action";
  - `:575`: T3-4 "signs, interprets and invalidates with the account captured at the click…".
- `txInvalidation.test.ts`: las tres listas de create, cancel/reject y accept suman `MY_GAMES`. Los títulos de esos tres tests ahora dicen "… and my games".
- `useAcceptGame.test.tsx:156` y `useCancelGame.test.tsx:109`: suman `queryKeys.myGames(...)` al final (Desviación 1).
- Ninguna otra aserción cambió. La `:283` (claves del precheck, `[houseKey]`) sigue igual.

**Verificación extra (mutaciones sobre `useMyGames.ts`).** Hice seis cambios de a uno; todos los atrapa algún test, y después restauré el archivo (`cmp` igual):

| Mutación | Tests que fallan |
|---|---|
| Pins sin `mergeMyGames` (invitaciones primero) | T4-8 |
| `status` como en el lobby | 3 tests de T4-6/T4-7 |
| `refresh` sin reiniciar pins | T4-8 bis |
| `hasNextPage` sin `!stalled` | T4-7 stalled |
| `refreshError` siempre `null` | T4-6 |
| Sin el `setPins` | T4-8 y T4-8 bis |

**Gates:**
- **Contracts:** no aplica. `git diff --exit-code -- contracts/` da 0.
- **App, gate completo en forma canónica:**
```text
v26.13.0
e0d242e

added 293 packages, and audited 295 packages in 21s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 18s

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


 Test Files  55 passed (55)
      Tests  869 passed (869)
   Start at  00:28:17
   Duration  34.12s (environment 62%, import 12%, tests 10%, setup 10%, transform 6%, worker 1%)

Environment  jsdom was created 55 times · 198.29s total, 62% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 590 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-ChanOWIz.js   887.49 kB │ gzip: 270.24 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.54s
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/hooks/queryKeys.ts
 M app/src/hooks/txInvalidation.test.ts
 M app/src/hooks/txInvalidation.ts
 M app/src/hooks/useAcceptGame.test.tsx
 M app/src/hooks/useCancelGame.test.tsx
 M app/src/hooks/useExecuteTransaction.test.tsx
?? app/src/hooks/useAccountTxBusy.ts
?? app/src/hooks/useMyGames.test.tsx
?? app/src/hooks/useMyGames.ts
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```

**Delta contra el baseline (TASK-3):**
- Tests: +28, y +1 archivo de test.
- Build: 887.24 → 887.49 kB (270.17 → 270.24 kB gzip). Lo que suma son las claves y la invalidación; `useMyGames` todavía no lo importa la app.
- Lint, typecheck y auditorías: sin delta.
- `package*.json` y `contracts/`: sin cambios.

**Lint:** 0, sin `eslint-disable`. `react-hooks/set-state-in-render` no marca el `setPins` condicional (V-7). No hay `useRef` ni `useEffect` en `useMyGames`.

**Greps sobre `git diff` y los 3 archivos nuevos:**
- Claves, rutas personales, `console.` y `eslint-disable`: vacíos.
- Hex de 40-64: vacío. Las direcciones de test se arman con `'ab'.repeat(32)` y equivalentes.

**Tablas de contrato y `app/src/sui/`:** no aplica.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica en este task (§6). Las listas reales se ven en el smoke del ciclo (pasos 5-17).

### Desviaciones del handoff
1. **`useAcceptGame.test.tsx` y `useCancelGame.test.tsx` no estaban en §4.**
   - **Qué cambió:** como `useExecuteTransaction.test.tsx`, cada uno compara la lista exacta de claves invalidadas, así que fallaban con la tabla nueva. Hice lo mismo que en ese archivo: sumé `myGames` al final de la lista (una línea en cada uno).
   - **Verificación extra:** ninguna otra aserción cambió (`git diff -U0`: 0 líneas borradas en los dos).
2. **Sin cuenta, las claves usan `0x0`.** Las dos `useInfiniteQuery` se llaman siempre (reglas de hooks), con `enabled: false` y la dirección `0x0` (constante `NO_ACCOUNT_KEY_ADDRESS`).
   - **Por qué:** `queryKeys.myActivity`/`myInvitations` piden una dirección. La dirección cero no firma transacciones, así que no choca con una cuenta real.
   - **Verificación extra:** T4-3 confirma 0 pedidos. Lo único que se pide sin cuenta es la publicación (`getTransaction`), igual que en el lobby.
3. **`status` con datos y `isFetchingNextPage`.** Con datos, `status` es `{ kind: 'ready', refreshing: isFetching && !isFetchingNextPage }` (§3.3). Durante "cargar más", entonces, `refreshing` es `false`, como en el lobby.

### Riesgos / pendientes
1. **Pins y cambio de cuenta sin remontar.** El estado de pins es el `useState<MyGamesPins>` literal de MINOR-1, sin la cuenta. Si el hook se usara sin `key={address}`, una partida que aparece en las listas de las dos cuentas conservaría el pin de la cuenta anterior.
   - TASK-5 remonta con `<MyGamesView key={address} />` (DL-9), así que en la app no pasa. T4-10 cubre claves y filas, no ese caso.
   - **Opción:** guardar `{ address, pins }` y descartar los pins de otra dirección. Son unas 3 líneas y un test. Lo decide el MID.
2. **Orden de llegada de las dos fuentes.** T4-8 cubre las dos lecturas en el mismo render (MINOR-1). Si las invitaciones llegan en un render **anterior** al de la actividad, G queda fijada en `invitations` con su estado vigente. Es la regla de DL-5 (la sección donde apareció primero) y RM-6 lo menciona; "Actualizar" la reagrupa.
3. **"Actualizando datos…" dura más con reintentos** (RM-12, H-4). `myGames` va al final de `invalidate` y relee en serie todas las páginas cargadas de las dos fuentes, con la política de reintentos. Se documenta en TASK-6.

### Documentación
- READMEs / `agents.md`: no aplica en este task. La tabla de hooks de `app/README.md` (`useMyGames`, `useAccountTxBusy`, claves `myGames` y la invalidación) es de TASK-6.
- **Snippet propuesto para `documents/STATUS.md`:** `| feature/issue-13-my-games (TASK-4 de #13), 2026-11-04 | hooks de "mis partidas" | 🟢 queryKeys myGames/myActivity/myInvitations; myGames al final de invalidate en las cuatro acciones; useMyGames con dos useInfiniteQuery (cota de la publicación, sin refresco al foco), MyGamesSource por fuente (primera carga separada de la relectura, DL-17), fijado mergeMyGames → extendPins con setState condicional (≤ 1 render extra medido), refresh reinicia pins; useAccountTxBusy. App 869/55 (+28), lint/typecheck 0, build 887.49 kB |`
=====

---

## Revisión TASK-4: NO PASA (2 correcciones chicas, sin cambios de diseño)

Revisé el reporte contra el diff real partiendo de `e0d242e`: 6 archivos modificados y 3 nuevos en `app/src/hooks/`.
Lo contrasté con `HANDOFF_MY_GAMES` v1.2, TASK-4, con `documents/ESTANDARES.md` y con el `@tanstack/query-core` instalado.
La mayor parte está bien. Dos puntos se corrigen antes de TASK-5, porque TASK-5 conecta estas APIs a la UI.

**Foco 1: DL-7, orden y sin claves extra.** ✅ `txInvalidation.ts`:
- crear: `[balance, myGames]`;
- cancelar y rechazar: `[game, balance, myGames]`;
- aceptar: `[game, balance, house, myGames]`;
- `reset` sigue `[lobby]`;
- sin cuenta, ni `balance` ni `myGames`;
- `myGames` = `['sui', red, 'myGames', pkg, normalizeSuiAddress(cuenta)]` y las dos fuentes son sub-claves.

En los tests, las líneas borradas son solo las listas esperadas viejas de `txInvalidation.test.ts` y
`useExecuteTransaction.test.tsx`, reemplazadas por las mismas con `myGames` al final. Las de `useAcceptGame.test.tsx` y
`useCancelGame.test.tsx` solo suman la clave (Desviación 1). Ninguna otra aserción cambia.

**Foco 2: DL-17.** ✅ `toSource` separa la primera carga (`deriveReadStatus` de la publicación o de la query) de la
relectura con datos:
- `status: ready`;
- `refreshRetrying` solo con `fetching`, `failureCount > 0` y sin "cargar más";
- `refreshError` = `isRefetchError` (V-6);
- `nextPageError`/`stalled` como el lobby, y `hasNextPage` sin `stalled` (H-1: un error no `stalled` deja el botón).

T4-6 y T4-7 lo fijan, y las mutaciones dirigidas muerden.

**Foco 3: fijado sin bucle.** ✅
- `merged = mergeMyGames(...)` → `extendPins(pins, merged, address)` → `if (next !== pins) setPins(next)`, condicional
  (V-7);
- `groupMyGames` usa `next` en el mismo render y deduplica con la misma regla (MINOR-1 de la v1.1);
- converge: tras el `setPins`, `extendPins` devuelve la misma instancia;
- T4-9 mide 1 render sin IDs nuevos, 2 con IDs nuevos y 0 en el siguiente;
- `useState(() => new Map())` perezoso; sin `useRef`, `useEffect` ni `eslint-disable`.

**Foco 4: Desviación 2 (`0x0` sin cuenta).** ✅ Aceptada.
- Las dos queries quedan con `enabled: false` y no piden nada (T4-3), y el hook sale con `no_account` antes de exponer
  `retry`/`loadMore`/`refresh`.
- La clave de la dirección cero no colisiona con ninguna cuenta que firme.
- `transactionInvalidations` sin cuenta no agrega `myGames`, así que esa clave nunca se invalida.
- `skipToken` habría sido equivalente; no hace falta cambiarlo.

| Revisión | Resultado |
|---|---|
| Implementa lo pedido (§3.1-§3.4) | ✅ salvo C-1 |
| Capas / PROY-14 | ✅ `hooks/` solo con `@tanstack/react-query`, la raíz del kit y `sui/`; lecturas con `useInfiniteQuery`; `refetchOnWindowFocus: false` (DL-13) |
| Tests T4-1..T4-11 | ✅ 841 → 869 (+28), 54 → 55 archivos; seis mutaciones atrapadas |
| Gates | ✅ Completos en forma canónica: lint y typecheck 0, 869/55, build 887.49 kB (270.24 kB gzip); `contracts/` y `package*.json` sin delta |

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| C-1 (MINOR) | PROY-16, DL-17 (y el patrón de `useLobby.refresh`) | `app/src/hooks/useMyGames.ts:91-93` (`retry`) y `:72` (`status` desde la publicación) | Si falla la lectura de la publicación (la cota), las dos fuentes muestran el error de la publicación (`:72`), y TASK-5 conecta su `ReadState` a `source.retry`. Pero `retry` hace `query.refetch()`, que **ignora `enabled: false`** (`@tanstack/query-core/build/modern/queryObserver.js:211-270`: `refetch` → `fetch` → `query.fetch` sin mirar `enabled`). Resultado: (1) "Reintentar" **no** vuelve a pedir la publicación, así que el error no se va nunca; (2) dispara el escaneo con `publishCheckpoint: null`, con una cota que no es la de la publicación | `retry` = `publish.isSuccess ? query.refetch() : publish.refetch()`. **Test nuevo T4-12:** con la publicación fallando, `activity.retry()` ⇒ `getTransaction` otra vez y **0** `listEvents`; cuando la publicación responde, las dos fuentes cargan con la cota de la publicación |
| C-2 (Riesgo 1 del DEV, **aceptado**) | DL-5, DL-9 (defensa en el hook) | `app/src/hooks/useMyGames.ts:110, 145-147, 159` | Los `pins` no guardan la cuenta, así que la corrección del hook depende de que la vista se remonte con `key={address}`. Se aplica el mismo criterio que en la v1.2 del handoff de #12 (M-2 (c)): la regla queda en el hook y no en cada vista que lo use. El costo es mínimo | Estado `{ address: string \| null; pins: MyGamesPins }` (perezoso). Pins efectivos = los guardados si `sameAddress(estado.address, address)` (o los dos `null`); si no, un `Map` vacío. `next = extendPins(efectivos, merged, address)` y un solo `setState` condicional (`next !== estado.pins \|\| la cuenta cambió`) que guarda `{ address, pins: next }`. `refresh` guarda `{ address, pins: new Map() }`. **Test nuevo T4-13:** G aparece para A como creador `Pending` (fijada en `pending`) y para B como invitado `Pending`; sin remontar, se cambia a B ⇒ G en `invitations`; T4-9 sigue sin bucle |

**Desviaciones 1-3:** aceptadas.
1. **`useAcceptGame.test.tsx`/`useCancelGame.test.tsx`:** es la misma aserción exacta de claves de T4-2; solo suman la
   clave al final, sin borrar líneas.
2. **`0x0` sin cuenta:** ver el foco 4.
3. **`refreshing: false` durante "cargar más":** es lo que pide §3.3 y coincide con el lobby.

**Riesgos del DEV:**
- **Riesgo 1:** pasa a C-2.
- **Riesgo 2 (las invitaciones llegan antes que la actividad):** no es un problema en la primera carga.
  - El ítem de invitaciones trae el objeto **vigente**. Una invitación que la cuenta ya aceptó llega `Resolved` con
    `acceptor` = cuenta, y `naturalSection` la manda a `finished` aunque el rol sea `invitee`.
  - Solo se fija en `invitations` lo que se leyó `Pending` al aparecer, que es la regla de DL-5.
- **Riesgo 3:** va a TASK-6 (H-4/RM-12), como estaba previsto.

### Siguiente paso: correcciones al DEV (C-1 y C-2) dentro de TASK-4

Después, reporte con:
- el diff de las correcciones;
- T4-12 y T4-13;
- el gate completo (se espera 871 tests en 55 archivos, lint 0 sin `eslint-disable`).

TASK-5 no arranca hasta que esa revisión pase. El handoff no cambia: la firma pública de `useMyGames` es la misma; solo
cambia la semántica de `retry` y el estado interno.

### Mensaje de commit propuesto (para cuando pase, con C-1 y C-2)

```
app: add the my-games hooks and invalidate them after own transactions (#13)

queryKeys gains myGames/myActivity/myInvitations, and every own transaction
invalidates the account's my-games prefix last (DL-7). useMyGames runs the two
infinite queries behind the publish-checkpoint bound, keeps the first load
apart from refetches so rows never unmount on a failed refetch (DL-17), pins
each game to the section where it first appeared from the deduplicated items
with a conditional setState (no loop), keeps pins per account, and retries the
publish read when it is the failing piece. useAccountTxBusy backs the single
in-flight notice of the page.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-4, correcciones C-1/C-2

> Addendum a la entrega de TASK-4, tras la revisión NO PASA del MID. HEAD `e0d242e`, sin commits. Solo cambian `app/src/hooks/useMyGames.ts` y `app/src/hooks/useMyGames.test.tsx`.

### C-1: `retry` con la publicación sin leer
- **Qué cambió:** con la publicación sin éxito, `retry` vuelve a pedir la publicación (`publish.refetch()`) y no la fuente. Con la publicación lista, relee la fuente como antes.
- **Por qué:** `query.refetch()` ignora `enabled: false`. Así, "Reintentar" nunca volvía a pedir la publicación y disparaba el escaneo con `publishCheckpoint: null`.
- **Tipo:** `toSource` recibe ahora `publish: ReturnType<typeof usePublishCheckpoint>`, que trae `refetch`.

### C-2: los pins guardan su cuenta
- **Estado:** `useState<PinState>(() => ({ address, pins: new Map() }))`, con `PinState = { address: string | null; pins: MyGamesPins }`.
- **Pins efectivos:** los guardados si `isSameAccount(pinState.address, address)`, que usa `sameAddress` (o compara los dos `null`). Si la cuenta es otra, `NO_PINS`, un `Map` vacío de módulo que nunca se muta.
- **Escritura:** `next = extendPins(pins, merged, address)` y un único `setState` condicional, `if (!sameAccount || next !== pinState.pins) setPinState({ address, pins: next })`.
- **Por qué converge:** en el render siguiente la cuenta es la misma y `extendPins` devuelve la misma instancia.
- **`refresh`:** guarda `{ address, pins: new Map() }`.

### Diff de las correcciones (`app/src/hooks/useMyGames.ts`, contra la entrega de TASK-4)
```diff
@@ imports
 import type { HistoryLowerBound } from '../sui/eventScan';
+import { sameAddress } from '../sui/ids';
@@
 const NO_ACCOUNT_KEY_ADDRESS = '0x0';
 
-/** Estado de una fuente (DL-17) a partir de su query y de la publicación (la cota que espera). Pura. */
-function toSource(
-  query: UseInfiniteQueryResult<InfiniteData<MyGamesPage>>,
-  publish: Parameters<typeof deriveReadStatus>[0] & { isSuccess: boolean },
-): MyGamesSource {
+/** Pins de una cuenta que todavía no fijó nada. Nunca se muta (`extendPins` devuelve un `Map` nuevo). */
+const NO_PINS: MyGamesPins = new Map();
+
+/** Los pins con la cuenta a la que pertenecen (C-2 de la revisión de TASK-4): los de otra cuenta no valen. */
+type PinState = { address: string | null; pins: MyGamesPins };
+
+function isSameAccount(a: string | null, b: string | null): boolean {
+  return a === null || b === null ? a === b : sameAddress(a, b);
+}
+
+/**
+ * Estado de una fuente (DL-17) a partir de su query y de la publicación (la cota que espera). `retry` relee la
+ * publicación mientras no esté lista (C-1 de la revisión de TASK-4): `refetch` ignora `enabled: false`, y sin la cota
+ * escanearía con `publishCheckpoint: null`.
+ */
+function toSource(query: UseInfiniteQueryResult<InfiniteData<MyGamesPage>>, publish: ReturnType<typeof usePublishCheckpoint>): MyGamesSource {
@@
     retry: () => {
-      void query.refetch();
+      if (publish.isSuccess) void query.refetch();
+      else void publish.refetch();
     },
@@ JSDoc de useMyGames
- * la sección donde apareció (DL-5) hasta "Actualizar" (`refresh`) o hasta que la página se remonte (cambio de cuenta,
- * DL-9). El fijado se ajusta durante el render (V-7), sin `useEffect` (PROY-14).
+ * la sección donde apareció (DL-5) hasta "Actualizar" (`refresh`) o hasta que cambia la cuenta: los pins guardan su
+ * cuenta y los de otra se descartan, aunque la vista no se remonte (DL-9; C-2 de la revisión de TASK-4). El fijado se
+ * ajusta durante el render (V-7), sin `useEffect` (PROY-14).
@@
-  const [pins, setPins] = useState<MyGamesPins>(() => new Map());
+  const [pinState, setPinState] = useState<PinState>(() => ({ address, pins: new Map() }));
@@
   // MINOR-1 del handoff v1: el pin sale de la lectura ganadora de H-2 (las mismas listas que deduplica `groupMyGames`).
-  // `extendPins` devuelve la misma instancia sin IDs nuevos, así que el `setPins` condicional no entra en bucle (V-7).
+  // Un solo `setState` condicional (V-7) que converge: guardado `{ address, pins: next }`, el render siguiente ve la misma
+  // cuenta y `extendPins` devuelve la misma instancia (sin IDs nuevos).
   const merged = mergeMyGames(activityItems, invitationItems);
-  const next = address === null ? pins : extendPins(pins, merged, address);
-  if (next !== pins) setPins(next);
+  const sameAccount = isSameAccount(pinState.address, address);
+  const pins = sameAccount ? pinState.pins : NO_PINS;
+  const next = address === null ? pins : extendPins(pins, merged, address);
+  if (!sameAccount || next !== pinState.pins) setPinState({ address, pins: next });
@@ refresh
-      setPins(new Map());
+      setPinState({ address, pins: new Map() });
```

### Tests nuevos (`app/src/hooks/useMyGames.test.tsx`, 19 → 21)

**T4-12 (C-1):** "retry re-reads the publish checkpoint without scanning, and both sources load with its bound once it answers".
1. La publicación falla con `INVALID_ARGUMENT`, que no se reintenta. Las dos fuentes quedan en `error` con ese error, y la publicación se pidió 1 vez.
2. `activity.retry()` con la publicación fallando otra vez:
   - la publicación se pide de nuevo (2 veces);
   - las invitaciones siguen en `error`;
   - **0** llamadas a `fetchMyActivityPage`/`fetchInvitationsPage` y **0** a `ledgerService.listEvents`.
3. `invitations.retry()` con la publicación respondiendo `59n`:
   - la publicación se pide por tercera vez;
   - las dos fuentes cargan, y **todas** las llamadas a los fetchers llevan `publishCheckpoint: 59n` (ninguna con `null`);
   - `activity` queda `ready` y aparecen las filas de las dos secciones.

**T4-13 (C-2):** "drops the pins of the previous account when switching without remounting".
1. G está `Pending`; para A llega por la actividad, como creador, y para B por las invitaciones, como invitado.
2. Con A, G está en `pending` (fijada).
3. Cambio a B **sin remontar** (`rerender`):
   - G aparece en `invitations` y `pending` queda vacía;
   - otro `advance` produce 0 renders (sin bucle).
4. Al volver a A (con la dirección en mayúsculas), G vuelve a `pending` e `invitations` queda vacía.

T4-9 sigue verde sin cambios: 1 render sin IDs nuevos, 2 con IDs nuevos y 0 en el siguiente.

**Mutaciones (con `cmp` del archivo restaurado):**
- Revertir C-1 (`retry` = `query.refetch()`) hace fallar solo T4-12.
- Revertir C-2 (`pins = pinState.pins`) hace fallar solo T4-13.

### Gate completo, job `app` (forma canónica)
```text
v26.13.0
e0d242e

added 293 packages, and audited 295 packages in 20s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 15s

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


 Test Files  55 passed (55)
      Tests  871 passed (871)
   Start at  00:36:37
   Duration  34.15s (environment 59%, import 11%, tests 11%, setup 10%, transform 9%, worker 1%)

Environment  jsdom was created 55 times · 187.72s total, 59% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 590 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-ChanOWIz.js   887.49 kB │ gzip: 270.24 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.16s
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/hooks/queryKeys.ts
 M app/src/hooks/txInvalidation.test.ts
 M app/src/hooks/txInvalidation.ts
 M app/src/hooks/useAcceptGame.test.tsx
 M app/src/hooks/useCancelGame.test.tsx
 M app/src/hooks/useExecuteTransaction.test.tsx
 M documents/REPORTES_MY_GAMES.md
?? app/src/hooks/useAccountTxBusy.ts
?? app/src/hooks/useMyGames.test.tsx
?? app/src/hooks/useMyGames.ts
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```

### Resultado
- **Tests:** 869 → **871** (+2: T4-12 y T4-13), en los mismos 55 archivos.
- **Build:** igual, 887.49 kB (270.24 kB gzip). `useMyGames` todavía no lo importa la app.
- **Lint y typecheck:** 0, sin `eslint-disable`. `react-hooks/set-state-in-render` acepta el `setState` condicional.
- **Sin cambios:** `contracts/` y `package*.json`.
- **`git status`:**
  - `documents/REPORTES_MY_GAMES.md` aparece modificado por la revisión del MID; no lo toqué;
  - el resto del árbol es el de la entrega de TASK-4 más estas dos correcciones;
  - `app/src/test/scanHarness.ts` no se tocó.
- **Greps sobre `git diff -- app` y los tres archivos nuevos:** claves, rutas personales, `console.`, `eslint-disable` y hex de 40-64: vacíos.

### Desviaciones
- Ninguna nueva.
- Las dos aserciones extra de T4-13 (no hay bucle tras el cambio de cuenta y la partida vuelve a A con la dirección en otro formato) amplían lo que se pidió. No cambian ninguna aserción anterior.
=====

---

## Re-revisión TASK-4: PASA

Revisé el addendum "TASK-4, correcciones C-1/C-2" contra el código real de `app/src/hooks/useMyGames.ts`. Solo cambian
`useMyGames.ts` y `useMyGames.test.tsx`; el resto del árbol es la entrega ya revisada de TASK-4.

| Corrección | Verificación | Resultado |
|---|---|---|
| **C-1** (`retry` con la publicación sin leer) | `toSource` recibe la query de la publicación entera y `retry` = `publish.isSuccess ? query.refetch() : publish.refetch()`. Mientras la publicación no responda, "Reintentar" relee la cota y no dispara el escaneo, aunque `refetch` ignore `enabled`. T4-12: con la publicación fallando, 0 `listEvents` y la publicación se pide otra vez; cuando responde, todas las llamadas llevan `publishCheckpoint: 59n`. Revertir C-1 rompe solo T4-12 | ✅ |
| **C-2** (pins por cuenta) | Estado `{ address, pins }` perezoso. Los pins efectivos son los guardados solo si `isSameAccount` (`sameAddress`, o los dos `null`); si no, `NO_PINS`, que nunca se muta: `extendPins` devuelve un `Map` nuevo. Un único `setState` condicional, `!sameAccount \|\| next !== pinState.pins`. **Convergencia:** tras guardar `{ address, next }`, el render siguiente ve la misma cuenta y `extendPins` devuelve la misma instancia. Cambiar a "sin cuenta" guarda `{ null, NO_PINS }` y también converge en un render. `refresh` guarda `{ address, new Map() }`. T4-13: sin remontar, G pasa de `pending` (A) a `invitations` (B), con 0 renders extra y de vuelta en A con la dirección en otro formato. T4-9 sigue verde. Revertir C-2 rompe solo T4-13 | ✅ |
| Lint / reglas de hooks | 0 sin `eslint-disable`; el `setState` sigue condicional (V-7); sin `useRef` ni `useEffect` | ✅ |
| Gate | Completo en forma canónica: 871/55 (+2), typecheck 0, build igual (887.49 kB, 270.24 kB gzip); `contracts/` y `package*.json` sin delta | ✅ |
| Greps | Claves, rutas personales, `console.`, `eslint-disable` y hex de 40-64: vacíos (según el reporte; el diff de la corrección no agrega literales) | ✅ |

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

Desviaciones nuevas: ninguna. Las dos aserciones extra de T4-13 amplían la cobertura sin tocar las anteriores.

### Siguiente paso: TASK-5 autorizado, con `HANDOFF_MY_GAMES` v1.2

- El gate de la app parte de 871 tests en 55 archivos y build de 887.49 kB.
- En TASK-5, el `ReadState` de cada sección usa `source.retry`, que ahora relee la publicación cuando hace falta. El pie
  y las notas siguen H-1 y DL-17.

### Mensaje de commit propuesto

```
app: add the my-games hooks and invalidate them after own transactions (#13)

queryKeys gains myGames/myActivity/myInvitations, and every own transaction
invalidates the account's my-games prefix last (DL-7). useMyGames runs the two
infinite queries behind the publish-checkpoint bound, keeps the first load
apart from refetches so rows never unmount on a failed refetch (DL-17), pins
each game to the section where it first appeared from the deduplicated items
with a conditional setState (no loop), keeps pins per account, and retries the
publish read when it is the failing piece. useAccountTxBusy backs the single
in-flight notice of the page. App 871 tests in 55 files.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-5

## Task completado: HANDOFF_MY_GAMES v1.2 — TASK-5 (página "Mis partidas"), con un STOP al MID en T5-13

### Branch (con SHA corto del HEAD)
`feature/issue-13-my-games` @ `fcda3f6`. Sin commits: los cambios están en el árbol de trabajo.

### Archivos modificados/creados
- **Nuevos:**
  - `app/src/pages/MyGamesPage.tsx`, `app/src/pages/MyGamesPage.test.tsx`
  - `app/src/components/MyGamesSection.tsx` (incluye `MyGameRow`), `app/src/components/MyGamesSection.test.tsx`
  - `app/src/components/HistoryTime.tsx`: `CreatedAt` y `FloorSince` sacados de `LobbyList`.
- **Modificados:**
  - `app/src/App.tsx`, `App.test.tsx`
  - `components/Header.tsx`, `Header.test.tsx`
  - `components/GameActions.tsx`, `GameActions.test.tsx`
  - `components/LobbyList.tsx`: solo los imports de `HistoryTime`.
  - `pages/GameDetailPage.tsx`, `GameDetailPage.test.tsx`: texto R-7.
- **Sin tocar:** `sui/`, `hooks/`, `index.css` (no hizo falta CSS), `LobbyList.test.tsx`, `GameDetail*.test.tsx` y `GameActions.machine.test.tsx`.

### Qué se implementó (3 líneas máx)
- **Página:** `#/my-games`, con el enlace "Mis partidas" en el `Header`. Sin cuenta muestra el texto fijo; con cuenta, `<MyGamesView key={address} />`. Arriba van "Actualizar", `IN_FLIGHT_TEXT` una sola vez (`useAccountTxBusy`), "Abrir partida por ID", el enlace al explorador (solo en testnet) y la nota de eventos ilegibles.
- **Secciones:** las tres `MyGamesSection`, con el pie por `sectionFooter` (H-1), las notas de relectura (DL-17) que no desmontan filas y `ReadState` en la primera carga. Las filas muestran contraparte, apuesta, estado, hora, "Ver partida", y rol y resultado en "Terminadas".
- **Acciones:** `GameActions variant="row"`, sin "Conecta tu wallet…" ni aviso `in_flight`, y sin acciones tras un `success` propio o adoptado (H-3). R-7 queda en el detalle.

### Tests y gates (output pegado, por área tocada)

**Tests nuevos, por archivo** (871 → 907, +36):

| Archivo | + | Tests |
|---|---|---|
| `components/MyGamesSection.test.tsx` (nuevo) | 14 | T5-2 (filas de las tres secciones, ilegibles con y sin `data-game-id`), T5-5 sin integración (vacío "en lo revisado" o definitivo con su botón por sección, "Cargar más invitaciones" con filas, sufijo y nota del piso), T5-6 (error sin `stalled`: botón y alert; `stalled`: sin botón y con alert), "Cargando más…", notas DL-17 (`ReadState` sin datos; reintento y error de la relectura con las filas montadas) |
| `pages/MyGamesPage.test.tsx` (nuevo) | 16 | T5-1, T5-3, T5-4 (×2), T5-5 V-9, T5-7 (×2), T5-8 (×2), T5-9, T5-11, T5-12, T5-13 (parcial, ver STOP), T5-15 (×2). Máquina real (`useMyGames`, `useTxTarget`, las acciones, `useExecuteTransaction`); kit, fetchers, publicación y `sui/execution` mockeados |
| `components/GameActions.test.tsx` | 4 | `variant='row'`: sin hint ni `in_flight` (el detalle los conserva); T5-10 (H-3) en fila y en detalle; cancel propio y `reject` adoptado sin acciones; tras un fallo y con "sin confirmar", las acciones siguen |
| `components/Header.test.tsx` | 1 | T5-1: enlace "Mis partidas" → `/my-games` |
| `App.test.tsx` | 1 | T5-1: ruta `/my-games` sin cuenta, con el texto fijo y sin `useLobby`/`useGame` |

**Cobertura de T5-1..T5-16:**
- **T5-1:** en `App.test.tsx` y `Header.test.tsx`, y en la página sin cuenta: 0 llamadas a la publicación y a los fetchers.
- **T5-2:** en las secciones.
- **T5-3:**
  - aceptar desde la fila de la invitación `acceptInvite` de la fixture;
  - sin tokens en `.tx-status`/`.game-actions` en "Confirmando en la red…";
  - "¡Ganaste! Recibiste 0.001950002 SUI (pozo 0.002000002 SUI − comisión 0.00005 SUI)", leído del `GameResolved` real;
  - la fila sigue en "Invitaciones recibidas" con "Resuelta", sin "Aceptar" ni "Rechazar", y nada en "Terminadas".
- **T5-4:**
  - "Partida cancelada: se devolvieron 0.003000003 SUI a tu cuenta", con la fila en "Tus partidas pendientes";
  - "Invitación rechazada: se devolvieron 0.004000004 SUI a quien te invitó".
- **T5-5:** en la página, "Cargar más actividad" está en las secciones 2 y 3. Una página siguiente vacía da los dos textos definitivos, sin botón, sin alert y sin filas.
- **T5-6:** en las secciones.
- **T5-7:**
  - relectura fallida: la fila, su `.game-actions` y el digest siguen montados, con la nota "No se pudo actualizar la lista…"; "Reintentar" la quita;
  - relectura que reintenta: "Reintentando… (intento 2 de 3)" con la fila montada, que al final queda "Resuelta".
- **T5-8:** "1 evento ilegible…" / "3 eventos ilegibles…", sin filas por ellos.
- **T5-9:**
  - dos `click()` en el mismo tick dan 1 `signAndExecuteTransaction` y 1 preflight;
  - todos los botones de todas las filas quedan deshabilitados;
  - `IN_FLIGHT_TEXT` aparece 1 vez en `section.my-games` (0 al terminar).
- **T5-10:** en `GameActions.test.tsx`.
- **T5-11:** el "sin confirmar" bloquea solo su fila; "Ya la revisé" la desbloquea.
- **T5-12:** A en curso → B (sin filas ni texto de A) → A todavía en curso ⇒ el resultado adoptado aparece en la fila.
- **T5-13:** parcial, ver STOP.
- **T5-14:** `GameActions.machine.test.tsx` sin cambios y en verde; los tests existentes de `GameActions.test.tsx` en verde (solo sumé 4).
- **T5-15:**
  - "xyz" ⇒ "ID de partida inválido", sin navegar ni pedir;
  - " 0x6 " ⇒ `/game/0x00…06`;
  - en testnet, enlace `https://suiscan.xyz/testnet/account/<cuenta>` con `target="_blank"` y `rel="noreferrer"`; en localnet no aparece.
- **T5-16:** `GameDetailPage.test.tsx` con el texto R-7.

**Aserciones existentes que cambian:**
- `GameDetailPage.test.tsx:108`: el texto R-7 esperado ("…guárdalo, o encuéntrala en «Mis partidas»").
- `Header.test.tsx`: los dos `render(<Header />)` pasan a `renderHeader()`, que envuelve en `<MemoryRouter>` (Desviación 2). Ninguna expectativa cambia.
- Nada más.

**Verificación extra (mutaciones, cada una restaurada):**

| Mutación | Resultado |
|---|---|
| `in_flight` también en filas | Falla el test de la variante y T5-9 |
| Sin H-3 | Fallan T5-10 y el de cancel/adoptado |
| Sin el aviso de la página | Falla T5-9 |
| Vacío siempre "definitivo" | Fallan 6 tests (T5-5/T5-6) |
| `ReadState` por `status` en vez de `hasData` | No falla nada: es equivalente, porque `useMyGames` con datos siempre da `status: ready` (DL-17, T4-6) |

**Gates:**
- **Contracts:** no aplica. `git diff --exit-code -- contracts/` da 0.
- **App, gate completo en forma canónica:**
```text
v26.13.0
fcda3f6

added 293 packages, and audited 295 packages in 20s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 21s

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


 Test Files  57 passed (57)
      Tests  907 passed (907)
   Start at  00:55:59
   Duration  33.64s (environment 59%, tests 12%, import 11%, setup 10%, transform 7%)

Environment  jsdom was created 57 times · 185.83s total, 59% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-BWWierZp.js   900.93 kB │ gzip: 273.44 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 797ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/App.test.tsx
 M app/src/App.tsx
 M app/src/components/GameActions.test.tsx
 M app/src/components/GameActions.tsx
 M app/src/components/Header.test.tsx
 M app/src/components/Header.tsx
 M app/src/components/LobbyList.tsx
 M app/src/pages/GameDetailPage.test.tsx
 M app/src/pages/GameDetailPage.tsx
?? app/src/components/HistoryTime.tsx
?? app/src/components/MyGamesSection.test.tsx
?? app/src/components/MyGamesSection.tsx
?? app/src/pages/MyGamesPage.test.tsx
?? app/src/pages/MyGamesPage.tsx
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```

**Delta contra el baseline (TASK-4 + C-1/C-2):**
- Tests: +36 tests y +2 archivos.
- Build: 887.49 → **900.93 kB** (270.24 → 273.44 kB gzip). Ahora la app importa la página, `useMyGames` y la capa `sui/myGames`. El aviso de chunk es el mismo de #15.
- Lint, typecheck y auditorías: sin delta.
- Sin cambios: `contracts/`, `package*.json`, `sui/` y `hooks/`.

**Capas:** `components/` y `pages/` no importan `@mysten/*`; los tests mockean el kit sin importarlo. Las reglas viven en `sui/` (`sectionFooter`, `groupMyGames`, `playerResult`, `resolutionAmounts`, `parseObjectIdInput`, `explorerAccountUrl`) y en `hooks/` (ARQ-2).

**Greps sobre `git diff -- app` y los 5 archivos nuevos:** claves, rutas personales, `console.`, `eslint-disable` y hex de 40-64: vacíos.

**Tablas de contrato y `app/src/sui/`:** no aplica.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica en este task: el smoke del ciclo va después de TASK-6. No hay captura.

### STOP al MID: T5-13, la sección al volver a la cuenta A
- **Qué pide T5-13:** "A en curso → B → A ya terminada ⇒ sin resultado; la partida con su estado leído del nodo **en su sección natural**" (DL-9, MINOR-6: "porque `pins` se reinició").
- **Qué pasa:** en el test, G es la partida abierta de A, cancelada mientras se veía B.
  1. La invalidación de DL-7 corre con la clave de A mientras sus queries están inactivas; TanStack las marca como viejas y no las relee.
  2. Al volver a A, la vista se remonta y los pins arrancan vacíos.
  3. El **primer render usa los datos de A en caché**, con G todavía `Pending`, y `extendPins` fija G en `pending`.
  4. La relectura al montar trae G `Cancelada`, pero G **ya está fijada** y se queda en "Tus partidas pendientes".
- **Evidencia (sonda temporal en el test, restaurada):** la fila queda en `where: ['pending']` con el texto "Abierta · 0.003000003 SUI · Cancelada · — · Ver partida". Los fetchers de actividad se llaman en el orden A, B, A.
- **Qué afirma hoy T5-13** (verde): sin resultado ("Partida cancelada: se devolvieron…" ausente), la fila con "Cancelada" (estado del nodo), sin "Cancelar" y sin etapas. **No afirma la sección.**
- **Por qué es STOP:** la causa es el fijado de `hooks/useMyGames.ts` (TASK-4), y TASK-5 no toca `hooks/`.

| Opción | Cambio | Trade-off |
|---|---|---|
| **(a)** Aceptar el comportamiento | Ninguno en el código; T5-13 afirma `pending` + "Cancelada" + sin acciones; el texto de DL-9/MINOR-6 se ajusta ("en la sección donde estaba en la caché; 'Actualizar' la reagrupa") | Cero riesgo. La fila terminada queda en "pendientes" hasta "Actualizar" |
| **(b) (recomendada)** No fijar desde una lectura que se está refrescando | En `useMyGames`, `extendPins` solo recibe ítems de una fuente que no está releyendo (`!(isFetching && !isFetchingNextPage)`). Mientras tanto, esas filas van a su sección natural sin pin. ~3 líneas, un test en `useMyGames.test.tsx` y T5-13 con la sección | Cumple DL-9 tal como está escrito. Las filas ya fijadas no cambian, así que DL-5 tras una acción propia sigue igual. Una fila nueva que aparece durante una relectura se fija al terminarla. Hay que re-correr T4-8/T4-8 bis/T4-9 |
| (c) Reiniciar las queries al remontar | `resetQueries(myGames)` al montar la vista | Pierde las páginas de "cargar más" y obliga a un efecto (PROY-14). No lo recomiendo |

### Desviaciones del handoff
1. **`components/HistoryTime.tsx` nuevo.**
   - **Qué:** `CreatedAt` y `FloorSince` salieron de `LobbyList.tsx`, que solo cambia sus imports. `CreatedAt` suma `className` opcional, con `lobby-time` por defecto; las filas nuevas usan `my-game-time`.
   - **Por qué:** §3.3 lo permite ("extraerlos a un componente común").
   - **Verificación:** `LobbyList.test.tsx` y `App.test.tsx` en verde sin cambios en `LobbyList.test.tsx`.
2. **`Header.test.tsx` renderiza dentro de `MemoryRouter`.** El `Link` del encabezado necesita un router. Solo cambia el render (un helper `renderHeader`); ninguna expectativa cambia.
3. **Detalles de la UI que el handoff no fijaba:**
   - el rol "Creaste"/"Aceptaste" y la contraparte se deciden con el objeto (`creator`/`acceptor` = cuenta), no con el rol del evento, porque una invitación aceptada puede llegar solo por las invitaciones;
   - el texto de una cancelada va dentro de `.my-game-result`;
   - "Cargando más…" es un `role="status"` aparte del botón, como en el lobby.
4. **T5-3:** los tokens se verifican en la etapa "Confirmando en la red…". La preflight y la firma pasan sin dar tiempo a medirlas, porque sus mocks resuelven enseguida. El smoke (paso 8) mide las tres etapas.
5. **T5-13 sin la sección:** ver STOP.

### Riesgos / pendientes
1. **El STOP de T5-13**, arriba.
2. **Bundle:** +13.4 kB, ahora que la página entra en la app (RM-10, #15).
3. **Sin CSS nuevo.** Las clases nuevas (`my-games`, `my-games-section`, `my-game-row`, `my-game-result`, `my-games-note`, `my-game-time`, `open-game-by-id`) usan los estilos por defecto. Si el smoke muestra algo ilegible, se suman estilos mínimos en TASK-6.

### Documentación
- READMEs / `agents.md`: no aplica en este task. El mapa de `components/`/`pages/` y la ruta `#/my-games` de `app/README.md` son de TASK-6.
- **Snippet propuesto para `documents/STATUS.md`:** `| feature/issue-13-my-games (TASK-5 de #13), 2026-11-04 | página "Mis partidas" | 🟡 #/my-games + enlace en el Header; tres secciones con sectionFooter (H-1), notas DL-17 sin desmontar filas, nota de ilegibles; GameActions variant='row' (sin hint ni in_flight; sin acciones tras success, H-3); IN_FLIGHT_TEXT una vez por página; "Abrir partida por ID" y enlace al explorador (testnet); R-7; key={address}. STOP T5-13 (sección al volver a la cuenta con datos en caché) pendiente del MID. App 907/57 (+36), lint/typecheck 0, build 900.93 kB |`
=====

---

## Revisión TASK-5: NO PASA, por el STOP de T5-13 (decidido: opción (b), handoff v1.3)

Revisé el reporte contra el diff real partiendo de `fcda3f6`: 9 archivos modificados y 5 nuevos en `app/src/`. Lo
contrasté con `HANDOFF_MY_GAMES` v1.2, TASK-5, y con `documents/ESTANDARES.md`. La UI está bien. Lo único que falta es el
criterio de T5-13, que depende de un cambio en `hooks/useMyGames.ts` (el STOP). Ese cambio se especifica abajo y en la
v1.3 del handoff.

| Revisión | Resultado |
|---|---|
| Implementa lo pedido (§3.1-§3.6) | ✅ Ruta `my-games` y `<Link>` "Mis partidas" en el `Header`; página sin cuenta con el texto fijo y sin consultas; `<MyGamesView key={address} />` con "Actualizar", `IN_FLIGHT_TEXT` una vez (`useAccountTxBusy`), "Abrir partida por ID" (`parseObjectIdInput`, inválido sin navegar), enlace al explorador solo si `explorerAccountUrl` no es `null` (`target="_blank"`, `rel="noreferrer"`) y la nota de ilegibles; tres `MyGamesSection` con `ReadState` solo sin datos, notas DL-17 sin desmontar filas, pie por `sectionFooter` (H-1) y "Cargar más actividad" en las secciones 2 y 3; `MyGameRow` con los textos fijos de §1 y `.my-game-result` solo en "Terminadas"; texto R-7 |
| `GameActions` | ✅ `variant='row'` quita solo el hint de "Conecta tu wallet…" y el `in_flight`; `settled` (H-3) solo en filas y con `success` propio o adoptado (un fallo o un "sin confirmar" dejan las acciones); `variant='detail'` idéntico, con `GameActions.machine.test.tsx` en verde sin tocar |
| ARQ-1/ARQ-2, capas | ✅ Sin `@mysten/*` en `components/`/`pages/`. Las reglas (secciones, pie, resultado, montos, IDs, explorador) salen de `sui/` y `hooks/`; los componentes solo eligen textos |
| SEG-9 / SEG-10 | ✅ ID validado y normalizado antes de navegar. El resultado de la fila solo sale de la confirmación del nodo (T5-3, sin tokens en "Confirmando en la red…"). "Terminadas" lee el resultado del objeto (`playerResult`, `resolutionAmounts` etiquetado) |
| Tests | ✅ 871 → 907 (+36), 55 → 57 archivos. T5-1..T5-16 cubiertos, salvo la sección en T5-13. Las únicas aserciones viejas que cambian son el texto R-7 (`GameDetailPage.test.tsx:108`) y el render del `Header` dentro de `MemoryRouter`, sin cambiar expectativas. Las mutaciones dirigidas muerden, y la equivalente (`ReadState` por `status` o por `hasData`) está bien argumentada |
| Gates | ✅ Completos en forma canónica: lint y typecheck 0 sin `eslint-disable`, 907/57, build 900.93 kB (273.44 kB gzip; +13.4 kB porque la página entra en la app, RM-10/#15); `contracts/` y `package*.json` sin delta |

**Desviaciones 1-4:** aceptadas.
1. **`HistoryTime.tsx`:** §3.3 lo permitía. `LobbyList` solo cambia sus imports y `LobbyList.test.tsx` no se tocó. Se
   suma a §4 en la v1.3.
2. **`Header.test.tsx` con `MemoryRouter`:** el `Link` necesita un router; ninguna expectativa cambia.
3. **Detalles de UI:**
   - rol y contraparte desde el objeto: es lo correcto, porque una invitación aceptada puede llegar solo por las
     invitaciones;
   - la cancelada dentro de `.my-game-result`;
   - "Cargando más…" aparte, como en el lobby.
4. **T5-3 mide tokens solo en "Confirmando en la red…":** con mocks que resuelven al instante es lo medible. El paso 8 del
   smoke mide las tres etapas.

**NIT (sin corrección):** con un error de "cargar más" de la actividad, el `role="alert"` y el botón salen en las
secciones 2 y 3. Es lo que fija H-1 por sección, y se acepta.

### Decisión del STOP de T5-13: opción (b), refinada (H-5 del handoff v1.3)

> Decisión (2026-11-04): se optó por (b), no fijar mientras alguna fuente está pidiendo, sobre (a) aceptar el
> comportamiento y (c) `resetQueries` al montar. El motivo: el caso del STOP no es solo el cambio de cuenta. Pasa
> también al volver a la página después de actuar en el detalle (la invalidación marca la caché vieja sin releerla), y
> con (a) la fila terminada quedaría en "pendientes" en el uso común, contra DL-5/DL-9. La decisión es interna de diseño,
> sin impacto de producto; la tomó el MID.

**Qué implementa el DEV** (en `hooks/useMyGames.ts`, como corrección de TASK-4 dentro de esta vuelta de TASK-5):
- **Condición:** `const settled = !activityQuery.isFetching && !invitationsQuery.isFetching;` y
  `const next = address === null || !settled ? pins : extendPins(pins, merged, address);`. Es más simple que la
  propuesta del DEV (no excluye "cargar más"): esperar a que las **dos** fuentes estén quietas conserva MINOR-1 (el pin
  sale de la deduplicación de las dos), y durante "cargar más" no hay nada nuevo que fijar hasta que la página llega.
- **No cambian:** C-2 (pins por cuenta, un solo `setState` condicional) ni `groupMyGames` con `pins: next`. Las filas sin
  pin van a su sección natural y las ya fijadas no se mueven.

**Tests:**
- **Nuevos en `useMyGames.test.tsx`:**
  - **T4-14:** caché vieja al montar. G fijada en `pending`, desmontar, invalidar y responder `Cancelled`, montar otra
    instancia ⇒ el primer render la muestra en `pending` sin pin; al terminar la relectura, `finished` fijada; un render
    más no la mueve.
  - **T4-15:** sin pins mientras una fuente pide. G fijada en `invitations` no se mueve, y H, nueva durante la relectura,
    se ve en `pending` sin pin y queda fijada al terminar.
- **Re-correr sin cambiar lo que afirman:** T4-8, T4-8 bis, T4-9, T4-12 y T4-13. En T4-9 el conteo de renders puede
  moverse ±1: si cambia, se ajusta con la medición pegada, manteniendo "≤ 2 extra" y "0 en el siguiente `advance`".
- **En la página:**
  - **T5-13:** afirma la **sección**: tras la relectura del montaje, G en `section[data-section="finished"]` con
    "Cancelada: la apuesta volvió a quien la creó", fuera de "Tus partidas pendientes", sin "Cancelar" y sin
    "Partida cancelada: se devolvieron…".
  - **T5-17 (nuevo):** volver a la página tras una acción fuera de ella ⇒ G, la invitación aceptada, en "Terminadas" con
    "Aceptaste".
  - **T5-12** sigue verde. Con mocks que resuelven al instante, la relectura del montaje termina antes que la transacción,
    y la fila queda fijada en "Invitaciones recibidas" antes del resultado.

**Límite que se acepta (RM-14):** si se actúa sobre una fila sin pin mientras la relectura del montaje dura más que toda
la transacción (nodo lento), la fila puede pasar a "Terminadas" al terminar y se pierde su `TransactionStatus`. El
resultado sigue leído del objeto (SEG-10). En el caso normal, la relectura (≈ 0,1-0,5 s) termina antes que la
confirmación (≈ 1 s). Se documenta en TASK-6.

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| C-1 | DL-5, DL-9 (H-5 del handoff v1.3) | `app/src/hooks/useMyGames.ts` (cálculo de `next` antes del `setPinState`) | Al remontar con datos viejos en la caché, el fijado usa el estado viejo y la relectura ya no reagrupa (STOP de T5-13) | La condición `settled` de arriba, más T4-14, T4-15, T5-13 con la sección y T5-17 |

### Siguiente paso: correcciones al DEV (C-1), con `HANDOFF_MY_GAMES` v1.3

- **Archivos permitidos:** `hooks/useMyGames.ts`, `hooks/useMyGames.test.tsx` y `pages/MyGamesPage.test.tsx`, más
  `MyGamesSection.test.tsx` solo si hace falta.
- **Reporte:** addendum con el diff, los tests nuevos o rehechos, la mutación (sin `settled` ⇒ fallan T4-14 y T5-13) y
  el gate completo.
- Al pasar, TASK-4 y TASK-5 van en commits separados o en uno solo. Lo decide el orquestador; abajo va el mensaje del de
  TASK-5 con la corrección.

### Mensaje de commit propuesto (para cuando pase)

```
app: add the my-games page with per-row actions (#13)

#/my-games, linked from the header, shows received invitations, own pending
games and finished games for the connected account. Each actionable row runs
GameActions in a row variant (one useTxTarget per row, no repeated in-flight
notice, actions hidden after an own success). The page shows the in-flight
notice once, plus an open-by-ID box and, on testnet, the explorer account
link (D-20261103-03). Section footers never claim "none" while history is
left to review, and a failed refetch keeps the rows. Pins now form only when
both sources are idle, so returning to the page regroups with fresh data.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-5, corrección C-1 (H-5)

> Addendum a la entrega de TASK-5, tras la "Revisión TASK-5" y el handoff v1.3. HEAD `ea0a713`, sin commits.
> Archivos tocados: `app/src/hooks/useMyGames.ts`, `app/src/hooks/useMyGames.test.tsx` y `app/src/pages/MyGamesPage.test.tsx`.
> `MyGamesSection.test.tsx` no hizo falta.

### Diff de `app/src/hooks/useMyGames.ts`
```diff
@@ JSDoc de useMyGames
- * la sección donde apareció (DL-5) hasta "Actualizar" (`refresh`) o hasta que cambia la cuenta: los pins guardan su
+ * la sección donde apareció con las dos fuentes quietas (DL-5, H-5) hasta "Actualizar" (`refresh`), hasta que la página
+ * se remonta o hasta que cambia la cuenta: los pins guardan su
@@
   // MINOR-1 del handoff v1: el pin sale de la lectura ganadora de H-2 (las mismas listas que deduplica `groupMyGames`).
+  // H-5 (v1.3): solo se fija con las dos fuentes quietas. Al remontar, la caché puede traer datos que la invalidación de
+  // DL-7 marcó viejos y que TanStack relee recién ahora; fijar con ellos dejaría la fila en la sección vieja. Mientras
+  // alguna fuente pide, las filas sin pin van a su sección natural y las fijadas no se mueven.
   // Un solo `setState` condicional (V-7) que converge: guardado `{ address, pins: next }`, el render siguiente ve la misma
   // cuenta y `extendPins` devuelve la misma instancia (sin IDs nuevos).
   const merged = mergeMyGames(activityItems, invitationItems);
   const sameAccount = isSameAccount(pinState.address, address);
   const pins = sameAccount ? pinState.pins : NO_PINS;
-  const next = address === null ? pins : extendPins(pins, merged, address);
+  const settled = !activityQuery.isFetching && !invitationsQuery.isFetching;
+  const next = address === null || !settled ? pins : extendPins(pins, merged, address);
   if (!sameAccount || next !== pinState.pins) setPinState({ address, pins: next });
```
C-2 (pins por cuenta, un solo `setState` condicional) y `groupMyGames` (`pins: next`) no cambian.

### Tests nuevos y modificados (907 → 910)

**`useMyGames.test.tsx`: 2 nuevos (21 → 23).**
- **T4-14**, "pins with the fresh refetch, not with a stale cache, when a new instance mounts":
  - con una primera instancia, G (`Pending`, como creador) queda en `pending`, y la instancia se desmonta;
  - con el hook desmontado, `invalidateQueries(myGames)` y la respuesta siguiente trae G `Cancelled`;
  - en el **primer render** de la instancia nueva, G está en `pending` desde la caché, sin pin;
  - al terminar la relectura, G pasa a `finished` y `pending` queda vacía;
  - un `advance` más hace **0** renders;
  - una relectura posterior que la trae `Pending` no la saca de `finished` (está fijada ahí).
- **T4-15**, "does not pin a new row while a source is fetching, and keeps the pinned ones":
  - G, una invitación, está fijada en `invitations`;
  - una invalidación trae la actividad (G aceptada y H nueva `Pending` como creador) mientras las invitaciones siguen pidiendo (`refreshing: true`, con un `deferred`);
  - en ese momento H se ve en `pending` sin pin y G sigue en `invitations`;
  - cuando las invitaciones responden, nada se mueve y H queda fijada en `pending`;
  - una lectura posterior con H `Cancelled` la deja en `pending` con el estado `cancelled`, y `finished` sigue vacía.

**`MyGamesPage.test.tsx`: 1 nuevo y 2 modificados (16 → 17).**
- **T5-13 ahora afirma la sección:**
  - G está en `section[data-section="finished"]`, con `.my-game-result` "Cancelada: la apuesta volvió a quien la creó";
  - "Tus partidas pendientes" no tiene filas;
  - no hay "Cancelar" ni "Partida cancelada: se devolvieron…".
  - El título vuelve a "…the game with its read state in its natural section".
- **T5-17 (nuevo)**, "regroups an invitation accepted outside the page":
  1. con B, G está en "Invitaciones recibidas";
  2. "Abrir partida por ID" lleva a `/game/G` y la página se desmonta;
  3. la respuesta nueva es G `Resolved` (aceptada por B) y se hace `invalidateQueries(['sui', 'localnet', 'myGames'])`;
  4. se vuelve con un `Link` del probe a `#/my-games`;
  5. G termina en "Terminadas" con "Aceptaste" y `.my-game-result` "Ganaste", y "Invitaciones recibidas" queda sin filas.
- **T5-12, solo la preparación** (Desviación 1). Antes de cambiar la respuesta del nodo, el test espera `queryClient.isFetching() === 0`, es decir, que termine la relectura del montaje. Lo que afirma no cambia.

### Prueba de que quitar `settled` rompe los tests
Revertí la línea a `const next = address === null ? pins : extendPins(pins, merged, address);` y borré `settled`. Después restauré el archivo (`cmp` igual).
```text
     × pins with the fresh refetch, not with a stale cache, when a new instance mounts (T4-14, H-5)
     × T5-13: A in flight → B → finished while on B → A ⇒ no result; the game with its read state in its natural section
     × regroups an invitation accepted outside the page: back on #/my-games it ends in "Terminadas" with "Aceptaste"
      Tests  3 failed | 37 passed (40)
```
T4-15 no falla con esa reversión: la sección natural de H al aparecer ya es `pending`, así que fijarla durante la relectura da lo mismo. Lo que T4-15 fija es lo que la regla nueva no puede romper: H se ve durante la relectura, G no se mueve y H queda fijada al final.

### Re-corridas sin cambiar lo que afirman
- **T4-8, T4-8 bis, T4-12 y T4-13:** verdes sin cambios.
- **T4-9:** verde sin cambios. Mido otra vez: **1** render sin IDs nuevos y **2** con IDs nuevos, sin delta (forcé la aserción, leí `[1, 2]` y la restauré). Sigue "≤ 2 extra" y "0 renders en el siguiente `advance`".
- **T5-12:** verde, con el cambio de preparación de la Desviación 1.

### Gate completo, job `app` (forma canónica)
```text
v26.13.0
ea0a713

added 293 packages, and audited 295 packages in 1m

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 85s

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


 Test Files  57 passed (57)
      Tests  910 passed (910)
   Start at  01:12:15
   Duration  85.84s (environment 77%, setup 8%, import 7%, tests 4%, transform 4%)

Environment  jsdom was created 57 times · 676.75s total, 77% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-D1gLyKeV.js   900.96 kB │ gzip: 273.46 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 3.62s
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/App.test.tsx
 M app/src/App.tsx
 M app/src/components/GameActions.test.tsx
 M app/src/components/GameActions.tsx
 M app/src/components/Header.test.tsx
 M app/src/components/Header.tsx
 M app/src/components/LobbyList.tsx
 M app/src/hooks/useMyGames.test.tsx
 M app/src/hooks/useMyGames.ts
 M app/src/pages/GameDetailPage.test.tsx
 M app/src/pages/GameDetailPage.tsx
 M documents/REPORTES_MY_GAMES.md
?? app/src/components/HistoryTime.tsx
?? app/src/components/MyGamesSection.test.tsx
?? app/src/components/MyGamesSection.tsx
?? app/src/pages/MyGamesPage.test.tsx
?? app/src/pages/MyGamesPage.tsx
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```
Esta corrida fue más lenta (85 s de Vitest y 1 min de `npm ci`) porque la máquina estaba cargada; los resultados no cambian.

### Resultado
- **Tests:** 907 → **910** (+3: T4-14, T4-15, T5-17), en 57 archivos.
- **Build:** 900.93 → 900.96 kB (273.44 → 273.46 kB gzip).
- **Lint y typecheck:** 0, sin `eslint-disable`.
- **Sin cambios:** `contracts/`, `package*.json`, `sui/` y los componentes.
- **`documents/REPORTES_MY_GAMES.md`:** sale modificado por la revisión del MID; no lo toqué.
- **Greps sobre `git diff -- app` y los archivos nuevos:** claves, rutas personales, `console.`, `eslint-disable` y hex de 40-64: vacíos.

### Desviaciones
1. **Preparación de T5-12.**
   - **Qué cambió:** con H-5, T5-12 fallaba por cómo estaba armado el test. El test cambiaba la respuesta del nodo a "G cancelada" justo después de ver la fila, **antes** de que corriera la relectura del montaje. Entonces esa relectura ya traía G cancelada, la fijaba en "Terminadas" y la fila perdía su `GameActions`. Es el caso RM-14 (la relectura del montaje termina después de la transacción), no el caso normal que T5-12 describe.
   - **Corrección:** una espera, `await waitFor(() => expect(queryClient.isFetching()).toBe(0))`, antes de `serve(A, cancelada)`, con un comentario que cita H-5/RM-14. Ninguna aserción cambia.
   - **Verificación extra:** el resultado adoptado aparece en la fila, igual que antes.
2. **T5-17 navega fuera de la página con "Abrir partida por ID"** y vuelve con un `Link` agregado al `LocationProbe` del test. Es la forma de desmontar y volver a montar la página con el router real, sin un detalle real. La aceptación "fuera de la página" se simula con `invalidateQueries(myGames)` y la respuesta nueva, como permite T5-17.

### Riesgos
- **RM-14:** queda como lo documenta la v1.3. La Desviación 1 lo muestra en un test: con la relectura del montaje terminando después del resultado, la fila pasa a su sección natural y pierde su `TransactionStatus`; el resultado sigue en "Terminadas", leído del objeto. Se documenta en `app/README.md` (TASK-6).
=====

---

## Re-revisión TASK-5: NO PASA (H-5 sola rompe MINOR-6; corrección H-6, handoff v1.4)

Revisé TASK-5 entera contra el diff real partiendo de `ea0a713`: la UI ya revisada más el addendum "TASK-5, corrección
C-1 (H-5)". La UI sigue como en la revisión anterior, y no hay hallazgos nuevos en componentes ni páginas. El cambio de
`useMyGames.ts` es exactamente la condición `settled` de la v1.3. El gate es completo: 910 tests en 57 archivos, lint y
typecheck en 0 sin `eslint-disable`, build 900.96 kB; `contracts/` y `package*.json` sin delta.

**Foco 1: ¿la Desviación 1 esconde una regresión de MINOR-6? Sí.**
- **El hecho que la decide:** cuando la UI muestra "Confirmando en la red…", la transacción **ya se ejecutó** on-chain.
  La wallet (también la burner) devuelve el digest después de ejecutar, y `confirming` solo espera la lectura del nodo
  (`useExecuteTransaction`, etapas de #11).
- **Por eso:** si la vista se remonta durante esa etapa (volver a la cuenta A, el escenario de MINOR-6; o volver a la
  página), la relectura del montaje ya trae el estado nuevo. Con H-5 la fila se fija recién con las fuentes quietas,
  es decir, con ese estado. Pasa a "Terminadas", pierde su `GameActions` y el resultado adoptado no se ve.
- **La preparación original de T5-12 era la realista:** el nodo responde G cancelada antes de la relectura del montaje.
  Por eso fallaba con H-5.
- **La Desviación 1** (esperar `isFetching() === 0` antes de cambiar la respuesta) fuerza el orden opuesto, que en la
  práctica no se da en esta etapa. Así esconde la regresión.
- **El error de diseño es mío** (v1.3), no del DEV: H-5 no contemplaba las mutaciones vivas. El DEV lo marcó como RM-14,
  pero es el caso central de MINOR-6, no un nodo lento.

**Foco 2: T4-15 sin fallar con la reversión. Tiene sentido, como test de invariantes.** Fija lo que la regla no puede
romper:
- una fila sin pin se ve durante la relectura;
- la fijada no se mueve;
- la nueva queda fijada al final.

No discrimina H-5 (la sección natural de H es la misma durante y después), y el DEV lo explica bien. Los que
discriminan son T4-14, T5-13 y T5-17, y en la v1.4 se suman T4-17 y T5-18. No pido cambiarlo.

**Foco 3: T4-9 sin bucle. ✅** El DEV volvió a medir 1 render sin IDs nuevos y 2 con IDs nuevos (sin delta), y 0 en el
siguiente `advance`. El `setState` sigue siendo uno y condicional (C-2 intacto).

**Desviación 2 (T5-17 navega con "Abrir partida por ID" y vuelve con un `Link` del probe):** aceptada. Desmonta y vuelve a
montar con el router real, y la aceptación "afuera" se simula con `invalidateQueries` y la respuesta nueva, como permite
T5-17.

### Corrección: H-6 (handoff v1.4)

> Decisión (2026-11-04): además de H-5, se fijan en seguida las partidas con una mutación **viva** de la cuenta (el
> criterio de adopción de #12), sobre aceptar la regresión de MINOR-6 o volver al fijado desde la caché para todo.
> Motivo: conserva lo que H-5 arregló (T5-13, T5-17) y recupera T5-12. De paso cierra RM-14, porque una acción sobre una
> fila sin pin fija la fila en ese mismo render. Decisión interna del MID.

**Contrato** (el detalle está en la fila H-6 de §1 del handoff):
- **`hooks/txSession.ts`:** `type TxGameEntry = { id; status; gameId: string | null }`, `toTxGameEntry(m)` (el `gameId`
  normalizado de `txVariablesOf(...).action`; `null` en `create`) y `liveTxGameIds(entries, mount): ReadonlySet<string>`,
  que devuelve los `gameId` con `status === 'pending'` ∨ `mount.pendingIds.has(id)` ∨ `id > mount.maxId`.
- **`sui/myGames.ts`:** solo se exporta la clave privada como `myGameKey(item)`.
- **`useMyGames`:**
  - `const [mount] = useState(() => mountSnapshot(queryClient.getMutationCache().getAll()))`;
  - `live = liveTxGameIds(useMutationState({ filters: { mutationKey: queryKeys.txAccount(network, address) }, select: toTxGameEntry }), mount)`;
  - `pinnable = settled ? merged : merged.filter((item) => live.has(myGameKey(item)))`;
  - `next = address === null ? pins : extendPins(pins, pinnable, address)`;
  - C-2 y el `setState` único y condicional no cambian.

**Tests:**
- **T4-16** (`txSession.test.ts`): `liveTxGameIds`. Incluye en curso, en curso al montar y empezada después de montar;
  excluye la terminada antes de montar, `create` y variables ajenas; normaliza el ID.
- **T4-17** (`useMyGames.test.tsx`): caché con G `Pending` y un `cancel` de G en curso al montar, con la relectura lenta
  que trae `Cancelled` ⇒ G fijada en `pending` desde el primer render, y ahí sigue.
- **T5-12:** se **revierte la Desviación 1** (el `serve(A, cancelada)` vuelve a ir antes de la relectura del montaje) y
  tiene que pasar sin cambiar lo que afirma.
- **T5-18** (nuevo, cierra RM-14): relectura del montaje lenta y "Cancelar" sobre la fila todavía sin pin. Con los dos
  órdenes de terminación, la fila sigue en "Tus partidas pendientes" con "Partida cancelada: se devolvieron…" y sin
  "Cancelar".
- **Re-correr:** T4-8, T4-8 bis, T4-9, T4-12, T4-13, T4-14, T4-15, T5-13 y T5-17, sin cambiar lo que afirman.
- **Mutaciones a reportar:**
  - sin el filtro `live` (solo H-5) ⇒ fallan T5-12, T5-18 y T4-17;
  - sin `settled` (fijar siempre) ⇒ fallan T4-14, T5-13 y T5-17.

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| C-2 | DL-5, DL-9, MINOR-6 (T5-12), PROY-16 | `app/src/hooks/useMyGames.ts` (cálculo de `next`); `app/src/pages/MyGamesPage.test.tsx:453-456` (espera agregada) | Con H-5 sola, una fila con su transacción ya ejecutada y todavía en "Confirmando…" pasa a "Terminadas" al remontar la vista, y se pierde el resultado adoptado. La espera agregada en T5-12 lo esconde | H-6 según el contrato de arriba y la fila H-6 de §1 del handoff v1.4; revertir la espera de T5-12; T4-16, T4-17 y T5-18 |

### Siguiente paso: correcciones al DEV (C-2), con `HANDOFF_MY_GAMES` v1.4

- **Archivos permitidos:** `hooks/txSession.ts` y `txSession.test.ts`, `hooks/useMyGames.ts` y `useMyGames.test.tsx`,
  `sui/myGames.ts` (solo exportar `myGameKey`) y `pages/MyGamesPage.test.tsx`.
- **Reporte:** addendum con el diff, los tests, las dos mutaciones y el gate completo.

### Mensaje de commit propuesto (para cuando pase)

```
app: add the my-games page with per-row actions (#13)

#/my-games, linked from the header, shows received invitations, own pending
games and finished games for the connected account. Each actionable row runs
GameActions in a row variant (one useTxTarget per row, no repeated in-flight
notice, actions hidden after an own success). The page shows the in-flight
notice once, plus an open-by-ID box and, on testnet, the explorer account
link (D-20261103-03). Section footers never claim "none" while history is
left to review, and a failed refetch keeps the rows. Pins form from fresh data
once both sources are idle, except for games with a live transaction of the
account, which are pinned right away so their result stays in the row.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-5, corrección C-2 (H-6)

> Addendum a la entrega de TASK-5, tras la "Re-revisión TASK-5" y el handoff v1.4. HEAD `c561eb3`, sin commits.
> Archivos tocados (todos dentro de los permitidos):
> - `app/src/hooks/txSession.ts`, `txSession.test.ts`
> - `app/src/hooks/useMyGames.ts`, `useMyGames.test.tsx`
> - `app/src/sui/myGames.ts` (solo el export)
> - `app/src/pages/MyGamesPage.test.tsx`

### Diff
**`app/src/hooks/txSession.ts`**
```diff
 import type { Transaction } from '@mysten/sui/transactions';
+import { normalizeSuiAddress } from '@mysten/sui/utils';
@@
+/** Proyección de una mutación para el fijado de "Mis partidas" (H-6 de #13): su id, su estado y la partida que toca. */
+export type TxGameEntry = { id: number; status: MutationStatus; gameId: string | null };
+
+/**
+ * Proyección de una mutación del caché para H-6: el `gameId` normalizado de su acción (como la clave de `myGameKey`), o
+ * `null` para una creación o para variables sin la forma de la app.
+ */
+export function toTxGameEntry(m: MutationLike): TxGameEntry {
+  const action = txVariablesOf(m.state.variables)?.action;
+  const gameId = action === undefined || action.kind === 'create' ? null : normalizeSuiAddress(action.gameId);
+  return { id: m.mutationId, status: m.state.status, gameId };
+}
+
+/**
+ * Partidas con una transacción "viva" para la vista (H-6 de #13), con el criterio de adopción de #12: en curso, en curso
+ * al montar, o empezada después de montar. "Mis partidas" las fija en seguida con los datos que haya, para que la fila no
+ * cambie de sección (y pierda su resultado) con la relectura que trae el estado ya ejecutado. Las terminadas antes de
+ * montar no cuentan: esas se reagrupan con datos frescos (H-5).
+ */
+export function liveTxGameIds(entries: readonly TxGameEntry[], mount: MountSnapshot): ReadonlySet<string> {
+  const live = new Set<string>();
+  for (const entry of entries) {
+    if (entry.gameId === null) continue;
+    if (entry.status === 'pending' || mount.pendingIds.has(entry.id) || entry.id > mount.maxId) live.add(entry.gameId);
+  }
+  return live;
+}
```

**`app/src/sui/myGames.ts`:** solo el export. Renombré la función privada `gameKey` a `myGameKey` y la exporté. Las tres llamadas internas (`mergeMyGames`, `extendPins`, `groupMyGames`) cambian solo el nombre:
```diff
-function gameKey(item: MyGameItem): string | null {
+export function myGameKey(item: MyGameItem): string | null {
@@ (×3)
-    const key = gameKey(item);
+    const key = myGameKey(item);
```

**`app/src/hooks/useMyGames.ts`:** cambian el JSDoc y el comentario de H-6, además de este código.
```diff
-import { useInfiniteQuery, useQueryClient, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';
+import { useInfiniteQuery, useMutationState, useQueryClient, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';
@@
   mergeMyGames,
+  myGameKey,
@@
 import { queryKeys } from './queryKeys';
+import { liveTxGameIds, mountSnapshot, toTxGameEntry } from './txSession';
@@
   const [pinState, setPinState] = useState<PinState>(() => ({ address, pins: new Map() }));
+  // H-6: foto del caché de mutaciones al montar, para saber qué transacciones de la cuenta siguen "vivas" para la vista.
+  const [mount] = useState(() => mountSnapshot(queryClient.getMutationCache().getAll()));
+  const live = liveTxGameIds(
+    useMutationState({ filters: { mutationKey: queryKeys.txAccount(config.network, address) }, select: toTxGameEntry }),
+    mount,
+  );
@@
+  // H-6 (v1.4): salvo las partidas con una transacción viva de la cuenta, que se fijan en seguida con los datos que haya:
+  // la transacción ya se ejecutó, y la relectura traería el estado nuevo y sacaría la fila (con su resultado) de su sección.
@@
   const settled = !activityQuery.isFetching && !invitationsQuery.isFetching;
-  const next = address === null || !settled ? pins : extendPins(pins, merged, address);
+  const pinnable = settled
+    ? merged
+    : merged.filter((item) => {
+        const key = myGameKey(item);
+        return key !== null && live.has(key);
+      });
+  const next = address === null ? pins : extendPins(pins, pinnable, address);
   if (!sameAccount || next !== pinState.pins) setPinState({ address, pins: next });
```
Lo que no cambia:
- C-2 de TASK-4: los pins por cuenta y el único `setState` condicional.
- `groupMyGames` sigue recibiendo `pins: next`.
- `txSession.ts` sigue sin importar nada de `./`.

### Tests (910 → 915, +5)
- **T4-16** (`txSession.test.ts`, +2), con `mount = { maxId: 5, pendingIds: {4} }`:
  - **incluye** un `cancel` en curso (id 6), un `reject` que estaba en curso al montar y ya terminó (id 4) y un `accept` que empezó y terminó después de montar (id 7);
  - **excluye** un `cancel` que terminó antes de montar (id 3), un `create` y variables `{ foo: 1 }`;
  - `toTxGameEntry` normaliza la forma corta (`0x5` y `0X5`) y devuelve `gameId: null` para `create` y para variables ajenas.
- **T4-17** (`useMyGames.test.tsx`, +1):
  - preparación: la caché de A tiene G `Pending` como creador, hay un `cancel` de G en curso (un `useMutation` con la clave de la cuenta y las variables de la app) y `invalidateQueries(myGames)`;
  - la relectura del montaje es lenta (un `deferred`) y trae G `Cancelled`;
  - desde el primer render, G está en `pending`;
  - al terminar la relectura, G sigue en `pending` con el estado `cancelled`, y `finished` queda vacía.
- **T5-18** (`MyGamesPage.test.tsx`, +2, un `it.each` con los dos órdenes):
  - preparación: con A, la página se desmonta (abriendo el detalle), la caché se marca vieja y, al volver, la relectura de la actividad del montaje es lenta;
  - el usuario pulsa "Cancelar" en la fila de G, que todavía no tiene pin;
  - el nodo pasa a responder G cancelada;
  - en los dos órdenes ("confirmation first" y "refetch first"), la fila sigue en "Tus partidas pendientes" con "Partida cancelada: se devolvieron 0.003000003 SUI a tu cuenta", sin "Cancelar", y "Terminadas" no tiene filas.
- **T5-12: revertí la Desviación 1.** Saqué la espera `queryClient.isFetching() === 0`, así que `serve(A, cancelada)` vuelve a ir enseguida después de ver la fila. Pasa sin cambiar lo que afirma.
- **Re-corridos sin cambios, en verde:** T4-8, T4-8 bis, T4-12, T4-13, T4-14, T4-15, T5-13 y T5-17.
- **T4-9:** volví a medir: 1 render sin IDs nuevos y 2 con IDs nuevos, igual que antes. Sigue "≤ 2 extra" y "0 en el siguiente".

### Mutaciones
Restauré los archivos después de cada una (`cmp` igual).
```text
[sin-filtro-de-vivas]   const pinnable = settled ? merged : [];
     × pins at once a game with a live transaction of the account, with the stale cache (T4-17, H-6)
     × T5-12: A in flight → B (remount, nothing of A) → A still in flight ⇒ the adopted result appears in the row
     × keeps the row in "Tus partidas pendientes" with its result (confirmation first)      ← T5-18
     × keeps the row in "Tus partidas pendientes" with its result (refetch first)           ← T5-18
      Tests  4 failed | 39 passed (43)
[sin-settled]           const pinnable = true ? merged : merged.filter(…)
     × pins with the fresh refetch, not with a stale cache, when a new instance mounts (T4-14, H-5)
     × T5-13: A in flight → B → finished while on B → A ⇒ no result; the game with its read state in its natural section
     × regroups an invitation accepted outside the page: back on #/my-games it ends in "Terminadas" with "Aceptaste"   ← T5-17
      Tests  3 failed | 40 passed (43)
```

### Gate completo, job `app` (forma canónica)
```text
v26.13.0
c561eb3

added 293 packages, and audited 295 packages in 10s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
audited 292 packages in 11s

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


 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  01:23:26
   Duration  20.07s (environment 60%, tests 13%, import 10%, setup 9%, transform 7%, worker 1%)

Environment  jsdom was created 57 times · 113.76s total, 60% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 599ms
exit=0
--- git status --porcelain --untracked-files=all
 M app/src/App.test.tsx
 M app/src/App.tsx
 M app/src/components/GameActions.test.tsx
 M app/src/components/GameActions.tsx
 M app/src/components/Header.test.tsx
 M app/src/components/Header.tsx
 M app/src/components/LobbyList.tsx
 M app/src/hooks/txSession.test.ts
 M app/src/hooks/txSession.ts
 M app/src/hooks/useMyGames.test.tsx
 M app/src/hooks/useMyGames.ts
 M app/src/pages/GameDetailPage.test.tsx
 M app/src/pages/GameDetailPage.tsx
 M app/src/sui/myGames.ts
 M documents/REPORTES_MY_GAMES.md
?? app/src/components/HistoryTime.tsx
?? app/src/components/MyGamesSection.test.tsx
?? app/src/components/MyGamesSection.tsx
?? app/src/pages/MyGamesPage.test.tsx
?? app/src/pages/MyGamesPage.tsx
--- git diff --exit-code -- contracts/
exit=0
--- git diff --exit-code -- package.json app/package.json package-lock.json
exit=0
```

### Resultado
- **Tests:** 910 → **915**, en 57 archivos.
- **Build:** 900.96 → 901.45 kB (273.46 → 273.61 kB gzip).
- **Lint y typecheck:** 0, sin `eslint-disable`.
- **Sin cambios:** `contracts/`, `package*.json` y los componentes.
- **`documents/REPORTES_MY_GAMES.md`:** sale modificado por la re-revisión del MID; no lo toqué.
- **Greps sobre `git diff -- app` y los archivos nuevos:** claves, rutas personales, `console.`, `eslint-disable` y hex de 40-64, todos vacíos.

### Desviaciones
1. **`txSession.ts` importa `normalizeSuiAddress` de `@mysten/sui/utils`.**
   - **Por qué:** `toTxGameEntry` tiene que devolver el `gameId` normalizado igual que `myGameKey`, que usa esa misma función.
   - **Permisos:** la capa `hooks/` permite `@mysten/sui*`, y el archivo sigue sin importar nada de `./`.
   - **Diferencia con DL-12:** la lista de imports de DL-12 no incluía este módulo.
2. **Cómo se arma T4-17.**
   - **Qué hace:** el `cancel` vivo es un `useMutation` de test, con la clave de mutación de la cuenta y las variables con la forma de la app.
   - **Por qué:** no hace falta la máquina completa; `toTxGameEntry` solo lee `state.variables` y `state.status`.
3. **Cómo se arma T5-18.** Desmonta la página abriendo el detalle con "Abrir partida por ID" y vuelve con el `Link` del probe, como T5-17. La confirmación y la relectura lenta son `deferred`.

### Riesgos
- **RM-14:** queda cerrado por H-6, que T5-18 verifica en los dos órdenes.
- **Límite que sigue abierto (v1.4):** la primera visita sin caché con una transacción ya en curso. La fila nunca se mostró con acciones, así que no se pierde nada a la vista.
=====

---

## Re-revisión 2 TASK-5: PASA

Revisé TASK-5 entera contra el diff real partiendo de `c561eb3` (`HANDOFF_MY_GAMES` v1.4): la UI de la primera entrega,
H-5 (v1.3) y H-6 (v1.4). Greps propios sobre el diff de `app/` y los archivos nuevos: 0 hex de 40-64, 0 rutas
personales, 0 claves, sin `console.` ni `eslint-disable`.

| Revisión | Resultado |
|---|---|
| UI (primera revisión) | ✅ Sin cambios desde la revisión anterior, que no tuvo hallazgos de UI. Ruta y enlace; página sin cuenta sin consultas; `key={address}`; aviso "en curso" una vez; "Abrir partida por ID" y el enlace del explorador (D-20261103-03); secciones con `ReadState` solo sin datos, notas DL-17 y pie por `sectionFooter` (H-1); `GameActions` con `variant='row'` y H-3; texto R-7 |
| H-5 | ✅ `settled = !activityQuery.isFetching && !invitationsQuery.isFetching`. Sin la condición fallan T4-14, T5-13 y T5-17 (los que discriminan) |
| H-6, contrato | ✅ `txSession.ts`: `TxGameEntry`, `toTxGameEntry` (el `gameId` de `txVariablesOf(...).action` normalizado; `null` en `create` y en variables ajenas) y `liveTxGameIds` con el criterio de adopción de #12 (`pending` ∨ `mount.pendingIds` ∨ `id > mount.maxId`). `sui/myGames.ts` solo renombra y exporta `myGameKey`, con las tres llamadas internas renombradas. `useMyGames` toma una foto `mountSnapshot` perezosa, un `useMutationState` filtrado por la clave de la cuenta con un `select` que da objetos planos, y `pinnable = settled ? merged : merged.filter(vivas)` |
| H-6, semántica | ✅ En el escenario de MINOR-6, al remontar, la mutación de A sigue en curso (`pendingIds`), así que la fila se fija desde la caché previa a la transacción en el primer render. La relectura, que ya trae el estado ejecutado, no la mueve, y el resultado adoptado aparece en la fila (T5-12 con su preparación **original**). Una acción sobre una fila sin pin crea una mutación viva y la fija en ese render (T5-18, los dos órdenes): RM-14 queda cerrado. Lo terminado antes de montar sigue con H-5 (T5-13, T5-17) |
| Sin bucle, C-2 | ✅ Un único `setState`, condicional; `extendPins` devuelve la misma instancia si no hay nada nuevo; T4-9 medido otra vez: 1 render sin IDs nuevos, 2 con IDs nuevos, 0 en el siguiente. Pins por cuenta sin cambios (T4-13) |
| Capas / ARQ-5 | ✅ `txSession.ts` sigue sin imports de `./`; `normalizeSuiAddress` de `@mysten/sui/utils` está permitido en `hooks/` (Desviación 1) |
| Tests | ✅ 910 → 915 (+5: T4-16 ×2, T4-17, T5-18 ×2). T5-12 vuelve a su preparación original. Los re-corridos siguen en verde sin cambiar lo que afirman. Mutaciones: sin el filtro de vivas fallan T4-17, T5-12 y T5-18 (×2); sin `settled` fallan T4-14, T5-13 y T5-17. Es exactamente lo pedido |
| Gates | ✅ Completos en forma canónica: lint y typecheck 0, 915/57, build 901.45 kB (273.61 kB gzip); `contracts/` y `package*.json` sin delta |

**Desviaciones:** aceptadas.
1. **`normalizeSuiAddress` en `txSession.ts`** en lugar de `normalizeSuiObjectId`: es la misma normalización que usa
   `myGameKey`, así que las dos claves coinciden por construcción, y el resultado es idéntico para IDs de objeto.
2. **T4-17 con un `useMutation` de test** (clave de la cuenta y variables de la app) para tener una mutación viva real
   en el `MutationCache`: es la forma más fiel sin montar la máquina entera.
3. **T5-18 con la preparación de T5-17** (desmontar abriendo el detalle, marcar la caché vieja y volver): es justamente
   el caso de "volver a la página" con la relectura lenta.

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

### Siguiente paso: TASK-6 (docs), con `HANDOFF_MY_GAMES` v1.4

El gate de la app parte de 915 tests en 57 archivos y build de 901.45 kB. TASK-6 documenta:
- el fijado (H-5 + H-6);
- que RM-14 quedó cerrado, más el único resto: la primera visita sin caché con una transacción en curso;
- el resto de §3 de TASK-6.

### Mensaje de commit propuesto

```
app: add the my-games page with per-row actions (#13)

#/my-games, linked from the header, shows received invitations, own pending
games and finished games for the connected account. Each actionable row runs
GameActions in a row variant (one useTxTarget per row, no repeated in-flight
notice, actions hidden after an own success). The page shows the in-flight
notice once, plus an open-by-ID box and, on testnet, the explorer account
link (D-20261103-03). Section footers never claim "none" while history is
left to review, and a failed refetch keeps the rows. Pins form from fresh data
once both sources are idle, except for games with a live transaction of the
account, which are pinned right away so their result stays in the row.
App 915 tests in 57 files.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
