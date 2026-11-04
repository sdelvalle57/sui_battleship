# App web (`app/`) — Sui Battleship

Cliente React + TypeScript (Vite) del juego. Lee la red con `SuiGrpcClient` (gRPC-web) y firma con la wallet del
navegador mediante el kit de Mysten (`@mysten/dapp-kit-react` + `@mysten/dapp-kit-core`). Sin backend propio.
Decisiones de base: D-20261102-02 (`documents/DECISIONES.md`).

## Requisitos

- **Node 26** (`.nvmrc`) y npm 11: `nvm use` en la raíz antes de cualquier comando. Los agentes, cuyo shell no carga
  nvm, anteponen el prefijo de Node 26 por ruta absoluta (`agents.md` §3, "App (`app/`)"). Con otra versión,
  `npm ci` falla con `EBADENGINE` (`engines` de la raíz + `engine-strict`).
- Todo se corre **desde la raíz** del repo (npm workspaces: `"workspaces": ["app"]`).

## Scripts

| Comando (desde la raíz) | Qué hace |
|---|---|
| `npm ci` | Instala exactamente lo del `package-lock.json`, sin scripts de instalación (`.npmrc`) |
| `npm run dev -w app` | Servidor de desarrollo de Vite (`http://localhost:5173`) |
| `npm run build -w app` | Build de producción en `app/dist/` (ignorado por git) |
| `npm run preview -w app` | Sirve `app/dist/` para revisarlo |
| `npm run lint -w app` | ESLint (`--max-warnings 0`), incluida la regla de capas |
| `npm run typecheck -w app` | `tsc --noEmit` de `src/` y de `vite.config.ts` |
| `npm test -w app` | Vitest + jsdom + Testing Library |

**Gate** = steps del job `app` de `.github/workflows/ci.yml` (bloqueante, PROY-18): `npm ci`, `npm audit signatures`,
`npm audit --omit=dev --audit-level=high`, lint, typecheck, test, `VITE_SUI_NETWORK=testnet npm run build -w app` y
árbol sin cambios al final.

## Red del build: `VITE_SUI_NETWORK`

Una red por build (D-20261102-02 (2)): `localnet` o `testnet`. Ausente, vacía, `mainnet` o cualquier otro valor →
la app muestra la pantalla "La app no está configurada" con la causa y la acción (no queda en blanco).

- Valor de ejemplo: `app/.env.example` (`VITE_SUI_NETWORK=localnet`). Se pasa en la línea de comandos
  (`VITE_SUI_NETWORK=localnet npm run dev -w app`) o en un `app/.env.local` propio (ignorado por git).
- **Todo `VITE_*` es público:** Vite lo embebe en el bundle. Nunca secretos en ningún `.env` (SEG-3).
- IDs y chain id salen de `contracts/deployments/<red>.json` (esquema `schemaVersion: 1`, `contracts/README.md`
  "Despliegues"), que lee **solo** `app/src/sui/config.ts`. Falta el archivo, `schemaVersion` ≠ 1, `network` distinta
  de la variable o un ID con formato inválido → pantalla de error con el campo o archivo y la acción.

### Localnet

1. Localnet **aislada** de `agents.md` §3 ("Localnet aislada (smokes)"), con la publicación del paso 4 en la
   **variante B** (sin `--out`): escribe `contracts/deployments/localnet.json` (ignorado por git).
2. `VITE_SUI_NETWORK=localnet npm run dev -w app` y abrir `http://localhost:5173`. Si `localnet.json` se crea (o se
   vuelve a crear) con `vite` dev ya arrancado, la app sigue en "La app no está configurada" aunque se recargue:
   reiniciar `npm run dev -w app` (`vite` ve los cambios y el borrado del archivo, pero no uno nuevo fuera de `app/`;
   el build no se ve afectado).
3. **Wallet de desarrollo** (burner del kit): solo en localnet **y** con `npm run dev` (D-20261102-02 (5)). Nace sin
   fondos: se fondea por CLI (ver "Wallet"). Para firmar con una wallet de navegador, esa wallet tiene que apuntar a la
   misma localnet.
4. Al cerrar: el paso 7 de `agents.md` §3, que borra también `contracts/deployments/localnet.json` (pertenece a la
   génesis que se borra).

### Testnet

`contracts/deployments/testnet.json` lo publica #8 (owner). Hasta entonces, un build con `VITE_SUI_NETWORK=testnet`
compila pero muestra la pantalla de error de configuración. Explorador: Suiscan (`explorer.ts`); en localnet, sin link.

**Origen del build publicado:** el glob de `config.ts` es `eager` y se resuelve al compilar, así que un
`contracts/deployments/localnet.json` presente en la máquina entra en **cualquier** build hecho ahí, también en uno de
testnet. El build de testnet que se publica sale de la CI o de un checkout limpio, nunca de una máquina con
`localnet.json`.

## Estructura y capas (ARQ-1, PROY-13)

```
src/
├── sui/         # funciones puras sobre el SDK (sin React): red, config, montos, lecturas, parsers, política
├── hooks/       # hooks de React sobre el kit y TanStack Query (+ ConfigContext, queryKeys)
├── providers/   # QueryClientProvider (política común) > DAppKitProvider > ConfigContext
├── components/  # UI sin lógica de negocio (LobbyList, GameDetail, ReadState, Header, CreateGameForm, GameActions…)
├── pages/       # páginas del router por hash: HomePage (#/), GameDetailPage (#/game/:id), NotFoundPage
├── test/        # setup de Vitest, arnés de TanStack Query y de la máquina de transacciones para tests
└── App.tsx      # rutas (appRoutes) + RouterProvider
scripts/
├── localnet-guard.mjs          # guarda compartida de las capturas: solo http://127.0.0.1:9000 y la génesis del despliegue
├── capture-read-fixtures.mjs   # captura de las fixtures reales de lectura (ver "Fixtures de lectura")
└── capture-tx-fixtures.mjs     # captura de las fixtures reales de transacciones (ver "Fixtures de lectura")
```

