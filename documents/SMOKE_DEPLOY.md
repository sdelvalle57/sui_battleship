# SMOKE_DEPLOY
> Plan: PLAN_DEPLOY v2.1 | Handoff: HANDOFF_DEPLOY v1 (tras TASK-3) | Issue: #7 | Fecha: 2026-11-02 | Estado: EN CURSO (sin correr)

Runbook vivo: las columnas "Resultado obtenido" y "Estado" se llenan **durante la corrida**, nunca por adelantado.
Un paso fallido ⇒ NO PASA.

## Precondiciones

- **Red:** localnet **aislada** según `agents.md` §3 ("Localnet aislada (smokes)", pasos 1-7, con los agregados de
  TASK-3: `NODE` literal en `env.sh`, variantes de salida del paso 4 y `rm -f contracts/deployments/localnet.json` en el
  cierre). Nunca `sui start` a secas; nada en `~/.sui/`.
- **Prefijo de cada llamada con `sui` o con `publish.mjs publish`:**
  `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`.
  Todo `publish.mjs` se corre desde `<repo>/contracts` como `SUI_BIN="$SUI" "$NODE" scripts/publish.mjs …`.
- **Prohibido (D-20261102-03):** `publish --network testnet`, con o sin `--dry-run`. Lo cubren los tests puros de
  `checkNetworkGuard` (TASK-2). `SUI_CONFIG_DIR` solo es `$SMOKE_DIR/net`.
- **Cuentas:** `ADMIN` = primera dirección de la génesis aislada (`suic addresses --json`, anotada en `ids.env`). Publica
  y recibe el `HouseCap`.
