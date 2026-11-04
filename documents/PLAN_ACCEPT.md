# PLAN_ACCEPT v2
> Issue: #12 (hereda MINOR-1 y NIT-2 de la revisión de integración de #11, publicada en el PR #46, y el comentario del
> issue del 2026-11-03) | Áreas: app / contracts (solo `contracts/fixtures/` y docs) / docs | Branch:
> `feature/issue-12-accept-resolve` (desde `master` `a6ee14c`) | Fecha: 2026-11-03

## Changelog

- **v1 (2026-11-03)**: primera versión.
- **v2 (2026-11-03)**: revisión del MAYOR del plan v1 (REQUEST CHANGES: 1 MAJOR, 8 MINOR, 5 SUGGESTION) y decisión del
  usuario sobre P-1.

| Hallazgo | Cambio en v2 |
|---|---|
| **MAJOR-1** (quién lanzó la mutación; tres hooks sobre el mismo objetivo) | DL-8 y DL-13 rediseñados. Cada vista llama **una sola vez** a `useTxTarget(target)`, que crea un `viewId` propio y es la **única** fuente de `busy`, del aviso de una transacción ajena, del "sin confirmar" del objetivo y de `acknowledge()`. Los hooks de acción reciben esa vista, sellan `viewId` y un `runId` en las `variables` de la mutación, y solo exponen su etapa y su resultado. Una mutación es "propia" si su `viewId` es el de la vista. Tests nuevos: TASK-3, con los tres hooks y `useTxTarget` sobre un `QueryClient` real; TASK-4, `GameActions` con la máquina real contando **una** alerta |
| **MINOR-1** (citas y dato desactualizado) | Citas corregidas: `execution.ts:70`, `:84-94`; `useExecuteTransaction.ts:133-136`; `events.ts:126-148`; `txInvalidation.ts:14`; `CreateGameForm.tsx:86, 104, 149, 166`. Se quita la salvedad: la revisión de integración de #46 está publicada en el PR (2026-11-03) y se cita como fuente |
| **MINOR-2** (el smoke no prueba el escenario literal) | Paso 13: volver al **mismo** objetivo durante "Confirmando…" y `form.requestSubmit()` ⇒ 1 `ExecuteTransaction`. Paso 10: doble `click()` en "Aceptar" ⇒ 2 `SimulateTransaction` y 1 `ExecuteTransaction`. Paso 6: plan B si sale `ExecutionCancelledDueToRandomnessUnavailable` (prueba real de DL-11). Paso 4: salvedad de la reconexión del kit en `T3` |
| **MINOR-3** (la instancia remontada pierde el resultado) | DL-8: `useTxTarget` **adopta** la mutación ajena de su objetivo que ve en curso y muestra su resultado al terminar. Una mutación ya terminada al montar no se adopta, así el formulario no navega dos veces. Tests en TASK-3 y TASK-4; paso 13 del smoke |
| **MINOR-4** (aserción SEG-10 ambigua) | DL-5 y el paso 6 definen los tokens exactos, distinguiendo mayúsculas: "Ganaste", "Perdiste", "Recibiste", "ganó quien", "Resultado para ti". Se buscan solo en `.tx-status` y `.game-actions`. Queda escrito que una lectura **del nodo** en `.game-detail` está permitida; SEG-10 prohíbe lo que sale de la wallet o de la simulación |
| **MINOR-5** (DL-10 clasifica por código gRPC sin medir) | S-2 anota `cause.code`; S-6 nueva: simulación de aceptar con saldo menor que `bet` + gas. DL-10 queda condicionado a esos códigos: si alguno permanente cae en `TRANSIENT_RPC_CODES`, la regla se acota (p. ej. solo `UNAVAILABLE`/`DEADLINE_EXCEEDED` en este camino) |
| **MINOR-6** (reserva justificada con la métrica equivocada) | DL-4 y S-4: la reserva se justifica contra el `gasData.budget` que fija el nodo en los bytes de la preflight (≈ 6,94 M MIST según #6: cómputo + storage bruto), con un margen explícito ≥ 2×. Valor provisional 0,015 SUI, que fija TASK-1 |
| **MINOR-7** (texto de DL-11 no sirve para crear) | Texto neutro respecto de la acción. Test con crear |
| **MINOR-8** (`G_CANCEL` debe ser abierta) | TASK-1: el script exige `opponent === null` en `G_CANCEL` y aborta si no. `contracts/README.md` lo dice |
| SUGGESTION-1 (`networkMode: 'always'`) | **Aceptada** (DL-7): sin red, la mutación no queda en pausa reteniendo el candado; falla en la preflight con el texto de red. Test |
| SUGGESTION-2 (Web Locks entre pestañas) | **No se adopta**; R-5 queda documentado en `app/README.md` como límite conocido. Motivo: el candado entre pestañas solo se toma de forma asíncrona, dentro de la `mutationFn`, así que sería un segundo mecanismo con otra semántica. Además, el contrato ya rechaza la segunda aceptación, cancelación o rechazo (`game`/4), y la wallet de extensión muestra cada aprobación |
| SUGGESTION-3 (`acceptState` en `gameActions.ts`) | **Aceptada** (DL-4): `acceptState` vive junto a `canCancel`/`canReject`; `wonBy`, `playerResult` y la reserva quedan en `acceptGame.ts` |
| SUGGESTION-4 (objetivo por tipo, `gameId` normalizado) | **Aceptada** (DL-13): `execute` no recibe objetivo; el hook de acción lo toma de la vista y nada lanza hacia el componente. `queryKeys.txTarget` normaliza `gameId` |
| SUGGESTION-5 (partir TASK-3) | **Aceptada**: TASK-3 es la máquina global sobre crear, cancelar y rechazar, con regresión de #11 (hooks más la adaptación mínima de sus componentes). TASK-4 es aceptar (hook y UI) |
| **P-1** | Decidido por el usuario: **(a) aviso sin botón**, D-20261103-02. Línea de decisión y reinterpretación del criterio del smoke en §"Decisión del usuario (P-1)"; tasks y smoke alineados |

## Historia de usuario

**Como** jugador con la wallet conectada que encontró una partida abierta (o recibió el enlace de una invitación),
**quiero** aceptarla con un clic igualando exactamente la apuesta del creador y ver quién ganó el coinflip, cuánto se
pagó y cuánto cobró la House, con el enlace a la transacción, **para** jugar sin la CLI y confiar en que el resultado que
veo es el que quedó on-chain y no una animación o una simulación.

**Scope en una frase:** botón "Aceptar" en el detalle de la partida (solo para quien puede aceptarla y con saldo), PTB de
aceptación con el `Random` del sistema, resultado leído del `GameResolved` de la propia transacción después de que el nodo
confirma, y el candado contra el doble envío y el bloqueo por "sin confirmar" globales en el `QueryClient` para crear,
cancelar, rechazar y aceptar.
**Lo que NO entrega:** "mis partidas" e invitaciones recibidas (#13), historial global, animaciones de batalla naval
(#18), el panel de la House (#14), un botón "Resolver" ni un estado `Active` (no existen: la resolución es atómica,
D-20261030-06 (1) = D1 de #5), cambios del contrato, persistencia de "sin confirmar" más allá de la carga de la página, ni
un candado entre pestañas (R-5).

## Contexto y alcance

**Qué existe hoy (`master` `a6ee14c` = código de #11, `ac5a85c`, más el housekeeping):**

- Contrato cerrado (#6): `entry fun accept_game(game: &mut Game, house: &mut House, payment: Coin<SUI>, r: &Random, ctx)`
  (`contracts/sources/game.move:142-159`): validar (versión, House, authZ, estado, monto exacto) → cobrar la comisión →
  sortear por índice → pagar, todo en una transacción, con un solo evento `GameResolved { game_id, creator, acceptor,
  winner, pot, fee, payout }` (`game.move:75`, `:222-230`). Abort codes `game` 4, 5, 7, 8, 9, 10 y `house::EWrongVersion`
  en el cobro (`contracts/README.md`, "Funciones" y "Abort codes"). En el PTB, después del `MoveCall` con `Random` solo
  `TransferObjects`/`MergeCoins` (`contracts/README.md`, "PTB"; `agents.md` §7). Las cancelaciones del runtime
  (`ExecutionCancelledDueToRandomnessUnavailable`, congestión) llegan como `failure` sin `MoveAbort` y "#12 las muestra
  como «reintentar»" (`contracts/README.md`, "Cancelaciones del runtime").
- **D1 de #5 resuelta como atómica** (D-20261030-06 (1)): no hay builder de resolución, ni estado `Active`, ni botón
  "Resolver"; el criterio 4 del issue no aplica.
- Lecturas de #10: `sui/game.ts` (`parseGameObject`, `resolutionAmounts`), `sui/events.ts` (`parseGameResolved` con los
  invariantes `pot == payout + fee` y `winner ∈ {creator, acceptor}`, `events.ts:126-148`), `hooks/useGame.ts` (15 s).
- Maquinaria de #11: `sui/transactions/game.ts` (builders, `moveTarget` acotado a tres funciones, `game.ts:16-18`),
  `sui/errors.ts` (`ABORT_MESSAGES` ya con `game` 7-10, `errors.ts:17-20`), `sui/execution.ts` (preflight, confirmación,
  checkpoint, `networkCost`), `sui/gameTx.ts` (`rawEvents`, `parseCreatedGame`, `cancelledRefund`),
  `sui/gameActions.ts` (`canCancel`, `canReject`), `sui/account.ts`, `sui/createGame.ts` (`CREATE_GAS_RESERVE_MIST`),
  `hooks/useExecuteTransaction.ts`, `hooks/txInvalidation.ts`, `hooks/useCancelGame.ts`/`useRejectGame.ts`/
  `useCreateGame.ts`, `hooks/useSuiBalance.ts`, `components/{TransactionStatus,GameActions,GameDetail,CreateGameForm}.tsx`,
  `pages/GameDetailPage.tsx`.
- Baseline (`documents/STATUS.md`, medido en `ac5a85c`): app **630 tests en 46 archivos**, lint 0, typecheck 0, build de
  testnet 878 kB; Move 83 tests; `node --test` 99; `check` "0 despliegues". El handoff lo re-verifica en su §0.

**Pendientes heredados de #11.** Fuentes: la revisión de integración del MAYOR del PR #46 (publicada en el PR el
2026-11-03, `gh api repos/sdelvalle57/sui_battleship/pulls/46/reviews`; sección "Issues futuros → #12") y el comentario
del issue:

| Pendiente | Evidencia | Dónde se resuelve |
|---|---|---|
| **MINOR-1:** el candado (`useRef`, `useExecuteTransaction.ts:79-80, 212-224`) y el bloqueo por "sin confirmar" (`pendingReview`, `CreateGameForm.tsx:86, 104, 149, 166`; en `GameActions` no existe) son por instancia: salir de la pantalla y volver permite otro envío | `mutation.data` y `stage` son estado del componente (`useExecuteTransaction.ts:78, 191, 226-236`) | DL-7, DL-8, DL-13, TASK-3 |
| **NIT-2:** un error de la wallet **sin** digest que trae un `MoveAbort` no invalida la acción | `useExecuteTransaction.ts:147-149` (la preflight sí: `:135`) | DL-9, TASK-3 |
| Textos de "reintentar" para las cancelaciones del runtime | `contracts/README.md`, "Cancelaciones del runtime" | DL-11, TASK-2 |
| Reusar `useExecuteTransaction`, `errors.ts` (`game` 7-10) y sumar la fila de aceptar en `txInvalidation.ts` | `txInvalidation.ts:14` ("#12 y #14 suman la House aquí") | DL-6, TASK-4 |
| Runbooks: cada pestaña con `Target.createTarget({ url, newWindow: true })` | `agents.md` §3 paso 6 | Smoke |

**Fuera de alcance:** #13 (listas de mis partidas e invitaciones), #14 (panel de la House y `fees_collected` en
pantalla), #17 (wallet de extensión real y latencia de testnet), una confirmación propia antes de firmar (la wallet de
navegador muestra la suya; mismo criterio que DL-10 de #11), ocultar "Aceptar" por versión de la partida o de la House
(lo atrapa la preflight con `game`/7, ver DL-3), candado entre pestañas (R-5).

## Verificación contra el SDK instalado

`npm ci` con Node 26 en el worktree (`@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39, `@mysten/dapp-kit-react`
2.1.41, `@tanstack/react-query`/`query-core` 5.105.0). Rutas relativas a `node_modules/`. El MAYOR validó V-1..V-8 contra
el SDK instalado en la revisión del plan v1.

| # | Hecho verificado | Evidencia | Consecuencia |
|---|---|---|---|
| V-1 | **`Random` tiene helper:** `tx.object.random()` = `UnresolvedObject { objectId: SUI_RANDOM_OBJECT_ID, mutable: false }`, **sin** `initialSharedVersion` (la resuelve el nodo). `SUI_RANDOM_OBJECT_ID` (`0x0…08` normalizado) se exporta de `@mysten/sui/utils` | `@mysten/sui/dist/transactions/object.mjs:29-35`; `dist/utils/constants.mjs:11`; `dist/utils/index.mjs:12` | El builder usa el helper (nada hardcodeado, ni en `sui/`); los tests comparan el input con `SUI_RANDOM_OBJECT_ID`. No hace falta una constante propia |
| V-2 | Con `SuiGrpcClient`, `build({ client })` usa el **plugin de resolución gRPC**: un `SimulateTransaction` del lado del nodo con `doGasSelection` y `readMask` de `sender`, gas, `expiration`, `kind`, `effects.status` y `epoch` (**sin eventos**); con `status.success: false`, `SimulationError` con `executionError` estructurado | `dist/transactions/resolve.mjs:19-26` → `dist/grpc/client.mjs:150-151` → `dist/grpc/core.mjs:511-550` | La preflight (y el `build` de la burner) resuelven `Random` en el nodo y **nunca reciben** el `GameResolved` simulado: nada que mostrar antes de tiempo (SEG-10). Los aborts de aceptar llegan estructurados como los de #11 |
| V-3 | **Hallazgo:** un error de transporte durante ese `SimulateTransaction` (nodo caído, `UNAVAILABLE`) **no** llega como `RpcError`: el plugin lo envuelve en `new SimulationError(error.message, { cause: error })`, sin `executionError`. `preflightTransaction` relanza todo `SimulationError` tal cual (`app/src/sui/execution.ts:70`) y el hook lo muestra con `transactionErrorMessage` (`useExecuteTransaction.ts:133-136`), que sin abort ni `ExecutionError` cae en "La wallet no completó la operación: …" (`errors.ts:186-189`), aunque la wallet no se abrió. El test de #11 (`execution.test.ts:67`) rechaza `build` con el `RpcError` directo y no ve el envoltorio | `dist/grpc/core.mjs:532-534` | DL-10: corregirlo en la maquinaria común, porque aceptar pasa por la misma preflight (el MAYOR lo deja en este ciclo; se declara en el body del PR como corrección de la máquina de #11) |
| V-4 | **El nodo simula con `Random`:** en el smoke de #6 la CLI 1.83 aceptó **sin** `--gas-budget` (paso 11: la CLI estima el gas simulando) con `@0x8`, por gRPC (el fullnode no sirve JSON-RPC). La regla "después de `Random` solo `TransferObjects`/`MergeCoins`" se aplica **antes** de ejecutar (paso 10: rechazo sin digest) | `git show 8fddbda:documents/SMOKE_ACCEPT.md`, pasos 10-11 | La preflight funciona con aceptar; TASK-1 lo confirma por el camino del SDK (S-1) y mide la forma del rechazo de la regla (S-2), que el builder nunca dispara |
| V-5 | Eventos del resultado del nodo por gRPC: `{ packageId, module, sender, eventType, bcs, json }` (bcs = `event.contents.value`); `waitForTransaction` con `include: { events: true }` los trae | `dist/grpc/core.mjs:902-909`; `dist/client/types.d.mts:297-299, 927-941`; `app/src/sui/execution.ts:84-94` | El resultado se parsea del BCS de los eventos de la confirmación del nodo con `parseGameResolved` (como `gameTx.ts` con los de #11); el `json` no se usa |
| V-6 | **Cancelaciones del runtime por gRPC:** la congestión llega como `$kind: 'CongestedObjects'`; `ExecutionCancelledDueToRandomnessUnavailable` no tiene detalles en el proto y cae en `default` → `$kind: 'Unknown'` con `message` = `description` del nodo (por BCS, el SDK da `message: 'ExecutionCancelledDueToRandomnessUnavailable'`). El texto Rust de la variante es "Certificate is cancelled because randomness could not be generated this epoch"; la `description` de la fixture de #11 usa el formato `Debug` (`MoveAbort(MoveLocation {…}, 3) in command 0`), así que el nombre de la variante es la forma más probable | `dist/grpc/core.mjs:625-735`; `dist/client/utils.mjs:267-273`; `crates/sui-types/src/execution_status.rs` @ `testnet-v1.83.0` (lectura pública) | DL-11: `errors.ts` reconoce la congestión por `$kind` y la falta de aleatoriedad por las **dos** formas de texto; R-3 |
| V-7 | La burner hace `build({ client })` (simula, V-2) y ejecuta con su cliente; una wallet de extensión muestra su **propia vista previa** de la simulación, que con `Random` puede incluir un ganador y cambios de saldo que **no** son los de la ejecución real (la aleatoriedad real sale de la ronda de consenso en que se ordena la transacción). La app solo toma el digest de la wallet | `dapp-kit-core/dist/index.mjs:809-829`; `useExecuteTransaction.ts:145-146` | DL-5: nota junto al botón; la app nunca muestra la simulación |
| V-8 | **TanStack 5.105.0:** `useMutation().mutateAsync` llama a `MutationObserver.mutate`, que construye la mutación en el `MutationCache` y entra en `Mutation.execute`, que despacha `pending` **antes de su primer `await`**; por eso `queryClient.isMutating({ mutationKey })` justo después ya la cuenta (chequear y mutar es atómico dentro del tick). `mutationKey` filtra con coincidencia **parcial** (`useIsMutating`, `useMutationState`, `findAll`), y los dos hooks usan `useSyncExternalStore` con `replaceEqualDeep`. Una mutación sin observadores se borra a los `gcTime` (5 min por defecto); con `gcTime: Infinity` no se agenda borrado. Con `networkMode` por defecto (`'online'`), sin red la mutación arranca en pausa (`pending`) y se reanuda sola al volver la red | `query-core/build/modern/mutationObserver.js:136-142`; `mutation.js:173-182`; `queryClient.js:110-114`; `utils.js:94-105`; `removable.js:23-27`; `retryer.js:19-20, 91-92`; `react-query/build/modern/useMutationState.js:25, 124` | DL-7/DL-8: candado y "sin confirmar" en el `MutationCache` del `QueryClient` de `AppProviders`, con `networkMode: 'always'`; sin dependencias nuevas |

## Contrato on-chain

Sin cambios. Se consume `accept_game` y el evento `GameResolved`; los mensajes de `game` 4, 5, 7-10 y `house`/3 ya están
en `ABORT_MESSAGES`. Sin impacto en la compatibilidad de upgrade. Sin filas nuevas en `agents.md` §5: `Random` sale del
helper del SDK (V-1) y `GameResolved` ya tiene su esquema en `events.ts`.

## Flujo de fondos

| Camino | Entra | Custodia | Sale | Comisión |
|---|---|---|---|---|
| Aceptar (cualquiera menos el creador; en una invitación, solo el invitado) | `splitCoins(gas, [bet])` de la cuenta conectada, con `bet` **leído del `Game`** (nunca escrito por el usuario) | pozo `2 × bet` dentro de la transacción | `payout = pot − fee` al ganador (`creator` o `acceptor`, sorteo on-chain) | `fee = ⌊pot × fee_rate / 10 000⌋` con el `fee_rate` **guardado en la partida**, a `House.fees_collected` |

El aceptante paga el gas (incluye el sorteo) y la diferencia de storage entre la versión `Resolved` y la `Pending` del
`Game` (medido en #6: `gasUsed` 1000000 / 5943200 / 5456254, costo neto ≈ 1486946 MIST; el **budget** que hay que cubrir
es mayor, ≈ cómputo + storage bruto, ver DL-4). Si la transacción aborta o el runtime la cancela, revierte entera: el
aceptante solo paga gas y la partida sigue `Pending`. Invariante que verifica el smoke: `payout + fee = 2 × bet`;
Δ aceptante = (ganó ? `payout` : 0) − `bet` − costo de red; Δ creador = (ganó ? `payout` : 0); Δ `fees_collected` = `fee`.

## Decisión del usuario (P-1)

> Decisión (2026-11-03): una cuenta conectada que abre una invitación dirigida a otra dirección no ve "Aceptar" y ve el
> aviso "Esta invitación es para otra dirección." (nunca sin cuenta conectada), sobre mostrarle el botón para que falle u
> ocultarlo sin aviso, porque el issue contradecía el criterio del botón con el del smoke. El criterio del smoke "intento
> con una tercera cuenta (abriendo el detalle por URL) que muestra el error mapeado" se reinterpreta así: en la app, la
> tercera cuenta recibe el error mapeado `game`/4 al aceptar una partida abierta que otro aceptó antes (carrera);
> `game`/5 (`ENotInvited`) se cubre por CLI en el smoke y con el test sobre la fixture real `acceptNotInvited` —
> aprobado por el usuario (D-20261103-02).

Consecuencias en el plan: `acceptState` devuelve `not_invited` solo con cuenta conectada (DL-4; con `no_account` gana el
texto de "Conecta tu wallet"); TASK-2 testea `acceptNotInvited` de la fixture real; TASK-4 muestra el aviso; el smoke
cubre `game`/5 por CLI (paso 9) y `game`/4 por carrera en la app (paso 11).

## Decisiones abiertas → STOP

Ninguna. P-1 está decidido (D-20261103-02), el issue no declara otras, el contrato no cambia y no hay dependencias
nuevas. Las decisiones de diseño de abajo las revisa el MAYOR.

## Decisiones de diseño (del MID, sin STOP; las revisa el MAYOR)

| # | Decisión | Alternativas descartadas | Motivo |
|---|---|---|---|
| DL-1 | **Builder puro** `buildAcceptGameTx({ packageId, houseId, gameId, bet })` en `sui/transactions/game.ts`: `const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)])` y `tx.moveCall({ target: '<packageId>::game::accept_game', arguments: [tx.object(gameId), tx.object(houseId), coin, tx.object.random()] })`, **último comando** (nada después). Lanza ante un ID inválido, `bet <= 0` o `bet > U64_MAX`. `moveTarget` suma `'accept_game'` a su unión. `houseId` = el de config (ARQ-8); `bet` = `game.bet` del objeto leído | `coinWithBalance`; `tx.sharedObjectRef` para `0x8` con versión fija; `houseId` del `Game` | Forma de `contracts/README.md` "PTB" y del smoke de #6; V-1. `bet` es inmutable en el `Game` (`contracts/README.md`, "Objetos"): el monto mostrado no puede quedar viejo |
| DL-2 | **Resultado de la transacción** = `parseResolvedGame(result, { originalPackageId, gameId, acceptor })` en `sui/gameTx.ts`: el **único** `GameResolved` del paquete original para esa partida, parseado con `parseGameResolved` (tipo exacto, BCS canónico, invariantes) y con `acceptor` = la cuenta que firmó. Cero o más de uno, ilegible, otra partida u otro aceptante ⇒ `null` (éxito honesto con `value: null`, como DL-9 de #11). Solo corre en `interpret`, que el hook llama **después** del `success` del nodo (`useExecuteTransaction.ts:165-188`) | Leer el resultado del objeto releído; calcular el pago con `resolutionAmounts` | El evento trae los montos **cobrados** de esa transacción (el detalle sigue usando la fórmula para quien no firmó). Reusa `rawEvents` y el parser de #10 |
| DL-3 | **Sin `precheck` en aceptar:** `bet` y `fee_rate` del `Game` no cambian, así que nada de lo mostrado puede quedar viejo (a diferencia de M-2 de crear). Estado, versión y House los valida la **preflight** (V-2): una partida ya aceptada/cancelada da `game`/4 mapeado sin abrir la wallet | Releer el `Game` antes de firmar; ocultar el botón por `game.version ≠ house.version` | La preflight ya hace esa relectura con el estado real del nodo; ocultar por versión duplica la regla del contrato (`game`/7 llega mapeado) |
| DL-4 | **Visibilidad y saldo, puros.** En `sui/gameActions.ts`, junto a `canCancel`/`canReject` (SUGGESTION-3): `acceptState(game, address)` ⇒ `'no_account'` \| `'not_pending'` \| `'creator'` \| `'not_invited'` \| `'available'`, evaluado en ese orden (con `sameAddress`; sin cuenta nunca da `not_invited`, D-20261103-02), y `NOT_INVITED_HINT` = `ABORT_MESSAGES.game[5]`. En `sui/acceptGame.ts`: `ACCEPT_GAS_RESERVE_MIST` = `gasData.budget` de la preflight de aceptar medido en S-4 × margen ≥ 2, redondeado hacia arriba a 0,005 SUI. Con el budget estimado de #6 (≈ 6,94 M MIST: cómputo + storage bruto) da **0,015 SUI** (provisional, ≈ 2,16×); TASK-1 lo fija y la constante cita la medición y el margen. El budget escala con el precio de gas: en testnet se revisa en #17. `acceptBalanceCheck(balance, bet)` ⇒ `'ok'` \| `'insufficient'` \| `'unknown'` (`balance === null` no bloquea y se avisa, como el formulario de crear). Botón visible solo en `'available'`; deshabilitado con aviso si `'insufficient'` | Reusar `CREATE_GAS_RESERVE_MIST` (su motivo es el gas de crear); justificar contra el costo neto (v1; MINOR-6: la wallet exige cubrir el budget, no el neto) | Criterio del issue; ARQ-2 y ARQ-4 (la visibilidad de las acciones en un solo módulo); LIM-6 |
| DL-5 | **SEG-10 en pantalla:** antes de firmar, junto al botón: "Apuestas `<bet>` SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la transacción (50 % cada uno) y pagas su gas." y "Si tu wallet muestra una vista previa con un ganador o un cambio de saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción." (V-7). Durante las etapas, solo los textos neutros de `TransactionStatus` (sin animación ni montos de pago). El resultado aparece **solo** con el `success` del nodo: "¡Ganaste! Recibiste `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)" o "Perdiste: ganó quien creó la partida y recibió `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)", más el digest (link en testnet) y el costo de red de `TransactionStatus`; con `value: null`, "Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador". `wonBy(event, address)` puro en `acceptGame.ts`. **Tokens de resultado** (para tests y smoke, distinguiendo mayúsculas): "Ganaste", "Perdiste", "Recibiste", "ganó quien", "Resultado para ti". No pueden aparecer en `.tx-status` ni en `.game-actions` mientras `outcome` sea `null`. **Permitido:** que `.game-detail` muestre "Resuelta" y el ganador durante "Confirmando…" si una lectura **del nodo** (refetch por foco o el intervalo de 15 s) ya ve el objeto resuelto: es el estado on-chain, no una simulación. "ganador" en minúscula aparece legítimamente en `Pending` (`GameDetail.tsx:77`) y en la nota de arriba | Animación de moneda; mostrar la estimación como "posible premio" durante la firma; prohibir cualquier "ganador" en toda la página (v1; MINOR-4) | SEG-10 y criterio del issue; V-2 (la app nunca recibe la simulación) |
| DL-6 | **Invalidación de aceptar** (`txInvalidation.ts`, `TxAction` suma `{ kind: 'accept'; gameId }`): `reset` `lobby` (la partida sale de la lista), `invalidate` `game(id)`, `balance(cuenta)` y **`house`** (cambió `fees_collected`; lo anuncia `txInvalidation.ts:14` y lo usa #14). Igual que en #11, también tras un abort en la preflight, un fallo del nodo y un "sin confirmar" | No invalidar la House (hoy nadie muestra `fees_collected`) | Una sola tabla (DL-6 de #11); el costo es una lectura si la House está montada |
| DL-7 | **MINOR-1 — candado global en el `QueryClient`:** cada ejecución es una mutación con `mutationKey = queryKeys.txTarget(red, cuenta, target)`, bajo el prefijo `queryKeys.txAccount(red, cuenta)` (`['sui', red, 'tx', <dirección normalizada>, …]`, `gameId` normalizado), con `target` = `{ kind: 'create' }` o `{ kind: 'game'; gameId }` (cancelar, rechazar y aceptar comparten la partida). Opciones de la mutación: `retry: false`, `gcTime: Infinity`, **`networkMode: 'always'`** (SUGGESTION-1: sin red no queda en pausa reteniendo el candado ni se reanuda sola abriendo la wallet; falla en la preflight con el texto de red). `execute` chequea `queryClient.isMutating({ mutationKey: txAccount }) > 0` y, si hay una, no hace nada; si no, llama a `mutateAsync` en el mismo tick (atómico por V-8). `busy` = `useIsMutating({ mutationKey: txAccount }) > 0`, reactivo en **toda** la app: con una transacción en curso de la cuenta, todos los botones de transacción (crear, cancelar, rechazar, aceptar) se deshabilitan, también tras salir y volver. Se retira el `useRef` | (a) candado por acción y objeto (permite dos transacciones a la vez de la misma cuenta); (b) `scope` de mutaciones de TanStack (las **encola**: un segundo clic enviaría una segunda transacción); (c) store propio con `useSyncExternalStore` | Lo pide el issue (`mutationKey` + `useIsMutating`). Por cuenta y no por acción: dos transacciones simultáneas de la misma cuenta pueden elegir la misma moneda de gas y una wallet no garantiza serializarlas; un jugador no necesita dos a la vez |
| DL-8 | **MINOR-1/MAJOR-1/MINOR-3 — una vista, una fuente por objetivo.** Cada vista que tiene acciones sobre un objetivo (`CreateGameForm` para `create`, `GameActions` para la partida) llama **una vez** a `useTxTarget(target)`, que crea un `viewId` (`useState(() => crypto.randomUUID())`, único por montaje) y devuelve: **`busy`** (DL-7); **`notice`**: `null` \| `{ kind: 'in_flight' }` (hay una mutación de la cuenta en curso **no** lanzada por esta vista, de este u otro objetivo ⇒ "Hay una transacción en curso desde esta cuenta; espera a que termine") \| `{ kind: 'adopted'; action; outcome }` (la mutación de **este** objetivo que esta vista vio en curso sin haberla lanzado terminó: se muestra su resultado con el texto de su acción; MINOR-3); **`unconfirmed`**: `null` \| `{ digest }`, la última mutación de este objetivo con `outcome` `unconfirmed` todavía en el caché, propia o ajena, que **bloquea los botones de ese objetivo**; y **`acknowledge()`**, que borra esa mutación del `MutationCache` ("Ya la revisé"). Una mutación es **propia** si `variables.viewId === viewId`. La **adopción** guarda el `mutationId` de cada mutación ajena del objetivo que la vista ve `pending`; una mutación que ya estaba terminada al montar no se adopta (así el formulario no vuelve a navegar), salvo el `unconfirmed`, que siempre bloquea. Si la adoptada termina `unconfirmed`, se muestra solo por `unconfirmed` (no duplica). Los hooks de acción muestran la etapa y el resultado de **sus** mutaciones como hoy (`TransactionStatus` de cada acción), salvo un `unconfirmed` ya reconocido: con su mutación fuera del caché, su `outcome` pasa a `null`. Resultado: una sola alerta "sin confirmar" y un solo "Ya la revisé" por objetivo y vista (`GameActions` gana ese botón; hoy solo lo tiene el formulario) | (a) `blocked` calculado en cada hook de acción (v1: hasta cuatro alertas para una transacción y auto-bloqueo de la instancia que lanzó; MAJOR-1); (b) etapa global en el caché de queries con `setQueryData` (mezcla datos de red con estado de UI); (c) `sessionStorage` (sobrevive a la recarga, pero con la burner la cuenta cambia al recargar y en una extensión el historial de la wallet ya lo muestra; fuera del alcance "durante la sesión"); (d) `submittedAt` del observer para reconocer la propia (no distingue dos vistas que montan a la vez y no está en `MutationState` filtrable por vista) | Cumple MINOR-1 (salir y volver no permite un segundo envío) con primitivas de TanStack; la vista tiene una única fuente de bloqueo; la etapa fina solo la ve quien lanzó, y quien vuelve ve un texto honesto de "en curso" y después el resultado (PROY-16) |
| DL-9 | **NIT-2:** en el `catch` de la firma, sin digest: `if (findMoveAbort(error)) await invalidateAction();` antes de devolver el `failure` (`useExecuteTransaction.ts:147-149`) | — | Mismo criterio que la preflight (`:135`): un abort dice que el estado on-chain no es el que se mostró |
| DL-10 | **Preflight con el envoltorio del SDK (V-3):** en `preflightTransaction`, un `SimulationError` **sin** `executionError` cuyo `cause` sea un error de red se relanza como `PreflightNetworkError` ("No se pudo verificar la transacción (red); intenta de nuevo"). En el hook, un `SimulationError` sin abort y sin `executionError` (p. ej. el rechazo de la regla de `Random` o un saldo insuficiente al elegir el gas) se muestra como "No se pudo preparar la transacción: …", no como error de la wallet. **Qué cuenta como "de red"** lo fijan S-2 y S-6 (MINOR-5): si los rechazos permanentes medidos llegan con un código que no está en `TRANSIENT_RPC_CODES` (`readPolicy.ts:18`), se usa `isTransientReadError(cause)`; si alguno cae en esa lista (`INTERNAL`, `UNKNOWN`…), la regla de este camino se acota a `UNAVAILABLE`/`DEADLINE_EXCEEDED` y el corte propio. Tests con el envoltorio real y los códigos medidos. Se declara en el body del PR como corrección de la máquina de #11 | Dejarlo para un issue aparte (duplicaría el PR sobre las mismas líneas); clasificar sin medir (v1) | Aceptar pasa por esta preflight; el texto actual culpa a la wallet de un corte de red antes de abrirla (M-3 (a) de #11) |
| DL-11 | **Cancelaciones del runtime = "reintentar"** (`contracts/README.md`, "Cancelaciones del runtime"; V-6): `errors.ts` reconoce `CongestedObjects` (por `$kind`) y `Unknown` cuyo `message` contenga `ExecutionCancelledDueToRandomnessUnavailable` o "randomness could not be generated" (sin distinguir mayúsculas). Devuelve un texto **neutro respecto de la acción** (MINOR-7): "La red canceló la transacción sin ejecutarla (`<la aleatoriedad de la red todavía no está disponible` \| `hay congestión en un objeto compartido>`): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos". Aplica a toda acción; nunca es éxito ni error del contrato | Seguir con el genérico "La red no ejecutó la transacción: …"; un botón "Reintentar" propio; un texto que mencione "la partida y tu apuesta" (v1: no vale para crear) | El botón de la acción sigue disponible, así que "intenta de nuevo" es el mismo botón |
| DL-12 | **Detalle con el resultado para cada jugador:** `GameDetail` recibe la cuenta y, en `Resolved`, muestra "Resultado para ti: ganaste" o "perdiste" si la cuenta es el creador o el aceptante (`playerResult(game, address)` puro en `acceptGame.ts`); el resto queda igual (montos con `resolutionAmounts`, "según la fórmula del contrato") | Leer el `GameResolved` de la transacción en el detalle (necesita la transacción que resolvió, que `previousTransaction` no garantiza: P6 de #10) | "Ambas cuentas ven el mismo resultado" (smoke del issue): el creador no firmó la aceptación y lo ve por el objeto |
| DL-13 | **Hooks de acción atados a la vista (SUGGESTION-4):** `useCreateGame(view)`, `useCancelGame(view)`, `useRejectGame(view)` y `useAcceptGame(view, game)` reciben el `TxView` que devuelve `useTxTarget` (`{ target, viewId, network, account }`); el `gameId` sale de `view.target` (en aceptar, `game` aporta solo `bet`). `useExecuteTransaction<T>(view)` sella en las `variables` de la mutación `viewId` y un `runId` y **`execute(input)` no recibe objetivo**, así que no hay un desajuste que reportar y nada lanza hacia el componente (`useExecuteTransaction.ts:69`). Devuelve `{ stage, outcome, execute, reset }`; `busy`, `notice`, `unconfirmed` y `acknowledge` son solo de `useTxTarget` | Firma `cancel(gameId)` con el objetivo calculado en `execute` (el bloqueo hace falta antes de ejecutar); un `throw` si el objetivo no coincide (v1) | DL-8 necesita el objetivo al renderizar; un patrón para las cuatro acciones (ARQ-4) |

## Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta (nuevo o cambiado) |
|---|---|
| `sui/transactions/game.ts` | `buildAcceptGameTx({ packageId, houseId, gameId, bet: bigint }): Transaction` |
| `sui/gameTx.ts` | `parseResolvedGame(result, { originalPackageId, gameId, acceptor }): GameResolvedEvent \| null` |
| `sui/gameActions.ts` | `type AcceptState`; `acceptState(game, address \| null)`; `NOT_INVITED_HINT` |
| `sui/acceptGame.ts` (nuevo) | `ACCEPT_GAS_RESERVE_MIST`; `acceptBalanceCheck(balance: bigint \| null, bet: bigint): 'ok' \| 'insufficient' \| 'unknown'`; `wonBy(event, address): boolean`; `playerResult(game, address \| null): 'won' \| 'lost' \| null` |
| `sui/errors.ts` | `runtimeCancellation(source): 'randomness' \| 'congestion' \| null` y su texto en `transactionErrorMessage` (DL-11) |
| `sui/execution.ts` | `preflightTransaction` con la regla de DL-10 (misma firma) |
| `hooks/queryKeys.ts` | `txAccount(network, address)`, `txTarget(network, address, target)` (claves de **mutación**, `gameId` normalizado; ninguna invalidación de queries las toca) |
| `hooks/txInvalidation.ts` | `TxAction` + `{ kind: 'accept'; gameId }`; `type TxTarget = { kind: 'create' } \| { kind: 'game'; gameId }`; fila de aceptar |
| `hooks/useTxTarget.ts` (nuevo) | `useTxTarget(target)` → `{ view: TxView; busy; notice; unconfirmed; acknowledge }` |
| `hooks/useExecuteTransaction.ts` | `useExecuteTransaction<T>(view)` → `{ stage, outcome, execute, reset }` |
| `hooks/useAcceptGame.ts` (nuevo) | `useAcceptGame(view, game)` → máquina + `accept()`, valor `GameResolvedEvent \| null` |
| `hooks/useCancelGame.ts`, `useRejectGame.ts`, `useCreateGame.ts` | reciben `view` (DL-13); el resto igual |

## Tasks (ordenados por dependencia; sin tasks de contratos)

Orden: fixtures y sondas (TASK-1) → `sui/` (TASK-2) → máquina global sobre las acciones existentes (TASK-3: `hooks/` y
la adaptación mínima de sus componentes) → aceptar (TASK-4: hook y UI) → docs (TASK-5). TASK-3 toca componentes porque
cambia la API de los hooks de #11; así el cambio de mecanismo se revisa aislado, con la regresión de #11, antes de sumar
aceptar (SUGGESTION-5). Gate completo de la app en cada task (`agents.md` §3, prefijo de Node 26); en TASK-1, además, el
job `contracts` completo sin delta. Sin dependencias nuevas (`package*.json` sin delta en todo el ciclo).

### TASK-1: fixtures reales de aceptar y sondas — área: contracts (fixtures, docs) + app (scripts)
- **Entregable:** `app/scripts/capture-tx-fixtures.mjs` con las secciones de aceptar y el rol `C`;
  `contracts/fixtures/game-tx.localnet.json` **recapturada entera** (nueva génesis: cambian IDs y digests de todas las
  secciones; se declara); `contracts/README.md` ("Lectura desde la app": secciones nuevas, `G_CANCEL` abierta y las
  transacciones previas de la recaptura). Resultados de las sondas en el reporte.
- **Localnet aislada** (`agents.md` §3, publicación **variante B**, reglas B4, una sola localnet). Cuentas `ADMIN`, `A`,
  `B`, `C` de la génesis. Por CLI, además de las de #11 (`update_fee_rate` 250; `G_OPEN`, `G_INV`, `G_CANCEL` **abierta**,
  `G_REJ` y el `cancel_game` fallido de `B` sobre `G_OPEN`): `A` crea `G_ACC1..n` abiertas y `B` las acepta hasta tener
  **los dos resultados** (ganador `A` y ganador `B`; tope 8 partidas, se anota cuántas hicieron falta); `A` invita a `B`
  en `G_ACCINV` y `B` la acepta; `C` intenta aceptar `G_ACC1` ya resuelta **con `--gas-budget`** ⇒ fallo ejecutado
  `game`/4. Nada toca `G_OPEN` después de su fallo (la selección de #11 depende de eso).
- **Selección (MINOR-8):** el selector de `G_CANCEL` exige además `opponent === null` y el script aborta con un mensaje
  claro si la primera cancelada por su creador es una invitación; con `C` sobre una invitación ajena el contrato daría
  `game`/5 antes que `game`/4 (authZ antes que estado, D-20261030-16 D5). Los roles pasan a ser cuatro cuentas distintas
  (`A`, `B`, `C`, `ADMIN`; `C` = el aceptante fallido de `G_ACC1`).
- **Fixture (secciones nuevas, mismo `_meta` con el método de cada una):**
  - `simulationErrors` suma `acceptSelfPlay` (`A` sobre `G_OPEN`, `game`/9), `acceptNotInvited` (`C` sobre `G_INV`,
    `game`/5), `acceptNotPending` (`C` sobre `G_CANCEL`, `game`/4) y `acceptWrongStake` (`B` sobre `G_OPEN` con `bet + 1`,
    PTB armado por el script, `game`/10), todos con `build({ client })` y `setSender` (sin firmar);
  - `executed` suma `acceptCreatorWins`, `acceptAcceptorWins`, `acceptInvite` y `acceptNotPendingExecuted`
    (`getTransaction` con efectos, eventos y `objectTypes`, como los de #11);
  - `ids.games` suma los IDs que usan los tests.
- **Sondas** (código descartable en `<scratchpad>`, resultados en el reporte):

| Sonda | Qué medir | Para qué |
|---|---|---|
| S-1 | `build({ client })` del PTB de aceptar con `setSender(B)` sobre una partida abierta: termina sin error y en cuánto; el input `0x8` resuelto (`SharedObject` con `initialSharedVersion` y `mutable: false`); con los 4 aborts, `SimulationError` con `executionError` `MoveAbort` | V-2/V-4, DL-3 |
| S-2 | El mismo PTB con un `splitCoins` **después** del `accept_game`: clase, `message`, `executionError`, clase del `cause` y **`cause.code`** del error que lanza `build` | DL-10 (texto de "No se pudo preparar" y qué códigos son permanentes) |
| S-3 | Camino de la wallet (firma de la CLI bajo `PRE`, `--serialize-signed-transaction`, y ejecución de esos bytes por gRPC desde Node, como S-1 bis de #11): ms hasta que `waitForTransaction` vuelve, si trae `checkpoint` y los eventos, y si `getObject` del `Game` ya ve `Resolved` en ese momento | Cortes de DL-11 de #11 con `Random` (la transacción espera la ronda de aleatoriedad) |
| S-4 | `gasData.budget` de los bytes que devuelve la preflight de aceptar (`Transaction.from(bytes).getData()`), y `gasUsed` y `balanceChanges` de las aceptaciones con cada ganador | `ACCEPT_GAS_RESERVE_MIST` = budget × margen ≥ 2 (DL-4) e invariante de fondos |
| S-5 | Al arrancar la red, si una aceptación inmediata sale `ExecutionCancelledDueToRandomnessUnavailable`: si ocurre, se guarda su `description` en la fixture (`runtimeCancelled`) y su forma reemplaza la suposición de V-6; si no ocurre (lo esperable, smoke de #6), se anota | DL-11, R-3 |
| S-6 | Simulación de aceptar `G_OPEN` con `setSender` = una dirección sin claves que solo recibió por CLI menos de `bet` + gas (p. ej. 0,005 SUI desde `A`; una dirección cualquiera, nunca `new-address`): clase, `message`, `executionError` y `cause.code` del error | DL-10 (MINOR-5): un rechazo permanente que no debe mostrarse como "red" |

- **Archivos:** los del entregable. **No tocar:** `app/src/`, `contracts/sources/`, `contracts/tests/`,
  `contracts/scripts/`, `contracts/Move.lock`, `contracts/fixtures/game-reads.localnet.json`, `package*.json`, `.github/`.
- **AuthZ:** no aplica (cuentas efímeras de la génesis; ninguna clave sale de `<SMOKE_DIR>`).
- **Criterio de aceptación:** las secciones nuevas existen, sin claves ni `sender`; dos corridas sobre la misma red dan el
  mismo archivo salvo `_meta.capturedAt`; el script con `--url https://fullnode.testnet.sui.io:443` sale con código ≠ 0 sin
  pedidos; el script aborta si `G_CANCEL` no es abierta; **los tests de #11 siguen en verde con la fixture recapturada
  sin cambiar sus aserciones** (si alguno depende de un valor concreto de la captura vieja, se declara y se ajusta a
  leerlo de la fixture); S-1..S-6 respondidas; cierre limpio del paso 7.
