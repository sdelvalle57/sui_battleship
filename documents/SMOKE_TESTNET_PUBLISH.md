# SMOKE_TESTNET_PUBLISH

> Handoff: `documents/HANDOFF_TESTNET_PUBLISH.md` v1.1 (TASK-4 = Parte A, TASK-5 = Parte B) | Issue: #8 | PR: #48 (draft) |
> Fecha: 2026-11-03 | Estado: Parte A COMPLETADO (13/13, PASA) · Parte B pendiente (G3)

## Parte A — Ensayo en la localnet aislada (TASK-4)

### Precondiciones

- **Red:** localnet **aislada** según `agents.md` §3 ("Localnet aislada (smokes)"), con génesis y red en `<SMOKE_DIR>`
  (directorio nuevo del scratchpad del DEV), sin `--force-regenesis` ni faucet. Prefijo de cada llamada con `sui`:
  `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`.
- **Código:** `feature/issue-8-testnet-publish` @ `7c3ccd5` (TASK-1..3 commiteados), CLI `sui 1.83.0-16d2dc1e05ed`,
  Node v26.13.0 por ruta absoluta (`NODE` en `env.sh`).
- **Cuentas:** una sola, `ADMIN`, la primera de la génesis aislada, que hace todo, como el owner. Ninguna dirección se
  pega en este documento.
- **Cliente:** CLI (`suic` en lugar del `suio` del runbook; mismos comandos y filtros `jq` que `contracts/README.md` →
  "Uso en testnet"). Script `scripts/publish.mjs` en la variante A (`--out "$SMOKE_DIR/localnet.json"`).

### Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| A0 | Preparación (§3 paso 2): `<SMOKE_DIR>` nuevo, `env.sh`, línea base `stat`/`ls` de `<HOME real>/.sui/sui_config/`; `git log -1 --oneline` = head con TASK-1..3; `git diff --exit-code -- contracts/Move.lock` | línea base anotada; lock en `05ad86a3…` y sin delta | `<SMOKE_DIR>` nuevo con `net/`, `tmp/`, `home/` vacíos y `env.sh` con rutas literales. Línea base: `client.yaml` 244 B, mtime `2026-10-30 17:52:52.515735237 -0500`; `ls` = solo `client.yaml`. Head `7c3ccd5` (TASK-3). `Move.lock` con `05ad86a3…` en las 2 secciones del framework, `git diff --exit-code` = 0. Puertos 9000/9123/9184/5173/4173 libres; ningún proceso `sui` | ✅ |
| A1 | Paso 2 del runbook (curl GraphQL público, sin `sui`) | `protocolVersion` 140 (época anotada); si no, STOP (P-C) | Comando del paso 2 del README tal cual: `{"epochId": 1273, "protocolConfigs": {"protocolVersion": 140}}` (2026-11-04 UTC) | ✅ |
| A2 | Génesis + arranque en segundo plano + `PRE suic chain-identifier` (§3 paso 4) | red arriba; chain id ≠ `4c78adac`/`35834a8a` | Génesis `exit=0` (`client.yaml` con `active_env = localnet`). Arranque en segundo plano con `exec` (PID en `sui.pid`). `PRE suic chain-identifier` al primer intento: hex **`d68cf064`** (ni testnet ni mainnet) | ✅ |
| A3 | `PRE suic addresses --json` → `ADMIN` a `ids.env` (§3 paso 5) | alias y direcciones; nunca `new-address` | `exit=0`, claves `activeAddress`/`addresses`, **5** cuentas de la génesis. `ADMIN` = la primera (alias `dreamy-pearl`), escrita en `ids.env` sin imprimirla. Sin `new-address` | ✅ |
| A4 | `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json" --dry-run; echo "exit=$?"` | `Dry run ok. Gas estimado: N MIST.`, `exit=0`; **sin** `Aviso: Move.lock cambió`; `git diff --exit-code -- contracts/Move.lock` = 0 | `exit=0`. Salida completa: `Dry run ok. Gas estimado: 47246000 MIST.` y `Directorio temporal: <SMOKE_DIR>/tmp/battleship-publish-itpYsT (bórralo cuando termines)`. **Sin** aviso de `Move.lock`; `git diff --exit-code -- Move.lock` = 0; la dirección de `ADMIN` aparece 0 veces en la salida | ✅ |
| A5 | Lo mismo **sin** `--dry-run`, salida a `"$SMOKE_DIR/publish-run.txt"`; `D` = directorio `battleship-publish-*` impreso, a `ids.env` como `export D=…` (m-5); `PKG`/`HOUSE`/`CAP`/`UCAP` a `ids.env` con los `jq` del paso 4 del README; `PRE test -d "$D" && test -f "$D/publish-output.json" && echo D-OK` | `exit=0`; json con 14 claves, `frameworkRev` = `05ad86a3…`, `suiCliVersion` `1.83.0-16d2dc1e05ed`; el resumen trae el `update_fee_rate … <bps>` con el prefijo `printf 'n\n' \| SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client` y la verificación en su propia línea, terminada en `# campo content.fee_rate`; `D-OK`; `grep -c "$ADMIN" "$SMOKE_DIR/publish-run.txt"` = 0; lock sin delta | `exit=0`. `localnet.json` con **14** claves: `frameworkRev` `05ad86a3…`, `suiCliVersion` `1.83.0-16d2dc1e05ed`, `chainId` `d68cf064`, `publishTxDigest` `C38TVJkwTdvKenjUbkyMkzMSUdpuch53c4dP4cFiAa6`. `sourceCommit` `null`: el árbol tenía este documento sin trackear, y localnet lo admite (`publish.mjs:700`); en testnet la guarda 5 exige el árbol limpio. El resumen imprime el comando de comisión con el prefijo `printf 'n\n' \| SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client`, terminado en `<bps>`, y en su propia línea, tras `Verificación:`, la lectura `… object <houseId> --json   # campo content.fee_rate`. `D` = `<SMOKE_DIR>/tmp/battleship-publish-ZZOgc3` (`0700`; `meta.json`, `publish-output.json`, `publish-stderr.txt`), anotado en `ids.env` junto con `PKG`/`HOUSE`/`CAP`/`UCAP` (los `jq` del paso 4 del README sobre `localnet.json`). En una llamada nueva: **`D-OK`**. `grep -c "$ADMIN"` = 0 (también sin `0x`); lock sin delta | ✅ |
| A6 | Paso 6 del README con `suic` y `200` | `exit=0`, `success`; `FeeRateUpdated` 0 → 200 (forma exacta anotada) | Los tres comandos del paso 6 tal cual (`suio` → `suic`). `exit=0`; digest `BPWSp8zvohq4j14XfH1SGiGnj76xgvsfEerxfjJpL8mn`, `success`; `parsedJson` = `{house_id, "new_fee_rate": 200.0, "old_fee_rate": 0.0}`. Coincide con el README (`u16` como `0.0`/`200.0`) | ✅ |
| A7 | Paso 7 del README con `suic` | `Shared`; `fee_rate` 200, `min_bet` `"1000000"`, `max_bet` `"50000000000"`, `version` `"1"`, `fees_collected` 0 (forma exacta anotada) | `exit=0`; `type` `<PKG>::house::House`; `owner` `{"Shared": {"initial_shared_version": 2}}`; `content` = `{"fee_rate": 200.0, "fees_collected": "0", "id": <houseId>, "max_bet": "50000000000", "min_bet": "1000000", "version": "1"}`. Valores correctos. Forma exacta: `fee_rate` es `200.0` y `fees_collected` es el string `"0"`; el README decía `200` y `0` → **corregido el valor esperado** (Desviaciones; el filtro no cambia) | ✅ |
| A8 | Paso 8 del README con `suic` (`A="$(suic active-address)"`, `PUB` desde `"$D/publish-output.json"`) | tres líneas, `HouseCap`/`UpgradeCap`/`Publisher`, cada una `true`; la dirección no se pega | Comandos del paso 8 tal cual. `PUB`: 1 id (el filtro `objectType == "0x2::package::Publisher"` sobre `publish-output.json` coincide: ahí la CLI usa la forma corta). Tres líneas: `<PKG>::house::HouseCap` `true`, `0x0000…0002::package::UpgradeCap` `true`, `0x0000…0002::package::Publisher` `true`; `active-address` == `ADMIN`. `suic object` da `objType` con la dirección `0x2` **larga** (64 hex); el README decía `0x2::package::…` → **corregido el valor esperado** | ✅ |
| A9 | Paso 9 del README con `suic`; `GAME` a `ids.env` | `success`; `GameCreated` `bet` `"1000000"`, `fee_rate` 200, `opponent` `null` | Comandos del paso 9 tal cual. `exit=0`; digest `HiPRPTncpA5hkLp8iCjroMnvcm1YrLH1fZ6eBneJbxUt`, `success`; `{"bet": "1000000", "fee_rate": 200.0, "opponent": null}`; `GAME` (1 id, filtro de `objectChanges` ok) anotado en `ids.env`. La partida copió la comisión nueva | ✅ |
| A10 | Paso 10 del README con `suic` | `success`; `refund` `"1000000"`, `by_creator` `true`; `state` `Cancelled`, `stake` `"0"` | Comandos del paso 10 tal cual. `exit=0`; digest `5VqgJB3VLuY2Np68dLk3FcGUHag2K7toVMzgDZARw2UA`, `success`; `{"refund": "1000000", "by_creator": true}`; `Game`: `{"state": {"@variant": "Cancelled"}, "stake": "0"}`. Forma exacta de `state`: el enum sale como `{"@variant": "Cancelled"}` → **corregido el valor esperado** en el README | ✅ |
| A11 | Guarda del prefijo, en una llamada **nueva sin** `env.sh`: `[ -z "${SUI_CONFIG_DIR+x}" ] && echo unset; printf 'n\n' \| SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" echo WOULD-RUN; echo "exit=$?"` | `unset`; error `SUI_CONFIG_DIR: exporta tu SUI_CONFIG_DIR`; **sin** `WOULD-RUN`; `exit` ≠ 0 | Llamada nueva, sin `env.sh`: `unset`; `bash: line 1: SUI_CONFIG_DIR: exporta tu SUI_CONFIG_DIR`; sin `WOULD-RUN`; `exit=127`. **Repetición de A7, A8 y A10 (lectura)** con los bloques extraídos del README ya corregido (`suio` → `suic`): las salidas coinciden con los valores esperados nuevos | ✅ |
| A12 | Cierre (§3 paso 7, versión M-7): `kill` del PID, `kill -0` falla, `rm -rf <SMOKE_DIR>`; sin `env.sh`: `stat`/`ls`; `git status --porcelain --untracked-files=all`; `git diff --exit-code -- contracts/Move.lock contracts/Published.toml`; por separado (m-1): `test ! -e contracts/deployments/localnet.json; echo "loc=$?"` y `! compgen -G 'contracts/Pub.*.toml'; echo "pub=$?"` | `stat`/`ls` idénticos a A0; árbol solo con el smoke (y el README si se corrigió); diff `exit=0`; `loc=0` y `pub=0` | `kill` del PID guardado (proceso `sui`); `kill -0` falla (`kill0=1`); el comando en segundo plano sale con 144 (esperado, H14). Sin procesos `sui`; puertos 9000/9123/9184/5173/4173 libres. `rm -rf <SMOKE_DIR>` y comprobado que no existe; `rm -f contracts/deployments/localnet.json` y `rmdir` (no existían: variante A). Sin `env.sh`: `client.yaml` 244 B, mtime `2026-10-30 17:52:52.515735237 -0500`, y `ls` = `client.yaml`, idénticos a A0. `git status --porcelain --untracked-files=all` = ` M contracts/README.md` (correcciones de A7/A8/A9/A10) y `?? documents/SMOKE_TESTNET_PUBLISH.md`. `git diff --exit-code -- contracts/Move.lock contracts/Published.toml` = 0; `loc=0`; `pub=0` | ✅ |

