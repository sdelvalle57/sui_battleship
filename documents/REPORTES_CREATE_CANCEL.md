# REPORTES_CREATE_CANCEL
> Issue: #11 | Plan: PLAN_CREATE_CANCEL v1 | Handoff: HANDOFF_CREATE_CANCEL v1.1 | Branch: `feature/issue-11-create-cancel`

## Task completado: HANDOFF_CREATE_CANCEL — TASK-1 (fixtures reales de transacciones y sondas)

> Reporte del DEV transcrito por el orquestador (resumido; salidas clave literales; rutas con placeholders). El DEV partió de `0459e51` (v1); la v1.1 (`33cfd70`) no cambia TASK-1.

- **Archivos:** nuevos `app/scripts/localnet-guard.mjs` (exporta `LOCALNET_URL`, `assertLocalnetUrl`, `assertDeployment`; solo `node:process` en el nivel superior), `app/scripts/capture-tx-fixtures.mjs`, `contracts/fixtures/game-tx.localnet.json` (47 kB); modificados `app/scripts/capture-read-fixtures.mjs` (usa la guarda, +3/−20) y `contracts/README.md` (fila de la fixture y recaptura).
- **Script:** descubre partidas por eventos y el fallo ejecutado por el `previousTransaction` de `G_OPEN`; simula sin firmar (`setSender` + `build({ client })`) y exige el módulo/código esperado en cada caso. **Fixture:** `_meta`, `ids`, `house`, 7 `simulationErrors` (`sender` = rol), 5 `executed` (sin `sender` ni `signatures`), `cliErrorText`; determinista (dos corridas difieren solo en `capturedAt`).
- **Gates** (baseline = §0 y final iguales): `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Tests 375 passed (375)` en 29 archivos; build `index-AYrAkse-.js` 852.29 kB; Move build/lint 0, 83/83; `node --test` 99/99; `check` "0 despliegues"; `Move.lock` y `package*` sin delta. Greps: sin claves ni rutas personales; hex solo en la fixture nueva.
- **M-4:** ambos scripts con `--url https://fullnode.testnet.sui.io:443` ⇒ mensaje de la guarda y `exit=2` sin pedidos (trampa de `fetch`/`net.Socket.connect` con control positivo); fixture de #10 sin diff; grep de imports de red en la guarda vacío; `capture-read-fixtures` viejo vs nuevo iguales en stdout/`Error:`/exit en 3 casos.
- **Localnet aislada** (chain `90e16b92`, variante B): publicación, `update_fee_rate` 250, `G_OPEN` 1000001, `G_INV` 2000002 (invita a `B`), `G_CANCEL` 3000003 (cancelada), `G_REJ` 4000004 (rechazada por `B`), fallo ejecutado `B` cancela `G_OPEN` ⇒ `FailedTransaction` `game`/3 (`3gWJcLHx…`, checkpoint 654). Texto de la CLI: `Error executing transaction '…': 1st command aborted within function '0x<PKG>::game::cancel_game' at instruction 16 with code 3`; `effects.status.error` (= `cliErrorText`, igual al `description` gRPC): `MoveAbort(MoveLocation { module: ModuleId { address: <PKG>, name: Identifier("game") }, function: 1, instruction: 16, function_name: Some("cancel_game") }, 3) in command 0`.
- **Sondas:** **S-1** (CLI): `getTransaction` a 53–62 ms ya con `checkpoint`; `getObject` ya en la versión nueva (7/7); evento a 63–87 ms; un abort ejecutado sí sube la versión del objeto. **S-1 bis** (camino de la wallet, firma de la CLI con cuenta efímera dentro de `<SMOKE_DIR>` + `executeTransaction` gRPC): `executeTransaction` 141–163 ms con `checkpoint` `null`; `getTransaction` "not found" ×4 y luego (~440 ms) ya con `checkpoint`; **`getObject` ve la versión vieja justo después de ejecutar** (nueva a 229/335 ms); evento a 447 ms. **STOP: no.** **S-2:** `location.package` = `0x`+64 hex minúsculas = `originalPackageId` en los 3 caminos. **S-3:** `message` "Transaction resolution failed: MoveAbort in 2nd command, abort code: N, in '0x<PKG>::game::create_game' (instruction I)" (crear = 2nd; cancelar/rechazar = 1st); regex SDK reconoce los 7, regex Rust reconoce `cliErrorText`. **S-4:** `getBalance` con 3 strings; delta de crear = apuesta + cómputo + storage − rebate. **S-5:** `waitForTransaction` siempre con `checkpoint` (5–16 ms tras la CLI; ~603 ms tras `executeTransaction`).
- **Cierre:** procesos por PID, puertos libres, `<SMOKE_DIR>` borrado, sin `contracts/deployments/`, `~/.sui` idéntico, `Move.lock` sin delta.
- **Desviaciones:** (1) `rejectNotInvited` lo simula `ADMIN` (mismo `game`/5); (2) fixture con `ids`, `house` ampliado y `executed` sin `signatures`; (3) `cliErrorText` tomado del `description` gRPC; (4) S-1 bis extra (no entra en la fixture); (5) en `capture-read-fixtures` el chequeo de `network` va después de `getServiceInfo`; (6) fallo ejecutado descubierto por `previousTransaction` de `G_OPEN`; (7) montos de `G_CANCEL`/`G_REJ`; (8) S-1 del fallo medido tarde.
- **Riesgos para el MID:** **R-1:** la línea "Error executing transaction '…': … aborted within function '0x…::game::cancel_game' at instruction 16 with code 3" no la reconoce ninguna de las dos regex de DL-4 (¿tercera regex?). DL-5/DL-11: `waitForTransaction` ya devuelve con `checkpoint` (~0,6 s), los cortes 20/30/30 s sobran; justo tras ejecutar `getObject` da la versión vieja (confirma DL-5). Para TASK-2: `getTransaction` lanza "not found" mientras no está indexada; `waitForCheckpoint` debe tratarlo como intento fallido.

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador (resumida). No corrió localnet, `sui`, testnet ni gates.