- **Tests:** ninguno nuevo; gates sin delta.
- **Riesgos / rollback:** si S-1 muestra que el nodo no simula con `Random`, se para: la preflight de aceptar no sirve y
  el MID replantea DL-3 antes de TASK-2. Si S-3 muestra que `waitForTransaction` tarda más de ≈ 10 s, se revisa el corte de
  30 s. Si S-2/S-6 dan códigos transitorios para rechazos permanentes, el MID fija la regla acotada de DL-10 en el handoff.

### TASK-2: capa pura de aceptar y ajustes de la maquinaria — área: app (`sui/`)
- **Entregable:** `buildAcceptGameTx` (DL-1), `parseResolvedGame` (DL-2), `acceptState` y `NOT_INVITED_HINT` en
  `gameActions.ts` (DL-4), `sui/acceptGame.ts` (DL-4, DL-5, DL-12), `runtimeCancellation` y su texto en `errors.ts`
  (DL-11), regla de DL-10 en `execution.ts`, con tests.
- **AuthZ:** `acceptState` es cortesía de la UI; el contrato valida (`game`/9, `game`/5, `game`/4).
- **Criterio de aceptación:** ningún `any`; sin red; sin React; `errors.ts` sin textos fuera de la tabla salvo los
  fallbacks y el de DL-11.
