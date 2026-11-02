# HANDOFF_LOBBY
> Plan: PLAN_LOBBY v1.1 (MAYOR: APPROVE, 2026-11-02) | Issue: #10 | Branch: `feature/issue-10-lobby` | Versión: v1.1 |
> Fecha: 2026-11-02

## Changelog

- **v1.1 (2026-11-02)** — Revisión MAYOR del handoff v1: REQUEST CHANGES (1 MAJOR, 2 NIT):
  - **MAJOR-1 (poda del fullnode público de testnet):** el piso `lowestAvailableCheckpoint` va ≈ 14,6 días por detrás de
    la punta y se mueve; `getCheckpoint`/`getTransaction` por debajo dan `NOT_FOUND` y un escaneo que cruza el piso termina
    en error (`list_events.rs` @ `testnet-v1.83.0:179-190`). Cambios (M-4): **cota efectiva** = máx(checkpoint de la
    publicación, piso + margen), con el piso de `getServiceInfo` (`fetchNodeInfo` lo devuelve); publicación podada
    (`NOT_FOUND`) ⇒ solo el piso; error de piso a mitad del escaneo ⇒ fin del historial disponible
    (`HistoryPrunedError`, no transitorio, sin filas falsas); texto "No hay partidas abiertas en el historial disponible
    del nodo (desde <fecha>)"; P7 suma tres mediciones en testnet; tests nuevos en TASK-3/4/5.
  - **NIT-1:** `QueryEnd.reason` `UNKNOWN` o no listado ⇒ `ReadDataError('malformed')`, con test (TASK-3).
  - **NIT-2:** checkpoint `null` de la publicación ⇒ `NotYetCheckpointedError`, transitorio dentro de
    `isTransientReadError`, con test (TASK-2/3).
  - **P-1 (decisión de producto):** **resuelta por el usuario: opción (a)** (D-20261102-04 (1), 2026-11-02); ya no bloquea TASK-3 en adelante
    hasta la respuesta.
- **v1 (2026-11-02)** — primera versión (`5c6d762`).

> **Confirmado por el usuario (P-1 = (a), D-20261102-04 (1)):** en testnet, las partidas abiertas con más de
> ≈ 14 días no aparecen en el lobby (poda del fullnode público). Opciones: **(a)** aceptarlo en el MVP con el texto honesto
> y una nota en `app/README.md` (**recomendada por el MAYOR; este handoff la asume**); (b) GraphQL para las listas;
> (c) indexador propio. TASK-1 y TASK-2 pueden correr ya. Si el usuario elige (b) o (c), el handoff se rehace desde TASK-3.

Documento autocontenido para el DEV: TASK-1..6 y el smoke del ciclo. Se ejecuta **un task por sesión**, en orden; cada
task termina con el reporte de `documents/FLUJO_AGENTES.md` §5 y espera la revisión del MID antes del siguiente. El DEV
**no** commitea ni pushea (lo hace el orquestador).

## Historia de usuario del ciclo

**Como** jugador que entra a la app sin saber qué partidas hay, **quiero** ver la lista de partidas abiertas (las más
recientes primero, con apuesta, comisión, creador y hora, y las mías marcadas) y abrir el detalle de cualquier partida
por su ID (estado, jugadores, apuesta, comisión y, si terminó, ganador, pago y comisión cobrada), **para** elegir a qué
partida entrar y saber en qué quedó una partida sin depender de la CLI ni de un explorador.

