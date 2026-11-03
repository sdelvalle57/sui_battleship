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

## Task completado: HANDOFF_CREATE_CANCEL (v1.2) — TASK-2 (maquinaria pura de transacciones)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales).

- Branch @ `4d7523f`, sin commits. Nuevos (sin modificar nada existente): `app/src/sui/transactions/game.ts` (15 tests), `sui/errors.ts` (49), `sui/execution.ts` (20), `sui/gameTx.ts` (7).
- **Builders** crear/cancelar/rechazar con la forma de V-11 (`SplitCoins{GasCoin}` → `MoveCall`, `NestedResult [0,0]`; `Pure` `u64` y `Option<address>` normalizada; House/`Game` como `UnresolvedObject`); lanzan con ID/`opponent`/`bet` inválidos; sin `sender` ni gas.
- **`errors.ts`:** `findMoveAbort` (fuentes estructuradas `ExecutionError`/`SimulationError.executionError`/`ExecutionStatus`/resultado del nodo, texto con regex SDK y Rust, `cause` hasta 5 niveles); `transactionErrorMessage` traduce solo si el paquete es `packageId`/`originalPackageId`. Tests: todos los códigos `game` 0–10 y `house` 0–4 con texto exacto; 7 `SimulationError` reales (estructurados y por mensaje); fallo ejecutado real (gRPC y `extractStatusFromEffectsBcs`); `cause` 5 sí / 6 no; paquete corto/mayúsculas; `game`/99 crudo; otro paquete sin traducir; `Unknown`/`CongestedObjects` ⇒ "La red no ejecutó…"; **M-5** `abortCodeSuffix` = `'(código game/3)'` y mensaje completo exacto; **R-1 negativo** ⇒ `null` + fallback; `cliErrorText` ⇒ `game`/3.
- **`execution.ts`:** preflight sobre copia (`sender` solo en la copia; `SimulationError` misma instancia); `UNAVAILABLE`/corte 20 s ⇒ `PreflightNetworkError` (M-3 a); no transitorio se relanza; `confirmTransaction` (`include`, `timeout: 30_000`); `waitForCheckpoint` (2.º intento, tras `UNAVAILABLE`, **`notFound` ×3 ⇒ `true`**, tope ⇒ `false`, `signal`); `classifyExecution` con `executed` reales; `digestFromError`; `networkCost` (`createOpen` = 3941200n, puede ser negativo).
- **`gameTx.ts`:** `parseCreatedGame` (único `GameCreated` del firmante; `null` sin eventos, con dos, otro paquete, otro creador, bytes no canónicos); `cancelledRefund` (3000003n / 4000004n; `null` en los casos ajenos).
- **Gates:** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 33 passed (33)` / `Tests 466 passed (466)`; build sin cambios (`index-AYrAkse-.js` 852.29 kB); `contracts`/`package*` sin delta. Greps de claves, rutas, hex, `console`, `any`: vacíos.
- **Desviaciones:** (1) `findMoveAbort` mira también `ExecutionStatus.error` y `FailedTransaction.status.error`; (2) `abortCodeSuffix(MoveAbortInfo)`; (3) la preflight corta la espera, no el pedido (`build()` 2.37 sin `signal`); (4) exporta `NodeTransactionResult`; (5) `waitForCheckpoint` con tope total real (`AbortController` de `TX_INDEX_TIMEOUT_MS`).
- **Riesgo menor:** un error de wallet que sea objeto plano sin `message` se mostraría como `[object Object]`.

## Revisión TASK-2: PASA (con corrección corta aplicada por el DEV antes del commit)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: builders = `game.move:88-149` (target con `packageId`, sin `sender` ni gas, validación de entradas); `ABORT_MESSAGES` `game` 0–10 y `house` 0–4 literales, traducidos solo para nuestro paquete; tres fuentes de DL-4 con los 7 `SimulationError` reales, el fallo ejecutado real y `cliErrorText`; M-5 y R-1 con test; M-3 (a) (`PreflightNetworkError` con `cause`, `SimulationError` misma instancia, preflight sobre copia); "not found" como intento fallido con tope total; ningún éxito falso (`classifyExecution` solo por el nodo; `parseCreatedGame` exige un único `GameCreated` del firmante; `cancelledRefund` del evento; `networkCost` puede ser negativo). Desviaciones 1–5 aceptadas (la 3: `build()` 2.37 sin `signal`, la preflight corta la espera; la simulación sigue en segundo plano, solo lectura, sin *unhandled rejection*).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | SEG-10 | `errors.ts:186` | Fallback `String(source)` ⇒ `[object Object]`/`undefined` | Aplicada por el DEV: "La wallet no completó la operación (sin detalle del error)" + tests (`{ code: 4001 }`, `undefined`, `Error('')`, `Error('User rejected')`); gate 467 tests en 33 archivos |
| 2 | Honestidad (TASK-4) | Handoff TASK-4, etapa `preflight` | Un error de preflight que no es simulación ni red caería en "La wallet no completó…" sin haber abierto la wallet | Handoff v1.3 (`3524696`, aplicada por el orquestador): "No se pudo preparar la transacción: …" con test |
| 3 | Info | `execution.ts:300-317` | Simulación cortada puede seguir en segundo plano | Aceptado; nota en TASK-6 (v1.3) |

### Siguiente paso
TASK-3 arranca; TASK-4 con la v1.3.

## Task completado: HANDOFF_CREATE_CANCEL (v1.3) — TASK-3 (House, saldo, validación del formulario y predicados)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales).

- Branch @ `0de62f4`, sin commits. Nuevos: `sui/house.ts` (13 tests), `sui/account.ts` (2), `sui/createGame.ts` (23), `sui/gameActions.ts` (11). Extendidos: `sui/ids.ts` (+`parseAddressInput`, helper común; 23 tests, +12) y `sui/gameDetail.ts` (+`gameRefetchInterval`; 13, +5).
- `house.ts`: parser exacto (tipo, `Shared`, BCS canónico, `0 < min_bet <= max_bet`; `fee_rate` no se valida) + lectura con corte de 10 s. `account.ts`: `fetchSuiBalance` (`bigint`). `createGame.ts`: `CREATE_GAS_RESERVE_MIST` 10 000 000, `GAME_STORAGE_DEPOSIT_MIST` 1 953 200 / 2 196 400, `validateCreateGame` (motivos tipados + `balanceUnknown`), `houseTermsChanges`/`houseChangeMessage` (M-2). `gameActions.ts`: `canCancel`/`canReject`. `gameRefetchInterval` (DL-7).
- **Tests:** House real de la fixture y malformados/tipo/dueño/invariantes; `min == max` y `fee_rate` 1001 parsean; `fetchHouse` relanza `ObjectError` no transitorio; saldo con corte; validación (vacío, inválido, decimales, límites inclusive, por encima de u64, saldo justo vs uno menos, saldo `null` ⇒ `balanceUnknown`, invitación vacía/recortada/normalizada/inválida, `self_invite` en mayúsculas, errores combinados); textos de cambio de la House; `canCancel`/`canReject` en todos los estados y formatos; `parseAddressInput` (10 casos, `parseObjectIdInput` sin cambios); `gameRefetchInterval` (éxito/`UNAVAILABLE` ⇒ 15 000; errores definitivos ⇒ `false`).
- **Gates:** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 37 passed (37)` / `Tests 532 passed (532)`; build `index-BXteCMr-.js` 852.31 kB; `contracts`/`package*` sin delta. Greps de claves, rutas, hex, `console`, `any`: vacíos.
- **Desviaciones:** (1) con cambio de comisión y límites a la vez, dos frases y un solo "revisa y vuelve a confirmar"; (2) el monto no se recorta (contrato de `parseSuiToMist`); (3) `balanceUnknown` también con `ok: true`; (4) tipos exportados adicionales.

