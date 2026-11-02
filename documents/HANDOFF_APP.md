# HANDOFF_APP
> Plan: PLAN_APP v2 (aprobado por el MAYOR, "Revisión v2" de `documents/REVISION_PLAN_APP.md`) | Issue: #9 |
> Branch: `feature/issue-9-app` | Worktree: **`/home/santiago/Projects/Battleship-issue9`** | Versión: **v2** | Fecha: 2026-11-02
>
> **v2 = Tramo B** (TASK-5, TASK-6, TASK-7 y el smoke). El Tramo A (TASK-1..4) está cerrado: sus revisiones PASA y sus
> pendientes viven en `documents/REPORTES_APP.md` y se incorporan aquí. Texto completo de la v1 (Tramo A):
> `git show db1a256:documents/HANDOFF_APP.md` (+ nota v1.1 en `611ad90`).
>
> **Dónde se trabaja:** solo en `/home/santiago/Projects/Battleship-issue9` (`<repo>` en este documento). #7 ya está en
> `master` y la branch está rebasada: no hay otro DEV en el árbol de #9. Sin commits ni pushes (los hace el
> orquestador). Un task por sesión, en orden; al terminar, reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 y
> esperar la revisión del MID. **TASK-6 arranca solo con TASK-5 commiteada; TASK-7 con TASK-6; el smoke con TASK-7.**

## 0. Baseline de gates verificado (2026-11-02, tras el rebase)