- **Tests (Vitest, fixtures por `import.meta.glob` eager):**
  - builder: target `<packageId>::game::accept_game`; `SplitCoins(GasCoin, [Pure u64 = bet])` y `MoveCall` con
    `[Input Game, Input House, NestedResult [0,0], Input Random]`; el `MoveCall` es el **último** comando; el input de
    `Random` es `UnresolvedObject` con `objectId` = `SUI_RANDOM_OBJECT_ID` normalizado y `mutable: false`; `Game` y House
    como `UnresolvedObject` con sus IDs; lanza con IDs inválidos, `bet` 0 y `bet` > `U64_MAX`;
  - `parseResolvedGame`: las tres aceptaciones reales (cada ganador e invitación) ⇒ montos y ganador del evento; sin
    eventos, dos `GameResolved`, otra partida, otro aceptante, tipo de otro paquete y BCS truncado ⇒ `null`;
  - `acceptState`: sin cuenta (también sobre una invitación ⇒ `no_account`, nunca `not_invited`); creador (también en
    otro formato de dirección); abierta y otra cuenta ⇒ `available`; invitación al invitado ⇒ `available`; invitación y
    tercero ⇒ `not_invited`; `cancelled`/`resolved` ⇒ `not_pending`; `acceptBalanceCheck` con `bet + reserva` justo, uno
    menos y `null`; `wonBy` y `playerResult` (creador ganó, aceptante ganó, tercero ⇒ `null`, `pending` ⇒ `null`);
  - `errors.ts`: los 4 `SimulationError` reales de aceptar ⇒ su mensaje y sufijo (incluido `acceptNotInvited` ⇒
    `game`/5, D-20261103-02); el fallo ejecutado `acceptNotPendingExecuted` por gRPC y por `extractStatusFromEffectsBcs`;
    `CongestedObjects` y `Unknown` con cada forma de texto de V-6 (y con la `description` real si S-5 la capturó) ⇒ texto
    de DL-11, igual para crear que para aceptar; un `Unknown` cualquiera sigue con "La red no ejecutó…";
  - `execution.ts`: `build` rechazado con `new SimulationError(msg, { cause: new RpcError(…, 'UNAVAILABLE') })` ⇒
    `PreflightNetworkError`; con los `cause.code` medidos en S-2 y S-6 ⇒ el `SimulationError` tal cual; sin `cause` ⇒ tal
    cual.
