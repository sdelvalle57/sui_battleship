# SMOKE_CREATE_CANCEL
> Plan: PLAN_CREATE_CANCEL v1 | Handoff: HANDOFF_CREATE_CANCEL v1.3 (smoke del ciclo) | Issue: #11 | Fecha: 2026-11-02 |
> Estado: **POR CORRER**
> (las columnas "Resultado obtenido" y "Estado" se llenan **durante** la corrida, nunca por adelantado)
>
> **Modalidad de los pasos 🌐:** Chrome headless + CDP con perfil desechable, como en #9/#10
> (`git show dfca12e:documents/SMOKE_LOBBY.md`). `google-chrome --headless=new --no-first-run --no-default-browser-check
> --user-data-dir=<SMOKE_DIR>/chrome-profile --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229
> about:blank`, con `HOME` y `XDG_*` dentro de `<SMOKE_DIR>/chrome-home`; en segundo plano del harness con `exec` y PID en
> `<SMOKE_DIR>/chrome.pid`; controlado con un cliente CDP propio en Node 26 (`fetch` + `WebSocket`, sin dependencias,
> archivo en `<SMOKE_DIR>`, no se commitea): `Target.createTarget`/`attachToTarget` (una sesión por pestaña),
> `Runtime.evaluate` (DOM y shadow DOM del kit), `Input.insertText`, `Network.*`, `Fetch.*` (solo en el paso 18),
> `Runtime.consoleAPICalled` y `Log.entryAdded`. Navegación solo a `127.0.0.1:5173` y `127.0.0.1:4173`. Nunca el navegador,
> el perfil ni las extensiones del usuario.

## Historia de usuario (del ciclo)

**Como** jugador con la wallet conectada, **quiero** crear una partida apostando SUI (abierta o invitando a una
dirección), cancelarla mientras nadie la aceptó y, si me invitaron, rechazar la invitación, viendo en cada paso si la
transacción está pendiente, salió bien o falló y por qué, **para** poner mi apuesta en juego, recuperarla si me arrepiento
y decir que no a una invitación sin usar la CLI y sin éxitos falsos. Este smoke lo comprueba de punta a punta contra una
red real (localnet aislada) con dos wallets de desarrollo (burner) y cuentas de la génesis por CLI.

## Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-11-create-cancel` con TASK-1..6 commiteadas; `npm ci` con Node 26; gate de
  la app en verde (reporte de TASK-6). Nada de este runbook se commitea salvo este archivo.
- **Red:** localnet **aislada** según `agents.md` §3 "Localnet aislada (smokes)": `env.sh` con `SUI`, `NODE`,
  `SUI_CONFIG_DIR`, `HOME` aislado; publicación con el script, **variante B** (sin `--out`, escribe
  `contracts/deployments/localnet.json`); cierre del paso 7.
- **Una sola localnet a la vez** (puerto 9000): antes del paso 1, `ss -ltn` sin nada en `:9000` y ningún `sui start` de
  otra sesión. Si hay otra, se detiene y se avisa al orquestador.
