# Reportes y revisiones — #75 (Sui CLI 1.84.0, framework de la PV 142)

> Registro del ciclo de #75 (`documents/HANDOFF_TOOLCHAIN_142.md`, v1.3.3). Contiene, **en orden de tareas y sin editar**, los reportes que dejó el DEV
> (archivos `.txt` del scratchpad, que el orquestador transcribe porque el DEV no escribe `.md`) y las revisiones del MID de cada tarea.
> Las revisiones del MAYOR del handoff (`REVISION_HANDOFF_TOOLCHAIN_142_v1.md`, `_v1.1.md` y `_v1.3.md`) están en `documents/` como archivos propios y
> no se duplican acá. La revisión de integración del MAYOR sobre el PR se publica con `gh pr review` y no va a este archivo.
>
> **Única edición del orquestador:** en el reporte de TASK-2a, la mención del contenedor de otro proyecto del host que ocupaba el puerto 9000 se
> reemplazó por «un contenedor de otro proyecto del host» (el repo es público y no nombra proyectos ajenos). Todo lo demás es literal.
>
> Los reportes llevan **direcciones y IDs de dos génesis de localnet desechables** solo como IDs de objetos y paquetes (públicos); ninguna dirección de cuenta,
> clave ni ruta personal (verificado con los cuatro greps §R-6 y con la comprobación de que ninguna dirección de cuenta efímera de las fixtures aparece acá).

## Índice

| # | Sección | Contenido |
|---|---|---|
| 1 | TASK-1 (DEV) | CLI 1.84.0 verificada por SHA-256 antes de ejecutarla, `ci.yml`, `Move.lock` repineado, gates de `contracts` y de `scripts/` |
| 2 | TASK-1 (revisión MID) | PASA |
| 3 | Sonda del puerto (DEV) | La localnet aislada puede correr en otro puerto con `sui start --fullnode-rpc-port` |
| 4 | TASK-2a (DEV) | Fixtures de `contracts/scripts/fixtures/` recapturadas en el puerto 19000; incidente de proceso |
| 5 | TASK-2a (revisión MID) | PASA, con la evaluación del incidente y la regla R-12 |
| 6 | TASK-2b, tramo 1 (DEV) | Guarda de captura con puerto de loopback (2.4.1-2.4.6) |
| 7 | TASK-2b, tramo 1 (revisión MID) | PASA, decisión B |
| 8 | TASK-2b, anexo 2.4.8 (DEV) | Cinco literales de `config.test.ts` |
| 9 | TASK-2b, anexo 2.4.8 (revisión MID) | PASA |
| 10 | TASK-2b, tramo 2 (DEV) | Fixtures de la app recapturadas en dos génesis (2.5-2.8) |
| 11 | TASK-2b, anexo (DEV) | Cinco literales de `game.test.ts` y `house.test.ts` |
| 12 | TASK-2b, tramo 2 y anexo (revisión MID) | PASA |
| 13 | TASK-3 (DEV) | Gates de la app, `deploy-image` y V-9 concluyente |
| 14 | TASK-3 (revisión MID) | PASA, con los issues de seguimiento #76, #77 y #78 |
| 15 | TASK-4 (DEV) | Docs y anexo |
| 16 | TASK-4 (revisión MID) | PASA |


---

## 1. TASK-1 (reporte del DEV)

> DEV, TASK-1: CLI, ci.yml, Move.lock y gates de contracts.

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 — TASK-1

### Branch (con SHA corto del HEAD)
`feature/issue-75-toolchain-1840` @ `db5442c` (sin commits mios; cambios en el arbol de trabajo, sin `git add`).

### Archivos modificados/creados
- `.github/workflows/ci.yml` (4 lineas de `env`, :22-25)
- `contracts/Move.lock` (solo por `sui move update-deps -e testnet`; 2 lineas `rev`)
- `contracts/scripts/deployment.test.mjs` (solo la linea 38 y su comentario)
- `contracts/scripts/publish.test.mjs` (solo :562-563, :567, :570-571)
Ningun archivo nuevo en el repo. Fuera del repo: CLI 1.84.0 instalada con `suiup` (default de la maquina), framework nuevo en `~/.move`.

### Que se implemento
CLI 1.84.0 instalada y verificada por SHA-256 antes de ejecutarla, fijada en `ci.yml` (version, commit y los dos SHA-256); `Move.lock` repineado por la CLI de `05ad86a3…` (PV 140) a `e6f43880f4b65e2c1f0397583a9690b4b22c9223` (PV 142); los dos literales de `scripts/` que dependen de `ci.yml` y del lock adaptados. Gates de `contracts`/`scripts` sin delta: 0 warnings, 0 lints, 83 tests, 104 script tests, `check` OK.

### Valores finales
- `SUI_VERSION` 1.84.0 | `SUI_COMMIT` 9dc25070cf2e (de `sui --version` del binario instalado; = 12 primeros hex del commit del tag `9dc25070cf2ed18bcda1ebb095f39708638195a8`)
- `SUI_TGZ_SHA256` 0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127
- `SUI_BIN_SHA256` ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0
- Rev final de `Move.lock`: e6f43880f4b65e2c1f0397583a9690b4b22c9223

========================================================================
## 1.0 LINEA BASE con la CLI vieja (1.83.0), antes de cambiar nada
========================================================================
### Arbol limpio, CLI, hashes, guardas, Docker, ~/.move, suiup (comandos: git status --porcelain --untracked-files=all; command -v sui; printf 'n\n' | sui --version; sha256sum de command -v sui y del binario sui-v1.83.0; sed -n 18,25p ci.yml; stat/ls -la/sha256sum de client.yaml; docker ps -aq / images -aq (conteos); du -s ~/.move; suiup show; suiup --version)
$ git status --porcelain --untracked-files=all   -> (vacio, exit 0)
$ command -v sui
<HOME real>/.local/bin/sui
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ sha256sum "$(command -v sui)"
29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  <HOME real>/.local/bin/sui
$ sha256sum <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.83.0
29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.83.0
(= ci.yml:25 de master, y = sha256sum "$(command -v sui)")
$ sed -n 18,25p .github/workflows/ci.yml
env:
  # Única fuente de la versión de la Sui CLI en CI: debe coincidir con documents/STATUS.md (Toolchain).
  # Al subir de versión: SUI_TGZ_SHA256 = gh api repos/MystenLabs/sui/releases/tags/testnet-v<versión> --jq '.assets[] | .name + " " + .digest'
  #                      SUI_BIN_SHA256 = sha256sum del binario `sui` de esa versión instalado en local con suiup
  SUI_VERSION: "1.83.0"
  SUI_COMMIT: "16d2dc1e05ed"
  SUI_TGZ_SHA256: "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8"
  SUI_BIN_SHA256: "29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa"
$ stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
$ ls -la <HOME real>/.sui/sui_config/
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
$ sha256sum <HOME real>/.sui/sui_config/client.yaml
ef12fd09615fda85a675890de0ea31b485f79645afa4617709de2554944b4162  <HOME real>/.sui/sui_config/client.yaml
$ docker ps -aq | wc -l  -> 5
$ docker images -aq | wc -l  -> 15
$ du -s <HOME real>/.move
113216	<HOME real>/.move
$ suiup show   (suiup --version: suiup 0.1.1)
Default binaries:  sui  testnet  v1.83.0  No
Installed binaries: sui  testnet  v1.83.0  No

