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

## Revisión TASK-2: PASA

> Revisión del MID transcrita por el orquestador. Revisó `git show cada02f`, los dos runs (`gh run view --json` y log del job `app`), el diff del PR desechable (`gh api compare`) y el estado de #36/#37.

Diff: un archivo (+40/−2), un hunk, job `app` idéntico línea a línea a HANDOFF §TASK-2.3; `contracts`, `framework-drift`, `env`, `on`, `concurrency`, `permissions` (`contents: read`) intactos. SHAs `checkout@3d3c42e5…` (v7.0.1, `persist-credentials: false`) y `setup-node@949feb24…` (v7.1.0, el de §0 y el que debe usar #7). Sin `needs`/`secrets`/`env`/`permissions` propios. Verde 41469633568: 12 pasos de `app` en verde, Node v26.13.0 / npm 11.20.0, `npm ci` 293 paquetes, firmas 292/143, audit prod 0, `1 passed (1)`, build OK, ≈79 s. Rojo 41469976365: PR #37 con un solo commit (`console.log` en `App.tsx`), `app` falla en **Lint**; Typecheck/Test/Build `skipped`; árbol limpio corre en verde; `contracts`/`framework-drift` verdes; #37 `CLOSED`, sin merge, branch borrada.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | D-20261102-02 (7), D-09 | protección de `master` | `app` aún no es check requerido: un PR con `app` en rojo hoy podría mergearse | Tras el merge de #9: agregar `app` a los checks requeridos y verificarlo; anotarlo en el body del PR |
| 2 | R9 | `ci.yml:131-170` | #7 también toca `ci.yml` | Al rebasar, conservar ambos bloques con el mismo SHA de `setup-node` y re-correr la CI |
| 3 | Info | PR #36 | Run en curso sobre `9071c78` (solo docs) | Confirmar verde antes de seguir |

### Siguiente paso
TASK-3 autorizada sin cambios. TASK-4 autorizada con dos condiciones: TASK-3 revisada PASA y commiteada (el cierre de TASK-4 exige árbol limpio), y confirmación del orquestador de que no hay otra localnet arriba (puerto 9000).

## Task completado: HANDOFF_APP — TASK-3 (capa `app/src/sui/` base)

> Reporte del DEV transcrito por el orquestador (los 58 nombres de test de la salida `--reporter=verbose` se resumen por archivo; el resto, literal).

- Branch `feature/issue-9-app` @ `c3f86f0`; sin commits. Creados: `app/src/sui/{networks,format,explorer}.ts` y sus `.test.ts`. Sin cambios en `package.json`, `app/package.json` ni `package-lock.json` (`git diff --exit-code` → 0).
- **Nota del DEV sobre el encargo:** el orquestador mencionó `nodeInfo.ts`, pero el handoff lo ubica en TASK-6 (Tramo B); no se implementó (correcto según el handoff).
- `networks.ts`: `Network` (`localnet | testnet`), `NETWORKS` (endpoints gRPC y Suiscan), `isNetwork` (con `Object.hasOwn`), `shortChainId` (`toHex(fromBase58(x)).slice(0, 8)`). `format.ts`: `U64_MAX`, `ParseResult`, `parseSuiToMist` con chequeos propios antes de `parseToMist` (razones `empty/negative/invalid/too_many_decimals/too_large`), `formatMist` solo `bigint`, `shortAddress = formatAddress`. `explorer.ts`: `explorerTxUrl`/`explorerObjectUrl` (lanzan con digest/ID inválidos —también en localnet—, `null` en localnet). JSDoc en todos los exports.
- Gates (Node v26.13.0): `lint exit=0`, `typecheck exit=0`, test `Test Files  4 passed (4)` / `Tests  58 passed (58)` (networks 12, format 30 —incl. `.5` → 500000000n, `-0` → negative, `1.`/` 1`/`1e3` → invalid, `18446744073.709551615` OK y +1 MIST → too_large, round-trips—, explorer 15, App 1) `test exit=0`, `build exit=0` (`index-CYi1jgMn.js 219.66 kB`).
- `grep -n 'number' app/src/sui/format.ts` → exit 1; `grep -rnE 'Number\(|parseFloat|parseInt|toFixed' app/src/sui/` → exit 1; único `number` es `SUI_DECIMALS` del SDK (cantidad de decimales). `src/sui/` importa solo `@mysten/sui/utils`.
- Tablas de contrato / `app/src/sui/`: no aplica (contrato sin cambios; estos módulos no tocan targets, eventos ni aborts).
- Desviaciones (internas): orden de validación en `explorer.ts` (dato antes que red); `Object.hasOwn` en `isNetwork`; tests extra; mensajes de error con `JSON.stringify` del valor.
- Riesgos: `isValidSuiObjectId` (SDK 2.37.0) acepta hex de 64 sin `0x` y en mayúsculas, y la URL usa el ID tal cual (posible `normalizeSuiObjectId` más adelante); `parseSuiToMist` no atrapa excepciones de `parseToMist` (con los chequeos previos no puede lanzar).

## Revisión TASK-3: PASA

> Revisión del MID transcrita por el orquestador (comparada con el código del SDK instalado).

Confirmado: `format.ts` (`U64_MAX` nombrada; orden de chequeos del handoff; regex pedida sin `trim`; `formatMist` solo `bigint`; `shortAddress` = `formatAddress`); `networks.ts` (URLs exactas, `isNetwork` con `Object.hasOwn`, `shortChainId` especificado); `explorer.ts` (valida antes de mirar la red, lanza, `null` en localnet); capas (`src/sui/` solo `@mysten/sui/utils` y `./networks`); JSDoc con el porqué; tests de todas las filas de la tabla de `parseSuiToMist`, 6 de `formatMist`, 2 round-trips, `shortChainId`, `isNetwork`, URLs exactas (12 + 30 + 15 + 1 = 58); gates del reporte en 0; desviaciones aceptadas. `nodeInfo.ts` correctamente fuera (TASK-6).

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | SEG-9 — decisión | `explorer.ts:21-25` | `isValidSuiObjectId` acepta hex sin `0x`/mayúsculas | No se normaliza en `explorer.ts`; la normalización va en el borde de entrada (#11/#12) |
| 2 | LIM-8 — decisión | `format.ts:26-33` | `parseToMist` sin `try/catch` | Correcto así (ninguna rama puede lanzar; un catch sería código muerto o se tragaría un error real) |
| 3 | Info TASK-6 | `networks.ts:27-29` | `shortChainId` lanza con base58 inválido | En TASK-6, `fetchNodeInfo`/`deriveNodeStatus` lo tratan como error del intento, con test |

> Decisión (2026-11-02): explorer.ts valida pero no normaliza; la normalización de IDs se hace en el borde de entrada (rutas/formularios) porque los IDs internos ya vienen normalizados del SDK y normalizar aquí aceptaría IDs cortos — MID.

### Siguiente paso
TASK-4 lista para arrancar tras commitear TASK-3 y confirmar que el puerto 9000 está libre.

## Task completado: HANDOFF_APP — TASK-4 (sonda gRPC-web en localnet, gate de D1)

> Reporte del DEV transcrito por el orquestador (resumido; salidas clave literales). Sin cambios en el repo; `<SMOKE_DIR>` en el scratchpad, ya borrado.

- Branch `feature/issue-9-app` @ `c40ef94`; árbol limpio. Pasó al primer intento, sin reintentos ni STOP-1.
- Línea base `~/.sui/sui_config/client.yaml`: `2026-10-30 17:52:52.515735237 -0500 244` (solo `stat`/`ls`); idéntica al cierre. Antes de empezar: 9000/9123/9184/5003 libres, sin procesos `sui`.
- Génesis aislada (`sui genesis --working-dir`, `exit=0`, `sui 1.83.0-16d2dc1e05ed`); red en segundo plano con `exec` y PID guardado; sin `--force-regenesis`, faucet ni `new-address`. Chain id `Hex: 9a65bf10`. `ADMIN` = `active-address` de la génesis, escrito en `ids.env` sin imprimirse.
- Paso 3: `sui client test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` → `exit=0`; `Move.lock` sin delta.
- Paso 5: `update_fee_rate(250)` → `effects.status {"status":"success"}`, digest `aiWb8Vw4GUwUmc62kKunuVzGMyVcisoKESrYFDhUz3A`, evento `<PKG>::house::FeeRateUpdated` `{new_fee_rate: 250, old_fee_rate: 0}`.
- Paso 6 (preflight CORS `OPTIONS /sui.rpc.v2.LedgerService/GetServiceInfo`, `Origin: http://127.0.0.1:5173`, headers `content-type,x-grpc-web,x-user-agent`): `HTTP/1.1 200 OK`, `access-control-allow-origin: *`, `access-control-allow-headers: *`, `access-control-allow-methods: GET,POST`.
- Paso 7 (`SuiGrpcClient`, `@mysten/sui` 2.37.0, desde `app/`): `chainId BPhmgkKZqWK5P3Q27htLabiaagqRThW4RszQY5pARdbi short 9a65bf10 checkpoint 236`; `listEvents` por tipo → 1 evento, mismo `transactionDigest` que el paso 5, `json.new_fee_rate: 250`; `exit=0`.
- Criterios §7: 1 ✅, 2 ✅, 3 ✅ (`short` = CLI), 4 ✅ cierre: `kill` por PID, `kill -0` → exit 1, puertos libres, `pgrep sui` → exit 1, `<SMOKE_DIR>` borrado, `git status --porcelain` vacío, sin `Pub.*.toml`/`Published.toml`/`contracts/deployments/localnet.json`.
- Desviaciones: ninguna de procedimiento; se imprimió además el digest del paso 5 (para cruzar con el paso 7; no es dato de cuenta).
- Riesgos: (1) `sui start` sale con 144 al recibir SIGTERM (no 143); el harness lo marca "failed" pero el cierre es correcto. (2) El nodo responde `allow-headers: *` / `allow-origin: *`; suficiente para gRPC-web sin credenciales; testnet se cubre en el smoke del Tramo B desde el navegador.
- Snippet STATUS propuesto: "#9 TASK-4 (gate de D1) ✅ 2026-11-02: preflight CORS gRPC-web 200 con comodines; `SuiGrpcClient` lee chain id y `listEvents` por tipo devuelve `FeeRateUpdated` al primer intento; cierre limpio."

## Revisión TASK-4: PASA (gate de D1 cumplido; Tramo A cerrado)

> Revisión del MID transcrita por el orquestador (resumida). Verificaciones pasivas del MID: base58→hex del chain id = `9a65bf10`; digest de 32 bytes; `stat` de `~/.sui/sui_config/client.yaml` idéntico; puertos libres; árbol limpio; `2e99f9e` solo toca este archivo.

Procedimiento conforme a HANDOFF_APP §TASK-4 y `agents.md` §3. Criterios §7: 1 ✅, 2 ✅, 3 ✅ (mismo digest en pasos 5 y 7), 4 ✅.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Riesgo 1 (receta de smoke) | `agents.md` §3 paso 7 | `sui start` 1.83 sale con 144 ante SIGTERM; el harness lo marca "failed" | STATUS (hallazgo conocido) + v2: nota en el cierre de `SMOKE_APP.md`/TASK-7 y una línea en `agents.md` §3 paso 7, coordinada con #7 |
| 2 | D1 (alcance de la evidencia) | §TASK-4.3 pasos 6-7 | Preflight con `curl` + SDK en Node (sin CORS): no se observó un POST real en navegador ni `access-control-expose-headers` (`grpc-status`/`grpc-message`); testnet sin probar. No bloquea | v2: en el smoke del Tramo B y la verificación de TASK-6, POST gRPC-web en DevTools (localnet y testnet) + error provocado legible |
| 3 | Info | `contracts/build/` (ignorado) | `test-publish` deja `build/` | Sin acción |
| 4 | Desviación declarada | Paso 5 | Digest impreso | Aceptada |

### Pendientes para HANDOFF_APP v2 (tras el merge de #7 y el rebase)
- Base de #7: esquema de `contracts/deployments/<red>.json`, fixture `localnet.deployment.json` (TASK-5), texto final de `agents.md` §3 (TASK-7), nuevo baseline §0.
- TASK-6: regex de capas `^@mysten/(?!dapp-kit-react/ui$)` (+ sondas `@mysten/bcs` en `components/` y `../hooks/x` en `sui/`); reescritura de `App.tsx` con su JSDoc; `shortChainId` lanza con base58 inválido → error del intento con test; `getServiceInfo` = `response.chainId` (base58) y `checkpointHeight`; normalización de IDs en el borde (#11/#12, SEG-9); CORS en navegador (hallazgo 2).
- TASK-7: nota de `typescript`/`gql.tada`/`@0no-co/graphqlsp`/`chalk`/`commander` en prod (🟡-7), issue #35; nota del exit 144.
- Smoke: puerto 9000 coordinado con #7. Body del PR: agregar `app` como check requerido tras el merge (D-20261102-02 (7)) y verificar con `gh api`.

### Siguiente paso
Tramo A cerrado (TASK-1..4 PASA); PR #36 en borrador. Tramo B bloqueado hasta el merge de #7 + rebase (conflictos esperados en `ci.yml` y `agents.md` §3) y la CI del PR #36 en verde; entonces el MID emite HANDOFF_APP v2.

## Task completado: HANDOFF_APP (v2) — TASK-5 (config por red)

> Reporte del DEV transcrito por el orquestador (resumido; nombres de los 48 tests nuevos agrupados; rutas locales reemplazadas por `<repo>`/`<scratchpad>`).

- Branch `feature/issue-9-app` @ `64618a2`, sin commits. Creados: `app/src/sui/config.ts`, `app/src/sui/config.test.ts`, `app/src/components/ConfigError.tsx`, `app/src/components/ConfigError.test.tsx`, `app/.env.example`. Modificado: `app/src/main.tsx` (+5/−3). `vite.config.ts` sin cambios (`server.fs.allow` no hizo falta).
- `resolveConfig` pura, reglas 1-7 en orden, mensajes en español con campo/archivo y acción; `SCHEMA_VERSION`, `CHAIN_ID_RE`, `OBJECT_ID_RE` privadas. `loadConfig` único lector de `import.meta.env` y del glob `../../../contracts/deployments/*.json`. `ConfigError` ("La app no está configurada", `role="alert"`, texto plano). `main.tsx` elige `<ConfigError>` o `<App />`. `.env.example` con `VITE_SUI_NETWORK=localnet` y aviso de que todo `VITE_*` es público.
- **Gates (Node v26.13.0):** `npm ci` exit 0 (11 moderate, solo dev, #35); `npm audit signatures` exit 0; `npm audit --omit=dev --audit-level=high` → `found 0 vulnerabilities`; lint 0; typecheck 0; `Test Files 6 passed (6)` / `Tests 106 passed (106)` (config 47, ConfigError 1, format 30, explorer 15, networks 12, App 1); `VITE_SUI_NETWORK=testnet` build exit 0 (`index-*.js 222.08 kB`).
- Criterio 2: `import.meta.env` solo en `config.ts` (`:133` JSDoc, `:138` lectura).
- Criterio 3: sin `contracts/deployments` → build localnet exit 0 y el `packageId` de la fixture aparece 0 veces en el bundle; con copia de la fixture (`cmp` idéntica, ignorada por `.gitignore:7`) → build exit 0 y 1 aparición; `vite` dev (binario directo con `exec`, PID guardado, `127.0.0.1:5173 --strictPort`) sirve el JSON por `/@fs/<repo>/contracts/deployments/localnet.json?import` con 200, log sin errores; detenido por PID (143). Limpieza: `rm -f` + `rmdir`, rebuild testnet (0 apariciones en `dist`).
- Criterio 4: `git diff --exit-code -- package.json app/package.json package-lock.json` → 0; `~/.sui/sui_config/client.yaml` idéntico (`2026-10-30 17:52:52.515735237 -0500 244`).
- **Desviaciones (internas):** vite por binario directo; constantes privadas (LIM-3); mensajes con `JSON.stringify` del valor o "ausente" (mainnet: "fuera de alcance del MVP"); `role="alert"` en un `<div>` dentro de `<main>`; tests extra (upgrade `packageId` ≠ `originalPackageId`, ambos archivos, nombre exacto `old-testnet.json`, `Testnet`/`toString`); helper que quita la clave para "ausente"; primer intento con 1 error de lint en el helper de test y 3 tests "uppercase" que pasaban por accidente (corregidos sin tocar producción).
- **Riesgos:** (1) el build de testnet muestra `ConfigError` hasta #8 (esperado); (2) el test de la fixture fija sus literales y fallará a propósito si #7 la regenera; (3) un `localnet.json` creado con vite ya arrancado puede requerir recarga (lo cubre el smoke).

## Revisión TASK-5: PASA

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates (D-20261030-02). La v2.1 no cambia TASK-5 (`git diff 64618a2 beea93f`).

Confirmado: firmas del handoff (`config.ts:15-31, 64-67, 136-141`); reglas 1-7 en orden (variable, mainnet, `isNetwork` con `hasOwn`, basename exacto, objeto + `schemaVersion`, `network`, formatos en minúsculas D12, claves desconocidas ignoradas) conforme a la regla 3 de "Compatibilidad"; `burnerWalletEnabled` (:127, D5); `import.meta.env` solo en `:138`; literales de la fixture real; 47 + 1 tests cubren §5 (SEG-9 en `ConfigError`); capas; `.env.example` exceptuado en `.gitignore:16` y sin secretos; criterios 3 y 4; desviaciones internas aceptadas.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Info (#8/#15) | `config.ts:139` | El glob `eager` mete todos los `deployments/*.json` en el bundle; un build de testnet en una máquina con `localnet.json` embebería IDs efímeros (no secretos) | TASK-7: una línea en `app/README.md` (el build de testnet publicado sale de la CI o de un checkout limpio) |
| 2 | Riesgo 2 | `config.test.ts:47-60` | Literales de la fixture fijos | Aceptado: la fixture es el contrato de formato; debe romper si se regenera |
| 3 | Riesgos 1 y 3 | `SMOKE_APP.md` | `ConfigError` en testnet hasta #8; recarga tras crear `localnet.json` | Sin acción (cubierto por el smoke) |

### Siguiente paso
TASK-5 commiteada; TASK-6 arranca con la v2.1 tal como está. El hallazgo 1 se suma a TASK-7.

## Task completado: HANDOFF_APP (v2.1) — TASK-6 (providers, kit, estado del nodo, UI base, capas)

> Reporte del DEV transcrito por el orquestador (resumido; nombres de tests agrupados; rutas locales reemplazadas).

- Branch @ `acd71fb`, sin commits. **Creados (19):** `app/src/sui/{nodeInfo,dappKit}.ts` + tests; `app/src/providers/AppProviders.tsx`; `app/src/hooks/{configContext,useAppConfig,useNodeStatus,useWalletAccount}.ts(x)` + `useNodeStatus.test.tsx`; `app/src/components/{Header,NetworkBadge,AccountBadge}.tsx` + tests; `app/src/pages/{HomePage,NotFoundPage}.tsx`. **Modificados:** `app/eslint.config.js`, `App.tsx`, `App.test.tsx`, `main.tsx` y `app/src/test/setup.ts` (fuera de la lista; desviación 5).
- **Gates (Node v26.13.0):** `npm ci` 0 (11 moderate solo dev); `audit signatures` 0; `audit --omit=dev --audit-level=high` → 0 vulnerabilities; lint 0; typecheck 0; `Test Files 12 passed (12)` / `Tests 142 passed (142)` (nodeInfo 14, dappKit 5, useNodeStatus 6, NetworkBadge 6, AccountBadge 2, Header 2, App 2, + 105 previos); build testnet exit 0, `index-*.js 826.07 kB │ gzip 251.42 kB` con aviso de chunk > 500 kB.
- **Criterio 2 (capas):** sondas (a)–(j) en tres rondas, todas `no-restricted-imports` con su mensaje (`@mysten/bcs`/`@mysten/sui`/`@mysten/dapp-kit-react` fuera de las capas; `dapp-kit-core` y `../components`/`../providers` en `hooks/`; `@mysten/sui/grpc` en `providers/`; `../hooks`, `dapp-kit-react/ui` y `react` en `sui/`); permitidos (`ui` en components, `sui/grpc` en sui y hooks, raíz de `dapp-kit-react` en hooks y providers) → lint 0; sondas borradas, lint 0.
- **Criterios 3–7:** fuera de las capas solo `@mysten/dapp-kit-react/ui` (más 2 `vi.mock` de tests); sin `useEffect` ni `getChainIdentifier`; deps sin diff; cero casts en `hooks/` y `providers/`; `NODE_STATUS_TIMEOUT_MS = 10_000`, `getServiceInfo({}, { abort })`, `queryFn: ({ signal }) => fetchNodeInfo(client, signal)`. `Register`: archivo temporal con `tsc` comprobó `useCurrentClient()` = `SuiGrpcClient` y `DefaultExpectedDppKit` = `AppDAppKit` (augment de `@mysten/dapp-kit-react` suficiente).
- **Desviaciones:** (1) timeout con `AbortController` + `setTimeout` (alternativa del handoff: `AbortSignal.timeout` no avanza con timers falsos en jsdom), combinado con `AbortSignal.any`, limpiado en `finally`, test `vi.getTimerCount() === 0`; (2) `RouterProvider` desde `react-router/dom`; (3) augment en `AppProviders.tsx`; (4) `vi.mock` del web component; (5) `setup.ts` con `afterEach(cleanup)` (sin globals de Vitest los renders se acumulaban); (6) helper `advance(ms)` +1 ms por la planificación de timers de 0 ms; (7) textos visibles del `NetworkBadge`; (8) tests extra.
- **Riesgos:** (1) `QueryClient` con `retry` por defecto (3 con backoff): "sin conexión" tarda ~7 s con nodo caído y ~47 s con nodo colgado; opción mínima `retry: false`/`1` en la query del nodo (no implementado sin indicación). (2) Bundle 826 kB (aviso de chunk; code-splitting → #15). (3) El código del burner está en el bundle de testnet, apagado en runtime (`burnerWalletEnabled` = localnet && DEV); el smoke verifica que no se ofrece.

## Revisión TASK-6: PASA

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates; consultó el SDK instalado (`dapp-kit-core/dist/index.mjs:831,845`; `grpc-web-transport.js:174-183`).

Confirmado: capas por regex (base, `sui/`, `hooks/` con `group` NIT-2, `providers/`), sondas (a)–(j); `nodeInfo.ts` (MINOR-1: `NODE_STATUS_REFETCH_MS = 20_000`, `NODE_STATUS_TIMEOUT_MS = 10_000`, `AbortController` + `AbortSignal.any`, `getServiceInfo({}, { abort })`, motivo legible vía `RpcError`, prioridad de `deriveNodeStatus`); `dappKit.ts` según el snippet; `AppProviders` sin casts (NIT-1) y `Register` tipado; hooks sin `useEffect`/`getChainIdentifier`; UI y router (JSDoc de `App.tsx` con el porqué; cierra hallazgo 3 de TASK-1); 142 tests cubren §5.

**Decisiones:**
> Decisión (2026-11-02): la desviación 5 (`app/src/test/setup.ts` con `afterEach(cleanup)`) se acepta: Vitest sin `globals` no registra la limpieza automática de Testing Library; es infraestructura de test sin efecto en producción — MID.
> Decisión (2026-11-02): useNodeStatus conserva los reintentos por defecto de TanStack (3 con backoff): "sin conexión" tarda ≤ ~27 s con el nodo caído y ≤ ~67 s con el nodo colgado; la política de reintentos y el estado "reintentando" (fetchStatus/failureCount) se definen en #10 para todas las lecturas — MID.
> Decisión (2026-11-02): el código de la burner wallet queda en el bundle de testnet pero nunca se habilita ni se ofrece (`createDAppKit` lo importa siempre, `index.mjs:845`); D-20261102-02 (5) se cumple — MID.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | LIM-11 | `useNodeStatus.test.tsx:264-269` | El test del `signal` no prueba la propagación (la señal del timeout siempre existe); el criterio 7 lo cubre por grep | En #10: test con `cancelQueries()` y mock colgado |
| 2 | LIM-3 | `Header.tsx:8`, `NetworkBadge.tsx:31`, `AccountBadge.tsx:10` | Clases sin reglas CSS | Sin acción (anclajes para #10/#15) |
| 3 | Riesgo 2 | Build testnet | 826 kB, aviso de chunk | Pendiente en el body del PR: code-splitting en #15 |
| 4 | Decisiones | — | Desviación 5, riesgos 1 y 3 | Registradas arriba; a `app/README.md` en TASK-7 |

### Siguiente paso
TASK-7 autorizada. Además de la v2.1, `app/README.md` suma: (1) latencia del indicador (≤ ~27 s / ≤ ~67 s; política en #10); (2) burner en el bundle, habilitada solo en localnet + DEV; (3) el build de testnet publicado sale de la CI o de un checkout limpio (hallazgo 1 de TASK-5); (4) aviso de chunk → #15.

## Task completado: HANDOFF_APP (v2.1) — TASK-7 (documentación y baseline)

> Reporte del DEV transcrito por el orquestador (resumido; gate literal en conteos y exit codes).

- Branch @ `7465f0b`, sin commits. Creado `app/README.md` (150 líneas). Modificados `agents.md` (+37/−20), `contracts/README.md` (+11/−9), `documents/ESTANDARES.md` (+4/−4, v1.8), `documents/STATUS.md` (+13/−4). Sin código ni dependencias.
- `app/README.md`: requisitos, scripts, gate, `VITE_SUI_NETWORK`, localnet (variante B y cierre), testnet y **origen del build publicado** (CI o checkout limpio), capas, mapa de `app/src/sui/`, D12, **indicador de red** (≤ ~27 s / ≤ ~67 s; política en #10), **wallet** (burner en el bundle, habilitada solo en localnet + `npm run dev`), dependencias y procedimiento ante avisos (7 paquetes de prod por el peer de `gql.tada`, `min-release-age-exclude` con issue, `EBADENGINE` = STOP, moderate hasta #35), licencias, pendientes (**chunk > 500 kB → #15**).
- `agents.md` §2 (stack, layout), §3 App (prefijo Node 26, steps del job `app`), §3 paso 7 (exit 144, una línea), §4 (gRPC-web), §11 (wallet de desarrollo), §14. ESTANDARES v1.8: PROY-14, PROY-18, SEG-8. `contracts/README.md` "Lectura desde la app" (`SuiGrpcClient`, fixtures en #10, hora por `getTransaction(...).timestampMs`) y la frase equivalente en la tabla de campos del `Game` (`:185`). STATUS: toolchain (npm 11.20.0, tren 2.37.0/1.6.39/2.1.41), baselines (app @ `71c976e`: 142 tests en 12 archivos, build 826 kB; sonda TASK-4; CI TASK-2), H14 (exit 144), fila #9, pendiente D7.
- **Gates:** contracts `git diff --exit-code -- contracts/sources contracts/tests contracts/Move.lock` → 0; `node --test` `tests 94 / pass 94 / fail 0`. App: `npm ci` 0; signatures 0; audit prod 0 vulnerabilities; lint 0; typecheck 0; `Test Files 12 passed (12)` / `Tests 142 passed (142)`; build testnet 0 (826.07 kB, aviso de chunk).
- Criterio 1: cada comando citado existe en `ci.yml` o `app/package.json` (tabla con líneas). Criterios 2 y 3: greps vacíos. Grep de secretos y rutas personales en las líneas añadidas: solo la palabra "secretos" de la regla SEG-3.
- **Desviaciones:** (1) retoques en `agents.md` §2 (layout y línea de fixtures "gRPC (SuiGrpcClient)"); (2) secciones extra en `app/README.md` (licencias, línea de `localnet.json` del cierre); (3) frase equivalente en `contracts/README.md:185`; (4) `node --test` corrido por tocar `contracts/README.md`.
- **Riesgos:** (1) `agents.md` §3 paso 6 todavía dice "o por la API que elija #10" (no se reescribió por la regla del handoff); propuesta: "o por `SuiGrpcClient` (D-20261102-02 (1))". (2) El baseline de STATUS cita `71c976e`; ajustable al SHA de TASK-7 o al run de la CI del PR #36.

## Revisión TASK-7: PASA (con 2 correcciones de una línea, aplicadas por el orquestador)

> Revisión del MID transcrita por el orquestador (resumida). No corrió gates; verificó en el SDK `getTransaction(...).timestampMs: number | null` (`types.d.mts:284`) y `useDAppKit` (`index.d.mts:114`).

Confirmado: `app/README.md` cubre §3.1 y las 4 líneas extra de TASK-6; `agents.md` §2/§3/§4/§11/§14 (paso 7 con una sola línea del exit 144); ESTANDARES v1.8 (PROY-14, PROY-18, SEG-8); `contracts/README.md` "Lectura desde la app" y `:185`; STATUS; coherencia con #7 (variante B `agents.md:149-151`, cierre `:163-166` intactos; reglas D-20261102-03 sin tocar); criterios 1–3; contracts sin delta; app 142/142.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | D-20261102-02 (1) | `agents.md:159` | "o por la API que elija #10" | Aplicada: "o por `SuiGrpcClient` (D-20261102-02 (1))" |
| 2 | PROY-20 / FLUJO §9 | `app/README.md:10` | Remitía a `documents/HANDOFF_APP.md` §0 (efímero) | Aplicada: "(`agents.md` §3, "App (`app/`)")" |
| 3 | Riesgo 2 | `STATUS.md` baseline app | Cita `71c976e` | Se deja; en el housekeeping se cambia por el SHA del merge + run de CI en `master` |
| 4 | Menor (temporal) | PROY-18; `agents.md` §3 | "Ambos bloquean el merge" será cierto tras D7 | Sin cambios; D7 en STATUS y en el body del PR |
| 5 | Menor | `STATUS.md:106` | "TASK-7 en revisión" | Aplicada: "TASK-7 (docs) PASA; smoke pendiente" |

### Siguiente paso
Smoke `SMOKE_APP.md` autorizado con árbol limpio, red libre confirmada por el orquestador, reglas B4/D8, exit 144 esperado, margen de 40 s en el paso 14 y resultados llenados durante la corrida.

## Smoke del ciclo (`SMOKE_APP.md`): PASA 17/17

> Reporte del DEV transcrito por el orquestador (resumido; el detalle por paso está en `documents/SMOKE_APP.md`).

- @ `2403fd4`, localnet aislada (chain `e87aec56`), publicación con el script (variante B, sin `--out`). Pasos 🌐 por **Chrome headless + CDP con perfil desechable** (Chrome 156, `--user-data-dir`, `HOME`/`XDG_*` dentro de `<SMOKE_DIR>`, depuración solo en 127.0.0.1, cliente CDP propio sin dependencias) — indicación del orquestador.
- Resultados clave: sonda (`update_fee_rate` + preflight + `listEvents` por `originalPackageId`) ✅; badge `localnet · nodo OK` ✅; POST `GetServiceInfo` 200 con `allow-origin: *` y `expose-headers: *`, sin errores CORS ✅; lectura pública localnet y testnet `GetServiceInfo` 200, `NoExiste` → `grpc-status: 12` ✅; burner en dev con dos direcciones distintas tras recargar ✅; `ConfigError` sin `localnet.json` ✅ (H-1); "red equivocada (esperada 00000000, nodo e87aec56)" ✅; build de producción sin burner ni Slush web, sin `warn` del burner ✅; "sin conexión (Failed to fetch)" a los **22,5 s** de matar la red ✅; build de testnet → `ConfigError` "Falta contracts/deployments/testnet.json…" sin requests RPC ✅; cierre completo ✅.
- Desviaciones: modalidad 🌐; paso 7 con `Runtime.evaluate`; paso 13 con captura de consola repetida; paso 10 con reinicio de `vite` ante `ConfigError` persistente.
- **H-1:** `vite` dev no detecta un `localnet.json` **nuevo** fuera de `app/` (sí borrado y modificación); hay que reiniciarlo. Solo dev. Propuesta: una línea en `app/README.md`. **H-2 (info):** al "Disconnect all" el kit loguea `WalletStandardError … does not support the standard:disconnect` para el burner; la desconexión funciona. Observaciones: `POST` abortado por `StrictMode` en dev, 404 de favicon, textos del `ConnectButton` en inglés.

## Revisión del smoke: PASA 17/17

> Revisión del MID transcrita por el orquestador (resumida). CI del PR #36 @ `2403fd4`: run 41483361440, `contracts`/`app`/`framework-drift` success.

- Procedimiento conforme al runbook; resultados coherentes (paso 14: 22,5 s ≤ 40 s; paso 11 "red equivocada"; pasos 8-9 direcciones distintas).
- **Modalidad 🌐 suficiente** para todos los pasos de #9: Chromium real (CORS, `fetch`, gRPC-web del SDK), evidencia más precisa (cabeceras exactas, shadow DOM, sondeo cada 250 ms), sin navegador ni claves del usuario. Paso 13 con perfil limpio = prueba más estricta. No cubierto (y no hace falta en #9): extensión real con firma (#11/#17) y la rama "con `testnet.json`" del paso 15 (**pendiente de #8**).
- **H-1:** una línea en `app/README.md` (paso 2 de localnet) — aplicada por el orquestador. **H-2** y `ERR_ABORTED` por `StrictMode`: se ignoran (solo dev). **Favicon** → #15. **Textos del `ConnectButton` en inglés** → #10.
