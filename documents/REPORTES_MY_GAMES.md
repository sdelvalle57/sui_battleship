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
