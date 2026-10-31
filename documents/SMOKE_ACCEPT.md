# SMOKE_ACCEPT
> Plan: PLAN_ACCEPT v2 | Handoff: HANDOFF_ACCEPT v1, TASK-3 | Issue: #6 | Fecha: 2026-10-30 | Estado: **EN CURSO** (pendiente de corrida)
> Runbook vivo: las columnas "Resultado obtenido" y "Estado" y el "Reporte final" se completan **durante** la corrida,
> nunca por adelantado. Todo corre en local (sin push, sin testnet, sin wallet del owner).

## Precondiciones

- **Las variables NO persisten entre llamadas.** Cada llamada del DEV es un shell nuevo: un `export` hecho en una
  llamada no existe en la siguiente. Por eso **cada** llamada que invoque `sui` empieza con el prefijo `PRE` (abajo) en
  la misma línea, y se usa `"$SUI"`/`suic`, nunca `sui` a secas.
- **Red:** localnet **aislada** en `<SMOKE_DIR>` (directorio nuevo dentro del scratchpad del DEV, ruta absoluta literal):
  `sui genesis --working-dir` + `sui start --network.config`, sin `--force-regenesis` ni faucet (motivo:
  `crates/sui/src/sui_commands.rs:1271-1273` @ `testnet-v1.83.0` reescribe el `client.yaml` de la config por defecto
  con `--force-regenesis`). Paquete publicado con `sui client test-publish` (efímero).
- **Cuentas:** las 4 primeras de la génesis (5 cuentas con fondos): `ADMIN` (publica, recibe el `HouseCap`), `ALICE`
  (crea), `BOB` (acepta / invitado), `CAROL` (tercero). Claves desechables de localnet solo en `<SMOKE_DIR>/net`
  (excepción acotada a D-20261030-07, FLUJO §6), borradas al cerrar.
- **Cliente:** Sui CLI `1.83.0-16d2dc1e05ed` por ruta absoluta (`$SUI`), `jq`, `curl` al JSON-RPC
  `http://127.0.0.1:9000`.
- **Prohibido:** leer, copiar, mostrar o pegar cualquier archivo de `<SMOKE_DIR>/net` (keystore, `client.yaml`,
  `network.yaml`, `genesis.blob`, YAML de validadores/fullnode); pegar `genesis.log` o `sui-start.log` completos; usar
  `sui client new-address`; tocar `~/.sui/` (solo `stat`/`ls` del HOME real, nunca `cat`); `pkill`.

### `env.sh` (se crea en el paso 0 con rutas literales)

```sh
# <SMOKE_DIR>/env.sh
SMOKE_DIR=<SMOKE_DIR>
SUI=<ruta absoluta del binario sui>
export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
[ -x "$SUI" ] && [ -d "$SUI_CONFIG_DIR" ] || { echo GUARD-FAIL; return 97; }
smoke_guard() {
  [ -f "$SUI_CONFIG_DIR/client.yaml" ] \
    && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] \
    || { echo GUARD-FAIL; return 97; }
}
suic() { printf 'n\n' | "$SUI" client "$@"; }
act_as() { suic switch --address "$1" > /dev/null; }
```

**Prefijo `PRE`** (literal, al principio de cada llamada con `sui` salvo génesis):
`. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`

`<SMOKE_DIR>/ids.env` acumula `export ADMIN=0x… ALICE=… BOB=… CAROL=… PKG=… HOUSE=… CAP=… G1=…` a medida que se obtienen.

**Extracto estándar de una transacción** (lo que se pega; `tx-NN.json` = salida `--json` guardada en `<SMOKE_DIR>`):
`jq '{digest, status: .effects.status, gasUsed: .effects.gasUsed, events: [.events[]? | {type, parsedJson}], balanceChanges}' <SMOKE_DIR>/tx-NN.json`
(si la CLI usa otros nombres de campo, ajustar el filtro y anotarlo en Hallazgos).

