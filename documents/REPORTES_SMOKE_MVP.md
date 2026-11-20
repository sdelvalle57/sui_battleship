# REPORTES_SMOKE_MVP
> Issue: #17 | Plan: PLAN_SMOKE_MVP v1 | Handoff: HANDOFF_SMOKE_MVP v1.1 | Branch: `feature/issue-17-mvp-smoke`

## TASK-2

## Task completado: HANDOFF_SMOKE_MVP — TASK-2

### Branch (con SHA corto del HEAD)
`feature/issue-17-mvp-smoke` @ `b246c53`. No hice commits ni pushes.

### Archivos modificados/creados
- `documents/REPORTES_SMOKE_MVP.md`: nuevo, con este reporte. Es el único archivo del árbol que cambia. El harness del
  DEV no me dejó escribir archivos `.md` de reporte, así que lo entrego como texto para que lo cree el orquestador; lo
  mismo pasó en TASK-1 de #16.
- Fuera del repo y sin commitear (DL-2): `<scratchpad>/smoke17-probe/verify-mvp.mjs`, que es la sonda, y el envoltorio
  `run.sh`. Las salidas `out-*.txt` quedan en la misma carpeta.
- `documents/SMOKE_MVP.md` no se creó (DL-1). No toqué código ni `contracts/`.

### Qué se implementó (3 líneas máx)
Implementé la sonda de §Sonda: lecturas gRPC, bloques `pre`, `1`, `2`, `3`, `4a`, `4b`, `h` y `final`, el filtro de salida y
`kRead` con reintento. La ensayé en la localnet aislada, en la variante B, con el recorrido CLI de TASK-2 §3.2, que incluye
las dos ajenas de MINOR-1. Corrí la autoprueba negativa (a) y (b). Los 8 bloques dan **99 PASA / 0 NO PASA**; (a) sale con
exit 1 y (b) con exit 3, con `0x` y sin él.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. El task es de docs (handoff §4) y no corre gates de código (§0).
- `git diff --exit-code -- contracts/Move.lock` da exit 0, también después de publicar.
- `git status --porcelain --untracked-files=all` quedó vacío al cerrar. Antes de crear este reporte no había nada más.
- Tablas de contrato y `app/src/sui/`: no aplica.

### Verificación manual (localnet aislada, variante B)

**Entorno.**
- `<SMOKE_DIR>` = `<scratchpad>/smoke17`, con `net/`, `tmp/` y `home/` vacíos al crearlos.
- `env.sh` es el de `agents.md` §3, con rutas literales:
  - `SUI` = el binario de `suiup`, `sui 1.83.0-16d2dc1e05ed`;
  - `NODE` = Node `v26.13.0`;
  - `MOVE_HOME` = `<HOME real>/.move`.
- `app.env` lleva en la primera línea la guarda `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL; return 97; }`. Define
  `SMOKE_DIR`, `SP`, `REPO`, `NODE` y el `PATH` de Node 26, y nunca se cargó en la misma llamada que `env.sh`.
- `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`. Va delante de
  **todo** `suic`, también de los de solo lectura (B4), y `suic` lleva `printf 'n\n' |`.

**Línea base, en una llamada sin `sui`.**
- `stat -c '%y %s %n'` da `2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml`.
- `ls <HOME real>/.sui/sui_config/` da `client.yaml`.
- Los puertos `9000`, `9123` y `9184` estaban libres y no había ningún `sui start`.
- No existían `contracts/deployments/`, `Published.toml` ni `Pub.*.toml`, y el árbol estaba limpio.
- El worktree no tenía `node_modules`. Corrí `npm ci` con Node 26, que sale con exit 0 y deja `@mysten/sui` `2.37.0`
  (Desviaciones). El árbol siguió limpio.

| # | Paso (TASK-2 §3.2) | Comando (con `PRE`; salidas `--json` a `<SMOKE_DIR>/tx-<clave>.json`, nada impreso salvo status y digest) | Resultado |
|---|---|---|---|
| L-0 | Génesis y arranque | `"$SUI" genesis --working-dir "$SUI_CONFIG_DIR"` → exit 0; `exec "$SUI" start --network.config "$SUI_CONFIG_DIR"` en segundo plano del harness | `:9000` arriba; PID que escucha = `sui.pid`; `suic chain-identifier` → `0b3a2642` |
| L-0b | Cuentas | `suic addresses --json` → `jq` a `ids.env` (`ADMIN` = la activa, `A`, `B`, `C`), sin imprimirlas | 5 cuentas en la génesis; 4 distintas anotadas |
| 1 | `ADMIN` publica (variante B) | `act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` | exit 0; escribió `contracts/deployments/localnet.json` (ignorado); `publishTxDigest` `GrPtoehreccss8TEeYk4hGzfUdbj4GEfqBUL29HQ41rA`; `packageId == originalPackageId`; `Move.lock` sin delta; `git status` vacío. `PKG`, `HOUSE`, `CAP` a `ids.env` con `jq` |
| 1b | `ADMIN`: comisión 200 | `suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 200 --json` | `success`, `6vru6L2EugewCLp9Tc8A7XcVFWvHm5iVo8RqEMZ37s7P` (checkpoint 273) |
| 2 | `ADMIN`: cap a `A` (`dcap`) | `suic call --package "$PKG" --module house --function transfer_house_cap --args "$CAP" "$A" --json` | `success`, `GkHkFqecfLACVR1fN2d7Zy5ESsmSq9xBssTzkvZTBDEo` |
| 3 | Sonda `pre` | — | 11 PASA / 0 NO PASA |
| 4 | `A` crea (`d1c`); `B` acepta (`d1a`) | `suic ptb --split-coins gas "[100000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json`; `suic ptb --split-coins gas "[100000000]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json` | `d1c` `A38sDR6wWmt9GxDs4bhNR3T5hwdQT6XoCwyGYfvZUhYU`, `d1a` `GT5VdKFVmg9vmiPKJSwmpsRbV2cdKKp6X9nZwJNQ7zw9`, ambas `success`; G1 `0x715a…e2cc`. Sonda `1`: 20 PASA / 0 |
| 5 | `A` invita a `B` (`d2c`); `B` acepta (`d2a`) | lo mismo con `"[100000001]"` y `"some(@$B)"` | `d2c` `FXzaE88KGi9u6HPBiXVoE4TghzAXQuMJoyHU4vFVXsHX`, `d2a` `GiMND4AsXxywjS4W6tP4anNsGzMNsMskGQXFfStqqUMT`; G2 `0x95b4…5256`. Sonda `2`: 21 PASA / 0 |
| 6 | **Ajena 1**: `C` crea 1000000, `ADMIN` acepta | los mismos PTB con `"[1000000]"` | crear `Bhm4nA1ENBho935XfywYV1y21SPn966HjaRU6zv4Az5q`, aceptar `VMdm65GPhQ5nnUQNDxUBhUdLZH9S5XwS62PmXZw9gBK` (checkpoint 1972), comisión 40000; `0x6581…281d` |
| 7 | `A` crea (`d3c`) y cancela (`d3x`) | `suic ptb … "[1000000]" … none --json`; `suic call --package "$PKG" --module game --function cancel_game --args "$G3" --json` | `d3c` `3JmjECGyERhFerKyhBZA7VVK1kj77wBt9kwjWHcmYPkZ`, `d3x` `73oAXNgsuW82Un18kkp47AdWWzXbdudhnZtmH5TwDWcf`; G3 `0xa6fe…0abd`. Sonda `3`: 16 PASA / 0 |
| 8 | Sonda `4a` | — | `F4 = 8040000`, con la ajena 1 listada. 2 PASA / 0 |
| 9 | `A` retira (`d4w`) | `suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$CAP --assign fees --transfer-objects "[fees]" @$A --json` | `success`, `GbKgdSkNPAXXooJxxFLP5JnoUjLKb18Wz1Aznn1zeBDV` (checkpoint 2168) |
| 10 | **Ajena 2**, en seguida (misma llamada que `d4w`): `C` crea, `ADMIN` acepta | los mismos PTB con `"[1000000]"` | crear `HfDRgqNTMnGoabbAMGxkTwKCpWZ454jki8EgRDWdMgKq` (2170), aceptar `27YGM7LgC1y6DVDxhaq33V3g4d6qexhRHikQCf1Bpa2c` (**2174**), comisión 40000; `0x39a9…37fd`. **No cayó en el checkpoint de `d4w`** (2168): la ventana `(K4, checkpoint(d4w)]` quedó vacía. La rama de MINOR-1 se ejercitó aparte (ver "Rama de MINOR-1") |
| 10b | Sonda `4b` | — | `amount == 8040000`, `amount ≥ F4`. 7 PASA / 0 |
| 11 | `A`: `dh1` (201), `dh2` (200), `dh3` (2000000 10000000000), `dh4` (1000000 50000000000) | `suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" <bps> --json`; `… update_bet_limits --args "$HOUSE" "$CAP" <min> <max> --json` | `dh1` `9pQgYXsRiaot9ou5oCz6NqZEAFXnxJ9E5vac7sdqpsKi`, `dh2` `3itjSfCSxB2ddsTUeKpYcX3rEYJ4UnXFi96HDjG4M1Hf`, `dh3` `73yTPwh3whEKXiXsKXzX1uraYjQGzZcqjwp7CQ1ybA2H`, `dh4` `72dtsKfSnHSQ4wxc25UxiaDDmnXeQrZVBp9LbZ8oF6Kw`, todas `success`. Sonda `h`: 16 PASA / 0 |
| 12 | Sonda `final` | — | `amount + fees_collected = 8080000`, `fees_collected = 40000`, conservación exacta. 6 PASA / 0 |

Los digests son de una génesis desechable que ya se borró. Las sondas se corrieron con:
`. <SMOKE_DIR>/app.env && cd <repo>/app && "$NODE" --input-type=module - --deployment <repo>/contracts/deployments/localnet.json --url http://127.0.0.1:9000 --digests <scratchpad>/smoke17-probe/digests.json --state <scratchpad>/smoke17-probe/state.json --block <b> < <scratchpad>/smoke17-probe/verify-mvp.mjs`.

La precondición `import('@mysten/sui/grpc')` por la misma vía (stdin, cwd `<repo>/app`) da `ok` con exit 0.

#### Output de la sonda, bloque por bloque (pegado tal cual)

`pre`:
```text
BLOQUE pre · red localnet · paquete 0x3a73…f011
CHECK 0.3 PASA chain id 0b3a2642, json 0b3a2642
CHECK 0.4.shared PASA House 0xd4fc…6f4f Shared y tipo exacto: true
CHECK 0.4.fee_rate PASA fee_rate 200
CHECK 0.4.min_bet PASA min_bet 1000000
CHECK 0.4.max_bet PASA max_bet 50000000000
CHECK 0.4.version PASA version 1
INFO F0 = 0 · K0 = 273 (checkpoint de previousTransaction 6vru6L2EugewCLp9Tc8A7XcVFWvHm5iVo8RqEMZ37s7P)
CHECK 0.5.cap PASA HouseCap 0x5d8b…e657 con dueño AddressOwner (CAP)
INFO gas dcap GkHkFqecfLACVR1fN2d7Zy5ESsmSq9xBssTzkvZTBDEo: 1000228 (computation 1000000, storage 2280000, rebate 2279772)
CHECK 0.5.dcap.success PASA GkHkFqecfLACVR1fN2d7Zy5ESsmSq9xBssTzkvZTBDEo
CHECK 0.5.dcap.cap_id PASA cap_id == houseCapId: true
CHECK 0.5.dcap.recipient PASA recipient == CAP: true
CHECK 0.6 PASA desde el checkpoint 98 de la publicación: 0 GameCreated, 0 GameResolved
RESUMEN 11 PASA / 0 NO PASA
exit=0
```

`1`:
```text
BLOQUE 1 · red localnet · paquete 0x3a73…f011
CHECK 1.B≠A PASA B ≠ A: true
INFO gas d1c A38sDR6wWmt9GxDs4bhNR3T5hwdQT6XoCwyGYfvZUhYU: 3941200 (computation 1000000, storage 2941200, rebate 0)
CHECK 1.d1c.success PASA A38sDR6wWmt9GxDs4bhNR3T5hwdQT6XoCwyGYfvZUhYU
CHECK 1.d1c.sender PASA sender == A: true
CHECK 1.d1c.creator PASA creator == A: true
CHECK 1.d1c.bet PASA bet 100000000
CHECK 1.d1c.opponent PASA opponent none: true
CHECK 1.d1c.fee_rate PASA fee_rate 200
CHECK 1.d1c.delta PASA Δ(A) -103941200 == −bet − gas -103941200
INFO 1.d1c: game_id 0x715a…e2cc
INFO gas d1a GT5VdKFVmg9vmiPKJSwmpsRbV2cdKKp6X9nZwJNQ7zw9: 3462748 (computation 1000000, storage 5943200, rebate 3480452)
CHECK 1.d1a.success PASA GT5VdKFVmg9vmiPKJSwmpsRbV2cdKKp6X9nZwJNQ7zw9
CHECK 1.d1a.game_id PASA game_id == 0x715a…e2cc: true
CHECK 1.d1a.creator PASA creator == A: true
CHECK 1.d1a.acceptor PASA acceptor == B: true
CHECK 1.d1a.winner PASA winner == A
CHECK 1.d1a.pot PASA pot 200000000 (2·bet 200000000)
CHECK 1.d1a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 1.d1a.payout PASA payout 196000000 (pot − fee 196000000)
CHECK 1.d1a.delta.B PASA gana A: Δ(B) -103462748 == −bet − gas -103462748
CHECK 1.d1a.delta.A PASA gana A: Δ(A) 196000000 == +payout 196000000
CHECK 1.d1a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 1.d1a.object PASA 0x715a…e2cc Resolved, acceptor == B y winner == evento: true, stake 0
OBS O-7 d1a: gasBudget 4462748, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 20 PASA / 0 NO PASA
exit=0
```

`2`:
```text
BLOQUE 2 · red localnet · paquete 0x3a73…f011
INFO gas d2c FXzaE88KGi9u6HPBiXVoE4TghzAXQuMJoyHU4vFVXsHX: 2208598 (computation 1000000, storage 3184400, rebate 1975802)
CHECK 2.d2c.success PASA FXzaE88KGi9u6HPBiXVoE4TghzAXQuMJoyHU4vFVXsHX
CHECK 2.d2c.sender PASA sender == A: true
CHECK 2.d2c.creator PASA creator == A: true
CHECK 2.d2c.bet PASA bet 100000001
CHECK 2.d2c.opponent PASA opponent == B: true
CHECK 2.d2c.fee_rate PASA fee_rate 200
CHECK 2.d2c.delta PASA Δ(A) -102208599 == −bet − gas -102208599
INFO 2.d2c: game_id 0x95b4…5256
CHECK 2.d2a.sender PASA sender == B: true
INFO gas d2a GiMND4AsXxywjS4W6tP4anNsGzMNsMskGQXFfStqqUMT: 2474871 (computation 1000000, storage 6186400, rebate 4711529)
CHECK 2.d2a.success PASA GiMND4AsXxywjS4W6tP4anNsGzMNsMskGQXFfStqqUMT
CHECK 2.d2a.game_id PASA game_id == 0x95b4…5256: true
CHECK 2.d2a.creator PASA creator == A: true
CHECK 2.d2a.acceptor PASA acceptor == B: true
CHECK 2.d2a.winner PASA winner == B
CHECK 2.d2a.pot PASA pot 200000002 (2·bet 200000002)
CHECK 2.d2a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 2.d2a.payout PASA payout 196000002 (pot − fee 196000002)
CHECK 2.d2a.delta.B PASA gana B: Δ(B) 93525130 == −bet + payout − gas 93525130
CHECK 2.d2a.delta.A PASA gana B: Δ(A) 0 == 0
CHECK 2.d2a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 2.d2a.object PASA 0x95b4…5256 Resolved, acceptor == B y winner == evento: true, stake 0
CHECK 2.d2a.previousTransaction PASA previousTransaction == d2a: true
OBS O-7 d2a: gasBudget 4462772, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 21 PASA / 0 NO PASA
exit=0
```

`3`:
```text
BLOQUE 3 · red localnet · paquete 0x3a73…f011
INFO gas d3c 3JmjECGyERhFerKyhBZA7VVK1kj77wBt9kwjWHcmYPkZ: 2953299 (computation 1000000, storage 2941200, rebate 987901)
CHECK 3.d3c.success PASA 3JmjECGyERhFerKyhBZA7VVK1kj77wBt9kwjWHcmYPkZ
CHECK 3.d3c.sender PASA sender == A: true
CHECK 3.d3c.creator PASA creator == A: true
CHECK 3.d3c.bet PASA bet 1000000
CHECK 3.d3c.opponent PASA opponent none: true
CHECK 3.d3c.fee_rate PASA fee_rate 200
CHECK 3.d3c.delta PASA Δ(A) -3953299 == −bet − gas -3953299
INFO 3.d3c: game_id 0xa6fe…0abd
INFO gas d3x 73oAXNgsuW82Un18kkp47AdWWzXbdudhnZtmH5TwDWcf: 1988294 (computation 1000000, storage 3929200, rebate 2940906)
CHECK 3.d3x.success PASA 73oAXNgsuW82Un18kkp47AdWWzXbdudhnZtmH5TwDWcf
CHECK 3.d3x.sender PASA sender == A: true
CHECK 3.d3x.game_id PASA game_id == 0xa6fe…0abd: true
CHECK 3.d3x.refund PASA refund 1000000
CHECK 3.d3x.cancelled_by PASA cancelled_by == creator == A: true
CHECK 3.d3x.delta PASA Δ(A,d3x) -988294 == refund − gas -988294
CHECK 3.refund_integro PASA Δ(A,d3c) + Δ(A,d3x) -4941593 == −gas(d3c) − gas(d3x) -4941593
CHECK 3.d3x.sin_house PASA la House no está entre los inputs ni los objetos cambiados: true
CHECK 3.G3 PASA 0xa6fe…0abd Cancelled, stake 0
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

`4a`:
```text
BLOQUE 4a · red localnet · paquete 0x3a73…f011
INFO F4 = 8040000 · K4 = 1972
CHECK 4a.ventana PASA checkpoint(d1a) 1819 y checkpoint(d2a) 1912 en (K0 273, K4 1972]: true
AJENA GameResolved 0x6581…281d fee 40000 checkpoint 1972
INFO ajenas en (K0, K4]: 1, Σ fee 40000
CHECK 4a.F4 PASA F4 8040000 == F0 0 + fee(d1a) 4000000 + fee(d2a) 4000000 + Σ ajenas 40000 = 8040000
RESUMEN 2 PASA / 0 NO PASA
exit=0
```

`4b`:
```text
BLOQUE 4b · red localnet · paquete 0x3a73…f011
INFO gas d4w GbKgdSkNPAXXooJxxFLP5JnoUjLKb18Wz1Aznn1zeBDV: 1000480 (computation 1000000, storage 4795600, rebate 4795120)
CHECK 4b.success PASA GbKgdSkNPAXXooJxxFLP5JnoUjLKb18Wz1Aznn1zeBDV
CHECK 4b.sender PASA sender == CAP: true
INFO CAP == A: true
CHECK 4b.ptb PASA comandos MoveCall,TransferObjects; withdraw_fees + TransferObjects a quien firma: true
CHECK 4b.house_id PASA house_id == houseId: true
CHECK 4b.amount≥F4 PASA amount 8040000 ≥ F4 8040000
INFO checkpoint(d4w) = 2168
CHECK 4b.amount==F4 PASA sin GameResolved en (K4 1972, 2168]: amount 8040000 == F4 8040000
CHECK 4b.delta PASA Δ(CAP,d4w) 7039520 == amount − gas 7039520
RESUMEN 7 PASA / 0 NO PASA
exit=0
```

`h`:
```text
BLOQUE h · red localnet · paquete 0x3a73…f011
INFO gas dh1 9pQgYXsRiaot9ou5oCz6NqZEAFXnxJ9E5vac7sdqpsKi: 12480 (computation 1000000, storage 3807600, rebate 4795120)
CHECK h.dh1.success PASA 9pQgYXsRiaot9ou5oCz6NqZEAFXnxJ9E5vac7sdqpsKi
CHECK h.dh1.sender PASA sender == CAP: true
CHECK h.dh1.valores PASA FeeRateUpdated: old_fee_rate 200, new_fee_rate 201; house_id == houseId: true
CHECK h.dh1.delta PASA Δ(CAP) -12480 == −gas -12480
INFO gas dh2 3itjSfCSxB2ddsTUeKpYcX3rEYJ4UnXFi96HDjG4M1Hf: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh2.success PASA 3itjSfCSxB2ddsTUeKpYcX3rEYJ4UnXFi96HDjG4M1Hf
CHECK h.dh2.sender PASA sender == CAP: true
CHECK h.dh2.valores PASA FeeRateUpdated: old_fee_rate 201, new_fee_rate 200; house_id == houseId: true
CHECK h.dh2.delta PASA Δ(CAP) -1000381 == −gas -1000381
INFO GameCreated en [checkpoint(dh1) 2259, checkpoint(dh2) 2261]: 0
INFO gas dh3 73yTPwh3whEKXiXsKXzX1uraYjQGzZcqjwp7CQ1ybA2H: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh3.success PASA 73yTPwh3whEKXiXsKXzX1uraYjQGzZcqjwp7CQ1ybA2H
CHECK h.dh3.sender PASA sender == CAP: true
CHECK h.dh3.valores PASA BetLimitsUpdated: old_min_bet 1000000, old_max_bet 50000000000, new_min_bet 2000000, new_max_bet 10000000000; house_id == houseId: true
CHECK h.dh3.delta PASA Δ(CAP) -1000381 == −gas -1000381
INFO gas dh4 72dtsKfSnHSQ4wxc25UxiaDDmnXeQrZVBp9LbZ8oF6Kw: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh4.success PASA 72dtsKfSnHSQ4wxc25UxiaDDmnXeQrZVBp9LbZ8oF6Kw
CHECK h.dh4.sender PASA sender == CAP: true
CHECK h.dh4.valores PASA BetLimitsUpdated: old_min_bet 2000000, old_max_bet 10000000000, new_min_bet 1000000, new_max_bet 50000000000; house_id == houseId: true
CHECK h.dh4.delta PASA Δ(CAP) -1000381 == −gas -1000381
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

`final`:
```text
BLOQUE final · red localnet · paquete 0x3a73…f011
CHECK H7.shared PASA House Shared y tipo exacto: true
CHECK H7.fee_rate PASA fee_rate 200
CHECK H7.limites PASA 1000000/50000000000
CHECK H7.version PASA version 1
INFO Ff = fees_collected 40000 · Kf = 2266
RESUELTA G1 0x715a…e2cc fee 4000000 checkpoint 1819
RESUELTA G2 0x95b4…5256 fee 4000000 checkpoint 1912
RESUELTA ajena 0x6581…281d fee 40000 checkpoint 1972
RESUELTA ajena 0x39a9…37fd fee 40000 checkpoint 2174
CHECK H7.comisiones PASA amount 8040000 + Ff 40000 = 8080000 == F0 0 + Σ fee 8080000 (4 GameResolved en (K0 273, Kf 2266], 2 ajenas)
CHECK H7.conservacion PASA Σ Δ(A) + Σ Δ(B) -17989490 == −Σ gas -18029490 + (amount − fee(d1a) − fee(d2a)) 40000 = -17989490
RESUMEN 6 PASA / 0 NO PASA
exit=0
```

#### Valores obtenidos contra esperados

| Valor | Esperado (handoff) | Obtenido | Estado |
|---|---|---|---|
| `balanceChanges` en SDK 2.37 | disponible (o STOP) | disponible en `getTransaction` con `include.balanceChanges` (sin STOP) | ✅ |
| `F0` / `K0` | `F0 == 0` | `F0 = 0`, `K0 = 273` (checkpoint de `update_fee_rate` 200) | ✅ |
| 1: pozo / comisión / pago | 200000000 / 4000000 / 196000000 | 200000000 / 4000000 / 196000000; ganó **A** | ✅ |
| 2: pozo / comisión / pago | 200000002 / 4000000 / 196000002 | 200000002 / 4000000 / 196000002; ganó **B** | ✅ |
| 3: reembolso | 1000000, íntegro | 1000000; `Δ(A,d3c) + Δ(A,d3x) = −gas(d3c) − gas(d3x)` = −4941593 | ✅ |
| `F4` (4a) | `8 040 000` con la ajena 1 listada | `8040000` = 0 + 4000000 + 4000000 + 40000; ajena `0x6581…281d` (checkpoint 1972 = `K4`) | ✅ |
| `amount` (4b) | `== 8040000`, `≥ F4` | `8040000`; ventana `(1972, 2168]` vacía ⇒ `amount == F4` exigido y cumplido | ✅ |
| Ajena 2 en el checkpoint de `d4w` | anotar si cayó o no | **no**: 2174 contra 2168 | anotado |
| `amount + fees_collected` (final) | `8080000` | `8040000 + 40000 = 8080000` = Σ fee de 4 `GameResolved` en `(273, 2266]` | ✅ |
| `fees_collected` (final) | `40000` (la ajena 2) | `40000` | ✅ |
| Conservación | exacta | `Σ Δ(A) + Σ Δ(B)` = −17989490 = −18029490 + 40000 | ✅ |
| H7: House | 200, 1000000/50000000000, versión 1 | 200, 1000000/50000000000, 1 | ✅ |
| O-7 (`gasBudget`, precio) | observación; `≤ 10000000` | `d1a`: 4462748, 1000 → `true`; `d2a`: 4462772, 1000 → `true` (budget estimado por la CLI, no por la app) | obs. |

**Gas de cada transacción** (`computationCost + storageCost − storageRebate`, en MIST). Las de la sonda salen de sus
líneas `INFO gas`; las auxiliares, del `effects.gasUsed` del `--json` de la CLI.

| Tx | Gas | Tx | Gas | Tx | Gas |
|---|---|---|---|---|---|
| fee 200 (aux.) | 1000381 | `d2a` | 2474871 | ajena 2 crear (aux.) | 1965398 |
| `dcap` | 1000228 | ajena 1 crear (aux.) | 3941200 | ajena 2 aceptar (aux.) | 2474847 |
| `d1c` | 3941200 | ajena 1 aceptar (aux.) | 2474847 | `dh1` | 12480 |
| `d1a` | 3462748 | `d3c` | 2953299 | `dh2` | 1000381 |
| `d2c` | 2208598 | `d3x` | 1988294 | `dh3` / `dh4` | 1000381 / 1000381 |
| | | `d4w` | 1000480 | | |

#### Autoprueba negativa

(a) Bloque `1` con `d1a` cambiado por `d2a`, en copias de `digests.json` y `state.json`. Da **exit 1**:
```text
BLOQUE 1 · red localnet · paquete 0x3a73…f011
CHECK 1.B≠A PASA B ≠ A: true
INFO gas d1c A38sDR6wWmt9GxDs4bhNR3T5hwdQT6XoCwyGYfvZUhYU: 3941200 (computation 1000000, storage 2941200, rebate 0)
CHECK 1.d1c.success PASA A38sDR6wWmt9GxDs4bhNR3T5hwdQT6XoCwyGYfvZUhYU
CHECK 1.d1c.sender PASA sender == A: true
CHECK 1.d1c.creator PASA creator == A: true
CHECK 1.d1c.bet PASA bet 100000000
CHECK 1.d1c.opponent PASA opponent none: true
CHECK 1.d1c.fee_rate PASA fee_rate 200
CHECK 1.d1c.delta PASA Δ(A) -103941200 == −bet − gas -103941200
INFO 1.d1c: game_id 0x715a…e2cc
INFO gas d1a GiMND4AsXxywjS4W6tP4anNsGzMNsMskGQXFfStqqUMT: 2474871 (computation 1000000, storage 6186400, rebate 4711529)
CHECK 1.d1a.success PASA GiMND4AsXxywjS4W6tP4anNsGzMNsMskGQXFfStqqUMT
CHECK 1.d1a.game_id NO PASA game_id == 0x715a…e2cc: false
CHECK 1.d1a.creator PASA creator == A: true
CHECK 1.d1a.acceptor PASA acceptor == B: true
CHECK 1.d1a.winner PASA winner == B
CHECK 1.d1a.pot NO PASA pot 200000002 (2·bet 200000000)
CHECK 1.d1a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 1.d1a.payout NO PASA payout 196000002 (pot − fee 196000002)
CHECK 1.d1a.delta.B NO PASA gana B: Δ(B) 93525130 == −bet + payout − gas 93525131
CHECK 1.d1a.delta.A PASA gana B: Δ(A) 0 == 0
CHECK 1.d1a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 1.d1a.object NO PASA 0x715a…e2cc Resolved, acceptor == B y winner == evento: false, stake 0
OBS O-7 d1a: gasBudget 4462772, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 15 PASA / 5 NO PASA
exit=1
```

(b) El filtro de salida. La línea de prueba con 64 hex se arma en memoria y nunca se imprime. Da **exit 3** las dos
veces:
```text
$ "$NODE" --input-type=module - --url http://127.0.0.1:9000 --selftest filter-0x < verify-mvp.mjs
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
$ "$NODE" --input-type=module - --url http://127.0.0.1:9000 --selftest filter-raw < verify-mvp.mjs
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
```

#### Rama de MINOR-1 en `4b` (verificación extra)

La ajena 2 no cayó en el checkpoint de `d4w`, así que la rama "hay `GameResolved` en `(K4, checkpoint(d4w)]`" no se ejercitó
con datos reales. La forcé con una copia de `state.json` con `K4 = 1971`, uno menos que el checkpoint de la ajena 1. La
sonda la lista como ajena, deja de exigir `amount == F4` y no da NO PASA:
```text
BLOQUE 4b · red localnet · paquete 0x3a73…f011
INFO gas d4w GbKgdSkNPAXXooJxxFLP5JnoUjLKb18Wz1Aznn1zeBDV: 1000480 (computation 1000000, storage 4795600, rebate 4795120)
CHECK 4b.success PASA GbKgdSkNPAXXooJxxFLP5JnoUjLKb18Wz1Aznn1zeBDV
CHECK 4b.sender PASA sender == CAP: true
INFO CAP == A: true
CHECK 4b.ptb PASA comandos MoveCall,TransferObjects; withdraw_fees + TransferObjects a quien firma: true
CHECK 4b.house_id PASA house_id == houseId: true
CHECK 4b.amount≥F4 PASA amount 8040000 ≥ F4 8040000
INFO checkpoint(d4w) = 2168
AJENA GameResolved 0x6581…281d fee 40000 checkpoint 1972
INFO 1 GameResolved ajenos en (K4 1971, 2168]: amount == F4 no se exige (la igualdad exacta la da final)
CHECK 4b.delta PASA Δ(CAP,d4w) 7039520 == amount − gas 7039520
RESUMEN 6 PASA / 0 NO PASA
exit=0
```
Guarda de URL: con `--url https://example.com` sale con
`URL no permitida: solo https://fullnode.testnet.sui.io:443 o http://127.0.0.1:9000` y **exit 2**, antes de cargar el SDK.

#### Greps §R-6

Corrí los tres greps sobre `verify-mvp.mjs` y los 12 `out-*.txt`, y después sobre este reporte. Los tres dan vacío:
```text
$ grep -nE '[0-9a-fA-F]{40,64}' verify-mvp.mjs out-*.txt REPORTE_TASK2.txt
$ grep -nE '0x[0-9a-fA-F]{8,}' verify-mvp.mjs out-*.txt REPORTE_TASK2.txt
$ grep -niE '<patrón 3 de §R-6: claves, frases y rutas personales>' verify-mvp.mjs out-*.txt REPORTE_TASK2.txt
(los tres sin salida)
```

#### Cierre M-7 (`agents.md` §3, paso 7)
- `kill "$(cat <SMOKE_DIR>/sui.pid)"` mató solo el PID propio, sin `pkill`. El comando de fondo salió con 144, lo
  esperado ante SIGTERM.
- En otra llamada, `kill -0` falla: el proceso terminó. Después corrí `rm -rf <SMOKE_DIR>` y comprobé que ya no existe;
  `<SMOKE_DIR>/tmp`, con la salida cruda del script de publicación, se borró con él.
- `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments`. Ya no existen `contracts/deployments/`,
  `contracts/Published.toml` ni `contracts/Pub.*.toml`.
- Hice `stat` y `ls` de `<HOME real>/.sui/sui_config/` sin cargar `env.sh`. Dan
  `2026-10-30 17:52:52.515735237 -0500 244 …/client.yaml` y `client.yaml`, **idénticos** a la línea base.
- `git diff --exit-code -- contracts/Move.lock` da exit 0, y `git status --porcelain --untracked-files=all` quedó vacío
  antes del reporte.
- No queda ningún proceso `sui` ni nada escuchando en `9000`, `9123` o `9184`. No lancé Chrome (TASK-2 §3.4) y no toqué
  Docker ni `:4173`.
- En `<scratchpad>/smoke17-probe/` borré `digests.json`, `state.json` y las copias de prueba, que tenían IDs completos de
  la génesis borrada. Quedan `verify-mvp.mjs`, `run.sh` y los `out-*.txt`.

