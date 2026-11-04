# Reportes y revisiones — HANDOFF_TESTNET_PUBLISH (#8)

> Reportes del DEV y revisiones del MID, una sección por task (`documents/agentes/ORQUESTADOR.md`). El orquestador transcribe sin editar.

## TASK-1

## Task completado: HANDOFF_TESTNET_PUBLISH — TASK-1

### Branch (con SHA corto del HEAD)
`feature/issue-8-testnet-publish` @ `afeb2df`, con el diff de TASK-1 sin commitear encima. Los gates se midieron sobre `a93c285` + TASK-1: es el mismo código, porque `afeb2df` solo toca `documents/HANDOFF_TESTNET_PUBLISH.md` (v1.1). La sección TASK-1 es igual en la v1 y en la v1.1.

### Archivos modificados/creados
- `contracts/Move.lock`: solo vía `sui move update-deps -e testnet`, nunca a mano.
- `contracts/scripts/deployment.test.mjs`: M-1.
- `contracts/README.md`: solo la línea 501 (S-3).
- `documents/STATUS.md`: Toolchain → Framework, fila de baseline nueva, H13 y fila "#8 🚧" en Ciclo activo.
- `documents/REPORTES_TESTNET_PUBLISH.md`: queda para el orquestador (el harness bloqueó su creación).

### Qué se implementó (3 líneas máx)
Repin de `Move.lock` de `719fb29…` (PV 139) a `05ad86a3…` (PV 140, la de testnet) con `update-deps`; el delta es exactamente el esperado. M-1: constante nueva `LOCK_FRAMEWORK_REV` para el test que lee el lock real; `FRAMEWORK_REV` queda solo para el fixture (sin renombrar). S-3: `frameworkRev` del ejemplo del README actualizado, y STATUS al día.

### Tests y gates (output pegado, por área tocada)

**Línea base (paso 1). Sin cargar nada de `~/.sui/`, solo `stat`/`ls`:**
```text
$ stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
$ ls <HOME real>/.sui/sui_config/
client.yaml
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ curl -fsSL -X POST -H 'content-type: application/json' \
    -d '{"query":"{ epoch { epochId startTimestamp protocolConfigs { protocolVersion } } }"}' \
    https://graphql.testnet.sui.io/graphql | jq '.data.epoch'
{
  "epochId": 1273,
  "startTimestamp": "2026-11-03T21:24:42.581Z",
  "protocolConfigs": {
    "protocolVersion": 140
  }
}
```
La PV de testnet es **140**, época **1273**: no hay STOP por P-C.

**Manifest @ `testnet-v1.83.0` (lectura pública):**
```text
$ curl -fsSL https://raw.githubusercontent.com/MystenLabs/sui/testnet-v1.83.0/crates/sui-framework-snapshot/manifest.json \
    | jq -r '."140".git_revision, ."139".git_revision, (keys|map(tonumber)|max)'
05ad86a3e86c522deea116f80dc2bf2309a53363
719fb2960ccfbf9f4d33041f8ea5146d30671696
140
```

**Caché de Move antes del repin:** `ls <HOME real>/.move/git` mostraba solo `https___github_com_MystenLabs_sui_git_719fb29…`.

**`update-deps` (paso 2), desde `contracts/`:**
```text
$ printf 'n\n' | sui move update-deps -e testnet; echo "exit=$?"
Downloading from https://github.com/MystenLabs/sui.git
exit=0
```
Declaro que la caché de Move descargó el framework nuevo (`…_05ad86a3…`), como se esperaba. Fue la única operación de la CLI que salió a la red.

**Delta del lock (paso 3), diff completo (PROY-11):**
```diff
diff --git a/contracts/Move.lock b/contracts/Move.lock
index e28c276..04f18b0 100644
--- a/contracts/Move.lock
+++ b/contracts/Move.lock
@@ -5,13 +5,13 @@
 version = 4
 
 [pinned.testnet.MoveStdlib]
-source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "719fb2960ccfbf9f4d33041f8ea5146d30671696" }
+source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "05ad86a3e86c522deea116f80dc2bf2309a53363" }
 use_environment = "testnet"
 manifest_digest = "C4FE4C91DE74CBF223B2E380AE40F592177D21870DC2D7EB6227D2D694E05363"
 deps = {}
 
 [pinned.testnet.Sui]
-source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "719fb2960ccfbf9f4d33041f8ea5146d30671696" }
+source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "05ad86a3e86c522deea116f80dc2bf2309a53363" }
 use_environment = "testnet"
 manifest_digest = "7AFB66695545775FBFBB2D3078ADFD084244D5002392E837FDE21D9EA1C6D01C"
 deps = { MoveStdlib = "MoveStdlib" }
```

| Esperado | Medido |
|---|---|
| `rev` de MoveStdlib y de Sui: `719fb29…` → `05ad86a3…`, iguales entre sí | ✅ |
| El rev nuevo es la clave `140` del manifest | ✅ |
| `manifest_digest`: puede cambiar | No cambió en ninguna de las dos secciones |
| `[move] version = 4` y `[pinned.testnet.battleship]` sin cambios | ✅ |
| Ninguna sección `[pinned.<otro env>]` | ✅ |

Copia de referencia (paso 4): `<scratchpad>/Move.lock.repin`, sha256 `7939bd8e…9a1c`.

**M-1.** El test lee el lock real, y con el lock repineado da el rev nuevo:
```text
$ node --input-type=module -e "…readFrameworkRev(readFileSync('Move.lock','utf8'))"
readFrameworkRev(Move.lock) = 05ad86a3e86c522deea116f80dc2bf2309a53363
```
Con la aserción anterior (`FRAMEWORK_REV` = `719fb29…`) ese test quedaba en rojo. Ahora compara contra `LOCK_FRAMEWORK_REV` y pasa.

