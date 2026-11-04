# HANDOFF_ACCEPT
> Plan: PLAN_ACCEPT v2 (MAYOR: APPROVE en la segunda ronda, 2026-11-03, con condición; `b853c51`) | Issue: #12 | Branch:
> `feature/issue-12-accept-resolve` | Versión: v1.2 | Fecha: 2026-11-03

## Changelog

- **v1.2 (2026-11-03)**: MINOR-1 de la segunda revisión del MAYOR (APPROVE de v1.1, sin otra ronda; antes de
  TASK-3). La foto de montaje quedaba atada a la cuenta con la que se montó la vista: con B se crea una partida (`id` 2,
  `success`), se cambia a A y se monta el formulario (`maxId` de A: 0 o 1), se vuelve a B sin desmontar ⇒ se adoptaba la 2
  y el formulario navegaba a la partida vieja. **Se elige (a):** `mountSnapshot` toma `maxId` y `pendingIds` de **todo** el
  `MutationCache` al montar (`getAll()`, sin filtrar por cuenta ni objetivo); el filtro de objetivo (`sameTarget`, con la
  clave de la cuenta **actual**) se aplica al derivar. Motivo: la regla queda pura y entera en `txSession.ts`, sin depender
  de que cada vista recuerde remontarse con `key={address}` (opción (b), que repartiría la corrección en dos componentes y
  la perdería en una vista nueva). `pendingIds` global, y no solo del objetivo, cubre además el caso simétrico: una
  mutación de B en curso al montar bajo A se adopta al volver a B. Cambian M-2 (c), §4, TASK-3 §3.2/§3.3 y T3-16/T3-17.
- **v1.1 (2026-11-03)**: revisión del MAYOR del handoff v1 (REQUEST CHANGES: 1 MAJOR, 2 MINOR, 2 SUGGESTION). Solo
  cambian M-2 (c), M-4, §4 (`txSession.ts`), TASK-1 (S-6), TASK-3 (§3 y tests) y los pasos 12 y 14 del smoke.

| Hallazgo de la revisión del handoff v1 | Cambio en v1.1 |
|---|---|
| **MAJOR-1** (M-2 (c) muta un `useState` en el render, lo que rompe `react-hooks/immutability`/`globals` de `eslint-plugin-react-hooks` 7.1.1 con `--max-warnings 0`; además, por los lotes de `notifyManager` se pierden adopciones) | M-2 (c) reescrito. (1) Al montar, una **foto pura** del caché: `const [mount] = useState(() => mountSnapshot(<entries leídas del caché>, view))`, con `mountSnapshot` en `txSession.ts` ⇒ `{ maxId, pendingIds }` de las mutaciones del objetivo. (2) Adoptable = ajena ∧ `sameTarget` ∧ terminada ∧ ≠ `unconfirmed` ∧ (`id > mount.maxId` ∨ `mount.pendingIds.has(id)`), dentro de `deriveTargetState`. No depende de los renders intermedios ni muta nada. (3) M-4: `viewId` y `runId` salen de **funciones de módulo** (`nextViewId()`, `nextRunId()`); `useState(nextViewId)`. (4) Se quitan el `Set` `seen`, el alta en el render y la frase "no ocurre con `useMutationState`". (5) T3-8 usa una ajena que empieza y termina en el **mismo tick**; el reporte de TASK-3 pega `npm run lint -w app` en 0 (criterio nuevo) |
| **MINOR-1** (T3-15 contradice M-1 (b)) | T3-15 enumera la migración permitida de los tests de #11: `outcome: unconfirmed` del hook ⇒ `useTxTarget().unconfirmed.digest` con el `outcome` del hook en `null`; `isBusy` ⇒ `useTxTarget().busy`; `reset` ⇒ `acknowledge`. Las firmas pasan a recibir `view`. Todo lo demás (etapas, `success`/`failure`, invalidaciones exactas, `interpret` que lanza) se conserva **sin cambios**, y el reporte lista cada aserción migrada |
| **MINOR-2** (paso 14 (ii) sin monto válido) | Paso 14 (ii): foco + `Input.insertText('0.01')`, comprobar "Crear partida" `disabled` **con el monto válido** y el texto de "en curso"; después `requestSubmit()` ⇒ siguen **1** `ExecuteTransaction` y **2** `SimulateTransaction` |
| SUGGESTION-1 (S-6 con una dirección del rango bajo del sistema) | **Aplicada**: S-6 usa `normalizeSuiAddress('0x5ca1ab1e')`, una dirección arbitraria fuera del rango de objetos y paquetes del sistema y sin claves |
| SUGGESTION-2 (paso 12: preflight en `T3` y detalle) | **Aplicada**: el paso 12 espera **1** `SimulateTransaction` en `T3` (la preflight) y que el detalle de `T3` pase a "Resuelta" por la invalidación tras el abort |

- **v1 (2026-11-03)**: primera versión. Integra D-20261103-02 (P-1 = (a), aviso sin botón; en `b853c51`) y la condición
  del APPROVE del plan v2: los MINOR-1..4 de la segunda revisión del MAYOR quedan fijados aquí, sin v3 del plan.

| Hallazgo de la revisión del plan v2 | Dónde queda resuelto en este handoff |
|---|---|
| **MINOR-1** (quién dibuja el "sin confirmar" propio; `acknowledge()` no limpia el `outcome` del hook) | §1 M-1. (a) El `outcome` del hook de acción se **deriva del `MutationCache`** por `runId` (`useMutationState` con `predicate` sobre `variables.runId`), no de `useMutation().data`: al borrar la mutación queda en `null`. (b) El hook de acción **nunca** expone `unconfirmed` (su tipo es `TxResult<T>`, sin esa variante): la alerta "sin confirmar" la dibuja **solo** la vista, desde `useTxTarget().unconfirmed`. Contrato en §4; tests en TASK-3 (T3-5, T3-6) y TASK-4 (T4-9) |
| **MINOR-2** (adopción incompleta) | §1 M-2. (a) `adopted` se descarta cuando la vista lanza una mutación propia posterior o adopta otra más nueva (derivación pura por `mutationId`, sin estado). (b) Un crear adoptado que termina en `success` con la partida identificada **navega** al detalle igual que el propio. (c) Las mutaciones ajenas se adoptan **sin `useEffect`** (en v1.1, con la foto pura `mountSnapshot` en lugar del `Set` mutado en el render: MAJOR-1 de la revisión del handoff). Tests T3-7..T3-10 y T4-10 |
| **MINOR-3** (aviso sin cuenta en una partida terminada) | §1 M-3. Orden de `acceptState`: `not_pending` → `no_account` → `creator` → `not_invited` → `available`. El aviso "Conecta tu wallet…" sale solo de `no_account`, que ya implica `Pending`. Tests T2-4 y T4-2 |
| **MINOR-4** (`crypto.randomUUID()` solo en contextos seguros) | §1 M-4. `viewId` (y `runId`) salen de **contadores de módulo** (en v1.1, a través de `nextViewId()`/`nextRunId()`: MAJOR-1 de la revisión del handoff); ni `crypto.randomUUID()` ni `useId()`. Test T3-11 |
| SUGGESTION-1 (clave por valor) | **Aplicada** (§1 M-5): `useTxTarget` deriva la clave con `useMemo` sobre `[red, cuenta normalizada, target.kind, gameId normalizado]`, no por identidad del objeto `target` |
| SUGGESTION-2 (renumerar D-20261103-02) | **No se aplica**, por indicación del orquestador: D-20261103-01 existe en la branch de #8, que se mergea aparte; -02 es correcta |
| SUGGESTION-3 (precisar R-5) | **Aplicada** (§1 R-5 y TASK-5): entre pestañas, una segunda aceptación, cancelación o rechazo que pasa las dos preflights se **ejecuta** y aborta con `game`/4: cuesta gas. Crear dos veces deja una segunda apuesta (se recupera cancelando) y un depósito que no se recupera |

Documento autocontenido para el DEV: TASK-1..5 y el smoke del ciclo. Se ejecuta **un task por sesión**, en orden. Cada
task termina con el reporte de `documents/FLUJO_AGENTES.md` §5 y espera la revisión del MID antes del siguiente. El DEV
**no** commitea ni pushea: lo hace el orquestador.

## Historia de usuario del ciclo

**Como** jugador con la wallet conectada que encontró una partida abierta (o recibió el enlace de una invitación),
**quiero** aceptarla con un clic igualando exactamente la apuesta del creador y ver quién ganó el coinflip, cuánto se
pagó y cuánto cobró la House, con el enlace a la transacción, **para** jugar sin la CLI y confiar en que el resultado que
veo es el que quedó on-chain y no una animación o una simulación.