## Revisión TASK-3: PASA

> Revisión del MID transcrita por el orquestador (resumida). Contrastó con `house.move:28-39`, la fixture y `sui-types.mjs:104-111`; no corrió gates.

Confirmado: BCS de la House = `house.move` (orden de campos; tipo exacto; `Shared`; canónico; `min_bet > 0` y `≤ max_bet`; sin tope de `fee_rate`); límites siempre de la House (inclusive); reserva de gas 0,01 SUI ≈ 2,5× el costo real de crear (3 941 200 MIST) y depósitos de storage = `contracts/README.md:380` y la fixture; `parseObjectIdInput` sin cambio de comportamiento (`normalizeSuiObjectId` = `normalizeSuiAddress`); M-2 con texto exacto; `canCancel`/`canReject` (D-20261102-05) como cortesía de UI; DL-7 cierra el pendiente de #10. Desviaciones 1–4 aceptadas. Sin hallazgos.

### Recordatorios
**TASK-4:** `useGame` con `refetchInterval: (q) => gameRefetchInterval(q.state)` + test; M-2 en el `precheck` (relee la House, frena con `houseChangeMessage`, invalida `house`, sin wallet; error transitorio ⇒ `PREFLIGHT_NETWORK_MESSAGE`); v1.3 ("No se pudo preparar la transacción: …"); M-1 candado síncrono; `indexing` se salta con `checkpoint`. **TASK-5:** texto de monto `invalid` que mencione sin espacios ni separador de miles; aviso visible con `balanceUnknown` aunque el formulario sea válido.