- **Riesgos:** el texto real de la falta de aleatoriedad (R-3).

### TASK-3: máquina global sobre crear, cancelar y rechazar — área: app (`hooks/` + adaptación de `components/`)
- **Entregable:** `queryKeys.ts` (`txAccount`, `txTarget`), `txInvalidation.ts` (`TxTarget`), `useTxTarget.ts` (DL-8),
  `useExecuteTransaction.ts` (DL-7, DL-8, DL-9, DL-10 del lado del hook, DL-13), `useCreateGame`/`useCancelGame`/
  `useRejectGame` con `view`; `CreateGameForm.tsx` (deja `pendingReview` y usa `useTxTarget`: `busy`, `notice`,
  `unconfirmed`, "Ya la revisé: crear otra partida" con `acknowledge`) y `GameActions.tsx` (una sola llamada a
  `useTxTarget` para la partida, el texto de `notice`, un solo alerta "sin confirmar" con "Ya la revisé").
- **Cambios:** `useMutation` con `mutationKey`, `gcTime: Infinity`, `retry: false` y `networkMode: 'always'`;
  `useIsMutating`/`useMutationState` de `@tanstack/react-query` con selección de campos planos (`mutationId`,
  `status`, `variables.viewId`, `variables.action`, `data`); sin `useEffect` para datos; sin `useRef` de candado.
