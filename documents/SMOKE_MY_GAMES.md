# SMOKE_MY_GAMES
> Plan: PLAN_MY_GAMES v2 | Handoff: HANDOFF_MY_GAMES v1.4 (smoke del ciclo) | Issue: #13 | Fecha: <día de la corrida> |
> Estado: EN CURSO
> (las columnas "Resultado obtenido" y "Estado" se llenan **durante** la corrida, nunca por adelantado)

## Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-13-my-games` con TASK-1..6 commiteadas; `npm ci` con Node 26. Gate de la
  app en verde según el último reporte de código (TASK-5 con H-6: 915 tests en 57 archivos, build de 901.45 kB). Nada de
  esta corrida se commitea salvo este archivo.
- **`Published.toml`:** esta branch **no** tiene `contracts/Published.toml` (la publicación en testnet es #8, que no está
  mergeado). La publicación de localnet escribe su `Pub.localnet.toml` en `<SMOKE_DIR>` (`--pubfile-path`). Si aparece un
  `contracts/Published.toml` o un `contracts/Pub.*.toml` en el repo durante la corrida, es un hallazgo: se detiene y se
  avisa.
- **Red:** localnet **aislada** (`agents.md` §3), con `env.sh` + `ids.env` + `smoke_guard`, publicación **variante B** y
  cierre del paso 7.
  - **Una sola localnet:** `ss -ltn` sin `:9000`.
  - **Regla B4:** todo `suic` lleva el prefijo `PRE` (= `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null ||
    true; } && smoke_guard &&`), también los de solo lectura. En la tabla va escrito en cada fila.
