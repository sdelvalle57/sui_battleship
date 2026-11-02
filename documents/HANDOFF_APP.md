# HANDOFF_APP
> Plan: PLAN_APP v2 (aprobado por el MAYOR, "Revisión v2" de `documents/REVISION_PLAN_APP.md`) | Issue: #9 |
> Branch: `feature/issue-9-app` | Worktree: **`/home/santiago/Projects/Battleship-issue9`** | Versión: v1 | Fecha: 2026-11-02
>
> **Dónde se trabaja:** solo en el worktree `/home/santiago/Projects/Battleship-issue9`. El directorio
> `/home/santiago/Projects/Battleship` es de #7 (otro DEV): no se toca. En este documento, `<repo>` =
> `/home/santiago/Projects/Battleship-issue9`.
>
> **Tramos:**
> - **Tramo A — TASK-1, TASK-2, TASK-3, TASK-4:** corren **ya**, en este worktree, uno por sesión y en orden.
> - **Tramo B — TASK-5, TASK-6, TASK-7 y el smoke (`documents/SMOKE_APP.md`):** esperan a que **#7 esté mergeado en
>   `master`** y a que el orquestador **rebase `feature/issue-9-app`** sobre ese `master`. Antes de autorizar TASK-5, el
>   MID emite la **v2 de este handoff** con el esquema de `contracts/deployments/<red>.json` aprobado y el texto final
>   de `agents.md` §3 que deja #7. TASK-6 además exige TASK-4 en verde.
>
> Sin commits ni pushes (los hace el orquestador). Un task por sesión; al terminar, reporte con la plantilla de
> `documents/FLUJO_AGENTES.md` §5 (incluidos los tasks solo-UI) y esperar la revisión del MID.

## 0. Baseline de gates verificado (2026-11-02 14:51Z)

