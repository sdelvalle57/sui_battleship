# SMOKE_ACCEPT
> Plan: PLAN_ACCEPT v2 | Handoff: HANDOFF_ACCEPT v1.4 (smoke del ciclo) | Issue: #12 | Fecha: 2026-11-03 (generado; la
> corrida anota su fecha) | Estado: **EN CURSO**
> (las columnas "Resultado obtenido" y "Estado" se llenan **durante** la corrida, nunca por adelantado)
>
> **Modalidad de los pasos 🌐:** Chrome headless + CDP con perfil desechable, como en #11
> (`git show ac5a85c^2:documents/SMOKE_CREATE_CANCEL.md`, "Modalidad" y "Precondiciones"). `google-chrome --headless=new
> --no-first-run --no-default-browser-check --user-data-dir=<SMOKE_DIR>/chrome-profile
> --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229 about:blank`, con `HOME` y `XDG_*` dentro de
> `<SMOKE_DIR>/chrome-home`. Corre en segundo plano del harness con `exec` y el PID en `<SMOKE_DIR>/chrome.pid`. Lo
> controla un cliente CDP propio en Node 26 (`fetch` + `WebSocket`, sin dependencias, archivo en `<SMOKE_DIR>`, no se
> commitea):
> - `Target.createTarget({ url, newWindow: true })` + `attachToTarget`, una sesión por pestaña;
> - `Runtime.evaluate` (DOM y shadow DOM del kit), `Input.insertText` y `Network.*`;
> - `Fetch.*` solo en los pasos 14 y 15;
> - `Runtime.consoleAPICalled` y `Log.entryAdded`.
>
> Navegación solo a `127.0.0.1:5173`. Nunca el navegador, el perfil ni las extensiones del usuario.

## Historia de usuario (del ciclo)