### Gates de contracts con 1.83.0 (desde <repo>/contracts, forma canonica)
$ printf 'n\n' | sui move build -e testnet --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ ... sui move build -e testnet --lint --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ ... sui move test -e testnet --warnings-are-errors (output completo)
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
$ git diff --exit-code -- Move.lock Published.toml deployments/testnet.json
exit=0
$ node --version
v26.13.0
$ node --test scripts/*.test.mjs (output completo)
✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real (4.879694ms)
✔ parsePublishOutput no depende de la posición en objectChanges (0.780322ms)
✔ parsePublishOutput rechaza una transacción que no terminó en success (0.815139ms)
✔ parsePublishOutput rechaza una salida sin objeto published (0.423419ms)
✔ parsePublishOutput rechaza dos Houses creadas (0.599699ms)
✔ parsePublishOutput rechaza una salida sin HouseCap (0.519393ms)
✔ parsePublishOutput rechaza una salida sin UpgradeCap (0.437665ms)
✔ parsePublishOutput rechaza una House de otro paquete (0.467342ms)
✔ parsePublishOutput rechaza una House no compartida (0.671894ms)
✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs (0.820422ms)
✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto (0.556153ms)
✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta (1.872954ms)
✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture (0.832212ms)
✔ validateDeployment: falta schemaVersion (0.357248ms)
✔ validateDeployment: falta network (0.163995ms)
✔ validateDeployment: falta chainId (0.222129ms)
✔ validateDeployment: falta packageId (0.191365ms)
✔ validateDeployment: falta originalPackageId (0.153215ms)
✔ validateDeployment: falta packageVersion (0.156349ms)
✔ validateDeployment: falta upgradeCapId (0.167399ms)
✔ validateDeployment: falta houseId (0.153018ms)
✔ validateDeployment: falta houseCapId (0.210273ms)
✔ validateDeployment: falta publishTxDigest (0.156917ms)
✔ validateDeployment: falta publishTimestamp (0.158607ms)
✔ validateDeployment: falta sourceCommit (0.131346ms)
✔ validateDeployment: falta suiCliVersion (0.126173ms)
✔ validateDeployment: falta frameworkRev (0.143098ms)
✔ validateDeployment rechaza: clave desconocida (0.328284ms)
✔ validateDeployment rechaza: ID corto (0.198691ms)
✔ validateDeployment rechaza: ID en mayúsculas (0.270193ms)
✔ validateDeployment rechaza: testnet con chain id ajeno (0.271606ms)
✔ validateDeployment rechaza: localnet con el chain id de testnet (0.185519ms)
✔ validateDeployment rechaza: localnet con el chain id de mainnet (0.216994ms)
✔ validateDeployment rechaza: sourceCommit null en testnet (0.218849ms)
✔ validateDeployment rechaza: network mainnet (0.200702ms)
✔ validateDeployment rechaza: publishTimestamp sin milisegundos (0.222132ms)
✔ validateDeployment rechaza: publishTimestamp sin Z (0.188633ms)
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error (0.708992ms)
✔ parsePublishedToml lee cada campo del fixture real (0.945116ms)
✔ parsePublishedToml rechaza una línea inesperada con su número (0.367392ms)
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea (0.410463ms)
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea (0.217234ms)
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea (0.212605ms)
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea (0.269192ms)
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea (0.308688ms)
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea (0.199911ms)
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea (0.290137ms)
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia (0.788809ms)
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo (1.628268ms)
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex (0.343088ms)
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex (0.242336ms)
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado (4.223468ms)
✔ runSui invoca cada vector permitido (3.127021ms)
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca (2.102051ms)
✔ runSui no invoca sin un configDir validado (0.65125ms)
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca (0.729203ms)
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/ (1.044122ms)
✔ parseCliArgs: subcomandos y opciones válidos (2.535326ms)
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y (1.996624ms)
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI) (3.349373ms)
✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI (1.256117ms)
✔ main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI (0.965182ms)
✔ checkNodeVersion: el major de Node debe ser el de .nvmrc (1.059668ms)
✔ checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc) (0.308741ms)
✔ isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo (0.623996ms)
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet (0.344517ms)
✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet (0.33441ms)
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui (1.1277ms)
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath (0.250533ms)
✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original (0.827241ms)
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id (0.330434ms)
✔ checkNetworkGuard: chain id según la red (0.43691ms)
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier (0.608228ms)
✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto (0.35253ms)
✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones (0.818884ms)
✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml (0.977088ms)
✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error (1.264468ms)
✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok (0.275776ms)
✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta (0.389517ms)
✔ confirmación: ninguna variable de entorno la omite (1.512479ms)
✔ resolveRecordMeta: usa meta.json si existe (0.319542ms)
✔ resolveRecordMeta: sin meta.json exige los flags (0.39798ms)
✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error (0.311361ms)
✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues (0.323119ms)
✔ checkDeployments: localnet válido sin entrada en Published.toml (1.447819ms)
✔ checkDeployments: testnet sin Published.toml ⇒ error (1.717436ms)
✔ checkDeployments: entrada de Published.toml sin json ⇒ error (0.2627ms)
✔ checkDeployments: nombre de archivo distinto de network ⇒ error (0.366191ms)
✔ checkDeployments: json inválido ⇒ error (0.491437ms)
✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error (0.893404ms)
✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3) (0.277787ms)
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea (0.215566ms)
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos (0.32234ms)
✔ formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas (1.022804ms)
✔ formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar) (12.533939ms)
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar (0.318604ms)
✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra (0.215222ms)
✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo (0.232197ms)
✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr (0.225049ms)
✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo (0.160197ms)
✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo) (0.284769ms)
✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2) (0.25269ms)
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout (0.542262ms)
✔ interpretCliRun: salida real ⇒ el resultado del parser (0.375117ms)
ℹ tests 104
ℹ suites 0
ℹ pass 104
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 222.241037
exit=0
$ node scripts/publish.mjs check
1 despliegue(s) válidos y coherentes con Published.toml
exit=0
$ git status --porcelain --untracked-files=all  -> (vacio; lineas: 0)

### Gates de app con 1.83.0 (desde <repo>, Node v26.13.0)
$ npm ci

added 293 packages, and audited 295 packages in 9s

67 packages are looking for funding
  run `npm fund` for details

9 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
$ npm audit signatures
audited 292 packages in 10s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

exit=0
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
exit=0
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

exit=0
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

exit=0
$ npm test -w app (output completo)

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  65 passed (65)
      Tests  1156 passed (1156)
   Start at  22:35:37
   Duration  23.39s (environment 58%, tests 15%, import 11%, setup 10%, transform 6%, worker 1%)

Environment  jsdom was created 65 times · 127.73s total, 58% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 607 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 495ms
exit=0
$ git status --porcelain --untracked-files=all (tras npm ci/test/build) -> (vacio; lineas: 0)

### deploy-image con 1.83.0: bash app/scripts/check-deploy-image.sh . 8090
Modo positivo: el contexto tiene contracts/deployments/testnet.json
P1 ok: imagen construida
P2 ok: el contenedor responde en http://127.0.0.1:8090/
P3 ok: corre como 65534 con --cap-drop=ALL
P4 ok: / 200 y CSP idéntica a la del Caddyfile
P5 ok: cabeceras de seguridad y Cache-Control de / exactas
P6 ok: sin Cross-Origin-Opener-Policy ni Server
P7 ok: /assets/index-B3BeMVQC.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable
P8 ok: /assets/index-B3BeMVQC.js comprimido (zstd)
P9 ok: /favicon.svg 200, image/svg+xml
P10 ok: /no-existe 404
P11 ok: /game/0x1 404
P12 ok: /assets/no-existe.js 404 sin immutable
OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)
exit=0
Docker tras deploy-image: `docker ps -aq` 5 (igual); `docker images -aq` 29 (+14: 12 intermedias `<none>` + las dos imagenes base que el Dockerfile bajo por primera vez: `node:26.13.0-bookworm-slim` y `caddy:2.11.7-alpine`). Las 12 `<none>` nuevas se borraron POR ID (`docker rmi <id>`, solo las que no estaban en la linea base); no se borro ninguna imagen preexistente. Las dos imagenes base nombradas quedan (no son intermedias `<none>`; el handoff solo manda borrar estas). Estado: `docker images -aq` = 17 (15 + 2 base), `docker ps -aq` = 5.
git status tras deploy-image: vacio.

### Comparacion de la linea base medida con la tabla de §0
| Gate | §0 | Medido (1.83.0) | Delta |
|---|---|---|---|
| CLI | sui 1.83.0-16d2dc1e05ed, suiup 0.1.1 | idem | ninguno |
| build / lint | 0 warnings / 0 lints, exit 0 | exit 0, sin warnings ni lints | ninguno |
| test | 83 PASS | 83 PASS | ninguno |
| lock/Published/testnet.json | sin delta | exit 0 | ninguno |
| node --test / check | 104 / `1 despliegue(s)…` | 104 / `1 despliegue(s) válidos y coherentes con Published.toml` | ninguno |
| app npm ci / firmas / audit | 293 / 292 / 0 prod | 293 paquetes agregados / 292 firmas / 0 vulnerabilidades de produccion (npm ci imprime ademas "9 moderate" de desarrollo: ya existia, no es de produccion ni de este task) | ninguno |
| lint / typecheck / tests | 0 / 0 / 1156 en 65 | 0 / 0 / 1156 en 65 | ninguno |
| build | index-B3BeMVQC.js 917.80 kB (277.96 gzip) | idem | ninguno |
| deploy-image | "P1-P13", OK (positivo) | OK (positivo), exit 0; el script imprime P1-P12 (no P13) | solo de rotulo en el handoff/STATUS (el script real llega a P12); sin delta de comportamiento |
| framework-drift | avisa CLI atrasada | (CI; no medible localmente aqui) | n/a |
=> Linea base sin delta respecto de la tabla.

========================================================================
## 1.1 V-7 (lecturas publicas sin claves)
========================================================================
$ GraphQL testnet
{"data":{"epoch":{"epochId":1289,"protocolConfigs":{"protocolVersion":142}}}}
$ MAX_PROTOCOL_VERSION @ testnet-v1.84.0
142
$ manifest 142
e6f43880f4b65e2c1f0397583a9690b4b22c9223
$ release asset
sui-testnet-v1.84.0-ubuntu-x86_64.tgz sha256:0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127 
$ tag sha
9dc25070cf2ed18bcda1ebb095f39708638195a8
Release `testnet-v1.84.0`: published_at 2026-11-10T19:01:47Z, draft=false, prerelease=false (el campo published_at del asset viene vacio en `gh api`; el del release esta arriba).
Registro para STATUS: PV de testnet = 142, epoca 1289, PV maxima de la CLI 1.84.0 (MAX_PROTOCOL_VERSION @ tag) = 142, rev de la PV 142 del manifest = e6f43880f4b65e2c1f0397583a9690b4b22c9223, tag -> 9dc25070cf2ed18bcda1ebb095f39708638195a8, digest del tgz sha256:0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127. Todo = esperado; sin S-1.

========================================================================
## 1.2 Instalacion y verificacion de la 1.84.0 (orden del handoff; el binario 1.84.0 NO se ejecuto hasta el paso 5)
========================================================================
Constancia: entre `suiup install sui@testnet-1.84.0` y los tres `sha256sum` coincidentes (paso 4) no se invoco `sui` (ni `sui --version`) ni ninguna herramienta que lo llame; el primer comando que ejecuta el binario nuevo es el del paso 5. (`suiup install` solo descarga/coloca y fija el default; el `.tgz` se extrajo con `tar` y no se ejecuto.)
$ suiup install sui@testnet-1.84.0
Detected: ubuntu-x86_64...
Searching for release with tag: testnet-v1.84.0...
Adding binary: sui-v1.84.0
Extracting file: sui
 'sui' extracted successfully!
Installing binary to <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.84.0
Setting sui as default
[testnet] sui-v1.84.0 set as default
exit=0
(la descarga de 1.1 GB tardo ~12 min; el comando se movio a segundo plano del harness)
$ suiup show
Default binaries:   sui  testnet  v1.84.0  No
Installed binaries: sui  testnet  v1.83.0  No
                    sui  testnet  v1.84.0  No
$ suiup default get -> sui testnet v1.84.0
$ stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
$ ls -la <HOME real>/.sui/sui_config/   -> identico a la linea base (solo client.yaml, 244 bytes, mismas fechas)

Paso 2: sha256sum <HOME real>/.cache/suiup/releases/sui-testnet-v1.84.0-ubuntu-x86_64.tgz
0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127   (= digest del release por gh api, 1.1)
Paso 3: tar -xzf <tgz del cache> -C <scratchpad>/t1/extract ./sui   (dir nuevo y vacio; tar-exit=0; no se ejecuto)
sha256sum <scratchpad>/t1/extract/sui
ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0
Paso 4: sha256sum "$(command -v sui)" <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.84.0 <scratchpad>/t1/extract/sui
ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0  <HOME real>/.local/bin/sui
ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0  <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.84.0
ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0  <scratchpad>/t1/extract/sui
=> los tres iguales = SUI_BIN_SHA256.

LOS CUATRO HASHES DE LA 1.84.0 + EL DE LA 1.83.0 (en el orden de 1.2):
 1. release (gh api, digest):         0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127
 2. tgz del cache de suiup:           0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127
 3. extraido del tgz (tar de la CI):  ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0
 4. binario instalado = copia suiup:  ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0
 (1.83.0, binario)                    29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa
Paso 5 (recien ahora): $ printf 'n\n' | sui --version
sui 1.84.0-9dc25070cf2e     (= los 12 primeros hex del commit del tag; sin S-6)
Paso 6: `<HOME real>/.local/share/suiup/binaries/testnet/sui-v1.83.0` sigue instalado (235884552 bytes); su sha256sum sigue siendo 29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa = el de ci.yml:25 de master (M-5, V-16 de #73).
Guardas tras 1.2: client.yaml sin cambios (mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, sha256 ef12fd09615f… igual, directorio con solo client.yaml).

========================================================================
## 1.3 ci.yml
========================================================================
$ git diff -U0 -- .github/workflows/ci.yml
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index cec306c..72fc49e 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -22,4 +22,4 @@ env:
-  SUI_VERSION: "1.83.0"
-  SUI_COMMIT: "16d2dc1e05ed"
-  SUI_TGZ_SHA256: "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8"
-  SUI_BIN_SHA256: "29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa"
+  SUI_VERSION: "1.84.0"
+  SUI_COMMIT: "9dc25070cf2e"
+  SUI_TGZ_SHA256: "0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127"
+  SUI_BIN_SHA256: "ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0"
$ [ "$(printf 'n\n' | sui --version)" = "sui 1.84.0-9dc25070cf2e" ]; echo $?  -> 0   (el check de ci.yml:94-98 compara exactamente eso)
$ docker run --rm -v <repo>:/repo:ro -w /repo rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -no-color .github/workflows/ci.yml
exit=0
(actionlint: 0 hallazgos; imagenes: 17 antes y despues, no bajo ninguna imagen nueva)

========================================================================
## 1.4 Repin del lock (update-deps -e testnet, forma canonica)
========================================================================
$ du -s <HOME real>/.move   (antes)
113216	<HOME real>/.move
$ cp Move.lock <scratchpad>/Move.lock.antes
$ printf 'n\n' | sui move update-deps -e testnet; echo "exit=$?"
Downloading from https://github.com/MystenLabs/sui.git
exit=0
$ diff <scratchpad>/Move.lock.antes Move.lock
8c8
< source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "05ad86a3e86c522deea116f80dc2bf2309a53363" }
---
> source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "e6f43880f4b65e2c1f0397583a9690b4b22c9223" }
14c14
< source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "05ad86a3e86c522deea116f80dc2bf2309a53363" }
---
> source = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "e6f43880f4b65e2c1f0397583a9690b4b22c9223" }
(diff exit 1 = hay diferencias; cp Move.lock <scratchpad>/Move.lock.despues hecho justo despues)
$ du -s <HOME real>/.move   (despues)
170748	<HOME real>/.move
Delta de ~/.move: +57532 KB (el framework e6f43880… se descargo a la cache de Move, fuera del repo; declarado como en #8).
Justificacion del delta (PROY-11): solo cambian los dos `rev` (`[pinned.testnet.MoveStdlib]` y `[pinned.testnet.Sui]`), de 05ad86a3e86c522deea116f80dc2bf2309a53363 (PV 140) a e6f43880f4b65e2c1f0397583a9690b4b22c9223 = el piso de la PV 142 en el manifest de la 1.84.0 (V-7), y testnet esta en PV 142 (epoca 1289). `[move] version = 4` igual; los tres `manifest_digest` (C4FE4C91…, 7AFB6669…, 57457062… del paquete `battleship`) iguales; sin secciones nuevas. Delta exactamente el esperado; sin S-2 ni S-5. El lock lo escribio la CLI, no se edito a mano.
Pre-vuelo local de framework-drift: rev del lock (e6f43880…) = rev de la PV 142 del manifest (V-7); PV maxima de la CLI (142) >= PV de testnet (142) => lock al dia y sin "CLI atrasada".

========================================================================
## 1.5 Literales adaptados (git diff -U0 -- contracts/scripts)
========================================================================
diff --git a/contracts/scripts/deployment.test.mjs b/contracts/scripts/deployment.test.mjs
index 2fe8890..5db025e 100644
--- a/contracts/scripts/deployment.test.mjs
+++ b/contracts/scripts/deployment.test.mjs
@@ -38 +38 @@ const FRAMEWORK_REV = '719fb2960ccfbf9f4d33041f8ea5146d30671696'; // fixture loc
-const LOCK_FRAMEWORK_REV = '05ad86a3e86c522deea116f80dc2bf2309a53363'; // Move.lock del repo: piso de la PV 140 (repin de #8)
+const LOCK_FRAMEWORK_REV = 'e6f43880f4b65e2c1f0397583a9690b4b22c9223'; // Move.lock del repo: piso de la PV 142 (repin de #75)
diff --git a/contracts/scripts/publish.test.mjs b/contracts/scripts/publish.test.mjs
index 528d469..0920b48 100644
--- a/contracts/scripts/publish.test.mjs
+++ b/contracts/scripts/publish.test.mjs
@@ -562,2 +562,2 @@ test('checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml', () => {
-  assert.deepEqual(checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML }), {
-    suiCliVersion: '1.83.0-16d2dc1e05ed',
+  assert.deepEqual(checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.84.0-9dc25070cf2e\n', ciYamlText: CI_YAML }), {
+    suiCliVersion: '1.84.0-9dc25070cf2e',
@@ -567 +567 @@ test('checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml', () => {
-    () => checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.84.0-aaaaaaaaaaaa\n', ciYamlText: CI_YAML }),
+    () => checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML }),
@@ -570,2 +570,2 @@ test('checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml', () => {
-  const local = checkCliVersion({ network: 'localnet', versionOutput: 'sui 1.84.0-aaaaaaaaaaaa\n', ciYamlText: CI_YAML });
-  assert.equal(local.suiCliVersion, '1.84.0-aaaaaaaaaaaa');
+  const local = checkCliVersion({ network: 'localnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML });
+  assert.equal(local.suiCliVersion, '1.83.0-16d2dc1e05ed');
Constantes de tests tocadas: `LOCK_FRAMEWORK_REV` (deployment.test.mjs:38) y, en el test `checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml` (publish.test.mjs:562-571), el caso "igual a CI" (`sui 1.84.0-9dc25070cf2e`, `suiCliVersion: '1.84.0-9dc25070cf2e'`) y los casos "otra version" (testnet y localnet: `sui 1.83.0-16d2dc1e05ed`; `local.suiCliVersion` esperado `1.83.0-16d2dc1e05ed`). Ningun test borrado ni debilitado; `publish.test.mjs:574` (yaml propio) no se toco.

========================================================================
## 1.6 Gates con la 1.84.0 (contracts + scripts)
========================================================================
--- sui (output completo, incluidas las 83 lineas [ PASS ])
sui 1.84.0-9dc25070cf2e
$ build
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ lint
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ test
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
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS    ] battleship::house_tests::test_migrate_rejects_current_version
[ PASS    ] battleship::house_tests::test_migrate_rejects_house_newer_than_package
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS    ] battleship::house_tests::test_min_bet_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_transfer_house_cap_moves_cap_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::house_tests::test_transferred_cap_lets_new_holder_administer
[ PASS    ] battleship::house_tests::test_update_bet_limits_accepts_equal_min_and_max
[ PASS    ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_min_above_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_invite_by_invitee_resolves
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::game_tests::test_accept_max_bet_with_max_fee_does_not_overflow
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_open_game_acceptor_wins_pays_payout_and_fee
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_open_game_creator_wins_pays_payout_and_fee
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
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
$ cmp lock
exit=0
$ diff Published/testnet.json
exit=0
--- node (output completo)
v26.13.0
$ node --test
✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real (13.942379ms)
✔ parsePublishOutput no depende de la posición en objectChanges (1.718739ms)
✔ parsePublishOutput rechaza una transacción que no terminó en success (1.492819ms)
✔ parsePublishOutput rechaza una salida sin objeto published (0.840457ms)
✔ parsePublishOutput rechaza dos Houses creadas (1.136531ms)
✔ parsePublishOutput rechaza una salida sin HouseCap (0.962866ms)
✔ parsePublishOutput rechaza una salida sin UpgradeCap (2.079598ms)
✔ parsePublishOutput rechaza una House de otro paquete (1.097052ms)
✔ parsePublishOutput rechaza una House no compartida (3.008558ms)
✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs (1.328591ms)
✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto (1.045508ms)
✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta (3.334275ms)
✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture (2.271425ms)
✔ validateDeployment: falta schemaVersion (0.521864ms)
✔ validateDeployment: falta network (0.367351ms)
✔ validateDeployment: falta chainId (0.985086ms)
✔ validateDeployment: falta packageId (0.414182ms)
✔ validateDeployment: falta originalPackageId (0.366689ms)
✔ validateDeployment: falta packageVersion (0.330638ms)
✔ validateDeployment: falta upgradeCapId (0.364081ms)
✔ validateDeployment: falta houseId (0.336404ms)
✔ validateDeployment: falta houseCapId (0.321585ms)
✔ validateDeployment: falta publishTxDigest (0.363ms)
✔ validateDeployment: falta publishTimestamp (0.273531ms)
✔ validateDeployment: falta sourceCommit (0.313603ms)
✔ validateDeployment: falta suiCliVersion (0.277357ms)
✔ validateDeployment: falta frameworkRev (0.275262ms)
✔ validateDeployment rechaza: clave desconocida (0.517718ms)
✔ validateDeployment rechaza: ID corto (0.3895ms)
✔ validateDeployment rechaza: ID en mayúsculas (0.39607ms)
✔ validateDeployment rechaza: testnet con chain id ajeno (0.343328ms)
✔ validateDeployment rechaza: localnet con el chain id de testnet (0.659411ms)
✔ validateDeployment rechaza: localnet con el chain id de mainnet (3.840519ms)
✔ validateDeployment rechaza: sourceCommit null en testnet (0.456087ms)
✔ validateDeployment rechaza: network mainnet (0.357134ms)
✔ validateDeployment rechaza: publishTimestamp sin milisegundos (0.798145ms)
✔ validateDeployment rechaza: publishTimestamp sin Z (0.363362ms)
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error (1.270037ms)
✔ parsePublishedToml lee cada campo del fixture real (1.517717ms)
✔ parsePublishedToml rechaza una línea inesperada con su número (0.63849ms)
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea (0.815059ms)
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea (0.403629ms)
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea (0.394432ms)
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea (0.789708ms)
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea (0.572616ms)
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea (0.382662ms)
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea (0.322181ms)
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia (2.535097ms)
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo (0.815287ms)
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex (0.524292ms)
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex (0.435274ms)
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado (8.286286ms)
✔ runSui invoca cada vector permitido (3.987734ms)
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca (2.431001ms)
✔ runSui no invoca sin un configDir validado (1.31682ms)
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca (0.812929ms)
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/ (1.096057ms)
✔ parseCliArgs: subcomandos y opciones válidos (3.061672ms)
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y (2.808692ms)
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI) (5.05911ms)
✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI (2.009109ms)
✔ main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI (2.166038ms)
✔ checkNodeVersion: el major de Node debe ser el de .nvmrc (1.264883ms)
✔ checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc) (0.454134ms)
✔ isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo (0.9808ms)
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet (0.756318ms)
✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet (0.635553ms)
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui (2.051454ms)
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath (0.46067ms)
✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original (1.07035ms)
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id (0.368357ms)
✔ checkNetworkGuard: chain id según la red (0.486277ms)
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier (0.968132ms)
✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto (0.423225ms)
✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones (0.93842ms)
✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml (1.399752ms)
✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error (1.619663ms)
✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok (0.352377ms)
✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta (0.670446ms)
✔ confirmación: ninguna variable de entorno la omite (0.534094ms)
✔ resolveRecordMeta: usa meta.json si existe (0.519784ms)
✔ resolveRecordMeta: sin meta.json exige los flags (3.175124ms)
✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error (0.69023ms)
✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues (0.602229ms)
✔ checkDeployments: localnet válido sin entrada en Published.toml (2.083791ms)
✔ checkDeployments: testnet sin Published.toml ⇒ error (1.699219ms)
✔ checkDeployments: entrada de Published.toml sin json ⇒ error (0.633593ms)
✔ checkDeployments: nombre de archivo distinto de network ⇒ error (0.787737ms)
✔ checkDeployments: json inválido ⇒ error (0.83863ms)
✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error (1.470759ms)
✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3) (0.557117ms)
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea (0.378346ms)
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos (1.198015ms)
✔ formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas (3.521486ms)
✔ formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar) (25.588385ms)
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar (0.460373ms)
✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra (0.380064ms)
✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo (0.389395ms)
✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr (0.305158ms)
✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo (0.252479ms)
✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo) (0.505338ms)
✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2) (0.456953ms)
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout (1.048586ms)
✔ interpretCliRun: salida real ⇒ el resultado del parser (1.172951ms)
ℹ tests 104
ℹ suites 0
ℹ pass 104
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 357.820677
exit=0
$ check
1 despliegue(s) válidos y coherentes con Published.toml
exit=0
--- git diff --stat / git status --porcelain --untracked-files=all
 .github/workflows/ci.yml              |  8 ++++----
 contracts/Move.lock                   |  4 ++--
 contracts/scripts/deployment.test.mjs |  2 +-
 contracts/scripts/publish.test.mjs    | 10 +++++-----
 4 files changed, 12 insertions(+), 12 deletions(-)
---
 M .github/workflows/ci.yml
 M contracts/Move.lock
 M contracts/scripts/deployment.test.mjs
 M contracts/scripts/publish.test.mjs
(solo ci.yml, Move.lock y los dos tests; contracts/sources, contracts/tests, Move.toml, Published.toml y deployments/testnet.json sin delta)

### Cierre: estado y guardas
- `Move.lock`: cambiado solo por `update-deps`; `cmp Move.lock <scratchpad>/Move.lock.despues` -> exit 0 tras los gates.
- `Published.toml` y `contracts/deployments/testnet.json`: `git diff --exit-code` exit 0 (sin delta).
- `~/.sui/sui_config/` al final: `stat` 2026-10-30 17:52:52.515735237 -0500, 244 bytes; `ls -la` solo `client.yaml`; sha256 ef12fd09615fda85a675890de0ea31b485f79645afa4617709de2554944b4162 = linea base. Sin S-7.
- `du -s <HOME real>/.move`: 113216 (antes) -> 170748 (despues; framework e6f43880… descargado).
- Docker: `docker ps -aq` 5 -> 5; `docker images -aq` 15 -> 17 (las dos imagenes base nombradas de deploy-image: node:26.13.0-bookworm-slim y caddy:2.11.7-alpine; las 12 intermedias `<none>` se borraron por ID).
- suiup: default 1.84.0; 1.83.0 sigue instalada.

### Tests y gates (resumen comparado con §0)
| Gate | §0 / linea base | 1.84.0 |
|---|---|---|
| build / lint | 0 / 0 | 0 / 0 (exit 0) |
| test | 83 PASS | 83 PASS |
| Move.lock | sin delta | repineado (solo 2 rev) y estable (cmp 0) |
| Published.toml / testnet.json | sin delta | sin delta |
| node --test / check | 104 / 1 despliegue(s) | 104 / `1 despliegue(s) válidos y coherentes con Published.toml` |
| actionlint | — | 0 hallazgos |
Gates de app y deploy-image: solo en la linea base 1.0 (TASK-1 no toca app; se re-miden en TASK-3).

### Desviaciones del handoff
- Ninguna de alcance (solo se tocaron los archivos de "Tocar").
- Observaciones sin desviar: (a) el script `check-deploy-image.sh` imprime P1-P12, no P1-P13 como dice §0/STATUS (rotulo; sin delta de comportamiento); (b) `docker images -aq` quedo en 17 (+2 imagenes base nombradas bajadas por primera vez, no `<none>`); (c) el campo `published_at` del asset de `gh api` viene vacio (el del release es 2026-11-10T19:01:47Z); (d) el unico comando que corrio mas de 2 minutos fue `suiup install` (descarga, ~12 min).

### Riesgos / pendientes
- La maquina queda con la 1.84.0 como `sui` por defecto; la 1.83.0 sigue instalada (no correr `suiup remove`, V-16 de #73).
- `npm ci` imprime "9 moderate severity vulnerabilities" (solo desarrollo; la auditoria de produccion da 0): preexistente, fuera de alcance.
- Los mensajes de framework-drift de ci.yml:246 y 250-251 no se tocaron (H-12).

### STOPs levantados
Ninguno (S-1 a S-9 no se dieron: PV 142 en testnet, tres hashes coincidentes, SUI_COMMIT = tag, lock en e6f43880…, sin cambios en sources/tests, ~/.sui intacto).

### Documentacion
- READMEs / agents.md / STATUS: no aplica en TASK-1 (TASK-4). Tablas de contrato y app/src/sui sincronizados: no aplica (sin cambios de contrato).
- Snippet para STATUS: se propone en TASK-4 con los valores de este reporte.

### Seguridad (R-6)
Los 4 greps (`/usr/bin/grep -nE`, patrones exactos de R-6 §2) se corrieron (a) sobre el diff (`git diff -U0`, solo lineas `+`, 7 lineas `+` en total) y (b) sobre este reporte ya sanitizado (placeholders `<repo>`, `<HOME real>`, `<scratchpad>`, `<user>`), antes de agregar esta seccion (que solo repite valores ya clasificados).

(a) Diff, lineas `+`:
- Grep 1 (40-64 hex): 5 coincidencias, todas publicas:
  - ci.yml `SUI_TGZ_SHA256` = 0f006fb4… (digest del tgz del release, SHA-256 publico) 
  - ci.yml `SUI_BIN_SHA256` = ac657ec1… (SHA-256 del binario publico del release)
  - Move.lock, 2 lineas `rev` = e6f43880f4b6… (commit publico del framework, PV 142)
  - deployment.test.mjs:38 `LOCK_FRAMEWORK_REV` = el mismo e6f43880… 
  (SUI_VERSION/SUI_COMMIT/`9dc25070cf2e` y los literales de publish.test.mjs son de 12 hex: fuera del patron)
- Grep 2 (0x + 8 hex): vacio.
- Grep 3 (claves, frases, rutas personales): vacio.
- Grep 4 (hex abreviado con puntos): vacio.

(b) Este reporte:
- Grep 1: 39 lineas con coincidencia; valores distintos y clasificacion (todos publicos):
  - 0f006fb4… digest del tgz de la 1.84.0 (release publico)
  - ac657ec1… SHA-256 del binario 1.84.0 (publico, del tgz del release)
  - 29e1beb9… SHA-256 del binario 1.83.0 (ya publico en ci.yml de master)
  - e51168051… SHA-256 del tgz 1.83.0 (ya publico en ci.yml de master)
  - e6f43880… commit del framework PV 142 (publico)
  - 05ad86a3… commit del framework PV 140 (publico, el lock anterior)
  - 719fb296… commit del framework PV 139 (publico; aparece en el contexto del hunk del diff de deployment.test.mjs)
  - 9dc25070cf2e…d8 (40 hex) commit del tag testnet-v1.84.0 (publico)
  - ef12fd09… SHA-256 de `client.yaml` (guarda R-2 opcional: el hash no revela contenido; no hay claves en ese archivo)
  - b1934ee5… digest de la imagen de actionlint fijada en app/README.md (publico, ya en el repo)
- Grep 2: vacio. Grep 3: vacio. Grep 4: vacio.
No hay direcciones de cuenta, claves, mnemónicos, rutas personales ni nombres de usuario en el diff ni en el reporte.

~~~~


---

## 2. TASK-1 (revisión del MID)

> MID, TASK-1.

## Revisión TASK-1: PASA

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-1.txt` (845 líneas) contra `HANDOFF_TOOLCHAIN_142.md` v1.2 y contra el diff real sin commitear de `<repo>` (`git diff`: 4 archivos, 12 inserciones y 12 borrados, idéntico al `git diff --stat` del reporte, líneas 771-775). Solo se leyó el reporte y el diff; no se ejecutó ningún gate ni `sui`/`suiup` (D-20261030-02).

### Veredicto en una línea
TASK-1 cumple el handoff: orden respetado (incluido H-1), línea base sin delta, `ci.yml` con exactamente 4 líneas, `Move.lock` con exactamente 2 `rev`, los dos literales bien adaptados, gates en 0 / 0 / 83, `node --test` 104 y `check` `1 despliegue(s)`. Sin STOPs. Solo hay NITs y una recomendación sobre Docker.

### Checklist (FLUJO §5 y puntos del handoff)

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Orden 1.0 → 1.6 y **H-1** | OK | Reporte 1.0 (`:23-402`) mide la línea base con `sui 1.83.0-16d2dc1e05ed` y árbol limpio **antes** de cualquier cambio, y la compara con §0 (`:389-402`): sin delta. 1.1 (V-7) `:405-418`: PV 142, época 1289, `MAX_PROTOCOL_VERSION` 142, rev del manifest `e6f43880`, digest `0f006fb4`, commit del tag `9dc25070cf2e`. 1.2 `:421-464`: constancia de que no se invocó `sui` entre `suiup install` y los tres `sha256sum` (`:423`); orden respetado: install, `suiup show`, guarda de `~/.sui`, hash del tgz del cache (`:444-445`), extracción `./sui` en directorio nuevo (`:446-448`), los tres hashes iguales `ac657ec1` (`:449-453`), y recién entonces `sui --version` (`:461-462`). Coincide con lo que el orquestador verificó por su cuenta (binario instalado = `SUI_BIN_SHA256`, tgz = digest del release). |
| 2 | `ci.yml` | OK | `git diff`: solo `ci.yml:22-25` (4 líneas `env`); comentarios de `:19-21` y todo lo demás intactos. `SUI_COMMIT` `9dc25070cf2e` = `sui --version` (`:462`) = 12 primeros hex del commit del tag (`:17`, `:416`): sin S-6. `SUI_TGZ_SHA256` = digest del release; `SUI_BIN_SHA256` = `ac657ec1…` (los tres iguales). Check de `ci.yml:94-98` simulado localmente: `0` (`:483`). actionlint con el comando de `app/README.md` (imagen fijada por digest): exit 0, 0 hallazgos, sin imagen nueva (`:484-486`). |
| 3 | `Move.lock` | OK | Diff real: solo los dos `rev` (`Move.lock:8`, `:14`) de `05ad86a3` a `e6f43880`; `[move] version = 4`, los tres `manifest_digest` (`C4FE4C91`, `7AFB6669`, `57457062`), `deps`, `use_environment` y secciones, iguales. Hecho por `printf 'n\n' \| sui move update-deps -e testnet` (`:494-496`), no a mano (R-11). Delta justificado (PROY-11, `:510`) y declarado el cache `~/.move` (+57532 KB, `:507-509`). `cmp` contra `Move.lock.despues` en 1.6 y al cierre (`:647-648`, `:784`): N-4 cumplido. Pre-vuelo de `framework-drift` local (`:511`): lock al día, sin "CLI atrasada". |
| 4 | Literales de tests (H-2) | OK | `deployment.test.mjs:38`: `LOCK_FRAMEWORK_REV` = `e6f43880…223`, comentario "piso de la PV 142 (repin de #75)", exactamente como pedía el handoff; el test `readFrameworkRev lee el rev…` (`deployment.test.mjs:324-328`) sigue comparando contra el lock real. `publish.test.mjs:562-563` (igual a CI: `sui 1.84.0-9dc25070cf2e` y `suiCliVersion` igual), `:567` (testnet "otra versión") y `:570-571` (localnet "otra versión" y `local.suiCliVersion`) pasan a `1.83.0-16d2dc1e05ed`. **Intención preservada**: el test verifica que una CLI distinta de la de `ci.yml` se rechaza en testnet (`/no es la de ci\.yml/`) y solo advierte en localnet (`assert.match(local.warning, …)`); `1.83.0-16d2dc1e05ed` es por construcción una CLI distinta, y es más significativa que el placeholder `aaaaaaaaaaaa`. Ningún test borrado ni debilitado; `:574` (yaml propio) intacto. `node --test` 104 PASS (51 + 53) en 1.0 y en 1.6; `check` = `1 despliegue(s) válidos y coherentes con Published.toml` (`:758-769`). |
| 5 | Gates de contracts | OK | 1.6: build exit 0, lint exit 0 (sin warnings ni lints), `Total tests: 83; passed: 83; failed: 0` (`:645`); las 83 líneas `[ PASS ]` están pegadas (`:562-644`; orden intercalado por ejecución en paralelo, no es un problema). `Published.toml` y `deployments/testnet.json` sin delta (`:649-650`, `:785`). `git status` solo con los 4 archivos (`:777-781`); `contracts/sources`, `contracts/tests`, `Move.toml` intactos. |
| 6 | Guardas | OK | `~/.sui/sui_config/`: antes (`:45-53`), tras 1.2 (`:440-442`, `:464`) y al cierre (`:786`) idéntico: 244 bytes, mtime del 2026-10-30, solo `client.yaml`, `sha256` igual. Sin S-7. `~/.move` 113216 → 170748 KB declarado. `suiup show` (`:435-438`): 1.83.0 y 1.84.0 instalados, 1.84.0 default; el binario 1.83.0 sigue con su hash de `88dd53b` (`:463`, M-5). |
| 9 | Plantilla del reporte | OK con NITs | Branch con SHA, archivos, resumen, gates con output pegado completo, verificación manual (V-7, `suiup show`, los 4 hashes + el de 1.83.0, diff completo del lock, actionlint, `du -s`), desviaciones, riesgos, STOPs "ninguno", seguridad R-6 clasificada, documentación. Desviaciones "ninguna de alcance" con observaciones aparte; coherente con el diff. |

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| N-1 | 🔵 NIT | PROY-19 | reporte `:647`, `:649` | Los comandos de 1.6 aparecen abreviados (`$ cmp lock`, `$ diff Published/testnet.json`, `$ node --test`, `$ check`), no con la línea completa del handoff (1.6). Los exit codes y la salida sí están. | Sin acción para TASK-1. En los reportes siguientes, pegar la línea de comando tal cual se corrió. |
| N-2 | 🔵 NIT | Handoff 1.2 ("solo estos comandos de `suiup`") | reporte `:25`, `:58` | El DEV corrió `suiup --version` además de `suiup show`/`default get`/`install`. Es solo lectura y no toca `~/.sui` (el MID hizo lo mismo en la v1). | Sin acción. |
| N-3 | 🔵 SUG | R-8 | reporte `:386`, `:788` | Ver respuesta 7 (Docker). | Ver abajo. |

No hay BLOCKER, MAJOR ni MINOR.

### Respuestas a los puntos 7 y 8

**7. Docker (R-8): `docker images -aq` pasó de 15 a 17.** No es una desviación de fondo: R-8 manda "línea base antes y después; las intermedias `<none>` nuevas se borran por ID; nunca prune". El DEV cumplió lo que R-8 dice literalmente: borró por ID las 12 intermedias `<none>` y no tocó ninguna imagen preexistente; declaró la diferencia con los nombres exactos. Las dos que quedan son imágenes base **nombradas y fijadas por el propio `Dockerfile` del proyecto** (`node:26.13.0-bookworm-slim`, `caddy:2.11.7-alpine`), no intermedias ni de otros proyectos.
- **Recomendación: dejarlas.** Son el caché legítimo de `deploy-image`: el job de TASK-3 las vuelve a usar (si se borran ahora, TASK-3 las vuelve a bajar, con coste de red y tiempo) y no estorban a nada. Borrar una imagen nombrada por ID también tiene riesgo si otro tag comparte el ID.
- **Qué reflejar:**
  - En el reporte de TASK-1: nada más que lo ya declarado (`:386`, `:788`) y la mención de que no son `<none>`.
  - **La línea base de Docker para TASK-3 pasa a 17 imágenes y 5 contenedores**; TASK-3 compara contra eso (más los `<none>` intermedios que vuelva a crear y borre por ID). El orquestador se lo indica al DEV en el mensaje de TASK-3.
  - En STATUS (TASK-4), en la fila de baselines del TASK-3, una línea: "Docker: +2 imágenes base nombradas del `Dockerfile` (`node:26.13.0-bookworm-slim`, `caddy:2.11.7-alpine`) bajadas por primera vez; 0 `<none>` residuales".
  - Si el owner prefiere el estado estricto de la línea base, se pueden borrar al cierre de TASK-3 con `docker rmi <id>`; no es necesario.
- Para futuros handoffs, conviene precisar R-8: "las intermedias `<none>` nuevas se borran por ID; las imágenes base nombradas del propio `Dockerfile` pueden quedar y se declaran".

**8. Observaciones del DEV (sin acción en TASK-1):**
- **Rótulo P1-P13 vs P1-P12.** El script imprime `OK (positivo): … (P1-P12)` (`:384`), mientras `app/README.md` lista 13 pasos, donde P13 es esa línea final `OK (positivo)`; STATUS (`:57`, `:62`) dice "P1-P13". No es un delta de comportamiento, es un rótulo de la línea final del script. **No se corrige en TASK-4 de #75:** las filas viejas de STATUS son registros históricos de corridas pasadas, y cambiar el texto del script sería código de `app/scripts/` fuera del alcance. **Recomendación:** en la fila de baselines de TASK-3 se escribe "P1-P12 y la línea `OK (positivo)` (= P13 de `app/README.md`)", sin issue aparte, salvo que el owner quiera un issue MINOR para alinear el texto del script.
- **"9 moderate" vs "11 moderate" de STATUS** (`reporte :294`, `:397`, `:808`; `STATUS.md:30`). Es una discrepancia a anotar, no un problema: `package-lock.json` no cambia en #75 y la auditoría de producción da 0, así que la diferencia es de la base de avisos de `npm` en el día. **Acción (TASK-3 y TASK-4):** TASK-3 pega el resumen de `npm audit` con todos los niveles (una vez); TASK-4 anota en la fila de baselines "9 moderate solo dev (STATUS:30 decía 11; `package-lock.json` sin cambios)". No se reescribe la fila de Toolchain de STATUS sin que TASK-3 lo mida de nuevo.
- **La máquina queda con la 1.84.0 como `sui` por defecto.** Ya figura en "Pendientes del usuario" del cuerpo del PR (rollback `suiup default set sui@testnet-1.83.0`); la 1.83.0 sigue instalada. Nada más.

### Siguiente paso
**TASK-1 aprobado.** Autorizado el commit y el paso a **TASK-2a** (G-A: fixtures de `scripts/` y los literales restantes de los tests de `scripts/`). Indicaciones para el orquestador al pasar el handoff al DEV:
1. Que el DEV parta del commit de TASK-1 (árbol limpio) y tome de nuevo la guarda de `~/.sui` y `du -s ~/.move`.
2. `SUI_COMMIT` real para los literales de 2a: `9dc25070cf2e` (`--sui-cli-version 1.84.0-9dc25070cf2e`); `FRAMEWORK_REV` y `frameworkRev` = el rev del lock nuevo (PV 142, `e6f43880`, completo en `Move.lock:8`).
3. Línea base de Docker para TASK-3: 17 imágenes y 5 contenedores (ver arriba).
4. En el reporte de 2a, pegar cada comando completo (N-1).

### Mensaje de commit propuesto (TASK-1; solo `Refs #75`; el orquestador agrega el trailer de atribución)

```
ci: bump the Sui CLI to 1.84.0 and repin Move.lock to the PV 142 framework (#75)

testnet runs protocol version 142 and CLI 1.83.0 stops at 140, so Move.lock
pinned the PV 140 framework, which has no sui::clock::borrow. ci.yml now
pins CLI 1.84.0 (commit 9dc25070cf2e) with the SHA-256 of the release tgz
(0f006fb4) and of the extracted binary (ac657ec1), verified against the tgz
before the binary was ever run. Move.lock is regenerated by the CLI
(sui move update-deps -e testnet): only the MoveStdlib and Sui revs change,
from 05ad86a3 (PV 140) to e6f43880 (PV 142, epoch 1289); version and the three
manifest digests are unchanged. The two script tests that read ci.yml and the
lock follow them (LOCK_FRAMEWORK_REV and the checkCliVersion cases).
Gates unchanged: 0 warnings, 0 lints, 83 tests, 104 script tests, check with
1 deployment; Published.toml and deployments/testnet.json untouched. Refs #75
```

### Snippet para STATUS.md
Se propone en TASK-4 con los valores de este reporte (el reporte de TASK-1 dice "no aplica"; así lo pide el handoff). Valores ya firmes para esa fila: CLI `1.84.0-9dc25070cf2e`; PV de testnet 142, época 1289, PV máxima de la CLI 142; lock `05ad86a3` → `e6f43880` con `manifest_digest` sin cambios; 0 warnings / 0 lints / 83 tests; `node --test` 104; `check` `1 despliegue(s)`; actionlint 0; `~/.move` +57532 KB; Docker 15 → 17 (dos imágenes base nombradas).

### §R-6 sobre esta revisión (`/usr/bin/grep`)
Se corrieron los cuatro patrones sobre este archivo: coincidencias de 40-64 hex, ninguna (los hashes se escriben solo en forma abreviada de 8 hex o completos únicamente donde ya son públicos y están en `Move.lock`/`ci.yml`); `0x`+8 hex, ninguna; claves, frases, `/home/`, `/Users/`, ninguna; hex abreviado con puntos, ninguna. Sin direcciones de cuenta ni rutas personales (placeholders `<repo>`).



---

## 3. Sonda del puerto (reporte del DEV)

> DEV, sonda de factibilidad de la localnet en otro puerto.

~~~~text
## Sonda de factibilidad: localnet aislada en otro puerto (autorizada por el owner; sin capturas, sin cambios al repo, sin tocar Docker)

Branch feature/issue-75-toolchain-1840 @ c47c77e (<repo> = Battleship-issue75). Archivos del repo modificados: ninguno.
CLI: sui 1.84.0-9dc25070cf2e. Node v26.13.0. Puerto elegido: 19000.

### 0. Preparacion
- `ss -ltnH | awk '{print $4}' | sed 's/.*://' | sort -n | uniq` (puertos en LISTEN antes de arrancar): 53 631 5037 5432 5433 5434 9000 33285 36473 37655 41333 43661 44543.
  El 9000 es el del contenedor ajeno (docker-proxy); 19000 libre (`ss -ltn | grep -c ':19000 '` = 0). Ninguno de los demas es 19000.
- <SMOKE_DIR> = <scratchpad>/smoke-probe-port con {net,tmp,home,move} y env.sh con rutas literales (igual que en agents.md §3).
- El flag existe: `. <SMOKE_DIR>/env.sh && printf 'n\n' | "$SUI" start --help | grep -n -A2 fullnode-rpc-port` ->
  `79:      --fullnode-rpc-port <FULLNODE_RPC_PORT>` / `80:          Port to start the Fullnode RPC server on. Default port is 9000`.
- Genesis (igual que antes): `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "genesis exit=$?"` -> genesis exit=0.

### 1. Arranque en otro puerto: SI
Comando (run_in_background del harness):
  `. <SMOKE_DIR>/env.sh && smoke_guard && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000 > "$SMOKE_DIR/sui-start.log" 2>&1`
- A los 8 s: `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` -> vivo; `ss -ltn | grep ':19000 '` -> `LISTEN 0 128 0.0.0.0:19000`;
  `grep -c "Address already in use" <SMOKE_DIR>/sui-start.log` -> 0. No hubo ningun otro conflicto de puertos (los puertos de validadores/consenso/metricas
  de la red salen de network.yaml y no chocaron con nada del host en esta corrida; nada de 9000).
- Lectura solo-gRPC por Node (script desechable en <scratchpad>/probe-node con node_modules enlazado al del repo; solo habla con 127.0.0.1:19000, no lee net/):
  `cd <scratchpad>/probe-node && <Node 26>/node probe.mjs http://127.0.0.1:19000` con `new SuiGrpcClient({ network: 'localnet', baseUrl }).ledgerService.getServiceInfo({})` ->
  `{"chainIdShort":"<8 primeros caracteres base58>","epoch":"0","checkpointHeight":"77","lowest":"0","server":"sui-node/unknown"}` (el chainId completo es de la genesis desechable; no se pega).
  Responde. (Dato: `getServiceInfo.chainId` llega en base58; el chain id corto en hex lo da la CLI, ver §4.)

### 2. Alias `localnet` apuntando al puerto nuevo: SI, sin ningun comando ni edicion; lo hace `sui start`
Resultados exactos, en este orden, todos con `. <SMOKE_DIR>/env.sh && smoke_guard &&` delante y `suic` = `printf 'n\n' | "$SUI" client`:
(a) `suic --json envs` (en caliente, ya con `sui start --fullnode-rpc-port 19000` corriendo; salida completa):
    [[{"alias":"localnet","rpc":"http://127.0.0.1:19000","ws":null,"basic_auth":null},{"alias":"devnet","rpc":"https://fullnode.devnet.sui.io:443","ws":null,"basic_auth":null}],"localnet"]
    exit=0  -> el alias `localnet` YA apunta a 127.0.0.1:19000 y es el env activo. No hizo falta ningun paso mio.
(b) `suic remove-env --help` -> `error: unrecognized subcommand 'remove-env'` (no existe en la 1.84; solo `remove-address`).
    `suic --json new-env --alias localnet --rpc http://127.0.0.1:19000` -> `Environment config with name [localnet] already exists.` exit=1
    (un new-env NO puede redefinir un alias existente; tampoco hace falta). `switch --env localnet` no se necesito (ya activo).
(c) No hubo que probar otro subcomando.
Por que ya apunta a 19000 (lectura del codigo, fuente publica `crates/sui/src/sui_commands.rs` @ testnet-v1.84.0, bajada con curl a <scratchpad>/sui_commands_184.rs):
  lineas 1292-1297: "Update the wallet_context with the configured fullnode rpc url so client operations will succeed if a non-default port was provided"
  -> `if config_dir.join(SUI_CLIENT_CONFIG).exists() { update_wallet_config_rpc(config_dir, fullnode_rpc_url) }`; y `update_wallet_config_rpc` (l. 1951-1970)
  busca el env con alias == "localnet" y le pone `env.rpc = fullnode_rpc_url`, luego `config.save()`. Aqui `config_dir` = el `--network.config` = <SMOKE_DIR>/net (aislado).
  La rama `force_regenesis && sui_config_dir()...` (l. 1299-1300, que si tocaria ~/.sui) NO se ejecuta: no se usa --force-regenesis.
  Implicacion de seguridad: la CLI SOLO reescribe el client.yaml de <SMOKE_DIR>/net; ~/.sui/ identico (guardas abajo).
  Nota: el client.yaml de la genesis apunta a :9000 hasta que arranca `sui start --fullnode-rpc-port`; antes de ese arranque cualquier `suic` iria al :9000 ajeno.
  (Orden obligatorio: genesis -> start con el flag -> recien despues el primer `suic`. En la corrida anterior, sin el flag, el 9000 ajeno respondio con error de protocolo.)

### 3. Que exige `publish.mjs publish --network localnet` (variante A), lectura de contracts/scripts/publish.mjs
- No hay puerto ni URL en publish.mjs. Solo invoca `sui client --json active-env`, `... chain-identifier`, `sui --version` y `test-publish --build-env testnet --pubfile-path <f>`
  (lista blanca `ALLOWED_SUI_VECTORS`, l. 101-109; `publishCliArgs`, l. 184-188) con `env: { ...process.env, SUI_CONFIG_DIR: configDir }` (l. 154).
  El RPC lo resuelve la CLI desde el client.yaml de SUI_CONFIG_DIR. `--client.config` y `--client.env` estan prohibidos (l. 101): no se puede forzar un RPC por flag.
- Condiciones (`commandPublish`, l. 646-680; `checkNetworkGuard`, l. 307-314; `chainIdFromCli`, l. 320-322; `chainIdError` en deployment.mjs:205-212):
  1. SUI_CONFIG_DIR definido, absoluto, existente, con client.yaml y fuera de ~/.sui (`checkConfigDirGuard`): ya lo cumple <SMOKE_DIR>/net.
  2. `active-env` == exactamente `localnet`  (l. 308).  -> cumplido (§2a).
  3. `chain-identifier` devuelve `{ base58, hex }` con hex de 8 hex minusculas y distinto del de testnet y mainnet (l. 205-210). -> cumplido (§4).
  4. `--pubfile-path` nuevo por genesis (l. 209-210), Node = .nvmrc, y CLI = ci.yml (aviso si no; ya 1.84.0).
  Es decir: con otro puerto, la variante A funciona sin cambios al script siempre que el client.yaml aislado tenga el alias `localnet` apuntando al RPC real
  (lo garantiza `sui start --fullnode-rpc-port N --network.config <SMOKE_DIR>/net`). La publicacion en si NO se probo (instruccion de la sonda).

### 4. `chain-identifier` por CLI contra la localnet nueva: OK
`. <SMOKE_DIR>/env.sh && smoke_guard && echo "smoke_guard ok (active-env = localnet)" && suic --json chain-identifier; echo "exit=$?"` ->
  smoke_guard ok (active-env = localnet)
  { "base58": "<base58 de la genesis desechable>", "hex": "<8 hex>" }   exit=0
`suic --json active-env` -> "localnet". `suic --json envs` ahora incluye `chain_id` en el env `localnet` (cache que escribe la CLI, C12) y el rpc :19000.
Se hizo solo eso (ninguna publicacion, ningun `addresses`, ningun `new-address`).

### 5. Cierre
- `kill "$(cat <SMOKE_DIR>/sui.pid)"` -> exit 0. Codigo de salida de `sui start` al kill (lo marca el harness): **144** (igual que la 1.83).
- `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` -> "No such process", exit 1. `ss -ltn | grep -c ':19000 '` = 0. Procesos `sui start|genesis`: 0.
- `rm -rf <SMOKE_DIR>` (y <scratchpad>/probe-node) hecho; `test ! -e <SMOKE_DIR>` OK.
- `git status --porcelain --untracked-files=all` -> 0 entradas; `git diff --exit-code -- contracts/Move.lock contracts/Published.toml` exit 0;
  `test ! -e contracts/deployments/localnet.json` OK; `! compgen -G 'contracts/Pub.*.toml'` OK.
- `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` -> 2026-10-30 17:52:52.515735237 -0500 244 (igual); `ls -la` -> solo client.yaml; sha256 igual al de la linea base.
- `du -s <HOME real>/.move` -> 170748 (antes y despues). Docker: `docker ps -aq` 5 / `docker images -aq` 17 (antes y despues); `docker ps` corriendo: 4, sin cambios.

### (c) Lo que habria que cambiar en el repo para usar otro puerto (NO se toco nada; para decidir)
Opcion minima recomendada: que la URL de localnet sea configurable por variable de entorno con default 9000 (asi nada cambia para quien tiene el 9000 libre),
o, mas simple, cambiar la constante a 19000 si el owner prefiere puerto fijo. Archivos:
 1. app/scripts/localnet-guard.mjs:10  `export const LOCALNET_URL = 'http://127.0.0.1:9000';`  <- unico valor real para los tres capture-*.mjs.
    La guarda (l. 21-35, `assertLocalnetUrl`) acepta SOLO esa URL exacta (l. 25), con o sin `--url`; hoy `--url http://127.0.0.1:19000` sale con codigo 2. Hay que
    cambiar la constante (o aceptar una lista cerrada de URLs 127.0.0.1 con puerto distinto) y mantener el rechazo de cualquier host no-127.0.0.1.
 2. Textos que citan el 9000 (comentarios/ayuda): app/scripts/capture-read-fixtures.mjs:4, :6; app/scripts/capture-tx-fixtures.mjs:7, :9; app/scripts/capture-house-fixtures.mjs:6, :16.
    Los tres usan `assertLocalnetUrl(process.argv.slice(2), ...)` (capture-read:14, capture-tx:18, capture-house:26) y no tienen otro 9000 hardcodeado.
    El handoff 2b prohibe tocar localnet-guard.mjs y capture-read-fixtures.mjs: haria falta ampliar el "NO tocar" de 2b.
 3. app/src/sui/networks.ts:11  `localnet: { grpcUrl: 'http://127.0.0.1:9000', explorerBase: null }` (smokes de navegador y `npm run dev -w app` con VITE_SUI_NETWORK=localnet).
    Si el valor pasa a ser configurable, p. ej. `import.meta.env.VITE_LOCALNET_URL ?? 'http://127.0.0.1:9000'` (solo para localnet; el build de testnet no lo usa).
    Su test: app/src/sui/networks.test.ts:6 (`toEqual({ grpcUrl: 'http://127.0.0.1:9000', ... })`), y otros tests de app mencionan el 9000 como literal de
    fixtures de config (p. ej. config.test.ts, dappKit.test.ts, AppProviders.test.tsx, App.test.tsx, NetworkBadge.test.tsx, hooks *.test.tsx; grep -l '9000' app/src): solo
    se rompen si cambia el default; con default 9000 + override por env, ninguno cambia.
    La CSP de Caddy (app/Caddyfile:12) no incluye localnet (build de testnet): no se toca.
 4. Docs (PROY-20): app/README.md:328 y :840 ("solo acepta http://127.0.0.1:9000"), contracts/README.md:466 (idem), y agents.md §3 paso 4 (arranque con
    `--fullnode-rpc-port` y la nota de que `sui start` reescribe el alias `localnet` del client.yaml aislado) y la receta de arranque; agents.md:176 es una medicion
    historica del 1.83 (no se reescribe).
 5. Sin cambios necesarios en: contracts/scripts/publish.mjs / deployment.mjs (no tienen puerto; S-8 no aplica), Move.*, ci.yml, check-deploy-image.sh (usa su propio puerto 8090).
 Alternativa SIN tocar el repo (solo para 2a, que no usa puertos fijos: publish.mjs, `suic` y la sonda gRPC por Node): arrancar con `--fullnode-rpc-port 19000` y listo.
 Para 2b y los smokes de navegador SI hay que cambiar el repo (1-3) o liberar el 9000 (opcion A del reporte anterior).

### Desviaciones
Ninguna respecto de lo autorizado: se agrego `--fullnode-rpc-port 19000` al arranque (autorizado). Ningun archivo del repo se modifico.

### STOPs
Ninguno (ningun bloqueo).

### Seguridad (R-6)
Reporte sin direcciones, claves ni rutas personales. Diff del repo vacio. Los 4 greps /usr/bin/grep -nE sobre este reporte dan vacio.

~~~~


---

## 4. TASK-2a (reporte del DEV)

> DEV, TASK-2a: fixtures de scripts/ en el puerto 19000 (con la sustitución declarada en el prefacio).

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 - TASK-2a (fixtures de `scripts/` y sus tests)

### Branch (con SHA corto del HEAD)
feature/issue-75-toolchain-1840 @ c47c77e (worktree <repo> = Battleship-issue75). Cambios en el arbol de trabajo, sin `git add` ni commit.

### Archivos modificados
contracts/scripts/fixtures/localnet-publish.json, localnet-publish-dry-run.json, Published.localnet.toml, localnet.deployment.json;
contracts/scripts/deployment.test.mjs y contracts/scripts/publish.test.mjs (solo literales y comentarios).
`git diff --stat` y `git status` al final del reporte.

### Que se implemento
1. Las 4 fixtures de `scripts/` recapturadas con la CLI 1.84.0-9dc25070cf2e en una localnet aislada (G-A), copiadas sin editar (`cmp`, `jq empty`); `localnet.deployment.json` lo genero `publish.mjs record`.
2. Literales/comentarios de los dos tests actualizados con los valores sacados por `jq` de las fixtures nuevas; `node --test` = 104 PASS, `check` = 1 despliegue(s).
3. Variante A de `publish.mjs` de punta a punta con la 1.84 (exit 0, sin aviso de CLI, `suiCliVersion`/`frameworkRev` esperados, `Move.lock` sin delta).

### Desviacion autorizada por el owner: puerto 19000
- Motivo: el 9000/tcp del host lo ocupa un contenedor de otro proyecto del host (docker-proxy; no se toca). Primer intento (sin flag): `sui start` murio con codigo 1,
  `container.rs:102:77 ... Address already in use (os error 98)`; un `suic chain-identifier` posterior le hablo por gRPC al servicio ajeno (error h2 `FRAME_SIZE_ERROR`, lectura sin escritura). Se cerro todo y se reporto (version anterior de este .txt).
- Sonda de factibilidad autorizada: <scratchpad>/REPORTE_TOOLCHAIN_142_SONDA_PUERTO.txt (conclusiones: `--fullnode-rpc-port` existe; `sui start --network.config <dir>` reescribe el alias `localnet` del client.yaml de <dir>
  con el RPC nuevo, `sui_commands.rs:1292-1297` y `update_wallet_config_rpc` `:1951-1970` @ testnet-v1.84.0; `remove-env` no existe; `new-env` no redefine un alias existente).
- Aplicacion en esta corrida (agents.md §3, paso 4): arranque con `exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000`; orden genesis -> start con flag -> recien despues cualquier `suic`/`publish.mjs`;
  `ss -ltn` antes de arrancar: 19000 libre (`19000 en LISTEN: 0`). `smoke_guard` del env.sh de esta corrida agrega la comprobacion de que el RPC del env activo es exactamente `http://127.0.0.1:19000` (via `suic --json envs` + `jq`, sin tocar la red);
  si apuntara al 9000 = GUARD-FAIL. Como ese guard falla por diseno hasta que `start` reescribe el alias, el comando de arranque usa `smoke_guard_pre` (solo `active-env` = localnet, lectura local del client.yaml aislado).
  Nunca hubo GUARD-FAIL en esta corrida ni ningun `suic` antes de que `start` corriera.
- Contenido del env.sh (rutas literales, aqui con placeholders):
    SMOKE_DIR=<scratchpad>/smoke-2a-GA ; SUI=<HOME real>/.local/bin/sui ; NODE=<HOME real>/.nvm/versions/node/v26.13.0/bin/node
    export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
    smoke_guard_pre() { [ -f "$SUI_CONFIG_DIR/client.yaml" ] && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] || { echo GUARD-FAIL; return 97; }; }
    smoke_guard()     { smoke_guard_pre || return 97; [ "$(printf 'n\n' | "$SUI" client --json envs | jq -r '.[1] as $a | .[0][] | select(.alias==$a) | .rpc')" = http://127.0.0.1:19000 ] || { echo GUARD-FAIL; return 97; }; }
    suic() { printf 'n\n' | "$SUI" client "$@"; }   ;   act_as() { suic switch --address "$1" > /dev/null; }
- Impacto en el repo: ninguno (publish.mjs no tiene puerto: usa el alias `localnet` del client.yaml aislado). Para TASK-2b hay que decidir aparte el cambio de `localnet-guard.mjs:10` etc. (ver sonda).

### Otras desviaciones (detalle)
1. Copia del paquete para `Published.localnet.toml`: se copio SOLO `Move.toml`, `Move.lock` y `sources/` (sin `Published.toml`, `deployments/`, `build/`, `tests/`, `scripts/`). Motivo: el repo ya tiene `Published.toml` con `[published.testnet]` desde #8; en la copia se habria mezclado con la entrada localnet y el fixture
   dejaria de ser el de #7 (una sola tabla `[published.localnet]`). A la copia se le agrego (como pide el handoff) `[environments]` / `localnet = "cb1e492c"` en su `Move.toml`.
2. `deployment.test.mjs:180` (`publishTimestamp: '2026-11-02T14:52:59.013Z'` -> `'2026-11-20T04:13:58.204Z'`): literal derivado del fixture que el handoff no listaba; sin el, `fixtures/localnet.deployment.json = buildDeployment` fallaba (rojo 1 test). Valor por `jq`/`Date` (ver §2.2).
   Las lineas :217-218 (`publishTimestamp` mutados para probar "sin milisegundos"/"sin Z") se dejaron: siguen siendo validos como negativos de formato.
3. `deployment.test.mjs` `SOURCE_COMMIT` (`eb8489d...`) NO se cambio: ya difiere del `sourceCommit` del fixture viejo (`ef1a720...`); es un literal propio de ese test, no derivado de la fixture (compara contra si mismo). `publish.test.mjs` `FIXTURE_META.sourceCommit` SI cambio a `88dd53b21bc8ac4b38cf6232346edfbc2e459f28` (= `git rev-parse 88dd53b`, el valor con que se hizo `record`; ese test lo compara con la fixture).
4. `test-publish --help` se corrio con el env.sh cargado (ayuda local, sin red) para confirmar los flags; sin cambios de flags en la 1.84 (los de `publishCliArgs` funcionan tal cual).
Ninguna desviacion del DoD.

### Tests y gates
- Modificados: deployment.test.mjs: comentario :1 (CLI 1.84.0), LOCALNET_CHAIN_ID, PKG, HOUSE, HOUSE_CAP, UPGRADE_CAP, DIGEST, TIMESTAMP_MS, SUI_CLI_VERSION, FRAMEWORK_REV (+comentario: "piso de la PV 142 (recapturada en #75)"), :149-152 (IDs del dry run), :180 (timestamp), :246-247 y :250 (TOML), :249 (`toolchainVersion: '1.84.0'`), :286 (chain id en la linea del TOML).
  publish.test.mjs: :51 y :498 (chain id), FIXTURE_META (sourceCommit, suiCliVersion, frameworkRev), :696-699 (IDs del TOML). `deployment.test.mjs:38` y `publish.test.mjs:562-574` (TASK-1) no se tocaron. `:147` (`gasEstimate`) NO cambia (ver gas).
- Ningun test borrado ni debilitado; solo literales y comentarios.
- Contracts (sui move build/lint/test): no se corrieron en esta tarea (no aplica; no cambia nada de contracts/sources|tests; los gates de TASK-1 valen).

### Verificacion manual (localnet aislada G-A, 1.84.0)
Convenciones: `. <SMOKE_DIR>/env.sh && ...` en cada llamada; `<SMOKE_DIR>` = <scratchpad>/smoke-2a-GA; "G" = `{ . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`. `ids.env` (solo `export ADMIN=...`) nunca se imprimio.

#### 0. Linea de partida (antes de tocar nada; salida real)
  `git rev-parse --short HEAD` = c47c77e ; `git status --porcelain --untracked-files=all | wc -l` = 0
  `printf 'n\n' | sui --version` = sui 1.84.0-9dc25070cf2e ; `sha256sum "$(command -v sui)"` = el de ci.yml:25 (SUI_BIN_SHA256)
  `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` -> 2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
  `ls -la <HOME real>/.sui/sui_config/` -> total 12 ; drwx------ . ; drwx------ .. ; -rw-rw-r-- 1 244 Oct 30 17:52 client.yaml
  `sha256sum <HOME real>/.sui/sui_config/client.yaml` -> (hash registrado; igual antes/despues)
  `du -s <HOME real>/.move` -> 170748 ; `docker ps -aq | wc -l` -> 5 ; `docker images -aq | wc -l` -> 17
  `ss -ltnH | awk '{print $4}' | sed 's/.*://' | sort -n | uniq | tr '\n' ' '` -> 53 631 5037 5432 5433 5434 9000 17144 33123 33285 34343 36473 37655 41333 43661 ; `ss -ltn | grep -c ':19000 '` -> 0
  Copias de las 4 fixtures viejas para el cotejo: `git show HEAD:contracts/scripts/fixtures/<f> > <scratchpad>/t2a/old/<f>`.

#### 2.1 Genesis, arranque y comprobaciones
  Genesis: `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "genesis exit=$?"` -> genesis exit=0
  Arranque (run_in_background): `. <SMOKE_DIR>/env.sh && smoke_guard_pre && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000 > "$SMOKE_DIR/sui-start.log" 2>&1`
  Espera + comprobacion: `for i in $(seq 1 40); do if ss -ltn | grep -q ':19000 ' && (. <SMOKE_DIR>/env.sh && smoke_guard >/dev/null 2>&1); then echo "ready after $i"; break; fi; sleep 2; done; . <SMOKE_DIR>/env.sh && smoke_guard && echo "smoke_guard OK" && suic --json envs | tr -d '\n ' ; echo; suic --json chain-identifier; kill -0 "$(cat <SMOKE_DIR>/sui.pid)" && echo alive`
    ready after 1
    smoke_guard OK
    [[{"alias":"localnet","rpc":"http://127.0.0.1:19000","ws":null,"basic_auth":null},{"alias":"devnet","rpc":"https://fullnode.devnet.sui.io:443","ws":null,"basic_auth":null}],"localnet"]
    { "base58": "<base58 de la genesis desechable>", "hex": "cb1e492c" }
    alive
  **Chain id corto de G-A: `cb1e492c`.**
  Cuentas: `. <SMOKE_DIR>/env.sh && smoke_guard && suic --json addresses > "$SMOKE_DIR/addresses.json"` (exit 0; solo se inspecciono con `jq -c 'del(..|strings|select(startswith("0x")))'` -> 5 alias de la genesis; ADMIN = `.addresses[0][1]` escrito a ids.env sin imprimirlo).
  Dry run: `. <SMOKE_DIR>/env.sh && G act_as "$ADMIN" && cd <repo>/contracts && suic --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.dry.toml" --dry-run > "$SMOKE_DIR/localnet-publish-dry-run.json" 2> "$SMOKE_DIR/dry.stderr"; echo "dry exit=$?"; git diff --exit-code -- Move.lock; echo "lock diff exit=$?"`
    dry exit=0 ; lock diff exit=0 ; archivo de 7004 bytes ; stderr: INCLUDING DEPENDENCY MoveStdlib / INCLUDING DEPENDENCY Sui / BUILDING battleship
  Publish: `. <SMOKE_DIR>/env.sh && G act_as "$ADMIN" && cd <repo>/contracts && suic --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" > "$SMOKE_DIR/localnet-publish.json" 2> "$SMOKE_DIR/pub.stderr"; echo "publish exit=$?"; git diff --exit-code -- Move.lock; echo "lock diff exit=$?"; ... jq empty <SMOKE_DIR>/localnet-publish.json <SMOKE_DIR>/localnet-publish-dry-run.json && echo "jq empty ok"`
    publish exit=0 ; lock diff exit=0 ; archivo de 10912 bytes ; mismo stderr de 3 lineas ; jq empty ok
  Copia para Published.localnet.toml: `. <SMOKE_DIR>/env.sh && smoke_guard && R=<repo>/contracts && mkdir -p "$SMOKE_DIR/pkgcopy" && cp -r $R/sources $R/Move.toml $R/Move.lock "$SMOKE_DIR/pkgcopy/" && printf '\n[environments]\nlocalnet = "cb1e492c"\n' >> "$SMOKE_DIR/pkgcopy/Move.toml"`
    ls -A pkgcopy -> Move.lock Move.toml sources ; cola de Move.toml: "[environments]" / localnet = "cb1e492c" ; `diff` contra el Move.toml del repo: solo esas 3 lineas agregadas.
  `publish` de la copia (run_in_background, MOVE_HOME aislado): `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && act_as "$ADMIN" && export MOVE_HOME="$SMOKE_DIR/move" && cd "$SMOKE_DIR/pkgcopy" && suic --json publish > "$SMOKE_DIR/copy-publish.json" 2> "$SMOKE_DIR/copy-publish.stderr"; echo "copy publish exit=$?"`
    copy publish exit=0 ; stderr: Downloading from https://github.com/MystenLabs/sui.git / INCLUDING DEPENDENCY MoveStdlib / INCLUDING DEPENDENCY Sui / BUILDING battleship ; `jq -r '.effects.status.status'` = success
    `du -s <SMOKE_DIR>/move` = 57396 (cache aislada; el lock de la copia bajo el framework de la PV 142) ; `du -s <HOME real>/.move` = 170748 (sin cambio).
    Published.toml escrito por la CLI en la copia (IDs enmascarados 0x<id>):
      # Generated by Move / # This file contains metadata about published versions of this package in different environments / # This file SHOULD be committed to source control
      [published.localnet] / chain-id = "cb1e492c" / published-at = "0x<id>" / original-id = "0x<id>" / version = 1 / toolchain-version = "1.84.0" / build-config = { flavor = "sui", edition = "2024" } / upgrade-capability = "0x<id>"
  Copia a las fixtures y verificacion (sin editar):
    `cp <SMOKE_DIR>/localnet-publish.json <repo>/contracts/scripts/fixtures/localnet-publish.json && cp <SMOKE_DIR>/localnet-publish-dry-run.json <repo>/contracts/scripts/fixtures/localnet-publish-dry-run.json && cp <SMOKE_DIR>/pkgcopy/Published.toml <repo>/contracts/scripts/fixtures/Published.localnet.toml`
    `cmp <SMOKE_DIR>/localnet-publish.json <F>/localnet-publish.json; echo "cmp1=$?"` -> cmp1=0 ; `cmp ...-dry-run.json ...; echo "cmp2=$?"` -> cmp2=0 ; `cmp <SMOKE_DIR>/pkgcopy/Published.toml <F>/Published.localnet.toml; echo "cmp3=$?"` -> cmp3=0
    `jq empty <F>/localnet-publish.json; echo "jq1=$?"` -> jq1=0 ; `jq empty <F>/localnet-publish-dry-run.json; echo "jq2=$?"` -> jq2=0
  `record` (localnet.deployment.json), desde <repo>/contracts con Node 26 (`export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version` -> v26.13.0):
    `node scripts/publish.mjs record --network localnet --from scripts/fixtures/localnet-publish.json --chain-id cb1e492c --source-commit "$(git rev-parse 88dd53b)" --sui-cli-version 1.84.0-9dc25070cf2e --framework-rev e6f43880f4b65e2c1f0397583a9690b4b22c9223 --out scripts/fixtures/localnet.deployment.json; echo "exit=$?"`
    Despliegue escrito en <repo>/contracts/scripts/fixtures/localnet.deployment.json:
      schemaVersion: 1 / network: localnet / chainId: cb1e492c
      packageId: 0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d (= originalPackageId) / packageVersion: 1
      upgradeCapId: 0x1ae71697a07810fb1d42b77e008bb7225bef3ffb1b65a93aca17faca3739748a
      houseId: 0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035
      houseCapId: 0x95794194fad84a5f3fee87a06d88b79a3044b0f9b3bc38db3444b3e142135e7c
      publishTxDigest: BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH / publishTimestamp: 2026-11-20T04:13:58.204Z
      sourceCommit: 88dd53b21bc8ac4b38cf6232346edfbc2e459f28 / suiCliVersion: 1.84.0-9dc25070cf2e / frameworkRev: e6f43880f4b65e2c1f0397583a9690b4b22c9223
    (luego el script imprime los dos comandos "Siguiente paso"/"Verificacion" con los mismos IDs publicos y <bps>; no se ejecutan)
    exit=0 ; `jq empty <repo>/contracts/scripts/fixtures/localnet.deployment.json; echo "jq=$?"` -> jq=0 ; el json es el de arriba (14 campos, orden de DEPLOYMENT_FIELDS).

#### Variante A del script (agents.md:164), con el prefijo del paso 3
  `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.scriptA.toml" --out "$SMOKE_DIR/localnet.json" > "$SMOKE_DIR/scriptA.out" 2> "$SMOKE_DIR/scriptA.err"; echo "variante A exit=$?"; git diff --exit-code -- Move.lock; echo "lock=$?"`
    variante A exit=0 ; lock=0 ; stderr: 0 bytes (`wc -c <SMOKE_DIR>/scriptA.err` = 0) => SIN aviso de CLI distinta de ci.yml.
    `jq -r '[.suiCliVersion,.frameworkRev,.chainId,.network]|@tsv' <SMOKE_DIR>/localnet.json` -> 1.84.0-9dc25070cf2e	e6f43880f4b65e2c1f0397583a9690b4b22c9223	cb1e492c	localnet
    stdout (sin direcciones de cuenta: revisado; los 0x<64hex> son IDs de objetos/paquete de la genesis):
      Despliegue escrito en <SMOKE_DIR>/localnet.json:
        schemaVersion: 1 / network: localnet / chainId: cb1e492c
        packageId = originalPackageId: 0x208859dfcdbd1b5b44dea178660d31e2439e281a46e4e30fe031781e3630e4da / packageVersion: 1
        upgradeCapId: 0x5f803529cd46ab7af416e92ef143d2c361f44fee743e00f1152d4aa8d10cbdb6
        houseId: 0xf3e6c7927197944945c9aaf047dd918a082eac0ed5649819080db4bd54ec8f18
        houseCapId: 0x3b1b8b679632ee89cd04f682a3508d13a4ce13c7c4354028d87225b1e888e587
        publishTxDigest: 4CUmKJf9Bm8Z7rJYewT2c8EwrLYRE8AYJatVJidYaxLp / publishTimestamp: 2026-11-20T04:15:29.933Z
        sourceCommit: null / suiCliVersion: 1.84.0-9dc25070cf2e / frameworkRev: e6f43880f4b65e2c1f0397583a9690b4b22c9223
      Directorio temporal con la salida cruda: <SMOKE_DIR>/tmp/battleship-publish-l2SP3Z (bórralo cuando termines)
      Siguiente paso obligatorio (#8), no lo ejecuta este script. ... printf 'n\n' | SUI_CONFIG_DIR=... sui client call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> <bps>
      Verificación: ... sui client object <houseId> --json   # campo content.fee_rate
  `node scripts/publish.mjs check; echo "check exit=$?"` (con las fixtures nuevas, antes de adaptar tests) -> 1 despliegue(s) válidos y coherentes con Published.toml ; check exit=0

#### 2.0 Comparacion de forma (viejo = `git show HEAD:<ruta>` guardado en <scratchpad>/t2a/old/, nuevo = el archivo copiado)
  Funciones (tal cual el handoff):
    shape()  { jq -r 'paths as $p | ($p | map(if type=="number" then "*" else . end | tostring) | join(".")) + " : " + (getpath($p) | type)' "$1" | sort -u; }
    arrays() { jq -r '. as $d | [paths(arrays)] | map(. as $p | ($p | map(tostring) | join(".")) + " : " + ($d | getpath($p) | length | tostring)) | .[]' "$1"; }
  Comando por archivo: `shape <old> > a; shape <new> > b; diff a b; arrays <old> > c; arrays <new> > d; diff c d`
  --- localnet-publish.json
    shape: 103 rutas-tipo (viejo) / 103 (nuevo) ; diff -> vacio, exit 0: FORMA IGUAL
    arrays: 14 viejo / 14 nuevo ; diff:
      13c13
      < objectChanges.1.modules : 2
      ---
      > objectChanges.5.modules : 2
      (diff exit=1: unica diferencia = el INDICE del cambio 'published' dentro de objectChanges, que depende del orden de los IDs de la genesis; las 14 longitudes son iguales)
  --- localnet-publish-dry-run.json
    shape: 90 rutas-tipo (viejo) / 90 (nuevo) ; diff -> vacio, exit 0: FORMA IGUAL
    arrays: 13 viejo / 13 nuevo ; diff:
      6c6
      < objectChanges.2.modules : 2
      ---
      > objectChanges.4.modules : 2
      (diff exit=1: igual, solo cambia el indice del cambio 'published'; las 13 longitudes son iguales)
  --- localnet.deployment.json
    shape: 14 rutas-tipo (viejo) / 14 (nuevo) ; diff -> vacio, exit 0: FORMA IGUAL
    arrays: 0 viejo / 0 nuevo ; diff vacio (no tiene arrays)

  Longitudes de arrays (nuevo), localnet-publish.json:
    transaction.data.transaction.inputs : 1
    transaction.data.transaction.transactions : 2
    transaction.data.transaction.transactions.0.Publish : 2
    transaction.data.transaction.transactions.1.TransferObjects : 2
    transaction.data.transaction.transactions.1.TransferObjects.0 : 1
    transaction.data.gasData.payment : 5
    transaction.txSignatures : 1
    effects.modifiedAtVersions : 5
    effects.created : 5
    effects.mutated : 1
    effects.deleted : 4
    objectChanges : 10
    objectChanges.5.modules : 2
    balanceChanges : 1
  Longitudes de arrays (nuevo), localnet-publish-dry-run.json:
    effects.modifiedAtVersions : 1
    effects.created : 5
    effects.mutated : 1
    events : 0
    objectChanges : 6
    objectChanges.4.modules : 2
    balanceChanges : 1
    input.transaction.inputs : 1
    input.transaction.transactions : 2
    input.transaction.transactions.0.Publish : 2
    input.transaction.transactions.1.TransferObjects : 2
    input.transaction.transactions.1.TransferObjects.0 : 1
    input.gasData.payment : 0
  Salida completa de shape (nuevo = viejo) localnet-publish.json:
    balanceChanges.*.amount : string
    balanceChanges : array
    balanceChanges.*.coinType : string
    balanceChanges.* : object
    balanceChanges.*.owner.AddressOwner : string
    balanceChanges.*.owner : object
    checkpoint : string
    digest : string
    effects.created : array
    effects.created.* : object
    effects.created.*.owner.AddressOwner : string
    effects.created.*.owner : object
    effects.created.*.owner.Shared.initial_shared_version : number
    effects.created.*.owner.Shared : object
    effects.created.*.owner : string
    effects.created.*.reference.digest : string
    effects.created.*.reference : object
    effects.created.*.reference.objectId : string
    effects.created.*.reference.version : number
    effects.deleted : array
    effects.deleted.*.digest : string
    effects.deleted.* : object
    effects.deleted.*.objectId : string
    effects.deleted.*.version : number
    effects.executedEpoch : string
    effects.gasObject : object
    effects.gasObject.owner.AddressOwner : string
    effects.gasObject.owner : object
    effects.gasObject.reference.digest : string
    effects.gasObject.reference : object
    effects.gasObject.reference.objectId : string
    effects.gasObject.reference.version : number
    effects.gasUsed.computationCost : string
    effects.gasUsed.nonRefundableStorageFee : string
    effects.gasUsed : object
    effects.gasUsed.storageCost : string
    effects.gasUsed.storageRebate : string
    effects.messageVersion : string
    effects.modifiedAtVersions : array
    effects.modifiedAtVersions.* : object
    effects.modifiedAtVersions.*.objectId : string
    effects.modifiedAtVersions.*.sequenceNumber : string
    effects.mutated : array
    effects.mutated.* : object
    effects.mutated.*.owner.AddressOwner : string
    effects.mutated.*.owner : object
    effects.mutated.*.reference.digest : string
    effects.mutated.*.reference : object
    effects.mutated.*.reference.objectId : string
    effects.mutated.*.reference.version : number
    effects : object
    effects.status : object
    effects.status.status : string
    effects.transactionDigest : string
    objectChanges : array
    objectChanges.*.digest : string
    objectChanges.*.modules : array
    objectChanges.*.modules.* : string
    objectChanges.* : object
    objectChanges.*.objectId : string
    objectChanges.*.objectType : string
    objectChanges.*.owner.AddressOwner : string
    objectChanges.*.owner : object
    objectChanges.*.owner.Shared.initial_shared_version : number
    objectChanges.*.owner.Shared : object
    objectChanges.*.packageId : string
    objectChanges.*.previousVersion : string
    objectChanges.*.sender : string
    objectChanges.*.type : string
    objectChanges.*.version : string
    timestampMs : string
    transaction.data.gasData.budget : string
    transaction.data.gasData : object
    transaction.data.gasData.owner : string
    transaction.data.gasData.payment : array
    transaction.data.gasData.payment.*.digest : string
    transaction.data.gasData.payment.* : object
    transaction.data.gasData.payment.*.objectId : string
    transaction.data.gasData.payment.*.version : number
    transaction.data.gasData.price : string
    transaction.data.messageVersion : string
    transaction.data : object
    transaction.data.sender : string
    transaction.data.transaction.inputs : array
    transaction.data.transaction.inputs.* : object
    transaction.data.transaction.inputs.*.type : string
    transaction.data.transaction.inputs.*.value : string
    transaction.data.transaction.inputs.*.valueType : string
    transaction.data.transaction.kind : string
    transaction.data.transaction : object
    transaction.data.transaction.transactions : array
    transaction.data.transaction.transactions.* : object
    transaction.data.transaction.transactions.*.Publish : array
    transaction.data.transaction.transactions.*.Publish.* : string
    transaction.data.transaction.transactions.*.TransferObjects : array
    transaction.data.transaction.transactions.*.TransferObjects.* : array
    transaction.data.transaction.transactions.*.TransferObjects.*.Input : number
    transaction.data.transaction.transactions.*.TransferObjects.* : object
    transaction.data.transaction.transactions.*.TransferObjects.*.* : object
    transaction.data.transaction.transactions.*.TransferObjects.*.*.Result : number
    transaction : object
    transaction.txSignatures : array
    transaction.txSignatures.* : string
  Salida completa de shape (nuevo = viejo) localnet-publish-dry-run.json:
    balanceChanges.*.amount : string
    balanceChanges : array
    balanceChanges.*.coinType : string
    balanceChanges.* : object
    balanceChanges.*.owner.AddressOwner : string
    balanceChanges.*.owner : object
    effects.created : array
    effects.created.* : object
    effects.created.*.owner.AddressOwner : string
    effects.created.*.owner : object
    effects.created.*.owner.Shared.initial_shared_version : number
    effects.created.*.owner.Shared : object
    effects.created.*.owner : string
    effects.created.*.reference.digest : string
    effects.created.*.reference : object
    effects.created.*.reference.objectId : string
    effects.created.*.reference.version : number
    effects.executedEpoch : string
    effects.gasObject : object
    effects.gasObject.owner.AddressOwner : string
    effects.gasObject.owner : object
    effects.gasObject.reference.digest : string
    effects.gasObject.reference : object
    effects.gasObject.reference.objectId : string
    effects.gasObject.reference.version : number
    effects.gasUsed.computationCost : string
    effects.gasUsed.nonRefundableStorageFee : string
    effects.gasUsed : object
    effects.gasUsed.storageCost : string
    effects.gasUsed.storageRebate : string
    effects.messageVersion : string
    effects.modifiedAtVersions : array
    effects.modifiedAtVersions.* : object
    effects.modifiedAtVersions.*.objectId : string
    effects.modifiedAtVersions.*.sequenceNumber : string
    effects.mutated : array
    effects.mutated.* : object
    effects.mutated.*.owner.AddressOwner : string
    effects.mutated.*.owner : object
    effects.mutated.*.reference.digest : string
    effects.mutated.*.reference : object
    effects.mutated.*.reference.objectId : string
    effects.mutated.*.reference.version : number
    effects : object
    effects.status : object
    effects.status.status : string
    effects.transactionDigest : string
    events : array
    executionErrorSource : null
    input.gasData.budget : string
    input.gasData : object
    input.gasData.owner : string
    input.gasData.payment : array
    input.gasData.price : string
    input.messageVersion : string
    input : object
    input.sender : string
    input.transaction.inputs : array
    input.transaction.inputs.* : object
    input.transaction.inputs.*.type : string
    input.transaction.inputs.*.value : string
    input.transaction.inputs.*.valueType : string
    input.transaction.kind : string
    input.transaction : object
    input.transaction.transactions : array
    input.transaction.transactions.* : object
    input.transaction.transactions.*.Publish : array
    input.transaction.transactions.*.Publish.* : string
    input.transaction.transactions.*.TransferObjects : array
    input.transaction.transactions.*.TransferObjects.* : array
    input.transaction.transactions.*.TransferObjects.*.Input : number
    input.transaction.transactions.*.TransferObjects.* : object
    input.transaction.transactions.*.TransferObjects.*.* : object
    input.transaction.transactions.*.TransferObjects.*.*.Result : number
    objectChanges : array
    objectChanges.*.digest : string
    objectChanges.*.modules : array
    objectChanges.*.modules.* : string
    objectChanges.* : object
    objectChanges.*.objectId : string
    objectChanges.*.objectType : string
    objectChanges.*.owner.AddressOwner : string
    objectChanges.*.owner : object
    objectChanges.*.owner.Shared.initial_shared_version : number
    objectChanges.*.owner.Shared : object
    objectChanges.*.packageId : string
    objectChanges.*.previousVersion : string
    objectChanges.*.sender : string
    objectChanges.*.type : string
    objectChanges.*.version : string
  Salida completa de shape (nuevo = viejo) localnet.deployment.json:
    chainId : string
    frameworkRev : string
    houseCapId : string
    houseId : string
    network : string
    originalPackageId : string
    packageId : string
    packageVersion : number
    publishTimestamp : string
    publishTxDigest : string
    schemaVersion : number
    sourceCommit : string
    suiCliVersion : string
    upgradeCapId : string

  Cotejo de valores NO derivados de la genesis (escalares de las dos salidas de test-publish, con indices de array -> `*`, IDs 0x<64hex> -> 0xID, strings base58 de 32-88 chars -> B58, timestamps de 13 digitos -> TS; `uniq -c`; diff viejo vs nuevo):
    leaves() { jq -r 'paths(scalars) as $p | ($p | map(if type=="number" then "*" else . end | tostring) | join(".")) + " = " + (getpath($p) | tojson | gsub("0x[0-9a-f]{64}";"0xID") | gsub("^\"[1-9A-HJ-NP-Za-km-z]{32,88}\"$";"\"B58\"") | gsub("^\"[0-9]{13}\"$";"\"TS\""))' "$1" | sort | uniq -c; }
    `diff <(leaves <old>/localnet-publish.json) <(leaves localnet-publish.json)` ->
      4c4:  `1 checkpoint = "180"`  ->  `1 checkpoint = "111"`   (depende de la genesis)
      71c71: `transaction.txSignatures.* = "<firma vieja>"` -> `"<firma nueva>"`   (depende de la cuenta/tx; firma+clave publica de una cuenta desechable; no se pega)
      (diff exit=1; nada mas difiere)
    `diff <(leaves <old>/localnet-publish-dry-run.json) <(leaves localnet-publish-dry-run.json)` -> vacio (diff exit=0)
  => status `success`, `gasUsed` (computationCost 1000000, storageCost 46246000, storageRebate 0, nonRefundableStorageFee 0), todos los `objectType`, `owner` (kinds), `modules`/dependencias, balanceChanges, claves y textos: IGUALES.
  Gas (comando y salida): `jq -c '.effects.gasUsed, .effects.status'` sobre viejo y nuevo de ambos archivos:
    {"computationCost":"1000000","storageCost":"46246000","storageRebate":"0","nonRefundableStorageFee":"0"} / {"status":"success"}   (viejo y nuevo, publish y dry-run: identicos)
    `jq -r '.effects.gasUsed | (.computationCost|tonumber) + (.storageCost|tonumber) - (.storageRebate|tonumber)' localnet-publish-dry-run.json` -> 47246000 (nuevo) ; mismo comando sobre el viejo -> 47246000
  **GAS: NO CAMBIA con la PV 142 (1.84.0): gasEstimate = 1_000_000 + 46_246_000 - 0 = 47_246_000 MIST, identico a 1.83.0/PV 140. Dato para #73 (costo de publicar este paquete; ojo: es el paquete v1 actual, no el upgrade de #73).**
    Por eso `deployment.test.mjs:147` (`assert.equal(result.gasEstimate, 47_246_000n)`) NO cambia.
  Published.localnet.toml: mismas 7 claves en el mismo orden (`chain-id, published-at, original-id, version, toolchain-version, build-config, upgrade-capability`); estructura igual tras enmascarar valores;
    cambian solo: chain-id (87818ef5 -> cb1e492c), published-at/original-id/upgrade-capability (IDs de la copia en la genesis nueva) y `toolchain-version` ("1.83.0" -> "1.84.0"); `build-config = { flavor = "sui", edition = "2024" }` y `version = 1` iguales.
  localnet.deployment.json: 14 claves en el orden de DEPLOYMENT_FIELDS; solo cambian los valores derivados (chainId, IDs, digest, timestamp, sourceCommit, suiCliVersion, frameworkRev).

  TABLA de forma "igual / distinta"
  | fixture                          | shape (ruta-tipo)    | longitudes de arrays                         | valores no derivados de la genesis                         | veredicto |
  |----------------------------------|----------------------|----------------------------------------------|------------------------------------------------------------|-----------|
  | localnet-publish.json            | 103 / 103: IGUAL     | 14 / 14 iguales (cambia solo el indice del `published` en objectChanges, 1 -> 5) | gas, status, tipos, owners, bytes de Publish: iguales; solo checkpoint y firma (de la genesis/cuenta) | IGUAL |
  | localnet-publish-dry-run.json    | 90 / 90: IGUAL       | 13 / 13 iguales (indice del `published` 2 -> 4) | todo igual (diff de hojas vacio)                          | IGUAL |
  | Published.localnet.toml          | 7 claves, mismo orden | n/a                                          | toolchain-version 1.83.0 -> 1.84.0; resto derivado          | IGUAL (claves) |
  | localnet.deployment.json         | 14 / 14: IGUAL       | 0 / 0                                        | suiCliVersion y frameworkRev nuevos por construccion       | IGUAL |
  => La forma del --json de la 1.84 es igual a la de la 1.83: NO hizo falta tocar deployment.mjs ni publish.mjs (S-8 no se levanta).

#### 2.2 Valores nuevos de los tests (todos salen de las fixtures por `jq`; comandos y salidas)
  desde <repo>/contracts/scripts/fixtures:
  `jq -r '[("PKG " + (.objectChanges[]|select(.type=="published")|.packageId)), ("HOUSE " + (.objectChanges[]|select(.type=="created" and (.objectType|endswith("::house::House")))|.objectId)), ("HOUSE_CAP " + (... endswith("::house::HouseCap") ...|.objectId)), ("UPGRADE_CAP " + (... endswith("::package::UpgradeCap") ...|.objectId)), ("DIGEST " + .digest), ("TIMESTAMP_MS " + .timestampMs)] | .[]' localnet-publish.json`
    PKG 0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d
    HOUSE 0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035
    HOUSE_CAP 0x95794194fad84a5f3fee87a06d88b79a3044b0f9b3bc38db3444b3e142135e7c
    UPGRADE_CAP 0x1ae71697a07810fb1d42b77e008bb7225bef3ffb1b65a93aca17faca3739748a
    DIGEST BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH
    TIMESTAMP_MS 1795148038204
  mismo filtro (packageId / houseId / houseCapId / upgradeCapId) sobre localnet-publish-dry-run.json:
    packageId 0xe8c83494b09dedd61ae4910ab9f65a04b5aefd4b2690887249a08c80f4e4ba94
    houseId 0x32b612672a6f79427ae028469c4bd344bb53b2c487bd7e969442a7064074cdcd
    houseCapId 0x606b012e49781c44d6b20f7c83dc90606f14fad8dff5e0165f599952c6564274
    upgradeCapId 0x05fb2d1428db3cb5c3b5c12e2068076dd73a600cde9b1ec8c1bff20edc4efa67
  `grep -E '^(chain-id|published-at|original-id|version|toolchain-version|upgrade-capability)' Published.localnet.toml`:
    chain-id = "cb1e492c"
    published-at = "0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514"
    original-id = "0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514"
    version = 1
    toolchain-version = "1.84.0"
    upgrade-capability = "0x32ea9b07651911fc31c4c56ce234b33d37823b8553b0f09c33d8282196f13081"
  timestamp: `jq -r .timestampMs localnet-publish.json` = 1795148038204 ; `node -e 'console.log(new Date(1795148038204).toISOString())'` -> 2026-11-20T04:13:58.204Z (= publishTimestamp de localnet.deployment.json)
  cotejo: `jq -r '[.chainId,.packageId,.houseId,.houseCapId,.upgradeCapId,.publishTxDigest,.publishTimestamp]|@tsv' localnet.deployment.json` coincide con PKG/HOUSE/HOUSE_CAP/UPGRADE_CAP/DIGEST/timestamp de arriba.
  Reemplazos con un script de Python con conteo exacto de ocurrencias por literal (assert), sin otra edicion. Diff de literales (IDs enmascarados 0x<id>):
    -// Tests de `deployment.mjs` sobre salidas reales de la Sui CLI 1.83.0 capturadas en una localnet aislada y desechable
    +// Tests de `deployment.mjs` sobre salidas reales de la Sui CLI 1.84.0 capturadas en una localnet aislada y desechable
    -const LOCALNET_CHAIN_ID = '87818ef5';
    -const PKG = '0x<id>';
    -const HOUSE = '0x<id>';
    -const HOUSE_CAP = '0x<id>';
    -const UPGRADE_CAP = '0x<id>';
    -const DIGEST = 'C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz';
    -const TIMESTAMP_MS = '1793631179013';
    +const LOCALNET_CHAIN_ID = 'cb1e492c';
    +const PKG = '0x<id>';
    +const HOUSE = '0x<id>';
    +const HOUSE_CAP = '0x<id>';
    +const UPGRADE_CAP = '0x<id>';
    +const DIGEST = 'BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH';
    +const TIMESTAMP_MS = '1795148038204';
    -const SUI_CLI_VERSION = '1.83.0-16d2dc1e05ed';
    -const FRAMEWORK_REV = '719fb2960ccfbf9f4d33041f8ea5146d30671696'; // fixture localnet.deployment.json: registro histórico (PV 139)
    +const SUI_CLI_VERSION = '1.84.0-9dc25070cf2e';
    +const FRAMEWORK_REV = 'e6f43880f4b65e2c1f0397583a9690b4b22c9223'; // fixture localnet.deployment.json: piso de la PV 142 (recapturada en #75)
    -    packageId: '0x<id>',
    -    houseId: '0x<id>',
    -    houseCapId: '0x<id>',
    -    upgradeCapId: '0x<id>',
    +    packageId: '0x<id>',
    +    houseId: '0x<id>',
    +    houseCapId: '0x<id>',
    +    upgradeCapId: '0x<id>',
    -    publishTimestamp: '2026-11-02T14:52:59.013Z',
    +    publishTimestamp: '2026-11-20T04:13:58.204Z',
    -    publishedAt: '0x<id>',
    -    originalId: '0x<id>',
    +    publishedAt: '0x<id>',
    +    originalId: '0x<id>',
    -    toolchainVersion: '1.83.0',
    -    upgradeCapability: '0x<id>',
    +    toolchainVersion: '1.84.0',
    +    upgradeCapability: '0x<id>',
    -    () => tomlWithLine(6, 'chain-id = 87818ef5'),
    +    () => tomlWithLine(6, 'chain-id = cb1e492c'),
    -const LOCALNET_CHAIN_ID = '87818ef5';
    +const LOCALNET_CHAIN_ID = 'cb1e492c';
    -  sourceCommit: 'ef1a72026cdf02ffbabf46c34016cc151cacc620',
    -  suiCliVersion: '1.83.0-16d2dc1e05ed',
    -  frameworkRev: '719fb2960ccfbf9f4d33041f8ea5146d30671696',
    +  sourceCommit: '88dd53b21bc8ac4b38cf6232346edfbc2e459f28',
    +  suiCliVersion: '1.84.0-9dc25070cf2e',
    +  frameworkRev: 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
    -  assert.equal(chainIdFromCli('87818ef5'), undefined);
    +  assert.equal(chainIdFromCli('cb1e492c'), undefined);
    -    packageId: '0x<id>',
    -    originalPackageId: '0x<id>',
    +    packageId: '0x<id>',
    +    originalPackageId: '0x<id>',
    -    upgradeCapId: '0x<id>',
    +    upgradeCapId: '0x<id>',

#### 2.2 Gates de scripts (Node: `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version` -> v26.13.0)
  `cd <repo>/contracts && node --test scripts/*.test.mjs; echo "exit=$?"`  -> exit=0 ; salida COMPLETA:
    ✔ parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real (6.609523ms)
    ✔ parsePublishOutput no depende de la posición en objectChanges (1.188679ms)
    ✔ parsePublishOutput rechaza una transacción que no terminó en success (1.247158ms)
    ✔ parsePublishOutput rechaza una salida sin objeto published (0.701891ms)
    ✔ parsePublishOutput rechaza dos Houses creadas (0.948916ms)
    ✔ parsePublishOutput rechaza una salida sin HouseCap (0.80232ms)
    ✔ parsePublishOutput rechaza una salida sin UpgradeCap (0.751976ms)
    ✔ parsePublishOutput rechaza una House de otro paquete (0.732263ms)
    ✔ parsePublishOutput rechaza una House no compartida (0.775655ms)
    ✔ parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs (1.181357ms)
    ✔ parseDryRunOutput da ok = false si el status no es success o falta un objeto (0.773743ms)
    ✔ buildDeployment arma los 14 campos en orden y validateDeployment lo acepta (2.5219ms)
    ✔ SEG-3: ningún valor del json armado es una dirección de cuenta del fixture (1.157177ms)
    ✔ validateDeployment: falta schemaVersion (0.396834ms)
    ✔ validateDeployment: falta network (0.295688ms)
    ✔ validateDeployment: falta chainId (0.376317ms)
    ✔ validateDeployment: falta packageId (0.368926ms)
    ✔ validateDeployment: falta originalPackageId (0.275671ms)
    ✔ validateDeployment: falta packageVersion (0.275251ms)
    ✔ validateDeployment: falta upgradeCapId (0.314116ms)
    ✔ validateDeployment: falta houseId (0.268609ms)
    ✔ validateDeployment: falta houseCapId (0.280337ms)
    ✔ validateDeployment: falta publishTxDigest (0.269907ms)
    ✔ validateDeployment: falta publishTimestamp (0.307982ms)
    ✔ validateDeployment: falta sourceCommit (0.265378ms)
    ✔ validateDeployment: falta suiCliVersion (0.242125ms)
    ✔ validateDeployment: falta frameworkRev (0.252624ms)
    ✔ validateDeployment rechaza: clave desconocida (0.433486ms)
    ✔ validateDeployment rechaza: ID corto (0.303777ms)
    ✔ validateDeployment rechaza: ID en mayúsculas (0.351244ms)
    ✔ validateDeployment rechaza: testnet con chain id ajeno (0.332168ms)
    ✔ validateDeployment rechaza: localnet con el chain id de testnet (0.303066ms)
    ✔ validateDeployment rechaza: localnet con el chain id de mainnet (0.35656ms)
    ✔ validateDeployment rechaza: sourceCommit null en testnet (0.323881ms)
    ✔ validateDeployment rechaza: network mainnet (0.354433ms)
    ✔ validateDeployment rechaza: publishTimestamp sin milisegundos (0.297306ms)
    ✔ validateDeployment rechaza: publishTimestamp sin Z (0.28646ms)
    ✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error (0.832946ms)
    ✔ parsePublishedToml lee cada campo del fixture real (1.602925ms)
    ✔ parsePublishedToml rechaza una línea inesperada con su número (0.510455ms)
    ✔ parsePublishedToml rechaza: clave desconocida, con su número de línea (0.607431ms)
    ✔ parsePublishedToml rechaza: clave duplicada, con su número de línea (0.330514ms)
    ✔ parsePublishedToml rechaza: sección duplicada, con su número de línea (0.420198ms)
    ✔ parsePublishedToml rechaza: sección incompleta, con su número de línea (0.502886ms)
    ✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea (0.43761ms)
    ✔ parsePublishedToml rechaza: entero mal formado, con su número de línea (0.401234ms)
    ✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea (0.302821ms)
    ✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia (1.153207ms)
    ✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo (1.990779ms)
    ✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex (0.443587ms)
    ✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex (0.357766ms)
    ✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado (6.508868ms)
    ✔ runSui invoca cada vector permitido (2.861748ms)
    ✔ runSui rechaza sin invocar todo vector fuera de la lista blanca (2.028396ms)
    ✔ runSui no invoca sin un configDir validado (0.537895ms)
    ✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca (0.679283ms)
    ✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/ (0.899267ms)
    ✔ parseCliArgs: subcomandos y opciones válidos (2.475363ms)
    ✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y (1.92339ms)
    ✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI) (3.967322ms)
    ✔ main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI (1.660237ms)
    ✔ main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI (1.407139ms)
    ✔ checkNodeVersion: el major de Node debe ser el de .nvmrc (0.976831ms)
    ✔ checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc) (0.373681ms)
    ✔ isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo (0.757355ms)
    ✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet (0.516488ms)
    ✔ checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet (0.471859ms)
    ✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui (1.607719ms)
    ✔ checkConfigDirGuard acepta una config propia y devuelve su realpath (0.41282ms)
    ✔ checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original (1.300623ms)
    ✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id (0.678274ms)
    ✔ checkNetworkGuard: chain id según la red (0.681409ms)
    ✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier (0.946517ms)
    ✔ redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto (0.529257ms)
    ✔ readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones (1.274251ms)
    ✔ checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml (1.322674ms)
    ✔ checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error (1.776881ms)
    ✔ checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok (0.414951ms)
    ✔ confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta (0.668894ms)
    ✔ confirmación: ninguna variable de entorno la omite (0.560261ms)
    ✔ resolveRecordMeta: usa meta.json si existe (0.435633ms)
    ✔ resolveRecordMeta: sin meta.json exige los flags (1.607945ms)
    ✔ resolveRecordMeta: red o chain id incoherentes con --network ⇒ error (0.559015ms)
    ✔ checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues (0.576026ms)
    ✔ checkDeployments: localnet válido sin entrada en Published.toml (1.997677ms)
    ✔ checkDeployments: testnet sin Published.toml ⇒ error (2.170678ms)
    ✔ checkDeployments: entrada de Published.toml sin json ⇒ error (0.606719ms)
    ✔ checkDeployments: nombre de archivo distinto de network ⇒ error (0.507151ms)
    ✔ checkDeployments: json inválido ⇒ error (0.802753ms)
    ✔ checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error (1.432835ms)
    ✔ checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3) (0.528569ms)
    ✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea (0.388746ms)
    ✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos (0.467865ms)
    ✔ formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas (1.973091ms)
    ✔ formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar) (17.432377ms)
    ✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar (0.271867ms)
    ✔ formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra (0.267052ms)
    ✔ formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo (0.312819ms)
    ✔ formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr (0.190564ms)
    ✔ formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo (0.221992ms)
    ✔ interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo) (0.407788ms)
    ✔ formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2) (0.315989ms)
    ✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout (0.618179ms)
    ✔ interpretCliRun: salida real ⇒ el resultado del parser (0.401084ms)
    ℹ tests 104
    ℹ suites 0
    ℹ pass 104
    ℹ fail 0
    ℹ cancelled 0
    ℹ skipped 0
    ℹ todo 0
    ℹ duration_ms 257.320108
  `node scripts/publish.mjs check; echo "check exit=$?"`
    1 despliegue(s) válidos y coherentes con Published.toml
    check exit=0
  Estado de lock/Published/testnet.json (`git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/deployments/testnet.json; echo "exit=$?"`): ver cierre (exit 0).

#### 2.3 Cierre de la genesis (agents.md §3 paso 7) y guardas
  `kill "$(cat <SMOKE_DIR>/sui.pid)"; echo "kill exit=$?"` -> kill exit=0. **Codigo de salida de `sui start` al kill (lo marca el harness): 144** (igual que la 1.83).
  `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"; echo "kill -0 exit=$?"` -> "kill: (<pid>) - No such process" ; kill -0 exit=1. `ss -ltn | grep -c ':19000 '` -> 0. Procesos `sui start|genesis` vivos: 0.
  `rm -rf <SMOKE_DIR>` (incluye net/, home/, tmp/, move/ y el tmp de la variante A) ; `test ! -e <SMOKE_DIR> && echo "SMOKE_DIR borrado"` -> SMOKE_DIR borrado.
  `rm -f contracts/deployments/localnet.json; rmdir contracts/deployments 2>/dev/null || true; ls contracts/deployments` -> testnet.json (la carpeta sigue por testnet.json; no se creo localnet.json).
  `git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/deployments/testnet.json; echo "exit=$?"` -> exit=0 (sin delta).
  `test ! -e contracts/deployments/localnet.json; echo $?` -> 0 ; `! compgen -G 'contracts/Pub.*.toml'; echo $?` -> 0.
  `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` -> 2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml  (IGUAL a la linea base)
  `ls -la <HOME real>/.sui/sui_config/` -> total 12 ; drwx------ . ; drwx------ .. ; -rw-rw-r-- 1 244 Oct 30 17:52 client.yaml  (IGUAL: solo client.yaml)
  `sha256sum <HOME real>/.sui/sui_config/client.yaml` -> mismo hash que la linea base (primeros 12 hex: ef12fd09615f igual al de antes). Nunca se hizo cat.
  `du -s <HOME real>/.move` -> 170748 (antes: 170748; sin delta; la cache nueva del framework fue la aislada <SMOKE_DIR>/move = 57396 KB, borrada).
  Docker: `docker ps -aq | wc -l` = 5 y `docker images -aq | wc -l` = 17 (antes: 5 y 17). No se toco ningun contenedor/imagen (solo `docker ps --format` de lectura en el primer intento).
  `git diff --stat`:
     contracts/scripts/deployment.test.mjs              |  40 ++--
     contracts/scripts/fixtures/Published.localnet.toml |  10 +-
     .../scripts/fixtures/localnet-publish-dry-run.json | 120 ++++++------
     contracts/scripts/fixtures/localnet-publish.json   | 218 ++++++++++-----------
     .../scripts/fixtures/localnet.deployment.json      |  22 +--
     contracts/scripts/publish.test.mjs                 |  16 +-
     6 files changed, 213 insertions(+), 213 deletions(-)
  `git status --porcelain --untracked-files=all`:
     M contracts/scripts/deployment.test.mjs
     M contracts/scripts/fixtures/Published.localnet.toml
     M contracts/scripts/fixtures/localnet-publish-dry-run.json
     M contracts/scripts/fixtures/localnet-publish.json
     M contracts/scripts/fixtures/localnet.deployment.json
     M contracts/scripts/publish.test.mjs

### Tablas de contrato / app/src/sui: no aplica (sin cambios de contrato ni de app).

### Riesgos / pendientes
- El puerto 9000 sigue ocupado por el contenedor ajeno: TASK-2b (capturas en 127.0.0.1:9000 fijo en localnet-guard.mjs:10, capture-*.mjs y networks.ts:11) y los smokes de navegador necesitan la decision de repo de la sonda (o liberar el 9000).
- agents.md §3 no documenta el flag --fullnode-rpc-port, el orden genesis -> start -> suic, ni que `sui start --network.config <dir>` reescribe el alias localnet del client.yaml aislado: candidato a TASK-4 / issue (docs).
- Dato para #73 (gas): sin cambio de costos de publicacion con la PV 142 (47_246_000 MIST, igual que antes).
- Las fixtures nuevas llevan 1 direccion de cuenta efimera de la genesis (precedente aceptado, R-6); ver Seguridad.
- La 1.84.0 mantiene el codigo 144 de `sui start` al SIGTERM.

### INCIDENTE de proceso (declarado; sin efecto verificado)
Al armar este reporte, un `cat <<EOF` con heredoc SIN comillas contenia texto con acentos graves (backticks); el shell los ejecuto como sustitucion de comandos. Se ejecutaron: (1) `--fullnode-rpc-port` -> "command not found";
(2) **`sui start` a secas** (sin `printf 'n\n' |`, sin SUI_CONFIG_DIR ni HOME aislados, es decir con el HOME real); (3) `localnet` -> "command not found".
Resultado de (2): la CLI se nego de inmediato con el mensaje "Cannot run genesis with non-empty Sui config directory: <HOME real>/.sui/sui_config ... use --force-regenesis ..." (ese texto cayo por stdout al borrador del reporte y ya se quito); no arranco ninguna red ni escribio nada.
Verificacion inmediata (misma sesion, justo despues): `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` -> 2026-10-30 17:52:52.515735237 -0500 244 (igual); `ls -la <HOME real>/.sui/sui_config/ <HOME real>/.sui` -> solo client.yaml dentro de sui_config
(y sui_config dentro de .sui, sin archivos nuevos); `sha256sum` de client.yaml = el de la linea base (primeros 12 hex ef12fd09615f); `ps` sin procesos sui; `ss -ltn` sin 9184/19000/9123; `du -s <HOME real>/.move` = 170748; `<HOME real>/.config/sui` no existe; `git status` solo con los 6 archivos de TASK-2a.
Es una violacion de la regla "nunca `sui start` a secas / `printf 'n\n' |` siempre": fue accidental (error de quoting del heredoc, no un comando intencional) y quedo contenida por el propio rechazo de la CLI ante un config dir no vacio (el client.yaml existia). S-7 NO se levanta (nada cambio). Lo declaro para que el orquestador/MAYOR lo evalue.

### STOPs levantados
Ninguno (S-1..S-9). La forma del --json no cambio (S-8 no aplica); lock/Published/testnet.json sin delta; `~/.sui` intacto.

### Documentacion
READMEs / agents.md: no aplica (TASK-4 si). Snippet propuesto para STATUS (parte de TASK-2a; completar G-B/G-C en 2b): localnet aislada @ feature/issue-75-toolchain-1840 (TASK-2a de #75), CLI 1.84.0-9dc25070cf2e, 2026-11-19/20: recaptura de contracts/scripts/fixtures/* en G-A (chain cb1e492c, puerto 19000 por ocupacion del 9000); forma del --json igual; gas igual (47_246_000); variante A de publish.mjs de punta a punta sin aviso de CLI; node --test 104; check 1 despliegue(s); sui start sale con 144; cierre limpio.

### Seguridad (R-6)
Los 4 greps del handoff (R-6, `/usr/bin/grep -nE`, patrones 1 a 4 en el orden del handoff) se corrieron sobre las lineas `+` de `git diff -U0` (213 lineas) y sobre este reporte. No se transcriben los patrones 3 y 4 aqui para no autocoincidir.
Sobre el DIFF (lineas +):
  - Patron 3 (claves, frases de recuperacion, rutas personales): 0 coincidencias. Patron 4 (hash abreviado con puntos suspensivos): 0 coincidencias. -> vacios.
  - Patron 1 ([0-9a-fA-F]{40,64}), coincidencias por archivo: deployment.test.mjs 12, publish.test.mjs 5, localnet.deployment.json 7, localnet-publish-dry-run.json 30, localnet-publish.json 55, Published.localnet.toml 3.
  - Patron 2 (0x + 8 o mas hex), por archivo: deployment.test.mjs 11, publish.test.mjs 3, localnet.deployment.json 5, localnet-publish-dry-run.json 30, localnet-publish.json 55, Published.localnet.toml 3.
  Clasificacion:
  * Tests (deployment.test.mjs, publish.test.mjs): todo son IDs publicos de objetos/paquetes de la genesis desechable (PKG, HOUSE, HOUSE_CAP, UPGRADE_CAP, IDs del dry run, IDs del TOML), mas 2 SHA publicos de 40 hex: el piso de la PV 142 `e6f43880f4b65e2c1f0397583a9690b4b22c9223` (FRAMEWORK_REV / frameworkRev) y el commit `88dd53b21bc8ac4b38cf6232346edfbc2e459f28` (publish.test.mjs `sourceCommit`). Ninguna cuenta.
  * Grupo "fixtures" (4 archivos): IDs de objetos/paquetes, digests y bytes de la tx de una genesis desechable; conteos por archivo de 0x<64 hex> (todo el archivo): localnet-publish.json 57, localnet-publish-dry-run.json 36, Published.localnet.toml 3, localnet.deployment.json 5.
    Direcciones de CUENTA efimera (precedente aceptado, R-6 del handoff): 1 direccion distinta (el ADMIN de G-A), extraida con `/usr/bin/grep -ohE '"(sender|owner|AddressOwner|ObjectOwner)": "0x[0-9a-f]{64}"'` sobre los dos `localnet-publish*.json`; aparece en 22 lineas de localnet-publish.json y 18 de localnet-publish-dry-run.json,
    0 en Published.localnet.toml y 0 en localnet.deployment.json. (El archivo `localnet-publish.json` ademas trae una firma+clave publica de esa cuenta desechable en `txSignatures`: precedente de #7, D1.)
  * Comprobacion "ninguna direccion de cuenta fuera de esos archivos": `git diff -- . ':(exclude)contracts/fixtures' ':(exclude)contracts/scripts/fixtures' | /usr/bin/grep -c <direccion>` = 0 (133 lineas de diff fuera de las fixtures), y `git grep -c <direccion> -- . ':(exclude)contracts/fixtures' ':(exclude)contracts/scripts/fixtures'` = 0 archivos del arbol; y 0 apariciones en este reporte. (Solo conteos; la direccion no se imprime.)
Sobre ESTE REPORTE: patron 3 = 0 y patron 4 = 0 (vacios). Patron 1 y 2: solo SHAs publicos (e6f43880... del framework de la PV 142; 88dd53b2... el commit de master; 719fb296... el rev viejo PV 139 y ef1a7202... el sourceCommit viejo, citados como "valor viejo" en el diff de literales) e IDs publicos de objetos/paquetes de la genesis desechable (las 14 IDs distintas de §2.1, 2.2 y la variante A). Ninguna cuenta ni clave ni ruta personal (rutas con placeholders <repo>, <HOME real>, <SMOKE_DIR>, <scratchpad>).
Nota: el incidente del heredoc (arriba) no dejo salida con rutas/claves en el reporte.

~~~~


---

## 5. TASK-2a (revisión del MID)

> MID, TASK-2a.

## Revisión TASK-2a: PASA

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-2a.txt` (674 líneas) y del diff real sin commitear de `<repo>` (HEAD `c47c77e`): 6 archivos, 213 inserciones y 213 borrados, idéntico al `git diff --stat` del reporte. Contexto: `REPORTE_TOOLCHAIN_142_SONDA_PUERTO.txt`. No se ejecutó ningún gate ni `sui`/`suiup` (D-20261030-02).

### Veredicto en una línea
Las 4 fixtures de `contracts/scripts/fixtures/` vienen de la 1.84.0 en una localnet aislada (chain `cb1e492c`, puerto 19000), copiadas sin editar; la forma del `--json` es igual, el gas es igual, `node --test` da 104 PASS y `check` da `1 despliegue(s)`; no hay STOPs. Aprobado, con **un incidente de proceso** (un `sui start` accidental sin guarda, sin efecto) que no bloquea pero exige una regla preventiva (R-12).

### Checklist (FLUJO §5 y DoD de TASK-2a)

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Flujo 2.0 → 2.3, fixtures sin editar | OK | Génesis, arranque, `test-publish --dry-run` y `test-publish` (reporte `:62-75`), copia del paquete para `Published.localnet.toml` (`:76-83`), `cp` + `cmp` (3 veces, `cmp1=cmp2=cmp3=0`) + `jq empty` (`:84-87`), `record` para `localnet.deployment.json` con los valores del handoff (`:88-99`: `--chain-id cb1e492c`, `--source-commit "$(git rev-parse 88dd53b)"` = `88dd53b21bc8ac4b38cf6232346edfbc2e459f28` verificado, `--sui-cli-version 1.84.0-9dc25070cf2e`, `--framework-rev e6f43880…`). `git diff --exit-code -- Move.lock` en 0 tras cada `test-publish`. El flujo siguió 2.0 → 2.3. Los flags de `test-publish` no cambiaron en la 1.84 (`test-publish --help`, `:39`). |
| 2 | Comparación de forma y S-8 | OK, suficiente | Se usaron las funciones `shape` (todos los nodos, pares ruta-tipo) y `arrays` del handoff: `localnet-publish.json` 103 = 103 rutas-tipo y 14 = 14 arrays; `localnet-publish-dry-run.json` 90 = 90 y 13 = 13; `localnet.deployment.json` 14 = 14 (`:119-142`). Cotejo de hojas no derivadas de la génesis (`leaves`, `:384-391`): en `localnet-publish.json` solo difieren `checkpoint` (180 → 111) y `txSignatures` (firma de la cuenta efímera); en el dry run, nada. **El único cambio de índice (`objectChanges.1.modules` → `.5`, y `.2` → `.4`) es solo orden:** el array de `objectChanges` tiene la misma longitud (10 y 6) y los mismos tipos; solo cambia en qué posición cae el `published`, que depende del orden de los IDs de la génesis. Además `parsePublishOutput` no depende de la posición (test `parsePublishOutput no depende de la posición en objectChanges`, que pasa) y la variante A confirma el camino de punta a punta. Veredicto "forma igual" y **S-8 no aplica**: justificado. |
| 3 | Gas | OK | `gasUsed` idéntico en publish y dry run: cómputo 1000000, storage 46246000, rebate 0, `nonRefundableStorageFee` 0; `gasEstimate` = 1000000 + 46246000 − 0 = **47_246_000 MIST**, igual con la PV 142 que con la PV 140 (`:392-396`); `deployment.test.mjs:147` no cambia. **Dato para #73:** es el costo de publicar el v1 actual, no el del upgrade; no hay delta de la tabla de gas entre PV 140 y 142 para este caso. |
| 4 | Literales de tests | OK | Los valores salen de las fixtures por `jq` con comandos y salidas pegados (`:410-432`); reemplazos con conteo exacto por literal; ningún test borrado ni debilitado (diff: solo literales y comentarios); `node --test` 104 PASS (51 + 53) y `check` = `1 despliegue(s) válidos y coherentes con Published.toml` (`:526-536`). Las tres decisiones declaradas se **aceptan** (ver abajo). |
| 5 | Variante A | OK | `publish.mjs publish --network localnet --pubfile-path … --out …` con el prefijo del paso 3: exit 0, **stderr de 0 bytes (sin aviso de CLI distinta de `ci.yml`)**, `suiCliVersion` `1.84.0-9dc25070cf2e`, `frameworkRev` `e6f43880…`, `chainId` `cb1e492c`, `Move.lock` sin delta (`:101-116`). El resumen no trae la dirección de la cuenta. |
| 6 | Cierre | OK | `sui start` salió con **144** (igual que la 1.83), `kill -0` falla, puerto 19000 libre, `<SMOKE_DIR>` borrado, `~/.sui` idéntico (244 bytes, mtime del 2026-10-30, sha256 igual, solo `client.yaml`), `~/.move` sin delta (170748 KB; el framework nuevo cayó en la caché aislada y se borró), Docker 5 / 17 sin delta, `Move.lock`, `Published.toml` y `deployments/testnet.json` sin delta, ningún `Pub.*.toml` ni `localnet.json` (`:538-575`). |
| — | R-6 | OK | Una sola dirección de cuenta efímera (el ADMIN de G-A, el precedente aceptado de #7); 0 apariciones fuera de las fixtures (diff, árbol versionado y reporte); patrones 3 y 4 en 0; resto: IDs, digests y SHAs públicos clasificados. Coincide con lo que verificó el orquestador. |

### Las tres decisiones declaradas como desviaciones menores

| # | Decisión del DEV | Veredicto | Motivo |
|---|---|---|---|
| (a) | La copia del paquete para `Published.localnet.toml` lleva solo `Move.toml` (con `[environments] localnet = "cb1e492c"`), `Move.lock` y `sources/`, sin `Published.toml` | **Aceptada** | El `Published.toml` del repo ya tiene `[published.testnet]` desde #8: en la copia se habría mezclado con la entrada localnet y la fixture dejaría de ser la de #7 (una sola tabla `[published.localnet]`). El resultado tiene las mismas 7 claves en el mismo orden (`:397`) y el handoff pedía "copia sin `build/`"; esto es una precisión compatible con su intención. |
| (b) | `deployment.test.mjs:180` (`publishTimestamp`) cambiado a `2026-11-20T04:13:58.204Z` aunque el handoff no lo listaba | **Aceptada** | Es un literal derivado de la fixture (`timestampMs` 1795148038204, verificado con `Date`); sin él fallaba 1 test (`fixtures/localnet.deployment.json = buildDeployment`). El handoff v1.2 omitió esa línea en 2.2: error del handoff, no del DEV. Las líneas `:217-218` (negativos de formato de `publishTimestamp`) correctamente no se tocaron. |
| (c) | `FIXTURE_META.sourceCommit` de `publish.test.mjs` = `88dd53b21bc8ac4b38cf6232346edfbc2e459f28` (SHA completo de `git rev-parse 88dd53b`, el usado en `record`); `SOURCE_COMMIT` de `deployment.test.mjs` sin cambio | **Aceptada** | `FIXTURE_META` es lo que el test compara con `localnet.deployment.json`, así que tiene que ser el valor de `record` (verificado: coincide). `SOURCE_COMMIT` es un literal propio de ese test (nunca estuvo derivado de la fixture: ya difería del viejo `ef1a7202`). |

### Desviación autorizada por el owner: puerto 19000
Aceptada como declarada: el puerto 9000 lo ocupa un contenedor de otro proyecto (no se toca), `sui start --fullnode-rpc-port 19000`, y el `smoke_guard` del DEV exige que el RPC activo sea exactamente `http://127.0.0.1:19000`. Está bien razonado: la sonda comprobó que `sui start --network.config` reescribe el alias `localnet` del `client.yaml` aislado, por eso el orden es génesis → `start` con el flag → recién después cualquier `suic`/`publish.mjs`, y por eso el arranque usa `smoke_guard_pre`. Observación: en el primer intento (sin flag), un `suic chain-identifier` le habló por gRPC al servicio ajeno del 9000 (lectura, sin escritura); es justo lo que el nuevo `smoke_guard` impide. Para los docs (TASK-4) y para TASK-2b: ver el addendum del handoff v1.3.

### Incidente de proceso: `sui start` a secas por un heredoc sin comillas

**Hecho (reporte `:645-653`):** al armar el reporte, un `cat <<EOF` sin comillas con backticks ejecutó por sustitución de comandos: `--fullnode-rpc-port` y `localnet` (ambos "command not found") y **`sui start` a secas**, sin `printf 'n\n' |`, con el HOME real y sin `SUI_CONFIG_DIR`. La CLI se negó al instante ("Cannot run genesis with non-empty Sui config directory…"). El DEV lo detectó, lo declaró y verificó: `client.yaml` igual (mtime, tamaño y sha256), sin archivos nuevos, sin procesos `sui`, sin puertos 9184/19000/9123, `~/.move` igual, `<HOME real>/.config/sui` inexistente, `git status` solo con los 6 archivos. El orquestador lo verificó por su cuenta.

**(i) Severidad real.** Es una violación accidental de una regla dura (siempre `printf 'n\n' |`; nunca `sui start` a secas, `agents.md` §3, STATUS H11), así que la clasifico 🟠 **MAJOR de proceso, sin impacto**: no levanta S-7 (nada cambió: S-7 se define por cambios en `~/.sui/sui_config/`, y los tres controles dan idéntico), no hay efecto en el repo ni en el sistema, y no bloquea el commit de TASK-2a. Pero fue un casi-incidente grave: lo contuvo **una sola barrera**, que `~/.sui/sui_config/` no estaba vacío (el `client.yaml` sin claves de D-20261030-07 existía, y por eso la CLI se negó a correr la génesis). Con la carpeta vacía o inexistente, `sui start` habría creado una génesis con claves y un keystore en el HOME real, que es exactamente el riesgo que `agents.md` §3 y H11 cierran. El DEV hizo bien en declararlo y verificar sin leer el contenido del `client.yaml`.

**(ii) Regla preventiva para los próximos tasks (propuesta, la recomiendo tal como la planteaste con dos precisiones):**
- R-12 (nueva), "Reportes sin ejecución accidental": el reporte `.txt` y cualquier texto de prosa se escriben **con la herramienta de escritura de archivos**, o con heredoc **entrecomillado** (`<<'EOF'`), nunca con un heredoc sin comillas, ni con `echo`/`printf` entre comillas dobles, que contengan acentos graves o `$(…)`; **nunca se arma un reporte con un shell que interprete texto que contenga `sui`**. Los comandos que se citan en el reporte van como texto literal escrito con esa herramienta.
- Control posterior obligatorio: tras escribir el reporte, `grep -c 'command not found'` sobre el borrador y sobre el output de la sesión, y revisión de que no haya salidas de la CLI pegadas por accidente (en este incidente, un mensaje cayó al borrador y se quitó).
- Precisión 1: es una regla de **proceso del DEV**, no de seguridad del repo; no cambia ninguna decisión del owner.
- Precisión 2: aplica también al MID/MAYOR/orquestador cuando escriben con shell (el MID usa la herramienta de escritura de archivos y `python3 - <<'EOF'` entrecomillado).

**(iii) Dónde reflejarlo.** (1) En el **handoff v1.3**, como regla R-12 en §2 y una línea corta en "Cambios de v1.2 a v1.3" (aplica a todos los tasks restantes: 2b, 3 y 4); **yo ya la incluí solo dentro de TASK-2b** (el siguiente task del DEV) y recomiendo que el orquestador la promueva a R-12 en §2 en la próxima versión consolidada, porque me pediste no tocar el resto del handoff. (2) En el **reporte de TASK-2a** ya está declarado (sección "INCIDENTE", `:645-653`); el orquestador lo transcribe a `REPORTES_TOOLCHAIN_142.md` tal cual. (3) En el **cuerpo del PR**, una línea en "Seguridad": "un `sui start` accidental sin guarda durante TASK-2a fue rechazado por la CLI sin efecto; verificado; regla R-12 agregada". No requiere entrada en `DECISIONES.md` (no hay decisión).

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| H-1 | 🟠 MAJOR (proceso, sin impacto) | agents.md §3 (guarda de `sui`), R-2 del handoff, STATUS H11 | reporte `:645-653` | `sui start` a secas ejecutado por sustitución de comandos de un heredoc sin comillas | R-12 (arriba); sin cambios en el repo ni en el sistema |
| H-2 | 🔵 NIT | Handoff v1.2 2.2 | `HANDOFF…md` 2.2; `deployment.test.mjs:180` | El handoff omitió `publishTimestamp` en la lista de literales | Aceptado; sin acción (ya está en la lista derivada de la fixture). Si se consolida, agregar `:180` a 2.2 |
| H-3 | 🔵 NIT | PROY-19 | reporte `:63`, `:72`, `:74`, `:78` | Los comandos largos aparecen con `…` o `G` en lugar de la línea completa (`jq`, `cmp`); la salida sí está | Sin acción; en 2b pegar la línea completa tal cual se corrió (ya se pidió en TASK-1) |

No hay BLOCKER ni MINOR.

### Siguiente paso
**TASK-2a aprobado: autorizado el commit.** TASK-2b queda **pausado hasta que el MAYOR revise el addendum v1.3** (guarda de puerto), según indicó el orquestador. Hasta entonces: no abrir G-B ni G-C.

### Mensaje de commit propuesto (TASK-2a; solo `Refs #75`; el orquestador agrega el trailer)

```
test: recapture the script fixtures with the 1.84.0 localnet and adapt the script tests (#75)

The four fixtures of contracts/scripts/fixtures (dry-run and real
test-publish output, the Published.toml written by publishing a copy of the
package, and the deployment json built with publish.mjs record) come from an
isolated localnet run with CLI 1.84.0-9dc25070cf2e (new genesis, chain
cb1e492c, fullnode RPC on port 19000 because 9000 is taken by another
service on the host). Shape of the CLI json is unchanged (103 and 90
path-type pairs and every array length equal; only the position of the published
change inside objectChanges moves) and the publish gas is unchanged under
protocol version 142 (47246000 MIST). The two script test files keep their
104 cases with the literals read from the new fixtures with jq; publish.mjs
publish --network localnet runs end to end with the new CLI without a
version warning and leaves Move.lock untouched. Refs #75
```

### Snippet para STATUS.md (parte de TASK-2a; se completa con 2b en TASK-4)

```markdown
| localnet aislada @ `feature/issue-75-toolchain-1840` (TASK-2a de #75), CLI `1.84.0-9dc25070cf2e`, 2026-11-20 | recaptura de `contracts/scripts/fixtures/*` en G-A (chain `cb1e492c`, RPC en el puerto 19000 por ocupación del 9000); variante A de `publish.mjs` | 🟢 forma del `--json` **igual** (103/103 y 90/90 pares ruta-tipo; todas las longitudes de arrays iguales; solo cambia la posición del `published` en `objectChanges`); gas de publicación **igual** (47_246_000 MIST) con la PV 142; `publish.mjs` de punta a punta sin aviso de CLI y con `Move.lock` sin delta; `node --test` **104**, `check` `1 despliegue(s)`; `sui start` sale con 144; cierre limpio (`~/.sui`, `~/.move` y Docker en la línea base) |
```

### §R-6 sobre esta revisión (`/usr/bin/grep`)
Patrones 1-4 sobre este archivo; el resultado exacto va en el mensaje de entrega. No contiene direcciones de cuenta, claves ni rutas personales (placeholders `<repo>`, `<HOME real>`, `<SMOKE_DIR>`).



---

## 6. TASK-2b, tramo 1 (reporte del DEV)

> DEV, TASK-2b, pasos 2.4.1-2.4.6: guarda de captura.

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 v1.3.1 - TASK-2b, PRIMER TRAMO (paso 2.4.1 a 2.4.6, punto de control 2.4.7)

El DEV se detiene aqui: no se hizo 2.5, no se abrio ninguna genesis, no se uso ninguna herramienta sui (no hace falta para este tramo).

### Branch (con SHA corto del HEAD)
feature/issue-75-toolchain-1840 @ eeb34de (worktree <repo> = Battleship-issue75), arbol limpio al empezar. Cambios en el arbol de trabajo, sin git add ni commit.

### Archivos modificados/creados
- app/scripts/localnet-guard.mjs (modificado): isLoopbackUrl y checkLocalnetArgs puras y exportadas; assertLocalnetUrl las usa (misma firma, codigo 2, "No se hizo ningun pedido."); LOCALNET_URL sin cambios; assertDeployment sin cambios.
- app/scripts/localnet-guard.d.mts (nuevo): tipos de las cinco exportaciones (LOCALNET_URL, isLoopbackUrl, checkLocalnetArgs, assertLocalnetUrl, assertDeployment).
- app/src/test/localnet-guard.test.ts (nuevo): 90 tests, funciones puras.
- app/scripts/capture-read-fixtures.mjs (lineas 4 y 6), capture-tx-fixtures.mjs (7 y 9), capture-house-fixtures.mjs (6 y 16): solo comentarios de ayuda.
No se toco: networks.ts, publish.mjs, deployment.mjs, el texto de version 1.83 de los capture-* (es del paso 2.5, commit (b)), fixtures, docs, Move.lock, Published.toml, deployments/testnet.json, ci.yml.

### Que se implemento
1. isLoopbackUrl(url): true solo si url es un string que cumple la regex anclada con el patron "http://127.0.0.1:" seguido de un puerto de 4 o 5 digitos sin cero inicial (`^http:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})$`) y el puerto, como entero, esta entre 1024 y 65535. Cualquier no-string es false (typeof).
2. checkLocalnetArgs(argv) devuelve { ok: true, url } o { ok: false, message }: es la logica que estaba dentro de assertLocalnetUrl (--url opcional; sin --url la URL es LOCALNET_URL = http://127.0.0.1:9000; argumento desconocido, --url repetido o --url=valor = error). Mensaje: "solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url <valor>[ y argumentos desconocidos: ...]."
3. assertLocalnetUrl(argv, scriptName) escribe por stderr "<script>: <mensaje> No se hizo ningun pedido." y sale con process.exit(2) antes de cualquier pedido; la restriccion "solo loopback" se conserva (solo se generaliza el puerto). Lineas de sincronia con el .d.mts en el JSDoc de las dos funciones nuevas y en la cabecera del .d.mts (N-7).

### Tests y gates (Node: export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version -> v26.13.0). node_modules ya estaba instalado (no se corrio npm ci en este tramo).

#### Lint
$ cd <repo> && npm run lint -w app; echo "lint exit=$?"
(primer intento: 1 warning "Unused eslint-disable directive" en el test por un comentario eslint-disable innecesario de mi primer borrador; se quito el comentario y se repitio)
Salida final:

> lint
> eslint . --max-warnings 0

lint exit=0

#### Typecheck
$ cd <repo> && npm run typecheck -w app; echo "typecheck exit=$?"

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

typecheck exit=0
(el .d.mts resuelve: el test importa ../../scripts/localnet-guard.mjs con tipos; no se levanta S-10)

#### npm test -w app (suite completa)
$ cd <repo> && npm test -w app; echo "test exit=$?"   -> test exit=1 (UN test rojo, ajeno a la guarda: ver "Hallazgo")
Salida completa (rutas con placeholder):

> test
> vitest run


 RUN  v5.0.5 <repo>/app

 ❯ src/sui/config.test.ts (52 tests | 1 failed) 82ms
   ❯ resolveConfig: valid deployments (5)
     × resolves the real localnet fixture 44ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/sui/config.test.ts > resolveConfig: valid deployments > resolves the real localnet fixture
AssertionError: expected { ok: true, config: { …(8) } } to deeply equal { ok: true, config: { …(8) } }

- Expected
+ Received

  {
    "config": {
      "burnerWalletEnabled": false,
-     "chainId": "87818ef5",
+     "chainId": "cb1e492c",
      "grpcUrl": "http://127.0.0.1:9000",
-     "houseId": "0xbcbcb0392aad3b13aeb43a007105a1467f4d33a3f40b28aff08f72f4c4da0930",
+     "houseId": "0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035",
      "network": "localnet",
-     "originalPackageId": "0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e",
-     "packageId": "0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e",
-     "publishTxDigest": "C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz",
+     "originalPackageId": "0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d",
+     "packageId": "0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d",
+     "publishTxDigest": "BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH",
    },
    "ok": true,
  }

 ❯ src/sui/config.test.ts:48:110
     46| describe('resolveConfig: valid deployments', () => {
     47|   it('resolves the real localnet fixture', () => {
     48|     expect(resolveConfig({ VITE_SUI_NETWORK: 'localnet', DEV: false },…
       |                                                                                                              ^
     49|       ok: true,
     50|       config: {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 65 passed (66)
      Tests  1 failed | 1245 passed (1246)
   Start at  23:39:02
   Duration  27.36s (environment 62%, tests 15%, import 11%, setup 11%, transform 1%, worker 1%)

Environment  jsdom was created 66 times · 154.80s total, 62% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path <repo>/app
npm error workspace sui-battleship-app
npm error location <repo>/app
npm error command failed
npm error command sh -c vitest run

Conteo: 66 archivos (65 + el nuevo), 1246 tests = 1156 + N, con **N = 90** tests nuevos (todos PASS). 1245 pasan, 1 falla (ajeno, ver abajo).

#### Hallazgo (NO es de la guarda; no se toco): config.test.ts rojo por las fixtures de TASK-2a
- El test src/sui/config.test.ts "resolves the real localnet fixture" (linea 47-60) compara resolveConfig contra literales viejos (chain id 87818ef5, packageId, houseId, digest de la genesis vieja) con la fixture REAL contracts/scripts/fixtures/localnet.deployment.json, que TASK-2a recapturo (commit 051c131, `git log -1 --format=%h -- contracts/scripts/fixtures/localnet.deployment.json` = 051c131; `git diff --stat HEAD -- contracts/scripts/fixtures` vacio: no lo tocó este tramo).
- Es exactamente el caso que el handoff reserva a TASK-3 (3.2, literal copiado de la fixture que cambia con la genesis nueva), pero hoy impide un `npm test -w app` en verde. No es de mi lista "Tocar" (R-10) y no lo arregle. No hay forma ni matcher que cambiar: solo 5 literales de entrada.
- Otros archivos de app/src con los literales viejos (grep de 87818ef5 / 0x280be750 / C8teaea3): App.test.tsx, components/NetworkBadge.test.tsx, sui/transactionInfo.test.ts (pasan hoy porque no los comparan con la fixture real); config.test.ts es el unico rojo.
- Decision pedida al orquestador: (a) corregir esos literales ya (con jq, como 3.2) como parte del commit (a) o en un commit previo, o (b) aceptar que `npm test -w app` quede en 1245/1246 hasta TASK-3. Mi recomendacion: (b) para no mezclar el commit de la guarda con la adaptacion de literales, o un commit propio solo con los 5 literales de config.test.ts.

#### Test de la guarda solo (verbose; lista de URLs con su resultado)
$ cd <repo>/app && npx vitest run src/test/localnet-guard.test.ts --reporter=verbose; echo "exit=$?"   -> exit=0
Salida completa (rutas con placeholder; se omite el prefijo del archivo en cada linea):

 RUN  v5.0.5 <repo>/app

 ✓ isLoopbackUrl > keeps the default URL on the default port 5ms
 ✓ isLoopbackUrl > accepts http://127.0.0.1:9000 1ms
 ✓ isLoopbackUrl > accepts http://127.0.0.1:19000 0ms
 ✓ isLoopbackUrl > accepts http://127.0.0.1:1024 1ms
 ✓ isLoopbackUrl > accepts http://127.0.0.1:65535 1ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:1023" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:0" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:65536" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:099999" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:019000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:99999" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000:1" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:١٩٠٠٠" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:１９０００" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000/" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000/x" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000?x=1" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000#x" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000 " 0ms
 ✓ isLoopbackUrl > rejects " http://127.0.0.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000\n" 0ms
 ✓ isLoopbackUrl > rejects "https://127.0.0.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "HTTP://127.0.0.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://localhost:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.2:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://2130706433:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://0x7f.0.0.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://0.0.0.0:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://[::1]:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://192.168.1.10:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1.evil.com:19000" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:9000@evil.com" 0ms
 ✓ isLoopbackUrl > rejects "http://127.0.0.1:19000@evil.com" 0ms
 ✓ isLoopbackUrl > rejects "http://user:pw@127.0.0.1:19000" 0ms
 ✓ isLoopbackUrl > rejects "" 0ms
 ✓ isLoopbackUrl > rejects a non-string value: undefined 0ms
 ✓ isLoopbackUrl > rejects a non-string value: null 0ms
 ✓ isLoopbackUrl > rejects a non-string value: number 0ms
 ✓ isLoopbackUrl > rejects a non-string value: array with the URL (coercible) 0ms
 ✓ isLoopbackUrl > rejects a non-string value: String object (coercible) 0ms
 ✓ checkLocalnetArgs > uses the default URL without arguments 1ms
 ✓ checkLocalnetArgs > accepts --url http://127.0.0.1:9000 and returns it 0ms
 ✓ checkLocalnetArgs > accepts --url http://127.0.0.1:19000 and returns it 0ms
 ✓ checkLocalnetArgs > accepts --url http://127.0.0.1:1024 and returns it 0ms
 ✓ checkLocalnetArgs > accepts --url http://127.0.0.1:65535 and returns it 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:1023" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:0" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:65536" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:099999" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:019000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:99999" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000:1" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:١٩٠٠٠" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:１９０００" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000/" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000/x" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000?x=1" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000#x" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000 " 0ms
 ✓ checkLocalnetArgs > rejects --url " http://127.0.0.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000\n" 0ms
 ✓ checkLocalnetArgs > rejects --url "https://127.0.0.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "HTTP://127.0.0.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://localhost:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.2:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://2130706433:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://0x7f.0.0.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://0.0.0.0:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://[::1]:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://192.168.1.10:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1.evil.com:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:9000@evil.com" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://127.0.0.1:19000@evil.com" 0ms
 ✓ checkLocalnetArgs > rejects --url "http://user:pw@127.0.0.1:19000" 0ms
 ✓ checkLocalnetArgs > rejects --url "" 0ms
 ✓ checkLocalnetArgs > explains the allowed range and the default port in the rejection message 0ms
 ✓ checkLocalnetArgs > rejects --url without a value 0ms
 ✓ checkLocalnetArgs > rejects a repeated --url, even when both values are valid 0ms
 ✓ checkLocalnetArgs > rejects an unknown argument next to a valid URL 2ms
 ✓ checkLocalnetArgs > rejects an unknown argument without --url 0ms
 ✓ checkLocalnetArgs > rejects the --url=<value> form 0ms
 ✓ assertDeployment > accepts a localnet deployment whose chain id matches the node 2ms
 ✓ assertDeployment > throws when the deployment is not from localnet 1ms
 ✓ assertDeployment > throws when the node chain id differs from the deployment one 1ms

 Test Files  1 passed (1)
      Tests  90 passed (90)
   Start at  23:40:02
   Duration  2.12s (environment 80%, setup 14%, tests 3%, import 1%, worker 1%)

Desglose de los 90: isLoopbackUrl 1 (default) + 4 (aceptadas) + 33 (hostiles string) + 5 (no-string) = 43; checkLocalnetArgs 1 (sin args) + 4 (aceptadas) + 33 (hostiles con --url) + 6 (mensaje, sin valor, repetido, desconocido con URL, desconocido sin --url, forma con =) = 44; assertDeployment 3. Salida literal del reporter verbose: 90 lineas con ✓ y 0 con ×.
Cobertura de la lista del handoff (2.4.3): aceptadas 9000, 19000, 1024, 65535; hostiles 1023, :0, 65536, :099999, :019000, sin puerto, "http://127.0.0.1:", con "/", "/x", "?x=1", "#x", https, HTTP, localhost, 127.0.0.2, 127.1, 2130706433, 0x7f.0.0.1, 0.0.0.0, [::1], 192.168.1.10, 127.0.0.1.evil.com, 9000@evil.com, 19000@evil.com, user:pw@, :19000:1, espacio final, espacio inicial, salto de linea final, digitos no ASCII (dos variantes), :99999 (la regex lo acepta, lo frena el rango), cadena vacia y no-string (undefined, null, numero, ['http://127.0.0.1:19000'], new String('http://127.0.0.1:19000')); checkLocalnetArgs: sin args = LOCALNET_URL, --url sin valor, --url repetido, desconocido con URL valida, forma --url=valor; assertDeployment: red distinta, chain id distinto, coincidencia. Se omitio `// @vitest-environment node` (opcional): no hizo falta.

#### Evidencia de rechazo antes de cualquier pedido (2.4.6; sin localnet, sin sui; Node 26; todas con --url; NUNCA se corrio un capture-* sin --url)
Salida completa de las 12 corridas (cada comando se mostro con su echo del exit):

$ node app/scripts/capture-read-fixtures.mjs --url http://127.0.0.2:19000; echo "exit=$?"
capture-read-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.2:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-read-fixtures.mjs --url http://localhost:19000; echo "exit=$?"
capture-read-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-read-fixtures.mjs --url http://127.0.0.1:19000/x; echo "exit=$?"
capture-read-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:19000/x. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-read-fixtures.mjs --url http://127.0.0.1:9000@evil.com; echo "exit=$?"
capture-read-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:9000@evil.com. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-tx-fixtures.mjs --url http://127.0.0.2:19000; echo "exit=$?"
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.2:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-tx-fixtures.mjs --url http://localhost:19000; echo "exit=$?"
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-tx-fixtures.mjs --url http://127.0.0.1:19000/x; echo "exit=$?"
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:19000/x. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-tx-fixtures.mjs --url http://127.0.0.1:9000@evil.com; echo "exit=$?"
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:9000@evil.com. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-house-fixtures.mjs --url http://127.0.0.2:19000; echo "exit=$?"
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.2:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-house-fixtures.mjs --url http://localhost:19000; echo "exit=$?"
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-house-fixtures.mjs --url http://127.0.0.1:19000/x; echo "exit=$?"
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:19000/x. No se hizo ningún pedido.
exit=2
$ node app/scripts/capture-house-fixtures.mjs --url http://127.0.0.1:9000@evil.com; echo "exit=$?"
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://127.0.0.1:9000@evil.com. No se hizo ningún pedido.
exit=2

Comprobacion pura adicional (sin red ni process): $ node -e "import('./app/scripts/localnet-guard.mjs').then(m=>console.log(JSON.stringify([m.checkLocalnetArgs([]), m.checkLocalnetArgs(['--url','http://127.0.0.1:19000'])])))"
[{"ok":true,"url":"http://127.0.0.1:9000"},{"ok":true,"url":"http://127.0.0.1:19000"}]
(sin --url el valor por defecto sigue siendo http://127.0.0.1:9000; con --url http://127.0.0.1:19000 la guarda devuelve esa URL.)

#### Estado del arbol
$ git diff --stat
 app/scripts/capture-house-fixtures.mjs |  6 ++--
 app/scripts/capture-read-fixtures.mjs  |  6 ++--
 app/scripts/capture-tx-fixtures.mjs    |  6 ++--
 app/scripts/localnet-guard.mjs         | 64 ++++++++++++++++++++++++++++------
 4 files changed, 62 insertions(+), 20 deletions(-)
(mas los 2 archivos nuevos sin seguimiento: localnet-guard.d.mts 17 lineas y localnet-guard.test.ts 146 lineas)
$ git status --porcelain --untracked-files=all
 M app/scripts/capture-house-fixtures.mjs
 M app/scripts/capture-read-fixtures.mjs
 M app/scripts/capture-tx-fixtures.mjs
 M app/scripts/localnet-guard.mjs
?? app/scripts/localnet-guard.d.mts
?? app/src/test/localnet-guard.test.ts

- Contracts, scripts de contracts, Move.lock, Published.toml, deployments/testnet.json: sin cambios (no se corrieron gates de contracts en este tramo: no se toco nada de contracts/).
- Tablas de contrato (contracts/README.md) y app/src/sui/: no aplica.

### Verificacion manual
- Localnet / sui: no aplica en este tramo (ninguna genesis, ningun sui, ningun docker run).
- Guardas del directorio de config de sui en <HOME real>/.sui/ (R-2; solo stat, ls -la y sha256sum de client.yaml; nunca cat):
  * al principio, despues de escribir el reporte y al final: ver la seccion "Guardas" al pie (valores identicos a la linea base).
- Docker: 5 contenedores y 17 imagenes antes y despues. du -s <HOME real>/.move = 170748 antes y despues.

### Desviaciones del handoff (o "ninguna")
- Ninguna de diseno. Detalles menores:
  1. El JSDoc de las dos funciones nuevas lleva la linea de sincronia (N-7) tal como pide 2.4.1; assertLocalnetUrl conserva su JSDoc.
  2. Se omitio `// @vitest-environment node` (opcional).
  3. Tests de este tramo con nombres en ingles y valores de chain id de prueba tomados de la genesis G-A de 2a (cb1e492c) para assertDeployment; son literales propios del test, no leidos de ninguna fixture.

### Riesgos / pendientes
- config.test.ts rojo por las fixtures recapturadas en 2a (ver Hallazgo): decision del orquestador. Sin ella, `npm test -w app` queda en 1245/1246 (66 archivos).
- networks.ts:11 sigue fijo en 9000 (fuera de alcance, ya anotado en el handoff).
- El puerto 9000 sigue ocupado por un servicio de otro proyecto del host (no se toca): por eso ninguna captura se corrio sin --url en este tramo.

### STOPs levantados
Ninguno (S-1..S-10). S-10 no aplica: lint 0 y typecheck 0 con la estructura de 2.4, el .d.mts resuelve, no existia test previo de la guarda y ningun capture-* usa el puerto por otro camino que la url devuelta por assertLocalnetUrl (el chequeo del handoff, sin cambios en codigo de los scripts).

### Seguridad (R-6)
Greps sobre las lineas + del diff tracked (git diff -U0) mas el contenido completo de los 2 archivos nuevos (todas sus lineas son +; 225 lineas en total) y sobre este reporte, con /usr/bin/grep -nE y los cuatro patrones del handoff en orden:
- Patron 1 (40-64 hex) sobre el diff: 0 coincidencias. Patron 2 (0x + 8 o mas hex) sobre el diff: 0. Patron 3 (claves, frases, rutas personales) sobre el diff: 0. Patron 4 (hash abreviado con puntos suspensivos) sobre el diff: 0.
- Sobre este reporte: patron 3 = 0, patron 4 = 0. Patron 1 y 2: las unicas coincidencias son IDs/digests publicos de la genesis desechable de 2a pegados del output de vitest (houseId, packageId, originalPackageId, de la fixture de 2a, y los 3 equivalentes viejos) = IDs de objetos y paquetes publicos, sin direcciones de cuenta. El digest de publicacion es un digest base58 publico.
- Ninguna direccion de cuenta, clave ni ruta personal; rutas con placeholders <repo>, <HOME real>. No se nombra ningun contenedor ni proyecto ajeno.

### R-12 (reporte escrito solo con Write; sin heredoc, sed -i, printf ni echo para este texto)
Verificaciones sobre este borrador y guardas: ver "Guardas" a continuacion.

### Guardas (valores medidos)
- Al principio (antes de tocar nada): client.yaml mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes; ls -la del directorio de config: solo client.yaml (con . y ..); sha256sum de client.yaml: primeros 12 hex ef12fd09615f (igual que la linea base de 2a). du -s <HOME real>/.move = 170748. Docker: 5 y 17.
- Despues del diff y de las capturas de rechazo: mismos valores (mtime, 244 bytes, solo client.yaml, ef12fd09615f; .move 170748; Docker 5/17; 0 procesos de red sui).
- Despues de escribir este reporte (y de sus ultimas ediciones) y al final: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, ls -la solo client.yaml, sha256 (12 hex) ef12fd09615f, .move 170748, Docker 5/17, 0 procesos sui; identicos a la linea base.
- R-12 sobre este borrador: el conteo de la frase de shell de comando inexistente (la del handoff 2.12.3) = 0, medido sobre la version final; la busqueda de trazas de ejecucion accidental (los tres patrones del handoff) = sin coincidencias. Greps R-6 sobre el reporte: patron 3 = 0 y patron 4 = 0; patron 1 y 2 solo coinciden en los IDs publicos de la genesis de 2a (lineas del diff de vitest y la mencion de 0x280be750).

### Documentacion
- READMEs / agents.md: no aplica en este tramo (TASK-4 documenta la guarda y el puerto).
- Snippet propuesto para STATUS (para TASK-4/3): guarda de puerto de las capturas (isLoopbackUrl/checkLocalnetArgs, puerto 1024-65535 solo loopback, por defecto 9000), 90 tests nuevos, app = 1156 + 90 en 66 archivos (con config.test.ts a corregir en TASK-3 3.2).

~~~~


---

## 7. TASK-2b, tramo 1 (revisión del MID)

> MID, TASK-2b, tramo 1.

## Revisión TASK-2b (tramo 1, guarda): PASA, con la condición de la decisión B (paso 2.4.8, commit a0 antes del a)

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` (323 líneas) y del diff real sin commitear de `<repo>` (HEAD `eeb34de`): modificados `app/scripts/localnet-guard.mjs` y los tres `app/scripts/capture-*-fixtures.mjs` (solo comentarios de ayuda); nuevos `app/scripts/localnet-guard.d.mts` y `app/src/test/localnet-guard.test.ts`. No se ejecutó ningún gate ni `sui`/`suiup`; esta revisión se escribió con la herramienta de archivos (R-12).

### Veredicto en una línea
La guarda implementa exactamente lo aprobado por el MAYOR y el DEV siguió 2.4.1-2.4.6 y se detuvo en el punto de control. Lint 0, typecheck 0, 90 tests nuevos PASS y 12 corridas de rechazo con exit 2. El único rojo de `npm test -w app` (1245/1246) **no es de la guarda**: lo dejó la recaptura de fixtures de TASK-2a; se corrige con un paso previo mínimo (decisión B).

### Checklist

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Se siguió 2.4.1-2.4.6 y el DEV se detuvo, sin génesis ni `sui` | OK | Reporte `:3`, `:287` ("ninguna génesis, ningún `sui`, ningún `docker run`"); `:3` "el DEV se detiene aquí". El diff contiene solo los archivos de 2.4 y ningún texto de versión 1.83 → 1.84 (es de 2.5). |
| 2 | Implementación de la guarda | OK | `localnet-guard.mjs`: `LOCALNET_URL` intacto (`:9`); regex anclada `^http://127\.0\.0\.1:([1-9][0-9]{3,4})$` (`:14`) + `typeof` + rango 1024-65535 (`isLoopbackUrl`); `checkLocalnetArgs` pura con la lógica anterior (`--url` opcional, repetido, `--url=` y desconocidos rechazados); `assertLocalnetUrl` con la misma firma, `process.exit(2)` y "No se hizo ningún pedido." antes de cualquier pedido; `assertDeployment` sin cambios (2ª barrera); líneas de sincronía en el JSDoc de las dos funciones nuevas y en la cabecera del `.d.mts` (N-7). Revisé el código completo. |
| 3 | `.d.mts` y test | OK | Cinco exportaciones tipadas; el test (146 líneas, 90 tests: `isLoopbackUrl` 43, `checkLocalnetArgs` 44, `assertDeployment` 3) cubre la lista aceptada y la hostil del handoff, incluidos `:99999`, los dos conjuntos de dígitos no ASCII, `http://127.0.0.1:19000\n`, los no-`string` coercibles (`['…']` y `new String('…')`) y `--url=`/repetido/sin valor. Se omitió `// @vitest-environment node` (opcional, N-5). |
| 4 | Gates | OK para la guarda; 1 rojo ajeno | Lint exit 0 (el primer intento dio 1 warning por un `eslint-disable` innecesario de un borrador; se quitó y se repitió, bien declarado); typecheck exit 0 (el `.d.mts` resuelve, S-10 no aplica); `npm test -w app`: 66 archivos, **1246 tests = 1156 + 90, 1245 PASS y 1 FAIL** (`config.test.ts`). |
| 5 | Evidencia de rechazo | OK | 12 corridas (3 scripts × `http://127.0.0.2:19000`, `http://localhost:19000`, `http://127.0.0.1:19000/x`, `http://127.0.0.1:9000@evil.com`), todas `exit=2` con el mensaje y "No se hizo ningún pedido."; **ninguna captura sin `--url`**. La comprobación pura adicional confirma que sin `--url` el valor por defecto sigue siendo `http://127.0.0.1:9000` y que con `--url http://127.0.0.1:19000` devuelve esa URL. |
| 6 | R-12 | OK | Reporte escrito con la herramienta de escritura (declarado); guarda de `~/.sui` al principio, después del diff y de las capturas de rechazo, después de escribir el reporte y al final: mismo mtime (2026-10-30), 244 bytes, solo `client.yaml`, mismo sha256 (12 hex); `~/.move` 170748 KB y Docker 5/17 sin cambios; 0 procesos `sui`; conteo de "command not found" en 0 y búsqueda de rastros de ejecución accidental sin coincidencias. Coincide con lo que verificó el orquestador. |
| 7 | Plantilla, desviaciones, STOPs | OK | Plantilla completa; desviaciones menores bien declaradas (sin `// @vitest-environment node`, nombres de tests en inglés, chain id de prueba de G-A en `assertDeployment`); STOPs "ninguno" (S-10 no aplica). R-6: 0 en los cuatro patrones sobre el diff y sin nombrar el servicio ajeno. |

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| H-1 | 🟠 MAJOR (de orden, no de la guarda) | PROY-18/19 (gate completo en verde), LIM-9 (cero delta) | `app/src/sui/config.test.ts:47-60` (+ fixture `contracts/scripts/fixtures/localnet.deployment.json`, commit `051c131`) | Un test de `app` compara con literales de la génesis vieja y lee la fixture real que TASK-2a ya recapturó: **rojo desde `051c131`**. El commit de 2a dejó `app` en rojo porque el handoff dejó el ajuste para TASK-3 3.2; ningún commit posterior del PR quedaría en verde. | Corregir los 5 literales ahora (paso 2.4.8, commit a0): ver la decisión. |
| H-2 | 🔵 NIT | LIM-7 | `capture-read-fixtures.mjs:6-8` | Tras el cambio de comentario, la línea sobre el chain id supera las 120 columnas (el lint no lo exige). | Opcional: reflujar el comentario. Sin acción obligatoria. |
| H-3 | 🔵 NIT | PROY-19 | reporte `:224`, `:263` | Las 12 corridas se muestran con su `echo "exit=$?"`; la comprobación adicional usa `node -e` con un `import()`. Es correcto (sin red ni `process.exit`); solo se deja constancia. | Ninguna. |

No hay BLOCKER ni MINOR. H-1 es de **orden del handoff** (el handoff v1.2 reservó este arreglo a TASK-3); no se lo atribuyo al DEV de este tramo, que lo encontró, lo aisló y lo declaró bien.

### Decisión: B (corregirlo ya, en un commit propio a0 antes del a)

**Recomendación: B.** Los cinco literales de `config.test.ts` se corrigen en este tramo (paso nuevo 2.4.8, v1.3.2), con las reglas de TASK-3 3.2, y se commitean como **(a0)**, antes del **(a)** de la guarda.

Razones:
1. **Bisectabilidad y la CI del head no bastan.** `app` está rojo desde `051c131` (la recaptura de 2a), y es un rojo determinista, ya conocido y de 5 literales de entrada. Con A, los commits (a) y (b) de 2b, y las mediciones del MID, quedarían sobre un árbol con 1 test rojo; el DoD de 2.4.5 ("`npm test -w app` = 1156 + N") y el conteo de TASK-3 no se pueden verificar contra "todo verde" sino contra "todo verde salvo uno". Eso resta valor a la evidencia y nos acostumbra a un rojo "conocido" que no figura en STATUS (PROY-19).
2. **El arreglo es mínimo, determinista y no depende de nada de lo que falta.** Solo lee `contracts/scripts/fixtures/localnet.deployment.json`, que 2a ya dejó definitiva; no depende de la recaptura de `contracts/fixtures/*.localnet.json` de 2b. No hay que esperar a nada para hacerlo bien.
3. **No contradice el handoff, lo adelanta.** TASK-3 3.2 ya regula exactamente este caso (literal copiado de la fixture, valores por `jq`, tabla ruta → viejo → nuevo, sin tocar matchers); solo se mueve de TASK-3 a 2b porque la causa nació en 2a. Los rojos que provoque la recaptura de `contracts/fixtures/*.localnet.json` de 2b, que se descubren recién al correr `app` después de 2.5-2.8, siguen siendo de TASK-3 3.2 (que no cambia).
4. **Commit propio, separado.** No se mezcla con la guarda (el reporte del DEV lo recomendaba así) y los archivos son disjuntos: sin staging por hunk, el orquestador puede commitear (a0) y (a) sin problema.
5. **Por qué no C.** Reescribir la historia (un `fixup` sobre `051c131`) no es viable (los commits ya existen y el flujo es sin rebase), y no hay una variante intermedia mejor.

Alcance acotado de 2.4.8: solo `config.test.ts:53-57` (`chainId`, `packageId`, `originalPackageId`, `houseId`, `publishTxDigest`; los dos IDs de paquete son el mismo valor). Los otros tres archivos con la génesis vieja (`App.test.tsx:32`, `NetworkBadge.test.tsx:59-60`, `transactionInfo.test.ts:8`) **no se tocan**: no leen la fixture real, pasan y sus literales son muestras propias de cada test. Tras el arreglo se espera **1246 PASS en 66 archivos**.

**Redacción mínima aplicada (handoff v1.3.2, mismo archivo):** encabezado v1.3.2 y tabla "Cambios de v1.3.1 a v1.3.2"; **TASK-2b 2.4.8** (nuevo, tras 2.4.7), frase de orden de commits en 2.4.7, "Tocar" de 2b, un ítem de DoD y el commit (a0) en "Commits propuestos"; **TASK-3 3.2** con un paréntesis que dice que `config.test.ts` ya se corrigió en 2.4.8. Ningún otro cambio.

### Siguiente paso
1. **El DEV hace 2.4.8** (corrección de los 5 literales con `jq`, tabla ruta/viejo/nuevo, lint, typecheck y `npm test -w app` = 1246 PASS) y entrega el anexo `REPORTE_TOOLCHAIN_142_TASK-2b-guarda-anexo.txt`, con las guardas R-2 y R-12 como siempre.
2. El MID revisa el anexo (rápido) y el orquestador commitea **(a0)** (solo `config.test.ts`) y luego **(a)** (la guarda, el `.d.mts`, el test y los comentarios de ayuda).
3. Recién entonces el DEV sigue con 2.5-2.8 (`RPC_URL=http://127.0.0.1:19000`, una génesis a la vez, G-B cerrada antes de G-C).

### Mensaje de commit (a) propuesto (solo `Refs #75`; el orquestador agrega el trailer)

```
app: let the localnet capture guard accept any loopback port (#75)

The capture scripts only accepted http://127.0.0.1:9000, but on this host
that port is taken by a service of another project, so the isolated localnet
has to run on another port. assertLocalnetUrl now accepts exactly
http://127.0.0.1:<port>: an anchored match (^http://127\.0\.0\.1:([1-9][0-9]{3,4})$),
a string-only check and an integer port from 1024 to 65535, with no
hostnames, no https, no credentials and no path, query or fragment. Everything
else is still rejected with exit code 2 before any request, and without --url
the default stays http://127.0.0.1:9000. The checks are two pure functions,
isLoopbackUrl and checkLocalnetArgs; assertDeployment is unchanged and stays
as the second barrier (the node chain id must be the one in
contracts/deployments/localnet.json). A new test with 90 cases (accepted
ports, a list of hostile URLs and non-string values, the argument rules and
assertDeployment) is typed through a small localnet-guard.d.mts. Only help
comments change in the three capture scripts. Refs #75
```

### Mensaje de commit (a0) propuesto (por si el orquestador lo quiere tal cual)

```
test: update the localnet fixture literals of config.test.ts after the 1.84.0 script fixture recapture (#75)

config.test.ts compares resolveConfig with the real
contracts/scripts/fixtures/localnet.deployment.json, which the previous
fixture commit recaptured on a new genesis. The five expected literals (chain
id, package, original package, house and publish digest) are read from the
fixture with jq; no matcher, assertion or formula changes. Refs #75
```

### §R-6 sobre esta revisión (`/usr/bin/grep`)
Resultado en el mensaje de entrega: sin direcciones de cuenta, sin rutas personales, sin nombrar el servicio ajeno; los únicos hashes largos serían SHAs públicos (ninguno completo en este archivo; la regex del mensaje (a) lleva texto de patrón, no hex).



---

## 8. TASK-2b, anexo 2.4.8 (reporte del DEV)

> DEV, anexo 2.4.8: cinco literales de config.test.ts.

~~~~text
## Anexo del tramo 1 de TASK-2b: paso 2.4.8 (ajuste previo de config.test.ts, commit (a0))

Branch feature/issue-75-toolchain-1840 @ cabedf8 (handoff v1.3.2). Worktree <repo> = Battleship-issue75. Sin git add ni commit. Los archivos del tramo 1 (guarda, .d.mts, test de la guarda, comentarios de los tres capture-*) no se tocaron en este paso. No se uso sui, no se abrio ninguna genesis.

### Archivo modificado en este paso
- app/src/sui/config.test.ts: SOLO 5 literales de entrada del test "resolves the real localnet fixture" (lineas 53-57). Ningun matcher (sigue siendo toEqual), ninguna aserción borrada ni relajada, ninguna formula tocada. `git diff --stat -- app/src/sui/config.test.ts`: 1 file changed, 5 insertions(+), 5 deletions(-).
- No se tocaron App.test.tsx, components/NetworkBadge.test.tsx ni sui/transactionInfo.test.ts (siguen con la genesis vieja: no leen la fixture real y pasan).

### Causa (diagnostico)
El test lee la fixture real contracts/scripts/fixtures/localnet.deployment.json (via import.meta.glob, config.test.ts:4-8), que TASK-2a recaptura (commit 051c131), y compara con literales copiados de la fixture de la genesis vieja. Es un literal copiado de la fixture que cambio porque la genesis es otra (caso de TASK-3 3.2); la forma no cambio. Nada de S-9.

### Valores nuevos por jq (comando tal como se corrio y salida)
$ cd <repo> && jq -r '[.chainId,.packageId,.originalPackageId,.houseId,.publishTxDigest] | @tsv' contracts/scripts/fixtures/localnet.deployment.json
cb1e492c	0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d	0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d	0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035	BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH
(la misma consulta, un valor por linea, con `jq -r '[.chainId, .packageId, .originalPackageId, .houseId, .publishTxDigest] | .[]'`, dio los mismos 5 valores en este orden; packageId = originalPackageId)

### Tabla ruta -> valor viejo -> valor nuevo (config.test.ts, objeto esperado config)
| Linea | Clave (ruta en la fixture) | Valor viejo | Valor nuevo |
|---|---|---|---|
| 53 | chainId (.chainId) | 87818ef5 | cb1e492c |
| 54 | packageId (.packageId) | 0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e | 0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d |
| 55 | originalPackageId (.originalPackageId) | 0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e | 0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d |
| 56 | houseId (.houseId) | 0xbcbcb0392aad3b13aeb43a007105a1467f4d33a3f40b28aff08f72f4c4da0930 | 0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035 |
| 57 | publishTxDigest (.publishTxDigest) | C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz | BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH |
Sin cambios en ese objeto: network 'localnet', grpcUrl 'http://127.0.0.1:9000' (es de networks.ts, no de la fixture), burnerWalletEnabled false.

Diff exacto (git diff -U0 -- app/src/sui/config.test.ts):
@@ -53,5 +53,5 @@ describe('resolveConfig: valid deployments', () => {
-        chainId: '87818ef5',
-        packageId: '0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e',
-        originalPackageId: '0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e',
-        houseId: '0xbcbcb0392aad3b13aeb43a007105a1467f4d33a3f40b28aff08f72f4c4da0930',
-        publishTxDigest: 'C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz',
+        chainId: 'cb1e492c',
+        packageId: '0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d',
+        originalPackageId: '0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d',
+        houseId: '0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035',
+        publishTxDigest: 'BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH',

### Gates (Node: export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version -> v26.13.0)
$ cd <repo> && npm run lint -w app; echo "lint exit=$?"
lint exit=0

> lint
> eslint . --max-warnings 0

$ cd <repo> && npm run typecheck -w app; echo "typecheck exit=$?"
typecheck exit=0

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

$ cd <repo> && npm test -w app; echo "test exit=$?"
test exit=0

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  66 passed (66)
      Tests  1246 passed (1246)
   Start at  23:46:25
   Duration  26.30s (environment 63%, tests 15%, import 10%, setup 10%, transform 1%, worker 1%)

Environment  jsdom was created 66 times · 154.28s total, 63% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

Resultado: 66 archivos, 1246 tests = 1156 + 90, 0 rojos (el rojo del tramo 1 desaparecio).

### Estado del arbol
$ git diff --stat
 app/scripts/capture-house-fixtures.mjs |  6 ++--
 app/scripts/capture-read-fixtures.mjs  |  6 ++--
 app/scripts/capture-tx-fixtures.mjs    |  6 ++--
 app/scripts/localnet-guard.mjs         | 64 ++++++++++++++++++++++++++++------
 app/src/sui/config.test.ts             | 10 +++---
 5 files changed, 67 insertions(+), 25 deletions(-)
$ git status --porcelain --untracked-files=all
 M app/scripts/capture-house-fixtures.mjs
 M app/scripts/capture-read-fixtures.mjs
 M app/scripts/capture-tx-fixtures.mjs
 M app/scripts/localnet-guard.mjs
 M app/src/sui/config.test.ts
?? app/scripts/localnet-guard.d.mts
?? app/src/test/localnet-guard.test.ts
Solo los archivos del tramo 1 mas app/src/sui/config.test.ts. Para el commit (a0): solo app/src/sui/config.test.ts (archivos disjuntos de los de (a)).

Literales viejos que quedan en app/src (no se tocan, por instruccion): App.test.tsx:32 (chainId), components/NetworkBadge.test.tsx:59-60 (chain ids de un caso de red equivocada), sui/transactionInfo.test.ts:8 (DIGEST). No leen la fixture real: pasan.

### Guardas y R-12
- ~/.sui (R-2; solo stat, ls -la y sha256sum de client.yaml): al inicio de este paso: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, ls -la solo client.yaml, sha256 (12 hex) ef12fd09615f; Docker 5/17; du -s <HOME real>/.move = 170748; 0 procesos sui. Tras escribir este anexo (y sus ediciones) y al final: mismos valores (mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, solo client.yaml, sha256 ef12fd09615f; .move 170748; Docker 5/17; 0 procesos sui). Sobre el anexo: el conteo de la frase de shell de comando inexistente = 0 y la busqueda de trazas de ejecucion accidental = 0 (version final).
- Este anexo se escribio solo con la herramienta de escribir archivos (sin heredoc, sed -i, printf ni echo).

### Desviaciones del handoff
Ninguna.

### Riesgos / pendientes
Ninguno nuevo. Quedan los de siempre: networks.ts:11 en 9000; el puerto 9000 del host lo ocupa un servicio de otro proyecto (no se toca).

### STOPs levantados
Ninguno (S-1..S-10). S-9 no aplica: la causa es un literal copiado de la fixture y se corrigio sin tocar matchers, aserciones ni formulas.

### Seguridad (R-6)
Greps sobre las lineas + del diff de este paso (git diff -U0 -- app/src/sui/config.test.ts, 5 lineas) y sobre este anexo:
- Diff: patron 1 (40-64 hex) = 3 lineas (packageId, originalPackageId, houseId) = IDs publicos de objetos/paquete de la genesis desechable de 2a; patron 2 (0x + 8 o mas hex) = las mismas 3; patron 3 = 0; patron 4 = 0. El chainId (8 hex) y el digest base58 son publicos.
- Anexo: patron 3 = 0 y patron 4 = 0; patrones 1 y 2: solo los IDs publicos de la tabla y del diff (genesis vieja y nueva de 2a). Ninguna direccion de cuenta, clave ni ruta personal (placeholders <repo>, <HOME real>).

~~~~


---

## 9. TASK-2b, anexo 2.4.8 (revisión del MID)

> MID, anexo 2.4.8 (respuesta breve, transcrita).

## Revisión 2.4.8: PASA

Diff real de `app/src/sui/config.test.ts`: 5 líneas `+` y 5 `-`, solo literales (`chainId`, `packageId` y `originalPackageId`, `houseId`, `publishTxDigest`), con los valores nuevos iguales a `jq` sobre `contracts/scripts/fixtures/localnet.deployment.json`; `toEqual` y el resto del objeto sin cambios. Lint 0, typecheck 0, `npm test -w app` = 66 archivos, 1246 PASS (1156 + 90), 0 rojos. Guardas de `~/.sui` idénticas, Docker 5/17, sin procesos `sui`; R-12 cumplida. Se commitean (a0) = solo `config.test.ts` y luego (a) = la guarda.



---

## 10. TASK-2b, tramo 2 (reporte del DEV)

> DEV, TASK-2b, pasos 2.5-2.8: fixtures de la app en dos génesis.

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 v1.3.2 - TASK-2b, segundo tramo (pasos 2.5 a 2.8)

Redactado solo con la herramienta de escribir archivos (R-12). Sin commits ni git add. El DEV se detiene aqui.

### Branch (con SHA corto del HEAD)
feature/issue-75-toolchain-1840 @ 5f897a2 (worktree <repo> = Battleship-issue75); arbol limpio al empezar (guarda 2.4 ya commiteada en (a), config.test.ts en (a0)).

### Archivos modificados
- app/scripts/capture-tx-fixtures.mjs (lineas 280 y 301: solo el texto de version "1.83" -> "1.84").
- app/scripts/capture-house-fixtures.mjs (linea 272: solo el texto de version "1.83" -> "1.84").
- contracts/fixtures/game-reads.localnet.json, game-tx.localnet.json, house-admin.localnet.json (los escribieron los scripts de captura, sin edicion a mano).
No se toco nada mas: ni la guarda, ni contracts/scripts, ni contracts/scripts/fixtures, ni app/src, ni docs, ni Move.lock, Published.toml, deployments/testnet.json, ci.yml.

### Que se implemento
1. 2.5: textos de version 1.83 -> 1.84 en 2 scripts (3 lineas).
2. 2.6 / 2.7: dos genesis aisladas, una a la vez, en el puerto 19000 (G-B: lecturas y transacciones; G-C: panel de la House); las tres fixtures recapturadas con la CLI 1.84.0, cada captura corrida DOS veces (determinismo: solo capturedAt).
3. 2.8: comparacion de forma y de valores de las tres fixtures (forma igual salvo una alternativa de oneof de datos en game-reads), gas identico, cierre de ambas genesis y de cada una la guarda del directorio de config de la CLI.

### Desviacion autorizada por el owner: puerto 19000 (igual que en el tramo 2a)
Un servicio de otro proyecto del host ocupa el 9000/tcp (no se toca). Todas las llamadas usaron RPC_URL=http://127.0.0.1:19000: smoke_guard exige que el RPC del env activo sea exactamente ese (si no, GUARD-FAIL; nunca hubo ninguno), y cada captura va con --url "$RPC_URL". NUNCA se corrio un capture-* sin --url. Referencias: REPORTE_TOOLCHAIN_142_SONDA_PUERTO.txt y la seccion del reporte de 2a. Orden en cada genesis: ss -ltn (19000 libre) -> genesis (sin suic) -> start con el flag y smoke_guard_pre -> recien despues smoke_guard, suic, publish.mjs y los scripts.

### Verificacion manual (localnet aislada, puerto 19000)

#### Linea de partida (antes de tocar nada)
- git log: 5f897a2 (HEAD), 842c811 (a0), cabedf8; git status --porcelain --untracked-files=all: 0 entradas.
- stat -c '%y %s %n' del client.yaml de la config de la CLI en <HOME real>/.sui/ -> 2026-10-30 17:52:52.515735237 -0500 244 ; ls -la del directorio de config: solo client.yaml; sha256sum (12 hex) ef12fd09615f. du -s <HOME real>/.move = 170748. docker ps -aq = 5, docker images -aq = 17.
- ss -ltn | grep -c ':19000 ' = 0 (libre). ss -ltn | grep ':9000 ': 2 lineas LISTEN (0.0.0.0:9000 y [::]:9000, el servicio ajeno; antes y despues de las dos genesis igual).

#### 2.5 (comandos y resultado)
Ediciones con la herramienta de edicion, texto "CLI 1.83" -> "CLI 1.84" en capture-tx-fixtures.mjs:280 y :301 y "Transacciones por CLI 1.83" -> "... 1.84" en capture-house-fixtures.mjs:272. `grep -n "1\.83" app/scripts/capture-*.mjs app/scripts/localnet-guard.mjs` antes: exactamente esas 3 lineas.

#### env.sh de las dos genesis (rutas literales; aqui con placeholders)
  SMOKE_DIR=<scratchpad>/smoke-2b-GB (G-B) y <scratchpad>/smoke-2b-GC (G-C) ; SUI=<HOME real>/.local/bin/sui ; NODE=<HOME real>/.nvm/versions/node/v26.13.0/bin/node ; RPC_URL=http://127.0.0.1:19000
  export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
  smoke_guard_pre() { [ -f "$SUI_CONFIG_DIR/client.yaml" ] && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] || { echo GUARD-FAIL; return 97; }; }
  smoke_guard()     { smoke_guard_pre || return 97; [ "$(printf 'n\n' | "$SUI" client --json envs | jq -r '.[1] as $a | .[0][] | select(.alias==$a) | .rpc')" = "$RPC_URL" ] || { echo GUARD-FAIL; return 97; }; }
  suic() { printf 'n\n' | "$SUI" client "$@"; } ; act_as() { suic switch --address "$1" > /dev/null; }
  (escritos con la herramienta de escribir archivos). ids.env (solo ADMIN, A, B, C, PKG, HOUSE, HOUSE_CAP e IDs de partidas) y fn.sh (helpers que nunca imprimen direcciones de cuenta) tambien dentro de <SMOKE_DIR>. Cuentas: ADMIN = addresses[0], A = [1], B = [2], C = [3] de `suic --json addresses`, nunca impresas.

#### G-B (2.6): chain id corto 94e0f49c
- Genesis: `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "genesis exit=$?"` -> genesis exit=0 ; `ss -ltn | grep -c ':19000 '` -> 0.
- Arranque (run_in_background, con exec): `. <SMOKE_DIR>/env.sh && smoke_guard_pre && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000 > "$SMOKE_DIR/sui-start.log" 2>&1`
- Comprobacion: `for i in $(seq 1 40); do if ss -ltn | grep -q ':19000 ' && (. <SMOKE_DIR>/env.sh && smoke_guard >/dev/null 2>&1); then echo "ready after $i"; break; fi; sleep 2; done; . <SMOKE_DIR>/env.sh && smoke_guard && echo "smoke_guard OK" && suic --json envs | tr -d '\n ' ; echo; suic --json chain-identifier; kill -0 "$(cat <SMOKE_DIR>/sui.pid)" && echo alive`
    ready after 1 ; smoke_guard OK
    [[{"alias":"localnet","rpc":"http://127.0.0.1:19000","ws":null,"basic_auth":null},{"alias":"devnet","rpc":"https://fullnode.devnet.sui.io:443","ws":null,"basic_auth":null}],"localnet"]
    { "base58": "<base58 de la genesis desechable>", "hex": "94e0f49c" } ; alive
- Publicacion variante B (sin --out): `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" > "$SMOKE_DIR/publishB.out" 2> "$SMOKE_DIR/publishB.err"; echo "variante B exit=$?"; wc -c < "$SMOKE_DIR/publishB.err"; ...; git diff --exit-code -- Move.lock; echo "lock=$?"`
    variante B exit=0 ; stderr 0 bytes (sin aviso de CLI) ; lock=0 ; stdout (IDs publicos de la genesis desechable):
      Despliegue escrito en <repo>/contracts/deployments/localnet.json:
        schemaVersion: 1 / network: localnet / chainId: 94e0f49c
        packageId = originalPackageId: 0x2112999b1e8f2909f3e0bfd2eff929b22f67955f4f5e3b4d26639330767d7f00 / packageVersion: 1
        upgradeCapId: 0x46bd2e16106655adb6427fd4c45eef4840a0dd39360f748af888c8a1161d288b
        houseId: 0xa1802db23aa7b925bc170c2dccff09a1be0126dd3ef71423185a2647e164ff3c
        houseCapId: 0x7df2567930ac38eff1e8082aaed6e2ef79da4d8d62f03e04f93c13c265b0788b
        publishTxDigest: DPZ31ESoFmDsSXuHB4dd1QyRND1HfU8rAuCyoGCrC6dz / publishTimestamp: 2026-11-20T04:49:57.927Z
        sourceCommit: null / suiCliVersion: 1.84.0-9dc25070cf2e / frameworkRev: e6f43880f4b65e2c1f0397583a9690b4b22c9223
      Directorio temporal con la salida cruda: <SMOKE_DIR>/tmp/battleship-publish-85ZV4D (bórralo cuando termines)
  `cd <repo>/contracts && export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node scripts/publish.mjs check; echo "check exit=$?"` -> "2 despliegue(s) válidos y coherentes con Published.toml" ; check exit=0.
- Transacciones de la receta (contracts/README.md:486-499), todas con `act_as <rol>` previo y `suic` bajo el prefijo; columnas: digest | status | gas (computo/storage/rebate):
    1  ADMIN update_fee_rate 250 (suic call ... --args "$HOUSE" "$HOUSE_CAP" 250 --json) | 5WGwz84zXptKh4PQiovYjhi34rWEqsddVC1wbPEu4M6E | success | 1000000/3807600/3807219
    2.1 A crea G_OPEN abierta 1000001 (PRIMERA tx de A; suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::create_game" @"$HOUSE" c.0 none --json) | 5fU47FrZEgyJ3Wq2NHDu77zphcpCy5bpRfG4tJVfEwD1 | success | 1000000/2941200/0
    2.2 A crea G_INV invitando a B 2000002 (... c.0 "some(@$B)") | 4LRkmW2tuxRWYVRMbXyjbQwKaCw2EJb1jC9DFi99oKvD | success | 1000000/3184400/987901
    3a  A crea G_CANCEL abierta 3000003 | J6n8qJm9WPVsc8W9SJx4jyr5PnWyMfArWKutSskcU7tq | success | 1000000/2941200/987901
    3b  A cancela G_CANCEL (suic call --package "$PKG" --module game --function cancel_game --args "$G_CANCEL" --json) | 6wpg2BLZdb6Jj9LrmcDzRkqGePD4CVMYG62hxadxxGFS | success | 1000000/3929200/2940906
    3c  A crea G_REJ invitando a B 4000004 | 5GXuCrWFkjZZn5eb65wGNQWF23q9gARTq3zeenr8ZmDQ | success | 1000000/3184400/1975802
    3d  B rechaza G_REJ (reject_game) | HKyQyQn6L8EpDwVcGwbd4SeVBj63QxVuPJ5XSNYxd4c4 | success | 1000000/4172400/2196180
    4   B cancel_game sobre G_OPEN con --gas-budget 100000000 | 4Etu7qc8jR5S3Gth5amMrPVn2MTKY6YX67kxREXA5QdA | fallo ejecutado game/3. CLI (exit=1): "Error executing transaction '4Etu7qc8jR5S3Gth5amMrPVn2MTKY6YX67kxREXA5QdA': 1st command aborted within function '0x<id>::game::cancel_game' at instruction 16 with code 3"
    5.1 A crea G_ACC1 1000001 | 9rLhV29YatZtuRckzmjfbNQVHPs54BuqqwPFVmGa1e8G | success | 1000000/2941200/1975802
    5.1 B acepta G_ACC1 (suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @"$G" @"$HOUSE" c.0 @0x8 --json; Random 0x8 es el ultimo MoveCall) | 42ca3XRw3Xh5C2gskhRUcHuRNVab6URymVK7bGqx2iSH | success | 1000000/5943200/4468353 | pot 2000002, fee 50000, payout 1950002, gana el ACEPTANTE
    5.2 A crea G_ACC2 | 2poPbfm1pAFR9d3R6GGjWiRxNUALcQQSNqc2LuaS4Z8n | success | 1000000/2941200/987901
    5.2 B acepta G_ACC2 | GTgM2iUBTbdo6Dd6Fz8jwWU3jCqZqPnvvGMbZN2Txw2e | success | 1000000/5943200/5456254 | gana el ACEPTANTE
    5.3 A crea G_ACC3 | AbQw6RUjkt66pWGJzgo68MtA1pqACUvifQSn6bp7x1i8 | success | 1000000/2941200/987901
    5.3 B acepta G_ACC3 | CoRDyKnVTS8Jk1dVmqGLBy2bxB4BtWHwA9JCwanLESrE | success | 1000000/5943200/5456254 | gana el CREADOR  -> ambos ganadores tras 3 aceptaciones (tope 8)
    6   A crea G_ACCINV invitando a B 1000001 | 5CZMuQVMgRXENq5P6rNNLKLEeFFjTm2SM4okv82vXY5m | success | 1000000/3184400/1975802
    6   B acepta G_ACCINV | FWgpybz5tgrzzsAEmuZnCJN2RFrRGum463hA7qBLBN1j | success | 1000000/6186400/4711529 | gana el aceptante
    7   C acepta G_ACC1 (ya resuelta) con --gas-budget 100000000 | HeZWwutNgoHrqDGoXkzcV4db3hFAPJvWJTu1VzjTLHxx | fallo ejecutado game/4. CLI (exit=1): "Error executing transaction 'HeZWwutNgoHrqDGoXkzcV4db3hFAPJvWJTu1VzjTLHxx': 2nd command aborted within function '0x<id>::game::assert_acceptable' at instruction 75 with code 4"
  (el bucle de G_ACC se detuvo en cuanto hubo un ganador creador y uno aceptante; la moneda es aleatoria: el numero de aceptaciones varia entre genesis, ver "Valores no derivados".)
- Capturas (cada una con --url "$RPC_URL" = http://127.0.0.1:19000; `. <SMOKE_DIR>/env.sh && smoke_guard && cd <repo> && F=contracts/fixtures && "$NODE" app/scripts/capture-<x>-fixtures.mjs --url "$RPC_URL"; echo "exit=$?"; cp ...; ...; diff run1 run2`):
    capture-read run 1 y run 2 (salida identica):
      nodo http://127.0.0.1:19000, chain id 94e0f49c = despliegue
      eventos: 8 GameCreated, 2 GameCancelled, 4 GameResolved
      escrito contracts/fixtures/game-reads.localnet.json (3 frames crudos)
      exit=0
    diff de las dos corridas (game-reads): 5c5 < "capturedAt": "2026-11-20T04:51:04.636Z" --- > "capturedAt": "2026-11-20T04:51:05.599Z" ; diff exit=1 -> SOLO capturedAt (DETERMINISTA).
    capture-tx run 1 y run 2 (salida identica):
      nodo http://127.0.0.1:19000, chain id 94e0f49c = despliegue
      eventos: 8 GameCreated, 2 GameCancelled, 4 GameResolved
      simulationErrors: 11 casos
      executed: 9 transacciones
      escrito contracts/fixtures/game-tx.localnet.json
      exit=0
    diff de las dos corridas (game-tx): 5c5 < "capturedAt": "2026-11-20T04:51:11.710Z" --- > "capturedAt": "2026-11-20T04:51:12.989Z" ; diff exit=1 -> SOLO capturedAt (DETERMINISTA).
  capture-read no abortó con "no hay una partida de esta variante": no hizo falta el fallback G-B'.
- Cierre de G-B (2.8; antes de abrir G-C): `kill "$(cat <SMOKE_DIR>/sui.pid)"; echo "kill exit=$?"` -> kill exit=0. **Codigo de salida de `sui start` al kill (harness): 144** (igual que 1.83 y que en 2a). `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` -> "No such process", kill -0 exit=1. `ss -ltn | grep -c ':19000 '` = 0 ; el 9000 sigue con sus 2 lineas LISTEN. Procesos `sui start|genesis`: 0. `rm -rf <SMOKE_DIR>` y `test ! -e <SMOKE_DIR>` OK ("SMOKE_DIR G-B borrado"). `rm -f contracts/deployments/localnet.json; rmdir contracts/deployments 2>/dev/null || true; ls contracts/deployments` -> testnet.json. `git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/deployments/testnet.json` exit 0; `test ! -e contracts/deployments/localnet.json` 0; `! compgen -G 'contracts/Pub.*.toml'` 0; git status: solo los archivos esperados. Guarda de la config: stat -> 2026-10-30 17:52:52.515735237 -0500 244; ls -la solo client.yaml; sha256 ef12fd09615f; du -s <HOME real>/.move 170748; Docker 5/17.

#### G-C (2.7): chain id corto 4daf3c94
- Mismo procedimiento (genesis exit=0; `ss` 19000 libre; arranque con smoke_guard_pre; ready after 1; smoke_guard OK; envs apunta a http://127.0.0.1:19000; chain-identifier hex 4daf3c94).
- Variante B: variante B exit=0, stderr 0 bytes, lock=0. stdout: chainId 4daf3c94; packageId = originalPackageId: 0xa800c50dabbeaa63ba8f54b8b46e89b993982b9bed8dd37598426fcae088e123; upgradeCapId: 0x4e4ec8ae15bdf5a2225a42243cb817c80c48e6588df0c1fa6ccbb5151faf633e; houseId: 0x964e79f3d0e011f5fce1c6224dbf9a7d72e5886ffe0ecab7cfbdb35d37e28c46; houseCapId: 0x9b95f0d402cf16382c8d1158b8c11e02e86c7fac7c8f5d54a73a3c6d3e7d5bec; publishTxDigest: C8Fbpd8cEFDvoxWwTSdNvb9UHAuWtPmfnnLEPXzbmGTh; suiCliVersion 1.84.0-9dc25070cf2e; frameworkRev e6f43880f4b65e2c1f0397583a9690b4b22c9223. `check` -> "2 despliegue(s) válidos y coherentes con Published.toml", exit 0.
- Receta contracts/README.md:519-535 (los 5 pasos, ninguna otra tx de admin):
    1 ADMIN update_fee_rate 250 | RGNnqgonwhAUahD8rRubTNwB9ncGU4rcWmuHtu1bHtv | success | 1000000/3807600/3807219
    2 ADMIN update_bet_limits 2000000 10000000000 (suic call --package "$PKG" --module house --function update_bet_limits --args "$HOUSE" "$HOUSE_CAP" 2000000 10000000000 --json) | 73ZHxtmRvuoru2JzoA9Kikx5j2WcHQtvnyZhis7RVBPP | success | 1000000/3807600/3807219
    3 A crea una partida abierta de 200000000 | HemrhuWwVvzD6Q6wcyHyfuzfcrqB27oncAahjnmQgzhv | success | 1000000/2941200/0
    4 B la acepta | 9zoP3a8yeCMU2iqosccVfZ6kqb7m181TudhLvanNA8XU | success | 1000000/5943200/3480452 | pot 400000000, fee 10000000, payout 390000000
    5 ADMIN withdraw_fees + TransferObjects a si mismo (suic ptb --move-call "$PKG::house::withdraw_fees" @"$HOUSE" @"$HOUSE_CAP" --assign fees --transfer-objects "[fees]" @"$ADMIN" --json) | 2u97ZxF3Y8i7Nv3hmoixwEghXtjfprJS5RRyEAvGb63w | success | 1000000/4795600/3807219 | FeesWithdrawn amount 10000000
- Capturas (--url "$RPC_URL"), dos corridas, salida identica:
      nodo http://127.0.0.1:19000, chain id 4daf3c94 = despliegue
      roles: ADMIN, A y B distintos; 3 transacciones de admin de ADMIN
      houseCapListing: admin 1 (hasNextPage false), nonOwner 0, adminLimit1 1 (hasNextPage false, cursor null)
      simulationErrors: 5 casos; nonOwnerPreflight = SimulationError
      executed: 3 transacciones
      escrito contracts/fixtures/house-admin.localnet.json
      exit=0
  diff de las dos corridas: 5c5 < "capturedAt": "2026-11-20T04:52:22.336Z" --- > "capturedAt": "2026-11-20T04:52:23.348Z" ; diff exit=1 -> SOLO capturedAt (DETERMINISTA).
- Cierre de G-C: kill exit=0; **codigo de salida de `sui start` al kill: 144**; kill -0 -> "No such process" (exit 1); `ss -ltn | grep -c ':19000 '` = 0; el 9000 sigue (2 lineas LISTEN); procesos sui 0; `rm -rf <SMOKE_DIR>` OK ("SMOKE_DIR G-C borrado"); localnet.json borrado, ls contracts/deployments -> testnet.json; `git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/deployments/testnet.json` exit 0; sin localnet.json ni Pub.*.toml (0 y 0); stat 2026-10-30 17:52:52.515735237 -0500 244, solo client.yaml, sha256 ef12fd09615f; `du -s <HOME real>/.move` 170748; Docker 5/17.

#### 2.8 Comparacion de forma (viejo = `git show HEAD:contracts/fixtures/<f>`, guardado en <scratchpad>/t2b/old/; nuevo = archivo recapturado, 2a corrida)
Funciones (las del handoff, tal cual) y variante con normalizacion de IDs en las rutas (los mapas objectTypes estan indexados por ID de objeto, que cambia con la genesis, por lo que el shape crudo difiere solo en esas CLAVES):
  shape()  { jq -r 'paths as $p | ($p | map(if type=="number" then "*" else . end | tostring) | join(".")) + " : " + (getpath($p) | type)' "$1" | sort -u; }
  arrays() { jq -r '. as $d | [paths(arrays)] | map(. as $p | ($p | map(tostring) | join(".")) + " : " + ($d | getpath($p) | length | tostring)) | .[]' "$1"; }
  shapeN() { jq -r 'paths as $p | ($p | map(if type=="number" then "*" else . end | tostring | sub("^0x[0-9a-f]{64}$";"<id>")) | join(".")) + " : " + (getpath($p) | type)' "$1" | sort -u; }
Resultado (listas completas, de cientos de lineas, guardadas en <scratchpad>/t2b/*.shape*.{old,new}; aqui los conteos y los diff, que son el resultado):
  | fixture | shape crudo (rutas-tipo) | shapeN (IDs normalizados) | arrays (longitudes) | veredicto |
  | game-reads.localnet.json | 266 / 267 | 266 / 267: diff = 1 ruta nueva | 4 / 4, diff vacio | DISTINTA en 1 alternativa de oneof de DATOS (ver abajo) |
  | game-tx.localnet.json | 1018 / 1018, difieren solo claves de objectTypes (IDs) | 987 / 987, diff vacio | 36 / 36, diff vacio | IGUAL |
  | house-admin.localnet.json | 376 / 376, idem | 369 / 369, diff vacio | 15 / 15, diff vacio | IGUAL |
  Diff de shapeN de game-reads (unica diferencia):
    227a228
    > rawListEventsPage.frames.*.event.json.kind.structValue.fields.opponent.kind.stringValue : string
  Causa: no es un cambio del nodo ni de la CLI. rawListEventsPage son los 3 ultimos GameCreated (descendente, limit 3); en la fixture vieja (secuencia de #10, apuestas 1000001-1000005/11000xx) ninguno era invitacion (opponent = nullValue en los 3 frames); en la secuencia de la receta de #11/#12 que se siguio ahora, el ultimo GameCreated es G_ACCINV (invitacion), asi que el frame 0 trae opponent = stringValue (direccion). Misma estructura protobuf (oneof), otra rama. Frames con event/watermark/end como antes.
  Longitudes de arrays (nuevo = viejo):
    game-reads: rawListEventsPage.request.readMask.paths 8 ; request.filter.terms 1 ; request.filter.terms.0.literals 1 ; rawListEventsPage.frames 3
    game-tx (36 arrays): por cada executed.<caso>: effects.dependencies / effects.changedObjects / effects.unchangedConsensusObjects / events = createOpen 0/6/1/1 ; createInvite 0/2/1/1 ; cancel 0/3/0/1 ; reject 0/7/0/1 ; cancelNotCreatorExecuted 0/2/0/0 ; acceptCreatorWins 0/6/1/1 ; acceptAcceptorWins 0/5/1/1 ; acceptInvite 0/5/1/1 ; acceptNotPendingExecuted 0/7/1/0
    house-admin (15): houseCapListing.admin.objects 1 ; nonOwner.objects 0 ; adminLimit1.objects 1 ; executed.updateFeeRate 0/3/0/1 ; updateBetLimits 0/3/0/1 ; withdrawFees 0/4/0/1 (mismo orden de campos)
  Tamanos de los mapas objectTypes por tx (viejo = nuevo): createOpen 6, createInvite 2, cancel 3, reject 7, cancelNotCreatorExecuted 2, acceptCreatorWins 5, acceptAcceptorWins 4, acceptInvite 4, acceptNotPendingExecuted 7; updateFeeRate 3, updateBetLimits 3, withdrawFees 4.
  `_meta.suiCliVersion` de las tres (`jq -r '._meta | [.suiCliVersion, .sdkVersion, .network] | @tsv'`) = 1.84.0-9dc25070cf2e, sdkVersion 2.37.0, network localnet.

#### Valores no derivados de la genesis (cotejo de hojas escalares)
Comando: leaves2() = jq -r 'paths(scalars) as $p | ... ' (ruta con indices -> *, IDs 0x<64hex> -> 0xID, base58 de 32-88 -> B58, base64 de 16+ -> B64, fechas ISO -> ISO, y las hojas cuyo nombre termina en Version, version, checkpoint, timestampMs, capturedAt, blockHeight o eventIndex -> <GENESIS-DEP>) con `sort | uniq -c`, luego `diff viejo nuevo`.
- house-admin.localnet.json: **2 lineas distintas, solo `_meta.order` ("CLI 1.83" -> "CLI 1.84", el texto de 2.5)**. Todo lo demas igual: simulationErrors (5), executed (3), gas, eventos, claves.
- game-tx.localnet.json: **6 lineas distintas**:
    1. `_meta.method.executed`: "CLI 1.83" -> "CLI 1.84" (2.5).
    2. `_meta.suiCliVersion`: 1.83.0-16d2dc1e05ed -> 1.84.0-9dc25070cf2e.
    3. `cliErrorText`: cambia solo la direccion del paquete dentro del texto del abort (la del paquete de la genesis nueva); mismo texto Rust: MoveAbort(MoveLocation { module: ModuleId { address: <ID del paquete>, name: Identifier("game") }, function: 1, instruction: 16, function_name: Some("cancel_game") }, 3) in command 0.
    4. `house.json.fees_collected`: "150000" -> "200000". Causa: el numero de aceptaciones lo fija la moneda (aleatoria): en la corrida vieja hicieron falta 2 aceptaciones de G_ACC + la invitacion = 3 x 50000; ahora fueron 3 + la invitacion = 4 x 50000. No es un cambio de formato; ver "Riesgos" (literal de app).
  Los 11 simulationErrors (message y executionError) son identicos; los 9 executed: status, eventos (tipo y orden), errores y la ruta de cada abort iguales (game/3 y game/4 con el texto del nodo igual).
- game-reads.localnet.json: 32 lineas distintas, todas de DATOS de la secuencia de partidas (no del formato): apuestas y reembolsos de las partidas elegidas (1000002 -> 2000002 invitacion pendiente; 1000003 -> 3000003 cancelada por el creador; 1000004 -> 4000004 cancelada por el invitado; 1000005 -> 1000001 resuelta; pot/payout de GameResolved 2000010/1950010 -> 2000002/1950002), los 3 frames crudos (apuestas 1100058-60 -> 1000001 x3; opponent oneof, ver forma) y rawListEventsPage.request.startCheckpoint (59 -> 56, depende de la genesis). Sin cambio en nombres de claves, tipos de eventos ni estructura.
- **Costos de gas (effects.gasUsed) de TODAS las transacciones ejecutadas de las fixtures: IDENTICOS a la 1.83.0/PV 140 (12 de 12)**. Comando: `jq -r '.executed | to_entries[] | "\(.key) " + ((.value.Transaction // .value.FailedTransaction).effects.gasUsed | "\(.computationCost)/\(.storageCost)/\(.storageRebate)/\(.nonRefundableStorageFee)")' <fixture>` sobre el viejo (`git show HEAD:...`) y el nuevo; salida (computo/storage/rebate/nonRefundable), igual en ambos:
    game-tx: createOpen 1000000/2941200/0/0 ; createInvite 1000000/3184400/987901/99 ; cancel 1000000/3929200/2940906/294 ; reject 1000000/4172400/2196180/220 ; cancelNotCreatorExecuted 1000000/2941200/2940906/294 ; acceptCreatorWins 1000000/5943200/5456254/546 ; acceptAcceptorWins 1000000/5943200/4468353/447 ; acceptInvite 1000000/6186400/4711529/471 ; acceptNotPendingExecuted 1000000/4955200/3966803/397
    house-admin: updateFeeRate 1000000/3807600/3807219/381 ; updateBetLimits 1000000/3807600/3807219/381 ; withdrawFees 1000000/4795600/3807219/381
  **Los costos de gas NO cambian con la PV 142 (CLI 1.84.0): dato para #73 (GAME_STORAGE_DEPOSIT_MIST y las mediciones de contracts/README.md:410-418 siguen valiendo; createOpen = 1000000/2941200/0, la primera tx de A, como usan los tests de la app). No se cambio nada.**
  (Consistente con lo medido en 2a: gasEstimate de publicar el paquete 47246000, sin cambio.)

#### Gates de este tramo (informativos, node = v26.13.0)
- cd <repo> && npm run lint -w app -> exit 0 ; npm run typecheck -w app -> exit 0 (los comentarios/textos editados no afectan).
- cd <repo>/contracts && node --test scripts/*.test.mjs -> tests 104, pass 104, fail 0 ; node scripts/publish.mjs check -> "1 despliegue(s) válidos y coherentes con Published.toml" ; el arbol de scripts no cambio.
- git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/deployments/testnet.json -> 0.
- Informativo (los de app se corren en TASK-3; lo corri para saber): `cd <repo> && npm test -w app` -> exit 1: "Test Files 2 failed | 64 passed (66)", "Tests 5 failed | 1241 passed (1246)". Los 5 son literales copiados de las fixtures nuevas (sin cambio de forma; caso 3.2 del handoff, NO los toque):
    src/sui/game.test.ts:107 `expect(game.bet).toBe(1_000_002n)` (pendingInvite: ahora 2000002n);
    src/sui/game.test.ts:112-113 `['cancelledByCreator', 1_000_003n]` y `['cancelledByInvitee', 1_000_004n]` (ahora 3000003n y 4000004n);
    src/sui/game.test.ts:120 `toMatchObject({ bet: 1_000_005n, stake: 0n })` (resolved: ahora 1000001n);
    src/sui/house.test.ts:54 `feesCollected: 150_000n` (ahora 200000n; el comentario de la linea 53, "Las 3 aceptaciones de la captura de #12", pasaria a 4).
  Valores nuevos por jq para que TASK-3 los use: `jq -r '[.objects.pendingInvite.json.bet, .objects.cancelledByCreator.json.bet, .objects.cancelledByInvitee.json.bet, .objects.resolved.json.bet] | @tsv' contracts/fixtures/game-reads.localnet.json` -> 2000002 3000003 4000004 1000001 ; `jq -r '.house.json.fees_collected' contracts/fixtures/game-tx.localnet.json` -> 200000 (fee_rate 250, min_bet 1000000, max_bet 50000000000 sin cambio).
  Los demas 1241 pasan (incluidos los de la guarda y config.test.ts). Salida completa en <scratchpad>/t2b/test-2b.txt.

### Tests y gates (plantilla)
- Agregados/modificados: ninguno de tests en este tramo (solo fixtures y 3 lineas de texto de version).
- Scripts: node --test 104 PASS / check = 1 despliegue(s) (arriba).
- App: lint 0, typecheck 0; npm test 1241/1246 (5 rojos = literales de 3.2, arriba).
- Lock/Published/testnet.json: sin delta (git diff --exit-code = 0, tras cada genesis y al final).
- git diff --stat:
   app/scripts/capture-house-fixtures.mjs       |    2 +-
   app/scripts/capture-tx-fixtures.mjs          |    4 +-
   contracts/fixtures/game-reads.localnet.json  |  296 +++---
   contracts/fixtures/game-tx.localnet.json     | 1238 +++++++++++++-------------
   contracts/fixtures/house-admin.localnet.json |  318 +++----
   5 files changed, 929 insertions(+), 929 deletions(-)
- git status --porcelain --untracked-files=all:
    M app/scripts/capture-house-fixtures.mjs
    M app/scripts/capture-tx-fixtures.mjs
    M contracts/fixtures/game-reads.localnet.json
    M contracts/fixtures/game-tx.localnet.json
    M contracts/fixtures/house-admin.localnet.json
- Docker: docker images -aq = 17 antes y despues. docker ps -aq = 5 al empezar y despues de cada genesis; al terminar de escribir el reporte vi 6: apareció un contenedor NUEVO de otro proyecto del host (creado 2026-11-19 23:57:14 -0500, "Up 28 seconds" al medir, mientras este tramo ya habia cerrado sus dos genesis y no habia ninguna accion de Docker mia). Este DEV no ejecuto ningun comando docker que cree contenedores (solo `docker ps`/`docker images` de lectura). No lo toque. Lo declaro como diferencia de la linea base 5/17 -> 6/17 ajena a este tramo; el orquestador decide si la linea base se actualiza. du -s <HOME real>/.move = 170748 antes y despues. Tablas de contrato y app/src/sui: no aplica.

### Desviaciones del handoff (o "ninguna")
1. Desviacion autorizada por el owner: puerto 19000 (arriba).
2. `ids.env` y `fn.sh` (helpers de transacciones que no imprimen direcciones) viven en <SMOKE_DIR>; el handoff no los nombra, son parte del procedimiento de smokes de agents.md §3.
3. Corri `npm test -w app` (informativo) aunque el handoff reserva los gates de app a TASK-3: no cambia nada y da el diagnostico de los 5 literales (S-9 no aplica: todas las causas son literales copiados de la fixture, sin cambio de forma ni matcher que tocar).
4. Los listados completos de shape (cientos de lineas) no estan pegados aqui: solo los conteos, el diff (1 linea) y las longitudes de arrays; los archivos completos quedan en el scratchpad. Es el unico resumen del reporte.
Ninguna otra.

### Riesgos / pendientes
- **Para TASK-3 (3.2):** los 5 literales de arriba (game.test.ts:107, :112, :113, :120 y house.test.ts:54 + su comentario de :53). Si se prefiere que game-reads conserve la secuencia vieja (apuestas 1000002-1000005) habria que recapturarla en una G-B' solo para las lecturas (fallback del handoff); no fue necesario porque capture-read no aborto.
- El conteo de aceptaciones (y por tanto `fees_collected`) de game-tx depende de la moneda: cada recaptura puede dar 3, 4, ... aceptaciones; el literal de house.test.ts:54 queda atado a la corrida (ya lo estaba).
- El primer frame crudo de game-reads ahora es una invitacion (opponent stringValue): ningun test de app fallo por eso, pero cualquiera nuevo que asuma opponent null en los frames lo veria.
- networks.ts:11 sigue fijo en 9000; el puerto 9000 del host sigue ocupado por un servicio de otro proyecto (no se toca).

### STOPs levantados
Ninguno (S-1..S-10). S-8 no aplica (no se toco deployment.mjs/publish.mjs; la forma del --json y de las lecturas no cambio); S-9 no aplica (solo literales).

### Seguridad (R-6)
Greps /usr/bin/grep -nE con los 4 patrones del handoff sobre las lineas + de `git diff -U0` (929 lineas, todas en las 3 fixtures salvo 3 de comentarios de los scripts) y sobre este reporte.
- Diff, patron 3 (claves, frases de recuperacion, rutas personales): 0 coincidencias. Patron 4 (hash abreviado con puntos suspensivos): 0. -> vacios.
- Diff, patron 1 ([0-9a-fA-F]{40,64}) por archivo: game-reads 71, game-tx 246, house-admin 80, scripts 0. Patron 2 (0x + 8 o mas hex): game-reads 71, game-tx 241, house-admin 80, scripts 0.
  Clasificacion: todo en el grupo "fixtures" = IDs de objetos/paquetes/capabilities, digests y bytes (base64 BCS) de dos genesis desechables, mas 4 direcciones de CUENTA efimera distintas de esas genesis (G-B y G-C; precedente aceptado, R-6 del handoff), extraidas con jq de las claves creator, opponent, acceptor, winner, cancelled_by, AddressOwner y sender (una primera extraccion con mas claves incluia ademas el houseCapId de G-C, un ID publico, y daba 5 y 34 apariciones en house-admin; se corrigio): apariciones de cuentas por archivo = game-reads 23, game-tx 70, house-admin 23 (sobre 71, 312 y 96 cadenas 0x de 64 hex en el archivo completo). Las 5 lineas de game-tx que cumplen el patron 1 pero no el 2: 4 lineas "bcs" en base64 con tiras de 'A' (bytes en cero; validas como hex) y 1 linea cliErrorText con el ID publico del paquete sin prefijo 0x.
  Comprobacion de que ninguna direccion de cuenta aparece fuera de las fixtures (solo conteos): para cada una de las 4, `git diff -- . ':(exclude)contracts/fixtures' ':(exclude)contracts/scripts/fixtures' | /usr/bin/grep -c <direccion>` = 0 (35 lineas de diff fuera de las fixtures) y `git grep -l <direccion> -- . ':(exclude)contracts/fixtures' ':(exclude)contracts/scripts/fixtures'` = 0 archivos; ademas 0 apariciones en este reporte (las direcciones de cuenta nunca se imprimieron: ids.env y addresses.json quedaron en <SMOKE_DIR>, borrado).
- Sobre este reporte: patron 3 = 0 y patron 4 = 0; patrones 1 y 2: solo IDs publicos de las dos genesis desechables (paquete, upgrade cap, house, house cap) y el SHA publico e6f43880... del framework de la PV 142, ademas de digests base58 publicos; ninguna cuenta, clave ni ruta personal (placeholders <repo>, <HOME real>, <SMOKE_DIR>, <scratchpad>). No se nombra ningun contenedor ni proyecto ajeno.

### R-12 y guardas
- Reporte escrito solo con la herramienta de escribir archivos. Las verificaciones sobre este borrador (conteo de la frase de shell de comando inexistente, busqueda de trazas de ejecucion accidental, greps R-6) y la guarda del directorio de config de la CLI tras escribirlo y al final se anotan en el mensaje de entrega y en la linea final de este archivo.
- Ninguna ejecucion accidental de sui en este tramo.
- Guarda al inicio y tras cerrar cada genesis (G-B y G-C): mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, solo client.yaml, sha256 (12 hex) ef12fd09615f; sin cambios.

### Documentacion
- READMEs / agents.md: no aplica (TASK-4).
- Snippet propuesto para STATUS (2b): localnet aislada @ feature/issue-75-toolchain-1840 (TASK-2b de #75), CLI 1.84.0-9dc25070cf2e, puerto 19000: chains 94e0f49c (G-B) y 4daf3c94 (G-C); gas igual (12 de 12 transacciones; createOpen 1000000/2941200/0); forma igual en game-tx y house-admin, game-reads con una rama de oneof de datos (primer frame crudo = invitacion); capturas deterministas (solo capturedAt); sui start sale con 144; cierre limpio; app: 5 literales a corregir en TASK-3.

~~~~


---

## 11. TASK-2b, anexo (reporte del DEV)

> DEV, anexo: cinco literales de game.test.ts y house.test.ts.

~~~~text
## Anexo 2 del tramo 2 de TASK-2b: literales de game.test.ts y house.test.ts (reglas de TASK-3 3.2 del handoff v1.3.2)

Branch feature/issue-75-toolchain-1840 @ 5f897a2 (worktree <repo> = Battleship-issue75). Redactado solo con la herramienta de escribir archivos (R-12). Sin commits ni git add. No se uso sui, no se abrio ninguna genesis.

### Archivos modificados en este paso
- app/src/sui/game.test.ts: 4 literales de entrada (lineas 107, 112, 113, 120).
- app/src/sui/house.test.ts: 1 literal (linea 54) y el numero del comentario de la linea 53 ("Las 3" -> "Las 4").
Ningun matcher cambiado (siguen toBe, toMatchObject y toEqual), ninguna aserción borrada ni relajada, ninguna formula tocada. No se toco ningun otro test, fixture ni script en este paso.

### Causa (diagnostico)
Los tests leen las fixtures reales y comparan con literales copiados de la captura vieja. Las fixtures nuevas (tramo 2) salen de otra genesis y de otra secuencia de partidas de la receta (apuestas 2000002/3000003/4000004 y 4 aceptaciones en vez de 3, porque el numero de aceptaciones lo fija la moneda). La forma no cambio. Es el caso 3.2 del handoff (literal copiado de la fixture); S-9 no aplica.

### Valores nuevos por jq (comandos tal como se corrieron y salidas)
$ cd <repo> && jq -r '[.objects.pendingInvite.json.bet, .objects.cancelledByCreator.json.bet, .objects.cancelledByInvitee.json.bet, .objects.resolved.json.bet] | @tsv' contracts/fixtures/game-reads.localnet.json
2000002	3000003	4000004	1000001
$ cd <repo> && jq -r '.house.json.fees_collected' contracts/fixtures/game-tx.localnet.json
200000
(Confirman los valores del reporte del tramo 2.)

### Tabla archivo:linea (ruta en la fixture) -> viejo -> nuevo
| Archivo:linea | Ruta en la fixture | Viejo | Nuevo |
|---|---|---|---|
| app/src/sui/game.test.ts:107 (toBe, pendingInvite) | game-reads .objects.pendingInvite.json.bet | 1_000_002n | 2_000_002n |
| app/src/sui/game.test.ts:112 (it.each, cancelledByCreator) | game-reads .objects.cancelledByCreator.json.bet | 1_000_003n | 3_000_003n |
| app/src/sui/game.test.ts:113 (it.each, cancelledByInvitee) | game-reads .objects.cancelledByInvitee.json.bet | 1_000_004n | 4_000_004n |
| app/src/sui/game.test.ts:120 (toMatchObject, resolved) | game-reads .objects.resolved.json.bet | 1_000_005n | 1_000_001n |
| app/src/sui/house.test.ts:54 (toEqual, feesCollected) | game-tx .house.json.fees_collected | 150_000n | 200_000n |
| app/src/sui/house.test.ts:53 (comentario) | numero de aceptaciones (4 x 50000 = 200000) | "Las 3 aceptaciones" | "Las 4 aceptaciones" |
Nota: el resto del comentario de house.test.ts:53 ("de la captura de #12 (TASK-1)") no se toco (alcance pedido: solo el numero); la captura ahora es la de #75 (TASK-2b), asi que ese texto queda desactualizado: lo dejo anotado como pendiente menor, sin cambiarlo.

Diff exacto (git diff -U0 -- app/src/sui/game.test.ts app/src/sui/house.test.ts):
  game.test.ts @@ -107 +107 @@  -    expect(game.bet).toBe(1_000_002n);  +    expect(game.bet).toBe(2_000_002n);
  game.test.ts @@ -112,2 +112,2 @@  -    ['cancelledByCreator', 1_000_003n],  -    ['cancelledByInvitee', 1_000_004n],  +    ['cancelledByCreator', 3_000_003n],  +    ['cancelledByInvitee', 4_000_004n],
  game.test.ts @@ -120 +120 @@  -    expect(game).toMatchObject({ bet: 1_000_005n, stake: 0n });  +    expect(game).toMatchObject({ bet: 1_000_001n, stake: 0n });
  house.test.ts @@ -53,2 +53,2 @@  -      // Las 3 aceptaciones de la captura de #12 (TASK-1), con comisión 50000 cada una.  -      feesCollected: 150_000n,  +      // Las 4 aceptaciones de la captura de #12 (TASK-1), con comisión 50000 cada una.  +      feesCollected: 200_000n,

### Gates (node = v26.13.0)
$ cd <repo> && npm run lint -w app; echo "lint exit=$?"
lint exit=0

> lint
> eslint . --max-warnings 0

$ cd <repo> && npm run typecheck -w app; echo "typecheck exit=$?"
typecheck exit=0

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

$ cd <repo> && npm test -w app; echo "test exit=$?"
test exit=0

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  66 passed (66)
      Tests  1246 passed (1246)
   Start at  00:00:13
   Duration  25.93s (environment 63%, tests 15%, import 10%, setup 10%, transform 1%, worker 1%)

Environment  jsdom was created 66 times · 154.08s total, 63% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

Resultado: 66 archivos, 1246 tests PASS, 0 rojos (1156 + 90 de la guarda).

### Estado del arbol
$ git diff --stat
 app/scripts/capture-house-fixtures.mjs       |    2 +-
 app/scripts/capture-tx-fixtures.mjs          |    4 +-
 app/src/sui/game.test.ts                     |    8 +-
 app/src/sui/house.test.ts                    |    4 +-
 contracts/fixtures/game-reads.localnet.json  |  296 +++---
 contracts/fixtures/game-tx.localnet.json     | 1238 +++++++++++++-------------
 contracts/fixtures/house-admin.localnet.json |  318 +++----
 7 files changed, 935 insertions(+), 935 deletions(-)
$ git status --porcelain --untracked-files=all
 M app/scripts/capture-house-fixtures.mjs
 M app/scripts/capture-tx-fixtures.mjs
 M app/src/sui/game.test.ts
 M app/src/sui/house.test.ts
 M contracts/fixtures/game-reads.localnet.json
 M contracts/fixtures/game-tx.localnet.json
 M contracts/fixtures/house-admin.localnet.json
(Los 5 archivos del tramo 2 mas los 2 tests de este anexo.) Para el commit de los tests de este anexo: solo game.test.ts y house.test.ts (archivos disjuntos de los demas).

### STOPs levantados
Ninguno (S-1..S-10). S-9 no aplica: solo literales de entrada copiados de la fixture, sin tocar matchers, aserciones ni formulas.

### Seguridad (R-6)
Greps sobre las lineas + del diff de este paso (git diff -U0 -- app/src/sui/game.test.ts app/src/sui/house.test.ts, 5 lineas + 1 de comentario) y sobre este anexo: patrones 1 a 4 del handoff: sin coincidencias en el diff (los literales son enteros de apuestas, sin hex). Sobre el anexo: sin coincidencias de los patrones 1, 2, 3 y 4 (ninguna direccion, ID, clave ni ruta personal).

### R-12 y guardas
- Anexo escrito solo con la herramienta de escribir archivos. Guarda del directorio de config de la CLI en <HOME real>/.sui/: al inicio de este paso: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, ls -la solo client.yaml, sha256 (12 hex) ef12fd09615f; .move 170748; Docker 17 imagenes y 6 contenedores (linea base actualizada por el orquestador: el sexto es de otro proyecto); 0 procesos sui.
- Las verificaciones tras escribir (conteo de la frase de shell de comando inexistente, busqueda de trazas de ejecucion accidental, greps R-6) y la guarda final se anotan en el mensaje de entrega.

~~~~


---

## 12. TASK-2b, tramo 2 y anexo (revisión del MID)

> MID, TASK-2b, tramo 2 y anexo.

## Revisión TASK-2b (tramo 2 + anexo): PASA

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-2b.txt` (216 líneas), de `REPORTE_TOOLCHAIN_142_TASK-2b-anexo2.txt` (99 líneas) y del diff real sin commitear de `<repo>` (HEAD `5f897a2`): 7 archivos modificados, ninguno nuevo; sin untracked. No se ejecutó ningún gate ni `sui`/`suiup`; esta revisión se escribió con la herramienta de archivos (R-12).

### Veredicto
Aprobado, sin hallazgos 🟠/🔴. El tramo hace lo que pide el handoff v1.3.2 (2.5-2.8) y el anexo cierra los 5 literales de `app` según las reglas de TASK-3 3.2. Quedan un NIT (comentario de `house.test.ts:53`) y una recomendación de documentación sobre `fees_collected`. El orquestador puede commitear (b).

### Checklist y DoD de 2b

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | 2.5 (textos de versión, antes de capturar) | OK | Diff real: `capture-tx-fixtures.mjs:280, :301` y `capture-house-fixtures.mjs:272`, solo "CLI 1.83" → "CLI 1.84"; el DEV comprobó con grep antes que eran exactamente esas 3 líneas (reporte `:30`). Nada más en `app/scripts`. |
| 2 | G-B y G-C, puerto 19000, una a la vez | OK | G-B (`94e0f49c`) → cierre completo (kill por PID, `kill -0` falla, `rm -rf` del directorio de la corrida, 19000 libre, 9000 ajeno igual, `~/.sui`, `~/.move` y Docker) → recién G-C (`4daf3c94`). Orden por génesis: `ss` (19000 libre) → génesis sin `suic` → arranque con `smoke_guard_pre` y `--fullnode-rpc-port 19000` → `smoke_guard` con el RPC exacto (`RPC_URL`) → `suic`/`publish.mjs`. Ningún `GUARD-FAIL`. **Cada captura con `--url "$RPC_URL"` y ninguna sin él** (declarado `:20`). Variante B: exit 0, stderr de 0 bytes, `Move.lock` sin delta, `check` = `2 despliegue(s) válidos y coherentes con Published.toml` en ambas. |
| 2b | Recetas | OK | G-B sigue `contracts/README.md:486-499`: `update_fee_rate` 250; `G_OPEN` 1000001 como **primera** transacción de `A`; `G_INV` 2000002; `G_CANCEL` 3000003 creada y cancelada; `G_REJ` 4000004 rechazada por `B`; `cancel_game` de `B` sobre `G_OPEN` con `--gas-budget 100000000` ⇒ `game`/3; `G_ACC1..3` aceptadas por `B` hasta tener un ganador creador y uno aceptante (3 aceptaciones, tope 8); `G_ACCINV` aceptada; `C` acepta `G_ACC1` ya resuelta ⇒ `game`/4 (`assert_acceptable`). Eventos: 8 `GameCreated`, 2 `GameCancelled`, 4 `GameResolved` (coherentes con la receta). El `accept_game` con `0x8` como último `MoveCall`. G-C sigue `:519-535`: 5 pasos exactos, sin otra transacción de admin, tres cuentas distintas verificadas por el script. |
| 3 | Determinismo | OK | Las tres capturas corridas dos veces: salida idéntica y `diff` solo en `_meta.capturedAt` (`:84`, `:92`, `:113`). |
| 4 | Forma (2.8) | OK, conclusión aceptable | Ver abajo. `game-tx` y `house-admin` iguales (pares ruta-tipo con IDs normalizados 987/987 y 369/369, arrays 36/36 y 15/15, tamaños de los mapas `objectTypes` iguales); `game-reads` 266 → 267 con **una** ruta nueva en una rama de oneof de datos. |
| 5 | Gas | OK | Identidad exacta de `gasUsed` en **12 de 12** transacciones (9 de `game-tx` + 3 de `house-admin`), con el comando y la salida pegados; `createOpen` = 1000000/2941200/0. **Dato para #73: los costos de gas y de storage no cambian con la PV 142**, así que `GAME_STORAGE_DEPOSIT_MIST` y las mediciones de `contracts/README.md:410-418` siguen valiendo. Coincide con lo medido en 2a (publicar: 47_246_000 MIST). |
| 6 | Cierre de ambas génesis | OK | `kill` por PID, `sui start` sale con **144** (como la 1.83 y 2a), `kill -0` falla, puerto 19000 libre, `rm -rf` verificado, sin `localnet.json` ni `Pub.*.toml`, `Move.lock`/`Published.toml`/`deployments/testnet.json` sin delta; `~/.sui` idéntico (244 bytes, mtime del 2026-10-30, solo `client.yaml`, mismo sha256); `~/.move` 170748 KB; Docker, ver nota. |
| 7 | R-12 y R-6 | OK | Reporte y anexo escritos con la herramienta de archivos; guarda de `~/.sui` al inicio y tras cada génesis; sin ejecución accidental. R-6: patrones 3 y 4 en 0 sobre el diff y los reportes; el grupo "fixtures" clasificado por archivo; 4 direcciones de cuenta efímeras con 0 apariciones fuera de las fixtures (y el orquestador verificó sus 7 candidatas). |
| 8 | Anexo: 5 literales | OK | Diff real: `game.test.ts:107` (`1_000_002n` → `2_000_002n`), `:112` (→ `3_000_003n`), `:113` (→ `4_000_004n`), `:120` (`1_000_005n` → `1_000_001n`) y `house.test.ts:54` (`150_000n` → `200_000n`), más el número del comentario de `:53`. Valores por `jq` pegados (`2000002 3000003 4000004 1000001` y `fees_collected` 200000), tabla archivo:línea → ruta → viejo → nuevo, matchers intactos (`toBe`, `toMatchObject`, `toEqual`). Lint 0, typecheck 0, `npm test -w app` = **66 archivos, 1246 PASS, 0 rojos**. |
| 9 | STOPs y desviaciones | OK | S-1..S-10 sin levantar (S-8 y S-9 no aplican). Desviaciones aceptadas: (1) puerto 19000 autorizado por el owner; (2) `ids.env` y `fn.sh` dentro del directorio de la corrida, que no imprimen direcciones de cuenta y forman parte del procedimiento de smokes; (3) `npm test -w app` informativo (los gates de app son de TASK-3, pero correrlos dio el diagnóstico exacto de los 5 literales, no cambió nada y se mantuvo S-9 sin levantar). |

### (4) La rama nueva en `game-reads`: aceptable, sin riesgo para #73
- **Qué es.** Un `rawListEventsPage` guarda los 3 últimos `GameCreated` (descendente, `limit` 3). En la secuencia vieja ninguno era invitación (`opponent` = `nullValue`); con la receta de #11/#12 el último `GameCreated` es `G_ACCINV`, una invitación, así que el primer frame trae `opponent` = `stringValue`. Es el mismo campo y la misma estructura protobuf (un oneof `Struct.Value`), con otra rama. No cambió el nodo, la CLI ni el formato; el cotejo de hojas de `game-reads` lista 32 líneas distintas, todas **datos** (apuestas, reembolsos, `startCheckpoint`).
- **Riesgo para #73: ninguno.** Los parsers de la app leen el BCS de cada evento (`contracts/README.md`, "Formato de la app = BCS"); el `json` del nodo es solo referencia (el SDK advierte que su forma puede variar). `Option<address>` ya está cubierto con ambos casos en los objetos reales (`pendingOpen` y `pendingInvite`). La fixture ahora cubre además una **invitación** en la página cruda, que antes no cubría, y ningún test de `app` falló por eso (1246 PASS). El único cuidado es de futuros tests: no deben asumir `opponent` null en los frames crudos (ya anotado en "Riesgos" del reporte).
- **Conclusión:** "forma igual salvo una rama de oneof de datos" es la lectura correcta; no hace falta recapturar con la secuencia vieja (el fallback G-B' del handoff no se usó).

### (8) Comentario de `house.test.ts:53`
Ahora dice "Las 4 aceptaciones de la captura de #12 (TASK-1)", pero la fixture es la de #75 (TASK-2b), y la cuenta depende de la moneda. **Recomiendo corregirlo (NIT, una línea, solo comentario)**, en el mismo commit (b) (el archivo ya está en el diff): "Las 4 aceptaciones de la última captura de `game-tx.localnet.json` (la moneda aleatoria fija cuántas; 50000 de comisión cada una)". Es una corrección de texto de un archivo ya tocado, sin riesgo, y evita un comentario que miente. Si implica otra vuelta del DEV solo por eso, se puede dejar como NIT sin bloquear: no afecta el resultado de ningún test.

### (9) Fragilidad de `fees_collected`
Es aceptable para #75, no es un defecto introducido ahora: el número de aceptaciones de `G_ACC` lo fija la moneda aleatoria (3 en la corrida vieja, 4 ahora, así que `fees_collected` 150000 → 200000), y el literal de `house.test.ts:54` ya estaba atado a la corrida. Recomiendo:
1. **Anotarlo en la documentación de la recaptura** (PROY-20), con una línea en `contracts/README.md`, "Recaptura de la fixture de transacciones" (`:486-501`): "El número de aceptaciones de las partidas `G_ACC` lo decide la moneda aleatoria (se acepta hasta tener un ganador creador y uno aceptante), así que `house.json.fees_collected` (n × la comisión) y el literal de `feesCollected` de `app/src/sui/house.test.ts` cambian entre recapturas: se actualizan con `jq -r '.house.json.fees_collected'`". Cabe en TASK-4 (docs); si el orquestador está de acuerdo, lo agrego al handoff (v1.3.3, solo ese ítem).
2. **Opcional, como issue aparte (no de #75):** que el test derive `feesCollected` de la propia fixture (suma del `fee` de los `GameResolved` de las aceptaciones) en lugar de un literal; eliminaría la fragilidad de raíz, pero cambia un test y queda fuera de este PR.

### Nota sobre Docker
El DEV vio un sexto contenedor, de otro proyecto del host, creado a las 23:57 sin acción de este tramo (sin ningún `docker` que cree contenedores, solo lecturas); el orquestador lo verificó. Se acepta: la línea base de contenedores pasa a 6 (17 imágenes) solo para comparar, y no hay que actualizar nada del repo ni de STATUS por eso (no es del proyecto).

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| H-1 | 🔵 NIT | LIM-7 | `app/src/sui/house.test.ts:53` | El comentario cita la captura de #12 (TASK-1) y fija un número que depende de la moneda | Corregirlo en (b) como se propone arriba, o dejarlo |
| H-2 | 🔵 SUG | PROY-20 | `contracts/README.md:486-501` | La recaptura no avisa de que `fees_collected` depende de la moneda | Una línea en TASK-4 (ver 9.1) |

No hay BLOCKER, MAJOR ni MINOR.

### Mensaje de commit (b) propuesto (todo en uno: 3 fixtures, 2 textos de versión, 2 tests; solo `Refs #75`; el orquestador agrega el trailer)

```
test: recapture the app fixtures with the 1.84.0 localnet and update the literals derived from them (#75)

The three fixtures in contracts/fixtures (game reads, game transactions and
House admin) come from two isolated localnet runs with CLI 1.84.0-9dc25070cf2e
(new genesis each time, chains 94e0f49c and 4daf3c94), on fullnode RPC port
19000 because 9000 is taken by a service of another project on the host. Each
capture script ran twice per genesis and the two outputs differ only in
_meta.capturedAt. The shape is unchanged for game-tx and house-admin; game-reads
differs in one data branch only: the first raw ListEvents frame is now an
invitation, so its opponent is a string instead of null. The gas of all 12
executed transactions is identical under protocol version 142, so the storage
deposits documented for the contract still hold. The capture scripts only change
the CLI version in the text written to _meta. Five test literals copied from the
fixtures follow the new data (the bets of the pending invitation, the two
cancelled games and the resolved game in game.test.ts, and the collected fees in
house.test.ts, which depend on the sequence and on the random coin); no matcher,
assertion or formula changes. The app suite passes: 66 files, 1246 tests. Refs #75
```

### Siguiente paso
1. El orquestador commitea (b) (con la corrección del comentario de `house.test.ts:53` si la hace).
2. Autorizado **TASK-3** (gates de `app` con el conteo 1246 en 66 archivos, `deploy-image` y V-9). Línea base de Docker para comparar: 6 contenedores / 17 imágenes (el sexto es ajeno).
3. En TASK-3 3.2 ya no queda ningún rojo conocido de las fixtures: solo lo que aparezca al re-medir.

### §R-6 sobre esta revisión (`/usr/bin/grep`)
Los cuatro patrones se corren sobre este archivo y el resultado va en el mensaje de entrega. No hay direcciones de cuenta, rutas personales ni el nombre del servicio ajeno; solo hay enteros, chain ids de 8 hex y el nombre de la CLI.



---

## 13. TASK-3 (reporte del DEV)

> DEV, TASK-3: gates de app, deploy-image y V-9.

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 v1.3.2 - TASK-3 (gates de app, deploy-image y V-9; solo medicion)

Redactado solo con la herramienta de escribir archivos (R-12). Sin commits ni git add. No se uso sui ni ninguna localnet en esta tarea.

### Branch (con SHA corto del HEAD)
feature/issue-75-toolchain-1840 @ 17d8b2d (worktree <repo> = Battleship-issue75). Arbol limpio al empezar y al terminar (git status --porcelain --untracked-files=all = 0 entradas).

### Archivos modificados/creados
Ninguno en el repo (normal en TASK-3). El script desechable de V-9 vive en <scratchpad>/v9/v9.mjs con un enlace simbolico node_modules a <repo>/node_modules.

### Que se hizo
1. 3.1: gates de app completos con Node 26 (npm ci, firmas, auditoria de produccion, lint, typecheck, npm test, build de testnet): todo en verde, 1246 tests en 66 archivos, bundle identico al de TASK-1.
2. 3.3: deploy-image por el camino positivo, OK (positivo), con Docker de vuelta a la linea base de imagenes.
3. 3.4: V-9 medido contra el fullnode publico de testnet (servidor sui-node/1.84.1: CONCLUYENTE) y V-7 final: PV 142.

### Tests y gates (output pegado COMPLETO; Node: export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version -> v26.13.0)

#### Linea de partida
- git log: 17d8b2d (HEAD), 5f897a2, 842c811; git status --porcelain --untracked-files=all: 0 entradas.
- Guarda del directorio de config de la CLI en <HOME real>/.sui/: stat -c '%y %s %n' del client.yaml -> 2026-10-30 17:52:52.515735237 -0500 244 ; ls -la: solo client.yaml; sha256sum (12 hex) ef12fd09615f.
- du -s <HOME real>/.move = 170748. Docker: docker ps -aq = 6, docker images -aq = 17 (linea base actual).

#### 3.1 Gates de app (desde <repo>)
$ cd <repo> && npm ci; echo "npm ci exit=$?"
npm ci exit=0

added 293 packages, and audited 295 packages in 20s

67 packages are looking for funding
  run `npm fund` for details

9 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.

$ npm audit signatures; echo "audit signatures exit=$?"
audit signatures exit=0
audited 292 packages in 18s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

$ npm audit --omit=dev --audit-level=high; echo "audit exit=$?"
audit exit=0
found 0 vulnerabilities

$ npm run lint -w app; echo "lint exit=$?"
lint exit=0

> lint
> eslint . --max-warnings 0

$ npm run typecheck -w app; echo "typecheck exit=$?"
typecheck exit=0

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

$ npm test -w app; echo "test exit=$?"
test exit=0

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  66 passed (66)
      Tests  1246 passed (1246)
   Start at  00:05:32
   Duration  29.15s (environment 57%, tests 15%, import 11%, setup 10%, transform 7%)

Environment  jsdom was created 66 times · 158.78s total, 57% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ VITE_SUI_NETWORK=testnet npm run build -w app; echo "build exit=$?"
build exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 607 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 513ms

$ git status --porcelain --untracked-files=all   -> (vacio, 0 entradas)

Comparacion contra la linea base de TASK-1 (293 paquetes / 292 firmas / 0 vulnerabilidades de produccion; lint 0; typecheck 0; 1156 tests en 65 archivos; index-B3BeMVQC.js 917.80 kB, 277.96 kB gzip):
| Gate | Linea base TASK-1 | Ahora | Delta |
| npm ci | 293 paquetes (295 auditados) | 293 (295 auditados) | ninguno (los "9 moderate" de desarrollo son preexistentes; la auditoria de produccion da 0) |
| firmas | 292 verificadas | 292 verificadas (+143 atestaciones) | ninguno |
| audit produccion | 0 vulnerabilidades | 0 | ninguno |
| lint / typecheck | 0 / 0 | 0 / 0 | ninguno |
| npm test | 1156 en 65 archivos | 1246 en 66 archivos | +90 tests en +1 archivo (localnet-guard.test.ts, TASK-2b) = lo esperado |
| build | index-B3BeMVQC.js 917.80 kB (277.96 gzip) | idem | ninguno (mismo hash de nombre) |

#### 3.2 Tests rojos por las fixtures
Ninguno: npm test dio 1246/1246 (config.test.ts, game.test.ts y house.test.ts ya se corrigieron en 842c811 y 17d8b2d). No se cambio ningun literal en TASK-3; no hay tabla ruta/viejo/nuevo que dar ni jq que pegar; S-9 no aplica.
Costos de gas con la PV 142 (3.2, dato para #73): NO cambian. Medido en TASK-2a (gasEstimate de publicar el paquete 47246000 = 1000000 + 46246000 - 0, igual que con la 1.83) y en TASK-2b (gasUsed identico en las 12 transacciones ejecutadas de las fixtures; createOpen 1000000/2941200/0). Los literales de gas de los tests de app (p. ej. execution.test.ts:281-283) siguen pasando sin cambios. No se toco GAME_STORAGE_DEPOSIT_MIST.

#### 3.3 deploy-image (camino positivo; existe contracts/deployments/testnet.json)
$ ss -ltn | grep -c ':8090 '   -> 0 (puerto libre)
$ cd <repo> && bash app/scripts/check-deploy-image.sh . 8090; echo "deploy-image exit=$?"
Modo positivo: el contexto tiene contracts/deployments/testnet.json
P1 ok: imagen construida
P2 ok: el contenedor responde en http://127.0.0.1:8090/
P3 ok: corre como 65534 con --cap-drop=ALL
P4 ok: / 200 y CSP idéntica a la del Caddyfile
P5 ok: cabeceras de seguridad y Cache-Control de / exactas
P6 ok: sin Cross-Origin-Opener-Policy ni Server
P7 ok: /assets/index-B3BeMVQC.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable
P8 ok: /assets/index-B3BeMVQC.js comprimido (zstd)
P9 ok: /favicon.svg 200, image/svg+xml
P10 ok: /no-existe 404
P11 ok: /game/0x1 404
P12 ok: /assets/no-existe.js 404 sin immutable
OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)
deploy-image exit=0
Sin delta contra la linea base: mismo index-B3BeMVQC.js que en TASK-1 (el script imprime P1-P12; el "P1-P13" del handoff es solo un rotulo, ya observado en TASK-1).
`ss -ltn | grep -c ':8090 '` despues -> 0 (el script limpia su contenedor).

#### Docker (R-8; linea base 6 contenedores / 17 imagenes)
- Antes: docker ps -aq 6, docker images -aq 17 (listas guardadas con ID, repositorio y tag).
- Tras deploy-image: docker ps -aq = 5, docker images -aq = 29. Contenedores nuevos creados por mi: 0. El sexto contenedor de la linea base (el de otro proyecto del host creado el 2026-11-19 23:57) ya no aparece: no lo toque; lo declaro como diferencia ajena a esta tarea (5 en vez de 6).
- Imagenes nuevas: 12, todas `<none>:<none>` (capas intermedias del build de la imagen, creadas por esta corrida entre 00:06 y 00:08, cadena padre-hija verificada con docker image inspect; ninguna imagen nombrada nueva: las bases node y caddy ya existian de TASK-1).
- Limpieza por ID, solo esas 12 (las ID salen de la diferencia entre la lista de antes y la de despues): `docker rmi 400b696b4dbb` (la hoja de la cadena) borro en cascada las 12 (400b696b4dbb, 287875667512, 1e1bd3923786, f051cb803e3b, 260358818db3, 9d03a3369385, f8cb45eadddf, 75b2a2c0bc99, 5334e026b2b1, 6e8af5ea5656, c2a554b5edeb, 6447528d9751); los 11 `docker rmi` siguientes ya no hacian falta (la imagen ya no existia). Nunca docker system prune; nada de otros proyectos.
- Despues: docker ps -aq = 5, docker images -aq = 17; la comparacion de la lista final con la de antes: 0 imagenes nuevas y 0 imagenes que ya no estan.

### Verificacion manual (lecturas publicas, sin claves, solo lectura)

#### 3.4.6 / V-7 final (PV de testnet y CLI 1.84.0)
$ curl -fsSL --max-time 20 -X POST -H 'content-type: application/json' -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' https://graphql.testnet.sui.io/graphql
{"data":{"epoch":{"epochId":1289,"protocolConfigs":{"protocolVersion":142}}}}
$ RAW=https://raw.githubusercontent.com/MystenLabs/sui/testnet-v1.84.0/crates ; curl -fsSL --max-time 30 "$RAW/sui-protocol-config/src/lib.rs" | sed -nE 's/^const MAX_PROTOCOL_VERSION: u64 = ([0-9]+);.*/\1/p' | head -n 1
142
$ curl -fsSL --max-time 30 "$RAW/sui-framework-snapshot/manifest.json" | jq -r '.["142"].git_revision'
e6f43880f4b65e2c1f0397583a9690b4b22c9223
$ gh api repos/MystenLabs/sui/releases/tags/testnet-v1.84.0 --jq '.assets[] | select(.name=="sui-testnet-v1.84.0-ubuntu-x86_64.tgz") | .name + " " + .digest + " " + .published_at'
sui-testnet-v1.84.0-ubuntu-x86_64.tgz sha256:0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127
(el campo published_at del asset viene vacio; el digest coincide con ci.yml)
$ gh api repos/MystenLabs/sui/git/ref/tags/testnet-v1.84.0 --jq .object.sha
9dc25070cf2ed18bcda1ebb095f39708638195a8
V-7 final: testnet sigue en PV 142 (epoca 1289), PV maxima de la CLI 1.84.0 = 142, framework de la PV 142 = e6f43880... (el del Move.lock). S-1 no se levanta.

