# SMOKE_HOUSE_ADMIN
> Plan: PLAN_HOUSE_ADMIN v1.1 | Handoff: HANDOFF_HOUSE_ADMIN v1.4 | Issue: #14 | Fecha: 2026-11-04 |
> Estado: EN CURSO
> (las columnas "Resultado obtenido" y "Estado" se llenan **durante** la corrida, nunca por adelantado; v1.4: corre
> después de TASK-5 y antes de TASK-6)

## Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-14-house-admin` con TASK-1..5 commiteadas (v1.4); `npm ci` con Node 26; gate de
  la app en verde (reporte de TASK-5). Nada de esta corrida se commitea salvo `documents/SMOKE_HOUSE_ADMIN.md`. Sin
  `contracts/Published.toml` ni `contracts/Pub.*.toml` (si aparecen durante la corrida, se detiene y se avisa).
- **Red:** localnet **aislada** (`agents.md` §3), `env.sh` + `ids.env` + `smoke_guard`, publicación **variante B**, cierre
  del paso 7. **Una sola localnet** (`ss -ltn` sin `:9000`). **Regla B4:** todo `suic` lleva `PRE` **escrito** en su fila
  (`PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), también los de
  solo lectura.
- **Testnet:** nada.
- **Cuentas:**
  - de la génesis, en `ids.env` (no se pegan): `ADMIN` (publica y tiene el cap hasta el paso 6), `A` (fondea a `W` y crea
    partidas) y `B` (acepta). Tres cuentas distintas;
  - wallets de la app: burner `W` en `T1` (recibe el cap), fondeada con 2 SUI por CLI desde `A`, y burner `W2` en `T2`
    (sin cap), **sin fondos**: el paso 17 solo conecta y mira (SUGGESTION-5 de v1.1);
  - nunca `new-address`; nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Archivos de entorno** (rutas literales en el archivo real; aquí placeholders), **nunca dos en la misma llamada**:
  - `env.sh` (solo `sui`/`suic`, el de `agents.md` §3);
  - `app.env`: el de `HANDOFF_HOUSE_ADMIN.md`, TASK-1 §3.2, más `VITE_JS`: **primera línea, la guarda** (SUGGESTION-1 de #13)
    `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL; return 97; }`, y después `SMOKE_DIR`, `REPO`, `NODE`, `VITE_JS` y
    `PATH` de Node 26, todo con rutas literales; no toca `HOME` ni `SUI_CONFIG_DIR`. Un `APPENV-FAIL` detiene el smoke;
  - `chrome.env`: `SMOKE_DIR` (ruta literal, SUGGESTION-1 de v1.1), `CHROME` (ruta literal del binario) y
    `HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME`/`XDG_DATA_HOME` dentro de `<SMOKE_DIR>/chrome-home`;
  - procesos en segundo plano del harness con `exec` y el PID en `<SMOKE_DIR>`: `sui.pid`, `vite.pid`, `chrome.pid` y,
    si el cliente CDP corre como demonio, `cdp.pid` (`sui start` sale con 144 ante SIGTERM y `vite` con 143: esperados).
- **Navegador (🌐):**
  - **Arranque literal** de Chrome, como comando en segundo plano del harness:
    ```sh
    . <SMOKE_DIR>/chrome.env && echo $$ > "$SMOKE_DIR/chrome.pid" && exec "$CHROME" --headless=new --no-first-run \
      --no-default-browser-check --user-data-dir=<SMOKE_DIR>/chrome-profile --remote-debugging-address=127.0.0.1 \
      --remote-debugging-port=9229 about:blank > "$SMOKE_DIR/chrome.log" 2>&1
    ```
    Perfil propio en `<SMOKE_DIR>/chrome-profile`; nunca el Chrome ni el perfil del usuario, que puede estar abierto en la
    máquina. Cierre **solo** con `kill "$(cat <SMOKE_DIR>/chrome.pid)"`, nunca `pkill`/`killall`; verificación con
    `pgrep -af <SMOKE_DIR>/chrome-profile` vacío. Si no da vacío, se matan **solo** los PIDs que lista (todos llevan el
    perfil en su línea de comandos) y se vuelve a verificar; nunca por nombre (SUGGESTION-4 de v1.1);
  - cliente CDP propio en Node 26 sin dependencias (`fetch` + `WebSocket`), en `<SMOKE_DIR>` (no se commitea), contra
    `127.0.0.1:9229`; una sesión por pestaña con `Target.attachToTarget` y `Network.enable`. **Si corre como demonio**
    (como en #13; MINOR-4 de v1.1): comando en segundo plano del harness con `app.env` y `exec`, PID en `cdp.pid`,
    escuchando solo en `127.0.0.1:9339`:
    `. <SMOKE_DIR>/app.env && echo $$ > "$SMOKE_DIR/cdp.pid" && exec "$NODE" "$SMOKE_DIR/cdp.mjs" --port 9339 >
    "$SMOKE_DIR/cdp.log" 2>&1`. Se cierra por PID en el paso 20 y `:9339` entra en `ss -ltn` de los pasos 0 y 20;
  - **cada pestaña con `Target.createTarget({ url, newWindow: true })`**, todas visibles (`document.visibilityState ===
    'visible'`), **nunca** `Page.bringToFront`;
  - después de fondear una burner se navega **solo por hash** (`location.hash`): recargar cambia su dirección, y la de
    `W` tendría el cap en una clave perdida (si pasa, génesis nueva o fin de la corrida);
  - campos con foco y **todo el contenido seleccionado** (`el.focus(); el.select()`, v1.4: los campos del panel arrancan
    con los valores actuales) + `Input.insertText`, que reemplaza la selección; clics con `element.click()` en
    `Runtime.evaluate`;
  - los conteos de `ListOwnedObjects` son informativos: el encabezado y el panel observan la consulta del cap y cada uno
    puede releer al montarse (v1.4).
- **Pedidos en CDP** (`Network.requestWillBeSent`) por sesión: se cuentan **solo los `POST` de gRPC-web**
  (`request.method === 'POST'`; los `OPTIONS` del preflight CORS no cuentan, SUGGESTION-3 de #13), por método según la
  ruta: `StateService/ListOwnedObjects`, `LedgerService/GetObject`, `LedgerService/BatchGetObjects`,
  `TransactionExecutionService/SimulateTransaction`, `TransactionExecutionService/ExecuteTransaction`,
  `LedgerService/GetTransaction` (el `getObject` del SDK, también el del `precheck`, sale como `BatchGetObjects`). Por
  acción con burner: **2** `SimulateTransaction` + **1** `ExecuteTransaction`. Las
  lecturas `net::ERR_ABORTED` del doble montaje de `StrictMode` no cuentan (se anotan).
- **Observador:** antes de cada acción, `Runtime.evaluate` instala un `MutationObserver` que guarda en `window.__txLog`
  `[performance.now(), selector, texto]` de `[data-house-action] .tx-status` y de `section.house-admin [role="status"]`.
- **Registro del candado (MINOR-3 de v1.1; pasos 9 y 16):** en el **mismo** `Runtime.evaluate` del clic, **antes** del
  `click()`, se instala `window.__lockLog = []` y un `setInterval` de 250 ms que agrega `[performance.now(), { fee, limits,
  withdraw }` (el `disabled` del botón de cada `[data-house-action]`)`, inFlight` (si `section.house-admin` contiene
  `IN_FLIGHT_TEXT`)`, stage` (el texto de `.tx-status` del bloque de la acción, o `null`)`]`; el intervalo se corta
  (`clearInterval`) cuando aparece el texto de resultado o a los 30 s. La primera muestra se toma en el mismo tick del
  clic.
- **Tokens de resultado (H-6, SEG-10, mayúsculas exactas):** "Comisión actualizada", "Límites actualizados",
  "Retiraste". Ninguno puede aparecer mientras se vean "Verificando la transacción…", "Esperando la firma en la wallet…",
  "Confirmando en la red…" o "Actualizando datos…".
- **Textos y selectores esperados:** `HANDOFF_HOUSE_ADMIN.md` §1. **Montos de referencia:** partida de 0,2 SUI con 250 bps ⇒ pozo 0,4, comisión
  0,01 (10000000 MIST), al ganador 0,39; con 0 bps ⇒ comisión 0.
- **Lo que este smoke no puede ejercitar:** el `precheck` de "cap transferido" (H-3). Para que `W` pierda el cap habría
  que firmar como ella por CLI, y eso está prohibido. Lo cubren T4-6..T4-9 y S-5 de TASK-1.
- **Qué se pega:** IDs y direcciones abreviados o por rol; digests completos; nunca `sender`/`owner`, archivos de
  `<SMOKE_DIR>/net` ni logs completos. Antes de entregar: grep de claves, rutas personales y hex de 40-64 sobre el SMOKE,
  vacío.

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (`agents.md` §3 paso 2) + `app.env` (guarda en la primera línea) + `chrome.env` (los dos con `SMOKE_DIR`). Línea base: `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173`, `:9229` ni `:9339`; ningún `sui start` de otra sesión; `git status --porcelain` | Línea base anotada; nada de lo anterior existe; 7 puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (`sui.pid`); `PRE suic chain-identifier`; `PRE suic addresses --json` ⇒ `ADMIN`, `A`, `B` a `ids.env`; publicación variante B (`PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`); `PKG`, `HOUSE`, `HOUSE_CAP` a `ids.env` desde `localnet.json` (sin Node en esa llamada); `PRE suic object "$HOUSE_CAP" --json` y `PRE suic object "$HOUSE" --json` | Red arriba; `active-env` = `localnet`; exit 0; `Move.lock` sin delta; dueño del cap = `ADMIN` (por rol); House con `fee_rate` 0, 1000000 / 50000000000, `fees_collected` 0, `version` 1 | | ⏳ |
| 2 | DEV: `vite` dev en segundo plano (`. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`) y, en otra llamada en segundo plano, Chrome con la línea literal de las precondiciones; `curl -sf http://127.0.0.1:5173/`; `curl -sf http://127.0.0.1:9229/json/version`. 🌐 `T0` sin conectar (`newWindow`) en `#/admin` | 200 con `<div id="root">`; CDP solo en 127.0.0.1; `T0`: "Conecta la wallet que tiene el HouseCap para administrar la House"; **0** `ListOwnedObjects` (POST) en `T0`; sin enlace "Administrar House" | | ⏳ |
| 3 | 🌐 `T1` (`newWindow`, `Network.enable`); conectar la burner `W`; dirección del `title` de `.account-badge` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$W`; 🌐 `#/nada` → `#/` | `visibilityState === 'visible'`; saldo 2 SUI en el formulario; misma dirección (sin recarga); sin enlace "Administrar House"; **≥ 1** `ListOwnedObjects` (POST) por la detección del encabezado, anotado (el refetch al foco puede sumar uno; SUGGESTION-2 de v1.1) | | ⏳ |
| 4 | 🌐 `T1`: `location.hash = '#/admin'` | `.house-no-permission` con "Sin permisos: esta cuenta no tiene el HouseCap de esta House." y "Volver a comprobar"; sin `.house-config` ni `[data-house-action]` (P-1) | | ⏳ |
| 5 | DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json` (`G0`, ID a `ids.env`); `PRE suic object "$G0" --json` | `G0.fee_rate` = 0 (comisión vigente al crearla) | | ⏳ |
| 6 | DEV: `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function transfer_house_cap --args "$HOUSE_CAP" "$W" --json`; `PRE suic object "$HOUSE_CAP" --json` | Evento `HouseCapTransferred` con `recipient` = `W` (por rol); dueño del cap = `W` | | ⏳ |
| 7 | 🌐 `T1`: `location.hash = '#/'` y luego `'#/admin'`; si sigue "Sin permisos" (atraso del índice, S-2), "Volver a comprobar" hasta 3 veces con 1 s entre clics | Aparece "Administrar House" en el encabezado; `.house-config`: "0 bps (0 %)", mínimo 0.001 SUI, máximo 50 SUI, acumulado 0 SUI, versión 1; retiro deshabilitado con "No hay comisiones para retirar."; se anota cuántos "Volver a comprobar" hicieron falta | | ⏳ |
| 8 | 🌐 `T1`: comisión `1001`, `abc`, `-1`, `2.5` y `0` (uno por vez) | Cada uno con su texto de `HANDOFF_HOUSE_ADMIN.md` §1 (`too_high`, `invalid` ×3, `unchanged`) y "Actualizar comisión" deshabilitado; **0** `SimulateTransaction` | | ⏳ |
| 9 | 🌐 `T1`: observador; comisión `250` ⇒ resumen; en un mismo `Runtime.evaluate`, el registro del candado y el clic en "Actualizar comisión"; al terminar, leer `window.__lockLog`. DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json`; `PRE suic object "$G0" --json` | Resumen "De 0 bps (0 %) a 250 bps (2.5 %)" antes del clic; etapas en orden; **ningún token** durante las etapas (H-6); después "Comisión actualizada: de 0 bps (0 %) a 250 bps (2.5 %). Las partidas ya creadas conservan la suya." con el digest; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; `FeeRateUpdated` 0 → 250; House `fee_rate` 250; `G0.fee_rate` sigue 0; `.house-config` ya muestra "250 bps (2.5 %)" al terminar | | ⏳ |
| 10 | 🌐 `T1`: `window.__lockLog` del paso 9 (pegado) | En toda muestra con `stage` de una etapa en curso, `fee`, `limits` y `withdraw` en `disabled: true` e `inFlight: false` (NIT-3: la propia no se ve como ajena); al final, `limits` vuelve a habilitarse si su validación lo permite | | ⏳ |
| 11 | 🌐 `T1`: `location.hash = '#/'` | El formulario de creación muestra "Comisión 2.5 %" (la invalidación de `house` en la misma pestaña) | | ⏳ |
| 12 | 🌐 `T1`, `#/admin`: límites `0`/`10`, luego `5`/`1`, luego `-1`/`10` | `zero_min`, `min_above_max`, `negative` con sus textos; "Actualizar límites" deshabilitado; **0** `SimulateTransaction` | | ⏳ |
| 13 | 🌐 `T1`: observador; límites `0.002`/`10` ⇒ resumen; en **un mismo** `Runtime.evaluate`: clic en "Actualizar límites", `location.hash = '#/'` a los 50 ms y `'#/admin'` a los 300 ms (adopción). DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json` | Resumen "De 0.001–50 SUI a 0.002–10 SUI"; al volver, el panel muestra el resultado **adoptado** "Límites actualizados: mínimo 0.002 SUI, máximo 10 SUI (antes 0.001–50 SUI)." (o, si terminó antes de remontar, la configuración nueva sin resultado: se anota cuál pasó, ambos son correctos por `mountSnapshot`); `BetLimitsUpdated` con los cuatro montos; House 2000000 / 10000000000; ningún token durante las etapas | | ⏳ |
| 14 | DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json` (`G1`); `PRE act_as "$B" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json`; lo mismo de `B` sobre `G0`; `PRE suic object "$HOUSE" --json` | `G1.fee_rate` 250; `GameResolved` de `G1` con `fee` 10000000 y de `G0` con `fee` 0; House `fees_collected` 10000000 | | ⏳ |
| 15 | 🌐 `T1`: "Actualizar" de `.house-config`. DEV: `PRE suic balance $W` | Acumulado "0.01 SUI"; botón "Retirar 0.01 SUI a tu cuenta" habilitado; saldo de `W` anotado | | ⏳ |
| 16 | 🌐 `T1`: observador; en un mismo `Runtime.evaluate`, el registro del candado y el clic en "Retirar 0.01 SUI a tu cuenta"; al terminar, leer y pegar `window.__lockLog`. DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json`; `PRE suic balance $W` | Etapas en orden; ningún token durante las etapas; en `__lockLog`, los tres botones deshabilitados e `inFlight: false` mientras corre; "Retiraste 0.01 SUI de comisiones a tu cuenta." con digest y costo de red; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; la transacción tiene 2 comandos (`withdraw_fees` y `TransferObjects` a `W`); `FeesWithdrawn.amount` 10000000 = `fees_collected` previo; House `fees_collected` 0; saldo de `W` = anterior + 10000000 − costo de red (gas de la tx); el botón vuelve a deshabilitarse con "No hay comisiones para retirar." | | ⏳ |
| 17 | 🌐 `T2` (`newWindow`, `Network.enable`): conectar la burner `W2`; `location.hash = '#/admin'` | `visibilityState === 'visible'` en `T1` y `T2`; en `T2`, sin enlace "Administrar House" y `.house-no-permission`; en `T1`, el panel sigue con su último resultado | | ⏳ |
| 18 | DEV: `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$HOUSE_CAP" 300`; `PRE suic object "$HOUSE" --json` | La CLI falla al armar o ejecutar (el cap es de `W`); House sigue en 250: custodia verificada (SEG-2) | | ⏳ |
| 19 | 🌐 `T1`: recuento final de pedidos (POST) desde el paso 3 | Solo los métodos de las precondiciones; ningún `SimulateTransaction` fuera de las acciones de los pasos 9, 13 y 16; anotado el total de `ListOwnedObjects` | | ⏳ |
| 20 | DEV: cierre = `agents.md` §3 paso 7 más la app: `kill` por PID del cliente CDP si corre como demonio (`cdp.pid`), de Chrome (`chrome.pid`), `vite` (`vite.pid`; exit 143 esperado) y `sui` (`sui.pid`; exit 144 esperado); **en otra llamada**, `kill -0` falla en todos; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (si no, solo esos PIDs y otra verificación; el Chrome del usuario no se toca); `ss -ltn` con **9000, 9123, 9184, 5003, 5173, 9229** (depuración de Chrome) **y 9339** (cliente CDP) libres; recién entonces `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_HOUSE_ADMIN.md` | Todo limpio; `~/.sui/` sin cambios | | ⏳ |