**Scope en una frase:** lobby de partidas abiertas y detalle `/game/:id`, de solo lectura, con eventos y objetos leídos
por gRPC y una política de reintentos común a todas las lecturas.
**Lo que NO entrega:** crear, cancelar o rechazar (#11), aceptar (#12), "mis partidas" e invitaciones recibidas (#13),
panel admin (#14), indexador propio, ni cambios del contrato.

## 0. Baseline de gates verificado (2026-11-02, `master` `dfb11ce`)

Verificado por el MID con `git log` y `documents/STATUS.md`. Entre `9bf7a77` (merge de #9, donde se midió la app) y
`dfb11ce` no cambió nada en `app/`, `contracts/`, `.github/`, `package.json` ni `package-lock.json` (`git diff --stat
9bf7a77 dfb11ce -- …` vacío): el baseline sigue vigente. La branch tiene encima solo el plan (`48a6c32`, `4b522ea`).

| Área | Gate | Baseline |
|---|---|---|
| Toolchain | `sui --version` / `node --version` / `npm --version` | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` / `11.20.0` |
| App | `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` | exit 0; 292 firmas verificadas; 0 vulnerabilidades de producción (11 *moderate* solo dev, aceptadas hasta #35) |
| App | `npm run lint -w app` / `npm run typecheck -w app` | 0 problemas / 0 errores |
| App | `npm test -w app` | **142 tests PASS en 12 archivos** |
| App | `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-*.js` 826 kB, con el aviso informativo de chunk > 500 kB (#15) |
| Contracts | `sui move build` / `--lint` / `test` con `-e testnet --warnings-are-errors` | 0 warnings / 0 lints / **83 tests PASS**; `Move.lock` sin delta |
| Contracts | `node --test scripts/*.test.mjs` / `node scripts/publish.mjs check` | **94 PASS** / "0 despliegues" |

**Primer paso de TASK-1:** correr el gate completo (`agents.md` §3, job `app` + job `contracts`) y pegarlo como
"verificación del baseline". Si algo difiere, se para y se reporta antes de tocar nada.

## 1. Decisiones (no reabrir)

**Del owner (registradas):** D-20261102-02 (1) lectura con `SuiGrpcClient` (gRPC-web), (3) cadena de suministro (sin
dependencias nuevas sin plan), (5) burner solo en localnet + `npm run dev`; D-20261102-03 (ningún agente usa claves del
owner ni corre nada contra testnet con claves; `~/.sui/` sin claves); D-20261031-01 (fixtures de lectura en
`contracts/fixtures/`); D-20261030-15 D3 (el objeto terminal se conserva) y D6 (sin timestamp en el contrato);
D-20261030-16 D2/D3 (comisión hacia abajo sobre el pozo completo) y D4 (no existe `GameAccepted`).

**Del plan v1.1 (MID, aprobadas por el MAYOR):** DL-1 … DL-13 de `documents/PLAN_LOBBY.md`. Resumen operativo en los
tasks.

**Resuelto:** **P-1** = (a) y DL-11 = aceptar la mezcla (D-20261102-04).

**Resuelto por el usuario (D-20261102-04 (2)): DL-11 = aceptar**, la UI de conexión mixta (botón "Conectar wallet" en español; modal y menú
del kit en inglés, sin API de textos). Por defecto se implementa así y se documenta en `app/README.md`; si el usuario
decide otra cosa, se abre un issue aparte y este handoff no cambia.

**Del MAYOR en la aprobación del plan (2026-11-02, decisión interna):**

| # | Decisión |
|---|---|
| M-1 (MINOR-N1) | **Cota inferior del escaneo por defecto.** El lobby nunca escanea antes del checkpoint de la **publicación original** del paquete: `publishTxDigest` de `deployments/<red>.json` → `getTransaction(…).checkpoint`. Al llegar a la cota, la paginación termina (`hasNextPage: false`) y, sin filas, la UI muestra "No hay partidas abiertas". `config.ts` pasa a exponer `publishTxDigest`. Si P5/P7 muestran que la cota no se aplica con el SDK, es parte del STOP contingente |
| M-2 (NIT-N1) | **Cursor repetido = error visible.** Si un pedido devuelve como cursor final el mismo `before` que recibió (no avanzó), la página falla con un error no reintentable y la UI lo muestra **sin** ofrecer "Buscar más atrás" |
| M-4 (MAJOR-1 del handoff v1) | **Poda del historial.** Cota efectiva del escaneo = máx(checkpoint de la publicación, piso + `LOBBY_FLOOR_MARGIN_CHECKPOINTS`), con el piso = `lowestAvailableCheckpoint` de `getServiceInfo`, releído al inicio de **cada** página; el margen solo se suma si el piso es > 0 (un nodo sin poda, como la localnet, informa 0 o nada). Si `getTransaction(publishTxDigest)` da `NOT_FOUND`, la cota es solo el piso. Si el escaneo choca con el piso a mitad de camino (el piso se movió), la página termina con lo que ya tenía de los pedidos anteriores (se descarta lo del pedido que falló) y `hasNextPage: false`: fin del historial disponible. Sin filas, la UI dice "No hay partidas abiertas en el historial disponible del nodo (desde <fecha>)" cuando la cota es el piso, y "No hay partidas abiertas" cuando es la publicación |
| M-3 | **Condiciones de P5:** código de la sonda solo en el scratchpad (no se commitea); sin `SUI_CONFIG_DIR`, sin `~/.sui/` y sin ningún archivo de claves; topes de **40 pedidos** en total y **un único** pedido con `limit` 1000; el reporte no pega direcciones `sender`; las fixtures salen solo de la localnet |

**Precisiones del MID en este handoff (verificadas en el SDK instalado; se declaran en el PR):**

| # | Precisión | Evidencia |
|---|---|---|
| H-1 | **Cómo se aplica la cota (M-1):** el `listEvents` del core del SDK no acepta rango de checkpoints ni expone el `Watermark`. El lobby usa el **mismo RPC que usa el SDK por dentro**, `client.ledgerService.listEvents(…)`, con `startCheckpoint` = checkpoint de la publicación. En orden descendente, el escaneo termina con `QueryEndReason.CHECKPOINT_BOUND` al llegar a la cota | `dist/grpc/core.mjs:370-412` (el core arma este mismo pedido sin `startCheckpoint`); `ledger_service.d.mts:477-505` (`startCheckpoint` inclusivo); `query_options.d.mts` (`CHECKPOINT_BOUND = 3`, `Watermark.cursor` = punto seguro para reanudar) |
| H-2 | Los enums del proto (`Ordering`, `QueryEndReason`) se importan como valores desde `GrpcTypes` de `@mysten/sui/grpc` | `dist/grpc/index.d.mts` (exporta `GrpcTypes`); `dist/grpc/proto/types.mjs:199, 212` |
| H-3 | `RpcError` se exporta desde `@mysten/sui/grpc`: DL-5 usa `error instanceof RpcError` y su `code` (string), en vez de reconocerlo por forma | `dist/grpc/index.d.mts` (`export … RpcError`) |
| H-4 | Los eventos del lobby llegan como frames del proto (`event.eventType`, `event.contents?.value`, `event.transactionDigest`, `event.checkpoint`, `event.eventIndex`). Los parsers de `events.ts` reciben un tipo mínimo propio (`RawGameEvent`) que se arma igual desde un `EventEntry` del SDK (fixtures) o desde un frame | `dist/grpc/proto/sui/rpc/v2/event.d.mts:43-90` |

## 2. Reglas transversales (todos los tasks)

- **Node 26** por ruta absoluta en cada llamada: `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node
  --version && …` (`node --version` = `v26.13.0`). Todo desde la raíz del worktree (`<repo>`).
- **Gate de la app en cada task** (output pegado y completo): `npm ci`, `npm audit signatures`, `npm audit --omit=dev
  --audit-level=high`, `npm run lint -w app`, `npm run typecheck -w app`, `npm test -w app` (archivos y tests),
  `VITE_SUI_NETWORK=testnet npm run build -w app` (tamaño del bundle) y `git status --porcelain --untracked-files=all`
  con solo los archivos del task. En TASK-1, además, el job `contracts` completo (`agents.md` §3) para mostrar cero delta.
- **Sin dependencias nuevas** (SEG-8): `package.json`, `app/package.json` y `package-lock.json` sin delta en todo el ciclo.
  Se usan solo `@mysten/sui`, `@mysten/dapp-kit-react`, `@tanstack/react-query`, `react-router` y `node:*`.
- **Capas** (`app/eslint.config.js`): `sui/` solo `@mysten/sui*`/`@mysten/dapp-kit-core*`, sin React; `hooks/` solo
  `@mysten/sui*` y `@mysten/dapp-kit-react` (raíz); componentes y páginas, de `@mysten/*` solo `@mysten/dapp-kit-react/ui`.
- **Localnet aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh`, `ids.env`, `smoke_guard`, publicación con
  el script en la **variante B** (sin `--out`, escribe `contracts/deployments/localnet.json`) y cierre del paso 7.
  **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo del paso 3, **tampoco** los de solo lectura;
  `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. **Una sola localnet a la vez** en la máquina (puerto 9000): confirmar antes de la
  génesis que no hay otra. Para `node`/`npm`/`vite` dentro de la localnet, un `<SMOKE_DIR>/app.env` propio que no toca
  `HOME` ni `SUI_CONFIG_DIR` (patrón del smoke de #9, `git show 9bf7a77:documents/SMOKE_APP.md`); nunca `env.sh` y
  `app.env` en la misma llamada.
- **Testnet:** solo **lectura pública sin claves** desde Node con `SuiGrpcClient` (P5) o desde el navegador headless; nada
  de `sui client`, `publish.mjs … --network testnet` ni `--dry-run`.
- **Placeholders en todo lo commiteado y en el output pegado** (`FLUJO_AGENTES.md` §2): `<repo>`, `<HOME real>`,
  `<SMOKE_DIR>`, `<scratchpad>`. Nunca rutas personales, ni en reportes ni en el smoke.
- **Antes de cada reporte:** `git diff` + archivos nuevos sin rastrear por grep de claves (`suiprivkey`, `mnemonic`,
  `BEGIN .*KEY`) y de rutas personales: vacío. El grep de hex de 40-64 solo debe dar las fixtures de TASK-1 y los IDs
  ficticios de tests ya existentes; se declaran.
- **Sin `useEffect` para pedir datos** (PROY-14); montos en `bigint` (PROY-12); textos de la UI en español; tests en
  inglés con nombre = comportamiento (LIM-11); `///`/JSDoc en funciones exportadas con el porqué (LIM-7).

## 3. Contrato entre tasks (nombres que no cambian)

| Archivo | Exporta (firma orientativa; los nombres son fijos) |
|---|---|
| `app/src/sui/game.ts` | `type GameState = { kind: 'pending' } \| { kind: 'cancelled' } \| { kind: 'resolved'; acceptor: string; winner: string }`; `type Game = { id; version: bigint; houseId; creator; opponent: string \| null; bet: bigint; stake: bigint; feeRate: number; state: GameState }`; `gameType(originalPackageId)`; `parseGameObject(object, originalPackageId): Game`; `resolutionAmounts(bet: bigint, feeRate: number): { pot; fee; payout }` |
| `app/src/sui/events.ts` | `type RawGameEvent = { eventType: string; bcs: Uint8Array; transactionDigest: string; checkpoint: bigint \| null }`; `GameCreatedEvent`, `GameCancelledEvent`, `GameResolvedEvent` (con `transactionDigest`); `gameEventType(originalPackageId, name)`; `parseGameCreated` / `parseGameCancelled` / `parseGameResolved(raw, originalPackageId)`; `rawEventFromEntry(entry)` (desde `EventEntry` del SDK) |
| `app/src/sui/readErrors.ts` | `class ReadDataError extends Error` (`reason`: `'malformed' \| 'wrong_type' \| 'not_shared' \| 'invariant'`); `class GameNotFoundError`, `class NotAGameError`, `class PaginationStalledError`, `class ReadTimeoutError`, `class NotYetCheckpointedError` (transitorio), `class HistoryPrunedError` (no transitorio); `readErrorMessage(error, network): string` |
| `app/src/sui/format.ts` | suma `formatBps(bps: number): string` (`250` → `"2.5 %"`) y `formatTimestamp(ms: number, timeZone?: string): string` |
| `app/src/sui/readPolicy.ts` | `READ_TIMEOUT_MS = 10_000`, `READ_MAX_RETRIES = 2`, `READ_RETRY_BASE_MS = 1_000`, `READ_RETRY_MAX_MS = 4_000`; `withReadTimeout<T>(signal: AbortSignal \| undefined, call: (abort: AbortSignal) => Promise<T>): Promise<T>`; `isTransientReadError(error)`; `shouldRetryRead(failureCount, error)`; `readRetryDelay(attempt)` |
| `app/src/sui/readStatus.ts` | `type ReadStatus = { kind: 'loading' } \| { kind: 'retrying'; attempt: number; max: number } \| { kind: 'paused' } \| { kind: 'error'; error: unknown } \| { kind: 'ready'; refreshing: boolean }`; `deriveReadStatus(q)` |
| `app/src/sui/ids.ts` | `parseObjectIdInput(raw: string): string \| null`; `sameAddress(a, b): boolean` |
| `app/src/sui/transactionInfo.ts` | `fetchTransactionInfo(client, { digest, signal }): Promise<{ timestampMs: number \| null; checkpoint: bigint \| null }>`; `fetchPublishCheckpoint(client, { digest, signal }): Promise<bigint \| null>` (`null` = podada); `fetchCheckpointTime(client, { sequenceNumber, signal }): Promise<number \| null>` |
| `app/src/sui/nodeInfo.ts` | `NodeInfo` suma `lowestAvailableCheckpoint: bigint \| null` |
| `app/src/sui/lobby.ts` | `LOBBY_EVENTS_PER_REQUEST`, `LOBBY_MAX_REQUESTS_PER_PAGE`, `LOBBY_PAGE_TARGET` (calibrados con P5), `LOBBY_FLOOR_MARGIN_CHECKPOINTS` (calibrado con P7); `type LobbyItem = { kind: 'game'; game: Game; createdTxDigest: string } \| { kind: 'unreadable'; gameId: string \| null; txDigest: string }`; `type LobbyLowerBound = { checkpoint: bigint; kind: 'publish' \| 'node_floor' \| 'none' }`; `lobbyLowerBound({ publishCheckpoint: bigint \| null, nodeFloor: bigint \| null }): LobbyLowerBound` (pura); `fetchLobbyPage(client, { originalPackageId, publishCheckpoint: bigint \| null, before: string \| null, signal }): Promise<{ items: LobbyItem[]; endCursor: string \| null; hasNextPage: boolean; lowerBound: LobbyLowerBound; end: 'more' \| 'bound' \| 'history_pruned' }>` (cursor en base64) |
| `app/src/sui/gameDetail.ts` | `GAME_REFETCH_MS = 15_000`; `fetchGame(client, { id, originalPackageId, signal }): Promise<{ game: Game; previousTransaction: string \| null }>` |
| `app/src/sui/config.ts` | `AppConfig` suma `publishTxDigest: string` |
| `app/src/hooks/queryKeys.ts` | `queryKeys.nodeInfo(network)`, `.lobby(network, originalPackageId)`, `.game(network, id)`, `.txInfo(network, digest)`, `.checkpointTime(network, sequenceNumber)` |

---

## TASK-1: fixtures reales de lectura gRPC y sondas — área: contracts (fixtures, docs) + app (script)

### 1. Historia de usuario del task
**Como** desarrollador de la app, **quiero** respuestas reales del nodo para cada variante de `Game` y de sus eventos, y
medidas de cómo pagina `ListEvents` en testnet, **para** escribir parsers contra datos reales y calibrar el lobby sin
adivinar. **No entrega:** código de `app/src/`.

### 2. Contexto
- `contracts/README.md` "Lectura desde la app" (`:402-424`) describe el formato de la CLI y anuncia las fixtures de #10.
- Patrón de fixtures reales: `contracts/scripts/fixtures/` (salida de una localnet desechable, con direcciones efímeras).
- Sintaxis de las transacciones de partidas por CLI: smoke de #6 (`git show 8fddbda:documents/SMOKE_ACCEPT.md`, pasos
  4-11): `update_fee_rate`, `create_game` con `none` / `"some(@$B)"`, `cancel_game`, `reject_game`, `accept_game` con
  `@0x8`.
- API: `SuiGrpcClient` (`@mysten/sui/grpc`): `listEvents`, `getObjects({ include: { content: true, json: true,
  previousTransaction: true } })`, `getTransaction`; el crudo `client.ledgerService.listEvents` / `getCheckpoint` (H-1).

### 3. Qué implementar
1. **Localnet aislada** (§2): génesis, arranque, cuentas `ADMIN`, `A`, `B`, `C` de la génesis en `ids.env`, publicación
   variante B.
2. **Transacciones** (con el prefijo B4; `--json` a archivos de `<SMOKE_DIR>`): `ADMIN` `update_fee_rate` 250; `A` crea
   `G_OPEN` (abierta) y `G_INVITE` (invitación a `B`); `A` crea `G_CANCEL` y la cancela; `A` crea `G_REJECT` invitando a `B`
   y `B` la rechaza; `A` crea `G_RES` y `B` la acepta (si sale `ExecutionCancelledDueToRandomnessUnavailable`, esperar unos
   segundos y repetir; se anota); para P1, un PTB de `A` con **60** `create_game` abiertas.
3. **Script `app/scripts/capture-read-fixtures.mjs`** (ESM, Node 26; importa solo `@mysten/sui/*` y `node:*`):
   - `--url` opcional, por defecto `http://127.0.0.1:9000`. **Primera instrucción ejecutable:** si la URL no es
     exactamente esa cadena, escribe el motivo en `process.stderr` y sale con código ≠ 0 **sin** crear el cliente ni hacer
     pedidos.
   - Lee `contracts/deployments/localnet.json` (ruta relativa al script vía `import.meta.url`); exige `network:
     "localnet"`; compara el chain id del nodo (`getServiceInfo`, abreviado como `networks.ts` `shortChainId`) con
     `chainId`; si no coinciden, aborta.
   - Descubre las partidas por `listEvents` (los tres tipos, por `originalPackageId`), las clasifica por estado leyendo
     los objetos y arma **un** archivo `contracts/fixtures/game-reads.localnet.json`:
     - `_meta`: `suiCliVersion`, `sdkVersion` (`@mysten/sui`), `capturedAt` (ISO), `network: "localnet"`, `method` (qué
       llamadas produjo cada sección), `note` (cuentas efímeras de una génesis desechable, sin claves);
     - `objects`: `pendingOpen`, `pendingInvite`, `cancelledByCreator`, `cancelledByInvitee`, `resolved` — el objeto
       del SDK tal cual (`objectId`, `version`, `digest`, `owner`, `type`, `previousTransaction`, `json`) y `content` en
       base64;
     - `events`: `gameCreatedOpen`, `gameCreatedInvite`, `gameCancelledByCreator`, `gameCancelledByInvitee`,
       `gameResolved` — el `EventEntry` del SDK con `bcs` en base64 y **sin** `sender` (se omite al serializar);
     - `transactions`: `{ digest, timestampMs, checkpoint }` del `GameCreated` de `pendingOpen` y de la publicación;
     - `rawListEventsPage`: los frames de **un** pedido crudo `ledgerService.listEvents` de `GameCreated` (descendente,
       `limit` 3, `startCheckpoint` = checkpoint de la publicación) con `bigint` → string, `Uint8Array` → base64 y sin
       `sender` en el `readMask`, para el test del adaptador de TASK-3.
   - Escribe con `node:fs/promises` y `JSON.stringify(obj, null, 2)` + salto de línea final; informa con
     `process.stdout.write`. **Sin `console`** y **sin cambiar `app/eslint.config.js`** (`no-console` y `no-undef` pasan
     porque `process` se importa de `node:process`).
4. **`contracts/README.md` "Lectura desde la app"**: reemplazar la "Referencia observada" de la CLI por el formato gRPC
   real (con un extracto de la fixture), declarar BCS como formato de la app (DL-1), la cota de M-1 y cómo recapturar
   (`node app/scripts/capture-read-fixtures.mjs` dentro de la localnet aislada, con `app.env`).
5. **Sondas** (código descartable en `<scratchpad>`, nunca en el repo; resultados en el reporte):

| Sonda | Red | Qué medir | Para qué |
|---|---|---|---|
| P1 | localnet | `client.listEvents` descendente de `GameCreated` (`limit` 50) siguiendo `before = endCursor` hasta el final: eventos por página, `hasNextPage`, total (= 64 esperados), sin duplicados ni huecos frente a los digests de `suic tx-block` | DL-3 |
| P2 | localnet | `getObjects` de las 5 variantes: `type`, `owner.$kind`, que `content` parsea con el esquema BCS de DL-1 (probado en el scratchpad) | DL-1, DL-9 |
| P3 | localnet | `getTransaction(digest).timestampMs` y `.checkpoint` de varios `GameCreated` = `timestampMs`/`checkpoint` de `suic tx-block` | DL-6 |
| P4 | localnet | `json` vs BCS campo por campo en las 5 variantes y los 4 eventos | DL-1 |
| P5 | **testnet, lectura pública** | Tipo escaso `0x3::sui_system_state_inner::SystemEpochInfoEvent` (uno por época; confirmar el nombre y, si no existe, elegir otro de frecuencia conocida y declararlo). (i) `client.listEvents` desde la punta, descendente, `limit` 50, siguiendo `before`, hasta juntar **3** eventos: pedidos, páginas vacías con `hasNextPage: true`, latencia por pedido. (ii) El crudo con los mismos cursores: `watermark.checkpoint` final y `QueryEnd.reason` por pedido ⇒ checkpoints cubiertos por pedido, pasados a horas con `ledgerService.getCheckpoint` de dos checkpoints. (iii) **Un** pedido con `limit` 1000 sobre un tipo frecuente del sistema (declararlo), contando ítems hasta `ITEM_LIMIT` ⇒ tope real de `limit`. **Topes y reglas de M-3** | Calibración de DL-3; STOP |
| P6 | localnet | Tras resolver `G_RES`, `A` llama `cancel_game` sobre ella (aborta con `ENotPending`, módulo `game`, código 4): ¿cambia `previousTransaction` del objeto? | DL-6 |
| P7 | localnet + testnet (público, dentro del tope de P5) | **Cota de M-1:** crudo `ledgerService.listEvents` descendente con `startCheckpoint`. Localnet: `startCheckpoint` = checkpoint de la publicación, `limit` 50, siguiendo `before`: el último pedido termina con `CHECKPOINT_BOUND`, no aparece ningún evento con `checkpoint` < cota y no hay pedidos vacíos después. Testnet: el tipo escaso con `startCheckpoint` = punta − 2 épocas aprox.: termina con `CHECKPOINT_BOUND` en una cantidad finita de pedidos. **Poda (M-4), en testnet y dentro del tope de 40 de P5:** (i) `getServiceInfo` al inicio y al final de la sonda: `lowestAvailableCheckpoint`, `checkpointHeight`, distancia en horas y cuánto se movió el piso entre ambas lecturas; (ii) `getTransaction` de un digest **más viejo que el piso** (tomado de un evento escaso viejo o de un checkpoint conocido; sin direcciones): código o clase del error; (iii) crudo `ledgerService.listEvents` con `startCheckpoint` **por debajo del piso**: ¿error o `QueryEndReason`? código gRPC y mensaje (sin direcciones). Además, `ledgerService.getCheckpoint` por número con `readMask` de la hora (confirmar los paths). En localnet, el `lowestAvailableCheckpoint` que informa el nodo (se espera 0 o ausente) | M-1, M-4, H-1 |

**Calibración (en el reporte):** tabla por pedido de P5 y la propuesta:
- `LOBBY_EVENTS_PER_REQUEST` = mín(50, tope real de `limit`);
- `LOBBY_MAX_REQUESTS_PER_PAGE` = pedidos necesarios para cubrir una época de testnet (≈ 24 h) con el tipo escaso, + 1 de
  margen, **con tope 4**;
- `LOBBY_PAGE_TARGET` = 20, salvo que el tope de `limit` lo haga inalcanzable;
- `LOBBY_FLOOR_MARGIN_CHECKPOINTS` = checkpoints de ≈ 1 h a la tasa medida en P5, o más si P7 (i) muestra que el piso salta
  de a tramos mayores durante la sonda (se reporta el valor y el porqué).

**STOP contingente (se para y se reporta, sin seguir a TASK-3):**
1. testnet no sirve `ListEvents` descendente con `before`, o no indexa eventos;
2. con el tipo escaso, 4 pedidos no cubren una época;
3. P7 muestra que `startCheckpoint` no acota el escaneo o no termina con `CHECKPOINT_BOUND` (la cota de M-1 no se aplica
   con el SDK), o que `getServiceInfo` del fullnode público no informa `lowestAvailableCheckpoint` (la cota de M-4 no se
   puede calcular).

El MID arma las opciones para el usuario (más pedidos por clic, GraphQL, otra forma de rango).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `contracts/fixtures/game-reads.localnet.json` (nuevo), `app/scripts/capture-read-fixtures.mjs` (nuevo),
  `contracts/README.md` ("Lectura desde la app" y la fila de la tabla de rutas del inicio).
- **NO tocar:** `app/src/`, `app/eslint.config.js`, `contracts/sources/`, `contracts/tests/`, `contracts/scripts/`,
  `contracts/Move.lock`, `package*.json`, `.github/`. `contracts/deployments/localnet.json` existe solo durante la corrida
  y el cierre lo borra.

### 5. Tests obligatorios
Ninguno nuevo (los consume TASK-2). Gate de la app y job `contracts` en verde, sin delta.

### 6. Smoke
No aplica como smoke del ciclo; la corrida en localnet es la captura. Registrar: chain id corto de la génesis, digests de
cada transacción, P1-P7 y el cierre del paso 7 (`stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base, `kill -0`
falla, `<SMOKE_DIR>` borrado, sin `contracts/deployments/`, `git diff --exit-code -- contracts/Move.lock`).

### 7. Criterios de aceptación
- La fixture tiene las 5 variantes de objeto, los 5 eventos, `transactions` y `rawListEventsPage`, con `_meta` completo;
  **sin claves ni frases** y **sin `sender`** (solo direcciones e IDs efímeros dentro de los datos del contrato).
- El script corre dos veces sobre la misma red y da el mismo archivo salvo `_meta.capturedAt`.
- `node app/scripts/capture-read-fixtures.mjs --url https://fullnode.testnet.sui.io:443` sale con código ≠ 0 y su motivo,
  sin pedidos (salida pegada).
- P1-P7 respondidas (P7 con los códigos de los tres casos de poda); tabla de P5 y calibración propuesta, incluido el
  margen; STOP contingente evaluado explícitamente (sí/no, por causa).
- `contracts/README.md` sin la frase "El formato exacto de gRPC lo fija #10".
- `npm run lint -w app` en 0 con el script incluido.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5 (incluida "Desviaciones del handoff"), con los placeholders de §2.
Declarar el grep de hex: solo la fixture nueva. Sin commits.

---

## TASK-2: tipos y parsers del `Game` y de sus eventos — área: app (`sui/`)

### 1. Historia de usuario del task
**Como** desarrollador de la app, **quiero** convertir los bytes que da el nodo en tipos TS exactos de `Game` y de sus
eventos, rechazando todo lo que no encaje, **para** que ninguna vista muestre un dato que la app no entendió. **No
entrega:** lecturas de red ni UI.

### 2. Contexto
- Layout Move: `contracts/sources/game.move:31-84` (orden de campos de `Game`, variantes de `GameState`, eventos).
  `UID` e `ID` se serializan como una dirección de 32 bytes; `Balance<SUI>` como un struct con `value: u64`.
- Probado con `@mysten/sui/bcs` 2.37.0: `bcs.enum` lanza con un índice de variante desconocido y con bytes truncados,
  pero **no** con bytes sobrantes; `u64` sale como string y `u16` como número. Por eso se re-serializa y se comparan bytes.
- Fixture de TASK-1, importada con `import.meta.glob(…, { eager: true, import: 'default' })` como `config.test.ts:4-8`.

### 3. Qué implementar
- **`game.ts`:** esquemas `bcs.struct`/`bcs.enum` privados del módulo que replican el layout; `gameType(pkg)` =
  `normalizeStructTag(\`${pkg}::game::Game\`)`. `parseGameObject(object, pkg)`:
  1. `object.type` = `gameType(pkg)`, si no `ReadDataError('wrong_type')`;
  2. `object.owner.$kind === 'Shared'`, si no `'not_shared'`;
  3. parsear `content`; error de BCS ⇒ `'malformed'`;
  4. **re-serializar y comparar byte a byte** con `content`; distinto ⇒ `'malformed'`;
  5. invariantes **solo de `game.move`**: `Pending` ⇒ `stake == bet`; `Cancelled`/`Resolved` ⇒ `stake == 0`;
     `Resolved` ⇒ `winner ∈ {creator, acceptor}`. Si falla ⇒ `'invariant'`. **No** validar `fee_rate <= 1000` (es
     `house::MAX_FEE_BPS`, regla de sincronización de `agents.md` §5);
  6. `u64` ⇒ `bigint`; `opponent` `null` o dirección.
- **`resolutionAmounts(bet, feeRate)`:** pozo `2n * bet`, comisión `(pozo * BigInt(feeRate)) / 10_000n` (división entera =
  hacia abajo), pago `pozo − comisión`. Constante nombrada para el denominador (LIM-6). **Doc comment obligatorio:** "Fórmula
  de la v1 del contrato (D-20261030-16 D2/D3). Si un upgrade la cambia, las partidas resueltas con el código viejo siguen
  necesitando esta fórmula: el issue del upgrade la conserva (por versión del `Game` o leyendo el evento) en el mismo PR
  (`agents.md` §5)."
- **`events.ts`:** `RawGameEvent` (H-4); `rawEventFromEntry(entry)` desde `EventEntry` del SDK; `gameEventType(pkg,
  name)`; un parser por evento con los mismos pasos 1, 3 y 4 (tipo exacto, BCS, bytes idénticos) y, en `GameResolved`,
  `pot == payout + fee` y `winner ∈ {creator, acceptor}`. Sin `GameAccepted`.
- **`readErrors.ts`:** las clases de §3 con mensajes en español y `readErrorMessage(error, network)`:
  `ReadDataError` ⇒ "El nodo devolvió datos que la app no reconoce"; `GameNotFoundError` ⇒ "No existe una partida con ese
  ID en <red>"; `NotAGameError` ⇒ "Ese objeto no es una partida de Sui Battleship"; `PaginationStalledError` ⇒ "La
  búsqueda no avanzó: el nodo repitió la posición. Prueba «Actualizar»"; `ReadTimeoutError` ⇒ "El nodo no respondió en
  10 s"; `NotYetCheckpointedError` ⇒ "La transacción todavía no está en un checkpoint; se reintenta"; `HistoryPrunedError`
  ⇒ "El nodo ya no conserva esa parte del historial"; `RpcError` ⇒ "No se pudo leer la red (<mensaje>)"; otro ⇒ su `message`.
- **`format.ts`:** `formatBps` (aritmética entera: `bps / 100` con hasta 2 decimales, sin ceros finales, `" %"`) y
  `formatTimestamp(ms, timeZone?)` con `Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone })`.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/{game,events,readErrors}.ts` y sus `.test.ts` (nuevos), `app/src/sui/format.ts` y
  `format.test.ts`.
- **NO tocar:** el resto de `app/src/`, `contracts/`.

### 5. Tests obligatorios
- Las 5 variantes de objeto y los 5 eventos de la fixture parsean al valor esperado (montos como `bigint`).
- Cruce BCS ↔ `json` de la fixture para cada objeto y evento.
- **Malformados:** bytes truncados; bytes sobrantes (el parse de `@mysten/bcs` los acepta: los detecta solo la
  comparación de la re-serialización); índice de variante 3 en `GameState`; etiqueta 2 en el `Option` de `opponent`;
  `type` de otro paquete y de otro módulo; `owner` no compartido.
- Invariantes: `stake ≠ bet` en `Pending`; `stake ≠ 0` en `Cancelled` y en `Resolved`; `winner` ajeno; `pot ≠ payout +
  fee`. Un `fee_rate` 1001 **bien formado parsea**.
- `resolutionAmounts`: igual al `GameResolved` de la fixture; ejemplos de `contracts/README.md` "Comisión" (10 SUI con 250
  bps; `bet = 1_000_001` con 250 bps ⇒ comisión 50 000, pago 1 950 002); `feeRate` 0.
- `formatBps`: 0, 1, 250, 1000; `formatTimestamp` con `timeZone: 'UTC'`.

### 6. Smoke
No aplica (funciones puras; las cubre el smoke del ciclo).

### 7. Criterios de aceptación
Sin `any`; sin red; capas respetadas; tipos de §3 exactos; gate verde.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-3: lecturas, política común, IDs y config — área: app (`sui/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** que la app lea el lobby y las partidas de forma acotada, reintente solo cuando sirve y
termine con un "no hay más" honesto, **para** no quedarme mirando una búsqueda infinita ni un error que se repite solo.
**No entrega:** hooks ni UI.

### 2. Contexto
- **Precondición:** TASK-1 sin STOP contingente (o STOP resuelto por el usuario), con las constantes calibradas, y
  **P-1 confirmada por el usuario** (este task asume la opción (a)).
- Poda del fullnode público (M-4): piso ≈ 14,6 días detrás de la punta y en movimiento; por debajo, `getTransaction` y
  `getCheckpoint` dan `NOT_FOUND` y `ListEvents` termina en error (`list_events.rs` @ `testnet-v1.83.0:179-190`); códigos
  exactos en P7. `GetServiceInfoResponse.lowestAvailableCheckpoint` (`ledger_service.d.mts`, campo 6).
- `nodeInfo.ts:24-39` (corte con `AbortController` + `setTimeout`, comentario de por qué no `AbortSignal.timeout`).
- Transporte: un abort con razón `AbortError` llega como `RpcError` `CANCELLED`; un abort con un `Error` propio, como
  `INTERNAL` (`@protobuf-ts/grpcweb-transport/build/es2015/grpc-web-transport.js:101-110`).
- `config.ts:64-130` y la regla 3 de "Compatibilidad" de `contracts/README.md` (validar lo que se usa, `schemaVersion` 1,
  ignorar claves desconocidas). `publishTxDigest` es uno de los 14 campos obligatorios de la v1 (base58, 32-44).

### 3. Qué implementar
- **`config.ts`:** `AppConfig.publishTxDigest`, validado con `isValidTransactionDigest` de `@mysten/sui/utils`, con el mismo
  mensaje por campo de los demás (`fieldError`, formato "digest base58 de transacción"). Comentario: el JSON de despliegue
  alimenta también la cota inferior del lobby (M-1); es un campo de la "publicación original", no cambia en un upgrade.
- **`readPolicy.ts`:**
  - `withReadTimeout(signal, call)`: crea un `AbortController` de corte con `setTimeout(READ_TIMEOUT_MS)` (limpiado en
    `finally`), combina con `AbortSignal.any`, ejecuta `call(abort)`; si falla **y** venció el corte propio, lanza
    `ReadTimeoutError` (con `cause`); si falla porque abortó `signal` (TanStack), relanza el error original.
  - `isTransientReadError`: `ReadTimeoutError`, `NotYetCheckpointedError`, o `error instanceof RpcError` (H-3) con
    `code` ∈ {`UNAVAILABLE`, `INTERNAL`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `UNKNOWN`, `ABORTED`}. Nada más (no `CANCELLED`, `NOT_FOUND`,
    `INVALID_ARGUMENT`, ni los demás errores de `readErrors.ts`, entre ellos `HistoryPrunedError`, ni `ObjectError`/`TransactionError`).
  - `shouldRetryRead(failureCount, error)` = `failureCount < READ_MAX_RETRIES && isTransientReadError(error)`;
    `readRetryDelay(attempt)` = `min(READ_RETRY_BASE_MS * 2 ** attempt, READ_RETRY_MAX_MS)` (1 s, 2 s).
- **`nodeInfo.ts`:** `NodeInfo` suma `lowestAvailableCheckpoint` (`response.lowestAvailableCheckpoint ?? null`); usar
  `withReadTimeout`; mismo mensaje visible ("El nodo no respondió en 10 s") y mismos tests en
  verde. `NODE_STATUS_TIMEOUT_MS` se elimina en favor de `READ_TIMEOUT_MS` (actualizar sus usos y tests) o queda como alias
  documentado; declararlo.
- **`readStatus.ts`:** `deriveReadStatus({ status, fetchStatus, failureCount, error })`: `fetchStatus === 'paused'` ⇒
  `paused`; `fetchStatus === 'fetching' && failureCount > 0` ⇒ `retrying` (`attempt = failureCount + 1`, `max =
  READ_MAX_RETRIES + 1`); `status === 'error'` ⇒ `error`; `status === 'pending'` ⇒ `loading`; si no, `ready`
  (`refreshing = fetchStatus === 'fetching'`).
- **`ids.ts`:** `parseObjectIdInput(raw)`: `''` ⇒ `null`; si no, `normalizeSuiObjectId(raw)` y `isValidSuiObjectId` ⇒ el
  normalizado o `null`. `sameAddress(a, b)` con `normalizeSuiAddress` en ambos.
- **`transactionInfo.ts`:** `fetchTransactionInfo` con `client.getTransaction({ digest, signal })` dentro de
  `withReadTimeout`; devuelve `timestampMs` y `checkpoint` (string ⇒ `bigint`) de `Transaction` o `FailedTransaction`.
  `TransactionError` ⇒ se relanza (no transitorio). `fetchPublishCheckpoint`: igual, pero `TransactionError` con `reason`
  `notFound` ⇒ `null` (publicación podada, M-4) y `checkpoint` `null` ⇒ `NotYetCheckpointedError` (NIT-2).
  `fetchCheckpointTime`: crudo `client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber',
  sequenceNumber }, readMask: { paths: ['sequence_number', 'summary.timestamp'] } }, { abort })` (paths a confirmar en
  P7) ⇒ milisegundos o `null`.
- **`gameDetail.ts`:** `fetchGame` con `client.getObject({ objectId, include: { content: true, previousTransaction:
  true } })`; `ObjectError` con `reason` `notFound`/`deleted` ⇒ `GameNotFoundError`; `type` ajeno ⇒ `NotAGameError`
  (antes de parsear); el resto por `parseGameObject`.
- **`lobby.ts`** (DL-2, DL-3, M-1, M-2, M-4, H-1/H-2/H-4):
  0. **Cota (M-4):** al inicio de cada página, `fetchNodeInfo(client, signal)` ⇒ piso; `lobbyLowerBound({
     publishCheckpoint, nodeFloor })`: si el piso es > 0, `floorBound = piso + LOBBY_FLOOR_MARGIN_CHECKPOINTS`; la cota es
     el mayor entre `publishCheckpoint` y `floorBound` (`kind` = de cuál salió; ambos ausentes ⇒ `0n`, `'none'`). Se usa
     como `startCheckpoint` en todos los pedidos de esa página y se devuelve en `lowerBound`.
  1. Por pedido, dentro de `withReadTimeout`: `client.ledgerService.listEvents({ readMask: { paths: ['event_type',
     'contents', 'checkpoint', 'transaction_digest', 'event_index'] }, startCheckpoint, filter: { terms: [{ literals: [{
     negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType: gameEventType(pkg, 'GameCreated') } } }]
     }] }, options: { limit: LOBBY_EVENTS_PER_REQUEST, ordering: GrpcTypes.Ordering.DESCENDING, before } }, { abort })`
     (el filtro replica `toGrpcEventFilter` de `dist/grpc/filters.mjs`; **sin** `sender` en el `readMask`).
  2. Recorrer `call.responses` con `for await`: cada `event` ⇒ `RawGameEvent` (`eventType` con `normalizeStructTag`);
     guardar el **último** `watermark.cursor` (punto seguro de reanudación) y el `end.reason`. Sin `QueryEnd` ⇒
     `ReadDataError('malformed')`.
  3. `hasNextPage` = `reason ∈ {ITEM_LIMIT, SCAN_LIMIT}`; `CHECKPOINT_BOUND`, `LEDGER_TIP` o `CURSOR_BOUND` ⇒ `false`
     (`end: 'bound'`). **`UNKNOWN` o cualquier valor no listado ⇒ `ReadDataError('malformed')`** (NIT-1).
  3b. **Piso a mitad del escaneo (M-4):** si un pedido falla con un `RpcError` que no sea `CANCELLED`, se relee
     `fetchNodeInfo`; si el piso nuevo es mayor que la `startCheckpoint` usada, el error se convierte en
     `HistoryPrunedError`, que el bucle captura: se descartan los eventos de ese pedido, la página devuelve lo reunido en
     los pedidos anteriores con `hasNextPage: false` y `end: 'history_pruned'`, y `lowerBound.kind` pasa a `'node_floor'`.
     Si el piso no explica el error, se relanza el original (y la política decide si se reintenta). El código medido en
     P7 se documenta en un comentario; la decisión no depende de él.
  4. **M-2:** si el cursor final es igual al `before` enviado (comparación de bytes) y `hasNextPage` es `true` ⇒
     `PaginationStalledError` (no transitorio). `endCursor` `null` con `hasNextPage` `true` ⇒ mismo error.
  5. Bucle acotado: repetir con `before = endCursor` mientras `hasNextPage`, haya menos de `LOBBY_PAGE_TARGET`
     candidatas y no se hayan hecho `LOBBY_MAX_REQUESTS_PER_PAGE` pedidos.
  6. Cada evento: `parseGameCreated`; si falla ⇒ ítem `unreadable` (`gameId: null`, su `txDigest`); si `opponent` no es
     `null` ⇒ se descarta; si no, es candidata.
  7. `client.getObjects({ objectIds, include: { content: true }, signal })` (dentro de `withReadTimeout`) de las
     candidatas: `ObjectError` ⇒ se omite; `parseGameObject` falla ⇒ `unreadable` con su `gameId`; `pending` ⇒ ítem
     `game`; terminal ⇒ se omite. Orden = el de los eventos.
  8. Cursores hacia afuera en base64 (`toBase64`/`fromBase64` de `@mysten/sui/utils`) para que `pageParam` sea
     serializable.
  9. Clientes acotados por tipo (ARQ-3): `Pick<SuiGrpcClient, 'ledgerService' | 'getObjects'>`, etc.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/{readPolicy,readStatus,ids,transactionInfo,gameDetail,lobby}.ts` y sus tests (nuevos);
  `app/src/sui/nodeInfo.ts` + test; `app/src/sui/config.ts` + `config.test.ts`; y, **solo para sumar `publishTxDigest`** a
  sus `AppConfig` literales, `App.test.tsx`, `Header.test.tsx`, `NetworkBadge.test.tsx`, `useNodeStatus.test.tsx`,
  `dappKit.test.ts`.
- **NO tocar:** hooks, componentes, páginas, providers (TASK-4/5); `networks.ts`, `dappKit.ts`.

### 5. Tests obligatorios
- `config`: la fixture real expone `publishTxDigest`; falta o formato inválido ⇒ error que nombra el campo (sumar
  `publishTxDigest` a los casos de `config.test.ts:170-200`); el test "ignores unknown keys and absent unused fields"
  (`:89-93`) suma `publishTxDigest` al mínimo (ahora se usa) y sigue ignorando `futureField`.
- `withReadTimeout`: corte a los 10 s con timers falsos ⇒ `ReadTimeoutError` y `shouldRetryRead(0, e) === true`; abort de
  la señal externa ⇒ error original (`RpcError` `CANCELLED` o el que dé el mock) y `shouldRetryRead(0, e) === false` (un
  test cada uno, NIT-2); el timer se limpia (sin timers pendientes).
- `shouldRetryRead`: tabla por código de `RpcError` (incluido `CANCELLED` ⇒ no), por clase de `readErrors.ts`, por
  `ObjectError`/`TransactionError`, y tope de intentos. `readRetryDelay`: 1000, 2000, 4000 (tope).
- `deriveReadStatus`: loading, retrying (intento 2 y 3 de 3), paused, error, ready y refreshing.
- `parseObjectIdInput`: `''`, forma corta, mayúsculas, 64 hex, 65 hex, no hex, con espacios; `sameAddress`.
- `fetchTransactionInfo`: valor y `checkpoint` como `bigint`; `timestampMs` `null`; `TransactionError`.
- `fetchGame`: ok (fixture), no existe, tipo ajeno, `owner` no compartido, datos ilegibles.
- `lobby` (mock de `ledgerService.listEvents` que devuelve `{ responses }` asíncrono con frames armados desde la fixture y
  `rawListEventsPage`): orden descendente preservado; invitaciones y terminales fuera; **`startCheckpoint` y `before`
  enviados** en cada pedido; pedidos vacíos con `SCAN_LIMIT` seguidos; corte por objetivo; **nunca más de
  `LOBBY_MAX_REQUESTS_PER_PAGE` pedidos** con un mock que siempre da `SCAN_LIMIT`; **`CHECKPOINT_BOUND` ⇒ `hasNextPage:
  false`** (también con 0 ítems); **cursor repetido ⇒ `PaginationStalledError`** (M-2) y `endCursor` `null` con
  `SCAN_LIMIT` ⇒ el mismo error; sin `QueryEnd` ⇒ `ReadDataError`; `ObjectError` omitido; `GameCreated` ilegible y objeto
  ilegible entre filas sanas ⇒ ítems `unreadable` y las sanas siguen; el `readMask` no pide `sender`; **`reason`
  `UNKNOWN` y un valor fuera del enum ⇒ `ReadDataError('malformed')`** (NIT-1).
- **Poda (M-4):** `lobbyLowerBound` (publicación > piso + margen ⇒ `'publish'`; piso + margen > publicación ⇒
  `'node_floor'`; publicación `null` ⇒ piso; piso 0 o `null` ⇒ publicación sin margen; ambos `null` ⇒ `'none'`);
  `fetchLobbyPage` con **publicación podada** (`publishCheckpoint` `null`) ⇒ `startCheckpoint` = piso + margen y
  `lowerBound.kind` `'node_floor'`; **error de piso a mitad del escaneo** (primer pedido con eventos, el segundo falla y la
  relectura muestra un piso mayor) ⇒ solo los ítems del primer pedido, `hasNextPage: false`, `end: 'history_pruned'`, sin
  ítems del pedido fallido; el mismo error con un piso que **no** se movió ⇒ se relanza el original; el piso se relee en
  cada página.
- `fetchPublishCheckpoint`: valor; `TransactionError` `notFound` ⇒ `null`; `checkpoint` `null` ⇒
  `NotYetCheckpointedError` y `shouldRetryRead(0, e) === true` (NIT-2). `fetchCheckpointTime`: valor y `null`.
- `nodeInfo`: `lowestAvailableCheckpoint` presente y ausente.
- Los tests de `nodeInfo` siguen en verde con el mismo mensaje visible.

### 6. Smoke
No aplica (lo cubre el smoke del ciclo).

### 7. Criterios de aceptación
Toda llamada al SDK pasa por `withReadTimeout`; ningún bucle sin cota; ningún `useEffect`; capas; gate verde con el delta
de tests reportado.

### 8. Al terminar
Reporte §5, con las constantes calibradas y su origen (tabla de P5). Sin commits.

---

## TASK-4: hooks y política en el `QueryClient` — área: app (`hooks/`, `providers/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** que el lobby, el detalle y el indicador de red compartan la misma forma de cargar, reintentar
y cancelar, **para** ver siempre en qué está cada lectura ("reintentando", error, listo). **No entrega:** UI.

### 2. Contexto
- `useNodeStatus.ts:10-19` y su test (`useNodeStatus.test.tsx`, patrón de mocks y `advance`, `:56-59`); el test débil del
  `signal` (`:119-124`) se reemplaza (LIM-11 de #9).
- `AppProviders.tsx:27` (`new QueryClient()` sin opciones). `useWalletAccount` da la dirección conectada.

### 3. Qué implementar
- **`queryKeys.ts`** (DL-13) con la red como primer segmento después de `'sui'`; `useNodeStatus` la usa.
- **`AppProviders`:** `new QueryClient({ defaultOptions: { queries: { retry: shouldRetryRead, retryDelay:
  readRetryDelay } } })`.
- **`usePublishCheckpoint()`** (interno de `useLobby` o exportado, a criterio): `useQuery` con
  `queryKeys.txInfo(network, publishTxDigest)` y `fetchPublishCheckpoint`, `staleTime: Infinity`. Devuelve `bigint` o
  `null` (podada: **no** es error, M-4); `NotYetCheckpointedError` se reintenta por la política (NIT-2).
- **`useLobby()`:** `useInfiniteQuery` con `queryKeys.lobby(network, originalPackageId)`, `enabled` cuando `usePublishCheckpoint` terminó
  con éxito (valor **o `null`**), `initialPageParam: null`, `queryFn: ({ pageParam, signal }) => fetchLobbyPage(client, {
  originalPackageId, publishCheckpoint, before: pageParam, signal })`, `getNextPageParam: (p) => p.hasNextPage ? p.endCursor
  : undefined`, `refetchOnWindowFocus: false`, sin `refetchInterval`. Aplana y deduplica por `gameId`; marca `isMine` con
  `sameAddress(creator, cuenta)`. Devuelve `{ items, status: ReadStatus, hasNextPage, isFetchingNextPage, nextPageError,
  stalled: boolean, lowerBound, end, loadMore, refresh }` (`lowerBound` y `end` de la última página) con `refresh` = `queryClient.resetQueries({ queryKey })` y `stalled` = el error
  de la página siguiente es `PaginationStalledError`.
- **`useGame(rawId)`:** `parseObjectIdInput`; `null` ⇒ `{ kind: 'invalid_id' }` sin consulta (`enabled: false`); si no,
  `useQuery` con `queryKeys.game(network, id)`, `fetchGame`, `refetchInterval: GAME_REFETCH_MS`.
- **`useCheckpointTime(sequenceNumber | null)`:** `useQuery` sobre `fetchCheckpointTime`, `staleTime: Infinity`,
  `enabled` solo con valor (`queryKeys.checkpointTime`).
- **`useTransactionTime(digest | null)`:** `useQuery` con `queryKeys.txInfo`, `staleTime: Infinity`, `enabled: digest !==
  null`; devuelve `timestampMs | null` y su `ReadStatus`.
- **`useNodeStatus`:** clave central; `deriveNodeStatus` recibe además `fetchStatus` y `failureCount` y `NodeStatus` suma
  `{ kind: 'retrying'; attempt; max }` (el error final sigue siendo `offline`).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/hooks/{queryKeys,useLobby,useGame,useTransactionTime,useCheckpointTime}.ts` y sus tests (nuevos);
  `useNodeStatus.ts` + test; `app/src/sui/nodeInfo.ts` + test (solo `deriveNodeStatus` y `NodeStatus`);
  `app/src/providers/AppProviders.tsx`.
- **NO tocar:** componentes y páginas (TASK-5; `NetworkBadge` muestra `retrying` en TASK-5, así que en este task su
  `switch` puede necesitar el caso nuevo para compilar: si `tsc` lo exige, se agrega el texto mínimo y se declara).

### 5. Tests obligatorios
(Patrón de `useNodeStatus.test.tsx`: `useCurrentClient` y `useAppConfig` mockeados, timers falsos, `QueryClient` con la
política real salvo donde se indique.)
- **`cancelQueries` (LIM-11):** con un mock colgado que solo rechaza al abortarse, `await act(() =>
  queryClient.cancelQueries())` deja `aborted === true` en la señal que recibió el SDK y antes no lo estaba (el corte de
  10 s no venció): en `useGame` y en `useNodeStatus`.
- Reintento visible: primer intento `RpcError` `UNAVAILABLE` ⇒ `retrying` (intento 2 de 3) ⇒ éxito ⇒ `ready`;
  `NOT_FOUND`, `GameNotFoundError` y `ReadDataError` ⇒ `error` **sin** segunda llamada; corte por tiempo ⇒ se reintenta.
- `useLobby`: espera a `usePublishCheckpoint` (antes no llama a `listEvents`); **publicación podada (`NOT_FOUND`) ⇒ el
  lobby carga igual** con la cota del piso (regresión del MAJOR-1: nunca queda deshabilitado);
  `NotYetCheckpointedError` ⇒ `retrying` y luego carga; primera página; `loadMore` envía el
  `endCursor`; `refresh` deja una sola página; `isMine` con la dirección en otro formato; sin cuenta, ningún `isMine`;
  deduplicación; `PaginationStalledError` en la página siguiente ⇒ `stalled: true` y sin `hasNextPage` útil.
- `useGame`: ID inválido no llama al cliente; ID en mayúsculas consulta el normalizado.
- `useTransactionTime(null)` y `useCheckpointTime(null)` no consultan; una hora podada (`TransactionError`) deja la fila
  en "—" sin reintentos.
- `useNodeStatus` pasa por `retrying` antes de `offline` con la política real.

### 6. Smoke
No aplica (lo cubre el smoke del ciclo).

### 7. Criterios de aceptación
Ningún hook pide datos fuera de TanStack; todas las queries comparten la política; las claves salen solo de
`queryKeys.ts`; gate verde.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-5: lobby, detalle y textos — área: app (`components/`, `pages/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** ver el lobby en la portada y el detalle de una partida en su propia dirección, con mensajes
claros mientras carga, reintenta o falla, **para** entender qué hay y qué pasó sin leer la consola. **No entrega:**
acciones (crear, aceptar…).

### 2. Contexto
`HomePage.tsx`, `App.tsx:19-27`, `Header.tsx:12`, `NetworkBadge.tsx:5-24`; pruebas de componentes con hooks mockeados
(`Header.test.tsx`, `App.test.tsx`, con el `ConnectButton` sustituido por un botón). `explorer.ts` (`explorerObjectUrl`,
`null` en localnet).

### 3. Qué implementar
- **`ReadState`:** `loading` "Cargando…"; `retrying` "Reintentando… (intento n de m)"; `paused` "Sin conexión a internet:
  se reintentará al volver"; `error` con `readErrorMessage` y botón "Reintentar".
- **`LobbyList`** (usa `useLobby`): filas con apuesta (`formatMist` + " SUI"), comisión (`formatBps`), creador
  (`shortAddress`, completo en `title`), hora (`useTransactionTime` por fila: `formatTimestamp` o "—"), marca "tuya" y link a
  `/game/<id>`; fila `unreadable` "Partida ilegible" (con el ID abreviado y link si se conoce; sin montos ni hora).
  Botones "Actualizar" (`refresh`) y "Cargar más" / "Buscar más atrás" (deshabilitado mientras carga). Estados:
  - sin filas y `hasNextPage` `false` con `lowerBound.kind` `'publish'` o `'none'` ⇒ **"No hay partidas abiertas"**
    (alcanzable gracias a M-1);
  - sin filas y `hasNextPage` `false` con `lowerBound.kind` `'node_floor'` (o `end` `'history_pruned'`) ⇒ **"No hay
    partidas abiertas en el historial disponible del nodo (desde <fecha>)"**, con la fecha de
    `useCheckpointTime(lowerBound.checkpoint)` (si falla, sin "(desde …)"); con filas y la misma cota, al final de la
    lista la nota "Solo se muestra el historial disponible del nodo (desde <fecha>)" (P-1 (a));
  - sin filas y `hasNextPage` `true` ⇒ "Sin partidas abiertas en lo revisado" + "Buscar más atrás";
  - error de la página siguiente ⇒ mensaje debajo de las filas ya cargadas; si `stalled`, el mensaje de
    `PaginationStalledError` **y ningún** "Buscar más atrás"/"Cargar más" (solo "Actualizar") (M-2).
- **`GameDetail`** (presentacional, recibe `Game` + hora): estado ("Abierta", "Invitación a <dir>", "Cancelada",
  "Resuelta"), creador, oponente o "abierta", apuesta, comisión; en `Pending`, la estimación "Pozo X · comisión Y · al
  ganador Z" con `resolutionAmounts`; en `Resolved`, aceptante, ganador, pozo, comisión cobrada y pago (misma función, con
  una nota corta "según la fórmula del contrato"); "Última actividad: <hora>"; link al explorador del objeto si la red lo
  tiene.
- **`GameDetailPage`** (`/game/:id`): `useParams().id` ⇒ `useGame`; `invalid_id` ⇒ "ID de partida inválido" (sin
  consulta); errores con `ReadState`; datos ⇒ `GameDetail` + `useTransactionTime(previousTransaction)`.
- **`HomePage`:** intro actual + `LobbyList`. **`App.tsx`:** ruta `game/:id`.
- **`Header`:** `<ConnectButton>Conectar wallet</ConnectButton>` (DL-11, por defecto). **`NetworkBadge`:** `retrying` ⇒
  "reconectando… (intento n de m)".

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/components/{ReadState,LobbyList,GameDetail}.tsx` + tests (nuevos);
  `app/src/pages/GameDetailPage.tsx` + test (nuevo); `HomePage.tsx`, `App.tsx`, `App.test.tsx`, `Header.tsx`,
  `Header.test.tsx`, `NetworkBadge.tsx`, `NetworkBadge.test.tsx`; `app/src/index.css` solo si hace falta.
- **NO tocar:** `sui/`, `hooks/` (salvo un bug encontrado aquí: se reporta y se corrige como desviación declarada).

### 5. Tests obligatorios
(Hooks mockeados, patrón `Header.test.tsx`.)
- `LobbyList`: cargando, reintentando, error, "No hay partidas abiertas", **"No hay partidas abiertas en el historial
  disponible del nodo (desde <fecha>)"** (y sin fecha si `useCheckpointTime` falla), nota de historial con filas, "Sin partidas abiertas en lo revisado" con
  "Buscar más atrás", filas con y sin "tuya", fila ilegible entre filas sanas, hora y "—", "Cargar más" deshabilitado
  mientras carga, error de la página siguiente con filas visibles, **`stalled` sin botón de seguir** (M-2).
- `GameDetail`: `Pending` abierta, `Pending` invitación, `Cancelled`, `Resolved` con los montos del `GameResolved` de la
  fixture.
- `GameDetailPage`: ID inválido (el hook devuelve `invalid_id`), no existe, no es una partida, datos ilegibles, válido.
- `App.test.tsx`: `/game/:id` renderiza la página.
- `Header`: el mock del `ConnectButton` renderiza sus `children` y aparece "Conectar wallet".
- `NetworkBadge`: `retrying`.

### 6. Smoke
El del ciclo (abajo), después de TASK-6.

### 7. Criterios de aceptación
Componentes sin lógica de negocio ni imports de `@mysten/*` salvo `dapp-kit-react/ui`; texto plano (sin
`dangerouslySetInnerHTML`); estados de carga, vacío y error de ambas vistas con test; gate verde.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-6: docs del ciclo — área: docs

### 1. Historia de usuario del task
**Como** owner o próximo agente, **quiero** que los docs digan cómo lee la app y dónde están las piezas nuevas, **para**
mantener #11-#14 sin redescubrir #10. **No entrega:** código.

### 2. Contexto
`app/README.md` (mapa de `app/src/sui/`, "Reglas para las lecturas y los IDs", "Indicador de red", "Wallet",
"Pendientes"); `agents.md` §2 y §5; `documents/STATUS.md`; `contracts/README.md` (ya tocado en TASK-1).

### 3. Qué implementar
- `app/README.md`:
  - mapa de `app/src/sui/` con los archivos nuevos;
  - reglas de lectura: BCS, `originalPackageId`, cota inferior por `publishTxDigest` (el JSON de despliegue alimenta
    también ese campo, M-1), paginación acotada y calibrada (números de P5), cursor repetido = error, refresco manual del
    lobby y 15 s del detalle, política de reintentos y corte de 10 s;
  - **montos de una resuelta = fórmula de la v1; un upgrade que la cambie conserva la vieja para las partidas viejas
    (`agents.md` §5)**;
  - **historial del nodo (P-1 (a)):** en testnet el lobby solo cubre el historial que conserva el fullnode público
    (≈ 14 días; piso de `lowestAvailableCheckpoint`); las partidas abiertas más viejas no aparecen aunque sigan `Pending`
    (se ven por su ID en `/game/:id`, que lee el objeto); la hora de una transacción podada sale como "—";
  - latencia del indicador recalculada (≤ ~25 s con el nodo caído, ≤ ~55 s colgado);
  - wallet: botón en español y modal/menú del kit en inglés (DL-11, D-20261102-04 (2));
  - cómo recapturar las fixtures.
- `agents.md`: §2 (layout: `contracts/fixtures/` existe desde #10; `app/scripts/`); §5, una fila o línea con la regla de
  sincronización de la fórmula de `resolutionAmounts` y de `MAX_FEE_BPS` si alguna vista lo replica.
- `documents/STATUS.md`: baseline de la app tras el ciclo (tests por archivo, bundle), fila de #10 "🚧 en curso" con lo
  hecho, pendientes de #9 resueltos, DL-11 en "Pendientes del usuario" y P-1 con la respuesta del usuario.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/README.md`, `agents.md`, `documents/STATUS.md`.
- **NO tocar:** código; `documents/ESTANDARES.md` y `DECISIONES.md` (los cambia el orquestador si corresponde).

### 5. Tests obligatorios
Ninguno; gate completo de la app en verde (sin cambios de código).

### 6. Smoke
No aplica.

### 7. Criterios de aceptación
`grep -rn "se decide en #10\|se definen en #10\|lo fija #10\|la elige #10" agents.md app/README.md contracts/README.md
documents/STATUS.md` sin resultados vigentes; sin rutas personales; los números citados coinciden con los reportes.

### 8. Al terminar
Reporte §5. Sin commits. Después, el MID genera `documents/SMOKE_LOBBY.md`.

---

## Smoke del ciclo (después de TASK-6; el MID genera `documents/SMOKE_LOBBY.md`, AGENTE_MID §M5)

- **Red:** localnet aislada (§2), publicación variante B, una sola localnet en la máquina.
- **Cliente:** `VITE_SUI_NETWORK=localnet npm run dev -w app` con `app.env`; pasos 🌐 por **Chrome headless + CDP con
  perfil desechable** (`--user-data-dir=<SMOKE_DIR>/chrome-profile`, `HOME`/`XDG_*` dentro de `<SMOKE_DIR>`, depuración
  solo en 127.0.0.1, cliente CDP propio en Node 26 sin dependencias), como en #9. Nunca el navegador ni el perfil del
  usuario.
- **Pasos previstos** (la tabla definitiva y el resultado de cada paso van en el SMOKE, llenados durante la corrida):
  1. `update_fee_rate` 250; el lobby muestra **"No hay partidas abiertas"** (la cota de M-1 cierra la búsqueda).
  2. `A` crea tres abiertas (montos distintos) y una invitación a `C`; "Actualizar" ⇒ 3 filas, la más reciente primero,
     sin la invitación; apuesta, "2.5 %" y hora = `timestampMs` de `suic tx-block` de cada `GameCreated`.
  3. `A` cancela una ⇒ sigue visible hasta "Actualizar" y luego desaparece (criterio del issue).
  4. `#/game/<cancelada>` ⇒ "Cancelada", creador, apuesta, comisión (criterio del issue).
  5. `B` acepta otra ⇒ su detalle: "Resuelta", ganador = `winner` del `GameResolved` de `suic tx-block`; pozo, comisión y
     pago iguales al evento; sale del lobby tras "Actualizar".
  6. `#/game/<ID en mayúsculas>` ⇒ el mismo detalle (y la forma corta si algún ID empieza con ceros).
  7. `#/game/xyz` ⇒ "ID de partida inválido" y **ningún** `POST …/BatchGetObjects` en CDP `Network.*`.
  8. ID válido inexistente ⇒ "no existe"; ID de la House ⇒ "no es una partida".
  9. PTB con `LOBBY_PAGE_TARGET` + 5 `create_game` abiertas ⇒ `LOBBY_PAGE_TARGET` filas + "Cargar más" ⇒ el resto, sin
     duplicados; al agotar, sin botón de seguir.
  10. Botón del kit "Conectar wallet" (shadow DOM vía CDP); conectar la burner. La marca "tuya" no se puede verificar en el
      navegador en #10 (la burner no crea partidas sin #11): la cubren los tests de TASK-4/5.
  11. Último: con el lobby abierto, `kill` de la red ⇒ "Actualizar" ⇒ "Reintentando… (intento 2 de 3)" y luego error con
      "Reintentar"; el badge pasa por "reconectando…" a "sin conexión" en ≤ ~25 s (`sui start` sale con 144: esperado).
  12. Cierre del paso 7 de `agents.md` §3 (`~/.sui/` idéntico a la línea base, `<SMOKE_DIR>` borrado, sin
      `contracts/deployments/`, `Move.lock` sin delta, árbol limpio).
- **Consistencia eventual:** tras cada transacción, esperar a que el evento esté en un checkpoint antes de "Actualizar"
  (anotar la espera; no es falla).
- **Poda (M-4):** la localnet no poda, así que el texto del historial disponible no aparece en el smoke; lo cubren los
  tests de TASK-3/4/5 y la evidencia de P7 en testnet. El paso 1 verifica además que la cota es la publicación ("No hay
  partidas abiertas", sin "historial disponible").

## Al terminar el ciclo

El MID propone el body del PR (`Closes #10`; decisiones DL-1..13, M-1..4 y H-1..4; P-1 y DL-11 con la respuesta del usuario; gates;
smoke PASA/TOTAL; pendientes). Mensaje de commit de esta versión: `docs: address MAYOR review of #10 handoff, v1.1 (#10)`.
