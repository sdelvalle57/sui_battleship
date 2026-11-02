# Reportes del ciclo — #9 Scaffolding de la app

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador (el harness no
> deja escribir archivos de reporte a los subagentes). **Resúmenes declarados:** el árbol completo de `npm
> audit` y algunos comandos largos se condensan; los resultados (exit codes, conteos, mensajes de error) son
> literales. Logs completos fuera del repo (scratchpad `issue9/`: `install-prod.log`, `install-dev.log`,
> `ci-node22.log`).

## Task completado: HANDOFF_APP — TASK-1

Sin STOP: sin `EBADENGINE` con Node 26, sin ERESOLVE, `npm audit signatures` y `npm audit --omit=dev --audit-level=high` en verde. Tren instalado **2.37.0 / 1.6.39 / 2.1.41** (fila 1 del handoff; install 14:57–14:58Z, antes de 15:31Z). Riesgo menor: 11 *moderate* solo en desarrollo (minimatch vía eslint), sin arreglo elegible.

### Branch (con SHA corto del HEAD)
`feature/issue-9-app` @ `48064f9` (worktree `/home/santiago/Projects/Battleship-issue9`); sin commits.

### Archivos modificados/creados
- Modificado: `package.json` (raíz): solo `"engines": { "node": ">=26 <27" }`.
- Creados: `.npmrc`, `package-lock.json` (lockfileVersion 3, 320 entradas), `app/package.json`, `app/index.html`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/eslint.config.js`, `app/src/{main.tsx,App.tsx,App.test.tsx,index.css,vite-env.d.ts}`, `app/src/test/setup.ts`.
- Sin tocar: `contracts/`, `.github/`, `.gitignore`, `.nvmrc`, `agents.md`, `documents/`.

### Qué se implementó (3 líneas máx)
Workspace `app/` con 22 dependencias exactas (7 prod + 15 dev), `.npmrc` con la política de suministro y lockfile; TS estricto, Vite/Vitest, ESLint flat con capas en lista blanca, `no-console` y prohibición de `dangerouslySetInnerHTML`; app mínima con su test.

### Tests y gates
**C1 — Tren `@mysten/*`** (`date -u` = `2026-11-02T14:56:24Z`): `@mysten/sui` 2.37.0 elegible / 2.38.0 no; `dapp-kit-core` 1.6.39 sí / 1.6.40-41 no; `dapp-kit-react` 2.1.41 sí / 2.1.42-43 no; `wallet-standard` 0.21.35 sí / 0.21.36 no; `slush-wallet` 1.3.5 sí / 1.3.6 no ⇒ tren 2.37.0 / 1.6.39 / 2.1.41 (transitivos 0.21.35 / 1.3.5). Resto de paquetes: 19 con ≥ 7 días y `engines` compatibles con Node 26; licencias Apache-2.0 (typescript) y MIT.

**Install** (Node v26.13.0): prod `added 69 packages … found 0 vulnerabilities exit=0` (14:57:38Z); dev `added 224 packages … 11 moderate severity vulnerabilities exit=0` (14:58:10Z).

**C2 — `npm ci`**: `ignore-scripts=true`, `min-release-age=7`, `engine-strict=true`, `save-exact=true`; único paquete con script de instalación en el lock: `fsevents@2.3.3 (dev) (optional)` (no se instala en Linux); `npm ci exit=0`.

**C3 — Gates (Node 26):**
```
npm ci exit=0
> eslint . --max-warnings 0
lint exit=0
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json
typecheck exit=0
 RUN  v5.0.5 /home/santiago/Projects/Battleship-issue9/app
 Test Files  1 passed (1)
      Tests  1 passed (1)
test exit=0
vite v8.3.5 building client environment for production...
✓ 16 modules transformed.
dist/index.html                   0.39 kB │ gzip:  0.26 kB
dist/assets/index-BpmJ95vp.css    0.28 kB │ gzip:  0.18 kB
dist/assets/index-CYi1jgMn.js   219.66 kB │ gzip: 68.65 kB
✓ built in 183ms
build exit=0
```
ESLint revisa los 7 archivos esperados; `--print-config vite.config.ts` → 165 reglas activas (incl. `no-console`, tipadas estrictas, `react-hooks/rules-of-hooks`).

**C4 — `npm ls`** (literal):
```
sui-battleship@ /home/santiago/Projects/Battleship-issue9
└─┬ sui-battleship-app@ -> ./app
  ├─┬ @mysten/dapp-kit-core@1.6.39
  │ ├─┬ @mysten/slush-wallet@1.3.5
  │ │ ├── @mysten/sui@2.37.0 deduped
  │ │ └── @mysten/wallet-standard@0.21.35 deduped
  │ ├── @mysten/sui@2.37.0 deduped
  │ └─┬ @mysten/wallet-standard@0.21.35
  │   └── @mysten/sui@2.37.0 deduped
  ├─┬ @mysten/dapp-kit-react@2.1.41
  │ └── @mysten/dapp-kit-core@1.6.39 deduped
  └── @mysten/sui@2.37.0
npm ls exit=0
```
`npm ls --all` exit 0; sus 53 marcas son `UNMET OPTIONAL DEPENDENCY` (binarios de otras plataformas y peers opcionales). Otros `@mysten/*` con una sola versión: `bcs@2.1.3`, `utils@0.4.2`, `window-wallet-core@0.4.1`.

**C5 — Auditorías:** `npm audit` → 11 *moderate*, una causa (`minimatch <11.0.1`, GHSA-g3hv-75wg-m249, vía `@eslint/config-array`/eslint/typescript-eslint), `exit=1`; `npm audit --omit=dev --audit-level=high` → `found 0 vulnerabilities`, `exit=0`; `npm audit signatures` → `292 packages have verified registry signatures`, `143 packages have verified attestations`, `exit=0`.

**C6 — Licencias** (lock): MIT 226, Apache-2.0 39, BSD-3-Clause 12, ISC 11, BSD-2-Clause 8, MPL-2.0 12, BlueOak-1.0.0 4, MIT-0 2, CC-BY-4.0 1, CC0-1.0 1, `(Apache-2.0 AND BSD-3-Clause)` 1, sin campo 1. En producción, fuera de MIT/Apache/BSD/ISC solo `@protobuf-ts/runtime@2.11.1` `(Apache-2.0 AND BSD-3-Clause)` (transporte gRPC-web). MPL-2.0 (`lightningcss` y sus binarios), BlueOak, MIT-0, CC-BY-4.0, CC0: solo dev. "Sin campo": el enlace del propio workspace.

**C7 — `engine-strict` con Node 22:** `npm error code EBADENGINE … Required: {"node":">=26 <27"} Actual: {"npm":"10.9.9","node":"v22.23.4"}` → `npm ci (node 22) exit=1`; después, con Node 26, `npm ci` exit 0 y gates en verde.

**C8 — Sondas de capas:** `components/` importando `@mysten/sui/utils`, `features/` importando `@mysten/sui/grpc` y `sui/` importando `react` → 3 errores `no-restricted-imports` con los mensajes de capa, `lint exit=1`; sondas borradas → `lint exit=0`. Extra: imports permitidos (`@mysten/sui/utils` en `sui/`, `@mysten/dapp-kit-react` en `hooks/`, `@mysten/dapp-kit-react/ui` en `components/`) → exit 0; `react-dom/client` en `sui/` → error.

**C9:** `grep -nE '"[~^]' app/package.json` → exit 1 (sin rangos); `git status` solo con los archivos de §4; sin `*.tsbuildinfo`; `node_modules` y `app/dist` ignorados (`.gitignore:10-11`).

### Verificación manual
No aplica.

### Desviaciones del handoff (detalles internos)
1. `eslint.config.js`: `parserOptions.projectService = { allowDefaultProject: ['vite.config.ts'], defaultProject: 'tsconfig.node.json' }` + `tsconfigRootDir` (sin `references`, que exigirían `composite`).
2. `strictTypeChecked` en `**/*.{ts,tsx}`; `eslint.config.js` con `@eslint/js` recomendado, react-hooks y reglas globales.
3. Mensajes propios por capa (`sui/`, `hooks/`, `providers/`) citando ARQ-1 (y ARQ-5/PROY-13 en `sui/`).
4. `defineConfig` de `vitest/config` en Vite; `defineConfig` de `eslint/config`; `reactHooks.configs.flat.recommended`.
5. `export function App`; nombre de test en inglés.

### Riesgos / pendientes
1. 11 *moderate* solo dev (`minimatch <11.0.1`): `minimatch@11.0.1` (2026-10-27) aún dentro de la ventana de 7 días, salto mayor y `@eslint/config-array@0.23.5` pide `^10.2.4` ⇒ depende de una versión nueva de eslint; no se hizo `audit fix --force`. Propone issue de seguimiento.
2. Tren 2.38.0 elegible desde 15:31Z; el lockfile congela 2.37.0 (actualizar sería un cambio deliberado aparte).
3. `min-release-age` lo entiende npm 11; npm 10 (Node 22) no, pero `engine-strict` corta antes.

### Documentación
TASK-7. Snippet STATUS: #9 TASK-1 (workspace, `.npmrc`, `engines`, lockfile v3, tren 2.37.0/1.6.39/2.1.41, gates app verdes, firmas 292/292, audit prod 0, 11 *moderate* dev).

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador. El MID verificó con lectura del lockfile (python), `npm view`, `gh api /advisories` y el código de npm 11.20.0 y ESLint 10.13.0.

**Confirmado:** 22 dependencias exactas (`app/package.json:13-38`) = §"Paquetes"; `.npmrc:1-4` con las 4 claves y sin tokens; `package.json:5` solo `engines`; lockfile v3, 320 entradas, todas `registry.npmjs.org` con `integrity`, sin git; único `hasInstallScript` `fsevents` (dev, opcional); una versión por `@mysten/*`; tren correcto para 14:57Z (2.38.0 elegible desde 15:31Z); `min-release-age` existe en npm 11.20.0; TS con las banderas pedidas, sin `incremental`/`composite`; ESLint con capas según la tabla y overrides en orden, `no-console` y `dangerouslySetInnerHTML` globales; Vite/Vitest = handoff; sin `.env*` ni secretos; C1-C9 en verde. Desviaciones aceptadas.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | SEG-8 / D-20261102-02 (3) — decisión | `package-lock.json` (`minimatch` 10.2.6, dev) | 11 *moderate* solo dev (GHSA-g3hv-75wg-m249, DoS si el atacante controla el patrón glob; aquí no); sin arreglo upstream | **Riesgo aceptado** con issue de seguimiento **#35**; sin `audit fix --force` ni `overrides`. No afecta a la CI (`--omit=dev` y `--audit-level=high`); el `npm audit` completo no entra a la CI como bloqueante |
| 2 | ARQ-1 / PROY-13 (hueco del plan) | `app/eslint.config.js:53-59` | La base no prohíbe los `@mysten/*` transitivos ni subrutas de `dapp-kit-react` ≠ `/ui`; sin sonda de imports relativos hacia arriba desde `sui/` | En la v2 del handoff (TASK-6): `patterns: [{ regex: '^@mysten/(?!dapp-kit-react/ui$)', message }]` + sondas de `@mysten/bcs` en `components/` y `../hooks/x` en `sui/` |
| 3 | LIM-7 | `app/src/App.tsx:1` | JSDoc remite a "TASK-6" | La v2 lo reescribe |
| 4 | Info (R6) | lockfile (`typescript`, `gql.tada`… sin `dev`) | Quedan como producción por el peer de `gql.tada`; un *high* ahí pondría `app` en rojo | Mencionarlo en el procedimiento de avisos de TASK-7 |
| 5 | FLUJO §5 | este archivo | Falta "Tablas de contrato…: no aplica"; `npm view`/`npm audit` resumidos (declarado) | Sin acción |

> Decisión (2026-11-02): se aceptan los 11 moderate solo dev de minimatch <11.0.1 (GHSA-g3hv-75wg-m249) hasta que eslint/typescript-eslint publiquen versiones con minimatch ≥ 11.0.1 y cumplan los 7 días (issue #35), porque el patrón no lo controla un tercero y no hay arreglo upstream — aplica D-20261102-02 (3), que bloquea solo high/critical de producción.

### Siguiente paso: TASK-2 (job `app` en la CI) autorizado sin cambios

### Mensaje de commit propuesto
`app: scaffold workspace with pinned toolchain and supply-chain policy (#9)` (commit `86816e7`).

## Task completado: HANDOFF_APP — TASK-2 (job `app` de CI)

> Reporte del DEV transcrito por el orquestador (resumen declarado de la salida local; el diff y los resultados son literales).

- `.github/workflows/ci.yml`: el bloque `TODO(#9)` (líneas 131-132) reemplazado por el job `app` copiado del handoff; `contracts`, `framework-drift`, `env`, `on`, `concurrency` y `permissions` sin tocar. `git diff --stat`: 1 archivo, +40/−2, un solo hunk `@@ -131,2 +131,40 @@`.
- Job `app`: `ubuntu-24.04`, 15 min, bash `-eo pipefail`; `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1, `persist-credentials: false`) y `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0; `node-version-file: .nvmrc`, `cache: npm`, `cache-dependency-path: package-lock.json`); pasos: Node de `.nvmrc`, `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high`, lint, typecheck, test, build con `VITE_SUI_NETWORK=testnet`, árbol sin cambios (`if: !cancelled()`). Sin `needs`, `secrets`, `env` ni `permissions` propios; sin `npm audit` completo (Nota v1.1).
- YAML válido (`yaml exit=0`); jobs `['contracts', 'app', 'framework-drift']`; `grep 'secrets\.'` exit 1; todas las `uses:` fijadas por SHA de 40 caracteres. SHAs verificados con `gh api` (tags → commits `949feb24…`/`3d3c42e5…`, últimas releases; inputs `node-version-file`, `cache`, `cache-dependency-path` existen; `using: 'node24'`). `actionlint` no disponible.
- Pasos corridos en local con Node v26.13.0 / npm 11.20.0: Node de `.nvmrc` exit 0; `npm ci` exit 0; firmas `292 packages have verified registry signatures` exit 0; audit prod `found 0 vulnerabilities` exit 0; lint/typecheck exit 0; test `1 passed (1)` exit 0; build exit 0 (`index-CYi1jgMn.js 219.66 kB`); árbol sin delta respecto de antes de los gates. Chequeo de Node con Node 22 → exit 1.
- Desviaciones: ninguna. Tablas de contrato / `app/src/sui/`: no aplica.
- Riesgos: posible conflicto de cercanía con #7 en `ci.yml` al rebasar (resolver conservando ambos bloques); avisos nuevos pueden poner `app` en rojo (solo prod high); `app` aún no es check requerido (se aplica tras el merge de #9, D-20261102-02 (7)).

### Anexo de runs (orquestador)

- Commit `cada02f` (job `app`) pusheado; PR borrador **#36**.
- **Verde:** run [41469633568](https://github.com/sdelvalle57/sui_battleship/actions/runs/41469633568) → `success`: `app` (15:14:34–15:15:53Z, ≈ 79 s), `contracts` y `framework-drift` en verde.
- **Rojo provocado:** worktree desechable con `console.log("ci red check")` en `app/src/App.tsx`, PR borrador #37 → run [41469976365](https://github.com/sdelvalle57/sui_battleship/actions/runs/41469976365) `failure`: job `app`, paso **Lint** en `failure` (`3:1  error  Unexpected console statement  no-console`, `✖ 1 problem (1 error, 0 warnings)`); `contracts` y `framework-drift` en verde.
- Limpieza: `git worktree remove`, `gh pr close 37 --delete-branch` (PR `CLOSED`, `mergedAt: null`), branch remota y local inexistentes, `git worktree list` sin el desechable.