## Qué no cubre este smoke (y dónde está cubierto)

- **Solo con tests:** el `precheck` de cap perdido (T4-6..T4-9, S-5 de TASK-1); la regla de certeza con páginas parciales
  (T2-4..T2-7); el panel que no se desmonta con una relectura fallida (T5-5, T4-4); los aborts `house`/0, 1, 2 desde la
  preflight (la UI los impide con la validación espejo: T2-16, T4-10).
- **Checklist del owner en testnet** (P-4 / D-20261104-02 (4): el orquestador la pasa como **casillas al body de #17** y
  el comentario de cierre de #14 lo dice; ningún agente la corre):
  - [ ] Tras #8, con `deployments/testnet.json` mergeado: si la dirección publicadora no es la de la wallet del navegador,
    resolver N-3. Con `transfer_house_cap` por CLI desde su `SUI_CONFIG_DIR`, verificar la dirección de destino dos veces
    (irreversible). Si piensa importar la clave publicadora en una wallet de navegador: esa dirección también tiene el
    `UpgradeCap` (va contra el sentido de D-20261102-03).
  - [ ] Abrir la app de testnet con la wallet del cap: aparece "Administrar House" y el panel muestra la comisión fijada
    en #8.
  - [ ] Cambiar la comisión (p. ej. +1 bps) y restaurarla al valor de #8; `FeeRateUpdated` en el explorador. Entre las dos
    transacciones no anunciar el juego: una partida creada en ese intervalo conserva la comisión intermedia.
  - [ ] Cambiar los límites y restaurarlos; `BetLimitsUpdated` en el explorador.
  - [ ] Tras al menos una partida resuelta con comisión: anotar `fees_collected`, retirar y comparar el `amount` del
    `FeesWithdrawn` y lo recibido con ese valor.
  - [ ] Con otra cuenta: sin enlace y "Sin permisos" en `#/admin`.

## Reporte final

- Pasos PASA/TOTAL:
- Hallazgos (n.º de paso + digest / output):
- Veredicto: [PASA | NO PASA]