### Si algo falla

- Capturar el digest de la tx y la salida de `PRE suic tx-block <digest> --json`, sin pegar direcciones.
- Reportar el número de paso donde falló, con el output.

### Reporte final de la Parte A

- **Pasos PASA/TOTAL:** 13/13 (A0-A12).
- **Hallazgos (n° de paso + digest / output):**
  - A4/A5: el lock repineado no cambia en el dry run ni en la publicación (sin aviso; diff = 0). El json registra
    `frameworkRev` `05ad86a3…` y la CLI de `ci.yml`. El resumen nuevo de TASK-2 sale tal cual, y la salida del script
    no contiene la dirección de `ADMIN`. Publicación `C38TVJkwTdvKenjUbkyMkzMSUdpuch53c4dP4cFiAa6`.
  - A5: `sourceCommit` `null` con el árbol sucio (este documento sin trackear). Es el comportamiento de localnet
    (`publish.mjs:700`); en testnet el árbol limpio es una guarda.
  - A6-A10: todos los comandos y filtros `jq` del runbook corrieron contra la salida real de la CLI 1.83 y extrajeron
    el dato correcto. Ningún filtro tuvo que cambiar. Cuatro **valores esperados** del README no tenían la forma
    exacta de la CLI y se corrigieron:
    - paso 7: `fee_rate` `200.0`, `fees_collected` `"0"` y dueño `{"Shared": {"initial_shared_version": N}}`;
    - paso 8: `objType` con `0x0000…0002` largo;
    - paso 9: `fee_rate` `200.0`;
    - paso 10: `state` `{"@variant": "Cancelled"}`.

    A7, A8 y A10 se repitieron contra el README corregido. Digests: comisión
    `BPWSp8zvohq4j14XfH1SGiGnj76xgvsfEerxfjJpL8mn`, crear `HiPRPTncpA5hkLp8iCjroMnvcm1YrLH1fZ6eBneJbxUt`, cancelar
    `5VqgJB3VLuY2Np68dLk3FcGUHag2K7toVMzgDZARw2UA` (localnet efímera, ya borrada).
  - A11: el prefijo `${SUI_CONFIG_DIR:?…}` aborta antes de invocar nada (`exit=127`).
  - A12: cierre limpio con la regla M-7 por ruta.
