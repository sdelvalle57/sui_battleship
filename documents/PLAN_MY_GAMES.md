# PLAN_MY_GAMES v2
> Issue: #13 (más los comentarios del issue del 2026-11-02 y del 2026-11-04 UTC, la revisión de integración de #12
> publicada en el PR #49, MINOR-1 y NIT-1, y R-7 del plan de #11) | Áreas: app / docs | Branch:
> `feature/issue-13-my-games` (desde `master` `244cf76`) | Fecha: 2026-11-03

## Changelog

- **v1 (2026-11-03)**: primera versión. Un STOP para el usuario (P-1, historial en testnet).
- **v2 (2026-11-03)**: revisión del MAYOR del plan v1 (REQUEST CHANGES: 1 MAJOR, 7 MINOR, 5 SUGGESTION) y decisión del
  usuario sobre P-1 (**(a)**, D-20261103-03).

| Hallazgo | Cambio en v2 |
|---|---|
| **MAJOR-1** (sección 2 "vacía" con actividad sin revisar) | **DL-16 nuevo.** Las secciones 2 y 3 comparten la fuente de actividad. Solo muestran el texto de vacío definitivo con `!activity.hasNextPage && !activity.stalled && activity.nextPageError === null`; si no, dicen "Sin partidas pendientes en lo revisado" y "Sin partidas terminadas en lo revisado". El botón **"Cargar más actividad"** se repite al pie de las secciones 2 y 3: es el mismo handler y los dos se deshabilitan mientras carga. Con la cota en el piso, el texto lleva "desde <fecha>". Tests en TASK-5. El smoke no lo puede cubrir: la burner no genera > 50 eventos propios por CLI. Queda escrito en el smoke |
| **MINOR-1** (`readMask` con `sender` rompe `lobby.test.ts:196`) | DL-2 y TASK-2: el `readMask` común es **el del lobby, sin `sender`**. DL-3 verifica `creator`/`acceptor` del contenido del evento, que es `ctx.sender()`. TASK-2 precisa que en `lobby.test.ts` solo cambian los imports (`:8-15`) y el identificador renombrado de la cota en `:314`; ningún valor de aserción cambia |
| **MINOR-2** (tests con las claves invalidadas exactas) | TASK-4 lista `useExecuteTransaction.test.tsx` (los `toEqual` de `:206-207, 316-317, 367-368, 376-377, 390, 399-400, 426-427, 448-450, 468-469`) con la aserción nueva. DL-7 fija el orden: `invalidate` = las claves de hoy **y al final** `queryKeys.myGames(...)`. El criterio "755 verdes, solo cambian imports" es de TASK-3; TASK-4 cambia esas aserciones a propósito |
| **MINOR-3** (un error de relectura desmonta las filas) | **DL-17 nuevo.** Con datos de la fuente presentes, una relectura en `retrying` o `error` **no** reemplaza las filas: va como nota arriba de la sección ("No se pudo actualizar la lista: …; los datos pueden estar desactualizados"), igual que `nextPageError` en el lobby. `ReadState` en lugar de las filas solo antes de la primera carga. `useMyGames` expone `refreshError`/`refreshRetrying` por fuente. Tests en TASK-4 y TASK-5 (las filas y el `TransactionStatus` siguen montados) |
| **MINOR-4** (`GameCreated` ilegible ajeno en las invitaciones de todos) | DL-3 y la agrupación: en (B), un **evento** ilegible no genera fila. Se cuenta y la página muestra una nota: "N eventos ilegibles en lo revisado". Un **objeto** ilegible de un evento legible con `opponent == cuenta` sí va a la sección 1. Test en TASK-2 |
| **MINOR-5** (qué lectura gana al deduplicar) | La agrupación se queda con la lectura de **mayor versión del objeto** (`object.version`, que `getObjects` trae siempre; no `Game.version`, que es la versión del contrato). El rol con `acceptor` e `invitee` es "Aceptaste" (`acceptor`) y el evento es el más nuevo (mayor checkpoint). `MyGameItem` lleva `objectVersion: bigint`. Tests de `groupMyGames` |
| **MINOR-6** (DL-9 anula DL-11 (1) en la página) | DL-9 y DL-11 lo dicen. En "Mis partidas" el cambio de cuenta **remonta** el contenido: la etapa por clave rinde en el detalle y en el formulario. Al volver a A, una transacción **todavía en curso** se adopta en su fila (`mountSnapshot.pendingIds`). Una que **terminó** mientras se veía B no muestra resultado: la partida aparece con su estado leído del nodo, en la sección natural, porque `pins` se reinició. El motivo de DL-11 se ajusta. Test en TASK-5 |
| **MINOR-7** (cierre y precondiciones del smoke) | Smoke: el paso 0 y el de cierre copian los de #12: línea base sin `localnet.json`, `Published.toml` ni `Pub.*.toml`; `ss -ltn` con 9000, 9123, 9184, 5003, 5173 y 9229 libres al inicio y al cierre; `vite` dev y Chrome en segundo plano con `vite.pid` y `chrome.pid`; `kill` por PID; `kill -0` que falle en `sui`, `vite` y Chrome **antes** de `rm -rf <SMOKE_DIR>`; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío |
| SUGGESTION-1 (R-5 no se medía) | **Aceptada.** Paso 9 nuevo: `C` crea en un PTB 25 invitaciones a `AW`, con 25 filas con `GameActions`. Se mide desde "Actualizar" hasta que se ven las filas, y la respuesta de "Aceptar" en una de ellas. RM-5 apunta a ese paso |
| SUGGESTION-2 (una sola captura de la cuenta) | **Aceptada** (DL-11, TASK-3). `TxVariables` lleva `account` y `targetHash`, capturados en `execute`. `run` toma la cuenta de las variables y `ExecuteInput.interpret(nodeResult, signer)` recibe la dirección que firmó. `useAcceptGame` y `useCreateGame` dejan de usar su propio `sender` |
| SUGGESTION-3 (costo de `invalidate` y corrimiento de la ventana) | **Se documenta, sin mitigar** (RM-12, `app/README.md`). `invalidate` vuelve a pedir en serie todas las páginas cargadas: "Actualizando datos…" y el candado duran más en proporción. Una fila de invitaciones al final de la última página puede salirse si entraron `GameCreated` nuevos. Guardar el último ítem en `pins` mostraría un estado sin reconciliar (el problema de MINOR-5). Con páginas de 50 y el volumen del MVP, es un caso raro y se recupera con "Buscar más atrás" |
| SUGGESTION-4 (caso del creador) | **Aceptada.** En "Decisión del usuario (P-1)", RM-3 y TASK-6: para el creador, una partida creada hace más de ~14,6 días y resuelta después **no** aparece en "Terminadas". El `GameResolved` tiene como remitente al aceptante y el `GameCreated` está podado. Se ve por su ID, su enlace o el explorador |
| SUGGESTION-5 (nombre de R-7; etapa compartida) | **Aceptada.** Los riesgos propios pasan a **RM-n**: "R-7" queda solo para el de #11. DL-11 y TASK-3 acotan el criterio: si B lanza una acción desde la **misma** instancia del hook después del cambio, al volver a A esa instancia ya no muestra el resultado de A (la etapa y el `runId` son de B), y el "sin confirmar" de A sigue bloqueando. Hay test |
| **P-1** | Decidido por el usuario: **(a)** con las dos ayudas, D-20261103-03. DL-15 deja de ser condicional; TASK-2, TASK-5, TASK-6 y el smoke quedan alineados |

## Historia de usuario

**Como** jugador con la wallet conectada, **quiero** una página "Mis partidas" con las invitaciones que me hicieron y
siguen abiertas, las partidas que creé y siguen pendientes, y las que terminaron (con si gané o perdí), cada una con
el botón que corresponda ("Aceptar" o "Rechazar" una invitación, "Cancelar" una propia), **para** no depender de que
alguien me pase el enlace de una invitación y poder recuperar mi apuesta de una partida que nadie aceptó sin usar la
CLI.