**Lectura por JSON-RPC** (sin `sui`):
`curl -s http://127.0.0.1:9000 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"sui_getObject","params":["<ID>",{"showType":true,"showOwner":true,"showContent":true,"showStorageRebate":true,"showPreviousTransaction":true}]}' | jq '.result'`

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | Sin `env.sh`: `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y `ls <HOME real>/.sui/sui_config/`. Crear `<SMOKE_DIR>/{net,tmp,home}` vacíos y `env.sh` | `stat`/`ls` anotados (línea base); `. <SMOKE_DIR>/env.sh && echo ok` imprime `ok` | (se llena durante la corrida) | ⏳ |
| 1 | Génesis: `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' \| "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?"`. Arranque **en segundo plano del harness**: `. <SMOKE_DIR>/env.sh && smoke_guard && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" > "$SMOKE_DIR/sui-start.log" 2>&1`. Luego `PRE suic chain-identifier` | `exit=0`; `smoke_guard` sin `GUARD-FAIL` (`active-env` = `localnet`); `chain-identifier` responde | | ⏳ |
| 2 | `PRE suic addresses --json`; anotar las 4 primeras como `ADMIN`, `ALICE`, `BOB`, `CAROL` en `ids.env`; `PRE suic balance <dir>` de cada una | 4 direcciones con saldo > 0 (solo alias y direcciones en la salida) | | ⏳ |
| 3 | `PRE act_as "$ADMIN" && cd <repo>/contracts && printf 'n\n' \| "$SUI" client test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --json > "$SMOKE_DIR/tx-03.json"`; extraer `PKG` (`objectChanges` tipo `published`), `HOUSE` (`…::house::House`), `CAP` (`…::house::HouseCap`) a `ids.env`; `PRE suic object 0x8 --json \| jq '.type // .'` | publicación `success`; IDs anotados; `0x8` es `0x2::random::Random`. Si falla la verificación de dependencias: reintentar con `--skip-dependency-verification` y anotarlo | | ⏳ |
| 4 | `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-04.json"` | `success`; evento `FeeRateUpdated` (`old_fee_rate` 0, `new_fee_rate` 250) | | ⏳ |
| 5 | `PRE act_as "$ALICE" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json > "$SMOKE_DIR/tx-05.json"`; `G1` = objeto creado `…::game::Game` | `success`; `GameCreated` (`bet` 1000001, `fee_rate` 250, `opponent` none); `gasUsed` anotado | | ⏳ |
| 6 | `sui_getObject` de `G1` (JSON-RPC) → `<repo>/contracts/fixtures/localnet/jsonrpc/game_pending.json` (`jq .`); anotar `storageRebate` | `state` = `{"type": "<PKG>::game::GameState", "variant": "Pending", "fields": {}}`; `bet` y `version` como string; `stake` = `"1000001"` | | ⏳ |
| 7 | `ALICE` crea `G2` (como el paso 5) y la cancela: `PRE act_as "$ALICE" && suic call --package "$PKG" --module game --function cancel_game --args "$G2" --json > "$SMOKE_DIR/tx-07b.json"`; `sui_getObject` de `G2` → `game_cancelled.json` | `GameCancelled` (`cancelled_by` = `ALICE`, `refund` 1000001); `balanceChanges` de `ALICE` = `+1000001 − gas`; `variant: "Cancelled"`, `stake` `"0"` | | ⏳ |
| 8 | `ALICE` crea `G3` invitación: `… create_game @$HOUSE c.0 "some(@$BOB)"`. `CAROL` intenta aceptar **con presupuesto explícito**: `PRE act_as "$CAROL" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G3 @$HOUSE c.0 @0x8 --gas-budget 100000000 --json > "$SMOKE_DIR/tx-08.json"` | tx con `status` `failure`, `MoveAbort` en el módulo `game` con código **5** (`ENotInvited`); `CAROL` solo pierde gas (su `split` revierte); `G3` sigue `Pending` | | ⏳ |
| 9 | `PRE act_as "$BOB" && suic call --package "$PKG" --module game --function reject_game --args "$G3" --json > "$SMOKE_DIR/tx-09.json"` | `GameCancelled` (`cancelled_by` = `BOB`, `creator` = `ALICE`); `ALICE` recibe 1000001; `BOB` solo paga gas | | ⏳ |
| 10 | `ALICE` crea `G4` (descartable). `BOB`: `PRE act_as "$BOB" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G4 @$HOUSE c.0 @0x8 --split-coins gas "[1]" --gas-budget 100000000 --json` | rechazada **antes** de ejecutar (sin digest ejecutado): "Commands following a command with Random can only be TransferObjects or MergeCoins"; `G4` sigue `Pending` | | ⏳ |
| 11 | `BOB` acepta `G1`: `PRE act_as "$BOB" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json > "$SMOKE_DIR/tx-11.json"`; `sui_getObject` de `G1` → `game_resolved.json`; `fees_collected` de la House por JSON-RPC | `GameResolved` con `pot` 2000002, `fee` 50000, `payout` 1950002, `winner` ∈ {`ALICE`, `BOB`}; `balanceChanges`: si gana `ALICE`, `ALICE` `+1950002` y `BOB` `−1000001 − gas`; si gana `BOB`, `BOB` `+950001 − gas`; `fees_collected` = 50000; `variant: "Resolved"`, `fields: {acceptor, winner}`, `stake` `"0"`. Si el `status` es `failure` con `ExecutionCancelledDueToRandomnessUnavailable`, esperar unos segundos y repetir (anotarlo) | | ⏳ |
| 12 | Repetir: `ALICE` crea + `BOB` acepta (usar `G4` primero) hasta ver **ambos** resultados, máx. 12 partidas | al menos un `winner` = `ALICE` y uno = `BOB`; conservación en cada una (`payout + fee = 2 × bet`); `gasUsed` completo (`computationCost`, `storageCost`, `storageRebate`, `nonRefundableStorageFee`) de un resultado de cada lado registrado: **consistente** con D6 (no es prueba: el cómputo se redondea a 1000 unidades; la evidencia de D6 es el código) | | ⏳ |
| 13 | `PRE act_as "$ADMIN" && suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$CAP --assign f --transfer-objects "[f]" @$ADMIN --json > "$SMOKE_DIR/tx-13.json"`; `fees_collected` por JSON-RPC | `FeesWithdrawn.amount` = Σ `fee` de los pasos 11-12; `ADMIN` recibe ese monto (− gas); `fees_collected` = 0 | | ⏳ |
| 14 | Tabla de storage (abajo) con los `gasUsed` de crear (5), cancelar (7), rechazar (9) y aceptar (11) y el `storageRebate` del objeto en `Pending` (6), `Cancelled` (7) y `Resolved` (11); actualizar `contracts/README.md` "Objeto terminal y storage" | valores completos; README sin "≈ 0,002–0,003 SUI" | | ⏳ |
| 15 | Cierre: `kill "$(cat <SMOKE_DIR>/sui.pid)"`; `rm -rf <SMOKE_DIR>`; `stat`/`ls` del paso 0 (sin `env.sh`); `git status --porcelain`; `git diff --exit-code -- contracts/Move.lock; echo "exit=$?"`; `ls contracts/Pub.*.toml contracts/Published.toml 2>&1`; `jq empty contracts/fixtures/localnet/jsonrpc/*.json; echo "exit=$?"` | `stat`/`ls` idénticos al paso 0; árbol solo con fixtures, README, STATUS y este documento; `exit=0` del lock; sin `Pub.*.toml` ni `Published.toml`; fixtures válidas | | ⏳ |