- **Cliente:** CLI `sui 1.83.0-16d2dc1e05ed` + `contracts/scripts/publish.mjs` (TASK-2) con Node 26.
- **Branch:** `feature/issue-7-deployments` con TASK-1..3 commiteados (SHA en el reporte); árbol limpio al empezar.
- **Qué se pega:** el json del paso 3, la salida del script y los digests. **Nunca** `publish-output.json`,
  `publish-stderr.txt` completos ni nada de `<SMOKE_DIR>/net`.

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 0 | Preparación (§3 paso 2) sin `sui`. Elegir `<SMOKE_DIR>`, `SUI` y `NODE` (`~/.nvm/versions/node/v26.13.0/bin/node`) como rutas absolutas literales en `env.sh`. Línea base: `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml`, `ls <HOME real>/.sui/sui_config/`, `git status --porcelain`, `md5sum contracts/Move.lock` | `stat` = `2026-10-30 17:52:52.515735237 -0500 244 …/client.yaml`; `ls` = `client.yaml`; árbol limpio; md5 anotado | (se llena durante la corrida) | ⏳ |
| 1 | Génesis (§3 paso 4), arranque en segundo plano del harness y, en otra llamada, `PRE suic chain-identifier`. Cuentas: `ADMIN` en `ids.env` | génesis `exit=0`; red arriba; `smoke_guard` sin `GUARD-FAIL` (`active-env` = `localnet`); chain id hex anotado (≠ `4c78adac`, ≠ `35834a8a`) | | ⏳ |
| 2 | `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json" --dry-run; echo "exit=$?"` | `exit=0`; simulación `success` con 1 paquete, 1 House, 1 `HouseCap`, 1 `UpgradeCap`; gas estimado impreso; **no** existen `$SMOKE_DIR/localnet.json` ni directorio `battleship-publish-*`; `Pub.localnet.toml` **creado vacío** (C7, esperado); `Move.lock` con el md5 del paso 0 | | ⏳ |
| 3 | Lo mismo **sin** `--dry-run` | `exit=0`; `$SMOKE_DIR/localnet.json` válido con 14 campos (`network` `localnet`, `chainId` = paso 1, `packageId` = `originalPackageId`, `packageVersion` 1, `sourceCommit` `null` porque este documento ya está modificado: árbol sucio, válido solo en localnet; HEAD si el árbol estuviera limpio); directorio `$SMOKE_DIR/tmp/battleship-publish-*` (`0700`) con `meta.json`, `publish-output.json` y `publish-stderr.txt` (`0600`, `stat -c '%a %n'`); resumen con el comando `update_fee_rate`; el resumen **no** contiene la dirección de `ADMIN` (`grep -c` = 0); `Move.lock` sin delta. IDs a `ids.env` (`PKG`, `HOUSE`, `CAP`) | | ⏳ |
| 4 | `PRE suic object "$HOUSE" --json \| jq '{type: .objType, owner: .owner, fee_rate: .content.fee_rate, min_bet: .content.min_bet, max_bet: .content.max_bet}'` y `PRE suic object "$CAP" --json \| jq '{type: .objType, owner: .owner}'` | House `<PKG>::house::House` compartida, `fee_rate` 0, `min_bet` `"1000000"`, `max_bet` `"50000000000"`; `HouseCap` `<PKG>::house::HouseCap` de `ADMIN` | | ⏳ |
| 5 | `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-05.json"` (comando impreso en el paso 3 con `<bps>` = 250); relectura de la House | `success`; evento `FeeRateUpdated` (`old_fee_rate` 0, `new_fee_rate` 250); `fee_rate` 250 | | ⏳ |
| 6 | Repetir el paso 3 (mismo `--pubfile-path` y `--out "$SMOKE_DIR/localnet-dup.json"`) | `exit=1`; la CLI rechaza ("already published", C2/C4); **no** existe `localnet-dup.json`; el stderr mostrado tiene IDs/direcciones como `0x…` (`redactAddresses`) y no trae stdout crudo; mensaje "No reintentes sin buscar antes el digest" | | ⏳ |
| 7 | `cd <repo>/contracts && "$NODE" scripts/publish.mjs record --network localnet --from "<dir del paso 3>/publish-output.json" --out "$SMOKE_DIR/localnet2.json"; echo "exit=$?"; cmp "$SMOKE_DIR/localnet.json" "$SMOKE_DIR/localnet2.json"; echo "cmp=$?"` (`record` no invoca `sui`: no necesita el prefijo) | `exit=0`; usa `meta.json`; `cmp=0` | | ⏳ |
| 8 | Variante (B) de la ruta por defecto (v2-5): lo mismo que el paso 7 **sin `--out`**; luego `ls -l deployments/localnet.json`, `git check-ignore -v deployments/localnet.json`, `git status --porcelain` y `"$NODE" scripts/publish.mjs check` | crea `contracts/deployments/` y `localnet.json` (= paso 3); ignorado por `.gitignore:7`; `git status --porcelain` solo con este documento; `check` exit 0 (1 despliegue localnet válido, sin cruce con `Published.toml`) | | ⏳ |
| 9 | Guarda de config (v2-2), desde `<repo>/contracts`: `. <SMOKE_DIR>/env.sh && env -u SUI_CONFIG_DIR SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.g.toml"; echo "exit=$?"` y `. <SMOKE_DIR>/env.sh && SUI_CONFIG_DIR=net SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.g.toml"; echo "exit=$?"` | ambos `exit=1` en la guarda 2 (sin definir / relativo) **sin invocar `sui`**: no aparece `Pub.g.toml` ni ningún directorio `contracts/net` | | ⏳ |
| 10 | Cierre (§3 paso 7): `kill` del PID; en otra llamada `kill -0` falla; `rm -f contracts/deployments/localnet.json`, `rmdir contracts/deployments 2>/dev/null \|\| true`; `rm -rf <SMOKE_DIR>` y comprobar que no existe; **sin cargar `env.sh`**: `stat`/`ls` de `~/.sui/sui_config/`, `git status --porcelain`, `git diff --exit-code -- contracts/Move.lock`, `ls contracts/Pub.*.toml contracts/Published.toml contracts/deployments 2>&1` | `stat`/`ls` idénticos al paso 0; árbol limpio (salvo este documento); lock `exit=0`; los tres `No such file or directory` | | ⏳ |

## Si algo falla

- Capturar el número de paso, el `exit`, el digest si lo hubo y la salida **del script**. La salida cruda
  (`publish-output.json`/`publish-stderr.txt`) no se pega: se revisan líneas puntuales.
- `ExecutionCancelledDueToRandomnessUnavailable` no aplica (no hay `Random`). Si la publicación falla por verificación
  de dependencias, se reporta (no se agrega `--skip-dependency-verification`).
- Un `GUARD-FAIL` detiene el smoke. Si `Move.lock` cambia: `git checkout -- contracts/Move.lock` y se declara.

## Reporte final

- Pasos PASA/TOTAL:
- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]