- **AuthZ:** el hook no decide permisos.
- **Criterio de aceptación:** una sola máquina; ningún éxito sin la lectura del nodo; el bloqueo sobrevive a desmontar y
  volver a montar con el **mismo** `QueryClient`; los tests de #11 de crear, cancelar y rechazar siguen en verde (con la
  firma nueva de los hooks).
- **Tests (patrón de `useExecuteTransaction.test.tsx`, kit y `sui/execution` mockeados, `QueryClient` real por test):**
  - **candado:** dos `execute` en el mismo tick ⇒ una preflight y una firma; una vista nueva del **mismo objetivo**,
    montada con la mutación de otra vista en curso ⇒ `busy` y `notice: in_flight`, y su `execute` no llama a nada; una
    vista de **otro objetivo** de la misma cuenta ⇒ igual; otra **cuenta** ⇒ libre; al terminar se libera;
  - **MAJOR-1:** en una vista, `useTxTarget` y los tres hooks de acción de la partida (`useCancelGame`, `useRejectGame` y,
    desde TASK-4, `useAcceptGame`) sobre el mismo objetivo: mientras una acción propia está en curso, `notice` es `null`
    (sin auto-bloqueo) y `busy` es `true`; un `unconfirmed` propio aparece **una sola vez** en `useTxTarget.unconfirmed` y
    en el `outcome` de la acción que lo lanzó, no en los otros dos; tras `acknowledge()`, los dos quedan en `null`;
  - **MINOR-3 (adopción):** la vista nueva montada con una mutación ajena del objetivo en curso que después termina en
    `failure` (`game`/4) ⇒ `notice: adopted` con ese `outcome` y la acción; una mutación ya `success` al montar ⇒ no se
    adopta (el formulario no navega); una ajena `unconfirmed` ⇒ `unconfirmed` y `notice` `null`;
  - **`networkMode`:** con `onlineManager.setOnline(false)`, `execute` ⇒ `failure` con el texto de red y el candado se
    libera (la mutación no queda en pausa);
  - **NIT-2:** la wallet lanza sin digest un error con texto `MoveAbort` del SDK ⇒ `failure` mapeado **y** las
    invalidaciones de la acción; sin abort ⇒ sin invalidación (como hoy);
  - **DL-10:** preflight que rechaza con `PreflightNetworkError` y con un `SimulationError` sin `executionError` ⇒ textos
    de red y de preparación, la wallet no se llama;
  - **componentes:** `CreateGameForm` bloqueado por un `unconfirmed` de crear (también tras remontar con el mismo
    `QueryClient`) y por una transacción en curso de otra acción, con el texto de `notice`; `GameActions` con la máquina
    real (kit y `sui/execution` mockeados) y un "sin confirmar" de cancelar ⇒ **una** alerta y **un** "Ya la revisé".