- **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo de §3 paso 3
  (`. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), **tampoco** los de solo
  lectura; siempre `suic`/`"$SUI"`. `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. En la tabla, `PRE` abrevia ese prefijo. **Todo
  `suic` de este documento lleva `PRE` aunque no se escriba** (incluidos `suic addresses`, `suic balance` y
  `suic tx-block`).
- **Testnet:** nada con claves (ni `publish.mjs … --network testnet`, ni `--dry-run`). Este smoke **no** hace pedidos a
  testnet: el único paso de testnet es un build sin `testnet.json` que debe mostrar `ConfigError` **sin** pedidos (paso 19).
- **Cuentas:** `ADMIN`, `A`, `B` = cuentas de la génesis aislada (en `ids.env`, no se pegan). Las wallets de la app son
  **dos burners** (`X` en la pestaña `T1`, `Y` en `T2`), que firman en `npm run dev` sin ventana de aprobación. Ninguna
  clave del owner; nada en `~/.sui/` (D-20261102-03). Nunca `new-address`. Nadie firma como una burner por CLI ni lee
  `<SMOKE_DIR>/net` desde Node.
- **Burner (V-3 del handoff):** nace **sin fondos** y su clave vive en memoria: **recargar la pestaña crea otra
  dirección**. Se fondea por CLI desde `A` bajo `PRE`; después de fondearla, la navegación es **solo por hash**
  (`Runtime.evaluate` de `location.hash = '#/…'`), nunca `Page.navigate` ni `Page.reload`. Las direcciones `X`/`Y` se leen
  del `title` de `.account-badge` y van a `ids.env` (efímeras; no se pegan).
- **Formularios de React:** foco + `Input.insertText` (dispara `onChange`), o el setter nativo de `value` + evento
  `input`; nunca asignar `value` a secas. Clicks con `element.click()` dentro de `Runtime.evaluate`.
- **Sin `Page.bringToFront`** en ningún paso: el foco dispara refetch (House, detalle) y cambia lo que se está probando
  (en especial los pasos 15 y 17).
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
  - `<SMOKE_DIR>/chrome.env`: `CHROME=$(command -v google-chrome)` resuelto a ruta literal, `HOME`/`XDG_CONFIG_HOME`/
    `XDG_CACHE_HOME`/`XDG_DATA_HOME` = `<SMOKE_DIR>/chrome-home/…`; guarda que falla si `CHROME` no es ejecutable.
- **Procesos en segundo plano** (comandos del harness con `exec` y PID en `<SMOKE_DIR>`): `sui.pid`, `vite.pid`,
  `preview.pid`, `chrome.pid`. Se detienen por PID (nunca `pkill`). **Exit 144:** `sui start` 1.83 sale con 144 ante
  SIGTERM y el harness marca el comando como fallido: es **esperado**; lo que vale es que `kill -0` falle.
- **Qué se pega:** IDs y direcciones **abreviados** (`0x1234…abcd`); digests completos sí. Nunca la salida cruda del
  script, `sender`/`owner`, archivos de `<SMOKE_DIR>/net` ni logs completos.
- **Pedidos en CDP** (`Network.requestWillBeSent`, por sesión de pestaña), por método gRPC-web:
  `…/TransactionExecutionService/SimulateTransaction`, `…/TransactionExecutionService/ExecuteTransaction`,
  `…/LedgerService/GetTransaction`, `…/LedgerService/ListEvents`, `…/LedgerService/GetObject` o `BatchGetObjects`,
  `…/StateService/GetBalance`. Por acción con la burner se esperan **2 `SimulateTransaction`** (la preflight de la app y
  el `build` de la burner) y **1 `ExecuteTransaction`**. En `vite` dev, `StrictMode` puede dejar pedidos de **lectura**
  abortados (`net::ERR_ABORTED`) del primer montaje: se anotan y no cuentan.
- **Latencia de etapas** (pedido del MID revisor): antes de cada acción de los pasos 8, 10, 11 y 16, inyectar con
  `Runtime.evaluate` un `MutationObserver` sobre `document.body` que guarde en `window.__txLog` pares
  `[performance.now(), texto]` cada vez que cambie el texto de un `.tx-status` (y del `h2`/hash al navegar). Se reporta
  `preflight → signing`, `signing → confirming` y **`confirming → done`** (de "Confirmando en la red…" al texto de éxito).
- **Textos esperados** (código de la branch): `app/src/components/TransactionStatus.tsx`, `CreateGameForm.tsx`,
  `GameActions.tsx`, `createdNotice.ts`, `app/src/pages/GameDetailPage.tsx`, `app/src/components/GameDetail.tsx`,
  `LobbyList.tsx`, `app/src/sui/errors.ts`, `app/src/sui/createGame.ts` y `app/src/hooks/useExecuteTransaction.ts`. Los
  relevantes:

| Dónde | Texto exacto |
|---|---|
| Etapas (`.tx-status`, `role="status"`) | "Verificando la transacción…" · "Esperando la firma en la wallet…" · "Confirmando en la red…" · "Actualizando datos…" |
| Éxito | `<texto de la acción>` + "Transacción `<6 primeros>…<4 últimos>`" (`<code title="<digest>">` en localnet) + " · Costo de red: `<X>` SUI"; si no se indexó: "La lista puede tardar unos segundos en mostrarlo" |
| Sin confirmar (`role="alert"`) | "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar" + "Transacción …"; en el formulario, "Crear partida" deshabilitado y el botón "Ya la revisé: crear otra partida" |
| Fallo (`role="alert"`) | el mensaje; si se ejecutó, "Transacción …" y " · Costo de red: …" |
| Formulario sin cuenta | "Conecta tu wallet para crear una partida" (campos deshabilitados) |
| Formulario con cuenta | "Mínimo `<min>` SUI · máximo `<max>` SUI" · "Comisión `<bps>` (la partida guarda esta comisión)" · "Saldo: `<s>` SUI" · "Si alguien acepta: pozo `<p>` SUI · comisión `<c>` SUI · al ganador `<g>` SUI" · nota "Además del gas, crear la partida deja un depósito de almacenamiento (≈ 0.0019532 SUI abierta, ≈ 0.0021964 SUI con invitación, al precio actual de testnet) que no se recupera. El saldo tiene que cubrir la apuesta más ≈ 0.01 SUI de reserva para el gas." |
| Errores de campo (`.field-error`) | "Escribe la apuesta en SUI" · "Monto inválido: solo números y punto decimal, sin espacios ni separador de miles" · "Como máximo 9 decimales" · "La apuesta mínima es `<min>` SUI" · "La apuesta máxima es `<max>` SUI" · "Saldo insuficiente: necesitas la apuesta más ≈ 0.01 SUI para el gas" · "Dirección inválida" · "No puedes invitarte a ti mismo" |
| Aviso de creación (detalle) | "Partida creada" + "Transacción … · Costo de red: `<X>` SUI (incluye el depósito de almacenamiento, que no se recupera)"; invitación: "Comparte el enlace de esta página con el invitado; guárdalo para volver a esta partida"; si cambió la comisión: "La partida se creó con comisión `<to>` (el formulario mostraba `<from>`)" |
| Botones del detalle | "Cancelar" (creador, `Pending`) · "Rechazar" (invitado, `Pending`) · sin cuenta y `Pending`: "Conecta tu wallet para cancelar la partida si es tuya o rechazarla si te invitaron" |
| Éxitos del detalle | "Partida cancelada: se devolvieron `<r>` SUI a tu cuenta" · "Invitación rechazada: se devolvieron `<r>` SUI a quien te invitó" |
| M-2 (`role="alert"`) | "La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar" · "Los límites de apuesta cambiaron (mínimo 0.001 → 0.05 SUI, máximo 50 → 50 SUI); revisa y vuelve a confirmar" |
| Abort `game`/4 | "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)" |

- **Montos de referencia** (`formatMist`, `formatBps`, `resolutionAmounts` con 250 bps): 0.01 SUI ⇒ pozo 0.02, comisión
  0.0005, al ganador 0.0195; 0.02 ⇒ 0.04 / 0.001 / 0.039; 0.03 ⇒ 0.06 / 0.0015 / 0.0585. Límites por defecto de la House:
  1000000 / 50000000000 MIST (0.001 / 50 SUI).
- **Costo de red** = `computationCost + storageCost − storageRebate` del `gasUsed` de `suic tx-block <digest> --json`; el
  saldo de quien firma cambia en `−(apuesta + costo)` al crear y en `+(reembolso − costo)` al cancelar.
- **Consistencia eventual:** tras cada transacción de la CLI, esperar a que `suic tx-block <digest> --json` muestre
  `checkpoint` antes de leer en el navegador (se anota; no es falla).

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`; línea base `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173`, `:4173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | línea base anotada; sin `localnet.json` previo (si existe: se detiene); 7 puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (§3 paso 4, `sui.pid`); `PRE suic chain-identifier` (reintentar si el primer checkpoint aún no está indexado; se anota); `suic addresses --json` ⇒ `ADMIN`, `A`, `B` en `ids.env` (§3 paso 5) | red arriba; `active-env` = `localnet`; chain id corto anotado | | ⏳ |
| 2 | DEV: publicación **variante B**: `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`; `PKG` (`packageId`), `HOUSE` (`houseId`), `CAP` (`houseCapId`) del JSON a `ids.env`; luego `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-02.json"` | publicación exit 0; `localnet.json` con `schemaVersion` 1 y `network` `localnet`; `git check-ignore -v` lo ignora; `Move.lock` sin delta; `update_fee_rate` `success` con `FeeRateUpdated` 0 → 250 | | ⏳ |
| 3 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; `curl -sf http://127.0.0.1:5173/`. Chrome en segundo plano con `chrome.env` (`chrome.pid`); `curl -sf http://127.0.0.1:9229/json/version`. Pestaña `T1` con `Target.createTarget` en `http://127.0.0.1:5173/` y `Network.enable` | 200 con `<div id="root">`; CDP responde solo en 127.0.0.1 | | ⏳ |
| 4 | 🌐 `T1` sin wallet: portada | badge `localnet · nodo OK`; sección "Crear partida" con "Conecta tu wallet para crear una partida" y los campos y el botón deshabilitados (`fieldset[disabled]`); lobby "No hay partidas abiertas"; botón del kit "Conectar wallet"; consola sin errores de CORS | | ⏳ |
| 5 | 🌐 `T1`: conectar la burner (click en el `internal-button` del shadow DOM del kit ⇒ modal "Connect a wallet" ⇒ "Unsafe Burner Wallet", como el paso 13 de #10) ⇒ `.account-badge`; su `title` = `X` a `ids.env`. Escribir `0.01` en "Apuesta (SUI)" | formulario con "Mínimo 0.001 SUI · máximo 50 SUI", "Comisión 2.5 % (la partida guarda esta comisión)", "Saldo: 0 SUI", la nota del depósito (texto exacto de la tabla); con `0.01`: "Saldo insuficiente: necesitas la apuesta más ≈ 0.01 SUI para el gas" y "Crear partida" deshabilitado | | ⏳ |
| 6 | DEV: fondear `X` desde una cuenta de la génesis: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$X --json > "$SMOKE_DIR/tx-06.json"`; esperar el `checkpoint`. 🌐 `T1`: `location.hash = '#/nada'` y después `'#/'` (remonta el formulario, sin recargar) | `success`; `PRE suic balance $X` = 2 SUI; 🌐 "Saldo: 2 SUI"; `.account-badge` sigue con `X` (no hubo recarga) | | ⏳ |
| 7 | 🌐 `T1`, validaciones sin red: (a) `0.0001`; (b) `51`; (c) `abc`; (d) `1.0000000001`; (e) `0.01` + invitación a `X` en **mayúsculas** (`0X…`); (f) `0.01` + invitación `0x123zz`; (g) `0.01` sin invitación. Contar pedidos durante el paso | (a) "La apuesta mínima es 0.001 SUI"; (b) "La apuesta máxima es 50 SUI"; (c) "Monto inválido: solo números y punto decimal, sin espacios ni separador de miles"; (d) "Como máximo 9 decimales"; (e) "No puedes invitarte a ti mismo"; (f) "Dirección inválida"; (a)-(f) con "Crear partida" deshabilitado; (g) sin errores, botón habilitado y "Si alguien acepta: pozo 0.02 SUI · comisión 0.0005 SUI · al ganador 0.0195 SUI". **Cero** `SimulateTransaction` y `ExecuteTransaction` | | ⏳ |
| 8 | 🌐 `T1`: `MutationObserver` de latencia; crear abierta de `0.01` ("Crear partida"). DEV: con el digest (`title` del `<code>`), `PRE suic tx-block <digest> --json` y `PRE suic balance $X` | etapas en orden: "Verificando la transacción…" → "Esperando la firma en la wallet…" → "Confirmando en la red…" → "Actualizando datos…"; durante "Actualizando datos…", con el lobby montado, un `ListEvents` (reinicio del lobby) y un `GetBalance` (invalidación, DL-6); luego navega a `#/game/<G1>` (ID a `ids.env`): aviso "Partida creada" + "Transacción … · Costo de red: `<X>` SUI (incluye el depósito de almacenamiento, que no se recupera)", **sin** "La partida se creó con comisión…" (M-2: `fee_rate` del evento = el mostrado) y **sin** el texto de compartir; detalle "Abierta", creador `X` abreviado, Oponente "abierta", Apuesta "0.01 SUI", Comisión "2.5 %", "Pozo 0.02 SUI · comisión 0.0005 SUI · al ganador 0.0195 SUI"; botón "Cancelar" visible, "Rechazar" no. CDP: **2** `SimulateTransaction`, **1** `ExecuteTransaction`. DEV: `success`, `GameCreated` `bet` 10000000, `fee_rate` 250, creador = `X`, `opponent` `null`; costo de red del `gasUsed` = el del aviso; saldo = 2 SUI − 0.01 − costo. Latencias anotadas | | ⏳ |
| 9 | 🌐 `T1`: `location.hash = '#/'` | lobby con `G1`: "0.01 SUI · comisión 2.5 % · creada por `<X abreviado>` (tuya) · `<hora>` · Ver partida"; el formulario vacío y sin aviso (estado nuevo); "Saldo" = el del paso 8 | | ⏳ |
| 10 | 🌐 `T1`: crear invitación de `0.02` a `B` (dirección de `ids.env`) con latencias. DEV: `tx-block` | navega a `#/game/<G2>`: "Partida creada", costo de red y "Comparte el enlace de esta página con el invitado; guárdalo para volver a esta partida"; Estado "Invitación a `<B abreviado>`", Oponente `B` abreviado, "Pozo 0.04 SUI · comisión 0.001 SUI · al ganador 0.039 SUI"; "Cancelar" visible (creador), "Rechazar" no. DEV: `GameCreated` con `opponent` = `B`, `bet` 20000000. 🌐 `#/` ⇒ `G2` **no** está en el lobby | | ⏳ |
| 11 | 🌐 `T1`: `location.hash = '#/game/<G1>'`; con latencias, click en "Cancelar". DEV: `tx-block` y `balance` | etapas en orden; "Partida cancelada: se devolvieron 0.01 SUI a tu cuenta" + "Transacción … · Costo de red: …"; durante "Actualizando datos…", una lectura del objeto (`GetObject`/`BatchGetObjects`) y el detalle pasa a "Cancelada" **sin** esperar el intervalo de 15 s; el botón "Cancelar" desaparece y el aviso sigue a la vista. DEV: `GameCancelled` `refund` 10000000, `cancelled_by` = `X`; saldo de `X` = antes + 0.01 − costo. 🌐 `#/` ⇒ `G1` ya no está en el lobby | | ⏳ |
| 12 | 🌐 `T1`: `location.hash = '#/game/<G2>'`; **M-1:** en **un solo** `Runtime.evaluate`, `const b = <botón "Cancelar">; b.click(); b.click();` (sin `await` entre ellos). Contar pedidos hasta el éxito | **1** `ExecuteTransaction` y **2** `SimulateTransaction` (no 2 y 4). Si el 2.º `click()` encuentra el botón ya deshabilitado (React vuelve a renderizar al terminar el evento del 1.º), se anota: lo frenó el `disabled` y el candado síncrono (M-1) lo prueba el test de dos `execute` en el mismo tick de TASK-4; el resultado que cuenta es una sola ejecución; un solo aviso "Partida cancelada: se devolvieron 0.02 SUI a tu cuenta"; estado "Cancelada". DEV: un solo `GameCancelled` para `G2` (`refund` 20000000) | | ⏳ |
| 13 | 🌐 `T1`: `#/` y crear abierta de `0.01` (`G3`, a `ids.env`). 🌐 Pestaña `T2` (`Target.createTarget` en `http://127.0.0.1:5173/#/game/<G3>`, `Network.enable`) **antes** de conectar: el kit intenta reconectar con la sesión guardada por `T1` (mismo origen); si queda desconectado, se sigue; si se conecta solo a una burner nueva, se anota y se desconecta ("Disconnect all") antes de comprobar el estado sin cuenta. Después conectar la burner en `T2` ⇒ `Y` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[1000000000]" --assign c --transfer-objects "[c]" @$Y --json` | `T2` sin cuenta: detalle "Abierta" con "Conecta tu wallet para cancelar la partida si es tuya o rechazarla si te invitaron" y **sin** botones; con `Y` conectada: **ni** "Cancelar" (no es el creador) **ni** "Rechazar" (partida abierta); `Y` ≠ `X`; fondeo `success`, `suic balance $Y` = 1 SUI | | ⏳ |
| 14 | DEV: el contrato también lo valida: `PRE act_as "$B" && suic call --package "$PKG" --module game --function cancel_game --args "$G3" --gas-budget 100000000 --json > "$SMOKE_DIR/tx-14.json"` (con `--gas-budget` la CLI ejecuta sin dry run). 🌐 `T1`: `#/game/<G3>` | fallo **ejecutado**: `effects.status` `failure` con `MoveAbort(… name: Identifier("game") …, function_name: Some("cancel_game") }, 3)` (ENotCreator), `B` solo paga gas; 🌐 `G3` sigue "Abierta" con "Cancelar" para `X`; "Última actividad" = hora del fallo (sonda P6 de #10) | | ⏳ |
| 15 | 🌐 **M-2** en `T1`: `#/`; con el formulario mostrando "Comisión 2.5 %", escribir `0.01` (sin enviar). DEV: `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 300 --json`. 🌐 "Crear partida" (sin cambiar de pestaña ni de foco). Luego DEV: `… --function update_bet_limits --args "$HOUSE" "$CAP" 50000000 50000000000 --json`; 🌐 "Crear partida" otra vez. Al final, DEV restaura: `update_fee_rate` 250 y `update_bet_limits` 1000000 50000000000; 🌐 `#/nada` y `#/` | (a) alert "La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar", **cero** `SimulateTransaction`/`ExecuteTransaction` (solo la relectura de la House); el formulario pasa a "Comisión 3 % …" con `0.01` todavía escrito. (b) alert "Los límites de apuesta cambiaron (mínimo 0.001 → 0.05 SUI, máximo 50 → 50 SUI); revisa y vuelve a confirmar", cero simulaciones/ejecuciones; el formulario pasa a "Mínimo 0.05 SUI · máximo 50 SUI" y marca `0.01` con "La apuesta mínima es 0.05 SUI" (sin red). (c) tras restaurar y remontar: "Comisión 2.5 %" y "Mínimo 0.001 SUI". Saldo de `X` sin cambios en (a) y (b) | | ⏳ |
| 16 | 🌐 **Rechazar (D-20261102-05):** `T1` crea invitación de `0.03` a `Y` (`G4`) con latencias. `T2`: `location.hash = '#/game/<G4>'`. `T1` en `#/game/<G4>`. `T2`: click en "Rechazar" (latencias en `T2`). DEV: `tx-block` y saldos | `T2`: Estado "Invitación a `<Y abreviado>`", "Rechazar" visible y **sin** "Cancelar"; `T1`: "Cancelar" visible y **sin** "Rechazar". Tras el click: etapas en orden y "Invitación rechazada: se devolvieron 0.03 SUI a quien te invitó"; Estado "Cancelada". DEV: `GameCancelled` `cancelled_by` = `Y`, `creator` = `X`, `refund` 30000000; saldo de `X` + 0.03; saldo de `Y` − costo de red | | ⏳ |
| 17 | 🌐 **Abort real con mensaje mapeado (carrera):** `T1` crea invitación de `0.01` a `Y` (`G5`). `T2`: `location.hash = '#/game/<G5>'` ("Rechazar" visible). `T1`: `#/game/<G5>` y "Cancelar" ⇒ éxito. **Inmediatamente**, en `T2` y solo por `Runtime.evaluate` (sin `Page.bringToFront` ni cambio de pestaña activa: el foco dispara el refetch del detalle y cierra la ventana): leer el DOM (¿sigue "Invitación a" con "Rechazar"?) y, si sigue, `click()` en "Rechazar". Si el detalle de `T2` ya se refrescó (intervalo de 15 s), repetir con otra invitación y anotarlo | `T2`: "Verificando la transacción…" ⇒ alert "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)"; **1** `SimulateTransaction` (la preflight) y **ningún** `ExecuteTransaction` (la wallet no se abre); saldo de `Y` sin cambios; el detalle de `T2` pasa a "Cancelada" y "Rechazar" desaparece (invalidación tras el abort) | | ⏳ |
| 18 | 🌐 **Sin confirmar y bloqueo del formulario** (pedido del MID revisor): en `T1`, `Fetch.enable` con `patterns: [{ urlPattern: '*LedgerService/GetTransaction*', requestStage: 'Request' }]` y, en cada `Fetch.requestPaused`, `Fetch.failRequest` con `errorReason: 'ConnectionFailed'` (la ejecución no se toca; solo falla la confirmación). `#/`, crear abierta de `0.01` (`G6`) y esperar ≈ 30 s (`TX_CONFIRM_TIMEOUT_MS`). Con el alert a la vista: comprobar el botón "Crear partida" con un monto válido. `Fetch.disable`. DEV: `tx-block` del digest del alert (`title` del `<code>`). 🌐 "Ya la revisé: crear otra partida" | etapas hasta "Confirmando en la red…"; **1** `ExecuteTransaction`; los `GetTransaction` fallan (`net::ERR_CONNECTION_FAILED`); a los ≈ 30 s, alert "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar" + "Transacción …", **sin** "Reintentar" y sin navegar; "Crear partida" **deshabilitado** con `0.01` válido; botón "Ya la revisé: crear otra partida" visible. DEV: la transacción **sí** se ejecutó (`success`, `GameCreated`): el "sin confirmar" fue honesto. Tras "Ya la revisé…": el alert desaparece y "Crear partida" vuelve a habilitarse. **Si `Fetch` no intercepta los pedidos gRPC-web** (la confirmación llega igual), se anota "no provocable en este smoke" y queda cubierto por `CreateGameForm.test.tsx` (bloqueo tras `unconfirmed`, hallazgo 1 de TASK-5) y los tests de `useExecuteTransaction` (M-3 (b)). Mientras `Fetch` está activo, las horas de las filas del lobby (`GetTransaction`) pueden quedar en "—": se anota, no es falla (la hora de la publicación ya está en caché) | | ⏳ |
| 19 | DEV: `kill "$(cat <SMOKE_DIR>/sui.pid)"` (exit 144 esperado) y `kill` de `vite` por PID (`kill -0` falla en ambos); `rm -f <repo>/contracts/deployments/localnet.json` (pertenece a la génesis ya detenida; el glob de `config.ts` es `eager` y entraría al build); `. <SMOKE_DIR>/app.env && cd "$REPO" && VITE_SUI_NETWORK=testnet npm run build -w app`; `preview` en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/preview.pid" && exec "$NODE" "$VITE_JS" preview --host 127.0.0.1 --port 4173 --strictPort > "$SMOKE_DIR/preview.log" 2>&1`. 🌐 pestaña nueva en `http://127.0.0.1:4173/` con `Network.enable` | build exit 0 (anotar el tamaño de `index-*.js`, ≈ 878 kB); sin `contracts/deployments/testnet.json` (#8 sin mergear): alert **"La app no está configurada"** + "Falta contracts/deployments/testnet.json: … en testnet lo publica #8"; **ningún** pedido a `:9000` ni a `fullnode`; sin `ConnectButton` ni textos de la burner | | ⏳ |
| 20 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill` de `preview` y de Chrome por PID; `kill -0` falla en `sui`, `vite`, `preview` y Chrome; ningún proceso con el perfil desechable; puertos 9000, 9123, 9184, 5003, 5173, 4173 y 9229 libres; `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true` y `test ! -e <repo>/contracts/deployments/localnet.json`; **antes** del `rm -rf <SMOKE_DIR>`, `grep -c "<packageId sin 0x, de ids.env>" <repo>/app/dist/assets/*.js` ⇒ 0 en todos; `rm -rf <SMOKE_DIR>` (perfil de Chrome incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; sin `contracts/Pub.*.toml` ni `contracts/Published.toml`; `git status --porcelain` = solo `documents/SMOKE_CREATE_CANCEL.md` | todo limpio | | ⏳ |

## Qué no cubre este smoke (y dónde está cubierto)

- **Fallo ejecutado mapeado en la UI** (el abort llega por los efectos): la preflight y el `build` de la burner lo atrapan
  antes; solo pasa en una carrera entre la preflight y la ejecución. Fixture real `executed.cancelNotCreatorExecuted` de
  TASK-1 + tests de `errors.ts` (TASK-2) y de `useExecuteTransaction` (nodo con `success: false` ⇒ `failure` con digest
  y costo). El paso 14 muestra el mismo abort ejecutado por CLI.
- **Error de la wallet con digest**, **error de red en la preflight** ("No se pudo verificar la transacción (red); intenta
  de nuevo"), **"No se pudo preparar la transacción: …"** e **indexación que no llega** ("La lista puede tardar unos
  segundos en mostrarlo"): tests de TASK-2/4/5 (en localnet, `waitForTransaction` vuelve ya con `checkpoint`, S-1 bis).
- **"No se pudo identificar la partida creada…"**: tests de `CreateGameForm` (DL-9).
- **"La partida se creó con comisión …"** (cambio entre la relectura y la ejecución): tests de `useCreateGame` y del
  detalle; el paso 8 verifica el caso normal (sin aviso).
- **Wallets de extensión y testnet:** #17 (owner); los textos de error de una extensión real no se pueden probar aquí (R-1
  del plan).
- **Latencia en testnet de `confirming → done`:** este smoke la mide en localnet; si en testnet supera ≈ 3 s, se invalida
  sin esperar la relectura (condición de la revisión de TASK-4; queda para #17).

## Si algo falla

- Capturar: número de paso, digest y `suic tx-block <digest>` (sin `sender`/`owner` ni salida cruda del script), DOM o
  texto relevante, `window.__txLog` y `Network.*`/consola del navegador para los pasos 🌐.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 20) se ejecuta igual.
- Una recarga accidental de una pestaña cambia su burner: se anota, se reconecta y se vuelve a fondear; no es falla del
  producto.

## Reporte final

- Pasos PASA/TOTAL: (se llena al terminar; 21 pasos, 0-20)
- Latencias (localnet, ms):

| Acción (paso) | preflight → signing | signing → confirming | confirming → done |
|---|---|---|---|
| Crear abierta (8) | | | |
| Crear invitación (10) | | | |
| Cancelar (11) | | | |
| Rechazar (16) | | | |

- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]
