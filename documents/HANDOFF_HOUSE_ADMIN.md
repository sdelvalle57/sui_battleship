# HANDOFF_HOUSE_ADMIN
> Plan: PLAN_HOUSE_ADMIN v1.1 (MAYOR: APPROVE en la ronda corta, 2026-11-04; `0bfd916`) | Issue: #14 | Branch:
> `feature/issue-14-house-admin` | Versión: v1 | Fecha: 2026-11-04

## Changelog

- **v1 (2026-11-04)**: primera versión. Integra D-20261104-02 (P-1..P-4 = (a); N-2 ya decidido) y la ronda corta del
  MAYOR sobre el plan v1.1 (APPROVE con 1 MINOR y 2 SUGGESTION):

| Hallazgo de la ronda corta | Dónde queda resuelto en este handoff |
|---|---|
| **MINOR-1** (`'incomplete'` no existe en `ReadDataReason`, `readErrors.ts:5`; TASK-2 no tocaba `readErrors.ts`) | TASK-2 §3.1 y §4: `readErrors.ts` y su test entran en TASK-2. `ReadDataReason` suma `'incomplete'`, y `readErrorMessage` le da un texto propio: "El nodo no completó la búsqueda del HouseCap; reintenta". No es transitorio (`isTransientReadError` no cambia): no se reintenta solo, queda el "Reintentar" del `ReadState`. Tests T2-1, T2-2 |
| SUGGESTION-1 (motivo del `ObjectError` en el `precheck`) | **Aplicada** (§1 H-3, TASK-2 §3.2 `checkHouseCapOwnership`, T2-12, T4-9). Solo un `ObjectError` con `reason` `notFound` o `deleted` cuenta como "ya no tiene el HouseCap", igual que `gameDetail.ts:25`. Un `ObjectError` con `reason: 'unknown'` se relanza: el `precheck` de la máquina lo muestra como texto de red si es transitorio, o como "No se pudo preparar la transacción: …" si no lo es (`useExecuteTransaction.ts:131-133`) |
| SUGGESTION-2 (título de D-20261104-02) | Ya aplicada por el orquestador en `documents/DECISIONES.md`; este handoff no lo toca |

Documento autocontenido para el DEV: TASK-1..6 y el smoke del ciclo. Se ejecuta **un task por sesión**, en orden. Cada
task termina con el reporte de `documents/FLUJO_AGENTES.md` §5 y espera la revisión del MID antes del siguiente. El DEV
**no** commitea ni pushea: lo hace el orquestador.

## Historia de usuario del ciclo

**Como** titular del `HouseCap` (el owner, admin de la House), **quiero** un panel en la app que solo vea la cuenta que
tiene el cap, con la comisión, los límites de apuesta y las comisiones acumuladas, y con botones para cambiar la comisión,
cambiar los límites y retirar las comisiones a mi cuenta, **para** administrar la House desde el navegador sin armar
comandos de la CLI y con el mismo resultado honesto (solo lo que confirma el nodo) que el resto de la app.

**Scope en una frase:** ruta `#/admin` con la detección del `HouseCap` por tipo entre los objetos de la cuenta conectada,
la lectura de la House y tres acciones (`update_fee_rate`, `update_bet_limits`, `withdraw_fees` + transferencia del `Coin`
a la cuenta que firma) sobre la máquina de transacciones de #11/#12, más el enlace "Administrar House" en el encabezado
solo para esa cuenta.