## Task completado: HANDOFF_CREATE_CANCEL (v1.3) — TASK-4 (hooks de transacción y lectura)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales).

- Branch @ `053e2a5`, sin commits. En `app/src/hooks/`: `queryKeys.ts` (+`house`, `balance`), nuevos `txInvalidation.ts` (7 tests), `useExecuteTransaction.ts` (24), `useCreateGame.ts` (5), `useCancelGame.ts` + `useRejectGame.ts` (2), `useHouse.ts` + `useSuiBalance.ts` (5); `useGame.ts` con `refetchInterval: (q) => gameRefetchInterval(q.state)` (+2, ahora 10).
- `useExecuteTransaction`: candado síncrono (M-1) → `precheck` (M-2) → preflight → firma → confirmación por el nodo → indexación (se salta `waitForCheckpoint` con `checkpoint`) → invalidación; todo en la `mutationFn`, sin `useEffect`, nunca lanza al componente.
- **Recordatorios cumplidos con test:** (1) DL-7: tras `GameNotFoundError` no vuelve a pedir (el test falla con el intervalo fijo); (2) M-2: cambio de House ⇒ `failure` con `houseChangeMessage`, invalida `house`, sin preflight ni wallet; `UNAVAILABLE` ⇒ `PREFLIGHT_NETWORK_MESSAGE`; `feeChanged` tras el éxito; (3) v1.3: "No se pudo preparar la transacción: …" sin abrir la wallet; (4) M-1: dos `execute` en el mismo tick ⇒ una preflight y una wallet (el test falla sin el candado); (5) M-3 (b)/NIT-1: wallet con digest ⇒ `success` o `unconfirmed` según el nodo; confirmación vencida ⇒ `unconfirmed`; nodo `success: false` ⇒ `failure` "Solo quien creó la partida puede cancelarla. (código game/3)" con digest y `cost` 1000294n; `interpret` falla tras éxito ⇒ `success` con `value: null`; (6) indexing según `checkpoint`; abort en preflight también invalida.
- **Otros:** etapas `preflight → signing → confirming → indexing → done`; invalidaciones exactas por acción (nunca `nodeInfo`/`txInfo`/`publishCheckpoint`/`checkpointTime`/`house`); sin cuenta ⇒ "Conecta tu wallet"; M-3 (a) sin `transactionErrorMessage`; rechazo sin digest; desmontaje durante `confirming` invalida igual; `reset`; a la wallet va el `Transaction` sin construir; hooks finos con resultados de la fixture.
- **Gates:** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 42 passed (42)` / `Tests 577 passed (577)`; build `index-Bhx-WgPL.js` 852.46 kB; `contracts`, `sui/`, `components/`, `pages/`, `providers/`, `package*` sin delta. Greps (claves, rutas, hex, `console`/`any`, `useEffect`; `useDAppKit` fuera de `hooks/`): vacíos.
- **Desviaciones:** (1) la etapa `indexing` siempre se marca (ahí corren las invalidaciones; se salta solo `waitForCheckpoint`); (2) errores no transitorios del `precheck` ⇒ "No se pudo preparar…"; (3) `isBusy` con `useState` espejo del candado `useRef`; (4) red de seguridad en la `mutationFn` (`unconfirmed` con digest, `failure` sin él); (5) exports adicionales.
- **Riesgos:** `done` espera la relectura del lobby si está montado (lento en red lenta); cortes 20/30/30 s cubiertos en TASK-2, no en hooks.

## Revisión TASK-4: NO PASA (corrección corta)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: SEG-10 en el camino normal (`useExecuteTransaction.ts:91-184`); M-1 síncrono (`:203-207`); DL-6 exacto; M-2; M-3 (a); v1.3; indexación; DL-7; `retry: false`; sin `useEffect`. Desviaciones 1–3 y 5 aceptadas (la 3, `useState` espejo, es necesaria para deshabilitar el botón). Riesgo de `done` tras la relectura del lobby aceptado con condiciones (TASK-5 muestra "Actualizando…"; el smoke mide `confirming`→`done`; si en testnet supera ~3 s, invalidar sin esperar).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | **SEG-10 / M-3 (b)** | `useExecuteTransaction.ts:186-199` | La red de seguridad toma el digest solo del error: si algo lanza después de obtener el digest de la wallet (p. ej. respuesta del nodo mal formada ⇒ `TypeError` en `:158-159`), da `failure` sin digest sobre una tx ya ejecutada (invita a reintentar) | Guardar el digest conocido en un `progress` fuera de `run` y usarlo en la red de seguridad (⇒ `unconfirmed` + invalidación); test: wallet con digest + `confirmTransaction` resuelve `{}` ⇒ `unconfirmed` con ese digest, invalida igual; debe fallar con el código actual |

### Re-revisión del hallazgo 1 de TASK-4: PASA

> Corrección del DEV con el texto literal del MID (`useExecuteTransaction.ts:93`, `:106`, `:154`, `:194-209`); test nuevo (`:356-362`) falla antes (`failure`, `digest: null`, `1 failed | 24 passed (25)`) y pasa después; gate 578 tests en 42 archivos, build sin cambios. **TASK-4 PASA.**

### Recordatorios para TASK-5
1. **Etapas visibles:** preflight "Verificando…", signing "Confirma en tu wallet", confirming "Esperando a la red…", indexing "Actualizando…". Con `isBusy`, enviar/cancelar/rechazar deshabilitados.
2. **`TransactionStatus` (DL-12):** `success` con digest, link al explorador (solo testnet) y costo de red; si `indexed: false`, "La lista puede tardar unos segundos en mostrarlo"; `unconfirmed`: "No se pudo confirmar…" con el digest, **sin** "Reintentar"; `failure`: mensaje, y digest y costo si los hay.
3. **Crear (DL-14, DL-9, M-2):** con `value.created`, navegar al detalle con el aviso en el `state` del router (si es invitación, texto para compartir); con `value === null` o `created === null`, "Partida creada" con el digest, sin navegar; con `feeChanged`, aviso de la comisión guardada.
4. **Formulario:** límites y comisión de `useHouse`; texto de `invalid` del monto que diga que no lleva espacios ni separador de miles; aviso con `balanceUnknown` aunque sea válido; nota de costo (DL-13) con `GAME_STORAGE_DEPOSIT_MIST` y la reserva de gas.
5. **Detalle:** "Cancelar" con `canCancel` y "Rechazar" con `canReject` (D-20261102-05); reembolso del `value` (si `null`, sin monto); tras la acción el detalle ya está refrescado.
6. **Capas:** `useDAppKit` solo en `hooks/`; los componentes usan `useCreateGame`/`useCancelGame`/`useRejectGame`.
7. **Sin cuenta:** formulario y botones dicen "Conecta tu wallet" antes de intentar nada.

## Task completado: HANDOFF_CREATE_CANCEL (v1.3) — TASK-5 (formulario, botones y estado de transacción)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales).

- Branch @ `2a85fd7`, sin commits. Nuevos: `components/TransactionStatus.tsx` (12 tests), `CreateGameForm.tsx` (22), `GameActions.tsx` (11), `createdNotice.ts`; `pages/HomePage.test.tsx` (1). Modificados: `HomePage.tsx`, `GameDetailPage.tsx` (+ test, 9, +4), `index.css` (solo `.field-error` con modo oscuro). Sin cambios en `sui/`, `hooks/`, `App`, `Header`, `LobbyList`.
- `TransactionStatus`: etapas (`role="status"`); `success` con digest (link en testnet), "Costo de red" y nota de `indexed: false`; `unconfirmed` (`role="alert"`) con digest y **sin botones**; `failure` con mensaje y, si se ejecutó, digest y costo. `CreateGameForm`: sin cuenta deshabilitado y sin lecturas; con cuenta `useHouse`/`useSuiBalance`/`useCreateGame`, límites, comisión, saldo, estimación (`resolutionAmounts`), nota de costo, errores por campo, `shown` para M-2, navegación con `<Navigate>` o "Partida creada" con digest. `GameActions`: "Cancelar" (`canCancel`) y "Rechazar" (`canReject`), deshabilitados con `isBusy`, reembolso del `value`. Detalle: aviso "Partida creada" con costo y depósito, texto de compartir (invitación) y aviso de comisión cambiada.
- **Recordatorios 1–7 cumplidos con test** (textos de etapas del handoff; `unconfirmed` sin botón; navegación con `createMemoryRouter` real; monto `invalid` "solo números y punto decimal, sin espacios ni separador de miles"; aviso `balanceUnknown` enviable; nota con `GAME_STORAGE_DEPOSIT_MIST` y reserva; botones exclusivos por rol; capas; "Conecta tu wallet…").
- **Gates:** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 46 passed (46)` / `Tests 628 passed (628)`; build `index-C8aQxFL4.js` **877.72 kB** (267 kB gzip; entra el SDK de transacciones, R-11 → #15); sin delta fuera de lo listado. Greps de claves/rutas/hex vacíos; sin `@mysten/*` (salvo `ui`), `dangerouslySetInnerHTML`, `useEffect` ni `console` en `components/`/`pages/`.
- **Desviaciones:** (1) **bug de react-router con `bigint` en el `state`** (`JSON.stringify` en `history.js` del router por hash) esquivado: el costo viaja como `costMist: string` y `readCreatedNotice` lo convierte; test con router real; (2) textos del handoff v1.3 para etapas y `unconfirmed` ("La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar"); (3) pista sin cuenta en el detalle para partidas pendientes; (4) costo de red en todo `success`; (5) `createdNotice.ts` compartido.
- **Riesgos:** `aria-live` y aspecto en el smoke; el monto no se recorta (el texto lo explica).

## Revisión TASK-5: NO PASA (corrección corta)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: textos honestos (DL-12, SEG-10); límites y comisión de la House (`shown` para M-2); formulario (errores por campo, `balanceUnknown`, nota de depósito, sin cuenta sin lecturas); `GameActions` (D-20261102-05); aviso de creación; capas. Desviaciones 1–5 aceptadas (la 1, costo como string en el `state` del router, es correcta y `readCreatedNotice` es defensivo). Bundle 878 kB aceptado (#15).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | **SEG-10 / M-3 (b)** | `CreateGameForm.tsx:96-103, 147-149` | Tras `unconfirmed`, "Crear partida" sigue habilitado = un "Reintentar" que puede crear otra partida | `pendingReview` bloquea `onSubmit` y el botón; botón "Ya la revisé: crear otra partida" que llama a `reset`; test |
| 2 | Robustez (menor) | `createdNotice.ts:97-101, 131` | (a) `digest` sin validar base58; (b) comentario "desaparece al recargar" inexacto | Regex base58 en el `if` + test; comentario "vive en esa entrada del historial (también tras recargar), no en la URL" |
| 3 | Info | `CreateGameForm.tsx:157-162` | Aviso de `feeChanged` sin navegar inalcanzable | Sin acción (defensivo) |

### Lista consolidada para TASK-6
**`app/README.md`:** (1) mapa de `sui/` (`transactions/game.ts`, `errors.ts`, `execution.ts`, `gameTx.ts`, `house.ts`, `account.ts`, `createGame.ts`, `gameActions.ts`; `ids.ts` + `parseAddressInput`; `gameDetail.ts` + `gameRefetchInterval`); (2) hooks (`useExecuteTransaction`, `useCreateGame`, `useCancelGame`, `useRejectGame`, `useHouse`, `useSuiBalance`; claves `house`/`balance`; `txInvalidation.ts`) y componentes (`TransactionStatus`, `CreateGameForm`, `GameActions`, `createdNotice.ts`); (3) sección "Transacciones (#11)": relectura de la House (M-2), preflight sobre copia sin abrir la wallet, a la wallet el `Transaction` sin construir, **el nodo como única fuente de éxito/fallo** (DL-2), "sin confirmar" con digest nunca `failure` (M-3 b) y formulario bloqueado hasta revisarla, indexación (S-1 bis, "not found" como intento fallido), tabla DL-6, cortes 20/30/30 s como topes, candado síncrono (M-1), `done` tras la relectura; (4) mensajes de abort: tabla por módulo + código y sufijo `(código <módulo>/<n>)` (M-5); fallbacks (otro paquete crudo, "La red no ejecutó…", "La wallet no completó…"/"(sin detalle del error)", "No se pudo preparar la transacción: …", "No se pudo verificar la transacción (red)…"); solo formatos SDK y Rust, no la presentación de la CLI (R-1); (5) reglas del formulario (límites inclusive de la House, reserva 0,01 SUI, saldo desconocido no bloquea, monto sin recortar, invitación recortada y normalizada, sin auto-invitación, depósito 1 953 200 / 2 196 400 MIST no recuperable, `feeChanged`); (6) wallet: burner sin fondos y nueva dirección al recargar; fondeo por CLI en la localnet aislada bajo `PRE`; (7) dependencias: `build()` 2.37 sin `signal`; al subir `@mysten/*` revisar también `ExecutionError.$kind`; (8) pendientes: quitar los resueltos (DL-7, refresco tras tx), sumar 878 kB → #15 y, si aplica, latencia de `done` → #12/#17.
**`contracts/README.md`:** "Abort codes" espejo en `app/src/sui/errors.ts`; "Objeto terminal y storage" mostrado al crear; fixture `game-tx.localnet.json` (`cliErrorText` = texto Rust del nodo).
**`agents.md`:** §5 fila "Layout BCS de la House" ↔ `house.ts` + fixture y fila "Abort codes" ↔ `app/src/sui/errors.ts` (ruta completa); §2 `localnet-guard.mjs` y `capture-tx-fixtures.mjs`; §3 técnica de firmar como cuenta de la génesis solo en la localnet aislada con las 3 condiciones.
**`STATUS.md`:** baseline app (~629/46 por archivo, 878 kB), contratos 83 / 99; fila #11 🚧 TASK-1..5; D-20261102-05; pendientes de #10 resueltos; #35 abierto.
**Cierre:** sin rutas personales; números = reportes; `grep -n "#11/#12\|quedan para #11" app/README.md` sin pendientes ya resueltos. Después: `SMOKE_CREATE_CANCEL.md` (latencia `confirming` → `done`; bloqueo tras `unconfirmed` si se puede provocar).

### Re-revisión de los hallazgos 1 y 2 de TASK-5: PASA

> Correcciones del DEV: `pendingReview` en `CreateGameForm.tsx:86`, `:104`, `:149` y botón "Ya la revisé: crear otra partida" (`:166-168`) → `tx.reset`; regex base58 en `createdNotice.ts:38` y comentario corregido (`:3`). Tests nuevos (`CreateGameForm.test.tsx:233`, `GameDetailPage.test.tsx:114`) fallan antes (`2 failed | 31 passed (33)`; el digest inválido rompía el render del detalle) y pasan después; gate 630 tests en 46 archivos, build 877.90 kB. **TASK-5 PASA.** TASK-6 autorizada con la lista consolidada; baseline STATUS = 630/46, 878 kB.

## Task completado: HANDOFF_CREATE_CANCEL (v1.3) — TASK-6 (docs del ciclo)

> Reporte del DEV transcrito por el orquestador (resumido).

- Branch @ `7894b43`, sin commits; sin código (bundle con el mismo hash que TASK-5). `agents.md` +14, `app/README.md` +170, `contracts/README.md` +27, `documents/STATUS.md` +12 (187+/36−).
- `app/README.md`: los 8 puntos (mapa de `sui/` y scripts; hooks y tabla de componentes de transacción; sección "Transacciones (#11)" con etapas, nodo como única fuente, "sin confirmar" y bloqueo, indexación con latencias medidas, cortes como topes, M-1, DL-6, `done`; abort codes con sufijo y 6 fallbacks, R-1; formulario; wallet y fondeo bajo `PRE`; dependencias con la nota v1.3; pendientes actualizados). `contracts/README.md`: abort codes espejo en `errors.ts`, storage mostrado en la UI, PTB en `transactions/game.ts`, `cliErrorText` = texto Rust del nodo. `agents.md` §2 (fixture y scripts), §3 paso 6 (firma como cuenta de la génesis con las 3 condiciones), §5 (abort codes con ruta completa; layout BCS de la House). `STATUS.md`: baseline 630/46 por archivo, 878 kB; contratos 83 / 99 / 0 despliegues; fila #11 🚧; D-20261102-05; #35.
- **Gates:** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Tests 630 passed (630)` en 46 archivos; build `index-Dg-GHDX5.js` 877.90 kB; `node --test` 99/99; `check` "0 despliegues"; `Move.lock` sin delta. Cierre: `grep "#11/#12\|quedan para #11"` vacío; sin #11 en futuro; greps de claves/rutas/hex vacíos.
- Desviaciones: (1) 630 en STATUS (medido); (2) archivos de test que cubren dos hooks, aclarado; (3) `sui move` no re-corrido (sin cambios de Move; valores de TASK-1).

## Revisión TASK-6: PASA + revisión del runbook del smoke: OK con 3 ajustes (aplicados por el orquestador)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

TASK-6: los 8 puntos de `app/README.md`, `contracts/README.md`, `agents.md` §2/§3/§5 y `STATUS.md` confirmados; criterio de cierre cumplido; números = reportes; desviaciones 1–3 aceptadas; sin hallazgos.

Runbook `SMOKE_CREATE_CANCEL.md`: cubre los criterios del issue y D-20261102-05 (pasos 8, 10, 11, 12, 13, 14, 15, 16, 17, 18); textos y montos = código (`TransactionStatus`, `CreateGameForm`, `GameActions`, `houseChangeMessage`, `ABORT_MESSAGES`); firmas de `update_fee_rate`/`update_bet_limits` = `house.move:98-108`; reglas OK; latencia con `MutationObserver`; paso 17 con ventana real; **paso 18 (`Fetch.failRequest` sobre `GetTransaction`) aceptable**: provoca el caso real (ejecución sin confirmación) solo en el navegador desechable, y la CLI demuestra después que sí se ejecutó. Ajustes aplicados: (1) paso 12, si el 2.º click encuentra el botón ya deshabilitado se anota; (2) paso 13, reconexión del kit con la sesión de `T1`; (3) paso 18, horas del lobby en "—" con `Fetch` activo no son falla.

### Siguiente paso
Smoke autorizado. Pendientes para el body del PR: #12 (aceptar en DL-6 y `ABORT_MESSAGES`), #14 (House en la invalidación), #15 (878 kB), #17 (wallet de extensión, R-1, latencia de `done` en testnet), #8, #35.