- **Riesgos:** `useMutationState` notifica con cada cambio del `MutationCache`; la selección de campos planos con
  `replaceEqualDeep` evita re-renders de más (R-6).

### TASK-4: aceptar, resultado y detalle — área: app (`hooks/`, `components/`, `pages/`)
- **Entregable:** `txInvalidation.ts` (fila de aceptar, DL-6), `useAcceptGame.ts`; `components/GameActions.tsx` con
  "Aceptar" (DL-4, DL-5), el saldo (`useSuiBalance` solo si `acceptState` es `available`), el aviso de saldo
  insuficiente o desconocido, `NOT_INVITED_HINT` (D-20261103-02), su `TransactionStatus` con el texto de resultado, y el
  resultado de una aceptación adoptada (DL-8); `components/GameDetail.tsx` con "Resultado para ti" (DL-12);
  `pages/GameDetailPage.tsx` le pasa la cuenta. El texto sin cuenta pasa a "Conecta tu wallet para aceptar la partida,
  cancelarla si es tuya o rechazarla si te invitaron".
- **Cambios:** ARQ-1/ARQ-2 (de `@mysten/*` solo `@mysten/dapp-kit-react/ui`; decisiones en `sui/gameActions.ts` y
  `sui/acceptGame.ts`); SEG-9 (texto plano); montos con `format.ts`.
