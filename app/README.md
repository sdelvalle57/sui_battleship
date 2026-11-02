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
3. **Wallet de desarrollo** (burner del kit): solo en localnet **y** con `npm run dev` (D-20261102-02 (5)). Para firmar
   con una wallet de navegador, esa wallet tiene que apuntar a la misma localnet.
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
├── components/  # UI sin lógica de negocio (LobbyList, GameDetail, ReadState, Header…)
├── pages/       # páginas del router por hash: HomePage (#/), GameDetailPage (#/game/:id), NotFoundPage
├── test/        # setup de Vitest y arnés de TanStack Query para tests
└── App.tsx      # rutas (appRoutes) + RouterProvider
scripts/
└── capture-read-fixtures.mjs   # captura de las fixtures reales de lectura (ver "Fixtures de lectura")
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
| `ids.ts` | `parseObjectIdInput` (valida y normaliza en el borde) y `sameAddress` | #10 |
| `transactionInfo.ts` | hora/checkpoint de una transacción, checkpoint de la publicación (`null` = podada) y hora de un checkpoint | #10 |
| `gameDetail.ts` | `fetchGame` (detalle por ID) y `GAME_REFETCH_MS` | #10 |
| `lobby.ts` | `fetchLobbyPage` (lobby por eventos con el `ListEvents` crudo), `lobbyLowerBound` y las constantes calibradas | #10 |
| `errors.ts` | mapeo (módulo, código de abort) → mensaje | #11 |
| `transactions/*.ts` | builders puros de PTB | #11, #12 |

### Hooks (`app/src/hooks/`)

| Hook | Qué devuelve |
|---|---|
| `queryKeys.ts` | **únicas** claves de TanStack Query: `['sui', red, recurso, …]` (`nodeInfo`, `lobby`, `game`, `txInfo`, `publishCheckpoint`, `checkpointTime`); los `bigint` como string |
| `useLobby` (+ `usePublishCheckpoint`) | filas con `isMine`, `ReadStatus` combinado con la publicación, `hasNextPage`, `isFetchingNextPage`, `nextPageError`, `stalled`, `lowerBound`, `end`, `loadMore`, `refresh` |
| `useGame` | `invalid_id` sin consulta, o la partida con su `ReadStatus`; refresco cada 15 s y al foco |
| `useTransactionTime` / `useCheckpointTime` | hora inmutable (`staleTime: Infinity`); sin digest (`null`/`''`) o sin número no consultan |
| `useNodeStatus`, `useWalletAccount`, `useAppConfig` | indicador de red, cuenta conectada y config |

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
- **Detalle (`#/game/:id`):** lee el objeto; se refresca cada **15 s** y al volver el foco. "Última actividad" es la hora
  de `previousTransaction`, que es la **última** transacción que tocó el objeto, también una **fallida** (sonda P6 de
  #10): nunca se presenta como "la que la resolvió".
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
  URL se valida y normaliza antes de consultar; uno inválido no consulta la red. **Regla para #11/#12:** todo ID o
  dirección que entre por formulario pasa por el mismo borde antes de consultar o armar un PTB. `explorer.ts` valida
  pero no normaliza; los IDs de config ya llegan normalizados.
- Lecturas solo con TanStack Query sobre `useCurrentClient()` y claves de `queryKeys.ts`; nada de `useEffect` para pedir
  datos (PROY-14). La hora de un evento no viene en `listEvents`: sale de la transacción (`timestampMs`).

### Fixtures de lectura

`contracts/fixtures/game-reads.localnet.json` (5 variantes de `Game`, sus eventos y una página cruda de `ListEvents`,
capturadas en una localnet desechable) la usan los tests de `sui/`. Cómo recapturarla:
`contracts/README.md`, "Lectura desde la app" (`node app/scripts/capture-read-fixtures.mjs` dentro de la localnet
aislada; solo acepta `http://127.0.0.1:9000`).

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

## Dependencias y avisos de seguridad (SEG-8, D-20261102-02 (3))

- Versiones **exactas** en `app/package.json`, `package-lock.json` commiteado y `.npmrc` en la raíz:
  `save-exact`, `engine-strict`, `min-release-age=7` (ninguna versión con menos de 7 días) e `ignore-scripts`.
- Los `@mysten/*` acoplados van **por tren** (hoy `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
  `@mysten/dapp-kit-react` 2.1.41, con una sola versión de cada uno en el árbol); se suben juntos.
- **Al subir el tren `@mysten/*`:** revisar `TransactionErrorReason` y `ObjectErrorReason` de `@mysten/sui/client`.
  `fetchPublishCheckpoint` trata todo `TransactionError` como "podada" porque en 2.37 su único motivo es `notFound`, y
  `fetchGame` mapea `ObjectError` `notFound`/`deleted` a "no existe"; un motivo nuevo cambia esa lectura.
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

- El build de testnet pesa ≈ 852 kB (≈ 260 kB gzip) y Vite avisa de un chunk mayor de 500 kB: el code-splitting
  queda para #15 (hosting).
- El detalle (`useGame`) sigue pidiendo cada 15 s aunque el error sea definitivo (no existe, no es una partida, datos
  ilegibles): cortar ese intervalo (`refetchInterval` como función que devuelve `false` si el error no es transitorio) y
  qué refrescar después de una transacción propia quedan para #11/#12. El lobby no tiene intervalo.
