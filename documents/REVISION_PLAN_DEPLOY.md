## Veredicto: REQUIERE CAMBIOS (2 🟠 MAJOR, 9 🟡 MINOR, 4 🔵 SUGGESTION; 0 🔴 BLOCKER)

> Revisión del MAYOR · 2026-11-02 · `documents/PLAN_DEPLOY.md` **v1** (sin trackear) · branch `feature/issue-7-deployments`
> @ `7567943` (= `master`, sin commits propios) · issue #7 (+ #8, #9) · primera ronda (no hay hallazgos previos).
> Evidencia propia: fuentes de la CLI en `testnet-v1.83.0` descargadas con `gh api …/contents/<ruta>?ref=testnet-v1.83.0`
> al scratchpad; `--help` con `SUI_CONFIG_DIR`/`HOME` a directorios vacíos del scratchpad y `printf 'n\n' |` (siguieron
> vacíos); `~/.sui/sui_config/client.yaml` sin cambios (`stat` = `2026-10-30 17:52:52.515735237 -0500 244`, antes y
> después); `actions/setup-node` vía `gh api`. Sin gates (D-20261030-02). `documents/PLAN_APP.md` (#9) solo leído.

### Resumen

El plan es sólido: la HU, el alcance, el reparto `Published.toml` (CLI) / `deployments/<red>.json` (app) y casi todos
los hechos C1-C13 sobre la CLI se verifican en el código. Faltan dos cosas antes de aprobar: (1) la guarda de red del
script ejecuta `sui client chain-identifier`, que **reescribe el `client.yaml` activo**, y el criterio de TASK-2 la
corre con la config de `~/.sui/` de los gates; (2) STOP-4 presenta la confirmación por terminal como la protección de
testnet, cuando se salta con un comando y la barrera real (no hay claves en `~/.sui/`) desaparece en #8 tal como está
planeado hoy (STATUS H11).

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| 1 | 🟠 MAJOR | D-20261030-07, agents.md §3 ("Nada en `~/.sui/`"), §11 | `PLAN_DEPLOY.md:194-195` (guarda 1), `:438-440` (criterio de TASK-2), `:59` y `:219-221` (C7, "no escribe nada") | `sui client chain-identifier` **escribe el `client.yaml`** cada vez que corre: `cache_chain_id()` = `internal_load_or_cache_chain_id(true)` → `SuiClientConfig::load_with_lock` + `update_env_chain_id` + `save_with_lock` (`crates/sui/src/client_commands.rs:1605-1607`, comentario "Keep populating the client.yaml chain-id cache"; `crates/sui-sdk/src/wallet_context.rs:176-195`). El plan no lo dice y el criterio de TASK-2 corre `publish --network testnet --dry-run` "con la config sin claves de los gates", o sea contra `~/.sui/sui_config/client.yaml`. | El DEV corre el criterio de aceptación de TASK-2: la guarda 1 consulta el RPC de testnet y reescribe `~/.sui/sui_config/client.yaml` (le agrega el `chain_id` cacheado al env `testnet`; cambian `mtime` y tamaño). El cierre de §3 paso 7 (stat/ls idénticos a la línea base) fallaría y se rompe el estado que autorizó D-20261030-07. Además, si el árbol estuviera limpio, ninguna guarda fallaría (red, chain id, CLI y "sin publicación previa" pasan) y el agente terminaría invocando `sui client --json publish --dry-run` en testnet: solo lo para la CLI (`infer_sender` sin dirección activa, `client_commands.rs:4202-4204`), no una guarda del script. El criterio depende de una falla accidental (árbol sucio). | (a) Agregar a la tabla C: "`chain-identifier` escribe el cache `chain_id` en el `client.yaml` activo" con esa evidencia; corregir C7 y `:219-221`. (b) **Quitar** del criterio de TASK-2 toda ejecución con la config de `~/.sui/`: el camino testnet se prueba con las funciones puras (`checkNetworkGuard`, `checkTestnetPreconditions`, confirmación) y con el paso 8 del smoke (env `localnet` aislado → falla la guarda 1 sin tocar testnet). (c) Regla explícita en el plan y en `agents.md` §3/§12: **ningún agente corre `publish.mjs publish --network testnet`, ni con `--dry-run`**, y todo `publish.mjs publish` de un agente va con el prefijo de la localnet aislada (`env.sh` + `smoke_guard`). (d) En el README: el script escribe ese cache en la config del owner (inocuo, pero que se sepa). |
| 2 | 🟠 MAJOR | SEG-3, D-20261030-07, D-20261030-09, agents.md §12, FLUJO §4 | `PLAN_DEPLOY.md:200-202` (guarda 4), `:302-318` (STOP-4), `:436-437` (AuthZ de TASK-2); `documents/STATUS.md:79` (H11, "#8: el owner agrega su clave a este mismo `client.yaml`") | (i) "Un agente … no puede pasar esta guarda por accidente" es cierto, pero el plan la trata como la protección de testnet (STOP-4, AuthZ de TASK-2). Se salta a propósito con una línea: probado en esta sesión, `printf 'testnet\n' \| node probe.mjs` → `ABORT: stdin no es TTY`; `(sleep 1; printf 'testnet\n') \| script -qec "node probe.mjs" /dev/null` → `CONFIRMADO (guarda superada)` (`probe.mjs` = `isTTY` + `readline` como en la guarda 4; en el shell del agente `stdin.isTTY` es `undefined` y `/dev/tty` da `ENXIO`). (ii) La barrera que de verdad separa a los agentes de testnet es que **no hay claves** en la config que usan (D-20261030-07), y STATUS H11 planea que en #8 el owner agregue su clave **a ese mismo** `~/.sui/sui_config/client.yaml`. Desde ese momento todo `sui` de un agente (gates incluidos) corre con un keystore que firma como el owner, y `sui client publish`/`call` directos no pasan por ninguna guarda del script. El plan no lo menciona en STOP-4. | Después de #8, un agente que corre `printf 'n\n' \| sui client call … update_fee_rate …` o `sui client publish` en `contracts/` (por error de comando o por un handoff mal escrito) firma y gasta con la clave del owner, sin terminal, sin confirmación y sin pasar por `publish.mjs`. La premisa de agents.md §3 ("`client.yaml` **sin claves**") deja de ser cierta sin que ningún documento lo diga. | Reescribir STOP-4 con dos sub-decisiones para el usuario: **4.1** confirmación por terminal = barrera contra accidentes (texto honesto, sin "no puede"), sin flag ni variable de entorno que la salte (ni `--yes` ni `CI=…`), con test que lo verifique; **4.2 (nueva)**: la clave del owner va en una config **propia** (`SUI_CONFIG_DIR=<dir del owner>` solo en su terminal) y `~/.sui/sui_config/` queda sin claves para siempre (D-20261030-07 se mantiene). Guarda pura y testeada en el script: testnet sin `--dry-run` aborta si `SUI_CONFIG_DIR` no está definido o resuelve a `~/.sui/sui_config`. Si se aprueba, TASK-3 corrige STATUS H11 y agents.md §11/§12, y el plan lo registra como decisión. Si el usuario prefiere la clave en `~/.sui/`, el plan debe declarar que desde #8 la guarda de agentes es **solo de proceso**. |
| 3 | 🟡 MINOR | ARQ-6 (contrato estable), STOP-3 ("nunca a mano") | `PLAN_DEPLOY.md:170` (regla 1) vs `:173-174` (regla 3) | El productor estricto rechaza **claves faltantes** y a la vez "agregar un campo = cambio aditivo, no sube `schemaVersion`". | Un issue futuro agrega `upgradeTxDigest`: el `check` actualizado exige la clave, el `testnet.json` commiteado no la tiene y la CI se pone en rojo. La única salida sería editarlo a mano (prohibido) o regenerarlo con `record`, pero los campos de trazabilidad no se pueden reconstruir y la salida cruda ya se borró (`:237`). | Regla explícita: los campos agregados después de v1 son **opcionales** para `validateDeployment`/`check` (se valida el formato si aparecen) o suben `schemaVersion`. Los 14 de v1 son obligatorios. |
| 4 | 🟡 MINOR | ARQ-6, SEG-3 | `PLAN_DEPLOY.md:189` (`record`), `:149-151`, `:207-209` | `record` recalcula `sourceCommit`/`suiCliVersion`/`frameworkRev` del estado **actual**, y no dice qué regla aplica en testnet. Tras un `publish` exitoso el árbol ya está sucio (la CLI escribió `Published.toml`). | Recuperación en #8: el script falla después de publicar y el owner corre `record --network testnet`. Si aplica "árbol limpio", falla justo en el caso para el que existe. Si no lo aplica y el owner commiteó o cambió de CLI entretanto, el json registra datos de trazabilidad falsos. | Al publicar, guardar junto a la salida cruda (mismo directorio `0700`, `0600`) un `meta.json` con los tres campos, el `chainId` y la red, y que `record` los lea de ahí. Sin ese archivo, `record` exige `--source-commit` explícito. Test del caso. |
| 5 | 🟡 MINOR | agents.md §3 (tabla, "`sui client publish` — solo el owner o con su autorización explícita"), §3 paso 4 | `PLAN_DEPLOY.md:347-356` (TASK-1: "pasos 1-7, sin desvíos" + `publish` de una copia) | El `publish` de la copia en la localnet aislada **es** un desvío del §3, que solo documenta `test-publish`, y la fila de la tabla prohíbe `sui client publish` a agentes sin autorización explícita (la tabla no distingue la red). Además, el `[environments] localnet` de la copia obliga a pinear el framework para la PV de la localnet (`sui_flavor.rs:179-199`, modo conectado, `protocol_version()` del nodo), distinta de la del lock (PV 139). Lo probable es una descarga git nueva al `~/.move` **real** (`MOVE_HOME` del `env.sh`). | El DEV hace algo que §3 no permite a la letra y el plan dice "sin desvíos". La descarga a `~/.move` no se declara. Si `--verify-deps` (por defecto) falla contra el framework de la localnet, el task se detiene (está previsto, bien). | Declararlo como **desvío acotado** con autorización explícita del usuario (pregunta abajo) y aclarar la fila de §3 ("testnet: solo el owner; localnet aislada: agentes"). Anticipar y declarar la descarga a `~/.move` (lo pide §3 paso 2). La copia vive solo en `$SMOKE_DIR` y se borra al cerrar. |
| 6 | 🟡 MINOR | H11, SEG-3 | `PLAN_DEPLOY.md:182`, `:406-407` | El plan pide `'n\n'` en cada invocación, pero no lo hace verificable. Con stdin vacío (EOF) la CLI toma la respuesta como **"sí"**: `read_line` devuelve `""` y `!response.is_empty()` es falso (`crates/sui/src/sui_commands.rs:1644-1646, 1722-1727`). Crea el keystore y **imprime la frase** (`:1650-1659`, `:1716`). `-y/--yes` hace lo mismo sin preguntar (`sui client --help`: "Create a new sui config without prompting"). | Un `spawnSync` sin `input` (stdin = pipe vacío) con una config que falta (p. ej. `SUI_CONFIG_DIR` mal escrito) crea una clave y su frase termina en el stdout capturado. Ese stdout se guarda en la "salida cruda" o se imprime en un error. | Un único wrapper `runSui(args)` exportado y testeado: siempre `input: 'n\n'`, `shell: false`, y rechaza `-y`, `--yes` y `--client.config` en `args`. Tests: cada `publishCliArgs(...)` sin esos flags y el wrapper con `input === 'n\n'`. |
| 7 | 🟡 MINOR | SEG-3, agents.md §7 ("Repo público") | `PLAN_DEPLOY.md:207-208`, `:236-237` (paso de #8 "entregar … output") | Solo se aparta el **stdout** crudo. El stderr de la CLI se muestra tal cual y puede traer la dirección del publicador (errores de selección de gas, "Error executing transaction '<digest>'…", `client_commands.rs:3854-3857`). | En #8 el owner pega "el output sin secretos" en el PR y arrastra su dirección desde un mensaje de error de la CLI. | Guardar también el stderr en el directorio temporal (`0600`). El script imprime solo sus propios mensajes, los 14 campos y el digest si la CLI lo dio, nunca el stderr crudo. Test: el resumen impreso no contiene `sender`/`owner` del fixture. |
| 8 | 🟡 MINOR | Exactitud (C7) | `PLAN_DEPLOY.md:59`, `:219-221`, `:488` (smoke paso 2: "ningún archivo escrito") | `test-publish` **crea el pubfile al cargar el paquete**, también con `--dry-run`: si no existe, `load_ephemeral_pubfile` escribe uno con `build-env`/`chain-id` y `published = []` (`external-crates/move/crates/move-package/src/package/root_package.rs:339-351`). Y `save_lockfile_to_disk` corre antes del dry run (`client_commands.rs:4227` < `:4241`). | El paso 2 del smoke espera "ningún archivo escrito" y aparece `Pub.localnet.toml`. El DEV lo reporta como desvío o, peor, lo borra antes del paso 3. | C7: "no escribe `Published.toml`; con `test-publish` sí crea el pubfile vacío si no existía; el lock puede cambiar (C5)". Ajustar `:219-221` y el resultado esperado del paso 2. |
| 9 | 🟡 MINOR | ARQ-6 (contrato para #9..#14) | `PLAN_DEPLOY.md:129`, `:147-151` | (a) `publishedAt` (fecha) choca de nombre con `published-at` de `Published.toml`, que es una **dirección** y se mapea a `packageId` en `checkConsistency` (`:211`). (b) Tras un upgrade, `publishTxDigest`/`publishedAt` describen la publicación original, mientras `sourceCommit`/`suiCliVersion`/`frameworkRev` "los fija el script de upgrade", o sea describen la versión actual. El esquema no dice a qué versión pertenece cada uno. | Un lector de `testnet.json` después del primer upgrade cruza `sourceCommit` (de v2) con `publishTxDigest` (de v1). Un DEV de #9 confunde `publishedAt` con `published-at`. | Renombrar a `publishedAtTimestamp` o `publishTimestamp` mientras el esquema no está publicado. Una línea por campo en la tabla: "describe la publicación original" o "describe la versión en `packageId`". Si los de trazabilidad describen la versión actual, prever `packageTxDigest` (aditivo, opcional por el hallazgo 3). |
| 10 | 🟡 MINOR | ARQ-4, PROY-18 | `PLAN_DEPLOY.md:421-423` | `setup-node@949feb2…` (v7.1.0) tiene `package-manager-cache` con **default `true`**: cachea npm solo si `package.json` declara `packageManager`/`devEngines.packageManager` (`action.yml` en ese SHA). Hoy la raíz no lo declara. | Si #9 (u otro) agrega `packageManager` a la raíz, el job `contracts` empieza a restaurar y guardar la caché de npm y a depender de `package-lock.json` sin que nadie lo haya decidido. Eso acopla los dos jobs que el plan quiere en "zonas distintas". | `with: { node-version-file: .nvmrc, package-manager-cache: false }` en el job `contracts`. Opcional: comprobar el major como hace #9 (`[[ "$(node --version)" == "v$(cat ../.nvmrc)."* ]]`, desde `contracts/`). |
| 11 | 🟡 MINOR | Evidencia (M3) | `PLAN_DEPLOY.md:38` (`agents.md:121-142`), `:92` (`agents.md:121-127`) | Referencias corridas. La localnet aislada es `agents.md:83-142`, y el motivo ("sin `SUI_CONFIG_DIR` reescribe `client.yaml` y crea claves") está en `agents.md:85-87` y `:240-242`, no en `:121-127`. | Un DEV que sigue la cita cae en el paso 4 y no ve el motivo. | Corregir las dos citas. |
| 12 | 🔵 SUGGESTION | H13, PROY-11 | `PLAN_DEPLOY.md:214`, `:221` | Como `save_lockfile_to_disk` corre antes del dry run (`client_commands.rs:4227`), un `--dry-run` en testnet **ya revela** el delta del lock. | Hoy el script solo avisa del delta **después** de publicar: el bytecode publicado no corresponde al `sourceCommit`. | En testnet: un delta de `Move.lock` tras el dry run es **error** ("repin pendiente, H13: commitear y re-medir gates"), y el `publish` real hace antes un dry run interno y aborta si el lock cambió. |
| 13 | 🔵 SUGGESTION | Recuperación (#8) | `PLAN_DEPLOY.md:189`, `:503` | Si la CLI falla **después de enviar** la tx (la espera del checkpoint vence, `wallet_context.rs:517-525`), no hay JSON ni `Published.toml`, pero la publicación puede existir. `sui client --json tx-block <digest>` devuelve el **mismo** resultado `TransactionBlock` legado (`client_commands.rs:1126-1130`). | El owner reintenta el `publish` y deja dos paquetes con dos Houses en testnet. | En el README: "nunca reintentar sin mirar el digest"; `record --from <tx-block.json>` vale como entrada; reconstruir `Published.toml` a mano en ese caso es STOP de #8. |
| 14 | 🔵 SUGGESTION | LIM-11 | `PLAN_DEPLOY.md:364-367` | El dry run real no trae `digest` ni `timestampMs`. Sus claves son `effects`, `events`, `objectChanges`, `balanceChanges`, `input`, `executionErrorSource` y `suggestedGasPrice` (`client_commands.rs:2758-2777`). | `parseDryRunOutput` escrito "por analogía" con el de la publicación busca claves que no existen. | Que el handoff fije esas claves como forma esperada y que el test las lea del fixture real. |
| 15 | 🔵 SUGGESTION | Usabilidad | `PLAN_DEPLOY.md:460-463` | El README remite a §3 de `agents.md`, escrito para agentes (scratchpad, `env.sh`, `run_in_background`). | Un humano (owner o colaborador) no tiene un procedimiento propio para la localnet. | Una variante corta para humanos en el README, con las mismas reglas: directorio propio, `SUI_CONFIG_DIR`, sin `--force-regenesis` a secas, sin `~/.sui/`. |

### Validado como correcto (con evidencia propia @ `testnet-v1.83.0`)

- **C1 / qué escribe `publish`:** `Published.toml` en la raíz del paquete (`move-package/src/package/paths.rs:322-323`),
  con `[published.<env>]` y los campos `chain-id`, `published-at`, `original-id`, `version`, `toolchain-version`,
  `build-config` y `upgrade-capability` (`schema/pubfile.rs:14-40`, `sui_flavor.rs:133-139`, `update_publication` en
  `client_commands.rs:4153-4169`). **No guarda direcciones de cuentas ni rutas.** Cabecera "SHOULD be committed"
  (`pubfile.rs:52-59`). Se escribe solo tras una ejecución exitosa (`client_commands.rs:4251-4265`).
- **C2 / `Pub.*.toml`:** `source` con rutas **absolutas** ("local paths are absolute", `schema/localpubs.rs:42-47`),
  cabecera "should not be committed" (`:66-73`); nombre por defecto `Pub.<alias>.toml` (`client_commands.rs:832-837`).
  Si el archivo es de otra génesis o de otro `build-env`, la CLI aborta (`root_package.rs:320-336`).
- **C3:** `publish` rechaza `--pubfile-path` y `--build-env` (`client_commands.rs:955-958, 4522-4543`) y elige el
  entorno del manifest por nombre o por chain id (`find_env.rs:31-61, 111-132`). Con el `Move.toml` actual solo existen
  `testnet`/`mainnet` (`sui_flavor.rs:153-157`).
- **C4 / doble publicación:** `compatibility_checks` (`client_commands.rs:2161`) aborta con "already published"
  (`:2215-2223`). Se llama desde `compile_package` (`:2124`), **antes** del dry run: también bloquea `--dry-run`.
- **C6, C8, C10, C12, C13:** `--gas-budget` opcional (`:686-693, 3747-3766`); una tx fallida devuelve `Err` sin JSON
  (`:3841-3858`); el aviso de protocolo sale por `eprintln` (`:3893-3910`); `ChainIdentifierOutput { base58, hex }`
  (`:2865-2873`); el upgrade lee el `UpgradeCap` de `Published.toml` y conserva `original-id` (`:4322-4331,
  4171-4182`); `make_ephemeral` descarta las publicaciones que no son de sistema (`graph/mod.rs:126-155`).
- **C9 / salida `--json`:** respuesta legado con `objectChanges` `published`/`created`, cada una con `sender` y
  `owner` (`client_commands.rs:2607-2688, 2741-2756`). `timestampMs`/`checkpoint` vienen siempre en una ejecución:
  la CLI espera el checkpoint (`wallet_context.rs:517-525`). La condición de STOP del plan (`:370-371`) no se dispara
  en una ejecución real.
- **C11:** primeros 4 bytes de las constantes base58 (`digests.rs:164-165, 262-270`), recalculados aquí:
  testnet `4c78adac`, mainnet `35834a8a`.
- **STOP-3:** la CLI **lee** `Published.toml` (cap de upgrade, bloqueo de doble publicación): no es una caché. (a) es
  la única opción coherente con la CLI y con PROY-11.
- **Esquema y SEG-3:** ninguno de los 14 campos es una dirección de cuenta. `houseCapId` no expone más que
  `houseId`/`publishTxDigest` (la dirección del publicador ya se ve on-chain desde cualquiera de los dos). Soporta
  upgrades (`packageId` cambia, `originalPackageId` no, alineado con #7 "Notas"). Cubre lo que consume #9
  (`PLAN_APP.md:57-73`: `schemaVersion`, `network`, `chainId`, `packageId`, `originalPackageId`, `houseId`),
  #8 (`houseId`, `houseCapId` para `update_fee_rate`, cuyo orden `(house, cap, bps)` coincide con
  `contracts/sources/house.move`), #10/#13 (tipos por `originalPackageId`) y #14 (`houseCapId`). La ruta del fixture
  `contracts/scripts/fixtures/localnet.deployment.json` ya es contrato de #9 (`PLAN_APP.md:467`): mantenerla.
- **`actions/setup-node`:** `git/ref/tags/v7.1.0` → commit `949feb2413d6458794dcd2491c4babbbce0c15c1`, release
  publicado el 2026-10-08T02:52:34Z (más de dos semanas). Es el mismo SHA que usa `PLAN_APP.md:367`. `runs.using: node24`; los inputs
  `node-version-file` y `package-manager-cache` existen. Los cambios caen en zonas distintas de `ci.yml` (steps del job
  `contracts` frente al bloque `TODO(#9)` en `ci.yml:131-132`).
- **TASK-1 en localnet aislada:** la captura de `test-publish` sigue el §3 (prefijo, `act_as`, `--pubfile-path` en
  `$SMOKE_DIR`, cierre del paso 7, nada de `net/`). Los fixtures son stdout de la CLI sin editar (IDs, direcciones de
  la génesis desechable y firmas públicas), ningún `Pub.*.toml` y nada de `net/`. `Published.localnet.toml` no lo
  captura `.gitignore:6` (`Pub.*.toml` no casa con `Published.*`).
- **Salida cruda fuera del repo:** `mkdtemp` + `0600`. En el smoke cae dentro de `$SMOKE_DIR/tmp` (`TMPDIR` del
  `env.sh`) y se borra al cerrar.

### Recomendación por STOP (los decide el usuario)

- **STOP-1 → (a)**, con los ajustes de los hallazgos 3 y 9 (campos opcionales a partir de v1; renombrar `publishedAt`;
  aclarar a qué versión describe cada campo). `houseCapId` no agrega exposición y evita que #14 tenga que buscar por
  tipo. `contracts/README.md:149` ya lo promete.
- **STOP-2 → (a)** Node 26 `.mjs` sin dependencias. Dos validadores (JS en #7, TS en #9) son aceptables con el fixture
  real compartido. (b) queda como mejora si aparece un tercer consumidor.
- **STOP-3 → (a)** `Published.toml` manda, el json se deriva y la CI verifica la coherencia (evidencia arriba).
- **STOP-4 → (a), reformulada (hallazgo 2):** 4.1 la confirmación por terminal es una barrera contra accidentes, sin
  ningún bypass por flag o variable de entorno. 4.2 la clave del owner va en una config propia (`SUI_CONFIG_DIR`) y
  `~/.sui/sui_config/` queda sin claves para siempre; el script lo exige en testnet. Si el usuario no quiere un script
  capaz de publicar, (b) es la alternativa segura, a costa de las comprobaciones previas. (c) no.
- **STOP-5 → (a)** dos steps en el job `contracts` con el mismo SHA de #9 y `package-manager-cache: false`
  (hallazgo 10).

### Preguntas al usuario (bloquean la v2)

1. STOP-4.2: ¿la clave publicadora de #8 va en un `SUI_CONFIG_DIR` propio, de modo que `~/.sui/sui_config/` quede
   sin claves para los agentes? Esto cambia STATUS H11 y agents.md §11/§12.
2. TASK-1: ¿se autoriza que el DEV corra `sui client publish` de una **copia** del paquete en la localnet aislada,
   para capturar un `Published.toml` real (hallazgo 5)? La alternativa es un fixture de `Published.toml` construido
   desde el esquema de la CLI (`pubfile.rs`), marcado como sintético.

### Cambios exigidos para la v2

1. Hallazgo 1: hecho nuevo de `chain-identifier` en la tabla C; fuera del criterio de TASK-2 toda ejecución contra
   `~/.sui/`; regla "ningún agente corre el camino testnet, ni con `--dry-run`".
2. Hallazgo 2: STOP-4 reescrito con 4.1/4.2, la guarda `SUI_CONFIG_DIR` (si se aprueba) y el texto honesto.
3. Hallazgos 3-11: corregidos en el plan (reglas del esquema, `meta.json` de `record`, desvío declarado de TASK-1,
   wrapper `runSui`, stderr, C7 y smoke paso 2, nombres y semántica de campos, `package-manager-cache`, citas).
4. Sugerencias 12-15: a criterio del MID; si no las adopta, una línea con el motivo.

---

## Revisión v2 — Veredicto: APROBADO, con 5 correcciones 🟡 obligatorias antes del handoff de cada task (0 🔴, 0 🟠, 5 🟡, 1 🔵)

> MAYOR · 2026-11-02 · `documents/PLAN_DEPLOY.md` **v2** (sin trackear) · branch `feature/issue-7-deployments` @ `8c67221`
> (= `master`, sin commits propios) · decisiones aplicadas: D-20261102-01 y D-20261102-03 (`documents/DECISIONES.md`,
> sin commitear). Evidencia nueva @ `testnet-v1.83.0`: `crates/sui-config/src/lib.rs`, `crates/sui/src/sui_commands.rs`,
> `crates/sui-sdk/src/wallet_context.rs`. `~/.sui/sui_config/client.yaml` sin cambios (`stat` =
> `2026-10-30 17:52:52.515735237 -0500 244`).

### Estado de los hallazgos de v1

| v1 | Estado | Evidencia en v2 |
|---|---|---|
| 1 🟠 `chain-identifier` reescribe el `client.yaml` | ✅ resuelto | C12 (`:80`), guarda 2 antes de cualquier `sui` (`:213-216`), `chain-identifier` solo si `active-env` coincide (`:217-219`), criterio de TASK-2 sin `~/.sui/` ni testnet (`:415-419`). Verifiqué que `active-env` no escribe nada: `get_wallet_context` + `WalletContext::new` solo leen (`sui_commands.rs:1730-1743`, `wallet_context.rs:35-52`). Ver la observación de la v2-1 sobre el paso 8 del smoke |
| 2 🟠 protección de testnet | ✅ resuelto | D4/D-20261102-03 (`:33`), guarda 2 en ambas redes (`:213-216`), confirmación descrita como freno sin bypass y con test (`:228-231`, `:426-428`), tabla "Quién corre qué" (`:263-270`), TASK-3 corrige H11 y `agents.md` §11 (`:454-460`) |
| 3 🟡 campos opcionales | ✅ | `:176-183` |
| 4 🟡 `record` / `meta.json` | ✅ | `:233-235`, `:253-256`, `resolveRecordMeta` con test (`:385`, `:428-429`) |
| 5 🟡 publicación de la copia | ✅ | D6 (`:35`), desvío declarado y `MOVE_HOME` aislado (`:324-334`). Ver v2-6 |
| 6 🟡 `runSui` | ✅ con ajuste | `:193-198`, tests en `:420-422`. Ver v2-3 |
| 7 🟡 stderr | ✅ con ajuste | `:239-243`, `redactAddresses` (`:355`). Ver v2-4 |
| 8 🟡 C7 / paso 2 del smoke | ✅ | `:75`, `:474` |
| 9 🟡 nombre y semántica | ✅ | `publishTimestamp` y columna "Describe" (`:149-167`) |
| 10 🟡 `setup-node` | ✅ | `:393-398`. Comprobado: `../.nvmrc` desde `working-directory: contracts` con shell bash |
| 11 🟡 citas | ✅ | `:54` |
| 12-15 🔵 | adoptadas | `:224-227`, `:284-285`, `:78`/`:344-345`, `:443-446` |

### Hallazgos nuevos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| v2-1 | 🟡 MINOR (obligatoria antes del handoff del smoke) | D-20261102-03 §1, FLUJO §4 ("no contradice DECISIONES") | `PLAN_DEPLOY.md:480` (paso 8 del smoke), `:416-417` (criterio de TASK-2: "con el paso 8 del smoke") vs `:33`, `:270` | El paso 8 hace que **un agente** corra `publish --network testnet --dry-run`. D-20261102-03 y la propia tabla del plan dicen "ningún agente corre el camino testnet del script, ni con `--dry-run`". El paso es inocuo: falla en la guarda 3 con la config aislada, antes de `chain-identifier`. Pero contradice una decisión del usuario tal como está escrita. | El DEV ejecuta un comando que la decisión prohíbe y el revisor de integración debe marcarlo. Peor: sienta el precedente de "testnet con `--dry-run` está bien si falla". | Quitar el paso 8 y la mención en `:416-417`. `checkNetworkGuard` ya cubre "alias distinto ⇒ error sin pedir chain id" con tests puros (`:423-424`). Si el MID quiere conservar la prueba negativa, la tiene que autorizar el usuario de forma explícita. |
| v2-2 | 🟡 MINOR (obligatoria en TASK-2) | D-20261102-03 §1, SEG-3 | `PLAN_DEPLOY.md:213-216` (guarda 2), `:382`, `:422-423` | La guarda valida una ruta que **puede no ser la que usa la CLI**. (a) La CLI lee `SUI_CONFIG_DIR` tal cual (`crates/sui-config/src/lib.rs:45-52`) y corre con `cwd = contracts/` (`:190-191`). Con una ruta relativa, el script la resuelve contra su propio cwd y la CLI contra `contracts/`. (b) Si el directorio no existe, `sui_config_dir()` lo **crea** (`lib.rs:53-58`). Con `""` la variable está "definida" pero vacía. (c) La guarda solo compara igualdad con `<home>/.sui/sui_config`, mientras D-20261102-03 pide la config del owner "separada de `~/.sui/`". | El owner corre desde la raíz con `SUI_CONFIG_DIR=.sui-owner node contracts/scripts/publish.mjs …`. El `realpath` del script apunta a `./.sui-owner`, pero la CLI busca `contracts/.sui-owner`: lo crea vacío, pregunta, recibe `n` y aborta. Así deja un directorio basura en el árbol y la guarda validó otra cosa. Con `~/.sui/owner_config`, la guarda pasa aunque D-03 dice "separada". | `checkConfigDirGuard`: exigir una ruta **absoluta** y no vacía, un directorio existente con `client.yaml`, y aplicar `realpath` a **los dos lados** de la comparación. Rechazar cualquier ruta **dentro** de `<home>/.sui/` (para los dos `home`). `runSui` pasa a la CLI `env: { ...process.env, SUI_CONFIG_DIR: <realpath validado> }`, así la ruta comprobada es la que se usa. En `agents.md` §3/§12 (TASK-3): la ruta de la config del owner **nunca** se escribe en el repo, issues, handoffs ni reportes, y un agente solo define `SUI_CONFIG_DIR` como `$SMOKE_DIR/net`. Tests de cada caso. |
| v2-3 | 🟡 MINOR (obligatoria en TASK-2) | H11, D4 | `PLAN_DEPLOY.md:193-198`, `:420-421` | La "lista blanca de subcomandos" no dice cómo compara, y `runSui` no rechaza `--client.env <ENV>`. Ese flag global de `sui client` reemplaza el env activo (`sui client --help`; `sui_commands.rs:1739-1741`, `with_env_override`). | Un cambio futuro arma `['client','--json','--client.env','testnet','publish']`: la guarda 3 leyó `active-env` = `localnet` y la publicación sale con otro env. Con una comparación por prefijo, el vector pasaría la lista blanca. | La lista blanca compara el **vector completo**: los tres de lectura fijos y los exactos de `publishCliArgs` (con `--build-env testnet`, `--pubfile-path <x>` y `--dry-run` como únicos agregados). Rechazar también `--client.env` y `--client.env=…`. Tests. 🔵 de paso: un `maxBuffer` explícito y holgado en `spawnSync` (con el default de 1 MiB, una salida grande mata a la CLI y se pierde el stdout crudo). |
| v2-4 | 🟡 MINOR (obligatoria en TASK-1/2) | SEG-3, agents.md §7 | `PLAN_DEPLOY.md:241-242`, `:355`, `:366` | `redactAddresses` solo tapa `0x` + 64 hex. En los mensajes de error de la CLI hay direcciones en otras formas: `AccountAddress` de Move se muestra **sin `0x`**, y hay formas cortas o recortadas en tipos y ubicaciones de abort. Además, el plan no prohíbe que los mensajes de error del propio script citen el stdout crudo (por ejemplo, en un fallo de `JSON.parse`). | Un error con la dirección sin prefijo o con un fragmento del stdout (que trae `sender`) llega a la terminal del owner y de ahí al PR de #8 como "output sin secretos". | Tapar `\b(0x)?[0-9a-fA-F]{40,64}\b`; los digests base58 no quedan afectados en la práctica, y el test lo cubre. El script **nunca** incluye stdout crudo en sus mensajes: solo la ruta del archivo. Tests con la dirección con y sin `0x` y con un `JSON.parse` fallido. |
| v2-5 | 🟡 MINOR (coordinación con #9, obligatoria en TASK-3) | ARQ-8, agents.md §3 paso 7 | `PLAN_DEPLOY.md:451-452` (paso 4 de §3 con `--out "$SMOKE_DIR/localnet.json"`), `:482`; `PLAN_APP.md:514`, `:521`, `:526` | El script de §3 que deja #7 escribe en `$SMOKE_DIR`. El smoke de #9 necesita la ruta **por defecto** `contracts/deployments/localnet.json` (el `import.meta.glob` de `config.ts`) y cierra solo con `git status --porcelain` limpio. Como el archivo está ignorado (`.gitignore:7`), sobreviviría a la génesis destruida. Además, sin despliegues commiteados, `contracts/deployments/` no existe. | Un DEV de #9 sigue `agents.md` §3 tal cual: la app muestra `ConfigError`. O usa la ruta por defecto: el script falla si no crea el directorio, y tras el cierre queda un `localnet.json` viejo que la app y el `check` local siguen leyendo. | TASK-3: el paso 4 de §3 documenta las dos variantes (`--out "$SMOKE_DIR/…"` para el smoke del script; sin `--out` cuando la app lo necesita) y el paso 7 agrega `rm -f contracts/deployments/localnet.json` (pertenece a la génesis que se borra). El script hace `mkdir -p` del directorio de `--out`. El orquestador avisa al MID de #9 para que su smoke remita a esa variante. |
| v2-6 | 🔵 SUGGESTION | agents.md §3 paso 2 | `PLAN_DEPLOY.md:327-332` | Con `MOVE_HOME` vacío, la publicación de la copia descarga entero el framework desde git. Puede superar el tiempo máximo de una llamada del agente, y `du -s` no detecta un archivo modificado que conserve su tamaño. | Timeout a mitad de la descarga; o un cambio en `~/.move` sin declarar. | Correrla como comando en segundo plano o con `timeout` declarado. Además de `du -s`, comparar `find ~/.move -newer <marca>` antes y después. |
| v2-7 | 🟡 (texto, va con la v2-2) | Exactitud | `PLAN_DEPLOY.md:47-49` | "…la nota '#8: el owner agrega su clave a este mismo `client.yaml`', que **reemplaza D-20261102-03**": está al revés. | Un lector entiende que la nota de H11 prevalece sobre la decisión. | "…que **D-20261102-03 reemplaza**". |

> Nota: v2-7 es una corrección de redacción y se cuenta junto con la v2-2. Total de cambios 🟡 exigidos: v2-1 a v2-5 (+ v2-7).

### Validado como correcto (v2)

- **Ningún `sui` antes de la guarda 2:** la guarda 1 no invoca la CLI. `active-env` solo lee
  (`sui_commands.rs:1730-1743` + `wallet_context.rs:35-52`). `chain-identifier`, que escribe (C12), corre solo
  después de las guardas 2 y 3, así que nunca sobre `~/.sui/`. `sui --version` lo resuelve clap sin cargar la config.
- **`runSui`:** `input: 'n\n'` (C13 verificado: con EOF, `read_line` da `""` y cuenta como "sí",
  `sui_commands.rs:1644-1646, 1722-1727`), `shell: false`, rechazo de `-y`/`--yes`/`--client.config`, `spawn`
  inyectable para los tests.
- **`meta.json`:** se escribe antes de publicar (`:233-235`) en un directorio `0700` con archivos `0600`, y cubre el
  caso "falló después de enviar" junto con `tx-block` (C17, `client_commands.rs:1126-1130`).
- **Camino testnet:** dry run interno obligatorio. Si el lock cambia, es error (C5: `save_lockfile_to_disk` en
  `client_commands.rs:4227`, antes de `:4241`). La guarda 5 va antes de la 6, así que el `sourceCommit` es de un
  árbol limpio.
- **CI:** mismo SHA de `setup-node` que #9 (`949feb2…`, v7.1.0), `package-manager-cache: false`, chequeo del major
  de Node, sin tocar `TODO(#9)`.
- **Contrato para #9:** 14 campos obligatorios, campos nuevos opcionales, `publishTimestamp` sin ambigüedad, la
  ruta del fixture estable (`:186`). Sigue cubriendo lo que consume `PLAN_APP.md` (`schemaVersion`, `network`,
  `chainId`, `packageId`, `originalPackageId`, `houseId`).

### Condición de aprobación

Aprobado para generar los handoffs, con estas correcciones: v2-2, v2-3 y v2-4 en el handoff de TASK-2 (y la parte
de `redactAddresses` en TASK-1), v2-5 en TASK-3, v2-1 en el smoke. v2-7 puede ir en una v2.1 o en el handoff de
TASK-3. No hacen falta STOPs nuevos: si el MID quiere conservar el paso 8 (v2-1), esa sí es una pregunta para el
usuario.
