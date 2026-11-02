# REPORTES_LOBBY
> Issue: #10 | Plan: PLAN_LOBBY v1.1 | Handoff: HANDOFF_LOBBY v1.2 | Branch: `feature/issue-10-lobby`

## Task completado: HANDOFF_LOBBY (v1.2) — TASK-1 (fixtures reales de lectura gRPC y sondas P1–P7)

> Reporte del DEV transcrito por el orquestador (resumido; tablas de sondas y salidas clave literales; rutas con placeholders).

- Branch @ `c344d98` (el HEAD pasó de `2a6be71` a `c344d98` durante la sesión: v1.2 solo toca TASK-3/4). Sin commits. Creados: `app/scripts/capture-read-fixtures.mjs`, `contracts/fixtures/game-reads.localnet.json` (19 541 bytes). Modificado: `contracts/README.md` (+39/−12: "Lectura desde la app" y fila en la tabla de rutas).
- **STOP contingente: no salta** (causas 1–3). **Hallazgo de diseño:** en el fullnode público, el envoltorio `client.listEvents` (sin rango) falla con `OUT_OF_RANGE` ("requested data below earliest available"); solo sirve el crudo `ledgerService.listEvents` con `startCheckpoint` ≥ piso (H-1/M-4). El filtro `eventType` exige direcciones completas.
- **Gates (antes y después, iguales):** Node v26.13.0 / npm 11.20.0 / sui 1.83.0; `npm ci` 0; firmas 292 OK; audit prod 0; lint 0; typecheck 0; `Tests 142 passed (142)`; build 0 (826.07 kB); Move build/lint 0, `83 passed`; `node --test` **99/99** (Desviación 1: +5 de #39); `check` "0 despliegues"; `git diff --exit-code` de `Move.lock`, `package*.json`, `eslint.config.js` → 0. Lint del script 0 errores.
- **Localnet aislada** (chain `1f1f882e`; cuentas de génesis en `ids.env`, no se pegan): publicación variante B (`BoD3Cg79…`, checkpoint 59); `update_fee_rate` 250; partidas `G_OPEN`, `G_INVITE`, `G_CANCEL` (cancelada), `G_REJECT` (rechazada por `B`), `G_RES` (aceptada por `B`: `pot` 2000010 = `payout` 1950010 + `fee` 50000, ganó `B`); P6: `cancel_game` sobre `G_RES` → `MoveAbort` 4; P1: PTB con 60 `create_game`.
- **Guarda de URL:** con `fetch` trampa, `--url https://fullnode.testnet.sui.io:443` → mensaje "solo se captura desde la localnet aislada (http://127.0.0.1:9000)… No se hizo ningún pedido." `exit=2`.
- **Captura:** dos corridas, `diff` sin `capturedAt` → 0. Fixture: `_meta`, 5 objetos (`Shared`, tipo `<orig>::game::Game`, BCS base64), 5 eventos (`bcs` + `json`, sin `sender`), `transactions` (`gameCreatedOpen` cp 204, `publish` cp 59), `rawListEventsPage` (3 frames, último `ITEM_LIMIT`).
- **P1:** 50 + 15 = 65 únicos (5 + 60), sin duplicados, igual a la CLI. **P2/P4:** las 5 variantes re-serializan igual, `json` = BCS; bytes sobrantes no lanzan (re-serializa ≠ ⇒ DL-1 compara bytes); variante 3 lanza "Unknown value 3 for enum GameState"; eventos `pot = payout + fee`. **P3:** 6/6 `timestampMs`/`checkpoint` iguales a `tx-block`. **P6:** una tx fallida **sí** cambia `previousTransaction` (versión 108 → 109) ⇒ "Última actividad" correcta. **P7 localnet:** piso 0; 50 (`ITEM_LIMIT`) + 15 (`CHECKPOINT_BOUND`, watermark 59); `getCheckpoint` 59 con `sequence_number` y `summary.timestamp` = hora de la publicación.
- **P5/P7 testnet** (lectura pública, Node + `SuiGrpcClient`, sin claves, código en `<scratchpad>`; 21/40 pedidos, un único `limit` 1000):
  - `SystemEpochInfoEvent` (dirección completa) crudo desc `limit` 50 desde piso + 20000: 14 eventos, `CHECKPOINT_BOUND`, **1 pedido cubre 5 464 571 checkpoints ≈ 348 h (~14 épocas)**; 4,36 checkpoints/s; época ≈ 381 368 checkpoints ≈ 24,3 h.
  - `limit` 1000 sin filtro → 1000 eventos, `ITEM_LIMIT` ⇒ tope ≥ 1000.
  - Piso `lowestAvailableCheckpoint` ≈ 396 603 024; punta − piso ≈ 349,5 h ≈ **14,6 días**; el piso avanza parejo (~4 cp/s).
  - Poda: crudo con `startCheckpoint` < piso → **`OUT_OF_RANGE`** inmediato (0 frames, mensaje cita `tx_seq`); `getCheckpoint` < piso → `NOT_FOUND`; `getTransaction` podada → "Transaction … not found" (`TransactionError` `notFound`).
  - Paginación con `before` y `limit` 5: 5/5/4, `ITEM_LIMIT` ×2 + `CHECKPOINT_BOUND`, sin duplicados, el cursor siempre avanza.
- **Calibración propuesta:** `LOBBY_EVENTS_PER_REQUEST` 50; `LOBBY_MAX_REQUESTS_PER_PAGE` **2**; `LOBBY_PAGE_TARGET` 20; `LOBBY_FLOOR_MARGIN_CHECKPOINTS` **16 000** (≈ 1 h).
- **Cierre:** `sui` por PID (exit 144 esperado), puertos libres, sin `contracts/deployments/`, `<SMOKE_DIR>` borrado, `~/.sui` idéntico (`2026-10-30 17:52:52.515735237 -0500 244`), `Move.lock` sin delta.
- **Desviaciones:** (1) baseline 99 vs 94 (explicado por #39; siguió sin parar); (2) P5 (i)/(ii) unificadas en el crudo; (3) 4 pedidos sin resultado contados; (4) `limit` 1000 sin filtro; (5) P1 = 65; (6) P7 (ii) podado por deducción; (7) script: guarda como primera instrucción, `suiCliVersion` del JSON, variantes deterministas; (8) P6 antes de la captura (a propósito).
- **Riesgos:** toda lista usa el crudo con `startCheckpoint`; la poda se detecta por `OUT_OF_RANGE`. Hex de 40-64 solo en la fixture (70 líneas, IDs y direcciones efímeras de la génesis, sin claves); sin claves ni rutas personales.

## Revisión TASK-1: PASA (con 3 correcciones de una línea, aplicadas por el orquestador)

> Revisión del MID transcrita por el orquestador (resumida). No corrió localnet, `sui`, testnet ni gates; verificó historial con `git` y la fixture con lecturas locales.

Confirmado: guarda de URL antes de cargar el SDK (`:10-32`), exit 2 con cualquier otra URL; chequeo de `network` y chain id (`:70-81`); sin `console`, lint 0. Fixture con `_meta`, 5 variantes `Shared`, 5 eventos, `transactions`, `rawListEventsPage`; **`sender` 0 apariciones**; determinista. Sondas P1–P7 respondidas; M-3 respetado (21/40, un `limit` 1000). STOP contingente: no. Gates iguales antes/después; cierre limpio.

**Decisiones:**
> Decisión (2026-11-02): la desviación 1 (`node --test` 99 en vez de 94) se acepta: el §0 del handoff citaba `dfb11ce` y la base real es `bee80e5` (+#39, solo scripts/README/STATUS, nada de `app/`) — error del MID; §0 pasa a `bee80e5`/99 en la v1.3 — MID.
> Decisión (2026-11-02): calibración del lobby `LOBBY_EVENTS_PER_REQUEST` 50, `LOBBY_MAX_REQUESTS_PER_PAGE` 2, `LOBBY_PAGE_TARGET` 20, `LOBBY_FLOOR_MARGIN_CHECKPOINTS` 16 000 (origen: P5/P7) — MID.
> Decisión (2026-11-02): precisión H-5 de M-4: en `lobby.ts` paso 3b, un `RpcError` `OUT_OF_RANGE` ⇒ `HistoryPrunedError` directamente (medido en P7); el resto mantiene la relectura del piso y NIT-1 — MID.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Proceso (§0) | `HANDOFF_LOBBY.md:50-67` | Baseline `dfb11ce`/94 ≠ base real `bee80e5`/99 | v1.3 |
| 2 | M-4 / DL-5 | `HANDOFF_LOBBY.md:403-408` | `OUT_OF_RANGE` no siempre llega como "fin del historial" | v1.3: H-5 + test; constantes en §3; nota para TASK-6 sobre `client.listEvents` |
| 3 | PROY-20 / FLUJO §9 | `contracts/README.md:440` | Citaba el handoff efímero | Aplicada: "(#10, D-20261102-04)" |
| 4 | PROY-20 | `contracts/README.md:431` | Receta dependía del `app.env` del smoke | Aplicada: Node 26 (prefijo de `agents.md` §3) + `node app/scripts/capture-read-fixtures.mjs` |
| 5 | Coherencia | `contracts/README.md:438` | "~14,5 días" | Aplicada: "≈ 14,6 días, medido en #10" |
| 6 | Info | fixture `objects.resolved` | `previousTransaction` = `cancel_game` fallido (P6) | Sin acción; TASK-2/5 no asumen que es la aceptación |

### Siguiente paso
TASK-2 arranca ya; TASK-3 espera HANDOFF_LOBBY v1.3.

## Task completado: HANDOFF_LOBBY (v1.2) — TASK-2 (tipos y parsers del `Game` y de sus eventos)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales; rutas con placeholders).

- Branch @ `4fd9666`, sin commits. Creados: `app/src/sui/{game,events,readErrors}.ts` + tests. Modificados: `app/src/sui/format.ts` (+18) y `format.test.ts` (+19/−1).
- `game.ts`: esquemas BCS privados con el layout de `game.move:31-84`, `gameType`, `resolutionAmounts` (doc comment de la fórmula v1 y regla de upgrade, `agents.md` §5) y `parseGameObject` en orden: tipo exacto (`wrong_type`), dueño `Shared` (`not_shared`), BCS exacto con re-serialización byte a byte (`malformed`), invariantes de `game.move` (`invariant`). `events.ts`: `RawGameEvent`, `rawEventFromEntry`, `gameEventType`, un parser por evento (`GameResolved` valida `pot == payout + fee` y ganador). `readErrors.ts`: 7 clases + `readErrorMessage`. `format.ts`: `formatBps` (enteros) y `formatTimestamp` (`Intl.DateTimeFormat('es')`).
- **Tests nuevos:** `game.test.ts` 29 (5 variantes reales BCS ↔ `json`; truncado, byte sobrante, variante 3, tag 2 en `Option`, tipo ajeno, `AddressOwner`; invariantes; `fee_rate` 1001 parsea; `resolutionAmounts` = `GameResolved` de la fixture 2000010/50000/1950010), `events.test.ts` 17 (5 eventos reales; frames crudos de `rawListEventsPage` como `GameCreated`, H-4; malformados), `readErrors.test.ts` 12, `format.test.ts` +5.
- **Gates (Node v26.13.0):** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 15 passed (15)` / `Tests 205 passed (205)`; build testnet 0 (826.07 kB, mismo hash); `contracts/`, `package*.json`, `eslint.config.js` sin delta. Primer intento con 1 error de lint y 6 de typecheck en tests (corregidos sin tocar producción).
- Greps: sin `any`, sin red, sin claves, sin rutas personales, sin hex de 40-64 añadido. Capas: `sui/` solo `@mysten/sui/{bcs,client,grpc,utils}`.
- **Desviaciones:** (1) exports de apoyo `parseExactBcs`, `isExactType`, `GameObjectInput`, `GameEventName`, `ReadDataReason`; (2) constructores con datos (`ReadTimeoutError(timeoutMs)` arma el texto); (3) eventos parseados con `transactionDigest`, sin `checkpoint`; (4) malformados por bytes alterados con offsets documentados; (5) test extra de frames crudos; (6) `formatTimestamp` fija el texto del ICU de Node 26.
- **Riesgos:** el texto de `formatTimestamp` depende de la versión de ICU; `isExactType` normaliza el tipo recibido (cubre frames crudos de TASK-3).

## Revisión TASK-2: PASA (con corrección corta aplicada por el DEV antes del commit)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: esquemas BCS = `game.move` campo por campo (`game.ts:30-45`, `events.ts:194-215`); comparación byte a byte (`parseExactBcs`, `game.ts:51-64`); invariantes solo de `game.move` (`:101-119`), `fee_rate` 1001 parsea; nunca `Pending` por defecto (`switch` exhaustivo, variante 3 → `malformed`); contrato §3 intacto; desviaciones 1–6 aceptadas; NIT-3 cumplido (`game.ts:134-141`); los tests prueban lo que dicen.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Contrato con TASK-3 | `readErrors.ts:351-356, 370-374` | Los constructores no aceptaban `ErrorOptions` (TASK-3 necesita `{ cause }`) | Aplicada por el DEV: `options?: ErrorOptions` en las 7 clases + test `keep the original error as cause` |
| 2 | LIM-11 | `format.test.ts` | Texto exacto de ICU | Aplicada: espacios normalizados (`/\s/gu`) en ambos lados |
| 3 | Info | `game.ts:101-119` | No valida `acceptor ≠ creator` ni `acceptor == opponent` | Sin acción (alcance del handoff); se evalúa en #12 si hace falta |

Gate tras la corrección (DEV): `npm ci`/firmas/audit 0; lint 0; typecheck 0; **206 tests** en 15 archivos; build sin cambios; sin delta en `contracts/` ni `package*.json`.

### Siguiente paso
TASK-3 arranca con HANDOFF_LOBBY v1.3 tal como está.

## Task completado: HANDOFF_LOBBY (v1.3) — TASK-3 (lecturas, política común, IDs y config)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales; rutas con placeholders).

- Branch @ `6530f3c`, sin commits. **Creados** (`app/src/sui/`, con su `.test.ts`): `readPolicy`, `readStatus`, `ids`, `transactionInfo`, `gameDetail`, `lobby`. **Modificados:** `nodeInfo.ts`/test, `config.ts`/test y, solo para `publishTxDigest` en literales `AppConfig`: `App.test.tsx`, `Header.test.tsx`, `NetworkBadge.test.tsx`, `useNodeStatus.test.tsx`, `dappKit.test.ts`.
- **Política común:** `withReadTimeout` (corte propio 10 s ⇒ `ReadTimeoutError({ cause })` transitorio; abort de TanStack ⇒ error original, no transitorio), `isTransientReadError`, `shouldRetryRead`, `readRetryDelay`, `deriveReadStatus`; `ids.ts` (`parseObjectIdInput`, `sameAddress`).
- **Lecturas:** `fetchTransactionInfo`; `fetchPublishCheckpoint` (podada ⇒ `null`; sin checkpoint ⇒ `NotYetCheckpointedError`); `fetchCheckpointTime` (paths de P7); `fetchGame` (`GameNotFoundError`/`NotAGameError`; `previousTransaction` tal cual); `nodeInfo` con piso y `withReadTimeout`; `config` con `publishTxDigest`.
- **`fetchLobbyPage`:** relee el piso por página; cota `lobbyLowerBound`; ≤ 2 pedidos crudos descendentes sin `sender`; `getObjects` en lote; filas ilegibles sin ocultar sanas; fin por cota, objetivo o historial podado; H-5 (`OUT_OF_RANGE` ⇒ `HistoryPrunedError` sin relectura); otros `RpcError` ≠ `CANCELLED` releen el piso y, si falla, relanzan el original (NIT-1); `PaginationStalledError`; `reason` desconocido o sin `QueryEnd` ⇒ `malformed`.
- **Tests:** `readPolicy` 32, `readStatus` 8, `ids` 12, `transactionInfo` 10, `gameDetail` 8, `lobby` 28 (calibración, cota en 6 casos, pedidos y filtros, `SCAN_LIMIT` vacíos, tope de 2, objetivo 20, `CHECKPOINT_BOUND`, `ObjectError`, ilegibles, cursor repetido/`null`, `UNKNOWN`/99, publicación podada, piso que se mueve/no se mueve/relectura que falla, `OUT_OF_RANGE` a mitad y en el primer pedido, `CANCELLED`), `nodeInfo` 15, `config` 52.
- **Gates (Node v26.13.0):** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 21 passed (21)` / `Tests 310 passed (310)`; build testnet 0 (`826.57 kB │ gzip 251.62 kB`); `contracts/`, `package*`, `eslint.config.js` sin delta.
- Verificado: todas las llamadas al SDK pasan por `withReadTimeout`; sin `any` ni `useEffect`; capas OK; sin claves, rutas personales ni hex añadido.
- **Desviaciones:** (1) `NODE_STATUS_TIMEOUT_MS` alias de `READ_TIMEOUT_MS`; `fetchNodeInfo` recibe `Pick<SuiGrpcClient, 'ledgerService'>`; (2) `parseObjectIdInput` rechaza `'0x'`; (3) el tipo del evento se pasa sin normalizar (lo normaliza `isExactType`; un tipo basura da fila ilegible en vez de excepción); (4) cursores comparados por base64; (5) `fetchPublishCheckpoint` trata todo `TransactionError` como podada (único `reason` en 2.37); (6) tests extra.
- **Riesgos:** hasta 4–5 pedidos por clic (1 `getServiceInfo` + 2 `ListEvents` + 1 `getObjects` [+1 relectura]); la política aún no está en el `QueryClient` (TASK-4).

## Revisión TASK-3: PASA

> Revisión del MID transcrita por el orquestador (resumida). Contrastó con el SDK instalado (`client/core.mjs:24-33`, `grpc/core.mjs:41-71`, `client/errors.d.mts:31`); no corrió gates.

Confirmado: `withReadTimeout` decide por señal (`readPolicy.ts:27-43`; el test usa el `RpcError INTERNAL` real tras el corte); `isTransientReadError` con los 6 códigos + 2 clases; `fetchLobbyPage` cumple M-1/M-4 (piso por página, `lobbyLowerBound` 5 casos), H-5 (sin relectura), NIT-1 del MAYOR, NIT-1 de v1.1, M-2, bucle acotado, constantes 50/2/20/`16_000n`, `readMask` sin `sender`, poda a mitad de escaneo; sin `Pending` ni montos inventados; `readStatus`, `ids`, `config`, `nodeInfo` correctos; todas las llamadas por `withReadTimeout`; los 28 tests de `lobby` cubren §5.

Desviaciones 1–6 aceptadas (la 3 es mejor que lo pedido; la 5 se apoya en `TransactionErrorReason = 'notFound'` único en 2.37). **Riesgo de pedidos por clic aceptado** (hasta 6: 1 `getServiceInfo` + 2 `ListEvents` + ≤ 2 `BatchGetObjects` + 1 relectura; acotado y disparado por el usuario).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | SEG-10 (menor) | `lobby.ts:162-167` | Frame sin `transactionDigest` ⇒ `createdTxDigest: ''` | TASK-4/5: no pedir `txInfo` con digest vacío (`enabled: digest !== ''`); opcional fila `unreadable` |
| 2 | Proceso | `transactionInfo.ts:348-349` | La desviación 5 depende de un solo motivo de `TransactionError` | TASK-6: al subir el tren `@mysten/*`, revisar `TransactionErrorReason`/`ObjectErrorReason` |
| 3 | Aviso TASK-5 | `lobby.ts:258-260` | Con H-5, la fecha "desde" usa la cota usada (≤ ~1 h antes del piso real) | Aceptado como aproximación en TASK-5 |

### Siguiente paso
TASK-4 arranca con la v1.3 (recordatorios: hallazgo 1 y MINOR-1 del MAYOR en `useLobby`).

## Task completado: HANDOFF_LOBBY (v1.3) — TASK-4 (hooks y política en el `QueryClient`)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales; rutas con placeholders).

- Branch @ `3383f7b`, sin commits. **Creados:** `hooks/queryKeys.ts`, `hooks/useLobby.ts` (+ `usePublishCheckpoint`) y test, `hooks/useGame.ts` y test, `hooks/useTransactionTime.ts` y test (cubre `useCheckpointTime`), `hooks/useCheckpointTime.ts`, `providers/AppProviders.test.tsx`, `test/queryHarness.tsx`. **Modificados:** `useNodeStatus.ts`/test, `AppProviders.tsx`, `sui/nodeInfo.ts` (`NodeStatus` + `deriveNodeStatus`) y su test.
- `queryKeys` `['sui', red, recurso…]` (bigint como string); `QueryClient({ retry: shouldRetryRead, retryDelay: readRetryDelay })`; `NodeStatus` con `retrying` (prioridad sobre `offline`).
- `useLobby`: `useInfiniteQuery` habilitada con la publicación resuelta (valor o `null`), sin intervalo ni refetch al foco; aplana, deduplica y marca `isMine` (`sameAddress`); **estado combinado con la publicación (MINOR-1 del MAYOR)**; `nextPageError` y `stalled`; `refresh` = refetch de la publicación si falló + `resetQueries`. `useGame` (ID inválido ⇒ `invalid_id` sin consulta; 15 s), `useTransactionTime`/`useCheckpointTime` (`staleTime: Infinity`; sin consulta con `null`/`''`, hallazgo 1 de TASK-3).
- **Tests:** `useGame` 8 (incluye **`cancelQueries` aborta la señal del SDK**), `useLobby` 12 (publicación: espera, podada, `NotYetCheckpointedError` ⇒ `retrying`, `INVALID_ARGUMENT` ⇒ `error` sin `listEvents`, `UNAVAILABLE` ×3 ⇒ `error` y `refresh` recupera; páginas: primera, sin foco/intervalo, `loadMore` con `endCursor` y dedupe, `refresh` a una página, `isMine`, ilegibles, `stalled`), `useTransactionTime` 6, `useNodeStatus` 7 (**`cancelQueries` reemplaza el test débil**; `ok` ⇒ `retrying` 2/3 ⇒ 3/3 ⇒ `offline`), `nodeInfo` 19, `AppProviders` 1.
- **Gates (Node v26.13.0):** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 25 passed (25)` / `Tests 342 passed (342)`; build testnet 0 (`827.42 kB │ gzip 252.00 kB`); `contracts/`, `package*`, `eslint.config.js` sin delta. Claves solo de `queryKeys.ts`; sin `useEffect` en `hooks/`/`providers/`; un solo `new QueryClient` de producción.
- **Desviaciones:** (1) `queryKeys.publishCheckpoint` propia (no `txInfo`: datos distintos en caché); (2) `skipToken` en vez de `enabled: false`; (3) arnés compartido `queryHarness.tsx`; (4) formas de resultado de los hooks; (5) al cargar más, el `status` del lobby queda `ready` (estado propio de la página siguiente); (6) test extra de `AppProviders`.
- **Riesgos:** `NetworkBadge` todavía no muestra `retrying` (sin texto de estado durante un reintento) → TASK-5; bundle 827.42 kB.

## Revisión TASK-4: PASA

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: una sola política (`AppProviders.tsx`; ningún hook sobrescribe `retry`; arnés con la misma política; test de `AppProviders`); claves solo de `queryKeys.ts`; `useLobby` combina el estado de la publicación (`enabled: publish.isSuccess`, `null` carga, `status` propio de la publicación, `refresh` la reintenta) — MINOR-1 cerrado; **`cancelQueries` prueba la propagación de verdad** (señal `false` → `true` con `advance(0)`, antes del corte) en `useNodeStatus` y `useGame` — LIM-11 de #9 cerrado; lobby sin intervalo ni foco, detalle 15 s (DL-4); reintento visible; `useGame` valida en el borde; hora sin consulta con `null`/`''` (hallazgo 1 de TASK-3 cerrado); sin `useEffect`.

Desviaciones 1–6 aceptadas (1: clave `publishCheckpoint` es la decisión correcta; 5: lista sigue `ready` y el error de la página siguiente sale por `nextPageError`/`stalled`). `NetworkBadge` sin `retrying` hasta TASK-5: aceptado (estado interno de la branch; obligatorio en TASK-5).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Docs | `app/README.md` "Indicador de red" (#9) | Latencias ≤ ~27/67 s ya no valen (ahora ~23 s caído, ~53 s colgado, con "reintentando (n/3)") | TASK-6 |
| 2 | UX (menor) | `readStatus.ts` + `useLobby.ts:113-116` | Tras `refresh`, el primer intento sigue mostrando `error` | Opcional en TASK-5: deshabilitar "Reintentar" mientras pide |
| 3 | Info | `useLobby.ts:93-96` | Reintentos de "cargar más" no se ven como `retrying` | Aceptado; TASK-5 usa `isFetchingNextPage` |

### Recordatorios para TASK-5
`NetworkBadge` con `retrying` (obligatorio, con test); fecha del piso con `useCheckpointTime(lowerBound.checkpoint)` (aproximación ≤ ~1 h aceptada; sin fecha si la hora no llega; `publish` sin fecha); con `stalled` no se ofrece "Buscar más atrás"; errores por `readErrorMessage`; filas `unreadable` visibles; hora podada "—"; "Última actividad" (nunca "la resolvió"); montos con `resolutionAmounts`; DL-11; opcional hallazgo 2. **Para TASK-6:** hallazgo 1, hallazgo 2 de TASK-3 (revisar `TransactionErrorReason`/`ObjectErrorReason` al subir `@mysten/*`) y la nota de `client.listEvents` en testnet.

## Task completado: HANDOFF_LOBBY (v1.3) — TASK-5 (lobby, detalle y textos)

> Reporte del DEV transcrito por el orquestador (resumido; conteos y exit codes literales; rutas con placeholders).

- Branch @ `a3100ee`, sin commits. **Creados:** `components/{ReadState,LobbyList,GameDetail}.tsx` + tests; `pages/GameDetailPage.tsx` + test. **Modificados:** `HomePage.tsx`, `App.tsx` (+ test), `Header.tsx`, `NetworkBadge.tsx` (+ tests), `useLobby.ts` y `useGame.ts` (solo `isFetching`, desviación 1).
- `ReadState`: "Cargando…", "Reintentando… (intento n de m)", pausa, error con `readErrorMessage` y "Reintentar" (deshabilitado con `busy`). `LobbyList`: filas (apuesta, comisión, creador, hora o "—", "(tuya)", link), ilegibles visibles, 4 estados vacíos (incluido el del piso con fecha y nota al pie), "Actualizar", "Cargar más"/"Buscar más atrás", "Cargando más…", error de la página siguiente; `stalled` ⇒ solo "Actualizar". `GameDetail` + `GameDetailPage` en `/game/:id` ("Última actividad", `resolutionAmounts` vía `format.ts`, Suiscan). `<ConnectButton>Conectar wallet</ConnectButton>`; `NetworkBadge` "reconectando… (intento n de m)".
- **Recordatorios 1–7 cumplidos con test** (`retrying` en el badge; fecha del piso con y sin hora; `stalled`; `readErrorMessage`, ilegibles, "—"; "Última actividad" y montos del `GameResolved` de la fixture; DL-11; "Reintentar" deshabilitado mientras pide).
- **Tests:** `ReadState` 6, `LobbyList` 15, `GameDetail` 4, `GameDetailPage` 5, `App` 3, `Header` 2, `NetworkBadge` 7.
- **Gates (Node v26.13.0):** `npm ci` 0; firmas 292; audit prod 0; lint 0; typecheck 0; `Test Files 29 passed (29)` / `Tests 374 passed (374)`; build testnet 0 (`852.27 kB │ gzip 259.59 kB`); `contracts/`, `package*`, `eslint.config.js`, `app/src/sui/` sin delta. Capas: en `components/`/`pages/` solo `@mysten/dapp-kit-react/ui`; sin `dangerouslySetInnerHTML`. Primer intento con 3 errores de capas en tests (corregidos).
- **Desviaciones:** (1) `isFetching` en `useLobby`/`useGame` (cierra hallazgo 2 de TASK-4); (2) "Cargando más…" aparte con `role="status"`; (3) "Actualizar" siempre visible; (4) `GameDetail` recibe `network`; (5) tests de `components/` sin SDK (fixture `json`).
- **Riesgos:** bundle 852,27 kB (code-splitting en #15); sin CSS nuevo (aspecto en el smoke).

## Revisión TASK-5: PASA

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates.

Confirmado: textos honestos ("No hay partidas abiertas" solo con 0 filas, `!hasNextPage`, `!stalled` y sin `nextPageError`, `LobbyList.tsx:77`; `stalled` solo "Actualizar"; `PaginationStalledError` en la primera página ⇒ `ReadState` error; texto del piso con y sin fecha; nunca "cargando" eterno); sin `Pending` ni montos inventados (montos de `resolutionAmounts` = `GameResolved` real; estimación solo en `Pending`; "Última actividad", nunca "la resolvió"); capas; 5 tests de detalle; recordatorios 1–7 con test. Desviaciones 1–5 aceptadas.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | React (claves), menor | `LobbyList.tsx:73` | Dos `GameCreated` ilegibles de la misma tx comparten clave `${txDigest}:` | En la sesión de TASK-6: `key` con `row.gameId ?? \`i${String(index)}\`` |
| 2 | Eficiencia, menor | `useGame.ts` (`refetchInterval`) | Sigue pidiendo cada 15 s ante un error definitivo | #11/#12 (anotado en el body del PR) |
| 3 | Info | Build | 852 kB | #15 |

### Lista consolidada para TASK-6
**`app/README.md`:** (1) mapa de `app/src/sui/` y hooks nuevos con `queryKeys`; (2) reglas de lectura: BCS exacto y `originalPackageId`, cota `max(publicación, piso + 16 000)` releída por página con `publishTxDigest` (M-1), calibración 50/2/20/16 000, cursor repetido = error (M-2), lobby manual y detalle 15 s + foco, política común (10 s por señal, solo transitorios, 2 reintentos a 1 s y 2 s, "reintentando (n de m)"); (3) montos de una resuelta = fórmula v1 y regla de upgrade (`agents.md` §5); (4) historial del nodo (D-20261102-04 (1)): ≈ 14,6 días, partidas viejas por ID en `/game/:id`, hora podada "—", "desde <fecha>" aproximado (≤ ~1 h); (5) listas por eventos: `client.listEvents` falla con `OUT_OF_RANGE` en el fullnode público, toda lista usa el crudo con `startCheckpoint` y `OUT_OF_RANGE` = fin del historial (lo hereda #13); la paginación del SDK solo vale sin poda; (6) indicador de red recalculado: ≤ ~25 s caído, ≤ ~55 s colgado, "reconectando… (intento n de m)"; quitar "se decide en #10"; (7) IDs en el borde implementado (`ids.ts`, `useGame`), regla para #11/#12; (8) wallet DL-11; (9) recaptura → `contracts/README.md`; (10) al subir `@mysten/*`, revisar `TransactionErrorReason`/`ObjectErrorReason`; (11) pendientes: 852 kB → #15, refetch ante error definitivo → #11/#12.
**`agents.md`:** §2 `contracts/fixtures/` y `app/scripts/`; §5 regla de sincronización de `resolutionAmounts` (fórmula v1) y que la app no replica `MAX_FEE_BPS`.
**`STATUS.md`:** baseline app 374/29 (conteos por archivo), 852 kB; contracts 83; `node --test` 99; fila #10 🚧 con TASK-1..5; pendientes de #9 resueltos (reintentos, test del `signal`); D-20261102-04; #35 abierto.
**Cierre:** grep `"se decide en #10\|se definen en #10\|lo fija #10\|la elige #10"` vacío en los 4 archivos; sin rutas personales; números iguales a los reportes. Después: `documents/SMOKE_LOBBY.md` (MID).
