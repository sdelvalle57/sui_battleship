# SMOKE_LOBBY
> Plan: PLAN_LOBBY v1.1 | Handoff: HANDOFF_LOBBY v1.3 (smoke del ciclo) | Issue: #10 | Fecha: 2026-11-02 | Estado: **EN CURSO**
> (las columnas "Resultado obtenido" y "Estado" se llenan **durante** la corrida; nunca por adelantado)
>
> **Modalidad de los pasos 🌐:** Chrome headless + CDP con perfil desechable, como en #9
> (`git show 9bf7a77:documents/SMOKE_APP.md`). `google-chrome --headless=new --no-first-run --no-default-browser-check
> --user-data-dir=<SMOKE_DIR>/chrome-profile --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229
> about:blank`, con `HOME` y `XDG_*` dentro de `<SMOKE_DIR>/chrome-home`; en segundo plano del harness con `exec` y PID en
> `<SMOKE_DIR>/chrome.pid`; controlado con un cliente CDP propio en Node 26 (`fetch` + `WebSocket`, sin dependencias,
> archivo en `<SMOKE_DIR>`, no se commitea): `Page.navigate`, `Runtime.evaluate` (DOM y shadow DOM del kit),
> `Network.*`, `Runtime.consoleAPICalled` y `Log.entryAdded`. Navegación solo a `127.0.0.1:5173` y `127.0.0.1:4173`.
> Nunca el navegador, el perfil ni las extensiones del usuario.

## Historia de usuario (del ciclo)

**Como** jugador, **quiero** ver las partidas abiertas en el lobby y el detalle de cualquier partida por su ID, **para**
elegir a qué partida entrar y saber en qué quedó una partida. Este smoke lo comprueba de punta a punta contra una red real
(localnet aislada) con partidas creadas, canceladas y aceptadas por CLI.

## Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-10-lobby` con TASK-1..6 commiteadas; `npm ci` con Node 26; gate de la app en
  verde (reporte de TASK-6). Nada de este runbook se commitea salvo este archivo.
- **Red:** localnet **aislada** según `agents.md` §3 "Localnet aislada (smokes)" tal como está en la branch: `env.sh` con
  `SUI`, `NODE`, `SUI_CONFIG_DIR`, `HOME` aislado; publicación con el script, **variante B** (sin `--out`, escribe
  `contracts/deployments/localnet.json`); cierre del paso 7.
- **Una sola localnet a la vez** (puerto 9000): antes del paso 1, `ss -ltn` sin nada en `:9000` y ningún `sui start` de
  otra sesión. Si hay otra, se detiene y se avisa al orquestador.