- **Agregados/modificados:** `deployment.test.mjs`.
  - `+const LOCK_FRAMEWORK_REV = '05ad86a3e86c522deea116f80dc2bf2309a53363'; // Move.lock del repo: piso de la PV 140 (repin de #8)`
  - `FRAMEWORK_REV` lleva el comentario `// fixture localnet.deployment.json: registro histórico (PV 139)` y lo siguen usando `localnetDeployment()` y el caso de `:183`.
  - En `:326`: `assert.equal(readFrameworkRev(lock), LOCK_FRAMEWORK_REV);`.
  - No hay tests nuevos: siguen siendo 99.

**Contracts (forma canónica, desde `contracts/`):**
```text
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed

$ printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
```
Build con **0 warnings** y lint con **0 lints**.

```text
$ printf 'n\n' | sui move test -e testnet --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[ PASS    ] battleship::house_tests::test_add_fees_accumulates_balance
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS    ] battleship::house_tests::test_add_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fees_collected_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_init_sends_single_house_cap_to_publisher
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS    ] battleship::house_tests::test_init_shares_exactly_one_house_with_defaults
[ PASS    ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::house_tests::test_max_bet_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS    ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS    ] battleship::house_tests::test_migrate_bumps_version_and_emits_event
[ PASS    ] battleship::house_tests::test_migrate_rejects_current_version
[ PASS    ] battleship::game_tests::test_accept_invite_by_invitee_resolves
[ PASS    ] battleship::house_tests::test_migrate_rejects_house_newer_than_package
[ PASS    ] battleship::house_tests::test_min_bet_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_max_bet_with_max_fee_does_not_overflow
[ PASS    ] battleship::house_tests::test_transfer_house_cap_moves_cap_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_open_game_acceptor_wins_pays_payout_and_fee
[ PASS    ] battleship::house_tests::test_transferred_cap_lets_new_holder_administer
[ PASS    ] battleship::house_tests::test_update_bet_limits_accepts_equal_min_and_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_min_above_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_open_game_creator_wins_pays_payout_and_fee
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::game_tests::test_accept_rejects_cancelled_game
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::game_tests::test_accept_rejects_game_of_older_version
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_rejects_higher_stake
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::game_tests::test_accept_rejects_house_of_newer_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
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
```
**83 PASS** (26 `house_tests` + 57 `game_tests`).

```text
$ printf 'n\n' | sui move test -e testnet --coverage > /dev/null 2>&1; echo "exit=$?"
exit=0
$ printf 'n\n' | sui move coverage summary -e testnet; echo "exit=$?"
+-------------------------+
| Move Coverage Summary   |
+-------------------------+
Module 0000000000000000000000000000000000000000000000000000000000000000::house
>>> % Module coverage: 100.00
Module 0000000000000000000000000000000000000000000000000000000000000000::game
>>> % Module coverage: 100.00
+-------------------------+
| % Move Coverage: 100.00  |
+-------------------------+
exit=0
```
Cobertura **100 %** (informativo). Los artefactos `.coverage_map.mvcov`, `traces/` y `build/` los ignora `.gitignore`.