| Ítem | Valor | Fuente |
|---|---|---|
| `master` | `8c67221` (merge de #34: D-20261102-01/02) | `git log` |
| `feature/issue-9-app` | `8acf4d3` = `master` + `documents/PLAN_APP.md` y `documents/REVISION_PLAN_APP.md` (solo docs) | `git diff --stat 8c67221 HEAD` |
| Contratos | build 0 warnings, lint 0 lints, **83 tests PASS** (26 `house_tests` + 57 `game_tests`), `Move.lock` sin delta, coverage 100 %. Medido en `1630eaa`; entre `1630eaa` y `8c67221` solo cambió `contracts/README.md` (`git diff --stat 1630eaa 8c67221 -- contracts .github`) | `documents/STATUS.md:39-42` |
| CI en `master` | run [41462945220](https://github.com/sdelvalle57/sui_battleship/actions/runs/41462945220) (`8c67221`, push): `contracts` success, `framework-drift` success | `gh run list/view` |
| Protección de `master` | checks requeridos: `["contracts"]`; `sha_pinning_required: true` | `gh api …/required_status_checks`, `…/actions/permissions` |
| App | **`app/` no existe**; sin `package-lock.json`, sin `node_modules/`; `package.json` raíz = `{"name":"sui-battleship","private":true,"workspaces":["app"]}`; `.nvmrc` = `26` | árbol |
| Toolchain | Sui CLI `1.83.0-16d2dc1e05ed` (`~/.local/bin/sui`); Node **`v26.13.0`** en `/home/santiago/.nvm/versions/node/v26.13.0/bin` (npm **11.20.0**); Node 22 en `/home/santiago/.nvm/versions/node/v22.23.4/bin` | STATUS Toolchain, `ls ~/.nvm/versions/node` |
| `actions/setup-node` | `v7.1.0` = `949feb2413d6458794dcd2491c4babbbce0c15c1` (sigue siendo la latest) | `gh api repos/actions/setup-node/…` |

**Prefijo de Node 26 (obligatorio en toda llamada con `node`/`npm`/`npx`; cada llamada es un shell nuevo y el Node
por defecto de la máquina puede ser otro):**

```sh
export PATH=/home/santiago/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && cd /home/santiago/Projects/Battleship-issue9 && …
```

`node --version` debe imprimir `v26.13.0`; si no, se detiene y se reporta.

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Wallet kit `@mysten/dapp-kit-react` + `@mysten/dapp-kit-core`; lectura con `SuiGrpcClient` (gRPC-web). Nada de `@mysten/dapp-kit` ni JSON-RPC | D-20261102-02 (1), D-20261031-01 |
| D2 | Una red por build: `VITE_SUI_NETWORK` ∈ {`localnet`, `testnet`}; `mainnet` y cualquier otro valor = error; sin selector en runtime | D-20261102-02 (2) |
| D3 | Versiones exactas, `package-lock.json` commiteado, `.npmrc` con `min-release-age=7`, `ignore-scripts=true`, `save-exact=true`, `engine-strict=true`; en CI `npm audit signatures` y `npm audit --omit=dev --audit-level=high` **bloqueantes** | D-20261102-02 (3) |
| D4 | Lista de paquetes de §"Paquetes" (con `react-router` y TypeScript 6.0.3); `@mysten/*` por tren | D-20261102-02 (4), revisión 🟠-1 |
| D5 | Burner wallet solo con `network === 'localnet'` **y** `import.meta.env.DEV` | D-20261102-02 (5) |
| D6 | Explorador: Suiscan en testnet; en localnet sin link | D-20261102-02 (6) |
| D7 | Check `app` requerido en `master` tras el merge de #9 (lo aplica el orquestador; autorización ya dada) | D-20261102-02 (7) |
| D8 | `~/.sui/` sin claves para siempre; ningún paso usa la clave del owner. Testnet, solo con la wallet del navegador del owner | D-20261102-03 |
| D9 | Contrato on-chain **sin cambios** en #9 | PLAN_APP v2 |

## Paquetes (re-verificados el 2026-11-02 14:51Z)

### `@mysten/*`: por tren (D4)

Se usa el **tren más reciente cuyos cinco miembros tengan ≥ 7 días al momento del `npm install`**. Con el core como
dependencia directa y exacta, los rangos `^` transitivos no pueden saltar a un tren más nuevo (ese tren está fuera de
la ventana de 7 días) y el lockfile congela el resultado.

| Si el `npm install` de TASK-1 corre… | `@mysten/sui` | `@mysten/dapp-kit-core` | `@mysten/dapp-kit-react` | (transitivos: `wallet-standard` / `slush-wallet`) |
|---|---|---|---|---|
| antes del **2026-11-02 15:31Z** | 2.37.0 | 1.6.39 | 2.1.41 | 0.21.35 / 1.3.5 |
| entre el **2026-11-02 15:31Z** y el **2026-11-03 17:15Z** | 2.38.0 | 1.6.40 | 2.1.42 | 0.21.36 / 1.3.6 |
| después del **2026-11-03 17:15Z** | 2.38.0 | 1.6.41 | 2.1.43 | 0.21.36 / 1.3.6 |

**Re-verificación obligatoria antes del `npm install` (pegar el output):** para los cinco paquetes, `npm view <pkg>
dist-tags.latest` y `npm view <pkg> time --json` de la versión elegida (fecha + 7 días < ahora, `date -u`). Si apareció
un tren más nuevo que ya cumple 7 días, se usa ese y se declara en "Desviaciones". Si un tren tiene algún miembro con
< 7 días, no es elegible.

### Resto (exactas, todas con ≥ 7 días hoy)

| Paquete | Versión | Rol | Licencia |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | dependencies | MIT |
| `@tanstack/react-query` | 5.105.0 | dependencies | MIT |
| `react-router` | 8.5.0 | dependencies | MIT |
| `typescript` | 6.0.3 | devDependencies (TS 7 no es compatible con `typescript-eslint`: peer `<6.1.0`) | Apache-2.0 |
| `vite` / `@vitejs/plugin-react` | 8.3.5 / 6.1.2 | dev | MIT |
| `vitest` / `jsdom` | 5.0.5 / 30.1.3 | dev | MIT |
| `@testing-library/react` / `dom` / `jest-dom` | 16.3.3 / 10.4.2 / 7.0.1 | dev | MIT |
| `eslint` / `@eslint/js` / `typescript-eslint` / `eslint-plugin-react-hooks` | 10.13.0 / 10.0.1 / 8.72.0 / 7.1.1 | dev | MIT |
| `@types/react` / `@types/react-dom` / `@types/node` | 19.3.0 / 19.3.0 / 26.6.5 | dev | MIT |

**No agregar nada más** (ni `user-event`, `globals`, `eslint-plugin-react-refresh`, Tailwind ni librerías de
validación). Un paquete nuevo es STOP (SEG-8).

---

## TASK-1: workspace `app/`, toolchain y política de dependencias — área: app — Tramo A

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** un workspace `app/` que instala dependencias fijadas y auditadas y pasa lint,
typecheck, tests y build con una app mínima, **para** que #9..#14 se construyan sobre una base reproducible y segura.

### 2. Contexto
`app/` no existe (§0). `package.json` raíz con `"workspaces": ["app"]` (`package.json:4`). `package-lock.json` se borró
en #2 (T3) para regenerarse aquí. `.gitignore:10-11` ya ignora `node_modules/` y `app/dist/`; `.gitignore:14-16`,
`.env*` salvo `.env.example`. Comandos esperados: `agents.md:144-152`. Modelo: plantilla React + TS de Vite 8 y
`react.mdx` de la doc oficial de dApp Kit (`MystenLabs/ts-sdks`, `packages/docs/content/dapp-kit/getting-started/react.mdx`).

### 3. Qué implementar
1. **`.npmrc`** (raíz, nuevo; sin tokens):
   ```ini
   save-exact=true
   engine-strict=true
   min-release-age=7
   ignore-scripts=true
   ```
2. **`package.json` raíz:** agregar `"engines": { "node": ">=26 <27" }`; nada más.
3. **`app/package.json`:** `"name": "sui-battleship-app"`, `"private": true`, `"type": "module"`; dependencias de
   §"Paquetes" **exactas** (sin `^`/`~`); scripts:
   `dev: vite`, `build: vite build`, `preview: vite preview`, `lint: eslint . --max-warnings 0`,
   `typecheck: tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json`, `test: vitest run`.
   Instalar con `npm install -w app <pkg>@<versión> …` (y `-D` para dev) **desde la raíz**, con el prefijo de Node 26.
4. **`app/tsconfig.json`** (`include: ["src"]`): `target`/`lib` ES2022 + DOM, `module: ESNext`, `moduleResolution:
   bundler`, `jsx: react-jsx`, `types: ["vite/client"]`, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
   `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `skipLibCheck`,
   `noEmit`. **Sin `incremental` ni `composite`** (no debe aparecer ningún `*.tsbuildinfo`).
   **`app/tsconfig.node.json`** (`include: ["vite.config.ts"]`, `types: ["node"]`), mismas banderas estrictas.
5. **`app/vite.config.ts`:** `@vitejs/plugin-react`; bloque `test` con `environment: 'jsdom'`,
   `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`.
6. **`app/eslint.config.js`** (flat config): `@eslint/js` recomendado, `tseslint.configs.strictTypeChecked` con
   `parserOptions.projectService`, `eslint-plugin-react-hooks` recomendado (usar la forma de flat config que documente
   la versión instalada), `no-console: 'error'`, `no-restricted-syntax` contra `JSXAttribute[name.name='dangerouslySetInnerHTML']`,
   `ignores: ['dist']`. **Regla de capas en lista blanca** (`no-restricted-imports`; en flat config el último bloque
   que matchea un archivo reemplaza la configuración de la regla):

   | Bloque `files` | `no-restricted-imports` |
   |---|---|
   | base `src/**/*.{ts,tsx}` | `patterns.group`: `@mysten/sui`, `@mysten/sui/*`, `@mysten/dapp-kit-core`, `@mysten/dapp-kit-core/*`; `paths`: `@mysten/dapp-kit-react` (exacto: así `@mysten/dapp-kit-react/ui` queda permitido). Mensaje: "El SDK de Sui solo se importa en src/sui/ o src/hooks/ (ARQ-1, PROY-13)" |
   | `src/sui/**` | prohíbe `react`, `react-dom`, `react/*`, `@mysten/dapp-kit-react`, `@mysten/dapp-kit-react/*` y las capas superiores (`../hooks/*`, `../components/*`, `../pages/*`, `../providers/*` y sus variantes `**/hooks/**` etc.); permite `@mysten/sui*` y `@mysten/dapp-kit-core*` |
   | `src/hooks/**` | prohíbe `@mysten/dapp-kit-core`, `@mysten/dapp-kit-core/*`; permite `@mysten/sui*` y `@mysten/dapp-kit-react` |
   | `src/providers/**` | prohíbe `@mysten/sui`, `@mysten/sui/*`, `@mysten/dapp-kit-core`, `@mysten/dapp-kit-core/*`; permite `@mysten/dapp-kit-react` |

7. **App mínima:** `app/index.html` (`<div id="root">`, título "Sui Battleship"), `app/src/main.tsx` (monta `<App />`
   en `StrictMode`), `app/src/App.tsx` (encabezado "Sui Battleship"; el router llega en TASK-6), `app/src/index.css`
   (CSS plano mínimo), `app/src/vite-env.d.ts` (`/// <reference types="vite/client" />` + `ImportMetaEnv` con
   `readonly VITE_SUI_NETWORK?: string`), `app/src/test/setup.ts` (`import '@testing-library/jest-dom/vitest'`),
   `app/src/App.test.tsx`.

### 4. Archivos
- **Crear:** `.npmrc`, `package-lock.json` (lo genera npm), `app/package.json`, `app/index.html`, `app/vite.config.ts`,
  `app/tsconfig.json`, `app/tsconfig.node.json`, `app/eslint.config.js`, `app/src/{main.tsx,App.tsx,App.test.tsx,index.css,vite-env.d.ts}`,
  `app/src/test/setup.ts`.
- **Modificar:** `package.json` (raíz, solo `engines`).
- **NO tocar:** `contracts/`, `.github/`, `.gitignore`, `.nvmrc`, `agents.md`, `documents/` (salvo el reporte).

### 5. Tests obligatorios
- `App.test.tsx`: renderiza el título "Sui Battleship" (jsdom).

### 6. Smoke
No aplica (sin red ni navegador).

### 7. Criterios de aceptación (pegar el output de cada punto)
1. Re-verificación del tren de `@mysten/*` (§"Paquetes") y `date -u`.
2. `npm ci` desde la raíz con Node 26: exit 0 y sin scripts de instalación ejecutados (con `ignore-scripts`).
3. Gates: `npm run lint -w app`, `npm run typecheck -w app`, `npm test -w app`, `npm run build -w app`: todos exit 0
   (`build` sin `VITE_SUI_NETWORK` está bien en este task).
4. `npm ls @mysten/sui @mysten/dapp-kit-core @mysten/wallet-standard @mysten/slush-wallet`: **una sola versión de cada
   uno**, sin `invalid`, `UNMET PEER` ni `deduped` a otra versión; las tres `@mysten/*` directas del mismo tren.
5. `npm audit` (completo) y `npm audit signatures` pegados; `npm audit --omit=dev --audit-level=high` exit 0. Si hay
   vulnerabilidades high/critical de producción: **STOP** (no `audit fix`, no excepciones por cuenta propia).
6. Licencias del árbol desde `package-lock.json` (campo `license` de cada entrada de `packages`): lista de las que no
   sean MIT, Apache-2.0, BSD-2/3-Clause, ISC (o "ninguna").
7. `engine-strict`: con `export PATH=/home/santiago/.nvm/versions/node/v22.23.4/bin:$PATH`, `npm ci` falla con
   `EBADENGINE` (pegar las líneas del error); después, con el prefijo de Node 26, `npm ci` vuelve a exit 0 y los gates
   siguen verdes. Si con Node 22 **no** falla, se declara que el `engines` de la raíz es solo documental.
8. Sondas de la regla de capas (crear, correr `npm run lint -w app`, pegar el error, **borrar**): (a)
   `app/src/components/LintProbe.tsx` con `import { MIST_PER_SUI } from '@mysten/sui/utils'`; (b)
   `app/src/features/LintProbe.ts` (carpeta nueva) con `import { SuiGrpcClient } from '@mysten/sui/grpc'`; (c)
   `app/src/sui/lintProbe.ts` con `import { useState } from 'react'`. Las tres fallan con el mensaje de la regla; tras
   borrarlas (y la carpeta `features/`), lint verde.
9. `grep -nE '"[~^]' app/package.json` sin resultados; `git status --porcelain --untracked-files=all` sin
   `*.tsbuildinfo`, sin `node_modules`/`dist` (ignorados).

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Riesgos esperables: un `EBADENGINE` transitivo o un paquete que
exija script de instalación ⇒ **STOP** (nunca `--force` ni quitar `ignore-scripts`).

---

## TASK-2: job `app` en la CI — área: ci — Tramo A

### 1. Historia de usuario del task
**Como** owner, **quiero** que cada PR corra el gate de la app en GitHub Actions, **para** que nada que rompa la app
o traiga una dependencia vulnerable llegue a `master`.

### 2. Contexto
`.github/workflows/ci.yml:131-132` reserva el hueco (`TODO(#9)`). El job `contracts` (`ci.yml:28-129`) es el modelo:
`ubuntu-24.04`, `shell: bash`, `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` con
`persist-credentials: false`, paso final de árbol limpio. `permissions: contents: read` a nivel workflow (`ci.yml:9-10`).
El repo exige actions fijadas por SHA (§0).

### 3. Qué implementar
Reemplazar las líneas 131-132 (el comentario `TODO(#9)`) por:

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

Sin `needs`, sin `secrets`, sin `permissions` propios.

### 4. Archivos
- **Modificar:** `.github/workflows/ci.yml` (solo el bloque `TODO(#9)`).
- **NO tocar:** jobs `contracts` y `framework-drift`, `env`, `on`, `concurrency`, `permissions`.

### 5. Tests obligatorios
- YAML válido: `python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' .github/workflows/ci.yml` exit 0.
- `git diff -- .github/workflows/ci.yml` pegado: solo el bloque nuevo.
- Los mismos gates del job, corridos en local con el prefijo de Node 26 y `VITE_SUI_NETWORK=testnet` en el build
  (pegados).

### 6. Smoke
No aplica. **Verificación en GitHub (la hace el orquestador tras commitear):** push de la branch y PR (draft) contra
`master` → run con `app`, `contracts` y `framework-drift` en verde (link y tiempos); y un PR desechable con un
`console.log` en `app/src/App.tsx` → `app` rojo en Lint; ese PR se cierra sin merge (patrón R3/R4 de #3). El MID revisa
ambos links antes de autorizar TASK-3.

### 7. Criterios de aceptación
YAML válido; diff acotado; gates locales verdes; los dos runs de GitHub como se describe arriba.

### 8. Al terminar
Reporte §5 (la sección de CI se completa con los links que pase el orquestador).

---

## TASK-3: capa `sui/` base — redes, montos y explorador — área: app — Tramo A

### 1. Historia de usuario del task
**Como** desarrollador de #10–#14, **quiero** funciones puras y probadas para convertir montos SUI ↔ MIST sin
errores de redondeo, armar links al explorador y comparar el identificador de la red, **para** no reimplementarlas en
cada pantalla y no perder dinero por un `number`.

### 2. Contexto
El SDK ya trae `parseToMist` (`@mysten/sui/utils`; sin floats, rechaza > 9 decimales; **acepta** negativos, `.5` y
`-0`; no acota a u64), `formatAddress`, `fromBase58`, `toHex`, `isValidSuiObjectId`, `isValidTransactionDigest`. Las
reglas de capas de TASK-1 permiten `@mysten/sui*` en `src/sui/`.

### 3. Qué implementar
- **`app/src/sui/networks.ts`:** `export type Network = 'localnet' | 'testnet'`; `NETWORKS: Record<Network, { grpcUrl:
  string; explorerBase: string | null }>` = localnet `http://127.0.0.1:9000` / `null`; testnet
  `https://fullnode.testnet.sui.io:443` / `https://suiscan.xyz/testnet`; `isNetwork(x: string): x is Network`;
  `shortChainId(base58: string): string` = `toHex(fromBase58(base58)).slice(0, 8)`.
- **`app/src/sui/format.ts`:**
  - `U64_MAX = 2n ** 64n - 1n` (constante nombrada, LIM-6).
  - `type ParseResult = { ok: true; mist: bigint } | { ok: false; reason: 'empty' | 'negative' | 'too_many_decimals' |
    'too_large' | 'invalid' }`; `parseSuiToMist(input: string): ParseResult`. **Clasificación con chequeos propios
    antes de llamar a `parseToMist`** (nunca leyendo el texto de un error del SDK): `''` → `empty`; empieza con `-` →
    `negative`; no matchea `^(?:\d+(?:\.\d+)?|\.\d+)$` → `invalid`; más de 9 decimales → `too_many_decimals`; luego
    `parseToMist(input)`; `> U64_MAX` → `too_large`. Sin `trim`.
  - `formatMist(mist: bigint): string`: entero + hasta 9 decimales, sin ceros finales ni punto colgante, negativos con
    signo, sin `number`.
  - `shortAddress = formatAddress` (re-export del SDK).
- **`app/src/sui/explorer.ts`:** `explorerTxUrl(network, digest): string | null` → `${explorerBase}/tx/${digest}`;
  `explorerObjectUrl(network, id): string | null` → `${explorerBase}/object/${id}`; `null` si `explorerBase` es `null`;
  **lanza** `Error` si el digest no pasa `isValidTransactionDigest` o el ID no pasa `isValidSuiObjectId`.
- `///`/JSDoc en toda función exportada (LIM-7).

### 4. Archivos
- **Crear:** `app/src/sui/{networks.ts,networks.test.ts,format.ts,format.test.ts,explorer.ts,explorer.test.ts}`.
- **NO tocar:** fuera de `app/src/sui/`.

### 5. Tests obligatorios
`parseSuiToMist` (un caso por fila):

| Entrada | Resultado |
|---|---|
| `"0"` | ok `0n` |
| `"0.000000001"` | ok `1n` |
| `"1"`, `"0.001"`, `"50"` | ok `1_000_000_000n`, `1_000_000n`, `50_000_000_000n` |
| `".5"` | ok `500_000_000n` |
| `"18446744073.709551615"` | ok `18_446_744_073_709_551_615n` |
| `"18446744073.709551616"` | `too_large` |
| `"1.0000000001"` | `too_many_decimals` |
| `"-1"`, `"-0"`, `"-0.5"` | `negative` |
| `""` | `empty` |
| `"1."`, `" 1"`, `"1 "`, `"1e3"`, `"abc"`, `"0x10"`, `"1,5"` | `invalid` |

`formatMist`: `0n` → `"0"`; `1n` → `"0.000000001"`; `1_500_000_000n` → `"1.5"`; `50_000_000_000n` → `"50"`; `U64_MAX` →
`"18446744073.709551615"`; `-1n` → `"-0.000000001"`; ida y vuelta (`parseSuiToMist(formatMist(x))`) para
`2n ** 53n + 1n` y `U64_MAX`. Explorer: tx y objeto de testnet con las URLs exactas; `null` en localnet; digest inválido
y ID inválido lanzan. `shortChainId`: `69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD` → `4c78adac` (testnet),
`4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S` → `35834a8a` (mainnet). `isNetwork('mainnet') === false`.

### 6. Smoke
No aplica.

### 7. Criterios de aceptación
Gates verdes (pegar cuántos tests por archivo); ningún `number` para montos (`grep -n 'number' app/src/sui/format.ts`
pegado y explicado si hay coincidencias); sin dependencias nuevas.

### 8. Al terminar
Reporte §5.

---

## TASK-4: sonda gRPC-web en localnet (CORS + `listEvents`) — área: app (verificación) — Tramo A — gate de D1

### 1. Historia de usuario del task
**Como** owner, **quiero** comprobar con una red real que el navegador puede hablar con el nodo por gRPC-web y leer
eventos por tipo, **para** no construir #10–#14 sobre un canal que después no funcione.

### 2. Contexto
El código del nodo 1.83 sirve gRPC-web con CORS `Any` (`crates/sui-node/src/lib.rs:3002-3008`,
`crates/sui-rpc-api/src/grpc/mod.rs:77` @ `testnet-v1.83.0`) y `sui start` activa el indexado
(`crates/sui/src/sui_commands.rs:1048-1064`), pero nunca se probó. `update_fee_rate(house, cap, new_fee_rate: u16)` emite
`FeeRateUpdated { house_id, old_fee_rate, new_fee_rate }` (`contracts/sources/house.move:48-52, 98-104`). Procedimiento
base: localnet **aislada**, `agents.md` §3 "Localnet aislada (smokes)", pasos 1-7, **sin desvíos** (en este worktree,
`<repo>/contracts`). **Una sola localnet a la vez en la máquina:** antes de empezar, confirmar con el orquestador que
el DEV de #7 no tiene una red arriba (mismo puerto 9000).

### 3. Qué implementar (procedimiento; nada se commitea)
1. **Preparación** (§3 paso 2, más):
   - Resolver `NODE=/home/santiago/.nvm/versions/node/v26.13.0/bin/node` (verificar `--version` = `v26.13.0`).
   - Crear `<SMOKE_DIR>/app.env` (rutas **literales**; **no** toca `HOME` ni `SUI_CONFIG_DIR`; se carga en las llamadas
     sin `sui`):
     ```sh
     # <SMOKE_DIR>/app.env — cargar en cada llamada con node/npm/curl del smoke: `. <SMOKE_DIR>/app.env && …`
     SMOKE_DIR=<SMOKE_DIR>
     REPO=/home/santiago/Projects/Battleship-issue9
     NODE=/home/santiago/.nvm/versions/node/v26.13.0/bin/node
     export PATH=/home/santiago/.nvm/versions/node/v26.13.0/bin:$PATH
     [ "$("$NODE" --version)" = v26.13.0 ] && [ -d "$SMOKE_DIR" ] || { echo APPENV-FAIL; return 97; }
     ```
   - **Nunca** cargar `env.sh` y `app.env` en la misma llamada.
2. Génesis, arranque en segundo plano del harness y `suic chain-identifier` (§3 paso 4); cuentas (§3 paso 5:
   `ADMIN` en `ids.env`).
3. Publicación efímera (§3 paso 4), guardando el JSON: prefijo del paso 3 y
   `act_as "$ADMIN" && cd /home/santiago/Projects/Battleship-issue9/contracts && printf 'n\n' | "$SUI" client test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --json > "$SMOKE_DIR/publish.json"; echo "exit=$?"`.
   `publish.json` tiene direcciones de génesis: **no se pega**. Si `Move.lock` cambió: `git checkout -- contracts/Move.lock`
   y declararlo.
4. IDs **por tipo** (llamada con `app.env`):
   ```sh
   . <SMOKE_DIR>/app.env && "$NODE" -e '
   const o = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).objectChanges;
   const pub = o.filter((c) => c.type === "published");
   const by = (s) => o.filter((c) => c.type === "created" && c.objectType.endsWith(s));
   const h = by("::house::House"), k = by("::house::HouseCap");
   if (pub.length !== 1 || h.length !== 1 || k.length !== 1) { console.error("IDS-FAIL"); process.exit(1); }
   console.log(`export PKG=${pub[0].packageId}\nexport HOUSE=${h[0].objectId}\nexport CAP=${k[0].objectId}`);
   ' "$SMOKE_DIR/publish.json" >> "$SMOKE_DIR/ids.env" && tail -n 3 "$SMOKE_DIR/ids.env"
   ```
5. Evento real (prefijo del paso 3 de §3): `act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 250 --json > "$SMOKE_DIR/fee.json"; echo "exit=$?"`,
   y con `app.env`, imprimir solo `effects.status` y, de `events`, `type` + `parsedJson` (nunca `sender`).
6. **Preflight CORS** (con `app.env`, sin `env.sh`):
   ```sh
   curl -si -X OPTIONS -H 'Origin: http://127.0.0.1:5173' -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type,x-grpc-web,x-user-agent' \
     http://127.0.0.1:9000/sui.rpc.v2.LedgerService/GetServiceInfo
   ```
7. **Cliente real del SDK** (con `app.env` y `ids.env`; desde `$REPO/app` para resolver `@mysten/sui` del workspace):
   ```sh
   . <SMOKE_DIR>/app.env && . <SMOKE_DIR>/ids.env && cd "$REPO/app" && "$NODE" --input-type=module -e '
   import { SuiGrpcClient } from "@mysten/sui/grpc";
   import { fromBase58, toHex } from "@mysten/sui/utils";
   const client = new SuiGrpcClient({ network: "localnet", baseUrl: "http://127.0.0.1:9000" });
   const { response } = await client.ledgerService.getServiceInfo({});
   console.log("chainId", response.chainId, "short", toHex(fromBase58(response.chainId)).slice(0, 8), "checkpoint", String(response.checkpointHeight));
   let page = await client.listEvents({ filter: { eventType: `${process.env.PKG}::house::FeeRateUpdated` }, order: "descending", limit: 5 });
   for (let i = 0; page.events.length === 0 && page.hasNextPage && i < 5; i++) {
     page = await client.listEvents({ filter: { eventType: `${process.env.PKG}::house::FeeRateUpdated` }, before: page.endCursor, limit: 5 });
   }
   console.log(JSON.stringify({ hasNextPage: page.hasNextPage, events: page.events.map((e) => ({ eventType: e.eventType, transactionDigest: e.transactionDigest, checkpoint: e.checkpoint, json: e.json })) }, null, 2));
   '
   ```
   (`PKG` llega por el `export` de `ids.env`.) Si el indexado tarda, repetir el paso 7 hasta 3 veces con 10 s de
   espera (Monitor/until, sin `sleep` en primer plano).
8. **Cierre** (§3 paso 7) completo.

### 4. Archivos
Ninguno del repo. Todo en `<SMOKE_DIR>`. **NO tocar:** `~/.sui/`, `contracts/` (salvo revertir un delta de
`Move.lock`), nada fuera de `<SMOKE_DIR>`.

### 5. Tests obligatorios
No aplica (verificación). Los outputs de los pasos 5, 6 y 7 son la evidencia.

### 6. Smoke
Es el propio task. Prohibiciones de §3 paso 6 (ningún archivo de `<SMOKE_DIR>/net` se lee ni se pega; logs no se pegan).

### 7. Criterios de aceptación
1. Paso 5: `effects.status` success y un evento `…::house::FeeRateUpdated` con `new_fee_rate` 250.
2. Paso 6: `HTTP/1.1 200` (o `204`) con `access-control-allow-origin: *` y `access-control-allow-headers` presente.
3. Paso 7: `short` igual a los 8 primeros hex del chain id de `suic chain-identifier`; **≥ 1 evento** con `eventType`
   `<PKG>::house::FeeRateUpdated` y `json` legible con `new_fee_rate` 250.
4. Cierre: `kill -0` falla, `<SMOKE_DIR>` borrado, `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base,
   `git status --porcelain` vacío, `git diff --exit-code -- contracts/Move.lock` exit 0, sin `Pub.*.toml`/`Published.toml`.

**Si 2 o 3 fallan (aun con los reintentos), se detiene y se reporta: vuelve a STOP-1 (D1) antes de TASK-6.**

### 8. Al terminar
Reporte §5 con los outputs de 5-7 (sin `publish.json`, sin `sender`, sin logs) y el cierre.

---

## TASK-5: `config.ts` y pantalla de error de configuración — área: app — **Tramo B (requiere #7 en `master` + rebase)**

> Se detalla en la **v2 de este handoff**, que el MID emite tras el merge de #7 con el esquema aprobado
> (`contracts/README.md` "Despliegues") y la fixture `contracts/scripts/fixtures/localnet.deployment.json`. Contenido
> fijado por PLAN_APP v2 ("Configuración", TASK-5): `resolveConfig(env, deployments)` puro + `loadConfig()` único lector
> de `import.meta.env`/`import.meta.glob('../../../contracts/deployments/*.json', { eager: true, import: 'default' })`;
> valida `schemaVersion === 1`, `network` (= variable = nombre del archivo), `chainId` (`^[0-9a-f]{8}$`), `packageId`,
> `originalPackageId`, `houseId` (`^0x[0-9a-f]{64}$`), ignora claves desconocidas; `burnerWalletEnabled = network ===
> 'localnet' && DEV`; `ConfigError`; `app/.env.example` (`VITE_SUI_NETWORK=localnet`).

## TASK-6: providers, wallet, router e indicador de red — área: app — **Tramo B (requiere TASK-4 verde y TASK-5)**

> Se detalla en la v2 de este handoff. Contenido fijado por PLAN_APP v2 (TASK-6) más estas precisiones:
> `nodeInfo.ts` con `fetchNodeInfo(client)` sobre `client.ledgerService.getServiceInfo({})` (sin caché) y
> `deriveNodeStatus` puro (`loading | ok | wrong_chain | offline`, el error del último intento manda sobre el dato
> previo); `NODE_STATUS_REFETCH_MS = 20_000`; los tests de hooks usan un `QueryClient` con `retry: false` y timers
> falsos; `dappKit.ts` con `createDAppKit` de `@mysten/dapp-kit-core`, `networks: [config.network]`,
> `enableBurnerWallet: config.burnerWalletEnabled`, `slushWalletConfig: null` en localnet.

## TASK-7: documentación y baseline — área: docs — **Tramo B**

> Se detalla en la v2 de este handoff (PLAN_APP v2, TASK-7): `app/README.md`, `agents.md` §2/§3/§4/§11/§14 (la receta
> de localnet aislada **no** se reescribe: se remite a la variante de salida por defecto y al `rm -f` del paso 7 que deja
> #7), `ESTANDARES.md` (PROY-14, PROY-18, SEG-8), `contracts/README.md:177` y "Lectura desde la app", `STATUS.md`.

## Smoke (Tramo B)

`documents/SMOKE_APP.md` (ya creado, estado PENDIENTE): se ejecuta tras aprobar TASK-7, en este worktree, con #7 en
`master`. Se completa **durante** la corrida.