- **Criterio de aceptación:** cada estado del botón y del resultado tiene test; ningún componente arma transacciones,
  IDs ni mensajes de error; ningún token de resultado de DL-5 en `.tx-status` ni `.game-actions` con `outcome` `null`.
- **Tests:**
  - `useAcceptGame`: arma el builder con `game.bet`, `houseId` de config y el ID de la vista; valor = el evento de la
    fixture real; `null` si el resultado no trae el evento; invalidaciones de aceptar exactas (`lobby` reset; `game`,
    `balance`, `house` invalidate) y ninguna inmutable; caso MAJOR-1 de TASK-3 con `useAcceptGame` sumado;
  - `GameActions` (hooks mockeados, patrón de `GameActions.test.tsx`): sin cuenta (texto nuevo, sin botones ni
    `NOT_INVITED_HINT`); creador (sin "Aceptar"); abierta y otra cuenta ⇒ "Aceptar" con apuesta, nota del sorteo y nota
    de la vista previa; invitado ⇒ "Aceptar" y "Rechazar"; tercero en invitación ⇒ `NOT_INVITED_HINT` sin botón;
    `cancelled`/`resolved` ⇒ sin botón; saldo insuficiente ⇒ deshabilitado con el aviso; saldo desconocido ⇒ habilitado
    con aviso; en cada etapa, ningún token de resultado en `.tx-status` ni `.game-actions` (SEG-10); éxito ganado,
    perdido y `value: null`; `failure` con el texto de `game`/4 y de DL-11; `notice: in_flight` ⇒ todos los botones
    deshabilitados con su texto; `notice: adopted` de una aceptación ⇒ su resultado; `unconfirmed` ⇒ una alerta, botones
    del objetivo deshabilitados y "Ya la revisé" llama a `acknowledge`;
  - `GameActions` con la máquina real: un "sin confirmar" de aceptar ⇒ **una** alerta (MAJOR-1 (4));
  - `GameDetail` con "Resultado para ti" para el creador y el aceptante y sin él para un tercero.
- **Riesgos:** el aspecto se revisa en el smoke.

