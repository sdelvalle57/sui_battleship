## Veredicto: REQUIERE CAMBIOS (0 🔴 · 4 🟠 · 7 🟡 · 5 🔵) — PLAN_APP v1 (#9), MAYOR, 2026-11-02

> Artefacto: `documents/PLAN_APP.md` **v1** (sin trackear, 540 líneas, md5 `61890f8c…`), leído en el working tree de
> `feature/issue-7-deployments` @ `7567943` (durante la revisión el orquestador pasó por `docs/decisions-7-9` @
> `db3f2a5` y volvió; el plan no cambió). Primera ronda: no hay hallazgos previos que dar por resueltos.
> Contexto nuevo: **D-20261102-02** (STOPs de #9, "Todo lo recomendado") y **D-20261102-01** (STOPs de #7) ya están en
> `documents/DECISIONES.md` (sin commitear en esta branch), "sujetas a la revisión del MAYOR". Esta revisión **no
> cambia ninguna de las 7 recomendaciones**: agrega condiciones de implementación y verificación. No hace falta
> volver a consultar al usuario; 🟡-7 es informativo para él.
> Sin gates (D-20261030-02), sin instalaciones, nada en `~/.sui/`. Evidencia propia: `npm view` (npm 11.20.0 / Node
> 26.13.0), `gh api` de `MystenLabs/sui@testnet-v1.83.0`, `MystenLabs/ts-sdks@main`, `actions/setup-node`,
> `actions/checkout`, settings del repo, y los `dist` publicados de `@mysten/sui@2.37.0` (unpkg).

### Resumen

El plan es sólido: HU completa, alcance y fuera de alcance claros, dependencia de #7 explícita (TASK-4 bloqueada hasta
el merge, `PLAN_APP.md:69-74, 455, 538`), investigación de npm/SDK/nodo mayormente correcta y verificable, CI con
mínimos privilegios. Fallan cuatro cosas: la regla de versiones rompe la resolución de los paquetes de Mysten, el
indicador "nodo OK" queda cacheado por el SDK, STOP-1 se decidió sin una prueba empírica barata de `ListEvents`/CORS, y
el smoke contradice el procedimiento de localnet que fija #7.

### Hallazgos

