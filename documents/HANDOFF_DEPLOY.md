# HANDOFF_DEPLOY
> Plan: PLAN_DEPLOY v2.1 (aprobado por el MAYOR, `documents/REVISION_PLAN_DEPLOY.md` "Revisión v2") | Issue: #7 |
> Branch: `feature/issue-7-deployments` | Versión: v1.2 — ajustes de las revisiones MID de TASK-1 y TASK-2 (ver "Addendum v1.1" y "Addendum v1.2" al final; prevalecen sobre el cuerpo) | Fecha: 2026-11-02
> Incorpora las correcciones obligatorias de la revisión v2: **v2-1** (smoke sin camino testnet), **v2-2** (guarda de
> config), **v2-3** (`runSui` por vector completo), **v2-4** (`redactAddresses`), **v2-5** (receta §3 con dos salidas),
> **v2-6** (publicación de la copia en segundo plano y control de `~/.move`).
> Un task por sesión, en orden: TASK-1 → TASK-2 → TASK-3. Sin commits ni pushes (los hace el orquestador tras la
> revisión MID). Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 al terminar cada task.

## 0. Baseline de gates verificado (2026-11-02, `master` @ `8c67221`)

| Ítem | Valor | Fuente |
|---|---|---|
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`, `~/.local/bin/sui`) | `documents/STATUS.md` Toolchain; `--version` corrido por el MID con config vacía aislada |
| Node | `v26.13.0` tras `nvm use` (`.nvmrc` = 26); binario: `~/.nvm/versions/node/v26.13.0/bin/node` | STATUS Toolchain; `ls ~/.nvm/versions/node/` |
| `sui move build -e testnet --warnings-are-errors` | 🟢 exit 0, **0 warnings** | STATUS Baselines (medido en `1630eaa`; `git diff --stat 1630eaa 8c67221 -- contracts/sources contracts/tests contracts/Move.toml contracts/Move.lock .github` vacío) |
| `sui move build -e testnet --lint --warnings-are-errors` | 🟢 exit 0, **0 lints** | idem |
| `sui move test -e testnet --warnings-are-errors` | 🟢 exit 0, **83 tests PASS** (26 `house_tests` + 57 `game_tests`), `Move.lock` sin delta | idem |
| CI en `master` | 🟢 run `41462945220` @ `8c67221` (`success`) | `gh run list --branch master` |
| Branch | `feature/issue-7-deployments` @ `cd2398f` = `8c67221` + plan/revisión/D-20261102-03 (solo docs) | `git log` |
| App | no existe (#9) | — |

**Gate de cada task** (lo corre el DEV y pega el output completo): los tres de contratos desde `contracts/` con
`printf 'n\n' |` (`agents.md` §3) + `git diff --exit-code -- Move.lock`, y desde TASK-1 también
`node --test scripts/*.test.mjs` (Node 26) y, desde TASK-2, `node scripts/publish.mjs check`. Cero delta en los tres
de contratos (0 / 0 / 83). Además, en cada task: línea base y cierre de `stat -c '%y %s %n' ~/.sui/sui_config/client.yaml`
y `ls ~/.sui/sui_config/` **idénticos** (`2026-10-30 17:52:52.515735237 -0500 244`, `client.yaml`).

## Decisiones del owner (no reabrir)

| ID | Decisión |
|---|---|
| D1 | D-20261102-01 §1: `contracts/deployments/<red>.json` con **14 campos** (incluidos `upgradeCapId` y `houseCapId`), **ninguna dirección de cuenta** |
| D2 | D-20261102-01 §2: Node 26, JavaScript `.mjs`, **sin dependencias** (solo `node:*`), tests con `node --test`, en `contracts/scripts/` |
| D3 | D-20261102-01 §3: `contracts/Published.toml` (lo escribe la CLI) es la fuente de los datos del paquete; el json se deriva con el script, nunca a mano; la CI falla si no coinciden |
| D4 | D-20261102-01 §4 + D-20261102-03 §1: el script publica con guardas; exige un `SUI_CONFIG_DIR` propio (nunca dentro de `~/.sui/`); en testnet, confirmación por terminal **solo como freno contra accidentes**, sin flag ni variable que la salte. **Ningún agente corre `publish --network testnet`, ni con `--dry-run`.** `~/.sui/sui_config/` queda sin claves para siempre |
| D5 | D-20261102-01 §5: `node --test` + `check` como steps del job `contracts`, `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0), mismo SHA que #9 |
| D6 | D-20261102-03 §2: el DEV puede correr `sui client publish` de una **copia** del paquete en la localnet aislada para capturar un `Published.toml` real (TASK-1) |

## Reglas transversales (todas las tareas)

- **Nada en `~/.sui/`.** Ninguna llamada con `sui` fuera de la localnet aislada de `agents.md` §3 (prefijo
  `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), salvo los gates
  `sui move …` y `sui --version`. Nunca `sui client chain-identifier` ni `node scripts/publish.mjs publish` sin ese prefijo:
  `chain-identifier` **reescribe el `client.yaml` activo** (C12 del plan: `crates/sui/src/client_commands.rs:1605-1607`,
  `crates/sui-sdk/src/wallet_context.rs:174-195` @ `testnet-v1.83.0`).
- **Nunca** `--network testnet` en `publish` (D4). El camino testnet se prueba solo con funciones puras.
- Un agente solo define `SUI_CONFIG_DIR` como `$SMOKE_DIR/net`. La ruta de la config del owner **nunca** aparece en el
  repo, issues, handoffs ni reportes.
- Archivos prohibidos de leer, copiar o pegar: todo `<SMOKE_DIR>/net/*`, todo `Pub.*.toml` (rutas absolutas del disco),
  `genesis.log`/`sui-start.log` (solo líneas puntuales). El stdout crudo de una publicación solo se usa como fixture
  (localnet desechable) y nunca se pega entero en el reporte.
- **No tocar:** `contracts/sources/`, `contracts/tests/`, `contracts/Move.toml`, `contracts/Move.lock` (si una publicación
  de localnet lo cambia: `git checkout -- contracts/Move.lock` y declararlo), `app/`, `documents/PLAN_APP.md`,
  `documents/REVISION_PLAN_APP.md`, `documents/DECISIONES.md`, el bloque `TODO(#9)` de `.github/workflows/ci.yml:131-132`.
- Ejecutar Node 26 por ruta absoluta o tras `nvm use`; dentro de la localnet aislada, siempre `"$NODE"` (el `HOME`
  aislado impide `nvm use`).

---

## TASK-1: Fixtures reales + funciones puras + tests — área: contracts (tooling)

### 1. Historia de usuario del task

**Como** DEV que implementa el script de publicación, **quiero** salidas reales de la CLI 1.83.0 (publicación, dry run y
un `Published.toml`) y un módulo de funciones puras que las interprete y valide el formato del json, **para** que el
script de TASK-2 no dependa de suposiciones sobre la CLI y la app (#9) tenga un formato verificado.

**Scope:** fixtures + `contracts/scripts/deployment.mjs` + `contracts/scripts/deployment.test.mjs`.
**Lo que NO entrega:** I/O, invocación de la CLI desde Node, CI, docs (TASK-2/3).

### 2. Contexto

- No existe `contracts/scripts/`. `.gitignore:6-7` ignora `Pub.*.toml` y `contracts/deployments/localnet.json`;
  `Published.localnet.toml` **no** queda ignorado (se commitea como fixture).
- Hechos de la CLI (tabla C de `documents/PLAN_DEPLOY.md`, con evidencia @ `testnet-v1.83.0`): C1 (`Published.toml`),
  C2/C7 (`test-publish` y pubfile, que se crea vacío incluso con `--dry-run`), C3 (en localnet solo `test-publish`;
  `publish` solo si el manifest declara el entorno), C9 (salida `--json` de ejecución), C10 (claves del dry run), C14
  (chain ids `4c78adac` testnet, `35834a8a` mainnet).
- Modelo a replicar: localnet aislada de `agents.md:83-142` (pasos 1-7) y su uso en el smoke de #6
  (`git show 8fddbda:documents/SMOKE_ACCEPT.md`, paso 3: `test-publish --build-env testnet --pubfile-path …`, `success`,
  House compartida con `initial_shared_version` 2). Lectura del lock: `lock_rev` de `.github/workflows/ci.yml:155-158`.

### 3. Qué implementar

**3.1 Captura de fixtures** (localnet aislada, `agents.md` §3, sin desvíos salvo el autorizado abajo).

Preparación (§3 paso 2) más tres agregados:
- en `env.sh`, además de lo que pide §3: `NODE=<ruta absoluta de node v26.13.0>` (literal);
- crear `<SMOKE_DIR>/move` vacío;
- línea base de `~/.move`: `du -s <HOME real>/.move` y `touch <SMOKE_DIR>/move-mark`.

Génesis, arranque, `chain-identifier` y cuentas (pasos 4-5). Con `ADMIN` activo (`act_as "$ADMIN"`), cada línea con el
prefijo del paso 3:

1. Dry run → `contracts/scripts/fixtures/localnet-publish-dry-run.json`:
   `act_as "$ADMIN" && cd <repo>/contracts && printf 'n\n' | "$SUI" client --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.dry.toml" --dry-run > "$SMOKE_DIR/dry.json"; echo "exit=$?"`
   (crea `Pub.dry.toml` vacío: esperado, C7).
2. Publicación → `contracts/scripts/fixtures/localnet-publish.json`: lo mismo sin `--dry-run`, con
   `--pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` y `> "$SMOKE_DIR/publish.json"`.
3. **Desvío autorizado (D6)** — `Published.toml` real:
   - `mkdir -p "$SMOKE_DIR/pkgcopy" && cp -r <repo>/contracts/Move.toml <repo>/contracts/Move.lock <repo>/contracts/sources "$SMOKE_DIR/pkgcopy/"`
   - Agregar **solo en la copia**, al final de `pkgcopy/Move.toml`:
     `[environments]` y `localnet = "<hex de suic chain-identifier>"`.
   - `touch "$SMOKE_DIR/move-mark"` justo antes de publicar.
   - Publicar **como comando en segundo plano del harness** (`run_in_background`; la descarga git del framework para la
     PV de la localnet puede superar el tiempo de una llamada, v2-6), con `MOVE_HOME` aislado solo en ese proceso:
     `. <SMOKE_DIR>/env.sh && smoke_guard && act_as "$ADMIN" && cd "$SMOKE_DIR/pkgcopy" && printf 'n\n' | MOVE_HOME="$SMOKE_DIR/move" "$SUI" client --json publish > "$SMOKE_DIR/copy-publish.json" 2> "$SMOKE_DIR/copy-publish.err"; echo "exit=$?" > "$SMOKE_DIR/copy-publish.exit"`
   - Esperar el `.exit` en otra llamada.
   - Si `exit=0`, copiar `$SMOKE_DIR/pkgcopy/Published.toml` → `contracts/scripts/fixtures/Published.localnet.toml`.
   - Si falla (p. ej. verificación de dependencias), **STOP al MID** con las líneas pertinentes de `copy-publish.err`
     revisadas: no se fabrica un `Published.toml`.
   - Después: `du -s <HOME real>/.move` igual a la línea base y `find <HOME real>/.move -newer "$SMOKE_DIR/move-mark" | head`
     vacío. Si no, se declara. Declarar también el tamaño de `$SMOKE_DIR/move` (`du -sh`).
4. Revisar los fixtures antes de copiarlos al repo (sin editarlos): solo datos de la localnet desechable (direcciones de la
   génesis aislada, IDs, digests y firmas públicas). Comprobar con `jq empty` que son JSON válido. Nunca nada de `net/`
   ni un `Pub.*.toml`.
5. Cierre (§3 paso 7) completo, más `rm -rf` de `pkgcopy/` y `move/` (van dentro de `<SMOKE_DIR>`).

**3.2 `contracts/scripts/deployment.mjs`** — ESM, sin I/O, sin `process`, sin `child_process`, sin dependencias. Todas
las funciones exportadas y con `///`-equivalente (JSDoc corto) que explique el porqué (LIM-7).

| Función | Contrato |
|---|---|
| `normalizeId(str)` | `0x` + 64 hex minúsculas con ceros a la izquierda; error si no es hex válido o tiene más de 64 dígitos |
| `parsePublishOutput(json)` | Exige `effects.status.status === "success"`. Exactamente un `objectChanges[]` con `type === "published"` → `packageId`, `packageVersion` (número). Exactamente un `created` por tipo: `<pkg>::house::House` (dueño `Shared`), `<pkg>::house::HouseCap` y `0x2::package::UpgradeCap`, comparando direcciones normalizadas, **nunca por posición**. Devuelve `{ digest, timestampMs, packageId, packageVersion, houseId, houseCapId, upgradeCapId }`, **nunca** `sender`/`owner`. Cero o más de uno ⇒ error que nombra el tipo |
| `parseDryRunOutput(json)` | Sobre las claves reales de C10 (`effects`, `objectChanges`, `executionErrorSource`, …; **sin** `digest`/`timestampMs`), con la forma fijada por el fixture. Devuelve `{ ok, gasEstimate, created: { packageId, houseId, houseCapId, upgradeCapId } }`; `ok` = status `success` + los cuatro objetos únicos |
| `buildDeployment({ network, chainId, parsed, sourceCommit, suiCliVersion, frameworkRev })` | Los 14 campos en este orden: `schemaVersion` (1), `network`, `chainId`, `packageId`, `originalPackageId` (= `packageId` en la publicación), `packageVersion`, `upgradeCapId`, `houseId`, `houseCapId`, `publishTxDigest`, `publishTimestamp` (`new Date(Number(timestampMs)).toISOString()`), `sourceCommit`, `suiCliVersion`, `frameworkRev` |
| `validateDeployment(obj)` | Lista de errores (vacía = válido). Los 14 obligatorios con los formatos de la tabla de abajo; claves desconocidas ⇒ error, salvo las del registro `OPTIONAL_FIELDS` (vacío en v1, preparado para `packageTxDigest`), que se validan solo si aparecen |
| `parsePublishedToml(text)` | `Map<env, { chainId, publishedAt, originalId, version, upgradeCapability, toolchainVersion }>`. Parser restringido al formato de la CLI: comentarios `#`, líneas vacías, `[published.<env>]`, `clave = "texto"`, `clave = entero`, la tabla en línea `build-config = { … }` ignorada. Cualquier otra línea ⇒ error con número de línea |
| `checkConsistency(deployment, entry)` | Diferencias campo a campo: `packageId`↔`publishedAt`, `originalPackageId`↔`originalId`, `packageVersion`↔`version`, `upgradeCapId`↔`upgradeCapability`, `chainId`↔`chainId` (IDs normalizados) |
| `readFrameworkRev(moveLockText)` | `rev` (40 hex) de `[pinned.testnet.Sui]`; error si no está (misma lógica que `lock_rev`, `ci.yml:155-158`) |
| `redactAddresses(text)` | **v2-4:** reemplaza toda coincidencia de `/\b(0x)?[0-9a-fA-F]{40,64}\b/g` por `0x…`. Es para texto de la CLI (stderr), no para el resumen propio del script |

Formatos de `validateDeployment`:

| Campo | Regla |
|---|---|
| `schemaVersion` | `=== 1` |
| `network` | `"localnet"` o `"testnet"` (nada más; `mainnet` ⇒ error) |
| `chainId` | `^[0-9a-f]{8}$`. testnet ⇒ `=== "4c78adac"`; localnet ⇒ ∉ {`4c78adac`, `35834a8a`} |
| `packageId`, `originalPackageId`, `upgradeCapId`, `houseId`, `houseCapId` | `^0x[0-9a-f]{64}$` |
| `packageVersion` | entero ≥ 1 |
| `publishTxDigest` | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` |
| `publishTimestamp` | string ISO 8601 UTC con milisegundos y `Z` que reparsea al mismo valor (`new Date(s).toISOString() === s`) |
| `sourceCommit` | `^[0-9a-f]{40}$`, o `null` **solo** en localnet |
| `suiCliVersion` | string no vacío |
| `frameworkRev` | `^[0-9a-f]{40}$` |

### 4. Archivos a tocar / NO tocar

- **Crear:** `contracts/scripts/deployment.mjs`, `contracts/scripts/deployment.test.mjs`,
  `contracts/scripts/fixtures/localnet-publish.json`, `contracts/scripts/fixtures/localnet-publish-dry-run.json`,
  `contracts/scripts/fixtures/Published.localnet.toml`.
- **No tocar:** todo lo de "Reglas transversales"; sin `package.json` en `contracts/`.

### 5. Tests obligatorios (`node:test` + `node:assert/strict`, en `deployment.test.mjs`)

Los IDs esperados se leen del fixture **a mano** (`jq`) y se escriben como literales en el test.

- `parsePublishOutput` sobre el fixture real: cada ID, versión, digest y `timestampMs`.
- `parseDryRunOutput` sobre el fixture real: `ok`, `gasEstimate` > 0 y los cuatro IDs.
- `buildDeployment` + `validateDeployment` del resultado: válido, claves en orden.
- **SEG-3:** ningún valor del json armado (recorrido recursivo) coincide con alguna dirección de `sender`/`owner` del fixture.
- Errores de `parsePublishOutput`, con copias modificadas **en memoria** del fixture, uno por caso:
  `status: failure`, sin `published`, dos Houses, sin `HouseCap`, sin `UpgradeCap`, `objectType` de otro paquete.
- `validateDeployment`: un caso por obligatorio faltante (14) y estos casos de error:
  - clave desconocida;
  - ID corto o en mayúsculas;
  - testnet con chain id ≠ `4c78adac`;
  - localnet con el chain id de testnet y con el de mainnet;
  - `sourceCommit: null` en testnet;
  - `network: "mainnet"`;
  - `publishTimestamp` sin ms o sin `Z`.
- `validateDeployment`, opcional registrado: ausente ⇒ válido; presente con formato malo ⇒ error. Inyectar el registro por
  parámetro para el test.
- `parsePublishedToml`: el fixture real (cada campo); una línea inesperada ⇒ error con su número.
- `checkConsistency`: igual ⇒ `[]`; cada campo distinto ⇒ una diferencia.
- `readFrameworkRev(readFileSync('Move.lock'))` ⇒ `719fb2960ccfbf9f4d33041f8ea5146d30671696`. El test puede leer
  archivos; el módulo, no.
- `redactAddresses`: dirección con `0x`; dirección sin `0x` (64 hex); 40 hex. Un digest base58 real del fixture y un texto
  sin hex quedan intactos.
- `normalizeId`: corto ⇒ padding; mayúsculas ⇒ minúsculas; no hex ⇒ error.

### 6. Smoke

La captura de 3.1 es la verificación manual de este task. Reportar en "Verificación manual":
- digest y `exit` de cada uno de los tres comandos;
- chain id hex de la localnet;
- tamaño de `$SMOKE_DIR/move`;
- `du`/`find` de `~/.move`;
- cierre del paso 7.

### 7. Criterios de aceptación

- [ ] Tres fixtures reales sin editar; `jq empty` exit 0 en los dos JSON.
- [ ] `cd contracts && node --test scripts/deployment.test.mjs` en verde (output completo pegado).
- [ ] Gates de contratos sin delta (0 / 0 / 83) y `Move.lock` intacto.
- [ ] `~/.sui/sui_config/` idéntico a la línea base; `~/.move` sin cambios por la publicación de la copia (o declarados).
- [ ] Ninguna dirección de cuenta en `deployment.mjs` ni en sus salidas.
- [ ] `git status --porcelain` muestra solo los archivos de §4.

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5 (sin commits ni pushes). "Desviaciones": la publicación de la copia
(autorizada, D6) y cualquier otra.

---

## TASK-2: Script de publicación + validación en CI — área: contracts (tooling), ci

### 1. Historia de usuario del task

**Como** owner que va a publicar en testnet (#8) y como DEV que publica en localnet, **quiero** un comando que
compruebe config, red, CLI y estado del repo antes de publicar, que guarde todo lo necesario para recuperarse sin
republicar y que escriba el json de despliegue, **para** que la publicación sea reproducible y no filtre datos del owner.
La CI, además, rechaza un json incoherente con `Published.toml`.

**Scope:** `contracts/scripts/publish.mjs` (`publish`, `record`, `check`) + tests + steps de CI + filas de `agents.md` §3.
**Lo que NO entrega:** README y resto de docs (TASK-3); ninguna ejecución del camino testnet.

### 2. Contexto

- `deployment.mjs` de TASK-1 (todas las funciones puras de formato).
- Hechos C4, C5, C8, C11, C12, C13, C17 del plan:
  - doble publicación bloqueada;
  - el lock se guarda antes del dry run;
  - una tx fallida da exit ≠ 0 y su digest sale en stderr;
  - avisos por stderr;
  - `chain-identifier` escribe el `client.yaml`;
  - con stdin vacío la CLI crea una clave;
  - `tx-block --json` tiene la misma forma que la publicación.
- La CLI lee `SUI_CONFIG_DIR` tal cual y **crea** el directorio si no existe (`crates/sui-config/src/lib.rs:45-58`
  @ `testnet-v1.83.0`). `--client.env` reemplaza el env activo (`crates/sui/src/sui_commands.rs:1739-1741`).
- `ci.yml`: job `contracts` con `working-directory: contracts` (`ci.yml:31-34`); steps "Test (warnings como error)"
  (`:110-111`) y "Move.lock y árbol sin cambios" (`:113`).

### 3. Qué implementar

**3.1 `contracts/scripts/publish.mjs`** (ESM, solo `node:*`): `parseArgs` con `strict: true`; subcomando inválido u
opción desconocida ⇒ exit 2. Exit `0` ok, `1` guarda o validación. Resuelve `CONTRACTS_DIR` desde
`import.meta.url`. Toda decisión va en funciones **puras exportadas** (se testean); `main()` solo hace I/O y solo corre si
el módulo es el punto de entrada.

| Subcomando | Opciones | ¿Invoca `sui`? |
|---|---|---|
| `publish` | `--network localnet\|testnet`, `--pubfile-path <archivo>` (obligatorio en localnet, prohibido en testnet), `--out <ruta>`, `--dry-run` | sí, solo por `runSui` |
| `record` | `--network`, `--from <salida.json>`, `--meta <meta.json>` (por defecto junto a `--from`), `--source-commit`, `--sui-cli-version`, `--framework-rev`, `--out` | **no** |
| `check` | — | **no** |

**`runSui(args, { spawn = spawnSync, configDir })`** — único punto que llama a la CLI (v2-3):

- Lista blanca por **vector completo** (`isAllowedSuiArgs(args)`), exactamente uno de:
  `['--version']`, `['client','--json','active-env']`, `['client','--json','chain-identifier']`,
  `['client','--json','publish']`, `['client','--json','publish','--dry-run']`,
  `['client','--json','test-publish','--build-env','testnet','--pubfile-path',P]` y la misma con `'--dry-run'` al final
  (`P` string no vacío que no empieza con `-`).
- Además rechaza cualquier elemento igual a `-y`, `--yes`, `--client.config`, `--client.env` o que empiece con
  `--client.config=`/`--client.env=` (defensa explícita aunque la lista blanca ya lo excluya). Rechazo ⇒ error sin
  invocar.
- Invoca `spawn(bin, args, { cwd: CONTRACTS_DIR, input: 'n\n', shell: false, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SUI_CONFIG_DIR: configDir } })`,
  con `bin = process.env.SUI_BIN ?? 'sui'` y `configDir` = la ruta **ya validada** por la guarda 2 (v2-2).
- Devuelve `{ status, stdout, stderr }`.

`runGit(args)`: `spawnSync('git', args, { cwd: CONTRACTS_DIR, shell: false, encoding: 'utf8' })`, solo
`['status','--porcelain']` y `['rev-parse','HEAD']`.

**Guardas de `publish`**, en este orden (cualquier fallo ⇒ exit 1 sin invocar `publish`/`test-publish`):

1. **Argumentos:** red válida; `--pubfile-path` según red.
2. **Config (v2-2), `checkConfigDirGuard({ value, isAbsolute, exists, isDir, hasClientYaml, realpath, homes })`:**
   - `SUI_CONFIG_DIR` definido, no vacío y **absoluto**;
   - directorio existente con `client.yaml`;
   - `realpath(value)` **no** está dentro de `realpath(<home>/.sui)` para **ambos** `home` (`os.homedir()` y
     `os.userInfo().homedir`). Si `<home>/.sui` no existe, se compara con la ruta resuelta de su padre + `.sui`.
   - Devuelve la ruta real validada, que es la que `runSui` pasa a la CLI.
   - Mensaje sin la ruta del usuario más allá de "inválido: <motivo>".
3. **Red:** `runSui(['client','--json','active-env'])` debe ser igual a `--network` (`checkNetworkGuard`). **Solo si
   coincide**, `chain-identifier` y su `.hex`: testnet = `4c78adac`; localnet ∉ {`4c78adac`, `35834a8a`}.
4. **CLI** (`checkCliVersion`): `sui --version` = `sui ${SUI_VERSION}-${SUI_COMMIT}` leídos de
   `.github/workflows/ci.yml` (`SUI_VERSION: "…"`, `SUI_COMMIT: "…"`). testnet ⇒ error; localnet ⇒ aviso. Sin esas
   variables ⇒ error.
5. **testnet** (`checkTestnetPreconditions`): `git status --porcelain` vacío; no existe `deployments/testnet.json` ni
   `[published.testnet]` en `Published.toml`.
6. **testnet, dry run interno** (también es todo lo que hace `--dry-run` en testnet):
   - `runSui([...publish, '--dry-run'])` + `parseDryRunOutput` ⇒ `ok`;
   - `Move.lock` antes/después (contenido) distinto ⇒ **error** "repin pendiente (H13): commitear el lock y re-medir los
     gates" (`checkLockUnchanged`, testnet ⇒ error);
   - imprime el gas estimado.
   En localnet `--dry-run` hace lo mismo con `test-publish`, y un lock cambiado es aviso.
7. **testnet sin `--dry-run`** (`confirmationRequired`, `checkConfirmation({ isTTY, answer })`):
   - `process.stdin.isTTY !== true` ⇒ aborta; si no, pide escribir `testnet`, y cualquier otra respuesta ⇒ aborta.
   - **Sin** ninguna opción ni variable de entorno que la omita.
   - Texto: "Freno contra accidentes; la autorización es la del owner (D-20261030-09)".

**Antes de invocar la publicación:**
- `dir = fs.mkdtempSync(path.join(os.tmpdir(), 'battleship-publish-'))` con `chmod 0700`;
- `meta.json` (`0600`) = `{ network, chainId, sourceCommit, suiCliVersion, frameworkRev }`:
  - `sourceCommit` = `rev-parse HEAD`, o `null` si el árbol está sucio (solo localnet);
  - `suiCliVersion` = salida de `--version` sin `sui `;
  - `frameworkRev` = `readFrameworkRev(Move.lock)`.

**Después de invocar:**

1. `publish-output.json` (stdout) y `publish-stderr.txt` (stderr), ambos `0600`, en `dir`.
2. Si `status !== 0`, imprime:
   - su propio mensaje + la ruta de `dir`;
   - el digest si `/Error executing transaction '([1-9A-HJ-NP-Za-km-z]{32,44})'/` aparece en stderr;
   - `redactAddresses(stderr)`;
   - "No reintentes sin buscar antes el digest; si la transacción existe: `sui client --json tx-block <digest>` +
     `record` (si falta `Published.toml`, STOP de #8)".
   - Exit 1.
   - **Nunca** imprime stdout crudo, ni siquiera ante un `JSON.parse` fallido: solo la ruta del archivo (v2-4).
3. `parsePublishOutput` → `buildDeployment` → `validateDeployment`; `fs.mkdirSync(dirname(out), { recursive: true })`
   (v2-5); escribe `out` (por defecto `contracts/deployments/<red>.json`) con `JSON.stringify(obj, null, 2) + '\n'`.
4. testnet: `checkConsistency` contra `[published.testnet]` recién escrita; diferencias ⇒ exit 1 con detalle (el json ya
   quedó escrito).
5. localnet: lock cambiado ⇒ aviso "declarar el delta (PROY-11)".
6. Resumen **propio**:
   - los 14 campos, sin `redactAddresses`: son IDs y hashes públicos, no direcciones de cuentas;
   - ruta de `dir` ("bórralo cuando termines");
   - "Siguiente paso obligatorio (#8)":
     `sui client call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> <bps>`
     (no lo ejecuta) y la verificación `sui client object <houseId> --json` (`fee_rate`).

**`record`** (`resolveRecordMeta({ metaJson, flags, network })`):
- usa `meta.json` si existe; si no, exige los tres flags; nunca deriva del estado actual del repo;
- `meta.network` y `meta.chainId` deben ser coherentes con `--network` (regla de `chainId` de TASK-1);
- `--from` acepta la salida de `publish` o de `sui client --json tx-block` (misma forma);
- escribe `out` con `mkdir -p`; no exige árbol limpio.

**`check`** (`checkDeployments({ files: [{ name, text }], publishedTomlText })`):
- lee `contracts/deployments/*.json`; si la carpeta no existe ⇒ "0 despliegues", exit 0;
- lee `contracts/Published.toml` si existe;
- error si:
  - un json es inválido (`validateDeployment`);
  - `network` ≠ nombre del archivo;
  - un json no-localnet no tiene su `[published.<red>]`;
  - una `[published.<red>]` no tiene `deployments/<red>.json`;
  - `checkConsistency` da diferencias.

**3.2 `contracts/scripts/fixtures/localnet.deployment.json`** (contrato de formato para #9, ruta fija):
- `node scripts/publish.mjs record --network localnet --from scripts/fixtures/localnet-publish.json --source-commit <SHA de HEAD al generarlo> --sui-cli-version 1.83.0-16d2dc1e05ed --framework-rev 719fb2960ccfbf9f4d33041f8ea5146d30671696 --out scripts/fixtures/localnet.deployment.json`
  (sin `meta.json` junto al fixture ⇒ se usan los flags);
- el test compara `buildDeployment` del fixture con esos tres valores contra este archivo.

**3.3 `.github/workflows/ci.yml`**, job `contracts`: insertar entre "Test (warnings como error)" y
"Move.lock y árbol sin cambios tras los gates (PROY-11)":

```yaml
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          package-manager-cache: false   # el job contracts no usa npm; no se acopla al lock de la app (#9)
      - name: Node de .nvmrc
        run: '[[ "$(node --version)" == "v$(cat ../.nvmrc)."* ]]'
      - name: Scripts de despliegue (node --test)
        run: node --test scripts/*.test.mjs
      - name: Deployments coherentes con Published.toml (#7)
        run: node scripts/publish.mjs check
```

**3.4 `agents.md` §3**:
- tabla de contratos: filas `node --test scripts/*.test.mjs` y `node scripts/publish.mjs check` (gate bloqueante, =
  steps de CI, PROY-18; Node 26);
- la fila `sui client publish` (`agents.md:77`) pasa a: "`node scripts/publish.mjs publish --network testnet` — **solo el
  owner, con su `SUI_CONFIG_DIR` propio** (§12, D-20261102-03); agentes: solo `--network localnet` dentro de la
  localnet aislada";
- tabla "Quién corre qué" de `PLAN_DEPLOY.md` (sección "Script — diseño").

### 4. Archivos a tocar / NO tocar

- **Crear:** `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`,
  `contracts/scripts/fixtures/localnet.deployment.json`.
- **Modificar:** `.github/workflows/ci.yml` (solo los cuatro steps de 3.3), `agents.md` §3 (solo la tabla de comandos de
  contratos y la tabla "Quién corre qué").
- **No tocar:** `deployment.mjs` salvo bug declarado; `framework-drift`; `TODO(#9)`; `.gitignore`; lo de "Reglas
  transversales".

### 5. Tests obligatorios (`publish.test.mjs`)

- **`runSui`** con `spawn` falso que registra la llamada:
  - `input === 'n\n'`, `shell === false`, `maxBuffer >= 64 MiB`, `env.SUI_CONFIG_DIR === configDir`, `cwd` = `contracts/`;
  - cada vector permitido ⇒ invoca;
  - rechaza sin invocar: `-y`, `--yes`, `--client.config x`, `--client.config=x`, `--client.env testnet`,
    `--client.env=testnet`, `['client','--json','--client.env','testnet','publish']`, `['client','--json','active-address']`,
    `['client','--json','publish','--gas-budget','1']`, `test-publish` sin `--build-env testnet` y `--pubfile-path` que
    empieza con `-`.
- **`publishCliArgs`**: ambas redes, con y sin dry run; cada resultado pasa `isAllowedSuiArgs`.
- **`checkConfigDirGuard`**, inyectando `realpath`/`exists`:
  - casos de error: sin definir, vacío, relativo, inexistente, sin `client.yaml`, igual a `<home>/.sui/sui_config`,
    dentro de `<home>/.sui/otra`, symlink que resuelve dentro de `~/.sui` y `HOME` redefinido con `userInfo().homedir`
    real dentro de `.sui`;
  - ok: ruta propia (devuelve el realpath).
- **`checkNetworkGuard`**:
  - alias ≠ red ⇒ error **sin** consultar el chain id (el test verifica que la función de chain id no se llamó; cubre el
    caso testnet con env `localnet`, v2-1);
  - testnet con chain id ≠ `4c78adac` ⇒ error;
  - localnet con `4c78adac` o con `35834a8a` ⇒ error;
  - casos ok.
- **`checkCliVersion`**: igual ⇒ ok; distinto ⇒ error en testnet y aviso en localnet; `ci.yml` sin las variables ⇒ error.
- **`checkTestnetPreconditions`**: árbol sucio, json existente, entrada existente ⇒ error; ok.
- **`checkLockUnchanged`**: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok.
- **`confirmationRequired` / `checkConfirmation`**:
  - `isTTY` `false`/`undefined` ⇒ aborta; respuesta ≠ `testnet` ⇒ aborta; `testnet` ⇒ ok;
  - `parseArgs` rechaza `--yes`, `--force`, `-y`;
  - el resultado no cambia con `process.env.CI = '1'` ni con ninguna variable (el test la define y la restaura).
- **`resolveRecordMeta`**: con `meta.json`; sin él y sin flags ⇒ error; sin él con los tres flags ⇒ ok; `chainId` de
  testnet con `--network localnet` ⇒ error.
- **`checkDeployments`**: carpeta vacía; localnet válido; testnet sin `Published.toml`; entrada huérfana; nombre ≠
  `network`; json inválido; coherente (testnet con `Published.localnet.toml` reetiquetado `[published.testnet]` y
  `chain-id = "4c78adac"` **solo en memoria**, documentado en el test).
- **Fixture para #9**: `buildDeployment` del fixture con los tres valores fijos = `fixtures/localnet.deployment.json`.
- **Resumen y mensajes**:
  - la función que arma el resumen (`formatSummary`) y la de error (`formatCliFailure`) no contienen ninguna dirección de
    `sender`/`owner` del fixture;
  - `formatCliFailure` con un stdout que no parsea solo menciona la ruta;
  - con stderr que trae una dirección con y sin `0x`, sale redactada.

### 6. Smoke

No aplica en este task: lo cubre `SMOKE_DEPLOY.md` tras TASK-3. **Prohibido** ejecutar `publish` en este task (ni
localnet ni testnet); `record` y `check` sí.

### 7. Criterios de aceptación

- [ ] `cd contracts && node --test scripts/*.test.mjs` y `node scripts/publish.mjs check` (⇒ "0 despliegues", exit 0) en
      verde, output completo pegado.
- [ ] Ninguna ejecución de `publish`; ninguna llamada a `sui` salvo los gates; `~/.sui/sui_config/` idéntico.
- [ ] Gates de contratos sin delta (0 / 0 / 83), `Move.lock` intacto.
- [ ] YAML válido: `python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' .github/workflows/ci.yml` exit 0.
- [ ] `git diff -- .github/workflows/ci.yml` solo con los cuatro steps.
- [ ] `grep -n "child_process\|spawnSync" scripts/*.mjs` solo en `runSui`/`runGit`.
- [ ] CI del PR en verde (la mira el orquestador).

### 8. Al terminar

Reporte §5. En "Documentación", snippet de STATUS con el baseline de `node --test` (N tests).

---

## TASK-3: Documentación — área: docs

### 1. Historia de usuario del task

**Como** owner y como colaborador que no lee el código, **quiero** que el README y las guías expliquen el formato de
despliegue, cómo publicar en cada red y qué no hacer, **para** publicar en #8 sin dudas y que #9..#14 consuman el json
correctamente.

**Scope:** README de contratos, `agents.md`, ESTANDARES ARQ-6, STATUS. **Lo que NO entrega:** cambios de código.

### 2. Contexto

Secciones del plan a volcar: "Formato…", "Script — diseño", "Quién corre qué", "Encaje con #8 y con upgrades". Líneas
actuales:
- `contracts/README.md:147-151` ("ID de la House"), `:129-139` ("Versionado");
- `agents.md:83-142` (localnet aislada; paso 4 en `:122-130`, paso 7 en `:140-142`), `:180` (§5), `:290-301` (§11),
  `:303-315` (§12);
- `documents/ESTANDARES.md:19` (ARQ-6) y `:3` (encabezado);
- `documents/STATUS.md:30` (prerrequisito de `sui move`), `:79` (H11), `:81` (H13).

### 3. Qué implementar

1. **`contracts/README.md` → nueva sección "Despliegues"** (antes de `battleship::game`, o al final con enlace desde
   "ID de la House"):
   - esquema (tabla de 14 campos con "Describe"), ejemplo con IDs ficticios `0x1111…`–`0x4444…`;
   - qué no va y por qué, con la nota "la dirección del publicador es visible on-chain; sacarla del repo es higiene";
   - reglas de compatibilidad (14 obligatorios, posteriores opcionales, `schemaVersion: 2` para lo demás; consumidores
     ignoran claves desconocidas);
   - `Published.toml` como fuente + `check` de CI;
   - **Uso en localnet:**
     - variante corta para humanos: directorio propio, `SUI_CONFIG_DIR=<dir>/net sui genesis --working-dir <dir>/net` +
       `sui start --network.config <dir>/net`, nunca `sui start` a secas ni `--force-regenesis` sin `SUI_CONFIG_DIR`,
       nada en `~/.sui/`;
     - para agentes, remisión a `agents.md` §3;
     - comando del script con `--pubfile-path` nuevo por génesis;
   - **Uso en testnet (solo el owner):**
     - config propia (`SUI_CONFIG_DIR` fuera de `~/.sui/`, D-20261102-03);
     - `--dry-run`, publicación con confirmación, `update_fee_rate` con el comando impreso;
     - entregar `testnet.json` + `Published.toml` + digest y borrar el directorio temporal;
   - "el script escribe el cache `chain_id` en la config activa (inocuo)";
   - **Recuperación:** "nunca reintentar sin mirar el digest"; `tx-block` + `record`;
   - comando de tests.
   - "ID de la House" pasa a remitir a "Despliegues".
   - "Versionado" agrega el procedimiento de upgrade: upgrade → `migrate` → `testnet.json` en el mismo PR → app; ventana
     de `EWrongVersion` para crear/aceptar.
2. **`agents.md`**:
   - §2 layout: `contracts/scripts/` (script, tests, fixtures) y `contracts/Published.toml` (#8).
   - §3, preparación (paso 2): `NODE=<ruta absoluta de Node 26>` literal en `env.sh`.
   - §3 paso 4, **dos variantes de salida** (v2-5), ambas desde `contracts/` con el prefijo del paso 3:
     - (A) smoke del script: `act_as "$ADMIN" && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json"`;
     - (B) cuando la app necesita la ruta por defecto: lo mismo **sin `--out`**, que escribe
       `contracts/deployments/localnet.json` (ignorado por git; el script crea la carpeta).
   - §3 paso 7, cierre: agregar `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments 2>/dev/null || true`
     (pertenece a la génesis que se borra) y comprobar que no queda.
   - §3: "ningún agente corre `publish --network testnet`, ni con `--dry-run`" y "un agente solo define `SUI_CONFIG_DIR`
     como `$SMOKE_DIR/net`; la ruta de la config del owner nunca se escribe en el repo, issues, handoffs ni reportes" (v2-2).
   - §5 fila de IDs: "lo escribe `contracts/scripts/publish.mjs`; `Published.toml` es la fuente de los datos del paquete;
     la CI verifica la coherencia".
   - §11 fila `client.yaml`: "sin claves **siempre**; la clave del owner vive en su `SUI_CONFIG_DIR` propio (D-20261102-03)".
   - §12: comando del owner y orden de #8 (dry run → publicación → `update_fee_rate` → entrega).
3. **`documents/ESTANDARES.md`**:
   - ARQ-6: + "`Published.toml` (CLI) es la fuente de las direcciones del paquete; `deployments/<red>.json` se deriva con
     `contracts/scripts/publish.mjs` y la CI verifica la coherencia (D-20261102-01)";
   - encabezado v1.7 con la referencia.
4. **`documents/STATUS.md`**:
   - `:30` y H11 (`:79`): la nota "#8: el owner agrega su clave a este mismo `client.yaml`" se reemplaza por
     D-20261102-03 (config propia del owner);
   - H11 resuelta por #7 (D3);
   - H13: el script exige la CLI de `ci.yml`, falla si el lock cambia en el dry run y registra `frameworkRev`;
   - baseline de los gates de scripts (de TASK-2).
   - No tocar filas de otros ciclos.

### 4. Archivos a tocar / NO tocar

- **Modificar:** `contracts/README.md`, `agents.md`, `documents/ESTANDARES.md`, `documents/STATUS.md`.
- **No tocar:** `documents/DECISIONES.md` (lo hace el orquestador), código, `PLAN_APP.md`/`REVISION_PLAN_APP.md`.

### 5. Tests obligatorios

No hay tests nuevos. Gate completo sin delta (los tres de contratos + `node --test` + `check`).

### 6. Smoke

Tras aprobar este task, el MID entrega `documents/SMOKE_DEPLOY.md` y el DEV lo corre (sesión aparte).

### 7. Criterios de aceptación

- [ ] Cada ruta, comando y nombre de función citado existe y coincide con TASK-1/2 (el DEV lo comprueba con `grep`).
- [ ] Grep de secretos sobre el diff, sin claves ni direcciones fuera de los IDs ficticios:
      `git diff -U0 HEAD -- contracts/README.md agents.md documents/ESTANDARES.md documents/STATUS.md | /usr/bin/grep -nE '^\+' | /usr/bin/grep -niE 'suiprivkey|mnemonic|recovery|0x[0-9a-f]{64}'`.
- [ ] Ninguna ruta de la config del owner en el diff (solo `$SMOKE_DIR/net` y `<dir>` genéricos).
- [ ] Gates sin delta.

### 8. Al terminar

Reporte §5 con el snippet para STATUS.


## Addendum v1.1 — ajustes de la revisión MID de TASK-1 (transcritos por el orquestador; prevalecen sobre el cuerpo)

- **A1 (TASK-2 §3.1 y §4):** se permite extraer de `validateDeployment` (`deployment.mjs:219-226`) la función exportada `chainIdError(network, chainId)` ⇒ `string | null`, y usarla en `validateDeployment`, `checkNetworkGuard` y `resolveRecordMeta` (LIM-5). Refactor declarado; los tests de TASK-1 siguen en verde sin cambios.
- **A2 (TASK-2 §5, `checkDeployments` coherente):** `Published.localnet.toml` es de la copia (D6), no de `localnet-publish.json`. El caso coherente, en memoria, reetiqueta la entrada (`[published.testnet]`, `chain-id = "4c78adac"`) **y además** toma `packageId`, `originalPackageId`, `packageVersion` y `upgradeCapId` del json de esa entrada. Comentarlo en el test.
- **A3 (TASK-2 §4 y §5):** se permite tocar `deployment.test.mjs` para agregar los casos del parser estricto de `Published.toml`: clave desconocida, clave duplicada, sección duplicada, sección incompleta, `build-config` que no es tabla en línea, entero mal formado y texto sin comillas, cada uno verificando `Published.toml:<n>:` y el motivo. Agregar en el test de `checkConsistency` un comentario de que el TOML proviene de la copia.
- **A4 (TASK-2 §3.1, guarda 6 y "Después de invocar"):** no depender de `suggestedGasPrice` (no existe en 1.83.0, C10 corregido) ni usar ni imprimir `effects.transactionDigest` del dry run como digest de publicación. Si `parseDryRunOutput` o `parsePublishOutput` lanzan por forma inválida, el script imprime su mensaje propio y la ruta del archivo, nunca el stdout (v2-4); agregar un test. Opcional: precisar el JSDoc ("lanza si la forma es inválida").
- **A5 (TASK-3 §3.1, README "Despliegues", junto al comando de tests):** "Los fixtures de `contracts/scripts/fixtures/` son el stdout crudo de una localnet aislada y desechable. Contienen la dirección y la firma de una cuenta efímera de la génesis, sin valor y con la clave destruida. Al recapturarlos (por ejemplo al subir la CLI) se usa siempre el procedimiento de `agents.md` §3; nunca salida de testnet ni de una cuenta del owner."
- **A6 (TASK-1 §2 y TASK-3 si documenta el dry run):** C10 real: el dry run `--json` de 1.83.0 trae `balanceChanges, effects, events, executionErrorSource, input, objectChanges`, **sin** `suggestedGasPrice`; trae `effects.transactionDigest` (simulación, no se usa ni se registra) y no trae `digest` ni `timestampMs` en la raíz.
- **A7 (§8 de cada task):** el reporte pega el output crudo de `node --test` (todas las líneas `ℹ`) y de los gates.


## Addendum v1.2 — ajustes de la revisión MID de TASK-2 (transcritos por el orquestador; prevalecen sobre el cuerpo)

- **B1 (TASK-3, excepción de código acotada):** corregir H2 en `publish.mjs` con su test en `publish.test.mjs`: todo error posterior a la invocación de `publish` (incluidos `validatedOrThrow`, `parsePublishedToml` y los `throw` de testnet de `:589`, `:593-598`) incluye `Directorio temporal: <dir>` y el consejo de `record`, mediante una función pura testeada (p. ej. reusar `formatCliFailure` con su motivo o una `formatPostPublishFailure`). Opcional en el mismo cambio: H3 (`check` hace `continue` si el json no es un objeto, sin `TypeError`), H4 (`RETRY_ADVICE` solo tras una publicación real) y H5 (exportar `NETWORKS` desde `deployment.mjs` y reusarla; no exportar `CONFIRMATION_PROMPT`). Declararlo en el reporte con el gate completo (≥ 87 tests node + gates de contratos). Sin otros cambios de código.
- **B2 (TASK-3, README "Despliegues" y receta de recuperación; también el comando de `HANDOFF:343`):** `record` sin `meta.json` exige `--source-commit`, `--sui-cli-version`, `--framework-rev` y `--chain-id` (testnet: `4c78adac`); si existe `meta.json` se usa y los flags se ignoran; si la salida de `tx-block` se guardó fuera del directorio temporal, se pasa `--meta <dir>/meta.json`.
- **B3 (smoke, lo incorpora el MID en `SMOKE_DEPLOY.md`; todo con el prefijo de la localnet aislada):** forma real de `active-env` y `chain-identifier` con `--json`; `publish --network localnet --dry-run`; variante A (`--out $SMOKE_DIR/…`) y variante B (ruta por defecto, `check` con `localnet.json` presente y cierre que lo borra); `record` desde el directorio del script; negativos que no invocan la CLI: sin `SUI_CONFIG_DIR`, `SUI_CONFIG_DIR` dentro de `~/.sui`, y `--network testnet` con env `localnet` (falla sin consultar el chain id).
- **B4 (transversal):** la única forma de ver la salida real de un comando `sui client` es la localnet aislada; **ninguna** llamada `sui client …` sin el prefijo de `agents.md` §3, ni siquiera de solo lectura (`active-env` incluido). Los gates `sui move …` siguen con la forma canónica.