**Como** jugador con la wallet conectada que encontró una partida abierta (o recibió el enlace de una invitación),
**quiero** aceptarla con un clic igualando exactamente la apuesta del creador y ver quién ganó el coinflip, cuánto se
pagó y cuánto cobró la House, con el enlace a la transacción, **para** jugar sin la CLI y confiar en que el resultado que
veo es el que quedó on-chain. Este smoke lo comprueba de punta a punta contra una red real (localnet aislada) con tres
wallets de desarrollo (burner) y cuentas de la génesis por CLI. También comprueba que salir de la pantalla y volver no
permite un segundo envío (MINOR-1 de la revisión de #11).

## Criterios del issue y dónde se verifican

| Criterio (#12 y decisiones) | Pasos |
|---|---|
| Aceptar una partida **abierta**; el monto es el `bet` del `Game` | 6, 7 |
| Aceptar una **invitación** con la cuenta invitada | 9, 11 |
| Una tercera cuenta abre el detalle por URL: aviso sin botón en una invitación ajena (D-20261103-02) | 9 |
| Error mapeado en la app para la tercera cuenta: `game`/4 por carrera (D-20261103-02) | 12 |
| `game`/5 (`ENotInvited`) lo valida el contrato: por CLI (D-20261103-02) | 10 |
| Ambas cuentas ven el mismo resultado; el detalle refleja `Resolved` con el ganador | 8 |
| Los saldos cambian según `payout` y el gas; `fees_collected` sube `fee` | 7, 11 |
| SEG-10: nada sugiere un resultado antes de la confirmación del nodo | 7, 15 |
| Botón visible solo con wallet, sin ser el creador y en `Pending`; deshabilitado con aviso si el saldo no alcanza | 5, 6, 8 |
| Resultado con ganó/perdió, pago, comisión y digest (en localnet, texto; link solo en testnet) | 7, 11 |
| Doble envío: una sola ejecución | 11, 14 |
| MINOR-1: salir y volver no permite un segundo envío; el "sin confirmar" persiste durante la carga de la página | 14, 15 |
| Cancelación del runtime con el texto de "intenta de nuevo" (DL-11), si ocurre | 7 (plan B) |

## Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-12-accept-resolve` con TASK-1..5 commiteadas; `npm ci` con Node 26; gate de
  la app en verde (reporte de TASK-5). Nada de esta corrida se commitea salvo este archivo.
- **Red:** localnet **aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh` con `SUI`, `NODE`,
  `SUI_CONFIG_DIR`, `HOME` aislado; `ids.env`; `smoke_guard`; publicación con el script en la **variante B** (sin `--out`,
  escribe `contracts/deployments/localnet.json`, ignorado por git); cierre del paso 7.
  - **Publicaciones previas:** esta branch no tiene `contracts/Published.toml` (la publicación de #8 no está mergeada), así
    que la variante B no choca con una sección `[published.testnet]`. El paso 0 lo comprueba; si existiera, se para y se
    avisa al orquestador.
- **Una sola localnet a la vez** (puerto 9000): antes del paso 1, `ss -ltn` sin nada en `:9000` y ningún `sui start` de
  otra sesión. Si hay otra, se detiene y se avisa.
- **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo del paso 3 de §3
  (`. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), **tampoco** los de solo
  lectura; siempre `suic`/`"$SUI"`. En la tabla, `PRE` abrevia ese prefijo y **todo `suic` de este documento lo lleva**
  aunque no se escriba.
- **Testnet:** nada (ni lecturas).
- **Cuentas:**
  - `ADMIN`, `A`, `B` son cuentas de la génesis aislada (en `ids.env`, no se pegan).
  - Las wallets de la app son **tres burners**, que firman en `npm run dev` sin ventana de aprobación:
    - `X`, creador, en `T1`;
    - `Y`, aceptante e invitado, en `T2`;
    - `Z`, tercera cuenta, en `T3`.
  - Las burners se fondean por CLI desde `A`.
  - Nunca `new-address`. Nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node. Ninguna clave del owner; nada en `~/.sui/`.
- **Pestañas:**
  - Cada una se abre con `Target.createTarget({ url, newWindow: true })`. Las tres quedan visibles: el paso 3 comprueba `document.visibilityState === 'visible'` en las tres.
  - **Nunca** `Page.bringToFront` (`agents.md` §3 paso 6): el foco dispara relecturas y cierra la ventana de la carrera del paso 12.
- **Burner:**
  - Nace **sin fondos** y su clave vive en memoria: **recargar la pestaña crea otra dirección**.
  - Después de fondearla, la navegación es **solo por hash** (`Runtime.evaluate` de `location.hash = '#/…'`), nunca `Page.navigate` ni `Page.reload`.
  - Las direcciones `X`/`Y`/`Z` se leen del `title` de `.account-badge` y van a `ids.env` (efímeras; no se pegan).
  - Para conectar: `button[part=trigger]` del `internal-button` del kit ⇒ modal "Connect a wallet" ⇒ "Unsafe Burner Wallet".
- **Formularios de React:** foco + `Input.insertText` (dispara `onChange`); nunca asignar `value` a secas. Clicks con
  `element.click()` dentro de `Runtime.evaluate`.
- **Archivos de entorno** (cada llamada es un shell nuevo; rutas **literales** en el archivo real, aquí con
  placeholders; nunca dos de estos archivos en la misma llamada):
  - `<SMOKE_DIR>/env.sh` (§3 paso 2): **solo** para llamadas con `sui`/`suic`/`publish.mjs`.
  - `<SMOKE_DIR>/app.env`: para `node`/`npm`/`curl`/`vite` y el cliente CDP; no toca `HOME` ni `SUI_CONFIG_DIR`:
    ```sh
    SMOKE_DIR=<SMOKE_DIR>
    REPO=<repo>
    NODE=<HOME real>/.nvm/versions/node/v26.13.0/bin/node
    VITE_JS=<repo>/node_modules/vite/bin/vite.js
    export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH
    [ "$("$NODE" --version)" = v26.13.0 ] && [ -d "$SMOKE_DIR" ] && [ -f "$VITE_JS" ] || { echo APPENV-FAIL; return 97; }
    ```
  - `<SMOKE_DIR>/chrome.env`:
    - `CHROME=$(command -v google-chrome)`, resuelto a ruta literal;
    - `HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME`/`XDG_DATA_HOME` = `<SMOKE_DIR>/chrome-home/…`;
    - una guarda que falla si `CHROME` no es ejecutable.
- **Procesos en segundo plano** (comandos del harness con `exec` y PID en `<SMOKE_DIR>`): `sui.pid`, `vite.pid`,
  `chrome.pid`. Se detienen por PID (nunca `pkill`). **Exit 144:** `sui start` 1.83 sale con 144 ante SIGTERM; es
  esperado y lo que vale es que `kill -0` falle.
- **Pedidos en CDP** (`Network.requestWillBeSent`, por sesión de pestaña), por método gRPC-web:
  `…/TransactionExecutionService/SimulateTransaction`, `…/TransactionExecutionService/ExecuteTransaction`,
  `…/LedgerService/GetTransaction`, `…/LedgerService/GetObject` o `BatchGetObjects`, `…/StateService/GetBalance`,
  `…/LedgerService/ListEvents`.
  - Por acción con la burner: **2** `SimulateTransaction` (la preflight de la app y el `build` de la burner) y **1** `ExecuteTransaction`.
  - Una preflight que aborta da **1** `SimulateTransaction` y **0** `ExecuteTransaction`.
  - Las lecturas `net::ERR_ABORTED` del primer montaje de `StrictMode` o de los "not found" de `waitForTransaction` no cuentan; se anotan.
- **Observador:**
  - Antes de cada acción de los pasos 7, 11, 12, 14 y 15, `Runtime.evaluate` instala en la pestaña que actúa un `MutationObserver` sobre `document.body`.
  - Guarda en `window.__txLog` tuplas `[performance.now(), selector, texto]` cada vez que cambia el texto de `.tx-status` o de `.game-actions`.
  - En otra lista guarda `.game-detail`, que es informativo.
  - Se reporta `preflight → signing`, `signing → confirming` y `confirming → done`.
- **SEG-10, tokens de resultado** (DL-5, con mayúsculas exactas): "Ganaste", "Perdiste", "Recibiste", "ganó quien",
  "Resultado para ti".
  - **Ninguno** puede aparecer en `.tx-status` ni en `.game-actions` mientras `.tx-status` muestre "Verificando la transacción…", "Esperando la firma en la wallet…" o "Confirmando en la red…".
  - Que `.game-detail` muestre "Resuelta", el ganador o "Resultado para ti" durante esas etapas está **permitido** si sale de una lectura **del nodo** (relectura por invalidación o el intervalo de 15 s). Se anota, no es falla.
- **Textos esperados** (código de la branch: `GameActions.tsx`, `GameDetail.tsx`, `CreateGameForm.tsx`,
  `TransactionStatus.tsx`, `txNotice.ts`, `sui/errors.ts`, `sui/gameActions.ts`):

| Dónde | Texto exacto |
|---|---|
| Etapas (`.tx-status`, `role="status"`) | "Verificando la transacción…" · "Esperando la firma en la wallet…" · "Confirmando en la red…" · "Actualizando datos…" |
| Sin cuenta, `Pending` (`.game-actions`) | "Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron" (en una partida terminada, nada) |
| Invitación ajena, con cuenta | "Esta invitación es para otra dirección." (sin "Aceptar") |
| Bloque de aceptar | "Apuestas `<bet>` SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la transacción (50 % cada uno) y pagas su gas." · "Si tu wallet muestra una vista previa con un ganador o un cambio de saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción." |
| Saldo insuficiente (`.field-error`) | "Saldo insuficiente: necesitas `<bet>` SUI de apuesta más ≈ 0.01 SUI de reserva para el gas" ("Aceptar" deshabilitado) |
| Resultado ganado | "¡Ganaste! Recibiste `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)" + "Transacción `<6>…<4>`" (`<code title="<digest>">` en localnet) + " · Costo de red: `<x>` SUI" |
| Resultado perdido | "Perdiste: ganó quien creó la partida y recibió `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)" + digest + costo |
| Sin evento | "Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador" |
| Detalle resuelto | Estado "Resuelta", "Aceptante", "Ganador", "Pozo", "Comisión cobrada", "Pago al ganador"; para el creador y el aceptante, "Resultado para ti" = "ganaste" o "perdiste" |
| En curso (otra vista o pantalla) | "Hay una transacción en curso desde esta cuenta; espera a que termine" |
| Sin confirmar (`role="alert"`) | "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar" + digest; "Ya la revisé" (detalle) o "Ya la revisé: crear otra partida" (formulario) |
| Abort `game`/4 | "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)" |
| Cancelación del runtime (aleatoriedad) | "La red canceló la transacción sin ejecutarla (la aleatoriedad de la red todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos" |

- **Montos de referencia** (250 bps, `formatMist`):
  - 0,01 SUI (10000000 MIST): pozo 0.02, comisión 0.0005, al ganador 0.0195 (20000000 / 500000 / 19500000 MIST).
  - 0,02 SUI: pozo 0.04, comisión 0.001, al ganador 0.039 (40000000 / 1000000 / 39000000 MIST).
- **Costo de red** = `computationCost + storageCost − storageRebate` del `gasUsed` de `suic tx-block <digest> --json`.
- **Invariante de fondos** de una aceptación:
  - Δ aceptante = (ganó ? `payout` : 0) − `bet` − costo de red;
  - Δ creador = (ganó ? `payout` : 0);
  - Δ `fees_collected` = `fee`;
  - `payout + fee = 2 × bet`.
- **Consistencia eventual:** tras cada transacción de la CLI, esperar a que `suic tx-block <digest> --json` muestre
  `checkpoint` antes de leer en el navegador (se anota; no es falla).
- **Qué se pega:** IDs y direcciones **abreviados** (`0x1234…abcd`); digests completos sí. Nunca `sender`/`owner`, la
  salida cruda del script, archivos de `<SMOKE_DIR>/net` ni logs completos.

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`; línea base `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | línea base anotada; sin `localnet.json`, `Published.toml` ni `Pub.*.toml` (si existe alguno: se detiene y se avisa); 6 puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (§3 paso 4, `sui.pid`); `PRE suic chain-identifier` (reintentar si el primer checkpoint aún no está indexado; se anota); `PRE suic addresses --json` ⇒ `ADMIN`, `A`, `B` a `ids.env` (§3 paso 5) | red arriba; `active-env` = `localnet`; chain id corto anotado | | ⏳ |
| 2 | DEV: publicación **variante B**: `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`; `PKG` (`packageId`), `HOUSE` (`houseId`), `CAP` (`houseCapId`) del JSON a `ids.env`; luego `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-02.json"`; `suic object "$HOUSE" --json` ⇒ `fees_collected` inicial | publicación exit 0; `localnet.json` con `schemaVersion` 1 y `network` `localnet`; `git check-ignore -v` lo ignora; `Move.lock` sin delta; ningún `Published.toml` en `contracts/`; `update_fee_rate` `success` con `FeeRateUpdated` 0 → 250; `fees_collected` = 0 | | ⏳ |
| 3 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; `curl -sf http://127.0.0.1:5173/`. Chrome en segundo plano con `chrome.env` (`chrome.pid`); `curl -sf http://127.0.0.1:9229/json/version`. 🌐 `T1`, `T2`, `T3` con `Target.createTarget({ url: 'http://127.0.0.1:5173/', newWindow: true })` y `Network.enable` en cada sesión | 200 con `<div id="root">`; CDP solo en 127.0.0.1; badge `localnet · nodo OK` en las tres; `document.visibilityState === 'visible'` en `T1`, `T2` y `T3` | | ⏳ |
| 4 | 🌐 Conectar la burner en `T1` (⇒ `X`) y en `T2` (⇒ `Y`); direcciones del `title` de `.account-badge` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$X --json` y lo mismo para `@$Y`; esperar el `checkpoint`. 🌐 en `T1` y `T2`: `#/nada` → `#/` | "Saldo: 2 SUI" en el formulario de `T1` y de `T2`; `.account-badge` con las mismas direcciones (sin recarga) | | ⏳ |
| 5 | 🌐 `T1` crea `G1` abierta de `0.01` (ID del hash a `ids.env`). `T3`, **todavía sin conectar**: `location.hash = '#/game/<G1>'`. Salvedad (paso 13 de #11): si el kit conectó `T3` solo a una burner nueva (sesión guardada del mismo origen), se anota y se desconecta ("Disconnect") antes de comprobar. Después: conectar la burner en `T3` (⇒ `Z`, a `ids.env`) y DEV fondea `Z` con **5000000** MIST (`… "[5000000]" … @$Z`) | `T3` sin cuenta: "Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron", **sin** botones y **sin** "Esta invitación es para otra dirección."; `Z` con 0.005 SUI (`suic balance $Z`) | | ⏳ |
| 6 | 🌐 `#/game/<G1>` en las tres (en `T3`, `#/nada` → `#/game/<G1>` para remontar con el saldo nuevo); contar pedidos del paso. DEV: anotar `suic balance $X`, `$Y` y `fees_collected` de la House (línea base del paso 7) | `T1` (creador): **sin** "Aceptar", con "Cancelar"; `T2`: "Aceptar" habilitado, "Apuestas 0.01 SUI, igual que el creador. …" y la nota de la vista previa; `T3`: "Aceptar" **deshabilitado** con "Saldo insuficiente: necesitas 0.01 SUI de apuesta más ≈ 0.01 SUI de reserva para el gas"; **cero** `SimulateTransaction` y `ExecuteTransaction` en las tres | | ⏳ |
| 7 | 🌐 `T2`: observador; click en "Aceptar". DEV: con el digest (`title` del `<code>`), `suic tx-block <digest> --json`; `suic balance $X` y `$Y`; `suic object "$HOUSE" --json`. **Plan B (R-2):** si el resultado es el texto de cancelación por aleatoriedad, se anota como prueba real de DL-11, se comprueba que `G1` sigue "Abierta" y se reintenta con el mismo botón (el paso se evalúa con el reintento) | etapas en orden: "Verificando la transacción…" → "Esperando la firma en la wallet…" → "Confirmando en la red…" (→ "Actualizando datos…"); **ningún token** de SEG-10 en `.tx-status`/`.game-actions` mientras se ven las tres primeras (`window.__txLog`); después, "¡Ganaste! Recibiste 0.0195 SUI (pozo 0.02 SUI − comisión 0.0005 SUI)" **o** "Perdiste: ganó quien creó la partida y recibió 0.0195 SUI (pozo 0.02 SUI − comisión 0.0005 SUI)", más "Transacción …" y "Costo de red: …"; el bloque de aceptar desaparece y el resultado sigue a la vista; **2** `SimulateTransaction` + **1** `ExecuteTransaction`. DEV: `success`; `GameResolved` con `pot` 20000000, `fee` 500000, `payout` 19500000, `acceptor` = `Y`, `winner` ∈ {`X`, `Y`} coherente con el texto; Δ`Y` = (ganó ? 19500000 : 0) − 10000000 − costo (= el de la UI); Δ`X` = (ganó ? 19500000 : 0); Δ`fees_collected` = 500000; latencias anotadas | | ⏳ |
| 8 | 🌐 `T1`: `#/nada` → `#/game/<G1>`; `T2` sigue en el detalle; después `T2`: `#/` | `T1` y `T2`: Estado "Resuelta", el mismo "Ganador" y los mismos montos (pozo 0.02, comisión cobrada 0.0005, pago 0.0195); "Resultado para ti" = "ganaste" en la cuenta ganadora y "perdiste" en la otra, coherente con el paso 7; **ningún** botón de acción; en `T2`, `G1` ya no está en el lobby, sin "Actualizar" | | ⏳ |
| 9 | 🌐 `T1` crea `G2` de `0.02` invitando a `Y` (dirección de `ids.env`). `T3`: `location.hash = '#/game/<G2>'` (detalle por URL). `T2`: `location.hash = '#/game/<G2>'` | `T3`: **sin** "Aceptar", con "Esta invitación es para otra dirección." (D-20261103-02); `T2`: Estado "Invitación a `<Y abreviado>`", "Aceptar" y "Rechazar" visibles; `T1`: "Cancelar"; ningún `SimulateTransaction` | | ⏳ |
| 10 | DEV, `game`/5 por CLI (D-20261103-02): `PRE act_as "$B" && suic ptb --split-coins gas "[20000000]" --assign c --move-call "$PKG::game::accept_game" @$G2 @$HOUSE c.0 @0x8 --gas-budget 100000000 --json > "$SMOKE_DIR/tx-10.json"` (con `--gas-budget` la CLI ejecuta sin dry run); 🌐 `T2`: `#/nada` → `#/game/<G2>` | fallo **ejecutado**: `effects.status` `failure` con `MoveAbort(… name: Identifier("game") …, 5)`; `B` solo paga gas; 🌐 `G2` sigue "Invitación a `<Y abreviado>`" con "Aceptar" y "Rechazar" para `Y` | | ⏳ |
| 11 | 🌐 **Invitación + doble clic:** `T2` en `#/game/<G2>`; observador; en **un solo** `Runtime.evaluate`: `const b = <botón "Aceptar">; b.click(); b.click();` (sin `await` entre ellos). DEV: `tx-block`, saldos de `X` e `Y`, `fees_collected` | **2** `SimulateTransaction` y **1** `ExecuteTransaction` (no 4 y 2); un solo texto de resultado con pozo 0.04, comisión 0.001 y 0.039 al ganador; si el 2.º `click()` encontró el botón ya deshabilitado se anota (lo frena `disabled` además del candado; el resultado que cuenta es 1 ejecución). DEV: un solo `GameResolved` para `G2` con `acceptor` = `Y`, `pot` 40000000, `fee` 1000000, `payout` 39000000; invariante de fondos | | ⏳ |
| 12 | 🌐 **Tercera cuenta, carrera (D-20261103-02):** DEV fondea `Z` con 1 SUI (`… "[1000000000]" … @$Z`); `T1` crea `G3` abierta de `0.01`; `T2` y `T3`: `location.hash = '#/game/<G3>'` (en `T3` "Aceptar" habilitado con el saldo nuevo). `T2`: "Aceptar" ⇒ esperar el texto de resultado; **inmediatamente**, en `T3` y solo por `Runtime.evaluate` (sin `Page.bringToFront` ni cambio de pestaña activa): leer el DOM (¿sigue "Aceptar" habilitado?) y, si sigue, `click()` + observador. Si el detalle de `T3` ya se había refrescado, repetir con otra partida y anotarlo. DEV: `suic balance $Z` antes y después | `T3`: "Verificando la transacción…" ⇒ alerta "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)"; en `T3`, **1** `SimulateTransaction` (la preflight) y **0** `ExecuteTransaction`; el detalle de `T3` pasa a "Resuelta" por la invalidación tras el abort (sin esperar los 15 s); saldo de `Z` sin cambios | | ⏳ |
| 13 | Si los pasos 7, 11 y 12 no dieron los dos ganadores (`X` y `Y`): hasta 3 aceptaciones más (`T1` crea abierta de `0.01`, `T2` acepta), con `tx-block` de cada una | se anota qué ganadores se vieron (los dos resultados tienen además tests de componentes; no es falla si no aparecen) | | ⏳ |
| 14 | 🌐 **MINOR-1, crear, mismo objetivo:** antes, `T2` crea `G4` abierta de `0.01` (de `Y`). En `T1`: `Fetch.enable` con `patterns: [{ urlPattern: '*LedgerService/GetTransaction*', requestStage: 'Request' }]` y, en cada `Fetch.requestPaused`, `Fetch.failRequest` con `errorReason: 'ConnectionFailed'` (la ejecución no se toca; solo falla la confirmación). `#/`; observador; crear abierta de `0.01` ⇒ "Confirmando en la red…". Durante la espera: (i) `#/nada` → `#/`; (ii) foco en "Apuesta (SUI)" + `Input.insertText('0.01')` y, con el monto escrito, `form.requestSubmit()` por `Runtime.evaluate`; (iii) `location.hash = '#/game/<G4>'`; (iv) `#/`. A los ≈ 30 s (`TX_CONFIRM_TIMEOUT_MS`): con la alerta a la vista, `#/nada` → `#/`. `Fetch.disable`. DEV: `tx-block` del digest de la alerta. 🌐 "Ya la revisé: crear otra partida" | (i) "Crear partida" **deshabilitado** con "Hay una transacción en curso desde esta cuenta; espera a que termine"; (ii) con el monto válido (sin errores de campo), "Crear partida" sigue `disabled` con el mismo texto y, tras `requestSubmit()`, siguen **1** `ExecuteTransaction` y **2** `SimulateTransaction`; (iii) en `G4`, "Aceptar" deshabilitado con el mismo texto; (iv) y a los 30 s: **una sola** alerta (`getAllByRole('alert')`/`[role=alert]` = 1) "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar" con el digest y "Crear partida" deshabilitado, **también tras** `#/nada` → `#/`; "Ya la revisé: crear otra partida" ⇒ desaparece la alerta y "Crear partida" vuelve a habilitarse con un monto válido. DEV: el digest es `success` (se ejecutó) | | ⏳ |
| 15 | 🌐 **MINOR-1, aceptar:** `T1` crea `G5` abierta de `0.01`. En `T2`: el mismo `Fetch` del paso 14; `#/game/<G5>`; observador; "Aceptar" ⇒ "Confirmando en la red…". Durante la espera: `#/` y vuelta a `#/game/<G5>`. A los ≈ 30 s, `Fetch.disable`; "Ya la revisé". DEV: `tx-block` del digest | en `#/`: "Crear partida" deshabilitado con "Hay una transacción en curso desde esta cuenta; espera a que termine"; de vuelta en `G5` (vista nueva): el mismo texto, "Aceptar" deshabilitado y **ningún** token de SEG-10 en `.tx-status`/`.game-actions`; a los 30 s: **una** alerta "sin confirmar" con el digest y "Ya la revisé" (el detalle ya puede verse "Resuelta" y sin botón de aceptar: lectura del nodo, permitida); "Ya la revisé" la quita; **1** `ExecuteTransaction` en todo el paso. DEV: `success` | | ⏳ |
| 16 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill` de `vite` y de Chrome por PID y `kill "$(cat <SMOKE_DIR>/sui.pid)"` (exit 144 esperado); `kill -0` falla en `sui`, `vite` y Chrome; ningún proceso con el perfil desechable; puertos 9000, 9123, 9184, 5003, 5173 y 9229 libres; `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `test ! -e <repo>/contracts/deployments/localnet.json`; `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_ACCEPT.md` | todo limpio; `~/.sui/` sin cambios | | ⏳ |

## Qué no cubre este smoke (y dónde está cubierto)

- **"Sin confirmar" de una partida que sigue pendiente:** la burner siempre ejecuta antes de que falle la confirmación. Cubierto por T3-5/T3-6 (`useTxTarget.test.tsx`).
- **Adopción de un resultado `failure`:** T3-7.
- **NIT-2** (error de la wallet sin digest con abort): T3-13.
- **`networkMode: 'always'` sin red:** T3-12.
- **DL-10** (envoltorio del SDK y rechazos de preparación): T2-8 y T3-14.
- **Cancelaciones del runtime**, si el plan B del paso 7 no ocurre: T2-7 (y S-5 de TASK-1; R-3 sigue abierto).
- **Fallo ejecutado de aceptar mostrado en la UI:** fixture real `acceptNotPendingExecuted` + T2-6. El paso 12 muestra el abort en la preflight.
- **`game`/5 en la UI:** no existe por diseño (D-20261103-02). Cubierto por el paso 10 (CLI) y T2-6 (fixture `acceptNotInvited`).
- **Owner, #17:** wallets de extensión y su vista previa con `Random`, pestañas con la misma cuenta (R-5), y la latencia y la reserva de gas en testnet.

## Si algo falla

- Capturar:
  - número de paso;
  - digest y `suic tx-block <digest>` (sin `sender`/`owner`);
  - DOM o texto relevante;
  - `window.__txLog`;
  - `Network.*` y consola de la pestaña.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 16) se ejecuta igual.
- Una recarga accidental cambia la burner de esa pestaña: se anota, se reconecta y se vuelve a fondear; no es falla del
  producto.
- Si la red tarda en tener la aleatoriedad al arrancar, esperar unos segundos antes del paso 7 y anotarlo. El plan B del paso 7 cubre el caso en que igual aparezca la cancelación.

## Reporte final

- Pasos PASA/TOTAL:
- Latencias (ms, `window.__txLog`, `performance.now()` de la página):

| Acción (paso, pestaña) | preflight → signing | signing → confirming | confirming → done |
|---|---|---|---|
| Aceptar abierta (7, `T2`) | | | |
| Aceptar invitación (11, `T2`) | | | |
| Aceptar en la carrera (12, `T2`) | | | |

- Ganadores observados (pasos 7, 11, 12 y 13):
- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]