| # | Sev. | Regla | Sección / líneas | Problema | Escenario de falla | Corrección exigida |
|---|---|---|---|---|---|---|
| 🟠-1 | MAJOR | SEG-8, STOP-3/4 | `PLAN_APP.md:176-183` (regla de versión y fila `@mysten/dapp-kit-react`), `:413-417` (DoD de TASK-1) | La regla "última versión de cada paquete con ≥ 7 días" se aplica **paquete por paquete**, pero los de Mysten salen en **trenes** con peers acoplados. `@mysten/dapp-kit-react@2.1.41` depende de `@mysten/dapp-kit-core` **`^1.6.39`** (rango, no exacto). Peers: core `1.6.39` → `@mysten/sui ^2.37.0`; core `1.6.40` (2026-10-26T15:29Z) y `1.6.41` (2026-10-27T17:13Z) → **`^2.38.0`** (`npm view @mysten/dapp-kit-core@<v> peerDependencies`). La afirmación del plan "peer `^2.37.0`" solo vale para 1.6.39. | Con `min-release-age=7`, desde el 2026-11-02T15:29Z core 1.6.40 entra en la ventana; `npm install` con `@mysten/sui` fijado en `2.37.0` da **ERESOLVE** o anida un segundo `@mysten/sui@2.38.x` bajo el kit (dos SDK: `SuiGrpcClient`/`Transaction` de copias distintas, tipos incompatibles). Depende de la hora a la que el DEV corra `npm install`. | (1) La regla de STOP-4 elige el **tren de Mysten** como unidad: `@mysten/sui` X + `@mysten/dapp-kit-react` Y + `@mysten/dapp-kit-core` Z (agregarlo como **dependencia directa exacta**, ya lo nombra D-20261102-02 (1)), todas ≥ 7 días y con el peer de Z que admite X. Hoy: 2.37.0 / 2.1.41 / 1.6.39; desde el 2026-11-03 ~17:15Z, 2.38.0 / 2.1.43 / 1.6.41 (re-verificar en el handoff). (2) DoD de TASK-1: `npm ls @mysten/sui @mysten/dapp-kit-core` con **una sola versión de cada uno** (output pegado). |
| 🟠-2 | MAJOR | SEG-10 (estado honesto), PROY-15, HU | `PLAN_APP.md:254-258` (decisión del indicador), `:480-485` (`useNodeStatus`) | `useNodeStatus` usa `client.getChainIdentifier()`, que el SDK **cachea para siempre** tras el primer éxito: `@mysten/sui@2.37.0/dist/grpc/core.mjs:504-510` (`this.cache.read(["chainIdentifier"], …)`) y `dist/client/cache.mjs:9-16` (guarda el valor resuelto; solo borra en error). Los refetch de TanStack no tocan la red. | Se apaga o se regenera la localnet con la página abierta: el badge sigue en **"nodo OK"** (o nunca pasa a **"red equivocada"** con la génesis nueva) hasta recargar. La HU promete mostrar "si el nodo responde" (`:10`). | Liveness sin caché: una función pura en `app/src/sui/` (p. ej. `fetchNodeInfo(client)`) sobre `client.ledgerService.getServiceInfo({})` (público, `dist/grpc/client.d.mts:98`; devuelve `chainId` base58 + `checkpointHeight`), consumida por `useNodeStatus` con `useQuery` + `refetchInterval` moderado (15-30 s, LIM-6 constante nombrada). Test: un primer poll OK y un segundo con error ⇒ "sin conexión"; `chainId` distinto en un poll posterior ⇒ "red equivocada". |
| 🟠-3 | MAJOR | Issue #9 (Notas: "verificar la fuente de datos de eventos… requisito duro de #10 y #13"), STOP-1 | `PLAN_APP.md:85-86` (E6, E7), `:139-141`, `:526`, `:537` (R4) | STOP-1 (ya aprobado) se apoya en E6 (gRPC-web + CORS) y E7 (`ListEvents` con indexado en localnet) **solo por lectura de código**; la confirmación empírica se difiere a #10. El código lo respalda (`sui-node/src/lib.rs:3002-3008` CORS `Any`; `sui-rpc-api/src/grpc/mod.rs:77` `GrpcWebLayer`; `ledger_service/mod.rs:147-157` `ListEvents` es **server-streaming** sobre `ledger_history`; además `sui/src/sui_commands.rs:1048-1064` fuerza `enable_indexing: Some(true)` al hacer `sui start`, evidencia más fuerte que la de E7), pero el camino de índice (`embedded_rpc_store`, `lib.rs:2953-2967`) no se probó. | Si en #10 `listEvents` por tipo falla o devuelve vacío en localnet, STOP-1 se reabre con el andamiaje, PROY-14 y los docs ya mergeados sobre gRPC, y el plan B (GraphQL) exige indexer + PostgreSQL (E8). | Agregar al smoke de #9 una **sonda del DEV sin navegador**, con la localnet aislada y la publicación de #7 ya hechas: (1) preflight CORS: `curl -si -X OPTIONS -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: POST' http://127.0.0.1:9000/sui.rpc.v2.LedgerService/GetServiceInfo` ⇒ `access-control-allow-origin: *`; (2) un script Node con el `@mysten/sui` del workspace: `getChainIdentifier()` y `listEvents({ filter: { eventType: '<originalPackageId>::house::FeeRateUpdated' } })` tras un `update_fee_rate` por CLI (o `GameCreated` tras un `create_game`) ⇒ ≥ 1 evento con `json` legible. Criterio: si falla, vuelve a STOP-1 **antes** de TASK-5. |
| 🟠-4 | MAJOR | `agents.md` §3 (localnet aislada), ARQ-8, criterio "README: cómo apuntar a localnet (json de #7)" | `PLAN_APP.md:74`, `:514-528` (smoke), `:497-498` (README) | El smoke asume que el script de #7 deja `contracts/deployments/localnet.json`. Pero #7 fija para smokes `--out "$SMOKE_DIR/localnet.json"` (`PLAN_DEPLOY.md:466`, texto que va a `agents.md` §3 paso 4) y su cierre exige "sin `localnet.json` en el repo" (`PLAN_DEPLOY.md:495`). La app solo lee `contracts/deployments/*.json` por glob (`PLAN_APP.md:241-245`). Además: paso 6 "con `curl`" (`:526`) no puede ver `ConfigError` ni la wallet (la SPA renderiza en el cliente); no se define cómo arrancan/paran `vite`/`vite preview` (proceso en segundo plano, PID, puerto) ni el traspaso DEV → quien tenga navegador con la localnet viva. | El DEV sigue `agents.md` §3 de #7 ⇒ la app muestra `ConfigError` en vez de "nodo OK"; o copia el JSON al repo y el cierre de #7 lo marca como resto; o queda un `localnet.json` viejo que se empaqueta en builds posteriores. | `SMOKE_APP` (y `app/README.md`): publicar con `--out <repo>/contracts/deployments/localnet.json` (o copiar desde `$SMOKE_DIR`), borrarlo en el cierre y comprobarlo; `vite`/`vite preview` como comando en segundo plano del harness con `exec` y PID en `<SMOKE_DIR>`, cerrados con `kill` como la red; paso 6 lo ejecuta quien tenga navegador (o se reemplaza por 🟡-3); traspaso explícito con la localnet arriba y quién la cierra. Coordinar la redacción de `agents.md` §3 con #7 (rebase del segundo PR). |
| 🟡-1 | MINOR | ARQ-1, PROY-13, criterio de ESLint del issue | `PLAN_APP.md:300-306` | La regla de capas es una **lista negra por carpeta** (`components`, `pages`, `App`, `main`). El issue pide lo inverso: prohibir `@mysten/sui` **fuera de** `sui/` y hooks. `providers/` queda con `@mysten/sui` permitido sin necesidad. | Una carpeta nueva (`src/features/`, `src/utils/`) importa `@mysten/sui` sin que el lint lo vea. | Restricción sobre `src/**/*.{ts,tsx}` y overrides que la relajan solo en `src/sui/**` y `src/hooks/**`; `src/providers/**` solo `@mysten/dapp-kit-react`. La sonda de TASK-1 también prueba `sui/` → `react`. |
| 🟡-2 | MINOR | PROY-12, criterio de `format.ts` | `PLAN_APP.md:439-452` | `parseToMist` no acota a u64 y acepta `.5` y `-0` (`dist/utils/format.mjs:13-23`, regex `^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$`). El plan lista `".5"` y `" 1"` sin decir el resultado esperado y no rechaza montos > `u64::MAX`. | `18446744073.709551616` pasa `parseSuiToMist` y recién falla al serializar el PTB en #11 (error opaco). | Motivo `'too_large'` para > `u64::MAX` (constante nombrada); resultado esperado explícito para `.5`, `1.`, `-0`, `" 1"`, `"1e3"` en el handoff. |
| 🟡-3 | MINOR | STOP-5, SEG-9 | `PLAN_APP.md:215`, `:522-523` | La verificación de STOP-5 en el smoke es **vacía**: el build de testnet sin `testnet.json` muestra `ConfigError` antes de crear los providers, así que "la wallet de desarrollo no aparece" se cumple por construcción. | Un error de cableado (p. ej. `createAppDAppKit` ignorando `burnerWalletEnabled`) en un build de producción no se detecta en el smoke. | Paso extra: `VITE_SUI_NETWORK=localnet npm run build -w app && npm run preview -w app` con `localnet.json` ⇒ la app conecta, "Unsafe Burner Wallet" **no** está en la lista de `ConnectButton` y no aparece su `console.warn` (`dapp-kit-core/src/wallets/unsafe-burner.ts:66-68`). Opcional: `slushWalletConfig: null` en localnet (Slush no firma en localnet). |
| 🟡-4 | MINOR | STOP-3, PROY-17 | `PLAN_APP.md:162`, `:273-274`, `:540` | `engine-strict=true` aplica a **todo el árbol** (`config.md:634-641`): una dependencia transitiva con `engines` que excluya Node 26 aborta `npm ci`. No figura como riesgo ni tiene salida definida (R7 cubre solo scripts de instalación). | `npm ci` rojo en TASK-1 o en un PR de actualización sin una regla de qué hacer. | Riesgo R8: un `EBADENGINE` transitivo ⇒ STOP (nunca `--force`). DoD: evidencia de que `engines` de la raíz se aplica (p. ej. `npm ci` con Node 22 falla), o se declara que solo es documental. |
| 🟡-5 | MINOR | PROY-20, D-20261102-02 (1), D-20261030-15 D6 | `PLAN_APP.md:495-505` (TASK-6) | `contracts/README.md:398-401` (y `:177`) sigue diciendo "API de lectura: la elige #10 (gRPC o GraphQL)"; TASK-6 no lo lista. Tampoco se registra que `listEvents` por gRPC **no trae timestamp** (`dist/grpc/core.mjs:388-398`: `checkpoint`, `transactionDigest`, `eventIndex`), y D6 usa la hora de la transacción de `GameCreated` (`contracts/README.md:177, 413-414`). | #10 parte de un README desalineado con la decisión, y descubre tarde que necesita `getTransaction`/checkpoint para la hora. | TASK-6 actualiza `contracts/README.md` "Lectura desde la app" (cliente `SuiGrpcClient` de #9; #10 confirma con fixtures). Nota para #10 en STOP-1/R4: la hora sale de la transacción (`timestampMs`, `core.mjs:889`), no del evento. |
| 🟡-6 | MINOR | Flujo (plan = estado real), D-20261030-04 | `PLAN_APP.md:2-5`, `:50-74`, `:122-125`, `:69` | (a) Cabecera y STOP "pendientes" y PLAN_DEPLOY "sin aprobar", ya resueltos por D-20261102-02/01. (b) Solo TASK-4 figura bloqueada por #7, pero TASK-5 (`createAppDAppKit(config)`), TASK-6 y el smoke dependen de TASK-4. (c) No se dice cuándo `feature/issue-9-app` rebasa `master` (la fixture y el README "Despliegues" llegan con #7), ni que #7 y #9 editan `ci.yml`, `agents.md` §2/§3 y comparten working tree (un DEV a la vez). | Un DEV arranca TASK-5 sin config o trabaja #9 con el árbol en la branch de #7. | v2: estado de STOP → D-20261102-02; "TASK-4..6 y smoke requieren #7 en `master` + rebase de `feature/issue-9-app`"; TASK-1..3 solo sin DEV activo de #7 (o worktree decidido por el orquestador); riesgo de conflicto `ci.yml`/`agents.md` con #7 (`PLAN_DEPLOY.md:505`). |
| 🟡-7 | MINOR (informativo para el usuario) | STOP-3 × STOP-7, D-20261030-09 | `PLAN_APP.md:166-168`, `:380-381`, `:228-237` | Con `app` requerido, un advisory nuevo en una dependencia de producción bloquea **todos** los PR (también los de contratos o docs, p. ej. el `testnet.json` de #8), y `min-release-age` puede bloquear el arreglo durante 7 días (`config.md:1239-1243`: `audit fix` bloqueado ⇒ exit ≠ 0). D-20261102-02 (3) ya acepta "CI en rojo". | Merge congelado hasta 7 días sin cambio de código. | Sin cambio de decisión. Documentar el procedimiento en `app/README.md`/`agents.md` §3: `min-release-age-exclude` temporal, solo para el paquete arreglado y con issue de retiro (LIM-10). |
| 🔵-1 | SUGG. | SEG-8 | `PLAN_APP.md:179-196` | Licencias revisadas solo en las dependencias directas. | — | Listado de licencias del árbol desde `package-lock.json` (campo `license` de v3) en el reporte de TASK-1; marcar lo que no sea MIT/Apache-2.0/BSD/ISC. |
| 🔵-2 | SUGG. | ARQ-8, STOP-2 | `PLAN_APP.md:241-245`, `:148` | El glob `eager` empaqueta **todos** los `deployments/*.json`: el `localnet.json` de un desarrollador entra en su build de testnet. No es secreto (D-20261102-01 excluye direcciones), pero contradice "un solo `deployments/<red>.json` en juego". | — | Documentarlo, o filtrar en build (módulo virtual en `vite.config.ts` que importe solo `<red>.json`). |
| 🔵-3 | SUGG. | ARQ-1 | `PLAN_APP.md:109`, `:305` | `sui/dappKit.ts` importa `@mysten/dapp-kit-react` (bindings React), aunque la capa `sui/` "no conoce la UI". | — | Con 🟠-1 (core como dependencia directa): `createDAppKit` desde `@mysten/dapp-kit-core` (la doc lo usa así, `dapp-kit-instance.mdx:161-170`); el `declare module` de `Register` puede ir en `providers/`. |
| 🔵-4 | SUGG. | CI (árbol limpio) | `PLAN_APP.md:392-396` | `tsc --noEmit` con `incremental`/`tsBuildInfoFile` fuera de `node_modules` deja `*.tsbuildinfo` sin ignorar. | — | `tsBuildInfoFile` dentro de `node_modules/.tmp` (plantilla Vite) o `*.tsbuildinfo` en `.gitignore`. |
| 🔵-5 | SUGG. | evidencia | `PLAN_APP.md:86` (E7) | La cita de E7 es el builder de génesis. | — | Agregar `crates/sui/src/sui_commands.rs:1048-1064` @ `testnet-v1.83.0` (`sui start` fuerza `enable_indexing: Some(true)` en el fullnode). |

### Validado como correcto (con evidencia)

- **E1/STOP-1:** `@mysten/dapp-kit@1.1.17` deprecado ("only supports the deprecated Sui JSON-RPC API…", `npm view`). El
  sucesor `@mysten/dapp-kit-react` (Apache-2.0, exports `.` y `./ui`) y `createDAppKit` + `SuiGrpcClient({ network,
  baseUrl })` + `declare module … Register` están en `ts-sdks@main` `docs/content/dapp-kit/getting-started/react.mdx`.
  Opciones `{ network, baseUrl }`: `dist/grpc/client.d.mts:21-29`. URL de localnet `http://127.0.0.1:9000`: también en
  la doc oficial (`dapp-kit-instance.mdx:161-170`).
- **E6:** CORS permisivo `allow_origin(Any)` en `sui-node/src/lib.rs:3002-3008`, servido en `json_rpc_address`
  (`:3054`); `tonic_web::GrpcWebLayer` en `sui-rpc-api/src/grpc/mod.rs:77` @ `testnet-v1.83.0`. Líneas citadas exactas.
- **E7:** `ListEvents` en `ledger_service/list_events.rs:74` y `mod.rs:147-157`; `enable_indexing: Some(true)` en
  `node_config_builder.rs:701-706` (y en `sui_commands.rs:1048-1064`). Empírico pendiente → 🟠-3.
- **E16 / chainId:** `GetServiceInfo` devuelve el digest en base58 (`get_service_info.rs:16`); `Display` de
  `ChainIdentifier` = 4 primeros bytes en hex (`digests.rs:262-270`). Conversión recalculada por el MAYOR: testnet
  `69WiPg3…JNMD` → `4c78adac`, mainnet `4btiuiM…DR6S` → `35834a8a` (`digests.rs:164-165`). `fromBase58`/`toHex` existen
  en `@mysten/sui/utils` (2.37.0).
- **E9 / STOP-5:** `enableBurnerWallet` default `false` (`core/index.ts:69, 94`); keypair en memoria por instancia
  (`unsafe-burner.ts:46`), sin persistir. La condición `network === 'localnet' && import.meta.env.DEV` impide el burner
  en testnet (la red se fija en el build) y en `vite build`/`preview` (DEV = false). Verificación → 🟡-3.
- **E10 / TS:** `typescript-eslint@8.72.0` peer `typescript >=4.8.4 <6.1.0`; TS 7.0.2 incompatible; 6.0.3
  (2026-04-16, Apache-2.0) es la última compatible.
- **Versiones (STOP-4), con `npm view`:** las 21 existen, todas con ≥ 7 días al 2026-11-02 (`@tanstack/react-query
  5.105.0` justo: 2026-10-26T09:31Z), licencias MIT/Apache-2.0, `engines` compatibles con Node 26 (`vitest`
  `^22.12||^24||>=26`, `jsdom` `^22.22.2||^24.15||>=26`, `react-router` `>=22.22.0`, `eslint` `>=24`, `vite`
  `>=22.12`, `@mysten/sui` `>=22`, `jest-dom` `>=22`). Peers coherentes: `eslint-plugin-react-hooks@7.1.1` y
  `typescript-eslint` admiten `eslint ^10`; `@vitejs/plugin-react@6.1.2` → `vite ^8`; `vitest@5.0.5` → `vite ^8`;
  `@testing-library/react@16.3.3` → `react ^19`, `dom ^10`; `react-router@8.5.0` → `react >=19.2.7`. Las versiones
  "latest" que el plan descarta (`plugin-react 6.2.x`, `eslint 10.14.0`, `typescript-eslint 8.72.1`, `@types/node
  26.6.6`, `react-router 8.5.1`, `@mysten/sui 2.38.0`) tienen < 7 días. Problema de tren → 🟠-1.
- **Scripts de instalación:** sin `install`/`postinstall`/`preinstall` en `rolldown@1.2.14`, `lightningcss@1.33.0`,
  `jsdom`, `@mysten/sui`, `dapp-kit-core`, `eslint`, `vitest`; `esbuild` (con `postinstall`) es peer **opcional** de
  `vite@8.3.5` (`peerDependenciesMeta`), no entra al árbol.
- **E11 / `.npmrc`:** `min-release-age` (`config.md:1222-1243`, error si no hay versión en la ventana; bloquea `audit
  fix`), `min-release-age-exclude` (`:1250-1257`), `engine-strict` (`:634-641`), `ignore-scripts` (`:873-879`; `npm
  run`/`npm test` siguen corriendo su script), `save-exact` (`:1697-1703`), `npm audit signatures` (`npm-audit.md:33-45`).
- **E12:** `parseToMist` sin floats, rechaza > 9 decimales y no numéricos, acepta negativos (`format.mjs:13-28`).
- **E13/E14 + CI:** `sha_pinning_required: true`; `master` exige solo `contracts`, `strict: false`;
  `default_workflow_permissions: read`. `actions/setup-node` v7.1.0 = `949feb2413d6458794dcd2491c4babbbce0c15c1`
  (release 2026-10-08, `node24`, inputs `node-version-file`/`cache`/`cache-dependency-path`); `actions/checkout`
  v7.0.1 = `3d3c42e5…` (= `ci.yml:36`). Job `app`: sin `needs`, sin secretos, `persist-credentials: false`, hereda
  `permissions: contents: read` (`ci.yml:9-10`), no toca `contracts` ni `framework-drift`, mismo SHA de `setup-node`
  que #7 (`PLAN_DEPLOY.md:327, 421`), árbol limpio al final.
- **Dependencia de #7:** es explícita y bloqueante (`PLAN_APP.md:69-74, 455, 538`). Los campos que la app valida
  (`schemaVersion`, `network`, `chainId`, `packageId`, `originalPackageId`, `houseId`) coinciden con
  `PLAN_DEPLOY.md:138-145` y con D-20261102-01 (14 campos, sin direcciones). La política de compatibilidad (rechazar
  `schemaVersion ≠ 1`, ignorar claves desconocidas) es la de `PLAN_DEPLOY.md:168-174`.
- **Repo/docs:** `package-lock.json` no versionado por T3 de #2 (`git show 48df3b4:documents/PLAN_MONOREPO.md:185-187`);
  `.gitignore` cubre `contracts/deployments/localnet.json`, `node_modules/`, `app/dist/` y `.env*` salvo
  `.env.example`; `.nvmrc` = `26`; `package.json` raíz con `workspaces: ["app"]`; `ci.yml:131-132` = `TODO(#9)`.
  `@mysten/dapp-kit` y `useSuiClientQuery` solo aparecen en `agents.md:50` y `ESTANDARES.md:77` (TASK-6 los reescribe).
- **Diseño:** HU completa; sin contrato on-chain ni fondos (PROY-21 n/a); LIM-3 (sin archivos vacíos); `config.ts`
  como único lector de env/JSON (ARQ-8) con función pura testeable (ARQ-3); `bigint` (PROY-12); `no-console`,
  `dangerouslySetInnerHTML` prohibido, `strictTypeChecked`, `--max-warnings 0`; sonda de lint en el DoD; router por
  hash para #15; Suiscan y SuiVision responden `200` (2026-11-02).

### Recomendación por STOP (ya decididos en D-20261102-02; ninguna cambia)

| STOP | Recomendación MAYOR | Condiciones |
|---|---|---|
| 1 — kit y cliente | **(a)** `@mysten/dapp-kit-react` + `SuiGrpcClient` | 🟠-2 (liveness sin caché), 🟠-3 (sonda empírica de CORS y `ListEvents` en el smoke de #9), 🟡-5 (README y hora de los eventos para #10) |
| 2 — red por build | **(a)** | — (mainnet = error; `chainId` contra el nodo es un buen complemento) |
| 3 — cadena de suministro | **(a)** | 🟠-1 (tren de Mysten + `npm ls` único), 🟡-4 (`engine-strict` transitivo), 🟡-7 (procedimiento ante un advisory) |
| 4 — paquetes | **(a)** `react-router` + TS 6.0.3 | La regla de versión pasa a "por tren" para `@mysten/*` y se agrega `@mysten/dapp-kit-core` directo (🟠-1); el resto de la lista está verificado |
| 5 — burner | **(a)** | 🟡-3 (verificación en un build de producción de localnet); opcional `slushWalletConfig: null` en localnet |
| 6 — explorador | **(a)** Suiscan (indistinto; cambiarlo es una constante) | — |
| 7 — `app` requerido | **(a)**, después del merge de #9 | 🟡-7: el usuario sabe que un advisory nuevo puede congelar todos los merges hasta resolverlo |

### Cambios exigidos para v2 (resumen)

1. 🟠-1: regla de versión por tren de Mysten, `@mysten/dapp-kit-core` directo y exacto, `npm ls` de versión única en el DoD de TASK-1.
2. 🟠-2: `useNodeStatus` sobre `ledgerService.getServiceInfo` (sin caché) con `refetchInterval`, más tests de transición.
3. 🟠-3: sonda del DEV (preflight CORS + `listEvents` por `eventType` tras un evento real) en el smoke de #9; si falla, vuelve a STOP-1 antes de TASK-5.
4. 🟠-4: `localnet.json` del smoke en `contracts/deployments/` con creación y borrado explícitos, coordinado con #7; ciclo de vida de `vite`/`preview`; traspaso al navegador; paso 6 corregido.
5. 🟡-1..7 en la misma v2 (son puntuales); 🔵 a criterio del MID.

### Preguntas al MID/usuario

Ninguna bloqueante. Las 7 decisiones se mantienen; 🟡-7 solo informa al usuario.

---

## Revisión v2 — Veredicto: APROBADO (0 🔴 · 0 🟠 · 2 🟡 · 5 🔵; los 🟡 se aplican en el handoff) — MAYOR, 2026-11-02

> Artefacto: `documents/PLAN_APP.md` **v2** (sin trackear, 588 líneas, md5 `d8b0a915…`), leído en el working tree de
> `feature/issue-7-deployments` @ `cd2398f` (incluye D-20261102-03 y PLAN_DEPLOY v2 aprobado). Mismas reglas que en v1:
> sin gates ni instalaciones, nada en `~/.sui/`, evidencia con `npm view` y `gh api`.

### Resueltos de la v1 (con evidencia)

| v1 | Estado | Dónde en v2 | Verificación del MAYOR |
|---|---|---|---|
| 🟠-1 tren de Mysten | ✅ | `PLAN_APP.md:164-178` (regla y tabla de trenes), `:183`, `:377-378` (DoD de `npm ls` de 4 paquetes, sin `invalid`/`UNMET PEER`), R2 `:563` | Re-verifiqué la tabla con `npm view`: tren 10-19 = sui 2.37.0 / core 1.6.39 / react 2.1.41 / wallet-standard 0.21.35 / slush 1.3.5 (peers `^2.37.0`); tren 10-26 = 2.38.0 / 1.6.40 (15:29Z) / 2.1.42 (core `^1.6.40`) / 0.21.36 (15:29Z) / 1.3.6 (15:30:56Z), peers `^2.38.0`, elegible desde 2026-11-02 ~15:31Z; tren 10-27 = core 1.6.41 / react 2.1.43 (17:14Z), elegible desde 2026-11-03 ~17:15Z. Los otros `@mysten/*` del árbol (`utils` 0.4.2, `bcs` 2.1.3, `window-wallet-core` 0.4.1) no tienen peer sobre `@mysten/sui`. Con core directo y exacto, los `^` transitivos no pueden saltar de tren dentro de la ventana, y el lockfile congela el resultado. |
| 🟠-2 liveness | ✅ | `:214-219`, `:487-495`, tests `:501-503`, smoke paso 11 `:551` | `ledgerService` es público (`dist/grpc/client.d.mts:98`) y `getServiceInfo` no pasa por `ClientCache` (en `core.mjs:504-510` solo lo cachea `getChainIdentifier`). Estados `loading\|ok\|wrong_chain\|offline` con prioridad del error sobre el dato previo: correcto en TanStack v5, que conserva `data` con `status: 'error'`. Además, el paso 11 lo prueba de verdad en el navegador. |
| 🟠-3 sonda | ✅ | TASK-4 `:438-463` (gate antes de TASK-6, `:480`), R4 `:565` | `update_fee_rate(house, _cap, new_fee_rate: u16)` emite `FeeRateUpdated { house_id, old_fee_rate, new_fee_rate }` (`contracts/sources/house.move:48-52, 98-104`): los argumentos `"$HOUSE" "$CAP" 250` y el `json` esperado (`new_fee_rate: 250`) coinciden. Con `node --input-type=module -e` las importaciones se resuelven desde el cwd (`<repo>/app`, sube hasta `node_modules` de la raíz). |
| 🟠-4 smoke vs #7 | ✅ | `:532-556`, TASK-7 `:511-520` | Coincide con la revisión de #7, hallazgo v2-5 (`git show cd2398f:documents/REVISION_PLAN_DEPLOY.md:151`): variante sin `--out` → `contracts/deployments/localnet.json`, con `mkdir -p` en el script y `rm -f` en el paso 7 de §3. #9 además lo comprueba él mismo (paso 0 `test ! -e`, paso 13 `rm -f` + `test ! -e`). Hay PIDs de `vite`/`preview`, pasos 🌐 y R10. Detalles de ejecución → 🟡 v2-1. |
| 🟡-1 lista blanca | ✅ | `:262-275`, sondas `:386-388` | Regla base sobre `src/**` con overrides; una carpeta nueva queda cubierta y se prueba. |
| 🟡-2 `format.ts` | ✅ | `:210-212`, `:409-435` | La tabla de resultados es coherente con la regex del SDK (`format.mjs:13`): `.5` ok, `1.` inválido, `-0` lo rechaza el wrapper antes del SDK, `u64::MAX + 1` → `too_large`. |
| 🟡-3 burner | ✅ (ver 🟡 v2-2) | `:226-227`, smoke pasos 9-10 `:549-550`, tests `:504-505` | Build de producción de localnet + preview. Correcto. |
| 🟡-4 `engine-strict` | ✅ | R8 `:569`, DoD 5 `:383-385`, TASK-7 `:516` | — |
| 🟡-5 docs y hora | ✅ | `:37-38`, `:135-137`, E19 `:113`, TASK-7 `:524-525`, DoD `:529` | — |
| 🟡-6 estado y dependencias | ✅ | `:3-7`, `:78-89`, `:465`, `:480`, `:508`, R9 | TASK-1..4 no dependen de #7; TASK-5..7 y el smoke esperan a #7 en `master` + rebase; un DEV a la vez. |
| 🟡-7 advisory | ✅ | `:157-160`, TASK-7 `:514-516`, R6 | — |
| 🔵-1..5 | ✅ | `:381-382`, `:199-205`, `:221-224`, `:229-230`, E7 `:101` | — |
| D-20261102-03 | ✅ | `:44-47`, `:143`, `:588` | Ningún paso usa la clave del owner ni `~/.sui/`. Los `suic chain-identifier` corren con `env.sh` (config aislada; el motivo de D-03 es que ese comando reescribe el `client.yaml` activo). Testnet solo con la wallet del navegador. |

### Hallazgos nuevos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección (en el handoff) |
|---|---|---|---|---|---|---|
| 🟡 v2-1 | MINOR | `agents.md` §3 (las variables no persisten; rutas literales), PROY-17 | `PLAN_APP.md:452-453` (TASK-4 paso 5), `:544` (paso 4), `:549` (paso 9), `:552` (paso 12) | Los pasos marcados "**sin** `env.sh`" usan `$SMOKE_DIR` y `$NODE`, que solo define `env.sh`. Los pasos 9 y 12 llaman a `npm` a secas, que en un shell nuevo puede ser el Node por defecto de la máquina (no el 26). | En una llamada nueva, `$SMOKE_DIR`/`$NODE` están vacíos: `echo $$ > "/vite.pid"` falla, o el build corre con otro Node y no es el gate. | En esas llamadas, rutas absolutas **literales** (como exige §3 paso 2), o un `<SMOKE_DIR>/app.env` propio con `SMOKE_DIR`, `NODE` y `PATH` del bin de Node 26, sin tocar `HOME`. `npm` desde ese bin. |
| 🟡 v2-2 | MINOR | SEG-9 (verificación honesta) | `PLAN_APP.md:550` (paso 10) | El resultado esperado "sin … Slush en la lista" no depende solo de la app: `slushWalletConfig: null` desactiva **solo** la wallet web de Slush (`dapp-kit-core/src/core/index.ts:94-95`). Las extensiones del navegador (la extensión Slush u otras wallet-standard) se registran igual. | El usuario tiene la extensión Slush instalada: el paso 10 sale rojo sin que la app falle (falso negativo), o se "arregla" a mano. | Resultado esperado: sin "Unsafe Burner Wallet" y sin la entrada **web** de Slush; las extensiones instaladas pueden aparecer y se anotan. |
| 🔵 v2-3 | SUGG. | R1 | `:548` (paso 8) | Con `vite` dev, quitar o devolver un archivo del glob `eager` que está **fuera** de `app/` depende del watcher. | La recarga da error de módulo en vez de `ConfigError`. | Si pasa, reiniciar `vite` (kill + relanzar) antes de declarar la falla; TASK-5 ya cubre dev/build con y sin JSON. |
| 🔵 v2-4 | SUGG. | E6 | `:449-451` | El preflight no incluye las cabeceras que manda el transporte gRPC-web. | — | Agregar `-H 'Access-Control-Request-Headers: content-type,x-grpc-web,x-user-agent'` y esperar `access-control-allow-headers` (el nodo tiene `allow_headers(Any)`, `lib.rs:3007`). |
| 🔵 v2-5 | SUGG. | LIM-11 | `:501-503`, `:551` | TanStack reintenta 3 veces por defecto (backoff ~1+2+4 s). | Tests de transición lentos o intermitentes con timers falsos. | `QueryClient` de test con `retry: false`. En el smoke, el margen del paso 11 incluye ~7 s de reintentos. |
| 🔵 v2-6 | SUGG. | LIM-8 | `:409-410` | Si `parseSuiToMist` distingue `too_many_decimals` de `invalid` leyendo el **texto** del error del SDK, se rompe en silencio al cambiar el mensaje. | — | Clasificar con chequeos propios (regex y cantidad de decimales) antes de llamar a `parseToMist`; los tests de la tabla lo cubren. |
| 🔵 v2-7 | SUGG. | 🟠-2 | `:538-553` | El smoke ya no prueba "red equivocada" en el navegador (la v1 lo tenía). | — | Paso opcional: copia temporal de `localnet.json` con otro `chainId` (el archivo no se versiona) → "red equivocada"; restaurar. |

### Recomendación

Aprobar el plan v2. 🟡 v2-1 y v2-2 los aplica el MID en el handoff (son de redacción del smoke y no cambian el
diseño); los 🔵 quedan a su criterio. Las 7 decisiones de D-20261102-02 siguen igual.