### Desviaciones del handoff
- **Ubicación de la sonda.**
  - Qué cambió: la sonda está en `<scratchpad>/smoke17-probe/verify-mvp.mjs`, no en `<scratchpad>/verify-mvp.mjs`.
    `digests.json` y `state.json` estuvieron en esa misma carpeta.
  - Por qué: `<SMOKE_DIR>` (`<scratchpad>/smoke17`) se borra con `rm -rf` al cerrar, y la sonda tiene que sobrevivir
    para TASK-3. La carpeta hermana sigue dentro del scratchpad.
  - Verificación: ningún proceso de Node leyó nada de `<SMOKE_DIR>/net`. Además, la sonda rechaza con exit 2 las rutas
    con `net/`, `sui_config`, `.sui`, `keystore` o `client.yaml`.
- **`digests.json` solo con las claves de §Sonda.**
  - Qué cambió: los digests auxiliares (`update_fee_rate` 200 y las dos ajenas) fueron a `<SMOKE_DIR>/aux.json`.
  - Por qué: `digests.json` conserva exactamente la forma de §Sonda, que es la que usará TASK-3/4.
- **Agregados a la sonda, que endurecen y no relajan.**
  - Qué cambió:
    - exit 5 = error de lectura o dato faltante (`ERROR <message>`), un código que la especificación no definía;
    - exit 2 también si `deployment.network` no corresponde a la URL, o si en testnet el `chainId` no es `4c78adac`,
      siempre antes de pedir nada;
    - `--selftest filter-0x|filter-raw` para la autoprueba (b);
    - las líneas `INFO gas`, `INFO` con `F0`/`K0`/`F4`/`K4`/`Kf` y los checkpoints, y `OBS O-7`;
    - checks extra:
      - `sender == A` y `Δ(A) == −bet − gas` también en `d2c` y `d3c`;
      - `4a.ventana`: `d1a` y `d2a` caen en `(K0, K4]`;
      - `house_id == houseId` en los eventos de admin;
      - en `4b`, que el `TransferObjects` mueve el resultado del comando 0;
      - en `d3x`, que la House tampoco aparece entre los objetos cambiados;
    - cada evento se decodifica por BCS y se re-serializa, y la sonda exige los mismos bytes (`contracts/README.md`,
      "Lectura desde la app").
  - Por qué: así un fallo no pasa por PASA, y quedan anotados el gas y los checkpoints que pide §6.
  - Verificación: la autoprueba (a) marca 5 NO PASA y sale con exit 1.
- **`npm ci` en el worktree.**
  - Qué cambió: corrí `npm ci` con Node 26 desde `<repo>`, que sale con exit 0 (`@mysten/sui` 2.37.0).
  - Por qué: el worktree no tenía `node_modules` y la sonda resuelve `@mysten/sui` desde `<repo>/app`.
  - Verificación: `node_modules/` está ignorado y el árbol siguió limpio.
- **Rama de MINOR-1 en `4b`.**
  - Qué cambió: la ejercité con un `state` sintético (`K4 = 1971`).
  - Por qué: la ajena 2 real cayó 6 checkpoints después de `d4w`.
  - Verificación: el output está en "Rama de MINOR-1".
- La forma `none`/`some(@$B)` del `Option` funcionó tal cual en `create_game`, así que no hubo desviación ahí.

### Riesgos / pendientes
1. **Conservación con la custodia N-3 = "importar la publicadora".** La igualdad de `final` suma `Δ(A) + Δ(B)` y supone
   `CAP == A`. Si el owner elige no transferir el cap (S-5) y `CAP ∉ {A, B}`, el `Δ` de `d4w` cae en `CAP` y la igualdad
   falla. Propuesta para el handoff v1.2: sumar `Δ(CAP)` cuando `CAP ∉ {A, B}`, o exigir `transfer_house_cap` a A.
   La sonda imprime `CAP == A` en `4b`.
2. **Piso de historial en testnet.** `pre`/0.6 escanea desde el checkpoint de `publishTxDigest`; `4a`, `4b` y `final`
   escanean desde `K0`. Si la publicación de #8 queda más de ≈ 14,6 días antes de TASK-3, `ListEvents` da `OUT_OF_RANGE`,
   la sonda sale con `ERROR` y exit 5, y 0.6 no se puede medir. Conviene correr TASK-3/4 dentro de la ventana o que el
   handoff v1.2 defina la cota de 0.6 (`máx(publicación, piso + margen)`, como `eventScan.ts`).
3. **O-7 no es representativo en localnet.** El `gasBudget` medido (4462748) lo estimó la CLI. El de la app se mide en
   TASK-4.
4. **Volumen del escaneo en testnet.** El escaneo es descendente desde el tope, con `limit` 100 y un tope de 10 000 páginas.
   Con mucha actividad ajena del paquete sería lento, pero no incorrecto.
5. La sonda usa `effects`, `events`, `transaction` y `balanceChanges` de `getTransaction`, `json` y `previousTransaction`
   de `getObject`, `getServiceInfo` y `ListEvents` crudo. No usa `simulateTransaction` ni `dryRun` (§R-2).

### Documentación
- READMEs / agents.md actualizados: no aplica, porque el task es un ensayo y no cambia comandos ni contrato.
- Snippet propuesto para `documents/STATUS.md`: "#17 TASK-2: sonda de verificación ensayada en la localnet aislada
  (variante B): 8 bloques, 99 PASA / 0 NO PASA; autoprueba negativa exit 1 y exit 3. Siguiente: handoff v1.2 con el texto
  de la sonda (precondición de TASK-3)."

### Texto final de la sonda (para el handoff v1.2, precondición de TASK-3)

Es el archivo `<scratchpad>/smoke17-probe/verify-mvp.mjs` tal cual se ensayó. Pasa los greps de §R-6 y no lleva rutas,
direcciones ni claves.

```js
// verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP §Sonda). Solo lecturas gRPC.
// Vive en <scratchpad> y no se commitea (DL-2). Uso, con cwd <repo>/app para resolver @mysten/sui:
//   cd <repo>/app && "$NODE" --input-type=module - --deployment <json> --url <url> --digests <json> --state <json> \
//     --block pre|1|2|3|4a|4b|h|final < <scratchpad>/verify-mvp.mjs
// Autoprueba del filtro (b): --selftest filter-0x | filter-raw (sale con código 3, sin red).
// Códigos: 0 todo PASA · 1 algún NO PASA · 2 URL/red/ruta no permitida (antes de pedir nada) · 3 filtro de salida ·
// 4 SIN CHECKPOINT (repetir el bloque) · 5 error de lectura o datos faltantes.
// Nunca imprime direcciones: las identidades A, B y CAP viven solo en memoria; se imprimen comparaciones.
import process from 'node:process';

// ---------- Filtro de salida (§R-6): toda línea pasa por aquí. ----------
const LONG_HEX = /[0-9a-fA-F]{40,}/;
function emit(line) {
  if (LONG_HEX.test(line)) {
    process.stdout.write('FILTRO: línea cortada (hex de 40 o más caracteres)\n');
    process.exit(3);
  }
  process.stdout.write(`${line}\n`);
}

// ---------- Argumentos y guarda de URL: nada de red ni de SDK antes de esto. ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      emit(`argumento inválido: ${key ?? ''}`);
      process.exit(2);
    }
    out[key.slice(2)] = value;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const ALLOWED = new Map([
  ['https://fullnode.testnet.sui.io:443', 'testnet'],
  ['http://127.0.0.1:9000', 'localnet'],
]);
const network = ALLOWED.get(args.url);
if (!network) {
  emit('URL no permitida: solo https://fullnode.testnet.sui.io:443 o http://127.0.0.1:9000');
  process.exit(2);
}

if (args.selftest !== undefined) {
  // Autoprueba (b): la línea se arma en memoria con 64 hex y nunca se imprime (el filtro la corta y sale con 3).
  const hex = Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(i * 7 + 3) % 16]).join('');
  if (args.selftest === 'filter-0x') emit(`CHECK selftest PASA id 0x${hex}`);
  else if (args.selftest === 'filter-raw') emit(`CHECK selftest PASA id ${hex}`);
  emit('selftest desconocido');
  process.exit(5);
}

for (const key of ['deployment', 'digests', 'state', 'block']) {
  if (!args[key]) {
    emit(`falta --${key}`);
    process.exit(2);
  }
}
// Ningún archivo de la red local (keystore, client.yaml…) ni de una config de la CLI.
for (const key of ['deployment', 'digests', 'state']) {
  if (/(^|\/)net(\/|$)|sui_config|\.sui(\/|$)|keystore|client\.yaml/.test(args[key])) {
    emit(`ruta no permitida en --${key}`);
    process.exit(2);
  }
}

const { readFile, writeFile } = await import('node:fs/promises');
const deployment = JSON.parse(await readFile(args.deployment, 'utf8'));
if (deployment.network !== network || (network === 'testnet' && deployment.chainId !== '4c78adac')) {
  emit(`el despliegue (${String(deployment.network)}) no corresponde a la URL (${network})`);
  process.exit(2);
}

const { SuiGrpcClient, GrpcTypes } = await import('@mysten/sui/grpc');
const { bcs } = await import('@mysten/sui/bcs');
const { fromBase58, fromBase64, toBase64, toHex, normalizeSuiAddress, normalizeStructTag } = await import(
  '@mysten/sui/utils'
);

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
};
const digests = await readJson(args.digests);
const state = await readJson(args.state);
const saveState = (patch) => {
  Object.assign(state, patch);
  return writeFile(args.state, `${JSON.stringify(state, null, 2)}\n`);
};

const client = new SuiGrpcClient({ network, baseUrl: args.url });
const PKG = normalizeSuiAddress(deployment.packageId);
const ORIG = normalizeSuiAddress(deployment.originalPackageId);
const HOUSE = normalizeSuiAddress(deployment.houseId);
const CAP_ID = normalizeSuiAddress(deployment.houseCapId);
const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');

// ---------- Salida ----------
let passed = 0;
let failed = 0;
function check(id, ok, detail = '') {
  if (ok) passed += 1;
  else failed += 1;
  emit(`CHECK ${id} ${ok ? 'PASA' : 'NO PASA'}${detail ? ` ${detail}` : ''}`);
}
const info = (line) => emit(`INFO ${line}`);
const obs = (line) => emit(`OBS ${line}`);
class Missing extends Error {}

// ---------- Auxiliares ----------
const norm = (a) => normalizeSuiAddress(a);
const abbr = (id) => {
  const h = norm(id);
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
};
const sameType = (a, b) => normalizeStructTag(a) === normalizeStructTag(b);
const need = (key) => {
  if (!digests[key]) throw new Missing(`falta el digest ${key} en --digests`);
  return digests[key];
};
const needState = (key, block) => {
  if (state[key] === undefined) throw new Missing(`falta ${key} en --state: correr antes el bloque ${block}`);
  return state[key];
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const txCache = new Map();
async function tx(digest) {
  if (!txCache.has(digest)) {
    const result = await client.getTransaction({
      digest,
      include: { effects: true, events: true, transaction: true, balanceChanges: true },
    });
    const body = result[result.$kind];
    if (!Array.isArray(body.balanceChanges)) throw new Missing('STOP: el SDK no devolvió balanceChanges');
    txCache.set(digest, result);
  }
  return txCache.get(digest);
}
const body = (r) => r[r.$kind];
const isSuccess = (r) => r.$kind === 'Transaction' && body(r).effects?.status?.success === true;
const senderOf = (r) => norm(body(r).transaction.sender);
function gas(r) {
  const g = body(r).effects.gasUsed;
  return BigInt(g.computationCost) + BigInt(g.storageCost) - BigInt(g.storageRebate);
}
function delta(address, r) {
  return body(r)
    .balanceChanges.filter((c) => norm(c.address) === address && normalizeStructTag(c.coinType) === SUI_TYPE)
    .reduce((sum, c) => sum + BigInt(c.amount), 0n);
}
function gasLine(key, r) {
  const g = body(r).effects.gasUsed;
  info(
    `gas ${key} ${body(r).digest}: ${gas(r)} (computation ${g.computationCost}, storage ${g.storageCost}, rebate ${g.storageRebate})`,
  );
}

/** Checkpoint de un digest, con reintento cada 500 ms hasta 30 s (TX_INDEX_TIMEOUT_MS). Nunca 0. */
async function checkpointOf(digest) {
  const start = Date.now();
  for (;;) {
    const r = await client.getTransaction({ digest, include: {} });
    const cp = body(r).checkpoint;
    if (cp !== null && cp !== undefined) return BigInt(cp);
    if (Date.now() - start >= 30_000) {
      emit('SIN CHECKPOINT: repetir el bloque');
      process.exit(4);
    }
    await sleep(500);
  }
}
/** kRead (DL-9): checkpoint de la previousTransaction del objeto leído. */
const kRead = (object) => checkpointOf(object.previousTransaction);

// ---------- BCS de eventos (contracts/README.md, "Eventos") ----------
const Addr = bcs.Address;
const SCHEMAS = {
  'game::GameCreated': bcs.struct('GameCreated', {
    game_id: Addr,
    creator: Addr,
    opponent: bcs.option(Addr),
    bet: bcs.u64(),
    fee_rate: bcs.u16(),
  }),
  'game::GameCancelled': bcs.struct('GameCancelled', {
    game_id: Addr,
    creator: Addr,
    cancelled_by: Addr,
    refund: bcs.u64(),
  }),
  'game::GameResolved': bcs.struct('GameResolved', {
    game_id: Addr,
    creator: Addr,
    acceptor: Addr,
    winner: Addr,
    pot: bcs.u64(),
    fee: bcs.u64(),
    payout: bcs.u64(),
  }),
  'house::FeeRateUpdated': bcs.struct('FeeRateUpdated', { house_id: Addr, old_fee_rate: bcs.u16(), new_fee_rate: bcs.u16() }),
  'house::BetLimitsUpdated': bcs.struct('BetLimitsUpdated', {
    house_id: Addr,
    old_min_bet: bcs.u64(),
    old_max_bet: bcs.u64(),
    new_min_bet: bcs.u64(),
    new_max_bet: bcs.u64(),
  }),
  'house::FeesWithdrawn': bcs.struct('FeesWithdrawn', { house_id: Addr, amount: bcs.u64() }),
  'house::HouseCapTransferred': bcs.struct('HouseCapTransferred', { cap_id: Addr, recipient: Addr }),
};
function decode(name, bytes) {
  const schema = SCHEMAS[name];
  const value = schema.parse(bytes);
  if (toBase64(schema.serialize(value).toBytes()) !== toBase64(bytes)) throw new Error(`BCS de ${name} con bytes sobrantes`);
  return value;
}
const eventType = (name) => `${ORIG}::${name}`;
/** Eventos de un tipo exacto en una transacción, decodificados. */
const txEvents = (r, name) =>
  (body(r).events ?? []).filter((e) => sameType(e.eventType, eventType(name))).map((e) => decode(name, e.bcs));

const { Ordering, QueryEndReason } = GrpcTypes;
/** ListEvents crudo descendente desde el tope hasta la cota `startCheckpoint` (app/src/sui/eventScan.ts). */
async function scanEvents(name, startCheckpoint) {
  const type = eventType(name);
  const filter = {
    terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType: type } } }] }],
  };
  const out = [];
  let before;
  for (let page = 0; page < 10_000; page += 1) {
    const call = client.ledgerService.listEvents({
      readMask: { paths: ['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index'] },
      startCheckpoint,
      filter,
      options: { limit: 100, ordering: Ordering.DESCENDING, before },
    });
    let cursor;
    let reason;
    for await (const frame of call.responses) {
      if (frame.watermark?.cursor) cursor = frame.watermark.cursor;
      if (frame.event) {
        if (!sameType(frame.event.eventType ?? '', type)) throw new Error('ListEvents devolvió otro tipo de evento');
        out.push({
          v: decode(name, frame.event.contents?.value ?? new Uint8Array()),
          checkpoint: BigInt(frame.event.checkpoint),
          digest: frame.event.transactionDigest,
        });
      }
      if (frame.end) reason = frame.end.reason;
    }
    if (reason === undefined) throw new Error('ListEvents terminó sin QueryEnd');
    if (reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT) {
      before = cursor;
      continue;
    }
    if (
      reason === QueryEndReason.CHECKPOINT_BOUND ||
      reason === QueryEndReason.LEDGER_TIP ||
      reason === QueryEndReason.CURSOR_BOUND
    ) {
      return out.filter((e) => e.checkpoint >= startCheckpoint).reverse();
    }
    throw new Error(`ListEvents terminó con un reason no reconocido (${String(reason)})`);
  }
  throw new Error('ListEvents: demasiadas páginas');
}

// ---------- Objetos ----------
async function readObject(objectId) {
  const { object } = await client.getObject({ objectId, include: { json: true, previousTransaction: true } });
  return object;
}
const u64 = (v) => String(typeof v === 'object' && v !== null && 'value' in v ? v.value : v);
async function readHouse() {
  const house = await readObject(HOUSE);
  const j = house.json;
  return {
    object: house,
    shared: house.owner?.$kind === 'Shared' && sameType(house.type, `${ORIG}::house::House`),
    feeRate: Number(j.fee_rate),
    minBet: u64(j.min_bet),
    maxBet: u64(j.max_bet),
    version: u64(j.version),
    fees: BigInt(u64(j.fees_collected)),
  };
}
async function capOwner() {
  const { object } = await client.getObject({ objectId: CAP_ID });
  if (!sameType(object.type, `${ORIG}::house::HouseCap`)) throw new Error('houseCapId no es un HouseCap del paquete');
  if (object.owner?.$kind !== 'AddressOwner') throw new Error(`el HouseCap no tiene dueño de dirección (${object.owner?.$kind})`);
  return norm(object.owner.AddressOwner);
}

// ---------- Identidades (solo en memoria) ----------
const idA = async () => senderOf(await tx(need('d1c')));
const idB = async () => senderOf(await tx(need('d1a')));

/** Un único evento del tipo en la transacción; si no hay exactamente uno, NO PASA y `null`. */
function single(id, r, name) {
  const events = txEvents(r, name);
  if (events.length !== 1) {
    check(id, false, `${events.length} eventos ${name}`);
    return null;
  }
  return events[0];
}

// ---------- Bloques ----------
async function blockPre() {
  const { response: serviceInfo } = await client.ledgerService.getServiceInfo({});
  const chainHex = toHex(fromBase58(serviceInfo.chainId)).slice(0, 8);
  check('0.3', chainHex === deployment.chainId, `chain id ${chainHex}, json ${deployment.chainId}`);

  const h = await readHouse();
  check('0.4.shared', h.shared, `House ${abbr(HOUSE)} Shared y tipo exacto: ${h.shared}`);
  check('0.4.fee_rate', h.feeRate === 200, `fee_rate ${h.feeRate}`);
  check('0.4.min_bet', h.minBet === '1000000', `min_bet ${h.minBet}`);
  check('0.4.max_bet', h.maxBet === '50000000000', `max_bet ${h.maxBet}`);
  check('0.4.version', h.version === '1', `version ${h.version}`);
  const K0 = await kRead(h.object);
  info(`F0 = ${h.fees} · K0 = ${K0} (checkpoint de previousTransaction ${h.object.previousTransaction})`);
  await saveState({ F0: h.fees.toString(), K0: K0.toString() });

  const cap = await capOwner();
  check('0.5.cap', true, `HouseCap ${abbr(CAP_ID)} con dueño AddressOwner (CAP)`);
  if (digests.dcap) {
    const r = await tx(digests.dcap);
    gasLine('dcap', r);
    check('0.5.dcap.success', isSuccess(r), digests.dcap);
    const e = single('0.5.dcap.event', r, 'house::HouseCapTransferred');
    if (e) {
      check('0.5.dcap.cap_id', norm(e.cap_id) === CAP_ID, `cap_id == houseCapId: ${norm(e.cap_id) === CAP_ID}`);
      check('0.5.dcap.recipient', norm(e.recipient) === cap, `recipient == CAP: ${norm(e.recipient) === cap}`);
    }
  } else {
    info('sin dcap: 0.5 solo con el dueño actual');
  }

  const kp = await checkpointOf(deployment.publishTxDigest);
  const created = await scanEvents('game::GameCreated', kp);
  const resolved = await scanEvents('game::GameResolved', kp);
  check('0.6', true, `desde el checkpoint ${kp} de la publicación: ${created.length} GameCreated, ${resolved.length} GameResolved`);
  for (const e of created) emit(`AJENA GameCreated ${abbr(e.v.game_id)} fee_rate ${e.v.fee_rate} checkpoint ${e.checkpoint}`);
  for (const e of resolved) emit(`AJENA GameResolved ${abbr(e.v.game_id)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
}

/** Crear: `success`, un `GameCreated` exacto y `Δ(A) == −bet − gas`. Devuelve el evento o `null`. */
async function verifyCreate(p, key, A, expect) {
  const r = await tx(need(key));
  gasLine(key, r);
  check(`${p}.success`, isSuccess(r), digests[key]);
  check(`${p}.sender`, senderOf(r) === A, `sender == A: ${senderOf(r) === A}`);
  const e = single(`${p}.event`, r, 'game::GameCreated');
  if (!e) return null;
  const opponentOk = expect.opponent === null ? e.opponent === null : e.opponent !== null && norm(e.opponent) === expect.opponent;
  check(`${p}.creator`, norm(e.creator) === A, `creator == A: ${norm(e.creator) === A}`);
  check(`${p}.bet`, e.bet === expect.bet, `bet ${e.bet}`);
  check(`${p}.opponent`, opponentOk, expect.opponent === null ? `opponent none: ${e.opponent === null}` : `opponent == B: ${opponentOk}`);
  check(`${p}.fee_rate`, e.fee_rate === expect.feeRate, `fee_rate ${e.fee_rate}`);
  const d = delta(A, r);
  const want = -BigInt(e.bet) - gas(r);
  check(`${p}.delta`, d === want, `Δ(A) ${d} == −bet − gas ${want}`);
  info(`${p}: game_id ${abbr(e.game_id)}`);
  return e;
}

/** Aceptar: evento, montos, balances según `winner`, forma del PTB, objeto y O-7. Devuelve el `GameResolved` o `null`. */
async function verifyAccept(p, key, { A, B, created, expect }) {
  const r = await tx(need(key));
  gasLine(key, r);
  const G = norm(created.game_id);
  check(`${p}.success`, isSuccess(r), digests[key]);
  const e = single(`${p}.event`, r, 'game::GameResolved');
  if (!e) return null;
  const bet = BigInt(created.bet);
  const pot = BigInt(e.pot);
  const fee = BigInt(e.fee);
  const payout = BigInt(e.payout);
  const winner = norm(e.winner);
  check(`${p}.game_id`, norm(e.game_id) === G, `game_id == ${abbr(G)}: ${norm(e.game_id) === G}`);
  check(`${p}.creator`, norm(e.creator) === A, `creator == A: ${norm(e.creator) === A}`);
  check(`${p}.acceptor`, norm(e.acceptor) === B, `acceptor == B: ${norm(e.acceptor) === B}`);
  check(`${p}.winner`, winner === A || winner === B, winner === A ? 'winner == A' : winner === B ? 'winner == B' : 'winner ∉ {A,B}');
  check(`${p}.pot`, pot === 2n * bet && e.pot === expect.pot, `pot ${e.pot} (2·bet ${2n * bet})`);
  const feeWant = (pot * BigInt(created.fee_rate)) / 10_000n;
  check(`${p}.fee`, fee === feeWant && e.fee === expect.fee, `fee ${e.fee} (⌊pot·${created.fee_rate}/10000⌋ = ${feeWant})`);
  check(`${p}.payout`, payout === pot - fee && e.payout === expect.payout, `payout ${e.payout} (pot − fee ${pot - fee})`);
  const dA = delta(A, r);
  const dB = delta(B, r);
  const g = gas(r);
  if (winner === A) {
    check(`${p}.delta.B`, dB === -bet - g, `gana A: Δ(B) ${dB} == −bet − gas ${-bet - g}`);
    check(`${p}.delta.A`, dA === payout, `gana A: Δ(A) ${dA} == +payout ${payout}`);
  } else {
    check(`${p}.delta.B`, dB === -bet + payout - g, `gana B: Δ(B) ${dB} == −bet + payout − gas ${-bet + payout - g}`);
    check(`${p}.delta.A`, dA === 0n, `gana B: Δ(A) ${dA} == 0`);
  }
  const commands = body(r).transaction.commands;
  const lastCall = commands.map((c) => c.$kind).lastIndexOf('MoveCall');
  const call = commands[lastCall]?.MoveCall;
  const shapeOk =
    lastCall >= 0 &&
    norm(call.package) === PKG &&
    call.module === 'game' &&
    call.function === 'accept_game' &&
    commands.slice(lastCall + 1).every((c) => c.$kind === 'TransferObjects' || c.$kind === 'MergeCoins');
  check(`${p}.ptb`, shapeOk, `comandos ${commands.map((c) => c.$kind).join(',')}; accept_game último MoveCall: ${shapeOk}`);
  const game = await readObject(G);
  const s = game.json.state;
  const objOk =
    sameType(game.type, `${ORIG}::game::Game`) &&
    s['@variant'] === 'Resolved' &&
    norm(s.acceptor) === B &&
    norm(s.winner) === winner &&
    u64(game.json.stake) === '0';
  check(`${p}.object`, objOk, `${abbr(G)} ${s['@variant']}, acceptor == B y winner == evento: ${objOk}, stake ${u64(game.json.stake)}`);
  if (expect.previousIsAccept) {
    check(`${p}.previousTransaction`, game.previousTransaction === digests[key], `previousTransaction == ${key}: ${game.previousTransaction === digests[key]}`);
  }
  const gd = body(r).transaction.gasData;
  obs(`O-7 ${key}: gasBudget ${gd.budget}, gasPrice ${gd.price}, gasBudget ≤ 10000000: ${BigInt(gd.budget) <= 10_000_000n}`);
  return e;
}

async function block1() {
  const A = await idA();
  const B = await idB();
  check('1.B≠A', A !== B, `B ≠ A: ${A !== B}`);
  const created = await verifyCreate('1.d1c', 'd1c', A, { bet: '100000000', opponent: null, feeRate: 200 });
  if (!created) return;
  await saveState({ G1: norm(created.game_id) });
  await verifyAccept('1.d1a', 'd1a', {
    A,
    B,
    created,
    expect: { pot: '200000000', fee: '4000000', payout: '196000000', previousIsAccept: false },
  });
}

async function block2() {
  const A = await idA();
  const B = await idB();
  const created = await verifyCreate('2.d2c', 'd2c', A, { bet: '100000001', opponent: B, feeRate: 200 });
  if (!created) return;
  await saveState({ G2: norm(created.game_id) });
  const r = await tx(need('d2a'));
  check('2.d2a.sender', senderOf(r) === B, `sender == B: ${senderOf(r) === B}`);
  await verifyAccept('2.d2a', 'd2a', {
    A,
    B,
    created,
    expect: { pot: '200000002', fee: '4000000', payout: '196000002', previousIsAccept: true },
  });
}

async function block3() {
  const A = await idA();
  const created = await verifyCreate('3.d3c', 'd3c', A, { bet: '1000000', opponent: null, feeRate: 200 });
  if (!created) return;
  const G3 = norm(created.game_id);
  await saveState({ G3 });
  const rc = await tx(need('d3c'));
  const r = await tx(need('d3x'));
  gasLine('d3x', r);
  check('3.d3x.success', isSuccess(r), digests.d3x);
  check('3.d3x.sender', senderOf(r) === A, `sender == A: ${senderOf(r) === A}`);
  const e = single('3.d3x.event', r, 'game::GameCancelled');
  if (e) {
    check('3.d3x.game_id', norm(e.game_id) === G3, `game_id == ${abbr(G3)}: ${norm(e.game_id) === G3}`);
    check('3.d3x.refund', e.refund === '1000000', `refund ${e.refund}`);
    const byOk = norm(e.cancelled_by) === norm(e.creator) && norm(e.creator) === A;
    check('3.d3x.cancelled_by', byOk, `cancelled_by == creator == A: ${byOk}`);
    const dx = delta(A, r);
    check('3.d3x.delta', dx === BigInt(e.refund) - gas(r), `Δ(A,d3x) ${dx} == refund − gas ${BigInt(e.refund) - gas(r)}`);
    const sum = delta(A, rc) + dx;
    const want = -gas(rc) - gas(r);
    check('3.refund_integro', sum === want, `Δ(A,d3c) + Δ(A,d3x) ${sum} == −gas(d3c) − gas(d3x) ${want}`);
  }
  const inputIds = body(r)
    .transaction.inputs.filter((i) => i.$kind === 'Object')
    .map((i) => norm(i.Object[i.Object.$kind].objectId));
  const changed = body(r).effects.changedObjects.map((c) => norm(c.objectId));
  const houseOut = !inputIds.includes(HOUSE) && !changed.includes(HOUSE);
  check('3.d3x.sin_house', houseOut, `la House no está entre los inputs ni los objetos cambiados: ${houseOut}`);
  const game = await readObject(G3);
  const objOk = game.json.state['@variant'] === 'Cancelled' && u64(game.json.stake) === '0';
  check('3.G3', objOk, `${abbr(G3)} ${game.json.state['@variant']}, stake ${u64(game.json.stake)}`);
  if (digests.dO1) {
    const ro = await tx(digests.dO1);
    check('3.dO1.sender', senderOf(ro) === A, `sender(dO1) == A: ${senderOf(ro) === A}`);
  }
}

async function resolvedFee(key) {
  const e = txEvents(await tx(need(key)), 'game::GameResolved');
  if (e.length !== 1) throw new Error(`${key} no tiene exactamente un GameResolved`);
  return e[0];
}
async function createdGame(key) {
  const e = txEvents(await tx(need(key)), 'game::GameCreated');
  if (e.length !== 1) throw new Error(`${key} no tiene exactamente un GameCreated`);
  return norm(e[0].game_id);
}

