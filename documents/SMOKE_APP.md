# SMOKE_APP
> Plan: PLAN_APP v2 | Handoff: HANDOFF_APP v2.1 (Tramo B) | Issue: #9 | Fecha: 2026-11-02 | Estado: **PENDIENTE** (se
> ejecuta tras aprobar TASK-7; las columnas de resultado se llenan **durante** la corrida)

## Precondiciones
- **Worktree:** `/home/santiago/Projects/Battleship-issue9` (`<repo>`), branch `feature/issue-9-app` con TASK-5..7
  commiteadas; `npm ci` con Node 26; gate de la app en verde (reporte de TASK-7).
- **Red:** localnet **aislada** según `agents.md` §3 "Localnet aislada (smokes)" tal como está en `master` (texto de
  #7): `env.sh` con `SUI`, `NODE`, `SUI_CONFIG_DIR`, `HOME` aislado; publicación con el script, **variante B** (sin
  `--out`); cierre del paso 7 con `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments`.
- **Una sola localnet a la vez** en la máquina (puerto 9000): el orquestador confirma antes del paso 1 que no hay otra
  (al 2026-11-02 no hay ninguna).
- **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo de §3 paso 3 (`env.sh` + `ids.env` +
  `smoke_guard`), **tampoco** los de solo lectura (`active-env`, `chain-identifier`, `addresses`). `SUI_CONFIG_DIR` solo
  `$SMOKE_DIR/net`.
- **Testnet:** ningún agente corre nada contra testnet con claves (ni `publish.mjs … --network testnet`, ni con
  `--dry-run`). Solo está prevista la **lectura pública desde el navegador** del paso 7 (CORS y error provocado).
- **Cuentas:** `ADMIN` = una cuenta de la génesis aislada (en `ids.env`). Ninguna clave del owner; nada en `~/.sui/`
  (D-20261102-03).
- **Archivos de entorno** (rutas literales; cada llamada es un shell nuevo; nunca los dos en la misma llamada):
  - `<SMOKE_DIR>/env.sh` (§3 paso 2): **solo** para llamadas con `sui`/`suic`/`publish.mjs`.
  - `<SMOKE_DIR>/app.env`: para `node`/`npm`/`curl`/`vite`; no toca `HOME` ni `SUI_CONFIG_DIR`:
    ```sh
    SMOKE_DIR=<SMOKE_DIR>
    REPO=/home/santiago/Projects/Battleship-issue9
    NODE=/home/santiago/.nvm/versions/node/v26.13.0/bin/node
    VITE_JS=/home/santiago/Projects/Battleship-issue9/node_modules/vite/bin/vite.js
    export PATH=/home/santiago/.nvm/versions/node/v26.13.0/bin:$PATH
    [ "$("$NODE" --version)" = v26.13.0 ] && [ -d "$SMOKE_DIR" ] && [ -f "$VITE_JS" ] || { echo APPENV-FAIL; return 97; }
    ```
- **Quién:** DEV = pasos sin 🌐; 🌐 = usuario (u orquestador con navegador). El DEV **no termina su sesión** hasta el
  paso 16; el orquestador le reenvía los resultados 🌐 (SendMessage). `sui`, `vite` y `preview` corren como comandos en
  segundo plano del harness con `exec` y PID en `<SMOKE_DIR>`.
- **Exit 144:** `sui start` 1.83 sale con 144 ante SIGTERM y el harness marca ese comando como fallido: es **esperado**;
  lo que vale es que `kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` falle.

