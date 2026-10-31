# SMOKE_ACCEPT
> Plan: PLAN_ACCEPT v2 | Handoff: HANDOFF_ACCEPT v1, TASK-3 | Issue: #6 | Fecha: 2026-10-30 | Estado: **PASA (on-chain)** (corrida 2026-10-31; H-1 —fullnode 1.83.0 sin JSON-RPC— resuelto por D-20261031-01: fixtures diferidas a #10)
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
| 0 | Sin `env.sh`: `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y `ls <HOME real>/.sui/sui_config/`. Crear `<SMOKE_DIR>/{net,tmp,home}` vacíos y `env.sh` | `stat`/`ls` anotados (línea base); `. <SMOKE_DIR>/env.sh && echo ok` imprime `ok` | `stat`: `2026-10-30 17:52:52.515735237 -0500 244 /home/santiago/.sui/sui_config/client.yaml`; `ls`: `client.yaml`. `<SMOKE_DIR>` = `/tmp/claude-1000/-home-santiago-Projects-Battleship/98f622a5-f777-4cdf-995c-5bdc2b523ce2/scratchpad/issue6/smoke` con `{net,tmp,home}` vacíos; `SUI=/home/santiago/.local/bin/sui` (ELF); `. env.sh && echo ok` → `ok`. Puertos 9000/9123 libres | ✅ PASA |
| 1 | Génesis: `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' \| "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?"`. Arranque **en segundo plano del harness**: `. <SMOKE_DIR>/env.sh && smoke_guard && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" > "$SMOKE_DIR/sui-start.log" 2>&1`. Luego `PRE suic chain-identifier` | `exit=0`; `smoke_guard` sin `GUARD-FAIL` (`active-env` = `localnet`); `chain-identifier` responde | Génesis `exit=0` (`genesis.log` vacío). `smoke_guard` sin `GUARD-FAIL` (`active-env` = `localnet`). Red en segundo plano, PID 1846452 (`sui start --network.config …/net`). `chain-identifier` → `Base58: HhT5uFGJ66cd6Y5H5yB79Pn345TubJMYKX6Hc4iBy2PM` / `Hex: f817b78e`. **H-1:** el fullnode responde en `:9000` (`/health` → `up`, cabecera `x-sui-chain-id`) pero **sin JSON-RPC**: todo `POST` (`/`, `/json-rpc`, `/rpc`, `/v1`, `/jsonrpc`) → `HTTP/1.1 404`, `content-length: 0` (ver Hallazgos) | ✅ PASA |
| 2 | `PRE suic addresses --json`; anotar las 4 primeras como `ADMIN`, `ALICE`, `BOB`, `CAROL` en `ids.env`; `PRE suic balance <dir>` de cada una | 4 direcciones con saldo > 0 (solo alias y direcciones en la salida) | `addresses --json` → solo `activeAddress` + 5 pares (alias, dirección). `ADMIN=0x0973b5da…9f59b787`, `ALICE=0x51b8254f…f734a95b`, `BOB=0x8a91ecb8…6754176a`, `CAROL=0xeb700a53…0546eba5`. Saldo de cada una: `150000000000000000` MIST | ✅ PASA |
| 3 | `PRE act_as "$ADMIN" && cd <repo>/contracts && printf 'n\n' \| "$SUI" client test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --json > "$SMOKE_DIR/tx-03.json"`; extraer `PKG` (`objectChanges` tipo `published`), `HOUSE` (`…::house::House`), `CAP` (`…::house::HouseCap`) a `ids.env`; `PRE suic object 0x8 --json \| jq '.type // .'` | publicación `success`; IDs anotados; `0x8` es `0x2::random::Random`. Si falla la verificación de dependencias: reintentar con `--skip-dependency-verification` y anotarlo | `exit=0`, digest `66SvbbFLS4cYLer23MG5xDUQUXQF4GJJPRK8TjeRX1SE`, `success`; gas `1000000`/`46246000`/`0`/`0`. `PKG=0xd925b7e6114539549beabdab6543ce52d6cd99e756cdbcb935296e03cf775ea7`, `HOUSE=0x98c2063a…e28ed29e` (shared, `initial_shared_version` 2), `CAP=0xd10463e7…102147d6` (de `ADMIN`). `0x8` → `objType` `0x2::random::Random` (shared). Sin `--skip-dependency-verification`; `Move.lock` sin cambio (md5 `e855b7fd…` antes y después); sin `Pub.*.toml` en el repo | ✅ PASA |
| 4 | `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-04.json"` | `success`; evento `FeeRateUpdated` (`old_fee_rate` 0, `new_fee_rate` 250) | digest `VhkUFYfLVZkjWXKR7VgDnKBNLMGFi2F1UrB2TufbM2L`, `success`; `FeeRateUpdated` `old_fee_rate` 0 → `new_fee_rate` 250; `ADMIN` `-1000381` | ✅ PASA |
| 5 | `PRE act_as "$ALICE" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json > "$SMOKE_DIR/tx-05.json"`; `G1` = objeto creado `…::game::Game` | `success`; `GameCreated` (`bet` 1000001, `fee_rate` 250, `opponent` none); `gasUsed` anotado | digest `zZHMnX6Zmv58nXJpK7yeArC7gvmzcQtJxzEiB9EVx1f`, `success`; `GameCreated` `bet` `"1000001"`, `fee_rate` 250, `opponent` `null`; gas `1000000`/`2941200`/`0`/`0`; `ALICE` `-4941201` = −1000001 − (1000000 + 2941200 − 0). `G1=0xafbbd8364382d89f78c669ee473664dd87b10729b958ea3dfa218477e3d2a3b3` | ✅ PASA |
| 6 | `sui_getObject` de `G1` (JSON-RPC) → `<repo>/contracts/fixtures/localnet/jsonrpc/game_pending.json` (`jq .`); anotar `storageRebate` | `state` = `{"type": "<PKG>::game::GameState", "variant": "Pending", "fields": {}}`; `bet` y `version` como string; `stake` = `"1000001"` | **JSON-RPC:** `curl … sui_getObject` de `G1` → `HTTP/1.1 404 Not Found`, `content-length: 0` ⇒ **`game_pending.json` NO generada** (H-1, STOP). Lectura alternativa `suic object $G1 --json` (formato propio de la CLI, **no** JSON-RPC): `version` 4, `storageRebate` **1953200**, `stake` `"1000001"`, `bet` y `version` como string, `state` `{"@variant": "Pending"}` | ✅ PASA (on-chain); fixture → #10 (D-20261031-01) |
| 7 | `ALICE` crea `G2` (como el paso 5) y la cancela: `PRE act_as "$ALICE" && suic call --package "$PKG" --module game --function cancel_game --args "$G2" --json > "$SMOKE_DIR/tx-07b.json"`; `sui_getObject` de `G2` → `game_cancelled.json` | `GameCancelled` (`cancelled_by` = `ALICE`, `refund` 1000001); `balanceChanges` de `ALICE` = `+1000001 − gas`; `variant: "Cancelled"`, `stake` `"0"` | Crear `G2` digest `8w5SMNc3PV2ohpmvXXScxF1mABA9F72jaxkRzN5zX9SN` `success`. Cancelar digest `99sLMaghMkATM83rDhho56n1HSZrwZVmocJqKxb3KLGJ` `success`; `GameCancelled` `cancelled_by` = `creator` = `ALICE`, `refund` `"1000001"`; `ALICE` `-988293` = +1000001 − (1000000 + 3929200 − 2940906). CLI: `stake` `"0"`, `@variant` `Cancelled`, `storageRebate` 1953200. **`game_cancelled.json` NO generada** (H-1) | ✅ PASA (on-chain); fixture → #10 (D-20261031-01) |
| 8 | `ALICE` crea `G3` invitación: `… create_game @$HOUSE c.0 "some(@$BOB)"`. `CAROL` intenta aceptar **con presupuesto explícito**: `PRE act_as "$CAROL" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G3 @$HOUSE c.0 @0x8 --gas-budget 100000000 --json > "$SMOKE_DIR/tx-08.json"` | tx con `status` `failure`, `MoveAbort` en el módulo `game` con código **5** (`ENotInvited`); `CAROL` solo pierde gas (su `split` revierte); `G3` sigue `Pending` | Crear `G3` (invitación a `BOB`) digest `HQ5ch1v7u12wQWDShVYvNJESzLZHcwqRK5qifwx8h31P` `success`. `CAROL` acepta: `exit=1`, digest `9afeXGW4xiXg8j2MGdPmExVEEAjnqSrWrur1UkepcX7e`, `status` `failure`: `MoveAbort(… name: Identifier("game") …, function_name: Some("assert_acceptable") }, 5) in command 1`; sin eventos; `CAROL` `-1988372` = solo gas (1000000 + 4712000 − 3723628), el `split` revirtió. `G3` sigue `Pending`, `stake` `"1000001"` | ✅ PASA |
| 9 | `PRE act_as "$BOB" && suic call --package "$PKG" --module game --function reject_game --args "$G3" --json > "$SMOKE_DIR/tx-09.json"` | `GameCancelled` (`cancelled_by` = `BOB`, `creator` = `ALICE`); `ALICE` recibe 1000001; `BOB` solo paga gas | digest `4cEKMRhm6Fb8GTfM8qETGTSQFeNNPrzTQagCdezVQ8TT`, `success`; `GameCancelled` `cancelled_by` = `BOB`, `creator` = `ALICE`, `refund` `"1000001"`; `ALICE` `+1000001`, `BOB` `-2976220` (solo gas: 1000000 + 4172400 − 2196180). `G3` `Cancelled`, `stake` `"0"` | ✅ PASA |
| 10 | `ALICE` crea `G4` (descartable). `BOB`: `PRE act_as "$BOB" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G4 @$HOUSE c.0 @0x8 --split-coins gas "[1]" --gas-budget 100000000 --json` | rechazada **antes** de ejecutar (sin digest ejecutado): "Commands following a command with Random can only be TransferObjects or MergeCoins"; `G4` sigue `Pending` | Crear `G4` digest `8p6YFb5RW9ZvgmE22zeW5uTpSpRfFwid7JrKbRH3cZTZ` `success`. PTB de `BOB`: `exit=1`, **sin digest**: `Error checking transaction input objects: Commands following a command with Random can only be TransferObjects or MergeCoins`. Saldo de `BOB` antes = después = `149999999997023780`; `G4` sigue `Pending`, `stake` `"1000001"` | ✅ PASA |
| 11 | `BOB` acepta `G1`: `PRE act_as "$BOB" && suic ptb --split-coins gas "[1000001]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json > "$SMOKE_DIR/tx-11.json"`; `sui_getObject` de `G1` → `game_resolved.json`; `fees_collected` de la House por JSON-RPC | `GameResolved` con `pot` 2000002, `fee` 50000, `payout` 1950002, `winner` ∈ {`ALICE`, `BOB`}; `balanceChanges`: si gana `ALICE`, `ALICE` `+1950002` y `BOB` `−1000001 − gas`; si gana `BOB`, `BOB` `+950001 − gas`; `fees_collected` = 50000; `variant: "Resolved"`, `fields: {acceptor, winner}`, `stake` `"0"`. Si el `status` es `failure` con `ExecutionCancelledDueToRandomnessUnavailable`, esperar unos segundos y repetir (anotarlo) | digest `9jQySPC1r2HhFTPxKU5bybXBwrkJRfpNkTcH72Ymk9dA`, `success` (sin cancelación por DKG); `GameResolved` `pot` 2000002, `fee` 50000, `payout` 1950002, `winner` = `acceptor` = **`BOB`**; `BOB` `-1524846` = +950001 − (1000000 + 5943200 − 4468353); `ALICE` sin cambio; `fees_collected` `"0"` → `"50000"` (leído por CLI). CLI: `@variant` `Resolved` con `acceptor`/`winner`, `stake` `"0"`, `storageRebate` 2439600. **`game_resolved.json` NO generada** (H-1) | ✅ PASA (on-chain); fixture → #10 (D-20261031-01) |
| 12 | Repetir: `ALICE` crea + `BOB` acepta (usar `G4` primero) hasta ver **ambos** resultados, máx. 12 partidas | al menos un `winner` = `ALICE` y uno = `BOB`; conservación en cada una (`payout + fee = 2 × bet`); `gasUsed` completo (`computationCost`, `storageCost`, `storageRebate`, `nonRefundableStorageFee`) de un resultado de cada lado registrado: **consistente** con D6 (no es prueba: el cómputo se redondea a 1000 unidades; la evidencia de D6 es el código) | 4 partidas más (5 aceptadas en total): `G4` `FmVSBzHZjTgjPGwdNm14yUitGJdLSNo95hrbzg7Bsa3i` → `BOB`; `G6` (crear `DttXMRyHHBDPf5Nm7GEJi3W5RkPMpbPohNcLYDBggVyv`) `AnUpygz7EYM6xV7M6FjxzcKkKsjMfg8fBFqvkG5sxDcR` → `BOB`; `G7` (crear `FDhyUYumSWeym1XqbKY1jPqW9xTGxAztn9exqpqNExYb`) `77y8A48wPB12MeTY6TYFYUU8tZe2MtVszyK3UxoQF1VJ` → `BOB`; `G8` (crear `88uZvArzyUbXrUojSnvgUHCGB42GWEFrv7tK3xC58zDQ`) `6nT3y5c9Pf1UmPAZxkqkQDKrv2GzaDjvd4bJ4zGoKdWY` → **`ALICE`**. Todas `pot` 2000002 = `payout` 1950002 + `fee` 50000. `gasUsed` gana `BOB` (`G7`) = gana `ALICE` (`G8`) = `1000000`/`5943200`/`5456254`/`546`: **consistente** con D6 (no es prueba). `G8`: `ALICE` `+1950002`, `BOB` `-2486947` = −1000001 − 1486946; gana `BOB`: `-536945` = +950001 − 1486946. `fees_collected` = 250000. (`G5` no existe: el contador del bucle empezó en 5 con `G4`) | ✅ PASA |
| 13 | `PRE act_as "$ADMIN" && suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$CAP --assign f --transfer-objects "[f]" @$ADMIN --json > "$SMOKE_DIR/tx-13.json"`; `fees_collected` por JSON-RPC | `FeesWithdrawn.amount` = Σ `fee` de los pasos 11-12; `ADMIN` recibe ese monto (− gas); `fees_collected` = 0 | digest `4ksPzuqEUtew7nYCFt1SVEQNUPogCWb4mfCrZqPPf7JY`, `success`; `FeesWithdrawn.amount` `"250000"` = 5 × 50000; `ADMIN` `-1738381` = +250000 − (1000000 + 4795600 − 3807219); `fees_collected` `"0"`. Conservación global: Σ Δsaldo (`ADMIN` −49984762, `ALICE` −24966689, `BOB` −8598848, `CAROL` −1988372) = −85538671 = −Σ gas neto de las 18 tx ejecutadas ⇒ **suma 0**; las 7 partidas con `stake` `"0"` | ✅ PASA |
| 14 | Tabla de storage (abajo) con los `gasUsed` de crear (5), cancelar (7), rechazar (9) y aceptar (11) y el `storageRebate` del objeto en `Pending` (6), `Cancelled` (7) y `Resolved` (11); actualizar `contracts/README.md` "Objeto terminal y storage" | valores completos; README sin "≈ 0,002–0,003 SUI" | Tabla abajo completa (`gasUsed` de las tx; `storageRebate` del objeto leído por CLI). `contracts/README.md` no se tocó durante la corrida (el encargo restringía la escritura); actualizado después con estos valores, tras D-20261031-01 ("Objeto terminal y storage") | ✅ PASA (README actualizado tras D-20261031-01) |
| 15 | Cierre: `kill "$(cat <SMOKE_DIR>/sui.pid)"`; `rm -rf <SMOKE_DIR>`; `stat`/`ls` del paso 0 (sin `env.sh`); `git status --porcelain`; `git diff --exit-code -- contracts/Move.lock; echo "exit=$?"`; `ls contracts/Pub.*.toml contracts/Published.toml 2>&1`; `jq empty contracts/fixtures/localnet/jsonrpc/*.json; echo "exit=$?"` | `stat`/`ls` idénticos al paso 0; árbol solo con fixtures, README, STATUS y este documento; `exit=0` del lock; sin `Pub.*.toml` ni `Published.toml`; fixtures válidas | `kill 1846452` exit 0; `kill -0` → `No such process`, puerto 9000 libre; `rm -rf <SMOKE_DIR>` → ya no existe. Sin `env.sh`: `stat` `2026-10-30 17:52:52.515735237 -0500 244 /home/santiago/.sui/sui_config/client.yaml` y `ls` `client.yaml` = **idénticos** al paso 0. `git status --porcelain`: ` M documents/REPORTES_ACCEPT.md` (previo a la corrida, ajeno) y ` M documents/SMOKE_ACCEPT.md`. `git diff --exit-code -- contracts/Move.lock` → `exit=0`. `ls contracts/Pub.*.toml contracts/Published.toml` → `No such file or directory` (ambos). `jq empty contracts/fixtures/localnet/jsonrpc/*.json` → `Could not open file …`, `exit=2`: **no hay fixtures** (H-1) | ✅ PASA (cierre limpio; sin fixtures por D-20261031-01) |

