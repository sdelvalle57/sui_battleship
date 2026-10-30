# PLAN_TOOLCHAIN v3
> Issue: #1 | Áreas: contracts (manifest), docs | Fecha: 2026-10-30 | Branch: `feature/issue-1-toolchain`
> Autor: MID · Estado: v1 **aprobado con cambios** por el MAYOR (`documents/REVISION_PLAN_TOOLCHAIN.md`);
> v2 aplica los MAJOR #1–#3, los MINOR #4–#8 y las sugerencias #9–#10. Decisiones 1 y 2 aprobadas.
> v3 aplica N1–N4 de la "Revisión v2" (solo comandos de TASK-1 y del bloque de STOP-1 (d)).
> **STOP-1 resuelto:** opción (d); el `client.yaml` sin claves lo escribe el DEV (autorizado).
>
> Decisión (2026-10-30): se optó por STOP-1 (d) sobre (a)/(b) porque ninguna clave ni frase pasa por agentes ni logs — aprobado por el usuario (D-20261030-07).

## Historia de usuario

**Como** desarrollador del paquete Move (DEV, y el owner que revisa sus gates), **quiero** que el
manifest declare el framework de Sui de la forma que soporta la Sui CLI instalada (`1.83.0`, release
testnet), con un `Move.lock` regenerado y fijado contra testnet, y un primer baseline real de
`sui move build` / `sui move test` registrado por archivo, **para** que cada gate que se corra desde
ahora sea reproducible y comparable (cero delta contra un rojo conocido) en vez de "no verificable".

