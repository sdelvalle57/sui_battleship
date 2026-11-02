# PLAN_LOBBY v1
> Issue: #10 (hereda pendientes de #9: PR #36 y `documents/STATUS.md`; fixtures de D-20261031-01) | Áreas: app / contracts (solo
> `contracts/fixtures/` y docs) / docs | Branch: `feature/issue-10-lobby` (desde `master` `dfb11ce`) | Fecha: 2026-11-02

## Historia de usuario

**Como** jugador que entra a la app sin saber qué partidas hay, **quiero** ver la lista de partidas abiertas (las más
recientes primero, con apuesta, comisión, creador y hora, y las mías marcadas) y abrir el detalle de cualquier partida
por su ID (estado, jugadores, apuesta, comisión y, si terminó, ganador, pago y comisión cobrada), **para** elegir a qué
partida entrar y saber en qué quedó una partida sin depender de la CLI ni de un explorador.

**Scope en una frase:** lobby de partidas abiertas y vista de detalle `/game/:id`, de solo lectura, armadas con eventos y
objetos leídos por gRPC, con una política de reintentos común a todas las lecturas.
**Lo que NO entrega:** crear, cancelar o rechazar (#11), aceptar y el resultado en vivo (#12), "mis partidas" e
invitaciones recibidas (#13), panel admin (#14), indexador propio, ni ningún cambio del contrato.

## Contexto y alcance

**Qué existe hoy (`master` `dfb11ce`):**

- Contrato cerrado (#5, #6): un `Game` compartido por partida (`contracts/sources/game.move:31-47`), enum `GameState`
  (`:50-54`) y los eventos `GameCreated`, `GameCancelled` y `GameResolved` (`:57-84`). **No existe `GameAccepted`**
  (D-20261030-16 D4): aceptar emite solo `GameResolved`. El objeto terminal se conserva (D-20261030-15 D3), así que el
  detalle de una partida terminada se lee siempre del objeto.
- App (#9): `app/src/sui/` con `config.ts` (expone `originalPackageId`, `config.ts:23-24`), `format.ts` (`formatMist`,
  `shortAddress`), `nodeInfo.ts` (corte de 10 s por intento con `AbortController` + `setTimeout`, `:24-39`), `dappKit.ts`
  (`SuiGrpcClient`); hooks `useNodeStatus` (TanStack con los reintentos por defecto, `useNodeStatus.ts:13-17`) y
  `useWalletAccount`; `AppProviders` crea `new QueryClient()` sin opciones (`AppProviders.tsx:27`); router por hash con
  `/` y `*` (`App.tsx:19-27`); `Header` con `<ConnectButton />` sin texto propio (`Header.tsx:12`). Capas por ESLint
  (`app/eslint.config.js:47-117`). Baseline: 142 tests en 12 archivos, lint 0, typecheck 0, build 826 kB (STATUS).
- Fixtures: `config.test.ts:4-8` ya importa una fixture de `contracts/` con `import.meta.glob` eager; ese es el patrón.

**Pendientes heredados que absorbe este plan** (STATUS "Siguiente", PR #36 "Pendientes", `app/README.md`):

| Pendiente | Dónde se resuelve |
|---|---|
| Política de reintentos y estado "reintentando" (`fetchStatus`/`failureCount`) para todas las lecturas | DL-5, TASK-3/4/5 |
| Test de que el `signal` de TanStack cancela el intento (`cancelQueries`), LIM-11 de TASK-6 de #9 | TASK-4 |
| Textos del `ConnectButton` en inglés | DL-11, TASK-5 |
| Hora de creación desde `getTransaction(...).timestampMs` | DL-6, TASK-3/4/5 |
| Paginar `listEvents` por `hasNextPage` (páginas cortas) | DL-3, TASK-3 |
| Normalización de IDs en el borde de entrada (D12 de #9, SEG-9) | DL-8, TASK-3/5 |
| Fixtures de lectura gRPC (D-20261031-01) | DL-10, TASK-1 |
| Tipos filtrados por `originalPackageId` | DL-9, TASK-2/3 |

**APIs verificadas en el SDK instalado** (`node_modules/@mysten/sui` 2.37.0, `npm ci` con Node 26):

- `listEvents({ filter, limit, after, before, order, signal })` (`dist/client/types.d.mts:529-575`,
  `dist/grpc/core.mjs:370-412`): **no hay `cursor`**; la página siguiente en orden descendente se pide con
  `before: endCursor`. `limit` por defecto 50 y el servidor gRPC **trunca en silencio** a su máximo; una consulta
  limitada por escaneo puede devolver **menos de `limit` (incluso 0) con `hasNextPage: true`**. Filtro: exactamente uno de
  `sender`, `emitModule` o `eventType`; un `eventType` en hex no consulta MVR (`dist/client/mvr.mjs:100-102`). Cada
  `EventEntry` trae `eventType` normalizado, `bcs`, `json`, `checkpoint`, `transactionDigest` y `eventIndex`, **sin hora**.
- `getObjects({ objectIds, include: { content, json, previousTransaction }, signal })` (`dist/grpc/core.mjs:39-97`):
  `batchGetObjects` en lotes de 50; devuelve `(Object | Error)[]` y un inexistente llega como `ObjectError`
  (`reason: 'notFound'`) en su posición, sin lanzar. `getObject` lanza ese `ObjectError`. `type` llega normalizado
  (`normalizeStructTag`); `owner` compartido = `{ $kind: 'Shared', Shared: { initialSharedVersion } }`
  (`types.d.mts:843-849`). `content` = BCS de los campos del struct Move; `json` = render del nodo, con la advertencia
  del propio SDK de que su forma puede variar entre implementaciones (`types.d.mts:62-68, 147-155`).
- `getTransaction({ digest, signal })` → `{ $kind, Transaction | FailedTransaction }` con `timestampMs: number | null`
  (`types.d.mts:276-320`); inexistente → `TransactionError('notFound')` (`dist/grpc/core.mjs:229-242`).
- `ObjectError` y `TransactionError` se exportan desde `@mysten/sui/client`; `normalizeSuiObjectId`, `isValidSuiObjectId`,
  `normalizeSuiAddress` y `normalizeStructTag` desde `@mysten/sui/utils`. `normalizeSuiAddress('')` da el ID cero (válido):
  el vacío se rechaza antes (DL-8).
- Errores del transporte (`@protobuf-ts/grpcweb-transport`): un `fetch` fallido llega como `RpcError` con `code`
  `'INTERNAL'` y el mensaje del navegador; un abort, `'CANCELLED'`; un estado gRPC, su nombre (`'NOT_FOUND'`,
  `'UNAVAILABLE'`…). `@protobuf-ts/*` no es dependencia directa de la app: se reconoce por forma (`code` string), como hace
  el propio SDK (`dist/grpc/core.mjs:26-34`).
- BCS (`@mysten/sui/bcs`), probado con Node 26 sobre el layout de `Game`: `bcs.enum` lanza ante un índice de variante
  desconocido ("Unknown value 3 for enum GameState") y ante bytes truncados, pero **acepta bytes sobrantes** sin error
  (DL-1 exige comprobar el largo). `u64` sale como string y `u16` como número.
- Kit (`@mysten/dapp-kit-core` 1.6.39, `dist/web/index.mjs:1445`): el botón desconectado es `<slot>Connect Wallet</slot>`
  (se reemplaza con children); el modal ("Connect a wallet", "No wallets installed", "Request canceled"…) y el menú de
  cuenta ("Connected accounts", "Copy address"…) tienen textos fijos en inglés, sin API de traducción.

**Fuera de alcance:** filtrar por versión del paquete (`game.version` vs `house.version()`): en la v1 todas las partidas
son versión 1; el filtro llega con el issue de upgrades (R-8). Búsqueda, filtros por monto, orden por apuesta.

## Contrato on-chain

Sin cambios. Se consumen tal cual las tablas de `contracts/README.md` (`Game`, `GameState`, eventos). Sin impacto en la
compatibilidad de upgrade. `app/src/sui/` suma los tipos y parsers que el README ya anuncia (`game.ts` / `events.ts`,
`app/README.md` "Mapa de `app/src/sui/`").

## Flujo de fondos

No aplica: solo lecturas. Ningún camino recibe, retiene ni paga SUI. El detalle muestra montos (`bet`, pozo, comisión,
pago) en MIST como `bigint` y los formatea con `format.ts` (PROY-12).

## Decisiones de diseño (del MID, sin STOP; las revisa el MAYOR)

| # | Decisión | Alternativas descartadas | Motivo |
|---|---|---|---|
| DL-1 | **Formato de lectura = BCS.** `Game` desde `content` de `getObjects` y eventos desde `bcs` de `listEvents`, con esquemas `bcs.struct`/`bcs.enum` en `app/src/sui/` que replican el layout Move. El parser exige el tipo exacto antes de parsear, comprueba que se consumieron **todos** los bytes (re-serializa y compara el largo), convierte `u64` a `bigint` y valida invariantes del contrato (`fee_rate <= 1000`; `stake == bet` en `Pending` y `0` al terminar; `winner ∈ {creator, acceptor}`; en `GameResolved`, `pot == payout + fee`). Variante desconocida, bytes truncados o sobrantes ⇒ error de datos, nunca `Pending` (SEG-10) | (a) `json` del nodo con parser de forma; (b) BCS para objetos y `json` para eventos | El `json` lo arma el nodo y el SDK advierte que su forma puede variar; los fullnodes de testnet se actualizan sin aviso. El layout BCS lo fija el contrato y se congela en #8 (PROY-10). Un solo formato (`contracts/README.md` "Lectura desde la app"). Las fixtures guardan ambos y un test cruza BCS contra `json` |
| DL-2 | **Estado vigente = objeto.** El lobby toma los `game_id` de `GameCreated` y lee los objetos en lote (`getObjects`); se muestran los que tienen `opponent: none` y estado `Pending` en el objeto | Derivar el estado del stream (`Created − Cancelled − Resolved`) | Recomendación del issue: el objeto es la verdad y evita errores de paginación cruzada entre tres streams |
| DL-3 | **Paginación** con `useInfiniteQuery`, descendente, cursor `before = endCursor`. Cada página ("cargar más") hace un **bucle acotado**: hasta `LOBBY_MAX_REQUESTS_PER_PAGE = 4` pedidos de `LOBBY_EVENTS_PER_REQUEST = 50` eventos, y corta antes si junta `LOBBY_PAGE_TARGET = 20` candidatas (`opponent: none`), si `hasNextPage` es `false`, si `endCursor` es `null` o si el cursor no avanza. Luego un `getObjects` con las candidatas. `getNextPageParam` = `hasNextPage ? endCursor : undefined`. Al aplanar se deduplica por `game_id` | (a) un solo pedido por clic (con páginas cortas, muchos clics sin filas); (b) seguir hasta llenar la página (bucle sin cota); (c) `maxPages` (descarta las primeras páginas y la lista "salta") | Criterio del issue ("paginación acotada, sin loops ilimitados") y semántica de páginas cortas del SDK. Peor caso por clic: 4 pedidos de eventos + 2 lotes de objetos |
| DL-4 | **Refresco.** Lobby: sin intervalo y sin refetch al volver el foco (`refetchOnWindowFocus: false`); botón "Actualizar" = `resetQueries` de la query del lobby (vuelve a la primera página; no recarga N páginas). Detalle: `refetchInterval` de 15 s (`GAME_REFETCH_MS`) y refetch al foco | Intervalo en el lobby (refetch secuencial de todas las páginas cargadas); refetch al foco en el lobby | Nota del issue (consistencia eventual: refresco manual y/o intervalo moderado, sin polling agresivo). El detalle es un solo objeto |
| DL-5 | **Reintentos de todas las lecturas** en los `defaultOptions` del `QueryClient` (`AppProviders`), con funciones puras de `app/src/sui/readPolicy.ts`: se reintenta **solo lo transitorio** (`RpcError` por forma con `code` ∈ {`UNAVAILABLE`, `INTERNAL`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `UNKNOWN`, `ABORTED`} y el corte por tiempo propio), **2 reintentos** (3 intentos) con espera de 1 s y 2 s (`READ_MAX_RETRIES`, `READ_RETRY_BASE_MS`, tope `READ_RETRY_MAX_MS = 4000`). No se reintentan `NOT_FOUND`, `INVALID_ARGUMENT`, `ObjectError`/`TransactionError` de "no existe" ni los errores de datos de DL-1. **Corte de 10 s por intento en toda lectura** con un helper compartido extraído de `nodeInfo.ts` (`withReadTimeout`; tercer uso ⇒ LIM-5). **Estado "reintentando"** derivado por una función pura (`deriveReadStatus`: `fetchStatus === 'fetching' && failureCount > 0` ⇒ intento n de 3; `fetchStatus === 'paused'` ⇒ sin red del navegador), también en el indicador de red | (a) defaults de TanStack (3 reintentos para todo, también para "no existe" y datos inválidos); (b) `retry: false` (un corte de red momentáneo pasa a error) | Un dato inválido o un ID inexistente no mejoran reintentando; un nodo caído sí. Latencia del indicador con la política: "sin conexión" en ≤ ~25 s con el nodo caído y ≤ ~55 s con el nodo colgado (hoy ≤ ~27 s / ≤ ~67 s, `app/README.md`) |
| DL-6 | **Hora.** Lobby: cada fila muestra "creada" con `getTransaction(digest del GameCreated).timestampMs`, una query por digest con `staleTime: Infinity` (dato inmutable) que no bloquea la fila ("—" mientras carga o si falla). Detalle: "Última actividad" = `timestampMs` de `previousTransaction` del objeto. Formato con una función pura nueva de `format.ts` | (a) `ledgerService.batchGetTransactions` crudo (un pedido por página, pero API proto sin envoltorio del SDK); (b) sin hora en el lobby; (c) en el detalle, "creada" buscando el `GameCreated` del objeto (no hay filtro por `game_id`: escaneo sin cota) | El objeto no guarda su digest de creación; `previousTransaction` es la última transacción que lo tocó (creación si sigue intacta, la que lo canceló o resolvió si terminó). "Última actividad" es siempre verdad, incluso si una transacción fallida posterior la cambió (lo verifica la sonda P6 de TASK-1). Pedidos por página acotados por el tamaño de página |
| DL-7 | **Montos de una partida resuelta** (pozo, comisión cobrada, pago) calculados con la fórmula del contrato desde `bet` y `fee_rate` del objeto: `resolutionAmounts(bet, feeRate)` = pozo `2 × bet`, comisión `⌊pozo × fee_rate / 10_000⌋`, pago `pozo − comisión` (D-20261030-16 D2/D3), en `bigint`. Un test lo ancla al `GameResolved` real de la fixture. La misma función da el "pozo / comisión / al ganador" estimado de una partida `Pending` (y la reusa #12) | Leer el `GameResolved` de `previousTransaction` (falla si una transacción fallida posterior cambió `previousTransaction`; dos caminos con un fallback) | Una sola fuente, sin pedidos extra, exacta para la v1. Si un upgrade cambiara la fórmula, el issue del upgrade actualiza `app/src/sui/` en el mismo PR (`agents.md` §5) |
| DL-8 | **IDs en el borde de entrada (D12 de #9, SEG-9):** `parseObjectIdInput(raw)` en `app/src/sui/ids.ts`: vacío ⇒ inválido; si no, `normalizeSuiObjectId(raw)` y `isValidSuiObjectId(normalizado)`. `/game/:id` con un ID inválido muestra "ID de partida inválido" **sin** consultar la red (query con `enabled: false`); con uno válido usa el normalizado (acepta mayúsculas y la forma corta `0x…`). La URL no se reescribe. Comparación de direcciones normalizada (`sameAddress`) para marcar "tuya" | Rechazar todo lo que no sea `0x` + 64 hex en minúsculas; reescribir la URL a la forma canónica | Regla de `app/README.md` ("Reglas para las lecturas y los IDs") y SEG-9. Reescribir la URL no aporta seguridad (ARQ-7) |
| DL-9 | **Tipos por `originalPackageId`:** filtro `eventType = <originalPackageId>::game::<Evento>` en `listEvents`; el parser rechaza un objeto cuyo `type` no sea `normalizeStructTag(<originalPackageId>::game::Game)` o cuyo `owner` no sea compartido. `packageId` no se usa en #10 (es el target de llamadas, #11) | Filtrar por `packageId` | Los tipos definidos en la v1 conservan el ID original tras un upgrade (`contracts/README.md`, campo `originalPackageId`) |
| DL-10 | **Fixtures:** un archivo `contracts/fixtures/game-reads.localnet.json` con las respuestas reales de `SuiGrpcClient` (objeto `Pending` abierto, `Pending` invitación, `Cancelled` por el creador, `Cancelled` por rechazo, `Resolved`; eventos `GameCreated` abierta/invitación, `GameCancelled` ×2 y `GameResolved`; `timestampMs` de un `GameCreated`), con `Uint8Array` en base64 y `_meta` (CLI, SDK, fecha, red). Lo escribe un **script commiteado** `app/scripts/capture-read-fixtures.mjs` (Node 26, solo `@mysten/sui` y `node:*`; descubre las partidas por eventos; solo `http://127.0.0.1:9000`), que se corre a mano dentro de la localnet aislada | Script descartable pegado en el reporte; un archivo por variante | Recaptura reproducible al subir la CLI o el SDK, como pide `contracts/README.md` para `scripts/fixtures/`. Un archivo con claves por variante simplifica la importación |
| DL-11 | **`ConnectButton`:** el texto del botón pasa a "Conectar wallet" por el `slot` del kit (`<ConnectButton>Conectar wallet</ConnectButton>`); el modal y el menú de cuenta **quedan en inglés** y se documenta en `app/README.md` | (a) aceptar todo en inglés; (b) UI de conexión propia (lista de wallets, estados de error, accesibilidad, tests) | Sin dependencias nuevas y sin reimplementar el kit; el kit no expone textos del modal. Si el owner quiere todo en español, es un issue aparte |
| DL-12 | **Rutas y alcance de la lista:** lobby en `/` (la `HomePage` suma la lista bajo la intro), detalle en `/game/:id`. El lobby muestra solo partidas abiertas (`opponent: none`) en `Pending`, incluidas las propias (marcadas "tuya"). Las invitaciones, también las dirigidas a la cuenta conectada, no aparecen (#13) | Ruta `/lobby` aparte; mostrar las invitaciones recibidas | Criterios del issue ("las invitaciones dirigidas a terceros no aparecen"; "mis partidas e invitaciones" es #13) |
| DL-13 | **Claves de query centralizadas** en `app/src/hooks/queryKeys.ts` (`nodeInfo`, `lobby`, `game`, `txTime`, todas con la red como prefijo), para que #11 invalide sin repetir literales | Literales por hook (hoy `useNodeStatus.ts:14`) | ARQ-4 y PROY-14 ("invalidar las queries afectadas tras cada transacción") |

## Decisiones abiertas → STOP

**Ninguna.** El issue no deja decisiones abiertas, el contrato no cambia, no hay fondos ni dependencias nuevas, y lo
demás son decisiones internas de diseño (tabla anterior). Único STOP **contingente**: si la sonda P5 de TASK-1 muestra que
el fullnode público de testnet no sirve `ListEvents` en orden descendente con `before` (o no indexa eventos), se para y se
presentan opciones (p. ej. otro endpoint o GraphQL) antes de seguir con TASK-3.

## Tasks (ordenados por dependencia; sin tasks de contratos)

Capas: `sui/` (TASK-2, TASK-3) → `hooks/` + `providers/` (TASK-4) → `components/` + `pages/` (TASK-5). Cada task actualiza
los docs que toca (PROY-20); TASK-6 cierra `agents.md` y `STATUS.md`. Gate completo de la app en cada task (`agents.md`
§3, prefijo de Node 26); en TASK-1, además, `node --test` y `check` de `contracts/scripts/` sin delta.

### TASK-1: fixtures reales de lectura gRPC y sondas — área: contracts (fixtures, docs) + app (script)
- **Entregable:** `contracts/fixtures/game-reads.localnet.json`, `app/scripts/capture-read-fixtures.mjs` y
  `contracts/README.md` "Lectura desde la app" con el formato real (BCS como formato de la app; forma del `json` de gRPC
  documentada como referencia, reemplazando la de la CLI). Resultados de las sondas en el reporte.
- **Archivos:** los tres anteriores. Si `npm run lint -w app` exige globals de Node para `.mjs`, se importan de `node:*`
  (sin paquetes nuevos ni cambios a la config de ESLint, salvo un bloque de `files` justificado).
- **Cambios:** localnet aislada (`agents.md` §3, publicación **variante B**, reglas B4). Con cuentas de la génesis (`ADMIN`,
  `A`, `B`, `C`) y la sintaxis de PTB del smoke de #6 (`git show 8fddbda:documents/SMOKE_ACCEPT.md`, pasos 4-11):
  `update_fee_rate` 250; `A` crea una abierta y una invitación a `B`; `A` crea y cancela una; `A` invita a `B` y `B`
  rechaza; `B` acepta una abierta de `A` (si sale `ExecutionCancelledDueToRandomnessUnavailable`, esperar y repetir; se
  anota); para la sonda P1, un PTB con ≥ 60 `create_game`. Luego el script escribe la fixture.
- **Sondas (en el reporte, con el código descartable en el scratchpad):** P1 `listEvents` descendente de `GameCreated`
  con `before` hasta agotar: sin duplicados ni huecos frente a `suic tx-block`, conteo total y valores de
  `hasNextPage`/`endCursor` por página (y si aparece alguna página corta); P2 `getObjects` de las 5 variantes: `type`,
  `owner`, y que `content` parsea con el esquema BCS; P3 `timestampMs` no nulo para los digests de eventos e igual al de
  `suic tx-block`; P4 BCS vs `json` campo por campo; **P5 testnet, solo lectura pública sin claves** (Node +
  `SuiGrpcClient` contra el endpoint público, sin `sui client`): `listEvents` descendente con `limit` pequeño sobre un tipo
  de evento del sistema y una segunda página con `before`; P6 tras resolver una partida, una transacción fallida sobre ella
  (`A` llama `cancel_game` ⇒ `ENotPending`): ¿cambia `previousTransaction` del objeto? (confirma la etiqueta de DL-6).
- **AuthZ:** no aplica (lecturas). Las transacciones de la CLI son de cuentas efímeras de la génesis.
- **Criterio de aceptación:** la fixture tiene las 5 variantes de objeto y los 4 tipos de evento con `bcs`/`content` en
  base64 y `json`, `_meta` completo y **ninguna clave ni frase** (solo direcciones e IDs efímeros, como
  `contracts/scripts/fixtures/`); el script corre dos veces sobre la misma red y da el mismo archivo salvo `_meta.fecha`;
  P1-P6 respondidas; cierre limpio del paso 7 (`~/.sui/` idéntico, sin `contracts/deployments/`).
- **Tests:** ninguno nuevo (los consume TASK-2); gates de app y de `contracts/scripts/` en verde.
- **Riesgos / rollback:** P5 negativa ⇒ STOP contingente. Si la fixture cambia al recapturar, el diff se declara.

### TASK-2: tipos y parsers del `Game` y de sus eventos — área: app (`sui/`)
- **Entregable:** `app/src/sui/game.ts` (tipo `Game`, `GameState` = `pending | cancelled | resolved {acceptor, winner}`,
  esquema BCS, `gameType(originalPackageId)`, `parseGameObject(object, originalPackageId)`, `resolutionAmounts(bet,
  feeRate)`), `app/src/sui/events.ts` (tipos `GameCreatedEvent`, `GameCancelledEvent`, `GameResolvedEvent`, sin
  `GameAccepted`; `gameEventType(originalPackageId, nombre)`; `parseGameCreated/Cancelled/Resolved(entry,
  originalPackageId)` que conservan `transactionDigest`), `app/src/sui/readErrors.ts` (`ReadDataError` con motivo y
  `readErrorMessage`) y en `format.ts` `formatBps` y `formatTimestamp` (con `timeZone` inyectable para tests).
- **Cambios:** DL-1 y DL-9. Montos en `bigint`; direcciones tal como las da `bcs.Address` (normalizadas).
- **Criterio de aceptación:** cada variante de la fixture parsea al valor esperado; ningún `any`; sin red.
- **Tests (Vitest, fixtures por `import.meta.glob` eager como `config.test.ts`):** las 5 variantes y los 4 eventos de la
  fixture; cruce BCS ↔ `json` de la fixture; **evento malformado** (bytes truncados, bytes sobrantes, índice de variante
  desconocido, tipo de otro paquete o de otro módulo); objeto con `owner` no compartido; invariantes violadas
  (`fee_rate` 1001, `stake ≠ bet` en `Pending`, `winner` ajeno, `pot ≠ payout + fee`); `resolutionAmounts` contra el
  `GameResolved` real y los ejemplos de `contracts/README.md` "Comisión" (incluido el redondeo hacia abajo con
  `bet = 1_000_001`, 250 bps); `formatBps` (0, 1, 250, 1000) y `formatTimestamp` en UTC.
- **Riesgos:** un error de layout en el esquema solo lo detecta la fixture real: por eso TASK-1 va primero.

### TASK-3: lecturas y política común — área: app (`sui/`)
- **Entregable:** `app/src/sui/readPolicy.ts` (`withReadTimeout`, `READ_TIMEOUT_MS`, `isTransientReadError`,
  `shouldRetryRead(failureCount, error)`, `readRetryDelay(attempt)`, constantes), `app/src/sui/readStatus.ts`
  (`deriveReadStatus`), `app/src/sui/ids.ts` (`parseObjectIdInput`, `sameAddress`), `app/src/sui/lobby.ts`
  (`fetchLobbyPage(client, { originalPackageId, before, signal })` → `{ games, endCursor, hasNextPage }`),
  `app/src/sui/gameDetail.ts` (`fetchGame(client, { id, originalPackageId, signal })` → `Game` + `previousTransaction`;
  "no existe" y "no es una partida" como errores tipados no transitorios), `app/src/sui/transactionTime.ts`
  (`fetchTransactionTime(client, { digest, signal })` → `number | null`). `nodeInfo.ts` pasa a usar `withReadTimeout`
  (mismo comportamiento y mensaje; `NODE_STATUS_TIMEOUT_MS` = `READ_TIMEOUT_MS` o se elimina con sus usos).
- **Cambios:** DL-2, DL-3, DL-5, DL-6, DL-8. Las funciones reciben el cliente acotado (`Pick<SuiGrpcClient, …>`, ARQ-3) y
  el `signal` de TanStack, combinado con el corte de 10 s, en **cada** llamada al SDK.
- **Criterio de aceptación:** el bucle de `fetchLobbyPage` no supera nunca 4 `listEvents` por llamada (verificado con un
  mock que siempre responde `hasNextPage: true`); ninguna lectura sin corte por tiempo.
- **Tests:** lobby con cliente falso: orden descendente preservado, filtra invitaciones y estados terminales, varias
  respuestas cortas (0 eventos con `hasNextPage: true`), corte por objetivo, por `hasNextPage: false`, por `endCursor`
  `null` y por cursor repetido, `before` correcto en la segunda llamada, `getObjects` con `ObjectError` para un ID
  (se omite) y con datos inválidos (lanza `ReadDataError`); `fetchGame`: ok, no existe, tipo ajeno, `owner` no
  compartido; `fetchTransactionTime`: valor, `null`, no existe; `withReadTimeout`: corte a los 10 s con timers falsos y
  abort externo; `shouldRetryRead`: tabla por código y tipo de error y tope de intentos; `readRetryDelay`: 1 s, 2 s, tope;
  `deriveReadStatus`: cargando, reintentando (intento 2 y 3 de 3), en pausa, error, listo y refrescando;
  `parseObjectIdInput`: vacío, forma corta, mayúsculas, 64 hex válido, 65 hex, no hex, espacios; `sameAddress`; los tests
  de `nodeInfo` siguen en verde sin cambios de expectativa.
- **Riesgos:** cambiar `nodeInfo.ts` toca el indicador de red: sus tests son la red de seguridad.

### TASK-4: hooks y política en el `QueryClient` — área: app (`hooks/`, `providers/`)
- **Entregable:** `app/src/hooks/queryKeys.ts`; `useLobby()` (`useInfiniteQuery`, DL-3/DL-4; aplana, deduplica y marca
  `isMine` con `useWalletAccount` + `sameAddress`; expone filas, `ReadStatus`, `hasNextPage`, `loadMore`, `refresh` =
  `resetQueries`); `useGame(rawId)` (valida con `parseObjectIdInput`; inválido ⇒ estado `invalid_id` sin consulta;
  `refetchInterval` 15 s); `useTransactionTime(digest | null)` (`staleTime: Infinity`); `useNodeStatus` con la clave
  central y estado "reintentando" (`NodeStatus` suma `retrying`); `AppProviders` con `new QueryClient({ defaultOptions:
  { queries: { retry: shouldRetryRead, retryDelay: readRetryDelay } } })`.
- **Cambios:** PROY-14 (sin `useEffect` para datos); DL-5, DL-13.
- **Criterio de aceptación:** ningún hook pide datos fuera de TanStack; todas las queries comparten la política.
- **Tests (patrón de `useNodeStatus.test.tsx`: `useCurrentClient` y `useAppConfig` mockeados, timers falsos):**
  **`cancelQueries` (LIM-11 de #9):** con un mock colgado que solo rechaza al abortarse, `await act(() =>
  queryClient.cancelQueries())` deja `aborted === true` en la señal que recibió el SDK, y no estaba abortada antes (el corte
  de 10 s no venció): para `useGame` y para `useNodeStatus` (reemplaza el test débil `useNodeStatus.test.tsx:119-124`);
  reintento visible: primer intento con `RpcError`-like `UNAVAILABLE` ⇒ estado `retrying` (intento 2 de 3) ⇒ éxito; un
  `NOT_FOUND` o un `ReadDataError` ⇒ error **sin** segundo intento; `useLobby`: primera página, `loadMore` con el cursor,
  `refresh` vuelve a una página, marca `isMine` con dirección en otro formato, sin cuenta ningún `isMine`; `useGame` con ID
  inválido no llama al cliente; `useTransactionTime(null)` no consulta; `useNodeStatus` pasa por `retrying` antes de
  `offline` con el `QueryClient` de la política (no con `retry: false`).
- **Riesgos:** los timers falsos y la espera de reintentos; los tests fijan `retryDelay` o avanzan el reloj de forma
  explícita (patrón `advance` de `useNodeStatus.test.tsx:56-59`).

### TASK-5: lobby, detalle y textos — área: app (`components/`, `pages/`)
- **Entregable:** `components/ReadState.tsx` (cargando, "reintentando… (intento n de 3)", "sin red del navegador", error
  con el mensaje y botón "Reintentar"); `components/LobbyList.tsx` (filas con apuesta en SUI, comisión en %, creador
  abreviado con `title` completo, hora o "—", marca "tuya", link a `#/game/<id>`; "Actualizar"; "Cargar más"
  deshabilitado mientras carga; vacío "No hay partidas abiertas" solo sin más páginas; sin filas pero con más páginas:
  "Sin partidas abiertas recientes" + "Buscar más atrás"; error de "cargar más" debajo de las filas ya cargadas);
  `components/GameDetail.tsx` (estado en español, creador, oponente o "abierta", apuesta, comisión en % y estimación con
  `resolutionAmounts` si está `Pending`; si `Resolved`: aceptante, ganador, pozo, comisión cobrada y pago; "Última
  actividad"; link al explorador del objeto en testnet con `explorerObjectUrl`); `pages/HomePage.tsx` con la lista;
  `pages/GameDetailPage.tsx` (`useParams().id` → `useGame`; mensajes "ID de partida inválido", "no existe en <red>", "no
  es una partida de Sui Battleship"); ruta `/game/:id` en `App.tsx`; `Header.tsx` con "Conectar wallet" (DL-11);
  `NetworkBadge.tsx` con el estado `retrying` ("reconectando… (intento n de 3)").
- **Cambios:** ARQ-1/ARQ-2 (los componentes solo renderizan lo que dan los hooks; importan de `@mysten/*` solo
  `dapp-kit-react/ui`); SEG-9 (texto plano, sin `dangerouslySetInnerHTML`); montos con `format.ts`.
- **Criterio de aceptación:** los estados de carga, vacío y error de ambas vistas tienen test; ningún componente arma
  tipos ni IDs.
- **Tests (hooks mockeados, patrón `Header.test.tsx`):** `LobbyList` en cada estado (cargando, reintentando, vacío, vacío
  con más páginas, error, filas con y sin "tuya", hora y "—", "Cargar más" deshabilitado, error de página siguiente);
  `GameDetail` por variante (`Pending` abierta, `Pending` invitación, `Cancelled`, `Resolved` con los montos de la
  fixture); `GameDetailPage` con ID inválido, inexistente y válido; `App.test.tsx` suma `/game/:id`; `Header` muestra
  "Conectar wallet" (el mock del `ConnectButton` renderiza sus `children`); `NetworkBadge` en `retrying`.
- **Riesgos:** el `slot` del kit solo se ve en un navegador real (jsdom usa el mock): lo cubre el smoke.

### TASK-6: docs del ciclo — área: docs
- **Entregable:** `app/README.md` (mapa de `app/src/sui/` con los archivos nuevos; "Reglas para las lecturas y los IDs" con
  BCS, `originalPackageId`, política de reintentos, corte de 10 s y refresco; latencia del indicador recalculada; textos
  del kit en inglés salvo el botón; cómo recapturar las fixtures); `agents.md` (§2: `contracts/fixtures/` ya existe y
  `app/scripts/`; §10 si cambia la naturaleza de los tests); `documents/STATUS.md` (baseline de la app, fila de #10,
  pendientes resueltos de #9).
- **Criterio de aceptación:** `grep` de "la política se define en #10", "el formato exacto de gRPC lo fija #10" y
  similares sin resultados en docs vigentes; sin rutas personales.

## Tests (resumen)

Todo en Vitest + jsdom, sin red real (LIM-11): fixtures reales para parsers (TASK-2), cliente falso para lecturas
(TASK-3), `useCurrentClient`/`useAppConfig` mockeados para hooks (TASK-4) y hooks mockeados para componentes (TASK-5).
Delta esperado: ≈ 10-12 archivos de test nuevos sobre los 12 de hoy; el conteo exacto lo fija cada reporte.

## Smoke (después de TASK-6; el MID genera `documents/SMOKE_LOBBY.md`, FLUJO §6 / AGENTE_MID §M5)

- **Red:** localnet aislada de `agents.md` §3, publicación variante B, reglas B4, una sola localnet en la máquina.
- **Cliente:** `VITE_SUI_NETWORK=localnet npm run dev -w app`; pasos de navegador por **Chrome headless + CDP con perfil
  desechable** dentro de `<SMOKE_DIR>` (modalidad de #9, `git show 9bf7a77:documents/SMOKE_APP.md`); nunca el navegador ni
  el perfil del usuario. Ninguna clave del owner; nada contra testnet con claves.
- **Pasos previstos** (la tabla definitiva va en el SMOKE):
  1. `update_fee_rate` 250; lobby vacío: "No hay partidas abiertas".
  2. `A` crea tres abiertas (montos distintos) y una invitación a `C`; "Actualizar" ⇒ 3 filas, la más reciente primero, sin
     la invitación; apuesta, "2.5 %" y hora = `timestampMs` de `suic tx-block` de cada `GameCreated`.
  3. `A` cancela una ⇒ sigue visible hasta "Actualizar" y luego desaparece (criterio del issue).
  4. `#/game/<cancelada>` ⇒ "Cancelada", creador, apuesta, comisión (criterio del issue).
  5. `B` acepta otra ⇒ su detalle: "Resuelta", ganador = `winner` del `GameResolved` de `suic tx-block`; pozo, comisión y
     pago iguales al evento; la partida sale del lobby tras "Actualizar".
  6. `#/game/<id en mayúsculas>` y forma corta (si existe un ID con ceros a la izquierda; si no, solo mayúsculas) ⇒ el
     mismo detalle.
  7. `#/game/xyz` ⇒ "ID de partida inválido" y **ningún** `POST …/BatchGetObjects` en CDP `Network.*`.
  8. ID válido inexistente ⇒ "no existe"; ID de la House ⇒ "no es una partida".
  9. PTB con 25 `create_game` abiertas ⇒ 20 filas + "Cargar más" ⇒ el resto, sin duplicados.
  10. Botón del kit "Conectar wallet" (shadow DOM vía CDP); conectar la burner (la marca "tuya" no es verificable en el
      navegador en #10: la burner no puede crear partidas sin #11; la cubren los tests de TASK-4/5).
  11. Último: con el lobby abierto, `kill` de la red ⇒ "Actualizar" ⇒ "reintentando… (intento 2 de 3)" y luego error con
      "Reintentar"; el badge pasa por "reconectando…" a "sin conexión" en ≤ ~25 s.
  12. Cierre del paso 7 de `agents.md` §3 (`~/.sui/` idéntico a la línea base, sin `contracts/deployments/`, árbol limpio).
- **Consistencia eventual:** tras cada transacción de la CLI se espera a que el evento esté en un checkpoint antes de
  "Actualizar" (se anota la espera); no es falla.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | El fullnode público de testnet no soporta `ListEvents` descendente con `before` o no indexa eventos | Sonda P5 de TASK-1; STOP contingente antes de TASK-3 |
| R-2 | Error en el esquema BCS (orden de campos, `UID`, `Balance`) | Fixtures reales + cruce con `json` (TASK-2); el layout se congela en #8 |
| R-3 | Indexado de eventos con retraso (el evento aparece tras el checkpoint) | Refresco manual; el smoke espera el checkpoint |
| R-4 | Volumen de pedidos en testnet (fila → `getTransaction`) | Página de ≤ ~70 candidatas, `staleTime: Infinity` por digest, sin intervalo en el lobby |
| R-5 | `previousTransaction` cambia por una transacción fallida posterior | Etiqueta "Última actividad" (siempre verdadera); sonda P6 |
| R-6 | La fórmula de `resolutionAmounts` diverge del contrato en un upgrade | Test anclado al evento real; regla de sincronización de `agents.md` §5 |
| R-7 | Una sola fila con datos inválidos tumba el lobby | Comportamiento buscado (SEG-10: nunca mostrar datos que no se entienden); los "no existe" se omiten |
| R-8 | Tras un `migrate`, el lobby mostraría partidas viejas no aceptables (`EVersionMismatch`) | Fuera de alcance de la v1; nota para el issue de upgrades |
| R-9 | Las fixtures tienen IDs y direcciones de 64 hex: el grep de secretos las marca | Son de cuentas efímeras de la génesis, sin claves (igual que `contracts/scripts/fixtures/`); se declara en el reporte |
| R-10 | Cambio del indicador de red (política y `retrying`) | Tests existentes de `nodeInfo`/`useNodeStatus`/`NetworkBadge` + paso 11 del smoke |
| R-11 | El texto del `slot` no se ve con el kit real | Paso 10 del smoke |

## Archivos que NO se tocan

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `.github/workflows/ci.yml`,
`package.json` y `app/package.json` (sin dependencias nuevas), `package-lock.json` (sin delta), `.npmrc`, `app/src/sui/config.ts`,
`app/src/sui/dappKit.ts`, `app/src/sui/networks.ts`.

## Al aprobar

El MID genera `documents/HANDOFF_LOBBY.md` (consolidado, con §0 de baseline verificado el día) y el orquestador lo commitea
en esta branch. Mensaje propuesto para el plan: `docs: add #10 lobby plan (#10)`.
