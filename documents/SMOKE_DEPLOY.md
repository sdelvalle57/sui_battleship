# SMOKE_DEPLOY
> Plan: PLAN_DEPLOY v2.1 | Handoff: HANDOFF_DEPLOY v1.2 (tras TASK-3; incorpora B3 y B4 del "Addendum v1.2") | Issue: #7 |
> Fecha: 2026-11-02 | Estado: EN CURSO (sin correr)

Runbook vivo: las columnas "Resultado obtenido" y "Estado" se llenan **durante la corrida**, nunca por adelantado.
Un paso fallido ⇒ NO PASA.

## Precondiciones

- **Red:** localnet **aislada** según `agents.md` §3 ("Localnet aislada (smokes)", pasos 1-7, con los agregados de
  TASK-3: `NODE` literal en `env.sh`, variantes A/B de salida en el paso 4 y `rm -f contracts/deployments/localnet.json`
  en el cierre). Nunca `sui start` a secas; nada en `~/.sui/`.
- **B4 — Prefijo obligatorio** en **toda** llamada que invoque `sui client …` (también las de solo lectura como
  `active-env`) o `publish.mjs publish`:

  ```sh
  . <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&
  ```

  En las tablas se abrevia `PRE`. La única forma de ver la salida real de un `sui client` es esta localnet. Sin prefijo,
  solo: los comandos de la preparación sin `sui` (paso 0), el cierre (paso 13) y git.
- `publish.mjs` se corre siempre desde `<repo>/contracts`, como `SUI_BIN="$SUI" "$NODE" scripts/publish.mjs …`
  (`record` y `check` no invocan la CLI, pero se cargan con `. <SMOKE_DIR>/env.sh &&` para tener `$NODE`).
- **Prohibido (D-20261102-03, revisión v2-1):** `publish.mjs publish --network testnet`, con o sin `--dry-run`, y
  cualquier contacto con testnet. `SUI_CONFIG_DIR` solo vale `$SMOKE_DIR/net`. Única excepción: el paso 11, que
  reemplaza `SUI_CONFIG_DIR` por la ruta de `~/.sui/sui_config` (sin leer nada) con un `SUI_BIN` centinela que no es la
  CLI, para probar que la guarda 2 lo rechaza antes de invocar nada.
- **Cuentas:** `ADMIN` = primera dirección de la génesis aislada (`PRE suic addresses --json`, anotada en `ids.env`).
  Publica y recibe el `HouseCap`.
- **Cliente:** CLI `sui 1.83.0-16d2dc1e05ed` + `contracts/scripts/publish.mjs` con Node 26.
- **Branch:** `feature/issue-7-deployments` con TASK-1..3 commiteados (SHA en el reporte); árbol limpio al empezar.
- **Qué se pega:** la salida **del script**, los json de despliegue (IDs de localnet) y los digests. **Nunca** los
  `*-output.json` ni los `*-stderr.txt` completos, ni nada de `<SMOKE_DIR>/net`.

## Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 0 | **Preparación (§3 paso 2), sin `sui`.** Elegir `<SMOKE_DIR>`, `SUI` y `NODE` (`~/.nvm/versions/node/v26.13.0/bin/node`) como rutas absolutas literales en `env.sh`.<br>Crear el **centinela** `<SMOKE_DIR>/sui-sentinel` (`chmod +x`): `#!/bin/sh` + `echo "$*" >> <SMOKE_DIR>/sentinel.log` + `exit 99` (rutas literales).<br>Línea base: `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml`, `ls <HOME real>/.sui/sui_config/`, `git status --porcelain`, `md5sum contracts/Move.lock`, `ls contracts/deployments 2>&1` | `stat` = `2026-10-30 17:52:52.515735237 -0500 244 …/client.yaml`; `ls` = `client.yaml`; árbol limpio; md5 anotado; `contracts/deployments`: `No such file or directory` | (se llena durante la corrida) | ⏳ |
| 1 | Génesis (§3 paso 4) y arranque en segundo plano del harness. En otra llamada, las cuentas: `PRE suic addresses --json`, y `ADMIN` va a `ids.env` | génesis `exit=0`; red arriba; `smoke_guard` sin `GUARD-FAIL` | | ⏳ |
| 2 | **Forma real con `--json` (B3):** `PRE suic --json active-env` y `PRE suic --json chain-identifier` | `active-env` → string JSON `"localnet"`; `chain-identifier` → objeto `{"base58": "…", "hex": "…"}` con `hex` de 8 hex (≠ `4c78adac`, ≠ `35834a8a`). Pegar ambas salidas literales y anotar el hex | | ⏳ |
| 3 | **Dry run:** `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json" --dry-run; echo "exit=$?"` | `exit=0`; "Dry run ok. Gas estimado: N MIST" (N > 0); directorio `$SMOKE_DIR/tmp/battleship-publish-*` (`0700`) con `meta.json`, `dry-run-output.json` y `dry-run-stderr.txt` (`0600`; `stat -c '%a %n'`); **no** existe `$SMOKE_DIR/localnet.json`; `Pub.localnet.toml` creado vacío (C7, esperado); `Move.lock` con el md5 del paso 0 | | ⏳ |
| 4 | **Variante A (`--out` en `$SMOKE_DIR`):** lo mismo que el paso 3 **sin** `--dry-run` | `exit=0`; `$SMOKE_DIR/localnet.json` válido con 14 campos: `network` `localnet`; `chainId` = paso 2; `packageId` = `originalPackageId`; `packageVersion` 1; `sourceCommit` `null`, porque este documento ya está modificado y deja el árbol sucio, algo válido solo en localnet. Directorio nuevo `battleship-publish-*` con `meta.json`, `publish-output.json` y `publish-stderr.txt` (`0600`). Resumen con "Siguiente paso obligatorio (#8)" y el comando `update_fee_rate`. El resumen **no** contiene la dirección de `ADMIN` (`grep -c` sobre la salida guardada del script = 0). `Move.lock` sin delta. IDs a `ids.env` (`PKG`, `HOUSE`, `CAP`) | | ⏳ |
| 5 | `PRE suic object "$HOUSE" --json \| jq '{type: .objType, owner: .owner, fee_rate: .content.fee_rate, min_bet: .content.min_bet, max_bet: .content.max_bet}'` y `PRE suic object "$CAP" --json \| jq '{type: .objType, owner: .owner}'` | House `<PKG>::house::House` compartida, `fee_rate` 0, `min_bet` `"1000000"`, `max_bet` `"50000000000"`; `HouseCap` `<PKG>::house::HouseCap` de `ADMIN` | | ⏳ |
| 6 | `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/tx-06.json"` (el comando impreso en el paso 4 con `<bps>` = 250) y relectura de la House con el paso 5 | `success`; evento `FeeRateUpdated` (`old_fee_rate` 0, `new_fee_rate` 250); `fee_rate` 250 | | ⏳ |
| 7 | **Doble publicación:** repetir el paso 4 con el mismo `--pubfile-path` y `--out "$SMOKE_DIR/localnet-dup.json"` | `exit=1`; la CLI rechaza ("already published", C2/C4); **no** existe `localnet-dup.json`. Mensaje del script: `Error: …`, `Salida completa (sin mostrar): …`, `Directorio temporal: …`, stderr con IDs y direcciones como `0x…` (`redactAddresses`); sin stdout crudo | | ⏳ |
| 8 | **`record` desde el directorio del script (B3):** `. <SMOKE_DIR>/env.sh && cd <repo>/contracts && "$NODE" scripts/publish.mjs record --network localnet --from "<dir del paso 4>/publish-output.json" --out "$SMOKE_DIR/localnet2.json"; echo "exit=$?"; cmp "$SMOKE_DIR/localnet.json" "$SMOKE_DIR/localnet2.json"; echo "cmp=$?"` | `exit=0`; toma `meta.json` del mismo directorio (sin flags); `cmp=0` | | ⏳ |
| 9 | **Variante B (ruta por defecto, B3):** `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.b.toml"; echo "exit=$?"`, sin `--out`. Es una segunda publicación independiente, con pubfile nuevo | `exit=0`; el script crea `contracts/deployments/` y escribe `contracts/deployments/localnet.json` (14 campos válidos, `packageId` ≠ el del paso 4) | | ⏳ |
| 10 | **`check` con `localnet.json` presente:** `. <SMOKE_DIR>/env.sh && cd <repo>/contracts && "$NODE" scripts/publish.mjs check; echo "exit=$?"; git check-ignore -v deployments/localnet.json; git status --porcelain` | `exit=0` con "1 despliegue(s) válidos y coherentes con Published.toml" (localnet no se cruza con `Published.toml`); `check-ignore` cita `.gitignore:7`; `git status --porcelain` solo con este documento | | ⏳ |
| 11 | **Negativos que no invocan la CLI (B3)**, desde `<repo>/contracts`, con `SUI_BIN="$SMOKE_DIR/sui-sentinel"` y pubfile `"$SMOKE_DIR/Pub.n.toml"` en los tres. Prefijo `. <SMOKE_DIR>/env.sh && rm -f "$SMOKE_DIR/sentinel.log" &&`, y luego:<br>(a) sin `SUI_CONFIG_DIR`: `env -u SUI_CONFIG_DIR SUI_BIN="$SMOKE_DIR/sui-sentinel" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.n.toml"; echo "exit=$?"`<br>(b) dentro de `~/.sui`: lo mismo con `SUI_CONFIG_DIR=<HOME real>/.sui/sui_config` en lugar de `env -u SUI_CONFIG_DIR`<br>(c) relativo: lo mismo con `SUI_CONFIG_DIR=net`<br>Al final: `ls "$SMOKE_DIR/sentinel.log" "$SMOKE_DIR/Pub.n.toml" <repo>/contracts/net 2>&1` | (a) `exit=1`, "SUI_CONFIG_DIR inválido: no está definido …"<br>(b) `exit=1`, "… está dentro de ~/.sui, que queda sin claves para siempre (D-20261102-03)"; ejercita el `home` de `os.userInfo()` porque `HOME` está aislado<br>(c) `exit=1`, "… no es una ruta absoluta"<br>En los tres, **ninguna** invocación de la CLI: no existen `sentinel.log`, `Pub.n.toml` ni `contracts/net` | | ⏳ |
| 12 | `--network testnet` con env `localnet` | ⛔ **No se ejecuta**: **excluido por D-20261102-03** (ver la nota de abajo). Lo cubre el test puro de `checkNetworkGuard` | — | ⛔ fuera |
| 13 | **Cierre (§3 paso 7):**<br>1. `kill` del PID; en otra llamada, confirmar que `kill -0` falla.<br>2. `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments 2>/dev/null \|\| true`.<br>3. `rm -rf <SMOKE_DIR>` y comprobar que ya no existe.<br>4. **Sin cargar `env.sh`:** `stat`/`ls` de `~/.sui/sui_config/`, `git status --porcelain`, `git diff --exit-code -- contracts/Move.lock`, `ls contracts/Pub.*.toml contracts/Published.toml contracts/deployments 2>&1` | `stat`/`ls` idénticos al paso 0; árbol solo con este documento; lock `exit=0`; los tres `No such file or directory` | | ⏳ |