**Scope en una frase:** migrar `Move.toml`/`Move.lock` al sistema de paquetes de la CLI 1.83, dejar
registrada la toolchain (incluido el prerrequisito de `client.yaml`) y medir el primer baseline de
gates sobre el layout actual (raíz).
**Lo que NO entrega:** arreglar los errores de compilación (H6, H8 → #2/#5), mover el paquete a
`contracts/` ni retirar el legado (#2), CI (#3), claves, direcciones o publicación (#7/#8), `license` (#16).

## Contexto y alcance

**Estado verificado el 2026-10-30 (inspección sin compilar):**

| Hecho | Evidencia |
|---|---|
| CLI instalada: `sui 1.83.0-16d2dc1e05ed`, `suiup 0.1.1`, release `testnet` por defecto, en `~/.local/bin` (en el `PATH`) | `sui --version`, `suiup --version`, `suiup show`; STATUS H1 ✅ |
| Framework declarado como dependencia git a **branch móvil** con `override = true` | `Move.toml:7-8` (`rev = "framework/testnet"`) |
| `Move.lock` formato v3 (CLI de 2025-03) resolviendo la misma branch | `Move.lock:4`, `Move.lock:13,17` |
| Edition beta | `Move.toml:3` (`edition = "2024.beta"`) |
| Named address explícita y secciones del sistema viejo | `Move.toml:21-22` (`[addresses] battleship = "0x0"`), `Move.toml:28` (`[dev-dependencies]`), `Move.toml:33` (`[dev-addresses]`) |
| El código usa la address `battleship` = nombre del paquete (`Move.toml:2`) | `sources/House/house.move:6`, `sources/Game/game.move:1`, `sources/battleship.move:1` |
| Errores de compilación conocidos | H6 `sources/Game/game.move:54-62` (`GameRequest` sin campos); H8 `sources/battleship.move:58-65` (`player1.addr` tras mover `player1`) |
| Sin tests ejecutables | `tests/battleship_tests.move:1-18` (todo comentado) |
| `.gitignore` solo ignora `build/*`; `~/.sui` y `~/.move` no existen | `.gitignore:1`; `test -d` |

**Sistema de paquetes de la CLI instalada (plantilla de la CLI + doc oficial + código del tag
`testnet-v1.83.0`, leído con `gh api`, sin compilar):**

- `sui move new` 1.83 genera `[package] name/edition = "2024"`, `[dependencies]` **vacío** y un
  `.gitignore` con `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`
  (`move-cli/src/base/new.rs:53-62, 84-104`).
- Doc *Move package management*: desde 1.63 "The package system implicitly includes the `std` and
  `sui` packages unless you write `implicit-dependencies = false`"; `Move.lock` "records the exact
  version that the system pins each dependency to", se commitea y "You should never edit `Move.lock`
  manually"; la CLI solo repinea si cambia el manifest o con `update-deps`; direcciones publicadas por
  red en `Published.toml` (commiteable), efímeras en `Pub.<env>.toml` (no commitear); `mainnet` y
  `testnet` son entornos implícitos; deps git de terceros con `rev` = SHA de 40 caracteres.
- Guía de migración: "Remove the `[addresses]` and `[dev-addresses]` sections" (la address del paquete
  es su `name`); el primer run con la CLI nueva **regenera `Move.lock`**; desaconseja desactivar las
  implícitas.
- **Cómo se pinea el framework** (MAYOR, hallazgo 3): el pin de `sui`/`std` es siempre un SHA de git
  (`crates/sui-package-alt/src/sui_flavor.rs:179-213`), elegido de la tabla protocolo → SHA que trae la
  CLI (`crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.83.0`, versiones 33…140) según la
  **versión de protocolo de la red del entorno activo del cliente** (`SuiFlavor::with_client(wallet)`,
  `sui_flavor.rs:66-99`). Si la consulta RPC falla, cae con un `warn!` (no visible por defecto) a la
  versión máxima que conoce la CLI (`sui_flavor.rs:186-197`). Sin `-e`, el entorno de build también
  sale del entorno activo (`crates/sui-package-alt/src/find_env.rs:46-61, 80-104`); con
  `active_env = localnet` el build aborta (`find_env.rs:147-161`).
- Flags útiles para #3 (LIM-9): `--warnings-are-errors` (en `sui move build --help` y
  `sui move test --help`), `--lint`, `--json-errors`.

**Hallazgo nuevo (bloquea los gates → STOP-1):** la CLI 1.83 exige un `client.yaml` para **cualquier**
subcomando de `sui move`: `SuiCommand::Move` llama a `get_wallet_context` antes de despachar
(`crates/sui/src/sui_commands.rs:578-584`), y si el archivo no existe `prompt_if_no_config` pregunta
`create one [Y/n]?` y con respuesta vacía (stdin cerrado) **crea keystore + clave e imprime la
`secret recovery phrase`** (`sui_commands.rs:1630-1648, 1703-1716, 1730-1736`). `-e/--build-env` se
resuelve después (`crates/sui-move/src/build.rs:64-65`), así que **no evita el prompt**. Respondiendo
`n`, la CLI aborta con "No config found, aborting" (`sui_commands.rs:1644-1646`). La ubicación se mueve
con `SUI_CONFIG_DIR` (`crates/sui-config/src/lib.rs:45-58`), pero `--client.config` **no** evita que
`sui_config_dir()` cree `~/.sui/sui_config/` (evaluación ansiosa, `sui_commands.rs:1731-1734`). Esto
contradice la nota del issue ("`sui move build/test` **no** requieren `sui client`").

> **Incidente cerrado (2026-10-30, MID):** para obtener la plantilla, el MID corrió `sui move new demo`
> con `HOME` desechable en el scratchpad y stdin cerrado; la CLI creó una clave desechable e imprimió
> su recovery phrase en el log del agente. Clave sin fondos, nunca usada, directorio borrado en el acto,
> `~/.sui` real intacto, nada en el repo: **no requiere rotación**. Defensa adoptada: en este ciclo toda
> invocación de `sui` va precedida de `printf 'n\n' |` (TASK-1/TASK-2), para que un `client.yaml`
> ausente aborte en vez de generar una clave.

**Alcance:** `Move.toml`, `Move.lock`, `.gitignore`, `documents/STATUS.md`, `agents.md`,
`documents/ESTANDARES.md` (PROY-11), y el `client.yaml` sin claves **solo si** el usuario elige STOP-1 (d).
**Fuera de alcance:** mover archivos (#2), arreglar errores de compilación (H6/H8), CI (#3),
`Published.toml`/publicación y cualquier clave o dirección (#7/#8), limpiar `sources/`.
**Smoke: no aplica** — tooling; la verificación es el propio output de los gates en el reporte del DEV.

## Contrato on-chain

Sin cambios. Ningún archivo de `sources/` ni `tests/` se modifica. El paquete no está publicado, así
que no hay impacto de compatibilidad de upgrade; `app/src/sui/` no existe.

## Flujo de fondos

No aplica.

## Decisiones

### Decisión 1 — cómo fijar el framework: **(b) dependencias implícitas** — ✅ aprobada por el MAYOR

- La plantilla de la CLI 1.83 deja `[dependencies]` vacío; la doc vigente declara `std`/`sui`
  implícitas desde 1.63 y desaconseja `implicit-dependencies = false`.
- Argumento decisivo: un manifest en formato moderno **rechaza** las dependencias llamadas `Sui` /
  `MoveStdlib` ("legacy system name and cannot be used", `sui_flavor.rs:241-275`). La opción (a) del
  issue solo es posible en el formato legado (con `[addresses]`), que la CLI aún acepta pero la guía de
  migración pide abandonar.
- Fijación resultante: el framework queda fijado por **`Move.lock`** (SHA resuelto para el protocolo de
  testnet al repinear con `-e testnet`); la CLI solo aporta la tabla protocolo → SHA. Como la CLI
  repinea al cambiar el manifest, **todo delta de `Move.lock` en un diff futuro** (#2 al mover el
  paquete, #16 con `license`) se declara y justifica en el reporte.

**PROY-11 (redacción aprobada, TASK-2 la aplica):** "`Move.toml` en el formato del sistema de paquetes
de la CLI registrada en STATUS (≥ 1.63): `std`/`sui` implícitas (sin entrada `Sui` git ni
`implicit-dependencies = false`), sin `[addresses]`/`[dev-addresses]`; deps git de terceros con `rev` =
SHA de 40 caracteres. El framework queda fijado por `Move.lock` (regenerado por la CLI con
`-e testnet`, nunca a mano, commiteado); todo cambio de `Move.lock` en un diff se declara y justifica en
el reporte. `edition` declarada. Direcciones publicadas en `Published.toml` (commiteado); `Pub.*.toml`
nunca se commitea."

**`agents.md` §2** (tabla, línea 46): "Sui Move, edition `2024`, `std`/`sui` implícitas (sistema de
paquetes de la CLI ≥ 1.63); framework fijado por `Move.lock` (repin con `-e testnet`; todo delta del
lock se justifica)".

> Decisión (2026-10-30): dependencias implícitas del sistema (`[dependencies]` vacío) sobre una
> dependencia git explícita con `rev` a tag, porque es el formato de la CLI 1.83 y su doc vigente, y el
> formato moderno rechaza la dependencia `Sui` explícita. Aprobada por el MAYOR; a registrar en
> `DECISIONES.md` junto con la nueva redacción de PROY-11.

### Decisión 2 — canal de la CLI: **testnet** — ✅ aprobada por el MAYOR

> Decisión (2026-10-30): Sui CLI del canal testnet (`1.83.0`, vía `suiup`; `suiup show` →
> `sui testnet v1.83.0`) sobre el de mainnet, porque testnet es la red del MVP (`agents.md` §4) y es la
> que el owner instaló. A registrar en `DECISIONES.md`.

### STOP-1 — `sui move` exige un `client.yaml` y, si falta, crea una clave — **decide el usuario**

**Problema:** sin `client.yaml`, el primer gate del DEV crearía `~/.sui/sui_config/` con una clave nueva
y dejaría su recovery phrase en el output (SEG-3), contra el "no configurar `sui client`" del issue.
Evidencia en §Contexto. La opción "probar si `-e testnet` evita el prompt" **se descartó**: el código
la refuta (`sui_commands.rs:584`; el prompt ocurre antes de resolver `-e`).

| Opción | Qué se hace | A favor | En contra |
|---|---|---|---|
| **(d) `client.yaml` sin claves** en `~/.sui/sui_config/` (detalle abajo) | Un archivo de unas 11 líneas con el entorno `testnet` activo, keystore vacío y `active_address: ~`. Lo escribe el owner, o el DEV si el usuario lo autoriza explícitamente al elegir (d) (queda registrado, porque toca `~/.sui`) | Ninguna clave ni frase en ningún momento; gates idénticos a `agents.md` §3; `active_env = testnet` fijo ⇒ el pin del lock sale de testnet; el mismo mecanismo sirve para CI (#3, PROY-18); no adelanta la clave publicadora (se agrega en #8 sobre el mismo archivo) | Archivo escrito a mano; el DEV debe confirmar en el primer run que no hubo prompt ni clave (verificación definida en TASK-1) |
| (a) El owner inicializa `sui client` con clave real ahora | Owner corre `sui client` interactivo (testnet, ed25519), guarda la frase offline | Deja resuelto ya el setup de #8 y los smokes de #17 | Adelanta una decisión de #8 (dirección publicadora, que debe ser la de la wallet del navegador, `agents.md` §12); el DEV corre gates en una máquina con un keystore real legible; acción manual del owner ahora |
| (b) Config desechable con clave descartable | El DEV exporta `SUI_CONFIG_DIR=<scratchpad>/sui_config` (no `--client.config`, que igual crearía `~/.sui/sui_config/`) y la crea una vez con la salida a `/dev/null`; la borra al final | Sin acción del owner; `~/.sui` intacto | Se genera una clave real (descartable) y su frase pasa por stdout aunque se descarte; cada sesión repite la creación; los comandos llevan una variable extra respecto de `agents.md` §3 |

**Recomendación (MAYOR y MID): (d).** Cumple el "no configurar `sui client`" del issue, no expone
ninguna frase, fija el entorno de build a testnet y es exactamente lo que hará CI. (a) sigue siendo
válida si el owner prefiere dejar resuelto ya el setup de #8. (b) es la peor opción.

**Detalle de la opción (d):**

- **Ubicación:** `~/.sui/sui_config/client.yaml` (ruta por defecto ⇒ los gates no necesitan flags ni
  variables). Variante para CI (#3) o si el owner quiere aislarla: el mismo archivo dentro de un
  directorio propio y `export SUI_CONFIG_DIR=<dir>` (el `File:` del keystore apunta a ese directorio).
- **Contenido mínimo** (formato de `SuiClientConfig`/`SuiEnv`, `crates/sui-sdk/src/sui_client_config.rs:20-33, 86-95`
  @ `testnet-v1.83.0`; RPC = `SUI_TESTNET_URL` de `crates/sui-sdk/src/lib.rs:36`). Sin claves ni
  direcciones; el keystore no necesita existir (`FileBasedKeystore::load_or_create` lo carga vacío,
  `crates/sui-keys/src/keystore.rs:401-430`):
  ```bash
  if test -e ~/.sui/sui_config/client.yaml; then
    echo "client.yaml ya existe: no se sobrescribe"
  else
    mkdir -p ~/.sui/sui_config && chmod 700 ~/.sui ~/.sui/sui_config
    cat > ~/.sui/sui_config/client.yaml <<EOF
  ---
  keystore:
    File: $HOME/.sui/sui_config/sui.keystore
  external_keys: ~
  envs:
    - alias: testnet
      rpc: "https://fullnode.testnet.sui.io:443"
      ws: ~
      basic_auth: ~
  active_env: testnet
  active_address: ~
  EOF
  fi
  ```
  (`$HOME` se expande al escribir: la ruta del keystore debe ser absoluta. El archivo no contiene
  secretos, pero vive fuera del repo y no se commitea.)
- **Verificación de que la CLI no generó ninguna clave** (TASK-1, paso 1; nada de esto imprime
  contenido de keystore):
  1. `printf 'n\n' | sui client active-env 2>&1 | tee <scratch>/preflight.txt` → debe imprimir
     `testnet`; si imprime "No config found, aborting", parar.
  2. `grep -ciE 'recovery phrase|Generated new keypair' <scratch>/preflight.txt <scratch>/build1.txt`
     → `0` en ambos (el segundo es el output del primer `sui move build`).
  3. `ls -A ~/.sui/sui_config/` → solo `client.yaml` y, como mucho, `sui.keystore`/`sui.aliases`.
  4. Si existe `sui.keystore`: `python3 -I -c 'import json,sys; sys.exit(len(json.load(open(sys.argv[1]))))' ~/.sui/sui_config/sui.keystore; echo $?`
     → `0` (lista vacía). Ídem para `sui.aliases` si existe.
  5. `grep -E '^active_address: *~? *$' ~/.sui/sui_config/client.yaml` → coincide (sigue sin dirección).
- **Convivencia con #8 (publicación):** el owner, **en su propia terminal y sin agentes**, agrega su
  clave publicadora al mismo `client.yaml`: `sui client new-address ed25519` (la frase solo la ve él) o
  `sui keytool import` interactivo, y luego `sui client switch --address <alias>`. La clave queda en
  el keystore que ya apunta el `File:`; `active_env` sigue en `testnet`, así que los gates no cambian.
  Desde ese momento el chequeo "keystore vacío" deja de aplicar: los handoffs posteriores verifican solo
  `active-env = testnet` y ausencia de prompt, y ningún agente lee ni lista el keystore (SEG-3).
  Alternativa si el owner quiere aislar la clave: config sin claves por defecto para los gates y una
  segunda config con clave en otro directorio, usada solo para publicar con `SUI_CONFIG_DIR=<dir>`.
- **CI (#3):** el workflow escribe este mismo archivo en `$RUNNER_TEMP` y exporta `SUI_CONFIG_DIR`:
  mismos gates que en local, sin claves (PROY-18).

## Tasks (ordenados por dependencia)

**Precondiciones comunes:** STOP-1 resuelto y registrado. Desde la raíz del repo, en la misma shell:
`source ~/.nvm/nvm.sh && nvm use 22`. En este ciclo **toda** invocación de `sui client`/`sui move` va
con `printf 'n\n' |` delante (defensa del incidente). Nunca correr `sui client addresses`,
`sui keytool list`, ni leer/pegar `client.yaml`, `sui.keystore` o `sui.aliases` (salvo los chequeos de
longitud de la opción d). Los gates se corren siempre con `-e testnet`.

### TASK-1: Migrar el manifest al sistema de paquetes de la CLI 1.83 y regenerar `Move.lock` — área: contracts

- **Entregable:** `Move.toml` en el formato de la CLI 1.83, `Move.lock` regenerado por la CLI y pineado
  contra testnet (SHA verificado), `.gitignore` con las entradas de la plantilla oficial.
- **Archivos afectados:** `Move.toml`, `Move.lock` (solo vía CLI), `.gitignore`; con STOP-1 (d) y
  autorización al DEV, además `~/.sui/sui_config/client.yaml` (fuera del repo). **No tocar:**
  `sources/**`, `tests/**`, `README.md`, cualquier otro archivo de `~/.sui/`.
- **Paso 1 — entorno de la CLI, según la opción elegida en STOP-1:**
  - **(d):** si el usuario autorizó al DEV, escribir el `client.yaml` con el bloque de §STOP-1 (d); si
    no, confirmar que el owner ya lo escribió. Correr la verificación 1-5 de (d) (la 2 se completa tras
    el paso 3).
  - **(a):** el owner ya corrió `sui client`. El DEV solo corre `printf 'n\n' | sui client active-env`
    → `testnet`. Si dice otra cosa o aborta, parar. No listar direcciones ni tocar el keystore.
  - **(b):** `export SUI_CONFIG_DIR=<scratch>/sui_config` (nunca `--client.config`); crear la config
    una sola vez con `sui client active-env </dev/null >/dev/null 2>&1` (la frase va a `/dev/null`,
    jamás a un archivo o al reporte); después `printf 'n\n' | sui client active-env` → `testnet`. Al
    terminar TASK-2: `rm -rf <scratch>/sui_config` y confirmar `test -d ~/.sui` → no existe.
  - En todos los casos: `test -d ~/.sui` antes y después se reporta (con d/a debe existir solo lo
    esperado; con b no debe existir).
- **Paso 2 — versiones:** `sui --version`, `suiup --version`, `which sui`, `node --version`.
- **Paso 3 — cambios:**
  - `Move.toml` → modelo:
    ```toml
    [package]
    name = "battleship"
    edition = "2024"

    [dependencies]

    # Sistema de paquetes de la CLI >= 1.63: std y sui son dependencias implícitas.
    # El framework queda fijado por Move.lock (regenerado por la CLI con `-e testnet`, nunca a mano);
    # todo cambio de Move.lock en un diff se declara y justifica.
    # https://docs.sui.io/guides/developer/packages/move-package-management
    ```
    Se eliminan: la entrada `Sui` con `override = true` (`Move.toml:8`), `[addresses]`
    (`Move.toml:21-22`), `[dev-dependencies]` y `[dev-addresses]` vacías (`Move.toml:28,33`) y los
    comentarios de plantilla de 2025. `license`/`authors` no se agregan (#16).
  - `.gitignore`: agregar `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`, conservando `build/*`.
    > Decisión (2026-10-30): se adopta el `.gitignore` de la plantilla de la CLI 1.83 dentro de #1
    > porque el sistema de paquetes nuevo introduce los `Pub.*.toml` efímeros que la doc pide no
    > commitear y `--coverage` genera `.coverage*`; higiene de toolchain sin efecto en el código.
  - `Move.lock`: **no se edita a mano**. Precondiciones del repin: `active-env` = `testnet` (paso 1) y
    red disponible (`curl -sI https://fullnode.testnet.sui.io:443 | head -1`). Repin con el primer
    `printf 'n\n' | RUST_LOG=warn sui move build -e testnet 2>&1 | tee <scratch>/build1.txt` (`RUST_LOG`
    para que un eventual "Falling back…" sea visible; exit code de `sui` = `${PIPESTATUS[1]}`, no `$?`).
    Si el build aborta por compilación antes de escribir el lock, regenerarlo con
    `printf 'n\n' | RUST_LOG=warn sui move update-deps -e testnet 2>&1 | tee <scratch>/update1.txt`,
    reportar su exit code con `${PIPESTATUS[1]}`, aplicarle la verificación 1 y declararlo.
- **Paso 4 — verificaciones (output en el reporte):**
  1. `build1.txt` (y `update1.txt` si se usó el fallback) **sin** errores de manifest ni de resolución (p. ej. `[addresses]` no soportado,
     `sui`/`std` no encontrados, "Your active environment is not present in Move.toml", "Could not
     determine the correct dependencies") y **sin** "Falling back to protocol version" / "Falling back
     to latest known packages". Errores de compilación de `sources/` son esperados (van a TASK-2).
  2. `edition = "2024"` sin error de edición. Si la CLI la rechaza, volver a `2024.beta` y justificar.
  3. `git diff Move.lock`: pegar la cabecera (`version`) y las entradas de `sui`/`std` por entorno
     (`source`/`rev`). Ninguna branch (`framework/testnet` ni otra).
  4. **SHA del framework** (`SHA` = `rev` de `sui` para `testnet` en el lock nuevo):
     ```bash
     gh api repos/MystenLabs/sui/commits/$SHA --jq .sha                                  # existe, 40 chars
     gh api repos/MystenLabs/sui/compare/$SHA...testnet-v1.83.0 --jq .status             # "ahead" o "identical"
     PV=$(curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' \
       -d '{"query":"{ epoch { protocolConfigs { protocolVersion } } }"}' | jq -r .data.epoch.protocolConfigs.protocolVersion)
     echo "$PV"                                                                          # debe ser un entero
     gh api "repos/MystenLabs/sui/contents/crates/sui-framework-snapshot/manifest.json?ref=testnet-v1.83.0" \
       -H "Accept: application/vnd.github.raw" > <scratch>/manifest.json
     jq '[keys[]|tonumber]|max' <scratch>/manifest.json                                  # máximo que conoce la CLI
     jq -r --argjson pv "$PV" '[to_entries[] | select((.key|tonumber) <= $pv)] | max_by(.key|tonumber) | .value.git_revision' \
       <scratch>/manifest.json                                                           # == $SHA
     ```
     El fullnode público ya no sirve JSON-RPC: `PV` se obtiene por GraphQL (validado por el MAYOR el
     2026-10-30: `139` → `719fb2960ccfbf9f4d33041f8ea5146d30671696`). La CLI usa la última versión
     **≤ PV** de la tabla (`crates/sui-package-management/src/system_package_versions.rs:51-69`), que
     tiene huecos: por eso la búsqueda es por piso. Pegar todos los resultados (incluidos `PV` y el
     máximo). **Desviación, parar** hasta la revisión del MID si: `PV` no es un entero; `PV` > máximo de
     la tabla (la CLI está detrás de testnet y usa el máximo sin aviso: actualizar con `suiup` o
     registrarlo); el SHA del lock no coincide con el del piso; o el lock se escribió con la red caída.
  5. No se generaron `Published.toml` ni `Pub.*.toml`; `git status` muestra solo `Move.toml`,
     `Move.lock`, `.gitignore` **aparte de los artefactos del ciclo en `documents/`** (plan, revisión).
  6. Verificación de STOP-1 según la opción (para d: pasos 2-5 de §STOP-1 (d)).
- **AuthZ:** no aplica (sin código on-chain).
- **Criterio de aceptación (DoD):** `Move.toml` = modelo (o `2024.beta` justificado); sin entrada `Sui`
  git ni `override`; `Move.lock` regenerado por la CLI con `sui`/`std` pineados al SHA de la versión de
  protocolo de testnet (verificado con `gh api`); `.gitignore` ampliado; sin prompt ni clave generada;
  output de los pasos 1-4 pegado; ningún contenido de `~/.sui` en el reporte.
- **Tests esperados:** ninguno nuevo. El build sigue en rojo por H6/H8: estado conocido, no fallo del task.
- **Riesgos / rollback:** (i) sin red no hay repin: reportar y parar. (ii) Si la CLI exige algo no
  previsto en el manifest (p. ej. `[environments]`), agregarlo solo si el mensaje de la CLI lo pide
  explícitamente y declararlo. (iii) Rollback: `git checkout -- Move.toml Move.lock .gitignore`; con
  (d)/(b), el archivo de config fuera del repo se conserva salvo instrucción del MID.
- **Commit propuesto (tras revisión):** `contracts: migrate manifest to CLI 1.83 package system (#1)`.

### TASK-2: Baseline de gates y documentación de la toolchain — área: docs (+ gates de contracts)

- **Entregable:** primer baseline real de gates en `documents/STATUS.md` y docs alineados con la
  toolchain, el nuevo manifest y el prerrequisito de `client.yaml`.
- **Archivos afectados:** `documents/STATUS.md`, `agents.md`, `documents/ESTANDARES.md`. **No tocar:**
  código, `Move.toml`, `Move.lock` (si un gate lo modifica, es un hallazgo: reportarlo y restaurarlo).
- **Gates** (HEAD con TASK-1 commiteado; árbol limpio salvo artefactos del ciclo en `documents/`;
  anotar ref + SHA corto; misma precondición de STOP-1):
  1. `printf 'n\n' | sui move build -e testnet`
  2. `printf 'n\n' | sui move build -e testnet --lint` (informativo)
  3. `printf 'n\n' | sui move test -e testnet`
  Para cada uno: exit code, errores y warnings **por archivo** (`sources/battleship.move`,
  `sources/Game/game.move`, `sources/House/house.move`, `tests/battleship_tests.move`), output
  completo en el reporte (`--json-errors` opcional para contar, declararlo). Se espera 🔴 por H6 y
  probablemente H8. Anotar si las subcarpetas `sources/House/`, `sources/Game/` se compilan y si el
  compilador se detiene antes de emitir warnings/lints (en ese caso: "no medible hasta que compile",
  no 0). Tras los gates: `git diff --stat Move.lock` vacío.
- **Cambios en docs:**
  - `documents/STATUS.md`:
    - nueva sección **"Toolchain"**: `sui 1.83.0-16d2dc1e05ed` (release testnet), `suiup 0.1.1`,
      `~/.local/bin`, `node --version` tras `nvm use 22`, prerrequisito `client.yaml` según STOP-1
      (ubicación y tipo — "sin claves" o "del owner" —, nunca contenido ni dirección), framework
      pineado (SHA del lock + versión de protocolo de testnet del día), fecha;
    - **"Baselines de gates"**: reemplazar la fila de `STATUS.md:25` ("Esperado 🔴 por H6/H7") por los
      3 gates con ref + SHA, conteos por archivo y los rojos **realmente observados** (citando H6/H8
      según corresponda);
    - **H2** ✅ con resumen del manifest nuevo; H1 completar con "registrado en Toolchain"; P-3 ya
      figura cerrado (verificar, no duplicar);
    - nuevo hallazgo **H11** (toolchain): "`sui move` exige `client.yaml`; sin él crea una clave e
      imprime su frase (`sui_commands.rs:584, 1630-1648`); `-e` no lo evita" → resolución elegida en
      STOP-1 y nota para #3 (config sin claves vía `SUI_CONFIG_DIR`);
    - nota para **#7/#8**: la CLI escribe `Published.toml` (commiteable) al publicar y `Pub.*.toml`
      efímeros (ignorados); `Published.toml` se superpone con `contracts/deployments/<red>.json`
      (D-20261030-03, ARQ-6): **#7 debe definir cuál es la fuente del `packageId` y cuál se deriva**;
      en #8 el owner agrega su clave a la config de STOP-1 (§STOP-1 d);
    - nota para **#3**: `--warnings-are-errors` existe en `build` y `test`;
    - fila del ciclo activo de #1 actualizada.
  - `agents.md`: §2 tabla (línea 46) con la redacción de la Decisión 1; §3 (líneas 51-52 y tabla de
    contratos): gates como `sui move build -e testnet`, `sui move build -e testnet --lint`,
    `sui move test -e testnet` (+ coverage con `-e testnet`), prerrequisito `client.yaml` con
    `active_env: testnet` y mención de `--warnings-are-errors`; §7 gotcha "Framework sin fijar"
    (línea 143) reemplazado por "framework fijado por `Move.lock`; todo delta se justifica" + gotcha de
    `client.yaml`; §11 (línea 179) versión completa `1.83.0-16d2dc1e05ed` y fila `client.yaml` (ruta,
    sin claves o del owner, nunca en el repo ni en logs).
  - `documents/ESTANDARES.md`: PROY-11 con la redacción aprobada (Decisión 1); encabezado a 1.1 con fecha.
- **AuthZ:** no aplica.
- **Criterio de aceptación (DoD):** los 3 gates con `-e testnet` corridos y pegados íntegros; STATUS con
  Toolchain, baseline por archivo con SHA, H2 ✅, H11, notas #3/#7/#8; `agents.md` §2/§3/§7/§11 y PROY-11
  coherentes entre sí y con `Move.toml`; `Move.lock` sin delta tras los gates; `git diff` sin recovery
  phrase, keystore, contenido de `client.yaml` ni direcciones (SEG-3: el DEV lo afirma en el reporte).
- **Tests esperados:** ninguno nuevo; `sui move test` reporta 0 tests (o falla al compilar) — se registra tal cual.
- **Riesgos / rollback:** (i) si un gate reescribe `Move.lock`, `git checkout -- Move.lock` y reportarlo.
  (ii) Rollback de docs: `git checkout -- documents/STATUS.md documents/ESTANDARES.md agents.md`.
- **Commit propuesto (tras revisión):** `docs: record toolchain and first gate baseline (#1)`.

**Cobertura del issue:** criterio 1 (instalación) ya cumplido (H1 ✅); criterio 2 (versiones en
"Toolchain") → TASK-2; criterios 3-5 (manifest sin branches, `override` fuera, `edition`, lock
regenerado) → TASK-1; criterio 6 (baseline por archivo) → TASK-2; criterio 7 (H1/H2/P-3, `agents.md`
§3/§11) → TASK-2; criterio 8 (SEG-3) → ambos tasks + defensa `printf 'n\n'`. Notas del issue: deps
implícitas, formato del lock y `edition` → TASK-1; `Published.toml` y `--warnings-are-errors` →
respondidos en este plan y registrados por TASK-2.

## Decisiones a registrar en `DECISIONES.md`

1. Framework vía dependencias implícitas + nueva redacción de PROY-11 (Decisión 1, aprobada por el MAYOR).
2. Canal testnet de la CLI (Decisión 2, aprobada por el MAYOR).
3. La opción elegida por el usuario en STOP-1 (y, si es (d), si autoriza al DEV a escribir el `client.yaml`).

## Cambios v2 → v3

- N1: versión de protocolo de testnet por GraphQL (`graphql.testnet.sui.io`) en lugar de JSON-RPC (deprecado en el fullnode público); `PV` debe ser entero.
- N2: SHA buscado por piso (última versión ≤ `PV`) y comprobación `PV` ≤ máximo de `manifest.json`.
- N3: fallback `update-deps` con `RUST_LOG=warn`, `tee` a `update1.txt`, verificación 1 aplicada y exit code con `${PIPESTATUS[1]}`.
- N4: bloque de (d) descrito como "unas 11 líneas" y guard con `if … then … else … fi`, sin `exit`.

## Cambios v1 → v2

- STOP-1: opción (c) eliminada; registrada como refutada por el código (`sui_commands.rs:584`) (MAYOR #1).
- STOP-1: nueva opción (d) `client.yaml` sin claves con ubicación, contenido, verificación, convivencia con #8 y CI; recomendación pasa a (d) (MAYOR #2).
- Gates con `-e testnet` en TASK-1, TASK-2 y `agents.md` §3; precondiciones del repin; SHA verificado con `gh api` + `manifest.json` + protocolo de testnet; riesgo residual reescrito (MAYOR #3).
- Opción (b) usa `SUI_CONFIG_DIR`, no `--client.config` (MAYOR #4).
- PROY-11, `agents.md` §2 y comentario de `Move.toml`: el pin lo da `Move.lock`; todo delta se justifica (MAYOR #5).
- Fallback `sui move update-deps -e testnet` (MAYOR #6).
- Incidente de la frase del experimento registrado; defensa `printf 'n\n' |` en toda invocación de `sui` del ciclo (MAYOR #7).
- Verificación de `git status` admite los artefactos del ciclo; TASK-2 corrige la fila H6/H7 de STATUS (MAYOR #8).
- Nota para #7: `Published.toml` vs `deployments/<red>.json`, #7 define la fuente (MAYOR #9).
- Decisión 1 cita el rechazo de `Sui`/`MoveStdlib` en el formato moderno (`sui_flavor.rs:241-275`) (MAYOR #10).
