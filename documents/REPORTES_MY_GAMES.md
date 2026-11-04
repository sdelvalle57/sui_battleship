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