### TASK-5: docs del ciclo — área: docs
- **Entregable:** `app/README.md` (mapa de `sui/` con `acceptGame.ts`, `acceptState` y lo nuevo de
  `transactions/game.ts`, `gameTx.ts`, `errors.ts`, `execution.ts`; hooks `useTxTarget` y `useAcceptGame`;
  "Transacciones (#11)" → "Transacciones (#11, #12)": candado global por cuenta, `networkMode: 'always'`, "sin confirmar"
  por objetivo durante la carga de la página, adopción, NIT-2, DL-10, cancelaciones del runtime, fila de aceptar en la
  tabla de invalidación; sección "Aceptar y resultado" con los textos y la nota de la vista previa de la wallet;
  **límite conocido R-5**: el candado es por pestaña), `contracts/README.md` ("Cancelaciones del runtime" implementado;
  fixture con aceptar, `G_CANCEL` abierta y cómo se recaptura), `agents.md` §2 (descripción de `game-tx.localnet.json`) y
  `documents/STATUS.md` (baseline de la app, fila de #12).
- **Criterio de aceptación:** sin rutas personales; números iguales a los reportes; ningún "#12 lo hace" vigente
  (`grep -n "#12" app/README.md contracts/README.md agents.md app/src` revisado a mano: incluye el comentario de
  `txInvalidation.ts:14`).

## Tests (resumen)

Vitest + jsdom, sin red real (LIM-11): fixture real para builder, parseo y errores (TASK-2), `QueryClient` real con kit
y ejecución mockeados para la máquina global y para un test de `GameActions` por cada lado (TASK-3, TASK-4), hooks
mockeados para el resto de los componentes. Delta esperado: ≈ 4-5 archivos de test nuevos (`acceptGame`, `useTxTarget`,
`useAcceptGame` y los que el handoff decida separar) y casos nuevos en ≈ 10 existentes; el conteo exacto lo fija cada
reporte.

## Smoke (después de TASK-5; el MID genera `documents/SMOKE_ACCEPT.md`, AGENTE_MID §M5)

**Modalidad.** Chrome headless + CDP con perfil desechable en `<SMOKE_DIR>`, cliente CDP propio en Node 26 sin
dependencias, como en #11 (`git show ac5a85c^2:documents/SMOKE_CREATE_CANCEL.md`, "Modalidad" y "Precondiciones"). **Tres
pestañas**, cada una con `Target.createTarget({ url, newWindow: true })`, todas visibles y **sin** `Page.bringToFront`
(`agents.md` §3 paso 6). Burners (firman sin ventana, V-3 de #11): `X` creador en `T1`, `Y` aceptante e invitado en
`T2`, `Z` tercera cuenta en `T3`; se fondean por CLI desde `A` bajo `PRE` y después solo se navega por hash. Formularios
con foco + `Input.insertText`; clicks con `element.click()` en `Runtime.evaluate`. Pedidos contados por método gRPC-web en
`Network.*` (por acción con burner: 2 `SimulateTransaction` + 1 `ExecuteTransaction`). Latencias con el `MutationObserver`
de #11 (`window.__txLog`), que además registra el texto de `.tx-status` y `.game-actions` (para los tokens de DL-5) y,
aparte, el de `.game-detail` (solo informativo: una lectura del nodo ahí está permitida).

- **Red:** localnet aislada (`agents.md` §3), publicación **variante B**, reglas **B4**, una sola localnet; `env.sh`,
  `app.env` y `chrome.env` como en #11, nunca dos en la misma llamada. Nada contra testnet.
- **Pasos previstos** (la tabla definitiva y los resultados van en el SMOKE, llenados durante la corrida):
  0. Preparación, línea base de `~/.sui/sui_config/` (`stat`/`ls`), puertos libres, sin `localnet.json`, árbol limpio.
  1. Génesis, arranque, cuentas `ADMIN`, `A`, `B`; publicación variante B; `update_fee_rate` 250.
  2. `vite` dev y Chrome; `T1`, `T2`, `T3` en `#/` con `newWindow: true`.
  3. 🌐 Conectar `X` en `T1` e `Y` en `T2`; DEV los fondea con 2 SUI cada uno. Direcciones del `title` de
     `.account-badge` a `ids.env`.
  4. 🌐 `T1` crea `G1` abierta de 0,01 SUI. `T3`, **todavía sin conectar**, en `#/game/<G1>` ⇒ "Conecta tu wallet para
     aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron", sin botones ni el aviso de invitación ajena.
     Salvedad (paso 13 de #11): el kit puede intentar reconectar la sesión guardada por otra pestaña del mismo origen; si
     `T3` queda conectada sola a una burner nueva, se anota y se desconecta antes de comprobar. Después se conecta `Z` en
     `T3` y DEV la fondea con **0,005 SUI**.
  5. 🌐 `#/game/<G1>` en las tres: `T1` (creador) sin "Aceptar"; `T2` con "Aceptar", "Apuestas 0.01 SUI, igual que el
     creador…" y la nota de la vista previa; `T3` (0,005 SUI) con "Aceptar" **deshabilitado** y "Saldo insuficiente…";
     cero `SimulateTransaction` en el paso.
  6. 🌐 `T2` acepta `G1` con latencias. Etapas en orden; mientras `.tx-status` muestre "Verificando la transacción…",
     "Esperando la firma en la wallet…" o "Confirmando en la red…", **ninguno** de los tokens de DL-5 ("Ganaste",
     "Perdiste", "Recibiste", "ganó quien", "Resultado para ti", con mayúsculas) en `.tx-status` ni `.game-actions` de `T2`
     (SEG-10); si `.game-detail` ya muestra "Resuelta" por una lectura del nodo, se anota (permitido). Después, el texto de
     resultado con payout 0.0195, pozo 0.02 y comisión 0.0005, digest y costo. DEV: `suic tx-block` ⇒ `GameResolved`
     (`pot` 20000000, `fee` 500000, `payout` 19500000, `winner`); `suic balance` de `X` e `Y` antes y después = invariante
     de "Flujo de fondos"; `suic object $HOUSE` ⇒ `fees_collected` + 500000. **Plan B (R-2):** si la aceptación sale
     `ExecutionCancelledDueToRandomnessUnavailable` (red recién arrancada), se anota el texto de DL-11 que muestra la app
     (prueba real de DL-11), se comprueba que `G1` sigue pendiente y se reintenta con el mismo botón.
  7. 🌐 `T1` (`#/nada` → `#/game/<G1>`): "Resuelta", el mismo ganador y montos, y "Resultado para ti" coherente con `T2`;
     `T2` también lo muestra; `#/` en `T2` ⇒ `G1` fuera del lobby sin "Actualizar".
  8. 🌐 Invitación: `T1` crea `G2` de 0,02 SUI invitando a `Y`. `T3` abre `#/game/<G2>` por URL ⇒ sin "Aceptar" y con
     "Esta invitación es para otra dirección." (D-20261103-02); `T2` ve "Aceptar" y "Rechazar".
  9. DEV: `game`/5 por CLI (D-20261103-02): `PRE act_as "$B" && suic ptb --split-coins gas "[20000000]" --assign c
     --move-call "$PKG::game::accept_game" @$G2 @$HOUSE c.0 @0x8 --gas-budget 100000000 --json` ⇒ fallo ejecutado
     `MoveAbort` `game`/5; 🌐 `G2` sigue pendiente.
  10. 🌐 **Doble clic (MINOR-2 (b)):** `T2` en `#/game/<G2>`; en **un solo** `Runtime.evaluate`, `b.click(); b.click();`
      sobre "Aceptar" ⇒ **2** `SimulateTransaction` y **1** `ExecuteTransaction`; un solo resultado. DEV:
      `GameResolved` con `acceptor` = `Y` y montos de 0,02; saldos.
  11. 🌐 **Tercera cuenta con error mapeado por carrera (D-20261103-02):** DEV fondea `Z` con 1 SUI; `T1` crea `G3`
      abierta de 0,01; `T2` y `T3` en `#/game/<G3>` con "Aceptar" habilitado. `T2` acepta ⇒ éxito; **inmediatamente**, en
      `T3` y solo por `Runtime.evaluate`, click en "Aceptar" ⇒ "Verificando la transacción…" ⇒ "La partida ya no está
      pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)", **cero** `ExecuteTransaction` en `T3`, saldo
      de `Z` sin cambios. Si el detalle de `T3` ya se refrescó, se repite con otra partida y se anota.
  12. Si los pasos 6, 10 y 11 no dieron los dos ganadores, hasta 3 aceptaciones más de partidas abiertas (se anota).
  13. 🌐 **MINOR-1, crear, mismo objetivo (MINOR-2 (a), MINOR-3):** antes, `T2` crea `G4` abierta de 0,01 (de `Y`). En
      `T1`, `Fetch` que falla `*LedgerService/GetTransaction*` (como el paso 18 de #11); crear abierta de 0,01 ⇒
      "Confirmando en la red…". Durante la espera: (i) `#/nada` → `#/` ⇒ "Crear partida" **deshabilitado** con "Hay una
      transacción en curso desde esta cuenta; espera a que termine"; `form.requestSubmit()` por `Runtime.evaluate` ⇒
      sigue **1** `ExecuteTransaction`; (ii) `#/game/<G4>` ⇒ "Aceptar" deshabilitado con el mismo texto; (iii) vuelta a
      `#/`. A los ≈ 30 s, en la misma vista (adoptada): alerta "sin confirmar" con el digest y "Crear partida" deshabilitado;
      `#/nada` → `#/` ⇒ sigue bloqueado, **una** alerta; `Fetch.disable`; "Ya la revisé: crear otra partida" ⇒
      desbloquea. DEV: `tx-block` del digest ⇒ `success` (la transacción sí se ejecutó).
  14. 🌐 **MINOR-1, aceptar:** `T1` crea `G5` abierta de 0,01; en `T2`, el mismo `Fetch`; `T2` acepta `G5` ⇒ durante
      "Confirmando…", `#/` ⇒ formulario de crear deshabilitado por la transacción en curso, y vuelta a `#/game/<G5>` ⇒
      "Hay una transacción en curso…" y ningún token de resultado en `.tx-status`/`.game-actions`; a los ≈ 30 s, **una**
      alerta "sin confirmar" con el digest (la partida ya se ve `Resuelta` porque la transacción sí se ejecutó: lectura del
      nodo); `Fetch.disable`; "Ya la revisé" la quita. **1** `ExecuteTransaction`.
  15. Cierre del paso 7 de `agents.md` §3 más la app (`kill` por PID de `vite` y Chrome, perfil borrado,
      `localnet.json` borrado, `~/.sui/` idéntico a la línea base, `Move.lock` sin delta, árbol solo con
      `documents/SMOKE_ACCEPT.md`).
- **Qué no cubre el smoke y dónde está cubierto:** el bloqueo "sin confirmar" de una partida que sigue pendiente (la
  transacción de la burner siempre se ejecuta antes de que falle la confirmación): tests de TASK-3; la adopción de un
  resultado `failure` (no se puede provocar una carrera durante el `Fetch` sin otra cuenta coordinada): tests de TASK-3;
  NIT-2 (la burner simula antes de ejecutar y la preflight la precede): tests de TASK-3; `networkMode: 'always'` sin red:
  tests de TASK-3; cancelaciones del runtime si el plan B del paso 6 no ocurre: tests de TASK-2 (y S-5); fallo ejecutado
  de aceptar en la UI: fixture real `acceptNotPendingExecuted` + tests; `game`/5 en la UI: no existe por diseño
  (D-20261103-02), cubierto por CLI (paso 9) y por el test de la fixture `acceptNotInvited`; wallets de extensión, su
  vista previa con `Random`, pestañas con la misma cuenta (R-5) y la latencia de testnet: #17 (owner).

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | La vista previa de una wallet de extensión muestra un ganador simulado (V-7) | Nota junto al botón (DL-5); la app nunca usa la simulación; verificación del owner en #17 |
| R-2 | `ExecutionCancelledDueToRandomnessUnavailable` al empezar una época o con la red recién arrancada | Texto "intenta de nuevo" (DL-11); nada cambia salvo el costo de red; plan B del paso 6 del smoke |
| R-3 | La `description` real de la falta de aleatoriedad no coincide con ninguna de las dos formas de V-6 | Cae en "La red no ejecutó la transacción: …" (honesto, sin éxito); S-5 la captura si aparece |
| R-4 | Carrera entre la preflight y la ejecución (otra cuenta acepta o el creador cancela) | El fallo llega por los efectos y se mapea (`game`/4, fixture real); solo cuesta gas |
| R-5 | Dos pestañas con la misma cuenta de una extensión: el candado es por `QueryClient` (por pestaña) | Límite conocido documentado en `app/README.md` (SUGGESTION-2 no adoptada, ver changelog); la wallet muestra cada aprobación; el contrato rechaza la segunda aceptación, cancelación o rechazo (`game`/4); crear dos veces es el único caso con costo (se recupera cancelando, salvo el depósito de storage) |
| R-6 | `useMutationState` re-renderiza con cada cambio del `MutationCache` | Selección de campos planos con `replaceEqualDeep` (V-8); una vista por objetivo |
| R-7 | `gcTime: Infinity` acumula una entrada por transacción de la sesión | Una por acción del usuario; `acknowledge()` borra las "sin confirmar"; despreciable en el MVP |
| R-8 | La recaptura de `game-tx.localnet.json` cambia todos los IDs y digests de #11 | Los tests leen la fixture; el criterio de TASK-1 exige #11 en verde sin cambiar aserciones; el cambio se declara en el PR |
| R-9 | El candado por cuenta impide crear mientras se cancela otra partida | Una transacción dura ≈ 1-2 s en localnet (smoke de #11); el texto explica la espera |
| R-10 | La fixture tiene IDs y direcciones hex de 64: el grep de secretos las marca | Cuentas efímeras de la génesis, sin claves (igual que #10/#11); se declaran en el reporte |
| R-11 | Con el precio de gas de testnet, el budget de aceptar supera la reserva | La reserva es cortesía (la wallet y el nodo deciden); margen ≥ 2× sobre lo medido; se revisa en #17 |

## Archivos que NO se tocan

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `contracts/fixtures/game-reads.localnet.json`,
`.github/workflows/ci.yml`, `package.json`, `app/package.json`, `package-lock.json`, `.npmrc`, `app/eslint.config.js`,
`app/src/sui/config.ts`, `app/src/sui/dappKit.ts`, `app/src/sui/networks.ts`, `app/src/sui/lobby.ts`,
`app/src/providers/AppProviders.tsx` (el `QueryClient` ya es uno por montaje; las opciones van en cada `useMutation`),
`documents/DECISIONES.md` (D-20261103-02 ya registrada).

## Al aprobar

El MID genera `documents/HANDOFF_ACCEPT.md` (consolidado, con §0 de baseline verificado el día y D-20261103-02 en su
tabla de decisiones) y el orquestador lo commitea en esta branch junto con este plan y `DECISIONES.md`. Mensaje propuesto
para esta versión: `docs: add plan for #12 accept and resolve games, v2 (#12)`.