async function block4a() {
  const K0 = BigInt(needState('K0', 'pre'));
  const F0 = BigInt(needState('F0', 'pre'));
  const G1 = await createdGame('d1c');
  const G2 = await createdGame('d2c');
  const fee1 = BigInt((await resolvedFee('d1a')).fee);
  const fee2 = BigInt((await resolvedFee('d2a')).fee);
  const h = await readHouse();
  const F4 = h.fees;
  const K4 = await kRead(h.object);
  info(`F4 = ${F4} · K4 = ${K4}`);
  const c1 = await checkpointOf(need('d1a'));
  const c2 = await checkpointOf(need('d2a'));
  const inWindow = c1 > K0 && c1 <= K4 && c2 > K0 && c2 <= K4;
  check('4a.ventana', inWindow, `checkpoint(d1a) ${c1} y checkpoint(d2a) ${c2} en (K0 ${K0}, K4 ${K4}]: ${inWindow}`);
  const resolved = await scanEvents('game::GameResolved', K0 + 1n);
  const others = resolved.filter((e) => e.checkpoint > K0 && e.checkpoint <= K4 && ![G1, G2].includes(norm(e.v.game_id)));
  let sum = 0n;
  for (const e of others) {
    sum += BigInt(e.v.fee);
    emit(`AJENA GameResolved ${abbr(e.v.game_id)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
  }
  info(`ajenas en (K0, K4]: ${others.length}, Σ fee ${sum}`);
  const want = F0 + fee1 + fee2 + sum;
  check('4a.F4', F4 === want, `F4 ${F4} == F0 ${F0} + fee(d1a) ${fee1} + fee(d2a) ${fee2} + Σ ajenas ${sum} = ${want}`);
  await saveState({ K4: K4.toString(), amount4a: F4.toString() });
}

async function block4b() {
  const K4 = BigInt(needState('K4', '4a'));
  const F4 = BigInt(needState('amount4a', '4a'));
  const cap = await capOwner();
  const r = await tx(need('d4w'));
  gasLine('d4w', r);
  check('4b.success', isSuccess(r), digests.d4w);
  const sender = senderOf(r);
  check('4b.sender', sender === cap, `sender == CAP: ${sender === cap}`);
  if (digests.d1c) info(`CAP == A: ${cap === (await idA())}`);
  const { commands, inputs } = body(r).transaction;
  const [c0, c1] = commands;
  let shapeOk =
    commands.length === 2 &&
    c0.$kind === 'MoveCall' &&
    norm(c0.MoveCall.package) === PKG &&
    c0.MoveCall.module === 'house' &&
    c0.MoveCall.function === 'withdraw_fees' &&
    c1.$kind === 'TransferObjects' &&
    c1.TransferObjects.objects.every((o) => (o.$kind === 'NestedResult' && o.NestedResult[0] === 0) || (o.$kind === 'Result' && o.Result === 0));
  let toSender = false;
  if (shapeOk && c1.TransferObjects.address.$kind === 'Input') {
    const input = inputs[c1.TransferObjects.address.Input];
    if (input?.$kind === 'Pure') toSender = norm(Addr.parse(fromBase64(input.Pure.bytes))) === sender;
  }
  shapeOk = shapeOk && toSender;
  check('4b.ptb', shapeOk, `comandos ${commands.map((c) => c.$kind).join(',')}; withdraw_fees + TransferObjects a quien firma: ${shapeOk}`);
  const e = single('4b.event', r, 'house::FeesWithdrawn');
  if (!e) return;
  const amount = BigInt(e.amount);
  check('4b.house_id', norm(e.house_id) === HOUSE, `house_id == houseId: ${norm(e.house_id) === HOUSE}`);
  check('4b.amount≥F4', amount >= F4, `amount ${amount} ≥ F4 ${F4}`);
  const kw = await checkpointOf(digests.d4w);
  info(`checkpoint(d4w) = ${kw}`);
  const window = (await scanEvents('game::GameResolved', K4 + 1n)).filter((x) => x.checkpoint > K4 && x.checkpoint <= kw);
  for (const x of window) {
    emit(`AJENA GameResolved ${abbr(x.v.game_id)} fee ${x.v.fee} checkpoint ${x.checkpoint}${x.checkpoint === kw ? ' (mismo checkpoint que d4w)' : ''}`);
  }
  if (window.length === 0) {
    check('4b.amount==F4', amount === F4, `sin GameResolved en (K4 ${K4}, ${kw}]: amount ${amount} == F4 ${F4}`);
  } else {
    info(`${window.length} GameResolved ajenos en (K4 ${K4}, ${kw}]: amount == F4 no se exige (la igualdad exacta la da final)`);
  }
  const d = delta(cap, r);
  check('4b.delta', d === amount - gas(r), `Δ(CAP,d4w) ${d} == amount − gas ${amount - gas(r)}`);
  await saveState({ kd4w: kw.toString() });
}

async function adminTx(id, key, cap, name, expectFields) {
  const r = await tx(need(key));
  gasLine(key, r);
  check(`${id}.success`, isSuccess(r), digests[key]);
  check(`${id}.sender`, senderOf(r) === cap, `sender == CAP: ${senderOf(r) === cap}`);
  const e = single(`${id}.event`, r, name);
  if (e) {
    const ok = norm(e.house_id) === HOUSE && Object.entries(expectFields).every(([k, v]) => String(e[k]) === v);
    const shown = Object.keys(expectFields).map((k) => `${k} ${e[k]}`).join(', ');
    check(`${id}.valores`, ok, `${name.split('::')[1]}: ${shown}; house_id == houseId: ${norm(e.house_id) === HOUSE}`);
  }
  const d = delta(cap, r);
  check(`${id}.delta`, d === -gas(r), `Δ(CAP) ${d} == −gas ${-gas(r)}`);
}

async function blockH() {
  const cap = await capOwner();
  await adminTx('h.dh1', 'dh1', cap, 'house::FeeRateUpdated', { old_fee_rate: '200', new_fee_rate: '201' });
  await adminTx('h.dh2', 'dh2', cap, 'house::FeeRateUpdated', { old_fee_rate: '201', new_fee_rate: '200' });
  const k1 = await checkpointOf(need('dh1'));
  const k2 = await checkpointOf(need('dh2'));
  const created = (await scanEvents('game::GameCreated', k1)).filter((e) => e.checkpoint >= k1 && e.checkpoint <= k2);
  for (const e of created) {
    emit(`AJENA GameCreated ${abbr(e.v.game_id)} fee_rate ${e.v.fee_rate} checkpoint ${e.checkpoint}${e.v.fee_rate === 201 ? ' (con 201: se anota)' : ''}`);
  }
  info(`GameCreated en [checkpoint(dh1) ${k1}, checkpoint(dh2) ${k2}]: ${created.length}`);
  await adminTx('h.dh3', 'dh3', cap, 'house::BetLimitsUpdated', {
    old_min_bet: '1000000',
    old_max_bet: '50000000000',
    new_min_bet: '2000000',
    new_max_bet: '10000000000',
  });
  await adminTx('h.dh4', 'dh4', cap, 'house::BetLimitsUpdated', {
    old_min_bet: '2000000',
    old_max_bet: '10000000000',
    new_min_bet: '1000000',
    new_max_bet: '50000000000',
  });
}

async function blockFinal() {
  const K0 = BigInt(needState('K0', 'pre'));
  const F0 = BigInt(needState('F0', 'pre'));
  const G1 = await createdGame('d1c');
  const G2 = await createdGame('d2c');
  const fee1 = BigInt((await resolvedFee('d1a')).fee);
  const fee2 = BigInt((await resolvedFee('d2a')).fee);
  const withdrawn = txEvents(await tx(need('d4w')), 'house::FeesWithdrawn');
  if (withdrawn.length !== 1) throw new Error('d4w no tiene exactamente un FeesWithdrawn');
  const amount = BigInt(withdrawn[0].amount);

  const h = await readHouse();
  check('H7.shared', h.shared, `House Shared y tipo exacto: ${h.shared}`);
  check('H7.fee_rate', h.feeRate === 200, `fee_rate ${h.feeRate}`);
  check('H7.limites', h.minBet === '1000000' && h.maxBet === '50000000000', `${h.minBet}/${h.maxBet}`);
  check('H7.version', h.version === '1', `version ${h.version}`);
  const Kf = await kRead(h.object);
  const Ff = h.fees;
  info(`Ff = fees_collected ${Ff} · Kf = ${Kf}`);
  const all = (await scanEvents('game::GameResolved', K0 + 1n)).filter((e) => e.checkpoint > K0 && e.checkpoint <= Kf);
  let sum = 0n;
  let others = 0;
  for (const e of all) {
    sum += BigInt(e.v.fee);
    const g = norm(e.v.game_id);
    const tag = g === G1 ? 'G1' : g === G2 ? 'G2' : 'ajena';
    if (tag === 'ajena') others += 1;
    emit(`RESUELTA ${tag} ${abbr(g)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
  }
  check(
    'H7.comisiones',
    amount + Ff === F0 + sum,
    `amount ${amount} + Ff ${Ff} = ${amount + Ff} == F0 ${F0} + Σ fee ${sum} (${all.length} GameResolved en (K0 ${K0}, Kf ${Kf}], ${others} ajenas)`,
  );
  if (others === 0) check('H7.sin_ajenas', Ff === 0n, `sin ajenas: Ff ${Ff} == 0`);

  const A = await idA();
  const B = await idB();
  const keys = ['d1c', 'd1a', 'd2c', 'd2a', 'd3c', 'd3x', 'd4w'];
  let dSum = 0n;
  let gSum = 0n;
  for (const key of keys) {
    const r = await tx(need(key));
    dSum += delta(A, r) + delta(B, r);
    gSum += gas(r);
  }
  const want = -gSum + (amount - fee1 - fee2);
  check('H7.conservacion', dSum === want, `Σ Δ(A) + Σ Δ(B) ${dSum} == −Σ gas ${-gSum} + (amount − fee(d1a) − fee(d2a)) ${amount - fee1 - fee2} = ${want}`);
}

const BLOCKS = { pre: blockPre, 1: block1, 2: block2, 3: block3, '4a': block4a, '4b': block4b, h: blockH, final: blockFinal };
const run = BLOCKS[args.block];
if (!run) {
  emit(`bloque desconocido: ${args.block}`);
  process.exit(2);
}
emit(`BLOQUE ${args.block} · red ${network} · paquete ${abbr(PKG)}`);
try {
  await run();
} catch (error) {
  emit(`ERROR ${error instanceof Error ? error.message : String(error)}`);
  process.exit(5);
}
emit(`RESUMEN ${passed} PASA / ${failed} NO PASA`);
process.exit(failed === 0 ? 0 : 1);
```

## Revisión TASK-2: PASA

> MID, 2026-11-04, contra `HANDOFF_SMOKE_MVP.md` v1.1 y `ESTANDARES.md`. La sonda revisada es
> `<scratchpad>/smoke17-probe/verify-mvp.mjs`, idéntica al bloque `js` de este reporte (comprobado con `diff`). El MID no
> corrió la sonda ni gates: revisó el código y el output pegado.

**Implementa lo pedido.** Localnet aislada en la variante B, todas las firmas por `suic` bajo `PRE` (B4), el recorrido
§3.2 completo, con las dos ajenas y el `transfer_house_cap`. Los 8 bloques dan 99 PASA / 0 NO PASA, con los valores
esperados del handoff:
- `F4 = 8040000`;
- `amount = 8040000`;
- `amount + Ff = 8080000`;
- `Ff = 40000`;
- la conservación exacta (`−18029490 + 40000 = −17989490`; el MID rehízo la suma de los 7 gas del bloque `final`).

La autoprueba negativa sale con exit 1 en (a), con 5 NO PASA, y con exit 3 en (b), con `0x` y sin él. La guarda de URL
sale con exit 2 antes de cargar el SDK. `balanceChanges` está disponible en el SDK 2.37, así que no hubo STOP. El cierre
M-7 es limpio y `~/.sui` quedó idéntico a la línea base.

**§R-2 / DL-2.** La sonda solo usa `getServiceInfo`, `getObject`, `getTransaction` y `ListEvents` crudo. No hay
simulaciones ni `sui client`, y ningún proceso de Node lee `<SMOKE_DIR>/net`: la sonda rechaza esas rutas con exit 2.
**SEG-3 / §R-1:**
- el filtro de salida cubre toda línea, también la de `ERROR`;
- las identidades viven solo en memoria;
- `state.json` guarda solo valores públicos y se borró al cerrar;
- los greps de §R-6 sobre el reporte, repetidos por el MID, dan vacío.

**LIM.** Sin código muerto ni debug. Cada evento se re-serializa y se comparan los bytes, como pide "Lectura desde la
app". Los checks extra endurecen y no relajan.

**Desviaciones: las 5 se aceptan.**
1. La carpeta `smoke17-probe/` es correcta: `<SMOKE_DIR>` se borra al cerrar y la sonda tiene que sobrevivir. Pasa al
   handoff v1.2.
2. `aux.json` para los digests auxiliares conserva la forma de `digests.json`.
3. Exit 5, la guarda de red y `chainId` antes de pedir nada, `--selftest` y los checks extra: los adopta el handoff v1.2
   (códigos 0-5).
4. `npm ci`: hacía falta, porque el worktree no tenía `node_modules` y `node_modules/` está ignorado. TASK-3 lo repite si
   hace falta.
5. Rama de MINOR-1 con un `state` sintético (`K4 = 1971`): aceptada. La ajena 2 real cayó en 2174 y `d4w` en 2168. La
   rama es un `if` sobre la lista de la ventana, y el output muestra que lista la ajena y deja de exigir `amount == F4`
   sin NO PASA. La igualdad exacta sigue en `final`, que sí se ejercitó con datos reales.

### Hallazgos

No bloquean el PASA de TASK-2, pero sí TASK-3: entran al handoff v1.2 como C-1..C-4 y se re-ensayan en TASK-2b.

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H-1 | SEG-4 (conservación); N-3 | `verify-mvp.mjs:665-676` | La conservación de `final` suma solo `Δ(A) + Δ(B)` y supone `CAP == A` (R-1 del DEV). Con la custodia "importar la publicadora" y el cap en una cuenta `∉ {A, B}`, el `+amount − gas` de `d4w` cae fuera de la suma y da un NO PASA falso. N-3 es del owner: la sonda tiene que funcionar con las dos custodias | **C-1:** sumar sobre las partes `{A, B, W}` sin repetir, con `W = sender(d4w)`. Con `W == A` la suma no cambia |
| H-2 | DL-9; D-20261103-03 (ventana de ≈ 14,6 días) | `:347-352`, `:231-274` | 0.6 escanea desde la publicación sin mirar el piso (R-2 del DEV). Fuera de la ventana, el `ListEvents` crudo da `OUT_OF_RANGE` y la sonda sale con un `ERROR` genérico; un `getTransaction` de la publicación podada haría lo mismo | **C-2:** la cota de 0.6 es `máx(publicación, piso + 16000)`, como `historyLowerBound` de `eventScan.ts` (margen solo con piso > 0), y la publicación podada cae a la cota del piso; se imprime de dónde salió la cota. **C-3:** `scanEvents` falla con un mensaje explícito ("historial podado…", exit 5) si la ventana empieza debajo del piso, y nunca devuelve una lista incompleta |
| H-3 | 🔵 2 de la v1.1 (`kRead` con reintento) | `:134-145`, `:166-178` | El fullnode responde "not found" (`TransactionError`) hasta que la transacción entra en un checkpoint (`app/README.md`, "Indexación"). `checkpointOf` lo propaga como excepción (exit 5) en lugar de reintentar, y `tx()` lee la transacción entera sin esperar. En localnet no se vio porque las sondas corrieron segundos después | **C-4:** `checkpointOf` reintenta también ante `TransactionError` hasta los 30 s, y al vencer sale con exit 4 y el digest. `tx()` espera `checkpointOf` antes de leer |
| H-4 | — (riesgo R-3 del DEV) | `:428-429` | O-7 medido en localnet es el budget que eligió la CLI, no la wallet | Sin cambio de código: en TASK-4 la misma línea `OBS` lee el `gasData` de la transacción firmada por la wallet del owner. Queda escrito en el handoff v1.2 |
| H-5 | — (riesgo R-4 del DEV) | `:238` | Volumen del escaneo: tope de 10 000 páginas de 100 | Sin cambio: las ventanas de `4a`, `4b`, `h` y `final` empiezan en `K0`, `K4` o `checkpoint(dh1)`, es decir, en la misma corrida; solo 0.6 abarca desde la publicación y ahora está acotada por C-2. Es lento pero correcto, y el tope da un error explícito |

### Siguiente paso
- TASK-2: **PASA**.
- El handoff v1.2 lleva el texto final de la sonda con C-1..C-4 aplicados.
- **TASK-2b** (re-ensayo corto en la localnet aislada, con la custodia "cap en otra cuenta") se autoriza antes de TASK-3:
  C-1 cambia la cuenta de la conservación y C-4 cambia cómo se lee cada transacción.

### Mensaje de commit propuesto
```
docs: report and review the MVP smoke probe rehearsal (#17)

TASK-2 of HANDOFF_SMOKE_MVP v1.1: the read-only probe ran against an
isolated localnet (variant B) over the full CLI walk, with two foreign
games and the cap transfer: 8 blocks, 99 PASS / 0 FAIL, exact fee and
conservation identities, negative self-test exit 1 and exit 3, clean
M-7 close. MID review: PASS, five deviations accepted; findings H-1..H-3
(conservation with the cap outside A/B, history floor, not-found retry)
go to the v1.2 probe as C-1..C-4, with a short re-rehearsal (TASK-2b).

Refs #17

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md
"#17 TASK-2 ✅: sonda de verificación ensayada en la localnet aislada (variante B), 8 bloques, 99 PASA / 0 NO PASA;
autoprueba negativa exit 1 / exit 3; cierre limpio. Handoff v1.2 con la sonda final (C-1..C-4); TASK-2b antes de TASK-3."

---

## TASK-2b

## Task completado: HANDOFF_SMOKE_MVP — TASK-2b

### Branch (con SHA corto del HEAD)
`feature/issue-17-mvp-smoke` @ `5593813`, ya pusheado. No hice commits ni pushes.

### Archivos modificados/creados
- `documents/REPORTES_SMOKE_MVP.md`: se agrega esta sección TASK-2b. La agrega el orquestador desde
  `<scratchpad>/smoke17-probe/REPORTE_TASK2b.txt`, porque el harness del DEV no escribe reportes `.md`.
- Fuera del repo y sin commitear: `<scratchpad>/smoke17-probe/verify-mvp.mjs`, que es el Anexo B extraído tal cual. La
  versión de TASK-2 queda aparte, como `verify-mvp.task2.mjs`.
- No toqué código, `contracts/` ni `documents/SMOKE_MVP.md`.

### Qué se implementó (3 líneas máx)
Extraje el Anexo B v1.2 y el `diff` contra `verify-mvp.mjs` salió vacío. Lo re-ensayé en una localnet aislada **nueva**
(variante B, B4), con el cap en `ADMIN`, sin `transfer_house_cap` (`CAP ∉ {A, B}`). Los 8 bloques dan **96 PASA / 0 NO
PASA**, y la autoprueba da exit 1 en (a), exit 3 ×2 en (b) y exit 4 a los 31 s en (c).

### Tests y gates
- Ningún gate de código (docs).
- `git diff --exit-code -- contracts/Move.lock` da exit 0, y `git status --porcelain --untracked-files=all` queda vacío.

### Verificación manual

#### 1. Extracción del Anexo B y `diff`

**Hallazgo previo.** El `<scratchpad>/smoke17-probe/verify-mvp.mjs` que encontré **no** estaba parcheado. Era la versión de
TASK-2 (mtime 06:53, 693 líneas), y su `diff` contra el Anexo B, de 734 líneas, **no** sale vacío. Las diferencias son el
encabezado y exactamente C-1..C-4 (salida completa más abajo). No corrí nada con esa versión.

Lo que hice:
1. Moví esa versión a `verify-mvp.task2.mjs`.
2. Extraje el bloque ```js del "Anexo B" de `documents/HANDOFF_SMOKE_MVP.md` @ `5593813` con `awk`, desde
   `## Anexo B` hasta el fence de cierre, a `verify-mvp.mjs`.
3. Repetí el `diff` del bloque contra ese archivo:
```text
$ awk '…Anexo B…' documents/HANDOFF_SMOKE_MVP.md | diff - <scratchpad>/smoke17-probe/verify-mvp.mjs
diff Anexo B vs verify-mvp.mjs exit=0
734 <scratchpad>/smoke17-probe/verify-mvp.mjs
```
`diff` vacío: la sonda ensayada es el Anexo B tal cual. No hizo falta tocarla, así que no hay v1.3. Los greps de §R-6
sobre el archivo dan vacío.

`diff` de la versión de TASK-2 (encontrada en el scratchpad, `>`) contra el Anexo B (`<`), antes del reemplazo:
```text
1c1
< // verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP v1.2 §Sonda). Solo lecturas gRPC.
---
> // verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP §Sonda). Solo lecturas gRPC.
4c4
< //     --block pre|1|2|3|4a|4b|h|final < <scratchpad>/smoke17-probe/verify-mvp.mjs
---
> //     --block pre|1|2|3|4a|4b|h|final < <scratchpad>/verify-mvp.mjs
7c7
< // 4 SIN CHECKPOINT (repetir el bloque) · 5 error de lectura, datos faltantes o historial podado.
---
> // 4 SIN CHECKPOINT (repetir el bloque) · 5 error de lectura o datos faltantes.
77d76
< const { TransactionError } = await import('@mysten/sui/client');
137d135
<     await checkpointOf(digest); // C-4: espera a que esté en un checkpoint antes de leerla entera
167,171c165
< /**
<  * Checkpoint de un digest, con reintento cada 500 ms hasta 30 s (TX_INDEX_TIMEOUT_MS). Nunca 0. C-4 (v1.2): el
<  * fullnode responde "not found" (`TransactionError`) hasta que la transacción está en un checkpoint
<  * (app/README.md, "Indexación"), así que ese error también se reintenta.
<  */
---
> /** Checkpoint de un digest, con reintento cada 500 ms hasta 30 s (TX_INDEX_TIMEOUT_MS). Nunca 0. */
175,182c169,171
<     let cp = null;
<     try {
<       const r = await client.getTransaction({ digest, include: {} });
<       cp = body(r).checkpoint ?? null;
<     } catch (error) {
<       if (!(error instanceof TransactionError)) throw error;
<     }
<     if (cp !== null) return BigInt(cp);
---
>     const r = await client.getTransaction({ digest, include: {} });
>     const cp = body(r).checkpoint;
>     if (cp !== null && cp !== undefined) return BigInt(cp);
184c173
<       emit(`SIN CHECKPOINT: ${digest} sin checkpoint (o inexistente) tras 30 s; revisar el digest y repetir el bloque`);
---
>       emit('SIN CHECKPOINT: repetir el bloque');
241,247d229
< /** Piso de historial del nodo (`lowestAvailableCheckpoint`), o `null` si no lo informa (nodo sin poda). */
< async function nodeFloor() {
<   const { response } = await client.ledgerService.getServiceInfo({});
<   const floor = response.lowestAvailableCheckpoint;
<   return floor === undefined || floor === null ? null : BigInt(floor);
< }
< const HISTORY_FLOOR_MARGIN_CHECKPOINTS = 16_000n; // el mismo margen que app/src/sui/eventScan.ts
254,258d235
<   // C-3 (v1.2): una ventana que empieza debajo del piso no se escanea: error explícito, nunca una lista incompleta.
<   const floor = await nodeFloor();
<   if (floor !== null && floor > startCheckpoint) {
<     throw new Error(`historial podado: la ventana empieza en ${startCheckpoint} y el piso del nodo es ${floor}`);
<   }
370,386c347,350
<   // C-2 (v1.2): cota = máx(publicación, piso + margen), como historyLowerBound de app/src/sui/eventScan.ts; el margen
<   // solo con piso > 0. Si la publicación ya está podada, la cota es la del piso.
<   let kp = null;
<   try {
<     const r = await client.getTransaction({ digest: deployment.publishTxDigest, include: {} });
<     kp = body(r).checkpoint === null || body(r).checkpoint === undefined ? null : BigInt(body(r).checkpoint);
<   } catch (error) {
<     if (!(error instanceof TransactionError)) throw error;
<   }
<   const floor = await nodeFloor();
<   const floorBound = floor !== null && floor > 0n ? floor + HISTORY_FLOOR_MARGIN_CHECKPOINTS : null;
<   if (kp === null && floorBound === null) throw new Error('sin checkpoint de la publicación ni piso del nodo para acotar 0.6');
<   const bound = kp === null ? floorBound : floorBound === null || kp >= floorBound ? kp : floorBound;
<   const origin = bound === kp ? 'publicación' : 'piso + 16000: lo anterior no es visible';
<   const created = await scanEvents('game::GameCreated', bound);
<   const resolved = await scanEvents('game::GameResolved', bound);
<   check('0.6', true, `desde el checkpoint ${bound} (${origin}): ${created.length} GameCreated, ${resolved.length} GameResolved`);
---
>   const kp = await checkpointOf(deployment.publishTxDigest);
>   const created = await scanEvents('game::GameCreated', kp);
>   const resolved = await scanEvents('game::GameResolved', kp);
>   check('0.6', true, `desde el checkpoint ${kp} de la publicación: ${created.length} GameCreated, ${resolved.length} GameResolved`);
701,702d664
<   // C-1 (v1.2): las partes son A, B y quien retiró (W = sender(d4w) = CAP), sin repetir. Vale con las dos custodias de
<   // N-3: con el cap en A, W == A y la suma es la de la v1.1; con el cap en otra cuenta, se suma su Δ.
705,707d666
<   const W = senderOf(await tx(need('d4w')));
<   const parties = [...new Set([A, B, W])];
<   const who = W === A ? 'A, B (CAP == A)' : W === B ? 'A, B (CAP == B)' : 'A, B, CAP';
713c672
<     for (const p of parties) dSum += delta(p, r);
---
>     dSum += delta(A, r) + delta(B, r);
717c676
<   check('H7.conservacion', dSum === want, `Σ Δ(${who}) ${dSum} == −Σ gas ${-gSum} + (amount − fee(d1a) − fee(d2a)) ${amount - fee1 - fee2} = ${want}`);
---
>   check('H7.conservacion', dSum === want, `Σ Δ(A) + Σ Δ(B) ${dSum} == −Σ gas ${-gSum} + (amount − fee(d1a) − fee(d2a)) ${amount - fee1 - fee2} = ${want}`);
```

**SDK.** `@mysten/sui` 2.37.0 exporta `TransactionError` desde `@mysten/sui/client`, y `getTransaction` del cliente gRPC
lo lanza con `notFound` ante `NOT_FOUND` (`dist/grpc/core.mjs`). C-4 funciona con este SDK.

#### 2. Recorrido

**Entorno.** El de TASK-2:
- `<SMOKE_DIR>` = `<scratchpad>/smoke17`, nuevo;
- `env.sh` con rutas literales, `app.env` con su guarda y nunca en la misma llamada que `env.sh`;
- `PRE` delante de todo `suic`, y `printf 'n\n' |` delante de cada `sui`.

**Línea base.**
- `stat` da `2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml`, y `ls` da `client.yaml`.
- Puertos `9000`, `9123` y `9184` libres, sin ningún `sui start`.
- Sin `contracts/deployments/`, y el árbol limpio.

`import('@mysten/sui/grpc')` por stdin desde `<repo>/app` da `ok` con exit 0.

| # | Paso | Resultado |
|---|---|---|
| L-0 | Génesis, arranque en segundo plano, cuentas | Génesis con exit 0; el PID que escucha en `:9000` es el de `sui.pid`; chain id `984e75e1`. `ADMIN`, `A`, `B` y `C` a `ids.env` sin imprimirlas: 4 distintas |
| 1 | `ADMIN` publica (variante B, sin `--out`) | exit 0; `publishTxDigest` `FL9orRcguxErRWmrNJ9gUhtCXiEEHBY3Uc3Uki6VMX8c` (checkpoint 90); `packageId == originalPackageId`; `Move.lock` sin delta; `git status` vacío |
| 1b | `ADMIN`: `update_fee_rate` 200 | `9Y2cu9CSU4UoTGzFfdGwBToW5LK7t7XuV68SPboUH5yB` (checkpoint 93) |
| 2 | **Sin `transfer_house_cap`** | el cap queda en `ADMIN`, y no hay `dcap` en `digests.json` |
| 3 | Sonda `pre` | 8 PASA. "sin dcap"; 0.6 con origen "publicación" |
| 4 | `A` crea `d1c`; `B` acepta `d1a` | `9tLqR6d14REnfsZEcNZDgeNMwfDJbqSWDYsZtCbgJQFt` (167) / `GUxBrhP1YxyrkvSXHRRLh5uFranFwhoSu5vTsNT6rrea` (171); ganó A. Sonda `1`: 20 PASA |
| 5 | `A` invita a `B` (`d2c`, `some(@$B)`); `B` acepta `d2a` | `CZ7cgPYwcnv4gdhGajUFW5DwM7GtBLAhHcSDYtsBTBh1` (274) / `2otY4M8FZpPZWNa3c4qPezBtS6qgayLoMjHy5Bhfkqea` (278); ganó A. Sonda `2`: 21 PASA (corrida después de la ajena 1; ver Desviaciones) |
| 6 | Ajena 1: `C` crea, `ADMIN` acepta | `EwMMeCZ5G6kNN73YcCVJ6xA8kTRBjwwMzp3RSyfk6Y3Q` (282) / `Febch4NPcdWc4YJJM4rEmwfG528KACFyhDPhtdrH3BTx` (288); comisión 40000; `0x34f2…8b61` |
| 7 | `A` crea `d3c` y cancela `d3x` | `8QjGQ1CUEbfdQFbDyhEh7ubS9fqFt58o8mCTnDgJP8Kn` (328) / `7BSN1sfda7AS2D2hRqSNt2MgQevZpCjXP4i1YRMTa74J` (331). Sonda `3`: 16 PASA |
| 8 | Sonda `4a` | `F4 = 8040000`, `K4 = 288`, con la ajena 1 listada. 2 PASA |
| 9 | **`ADMIN`** retira (`d4w`): `withdraw_fees` + `TransferObjects` a `@$ADMIN` | `BRPgJzfeJeK1QgzJ8U138ZDCG7ya4pKxV8y3HheG7gTn` (405) |
| 10 | Ajena 2, en la misma llamada que `d4w` | `5CAcFy8hAm2giR5SbQt6uA4eq2ehCUpYSqSoB7nNTojm` (407) / `hsXZNsGXouSHQHKQSvUYNPq257Y2oMueh7RsunY98tG` (**413**); comisión 40000; `0x681b…f129`. No cayó en el checkpoint de `d4w`. Sonda `4b`: 7 PASA |
| 11 | **`ADMIN`**: `dh1` 201, `dh2` 200, `dh3` 2000000/10000000000, `dh4` 1000000/50000000000 | `3QG93icPbdRVEvpHd6ihkoBbKqzjrPoGAj2rhurGPqgu` (454), `3DvK5EQBfZRUxGLhkLxEDwLKa4NP2EHhvx8t4b6fKB1F` (456), `95NLCQRGT9raPfsHvLKBPUyzYziZqgXGxy9Qb8oPcnvw` (459), `Ct4j4gpS8rPR9uwJJTizUS5UkyRAy4NvMbQBBLuuEbb6` (461). Sonda `h`: 16 PASA |
| 12 | Sonda `final` | 6 PASA |

Los digests son de una génesis desechable que ya se borró; entre paréntesis va el checkpoint.

#### 3. Output de la sonda (pegado tal cual)

`pre`:
```text
BLOQUE pre · red localnet · paquete 0x29ed…7d21
CHECK 0.3 PASA chain id 984e75e1, json 984e75e1
CHECK 0.4.shared PASA House 0x5592…25a8 Shared y tipo exacto: true
CHECK 0.4.fee_rate PASA fee_rate 200
CHECK 0.4.min_bet PASA min_bet 1000000
CHECK 0.4.max_bet PASA max_bet 50000000000
CHECK 0.4.version PASA version 1
INFO F0 = 0 · K0 = 93 (checkpoint de previousTransaction 9Y2cu9CSU4UoTGzFfdGwBToW5LK7t7XuV68SPboUH5yB)
CHECK 0.5.cap PASA HouseCap 0x2f66…987d con dueño AddressOwner (CAP)
INFO sin dcap: 0.5 solo con el dueño actual
CHECK 0.6 PASA desde el checkpoint 90 (publicación): 0 GameCreated, 0 GameResolved
RESUMEN 8 PASA / 0 NO PASA
exit=0
```

`1`:
```text
BLOQUE 1 · red localnet · paquete 0x29ed…7d21
CHECK 1.B≠A PASA B ≠ A: true
INFO gas d1c 9tLqR6d14REnfsZEcNZDgeNMwfDJbqSWDYsZtCbgJQFt: 3941200 (computation 1000000, storage 2941200, rebate 0)
CHECK 1.d1c.success PASA 9tLqR6d14REnfsZEcNZDgeNMwfDJbqSWDYsZtCbgJQFt
CHECK 1.d1c.sender PASA sender == A: true
CHECK 1.d1c.creator PASA creator == A: true
CHECK 1.d1c.bet PASA bet 100000000
CHECK 1.d1c.opponent PASA opponent none: true
CHECK 1.d1c.fee_rate PASA fee_rate 200
CHECK 1.d1c.delta PASA Δ(A) -103941200 == −bet − gas -103941200
INFO 1.d1c: game_id 0xd29f…153f
INFO gas d1a GUxBrhP1YxyrkvSXHRRLh5uFranFwhoSu5vTsNT6rrea: 3462748 (computation 1000000, storage 5943200, rebate 3480452)
CHECK 1.d1a.success PASA GUxBrhP1YxyrkvSXHRRLh5uFranFwhoSu5vTsNT6rrea
CHECK 1.d1a.game_id PASA game_id == 0xd29f…153f: true
CHECK 1.d1a.creator PASA creator == A: true
CHECK 1.d1a.acceptor PASA acceptor == B: true
CHECK 1.d1a.winner PASA winner == A
CHECK 1.d1a.pot PASA pot 200000000 (2·bet 200000000)
CHECK 1.d1a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 1.d1a.payout PASA payout 196000000 (pot − fee 196000000)
CHECK 1.d1a.delta.B PASA gana A: Δ(B) -103462748 == −bet − gas -103462748
CHECK 1.d1a.delta.A PASA gana A: Δ(A) 196000000 == +payout 196000000
CHECK 1.d1a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 1.d1a.object PASA 0xd29f…153f Resolved, acceptor == B y winner == evento: true, stake 0
OBS O-7 d1a: gasBudget 4462748, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 20 PASA / 0 NO PASA
exit=0
```

`2`:
```text
BLOQUE 2 · red localnet · paquete 0x29ed…7d21
INFO gas d2c CZ7cgPYwcnv4gdhGajUFW5DwM7GtBLAhHcSDYtsBTBh1: 2208598 (computation 1000000, storage 3184400, rebate 1975802)
CHECK 2.d2c.success PASA CZ7cgPYwcnv4gdhGajUFW5DwM7GtBLAhHcSDYtsBTBh1
CHECK 2.d2c.sender PASA sender == A: true
CHECK 2.d2c.creator PASA creator == A: true
CHECK 2.d2c.bet PASA bet 100000001
CHECK 2.d2c.opponent PASA opponent == B: true
CHECK 2.d2c.fee_rate PASA fee_rate 200
CHECK 2.d2c.delta PASA Δ(A) -102208599 == −bet − gas -102208599
INFO 2.d2c: game_id 0xdb96…f933
CHECK 2.d2a.sender PASA sender == B: true
INFO gas d2a 2otY4M8FZpPZWNa3c4qPezBtS6qgayLoMjHy5Bhfkqea: 2474871 (computation 1000000, storage 6186400, rebate 4711529)
CHECK 2.d2a.success PASA 2otY4M8FZpPZWNa3c4qPezBtS6qgayLoMjHy5Bhfkqea
CHECK 2.d2a.game_id PASA game_id == 0xdb96…f933: true
CHECK 2.d2a.creator PASA creator == A: true
CHECK 2.d2a.acceptor PASA acceptor == B: true
CHECK 2.d2a.winner PASA winner == A
CHECK 2.d2a.pot PASA pot 200000002 (2·bet 200000002)
CHECK 2.d2a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 2.d2a.payout PASA payout 196000002 (pot − fee 196000002)
CHECK 2.d2a.delta.B PASA gana A: Δ(B) -102474872 == −bet − gas -102474872
CHECK 2.d2a.delta.A PASA gana A: Δ(A) 196000002 == +payout 196000002
CHECK 2.d2a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 2.d2a.object PASA 0xdb96…f933 Resolved, acceptor == B y winner == evento: true, stake 0
CHECK 2.d2a.previousTransaction PASA previousTransaction == d2a: true
OBS O-7 d2a: gasBudget 4462772, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 21 PASA / 0 NO PASA
exit=0
```

`3`:
```text
BLOQUE 3 · red localnet · paquete 0x29ed…7d21
INFO gas d3c 8QjGQ1CUEbfdQFbDyhEh7ubS9fqFt58o8mCTnDgJP8Kn: 1965398 (computation 1000000, storage 2941200, rebate 1975802)
CHECK 3.d3c.success PASA 8QjGQ1CUEbfdQFbDyhEh7ubS9fqFt58o8mCTnDgJP8Kn
CHECK 3.d3c.sender PASA sender == A: true
CHECK 3.d3c.creator PASA creator == A: true
CHECK 3.d3c.bet PASA bet 1000000
CHECK 3.d3c.opponent PASA opponent none: true
CHECK 3.d3c.fee_rate PASA fee_rate 200
CHECK 3.d3c.delta PASA Δ(A) -2965398 == −bet − gas -2965398
INFO 3.d3c: game_id 0xc4dc…291d
INFO gas d3x 7BSN1sfda7AS2D2hRqSNt2MgQevZpCjXP4i1YRMTa74J: 1988294 (computation 1000000, storage 3929200, rebate 2940906)
CHECK 3.d3x.success PASA 7BSN1sfda7AS2D2hRqSNt2MgQevZpCjXP4i1YRMTa74J
CHECK 3.d3x.sender PASA sender == A: true
CHECK 3.d3x.game_id PASA game_id == 0xc4dc…291d: true
CHECK 3.d3x.refund PASA refund 1000000
CHECK 3.d3x.cancelled_by PASA cancelled_by == creator == A: true
CHECK 3.d3x.delta PASA Δ(A,d3x) -988294 == refund − gas -988294
CHECK 3.refund_integro PASA Δ(A,d3c) + Δ(A,d3x) -3953692 == −gas(d3c) − gas(d3x) -3953692
CHECK 3.d3x.sin_house PASA la House no está entre los inputs ni los objetos cambiados: true
CHECK 3.G3 PASA 0xc4dc…291d Cancelled, stake 0
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

`4a`:
```text
BLOQUE 4a · red localnet · paquete 0x29ed…7d21
INFO F4 = 8040000 · K4 = 288
CHECK 4a.ventana PASA checkpoint(d1a) 171 y checkpoint(d2a) 278 en (K0 93, K4 288]: true
AJENA GameResolved 0x34f2…8b61 fee 40000 checkpoint 288
INFO ajenas en (K0, K4]: 1, Σ fee 40000
CHECK 4a.F4 PASA F4 8040000 == F0 0 + fee(d1a) 4000000 + fee(d2a) 4000000 + Σ ajenas 40000 = 8040000
RESUMEN 2 PASA / 0 NO PASA
exit=0
```

`4b`:
```text
BLOQUE 4b · red localnet · paquete 0x29ed…7d21
INFO gas d4w BRPgJzfeJeK1QgzJ8U138ZDCG7ya4pKxV8y3HheG7gTn: 1988381 (computation 1000000, storage 4795600, rebate 3807219)
CHECK 4b.success PASA BRPgJzfeJeK1QgzJ8U138ZDCG7ya4pKxV8y3HheG7gTn
CHECK 4b.sender PASA sender == CAP: true
INFO CAP == A: false
CHECK 4b.ptb PASA comandos MoveCall,TransferObjects; withdraw_fees + TransferObjects a quien firma: true
CHECK 4b.house_id PASA house_id == houseId: true
CHECK 4b.amount≥F4 PASA amount 8040000 ≥ F4 8040000
INFO checkpoint(d4w) = 405
CHECK 4b.amount==F4 PASA sin GameResolved en (K4 288, 405]: amount 8040000 == F4 8040000
CHECK 4b.delta PASA Δ(CAP,d4w) 6051619 == amount − gas 6051619
RESUMEN 7 PASA / 0 NO PASA
exit=0
```

`h`:
```text
BLOQUE h · red localnet · paquete 0x29ed…7d21
INFO gas dh1 3QG93icPbdRVEvpHd6ihkoBbKqzjrPoGAj2rhurGPqgu: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh1.success PASA 3QG93icPbdRVEvpHd6ihkoBbKqzjrPoGAj2rhurGPqgu
CHECK h.dh1.sender PASA sender == CAP: true
CHECK h.dh1.valores PASA FeeRateUpdated: old_fee_rate 200, new_fee_rate 201; house_id == houseId: true
CHECK h.dh1.delta PASA Δ(CAP) -1000381 == −gas -1000381
INFO gas dh2 3DvK5EQBfZRUxGLhkLxEDwLKa4NP2EHhvx8t4b6fKB1F: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh2.success PASA 3DvK5EQBfZRUxGLhkLxEDwLKa4NP2EHhvx8t4b6fKB1F
CHECK h.dh2.sender PASA sender == CAP: true
CHECK h.dh2.valores PASA FeeRateUpdated: old_fee_rate 201, new_fee_rate 200; house_id == houseId: true
CHECK h.dh2.delta PASA Δ(CAP) -1000381 == −gas -1000381
INFO GameCreated en [checkpoint(dh1) 454, checkpoint(dh2) 456]: 0
INFO gas dh3 95NLCQRGT9raPfsHvLKBPUyzYziZqgXGxy9Qb8oPcnvw: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh3.success PASA 95NLCQRGT9raPfsHvLKBPUyzYziZqgXGxy9Qb8oPcnvw
CHECK h.dh3.sender PASA sender == CAP: true
CHECK h.dh3.valores PASA BetLimitsUpdated: old_min_bet 1000000, old_max_bet 50000000000, new_min_bet 2000000, new_max_bet 10000000000; house_id == houseId: true
CHECK h.dh3.delta PASA Δ(CAP) -1000381 == −gas -1000381
INFO gas dh4 Ct4j4gpS8rPR9uwJJTizUS5UkyRAy4NvMbQBBLuuEbb6: 1000381 (computation 1000000, storage 3807600, rebate 3807219)
CHECK h.dh4.success PASA Ct4j4gpS8rPR9uwJJTizUS5UkyRAy4NvMbQBBLuuEbb6
CHECK h.dh4.sender PASA sender == CAP: true
CHECK h.dh4.valores PASA BetLimitsUpdated: old_min_bet 2000000, old_max_bet 10000000000, new_min_bet 1000000, new_max_bet 50000000000; house_id == houseId: true
CHECK h.dh4.delta PASA Δ(CAP) -1000381 == −gas -1000381
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

`final`:
```text
BLOQUE final · red localnet · paquete 0x29ed…7d21
CHECK H7.shared PASA House Shared y tipo exacto: true
CHECK H7.fee_rate PASA fee_rate 200
CHECK H7.limites PASA 1000000/50000000000
CHECK H7.version PASA version 1
INFO Ff = fees_collected 40000 · Kf = 461
RESUELTA G1 0xd29f…153f fee 4000000 checkpoint 171
RESUELTA G2 0xdb96…f933 fee 4000000 checkpoint 278
RESUELTA ajena 0x34f2…8b61 fee 40000 checkpoint 288
RESUELTA ajena 0x681b…f129 fee 40000 checkpoint 413
CHECK H7.comisiones PASA amount 8040000 + Ff 40000 = 8080000 == F0 0 + Σ fee 8080000 (4 GameResolved en (K0 93, Kf 461], 2 ajenas)
CHECK H7.conservacion PASA Σ Δ(A, B, CAP) -17989490 == −Σ gas -18029490 + (amount − fee(d1a) − fee(d2a)) 40000 = -17989490
RESUMEN 6 PASA / 0 NO PASA
exit=0
```

#### 4. Valores obtenidos contra esperados (TASK-2b §3.3)

| Esperado | Obtenido | Estado |
|---|---|---|
| `pre` con "sin dcap" | `INFO sin dcap: 0.5 solo con el dueño actual` | ✅ |
| 0.6 con origen "publicación" | `CHECK 0.6 PASA desde el checkpoint 90 (publicación)` | ✅ |
| `4b`: `sender == CAP: true` y `CAP == A: false` | `CHECK 4b.sender PASA sender == CAP: true` · `INFO CAP == A: false` | ✅ |
| `4b`: `amount == 8040000`, `≥ F4` | `8040000`; ventana `(288, 405]` vacía ⇒ `== F4` | ✅ |
| `final`: `Σ Δ(A, B, CAP)` exacta (C-1) | `Σ Δ(A, B, CAP) -17989490 == −Σ gas -18029490 + 40000` | ✅ |
| `final`: `amount + Ff == 8080000` | `8040000 + 40000 = 8080000` = Σ fee de 4 `GameResolved` en `(93, 461]` | ✅ |
| `final`: `Ff == 40000` | `40000` (la ajena 2) | ✅ |
| `h`: `sender == CAP` y `Δ(CAP) == −gas` en `dh1`..`dh4` | 4 de 4 | ✅ |
| Todo en PASA | 8 + 20 + 21 + 16 + 2 + 7 + 16 + 6 = **96 PASA / 0 NO PASA** | ✅ |

**C-1, por qué la suma de 3 partes da exacta.** Con el cap en `ADMIN`, el `+amount − gas(d4w)` de `d4w` cae en `CAP`.
Con la suma de la v1.1, `Σ Δ(A) + Σ Δ(B)`, habría faltado `Δ(CAP, d4w)` = 6051619 y daba NO PASA. La v1.2 lo suma y la
igualdad cierra. Con el cap en A (TASK-2), `W == A` y la suma es la misma de la v1.1.

**Gas de cada transacción (MIST).**

| Tx | Gas | Tx | Gas | Tx | Gas |
|---|---|---|---|---|---|
| fee 200 (aux.) | 1000381 | `d2a` | 2474871 | `d4w` | 1988381 |
| `d1c` | 3941200 | ajena 1 crear (aux.) | 3941200 | ajena 2 crear (aux.) | 1965398 |
| `d1a` | 3462748 | ajena 1 aceptar (aux.) | 2474847 | ajena 2 aceptar (aux.) | 1486946 |
| `d2c` | 2208598 | `d3c` | 1965398 | `dh1`..`dh4` | 1000381 c/u |
| | | `d3x` | 1988294 | | |

O-7 (CLI, no cuenta según R-3): `d1a` 4462748 y `d2a` 4462772, con precio 1000.

#### 5. Autoprueba

(a) Bloque `1` con `d1a` cambiado por `d2a`. Da **exit 1**. Aquí son 4 NO PASA y no 5 como en TASK-2: en esta génesis
ganó A las dos partidas, así que el check `object` coincide por azar. El resto falla como se espera.
```text
BLOQUE 1 · red localnet · paquete 0x29ed…7d21
CHECK 1.B≠A PASA B ≠ A: true
INFO gas d1c 9tLqR6d14REnfsZEcNZDgeNMwfDJbqSWDYsZtCbgJQFt: 3941200 (computation 1000000, storage 2941200, rebate 0)
CHECK 1.d1c.success PASA 9tLqR6d14REnfsZEcNZDgeNMwfDJbqSWDYsZtCbgJQFt
CHECK 1.d1c.sender PASA sender == A: true
CHECK 1.d1c.creator PASA creator == A: true
CHECK 1.d1c.bet PASA bet 100000000
CHECK 1.d1c.opponent PASA opponent none: true
CHECK 1.d1c.fee_rate PASA fee_rate 200
CHECK 1.d1c.delta PASA Δ(A) -103941200 == −bet − gas -103941200
INFO 1.d1c: game_id 0xd29f…153f
INFO gas d1a 2otY4M8FZpPZWNa3c4qPezBtS6qgayLoMjHy5Bhfkqea: 2474871 (computation 1000000, storage 6186400, rebate 4711529)
CHECK 1.d1a.success PASA 2otY4M8FZpPZWNa3c4qPezBtS6qgayLoMjHy5Bhfkqea
CHECK 1.d1a.game_id NO PASA game_id == 0xd29f…153f: false
CHECK 1.d1a.creator PASA creator == A: true
CHECK 1.d1a.acceptor PASA acceptor == B: true
CHECK 1.d1a.winner PASA winner == A
CHECK 1.d1a.pot NO PASA pot 200000002 (2·bet 200000000)
CHECK 1.d1a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 1.d1a.payout NO PASA payout 196000002 (pot − fee 196000002)
CHECK 1.d1a.delta.B NO PASA gana A: Δ(B) -102474872 == −bet − gas -102474871
CHECK 1.d1a.delta.A PASA gana A: Δ(A) 196000002 == +payout 196000002
CHECK 1.d1a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 1.d1a.object PASA 0xd29f…153f Resolved, acceptor == B y winner == evento: true, stake 0
OBS O-7 d1a: gasBudget 4462772, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 16 PASA / 4 NO PASA
exit=1
```

(b) Filtro de salida, con la línea de 64 hex armada en memoria. Da **exit 3** las dos veces:
```text
$ "$NODE" --input-type=module - --url http://127.0.0.1:9000 --selftest filter-0x < verify-mvp.mjs
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
$ "$NODE" --input-type=module - --url http://127.0.0.1:9000 --selftest filter-raw < verify-mvp.mjs
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
```

(c) **C-4.** Bloque `1` con `d1c` cambiado por un digest bien formado que no existe: el real con el carácter 20 cambiado
por otro del alfabeto base58, también de 44 caracteres. Da **exit 4** a los ≈ 30 s. `tx()` espera el checkpoint y
`checkpointOf` reintenta el `TransactionError` "not found":
```text
BLOQUE 1 · red localnet · paquete 0x29ed…7d21
SIN CHECKPOINT: 9tLqR6d14REnfsZEcNZ2geNMwfDJbqSWDYsZtCbgJQFt sin checkpoint (o inexistente) tras 30 s; revisar el digest y repetir el bloque
exit=4
duración 31 s
```

#### 6. C-3 (guarda de poda): verificada por lectura de código

No se puede ejercitar en localnet. `getServiceInfo` de esta localnet, leído por gRPC antes del cierre, dio:
```text
lowestAvailableCheckpoint = 0 · checkpointHeight = 745
```

Con piso 0, `floor > startCheckpoint` nunca se cumple. Lo que muestra la lectura del Anexo B:
- **Cubre todos los escaneos.** `scanEvents` es el único lugar que llama a `ListEvents`, así que la guarda cubre 0.6,
  `4a`, `4b`, `h` y `final`.
- **Va antes del primer pedido.** Llama a `nodeFloor()` (`getServiceInfo.lowestAvailableCheckpoint`) antes del primer
  `ListEvents`. Si `floor > startCheckpoint`, lanza `historial podado: la ventana empieza en <s> y el piso del nodo es
  <f>`.
- **Sale con exit 5.** El `catch` de nivel superior lo convierte en `ERROR historial podado…` y exit 5. Nunca devuelve una
  lista incompleta.
- **La comparación es estricta.** Con `floor == startCheckpoint`, el checkpoint de inicio sigue disponible.
- **No choca con la cota de 0.6 (C-2).** Cuando hay piso > 0, la cota es `máx(publicación, piso + 16000)`, así que
  nunca queda debajo del piso y 0.6 no dispara C-3.
- **Publicación podada.** Si la publicación ya está podada, `getTransaction(publishTxDigest)` da `TransactionError`, que
  se captura: `kp = null` y la cota sale del piso, con el origen "piso + 16000: lo anterior no es visible".
- **Bloques posteriores.** En `4a`, `4b`, `h` y `final` la ventana empieza en `K0 + 1`, `K4 + 1` o `checkpoint(dh1)`.
  Si quedó debajo del piso, sale con exit 5, que es la regla de ventana de §Sonda.
- **Dónde se ve en TASK-3.** Lo que se observa es el origen que imprime 0.6.

#### 7. Greps §R-6

Corrí los tres greps sobre `verify-mvp.mjs`, los `out-*.txt`, el `diff` y este reporte:
```text
$ grep -nE '[0-9a-fA-F]{40,64}' verify-mvp.mjs out-*.txt diff-v11-vs-anexoB.txt REPORTE_TASK2b.txt
$ grep -nE '0x[0-9a-fA-F]{8,}' verify-mvp.mjs out-*.txt diff-v11-vs-anexoB.txt REPORTE_TASK2b.txt
$ grep -niE '<patrón 3 de §R-6: claves, frases y rutas personales>' verify-mvp.mjs out-*.txt diff-v11-vs-anexoB.txt REPORTE_TASK2b.txt
(los tres sin salida)
```

#### 8. Cierre M-7
- `kill` del PID propio, sin `pkill`. El comando de fondo salió con 144, lo esperado ante SIGTERM.
- En otra llamada, `kill -0` falla, y después borré `<SMOKE_DIR>` con `rm -rf`; ya no existe.
- `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments`. No quedan `deployments/`, `Published.toml`
  ni `Pub.*.toml`.
- `stat`/`ls` de `<HOME real>/.sui/sui_config/` sin `env.sh`: `2026-10-30 17:52:52.515735237 -0500 244 …/client.yaml` y
  `client.yaml`, **idénticos** a la línea base.
- `Move.lock` sin delta, y `git status --porcelain --untracked-files=all` vacío.
- Ningún proceso `sui`; `9000`, `9123` y `9184` libres.
- Sin Chrome, sin tocar Docker ni `:4173`, y nada contra testnet.
- En `<scratchpad>/smoke17-probe/` borré `digests*.json` y `state*.json`, que tenían IDs completos de la génesis borrada.

### Desviaciones del handoff
- **El `verify-mvp.mjs` del scratchpad no coincidía con el Anexo B.**
  - Qué cambió: lo reemplacé por la extracción del handoff y guardé el anterior como `verify-mvp.task2.mjs`.
  - Por qué: el Anexo B es el texto canónico. El archivo previo era la versión de TASK-2, sin C-1..C-4.
  - Verificación: `diff` vacío después de la extracción, y el `diff` previo pegado en §1.
  - La sonda no se modificó: lo que se ensayó es el Anexo B byte por byte.
- **Orden: la sonda `2` corrió después de la ajena 1 (paso 6) y no antes.**
  - Por qué: así salieron las llamadas.
  - Verificación: el bloque `2` no lee la House, y la ajena 1 no toca `G2`. El check `previousTransaction(G2) == d2a` dio
    PASA.
- `none`/`some(@$B)` funcionaron tal cual, y los digests auxiliares fueron a `<SMOKE_DIR>/aux.json`, como en TASK-2.

### Riesgos / pendientes
1. **Proceso: la sonda no estaba parcheada aunque el MID decía que sí.** TASK-3 tiene que volver a extraer el Anexo B y
   pegar el `diff` vacío, como ya exige su precondición.
2. **C-3 solo verificado por lectura.** La primera evidencia real es el origen que imprime 0.6 en TASK-3.
3. **Costo de C-2/C-3 en llamadas.** Hay un `getServiceInfo` extra por escaneo. Es despreciable, pero en testnet suma
   pedidos al fullnode público.

### Documentación
- READMEs: no aplica.
- Snippet para STATUS: "#17 TASK-2b: sonda v1.2 (Anexo B, `diff` vacío) re-ensayada en una localnet aislada nueva con el
  cap en una cuenta que no juega: 96 PASA / 0 NO PASA; autoprueba exit 1, 3, 3, 4. C-3 verificada por lectura (piso 0 en
  localnet)."
- Commit sugerido (§6): `docs: re-rehearse the v1.2 MVP smoke probe with the cap outside the players (#17)`.

## Revisión TASK-2b: PASA

> MID, 2026-11-04, contra `HANDOFF_SMOKE_MVP.md` v1.2 (`5593813`). El MID no corrió la sonda: revisó el output pegado y
> comparó archivos con `diff`.

**Implementa lo pedido.**
- La sonda ensayada es el Anexo B byte por byte: el DEV pegó el `diff` vacío, y el MID repitió la comparación contra
  `5593813`.
- Localnet aislada nueva, variante B y B4, **sin** `transfer_house_cap`: `CAP ∉ {A, B}` y `ADMIN` firma `d4w` y
  `dh1..dh4`.
- Los 8 bloques dan 96 PASA / 0 NO PASA. Son 3 menos que TASK-2 porque no hay `dcap`.
- Los esperados de §3.3, todos cumplidos:
  - "sin dcap";
  - 0.6 con origen "publicación";
  - `CAP == A: false`;
  - `amount == F4 == 8040000`;
  - `amount + Ff == 8080000` y `Ff == 40000`.
- **C-1 comprobada con números.** El MID rehízo la suma. `Σ Δ` da −17989490: A suma +181896511, B −205937620 y CAP
  (`d4w`) +6051619. `Σ gas` da 18029490 y `amount − fees = 40000`. La v1.1 habría dejado afuera los 6051619 de CAP.
- **Autoprueba:**
  - (a) da exit 1 con 4 NO PASA. Son 4 porque ganó A las dos partidas, y la explicación es correcta;
  - (b) da exit 3 dos veces;
  - (c) da exit 4 a los 31 s, con el digest inexistente: **C-4 comprobada**, `TransactionError` reintentado y no exit 5.
- **C-3:** verificada por lectura, de forma razonada (piso 0 en localnet, con `getServiceInfo` pegado). La primera
  evidencia real es el origen que imprime 0.6 en TASK-3, como dice el handoff.
- §R-6 vacío en el reporte (lo repitió el MID) y cierre M-7 limpio.

**Desviaciones: las 2 se aceptan.**
1. Reemplazar el archivo del scratchpad por la extracción del Anexo B era lo correcto: el Anexo B es el texto canónico.
2. El bloque `2` corrió después de la ajena 1. No lee la House y la ajena no toca `G2`, y
   `previousTransaction(G2) == d2a` dio PASA.

### Nota sobre la discrepancia del archivo de la sonda (causa: MID)
- **Qué pasó.** Al escribir la v1.2, el MID aplicó C-1..C-4 sobre una **copia**, `<scratchpad>/verify-mvp.v12.mjs`, y
  embebió esa copia en el Anexo B. No reemplazó `<scratchpad>/smoke17-probe/verify-mvp.mjs`, que siguió siendo la versión
  de TASK-2.
- **Qué se informó.** La entrega del MID decía "un bloque `js` idéntico (`diff` vacío) al archivo parcheado". Era cierto
  para la copia, pero no nombraba la ruta, y se leía como si fuera el archivo de `smoke17-probe/`.
- **Impacto: ninguno.** El DEV no corrió nada con la versión vieja, extrajo el Anexo B y lo ensayó tal cual. El MID
  comprobó que lo extraído es idéntico a la copia que parcheó y al Anexo B de `5593813`.
- **Por qué no se repite.** La fuente de la sonda es solo el Anexo B, nunca un archivo del scratchpad. TASK-2b y TASK-3
  exigen extraerlo y pegar el `diff` vacío antes de correr, y esa regla es la que lo detectó. La v1.2.1 lo deja escrito en
  §Sonda.

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno sobre el trabajo del DEV | — |

Los riesgos 2 y 3 del DEV se aceptan: la evidencia de C-3 llega en TASK-3, y hay un `getServiceInfo` más por escaneo, lo
que es despreciable. El riesgo 1 queda cubierto por la precondición de TASK-3.

### Siguiente paso
- TASK-2b **PASA**. Ningún task más es autorizable antes de #8.
- TASK-3 espera S-1..S-8, que empiezan con la publicación de #8 por el owner.
- La sonda queda fijada en el Anexo B de la v1.2, sin v1.3.

### Mensaje de commit propuesto
(Uno solo, con este reporte y el handoff v1.2.1; abajo.)

### Snippet para STATUS.md
"#17 TASK-2b ✅: sonda v1.2 (Anexo B, `diff` vacío) re-ensayada con el cap en una cuenta que no juega: 96 PASA / 0 NO
PASA; autoprueba exit 1 / 3 / 3 / 4; C-3 por lectura (piso 0 en localnet). TASK-3 espera a #8 y a S-1..S-8."

---

## TASK-2c

> Reporte del DEV (texto plano en el scratchpad, copiado tal cual por el orquestador tras leerlo entero y pasar los 4 greps §R-6).

## Task completado: HANDOFF_SMOKE_MVP — TASK-2c (ensayo de la sonda v1.3.1 con lecturas de testnet)

### Branch (con SHA corto del HEAD)
`feature/issue-17-mvp-smoke` @ `616ef95` (worktree `<repo>` = Battleship-issue17), árbol limpio antes y después.
`origin/master` = `b7aa568` (de ahí sale `testnet.json`, ver abajo).

### Archivos modificados/creados
- En el repo: **ninguno** (`git status --porcelain --untracked-files=all` vacío al cerrar).
- En `<scratchpad>/smoke17-probe/` (carpeta nueva, no existía; no se commitea, DL-2):
  - `verify-mvp.mjs`: extraído del Anexo B v1.3.1, `diff` vacío (abajo);
  - `testnet.json`: `git show origin/master:contracts/deployments/testnet.json` (el worktree no tiene
    `contracts/deployments/`, TASK-2c §3);
  - `digests.json` = `{}`;
  - `out-pre.txt`, `out-c6-4a.txt`, `out-c6-1.txt`, `out-c6-final.txt`: las salidas pegadas abajo.
  - Borrados al terminar: `state.json` (paso 2), `state-viejo.json` (paso 3), `digests-d1c.json` (paso 5). El
    `state-dl13.json` del paso 5 y el `state-url.json` de la autoprueba de URL nunca se crearon (las guardas salen antes).
- Este reporte: `<scratchpad>/REPORTE_TASK2c_17.txt`.

### Qué se implementó (3 líneas máx)
Se extrajo la sonda del Anexo B v1.3.1 con `diff` vacío y se corrió contra el fullnode público de testnet, solo
lecturas: `pre` (C-5/DL-12) en exit 0 con 8/0, la guarda C-6 en exit 5 ×3 con su mensaje, la guarda DL-13 en exit 2 y
las autopruebas en exit 3 ×2 y exit 2. Ninguna firma, ninguna clave, ningún `sui`.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. El task no toca código (handoff §0: "ninguno corre gates de código").
- Contracts: no aplica.
- App: no aplica.
- Tablas de contrato (contracts/README.md) y app/src/sui/ sincronizados: no aplica.

Entorno: Node `v26.13.0` (ruta absoluta de nvm, sin `nvm use`), cwd `<repo>/app`; `@mysten/sui` resuelto desde el
`node_modules` de la raíz del worktree (workspaces), sin `npm ci`. Comando base de cada corrida:

```
cd <repo>/app && "$NODE" --input-type=module - --deployment <scratchpad>/smoke17-probe/testnet.json \
  --url https://fullnode.testnet.sui.io:443 --digests <json> --state <json> --block <b> \
  < <scratchpad>/smoke17-probe/verify-mvp.mjs
```

#### Paso 1. Extracción del Anexo B y `diff`

Extracción con `awk` (desde `## Anexo B`, el primer bloque ```js hasta su ``` de cierre) a
`<scratchpad>/smoke17-probe/verify-mvp.mjs`. `diff` contra las líneas del bloque tomadas del handoff por número
(`## Anexo B` en la línea 1184, apertura ```js en la 1195, cierre en la 1986):

```
790 <scratchpad>/smoke17-probe/verify-mvp.mjs
anexo=1184 open=1195 close=1986
diff exit=0
// verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP v1.3.1 §Sonda). Solo lecturas gRPC.
process.exit(failed === 0 ? 0 : 1);
```

`diff` vacío (sin salida, exit 0). La carpeta `smoke17-probe/` no existía en este scratchpad: no hubo archivo de la
v1.2.1 que reemplazar. No se usó ninguna otra copia (`probe-v121/`, `probe-v13/`, `probe-v131/`, `extract-v131.mjs`
del MID quedaron sin tocar ni leer).

Chequeo previo del SDK por la misma vía (stdin, cwd `<repo>/app`):

```
$ echo "import('@mysten/sui/grpc').then(()=>console.log('ok'))" | "$NODE" --input-type=module -
ok
exit=0
```

#### Paso 2. `pre` con `digests.json` = `{}` y `state.json` nuevo (2026-11-19T19:29:12Z)

```
BLOQUE pre · red testnet · paquete 0x8b78…6f51
CHECK 0.3 PASA chain id 4c78adac, json 4c78adac
CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
CHECK 0.4.fee_rate PASA fee_rate 200
CHECK 0.4.min_bet PASA min_bet 1000000
CHECK 0.4.max_bet PASA max_bet 50000000000
CHECK 0.4.version PASA version 1
INFO F0 = 0 · K0 = 408417046 (altura 408418046 − 1000 leída antes de la House: previousTransaction BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw debajo del piso 404332001 (DL-12))
CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
INFO sin dcap: 0.5 solo con el dueño actual
CHECK 0.6 PASA desde el checkpoint 404348001 (piso + 16000: lo anterior no es visible): 0 GameCreated, 0 GameResolved
INFO K0 por altura coherente: 0 GameResolved ni mutaciones de la House con checkpoint <= K0 o de P desde 404348001 (0 FeeRateUpdated, 0 BetLimitsUpdated, 0 FeesWithdrawn, 0 HouseMigrated)
RESUMEN 8 PASA / 0 NO PASA
exit=0
dur=34s
```

`state.json` al terminar el bloque (después de la coherencia, como pide C-5):

```
{
  "F0": "0",
  "K0": "408417046"
}
```

Contra lo esperado de TASK-2c §3.2:
- exit 0: sí;
- `INFO F0 = 0 · K0 = …` con el origen DL-12: sí (`altura 408418046 − 1000`, `previousTransaction` `BVQf…Tqw`
  debajo del piso 404332001);
- 0.6 con origen "piso + 16000": sí (cota 404348001 = 404332001 + 16000);
- `INFO K0 por altura coherente…` con los conteos de las cuatro mutaciones de admin: sí (0/0/0/0);
- `state.json` con `F0` y `K0`: sí.

Nadie tocó la House antes de la corrida: el origen es DL-12, no DL-9. Los 34 s son los 30 s de C-5 antes de decidir que el
digest está podado, más las lecturas. Coincide con las corridas del MID (32-33 s; `K0` 408406719 y 408415722, este
408417046: la altura avanza, el piso sigue en 404332001). `fetch` no falló en ninguna corrida: no hubo reintentos.

#### Paso 3. Guarda C-6: `state-viejo.json` = `{"K0":"402799414","F0":"0"}`, bloques `4a`, `1` y `final`

(con `digests.json` = `{}`: C-6 corta antes de pedir ningún digest)

```
== bloque 4a
exit=5
BLOQUE 4a · red testnet · paquete 0x8b78…6f51
ERROR historial podado: K0 402799414 quedó debajo del piso 404332001; STOP al MID (regla de ventana v1.3)
== bloque 1
exit=5
BLOQUE 1 · red testnet · paquete 0x8b78…6f51
ERROR historial podado: K0 402799414 quedó debajo del piso 404332001; STOP al MID (regla de ventana v1.3)
== bloque final
exit=5
BLOQUE final · red testnet · paquete 0x8b78…6f51
ERROR historial podado: K0 402799414 quedó debajo del piso 404332001; STOP al MID (regla de ventana v1.3)
```

Exit 5 ×3, los tres **con** `historial podado: K0 402799414 quedó debajo del piso`; ninguno por `Missing` u otra causa.
`state-viejo.json` quedó igual (`{"K0":"402799414","F0":"0"}`): C-6 no escribe estado.

#### Paso 4. Autopruebas sin red

```
== selftest filter-0x
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
== selftest filter-raw
FILTRO: línea cortada (hex de 40 o más caracteres)
exit=3
== URL fuera de la lista
URL no permitida: solo https://fullnode.testnet.sui.io:443 o http://127.0.0.1:9000
exit=2
```

La URL fuera de la lista fue `https://fullnode.mainnet.sui.io:443`, con `--block pre` y un `--state` nuevo: la guarda
sale antes de leer archivos ni cargar el SDK, así que no hubo pedido de red y el `state` nunca se creó.

#### Paso 5. Guarda DL-13: `pre` con `--digests` = `{"d1c":"x"}` y un `state` nuevo

```
BLOQUE pre · red testnet · paquete 0x8b78…6f51
pre no se repite después de d1c (DL-13): K0 y F0 ya están fijados; STOP al MID
exit=2
dur=0s
```

Exit 2 con su mensaje, antes de pedir nada al nodo (0 s). El `state` nuevo no se creó.

#### Paso 6 (opcional, 🔵 6). Cambio de época

No aplica: la sesión fue de 19:29Z a 19:30Z, lejos del cambio de época (≈ 21:24Z). No se anotó un piso "después".

#### Paso 7. `state.json` del paso 2

Borrado al terminar, junto con `state-viejo.json` y `digests-d1c.json`
(`ls <scratchpad>/smoke17-probe/state*.json` → "No such file or directory"). No vale para TASK-3 (DL-13).

#### Resumen de criterios de aceptación (TASK-2c §5)

| Criterio | Resultado |
|---|---|
| `diff` vacío | PASA (exit 0, sin salida) |
| `pre` en exit 0 con el origen de `K0` impreso | PASA (8 PASA / 0 NO PASA, origen DL-12) |
| C-6: exit 5 ×3 con `historial podado: K0 402799414 quedó debajo del piso` | PASA (4a, 1 y final) |
| Guarda DL-13: exit 2 con su mensaje | PASA |
| Autopruebas: exit 3 ×2 y exit 2 | PASA |
| Cuatro greps de §R-6 sobre el reporte, clasificados | PASA (abajo) |

Total: **6/6 criterios PASA**; checks de la sonda en `pre`: **8 PASA / 0 NO PASA**; corridas con el exit esperado:
**9/9** (pre 0; C-6 5/5/5; filter-0x 3; filter-raw 3; URL 2; DL-13 2; import del SDK 0).

### Verificación manual (localnet / testnet, digests de tx si hubo)
- Testnet, solo lecturas gRPC de la sonda (`getServiceInfo`, `getObject`, `getTransaction`, `ListEvents` crudo) contra
  `https://fullnode.testnet.sui.io:443`. Sin localnet, sin firmas, sin transacciones propias.
- Digest leído (no firmado): `BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw` (`previousTransaction` de la House, podado).
- `~/.sui` antes y después (sin cargar ningún env, solo `stat`/`ls`, nunca `cat`), idénticos:
  ```
  antes:   2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
           ls <HOME real>/.sui/sui_config/ → client.yaml
  después: 2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
           ls <HOME real>/.sui/sui_config/ → client.yaml
  ```
- Comandos prohibidos: ningún `sui` (ni `sui client`, `sui keytool`, `sui move`), ni publicación, faucet,
  `simulate`/`dryRun` o `pkill`.
- `git status --porcelain --untracked-files=all` vacío al cerrar; HEAD sigue en `616ef95`.

### Desviaciones del handoff (o "ninguna")
1. **El reporte no se escribe en `documents/REPORTES_SMOKE_MVP.md`** (TASK-2c §4 dice "Tocar"). Se entrega como `.txt`
   en `<scratchpad>/REPORTE_TASK2c_17.txt`, por instrucción explícita del orquestador (no commitear y no editar docs
   salvo lo necesario; la convención de este flujo es que el orquestador lee el `.txt` entero, repite §R-6 y lo agrega
   a `REPORTES_SMOKE_MVP.md`).
   - Por qué: flujo del orquestador para los reportes del DEV.
   - Verificación extra: los cuatro greps de §R-6 sobre este archivo, abajo.
2. **`testnet.json` desde `origin/master`** (`b7aa568`), no desde `<repo>/contracts/deployments/`: el worktree no la tiene.
   Es la alternativa prevista en TASK-2c §3, no una desviación real; se anota por trazabilidad.
3. **`@mysten/sui` del `node_modules` de la raíz** del worktree (npm workspaces). `app/node_modules` no existe, pero la
   resolución desde cwd `<repo>/app` funciona (`ok`). No hizo falta `npm ci`.
4. **Autoprueba de URL**: TASK-2c no fija con qué URL ni con qué bloque. Se usó la de mainnet con `--block pre`. Antes
   del exit 2 la sonda no lee archivos ni hace pedidos de red.

La sonda **no** se tocó: no hace falta una v1.3.2.

### Riesgos / pendientes (o "ninguno")
- El `K0` de este `pre` (408417046) **no vale** para TASK-3 ni TASK-4 (DL-13). El `state.json` está borrado.
- El piso medido sigue en 404332001 (época 1278). Las 11 épocas retenidas se mantienen. En el próximo cambio de época
  (≈ 21:24Z) el piso debería saltar a la época 1279. No se observó en esta sesión (paso 6 opcional, no aplicó).
- Ninguno bloqueante para TASK-3, que sigue esperando a S-8.

### Documentación
- READMEs / agents.md actualizados: no aplica (sin cambios de arquitectura, comandos, contrato ni tests).
- Snippet propuesto para documents/STATUS.md:
  `#17 TASK-2c: PASA (DEV). Sonda v1.3.1 contra testnet, solo lecturas: pre 8/0 exit 0 con K0 por DL-12 (altura − 1000,
  previousTransaction de la House debajo del piso 404332001), cota de 0.6 en piso + 16000, coherencia 0/0/0/0 de las
  mutaciones de admin; C-6 exit 5 ×3; DL-13 exit 2; autopruebas 3/3/2. Siguiente: TASK-3 tras S-8.`

### Commit sugerido (no hecho)
`docs: rehearse the v1.3.1 MVP smoke probe against pruned testnet history (#17)`, con `Refs #17` en el cuerpo.

### Greps de §R-6 sobre este reporte (`/usr/bin/grep`)

Archivos: este reporte y las cuatro salidas crudas de la sonda (`<scratchpad>/smoke17-probe/out-pre.txt`,
`out-c6-4a.txt`, `out-c6-1.txt`, `out-c6-final.txt`). **Primera pasada**, sobre el reporte sin esta sección:

```
--- grep 1 (patrón de §R-6)
exit=1
--- grep 2 (patrón de §R-6)
exit=1
--- grep 3 (patrón de §R-6)
exit=1
--- grep 4 (patrón de §R-6)
REPORTE_TASK2c_17.txt:68:BLOQUE pre · red testnet · paquete 0x8b78…6f51
REPORTE_TASK2c_17.txt:70:CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
REPORTE_TASK2c_17.txt:76:CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
REPORTE_TASK2c_17.txt:113:BLOQUE 4a · red testnet · paquete 0x8b78…6f51
REPORTE_TASK2c_17.txt:117:BLOQUE 1 · red testnet · paquete 0x8b78…6f51
REPORTE_TASK2c_17.txt:121:BLOQUE final · red testnet · paquete 0x8b78…6f51
REPORTE_TASK2c_17.txt:148:BLOQUE pre · red testnet · paquete 0x8b78…6f51
smoke17-probe/out-pre.txt:1:BLOQUE pre · red testnet · paquete 0x8b78…6f51
smoke17-probe/out-pre.txt:3:CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
smoke17-probe/out-pre.txt:9:CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
smoke17-probe/out-c6-4a.txt:1:BLOQUE 4a · red testnet · paquete 0x8b78…6f51
smoke17-probe/out-c6-1.txt:1:BLOQUE 1 · red testnet · paquete 0x8b78…6f51
smoke17-probe/out-c6-final.txt:1:BLOQUE final · red testnet · paquete 0x8b78…6f51
exit=0
```

**Clasificación:**
- Grep 1 y grep 2: vacíos. No hay nada que atribuir.
- Grep 3: vacío, como se exige. Las rutas van con placeholders (`<repo>`, `<scratchpad>`, `<HOME real>`).
- Grep 4: tres valores distintos. Se compararon prefijo y sufijo en memoria contra `<scratchpad>/smoke17-probe/testnet.json`
  (= `contracts/deployments/testnet.json` de `origin/master` `b7aa568`). Solo se imprimió el nombre del campo:
  - `8b78…6f51` → `packageId` (= `originalPackageId`): **atribuido**;
  - `54ee…eb1a` → `houseId`: **atribuido**;
  - `cf08…37fe` → `houseCapId`: **atribuido**. Es el ID del objeto cap, no la cuenta dueña: la sonda nunca imprime la
    cuenta (`CAP` vive solo en memoria).
  - Ninguna coincidencia es una cuenta. 0 sin atribución: no hubo nada que borrar.
- El digest `BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw` y su abreviatura `BVQf…Tqw` son base58, públicos (§R-1), y no
  coinciden con ningún grep.
- Este reporte no tiene volcados del DOM: no hubo navegador en este task.
- No se pega el hash del archivo de la sonda: un hash de archivo no está en la lista de valores atribuibles. La
  identidad con el Anexo B la da el `diff` vacío.

**Segunda pasada**, sobre el reporte final con esta sección. Las coincidencias nuevas del grep 4 son solo las líneas de
arriba citadas otra vez, con los mismos tres valores. La salida está al final del archivo.
Las etiquetas `--- grep N` no copian el patrón literal: el patrón del grep 3 contiene la cadena de ruta que él mismo
busca. Con la etiqueta literal, el grep 3 salía con su propia línea (corregido antes de esta pasada). Los patrones
son los de §R-6 del handoff, sin cambios.

```
--- grep 1 (final)
exit=1
--- grep 2 (final)
exit=1
--- grep 3 (final)
exit=1
--- grep 4 (final): valores distintos y conteo
      4 54ee…eb1a
     15 8b78…6f51
      4 cf08…37fe
lineas con coincidencia=23
```

## Revisión TASK-2c: PASA

> MID, 2026-11-19, contra `HANDOFF_SMOKE_MVP.md` v1.3.1 (`616ef95`).
>
> El MID no corrió los bloques con red: revisó el output pegado, comparó con `diff`/`cmp` las salidas crudas de
> `<scratchpad>/smoke17-probe/` y repitió solo las guardas que no piden nada a la red. Esas son autopruebas `filter-0x`
> y `filter-raw` (exit 3 ×2), la URL de mainnet (exit 2) y DL-13 con `{"d1c":"x"}` (exit 2). Las corrió con el
> archivo del DEV, en una carpeta propia que no se reusa.

### 1. El reporte contra los criterios de TASK-2c v1.3.1 (§5): 6/6

| Criterio | Evidencia | Veredicto |
|---|---|---|
| `diff` vacío | El reporte trae `diff exit=0` y las líneas 1184/1195/1986. El MID extrajo el Anexo B de `git show 616ef95:documents/HANDOFF_SMOKE_MVP.md` y lo comparó con el `verify-mvp.mjs` del DEV: idénticos, 790 líneas, con el mismo `## Anexo B` en la 1184 y la apertura en la 1195 | ✅ |
| `pre` en exit 0 con el origen de `K0` | `RESUMEN 8 PASA / 0 NO PASA`, `exit=0`; origen DL-12, `altura 408418046 − 1000`. Además: cota 404348001 = 404332001 + 16000; coherencia con los 4 conteos de admin en 0; `state.json` con `F0` "0" y `K0` "408417046" | ✅ |
| C-6: exit 5 ×3 con el mensaje | Los tres (`4a`, `1`, `final`) con `historial podado: K0 402799414 quedó debajo del piso 404332001`. Ninguno por `Missing`: el `digests.json` vacío no llegó a leerse, porque C-6 corta antes de `run()` | ✅ |
| Guarda DL-13: exit 2 con el mensaje | `pre no se repite después de d1c (DL-13)…`, `exit=2`, 0 s. El MID la repitió: mismo mensaje, exit 2, sin crear el `state` | ✅ |
| Autopruebas: exit 3 ×2 y exit 2 | Están pegadas, y el MID las repitió con el mismo resultado | ✅ |
| Cuatro greps de §R-6, clasificados | Dos pasadas, con las tres abreviaturas atribuidas a `testnet.json` | ✅ |

Los pasos 5 (DL-13) y 7 (borrar los `state`) se cumplieron. El paso 6, opcional, no aplicaba: la sesión fue de 19:29Z a
19:30Z, lejos del cambio de época.

### 2. Las salidas crudas contra el reporte

- **`out-pre.txt`:** las 13 líneas son idénticas, carácter por carácter, al bloque del paso 2. Los archivos tienen hora
  14:29 −0500 = 19:29Z, la que dice el reporte.
- **`out-c6-4a.txt`, `out-c6-1.txt` y `out-c6-final.txt`:** son idénticos a los del paso 3.
- **`testnet.json`:** igual byte por byte (`cmp`) al de `origin/master`.
- **`digests.json`:** es `{}`.
- **`REPORTES_SMOKE_MVP.md`:** desde "## Task completado…", es idéntica a `<scratchpad>/REPORTE_TASK2c_17.txt` (`diff`
  vacío). El orquestador la copió sin cambios.
- **Comparación con lo que vio el MID** (cuatro corridas propias de `pre`, de 18:46Z a 19:10Z, más la del MAYOR):
  - el piso sigue en 404332001 y la cota en 404348001;
  - `K0` avanza con la altura: 408406719 → 408415722 → 408417046;
  - en las dos corridas v1.3.1 (la del MID y esta), los cuatro conteos de admin dan 0.
- **Limitación (🔵 1):** los crudos guardan solo el stdout de `pre` y de C-6, sin el exit code. Las autopruebas y DL-13 no
  tienen archivo crudo. Por eso el MID repitió esas guardas, que son las únicas deterministas sin red. Para TASK-3/4: un
  archivo crudo por corrida, con `exit=$?` en la última línea.

### 3. §R-6 sobre lo agregado a `REPORTES_SMOKE_MVP.md`

Los cuatro greps del handoff, con `/usr/bin/grep`, corridos por el MID sobre las 296 líneas agregadas (`git diff -U0`):

```
g1  (sin salida)
g2  (sin salida)
g3  (sin salida)
g4        5 54ee…eb1a
         16 8b78…6f51
          5 cf08…37fe
```

- **Atribuidas** contra `testnet.json`: `54ee…eb1a` es `houseId`, `8b78…6f51` es `packageId` (igual a
  `originalPackageId`) y `cf08…37fe` es `houseCapId`. Ninguna es una cuenta.
- **Los conteos difieren de la segunda pasada del DEV (4/15/4)** en +1 por valor. Es la propia línea de la tabla final
  del DEV, que cita cada abreviatura una vez más.
- **`BVQf…Tqw`** es base58 (digest público, §R-1) y no entra en el patrón hexadecimal.
- **Sin volcados del DOM:** no hubo navegador.
- **Rutas:** solo placeholders (`<repo>`, `<scratchpad>`, `<HOME real>`). `~/.sui` se revisó con `stat`/`ls` antes y
  después, y quedó idéntico.

### 4. Desviaciones: las 4 se aceptan

1. **El reporte va como `.txt` y lo agrega el orquestador.** Es el flujo vigente del orquestador para los reportes del
   DEV. El orquestador volvió a pasar §R-6 y el MID lo repitió (punto 3). Aceptada.
2. **`testnet.json` desde `origin/master`.** Es la alternativa que prevé TASK-2c §3, así que no es una desviación.
   `cmp` igual. Aceptada.
3. **`@mysten/sui` del `node_modules` de la raíz (workspaces), sin `npm ci`.** El criterio real de §Sonda es que
   `import('@mysten/sui/grpc')` dé `ok`, y dio `ok`. El MID corrió todo de la misma forma. Aceptada. El texto de §Sonda
   ("si el worktree no tiene `node_modules`, antes va `npm ci`") queda para ajustar (🔵 2).
4. **La autoprueba de URL usó mainnet con `--block pre`.** Es la misma elección que el MAYOR en su revisión de la v1.3.
   La guarda sale antes de leer archivos o cargar el SDK. Aceptada.

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| 1 | 🔵 | M4, evidencia verificable | `<scratchpad>/smoke17-probe/out-*.txt` | Los crudos no guardan el exit code. Las autopruebas y DL-13 no tienen crudo (el MID las repitió, sin delta) | En TASK-3/4, un crudo por corrida con `exit=$?` al final. No bloquea TASK-2c |
| 2 | 🔵 | LIM / precisión del handoff | `HANDOFF_SMOKE_MVP.md`, §Sonda, "Dónde y cómo" | "Si el worktree no tiene `node_modules`, antes va `npm ci`" no contempla los workspaces, donde las dependencias están en la raíz | Con la próxima versión del handoff: "si `import('@mysten/sui/grpc')` no da `ok`, antes va `npm ci` con Node 26". Sin nueva ronda |

Nada contra el trabajo del DEV: sin 🔴, 🟠 ni 🟡. La sonda no se tocó y no hace falta una v1.3.2.

### Siguiente paso
- TASK-2c **PASA**. Con esto, C-5 (DL-12 con las coherencias de 🟡 1), C-6 y la guarda DL-13 quedan ensayadas por el DEV
  contra la House real de testnet.
- El `K0` 408417046 de este ensayo **no** vale para TASK-3 (DL-13), y su `state.json` está borrado.
- TASK-3 espera a S-8 (#16 TASK-5). Su precondición "TASK-2c en PASA" queda cumplida.

### Mensaje de commit propuesto

```
docs: report and review the v1.3.1 probe rehearsal on testnet (#17)

TASK-2c of HANDOFF_SMOKE_MVP v1.3.1: the Annex B probe, extracted with an
empty diff, ran read-only against the public testnet fullnode. pre gave
8 PASS / 0 FAIL with K0 from the node height (DL-12, the House's previous
transaction is below the floor) and zero admin mutations in the coherence
scan; C-6 exited 5 three times with the pruned-history message; the DL-13
guard exited 2; the self-tests exited 3, 3 and 2. MID review: PASS, four
deviations accepted, two minor notes for TASK-3.

Refs #17

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## TASK-3 y TASK-4

> Reporte del DEV con los anexos de cada bloque y las revisiones del MID (texto plano en el scratchpad, copiado tal cual por el orquestador tras leerlo y pasar los greps §R-6 y la búsqueda de las cuentas A/B/C: 0 coincidencias). Issues creados por el orquestador: #70, #71, #72 y #73.

## Task completado: HANDOFF_SMOKE_MVP — TASK-3 (precondiciones públicas, paso 0)

### Branch (con SHA corto del HEAD)
`feature/issue-17-mvp-smoke` @ `296c07b` (worktree `<repo>` = Battleship-issue17). `296c07b` es el merge de `master`
`M` = `77bb49c` en la branch. Árbol limpio al empezar; al terminar, solo `?? documents/SMOKE_MVP.md`. Sin commits ni push.

### Archivos modificados/creados
- En el repo: `documents/SMOKE_MVP.md` (nuevo, sin commitear), copiado del Anexo A v1.3.1 con `diff` vacío (líneas
  1108-1181 del handoff) y después llenado: cabecera, Precondiciones y filas 0.1-0.7 y N-a. El resto queda en ⏳.
- En `<scratchpad>/smoke17-probe/` (no se commitea, DL-2):
  - `verify-mvp.mjs`: **sobrescrito** con una extracción nueva del Anexo B v1.3.1, `diff` vacío (paso 1). Había una
    copia de TASK-2c. No se usó: se comparó con `cmp` después de la extracción y era idéntica;
  - `digests.json`: reescrito con `{}`;
  - `state.json`: **nuevo**, del `pre` de este task. **Se conserva para TASK-4**;
  - `out-t3-0.1-check.txt`, `out-t3-pre.txt` (con `exit=` en la última línea, 🔵 1 de la revisión de TASK-2c) y
    `out-t3-pre.time`;
  - los crudos de TASK-2c (`out-pre.txt`, `out-c6-*.txt`, `testnet.json`) quedan sin tocar. El `testnet.json` viejo es
    igual byte por byte al del worktree (`cmp`), pero esta corrida usó `<repo>/contracts/deployments/testnet.json`.
- `<scratchpad>/bundle17/`: `index.html`, `bundle.js` (lo que sirve Railway), `out-0.2-index.txt`, `out-0.2-bundle.txt`.
- `<scratchpad>/n17/`: `na.mjs` (script de N-a, no se commitea), `out-na.txt` y `out-na-b.txt`.
- `<scratchpad>/ci-m17/`: logs de los 4 jobs de la CI de `M` (run 44621915244).
- Perfiles de Chrome `<scratchpad>/chrome-17a` y `chrome-17b`: borrados al terminar.
- Este reporte: `<scratchpad>/REPORTE_TASK3_17.txt`.

### Qué se implementó (3 líneas máx)
Se creó `SMOKE_MVP.md` desde el Anexo A, con las Precondiciones y el paso 0 llenos. 0.1, 0.3-0.6 y N-a quedan en ✅. 0.2
tiene el `curl` hecho pero espera el commit del deploy, y 0.7 espera al owner. `pre` (DL-12) dio F0 = 0 y K0 = 408454921,
y su `state.json` queda para TASK-4. Baseline de `M` re-declarado desde su CI. Sin firmas, sin claves y sin `sui`.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. El task no toca código, así que no corre gates (handoff §0).
- Contracts y App: no aplica. Tablas de contrato y `app/src/sui/`: no aplica.

#### Baseline de `M` = `77bb49c` (re-declarado desde la CI, `gh api`)
Run [44621915244](https://github.com/sdelvalle57/sui_battleship/actions/runs/44621915244) (push a `master`, 21:45:13Z).
Los cuatro jobs dieron `success`: `app`, `contracts`, `deploy-image` y `framework-drift`. Los valores salen de sus logs:

| Área | Valor (log de la CI de `77bb49c`) |
|---|---|
| Sui CLI / Node / npm | `sui 1.83.0-16d2dc1e05ed` / `node: v26.13.1` (setup-node con `.nvmrc` = `26`) / npm `11.20.0`. La imagen usa `node:26.13.0` (`Dockerfile:4`) y en local hay v26.13.0 |
| contracts | `Test result: OK. Total tests: 83; passed: 83; failed: 0`; scripts `ℹ tests 104` / `ℹ fail 0`; `1 despliegue(s) válidos y coherentes con Published.toml` |
| app | `Test Files  65 passed (65)` / `Tests  1156 passed (1156)`; `found 0 vulnerabilities`; `292 packages have verified registry signatures`; `dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB` |
| imagen | `OK (positivo)`, P1-P12; P7/P8 sobre `/assets/index-B3BeMVQC.js` |
| `framework-drift` | success, con el aviso H13 informativo `CLI atrasada: testnet en PV 142, la CLI 1.83.0 llega a 140` |

Delta contra el §0 del handoff (`376412f`): **ninguno en gates**. Entre `376412f` y `77bb49c`:
- `30e1405` (#68) toca `.github/workflows/ci.yml`, solo un comentario;
- todo lo demás son docs.

`app/src/`, `contracts/`, el lockfile, el `Dockerfile` y `.dockerignore` no cambian. El bundle de PR #68
(run 44620329979) también es `index-B3BeMVQC.js 917.80 kB`.

Observación para el MID: el §0 del handoff dice `v26.13.0` para la CI. La CI de `376412f` (run 44590519441) ya decía
`node: v26.13.1`, igual que la de `M`, así que no es un delta nuevo. El texto del §0 mezcla el Node local con el de
la CI. No afecta a nada.

### Verificación manual (localnet / testnet, digests de tx si hubo)
Sin localnet y sin transacciones propias. Se leyó, sin firmar, el digest `BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw`
(`previousTransaction` de la House, podado). Comando base de la sonda, con Node v26.13.0 por ruta absoluta y cwd
`<repo>/app`:

```
cd <repo>/app && "$NODE" --input-type=module - --deployment <repo>/contracts/deployments/testnet.json \
  --url https://fullnode.testnet.sui.io:443 --digests <scratchpad>/smoke17-probe/digests.json \
  --state <scratchpad>/smoke17-probe/state.json --block pre < <scratchpad>/smoke17-probe/verify-mvp.mjs
```

#### Paso 1 (punto 3 del pedido). Extracción del Anexo B y `diff` (21:51:08Z)

Desde `## Anexo B` (línea 1184), el bloque entre la apertura ```js (1195) y su cierre (1986), con `sed -n`, a
`<scratchpad>/smoke17-probe/verify-mvp.mjs`. **Sobrescribe** la copia de TASK-2c:

```
anexo=1184 open=1195 close=1986
790 <scratchpad>/smoke17-probe/verify-mvp.mjs
diff exit=0
copia previa (TASK-2c) identica al Anexo B
// verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP v1.3.1 §Sonda). Solo lecturas gRPC.
process.exit(failed === 0 ? 0 : 1);
```

`diff` vacío. La fuente fue solo el Anexo B del handoff de `296c07b`. Igual que en TASK-2c, el SDK cargó por la misma
vía: `import('@mysten/sui/grpc')` → `ok`, exit 0, con el `node_modules` de la raíz del worktree y sin `npm ci`.

#### 0.1. `check` (`out-t3-0.1-check.txt`)

```
2026-11-19T21:51:13Z
v26.13.0
1 despliegue(s) válidos y coherentes con Published.toml
exit=0
```

Se corrió en `296c07b`. `git diff --quiet 77bb49c HEAD -- contracts/ app/ Dockerfile .dockerignore package.json
package-lock.json` da igual: la branch solo suma docs de #17 sobre `M`. → ✅

#### 0.2. `curl` del bundle servido (`<scratchpad>/bundle17/`)

```
2026-11-19T21:51:19Z
index HTTP 200 464B
curl exit=0
(ruta en index.html: /assets/index-B3BeMVQC.js, una sola)
2026-11-19T21:51:26Z
bundle /assets/index-B3BeMVQC.js
bundle HTTP 200 917804B content-type text/javascript; charset=utf-8
curl exit=0
packageId: 1 lineas, 2 ocurrencias
houseId: 1 lineas, 1 ocurrencias
publishTxDigest: 1 lineas, 1 ocurrencias
```

- Los tres valores se leyeron con `jq -r` de `<repo>/contracts/deployments/testnet.json` a variables y nunca se
  imprimieron. `grep -c` da ≥ 1 en los tres, y HTTP 2xx en `/` y en el bundle.
- **Bundle servido contra la CI de `M`:** el nombre es el mismo, `index-B3BeMVQC.js`, en el run 44621915244 de `M` y en el
  44620329979 de PR #68. El tamaño también: 917804 B = `917.80 kB`. El nombre lleva el hash de contenido de Vite.
- **Commit del deploy:** los merges de solo docs no redespliegan Railway, porque los docs no están en las watch paths
  (`app/README.md:245-266`).
  - Desde `376412f`, el último merge que tocó una watch path (`Dockerfile`), hasta `77bb49c`, lo único que cambia dentro
    de las watch paths es `app/README.md`, excluido por `!app/README.md`.
  - Así que el deploy activo puede ser de un commit anterior a `M`, con el mismo `dist`.
  - El commit lo da el owner: `⏳ owner`.
- → **⏳** hasta que llegue el commit. El `curl` cumple lo esperado.

#### 0.3-0.6. Sonda `pre` (`out-t3-pre.txt`; **inicio 2026-11-19T21:52:20Z**, fin 21:52:53Z, 33 s)

`state.json` nuevo (no existía ningún `state*.json` antes), `digests.json` = `{}`:

```
BLOQUE pre · red testnet · paquete 0x8b78…6f51
CHECK 0.3 PASA chain id 4c78adac, json 4c78adac
CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
CHECK 0.4.fee_rate PASA fee_rate 200
CHECK 0.4.min_bet PASA min_bet 1000000
CHECK 0.4.max_bet PASA max_bet 50000000000
CHECK 0.4.version PASA version 1
INFO F0 = 0 · K0 = 408454921 (altura 408455921 − 1000 leída antes de la House: previousTransaction BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw debajo del piso 404332001 (DL-12))
CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
INFO sin dcap: 0.5 solo con el dueño actual
CHECK 0.6 PASA desde el checkpoint 404348001 (piso + 16000: lo anterior no es visible): 0 GameCreated, 0 GameResolved
INFO K0 por altura coherente: 0 GameResolved ni mutaciones de la House con checkpoint <= K0 o de P desde 404348001 (0 FeeRateUpdated, 0 BetLimitsUpdated, 0 FeesWithdrawn, 0 HouseMigrated)
RESUMEN 8 PASA / 0 NO PASA
exit=0
```

`state.json` (se conserva para TASK-4):

```
{
  "F0": "0",
  "K0": "408454921"
}
```

- **F0 = 0.**
- **K0 = 408454921**, con origen **DL-12**: la altura 408455921 − 1000, leída antes que la House. Su
  `previousTransaction` está debajo del piso 404332001. Nadie tocó la House: no aplica DL-9.
- **Cota de 0.6 = 404348001**, con origen **"piso + 16000"** (la publicación está podada). 0 `GameCreated` y 0
  `GameResolved`, así que no hay ajenas. La coherencia de DL-12 da 0/0/0/0 en las cuatro mutaciones de admin.
- 0.3, 0.4, 0.5 y 0.6: ✅.
- **DL-13:** este `pre` (21:52:20Z) es el que vale si TASK-4 empieza en esta sesión. Es el último antes de `d1c`. El
  plazo de ≤ 7 días hasta `final` vence el **2026-11-26 21:52Z**.
  - La sonda bloquea `pre` después de `d1c` (exit 2).
  - Si TASK-4 no empezara en esta sesión, este `pre` quedaría provisorio y se repetiría como `0.4.r1`/`0.6.r1`.

Lectura extra permitida (`ledgerService.getServiceInfo`, la misma lectura de la sonda; solo números), a las
21:54:07Z:

```
epoch 1289 checkpointHeight 408456388 lowestAvailableCheckpoint 404332001
```

**Observación para DL-13/DL-14:** ya pasó el cambio de época de ≈ 21:24Z (época 1289) y el piso **no saltó**: sigue en
404332001, el primer checkpoint de la época 1278. A esta hora el nodo conserva 12 épocas (1278..1289), no 11. Puede ser
que la poda vaya con retraso respecto del cambio de época, o que el operador haya cambiado la retención. Para la
corrida, el margen solo crece: con `K0` = 408454921 se está muy por encima del piso.

#### N-a. Chrome headless sin wallet, `<URL>/#/`

Reglas de §Navegador:
- `/usr/bin/google-chrome --headless=new` con un perfil desechable nuevo `<scratchpad>/chrome-17a` (`--user-data-dir`
  con `HOME`/`XDG_*` aislados dentro del perfil);
- CDP solo en `127.0.0.1` (`--remote-debugging-port=0`);
- `--disable-extensions`, sin wallet, una sola pestaña.

El script imprime solo el texto del badge (`.network-badge`), booleanos y conteos. No vuelca el DOM.

```
2026-11-19T21:53:36Z
N-a ruta #/
N-a badge: "testnet · nodo OK"
N-a "testnet" y "nodo OK" en ≤ 30 s: true (2725 ms desde Page.navigate)
INFO violaciones de CSP: 0
INFO errores de consola: 3; hosts de los errores de red: sui-battleship-app-production.up.railway.app, api.slush.app
INFO Chrome cerrado: true
exit=0
```

Una segunda corrida igual, con otro perfil desechable (`chrome-17b`, 21:53:54Z), clasifica los 3 errores. El badge
apareció en 2342 ms, con los mismos conteos:

```
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS polic [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
```

- Los tres errores son el pedido a `api.slush.app/api/wallet/metadata` (CORS/403), conocido por E-6 de #15. No es rojo.
- El host de Railway del primer resumen es el `url` del mensaje de CORS (el origen de la página), no un fallo de la app.
- 0 violaciones de CSP.
- → N-a ✅. N-f entero queda para el bloque 5 de TASK-4; esto es solo un dato adelantado para N-f/O-8.

Procesos de Chrome:
- antes de lanzar había 3 procesos `google-chrome` del usuario, que no se tocaron;
- se cerró solo el Chrome propio, con `Browser.close` por CDP;
- su PID guardado ya no existía (`kill -0` falla) y ningún proceso usa los perfiles `chrome-17a`/`chrome-17b`;
- los perfiles se borraron (`ls` → No such file or directory);
- no se usó `pkill`.

#### 0.7
`⏳ owner`.

#### `~/.sui` (sin cargar ningún env; solo `stat`/`ls`, nunca `cat`)
```
antes:   2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml   ls → client.yaml
después: 2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml   ls → client.yaml
```
Idénticos. Comandos prohibidos: ningún `sui` (ni `sui client`, `sui move` o `keytool`). Tampoco publicación, faucet,
`simulate`/`dryRun`, `pkill` ni el navegador o el perfil del usuario.

#### Resumen del paso 0
| Fila | Estado |
|---|---|
| 0.1 | ✅ |
| 0.2 | ⏳ (`curl` cumple: HTTP 200 y conteos 1/1/1; falta el commit del deploy del owner) |
| 0.3 | ✅ |
| 0.4 | ✅ (F0 0, K0 408454921, DL-12) |
| 0.5 | ✅ |
| 0.6 | ✅ (cota 404348001, piso + 16000; 0/0; coherente 0/0/0/0) |
| 0.7 | ⏳ owner |
| N-a | ✅ |

Criterio de TASK-3 (0.1-0.7 y N-a en ✅): **pendiente solo de lo que da el owner** (0.2 y 0.7). No hay ningún ❌.

### Desviaciones del handoff (o "ninguna")
1. **El reporte va como `.txt`** en `<scratchpad>/REPORTE_TASK3_17.txt`, no en `REPORTES_SMOKE_MVP.md`. Es el flujo
   vigente del orquestador (desviación 1 de TASK-2c, aceptada).
2. **`SMOKE_MVP.md`:**
   - las filas 0.2 y 0.7 y los datos de la cuenta A, la wallet y el commit del deploy quedan en `⏳ owner`, por pedido
     del orquestador, que los pasa después;
   - la celda "es | no es" de A quedó como `⏳ owner: es | no es`;
   - la URL va escrita en Precondiciones, como pide el pedido. Es pública y ya está en `app/README.md` desde S-8. §R-1
     pide `<URL>` como placeholder solo en reportes y handoffs.
3. **N-a se corrió dos veces**, con perfiles desechables distintos. La segunda suma la impresión del texto de los errores
   de consola, recortado a 160 caracteres y pasado por el filtro de hex, para clasificarlos. El badge dio ✅ en las dos.
4. **Una lectura extra de `getServiceInfo`** (época, altura y piso), fuera de la sonda pero dentro de las lecturas
   permitidas de §Sonda, para dejar anotado que el piso no saltó con el cambio de época.

La sonda no se tocó.

### Riesgos / pendientes (o "ninguno")
- **Del owner (los pasa el orquestador):**
  - si A es o no la publicadora;
  - el nombre de la wallet de extensión;
  - el commit del deploy activo en Railway (0.2);
  - 0.7: A, B y C fondeadas en testnet.
- **DL-13:**
  - el `pre` vigente es el de 21:52:20Z (`K0` 408454921) y su `state.json` está en `<scratchpad>/smoke17-probe/`;
  - si TASK-4 empieza en esta sesión, vale tal cual. Si no, se repite antes de `d1c` (`0.4.r1`/`0.6.r1`);
  - plazo hasta `final`: 2026-11-26 21:52Z.
- **Piso del nodo sin saltar** después del cambio de época (12 épocas retenidas a las 21:54Z). No afecta a la corrida.
  Es un dato para DL-14 en TASK-5: la retención cambia.
- **§0 del handoff:** dice Node `v26.13.0` para la CI, y la CI usa v26.13.1 desde al menos `376412f`. Es un 🔵 de texto,
  sin efecto.

### Documentación
- READMEs / `agents.md` actualizados: no aplica.
- Snippet propuesto para `documents/STATUS.md`:
  `#17 TASK-3: paso 0 en ✅ salvo lo del owner (DEV). SMOKE_MVP.md creado desde el Anexo A; M = 77bb49c (CI 44621915244:
  83/104/1 despliegue, app 1156/65, index-B3BeMVQC.js 917.80 kB, deploy-image positivo). Bundle servido = el de la CI de
  M. pre 8/0 (21:52:20Z): F0 0, K0 408454921 por DL-12, cota 404348001 (piso + 16000), coherente 0/0/0/0. N-a ✅.
  Pendiente del owner: 0.2 (commit del deploy), 0.7, A ¿publicadora?, wallet. Siguiente: TASK-4.`

### Commit sugerido (no hecho)
`docs: start the MVP smoke record with the step-0 preconditions (#17)`, con `Refs #17` en el cuerpo y sin palabras de
cierre.

### Greps de §R-6 (`/usr/bin/grep`)
Archivos:
- este reporte;
- `<repo>/documents/SMOKE_MVP.md`;
- los crudos `<scratchpad>/smoke17-probe/out-t3-*.txt` y `out-t3-pre.time`;
- `<scratchpad>/bundle17/out-0.2-*.txt`;
- `<scratchpad>/n17/out-na*.txt`;
- `<scratchpad>/smoke17-probe/state.json`.

El `bundle.js` servido no se pega ni se cita, así que no entra en los greps.

Las etiquetas no copian el patrón literal, para que el grep 3 no encuentre su propia línea (lo mismo que en TASK-2c).

**Primera pasada** (sobre el reporte sin esta sección y los demás archivos):

```
--- grep 1 (patrón de §R-6)
exit=1
--- grep 2 (patrón de §R-6)
exit=1
--- grep 3 (patrón de §R-6)
exit=1
--- grep 4 (patrón de §R-6): líneas
REPORTE_TASK3_17.txt:130:BLOQUE pre · red testnet · paquete 0x8b78…6f51
REPORTE_TASK3_17.txt:132:CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
REPORTE_TASK3_17.txt:138:CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
<repo>/documents/SMOKE_MVP.md:5:  (Precondiciones: packageId 0x8b78…6f51 y House 0x54ee…eb1a)
<repo>/documents/SMOKE_MVP.md:19: (fila 0.4: House 0x54ee…eb1a)
<repo>/documents/SMOKE_MVP.md:20: (fila 0.5: HouseCap 0xcf08…37fe)
smoke17-probe/out-t3-pre.txt:1:BLOQUE pre · red testnet · paquete 0x8b78…6f51
smoke17-probe/out-t3-pre.txt:3:CHECK 0.4.shared PASA House 0x54ee…eb1a Shared y tipo exacto: true
smoke17-probe/out-t3-pre.txt:9:CHECK 0.5.cap PASA HouseCap 0xcf08…37fe con dueño AddressOwner (CAP)
--- grep 4: valores distintos y conteo
      4 54ee…eb1a
      3 8b78…6f51
      3 cf08…37fe
```

(Las líneas 5, 19 y 20 de `SMOKE_MVP.md` son largas: aquí van resumidas, con el valor que coincide. El texto exacto está
en el archivo.)

**Clasificación** (prefijo y sufijo comparados con `jq` contra `<repo>/contracts/deployments/testnet.json`; solo se
imprimió el nombre del campo):
- `8b78…6f51` → `packageId` (= `originalPackageId`): **atribuido**.
- `54ee…eb1a` → `houseId`: **atribuido**.
- `cf08…37fe` → `houseCapId`: **atribuido**. Es el ID del objeto cap, no la cuenta dueña; la sonda nunca imprime `CAP`.
- Ninguna coincidencia es una cuenta. 0 sin atribución: no hubo nada que borrar.
- Grep 1 y grep 2: vacíos. El prefijo de 16 hex del sha256 del bundle (`out-0.2-bundle.txt`) no llega a ningún patrón
  y no se cita en este reporte.
- Grep 3: vacío. Las rutas van con placeholders (`<repo>`, `<scratchpad>`, `<HOME real>`).
- Los digests base58 (`BVQf…Tqw` completo) son públicos (§R-1) y no entran en los patrones hex.
- **Sin volcados del DOM:** de Chrome solo van el texto del badge, booleanos, conteos y el texto de los 3 errores de
  consola. Esos errores son del pedido a `api.slush.app`, sin cuentas: sin wallet no hay ninguna.
- Los SHA de commit (`77bb49c`, `296c07b`, `376412f`, `30e1405`, `b7aa568`) y los IDs de run no llegan a los patrones.

**Segunda pasada** (sobre este reporte final, con esta sección). Las coincidencias nuevas del grep 4 son las mismas
líneas citadas otra vez, con los mismos tres valores:
```
--- grep 1 (final)
exit=1
--- grep 2 (final)
exit=1
--- grep 3 (final)
exit=1
--- grep 4 (final): valores distintos y conteo
     10 54ee…eb1a
      8 8b78…6f51
      8 cf08…37fe
lineas con coincidencia=24
```

Los conteos de una nueva corrida del grep 4 sobre este archivo final suben en +1 por valor: es la tabla de arriba, que se cita a sí misma. Siguen siendo los mismos tres valores atribuidos.

==========================================================================================================================
## Anexo: TASK-4, 0.7 y bloque 1 (pedido del orquestador del 2026-11-19, a continuación de TASK-3)

### Datos del owner (pasados por el orquestador)
- **0.7:**
  - A es la publicadora y tiene el `HouseCap`. El orquestador lo comprobó: true;
  - saldos: A ≈ 0,95 SUI, B 1,00 SUI, C 0 SUI. C sin saldo: no firma, y alcanza para esta corrida;
  - wallet: Slush, de extensión, en testnet;
  - → 0.7 ✅. En Precondiciones: "A (crea; es la publicadora)" y "Wallet de extensión Slush".
- **0.2:** el commit del deploy de Railway sigue pendiente del owner, así que sigue en ⏳.
- **Bloque 1:**
  - `d1c` = `Gw4zETm8NNd8CTrCpHd4vqRPmC16oHrRMxxocrFNLT2R`;
  - `d1a` = `4wjYSac6vJzZKMt6bbVoZhQok8FtVCMrCkiq1TWgzfiu`;
  - owner: "todo funcionó bien". No copió los textos del resultado.
  - El orquestador leyó winner == B. Lo comparé solo en memoria y coincide con la sonda.
- **Observación nueva:** con Slush, el "+" de "Connected accounts" no hace nada, así que hay una sola cuenta conectada a
  la vez. El owner cambia de cuenta con Disconnect → cambiar la cuenta en Slush → "Conectar wallet". Va como **O-9**
  (📝, observación, nunca ❌).

### Sonda, bloque `1` (`<scratchpad>/smoke17-probe/out-t4-1.txt`; 2026-11-19T22:47:47Z a 22:47:53Z)
Antes de correr:
- la sonda seguía intacta (`diff` contra el Anexo B, líneas 1196-1985, vacío);
- `digests.json` tenía `d1c` y `d1a`;
- el `state.json` de TASK-3 seguía con `F0` "0" y `K0` "408454921". C-6 no cortó: `K0` está encima del piso.

```
BLOQUE 1 · red testnet · paquete 0x8b78…6f51
CHECK 1.B≠A PASA B ≠ A: true
INFO gas d1c Gw4zETm8NNd8CTrCpHd4vqRPmC16oHrRMxxocrFNLT2R: 1965299 (computation 1000000, storage 1953200, rebate 987901)
CHECK 1.d1c.success PASA Gw4zETm8NNd8CTrCpHd4vqRPmC16oHrRMxxocrFNLT2R
CHECK 1.d1c.sender PASA sender == A: true
CHECK 1.d1c.creator PASA creator == A: true
CHECK 1.d1c.bet PASA bet 100000000
CHECK 1.d1c.opponent PASA opponent none: true
CHECK 1.d1c.fee_rate PASA fee_rate 200
CHECK 1.d1c.delta PASA Δ(A) -101965299 == −bet − gas -101965299
INFO 1.d1c: game_id 0x0c6c…826a
INFO gas d1a 4wjYSac6vJzZKMt6bbVoZhQok8FtVCMrCkiq1TWgzfiu: 2474748 (computation 1000000, storage 4955200, rebate 3480452)
CHECK 1.d1a.success PASA 4wjYSac6vJzZKMt6bbVoZhQok8FtVCMrCkiq1TWgzfiu
CHECK 1.d1a.game_id PASA game_id == 0x0c6c…826a: true
CHECK 1.d1a.creator PASA creator == A: true
CHECK 1.d1a.acceptor PASA acceptor == B: true
CHECK 1.d1a.winner PASA winner == B
CHECK 1.d1a.pot PASA pot 200000000 (2·bet 200000000)
CHECK 1.d1a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 1.d1a.payout PASA payout 196000000 (pot − fee 196000000)
CHECK 1.d1a.delta.B PASA gana B: Δ(B) 93525252 == −bet + payout − gas 93525252
CHECK 1.d1a.delta.A PASA gana B: Δ(A) 0 == 0
CHECK 1.d1a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 1.d1a.object PASA 0x0c6c…826a Resolved, acceptor == B y winner == evento: true, stake 0
OBS O-7 d1a: gasBudget 3474748, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 20 PASA / 0 NO PASA
exit=0
```

`state.json` sumó `G1`, completo, como pide §Sonda: son IDs públicos y nunca direcciones. No se pega; acá va
abreviado: `0x0c6c…826a`. `F0`/`K0` no cambiaron.

### Filas de `SMOKE_MVP.md`
| Fila | Estado | Base |
|---|---|---|
| 0.7 | ✅ | owner; nota "C sin saldo: no firma" |
| 1a | ✅ PASA | sonda: `d1c` 7/7 checks más `B≠A`; `Δ(A) = −bet − gas` exacta |
| 1b | ✅ PASA | owner: "todo funcionó bien" (B y C vieron G1). N-b no medible: `d1a` ya había pasado cuando llegó el bloque (regla de N-b) |
| 1c | ✅ PASA | sonda: `d1a` 12/12 checks (winner B, pozo/comisión/pago exactos, Δ(B) y Δ(A) exactos, `Random` último, G1 `Resolved` con stake 0). Los textos de A y B no los copió el owner: la fila se apoya en "todo funcionó bien" |
| O-7 (`d1a`) | dato tomado | `gasBudget` 3474748 (≤ 10000000: true), `gasPrice` 1000. Es el `gasData` de la transacción que firmó la wallet. `d2a` queda para el bloque 2: la fila sigue ⏳ |
| O-9 | 📝 | nueva fila de observación (cambio de cuenta con Slush) |

**Por qué N-b no se corrió:** §Navegador dice que, si `d1a` ya pasó, N-b es "no medible". G1 ya estaba `Resolved` y no
se lanzó Chrome en este bloque. No quedan procesos ni perfiles de Chrome.

### Desviaciones (bloque 1)
1. **Nueva fila O-9 en "Heredado de #12 y #13"**, para la observación del cambio de cuenta con Slush, por pedido del
   orquestador ("O-x o nota"). No es un paso y no cuenta en PASA/TOTAL.
2. **1c en ✅ sin los textos de resultado copiados por el owner.** Todo lo verificable on-chain dio PASA, y el owner dijo
   "todo funcionó bien". El MID decide si pide los textos (R-3) antes del cierre. No bloquea el bloque 2.
3. **Corrección propia durante el llenado:** un primer reemplazo automático pisó la columna "Resultado esperado" de 1a,
   1b, 1c y O-7. Se restauró desde el Anexo A y se verificó con `diff` contra la plantilla: solo cambian cabecera,
   Precondiciones, las filas llenas y la O-9 nueva.

### Bloqueos para el bloque 2
**Ninguno.**
- La sonda dio exit 0 con 20/0;
- `K0` sigue encima del piso;
- el plazo de DL-13 vence el 2026-11-26 21:52Z;
- B queda con ≈ 1,00 − 0,1 − gas + 0,196 ≈ 1,09 SUI, suficiente para aceptar 0,100000001 SUI en 2d.

Recordatorio para el owner: en el bloque 2, A invita a **B** (`d2c`) y B acepta desde "Mis partidas" (`d2a`). C abre G2
por URL (2b): no firma, así que su saldo 0 no importa. Con Slush, el cambio de cuenta va como en O-9.

### Greps de §R-6 (bloque 1)
Archivos:
- este reporte completo;
- `<repo>/documents/SMOKE_MVP.md`;
- `<scratchpad>/smoke17-probe/out-t4-1.txt`;
- `<scratchpad>/smoke17-probe/digests.json`.

`state.json` no se pega: tiene `G1` completo, que está permitido en ese archivo.

```
--- grep 1: exit=1 (vacío)
--- grep 2: exit=1 (vacío)
--- grep 3: exit=1 (vacío)
--- grep 4: valores distintos y conteo (antes de agregar este bloque)
     10 0c6c…826a
     10 54ee…eb1a
     10 8b78…6f51
      8 cf08…37fe
```

Clasificación: prefijo y sufijo comparados en memoria contra `testnet.json` y contra el `G1` de `state.json`. Solo se
imprimió el nombre.
- `0c6c…826a` → `G1` (`state.json`): **atribuido**.
- `54ee…eb1a` → `houseId`: **atribuido**.
- `8b78…6f51` → `packageId`: **atribuido**.
- `cf08…37fe` → `houseCapId`: **atribuido**.
- Ninguna coincidencia es una cuenta, y no hay nada sin atribución.
- Los digests `d1c`/`d1a` son base58, públicos (§R-1).
- Sin volcados del DOM: no hubo navegador en este bloque.
- Al citar la tabla, los conteos suben en +1 por valor.

==========================================================================================================================
## Revisión MID: TASK-3 y TASK-4, bloque 1 — PASA (GO al bloque 2)

> MID, 2026-11-19, contra HANDOFF_SMOKE_MVP v1.3.1. Leí el reporte, `SMOKE_MVP.md` y los crudos `out-t3-pre.txt` y
> `out-t4-1.txt` (los dos con `exit=0` al final, como pedía el 🔵 1 de TASK-2c).

### TASK-3 (paso 0)

**Resultado:** sin ❌. 0.1, 0.3-0.6, 0.7 y N-a están en ✅.

**0.2 sigue en ⏳**, solo por el commit del deploy:
- el `curl` cumple: HTTP 200, conteos 1/1/1 y el mismo `index-B3BeMVQC.js` de 917804 B que la CI de `M`;
- no bloquea el bloque 2, pero se cierra antes del "Reporte final".

**`pre` y DL-13:** el `pre` de 21:52:20Z es el vigente.
- `d1c` cayó en la misma sesión, así que DL-13 se cumple.
- El plazo para correr `final` vence el 2026-11-26 21:52Z.

**Desviaciones:** las 4 de TASK-3 se aceptan.
- La URL va escrita en `SMOKE_MVP.md`, porque es pública y ya está en `app/README.md`.
- La lectura extra de `getServiceInfo` sirve como dato para DL-14: el piso no saltó con el cambio de época, así que la
  retención es de 12 épocas a las 21:54Z.

**🔵 de texto para el handoff:** el §0 dice "Node v26.13.0" para la CI, y la CI usa v26.13.1. No tiene efecto.

### Bloque 1

**1a y 1c:** la sonda dio 20/0 y exit 0.
- Las igualdades dan exactas: `Δ(A, d1c)` = −101965299 = −bet − gas, y `Δ(B, d1a)` = +93525252 = −bet + payout − gas.
  `Δ(A, d1a)` es 0 porque ganó B.
- El PTB de aceptar es `SplitCoins,MoveCall`, con `accept_game` como último `MoveCall`.
- C-6 no cortó.

**O-7 (`d1a`):** `gasBudget` 3474748 ≤ 10000000, `gasPrice` 1000.

**1b:** ✅ con una corrección de texto (C-1, abajo). Que B aceptó G1 lo prueba `d1a`. Lo de C no se informó por separado.

**1c, textos de resultado (R-3):** se acepta el bloque 1 así.
- El criterio verificable (montos, `winner`, objeto) está on-chain y en PASA.
- El "Resultado obtenido" dice explícitamente que los textos de A y B **no se registraron**.
- Desde el bloque 2, el owner copia los textos tal cual. Sin textos, la fila de texto queda ⏳ y no ✅.

**O-9:** se acepta como observación 📝. Al O-1 del bloque 3 le cambia el procedimiento (ver abajo).

**Desviaciones del bloque 1:** las 3 se aceptan. La 3, el reemplazo restaurado, la verifiqué: las columnas "Resultado
esperado" de 1a, 1b, 1c y O-7 son las del Anexo A.

### Correcciones a `SMOKE_MVP.md`
- **C-1 (1b):** reemplazar `owner: "todo funcionó bien" (B y C vieron G1 en el lobby, sin detalle por cuenta)` por
  `owner: "todo funcionó bien". B llegó a G1 y la aceptó (d1a); que C la vio no se informó por separado`. El paréntesis
  afirmaba algo que el owner no dijo (§R-4).
- **C-2 (1c):** al final de "Resultado obtenido", agregar `Textos de A y B: no registrados por el owner; el MID acepta
  la fila con la evidencia on-chain (revisión del bloque 1). Desde el bloque 2 se copian (R-3)`.
- **C-3 (O-3):** en "Resultado obtenido", `1c: no medida`.
- **C-4 (0.2):** al final de "Resultado obtenido", `No bloquea los bloques; se cierra antes del Reporte final`.

### Bloque 2: instrucciones

**Para el owner.** El orden importa: **2b va antes que 2d**. Una vez que B acepta, C ya no puede ver la invitación.
1. **2a:** A crea una **invitación** a B por exactamente `0.100000001` SUI. Entrega `d2c` y el aviso "Comparte el
   enlace…" copiado como texto.
2. **2b:** con C conectada (Disconnect → C en Slush → "Conectar wallet", como en O-9), abrir `<URL>/#/game/<G2>` por URL.
   Entrega el texto exacto que ve y si aparece un botón "Aceptar" (sí/no). C no firma nada.
3. **2c:** con B conectada, en "Mis partidas" → "Invitaciones recibidas": ¿aparece G2 con "Aceptar" y "Rechazar"?
   (sí/no). Si puede, copiar también el texto de la cota ("… (desde <fecha>)") y decir si está el enlace "Ver tu
   historial completo en el explorador" (O-5).
4. **2d:** B acepta **desde esa fila de "Mis partidas"**. Entrega:
   - `d2a`;
   - el texto del resultado copiado tal cual ("¡Ganaste!…" o "Perdiste…");
   - O-2: qué mostró la vista previa de Slush;
   - O-3: aproximado, el tiempo del clic al resultado y cuánto duró "Actualizando datos…".
5. Sin capturas de la wallet y sin direcciones. B tiene ≈ 1,09 SUI, alcanza.
6. Cuando pueda, el commit del deploy activo en Railway (Deployments), para 0.2.

**Para el DEV:**
- sonda bloque `2` con `d2c` y `d2a`, y su crudo `out-t4-2.txt` con `exit=$?` al final;
- N-c (headless `#/`, sin enlace a G2; vale con G2 en cualquier estado), con su crudo;
- filas 2a-2d y O-7 (`d2a`) con el texto del owner citado como `owner: "…"`;
- `previousTransaction(G2) == d2a` sale en la sonda.

**Adelanto para el bloque 3 (O-1):** con Slush, cambiar de cuenta es Disconnect y Connect. La prueba de O-1 queda así:
con la ventana de aprobación de Slush abierta para el crear de 3a, cambiar la cuenta activa **dentro de Slush** a B, y
reportar qué pasó. Si Slush no lo permite con la ventana abierta, O-1 se anota como "no ejecutable con Slush"
(observación, sin ❌), y se lo decido al MID con el reporte del bloque 3.

==========================================================================================================================
## Anexo: TASK-4, bloque 2 (y correcciones del MID al bloque 1)

### Correcciones del MID en `SMOKE_MVP.md` (revisión del bloque 1: PASA y GO)
- **C-1 (1b):** dice `owner: "todo funcionó bien". B llegó a G1 y la aceptó (d1a); que C la vio no se informó por
  separado.`
- **C-2 (1c):** suma `Textos de A y B: no registrados por el owner; el MID acepta la fila con la evidencia on-chain
  (revisión del bloque 1). Desde el bloque 2 se copian (R-3)`.
- **C-3 (O-3):** `1c: no medida`.
- **C-4 (0.2):** suma `No bloquea los bloques; se cierra antes del Reporte final`.

### Entrega del bloque 2
- owner: "listo, todo funcionó", sin textos.
- El orquestador identificó los digests por eventos públicos (GraphQL, solo análisis):
  - `d2c` = `3FJ5GnVGez2vJhk1gN6dG1hTTgwUyJfeSp8PzqH1ttwy` (22:51:42Z);
  - `d2a` = `6BQpzAvsQbFyMqAWuYumu9zwfwPRADZumnt7Znen4S9v` (22:52:53Z).
- La sonda los verifica de forma independiente por gRPC. G2 sale de `d2c`, en la sonda.

### Sonda, bloque `2` (`<scratchpad>/smoke17-probe/out-t4-2.txt`; 22:55:19Z a 22:55:21Z)
Antes de correr:
- la sonda seguía intacta (`diff` contra el Anexo B, vacío);
- `digests.json` tenía `d1c`, `d1a`, `d2c` y `d2a`;
- `state.json` seguía igual (F0 0, K0 408454921, G1). C-6 no cortó.
```
BLOQUE 2 · red testnet · paquete 0x8b78…6f51
INFO gas d2c 3FJ5GnVGez2vJhk1gN6dG1hTTgwUyJfeSp8PzqH1ttwy: 3196400 (computation 1000000, storage 2196400, rebate 0)
CHECK 2.d2c.success PASA 3FJ5GnVGez2vJhk1gN6dG1hTTgwUyJfeSp8PzqH1ttwy
CHECK 2.d2c.sender PASA sender == A: true
CHECK 2.d2c.creator PASA creator == A: true
CHECK 2.d2c.bet PASA bet 100000001
CHECK 2.d2c.opponent PASA opponent == B: true
CHECK 2.d2c.fee_rate PASA fee_rate 200
CHECK 2.d2c.delta PASA Δ(A) -103196401 == −bet − gas -103196401
INFO 2.d2c: game_id 0x143c…ee0e
CHECK 2.d2a.sender PASA sender == B: true
INFO gas d2a 6BQpzAvsQbFyMqAWuYumu9zwfwPRADZumnt7Znen4S9v: 1486871 (computation 1000000, storage 5198400, rebate 4711529)
CHECK 2.d2a.success PASA 6BQpzAvsQbFyMqAWuYumu9zwfwPRADZumnt7Znen4S9v
CHECK 2.d2a.game_id PASA game_id == 0x143c…ee0e: true
CHECK 2.d2a.creator PASA creator == A: true
CHECK 2.d2a.acceptor PASA acceptor == B: true
CHECK 2.d2a.winner PASA winner == B
CHECK 2.d2a.pot PASA pot 200000002 (2·bet 200000002)
CHECK 2.d2a.fee PASA fee 4000000 (⌊pot·200/10000⌋ = 4000000)
CHECK 2.d2a.payout PASA payout 196000002 (pot − fee 196000002)
CHECK 2.d2a.delta.B PASA gana B: Δ(B) 94513130 == −bet + payout − gas 94513130
CHECK 2.d2a.delta.A PASA gana B: Δ(A) 0 == 0
CHECK 2.d2a.ptb PASA comandos SplitCoins,MoveCall; accept_game último MoveCall: true
CHECK 2.d2a.object PASA 0x143c…ee0e Resolved, acceptor == B y winner == evento: true, stake 0
CHECK 2.d2a.previousTransaction PASA previousTransaction == d2a: true
OBS O-7 d2a: gasBudget 3474772, gasPrice 1000, gasBudget ≤ 10000000: true
RESUMEN 21 PASA / 0 NO PASA
exit=0
```

`state.json` sumó `G2`. Es un ID completo y no se pega; abreviado: `0x143c…ee0e`.

### N-c, Chrome headless sin wallet (`<scratchpad>/n17/nc.mjs`, `<scratchpad>/n17/out-nc.txt`)
`nc.mjs` es `na.mjs` más el chequeo del lobby:
- `G2` entra por una variable de entorno y no se imprime;
- se compara contra `href`/`title` de los enlaces y contra el HTML, y solo se imprimen booleanos y el texto del lobby;
- usó un perfil desechable nuevo (`chrome-17c`), CDP en 127.0.0.1 y `--disable-extensions`;
- cerré solo el Chrome propio: el PID ya no existe, ningún proceso usa el perfil y el perfil está borrado.
```
2026-11-19T22:55:42Z
N-c lobby cargado en ≤ 60 s: true (1006 ms tras el badge)
N-c filas en el lobby: false; enlaces a #/game/: 0
N-c texto del lobby: "No hay partidas abiertas en el historial disponible del nodo (desde 8 nov 2026, 17:30)"
N-c enlace a G2 en el lobby: false; G2 en algún lugar de la página: false
N-a ruta #/
N-a badge: "testnet · nodo OK"
N-a "testnet" y "nodo OK" en ≤ 30 s: true (2509 ms desde Page.navigate)
INFO violaciones de CSP: 0
INFO errores de consola: 3; hosts de los errores de red: sui-battleship-app-production.up.railway.app, api.slush.app
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS polic [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
INFO Chrome cerrado: true
exit=0
```

- G2 no está en el lobby: no hay enlace, y su ID no aparece en ninguna parte de la página → **N-c PASA**.
- El texto vacío con sufijo es el esperado en v1.3 ("desde 8 nov 2026, 17:30": la hora local de `piso + 16000`).
- Límite: cuando corrió N-c, G2 ya estaba `Resolved`, así que tampoco aparecería si fuera abierta. El orquestador
  aclaró que cualquier estado de G2 vale. Que las invitaciones no van al lobby también lo cubren los tests de la app.
- Consola: los mismos 3 errores conocidos de `api.slush.app` (E-6 de #15) y 0 violaciones de CSP.

### Filas de `SMOKE_MVP.md` (regla del MID: lo que depende de textos del owner queda ⏳)
| Fila | Estado | Base |
|---|---|---|
| 2a | ⏳ (on-chain y N-c: PASA) | sonda `d2c` 7/7: `opponent == B`, 100000001, 200 bps, Δ(A) exacta. N-c PASA. Falta el aviso "Comparte el enlace…" copiado por el owner |
| 2b | ⏳ | **Depende entera del owner:** C no firma y no hay nada on-chain. Falta el texto que vio C y si apareció "Aceptar" (D-20261104-05 (1)). Va marcada para el MID |
| 2c | ⏳ | On-chain solo se ve que B aceptó G2, no desde qué vista. Falta la fila "Invitaciones recibidas" con "Aceptar"/"Rechazar" |
| 2d | ⏳ (on-chain: PASA) | sonda `d2a` 13/13 (más `sender == B`): pozo 200000002, comisión 4000000, pago 196000002, ganó B, Δ(B) 94513130 y Δ(A) 0 exactos, `Random` último, G2 `Resolved` con stake 0, `previousTransaction(G2) == d2a`. Tiempos de los digests: `d2c` 22:51:42Z → `d2a` 22:52:53Z. Falta el texto del resultado |
| O-7 | ✅ | `d1a` 3474748 y `d2a` 3474772 de `gasBudget`, `gasPrice` 1000; los dos ≤ 10000000. Sin issue P2 |
| O-2 | ⏳ owner | vista previa de la wallet: sin texto en 1c ni en 2d |
| O-3 | ⏳ owner | 1c no medida; 2d pendiente. Los tiempos de los digests no son la latencia de la app |

Controlé las columnas "Resultado esperado" contra el Anexo A con un script: todas coinciden, salvo 0.1 y 0.2, donde `<M>`
ya se reemplazó por `77bb49c`.

### Bloqueos para el bloque 3
**Ninguno on-chain.**
- La sonda dio 21/0 con exit 0, y K0 sigue encima del piso.
- B ganó las dos partidas. A quedó con ≈ 0,95 − 0,102 − 0,103 ≈ 0,745 SUI, suficiente para crear 0,001 SUI y cancelar
  (3a-3c).
- Los ⏳ de 2a-2d, O-2 y O-3 dependen de textos que el orquestador va a pedir al owner. No impiden firmar el bloque 3.
- Para el bloque 3, el owner tiene que **copiar los textos** (R-3):
  - 3b: "La wallet no completó la operación…", sin digest;
  - 3c: el texto de la cancelación;
  - O-1, si lo prueba (`dO1`).

### Greps de §R-6 (bloque 2)
Archivos:
- este reporte completo;
- `<repo>/documents/SMOKE_MVP.md`;
- `<scratchpad>/smoke17-probe/out-t4-2.txt` y `digests.json`;
- `<scratchpad>/n17/out-nc.txt`.

```
--- grep 1: exit=1 (vacío)
--- grep 2: exit=1 (vacío)
--- grep 3: exit=1 (vacío)
--- grep 4: valores distintos y conteo (antes de agregar este bloque)
      9 0c6c…826a
     10 143c…ee0e
     12 54ee…eb1a
     13 8b78…6f51
     10 cf08…37fe
```

Clasificación: prefijo y sufijo comparados en memoria contra `testnet.json` y contra `G1`/`G2` de `state.json`. Solo se
imprimió el nombre.
- `0c6c…826a` → `G1`;
- `143c…ee0e` → `G2`;
- `54ee…eb1a` → `houseId`;
- `8b78…6f51` → `packageId`;
- `cf08…37fe` → `houseCapId`.

Todo atribuido, ninguna cuenta y nada que borrar. Los digests son base58 públicos. Sin volcados del DOM: de N-c solo hay
booleanos, conteos y el texto del lobby. Al citar la tabla, los conteos suben en +1.

==========================================================================================================================
## Anexo: TASK-4, bloque 2, respuestas del owner (las pasó el orquestador)

| Fila | Antes | Ahora | Base |
|---|---|---|---|
| 2a | ⏳ | ⏳ (on-chain y N-c: PASA) | El owner no copió el aviso "Comparte el enlace…". La fila queda ⏳ solo por ese texto; decide el MID |
| 2b | ⏳ | ✅ | owner: C vio "Esta invitación es para otra dirección." **sin** "Aceptar". Eligió (a) entre dos opciones que le dio el orquestador. No hay parte on-chain: C no firma |
| 2c | ⏳ | ✅ | owner: "sí", G2 apareció en "Invitaciones recibidas" con "Aceptar" y "Rechazar". On-chain: `d2a` con `sender == B` |
| 2d | ⏳ (on-chain PASA) | ✅ | owner: la app mostró "ganó B". Coincide con `winner == B` en el evento y en el objeto (sonda bloque `2`, 21/0) |
| O-2 | ⏳ owner | ⏳ | 1c y 2d: no medida |
| O-3 | ⏳ owner | ⏳ | 1c y 2d: no medida |
| 0.2 | ⏳ | ⏳ | Sigue pendiente el commit del deploy de Railway |

Nota para el MID sobre 2b: la respuesta salió de dos opciones cerradas que dio el orquestador. No es un texto que el
owner haya copiado. Es la única evidencia de la fila (D-20261104-05 (1)), porque C no firma.

Las columnas "Resultado esperado" siguen iguales a las del Anexo A (comprobado con un script).

### Greps de §R-6 (después de la actualización)
Archivos: este reporte completo y `<repo>/documents/SMOKE_MVP.md`.

```
--- grep 1: exit=1 (vacío)
--- grep 2: exit=1 (vacío)
--- grep 3: exit=1 (vacío)
--- grep 4: valores distintos y conteo (antes de agregar este bloque)
     11 0c6c…826a
      9 143c…ee0e
     14 54ee…eb1a
     14 8b78…6f51
     12 cf08…37fe
```

Clasificación: `0c6c…826a` → G1, `143c…ee0e` → G2, `54ee…eb1a` → `houseId`, `8b78…6f51` → `packageId` y `cf08…37fe` → `houseCapId`. Todo atribuido, ninguna cuenta y nada que borrar. Sin volcados del DOM. Al citar la tabla, los conteos suben en +1.

==========================================================================================================================
## Anexo: 0.2 cerrada con el dato del owner, y O-10

- **Dato del owner** (lo pasó el orquestador): el deploy activo de Railway es `30e1405`, el merge de PR #68. El owner
  mandó el enlace al commit en GitHub.
- **`git diff --stat 30e1405 77bb49c`:** 8 archivos, 13 inserciones y 7587 borrados, todos en `documents/`:
  - `HANDOFF_RAILWAY_DEPLOY.md`, `HANDOFF_README.md`, `PLAN_RAILWAY_DEPLOY.md`, `PLAN_README.md`,
    `REPORTES_RAILWAY_DEPLOY.md`, `REPORTES_README.md` y `SMOKE_RAILWAY_DEPLOY.md`, borrados;
  - `STATUS.md` (22 ±).
  - Es el housekeeping de #15/#16 (PR #69).
- **El bundle servido** es `index-B3BeMVQC.js` (917804 B), el mismo de la CI de M (medido en 0.2).
- **0.2 → ✅**, con la nota: commit desplegado `30e1405` ≠ M, delta solo de docs, mismo `dist`. En Precondiciones, el
  commit del deploy es `30e1405`.
- **O-10 (📝, nunca ❌):**
  - `git diff --name-only 30e1405^1 30e1405` da `.github/workflows/ci.yml` (solo un comentario), `README.md`, `agents.md`,
    `app/README.md` (negada en las watch paths) y 4 archivos de `documents/`. Ninguno es watch path.
  - Aun así, Railway desplegó `30e1405`. O las watch paths no están en efecto, o hubo un redeploy manual del último
    commit.
  - El efecto es el mismo `dist`, como prevé `app/README.md`, paso 5 de "Conectar Railway".
  - No se le pregunta nada al owner: el seguimiento queda en manos del orquestador.

Greps de §R-6 después de esta actualización (reporte y `SMOKE_MVP.md`): 1, 2 y 3 vacíos (exit 1). El grep 4 solo da los mismos cinco valores atribuidos (G1, G2, `houseId`, `packageId`, `houseCapId`). Los SHA `30e1405` y `77bb49c` no llegan a ningún patrón.

==========================================================================================================================
## Revisión MID: TASK-4, bloque 2 — PASA (GO al bloque 3)

> MID, 2026-11-19. Leí el anexo del bloque 2, `out-t4-2.txt` (que termina en `exit=0`) y el resumen del orquestador
> con las respuestas del owner.

**Sonda.** 21 PASA / 0 NO PASA.
- `d2c`: `opponent == B`, apuesta 100000001, comisión 200 bps, `Δ(A)` exacto.
- `d2a`: `sender == B`, pozo 200000002, comisión 4000000 y pago 196000002 (el redondeo hacia abajo de D2), `Δ(B)` y
  `Δ(A)` exactos.
- `previousTransaction(G2) == d2a`.
- **O-7 cerrado:** `gasBudget` de 3474748 y 3474772, los dos ≤ 10000000. No hace falta issue.

**N-c: PASA.** Acepto la limitación de que G2 ya estaba `Resolved`: el criterio vale con G2 en cualquier estado, y el
texto vacío con el sufijo "(desde …)" es el esperado de la v1.3.

**Origen de los digests.** El orquestador los sacó por GraphQL. Lo acepto, porque la sonda los verifica por su cuenta
contra el sender y los montos. El GraphQL no es evidencia del smoke.

### Criterio sobre los textos del owner
Precisa la regla del bloque 1.
- **Queda ⏳** solo lo que pide un texto en la columna "Resultado esperado" del Anexo A.
- **Se acepta con la nota "no registrado"** lo que el plan lista como "Entrega" pero no como criterio.

| Fila | Estado | Motivo |
|---|---|---|
| 2a | ✅ | El criterio del Anexo A (`opponent == B`, 100000001, 200 bps, fuera del lobby) se cumple on-chain y con N-c. El aviso "Comparte el enlace…" no es criterio: se anota `aviso: no registrado por el owner` |
| 2b | ✅ | `owner: eligió (a), "Esta invitación es para otra dirección." sin botón "Aceptar"`. La pregunta fue binaria, con el texto redactado por el orquestador: se anota así. Es D-20261104-05 (1) |
| 2c | ✅ | `owner: "sí"`: G2 en "Invitaciones recibidas" con "Aceptar" y "Rechazar" |
| 2d | ✅ | Montos y balances on-chain exactos. `owner: "ganó B"`, que coincide con `winner == B`. El criterio de 2d no pide el texto |
| O-2 | 📝 no medida | Ya no quedan aceptaciones en la corrida: `no medida (el owner no la reportó en 1c ni en 2d)`. Es una observación (DL-7), nunca ❌ |
| O-3 | ⏳ hasta el bloque 4 | Se puede medir todavía en 3c y 4b. Si el owner no la da, queda `no medida` al cerrar el bloque 4 |

**Para TASK-5:** sin O-2 y O-3 medidas, los ítems de `app/README.md` que remiten a esas observaciones (`:898-908` en
`b7aa568`) no pasan a "medido". Quedan como pendiente post-MVP con su issue, y no se borran.

**Formato que funciona con este owner.** El orquestador le arma preguntas cerradas:
- opción (a) = el texto esperado exacto;
- opción (b) = "otro: copiarlo".

Se anota como en 2b.

### GO al bloque 3: instrucciones para el owner (todo con la cuenta A, la publicadora)

1. **3a.** Crear una partida **abierta** (sin invitado) de **0.001** SUI y aprobarla en Slush.
2. **3b.** En esa partida, pulsar **"Cancelar"** y en la ventana de Slush pulsar **Rechazar**. Pregunta cerrada:
   - (a) la app mostró "La wallet no completó la operación…", sin enlace a ninguna transacción;
   - (b) otro texto (copiarlo).

   Y además: ¿la partida sigue como pendiente? sí/no.
3. **3c.** Pulsar **"Cancelar"** de nuevo y esta vez **aprobar**. Pregunta cerrada:
   - (a) un texto de cancelación que menciona el reembolso de 0.001 SUI (copiarlo si puede);
   - (b) otro texto (copiarlo).

   Opcional, para O-3: cuánto tardó, aproximado, del clic al resultado.
4. **O-1, después de 3c.** Con A, empezar a crear **otra** partida abierta de 0.001 SUI. Con la ventana de Slush
   abierta, intentar cambiar la cuenta activa a **B dentro de Slush**, y después aprobar si se puede. Pregunta cerrada:
   - (a) Slush no deja cambiar de cuenta con la ventana abierta (en ese caso, rechazar);
   - (b) la app mostró "La wallet no completó…", sin transacción;
   - (c) se creó la partida. Decir qué mostró la app y qué cuenta aparece como creadora.

   **Si se creó (c), cancelarla con A** para que no quede abierta.
5. Sin capturas ni direcciones.

### Para el DEV (bloque 3)
- Digests: `d3c`, `d3x` y, si O-1 dio (c), `dO1` = el crear de O-1.
  - Si el orquestador los saca por eventos, `d3c` es el **primer** `GameCreated` de A de 0.001 SUI después de `d2a`.
  - `dO1` es el que viene después de `d3x`.
  - El cancel de la partida de O-1 no entra en la sonda. Se anota su digest si lo hay.
- Sonda bloque `3` con su crudo `out-t4-3.txt`, con `exit=$?` al final. `dO1` va solo si existe.
- 3b no tiene digest: se completa con la respuesta del owner. "Sigue pendiente: sí" más `G3` `Cancelled` recién por
  `d3x` (sonda) alcanzan. Si el owner responde (b), STOP al MID.
- **O-1:**
  - (a) → 📝 `no ejecutable con Slush (una sola cuenta conectada; O-9)`, sin ❌;
  - (b) → ✅;
  - (c) → ✅ solo si `sender(dO1) == A` (sonda) y la app no mostró éxito para B. Si no, ❌ y §R-5.
- Las correcciones de la tabla de arriba se aplican en `SMOKE_MVP.md`.

==========================================================================================================================
## Anexo: estados tras la revisión del MID del bloque 2 (aplicados por el DEV)
- 2a ✅ ("Aviso: no registrado por el owner"); 2b ✅ (pregunta binaria, con el texto redactado por el orquestador); 2c ✅; 2d ✅.
- O-2 📝 "no medida (el owner no la reportó en 1c ni en 2d)". O-3 ⏳, porque 3c y 4b todavía pueden medirla. 0.2 sigue en ✅.
- Para el bloque 3 quedan leídas las reglas del MID: cómo se identifican d3c, d3x y dO1; `out-t4-3.txt` con `exit=`; la evidencia de 3b; los resultados (a), (b) y (c) de O-1. Espero la entrega del owner.

==========================================================================================================================
## Anexo: TASK-4, bloque 3

### Entrega del owner (por el orquestador; todo con A)
- `d3c` = `CHnfP87qKaka4fBi9c2yomw26iNavv2Zs9gw8mcDGX1A` (23:03:40Z) y `d3x` = `DtAMnVkQDF5zGgrsdhvsJQGfCtXJQRsZL3ycpG55EsHA`
  (23:04:32Z). Salen de eventos por GraphQL, que es solo análisis; la sonda los verifica.
- No hay `dO1`: O-1 dio (a).
- Textos del owner, tal cual:
  - 3b: "La wallet no completó la operación: User rejected the request."
  - 3c: "Partida cancelada: se devolvieron 0.001 SUI a tu cuenta Transacción DtAMnV…EsHA · Costo de red: 0.001988195 SUI".
  - O-1: (a) "Slush no deja cambiar de cuenta con la ventana abierta".
- Observación nueva, O-11: las watch paths de Railway estaban en solo `/app/**`.

### Sonda, bloque `3` (`<scratchpad>/smoke17-probe/out-t4-3.txt`; 23:06:32Z a 23:06:42Z)
La sonda sigue intacta (`diff` vacío). `digests.json` tiene d1c, d1a, d2c, d2a, d3c y d3x. C-6 no cortó.
```
BLOQUE 3 · red testnet · paquete 0x8b78…6f51
INFO gas d3c CHnfP87qKaka4fBi9c2yomw26iNavv2Zs9gw8mcDGX1A: 2953200 (computation 1000000, storage 1953200, rebate 0)
CHECK 3.d3c.success PASA CHnfP87qKaka4fBi9c2yomw26iNavv2Zs9gw8mcDGX1A
CHECK 3.d3c.sender PASA sender == A: true
CHECK 3.d3c.creator PASA creator == A: true
CHECK 3.d3c.bet PASA bet 1000000
CHECK 3.d3c.opponent PASA opponent none: true
CHECK 3.d3c.fee_rate PASA fee_rate 200
CHECK 3.d3c.delta PASA Δ(A) -3953200 == −bet − gas -3953200
INFO 3.d3c: game_id 0x3bcb…876b
INFO gas d3x DtAMnVkQDF5zGgrsdhvsJQGfCtXJQRsZL3ycpG55EsHA: 1988195 (computation 1000000, storage 2941200, rebate 1953005)
CHECK 3.d3x.success PASA DtAMnVkQDF5zGgrsdhvsJQGfCtXJQRsZL3ycpG55EsHA
CHECK 3.d3x.sender PASA sender == A: true
CHECK 3.d3x.game_id PASA game_id == 0x3bcb…876b: true
CHECK 3.d3x.refund PASA refund 1000000
CHECK 3.d3x.cancelled_by PASA cancelled_by == creator == A: true
CHECK 3.d3x.delta PASA Δ(A,d3x) -988195 == refund − gas -988195
CHECK 3.refund_integro PASA Δ(A,d3c) + Δ(A,d3x) -4941395 == −gas(d3c) − gas(d3x) -4941395
CHECK 3.d3x.sin_house PASA la House no está entre los inputs ni los objetos cambiados: true
CHECK 3.G3 PASA 0x3bcb…876b Cancelled, stake 0
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

`state.json` sumó `G3`. Es un ID completo y no se pega; abreviado: `0x3bcb…876b`.

### 3b: evidencia de "sigue pendiente" (`<scratchpad>/smoke17-probe/out-t4-3b.txt`)
El owner no respondió "sigue pendiente". Por la regla del MID, la evidencia es on-chain: que `d3x` sea el primer cambio de
G3 después de `d3c`.
- Lecturas: solo `getTransaction` con `effects` y `getObject` con `previousTransaction`, las de §Sonda.
- Script por stdin, con `G3` en una variable que no se imprime.
```
3b d3c crea G3: true (outputState ObjectWrite); versión de salida 199424974
3b d3x toma G3 en la versión 199424974; G3 en d3x: idOperation None, outputState ObjectWrite
3b versión de entrada de G3 en d3x == versión de salida en d3c: true
3b previousTransaction(G3) == d3x: true; versión actual de G3 199424975; == versión de salida de d3x: true
exit=0
```

La versión de G3 que toma `d3x` es la misma que dejó `d3c`. Ninguna transacción tocó G3 entre medio: el rechazo de la
wallet no generó ninguna. Hoy `previousTransaction(G3) == d3x`. → 3b ✅. El texto empieza con el esperado ("La wallet no
completó la operación…"), y el sufijo es el mensaje de la wallet, sin enlace ni digest.

### 3c: el costo de red que mostró la app contra la cadena
"Costo de red: 0.001988195 SUI" = 1988195 MIST = `gas(d3x)` de la sonda (computation 1000000 + storage 2941200 − rebate
1953005). "DtAMnV…EsHA" es la abreviatura base58 de `d3x`. Coinciden.

### Filas
| Fila | Estado | Base |
|---|---|---|
| 3a | ✅ PASA | `d3c` 7/7: 1000000, sin oponente, 200 bps, Δ(A) exacto |
| 3b | ✅ PASA | owner: texto esperado más el sufijo de la wallet, sin digest. G3 sin cambios entre `d3c` y `d3x` (versiones) |
| 3c | ✅ PASA | `d3x` 9/9: refund 1000000, `cancelled_by == creator == A`, reembolso íntegro (−4941395 = −gas − gas), sin la House, G3 `Cancelled` con stake 0. owner: texto con el digest y el costo de red iguales a la cadena |
| O-1 | 📝 | (a) no ejecutable con Slush (una sola cuenta conectada; O-9). No es ❌ |
| O-3 | ⏳ | 3c sin latencia; queda 4b |
| O-11 | 📝 | Watch paths en `/app/**`: explica O-10. Pendiente la confirmación del owner de la lista completa |

Controlé las columnas "Resultado esperado" contra el Anexo A con un script: coinciden, salvo `<M>` en 0.1 y 0.2.

### Bloqueos para el bloque 4
**Ninguno.**
- K0 sigue encima del piso. El plazo de DL-13 vence el 2026-11-26 21:52Z.
- Para `4a`, la sonda espera `F4 == F0 + fee(d1a) + fee(d2a) + Σ ajenas` = 0 + 4000000 + 4000000 + ajenas = **8000000**
  si no hay ajenas.
- Recordatorio del handoff (TASK-4, "4a antes del retiro"): el owner abre `#/admin` y anota "Comisiones acumuladas", y
  **espera a que corra la sonda `4a` antes de pulsar "Retirar"**.
- Después de `d4w`, sonda `4b`. O-3 se puede medir en 4b.
- O-11 no bloquea: el `dist` servido es el de M.

### Greps de §R-6 (bloque 3)
Archivos: este reporte completo, `<repo>/documents/SMOKE_MVP.md`, `out-t4-3.txt`, `out-t4-3b.txt` y `digests.json`.

```
--- grep 1: exit=1 (vacío)
--- grep 2: exit=1 (vacío)
--- grep 3: exit=1 (vacío)
--- grep 4: valores distintos y conteo (antes de agregar este bloque)
     13 0c6c…826a
     11 143c…ee0e
     10 3bcb…876b
     16 54ee…eb1a
     18 8b78…6f51
     14 cf08…37fe
```

Clasificación: `0c6c…826a` → G1, `143c…ee0e` → G2, `3bcb…876b` → G3, `54ee…eb1a` → `houseId`, `8b78…6f51` → `packageId` y `cf08…37fe` → `houseCapId`. Todo atribuido, ninguna cuenta y nada que borrar. `DtAMnV…EsHA` es base58, un digest público, y no entra en el patrón. Sin volcados del DOM: no hubo navegador en este bloque. Al citar la tabla, los conteos suben en +1.

==========================================================================================================================
## Anexo: TASK-4, bloque 4a (antes del retiro)

Corrida a pedido del orquestador. El owner tiene indicado no pulsar "Retirar" hasta el OK. La sonda sigue intacta (`diff` vacío). Crudo: `<scratchpad>/smoke17-probe/out-t4-4a.txt`.

```
BLOQUE 4a · red testnet · paquete 0x8b78…6f51
INFO F4 = 8000000 · K4 = 408471907
CHECK 4a.ventana PASA checkpoint(d1a) 408469886 y checkpoint(d2a) 408471907 en (K0 408454921, K4 408471907]: true
INFO ajenas en (K0, K4]: 0, Σ fee 0
CHECK 4a.F4 PASA F4 8000000 == F0 0 + fee(d1a) 4000000 + fee(d2a) 4000000 + Σ ajenas 0 = 8000000
RESUMEN 2 PASA / 0 NO PASA
exit=0
```

Resultado:
- **F4 = 8000000**, **K4 = 408471907** (= checkpoint(d2a): la última mutación de la House es `d2a`).
- **0 ajenas** en (K0, K4]: Σ fee 0.
- `state.json` sumó `K4` y `amount4a` = 8000000.
- **Ok para retirar.**
- Fila 4a: ⏳ solo por la comparación con el panel ("Comisiones acumuladas"), que tiene que traer el owner. Se espera que el panel muestre 0,008 SUI.

Greps de §R-6 sobre este anexo y `out-t4-4a.txt`: 1, 2 y 3 vacíos; el 4 solo da `8b78…6f51` (`packageId`).

==========================================================================================================================
## Revisión MID: TASK-4, bloque 3 — PASA (GO condicionado a 4b)

**Bloque 3.**
- Sonda 16 PASA / 0 NO PASA (`exit=0`).
- Reembolso íntegro exacto: −4941395 = −gas(d3c) − gas(d3x).
- `d3x` no toca la House.
- El "Costo de red" que muestra la app coincide con `gas(d3x)`.

**Filas:**
- **3a ✅**
- **3c ✅**
- **3b ✅.** El texto del owner empieza con el esperado. La evidencia de "sigue pendiente" está en `out-t4-3b.txt`:
  - G3 pasa de la versión 199424974 de `d3c` a la de `d3x` sin ninguna transacción en medio;
  - las lecturas son las de §Sonda.

  Lo acepto como desviación: es un script aparte de la sonda, pero solo usa lecturas permitidas.
- **O-1:** 📝 "no ejecutable con Slush".
- **O-11:** 📝. Observación para después de la corrida, no bloquea: con watch paths solo en `/app/**`, un cambio en
  `Dockerfile` o `.dockerignore` de la raíz no redespliega. El owner lo ajusta con el checklist de `app/README.md` y
  pasa la lista completa.

**Corrección en `SMOKE_MVP.md`:** en 3b y 3c, el "Resultado obtenido" cita el texto literal del owner como
`owner: "…"`, completo. Hoy 3b dice "texto esperado más el sufijo".

### 4b: GO, condicionado a 4a
El owner puede pulsar "Retirar" solo si se cumplen las dos cosas:
- la sonda `4a` salió con exit 0 y `4a.F4` PASA (esperado 8000000 sin ajenas; con ajenas, listadas y sumadas);
- el owner ya anotó "Comisiones acumuladas" de `#/admin`.

Si `4a` da NO PASA o exit 5, no se retira: STOP al MID.

### Preguntas cerradas para el owner (bloques 4 y H, todo con A salvo H6)
- **4a.** En `#/admin`, "Comisiones acumuladas": (a) 0.008 SUI; (b) otro valor (cópialo).
- **4b.** Pulsa "Retirar … SUI a tu cuenta" y aprueba.
  - La ventana de Slush mostró: (a) un retiro de comisiones de la House que va a esta misma cuenta; (b) otra cosa
    (descríbela).
  - Texto del resultado: (a) un retiro de 0.008 SUI (cópialo); (b) otro (cópialo).
  - Después, el botón quedó deshabilitado con "No hay comisiones para retirar.": sí/no.
  - Opcional, para O-3: cuánto tardó, aproximado, del clic al resultado.
- **H1.**
  - ¿Se ve "Administrar House" en el encabezado? sí/no.
  - En `#/admin`: (a) comisión 200 bps, límites 0.001 / 50 SUI, acumulado 0, versión 1; (b) algo distinto (cópialo).
  - ¿Cuántas veces usaste "Volver a comprobar"? (0 si ninguna)
- **H2.** Cambia la comisión a **201** y aprueba.
  - Resumen antes de firmar: (a) "De 200 bps (…) a 201 bps (…)"; (b) otro (cópialo).
  - Resultado: (a) "Comisión actualizada: …" (cópialo); (b) otro.
- **H3.** **En seguida**, sin crear ni compartir nada entre medio, vuelve a **200**. Las mismas dos preguntas, con
  "De 201 bps (…) a 200 bps (…)".
- **H4.** Cambia los límites a **0.002 / 10** y aprueba. Después, de vuelta a **0.001 / 50** y aprueba. En cada uno:
  - resumen (a) "De … SUI a … SUI"; (b) otro;
  - resultado (a) "Límites actualizados: …"; (b) otro;
  - ¿los campos muestran lo nuevo y el botón quedó deshabilitado? sí/no.
- **H5.** En H2-H4, la ventana de Slush mostró: (a) una llamada de administración de la House; (b) otra cosa
  (descríbela).
- **H6.** Con **B** (Disconnect → B en Slush → "Conectar wallet"):
  - ¿aparece "Administrar House"? (a) no; (b) sí;
  - abriendo `#/admin` por URL: (a) "Sin permisos: esta cuenta no tiene el HouseCap de esta House."; (b) otro
    (cópialo).
- Sin capturas ni direcciones.

### Para el DEV
- **4b:** sonda `4b` después de `d4w`. Esperado:
  - `sender == CAP`, con `CAP == A: true`;
  - dos comandos, `withdraw_fees` + `TransferObjects` a quien firma;
  - `amount == F4` si no hay `GameResolved` en `(K4, checkpoint(d4w)]`;
  - `Δ(CAP) == amount − gas`.
- **H:** los digests `dh1..dh4` se identifican por evento:
  - `FeeRateUpdated` 200→201 = `dh1` y 201→200 = `dh2`;
  - `BetLimitsUpdated` a 2000000/10000000000 = `dh3` y de vuelta = `dh4`;
  - la sonda verifica los valores.
- **Sonda `h` y después `final`.** Esperado en `final`:
  - `amount + Ff == F0 + Σ fee` = 8000000, con `Ff` 0 si no hay ajenas;
  - conservación sobre `{A, B}` (`CAP == A`);
  - H7 vuelve a 200 bps, 1000000/50000000000 y versión 1.
- **Crudos:** uno por bloque, cada uno con `exit=$?` al final.
- **O-3:** si 4b tampoco trae dato, queda 📝 `no medida`.

==========================================================================================================================
## Anexo: 4a cerrada y corrección del MID en 3b y 3c
- 4a ✅: owner: "0.008 SUI de comisiones acumuladas" = F4 8000000 (sonda `4a`).
- 3b y 3c: el "Resultado obtenido" cita el texto literal completo del owner como `owner: "…"`, y se quitó la paráfrasis "texto esperado más el sufijo".
- Espero la entrega de 4b y H. Después: sonda `4b`, `dh1..dh4` por evento, sonda `h` y sonda `final`, con un crudo por bloque que termina en `exit=`.

==========================================================================================================================
## Anexo: TASK-4, bloque 4b

`d4w` = `BzPZ2ty8WLBjjXhj98jEL8NFaMZ4xVAbr5qCbt82TPop` (23:12:19Z). Salió de GraphQL, que es solo análisis; la sonda lo verifica. La sonda sigue intacta (`diff` vacío). Crudo: `<scratchpad>/smoke17-probe/out-t4-4b.txt`.

```
BLOQUE 4b · red testnet · paquete 0x8b78…6f51
INFO gas d4w BzPZ2ty8WLBjjXhj98jEL8NFaMZ4xVAbr5qCbt82TPop: 1988282 (computation 1000000, storage 3807600, rebate 2819318)
CHECK 4b.success PASA BzPZ2ty8WLBjjXhj98jEL8NFaMZ4xVAbr5qCbt82TPop
CHECK 4b.sender PASA sender == CAP: true
INFO CAP == A: true
CHECK 4b.ptb PASA comandos MoveCall,TransferObjects; withdraw_fees + TransferObjects a quien firma: true
CHECK 4b.house_id PASA house_id == houseId: true
CHECK 4b.amount≥F4 PASA amount 8000000 ≥ F4 8000000
INFO checkpoint(d4w) = 408477074
CHECK 4b.amount==F4 PASA sin GameResolved en (K4 408471907, 408477074]: amount 8000000 == F4 8000000
CHECK 4b.delta PASA Δ(CAP,d4w) 6011718 == amount − gas 6011718
RESUMEN 7 PASA / 0 NO PASA
exit=0
```

- `amount` = F4 = 8000000. No hay `GameResolved` en (K4, checkpoint(d4w) 408477074].
- `CAP == A: true`. `Δ(CAP)` = amount − gas = 6011718.
- `state.json` sumó `kd4w`.
- El costo de red que mostró la app, 0.001988282 SUI, es igual a `gas(d4w)` = 1988282 (1000000 + 3807600 − 2819318).
- "BzPZ2t…TPop" es `d4w`.
- **4b ✅**, con los textos literales del owner y "boton con 0 sui ejn comisiones ahora", que confirma en sustancia el
  botón deshabilitado con "No hay comisiones para retirar.".
- Siguen pendientes, de la entrega de H: la ventana de Slush (H5) y la latencia (O-3).
- **O-12 (⚠️, hallazgo provisional):**
  - antes del retiro, el botón "Retirar 0.008 SUI" estaba deshabilitado sin motivo on-chain y se habilitó al recargar;
  - causa probable, según el orquestador: `busy = target.busy || target.unconfirmed !== null`
    (`app/src/components/HouseAdminPanel.tsx:319`, línea comprobada en `296c07b`), puesto por el intento rechazado de
    O-1;
  - el MID decide si va como `type:bug` (§R-5). No es ❌ del smoke por sí solo.

Greps de §R-6 sobre este anexo, `SMOKE_MVP.md` y `out-t4-4b.txt`: ver la línea siguiente.
Greps de §R-6: grep 1 exit=1, grep 2 exit=1, grep 3 exit=1 (los tres vacíos). El grep 4 da 0c6c…826a 143c…ee0e 3bcb…876b 54ee…eb1a 8b78…6f51 cf08…37fe : G1, G2, G3, `houseId`, `packageId` y `houseCapId`, todos atribuidos y ninguna cuenta. `BzPZ2t…TPop` es base58.

==========================================================================================================================
## Anexo: respuestas del owner sobre 4b y O-12
- 4b, ventana de Slush, owner: (a) "un retiro de comisiones de la House hacia tu misma cuenta". Es la parte de 4b de H5. 4b sigue ✅.
- O-12, owner: antes de recargar se veía (a) solo el botón deshabilitado, sin aviso. El bloqueo fue silencioso, sin "sin confirmar" ni "en curso". Sigue ⚠️ hasta que decida el MID.
- O-3 → 📝 "no medida": el owner no dio la latencia en 1c, 2d, 3c ni 4b.

==========================================================================================================================
## Anexo: TASK-4, bloque H (sonda `h` y `final`)

Digests (de eventos por GraphQL, solo análisis; la sonda los verifica):
- `dh1` = `5CwHjyBS1LwMdqeW8YoZQseK1wGmX83U7fJcktWezPzA` (23:14:55Z);
- `dh2` = `6gDJPuyKuNiccYN3DcfqyUCfRkChZn3rN1xo7DbrpfUZ` (23:15:40Z);
- `dh3` = `B4mxFdUDsCGKm6fPuPzqg4rPA1SHMDE7bQLfnFVG28rC` (23:16:36Z);
- `dh4` = `3qdFYcroDnhEtniQeVxn7agWC43TPdkrjUPBRgxZoeiq` (23:18:33Z).

La sonda sigue intacta (`diff` vacío). C-6 no cortó en ninguno de los dos bloques.

### Sonda `h` (`<scratchpad>/smoke17-probe/out-t4-h.txt`)
```
BLOQUE h · red testnet · paquete 0x8b78…6f51
INFO gas dh1 5CwHjyBS1LwMdqeW8YoZQseK1wGmX83U7fJcktWezPzA: 1000282 (computation 1000000, storage 2819600, rebate 2819318)
CHECK h.dh1.success PASA 5CwHjyBS1LwMdqeW8YoZQseK1wGmX83U7fJcktWezPzA
CHECK h.dh1.sender PASA sender == CAP: true
CHECK h.dh1.valores PASA FeeRateUpdated: old_fee_rate 200, new_fee_rate 201; house_id == houseId: true
CHECK h.dh1.delta PASA Δ(CAP) -1000282 == −gas -1000282
INFO gas dh2 6gDJPuyKuNiccYN3DcfqyUCfRkChZn3rN1xo7DbrpfUZ: 1000282 (computation 1000000, storage 2819600, rebate 2819318)
CHECK h.dh2.success PASA 6gDJPuyKuNiccYN3DcfqyUCfRkChZn3rN1xo7DbrpfUZ
CHECK h.dh2.sender PASA sender == CAP: true
CHECK h.dh2.valores PASA FeeRateUpdated: old_fee_rate 201, new_fee_rate 200; house_id == houseId: true
CHECK h.dh2.delta PASA Δ(CAP) -1000282 == −gas -1000282
INFO GameCreated en [checkpoint(dh1) 408477779, checkpoint(dh2) 408477980]: 0
INFO gas dh3 B4mxFdUDsCGKm6fPuPzqg4rPA1SHMDE7bQLfnFVG28rC: 1000282 (computation 1000000, storage 2819600, rebate 2819318)
CHECK h.dh3.success PASA B4mxFdUDsCGKm6fPuPzqg4rPA1SHMDE7bQLfnFVG28rC
CHECK h.dh3.sender PASA sender == CAP: true
CHECK h.dh3.valores PASA BetLimitsUpdated: old_min_bet 1000000, old_max_bet 50000000000, new_min_bet 2000000, new_max_bet 10000000000; house_id == houseId: true
CHECK h.dh3.delta PASA Δ(CAP) -1000282 == −gas -1000282
INFO gas dh4 3qdFYcroDnhEtniQeVxn7agWC43TPdkrjUPBRgxZoeiq: 1000282 (computation 1000000, storage 2819600, rebate 2819318)
CHECK h.dh4.success PASA 3qdFYcroDnhEtniQeVxn7agWC43TPdkrjUPBRgxZoeiq
CHECK h.dh4.sender PASA sender == CAP: true
CHECK h.dh4.valores PASA BetLimitsUpdated: old_min_bet 2000000, old_max_bet 10000000000, new_min_bet 1000000, new_max_bet 50000000000; house_id == houseId: true
CHECK h.dh4.delta PASA Δ(CAP) -1000282 == −gas -1000282
RESUMEN 16 PASA / 0 NO PASA
exit=0
```

### Sonda `final` (`<scratchpad>/smoke17-probe/out-t4-final.txt`)
```
BLOQUE final · red testnet · paquete 0x8b78…6f51
CHECK H7.shared PASA House Shared y tipo exacto: true
CHECK H7.fee_rate PASA fee_rate 200
CHECK H7.limites PASA 1000000/50000000000
CHECK H7.version PASA version 1
INFO Ff = fees_collected 0 · Kf = 408478760
RESUELTA G1 0x0c6c…826a fee 4000000 checkpoint 408469886
RESUELTA G2 0x143c…ee0e fee 4000000 checkpoint 408471907
CHECK H7.comisiones PASA amount 8000000 + Ff 0 = 8000000 == F0 0 + Σ fee 8000000 (2 GameResolved en (K0 408454921, Kf 408478760], 0 ajenas)
CHECK H7.sin_ajenas PASA sin ajenas: Ff 0 == 0
CHECK H7.conservacion PASA Σ Δ(A, B (CAP == A)) -16052995 == −Σ gas -16052995 + (amount − fee(d1a) − fee(d2a)) 0 = -16052995
RESUMEN 7 PASA / 0 NO PASA
exit=0
```

**Resultado de `final`:**
- **Identidad de comisiones:** amount 8000000 + Ff 0 = 8000000 == F0 0 + Σ fee 8000000. Son 2 `GameResolved` en
  (K0 408454921, Kf 408478760], G1 y G2, con 0 ajenas. PASA.
- **Conservación**, sobre {A, B} porque CAP == A, con las 7 transacciones: Σ Δ = −16052995 == −Σ gas −16052995 + 0
  (amount − fee(d1a) − fee(d2a) = 0). Es exacta: PASA.
- La House volvió al estado de 0.4: 200 bps, 1000000/50000000000, versión 1, `fees_collected` 0.
- El costo de red de H3 en la app, 0.001000282 SUI, es igual a `gas(dh2)` = 1000282. "6gDJPu…pfUZ" es `dh2`.

### Filas (regla del MID: ⏳ solo donde falta un texto que pide el criterio)
| Fila | Estado | Base |
|---|---|---|
| H1 | ⏳ | El panel pegado coincide (200 bps, 0.001/50, acumulado 0 tras 4b, versión 1). Faltan "Administrar House" en el encabezado y el número de "Volver a comprobar" |
| H2 | ⏳ (on-chain PASA) | `dh1` 4/4 (200→201). Faltan el resumen "De 200 bps (…) a 201 bps (…)" y "Comisión actualizada: …" |
| H3 | ✅ | `dh2` 4/4 (201→200). 0 `GameCreated` en [checkpoint(dh1), checkpoint(dh2)]. Texto literal del owner y costo de red = gas |
| H4 | ⏳ (on-chain PASA) | `dh3`/`dh4` 8/8. Faltan los resúmenes, "Límites actualizados: …" y el botón deshabilitado |
| H5 | ✅ (para el MID) | Slush no muestra la función, sino "Object Changes" con la House y el HouseCap actualizados. En 4b, (a). Lo firmado es lo esperado. La vista previa con 2000000/50000000000 no se ejecutó (O-13) |
| H6 | ⏳ | El texto "Sin permisos…" está. Falta "sin enlace" con B; lo está preguntando el orquestador |
| H7 | ✅ | `final` 7/7: identidad y conservación exactas |
| O-13 | 📝 | Los campos vuelven a los valores on-chain mientras la wallet pide la firma. Va al issue post-MVP de UI/UX, con la vista previa no ejecutada |

No copié ninguna abreviatura de cuenta de la vista previa de Slush.

### Lo que falta del bloque 5
- **5a** (badge): owner, más N-a. N-a ya está ✅ desde TASK-3. Lo repito en el bloque 5 si el MID lo pide.
- **5b** (enlaces al explorador): owner, más **N-d** (headless, `#/game/<Gk>` con k = 1, 2, 3: estado y `href` de
  Suiscan).
- **5c** (recarga de rutas profundas): owner con wallet, más **N-e** (recarga de `#/game/<G1>`, `#/my-games` y
  `#/admin` sin wallet) y **N-f** (CSP y consola; dato de O-8 sobre `api.slush.app`).
- O-8: opcional, del owner.
- Además, para el Reporte final: los ⏳ de H1, H2, H4 y H6 (textos del owner), y la decisión del MID sobre O-12.
- N-d, N-e y N-f son solo lecturas y se pueden correr ya, sin esperar al owner.

Greps de §R-6 (reporte, `SMOKE_MVP.md`, `out-t4-h.txt`, `out-t4-final.txt`, `digests.json`): grep 1 exit=1, grep 2 exit=1, grep 3 exit=1 (los tres vacíos). El grep 4 da 0c6c…826a 143c…ee0e 3bcb…876b 54ee…eb1a 8b78…6f51 cf08…37fe : G1, G2, G3, `houseId`, `packageId` y `houseCapId`, todos atribuidos y ninguna cuenta. Las abreviaturas de digests son base58.

==========================================================================================================================
## Anexo: TASK-4, bloque 5: N-d, N-e y N-f (headless, sin wallet)

Script `<scratchpad>/n17/nde.mjs`. Usa el mismo lanzamiento que `na.mjs`:
- perfil desechable nuevo `<scratchpad>/chrome-17d`, con `HOME`/`XDG_*` aislados;
- CDP en 127.0.0.1, `--disable-extensions`, una pestaña.

G1, G2 y G3 entran por variables de entorno desde `state.json` y no se imprimen. Los errores pasan por un redactor de hex
largo antes de imprimirse. No hay volcados del DOM. Crudo: `<scratchpad>/n17/out-nde.txt`.

```
2026-11-19T23:26:50Z
N-d G1: estado "Resuelta" (esperado "Resuelta"); "Ver en el explorador" con href == suiscan testnet/object/<G1>: true; en 264 ms; true
N-d G2: estado "Resuelta" (esperado "Resuelta"); "Ver en el explorador" con href == suiscan testnet/object/<G2>: true; en 257 ms; true
N-d G3: estado "Cancelada" (esperado "Cancelada"); "Ver en el explorador" con href == suiscan testnet/object/<G3>: true; en 258 ms; true
N-e recarga #/game/<G1>: estado "Resuelta", href ok true, ruta true; true
N-e #/my-games: "Conecta tu wallet para ver tus partidas e invitaciones" antes de recargar true, después true (776 ms); ruta tras recargar #/my-games; true
N-e #/admin: "Conecta la wallet que tiene el HouseCap para administrar la House" antes de recargar true, después true (533 ms); ruta tras recargar #/admin; true
N-f violaciones de CSP (securitypolicyviolation, todas las vistas): 0
N-f errores de consola: 12
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS policy: No 'Access-Contro [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS policy: No 'Access-Contro [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS policy: No 'Access-Contro [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
ERRCONSOLA log javascript: Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'https://sui-battleship-app-production.up.railway.app' has been blocked by CORS policy: No 'Access-Contro [sui-battleship-app-production.up.railway.app/]
ERRCONSOLA log network: Failed to load resource: net::ERR_FAILED [api.slush.app/api/wallet/metadata]
ERRCONSOLA console.error: Error fetching metadata
RED fallo de red (Fetch): net::ERR_FAILED cors MissingAllowOriginHeader
RED fallo de red (Fetch): net::ERR_ABORTED
RED fallo de red (Fetch): net::ERR_ABORTED
RED fallo de red (Fetch): net::ERR_FAILED cors MissingAllowOriginHeader
RED fallo de red (Fetch): net::ERR_FAILED cors MissingAllowOriginHeader
RED fallo de red (Fetch): net::ERR_FAILED cors MissingAllowOriginHeader
INFO Chrome cerrado: true
exit=0
```

- **N-d ✅:** G1 y G2 "Resuelta", G3 "Cancelada". El `href` de "Ver en el explorador" es
  `https://suiscan.xyz/testnet/object/<Gk>` del mismo objeto en los tres. Lo comparé en el script y solo imprimí el
  booleano.
- **N-e ✅:** después de recargar, `#/game/<G1>` mantiene la vista y `#/my-games` y `#/admin` mantienen la ruta y su texto
  "Conecta…".
- **N-f ✅:** 0 violaciones de CSP en 4 cargas y 3 navegaciones.
  - 12 errores de consola: 3 por carga, todos del pedido a `api.slush.app/api/wallet/metadata` (CORS
    `MissingAllowOriginHeader`). Son conocidos (E-6 de #15) y no son rojo.
  - Dato para O-8: el pedido queda bloqueado por CORS sin respuesta legible, así que el 403 de Cloudflare no se ve desde
    la página.
  - Hubo 2 `net::ERR_ABORTED` de fetch durante las recargas. Son pedidos cortados por `Page.reload`; el script no
    capturó su URL. No son errores de consola ni de la app.
- Chrome: lo cerré con `Browser.close`, el PID terminó, no queda ningún proceso con el perfil y el perfil está borrado.
  Los Chrome del usuario no se tocaron.
- **5a, 5b y 5c** siguen ⏳ solo por la parte del owner.

Greps de §R-6 (reporte, `SMOKE_MVP.md`, `out-nde.txt`): grep 1 exit=1, grep 2 exit=1, grep 3 exit=1 (los tres vacíos). El grep 4 da 0c6c…826a 143c…ee0e 3bcb…876b 54ee…eb1a 8b78…6f51 cf08…37fe : G1, G2, G3, `houseId`, `packageId` y `houseCapId`, todos atribuidos y ninguna cuenta.

==========================================================================================================================
## Anexo: últimas respuestas del owner, Reporte final y §R-6 sobre todo `SMOKE_MVP.md`

### Filas actualizadas (`owner:`)
- **H1 ✅:** "Administrar House" aparece con A: sí. El número de usos de "Volver a comprobar" no lo reportó el owner: lo
  decide el MID.
- **H2 ⏳ y H4 ⏳:**
  - lo confirmado por pregunta cerrada:
    - en H2 y H4, el aviso de éxito apareció después de cada firma: sí;
    - en H4, el botón "Actualizar" quedó deshabilitado: sí;
  - la parte on-chain da PASA;
  - quedan ⏳ solo por los **resúmenes previos a la firma**, que piden las columnas "Resultado esperado" y que el owner
    no reportó (regla del MID).
- **H6 ✅:** con B no aparece "Administrar House" ("no"), y el texto "Sin permisos…" ya estaba.
- **5a, 5b y 5c ✅:** owner sí ×3, además de N-a, N-d, N-e y N-f.
- **O-5 📝:**
  - las líneas de "Mis partidas" de B están saneadas: las abreviaturas de cuenta van como `<cuenta A>` y no se copió
    ninguna;
  - el sufijo "(desde 8 nov 2026, 17:30)" está presente;
  - 17:30 en UTC−5 = 2026-11-08T22:30Z, que coincide con `piso + 16000` = 404348001. El handoff lo midió en
    2026-11-08T22:30:05Z ("Historial podado (v1.3)", lecturas).
- **O-8 📝:** no realizada.
- **O-4 📝:** no ocurrió; las 11 transacciones dieron `success`.
- **O-6 📝:** no aplica (DL-6).

### Reporte final (cerrado en `SMOKE_MVP.md`)
- **Pasos: 28/30 ✅, 0 ❌, 2 ⏳ (H2 y H4).** Paso 0 8/8, pasos 1-5 15/15, panel 5/7.
- **Sonda: 97 PASA / 0 NO PASA** en 8 bloques, todos con exit 0. Las identidad de `final` y la conservación son exactas.
- **Hallazgos:**
  - O-12 ⚠️: bloqueo silencioso del botón "Retirar"; el MID decide si va como `type:bug`;
  - O-13 📝: los campos vuelven a los valores on-chain mientras se firma; va al issue post-MVP de UI/UX;
  - O-9/O-1 📝: Slush con una sola cuenta;
  - O-10/O-11 📝: watch paths de Railway en solo `/app/**`;
  - O-2/O-3 no medidas, O-8 no realizada.
- **Issues abiertos:** ninguno creado; quedan pendientes las decisiones sobre O-12 y O-13.
- **Veredicto propuesto por el DEV: PASA**, si el MID acepta H2 y H4 sin el resumen previo a la firma, y H1 sin el número
  de "Volver a comprobar". Si no, se espera ese dato del owner. Ningún ❌.
- El encabezado de `SMOKE_MVP.md` sigue en "Estado: EN CURSO" hasta que decida el MID.
- Comprobé con un script las columnas "Resultado esperado" contra el Anexo A: coinciden, salvo `<M>` en 0.1 y 0.2.

### §R-6 sobre todo `<repo>/documents/SMOKE_MVP.md`
```
--- grep 1: exit=1 (vacío)
--- grep 2: exit=1 (vacío)
--- grep 3: exit=1 (vacío)
--- grep 4
      4 0c6c…826a   → G1
      4 143c…ee0e   → G2
      3 3bcb…876b   → G3
      2 54ee…eb1a   → houseId
      1 8b78…6f51   → packageId
      1 cf08…37fe   → houseCapId
```

**Comprobación en memoria de las cuentas.** `A = sender(d1c)` y `B = sender(d1a)` se leyeron por gRPC y quedaron solo en
memoria. En `SMOKE_MVP.md` y en este reporte busqué:
- la abreviatura 4+4;
- el prefijo `0x`+4 con "…";
- el sufijo "…"+4;
- un fragmento de 12 hex del principio o del final.

Resultado: **false en los cuatro casos, para A y para B, en los dos archivos.**

C no firmó nunca, así que no se puede derivar on-chain. Aun así, las seis coincidencias del grep 4 son todas IDs de
objetos atribuidos, así que ninguna es una cuenta, tampoco C. No hubo nada que borrar.

==========================================================================================================================
## Revisión MID final: TASK-3 y TASK-4 — PASA · Veredicto del smoke: PASA (30/30)

> MID, 2026-11-19, contra HANDOFF_SMOKE_MVP v1.3.1. Revisé `SMOKE_MVP.md` completo, este reporte con todos sus anexos y
> los crudos `out-t4-*.txt` y `n17/out-*.txt`.

### Sonda
- **97 PASA / 0 NO PASA** en 8 bloques, todos con `exit=0` en el crudo.
- **Identidad de `final`:** `amount 8000000 + Ff 0 == F0 0 + Σ fee 8000000`, con 2 `GameResolved` en `(K0, Kf]` y 0
  ajenas.
- **Conservación exacta** sobre {A, B} (`CAP == A`): −16052995.
- **La House vuelve al estado de 0.4.**
- **Gas:** los "Costo de red" que mostró la app (3c, 4b, H3) son iguales a `gas(tx)`.
- **DL-12, DL-13 y C-6:**
  - DL-12 aplicado en `pre`;
  - DL-13 cumplido: `pre` 21:52:20Z, `final` 23:24:32Z, en la misma sesión;
  - C-6 no cortó nunca.
- **§R-6:** limpio y atribuido. La comprobación en memoria de las cuentas da false ×4 para A y para B, en los dos archivos.

### Decisiones del MID
1. **H2 y H4 pasan a ✅** con la nota "resumen previo a la firma no registrado".
   - Lo que verifica el criterio (los valores que se firman y se ejecutan) está on-chain y es exacto:
     - H2: 200→201;
     - H4: 1000000/50000000000 → 2000000/10000000000 → de vuelta.
   - El owner confirmó con preguntas cerradas el aviso de éxito y el botón deshabilitado.
   - El texto del resumen lo cubren los tests de `HouseAdminPanel` (#14).
   - Lo que vio el owner mientras firmaba va a O-13.
2. **H1 pasa a ✅** sin el conteo de "Volver a comprobar". Ese conteo solo mide algo justo después de recibir el cap, y en
   esta corrida no hubo transferencia (custodia "publicadora importada"). Se anota "no aplica: sin `dcap`".
3. **0.2 pasa a ✅** con el deploy `30e1405` ≠ M. El delta `30e1405..77bb49c` es solo de `documents/`, y el bundle es el
   mismo (`index-B3BeMVQC.js`, 917804 B, igual al de la CI de M).
   - DL-8 en TASK-5: STATUS anota M = `77bb49c` como el árbol probado y `30e1405` como el deploy activo, con el mismo
     `dist`.
4. **O-12 va a issue `type:bug`, `priority:P2`, no bloqueante.**
   - La app bloqueó la única acción de la House sin ningún aviso, y solo se destrabó recargando.
   - No hay riesgo de fondos, y 4b pasó después de recargar.
   - No es ❌ del smoke: el paso 4b tiene su verificación completa.
5. **O-13 va a un issue propio** (`type:feature` de UX del panel, P3), enlazado desde el rediseño de UI/UX.
   - Es un arreglo acotado en `HouseAdminPanel`: conservar el borrador mientras la wallet pide la firma.
   - Además tiene un costado de seguridad para el usuario: la vista previa puede no coincidir con lo que muestra el
     formulario. No conviene que espere al rediseño.
6. **Observaciones sin issue propio** (van al rediseño o a la doc):
   - O-1 y O-9: limitación de Slush, una sola cuenta;
   - O-2 y O-3: no medidas;
   - O-8: no realizada;
   - O-10 y O-11: watch paths de Railway en `/app/**`, pendiente del owner.

### Veredicto
**Pasos: 30/30 ✅, 0 ❌.** Sonda 97/0, identidad de comisiones y conservación exactas. Hallazgos: O-12 (bug P2) y
O-13 (UX P3), los dos no bloqueantes. **SMOKE_MVP: PASA.** TASK-3 y TASK-4: **PASA**.

### Siguiente paso
- **TASK-5 autorizado.** Además de lo que fija el handoff:
  - DL-8 con M y el deploy;
  - DL-14 con el dato de 12 épocas a las 21:54Z;
  - en `app/README.md`:
    - `:479`: O-1 y O-9;
    - `:604`: O-7 (3474748 / 3474772, precio 1000, por debajo de la reserva);
    - `:898-908`: O-2 y O-3 siguen pendientes y quedan enlazados al issue de UI/UX;
  - los enlaces a los 4 issues nuevos;
  - en STATUS, "Pendientes del usuario": O-11 (watch paths), N-5 (tag) y la revisión de D-20261119-03.
  - Comprobar con `/usr/bin/grep -n 'no requerido\|No es requerido'` que no quedan textos viejos de `deploy-image`.
  - Nota: con las watch paths en `/app/**`, editar `app/README.md` dispara un redeploy con el mismo `dist`. N-2 lo cubre.
- **TASK-6 autorizado** cuando TASK-5 pase.
  - El body lleva solo `Closes #17`; #15 y #16 ya están cerrados.
  - Enlaza los 4 issues nuevos, D-20261119-03 y lo que vence (D-20261103-01 (2)).
  - Antes del merge, el regex de D-20261119-01 sobre los commits y el body.

---

## TASK-5

> Reporte del DEV (texto plano en el scratchpad, copiado tal cual por el orquestador tras leerlo y pasar los greps §R-6 y la búsqueda de las cuentas del owner: 0 coincidencias).

## Task completado: HANDOFF_SMOKE_MVP — TASK-5

### Branch (con SHA corto del HEAD)
`feature/issue-17-mvp-smoke` @ `d46a503` (worktree `<repo>-issue17`). Cambios sin commitear, sin push.

### Archivos modificados/creados
- `README.md` (DL-14 en "Jugar en testnet"; roadmap: corte "MVP cerrado", #17 "Hecho", filas post-MVP #70-#73)
- `app/README.md` (DL-14 ×3; O-8 en el ícono remoto de Slush; O-1/O-9; O-7; "Pendientes conocidos" reescrito)
- `contracts/README.md` (DL-14, solo las dos líneas que fija el handoff)
- `agents.md` (DL-14, la línea de `agents.md:251` de `b7aa568`, hoy :252-253)
- `documents/STATUS.md` (fila 6 en ✅; DL-8 y vencimiento de D-20261103-01 (2) en "Despliegues"; 2 filas de
  baselines; fila de #17; "Siguiente"; "Pendientes del usuario")
No tocados: `documents/SMOKE_MVP.md`, `documents/HANDOFF_SMOKE_MVP.md`, `documents/DECISIONES.md`
(`git diff --quiet` sobre los tres: sin cambios).

### Qué se implementó (3 líneas máx)
Cierre del MVP en los docs: STATUS con #17 PASA 30/30 sobre M = `77bb49c` (deploy `30e1405`, mismo `dist`), roadmap y
"Siguiente" con #70-#73, y "Pendientes del usuario" con O-11, N-About y N-5 en ✅ (owner) y D-20261119-03 abierta. El "≈ 14,6 días" pasa a la retención
medida y fechada (DL-14), y los pendientes de `app/README.md` que remitían a #17 pasan a lo medido o a #70-#72.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (solo docs).
- Contracts: no aplica (sin cambios de código; no se corrió `sui`).
- App: no aplica (sin cambios de código).
- Tablas de contrato (contracts/README.md) y app/src/sui/ sincronizados: no aplica.

`git diff --stat`:
```
 README.md           | 14 +++++++----
 agents.md           |  3 ++-
 app/README.md       | 69 +++++++++++++++++++++++++++++++++++------------------
 contracts/README.md |  6 +++--
 documents/STATUS.md | 23 ++++++++++++------
 5 files changed, 78 insertions(+), 37 deletions(-)
```

Orden de `documents/DECISIONES.md` (solo lectura, sin editar):
```
13: D-20261119-03   19: D-20261119-02   25: D-20261119-01   31: D-20261104-07
37: D-20261104-06   44: D-20261104-05   51: D-20261104-04
```
= 03 > 02 > 01 > 07 > 06 > 05 > 04. OK.

Criterios de TASK-5:
```
$ /usr/bin/grep -n '#17' app/README.md
171  smoke de #17 (... O-8) **no se hizo**; seguimiento en #72
448  retención ... ≈ 10-12 días, medido en #17
496  en el smoke de #17 (O-1, O-9) tampoco Slush ...
626  O-7 del smoke de #17 ... 3 474 748 y 3 474 772 ...
738  ≈ 10-12 días (#17) ... en el smoke de #17 (O-5) ...
743  El smoke de #17 no lo pudo ejercer (O-6 ...)
924  Panel de la House ... **verificado** en el smoke de #17
932  la latencia **no se midió** en #17 (O-3) ... #72
934  La vista previa ... (O-2) tampoco se midió en #17: queda en #72
936  ... no se pudo ejercer en #17 con Slush (O-1, O-9) ... #72
939  #17 (O-5 ...); el caso del creador no aplicó (O-6)
940  Con una wallet de extensión real (Slush, #17) ...
944  smoke de #17 ... (O-4)
```
Todas en pasado o con lo medido; ninguna dice "se verifica en #17" ni "queda para #17": sin pendientes vivos.

```
$ /usr/bin/grep -rn '14,6' README.md app/README.md contracts/README.md agents.md
README.md:45            ≈ 14,6 días en #10; el 2026-11-19, 11 épocas al medir y 12 a las 21:54Z (poda por época, ≈ 10-12 días)
app/README.md:447       ≈ **14,6 días** en #10; el 2026-11-19, 11 épocas ... ≈ **10-12 días**, medido en #17
app/README.md:737       ≈ **14,6 días** en #10; el 2026-11-19, 11 épocas ... ≈ **10-12 días** (#17)
contracts/README.md:539 ≈ 14,6 días en #10; el 2026-11-19, 11 épocas ... ≈ 10-12 días, #17
contracts/README.md:562 ≈ 14,6 días en #10, ≈ 10-12 días el 2026-11-19: 11 épocas al medir y 12 a las 21:54Z
agents.md:253           ≈ 14,6 días en #10; el 2026-11-19, 11 épocas al medir y 12 a las 21:54Z (... ≈ 10-12 días; #17)
```
Todas con la medición fechada y "la fija el operador del nodo" (README, app/README ×2, contracts :539, agents).
El "~14,6 días" del caso del creador (`app/README.md`, antes :729) pasa a "antes de la ventana del nodo (≈ 10-12 días
... 2026-11-19)". STATUS (:72, :180 de antes, :221, :223) y `DECISIONES.md` quedan como historia (DL-14).

```
$ /usr/bin/grep -rn 'no requerido\|No es requerido' README.md app/README.md contracts/README.md agents.md .github/workflows/ci.yml documents/STATUS.md
documents/STATUS.md:64: | docs @ `feature/issue-15-pages-deploy` (TASK-5 de #15), 2026-11-04 | ... job `deploy-image` no requerido ...
```
Solo una fila histórica de baselines (2026-11-04), que describe el estado de entonces: se deja como historia, igual que
las filas de STATUS de DL-14. Los cinco textos del addendum de S-8 ya estaban en "requerido" (los tomó S-8):
`agents.md:64` ("los tres requeridos"), `:224` ("**Requerido** desde el 2026-11-19"), `:232-234` ("Los tres bloquean
el merge ... `deploy-image` desde D-20261119-02"), `app/README.md:223` ("**es check requerido**"),
`.github/workflows/ci.yml:185` ("Requerido desde D-20261119-02"). Nada que cambiar.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: solo docs. Lecturas de GitHub por `gh issue view 70..73` (títulos, labels y, de #72, la lista de
observaciones: O-1, O-2, O-3, O-5, O-8, O-9, O-12, O-13) para redactar las filas del roadmap y los enlaces. Ninguna
lectura de testnet.

### Desviaciones del handoff (o "ninguna")
0. **Actualización del orquestador a mitad del task (2026-11-19, dato del owner):** en "Pendientes del usuario" de
   STATUS, O-11 (watch paths pasadas a la lista del checklist), N-About (settings "About" del repo) y N-5 quedan en
   "✅ 2026-11-19 (owner)", no como abiertos. N-5 se escribe como decidido: "tag `v0.1.0` sobre el merge de #17, lo
   crea el orquestador justo después del merge", sin SHA (lo completa el housekeeping). La revisión de D-20261119-03
   sigue abierta. El párrafo de "Despliegues" dice ahora que las watch paths estaban en `/app/**` durante el smoke y
   que el owner las corrigió. El handoff (TASK-6, N-5 como pendiente del body) no se edita: lo actualiza el MID.
1. **Líneas re-ubicadas** sobre el árbol actual (`d46a503`, que trae M por `296c07b`): las `:479`, `:604` y `:898-908`
   de `app/README.md` son hoy :493, :618 y :906-922; DL-14 en :446, :727, :729 (`app/README.md`), :44 (`README.md`),
   :539, :561 (`contracts/README.md`) y :252 (`agents.md`).
2. **O-8 en `app/README.md:171`** (no estaba en la lista de líneas): decía "Queda como observación de #17"; sin tocarla,
   el criterio "`#17` sin pendientes vivos" fallaba. Ahora dice que O-8 no se hizo y enlaza #72.
3. **"Pendientes conocidos"**: además de O-2/O-3 (enlazados a #72, como pide el MID), el ítem del panel de la House
   (checklist en el body de #17) pasa a "verificado" con #70 y #71, el de R-1 de #11 pasa a lo medido en 3b, y el de
   `runtimeCancellation` a "no ocurrió" (O-4). Mismo criterio del handoff: "se quitan los ítems que remiten a #17 o
   pasan a lo medido".
4. **STATUS, "Baselines de gates"**: dos filas nuevas (el smoke de #17 sobre M y este TASK-5 de docs), como hicieron
   los TASK-5 anteriores. No había fila de #17 en "Ciclo activo": se agregó (estado "✅ 2026-11-19 (smoke PASA; el PR
   va en TASK-6)"; el SHA de merge lo pone el housekeeping).
5. **N-2 en "Pendientes del usuario"**: el handoff lo pedía como pendiente, pero ya está resuelto por D-20261119-02; se
   anota "✅ D-20261119-02, no queda pendiente". También la línea vieja de #16 ("TASK-5 ... completa la URL y cierra
   #15 y #16") pasa a pasado (PR #68).
6. **D-20261104-05** suma a la lista "A revisar por el owner" (lo pedía el handoff, no la lista del MID).
7. **Vencimiento de D-20261103-01 (2)** anotado en "Despliegues" de STATUS (PROY-10 estricto, solo upgrades
   compatibles). No se repite en la fila de #17.

### Riesgos / pendientes (o "ninguno")
- **Redeploy de Railway:** con las watch paths de `/app/**` (O-11, como estaban en el smoke), el merge de este cambio
  de `app/README.md` disparaba un redeploy con el mismo `dist`, cubierto por N-2. Con la lista del checklist que puso
  el owner, `!app/README.md` lo excluye y no debería redesplegar; si Railway no respetara la negación, es el mismo
  `dist` y N-2 lo cubre igual. Solo se anota.
- `app/README.md:73` y :235 y `agents.md:413` ("cada push que toca las watch paths del paso 5") vuelven a ser exactos
  con la corrección del owner: no se tocan.
- **Comentario en #51 con la medición** (DL-14): lo publica el orquestador; propuesta de texto: "Retención del fullnode
  público de testnet medida en #17: 11 épocas al medir y 12 a las 21:54Z del 2026-11-19 (piso 404332001, primer
  checkpoint de la época 1278). Poda por época, ≈ 10-12 días; la fija el operador del nodo (≈ 14,6 días en #10)."
- Los greps 3 de §R-6 sobre los archivos **completos** dan 4 líneas de `agents.md` (149, 337, 390, 426), todas
  preexistentes y de texto de reglas (la ruta de la localnet aislada bajo `<SMOKE_DIR>` y las reglas de "nada de keystores ..."): fuera de este
  diff. Sobre las líneas agregadas, vacío (abajo).

### Documentación
- READMEs / agents.md actualizados: sí (`README.md`, `app/README.md`, `contracts/README.md`, `agents.md`).
- Snippet propuesto para documents/STATUS.md: ya aplicado en este task (fila 6, "Despliegues", 2 baselines, fila de
  #17, "Siguiente", "Pendientes del usuario").

### Greps de §R-6 (`/usr/bin/grep`) sobre las 78 líneas agregadas del diff (`<scratchpad>/added_t5_17.txt`)
```
$ /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' added_t5_17.txt
exit=1
$ /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' added_t5_17.txt
exit=1
$ /usr/bin/grep -niE '<patrón 3 de §R-6: claves, frases y rutas personales>' added_t5_17.txt
exit=1
$ /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}' added_t5_17.txt
exit=1
$ los seis fragmentos de cuenta que dio el orquestador, -ci cada uno sobre added_t5_17.txt
0 / 0 / 0 / 0 / 0 / 0
$ regex de D-20261119-01 sobre added_t5_17.txt
exit=1
```
Los cuatro vacíos: no hay nada que atribuir. Los seis fragmentos de las cuentas del owner dan 0 en las líneas agregadas
y también 0 en los cinco archivos completos (`README.md`, `app/README.md`, `contracts/README.md`, `agents.md`,
`documents/STATUS.md`). Sin direcciones de cuenta, ni completas ni abreviadas. Los SHAs (`77bb49c`, `30e1405`) son
de 7 caracteres y no entran en el grep 1.

### Mensaje de commit propuesto
```
docs: close the MVP in the docs after the testnet smoke (#17)

- STATUS: roadmap row 6 done; #17 row with the smoke at 30/30 on M 77bb49c
  and the active deploy 30e1405 with the same dist (DL-8); smoke and docs
  baselines; post-MVP "Siguiente" with #70-#73; owner items O-11
  (Railway watch paths), N-About and N-5 (tag v0.1.0 on the #17 merge, by
  the orchestrator) done, the review of D-20261119-03 still open;
  D-20261103-01 (2) expires with #17.
- README roadmap: #17 done and #70-#73 as post-MVP.
- Fullnode retention (DL-14): the "~14.6 days" now carries the measurement,
  11 epochs and 12 at 21:54Z on 2026-11-19, per-epoch pruning, ~10-12 days.
- app/README: O-1/O-9 (Slush, one account), O-7 gas budget below the
  reserve, and the known pendings moved to what was measured or to #70-#72.

Refs #17

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Revisión TASK-5: PASA

> MID, 2026-11-19, contra `HANDOFF_SMOKE_MVP.md` v1.3.1, TASK-5, y la revisión final del MID de TASK-3/4. Revisé el
> `git diff` real sobre `d46a503`: 5 archivos de docs más este reporte, 260 líneas agregadas. El MID no corrió gates:
> el task no toca código.

### Implementa lo pedido
- **STATUS:**
  - la fila 6 en ✅ con el MVP cerrado;
  - DL-8 con M = `77bb49c` como árbol probado y `30e1405` como deploy activo, con el mismo `dist`;
  - la fila de #17 y "Siguiente" con #70-#73 y el resto de lo post-MVP;
  - el vencimiento de D-20261103-01 (2), anotado en "Despliegues";
  - D-20261104-05 en "A revisar por el owner", y la revisión de D-20261119-03 como pendiente.
- **`README.md`:** roadmap con #17 "Hecho" y #70-#73, y el corte "MVP cerrado".
- **`app/README.md`:**
  - O-1/O-9 en el cambio de cuenta;
  - O-7 en la reserva de aceptar: 3474748 y 3474772, precio 1000, la reserva no cambia;
  - "Pendientes conocidos": cada ítem pasa a lo medido o a #70/#71/#72.
- **DL-14:** la retención va fechada y atribuida al operador del nodo, en los 6 lugares y en `agents.md:253`.
- **Criterios de TASK-5, revisados sobre el árbol de trabajo:**
  - `/usr/bin/grep -n '#17' app/README.md`: 13 líneas, **todas en pasado** (lo medido o no medido en el smoke). No queda
    ningún "se verifica en #17";
  - `/usr/bin/grep -rn '14,6' README.md app/README.md contracts/README.md agents.md`: 6 líneas, todas con la medición
    fechada ("≈ 14,6 días en #10; … el 2026-11-19 …"). STATUS y `DECISIONES.md` quedan como historia, como fija DL-14;
  - `no requerido|No es requerido|no es check requerido` en los docs vivos y en `ci.yml`: **0**.

### Higiene (sobre las 260 líneas agregadas, `git diff -U0`)
- **§R-6:** greps 1, 2, 3 y 4 **vacíos**. No hay abreviaturas de objetos en lo agregado, así que no hay nada que atribuir.
- **Fragmentos de cuenta:** A = `sender(d1c)` y B = `sender(d1a)` se leyeron por gRPC y quedaron solo en memoria.
  - Busqué la abreviatura 4+4 (con "…" y con "..."), el prefijo y el sufijo de 8 hex, y los de 12 hex.
  - Lo hice sobre lo agregado, `SMOKE_MVP.md` y `REPORTES_SMOKE_MVP.md`. Resultado: **false ×6** para A y para B.
  - C no firmó nunca.
- **Palabras de cierre:** el regex de D-20261119-01 sobre lo agregado y sobre `git log --format=%B origin/master..HEAD`
  sale **vacío**.

### Desviaciones del DEV: las 8 se aceptan
- **0 (actualización del orquestador: O-11, N-About y N-5 como hechos por el owner).** Se acepta. Son datos del owner
  pasados por el orquestador. N-5 sin SHA, que lo completa el housekeeping.
- **1 (líneas re-ubicadas).** Se acepta. Es el árbol de `d46a503`.
- **2 (O-8 en `app/README.md:171`).** Se acepta y era necesaria. Sin ese cambio, el criterio "`#17` sin pendientes vivos"
  fallaba. Ahora dice que O-8 no se hizo y enlaza #72, que es lo decidido en la revisión final.
- **3 (más ítems de "Pendientes conocidos").** Se acepta. Aplica el criterio del handoff ("se quitan o pasan a lo
  medido"), y cada cambio tiene su fila en `SMOKE_MVP.md`: 3b, O-4, H1-H7.
- **4 (filas extra en STATUS: dos baselines y la fila de #17 en "Ciclo activo").** Se acepta. Sigue el patrón de los
  TASK-5 anteriores, y el SHA de merge lo pone el housekeeping.
- **5 (N-2 ya resuelto) y 6 (D-20261104-05 en "A revisar").** Se aceptan.
- **7 (vencimiento de D-20261103-01 (2) en "Despliegues").** Se acepta.
- **N-5 en el handoff.** Lo actualiza el MID: es un cambio mecánico de la lista al orquestador, no del DEV.

### Hallazgos

| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| — | — | — | — | Ninguno | — |

### Siguiente paso
- TASK-5 **PASA**.
- **TASK-6 autorizado:**
  - el body del PR está en el scratchpad del MID (`pr63_body.md`);
  - antes del merge: la revisión de integración del MAYOR publicada, los 3 checks requeridos en verde, el regex de
    D-20261119-01 sobre los commits y el body, y `closingIssuesReferences` = `[17]`;
  - merge con merge commit;
  - después: el tag `v0.1.0` (orquestador) y el housekeeping.

### Mensaje de commit propuesto

```
docs: close the MVP in STATUS and the READMEs after the testnet smoke (#17)

TASK-5 of HANDOFF_SMOKE_MVP v1.3.1: STATUS marks the MVP closed (M =
77bb49c tested, 30e1405 deployed with the same dist), the #17 row and the
post-MVP issues #70-#73; the root README roadmap marks #17 done; app/README
turns every pending #17 item into what the smoke measured or links it to
#70-#72; the fullnode retention is dated and attributed to the node
operator in all live docs (DL-14). MID review: PASS, all deviations
accepted.

Refs #17

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
