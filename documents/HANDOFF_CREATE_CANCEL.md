# HANDOFF_CREATE_CANCEL
> Plan: PLAN_CREATE_CANCEL v1 (MAYOR: APPROVE, 2026-11-02, 0 BLOCKER/MAJOR; `6e967f8`) | Issue: #11 | Branch:
> `feature/issue-11-create-cancel` | Versión: v1.2 | Fecha: 2026-11-02

## Changelog

- **v1.2 (2026-11-02)**: tras TASK-1 (revisión del MID: PASA, sin STOP; `documents/REPORTES_CREATE_CANCEL.md`). Cambian
  solo TASK-2 y TASK-4, más una nota en §3:
  - **R-1:** el texto con que la CLI **presenta** un abort ("… aborted within function '0x…::game::<fn>' at instruction
    N with code C") nunca llega a la app. **No** se agrega una tercera regex: un test negativo fija que ese texto cae en
    el fallback (TASK-2).
  - **S-1 bis:** en el camino de la wallet, justo después de ejecutar, `getObject` devuelve la versión vieja y
    `getTransaction` lanza "not found" hasta que la transacción queda indexada; `waitForTransaction` vuelve ya con
    `checkpoint`. Confirma DL-5 con dos precisiones: el "not found" es un intento fallido de `waitForCheckpoint`
    (TASK-2) y, si `confirmTransaction` ya trae `checkpoint`, la etapa `indexing` se salta (TASK-4). Los cortes
    20/30/30 s no cambian: son topes, y el smoke anota la latencia de testnet.
  - **Fixture:** `cliErrorText` es `effects.status.error` del nodo (formato Rust, igual a la `description` de gRPC), no
    la línea con que la CLI presenta el error. Es la entrada de la regex Rust de DL-4.
  - **§3:** la técnica de S-1 bis (firmar con la CLI como una cuenta efímera de la génesis aislada) queda permitida solo
    en la localnet aislada y con tres condiciones.
- **v1.1 (2026-11-02)**: revisión del MAYOR del handoff v1: APPROVE (0 BLOCKER/MAJOR/MINOR) con 2 NIT. TASK-1 no
  cambia.
  - **NIT-1 (TASK-4):** si el nodo **ya confirmó el éxito** y después lanza `interpret`, el resultado es `success` con
    `value: null` (como DL-9: "Partida creada" con el digest, sin navegar, invalidaciones normales). `unconfirmed` queda
    solo para cuando el nodo no respondió o venció el corte. Test nuevo. Se ajustan §4 (`value: T | null`) y TASK-5.
  - **NIT-2 (smoke, paso 17):** el click en `T2` va por `Runtime.evaluate`, **sin** `Page.bringToFront`, porque el foco
    dispara el refetch del detalle y cierra la ventana de la carrera.
  - **§1:** el MAYOR acepta la precisión de M-3 (b). Un `failure` decidido por el nodo lleva también el costo de red
    (`TxOutcome` `failure` suma `cost`).
- **v1 (2026-11-02)**: primera versión. Integra **P-1 = (a)** (D-20261102-05, `490dcf5`: "Rechazar invitación" va en
  #11) y la revisión del MAYOR del plan:
  - MINOR-1: candado síncrono contra el doble envío (TASK-4, smoke 12);
  - MINOR-2: la House se relee antes de firmar y se compara la comisión creada (TASK-3/4/5, smoke 8 y 15);
  - MINOR-3: errores que no son aborts (TASK-2/4);
  - NIT-1: guarda de localnet sin SDK ni red en el nivel superior (TASK-1);
  - NIT-2: test del formato del sufijo de diagnóstico (TASK-2).

  **Cambio del smoke derivado de MINOR-2:** el "abort real con mensaje mapeado" ya no sale de subir el mínimo de la
  House (ahora lo detiene la relectura sin llegar al contrato: smoke 15). Sale de una **carrera real**: el invitado
  rechaza una invitación que el creador acaba de cancelar ⇒ `game`/4 mapeado (smoke 17).

Documento autocontenido para el DEV: TASK-1..6 y el smoke del ciclo. Se ejecuta **un task por sesión**, en orden. Cada
task termina con el reporte de `documents/FLUJO_AGENTES.md` §5 y espera la revisión del MID antes del siguiente. El DEV
**no** commitea ni pushea: lo hace el orquestador.

## Historia de usuario del ciclo

**Como** jugador con la wallet conectada, **quiero** crear una partida apostando SUI (abierta a cualquiera o invitando a
una dirección), cancelarla mientras nadie la aceptó y, si me invitaron, rechazar la invitación, viendo en cada paso si
la transacción está pendiente, salió bien o falló y por qué, **para** poner mi apuesta en juego, recuperarla si me
arrepiento y decir que no a una invitación, sin usar la CLI y sin que la app me diga que algo salió bien cuando no salió.

**Scope en una frase:** formulario de creación validado contra la House y el saldo, botones "Cancelar" (creador) y
"Rechazar" (invitado) en el detalle, y la maquinaria común de transacciones que reutilizan #12 y #14: builders puros,
mapeo de abort codes, hook de ejecución con estados honestos, espera de indexación e invalidación.
**Lo que NO entrega:** aceptar ni el coinflip (#12), "mis partidas" e invitaciones recibidas (#13), panel admin (#14),
cambios del contrato ni dependencias nuevas.

## 0. Baseline de gates verificado (2026-11-02, `master` `eecc790`)

Base de la branch: `eecc790` (`master`: merge de #10, `dfca12e`, más el housekeeping `c562730`, solo docs). Encima, la
branch suma solo docs: el plan (`6e967f8`), D-20261102-05 (`490dcf5`) y este handoff. Valores de `documents/STATUS.md`
medidos en `dfca12e` (mismo código de `app/` y `contracts/`):

| Área | Gate | Baseline |
|---|---|---|
| Toolchain | `sui --version` / `node --version` / `npm --version` | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` / `11.20.0` |
| App | `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` | exit 0; 292 firmas verificadas; 0 vulnerabilidades de producción (11 *moderate* solo dev, aceptadas hasta #35) |
| App | `npm run lint -w app` / `npm run typecheck -w app` | 0 problemas / 0 errores |
| App | `npm test -w app` | **375 tests PASS en 29 archivos** |
| App | `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-*.js` ≈ 852 kB (≈ 260 kB gzip), con el aviso informativo de chunk > 500 kB (#15) |
| Contracts | `sui move build` / `--lint` / `test` con `-e testnet --warnings-are-errors` | 0 warnings / 0 lints / **83 tests PASS**; `Move.lock` sin delta |
| Contracts | `node --test scripts/*.test.mjs` / `node scripts/publish.mjs check` | **99 PASS** / "0 despliegues" |

**Primer paso de TASK-1:** correr el gate completo (`agents.md` §3: job `app` + job `contracts`) **antes** de tocar nada y
pegarlo como "verificación del baseline". Si algo difiere, se para y se reporta. **Primer paso de TASK-2 en adelante:**
el gate de la app igual al del último reporte aprobado.

## 1. Decisiones (no reabrir)

**Del owner (registradas):**

| Decisión | Qué fija para este ciclo |
|---|---|
| D-20261102-05 | "Rechazar invitación" (`reject_game`) va en #11, en el detalle, visible solo para el invitado y solo en `Pending`, con la misma maquinaria que "Cancelar" |
| D-20261030-06 (4) | El invitado puede rechazar: reembolso íntegro **al creador**, sin comisión; el creador sigue pudiendo cancelar |
| D-20261030-15 D3 | El objeto terminal se conserva; el depósito de storage de crear no se recupera |
| D-20261102-02 (3), (5), (6) | Sin dependencias nuevas; burner solo en localnet + `npm run dev`; sin explorador en localnet (Suiscan en testnet) |
| D-20261102-03 | Ningún agente usa claves del owner ni corre nada con claves contra testnet; `~/.sui/` sin claves |
| D-20261102-04 (2) | Botón "Conectar wallet" en español; modal y menú del kit en inglés |

**Del plan v1 (MID, aprobadas por el MAYOR):** DL-1 … DL-16 de `documents/PLAN_CREATE_CANCEL.md`. Resumen operativo:

| # | Resumen |
|---|---|
| DL-1 | Builders puros en `sui/transactions/game.ts`; target `<packageId>::game::<fn>`; `tx.object(id)` sin versión; lanzan ante ID inválido o `bet` fuera de `1..U64_MAX` |
| DL-2 | **El nodo decide:** tras la wallet, `waitForTransaction` por digest con efectos y eventos; éxito solo con `status.success` del nodo |
| DL-3 | **Preflight propia** antes de abrir la wallet (copia + `setSender` + `build({ client })`); a la wallet va el `Transaction` original sin construir |
| DL-4 | `errors.ts`: `(módulo, código) → mensaje` para `house` 0–4 y `game` 0–10, tres fuentes (estructurado, texto, `cause`), solo para `packageId`/`originalPackageId` normalizados; sufijo `(código <módulo>/<n>)`; fallbacks |
| DL-5 | Espera de `checkpoint` con tope antes de invalidar; si vence, éxito con nota |
| DL-6 | Tabla pura de invalidación por acción con `queryKeys`, ejecutada dentro de la `mutationFn` |
| DL-7 | `useGame` deja de pedir ante un error no transitorio |
| DL-8 | Formulario en la portada; validación pura; límites y comisión del objeto House; reserva de gas; `parseAddressInput` |
| DL-9 | ID creado = `game_id` del único `GameCreated` (parser BCS de #10) con `creator` = cuenta |
| DL-10 | "Cancelar"/"Rechazar" solo en el detalle, por predicados puros; reembolso leído del `GameCancelled` |
| DL-11 | Hook común `useExecuteTransaction` (`useMutation`, sin reintentos), etapas, cortes 20/30/30 s |
| DL-12 | `TransactionStatus`: etapas, éxito con digest/explorador, "sin confirmar", error |
| DL-13 | Costo de crear: nota previa con lo medido en #6 + costo real de red tras el éxito |
| DL-14 | Tras crear, navega al detalle con aviso en el `state` del router; en invitaciones, texto de compartir |
| DL-15 | Fixtures reales de transacciones con script commiteado y guarda de localnet compartida |
| DL-16 | MIST `bigint` hasta el formateo; mutaciones con `retry: false` explícito |

**Del MAYOR en la aprobación del plan (2026-11-02):**

| # | Decisión | Dónde |
|---|---|---|
| M-1 (MINOR-1) | **Candado síncrono** contra el doble envío: un `useRef<boolean>` que se toma **antes de cualquier `await`** y se libera en `finally`; un segundo `execute` con el candado tomado retorna sin hacer nada. Test con dos `execute` en el **mismo tick** ⇒ una sola preflight y una sola llamada a la wallet. El smoke lo confirma en CDP | TASK-4, smoke 12 |
| M-2 (MINOR-2) | **La comisión y los límites mostrados pueden no ser los que se guardan.** En la etapa de preflight se relee la House **antes** de simular; si `fee_rate`, `min_bet` o `max_bet` difieren de lo que mostró el formulario, se detiene **sin abrir la wallet** con "La comisión cambió de X a Y; revisa y vuelve a confirmar" (y/o el texto de límites) y se invalida la query `house`. Tras el éxito, si el `fee_rate` del `GameCreated` difiere del mostrado, el aviso lo dice | TASK-3, TASK-4, TASK-5, smoke 8 y 15 |
| M-3 (MINOR-3) | **Errores que no son aborts.** (a) En la preflight (relectura de la House incluida), un error transitorio (`isTransientReadError`) o el corte por tiempo ⇒ `failure` "No se pudo verificar la transacción (red); intenta de nuevo", sin abrir la wallet y **sin pasar por `errors.ts`**. (b) Un error de la wallet **que trae un digest**, o cualquier error **después** de tener un digest ⇒ se consulta al nodo con ese digest y el resultado sale **solo** de esa lectura; si el nodo no confirma ⇒ `unconfirmed` con el digest. **Nunca** `failure` a partir del error de la wallet o del SDK cuando ya hay un digest | TASK-2, TASK-4 |
| M-4 (NIT-1) | `app/scripts/localnet-guard.mjs` **sin imports de `@mysten/sui` ni de red en el nivel superior** (solo `node:*`). Criterios: la fixture de #10 no cambia y `capture-read-fixtures.mjs` con otra URL sigue saliendo con 2 | TASK-1 |
| M-5 (NIT-2) | Test que fija el formato exacto del sufijo de diagnóstico (`(código game/3)`), porque lo reutilizan #12 y #14 | TASK-2 |

**Precisión de M-3 (b), aceptada por el MAYOR (revisión del handoff v1, 2026-11-02):** "nunca `failure`" se refiere a
errores de la wallet o del SDK. Si el nodo devuelve la transacción con `status.success: false`, eso **sí** es `failure`,
con el mensaje de sus efectos, el digest y el costo de red (`networkCost(effects.gasUsed)`): lo decide el nodo (DL-2), no
la wallet. Un error **después** de que el nodo confirmó el éxito (p. ej. en `interpret`) no es `unconfirmed` ni
`failure`: es `success` con `value: null` (NIT-1 de v1.1).

## 2. Hechos verificados del SDK instalado (resumen del plan, sección "Verificación")

Rutas relativas a `<repo>/node_modules/@mysten/`, `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39 y
`@mysten/dapp-kit-react` 2.1.41.

| # | Hecho | Evidencia |
|---|---|---|
| V-1 | `useDAppKit().signAndExecuteTransaction({ transaction })`: fija el `sender` si falta, serializa con `toJSON({ client })` y llama a la feature de la wallet | `dapp-kit-core/dist/index.mjs:570-628` |
| V-2 | Resultado `$kind` `Transaction`/`FailedTransaction` según el BCS de los efectos; `events`/`objectTypes` `undefined`, `checkpoint` `null`, `effects` puede ser `null` | `dapp-kit-core/dist/index.mjs:537-565`; `types-Ceigv1q9.d.mts:201-213` |
| V-3 | Burner: `new Ed25519Keypair()` por carga de página, sin ventana de aprobación; en `signAndExecuteTransaction` hace `build({ client })` (simula) y ejecuta | `dapp-kit-core/dist/index.mjs:732-734, 809-829` |
| V-4 | `build()` sin `gasBudget` simula y, si falla, lanza `SimulationError` (`@mysten/sui/client`) con `message` `Transaction resolution failed: …` y `executionError` estructurado | `sui/dist/client/core-resolver.mjs:77-97` |
| V-5 | `ExecutionStatus` y `ExecutionError` (`$kind: 'MoveAbort'`, `MoveAbort: { abortCode: string, location?: { package?, module?, functionName? } }`) | `sui/dist/client/types.d.mts:914-920, 942-953, 996-1009` |
| V-6 | `message` del SDK: `MoveAbort in 2nd command, abort code: 3, in '0x…::game::cancel_game' (instruction N)`; `package` por gRPC (proto) o por BCS: se compara normalizado | `sui/dist/client/utils.mjs:19-39, 58-84`; `sui/dist/grpc/core.mjs:625-650, 732-745` |
| V-7 | Cancelaciones del runtime: `Unknown` con `message` `ExecutionCancelledDueToRandomnessUnavailable`, o `CongestedObjects` | `sui/dist/client/utils.mjs:176-184, 246-274` |
| V-8 | `waitForTransaction` repite `getTransaction` (0/300/600/1500/3500 ms y luego cada 2 s) tragándose los errores hasta su `timeout` | `sui/dist/client/core.mjs:93-126` |
| V-9 | `extractStatusFromEffectsBcs`, `formatMoveAbortMessage` y `SimulationError` se exportan desde `@mysten/sui/client` | `sui/dist/client/index.mjs:7` |
| V-10 | `getBalance` → `{ balance: { balance, coinBalance, addressBalance } }` (strings) | `sui/dist/grpc/core.mjs:174-189` |
| V-11 | Forma del PTB de crear: `inputs` `[Pure u64, UnresolvedObject House, Pure Option<address>]`; `commands` `[SplitCoins{GasCoin}, MoveCall{… create_game, [Input 1, NestedResult [0,0], Input 2]}]`; `none` = bytes `00` | `tx.getData()` (sonda sin red del plan) |
| V-12 | CLI 1.83 con `--gas-budget` explícito ejecuta una transacción que aborta; texto `MoveAbort(MoveLocation { module: ModuleId { address: …, name: Identifier("game") }, …, function_name: Some("…") }, N) in command M` | smoke de #6, paso 8 (`git show 8fddbda:documents/SMOKE_ACCEPT.md`) |

## 3. Reglas transversales (todos los tasks)

- **Node 26** por ruta absoluta en cada llamada: `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node
  --version && …` (`v26.13.0`). Todo desde la raíz del worktree (`<repo>`).
- **Gate de la app en cada task** (output pegado y completo): `npm ci`, `npm audit signatures`, `npm audit --omit=dev
  --audit-level=high`, `npm run lint -w app`, `npm run typecheck -w app`, `npm test -w app` (archivos y tests),
  `VITE_SUI_NETWORK=testnet npm run build -w app` (tamaño) y `git status --porcelain --untracked-files=all` con solo los
  archivos del task. En TASK-1, además, el job `contracts` completo (cero delta).
- **Sin dependencias nuevas** (SEG-8): `package.json`, `app/package.json` y `package-lock.json` sin delta en todo el ciclo.
- **Capas** (`app/eslint.config.js`, sin tocarlo): `sui/` solo `@mysten/sui*`/`@mysten/dapp-kit-core*` y sin React;
  `hooks/` solo `@mysten/sui*` y la raíz de `@mysten/dapp-kit-react` (`useDAppKit`, `useCurrentClient`,
  `useCurrentAccount`); componentes y páginas, de `@mysten/*` solo `@mysten/dapp-kit-react/ui`.
- **Localnet aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh`, `ids.env`, `smoke_guard`, publicación con
  el script en la **variante B** (sin `--out`, escribe `contracts/deployments/localnet.json`) y cierre del paso 7.
  **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el prefijo del paso 3, **tampoco** los de solo
  lectura; siempre `suic`/`"$SUI"`; `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. **Una sola localnet a la vez** (puerto 9000):
  confirmar antes de la génesis que no hay otra. Para `node`/`npm`/`vite`, un `<SMOKE_DIR>/app.env` propio que no toca
  `HOME` ni `SUI_CONFIG_DIR` (patrón de #10); nunca `env.sh` y `app.env` en la misma llamada. Nunca `new-address`.
- **Firmar como una cuenta de la génesis (técnica de S-1 bis de TASK-1):** permitido **solo** en la localnet aislada y
  con tres condiciones: (1) la firma la hace la CLI bajo `PRE` (`suic …`, regla B4); (2) ningún proceso de Node (sondas,
  scripts, la app) lee nada de `<SMOKE_DIR>/net`; (3) ninguna clave se imprime ni se pega. Las sondas en Node solo leen
  la red por gRPC.
- **Testnet:** nada con claves. Este ciclo no necesita ni lecturas públicas de testnet.
- **Placeholders en todo lo commiteado y en el output pegado** (`FLUJO_AGENTES.md` §2): `<repo>`, `<HOME real>`,
  `<SMOKE_DIR>`, `<scratchpad>`. Direcciones e IDs abreviados (`0x1234…abcd`) en reportes; digests completos sí.
- **Antes de cada reporte:** `git diff` + archivos nuevos sin rastrear por grep de claves (`suiprivkey`, `mnemonic`,
  `BEGIN .*KEY`) y de rutas personales: vacío. El grep de hex de 40-64 solo debe dar la fixture nueva de TASK-1, la de #10
  y los IDs ficticios de tests; se declaran.
- **Sin `useEffect` para pedir datos** (PROY-14); montos en `bigint` (PROY-12); textos de la UI en español; tests en
  inglés con nombre = comportamiento (LIM-11); JSDoc en funciones exportadas con el porqué (LIM-7); sin `console`.

## 4. Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta |
|---|---|
| `sui/transactions/game.ts` | `buildCreateGameTx({ packageId, houseId, bet: bigint, opponent: string \| null }): Transaction`; `buildCancelGameTx({ packageId, gameId }): Transaction`; `buildRejectGameTx({ packageId, gameId }): Transaction` |
| `sui/errors.ts` | `ABORT_MESSAGES: Record<'house' \| 'game', Record<number, string>>`; `type MoveAbortInfo = { packageId: string; module: string; code: string }`; `findMoveAbort(source: unknown): MoveAbortInfo \| null`; `abortCodeSuffix(info): string` (formato fijo `(código <módulo>/<n>)`); `transactionErrorMessage(source: unknown, ids: { packageId: string; originalPackageId: string }): string` |
| `sui/execution.ts` | `TX_PREFLIGHT_TIMEOUT_MS = 20_000`, `TX_CONFIRM_TIMEOUT_MS = 30_000`, `TX_INDEX_TIMEOUT_MS = 30_000` (recalibrables con S-1); `class PreflightNetworkError`; `preflightTransaction(client, tx, sender, signal?)`; `confirmTransaction(client, { digest, signal })`; `waitForCheckpoint(client, { digest, signal }): Promise<boolean>`; `classifyExecution(result): { kind: 'success' } \| { kind: 'failure'; error: SuiClientTypes.ExecutionError }`; `digestFromError(error: unknown): string \| null`; `networkCost(gasUsed): bigint`; `PREFLIGHT_NETWORK_MESSAGE` |
| `sui/gameTx.ts` | `parseCreatedGame(result, { originalPackageId, sender }): GameCreatedEvent \| null`; `cancelledRefund(result, { originalPackageId, gameId }): bigint \| null` |
| `sui/house.ts` | `type House = { id; version: bigint; feeRate: number; feesCollected: bigint; minBet: bigint; maxBet: bigint }`; `houseType(originalPackageId)`; `parseHouseObject(object, originalPackageId): House`; `fetchHouse(client, { houseId, originalPackageId, signal })` |
| `sui/account.ts` | `fetchSuiBalance(client, { owner, signal }): Promise<bigint>` |
| `sui/createGame.ts` | `CREATE_GAS_RESERVE_MIST = 10_000_000n`; `GAME_STORAGE_DEPOSIT_MIST = { open: 1_953_200n, invitation: 2_196_400n }`; `type HouseTerms = { feeRate: number; minBet: bigint; maxBet: bigint }`; `validateCreateGame({ amountText, opponentText, house: HouseTerms, balance: bigint \| null, account: string })`; `houseTermsChanges(shown: HouseTerms, fresh: HouseTerms): HouseTermsChange \| null`; `houseChangeMessage(change): string` |
| `sui/gameActions.ts` | `canCancel(game, address \| null): boolean`; `canReject(game, address \| null): boolean` |
| `sui/ids.ts` | suma `parseAddressInput(raw: string): string \| null` |
| `sui/gameDetail.ts` | suma `gameRefetchInterval(state: { status: string; error: unknown }): number \| false` |
| `hooks/queryKeys.ts` | suma `house(network, houseId)` y `balance(network, address)` |
| `hooks/txInvalidation.ts` | `type TxAction = { kind: 'create' } \| { kind: 'cancel'; gameId: string } \| { kind: 'reject'; gameId: string }`; `transactionInvalidations(action, { network, originalPackageId, houseId, address }): { reset: QueryKey[]; invalidate: QueryKey[] }` |
| `hooks/useExecuteTransaction.ts` | `type TxStage = 'idle' \| 'preflight' \| 'signing' \| 'confirming' \| 'indexing' \| 'done'`; `type TxOutcome<T> = { kind: 'success'; digest; value: T \| null; indexed: boolean; cost: bigint } \| { kind: 'failure'; message: string; digest: string \| null; cost: bigint \| null } \| { kind: 'unconfirmed'; digest: string }`; `useExecuteTransaction<T>()` → `{ stage, outcome, isBusy, execute(input), reset }` con `input = { action: TxAction; build: () => Transaction; precheck?: (signal) => Promise<{ stop: string; invalidate?: QueryKey[] } \| null>; interpret: (nodeResult) => T }` |
| `hooks/useCreateGame.ts`, `useCancelGame.ts`, `useRejectGame.ts`, `useHouse.ts`, `useSuiBalance.ts` | hooks finos sobre lo anterior (TASK-4) |

---

## TASK-1: fixtures reales de transacciones y sondas — área: contracts (fixtures, docs) + app (scripts)

### 1. Historia de usuario del task
**Como** desarrollador de la app, **quiero** los errores y resultados reales de crear, cancelar y rechazar (simulados y
ejecutados) y medidas de cuánto tarda el nodo en indexar una transacción, **para** escribir el mapeo de aborts y la espera
de indexación contra datos reales y no contra suposiciones. **No entrega:** código de `app/src/`.

### 2. Contexto
- Patrón a replicar: `app/scripts/capture-read-fixtures.mjs` (#10): guarda de URL como primera instrucción (`:12-26`),
  chequeo de `network` y chain id (`:67-79`), `plain()` sin `sender` (`:52-65`), salida por `process.stdout.write`, sin
  `console`. Fixture de #10: `contracts/fixtures/game-reads.localnet.json`.
- Sintaxis de la CLI: smoke de #6 (`git show 8fddbda:documents/SMOKE_ACCEPT.md`, pasos 5-8) y de #10
  (`git show dfca12e:documents/SMOKE_LOBBY.md`, pasos 2, 5 y 7): `update_fee_rate`, `create_game` con `none` /
  `"some(@$B)"`, `cancel_game`, `reject_game`, y un fallo **ejecutado** con `--gas-budget` (paso 8 del smoke de #6).
- `SimulationError` (V-4): simular no firma; `build({ client })` con `setSender(<dirección de la génesis>)` no necesita
  claves.

### 3. Qué implementar
1. **Localnet aislada** (§3): génesis, arranque, cuentas `ADMIN`, `A`, `B`, `C` en `ids.env`, publicación variante B,
   `update_fee_rate` 250.
2. **Transacciones por CLI** (prefijo B4, `--json` a `<SMOKE_DIR>`): `A` crea `G_OPEN` (abierta, 1000001) y `G_INV`
   (invitación a `B`, 2000002); `A` crea y cancela `G_CANCEL`; `A` crea `G_REJ` invitando a `B` y `B` la rechaza;
   `B` llama `cancel_game` sobre `G_OPEN` **con `--gas-budget 100000000`** ⇒ fallo ejecutado `MoveAbort` `game`/3
   (anotar el texto del error de la CLI, sin direcciones).
3. **`app/scripts/localnet-guard.mjs`** (M-4): solo imports `node:*` en el nivel superior, sin red. Exporta
   `assertLocalnetUrl(argv, scriptName)` (la guarda actual de `capture-read-fixtures.mjs`, mismo texto y `exit 2`) y
   `assertDeployment(deployment, nodeChainIdShort)` (chequeo de `network` y chain id, que recibe el chain id ya leído: el
   cliente lo crea el script que llama, **después** de la guarda y con import dinámico del SDK).
   `capture-read-fixtures.mjs` pasa a usarla **sin cambiar su comportamiento**.
4. **`app/scripts/capture-tx-fixtures.mjs`** (ESM, Node 26; `@mysten/sui/*` por import dinámico después de la guarda):
   descubre `G_OPEN`, `G_INV`, `G_CANCEL`, `G_REJ` y las transacciones por eventos (como el script de #10) y escribe
   `contracts/fixtures/game-tx.localnet.json`:
   - `_meta`: `suiCliVersion`, `sdkVersion`, `capturedAt`, `network`, `method` por sección y `note` (cuentas efímeras,
     sin claves);
   - `house`: el objeto House de `getObject({ include: { content: true } })` (`type`, `owner`, `content` en base64);
   - `simulationErrors`: un caso por abort, cada uno `{ sender: '<rol>', message, executionError }` (rol, no dirección)
     del `SimulationError` real de `build({ client })`: `createBetTooLow` (`A`, `bet` = `min_bet − 1`, `game`/0),
     `createBetTooHigh` (`A`, `max_bet + 1`, `game`/1), `createSelfInvite` (`A` invitándose, `game`/2),
     `cancelNotCreator` (`B` sobre `G_OPEN`, `game`/3), `cancelNotPending` (`A` sobre `G_CANCEL`, `game`/4),
     `rejectNotInvited` (`C` sobre `G_INV`, `game`/5), `rejectNoInvitation` (`B` sobre `G_OPEN`, `game`/6). El PTB se
     arma en el script con la forma de V-11 (no importa `app/src/`);
   - `executed`: `getTransaction({ include: { effects: true, events: true, objectTypes: true } })` de `createOpen`,
     `createInvite`, `cancel`, `reject` y `cancelNotCreatorExecuted`, con `effects.bcs` y los `bcs` de eventos en base64,
     sin `sender`;
   - `cliErrorText`: la línea del `MoveAbort` del fallo ejecutado tal como la imprimió la CLI, con la dirección del
     paquete (no es una cuenta) y sin direcciones de cuentas.
5. **`contracts/README.md`:** fila de la fixture nueva en la tabla de rutas y, en "Lectura desde la app", cómo se
   recaptura (`node app/scripts/capture-tx-fixtures.mjs` dentro de la localnet aislada, con el prefijo de Node 26).
6. **Sondas** (código descartable en `<scratchpad>`, nunca en el repo; resultados en el reporte):

| Sonda | Qué medir | Para qué |
|---|---|---|
| S-1 | Tras **cada** transacción de la CLI, desde Node con `SuiGrpcClient`, sondeando cada 100 ms: (i) ms hasta que `getTransaction` responde y si su `checkpoint` llega `null` la primera vez; (ii) ms hasta que trae `checkpoint`; (iii) si `getObject` del `Game` ya muestra la versión nueva cuando `getTransaction` responde; (iv) ms hasta que el evento aparece en `listEvents` | DL-5 y los cortes de DL-11 |
| S-2 | `location.package` del `MoveAbort` en los tres caminos (`SimulationError.executionError`, `getTransaction` gRPC y `extractStatusFromEffectsBcs(effects.bcs)`): formato exacto y si normaliza a `originalPackageId` | DL-4 |
| S-3 | `message` de cada `SimulationError` (¿formato V-6?) | regex del SDK en `errors.ts` |
| S-4 | `getBalance` de `A` antes y después de crear: `balance`, `coinBalance`, `addressBalance` | DL-8 |
| S-5 | `waitForTransaction({ digest })` de una transacción recién ejecutada: ms y `checkpoint` del resultado | DL-5 |

**STOP contingente** (se para y se reporta antes de TASK-2): S-2 da un `package` que no normaliza a la dirección del
paquete; o S-1 muestra que `getTransaction` responde **con** `checkpoint` antes de que `getObject` vea la versión nueva.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/scripts/localnet-guard.mjs` (nuevo), `app/scripts/capture-tx-fixtures.mjs` (nuevo),
  `app/scripts/capture-read-fixtures.mjs` (solo para usar la guarda compartida), `contracts/fixtures/game-tx.localnet.json`
  (nuevo), `contracts/README.md`.
- **NO tocar:** `app/src/`, `app/eslint.config.js`, `contracts/sources/`, `contracts/tests/`, `contracts/scripts/`,
  `contracts/Move.lock`, `contracts/fixtures/game-reads.localnet.json`, `package*.json`, `.github/`.
  `contracts/deployments/localnet.json` existe solo durante la corrida y el cierre lo borra.

### 5. Tests obligatorios
Ninguno nuevo (los consumen TASK-2/3). Gate de la app y job `contracts` en verde, sin delta.

### 6. Smoke
No aplica como smoke del ciclo; la corrida es la captura. Registrar: chain id corto, digests de cada transacción, S-1..S-5
y el cierre del paso 7 (`stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base, `kill -0` falla, `<SMOKE_DIR>`
borrado, sin `contracts/deployments/`, `git diff --exit-code -- contracts/Move.lock`).

### 7. Criterios de aceptación
- La fixture tiene `_meta`, `house`, los 7 `simulationErrors`, los 5 `executed` y `cliErrorText`; **sin claves ni frases
  y sin `sender`** (solo IDs y direcciones efímeras dentro de los datos del contrato).
- Dos corridas sobre la misma red dan el mismo archivo salvo `_meta.capturedAt` (`diff` pegado).
- `node app/scripts/capture-tx-fixtures.mjs --url https://fullnode.testnet.sui.io:443` **y**
  `node app/scripts/capture-read-fixtures.mjs --url https://fullnode.testnet.sui.io:443` salen con código **2** y su
  motivo, sin pedidos (salidas pegadas; para probar "sin pedidos", la técnica del `fetch` trampa de #10).
- `git diff --exit-code -- contracts/fixtures/game-reads.localnet.json` ⇒ 0 (M-4).
- `grep -nE "^import .*(@mysten|node:http|node:https|node:net)" app/scripts/localnet-guard.mjs` vacío (M-4).
- S-1..S-5 respondidas; STOP contingente evaluado.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## TASK-2: maquinaria pura de transacciones — área: app (`sui/`)

### 1. Historia de usuario del task
**Como** desarrollador de las acciones del juego (#11, #12, #14), **quiero** builders de PTB, un mapeo único de abort
codes y funciones puras para verificar, confirmar e interpretar una transacción, **para** que toda acción use el mismo
camino honesto y los mismos mensajes. **No entrega:** hooks ni UI.

### 2. Contexto
- Modelos a replicar: `sui/gameDetail.ts` (cliente acotado `Pick<SuiGrpcClient, …>`, `withReadTimeout`), `sui/game.ts`
  (`parseExactBcs`, `isExactType`), `sui/events.ts` (`parseGameCreated`, `parseGameCancelled`, `RawGameEvent`),
  `sui/readPolicy.ts` (`isTransientReadError`), `sui/format.ts` (`U64_MAX`, `shortAddress`).
- Fixtures: `contracts/fixtures/game-tx.localnet.json` (TASK-1), importada como `config.test.ts` (`import.meta.glob`
  eager).
- V-4..V-9, V-11, V-12 y los resultados de S-2/S-3 del reporte de TASK-1.

### 3. Qué implementar
1. **`sui/transactions/game.ts`** (DL-1): los tres builders del §4. `buildCreateGameTx`: `const [coin] =
   tx.splitCoins(tx.gas, [tx.pure.u64(bet)])`; `tx.moveCall({ target: \`${packageId}::game::create_game\`, arguments:
   [tx.object(houseId), coin, tx.pure.option('address', opponent)] })`. Cancel y reject: `moveCall` con
   `[tx.object(gameId)]`. Lanzan `Error` ante `packageId`/`houseId`/`gameId`/`opponent` inválidos
   (`isValidSuiObjectId`/`isValidSuiAddress`) y `bet <= 0n` o `bet > U64_MAX`. Sin `setSender` ni gas.
2. **`sui/errors.ts`** (DL-4):
   - `ABORT_MESSAGES` con la tabla de abajo (único lugar con esos textos).
   - `findMoveAbort(source)` en este orden, recorriendo `cause` hasta 5 niveles: (a) objeto con `$kind === 'MoveAbort'` y
     `MoveAbort.abortCode` (un `ExecutionError`), o con `status.error` así (un resultado); (b) `SimulationError` →
     `executionError`, o su `message` si falta; (c) `Error` (o string) por **mensaje**, con dos regex: formato del SDK
     (`abort code: (\d+), in '(0x[0-9a-fA-F]+)::(\w+)::`) y formato Rust/CLI (`ModuleId \{ address: (0x)?([0-9a-fA-F]+),
     name: Identifier\("(\w+)"\) \}.*?\}, (\d+)\)`). Devuelve `{ packageId: normalizeSuiAddress(…), module, code }`.
   - `abortCodeSuffix(info)` = `(código ${module}/${code})` exacto (M-5).
   - `transactionErrorMessage(source, ids)`: con abort de `packageId` u `originalPackageId` (normalizados) y código
     conocido ⇒ `"<mensaje> <sufijo>"`; código desconocido de `house`/`game` ⇒ `"El contrato rechazó la operación
     <sufijo>"`; abort de otro paquete ⇒ `"La transacción abortó en <shortAddress(pkg)>::<módulo> (código <n>)"`; sin
     abort y con `ExecutionError` (V-7, gas, objetos) ⇒ `"La red no ejecutó la transacción: <message>"`; cualquier otro
     error ⇒ `"La wallet no completó la operación: <mensaje>"`.
3. **`sui/execution.ts`** (DL-2, DL-3, DL-5, M-3):
   - `preflightTransaction(client, tx, sender, signal?)`: copia con `Transaction.from(await tx.toJSON())`,
     `setSender(sender)`, `build({ client })`, con corte `TX_PREFLIGHT_TIMEOUT_MS`. Un `SimulationError` se **relanza tal
     cual** (lo mapea `errors.ts`). Un error transitorio (`isTransientReadError`) o el corte se relanzan como
     `PreflightNetworkError` (con `cause`), cuyo texto es `PREFLIGHT_NETWORK_MESSAGE` = "No se pudo verificar la
     transacción (red); intenta de nuevo" (M-3 (a)). Cualquier otro error se relanza tal cual.
   - `confirmTransaction(client, { digest, signal })`: `client.waitForTransaction({ digest, include: { effects: true,
     events: true }, timeout: TX_CONFIRM_TIMEOUT_MS, signal })`; relanza el error del corte.
   - `waitForCheckpoint(client, { digest, signal })`: `getTransaction` con `withReadTimeout` por intento, cada 500 ms,
     hasta que trae `checkpoint` (⇒ `true`) o vence `TX_INDEX_TIMEOUT_MS` (⇒ `false`); los errores de cada intento no
     cortan el bucle (el tope sí). En particular, el "not found" (`TransactionError` `notFound`) que da
     `getTransaction` mientras la transacción no está indexada (S-1 bis de TASK-1) es un intento fallido.
   - `classifyExecution(result)`: por `status.success` del resultado del nodo.
   - `digestFromError(error)`: busca en el error y su `cause` (hasta 5 niveles) una propiedad `digest` string que pase
     `isValidTransactionDigest`; si no, `null` (M-3 (b)).
   - `networkCost(gasUsed)` = `computationCost + storageCost − storageRebate` (`bigint`).
4. **`sui/gameTx.ts`** (DL-9, DL-10): `parseCreatedGame` (filtra los eventos del resultado por tipo `GameCreated` con
   `gameEventType`, exige **exactamente uno**, lo parsea con `parseGameCreated` y exige `sameAddress(creator, sender)`; si
   no, `null`) y `cancelledRefund` (único `GameCancelled` con `game_id` = `gameId`, su `refund`; si no, `null`). Los
   eventos del SDK se adaptan a `RawGameEvent` con el `digest` del resultado y `checkpoint` `null`.

**Mensajes de abort** (`ABORT_MESSAGES`, aprobados con el plan):

| Módulo | Código | Mensaje |
|---|---|---|
| `game` | 0 | La apuesta es menor que el mínimo de la House. |
| `game` | 1 | La apuesta supera el máximo de la House. |
| `game` | 2 | No puedes invitarte a ti mismo. |
| `game` | 3 | Solo quien creó la partida puede cancelarla. |
| `game` | 4 | La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. |
| `game` | 5 | Esta invitación es para otra dirección. |
| `game` | 6 | La partida es abierta: no hay invitación que rechazar. |
| `game` | 7 | La partida es de otra versión del juego: solo se puede cancelar o rechazar. |
| `game` | 8 | La partida pertenece a otra House. |
| `game` | 9 | No puedes aceptar tu propia partida. |
| `game` | 10 | El pago tiene que igualar exactamente la apuesta. |
| `house` | 0 | La comisión supera el máximo que permite el contrato. |
| `house` | 1 | Límites inválidos: el mínimo tiene que ser mayor que 0 y no superar el máximo. |
| `house` | 2 | No hay comisiones para retirar. |
| `house` | 3 | La House está en una versión distinta de la de esta app: hay que actualizar la app. |
| `house` | 4 | La House ya está en la versión de este paquete. |

### 4. Archivos a tocar / NO tocar
- **Tocar (nuevos, con su `.test.ts`):** `app/src/sui/transactions/game.ts`, `app/src/sui/errors.ts`,
  `app/src/sui/execution.ts`, `app/src/sui/gameTx.ts`.
- **NO tocar:** el resto de `app/src/` (salvo los tests nuevos), `app/eslint.config.js`, `contracts/`, `package*.json`.

### 5. Tests obligatorios
- **Builders:** target `<packageId>::game::create_game` / `cancel_game` / `reject_game`; `commands` en orden
  `SplitCoins{GasCoin}` → `MoveCall`; `NestedResult [0,0]` como `stake`; `Pure` decodificados con `bcs`
  (`bcs.u64()` = `bet`; `bcs.option(bcs.Address)` `null` y la dirección normalizada); House y `Game` como
  `UnresolvedObject` con el ID dado; lanzan con ID inválido, `opponent` inválido, `bet` 0 y `bet` = `U64_MAX + 1`.
- **`errors.ts`:** **un test por cada código** de `house` 0–4 y `game` 0–10 (`ExecutionError` con la forma de la fixture
  y el texto de la tabla); los **7** `SimulationError` reales de la fixture; el fallo ejecutado real por los **dos**
  caminos (`getTransaction` gRPC y `extractStatusFromEffectsBcs` del `effects.bcs` real); el texto del SDK generado con
  `formatMoveAbortMessage`; el `cliErrorText` real; `cause` anidado (2 niveles) y corte en el nivel 6; `package` en forma
  corta y en mayúsculas ⇒ se reconoce; `packageId` ≠ `originalPackageId`, ambos reconocidos; `game`/99 ⇒ "El contrato
  rechazó la operación (código game/99)"; abort de otro paquete; `house`/3 ≠ `game`/3; `Unknown`
  (`ExecutionCancelledDueToRandomnessUnavailable`) y `CongestedObjects` ⇒ "La red no ejecutó la transacción: …"; error
  de wallet sin abort ⇒ su mensaje. **R-1 (negativo):** `Error executing transaction '<digest>': 1st command aborted
  within function '0x<PKG>::game::cancel_game' at instruction 16 with code 3` ⇒ `findMoveAbort` devuelve `null` y
  `transactionErrorMessage` da el fallback "La wallet no completó la operación: …". **`cliErrorText`** de la fixture
  (`effects.status.error` del nodo, formato Rust) ⇒ `{ module: 'game', code: '3' }` con el `packageId` normalizado.
  **M-5:** `abortCodeSuffix({ module: 'game', code: '3', … }) === '(código game/3)'` y
  el mensaje completo de `game`/3 es exactamente `"Solo quien creó la partida puede cancelarla. (código game/3)"`.
- **`execution.ts`** (cliente falso; timers falsos donde haya cortes): `preflightTransaction` éxito (la copia lleva el
  `sender`; el `tx` original queda sin `sender`), `SimulationError` relanzado tal cual, `RpcError`-like `UNAVAILABLE` ⇒
  `PreflightNetworkError` con su texto, corte de 20 s ⇒ `PreflightNetworkError`, error no transitorio (`Error('No valid
  gas coins found for the transaction.')`) relanzado tal cual; `confirmTransaction` devuelve la lectura del nodo y
  propaga el corte; `waitForCheckpoint` `true` al 2.º intento, `true` tras un intento que falla, `false` al tope;
  **S-1 bis** (timers falsos): `TransactionError` `notFound` ×3 y luego `checkpoint` ⇒ `true`; siempre `notFound` ⇒
  `false` al vencer `TX_INDEX_TIMEOUT_MS`;
  `classifyExecution` con los `executed` reales (éxito y fallo); `digestFromError` con digest en el error, en `cause`,
  digest inválido ⇒ `null`, sin digest ⇒ `null`; `networkCost` con el `gasUsed` real de `createOpen`.
- **`gameTx.ts`:** `parseCreatedGame` con `createOpen` y `createInvite` reales (ID, `feeRate` 250, `opponent`); sin
  eventos, dos `GameCreated`, tipo de otro paquete y creador ≠ `sender` ⇒ `null`; `cancelledRefund` con `cancel` y
  `reject` reales (= `bet`) y con otro `gameId` ⇒ `null`.

### 6. Smoke
No aplica (funciones puras; las cubre el smoke del ciclo).

### 7. Criterios de aceptación
Ningún `any`; sin red ni React en `sui/`; los textos de abort solo en `ABORT_MESSAGES`; cada código con su test; el gate
de la app en verde con el conteo nuevo.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-3: House, saldo, validación del formulario y predicados — área: app (`sui/`)

### 1. Historia de usuario del task
**Como** jugador que llena el formulario, **quiero** que la app conozca los límites y la comisión reales de la House, mi
saldo y quién puede cancelar o rechazar cada partida, **para** ver errores claros antes de firmar y no ver botones que no
me corresponden. **No entrega:** hooks ni UI.

### 2. Contexto
- `contracts/sources/house.move:30-39`: `House { id: UID, version: u64, fee_rate: u16, fees_collected: Balance<SUI>,
  min_bet: u64, max_bet: u64 }`; invariantes `0 < min_bet <= max_bet` (`contracts/README.md`, "Objetos" de la House).
- Modelos: `sui/game.ts` (`parseGameObject`, BCS exacto, `ReadDataError`), `sui/gameDetail.ts` (`fetchGame`),
  `sui/ids.ts` (`parseObjectIdInput`), `sui/format.ts` (`parseSuiToMist`, `formatMist`, `formatBps`).
- `useGame.ts:38` (`refetchInterval: GAME_REFETCH_MS`) es el pendiente de #10.

### 3. Qué implementar
1. **`sui/house.ts`:** esquema BCS en el orden de `house.move`; `parseHouseObject` = tipo exacto
   `<originalPackageId>::house::House` (`wrong_type`), dueño `Shared` (`not_shared`), `parseExactBcs`, invariantes
   `min_bet > 0` y `min_bet <= max_bet` (`invariant`); **no** valida `fee_rate <= 1000` (regla de `agents.md` §5).
   `fetchHouse` con `withReadTimeout` (`getObject` con `include: { content: true }`); un `ObjectError` (no existe) se
   relanza tal cual: no es transitorio (`isTransientReadError`), así que no se reintenta.
2. **`sui/account.ts`:** `fetchSuiBalance` = `BigInt((await getBalance({ owner, signal })).balance.balance)` con
   `withReadTimeout`.
3. **`sui/createGame.ts`** (DL-8, DL-13, M-2):
   - `validateCreateGame` devuelve motivos tipados: `amount`: `empty`, `invalid`, `too_many_decimals`, `below_min`,
     `above_max`, `insufficient_balance`; `opponent`: `invalid`, `self_invite`; más `balanceUnknown: boolean` (con saldo
     `null` no bloquea). Monto: `parseSuiToMist` (`negative`/`invalid` ⇒ `invalid`; `too_large` ⇒ `above_max`); límites
     inclusive; saldo: `bet + CREATE_GAS_RESERVE_MIST <= balance`. Invitación: vacía ⇒ abierta; si no, `trim` y
     `parseAddressInput`; `sameAddress(opponent, account)` ⇒ `self_invite`.
   - `houseTermsChanges(shown, fresh)`: `null` si `feeRate`, `minBet` y `maxBet` coinciden; si no, `{ fee?: { from, to },
     limits?: { from: { minBet, maxBet }, to: { minBet, maxBet } } }`.
   - `houseChangeMessage(change)`: comisión ⇒ `"La comisión cambió de <formatBps(from)> a <formatBps(to)>; revisa y
     vuelve a confirmar"`; límites ⇒ `"Los límites de apuesta cambiaron (mínimo <a> → <b> SUI, máximo <c> → <d> SUI);
     revisa y vuelve a confirmar"`; si cambian los dos, las dos frases en ese orden.
4. **`sui/gameActions.ts`:** `canCancel` = cuenta no nula, `sameAddress(cuenta, game.creator)` y `state.kind ===
   'pending'`; `canReject` = cuenta no nula, `game.opponent !== null`, `sameAddress(cuenta, game.opponent)` y `pending`.
5. **`sui/ids.ts`:** `parseAddressInput` con el mismo pre-chequeo `HAS_HEX_DIGITS`, `normalizeSuiAddress` e
   `isValidSuiAddress` (comparte el helper privado; `parseObjectIdInput` no cambia de comportamiento).
6. **`sui/gameDetail.ts`:** `gameRefetchInterval(state)` = `false` si `state.status === 'error' &&
   !isTransientReadError(state.error)`; si no, `GAME_REFETCH_MS` (DL-7).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/house.ts`, `account.ts`, `createGame.ts`, `gameActions.ts` (nuevos, con tests);
  `app/src/sui/ids.ts` y `gameDetail.ts` (+ sus tests).
- **NO tocar:** `hooks/`, `components/`, `pages/`, el resto de `sui/` y todo lo de §3.

### 5. Tests obligatorios
- `parseHouseObject` con `house` real de la fixture (valores = los de la génesis: `fee_rate` 250, `min_bet` 1000000,
  `max_bet` 50000000000); bytes truncados, byte sobrante, tipo ajeno, dueño no compartido, `min_bet` 0, `min_bet >
  max_bet` ⇒ `ReadDataError` con su motivo; `fee_rate` 1001 bien formado parsea. `fetchHouse` (cliente falso): ok, no
  existe ⇒ no transitorio. `fetchSuiBalance`: valor, corte de 10 s.
- `validateCreateGame`: vacío, `abc`, `-1`, 10 decimales, `0.0009` (debajo), `0.001` (igual al mínimo), `50` (igual al
  máximo), `50.000000001` (encima), saldo justo (`bet + reserva`) y uno menos, saldo `null` (no bloquea,
  `balanceUnknown`), sin invitación, invitación válida con espacios alrededor, inválida, forma corta y mayúsculas
  (normaliza), la propia cuenta en otro formato ⇒ `self_invite`.
- `houseTermsChanges`/`houseChangeMessage`: sin cambios ⇒ `null`; solo comisión (250 → 300 ⇒ "La comisión cambió de
  2.5 % a 3 %; revisa y vuelve a confirmar"); solo mínimo; solo máximo; ambos (dos frases).
- `canCancel`/`canReject`: sin cuenta; otra cuenta; creador en `pending`/`cancelled`/`resolved`; invitado en `pending`;
  partida abierta (`canReject` `false`); dirección en otro formato; el creador de una invitación (`canCancel` `true`,
  `canReject` `false`).
- `parseAddressInput`: los mismos casos que `parseObjectIdInput`.
- `gameRefetchInterval`: éxito, error `UNAVAILABLE` (15 s), `GameNotFoundError`, `NotAGameError`, `ReadDataError` (`false`).

### 6. Smoke
No aplica.

### 7. Criterios de aceptación
La House real parsea; validación y predicados puros con motivos tipados (los textos de validación los pone TASK-5); gate
en verde.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-4: hooks — área: app (`hooks/`)

### 1. Historia de usuario del task
**Como** desarrollador de las pantallas, **quiero** un hook de ejecución que verifique, firme, confirme con el nodo,
espere la indexación e invalide, y hooks finos para crear, cancelar y rechazar, **para** que ninguna pantalla pueda
mostrar un éxito falso ni mandar dos veces la misma transacción. **No entrega:** UI.

### 2. Contexto
- Modelos: `hooks/useGame.ts` (`useCurrentClient`, `useAppConfig`, `queryKeys`), `hooks/useLobby.ts:116-119` (`refresh`
  = `resetQueries`), `test/queryHarness.tsx` (`createPolicyQueryClient`, `advance`), `hooks/useGame.test.tsx` (mocks del
  kit).
- `useDAppKit` (V-1) desde la raíz de `@mysten/dapp-kit-react`; `useCurrentAccount` para el `sender`.

### 3. Qué implementar
1. **`queryKeys.ts`:** `house: (network, houseId) => ['sui', network, 'house', houseId]`, `balance: (network, address) =>
   ['sui', network, 'balance', address]` (la dirección normalizada).
2. **`txInvalidation.ts`** (DL-6): `create` ⇒ `reset: [lobby]`, `invalidate: [balance(cuenta)]`; `cancel` y `reject` ⇒
   `reset: [lobby]`, `invalidate: [game(id), balance(cuenta)]`. Nunca `nodeInfo`, `txInfo`, `publishCheckpoint`,
   `checkpointTime`.
3. **`useExecuteTransaction.ts`** (DL-2, DL-3, DL-5, DL-11, M-1, M-3): `useMutation({ retry: false, mutationFn })` y un
   `useState` para la etapa. `execute(input)`:
   - **Candado (M-1):** `const lock = useRef(false)`; `execute` hace, **antes de cualquier `await`**, `if (lock.current)
     return; lock.current = true;` y libera en `finally`. `isBusy` = candado tomado o `mutation.isPending`.
   - **`preflight`:** sin cuenta ⇒ `failure` "Conecta tu wallet". `input.precheck?.(signal)` (M-2): si devuelve `stop`
     ⇒ `failure` con ese texto, invalida sus claves y **no** sigue. Luego `preflightTransaction(client, input.build(),
     cuenta)`. Errores: `PreflightNetworkError` (o error transitorio/corte del `precheck`) ⇒ `failure` con
     `PREFLIGHT_NETWORK_MESSAGE`, sin `errors.ts` (M-3 (a)); `SimulationError` ⇒ `failure` con
     `transactionErrorMessage` (y, si es un abort, se aplican las invalidaciones de la acción: el estado pudo cambiar);
     otro ⇒ `failure` con `transactionErrorMessage`. En todos, la wallet **no** se llama.
   - **`signing`:** `dAppKit.signAndExecuteTransaction({ transaction: input.build() })` (el `Transaction` sin
     construir). Si lanza: `digestFromError(error)`; con digest ⇒ sigue a `confirming` con ese digest (M-3 (b)); sin
     digest ⇒ `failure` con `transactionErrorMessage(error)`.
   - **`confirming`:** con el digest de la wallet, `confirmTransaction`. Si el nodo responde: `classifyExecution` ⇒
     `failure` con el mensaje de sus efectos, el digest y `cost = networkCost(effects.gasUsed)` (más las invalidaciones
     de la acción) o sigue a `indexing`. Si `confirmTransaction` falla o vence: `unconfirmed` con el digest e
     invalidaciones de la acción (M-3 (b): **nunca** `failure` desde aquí). `unconfirmed` es **solo** para "el nodo no
     respondió o venció el corte".
   - **`indexing`:** si el resultado de `confirmTransaction` ya trae `checkpoint` (S-1 bis: lo normal en el camino de la
     wallet), la etapa se salta **sin pedidos** (`indexed: true`); si trae `checkpoint` `null`, va `waitForCheckpoint`.
     Luego `await` de `resetQueries`/`invalidateQueries` de
     `transactionInvalidations(action, …)`; `outcome` = `success` con `value`, `indexed`, `cost =
     networkCost(effects.gasUsed)` y el digest. `value = input.interpret(nodeResult)` dentro de un `try`: si `interpret`
     lanza (el nodo **ya confirmó** el éxito), `value: null` (NIT-1 de v1.1, como DL-9); el éxito y las invalidaciones
     no cambian.
   - Todo dentro de la `mutationFn`; nunca lanza hacia el componente (LIM-8: todo termina en un `outcome` con mensaje).
     `reset()` vuelve a `idle` (no con el candado tomado).
4. **`useCreateGame.ts`:** `create({ bet, opponent, shown: HouseTerms })` ⇒ `execute({ action: { kind: 'create' }, build:
   () => buildCreateGameTx({ packageId, houseId, bet, opponent }), precheck: fetchHouse + houseTermsChanges ⇒ { stop:
   houseChangeMessage, invalidate: [house] }, interpret: (r) => { created: parseCreatedGame(r, …), feeChanged:
   created !== null && created.feeRate !== shown.feeRate ? { from: shown.feeRate, to: created.feeRate } : null } })`
   (M-2).
5. **`useCancelGame.ts` / `useRejectGame.ts`:** `execute` con su builder y `interpret: (r) => cancelledRefund(r, …)`.
6. **`useHouse.ts`:** `useQuery` con `queryKeys.house`, `fetchHouse`, sin intervalo (refetch al montar y al foco por
   defecto); devuelve `house`, `ReadStatus`, `refetch`, `isFetching`.
7. **`useSuiBalance.ts`:** `useQuery` con `queryKeys.balance`; sin cuenta, `skipToken`.
8. **`useGame.ts`:** `refetchInterval: (query) => gameRefetchInterval(query.state)` (DL-7).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/hooks/queryKeys.ts`, `useGame.ts` (+ tests); nuevos con tests: `txInvalidation.ts`,
  `useExecuteTransaction.ts`, `useCreateGame.ts`, `useCancelGame.ts`, `useRejectGame.ts`, `useHouse.ts`,
  `useSuiBalance.ts`.
- **NO tocar:** `sui/` (salvo que un test revele un bug de TASK-2/3: se reporta como desviación), `components/`,
  `pages/`, `providers/`.

### 5. Tests obligatorios
Patrón `useGame.test.tsx` (`useCurrentClient`, `useAppConfig`, `useCurrentAccount` y `useDAppKit` mockeados;
`vi.mock('../sui/execution')` donde haga falta; `createPolicyQueryClient`; timers falsos con `advance`):
- **Camino feliz:** etapas `preflight → signing → confirming → indexing → done` en orden; `outcome` `success` con digest,
  `cost` e `indexed: true`; invalidaciones exactas (espías de `resetQueries`/`invalidateQueries` con las claves de
  `queryKeys`) para `create`, `cancel` y `reject`; ninguna sobre claves inmutables.
- **M-1:** dos `execute` en el **mismo tick** (sin `await` entre ellos) ⇒ `preflightTransaction` y
  `signAndExecuteTransaction` llamados **una** vez; tras terminar, un tercer `execute` sí corre (el candado se liberó,
  también después de un `failure`).
- **M-2:** `precheck` con comisión cambiada ⇒ `failure` con el texto de `houseChangeMessage`, invalida `house`, **sin**
  preflight ni wallet; `useCreateGame` con `GameCreated` de `feeRate` distinto del mostrado ⇒ `success` con
  `feeChanged`; igual ⇒ `feeChanged: null`.
- **M-3 (a):** preflight con `PreflightNetworkError` ⇒ `failure` con `PREFLIGHT_NETWORK_MESSAGE` y la wallet no se llama;
  `precheck` con `UNAVAILABLE` ⇒ mismo texto; `transactionErrorMessage` no se llama en ninguno de los dos (espía).
- **M-3 (b):** la wallet lanza un error con `digest` válido y el nodo confirma éxito ⇒ `success`; el mismo error y el nodo
  no responde ⇒ `unconfirmed` con ese digest (nunca `failure`); la wallet devuelve digest y `confirmTransaction` vence ⇒
  `unconfirmed` e invalida. **NIT-1:** el nodo confirma éxito y `interpret` lanza ⇒ `success` con `value: null`, el
  digest, `cost` e `indexed`, con las invalidaciones normales (espías), nunca `unconfirmed`; el nodo responde
  `status.success: false` ⇒ `failure` con el mensaje de los efectos, el digest y `cost`.
- **Otros:** preflight con `SimulationError` de la fixture ⇒ `failure` con el mensaje mapeado y la wallet no se llama; la
  wallet rechaza sin digest ⇒ `failure` con su mensaje; la wallet dice éxito y el nodo dice fallo ⇒ `failure` con el
  mensaje de los efectos y el digest; **S-1 bis:** `confirmTransaction` con `checkpoint` ⇒ ningún llamado a
  `waitForCheckpoint` e invalidación inmediata; con `checkpoint` `null` ⇒ `waitForCheckpoint` y después la
  invalidación (orden verificado con espías); `waitForCheckpoint` `false` ⇒ `success` con `indexed: false` e invalida igual; el
  componente se desmonta durante `confirming` ⇒ las invalidaciones ocurren igual; sin cuenta ⇒ `failure` sin llamadas.
- `useCreateGame` devuelve el ID de `createOpen`; `useCancelGame`/`useRejectGame` el `refund` de la fixture;
  `transactionInvalidations` tabla completa; `useGame` tras `NOT_FOUND` no vuelve a pedir en 2 × 15 s y con
  `UNAVAILABLE` sí; `useHouse`/`useSuiBalance` (sin cuenta no consulta) con la política común.

### 6. Smoke
No aplica (lo cubre el smoke del ciclo).

### 7. Criterios de aceptación
Una sola máquina de estados para las tres acciones; ningún `success` sin la lectura del nodo; ningún `failure` derivado
de un error de la wallet o del SDK con digest; sin `useEffect` para datos; gate en verde.

### 8. Al terminar
Reporte §5. Sin commits.

---

## TASK-5: formulario, botones y estado de transacción — área: app (`components/`, `pages/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** un formulario para crear la partida y los botones "Cancelar" y "Rechazar" en el detalle,
con el estado de cada transacción a la vista, **para** hacer las tres acciones desde la app y saber siempre en qué
quedaron. **No entrega:** lógica nueva (todo sale de los hooks).

### 2. Contexto
- Modelos: `components/ReadState.tsx`, `components/GameDetail.tsx`, `pages/GameDetailPage.tsx`, `pages/HomePage.tsx`,
  tests de `GameDetailPage.test.tsx`/`LobbyList.test.tsx` (hooks mockeados).
- `explorerTxUrl(network, digest)` (`null` en localnet ⇒ digest abreviado como texto).

### 3. Qué implementar
1. **`components/TransactionStatus.tsx`** (DL-12): por etapa: "Verificando la transacción…", "Esperando la firma en la
   wallet…", "Confirmando en la red…", "Actualizando datos…" (`role="status"`); `success`: el texto de éxito que recibe
   por props, el digest (link en testnet, texto en localnet), y si `indexed` es `false`, "La lista puede tardar unos
   segundos en mostrarlo"; `unconfirmed` (`role="alert"`): "La transacción se envió pero la red no la confirmó todavía;
   revísala antes de volver a intentar" + digest; `failure` (`role="alert"`): el mensaje + digest y costo de red si los hay.
2. **`components/CreateGameForm.tsx`** (DL-8, DL-13, M-2): sin cuenta, deshabilitado con "Conecta tu wallet para crear
   una partida". Con cuenta: `useHouse` (con `ReadState` si no está lista: sin House no se puede crear), `useSuiBalance`,
   `useCreateGame`. Campos "Apuesta (SUI)" (`inputMode="decimal"`) e "Invitar a (opcional)". Muestra "Mínimo <min> SUI ·
   máximo <max> SUI", "Saldo: <saldo> SUI" (o "No se pudo leer tu saldo"), "Comisión <formatBps> (la partida guarda esta
   comisión)", la estimación "Si alguien acepta: pozo <p> SUI · comisión <c> SUI · al ganador <g> SUI"
   (`resolutionAmounts`) y la nota "Además del gas, crear la partida deja un depósito de almacenamiento (≈ <open> SUI
   abierta, ≈ <invitation> SUI con invitación, al precio actual de testnet) que no se recupera" (`GAME_STORAGE_DEPOSIT_MIST`).
   Errores por campo (textos: `empty` "Escribe la apuesta en SUI"; `invalid` "Monto inválido"; `too_many_decimals` "Como
   máximo 9 decimales"; `below_min` "La apuesta mínima es <min> SUI"; `above_max` "La apuesta máxima es <max> SUI";
   `insufficient_balance` "Saldo insuficiente: necesitas la apuesta más ≈ 0.01 SUI para el gas"; `opponent.invalid`
   "Dirección inválida"; `self_invite` "No puedes invitarte a ti mismo"). "Crear partida" deshabilitado si no valida o
   `isBusy`; al enviar pasa `shown` = los términos de la House que se están mostrando (M-2). Con `success` y partida
   identificada ⇒ `navigate('/game/<id>', { state: { created: { digest, cost, invitation, feeChanged } } })`; sin
   partida identificada (`value` `null` o `created` `null`) ⇒ queda en la portada con "Partida creada" + "No se pudo identificar la partida creada" y el
   digest.
3. **`components/GameActions.tsx`** (DL-10): "Cancelar" si `canCancel`, "Rechazar" si `canReject` (nunca los dos para la
   misma cuenta), deshabilitados con `isBusy`, cada uno con su `TransactionStatus`. Éxito: "Partida cancelada: se
   devolvieron <refund> SUI a tu cuenta" / "Invitación rechazada: se devolvieron <refund> SUI a quien te invitó" (si
   `refund` es `null`: "Partida cancelada" / "Invitación rechazada" sin monto).
4. **`pages/HomePage.tsx`:** `CreateGameForm` arriba de `LobbyList`.
5. **`pages/GameDetailPage.tsx`:** `GameActions` debajo del detalle; aviso de creación desde `useLocation().state`
   (`TransactionStatus` en `success` con "Partida creada" y "Costo de red: <cost> SUI (incluye el depósito de
   almacenamiento, que no se recupera)"; si `invitation`: "Comparte el enlace de esta página con el invitado; guárdalo
   para volver a esta partida"; si `feeChanged`: "La partida se creó con comisión <to> (el formulario mostraba <from>)").

### 4. Archivos a tocar / NO tocar
- **Tocar:** nuevos con tests: `components/TransactionStatus.tsx`, `CreateGameForm.tsx`, `GameActions.tsx`;
  `pages/HomePage.tsx`, `pages/GameDetailPage.tsx` (+ tests); `src/index.css` solo lo mínimo para errores de campo.
- **NO tocar:** `sui/`, `hooks/` (salvo bug declarado), `App.tsx`, `Header.tsx`, `LobbyList.tsx`.

### 5. Tests obligatorios
Hooks mockeados: formulario sin cuenta; House cargando, con error y "Reintentar"; cada error de validación con su texto;
saldo desconocido; estimación con la comisión de la House (250 ⇒ "2.5 %", pozo/comisión/ganador de `resolutionAmounts`);
nota del depósito; botón deshabilitado con `isBusy`; envío con `shown` = términos mostrados; navegación al detalle con el
`state` tras el éxito y sin navegar si no hay ID; `TransactionStatus` en cada etapa, éxito con link (testnet) y con
digest en texto (localnet), `indexed: false`, `unconfirmed`, `failure` con y sin digest; `GameActions` oculto sin
cuenta, para otra cuenta y en `cancelled`/`resolved`, "Cancelar" para el creador, "Rechazar" solo para el invitado,
textos de reembolso; detalle con el aviso de creación, el texto de compartir (invitación) y el de comisión cambiada.

### 6. Smoke
El del ciclo (abajo).

### 7. Criterios de aceptación
Ningún componente arma transacciones, IDs, validaciones ni mensajes de abort; de `@mysten/*` solo
`@mysten/dapp-kit-react/ui`; sin `dangerouslySetInnerHTML`; gate en verde.

### 8. Al terminar
Reporte §5. Sin commits. Después, el MID genera `documents/SMOKE_CREATE_CANCEL.md` tras TASK-6.

---

## TASK-6: docs del ciclo — área: docs

### 1. Historia de usuario del task
**Como** quien mantiene la app (y los planes de #12, #13 y #14), **quiero** que los README, `agents.md` y `STATUS.md`
describan la maquinaria de transacciones tal como quedó, **para** reutilizarla sin leer el código.

### 2. Contexto
Reportes de TASK-1..5; `app/README.md` (mapa de `sui/`, hooks, "Lecturas (#10)", "Wallet", "Pendientes conocidos");
`contracts/README.md` ("Abort codes", "Objeto terminal y storage"); `agents.md` §5.

### 3. Qué implementar
- **`app/README.md`:** mapa de `sui/` (`transactions/game.ts`, `errors.ts`, `execution.ts`, `gameTx.ts`, `house.ts`,
  `account.ts`, `createGame.ts`, `gameActions.ts`) y de hooks (`useExecuteTransaction`, `useCreateGame`, `useCancelGame`,
  `useRejectGame`, `useHouse`, `useSuiBalance`, claves `house`/`balance`, `txInvalidation.ts`); sección "Transacciones
  (#11)": relectura de la House y preflight (sin abrir la wallet), confirmación por el nodo, "sin confirmar", indexación,
  tabla de invalidación, cortes (con los valores calibrados por S-1), candado contra doble envío, mensajes de abort con
  su sufijo `(código <módulo>/<n>)` y fallbacks; reglas del formulario (límites y comisión de la House, reserva de gas,
  depósito de storage); "Wallet": la burner nace sin fondos y cambia de dirección al recargar, cómo fondearla por CLI en
  la localnet aislada; "Pendientes conocidos" sin el de `useGame` (resuelto) y sin "qué refrescar" (resuelto).
- **`contracts/README.md`:** "Abort codes": espejo implementado en `app/src/sui/errors.ts` (mensajes por módulo +
  código); "Objeto terminal y storage": la UI lo muestra al crear (nota previa + costo real).
- **`agents.md` §5:** fila "Layout BCS de la House" ↔ `app/src/sui/house.ts` (fixture `game-tx.localnet.json`); §2 si el
  layout de `app/scripts/` cambió (guarda compartida).
- **`documents/STATUS.md`:** baseline de la app (conteo por archivo), fila #11 🚧 con TASK-1..5, D-20261102-05.

### 4. Archivos a tocar / NO tocar
Solo `app/README.md`, `contracts/README.md`, `agents.md`, `documents/STATUS.md`. Nada de código.

### 5. Tests obligatorios
Ninguno; gate de la app sin delta.

### 6. Smoke
No aplica.

### 7. Criterios de aceptación
Sin rutas personales; los números coinciden con los reportes; `grep -n "#11/#12\|quedan para #11" app/README.md` sin
pendientes vigentes ya resueltos.

### 8. Al terminar
Reporte §5. Sin commits.

---

## Smoke del ciclo (después de TASK-6; el MID genera `documents/SMOKE_CREATE_CANCEL.md`, AGENTE_MID §M5)

- **Red:** localnet aislada (§3), publicación **variante B**, reglas **B4**, una sola localnet en la máquina.
- **Cliente:** `VITE_SUI_NETWORK=localnet npm run dev -w app` con `app.env`; pasos 🌐 por **Chrome headless + CDP con
  perfil desechable** (`--user-data-dir=<SMOKE_DIR>/chrome-profile`, `HOME`/`XDG_*` dentro de `<SMOKE_DIR>`, depuración
  solo en 127.0.0.1, cliente CDP propio en Node 26 sin dependencias, archivo en `<SMOKE_DIR>`), como en #9/#10. Nunca el
  navegador ni el perfil del usuario.
- **Modalidad verificada:** el modal del kit se opera por el shadow DOM (`internal-button` ⇒ "Unsafe Burner Wallet",
  paso 13 de #10) y la burner firma sin ventana (V-3). Los campos de React se llenan con foco + `Input.insertText`. **Sin
  recargas** después de fondear una burner (V-3: una recarga crea otra dirección); la navegación es por hash
  (`location.hash`). Pedidos contados en CDP `Network.requestWillBeSent` por método gRPC:
  `TransactionExecutionService/SimulateTransaction` y `/ExecuteTransaction`.
- **Pasos previstos** (la tabla definitiva y los resultados van en el SMOKE, llenados durante la corrida):
  0. Preparación (§3 paso 2) + `app.env` + `chrome.env`; línea base `stat`/`ls` de `<HOME real>/.sui/sui_config/`; sin
     `contracts/deployments/localnet.json`; puertos 9000, 9123, 9184, 5003, 5173, 4173 y 9229 libres; árbol limpio.
  1. Génesis, arranque, cuentas `ADMIN`, `A`, `B` en `ids.env`; publicación variante B; `update_fee_rate` 250.
  2. `vite` dev y Chrome headless (pestaña `T1`).
  3. 🌐 Portada sin wallet: "Conecta tu wallet para crear una partida", formulario deshabilitado; lobby "No hay
     partidas abiertas".
  4. 🌐 Conectar la burner en `T1` ⇒ dirección `X` (del `title` de `.account-badge`, a `ids.env`; no se pega). El
     formulario muestra "Mínimo 0.001 SUI · máximo 50 SUI" y "Comisión 2.5 %"; saldo 0 ⇒ con 0.01, "Saldo insuficiente".
  5. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$X`;
     🌐 volver a la portada por hash ⇒ "Saldo: 2 SUI".
  6. 🌐 Validaciones sin red: `0.0001`, `51`, `abc`, invitación a `X` en mayúsculas ("No puedes invitarte a ti mismo"),
     dirección inválida; **ningún** `SimulateTransaction` ni `ExecuteTransaction` en CDP.
  7. 🌐 Crear abierta de 0.01 SUI: etapas en orden; navega a `#/game/<G1>`: "Abierta", creador `X`, aviso "Partida
     creada" con digest (texto) y costo de red. DEV: `PRE suic tx-block <digest> --json` ⇒ `success`, `GameCreated`
     `bet` 10000000, creador `X`, `fee_rate` 250; `PRE suic balance $X` = 2 SUI − 0.01 − costo (= el del aviso). Por
     acción: 2 `SimulateTransaction` (preflight + burner) y 1 `ExecuteTransaction`.
  8. 🌐 El aviso **no** dice "La partida se creó con comisión…" (`fee_rate` del evento = el mostrado, M-2).
  9. 🌐 Volver a la portada **sin** "Actualizar": `G1` con "(tuya)" (invalidación tras la indexación; se anota la espera).
  10. 🌐 Crear invitación de 0.02 SUI a `B` (`G2`): detalle "Invitación a <B>" con el texto de compartir; no aparece en el
      lobby.
  11. 🌐 En `G1`: "Cancelar" ⇒ "Partida cancelada: se devolvieron 0.01 SUI a tu cuenta"; "Cancelada"; sin botón; el
      lobby ya no la muestra. DEV: `GameCancelled` `refund` 10000000, `cancelled_by` = `X`; saldo de `X` = antes + 0.01 −
      costo.
  12. 🌐 **M-1:** en `G2`, dos clicks en "Cancelar" despachados en el mismo `Runtime.evaluate` (sin `await` entre ellos)
      ⇒ CDP: **un** `ExecuteTransaction` y **2** `SimulateTransaction` (no 4); reembolso de 0.02.
  13. 🌐 Pestaña `T2`: el kit queda desconectado tras "reconectando" (la dirección guardada no existe en la burner nueva;
      se anota); conectar ⇒ burner `Y` (a `ids.env`). DEV fondea `Y` con 1 SUI. Con `X` (`T1`) se crea `G3` abierta; en
      `T2`, `#/game/<G3>` **sin** "Cancelar" ni "Rechazar"; sin wallet tampoco.
  14. DEV: el contrato también lo valida: `PRE act_as "$B" && suic call --package "$PKG" --module game --function
      cancel_game --args "$G3" --gas-budget 100000000 --json` ⇒ fallo ejecutado `MoveAbort` `game`/3; 🌐 `G3` sigue
      "Abierta".
  15. 🌐 **M-2:** en `T1`, con el formulario mostrando "Comisión 2.5 %" y 0.01 escrito, DEV: `ADMIN` `update_fee_rate`
      300; 🌐 "Crear partida" ⇒ "La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar"; **cero**
      `SimulateTransaction`/`ExecuteTransaction`; el formulario pasa a mostrar "3 %". Igual con `update_bet_limits`
      (mínimo 0.05 SUI) ⇒ el texto de límites; después el formulario bloquea 0.01 sin red. DEV: `ADMIN` restaura 250 y los
      límites por defecto (1000000 / 50000000000).
  16. 🌐 **Rechazar (D-20261102-05):** `X` invita a `Y` (`G4`, 0.03); en `T2`, `#/game/<G4>`: "Rechazar" visible y sin
      "Cancelar"; en `T1`, "Cancelar" visible y sin "Rechazar". `T2` rechaza ⇒ "Invitación rechazada: se devolvieron 0.03
      SUI a quien te invitó"; "Cancelada". DEV: `GameCancelled` `cancelled_by` = `Y`, `refund` 30000000; saldo de `X` +
      0.03; saldo de `Y` − costo de red.
  17. 🌐 **Abort real con mensaje mapeado (carrera):** `X` invita a `Y` (`G5`); `T2` abre `#/game/<G5>` ("Rechazar"
      visible). En `T1`, cancelar `G5` (éxito). Inmediatamente, en `T2` (verificar antes por DOM que sigue "Invitación a"
      con "Rechazar": el detalle se refresca cada 15 s; si ya se refrescó, repetir con otra invitación y anotarlo) ⇒
      click en "Rechazar" por `Runtime.evaluate` (`button.click()`), **sin** `Page.bringToFront` ni ningún cambio de
      pestaña activa (NIT-2 de v1.1: el foco dispara el refetch del detalle y cierra la ventana de la carrera) ⇒ "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)";
      **ningún** `ExecuteTransaction`; saldo de `Y` sin cambios; el detalle de `T2` pasa a "Cancelada" (invalidación tras
      el abort).
  18. Cierre: paso 7 de `agents.md` §3 más la app: `kill` por PID de `vite` y Chrome (`kill -0` falla en `sui`, `vite` y
      Chrome; exit 144 de `sui start` esperado); ningún proceso con el perfil desechable; puertos libres; `rm -f
      <repo>/contracts/deployments/localnet.json` y `rmdir` de la carpeta; `rm -rf <SMOKE_DIR>` y `test ! -e`; sin cargar
      `env.sh`, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code --
      contracts/Move.lock`; sin `Pub.*.toml`/`Published.toml`; `git status --porcelain` = solo
      `documents/SMOKE_CREATE_CANCEL.md`.
- **Qué no cubre el smoke (y dónde está cubierto):** fallo **ejecutado** mapeado en la UI (la preflight lo atrapa antes;
  solo pasa en una carrera entre la preflight y la ejecución): fixture real de TASK-1 + tests de TASK-2/4; "sin confirmar",
  error de wallet con digest e indexación que no llega: tests de TASK-4; error de red en la preflight: tests de TASK-2/4;
  wallets de extensión y testnet: #17 (owner).
- **Consistencia eventual:** tras cada transacción de la CLI, esperar el `checkpoint` en `suic tx-block` antes de leer en
  el navegador (se anota; no es falla).

## Al terminar el ciclo

El MID propone el body del PR (`Closes #11`; D-20261102-05; DL-1..16; M-1..5 y la precisión de M-3 (b); V-1..12; gates;
smoke PASA/TOTAL; pendientes para #12: textos de "reintentar" para las cancelaciones del runtime, y para #17: wallets de
extensión en testnet). Mensaje de commit de esta versión: `docs: update #11 handoff after TASK-1 findings, v1.2 (#11)`.