### Storage medido (paso 14)

| Transacción / objeto | `computationCost` | `storageCost` | `storageRebate` | `nonRefundableStorageFee` |
|---|---|---|---|---|
| Crear (paso 5) | | | | |
| Cancelar (paso 7) | | | | |
| Rechazar (paso 9) | | | | |
| Aceptar (paso 11) | | | | |
| `Game` `Pending` (`storageRebate` del objeto) | — | — | | — |
| `Game` `Cancelled` | — | — | | — |
| `Game` `Resolved` | — | — | | — |

## Si algo falla

- Capturar el digest (si lo hubo) y el **extracto estándar** de la transacción, o el mensaje de error de la CLI;
  `PRE suic tx-block <digest> --json` filtrado con el mismo `jq`.
- `GUARD-FAIL`: no ejecutar nada más; reportar la llamada exacta.
- Red que no arranca: revisar solo las últimas líneas relevantes de `sui-start.log` (`tail -n 20`), revisadas antes de
  pegar; si el puerto 9000 está ocupado por otra red propia, detenerla por PID; si no es propia, STOP al MID.
- Cancelación por DKG (`ExecutionCancelledDueToRandomnessUnavailable`) o por congestión: no es un fallo del contrato;
  reintentar y anotarlo.
- `test-publish` que modifica `Move.lock`: `git checkout -- contracts/Move.lock` antes de cerrar y anotarlo.
- JSON-RPC no disponible en el fullnode local: STOP al MID con el output del `curl`.
- Reportar el número de paso donde falló, con el output. Un paso fallido ⇒ **NO PASA**.

## Reporte final

- Pasos PASA/TOTAL: _/16 (pasos 0-15)
- Hallazgos (n° de paso + digest / output):
- Desviaciones del procedimiento (o "ninguna"):
- Veredicto: [PASA | NO PASA]