- **Veredicto:** **PASA**. Se puede abrir G1.

## Parte B — Testnet: entrega del owner y verificación pública (TASK-5)

> Pendiente: se completa después de G3 (entrega del owner y commit de `deployments/testnet.json` + `Published.toml`).

### Precondiciones

- **Red:** testnet, `packageId` de `contracts/deployments/testnet.json`. Lecturas públicas por gRPC (`SuiGrpcClient`),
  sin claves ni `sui client`.
- **Cuentas:** la del owner, identificada como el `sender` de `publishTxDigest` (`S`, en memoria, nunca impresa).
- **Cliente:** sonda gRPC en `<scratchpad>`; app con `VITE_SUI_NETWORK=testnet` en `npm run preview -w app` + Chrome
  headless con perfil desechable.

### Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| B0 | Entrega del owner (runbook paso 11) | 2 archivos sin editar; 4 digests; custodia "sí" ×3; PV 140 + época del paso 2 | | ⏳ |
| B1 | Punto 1 de §3 de TASK-5 (archivos, `check`, `sourceCommit`, CI) | todo como en §3.1 de TASK-5 | | ⏳ |
| B2 | gRPC: chain id del servicio | `4c78adac` | | ⏳ |
| B3 | gRPC: `getTransaction(publishTxDigest)` | `success`; objetos creados: el paquete `packageId`, la House `houseId` (compartida), `houseCapId`, `upgradeCapId` y un `0x2::package::Publisher`; `S` = sender (no se imprime) | | ⏳ |
| B4 | gRPC: `getObject(houseId)` con `json` | dueño `Shared`; `fee_rate` 200, `min_bet` 1000000, `max_bet` 50000000000, `version` 1, `fees_collected` 0 (o el acumulado si ya hubo partidas aceptadas: anotarlo) | | ⏳ |
| B5 | gRPC: dueño de `houseCapId`, `upgradeCapId` y del `Publisher` | `AddressOwner == S` → `true` ×3 (la dirección no se imprime) | | ⏳ |
| B6 | gRPC: `getTransaction(<digest comisión>)` | `success`; sender `== S`; `FeeRateUpdated` `old_fee_rate` 0 → `new_fee_rate` 200; checkpoint > el de la publicación y < el de la creación | | ⏳ |
| B7 | gRPC: `getTransaction(<digest crear>)` + todos los `GameCreated` del paquete (`ListEvents` por tipo `<originalPackageId>::game::GameCreated`) | `success`; sender `== S`; `bet` 1000000, `fee_rate` 200, `opponent` none; todos los `GameCreated` con creador `== S` tienen `fee_rate` 200. **s-4:** una partida de otro creador con `fee_rate` ≠ 200 se anota (`game_id`, `fee_rate`) y **no** hace NO PASA; solo se imprime `creador == S` → `false` | | ⏳ |
| B8 | gRPC: `getTransaction(<digest cancelar>)` + `getObject(GAME)` | `success`; `GameCancelled` `refund` 1000000 y `cancelled_by == creator == S`; `Game` en `Cancelled` con `stake` 0; `balanceChanges` de `S`: crear = −(1000000 + gas neto), cancelar = +1000000 − gas neto | | ⏳ |
| B9 | Gates de §3.3 de TASK-5 | verdes, conteos anotados | | ⏳ |
| B10 | 🌐 §3.4 de TASK-5: `#/`, `#/game/<GAME>` | indicador "testnet · nodo OK"; lobby con el texto honesto de "sin partidas abiertas" (salvo que alguien haya creado una); detalle de `GAME` "Cancelada" con comisión 2 %; sin wallet de desarrollo; consola sin errores | | ⏳ |
| B11 | §3.5 de TASK-5: localnet aislada, variante B (`agents.md` §3 paso 4 (B)), `"$NODE" scripts/publish.mjs check` con la red arriba, cierre M-7 | publicación `exit=0`; `check` = `2 despliegue(s) válidos y coherentes con Published.toml`; `Published.toml` y `testnet.json` sin cambios; lock sin delta; cierre limpio (`localnet.json` borrado, `deployments/` sigue con `testnet.json`) | | ⏳ |

### Reporte final de la Parte B

- Pasos PASA/TOTAL:
- Hallazgos (n° de paso + digest / output):
- Veredicto:
