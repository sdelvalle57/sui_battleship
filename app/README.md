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
2. `VITE_SUI_NETWORK=localnet npm run dev -w app` y abrir `http://localhost:5173`.
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
├── sui/         # funciones puras sobre el SDK (sin React): red, config, montos, explorador, nodo, kit
├── hooks/       # hooks de React sobre el kit y TanStack Query (+ ConfigContext)
├── providers/   # QueryClientProvider > DAppKitProvider > ConfigContext
├── components/  # UI sin lógica de negocio
├── pages/       # páginas del router por hash (#/…)
└── App.tsx      # rutas (appRoutes) + RouterProvider
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
| `config.ts` | **único** lector de `import.meta.env` y de `contracts/deployments/*.json`; valida el esquema de #7 | #9 |
| `format.ts` | SUI ↔ MIST con `bigint` (`parseSuiToMist`, `formatMist`), `shortAddress` | #9 |
| `explorer.ts` | links a transacción y objeto (Suiscan en testnet; `null` en localnet) | #9 |
| `nodeInfo.ts` | `fetchNodeInfo` (consulta viva con corte por tiempo) y `deriveNodeStatus` | #9 |
| `dappKit.ts` | instancia del kit con `createDAppKit` y `SuiGrpcClient` | #9 |
| `game.ts` / `events.ts` | tipos y parsers del `Game` y de sus eventos, con fixtures reales | #10 |
| `errors.ts` | mapeo (módulo, código de abort) → mensaje | #11 |
| `transactions/*.ts` | builders puros de PTB | #11, #12 |

### Reglas para las lecturas y los IDs (#10–#12)

- Lecturas con TanStack Query sobre `useCurrentClient()`; nada de `useEffect` para pedir datos (PROY-14).
- La hora de un evento no viene en `listEvents`: sale de la transacción (`getTransaction`, `timestampMs`).
- **IDs y direcciones de entrada** (rutas, formularios): validar con `isValidSuiObjectId`/`isValidSuiAddress` y
  normalizar con `normalizeSuiObjectId`/`normalizeSuiAddress` en el borde de entrada, antes de consultar o armar un
  PTB (D12, SEG-9). `explorer.ts` valida pero no normaliza; los IDs de config ya llegan normalizados (formato estricto
  del productor).

## Indicador de red

El encabezado muestra siempre la red del build y el estado del nodo: "conectando…", "nodo OK", "red equivocada
(esperada X, nodo Y)" (chain id del nodo distinto del de `<red>.json`) o "sin conexión" con el motivo.

- Consulta `getServiceInfo` cada 20 s (`NODE_STATUS_REFETCH_MS`) y corta cada intento a los 10 s
  (`NODE_STATUS_TIMEOUT_MS`): un nodo colgado cuenta como error, no deja el último "nodo OK".
- **Latencia de "sin conexión":** la query conserva los reintentos por defecto de TanStack Query (3, con espera
  creciente), así que tarda **≤ ~27 s** con el nodo caído y **≤ ~67 s** con el nodo colgado. La política de
  reintentos (y un estado "reintentando") se decide en #10 para todas las lecturas.

## Wallet

`ConnectButton` del kit y la dirección abreviada de la cuenta conectada. La **burner wallet** se habilita solo en
localnet + `npm run dev`; su código igual está en el bundle de testnet (el kit lo importa siempre), pero nunca se
habilita ni se ofrece.

## Dependencias y avisos de seguridad (SEG-8, D-20261102-02 (3))

- Versiones **exactas** en `app/package.json`, `package-lock.json` commiteado y `.npmrc` en la raíz:
  `save-exact`, `engine-strict`, `min-release-age=7` (ninguna versión con menos de 7 días) e `ignore-scripts`.
- Los `@mysten/*` acoplados van **por tren** (hoy `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
  `@mysten/dapp-kit-react` 2.1.41, con una sola versión de cada uno en el árbol); se suben juntos.
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

- El build de testnet pesa ≈ 826 kB (≈ 251 kB gzip) y Vite avisa de un chunk mayor de 500 kB: el code-splitting
  queda para #15 (hosting).