| Ítem | Valor | Fuente |
|---|---|---|
| `master` | `c066143` (housekeeping de #7, PR #40; #7 mergeado en `6ff8353`, PR #38) | `git log master` |
| `feature/issue-9-app` | **`c1caaba`** = `master` + Tramo A (commits de TASK-1..4 y docs); árbol limpio | `git log`, `git status` |
| Contratos | `sui move build`/`--lint`/`test` con `--warnings-are-errors`: 0 warnings, 0 lints, **83 tests PASS**; `Move.lock` sin delta. Código Move sin cambios desde `1630eaa` (`git diff --stat 1630eaa c1caaba -- contracts/sources contracts/tests contracts/Move.lock contracts/Move.toml` vacío) | `documents/STATUS.md` Baselines; CI |
| Scripts de #7 | `cd contracts && node --test scripts/*.test.mjs` → **94 tests PASS** (51 `deployment` + 43 `publish`); `node scripts/publish.mjs check` → **0 despliegues** | STATUS Baselines; CI |
| App | lint 0, typecheck 0, **58 tests PASS** (4 archivos: `App` 1, `networks` 12, `format` 30, `explorer` 15), build OK (`index-*.js` ≈ 220 kB) | REPORTES_APP (TASK-3); CI |
| CI | PR **#36** (borrador) @ `c1caaba`: run [41476596859](https://github.com/sdelvalle57/sui_battleship/actions/runs/41476596859) → `contracts`, `app` y `framework-drift` **success**; ambos jobs con `actions/setup-node` v7.1.0 fijada por SHA | `gh run view` |
| Protección de `master` | requerido solo `contracts` (`app` se agrega tras el merge de #9, D7) | `gh api …/required_status_checks` |
| Dependencias | tren **2.37.0 / 1.6.39 / 2.1.41** congelado en `package-lock.json` (TASK-1); 22 directas exactas; `npm audit --omit=dev --audit-level=high` 0; 11 *moderate* solo dev aceptadas (#35) | REPORTES_APP (TASK-1) |
| Toolchain | Sui CLI `1.83.0-16d2dc1e05ed` (`~/.local/bin/sui`); Node `v26.13.0` / npm 11.20.0 en `/home/santiago/.nvm/versions/node/v26.13.0/bin` | STATUS Toolchain |

**Prefijo de Node 26** (obligatorio en toda llamada con `node`/`npm`/`npx`; cada llamada es un shell nuevo):

```sh
export PATH=/home/santiago/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && cd /home/santiago/Projects/Battleship-issue9 && …
```

`node --version` debe imprimir `v26.13.0`; si no, se detiene y se reporta. **Gate de la app** (= job `app` de la CI):
`npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high`, `npm run lint -w app`,
`npm run typecheck -w app`, `npm test -w app`, `VITE_SUI_NETWORK=testnet npm run build -w app`, y
`git status --porcelain --untracked-files=all` vacío al final.

**Dependencias en el Tramo B: ninguna nueva ni actualizada.** El tren `@mysten/*` no se re-verifica (el lockfile lo
congela). Si un task pareciera necesitar un paquete, es STOP (SEG-8, D3).

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Wallet kit `@mysten/dapp-kit-react` + `@mysten/dapp-kit-core`; lectura con `SuiGrpcClient` (gRPC-web). **Gate cumplido** (TASK-4: preflight CORS 200 con comodines, `listEvents` por tipo OK) | D-20261102-02 (1) |
| D2 | Una red por build: `VITE_SUI_NETWORK` ∈ {`localnet`, `testnet`}; `mainnet` y cualquier otro valor = error | D-20261102-02 (2) |
| D3 | Versiones exactas, lockfile, `.npmrc` (`min-release-age=7`, `ignore-scripts`, `save-exact`, `engine-strict`); en CI `npm audit signatures` y `npm audit --omit=dev --audit-level=high` bloqueantes | D-20261102-02 (3) |
| D4 | Paquetes de PLAN_APP v2 (`react-router`, TypeScript 6.0.3), tren `@mysten/*` instalado | D-20261102-02 (4) |
| D5 | Burner wallet solo con `network === 'localnet'` **y** `import.meta.env.DEV` | D-20261102-02 (5) |
| D6 | Explorador: Suiscan en testnet; en localnet sin link | D-20261102-02 (6) |
| D7 | Check `app` requerido en `master` tras el merge de #9: lo aplica el orquestador (autorización ya dada) y lo verifica con `gh api` | D-20261102-02 (7) |
| D8 | `~/.sui/` sin claves; ningún paso usa la clave del owner; ningún agente corre nada contra testnet con claves | D-20261102-03 |
| D9 | Contrato on-chain sin cambios en #9 | PLAN_APP v2 |
| D10 | Esquema de `contracts/deployments/<red>.json` = `schemaVersion: 1`, 14 campos (`contracts/README.md` "Despliegues") | D-20261102-01 (1) |
| D11 | 11 *moderate* solo dev (`minimatch <11.0.1`, GHSA-g3hv-75wg-m249) aceptadas hasta #35; el `npm audit` completo no es paso bloqueante de CI | Revisión TASK-1 (MID) |
| D12 | `explorer.ts` valida pero **no normaliza** IDs; la normalización se hace en el borde de entrada (rutas/formularios, #10–#12) | Revisión TASK-3 (MID) |

## Resumen del Tramo A (cerrado)

| Task | Commit | Revisión | Resultado |
|---|---|---|---|
| TASK-1 workspace y política de dependencias | `aab74cc` | PASA | `.npmrc`, `engines`, lockfile v3, 22 deps exactas, capas en ESLint, app mínima |
| TASK-2 job `app` de CI | `720676c` | PASA | verde (run 41469633568) y rojo provocado en Lint (PR #37 cerrado) |
| TASK-3 `sui/` base | `17a856d` | PASA | `networks.ts`, `format.ts`, `explorer.ts`, 58 tests |
| TASK-4 sonda gRPC-web | (sin código) | PASA | CORS 200 `*`; `SuiGrpcClient` lee `getServiceInfo` y `listEvents` por tipo al primer intento |

---

## TASK-5: `config.ts` y pantalla de error de configuración — área: app

### 1. Historia de usuario del task
**Como** desarrollador (y jugador), **quiero** que la app sepa en qué red está y con qué IDs del paquete trabaja, leyendo
solo el archivo de despliegue de esa red y mostrando un error claro si falta o es inválido, **para** nunca operar con IDs
de otra red ni ver una pantalla en blanco.

### 2. Contexto
- Esquema (D10), `contracts/README.md` "Despliegues" → "Esquema (`schemaVersion: 1`)": 14 campos obligatorios para el
  productor; para los consumidores, regla 3 de "Compatibilidad": **validar lo que se usa, rechazar `schemaVersion` ≠ 1 e
  ignorar claves desconocidas**. Formatos: `network` `"localnet"|"testnet"` (= nombre del archivo); `chainId` 8 hex;
  `packageId`, `originalPackageId`, `houseId` `0x` + 64 hex.
- Fixture real (contrato de formato para la app, regla 4): `contracts/scripts/fixtures/localnet.deployment.json`
  (`network: "localnet"`, `chainId` de una génesis de localnet; generado con `record`).
- Archivos reales: `contracts/deployments/localnet.json` (ignorado, `.gitignore:7`; lo escribe el script, variante B de
  `agents.md` §3 paso 4) y `contracts/deployments/testnet.json` (lo commitea #8; hoy **no existe**).
- `app/src/vite-env.d.ts` ya declara `VITE_SUI_NETWORK?: string`. `app/src/sui/networks.ts` ya exporta `Network`,
  `NETWORKS` (`grpcUrl`, `explorerBase`) e `isNetwork`.

### 3. Qué implementar
**`app/src/sui/config.ts`** (único lector de `import.meta.env` y de los JSON de despliegue en toda la app; ARQ-8, PROY-15):

```ts
export type AppConfig = {
  network: Network;
  grpcUrl: string;               // NETWORKS[network].grpcUrl
  chainId: string;               // 8 hex, del JSON
  packageId: string;             // targets de llamada (#11, #12)
  originalPackageId: string;     // prefijo de tipos de eventos/objetos (#10, #13, #14)
  houseId: string;
  burnerWalletEnabled: boolean;  // network === 'localnet' && DEV (D5)
};
export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; error: string };

/** Pura (ARQ-3). `deployments`: ruta del glob → contenido JSON sin tipar. */
export function resolveConfig(env: { VITE_SUI_NETWORK?: string; DEV: boolean },
                              deployments: Record<string, unknown>): ConfigResult;

/** Único punto que toca import.meta.env y el glob de deployments. */
export function loadConfig(): ConfigResult {
  return resolveConfig(
    { VITE_SUI_NETWORK: import.meta.env.VITE_SUI_NETWORK, DEV: import.meta.env.DEV },
    import.meta.glob<unknown>('../../../contracts/deployments/*.json', { eager: true, import: 'default' }),
  );
}
```

Reglas de `resolveConfig`, en este orden (un mensaje en español por causa, que nombra el campo o archivo y la acción):
1. `VITE_SUI_NETWORK` ausente o vacía → "Falta VITE_SUI_NETWORK (localnet o testnet); ver app/.env.example".
2. Valor no admitido (`isNetwork` falso; `mainnet` con mensaje propio: "fuera de alcance del MVP").
3. Buscar la entrada cuyo **nombre de archivo** sea `<red>.json` (por basename de la clave del glob). Ausente →
   "Falta contracts/deployments/<red>.json: en localnet, generarlo con el script de #7 (agents.md §3, paso 4, variante B);
   en testnet lo publica #8".
4. El contenido no es un objeto → error. `schemaVersion !== 1` → error que nombra la versión encontrada.
5. `network` del JSON distinto de la red elegida → error.
6. `chainId` no matchea `^[0-9a-f]{8}$`; `packageId`, `originalPackageId`, `houseId` no matchean `^0x[0-9a-f]{64}$`
   (formato exacto del productor, **en minúsculas**: así los IDs de config ya están normalizados, D12) → error por campo.
7. Claves desconocidas o los otros 9 campos: se ignoran (no se validan).
Constantes con nombre (LIM-6): `SCHEMA_VERSION = 1`, `CHAIN_ID_RE`, `OBJECT_ID_RE`.

**`app/src/components/ConfigError.tsx`:** `({ message }: { message: string })` → `role="alert"`, título "La app no está
configurada" y el mensaje tal cual (texto plano, sin `dangerouslySetInnerHTML`).

**`app/src/main.tsx`:** `const result = loadConfig();` → si `!result.ok`, renderiza `<ConfigError message={result.error} />`;
si `ok`, `<App />` (la config se conecta a los providers en TASK-6). Sin `import.meta.env` fuera de `config.ts`.

**`app/.env.example`:** `VITE_SUI_NETWORK=localnet` con un comentario: valores admitidos, que todo `VITE_*` es público
(se embebe en el bundle) y que nunca lleva secretos (SEG-3).

**`app/vite.config.ts`:** solo si `vite` dev se niega a servir archivos fuera de `app/`, agregar `server.fs.allow` con
`searchForWorkspaceRoot(process.cwd())` (declararlo). La raíz tiene `workspaces`, así que no debería hacer falta.

### 4. Archivos
- **Crear:** `app/src/sui/config.ts`, `app/src/sui/config.test.ts`, `app/src/components/ConfigError.tsx`,
  `app/src/components/ConfigError.test.tsx`, `app/.env.example`.
- **Modificar:** `app/src/main.tsx`; `app/vite.config.ts` solo en el caso descrito.
- **NO tocar:** `contracts/` (salvo la copia temporal del §7.3, que se borra), `.github/`, `package.json`,
  `package-lock.json`, `.npmrc`, `app/eslint.config.js` (TASK-6), `agents.md`, `documents/`.

### 5. Tests obligatorios
`config.test.ts` (la fixture se carga con `import.meta.glob('../../../contracts/scripts/fixtures/localnet.deployment.json',
{ eager: true, import: 'default' })` y se pasa a `resolveConfig` bajo la clave `'../../../contracts/deployments/localnet.json'`):
- caso válido con la **fixture real** (devuelve `network`, `chainId`, IDs y `grpcUrl` de localnet);
- caso válido de testnet con un JSON sintético (IDs ficticios del ejemplo de `contracts/README.md`, `chainId` `4c78adac`);
- variable ausente; vacía; `mainnet`; `devnet`; JSON ausente para la red elegida (con otro `<red>.json` presente);
- contenido no-objeto (`null`, array, string); `schemaVersion` 2 y ausente;
- `network` distinto de la variable; archivo `testnet.json` cuyo `network` es `localnet`;
- cada uno de `chainId`, `packageId`, `originalPackageId`, `houseId`: ausente, no-string, mayúsculas, sin `0x`, largo
  incorrecto (un test por campo y causa, o tabla parametrizada);
- claves desconocidas y campos no usados ausentes → sigue `ok`;
- `burnerWalletEnabled`: `true` solo con localnet + `DEV: true`; `false` con localnet + `DEV: false` y con testnet + `DEV: true`.
`ConfigError.test.tsx`: renderiza `role="alert"` con el mensaje literal.

### 6. Smoke
No aplica en este task (se cubre en `SMOKE_APP.md`, pasos 10 y 15).

### 7. Criterios de aceptación (pegar output)
1. Gate de la app completo en verde (§0), con los conteos de tests por archivo.
2. `grep -rn "import.meta.env" app/src` → solo `app/src/sui/config.ts` (y `vite-env.d.ts`, tipos).
3. Glob fuera de `app/`, **con y sin** `localnet.json`:
   - sin archivo: `VITE_SUI_NETWORK=localnet npm run build -w app` exit 0 y `grep -c` del `packageId` de la fixture en
     `app/dist/assets/*.js` = 0;
   - con archivo: `mkdir -p contracts/deployments && cp contracts/scripts/fixtures/localnet.deployment.json contracts/deployments/localnet.json`,
     el mismo build exit 0 y el `packageId` aparece en el bundle; `vite` dev en segundo plano del harness (con `exec`,
     PID en el scratchpad) y `curl -s http://127.0.0.1:5173/src/sui/config.ts` muestra el import de
     `contracts/deployments/localnet.json`; `kill` del PID y `kill -0` falla;
   - limpieza: `rm -f contracts/deployments/localnet.json && rmdir contracts/deployments`; `git status --porcelain` vacío.
   (La copia temporal es la salida real del script, no un JSON escrito a mano; se declara en el reporte.)
4. Sin dependencias nuevas (`git diff --exit-code -- package.json app/package.json package-lock.json`).

### 8. Al terminar
Reporte §5 (incluir "Tablas de contrato / `app/src/sui/`: no aplica"; config no toca targets, eventos ni aborts).

---

## TASK-6: providers, wallet, router e indicador de red — área: app

### 1. Historia de usuario del task
**Como** jugador, **quiero** ver siempre en qué red está la app y si el nodo responde ahora mismo, y poder conectar y
desconectar mi wallet viendo mi dirección abreviada, **para** saber con qué cuenta y en qué red voy a jugar antes de
apostar.

### 2. Contexto
- `app/src/App.tsx` es un placeholder cuyo JSDoc menciona "TASK-6" (LIM-7): se reescribe.
- `app/eslint.config.js`: la regla base usa `paths` + `patterns.group` y **no** cubre otros `@mysten/*` transitivos
  (p. ej. `@mysten/bcs`) ni subrutas de `dapp-kit-react` distintas de `/ui` (hallazgo 2 de la revisión de TASK-1).
- `node_modules/@mysten/dapp-kit-react/dist/index.d.mts` **re-exporta todo** `@mysten/dapp-kit-core`
  (`export * from "@mysten/dapp-kit-core"`): `createDAppKit` del core es la misma función. `DAppKitProvider` recibe
  `dAppKit: DefaultExpectedDppKit`; `useCurrentClient()` devuelve `ReturnType<RegisteredDAppKit['getClient']>`.
  `createDAppKit` acepta `enableBurnerWallet?: boolean` y `slushWalletConfig?: SlushWalletConfig | null`
  (`dapp-kit-core/dist/types-*.d.mts`).
- `getServiceInfo` (`node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/ledger_service.d.mts`): `chainId?: string`
  (**base58** del digest génesis), `checkpointHeight?: bigint`. `getChainIdentifier()` **no** sirve (cachea para siempre).
- `shortChainId` (`app/src/sui/networks.ts`) **lanza** con un base58 inválido (hallazgo 3 de la revisión de TASK-3).
- TanStack Query v5 conserva `data` tras un error (`status: 'error'`, `isError: true`) y reintenta 3 veces por defecto.

### 3. Qué implementar
1. **`app/eslint.config.js` — capas por regex** (lista blanca; cada bloque repite su lista entera, como hoy):

   | Bloque | `no-restricted-imports` → `patterns` |
   |---|---|
   | base `src/**/*.{ts,tsx}` | `{ regex: '^@mysten/(?!dapp-kit-react/ui$)', message: SDK_LAYER_MESSAGE }` (reemplaza `paths` + `group`) |
   | `src/sui/**` | `{ regex: '^@mysten/(?!sui(/|$)|dapp-kit-core(/|$))', … }` + el `group` actual de React y capas superiores |
   | `src/hooks/**` | `{ regex: '^@mysten/(?!sui(/|$)|dapp-kit-react$)', … }` |
   | `src/providers/**` | `{ regex: '^@mysten/(?!dapp-kit-react$)', … }` |

   Si la versión instalada de ESLint no admite `regex` en `patterns`, STOP (no se inventa otra sintaxis).
2. **`app/src/sui/nodeInfo.ts`:**
   ```ts
   export const NODE_STATUS_REFETCH_MS = 20_000;
   export type NodeInfo = { chainId: string; checkpointHeight: bigint | null };  // chainId = 8 hex
   /** Consulta viva (sin caché del SDK): ledgerService.getServiceInfo({}). Lanza si falta chainId o si no es base58. */
   export async function fetchNodeInfo(client: SuiGrpcClient): Promise<NodeInfo>;
   export type NodeStatus =
     | { kind: 'loading' }
     | { kind: 'ok'; checkpointHeight: bigint | null }
     | { kind: 'wrong_chain'; expected: string; actual: string }
     | { kind: 'offline'; reason: string };
   /** Pura. Prioridad: isError → offline (aunque haya data previa); isPending → loading; chainId ≠ esperado → wrong_chain; si no, ok. */
   export function deriveNodeStatus(q: { isPending: boolean; isError: boolean; error: unknown; data: NodeInfo | undefined },
                                    expectedChainId: string): NodeStatus;
   ```
   `fetchNodeInfo`: `const { response } = await client.ledgerService.getServiceInfo({});` → si `!response.chainId`, lanza
   `Error('El nodo no informó su chain id')`; `shortChainId(response.chainId)` sin `try/catch` (si lanza, es **error del
   intento** → `offline`); `checkpointHeight: response.checkpointHeight ?? null`. `reason` de `offline` = `error.message`
   si es `Error`, si no `String(error)`.
3. **`app/src/sui/dappKit.ts`:**
   ```ts
   import { createDAppKit } from '@mysten/dapp-kit-core';
   import { SuiGrpcClient } from '@mysten/sui/grpc';
   export function createAppDAppKit(config: AppConfig) {
     return createDAppKit({
       networks: [config.network],
       createClient: (network) => new SuiGrpcClient({ network, baseUrl: config.grpcUrl }),
       enableBurnerWallet: config.burnerWalletEnabled,
       ...(config.network === 'localnet' ? { slushWalletConfig: null } : {}),
     });
   }
   export type AppDAppKit = ReturnType<typeof createAppDAppKit>;
   ```
4. **`app/src/providers/AppProviders.tsx`:** `({ dAppKit, config, children })` → `QueryClientProvider` (un `QueryClient`
   creado una vez, p. ej. con `useState(() => new QueryClient())`) > `DAppKitProvider dAppKit={dAppKit}` >
   `ConfigContext.Provider value={config}`. Registro global de tipos:
   `declare module '@mysten/dapp-kit-react' { interface Register { dAppKit: AppDAppKit } }` con
   `import type { AppDAppKit } from '../sui/dappKit'`. Si con eso `useCurrentClient()` no tipa como `SuiGrpcClient`,
   augmentar `'@mysten/dapp-kit-core'` (sin importarlo: solo `declare module`) y declararlo.
5. **Hooks** (`app/src/hooks/`): `useAppConfig()` (lee `ConfigContext`; lanza si no hay provider); `useNodeStatus()` =
   `useQuery({ queryKey: ['sui', config.network, 'nodeInfo'], queryFn: () => fetchNodeInfo(client), refetchInterval:
   NODE_STATUS_REFETCH_MS })` con `client = useCurrentClient()` y `deriveNodeStatus(query, config.chainId)`;
   `useWalletAccount()` = `useCurrentAccount()` → `{ address: string | null; short: string | null }` (`shortAddress`).
   Sin `useEffect` para datos (PROY-14).
6. **Componentes** (`app/src/components/`): `Header` (título, `NetworkBadge`, `AccountBadge`, `ConnectButton` de
   `@mysten/dapp-kit-react/ui`); `NetworkBadge` (nombre de la red **siempre** visible + "nodo OK" / "red equivocada
   (esperada X, nodo Y)" / "sin conexión" con `reason` visible en texto chico o `title` / "conectando…"); `AccountBadge`
   (dirección abreviada si hay cuenta; nada si no).
7. **Páginas y router:** `app/src/pages/HomePage.tsx` (encabezado y una línea de texto del producto, sin TODOs),
   `NotFoundPage.tsx` (mensaje + link a `#/`). **`app/src/App.tsx` reescrito:** exporta `appRoutes` (layout con `Header`
   + `Outlet`; `/` → `HomePage`; `*` → `NotFoundPage`) y `App` = `RouterProvider` con `createHashRouter(appRoutes)`
   (creado fuera del componente). JSDoc nuevo que explique **por qué** hash routing (hosting estático, #15) y sin
   referencias a tasks. Usar el punto de entrada de `react-router` 8.5.0 que exporte `RouterProvider` para DOM según
   sus tipos instalados.
8. **`app/src/main.tsx`:** con config `ok`: `const dAppKit = createAppDAppKit(result.config)` y
   `<AppProviders dAppKit={dAppKit} config={result.config}><App /></AppProviders>`; con error, `ConfigError` (TASK-5).
9. **Normalización de IDs (D12, SEG-9):** #9 no tiene entradas de IDs (ni rutas con ID ni formularios): **no se
   implementa** aquí. Los IDs de config ya llegan en el formato estricto del productor (TASK-5). La regla para #10–#12
   ("validar con `isValidSuiObjectId`/`isValidSuiAddress` y normalizar con `normalizeSuiObjectId`/`normalizeSuiAddress`
   en el borde de entrada, antes de consultar o armar un PTB") la documenta TASK-7.

### 4. Archivos
- **Crear:** `app/src/sui/{nodeInfo.ts,nodeInfo.test.ts,dappKit.ts,dappKit.test.ts}`,
  `app/src/providers/AppProviders.tsx`, `app/src/hooks/{useAppConfig.ts,useNodeStatus.ts,useNodeStatus.test.tsx,useWalletAccount.ts}`,
  `app/src/components/{Header.tsx,Header.test.tsx,NetworkBadge.tsx,NetworkBadge.test.tsx,AccountBadge.tsx,AccountBadge.test.tsx}`,
  `app/src/pages/{HomePage.tsx,NotFoundPage.tsx}`.
- **Modificar:** `app/src/App.tsx`, `app/src/App.test.tsx`, `app/src/main.tsx`, `app/eslint.config.js`.
- **NO tocar:** dependencias, `contracts/`, `.github/`, `agents.md`, `documents/`, `app/src/sui/{networks,format,explorer,config}.ts`
  (salvo un import).

### 5. Tests obligatorios
- `nodeInfo.test.ts` (cliente falso con `ledgerService.getServiceInfo` mockeado): `chainId` base58 de testnet
  (`69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD`) → `4c78adac` y `checkpointHeight` bigint; sin `chainId` → rechaza;
  **base58 inválido** (p. ej. `'0OIl'`) → rechaza; `deriveNodeStatus`: pending → loading; data igual → ok; data distinta →
  wrong_chain con `expected`/`actual`; error → offline con `reason`; **error con data previa → offline**.
- `useNodeStatus.test.tsx` (wrapper con `QueryClient({ defaultOptions: { queries: { retry: false } } })`,
  `vi.useFakeTimers()`, `useCurrentClient`/`useAppConfig` mockeados): 1.er poll OK → `ok`; tras
  `advanceTimersByTimeAsync(NODE_STATUS_REFETCH_MS)` con el 2.º poll en error → `offline`; un poll posterior con otro
  chain id → `wrong_chain`; un poll con base58 inválido → `offline`.
- `dappKit.test.ts`: con `createDAppKit` mockeado (`vi.mock('@mysten/dapp-kit-core')`), verifica `networks`,
  `enableBurnerWallet` (true/false según config), `slushWalletConfig: null` solo en localnet y que `createClient` crea un
  `SuiGrpcClient` con `config.grpcUrl`.
- `NetworkBadge`/`AccountBadge`/`Header` con los hooks propios mockeados (`vi.mock('../hooks/…')`) y el módulo
  `@mysten/dapp-kit-react/ui` mockeado (el `ConnectButton` es un web component): cada red y cada `kind`; cuenta
  conectada (abreviada) y desconectada.
- `App.test.tsx`: con `createMemoryRouter(appRoutes, …)` y providers/hooks mockeados: `/` muestra el encabezado y la
  home; una ruta inexistente muestra `NotFoundPage`.

### 6. Smoke
No en este task. El comportamiento en navegador (wallet, "nodo OK", POST gRPC-web en DevTools, error provocado legible,
"sin conexión", "red equivocada", burner fuera del build de producción) se verifica en `SMOKE_APP.md`.

### 7. Criterios de aceptación (pegar output)
1. Gate de la app completo en verde, con conteos por archivo.
2. **Sondas de capas** (crear, `npm run lint -w app`, pegar el error, borrar; al final lint verde):
   (a) `src/components/LintProbe.tsx` → `@mysten/bcs`; (b) `src/sui/lintProbe.ts` → `import '../hooks/useAppConfig'`;
   (c) `src/components/LintProbe.tsx` → `@mysten/dapp-kit-react` (raíz); (d) `src/sui/lintProbe.ts` →
   `@mysten/dapp-kit-react/ui`; (e) `src/providers/LintProbe.tsx` → `@mysten/sui/grpc`; (f) `src/hooks/lintProbe.ts` →
   `@mysten/dapp-kit-core`; (g) `src/features/LintProbe.ts` → `@mysten/sui`; (h) `src/sui/lintProbe.ts` → `react`.
   Todas fallan. Y pasan (exit 0): `@mysten/dapp-kit-react/ui` en `components/`, `@mysten/sui/grpc` en `sui/` y `hooks/`,
   `@mysten/dapp-kit-react` en `hooks/` y `providers/`.
3. `grep -rnE "@mysten/" app/src --include=*.tsx --include=*.ts | grep -vE "^app/src/(sui|hooks|providers)/"` → solo
   `@mysten/dapp-kit-react/ui` (y mocks de tests, declarados).
4. `grep -rn "useEffect" app/src` sin usos para pedir datos; `grep -rn "getChainIdentifier" app/src` vacío.
5. Sin dependencias nuevas (`git diff --exit-code -- package.json app/package.json package-lock.json`).

### 8. Al terminar
Reporte §5. Desviaciones esperables (declarar): punto de entrada de `RouterProvider`; módulo augmentado para
`Register`; forma del mock del web component.

---

## TASK-7: documentación y baseline — área: docs

### 1. Historia de usuario del task
**Como** quien retome el proyecto (agente o persona), **quiero** que las guías digan cómo levantar, probar y apuntar la
app a una red, qué reglas de dependencias rigen y qué pasa ante un aviso de seguridad, **para** no redescubrir #9.

### 2. Contexto
`agents.md:53` (kit "por definir"), `agents.md` §3 "App (`app/`, cuando exista)", §4 (diagrama con "Sui fullnode
(RPC)"), §11 (wallet de navegador), §14; `documents/ESTANDARES.md` v1.7 (PROY-14 cita `useSuiClientQuery`, PROY-18 solo
`contracts`, SEG-8 genérica); `contracts/README.md` "Lectura desde la app" ("la elige #10 (gRPC o GraphQL)").
Evidencia a documentar: TASK-1 (lockfile y licencias), TASK-4 (CORS y `listEvents`), exit 144 de `sui start` ante
SIGTERM (riesgo 1 del reporte de TASK-4), paquetes de producción por el peer de `gql.tada`.

### 3. Qué implementar
1. **`app/README.md`** (nuevo): requisitos (Node 26 con `nvm use` o el prefijo de §0); scripts; `VITE_SUI_NETWORK` y
   `app/.env.example` (todo `VITE_*` es público); **localnet**: localnet aislada de `agents.md` §3 con la variante B del
   paso 4 (sin `--out` → `contracts/deployments/localnet.json`), `npm run dev -w app`, wallet de desarrollo (solo dev y
   localnet), cierre del paso 7 (`rm -f` del JSON); **testnet**: `contracts/deployments/testnet.json` de #8; mapa de
   `app/src/sui/` con sus issues dueños (tabla de PLAN_APP "Contrato on-chain"); regla de capas; consecuencia del glob
   `eager` (un `localnet.json` local entra en cualquier build hecho en esa máquina; los builds publicados salen de un
   checkout limpio); **regla de IDs para #10–#12** (D12, SEG-9: validar y normalizar en el borde de entrada);
   **procedimiento ante un aviso de seguridad** (D3, D11):
   - el job `app` falla solo con *high/critical* de **producción**. En el árbol de producción del lock quedan además
     `typescript`, `gql.tada`, `@0no-co/graphqlsp`, `@0no-co/graphql.web`, `graphql`, `chalk` y `commander` (los arrastra
     el peer de `gql.tada`, dependencia de `@mysten/sui`): un *high* en cualquiera de ellos pone `app` en rojo aunque no
     lleguen al navegador;
   - salida: PR de actualización; si el arreglo tiene < 7 días, `min-release-age-exclude` **temporal** solo para ese
     paquete, con un issue que lo retire (LIM-10); un `EBADENGINE` transitivo es STOP, nunca `--force`;
   - los *moderate* solo dev de `minimatch` están aceptados hasta **#35**.
2. **`agents.md`:** §2 tabla de áreas (kit `@mysten/dapp-kit-react` + `@mysten/dapp-kit-core`, `SuiGrpcClient`, tren
   fijado por el lockfile, `react-router`, TS 6.0.3); §3 "App (`app/`)": quitar "cuando exista", prefijo de Node 26,
   gate = steps del job `app` (incluidas las dos auditorías y el build con `VITE_SUI_NETWORK=testnet`) y frase de
   "Gate completo" con el job `app`; §3 "Localnet aislada" **paso 7: una línea** — "`sui start` 1.83 sale con código 144
   ante SIGTERM; el harness marca el comando como fallido: es esperado, lo que vale es que `kill -0` falle" (la receta no
   se reescribe); §4 diagrama (fullnode por gRPC-web); §11 fila de la wallet de desarrollo (burner: solo localnet y
   `npm run dev`); §14 `app/README.md`.
3. **`documents/ESTANDARES.md`** (v1.8, encabezado con #9/D-20261102-02): **PROY-14** — lecturas con `useQuery`/
   `useInfiniteQuery` de TanStack sobre `useCurrentClient()`; mutaciones con `useDAppKit().signAndExecuteTransaction` +
   `useMutation`; sin `useEffect` para datos; invalidar tras cada transacción exitosa. **PROY-18** — el gate local y el de
   CI son el mismo para `contracts` y `app`; ambos bloquean el merge. **SEG-8** — sumar la política de D3: versiones
   exactas, lockfile, `.npmrc`, `@mysten/*` por tren, ≥ 7 días.
4. **`contracts/README.md`** "Lectura desde la app" (y la frase equivalente cerca de "Objetos" de `game`, si la hay):
   la API es `SuiGrpcClient` (D-20261102-02 (1)); #10 captura las fixtures; la hora de creación sale de la
   transacción (`getTransaction(...).timestampMs`), no de `listEvents`, que no trae hora.
5. **`documents/STATUS.md`:** baseline de la app (gate y conteos de TASK-6), toolchain (npm 11.20.0, tren
   2.37.0/1.6.39/2.1.41), evidencia de TASK-4 (CORS, `listEvents`), hallazgo del exit 144, fila de #9 en el ciclo activo,
   pendiente del orquestador: check `app` requerido tras el merge (D7).

### 4. Archivos
- **Crear:** `app/README.md`. **Modificar:** `agents.md`, `documents/ESTANDARES.md`, `contracts/README.md`,
  `documents/STATUS.md`.
- **NO tocar:** código, dependencias, `.github/`, `documents/DECISIONES.md` (lo escribe el orquestador),
  `documents/PLAN_APP.md`, `documents/REVISION_PLAN_APP.md`, `documents/REPORTES_APP.md`.

### 5. Tests obligatorios
Gate de la app completo (los docs no deben romper nada) y, de contratos, solo `git diff --exit-code -- contracts/sources
contracts/tests contracts/Move.lock`.

### 6. Smoke
No aplica (el smoke del ciclo va después de este task).

### 7. Criterios de aceptación (pegar output)
1. Cada comando citado en los docs existe tal cual en `ci.yml` o `app/package.json` (tabla comando → archivo:línea).
2. `grep -rnE "@mysten/dapp-kit([^-]|$)|useSuiClientQuery|la elige #10" agents.md documents/ESTANDARES.md contracts/README.md app/README.md`
   → vacío.
3. `grep -rnE "suiprivkey|mnemonic|0x[0-9a-fA-F]{40,64}" app/README.md` → vacío (ejemplos solo con `0x…`).

### 8. Al terminar
Reporte §5 con el snippet de STATUS ya aplicado.

---

## Smoke del ciclo — `documents/SMOKE_APP.md`

Tras aprobar TASK-7, en este worktree. Runbook vivo (columnas de resultado durante la corrida). Reglas que manda:
- **Una sola localnet a la vez** en la máquina (puerto 9000): el orquestador lo confirma antes de empezar.
- **B4** (`agents.md` §3, reglas del script para agentes): ningún `sui client …` sin el prefijo de `env.sh` + `smoke_guard`,
  **ni siquiera de solo lectura**; `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`.
- Ningún agente corre nada contra testnet con claves (ni `publish.mjs … --network testnet`, ni con `--dry-run`). La
  lectura pública de testnet **desde el navegador** (CORS y error provocado del paso 7) sí está prevista.
- `sui start` sale con 144 ante SIGTERM: esperado.

## Body del PR (propuesta del MID al cierre; pendientes ya conocidos)

- `Closes #9`; decisiones D-20261102-02/03 y las del MID (D11, D12); gates y CI; smoke PASA/TOTAL.
- **Pendiente del orquestador tras el merge (D7):** agregar `app` a los checks requeridos de `master` (manteniendo
  `contracts`, `strict: false`, `enforce_admins: true`) y verificarlo con
  `gh api repos/sdelvalle57/sui_battleship/branches/master/protection/required_status_checks --jq '.contexts'` →
  `["contracts","app"]` (en cualquier orden).
- Riesgo aceptado: 11 *moderate* solo dev (#35).
