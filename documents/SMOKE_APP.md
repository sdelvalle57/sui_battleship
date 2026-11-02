# SMOKE_APP
> Plan: PLAN_APP v2 | Handoff: HANDOFF_APP (Tramo B) | Issue: #9 | Fecha: 2026-11-02 | Estado: **PENDIENTE** (se ejecuta tras
> aprobar TASK-7, con #7 en `master` y `feature/issue-9-app` rebasada; las columnas de resultado se llenan **durante** la corrida)

## Precondiciones
- **Worktree:** `/home/santiago/Projects/Battleship-issue9` (`<repo>`), branch `feature/issue-9-app` rebasada sobre el
  `master` que trae #7; `npm ci` hecho con Node 26; gates de la app en verde (reporte de TASK-7).
- **Red:** localnet **aislada** según `agents.md` §3 "Localnet aislada (smokes)" **en el texto que deja #7** (incluye la
  variante de salida por defecto del script, `contracts/deployments/localnet.json`, y el `rm -f` del paso 7). Una sola
  localnet en la máquina: el orquestador confirma que #7 no tiene una red arriba (puerto 9000).
- **Cuentas:** `ADMIN` = una cuenta de la génesis aislada (en `ids.env`). Ninguna clave del owner; nada en `~/.sui/`
  (D-20261102-03).
- **Cliente:** app con `vite` (dev, puerto 5173) y `vite preview` (puerto 4173) desde `<repo>/app`; navegador del
  usuario (u orquestador con navegador) para los pasos 🌐; wallet de desarrollo (burner) solo en dev.
- **Archivos de entorno** (rutas literales; cada llamada es un shell nuevo):
  - `<SMOKE_DIR>/env.sh` (§3 paso 2): **solo** para llamadas con `sui`.
  - `<SMOKE_DIR>/app.env` (HANDOFF_APP TASK-4 paso 1, más `VITE_JS=/home/santiago/Projects/Battleship-issue9/node_modules/vite/bin/vite.js`
    con `[ -f "$VITE_JS" ]` en la guarda): para `node`/`npm`/`curl`/`vite`. Nunca los dos en la misma llamada. `npm`
    siempre por el `PATH` de Node 26 que fija `app.env`.
- **Quién:** DEV = pasos sin 🌐; 🌐 = usuario (u orquestador con navegador). El DEV **no termina su sesión** hasta el
  paso 14; el orquestador le reenvía los resultados 🌐 (SendMessage). Procesos en segundo plano (`sui`, `vite`,
  `preview`) como comandos en segundo plano del harness con `exec` y PID en `<SMOKE_DIR>`.