Confirmado: M-4 (guarda solo `node:process`; fixture de #10 sin diff; `assertLocalnetUrl` primera instrucción en ambos scripts; exit 2 sin pedidos); fixture con `_meta`, `ids`, `house`, 7 `simulationErrors` (`sender` = rol), 5 `executed` sin `sender`/firmas, `cliErrorText`; determinista; `executionError` estructurado con `location.package`. Sondas S-2..S-5 y STOP contingente evaluados: no salta.

**Decisiones:**
> Decisión (2026-11-02): R-1 — no se agrega regex para el texto de presentación de la CLI (nunca llega a la app); un test negativo fija que cae en el fallback — MID.
> Decisión (2026-11-02): S-1 bis confirma DL-5; el "not found" es intento fallido de `waitForCheckpoint` y, si `confirmTransaction` trae `checkpoint`, se salta `indexing`; cortes 20/30/30 s sin cambios — MID.
> Decisión (2026-11-02): desviación 4 (firma con la CLI de una cuenta efímera de la génesis aislada) aceptada dentro de B4/D-20261102-03 con tres condiciones; permitida en futuros smokes solo en la localnet aislada con esas condiciones — MID.
> Decisión (2026-11-02): desviaciones 1–3 y 5–8 aceptadas (la 5: `network` después de `getServiceInfo`, consecuencia de la firma de `assertDeployment`) — MID.

| # | Regla | Archivo | Problema | Corrección |
|---|---|---|---|---|
| 1 | DL-4 | Handoff TASK-2 §5 | Faltaba test negativo de R-1 | v1.2 (`8c4cf4f`) |
| 2 | DL-5/DL-11 | Handoff TASK-2 §3.3 y TASK-4 | "not found" y `checkpoint` de `waitForTransaction` no explícitos | v1.2 |
| 3 | LIM-5 (menor) | `capture-*.mjs` (`sdkVersion`, `plain`) | Duplicadas en dos scripts | Sin acción; extraer a `fixture-utils.mjs` (solo `node:*`) si aparece un tercero |
| 4 | Info | S-1 bis | Evento vs checkpoint a ~447/440 ms | Sin cambio |

**Verificación del orquestador de las 3 condiciones de la desviación 4 (respuesta del DEV):** (1) **sí**: las dos firmas con `suic … --serialize-signed-transaction` bajo `env.sh` + `ids.env` + `smoke_guard` (`SUI_CONFIG_DIR = <SMOKE_DIR>/net`), `exit=0`; (2) **no**: ningún proceso de Node leyó `<SMOKE_DIR>/net` (los scripts de sonda leyeron solo `signed-*.txt` = `SenderSignedData`, salidas `--json` de la CLI y la fixture; `publish.mjs` solo comprueba `existsSync` de `client.yaml`); (3) **no**: keystore y `client.yaml` nunca abiertos; `signed-*.txt` borrados con `<SMOKE_DIR>`; `<scratchpad>` sin firmas ni claves. **Condiciones cumplidas.**