**Nota sobre el paso 12 (B3 frente a D-20261102-03).** El addendum B3 pide un negativo `--network testnet` con env
`localnet`, pero D-20261102-03 (ningún agente corre el camino testnet del script, ni con `--dry-run`) y la revisión v2-1
del MAYOR ("si el MID quiere conservar la prueba negativa, la tiene que autorizar el usuario de forma explícita") lo
excluyen. Además, sí invoca la CLI (`active-env`, aunque solo lee). Decisión del orquestador (2026-11-02): queda fuera de este smoke; la cobertura es el test puro de `checkNetworkGuard`. Reabrirlo requiere autorización explícita del usuario.
Variante segura si se autoriza: correrlo con un `SUI_BIN` centinela que solo responda `"localnet"` a `client --json
active-env` y registre cada invocación. Así la CLI real nunca corre y se verifica que no se pidió `chain-identifier`.

## Si algo falla

- Capturar el número de paso, el `exit`, el digest si lo hubo y la salida **del script**. Los archivos crudos
  (`*-output.json`, `*-stderr.txt`) no se pegan; se revisan líneas puntuales.
- Si la publicación falla por verificación de dependencias, se reporta (no se agrega `--skip-dependency-verification`).
- Un `GUARD-FAIL` detiene el smoke. Si `Move.lock` cambia: `git checkout -- contracts/Move.lock` y se declara.
- Si en el paso 11 aparece `sentinel.log`, la guarda 2 está mal: NO PASA con el contenido del log (solo argumentos).

## Reporte final

- Pasos PASA/TOTAL (0-11 y 13; el 12 queda fuera):
- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]
