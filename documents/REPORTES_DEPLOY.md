# Reportes del ciclo — #7 Deployments y script de publicación

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador (el harness no
> deja escribir archivos de reporte a los subagentes). La salida de `sui move test` (83 `[ PASS ]`, idéntica
> a la de #6) se resume; el resto va literal.

## Task completado: HANDOFF_DEPLOY — TASK-1

### Branch (con SHA corto del HEAD)
`feature/issue-7-deployments` @ `eb8489d`. Sin commits, pushes ni cambios de branch; worktree `Battleship-issue9` no tocado.

### Archivos modificados/creados (nuevos, sin trackear; `git status --porcelain` = solo estos 5)
- `contracts/scripts/deployment.mjs` (377 líneas) · `contracts/scripts/deployment.test.mjs` (306 líneas)
- `contracts/scripts/fixtures/localnet-publish.json` (salida real de `test-publish`, sin editar)
- `contracts/scripts/fixtures/localnet-publish-dry-run.json` (salida real de `test-publish --dry-run`, sin editar)
- `contracts/scripts/fixtures/Published.localnet.toml` (escrito por la CLI al publicar la copia, D6, sin editar)

### Qué se implementó (3 líneas máx)
1. Tres fixtures reales de la CLI 1.83.0 en la localnet aislada (`agents.md` §3), incluido el `Published.toml` de la copia autorizada por D-20261102-03 §2.
2. `deployment.mjs` ESM puro (sin I/O, sin `process`, sin dependencias, JSDoc): `normalizeId`, `parsePublishOutput`, `parseDryRunOutput`, `buildDeployment`, `validateDeployment`, `parsePublishedToml`, `checkConsistency`, `readFrameworkRev`, `redactAddresses`.
3. 44 tests con `node --test`.

### Tests y gates
- Contracts (forma canónica): `sui 1.83.0-16d2dc1e05ed`; build exit 0 (0 warnings); `--lint` exit 0 (0 lints); test `Test result: OK. Total tests: 83; passed: 83; failed: 0` exit 0; `git diff --exit-code -- Move.lock` = 0.
- Scripts (`cd contracts && node --test scripts/*.test.mjs`, Node v26.13.0 por ruta absoluta):
```
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
✔ validateDeployment: falta <campo> (×14: schemaVersion … frameworkRev)
✔ validateDeployment rechaza: clave desconocida / ID corto / ID en mayúsculas / testnet con chain id ajeno / localnet con el chain id de testnet / localnet con el chain id de mainnet / sourceCommit null en testnet / network mainnet / publishTimestamp sin milisegundos / publishTimestamp sin Z
✔ validateDeployment: opcional registrado ausente es válido y con formato malo es error
✔ parsePublishedToml lee cada campo del fixture real
✔ parsePublishedToml rechaza una línea inesperada con su número
✔ checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia
✔ readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo
✔ redactAddresses oculta direcciones y deja intactos digests y texto sin hex
✔ normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex
ℹ tests 44 · pass 44 · fail 0 · exit=0
```

### Verificación manual (localnet aislada)
- `<SMOKE_DIR>` en el scratchpad; `env.sh` según §3; génesis exit 0; red en segundo plano con `exec` (PID 56166); `smoke_guard` verde en cada llamada, ningún `GUARD-FAIL`.
- Chain id localnet: `87818ef5`. Cuentas: 5 alias de la génesis; `ADMIN` = primera dirección.
- Dry run (`test-publish --build-env testnet --pubfile-path $SMOKE_DIR/Pub.dry.toml --dry-run`): exit 0, `success`, sin digest (C10); gas 1 000 000 + 46 246 000 − 0 = 47 246 000 MIST; `Pub.dry.toml` creado (C7).
- `test-publish`: exit 0, `success`, digest `C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz`, checkpoint 180; House compartida (`initial_shared_version` 2); `Move.lock` intacto (mismo sha256).
- Copia con `[environments] localnet = "87818ef5"` (D6), `publish` en segundo plano con `MOVE_HOME` aislado: exit 0, `success`, digest `AvwBN71Ea9Ayezr1tpKjPCHgTm3HHZWhrjx9NXTfA1xE`; escribió `Published.toml` con `[published.localnet]`; stderr solo `Downloading…` + build.
- `$SMOKE_DIR/move` = 56M (framework de la PV de la localnet en el lock de la copia; en el repo nada cambió). `~/.move`: `du -s` = 56204 antes y después; `find ~/.move -newer move-mark` vacío.
- Fixtures: `jq empty` exit 0; grep `suiprivkey|mnemonic|recovery|phrase|/home|/tmp|santiago|scratchpad|claude` → 0 en los tres; `Published.toml` sin direcciones de cuentas ni rutas; copiados con `cp` y verificados con `cmp`.
- Cierre: `kill <pid>`; `kill -0` falla en otra llamada; `rm -rf <SMOKE_DIR>` verificado; `~/.sui/sui_config/client.yaml` = `2026-10-30 17:52:52.515735237 -0500 244`, `ls` = `client.yaml` (idéntico a la línea base); `Move.lock` exit 0; sin `contracts/Pub.*.toml` ni `contracts/Published.toml`.

### Desviaciones del handoff
1. Publicación de la copia (D6): autorizada por D-20261102-03 §2, ejecutada según §3.1 paso 3.
2. **Direcciones en los fixtures JSON:** `localnet-publish*.json` contienen la dirección de la cuenta `ADMIN` de la génesis aislada (en `sender`, `owner`, `gasData.owner`, `balanceChanges`) y una `txSignature` pública. Es inherente a la salida cruda (C9); el handoff lo permite (§3.1 paso 4) y el test SEG-3 lo necesita; la clave se destruyó con `<SMOKE_DIR>`. El brief del orquestador pedía "sin direcciones de cuentas"; se siguió el handoff. `deployment.mjs`, el test y el json armado no la contienen (grep 0).
3. C10 del plan: el dry run `--json` de 1.83.0 **no** trae `suggestedGasPrice` (claves: `balanceChanges, effects, events, executionErrorSource, input, objectChanges`) y sí trae `effects.transactionDigest`; `parseDryRunOutput` no depende de ninguna. Corregir C10 en TASK-3.
4. Internos: `normalizeId` acepta con o sin `0x`; `parsePublishedToml` estricto (clave desconocida/duplicada, fuera de sección o sección incompleta ⇒ error con número de línea); `gasEstimate` en `bigint`; `validateDeployment(obj, { optionalFields })` con registro inyectado; constantes exportadas `TESTNET_CHAIN_ID`, `MAINNET_CHAIN_ID`, `SCHEMA_VERSION`, `DEPLOYMENT_FIELDS`; tests extra (orden de `objectChanges`, House no compartida, `ok = false`).

### Riesgos / pendientes
- Punto 2 de Desviaciones (direcciones de la génesis efímera en los fixtures).
- Los IDs de `Published.localnet.toml` son de la copia, no del paquete de `localnet-publish.json` (dos publicaciones en la misma génesis); TASK-2 lo contempla en `checkDeployments` (reetiquetado en memoria).

### Documentación
- READMEs / `agents.md`: TASK-3. Snippet STATUS: #7 TASK-1 con 44 tests PASS, gates sin delta, `~/.sui/` y `~/.move` sin cambios; hallazgo C10.

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador. El MID leyó el código entero, inspeccionó los fixtures con `jq`/`grep` y contó los 44 tests en el código (9+2+1+1+14+10+1+1+1+1+1+1+1).

**Bien:** `deployment.mjs` sin `import`/`process`/`console`/`fs`/`child_process`, determinista, JSDoc con el porqué; `DEPLOYMENT_FIELDS` (`:15-30`) = 14 campos en el orden de `HANDOFF:128` (test `:166-167`); validación estricta (`:203-250`: claves desconocidas, formatos, chain ids testnet `4c78adac` / localnet ≠ testnet/mainnet, `sourceCommit` null solo en localnet, opcionales registrados); `redactAddresses` con el regex de v2-4 (`:46`); `parsePublishOutput` por tipo, House `Shared`, sin `sender`/`owner`; `parseDryRunOutput` con gas 47 246 000; `readFrameworkRev` = lógica de `ci.yml:155-158`; literales de los tests = fixtures; fixtures limpios (sin claves, frases ni rutas; una sola dirección de cuenta, la del `ADMIN` efímero; una `txSignature`); gates sin delta; `~/.sui/` y `~/.move` intactos.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🟡 LIM-11 | `deployment.mjs:280-311`; `deployment.test.mjs:253-258` | El parser estricto de `Published.toml` tiene 7 errores y solo 2 testeados | TASK-2 (A3) |
| H2 | 🟡 PROY-19 | `REPORTES_DEPLOY.md` | Output de `node --test` y gates resumidos al transcribir (la nota decía "literal") | Desde TASK-2, output crudo; el orquestador declara cualquier resumen |
| H3 | 🔵 LIM-5 | `deployment.mjs:219-226` | Regla de chain id por red se repetiría en TASK-2 | A1: extraer `chainIdError` |
| H4 | 🔵 Handoff | `HANDOFF:411-412` | El TOML es de la copia y el json de otra publicación | A2 |
| H5 | 🔵 LIM-7 | `deployment.mjs:83, 144-145, 153-154` | JSDoc "no lanza" impreciso | A4 |
| D1 | **Decisión** | `fixtures/localnet-publish*.json` | Dirección y `txSignature` de la cuenta efímera de la génesis | **Aceptadas**: el handoff aprobado lo permite (`HANDOFF:115-116`, `REVISION_PLAN_DEPLOY.md:77-79`, `PLAN_DEPLOY.md:464`); no es secreto (SEG-3; cuenta aleatoria, clave destruida); editar rompería "sin editar" y el test SEG-3; "ninguna dirección" (D1) aplica al json de despliegue. Condición: recapturar solo en localnet aislada; documentarlo en TASK-3 (A5) |
| D2 | **Decisión** | `PLAN_DEPLOY.md:78` | C10: el dry run no trae `suggestedGasPrice`; sí `effects.transactionDigest` | Gana el fixture real; A4 y A6 |

### Siguiente paso: TASK-2 autorizado tras el handoff v1.1 (A1-A7)

### Mensaje de commit propuesto
`contracts: add deployment format module, tests and real CLI fixtures (#7)`.

## Task completado: HANDOFF_DEPLOY (v1.1) — TASK-2

> Reporte del DEV transcrito por el orquestador. La salida de `sui move test` (83 PASS, idéntica a la de #6) y las 44 líneas de TASK-1 se resumen; las líneas nuevas de `node --test` y los `ℹ` van literales.

Branch @ `ef1a720`, sin commits. Ninguna red levantada; el camino `publish` no se ejecutó contra la CLI.

### Archivos
- Creados: `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `contracts/scripts/fixtures/localnet.deployment.json`.
- Modificados: `.github/workflows/ci.yml` (solo los 4 steps de §3.3), `agents.md` §3 (filas de gate, fila de publicación, tabla "Quién corre qué", frase bajo la tabla), `contracts/scripts/deployment.mjs` (A1 `chainIdError`, JSDoc A4, bug declarado del parser), `contracts/scripts/deployment.test.mjs` (A3 + comentario en `checkConsistency`).

### Qué se implementó (3 líneas máx)
1. `publish.mjs` con `publish` (7 guardas en orden, `meta.json` antes de invocar la CLI, salida cruda en dir `0700` con archivos `0600`, nunca imprime stdout), `record` y `check`; una sola llamada a la CLI (`runSui`, lista blanca por vector completo) y una a git (`runGit`); decisiones en funciones puras exportadas.
2. `fixtures/localnet.deployment.json` generado con `record`.
3. 4 steps en el job `contracts` y filas de gate + "Quién corre qué" en `agents.md` §3.

### Tests y gates
- Mutaciones (hechas y revertidas, `cmp` OK), cada una rompe exactamente 1 test: chain id antes de comparar el env; guarda de config sin `userInfo().homedir`; `CI` saltando la confirmación.
- `~/.sui/` línea base antes y después idéntica (`2026-10-30 17:52:52.515735237 -0500 244`, `client.yaml`).
- Contracts: build exit 0, `--lint` exit 0, test `83 passed` exit 0, `Move.lock` exit 0.
- Scripts (Node v26.13.0): las 44 de TASK-1 ✔ y además:
```
✔ parsePublishedToml rechaza: clave desconocida, con su número de línea
✔ parsePublishedToml rechaza: clave duplicada, con su número de línea
✔ parsePublishedToml rechaza: sección duplicada, con su número de línea
✔ parsePublishedToml rechaza: sección incompleta, con su número de línea
✔ parsePublishedToml rechaza: build-config que no es tabla en línea, con su número de línea
✔ parsePublishedToml rechaza: entero mal formado, con su número de línea
✔ parsePublishedToml rechaza: texto sin comillas, con su número de línea
✔ runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado
✔ runSui invoca cada vector permitido
✔ runSui rechaza sin invocar todo vector fuera de la lista blanca
✔ runSui no invoca sin un configDir validado
✔ publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca
✔ runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/
✔ parseCliArgs: subcomandos y opciones válidos
✔ parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y
✔ main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI)
✔ checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet
✔ checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui
✔ checkConfigDirGuard acepta una config propia y devuelve su realpath
✔ checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id
✔ checkNetworkGuard: chain id según la red
✔ readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier
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
✔ checkDeployments: Published.toml con formato inválido ⇒ error con su línea
✔ fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos
✔ formatSummary: los 14 campos y el siguiente paso, sin direcciones de cuentas
✔ formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo
✔ interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout
✔ interpretCliRun: salida real ⇒ el resultado del parser
ℹ tests 87
ℹ suites 0
ℹ pass 87
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 141.531189
exit=0
0 despliegues
check exit=0
```
- YAML válido; `git diff` de `ci.yml` = 4 steps (+11 líneas, entre "Test" y "Move.lock y árbol sin cambios"); `child_process`/`spawnSync` solo en `publish.mjs:10`, `:133-136` (`runSui`), `:160-163` (`runGit`); step "Node de .nvmrc" simulado exit 0. App y tablas: no aplica.

### Verificación manual
- Sin transacciones ni red. Única llamada a `sui` fuera de gates: `printf 'n\n' | sui client --json active-env` → `"testnet"` (`stat` de `client.yaml` igual antes y después).
- `record` (sin `sui`): `node scripts/publish.mjs record --network localnet --from scripts/fixtures/localnet-publish.json --source-commit ef1a72026cdf02ffbabf46c34016cc151cacc620 --sui-cli-version 1.83.0-16d2dc1e05ed --framework-rev 719fb2960ccfbf9f4d33041f8ea5146d30671696 --chain-id 87818ef5 --out scripts/fixtures/localnet.deployment.json` → exit 0; resumen con los 14 campos y el comando `update_fee_rate` (la primera línea, ruta absoluta local, no se pega).
- Cierre: `git status` solo con los archivos listados; sin `contracts/Pub.*.toml`, `Published.toml`, `deployments/` ni `/tmp/battleship-publish-*`; `~/.sui/sui_config/` idéntico.

### Desviaciones
1. A1 `chainIdError` (autorizada), usada en los tres sitios; mensajes iguales; 44 tests de TASK-1 sin cambios.
2. Bug declarado en `parsePublishedToml`: sección incompleta se reportaba en la línea siguiente o final; ahora en su cabecera (test A3 `Published.toml:5:`).
3. **A decidir:** `record` sin `meta.json` exige también `--chain-id` (la salida de la CLI no lo trae y el campo es obligatorio); el comando de §3.2 no lo incluía.
4. Directorio temporal y `meta.json` se crean tras las guardas 1-5 y **antes del dry run**; la salida del dry run también se guarda (`0600`); con `--dry-run` se imprime ese directorio con "bórralo cuando termines".
5. Rutas de `--pubfile-path`/`--out`/`--from`/`--meta` resueltas a absolutas desde el cwd del usuario.
6. `record` usa `meta.json` si existe (flags ignorados); `--meta` inexistente ⇒ error.
7. `check`: entrada `[published.<red>]` sin json ⇒ error aunque no exista `deployments/`.
8. Exports extra (`CONTRACTS_DIR`, `NETWORKS`, `EXIT`, `UsageError`, `CONFIRMATION_PROMPT`, `parseCliArgs`, `checkPublishArgs`, `readCliJson`, `chainIdFromCli`, `interpretCliRun`, `main`); `NETWORKS` duplicado con la constante privada de `deployment.mjs` (2 usos).
9. Salida con `process.stdout/stderr.write` (LIM-4); entrada con `import.meta.main`.
10. Tests de `main` solo con argumentos que fallan antes de leer config o invocar la CLI.
11. `agents.md`: frase bajo la tabla ajustada ("seis" filas, "de los gates").
12. A4: sin `suggestedGasPrice` ni `effects.transactionDigest`; errores vía `interpretCliRun` → `formatCliFailure` sin stdout (test con marca).

### Riesgos
- Forma de `sui client --json chain-identifier` (`{ base58, hex }`) sin verificar (necesita red; la cubre `SMOKE_DEPLOY.md`), igual que el I/O completo de `publish` en localnet.
- `RETRY_ADVICE` también tras un dry run fallido (inocuo).
- CI del PR pendiente (orquestador).

### Documentación
`agents.md` §3 actualizado; README y resto en TASK-3. Snippet STATUS: scripts de despliegue 87 tests PASS (51 + 36), `check` "0 despliegues" exit 0, ambos steps del job `contracts`; gates de contratos sin delta.

> **Desviación (registrada por el orquestador, hallazgo H1 de la revisión de TASK-2):** el DEV corrió `printf 'n\n' | sui client --json active-env` contra la config real (`~/.sui/`), fuera de la localnet aislada. El handoff lo prohíbe; **el brief del orquestador lo permitía** ("nada contra la config de `~/.sui/` salvo `active-env` con guard"), así que el origen es del orquestador. Sin daño: `active-env` solo lee (C12), el `stat` de `client.yaml` quedó igual y ahí no hay claves. Desde B4 (handoff v1.2) ningún `sui client …` corre sin el prefijo de la localnet aislada.

## Revisión TASK-2: PASA

> Revisión del MID transcrita por el orquestador. Leyó completos `publish.mjs` (671) y `publish.test.mjs` (557), los diffs de `deployment.*`, `ci.yml`, `agents.md` y el fixture nuevo.

1. **Ningún camino publica en testnet sin el owner:** guardas en orden (`publish.mjs:513-588`): argumentos (`:516`), config (`:520-528`), env activo y solo si coincide chain id (`:531-535`), versión de la CLI vs `ci.yml` (`:537-545`), árbol limpio y sin publicación previa (`:548-555`), `meta.json` (`:559-568`) antes del dry run con `ok` y lock sin cambios (`:570-575`), confirmación (`:582-585`); `record`/`check` no invocan la CLI (`spawnSync` solo en `runSui :136` y `runGit :163`); solo lee `SUI_BIN` y `SUI_CONFIG_DIR`; `--yes`/`-y`/`--force` → exit 2; confirmación sin bypass por env. Límite reconocido (un agente con config propia, faucet y pseudo-TTY podría publicar a propósito): aceptado por D-20261102-03; ningún camino accidental.
2. **`~/.sui/` protegido:** `checkConfigDirGuard` (`:204-223`) exige `SUI_CONFIG_DIR` absoluto, existente, con `client.yaml`, sin fallback; compara `realpath` contra `<home>/.sui` para `os.homedir()` y `os.userInfo().homedir`; mensajes sin la ruta; tests de todos los casos (incl. symlinks y `HOME` redefinido).
3. **`runSui`** (`:111-150`): lista blanca por vector completo, rechazo de `-y`/`--yes`/`--client.config[=]`/`--client.env[=]`, `input: 'n\n'`, `shell: false`, `maxBuffer` 64 MiB, `cwd` `contracts/`, sin `configDir` no invoca.
4. **Nunca stdout ni direcciones:** `readCliJson`, `formatCliFailure`, `interpretCliRun` (redacta), `runAndKeep` (archivos `0600` en dir `0700`), `formatSummary` solo 14 campos; tests con marcas.
5. **`check` (ARQ-6)** (`:432-468`) con todos sus casos testeados; caso coherente según A2.
6. Bug del parser corregido (sección incompleta en la línea de su cabecera).
7. Addendum v1.1 aplicado (A1-A4, A7).
8. CI (4 steps entre "Test" y "Move.lock…", `setup-node` v7.1.0) y `agents.md` §3 correctos; 44 + 7 + 36 = 87.

**Desviación 3 aceptada** (`record` sin `meta.json` exige `--chain-id`; pasa por `chainIdError`). Desviaciones 1, 2, 4-7, 9-12 aceptadas.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🟠 Proceso (`HANDOFF:42-44`, `:429`, D4) | este archivo | `sui client --json active-env` contra la config real | Registrado arriba; informar al owner; B3/B4 |
| H2 | 🟡 HU de TASK-2, v2-4 | `publish.mjs:589`, `:593-598` | Errores posteriores a publicar no muestran el directorio temporal ni el consejo de `record` | B1 |
| H3 | 🔵 LIM-8 | `publish.mjs:446-462` | `deployments/testnet.json` = `null` ⇒ `TypeError` opaco | B1 opcional |
| H4 | 🔵 | `publish.mjs:44-46`, `:631` | `RETRY_ADVICE` también en `record`/dry run | B1 opcional |
| H5 | 🔵 LIM-5/LIM-3 | `publish.mjs:34`, `:320` | `NETWORKS` duplicado; `CONFIRMATION_PROMPT` exportado sin uso | B1 opcional |
| H6 | 🔵 Riesgo | `publish.mjs:262-264` | Forma de `chain-identifier` e I/O de `publish` sin verificar | Smoke (B3) |

### Siguiente paso: TASK-3 autorizado con el handoff v1.2 (B1-B4)

### Mensaje de commit propuesto
`contracts: add guarded publish script and CI deployment check (#7)`.

## Task completado: HANDOFF_DEPLOY (v1.2) — TASK-3 (B1 + docs + smoke)

> Reporte del DEV transcrito por el orquestador (resumido; los 83 nombres de test Move y los 90 de `node --test` se omiten; conteos y exit codes literales).

- Branch `feature/issue-7-deployments` @ `7687ae0`, cambios sin commitear: `contracts/scripts/{publish,publish.test,deployment}.mjs`, `contracts/README.md`, `agents.md`, `documents/{ESTANDARES,STATUS,HANDOFF_DEPLOY,SMOKE_DEPLOY}.md`.
- **B1:** nueva función pura `formatPostPublishFailure` (digest, `Directorio temporal: <dir>`, ruta de la salida, receta de `record`, aviso del STOP de #8); el bloque posterior a publicar de `commandPublish` va en `try/catch` que relanza con ese mensaje; `runAndKeep` recibe objeto y devuelve `outputPath`. **H3:** json que no es objeto → error legible en `check`. **H4:** parámetro `afterPublish` (falso por defecto) en `formatCliFailure`/`interpretCliRun`; `record` pasa `dir: null`. **H5:** `NETWORKS` exportado desde `deployment.mjs`; `CONFIRMATION_PROMPT` deja de exportarse.
- **Docs:** README "Despliegues" (esquema de 14 campos con IDs ficticios `0x1111…`–`0x4444…`, qué no va, compatibilidad, `Published.toml` + `check`, localnet/testnet —solo el owner—, recuperación con flags de B2 y nota A5), tabla de rutas, "Versionado", "ID de la House"; `agents.md` §2/§3/§5/§11/§12; ARQ-6 (ESTANDARES v1.7); STATUS (Prerrequisito, H11, H13, baseline de scripts); HANDOFF l.343 `--chain-id 87818ef5` (B2).
- **Gates:** `sui 1.83.0-16d2dc1e05ed`; build/lint/test `exit=0`, `Test result: OK. Total tests: 83; passed: 83; failed: 0`; `Move.lock diff exit=0`. `node --test scripts/*.test.mjs` (Node v26.13.0) `tests 90 / pass 90 / fail 0`, `exit=0`; `publish.mjs check` → `0 despliegues`, `exit=0`. Tests nuevos: `formatCliFailure` sin publicación real, `formatPostPublishFailure` (H2), `checkDeployments` con json no objeto (H3); modificados los de `formatCliFailure`/`interpretCliRun` con `afterPublish: true`.
- **Criterios TASK-3:** grep de secretos sobre el diff de docs → solo IDs ficticios; `suiprivkey|mnemonic|/home/|santiago|scratchpad` → 0; opciones, rutas de fixtures y `.gitignore:7` existen.
- **Smoke `SMOKE_DEPLOY.md`: PASA 12/12** (pasos 0-11 y 13; paso 12 fuera por D-20261102-03), prefijo B4 en todo `sui client`. Chain id `6a133a37`. Paso 2: `active-env` → `"localnet"`, `chain-identifier` → `{"base58","hex"}` (verifica H6). Paso 3: dry run, gas 47246000 MIST, dir `700`/archivos `600`, sin json. Paso 4 (variante A): digest `D1JeNmeyNssWxGa4R3eQXfWtj5xmGWbAQJes1zb8nuWe`, `sourceCommit` `null`, `ADMIN` ausente de la salida (`grep -c` = 0). Paso 5: House compartida (`fee_rate` 0, `min_bet` 1000000, `max_bet` 50000000000), `HouseCap` de `ADMIN` (con `jq`, sin pegar). Paso 6: `update_fee_rate(250)` digest `EgTcft4AtjQnEf5PgEFB1tq8qnEmu5chZyPy4CaKDN7a`. Paso 7: doble publicación `exit=1`, sin stdout, sin json. Paso 8: `record` `exit=0`, `cmp=0`. Paso 9 (variante B): digest `BvEzy5Z9WH7piSKXB72DzroYKZqEocqR9AwBg7h9u9Ax`, escribe `contracts/deployments/localnet.json`. Paso 10: `1 despliegue(s) válidos y coherentes con Published.toml`, ignorado por git. Paso 11: tres negativos `exit=1`, centinela nunca invocado. Paso 13: cierre por PID (exit 144 del proceso = terminación por `kill`), `deployments/` y `<SMOKE_DIR>` borrados, `~/.sui/sui_config/client.yaml` `2026-10-30 17:52:52.515735237 -0500 244` idéntico, `Move.lock` sin delta, puerto 9000 libre.
- **Desviaciones:** (1) B1 implementado como se describe; (2) H4 con `afterPublish`; (3) H3/H5 según addendum; (4) smoke corrido sin commitear TASK-3 (por indicación del orquestador): precondición "árbol limpio" no cumplida, registrada en pasos 0 y 10, sin efecto en resultados; (5) `agents.md` §12: se quita "o del orquestador con autorización explícita por publicación" (contradecía D-20261102-03) → "solo el owner"; (6) `agents.md` §3 paso 4: la publicación efímera pasa a usar el script (variantes A/B).
- **Riesgo H-1 (🔵):** con `--json`, la CLI 1.83.0 escribe el motivo de un rechazo previo a la ejecución ("Your package is already published…") en **stdout** (stdout 1 / stderr 0). Como el script nunca muestra stdout, el mensaje queda en "la CLI terminó con estado 1" + ruta; sin fuga. Riesgo para C8: `Error executing transaction '<digest>'` podría salir por stdout y no se extraería el digest (no verificado). Propuesta: con estado ≠ 0 y stdout no JSON, extraer de stdout solo el digest (misma regex) o mostrar el stdout pasado por `redactAddresses`.

## Revisión TASK-3: PASA (con ronda corta C1–C3 antes del PR)

> Revisión del MID transcrita por el orquestador (resumida). El MID revisó el `git diff` completo, las mtimes y `SMOKE_DEPLOY.md`; no corrió gates ni `sui`.

Código: B1 (`publish.mjs:626-644` en `try/catch` → `formatPostPublishFailure` `:357-367`), H3 (`:476`, tests con `null`/`[]`/`"testnet"`), H4 (`:340-349`, `record` con `dir: null` `:672`), H5 (`deployment.mjs:39`) correctos; 87 + 3 = 90 tests. Docs correctas; grep sin claves, direcciones de cuentas ni rutas personales. Desviaciones 5 y 6 aceptadas; paso 12 fuera aceptado (el negativo de B3 chocaba con D4 y v2-1: error del MID).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🟡 HU de TASK-2, C8 | `publish.mjs:343`; `README.md:548` | H-1: con `--json` el motivo del rechazo sale por stdout; un `Error executing transaction '<digest>'` por stdout no mostraría el digest | **Ahora** (C1): con estado ≠ 0, buscar el digest en stderr y luego en stdout (misma regex), imprimir solo `Digest de la transacción: …` + línea fija "Motivo de la CLI en <outputPath> (revísalo ahí; no lo pegues: puede traer tu dirección)"; con estado 0 no mirar stdout. Nunca mostrar stdout (v2-4). 4 tests nuevos con `STDOUT-MARK` y dirección del fixture que no deben aparecer |
| H2 | 🟡 D-20261102-03 | `FLUJO_AGENTES.md:15`, `:25`; `agentes/ORQUESTADOR.md:30` | Siguen diciendo que el orquestador publica en testnet con autorización | El orquestador los alinea en este PR ("solo el owner") |
| H3 | 🟡 Evidencia (desviación 4) | `SMOKE_DEPLOY.md:39`, `:43`, `:73` | Con árbol sucio `sourceCommit` = `null`: la rama `rev-parse HEAD` no corrió | C3: re-corrida post-commit (pasos 0, 1, 4 con `sourceCommit` = HEAD, 7 con el mensaje nuevo, 13) |
| H4 | 🔵 Docs | `README.md:558` | Receta `tx-block` sin `SUI_CONFIG_DIR` ni `printf 'n\n' \|` | C2 |
| H5 | 🔵 Docs | `README.md:514` | `SUI_CONFIG_DIR=<dir>/net` sin "(ruta absoluta)" | C2 |
| H6 | 🔵 | `publish.mjs:45` | `MISSING_PUBLISHED_TOML_ADVICE` no cubre "existe pero no coincide" | C1 opcional |

### Siguiente paso
Commitear TASK-3 tal cual (árbol del smoke); handoff v1.3 con C1 (código H1 + H6 opcional), C2 (README `:548`, `:558`, `:514`), C3 (re-smoke post-commit); el orquestador alinea H2; revisión MID de C1–C3; luego PR contra `master` (`Closes #7`) y revisión de integración del MAYOR.

## Task completado: HANDOFF_DEPLOY (v1.3) — C1 + C2

> Reporte del DEV transcrito por el orquestador (resumido; nombres de tests omitidos, conteos y exit codes literales).

- Branch `feature/issue-7-deployments` @ `00a4539`, sin commits. Modificados: `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `contracts/README.md`, `documents/STATUS.md`.
- **C1 (H-1):** `formatCliFailure({ reason, status = 1, stdout = '', stderr, dir, outputPath, afterPublish = false })`; `interpretCliRun` le pasa `status` y `stdout`. Con `status !== 0`: digest de stderr y, si no está, de stdout (solo el grupo capturado) → `Digest de la transacción: <digest>`; siempre `Motivo de la CLI en <outputPath> (revísalo ahí; no lo pegues: puede traer tu dirección)`. Con `status === 0` no se mira stdout. Nunca se muestra stdout. JSDoc actualizado. Callers existentes (`:531`, `:547`, `:550`) usan los defaults.
- **H6:** "Si `Published.toml` falta o no coincide con el json (testnet), es STOP de #8: no lo edites a mano."
- **C2:** README H5 (ruta absoluta), H1 (digest de stderr o de la salida `--json`, motivo en la ruta, nunca stdout), H4 (`printf 'n\n' | SUI_CONFIG_DIR=<su dir> sui client --json tx-block <digest> > <dir>/tx-block.json` + `record`, "Solo el owner … (B4)").
- **Tests nuevos (4):** digest solo en stdout; stderr gana sobre stdout; sin digest con línea de motivo; estado 0 vía `interpretCliRun` sin mirar stdout. Todos verifican ausencia de `STDOUT-MARK` y de la dirección `sender` del fixture (con y sin `0x`). Mutaciones verificadas y revertidas: mirar stdout con estado 0 → 1 falla; imprimir stdout → 4 fallan; stdout antes que stderr → 1 falla.
- **Gates:** contracts build/lint/test `exit=0`, `Total tests: 83; passed: 83; failed: 0`, `Move.lock diff exit=0`; `node --test` `tests 94 / pass 94 / fail 0` `exit=0`; `check` → `0 despliegues` `exit=0`. Grep de secretos sobre el diff añadido → 0. `~/.sui/sui_config/client.yaml` idéntico (`2026-10-30 17:52:52.515735237 -0500 244`). Sin `sui client`, sin localnet.
- **Desviaciones:** ninguna. **Pendiente:** C3 (re-smoke post-commit).
- STATUS: fila `contracts/scripts` → 94 PASS (51 + 43).

## Revisión C1 + C2: PASA

> Revisión del MID transcrita por el orquestador (resumida). Revisó el diff completo, el reporte y los campos del fixture con `jq`; no corrió gates ni `sui`.

Decisión H-1 / v2-4 cumplida (`publish.mjs:345-357`): stdout solo se usa con `status !== 0` (incluido `null`) y solo el grupo capturado de `FAILED_TX_DIGEST_RE` (base58 ≤ 44, no arrastra hex); con `status === 0` no se mira; nunca se muestra; `interpretCliRun` (`:388`) es el único llamador. H6 bien (`:45-46`). Los 4 tests verifican lo que dicen (ausencia de `STDOUT-MARK` y del `sender`, con y sin `0x`). README `:517`, `:550-553`, `:561-569` correctos.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🟡 H4 / B4 | `publish.mjs:42-44` (`RETRY_ADVICE`) | El consejo impreso sigue diciendo `sui client --json tx-block <digest>` sin `printf 'n\n' \|` ni `SUI_CONFIG_DIR` | "…`printf 'n\n' \| SUI_CONFIG_DIR=<tu dir> sui client --json tx-block <digest>` + `record` (README → Recuperación; si falta `Published.toml`, STOP de #8)". En la sesión de C3, antes del re-smoke |
| H2 | 🔵 | test 4 de H-1 | stdout no JSON en vez de JSON con forma inválida | Aceptado (misma rama, más exigente) |
| H3 | 🔵 | test 1 de H-1 | No comprueba "No reintentes" con `afterPublish` | Opcional (cubierto por el test de `interpretCliRun`) |

### Siguiente paso
Commitear C1 + C2; DEV aplica H1 + gate; commit; re-smoke C3 (pasos 0, 1, 4, 7, 13); revisión MID de C3; PR contra `master` y revisión de integración del MAYOR.

## Ajuste H1 (+ H3 opcional) antes de C3

> Reporte del DEV transcrito por el orquestador. La revisión MID de este ajuste va junto con la de C3.

- `publish.mjs:42-44`: `RETRY_ADVICE` → "No reintentes sin buscar antes el digest; si la transacción existe: `printf 'n\n' | SUI_CONFIG_DIR=<tu dir> sui client --json tx-block <digest>` + `record` (README → Recuperación; si falta `Published.toml`, STOP de #8)."
- `publish.test.mjs`: test 1 de H-1 agrega `assert.match(message, /No reintentes sin buscar antes el digest/)` (H3).
- Gate: build/lint/test `exit=0`, `Total tests: 83; passed: 83; failed: 0`, `Move.lock` sin delta; `node --test` `tests 94 / pass 94 / fail 0`; `check` → `0 despliegues`; `~/.sui/` idéntico. Desviaciones: ninguna.

## Task completado: HANDOFF_DEPLOY v1.3 — C3 (re-smoke post-commit)

> Reporte del DEV transcrito por el orquestador (resumido; salida del paso 7 literal).

- HEAD `b15380809ea8a781c53310c08b0906e4ff947f85`, árbol limpio durante toda la corrida; una génesis, chain `b051020e`; sin testnet. Solo cambia `documents/SMOKE_DEPLOY.md` (sección "Re-corrida post-commit", estado COMPLETADO).
- Paso 0 ✅ (línea base `~/.sui` `2026-10-30 17:52:52.515735237 -0500 244`, puertos libres). Paso 1 ✅ (génesis `exit=0`, red al primer intento). **Paso 4 ✅:** `sourceCommit` = `b15380809ea8a781c53310c08b0906e4ff947f85` en `localnet.json` (14 claves) y `meta.json`; digest `GXhXnF6ntmGbJUPXzswza9UKYHSw76Ck2E4qry3FMZqH`; dir `700`/archivos `600`; `ADMIN` ausente (`grep -c` = 0).
- **Paso 7 ✅** (`exit=1`):
  ```
  Error: la CLI terminó con estado 1
  Salida completa (sin mostrar): <SMOKE_DIR>/tmp/battleship-publish-md3Ssg/publish-output.json
  Directorio temporal: <SMOKE_DIR>/tmp/battleship-publish-md3Ssg
  Motivo de la CLI en <SMOKE_DIR>/tmp/battleship-publish-md3Ssg/publish-output.json (revísalo ahí; no lo pegues: puede traer tu dirección)
  stderr de la CLI (direcciones ocultas):
  INCLUDING DEPENDENCY MoveStdlib
  INCLUDING DEPENDENCY Sui
  BUILDING battleship
  No reintentes sin buscar antes el digest; si la transacción existe: `printf 'n\n' | SUI_CONFIG_DIR=<tu dir> sui client --json tx-block <digest>` + `record` (README → Recuperación; si falta `Published.toml`, STOP de #8).
  ```
  Sin línea `Digest` (rechazo previo a la ejecución); `grep -c 'already published'`: `publish-output.json` 1, stderr 0, salida del script 0; `ADMIN` 0; sin `localnet-dup.json`; árbol y lock sin cambios.
- Paso 13 ✅: red detenida por PID (exit 144 = terminación por `kill`), sin `contracts/deployments`, `<SMOKE_DIR>` borrado, `~/.sui` idéntico, árbol limpio, lock `exit=0`, puertos libres.
- Desviaciones: solo la excepción declarada (notas en el scratchpad, transcritas tras el cierre). Riesgos: ninguno.

## Revisión ajuste H1 + C3: PASA

> Revisión del MID transcrita por el orquestador (resumida). Revisó `b153808`, el diff de `SMOKE_DEPLOY.md` y los reportes; no corrió gates ni `sui`.

H1 (`publish.mjs:42-44`): `RETRY_ADVICE` con `printf 'n\n' | SUI_CONFIG_DIR=<tu dir> …` + `record`; el `\\n` sale como `\n` literal (visto en el paso 7); H3 cubierto. C3: `sourceCommit` = HEAD en json y `meta.json` (rama de árbol limpio, la de testnet, probada); paso 7 con línea "Motivo…", sin digest ni stdout, `already published` 0 y `ADMIN` 0 en la salida; pasos 0, 1, 13 verdes; excepción del scratchpad justificada; sin rutas personales.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🔵 Trazabilidad | `SMOKE_DEPLOY.md:2` | Encabezado citaba v1.2 | Aplicado por el orquestador: "v1.3 (B3/B4 de v1.2; re-corrida C3 de v1.3)" |
| H2 | 🔵 Trazabilidad | `SMOKE_DEPLOY.md:96-98` | La propuesta de H-1 figuraba abierta | Aplicado por el orquestador: "→ Resuelto por C1 …" |

### Siguiente paso
Commit, push, PR contra `master` (`Closes #7`), CI verde y revisión de integración del MAYOR.