La regla de capas la hace cumplir ESLint (`app/eslint.config.js`, `no-restricted-imports` en lista blanca):

| Carpeta | `@mysten/*` permitido | Además prohíbe |
|---|---|---|
| `src/sui/` | `@mysten/sui*`, `@mysten/dapp-kit-core*` | React y las capas superiores (`hooks`, `components`, `pages`, `providers`) |
| `src/hooks/` | `@mysten/sui*`, `@mysten/dapp-kit-react` (raíz) | `components`, `pages`, `providers` |
| `src/providers/` | `@mysten/dapp-kit-react` (raíz) | — |
| resto (`components/`, `pages/`, raíz de `src/`) | solo `@mysten/dapp-kit-react/ui` | — |

### Mapa de `app/src/sui/`

| Archivo | Contenido | Issue |
|---|---|---|
| `networks.ts` | `Network`, URL gRPC y base del explorador por red, `isNetwork`, `shortChainId` | #9 |
| `config.ts` | **único** lector de `import.meta.env` y de `contracts/deployments/*.json`; valida el esquema de #7 (incluido `publishTxDigest`, cota del lobby) | #9, #10 |
| `format.ts` | SUI ↔ MIST con `bigint` (`parseSuiToMist`, `formatMist`), `shortAddress`, `formatBps`, `formatTimestamp` | #9, #10 |
| `explorer.ts` | links a transacción y objeto (Suiscan en testnet; `null` en localnet) | #9 |
| `nodeInfo.ts` | `fetchNodeInfo` (consulta viva con el corte común; trae el piso `lowestAvailableCheckpoint`) y `deriveNodeStatus` (con `retrying`) | #9, #10 |
| `dappKit.ts` | instancia del kit con `createDAppKit` y `SuiGrpcClient` | #9 |
| `game.ts` | esquema BCS del `Game`, `gameType`, `parseGameObject` (tipo exacto, dueño compartido, bytes canónicos, invariantes) y `resolutionAmounts` | #10 |
| `events.ts` | `RawGameEvent`, esquemas BCS y parsers de `GameCreated`/`GameCancelled`/`GameResolved` | #10 |
| `readErrors.ts` | errores de lectura (`ReadDataError`, `GameNotFoundError`, `NotAGameError`, `PaginationStalledError`, `ReadTimeoutError`, `NotYetCheckpointedError`, `HistoryPrunedError`) y `readErrorMessage` | #10 |
| `readPolicy.ts` | `withReadTimeout` (corte de 10 s), `isTransientReadError`, `shouldRetryRead`, `readRetryDelay` | #10 |
| `readStatus.ts` | `ReadStatus` y `deriveReadStatus` (cargando, reintentando n de m, en pausa, error, lista) | #10 |
| `ids.ts` | `parseObjectIdInput` y `parseAddressInput` (validan y normalizan en el borde, mismo helper) y `sameAddress` | #10, #11 |
| `transactionInfo.ts` | hora/checkpoint de una transacción, checkpoint de la publicación (`null` = podada) y hora de un checkpoint | #10 |
| `gameDetail.ts` | `fetchGame` (detalle por ID), `GAME_REFETCH_MS` y `gameRefetchInterval` (corta el intervalo ante un error definitivo, DL-7) | #10, #11 |
| `lobby.ts` | `fetchLobbyPage` (lobby por eventos con el `ListEvents` crudo), `lobbyLowerBound` y las constantes calibradas | #10 |
| `transactions/game.ts` | builders puros de PTB: `buildCreateGameTx` (`splitCoins(gas)` + `create_game`), `buildCancelGameTx`, `buildRejectGameTx` y `buildAcceptGameTx` (`splitCoins(gas, [bet])` + `accept_game(game, house, coin, random)` con `tx.object.random()`, **último** comando: después de un comando con `Random` el nodo solo admite `TransferObjects`/`MergeCoins`); lanzan ante un ID o un monto inválidos; sin `sender` ni gas | #11, #12 |
| `errors.ts` | `ABORT_MESSAGES` (módulo + código → mensaje), `findMoveAbort` (estructurado, formato del SDK y formato Rust del nodo; `cause` hasta 5 niveles), `abortCodeSuffix`, `runtimeCancellation` + `RUNTIME_CANCELLED_MESSAGES` (cancelaciones del runtime, DL-11) y `transactionErrorMessage` con sus fallbacks | #11, #12 |
| `execution.ts` | `preflightTransaction` (simulación de una copia, corte de 20 s, `PreflightNetworkError`; DL-10: un `SimulationError` sin `executionError` cuyo `cause` es un corte de red, según `isPreflightNetworkCause` = `isTransientReadError`, también es `PreflightNetworkError`), `confirmTransaction` (30 s), `waitForCheckpoint` (30 s), `classifyExecution`, `digestFromError`, `networkCost` | #11, #12 |
| `gameTx.ts` | `parseCreatedGame` (único `GameCreated` del firmante), `cancelledRefund` (`refund` del `GameCancelled` de esa partida) y `parseResolvedGame` (único `GameResolved` de esa partida con `acceptor` = la cuenta; si no, `null`) | #11, #12 |
| `house.ts` | esquema BCS de la `House`, `houseType`, `parseHouseObject` (tipo exacto, compartida, bytes canónicos, `0 < min_bet <= max_bet`) y `fetchHouse` | #11 |
| `account.ts` | `fetchSuiBalance` (`balance.balance` de `getBalance`: monedas + saldo de dirección) | #11 |
| `createGame.ts` | `validateCreateGame` (motivos tipados), `houseTermsChanges`/`houseChangeMessage` (M-2), `CREATE_GAS_RESERVE_MIST`, `GAME_STORAGE_DEPOSIT_MIST` | #11 |
| `gameActions.ts` | `canCancel` (creador, `Pending`), `canReject` (invitado, `Pending`), `acceptState` (en orden: `not_pending` → `no_account` → `creator` → `not_invited` → `available`) y `NOT_INVITED_HINT` (= el texto de `game`/5) | #11, #12 |
| `acceptGame.ts` | `ACCEPT_GAS_RESERVE_MIST` (0,01 SUI; ver "Aceptar y resultado"), `acceptBalanceCheck` (`ok`/`insufficient`/`unknown`), `wonBy` y `playerResult` (`won`/`lost` para el creador o el aceptante de una partida resuelta) | #12 |