**Scope en una frase:** botón "Aceptar" en el detalle (solo para quien puede aceptar y con saldo), PTB de aceptación con
el `Random` del sistema, resultado leído del `GameResolved` de la propia transacción después de que el nodo confirma, y
el candado contra el doble envío y el bloqueo por "sin confirmar" globales en el `QueryClient` para crear, cancelar,
rechazar y aceptar.
**Lo que NO entrega:** "mis partidas" e invitaciones recibidas (#13), panel de la House (#14), animaciones (#18), botón
"Resolver" o estado `Active` (resolución atómica, D-20261030-06 (1)), cambios del contrato, dependencias nuevas,
persistencia de "sin confirmar" más allá de la carga de la página ni un candado entre pestañas (R-5).

## 0. Baseline de gates verificado (2026-11-03, `master` `a6ee14c`)

Base de la branch: `a6ee14c` (`master`: merge de #11, `ac5a85c`, más el housekeeping `152f725`, solo docs). Encima, la
branch suma solo docs: el plan v2 y D-20261103-02 (`b853c51`) y este handoff. Valores de `documents/STATUS.md` medidos en
`ac5a85c` (mismo código de `app/` y `contracts/`):

| Área | Gate | Baseline |
|---|---|---|
| Toolchain | `printf 'n\n' \| sui --version` / `node --version` / `npm --version` | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` / `11.20.0` |
| App | `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` | exit 0; 293 paquetes; 292 firmas verificadas; 0 vulnerabilidades de producción (11 *moderate* solo dev, aceptadas hasta #35) |
| App | `npm run lint -w app` / `npm run typecheck -w app` | 0 problemas / 0 errores |
| App | `npm test -w app` | **630 tests PASS en 46 archivos** |
| App | `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-*.js` ≈ 878 kB (≈ 267 kB gzip), con el aviso informativo de chunk > 500 kB (#15) |
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

# Contracts, desde <repo>/contracts (solo TASK-1 y, si se tocó algo de contracts/, TASK-5)
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
último reporte aprobado.

## 1. Decisiones (no reabrir)

**Del owner (registradas):**

| Decisión | Qué fija para este ciclo |
|---|---|
| **D-20261103-02** | Una cuenta conectada que abre una invitación ajena **no ve "Aceptar"** y ve "Esta invitación es para otra dirección."; nunca sin cuenta. El criterio del smoke "tercera cuenta con error mapeado" se cumple con `game`/4 por carrera en la app; `game`/5 se cubre por CLI y con el test de la fixture real `acceptNotInvited` |
| D-20261030-06 (1) | Resolución atómica al aceptar: sin `Active`, sin builder ni botón "Resolver" (criterio 4 del issue: no aplica) |
| D-20261030-16 | `accept_game(game, house, payment, r: &Random, ctx)` `entry`; comisión sobre el pozo, hacia abajo; un solo `GameResolved`; sorteo por índice |
| D-20261102-02 (3), (5), (6) | Sin dependencias nuevas; burner solo en localnet + `npm run dev`; sin explorador en localnet (Suiscan en testnet) |
| D-20261102-03 | Ningún agente usa claves del owner ni corre nada con claves contra testnet; `~/.sui/` sin claves |
| D-20261102-05 | "Rechazar" (invitado) convive con "Aceptar" en el detalle |

**Del plan v2 (MID, aprobadas por el MAYOR):** DL-1 … DL-13 de `documents/PLAN_ACCEPT.md`. Resumen operativo:

| # | Resumen |
|---|---|
| DL-1 | `buildAcceptGameTx`: `splitCoins(gas, [bet])` + `accept_game(game, house, coin, tx.object.random())`, **último** comando; `bet` del `Game`, `houseId` de config |
| DL-2 | Resultado = el único `GameResolved` de esa partida en la confirmación del nodo, con `acceptor` = la cuenta; si no, `success` con `value: null` |
| DL-3 | Sin `precheck` en aceptar: la preflight valida estado, versión y House |
| DL-4 | `acceptState` + `NOT_INVITED_HINT` en `sui/gameActions.ts`; reserva = budget medido × ≥ 2 (provisional 0,015 SUI) en `sui/acceptGame.ts`; `acceptBalanceCheck` |
| DL-5 | SEG-10: textos neutros durante las etapas; resultado solo con el `success` del nodo; nota de la vista previa de la wallet; tokens de resultado |
| DL-6 | Invalidación de aceptar: `reset` `lobby`; `invalidate` `game`, `balance`, `house` |
| DL-7 | Candado global por cuenta en el `MutationCache` (`isMutating` + `mutateAsync` en el mismo tick); `useIsMutating`; `retry: false`, `gcTime: Infinity`, `networkMode: 'always'` |
| DL-8 | Una vista, una fuente por objetivo: `useTxTarget` (`busy`, `notice`, `unconfirmed`, `acknowledge`), adopción. Precisado por M-1, M-2, M-4 y M-5 de abajo |
| DL-9 | NIT-2: error de la wallet sin digest con `MoveAbort` ⇒ invalidar la acción |
| DL-10 | Preflight: `SimulationError` sin `executionError` con `cause` de red ⇒ `PreflightNetworkError`; sin abort ni `executionError` ⇒ "No se pudo preparar…". Criterio de "red" sujeto a S-2/S-6. Se declara en el PR como corrección de la máquina de #11 |
| DL-11 | Cancelaciones del runtime con un texto neutro respecto de la acción y "intenta de nuevo" |
| DL-12 | "Resultado para ti: ganaste/perdiste" en el detalle para creador y aceptante |
| DL-13 | Hooks de acción atados a la vista; `execute` sin objetivo; `gameId` normalizado en la clave |

**De la segunda revisión del MAYOR (condición del APPROVE, 2026-11-03):**

| # | Decisión | Dónde |
|---|---|---|
| **M-1** (MINOR-1) | (a) `useExecuteTransaction` guarda en estado local el `runId` de su **última** ejecución y deriva su resultado con `useMutationState({ filters: { mutationKey: view.key, predicate: (m) => m.state.variables?.runId === runId }, select: (m) => m.state.data ?? null })`. `useMutation().data` **no** se usa para mostrar. Si `acknowledge()` borra esa mutación del caché, el resultado pasa a `null`. (b) El hook de acción devuelve `outcome: TxResult<T> \| null`, con `TxResult<T> = Exclude<TxOutcome<T>, { kind: 'unconfirmed' }>`: un `unconfirmed` se ve como `null` en la acción (su `TransactionStatus` no dibuja nada con `stage: 'done'` y `outcome` `null`). La alerta "sin confirmar" la dibuja **solo** la vista, con `<TransactionStatus stage="done" outcome={{ kind: 'unconfirmed', digest }} …>` desde `useTxTarget().unconfirmed`, más su botón "Ya la revisé" | TASK-3, TASK-4 |
| **M-2** (MINOR-2) | (a) `notice: adopted` se muestra solo si el `mutationId` adoptado es **mayor** que el de toda mutación propia de la vista y es la adoptada más nueva: lanzar una propia o adoptar otra lo descarta, sin estado extra. (b) `CreateGameForm`: un crear adoptado que termina en `success` con `value.created` **navega** a `#/game/<id>` con el mismo aviso que el propio (`createdNoticeState`); sin `created`, muestra "Partida creada" con el digest, como hoy. (c) **(v1.1, MAJOR-1 de la revisión del handoff)** Sin `useEffect` y sin mutar nada en el render: al montar, `const [mount] = useState(() => mountSnapshot(queryClient.getMutationCache().getAll()))`, una lectura pura que devuelve `{ maxId, pendingIds }`: el mayor `mutationId` de **todo** el caché (0 si está vacío) y el conjunto de **todas** las que estaban `pending` (v1.2: sin filtrar por cuenta ni objetivo, para que un cambio de cuenta sin desmontar no adopte mutaciones viejas de la otra cuenta). Una mutación es **adoptable** si es ajena (`viewId` ≠ el de la vista), del objetivo (`sameTarget`), terminada, con `outcome` ≠ `unconfirmed` y además `id > mount.maxId` (empezó después de montar) **o** `mount.pendingIds.has(id)` (estaba en curso al montar). Lo terminado antes de montar nunca es adoptable, así que no hay doble navegación. Como los `mutationId` son monótonos (`query-core/build/modern/mutationCache.js:43`), la regla no depende de que la vista se haya renderizado con la mutación en `pending`: las notificaciones de `notifyManager` van en lotes (`notifyManager.js:5, 22`) y una ajena puede empezar y terminar entre dos renders | TASK-3, TASK-4 |
| **M-3** (MINOR-3) | `acceptState` evalúa `not_pending` → `no_account` → `creator` → `not_invited` → `available`. `GameActions` muestra "Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron" **solo** con `no_account` (que implica `Pending`). Una partida `Cancelled`/`Resolved` vista sin cuenta no muestra ningún aviso de acción | TASK-2, TASK-4 |
| **M-4** (MINOR-4) | `viewId` y `runId` = contadores de módulo, leídos **solo a través de funciones de módulo** declaradas fuera del componente (v1.1, MAJOR-1: así `react-hooks/globals` no ve una reasignación dentro del hook): `let lastViewId = 0; function nextViewId(): number { return ++lastViewId; }` en `useTxTarget.ts`, usado como `useState(nextViewId)`, y `let lastRunId = 0; function nextRunId(): number { return ++lastRunId; }` en `useExecuteTransaction.ts`, llamado dentro de `execute` (un event handler, nunca en el render). Son únicos dentro de la carga de la página, que es lo que vive el `QueryClient`. Ni `crypto.randomUUID()` (no existe fuera de contextos seguros, p. ej. `vite --host` servido por una IP de la LAN en `http://`) ni `useId()` (se deriva de la posición en el árbol: un remontaje en la misma posición repetiría el id y una mutación ajena pasaría por propia) | TASK-3 |
| **M-5** (SUGGESTION-1) | `useTxTarget(target)` calcula `key`/`accountKey` con `useMemo` sobre valores primitivos normalizados (red, `normalizeSuiAddress(cuenta)`, `target.kind`, `normalizeSuiObjectId(gameId)`) y un `targetHash` (`hashKey` de `@tanstack/react-query`) para comparar claves en el `select` | TASK-3 |
| **R-5** (SUGGESTION-3) | El candado es por pestaña (`QueryClient`). Entre pestañas con la misma cuenta, una segunda aceptación, cancelación o rechazo que pasa las dos preflights se **ejecuta** y aborta con `game`/4 (cuesta gas); crear dos veces deja una segunda apuesta (se recupera cancelando) y un depósito de storage que no se recupera. Límite conocido en `app/README.md` | TASK-5 |

## 2. Hechos verificados del SDK instalado (resumen del plan, "Verificación")

Rutas relativas a `<repo>/node_modules/`; `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39, `@mysten/dapp-kit-react`
2.1.41, `@tanstack/query-core`/`react-query` 5.105.0. Validados por el MAYOR.

| # | Hecho | Evidencia |
|---|---|---|
| V-1 | `tx.object.random()` = `UnresolvedObject { objectId: SUI_RANDOM_OBJECT_ID, mutable: false }`, sin versión; la constante se exporta de `@mysten/sui/utils` | `@mysten/sui/dist/transactions/object.mjs:29-35`; `dist/utils/constants.mjs:11` |
| V-2 | Con `SuiGrpcClient`, `build({ client })` simula en el nodo (`doGasSelection`, `readMask` sin eventos); un fallo ⇒ `SimulationError` con `executionError` | `dist/transactions/resolve.mjs:19-26`; `dist/grpc/core.mjs:511-550` |
| V-3 | Un error de transporte en esa simulación llega como `new SimulationError(message, { cause })` **sin** `executionError`; hoy termina en "La wallet no completó la operación" | `dist/grpc/core.mjs:532-534`; `app/src/sui/execution.ts:70`; `useExecuteTransaction.ts:133-136`; `errors.ts:186-189` |
| V-4 | El nodo simula con `Random` (CLI 1.83 sin `--gas-budget`, smoke de #6 paso 11); la regla de comandos tras `Random` se aplica antes de ejecutar (paso 10) | `git show 8fddbda:documents/SMOKE_ACCEPT.md` |
| V-5 | Eventos del nodo por gRPC: `{ packageId, module, sender, eventType, bcs, json }` | `dist/grpc/core.mjs:902-909`; `app/src/sui/execution.ts:84-94` |
| V-6 | Congestión ⇒ `$kind: 'CongestedObjects'`; falta de aleatoriedad ⇒ `$kind: 'Unknown'` con `message` = `description` del nodo (por BCS: `'ExecutionCancelledDueToRandomnessUnavailable'`); texto Rust "Certificate is cancelled because randomness could not be generated this epoch" | `dist/grpc/core.mjs:625-735`; `dist/client/utils.mjs:267-273` |
| V-7 | La burner hace `build({ client })` y ejecuta; una extensión muestra su propia vista previa de la simulación; la app solo toma el digest | `dapp-kit-core/dist/index.mjs:809-829`; `useExecuteTransaction.ts:145-146` |
| V-8 | `mutateAsync` → `MutationObserver.mutate` → `Mutation.execute`, que despacha `pending` antes de su primer `await`; `isMutating` = `findAll({ status: 'pending' })`; clave parcial; `gcTime: Infinity` no agenda borrado; `networkMode` `'online'` pausa sin red. `MutationCache.remove` no resetea el observer (de ahí M-1) | `query-core/build/modern/mutationObserver.js:110-115, 136-142`; `mutation.js:173-182`; `mutationCache.js:73-90`; `queryClient.js:110-114`; `utils.js:94-105`; `removable.js:23-27`; `retryer.js:19-20, 91-92` |

## 3. Reglas transversales (todos los tasks)

- **Node 26** por ruta absoluta en cada llamada (prefijo de §0). Todo desde la raíz del worktree (`<repo>`).
- **Gate de la app en cada task** (§0, output pegado y completo, con archivos y tests de Vitest y el tamaño del build), y
  `git status --porcelain --untracked-files=all` con solo los archivos del task. En TASK-1, además, el job `contracts`.
- **Sin dependencias nuevas** (SEG-8): `package.json`, `app/package.json` y `package-lock.json` sin delta en todo el ciclo.
- **Capas** (`app/eslint.config.js`, sin tocarlo): `sui/` solo `@mysten/sui*`/`@mysten/dapp-kit-core*` y sin React;
  `hooks/` `@mysten/sui*`, la raíz de `@mysten/dapp-kit-react` y `@tanstack/react-query`; componentes y páginas, de
  `@mysten/*` solo `@mysten/dapp-kit-react/ui`.
- **Localnet aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh`, `ids.env`, `smoke_guard`, publicación con
  el script en la **variante B** y cierre del paso 7. **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el
  prefijo del paso 3, tampoco los de solo lectura; siempre `suic`/`"$SUI"`; `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. En este
  documento, `PRE` abrevia ese prefijo y **todo `suic` lo lleva** aunque no se escriba. Una sola localnet a la vez (puerto
  9000). Para `node`/`npm`/`vite`, `<SMOKE_DIR>/app.env` (patrón de #11); nunca `env.sh` y `app.env` en la misma llamada.
  Nunca `new-address`.
- **Firmar como una cuenta de la génesis** (S-3, técnica de S-1 bis de #11): solo en la localnet aislada y con tres
  condiciones: (1) firma la CLI bajo `PRE`; (2) ningún proceso de Node lee nada de `<SMOKE_DIR>/net`; (3) ninguna clave se
  imprime ni se pega. Las sondas en Node solo hablan con la red por gRPC.
- **Testnet:** nada con claves; este ciclo no necesita lecturas de testnet.
- **Placeholders** en todo lo commiteado y en el output pegado (`FLUJO_AGENTES.md` §2): `<repo>`, `<HOME real>`,
  `<SMOKE_DIR>`, `<scratchpad>`. Direcciones e IDs abreviados (`0x1234…abcd`) en reportes; digests completos sí.
- **Antes de cada reporte:** grep del `git diff` y de los archivos nuevos por claves (`suiprivkey`, `mnemonic`,
  `BEGIN .*KEY`) y rutas personales: vacío. El grep de hex de 40-64 solo puede dar la fixture recapturada de TASK-1 y los
  IDs ficticios de tests; se declaran.
- **Sin `useEffect`** para pedir datos ni para registrar mutaciones (PROY-14, M-2 (c)); montos en `bigint` (PROY-12);
  textos de la UI en español; tests en inglés con nombre = comportamiento (LIM-11); JSDoc con el porqué en lo exportado
  (LIM-7); sin `console`.

## 4. Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta (nuevo o cambiado) |
|---|---|
| `sui/transactions/game.ts` | suma `buildAcceptGameTx({ packageId, houseId, gameId, bet: bigint }): Transaction`; `moveTarget` acepta `'accept_game'` |
| `sui/gameTx.ts` | suma `parseResolvedGame(result, { originalPackageId, gameId, acceptor }): GameResolvedEvent \| null` |
| `sui/gameActions.ts` | suma `type AcceptState = 'not_pending' \| 'no_account' \| 'creator' \| 'not_invited' \| 'available'`; `acceptState(game: Pick<Game, 'creator' \| 'opponent' \| 'state'>, address: string \| null): AcceptState` (orden de M-3); `NOT_INVITED_HINT: string` (= `ABORT_MESSAGES.game[5]`) |
| `sui/acceptGame.ts` (nuevo) | `ACCEPT_GAS_RESERVE_MIST: bigint` (TASK-1 fija el valor; provisional `15_000_000n`); `acceptBalanceCheck(balance: bigint \| null, bet: bigint): 'ok' \| 'insufficient' \| 'unknown'`; `wonBy(event: Pick<GameResolvedEvent, 'winner'>, address: string): boolean`; `playerResult(game: Pick<Game, 'creator' \| 'state'>, address: string \| null): 'won' \| 'lost' \| null` |
| `sui/errors.ts` | suma `runtimeCancellation(source: unknown): 'randomness' \| 'congestion' \| null` y su texto en `transactionErrorMessage` (después del abort, antes del genérico "La red no ejecutó…"); `RUNTIME_CANCELLED_MESSAGES` |
| `sui/execution.ts` | `preflightTransaction` con DL-10 (misma firma); suma `isPreflightNetworkCause(cause: unknown): boolean` (criterio fijado tras S-2/S-6) |
| `hooks/queryKeys.ts` | suma `txAccount(network, address: string \| null)` = `['sui', red, 'tx', normalizeSuiAddress(address) \| 'none']` y `txTarget(network, address, target: TxTarget)` = `[...txAccount, 'create']` o `[...txAccount, 'game', normalizeSuiObjectId(gameId)]` (claves de **mutación**) |
| `hooks/txInvalidation.ts` | `TxAction` suma `{ kind: 'accept'; gameId: string }`; fila de aceptar (TASK-4) |
| `hooks/txSession.ts` (nuevo, puro, sin React) | `type TxTarget = { kind: 'create' } \| { kind: 'game'; gameId: string }`; `type TxView = { target: TxTarget; viewId: number; key: QueryKey; accountKey: QueryKey; targetHash: string }`; `type TxVariables<T> = { input: ExecuteInput<T>; viewId: number; runId: number; action: TxAction }`; `type TxValueByAction = { create: CreateGameValue; cancel: bigint \| null; reject: bigint \| null; accept: GameResolvedEvent \| null }` (con `CreateGameValue` movido aquí y reexportado desde `useCreateGame.ts`); `type AdoptedTx` (unión por acción de `{ action; outcome: TxResult<valor> }`); `type TxEntry = { id: number; status: MutationStatus; viewId: number \| null; runId: number \| null; action: TxAction \| null; sameTarget: boolean; outcome: TxOutcome<unknown> \| null }`; `toTxEntry(view): (m: Mutation) => TxEntry` (la misma proyección para el `select` de `useMutationState` y para la foto de montaje); `type MountSnapshot = { maxId: number; pendingIds: ReadonlySet<number> }`; `mountSnapshot(mutations: readonly Pick<Mutation, 'mutationId' \| 'state'>[]): MountSnapshot` (todo el `MutationCache`, v1.2); `deriveTargetState({ entries, viewId, mount }): { inFlightForeign: boolean; notice: TxNotice \| null; unconfirmed: { digest: string; mutationId: number } \| null }` con `TxNotice = { kind: 'in_flight' } \| { kind: 'adopted'; adopted: AdoptedTx }` |
| `hooks/useTxTarget.ts` (nuevo) | `useTxTarget(target: TxTarget): { view: TxView; busy: boolean; notice: TxNotice \| null; unconfirmed: { digest: string } \| null; acknowledge: () => void }` |
| `hooks/useExecuteTransaction.ts` | `type TxResult<T> = Exclude<TxOutcome<T>, { kind: 'unconfirmed' }>`; `useExecuteTransaction<T>(view: TxView): { stage: TxStage; outcome: TxResult<T> \| null; execute: (input: ExecuteInput<T>) => void }` (sin `isBusy` ni `reset`: el bloqueo es de `useTxTarget`) |
| `hooks/useCreateGame.ts`, `useCancelGame.ts`, `useRejectGame.ts` | `useCreateGame(view)`, `useCancelGame(view)` (`cancel()`), `useRejectGame(view)` (`reject()`): el `gameId` sale de `view.target` |
| `hooks/useAcceptGame.ts` (nuevo) | `useAcceptGame(view: TxView, game: Pick<Game, 'bet'>)` → `{ stage, outcome: TxResult<GameResolvedEvent \| null> \| null, accept: () => void }` |

---

## TASK-1: fixtures reales de aceptar y sondas — área: contracts (fixtures, docs) + app (scripts)

### 1. Historia de usuario del task
**Como** desarrollador de la app, **quiero** las simulaciones fallidas y las transacciones reales de aceptar (con cada
ganador, sobre una invitación y un fallo ejecutado), más medidas del budget de gas y de los errores de la preflight,
**para** escribir el parser del resultado, los mensajes y la reserva de gas contra datos reales. **No entrega:** código de
`app/src/`.

### 2. Contexto
- Modelo a replicar: `app/scripts/capture-tx-fixtures.mjs` (#11): guarda de URL como primera instrucción, import
  dinámico del SDK, `plain()` sin `sender`, selección por eventos (`firstGame`, `:104-120`), roles derivados de los
  objetos (`:123-130`), `simulationErrors` con `setSender` sin firmar, `executed` con `getTransaction`.
- Sintaxis de aceptar por CLI: `contracts/README.md`, "PTB" (`suic ptb --split-coins gas "[<BET>]" --assign c
  --move-call <PKG>::game::accept_game @<GAME_ID> @<HOUSE_ID> c.0 @0x8`); con `--gas-budget` la CLI ejecuta sin dry run.
- Las transacciones de #11 que la fixture ya captura: `git show ac5a85c^2:documents/HANDOFF_CREATE_CANCEL.md`, TASK-1 §3.

### 3. Qué implementar
1. **Localnet aislada** (§3): génesis, arranque, cuentas `ADMIN`, `A`, `B`, `C` en `ids.env`, publicación variante B,
   `update_fee_rate` 250.
2. **Transacciones por CLI, en este orden** (prefijo `PRE`, `--json` a `<SMOKE_DIR>`):
   1. `A` crea `G_OPEN` abierta (1000001) **primero** (el selector toma la primera abierta pendiente) y `G_INV`
      invitación a `B` (2000002);
   2. `A` crea `G_CANCEL` **abierta** y la cancela; `A` crea `G_REJ` invitando a `B` y `B` la rechaza;
   3. `B` llama `cancel_game` sobre `G_OPEN` con `--gas-budget 100000000` ⇒ fallo ejecutado `game`/3 (como en #11);
   4. `A` crea `G_ACC1..n` abiertas (1000001) y `B` las acepta, una por una, hasta tener **un ganador `A` y un ganador
      `B`** (tope 8; se anota cuántas);
   5. `A` crea `G_ACCINV` invitando a `B` (1000001) y `B` la acepta;
   6. `C` intenta aceptar `G_ACC1` (ya resuelta) con `--gas-budget 100000000` ⇒ fallo ejecutado `game`/4. Nada toca
      `G_OPEN` ni `G_ACC1` después.
3. **`capture-tx-fixtures.mjs`:**
   - **Selección:** `G_CANCEL` exige además `o.json.opponent === null` (MINOR-8 del plan); `G_ACC1` = la primera abierta
     resuelta por orden de creación; `acceptCreatorWins`/`acceptAcceptorWins` = la primera `GameResolved` de una abierta
     con `winner === creator` / `winner === acceptor`; `acceptInvite` = la primera `GameResolved` de una partida cuyo
     `GameCreated` tiene `opponent`; `acceptNotPendingExecuted` = `previousTransaction` de `G_ACC1`, que tiene que ser un
     fallo `MoveAbort` `game`/4 (si no, el script aborta con un mensaje claro, igual si `G_CANCEL` es una invitación o
     faltan los dos ganadores).
   - **Rol `C`:** se lee como `sender` de `acceptNotPendingExecuted` (`getTransaction` con `include: { transaction: true }`,
     nunca escrito en la fixture); los roles `A`, `B`, `C`, `ADMIN` tienen que ser cuatro cuentas distintas.
   - **`simulationErrors`** suma: `acceptSelfPlay` (`A` sobre `G_OPEN`, `game`/9), `acceptNotInvited` (`C` sobre `G_INV`,
     `game`/5), `acceptNotPending` (`C` sobre `G_CANCEL`, `game`/4), `acceptWrongStake` (`B` sobre `G_OPEN` con
     `bet + 1`, `game`/10). PTB armado en el script con la forma de DL-1 (no importa `app/src/`).
   - **`executed`** suma `acceptCreatorWins`, `acceptAcceptorWins`, `acceptInvite` y `acceptNotPendingExecuted` (mismo
     `include` y forma que los de #11). **`ids.games`** suma `acc1`, `accInvite` y los de las tres aceptaciones.
   - **`runtimeCancelled`** (opcional, S-5): solo si se observó; si no, la sección no existe.
   - `_meta.method` y `_meta.roles` actualizados (rol `C`).
4. **Recaptura entera** de `contracts/fixtures/game-tx.localnet.json` (nueva génesis: cambian los IDs y digests de las
   secciones de #11). Los tests de #11 tienen que seguir en verde **sin cambiar sus aserciones**; si alguno depende de un
   valor concreto de la captura vieja, se ajusta para leerlo de la fixture y se declara.
5. **`contracts/README.md`** ("Lectura desde la app", "Fixture de transacciones"): secciones nuevas, `G_CANCEL` abierta,
   rol `C` y la lista de transacciones previas a la recaptura (el paso 2 de arriba).
6. **Sondas** (código descartable en `<scratchpad>`, nunca en el repo; resultados en el reporte):

| Sonda | Qué medir | Para qué |
|---|---|---|
| S-1 | `build({ client })` del PTB de aceptar con `setSender(B)` sobre `G_OPEN`: termina, en cuántos ms; el input `0x8` resuelto (`SharedObject` con `initialSharedVersion` y `mutable: false`); con los 4 aborts, `SimulationError` con `executionError` `MoveAbort` | V-2/V-4, DL-3 |
| S-2 | El mismo PTB con un `splitCoins` **después** del `accept_game`: clase, `message`, `executionError`, clase de `cause` y `cause.code` | DL-10 |
| S-3 | Camino de la wallet (`suic ptb … --serialize-signed-transaction` bajo `PRE` y ejecución de esos bytes por gRPC desde Node): ms hasta que `waitForTransaction` vuelve, si trae `checkpoint` y eventos, y si `getObject` del `Game` ya ve `Resolved` en ese momento | cortes de 30 s con `Random` |
| S-4 | `gasData.budget` de `Transaction.from(<bytes de la preflight>).getData()` para aceptar; `gasUsed` y `balanceChanges` de cada aceptación | `ACCEPT_GAS_RESERVE_MIST` (M: budget × ≥ 2, redondeado hacia arriba a 0,005 SUI) |
| S-5 | Una aceptación inmediatamente después de arrancar la red: ¿`ExecutionCancelledDueToRandomnessUnavailable`? Si ocurre, su `description` va a `runtimeCancelled` | DL-11, R-3 |
| S-6 | Simulación de aceptar `G_OPEN` con `setSender` = una dirección arbitraria sin claves, fuera del rango bajo de objetos y paquetes del sistema (`normalizeSuiAddress('0x5ca1ab1e')`, v1.1), fondeada por CLI con 5000000 MIST desde `A` (`suic ptb --split-coins gas "[5000000]" --assign c --transfer-objects "[c]" @0x5ca1ab1e`): clase, `message`, `executionError`, `cause.code` | DL-10 (rechazo permanente que no debe salir como "red") |

**STOP contingente** (se para y se reporta antes de TASK-2): S-1 muestra que el nodo no simula con `Random`; o S-3 da
más de ≈ 10 s hasta la confirmación. **No es STOP, pero lo resuelve el MID en el handoff v1.1:** si S-2/S-6 dan un
`cause.code` incluido en `TRANSIENT_RPC_CODES` (`app/src/sui/readPolicy.ts:18`), el criterio de
`isPreflightNetworkCause` se acota (DL-10).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/scripts/capture-tx-fixtures.mjs`, `contracts/fixtures/game-tx.localnet.json`, `contracts/README.md`.
- **NO tocar:** `app/src/`, `app/scripts/localnet-guard.mjs`, `app/scripts/capture-read-fixtures.mjs`,
  `contracts/sources/`, `contracts/tests/`, `contracts/scripts/`, `contracts/Move.lock`,
  `contracts/fixtures/game-reads.localnet.json`, `package*.json`, `.github/`. `contracts/deployments/localnet.json` existe
  solo durante la corrida.

### 5. Tests obligatorios
Ninguno nuevo. Gate de la app (los 630 tests de #11 en verde con la fixture recapturada) y job `contracts`, sin delta.

### 6. Smoke
No aplica como smoke del ciclo; la corrida es la captura. Registrar: chain id corto, digests de cada transacción,
S-1..S-6 y el cierre del paso 7 (`stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base, `kill -0` falla,
`<SMOKE_DIR>` borrado, sin `contracts/deployments/`, `git diff --exit-code -- contracts/Move.lock`).

### 7. Criterios de aceptación
- La fixture tiene las secciones de #11 más los 4 `simulationErrors` y los 4 `executed` de aceptar, sin claves, sin
  frases y sin `sender` (solo roles).
- Dos corridas sobre la misma red dan el mismo archivo salvo `_meta.capturedAt` (`diff` pegado).
- `node app/scripts/capture-tx-fixtures.mjs --url https://fullnode.testnet.sui.io:443` sale con código 2, sin pedidos.
- El script aborta (salida pegada de una prueba) si `G_CANCEL` es una invitación o faltan los dos ganadores; para
  probarlo basta un `--dry-select` interno o un test manual sobre datos simulados, a criterio del DEV y declarado.
- `git diff --exit-code -- contracts/fixtures/game-reads.localnet.json` ⇒ 0.
- S-1..S-6 respondidas; valor medido del budget y `ACCEPT_GAS_RESERVE_MIST` propuesto.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## TASK-2: capa pura de aceptar y ajustes de la maquinaria — área: app (`sui/`)

### 1. Historia de usuario del task
**Como** desarrollador de la UI de aceptar, **quiero** el PTB de aceptación, el parser del resultado, las reglas de
visibilidad y saldo, y mensajes honestos para las cancelaciones del runtime y los cortes de red de la preflight, **para**
que los hooks y componentes no decidan nada y todo esté probado contra la fixture real. **No entrega:** hooks ni UI.

### 2. Contexto
- Builders de #11: `sui/transactions/game.ts` (`assertObjectId`, `moveTarget`, `U64_MAX`). Parsers: `sui/gameTx.ts`
  (`rawEvents`, `parseOrNull`, `cancelledRefund` como modelo de "único evento de esta partida"); `sui/events.ts:126-148`
  (`parseGameResolved`). Predicados: `sui/gameActions.ts`. Errores: `sui/errors.ts` (`findExecutionError`,
  `transactionErrorMessage`). Preflight: `sui/execution.ts:43-77`.

### 3. Qué implementar
1. **`buildAcceptGameTx`** (DL-1): valida `packageId`, `houseId`, `gameId` con `assertObjectId` y `bet` en `1..U64_MAX`;
   `const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)])`; `tx.moveCall({ target: moveTarget(packageId,
   'accept_game'), arguments: [tx.object(gameId), tx.object(houseId), coin, tx.object.random()] })`; ningún comando
   después. JSDoc: por qué el `MoveCall` con `Random` va último (`agents.md` §7).
2. **`parseResolvedGame`** (DL-2): filtra `rawEvents(result)` por `gameEventType(originalPackageId, 'GameResolved')`,
   parsea con `parseOrNull(parseGameResolved)`, se queda con los de `gameId` (`sameAddress`); exactamente uno y con
   `sameAddress(event.acceptor, acceptor)` ⇒ el evento; si no, `null`.
3. **`acceptState`** y **`NOT_INVITED_HINT`** en `sui/gameActions.ts` (orden de M-3; `sameAddress` para creador e invitado).
4. **`sui/acceptGame.ts`:** `ACCEPT_GAS_RESERVE_MIST` con el valor de TASK-1 y un JSDoc que cite la medición (budget de
   S-4, margen y que el budget escala con el precio de gas: se revisa en #17); `acceptBalanceCheck` (`null` ⇒ `'unknown'`;
   `balance < bet + reserva` ⇒ `'insufficient'`); `wonBy`; `playerResult` (`null` si no es `resolved` o la cuenta no es
   creador ni aceptante).
5. **`errors.ts`:** `runtimeCancellation(source)`: sobre el `ExecutionError` que encuentre `findExecutionError`,
   `'congestion'` si `$kind === 'CongestedObjects'`; `'randomness'` si `$kind === 'Unknown'` y su `message` coincide con
   `/ExecutionCancelledDueToRandomnessUnavailable|randomness could not be generated/i`; si no, `null`.
   `transactionErrorMessage`: abort propio → cancelación del runtime → genérico. Textos exactos (DL-11):
   - `RUNTIME_CANCELLED_MESSAGES.randomness` = "La red canceló la transacción sin ejecutarla (la aleatoriedad de la red
     todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos";
   - `RUNTIME_CANCELLED_MESSAGES.congestion` = "La red canceló la transacción sin ejecutarla (hay congestión en un objeto
     compartido): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos".
6. **`execution.ts`** (DL-10): en el `catch` de `preflightTransaction`, antes de relanzar un `SimulationError`: si
   `error.executionError === undefined && isPreflightNetworkCause(error.cause)`, lanzar `new PreflightNetworkError({ cause:
   error })`. `isPreflightNetworkCause(cause)` = `isTransientReadError(cause)` salvo que TASK-1 obligue a acotarlo (lo
   fija el handoff v1.1). JSDoc con V-3.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/transactions/game.ts`, `gameTx.ts`, `gameActions.ts`, `acceptGame.ts` (nuevo), `errors.ts`,
  `execution.ts` y sus tests (`acceptGame.test.ts` nuevo).
- **NO tocar:** `hooks/`, `components/`, `pages/`, `config.ts`, `readPolicy.ts`, fixtures.

### 5. Tests obligatorios
| # | Archivo | Caso |
|---|---|---|
| T2-1 | `transactions/game.test.ts` | target `<packageId>::game::accept_game`; `commands` = `[SplitCoins(GasCoin, [Input Pure u64 = bet]), MoveCall]` y el `MoveCall` es el **último**; argumentos `[Input Game, Input House, NestedResult [0,0], Input Random]`; Random = `UnresolvedObject` con `objectId` = `normalizeSuiObjectId(SUI_RANDOM_OBJECT_ID)` y `mutable: false`; Game y House `UnresolvedObject` con sus IDs; lanza con cada ID inválido, `bet` 0 y `bet` > `U64_MAX` |
| T2-2 | `gameTx.test.ts` | `acceptCreatorWins`, `acceptAcceptorWins` y `acceptInvite` reales ⇒ ganador, `pot`, `fee`, `payout` del evento; sin eventos, dos `GameResolved`, otra partida, otro aceptante, tipo de otro paquete y BCS truncado ⇒ `null` |
| T2-3 | `gameActions.test.ts` | `acceptState`: abierta y otra cuenta ⇒ `available`; invitación al invitado (también en otro formato de dirección) ⇒ `available`; invitación y tercero ⇒ `not_invited`; creador (abierta e invitación, otro formato) ⇒ `creator`; sin cuenta y `pending` ⇒ `no_account` (también sobre una invitación, nunca `not_invited`) |
| T2-4 | `gameActions.test.ts` | **M-3:** `cancelled` y `resolved` ⇒ `not_pending` **con y sin cuenta**; `NOT_INVITED_HINT === ABORT_MESSAGES.game[5]` |
| T2-5 | `acceptGame.test.ts` | `acceptBalanceCheck`: `bet + reserva` justo ⇒ `ok`, uno menos ⇒ `insufficient`, `null` ⇒ `unknown`; `wonBy`; `playerResult`: creador ganó/perdió, aceptante ganó/perdió (direcciones en otro formato), tercero ⇒ `null`, `pending`/`cancelled` ⇒ `null` |
| T2-6 | `errors.test.ts` | los 4 `SimulationError` reales de aceptar ⇒ mensaje + sufijo (`acceptNotInvited` ⇒ `game`/5, D-20261103-02); `acceptNotPendingExecuted` por gRPC (`status.error`) y por `extractStatusFromEffectsBcs` ⇒ `game`/4 |
| T2-7 | `errors.test.ts` | `CongestedObjects` ⇒ texto de congestión; `Unknown` con `'ExecutionCancelledDueToRandomnessUnavailable'`, con el texto Rust (otra capitalización) y con `runtimeCancelled` si existe ⇒ texto de aleatoriedad; el mismo texto para un fallo de crear y uno de aceptar (MINOR-7 del plan); otro `Unknown` ⇒ "La red no ejecutó…"; un abort propio gana sobre todo |
| T2-8 | `execution.test.ts` | `build` rechaza con `new SimulationError(msg, { cause: new RpcError(msg, 'UNAVAILABLE') })` ⇒ `PreflightNetworkError` con `cause`; con los `cause.code` medidos en S-2 y S-6 ⇒ el `SimulationError` tal cual; sin `cause` ⇒ tal cual; con `executionError` ⇒ tal cual |

### 6. Smoke
No aplica (capa pura).

### 7. Criterios de aceptación
- Sin `any`, sin red, sin React; textos nuevos de `errors.ts` solo en `RUNTIME_CANCELLED_MESSAGES`.
- T2-1..T2-8 en verde; el resto de la suite sin cambios.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## TASK-3: máquina global sobre crear, cancelar y rechazar — área: app (`hooks/` + adaptación de `components/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** que la app no me deje enviar una segunda transacción mientras otra mía está en curso o sin
confirmar, aunque salga de la pantalla y vuelva, y ver el resultado de la que estaba en curso, **para** no crear dos
partidas ni pagar gas de más por error. **No entrega:** aceptar (TASK-4).

### 2. Contexto
- Hoy: candado `useRef` y `useMutation` por instancia (`useExecuteTransaction.ts:79-80, 191, 212-224`); `pendingReview`
  local en `CreateGameForm.tsx:86, 104, 149, 166`; `GameActions` sin "Ya la revisé"; `isBusy` combinado
  (`GameActions.tsx`). NIT-2 en `useExecuteTransaction.ts:147-149`.
- V-8 (atomicidad, `MutationCache.remove` no resetea el observer).
- Tests modelo: `hooks/useExecuteTransaction.test.tsx` (kit y `sui/execution` mockeados, fixture real, `queryWrapper`).

### 3. Qué implementar
1. **`queryKeys.ts`:** `txAccount` y `txTarget` (§4).
2. **`hooks/txSession.ts`** (puro): tipos de §4, `toTxEntry`, `mountSnapshot` y `deriveTargetState({ entries, viewId,
   mount })`:
   - `toTxEntry(view)(m)` = campos planos: `id` (`mutationId`), `status`, `viewId`/`runId`/`action` de `variables` (o
     `null`), `sameTarget` = `hashKey(m.options.mutationKey) === view.targetHash`, `outcome` = `data ?? null`;
   - `mountSnapshot(mutations)` = `{ maxId: max(mutationId) de **todas** las mutaciones recibidas o 0, pendingIds: ids de
     todas las que tienen status 'pending' }` (v1.2: recibe el `MutationCache` entero, sin filtrar por cuenta ni objetivo;
     al montar todas son ajenas porque la vista todavía no lanzó nada);
   - `inFlightForeign` = existe una `entry` `pending` (de cualquier objetivo de la cuenta) con `viewId !== viewId`;
   - `unconfirmed` = la `entry` de mayor `id` con `sameTarget` y `outcome?.kind === 'unconfirmed'` (propia o ajena);
   - `notice`: `{ kind: 'in_flight' }` si `inFlightForeign`; si no, la adoptable más nueva (M-2 (c): ajena, `sameTarget`,
     terminada, `outcome` ≠ `unconfirmed` y `id > mount.maxId || mount.pendingIds.has(id)`) **solo si** su `id` es mayor
     que el de toda `entry` propia de la vista (M-2 (a)); si no, `null`.
3. **`hooks/useTxTarget.ts`:**
   - `const [viewId] = useState(nextViewId)` (M-4, función de módulo); cuenta de `useCurrentAccount()`, red de
     `useAppConfig()`; `view` con `useMemo` por valores primitivos (M-5);
   - `entries` = `useMutationState({ filters: { mutationKey: view.accountKey }, select: toTxEntry(view) })`;
   - `mount` (M-2 (c)): `const [mount] = useState(() => mountSnapshot(queryClient.getMutationCache().getAll()))`, lectura
     pura al montar de todo el caché (v1.2); nada se muta en el render. El `sameTarget` de `deriveTargetState` usa la clave
     de la cuenta actual, así que tras un cambio de cuenta solo cuentan las de la cuenta nueva;
   - `const { inFlightForeign, notice, unconfirmed } = deriveTargetState({ entries, viewId, mount })`;
   - `busy` = `useIsMutating({ mutationKey: view.accountKey }) > 0`;
   - `acknowledge()` = buscar en `queryClient.getMutationCache().getAll()` la de `mutationId === unconfirmed.mutationId`
     y `queryClient.getMutationCache().remove(m)`.
4. **`useExecuteTransaction<T>(view)`:**
   - `useMutation<TxOutcome<T>, never, TxVariables<T>>({ mutationKey: view.key, retry: false, gcTime: Infinity,
     networkMode: 'always', mutationFn })`; la `mutationFn` es la `run` de hoy, con `input` sacado de las variables;
   - `execute(input)`, síncrono y en este orden: (i) `queryClient.isMutating({ mutationKey: view.accountKey }) > 0` ⇒
     retorna; (ii) alguna mutación de `view.key` con `state.data?.kind === 'unconfirmed'` en el caché ⇒ retorna; (iii)
     `const runId = nextRunId()` (M-4), `setRunId(runId)` y `void mutation.mutateAsync({ input, viewId: view.viewId,
     runId, action: input.action }).catch(() => undefined)`;
   - `outcome` (M-1 (a)): `useMutationState` por `variables.runId === runId`, y un `unconfirmed` se devuelve como `null`
     (M-1 (b));
   - `stage`: estado local como hoy (`setStage` dentro de la `mutationFn`);
   - se retiran el `useRef`, `locked`, `isBusy` y `reset`;
   - **NIT-2** (DL-9): en el `catch` de la firma sin digest, `if (findMoveAbort(error)) await invalidateAction();` antes del
     `failure`;
   - **DL-10, lado del hook:** un `SimulationError` sin abort y sin `executionError` ⇒ `failure(\`${PREPARE_FAILED_PREFIX}:
     ${errorText(error)}\`)`; con `executionError` sin abort, igual que hoy (`transactionErrorMessage`).
5. **Hooks de acción:** `useCreateGame(view)`, `useCancelGame(view)` y `useRejectGame(view)` con la misma lógica de hoy;
   el `gameId` sale de `view.target` (si `view.target.kind !== 'game'`, el tipo lo impide: `TxView` con genérico o
   sobrecarga, a criterio del DEV y sin `throw`). `CreateGameValue` se mueve a `txSession.ts` y se reexporta.
6. **Componentes (adaptación mínima):**
   - `CreateGameForm`: `const target = useTxTarget({ kind: 'create' })` en `ConnectedForm`; `useCreateGame(target.view)`;
     botón deshabilitado con `target.busy || target.unconfirmed !== null || !validation.ok`; `notice.in_flight` ⇒ `<p
     role="status">Hay una transacción en curso desde esta cuenta; espera a que termine</p>`; `unconfirmed` ⇒ el
     `TransactionStatus` de la alerta + "Ya la revisé: crear otra partida" (`target.acknowledge`); `notice.adopted` de
     `create` ⇒ mismo tratamiento que el resultado propio (navega si hay `created`, M-2 (b));
   - `GameActions`: **una** llamada a `useTxTarget({ kind: 'game', gameId: game.id })`; `useCancelGame(view)`,
     `useRejectGame(view)`; botones deshabilitados con `busy || unconfirmed !== null`; el mismo texto de `notice.in_flight`;
     una sola alerta "sin confirmar" + "Ya la revisé"; `notice.adopted` de cancelar/rechazar ⇒ un `TransactionStatus`
     con el texto de su acción (`cancelledText`/`rejectedText`).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/hooks/{queryKeys,txSession,useTxTarget,useExecuteTransaction,useCreateGame,useCancelGame,useRejectGame}.ts`
  y sus tests (`txSession.test.ts`, `useTxTarget.test.tsx` nuevos); `app/src/components/{CreateGameForm,GameActions}.tsx`
  y sus tests; opcional `app/src/test/txHarness.tsx` (helper de tests para renderizar con una vista).
- **NO tocar:** `sui/` (salvo lo de TASK-2, ya hecho), `TransactionStatus.tsx` (no cambia: la vista le pasa el
  `unconfirmed`), `txInvalidation.ts` (salvo tipos importados), `AppProviders.tsx`, `eslint.config.js`.

### 5. Tests obligatorios
`QueryClient` real por test (`createPolicyQueryClient`), kit y `sui/execution` mockeados como en
`useExecuteTransaction.test.tsx`, fixture real.

| # | Caso |
|---|---|
| T3-1 | **Atomicidad:** dos `execute` en el mismo tick ⇒ una preflight y una firma |
| T3-2 | **Remontaje, mismo objetivo:** vista A lanza; se desmonta durante "Confirmando…"; vista B nueva (mismo objetivo, mismo `QueryClient`) ⇒ `busy: true`, `notice: in_flight`, y `execute` de B no llama a la preflight; al terminar se libera |
| T3-3 | **Otro objetivo de la misma cuenta** ⇒ igual que T3-2; **otra cuenta** ⇒ libre |
| T3-4 | **Sin auto-bloqueo (MAJOR-1 del plan v1):** en una sola vista, `useTxTarget` + `useCancelGame` + `useRejectGame` sobre el mismo objetivo; mientras la propia está en curso, `notice` es `null` y `busy` es `true` |
| T3-5 | **M-1 (b):** la propia termina `unconfirmed` ⇒ `useTxTarget().unconfirmed.digest` = el digest; el `outcome` de la acción que la lanzó **y** el de la otra acción son `null`; `execute` sobre el objetivo no hace nada |
| T3-6 | **M-1 (a):** `acknowledge()` ⇒ `unconfirmed` `null`, la mutación ya no está en el caché y el `outcome` de la acción sigue `null` (no reaparece desde `useMutation().data`); `execute` vuelve a funcionar |
| T3-7 | **M-2 (c), adopción al montar:** vista B montada con una ajena `pending` del objetivo que después termina en `failure` (`game`/4 del nodo) ⇒ `notice: adopted` con ese resultado y la acción |
| T3-8 | **M-2 (c), empezó después de montar, en el mismo tick (v1.1):** vista montada sin nada; otra vista montada a la vez lanza una mutación del mismo objetivo cuyo camino resuelve de inmediato (preflight mockeada que rechaza enseguida ⇒ `failure` sin `await` real de red), de modo que empieza y termina dentro del mismo tick, sin un render intermedio con la ajena en `pending` ⇒ igual `adopted` (`id > mount.maxId`) |
| T3-9 | **M-2 (a), descarte:** con un `adopted` visible, la vista lanza una propia ⇒ `notice` `null` (también tras terminar la propia); con dos ajenas adoptadas, se muestra solo la más nueva |
| T3-10 | **No adopción de lo terminado:** vista montada con una `success` ajena ya terminada ⇒ `notice` `null`; con una `unconfirmed` ajena ya terminada ⇒ `unconfirmed` y `notice` `null` |
| T3-11 | **M-4:** dos montajes sucesivos en la misma posición del árbol dan `viewId` distintos (la mutación del primero es ajena para el segundo); ningún uso de `crypto.randomUUID` ni `useId` (grep en el reporte) |
| T3-12 | **`networkMode`:** con `onlineManager.setOnline(false)`, `execute` ⇒ `failure` con `PREFLIGHT_NETWORK_MESSAGE` (preflight mockeada rechazando con `PreflightNetworkError`) y `busy` vuelve a `false`; restaurar `onlineManager` al final |
| T3-13 | **NIT-2:** la wallet lanza sin digest un `Error` con el texto `MoveAbort` del SDK (de la fixture) ⇒ `failure` mapeado **y** `resetQueries`/`invalidateQueries` de la acción; sin abort ⇒ ninguna invalidación |
| T3-14 | **DL-10:** `SimulationError` sin `executionError` ⇒ "No se pudo preparar la transacción: …" y la wallet no se llama |
| T3-15 | **Regresión de #11 (v1.1, MINOR-1):** los tests existentes de `useExecuteTransaction`, `useCreateGame`, `useCancelGame`, `useRejectGame`, `CreateGameForm` y `GameActions` siguen, con **solo** esta migración permitida: (1) las firmas reciben `view` (helper de test opcional en `app/src/test/txHarness.tsx`); (2) una aserción `outcome` = `{ kind: 'unconfirmed', digest }` del hook (p. ej. `useExecuteTransaction.test.tsx:341-359`) pasa a `useTxTarget().unconfirmed.digest` = ese digest **y** el `outcome` del hook en `null`; (3) `isBusy` (`useExecuteTransaction.test.tsx:173, 184, 220, 240`; mocks de `CreateGameForm.test.tsx:52-54, 195` y `GameActions.test.tsx:27, 93`) pasa a `useTxTarget().busy`; (4) el mock con `outcome` `unconfirmed` y `reset` del formulario (`CreateGameForm.test.tsx:233-243`) pasa a mockear `useTxTarget().unconfirmed` y `acknowledge`. Todo lo demás (etapas, `success`/`failure` con mensaje, digest y costo, invalidaciones exactas, `interpret` que lanza ⇒ `value: null`, preflight, precheck de la House) se conserva **sin cambiar la aserción**. El reporte lista cada aserción migrada con `archivo:línea` antes/después |
| T3-16 | `txSession.test.ts`: `deriveTargetState` con tablas de `entries` (cada regla de §3.2); `mountSnapshot` con mutaciones de dos cuentas y dos objetivos ⇒ `maxId` y `pendingIds` globales; **v1.2:** foto tomada con una mutación terminada de B (`id` 2) en el caché, derivación con la clave de B ⇒ `notice` `null`; foto con una de B `pending` (`id` 2) que después termina ⇒ `adopted` |
| T3-17 | `CreateGameForm`: bloqueado por un `unconfirmed` de crear también tras remontar con el mismo `QueryClient` (una alerta, "Ya la revisé: crear otra partida" desbloquea); bloqueado con el texto de `in_flight` por una transacción de cancelar en curso; un crear adoptado `success` con `created` navega (M-2 (b)); **v1.2 (cambio de cuenta sin desmontar):** con la cuenta B se crea una partida (`success`, `created`); cambio a A y montaje del formulario; vuelta a B sin desmontar ⇒ `notice` `null` y **no** navega |
| T3-18 | `GameActions` con la máquina real (kit y `sui/execution` mockeados): un "sin confirmar" de cancelar ⇒ **una** alerta y **un** "Ya la revisé"; al pulsarlo desaparecen las dos cosas |

### 6. Smoke
No aplica en el task; lo cubren los pasos 13-14 del smoke del ciclo.

### 7. Criterios de aceptación
- Una sola máquina; ningún éxito sin la lectura del nodo; ni `useRef` de candado ni `useEffect` nuevos en `hooks/` y
  `components/` (grep pegado).
- `npm run lint -w app` en **0 problemas** pegado, sin `eslint-disable` nuevos (en especial `react-hooks/immutability` y
  `react-hooks/globals`, del preset `recommended` de `eslint-plugin-react-hooks` 7.1.1): nada se muta en el render
  (v1.1, MAJOR-1).
- T3-1..T3-18 en verde; la suite completa sin regresiones (conteo por archivo pegado).
- `TransactionStatus.tsx` sin delta.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## TASK-4: aceptar, resultado y detalle — área: app (`hooks/`, `components/`, `pages/`)

### 1. Historia de usuario del task
**Como** jugador, **quiero** un botón "Aceptar" que solo aparezca cuando puedo aceptar, me avise si no me alcanza el
saldo y, al confirmarse, me diga si gané o perdí con los montos reales, **para** jugar desde la app sin que nada me sugiera
un resultado antes de tiempo. **No entrega:** docs (TASK-5).

### 2. Contexto
- TASK-2 (`buildAcceptGameTx`, `parseResolvedGame`, `acceptState`, `acceptGame.ts`) y TASK-3 (`useTxTarget`, máquina).
- `GameActions.tsx` adaptado en TASK-3; `GameDetail.tsx` (`stateLabel`, montos con `resolutionAmounts`);
  `GameDetailPage.tsx`; `useSuiBalance` (sin cuenta no consulta).

### 3. Qué implementar
1. **`txInvalidation.ts`** (DL-6): `case 'accept'` ⇒ `{ reset: [lobby], invalidate: [game(id), ...balance, house(network,
   houseId)] }`; el comentario `:14` deja de decir "#12 … suman la House aquí" (queda "#14").
2. **`useAcceptGame(view, game)`:** `execute({ action: { kind: 'accept', gameId }, build: () => buildAcceptGameTx({
   packageId, houseId: config.houseId, gameId, bet: game.bet }), interpret: (r) => sender === null ? null :
   parseResolvedGame(r, { originalPackageId, gameId, acceptor: sender }) })`; sin `precheck` (DL-3).
3. **`GameActions`:**
   - `acceptState(game, address)`: `available` ⇒ bloque de aceptar; `not_invited` ⇒ `<p className="hint">{NOT_INVITED_HINT}</p>`;
     `no_account` ⇒ "Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron" (M-3:
     reemplaza la condición de hoy `address === null && pending`); `creator`/`not_pending` ⇒ nada de aceptar;
   - bloque de aceptar: `useSuiBalance()` (el hook solo se monta dentro de un subcomponente que existe con `available`);
     textos de DL-5: "Apuestas `<bet>` SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la
     transacción (50 % cada uno) y pagas su gas." y "Si tu wallet muestra una vista previa con un ganador o un cambio de
     saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción."; `acceptBalanceCheck`:
     `insufficient` ⇒ botón deshabilitado + "Saldo insuficiente: necesitas `<bet>` SUI de apuesta más ≈ `<reserva>` SUI
     para el gas"; `unknown` ⇒ habilitado + "No se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al
     firmar)"; botón "Aceptar" deshabilitado también con `busy || unconfirmed !== null`;
   - resultado (`TransactionStatus` de aceptar, `successText`): `value` con `wonBy(value, address)` ⇒ "¡Ganaste!
     Recibiste `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; si no ⇒ "Perdiste: ganó quien creó la partida y
     recibió `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; `value: null` ⇒ "Partida aceptada; no se pudo leer
     el resultado de la transacción: el detalle muestra el ganador"; el mismo texto para `notice.adopted` de `accept`.
4. **`GameDetail`:** prop `account: string | null`; en `Resolved`, `playerResult(game, account)` ⇒ `<dt>Resultado para
   ti</dt><dd>ganaste</dd>` o `perdiste`; nada para un tercero o sin cuenta. **`GameDetailPage`** le pasa
   `useWalletAccount().address`.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/hooks/{txInvalidation,useAcceptGame}.ts` y tests (`useAcceptGame.test.tsx` nuevo),
  `app/src/components/{GameActions,GameDetail}.tsx` y tests, `app/src/pages/GameDetailPage.tsx` y su test,
  `app/src/index.css` solo si hace falta un estilo mínimo.
- **NO tocar:** `sui/`, `useExecuteTransaction.ts`, `useTxTarget.ts`, `txSession.ts` (salvo un bug de TASK-3, declarado),
  `TransactionStatus.tsx`.

### 5. Tests obligatorios
| # | Caso |
|---|---|
| T4-1 | `useAcceptGame`: el builder recibe `game.bet`, `config.houseId` y el `gameId` de la vista; el valor es el evento de la fixture real; `null` si el resultado no trae el evento; invalidaciones exactas (`lobby` reset; `game`, `balance`, `house` invalidate) y ninguna de `txInfo`/`publishCheckpoint`/`checkpointTime`/`nodeInfo` |
| T4-2 | **M-3:** `GameActions` sin cuenta: `pending` ⇒ el texto nuevo y sin botones; `resolved` y `cancelled` ⇒ **ningún** aviso ni botón |
| T4-3 | creador ⇒ sin "Aceptar" (sí "Cancelar"); abierta y otra cuenta ⇒ "Aceptar" con las dos notas de DL-5 y la apuesta; invitado ⇒ "Aceptar" y "Rechazar"; tercero en invitación ⇒ `NOT_INVITED_HINT` sin "Aceptar" (D-20261103-02) |
| T4-4 | saldo `insufficient` ⇒ deshabilitado con el aviso; `unknown` ⇒ habilitado con su aviso; `ok` ⇒ habilitado sin aviso |
| T4-5 | **SEG-10:** en cada etapa (`preflight`, `signing`, `confirming`, `indexing`) con `outcome` `null`, ningún token ("Ganaste", "Perdiste", "Recibiste", "ganó quien", "Resultado para ti") en `.tx-status` ni `.game-actions` |
| T4-6 | éxito ganado, perdido (direcciones en otro formato) y `value: null`, cada uno con digest y costo |
| T4-7 | `failure` con el texto de `game`/4 y con el de DL-11 |
| T4-8 | `notice: in_flight` ⇒ "Aceptar", "Cancelar" y "Rechazar" deshabilitados con el texto de TASK-3 |
| T4-9 | **M-1 (b):** `unconfirmed` ⇒ **una** alerta (la de la vista), "Aceptar" deshabilitado y "Ya la revisé" llama a `acknowledge` |
| T4-10 | `notice: adopted` de `accept` ⇒ su texto de resultado; de `cancel` ⇒ el de cancelar |
| T4-11 | `GameActions` con la máquina real: un "sin confirmar" de aceptar ⇒ **una** alerta (complementa T3-18) |
| T4-12 | `GameDetail`: "Resultado para ti" para el creador y el aceptante (ganó/perdió), nada para un tercero ni sin cuenta ni en `pending` |

### 6. Smoke
No aplica en el task; es el smoke del ciclo.

### 7. Criterios de aceptación
- Ningún componente arma transacciones, IDs ni mensajes de error; de `@mysten/*` solo `@mysten/dapp-kit-react/ui`.
- T4-1..T4-12 en verde; la suite completa sin regresiones.

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## TASK-5: docs del ciclo — área: docs

### 1. Historia de usuario del task
**Como** quien mantiene o usa la app, **quiero** la guía de la app y del contrato al día con aceptar y la máquina global,
**para** no leer el código para saber qué bloquea qué. **No entrega:** código.

### 2. Contexto
`app/README.md` ("Mapa de `app/src/sui/`", "Hooks", "Componentes de transacción", "Transacciones (#11)", "Pendientes
conocidos"), `contracts/README.md` ("Cancelaciones del runtime", "Lectura desde la app"), `agents.md` §2,
`documents/STATUS.md`.

### 3. Qué implementar
- **`app/README.md`:** mapa de `sui/` (`acceptGame.ts`, `acceptState`/`NOT_INVITED_HINT`, `buildAcceptGameTx`,
  `parseResolvedGame`, `runtimeCancellation`, DL-10 en la preflight); hooks `useTxTarget`, `useAcceptGame`, `txSession.ts`
  y las claves de mutación `txAccount`/`txTarget`; "Transacciones (#11)" → "Transacciones (#11, #12)": candado global por
  cuenta, `networkMode: 'always'`, "sin confirmar" por objetivo durante la carga de la página, una alerta por vista,
  adopción (y cuándo se descarta), NIT-2, DL-10, cancelaciones del runtime, fila de aceptar en la tabla de invalidación;
  sección "Aceptar y resultado" con los textos de DL-5 y la nota de la vista previa de la wallet; **límite conocido R-5**
  con el texto de §1; `ACCEPT_GAS_RESERVE_MIST` con su medición.
- **`contracts/README.md`:** "Cancelaciones del runtime" → implementado (texto de la app); la fixture y su recaptura (si
  TASK-1 ya lo hizo, solo se revisa).
- **`agents.md` §2:** la línea de `contracts/fixtures/` (`game-tx.localnet.json` incluye aceptar).
- **`documents/STATUS.md`:** baseline de la app (tests, archivos, tamaño del build) y fila de #12 en el ciclo activo.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/README.md`, `contracts/README.md`, `agents.md`, `documents/STATUS.md`.
- **NO tocar:** código, `documents/DECISIONES.md`, `PLAN_ACCEPT.md`.

### 5. Tests obligatorios
Ninguno; gate de la app sin delta.

### 6. Smoke
No aplica.

### 7. Criterios de aceptación
- Sin rutas personales; los números coinciden con los reportes aprobados.
- `grep -n "#12" app/README.md contracts/README.md agents.md app/src` revisado a mano y pegado: ningún "lo hace #12"
  vigente (incluido el comentario de `txInvalidation.ts`).

### 8. Al terminar
Reporte con la plantilla de `FLUJO_AGENTES.md` §5. Sin commits ni pushes.

---

## Smoke del ciclo (después de TASK-5; runbook en la forma de AGENTE_MID §M5)

Al aprobarse TASK-5, el MID copia esta sección a `documents/SMOKE_ACCEPT.md` (con el estado "EN CURSO") y el DEV la
completa **durante** la corrida: las columnas "Resultado obtenido" y "Estado" nunca se llenan por adelantado.

```markdown
# SMOKE_ACCEPT
> Plan: PLAN_ACCEPT v2 | Handoff: HANDOFF_ACCEPT v<versión vigente> | Issue: #12 | Fecha: <día de la corrida> |
> Estado: EN CURSO
```

### Precondiciones
- **Worktree:** `<repo>`, branch `feature/issue-12-accept-resolve` con TASK-1..5 commiteadas; `npm ci` con Node 26; gate de
  la app en verde (reporte de TASK-5). Nada de esta corrida se commitea salvo `documents/SMOKE_ACCEPT.md`.
- **Red:** localnet **aislada** (`agents.md` §3), `env.sh` + `ids.env` + `smoke_guard`, publicación **variante B**, cierre
  del paso 7. **Una sola localnet** (`ss -ltn` sin `:9000`). **Regla B4:** todo `suic` con `PRE`, también los de lectura.
- **Testnet:** nada.
- **Cuentas:** `ADMIN`, `A`, `B` de la génesis (en `ids.env`, no se pegan). Wallets de la app: **tres burners** (`X` creador
  en `T1`, `Y` aceptante e invitado en `T2`, `Z` tercera cuenta en `T3`), fondeadas por CLI desde `A`. Nunca
  `new-address`; nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Navegador (🌐):** Chrome headless + CDP con perfil desechable en `<SMOKE_DIR>` (`--user-data-dir`, `HOME`/`XDG_*`
  aislados en `<SMOKE_DIR>/chrome-home`, `--remote-debugging-address=127.0.0.1`), cliente CDP propio en Node 26 sin
  dependencias (en `<SMOKE_DIR>`, no se commitea), como en #11 (`git show ac5a85c^2:documents/SMOKE_CREATE_CANCEL.md`,
  "Modalidad"). **Cada pestaña con `Target.createTarget({ url, newWindow: true })`**, todas visibles, **nunca**
  `Page.bringToFront` (`agents.md` §3 paso 6). Navegación solo por hash (`location.hash`) después de fondear una burner:
  recargar cambia su dirección. Campos con foco + `Input.insertText`; clicks con `element.click()` en `Runtime.evaluate`.
- **Archivos de entorno** (rutas literales en el archivo real; aquí placeholders): `env.sh` (solo `sui`/`suic`),
  `app.env` (`NODE`, `VITE_JS`, `PATH` de Node 26; no toca `HOME` ni `SUI_CONFIG_DIR`) y `chrome.env`, nunca dos en la misma
  llamada. Procesos en segundo plano con `exec` y PID en `<SMOKE_DIR>` (`sui.pid`, `vite.pid`, `chrome.pid`); `sui start`
  sale con 144 ante SIGTERM (esperado).
- **Pedidos en CDP** por sesión de pestaña (`Network.requestWillBeSent`), por método gRPC-web:
  `SimulateTransaction`, `ExecuteTransaction`, `GetTransaction`, `GetObject`/`BatchGetObjects`, `GetBalance`, `ListEvents`.
  Por acción con burner: **2** `SimulateTransaction` + **1** `ExecuteTransaction`. Lecturas `net::ERR_ABORTED` del primer
  montaje de `StrictMode` o de `waitForTransaction` no cuentan (se anotan).
- **Observador:** antes de cada acción, `Runtime.evaluate` instala un `MutationObserver` que guarda en `window.__txLog`
  `[performance.now(), selector, texto]` de `.tx-status`, `.game-actions` y, aparte, `.game-detail`.
- **Tokens de resultado (DL-5), con mayúsculas exactas:** "Ganaste", "Perdiste", "Recibiste", "ganó quien", "Resultado
  para ti". SEG-10 = ninguno en `.tx-status`/`.game-actions` mientras se vean "Verificando la transacción…", "Esperando la
  firma en la wallet…" o "Confirmando en la red…". Una lectura **del nodo** en `.game-detail` ("Resuelta", ganador) está
  permitida y se anota.
- **Textos esperados** (código de la branch): `GameActions.tsx`, `GameDetail.tsx`, `CreateGameForm.tsx`,
  `TransactionStatus.tsx`, `sui/errors.ts`, `sui/gameActions.ts`. Montos de referencia (250 bps): 0,01 SUI ⇒ pozo 0,02,
  comisión 0,0005, al ganador 0,0195; 0,02 ⇒ 0,04 / 0,001 / 0,039.
- **Costo de red** = `computationCost + storageCost − storageRebate` de `suic tx-block <digest> --json`.
- **Qué se pega:** IDs y direcciones abreviados; digests completos; nunca `sender`/`owner`, archivos de
  `<SMOKE_DIR>/net` ni logs completos.

### Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`; línea base `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/`; `test ! -e <repo>/contracts/deployments/localnet.json`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173`, `:9229`; `git status --porcelain` | línea base anotada; sin `localnet.json`; puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (`sui.pid`); `PRE suic chain-identifier`; `suic addresses --json` ⇒ `ADMIN`, `A`, `B` a `ids.env` | red arriba; `active-env` = `localnet`; chain id corto anotado | | ⏳ |
| 2 | DEV: publicación variante B (`PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`); `PKG`, `HOUSE`, `CAP` a `ids.env`; `update_fee_rate` 250 | exit 0; `localnet.json` ignorado por git; `Move.lock` sin delta; `FeeRateUpdated` 0 → 250 | | ⏳ |
| 3 | DEV: `vite` dev (`VITE_SUI_NETWORK=localnet`, `127.0.0.1:5173`, `vite.pid`) y Chrome (`chrome.pid`); 🌐 `T1`, `T2`, `T3` en `http://127.0.0.1:5173/` con `newWindow: true` y `Network.enable` | 200; CDP solo en 127.0.0.1; tres ventanas visibles (`document.visibilityState === 'visible'` en las tres) | | ⏳ |
| 4 | 🌐 Conectar `X` en `T1` e `Y` en `T2` (`internal-button` del kit ⇒ "Unsafe Burner Wallet"); direcciones del `title` de `.account-badge` a `ids.env`; DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$X` (y `@$Y`); 🌐 `#/nada` → `#/` | saldos 2 SUI en el formulario de `T1` y `T2`; mismas direcciones (sin recarga) | | ⏳ |
| 5 | 🌐 `T1` crea `G1` abierta de 0,01 (ID a `ids.env`). `T3` **sin conectar**: `location.hash = '#/game/<G1>'`. Salvedad: si el kit conecta `T3` solo a una burner nueva (sesión guardada del mismo origen), se anota y se desconecta antes de comprobar. Después conectar `Z` en `T3` y DEV fondea `Z` con **5000000** MIST | `T3` sin cuenta: "Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron", sin botones ni "Esta invitación es para otra dirección."; `Z` con 0,005 SUI | | ⏳ |
| 6 | 🌐 `#/game/<G1>` en las tres; contar pedidos | `T1`: sin "Aceptar" (sí "Cancelar"); `T2`: "Aceptar" habilitado, "Apuestas 0.01 SUI, igual que el creador…" y la nota de la vista previa; `T3`: "Aceptar" **deshabilitado** con "Saldo insuficiente: necesitas 0.01 SUI de apuesta más ≈ `<reserva>` SUI para el gas"; **cero** `SimulateTransaction` | | ⏳ |
| 7 | 🌐 `T2`: observador; click en "Aceptar". DEV: `suic tx-block <digest> --json`; `suic balance $X` y `$Y` (antes: anotados en el paso 6); `suic object $HOUSE --json` (`fees_collected` antes y después). **Plan B:** si sale el texto de DL-11 de aleatoriedad, se anota (prueba real de DL-11), `G1` sigue "Abierta" y se reintenta con el mismo botón | etapas en orden; **ningún token** de resultado en `.tx-status`/`.game-actions` durante las tres primeras etapas (`window.__txLog`); después "¡Ganaste! Recibiste 0.0195 SUI (pozo 0.02 SUI − comisión 0.0005 SUI)" o "Perdiste: ganó quien creó la partida y recibió 0.0195 SUI (…)" + "Transacción …" + "Costo de red"; 2 `SimulateTransaction` + 1 `ExecuteTransaction`. DEV: `GameResolved` `pot` 20000000, `fee` 500000, `payout` 19500000; Δ`Y` = (ganó ? 19500000 : 0) − 10000000 − costo; Δ`X` = (ganó ? 19500000 : 0); Δ`fees_collected` = 500000; latencias anotadas | | ⏳ |
| 8 | 🌐 `T1`: `#/nada` → `#/game/<G1>`; `T2` en el detalle; `T2`: `#/` | `T1` y `T2`: "Resuelta", mismo ganador y montos; "Resultado para ti" coherente con el paso 7 en cada una; `G1` fuera del lobby de `T2` sin "Actualizar" | | ⏳ |
| 9 | 🌐 `T1` crea `G2` de 0,02 invitando a `Y`. `T3`: `#/game/<G2>` por URL. `T2`: `#/game/<G2>` | `T3`: sin "Aceptar", con "Esta invitación es para otra dirección." (D-20261103-02); `T2`: "Aceptar" y "Rechazar" | | ⏳ |
| 10 | DEV, `game`/5 por CLI (D-20261103-02): `PRE act_as "$B" && suic ptb --split-coins gas "[20000000]" --assign c --move-call "$PKG::game::accept_game" @$G2 @$HOUSE c.0 @0x8 --gas-budget 100000000 --json > "$SMOKE_DIR/tx-10.json"`; 🌐 `T2` sigue en `G2` | fallo ejecutado: `MoveAbort(… Identifier("game") …, 5)`; `B` solo paga gas; `G2` sigue "Invitación a `<Y>`" | | ⏳ |
| 11 | 🌐 **Doble clic:** `T2` en `#/game/<G2>`; en **un solo** `Runtime.evaluate`, `const b = <"Aceptar">; b.click(); b.click();`. DEV: `tx-block`, saldos | **2** `SimulateTransaction` y **1** `ExecuteTransaction`; un solo resultado; `GameResolved` con `acceptor` = `Y`, `pot` 40000000, `fee` 1000000, `payout` 39000000; invariante de fondos | | ⏳ |
| 12 | 🌐 **Tercera cuenta, carrera (D-20261103-02):** DEV fondea `Z` con 1 SUI; `T1` crea `G3` abierta de 0,01; `T2` y `T3` en `#/game/<G3>` ("Aceptar" habilitado en ambas). `T2` acepta ⇒ éxito; **inmediatamente**, en `T3` solo por `Runtime.evaluate` (sin foco), click en "Aceptar". Si `T3` ya se refrescó, repetir con otra partida y anotar | `T3`: "Verificando la transacción…" ⇒ "La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)"; en `T3`, **1** `SimulateTransaction` (la preflight) y **cero** `ExecuteTransaction`; el detalle de `T3` pasa a "Resuelta" por la invalidación tras el abort (sin esperar el intervalo); saldo de `Z` sin cambios | | ⏳ |
| 13 | Si los pasos 7, 11 y 12 no dieron los dos ganadores: hasta 3 aceptaciones más (`T1` crea, `T2` acepta) | se anota qué ganadores se vieron | | ⏳ |
| 14 | 🌐 **MINOR-1, crear, mismo objetivo:** `T2` crea `G4` abierta de 0,01. En `T1`: `Fetch.enable` con `urlPattern: '*LedgerService/GetTransaction*'` y `Fetch.failRequest` (`ConnectionFailed`) en cada pausa; crear abierta de 0,01 ⇒ "Confirmando en la red…". Durante la espera: (i) `#/nada` → `#/`; (ii) foco en "Apuesta (SUI)" + `Input.insertText('0.01')` (monto válido: sin el candado, el botón estaría habilitado) y, con el monto escrito, `form.requestSubmit()` por `Runtime.evaluate`; (iii) `#/game/<G4>`; (iv) `#/`. A los ≈ 30 s, `#/nada` → `#/`; `Fetch.disable`; "Ya la revisé: crear otra partida". DEV: `tx-block` del digest de la alerta | (i) "Crear partida" deshabilitado con "Hay una transacción en curso desde esta cuenta; espera a que termine"; (ii) con el monto válido, "Crear partida" sigue `disabled` con el texto de "en curso"; tras `requestSubmit()`, siguen **1** `ExecuteTransaction` y **2** `SimulateTransaction`; (iii) "Aceptar" de `G4` deshabilitado con el mismo texto; (iv)/a los 30 s: **una** alerta "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar" con el digest y "Crear partida" deshabilitado, también tras `#/nada` → `#/`; "Ya la revisé" desbloquea; DEV: `success` (se ejecutó) | | ⏳ |
| 15 | 🌐 **MINOR-1, aceptar:** `T1` crea `G5` abierta de 0,01; en `T2`, el mismo `Fetch`; `T2` acepta `G5`; durante "Confirmando…": `#/` y vuelta a `#/game/<G5>`; a los ≈ 30 s, `Fetch.disable` y "Ya la revisé" | en `#/`: formulario deshabilitado con el texto de "en curso"; de vuelta en `G5`: el mismo texto y ningún token de resultado en `.tx-status`/`.game-actions`; a los 30 s, **una** alerta "sin confirmar" con el digest (el detalle ya puede verse "Resuelta": lectura del nodo, permitida); "Ya la revisé" la quita; **1** `ExecuteTransaction` | | ⏳ |
| 16 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill` por PID de `vite` y Chrome; `kill -0` falla en `sui`, `vite` y Chrome; puertos libres; `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`; `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; `git status --porcelain` solo con `documents/SMOKE_ACCEPT.md` | todo limpio; `~/.sui/` sin cambios | | ⏳ |

### Qué no cubre este smoke (y dónde está cubierto)
- "Sin confirmar" de una partida que sigue pendiente (la burner siempre ejecuta antes de que falle la confirmación):
  T3-5/T3-6.
- Adopción de un resultado `failure`: T3-7. NIT-2: T3-13. `networkMode` sin red: T3-12. DL-10: T2-8, T3-14.
- Cancelaciones del runtime si el plan B del paso 7 no ocurre: T2-7 (y S-5).
- Fallo ejecutado de aceptar en la UI: fixture `acceptNotPendingExecuted` + T2-6.
- `game`/5 en la UI: no existe por diseño (D-20261103-02); paso 10 (CLI) + T2-6.
- Wallets de extensión y su vista previa con `Random`, pestañas con la misma cuenta (R-5) y la latencia de testnet: #17
  (owner).

### Si algo falla
- Capturar: número de paso, digest y `suic tx-block <digest>` (sin `sender`/`owner`), DOM o texto relevante,
  `window.__txLog` y `Network.*`/consola de la pestaña.
- Un paso fallido ⇒ **NO PASA**; el cierre (paso 16) se ejecuta igual.
- Una recarga accidental cambia la burner de esa pestaña: se anota, se reconecta y se vuelve a fondear; no es falla del
  producto.

### Reporte final
- Pasos PASA/TOTAL:
- Latencias (ms, `window.__txLog`): `preflight → signing`, `signing → confirming`, `confirming → done` de los pasos 7, 11
  y 12 (`T2`).
- Ganadores observados:
- Hallazgos (n° de paso + digest / output):
- Veredicto: [PASA | NO PASA]

---

## Al terminar el ciclo

El MID propone el body del PR con `Closes #12` y:
- D-20261103-02;
- DL-1..13 del plan v2 y M-1..5 de este handoff;
- **DL-10 como corrección de la máquina de #11** (condición de la revisión del plan v1), con su test;
- la recaptura completa de `game-tx.localnet.json` (cambian los IDs y digests de las secciones de #11);
- gates y smoke;
- pendientes: #17 para la vista previa de una extensión, R-5, la latencia en testnet y la reserva de gas con el precio
  de testnet.

Mensaje propuesto para esta versión: `docs: bind the mount snapshot to the whole mutation cache, handoff v1.2 (#12)`.