### Storage medido (paso 14)

| Transacción / objeto | `computationCost` | `storageCost` | `storageRebate` | `nonRefundableStorageFee` |
|---|---|---|---|---|
| Crear (paso 5, `zZHMnX6Z…`; primera tx de `ALICE`) | 1000000 | 2941200 | 0 | 0 |
| Crear (paso 7, `8w5SMNc3…`; con moneda de gas previa) | 1000000 | 2941200 | 987901 | 99 |
| Cancelar (paso 7, `99sLMagh…`) | 1000000 | 3929200 | 2940906 | 294 |
| Rechazar (paso 9, `4cEKMRhm…`) | 1000000 | 4172400 | 2196180 | 220 |
| Aceptar (paso 11, `9jQySPC1…`, gana `BOB`) | 1000000 | 5943200 | 4468353 | 447 |
| Aceptar (paso 12, `77y8A48w…` gana `BOB` / `6nT3y5c9…` gana `ALICE`) | 1000000 | 5943200 | 5456254 | 546 |
| `Game` `Pending` abierta (`storageRebate` del objeto, `G1`) | — | — | 1953200 | — |
| `Game` `Pending` invitación (`G3`, `opponent` = `some`) | — | — | 2196400 | — |
| `Game` `Cancelled` (`G2` abierta; `G3` invitación: 2196400) | — | — | 1953200 | — |
| `Game` `Resolved` (`G1`, `G4`, `G6`, `G7`, `G8`) | — | — | 2439600 | — |

