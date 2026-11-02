# PLAN_APP v2
> Issue: #9 (entrada: #7; consumidores: #10, #11, #12) | Áreas: app / ci / docs | Fecha: 2026-11-02
> Branch: `feature/issue-9-app`, creada por el orquestador desde `master` (≥ `8c67221`, merge de #34 con
> D-20261102-01/02). Este plan se redactó en el working tree de `feature/issue-7-deployments` sin tocar nada de #7.
> Estado: **v2 para re-revisión del MAYOR.** STOP-1..7 decididos por el usuario: **D-20261102-02** ("Todo lo
> recomendado"); la revisión v1 (`documents/REVISION_PLAN_APP.md`: 0 🔴 · 4 🟠 · 7 🟡 · 5 🔵) no cambió ninguna
> decisión, solo agregó condiciones, todas incorporadas aquí ("Cambios v1 → v2", al final).

## Historia de usuario

**Como** desarrollador del proyecto (y, a través de él, el futuro jugador), **quiero** un cliente web en `app/`
que arranca con un solo comando, muestra con claridad en qué red de Sui está y si el nodo responde **en este
momento**, deja conectar y desconectar una wallet mostrando la dirección abreviada, y trae una capa `app/src/sui/`
con la configuración de red e IDs, el formato de montos y los links al explorador, todo con lint, typecheck, tests y
build en verde en local y en CI, **para** construir el lobby, crear/cancelar, aceptar y el panel admin (#10–#14)
sobre una base segura y verificada en lugar de improvisar el andamiaje en cada issue.

**Scope en una frase:** el esqueleto de la app (Vite + React + TS estricto + SDK de Sui + wallet kit vigente
de Mysten), su capa `sui/` base, la política de dependencias, el job `app` de la CI y la prueba empírica del canal
gRPC-web (CORS + eventos por tipo) que usarán #10–#14.
**Lo que NO entrega:** ninguna pantalla ni transacción del juego (lobby y detalle #10, crear/cancelar y
`errors.ts` #11, aceptar #12, mis partidas #13, admin #14); fixtures de lectura del `Game` (#10, D-20261031-01); el
formato de `contracts/deployments/<red>.json` ni su script (#7); publicación en testnet (#8); hosting (#15).

## Contexto y alcance

**Problema (evidencia):**
- `app/` no existe: `documents/STATUS.md:19` ("UI React ⬜ no existe") y `:55` (baseline de app "no existe");
  `package.json` declara `"workspaces": ["app"]` sin el workspace.
- La CI tiene el hueco reservado: `.github/workflows/ci.yml:131-132` (`TODO(#9): job app …`).
- `agents.md:50` deja el wallet kit sin fijar ("`@mysten/dapp-kit` o su sucesor vigente; se fija en el issue
  de scaffolding") y `agents.md:144-152` ya define los comandos del gate de la app.
- `package-lock.json` no está commiteado: T3 de #2 lo borró a propósito porque "#9 lo regenera con las primeras
  dependencias" (`git show 48df3b4:documents/PLAN_MONOREPO.md`, líneas 185-187).
- `.gitignore:7` ya ignora `contracts/deployments/localnet.json` (desde #2); `.gitignore:14-16` ignora `.env*`
  salvo `.env.example` (SEG-3); `.gitignore:10-11` ignora `node_modules/` y `app/dist/`.
- `contracts/README.md:177` y `:398-401` todavía dicen "API de lectura: la elige #10 (gRPC o GraphQL)": queda
  desalineado con D-20261102-02 (1) y se corrige en TASK-7.

**Contradicciones del issue resueltas por decisiones registradas (no se reabren):**
- El issue dice "Node 22" (criterio 1): manda **Node 26** (D-20261030-10, `.nvmrc` = `26`, PROY-17).
- El issue ofrece "(a) `@mysten/dapp-kit` con el cliente JSON-RPC": descartada por D-20261031-01 y D-20261102-02 (1).

**Decisiones del usuario que enmarcan el plan:** D-20261102-02 (STOP-1..7 de #9), D-20261102-01 (esquema y script
de #7), **D-20261102-03** (`~/.sui/` sin claves para siempre; la clave del owner vive en un `SUI_CONFIG_DIR`
propio). Consecuencia para #9: ningún paso usa la clave del owner ni toca `~/.sui/`; los pasos de testnet del smoke
los hace el owner con la wallet de su navegador, nunca con la CLI.

**Alcance:** workspace `app/` (npm workspaces desde la raíz), toolchain (Vite, React, TS estricto, ESLint con
reglas de hooks y de capas, Vitest + jsdom + Testing Library), dependencias fijadas con lockfile, sonda gRPC en
localnet, providers (TanStack Query, cliente Sui, wallet), router con hash, indicador de red con estado vivo del
nodo, conectar/desconectar con dirección abreviada, `app/src/sui/` base (`networks.ts`, `config.ts`, `format.ts`,
`explorer.ts`, `nodeInfo.ts`, `dappKit.ts`), job `app` de CI, `app/README.md`, docs (`agents.md`,
`ESTANDARES.md`, `STATUS.md`, `contracts/README.md` "Lectura desde la app") y smoke en el navegador.

**Fuera de alcance:** lo listado en "Lo que NO entrega"; estilos más allá de CSS plano; selector de red en
runtime (D-20261102-02 (2)); mainnet (agents.md §4).

### Dependencia de #7 (entrada, no se diseña aquí)

El esquema de `contracts/deployments/<red>.json` lo fija #7: **D-20261102-01 (1)** (14 campos, sin direcciones de
cuenta) sobre `documents/PLAN_DEPLOY.md` (v1 leído el 2026-11-02; el otro MID lo está corrigiendo tras su revisión),
sección "Formato … (contrato para #9)": IDs con formato `^0x[0-9a-f]{64}$`; reglas para el consumidor: validar los
campos que usa, **rechazar `schemaVersion` ≠ 1** e **ignorar claves desconocidas**; agregar un campo es aditivo,
renombrar o quitar sube `schemaVersion`; fixture real para #9 en `contracts/scripts/fixtures/localnet.deployment.json`.
La app solo exige:

| Campo | Uso en la app | Validación en `config.ts` |
|---|---|---|
| `schemaVersion` | compatibilidad del formato | `=== 1` |
| `network` | debe coincidir con `VITE_SUI_NETWORK` y con el nombre del archivo | `=== red elegida` |
| `chainId` | comprobar que el nodo conectado es la red del archivo (8 hex) | `^[0-9a-f]{8}$`; comparación en runtime (TASK-6) |
| `packageId` | targets de llamada `<packageId>::<mod>::<fn>` (#11, #12) | `^0x[0-9a-f]{64}$` |
| `originalPackageId` | tipos de eventos y objetos (#10, #13, #14) | `^0x[0-9a-f]{64}$` |
| `houseId` | House compartida (#11, #12, #14) | `^0x[0-9a-f]{64}$` |
| resto (`houseCapId`, `upgradeCapId`, `packageVersion`, `publishTxDigest`, campo de fecha, `sourceCommit`, `suiCliVersion`, `frameworkRev`, otros) | no los usa en #9 (`houseCapId` lo usará #14) | se ignoran (un renombre de estos, p. ej. del campo de fecha, no afecta a #9) |

**Reglas de dependencia (🟡-6):**
- **TASK-1..4** no necesitan #7: arrancan en `feature/issue-9-app` desde `master`. Comparten working tree con #7 (un
  DEV a la vez, D-20261030-04): solo corren cuando no hay un DEV activo de #7, o en un worktree que decida el
  orquestador.
- **TASK-5 (config), TASK-6 (providers: `createAppDAppKit(config)`), TASK-7 (docs) y el smoke** requieren #7
  mergeado en `master` **y** el rebase de `feature/issue-9-app` sobre ese `master` (trae la fixture, el script y
  "Despliegues" en `contracts/README.md`). Al generar ese tramo del handoff, el MID reemplaza la tabla de arriba por
  el esquema aprobado. Si el esquema aprobado no trae `schemaVersion` o `chainId`, se omiten esas validaciones
  (detalle interno); si renombra un campo usado, se ajusta TASK-5; si no expone `originalPackageId`, es STOP.
- **Conflictos esperados con #7:** `.github/workflows/ci.yml` (#7 agrega steps al job `contracts`; #9 reemplaza el
  bloque `TODO(#9)`), `agents.md` §2/§3/§5 (`PLAN_DEPLOY.md`, riesgo de conflicto). Quien mergee segundo rebasa y
  resuelve; ambos usan el mismo SHA de `actions/setup-node`.

## Investigación (evidencia verificada el 2026-11-02)

| # | Hallazgo | Evidencia |
|---|---|---|
| E1 | `@mysten/dapp-kit` está **deprecado**: "This package only supports the deprecated Sui JSON-RPC API and will not receive further updates" | `npm view @mysten/dapp-kit deprecated` (latest 1.1.17, 2026-08-17) |
| E2 | El sucesor es `@mysten/dapp-kit-react` (bindings React) sobre `@mysten/dapp-kit-core` (`createDAppKit`, framework-agnóstico): `DAppKitProvider`, `ConnectButton` (`@mysten/dapp-kit-react/ui`), hooks `useCurrentAccount`, `useCurrentNetwork`, `useCurrentClient`, `useDAppKit`, `useWalletConnection` | docs oficiales `MystenLabs/ts-sdks@main`: `packages/docs/content/dapp-kit/getting-started/react.mdx:60-190`, `dapp-kit-instance.mdx` (usa `createDAppKit` de `@mysten/dapp-kit-core`), `sui/migrations/sui-2.0/dapp-kit.mdx:38-41`; exports `.`/`./ui` (unpkg `@mysten/dapp-kit-react@2.1.41/package.json`) y `.`/`./web` (`@mysten/dapp-kit-core@1.6.39`) |
| E3 | Los hooks de datos del kit viejo **desaparecen** (`useSuiClientQuery` → `useQuery` de TanStack + `useCurrentClient()`); mutaciones → `dAppKit.signAndExecuteTransaction` con `useMutation` | `sui/migrations/sui-2.0/dapp-kit.mdx`, pasos 6-8 |
| E4 | Clientes del SDK: `SuiGrpcClient` ("the default") y `SuiGraphQLClient`, misma API; JSON-RPC deprecado. `SuiGrpcClient` expone además `ledgerService` (cliente gRPC crudo) | `sui/clients/index.mdx:38-55`, `sui/clients/core.mdx:89-101`; unpkg `@mysten/sui@2.37.0/dist/grpc/client.d.mts:98` |
| E5 | Eventos por tipo Move: `client.listEvents({ filter: { eventType }, order, limit })`, cursores `before`/`after`, páginas cortas posibles en gRPC (guiarse por `hasNextPage`). Cada entrada trae `packageId`, `module`, `sender`, `eventType`, `bcs`, `json`, `checkpoint`, `transactionDigest`, `eventIndex`: **sin timestamp** | `sui/clients/querying.mdx:394-418, 466-500`; unpkg `@mysten/sui@2.37.0/dist/grpc/core.mjs:370-398` (read mask incluye `json`) |
| E6 | El fullnode de `sui 1.83.0` sirve **gRPC-web** con **CORS permisivo** | `crates/sui-rpc-api/src/grpc/mod.rs:77` (`GrpcWebLayer`), `crates/sui-node/src/lib.rs:3002-3008` (`CorsLayer … allow_origin(Any)`) @ `testnet-v1.83.0`; **prueba empírica: TASK-4** |
| E7 | `ListEvents` existe en el servidor 1.83.0 y el fullnode de `sui start` nace con indexado activo | `crates/sui-rpc-api/src/grpc/v2/ledger_service/list_events.rs:74`; `crates/sui/src/sui_commands.rs:1048-1064` (`sui start` fuerza `enable_indexing: Some(true)`) y `crates/sui-swarm-config/src/node_config_builder.rs:701-706` @ `testnet-v1.83.0`; **prueba empírica: TASK-4** |
| E8 | GraphQL en localnet exige indexer + PostgreSQL | `crates/sui/src/sui_commands.rs:111-125, 893-905, 1127-1135` @ `testnet-v1.83.0` |
| E9 | Wallet de desarrollo: `enableBurnerWallet` (default `false`, "Dev-only"); clave `Ed25519Keypair` **en memoria**, nueva en cada carga, sin persistir; avisa con `console.warn` al inicializarse | `dapp-kit-instance.mdx` (Parameters); `packages/dapp-kit/packages/dapp-kit-core/src/wallets/unsafe-burner.ts:46, 66-68` |
| E10 | `typescript` latest es 7.0.2, pero `typescript-eslint` 8.72.x exige `typescript >=4.8.4 <6.1.0` (también su canary) | `npm view typescript-eslint@8.72.1 peerDependencies`, `@8.72.2-alpha.4` |
| E11 | npm 11.20.0 (el de Node 26.13.0) soporta `min-release-age` (+ `min-release-age-exclude`), `save-exact`, `engine-strict` (aplica a **todo el árbol**) e `ignore-scripts` (con él, `npm run`/`npm test` siguen corriendo su script). Con la ventana activa, un `audit fix` bloqueado sale con código ≠ 0 | `~/.nvm/versions/node/v26.13.0/lib/node_modules/npm/docs/content/using-npm/config.md:634-641, 873-883, 1222-1257, 1697-1703` |
| E12 | El SDK ya trae utilidades: `parseToMist` (sin floats, rechaza > 9 decimales y no numéricos; **acepta negativos, `.5` y `-0`; no acota a u64**), `formatAddress`, `fromBase58`, `toHex`, `isValidSuiObjectId`, `isValidTransactionDigest`, `MIST_PER_SUI`, `SUI_RANDOM_OBJECT_ID` | unpkg `@mysten/sui@2.37.0/dist/utils/index.d.mts` y `dist/utils/format.mjs:13-28` |
| E13 | Repo: `sha_pinning_required: true`; `master` exige solo el check `contracts` (`strict: false`) | `gh api repos/sdelvalle57/sui_battleship/actions/permissions`; `…/branches/master/protection/required_status_checks` |
| E14 | `actions/setup-node` v7.1.0 (2026-10-08) = `949feb2413d6458794dcd2491c4babbbce0c15c1`; inputs `node-version-file`, `cache`, `cache-dependency-path`, `package-manager-cache` | `gh api repos/actions/setup-node/releases/latest`, `git/ref/tags/v7.1.0`, `action.yml` en ese SHA |
| E15 | `react-router` 8.5.0 exporta `createHashRouter`/`HashRouter` (hosting estático, #15) | `packages/react-router/index.ts:185-187` @ tag `react-router@8.5.0` |
| E16 | Por gRPC el chain id llega como digest **completo en base58** (`ServiceInfo.chainId`); el `chainId` de #7 son sus **primeros 4 bytes en hex**. Vectores: testnet `69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD` → `4c78adac`, mainnet `4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S` → `35834a8a` | `crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs:16`, `crates/sui-types/src/digests.rs:164-165, 262-270` @ `testnet-v1.83.0`; conversión recalculada (MID y MAYOR) |
| E17 | `client.getChainIdentifier()` **cachea para siempre** el primer resultado (`this.cache.read(["chainIdentifier"], …)`): un refetch no vuelve a la red | unpkg `@mysten/sui@2.37.0/dist/grpc/core.mjs:504-510`, `dist/client/cache.mjs:9-16` |
| E18 | Los paquetes de Mysten salen en **trenes** con peers acoplados: `dapp-kit-react@2.1.41` → core `^1.6.39`; core `1.6.39` → peer `@mysten/sui ^2.37.0`, pero core `1.6.40`/`1.6.41` → `^2.38.0`; igual `@mysten/wallet-standard` `0.21.35` (`^2.37.0`) vs `0.21.36` (`^2.38.0`) y `@mysten/slush-wallet` `1.3.5` vs `1.3.6`, que el core pide con `^` | `npm view @mysten/dapp-kit-core@<v> peerDependencies dependencies`, `@mysten/wallet-standard@<v>`, `@mysten/slush-wallet@<v>` (2026-11-02) |
| E19 | La hora de una transacción sale de `getTransaction` (`timestampMs`), no del evento | unpkg `@mysten/sui@2.37.0/dist/grpc/core.mjs:889` |

## Contrato on-chain

**Sin cambios.** Ninguna firma, struct, evento ni abort code se toca. Impacto en `app/src/sui/`: se crea la capa
con su estructura y reglas; los artefactos que dependen del contrato llegan con su issue (sin archivos vacíos,
LIM-3):

| Archivo en `app/src/sui/` | Contenido | Issue |
|---|---|---|
| `networks.ts` | `Network = 'localnet' \| 'testnet'`, URL gRPC, base del explorador, `shortChainId` | #9 |
| `config.ts` | **único** lector de `import.meta.env` y de `contracts/deployments/*.json`; valida el esquema de #7 | #9 |
| `format.ts` | MIST ↔ SUI con `bigint`, dirección abreviada | #9 |
| `explorer.ts` | links a transacción y objeto de la red activa | #9 |
| `nodeInfo.ts` | `fetchNodeInfo(client)` sin caché y derivación pura del estado del nodo | #9 |
| `dappKit.ts` | instancia con `createDAppKit` de `@mysten/dapp-kit-core` y `SuiGrpcClient` | #9 |
| `game.ts` / `events.ts` | tipos y parsers del `Game` y de `GameCreated`/`GameCancelled`/`GameResolved`, con fixtures reales | #10 |
| `errors.ts` | mapeo **(módulo, código) → mensaje** (el 3 existe en `house` y en `game` con significados distintos, `contracts/README.md:261-265`); parser de aborts de efectos, wallet y dry-run | #11 |
| `transactions/*.ts` | builders puros de PTB (`accept_game` con `tx.object.random()` como último `MoveCall`, `contracts/README.md:377-392`) | #11, #12 |

Compatibilidad de upgrade: la config expone `packageId` (llamadas) y `originalPackageId` (tipos) desde el primer día.

**Notas para #10 (de la evidencia de #9):** `listEvents` por gRPC no trae hora (E5): la hora de creación
(D-20261030-15 D6) sale de `getTransaction(digest).timestampMs` (E19) o del checkpoint; las páginas pueden venir
cortas con `hasNextPage: true` (E5); la sonda de TASK-4 deja el primer evento real leído por `eventType`.

## Flujo de fondos

No aplica: #9 no firma ni arma transacciones de la app. La app nunca pide ni maneja claves (SEG-9); la wallet de
desarrollo vive solo en memoria, solo en localnet y solo en `npm run dev` (D-20261102-02 (5)). La sonda de TASK-4 y
el smoke usan cuentas de génesis de la localnet aislada (excepción acotada de `agents.md` §3), nunca la del owner.

## Decisiones del owner (D-20261102-02 — no reabrir)

| STOP | Decisión | Condiciones de la revisión del MAYOR (incorporadas) |
|---|---|---|
| 1 — kit y cliente | `@mysten/dapp-kit-react` + `@mysten/dapp-kit-core` + `SuiGrpcClient` (gRPC-web); kit viejo y GraphQL descartados | 🟠-2 liveness sin caché (TASK-6); 🟠-3 sonda empírica de CORS y `listEvents` (TASK-4, gate antes de TASK-6: **si falla, vuelve a STOP-1**); 🟡-5 `contracts/README.md` y hora de los eventos (TASK-7, "Notas para #10") |
| 2 — red por build | `VITE_SUI_NETWORK` (`localnet` \| `testnet`); mainnet = error; sin selector | — (el `chainId` contra el nodo lo complementa) |
| 3 — cadena de suministro | versiones exactas, `package-lock.json`, `.npmrc` (`min-release-age=7`, `ignore-scripts`, `save-exact`, `engine-strict`), `npm audit signatures` y `npm audit --omit=dev --audit-level=high` **bloqueantes** | 🟠-1 tren de Mysten + `npm ls` de versión única (TASK-1); 🟡-4 `engine-strict` transitivo (R8, DoD de TASK-1); 🟡-7 procedimiento ante un advisory (TASK-7) |
| 4 — paquetes | lista de "Paquetes" con `react-router` y TypeScript 6.0.3 | 🟠-1 regla de versión **por tren** para `@mysten/*` y `@mysten/dapp-kit-core` directo y exacto |
| 5 — burner | solo localnet y solo `npm run dev` | 🟡-3 verificación con un build de **producción** de localnet (smoke); Slush desactivado en localnet (decisión interna) |
| 6 — explorador | Suiscan en testnet; sin link en localnet | — |
| 7 — check `app` requerido | tras el merge de #9; **lo aplica el orquestador con la autorización expresa ya dada** | 🟡-7: un advisory nuevo puede congelar todos los merges hasta resolverlo (procedimiento en TASK-7) |

**Nota para el usuario (🟡-7, informativo):** con `app` requerido, un aviso de seguridad nuevo en una librería de
producción pone rojo el job en **todos** los PR (también los de contratos o el `testnet.json` de #8), y la ventana
de 7 días puede impedir instalar el arreglo durante ese tiempo. La salida es una excepción temporal
(`min-release-age-exclude`) solo para el paquete arreglado, con un issue que la retire (LIM-10).

## Paquetes (D-20261102-02 (4); versiones re-verificadas en el handoff)

**Regla de versión (🟠-1):**
- **Paquetes `@mysten/*`: por tren.** Se elige el **tren más reciente cuyos miembros tengan todos ≥ 7 días** al
  instalar: `@mysten/sui` X + `@mysten/dapp-kit-core` Z (dependencia **directa y exacta**) + `@mysten/dapp-kit-react`
  Y, con el peer de Z (y de los `@mysten/wallet-standard`/`@mysten/slush-wallet` que Z pide con `^`) satisfecho por X
  (E18). Así los rangos `^` transitivos no pueden saltar a un tren más nuevo (quedan fuera de la ventana) y el
  lockfile congela el resultado. Trenes al 2026-11-02 (14:42Z):

  | Tren | `@mysten/sui` | `dapp-kit-core` | `dapp-kit-react` | `wallet-standard` / `slush-wallet` | Elegible (≥ 7 días) desde |
  |---|---|---|---|---|---|
  | 2026-10-19 | 2.37.0 | 1.6.39 | 2.1.41 | 0.21.35 / 1.3.5 | ya; **deja de ser coherente** cuando entra el siguiente (los `^` transitivos saltan) |
  | 2026-10-26 | 2.38.0 | 1.6.40 | 2.1.42 | 0.21.36 / 1.3.6 | 2026-11-02 ~15:30Z |
  | 2026-10-26/27 | 2.38.0 | 1.6.41 | 2.1.43 | 0.21.36 / 1.3.6 | 2026-11-03 ~17:15Z |

  El handoff fija el tren vigente a su fecha; si el DEV instala después de que entre otro tren, usa ese y lo declara.
- **Resto:** la última versión de la línea vigente con ≥ 7 días al generar el handoff.

| Paquete | Rol | Versión (foto 2026-11-02) | Licencia | Justificación SEG-8 |
|---|---|---|---|---|
| `react`, `react-dom` | runtime | 19.3.1 | MIT | UI (D-20261030-03) |
| `@mysten/sui`, `@mysten/dapp-kit-core`, `@mysten/dapp-kit-react` | runtime | tren vigente (tabla de arriba) | Apache-2.0 | SDK y wallet kit oficiales (D-20261102-02 (1)); core directo para fijar el tren y para `createDAppKit` en `sui/` |
| `@tanstack/react-query` | runtime | 5.105.0 | MIT | Lecturas con caché, `refetchInterval` e invalidación (PROY-14) |
| `react-router` | runtime | 8.5.0 | MIT | `createHashRouter` (E15) |
| `typescript` | dev | 6.0.3 | Apache-2.0 | TS 7 incompatible con `typescript-eslint` (E10) |
| `vite`, `@vitejs/plugin-react` | dev | 8.3.5, 6.1.2 | MIT | Build y dev server |
| `vitest`, `jsdom` | dev | 5.0.5, 30.1.3 | MIT | Gate de tests |
| `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom` | dev | 16.3.3, 10.4.2, 7.0.1 | MIT | Tests de componentes |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` | dev | 10.13.0, 10.0.1, 8.72.0, 7.1.1 | MIT | Lint con hooks y capas |
| `@types/react`, `@types/react-dom`, `@types/node` | dev | 19.3.0, 19.3.0, 26.6.5 | MIT | Tipos (`@types/node` solo para `vite.config.ts`) |

Fuera a propósito: `@testing-library/user-event` (#11), `eslint-plugin-react-refresh`, `globals`, Tailwind,
librerías de validación. `engines` revisados: todos admiten Node 26. Scripts de instalación: ninguno en el árbol
previsto (`esbuild`, con `postinstall`, es peer opcional de `vite` y no entra).

## Decisiones internas (MID, actuar y reportar)

> Decisión (2026-11-02): `config.ts` lee los JSON con `import.meta.glob('../../../contracts/deployments/*.json',
> { eager: true, import: 'default' })`: un glob sin coincidencias no rompe el build (CI compila con
> `VITE_SUI_NETWORK=testnet` antes de que #8 cree `testnet.json`) y la falta del archivo se convierte en un error de
> pantalla claro. Consecuencia documentada (🔵-2): el glob empaqueta **todos** los JSON presentes; un `localnet.json`
> local entraría en un build de testnet hecho en esa máquina (no es secreto, D-20261102-01 excluye direcciones). Los
> builds que se publican salen de un checkout limpio (CI/#15), sin `localnet.json`; el cierre del smoke lo borra. Si
> `vite` no resuelve el glob fuera de `app/`, el DEV usa un alias y lo declara.

> Decisión (2026-11-02): la validación del JSON es una función pura escrita a mano (sin librería): cuatro IDs y dos
> escalares (SEG-8, ARQ-7).

> Decisión (2026-11-02): `format.ts` envuelve `parseToMist` del SDK (E12) y agrega lo que le falta: rechazo de vacío,
> de cualquier signo `-` (incluido `-0`) y de montos > `U64_MAX` (constante nombrada, LIM-6), más el formateo
> `bigint` → texto SUI. Sin `trim`: limpiar espacios es tarea del formulario (#11).

> Decisión (2026-11-02, 🟠-2): el estado del nodo **no** usa `getChainIdentifier()` (cachea para siempre, E17).
> `fetchNodeInfo(client)` llama a `client.ledgerService.getServiceInfo({})` en cada consulta y devuelve
> `{ chainId: shortChainId(response.chainId), checkpointHeight }`; `useNodeStatus` lo consume con `useQuery` +
> `refetchInterval: NODE_STATUS_REFETCH_MS` (20 000 ms). Estados: `loading | ok | wrong_chain | offline`, con prioridad
> al error del último intento sobre el dato previo (TanStack conserva `data` tras un error). Hacer que el estado
> bloquee acciones es tarea de #11.

> Decisión (2026-11-02, 🔵-3): `dappKit.ts` crea la instancia con `createDAppKit` de `@mysten/dapp-kit-core` (la capa
> `sui/` no importa los bindings React); el `declare module '@mysten/dapp-kit-react' { interface Register … }` va en
> `providers/`. Si `DAppKitProvider` no acepta el tipo de la instancia del core, el DEV importa `createDAppKit` de
> `@mysten/dapp-kit-react` en `providers/` y lo declara. Una sola red (`networks: [config.network]`).

> Decisión (2026-11-02, 🟡-3): en localnet, `slushWalletConfig: null` (la wallet web Slush no firma en localnet); en
> testnet, la configuración por defecto.

> Decisión (2026-11-02): `typecheck` = `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json`, **sin
> `incremental`/`composite`** (no genera `*.tsbuildinfo`, 🔵-4; el paso de árbol limpio de CI lo verifica).

## Diseño

### Layout

```
.npmrc                       # save-exact, engine-strict, min-release-age=7, ignore-scripts (sin tokens)
package.json                 # + "engines": { "node": ">=26 <27" } (workspaces sin cambios)
package-lock.json            # lockfileVersion 3, commiteado
app/
├── .env.example             # VITE_SUI_NETWORK=localnet (sin valores secretos: todo VITE_* es público)
├── README.md
├── eslint.config.js
├── index.html
├── package.json             # "private": true, "type": "module", deps exactas, scripts de agents.md §3
├── tsconfig.json            # src/ (navegador)
├── tsconfig.node.json       # vite.config.ts
├── vite.config.ts           # plugin React, test (jsdom, setupFiles), server.fs.allow si hace falta
└── src/
    ├── main.tsx             # loadConfig() → <ConfigError> o providers + router
    ├── App.tsx              # createHashRouter: "/" (HomePage) y "*" (NotFoundPage)
    ├── index.css            # CSS plano + variables de tema del kit
    ├── vite-env.d.ts        # tipos de import.meta.env (VITE_SUI_NETWORK)
    ├── test/setup.ts        # matchers de jest-dom
    ├── sui/                 # networks, config, format, explorer, nodeInfo, dappKit (+ *.test.ts)
    ├── providers/AppProviders.tsx   # QueryClientProvider + DAppKitProvider + ConfigContext + Register
    ├── hooks/               # useAppConfig, useNodeStatus, useWalletAccount
    ├── components/          # Header, NetworkBadge, AccountBadge, ConfigError
    └── pages/               # HomePage, NotFoundPage
```

### Capas y regla de imports — lista blanca (ARQ-1, ARQ-5, PROY-13; 🟡-1)

`pages/components → hooks → sui/`. ESLint `no-restricted-imports`:

| Archivos | Regla |
|---|---|
| **base:** `src/**/*.{ts,tsx}` | prohibido `@mysten/sui`, `@mysten/sui/*`, `@mysten/dapp-kit-core`, `@mysten/dapp-kit-core/*`, `@mysten/dapp-kit-react` (se permite solo `@mysten/dapp-kit-react/ui`, para `ConnectButton`) |
| override `src/sui/**` | permite `@mysten/sui*` y `@mysten/dapp-kit-core*`; **prohíbe** `react`, `react-dom`, `@mysten/dapp-kit-react*` y `../hooks/*`, `../components/*`, `../pages/*`, `../providers/*` |
| override `src/hooks/**` | permite `@mysten/sui*` y `@mysten/dapp-kit-react` |
| override `src/providers/**` | permite solo `@mysten/dapp-kit-react` (no `@mysten/sui*`) |

Cualquier carpeta nueva queda bajo la regla base. Además: `no-console: error` (LIM-4); `no-restricted-syntax` contra el
atributo JSX `dangerouslySetInnerHTML` (SEG-9); `tseslint.configs.strictTypeChecked`; `react-hooks` recomendado;
`--max-warnings 0`.

### TypeScript

`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`, `skipLibCheck`; `jsx: react-jsx`; tipos `vite/client` en `src/`; sin
`incremental`.

### Scripts de `app/package.json` (= agents.md §3)

`dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`), `lint` (`eslint . --max-warnings 0`),
`typecheck` (los dos `tsc --noEmit`), `test` (`vitest run`).

### Configuración (`app/src/sui/config.ts`, ARQ-8, PROY-15)

```ts
export type AppConfig = {
  network: Network;               // 'localnet' | 'testnet'
  grpcUrl: string;                // de networks.ts
  chainId: string;                // 8 hex, del JSON de #7
  packageId: string;
  originalPackageId: string;
  houseId: string;
  burnerWalletEnabled: boolean;   // network === 'localnet' && import.meta.env.DEV
};
export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; error: string };

/** Pura: testeable sin Vite (ARQ-3). `deployments`: ruta del glob → contenido JSON sin tipar. */
export function resolveConfig(env: { VITE_SUI_NETWORK?: string; DEV: boolean },
                              deployments: Record<string, unknown>): ConfigResult;
/** Único punto que toca import.meta.env y import.meta.glob. */
export function loadConfig(): ConfigResult;
```

Errores (en español, con la acción a seguir): variable ausente; red no soportada (`mainnet` incluida); falta
`contracts/deployments/<red>.json` (cómo generarlo: script de #7 en localnet, #8 en testnet); `schemaVersion` ≠ 1;
campo ausente o con formato inválido (nombra el campo); `network` distinto de la variable o del nombre del archivo.

URLs (`networks.ts`): localnet `http://127.0.0.1:9000` (E6); testnet `https://fullnode.testnet.sui.io:443` (E2).
`shortChainId(base58)` = `toHex(fromBase58(x)).slice(0, 8)` (E12, E16).

### Job `app` de CI (reemplaza el `TODO(#9)` de `ci.yml:131-132`)

```yaml
  app:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    defaults:
      run:
        shell: bash                 # -eo pipefail, como el job contracts
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json
      - name: Node de .nvmrc
        run: |
          node --version && npm --version
          [[ "$(node --version)" == "v$(cat .nvmrc)."* ]]
      - name: Install (lockfile; sin scripts de instalación por .npmrc)
        run: npm ci
      - name: Firmas del registry
        run: npm audit signatures
      - name: Vulnerabilidades de producción (high o más)
        run: npm audit --omit=dev --audit-level=high
      - name: Lint
        run: npm run lint -w app
      - name: Typecheck
        run: npm run typecheck -w app
      - name: Test
        run: npm test -w app
      - name: Build (testnet)
        env:
          VITE_SUI_NETWORK: testnet
        run: npm run build -w app
      - name: Árbol sin cambios tras los gates
        if: ${{ !cancelled() }}
        run: |
          git status --porcelain --untracked-files=all
          test -z "$(git status --porcelain --untracked-files=all)"
```

Sin `needs`, sin secretos, `permissions: contents: read` heredado, actions por SHA completo (E13, E14), mismo SHA de
`setup-node` que #7. El check requerido lo agrega el orquestador **después** del merge (D-20261102-02 (7)).

## Tasks (ordenados por dependencia; sin tasks de contratos)

### TASK-1: workspace `app/`, toolchain y política de dependencias — área: app — sin #7
- **Entregable:** el workspace compila, lintea, typechequea, testea y buildea una app mínima ("Sui Battleship").
- **Archivos:** `.npmrc` (nuevo), `package.json` (raíz: `engines`), `package-lock.json` (nuevo), `app/package.json`,
  `app/index.html`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/eslint.config.js`,
  `app/src/main.tsx`, `app/src/App.tsx`, `app/src/index.css`, `app/src/vite-env.d.ts`, `app/src/test/setup.ts`,
  `app/src/App.test.tsx`. **No tocar:** `contracts/`, `.github/`.
- **Cambios:** "Diseño" (layout, capas, TS, scripts) y "Paquetes". Modelo: `react.mdx` de la doc oficial (E2) y la
  plantilla React + TS de Vite 8.
- **AuthZ:** no aplica. Sin claves ni `.env` real (SEG-3).
- **DoD:**
  1. `nvm use` + `npm ci` desde la raíz, exit 0, sin scripts de instalación; los cuatro gates en verde.
  2. **`npm ls @mysten/sui @mysten/dapp-kit-core @mysten/wallet-standard @mysten/slush-wallet` con una sola versión
     de cada uno y sin `invalid`/`UNMET PEER`** (output pegado, 🟠-1); las tres `@mysten/*` directas del mismo tren.
  3. `npm audit` completo y `npm audit signatures` pegados; sin vulnerabilidades high/critical en producción (si
     las hay: STOP).
  4. Licencias del árbol desde `package-lock.json` (campo `license`): lista de las que no sean
     MIT/Apache-2.0/BSD/ISC (🔵-1).
  5. `engine-strict` (🟡-4): `nvm exec 22 npm ci` falla con `EBADENGINE` por el `engines` de la raíz (output
     pegado) y luego `npm ci` con Node 26 vuelve a verde; si npm no aplica el `engines` de la raíz, se declara que
     es solo documental.
  6. Sondas de la regla de capas (output rojo pegado y archivos borrados): `src/components/LintProbe.tsx` importa
     `@mysten/sui/utils`; `src/features/LintProbe.ts` (carpeta nueva) importa `@mysten/sui`; `src/sui/lintProbe.ts`
     importa `react`. Las tres hacen fallar `npm run lint -w app`.
  7. `package.json` sin `^`/`~`; `git status --porcelain` sin `*.tsbuildinfo`.
- **Tests:** `App.test.tsx` (renderiza el título), en jsdom.
- **Riesgos / rollback:** R2, R7, R8. Rollback: borrar `app/`, `.npmrc` y el lockfile.

### TASK-2: job `app` en la CI — área: ci — sin #7
- **Entregable:** el job `app` del snippet de "Diseño", en verde en el PR.
- **Archivos:** `.github/workflows/ci.yml` (reemplaza `ci.yml:131-132`). **No tocar:** jobs `contracts` y
  `framework-drift` (si #7 ya los cambió en `master`, rebase antes).
- **Cambios:** snippet de arriba; SHA de `actions/setup-node` re-verificado en el handoff.
- **AuthZ:** sin secretos; `persist-credentials: false`.
- **DoD:** run del PR con `app`, `contracts` y `framework-drift` en verde (link y tiempos); un rojo provocado en un PR
  desechable (un `console.log` que rompe el lint) demuestra que el job falla, y ese PR se cierra sin merge (patrón
  R3/R4 de #3).
- **Riesgos / rollback:** R6; revert del job.

### TASK-3: capa `sui/` base — redes, montos y explorador — área: app — sin #7
- **Entregable:** `networks.ts`, `format.ts`, `explorer.ts` con tests.
- **Archivos:** `app/src/sui/networks.ts`, `networks.test.ts`, `format.ts`, `format.test.ts`, `explorer.ts`,
  `explorer.test.ts`.
- **Cambios:**
  - `format.ts`: `parseSuiToMist(input: string)` → `{ ok: true; mist: bigint } | { ok: false; reason: 'empty' |
    'negative' | 'too_many_decimals' | 'too_large' | 'invalid' }` sobre `parseToMist`; `U64_MAX = 2n ** 64n - 1n`;
    `formatMist(mist: bigint): string` (hasta 9 decimales, sin ceros finales, sin floats, negativos con signo);
    `shortAddress` = `formatAddress` del SDK. Montos siempre `bigint` (PROY-12).
  - `explorer.ts`: `explorerTxUrl(network, digest)` y `explorerObjectUrl(network, id)` → `string | null` (`null` en
    localnet; Suiscan en testnet); lanza con un input inválido (`isValidTransactionDigest`, `isValidSuiObjectId`).
  - `networks.ts`: tipo `Network`, URL gRPC, base del explorador, `shortChainId`.
- **AuthZ:** no aplica.
- **DoD:** gates verdes; ningún `number` para montos.
- **Tests (resultado esperado explícito, 🟡-2):**

  | Entrada | Resultado |
  |---|---|
  | `"0"` | ok `0n` |
  | `"0.000000001"` | ok `1n` |
  | `"1"` / `"0.001"` / `"50"` | ok `1_000_000_000n` / `1_000_000n` / `50_000_000_000n` |
  | `".5"` | ok `500_000_000n` (lo acepta el SDK) |
  | `"18446744073.709551615"` (`u64::MAX`) | ok `18_446_744_073_709_551_615n` |
  | `"18446744073.709551616"` | `too_large` |
  | `"1.0000000001"` (10 decimales) | `too_many_decimals` |
  | `"-1"`, `"-0"`, `"-0.5"` | `negative` |
  | `""` | `empty` |
  | `"1."`, `" 1"`, `"1 "`, `"1e3"`, `"abc"`, `"0x10"`, `"1,5"` | `invalid` |

  `formatMist`: `0n` → `"0"`, `1n` → `"0.000000001"`, `1_500_000_000n` → `"1.5"`, `U64_MAX` →
  `"18446744073.709551615"`, `-1n` → `"-0.000000001"`; ida y vuelta para valores > 2^53. Explorer: links de testnet,
  `null` en localnet, digest/ID inválidos lanzan. `shortChainId`: vectores de E16.
- **Riesgos:** ninguno relevante.

### TASK-4: sonda gRPC-web en localnet (CORS + `listEvents`) — área: app (verificación) — sin #7 — **gate de STOP-1**
- **Entregable:** evidencia empírica de E6/E7 en el reporte, sin archivos nuevos en el repo (🟠-3).
- **Archivos:** ninguno del repo (todo en `<SMOKE_DIR>`).
- **Procedimiento** (localnet **aislada**, `agents.md` §3 pasos 1-7, sin desvíos; usa el `@mysten/sui` instalado en
  TASK-1):
  1. Preparación, génesis, arranque y `suic chain-identifier` (§3 pasos 2-4).
  2. Publicación efímera de §3 paso 4 (`test-publish … --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --json >
     "$SMOKE_DIR/publish.json"`); `PKG`, `HOUSE` y `CAP` se extraen de `objectChanges` **por tipo** con un one-liner de
     Node y se anotan en `ids.env`. `publish.json` contiene direcciones de génesis: no se pega.
  3. `suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250` como `ADMIN`
     → `FeeRateUpdated` en los efectos.
  4. Preflight CORS (sin `env.sh`): `curl -si -X OPTIONS -H 'Origin: http://127.0.0.1:5173' -H
     'Access-Control-Request-Method: POST' http://127.0.0.1:9000/sui.rpc.v2.LedgerService/GetServiceInfo` →
     `access-control-allow-origin: *`.
  5. Cliente real del SDK (sin `env.sh`, Node 26 por ruta absoluta, desde `<repo>/app` para resolver el workspace):
     `PKG=… "$NODE" --input-type=module -e` con un script que crea `new SuiGrpcClient({ network: 'localnet', baseUrl:
     'http://127.0.0.1:9000' })`, imprime `shortChainId` de `ledgerService.getServiceInfo({})` y el resultado de
     `listEvents({ filter: { eventType: \`${PKG}::house::FeeRateUpdated\` }, order: 'descending', limit: 5 })`
     mostrando solo `eventType`, `transactionDigest`, `checkpoint`, `json` y `hasNextPage` (nunca `sender`). El
     script no se commitea; su texto exacto va en el handoff.
  6. Cierre (§3 paso 7).
- **DoD:** paso 4 con `access-control-allow-origin: *`; paso 5 con el chain id de la localnet igual al de
  `suic chain-identifier` y **≥ 1 evento** `FeeRateUpdated` con `json` legible (`new_fee_rate: 250`); `~/.sui/` idéntico
  a la línea base; árbol limpio. **Si cualquiera falla (aun tras reintentar con `hasNextPage`/cursor), se vuelve a
  STOP-1 antes de TASK-6.**
- **Riesgos:** R4.

### TASK-5: `config.ts` y pantalla de error de configuración — área: app — **requiere #7 en `master` + rebase**
- **Entregable:** red e IDs validados al arrancar; error claro si faltan.
- **Archivos:** `app/src/sui/config.ts`, `config.test.ts`, `app/.env.example`, `app/src/components/ConfigError.tsx`
  (+ test), `app/src/main.tsx`, `app/vite.config.ts` (solo si hace falta `server.fs.allow`).
- **Cambios:** API de "Configuración" con el esquema aprobado en #7.
- **AuthZ:** no aplica; `.env.example` sin valores reales (SEG-3).
- **DoD:** gates verdes; `npm run dev -w app` y `npm run build -w app` resuelven el glob fuera de `app/` con y sin
  `localnet.json` (output pegado); con la red sin JSON, la app muestra `ConfigError` (no pantalla en blanco); ningún
  otro archivo usa `import.meta.env` (`grep` pegado).
- **Tests:** `resolveConfig`: variable ausente; `mainnet`; red desconocida; JSON ausente; `schemaVersion` ≠ 1; cada
  campo usado ausente o con formato inválido; `network` distinto de la variable o del nombre del archivo; claves
  desconocidas toleradas; caso válido con la **fixture real** de #7 (`contracts/scripts/fixtures/localnet.deployment.json`)
  y con un testnet sintético; `burnerWalletEnabled` verdadero solo con localnet + `DEV`.
- **Riesgos / rollback:** R1, R5.

### TASK-6: providers, wallet, router e indicador de red — área: app — requiere TASK-4 en verde y TASK-5
- **Entregable:** conectar/desconectar con dirección abreviada visible; indicador de red con estado **vivo** del nodo.
- **Archivos:** `app/src/sui/nodeInfo.ts` (+ test), `app/src/sui/dappKit.ts` (+ test),
  `app/src/providers/AppProviders.tsx`, `app/src/hooks/useAppConfig.ts`, `useNodeStatus.ts`, `useWalletAccount.ts`,
  `app/src/components/Header.tsx`, `NetworkBadge.tsx`, `AccountBadge.tsx`, `app/src/pages/HomePage.tsx`,
  `NotFoundPage.tsx`, `app/src/App.tsx`, `app/src/main.tsx` y sus tests.
- **Cambios:**
  - `nodeInfo.ts`: `fetchNodeInfo(client)` sobre `client.ledgerService.getServiceInfo({})` (sin caché, E17) y la
    función pura `deriveNodeStatus({ isPending, isError, data }, expectedChainId)` → `loading | ok | wrong_chain |
    offline`; `NODE_STATUS_REFETCH_MS = 20_000`.
  - `dappKit.ts`: `createAppDAppKit(config)` con `createDAppKit` de `@mysten/dapp-kit-core`: `networks:
    [config.network]`, `createClient: (network) => new SuiGrpcClient({ network, baseUrl: config.grpcUrl })`,
    `enableBurnerWallet: config.burnerWalletEnabled`, `slushWalletConfig: null` en localnet (E2, E9).
  - `AppProviders` = `QueryClientProvider` > `DAppKitProvider` > `ConfigContext`, con el registro global de tipos.
  - `useNodeStatus` = `useQuery({ queryKey: ['sui', network, 'nodeInfo'], queryFn: () => fetchNodeInfo(client),
    refetchInterval: NODE_STATUS_REFETCH_MS })` con `useCurrentClient()` (PROY-14, sin `useEffect`).
  - `Header`: `ConnectButton` (`@mysten/dapp-kit-react/ui`), `NetworkBadge` (red siempre visible + "nodo OK / red
    equivocada / sin conexión") y `AccountBadge` (`shortAddress`); router `createHashRouter`.
- **AuthZ:** la app no pide ni maneja claves (SEG-9).
- **DoD:** gates verdes; sondas de capas siguen rojas si se reintroducen; ningún componente importa `@mysten/sui`
  ni lee env.
- **Tests:** `deriveNodeStatus`: chain igual → `ok`, distinto → `wrong_chain`, error → `offline`, **error con dato
  previo → `offline`**; `useNodeStatus` con `fetchNodeInfo` mockeado y timers falsos: **1.er poll OK y 2.º con error →
  "sin conexión"**, **`chainId` distinto en un poll posterior → "red equivocada"**; badge con cada red y estado;
  cuenta conectada/desconectada (`vi.mock` de `src/hooks/*`, ARQ-3); 404 del router; `createAppDAppKit` pasa
  `enableBurnerWallet` y `slushWalletConfig` según la red.
- **Riesgos:** `ConnectButton` es un web component (Lit): en jsdom se mockea su módulo; se verifica en el smoke.

### TASK-7: documentación y baseline — área: docs — requiere #7 en `master` + rebase
- **Entregable:** docs alineadas con lo implementado (PROY-20).
- **Archivos y cambios:**
  - `app/README.md`: requisitos, `nvm use`, scripts, `VITE_SUI_NETWORK`; **localnet**: publicar con el script de #7
    en su variante de salida por defecto (`contracts/deployments/localnet.json`, ignorado por `.gitignore:7`), remitiendo
    a `agents.md` §3, cuyo paso 7 lo borra (`rm -f`);
    testnet; wallet de desarrollo; consecuencia del glob (🔵-2); mapa de `sui/` con sus issues; **procedimiento ante
    un advisory** (🟡-7): PR de actualización; si el arreglo tiene < 7 días, `min-release-age-exclude` temporal solo
    para ese paquete, con issue que la retire (LIM-10); un `EBADENGINE` transitivo es STOP, nunca `--force` (R8).
  - `agents.md`: §2 (kit, core, cliente gRPC), §3 (gate de la app = steps del job `app`, con las dos auditorías;
    la receta de localnet aislada **no se reescribe**: #7 ya trae la variante de salida por defecto y el `rm -f` del
    paso 7; #9 solo remite a ella para los smokes de la app), §4 (fullnode por gRPC), §11 (wallet de desarrollo),
    §14 (`app/README.md`).
  - `documents/ESTANDARES.md`: **PROY-14** (`useQuery`/`useInfiniteQuery` + `useCurrentClient()`; mutaciones con
    `useDAppKit().signAndExecuteTransaction` + `useMutation`, E3), **PROY-18** (job `app`), **SEG-8** (política de
    D-20261102-02 (3), regla por tren), versión del archivo.
  - `contracts/README.md` (🟡-5): `:177` y "Lectura desde la app" (`:398-401`): cliente `SuiGrpcClient` fijado en #9
    (D-20261102-02); #10 confirma con fixtures; la hora sale de la transacción (`timestampMs`), no del evento (E5, E19).
  - `documents/STATUS.md`: baseline de la app, toolchain (npm 11.20.0, tren de Mysten), run de CI, evidencia de TASK-4,
    pendiente del orquestador: check `app` requerido tras el merge.
- **DoD:** cada comando de los docs coincide con `ci.yml` y `app/package.json`; sin restos de `@mysten/dapp-kit` (sin
  sufijo) ni `useSuiClientQuery`, ni "la elige #10" en `contracts/README.md` (`grep` pegado).
- **Riesgos:** R9 (conflicto con #7 en `agents.md`).

## Smoke (aplica: navegador) — `documents/SMOKE_APP.md` (M5), tras TASK-7

Coherente con #7 y con `agents.md` §3 (🟠-4). Quién: **DEV** = pasos sin navegador; **usuario** (u orquestador con
navegador) = pasos marcados 🌐. El DEV **no termina su sesión** hasta el cierre: el orquestador le reenvía el resultado
de los pasos 🌐 (SendMessage).

| # | Quién | Acción | Resultado esperado |
|---|---|---|---|
| 0 | DEV | Preparación (§3 paso 2): `<SMOKE_DIR>`, `SUI` y `NODE` (Node 26) por ruta absoluta en `env.sh`, ruta de `node_modules/vite/bin/vite.js`; línea base `stat`/`ls` de `~/.sui/sui_config/`; `test ! -e contracts/deployments/localnet.json` | línea base anotada; sin `localnet.json` previo (si existe, se detiene: dato viejo) |
| 1 | DEV | Génesis, arranque (en segundo plano del harness), `suic chain-identifier` | red arriba |
| 2 | DEV | Script de #7 con la **variante de salida por defecto** de `agents.md` §3 (la que agrega #7, hallazgo v2-5 de su revisión): `publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` sin `--out` → `contracts/deployments/localnet.json` (el script hace `mkdir -p`) | exit 0; JSON válido; `git check-ignore -v contracts/deployments/localnet.json` → `.gitignore:7`; `git status --porcelain` vacío |
| 3 | DEV | Sonda de TASK-4 (pasos 3-5) con el `originalPackageId` del JSON | CORS `*`; ≥ 1 `FeeRateUpdated` con `json` |
| 4 | DEV | `vite` dev en segundo plano del harness, **sin** `env.sh`: `cd <repo>/app && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" <vite.js> --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`; luego `curl -sf http://127.0.0.1:5173/` | 200 con `<div id="root">`; traspaso al usuario con la URL |
| 5 | 🌐 | Abrir `http://127.0.0.1:5173/` | cabecera "localnet · nodo OK" |
| 6 | 🌐 | Conectar la wallet de desarrollo; desconectar | dirección abreviada visible; vuelve "Conectar" |
| 7 | 🌐 | Recargar y conectar | otra dirección (clave solo en memoria) |
| 8 | DEV + 🌐 | `mv contracts/deployments/localnet.json "$SMOKE_DIR/"`; recargar; devolverlo con `mv`; recargar | `ConfigError` con la instrucción; luego app normal |
| 9 | DEV | `kill "$(cat "$SMOKE_DIR/vite.pid")"`; `VITE_SUI_NETWORK=localnet npm run build -w app`; `vite preview` en segundo plano igual que el paso 4 (puerto 4173, PID en `preview.pid`) | build exit 0; preview responde 200 |
| 10 | 🌐 | Abrir `http://127.0.0.1:4173/` y la lista de `ConnectButton` (🟡-3) | "localnet · nodo OK"; **sin** "Unsafe Burner Wallet" ni Slush en la lista; consola sin el `console.warn` del burner |
| 11 | DEV + 🌐 | Con la página del paso 10 abierta, el DEV detiene la red (`kill` del PID de `sui`, §3 paso 7) | en ≤ `NODE_STATUS_REFETCH_MS` + margen, "sin conexión" (🟠-2) |
| 12 | DEV | `kill` del PID de `preview`; `VITE_SUI_NETWORK=testnet npm run build -w app` + `preview` (PID) → 🌐 abrir | sin `testnet.json`: `ConfigError`; con `testnet.json` (#8 ya mergeado): "testnet · nodo OK" y sin burner |
| 13 | DEV | Cierre: `kill` de `preview`; luego el paso 7 de `agents.md` §3 tal como lo deja #7: confirmar que `sui`, `vite` y `preview` terminaron (`kill -0` falla); `rm -f contracts/deployments/localnet.json` y `test ! -e contracts/deployments/localnet.json`; `rm -rf <SMOKE_DIR>`; `stat`/`ls` de `~/.sui/sui_config/` idénticos; `git status --porcelain` vacío; `git diff --exit-code -- contracts/Move.lock` | todo limpio |

Con testnet publicada (#8), el owner repite 5-6 con la wallet de su navegador (paso opcional de #17 si #8 llega
después).

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | El glob de Vite fuera de `app/` no resuelve en dev o build | Verificación explícita en TASK-5; alias como plan B (declarado) |
| R2 | Tren de Mysten incoherente (dos `@mysten/sui` o peer inválido) por los `^` transitivos y la ventana de 7 días (E18) | Regla por tren, core directo exacto, `npm ls` de versión única en el DoD; el lockfile congela |
| R3 | TS 7 y `typescript-eslint` incompatibles (E10) | TS 6.0.3 fijado |
| R4 | CORS o `listEvents` en localnet no funcionan como dice el código (E6, E7) | TASK-4 lo prueba antes de TASK-6; si falla, STOP-1 (plan B GraphQL, E8) |
| R5 | #7 cambia el esquema | TASK-5 bloqueado hasta el merge de #7 + rebase; STOP si falta `originalPackageId` |
| R6 | `npm audit` rojo por un advisory nuevo, también con `app` requerido | Procedimiento de TASK-7 (🟡-7) |
| R7 | Un paquete necesita su script de instalación con `ignore-scripts=true` | Se detecta en TASK-1 → STOP |
| R8 | `engine-strict` aborta `npm ci` por un `engines` transitivo que excluya Node 26 | STOP (nunca `--force`); evidencia de `engines` en TASK-1 |
| R9 | Conflictos con #7 en `ci.yml` y `agents.md` §2/§3/§5 | Quien mergea segundo rebasa; mismo SHA de `setup-node`; texto de §3 coordinado |
| R10 | Procesos en segundo plano (`sui`, `vite`, `preview`) huérfanos si el DEV termina antes del cierre | El DEV no cierra su sesión hasta el paso 13; PIDs en `<SMOKE_DIR>`; `kill -0` en el cierre |

## Cambios v1 → v2

- Encabezado y estado: STOP-1..7 decididos por D-20261102-02; sección "Decisiones abiertas" → "Decisiones del owner" con las condiciones del MAYOR (🟡-6a).
- 🟠-1: regla de versión por tren para `@mysten/*`, `@mysten/dapp-kit-core` directo y exacto, tabla de trenes, E18 y `npm ls` de versión única en el DoD de TASK-1.
- 🟠-2: el indicador usa `ledgerService.getServiceInfo({})` sin caché (`nodeInfo.ts`) con `refetchInterval` de 20 s, estados con prioridad al error y tests de transición; E17.
- 🟠-3: TASK-4 nueva (sonda sin navegador: preflight CORS + `listEvents` tras un `update_fee_rate`), gate de STOP-1 antes de TASK-6; E7 con `sui_commands.rs:1048-1064` (🔵-5).
- 🟠-4: smoke rehecho: `localnet.json` en `contracts/deployments/` con la variante de salida por defecto del script de #7 (coordinado con su hallazgo v2-5) y borrado con el `rm -f` del paso 7 de `agents.md` §3, comprobado en el cierre; `vite`/`preview` en segundo plano con PID y `kill`; traspaso DEV ↔ usuario; paso de `curl` reemplazado por pasos 🌐.
- 🟡-1: regla de capas en lista blanca (base sobre `src/**`, overrides para `sui/`, `hooks/`, `providers/`) y tres sondas de lint.
- 🟡-2: `format.ts` con `too_large` (`U64_MAX`), rechazo de `-0` y tabla de resultados esperados (`.5`, `1.`, `" 1"`, `"1e3"`…).
- 🟡-3: burner verificada con un build de producción de localnet (paso 10) y Slush desactivado en localnet.
- 🟡-4: R8 (`EBADENGINE` transitivo ⇒ STOP) y evidencia de `engines` con Node 22 en el DoD de TASK-1.
- 🟡-5: TASK-7 corrige `contracts/README.md:177, 398-401`; "Notas para #10" sobre la hora (E5, E19).
- 🟡-6: TASK-1..4 sin #7; TASK-5..7 y smoke con #7 en `master` + rebase; un DEV a la vez; conflictos `ci.yml`/`agents.md` (R9); tasks renumerados (v1 TASK-4/5/6 → v2 TASK-5/6/7).
- 🟡-7: nota informativa para el usuario y procedimiento ante un advisory en TASK-7.
- 🔵-1 licencias del árbol en TASK-1; 🔵-2 consecuencia del glob documentada; 🔵-3 `createDAppKit` del core en `sui/` y `Register` en `providers/`; 🔵-4 sin `incremental`; 🔵-5 cita de E7.
- D-20261102-03 reflejada: ningún paso usa la clave del owner ni `~/.sui/`; testnet solo con la wallet del navegador.