- **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo de §3 paso 3
  (`. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), **tampoco** los de solo
  lectura; siempre `suic`/`"$SUI"`. `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. En la tabla, `PRE` abrevia ese prefijo.
- **Testnet:** nada con claves (ni `publish.mjs … --network testnet`, ni `--dry-run`). Este smoke **no** hace lecturas a
  testnet: el único paso de testnet es un build sin `testnet.json` que debe mostrar `ConfigError` **sin** pedidos (paso 15).
  La rama "con `testnet.json`" queda para #8.
- **Cuentas:** `ADMIN`, `A`, `B`, `C` = cuentas de la génesis aislada (en `ids.env`, no se pegan). Ninguna clave del
  owner; nada en `~/.sui/` (D-20261102-03). Nunca `new-address`.
- **Archivos de entorno** (cada llamada es un shell nuevo; rutas **literales** en el archivo real, aquí con placeholders;
  nunca dos de estos archivos en la misma llamada):
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
  `preview.pid`, `chrome.pid`. Se detienen por PID (nunca `pkill`).
- **Exit 144:** `sui start` 1.83 sale con 144 ante SIGTERM y el harness marca el comando como fallido: es **esperado**; lo
  que vale es que `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` falle.
- **Qué se pega:** IDs y direcciones **abreviados** (`0x1234…abcd`); digests completos sí. Nunca la salida cruda del
  script, `sender`/`owner`, archivos de `<SMOKE_DIR>/net` ni logs completos.
- **Textos esperados** (código de la branch): lobby `app/src/components/LobbyList.tsx`, estados
  `app/src/components/ReadState.tsx`, badge `app/src/components/NetworkBadge.tsx`, detalle
  `app/src/components/GameDetail.tsx` y `app/src/pages/GameDetailPage.tsx`, mensajes `app/src/sui/readErrors.ts`. Las
  horas se comparan con lo que da el navegador para el mismo `timestampMs`:
  `Runtime.evaluate` de `new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(<ms>)`
  (misma función que `formatTimestamp`, zona del navegador).
- **Constantes en juego** (`app/src/sui/lobby.ts`): `LOBBY_EVENTS_PER_REQUEST` 50, `LOBBY_MAX_REQUESTS_PER_PAGE` 2,
  `LOBBY_PAGE_TARGET` 20; reintentos (`readPolicy.ts`): 3 intentos con esperas de 1 s y 2 s, corte de 10 s; badge cada
  20 s (`NODE_STATUS_REFETCH_MS`).
- **Consistencia eventual:** tras cada transacción de la CLI, esperar a que `suic tx-block <digest> --json` muestre
  `checkpoint` antes de "Actualizar" (anotar la espera; no es falla).

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`; línea base `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `ss -ltn` sin `:9000`, `:5173`, `:4173` ni `:9229`; `git status --porcelain` | línea base anotada; sin `localnet.json` previo (si existe: se detiene); puertos libres; árbol limpio | | ⏳ |
| 1 | DEV: génesis y arranque (§3 paso 4, `sui.pid`); `PRE suic chain-identifier`; `suic addresses --json` ⇒ `ADMIN`, `A`, `B`, `C` en `ids.env` (§3 paso 5) | red arriba; `active-env` = `localnet`; chain id corto anotado | | ⏳ |
| 2 | DEV: publicación **variante B**: `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`; `PKG`, `HOUSE`, `CAP` del JSON a `ids.env`; luego `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-02.json"` | publicación exit 0; `localnet.json` con `schemaVersion` 1 y `network` `localnet`; `git check-ignore -v` lo ignora; `Move.lock` sin delta; `update_fee_rate` `success` con `FeeRateUpdated` 0 → 250 | | ⏳ |
| 3 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; `curl -sf http://127.0.0.1:5173/`. Chrome en segundo plano con `chrome.env` (`chrome.pid`); `curl -sf http://127.0.0.1:9229/json/version` | 200 con `<div id="root">`; CDP responde solo en 127.0.0.1 | | ⏳ |
| 4 | 🌐 Abrir `http://127.0.0.1:5173/` | badge `localnet · nodo OK`; `h2` "Apuestas 1 vs 1 en Sui"; sección "Partidas abiertas" con el botón "Actualizar" y el texto **"No hay partidas abiertas"** (la cota es la publicación: **sin** "historial disponible"); botón del kit con el texto **"Conectar wallet"** (`textContent` del `mysten-dapp-kit-connect-button` y nodo asignado al `slot` de su shadow DOM); consola sin errores de CORS | | ⏳ |
| 5 | DEV: `A` crea `G1` (`1000000` MIST, abierta), `G2` (`2000000`, abierta), `G3` (`3000000`, abierta) y `G4` (`4000000`, invitación a `C`), en ese orden y en transacciones separadas: `PRE act_as "$A" && suic ptb --split-coins gas "[<monto>]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json > "$SMOKE_DIR/tx-05-gN.json"` (`G4`: `"some(@$C)"` en lugar de `none`); IDs de los `Game` creados (`objectChanges` `created` de tipo `…::game::Game`) a `ids.env`; `timestampMs` de cada digest con `suic tx-block <digest> --json` | 4 × `success`; 4 `GameCreated` con `fee_rate` 250; `G4` con `opponent` = `C` | | ⏳ |
| 6 | 🌐 "Actualizar" | 3 filas, en este orden: `G3`, `G2`, `G1` (más reciente primero); **sin** `G4`. Cada fila: `"<apuesta> SUI · comisión 2.5 % · creada por 0x…… · <hora> · Ver partida"` con `0.003`, `0.002`, `0.001` SUI; creador = `A` abreviado (completo en `title`); hora = formato del navegador del `timestampMs` del paso 5; ninguna fila "(tuya)" ni "Partida ilegible"; sin "Cargar más" | | ⏳ |
| 7 | DEV: `PRE act_as "$A" && suic call --package "$PKG" --module game --function cancel_game --args "$G2" --json > "$SMOKE_DIR/tx-07.json"`. 🌐 **sin** "Actualizar": volver a leer la lista; después "Actualizar" | `success`, `GameCancelled` con `cancelled_by` = `A` y `refund` `2000000`. Antes de "Actualizar": `G2` sigue visible (el lobby no se refresca solo). Después: 2 filas (`G3`, `G1`), **sin** `G2` (criterio del issue) | | ⏳ |
| 8 | 🌐 Abrir `http://127.0.0.1:5173/#/game/<G2>` | `h2` "Partida"; Estado **"Cancelada"**; Creador `A` abreviado; Oponente "abierta"; Apuesta `0.002 SUI`; Comisión `2.5 %`; sin Pozo/Ganador ni estimación; "Última actividad" = hora del `cancel_game` del paso 7 (`timestampMs` de `suic tx-block`); sin "Ver en el explorador" (localnet) (criterio del issue) | | ⏳ |
| 9 | DEV: `B` acepta `G1`: `PRE act_as "$B" && suic ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json > "$SMOKE_DIR/tx-09.json"` (con `ExecutionCancelledDueToRandomnessUnavailable`, esperar unos segundos y repetir; anotarlo). 🌐 abrir `#/game/<G1>`; volver a `/` y "Actualizar" | `success`; `GameResolved` `pot` `2000000`, `fee` `50000`, `payout` `1950000`, `winner` ∈ {`A`, `B`}. Detalle: Estado **"Resuelta"**; Aceptante `B`; Ganador = `winner` del evento; Pozo `0.002 SUI`; Comisión cobrada `0.00005 SUI`; Pago al ganador `0.00195 SUI (según la fórmula del contrato)`; "Última actividad" = hora del `accept_game`. Lobby: 1 fila (`G3`) | | ⏳ |
| 10 | 🌐 Abrir `#/game/<G3 en MAYÚSCULAS, prefijo incluido: 0X…>` y `#/game/<G4>` | `G3`: el mismo detalle que con el ID original: Estado "Abierta", Apuesta `0.003 SUI`, estimación **"Pozo 0.006 SUI · comisión 0.00015 SUI · al ganador 0.00585 SUI"**. `G4`: Estado "Invitación a <`C` abreviado>", Oponente `C` abreviado. Si algún ID de la corrida empieza con `0x0`, probar también su forma corta (sin ceros a la izquierda) ⇒ mismo detalle | | ⏳ |
| 11 | 🌐 Con CDP `Network.enable` desde una pestaña nueva: (a) `#/game/xyz`; (b) un ID **válido inexistente** (64 hex aleatorios generados con `"$NODE"` en `<SMOKE_DIR>`; se pega abreviado); (c) `#/game/<HOUSE>` | (a) **"ID de partida inválido"** y **ningún** `POST …/LedgerService/BatchGetObjects` (ni `GetTransaction`/`ListEvents`) en `Network.requestWillBeSent` durante 5 s (solo `GetServiceInfo` del badge); (b) **"No existe una partida con ese ID en localnet"** con "Reintentar", sin reintentos automáticos (en 5 s, un solo `BatchGetObjects` completado; en dev, `StrictMode` puede sumar uno abortado del primer montaje, que se anota y no cuenta); (c) **"Ese objeto no es una partida de Sui Battleship"**, también sin reintentos | | ⏳ |
| 12 | DEV: `A` crea 55 partidas abiertas en **un** PTB: `PRE act_as "$A" && amounts=$(printf '1000000,%.0s' $(seq 55)) && args='' && for i in $(seq 0 54); do args="$args --move-call $PKG::game::create_game @$HOUSE c.$i none"; done && suic ptb --split-coins gas "[${amounts%,}]" --assign c $args --gas-budget 2000000000 --json > "$SMOKE_DIR/tx-12.json"`. 🌐 "Actualizar"; contar filas; "Cargar más"; contar | `success` con 55 `GameCreated`. Primera página = **un** pedido de 50 eventos (`ITEM_LIMIT`, ya supera `LOBBY_PAGE_TARGET` 20): **50 filas** de `0.001 SUI` y el botón **"Cargar más"**. Tras "Cargar más" ("Cargando más…" mientras pide): **56 filas** (las 5 restantes del PTB + `G3`), `href` de "Ver partida" todos distintos (sin duplicados), sin `G1`/`G2`/`G4`, y **sin** botón de seguir (`CHECKPOINT_BOUND` en la publicación) | | ⏳ |
| 13 | 🌐 Conectar la wallet de desarrollo (click en el `internal-button` del kit ⇒ modal; entrada "Unsafe Burner Wallet"); después desconectar | modal del kit en inglés ("Connect a wallet"; aceptado por D-20261102-04 (2)); `.account-badge` con una dirección abreviada; ninguna fila pasa a "(tuya)" (la burner no creó partidas: la marca la cubren los tests de TASK-4/5, sin #11 no se puede crear desde el navegador); al desconectar, el botón vuelve a **"Conectar wallet"** | | ⏳ |
| 14 | DEV + 🌐: con `/` abierto y el badge en `nodo OK`, `kill "$(cat <SMOKE_DIR>/sui.pid)"` y `kill -0` (exit 144 esperado). 🌐 (a) sondear el badge cada 250 ms; (b) en cuanto se detiene la red, "Actualizar" y sondear la sección del lobby; (c) recargar la página con la red caída y sondear desde el primer render; (d) abrir `#/game/<G3>` con la red caída | (a) el badge pasa por **"reconectando… (intento 2 de 3)"** (y "intento 3 de 3") y termina en **"sin conexión (…)"** con un motivo legible, en ≤ ~25 s desde el `kill` (20 s de intervalo + 1 s + 2 s); (b) lobby: **"Reintentando… (intento 2 de 3)"**, luego "intento 3 de 3" y al final un `role="alert"` con **"No se pudo leer la red (…)"** y el botón **"Reintentar"**, en ~3-4 s; (c) **"Cargando…"** (o `conectando…` en el badge) en el primer render, luego los mismos "Reintentando…" y el error; (d) el detalle muestra el mismo patrón (reintentando ⇒ error con "Reintentar"). Ningún estado queda en "Cargando…" para siempre | | ⏳ |
| 15 | DEV: `kill` de `vite` por PID (`kill -0` falla); `. <SMOKE_DIR>/app.env && cd "$REPO" && VITE_SUI_NETWORK=testnet npm run build -w app`; `preview` en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/preview.pid" && exec "$NODE" "$VITE_JS" preview --host 127.0.0.1 --port 4173 --strictPort > "$SMOKE_DIR/preview.log" 2>&1`. **Antes del build**, `rm -f <repo>/contracts/deployments/localnet.json` (pertenece a la génesis ya detenida; el glob es `eager` y un `localnet.json` presente entraría al build). 🌐 abrir `http://127.0.0.1:4173/` con `Network.enable` | build exit 0 (anotar el tamaño de `index-*.js`); sin `contracts/deployments/testnet.json` (#8 sin mergear): alert **"La app no está configurada"** + "Falta contracts/deployments/testnet.json: … en testnet lo publica #8"; **ningún** pedido a `:9000` ni a `fullnode`; sin wallet de desarrollo. Si `testnet.json` ya existiera (#8 mergeado), se anota y la rama "testnet · nodo OK" queda fuera de este smoke | | ⏳ |
| 16 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill` de `preview` y de Chrome por PID; `kill -0` falla en `sui`, `vite`, `preview` y Chrome; ningún proceso con el perfil desechable; puertos 9000, 5173, 4173 y 9229 libres; `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true` y `test ! -e <repo>/contracts/deployments/localnet.json`; `rm -rf <SMOKE_DIR>` (perfil de Chrome incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; sin `contracts/Pub.*.toml` ni `contracts/Published.toml`; `app/dist` regenerado con `VITE_SUI_NETWORK=testnet` (sin el `packageId` de la localnet); `git status --porcelain` = solo `documents/SMOKE_LOBBY.md` | todo limpio | | ⏳ |

## Qué no cubre este smoke (y dónde está cubierto)

- **Marca "(tuya)"**: la burner no puede crear partidas sin #11; tests de `useLobby` y `LobbyList` (TASK-4/5).
- **Cota en el piso del nodo** ("No hay partidas abiertas en el historial disponible del nodo (desde <fecha>)", nota
  "Solo se muestra el historial disponible del nodo", `OUT_OF_RANGE` ⇒ fin del historial): la localnet no poda (piso 0);
  tests de `lobby.ts`, `useLobby` y `LobbyList` (TASK-3/4/5) y medición de P7 en testnet (TASK-1).
- **"Sin partidas abiertas en lo revisado" / "Buscar más atrás"** y **cursor repetido** ("La búsqueda no avanzó…"): no se
  provocan en una localnet chica; tests de TASK-3/4/5.
- **"Partida ilegible"** y datos malformados: tests de parsers con fixtures (TASK-2) y de `LobbyList` (TASK-5).
- **"Sin conexión a internet: se reintentará al volver"** (`paused`): depende de `navigator.onLine`; tests de
  `deriveReadStatus`/`ReadState`.
- **Nodo colgado** (corte de 10 s): tests con timers falsos (TASK-3/4).

## Si algo falla

- Capturar: número de paso, digest de la transacción y `suic tx-block <digest>` (sin `sender`/`owner` ni salida cruda del
  script), DOM o texto relevante y `Network.*`/consola del navegador para los pasos 🌐.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 16) se ejecuta igual.
- Una cancelación por DKG o congestión al aceptar (paso 9) no es falla: se repite y se anota.

## Reporte final

- Pasos PASA/TOTAL: (se llena al terminar; 17 pasos, 0-16)
- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]