- **Testnet:** nada.
- **Cuentas:**
  - de la génesis, en `ids.env` (no se pegan): `ADMIN` (publica y fija la comisión), `A` (fondea las burners) y `C` (solo
    CLI: invitaciones y partidas en lote). Son tres cuentas distintas;
  - wallets de la app: **dos burners**, `AW` en `T1` y `BW` en `T2`, fondeadas con 2 SUI cada una por CLI desde `A`;
  - nunca `new-address`; nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Navegador (🌐):** el Chrome del usuario está abierto en la máquina. El smoke usa **su propio** Chrome headless, con
  perfil y `HOME` desechables, y solo mata **su** PID.
  - **Arranque**, literal, como comando en segundo plano del harness con `exec` y el PID en `<SMOKE_DIR>/chrome.pid`:
    ```sh
    . <SMOKE_DIR>/chrome.env && echo $$ > "$SMOKE_DIR/chrome.pid" && exec "$CHROME" --headless=new --no-first-run \
      --no-default-browser-check --user-data-dir=<SMOKE_DIR>/chrome-profile --remote-debugging-address=127.0.0.1 \
      --remote-debugging-port=9229 about:blank > "$SMOKE_DIR/chrome.log" 2>&1
    ```
    `chrome.env` exporta `CHROME` (ruta literal del binario) y `HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME`/`XDG_DATA_HOME`
    dentro de `<SMOKE_DIR>/chrome-home`. Nunca el perfil ni el `HOME` del usuario.
  - **Cierre:** solo `kill "$(cat <SMOKE_DIR>/chrome.pid)"`, nunca `pkill`/`killall`. La verificación es
    `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (no mira otros Chrome).
  - **Cliente CDP** propio en Node 26, sin dependencias (`fetch` + `WebSocket`), en `<SMOKE_DIR>` (no se commitea); una
    sesión por pestaña con `Target.attachToTarget` y `Network.enable`.
  - **Cada pestaña con `Target.createTarget({ url, newWindow: true })`**, todas visibles (`document.visibilityState ===
    'visible'`), **nunca** `Page.bringToFront`.
  - Después de fondear una burner se navega solo por hash (`location.hash`): recargar cambia su dirección (salvo en el
    paso 17, que lo hace a propósito).
  - Campos con foco + `Input.insertText`; clics con `element.click()` en `Runtime.evaluate`.
- **Archivos de entorno** (rutas literales en el archivo real; aquí placeholders):
  - `env.sh` (solo `sui`/`suic`), `app.env` (`NODE`, `VITE_JS`, `PATH` de Node 26; no toca `HOME` ni `SUI_CONFIG_DIR`) y
    `chrome.env`, nunca dos en la misma llamada;
  - procesos en segundo plano del harness con `exec` y el PID en `<SMOKE_DIR>`: `sui.pid`, `vite.pid` y `chrome.pid`.
    `sui start` sale con 144 ante SIGTERM y `vite` con 143 (esperados).
- **Pedidos en CDP** por sesión (`Network.requestWillBeSent`), por método gRPC-web: `ListEvents`, `BatchGetObjects`,
  `GetServiceInfo`, `SimulateTransaction`, `ExecuteTransaction`, `GetTransaction`.
  - Por acción con burner: **2** `SimulateTransaction` + **1** `ExecuteTransaction`.
  - Las lecturas `net::ERR_ABORTED` del doble montaje de `StrictMode` no cuentan (se anotan).
  - CDP no distingue la fuente de un `ListEvents` (actividad o invitaciones) sin decodificar el cuerpo: se cuentan
    totales.
- **Observador:** antes de cada acción, `Runtime.evaluate` instala un `MutationObserver` que guarda en `window.__txLog`
  `[performance.now(), selector, texto]` de `.tx-status` y `.game-actions` de la fila, y aparte de `.my-game-result`.
- **Tokens de resultado (SEG-10, con mayúsculas exactas):** "Ganaste", "Perdiste", "Recibiste", "ganó quien".
  - Ninguno puede aparecer en `.tx-status`/`.game-actions` mientras se vean "Verificando la transacción…", "Esperando la
    firma en la wallet…" o "Confirmando en la red…".
  - `.my-game-result` ("Terminadas") es una lectura del nodo y está permitida.
- **Textos y selectores esperados:** `HANDOFF_MY_GAMES` §1 ("Textos fijos", "Selectores estables"):
  `section.my-games`, `section.my-games-section[data-section="invitations" | "pending" | "finished"]`,
  `li.my-game-row[data-game-id="<id normalizado>"]`, `.my-game-result`, `.game-actions`, `.tx-status`.
- **Montos de referencia** (comisión 250 bps):
  - 0,2 SUI ⇒ pozo 0,4, comisión 0,01, al ganador 0,39;
  - 0,001 SUI ⇒ pozo 0,002, comisión 0,00005, al ganador 0,00195.
- **Qué se pega:** IDs y direcciones abreviados (`0x1234…abcd`) o por rol; digests completos; nunca `sender`/`owner`,
  archivos de `<SMOKE_DIR>/net` ni logs completos. Antes de entregar: grep de claves, rutas personales y hex de 40-64
  sobre este archivo, vacío.

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`. Línea base: `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | Línea base anotada; sin `localnet.json`, `Published.toml` ni `Pub.*.toml` (si existe alguno, se detiene y se avisa); 6 puertos libres; árbol limpio (salvo este archivo) | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (`sui.pid`); `PRE suic chain-identifier`; `PRE suic addresses --json` ⇒ `ADMIN`, `A`, `C` a `ids.env`; publicación variante B: `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`; `PKG`, `HOUSE`, `CAP` a `ids.env`; `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250` | Red arriba; `active-env` = `localnet`; publicación exit 0; `contracts/deployments/localnet.json` ignorado por git; `Move.lock` sin delta; sin `contracts/Published.toml`; `FeeRateUpdated` 0 → 250 | | ⏳ |
| 2 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`. En otra llamada en segundo plano, Chrome con la línea literal de las precondiciones (`chrome.pid`). `curl -sf http://127.0.0.1:5173/`; `curl -sf http://127.0.0.1:9229/json/version`. 🌐 `T0` sin conectar (`newWindow: true`) en `http://127.0.0.1:5173/#/my-games` | 200 con `<div id="root">`; CDP escucha solo en 127.0.0.1; `T0`: "Conecta tu wallet para ver tus partidas e invitaciones"; **0** `ListEvents` en `T0` | | ⏳ |
| 3 | 🌐 `T1` y `T2` (`newWindow: true`, `Network.enable`); conectar `AW` en `T1` y `BW` en `T2` (burner del kit); direcciones del `title` de `.account-badge` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$AW` y lo mismo con `@$BW`; 🌐 `#/nada` → `#/` en las dos | `document.visibilityState === 'visible'` en `T0`, `T1` y `T2`; saldo 2 SUI en el formulario de `T1` y de `T2`; mismas direcciones (sin recarga) | | ⏳ |
| 4 | 🌐 `T1` (`AW`) crea desde el formulario `G1`, abierta, de 0,1 SUI, y `G2`, de 0,2 SUI, invitando a `BW` (IDs a `ids.env`) | Navega al detalle en cada una; el aviso de `G2` dice "Comparte el enlace de esta página con el invitado; guárdalo, o encuéntrala en «Mis partidas»" (R-7) | | ⏳ |
| 5 | 🌐 `T1`: clic en "Mis partidas" del encabezado | `#/my-games`; "Tus partidas pendientes" = `G1` ("Abierta") y `G2` ("Invitación a `BW`"), cada una con "Cancelar"; "Invitaciones recibidas": "No tienes invitaciones pendientes"; "Terminadas": "Todavía no hay partidas terminadas"; sin "Cargar más actividad"; "Abrir partida por ID" visible; sin enlace al explorador (localnet) | | ⏳ |
| 6 | 🌐 `T2`: "Mis partidas"; después `#/` y de nuevo `#/my-games` | "Invitaciones recibidas" = `G2` ("Te invitó `AW`", 0,2 SUI), con "Aceptar", "Rechazar" y la nota de la vista previa; `G1` no está en las listas de `BW`; en el lobby (`#/`), `G1` sí aparece y `G2` no (lobby sin cambios) | | ⏳ |
| 7 | DEV: `PRE act_as "$C" && suic ptb --split-coins gas "[50000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 "some(@$AW)"` (`G3`, ID a `ids.env`). 🌐 "Actualizar" en `T1` y en `T2` | `T1`: `G3` en "Invitaciones recibidas" ("Te invitó `C`", 0,05 SUI); `T2`: no aparece | | ⏳ |
| 8 | DEV: `PRE suic balance $AW` y `PRE suic balance $BW` (antes). 🌐 `T2`: observador; clic en "Aceptar" de la fila de `G2` (muestreo cada 250 ms). DEV: `PRE suic tx-block <digest> --json` (`GameResolved`); `PRE suic balance $AW` y `PRE suic balance $BW` (después) | Etapas en orden; **ningún token** en `.tx-status`/`.game-actions` durante las tres primeras etapas (`window.__txLog`); después, "¡Ganaste! Recibiste 0.39 SUI (pozo 0.4 SUI − comisión 0.01 SUI)" o "Perdiste: ganó quien creó la partida y recibió 0.39 SUI (pozo 0.4 SUI − comisión 0.01 SUI)", con el digest; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; la fila de `G2` **sigue** en "Invitaciones recibidas" con "Resuelta" y sin botones; `GameResolved` `pot` 400000000, `fee` 10000000, `payout` 390000000, ganador coherente con el texto; Δ de saldos coherente con el ganador y el costo de red | | ⏳ |
| 9 | (RM-5) DEV: `C` crea en **un PTB** 25 invitaciones a `AW` de 1000000 MIST con la sintaxis medida en TASK-1 (sin `--gas-budget`): `PRE act_as "$C" && N=25 && amounts=$(printf '1000000,%.0s' $(seq $N)); amounts="[${amounts%,}]"; calls=(); for i in $(seq 0 $((N-1))); do calls+=(--move-call "$PKG::game::create_game" @$HOUSE c.$i "some(@$AW)"); done; suic ptb --split-coins gas "$amounts" --assign c "${calls[@]}" --json`. 🌐 `T1`: marca de tiempo, "Actualizar", y espera hasta ver ≥ 25 `li.my-game-row` en `[data-section="invitations"]`; después, marca y clic en "Aceptar" de una de ellas (`G4`, ID a `ids.env`) hasta ver "Verificando la transacción…" | ≥ 26 filas (las 25 más `G3`), cada una con `GameActions`; tiempos anotados (referencia, sin umbral bloqueante); la aceptación de `G4` termina como en el paso 8 con los montos de 0,001 SUI ("…0.00195 SUI (pozo 0.002 SUI − comisión 0.00005 SUI)"); la fila de `G4` queda sin botones (H-3) y las demás se rehabilitan al final | | ⏳ |
| 10 | 🌐 `T2`: "Actualizar" | `G2` pasa a "Terminadas" con "Aceptaste" y `.my-game-result` coherente con el paso 8 ("Ganaste" o "Perdiste"); "Invitaciones recibidas": "No tienes invitaciones pendientes" | | ⏳ |
| 11 | 🌐 `T1`: "Actualizar" | "Terminadas": `G2` con "Creaste" y el resultado **complementario** del paso 8, y `G4` con "Aceptaste"; "Tus partidas pendientes" = solo `G1`; "Invitaciones recibidas": `G3` y las 24 restantes | | ⏳ |
| 12 | 🌐 `T1`: clic en "Cancelar" de `G1`. DEV: `PRE suic tx-block <digest> --json` (`GameCancelled`) | "Partida cancelada: se devolvieron 0.1 SUI a tu cuenta"; la fila queda "Cancelada" y sin botones en "Tus partidas pendientes"; `GameCancelled.refund` 100000000; tras "Actualizar", `G1` en "Terminadas" con "Cancelada: la apuesta volvió a quien la creó" y "Tus partidas pendientes": "No tienes partidas pendientes" | | ⏳ |
| 13 | DEV: `PRE suic balance $C` (antes). 🌐 `T1`: clic en "Rechazar" de `G3`. DEV: `PRE suic tx-block <digest> --json`; `PRE suic balance $C` (después) | "Invitación rechazada: se devolvieron 0.05 SUI a quien te invitó"; `GameCancelled.refund` 50000000 y Δ de `C` = +50000000; tras "Actualizar", `G3` ya no está en las listas de `AW` | | ⏳ |
| 14 | DEV: `PRE act_as "$C" && suic ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 "some(@$BW)"`, dos veces (`G5`, `G6`). 🌐 `T2`: "Actualizar"; en un mismo `Runtime.evaluate`, `click()` en "Aceptar" de la fila de `G5` y de la de `G6`; al terminar, "Aceptar" de `G6` | Primer intento: **1** `ExecuteTransaction` (la de `G5`); durante ella, el botón de `G6` deshabilitado y `IN_FLIGHT_TEXT` ("Hay una transacción en curso desde esta cuenta; espera a que termine") **1** vez en `section.my-games` (contar ocurrencias); después `G6` se acepta con su propia transacción (1 `ExecuteTransaction` más) | | ⏳ |
| 15 | DEV: `PRE act_as "$C" && suic ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 "some(@$BW)"` (`G7`). Después, en uno o dos PTB con la sintaxis del paso 9 y `none` en lugar de `"some(@$AW)"` (`PRE act_as "$C" && N=… …`), **entre 101 y 150** partidas abiertas en total (≥ 101 deja `G7` fuera de la primera página; ≤ 150 garantiza el "una vez" del paso 17). 🌐 `T2`: "Actualizar" | "Invitaciones recibidas" sin `G7`: "Sin invitaciones pendientes en lo revisado" y "Buscar más atrás" (nunca "No tienes invitaciones pendientes"); tras "Actualizar", **3** `ListEvents` en total (2 de invitaciones + 1 de actividad); al pulsar "Buscar más atrás", **+1 o +2** `ListEvents` y aparece `G7` con "Aceptar" y "Rechazar" (DL-8, DL-16). Se anota el número exacto de partidas abiertas creadas | | ⏳ |
| 16 | 🌐 `T1`: "Abrir partida por ID" con `xyz`; después, con el ID de `G1` | `xyz` ⇒ "ID de partida inválido", sin pedidos nuevos ni navegación; el ID de `G1` ⇒ `#/game/<G1>` con el detalle "Cancelada" | | ⏳ |
| 17 | 🌐 `T2`: recargar (burner nueva = otra cuenta, sin fondos), conectar y `#/my-games` | Con > 100 `GameCreated` en la red: "Tus partidas pendientes" y "Terminadas" con el texto **definitivo** ("No tienes partidas pendientes", "Todavía no hay partidas terminadas"), porque la DNF de una cuenta sin actividad termina en `CHECKPOINT_BOUND`; "Invitaciones recibidas" con "Sin invitaciones pendientes en lo revisado" y "Buscar más atrás". Tras pulsarlo **una** vez: "No tienes invitaciones pendientes" y sin botón (H-1 de punta a punta). Ninguna fila de `BW` (DL-9) | | ⏳ |
| 18 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill "$(cat <SMOKE_DIR>/chrome.pid)"`, `kill "$(cat <SMOKE_DIR>/vite.pid)"` (exit 143 esperado) y `kill "$(cat <SMOKE_DIR>/sui.pid)"` (exit 144 esperado), nunca `pkill`/`killall`. **En otra llamada:** `kill -0` falla en los tres PID; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (el Chrome del usuario no se toca); `ss -ltn` con 9000, 9123, 9184, 5003, 5173 y 9229 libres. Recién entonces: `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `rm -rf <SMOKE_DIR>` (perfil y scripts CDP incluidos) y `test ! -e <SMOKE_DIR>`. **Sin cargar `env.sh`:** `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_MY_GAMES.md` | Todo limpio; `~/.sui/` sin cambios; el Chrome del usuario sigue abierto | | ⏳ |

## Qué no cubre este smoke (y dónde está cubierto)

- **Solo con tests:**
  - el vacío "en lo revisado" de las secciones 2 y 3 con más de 50 eventos propios (la burner no los genera por CLI):
    T2-16, T5-5;
  - el error de "cargar más" sin `stalled`: T5-6;
  - la relectura fallida: T4-6, T5-7;
  - los eventos ilegibles: T2-10, T5-8;
  - el cambio de cuenta **sin** recargar (la burner no lo permite): T3-2..T3-6, T5-12, T5-13;
  - el fijado al remontar con caché vieja y con una transacción viva (H-5, H-6): T4-14, T4-17, T5-12, T5-13, T5-17 y
    T5-18.
- **#17 (owner, testnet):**
  - wallet de extensión con cambio de cuenta y con `account` explícito (RM-9);
  - listas con historial podado ("desde <fecha>") y el caso del creador de D-20261103-03;
  - el contenido del enlace al explorador.

## Reporte final

- Pasos PASA/TOTAL:
- Hallazgos (n.º de paso + digest / output):
- Veredicto: [PASA | NO PASA]