**Lo que NO entrega:** transferir el `HouseCap` desde la UI (N-1, sigue por CLI); `migrate` ni upgrades desde la UI;
retiro parcial o a otra dirección (N-2: cualquier variante es STOP no delegable); métricas o historial de comisiones; el
smoke en testnet con la cuenta del owner (P-4: checklist en el body de #17); cambios en el contrato; dependencias nuevas.

## 0. Baseline de gates verificado (2026-11-04, HEAD `0bfd916`)

Base de la branch: `master` `deaadbb` (merge de #13 `ab1e2d5` + housekeeping de #55; CI de `master` en verde, run
41790496035). Encima, la branch suma solo docs: D-20261104-01 (`2e0141a`, `a06ceba`), D-20261104-02 (`1c21029`) y el plan
v1.1 (`0bfd916`). Verificado con `git diff --stat 7a3b7fb..HEAD -- app/ contracts/ package.json package-lock.json .npmrc
.github`: solo cambian `app/README.md` y `contracts/README.md` (housekeeping de #13). El código de `app/` y `contracts/`
es el que midió TASK-5 de #13 (`7a3b7fb`). Valores de `documents/STATUS.md`:

| Área | Gate | Baseline |
|---|---|---|
| Toolchain | `printf 'n\n' \| sui --version` / `node --version` / `npm --version` | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` / `11.20.0` |
| App | `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` | exit 0; 293 paquetes; 292 firmas verificadas; 0 vulnerabilidades de producción (11 *moderate* solo dev, aceptadas hasta #35) |
| App | `npm run lint -w app` / `npm run typecheck -w app` | 0 problemas (sin `eslint-disable`) / 0 errores |
| App | `npm test -w app` | **915 tests PASS en 57 archivos** |
| App | `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-*.js` **901.45 kB** (273.61 kB gzip), con el aviso informativo de chunk > 500 kB (#15) |
| Contracts | `sui move build` / `--lint` / `test` con `-e testnet --warnings-are-errors` | 0 warnings / 0 lints / **83 tests PASS**; `Move.lock` sin delta |
| Contracts | `node --test scripts/*.test.mjs` / `node scripts/publish.mjs check` | **99 PASS** / "0 despliegues" |

**Gates en forma canónica** (`agents.md` §3; output completo pegado en cada reporte):

```bash
# App, desde <repo> (prefijo de Node 26 en cada llamada)
export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version
npm ci
npm audit signatures
npm audit --omit=dev --audit-level=high
npm run lint -w app
npm run typecheck -w app
npm test -w app
VITE_SUI_NETWORK=testnet npm run build -w app
git status --porcelain --untracked-files=all

# Contracts, desde <repo>/contracts (en TASK-1, como verificación del baseline; el ciclo no toca contracts/ salvo
# contracts/fixtures/house-admin.localnet.json en TASK-1 y contracts/README.md en TASK-6)
printf 'n\n' | sui --version
printf 'n\n' | sui move build -e testnet --warnings-are-errors
printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors
printf 'n\n' | sui move test -e testnet --warnings-are-errors
node --test scripts/*.test.mjs
node scripts/publish.mjs check
git diff --exit-code -- Move.lock
```

**Primer paso de TASK-1:** correr el gate completo (job `app` + job `contracts`) **antes** de tocar nada y pegarlo como
"verificación del baseline". Si algo difiere, se para y se reporta. **TASK-2 en adelante:** el gate de la app parte del
último reporte aprobado; además, en cada task, `git diff --exit-code -- contracts/` (salvo lo de TASK-1 y TASK-6).

## 1. Decisiones (no reabrir)

**Del owner y por delegación (registradas):**

| Decisión | Qué fija para este ciclo |
|---|---|
| **D-20261104-02 (1)**, P-1 = (a) | Una cuenta conectada sin cap que abre `#/admin` ve solo "Sin permisos…", sin datos de la House ni acciones sobre ella; sin enlace en el encabezado |
| **D-20261104-02 (2)**, P-2 = (a) | Comisión en **bps enteros** (0..1000) con el % equivalente en vivo al lado |
| **D-20261104-02 (3)**, P-3 = (a) | Sin diálogo de confirmación; junto al botón, el resumen "de X bps (x %) a Y bps (y %)" (y el equivalente de límites y retiro). El cambio de comisión no es del todo reversible (D-20261030-06 §3): por eso el resumen es obligatorio |
| **D-20261104-02 (4)**, P-4 = (a) | #14 se mergea con el smoke completo en localnet; la checklist del owner en testnet va como casillas al body de #17 (la escribe el orquestador; este handoff la deja lista en el smoke) |
| **D-20261104-02 (5)**, N-2 | Retiro **total**, destino = la cuenta que firma **por construcción** (`build(sender)`), sin campo de destino ni monto parcial. Cualquier variante es STOP no delegable |
| D-20261030-11 D3/D4, D-20261030-12 | `HouseCap` `key` sin `store`; `withdraw_fees` `public` devuelve `Coin<SUI>` y la PTB decide el destino; `update_fee_rate`/`update_bet_limits`/`transfer_house_cap`/`migrate` son `entry` |
| D-20261030-06 §3 | El `Game` copia la comisión al crearse: el aviso del panel lo dice |
| D-20261102-02 (1), (3), (5), (6) | Lecturas por `SuiGrpcClient`; sin dependencias nuevas; burner solo en localnet + `npm run dev`; sin explorador en localnet |
| D-20261102-03 | Ningún agente usa claves del owner ni corre nada con claves contra testnet; `~/.sui/` sin claves |

**Del plan v1.1 (MID, aprobadas por el MAYOR).** Resumen operativo (detalle en `documents/PLAN_HOUSE_ADMIN.md`, D-1..D-7):

| # | Resumen |
|---|---|
| D-1 | Detección por tipo `<originalPackageId>::house::HouseCap` con `listOwnedObjects` y la **regla de certeza** (H-1). `useHouseCap` con `CapKnowledge` (H-2). Sin `houseCapId` en `config.ts` |
| D-2 | Ruta `admin` (`#/admin`), `<HouseAdminView key={address} />`, enlace "Administrar House" solo con `known` + cap. Estados de H-2. "Volver a comprobar" en "Sin permisos" |
| D-3 | Validación espejo pura: `HOUSE_MAX_FEE_BPS = 1000`, `validateFeeRate`, `validateBetLimits` (con `negative`), `canWithdraw`; "igual a lo actual" deshabilita |
| D-4 | Builders puros; el del retiro con **exactamente 2** comandos (`withdraw_fees` y `TransferObjects([Result 0], recipient)`) |
| D-5 | Objetivo `house`, acciones `updateFeeRate`/`updateBetLimits`/`withdrawFees`, `ACTION_KINDS` y `TxValueByAction` atados al tipo (H-4), `switch` exhaustivo en `useTxTarget`, `toTxGameEntry` y `adoptedStatus`; `ExecuteInput.build(sender)` y `precheck(signal, sender)`; invalidación de la tabla de H-5 |
| D-6 | Hooks finos; `precheck` común con `getObject(capId)` (H-3); preflight de siempre; `interpret` desde el evento; relectura de la House antes de `done` |
| D-7 | `migrate` y `transfer_house_cap` solo por CLI; la app no replica `VERSION` |

**Reglas de este handoff (H-n):**

| # | Regla | Dónde |
|---|---|---|
| **H-1** (MAJOR-1 del plan) | `fetchHouseCap`: `listOwnedObjects({ owner, type: houseCapType(pkg), limit: 2, include: { content: true }, cursor })`, cada pedido con `withReadTimeout`. Mientras `hasNextPage`, sigue el `cursor` hasta `HOUSE_CAP_MAX_PAGES = 3` pedidos, juntando como mucho 2 objetos. **`null` solo** si se juntaron 0 objetos y la última página trajo `hasNextPage: false`. 2 objetos ⇒ `ReadDataError('invariant')` (sin pedir más). Tope alcanzado con `hasNextPage: true` y menos de 2 objetos ⇒ `ReadDataError('incomplete')`, nunca `null` ni el cap. Exactamente 1 objeto y fin ⇒ `parseHouseCapObject`. Un cursor `null` con `hasNextPage: true` ⇒ `ReadDataError('incomplete')` | TASK-2 |
| **H-2** (MINOR-1 del plan) | `CapKnowledge = { kind: 'unknown' } \| { kind: 'known'; cap: HouseCap \| null }`: `unknown` ⇔ `query.data === undefined` (sin lectura exitosa); `known` = `query.data` aunque una relectura posterior falle. Sin `placeholderData`. Página: `unknown` ⇒ solo `ReadState`; `known` + `null` ⇒ "Sin permisos" con el `ReadState` encima si relee o falla; `known` + cap ⇒ el panel con el `ReadState` encima: **nunca** se desmonta por un error de relectura. El panel trata la House igual (`ReadState` solo sin dato; con dato, aviso encima) | TASK-4, TASK-5 |
| **H-3** (MINOR-2 del plan + SUGGESTION-1) | `precheck` común: `checkHouseCapOwnership` con `getObject(capId)` (store de objetos, no el índice). `'owned'` si existe, tipo exacto, `owner` no `null` y `AddressOwner` = `sender` (`sameAddress`); `'not_owned'` si el tipo o el dueño no cumplen, o ante un `ObjectError` con `reason` `notFound`/`deleted`. Cualquier otro error (incluido `ObjectError` con `reason: 'unknown'`) se **relanza**. `'not_owned'` ⇒ `{ stop: HOUSE_CAP_LOST_MESSAGE, invalidate: [queryKeys.houseCap(...)] }`. El `precheck` **no** llama a `listOwnedObjects` | TASK-2, TASK-4 |
| **H-4** (MINOR-4 del plan) | `ACTION_KINDS` = `new Set(Object.keys(TX_ACTION_KINDS))` con `const TX_ACTION_KINDS = { create: true, …, withdrawFees: true } satisfies Record<TxAction['kind'], true>` (falta o sobra una clave ⇒ `typecheck` rojo). `TxValueByAction = { [K in TxAction['kind']]: TxValueMap[K] }` sobre un `type TxValueMap = { … }` no exportado: una acción sin valor en `TxValueMap` ⇒ `typecheck` rojo. Sin `eslint-disable` | TASK-3 |
| **H-5** (D-5 del plan) | Invalidación de las acciones de la House: `reset: []`; `updateFeeRate`/`updateBetLimits` ⇒ `invalidate: [house, houseCap de la cuenta]`; `withdrawFees` ⇒ `[house, balance de la cuenta, houseCap de la cuenta]`. Sin cuenta, sin `balance` ni `houseCap`. Nunca `lobby`, `game` ni `myGames`. Las filas de partidas no cambian | TASK-3 |
| **H-6** | El texto de éxito sale **solo** del `outcome` del nodo (SEG-10): mientras la etapa es `preflight`/`signing`/`confirming`/`indexing`, ningún texto de resultado de la tabla de abajo aparece en el panel | TASK-5, smoke |

**Textos fijos de la UI** (los usan los tests y el smoke; si el DEV cambia uno, lo declara como desviación):

| Clave | Texto |
|---|---|
| Enlace del encabezado | "Administrar House" |
| Título de la página (`h2`) | "Administrar House" |
| Sin cuenta | "Conecta la wallet que tiene el HouseCap para administrar la House" |
| Sin cap | "Sin permisos: esta cuenta no tiene el HouseCap de esta House." + botón "Volver a comprobar" |
| `ReadDataError('incomplete')` (`readErrorMessage`) | "El nodo no completó la búsqueda del HouseCap; reintenta" |
| Configuración (`h3` "Configuración") | "Comisión: `<bps>` bps (`<formatBps>`)", "Apuesta mínima: `<SUI>` SUI", "Apuesta máxima: `<SUI>` SUI", "Comisiones acumuladas: `<SUI>` SUI", "Versión de la House: `<n>`"; botón "Actualizar" |
| Comisión (`h3` "Comisión") | etiqueta "Nueva comisión (bps)"; en vivo " = `<formatBps>`"; aviso "Las partidas ya creadas conservan la comisión con que se crearon; la nueva se aplica a las que se creen desde ahora."; resumen "De `<x>` bps (`<x %>`) a `<y>` bps (`<y %>`)"; botón "Actualizar comisión" |
| Errores de comisión | `empty` "Escribe la comisión en bps"; `invalid` "Solo números enteros (bps), sin signo, decimales ni espacios"; `too_high` "El máximo es 1000 bps (10 %)"; `unchanged` "Es la comisión actual" |
| Límites (`h3` "Límites de apuesta") | etiquetas "Mínimo (SUI)" y "Máximo (SUI)"; aviso "Los límites solo se aplican al crear partidas: las pendientes no cambian."; resumen "De `<min>`–`<max>` SUI a `<min′>`–`<max′>` SUI"; botón "Actualizar límites" |
| Errores de límites (por campo) | `empty` "Escribe un monto"; `negative` "El monto no puede ser negativo"; `invalid` "Monto inválido: solo números y punto decimal, sin espacios ni separador de miles"; `too_many_decimals` "Máximo 9 decimales"; `too_large` "Monto demasiado grande"; `zero_min` "El mínimo tiene que ser mayor que 0"; par: `min_above_max` "El mínimo no puede superar el máximo"; `unchanged` "Son los límites actuales" |
| Retiro (`h3` "Comisiones") | botón "Retirar `<SUI>` SUI a tu cuenta"; con 0, deshabilitado y "No hay comisiones para retirar." (= `ABORT_MESSAGES.house[2]`); nota "Se retira todo lo acumulado al momento de ejecutarse; el monto real sale de la transacción." |
| Éxito de comisión | "Comisión actualizada: de `<x>` bps (`<x %>`) a `<y>` bps (`<y %>`). Las partidas ya creadas conservan la suya." |
| Éxito de límites | "Límites actualizados: mínimo `<min′>` SUI, máximo `<max′>` SUI (antes `<min>`–`<max>` SUI)." |
| Éxito del retiro | "Retiraste `<amount>` SUI de comisiones a tu cuenta." |
| Éxito sin evento (`value: null`) | "Comisión actualizada; no se pudo leer el evento: la configuración de arriba muestra el valor vigente" / "Límites actualizados; no se pudo leer el evento: la configuración de arriba muestra el valor vigente" / "Comisiones retiradas; no se pudo leer el monto: revisa la transacción" |
| Cap perdido (`precheck`) | `HOUSE_CAP_LOST_MESSAGE` = "Esta cuenta ya no tiene el HouseCap: no puede administrar la House." |

**Selectores estables** (tests y smoke): `section.house-admin`; `.house-config`; `[data-house-action="fee"]`,
`[data-house-action="limits"]`, `[data-house-action="withdraw"]` (un bloque por acción, con su formulario y su
`TransactionStatus`); `.house-no-permission`. Los de #11/#12 no cambian: `.tx-status`, `.account-badge` (con la dirección
completa en el `title`).

## 2. Hechos verificados (plan v1.1, "Verificación"; validados por el MAYOR)

Rutas relativas a `<repo>/node_modules/`; `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
`@mysten/dapp-kit-react` 2.1.41.

| # | Hecho | Evidencia |
|---|---|---|
| V-1 | `SuiGrpcClient.listOwnedObjects({ owner, type?, limit?, cursor?, include? })` ⇒ `{ objects, hasNextPage, cursor }`; `readMask` con `owner`, `object_type`, `digest`, `version`, `object_id` (+ `contents` con `include.content`); el `type` con dirección `0x…` no pasa por MVR | `@mysten/sui/dist/grpc/core.mjs:101-140`; `dist/client/types.d.mts:89-122`; `dist/client/mvr.mjs:100-102` |
| V-2 | El nodo puede devolver menos que `page_size`, también una página vacía con cursor | `dist/grpc/proto/sui/rpc/v2/state_service.d.mts:541`; sonda pública: 20 objetos con `hasNextPage: true` |
| V-3 | Testnet (sonda pública, sin claves): filtro por tipo exacto (forma larga o corta); tipo inexistente ⇒ `[]` y `hasNextPage: false`, sin error; tipo mal formado ⇒ `INVALID_ARGUMENT` | Plan v1.1, "Verificación contra el SDK" |
| V-4 | `type` del objeto llega sin normalizar; `isExactType` normaliza | `dist/grpc/core.mjs:127`; `app/src/sui/game.ts:70-76` |
| V-5 | `mapOwner` puede devolver `null` | `dist/grpc/core.mjs:599` |
| V-6 | `getObject` lanza el `ObjectError` del lote (con `reason`) | `dist/client/core.mjs:24-33`; patrón en `app/src/sui/gameDetail.ts:25` |
| V-7 | `run` ya captura `sender` (`useExecuteTransaction.ts:116`) y llama a `build` dos veces (`:140`, `:162`); el `precheck` se atrapa con `isTransientReadError ? PREFLIGHT_NETWORK_MESSAGE : PREPARE_FAILED_PREFIX` (`:131-133`) | Código |
| V-8 | `useTxTarget.ts:60-62` convierte en `create` todo objetivo que no es `game` | Código |
| V-9 | `transactionInvalidations` y `adoptedStatus` son `switch` exhaustivos con tipo de retorno; `toTxGameEntry` (`txSession.ts:194-198`) supone `gameId` en toda acción que no es `create` | Código |

## 3. Reglas transversales (todos los tasks)

- **Node 26** por ruta absoluta en cada llamada (prefijo de §0). Todo desde la raíz del worktree (`<repo>`).
- **Gate de la app en cada task** (§0, output completo, con archivos y tests de Vitest y el tamaño del build), y
  `git status --porcelain --untracked-files=all` con solo los archivos del task. En TASK-1, además, el job `contracts`.
- **Sin dependencias nuevas** (SEG-8): `package.json`, `app/package.json` y `package-lock.json` sin delta.
- **Capas** (`app/eslint.config.js`, sin tocarlo): `sui/` solo `@mysten/sui*`/`@mysten/dapp-kit-core*` y sin React;
  `hooks/` `@mysten/sui*`, la raíz de `@mysten/dapp-kit-react` y `@tanstack/react-query`; componentes y páginas, de
  `@mysten/*` solo `@mysten/dapp-kit-react/ui` (pueden importar funciones puras de `sui/`).
- **Lint en 0 sin `eslint-disable`.** Sin `useRef` ni `useEffect` en la máquina, los hooks ni el panel (PROY-14). Los
  campos de los formularios con `useState`.
- **Localnet aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh`, `ids.env`, `smoke_guard`, publicación con
  el script en la **variante B** y cierre del paso 7. **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el
  prefijo del paso 3, tampoco los de solo lectura; siempre `suic`/`"$SUI"`; `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. En este
  documento `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&` y se
  **escribe** delante de cada `suic`. Una sola localnet (puerto 9000). Para `node`/`npm`/`vite`, `<SMOKE_DIR>/app.env`
  (con la guarda de §Smoke); nunca `env.sh`, `app.env` y `chrome.env` en la misma llamada. Nunca `new-address`. Los
  scripts y sondas en Node solo hablan con `http://127.0.0.1:9000` por gRPC y no leen `<SMOKE_DIR>/net`.
- **Testnet:** nada con claves; este ciclo no necesita lecturas de testnet.
- **Placeholders** en todo lo commiteado y en el output pegado (`FLUJO_AGENTES.md` §2): `<repo>`, `<HOME real>`,
  `<SMOKE_DIR>`, `<scratchpad>`. Direcciones e IDs abreviados (`0x1234…abcd`) o por rol en reportes; digests completos sí.
- **Antes de cada reporte:** grep del `git diff` y de los archivos nuevos por claves (`suiprivkey`, `mnemonic`,
  `BEGIN .*KEY`) y rutas personales: vacío. El grep de hex de 40-64 solo puede dar IDs ficticios de tests o los de la
  fixture de localnet (cuentas efímeras); se declaran.
- Montos en `bigint` (PROY-12); bps como `number` entero (`u16`); textos de la UI en español; tests en inglés con nombre =
  comportamiento (LIM-11); JSDoc con el porqué en lo exportado (LIM-7); sin `console`.

## 4. Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta (nuevo o cambiado) |
|---|---|
| `app/scripts/capture-house-fixtures.mjs` (nuevo, TASK-1) | Script; escribe `contracts/fixtures/house-admin.localnet.json` con `_meta`, `ids` (`packageId`, `originalPackageId`, `houseId`, `houseCapId`), `houseCapListing` (`admin`, `nonOwner`, `adminLimit1`: respuestas de `listOwnedObjects` con `objects`, `hasNextPage`, `cursor`), `houseCapObject` (el `getObject` del cap con `content`), `simulationErrors` (`feeTooHigh`, `limitsZeroMin`, `limitsMinAboveMax`, `withdrawNoFees`: `{ sender: <rol>, message, executionError }`; `nonOwnerPreflight`: `{ sender: 'A', errorName, message, executionError?, causeCode? }`), `executed` (`updateFeeRate`, `updateBetLimits`, `withdrawFees`: `getTransaction` con efectos, eventos y `objectTypes`, sin `sender` ni `signatures`) y `house` (`content` en base64, después del retiro) |
| `sui/readErrors.ts` (TASK-2) | `ReadDataReason` suma `'incomplete'`; `readErrorMessage` con el texto propio de §1 para `ReadDataError` con `reason === 'incomplete'` (antes del genérico) |
| `sui/houseCap.ts` (nuevo, TASK-2) | `HOUSE_CAP_MAX_PAGES = 3`; `HOUSE_CAP_LOST_MESSAGE`; `type HouseCap = { id: string; owner: string }`; `houseCapType(originalPackageId): string`; `type HouseCapObjectInput = Pick<SuiClientTypes.Object<{ content: true }>, 'objectId' \| 'type' \| 'owner' \| 'content'>`; `parseHouseCapObject(object, { originalPackageId, owner }): HouseCap` (lanza `ReadDataError`); `fetchHouseCap(client: Pick<SuiGrpcClient, 'listOwnedObjects'>, { owner, originalPackageId, signal? }): Promise<HouseCap \| null>` (H-1); `checkHouseCapOwnership(client: Pick<SuiGrpcClient, 'getObject'>, { capId, owner, originalPackageId, signal? }): Promise<'owned' \| 'not_owned'>` (H-3) |
| `sui/houseAdmin.ts` (nuevo, TASK-2) | `HOUSE_MAX_FEE_BPS = 1000`; `type FeeRateError = 'empty' \| 'invalid' \| 'too_high' \| 'unchanged'`; `validateFeeRate(text: string, currentBps: number): { ok: true; bps: number } \| { ok: false; error: FeeRateError }`; `type BetLimitFieldError = 'empty' \| 'negative' \| 'invalid' \| 'too_many_decimals' \| 'too_large' \| 'zero_min'`; `type BetLimitsValidation = { ok: true; minBet: bigint; maxBet: bigint } \| { ok: false; errors: { min?: BetLimitFieldError; max?: BetLimitFieldError; pair?: 'min_above_max' \| 'unchanged' } }`; `validateBetLimits(minText, maxText, current: { minBet: bigint; maxBet: bigint }): BetLimitsValidation`; `canWithdraw(house: Pick<House, 'feesCollected'>): boolean`; `type HouseEventName = 'FeeRateUpdated' \| 'BetLimitsUpdated' \| 'FeesWithdrawn'`; `houseEventType(originalPackageId, name): string`; `type FeeRateUpdatedEvent = { houseId: string; oldFeeRate: number; newFeeRate: number }`; `type BetLimitsUpdatedEvent = { houseId: string; oldMinBet: bigint; oldMaxBet: bigint; newMinBet: bigint; newMaxBet: bigint }`; `parseFeeRateUpdated(result, { originalPackageId, houseId }): FeeRateUpdatedEvent \| null`; `parseBetLimitsUpdated(result, mismos): BetLimitsUpdatedEvent \| null`; `parseFeesWithdrawn(result, mismos): bigint \| null` (`result: SuiClientTypes.TransactionResult<{ events: true }>`) |
| `sui/transactions/house.ts` (nuevo, TASK-2) | `buildUpdateFeeRateTx({ packageId, houseId, capId, feeRate: number }): Transaction`; `buildUpdateBetLimitsTx({ packageId, houseId, capId, minBet: bigint, maxBet: bigint }): Transaction`; `buildWithdrawFeesTx({ packageId, houseId, capId, recipient: string }): Transaction` |
| `hooks/txSession.ts` (TASK-3) | `TxAction` suma `{ kind: 'updateFeeRate' } \| { kind: 'updateBetLimits' } \| { kind: 'withdrawFees' }`; `TxTarget` suma `{ kind: 'house' }` y `type HouseTarget = Extract<TxTarget, { kind: 'house' }>`; `ExecuteInput<T>` = `{ action; build: (sender: string) => Transaction; precheck?: (signal: AbortSignal, sender: string) => Promise<TxPrecheckStop \| null>; interpret }`; `TxValueByAction` (H-4) suma `updateFeeRate: FeeRateUpdatedEvent \| null`, `updateBetLimits: BetLimitsUpdatedEvent \| null`, `withdrawFees: bigint \| null`; `toTxGameEntry` con `gameId` solo para `cancel`/`reject`/`accept` |
| `hooks/queryKeys.ts` (TASK-3) | `houseCap(network, originalPackageId, address: string)` = `['sui', red, 'houseCap', pkg, normalizeSuiAddress(address)]`; `txTarget` con `house` ⇒ `[...txAccount, 'house']` (`switch` exhaustivo) |
| `hooks/txInvalidation.ts` (TASK-3) | Filas de H-5 |
| `hooks/useTxTarget.ts` (TASK-3) | Sobrecarga `useTxTarget(target: HouseTarget): TxTargetState<HouseTarget>`; normalización con `switch` exhaustivo |
| `hooks/useExecuteTransaction.ts` (TASK-3) | Misma API pública; `run` pasa `sender` a `precheck` y a las dos llamadas de `build` |
| `components/GameActions.tsx` (TASK-3) | `adoptedStatus`: `updateFeeRate`/`updateBetLimits`/`withdrawFees` ⇒ `null` |
| `hooks/useHouseCap.ts` (nuevo, TASK-4) | `type CapKnowledge`; `useHouseCap(): { kind: 'no_account' } \| { kind: 'account'; address: string; cap: CapKnowledge; status: ReadStatus; isFetching: boolean; refetch: () => void }` |
| `hooks/houseAdminTx.ts` (nuevo, TASK-4) | `houseCapPrecheck({ client, network, originalPackageId, capId }): (signal: AbortSignal, sender: string) => Promise<TxPrecheckStop \| null>` (H-3, común a las tres acciones, LIM-5) |
| `hooks/useUpdateFeeRate.ts` / `useUpdateBetLimits.ts` / `useWithdrawFees.ts` (nuevos, TASK-4) | `useUpdateFeeRate(view: TxView<HouseTarget>): UseExecuteTransaction<FeeRateUpdatedEvent \| null> & { update: (input: { capId: string; feeRate: number }) => void }`; `useUpdateBetLimits(view): UseExecuteTransaction<BetLimitsUpdatedEvent \| null> & { update: (input: { capId: string; minBet: bigint; maxBet: bigint }) => void }`; `useWithdrawFees(view): UseExecuteTransaction<bigint \| null> & { withdraw: (input: { capId: string }) => void }` |
| `test/txHarness.tsx` (TASK-4) | suma `useHouseView()`: `useTxTarget({ kind: 'house' })` y las tres acciones con la misma `view` |
| `components/HouseAdminPanel.tsx` (nuevo, TASK-5) | `HouseAdminPanel({ capId }: { capId: string })` |
| `pages/HouseAdminPage.tsx` (nuevo, TASK-5) | `HouseAdminPage` (ruta `admin`): sin cuenta, el texto; con cuenta, `<HouseAdminView key={address} />` |
| `components/Header.tsx` (TASK-5) | Enlace "Administrar House" a `/admin` solo con `known` + cap |

---

## TASK-1: sondas en localnet aislada y fixture real de la House — área: app/scripts + contracts/fixtures

### 1. Historia de usuario del task

**Como** DEV del ciclo, **quiero** medir en la localnet del smoke cómo responde el nodo a la detección del cap, a los
aborts de `house` y a una preflight sin cap, y guardar esas respuestas reales en una fixture, **para** que la capa pura y
los hooks se prueben contra datos del nodo y no contra suposiciones.

### 2. Contexto

- Modelo del script: `app/scripts/capture-tx-fixtures.mjs` (guarda primero, import dinámico del SDK, `plain`, roles
  derivados on-chain, `simulationError`, `executedFixture`) y la guarda compartida `app/scripts/localnet-guard.mjs`
  (`assertLocalnetUrl`, `assertDeployment`), que no cambia.
- Contrato: `contracts/sources/house.move:98-147` (firmas, orden de asserts, eventos).
- **No** se tocan `capture-tx-fixtures.mjs` ni `game-tx.localnet.json`: el retiro dejaría en 0 la House de la que
  dependen los tests de #12.

### 3. Qué implementar

1. Gate completo de §0 (app + contracts) **antes** de nada: "verificación del baseline".
2. Localnet aislada (`agents.md` §3 pasos 2-5), génesis nueva, publicación **variante B**. Cuentas de la génesis `ADMIN`
   (publica), `A`, `B` en `ids.env` (tres distintas). `PKG`, `HOUSE`, `HOUSE_CAP` a `ids.env` desde
   `contracts/deployments/localnet.json` (`packageId`, `houseId`, `houseCapId`) con `sed`/`grep`, sin Node en esa llamada.
3. **Transacciones por CLI, en este orden** (S-4; con el cap en `ADMIN` todo el tiempo):
   1. `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$HOUSE_CAP" 250`
   2. `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_bet_limits --args "$HOUSE" "$HOUSE_CAP" 2000000 10000000000`
   3. `PRE act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none` (partida `G`, ID a `ids.env`)
   4. `PRE act_as "$B" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::accept_game" @$G @$HOUSE c.0 @0x8` (comisión 10000000)
   5. `PRE act_as "$ADMIN" && suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$HOUSE_CAP --assign fees --transfer-objects "[fees]" @$ADMIN`
   - Si la CLI exige `--gas-budget` o cambia la sintaxis, se declara. Si hace falta medir el camino de la wallet, el de
     S-1 bis de #11 (`suic ptb … --serialize-signed-transaction` y ejecución de esos bytes por gRPC desde Node), firmado
     por la CLI bajo `PRE`.
4. **`capture-house-fixtures.mjs`** (con `app.env`; `node app/scripts/capture-house-fixtures.mjs` desde `<repo>`), con
   la guarda como primera instrucción (código 2 ante otra `--url` antes de importar el SDK). **Solo lee y simula**:
   - roles on-chain (nunca escritos): `ADMIN` = dueño del cap (`getObject(houseCapId)`), `A` = `creator` del único
     `GameCreated`, `B` = `acceptor` del único `GameResolved`; aborta si no son tres cuentas distintas o si el cap no está
     en `ADMIN` ("correr los pasos del handoff");
   - **S-1:** `listOwnedObjects` por dueño y tipo: `admin` (`ADMIN`, `limit: 2`, `content`), `nonOwner` (`A`) y
     `adminLimit1` (`ADMIN`, `limit: 1`: forma real de `hasNextPage`/`cursor`);
   - **S-4 (lectura):** las tres transacciones de admin encontradas por eventos del paquete (`listEvents` por tipo
     `<pkg>::house::FeeRateUpdated`, `BetLimitsUpdated`, `FeesWithdrawn`; aborta si falta alguna o hay más de una) y leídas
     con `getTransaction({ include: { effects: true, events: true, objectTypes: true } })`, sin `sender` ni `signatures`;
   - **S-3:** simulaciones sin firmar (`setSender(ADMIN)` + `build({ client })`) de `update_fee_rate(1001)` (`house`/0),
     `update_bet_limits(0, 10000000000)` y `(5000000, 1000000)` (`house`/1) y `withdraw_fees` + transferencia con la House
     en 0 (`house`/2); exige el `MoveAbort` esperado como `simulationError`;
   - **S-5:** la misma `update_fee_rate(300)` con `setSender(A)` (sin el cap): guarda el error tal cual llega
     (`errorName`, `message`, `executionError` si existe, código gRPC del `cause` si existe), sin exigir un `MoveAbort`;
   - `houseCapObject` (`getObject(houseCapId)` con `content`) y `house` (`getObject(houseId)` con `content`);
   - escribe `contracts/fixtures/house-admin.localnet.json` (`JSON.stringify(…, null, 2)` + salto final) con
     `_meta.capturedAt`, la versión del SDK y la explicación de roles y orden.
5. **Segunda corrida** del script: el archivo tiene que quedar idéntico salvo `_meta.capturedAt` (pegar el `diff`).
6. **S-6 (sonda en `<scratchpad>`, fuera de la fixture):** el budget que elige el nodo en la preflight de cada acción
   (`build({ client })` con `setSender(ADMIN)` de `update_fee_rate(260)`, de `update_bet_limits` con otros valores y de
   `withdraw_fees`, que aquí abortará: anotar solo las dos primeras).
7. **S-2 (sonda en `<scratchpad>`, al final, fuera de la fixture):** hasta 5 corridas de:
   `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function transfer_house_cap --args "$HOUSE_CAP" "$A"`;
   desde Node, `waitForTransaction(digest)` y sondeo cada 100 ms de `listOwnedObjects(A, tipo)` y de `getObject(cap)`
   hasta ver a `A` como dueño, y de `listOwnedObjects(ADMIN, tipo)` hasta verlo vacío (ms de cada uno). Entre corridas,
   la devolución `PRE act_as "$A" && suic call … transfer_house_cap --args "$HOUSE_CAP" "$ADMIN"` (declarada: cuenta de la
   génesis, firmada por la CLI con `PRE`).
8. Cierre: paso 7 de `agents.md` §3 más las verificaciones del paso 20 del smoke (puertos libres, `kill -0` en otra
   llamada antes de `rm -rf <SMOKE_DIR>`, `~/.sui/` igual a la línea base, sin `contracts/deployments/`).

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/scripts/capture-house-fixtures.mjs`, `contracts/fixtures/house-admin.localnet.json`. Sondas S-2 y S-6
  solo en `<scratchpad>`.
- **NO tocar:** `app/scripts/localnet-guard.mjs`, `app/scripts/capture-tx-fixtures.mjs`,
  `app/scripts/capture-read-fixtures.mjs`, `contracts/fixtures/game-*.localnet.json`, todo `app/src/`, `contracts/sources/`,
  `contracts/scripts/`, `contracts/Move.lock`.

### 5. Tests obligatorios

No hay tests nuevos (la fixture la consumen TASK-2 y TASK-4; el script no entra a ningún gate). Gate completo antes y al
final, sin delta.

### 6. Smoke

No aplica (son sondas). El cierre sigue el paso 20 del smoke.

### 7. Criterios de aceptación

- T1-1: baseline de §0 reproducido (o la diferencia reportada y el task detenido).
- T1-2: el script sale con código 2 ante `--url http://127.0.0.1:9001` sin pedir nada (pegar la salida).
- T1-3 (S-1): `admin` con 1 objeto del tipo exacto, `AddressOwner`, `content` presente; `nonOwner` con `[]`; `adminLimit1`
  con su `hasNextPage` y `cursor` reales (anotados).
- T1-4 (S-3): cuatro `SimulationError` con `MoveAbort` `house`/0, 1, 1, 2.
- T1-5 (S-4): las tres ejecutadas con sus eventos (`FeeRateUpdated` 0 → 250; `BetLimitsUpdated` 1000000/50000000000 →
  2000000/10000000000; `FeesWithdrawn` 10000000) y `house` con `fees_collected` 0.
- T1-6 (S-5): el error real de una preflight sin el cap, con su clase, mensaje y, si existe, `executionError` o código.
- T1-7: dos corridas idénticas salvo `capturedAt`.
- T1-8 (S-6): budgets de las dos acciones de configuración.
- T1-9 (S-2): ms hasta ver al dueño nuevo por `listOwnedObjects` y por `getObject`, en cada corrida.
- T1-10: cierre limpio: `kill -0` falla en `sui`; `<SMOKE_DIR>` borrado; `stat`/`ls` de `<HOME real>/.sui/sui_config/`
  idénticos; `git status --porcelain` solo con los dos archivos nuevos; `Move.lock` sin delta; ni `Published.toml`, ni
  `Pub.*.toml`, ni `contracts/deployments/`.
- **STOP al MID** si S-1 muestra que el fullnode local no responde `listOwnedObjects` por tipo (habría que detectar por
  `getObject(houseCapId)` y sumar `houseCapId` a `config.ts`), o si S-3 da otro abort que el esperado.

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5: S-1..S-6 en "Verificación manual", y la sintaxis de CLI que
funcionó (la reutiliza el smoke). Sin commits ni pushes.

---

## TASK-2: capa pura `sui/` de la House — área: app (`sui/`)

### 1. Historia de usuario del task

**Como** DEV, **quiero** la detección del cap, la validación, los builders y la lectura de los eventos de admin como
funciones puras de `sui/`, **para** que los hooks solo las orquesten y cada regla (certeza de la detección, espejo del
contrato, PTB del retiro) tenga su test contra datos reales.

### 2. Contexto

- `app/src/sui/house.ts` (esquema BCS, `houseType`, `parseHouseObject`, `fetchHouse`): modelo de tipo exacto + BCS
  canónico con `isExactType`/`parseExactBcs` (`sui/game.ts:51-76`).
- `app/src/sui/gameTx.ts` (`rawEvents`, `parseOrNull`, "único evento de esta partida"): modelo de los parsers de eventos.
- `app/src/sui/gameDetail.ts:20-33`: `ObjectError` con `notFound`/`deleted` frente a lo demás.
- `app/src/sui/transactions/game.ts`: `assertObjectId`, `moveTarget`, builders que lanzan ante datos inválidos.
- `app/src/sui/createGame.ts:32-60` y `sui/format.ts:10-38`: validación de montos con `parseSuiToMist` y sus motivos.
- `app/src/sui/readErrors.ts:5, 87-102`: `ReadDataReason` y `readErrorMessage`.
- Fixture de TASK-1: `contracts/fixtures/house-admin.localnet.json`.

### 3. Qué implementar

1. **`readErrors.ts`** (MINOR-1 de la ronda corta): `'incomplete'` en `ReadDataReason`; en `readErrorMessage`, antes del
   genérico de `ReadDataError`, `reason === 'incomplete'` ⇒ "El nodo no completó la búsqueda del HouseCap; reintenta".
   `readPolicy.ts` no cambia (no es transitorio).
2. **`houseCap.ts`** (§4):
   - `houseCapType` = `normalizeStructTag(\`${pkg}::house::HouseCap\`)`;
   - `HouseCapBcs = bcs.struct('HouseCap', { id: bcs.Address })`;
   - `parseHouseCapObject`: tipo exacto; `owner` no `null` y `$kind === 'AddressOwner'` con `sameAddress(…, owner)`;
     `parseExactBcs`; `id` = `objectId` normalizado. Si no: `ReadDataError` (`wrong_type`, `invariant` o `malformed`);
   - `fetchHouseCap` (H-1);
   - `checkHouseCapOwnership` (H-3): `withReadTimeout` + `getObject({ objectId: capId, include: { content: false } })`
     (alcanza con `type` y `owner`); `ObjectError` con `notFound`/`deleted` ⇒ `'not_owned'`; otro error ⇒ se relanza.
3. **`houseAdmin.ts`** (§4):
   - `validateFeeRate`: `''` ⇒ `empty`; no `/^\d+$/` ⇒ `invalid` (espacios, signo, punto, exponente); `BigInt(text) >
     1000n` ⇒ `too_high`; igual a `currentBps` ⇒ `unchanged`; si no, `{ ok: true, bps: Number(text) }`;
   - `validateBetLimits`: cada campo con `parseSuiToMist` (sin `trim`; sus motivos tal cual, `negative` incluido); `min`
     = 0 ⇒ `zero_min`; con los dos válidos: `min > max` ⇒ `pair: 'min_above_max'`, iguales a `current` ⇒ `pair:
     'unchanged'`;
   - `canWithdraw` = `feesCollected > 0n`;
   - esquemas BCS de los tres eventos (orden de `house.move:48-67`; `ID` = `bcs.Address`), `houseEventType`, y los tres
     parsers: el **único** evento del tipo exacto con `house_id` = `houseId` (`sameAddress`); cero, más de uno o ilegible ⇒
     `null`.
4. **`transactions/house.ts`** (§4): `assertObjectId` para `packageId`, `houseId`, `capId`; `feeRate` entero en
   `0..65535` (rango del `u16`, para poder probar el abort real con 1001); `minBet`/`maxBet` en `0..U64_MAX`; `recipient`
   con `isValidSuiAddress`. Retiro: `const [coin] = tx.moveCall({ target: \`${packageId}::house::withdraw_fees\`,
   arguments: [tx.object(houseId), tx.object(capId)] })` y `tx.transferObjects([coin], tx.pure.address(recipient))`. Sin
   `sender` ni gas.

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/src/sui/houseCap.ts`, `houseCap.test.ts`, `houseAdmin.ts`, `houseAdmin.test.ts`,
  `app/src/sui/transactions/house.ts`, `house.test.ts` (en `transactions/`).
- **Cambiados:** `app/src/sui/readErrors.ts`, `readErrors.test.ts`; `app/src/sui/errors.test.ts` (casos con la fixture
  nueva). `errors.ts` **no** cambia salvo que la fixture muestre un formato que `findMoveAbort` no reconoce (entonces STOP
  al MID).
- **NO tocar:** `house.ts`, `game.ts`, `gameTx.ts`, `hooks/`, `components/`, `pages/`.

### 5. Tests obligatorios

- T2-1: `ReadDataError('incomplete', …).reason === 'incomplete'`; `readErrorMessage` da el texto de §1.
- T2-2: `isTransientReadError(new ReadDataError('incomplete', …))` es `false`.
- T2-3: `fetchHouseCap` con `houseCapListing.admin` de la fixture ⇒ el cap (`id` = `houseCapId`, `owner` = `ADMIN`); con
  `nonOwner` ⇒ `null`; el pedido lleva `type` = `houseCapType(pkg)` normalizado, `limit: 2`, `include.content: true`.
- T2-4 (H-1): `{ [], hasNextPage: true, cursor: 'c1' }` y luego `{ [], false }` ⇒ `null`, y el segundo pedido usa `cursor:
  'c1'`.
- T2-5 (H-1): tres páginas `{ [], true }` ⇒ `ReadDataError('incomplete')`; exactamente 3 pedidos; **nunca** `null`.
- T2-6 (H-1): `{ [cap], true }` y luego `{ [otroCap], false }` ⇒ `ReadDataError('invariant')`; `{ [cap1, cap2], false }`
  ⇒ `invariant` sin segundo pedido.
- T2-7 (H-1): `{ [cap], true }` y luego `{ [], false }` ⇒ el cap; `{ [cap], true }` × 3 ⇒ `incomplete`; `{ [], true,
  cursor: null }` ⇒ `incomplete`.
- T2-8: `parseHouseCapObject` rechaza: tipo de otro paquete, `HouseCap` con dirección corta mal formada en el tipo,
  `owner` `null`, `Shared`, `AddressOwner` de otra dirección, bytes con un byte de más, `id` ≠ `objectId`.
- T2-9: `validateFeeRate`: `''`, `' 250'`, `'250 '`, `'-1'`, `'2.5'`, `'1e3'`, `'1001'`, `'99999999999999999999'`
  (`too_high`, sin perder precisión), `'1000'` (ok), `'0'` (ok si la actual no es 0), `'00250'` (ok, 250), igual a la
  actual ⇒ `unchanged`.
- T2-10: `validateBetLimits`: cada motivo de `parseSuiToMist` por campo (incluido `negative`), `zero_min`, `min ==
  max` (ok), `min > max`, iguales a los actuales (`unchanged`), `U64_MAX` en MIST (ok) y uno más (`too_large`).
- T2-11: `canWithdraw` con 0n y 1n.
- T2-12 (H-3): `checkHouseCapOwnership` con `houseCapObject` y `owner` = `ADMIN` ⇒ `'owned'`; otro dueño, `owner` `null`,
  tipo distinto ⇒ `'not_owned'`; `ObjectError` `notFound` y `deleted` ⇒ `'not_owned'`; `ObjectError` `unknown`, un
  `RpcError` `UNAVAILABLE` y el corte de 10 s ⇒ se relanzan (el corte como `ReadTimeoutError`).
- T2-13: builders de comisión y límites: target `<packageId>::house::update_fee_rate`/`update_bet_limits`, argumentos en
  orden (`house`, `cap`, `u16` / `u64`, `u64`) leídos de `tx.getData()`; lanzan con IDs inválidos, `feeRate` −1, 1.5 o
  65536, montos negativos o > `U64_MAX`.
- T2-14 (MINOR-6 del plan): `buildWithdrawFeesTx` tiene **exactamente 2** comandos: `MoveCall
  <packageId>::house::withdraw_fees` con `[house, cap]` y `TransferObjects` cuyos objetos son `[{ Result: 0 }]` (o el
  `NestedResult` equivalente del SDK) y cuya dirección es el input puro con `recipient`; lanza con `recipient` inválido.
- T2-15: parsers con `executed` de la fixture: `FeeRateUpdated` 0 → 250, `BetLimitsUpdated` con los cuatro montos,
  `FeesWithdrawn` 10000000; con otra `houseId`, sin evento, con dos eventos o con bytes rotos ⇒ `null`.
- T2-16: `transactionErrorMessage` con los cuatro `simulationErrors` de la fixture ⇒ el texto de `ABORT_MESSAGES.house[0|1|2]`
  con el sufijo `(código house/<n>)`.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- T2-1..T2-16 en verde; gate de la app completo; `npm test` = 915 + los nuevos, sin tests viejos modificados salvo los
  casos sumados a `readErrors.test.ts` y `errors.test.ts`.
- Grep de capas: `grep -rn "react\|hooks/\|components/" app/src/sui/houseCap.ts app/src/sui/houseAdmin.ts
  app/src/sui/transactions/house.ts` vacío.

### 8. Al terminar

Reporte §5. Sin commits ni pushes.

---

## TASK-3: máquina de transacciones para el objetivo House (NIT-3) — área: app (`hooks/`)

### 1. Historia de usuario del task

**Como** DEV, **quiero** que la máquina común reconozca las tres acciones de la House como propias, con su objetivo, su
clave y su invalidación, y que una acción futura que falte rompa el `typecheck`, **para** que el panel no se vea a sí
mismo como "en curso" (NIT-3 de #12) y nada de las partidas cambie.

### 2. Contexto

- `app/src/hooks/txSession.ts:20-24` (`TxAction`), `:50-60` (`ExecuteInput`, `TxTarget`), `:99-109` (`TxValueByAction`,
  `AdoptedTx`), `:128-129` (`ACTION_KINDS`), `:194-198` (`toTxGameEntry`), `:272` (cast a `AdoptedTx`).
- `app/src/hooks/useTxTarget.ts:49-65` (sobrecargas y normalización, V-8).
- `app/src/hooks/queryKeys.ts:50-54` (`txTarget`), `txInvalidation.ts:17-36`.
- `app/src/hooks/useExecuteTransaction.ts:116-162` (`sender`, `precheck`, dos `build`).
- `app/src/components/GameActions.tsx:38-49` (`adoptedStatus`).

### 3. Qué implementar

1. `txSession.ts`: `TxAction`, `TxTarget`/`HouseTarget`, `ExecuteInput` (§4); `TX_ACTION_KINDS` + `ACTION_KINDS` y
   `TxValueMap` + `TxValueByAction` (H-4); `toTxGameEntry` con `switch` sobre `action.kind` (`cancel`/`reject`/`accept` ⇒
   `normalizeSuiAddress(action.gameId)`; el resto ⇒ `null`). Importa los tipos de eventos de `../sui/houseAdmin` (solo
   tipos; `txSession.ts` sigue sin importar nada de `./`).
2. `queryKeys.ts`: `houseCap` y `txTarget` con `switch` exhaustivo.
3. `txInvalidation.ts`: filas de H-5 (`case` por acción; sin `default`).
4. `useTxTarget.ts`: sobrecarga y normalización con `switch` exhaustivo sobre `target.kind` (`create` ⇒ `{ kind:
   'create' }`; `game` ⇒ `{ kind: 'game', gameId: normalizeSuiObjectId(…) }`; `house` ⇒ `{ kind: 'house' }`), con
   `useMemo` sobre primitivos (`network`, `address`, `kind`, `gameId` o `null`, `viewId`).
5. `useExecuteTransaction.ts`: `input.precheck(signal, sender)`, `input.build(sender)` en la preflight y en la firma. Nada
   más cambia.
6. `GameActions.tsx`: `adoptedStatus` devuelve `null` en los tres `case` nuevos.

### 4. Archivos a tocar / NO tocar

- **Cambiados:** `app/src/hooks/txSession.ts`, `queryKeys.ts`, `txInvalidation.ts`, `useTxTarget.ts`,
  `useExecuteTransaction.ts`, `app/src/components/GameActions.tsx` y sus tests (`txSession.test.ts`,
  `txInvalidation.test.ts`, `useTxTarget.test.tsx`, `useExecuteTransaction.test.tsx`, y `queryKeys` donde se pruebe).
- **NO tocar:** `sui/` (salvo leer tipos), `useMyGames.ts`, `CreateGameForm.tsx`, las acciones de partidas
  (`useCreateGame`, `useCancelGame`, `useRejectGame`, `useAcceptGame`).

### 5. Tests obligatorios

- T3-1 (H-4): demostración en el reporte (prueba local **no** commiteada): quitar `withdrawFees` de `TX_ACTION_KINDS` y,
  aparte, de `TxValueMap` ⇒ `npm run typecheck -w app` rojo en los dos casos; pegar los dos errores y restaurar.
- T3-2: `txVariablesOf` reconoce `updateFeeRate`, `updateBetLimits` y `withdrawFees`; rechaza `{ kind: 'migrate' }`.
- T3-3 (NIT-3): `deriveTargetState` con una mutación **propia** en curso de `updateFeeRate` sobre el objetivo `house` ⇒
  `inFlightForeign: false`, `notice: null`.
- T3-4: una ajena terminada de `withdrawFees` sobre `house`, empezada después de montar ⇒ `notice: { kind: 'adopted',
  adopted: { action: 'withdrawFees', outcome } }`.
- T3-5: `toTxGameEntry` ⇒ `gameId: null` para las tres acciones; `liveTxGameIds` no incluye nada por ellas.
- T3-6: `transactionInvalidations` de las tres acciones con y sin cuenta: exactamente las listas de H-5, en ese orden y con
  `reset: []`; los casos de `create`/`cancel`/`reject`/`accept` sin cambios (sus tests viejos pasan sin tocarlos).
- T3-7: `queryKeys.houseCap` normaliza la dirección; `queryKeys.txTarget(…, { kind: 'house' })` termina en `'house'`.
- T3-8 (MINOR-3 del plan): `useTxTarget({ kind: 'house' }).view.key` termina en `'house'` y su `targetHash` es distinto
  del de `useTxTarget({ kind: 'create' })` con la misma cuenta.
- T3-9: con una mutación `updateFeeRate` del objetivo `house` en "sin confirmar", `useTxTarget({ kind: 'create' })` tiene
  `unconfirmed: null` y no la adopta; `useTxTarget({ kind: 'house' })` la ve.
- T3-10: `useExecuteTransaction`: `precheck` y `build` reciben la dirección de la cuenta del clic; si la cuenta conectada
  cambia antes de que la mutación termine, la segunda llamada a `build` (firma) recibe **la del clic**.
- T3-11: las aserciones existentes de `useExecuteTransaction.test.tsx`, `useTxTarget.test.tsx`, `txSession.test.ts` y
  `txInvalidation.test.ts` no cambian (diff de esos archivos solo con casos agregados).

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- T3-1..T3-11 en verde (T3-1 con los dos errores pegados); gate completo.
- `grep -n "from './" app/src/hooks/txSession.ts` vacío.
- La suite completa sin delta en los tests viejos (H-3/H-5/H-6 de #13 y la máquina de #12 intactos).

### 8. Al terminar

Reporte §5. Sin commits ni pushes.

---

## TASK-4: hooks de detección y de acciones — área: app (`hooks/`)

### 1. Historia de usuario del task

**Como** DEV, **quiero** un hook que diga si la cuenta conectada tiene el cap (sin confundir "no sé" con "no") y tres
hooks de acción sobre la máquina común con un `precheck` que no dependa del índice, **para** que el panel solo dibuje y
cada camino (cap perdido, abort, éxito, "sin confirmar") esté probado.

### 2. Contexto

- `app/src/hooks/useHouse.ts` y `useSuiBalance.ts` (lectura con `skipToken`, `deriveReadStatus`).
- `app/src/hooks/useCancelGame.ts` y `useCreateGame.ts` (hook fino con `precheck` e `interpret`).
- `app/src/test/txHarness.tsx` (`useGameView`, `deferred`) y `test/queryHarness.tsx`.

### 3. Qué implementar

1. **`useHouseCap`** (§4, H-2): sin cuenta, `{ kind: 'no_account' }` y `queryFn: skipToken`; con cuenta,
   `useQuery({ queryKey: queryKeys.houseCap(network, originalPackageId, address), queryFn: ({ signal }) =>
   fetchHouseCap(client, { owner: address, originalPackageId, signal }) })`. `cap` = `query.data === undefined ? { kind:
   'unknown' } : { kind: 'known', cap: query.data }`. Política común de lecturas (sin opciones propias).
2. **`houseAdminTx.ts`** (H-3): `houseCapPrecheck({ client, network, originalPackageId, capId })` ⇒ `async (signal,
   sender) => (await checkHouseCapOwnership(client, { capId, owner: sender, originalPackageId, signal })) === 'owned' ?
   null : { stop: HOUSE_CAP_LOST_MESSAGE, invalidate: [queryKeys.houseCap(network, originalPackageId, sender)] }`. Un
   error relanzado lo convierte la máquina (V-7).
3. **`useUpdateFeeRate`**: `tx.execute({ action: { kind: 'updateFeeRate' }, build: () => buildUpdateFeeRateTx({
   packageId, houseId, capId, feeRate }), precheck: houseCapPrecheck(…), interpret: (result) =>
   parseFeeRateUpdated(result, { originalPackageId, houseId }) })`.
4. **`useUpdateBetLimits`**: igual con `buildUpdateBetLimitsTx` y `parseBetLimitsUpdated`.
5. **`useWithdrawFees`**: `build: (sender) => buildWithdrawFeesTx({ packageId, houseId, capId, recipient: sender })`
   (N-2: el destino es la cuenta que firma por construcción), `interpret: (result) => parseFeesWithdrawn(result, …)`.
6. `test/txHarness.tsx`: `useHouseView()`.

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/src/hooks/useHouseCap.ts`, `houseAdminTx.ts`, `useUpdateFeeRate.ts`, `useUpdateBetLimits.ts`,
  `useWithdrawFees.ts` y sus tests (`useHouseCap.test.tsx`, `useHouseAdminActions.test.tsx` o uno por hook).
- **Cambiados:** `app/src/test/txHarness.tsx`.
- **NO tocar:** lo de TASK-3 (salvo un bug encontrado, que se declara), `components/`, `pages/`.

### 5. Tests obligatorios

- T4-1: sin cuenta ⇒ `{ kind: 'no_account' }` y ningún `listOwnedObjects`.
- T4-2: con cuenta, la clave es `queryKeys.houseCap(…)` con la dirección normalizada; con datos de la fixture ⇒ `known`
  con el cap; con `nonOwner` ⇒ `known` con `null`.
- T4-3 (H-2): primera lectura fallida (error no transitorio) ⇒ `cap: { kind: 'unknown' }` y `status.kind === 'error'`;
  nunca `known` con `null`.
- T4-4 (H-2): con un cap ya leído, `refetch` que falla ⇒ `cap` sigue `known` con el cap y `status` en error (o
  `retrying` durante los reintentos).
- T4-5: cambio de cuenta ⇒ otra clave; la nueva arranca `unknown` (sin `placeholderData`).
- T4-6 (H-3): por cada acción, `getObject` con el cap de otra dirección ⇒ `outcome` `failure` con
  `HOUSE_CAP_LOST_MESSAGE`; 0 `SimulateTransaction`, wallet sin abrir; `houseCap` de la cuenta invalidado.
- T4-7 (H-3): `owner` `null`, tipo distinto, `ObjectError` `notFound` y `deleted` ⇒ el mismo corte.
- T4-8 (H-3): el `precheck` no llama a `listOwnedObjects` (mock que lanza si se llama).
- T4-9 (H-3, SUGGESTION-1): `ObjectError` `unknown` no transitorio ⇒ "No se pudo preparar la transacción: …";
  `RpcError` `UNAVAILABLE` ⇒ el texto de red; ninguno dice `HOUSE_CAP_LOST_MESSAGE`.
- T4-10: abort en la preflight con los `simulationErrors` reales (`house`/0 y `house`/2) ⇒ mensaje mapeado, wallet sin
  abrir, invalidaciones de H-5 aplicadas.
- T4-11: éxito con `executed.updateFeeRate` ⇒ `value` = el evento; con `executed.withdrawFees` ⇒ `value` = 10000000n;
  invalidaciones de H-5 en orden, antes de `done`.
- T4-12: "sin confirmar" de una acción (confirmación que vence) ⇒ `useTxTarget({ kind: 'house' }).unconfirmed` no `null` y
  `execute` de **las otras dos** no lanza nada.
- T4-13 (MINOR-6 del plan): en el retiro, el `recipient` del `TransferObjects` de la transacción que va a la wallet es la
  cuenta capturada en el clic, también si la cuenta conectada cambia antes de la firma.
- T4-14: éxito sin evento legible ⇒ `success` con `value: null`.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- T4-1..T4-14 en verde; gate completo; los mocks del cliente suman `listOwnedObjects` y `getObject` del cap sin romper
  los tests viejos.

### 8. Al terminar

Reporte §5. Sin commits ni pushes.

---

## TASK-5: página, panel y enlace del encabezado — área: app (`components/`, `pages/`)

### 1. Historia de usuario del task

**Como** admin de la House, **quiero** entrar desde el encabezado a "Administrar House", ver la configuración y usar las
tres acciones con su estado y su resultado, y **como** jugador sin cap, no ver nada de eso, **para** que el panel sea
útil para quien tiene el cap e invisible para el resto.

### 2. Contexto

- `app/src/pages/MyGamesPage.tsx` (página con `key={address}`), `pages/GameDetailPage.tsx:54-58` (`ReadState` como aviso
  y el contenido debajo), `components/GameActions.tsx` (una `useTxTarget`, un `TransactionStatus` por acción, aviso "en
  curso", adoptado, una alerta "sin confirmar" con "Ya la revisé"), `components/CreateGameForm.tsx` (campos con
  `useState`, errores por campo), `components/ReadState.tsx`, `components/Header.tsx`, `App.tsx:24-34`.

### 3. Qué implementar

1. **Ruta** `{ path: 'admin', element: <HouseAdminPage /> }` antes de `*`.
2. **`HouseAdminPage`**: `section.house-admin` con el `h2`; sin cuenta, el texto; con cuenta, `<HouseAdminView
   key={address} />`. `HouseAdminView` (H-2): `unknown` ⇒ `ReadState` (con `refetch`); `known` + `null` ⇒
   `.house-no-permission` con el texto, "Volver a comprobar" (`refetch`, deshabilitado con `isFetching`) y el `ReadState`
   encima si no está `ready`; `known` + cap ⇒ `ReadState` encima (si no está `ready`) y `<HouseAdminPanel capId=… />`.
3. **`HouseAdminPanel`**: `useHouse()`, `useTxTarget({ kind: 'house' })`, las tres acciones con `target.view`; `busy =
   target.busy || target.unconfirmed !== null`.
   - `.house-config` con los datos (H-2 para la House: `ReadState` solo sin dato, aviso con dato) y "Actualizar"
     (`useHouse().refetch` y `useHouseCap().refetch`);
   - tres bloques `[data-house-action]` con sus campos, errores (§1), resumen y botón: deshabilitado si `busy`, si la
     validación falla o, en el retiro, si `!canWithdraw(house)`; cada uno con su `TransactionStatus` y el texto de éxito de
     §1 desde `outcome.value`;
   - aviso "en curso" (`IN_FLIGHT_TEXT`) si `target.notice?.kind === 'in_flight'`; el adoptado con el texto de su acción;
     una sola alerta "sin confirmar" con "Ya la revisé".
4. **`Header`**: `useHouseCap()`; `<Link to="/admin">Administrar House</Link>` solo con `kind === 'account' && cap.kind
   === 'known' && cap.cap !== null`.

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/src/pages/HouseAdminPage.tsx`, `HouseAdminPage.test.tsx`, `app/src/components/HouseAdminPanel.tsx`,
  `HouseAdminPanel.test.tsx`, y si hace falta un `HouseAdminPanel.machine.test.tsx` con la máquina real (modelo
  `GameActions.machine.test.tsx`).
- **Cambiados:** `app/src/App.tsx`, `App.test.tsx`, `app/src/components/Header.tsx`, `Header.test.tsx` (mockean
  `useHouseCap`), `app/src/index.css` (solo si hace falta estilo mínimo).
- **NO tocar:** `hooks/` y `sui/` (salvo un bug, declarado), `GameActions.tsx` (ya cambió en TASK-3).

### 5. Tests obligatorios

- T5-1: sin cuenta ⇒ el texto, ningún `listOwnedObjects`.
- T5-2: `unknown` cargando ⇒ "Cargando…"; con error ⇒ `readErrorMessage` (también el de `incomplete`) y "Reintentar";
  nunca `.house-no-permission`.
- T5-3: `known` + `null` ⇒ `.house-no-permission`, sin `.house-config` ni `[data-house-action]`; "Volver a comprobar"
  llama a `refetch` y se deshabilita mientras relee.
- T5-4: con cap ⇒ `.house-config` con "250 bps (2.5 %)", "0.002 SUI", "10 SUI", "0.01 SUI" y la versión (datos de la
  fixture o equivalentes).
- T5-5 (H-2, MINOR-1 del plan): con cap en caché y una acción terminada en `success`, una relectura del cap que falla ⇒ el
  panel sigue montado, el `ReadState` aparece encima y el `TransactionStatus` conserva el texto, el digest y el costo.
- T5-6: validaciones de comisión con cada texto de §1, el " = x %" en vivo y el botón deshabilitado; con 250 válido y
  actual 0, el resumen "De 0 bps (0 %) a 250 bps (2.5 %)".
- T5-7: validaciones de límites por campo y de par, con el resumen.
- T5-8: retiro deshabilitado con 0 y el texto "No hay comisiones para retirar."; con 0.01 SUI, "Retirar 0.01 SUI a tu
  cuenta".
- T5-9 (H-6): durante `preflight`/`signing`/`confirming`/`indexing` (con `deferred`), ningún texto de éxito; tras el
  éxito, el texto de §1 con los valores del evento.
- T5-10: con una transacción en curso de la cuenta (de esta vista), los tres botones deshabilitados y **sin**
  `IN_FLIGHT_TEXT`; con una de otra vista, `IN_FLIGHT_TEXT` una vez.
- T5-11: un "sin confirmar" ⇒ una sola alerta con "Ya la revisé" y los tres botones deshabilitados hasta pulsarlo.
- T5-12: adoptado: una mutación ajena terminada de `updateBetLimits` (empezada después de montar) ⇒ su texto de éxito.
- T5-13: `Header`: enlace solo con `known` + cap; no con `no_account`, `unknown` ni `known` + `null`; con cap conocido y
  `status` error, el enlace sigue.
- T5-14: `App`: `#/admin` monta `HouseAdminPage`; `#/nada` sigue en `NotFoundPage`.
- T5-15: capas: `grep -rn "@mysten/" app/src/components/HouseAdminPanel.tsx app/src/pages/HouseAdminPage.tsx` vacío (o
  solo `/ui`).

### 6. Smoke

El del ciclo, después de TASK-6.

### 7. Criterios de aceptación

- T5-1..T5-15 en verde; gate completo; tamaño del build anotado (referencia, sin umbral).
- Textos y selectores de §1 sin cambios (o declarados).

### 8. Al terminar

Reporte §5. Sin commits ni pushes.

---

## TASK-6: documentación — área: docs

### 1. Historia de usuario del task

**Como** owner y como próximo agente, **quiero** que los READMEs, `agents.md` y STATUS describan el panel, su detección,
sus límites y su fixture, **para** operar y mantener el panel sin leer el código (PROY-20).

### 2. Contexto

`app/README.md` (mapas de `sui/`, hooks y componentes; "Transacciones (#11, #12)" con la tabla de invalidación y la
línea "#14 suma aquí las acciones de la House"; "Fixtures de lectura"); `contracts/README.md` (tabla de rutas; "Qué
pasa si se pierde el cap" con la "Nota para #14"; la fila de `version()`; "Lectura desde la app"); `agents.md` §2, §5,
§12; `documents/STATUS.md`.

### 3. Qué implementar

1. `app/README.md`: sección nueva "Panel de la House (#14)" (detección por tipo y regla de certeza; `CapKnowledge` y los
   estados; "Volver a comprobar"; las tres acciones con el aviso de la comisión copiada y el de los límites; `precheck`
   por `getObject`; retiro total a la cuenta que firma; `migrate`/`transfer_house_cap` solo por CLI; el costo de 1
   `ListOwnedObjects` por cuenta en el encabezado); filas nuevas en los mapas; tabla de invalidación con H-5 y la nota de
   `build(sender)`/`precheck(signal, sender)`; fixture nueva y su recaptura en "Fixtures de lectura"; texto
   `ReadDataError('incomplete')`.
2. `contracts/README.md`: fixture nueva en la tabla de rutas y su recaptura (orden de TASK-1) en "Lectura desde la app";
   "Qué pasa si se pierde el cap": la nota para #14 pasa a checklist de quien use `transfer_house_cap` por CLI; fila de
   `version()`: dato del panel (la app no replica `VERSION`); detección por tipo.
3. `agents.md`: §2 (layout de `contracts/fixtures/` y `app/scripts/` con lo nuevo); §5 (fila de `house::MAX_FEE_BPS` ↔
   `HOUSE_MAX_FEE_BPS` en `sui/houseAdmin.ts`, a revisar en todo upgrade que la toque; fila de layouts BCS con el cap y los
   tres eventos de admin); §12 (la nota del cap para el panel suma que la dirección publicadora también tiene el
   `UpgradeCap`, N-3).
4. `documents/STATUS.md`: baseline de cada task del ciclo y fila de #14 "en progreso" (el cierre lo hace el
   housekeeping).

### 4. Archivos a tocar / NO tocar

- **Cambiados:** `app/README.md`, `contracts/README.md`, `agents.md`, `documents/STATUS.md`.
- **NO tocar:** código, `documents/DECISIONES.md`, el plan y este handoff.

### 5. Tests obligatorios

Ninguno nuevo. Gate de la app sin delta respecto de TASK-5.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- T6-1: los conteos de tests y el tamaño del build citados coinciden con el reporte de TASK-5.
- T6-2: grep de rutas personales, claves y hex de 40-64 sobre el diff: vacío.
- T6-3: cada nombre exportado citado en los READMEs existe en el código (`grep` por nombre).

### 8. Al terminar

Reporte §5 con el snippet de STATUS. Sin commits ni pushes.

---

## Smoke del ciclo (después de TASK-6; runbook en la forma de AGENTE_MID §M5)

Al aprobarse TASK-6, el MID copia esta sección a `documents/SMOKE_HOUSE_ADMIN.md` (con el estado "EN CURSO") y el DEV la
completa **durante** la corrida: las columnas "Resultado obtenido" y "Estado" nunca se llenan por adelantado.

```markdown
# SMOKE_HOUSE_ADMIN
> Plan: PLAN_HOUSE_ADMIN v1.1 | Handoff: HANDOFF_HOUSE_ADMIN v<versión vigente> | Issue: #14 | Fecha: <día de la corrida> |
> Estado: EN CURSO
```

### Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-14-house-admin` con TASK-1..6 commiteadas; `npm ci` con Node 26; gate de
  la app en verde (reporte de TASK-6). Nada de esta corrida se commitea salvo `documents/SMOKE_HOUSE_ADMIN.md`. Sin
  `contracts/Published.toml` ni `contracts/Pub.*.toml` (si aparecen durante la corrida, se detiene y se avisa).
- **Red:** localnet **aislada** (`agents.md` §3), `env.sh` + `ids.env` + `smoke_guard`, publicación **variante B**, cierre
  del paso 7. **Una sola localnet** (`ss -ltn` sin `:9000`). **Regla B4:** todo `suic` lleva `PRE` **escrito** en su fila
  (`PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`), también los de
  solo lectura.
- **Testnet:** nada.
- **Cuentas:**
  - de la génesis, en `ids.env` (no se pegan): `ADMIN` (publica y tiene el cap hasta el paso 6), `A` (fondea las burners
    y crea partidas) y `B` (acepta). Tres cuentas distintas;
  - wallets de la app: burner `W` en `T1` (recibe el cap) y burner `W2` en `T2` (sin cap), fondeadas con 2 SUI cada una
    por CLI desde `A`;
  - nunca `new-address`; nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Archivos de entorno** (rutas literales en el archivo real; aquí placeholders), **nunca dos en la misma llamada**:
  - `env.sh` (solo `sui`/`suic`, el de `agents.md` §3);
  - `app.env`: `NODE`, `VITE_JS`, `REPO` y `PATH` de Node 26; no toca `HOME` ni `SUI_CONFIG_DIR`. **Primera línea, la
    guarda** (SUGGESTION-1 de #13): `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL; return 97; }`. Un `APPENV-FAIL`
    detiene el smoke;
  - `chrome.env`: `CHROME` (ruta literal del binario) y `HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME`/`XDG_DATA_HOME` dentro
    de `<SMOKE_DIR>/chrome-home`;
  - procesos en segundo plano del harness con `exec` y el PID en `<SMOKE_DIR>`: `sui.pid`, `vite.pid`, `chrome.pid`
    (`sui start` sale con 144 ante SIGTERM y `vite` con 143: esperados).
- **Navegador (🌐):**
  - **Arranque literal** de Chrome, como comando en segundo plano del harness:
    ```sh
    . <SMOKE_DIR>/chrome.env && echo $$ > "$SMOKE_DIR/chrome.pid" && exec "$CHROME" --headless=new --no-first-run \
      --no-default-browser-check --user-data-dir=<SMOKE_DIR>/chrome-profile --remote-debugging-address=127.0.0.1 \
      --remote-debugging-port=9229 about:blank > "$SMOKE_DIR/chrome.log" 2>&1
    ```
    Perfil propio en `<SMOKE_DIR>/chrome-profile`; nunca el Chrome ni el perfil del usuario, que puede estar abierto en la
    máquina. Cierre **solo** con `kill "$(cat <SMOKE_DIR>/chrome.pid)"`, nunca `pkill`/`killall`; verificación con
    `pgrep -af <SMOKE_DIR>/chrome-profile` vacío;
  - cliente CDP propio en Node 26 sin dependencias (`fetch` + `WebSocket`), en `<SMOKE_DIR>` (no se commitea), contra
    `127.0.0.1:9229`; una sesión por pestaña con `Target.attachToTarget` y `Network.enable`;
  - **cada pestaña con `Target.createTarget({ url, newWindow: true })`**, todas visibles (`document.visibilityState ===
    'visible'`), **nunca** `Page.bringToFront`;
  - después de fondear una burner se navega **solo por hash** (`location.hash`): recargar cambia su dirección, y la de
    `W` tendría el cap en una clave perdida (si pasa, génesis nueva o fin de la corrida);
  - campos con foco + `Input.insertText`; clics con `element.click()` en `Runtime.evaluate`.
- **Pedidos en CDP** (`Network.requestWillBeSent`) por sesión: se cuentan **solo los `POST` de gRPC-web**
  (`request.method === 'POST'`; los `OPTIONS` del preflight CORS no cuentan, SUGGESTION-3 de #13), por método según la
  ruta: `StateService/ListOwnedObjects`, `LedgerService/GetObject`, `LedgerService/BatchGetObjects`,
  `TransactionExecutionService/SimulateTransaction`, `TransactionExecutionService/ExecuteTransaction`,
  `LedgerService/GetTransaction` (el `getObject` del SDK, también el del `precheck`, sale como `BatchGetObjects`). Por
  acción con burner: **2** `SimulateTransaction` + **1** `ExecuteTransaction`. Las
  lecturas `net::ERR_ABORTED` del doble montaje de `StrictMode` no cuentan (se anotan).
- **Observador:** antes de cada acción, `Runtime.evaluate` instala un `MutationObserver` que guarda en `window.__txLog`
  `[performance.now(), selector, texto]` de `[data-house-action] .tx-status` y de `section.house-admin [role="status"]`.
- **Tokens de resultado (H-6, SEG-10, mayúsculas exactas):** "Comisión actualizada", "Límites actualizados",
  "Retiraste". Ninguno puede aparecer mientras se vean "Verificando la transacción…", "Esperando la firma en la wallet…",
  "Confirmando en la red…" o "Actualizando datos…".
- **Textos y selectores esperados:** §1. **Montos de referencia:** partida de 0,2 SUI con 250 bps ⇒ pozo 0,4, comisión
  0,01 (10000000 MIST), al ganador 0,39; con 0 bps ⇒ comisión 0.
- **Lo que este smoke no puede ejercitar:** el `precheck` de "cap transferido" (H-3). Para que `W` pierda el cap habría
  que firmar como ella por CLI, y eso está prohibido. Lo cubren T4-6..T4-9 y S-5 de TASK-1.
- **Qué se pega:** IDs y direcciones abreviados o por rol; digests completos; nunca `sender`/`owner`, archivos de
  `<SMOKE_DIR>/net` ni logs completos. Antes de entregar: grep de claves, rutas personales y hex de 40-64 sobre el SMOKE,
  vacío.

### Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (`agents.md` §3 paso 2) + `app.env` (con la guarda) + `chrome.env`. Línea base: `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | Línea base anotada; nada de lo anterior existe; 6 puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (`sui.pid`); `PRE suic chain-identifier`; `PRE suic addresses --json` ⇒ `ADMIN`, `A`, `B` a `ids.env`; publicación variante B (`PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`); `PKG`, `HOUSE`, `HOUSE_CAP` a `ids.env` desde `localnet.json` (sin Node en esa llamada); `PRE suic object "$HOUSE_CAP" --json` y `PRE suic object "$HOUSE" --json` | Red arriba; `active-env` = `localnet`; exit 0; `Move.lock` sin delta; dueño del cap = `ADMIN` (por rol); House con `fee_rate` 0, 1000000 / 50000000000, `fees_collected` 0, `version` 1 | | ⏳ |
| 2 | DEV: `vite` dev en segundo plano (`. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`) y, en otra llamada en segundo plano, Chrome con la línea literal de las precondiciones; `curl -sf http://127.0.0.1:5173/`; `curl -sf http://127.0.0.1:9229/json/version`. 🌐 `T0` sin conectar (`newWindow`) en `#/admin` | 200 con `<div id="root">`; CDP solo en 127.0.0.1; `T0`: "Conecta la wallet que tiene el HouseCap para administrar la House"; **0** `ListOwnedObjects` (POST) en `T0`; sin enlace "Administrar House" | | ⏳ |
| 3 | 🌐 `T1` (`newWindow`, `Network.enable`); conectar la burner `W`; dirección del `title` de `.account-badge` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$W`; 🌐 `#/nada` → `#/` | `visibilityState === 'visible'`; saldo 2 SUI en el formulario; misma dirección (sin recarga); sin enlace "Administrar House"; **1** `ListOwnedObjects` (POST) por la detección del encabezado | | ⏳ |
| 4 | 🌐 `T1`: `location.hash = '#/admin'` | `.house-no-permission` con "Sin permisos: esta cuenta no tiene el HouseCap de esta House." y "Volver a comprobar"; sin `.house-config` ni `[data-house-action]` (P-1) | | ⏳ |
| 5 | DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json` (`G0`, ID a `ids.env`); `PRE suic object "$G0" --json` | `G0.fee_rate` = 0 (comisión vigente al crearla) | | ⏳ |
| 6 | DEV: `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function transfer_house_cap --args "$HOUSE_CAP" "$W" --json`; `PRE suic object "$HOUSE_CAP" --json` | Evento `HouseCapTransferred` con `recipient` = `W` (por rol); dueño del cap = `W` | | ⏳ |
| 7 | 🌐 `T1`: `location.hash = '#/'` y luego `'#/admin'`; si sigue "Sin permisos" (atraso del índice, S-2), "Volver a comprobar" hasta 3 veces con 1 s entre clics | Aparece "Administrar House" en el encabezado; `.house-config`: "0 bps (0 %)", mínimo 0.001 SUI, máximo 50 SUI, acumulado 0 SUI, versión 1; retiro deshabilitado con "No hay comisiones para retirar."; se anota cuántos "Volver a comprobar" hicieron falta | | ⏳ |
| 8 | 🌐 `T1`: comisión `1001`, `abc`, `-1`, `2.5` y `0` (uno por vez) | Cada uno con su texto de §1 (`too_high`, `invalid` ×3, `unchanged`) y "Actualizar comisión" deshabilitado; **0** `SimulateTransaction` | | ⏳ |
| 9 | 🌐 `T1`: observador; comisión `250` ⇒ resumen; clic en "Actualizar comisión". DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json`; `PRE suic object "$G0" --json` | Resumen "De 0 bps (0 %) a 250 bps (2.5 %)" antes del clic; etapas en orden; **ningún token** durante las etapas (H-6); después "Comisión actualizada: de 0 bps (0 %) a 250 bps (2.5 %). Las partidas ya creadas conservan la suya." con el digest; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; `FeeRateUpdated` 0 → 250; House `fee_rate` 250; `G0.fee_rate` sigue 0; `.house-config` ya muestra "250 bps (2.5 %)" al terminar | | ⏳ |
| 10 | 🌐 `T1`: durante el paso 9 (muestreo cada 250 ms del observador) | Mientras corre, los botones de los tres bloques deshabilitados y **ningún** `IN_FLIGHT_TEXT` en `section.house-admin` (NIT-3: la propia no se ve como ajena) | | ⏳ |
| 11 | 🌐 `T1`: `location.hash = '#/'` | El formulario de creación muestra "Comisión 2.5 %" (la invalidación de `house` en la misma pestaña) | | ⏳ |
| 12 | 🌐 `T1`, `#/admin`: límites `0`/`10`, luego `5`/`1`, luego `-1`/`10` | `zero_min`, `min_above_max`, `negative` con sus textos; "Actualizar límites" deshabilitado; **0** `SimulateTransaction` | | ⏳ |
| 13 | 🌐 `T1`: observador; límites `0.002`/`10` ⇒ resumen; en **un mismo** `Runtime.evaluate`: clic en "Actualizar límites", `location.hash = '#/'` a los 50 ms y `'#/admin'` a los 300 ms (adopción). DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json` | Resumen "De 0.001–50 SUI a 0.002–10 SUI"; al volver, el panel muestra el resultado **adoptado** "Límites actualizados: mínimo 0.002 SUI, máximo 10 SUI (antes 0.001–50 SUI)." (o, si terminó antes de remontar, la configuración nueva sin resultado: se anota cuál pasó, ambos son correctos por `mountSnapshot`); `BetLimitsUpdated` con los cuatro montos; House 2000000 / 10000000000; ningún token durante las etapas | | ⏳ |
| 14 | DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json` (`G1`); `PRE act_as "$B" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json`; lo mismo de `B` sobre `G0`; `PRE suic object "$HOUSE" --json` | `G1.fee_rate` 250; `GameResolved` de `G1` con `fee` 10000000 y de `G0` con `fee` 0; House `fees_collected` 10000000 | | ⏳ |
| 15 | 🌐 `T1`: "Actualizar" de `.house-config`. DEV: `PRE suic balance $W` | Acumulado "0.01 SUI"; botón "Retirar 0.01 SUI a tu cuenta" habilitado; saldo de `W` anotado | | ⏳ |
| 16 | 🌐 `T1`: observador; clic en "Retirar 0.01 SUI a tu cuenta". DEV: `PRE suic tx-block <digest> --json`; `PRE suic object "$HOUSE" --json`; `PRE suic balance $W` | Etapas en orden; ningún token durante las etapas; "Retiraste 0.01 SUI de comisiones a tu cuenta." con digest y costo de red; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; la transacción tiene 2 comandos (`withdraw_fees` y `TransferObjects` a `W`); `FeesWithdrawn.amount` 10000000 = `fees_collected` previo; House `fees_collected` 0; saldo de `W` = anterior + 10000000 − costo de red (gas de la tx); el botón vuelve a deshabilitarse con "No hay comisiones para retirar." | | ⏳ |
| 17 | 🌐 `T2` (`newWindow`, `Network.enable`): conectar la burner `W2`; `location.hash = '#/admin'` | `visibilityState === 'visible'` en `T1` y `T2`; en `T2`, sin enlace "Administrar House" y `.house-no-permission`; en `T1`, el panel sigue con su último resultado | | ⏳ |
| 18 | DEV: `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$HOUSE_CAP" 300`; `PRE suic object "$HOUSE" --json` | La CLI falla al armar o ejecutar (el cap es de `W`); House sigue en 250: custodia verificada (SEG-2) | | ⏳ |
| 19 | 🌐 `T1`: recuento final de pedidos (POST) desde el paso 3 | Solo los métodos de las precondiciones; ningún `SimulateTransaction` fuera de las acciones de los pasos 9, 13 y 16; anotado el total de `ListOwnedObjects` | | ⏳ |
| 20 | DEV: cierre = `agents.md` §3 paso 7 más la app: `kill` por PID de Chrome (`chrome.pid`), `vite` (`vite.pid`; exit 143 esperado) y `sui` (`sui.pid`; exit 144 esperado); el cliente CDP ya terminó; **en otra llamada**, `kill -0` falla en los tres; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (el Chrome del usuario no se toca); `ss -ltn` con **9000, 9123, 9184, 5003, 5173 y 9229** (puerto del CDP) libres; recién entonces `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_HOUSE_ADMIN.md` | Todo limpio; `~/.sui/` sin cambios | | ⏳ |

### Qué no cubre este smoke (y dónde está cubierto)

- **Solo con tests:** el `precheck` de cap perdido (T4-6..T4-9, S-5 de TASK-1); la regla de certeza con páginas parciales
  (T2-4..T2-7); el panel que no se desmonta con una relectura fallida (T5-5, T4-4); los aborts `house`/0, 1, 2 desde la
  preflight (la UI los impide con la validación espejo: T2-16, T4-10).
- **Checklist del owner en testnet** (P-4 / D-20261104-02 (4): el orquestador la pasa como **casillas al body de #17** y
  el comentario de cierre de #14 lo dice; ningún agente la corre):
  - [ ] Tras #8, con `deployments/testnet.json` mergeado: si la dirección publicadora no es la de la wallet del navegador,
    resolver N-3. Con `transfer_house_cap` por CLI desde su `SUI_CONFIG_DIR`, verificar la dirección de destino dos veces
    (irreversible). Si piensa importar la clave publicadora en una wallet de navegador: esa dirección también tiene el
    `UpgradeCap` (va contra el sentido de D-20261102-03).
  - [ ] Abrir la app de testnet con la wallet del cap: aparece "Administrar House" y el panel muestra la comisión fijada
    en #8.
  - [ ] Cambiar la comisión (p. ej. +1 bps) y restaurarla al valor de #8; `FeeRateUpdated` en el explorador. Entre las dos
    transacciones no anunciar el juego: una partida creada en ese intervalo conserva la comisión intermedia.
  - [ ] Cambiar los límites y restaurarlos; `BetLimitsUpdated` en el explorador.
  - [ ] Tras al menos una partida resuelta con comisión: anotar `fees_collected`, retirar y comparar el `amount` del
    `FeesWithdrawn` y lo recibido con ese valor.
  - [ ] Con otra cuenta: sin enlace y "Sin permisos" en `#/admin`.

### Reporte final

- Pasos PASA/TOTAL:
- Hallazgos (n.º de paso + digest / output):
- Veredicto: [PASA | NO PASA]

## Riesgos (del plan, R-n)

| # | Riesgo | Dónde se mitiga |
|---|---|---|
| R-1 | El índice de dueños del fullnode local no existe o se atrasa tras `transfer_house_cap` | TASK-1 S-1 (STOP si falta) y S-2; "Volver a comprobar" (paso 7); `precheck` por `getObject` (H-3) |
| R-2 | Una acción de la House vista como ajena (NIT-3) | H-4, T3-1..T3-4; paso 10 |
| R-3 | Regresión en las acciones de partidas al tocar `ExecuteInput` y `toTxGameEntry` | Firmas compatibles; T3-11 |
| R-4 | El espejo de `MAX_FEE_BPS` queda viejo tras un upgrade | Fila en `agents.md` §5 (TASK-6); la preflight y el contrato deciden igual |
| R-5 | La burner pierde el cap al recargar durante el smoke | Navegar solo por hash; si pasa, génesis nueva |
| R-6 | El owner no tiene el cap en su wallet de navegador en testnet | N-3 y la checklist del owner; no bloquea el merge |
| R-7 | Una página parcial del nodo leída como "sin permisos" | H-1; T2-4..T2-7 |

## Archivos que NO se tocan en todo el ciclo

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `contracts/deployments/`,
`contracts/fixtures/game-*.localnet.json`, `app/scripts/localnet-guard.mjs`, `app/scripts/capture-tx-fixtures.mjs`,
`app/scripts/capture-read-fixtures.mjs`, `package.json`, `app/package.json`, `package-lock.json`, `.npmrc`, `.github/`,
`app/eslint.config.js`, `documents/DECISIONES.md`, `documents/PLAN_HOUSE_ADMIN.md`. El worktree de #8 no se toca.
