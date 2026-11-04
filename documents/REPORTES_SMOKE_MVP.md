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