Lectura: el depósito de storage del `Game` es **1953200 MIST** (≈ 0,00195 SUI) abierta y **2196400** (≈ 0,0022 SUI) con
invitación; al resolverse el objeto crece a **2439600 MIST** (≈ 0,0024 SUI; quien acepta paga la diferencia). Ese monto
queda inmovilizado en el objeto terminal. `storageRebate` del objeto leído con `suic object --json` (no JSON-RPC, H-1).
El `storageRebate` del paso 11 y el del 12 difieren en 987901 = rebate de un objeto `Coin` (988000 × 0,9999) del lado
del gas de `BOB`, no del `Game` (lo mismo entre los dos "Crear").

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

- Pasos PASA/TOTAL: **16/16 on-chain** (0-15). Antes de D-20261031-01 eran 11/16: 6, 7 y 11 fallaban solo por la
  fixture JSON-RPC, 14 quedaba parcial (README) y 15 sin fixtures que validar. Con la decisión, las fixtures pasan a
  #10 y el README de `contracts/` ya tiene el storage medido y la lectura sin JSON-RPC.
- Hallazgos (n° de paso + digest / output):
  - **H-1 (pasos 1, 6, 7, 11, 13, 15) — el fullnode de `sui 1.83.0` no sirve JSON-RPC. Resuelto por D-20261031-01**
    (el usuario difiere las fixtures a #10, que elige gRPC o GraphQL); evidencia original: `curl` `POST
    http://127.0.0.1:9000` (`sui_getObject`, `sui_getChainIdentifier`; rutas `/`, `/json-rpc`, `/rpc`, `/v1`, `/jsonrpc`) →
    `HTTP/1.1 404 Not Found`, `content-length: 0`; el mismo puerto responde `/health` → `up` y cabeceras `x-sui-*`, y la CLI
    funciona (gRPC). En `crates/sui-node/src/lib.rs:2956-3054` @ `testnet-v1.83.0` el servidor HTTP de `json_rpc_address`
    monta **solo** el router de `sui_rpc_api::RpcService` (sin JSON-RPC). `sui start --with-indexer` exige un servidor
    PostgreSQL (aquí solo hay cliente `psql` 18, sin `initdb`), y aun así no está verificado que levante JSON-RPC. Las tres
    fixtures `contracts/fixtures/localnet/jsonrpc/*.json` **no se generaron**; no se sustituyeron por otro formato. Las
    lecturas de estado, `storageRebate` y `fees_collected` se hicieron con `suic object <id> --json` (solo lectura).
  - H-2 (pasos 6, 7, 11): `sui client object --json` en 1.83.0 no usa el formato JSON-RPC: claves `objType`, `prevTx`,
    `storageRebate` numérico, `content` aplanado (sin `dataType`/`fields`), enum como `{"@variant": "Resolved", "acceptor":
    …, "winner": …}` (estilo gRPC/GraphQL del README) y `u16` como número con decimal (`"fee_rate": 250.0`); `u64` como string.
  - H-3 (pasos 4, 5): en `parsedJson` de los eventos de la CLI, los `u16` salen como `250.0`/`0.0` y `opponent` como `null` o
    la dirección (no `{"vec": …}`). Relevante para #10 si parsea salidas de la CLI.
  - H-4 (paso 1): `sui genesis` creó un solo YAML de validador (`127.0.0.1-46555.yaml`, solo el nombre listado); la
    aleatoriedad funcionó desde la primera aceptación (sin `ExecutionCancelledDueToRandomnessUnavailable`).
  - Comportamiento on-chain verificado: abort `game::assert_acceptable` código **5** (paso 8,
    `9afeXGW4xiXg8j2MGdPmExVEEAjnqSrWrur1UkepcX7e`); PTB con comando tras `Random` rechazado sin digest (paso 10);
    ambos resultados del coinflip (`BOB`: `9jQySPC1…`, `FmVSBzHZ…`, `AnUpygz7…`, `77y8A48w…`; `ALICE`: `6nT3y5c9…`) con
    `payout + fee = 2 × bet` y `gasUsed` idéntico; reembolsos del 100 % (pasos 7 y 9); `FeesWithdrawn` = Σ fee (paso 13);
    conservación global exacta (Σ Δsaldo + Σ gas neto = 0).
- Desviaciones del procedimiento (o "ninguna"):
  - Lecturas de objetos (`G1`, `G2`, `G3`, `HOUSE`) con `suic object --json` en lugar de `curl` a JSON-RPC (H-1); solo
    lectura, con el prefijo `PRE`.
  - Extracto estándar con `balanceChanges` reducido a `{owner, amount}` (la CLI agrega `coinType`).
  - Paso 8: la CLI devuelve `exit=1` y el texto del error con el digest en stdout (no JSON); el extracto se tomó con
    `suic tx-block <digest> --json` (como indica "Si algo falla").
  - Paso 12: el bucle numeró la primera partida (que fue `G4`) como "G5"; no existe un `G5` on-chain.
  - Paso 14: `contracts/README.md` se actualizó después de la corrida, tras D-20261031-01 (storage medido y "Lectura
    desde la app" sin JSON-RPC), junto con `agents.md` §2/§3 y `documents/STATUS.md`.
- Veredicto: **PASA (on-chain)** — crear, cancelar, rechazar, aceptar con `Random` real (ambos resultados), retiro de
  comisiones, aborts y conservación pasan en localnet. H-1 resuelto por D-20261031-01: las fixtures de lectura las
  captura #10. (Veredicto inicial de la corrida: NO PASA por H-1, antes de la decisión.)