**contracts/scripts (Node, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`):**
```text
$ node --version
v26.13.0
$ node --test scripts/*.test.mjs; echo "exit=$?"
✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real (9.02378ms)
✔ parsePublishOutput no depende de la posición en objectChanges (3.052818ms)
✔ parsePublishOutput rechaza una transacción que no terminó en success (1.534022ms)
✔ parsePublishOutput rechaza una salida sin objeto published (0.762781ms)
✔ parsePublishOutput rechaza dos Houses creadas (0.738932ms)
✔ parsePublishOutput rechaza una salida sin HouseCap (0.697342ms)
✔ parsePublishOutput rechaza una salida sin UpgradeCap (0.833279ms)
✔ parsePublishOutput rechaza una House de otro paquete (0.89045ms)
✔ parsePublishOutput rechaza una House no compartida (0.780154ms)
✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs (1.096524ms)
✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto (1.043203ms)
✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta (12.836387ms)
✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture (1.554401ms)
✔ validateDeployment: falta schemaVersion (0.460035ms)
✔ validateDeployment: falta network (0.336463ms)
✔ validateDeployment: falta chainId (0.342453ms)
✔ validateDeployment: falta packageId (0.299801ms)
✔ validateDeployment: falta originalPackageId (0.21357ms)
✔ validateDeployment: falta packageVersion (0.225265ms)
✔ validateDeployment: falta upgradeCapId (0.266028ms)
✔ validateDeployment: falta houseId (0.244118ms)
✔ validateDeployment: falta houseCapId (0.202153ms)
✔ validateDeployment: falta publishTxDigest (0.220895ms)
✔ validateDeployment: falta publishTimestamp (0.17345ms)
✔ validateDeployment: falta sourceCommit (0.161048ms)
✔ validateDeployment: falta suiCliVersion (0.14282ms)
✔ validateDeployment: falta frameworkRev (0.1408ms)
✔ validateDeployment rechaza: clave desconocida (1.201849ms)
✔ validateDeployment rechaza: ID corto (0.279122ms)
✔ validateDeployment rechaza: ID en mayúsculas (0.29126ms)
✔ validateDeployment rechaza: testnet con chain id ajeno (0.299271ms)
✔ validateDeployment rechaza: localnet con el chain id de testnet (0.220884ms)
✔ validateDeployment rechaza: localnet con el chain id de mainnet (0.213384ms)
✔ validateDeployment rechaza: sourceCommit null en testnet (0.214868ms)
✔ validateDeployment rechaza: network mainnet (0.245981ms)
✔ validateDeployment rechaza: publishTimestamp sin milisegundos (0.244271ms)
✔ validateDeployment rechaza: publishTimestamp sin Z (0.294786ms)
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error (1.095009ms)
✔ parsePublishedToml lee cada campo del fixture real (1.515101ms)
✔ parsePublishedToml rechaza una línea inesperada con su número (0.546673ms)
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea (0.804783ms)
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea (0.320412ms)
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea (0.327984ms)
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea (0.359791ms)
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea (0.413856ms)
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea (0.358344ms)
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea (0.301776ms)
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia (1.412415ms)
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo (0.756208ms)
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex (0.549175ms)
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex (0.361068ms)
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado (7.040886ms)
✔ runSui invoca cada vector permitido (3.777405ms)
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca (2.382098ms)
✔ runSui no invoca sin un configDir validado (0.608202ms)
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca (0.686296ms)
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/ (1.038145ms)
✔ parseCliArgs: subcomandos y opciones válidos (3.497238ms)
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y (2.036027ms)
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI) (4.107222ms)
✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI (1.638983ms)
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet (0.655251ms)
✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet (0.571179ms)
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui (1.612688ms)
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath (0.466821ms)
✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original (1.209246ms)
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id (0.596949ms)
✔ checkNetworkGuard: chain id según la red (0.539417ms)
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier (0.629475ms)
✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto (0.41141ms)
✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones (1.780378ms)
✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml (1.186465ms)
✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error (3.131587ms)
✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok (0.377914ms)
✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta (0.493688ms)
✔ confirmación: ninguna variable de entorno la omite (0.563336ms)
✔ resolveRecordMeta: usa meta.json si existe (0.512399ms)
✔ resolveRecordMeta: sin meta.json exige los flags (0.791483ms)
✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error (0.562698ms)
✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues (0.590041ms)
✔ checkDeployments: localnet válido sin entrada en Published.toml (2.135968ms)
✔ checkDeployments: testnet sin Published.toml ⇒ error (2.073697ms)
✔ checkDeployments: entrada de Published.toml sin json ⇒ error (0.423752ms)
✔ checkDeployments: nombre de archivo distinto de network ⇒ error (3.083398ms)
✔ checkDeployments: json inválido ⇒ error (0.796236ms)
✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error (1.501161ms)
✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3) (0.558568ms)
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea (0.361583ms)
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos (0.440035ms)
✔ formatSummary: los 14 campos y el siguiente paso, sin direcciones de cuentas (0.684433ms)
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar (0.393634ms)
✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra (0.444719ms)
✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo (0.506158ms)
✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr (0.303142ms)
✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo (0.401687ms)
✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo) (0.544157ms)
✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2) (0.540791ms)
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout (1.040156ms)
✔ interpretCliRun: salida real ⇒ el resultado del parser (0.546631ms)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 296.609812
exit=0
```
Por archivo: `deployment.test.mjs` 51 pass / 0 fail y `publish.test.mjs` 48 pass / 0 fail, en total **99 PASS**, igual que el baseline.

```text
$ node scripts/publish.mjs check; echo "exit=$?"
0 despliegues
exit=0
```

**Cierre (paso 7):**
```text
$ cmp Move.lock <scratchpad>/Move.lock.repin; echo "cmp=$?"
cmp=0
$ git status --porcelain
 M contracts/Move.lock
 M contracts/README.md
 M contracts/scripts/deployment.test.mjs
 M documents/STATUS.md
$ stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
$ ls <HOME real>/.sui/sui_config/
client.yaml
```
`cmp=0`: los gates no tocaron el lock. El árbol tiene solo los 4 archivos del task. `~/.sui/sui_config/` está idéntico a la línea base.

- **Tablas de contrato y `app/src/sui/` sincronizados:** no aplica (no hay cambios de contrato).
- **App:** no aplica. No toqué `app/src/sui/config.test.ts:28` ni `publish.test.mjs:56`: son datos del fixture.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: el ensayo es TASK-4. Con testnet solo hubo lecturas públicas sin claves: la PV por GraphQL, el manifest en GitHub y la lectura gRPC de la PV que hace `update-deps` con la config sin claves. No corrí ningún `sui client`, no levanté localnet y no hay digests.

### Desviaciones del handoff (o "ninguna")
Ninguna. Dos notas:
- No renombré `FRAMEWORK_REV` (el rename era opcional); le agregué un comentario que la ata al fixture.
- `manifest_digest` no cambió. El handoff admite ese caso ("si cambian").

### Riesgos / pendientes (o "ninguno")
- **G1, tras el push (lo verifica el orquestador):** en la CI del PR #48, `contracts` en verde y `framework-drift` con "lock al día". El comando `gh api repos/sdelvalle57/sui_battleship/check-runs/<id framework-drift>/annotations --jq 'length'` debe dar 0. El primer run tendrá un *miss* esperado de la caché `move-git-…`.
- **Ventana P-C:** devnet ya está en PV 141. Si testnet sube a 141 antes de publicar, este repin queda viejo: habrá que subir la CLI y repinear de nuevo.
- La fila de baseline de STATUS cita `afeb2df` + TASK-1. Si quieres que cite el SHA del commit de TASK-1, se cambia al commitear.

### Documentación
- **READMEs / agents.md:** `contracts/README.md:501` (S-3). `agents.md` no aplica: ninguna línea cita el rev ni la PV del lock (lo comprobé con grep).
- **STATUS (ya aplicado en el árbol):**
  - Toolchain → Framework: `05ad86a3…`, piso de la PV 140 = PV de testnet, repin de #8 el 2026-11-03 (época 1273); el rev viejo queda como historial.
  - Baselines: fila nueva de `contracts/` @ `feature/issue-8-testnet-publish` con 0 / 0 / 83 (26 + 57), cobertura 100 %, 99 (51 + 48), 0 despliegues y el `cmp` del lock.
  - H13 marcado ✅ (repinado el 2026-11-03, época 1273, PV 140). Lo que falta es la CI del PR #48 y que el owner vuelva a medir la PV antes de publicar.
  - Ciclo activo: fila "#8 (publicación en testnet, owner) 🚧 2026-11-03".
- **Higiene (grep sobre el diff de los 4 archivos):** 0 coincidencias de claves (`suiprivkey`/`mnemonic`/`privkey`) y 0 rutas personales (`/home/`, usuario, `/tmp/`, ruta de nvm). Los únicos hex de 40-64 que aparecen son públicos: `05ad86a3e86c522deea116f80dc2bf2309a53363` (rev del framework de la PV 140) y `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139). En este reporte aparece además el `0000…0000` de 64 ceros que imprime `coverage summary`: es la dirección de módulo sin publicar, no una cuenta.

**Commit sugerido:** `contracts: repin Move.lock to the PV 140 framework (#8)`. No hice commit ni push.

## Revisión TASK-1: PASA

> MID · 2026-11-03 · Contra `documents/HANDOFF_TESTNET_PUBLISH.md` v1.1 (TASK-1), `documents/ESTANDARES.md` y el diff
> real (`git diff` sobre `afeb2df`, sin commitear, 4 archivos: +12/−7). Gates no re-ejecutados (D-20261030-02): revisé el
> output pegado.

**Checklist (FLUJO §5):**
- **Implementa lo pedido, ni más ni menos; HU del task cumplida:** ✅.
  - `contracts/Move.lock:8,14`: los dos `rev` pasan de `719fb29…` a `05ad86a3…`, iguales entre sí y = clave `140` del manifest de `testnet-v1.83.0` (salida pegada; coincide con mi lectura del §0).
  - `manifest_digest` sin cambios (el handoff lo admite); `[move] version = 4` y `[pinned.testnet.battleship]` intactos; ninguna sección `[pinned.<otro env>]`.
  - Fuera de los 4 archivos, el diff de `contracts/sources`, `contracts/tests`, `Move.toml`, `.github` y `app` está vacío.
- **PROY-11 (manifest/lock):** ✅. El delta lo generó la CLI (`update-deps -e testnet`, `exit=0`), está declarado con el diff completo y su justificación (H13), y la descarga del framework nuevo a la caché de Move está declarada.
- **M-1:** ✅.
  - `contracts/scripts/deployment.test.mjs:38`: `LOCK_FRAMEWORK_REV` con comentario.
  - `:326`: el test del lock real compara contra esa constante.
  - `FRAMEWORK_REV` (`:37`) queda para el fixture, con comentario (LIM-6, LIM-7).
  - El renombre era opcional y se declaró.
  - `publish.test.mjs:56` y `app/src/sui/config.test.ts:28` sin tocar, como pedía el handoff.
- **S-3:** ✅ `contracts/README.md:501`.
- **Gates (PROY-19, LIM-9):** ✅, forma canónica de `agents.md` §3 y output pegado.
  - CLI `sui 1.83.0-16d2dc1e05ed`.
  - build 0 warnings · lint 0 lints · test **83/83** (26 + 57) · coverage 100 % / 100 %.
  - `node --test` **99/99** (51 + 48) con Node v26.13.0.
  - `check` "0 despliegues".
  - `cmp=0` contra la copia del lock repineado.
  - `git status` solo con los 4 archivos.
  - **Cero delta** de conteos frente al baseline de §0.
- **SEG-3 / D-20261030-07:** ✅.
  - `stat`/`ls` de `~/.sui/sui_config/` idénticos antes y después.
  - Sin `sui client`, sin claves, sin rutas personales (usa `<HOME real>` y `<scratchpad>`).
  - Hex de 40-64 solo los dos revs públicos del framework. El `0000…0000` del `coverage summary` es la dirección de módulo sin publicar, declarada.
- **Docs (PROY-20):** ✅.
  - `documents/STATUS.md:32` (Framework), `:40-42` (baseline nueva, la más reciente arriba), `:106` (H13 ✅ con época, PV y lo que queda pendiente: CI del PR #48 y re-medición del owner) y la fila "#8 🚧" en Ciclo activo.
  - `agents.md` no cita el rev ni la PV (verificado con grep): no aplica.
- **Desviaciones:** "ninguna", con dos notas justificadas (rename opcional y `manifest_digest` sin cambios).

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Sin hallazgos que bloqueen | — |
| n-1 | 🔵 PROY-20 (nit, opcional) | `documents/STATUS.md:40` | La fila de baseline cita "`afeb2df` + TASK-1 … medido sobre `a93c285` + TASK-1". Es correcto y explica que el código es el mismo, pero el ref que quedará es el commit de TASK-1, cuyo SHA no se conoce antes de commitear. | Nada en este commit. Si se quiere, en el commit de TASK-2 el DEV cambia el ref por el SHA de TASK-1 (convención "medido en `<sha>`" de las demás filas). |

### Pendiente fuera del DEV (criterio de G1 del handoff)
El orquestador verifica tras el push en la CI del PR #48:
- `contracts` en verde (el *miss* de la caché `move-git-…` es esperado);
- `app` en verde;
- `framework-drift` con "lock al día" y `gh api repos/sdelvalle57/sui_battleship/check-runs/<id del job framework-drift>/annotations --jq 'length'` = 0.

Si queda una anotación `title=H13`, lo traigo de vuelta como NO PASA de TASK-1.

### Siguiente paso
Commitear TASK-1 (solo los 4 archivos: `contracts/Move.lock`, `contracts/README.md`, `contracts/scripts/deployment.test.mjs`
y `documents/STATUS.md`; el archivo de reportes, en el commit que el orquestador decida), pushear al PR #48 y comprobar
el criterio de CI de arriba. **TASK-2 autorizado** con el handoff v1.1, incluido m-2.

### Mensaje de commit propuesto
```
contracts: repin Move.lock to the PV 140 framework (#8)

Testnet runs protocol version 140 since epoch 1269; Move.lock still pinned
the PV 139 framework (STATUS H13). `sui move update-deps -e testnet` moves
the MoveStdlib and Sui revs to the PV 140 floor (key 140 of the
testnet-v1.83.0 manifest); manifest digests and the root entry are
unchanged. The repo-lock test gets its own constant (M-1) and the README
example follows (S-3). Gates unchanged: 0 warnings, 0 lints, 83 Move
tests, 99 script tests, 0 deployments.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## TASK-2

## Task completado: HANDOFF_TESTNET_PUBLISH — TASK-2

### Branch (con SHA corto del HEAD)

`feature/issue-8-testnet-publish` @ `4702f5a`, con el diff de TASK-2 sin commitear encima. Handoff v1.1.

### Archivos modificados/creados

- `contracts/scripts/publish.mjs`: M-4 y M-2.
- `contracts/scripts/publish.test.mjs`: tests nuevos y el de `formatSummary` reemplazado.
- `documents/STATUS.md`:
  - nit n-1 del MID: la fila de baseline de TASK-1 cita `4702f5a`;
  - fila de baseline nueva de `contracts/scripts`;
  - nota de TASK-2 en la fila "#8 🚧".
- `documents/REPORTES_TESTNET_PUBLISH.md`: esta sección.

### Qué se implementó (3 líneas máx)

**M-4.** `checkNodeVersion` corre como guarda 0 al principio de `main` (lee `.nvmrc`). El punto de entrada `isEntryPoint`
ya no depende de `import.meta.main`, así que con Node 20 y 22 el script sale con 1 y un mensaje.
**M-2.** El resumen imprime `update_fee_rate` y la verificación con el prefijo
`printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?…}" sui client`: `200` en testnet, `<bps>` en localnet. Cada comando va
solo en su línea y la nota del campo es un comentario `#` (m-2).

### Tests y gates (output pegado, por área tocada)

- **Agregados/modificados** (`publish.test.mjs`: 48 → 53, +5):
  - `main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI`.
    Cubre `['check']` con 20.20.2 y con 22.23.4, `['publish','--network','testnet','--dry-run']` sin `SUI_CONFIG_DIR` y
    con un `SUI_BIN` inexistente, y `['deploy']`. Este último da 1 y no 2, lo que prueba que la guarda corre antes de
    `parseCliArgs`. En los cuatro casos el stderr no trae `/` (sin rutas).
  - `checkNodeVersion: el major de Node debe ser el de .nvmrc`:
    - `26.13.0` con `'26\n'` y con `'v26\n'` pasa;
    - `20.20.2`, `22.23.4` y `27.0.0` lanzan con el mensaje exacto;
    - lanzan `.nvmrc sin versión válida` el `.nvmrc` vacío, `'\n'`, `'lts/*\n'`, `'26.13.0\n'` y `null` (archivo
      ausente).
  - `checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc)`.
  - `isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo`:
    - `true`/`false` se devuelven tal cual, con un espía que confirma que `realpath` no se llama;
    - con `importMetaMain` `undefined`: mismo archivo → `true`, symlink → `true`, otro archivo → `false`, `argv1`
      `undefined` o `''` → `false`, `realpath` que lanza → `false`;
    - un caso con el fs real (`realpathSync` sobre `publish.mjs`).
  - `formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas`. Reemplaza
    al test viejo:
    - testnet: línea exacta del comando con `… <houseCapId> 200`, línea exacta de la verificación y sin `<bps>`;
    - localnet: con `<bps>`;
    - en los dos: los 14 campos, ninguna línea `/^\s*sui client/m`, el literal `${SUI_CONFIG_DIR:?`, exactamente dos
      líneas de comando y `assertNoAccountAddress`.
  - `formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar)`.
    `spawnSync('bash', ['-n', '-c', línea])` da estado 0 en las dos líneas, y la línea de localnet con `<bps>` falla
    `bash -n`.
  - El arnés `mainCapturingStderr(argv, options)` ahora pasa `options` a `main`. La cabecera del archivo menciona el
    único proceso nuevo (`bash -n`).
- **Mutaciones** (sobre una copia en `<scratchpad>`, para comprobar que los tests detectan las regresiones):

  | Mutación | Resultado |
  |---|---|
  | M1: sin la guarda en `main` | 1 test en rojo |
  | M2: prefijo sin `SUI_CONFIG_DIR` (template literal) | 2 en rojo |
  | M3: `<bps>` también en testnet | 2 en rojo |
  | M4: verificación con prosa entre paréntesis, como en la v1 | 2 en rojo (`bash -n` falla) |
  | M5: `isEntryPoint` ignora `false` | 1 en rojo, después de cambiar `assert.fail` por un espía (ver Desviaciones) |
  | M7: sin `realpath` | 1 en rojo |
  | M6: sin el chequeo de `argv1` | sobrevive: mutante equivalente, porque `path.resolve(undefined)` lanza y lo atrapa el `catch`, y `''` resuelve al cwd; en los dos casos sale `false` |

**contracts/scripts (Node, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`, desde `contracts/`):**

```text
$ node --version
v26.13.0
$ node --test scripts/*.test.mjs; echo "exit=$?"
✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real (5.017939ms)
✔ parsePublishOutput no depende de la posición en objectChanges (0.674044ms)
✔ parsePublishOutput rechaza una transacción que no terminó en success (0.695476ms)
✔ parsePublishOutput rechaza una salida sin objeto published (0.35129ms)
✔ parsePublishOutput rechaza dos Houses creadas (0.595554ms)
✔ parsePublishOutput rechaza una salida sin HouseCap (0.409168ms)
✔ parsePublishOutput rechaza una salida sin UpgradeCap (0.431896ms)
✔ parsePublishOutput rechaza una House de otro paquete (0.430846ms)
✔ parsePublishOutput rechaza una House no compartida (0.684744ms)
✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs (0.729245ms)
✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto (0.560586ms)
✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta (1.555865ms)
✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture (0.711235ms)
✔ validateDeployment: falta schemaVersion (0.247876ms)
✔ validateDeployment: falta network (0.169964ms)
✔ validateDeployment: falta chainId (0.244563ms)
✔ validateDeployment: falta packageId (0.178415ms)
✔ validateDeployment: falta originalPackageId (0.155547ms)
✔ validateDeployment: falta packageVersion (0.164882ms)
✔ validateDeployment: falta upgradeCapId (0.170379ms)
✔ validateDeployment: falta houseId (0.157077ms)
✔ validateDeployment: falta houseCapId (0.204906ms)
✔ validateDeployment: falta publishTxDigest (0.163355ms)
✔ validateDeployment: falta publishTimestamp (0.163606ms)
✔ validateDeployment: falta sourceCommit (0.129442ms)
✔ validateDeployment: falta suiCliVersion (0.127741ms)
✔ validateDeployment: falta frameworkRev (0.13184ms)
✔ validateDeployment rechaza: clave desconocida (0.269326ms)
✔ validateDeployment rechaza: ID corto (0.171225ms)
✔ validateDeployment rechaza: ID en mayúsculas (0.195062ms)
✔ validateDeployment rechaza: testnet con chain id ajeno (0.190003ms)
✔ validateDeployment rechaza: localnet con el chain id de testnet (0.161526ms)
✔ validateDeployment rechaza: localnet con el chain id de mainnet (0.172416ms)
✔ validateDeployment rechaza: sourceCommit null en testnet (0.204735ms)
✔ validateDeployment rechaza: network mainnet (0.259387ms)
✔ validateDeployment rechaza: publishTimestamp sin milisegundos (0.199632ms)
✔ validateDeployment rechaza: publishTimestamp sin Z (0.176518ms)
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error (0.54846ms)
✔ parsePublishedToml lee cada campo del fixture real (0.870991ms)
✔ parsePublishedToml rechaza una línea inesperada con su número (0.449293ms)
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea (0.499505ms)
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea (0.30513ms)
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea (0.297411ms)
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea (0.333493ms)
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea (0.393427ms)
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea (0.355287ms)
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea (0.271784ms)
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia (0.877606ms)
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo (1.325272ms)
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex (0.248607ms)
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex (0.217448ms)
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado (3.852667ms)
✔ runSui invoca cada vector permitido (1.833393ms)
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca (1.518687ms)
✔ runSui no invoca sin un configDir validado (0.368878ms)
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca (0.427472ms)
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/ (0.639957ms)
✔ parseCliArgs: subcomandos y opciones válidos (1.594708ms)
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y (0.987229ms)
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI) (2.52762ms)
✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI (1.124829ms)
✔ main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI (1.08845ms)
✔ checkNodeVersion: el major de Node debe ser el de .nvmrc (0.627098ms)
✔ checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc) (0.220489ms)
✔ isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo (0.465848ms)
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet (0.304686ms)
✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet (0.317782ms)
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui (1.001416ms)
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath (0.250082ms)
✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original (0.858762ms)
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id (0.292305ms)
✔ checkNetworkGuard: chain id según la red (0.565025ms)
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier (0.605506ms)
✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto (0.378961ms)
✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones (0.825996ms)
✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml (1.045898ms)
✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error (1.457638ms)
✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok (0.296355ms)
✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta (0.380049ms)
✔ confirmación: ninguna variable de entorno la omite (0.414084ms)
✔ resolveRecordMeta: usa meta.json si existe (0.304348ms)
✔ resolveRecordMeta: sin meta.json exige los flags (0.325395ms)
✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error (1.695886ms)
✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues (0.565637ms)
✔ checkDeployments: localnet válido sin entrada en Published.toml (1.204026ms)
✔ checkDeployments: testnet sin Published.toml ⇒ error (1.237553ms)
✔ checkDeployments: entrada de Published.toml sin json ⇒ error (0.218616ms)
✔ checkDeployments: nombre de archivo distinto de network ⇒ error (0.26602ms)
✔ checkDeployments: json inválido ⇒ error (0.406669ms)
✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error (0.773391ms)
✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3) (0.253459ms)
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea (0.208006ms)
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos (0.254693ms)
✔ formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas (1.011053ms)
✔ formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar) (11.090068ms)
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar (0.261629ms)
✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra (0.213707ms)
✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo (0.204276ms)
✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr (0.151828ms)
✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo (0.146461ms)
✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo) (0.3083ms)
✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2) (0.326768ms)
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout (0.528957ms)
✔ interpretCliRun: salida real ⇒ el resultado del parser (0.441024ms)
ℹ tests 104
ℹ suites 0
ℹ pass 104
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 200.286495
exit=0
```

Por archivo (`node --test <archivo>`): `deployment.test.mjs` **51 pass / 0 fail** y `publish.test.mjs` **53 pass / 0
fail**. Total **104 PASS** (99 + 5).

```text
$ node scripts/publish.mjs check; echo "exit=$?"
0 despliegues
exit=0
$ git diff --exit-code -- Move.lock; echo "exit=$?"
exit=0
```

**Contracts:** el handoff no los exige porque no hay cambios Move. Los corrí igual, en forma canónica, para que la
baseline quede completa:

```text
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ printf 'n\n' | sui move test -e testnet --warnings-are-errors | grep -v '^\[ PASS'; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
Test result: OK. Total tests: 83; passed: 83; failed: 0
exit=0
```

Resultado: 0 warnings, 0 lints, 83 PASS y lock sin delta. Las 83 líneas `[ PASS ]` son las mismas que en TASK-1.

- **Tablas de contrato y app/src/sui/ sincronizados:** no aplica (sin cambios de contrato). **App:** no aplica.

### Verificación manual (localnet / testnet, digests de tx si hubo)

Ningún `sui client`, ninguna red, ningún digest.

**Node 20, 22 y 26** (rutas absolutas de nvm, desde `contracts/`):

```text
$ <HOME real>/.nvm/versions/node/v20.20.2/bin/node scripts/publish.mjs check; echo "exit=$?"
se requiere Node 26 (.nvmrc); este es v20.20.2: corre "nvm use" en la raíz del repo
exit=1
$ <HOME real>/.nvm/versions/node/v22.23.4/bin/node scripts/publish.mjs check; echo "exit=$?"
se requiere Node 26 (.nvmrc); este es v22.23.4: corre "nvm use" en la raíz del repo
exit=1
$ <HOME real>/.nvm/versions/node/v26.13.0/bin/node scripts/publish.mjs check; echo "exit=$?"
0 despliegues
exit=0
```

**Antes del cambio:** Node 20 daba `exit=0` sin imprimir nada (M-4 reproducido al empezar el task). Node 22 y 26 daban
`0 despliegues`.

**Camino `realpath` de `isEntryPoint` con Node 20.** Sirve para ejercer el camino sin `import.meta.main`:
- el script con ruta absoluta desde otro cwd da el mensaje y `exit=1`;
- por un symlink en `<scratchpad>` da el mensaje y `exit=1` (con Node 26, por el mismo symlink: `0 despliegues`,
  `exit=0`);
- `await import('./scripts/publish.mjs')` con Node 20 no corre `main` (`exitCode=undefined`).

**Resumen real de testnet**, renderizado con `formatSummary` sobre el fixture con `network: testnet`, sin CLI. Abrevio
los IDs del fixture:

```text
Siguiente paso obligatorio (#8), no lo ejecuta este script. En la shell donde exportaste tu SUI_CONFIG_DIR
(README → "Uso en testnet", pasos 6-10):
  printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> 200
Verificación:
  printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client object <houseId> --json   # campo content.fee_rate
```

**Guarda `:?` de la línea impresa.** Tomé la línea real con ` sui client ` reemplazado por ` echo WOULD-RUN ` (no se
invoca la CLI) y la corrí con `env -u SUI_CONFIG_DIR bash -c "$LINE"`:

```text
bash: line 1: SUI_CONFIG_DIR: exporta tu SUI_CONFIG_DIR
exit=127
```

No aparece `WOULD-RUN` y el exit es distinto de 0. Este paso es un adelanto informal de A11 (TASK-4).

### Desviaciones del handoff (o "ninguna")

- **Qué cambió:** cuatro detalles que el handoff no especifica.
  1. `checkNodeVersion` normaliza un `v` inicial en `nodeVersion`, para no imprimir `vv26…`.
  2. El `.nvmrc` se lee con el `readTextOrNull` existente: si falta, el error es `.nvmrc sin versión válida`, sin la
     ruta que traería el `ENOENT` de `readFileSync`.
  3. El test de `bash -n` también afirma que la línea de localnet con `<bps>` **no** parsea. El handoff dice "en localnet
     no se aplica".
  4. El mensaje de `.nvmrc` va sin backticks (`.nvmrc sin versión válida`), igual que el `(.nvmrc)` del otro mensaje.
- **Por qué:**
  - (1) y (2): el mensaje tiene que salir sin rutas y legible.
  - (3): verifica la afirmación de la decisión M-2 del handoff ("`<bps>` … no se ejecuta, porque el shell lo toma como
    redirección").
  - (4): coherencia entre los dos mensajes.
- **Verificación extra realizada:**
  - mutaciones M1-M7 (tabla arriba);
  - el test de `isEntryPoint` usa un espía en lugar de `assert.fail` dentro de `realpath`, porque el `catch` de
    `isEntryPoint` atrapaba ese `assert.fail` y la mutación M5 sobrevivía;
  - corrida con Node 20 por symlink y desde otro cwd;
  - gates `sui move`.

### Riesgos / pendientes (o "ninguno")

- La guarda exige el **major exacto** de `.nvmrc`. Si algún día `.nvmrc` pasa a `26.13.0` o a `lts/*`, el script falla
  cerrado con `.nvmrc sin versión válida`: el formato tiene que seguir siendo un major entero.
- En la CI, `actions/setup-node` con `.nvmrc` da Node 26, así que el test con el `.nvmrc` real pasa. Se confirma en el
  run del PR.
- El resumen remite a "pasos 6-10" del runbook de `contracts/README.md`, que todavía no existen: los escribe TASK-3.
  Hasta entonces el README describe el runbook viejo.

### Documentación

- **READMEs / agents.md:** no aplica en este task. El handoff prohíbe tocar `contracts/README.md`, porque el runbook lo
  reescribe TASK-3, que incluye la línea "El script exige el Node de `.nvmrc` (26)".
- **STATUS (ya aplicado en el árbol):**
  - **n-1:** la fila de baseline de TASK-1 cita `4702f5a`.
  - **Fila nueva:** `contracts/scripts @ feature/issue-8-testnet-publish (4702f5a + TASK-2 de #8)`, Node `v26.13.0`,
    2026-11-03. Registra 104 PASS (51 + 53), 0 despliegues, el lock sin delta y Node 20/22 → exit 1.
  - **Fila "#8 🚧":** TASK-1 con su SHA y una línea de TASK-2.

**Higiene** (grep sobre el diff de los 3 archivos y sobre esta sección): 0 coincidencias de claves (`suiprivkey`,
`mnemonic`, `privkey`), 0 rutas personales y 0 hex de 40-64 en las líneas agregadas al código y a STATUS. En el resumen
pegado, los IDs del fixture van abreviados (`<packageId>`, `<houseId>`, `<houseCapId>`).

**Mensaje de commit sugerido:** `contracts: fail closed on a non-.nvmrc Node and print a guarded fee command (#8)`. No
hice commit ni push.

## Revisión TASK-2: PASA

> MID · 2026-11-03 · Contra `documents/HANDOFF_TESTNET_PUBLISH.md` v1.1 (TASK-2, con m-2), `documents/ESTANDARES.md` y el
> diff real sobre `4702f5a` (sin commitear: `publish.mjs`, `publish.test.mjs`, `STATUS.md` y este archivo). Gates no
> re-ejecutados (D-20261030-02): revisé el output pegado. TASK-1 cerró su criterio de G1: CI del PR #48 sobre `4702f5a`
> verde en los 3 jobs y 0 anotaciones H13 (check-run 126313057465).

**Checklist (FLUJO §5):**
- **Implementa lo pedido, ni más ni menos; HU del task cumplida:** ✅. M-4 y M-2 como pedía §3 del handoff. `RETRY_ADVICE` y `formatPostPublishFailure` sin tocar. `deployment.mjs`, `fixtures/`, `README` y `ci.yml` fuera del diff.
- **M-4, guarda de Node:** ✅.
  - `contracts/scripts/publish.mjs:329`: `checkNodeVersion` es pura y lee el major de `.nvmrc` con el regex del handoff.
  - Falla cerrada (`.nvmrc` ausente, `null`, `lts/*` o `26.13.0`), con mensaje sin rutas. Usa el `readTextOrNull` existente, así un `ENOENT` no filtra la ruta.
  - `:821`: es lo primero dentro del `try` de `main`, antes de `parseCliArgs`. El caso `['deploy']` da 1, no 2, y eso lo prueba.
  - `:839-858`: `isEntryPoint` devuelve el boolean tal cual. Sin él, compara los realpath y atrapa errores. El bloque de entrada ya no depende de `import.meta.main`.
  - Verificación manual pegada:
    - Node 20.20.2 y 22.23.4 salen con `exit=1` y el mensaje;
    - Node 26 da `0 despliegues`;
    - el camino sin `import.meta.main` funciona con Node 20 desde otro cwd y por symlink;
    - un `import()` con Node 20 no corre `main`.
  - Antes del cambio, M-4 se reprodujo (Node 20: `exit=0` mudo).
- **M-2 y m-2, comando pegable:** ✅.
  - `:51` `TESTNET_FEE_BPS = 200`, con referencia a D-20261103-01 (LIM-6).
  - `:54` `OWNER_CLI_PREFIX` es un string normal, con el comentario del porqué (LIM-7).
  - `:507`, `formatSummary`: `200` en testnet y `<bps>` en localnet; cada comando va solo en su línea; la nota del campo es un comentario `#`; no queda ningún `sui client` sin prefijo.
  - Nada interpola `${SUI_CONFIG_DIR:?…}`: el test lo comprueba contra el literal.
- **Tests (PROY-9 / LIM-11):** ✅. `publish.test.mjs` pasa de 48 a 53 (+5): `:281` `main` + guarda, `:312` y `:328` `checkNodeVersion`, `:333` `isEntryPoint`, `:736` `formatSummary` (reemplaza al de la v1) y `:765` `bash -n`.
  - Son deterministas, sin red y con el entorno restaurado.
  - `bash -n` solo parsea, y la cabecera del archivo lo declara.
  - Cubren happy path, rechazos y bordes.
  - El oráculo del prefijo en el test es un literal propio, independiente del código: no es duplicación (LIM-5).
  - La tabla de mutaciones M1-M7 muestra que los tests detectan cada regresión. El único sobreviviente (M6) es un mutante equivalente, bien justificado.
- **Gates:** ✅.
  - `node --test` **104/104** (51 + 53) con Node v26.13.0.
  - `check` "0 despliegues".
  - `git diff --exit-code -- Move.lock` 0.
  - Además, con los gates `sui move` corridos sin que hiciera falta: 0 / 0 / 83, sin delta.
- **SEG-3:** ✅.
  - Sin rutas personales (usa `<HOME real>`, `<scratchpad>`; las del test son ficticias, `/tmp/out`, `/repo/…`).
  - Sin claves ni hex de 40-64 en las líneas agregadas (lo verifiqué con grep sobre el diff).
  - El mensaje de error no trae rutas (el test lo afirma).
- **Desviaciones:** ✅. Las cuatro están declaradas y justificadas y ninguna amplía el alcance:
  1. normalizar el `v`;
  2. usar `readTextOrNull`;
  3. el test negativo de `<bps>`;
  4. el mensaje sin backticks.

  El cambio de `assert.fail` por un espía se explica con la mutación M5.
- **Docs (PROY-20):** ✅.
  - `documents/STATUS.md:40-42`: fila de baseline nueva.
  - `:43`: la fila de TASK-1 ahora cita `4702f5a`; con eso queda resuelto el nit n-1.
  - Fila "#8 🚧" actualizada.
  - El README no se toca a propósito, porque el runbook lo reescribe TASK-3. El riesgo de que los "pasos 6-10" todavía no existan está declarado y se cierra en el próximo task.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Sin hallazgos | — |

**Riesgo aceptado:** la guarda exige que `.nvmrc` sea un major entero (`26`). Es lo que pedía el handoff y falla cerrada; si algún día `.nvmrc` cambia de formato, el script lo dirá con un mensaje claro.

### Siguiente paso
- Commitear TASK-2: `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `documents/STATUS.md` y este archivo de reportes, o el reporte en el commit que decida el orquestador.
- Pushear al PR #48 y confirmar `contracts` verde en la CI. Ahí corre el test del `.nvmrc` real y el de `bash -n` en `ubuntu-24.04`.
- **TASK-3 autorizado** con el handoff v1.1, incluidos m-1 y m-3. En el runbook, el paso 6 tiene que remitir al comando que ahora imprime el script.

### Mensaje de commit propuesto
```
contracts: fail closed on a non-.nvmrc Node and print a guarded fee command (#8)

With Node 20 the script skipped main() and exited 0 silently, so a dry run
could look successful without running (M-4). main() now checks the Node
major against .nvmrc before anything else, and the entry point no longer
depends on import.meta.main. The post-publication summary prints the
update_fee_rate and verification commands behind
SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?...}" with printf 'n\n', 200 bps on
testnet (D-20261103-01) and <bps> on localnet, one pasteable command per
line (M-2, m-2). Script tests 99 -> 104.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