## Pasos
| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env`; línea base `stat`/`ls` de `~/.sui/sui_config/`; `test ! -e <repo>/contracts/deployments/localnet.json` | línea base anotada; sin `localnet.json` previo (si existe: se detiene, dato viejo). `contracts/deployments/testnet.json` puede existir si #8 ya se mergeó: no se toca | | ⏳ |
| 1 | DEV: génesis, arranque (segundo plano, `sui.pid`), `suic chain-identifier`; `ADMIN` en `ids.env` (§3 pasos 4-5) | red arriba, `active-env` = `localnet` | | ⏳ |
| 2 | DEV: publicación, **variante B** de §3 paso 4: prefijo del paso 3 + `act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` | exit 0; `contracts/deployments/localnet.json` con `schemaVersion` 1 y `network` `localnet`; `git check-ignore -v contracts/deployments/localnet.json` → `.gitignore:7`; `git status --porcelain` vacío; `Move.lock` sin delta | | ⏳ |
| 3 | DEV: sonda (HANDOFF v1, TASK-4 pasos 5-7: `git show db1a256:documents/HANDOFF_APP.md`) con `PKG` = `packageId`, `HOUSE` = `houseId`, `CAP` = `houseCapId` del JSON (anotados en `ids.env`) y el `eventType` armado con `originalPackageId` | `update_fee_rate` success; preflight 200 con `access-control-allow-origin: *`; ≥ 1 `FeeRateUpdated` con `json` (`new_fee_rate` 250) | | ⏳ |
| 4 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; en otra llamada, `curl -sf http://127.0.0.1:5173/` | 200 con `<div id="root">`; traspaso al usuario con la URL | | ⏳ |
| 5 | 🌐 Abrir `http://127.0.0.1:5173/` | cabecera "localnet · nodo OK" | | ⏳ |
| 6 | 🌐 DevTools → Network, filtrar `LedgerService`: abrir una petición `POST http://127.0.0.1:9000/sui.rpc.v2.LedgerService/GetServiceInfo` hecha por la app | status 200; `content-type` gRPC-web; cabeceras de respuesta con `access-control-allow-origin: *` y `access-control-expose-headers`; consola **sin** errores de CORS | | ⏳ |
| 7 | 🌐 Consola de la página (lectura pública, sin claves): `const p = (u) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/grpc-web+proto', 'x-grpc-web': '1' }, body: new Uint8Array(5) }).then((r) => console.info(u, r.status, r.headers.get('grpc-status'), r.headers.get('grpc-message')));` y luego `p('http://127.0.0.1:9000/sui.rpc.v2.LedgerService/GetServiceInfo')`, `p('http://127.0.0.1:9000/sui.rpc.v2.LedgerService/NoExiste')`, `p('https://fullnode.testnet.sui.io/sui.rpc.v2.LedgerService/GetServiceInfo')`, `p('https://fullnode.testnet.sui.io/sui.rpc.v2.LedgerService/NoExiste')` | las 4 responden (sin `TypeError: Failed to fetch` ni bloqueo CORS); los `GetServiceInfo` con status 200; los `NoExiste` con un `grpc-status` **legible** distinto de `0` (p. ej. `12`, UNIMPLEMENTED) en localnet y en testnet | | ⏳ |
| 8 | 🌐 Conectar la wallet de desarrollo; luego desconectar | dirección abreviada visible (`0x1234…abcd`); vuelve "Conectar" | | ⏳ |
| 9 | 🌐 Recargar y volver a conectar la wallet de desarrollo | **otra** dirección (clave solo en memoria) | | ⏳ |
| 10 | DEV + 🌐: `mv <repo>/contracts/deployments/localnet.json "$SMOKE_DIR/"`; 🌐 recargar; DEV lo devuelve con `mv`; 🌐 recargar. Si la recarga da error de módulo en vez de `ConfigError`, reiniciar `vite` (kill del PID + paso 4) antes de declarar falla | `ConfigError` con la instrucción para generar el JSON (variante B); luego app normal | | ⏳ |
| 11 | (opcional) DEV + 🌐: `cp` del JSON a `"$SMOKE_DIR/localnet.json.orig"`, reescribir `chainId` a `00000000` con `"$NODE"`, 🌐 recargar; restaurar desde `.orig` (`cmp` igual), 🌐 recargar | "red equivocada (esperada 00000000, nodo …)"; tras restaurar, "nodo OK" | | ⏳ |
| 12 | DEV: `kill "$(cat "$SMOKE_DIR/vite.pid")"` (confirmar con `kill -0`); `. <SMOKE_DIR>/app.env && cd "$REPO" && VITE_SUI_NETWORK=localnet npm run build -w app`; `preview` en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/preview.pid" && exec "$NODE" "$VITE_JS" preview --host 127.0.0.1 --port 4173 --strictPort > "$SMOKE_DIR/preview.log" 2>&1`; `curl -sf http://127.0.0.1:4173/` | build exit 0; preview 200 | | ⏳ |
| 13 | 🌐 Abrir `http://127.0.0.1:4173/`, la lista de `ConnectButton` y la consola | "localnet · nodo OK"; en la lista **no** está "Unsafe Burner Wallet" ni la entrada **web** de Slush; consola sin el `console.warn` del burner. Las **extensiones** de wallet instaladas pueden aparecer: se anotan, no son falla | | ⏳ |
| 14 | DEV + 🌐: con la página del paso 13 abierta, el DEV detiene la red: `kill "$(cat <SMOKE_DIR>/sui.pid)"` y confirma con `kill -0` (el harness marcará `sui start` con exit 144: esperado) | en ≤ 40 s el badge pasa a "sin conexión" con un motivo legible. Margen: con el proceso muerto la conexión se rechaza al instante, así que cuentan 20 s de intervalo + ~7 s de reintentos de TanStack (1 + 2 + 4 s) + margen. Con un nodo **colgado** (no es este paso) el peor caso sería 20 + 4 × 10 s de timeout + 7 ≈ 67 s, cubierto por los tests de TASK-6 | | ⏳ |
| 15 | DEV: `kill` del PID de `preview`; `VITE_SUI_NETWORK=testnet npm run build -w app` (con `app.env`) + `preview` igual que el paso 12 → 🌐 abrir | sin `contracts/deployments/testnet.json`: `ConfigError` (y ningún `POST` en Network); con `testnet.json` (#8 ya mergeado): "testnet · nodo OK" y sin wallet de desarrollo | | ⏳ |
| 16 | DEV: cierre = §3 paso 7 tal como está en `master`, más la app: `kill` de `preview`; `kill -0` de `sui`, `vite` y `preview` fallan; `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true` (solo borra la carpeta si quedó vacía) y `test ! -e <repo>/contracts/deployments/localnet.json`; `rm -rf <SMOKE_DIR>` y `test ! -e`; `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base; `git status --porcelain` vacío; `git diff --exit-code -- contracts/Move.lock`; sin `contracts/Pub.*.toml` ni `contracts/Published.toml` nuevos | todo limpio | | ⏳ |

## Si algo falla
- Capturar: número de paso, output literal (sin la salida cruda del script, sin `sender`/`owner`, sin archivos de
  `<SMOKE_DIR>/net`, sin logs completos), captura o texto de la consola/Network del navegador para los pasos 🌐.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 16) se ejecuta igual.
- Falla de la sonda (paso 3) o de CORS (pasos 6-7) ⇒ vuelve a STOP-1 (D-20261102-02 (1)).

## Reporte final
- Pasos PASA/TOTAL:
- Hallazgos (n° de paso + output):
- Veredicto: [PASA | NO PASA]