### Hooks (`app/src/hooks/`)

| Hook | Qué devuelve |
|---|---|
| `queryKeys.ts` | **únicas** claves de TanStack Query: `['sui', red, recurso, …]` (`nodeInfo`, `lobby`, `game`, `txInfo`, `publishCheckpoint`, `checkpointTime`, `house`, `balance` con la dirección normalizada); los `bigint` como string. Claves de **mutación** (#12): `txAccount(red, cuenta)` = `['sui', red, 'tx', <cuenta normalizada> \| 'none']` y `txTarget(red, cuenta, objetivo)` = `[...txAccount, 'create']` o `[...txAccount, 'game', <id normalizado>]` |
| `txInvalidation.ts` | `TxAction` (`create`, `cancel`, `reject`, `accept`) y `transactionInvalidations`: la tabla única de qué reiniciar/invalidar tras una transacción propia (DL-6) |
| `txSession.ts` | lo puro de la máquina (#12, sin React): tipos (`TxTarget`, `TxView`, `TxVariables`, `TxNotice`, `AdoptedTx`), `toTxEntry`, `mountSnapshot` (foto de **todo** el `MutationCache` al montar) y `deriveTargetState` (en curso ajena, "sin confirmar" del objetivo, adopción) |
| `useTxTarget` | **una** llamada por vista con acciones sobre un objetivo (`{ kind: 'create' }` o `{ kind: 'game', gameId }`): `view` (para los hooks de acción), `busy`, `notice` (`in_flight` / `adopted`), `unconfirmed` y `acknowledge` ("Ya la revisé"). Ver "Transacciones (#11, #12)" |
| `useExecuteTransaction` | máquina común de transacciones: `useExecuteTransaction(view)` → `stage`, `outcome` (`success`/`failure` de **su** última ejecución, leído del caché por `runId`; nunca `unconfirmed`, que muestra la vista) y `execute` |
| `useCreateGame` / `useCancelGame` / `useRejectGame` / `useAcceptGame` | hooks finos sobre la máquina, que reciben la `view` de la vista (la partida sale de `view.target`): builder, relectura de la House (crear), y lo que se lee del resultado (partida creada y `feeChanged`; reembolso; el `GameResolved` de la aceptación) |
| `useHouse` / `useSuiBalance` | la House de la config (sin intervalo; al montar y al foco) y el saldo de la cuenta conectada (sin cuenta no consulta) |
| `useLobby` (+ `usePublishCheckpoint`) | filas con `isMine`, `ReadStatus` combinado con la publicación, `hasNextPage`, `isFetchingNextPage`, `nextPageError`, `stalled`, `lowerBound`, `end`, `loadMore`, `refresh` |
| `useGame` | `invalid_id` sin consulta, o la partida con su `ReadStatus`; refresco cada 15 s y al foco, salvo tras un error definitivo (DL-7) |
| `useTransactionTime` / `useCheckpointTime` | hora inmutable (`staleTime: Infinity`); sin digest (`null`/`''`) o sin número no consultan |
| `useNodeStatus`, `useWalletAccount`, `useAppConfig` | indicador de red, cuenta conectada y config |

### Componentes de transacción (#11, #12)

| Componente | Qué hace |
|---|---|
| `TransactionStatus` | etapa en curso o resultado del nodo: éxito con digest (link solo en testnet), costo de red y nota si no se indexó; "sin confirmar" con digest y sin "Reintentar"; fallo con mensaje y, si se ejecutó, digest y costo |
| `CreateGameForm` | formulario de la portada (ver "Formulario de creación"); `useTxTarget({ kind: 'create' })`; navega al detalle con el aviso en el `state` del router |
| `GameActions` | "Aceptar" (ver "Aceptar y resultado"), "Cancelar" (creador) y "Rechazar" (invitado) en el detalle, con **una** `useTxTarget` de la partida y un `TransactionStatus` por acción, más el aviso "en curso", el resultado adoptado y **una** alerta "sin confirmar" con "Ya la revisé" |
| `GameDetail` | el detalle de la partida; con la partida resuelta y la cuenta conectada como creador o aceptante, "Resultado para ti: ganaste/perdiste" (DL-12, leído del objeto) |
| `createdNotice.ts` | escribe y lee el aviso de creación del `state` del router (costo como string: react-router serializa la ubicación con `JSON.stringify`) |
| `txNotice.ts` | el texto "Hay una transacción en curso desde esta cuenta; espera a que termine", común al formulario y al detalle |

### Lecturas (#10)

- **Formato = BCS exacto** (DL-1): `Game` desde `content` y eventos desde `bcs`, con esquemas que replican el layout
  Move; tipo exacto `<originalPackageId>::game::Game` (DL-9: `originalPackageId`, no `packageId`), dueño compartido,
  re-serialización comparada byte a byte e invariantes de `game.move`. Lo que no encaja es `ReadDataError`: en el lobby
  queda como fila "Partida ilegible" sin ocultar las sanas; nunca se muestra como `Pending` (SEG-10). El `json` del nodo
  no se usa. Fixtures reales en `contracts/fixtures/game-reads.localnet.json`.
- **Montos de una partida resuelta** = `resolutionAmounts` (pozo `2 × bet`, comisión `⌊pozo × fee_rate / 10 000⌋`, pago
  `pozo − comisión`): fórmula de la v1 del contrato (D-20261030-16 D2/D3). Un upgrade que la cambie conserva la vieja para
  las partidas resueltas con el código viejo (por versión del `Game` o leyendo el evento), en el mismo PR (`agents.md`
  §5). La app no replica `MAX_FEE_BPS`.
- **Lobby (DL-2, DL-3, M-1, M-2, M-4):**
  - descubre las partidas por `GameCreated` (eventos del paquete original) y lee los objetos en lote; solo muestra las
    abiertas en `Pending`; las más recientes primero;
  - **cota inferior** = máx(checkpoint de la **publicación**, piso del nodo + 16 000). La publicación sale de
    `publishTxDigest` de `contracts/deployments/<red>.json`; el piso (`lowestAvailableCheckpoint`) se relee al inicio de
    **cada** página; el margen solo se suma con piso > 0;
  - paginación acotada y calibrada en #10 (sondas P5/P7): **50** eventos por pedido, hasta **2** pedidos por página,
    objetivo de **20** abiertas por página, margen de **16 000** checkpoints (≈ 1 h a ≈ 4,36 checkpoints/s);
  - un cursor que no avanza es un error visible (`PaginationStalledError`, M-2) y solo deja "Actualizar";
  - **sin refresco automático:** "Actualizar" vuelve a la primera página; sin intervalo ni refetch al volver el foco (sí se
    vuelve a pedir al volver a la portada, por el montaje).
- **Detalle (`#/game/:id`):** lee el objeto; se refresca cada **15 s** y al volver el foco, salvo tras un error
  definitivo (no existe, no es una partida, datos ilegibles: `gameRefetchInterval`, DL-7); con la red caída sigue.
  "Última actividad" es la hora de `previousTransaction`, que es la **última** transacción que tocó el objeto, también
  una **fallida** (sonda P6 de #10): nunca se presenta como "la que la resolvió".
- **Política común de lecturas** (`QueryClient` de `AppProviders`, DL-5): corte de **10 s** por intento, decidido por la
  señal que se disparó (corte propio ⇒ transitorio; cancelación de TanStack ⇒ no); solo se reintenta lo transitorio
  (`UNAVAILABLE`, `INTERNAL`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `UNKNOWN`, `ABORTED`, el corte propio y la
  transacción sin checkpoint), **2 reintentos** a 1 s y 2 s; la UI muestra "Reintentando… (intento n de m)". "No
  existe", datos ilegibles, historial podado y cancelación no se reintentan.
- **Historial del nodo** (D-20261102-04 (1), P-1 (a)): en testnet el lobby solo cubre lo que conserva el fullnode
  público (≈ **14,6 días**; piso `lowestAvailableCheckpoint`). Una partida abierta más vieja no aparece en la lista aunque
  siga `Pending`: se ve por su ID en `#/game/:id`, que lee el objeto. Sin filas, el lobby dice "No hay partidas abiertas
  en el historial disponible del nodo (desde <fecha>)" y, con filas, deja esa nota al pie; la fecha es la del
  checkpoint de la cota, una aproximación de hasta ~1 h. La hora de una transacción podada sale como "—".
- **Listas por eventos (lo hereda #13):** en el fullnode público de testnet, `client.listEvents` del SDK (sin rango de
  checkpoints) falla con `OUT_OF_RANGE` (sonda P7 de #10). Toda lista por eventos usa el crudo
  `client.ledgerService.listEvents` con `startCheckpoint` (la cota de arriba) y trata `OUT_OF_RANGE` como **fin del
  historial disponible** (`HistoryPrunedError`), no como error. La paginación del SDK solo vale contra un nodo sin poda
  (p. ej. la localnet). El filtro `eventType` exige direcciones completas.
- **IDs de entrada** (D12, SEG-9): implementado en `ids.ts` (`parseObjectIdInput`) y usado por `useGame`: un ID de la
  URL se valida y normaliza antes de consultar; uno inválido no consulta la red. Todo ID o dirección que entre por
  formulario pasa por el mismo borde antes de consultar o armar un PTB (la invitación usa `parseAddressInput`, #11). `explorer.ts` valida
  pero no normaliza; los IDs de config ya llegan normalizados.
- Lecturas solo con TanStack Query sobre `useCurrentClient()` y claves de `queryKeys.ts`; nada de `useEffect` para pedir
  datos (PROY-14). La hora de un evento no viene en `listEvents`: sale de la transacción (`timestampMs`).

### Transacciones (#11, #12)

Una sola máquina para crear, cancelar, rechazar y aceptar (y para el panel de #14): `useExecuteTransaction`. Corre
entera dentro de la `mutationFn` de TanStack (`retry: false`: una transacción nunca se reintenta sola), así que termina
aunque el componente se desmonte, y nunca lanza hacia el componente (LIM-8). Cada mutación vive en el `MutationCache`
del `QueryClient` de la pestaña, con la clave de mutación de su objetivo (`queryKeys.txTarget`), `gcTime: Infinity`
(se conserva durante la carga de la página) y `networkMode: 'always'` (sin red no queda en pausa: la preflight falla con
el texto de red).

| Etapa | Texto | Qué pasa |
|---|---|---|
| `preflight` | "Verificando la transacción…" | sin cuenta ⇒ "Conecta tu wallet". `precheck` de la acción (crear: **relee la House** y la compara con lo mostrado, M-2). Después, **preflight propia**: simula una **copia** con `sender` (`build({ client })`). Nada de esto abre la wallet |
| `signing` | "Esperando la firma en la wallet…" | a la wallet va el `Transaction` **sin construir** (la wallet resuelve gas y pago) |
| `confirming` | "Confirmando en la red…" | `waitForTransaction` por digest con efectos y eventos. **El nodo es la única fuente de éxito o fallo** (DL-2, SEG-10): de la wallet solo se toma el digest |
| `indexing` | "Actualizando datos…" | si la confirmación no trae `checkpoint`, `waitForCheckpoint`; después, las invalidaciones de la acción |
| `done` | — | queda el `outcome` |

- **Resultados:** `success` (digest, valor leído del resultado, `indexed`, costo de red = cómputo + storage − rebate);
  `failure` (mensaje y, si se ejecutó, digest y costo); `unconfirmed` (digest), **solo** cuando el nodo no respondió o
  venció el corte. Un error de la wallet o del SDK con digest, o cualquier error después de tenerlo, nunca es `failure`
  (M-3 (b)): se consulta al nodo y, si no confirma, queda "sin confirmar" con el digest e invalida igual. Un
  `status.success: false` del nodo sí es `failure`. Si el nodo confirmó el éxito y no se pudo interpretar el resultado,
  es `success` con `value: null`.
- **"Sin confirmar":** "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a
  intentar", sin "Reintentar". Bloquea su **objetivo** (el formulario de creación, o esa partida) durante la carga de
  la página, aunque se salga de la pantalla y se vuelva, hasta que la vista lo reconoce: "Ya la revisé: crear otra
  partida" en el formulario y "Ya la revisé" en el detalle (`acknowledge` borra esa mutación del caché). La alerta la
  dibuja **solo** la vista, desde `useTxTarget().unconfirmed`: una por vista, nunca una por acción (el `outcome` de los
  hooks de acción nunca es `unconfirmed`).
- **Indexación (S-1 bis de #11):** en el fullnode 1.83, después de ejecutar, `getTransaction` responde "not found" hasta
  que la transacción está en un checkpoint (≈ 0,44 s en localnet) y `getObject` puede devolver un momento la versión
  vieja; `waitForTransaction` vuelve ya con `checkpoint` (≈ 0,6 s). Por eso `indexing` normalmente no pide nada; si hace
  falta, `waitForCheckpoint` repite `getTransaction` cada 500 ms y cuenta el "not found" como intento fallido.
- **Cortes** (topes, no latencias esperadas; S-1 no los cambió): preflight **20 s** (`TX_PREFLIGHT_TIMEOUT_MS`),
  confirmación **30 s** (`TX_CONFIRM_TIMEOUT_MS`), indexación **30 s** (`TX_INDEX_TIMEOUT_MS`); si vence la indexación,
  éxito con "La lista puede tardar unos segundos en mostrarlo". La firma no tiene corte (es del usuario). Un error de
  red o el corte en la relectura de la House o en la preflight ⇒ "No se pudo verificar la transacción (red); intenta
  de nuevo", sin pasar por `errors.ts` (M-3 (a)).
- **Candado global por cuenta (DL-7 de #12):** `execute` no hace nada si hay una mutación de la cuenta en curso
  (`queryClient.isMutating` con la clave `txAccount`, de cualquier objetivo y de cualquier vista) o si el objetivo
  tiene un "sin confirmar". Como `mutateAsync` despacha `pending` antes de su primer `await`, dos clics en el mismo tick,
  de una o de dos vistas, ejecutan una sola vez. Los botones se deshabilitan con `useTxTarget().busy`
  (`useIsMutating` de la cuenta) o con un `unconfirmed` del objetivo.
- **Avisos de la vista (`useTxTarget().notice`):** `in_flight` = hay una transacción de la cuenta en curso que **no**
  lanzó esta vista ("Hay una transacción en curso desde esta cuenta; espera a que termine"); la propia nunca la avisa.
  `adopted` = el resultado de una mutación **ajena** del mismo objetivo que empezó después de montar la vista o estaba
  en curso al montar (foto `mountSnapshot` de **todo** el caché, así un cambio de cuenta sin desmontar no adopta
  mutaciones viejas de la otra cuenta); se muestra con el texto de su acción, y un crear adoptado con la partida
  identificada navega como el propio. Lo que terminó antes de montar no se adopta (no se navega dos veces), y el
  `adopted` se descarta en cuanto la vista lanza una propia o adopta otra más nueva. La identidad de cada montaje
  (`viewId`) y de cada ejecución (`runId`) sale de contadores de módulo: ni `crypto.randomUUID()` ni `useId()`.
- **Límite conocido (R-5):** el candado es **por pestaña** (un `QueryClient` por pestaña). Entre dos pestañas con la
  misma cuenta, una segunda aceptación, cancelación o rechazo que pasa las dos preflights se **ejecuta** y aborta con
  `game`/4 (cuesta gas); crear dos veces deja una segunda apuesta (se recupera cancelando) y un depósito de storage que
  no se recupera.
- **Errores al preparar (DL-10 de #12):** un `SimulationError` **sin** abort ni `executionError` es un rechazo del nodo
  antes de simular (p. ej. un comando después del de `Random`, o la selección de gas por saldo insuficiente, ambos con
  `INVALID_ARGUMENT`): "No se pudo preparar la transacción: …", sin abrir la wallet. Si su `cause` es un corte de red
  transitorio (`UNAVAILABLE`, …), la preflight lo convierte en `PreflightNetworkError` (texto de red). Con
  `executionError` y sin abort (p. ej. `InsufficientCoinBalance`): "La red no ejecutó la transacción: …".
- **NIT-2:** si la wallet rechaza **sin** digest pero el error trae un abort (una wallet que simula por su cuenta), se
  muestra el abort mapeado y se aplican las invalidaciones de la acción (el estado mostrado está viejo).
- **Invalidación (DL-6, `txInvalidation.ts`):**

  | Acción | `resetQueries` | `invalidateQueries` |
  |---|---|---|
  | crear | `lobby` (vuelve a la primera página) | `balance` de la cuenta |
  | cancelar / rechazar | `lobby` | `game` de esa partida y `balance` de la cuenta |
  | aceptar | `lobby` | `game` de esa partida, `balance` de la cuenta y `house` (cobró la comisión) |

  Nunca `nodeInfo`, `txInfo`, `publishCheckpoint` ni `checkpointTime`. Se aplica también tras un abort en la preflight,
  un fallo del nodo y un "sin confirmar" (el estado pudo cambiar). `done` llega **después** de la relectura: con el lobby
  montado, "Actualizando datos…" dura lo que tarde esa lectura. #14 suma aquí las acciones de la House.
- **Mensajes de abort** (`errors.ts`, M-5): por **módulo + código**, solo si el abort viene de nuestro `packageId` u
  `originalPackageId` (normalizados), con el sufijo de diagnóstico fijo `(código <módulo>/<n>)`, p. ej. "Solo quien creó
  la partida puede cancelarla. (código game/3)". Los textos de `game` 0–10 y `house` 0–4 viven solo en
  `ABORT_MESSAGES` (tabla de `contracts/README.md`, "Abort codes"). Fallbacks:

  | Caso | Mensaje |
  |---|---|
  | código desconocido de `game`/`house` | "El contrato rechazó la operación (código game/99)" |
  | abort de otro paquete | "La transacción abortó en `0x1234…abcd::<módulo>` (código N)", sin traducir |
  | cancelación del runtime sin abort: falta de aleatoriedad (`Unknown` con `ExecutionCancelledDueToRandomnessUnavailable` o "randomness could not be generated") | "La red canceló la transacción sin ejecutarla (la aleatoriedad de la red todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos" |
  | cancelación del runtime sin abort: congestión (`CongestedObjects`) | "La red canceló la transacción sin ejecutarla (hay congestión en un objeto compartido): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos" |
  | otro fallo sin abort (gas, objetos, `InsufficientCoinBalance`) | "La red no ejecutó la transacción: …" |
  | error de la wallet sin abort | "La wallet no completó la operación: …" o "La wallet no completó la operación (sin detalle del error)" |
  | `SimulationError` sin abort ni `executionError`, u otro error al preparar (ni simulación ni red) | "No se pudo preparar la transacción: …" |
  | red o corte al verificar | "No se pudo verificar la transacción (red); intenta de nuevo" |

  `findMoveAbort` reconoce el abort estructurado y, por texto, **dos** formatos: el del SDK (`abort code: N, in
  '0x…::<módulo>::…'`) y el Rust del nodo (`MoveAbort(MoveLocation { module: ModuleId { address: …, name:
  Identifier("<módulo>") } … }, N)`). La forma en que la CLI **presenta** un abort ("… aborted within function … with
  code N") no se reconoce: nunca llega a la app (R-1 de #11). Los aborts de aceptar se ubican en
  `game::assert_acceptable`; el mapeo es por módulo y código, así que no cambia.

### Formulario de creación

- **Términos de la House** (`useHouse`): "Mínimo X SUI · máximo Y SUI" y "Comisión Z (la partida guarda esta
  comisión)"; sin la House leída no se puede crear (estado de lectura con "Reintentar"). Antes de firmar se relee: si la
  comisión o los límites cambiaron, se detiene con "La comisión cambió de X a Y; revisa y vuelve a confirmar" (y/o los
  límites) sin abrir la wallet (M-2). Si igual la partida guarda otra comisión, el aviso de creación lo dice
  (`feeChanged`).
- **Monto:** `parseSuiToMist`, **sin recortar** (un espacio es "Monto inválido: solo números y punto decimal, sin
  espacios ni separador de miles"); límites **inclusive**; saldo ≥ apuesta + **0,01 SUI** de reserva de gas de
  cortesía (`CREATE_GAS_RESERVE_MIST`). Si el saldo no se pudo leer no bloquea y se avisa: la wallet lo verifica.
- **Invitación (opcional):** se recorta y se normaliza con `parseAddressInput` (valen la forma corta y las mayúsculas);
  la propia cuenta ⇒ "No puedes invitarte a ti mismo".
- **Estimación** "Si alguien acepta: pozo · comisión · al ganador", con `resolutionAmounts` y la comisión de la House.
- **Costo:** nota previa con el depósito de almacenamiento, que **no se recupera** (D-20261030-15 D3; medido en #6 al
  precio de testnet: **1 953 200** MIST abierta y **2 196 400** MIST con invitación, `GAME_STORAGE_DEPOSIT_MIST`), y la
  reserva de gas; tras el éxito, el costo real de red de esa transacción.
- **Después de crear:** con la partida identificada (único `GameCreated` del firmante) navega a `#/game/<id>` con el
  aviso "Partida creada", digest y costo; en una invitación, "Comparte el enlace de esta página con el invitado;
  guárdalo para volver a esta partida" (las invitaciones no aparecen en el lobby). Sin identificarla, queda en la
  portada con "Partida creada" y el digest.
- **Detalle:** "Cancelar" solo para el creador y "Rechazar" solo para el invitado, en `Pending`; el reembolso que se
  muestra sale del `GameCancelled` de la transacción. Sin cuenta, el formulario dice "Conecta tu wallet para crear una
  partida" y el detalle no muestra botones: en una partida `Pending` dice "Conecta tu wallet para aceptar la partida,
  cancelarla si es tuya o rechazarla si te invitaron", y en una terminada, nada.

### Aceptar y resultado (#12)

- **Quién ve "Aceptar"** (`acceptState`, M-3): solo en `Pending`, con cuenta conectada, si la cuenta no es el creador
  y, en una invitación, si es el invitado (el invitado ve "Aceptar" y "Rechazar"). El creador no ve "Aceptar" (no se
  juega contra uno mismo). Una cuenta conectada que abre una invitación ajena ve "Esta invitación es para otra
  dirección." sin botón (D-20261103-02; el mismo texto que el abort `game`/5). El contrato valida igual (SEG-2).
- **Antes de aceptar:** "Apuestas `<bet>` SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la
  transacción (50 % cada uno) y pagas su gas." y la nota "Si tu wallet muestra una vista previa con un ganador o un
  cambio de saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción." (DL-5).
- **Saldo** (`acceptBalanceCheck`): hace falta la apuesta más **≈ 0,01 SUI** de reserva para el gas
  (`ACCEPT_GAS_RESERVE_MIST` = 10 000 000 MIST). Si no alcanza, "Aceptar" se deshabilita con "Saldo insuficiente:
  necesitas `<bet>` SUI de apuesta más ≈ 0.01 SUI de reserva para el gas". Si el saldo no se pudo leer, no bloquea: "No
  se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al firmar)". **Medición** (TASK-1 de #12, S-4, en
  localnet con precio de gas 1000): el budget que el nodo elige en la preflight de aceptar fue **3 474 748** MIST con
  una moneda de gas y **4 474 748** con dos; con margen 2× y redondeado hacia arriba a 0,005 SUI, 0,01 SUI (cubre también
  el costo sin ningún rebate, 1 000 000 + 6 186 400 MIST). Es cortesía: entre `bet` + budget y `bet` + reserva la app
  marca "insuficiente" un saldo que el nodo aceptaría. El budget escala con el precio de gas de la red: se revisa en #17.
- **Transacción** (`useAcceptGame`, DL-1/DL-3): `splitCoins(gas, [bet])` con la apuesta del `Game` leído y
  `accept_game(game, house, coin, random)` como **último** comando; sin `precheck` (la preflight ya valida estado,
  versión y House). El nodo simula con `Random` (S-1 de #12), así que un abort (`game`/4, 5, 9, 10) sale en la preflight
  sin abrir la wallet. Por el camino de la wallet, la confirmación de una aceptación tardó 0,6-1,4 s en localnet (S-3).
- **Resultado (SEG-10):** solo con la confirmación del nodo y del `GameResolved` de **esa** partida con la cuenta como
  aceptante (`parseResolvedGame`). Mientras tanto, solo los textos neutros de las etapas: ningún ganador anticipado ni
  animación. Ganaste: "¡Ganaste! Recibiste `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; perdiste:
  "Perdiste: ganó quien creó la partida y recibió `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; sin el
  evento: "Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador". El mismo
  texto para una aceptación adoptada. El resultado sigue a la vista cuando la partida pasa a "Resuelta" y el botón
  desaparece.
- **"Resultado para ti"** (DL-12): en el detalle de una partida resuelta, para el creador y el aceptante, "ganaste" o
  "perdiste", leído del objeto (`playerResult`); nada para un tercero ni sin cuenta.
- **Cancelaciones del runtime** (DL-11): una aceptación cancelada por falta de aleatoriedad o por congestión no es éxito
  ni error del contrato; se muestra el texto de "intenta de nuevo" (ver "Mensajes de abort"), y el reintento es el
  mismo botón.

### Fixtures de lectura

`contracts/fixtures/game-reads.localnet.json` (5 variantes de `Game`, sus eventos y una página cruda de `ListEvents`,
capturadas en una localnet desechable) la usan los tests de `sui/`. Cómo recapturarla:
`contracts/README.md`, "Lectura desde la app" (`node app/scripts/capture-read-fixtures.mjs` dentro de la localnet
aislada; solo acepta `http://127.0.0.1:9000`).

`contracts/fixtures/game-tx.localnet.json` (#11 y #12: House, 11 `SimulationError` reales, 9 transacciones ejecutadas
con dos `MoveAbort` reales, entre ellas aceptaciones con cada ganador y sobre una invitación, y el texto Rust del abort)
la usan los tests de `sui/`, `hooks/` y `components/`; se recaptura con
`node app/scripts/capture-tx-fixtures.mjs`, con la misma guarda (`app/scripts/localnet-guard.mjs`).

## Indicador de red

El encabezado muestra siempre la red del build y el estado del nodo: "conectando…", "reconectando… (intento n de m)",
"nodo OK", "red equivocada (esperada X, nodo Y)" (chain id del nodo distinto del de `<red>.json`) o "sin conexión" con
el motivo.

- Consulta `getServiceInfo` cada 20 s (`NODE_STATUS_REFETCH_MS`) con el corte común de 10 s (`READ_TIMEOUT_MS`): un
  nodo colgado cuenta como error, no deja el último "nodo OK".
- Usa la política común de lecturas: mientras reintenta muestra **"reconectando… (intento n de m)"**, nunca "nodo OK".
- **Latencia de "sin conexión":** ≤ ~25 s con el nodo caído (20 s de intervalo + 1 s + 2 s de espera entre los 3
  intentos) y ≤ ~55 s con el nodo colgado (20 s + 3 intentos de 10 s + 3 s de espera).

## Wallet

`ConnectButton` del kit con el texto **"Conectar wallet"** y la dirección abreviada de la cuenta conectada. El kit solo
deja cambiar el texto del botón: su modal ("Connect a wallet", "No wallets installed"…) y su menú de cuenta quedan en
inglés (DL-11, D-20261102-04 (2)). La **burner wallet** se habilita solo en
localnet + `npm run dev`; su código igual está en el bundle de testnet (el kit lo importa siempre), pero nunca se
habilita ni se ofrece.

- **La burner nace sin fondos** y es una clave nueva **por carga de página** (no se guarda): al recargar cambia de
  dirección y la anterior queda inaccesible. Después de fondearla, navegar por hash (`#/…`) sin recargar.
- **Fondearla en la localnet aislada** (`agents.md` §3): conectar la burner, tomar su dirección (el `title` de la
  dirección abreviada del encabezado) y, desde una cuenta de la génesis con el prefijo `PRE` (`env.sh` + `ids.env` +
  `smoke_guard`, regla B4): `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c
  --transfer-objects "[c]" @<burner>` (2 SUI). El saldo del formulario se actualiza al volver a la portada.
- La burner firma sin ventana de aprobación (simula y ejecuta con su cliente); una wallet de navegador muestra la suya.

## Dependencias y avisos de seguridad (SEG-8, D-20261102-02 (3))

- Versiones **exactas** en `app/package.json`, `package-lock.json` commiteado y `.npmrc` en la raíz:
  `save-exact`, `engine-strict`, `min-release-age=7` (ninguna versión con menos de 7 días) e `ignore-scripts`.
- Los `@mysten/*` acoplados van **por tren** (hoy `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
  `@mysten/dapp-kit-react` 2.1.41, con una sola versión de cada uno en el árbol); se suben juntos.
- **Al subir el tren `@mysten/*`:** revisar `TransactionErrorReason` y `ObjectErrorReason` de `@mysten/sui/client`.
  `fetchPublishCheckpoint` trata todo `TransactionError` como "podada" porque en 2.37 su único motivo es `notFound`, y
  `fetchGame` mapea `ObjectError` `notFound`/`deleted` a "no existe"; un motivo nuevo cambia esa lectura. Revisar
  también los `$kind` de `ExecutionError` (`errors.ts` los usa para distinguir "la red no ejecutó" de un error de la
  wallet) y los formatos de `formatMoveAbortMessage` y del texto Rust del nodo (las dos regex de `findMoveAbort`; la
  fixture `game-tx.localnet.json` y sus tests lo detectan).
- **`build()` sin `signal` (SDK 2.37):** la preflight corta la **espera** a los 20 s, no la simulación, que puede seguir
  en segundo plano (solo lectura; su resultado se descarta). Si una versión futura del SDK acepta `signal` en
  `build()`, pasárselo.
- Un paquete nuevo necesita justificación (necesidad, mantenimiento, licencia) y pasa por plan.
- Licencias del árbol (#9, TASK-1): en producción, todo MIT/Apache-2.0/BSD/ISC salvo `@protobuf-ts/runtime`
  (Apache-2.0 AND BSD-3-Clause); en desarrollo además BlueOak-1.0.0, MIT-0, CC-BY-4.0, CC0-1.0 y MPL-2.0
  (`lightningcss`, herramienta de build, no entra al bundle).

**Procedimiento ante un aviso:**

- El job `app` falla solo con *high*/*critical* de **producción** (`npm audit --omit=dev --audit-level=high`), además
  de firmas inválidas (`npm audit signatures`). Ojo: en el árbol de producción del lock quedan también `typescript`,
  `gql.tada`, `@0no-co/graphqlsp`, `@0no-co/graphql.web`, `graphql`, `chalk` y `commander` (los arrastra el peer de
  `gql.tada`, dependencia de `@mysten/sui`): un *high* en cualquiera de ellos pone `app` en rojo aunque no lleguen al
  navegador.
- Salida: PR de actualización. Si el arreglo tiene menos de 7 días, `min-release-age-exclude` **temporal** solo para
  ese paquete, con un issue que lo retire (LIM-10). Un `EBADENGINE` transitivo es STOP: nunca `--force`,
  `--legacy-peer-deps` ni quitar `ignore-scripts`.
- Aceptados: los 11 *moderate* solo de desarrollo (`minimatch` < 11.0.1 vía eslint), hasta **#35**. El `npm audit`
  completo no es paso bloqueante de la CI.

## Pendientes conocidos

- El build de testnet pesa ≈ 887 kB (≈ 270 kB gzip; desde #11 entra el SDK de transacciones) y Vite avisa de un chunk
  mayor de 500 kB: el code-splitting queda para #15 (hosting).
- `done` espera la relectura del lobby si está montado (DL-6): con una red lenta "Actualizando datos…" puede durar
  varios segundos. Se mide en los smokes de #11 y #12 (localnet) y en testnet en #17.
- Lo que no prueba el smoke de localnet (una wallet de extensión real y su texto de error, R-1 de #11; su vista previa de
  aceptar; la latencia de testnet) queda para el owner en #17.
- `runtimeCancellation` lee el error estructurado; con digest, la app lo toma de la confirmación del nodo. Solo una
  wallet que rechazara **sin** digest ante una cancelación caería en "La wallet no completó…" (no observado; se verifica
  en #17). R-3: la `description` real de la falta de aleatoriedad no se observó en localnet.