#### 3.4 V-9 (ListEvents bajo el piso del historial, fullnode publico de testnet)
Script desechable <scratchpad>/v9/v9.mjs (nunca en el repo; node_modules enlazado a <repo>/node_modules; no importa codigo de la app; solo habla con https://fullnode.testnet.sui.io:443; sin claves). Espejo de requestEvents (eventScan.ts:65-100): ledgerService.listEvents descendente, limit 50, filtro de un literal eventType = <packageId publico de contracts/deployments/testnet.json>::game::GameCreated, readMask = EVENT_READ_MASK (event_type, contents, checkpoint, transaction_digest, event_index), sin before. Decodifica el ErrorInfo de grpc-status-details-bin con un parser de protobuf minimo (el SDK solo entrega los bytes en error.meta).
$ cd <scratchpad>/v9 && PKG=$(jq -r .packageId <repo>/contracts/deployments/testnet.json) && <HOME real>/.nvm/versions/node/v26.13.0/bin/node <scratchpad>/v9/v9.mjs "$PKG"; echo "exit=$?"
(salida completa; el packageId publico se sustituyo por <packageId publico>)
== getServiceInfo
chainId corto (base58, 8 primeros caracteres): 69WiPg3D
epoch: 1289
checkpointHeight: 408571135
lowestAvailableCheckpoint (F): 404332001
server: "sui-node/1.84.1-e83d69069e40"
campos del mensaje: chainId, chain, epoch, checkpointHeight, timestamp, lowestAvailableCheckpoint, lowestAvailableCheckpointObjects, server

== caso (a) 1: startCheckpoint = 1
frames recibidos antes del error: 0
error.name: RpcError
error.constructor: RpcError; instanceof RpcError: true
error.code: "OUT_OF_RANGE"
error.message: requested data below earliest available; lowest available checkpoint is 404332001
error.meta claves: grpc-status-details-bin
grpc-status-details-bin: presente (248 caracteres)
  decodificado (186 bytes): {"code":11,"message":"requested data below earliest available; lowest available checkpoint is 404332001","details":[{"typeUrl":"/google.rpc.ErrorInfo","metadata":{"lowestAvailableCheckpoint":"404332001"},"reason":"BELOW_EARLIEST_AVAILABLE","domain":"sui.io"}]}

== caso (b) F - 1: startCheckpoint = 404332000
frames recibidos antes del error: 0
error.name: RpcError
error.constructor: RpcError; instanceof RpcError: true
error.code: "OUT_OF_RANGE"
error.message: requested data below earliest available; lowest available checkpoint is 404332001
error.meta claves: grpc-status-details-bin
grpc-status-details-bin: presente (248 caracteres)
  decodificado (186 bytes): {"code":11,"message":"requested data below earliest available; lowest available checkpoint is 404332001","details":[{"typeUrl":"/google.rpc.ErrorInfo","metadata":{"lowestAvailableCheckpoint":"404332001"},"reason":"BELOW_EARLIEST_AVAILABLE","domain":"sui.io"}]}

== caso (c) F + 16000 (cota normal de la app): startCheckpoint = 404348001
frames: 4 (eventos 3, con watermark 4; ultimo cursor 20 bytes)
end.reason: 3 = CHECKPOINT_BOUND

== caso (d) checkpointHeight + 1000000 (por encima de lo indexado): startCheckpoint = 409571135
frames recibidos antes del error: 0
error.name: RpcError
error.constructor: RpcError; instanceof RpcError: true
error.code: "OUT_OF_RANGE"
error.message: requested data above latest available; start_checkpoint is 409571135, and only checkpoints below 408571137 are available
error.meta claves: grpc-status-details-bin
grpc-status-details-bin: presente (383 caracteres)
  decodificado (287 bytes): {"code":11,"message":"requested data above latest available; start_checkpoint is 409571135, and only checkpoints below 408571137 are available","details":[{"typeUrl":"/google.rpc.ErrorInfo","metadata":{"bound":"start_checkpoint","firstUnavailableCheckpoint":"408571137","requestedCheckpoint":"409571135"},"reason":"ABOVE_LATEST_AVAILABLE","domain":"sui.io"}]}

toBase64 disponible: function
exit=0
(Las lecturas de testnet las hizo Node con el sandbox por defecto del harness: no hizo falta salir de el; solo fueron lecturas publicas, de solo lectura y sin claves.)

**Version del servidor y veredicto de V-9: el fullnode publico informa `server: "sui-node/1.84.1-e83d69069e40"` (>= 1.84) => V-9 es CONCLUYENTE para la 1.84.** (El nodo publico corre la 1.84.1; nuestra CLI y ci.yml siguen en la 1.84.0 por decision del owner; no es una contradiccion: son binarios distintos de la misma linea.) Piso F = 404332001 (checkpointHeight 408571135; epoca 1289).

Conclusion por caso (como falla y si eventScan.ts:130-140 lo reconoce):
- (a) startCheckpoint = 1: falla con RpcError OUT_OF_RANGE, ErrorInfo.reason = BELOW_EARLIEST_AVAILABLE (metadatos lowestAvailableCheckpoint = F), 0 frames. isHistoryPruned lo reconoce en la rama de OUT_OF_RANGE (eventScan.ts:132, sin releer el piso) y requestOrPruned lo convierte en HistoryPrunedError (:146-148): correcto.
- (b) startCheckpoint = F - 1: igual que (a) (OUT_OF_RANGE, BELOW_EARLIEST_AVAILABLE, 0 frames): reconocido en :132 como historial podado: correcto.
- (c) startCheckpoint = F + 16000 (la cota normal de la app): NO falla; 4 frames (3 eventos GameCreated, 4 watermark) y end.reason = CHECKPOINT_BOUND, que requestEvents trata como fin de pagina sin mas paginas (eventScan.ts:111-113, hasNextPage = false): correcto, el stream trae QueryEnd.
- (d) startCheckpoint = checkpointHeight + 1000000: falla tambien con OUT_OF_RANGE, pero con ErrorInfo.reason = ABOVE_LATEST_AVAILABLE (metadatos bound = start_checkpoint, firstUnavailableCheckpoint, requestedCheckpoint) y el mensaje "requested data above latest available". **isHistoryPruned lo CLASIFICA MAL**: la rama de OUT_OF_RANGE (:132) devuelve true sin mirar el reason ni releer el piso, asi que se lanzaria HistoryPrunedError ("el escaneo cruzó el piso de historial") para un pedido por ENCIMA de lo indexado. Alcance real: en la app el startCheckpoint sale de historyLowerBound (checkpoint de publicacion o piso + 16000), por lo que (d) solo ocurriria con un checkpoint de publicacion por delante de un nodo que va atrasado o de otra red; riesgo bajo, pero real.
- Ningun caso termino en stream sin QueryEnd ni con reason desconocido (:104 y :117 no se activan).
Nada de esto cambia codigo de la app en este PR (solo medicion). Seguimientos propuestos para el orquestador (issues aparte):
  1. Issue por la clasificacion de (d): distinguir por ErrorInfo.reason (BELOW_EARLIEST_AVAILABLE vs ABOVE_LATEST_AVAILABLE) en isHistoryPruned (el SDK entrega los bytes de grpc-status-details-bin en error.meta; hay que decodificarlos como en el script) o releer el piso tambien ante OUT_OF_RANGE. Evidencia: la salida de arriba.
  2. NO hace falta el issue "repetir V-9 cuando el fullnode publico corra la 1.84": ya corre >= 1.84 (1.84.1), asi que V-9 es concluyente.
  (Nota de las notas del release: los cursores de ListEvents de servidores anteriores a la 1.83 se rechazan con INVALID_ARGUMENT; la app no persiste cursores entre sesiones; no se midio ningun cursor viejo.)

### Desviaciones del handoff (o "ninguna")
- Ninguna. (3.2 no se activo; el limpiado de Docker fue por ID de la cadena entera con una sola llamada porque borra en cascada.)
- Observacion sin desviar: el servidor publico es 1.84.1 y el repo fija la CLI 1.84.0 (D1 del owner: 1.84.1 descartada); no afecta a V-9 (la medicion es del servidor).

### Riesgos / pendientes
- Clasificacion de (d) en isHistoryPruned (arriba): issue aparte propuesto; riesgo bajo.
- Contenedor de otro proyecto del host que ya no esta (6 -> 5): ajeno, sin tocar; la comparacion de Docker queda en 5/17.
- networks.ts:11 sigue fijo en 9000 (fuera de alcance); el puerto 9000 del host lo ocupa un servicio de otro proyecto del host (no se toca).

### STOPs levantados
Ninguno (S-1..S-10). S-1 no (PV 142), S-9 no (ningun rojo).

### Seguridad (R-6)
Greps /usr/bin/grep -nE con los 4 patrones del handoff: el diff del repo esta vacio (0 lineas +), asi que no hay nada que grepear en el diff. Sobre este reporte: patrones 3 y 4 = 0 coincidencias. Patrones 1 y 2: solo SHAs y digests publicos (el framework e6f43880... de la PV 142, el digest del tgz 0f006fb4... del release, el commit 9dc25070cf2e... del tag, hashes de commit/imagen publicos y los IDs de capas de Docker son de 12 hex y no coinciden) y el packageId de testnet esta sustituido por un placeholder. Ninguna direccion de cuenta, clave ni ruta personal (placeholders <repo>, <HOME real>, <scratchpad>). No se nombra ningun contenedor ni proyecto ajeno.

### R-12 y guardas
- Reporte escrito solo con la herramienta de escribir archivos; ninguna ejecucion de sui en esta tarea (no se necesito).
- Guarda del directorio de config de la CLI al inicio: valores arriba (identicos a la linea base). Tras escribir el reporte y al final: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, ls -la solo client.yaml, sha256 (12 hex) ef12fd09615f; du -s <HOME real>/.move = 170748; Docker 5 contenedores / 17 imagenes; 0 procesos sui.
- Sobre este borrador: el conteo de la frase de shell de comando inexistente = 0 y la busqueda de trazas de ejecucion accidental = 0 (version final). Greps R-6: patron 1 = 3 coincidencias (el rev del framework de la PV 142, el digest del tgz del release y el commit del tag: todos publicos), patron 2 = 0, patron 3 = 0, patron 4 = 0.

### Documentacion
- READMEs / agents.md: no aplica (TASK-4).
- Snippet propuesto para STATUS (TASK-3): app + deploy-image @ feature/issue-75-toolchain-1840 (TASK-3 de #75), Node v26.13.0: 293 paquetes / 292 firmas / 0 vulnerabilidades de produccion; lint 0 / typecheck 0 / 1246 tests en 66 archivos (1156 + 90 de la guarda de TASK-2b, sin otro delta) / index-B3BeMVQC.js 917.80 kB; deploy-image P1-P12 OK (positivo). V-9 (fullnode publico sui-node/1.84.1, piso 404332001, epoca 1289): bajo el piso OUT_OF_RANGE + BELOW_EARLIEST_AVAILABLE, reconocido por eventScan.ts:132; con la cota normal responde (CHECKPOINT_BOUND); por encima de lo indexado OUT_OF_RANGE + ABOVE_LATEST_AVAILABLE, clasificado mal como historial podado (issue aparte); CONCLUYENTE. V-7 final: PV 142 (epoca 1289).

~~~~


---

## 14. TASK-3 (revisión del MID)

> MID, TASK-3.

## Revisión TASK-3: PASA

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-3.txt` (252 líneas). El repo (HEAD `17d8b2d`) no cambió: árbol limpio al empezar y al terminar, sin commit de código en este task. No se ejecutó ningún gate ni `sui`/`suiup`; esta revisión se escribió con la herramienta de archivos (R-12).

### Veredicto
Aprobado, sin hallazgos 🟠/🔴. Los gates de `app` están en verde sin otro delta que el esperado, `deploy-image` pasa por el camino positivo, la limpieza de Docker cumple R-8 y **V-9 es concluyente**, con un hallazgo real para un issue de seguimiento (la clasificación de `ABOVE_LATEST_AVAILABLE`).

### Checklist

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Gates de `app` | OK | `npm ci` 293 paquetes (295 auditados), 292 firmas verificadas, **0 vulnerabilidades de producción**, lint 0, typecheck 0, **`npm test -w app` = 66 archivos, 1246 tests = 1156 + 90** (el delta es el test de la guarda de TASK-2b y nada más), build de testnet con `dist/assets/index-B3BeMVQC.js` 917.80 kB (277.96 kB gzip), idéntico al de TASK-1; `git status` vacío (reporte `:24-117`). |
| 2 | 3.2 no se activó | OK | Ningún rojo; ningún literal cambiado (los de `config.test.ts`, `game.test.ts` y `house.test.ts` ya estaban corregidos en los commits anteriores). Gas con la PV 142: sin cambios, con la referencia a lo medido en 2a (47_246_000 MIST) y en 2b (12 de 12 transacciones). `GAME_STORAGE_DEPOSIT_MIST` no se tocó. |
| 3 | `deploy-image` | OK | Camino positivo (existe `contracts/deployments/testnet.json`), P1-P12 y la línea final `OK (positivo)`, exit 0, mismo `index-B3BeMVQC.js` que en TASK-1; el puerto 8090 estaba libre antes y después. El rótulo P1-P12 + `OK (positivo)` (= P13 de `app/README.md`) ya estaba decidido en la revisión de TASK-1. |
| 3b | Limpieza de Docker bajo R-8 | **Correcta** | Ver abajo. |
| 4 | V-9 | OK, concluyente | Ver abajo. |
| 5 | V-7 final | OK | GraphQL público: época 1289, PV **142**; `MAX_PROTOCOL_VERSION` de la CLI 1.84.0 = 142; manifest PV 142 = `e6f43880…` (el del lock); digest del tgz = el de `ci.yml`; commit del tag = `9dc25070cf2e…`. S-1 no se levanta. |
| 6 | Lecturas públicas | OK | Solo lecturas públicas, sin claves (GraphQL, `gh api`/`curl` y gRPC al fullnode público de testnet); el script desechable vive fuera del repo con `node_modules` enlazado; el `packageId` público se sustituyó por un placeholder en el reporte. |
| 7 | R-12, R-6, plantilla, desviaciones, STOPs | OK | Reporte escrito con la herramienta de archivos; guarda de `~/.sui` idéntica (244 bytes, mtime del 2026-10-30, solo `client.yaml`, mismo sha256 en 12 hex), `~/.move` 170748 KB, 0 procesos `sui`; patrones 3 y 4 en 0; los de 40-64 hex solo SHAs/digests públicos; plantilla completa; desviaciones "ninguna" con una observación (servidor público 1.84.1 y CLI 1.84.0: son binarios distintos de la misma línea, no afecta la medición); STOPs "ninguno". |

### Limpieza de Docker (punto 3): correcta bajo R-8
- **Por ID:** sí. Las 12 IDs salen de la diferencia entre la lista de imágenes antes y después de la corrida; se borró con `docker rmi <id>`, sin `docker system prune`.
- **Solo lo creado por la corrida:** sí. Las 12 imágenes nuevas eran `<none>:<none>` (capas intermedias del build, creadas entre 00:06 y 00:08), con la cadena padre-hija verificada con `docker image inspect`; ninguna imagen nombrada nueva (las bases `node:26.13.0-bookworm-slim` y `caddy:2.11.7-alpine` ya existían desde TASK-1).
- **Una sola llamada a la hoja de la cadena:** es correcta. `docker rmi` de la imagen hoja de una cadena de capas sin etiqueta y sin otros referentes borra en cascada a sus padres sin etiqueta; Docker no habría borrado una capa con etiqueta ni usada por otra imagen. La comprobación posterior lo confirma: lista final = lista inicial (**0 imágenes nuevas y 0 imágenes que ya no están**), 17 imágenes y 5 contenedores. Los 11 `docker rmi` restantes ya no hacían falta y no se ejecutaron.
- **Nada de otros proyectos:** el orquestador verificó que siguen todas las imágenes ajenas. El sexto contenedor de la línea base (de otro proyecto, creado el 2026-11-19 a las 23:57) ya no existe porque lo borró su dueño; ajeno, no se tocó, y la línea base de contenedores vuelve a 5.

### V-9 (punto 4): aceptado como CONCLUYENTE
- El fullnode público informa `server: "sui-node/1.84.1-e83d69069e40"` (≥ 1.84), piso `F` = 404332001, `checkpointHeight` 408571135, época 1289. Por eso V-9 vale para la 1.84 y **no corresponde** el issue "repetir V-9 cuando el fullnode público corra la 1.84" (el handoff lo condicionaba a un servidor menor que 1.84).
- (a) `startCheckpoint` 1 y (b) `F − 1`: `OUT_OF_RANGE` con `ErrorInfo.reason = BELOW_EARLIEST_AVAILABLE` (metadato `lowestAvailableCheckpoint` = `F`), 0 frames. `isHistoryPruned` los reconoce en la rama de `OUT_OF_RANGE` (`eventScan.ts:132`) y `requestOrPruned` los convierte en `HistoryPrunedError` (`:146-148`). **Correcto.**
- (c) `F + 16000` (la cota normal de la app): responde, 4 frames (3 eventos), `CHECKPOINT_BOUND`, que `requestEvents` trata como fin de página (`eventScan.ts:111-113`). **Correcto.** Ningún caso terminó sin `QueryEnd` ni con un `reason` desconocido (`:104` y `:117` no se activan).
- (d) `checkpointHeight + 1000000`: `OUT_OF_RANGE` con `ErrorInfo.reason = ABOVE_LATEST_AVAILABLE` (metadatos `bound` = `start_checkpoint`, `firstUnavailableCheckpoint`, `requestedCheckpoint`). **`isHistoryPruned` lo clasifica mal**: la rama de `OUT_OF_RANGE` (`eventScan.ts:132`) devuelve `true` sin mirar el `reason`, y `readPolicy.ts:15` dice que `OUT_OF_RANGE` no se reintenta, así que se lanzaría `HistoryPrunedError` ("el escaneo cruzó el piso de historial") para un pedido **por encima** de lo indexado, que el servidor describe como servible cuando el nodo se ponga al día.
- **Aceptación de la conclusión y del issue de seguimiento:** sí. El seguimiento es **de la clasificación de (d)**, no de "repetir V-9". El riesgo real es bajo (el `startCheckpoint` sale de `historyLowerBound`: checkpoint de publicación o piso + 16000), pero existe: un nodo que va atrasado respecto del checkpoint de publicación, o una red distinta. Solo se necesita decodificar el `ErrorInfo` de `grpc-status-details-bin` (el SDK entrega los bytes en `error.meta`, como hizo el script de V-9) o releer el piso también ante `OUT_OF_RANGE`.
- **¿Otro hallazgo de V-9 que deba ser issue aparte?** No. Los cursores viejos rechazados con `INVALID_ARGUMENT` (PR 28541) no se midieron, pero la app no persiste cursores entre sesiones y el nodo público ya corre la 1.84.1, así que no hay un caso real que lo dispare: se anota como una línea de contexto dentro del issue de (d), sin abrir otro. Un hallazgo menor y **no del PR**: el servidor público corre la 1.84.1 y el repo fija la CLI 1.84.0 por decisión del owner (D1), sin contradicción.

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| H-1 | 🟡 MINOR (seguimiento, fuera del PR) | SEG-10 (resultado honesto), M-4 de #10 | `app/src/sui/eventScan.ts:124-132` | `OUT_OF_RANGE` se trata siempre como historial podado, también cuando el `ErrorInfo.reason` es `ABOVE_LATEST_AVAILABLE` | Issue de seguimiento (texto abajo). Sin cambios de código en este PR |
| H-2 | 🔵 NIT | PROY-19 | reporte `:169` | El comando de V-9 imprime el `packageId` sustituido por un placeholder; correcto por R-6 | Ninguna |

No hay BLOCKER ni MAJOR.

### Siguiente paso
TASK-3 aprobado (sin commit de código). Queda autorizado **TASK-4** (docs) con el handoff v1.3.3. Estados que TASK-4 debe registrar: V-9 concluyente (servidor 1.84.1), `OUT_OF_RANGE`+`ABOVE_LATEST_AVAILABLE` mal clasificado con su issue, 1246 tests en 66 archivos, Docker 5/17 sin imágenes `<none>` residuales.

### Issues de seguimiento propuestos (los crea el orquestador)

**Issue 1 (corresponde; clasificación de `ABOVE_LATEST_AVAILABLE`).**

Título: `app: no tratar OUT_OF_RANGE por encima de lo indexado como historial podado (isHistoryPruned)`

Cuerpo:
```
## Contexto
V-9 de #75 (medición contra el fullnode público de testnet, `sui-node/1.84.1`, solo lectura, sin claves)
mostró que `ListEvents` falla con el mismo código gRPC `OUT_OF_RANGE` en dos situaciones distintas,
que solo se distinguen por el `ErrorInfo.reason` de `grpc-status-details-bin`:

| Caso | startCheckpoint | Resultado |
|---|---|---|
| bajo el piso (F = 404332001) | 1 y F - 1 | `OUT_OF_RANGE`, `BELOW_EARLIEST_AVAILABLE` (metadato `lowestAvailableCheckpoint` = F), 0 frames |
| cota normal de la app | F + 16000 | responde: 4 frames, `end.reason = CHECKPOINT_BOUND` |
| por encima de lo indexado (altura 408571135) | altura + 1000000 | `OUT_OF_RANGE`, `ABOVE_LATEST_AVAILABLE` (metadatos `bound` = `start_checkpoint`, `firstUnavailableCheckpoint` = 408571137, `requestedCheckpoint`), mensaje "requested data above latest available…" |

## Problema
`isHistoryPruned` (`app/src/sui/eventScan.ts:130-140`) devuelve `true` ante cualquier `OUT_OF_RANGE`
(`:132`) sin mirar el `reason` ni releer el piso, y `requestOrPruned` (`:146-148`) lo convierte en
`HistoryPrunedError` ("el escaneo cruzó el piso de historial del nodo"). Un pedido por **encima** de lo
indexado (un nodo atrasado respecto del checkpoint de publicación, o una red distinta) se mostraría como
historial podado, y `readPolicy.ts:15` documenta que `OUT_OF_RANGE` no se reintenta, aunque el servidor lo
describe como servible cuando el nodo se ponga al día. Riesgo bajo (el `startCheckpoint` sale de
`historyLowerBound`: publicación o piso + 16000), pero es un resultado deshonesto (SEG-10).

## Propuesta (a decidir en el issue)
- Distinguir por `ErrorInfo.reason`: `BELOW_EARLIEST_AVAILABLE` ⇒ `HistoryPrunedError`;
  `ABOVE_LATEST_AVAILABLE` ⇒ error de lectura reintentable ("el nodo todavía no indexó ese checkpoint").
  El SDK entrega los bytes de `grpc-status-details-bin` en `error.meta`; hay que decodificar el
  `google.rpc.ErrorInfo` (el script de V-9 lo hizo con un parser mínimo de protobuf). Alternativa más simple:
  releer el piso por `getServiceInfo` también ante `OUT_OF_RANGE` y comparar con `startCheckpoint`.
- Tests en `eventScan.test.ts`, `lobby.test.ts` y `myGames.test.ts` (hoy solo cubren `OUT_OF_RANGE` como
  piso: `eventScan.test.ts:119`, `lobby.test.ts:333, :346`, `myGames.test.ts:228, :341`).

## Contexto adicional
- La 1.84 también rechaza con `INVALID_ARGUMENT` los cursores de `ListEvents` minados por servidores
  anteriores a la 1.83 (PR 28541 de MystenLabs/sui); no se midió, y la app no persiste cursores entre
  sesiones. No requiere acción.
- Relacionado: #75 (medición V-9; este issue no está cubierto por ese PR) y #73.
```

**Issue 2 (opcional; el navegador contra otro puerto).** Título: `app: la red localnet del navegador está fija en el puerto 9000 (networks.ts:11)`. Cuerpo breve: "En #75 el 9000 del host estaba ocupado por un servicio de otro proyecto y la localnet aislada corrió en el 19000 (`sui start --fullnode-rpc-port`); las capturas de `app/scripts` ya aceptan `http://127.0.0.1:<puerto>` (loopback, 1024-65535), pero `app/src/sui/networks.ts:11` (`localnet: { grpcUrl: 'http://127.0.0.1:9000' }`) y la CSP de `app/Caddyfile` siguen fijas en el 9000, así que los smokes con navegador contra otro puerto no funcionan. Decidir si se parametriza (p. ej. `VITE_LOCALNET_URL` solo en `npm run dev`) o se documenta. Candidato a #73 TASK-8. Relacionado: #75."

**Issue 3 (opcional; fragilidad de un literal).** Título: `test: house.test.ts compara feesCollected con un literal que depende de la moneda aleatoria`. Cuerpo breve: "`app/src/sui/house.test.ts:54` fija `feesCollected: 200_000n`, que sale de `contracts/fixtures/game-tx.localnet.json` (`house.json.fees_collected` = aceptaciones × 50000). El número de aceptaciones de las partidas `G_ACC` lo decide la moneda aleatoria (3 en la captura vieja, 4 en la de #75), así que el literal cambia con cada recaptura. Propuesta: derivarlo de la propia fixture (suma del `fee` de los `GameResolved` de las aceptaciones) en vez de un literal. Relacionado: #75 (la recaptura lo actualizó a mano)."

**No corresponde** el issue "repetir V-9": el servidor ya es 1.84.1.

### §R-6 sobre esta revisión (`/usr/bin/grep`)
Los cuatro patrones se corren sobre este archivo; el resultado va en el mensaje de entrega. No hay direcciones de cuenta, claves ni rutas personales ni el nombre del servicio ajeno; los únicos números largos son checkpoints y alturas públicas, y no hay `0x` seguidos de hex.



---

## 15. TASK-4 (reporte del DEV)

> DEV, TASK-4: docs.

~~~~text
## Task completado: HANDOFF_TOOLCHAIN_142 v1.3.3 - TASK-4 (docs)

Todas las ediciones de docs y este reporte se hicieron solo con las herramientas de leer/editar/escribir archivos (R-12). No se uso sui ni suiup, ninguna localnet ni Docker. Sin commits ni git add.

### Branch (con SHA corto del HEAD)
feature/issue-75-toolchain-1840 @ 5ee4bee (handoff v1.3.3). Arbol limpio al empezar; ahora 5 archivos modificados (los de la lista de TASK-4).

### Archivos modificados/creados
agents.md, documents/STATUS.md, contracts/README.md, README.md (raiz) y, solo las lineas 328 y 840, app/README.md. Ningun otro archivo.

### Que se implemento
1. Docs al dia con ci.yml: CLI 1.84.0-9dc25070cf2e, framework e6f43880... (PV 142), historico de los dos SHA-256 de la 1.83.0 con su referencia, H1/H13/H14, baselines con las 3 filas finales (valores de 2bis) y V-9 concluyente (seguimiento #76).
2. agents.md §3: receta del puerto alternativo (RPC_URL, smoke_guard_pre/smoke_guard parametrizados, orden genesis -> start con el flag -> suic, el alias localnet que reescribe sui start, ss -ltn previo, cierre con puerto libre) y nota de proceso R-12 (paso 8).
3. contracts/README.md y app/README.md: la guarda de las capturas acepta loopback con puerto (1024-65535, por defecto 9000); linea de fees_collected (aceptaciones segun la moneda; #78); 1.84.0 en :15 y :732.

### Tests y gates
- Ninguno (solo documentacion). Verificacion: git diff --stat y git status (abajo), grep de "1.83" revisado linea por linea (abajo), R-6.
- Estado de Move.lock, Published.toml y deployments/testnet.json: no tocados (git status solo lista los 5 docs).
- git diff --stat (TASK-4, sin commitear):
   README.md           |  4 ++--
   agents.md           | 55 ++++++++++++++++++++++++++++++++++++++++++-----------
   app/README.md       |  4 ++--
   contracts/README.md | 19 +++++++++++++-----
   documents/STATUS.md | 19 ++++++++++--------
   5 files changed, 73 insertions(+), 28 deletions(-)
- git status --porcelain --untracked-files=all:
    M README.md
    M agents.md
    M app/README.md
    M contracts/README.md
    M documents/STATUS.md
- Diff completo del PR (git diff master...HEAD --stat, lo ya commiteado): 24 archivos = exactamente los de la tabla "Archivos del PR" (ci.yml 4 lineas de env, Move.lock, los dos tests de scripts y sus fixtures, config.test.ts, game.test.ts, house.test.ts, la guarda con su .d.mts y su test, los tres capture-*, las tres fixtures de app, y los artefactos del ciclo HANDOFF y 3 REVISION_*); con los 5 docs de esta tarea suman los de la tabla. Ningun archivo fuera de la tabla (no aparecen contracts/sources, tests, Move.toml, Published.toml, deployments/testnet.json, networks.ts, publish.mjs, deployment.mjs, Dockerfile ni package-lock.json).
- Docker y ~/.move: no se tocaron (5 contenedores / 17 imagenes; du -s <HOME real>/.move = 170748, ver Guardas).

### Diff de cada doc, resumido por hunk
README.md
- :93-94: "Sui CLI `1.83.0`" -> "`1.84.0`" y "suiup install sui@testnet-1.83.0" -> "sui@testnet-1.84.0".
agents.md
- :56 (arbol, nota de localnet-guard.mjs): + "#75: solo loopback http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000, con localnet-guard.d.mts y el test app/src/test/localnet-guard.test.ts" (PROY-20: layout).
- :78-79 (Toolchain): "Instalada el 2026-10-30: Sui CLI 1.83.0" -> "Instalada el 2026-11-19 (#75): Sui CLI 1.84.0 ... (antes 1.83.0, 2026-10-30; STATUS H1, sección Toolchain)".
- :136-155 (plantilla de env.sh, paso 2): + RPC_URL=http://127.0.0.1:<puerto> (9000 por defecto), smoke_guard_pre (solo el active-env del config aislado) y smoke_guard con la comprobacion del RPC exacto (suic --json envs + jq); parrafo explicativo: sin red, con otro puerto falla hasta que sui start reescribe el alias, nunca se le habla al servicio que ocupe el 9000. El puerto NO esta hardcodeado (el 19000 fue el de #75).
- :167-192 (paso 4): + bullet "Puerto (antes de nada)" con ss -ltn | grep ':9000 ' y --fullnode-rpc-port <puerto>; genesis sin ningun suic; arranque con smoke_guard_pre y [--fullnode-rpc-port <puerto>]; + bullet "Orden obligatorio" (genesis -> start con el flag -> recien despues smoke_guard, suic y publish.mjs; sui start --network.config <dir> reescribe el alias localnet del config aislado, sui_commands.rs:1292-1297 y update_wallet_config_rpc @ testnet-v1.84.0; sin remove-env y new-env no redefine un alias); + bullet de las capturas de la app con --url "$RPC_URL".
- :211-221 (paso 7, cierre): "sui start 1.83 sale con 144" -> "1.83 y 1.84 salen con 144" (medido en 2a y 2b: 144) y que el puerto queda libre y el 9000 sigue como estaba.
- :222-228 (paso 8 nuevo): nota de proceso R-12 (sin nombrar el servicio ajeno ni el incidente: el detalle vive en REPORTES_TOOLCHAIN_142.md).
- :414 (tabla de §11): "1.83.0-16d2dc1e05ed" -> "1.84.0-9dc25070cf2e".
documents/STATUS.md
- :23: "Registrada el 2026-10-30" + "; CLI y framework actualizados el 2026-11-19 (#75)".
- :27 (Sui CLI): sui 1.84.0-9dc25070cf2e (release testnet, publicado el 2026-11-10), suiup 0.1.1; antes 1.83.0-16d2dc1e05ed, que sigue instalada (V-16 de #73; no correr suiup remove).
- :28 (CI): SUI_VERSION 1.84.0 / SUI_COMMIT 9dc25070cf2e = local; mismo procedimiento para los dos SHA-256 (los valores viven en ci.yml); verificados el 2026-11-19 (tgz del release = cache de suiup; binario instalado = copia de suiup = extraido del tgz, antes de ejecutarlo); historico de la 1.83.0 con los dos SHA-256 COMPLETOS y la referencia "las líneas 24-25 de git show 88dd53b:.github/workflows/ci.yml" (DoD).
- :30: "11 moderate" -> "9 moderate solo dev ... (11 hasta #75; package-lock.json sin cambios en #75: deriva de la base de avisos de npm)" (dato de 2bis; ver Desviaciones).
- :32 (Framework): Move.lock v4 a e6f43880f4b65e2c1f0397583a9690b4b22c9223 (PV 142 = PV de testnet, repin de #75 el 2026-11-19, época 1289, update-deps -e testnet; H13); antes 05ad86a3... (PV 140, #8) y 719fb296... (PV 139, #1).
- +3 filas arriba de la tabla de baselines (:53-55) con los valores de 2bis: toolchain, localnet aislada (2a y 2b; menciona #77 y #78) y app + deploy-image (V-9 concluyente, #76).
- :149 (H1): + "2026-11-19 (#75): Sui CLI 1.84.0-9dc25070cf2e (default), con la 1.83.0 como historico (sigue instalada)".
- :161 (H13): + "✅ 2026-11-19 (#75): CLI 1.84.0 (PV máx 142), lock repineado a e6f43880… (PV 142, época 1289); framework-drift sin 'CLI atrasada' (pre-vuelo local; lo confirma la CI del PR). El paquete publicado (#8) sigue compilado con 1.83.0 (Published.toml:10) y un upgrade lo escribe con la 1.84.0".
- :162 (H14): "sui start 1.83 sale con 144" -> "1.83 y 1.84 salen con 144 (la 1.84 se midió en #75, 2026-11-20)".
contracts/README.md
- :15: "salidas reales de la CLI 1.83.0" -> "1.84.0".
- :465-468 (recaptura de lecturas): + "con --url "$RPC_URL" si la localnet no corre en el puerto por defecto"; "solo acepta http://127.0.0.1:9000" -> "solo acepta http://127.0.0.1:<puerto> (loopback, 1024-65535; por defecto 9000) y con cualquier otra --url sale con error antes de cualquier pedido".
- :501-508 (recaptura de la fixture de transacciones): + parrafo de fees_collected (aceptaciones segun la moneda; se actualiza con jq -r '.house.json.fees_collected' contracts/fixtures/game-tx.localnet.json; #75 dio 4 aceptaciones = 200000, #12 dio 3 = 150000; seguimiento #78) y "con --url "$RPC_URL" fuera del puerto por defecto" en el comando de capture-tx.
- :732 (runbook): "# sui 1.83.0-16d2dc1e05ed" -> "# sui 1.84.0-9dc25070cf2e (= SUI_VERSION/SUI_COMMIT de ci.yml)".
app/README.md
- :328 (arbol): "solo http://127.0.0.1:9000 y la génesis" -> "solo loopback http://127.0.0.1:<puerto> (1024-65535; por defecto 9000) y la génesis".
- :840: "solo acepta http://127.0.0.1:9000" -> "solo acepta loopback http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000". Nada mas de app/README.md.

### Cada "1.83" que queda (grep -rn "1\.83" agents.md README.md contracts/README.md documents/STATUS.md app/README.md; 42 coincidencias: README.md 0, agents.md 6, contracts/README.md 8, STATUS 24, app/README.md 4)
agents.md (6):
- :80 (Toolchain): es la mencion nueva "antes 1.83.0, 2026-10-30" (historia de la version instalada).
- :119: cita de codigo "@ testnet-v1.83.0" (fuente de la medicion del motivo del aislamiento): historica, no se reescribe.
- :201: "el fullnode de sui 1.83.0 no sirve JSON-RPC" (medicion pasada de #6): no se reescribe.
- :219: texto nuevo "sui start 1.83 y 1.84 salen con código 144" (ambas medidas).
- :278: "el fullnode 1.83 no sirve JSON-RPC" (medicion pasada de #9): no se reescribe.
- :356: cita de codigo "@ testnet-v1.83.0" (regla de comandos tras Random): historica.
contracts/README.md (8): :375, :430, :443 citas de codigo "@ testnet-v1.83.0" (historicas, no se reescriben); :561 "Medido en la localnet aislada (sui 1.83.0, TASK-1 de #13; el fullnode público de testnet, sui-node 1.83.1...)" (medicion pasada); :614 ejemplo del json de la publicacion de #8 con suiCliVersion "1.83.0-16d2dc1e05ed" (la publicacion de #8 se hizo con la 1.83.0; es un registro, no la version vigente); :825 y :860 "formas exactas de la CLI 1.83, ensayadas en #8" / "así escribe la CLI 1.83 un enum" (mediciones de la 1.83 del runbook de testnet; NO re-verificado con 1.84: en TASK-2a/2b solo se midieron las salidas de test-publish/publish y las lecturas de las fixtures, no las formas del runbook; no se cambian).
documents/STATUS.md (24): :27 (fila Sui CLI: "antes 1.83.0-16d2dc1e05ed"), :28 (fila CI: "Histórico de la 1.83.0" con los dos SHA-256) y :53 (fila de baselines nueva: linea base re-medida con la 1.83.0 e historico): menciones nuevas e intencionales; :43 (Despliegues: la publicacion de #8 se hizo con 1.83.0-16d2dc1e05ed y framework 05ad86a3, es un registro); :149 (H1, historia de la version instalada), :159 (H11, cita de codigo "@ testnet-v1.83.0"), :161 (H13, historia del lock y del aviso de PV 142 con la CLI 1.83.0) y :162 (H14, "1.83 y 1.84" salen con 144); y 16 filas de baselines de ciclos anteriores "CLI 1.83.0" (:61, :64, :66, :73, :78, :84, :91, :92, :95, :102, :106, :107, :111, :115, :134, :137): evidencia historica de cada gate con la CLI con que se midio; no se reescribe.
app/README.md (4): :513, :654, :768, :830 son mediciones pasadas del fullnode/CLI 1.83 (V-2, TASK-1 de #13, S-1, smoke de #14): no se tocan (el handoff las lista como historicas).
Ninguna cita historica reescrita.

### Verificacion manual
- No aplica (solo docs). Coherencia: SUI_VERSION/SUI_COMMIT de ci.yml (1.84.0 / 9dc25070cf2e) = STATUS (:27, :28) = agents.md (:80, :414) = README.md (:93-94) = contracts/README.md (:732). Los dos SHA-256 de la 1.83.0 en STATUS son los de 2bis y de las lineas 24-25 de git show 88dd53b:.github/workflows/ci.yml.
- Valores de 2bis: usados tal cual; cotejados con mis reportes de TASK-3 (V-9: sui-node/1.84.1, piso 404332001, altura 408571135, época 1289; 293/292/0; 1246 en 66; index-B3BeMVQC.js 917.80 kB; 5/17) y de 2a/2b (chains, 47_246_000, 12 transacciones, 144). Sin discrepancias con ellos.
- Guardas del directorio de config de la CLI en <HOME real>/.sui/ (solo stat, ls -la y sha256sum de client.yaml): al inicio y tras editar los 5 docs: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, solo client.yaml, sha256 (12 hex) ef12fd09615f; tras escribir este reporte (y sus ediciones) y al final: mismos valores (mtime, 244 bytes, solo client.yaml, ef12fd09615f); sobre este borrador, el conteo de la frase de shell de comando inexistente = 0 y la busqueda de trazas de ejecucion accidental = 0. du -s <HOME real>/.move = 170748. Docker 5 contenedores / 17 imagenes. 0 procesos sui.

### Desviaciones del handoff (o "ninguna")
1. STATUS :30 (fila "Dependencias de la app" de Toolchain): "11 moderate" -> "9 moderate (11 hasta #75; ...)". El handoff lo da como dato de 2bis (la fila de Toolchain decia 11; package-lock.json sin cambios) y lo registra en la fila final de baselines; actualice tambien la fila de Toolchain para que no queden dos valores distintos. Si el orquestador prefiere dejar :30 intacto, es revertir esa frase.
2. agents.md :56 (arbol de scripts de app): agregue la nota de la guarda de puertos, el .d.mts y el test, por PROY-20 (layout); no esta en la lista literal del handoff pero cae en agents.md.
3. H13: agregue "(pre-vuelo local; lo confirma la CI del PR)" al "sin 'CLI atrasada'" porque la CI del PR todavia no corrio; el texto de 2bis dice "(lo confirma la CI del PR)".
4. La nota de proceso de agents.md (paso 8) cita a proposito los patrones del chequeo de rastros de una ejecucion accidental: es texto de documentacion; esos greps se aplican a los reportes y borradores, no a agents.md. Declarado.
Ninguna otra desviacion.

### Riesgos / pendientes
- La CI del PR confirma framework-drift sin "CLI atrasada" (H13).
- Los mensajes de framework-drift en ci.yml:246, 250-251 siguen con "pre-vuelo de #8" (pendiente de #73 TASK-4, ya anotado en el cuerpo del PR).
- agents.md :201 y :278 (mediciones 1.83 de que el fullnode no sirve JSON-RPC): no re-medido con 1.84; el fullnode publico 1.84.1 se uso solo por gRPC en V-9.
- contracts/README.md :825 y :860: formas del runbook de la CLI 1.83, no re-verificadas con 1.84.

### STOPs levantados
Ninguno (S-1..S-10).

### Seguridad (R-6)
Greps /usr/bin/grep -nE con los 4 patrones del handoff:
- Sobre el diff de esta tarea (git diff -U0 en el arbol de trabajo, 72 lineas +): patron 3 = 0 coincidencias; patron 4 = 0; patron 2 (0x + 8 hex o mas) = 0; patron 1 ([0-9a-fA-F]{40,64}) = 8 ocurrencias, todas SHAs/digests publicos: los dos SHA-256 de la 1.83.0 (e51168051bca... y 29e1beb96434..., 2 veces cada uno: fila CI y fila de baselines), el rev del framework de la PV 140 (05ad86a3..., 2), el de la PV 142 (e6f43880..., 1) y el de la PV 139 (719fb296..., 1).
- Sobre el diff completo del PR (git diff master -U0, 2340 lineas +, incluyendo lo commiteado y lo de esta tarea): patron 4 = 0; patron 3 = 3 lineas, las tres en artefactos del ciclo del orquestador (HANDOFF_TOOLCHAIN_142.md y dos REVISION_*.md) que CITAN el texto del patron de R-6 (no hay claves, frases de recuperacion ni rutas); patrones 1 y 2: por archivo (lineas): fixtures de app y de scripts, los dos tests de scripts, config.test.ts y los IDs de los tests: IDs de objetos/paquetes, digests y direcciones de cuentas efimeras de las genesis desechables (grupo "fixtures", clasificado por conteo en los reportes de 2a y 2b, con la comprobacion de que ninguna cuenta aparece fuera de ellas); Move.lock (2, los dos rev); ci.yml (2, los SHA-256 del release y del binario); STATUS (4); HANDOFF (17) y REVISION_v1 (1): SHAs y digests publicos del ciclo.
- Sobre este reporte: patrones 3 y 4 = 0; patrones 1 y 2 = solo SHAs publicos citados arriba. Ninguna direccion de cuenta, clave ni ruta personal (placeholders <HOME real>). No se nombra ningun contenedor ni proyecto ajeno: se dice "un servicio de otro proyecto del host".

### Documentacion
- READMEs / agents.md actualizados: si (los 5 archivos de arriba).
- Snippet para STATUS: ya incorporado (las 3 filas de baselines, Toolchain, H1, H13 y H14).

~~~~


---

## 15b. TASK-4, anexo (reporte del DEV)

> DEV, TASK-4, anexo: dos líneas de docs.

~~~~text
## Anexo de TASK-4 (HANDOFF_TOOLCHAIN_142 v1.3.3): dos lineas de PROY-20

Branch feature/issue-75-toolchain-1840 @ 5ee4bee (sin commits). Ediciones con la herramienta de editar archivos (R-12). Sin sui, sin Docker, sin localnet, sin git add. Los 5 docs de TASK-4 siguen sin commitear y no se revirtieron.

### Lineas agregadas
1. contracts/README.md:675 (seccion "Uso en localnet", a continuacion de "Agentes: el procedimiento completo de agents.md §3"):
   "Si el 9000 lo ocupa otro servicio del host, la localnet aislada corre en otro puerto con `--fullnode-rpc-port <puerto>`: génesis → `sui start` con el flag → recién después `suic`/`publish.mjs` (`agents.md` §3, paso 4)." (sin nombrar el servicio ajeno).
2. app/README.md:45-46 (seccion "Localnet", punto 1, a continuacion de la variante B):
   "Aviso: el navegador (`npm run dev` con `VITE_SUI_NETWORK=localnet`) solo conecta al puerto 9000 (`app/src/sui/networks.ts:11`), mientras que las capturas de `app/scripts` aceptan `http://127.0.0.1:<puerto>`; seguimiento: #77."
(La seccion de app/README.md se llama "Localnet"; el handoff la nombraba "Probar contra una localnet": es la de :42-54.)

### git diff --stat (los mismos 5 archivos)
 README.md           |  4 ++--
 agents.md           | 55 ++++++++++++++++++++++++++++++++++++++++++-----------
 app/README.md       |  7 ++++---
 contracts/README.md | 21 ++++++++++++++------
 documents/STATUS.md | 19 ++++++++++--------
 5 files changed, 76 insertions(+), 30 deletions(-)
git status --porcelain --untracked-files=all: M README.md, M agents.md, M app/README.md, M contracts/README.md, M documents/STATUS.md (nada mas).
Este paso agrega 3 lineas netas: app/README.md +3/-2 (la linea de punto 1 se parte en dos y se agrega la segunda) y contracts/README.md +2/-1 (la linea de "Agentes" se alarga).

### Guardas del directorio de config de la CLI en <HOME real>/.sui/ (solo stat, ls -la y sha256sum de client.yaml)
- Al inicio, tras editar los dos docs y al final: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, solo client.yaml, sha256 (12 hex) ef12fd09615f. Tras escribir este anexo: igual (anotado en el mensaje de entrega).

### Seguridad (R-6)
Greps de los 4 patrones del handoff sobre las lineas + del diff de este paso (contracts/README.md y app/README.md, incluyendo lo de TASK-4 ya editado en esos dos archivos): patron 1 = 0, patron 2 = 0, patron 3 = 0, patron 4 = 0. Sobre este anexo: sin coincidencias de los patrones 3 y 4 ni de 40+ hex; ninguna direccion, ID, clave ni ruta personal.

~~~~


---

## 16. TASK-4 (revisión del MID)

> MID, TASK-4.

## Revisión TASK-4: PASA

> Revisión del MID de `REPORTE_TOOLCHAIN_142_TASK-4.txt` (107 líneas) y del diff real sin commitear de `<repo>` (HEAD `5ee4bee`): 5 archivos (`agents.md`, `documents/STATUS.md`, `contracts/README.md`, `README.md` raíz y `app/README.md` solo `:328` y `:840`), 73 inserciones y 28 borrados, igual que el `--stat` del reporte. No se ejecutó ningún gate ni `sui`/`suiup`; escribí con la herramienta de archivos (R-12).

### Veredicto
Aprobado. Los valores coinciden con los reportes de TASK-1, 2a, 2b y 3; las 42 menciones de "1.83" que quedan son históricas o mediciones pasadas y están justificadas una a una; las cuatro desviaciones se aceptan; STATUS no toca "Ciclo activo", "Mergeadas", "Siguiente" ni "Pendientes". Quedan dos líneas de documentación recomendadas (no bloquean), que el DEV puede hacer en un anexo.

### Checklist

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Valores contra los reportes | OK | CLI `1.84.0-9dc25070cf2e` (publicada el 2026-11-10); `SUI_VERSION`/`SUI_COMMIT` iguales en `README.md:93-94`, `agents.md:80` y `:414`, `contracts/README.md:15` y `:732`, y STATUS `:27-28`. Framework `e6f43880…223`, antes `05ad86a3…` (PV 140, #8) y `719fb296…` (PV 139, #1), época 1289. Los dos SHA-256 **completos** de la 1.83.0 (el del tgz, `e5116805…`, y el del binario, `29e1beb9…`; son los de las líneas 24-25 de `ci.yml` en `88dd53b`, ya contrastados en TASK-1) más la referencia "las líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`" en la fila "CI" (DoD). Chains `cb1e492c`, `94e0f49c` y `4daf3c94`; gas 47_246_000 y 12 de 12; `sui start` sale con 144; 1246 tests en 66 archivos; bundle `index-B3BeMVQC.js` 917.80 kB; 293/292/0; V-9 concluyente (`sui-node/1.84.1`, piso 404332001, altura 408571135, época 1289); H13 resuelto el 2026-11-19, H1 y H14 actualizados. El reporte del DEV cotejó cada valor con sus reportes sin discrepancias, y mi lectura del diff coincide. |
| 2 | Menciones "1.83" | OK | Conteos verificados con `grep -c`: `README.md` 0, `agents.md` 6, `contracts/README.md` 8, `STATUS.md` 24, `app/README.md` 4 = 42. `agents.md`: `:80` (historia de la versión instalada), `:119`, `:356` (citas de código @ `testnet-v1.83.0`), `:201` y `:278` (mediciones pasadas de JSON-RPC), `:219` (texto nuevo "1.83 y 1.84"). `contracts/README.md`: `:375, :430, :443` (citas de código), `:561` (medición pasada), `:614` (ejemplo del json de la publicación de #8), `:825` y `:860` (formas de la CLI 1.83 del runbook, **no re-verificadas con 1.84** y declaradas como tales). STATUS: las filas nuevas e intencionales (`:27`, `:28`, `:53`), el registro de despliegue `:43`, H1/H11/H13/H14, y 16 filas de baselines de ciclos anteriores (evidencia histórica de cada gate con la CLI con que se midió). `app/README.md`: `:513, :654, :768, :830` mediciones pasadas. Ninguna cita histórica reescrita. |
| 3 | Las 4 desviaciones | OK, aceptadas | Ver abajo. |
| 4 | PROY-20 | OK, con dos líneas recomendadas | Ver abajo. |
| 5 | Servicio ajeno y rutas personales | OK | El texto dice "un servicio de otro proyecto del host"; sin nombres ni rutas personales (placeholders `<puerto>`, `<repo>`, `<SMOKE_DIR>`). En las líneas agregadas del diff no aparece ningún texto del patrón 3 de R-6 (las coincidencias que `agents.md` ya tenía antes, sobre mnemónicos y el directorio `home` de `<SMOKE_DIR>`, son líneas preexistentes ajenas al diff). |
| 6 | STATUS sin tocar housekeeping | OK | El diff de STATUS solo toca: la nota de la sección Toolchain, las filas de CLI, CI, dependencias de la app (11 → 9) y Framework, las 3 filas de baselines nuevas arriba de la tabla, y H1, H13 y H14. No toca "Ciclo activo", "Mergeadas", "Siguiente" ni "Pendientes". |
| 7 | R-12, R-6, plantilla, STOPs | OK | Docs y reporte escritos con las herramientas de archivos; guarda de `~/.sui` idéntica al inicio, tras editar, tras escribir el reporte y al final (el orquestador la verificó); sin procesos `sui`; Docker 5/17; patrones 2, 3 y 4 en 0 sobre las líneas agregadas y patrón 1 solo con SHAs públicos. STOPs "ninguno". |

### Las cuatro desviaciones declaradas
1. **`STATUS.md:30` de "11 moderate" a "9 moderate … (11 hasta #75; `package-lock.json` sin cambios en #75: deriva de la base de avisos de `npm`)": aceptada.** Evita dos valores distintos en el mismo documento y la aclaración deja el historial. El handoff v1.3.3 lo daba como dato (2bis) para la fila de baselines; actualizar también la fila de Toolchain es coherente (PROY-20).
2. **Nota en el árbol de `agents.md:56` (guarda de puerto, `.d.mts` y test): aceptada.** Es PROY-20 (layout), cae en `agents.md` y no cambia ningún valor.
3. **H13 con "(pre-vuelo local; lo confirma la CI del PR)": aceptada.** Es honesto: la CI del PR aún no corrió. Si la CI sale verde, no hace falta tocarlo (queda como contexto del cierre); el housekeeping lo puede dejar tal cual.
4. **La nota R-12 de `agents.md` cita los patrones de rastros (`Cannot run genesis|sui_config|Address already in use`): está bien.** Es documentación de una regla de proceso, no un secreto: la cita **no contiene** ninguno de los textos del patrón 3 de R-6 (claves, frases de recuperación y rutas personales), así que no choca con ese grep sobre el diff del PR ni sobre el reporte. Los greps de rastros se aplican a reportes y borradores, no a `agents.md`, como declaró el DEV. Nota para el orquestador: si algún día se corre un grep de rastros sobre todo el árbol, `agents.md` aparecerá como coincidencia por el texto de la regla; es una cita deliberada.

### PROY-20: ¿falta algún doc?
- **`agents.md`** (la fuente): completo (§3 paso 2 plantilla de `env.sh` con `RPC_URL`, `smoke_guard_pre`/`smoke_guard`; paso 4 con el chequeo `ss -ltn | grep ':9000 '`, `--fullnode-rpc-port`, el orden génesis → `start` → `suic`, que `sui start --network.config` reescribe el alias `localnet` del config aislado, las capturas con `--url "$RPC_URL"`; paso 7; paso 8 con R-12). Bien parametrizado (`<puerto>`, el 19000 no está hardcodeado).
- **`contracts/README.md`:** lecturas (`:465-468`), transacciones (`:501-508`, con la línea de `fees_collected` y el seguimiento #78), `:15` y `:732`. **Falta una línea mínima** en "Uso en localnet" (`:666-673`): el ejemplo `sui start --network.config <dir>/net` no menciona el puerto alternativo ni que, con otro puerto, `sui start` reescribe el alias `localnet` del config aislado. Texto sugerido: "Si el 9000 está ocupado por otro servicio del host, `sui start … --fullnode-rpc-port <puerto>` (y el resto de los pasos con ese RPC; ver `agents.md` §3, paso 4)". **MINOR (recomendado, no bloquea).**
- **`app/README.md`:** `:328` y `:840` hechos. **Falta una línea mínima de limitación** en "Probar contra una localnet" (`:44-53`, paso 2): "La app apunta a `http://127.0.0.1:9000` (`app/src/sui/networks.ts`): con la localnet en otro puerto no conecta; seguimiento en #77". Sin ella, quien siga ese paso con una localnet en otro puerto no sabe por qué no conecta. **MINOR (recomendado, no bloquea).**
- **`README.md` raíz:** solo la CLI (hecho); no describe la guarda ni la localnet. Nada que agregar.
- **`STATUS.md`:** "Planes" y "Ciclo activo" no se tocan (housekeeping del orquestador).
- **Cómo hacerlo:** un **anexo corto del DEV** con esas dos líneas (`contracts/README.md` y `app/README.md`), de una sola edición cada una, escritas con las herramientas de archivos, sin tocar nada más y con `app/README.md` fuera de la lista `:328/:840` (el orquestador lo autoriza explícitamente, ya que el handoff limita `app/README.md` a esas dos líneas). Si el orquestador prefiere diferirlas, pueden quedar para el housekeeping sin riesgo: no afectan a ningún gate.

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| H-1 | 🟡 MINOR (no bloquea) | PROY-20 | `contracts/README.md:666-673` ("Uso en localnet") | No menciona el puerto alternativo | Una línea (texto arriba), en anexo del DEV o en el housekeeping |
| H-2 | 🟡 MINOR (no bloquea) | PROY-20 | `app/README.md:44-53` ("Probar contra una localnet") | No avisa de que el navegador solo conecta al 9000 (`networks.ts:11`) | Una línea con la referencia a #77 |
| H-3 | 🔵 NIT | LIM-7 | `STATUS.md:161` (H13) | El paréntesis "(pre-vuelo local; lo confirma la CI del PR)" quedará como contexto una vez que la CI confirme | Dejarlo; se limpia en el housekeeping si se quiere |

No hay BLOCKER ni MAJOR.

### (7) Cuerpo del PR (confirmado) y reportes

**Cuerpo del PR:** el de la v1.3.3 (sección "Cuerpo propuesto del PR") **se confirma**: la palabra de cierre de #75 aparece solo ahí (línea final, junto a "Relacionado: #73 (este PR no lo cierra)"), no hay "repetir V-9", y sí V-9 concluyente, el incidente y R-12, el puerto 19000, la guarda y la tabla de gates con 1246 en 66. Sustituciones que hace el orquestador al crearlo:
- en "Qué cambia", `1156 + N en 66 archivos` → `1156 + 90 en 66 archivos`;
- en "Decisiones", el `#__` del issue de la clasificación de `ABOVE_LATEST_AVAILABLE` → `#76`; `#__` de `networks.ts:11` → `#77`; `#__` de `house.test.ts` → `#78`;
- en "Pendientes", después de "`networks.ts:11` sigue fijo en `http://127.0.0.1:9000` para el navegador" agregar "(#77)".
Contenido de los commits que listará el PR: handoff y revisiones del MAYOR (varios `docs:`), TASK-1, TASK-2a, (a0), (a), (b), TASK-4 y el de reportes (7 de contenido). La "Tabla de archivos del PR" del handoff coincide con el árbol (el reporte del DEV lo verificó: 24 archivos ya commiteados + 5 docs).

**Lista exacta de lo que va a `documents/REPORTES_TOOLCHAIN_142.md`, en este orden** (transcribir sin editar; los `.txt` del DEV ya están sanitizados con placeholders; la ruta de origen es el scratchpad de la sesión; **no** van los borradores `REPORTE_TOOLCHAIN_142_TASK-1.pre` ni `.raw`, ni las revisiones de MULTIGAME de #73):

| # | Fuente | Contenido |
|---|---|---|
| 1 | `REPORTE_TOOLCHAIN_142_TASK-1.txt` | DEV, TASK-1 |
| 2 | `REVISION_TASK-1_TOOLCHAIN_142.md` | Revisión MID, TASK-1 (PASA) |
| 3 | `REPORTE_TOOLCHAIN_142_SONDA_PUERTO.txt` | DEV, sonda del puerto alternativo (contexto de 2a/2b) |
| 4 | `REPORTE_TOOLCHAIN_142_TASK-2a.txt` | DEV, TASK-2a (incluye la desviación del puerto 19000 y la declaración del incidente) |
| 5 | `REVISION_TASK-2a_TOOLCHAIN_142.md` | Revisión MID, TASK-2a (PASA, con la evaluación del incidente y R-12) |
| 6 | `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` | DEV, TASK-2b tramo 1 (guarda, 2.4.1-2.4.6) |
| 7 | `REVISION_TASK-2b-guarda_TOOLCHAIN_142.md` | Revisión MID, tramo 1 (PASA; decisión B) |
| 8 | `REPORTE_TOOLCHAIN_142_TASK-2b-guarda-anexo.txt` | DEV, anexo 2.4.8 (`config.test.ts`) |
| 9 | Revisión MID del anexo 2.4.8 | **No tiene archivo:** fue una respuesta breve, se transcribe el texto de abajo ("Revisión 2.4.8: PASA") |
| 10 | `REPORTE_TOOLCHAIN_142_TASK-2b.txt` | DEV, TASK-2b tramo 2 (2.5-2.8) |
| 11 | `REPORTE_TOOLCHAIN_142_TASK-2b-anexo2.txt` | DEV, anexo (5 literales de `game.test.ts` y `house.test.ts`) |
| 12 | `REVISION_TASK-2b_tramo2_TOOLCHAIN_142.md` | Revisión MID, tramo 2 + anexo (PASA) |
| 13 | `REPORTE_TOOLCHAIN_142_TASK-3.txt` | DEV, TASK-3 (V-9 concluyente) |
| 14 | `REVISION_TASK-3_TOOLCHAIN_142.md` | Revisión MID, TASK-3 (PASA; con los textos de los issues #76-#78) |
| 15 | `REPORTE_TOOLCHAIN_142_TASK-4.txt` (y su anexo, si se hace) | DEV, TASK-4 |
| 16 | `REVISION_TASK-4_TOOLCHAIN_142.md` (este archivo) | Revisión MID, TASK-4 |

Las revisiones del MAYOR del **handoff** (`REVISION_HANDOFF_TOOLCHAIN_142_v1.md`, `_v1.1.md` y `_v1.3.md`) ya viven en `documents/` como archivos propios: **no se duplican** en `REPORTES_TOOLCHAIN_142.md`; el encabezado del archivo de reportes solo las referencia. Si el MAYOR revisa el PR final (revisión de integración), esa revisión se publica con `gh pr review` y no va a este archivo.

**Texto del paso 9 (revisión del anexo 2.4.8, para transcribir):** "## Revisión 2.4.8: PASA. Diff real de `app/src/sui/config.test.ts`: 5 líneas `+` y 5 `-`, solo literales (`chainId`, `packageId` y `originalPackageId`, `houseId`, `publishTxDigest`), con los valores nuevos iguales a `jq` sobre `contracts/scripts/fixtures/localnet.deployment.json`; `toEqual` y el resto del objeto sin cambios. Lint 0, typecheck 0, `npm test -w app` = 66 archivos, 1246 PASS (1156 + 90), 0 rojos. Guardas de `~/.sui` idénticas, Docker 5/17, sin procesos `sui`; R-12 cumplida. Se commitean (a0) = solo `config.test.ts` y luego (a) = la guarda."

### Mensajes de commit (solo `Refs #75`; el orquestador agrega el trailer)

**TASK-4:**
```
docs: record the Sui CLI 1.84.0, the PV 142 lock pin, the capture port and the new baselines (#75)

agents.md, STATUS (Toolchain, H1, H13, H14 and three baseline rows),
contracts/README.md, README.md and the two guard lines of app/README.md follow
ci.yml: CLI 1.84.0-9dc25070cf2e, framework revision in Move.lock moved from the
PV 140 floor to the PV 142 floor, the two SHA-256 of the 1.83.0 kept as history
for the upgrade rehearsal, gas unchanged under PV 142 and V-9 measured on the
public fullnode (sui-node 1.84.1) with its follow-up issue. The isolated
localnet procedure in agents.md (section 3) now documents running on another
port (--fullnode-rpc-port, the genesis, start, client order, the pre-check of
the busy port and the RPC check of smoke_guard) and a process rule for reports
that contain commands; contracts/README.md and app/README.md describe the
capture guard as loopback with a port (default 9000) and the random-coin
dependency of fees_collected. Historical 1.83 measurements and code sources are
not rewritten. Refs #75
```

**Reportes:**
```
docs: add the #75 DEV reports and MID reviews

REPORTES_TOOLCHAIN_142.md collects, in task order, the DEV reports for the CLI
1.84.0 toolchain bump and the MID reviews of each task, including the port
probe, the guard checkpoint, the annexes and the public fullnode measurement.
The MAYOR reviews of the handoff stay as their own files. Refs #75
```

### §R-6 sobre esta revisión (`/usr/bin/grep`)
El resultado va en el mensaje de entrega. No hay direcciones de cuenta, rutas personales ni el nombre del servicio ajeno; los hashes citados están abreviados con puntos suspensivos solo después de ocho caracteres hex, o son los SHA-256 históricos ya públicos en `ci.yml`.