**Scope en una frase:** página `#/my-games`, enlazada desde el encabezado, con tres secciones derivadas de los eventos
del paquete y del estado vigente de cada objeto, acciones en cada fila con la máquina de transacciones de #11 y #12,
paginación acotada, textos honestos sobre el historial que cubre el nodo, y dos ayudas para las partidas más viejas
("Abrir partida por ID" y el enlace al explorador en testnet). Además, en este ciclo se corrige el cambio de cuenta a
mitad de una transacción (MINOR-1 de #12) y se cortan los ciclos de imports de tipos de `hooks/` (NIT-1).

**Lo que NO entrega:** indexador o backend propio, estadísticas o ranking, notificaciones (fuera de alcance del
issue). Tampoco un historial más largo que el del fullnode público en testnet (D-20261103-03), ni un candado entre
pestañas (R-5 de #12). Quedan fuera los cambios del contrato y la persistencia en el navegador.

## Contexto y alcance

**Qué existe hoy (`master` `244cf76` = código de #12, `31100ab`, más el housekeeping):**

- **Lobby por eventos (#10):** `app/src/sui/lobby.ts:72-131` arma el `ListEvents` crudo (`ledgerService.listEvents`)
  descendente de `GameCreated`, con `startCheckpoint` = `lobbyLowerBound` (`:50-63`: máx(publicación, piso + 16 000)).
  Trata `OUT_OF_RANGE` como fin del historial (`:134-161`, `HistoryPrunedError`) y un cursor que no avanza como
  `PaginationStalledError` (`:201`). Lee los objetos en lote con `getObjects` (`:220-224`) y solo deja las abiertas en
  `Pending` (`:205`, `:244`). `useLobby` (`hooks/useLobby.ts`) combina el estado de la publicación, deduplica y
  pagina.
- **Detalle y acciones (#10-#12):** `GameDetailPage` + `GameActions` (`components/GameActions.tsx:95-155`): "Aceptar"
  (`acceptState`), "Cancelar" (`canCancel`), "Rechazar" (`canReject`), **una** `useTxTarget` por partida, el aviso
  `in_flight` (`:143`), el resultado adoptado y la alerta "sin confirmar" con "Ya la revisé".
- **Máquina global (#12):** `useExecuteTransaction` (mutación en el `MutationCache` con `queryKeys.txTarget`, candado
  `isMutating` por cuenta en `:258`, resultado leído por `runId` en `:248-253`), `useTxTarget` y `txSession.ts`.
  `transactionInvalidations` (`hooks/txInvalidation.ts:21-39`) es la tabla única de qué se refresca tras una transacción
  propia.
- **El problema:** una invitación no aparece en ningún lado. El lobby muestra solo las abiertas
  (`lobby.ts:205`, "`if (created.opponent !== null) continue`"). El invitado solo la encuentra si le pasan el enlace, y
  el creador que perdió el enlace no vuelve a ella desde la app. Es R-7 del plan de #11; hoy el aviso de creación dice
  "guárdalo para volver a esta partida" (`pages/GameDetailPage.tsx:45`).

**Pendientes heredados que este plan trata:**

| Origen | Pendiente | Dónde se resuelve |
|---|---|---|
| D-20261102-04 (1) | "se reevalúa en el plan de #13": ventana de historial del fullnode público | Mediciones de abajo + **D-20261103-03** (P-1 = (a)) |
| Comentario de #12 / revisión de #49 | Listas con "Aceptar"/"Rechazar" sobre la misma máquina; una `useTxTarget` por objetivo | DL-6, TASK-5 |
| MINOR-1 de #49 | Cambio de cuenta a mitad de una transacción: se pierde el resultado | DL-11, TASK-3 (entra en este ciclo) |
| NIT-1 de #49 | Ciclos de imports de tipos en `hooks/` | DL-12, TASK-3 |
| R-7 de #11 | Forma de volver a una invitación o partida propia | La página misma; DL-10 (texto del aviso); DL-15 |
| Revisión de #44 | Listas con el `ListEvents` crudo y `OUT_OF_RANGE` como fin del historial | DL-1, DL-2 |
| Issue | "Filtrar por el package ID original (#7)" | DL-1: tipos de evento con `originalPackageId` (`gameEventType`) |

**Fuera de alcance:** los de la HU. Además, el lobby no cambia de comportamiento (solo se extrae su escaneo, DL-2), y
el panel de la House es #14.

## Verificación contra el SDK instalado

`npm ci` en el worktree con Node 26 (árbol del lock, sin cambios): `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
`@mysten/dapp-kit-react` 2.1.41.

| Pregunta | Evidencia (`node_modules/…`) | Conclusión |
|---|---|---|
| ¿Qué filtra `ListEvents` del lado del servidor? | `@mysten/sui/dist/grpc/proto/sui/rpc/v2/filter.d.mts:125-204`: `EventFilter` es una **DNF** (OR de términos; cada término es un AND de literales con `negated`). Los predicados posibles son `sender`, `emitModule`, `eventType` (tipo completo, módulo o dirección) y `eventStreamHead` | Se puede pedir "sender = cuenta **y** tipo = `GameCreated`" en el servidor. **No hay filtro por campo** del evento (`opponent`, `acceptor`): las invitaciones se filtran en el cliente (lo prevé el issue) |
| ¿Rango y paginación? | `ledger_service.d.mts:477-554`: `startCheckpoint` (inclusivo), `endCheckpoint`, `options` (`limit`, `ordering`, `before`/`after` con el `watermark.cursor`); un `QueryEnd` por stream | Igual que el lobby de #10 |
| ¿Sirve el `client.listEvents` del SDK? | `@mysten/sui/dist/client/types.d.mts:460-481`: `EventFilter` del core admite **un solo** criterio (`sender` **o** `emitModule` **o** `eventType`); `grpc/filters.mjs` lo traduce a un único literal | No: no combina remitente y tipo, y en testnet falla con `OUT_OF_RANGE` (P7 de #10). Se usa el crudo, como el lobby |
| ¿Objetos por dueño? | Los `Game` son **compartidos** (`contracts/README.md`, "Objetos") | `listOwnedObjects` no aplica |
| ¿Lote de objetos y su versión? | `@mysten/sui/dist/grpc/core.mjs:41-60`: `getObjects` parte los IDs en lotes de **50**, los pide en serie y siempre incluye `version` (`:44-50`); en `client/types.d.mts` el objeto trae `version: string` | 50 por pedido, ~135 ms cada uno (M-6). La versión del objeto ordena dos lecturas de la misma partida (MINOR-5) |
| ¿Se puede fijar la cuenta que firma? | `@mysten/dapp-kit-core/dist/types-*.d.mts:208-212`: `signAndExecuteTransaction({ transaction, account?, network? })`, donde `account` es la cuenta que firma; sin `account` firma la conectada **en ese momento**. La revisión del MAYOR confirmó que una cuenta que la wallet ya no expone se rechaza **antes** de abrirla, sin digest, y que `setSenderIfNotSet(account.address)` deja el `sender` igual al de la preflight | DL-11: la máquina firma con la cuenta capturada al lanzar |
| ¿Cliente GraphQL sin dependencias nuevas? | `@mysten/sui` exporta `./graphql` (`SuiGraphQLClient`, `dist/graphql/core.mjs:385-427`, `listEvents` con un solo criterio); `gql.tada` ya está en el árbol de producción | Solo era relevante para la opción (b) de P-1, descartada |

**Mediciones con lecturas públicas sin claves** (2026-11-04 ~03:30 UTC, es decir, 2026-11-03 hora local; sondas en
Node 26 con el SDK del lock, fuera del repo; el MAYOR las reprodujo ~03:47 UTC con los mismos resultados):

| # | Medición | Resultado |
|---|---|---|
| M-1 | `getServiceInfo` del fullnode público de testnet | `sui-node/1.83.1`; piso `lowestAvailableCheckpoint` 397 152 510, punta 402 625 524. Ventana de **14,56 días** (piso del 2026-10-20 14:05 UTC); 4,351 checkpoints/s. Coincide con lo medido en #10 |
| M-2 | `ListEvents` crudo descendente desde piso + 16 000 con `sender` solo, `sender ∧ eventType` y una DNF de dos términos (`sender ∧ tipo1` ∨ `sender ∧ tipo2`), con un remitente real tomado de los eventos recientes | 50 eventos (`ITEM_LIMIT`) en 140-170 ms; todos del remitente y de los tipos pedidos; la DNF devolvió los dos tipos |
| M-3 | Lo mismo con una dirección **sin actividad** y con un tipo inexistente, sobre la ventana entera | 0 eventos, `CHECKPOINT_BOUND`, **1 frame**, ~108 ms: el filtro usa índice, no recorre la ventana. Una cuenta nueva no cuesta más que una activa |
| M-4 | `startCheckpoint` debajo del piso | `OUT_OF_RANGE` ("requested data below earliest available; lowest available checkpoint is …"), como P7 de #10 |
| M-5 | Página 2 de la DNF con `before` = último `watermark.cursor` | 50 eventos, 152 ms |
| M-6 | `getObjects` con 50 / 100 / 200 / 1000 IDs inexistentes | 136 / 274 / 535 / 2821 ms (lotes de 50 en serie); cada uno vuelve como `ObjectError` |
| M-7 | GraphQL público de testnet (`graphql.testnet.sui.io`), para P-1 | Mismo chain id. `serviceConfig.availableRange` de `events` (también con los filtros `sender`, `type`, `module`) empieza en el **checkpoint 0 (2023-05-10)**, y devolvió eventos de 2023. `EventFilter` es un AND de `sender`, `module`, `type` y rangos de checkpoint, **sin OR** y **sin filtro por campo** (lo agregó el MAYOR); `maxPageSize` de `events` = 50. El preflight CORS respondió 200 con `access-control-allow-origin: *`. Queda para el issue de seguimiento post-MVP (D-20261103-03) |

Lo que **no** se pudo medir sin publicar: los eventos del paquete en testnet (#8 sigue en draft). En localnet lo mide
TASK-1 (filtro `sender` en `sui-node` 1.83.0 local, varios `GameCreated` en una transacción y el cursor en el medio).

## Contrato on-chain

**Sin cambios.** Se leen los eventos existentes (`contracts/README.md`, "Eventos"): `GameCreated` (`creator` =
`ctx.sender()` de `create_game`) y `GameResolved` (`acceptor` = `ctx.sender()` de `accept_game`). Por eso el filtro
por remitente del servidor equivale exactamente a "las que creé" y "las que acepté". `GameCancelled` no se usa en las
listas. Sin impacto en compatibilidad de upgrade: los tipos de evento se piden con el `originalPackageId`, que no
cambia con un upgrade (DL-9 de #10).

## Flujo de fondos

No aplica: las listas solo leen. "Aceptar", "Rechazar" y "Cancelar" de cada fila son los mismos hooks de #11 y #12
(mismos PTB, misma preflight, mismo resultado verificado por el nodo, SEG-10), así que la conservación ya está
cubierta por los tests y smokes de #6, #11 y #12.

## Decisión del usuario (P-1)

> Decisión (2026-11-03): se optó por (a), aceptar la ventana del fullnode público (~14,6 días) con texto honesto y dos
> ayudas ("Abrir partida por ID" y, solo en testnet, el enlace a la cuenta en el explorador), sobre (b) GraphQL de
> Mysten solo en testnet y (c) recordar las partidas propias en el navegador, porque mantiene una sola forma de leer la
> red, probada de punta a punta en localnet, y es coherente con D-20261102-04 — aprobado por el usuario
> (D-20261103-03).

**Qué implica, en llano:**

- Las tres secciones cubren solo lo que conserva el nodo y lo dicen ("desde <fecha>", DL-16).
- **Caso del creador (SUGGESTION-4):** una partida creada hace más de ~14,6 días queda fuera de "Mis partidas" para el
  creador aunque se haya resuelto **ayer**. El `GameResolved` tiene como remitente al aceptante, así que no entra en la
  actividad del creador, y su `GameCreated` está podado. Pasa lo mismo si sigue pendiente. Se abre por su ID ("Abrir
  partida por ID"), por su enlace, desde el explorador o con la CLI.
- El aceptante sí ve en "Terminadas" lo que aceptó dentro de la ventana, aunque la partida se haya creado antes: su
  `GameResolved` es propio.
- **Seguimiento:** un issue post-MVP con la medición M-7 (GraphQL con historial completo, sin OR ni filtro por campo).
  Lo redacta el MAYOR y lo crea el orquestador; no es parte de este ciclo.

## Decisiones abiertas → STOP

Ninguna.

## Decisiones de diseño (del MID, sin STOP; las revisa el MAYOR)

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| DL-1 | **Dos fuentes de datos.** (A) **Actividad**: `ListEvents` crudo descendente con la DNF `[sender = cuenta ∧ tipo = GameCreated] ∨ [sender = cuenta ∧ tipo = GameResolved]` (tipos con `originalPackageId`). Da "las que creé" y "las que acepté", filtradas por el servidor. (B) **Invitaciones**: escaneo de **todos** los `GameCreated`, como el lobby, filtrando en el cliente `opponent == cuenta` | Escanear todo y filtrar en el cliente (más pedidos para la actividad, que sí tiene filtro); `sender` ∧ tipo de módulo `<pkg>::game` (trae `GameCancelled`, que no se usa); `client.listEvents` del SDK (un solo criterio y `OUT_OF_RANGE` en testnet) | M-2/M-3: el filtro por remitente usa índice y cuesta lo mismo con o sin actividad. No existe filtro por campo, así que las invitaciones necesitan el escaneo, como prevé el issue |
| DL-2 | **Escaneo común extraído del lobby** a `sui/eventScan.ts`: el pedido crudo con cualquier `EventFilter` y el `readMask` del lobby **sin `sender`** (MINOR-1), `QueryEnd` → `hasNextPage`, último `watermark.cursor`, `OUT_OF_RANGE`/piso → `HistoryPrunedError`, cursor que no avanza → `PaginationStalledError`, y la cota (`historyLowerBound` con `HISTORY_FLOOR_MARGIN_CHECKPOINTS`). `lobby.ts` lo usa **sin cambio de comportamiento**: en `lobby.test.ts` solo cambian los imports y el identificador renombrado; ningún valor de aserción | Copiar el escaneo en `myGames.ts`; importar `lobbyLowerBound` desde la lógica de "mis partidas"; sumar `sender` al `readMask` | Segundo uso real (ARQ-7, LIM-5). Los tests del lobby son la regresión. `sender` no aporta: DL-3 verifica el contenido del evento |
| DL-3 | **Estado vigente del objeto**, como #10: los IDs salen de los eventos y el estado de `getObjects` en lote, con `parseGameObject`. Cada ítem guarda la **versión del objeto** (`objectVersion`). Se verifica el invariante del filtro: en (A), `GameCreated.creator` y `GameResolved.acceptor` tienen que ser la cuenta; si no, la fila es **ilegible** (`ReadDataError` `invariant`), nunca se muestra como propia. **Ilegibles por fuente (MINOR-4):** en (A), un evento o un objeto ilegible da una fila "Partida ilegible" en "Terminadas" (el evento es de la cuenta). En (B), un **evento** ilegible **no** da fila (no se puede saber a quién invita): se cuenta (`unreadableEvents`) y la página muestra "N eventos ilegibles en lo revisado". Un **objeto** ilegible de un evento legible con `opponent == cuenta` da una fila "Partida ilegible" en la sección 1. Un objeto inexistente se omite | Confiar en el filtro del servidor; tomar el estado del evento; mostrar en todas las cuentas los eventos ilegibles ajenos | SEG-10 y DL-2 de #10: nunca un `Pending` por defecto, y nada ajeno presentado como propio |
| DL-4 | **Tres secciones:** "Invitaciones recibidas" (pendientes, con "Aceptar" y "Rechazar"), "Tus partidas pendientes" (creadas por la cuenta, en `Pending`, con "Cancelar"; abiertas o invitaciones enviadas) y "Terminadas" (resueltas, con "Creaste"/"Aceptaste" y "Ganaste"/"Perdiste", y canceladas propias). Correspondencia con los cuatro criterios del issue: invitaciones → sección 1; creadas en cualquier estado → secciones 2 y 3; "participé como aceptante" → sección 3, con la marca "Aceptaste" (aceptar **es** resolver, D-20261030-06 (1): toda partida aceptada está resuelta); terminadas con resultado → sección 3 | Cuatro secciones literales (la de aceptadas sería un subconjunto exacto de terminadas: cada fila aparecería dos veces) | Sin filas duplicadas y sin perder ningún criterio. El MAYOR lo validó y recomienda no pedir la cuarta |
| DL-5 | **Secciones estables mientras la página está montada.** Cada partida queda **fijada** en la sección donde apareció por primera vez (`pins`, un `Map<gameId, sección>` en el estado del hook; las filas nuevas de "Cargar más" se fijan al aparecer). Tras una transacción propia la lista se relee (DL-7) y la fila **se queda** en su sección con el estado nuevo (p. ej. "Resuelta"), sin botones y con el resultado de su `TransactionStatus` (digest, montos). "Actualizar", volver a la página o cambiar de cuenta reagrupan | Reagrupar en cada relectura: la fila aceptada saltaría a "Terminadas" **antes** de `done`, porque la invalidación va antes del final, y su `GameActions` se desmontaría con el resultado (PROY-16: perder el digest). Otra alternativa era una query por fila sembrada con la lista: más pedidos y una regla de frescura entre dos cachés | Mantiene a la vista el resultado de la acción (PROY-16, SEG-10) con una regla pura y testeable (`extendPins`, `groupMyGames`). El patrón es "ajustar estado durante el render", sin `useEffect` (PROY-14). Se completa con DL-17 |
| DL-6 | **Acciones en las filas = `GameActions`** de #11/#12, con una prop `variant: 'detail' \| 'row'` (por defecto `'detail'`, el detalle no cambia). Cada fila de las secciones 1 y 2 monta su `GameActions`, que llama **una** `useTxTarget` de su partida (comentario de #12). En `'row'` no se repite el aviso "Hay una transacción en curso…" en cada fila (con N filas serían N avisos). La página lo muestra **una vez** mientras haya una transacción de la cuenta en curso, también la lanzada desde una fila: explica por qué todos los botones están deshabilitados. Tampoco va "Conecta tu wallet…", porque la página ya exige cuenta. Todo lo demás (nota de la vista previa de aceptar, saldo, resultado, adoptado, "sin confirmar" + "Ya la revisé") va igual en cada fila | Un aviso por fila; aviso solo para las transacciones ajenas a la página (exige conocer los `viewId` de todas las filas); filas que solo enlazan al detalle (el issue pide "Aceptar"/"Cancelar" en la lista) | Reutiliza la máquina sin tocar su semántica. El candado global (`busy`) ya deshabilita todas las filas |
| DL-7 | **Invalidación:** `transactionInvalidations` agrega `queryKeys.myGames(red, originalPackageId, cuenta)` (prefijo de las dos fuentes) **al final** de `invalidate` en las **cuatro** acciones, con cuenta. Sin cuenta, no se agrega. Orden resultante: crear = `[balance, myGames]`; cancelar y rechazar = `[game, balance, myGames]`; aceptar = `[game, balance, house, myGames]`. Con la página montada, las dos listas se releen antes de `done` ("Actualizando datos…"), igual que el lobby. **Costo (SUGGESTION-3):** se vuelven a pedir en serie todas las páginas cargadas, así que con muchas páginas "Actualizando datos…" y el candado global duran más (RM-12) | `resetQueries` (vuelve a la primera página y pierde "Cargar más"); no invalidar y depender del montaje | Criterio del issue ("se refresca tras cada transacción propia"). `invalidate` conserva las páginas cargadas y DL-5 conserva las secciones |
| DL-8 | **Paginación y constantes.** Actividad: **50** eventos por pedido y **1** pedido por página ("Cargar más actividad"), con la cuenta como filtro: todos los eventos son propios. Invitaciones: las constantes del lobby (**50** por pedido, hasta **2** por página, objetivo **20** candidatas, "Buscar más atrás"). Cota común: `historyLowerBound` (máx(publicación, piso + 16 000)). Objetos en lote (≤ 50 por pedido del SDK, M-6) | Traer toda la actividad de una vez; constantes nuevas para las invitaciones | SEG-7 (consultas acotadas). Las constantes del lobby ya están calibradas (P5/P7 de #10) y M-2/M-5 confirman el costo con remitente. TASK-1 confirma en localnet |
| DL-9 | **Sin cuenta no hay consultas:** la página dice "Conecta tu wallet para ver tus partidas e invitaciones" (queries con `skipToken`/`enabled: false`). El contenido se monta con `key={cuenta normalizada}`: al cambiar de cuenta se reinician `pins` y filas, y las claves de las queries ya incluyen la cuenta. **Consecuencia (MINOR-6):** en esta página, el cambio de cuenta remonta cada `GameActions`, así que la etapa por clave de DL-11 (1) no interviene aquí: al volver a A, una transacción todavía en curso se **adopta** en su fila (`mountSnapshot.pendingIds`) y muestra su resultado al terminar. Una que terminó mientras se veía B **no** muestra resultado: la partida aparece con su estado leído del nodo, en su sección natural | Filtrar en el render con la cuenta vieja; conservar `pins` entre cuentas | SEG-10: nunca mostrar partidas de la cuenta anterior como propias. La pérdida del resultado de una transacción terminada mientras se veía otra cuenta es el comportamiento de #12 para todo lo terminado antes de montar (no adoptar para no navegar dos veces) |
| DL-10 | **Navegación:** ruta `#/my-games` (como `game/:id`), enlace "Mis partidas" en el `Header` (siempre visible) y el aviso de una invitación recién creada pasa a decir "…guárdalo, o encuéntrala en «Mis partidas»" (R-7) | Sección dentro de la portada; ruta en español | La portada ya tiene formulario y lobby. El router es por hash (#9) |
| DL-11 | **MINOR-1 entra en este ciclo.** (1) **Etapa por clave:** la etapa del hook queda ligada a la clave del objetivo con que se lanzó (`{ key: targetHash, stage }`). Si la vista ahora es de otra cuenta, el hook muestra `idle` y `outcome: null` (la otra cuenta no tiene nada en curso). Al volver a la cuenta original se ve de nuevo la etapa y su resultado, leído por `runId` como hoy. (2) **Una sola captura de la cuenta (SUGGESTION-2):** `execute` captura la cuenta (el `UiWalletAccount` de `useCurrentAccount()`) y el `targetHash`, y los pone en las variables de la mutación (`TxVariables`). `run` toma de ahí la cuenta para `sender`, la preflight, `signAndExecuteTransaction({ transaction, account })` y la invalidación, e `interpret(nodeResult, signer)` recibe la dirección que firmó. Si la wallet ya no expone esa cuenta, el error llega sin digest y sale como "La wallet no completó…". **Límites (MINOR-6, SUGGESTION-5):** (a) en "Mis partidas" el cambio de cuenta remonta las filas (DL-9), así que (1) rinde en el detalle y en el formulario; (b) si después del cambio se lanza una acción desde la **misma** instancia del hook con la otra cuenta, la etapa y el `runId` pasan a ser de esa ejecución: al volver a la cuenta original, esa instancia ya no muestra el resultado anterior, aunque su "sin confirmar" sigue bloqueando el objetivo | Dejarlo para #17 (la alternativa del comentario); remontar las vistas con `key={address}`; dejar que cada `interpret` tome su `sender` del cierre de su hook | El detalle y el formulario no se remontan al cambiar de cuenta, y ahí estaba el escenario de MINOR-1. #17 es el smoke del owner en testnet, no un ciclo de desarrollo. El arreglo es local al hook y se prueba con el arnés existente (`switchAccount`, `CreateGameForm.machine.test.tsx:219`). Una sola captura hace que preflight, firma, `interpret` e invalidación usen por construcción la misma cuenta. La burner no permite reproducirlo en el smoke; se verifica con una wallet de extensión en #17 |
| DL-12 | **NIT-1 entra** (este ciclo toca la máquina): `TxOutcome`, `TxResult`, `TxPrecheckStop` y `ExecuteInput` pasan a `hooks/txSession.ts`, y también `TxAction` (desde `txInvalidation.ts`). Así `txSession.ts` no importa nada de `hooks/`, y quedan cortados los dos ciclos de tipos (`txSession` ↔ `useExecuteTransaction` y `queryKeys` → `txSession` → `txInvalidation` → `queryKeys`). Los consumidores importan desde `txSession`, sin re-exports. El tipo de la cuenta de `TxVariables` se importa **como tipo** desde la raíz de `@mysten/dapp-kit-react` (permitido en `hooks/`) | Mover solo los tres tipos del NIT (queda el ciclo con `queryKeys`) | Pedido de la revisión de #49; cero cambio de comportamiento |
| DL-13 | **Sin refresco automático de las listas** (como el lobby): se piden al montar, con "Actualizar", tras una transacción propia (DL-7) y con "Cargar más". `refetchOnWindowFocus: false` | Intervalo como el detalle (15 s) | Una relectura periódica cuesta varios pedidos por lista. El detalle de cada partida sigue refrescándose cada 15 s |
| DL-14 | **Filas de "Terminadas":** el resultado sale del **objeto** (`playerResult`: "Ganaste"/"Perdiste"), con el rol ("Creaste"/"Aceptaste"), y el pozo y el pago de `resolutionAmounts` con la etiqueta "según la fórmula del contrato", como el detalle. Una cancelada dice "Cancelada: la apuesta volvió a quien la creó" (el objeto no distingue cancelar de rechazar). Hora: la de la transacción del evento que trajo la fila (`useTransactionTime`; "—" si está podada) | Montos del `GameResolved`: el creador no lo tiene en su actividad, porque el remitente es el aceptante | Misma fuente para las dos cuentas; los textos ya existen en el detalle |
| DL-15 | **Ayudas de D-20261103-03.** Campo "Abrir partida por ID", validado con `parseObjectIdInput` (inválido ⇒ "ID de partida inválido", sin consultar) y que navega a `#/game/<id>`. En testnet, el enlace "Ver tu historial completo en el explorador" (`explorerAccountUrl` en `sui/explorer.ts`, `<base>/account/<dirección>`; `null` en localnet, y entonces no se muestra). La ruta de Suiscan respondió 200 (es una SPA: el contenido se confirma en #17) | — | R-7 más allá de la ventana del nodo, sin otra forma de leer la red |
| DL-16 | **Texto de vacío honesto por fuente (MAJOR-1).** Las secciones 2 y 3 comparten la actividad: el texto definitivo ("No tienes partidas pendientes" / "Todavía no hay partidas terminadas") solo sale con `!activity.hasNextPage && !activity.stalled && activity.nextPageError === null`. Si no, "Sin partidas pendientes en lo revisado" / "Sin partidas terminadas en lo revisado". El botón **"Cargar más actividad"** va al pie de las secciones 2 **y** 3 (mismo handler; los dos deshabilitados mientras carga y ocultos sin `hasNextPage` o con `stalled`). La sección 1 aplica la misma regla con su fuente ("No tienes invitaciones pendientes" / "Sin invitaciones pendientes en lo revisado" + "Buscar más atrás"). Con la cota en el piso, todos llevan "en el historial disponible del nodo (desde <fecha>)", como `LobbyList` | Un solo botón al pie de "Terminadas" (v1: desde la sección 2 no se veía); un texto de vacío sin condición | Precedente de `LobbyList.tsx:50-51, 81-93`: nunca "No hay…" mientras quede historial por revisar. Es el caso central de la HU (recuperar una apuesta vieja pendiente) |
| DL-17 | **Una relectura fallida no desmonta las filas (MINOR-3).** Por fuente, `useMyGames` separa la primera carga (`status`: `loading`/`retrying`/`error`/`ready`, como `deriveReadStatus`) de la relectura con datos (`refreshRetrying`: intento n de m; `refreshError`: el error). Con datos presentes, la sección dibuja **siempre** las filas, y `refreshRetrying`/`refreshError` van como nota arriba de la sección: "Reintentando… (intento n de m)" / "No se pudo actualizar la lista: <readErrorMessage>; los datos pueden estar desactualizados" con "Reintentar". `ReadState` reemplaza las filas solo sin datos | Derivar el estado como `useLobby` (`retrying`/`error` aunque haya datos ⇒ `LobbyList` cambia las filas por `ReadState`) | La relectura de DL-7 corre dentro de la `mutationFn`: si fallara y desmontara las filas, se perderían el digest y los montos (PROY-16), y al remontar ya no se adoptaría la mutación terminada. El lobby no cambia (fuera de alcance; no tiene acciones por fila) |

**Agrupación (DL-4, DL-5), regla pura en `sui/myGames.ts`:**

- **Sección natural** de una partida para la cuenta:
  - invitación a la cuenta en `Pending` ⇒ `invitations`;
  - creada por la cuenta en `Pending` ⇒ `pending`;
  - resuelta con la cuenta como creador o aceptante, o cancelada y creada por la cuenta ⇒ `finished`;
  - invitación a la cuenta ya terminada en la que la cuenta no fue el aceptante (la rechazó, o la canceló el creador)
    ⇒ ninguna.
- **Sección mostrada** = la fijada en `pins`, o si no la hay, la natural. Las nuevas se fijan al aparecer.
- **Deduplicación (MINOR-5):** una partida que llega por las dos fuentes (invitación que la cuenta aceptó: `GameCreated`
  con `opponent` = cuenta y `GameResolved` con `sender` = cuenta) es **una** fila. El `game` mostrado es el de la lectura
  con **mayor `objectVersion`** (empate ⇒ cualquiera: es el mismo objeto). El rol es `acceptor` ("Aceptaste") si alguna
  fuente lo trae, si no el de la única fuente. El evento (digest, checkpoint, hora) es el **más nuevo**.
- **Orden:** dentro de cada sección, descendente por el checkpoint del evento elegido.
- **Ilegibles (DL-3):** las de (A) van a la sección 3; las de (B) solo si el evento es legible e invita a la cuenta
  (sección 1). Los eventos ilegibles de (B) solo cuentan para la nota de la página. Nunca van a "pendientes".

## Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Capa | Nombre | Qué es |
|---|---|---|
| `sui/eventScan.ts` | `requestEvents(client, { filter, startCheckpoint, before, limit, signal })`, `requestOrPruned`, `historyLowerBound`, `HistoryLowerBound`, `HISTORY_FLOOR_MARGIN_CHECKPOINTS`, `EventScanClient` | Lo extraído de `lobby.ts` (DL-2), con el `readMask` del lobby |
| `sui/myGames.ts` | `fetchMyActivityPage(client, { originalPackageId, address, publishCheckpoint, before, signal })`, `fetchInvitationsPage(…)` (sus páginas traen `unreadableEvents: number`), `MyGameItem` (`game` + `objectVersion: bigint` + `role: 'creator' \| 'acceptor' \| 'invitee'` + digest y checkpoint del evento, o `unreadable`), `MyGamesSection`, `naturalSection`, `extendPins`, `groupMyGames`, constantes `MY_ACTIVITY_EVENTS_PER_REQUEST` (50) y `MY_ACTIVITY_MAX_REQUESTS_PER_PAGE` (1) | DL-1, DL-3, DL-4, DL-5, DL-8 |
| `sui/explorer.ts` | `explorerAccountUrl(network, address)` | DL-15 |
| `hooks/txSession.ts` | `TxVariables<T>` = `{ input, viewId, runId, action, account, targetHash }`; `ExecuteInput<T>.interpret(nodeResult, signer: string)`; más los tipos movidos de DL-12 | DL-11, DL-12 |
| `hooks/queryKeys.ts` | `myGames(red, pkg, cuenta)` = `['sui', red, 'myGames', pkg, <cuenta normalizada>]`, `myActivity` = `[...myGames, 'activity']`, `myInvitations` = `[...myGames, 'invitations']` | Prefijo para invalidar las dos (DL-7) |
| `hooks/useMyGames.ts` | `useMyGames()` → `{ kind: 'no_account' }` o `{ kind: 'ready', sections, unreadableEvents, activity, invitations, refresh }`, con `activity`/`invitations` = `{ status, refreshRetrying, refreshError, hasData, hasNextPage, isFetchingNextPage, nextPageError, stalled, lowerBound, end, loadMore, retry }` | Dos `useInfiniteQuery` con la cota de la publicación (`usePublishCheckpoint`) y `pins` (DL-5, DL-16, DL-17) |
| `hooks/useAccountTxBusy.ts` | `useAccountTxBusy()` → `boolean` (`useIsMutating` con `queryKeys.txAccount`) | El aviso único de la página (DL-6) |
| `components/` | `GameActions` con `variant`, `MyGamesSection`, `MyGameRow` | DL-6 |
| `pages/` | `MyGamesPage` (`#/my-games`) | DL-9, DL-10, DL-15 |

## Tasks (ordenados por dependencia; sin tasks de contratos)

### TASK-1: sondas en localnet aislada — área: app (verificación, sin código)

- **Entregable:** reporte con las sondas S-1..S-4 y sus resultados; sin cambios en el repo (ni fixtures).
- **Archivos afectados:** ninguno. Las sondas son scripts en el scratchpad del DEV que importan el SDK del worktree y
  hablan **solo** con `http://127.0.0.1:9000`.
- **Procedimiento:** localnet aislada de `agents.md` §3 (prefijo `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env
  2>/dev/null || true; } && smoke_guard &&` en **toda** llamada con `sui`, regla B4), con la publicación en la variante
  B y `update_fee_rate` 250. Partidas por CLI con cuentas de la génesis:
  - `A` crea 2 abiertas y 1 invitación a `B`;
  - `B` acepta una abierta;
  - `C` crea en **un solo PTB** 12 partidas abiertas (`--split-coins gas "[…×12]"` y 12 `--move-call …::game::create_game`).
- **Sondas:**
  - **S-1:** DNF de DL-1 con `sender` = `A`: exactamente los `GameCreated` de `A` (3), sin los de `C`. Con `sender` = `B`:
    su `GameResolved`. Con una dirección sin actividad: 0 eventos y `CHECKPOINT_BOUND`. Se anotan el `QueryEndReason` y
    el número de frames de cada caso.
  - **S-2:** el PTB de `C`: los 12 `GameCreated` comparten digest y tienen `event_index` 0..11. Se pagina con `limit` 5
    descendente usando `before` = último `watermark.cursor`: 5 + 5 + 2 eventos, sin repetidos ni faltantes, aunque el
    corte caiga en el medio de la transacción.
  - **S-3:** `getObjects` con los 15+ IDs en un pedido: todos `Shared`, legibles con `parseGameObject` y con `version`.
    La partida aceptada por `B` tiene una versión mayor que la que traía antes de aceptar (se lee antes y después).
  - **S-4:** el escaneo de invitaciones (`GameCreated` sin `sender`, filtro `opponent == B` en el script): la invitación
    de `A` a `B`, y nada con `opponent` = `C`.
- **Criterio de aceptación:** S-1..S-4 con el resultado esperado y su output pegado (sin claves ni rutas personales;
  las direcciones se reemplazan por los roles). Si S-1 falla (el nodo local no filtra por remitente), **STOP** al MID:
  DL-1 (A) pasa a escaneo con filtro en el cliente y el plan se revisa.
- **Riesgos / rollback:** solo lectura sobre una red desechable. Cierre del paso 7 de `agents.md` §3 con las
  verificaciones del paso de cierre del smoke (puertos libres, `kill -0` antes de `rm -rf`).

### TASK-2: capa pura de "mis partidas" — área: app (`sui/`)

- **Entregable:** `sui/eventScan.ts` (extraído de `lobby.ts`, DL-2), `sui/myGames.ts` (DL-1, DL-3, DL-4, DL-5, DL-8) y
  `explorerAccountUrl` en `sui/explorer.ts` (DL-15).
- **Archivos afectados:**
  - nuevos: `app/src/sui/eventScan.ts`, `eventScan.test.ts`, `myGames.ts`, `myGames.test.ts`;
  - se modifican:
    - `app/src/sui/lobby.ts`;
    - `lobby.test.ts`: se **mueven** a `eventScan.test.ts` los tests de lo extraído. En los de `fetchLobbyPage` solo
      cambian los imports (`:8-15`) y el identificador renombrado de la cota (p. ej. `:314`), **sin** cambiar ningún
      valor esperado; la aserción `not.toContain('sender')` de `:196` sigue igual y en verde;
    - `explorer.ts` y `explorer.test.ts` (DL-15);
    - `hooks/useLobby.ts` y `components/LobbyList.tsx`, solo si cambia el nombre del tipo de la cota.
- **Cambios (modelo: `lobby.ts` de #10):**
  - `requestEvents`: generaliza `requestCreatedEvents` (`lobby.ts:72-131`), recibe el `EventFilter` y el `limit`. El
    `readMask` es el del lobby (`lobby.ts:42`, **sin `sender`**).
  - `fetchMyActivityPage`: piso → cota → un pedido con la DNF → parsers exactos (`parseGameCreated`/`parseGameResolved`)
    con el invariante de DL-3 → objetos en lote → `MyGameItem` con `objectVersion = BigInt(object.version)`.
  - `fetchInvitationsPage`: el bucle de `fetchLobbyPage` con `opponent == cuenta` en lugar de `opponent === null`, sin
    descartar los terminados (DL-5 necesita verlos), y con los eventos ilegibles contados en `unreadableEvents` en lugar
    de filas (MINOR-4).
  - `groupMyGames`/`extendPins`/`naturalSection`: puras, con la deduplicación por `objectVersion` (MINOR-5).
    Direcciones comparadas con `sameAddress`.
- **AuthZ:** no aplica (lecturas). Las acciones siguen con `acceptState`/`canCancel`/`canReject`.
- **Criterio de aceptación:**
  - el lobby se comporta igual: `lobby.test.ts` en verde, sin cambiar ningún valor esperado;
  - las funciones nuevas son puras o reciben el cliente por parámetro (ARQ-3);
  - ninguna lista muestra como `Pending` algo que no se leyó así, ni como propio algo ajeno (SEG-10).
- **Tests esperados (Vitest, con la fixture real `game-reads.localnet.json` y frames sintéticos derivados, como
  `lobby.test.ts`):**
  - **filtro:** la DNF exacta que se envía (dos términos, `sender` normalizado, tipos con `originalPackageId`) y el
    `readMask` sin `sender`;
  - **invariantes:** un `GameCreated` con `creator` ≠ cuenta en (A) da fila ilegible; un `GameResolved` con
    `acceptor` ≠ cuenta, también;
  - **filtro en el cliente:** en (B), la invitación a otra dirección y la abierta no entran;
  - **ilegibles en (B) (MINOR-4):** un evento ilegible no da fila y suma `unreadableEvents`; un objeto ilegible de una
    invitación a la cuenta da fila ilegible;
  - **fin del historial:** `OUT_OF_RANGE` ⇒ `end: 'history_pruned'` con lo reunido; un cursor repetido ⇒
    `PaginationStalledError`; `QueryEnd` ausente ⇒ `ReadDataError`;
  - **objetos:** inexistente ⇒ se omite; ilegible ⇒ fila ilegible sin ocultar las sanas; `objectVersion` sale de
    `object.version`;
  - **cota:** `historyLowerBound` con los casos que ya tenía `lobbyLowerBound`;
  - **`groupMyGames`:**
    - cada sección natural;
    - deduplicación de la invitación aceptada: gana la lectura de mayor `objectVersion` en **los dos órdenes**
      (actividad nueva + invitaciones viejas, y al revés), con rol "Aceptaste" y el evento más nuevo;
    - una fila fijada que pasó a terminal se queda en su sección; una fila nueva se fija;
    - invitación rechazada sin fijar ⇒ fuera;
    - ilegibles por fuente; orden descendente;
  - **DL-15:** `explorerAccountUrl` en testnet y `null` en localnet; lanza con una dirección inválida.
- **Riesgos / rollback:** la extracción puede cambiar el lobby sin querer; la red de seguridad son sus tests sin cambiar
  valores esperados.

### TASK-3: máquina — cambio de cuenta (MINOR-1) y tipos (NIT-1) — área: app (`hooks/`)

- **Entregable:** DL-11 y DL-12, sin cambio de comportamiento salvo el del cambio de cuenta.
- **Archivos afectados:**
  - `app/src/hooks/useExecuteTransaction.ts` (`:31-51` tipos que salen; `:100-101` etapa y `runId`; `:117` `sender`;
    `:172` firma; `:222-243` `mutationFn`; `:256-268` `execute`), `txSession.ts`, `txInvalidation.ts` (`TxAction` sale) y
    `queryKeys.ts`;
  - hooks de acción: `useAcceptGame.ts` (`:23-30`: `interpret` con `signer`, sin su propio `sender`), `useCreateGame.ts`
    (`:28, :41-43`: ídem), `useCancelGame.ts` y `useRejectGame.ts` (solo imports y la firma nueva de `interpret`);
  - consumidores de los tipos movidos, solo en los imports: `components/GameActions.tsx`,
    `components/TransactionStatus.tsx` y sus tests (`CreateGameForm.test.tsx`, `GameActions.test.tsx`,
    `TransactionStatus.test.tsx`, `txInvalidation.test.ts`, `txSession.test.ts`, `useExecuteTransaction.test.tsx`), según
    `grep -rln "from '.*useExecuteTransaction'\|from '.*txInvalidation'" app/src` sobre `244cf76`;
  - tests: `useExecuteTransaction.test.tsx`, `txSession.test.ts`, `useAcceptGame.test.tsx`, `useCreateGame.test.tsx`,
    `GameActions.machine.test.tsx` y `CreateGameForm.machine.test.tsx`.
- **Cambios:**
  - **Captura única (SUGGESTION-2):** `execute` captura `account` (`UiWalletAccount` de `useCurrentAccount()`, o `null`)
    y `view.targetHash`, y los pasa en `TxVariables`. La `mutationFn` le pasa a `run` las variables completas. `run` usa
    `variables.account` para `sender`, la preflight, la firma y la invalidación, y llama `input.interpret(nodeResult,
    variables.account.address)`. `txVariablesOf` sigue validando solo `viewId`/`runId`/`action`.
  - **Etapa por clave:** `useState<{ key: string; stage: TxStage }>`. `run` escribe con el `targetHash` de las variables
    y el hook devuelve `stage = estado.key === view.targetHash ? estado.stage : 'idle'`. Sin `useRef` ni `useEffect`.
  - **Firma:** `dAppKit.signAndExecuteTransaction({ transaction: input.build(), account: variables.account })`.
  - **Tipos:** se mueven a `txSession.ts` según DL-12, sin re-exports.
- **Criterio de aceptación:**
  - con la cuenta A en "Confirmando…", al cambiar a B la vista muestra `idle`, sin resultado ni "en curso" de A, y B
    no queda bloqueada;
  - al volver a A con la transacción terminada (sin haber lanzado nada como B desde esa instancia), se ve su resultado.
    Si quedó "sin confirmar", el objetivo de A sigue bloqueado (como hoy);
  - **límite (SUGGESTION-5):** si como B se lanza una acción desde la **misma** instancia, al volver a A esa instancia
    no muestra el resultado de A y el "sin confirmar" de A sigue bloqueando;
  - la wallet recibe `account` = A aunque el cambio ocurra entre la preflight y la firma, e `interpret` recibe la
    dirección de A;
  - `grep -n "from './" app/src/hooks/{txSession,queryKeys,txInvalidation,useExecuteTransaction}.ts` pegado en el
    reporte, sin ningún ciclo: `txSession` no importa de `hooks/`;
  - **los 755 tests del baseline siguen en verde**. Solo cambian sus imports y, en los que llaman `interpret` o miran
    las variables o la llamada a la wallet, la firma nueva (`interpret(result, signer)`, `account` en
    `signAndExecuteTransaction`). Ningún resultado esperado cambia.
- **Tests esperados:**
  - con el arnés de #12 (`switchAccount`):
    - cambio de cuenta durante `confirming`: etapa `idle` para B y resultado de A al volver;
    - durante `signing`: la wallet mock recibe `account` = A e `interpret` recibe A;
    - "sin confirmar" de A, que no bloquea a B y sí a A al volver;
    - el caso de SUGGESTION-5 (B lanza desde la misma instancia);
  - la regresión completa de `GameActions.machine` y `CreateGameForm.machine`;
  - test de que el `outcome` de un hook nunca es `unconfirmed` (ya existe; sigue verde).
- **Riesgos / rollback:**
  - una wallet de extensión rechaza `account` si ya no expone la cuenta: el error llega sin digest y sale como "La
    wallet no completó…"; se verifica en #17 (RM-9);
  - rollback: revertir el task; no afecta las listas.

### TASK-4: hooks de "mis partidas" — área: app (`hooks/`)

- **Entregable:** `queryKeys.myGames`/`myActivity`/`myInvitations`, las filas de `transactionInvalidations` (DL-7),
  `useMyGames` (con DL-16 y DL-17) y `useAccountTxBusy`.
- **Archivos afectados:**
  - se modifican:
    - `app/src/hooks/queryKeys.ts`;
    - `txInvalidation.ts` y `txInvalidation.test.ts`;
    - `useExecuteTransaction.test.tsx` (MINOR-2): los `toEqual` sobre las claves invalidadas (`:206-207, 316-317,
      367-368, 376-377, 390, 399-400, 426-427, 448-450, 468-469` a `244cf76`; las líneas pueden correrse con TASK-3)
      pasan a esperar la lista nueva, con `queryKeys.myGames(...)` **al final** cuando hay cuenta. Este cambio de
      aserciones es **a propósito** y se declara en el reporte;
  - nuevos: `useMyGames.ts`, `useMyGames.test.tsx` y `useAccountTxBusy.ts` (se prueba en `useMyGames.test.tsx` o en un
    test propio).
- **Cambios (modelo: `useLobby.ts`):**
  - dos `useInfiniteQuery` (actividad e invitaciones) con `enabled: publish.isSuccess && address !== null`,
    `refetchOnWindowFocus: false` y `getNextPageParam` por `endCursor`. Mientras la publicación no terminó, manda su
    estado, como `useLobby`;
  - **estado por fuente (DL-17):** `hasData = query.data !== undefined`. Sin datos, `status` = `deriveReadStatus`. Con
    datos, `status` = `ready`, y la relectura se informa aparte: `refreshRetrying` (`fetchStatus === 'fetching'` con
    `failureCount > 0`, sin ser "cargar más") y `refreshError` (`isRefetchError`). `retry` relee esa fuente;
  - `pins` en `useState`, extendidos durante el render con `extendPins` cuando llegan IDs nuevos (sin bucle: después de
    extender no quedan nuevos);
  - `refresh` vacía `pins`, reinicia las dos queries (`resetQueries` del prefijo) y relee la publicación si falló;
  - `sections` = `groupMyGames(...)`; `unreadableEvents` = suma de las páginas de invitaciones cargadas.
- **Criterio de aceptación:**
  - sin cuenta, ninguna consulta (spy del cliente en 0);
  - con cuenta, dos fuentes independientes: el error de una no tapa las filas de la otra;
  - tras invalidar con una fila fijada, la fila se queda en su sección con el estado nuevo;
  - una relectura fallida o reintentando **con** datos deja `status: ready`, las filas y `refreshError`/`refreshRetrying`
    (DL-17);
  - `refresh` reagrupa;
  - las invalidaciones de las cuatro acciones terminan con el prefijo `myGames` de la cuenta, y sin cuenta no lo
    tienen;
  - el resto de la suite en verde, con las aserciones de `useExecuteTransaction.test.tsx` cambiadas solo en la clave
    nueva.
- **Tests esperados:**
  - `txInvalidation` con las filas nuevas y el orden de DL-7;
  - `useMyGames` con `QueryClient` real y cliente mock:
    - estados de primera carga de cada fuente (`loading`, `retrying`, `error`, `ready`);
    - relectura con datos que reintenta y que falla (DL-17);
    - "Cargar más" de cada fuente por separado;
    - `PaginationStalledError` y `history_pruned`;
    - fijado y reagrupado;
    - cambio de cuenta (claves distintas, filas de la cuenta nueva);
    - no hay re-render infinito con `extendPins` (contar renders);
  - `useAccountTxBusy` con una mutación de la cuenta en curso y otra de otra cuenta.
- **Riesgos / rollback:** el `setState` durante el render mal acotado provoca un bucle; lo cubre el test de renders.

### TASK-5: página "Mis partidas" — área: app (`components/`, `pages/`)

- **Entregable:** `MyGamesPage` en `#/my-games`, enlace en el `Header`, secciones y filas, `GameActions` con
  `variant`, el aviso único de la página, los textos de vacío e historial (DL-16), las notas de relectura (DL-17), la
  nota de eventos ilegibles y las ayudas de DL-15. También el texto R-7 en `GameDetailPage`.
- **Archivos afectados:**
  - nuevos: `app/src/pages/MyGamesPage.tsx` + test, `components/MyGamesSection.tsx` + test (con `MyGameRow` adentro o
    en su propio archivo);
  - se modifican: `App.tsx` (ruta), `components/Header.tsx` + test (enlace), `components/GameActions.tsx` + tests
    (`variant`), `pages/GameDetailPage.tsx` + test (texto del aviso) y `App.test.tsx` (ruta).
- **Cambios:**
  - **sin cuenta:** "Conecta tu wallet para ver tus partidas e invitaciones";
  - **con cuenta:** `<MyGamesView key={cuenta} />`, con:
    - "Actualizar";
    - el aviso `IN_FLIGHT_TEXT` una vez si `useAccountTxBusy()`;
    - "Abrir partida por ID" y, si `explorerAccountUrl` no es `null`, "Ver tu historial completo en el explorador"
      (DL-15);
    - "N eventos ilegibles en lo revisado" si `unreadableEvents > 0` (MINOR-4);
    - tres secciones. Cada una muestra:
      - sin datos de su fuente, su `ReadState`;
      - con datos, las filas **siempre**, más la nota de relectura si la hay (DL-17). Cada fila lleva rol, contraparte,
        apuesta, estado o resultado, hora y "Ver partida"; en las secciones 1 y 2, además,
        `<GameActions game={…} variant="row" />`;
      - su texto de vacío según DL-16 (definitivo o "en lo revisado", con "desde <fecha>" si la cota es el piso);
      - su control de paginación: "Buscar más atrás" en la sección 1 y **"Cargar más actividad" en las secciones 2 y
        3** (DL-16);
  - **`GameActions` en `variant='row'`:** sin el `<p role="status">{IN_FLIGHT_TEXT}</p>` de `:143` ni el "Conecta tu
    wallet…" de `:113-115`; todo lo demás igual. En `'detail'`, nada cambia;
  - **R-7:** "Comparte el enlace de esta página con el invitado; guárdalo, o encuéntrala en «Mis partidas»".
- **Criterio de aceptación:**
  - un componente sin lógica de negocio (ARQ-2): grupos y textos de estado salen de `sui/`/`hooks/`;
  - ningún `@mysten/*` fuera de `/ui` (regla de capas);
  - el detalle no cambia (sus tests siguen verdes salvo el texto R-7);
  - con N filas, el aviso "en curso" aparece **una** vez;
  - una fila aceptada se queda en "Invitaciones recibidas" con "Resuelta" y el resultado hasta "Actualizar";
  - ninguna sección dice "No tienes…" mientras su fuente tenga `hasNextPage` (DL-16);
  - una relectura fallida no desmonta filas ni resultados (DL-17).
- **Tests esperados (componentes con la máquina real y el cliente mock, como `GameActions.machine.test.tsx`):**
  - **lista y acciones:** secciones y textos de vacío, también con la cota en el piso; aceptar desde una fila (etapas,
    resultado con el `GameResolved` de la fixture, la fila no se mueve, sin tokens de resultado antes de la
    confirmación: SEG-10); cancelar y rechazar desde una fila;
  - **vacío honesto (MAJOR-1):** sección 2 vacía con `activity.hasNextPage` ⇒ "Sin partidas pendientes en lo revisado"
    y "Cargar más actividad" visible en la sección 2; lo mismo en la sección 3; sin `hasNextPage` ⇒ texto definitivo y
    sin botón; con `stalled` o `nextPageError` ⇒ ni texto definitivo ni botón;
  - **relectura fallida (MINOR-3):** aceptar desde una fila con la relectura de DL-7 fallando (y otra vez reintentando):
    la fila, su `GameActions` y el `TransactionStatus` con digest siguen montados y aparece la nota;
  - **ilegibles (MINOR-4):** la nota de la página con un evento ilegible en las invitaciones y ninguna fila por él;
  - **candado:** dos filas con un clic en el mismo tick ⇒ una sola ejecución; durante la transacción, todas las filas
    deshabilitadas y el aviso una vez;
  - **"sin confirmar":** en una fila, que bloquea solo esa fila, con "Ya la revisé";
  - **cambio de cuenta en la página (MINOR-6):** A en curso → B (la página remonta y no muestra filas ni resultado de A)
    → A todavía en curso ⇒ al terminar, el resultado adoptado aparece en la fila. A en curso → B → A ya terminada ⇒ sin
    resultado y la partida con su estado leído del nodo, en su sección natural;
  - **navegación:** `variant='detail'` sin cambios; la ruta `#/my-games` y el enlace del `Header`;
  - **DL-15:** ID inválido sin consulta, navegación con un ID válido, y el enlace del explorador solo en testnet.
- **Riesgos / rollback:** muchas filas, cada una con tres `useMutation` y una `useTxTarget` (RM-5); se mide en el paso
  9 del smoke.

### TASK-6: docs del ciclo — área: docs

- **Entregable:**
  - **`app/README.md`:**
    - sección "Mis partidas (#13)": fuentes (DL-1), filtro por remitente, escaneo de invitaciones, estado del objeto,
      secciones, fijado y deduplicación por versión del objeto, textos de vacío honestos, relectura sin desmontar filas,
      paginación, invalidación (con su costo y el corrimiento de la ventana, RM-12), aviso único, ilegibles y las ayudas
      de D-20261103-03;
    - **el límite de esta estrategia sin indexador** (criterio del issue): ventana del nodo, **el caso del creador**
      (una partida creada hace más de ~14,6 días no aparece aunque se haya resuelto después, SUGGESTION-4), costo del
      escaneo de invitaciones según el volumen del paquete, sin filtro por campo, y la referencia a D-20261103-03 y al
      seguimiento post-MVP;
    - el mapa de `sui/` (`eventScan.ts`, `myGames.ts`, `explorerAccountUrl`) y la tabla de hooks (`useMyGames`,
      `useAccountTxBusy`, claves nuevas);
    - en "Transacciones (#11, #12)": la etapa por clave, la captura única de la cuenta (variables, firma con `account`,
      `interpret(result, signer)`), sus límites (DL-11) y la fila nueva de la tabla de invalidación;
  - **`contracts/README.md`,** "Lectura desde la app": las listas de "mis partidas" (DNF con `sender`, M-2/M-3) y el
    resultado de S-1/S-2;
  - **`agents.md` §4** ("Indexado"), si hace falta precisar;
  - **snippet para `documents/STATUS.md`.** `documents/DECISIONES.md` ya tiene D-20261103-03: no se toca.
- **Archivos afectados:** `app/README.md`, `contracts/README.md` y, si aplica, `agents.md`.
- **Criterio de aceptación:** docs coherentes con el código (PROY-20), sin rutas personales ni hex largos.

## Tests (resumen)

- **`sui/`:** `eventScan` (lo movido más el `EventFilter` genérico), `myGames` (fuentes, invariantes, ilegibles,
  agrupación, deduplicación por versión y fijado) y `explorer` (DL-15). Los de `lobby` pasan sin cambiar ningún valor
  esperado de `fetchLobbyPage`.
- **`hooks/`:** `useExecuteTransaction` (cambio de cuenta, captura única y firma con `account`), `txSession`,
  `useAcceptGame`/`useCreateGame` (`interpret` con `signer`), `txInvalidation`, `useMyGames` y `useAccountTxBusy`.
  Regresión completa de la máquina. Las aserciones de claves invalidadas cambian en TASK-4, a propósito.
- **`components/`/`pages/`:** `MyGamesPage`/`MyGamesSection` con la máquina real (vacío honesto, relectura fallida,
  ilegibles, cambio de cuenta), `GameActions` (`variant`), `Header`, `GameDetailPage` (texto R-7) y `App` (ruta).
- **Gates:** los de `agents.md` §3 (job `app`), con output pegado en cada reporte. Move y scripts sin cambios: el job
  `contracts` corre igual en la CI.

## Smoke (después de TASK-6; el MID genera `documents/SMOKE_MY_GAMES.md`, AGENTE_MID §M5)

**Precondiciones:**

- **Red:** localnet **aislada** (`agents.md` §3: génesis, red en segundo plano del harness con `sui.pid`, publicación
  variante B, `update_fee_rate` 250 por `ADMIN`). Toda llamada con `sui` lleva el prefijo `PRE` (B4).
- **App:** `vite` dev **en segundo plano del harness** con su PID: `. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ >
  "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort >
  "$SMOKE_DIR/vite.log" 2>&1`, con el Node 26 del prefijo, como en el smoke de #12.
- **Navegador:** Chrome headless propio con CDP, en segundo plano con `chrome.pid`:
  - perfil desechable `--user-data-dir=<SMOKE_DIR>/chrome-profile`, con `HOME`/`XDG_*` en `<SMOKE_DIR>/chrome-home`,
    `--remote-debugging-address=127.0.0.1` y el puerto 9229;
  - en la máquina corre el Chrome del usuario: el smoke solo mata **su** PID (`chrome.pid`), nunca `pkill`/`killall`;
  - cada pestaña se abre con `Target.createTarget({ url, newWindow: true })`, todas visibles
    (`document.visibilityState === 'visible'`), sin `Page.bringToFront`;
  - los pedidos gRPC (`ListEvents`, `SimulateTransaction`, `ExecuteTransaction`) se cuentan con los eventos `Network`
    de CDP (`Network.enable` en cada sesión).
- **Cuentas:**
  - burners `AW` (pestaña 1) y `BW` (pestaña 2), fondeadas con 2 SUI cada una desde las cuentas de la génesis por CLI
    (`app/README.md`, "Wallet"); después se navega por hash, sin recargar;
  - `C` es una cuenta de la génesis que usa solo la CLI;
  - las direcciones van en `<SMOKE_DIR>/ids.env` y en el documento solo por rol.

| # | Acción | Resultado esperado |
|---|---|---|
| 0 | Preparación (§3 paso 2) + `app.env` + `chrome.env`. Línea base: `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | Línea base anotada; sin `localnet.json`, `Published.toml` ni `Pub.*.toml` (si existe alguno, se detiene y se avisa); 6 puertos libres; árbol limpio (salvo el documento del smoke) |
| 1 | Génesis, red, publicación (variante B), `update_fee_rate` 250; `PRE suic chain-identifier` | Red arriba; `localnet.json` escrito; comisión 250 |
| 2 | `vite` y Chrome en segundo plano (`vite.pid`, `chrome.pid`); `curl -sf http://127.0.0.1:5173/` y `curl -sf http://127.0.0.1:9229/json/version`; pestaña sin conectar (`newWindow`) en `#/my-games` | 200 con `<div id="root">`; CDP solo en 127.0.0.1; "Conecta tu wallet para ver tus partidas e invitaciones"; **0** `ListEvents` |
| 3 | Pestañas `AW` y `BW` (`newWindow`), conexión de las burners y fondeo | Encabezados con las dos direcciones; saldo 2 SUI; las pestañas visibles |
| 4 | `AW` crea una abierta (0,1 SUI) y una invitación a `BW` (0,2 SUI) desde el formulario | Navega al detalle; el aviso de la invitación menciona "Mis partidas" (R-7) |
| 5 | `AW` → "Mis partidas" (enlace del encabezado) | "Tus partidas pendientes" = 2 filas (abierta e "invitación a `BW`"), cada una con "Cancelar"; las otras dos secciones con el texto de vacío **definitivo** (sin "Cargar más actividad": hay < 50 eventos); "Abrir partida por ID" visible y sin enlace al explorador (localnet) |
| 6 | `BW` → "Mis partidas" | "Invitaciones recibidas" = 1 fila (de `AW`, 0,2 SUI) con "Aceptar", "Rechazar" y la nota de la vista previa; la abierta de `AW` no está en sus listas (sí en el lobby, sin cambios de comportamiento) |
| 7 | CLI: `C` crea una invitación a `AW` (0,05 SUI). "Actualizar" en las dos pestañas | `AW` la ve en "Invitaciones recibidas" (creada fuera de la app); `BW`, no |
| 8 | `BW` pulsa "Aceptar" en la fila (muestreo cada 250 ms) | Etapas neutras; **1** `ExecuteTransaction`; resultado "¡Ganaste!/Perdiste…" con digest, coherente con el `GameResolved` de `PRE suic tx-block <digest>`; la fila **se queda** en "Invitaciones recibidas" como "Resuelta", sin botones; ningún token de resultado antes de la confirmación |
| 9 | (RM-5, SUGGESTION-1) CLI: `C` crea en **un PTB** 25 invitaciones a `AW` (0,001 SUI cada una). `AW` pulsa "Actualizar"; se mide el tiempo hasta ver las filas y, en una de ellas, desde el clic en "Aceptar" hasta "Verificando la transacción…" | Las invitaciones de la primera página (≥ 20) con `GameActions` cada una; los tiempos medidos se anotan (referencia, sin umbral bloqueante); la aceptación de una fila termina como en el paso 8 y deja las demás habilitadas al final |
| 10 | `BW` pulsa "Actualizar" | La partida pasa a "Terminadas" con "Aceptaste · Ganaste/Perdiste" (lo mismo que en el paso 8); "Invitaciones recibidas" queda vacía |
| 11 | `AW` pulsa "Actualizar" | "Terminadas" muestra la partida de `BW` con "Creaste" y el resultado **complementario** (y la del paso 9 con "Aceptaste"); "Tus partidas pendientes" = solo la abierta |
| 12 | `AW` pulsa "Cancelar" en la abierta | Reembolso del `GameCancelled`; la fila queda "Cancelada" en su sección; tras "Actualizar", en "Terminadas" |
| 13 | `AW` pulsa "Rechazar" en la invitación de `C` del paso 7 | "Invitación rechazada…"; tras "Actualizar" desaparece; `C` recupera su apuesta (saldo por CLI) |
| 14 | CLI: `C` crea 2 invitaciones a `BW`. `BW` pulsa "Actualizar" y hace `click()` en "Aceptar" de la fila 1 y de la fila 2 en el mismo tick | **1** `ExecuteTransaction`; la fila 2 deshabilitada durante la transacción; el texto "Hay una transacción en curso desde esta cuenta…" aparece **1** vez en la página; la fila 2 se puede aceptar después |
| 15 | CLI: `C` crea 1 invitación a `BW` y después, en PTB, ≥ 101 partidas abiertas. `BW` pulsa "Actualizar" | Primera página de invitaciones sin esa invitación ("Sin invitaciones pendientes en lo revisado" + "Buscar más atrás", nunca "No tienes invitaciones pendientes"); al pulsarlo, aparece (paginación acotada, DL-8, DL-16) |
| 16 | `AW`: "Abrir partida por ID" con un ID inválido y con el de la partida cancelada | Inválido ⇒ "ID de partida inválido", sin pedido; válido ⇒ navega a `#/game/<id>` |
| 17 | Recargar la pestaña `BW`: burner nueva, otra cuenta | "Mis partidas" vacía para la cuenta nueva; no muestra filas de la anterior (DL-9) |
| 18 | Cierre = §3 paso 7 de `agents.md` más la app: `kill` por PID de Chrome (`chrome.pid`), `vite` (`vite.pid`; exit 143 esperado) y `sui` (`sui.pid`; exit 144 esperado); **en otra llamada**, `kill -0` falla en los tres; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (el Chrome del usuario no se toca); `ss -ltn` con 9000, 9123, 9184, 5003, 5173 y 9229 libres; recién entonces `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_MY_GAMES.md` | Todo limpio; `~/.sui/` sin cambios |

Lo que el smoke **no** cubre:

- **Solo con tests (TASK-5):**
  - el texto de vacío "en lo revisado" de las secciones 2 y 3 con más de 50 eventos propios (MAJOR-1): la burner no
    puede generarlos por CLI;
  - la relectura fallida (MINOR-3);
  - el cambio de cuenta **sin** recargar (DL-9, DL-11): la burner no lo permite.
- **Va a #17 (owner en testnet):**
  - una wallet de extensión real con cambio de cuenta (DL-11, RM-9);
  - las listas con historial podado ("desde <fecha>") y el caso del creador de D-20261103-03;
  - el contenido del enlace al explorador.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| RM-1 | El nodo local (`sui-node` 1.83.0) no filtra por remitente como el de testnet (1.83.1) | TASK-1 S-1 antes de escribir código; si falla, STOP y DL-1 (A) pasa a escaneo |
| RM-2 | El escaneo de invitaciones crece con el volumen del paquete: muchas partidas ajenas ⇒ varios "Buscar más atrás" para encontrar una invitación | Acotado (DL-8) y honesto ("en lo revisado", DL-16); el issue lo da por suficiente para el MVP; seguimiento post-MVP (D-20261103-03) |
| RM-3 | Ventana de ~14,6 días en testnet, incluido el caso del creador (una partida vieja resuelta después no aparece en su "Terminadas") | D-20261103-03: texto honesto, "Abrir partida por ID" y enlace al explorador; documentado en `app/README.md` |
| RM-4 | Cursor en medio de una transacción con varios eventos | TASK-1 S-2 y test de paginación |
| RM-5 | Muchas filas, cada una con su `useTxTarget` y tres hooks de acción | Páginas acotadas; `useMutationState` filtra por cuenta; se mide en el paso 9 del smoke (25 invitaciones con `GameActions`) |
| RM-6 | DL-5 puede confundir: una partida resuelta sigue un rato en "Invitaciones recibidas" | La fila dice su estado ("Resuelta", resultado) y no tiene botones; "Actualizar" reagrupa |
| RM-7 | El candado sigue siendo por pestaña (R-5 de #12) | Sin cambios; documentado |
| RM-8 | El cambio de cuenta no se puede reproducir con la burner | Tests de TASK-3 y TASK-5; #17 con wallet de extensión |
| RM-9 | Una wallet de extensión rechaza `account` cuando ya no expone esa cuenta | El rechazo llega antes de abrir la wallet, sin digest: "La wallet no completó…" (sin riesgo de SEG-10 ni de doble envío); se verifica en #17 |
| RM-10 | El bundle crece (~887 kB hoy) | Informativo; code-splitting en #15 |
| RM-11 | La extracción de DL-2 cambia el lobby sin querer | Los tests de `fetchLobbyPage` sin cambiar valores esperados; paso 6 del smoke (lobby) |
| RM-12 | (SUGGESTION-3) `invalidate` relee en serie todas las páginas cargadas: "Actualizando datos…" y el candado duran más en proporción. La ventana de invitaciones se corre si entraron `GameCreated` nuevos: una fila con resultado al final de la última página puede salirse | Documentado en `app/README.md`; páginas acotadas y volumen del MVP. Se recupera con "Buscar más atrás". No se guarda el ítem en `pins` (mostraría un estado sin reconciliar) |
| RM-13 | (DL-17) Con una relectura fallida, una fila puede mostrar un estado viejo (p. ej. "Rechazar" otra vez tras rechazar, si solo la tenía la fuente de invitaciones) | La nota "los datos pueden estar desactualizados" con "Reintentar"; la preflight frena una segunda acción (`game`/4) e invalida otra vez; el `TransactionStatus` de la fila sigue mostrando el resultado real |

## Archivos que NO se tocan

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `contracts/fixtures/`,
`contracts/deployments/`, `package.json`, `app/package.json`, `package-lock.json`, `.npmrc`, `.github/`,
`app/eslint.config.js`, `app/scripts/`, `documents/DECISIONES.md` (D-20261103-03 ya registrada). Sin dependencias
nuevas (SEG-8): todo sale del SDK instalado. El worktree de #8 no se toca.

## Al aprobar

1. El MAYOR revisa la v2 (cierre de MAJOR-1 y MINOR-1..7).
2. El MID genera `documents/HANDOFF_MY_GAMES.md`, con el baseline de gates verificado ese día en su §0 (último
   registrado: app 755 tests en 52 archivos y build de 887 kB en `fabb0ec`, sin cambios de app hasta `244cf76`).