## Pasos
| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env`; línea base `stat`/`ls` de `~/.sui/sui_config/`; `test ! -e <repo>/contracts/deployments/localnet.json` | línea base anotada; **sin** `localnet.json` previo (si existe: se detiene, dato viejo) | | ⏳ |
| 1 | DEV: génesis, arranque (segundo plano, `sui.pid`), `suic chain-identifier`; `ADMIN` en `ids.env` | red arriba, `active-env` = `localnet` | | ⏳ |
| 2 | DEV: script de #7, **variante de salida por defecto** (sin `--out`), comando exacto de §3 paso 4 | exit 0; `contracts/deployments/localnet.json` con `schemaVersion` 1, `network` `localnet`; `git check-ignore -v contracts/deployments/localnet.json` → `.gitignore:7`; `git status --porcelain` vacío | | ⏳ |
| 3 | DEV: sonda (HANDOFF_APP TASK-4 pasos 5-7) con `PKG` = `packageId` (llamada), `HOUSE` = `houseId`, `CAP` = `houseCapId` tomados del JSON, y el `eventType` del paso 7 armado con `originalPackageId` (en la primera publicación son iguales) | `update_fee_rate` success; preflight con `access-control-allow-origin: *`; ≥ 1 `FeeRateUpdated` con `json` (`new_fee_rate` 250) | | ⏳ |
| 4 | DEV: `vite` dev en segundo plano: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; en otra llamada, `curl -sf http://127.0.0.1:5173/` | 200 con `<div id="root">`; traspaso al usuario con la URL | | ⏳ |
| 5 | 🌐 Abrir `http://127.0.0.1:5173/` | cabecera "localnet · nodo OK" | | ⏳ |
| 6 | 🌐 Conectar la wallet de desarrollo; luego desconectar | dirección abreviada visible (`0x1234…abcd`); vuelve "Conectar" | | ⏳ |
| 7 | 🌐 Recargar y volver a conectar la wallet de desarrollo | **otra** dirección (clave solo en memoria) | | ⏳ |
| 8 | DEV + 🌐: `mv <repo>/contracts/deployments/localnet.json "$SMOKE_DIR/"`; 🌐 recargar; DEV lo devuelve con `mv`; 🌐 recargar. Si la recarga da error de módulo en vez de `ConfigError`, reiniciar `vite` (kill del PID + paso 4) antes de declarar falla | `ConfigError` con la instrucción para generar el JSON; luego app normal | | ⏳ |
| 9 | (opcional) DEV + 🌐: `cp` del JSON a `"$SMOKE_DIR/localnet.json.orig"`, reescribir `chainId` a `00000000` con `"$NODE"`, 🌐 recargar; restaurar desde `.orig` (`cmp` igual) | "red equivocada"; tras restaurar, "nodo OK" | | ⏳ |
| 10 | DEV: `kill "$(cat "$SMOKE_DIR/vite.pid")"` (confirmar con `kill -0`); `. <SMOKE_DIR>/app.env && cd "$REPO" && VITE_SUI_NETWORK=localnet npm run build -w app`; `preview` en segundo plano: `… && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/preview.pid" && exec "$NODE" "$VITE_JS" preview --host 127.0.0.1 --port 4173 --strictPort > "$SMOKE_DIR/preview.log" 2>&1`; `curl -sf http://127.0.0.1:4173/` | build exit 0; preview 200 | | ⏳ |
| 11 | 🌐 Abrir `http://127.0.0.1:4173/`, abrir la lista de `ConnectButton` y la consola | "localnet · nodo OK"; en la lista **no** está "Unsafe Burner Wallet" ni la entrada **web** de Slush; consola sin el `console.warn` del burner. Las **extensiones** de wallet instaladas en el navegador pueden aparecer: se anotan, no son falla | | ⏳ |
| 12 | DEV + 🌐: con la página del paso 11 abierta, el DEV detiene la red: `kill "$(cat <SMOKE_DIR>/sui.pid)"` y confirma con `kill -0` | en ≤ 40 s (20 s de intervalo + ~7 s de reintentos de TanStack + margen) el badge pasa a "sin conexión" | | ⏳ |
| 13 | DEV: `kill` del PID de `preview`; `VITE_SUI_NETWORK=testnet npm run build -w app` (con `app.env`) + `preview` igual que el paso 10 → 🌐 abrir | sin `contracts/deployments/testnet.json`: `ConfigError`; con `testnet.json` (#8 ya mergeado): "testnet · nodo OK" y sin wallet de desarrollo | | ⏳ |
| 14 | DEV: cierre = §3 paso 7 tal como lo deja #7, más la app: `kill` de `preview` y `kill -0` de `sui`, `vite` y `preview` fallan; `rm -f <repo>/contracts/deployments/localnet.json` y `test ! -e`; `rm -rf <SMOKE_DIR>` y `test ! -e`; `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base; `git status --porcelain` vacío; `git diff --exit-code -- contracts/Move.lock`; sin `contracts/Pub.*.toml` | todo limpio | | ⏳ |

## Si algo falla
- Capturar: número de paso, output literal (sin `publish.json`, sin `sender`, sin archivos de `<SMOKE_DIR>/net`, sin
  logs completos), captura o texto de la consola del navegador para los pasos 🌐.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 14) se ejecuta igual.
- Falla de la sonda (paso 3) ⇒ vuelve a STOP-1 (D-20261102-02 (1)).

## Reporte final
- Pasos PASA/TOTAL:
- Hallazgos (n° de paso + output):
- Veredicto: [PASA | NO PASA]
