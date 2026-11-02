# PLAN_DEPLOY v2
> Issue: #7 (+ #8 publicación en testnet, #9 consumidor del formato) | Áreas: contracts (tooling), ci, docs | Fecha: 2026-11-02
> Branch: `feature/issue-7-deployments` (al día con `master` @ `8c67221`) | Autor: MID | Estado: **v2.1 — APROBADO por el MAYOR** (revisión v2; v2-1..v2-6 se aplican en `documents/HANDOFF_DEPLOY.md`, v2-7 aquí)
> Decisiones del usuario: **D-20261102-01** (STOP-1..5 = (a)) y **D-20261102-03** (clave del owner en un `SUI_CONFIG_DIR`
> propio, `~/.sui/` sin claves para siempre, confirmación por terminal solo como freno contra accidentes, ningún agente en
> el camino testnet, publicación de una copia en la localnet aislada autorizada). Revisión aplicada:
> `documents/REVISION_PLAN_DEPLOY.md` (v1: 2 MAJOR, 9 MINOR, 4 SUGGESTION). Cambios v1→v2 al final.

## Historia de usuario

**Como** owner del juego (y como DEV que prueba en una red local), **quiero** publicar el paquete con un
solo comando que compruebe que estoy en la red y con la configuración correctas y deje anotados, en un
archivo con formato fijo, los identificadores públicos de lo publicado (paquete, House, capabilities,
transacción), **para** que la app los lea de un único lugar sin copiar IDs a mano, que la publicación en
testnet (#8) sea reproducible y recuperable, y que ningún dato del owner (claves, frase de recuperación, su
dirección) termine en el repo ni al alcance de los agentes.

**Scope en una frase:** el formato documentado y estable de `contracts/deployments/<red>.json`, un script
Node sin dependencias que publica (o registra una publicación ya hecha) y escribe ese archivo, sus tests
con salidas reales de la CLI, y la validación de los deployments commiteados en la CI.

