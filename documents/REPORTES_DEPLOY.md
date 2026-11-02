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
