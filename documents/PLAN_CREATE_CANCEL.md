# PLAN_CREATE_CANCEL v1
> Issue: #11 (hereda los pendientes de #10: comentario del issue del 2026-11-02, PR #44 y `app/README.md` "Pendientes
> conocidos") | Áreas: app / contracts (solo `contracts/fixtures/` y docs) / docs | Branch:
> `feature/issue-11-create-cancel` (desde `master` `eecc790`) | Fecha: 2026-11-02

## Changelog

- **v1 (2026-11-02)**: primera versión.

## Historia de usuario

**Como** jugador con la wallet conectada, **quiero** crear una partida apostando SUI (abierta a cualquiera o invitando a
una dirección) y cancelarla mientras nadie la aceptó, viendo en cada paso si la transacción está pendiente, salió bien o
falló y por qué, **para** poner mi apuesta en juego y recuperarla si me arrepiento, sin usar la CLI y sin que la app me
diga que algo salió bien cuando no salió.

**Scope en una frase:** formulario de creación validado contra la House y el saldo, botón "Cancelar" para el creador, y
la maquinaria común de transacciones (builders puros, mapeo de abort codes, hook de ejecución con estados honestos,
espera de indexación e invalidación) que reutilizan #12 y #14.
**Lo que NO entrega:** aceptar ni el coinflip (#12), "mis partidas" e invitaciones recibidas (#13), el panel admin
(#14) ni cambios del contrato. Rechazar una invitación depende de **P-1** (ver STOP).

## Contexto y alcance

**Qué existe hoy (`master` `eecc790` = código de #10, `dfca12e`, más el housekeeping):**

- Contrato cerrado (#5, #6): `create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx)`,
  `cancel_game(game: &mut Game, ctx)` y `reject_game(game: &mut Game, ctx)`, las tres `entry`
  (`contracts/sources/game.move:88, 121, 131`). Abort codes `house` 0–4 y `game` 0–10, con el número 3 repetido entre
  módulos (`contracts/README.md` "Abort codes": "#11 mapea los aborts por **módulo + código**"). La House es `key`
  compartida con `id, version: u64, fee_rate: u16, fees_collected: Balance<SUI>, min_bet: u64, max_bet: u64`
  (`contracts/sources/house.move:30-39`).
- Lecturas de #10 en `app/src/sui/`: `game.ts` (`parseGameObject`, `parseExactBcs`, `isExactType`, `resolutionAmounts`),
  `events.ts` (`parseGameCreated`/`parseGameCancelled`, `RawGameEvent`), `readPolicy.ts` (`withReadTimeout`,
  `isTransientReadError`), `ids.ts` (`parseObjectIdInput`, `sameAddress`), `format.ts` (`parseSuiToMist`, `formatMist`,
  `formatBps`), `explorer.ts` (`explorerTxUrl`), `config.ts` (`packageId`, `originalPackageId`, `houseId`). Hooks
  `useGame` (15 s de intervalo, `hooks/useGame.ts:38`), `useLobby` (`refresh` = `resetQueries`,
  `hooks/useLobby.ts:116-119`), `queryKeys.ts`. El mapa de `app/README.md` ya reserva `errors.ts` y `transactions/*.ts`
  para #11 (`app/README.md:108-109`).
- Baseline (`documents/STATUS.md`, medido en `dfca12e`, mismo código que `eecc790`): app **375 tests en 29 archivos**,
  lint 0, typecheck 0, build de testnet 852 kB; Move 83 tests; `node --test` 99; `check` "0 despliegues". El handoff lo
  re-verifica en su §0.

**Pendientes heredados de #10** (comentario del issue; `app/README.md` "Pendientes conocidos" y `:162`):

| Pendiente | Dónde se resuelve |
|---|---|
| Cortar el `refetchInterval` de `useGame` ante un error definitivo | DL-7, TASK-3/4 |
| Qué queries invalidar tras una transacción propia, con `queryKeys` | DL-6, TASK-4 |
| Todo ID o dirección de formulario pasa por el borde de `ids.ts` | DL-8, TASK-3 |
| Reutilizar `resolutionAmounts` | DL-8 (estimación del formulario), TASK-5 |
| "La UI (#11) muestra ese costo [el depósito de storage] al crear" (`contracts/README.md:384`) | DL-13, TASK-3/5 |

**Fuera de alcance:** aceptar (#12), cancelaciones del runtime con texto de "reintentar" (#12, las clasifica de forma
genérica este ciclo), "mis partidas" (#13), panel admin y su lectura de `HouseCap` (#14), un botón "Cancelar" en las
filas del lobby (el detalle alcanza; #13 lo suma a "mis partidas").

## Verificación contra el SDK instalado

`npm ci` con Node 26 en el worktree (`@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39, `@mysten/dapp-kit-react`
2.1.41). Rutas relativas a `node_modules/@mysten/`. Lo que el plan asume y de dónde sale:

| # | Hecho verificado | Evidencia | Consecuencia |
|---|---|---|---|
| V-1 | `useDAppKit()` (raíz de `@mysten/dapp-kit-react`, permitida en `hooks/`) expone `signAndExecuteTransaction({ transaction: Transaction \| string, account?, network? })`. Fija el `sender` si falta, serializa con `toJSON({ client })` y llama a la feature `sui:signAndExecuteTransaction` de la wallet | `dapp-kit-react/dist/index.d.mts:18-19, 114`; `dapp-kit-core/dist/index.mjs:570-628` | El hook común recibe un `Transaction` sin construir (la wallet resuelve gas y pago) |
| V-2 | El resultado es `TransactionResult<{ effects, transaction, bcs }>`: `$kind` `Transaction`/`FailedTransaction` según el **estado leído del BCS de los efectos**, con `events`, `objectTypes` y `balanceChanges` en `undefined`, `checkpoint`/`timestampMs` en `null`, y `effects` en `null` si el BCS no se pudo parsear (solo un `console.warn`) | `dapp-kit-core/dist/types-Ceigv1q9.d.mts:201-213`; `dapp-kit-core/dist/index.mjs:537-565` | El resultado de la wallet no trae eventos ni garantiza efectos parseados: la app **confirma con el nodo** (DL-2) |
| V-3 | La burner es `new Ed25519Keypair()` por instancia del kit (una por carga de página, sin persistir) y en `signAndExecuteTransaction` hace `build({ client })` y ejecuta con su cliente gRPC; no muestra ninguna ventana de aprobación | `dapp-kit-core/dist/index.mjs:732-734, 809-829` | Smoke: la burner nace **sin fondos** y cambia de dirección si se recarga la página; se fondea por CLI y se navega por hash (§Smoke). Firmar no necesita operar ningún modal |
| V-4 | **Fallo antes de firmar (dry run):** `build()` sin `gasBudget` simula la transacción; si falla lanza `SimulationError` (exportado por `@mysten/sui/client`) con mensaje `Transaction resolution failed: <message>` y `executionError: SuiClientTypes.ExecutionError` estructurado. Con `gasBudget` fijado, no simula | `sui/dist/client/core-resolver.mjs:77-97`; `sui/dist/client/errors.mjs` (`SimulationError`); `sui/dist/client/index.mjs:7` | La burner lanza ese error tal cual (mismo realm). Una wallet de extensión lo serializa: llega como `Error` con texto. La preflight propia (DL-3) obtiene siempre la forma estructurada |
| V-5 | **Fallo en ejecución:** `ExecutionStatus = { success: true, error: null } \| { success: false, error: ExecutionError }`; `ExecutionError = { message, command? } & ({ $kind: 'MoveAbort', MoveAbort: { abortCode: string, location?: { package?, module?, functionName?, function?, instruction? }, cleverError? } } \| …)` | `sui/dist/client/types.d.mts:914-920, 942-953, 996-1009` | `errors.ts` lee `location.module`, `location.package` y `abortCode` |
| V-6 | Por gRPC (`simulateTransaction`, `executeTransaction`, `getTransaction`) el `MoveAbort` sale de `parseGrpcExecutionError` con el `location` del proto tal cual; por el camino de la wallet (BCS), de `parseBcsExecutionError` con `package` = dirección BCS. El `message` usa `formatMoveAbortMessage`: `MoveAbort in 2nd command, abort code: 3, in '0x…::game::cancel_game' (instruction N)` | `sui/dist/grpc/core.mjs:625-650, 732-745`; `sui/dist/client/utils.mjs:19-39, 58-84` | El formato del `package` puede diferir entre caminos: se compara **normalizado** (`normalizeSuiAddress`). TASK-1 lo mide |
| V-7 | Las cancelaciones del runtime no son `MoveAbort`: `ExecutionCancelledDueToRandomnessUnavailable` llega como `$kind: 'Unknown'` con ese `message`; la congestión, como `CongestedObjects` | `sui/dist/client/utils.mjs:176-184, 246-274` | `errors.ts` las clasifica como "fallo sin abort" (texto genérico); el texto de "reintentar" es de #12 |
| V-8 | `client.waitForTransaction({ digest \| result, include, timeout = 60 s, signal })` repite `getTransaction` con la agenda 0/300/600/1500/3500 ms (y luego cada 2 s) **tragándose cada error** hasta el corte, que rechaza con la razón del `AbortSignal` | `sui/dist/client/core.mjs:93-126`; `sui/dist/grpc/client.d.mts:116` | "Confirmada" = el nodo devolvió la transacción; "indexada" = además tiene `checkpoint` (DL-5). El corte se fija en la app (constante) |
| V-9 | `extractStatusFromEffectsBcs` y `formatMoveAbortMessage` se exportan desde `@mysten/sui/client` | `sui/dist/client/index.mjs:7` | Los tests pasan el BCS real de efectos de la fixture por la misma función que usa el kit (V-2) |
| V-10 | `getBalance({ owner })` devuelve `{ balance: { balance, coinBalance, addressBalance, coinType } }` como strings | `sui/dist/grpc/core.mjs:174-189`; `sui/dist/client/types.d.mts:232-240` | El saldo del formulario es `BigInt(balance.balance)` (monedas + saldo de dirección: los dos pagan gas en 2.37) |
| V-11 | Forma del PTB (probado sin red en `<scratchpad>`): `splitCoins(gas, [pure u64])` y `moveCall` dejan `inputs` = `[Pure(u64), UnresolvedObject{House}, Pure(Option<address>)]` y `commands` = `[SplitCoins{GasCoin}, MoveCall{package, module 'game', function 'create_game', arguments [Input 1, NestedResult [0,0], Input 2]}]`; `tx.pure.option('address', null)` serializa `00` | `tx.getData()` de un script descartable | Los tests de builders comparan `getData()` y decodifican los `Pure` con `bcs` (sin cliente) |
| V-12 | CLI 1.83 con `--gas-budget` explícito **ejecuta** una transacción que aborta (sin dry run previo); el texto del error es `MoveAbort(MoveLocation { module: ModuleId { address: …, name: Identifier("game") }, …, function_name: Some("…") }, N) in command M` | smoke de #6, paso 8 (`git show 8fddbda:documents/SMOKE_ACCEPT.md`) | Fixture de un fallo **ejecutado** real (TASK-1) y segundo formato de texto para el parser |

## Contrato on-chain

Sin cambios. Se consumen `create_game`, `cancel_game` (y `reject_game` si P-1 = (a)), los eventos `GameCreated` y
`GameCancelled` y las tablas de abort codes de `contracts/README.md`. Sin impacto en la compatibilidad de upgrade.

Sincronización nueva con la app (`agents.md` §5): **layout BCS de la `House`** → `app/src/sui/house.ts` (lo reutiliza
#14), con su fila en la tabla de §5 (TASK-6). La tabla de abort codes de `contracts/README.md` pasa a tener su espejo
real en `app/src/sui/errors.ts` (fila ya existente de §5).

## Flujo de fondos

| Camino | Entra | Custodia | Sale | Comisión |
|---|---|---|---|---|
| Crear | `splitCoins(gas, [bet])` de la cuenta conectada | `Game.stake` (`Balance<SUI>`, `stake == bet`) | — | ninguna; el `Game` copia el `fee_rate` de la House para cobrarlo al aceptar (#12) |
| Cancelar (creador) | — | — | 100 % de `stake` al creador (`GameCancelled.refund`) | ninguna |
| Rechazar (invitado, si P-1 = (a)) | — | — | 100 % de `stake` al **creador** | ninguna; el gas lo paga el invitado |

Además, quien firma paga el gas, y crear deja un depósito de storage que **no se recupera** (D-20261030-15 D3; medido
en #6: 1953200 MIST abierta, 2196400 con invitación, con el precio de storage de testnet). La app no mueve fondos por su
cuenta: todo pasa por la wallet. Invariante que verifica el smoke: saldo del creador tras crear = antes − `bet` − costo de
red; tras cancelar = antes + `refund` − costo de red.

## Decisiones abiertas → STOP

### P-1 — ¿Quién entrega el botón "Rechazar invitación"? (decisión de alcance)

**Problema.** El contrato permite que el invitado rechace una invitación (`reject_game`, `game.move:131`; decisión del
usuario D-20261030-06 (4), `documents/DECISIONES.md:123`), pero **ningún issue entrega ese botón**: #11 dice "crear …
y cancelarlas"; #12 solo acepta; #13 lista las invitaciones recibidas "con «Aceptar»". Hoy un invitado que recibe el
enlace no tiene forma de decir que no desde la app.

**Opciones:**
- **(a) Sumarlo a #11 (recomendada).** Mismo patrón que "Cancelar": un builder más, un botón "Rechazar" en el detalle
  visible solo para la dirección invitada con la partida pendiente, y su smoke (con una segunda wallet de desarrollo).
  Los mensajes de sus abort codes ya entran en `errors.ts` igual. Costo: ≈ medio task extra.
- **(b) Dejarlo para #13** ("mis partidas e invitaciones"): se comenta en #13 que su lista incluye "Rechazar". #11 queda
  exactamente como dice el issue. Mientras tanto, el invitado solo puede ignorar la invitación (el creador la cancela).
- **(c) Sacarlo del MVP:** la regla del contrato queda sin UI hasta después del MVP.

**Recomendación: (a).** Es la decisión del usuario D-20261030-06 (4) que hoy no tiene pantalla, usa la misma
maquinaria y el mismo lugar (el detalle de la partida, que es donde llega el invitado con el enlace). Si el usuario
elige (b) o (c), se quitan del plan `buildRejectGameTx`, `canReject`, `useRejectGame`, el botón y los pasos 16-17 del
smoke; nada más cambia. **No bloquea** TASK-1 a TASK-3.

No hay otras decisiones de producto abiertas: el issue declara "Ninguna", el contrato no cambia y no hay dependencias
nuevas. Las decisiones de diseño de abajo las revisa el MAYOR.

## Decisiones de diseño (del MID, sin STOP; las revisa el MAYOR)

| # | Decisión | Alternativas descartadas | Motivo |
|---|---|---|---|
| DL-1 | **Builders puros** en `app/src/sui/transactions/game.ts` (ruta reservada en `app/README.md:109`): `buildCreateGameTx({ packageId, houseId, bet, opponent })` = `splitCoins(tx.gas, [tx.pure.u64(bet)])` + `moveCall('<packageId>::game::create_game', [tx.object(houseId), coin, tx.pure.option('address', opponent)])`; `buildCancelGameTx({ packageId, gameId })` = `moveCall(cancel_game, [tx.object(gameId)])` (y `buildRejectGameTx` si P-1 = (a)). Reciben IDs ya validados desde `config.ts`/`ids.ts` (ARQ-8) y **lanzan** ante un ID inválido, `bet <= 0` o `bet > U64_MAX` (error de programación, no de usuario). Target = `packageId` (versión vigente); `tx.object(id)` sin versión: el resolver del SDK trae la versión compartida inicial y la mutabilidad desde la firma Move | `coinWithBalance` (otra resolución, el issue pide `splitCoins` del gas); `tx.sharedObjectRef` con `initialSharedVersion` (otra lectura o un campo nuevo en `deployments`) | Forma del PTB documentada en `contracts/README.md` "PTB" y verificada en V-11. El builder no sabe de wallets ni de React (PROY-13) |
| DL-2 | **El nodo decide el resultado.** Tras la wallet, el hook confirma con `client.waitForTransaction({ digest, include: { effects: true, events: true }, timeout: TX_CONFIRM_TIMEOUT_MS })` y clasifica **esa** lectura: éxito solo si `status.success` del nodo (SEG-10). El resultado de la wallet aporta el digest y, si el nodo no responde a tiempo, su estado: un fallo reportado por la wallet se muestra como fallo; un "éxito" sin confirmación del nodo pasa a **"enviada, sin confirmar"** (digest y link, nunca "éxito") | Confiar en `$kind` del resultado de la wallet | V-2: sin eventos (hacen falta para el ID creado y el reembolso) y con `effects` posiblemente `null`; además, reconciliar con el nodo es lo que pide SEG-10 |
| DL-3 | **Preflight propia antes de abrir la wallet:** sobre una copia (`Transaction.from(await tx.toJSON())`) con `setSender(cuenta)`, `build({ client })` con corte `TX_PREFLIGHT_TIMEOUT_MS`. Un `SimulationError` (V-4) termina la acción con el mensaje mapeado **sin abrir la wallet**; si pasa, a la wallet va el `Transaction` original sin construir | (a) sin preflight: depender del error de cada wallet (estructurado solo en la burner; texto libre en extensiones); (b) `simulateTransaction` directo sin construir (exige datos de gas que el resolver completa) | Mensaje en español y estructurado con cualquier wallet; una transacción condenada no abre la ventana de la wallet. Costo: una simulación más por acción (la burner simula otra vez). La preflight no evita la carrera (el estado puede cambiar entre la preflight y la ejecución): ese caso llega por los efectos (DL-4, fixture real de TASK-1) |
| DL-4 | **`errors.ts`: un solo mapeo `(módulo, código) → mensaje`** para `house` 0–4 y `game` 0–10 (tabla de abajo). `findMoveAbort(source)` acepta, en orden: un `ExecutionError` (efectos del nodo, de la wallet o `SimulationError.executionError`), un `SimulationError` (su `executionError` o, si falta, su mensaje), y cualquier `Error` por su **mensaje** con dos formatos: el del SDK (V-6: `abort code: N, in '<pkg>::<mod>::<fn>'`) y el de Rust/CLI (V-12: `ModuleId { address: <pkg>, name: Identifier("<mod>") } … }, N)`), recorriendo `cause` hasta 5 niveles. Solo se mapea si el `package` normalizado es el `originalPackageId` **o** el `packageId` de config (en un upgrade, los aborts del código nuevo pueden informar uno u otro; en la v1 son iguales). Mensajes: citan la regla, no la constante; llevan al final un sufijo de diagnóstico `(código game/3)`. Código desconocido de nuestros módulos ⇒ "El contrato rechazó la operación (módulo game, código 99)"; abort de otro paquete ⇒ "La transacción abortó en <paquete abreviado>::<módulo> (código N)"; fallo sin abort (V-7, gas, objetos) ⇒ "La red no ejecutó la transacción: <message del SDK>"; error de la wallet sin abort reconocible ⇒ "La wallet no completó la operación: <mensaje>" | Mapear solo por número; mostrar el `message` crudo del SDK; parsear solo el objeto estructurado | Criterio del issue (módulo + código, ambos caminos, fallback con el código crudo). El número 3 existe en los dos módulos (`contracts/README.md`, "Abort codes"). Los formatos de texto cubren las wallets que serializan el error (R-1) |
| DL-5 | **Espera de indexación.** Tras la confirmación, `waitForCheckpoint`: se repite `getTransaction` (con `withReadTimeout`) hasta que trae `checkpoint`, con tope `TX_INDEX_TIMEOUT_MS`; recién entonces se invalida (DL-6). Si el tope vence, la acción termina igual en éxito, con la nota "La lista puede tardar unos segundos en mostrarlo", y se invalida igual | Invalidar apenas confirma; no esperar | El lobby lee `ListEvents`, que solo ve transacciones en un checkpoint (smoke de #10: "esperar el `checkpoint` antes de «Actualizar»"); si el fullnode todavía no aplicó el checkpoint, `getObject` devuelve la versión vieja y el detalle volvería a mostrar "Abierta" con el botón "Cancelar". TASK-1 mide los tiempos (S-1) |
| DL-6 | **Invalidación por acción**, una función pura `transactionInvalidations(action, ctx)` en `hooks/txInvalidation.ts` con las claves de `queryKeys.ts`. **Crear:** `resetQueries(lobby)` (vuelve a la primera página, como "Actualizar") + `invalidateQueries(balance(cuenta))`. **Cancelar/rechazar:** `invalidateQueries(game(id))` + `resetQueries(lobby)` + `invalidateQueries(balance(cuenta))`. Nunca: `nodeInfo`, `txInfo`, `publishCheckpoint`, `checkpointTime` (inmutables o ajenos). #12 suma `house` (comisiones) y #14 `house`; la tabla vive en un solo lugar. La invalidación corre **dentro** de la `mutationFn` (se completa aunque el componente se desmonte) | `invalidateQueries(['sui', red])` (refetch de todo, incluido el lobby página por página); invalidar en `onSuccess` del `mutate` (no corre si se desmontó) | PROY-14 ("invalidar las queries afectadas"), DL-4 de #10 (el lobby se reinicia, no recarga N páginas) y DL-13 de #10 (claves centralizadas para que #11 invalide sin literales) |
| DL-7 | **`useGame` deja de pedir ante un error definitivo:** `refetchInterval: (query) => gameRefetchInterval(query.state)`, función pura en `sui/gameDetail.ts`: `false` si `status === 'error'` y `!isTransientReadError(error)` (no existe, no es una partida, datos ilegibles); `GAME_REFETCH_MS` en cualquier otro caso (con la red caída sigue intentando cada 15 s, porque eso sí mejora) | Cortar también en estados terminales (la "Última actividad" puede cambiar por una transacción fallida posterior, P6 de #10) | Pendiente de #10 (comentario del issue, `app/README.md` "Pendientes conocidos"). Un solo criterio de "transitorio" (`readPolicy.ts`) |
| DL-8 | **Formulario de creación** en la portada, arriba del lobby (`HomePage`), con validación pura `validateCreateGame` en `sui/createGame.ts` (SEG-1: cortesía): monto con `parseSuiToMist` (`bigint`); `min_bet ≤ bet ≤ max_bet` con los límites **leídos del objeto House** (`sui/house.ts`, BCS exacto como `game.ts`, query `house` sin intervalo, se relee al montar y al foco, **no** al enviar: el contrato es la verdad y la preflight lo atrapa); `bet + CREATE_GAS_RESERVE_MIST ≤ saldo` (saldo de `getBalance`, V-10; reserva 0,01 SUI ≈ 2,5 × el gas medido de crear en #6); invitación opcional: `trim` y `parseAddressInput` (nuevo en `ids.ts`, mismo borde que `parseObjectIdInput` con `isValidSuiAddress`), y `sameAddress` con la cuenta ⇒ "No puedes invitarte a ti mismo" (espejo de `ESelfInvite`). Muestra límites, saldo, la comisión vigente ("la partida guarda esta comisión") y la estimación "si alguien acepta: pozo · comisión · al ganador" con `resolutionAmounts` | Ruta propia `#/crear`; releer la House al enviar; límites hardcodeados | Criterios del issue; reutiliza `resolutionAmounts` (pendiente de #10). Sin wallet conectada, el formulario se ve deshabilitado con "Conecta tu wallet para crear una partida" |
| DL-9 | **ID de la partida creada** = `game_id` del **único** `GameCreated` de la lectura del nodo (DL-2), con `parseGameCreated` (tipo exacto por `originalPackageId`, BCS canónico) y `creator` = la cuenta. Cero o más de uno, o un creador distinto ⇒ éxito honesto ("Partida creada", digest) **sin** navegar, con "No se pudo identificar la partida creada" | `effects.changedObjects` con `idOperation: 'Created'` + `objectTypes` | Reutiliza el parser BCS exacto de #10 y valida el tipo; los efectos no traen tipos sin `objectTypes` |
| DL-10 | **Botón "Cancelar"** solo en el detalle, visible si hay cuenta, `sameAddress(cuenta, creator)` y estado `pending` (`canCancel` pura en `sui/gameActions.ts`; `canReject` igual con `opponent`, si P-1 = (a)). El contrato valida igual (SEG-2); sin diálogo de confirmación propio (la wallet de navegador muestra la aprobación; la burner es solo de desarrollo). Tras el éxito: "Partida cancelada: se devolvieron <refund> SUI a tu cuenta", con `refund` del `GameCancelled` de la transacción (`parseGameCancelled`) | Botón también en las filas "(tuya)" del lobby; confirmación propia | Criterio del issue ("la UI lo oculta y el contrato lo valida"); el reembolso se lee del evento, no se supone |
| DL-11 | **Hook común `useExecuteTransaction`** (`useMutation` sin reintentos; PROY-14) con etapas `idle → preflight → signing → confirming → indexing → done` y resultado `success` / `failure` / `unconfirmed`: deshabilita el doble envío (`isBusy`; un segundo `execute` mientras hay uno en curso se ignora), nunca traga errores (LIM-8: toda falla termina en `failure` con mensaje de `errors.ts`) y expone el digest para `explorerTxUrl`. Cortes: `TX_PREFLIGHT_TIMEOUT_MS` 20 s, `TX_CONFIRM_TIMEOUT_MS` 30 s, `TX_INDEX_TIMEOUT_MS` 30 s (LIM-6; se recalibran con S-1); la firma no tiene corte (es del usuario). Hooks finos por acción: `useCreateGame` (builder + `createdGameId`) y `useCancelGame` (builder + `refund`), que solo arman la transacción, el `action` de DL-6 y lo que se lee del resultado | Un hook por acción con su propia máquina de estados; reintento automático de mutaciones | ARQ-4 (un patrón para todas las acciones de #11, #12 y #14). Una transacción no se reintenta sola: el usuario decide |
| DL-12 | **`TransactionStatus`** (componente): "Verificando la transacción…", "Esperando la firma en la wallet…", "Confirmando en la red…", "Actualizando datos…"; éxito con el digest enlazado al explorador de la red (`explorerTxUrl`; en localnet, el digest abreviado como texto, D-20261102-02 (6)); "sin confirmar" con digest y "revisa el explorador antes de volver a intentar"; error con el mensaje de DL-4 (y el digest si la transacción se ejecutó) | Toasts globales | PROY-16 (pendiente/éxito/error, link al digest), SEG-10 |
| DL-13 | **Costo de crear.** Antes: nota fija "Además del gas, crear la partida deja un depósito de almacenamiento (≈ 0,002 SUI abierta, ≈ 0,0022 SUI con invitación, al precio actual de testnet) que no se recupera", con las constantes `GAME_STORAGE_DEPOSIT_MIST` de lo medido en #6 (`contracts/README.md:375-384`). Después: el aviso de éxito muestra el costo real de red de esa transacción, `computationCost + storageCost − storageRebate` de `effects.gasUsed` | Estimar por simulación en un paso "Revisar" previo; no mostrarlo | Compromiso de `contracts/README.md:384`; un número a priori aproximado y uno a posteriori exacto, sin un paso extra en el formulario |
| DL-14 | **Navegación tras crear:** `navigate('/game/<id>', { state })` con el digest y el costo en el `state` del router; el detalle los muestra como aviso de éxito. En una invitación, el aviso agrega "Comparte el enlace de esta página con el invitado; guárdalo: hasta #13 es la forma de volver a esta partida" (las invitaciones no aparecen en el lobby, DL-12 de #10) | Quedarse en la portada; poner el aviso en la URL | Criterio del issue; R-7 |
| DL-15 | **Fixtures reales de transacciones** (TASK-1): `contracts/fixtures/game-tx.localnet.json`, escrita por un script commiteado `app/scripts/capture-tx-fixtures.mjs` con la **misma guarda** que el de #10 (solo `http://127.0.0.1:9000`, antes de cualquier pedido; `network` y chain id de `localnet.json`). La guarda y la verificación del despliegue se extraen a `app/scripts/localnet-guard.mjs`, que usan los dos scripts (segundo uso, LIM-5) sin cambiar el comportamiento del de #10. Las simulaciones fallidas se capturan **sin claves** (`build({ client })` con `setSender` de una cuenta de la génesis: simular no firma); los éxitos y el fallo ejecutado los hace la CLI dentro de la localnet aislada | Errores sintéticos armados a mano; duplicar la guarda | El issue pide verificar la forma real (no asumir); patrón de D-20261031-01/#10 |
| DL-16 | **Montos y textos:** todo en MIST `bigint` hasta `formatMist` (PROY-12); textos de la UI en español; mutaciones sin la política de reintentos de lecturas (TanStack no reintenta mutaciones por defecto: se deja explícito `retry: false` en el hook) | — | PROY-12, ARQ-4 |

**Mensajes de abort (DL-4; el texto final lo fija el handoff y lo revisa el MAYOR):**

| Módulo | Código | Constante | Mensaje |
|---|---|---|---|
| `game` | 0 | `EBetTooLow` | La apuesta es menor que el mínimo de la House. |
| `game` | 1 | `EBetTooHigh` | La apuesta supera el máximo de la House. |
| `game` | 2 | `ESelfInvite` | No puedes invitarte a ti mismo. |
| `game` | 3 | `ENotCreator` | Solo quien creó la partida puede cancelarla. |
| `game` | 4 | `ENotPending` | La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. |
| `game` | 5 | `ENotInvited` | Esta invitación es para otra dirección. |
| `game` | 6 | `ENoInvitation` | La partida es abierta: no hay invitación que rechazar. |
| `game` | 7 | `EVersionMismatch` | La partida es de otra versión del juego: solo se puede cancelar o rechazar. |
| `game` | 8 | `EWrongHouse` | La partida pertenece a otra House. |
| `game` | 9 | `ESelfPlay` | No puedes aceptar tu propia partida. |
| `game` | 10 | `EWrongStake` | El pago tiene que igualar exactamente la apuesta. |
| `house` | 0 | `EFeeTooHigh` | La comisión supera el máximo que permite el contrato. |
| `house` | 1 | `EInvalidBetLimits` | Límites inválidos: el mínimo tiene que ser mayor que 0 y no superar el máximo. |
| `house` | 2 | `ENoFeesToWithdraw` | No hay comisiones para retirar. |
| `house` | 3 | `EWrongVersion` | La House está en una versión distinta de la de esta app: hay que actualizar la app. |
| `house` | 4 | `ENotUpgrade` | La House ya está en la versión de este paquete. |

## Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta |
|---|---|
| `sui/transactions/game.ts` | `buildCreateGameTx({ packageId, houseId, bet: bigint, opponent: string \| null }): Transaction`; `buildCancelGameTx({ packageId, gameId }): Transaction`; (P-1 a) `buildRejectGameTx({ packageId, gameId })` |
| `sui/errors.ts` | `ABORT_MESSAGES` (`house`/`game` → código → texto); `type MoveAbortInfo = { packageId: string; module: string; code: string }`; `findMoveAbort(source: unknown): MoveAbortInfo \| null`; `transactionErrorMessage(source: unknown, ids: { packageId; originalPackageId }): string` |
| `sui/execution.ts` | `TX_PREFLIGHT_TIMEOUT_MS`, `TX_CONFIRM_TIMEOUT_MS`, `TX_INDEX_TIMEOUT_MS`; `preflightTransaction(client, tx, sender)`; `confirmTransaction(client, { digest, signal })`; `waitForCheckpoint(client, { digest, signal }): Promise<boolean>`; `classifyExecution(result): { kind: 'success' } \| { kind: 'failure'; error: ExecutionError }`; `networkCost(gasUsed): bigint` |
| `sui/gameTx.ts` | `createdGameId(result, { originalPackageId, sender }): string \| null`; `cancelledRefund(result, { originalPackageId, gameId }): bigint \| null` |
| `sui/house.ts` | `type House = { id; version: bigint; feeRate: number; feesCollected: bigint; minBet: bigint; maxBet: bigint }`; `houseType(originalPackageId)`; `parseHouseObject(object, originalPackageId): House`; `fetchHouse(client, { houseId, originalPackageId, signal })` |
| `sui/account.ts` | `fetchSuiBalance(client, { owner, signal }): Promise<bigint>` |
| `sui/createGame.ts` | `CREATE_GAS_RESERVE_MIST`, `GAME_STORAGE_DEPOSIT_MIST` (`open`, `invitation`); `validateCreateGame({ amountText, opponentText, house, balance, account })` → `{ ok: true; bet; opponent } \| { ok: false; errors: { amount?; opponent? } }` (motivos tipados, textos en el componente) |
| `sui/gameActions.ts` | `canCancel(game, address \| null)`; (P-1 a) `canReject(game, address \| null)` |
| `sui/ids.ts` | suma `parseAddressInput(raw): string \| null` |
| `sui/gameDetail.ts` | suma `gameRefetchInterval(state: { status; error }): number \| false` |
| `hooks/queryKeys.ts` | suma `house(network, houseId)` y `balance(network, address)` |
| `hooks/txInvalidation.ts` | `type TxAction = { kind: 'create' } \| { kind: 'cancel'; gameId } \| { kind: 'reject'; gameId }`; `transactionInvalidations(action, { network, originalPackageId, address })`: `{ reset: QueryKey[]; invalidate: QueryKey[] }` |
| `hooks/useExecuteTransaction.ts` | `useExecuteTransaction()` → `{ stage, outcome, execute(input), reset, isBusy }` con `outcome` = `success` (digest, resultado del nodo, `indexed`) \| `failure` (mensaje, digest si hubo) \| `unconfirmed` (digest) |
| `hooks/useCreateGame.ts`, `useCancelGame.ts` (y `useRejectGame.ts`), `useHouse.ts`, `useSuiBalance.ts` | hooks finos sobre lo anterior |

## Tasks (ordenados por dependencia; sin tasks de contratos)

Capas: fixtures (TASK-1) → `sui/` (TASK-2, TASK-3) → `hooks/` (TASK-4) → `components/` + `pages/` (TASK-5) → docs
(TASK-6). Gate completo de la app en cada task (`agents.md` §3, prefijo de Node 26); en TASK-1, además, el job
`contracts` completo sin delta. Sin dependencias nuevas (`package*.json` sin delta en todo el ciclo).

### TASK-1: fixtures reales de transacciones y sondas — área: contracts (fixtures, docs) + app (scripts)
- **Entregable:** `contracts/fixtures/game-tx.localnet.json`, `app/scripts/capture-tx-fixtures.mjs`,
  `app/scripts/localnet-guard.mjs` (guarda compartida), `app/scripts/capture-read-fixtures.mjs` usando la guarda
  compartida (mismo comportamiento), `contracts/README.md` (fila de la fixture y "Lectura desde la app" → cómo se
  recaptura). Resultados de las sondas en el reporte.
- **Localnet aislada** (`agents.md` §3, publicación **variante B**, reglas B4, una sola localnet en la máquina). Cuentas
  `ADMIN`, `A`, `B`, `C` de la génesis. Por CLI: `update_fee_rate` 250; `A` crea `G_OPEN` (abierta) y `G_INV`
  (invitación a `B`); `A` cancela `G_CANCEL`; `B` intenta `cancel_game` sobre `G_OPEN` **con `--gas-budget` explícito**
  ⇒ fallo **ejecutado** `MoveAbort` `game`/3 (patrón del paso 8 del smoke de #6).
- **Fixture** (`_meta` como la de #10: CLI, SDK, fecha, red, método por sección, nota de cuentas efímeras; sin
  `sender`):
  - `house`: el objeto House (`content` BCS en base64, `type`, `owner`) para `parseHouseObject`;
  - `simulationErrors`: por caso, `{ message, executionError }` del `SimulationError` real que lanza `build({ client })`
    con `setSender` (sin claves): crear con `bet` < mínimo (`game`/0) y > máximo (`game`/1), crear invitándose a sí mismo
    (`game`/2), cancelar como no creador (`game`/3), cancelar una cancelada (`game`/4), rechazar como no invitado
    (`game`/5) y rechazar una abierta (`game`/6);
  - `executed`: `getTransaction({ include: { effects: true, events: true, objectTypes: true } })` de crear abierta, crear
    invitación, cancelar (éxitos) y del fallo ejecutado, con `effects.bcs` en base64;
  - `cliErrorText`: el texto del error de la CLI del fallo ejecutado (formato Rust de V-12), recortado a la línea del
    `MoveAbort` y sin direcciones de cuentas.
- **Sondas** (código descartable en `<scratchpad>`, resultados en el reporte):

| Sonda | Qué medir | Para qué |
|---|---|---|
| S-1 | Tras cada transacción de la CLI, desde Node con `SuiGrpcClient`: (i) a qué ms responde `getTransaction` y si trae `checkpoint` `null` la primera vez; (ii) a qué ms aparece el `checkpoint`; (iii) si `getObject` del `Game` ya muestra la versión nueva cuando `getTransaction` responde; (iv) a qué ms aparece el evento en `listEvents` | DL-5 y los cortes de DL-11 |
| S-2 | `location.package` del `MoveAbort` en los tres caminos (simulación gRPC, `getTransaction` gRPC y `extractStatusFromEffectsBcs(effects.bcs)`): formato exacto y si coincide con `originalPackageId` normalizado | DL-4 (V-6) |
| S-3 | `message` real de cada `SimulationError` (formato de V-6) | regex del SDK en DL-4 |
| S-4 | `getBalance` de una cuenta de la génesis antes y después de crear: `balance`, `coinBalance`, `addressBalance` | DL-8 (V-10) |
| S-5 | `waitForTransaction({ digest })` con un digest recién ejecutado: tiempo y `checkpoint` del resultado | DL-5 |

- **Archivos:** los del entregable. **No tocar:** `app/src/`, `contracts/sources/`, `contracts/tests/`,
  `contracts/scripts/`, `contracts/Move.lock`, `package*.json`, `.github/`.
- **AuthZ:** no aplica (cuentas efímeras de la génesis; ninguna clave sale de `<SMOKE_DIR>`).
- **Criterio de aceptación:** la fixture tiene las 4 secciones, sin claves ni `sender`; dos corridas dan el mismo archivo
  salvo `_meta.capturedAt` y los campos que dependen del tiempo, que el reporte declara si los hay; ambos scripts con
  `--url https://fullnode.testnet.sui.io:443` salen con código ≠ 0 sin pedidos (salida pegada); la fixture de #10 no
  cambia (no se recaptura); S-1..S-5 respondidas; cierre limpio del paso 7.
- **Tests:** ninguno nuevo (los consumen TASK-2/3); gates sin delta.
- **Riesgos / rollback:** si S-2 muestra un formato de `package` que no se normaliza a la dirección del paquete, o S-1
  muestra que `getTransaction` responde con `checkpoint` antes de que `getObject` vea la versión nueva, se para y el MID
  ajusta DL-4/DL-5 antes de TASK-2.

### TASK-2: maquinaria pura de transacciones — área: app (`sui/`)
- **Entregable:** `sui/transactions/game.ts` (DL-1), `sui/errors.ts` (DL-4 y la tabla), `sui/execution.ts` (DL-2,
  DL-3, DL-5, constantes de DL-11, `networkCost`), `sui/gameTx.ts` (DL-9, `cancelledRefund`), con tests.
- **Cambios:** todas las llamadas al SDK reciben el cliente acotado (`Pick<SuiGrpcClient, …>`, ARQ-3) y un `signal`;
  `confirmTransaction` y `waitForCheckpoint` usan `withReadTimeout` por intento y su propio tope total.
- **AuthZ:** no aplica (sin firma en esta capa).
- **Criterio de aceptación:** ningún `any`; sin red; sin React; `errors.ts` sin textos fuera de la tabla salvo los
  fallbacks.
- **Tests (Vitest, fixtures por `import.meta.glob` eager como `config.test.ts`):**
  - builders: target `<packageId>::game::create_game` / `cancel_game`, orden `SplitCoins` → `MoveCall`, `NestedResult
    [0,0]` como `stake`, `Pure` decodificados con `bcs` (`u64` = `bet`; `Option<address>` `none` y `some`), House y
    `Game` como `UnresolvedObject` con el ID dado; lanzan con ID inválido, `bet` 0 y `bet` > `U64_MAX`;
  - `errors.ts`: **un test por cada código** de `house` y `game` (`ExecutionError` armado con la forma de la fixture);
    los `SimulationError` reales de la fixture (7 casos); el fallo ejecutado por los dos caminos (gRPC y
    `extractStatusFromEffectsBcs` del BCS real); el texto del SDK (`formatMoveAbortMessage`) y el texto real de la CLI;
    `cause` anidado; `package` en otra forma (corta, mayúsculas) que normaliza al nuestro; `packageId` ≠
    `originalPackageId` (ambos aceptados); código desconocido ⇒ código crudo; abort de otro paquete; `house`/3 ≠
    `game`/3; fallo sin abort (`Unknown` con `ExecutionCancelledDueToRandomnessUnavailable`, `CongestedObjects`); error
    de wallet sin abort ⇒ su mensaje;
  - `execution.ts`: `classifyExecution` (éxito, fallo); `preflightTransaction` con cliente falso (éxito; `SimulationError`
    se propaga; corte por tiempo); `confirmTransaction` (devuelve la lectura del nodo; corte ⇒ error de corte);
    `waitForCheckpoint` (llega en el 2.º intento; nunca llega ⇒ `false` al tope, con timers falsos); `networkCost` con el
    `gasUsed` real;
  - `gameTx.ts`: `createdGameId` con los éxitos reales (abierta e invitación); cero eventos, dos `GameCreated`, tipo de
    otro paquete, creador ≠ cuenta ⇒ `null`; `cancelledRefund` con el éxito real (= `bet`).
- **Riesgos:** el formato de texto de wallets que no se pueden probar (R-1): queda cubierto por el fallback.

### TASK-3: House, saldo, validación del formulario y predicados — área: app (`sui/`)
- **Entregable:** `sui/house.ts` (BCS exacto con `parseExactBcs`/`isExactType`, dueño compartido, invariantes de
  `house.move`: `min_bet > 0`, `min_bet <= max_bet`; `fee_rate <= 1000` **no**, igual que DL-1 de #10), `sui/account.ts`,
  `sui/createGame.ts` (DL-8, DL-13), `sui/gameActions.ts` (DL-10), `parseAddressInput` en `ids.ts`,
  `gameRefetchInterval` en `gameDetail.ts` (DL-7), con tests.
- **Criterio de aceptación:** la House de la fixture parsea; la validación es pura y devuelve motivos tipados.
- **Tests:** `parseHouseObject` con la fixture real (y bytes truncados, sobrantes, tipo ajeno, dueño no compartido,
  `min_bet` 0, `min_bet > max_bet`); `fetchHouse` con cliente falso (no existe ⇒ error no transitorio);
  `fetchSuiBalance`; `validateCreateGame`: vacío, no numérico, negativo, > 9 decimales, debajo del mínimo, igual al
  mínimo, igual al máximo, encima del máximo, saldo justo (`bet + reserva`) y uno menos, saldo desconocido (`null` ⇒ no
  bloquea por saldo, avisa), sin invitación, invitación válida con espacios alrededor, inválida, forma corta y mayúsculas
  (normaliza), la propia cuenta en otro formato ⇒ `self_invite`; `canCancel`/`canReject`: sin cuenta, otra cuenta,
  creador en `pending`/`cancelled`/`resolved`, dirección en otro formato; `parseAddressInput` (mismos casos que
  `parseObjectIdInput`); `gameRefetchInterval`: éxito, error transitorio, `GameNotFoundError`, `NotAGameError`,
  `ReadDataError`.
- **Riesgos:** un error de layout de la House solo lo detecta la fixture real (por eso TASK-1 va primero).

### TASK-4: hooks — área: app (`hooks/`)
- **Entregable:** `queryKeys.ts` (`house`, `balance`), `txInvalidation.ts` (DL-6), `useExecuteTransaction.ts`
  (DL-2/3/5/11), `useCreateGame.ts`, `useCancelGame.ts` (y `useRejectGame.ts` si P-1 = (a)), `useHouse.ts`,
  `useSuiBalance.ts` (sin cuenta no consulta), `useGame.ts` con `gameRefetchInterval` (DL-7).
- **Cambios:** `useDAppKit().signAndExecuteTransaction` dentro de `useMutation` (PROY-14); el cliente de
  `useCurrentClient()`; IDs de `useAppConfig()`; sin `useEffect` para datos.
- **AuthZ:** el hook no decide permisos (lo hacen `canCancel`/`canReject` y el contrato).
- **Criterio de aceptación:** una sola máquina de estados para todas las acciones; ninguna acción muestra éxito sin la
  lectura del nodo.
- **Tests (patrón `useGame.test.tsx`: `useCurrentClient`, `useAppConfig` y `useDAppKit` mockeados; `sui/execution`
  mockeado donde haga falta; arnés `queryHarness.tsx`; timers falsos):** etapas en orden en el camino feliz; preflight
  con `SimulationError` ⇒ `failure` con el mensaje mapeado y la wallet **no** se llama; la wallet rechaza (usuario o
  error) ⇒ `failure` con su mensaje; el nodo dice fallo aunque la wallet diga éxito ⇒ `failure`; la wallet dice éxito y
  el nodo no responde a tiempo ⇒ `unconfirmed` (nunca `success`) e invalida igual; indexación que no llega ⇒ `success`
  con `indexed: false`; doble `execute` ⇒ una sola llamada a la wallet; invalidaciones exactas por acción (espías de
  `resetQueries`/`invalidateQueries` con las claves de `queryKeys`), ninguna sobre claves inmutables; la invalidación
  ocurre aunque el componente se desmonte antes de terminar; `useCreateGame` devuelve el ID de la fixture;
  `useCancelGame` el `refund`; `transactionInvalidations` tabla completa; `useGame` deja de pedir tras `NOT_FOUND`
  (avanzar 2 × 15 s sin llamadas nuevas) y sigue pidiendo con `UNAVAILABLE`; `useHouse`/`useSuiBalance` con la
  política común.
- **Riesgos:** los timers falsos con `waitForTransaction`: el hook usa `sui/execution` (mockeable), no el SDK directo.

### TASK-5: formulario, botón y estado de transacción — área: app (`components/`, `pages/`)
- **Entregable:** `components/TransactionStatus.tsx` (DL-12), `components/CreateGameForm.tsx` (DL-8, DL-13: campos
  apuesta e invitación opcional, límites, saldo, comisión, estimación con `resolutionAmounts`, nota del depósito,
  errores de validación por campo, "Crear partida" deshabilitado si no valida o `isBusy`; sin cuenta, "Conecta tu wallet
  para crear una partida"), `components/GameActions.tsx` ("Cancelar" según `canCancel`, y "Rechazar" según `canReject`
  si P-1 = (a), con su `TransactionStatus`); `pages/HomePage.tsx` con el formulario arriba del lobby;
  `pages/GameDetailPage.tsx` con `GameActions` y el aviso de creación desde el `state` del router (DL-14).
- **Cambios:** ARQ-1/ARQ-2 (los componentes solo renderizan y disparan; de `@mysten/*` solo
  `@mysten/dapp-kit-react/ui`); SEG-9 (texto plano); montos con `format.ts`.
- **Criterio de aceptación:** cada estado de `TransactionStatus` y de ambos formularios/botones tiene test; ningún
  componente arma transacciones, IDs ni mensajes de error.
- **Tests (hooks mockeados, patrón `GameDetailPage.test.tsx`):** formulario sin cuenta, cargando la House, error de la
  House con "Reintentar", cada error de validación con su texto, estimación con la comisión de la House, nota del
  depósito, botón deshabilitado mientras `isBusy`, navegación al detalle con el ID tras el éxito y sin navegar si no hay
  ID (DL-9); `TransactionStatus` en cada etapa, éxito con link (testnet) y con digest en texto (localnet), `unconfirmed`
  y `failure` con y sin digest; `GameActions`: oculto sin cuenta, para otra cuenta y en `cancelled`/`resolved`; visible
  para el creador en `pending`; aviso de reembolso; detalle con el aviso de creación (y el texto de compartir en una
  invitación).
- **Riesgos:** el aspecto (sin CSS nuevo salvo lo mínimo) se revisa en el smoke.

### TASK-6: docs del ciclo — área: docs
- **Entregable:** `app/README.md` (mapa de `sui/` con `transactions/game.ts`, `errors.ts`, `execution.ts`, `gameTx.ts`,
  `house.ts`, `account.ts`, `createGame.ts`, `gameActions.ts`; hooks nuevos y claves `house`/`balance`; sección
  "Transacciones (#11)": preflight, confirmación con el nodo, indexación, tabla de invalidación, cortes, estados y
  "sin confirmar"; reglas del formulario; la burner nace sin fondos y cambia de dirección al recargar (cómo fondearla por
  CLI en la localnet aislada); "Pendientes conocidos" sin el de `useGame`), `contracts/README.md` (abort codes: espejo
  implementado en `errors.ts` con mensajes; nota del costo de crear ya implementada), `agents.md` §5 (fila "Layout BCS de
  la House" ↔ `house.ts`; `errors.ts` ya existe) y `documents/STATUS.md` (baseline de la app, fila de #11).
- **Criterio de aceptación:** sin rutas personales; los números citados coinciden con los reportes; ningún "lo hace #11"
  vigente en los docs (`grep -n "#11" app/README.md contracts/README.md agents.md` revisado a mano).

## Tests (resumen)

Todo en Vitest + jsdom, sin red real (LIM-11): fixtures reales para builders, errores y resultados (TASK-2/3), clientes y
kit mockeados para hooks (TASK-4) y hooks mockeados para componentes (TASK-5). Delta esperado: ≈ 14-16 archivos de test
nuevos sobre los 29 de hoy; el conteo exacto lo fija cada reporte.

## Smoke (después de TASK-6; el MID genera `documents/SMOKE_CREATE_CANCEL.md`, AGENTE_MID §M5)

**Modalidad evaluada.** Chrome headless + CDP con perfil desechable en `<SMOKE_DIR>` (como en #9/#10), cliente CDP propio
en Node 26 sin dependencias. **Sirve para todo el flujo:** el modal del kit ya se operó así en el smoke de #10 (paso 13:
`internal-button` del shadow DOM ⇒ "Unsafe Burner Wallet"), y la burner **firma sin ninguna ventana** (V-3). Los campos
de React se llenan con foco + `Input.insertText` (dispara `onChange`), no asignando `value`. Por eso no hace falta una
alternativa; si el kit cambiara su shadow DOM, el paso se hace con `Runtime.evaluate` sobre `shadowRoot` (sin
dependencias nuevas). Lo que el smoke no puede probar (una wallet de extensión real en testnet) queda para el owner en #17
(R-1).

- **Red:** localnet aislada (`agents.md` §3), publicación **variante B**, reglas **B4**, una sola localnet; `app.env` y
  `chrome.env` como en #10; nunca `env.sh` y `app.env` en la misma llamada. Nada contra testnet.
- **Cliente:** `VITE_SUI_NETWORK=localnet npm run dev -w app` + burner. **Sin recargas de página** después de fondear una
  burner (su clave vive en memoria: una recarga crea otra dirección, V-3); la navegación es por hash.
- **Pasos previstos** (la tabla definitiva y los resultados van en el SMOKE, llenados durante la corrida):
  0. Preparación, línea base de `~/.sui/sui_config/` (`stat`/`ls`), puertos libres, árbol limpio.
  1. Génesis, arranque, cuentas `ADMIN`, `A`, `B`; publicación variante B; `update_fee_rate` 250.
  2. `vite` dev y Chrome headless (pestaña `T1`).
  3. 🌐 Portada sin wallet: "Conecta tu wallet para crear una partida", formulario deshabilitado; lobby "No hay partidas
     abiertas".
  4. 🌐 Conectar la burner en `T1` ⇒ dirección `X` (del `title` de `.account-badge`, a `ids.env`; no se pega). El
     formulario muestra "mínimo 0.001 SUI · máximo 50 SUI" y "comisión 2.5 %" leídos de la House; saldo 0 ⇒ con 0.01,
     "Saldo insuficiente".
  5. DEV: `A` fondea `X` con 2 SUI (`PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c
     --transfer-objects "[c]" @$X`); 🌐 volver a la portada por hash ⇒ saldo 2 SUI.
  6. 🌐 Validaciones sin red: 0.0001 (debajo del mínimo), 51 (encima del máximo), `abc`, invitación a `X` en mayúsculas
     ("No puedes invitarte a ti mismo"), dirección inválida; en CDP `Network.*`, **ningún** `SimulateTransaction` ni
     `ExecuteTransaction` durante el paso.
  7. 🌐 Crear abierta de 0.01 SUI: etapas visibles en orden; navega a `#/game/<G1>` con "Abierta", creador `X`, aviso con
     digest y costo de red. DEV: `suic tx-block <digest>` ⇒ `success`, `GameCreated` `bet` 10000000 y creador `X`;
     `suic balance $X` = 2 SUI − 0.01 − costo de red (= el del aviso).
  8. 🌐 Volver a la portada **sin** "Actualizar": `G1` en el lobby con "(tuya)" (invalidación tras la indexación; se anota
     la espera).
  9. 🌐 Crear invitación de 0.02 SUI a `B`: detalle "Invitación a <B>" con el texto de compartir; no aparece en el lobby.
  10. 🌐 En `G1`: "Cancelar" visible ⇒ click ⇒ "Partida cancelada: se devolvieron 0.01 SUI a tu cuenta"; estado
      "Cancelada"; el botón desaparece; el lobby ya no la muestra. DEV: `GameCancelled` `refund` 10000000,
      `cancelled_by` = `X`; saldo de `X` = antes + 0.01 − costo de red.
  11. 🌐 Doble envío: doble click inmediato en "Cancelar" de la invitación ⇒ una sola transacción (CDP: un solo
      `ExecuteTransaction`), reembolso de 0.02.
  12. 🌐 Pestaña `T2` (otra burner, `Y`, tras conectarla a mano: el kit no restaura la sesión de `T1` porque la dirección
      guardada no existe en la burner nueva). Con `X` se crea `G3` abierta; en `T2`, `#/game/<G3>` **sin** "Cancelar";
      sin wallet tampoco.
  13. DEV: el contrato también lo valida: `B` llama `cancel_game` sobre `G3` con `--gas-budget` ⇒ fallo ejecutado
      `MoveAbort` `game`/3; 🌐 `G3` sigue "Abierta".
  14. 🌐 **Abort real con mensaje mapeado (camino previo a la firma):** en `T1`, con el formulario abierto y la House ya
      leída, DEV: `ADMIN` `update_bet_limits` a mínimo 0.05 SUI; 🌐 crear 0.02 SUI ⇒ "La apuesta es menor que el mínimo
      de la House. (código game/0)"; ningún `ExecuteTransaction` en CDP; saldo sin cambios. Volver a la portada ⇒ el
      formulario muestra el mínimo nuevo y bloquea 0.02 sin red.
  15. DEV: `ADMIN` restaura los límites.
  16. (P-1 = (a)) DEV fondea `Y`; `X` invita a `Y` (dirección del paso 12) ⇒ en `T2`, "Rechazar" visible solo ahí ⇒
      "Invitación rechazada; se devolvieron N SUI a quien te invitó"; en `T1` (y como `X`) no aparece "Rechazar".
  17. (P-1 = (a)) DEV: `GameCancelled` con `cancelled_by` = `Y` y `refund` = `bet` al creador `X`.
  18. Cierre del paso 7 de `agents.md` §3 más la app (`kill` por PID de `vite` y Chrome, perfil borrado,
      `contracts/deployments/localnet.json` borrado, `~/.sui/` idéntico a la línea base, `Move.lock` sin delta, árbol solo
      con `documents/SMOKE_CREATE_CANCEL.md`).
- **Qué no cubre el smoke y dónde está cubierto:** el fallo **ejecutado** mapeado en la UI (la preflight y la simulación
  de la burner lo atrapan antes; solo ocurre en una carrera): fixture real de TASK-1 + tests de TASK-2/4; "sin
  confirmar" e indexación que no llega: tests de TASK-4; wallets de extensión y testnet: #17 (owner).

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | El texto del error de una wallet de extensión (p. ej. Slush en testnet) no coincide con los dos formatos conocidos | Preflight propia (DL-3) antes de la wallet; fallback que muestra el mensaje de la wallet; verificación en el smoke de testnet del owner (#17) |
| R-2 | Tras un upgrade, el `package` del `MoveAbort` puede ser el original o el nuevo | `errors.ts` acepta ambos IDs de config, normalizados (DL-4); S-2 mide el formato |
| R-3 | Retraso de checkpoint: lecturas viejas justo después de una transacción | Espera de indexación con tope (DL-5) y nota honesta si vence; S-1 calibra los cortes |
| R-4 | La burner nace sin fondos y cambia de dirección al recargar | Fondeo por CLI en el smoke, navegación por hash, documentado en `app/README.md` (TASK-6) |
| R-5 | Carrera entre la preflight y la ejecución (otra transacción cambia la partida) | El fallo llega por los efectos y se mapea igual (DL-2/4, fixture real) |
| R-6 | Latencia y pedidos extra por la preflight (una simulación más por acción) | Disparada solo por el usuario; aceptable en el MVP |
| R-7 | Una invitación no aparece en el lobby: si el creador pierde el enlace, no puede volver a ella desde la app hasta #13 | Aviso de compartir/guardar el enlace (DL-14); la CLI sigue pudiendo cancelar; #13 |
| R-8 | La reserva de gas de cortesía bloquea un caso límite con saldo justo | Constante documentada; el contrato y la wallet son la verdad; el mensaje explica la reserva |
| R-9 | `effects` `null` en el resultado de la wallet (V-2) | No se usa: la app confirma con el nodo (DL-2) |
| R-10 | La fixture tiene IDs y direcciones hex de 64: el grep de secretos las marca | Cuentas efímeras de la génesis, sin claves (igual que las de #10); se declaran en el reporte |
| R-11 | El bundle crece (hoy 852 kB) | Informativo; code-splitting en #15 |
| R-12 | `waitForTransaction` se traga los errores hasta su corte (V-8): un problema permanente tarda `TX_CONFIRM_TIMEOUT_MS` en mostrarse | Corte propio de 30 s y estado "sin confirmar" con el digest |

## Archivos que NO se tocan

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `.github/workflows/ci.yml`,
`package.json`, `app/package.json`, `package-lock.json`, `.npmrc`, `app/eslint.config.js`, `app/src/sui/config.ts`,
`app/src/sui/dappKit.ts`, `app/src/sui/networks.ts`, `app/src/sui/lobby.ts`, `contracts/fixtures/game-reads.localnet.json`.

## Al aprobar

El MID genera `documents/HANDOFF_CREATE_CANCEL.md` (consolidado, con §0 de baseline verificado el día y la respuesta del
usuario a P-1) y el orquestador lo commitea en esta branch. Mensaje propuesto para esta versión:
`docs: add plan for #11 create and cancel games, v1 (#11)`.