**Lo que NO entrega:** la publicación en testnet (#8, la hace el owner con este script desde su propia
config); el consumo del json en la app (#9); scripts de upgrade (aquí solo queda definido cómo cambia el
json en un upgrade); `update_fee_rate` post-publicación (#8: el script solo imprime el comando); mainnet.

## Decisiones del owner (no reabrir)

| ID | Decisión |
|---|---|
| D1 (D-20261102-01 §1) | Esquema de 14 campos con `upgradeCapId` y `houseCapId`, sin ninguna dirección de cuenta (STOP-1 = a) |
| D2 (D-20261102-01 §2) | Script en Node 26, JavaScript `.mjs`, sin dependencias, `node --test`, en `contracts/scripts/` (STOP-2 = a) |
| D3 (D-20261102-01 §3) | `contracts/Published.toml` es la fuente de los datos del paquete; el json se deriva con el script y la CI verifica la coherencia (STOP-3 = a) |
| D4 (D-20261102-01 §4 + D-20261102-03 §1) | El script publica con guardas; en testnet exige un `SUI_CONFIG_DIR` propio del owner (nunca `~/.sui/sui_config`) y la confirmación por terminal, que es **solo un freno contra accidentes**, sin flag ni variable que la salte. **Ningún agente corre el camino testnet, ni con `--dry-run`.** `~/.sui/sui_config/` queda sin claves para siempre (STOP-4 = a precisada) |
| D5 (D-20261102-01 §5) | `node --test` + `check` como steps del job `contracts`, `actions/setup-node` fijada por SHA (v7.1.0), coordinada con #9 (STOP-5 = a) |
| D6 (D-20261102-03 §2) | El DEV puede correr `sui client publish` de una **copia** del paquete en la localnet aislada para capturar un `Published.toml` real (TASK-1) |

## Contexto y alcance

### Qué existe hoy (repo @ `8c67221`)

- No hay `contracts/deployments/`, ni `contracts/Published.toml`, ni script de publicación (`git ls-files contracts`).
- `agents.md:180`: la tabla §5 fija `contracts/deployments/<red>.json` como único origen de IDs para la app;
  `agents.md:303-307` (§12): publicar es del owner y `testnet.json` va en el mismo PR.
- `.gitignore:6-7`: `Pub.*.toml` y `contracts/deployments/localnet.json` ya ignorados (#2). `Published.*` no casa
  con `Pub.*.toml`: el fixture `Published.localnet.toml` se puede commitear.
- `documents/ESTANDARES.md:71` (PROY-11): `Published.toml` se commitea, `Pub.*.toml` nunca. `ESTANDARES.md:19`
  (ARQ-6): una sola fuente del contrato. STATUS H11 (`documents/STATUS.md:79`): `Published.toml` vs
  `deployments/<red>.json` (resuelto por D3) y la nota "#8: el owner agrega su clave a este mismo `client.yaml`",
  que **D-20261102-03 reemplaza** (TASK-3 la corrige).
- `contracts/README.md:147-151` ("ID de la House"): promete registrar la House y el `HouseCap` (coherente con D1).
- `contracts/sources/house.move:82-93` (`init`): comparte la House, envía el `HouseCap` al publicador y, vía
  `claim_and_keep`, un `0x2::package::Publisher`. La House se crea en `init`: **no hay paso de inicialización
  aparte** (criterio del issue "si la House no se crea en `init`" → no aplica).
- `agents.md:83-142` (localnet aislada; motivo en `agents.md:85-87` y `:240-242`): procedimiento obligatorio para
  cualquier localnet de agentes. El smoke de #6 publicó con `test-publish --build-env testnet --pubfile-path
  "$SMOKE_DIR/Pub.localnet.toml"` (`git show 8fddbda:documents/SMOKE_ACCEPT.md`, paso 3: `success`, `Move.lock` sin
  cambio, House compartida con `initial_shared_version` 2, `HouseCap` del publicador).
- D-20261031-01: el fullnode 1.83.0 no sirve JSON-RPC. El script **no habla con ningún RPC**: solo invoca la CLI
  (`sui client …`, que usa gRPC por dentro) y lee su salida `--json`.

### Qué hace la CLI `1.83.0` (verificado en el código @ `testnet-v1.83.0`)

Fuentes descargadas con `gh api repos/MystenLabs/sui/contents/<ruta>?ref=testnet-v1.83.0`; `--help` corrido con
`SUI_CONFIG_DIR` y `HOME` apuntando a directorios vacíos del scratchpad y `printf 'n\n' |` (siguieron vacíos;
`~/.sui/sui_config/client.yaml` sin cambios: `stat` = `2026-10-30 17:52:52.515735237 -0500 244`).

| # | Hecho | Evidencia |
|---|---|---|
| C1 | `sui client publish` escribe `contracts/Published.toml` (raíz del paquete), una sección `[published.<env>]` con `chain-id`, `published-at`, `original-id`, `version`, `toolchain-version`, `build-config`, `upgrade-capability`; **sin direcciones de cuentas ni rutas**; cabecera "This file SHOULD be committed". Solo tras una ejecución exitosa | `client_commands.rs:4137-4184, 4251-4265`; `root_package.rs:269-310`; `schema/pubfile.rs:14-63`; `paths.rs:322-323`; `sui_flavor.rs:125-139` |
| C2 | `sui client test-publish` **no toca `Published.toml`**: escribe en `--pubfile-path` (por defecto `Pub.<alias>.toml`, relativo al cwd), con rutas **absolutas** del disco y cabecera "should not be committed". Si el archivo es de otra génesis u otro `build-env`, la CLI aborta; si ya tiene el paquete, "already published" | `client_commands.rs:472-491, 832-837, 970-1009, 2215-2223`; `root_package.rs:312-351`; `schema/localpubs.rs:13-47, 66-73` |
| C3 | `publish` **rechaza** `--pubfile-path` y `--build-env` y elige el entorno del manifest por nombre o chain id. Con el `Move.toml` actual (solo `testnet`/`mainnet` implícitos) **no se puede `publish` en localnet**: ahí se usa `test-publish --build-env testnet` | `client_commands.rs:943-958, 4522-4543`; `find_env.rs:31-61, 111-132`; `sui_flavor.rs:152-157` |
| C4 | Con el paquete ya en `Published.toml` para un entorno, `publish` aborta con "already published" **antes** del dry run (también bloquea `--dry-run`) | `client_commands.rs:2124, 2161, 2215-2223` |
| C5 | `publish`/`test-publish` guardan `Move.lock` antes de construir la transacción (también con `--dry-run`): si los pins no están al día, reescriben el lock | `client_commands.rs:4227-4228` (antes de `:4241`) |
| C6 | `--gas-budget` es **opcional**: sin él, la CLI estima con un dry run | `client_commands.rs:686-693, 3747-3766`; `--help` |
| C7 | `--dry-run` no ejecuta y **no escribe `Published.toml`** (retorna antes de `update_publication`); pero `test-publish` **crea el pubfile vacío** (`build-env`, `chain-id`, `published = []`) al cargar el paquete si no existía, también con `--dry-run`; y el lock puede cambiar (C5) | `client_commands.rs:4249-4256`; `root_package.rs:339-351` |
| C8 | Si la transacción falla, la CLI devuelve error (exit ≠ 0) sin JSON; el mensaje incluye el digest (`Error executing transaction '<digest>'`) | `client_commands.rs:3838-3858` |
| C9 | Con `--json`, ejecución: respuesta "legacy" (`digest`, `transaction`, `effects`, `events`, `objectChanges`, `balanceChanges`, `timestampMs`, `checkpoint`); `timestampMs`/`checkpoint` siempre presentes (la CLI espera el checkpoint). En `objectChanges`: `type: "published"` (`packageId`, `version`, `modules`) y `type: "created"` (`objectType`, `objectId`, `owner`, `sender`). **La salida cruda contiene la dirección del publicador** | `client_commands.rs:2606-2690, 2741-2758, 2802-2804`; `wallet_context.rs:517-525` |
| C10 | Con `--json --dry-run`: claves `effects`, `events`, `objectChanges`, `balanceChanges`, `input`, `executionErrorSource`, `suggestedGasPrice` — **sin** `digest` ni `timestampMs` | `client_commands.rs:2758-2777` |
| C11 | Avisos de la CLI (protocolo, errores) por **stderr**; `--json` es global de `sui client`; `--json chain-identifier` → `{"base58","hex"}`; `--json active-env` → string | `client_commands.rs:3893-3910, 2865-2873, 2998-3008`; `sui_commands.rs:336-338, 554-557` |
| C12 | **`sui client chain-identifier` reescribe el `client.yaml` activo** en cada llamada (cache `chain_id` del env activo: `load_with_lock` + `update_env_chain_id` + `save_with_lock`); `publish` también lo cachea si falta. `active-env` solo lee | `client_commands.rs:1605-1607`; `wallet_context.rs:174-195`; `find_env.rs:80-91` |
| C13 | Sin `client.yaml`, `sui client …` pregunta "create one [Y/n]?": **stdin vacío (EOF) cuenta como "sí"** (crea keystore e imprime la frase); `-y/--yes` crea sin preguntar | `sui_commands.rs:1640-1660, 1716, 1722-1727`; `sui client --help` |
| C14 | Chain id corto (8 hex, el de `Published.toml`): testnet **`4c78adac`**, mainnet **`35834a8a`** (calculados de las constantes base58) | `digests.rs:164-165, 262-270` |
| C15 | `sui client upgrade` lee el `UpgradeCap` y `published-at` de `Published.toml`; tras el upgrade actualiza `published-at` y `version` y **conserva `original-id`** | `client_commands.rs:4319-4333, 4170-4182` |
| C16 | `test-publish` en localnet sigue funcionando con `Published.toml` ya poblado para testnet (la carga efímera descarta publicaciones no-sistema) | `graph/mod.rs:126-155` |
| C17 | `sui client --json tx-block <digest>` devuelve el mismo `TransactionBlock` legacy que la publicación | `client_commands.rs:1126-1130` |

### Alcance

1. Esquema v1 de `contracts/deployments/<red>.json` documentado en `contracts/README.md` → "Despliegues".
2. `contracts/scripts/deployment.mjs` (funciones puras) + `contracts/scripts/publish.mjs` (entrada) + tests
   `node --test` con fixtures **reales** de localnet.
3. Validación en CI de los deployments commiteados y de su coherencia con `Published.toml` (D5).
4. Docs: `contracts/README.md`, `agents.md` §2/§3/§5/§11/§12, ESTANDARES ARQ-6, STATUS H11/H13.
5. Smoke en localnet aislada con el script (`documents/SMOKE_DEPLOY.md`, M5).

### Fuera de alcance

Publicar en testnet y commitear `testnet.json`/`Published.toml`, crear la config propia del owner, pre-vuelo H13 y
`update_fee_rate` (#8); `app/src/sui/config.ts` (#9); scripts de upgrade; mainnet; fixtures de lectura (#10).

### Ajustes al texto del issue

| Texto del issue #7 | Ajuste | Motivo |
|---|---|---|
| "Node 22 sin dependencias" | **Node 26** (`.nvmrc`) | D-20261030-10, PROY-17, D2 |
| README: "`sui start --with-faucet --force-regenesis` … faucet" | README: localnet aislada (variante corta para humanos + remisión a `agents.md` §3 para agentes) | `agents.md:85-87, 240-242`, D-20261030-07 |
| "ejecuta `sui client publish` … en la red activa" | localnet: `test-publish --build-env testnet --pubfile-path`; testnet: `publish` | C2, C3 |
| Esquema de 8 campos | 14 campos | D1 |
| "test con un fixture de un output real de localnet" | + fixtures reales del dry run y de un `Published.toml` | C1, C10, D6 |
| (no lo menciona) | Validación en CI; config propia del owner exigida en testnet | D5, D4 |

## Contrato on-chain

**Sin cambios.** Ningún archivo de `contracts/sources/`, `contracts/tests/`, `Move.toml` ni `Move.lock` se toca (el
lock solo podría cambiar por C5 durante una publicación: el script lo detecta, ver guardas). Sin impacto en
`app/src/sui/` más allá de que #9 consume el formato.

## Flujo de fondos

No aplica: el script no mueve SUI. Solo el gas de la publicación, que paga la cuenta activa de la CLI (en localnet,
una cuenta de la génesis aislada; en testnet, la del owner desde su config propia).

## Formato de `contracts/deployments/<red>.json` (contrato para #9) — D1

Un archivo por red: `localnet.json` (no se versiona, `.gitignore:7`) y `testnet.json` (lo commitea #8). Lo escribe
**solo el script** (nunca a mano), con `JSON.stringify(obj, null, 2)` + salto de línea final, en este orden.

Ejemplo (IDs **ficticios**):

```json
{
  "schemaVersion": 1,
  "network": "testnet",
  "chainId": "4c78adac",
  "packageId": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "originalPackageId": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "packageVersion": 1,
  "upgradeCapId": "0x2222222222222222222222222222222222222222222222222222222222222222",
  "houseId": "0x3333333333333333333333333333333333333333333333333333333333333333",
  "houseCapId": "0x4444444444444444444444444444444444444444444444444444444444444444",
  "publishTxDigest": "11111111111111111111111111111111",
  "publishTimestamp": "2026-11-05T14:03:12.345Z",
  "sourceCommit": "5555555555555555555555555555555555555555",
  "suiCliVersion": "1.83.0-16d2dc1e05ed",
  "frameworkRev": "719fb2960ccfbf9f4d33041f8ea5146d30671696"
}
```

| Campo | Tipo / formato | Significado y origen | Describe | Quién lo usa |
|---|---|---|---|---|
| `schemaVersion` | entero, `1` | Versión de este esquema | — | #9 (rechaza ≠ 1) |
| `network` | `"localnet"` \| `"testnet"` | Red; **igual al nombre del archivo** | — | #9 (indicador de red, PROY-15) |
| `chainId` | `^[0-9a-f]{8}$` | `.hex` de `sui client --json chain-identifier` (C11, C14). testnet ⇒ `4c78adac`; localnet ⇒ ∉ {`4c78adac`, `35834a8a`} | la red | script, CI; #9 puede compararlo con la red conectada |
| `packageId` | `^0x[0-9a-f]{64}$` | Última versión del paquete (= `published-at` de `Published.toml`, C1) | versión vigente | #9: targets `<packageId>::game::create_game` |
| `originalPackageId` | `^0x[0-9a-f]{64}$` | Paquete original (= `original-id`); en la 1.ª publicación = `packageId` | publicación original | #9/#10/#13/#14: tipos (`<originalPackageId>::game::GameCreated`, `…::house::HouseCap`) |
| `packageVersion` | entero ≥ 1 | Versión del objeto paquete (= `version` de C1); **no** es `house::VERSION` | versión vigente | diagnóstico, CI |
| `upgradeCapId` | `^0x[0-9a-f]{64}$` | `0x2::package::UpgradeCap` creado al publicar (también en `Published.toml`) | publicación original | owner (upgrades) |
| `houseId` | `^0x[0-9a-f]{64}$` | `…::house::House` compartida creada en `init` | publicación original | #9..#14 |
| `houseCapId` | `^0x[0-9a-f]{64}$` | `…::house::HouseCap` creado en `init`; el ID no cambia aunque el cap cambie de manos | publicación original | #8 (`update_fee_rate`), #14 |
| `publishTxDigest` | base58 `^[1-9A-HJ-NP-Za-km-z]{32,44}$` | Digest de la transacción de publicación | publicación original | trazabilidad, explorador |
| `publishTimestamp` | ISO 8601 UTC con ms (`…Z`) | `timestampMs` de la salida de la CLI (hora de la red, no del reloj local). **No confundir** con `published-at` de `Published.toml`, que es una dirección | publicación original | docs |
| `sourceCommit` | `^[0-9a-f]{40}$` o `null` | `git rev-parse HEAD` al publicar; `null` solo en localnet con árbol sucio | versión vigente | verificación de fuente |
| `suiCliVersion` | string no vacío | `sui --version` sin el prefijo `sui ` | versión vigente | trazabilidad (H13) |
| `frameworkRev` | `^[0-9a-f]{40}$` | `rev` de `[pinned.testnet.Sui]` en `Move.lock` al publicar (localnet también compila con `--build-env testnet`) | versión vigente | trazabilidad (H13) |

"Describe": **publicación original** = no cambia nunca; **versión vigente** = la del código en `packageId` (en v1
coincide con la original; un upgrade los reescribe y agrega el opcional `packageTxDigest`, ver "Upgrades").

**Qué NO va, y por qué:** ninguna dirección de cuenta (publicador, dueño del `HouseCap`/`UpgradeCap`/`Publisher`),
ni claves, ni frase (SEG-3): el script ignora `sender`/`owner` de la salida (C9) y un test lo verifica. La dirección
que publicó **sigue visible on-chain** desde `publishTxDigest` o `houseCapId`: excluirla del repo es higiene, no
secreto (D-20261102-01 §1). Tampoco: `Publisher` (sin uso en el MVP), `0x8`/`Random` (constante de sistema igual en
todas las redes: `tx.object.random()`, `contracts/README.md:384-386`), `initialSharedVersion` de la House (el SDK lo
resuelve), estado on-chain (fee, límites, `version` de la House).

**Reglas de compatibilidad (estables para #9):**

1. Los **14 campos de v1 son obligatorios**. Productor (script) y `check`: estrictos con ellos (faltante, formato
   inválido o clave desconocida ⇒ error).
2. Campos agregados después de v1: **opcionales** para `validateDeployment`/`check` (se valida su formato solo si
   aparecen) y se registran en el validador y en el README en el mismo PR. Así un archivo ya commiteado nunca
   queda inválido por un campo nuevo (y nunca hace falta editarlo a mano). Hacer obligatorio un campo nuevo,
   renombrar, quitar o cambiar el significado ⇒ `schemaVersion: 2` + STOP.
3. Consumidor (#9, `app/src/sui/config.ts`): valida tipo y formato de lo que usa, **rechaza `schemaVersion` ≠ 1**
   e **ignora claves desconocidas**.
4. Fixture real para #9 (ruta ya citada en `PLAN_APP.md`): `contracts/scripts/fixtures/localnet.deployment.json`.

## Script — diseño

`contracts/scripts/publish.mjs` (Node 26, ESM, solo módulos `node:*`; no es workspace npm). Invoca la CLI con
`cwd = contracts/` (resuelto desde la ruta del script) y binario `process.env.SUI_BIN ?? 'sui'`.

**Envoltorio único `runSui(args)`** (exportado y testeado; ninguna otra parte del script llama a la CLI):
`spawnSync(bin, args, { input: 'n\n', shell: false, encoding: 'utf8' })` — siempre `'n\n'` por stdin (C13: con EOF la
CLI crearía una clave e imprimiría la frase); **rechaza** (error sin invocar) `args` que contengan `-y`, `--yes` o
`--client.config`/`--client.config=…`; devuelve `{ status, stdout, stderr }`. Lista blanca de subcomandos: `--version`,
`client --json active-env`, `client --json chain-identifier`, `client --json publish`, `client --json test-publish`.
Nunca `active-address`, `addresses`, `keytool`, `new-address` ni `new-env`; nunca lee `~/.sui/` ni el keystore.

| Subcomando | Qué hace | ¿Invoca `sui`? |
|---|---|---|
| `publish --network localnet --pubfile-path <archivo> [--out <ruta>] [--dry-run]` | Guardas → `runSui(['client','--json','test-publish','--build-env','testnet','--pubfile-path',<archivo>(,'--dry-run')])` | sí |
| `publish --network testnet [--out <ruta>] [--dry-run]` | **Solo el owner, desde su config propia.** Guardas → dry run interno → confirmación → `runSui(['client','--json','publish'])` | sí |
| `record --network <red> --from <salida.json> [--meta <meta.json>] [--source-commit … --sui-cli-version … --framework-rev …] [--out <ruta>]` | Rearma el json desde una salida ya guardada (de `publish` o de `sui client --json tx-block <digest>`, C17); **nunca republica** | **no** |
| `check` | Valida cada `deployments/*.json` y su coherencia con `Published.toml` (lo corre la CI) | **no** |

`record` y `check` no invocan la CLI ni leen config: se pueden correr en cualquier entorno (gates, CI).

**Guardas de `publish`** (en este orden; cualquier fallo ⇒ exit 1 **sin** invocar `publish`/`test-publish`):

1. `--network` ∈ {`localnet`, `testnet`}; testnet sin `--pubfile-path`, localnet con `--pubfile-path` obligatorio (un
   `Pub.localnet.toml` viejo de otra génesis hace fallar a la CLI, C2).
2. **Config:** `SUI_CONFIG_DIR` definido y su `realpath` distinto de `<home>/.sui/sui_config` para **ambos** `home`
   (`os.homedir()` y `os.userInfo().homedir`, por si `HOME` está redefinido). Aplica a las dos redes: `~/.sui/` no se
   usa nunca para publicar (D4; además, C12 lo reescribiría). Sin `SUI_CONFIG_DIR` ⇒ "usa tu config propia"/"usa la
   localnet aislada".
3. **Red:** `runSui(['client','--json','active-env'])` = `--network` (solo lectura). **Solo si coincide**,
   `chain-identifier` (que escribe el cache en la config activa, C12, que por la guarda 2 nunca es `~/.sui/`):
   testnet = `4c78adac`; localnet ∉ {`4c78adac`, `35834a8a`}.
4. **CLI:** `sui --version` = `sui ${SUI_VERSION}-${SUI_COMMIT}` de `.github/workflows/ci.yml` (fuente única, PROY-17):
   testnet ⇒ error; localnet ⇒ aviso.
5. **testnet:** árbol git limpio (`git status --porcelain` vacío); no existen `deployments/testnet.json` ni
   `[published.testnet]` en `Published.toml` (republicar es decisión de #8, C4).
6. **testnet, dry run interno** (también es todo lo que hace `--dry-run`): `runSui([... 'publish', '--dry-run'])`;
   exige `effects.status` `success` y exactamente un paquete, una House, un `HouseCap` y un `UpgradeCap` en
   `objectChanges` (C10); si `Move.lock` cambió (C5) ⇒ **error**: "repin pendiente (H13): commitear el lock y re-medir
   los gates antes de publicar" (el árbol queda sucio y la guarda 5 impide seguir). Imprime el gas estimado.
7. **testnet sin `--dry-run`, confirmación:** si `process.stdin.isTTY` no es `true`, aborta; si lo es, el owner
   escribe `testnet`. Es **un freno contra accidentes, no un control de seguridad**: se puede simular una terminal
   (D-20261102-03). **No existe** flag ni variable de entorno que la omita (ni `--yes`, ni `CI`, ni otra), y un test
   lo verifica. La barrera real es que ninguna config al alcance de los agentes tiene claves (guarda 2 + D4).

**Antes de publicar** (tras las guardas): crea `fs.mkdtemp(os.tmpdir()/battleship-publish-)` (`0700`) y escribe
`meta.json` (`0600`) con `{ network, chainId, sourceCommit, suiCliVersion, frameworkRev }` — así existe aunque la CLI
falle después de enviar la transacción.

**Después de publicar** (orden pensado para no perder nunca una publicación hecha):

1. stdout crudo → `publish-output.json` y stderr crudo → `publish-stderr.txt`, ambos `0600` en ese directorio (la
   salida contiene la dirección del publicador, C9). Si la CLI falló, el script imprime su propio mensaje, la ruta
   del directorio, el digest si aparece en stderr (C8) y el stderr **con toda cadena `0x` + 64 hex reemplazada por
   `0x…`**; nunca el stderr crudo. Mensaje fijo: "No reintentes sin buscar antes el digest; si la transacción existe,
   usa `sui client --json tx-block <digest>` + `record` (STOP de #8 si falta `Published.toml`)".
2. Parsea, arma y valida el json, y escribe `--out` (por defecto `contracts/deployments/<red>.json`).
3. testnet: compara con la entrada `[published.testnet]` que la CLI acaba de escribir (`packageId`↔`published-at`,
   `originalPackageId`↔`original-id`, `packageVersion`↔`version`, `upgradeCapId`↔`upgrade-capability`,
   `chainId`↔`chain-id`); diferencia ⇒ error con detalle (el json ya quedó escrito para revisarlo).
4. `Move.lock`: si cambió (localnet, C5) ⇒ aviso "declarar el delta (PROY-11)".
5. Resumen **sin direcciones**: los 14 campos, la ruta del directorio temporal ("bórralo cuando termines") y
   "Siguiente paso obligatorio (#8)": `sui client call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> <bps>`
   (no lo ejecuta) y su verificación (`sui client object <houseId> --json`, campo `fee_rate`).

`record`: lee `--from` y el `meta.json` (por defecto, junto a `--from`; o `--meta`). Sin `meta.json` exige los tres
flags `--source-commit`, `--sui-cli-version`, `--framework-rev` (nunca los toma del estado actual del repo). El
`chainId` de `meta.json` tiene que ser coherente con `--network`. No exige árbol limpio (tras publicar, la CLI ya
escribió `Published.toml`).

**Identificación por tipo, nunca por posición:** exactamente un `objectChanges[].type == "published"`; exactamente un
`created` con `objectType` `<pkg>::house::House` (dueño `Shared`), uno `<pkg>::house::HouseCap` y uno
`0x2::package::UpgradeCap`, comparando direcciones normalizadas (minúsculas, 64 hex con ceros a la izquierda). Cero o
más de uno ⇒ error.

### Quién corre qué (regla para agentes, va a `agents.md` §3/§12)

| Comando | Agentes (DEV, MID, MAYOR, orquestador) | Owner |
|---|---|---|
| `node --test scripts/*.test.mjs`, `node scripts/publish.mjs check` | sí (gate) | sí |
| `node scripts/publish.mjs record …` | sí (con salidas de localnet) | sí |
| `node scripts/publish.mjs publish --network localnet …` | **solo** con el prefijo de la localnet aislada (`. env.sh && smoke_guard &&`, `agents.md` §3) | sí, con su localnet aislada |
| `node scripts/publish.mjs publish --network testnet …` (con o sin `--dry-run`) | **nunca** (D4) | sí, con `SUI_CONFIG_DIR` propio |

## Encaje con #8 y con upgrades

- **Config propia del owner (D-20261102-03):** en #8 el owner crea en su terminal, sin agentes, un directorio de
  config propio (`SUI_CONFIG_DIR=<dir> sui client …`), con su clave y el env `testnet`. `~/.sui/sui_config/` sigue sin
  claves para los gates y los agentes. El script lo exige (guarda 2).
- **Pre-vuelo H13:** repin (`update-deps -e testnet`), gates re-medidos y, si hace falta, CLI nueva **antes** del
  script. El script lo apoya: guarda 4 (CLI = la de `ci.yml`), guarda 5 (árbol limpio = lock repineado ya
  commiteado), guarda 6 (un lock que cambia en el dry run es error) y `frameworkRev` en el json.
- **Orden para el owner en #8:** checkout de la branch con el pre-vuelo → `SUI_CONFIG_DIR=<su dir> node scripts/publish.mjs publish --network testnet --dry-run`
  → igual sin `--dry-run` (dry run interno + confirmación; escribe `testnet.json`; la CLI escribe `Published.toml`) →
  `update_fee_rate` con el comando impreso → entregar `testnet.json` + `Published.toml` + digest (sin direcciones) →
  borrar el directorio temporal.
- **Fallo después de enviar:** no reintentar; buscar el digest (stderr filtrado o explorador), `sui client --json
  tx-block <digest>` + `record --meta`; si falta `Published.toml`, reconstruirlo es STOP de #8.
- **Republicación con IDs nuevos** (#8 Decisión 2): el owner borra a mano `[published.testnet]` y `testnet.json` y
  vuelve a correr el script; queda en el diff del PR.
- **Upgrades (fuera de alcance; el formato ya lo soporta):** `sui client upgrade` actualiza `published-at`/`version`
  de `Published.toml` (C15). El issue de upgrades extiende el script para reescribir los campos "versión vigente"
  (`packageId`, `packageVersion`, `sourceCommit`, `suiCliVersion`, `frameworkRev`) y agregar el opcional
  `packageTxDigest`; los de "publicación original" no cambian. Procedimiento (comentario de #8 del 2026-10-30, va al
  README → "Versionado"): upgrade → `migrate` de inmediato con el `HouseCap` → `testnet.json` en el mismo PR → la app
  usa el paquete nuevo. Entre el `migrate` y el deploy de la app, crear/aceptar desde la app vieja aborta con
  `EWrongVersion` (cancelar/rechazar siguen funcionando).

## Decisiones (STOPs resueltos)

| STOP | Resolución |
|---|---|
| STOP-1 — campos del archivo | **(a)** D-20261102-01 §1; con los ajustes de la revisión: campos posteriores a v1 opcionales y `publishTimestamp` (antes `publishedAt`) |
| STOP-2 — lenguaje | **(a)** D-20261102-01 §2 |
| STOP-3 — fuente de verdad | **(a)** D-20261102-01 §3 |
| STOP-4 — protección de testnet | **(a)** D-20261102-01 §4, **precisada por D-20261102-03 §1**: config propia del owner exigida (guarda 2), confirmación solo como freno sin bypass, ningún agente en el camino testnet |
| STOP-5 — CI | **(a)** D-20261102-01 §5, con `package-manager-cache: false` |
| Fixture de `Published.toml` | D-20261102-03 §2: publicación de una copia en la localnet aislada (TASK-1) |

Sin STOPs abiertos.

## Tasks (ordenados por dependencia)

### TASK-1: Fixtures reales + funciones puras + tests — área: contracts (tooling)

- **Entregable:** fixtures reales de localnet; `contracts/scripts/deployment.mjs`; `contracts/scripts/deployment.test.mjs`.
- **Archivos (nuevos):** `contracts/scripts/deployment.mjs`, `contracts/scripts/deployment.test.mjs`,
  `contracts/scripts/fixtures/localnet-publish.json`, `contracts/scripts/fixtures/localnet-publish-dry-run.json`,
  `contracts/scripts/fixtures/Published.localnet.toml`. **No tocar:** `contracts/sources/`, `contracts/tests/`,
  `Move.toml`, `Move.lock`, `app/`, `documents/PLAN_APP.md`.
- **Cambios:**
  1. **Primero los fixtures**, en una localnet **aislada** (`agents.md` §3, pasos 1-7), con `ADMIN` de la génesis y el
     prefijo del paso 3 en cada llamada con `sui`:
     - Dry run: `act_as "$ADMIN" && cd <repo>/contracts && printf 'n\n' | "$SUI" client --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.dry.toml" --dry-run > "$SMOKE_DIR/dry.json"`
       → `localnet-publish-dry-run.json` (crea `Pub.dry.toml` vacío, C7: esperado).
     - Publicación: igual sin `--dry-run`, con `--pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` → `localnet-publish.json`.
     - **Desvío acotado y autorizado (D6, D-20261102-03 §2)** — `Published.toml` real (C3: `publish` solo funciona si el
       manifest declara el entorno): copiar `contracts/{Move.toml,Move.lock,sources}` a `$SMOKE_DIR/pkgcopy/`; agregar
       **solo en la copia** `[environments]` + `localnet = "<chain id hex de la localnet>"`; desde la copia, con
       **`MOVE_HOME` aislado** (el entorno `localnet` pinea el framework de la PV de la localnet, `sui_flavor.rs:179-199`,
       y puede descargar git):
       `act_as "$ADMIN" && cd "$SMOKE_DIR/pkgcopy" && printf 'n\n' | MOVE_HOME="$SMOKE_DIR/move" "$SUI" client --json publish > "$SMOKE_DIR/copy-publish.json"`
       (el `MOVE_HOME` va solo en el proceso `sui` de esa llamada; `$SMOKE_DIR/move` se crea vacío en la preparación). Copiar
       `$SMOKE_DIR/pkgcopy/Published.toml` → `fixtures/Published.localnet.toml`. Declarar en el reporte la descarga a
       `$SMOKE_DIR/move` (tamaño) y que `~/.move` no cambió (`du -s` antes/después). Si esa publicación falla (p. ej.
       verificación de dependencias), se detiene el task y se reporta (STOP al MID): **no** se fabrica un
       `Published.toml`.
     - Fixtures copiados **sin editar** (stdout de la CLI). Revisar antes que solo contienen datos de la localnet
       desechable (direcciones de la génesis aislada, IDs, digests, firmas públicas); ningún archivo de
       `<SMOKE_DIR>/net`, ningún `Pub.*.toml` (rutas absolutas, C2).
     - Cierre del paso 7 de §3 completo (`~/.sui/sui_config/` idéntico, `Move.lock` sin delta, sin
       `contracts/Pub.*.toml`/`contracts/Published.toml`, `$SMOKE_DIR` con `pkgcopy/` y `move/` borrado).
  2. `deployment.mjs` (sin I/O, sin `process`, sin `child_process`), funciones exportadas:
     - `normalizeId(str)` → `0x` + 64 hex minúsculas (error si no es hex válido).
     - `parsePublishOutput(json)` → `{ digest, timestampMs, packageId, packageVersion, houseId, houseCapId, upgradeCapId }`;
       exige `effects.status.status === "success"`; nunca devuelve `sender` ni `owner`.
     - `parseDryRunOutput(json)` → `{ ok, gasEstimate, created: { packageId, houseId, houseCapId, upgradeCapId } }` sobre
       las claves reales de C10 (`effects`, `objectChanges`, `executionErrorSource`, …; sin `digest`/`timestampMs`).
     - `buildDeployment({ network, chainId, parsed, sourceCommit, suiCliVersion, frameworkRev })` → los 14 campos en el
       orden del esquema; `publishTimestamp = new Date(Number(timestampMs)).toISOString()`.
     - `validateDeployment(obj)` → lista de errores (vacía = válido): reglas del esquema, 14 obligatorios, registro de
       opcionales (vacío en v1, preparado para `packageTxDigest`), claves desconocidas.
     - `parsePublishedToml(text)` → `Map<env, { chainId, publishedAt, originalId, version, upgradeCapability, toolchainVersion }>`
       (parser restringido al formato de la CLI: `[published.<env>]`, `clave = "texto"`, `clave = entero`, tabla en línea
       `build-config` ignorada; otra línea ⇒ error).
     - `checkConsistency(deployment, publishedEntry)` → diferencias campo a campo.
     - `readFrameworkRev(moveLockText)` → `rev` de `[pinned.testnet.Sui]` (lógica de `lock_rev`, `ci.yml:155-158`).
     - `redactAddresses(text)` → reemplaza toda cadena `0x[0-9a-fA-F]{64}` por `0x…`.
- **AuthZ:** no aplica. Seguridad: ninguna función devuelve ni registra direcciones de cuentas.
- **Criterio de aceptación:** `node --test scripts/deployment.test.mjs` (desde `contracts/`, Node 26) en verde con output
  pegado; IDs esperados leídos del fixture **a mano** (`jq`) y escritos como literales; evidencia del cierre de §3.
- **Tests esperados:** parse del fixture real (cada ID); dry run real (claves de C10); `buildDeployment` +
  `validateDeployment` (válido); **SEG-3**: ninguna dirección de `sender`/`owner` del fixture aparece en el json armado
  (recorriendo todos los valores); errores: `status` `failure`, sin `published`, dos Houses, sin `HouseCap`, sin
  `UpgradeCap`, `objectType` de otro paquete; `validateDeployment`: cada obligatorio faltante, clave desconocida, ID
  corto o en mayúsculas, testnet con chain id ≠ `4c78adac`, localnet con chain id de testnet/mainnet, `sourceCommit`
  `null` en testnet, `network` `mainnet`; un opcional registrado ausente ⇒ válido, presente con mal formato ⇒ error;
  `parsePublishedToml` del fixture real + línea inesperada; `checkConsistency` por campo; `readFrameworkRev` del
  `Move.lock` real (`719fb29…`); `redactAddresses` (deja intactos digests y textos sin `0x`+64).
- **Riesgos / rollback:** el formato `--json` es de la CLI 1.83.0 (C9, C10): subir la CLI obliga a recapturar. Rollback:
  borrar `contracts/scripts/`.

### TASK-2: Script de publicación + validación en CI — área: contracts (tooling), ci

- **Entregable:** `contracts/scripts/publish.mjs` (`publish`, `record`, `check`); tests de sus partes puras; steps de CI;
  filas de `agents.md` §3.
- **Archivos:** nuevos `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`,
  `contracts/scripts/fixtures/localnet.deployment.json`; modificados `.github/workflows/ci.yml` (solo steps del job
  `contracts`), `agents.md` §3 (tabla de comandos de contratos). **No tocar:** el bloque `TODO(#9)` (`ci.yml:131-132`),
  `framework-drift`, `.gitignore`.
- **Cambios:**
  1. `publish.mjs`: `node:util` `parseArgs` (estricto: opción desconocida ⇒ exit 2); toda llamada a la CLI por `runSui`;
     `git` por un `runGit(args)` análogo (`shell: false`); decisiones en funciones puras exportadas:
     `runSui` (con el `spawn` inyectable para test), `publishCliArgs({ network, pubfilePath, dryRun })`,
     `checkConfigDirGuard({ suiConfigDir, realpath, homes })`, `checkNetworkGuard({ network, activeEnv, chainIdHex })`,
     `checkCliVersion({ network, versionOutput, ciYmlText })`, `checkTestnetPreconditions({ gitStatus, hasDeployment, publishedEntry })`,
     `checkLockUnchanged({ network, before, after })`, `confirmationRequired({ network, dryRun })`,
     `checkConfirmation({ isTTY, answer })`, `resolveRecordMeta({ metaJson, flags, network })`,
     `checkDeployments({ files: [{ name, text }], publishedTomlText })`. Guardas, `meta.json`, salidas crudas,
     filtrado de stderr y resumen exactamente como en "Script — diseño". Exit: `0` ok, `1` guarda/validación, `2` uso.
  2. `check`: `contracts/deployments/*.json` (sin carpeta ⇒ "0 despliegues", exit 0) y `contracts/Published.toml` (si
     existe). Error si: json inválido; `network` ≠ nombre del archivo; json no-localnet sin su `[published.<red>]`;
     `[published.<red>]` sin `deployments/<red>.json`; diferencias de `checkConsistency`.
  3. `ci.yml`, job `contracts`, después de "Test (warnings como error)" y antes de "Move.lock y árbol sin cambios":
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
     (`working-directory: contracts` es el default del job, `ci.yml:31-34`.)
  4. `agents.md` §3: filas `node --test scripts/*.test.mjs` y `node scripts/publish.mjs check` (gate bloqueante,
     PROY-18; Node 26 tras `nvm use`); la fila `sui client publish` (`agents.md:77`) pasa a "`node scripts/publish.mjs
     publish --network testnet` — **solo el owner, con su `SUI_CONFIG_DIR` propio**; agentes: solo `--network localnet`
     en la localnet aislada" + la tabla "Quién corre qué".
  5. `fixtures/localnet.deployment.json`: salida de `node scripts/publish.mjs record --network localnet --from
     scripts/fixtures/localnet-publish.json --source-commit … --sui-cli-version 1.83.0-16d2dc1e05ed --framework-rev …
     --out scripts/fixtures/localnet.deployment.json` (`record` no invoca la CLI; los tres valores fijos se documentan
     en el test, que compara `buildDeployment` del fixture contra este archivo).
- **AuthZ:** el camino testnet exige config propia (guarda 2) y terminal (guarda 7); `runSui` impide `--yes`. **Ningún
  agente ejecuta `publish` fuera de la localnet aislada** (D4).
- **Criterio de aceptación:** `node --test scripts/*.test.mjs` y `node scripts/publish.mjs check` en verde (output
  pegado). **Ninguna ejecución de `publish` con la config de `~/.sui/` ni contra testnet**: el camino testnet se prueba
  solo con las funciones puras (abajo; `checkNetworkGuard` cubre el alias distinto, v2-1). Gates de contratos sin delta (83 tests), `Move.lock`
  intacto, YAML válido (`python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' .github/workflows/ci.yml`),
  `stat`/`ls` de `~/.sui/sui_config/` idénticos antes y después del task; CI del PR en verde.
- **Tests esperados:** `runSui` (siempre `input === 'n\n'` y `shell: false` vía el `spawn` inyectado; rechaza `-y`,
  `--yes`, `--client.config`, `--client.config=x`, y subcomandos fuera de la lista blanca); `publishCliArgs` (ambas
  redes, dry run; nunca contiene `-y`/`--yes`); `checkConfigDirGuard` (sin `SUI_CONFIG_DIR`, igual a `~/.sui/sui_config`
  por `HOME` o por `userInfo`, vía symlink ⇒ error; dir propio ⇒ ok); `checkNetworkGuard` (alias distinto ⇒ error **sin**
  pedir chain id; chain id de testnet en localnet; chain id incorrecto en testnet); `checkCliVersion`;
  `checkTestnetPreconditions` (árbol sucio, json existente, entrada en `Published.toml`); `checkLockUnchanged`
  (testnet ⇒ error, localnet ⇒ aviso); `confirmationRequired`/`checkConfirmation` (stdin no TTY ⇒ aborta; respuesta ≠
  `testnet` ⇒ aborta; y **no hay** opción ni variable de entorno que la desactive: `parseArgs` rechaza `--yes`/`--force`
  y el resultado no depende de `process.env`); `resolveRecordMeta` (con `meta.json`; sin él y sin los tres flags ⇒
  error; `chainId` incoherente ⇒ error); `checkDeployments` (carpeta vacía, localnet válido, testnet sin
  `Published.toml`, entrada huérfana, nombre ≠ `network`, coherente) con `Published.localnet.toml` adaptado **solo en
  memoria** para el caso testnet (documentado); el resumen impreso de un fixture no contiene ninguna dirección de
  `sender`/`owner`.
- **Riesgos / rollback:** `setup-node` agrega ~10-20 s; mismo SHA que #9 (`PLAN_APP.md`). Rollback: revertir los steps y
  las filas de §3.

### TASK-3: Documentación — área: docs

- **Entregable:** docs alineadas con TASK-1/2 y con D-20261102-03 (PROY-20).
- **Archivos:** `contracts/README.md`, `agents.md` (§2, §3 localnet aislada, §5, §11, §12), `documents/ESTANDARES.md`
  (ARQ-6, encabezado), `documents/STATUS.md` (Toolchain, H11, H13, gates).
- **Cambios:**
  1. `contracts/README.md` → **"Despliegues"**: esquema completo (tabla con "Describe"), ejemplo ficticio, qué no va y
     por qué, reglas de compatibilidad, `Published.toml` como fuente + `check`; uso: localnet (variante corta para
     humanos —directorio propio con `SUI_CONFIG_DIR`, `sui genesis --working-dir` + `sui start --network.config`, nunca
     `sui start` a secas ni `--force-regenesis` sin `SUI_CONFIG_DIR`, nada en `~/.sui/`— y remisión a `agents.md` §3
     para agentes); testnet por el owner con su config propia (`--dry-run`, publicación, `update_fee_rate`, borrar el
     temporal); el script escribe el cache `chain_id` en la config activa (C12, inocuo); recuperación con `record`
     ("nunca reintentar sin mirar el digest", `tx-block`); comando de tests. "ID de la House" (`README.md:147-151`) →
     remite a "Despliegues". "Versionado": procedimiento de upgrade.
  2. `agents.md`: §2 layout con `contracts/scripts/` y `contracts/Published.toml` (#8); §3 tabla "Quién corre qué" (si
     TASK-2 no la dejó) y paso 4 de la localnet aislada con el script: `SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish
     --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json"` desde
     `contracts/`, con `NODE` = ruta absoluta de Node 26 resuelta en la preparación y escrita literal en `env.sh` (el
     `HOME` aislado impide `nvm use`); §5 fila de IDs ("lo escribe el script; `Published.toml` es la fuente"); §11 fila
     `client.yaml`: "sin claves **siempre**; la clave del owner vive en su `SUI_CONFIG_DIR` propio (D-20261102-03)";
     §12: comando del owner y orden de #8.
  3. `ESTANDARES.md` ARQ-6: "`Published.toml` (CLI) es la fuente de las direcciones del paquete;
     `deployments/<red>.json` se deriva con `contracts/scripts/publish.mjs` y la CI verifica la coherencia" (v1.7).
  4. `STATUS.md`: Toolchain "Prerrequisito de `sui move`" + H11: la nota "#8: el owner agrega su clave a este mismo
     `client.yaml`" se reemplaza por D-20261102-03; H11 resuelta por #7 (D3); H13: el script exige la CLI de `ci.yml`,
     falla si el lock cambia en el dry run y registra `frameworkRev`; baseline de los gates de scripts.
- **Criterio de aceptación:** rutas y comandos citados existen y coinciden con TASK-1/2; grep de secretos sobre el diff
  (`git diff -U0 master -- . | /usr/bin/grep -nE '^\+' | /usr/bin/grep -niE 'suiprivkey|mnemonic|recovery|0x[0-9a-f]{64}'`)
  sin claves ni direcciones fuera de fixtures de localnet y ejemplos ficticios.

### Smoke (M5, tras aprobar TASK-3): `documents/SMOKE_DEPLOY.md` — aplica

Localnet **aislada** (`agents.md` §3) con el script; todo `publish.mjs publish` con el prefijo `. env.sh && smoke_guard &&`.

| # | Acción | Resultado esperado |
|---|---|---|
| 0 | Preparación (§3 paso 2) + `NODE` literal en `env.sh`; línea base de `~/.sui/sui_config/` | `stat`/`ls` anotados |
| 1 | Génesis, arranque, `chain-identifier` | red arriba, `active-env` = `localnet` |
| 2 | `publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json" --dry-run` | `success`, 4 objetos esperados, gas impreso; ni json ni salida cruda; **`Pub.localnet.toml` creado vacío** (C7, esperado) |
| 3 | Lo mismo sin `--dry-run` | exit 0; json válido (14 campos); directorio temporal en `$SMOKE_DIR/tmp` con `meta.json`, `publish-output.json`, `publish-stderr.txt` (`0600`); `update_fee_rate` impreso; resumen sin direcciones; `Move.lock` sin delta |
| 4 | `suic object <houseId> --json`, `suic object <houseCapId> --json` | House compartida (`fee_rate` 0, límites por defecto); `HouseCap` de `ADMIN` |
| 5 | `update_fee_rate` con el comando impreso (bps 250) y relectura | `FeeRateUpdated`, `fee_rate` 250 |
| 6 | Repetir el paso 3 | falla ("already published", C2/C4) sin escribir el json; stderr mostrado con IDs/direcciones como `0x…` |
| 7 | `record --network localnet --from <temporal>/publish-output.json --out "$SMOKE_DIR/localnet2.json"` | lee `meta.json`; idéntico al del paso 3 (`cmp`) |
| 8 | `env -u SUI_CONFIG_DIR "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path …` | falla en la guarda 2, sin invocar `sui` |
| 9 | Cierre (§3 paso 7) | `~/.sui/sui_config/` idéntico; sin `Pub.*.toml`/`Published.toml`/`localnet.json` en el repo; lock sin delta |

El reporte pega el json del paso 3 (IDs de localnet) y los outputs del script, nunca la salida cruda.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El camino testnet no se ejecuta de punta a punta hasta #8 | Funciones puras testeadas con un `Published.toml` **real** (TASK-1); dry run interno obligatorio; `record` + `meta.json` para recuperar sin republicar |
| Con `Published.toml` commiteado, `sui move build/test -e testnet` compila con la dirección publicada | #8 re-mide los gates después de publicar (pre-vuelo) |
| #7 y #9 editan `ci.yml` y `agents.md` en paralelo | Zonas distintas; mismo SHA de `setup-node`; el segundo PR rebasa |
| Salida cruda de testnet (con la dirección del owner) en `/tmp` | `0700`/`0600`, ruta impresa, borrado indicado en resumen y README |
| La confirmación por terminal se puede simular | Declarado como freno contra accidentes; la barrera real es la config sin claves al alcance de los agentes (D4) |
| Cambio del formato `--json` al subir la CLI | Guarda 4 + recaptura de fixtures en el issue que suba la CLI |

## Cambios v1 → v2

1. MAJOR 1: hecho C12 (`chain-identifier` reescribe el `client.yaml` activo); guarda 3 pide chain id solo si `active-env` coincide; fuera del criterio de TASK-2 toda ejecución contra `~/.sui/` o testnet; tabla "Quién corre qué".
2. MAJOR 2: D4 (D-20261102-03): guarda 2 de config propia (`SUI_CONFIG_DIR` ≠ `~/.sui/sui_config`, ambos `home`) para ambas redes; confirmación declarada solo como freno, sin bypass, con test; TASK-3 corrige STATUS H11 y `agents.md` §11/§12.
3. MINOR 3: 14 campos obligatorios; los posteriores a v1, opcionales (o `schemaVersion: 2`).
4. MINOR 4: `meta.json` escrito antes de publicar; `record` lo lee o exige tres flags; nunca el estado actual del repo.
5. MINOR 5: publicación de la copia declarada como desvío autorizado (D6) con `MOVE_HOME` aislado en `$SMOKE_DIR/move` y control de `~/.move`.
6. MINOR 6: envoltorio único `runSui` (siempre `'n\n'`, `shell: false`, rechaza `-y`/`--yes`/`--client.config`, lista blanca) con tests; hecho C13.
7. MINOR 7: stderr de la CLI guardado aparte y mostrado con `redactAddresses`; test de resumen sin direcciones.
8. MINOR 8: C7 corregido (dry run de `test-publish` crea el pubfile; lock puede cambiar); paso 2 del smoke ajustado.
9. MINOR 9: `publishedAt` → `publishTimestamp`; columna "Describe" (publicación original vs versión vigente); `packageTxDigest` previsto como opcional.
10. MINOR 10: `package-manager-cache: false` + chequeo del major de Node en el job `contracts`.
11. MINOR 11: citas corregidas (`agents.md:83-142`, motivo en `:85-87` y `:240-242`) y nuevas citas de la CLI.
12. SUGGESTION 12 (adoptada): dry run interno obligatorio en testnet y lock cambiado = error.
13. SUGGESTION 13 (adoptada): "nunca reintentar sin el digest", `record` acepta `tx-block` (C17), `Published.toml` faltante = STOP de #8.
14. SUGGESTION 14 (adoptada): claves reales del dry run fijadas (C10) y leídas del fixture.
15. SUGGESTION 15 (adoptada): variante corta de localnet aislada para humanos en el README.
16. STOP-1..5 marcados como decididos (D-20261102-01, precisión de D-20261102-03); tabla de decisiones del owner D1-D6; base `8c67221`; pasos 9 (sin `SUI_CONFIG_DIR`) del smoke nuevo.

## Verificación del plan (MID, 2026-11-02)

- Base: `git merge-base HEAD master` = `8c67221`; branch sin commits propios; en el árbol, además de este plan, hay
  archivos de otros ciclos que no se tocan (`documents/PLAN_APP.md`, `documents/REVISION_PLAN_DEPLOY.md`,
  `documents/DECISIONES.md`).
- Grep de secretos del plan: sin claves, frases ni direcciones reales; los `0x…` de 64 hex son ficticios (`0x1111…`–`0x4444…`).
- Sin gates (D-20261030-02); nada ejecutado contra `~/.sui/`.
