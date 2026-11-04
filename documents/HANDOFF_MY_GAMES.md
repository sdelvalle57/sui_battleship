# HANDOFF_MY_GAMES
> Plan: PLAN_MY_GAMES v2 (MAYOR: APPROVE en la segunda ronda, 2026-11-03; `ae2b134`) | Issue: #13 | Branch:
> `feature/issue-13-my-games` | Versión: v1.1 | Fecha: 2026-11-03

## Changelog

- **v1.1 (2026-11-03)**: revisión del MAYOR del handoff v1 (APPROVE con 2 MINOR y 4 SUGGESTION). TASK-1..3 no cambian
  (el DEV puede seguir con la v1 en esos tasks), salvo el grep de cierre de TASK-3 (SUGGESTION-3). Cambian T2-13,
  TASK-4 y el smoke.

| Hallazgo de la revisión del handoff v1 | Cambio en v1.1 |
|---|---|
| **MINOR-1** (`extendPins` recibía los ítems crudos de las dos fuentes, no los deduplicados) | TASK-4 §3.3: `const merged = mergeMyGames(activityItems, invitationItems)` y `extendPins(pins, merged, address)`. `groupMyGames` recibe esas mismas listas y deduplica con la misma `mergeMyGames` (H-2), así que el pin sale siempre de la lectura ganadora. El estado usa un inicializador perezoso: `useState<MyGamesPins>(() => new Map())`. §4: `extendPins` espera ítems ya deduplicados. T2-13 y T4-8 suman el caso "dos lecturas distintas de G en el mismo render ⇒ el pin sale de la ganadora de H-2" |
| **MINOR-2** (paso 17: con > 100 `GameCreated` la sección 1 no puede dar el texto definitivo) | Paso 17: secciones 2 y 3 con el texto definitivo (la DNF de una cuenta sin actividad termina en `CHECKPOINT_BOUND`). La sección 1 muestra "Sin invitaciones pendientes en lo revisado" y "Buscar más atrás"; tras pulsarlo **una** vez, "No tienes invitaciones pendientes". Ninguna fila. Cubre H-1 de punta a punta |
| SUGGESTION-1 (conteo de `ListEvents` por fuente en el paso 15) | **Aplicada.** CDP no distingue la fuente sin decodificar el cuerpo, así que el paso 15 espera el **total**: tras "Actualizar", **3** `ListEvents` (2 de invitaciones + 1 de actividad); tras "Buscar más atrás", **+1 o +2** |
| SUGGESTION-2 (línea literal de arranque de Chrome) | **Aplicada.** Las precondiciones y el paso 2 llevan la línea de #12, en segundo plano del harness con `exec` y `chrome.pid`: el cierre mata exactamente el proceso propio y nunca el Chrome del usuario |
| SUGGESTION-3 (el grep de TASK-3 no verificaba los tipos movidos) | **Aplicada.** El criterio de TASK-3 pasa a un grep que tiene que dar **vacío** (§7 de TASK-3). Si el DEV ya reportó TASK-3 con el grep viejo, pega el nuevo en el reporte de TASK-4 |
| SUGGESTION-4 (`PRE` explícito en las filas del smoke) | **Aplicada.** Los pasos 8, 9 y 12-15 escriben `PRE` delante de cada `suic`, como los pasos 1 y 7, para que B4 se lea sin interpretar |

- **v1 (2026-11-03)**: primera versión. Integra D-20261103-03 (P-1 = (a)) y la segunda revisión del MAYOR del plan
  (APPROVE con 1 MINOR y 3 SUGGESTION, sin v3 del plan):

| Hallazgo de la revisión del plan v2 | Dónde queda resuelto en este handoff |
|---|---|
| **MINOR-N1** (DL-16 y el test de TASK-5 se contradecían con un error de "cargar más") | §1 H-1 y T5-6. Con `nextPageError` **sin** `stalled`, no se muestra el texto de vacío definitivo, pero **sí** el botón de paginación (sirve de reintento) y el `role="alert"` con `readErrorMessage`. Solo `stalled` oculta el botón (y deja el alert). Mismo precedente que `LobbyList.tsx:100-110` |
| SUGGESTION-N1 (ilegible contra legible del mismo `gameId`) | **Aplicada** (§1 H-2, T2-14). En la deduplicación gana el ítem **legible**; entre dos legibles, la mayor `objectVersion`; entre dos ilegibles, el evento más nuevo. Es más simple que comparar versiones de un objeto ilegible, y nunca cambia un dato sano por uno que la app no reconoce (SEG-10) |
| SUGGESTION-N2 (ocultar la acción si la fila ya tiene un `success` propio) | **Aplicada, solo en `variant='row'`** (§1 H-3, T5-10). Si en la fila hay un `success` propio (aceptar, cancelar o rechazar) o uno adoptado, los botones de acción no se muestran aunque el objeto leído siga viejo. Las tres acciones dejan la partida terminal, así que ya no hay nada que ofrecer. Atenúa RM-13 sin tocar el detalle, que se reconcilia con su intervalo de 15 s |
| SUGGESTION-N3 (etapa durante los reintentos de la relectura) | **Aplicada como documentación** (§1 H-4, RM-12, TASK-6). Con DL-17, si la relectura de DL-7 reintenta, "Actualizando datos…" y el candado global duran hasta que terminan los reintentos de la política común: hasta 3 intentos con corte de 10 s por pedido y esperas de 1 s y 2 s, por cada pedido de las páginas cargadas. `invalidateQueries` no lanza (`throwOnError` por defecto en `false`): `done` llega igual |

Documento autocontenido para el DEV: TASK-1..6 y el smoke del ciclo. Se ejecuta **un task por sesión**, en orden. Cada
task termina con el reporte de `documents/FLUJO_AGENTES.md` §5 y espera la revisión del MID antes del siguiente. El DEV
**no** commitea ni pushea: lo hace el orquestador.

## Historia de usuario del ciclo

**Como** jugador con la wallet conectada, **quiero** una página "Mis partidas" con las invitaciones que me hicieron y
siguen abiertas, las partidas que creé y siguen pendientes, y las que terminaron (con si gané o perdí), cada una con
el botón que corresponda ("Aceptar" o "Rechazar" una invitación, "Cancelar" una propia), **para** no depender de que
alguien me pase el enlace de una invitación y poder recuperar mi apuesta de una partida que nadie aceptó sin usar la
CLI.

**Scope en una frase:** página `#/my-games`, enlazada desde el encabezado, con tres secciones derivadas de los eventos
del paquete y del estado vigente de cada objeto, acciones en cada fila con la máquina de transacciones de #11 y #12,
paginación acotada, textos honestos sobre el historial que cubre el nodo, y dos ayudas para las partidas más viejas
("Abrir partida por ID" y el enlace al explorador en testnet). Además: el cambio de cuenta a mitad de una transacción
(MINOR-1 de #12) y el corte de los ciclos de imports de tipos de `hooks/` (NIT-1).

**Lo que NO entrega:** indexador o backend propio, estadísticas o ranking, notificaciones, historial más largo que el
del fullnode público en testnet (D-20261103-03), candado entre pestañas (R-5 de #12), cambios del contrato,
persistencia en el navegador, cambios de comportamiento del lobby.

## 0. Baseline de gates verificado (2026-11-03, `master` `244cf76`)

Base de la branch: `244cf76` (`master`: merge de #12, `31100ab`, más el housekeeping `0995049`, solo docs). Encima, la
branch suma solo docs: el plan v2 y D-20261103-03 (`ae2b134`) y este handoff. Verificado con `git diff --stat
fabb0ec..ae2b134 -- app/ contracts/ package.json package-lock.json .npmrc .github`: solo cambian `app/README.md` y
`contracts/README.md`. El código de `app/` y `contracts/` es el mismo que midió TASK-4 de #12 (`fabb0ec`), y la CI de
`master` en `244cf76` está en verde (run 41765697015: `contracts`, `app` y `framework-drift`). Valores de
`documents/STATUS.md`:

| Área | Gate | Baseline |
|---|---|---|
| Toolchain | `printf 'n\n' \| sui --version` / `node --version` / `npm --version` | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` / `11.20.0` |
| App | `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high` | exit 0; 293 paquetes; 292 firmas verificadas; 0 vulnerabilidades de producción (11 *moderate* solo dev, aceptadas hasta #35) |
| App | `npm run lint -w app` / `npm run typecheck -w app` | 0 problemas (sin `eslint-disable`) / 0 errores |
| App | `npm test -w app` | **755 tests PASS en 52 archivos** |
| App | `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-*.js` **887.10 kB** (270.12 kB gzip), con el aviso informativo de chunk > 500 kB (#15) |
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

# Contracts, desde <repo>/contracts (solo TASK-1, como verificación del baseline; el ciclo no toca contracts/
# salvo contracts/README.md en TASK-6)
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
último reporte aprobado; además, en cada task, `git diff --exit-code -- contracts/` (en TASK-6, solo con
`contracts/README.md` en el diff).

## 1. Decisiones (no reabrir)

**Del owner (registradas):**

| Decisión | Qué fija para este ciclo |
|---|---|
| **D-20261103-03** | Las listas leen solo la ventana del fullnode público (~14,6 días), con texto honesto, más "Abrir partida por ID" y, solo en testnet, "Ver tu historial completo en el explorador". El seguimiento con GraphQL (M-7 del plan) es post-MVP, no de este ciclo |
| D-20261102-04 (1) | Mismo trato del historial en el lobby; el lobby no cambia |
| D-20261102-02 (1), (3), (5), (6) | Lecturas por `SuiGrpcClient`; sin dependencias nuevas; burner solo en localnet + `npm run dev`; sin explorador en localnet (Suiscan en testnet) |
| D-20261102-03 | Ningún agente usa claves del owner ni corre nada con claves contra testnet; `~/.sui/` sin claves |
| D-20261102-05, D-20261103-02 | "Rechazar" para el invitado; una invitación ajena muestra el aviso sin "Aceptar" (no aplica en las listas: una cuenta solo ve sus invitaciones) |
| D-20261030-06 (1) | Aceptar = resolver: toda partida aceptada está resuelta (base de DL-4) |

**Del plan v2 (MID, aprobadas por el MAYOR):** DL-1 … DL-17 de `documents/PLAN_MY_GAMES.md`. Resumen operativo:

| # | Resumen |
|---|---|
| DL-1 | (A) **Actividad**: `ListEvents` crudo descendente con la DNF `[sender = cuenta ∧ tipo = GameCreated] ∨ [sender = cuenta ∧ tipo = GameResolved]`. (B) **Invitaciones**: escaneo de todos los `GameCreated` con filtro en el cliente `opponent == cuenta`. Tipos con `originalPackageId` |
| DL-2 | El escaneo genérico se extrae de `lobby.ts` a `sui/eventScan.ts` con el `readMask` del lobby (**sin `sender`**); el lobby no cambia de comportamiento |
| DL-3 | Estado del objeto por `getObjects`; `objectVersion` por ítem; invariante `creator`/`acceptor` = cuenta en (A) o fila ilegible; ilegibles por fuente (en (B), un evento ilegible solo se cuenta) |
| DL-4 | Tres secciones: `invitations`, `pending`, `finished` |
| DL-5 | `pins`: cada partida queda en la sección donde apareció hasta "Actualizar", volver a la página o cambiar de cuenta |
| DL-6 | `GameActions` con `variant: 'detail' \| 'row'`; una `useTxTarget` por fila; aviso "en curso" una vez por página |
| DL-7 | `queryKeys.myGames(...)` **al final** de `invalidate` en las cuatro acciones, con cuenta |
| DL-8 | Actividad: 50 eventos por pedido, 1 pedido por página. Invitaciones: constantes del lobby (50 / 2 / 20). Cota `historyLowerBound` |
| DL-9 | Sin cuenta no hay consultas; contenido con `key={cuenta}`; en la página, el cambio de cuenta remonta (adopción de lo que siga en curso; lo terminado se ve por el estado del objeto) |
| DL-10 | Ruta `#/my-games`, enlace "Mis partidas" en el `Header`; texto R-7 en el aviso de una invitación creada |
| DL-11 | MINOR-1: etapa ligada al `targetHash` con que se lanzó; cuenta y `targetHash` en `TxVariables`; firma con `account`; `interpret(nodeResult, signer)`. Límites escritos |
| DL-12 | NIT-1: `TxOutcome`, `TxResult`, `TxPrecheckStop`, `ExecuteInput` y `TxAction` a `txSession.ts`, sin re-exports |
| DL-13 | Sin refresco automático de las listas; `refetchOnWindowFocus: false` |
| DL-14 | Resultado de "Terminadas" desde el objeto (`playerResult`, `resolutionAmounts` etiquetado); cancelada con su texto; hora del evento |
| DL-15 | "Abrir partida por ID" (`parseObjectIdInput`) y `explorerAccountUrl` (solo testnet) |
| DL-16 | Texto de vacío definitivo solo sin más páginas; "Cargar más actividad" en las secciones 2 y 3. Precisado por H-1 |
| DL-17 | Con datos, una relectura en reintento o con error no reemplaza las filas: nota arriba de la sección |

**De la segunda revisión del MAYOR (condición del APPROVE, 2026-11-03):**

| # | Decisión | Dónde |
|---|---|---|
| **H-1** (MINOR-N1) | Por fuente, el pie de la sección es una función pura de `{ itemsInSection, hasNextPage, stalled, nextPageError, isFetchingNextPage, floorBased }` (`sectionFooter` en `sui/myGames.ts`, §4). Reglas: (1) texto de vacío **definitivo** solo con `itemsInSection === 0 && !hasNextPage && !stalled && nextPageError === null`; (2) con `itemsInSection === 0` y cualquier otra combinación, el texto "… en lo revisado"; (3) botón de paginación visible con `hasNextPage && !stalled`, **también** con `nextPageError` (sirve de reintento), y deshabilitado con `isFetchingNextPage`; (4) con `nextPageError`, `role="alert"` con `readErrorMessage`, también con `stalled`; (5) con `floorBased`, el sufijo "en el historial disponible del nodo (desde <fecha>)" en el vacío, o la nota al pie con filas | TASK-2, TASK-5 |
| **H-2** (SUGGESTION-N1) | `mergeMyGames`: por `gameId`, gana el legible; entre legibles, la mayor `objectVersion` (empate ⇒ cualquiera, es el mismo objeto), con rol `acceptor` si alguna fuente lo trae y el evento más nuevo; entre ilegibles, el evento más nuevo. Un ilegible sin `gameId` no se deduplica | TASK-2 |
| **H-3** (SUGGESTION-N2) | `GameActions` en `variant='row'`: `settled` = algún `success` en `accept.outcome`, `cancel.outcome`, `reject.outcome` o en el `adopted` del objetivo. Con `settled`, no se muestran `AcceptBlock`, "Cancelar" ni "Rechazar"; los `TransactionStatus` y la alerta "sin confirmar" se mantienen. `variant='detail'` no cambia | TASK-5 |
| **H-4** (SUGGESTION-N3) | Se documenta en RM-12 y en `app/README.md` cuánto puede durar "Actualizando datos…" con reintentos en la relectura. No cambia código | TASK-6 |

**Textos fijos de la UI** (los usan los tests y el smoke; si el DEV cambia uno, lo declara como desviación):

| Clave | Texto |
|---|---|
| Enlace del encabezado | "Mis partidas" |
| Sin cuenta | "Conecta tu wallet para ver tus partidas e invitaciones" |
| Secciones (`h3`) | "Invitaciones recibidas", "Tus partidas pendientes", "Terminadas" |
| Vacío definitivo | "No tienes invitaciones pendientes", "No tienes partidas pendientes", "Todavía no hay partidas terminadas" |
| Vacío "en lo revisado" | "Sin invitaciones pendientes en lo revisado", "Sin partidas pendientes en lo revisado", "Sin partidas terminadas en lo revisado" |
| Sufijo / nota del piso | " en el historial disponible del nodo (desde <fecha>)" / "Solo se muestra el historial disponible del nodo (desde <fecha>)" (como `LobbyList`) |
| Paginación | invitaciones: "Buscar más atrás" sin filas en la sección, "Cargar más invitaciones" con filas; actividad: "Cargar más actividad"; mientras carga: "Cargando más…" |
| Relectura (DL-17) | "Reintentando… (intento n de m)" / "No se pudo actualizar la lista: <readErrorMessage>; los datos pueden estar desactualizados" + botón "Reintentar" |
| Ilegibles de invitaciones | "1 evento ilegible en lo revisado" / "N eventos ilegibles en lo revisado" |
| Fila | contraparte: "Te invitó <dirección corta>" / "Abierta" / "Invitación a <dirección corta>" / "Aceptaste la de <dirección corta>"; rol en "Terminadas": "Creaste" / "Aceptaste"; estado: "Pendiente" / "Resuelta" / "Cancelada"; "Partida ilegible"; enlace "Ver partida" |
| Resultado (solo en "Terminadas", DL-14) | "Ganaste" / "Perdiste", más "pozo X SUI · al ganador Y SUI (según la fórmula del contrato)"; cancelada: "Cancelada: la apuesta volvió a quien la creó" |
| Ayudas (DL-15) | etiqueta "Abrir partida por ID", botón "Abrir", error "ID de partida inválido"; enlace "Ver tu historial completo en el explorador" |
| Aviso de invitación creada (R-7) | "Comparte el enlace de esta página con el invitado; guárdalo, o encuéntrala en «Mis partidas»" |

**Selectores estables** (para tests y smoke): `section.my-games`; `section.my-games-section[data-section="invitations"
| "pending" | "finished"]`; `li.my-game-row[data-game-id="<id normalizado>"]` (las ilegibles sin ID, sin el atributo);
`.my-game-result` (resultado leído del objeto, solo en "Terminadas"). Los de #12 no cambian: `.game-actions`,
`.tx-status`.

## 2. Hechos verificados (resumen del plan, "Verificación"; validados por el MAYOR)

Rutas relativas a `<repo>/node_modules/`; `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
`@mysten/dapp-kit-react` 2.1.41, `@tanstack/react-query` 5.105.0, `eslint-plugin-react-hooks` 7.1.1.

| # | Hecho | Evidencia |
|---|---|---|
| V-1 | `EventFilter` del `ListEvents` crudo es una DNF: `terms[]` (OR) de `literals[]` (AND) con `negated` y `predicate` `sender` / `emitModule` / `eventType` / `eventStreamHead`. Sin filtro por campo | `@mysten/sui/dist/grpc/proto/sui/rpc/v2/filter.d.mts:125-204` |
| V-2 | El fullnode público de testnet (`sui-node/1.83.1`) filtra por `sender ∧ eventType` y por DNF de dos términos por índice (M-2, M-3); debajo del piso responde `OUT_OF_RANGE` (M-4); ventana 14,56 días (M-1) | Sondas públicas del MID y del MAYOR (plan, "Mediciones") |
| V-3 | `getObjects` pide en lotes de 50 en serie y siempre incluye `version` (`string`) | `@mysten/sui/dist/grpc/core.mjs:41-60`; `dist/client/types.d.mts:130` |
| V-4 | `signAndExecuteTransaction({ transaction, account })`: con `account`, el kit hace `setSenderIfNotSet(account.address)`; si la wallet ya no expone la cuenta, lanza **antes** de abrirla (sin digest) | `@mysten/dapp-kit-core/dist/types-*.d.mts:208-212`; `dist/index.mjs:73-77` |
| V-5 | `UiWalletAccount` se importa **como tipo** desde la raíz de `@mysten/dapp-kit-react` (reexporta el core con `export *`), permitido en `hooks/` | `@mysten/dapp-kit-react/dist/index.d.mts:6`; `app/eslint.config.js:92` |
| V-6 | `isRefetchError` = `isError && hasData`; en las infinitas, los errores de "cargar más" quedan en `isFetchNextPageError` y no cuentan como refetch. `failureCount` vuelve a 0 al empezar cada fetch | `@tanstack/query-core/build/modern/queryObserver.js:402`; `infiniteQueryObserver.js:125` |
| V-7 | `react-hooks/set-state-in-render` (preset recomendado del plugin 7.1.1) marca solo el `setState` en un bloque **incondicional** del render. El `setState` dentro de un `if` (el patrón "guardar información de renders anteriores") no se marca | `eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js:45367-45460` |
| V-8 | `parseCreatedGame`/`parseResolvedGame` comparan con `sameAddress`: el `signer` sin normalizar es seguro | `app/src/sui/gameTx.ts:51, 87` |

## 3. Reglas transversales (todos los tasks)

- **Node 26** por ruta absoluta en cada llamada (prefijo de §0). Todo desde la raíz del worktree (`<repo>`).
- **Gate de la app en cada task** (§0, output completo pegado, con archivos y tests de Vitest y el tamaño del build), y
  `git status --porcelain --untracked-files=all` con solo los archivos del task. En TASK-1, además, el job `contracts`.
- **Sin dependencias nuevas** (SEG-8): `package.json`, `app/package.json` y `package-lock.json` sin delta en todo el ciclo.
- **Capas** (`app/eslint.config.js`, sin tocarlo): `sui/` solo `@mysten/sui*`/`@mysten/dapp-kit-core*` y sin React;
  `hooks/` `@mysten/sui*`, la raíz de `@mysten/dapp-kit-react` y `@tanstack/react-query`; componentes y páginas, de
  `@mysten/*` solo `@mysten/dapp-kit-react/ui` (pueden importar de `sui/` funciones puras, como hoy `GameActions`).
- **Lint en 0 sin `eslint-disable`.** Ningún `setState` incondicional en el render (V-7), ningún estado mutado (siempre
  un `Map` nuevo), sin `useRef` ni `useEffect` en la máquina y en `useMyGames` (PROY-14).
- **Localnet aislada** (`agents.md` §3, "Localnet aislada (smokes)"): `env.sh`, `ids.env`, `smoke_guard`, publicación con
  el script en la **variante B** y cierre del paso 7. **Regla B4:** ningún `sui client …` (ni `publish.mjs publish`) sin el
  prefijo del paso 3, tampoco los de solo lectura; siempre `suic`/`"$SUI"`; `SUI_CONFIG_DIR` solo `$SMOKE_DIR/net`. En este
  documento, `PRE` abrevia ese prefijo y **todo `suic` lo lleva** aunque no se escriba. Una sola localnet a la vez (puerto
  9000). Para `node`/`npm`/`vite`, `<SMOKE_DIR>/app.env`; nunca `env.sh` y `app.env` en la misma llamada. Nunca
  `new-address`. Las sondas en Node solo hablan con `http://127.0.0.1:9000` por gRPC y no leen `<SMOKE_DIR>/net`.
- **Testnet:** nada con claves; este ciclo no necesita lecturas de testnet.
- **Placeholders** en todo lo commiteado y en el output pegado (`FLUJO_AGENTES.md` §2): `<repo>`, `<HOME real>`,
  `<SMOKE_DIR>`, `<scratchpad>`. Direcciones e IDs abreviados (`0x1234…abcd`) o por rol en reportes; digests completos sí.
- **Antes de cada reporte:** grep del `git diff` y de los archivos nuevos por claves (`suiprivkey`, `mnemonic`,
  `BEGIN .*KEY`) y rutas personales: vacío. El grep de hex de 40-64 solo puede dar IDs ficticios de tests; se declaran.
- Montos en `bigint` (PROY-12); textos de la UI en español; tests en inglés con nombre = comportamiento (LIM-11); JSDoc
  con el porqué en lo exportado (LIM-7); sin `console`.

## 4. Contrato entre tasks (nombres que no cambian; firmas orientativas)

| Archivo | Exporta (nuevo o cambiado) |
|---|---|
| `sui/eventScan.ts` (nuevo, TASK-2) | `HISTORY_FLOOR_MARGIN_CHECKPOINTS = 16_000n`; `type HistoryLowerBound = { checkpoint: bigint; kind: 'publish' \| 'node_floor' \| 'none' }`; `historyLowerBound({ publishCheckpoint, nodeFloor }): HistoryLowerBound` (la lógica de `lobbyLowerBound`, sin cambios); `type EventScanClient = Pick<SuiGrpcClient, 'ledgerService' \| 'getObjects'>`; `type EventsPage = { events: RawGameEvent[]; cursor: string \| null; hasNextPage: boolean }`; `eventTypeFilter(eventType: string): GrpcTypes.EventFilter` (el filtro de un literal que hoy arma el lobby); `requestEvents(client, { filter, startCheckpoint, before, limit, signal? }): Promise<EventsPage>` (el `readMask` del lobby, sin `sender`); `requestOrPruned(client, mismos args): Promise<EventsPage>` (`HistoryPrunedError` con `cause`) |
| `sui/lobby.ts` (TASK-2) | Pierde `LOBBY_FLOOR_MARGIN_CHECKPOINTS`, `LobbyLowerBound`, `LobbyClient` y `lobbyLowerBound` (pasan a `eventScan.ts` con los nombres de arriba); conserva `LOBBY_EVENTS_PER_REQUEST`, `LOBBY_MAX_REQUESTS_PER_PAGE`, `LOBBY_PAGE_TARGET`, `LobbyItem`, `LobbyPage` (con `lowerBound: HistoryLowerBound`) y `fetchLobbyPage` con la **misma** firma (cliente `EventScanClient`) |
| `sui/myGames.ts` (nuevo, TASK-2) | `MY_ACTIVITY_EVENTS_PER_REQUEST = 50`; `MY_ACTIVITY_MAX_REQUESTS_PER_PAGE = 1`; `type MyGameRole = 'creator' \| 'acceptor' \| 'invitee'`; `type MyGameItem = { kind: 'game'; game: Game; objectVersion: bigint; role: MyGameRole; txDigest: string; checkpoint: bigint \| null } \| { kind: 'unreadable'; gameId: string \| null; role: MyGameRole \| null; txDigest: string; checkpoint: bigint \| null }`; `type MyGamesPage = { items: MyGameItem[]; endCursor: string \| null; hasNextPage: boolean; lowerBound: HistoryLowerBound; end: 'more' \| 'bound' \| 'history_pruned'; unreadableEvents: number }`; `myActivityFilter(originalPackageId, address): GrpcTypes.EventFilter`; `fetchMyActivityPage(client, { originalPackageId, address, publishCheckpoint, before, signal? }): Promise<MyGamesPage>`; `fetchInvitationsPage(client, mismos args): Promise<MyGamesPage>`; `type MyGamesSection = 'invitations' \| 'pending' \| 'finished'`; `type MyGamesPins = ReadonlyMap<string, MyGamesSection>`; `naturalSection(item: MyGameItem, address: string): MyGamesSection \| null`; `mergeMyGames(activity: readonly MyGameItem[], invitations: readonly MyGameItem[]): MyGameItem[]` (H-2); `extendPins(pins: MyGamesPins, items: readonly MyGameItem[], address: string): MyGamesPins` (recibe los ítems **ya deduplicados** por `mergeMyGames`; devuelve **la misma instancia** si no hay IDs nuevos); `type MyGamesSections = Record<MyGamesSection, MyGameItem[]>`; `groupMyGames({ activity, invitations, address, pins }): MyGamesSections`; `type SectionFooter = { empty: 'definitive' \| 'reviewed' \| null; showMore: boolean; moreDisabled: boolean; alert: boolean; floorNote: boolean }`; `sectionFooter({ itemsInSection, hasNextPage, stalled, nextPageError, isFetchingNextPage, floorBased }): SectionFooter` (H-1) |
| `sui/explorer.ts` (TASK-2) | suma `explorerAccountUrl(network: Network, address: string): string \| null` (`<base>/account/<dirección>`; valida con `isValidSuiAddress` antes de mirar la red y lanza si no vale; `null` en localnet) |
| `hooks/txSession.ts` (TASK-3) | recibe `TxOutcome<T>`, `TxResult<T>`, `TxPrecheckStop`, `ExecuteInput<T>` (con `interpret: (nodeResult: NodeTransactionResult, signer: string) => T`) y `TxAction`; `TxVariables<T> = { input: ExecuteInput<T>; viewId: number; runId: number; action: TxAction; account: UiWalletAccount \| null; targetHash: string }`. **No importa nada de `./`** |
| `hooks/txInvalidation.ts` | TASK-3: importa `TxAction` de `txSession`. TASK-4: `invalidate` termina con `queryKeys.myGames(network, originalPackageId, address)` cuando `address !== null` |
| `hooks/useExecuteTransaction.ts` (TASK-3) | Misma API pública: `useExecuteTransaction<T>(view: TxView): { stage: TxStage; outcome: TxResult<T> \| null; execute: (input: ExecuteInput<T>) => void }`; exporta `TxStage`, `UseExecuteTransaction<T>`, `CONNECT_WALLET_MESSAGE`, `PREPARE_FAILED_PREFIX` |
| `hooks/queryKeys.ts` (TASK-4) | suma `myGames(network, originalPackageId, address: string)` = `['sui', red, 'myGames', pkg, normalizeSuiAddress(address)]`, `myActivity(...)` = `[...myGames(...), 'activity']`, `myInvitations(...)` = `[...myGames(...), 'invitations']` |
| `hooks/useMyGames.ts` (nuevo, TASK-4) | `type MyGamesSource = { status: ReadStatus; hasData: boolean; refreshRetrying: { attempt: number; max: number } \| null; refreshError: unknown; hasNextPage: boolean; isFetchingNextPage: boolean; nextPageError: unknown; stalled: boolean; lowerBound: HistoryLowerBound \| null; end: MyGamesPage['end'] \| null; loadMore: () => void; retry: () => void }`; `useMyGames(): { kind: 'no_account' } \| { kind: 'ready'; sections: MyGamesSections; unreadableEvents: number; activity: MyGamesSource; invitations: MyGamesSource; isFetching: boolean; refresh: () => void }` |
| `hooks/useAccountTxBusy.ts` (nuevo, TASK-4) | `useAccountTxBusy(): boolean` (`useIsMutating({ mutationKey: queryKeys.txAccount(network, address) }) > 0`; sin cuenta, `false`) |
| `components/GameActions.tsx` (TASK-5) | `GameActions({ game, variant = 'detail' }: { game: Game; variant?: 'detail' \| 'row' })` |
| `components/MyGamesSection.tsx` (nuevo, TASK-5) | `MyGamesSection` (encabezado, nota de relectura, filas, pie según `sectionFooter`) y `MyGameRow` (en el mismo archivo o en `MyGameRow.tsx`) |
| `pages/MyGamesPage.tsx` (nuevo, TASK-5) | `MyGamesPage` (ruta `my-games`): sin cuenta, el texto; con cuenta, `<MyGamesView key={address} />` |

---

## TASK-1: sondas en localnet aislada — área: app (verificación, sin código)

### 1. Historia de usuario del task

**Como** DEV del ciclo, **quiero** confirmar en la localnet del smoke que el nodo local filtra eventos por remitente y
pagina bien dentro de una transacción con muchos eventos, **para** escribir las listas sobre hechos medidos y no
descubrir en el smoke que el diseño no funciona.

### 2. Contexto

El plan midió el filtro por remitente en el fullnode público de testnet (`sui-node` 1.83.1, V-2). La localnet del smoke
corre `sui 1.83.0`. Modelo de sondas: TASK-1 de #12 (`git show 31100ab^2:documents/REPORTES_ACCEPT.md`, si hace falta
como referencia de formato).

### 3. Qué implementar

1. Gate completo de §0 (app + contracts) **antes** de nada: "verificación del baseline".
2. Localnet aislada (`agents.md` §3 pasos 2-5), publicación **variante B**, `update_fee_rate` 250 (`ADMIN`). Cuentas de
   la génesis `ADMIN`, `A`, `B`, `C` en `ids.env` (cuatro distintas).
3. Transacciones por CLI (todas con `PRE`; sintaxis de los smokes anteriores):
   - `A`: `suic ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none` (×2)
     y una invitación a `B` con `"some(@$B)"` en lugar de `none`;
   - `B` acepta una de las abiertas de `A`: `suic ptb --split-coins gas "[1000000]" --assign c --move-call
     "$PKG::game::accept_game" @<G> @$HOUSE c.0 @0x8`;
   - `C` crea en **un solo PTB** 12 abiertas: `--split-coins gas "[1000000,…×12]" --assign c` y 12 `--move-call` con
     `c.0` … `c.11` (el DEV arma los argumentos con un bucle de bash; si la CLI exige `--gas-budget`, lo declara).
4. Sondas en Node 26 (scripts en `<scratchpad>`, importan el SDK de `<repo>/node_modules` por ruta, solo
   `http://127.0.0.1:9000`):
   - **S-1:** DNF de DL-1 con `sender` = `A` ⇒ exactamente los 3 `GameCreated` de `A`; con `sender` = `B` ⇒ su
     `GameResolved`; con `normalizeSuiAddress('0x5ca1ab1e')` ⇒ 0 eventos y `CHECKPOINT_BOUND`. Anotar `QueryEndReason`,
     frames y ms de cada caso.
   - **S-2:** los 12 `GameCreated` de `C` comparten digest y tienen `event_index` 0..11; con `limit` 5 descendente y
     `before` = último `watermark.cursor`: 5 + 5 + 2, sin repetidos ni faltantes (comparar por `(digest, event_index)`).
   - **S-3:** `getObjects` con los 15+ IDs en una llamada: todos `Shared`, legibles con `parseGameObject` (o el esquema
     BCS equivalente en la sonda) y con `version`; la partida que acepta `B` se lee **antes** y **después** de aceptar y su
     `version` sube.
   - **S-4:** escaneo de `GameCreated` sin `sender` y filtro `opponent == B` en la sonda ⇒ la invitación de `A` a `B`;
     ningún `GameCreated` con `opponent` = `C`.
5. Cierre: paso 7 de `agents.md` §3 más las verificaciones del paso 18 del smoke (puertos libres, `kill -0` en otra
   llamada antes de `rm -rf <SMOKE_DIR>`, `~/.sui/` igual a la línea base).

### 4. Archivos a tocar / NO tocar

- **Tocar:** ninguno del repo. Scripts de sonda solo en `<scratchpad>`.
- **NO tocar:** todo el repo. `contracts/Move.lock` sin delta; sin `contracts/deployments/`, `Published.toml` ni
  `Pub.*.toml` al terminar.

### 5. Tests obligatorios

No hay tests nuevos. Gate completo como verificación del baseline (§0) y otra vez al final (sin delta).

### 6. Smoke

No aplica (son sondas). El cierre sigue el paso 18 del smoke.

### 7. Criterios de aceptación

- T1-1: baseline de §0 reproducido (o la diferencia reportada y el task detenido).
- T1-2..T1-5: S-1..S-4 con el resultado esperado y su output pegado, con roles en lugar de direcciones.
- T1-6: cierre limpio: `kill -0` falla en `sui`; `<SMOKE_DIR>` borrado; `stat`/`ls` de `<HOME real>/.sui/sui_config/`
  idénticos; `git status --porcelain` vacío; `Move.lock` sin delta.
- **STOP al MID** si S-1 no filtra por remitente (DL-1 (A) pasaría a escaneo) o si S-2 repite o pierde eventos: el
  handoff se revisa (v1.1) antes de TASK-2.

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5: S-1..S-4 en "Verificación manual", y la sintaxis de CLI usada para el
PTB de varias partidas (la reutiliza el smoke). Sin commits ni pushes.

---

## TASK-2: capa pura de "mis partidas" — área: app (`sui/`)

### 1. Historia de usuario del task

**Como** DEV, **quiero** las lecturas, la agrupación y los textos de pie de las listas como funciones puras de `sui/`,
**para** que los hooks y la página solo las orquesten y que cada regla (filtro, invariantes, ilegibles, deduplicación,
fijado, vacío honesto) tenga su test.

### 2. Contexto

- `app/src/sui/lobby.ts`: `lobbyLowerBound` (`:50-63`), `requestCreatedEvents` (`:72-131`, `readMask` en `:42` **sin
  `sender`**), `isHistoryPruned` + `requestOrPruned` (`:134-161`), `fetchLobbyPage` (`:168-248`, cursor que no avanza en
  `:201`, filtro de abiertas en `:205`, `getObjects` en `:220-224`, `Pending` y abierta en `:244`).
- `app/src/sui/lobby.test.ts`: fixture real `game-reads.localnet.json` y frames sintéticos (`openGame`, `createdFor`,
  `makeClient`); imports en `:8-15`; `not.toContain('sender')` en `:196`; la cota con `LOBBY_FLOOR_MARGIN_CHECKPOINTS` en
  `:314`.
- Parsers: `parseGameCreated`/`parseGameResolved` (`sui/events.ts`), `parseGameObject` (`sui/game.ts`), `sameAddress`
  (`sui/ids.ts`), `playerResult` (`sui/acceptGame.ts`), `resolutionAmounts` (`sui/game.ts`).

### 3. Qué implementar

1. **`eventScan.ts`** (§4): mover sin cambiar la lógica `lobbyLowerBound` → `historyLowerBound`,
   `LOBBY_FLOOR_MARGIN_CHECKPOINTS` → `HISTORY_FLOOR_MARGIN_CHECKPOINTS`, `requestCreatedEvents` → `requestEvents`
   (recibe `filter` y `limit`; mismo `readMask` sin `sender`; mismo manejo de `QueryEnd`), `isHistoryPruned` (privada) y
   `requestOrPruned`; `eventTypeFilter` arma el literal único que hoy está inline en `lobby.ts:82`.
2. **`lobby.ts`**: usa `eventScan.ts` con `eventTypeFilter(gameEventType(pkg, 'GameCreated'))` y
   `LOBBY_EVENTS_PER_REQUEST`. Comportamiento idéntico.
3. **`myActivityFilter`**: `{ terms: [term(GameCreated), term(GameResolved)] }`, cada término con dos literales
   (`sender` = `normalizeSuiAddress(address)` y `eventType` = `gameEventType(pkg, …)`), `negated: false`.
4. **`fetchMyActivityPage`**: `fetchNodeInfo` → `historyLowerBound` → hasta `MY_ACTIVITY_MAX_REQUESTS_PER_PAGE` pedidos
   `requestOrPruned` con `limit` `MY_ACTIVITY_EVENTS_PER_REQUEST`. Cursor que no avanza ⇒ `PaginationStalledError`;
   `HistoryPrunedError` ⇒ `end: 'history_pruned'` con lo reunido y `lowerBound.kind = 'node_floor'` (como el lobby). Por
   evento:
   - tipo `GameCreated` ⇒ `parseGameCreated`; `creator` ≠ cuenta ⇒ ilegible (`ReadDataError` `invariant`); rol `creator`;
   - tipo `GameResolved` ⇒ `parseGameResolved`; `acceptor` ≠ cuenta ⇒ ilegible; rol `acceptor`;
   - cualquier `ReadDataError` ⇒ ítem `unreadable` (con `gameId` si se pudo leer, y rol según el tipo si se reconoce);
   - después, objetos en lote (`withReadTimeout` + `getObjects` con `include: { content: true }`): `ObjectError` ⇒ se
     omite; `parseGameObject` falla ⇒ `unreadable` con `gameId`; si no, `kind: 'game'` con
     `objectVersion = BigInt(object.version)`.
   - `unreadableEvents` = 0 en esta fuente (sus ilegibles son filas, DL-3).
5. **`fetchInvitationsPage`**: el bucle de `fetchLobbyPage` (constantes del lobby: 50 / 2 / 20) con `eventTypeFilter` de
   `GameCreated`; candidata = `opponent !== null && sameAddress(opponent, address)`; **sin** descartar terminadas.
   Evento ilegible ⇒ `unreadableEvents++`, sin ítem (MINOR-4). Objeto ilegible de una candidata ⇒ `unreadable` con
   `gameId` y rol `invitee`. Legible ⇒ `kind: 'game'`, rol `invitee`, con `objectVersion`.
6. **`naturalSection`** (sección natural del plan): `invitee` + `Pending` ⇒ `invitations`; `creator` + `Pending` ⇒
   `pending`; `Resolved` con la cuenta como creador o aceptante, o `Cancelled` con `creator` = cuenta ⇒ `finished`;
   `invitee` terminado sin ser el aceptante ⇒ `null`. Ilegibles: los que vienen con rol `invitee` ⇒ `invitations`; el
   resto ⇒ `finished`.
7. **`mergeMyGames`** (H-2) y **`extendPins`** (misma instancia si no hay `gameId` nuevos con sección natural ≠ `null`;
   si los hay, un `Map` nuevo con los anteriores más los nuevos).
8. **`groupMyGames`**: `mergeMyGames`, sección = `pins.get(id) ?? naturalSection(...)` (las ilegibles sin `gameId`, por
   su sección natural), descarta `null`, orden descendente por `checkpoint` (`null` al final, empate por `txDigest`).
9. **`sectionFooter`** (H-1).
10. **`explorerAccountUrl`** (§4).

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/src/sui/eventScan.ts`, `eventScan.test.ts`, `myGames.ts`, `myGames.test.ts`.
- **Modificar:**
  - `app/src/sui/lobby.ts`;
  - `lobby.test.ts`: solo imports, identificadores renombrados (`historyLowerBound`, `HISTORY_FLOOR_MARGIN_CHECKPOINTS`,
    `EventScanClient`) y el `describe` de la cota movido a `eventScan.test.ts`. **Ningún valor esperado cambia**;
  - `explorer.ts` y `explorer.test.ts`;
  - `app/src/hooks/useLobby.ts` y `components/LobbyList.tsx`, solo el nombre del tipo de la cota, si lo usan.
- **NO tocar:** `hooks/` (salvo el tipo en `useLobby.ts`), `components/` (salvo el tipo en `LobbyList.tsx`), `pages/`,
  `contracts/`, `package*.json`.

### 5. Tests obligatorios

En `eventScan.test.ts`:

- T2-1: `historyLowerBound`, con los casos que tenía `lobbyLowerBound`, movidos sin cambiar valores.
- T2-2: `requestEvents` envía el `filter` y el `limit` recibidos, el `readMask` sin `sender` y `before` decodificado;
  devuelve el último `watermark.cursor`; `QueryEnd` ausente o desconocido ⇒ `ReadDataError`.
- T2-3: `requestOrPruned` convierte `OUT_OF_RANGE` en `HistoryPrunedError` con `cause`, y relanza un `CANCELLED`.

En `myGames.test.ts`:

- T2-4: `myActivityFilter` = DNF exacta (dos términos, dos literales cada uno, `sender` normalizado desde la forma
  corta, tipos con `originalPackageId`).
- T2-5: `fetchMyActivityPage` con un `GameCreated` y un `GameResolved` propios ⇒ dos ítems con rol, `objectVersion` de
  `object.version`, digest y checkpoint del evento.
- T2-6: invariante: `GameCreated` con `creator` ≠ cuenta y `GameResolved` con `acceptor` ≠ cuenta ⇒ ítems
  `unreadable`, nunca `game`.
- T2-7: fin de historial (`OUT_OF_RANGE`) ⇒ `end: 'history_pruned'`, lo reunido y `lowerBound.kind: 'node_floor'`;
  cursor repetido con `hasNextPage` ⇒ `PaginationStalledError`.
- T2-8: objeto inexistente ⇒ omitido; objeto ilegible ⇒ `unreadable` con `gameId`, sin ocultar los sanos.
- T2-9: `fetchInvitationsPage`: solo entra la invitación a la cuenta (no la abierta ni la invitación a otro), también
  terminada; respeta 50 / 2 / 20 (cuenta de pedidos); `history_pruned` y `stalled` como el lobby.
- T2-10 (MINOR-4): un evento ilegible en las invitaciones ⇒ `unreadableEvents: 1` y ningún ítem; un objeto ilegible de
  una invitación a la cuenta ⇒ ítem `unreadable` con rol `invitee`.
- T2-11: `naturalSection` para cada caso de §3.6 (pendiente invitado, pendiente creador, resuelta como creador y como
  aceptante, cancelada propia, invitación rechazada ⇒ `null`, ilegibles por rol).
- T2-12 (MINOR-5): `mergeMyGames` con la invitación aceptada en las dos fuentes, **en los dos órdenes** de versión
  (actividad nueva con invitaciones viejas, y al revés): gana la mayor `objectVersion`; rol `acceptor`; evento más
  nuevo; una sola fila.
- T2-13: `extendPins` devuelve la **misma** instancia sin IDs nuevos y un `Map` nuevo con ellos (el anterior intacto).
  (v1.1, MINOR-1) Aplicado sobre `mergeMyGames(...)`: G llega por las dos fuentes con lecturas distintas (actividad
  `Resolved` con `objectVersion` mayor e invitaciones `Pending`; aparte, (B) ilegible contra (A) legible) ⇒ el pin de G
  es la sección natural de la ganadora de H-2 (`finished`), nunca `invitations`.
- T2-14 (H-2): legible contra ilegible del mismo `gameId` ⇒ gana el legible en los dos órdenes; dos ilegibles ⇒ el
  evento más nuevo; ilegibles sin `gameId` no se deduplican.
- T2-15: `groupMyGames`: una partida fijada en `invitations` que pasó a `Resolved` sigue en `invitations`; una nueva sin
  pin va a su sección natural; orden descendente por checkpoint.
- T2-16 (H-1): `sectionFooter`:
  - vacío sin más páginas ⇒ `empty: 'definitive'`, sin botón;
  - vacío con `hasNextPage` ⇒ `'reviewed'` y botón;
  - vacío con `nextPageError` sin `stalled` ⇒ `'reviewed'`, botón y `alert`;
  - vacío con `stalled` ⇒ `'reviewed'`, sin botón y con `alert`;
  - con filas ⇒ `empty: null`;
  - `isFetchingNextPage` ⇒ `moreDisabled`;
  - `floorBased` ⇒ `floorNote`.

En `explorer.test.ts`:

- T2-17: `explorerAccountUrl` en testnet (`<base>/account/<dirección>`) y `null` en localnet; lanza con una dirección
  inválida en las dos redes.

En `lobby.test.ts`:

- T2-18 (regresión): todo verde, con los mismos valores esperados (en particular `:196`).

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- T2-1..T2-18 en verde; gate de la app completo en verde, con el delta de tests declarado por archivo.
- `git diff app/src/sui/lobby.test.ts` muestra solo imports, renombres y el `describe` movido.
- Funciones puras o con el cliente por parámetro (ARQ-3); ninguna importa React.

### 8. Al terminar

Reporte §5 con el diff de `lobby.test.ts` resumido y los conteos de tests por archivo. Sin commits ni pushes.

---

## TASK-3: máquina — cambio de cuenta (MINOR-1) y tipos (NIT-1) — área: app (`hooks/`)

### 1. Historia de usuario del task

**Como** jugador que cambia de cuenta en la wallet mientras una transacción se confirma, **quiero** que la app no me
muestre la etapa de otra cuenta como si fuera mía, que firme con la cuenta que verificó la transacción y que me devuelva
el resultado al volver, **para** no perder de vista una apuesta ni firmar con la cuenta equivocada.

### 2. Contexto

- `app/src/hooks/useExecuteTransaction.ts`: tipos en `:31-51`; `useState` de `stage` y `runId` en `:100-101`;
  `sender = account?.address` en `:117` (cierre del render); firma en `:172` sin `account`; `mutationFn` en `:222-243`;
  `useMutationState` por `runId` en `:248-253`; `execute` en `:255-269`.
- `app/src/hooks/txSession.ts:4-5` importa tipos de `./txInvalidation` y `./useExecuteTransaction` (los ciclos de
  NIT-1); `queryKeys.ts:3` importa `TxTarget` de `./txSession`.
- `useAcceptGame.ts:23-30` y `useCreateGame.ts:26-28, 41-43` usan su propio `sender` dentro de `interpret`.
- Arnés: `app/src/test/txHarness.tsx` y `switchAccount` (ejemplo en `CreateGameForm.machine.test.tsx:200-239`).

### 3. Qué implementar

1. **Tipos (DL-12):** mover `TxOutcome`, `TxResult`, `TxPrecheckStop`, `ExecuteInput` a `txSession.ts`, y `TxAction`
   desde `txInvalidation.ts`. Actualizar todos los imports, sin re-exports. `txSession.ts` importa solo de
   `@tanstack/react-query`, `@mysten/sui/transactions` (tipo), `@mysten/dapp-kit-react` (tipo `UiWalletAccount`, V-5),
   `../sui/events` y `../sui/execution` (tipos).
2. **`ExecuteInput.interpret(nodeResult, signer: string)`**; `useAcceptGame` y `useCreateGame` usan `signer` en lugar de
   su `sender` (se borra su `useCurrentAccount` si queda sin uso). `useCancelGame`/`useRejectGame` no lo usan (su
   `interpret` ignora el segundo argumento).
3. **`TxVariables`** suma `account: UiWalletAccount | null` y `targetHash: string`. `execute` los captura
   (`useCurrentAccount()` del render del clic y `view.targetHash`) y los pasa a `mutateAsync`. `txVariablesOf` no cambia
   (sigue validando solo `viewId`/`runId`/`action`).
4. **`run(variables, progress)`**: `account = variables.account`; `sender = account?.address ?? null` (sin cuenta, el
   `failure(CONNECT_WALLET_MESSAGE)` de hoy, antes de cualquier pedido); preflight con `sender`;
   `dAppKit.signAndExecuteTransaction({ transaction: input.build(), account })`; `input.interpret(nodeResult, sender)`;
   la invalidación con `sender`.
5. **Etapa por clave:** `useState<{ key: string; stage: TxStage }>({ key: view.targetHash, stage: 'idle' })`; `run` y
   el `finally` escriben `{ key: variables.targetHash, stage }`; el hook devuelve
   `stage: estado.key === view.targetHash ? estado.stage : 'idle'`. `runId` sigue en su `useState` (el resultado ya
   filtra por `mutationKey: view.key`, que incluye la cuenta). Sin `useRef` ni `useEffect`.

### 4. Archivos a tocar / NO tocar

- **Modificar:** `app/src/hooks/useExecuteTransaction.ts`, `txSession.ts`, `txInvalidation.ts`, `useAcceptGame.ts`,
  `useCreateGame.ts`, `useCancelGame.ts`, `useRejectGame.ts`, `components/GameActions.tsx` y
  `components/TransactionStatus.tsx` (solo imports).
- **Tests:** `useExecuteTransaction.test.tsx`, `txSession.test.ts`, `txInvalidation.test.ts`, `useAcceptGame.test.tsx`,
  `useCreateGame.test.tsx`, `CreateGameForm.test.tsx`, `GameActions.test.tsx`, `TransactionStatus.test.tsx`,
  `GameActions.machine.test.tsx` y `CreateGameForm.machine.test.tsx`. Solo imports, la firma de `interpret`, `account` en
  las expectativas de la llamada a la wallet y los tests nuevos.
- **NO tocar:** `queryKeys.ts` (salvo que un import lo exija), `useTxTarget.ts` (salvo imports), `sui/`, el resto de
  `components/` y `pages/`, y la tabla de invalidación (es de TASK-4).

### 5. Tests obligatorios

- T3-1: regresión: los 755 del baseline en verde. Ningún resultado esperado cambia; la lista de aserciones tocadas
  (imports, `interpret`, `account`) va en el reporte.
- T3-2: A en `confirming` → `switchAccount(B)` ⇒ `stage: 'idle'`, `outcome: null` y la vista de B sin `busy` ni
  `in_flight`.
- T3-3: con T3-2 terminada mientras se ve B → `switchAccount(A)` ⇒ `stage: 'done'` y el `outcome` `success` de A.
- T3-4: cambio a B **durante la preflight** (deferred) ⇒ la wallet mock recibe `account` = A (el objeto capturado), e
  `interpret` recibe la dirección de A.
- T3-5: "sin confirmar" de A: no bloquea a B (`execute` de B ejecuta) y bloquea a A al volver.
- T3-6 (SUGGESTION-5): tras T3-2, B lanza una acción desde la **misma** instancia del hook → al volver a A, la instancia
  no muestra el resultado de A (`outcome: null`), y si el de A quedó "sin confirmar", el objetivo de A sigue bloqueado.
- T3-7: sin cuenta, `execute` ⇒ `failure` "Conecta tu wallet" sin pedidos (sigue verde con `account: null` en las
  variables).
- T3-8: `txVariablesOf` ignora `account`/`targetHash` y sigue reconociendo las cuatro acciones; `toTxEntry` no cambia.
- T3-9: con la cuenta capturada, la transacción que va a la wallet sigue **sin** `sender` (el test de
  `useExecuteTransaction.test.tsx:212-216` sigue verde).

### 6. Smoke

No aplica en este task (la burner no cambia de cuenta sin recargar; el smoke del ciclo lo declara).

### 7. Criterios de aceptación

- T3-1..T3-9 en verde; gate completo en verde; lint 0 sin `eslint-disable`.
- `grep -n "from './" app/src/hooks/{txSession,queryKeys,txInvalidation,useExecuteTransaction}.ts` pegado: `txSession.ts`
  sin ninguna línea; los demás forman un DAG (sin ciclos).
- (v1.1) Pegado y **vacío**: `grep -rnE "\b(TxOutcome|TxResult|TxPrecheckStop|ExecuteInput|TxAction)\b.*from
  '.*(useExecuteTransaction|txInvalidation)'" app/src` (en una sola línea): nadie importa los tipos movidos desde su
  lugar viejo.
- La API pública del hook (§4) no cambia.

### 8. Al terminar

Reporte §5. En "Desviaciones", cualquier aserción tocada más allá de imports, `interpret` y `account`. Sin commits ni
pushes.

---

## TASK-4: hooks de "mis partidas" — área: app (`hooks/`)

### 1. Historia de usuario del task

**Como** DEV, **quiero** un hook que entregue las tres secciones ya agrupadas y fijadas, el estado de cada fuente sin
desmontar filas en una relectura, y la invalidación tras cada transacción propia, **para** que la página solo dibuje.

### 2. Contexto

- Modelo: `app/src/hooks/useLobby.ts` (publicación + `useInfiniteQuery` + estado combinado + `refresh`).
- `usePublishCheckpoint` (`useLobby.ts`), `deriveReadStatus` (`sui/readStatus.ts`), `READ_MAX_RETRIES`
  (`sui/readPolicy.ts`), `useWalletAccount`.
- Tabla de invalidación: `txInvalidation.ts:21-39`. Tests de claves exactas: `txInvalidation.test.ts` y, en
  `useExecuteTransaction.test.tsx`, los `toEqual` de `:206-207, 316-317, 367-368, 376-377, 390, 399-400, 426-427,
  448-450, 468-469` (a `244cf76`; pueden haberse corrido con TASK-3).

### 3. Qué implementar

1. **`queryKeys`**: `myGames`, `myActivity`, `myInvitations` (§4).
2. **`transactionInvalidations`**: con `ctx.address !== null`, agregar `queryKeys.myGames(network, originalPackageId,
   address)` **al final** de `invalidate`. Resultado: crear `[balance, myGames]`; cancelar y rechazar `[game, balance,
   myGames]`; aceptar `[game, balance, house, myGames]`. `reset` sigue siendo `[lobby]`.
3. **`useMyGames`**:
   - `address` de `useWalletAccount()`. Sin cuenta ⇒ `{ kind: 'no_account' }` y las queries deshabilitadas (spy en 0).
   - Dos `useInfiniteQuery` (`myActivity` → `fetchMyActivityPage`, `myInvitations` → `fetchInvitationsPage`):
     `enabled: publish.isSuccess && address !== null`, `initialPageParam: null`, `getNextPageParam` por `endCursor` si
     `hasNextPage`, `refetchOnWindowFocus: false`.
   - **`MyGamesSource` por fuente:**
     - `hasData = query.data !== undefined`;
     - sin publicación lista ⇒ `status = deriveReadStatus(publish)`;
     - sin datos ⇒ `status = deriveReadStatus(query)`;
     - con datos ⇒ `status = { kind: 'ready', refreshing }`, con `refreshing` = está pidiendo sin ser "cargar más";
     - `refreshRetrying` = `{ attempt: failureCount + 1, max: READ_MAX_RETRIES + 1 }` si `hasData &&
       fetchStatus === 'fetching' && failureCount > 0 && !isFetchingNextPage`;
     - `refreshError` = `isRefetchError ? error : null` (V-6);
     - `nextPageError` = `isFetchNextPageError ? error : null`; `stalled` = `nextPageError instanceof
       PaginationStalledError`;
     - `hasNextPage` = el de la query y `!stalled`;
     - `lowerBound`/`end` de la última página;
     - `loadMore` (como `useLobby`) y `retry` (`refetch` de esa query).
   - **Fijado (v1.1, MINOR-1):** `const [pins, setPins] = useState<MyGamesPins>(() => new Map())`;
     `activityItems`/`invitationItems` = páginas aplanadas de cada fuente;
     `const merged = mergeMyGames(activityItems, invitationItems);`
     `const next = extendPins(pins, merged, address); if (next !== pins) setPins(next);` (V-7: `setState` condicional en
     el render); `sections = groupMyGames({ activity: activityItems, invitations: invitationItems, address, pins: next })`,
     que deduplica con la **misma** `mergeMyGames`. El pin y la fila salen siempre de la lectura ganadora de H-2.
   - `unreadableEvents` = suma de `unreadableEvents` de las páginas de invitaciones.
   - `refresh`: `setPins(new Map())`, `resetQueries({ queryKey: queryKeys.myGames(...) })` y `publish.refetch()` si la
     publicación falló.
   - `isFetching` = publicación o cualquiera de las dos queries pidiendo.
4. **`useAccountTxBusy`** (§4).

### 4. Archivos a tocar / NO tocar

- **Modificar:** `app/src/hooks/queryKeys.ts`, `txInvalidation.ts`, `txInvalidation.test.ts`,
  `useExecuteTransaction.test.tsx` (solo las listas esperadas de claves invalidadas, sumando `myGames` al final; cambio
  **a propósito**, declarado en el reporte).
- **Nuevos:** `app/src/hooks/useMyGames.ts`, `useMyGames.test.tsx`, `useAccountTxBusy.ts` (su test va en
  `useMyGames.test.tsx` o en `useAccountTxBusy.test.tsx`).
- **NO tocar:** `sui/` (si falta algo de §4, STOP al MID), `components/`, `pages/`, la máquina de TASK-3.

### 5. Tests obligatorios

- T4-1: `txInvalidation`: las cuatro acciones con cuenta terminan con `myGames` de esa cuenta, en el orden de §3.2;
  sin cuenta, sin `myGames` ni `balance`.
- T4-2: `useExecuteTransaction.test.tsx` en verde con las listas nuevas. Ninguna otra aserción cambia, y la lista de
  líneas tocadas va en el reporte.
- T4-3: sin cuenta ⇒ `no_account` y 0 llamadas a `ledgerService.listEvents`/`getObjects`.
- T4-4: primera carga por fuente: `loading`, `retrying` (intento n de m) y `error` con su error; `ready` con ítems.
- T4-5: el error de una fuente no tapa las secciones de la otra.
- T4-6 (DL-17): con datos, una relectura que reintenta ⇒ `status: ready`, `refreshRetrying` con el intento y las
  secciones intactas; una que falla ⇒ `refreshError`, las secciones intactas; `retry` relee solo esa fuente.
- T4-7: "cargar más" de cada fuente por separado; `nextPageError` sin `stalled` deja `hasNextPage: true`;
  `PaginationStalledError` ⇒ `stalled` y `hasNextPage: false`; `history_pruned` ⇒ `end` y `lowerBound` de la última
  página.
- T4-8 (v1.1, MINOR-1): en la primera aparición, G con dos lecturas distintas en el mismo render (actividad
  `Resolved` con mayor `objectVersion`, invitaciones `Pending`) ⇒ G en `finished` y fijada ahí.
- T4-8 bis: fijado: una invitación `Pending` que tras `invalidateQueries(myGames)` vuelve `Resolved` sigue en
  `invitations`; `refresh` la manda a `finished`.
- T4-9: renders acotados: con datos nuevos, el hook se estabiliza en ≤ 2 renders extra (contador de renders), sin
  bucle.
- T4-10: cambio de cuenta: claves distintas y secciones de la cuenta nueva (sin ítems de la anterior).
- T4-11: `useAccountTxBusy`: `true` con una mutación en curso de la cuenta, `false` con una de otra cuenta y sin cuenta.

### 6. Smoke

No aplica en este task.

### 7. Criterios de aceptación

- T4-1..T4-11 en verde; gate completo en verde; lint 0 sin `eslint-disable` (en especial
  `react-hooks/set-state-in-render`).
- Las únicas aserciones preexistentes que cambian son las listas de claves invalidadas (T4-2).

### 8. Al terminar

Reporte §5. Sin commits ni pushes.

---

## TASK-5: página "Mis partidas" — área: app (`components/`, `pages/`)

### 1. Historia de usuario del task

**Como** jugador con la wallet conectada, **quiero** abrir "Mis partidas" desde el encabezado y ver mis invitaciones,
mis pendientes y mis terminadas, con los botones de cada fila y textos que no me digan "no hay" cuando falta revisar
historial, **para** aceptar, rechazar o cancelar sin buscar enlaces.

### 2. Contexto

- `components/GameActions.tsx`: `GameActions` (`:95-155`), "Conecta tu wallet…" (`:113-115`), aviso `in_flight`
  (`:143`), outcomes de los tres hooks y `adopted`.
- `components/LobbyList.tsx`: modelo de vacío honesto, nota del piso (`FloorSince`), `CreatedAt` (`useTransactionTime`),
  alert de `nextPageError` y botón (`:81-110`).
- `components/ReadState.tsx` (estado de primera carga), `components/txNotice.ts` (`IN_FLIGHT_TEXT`),
  `components/Header.tsx`, `App.tsx` (rutas), `pages/GameDetailPage.tsx:45` (texto R-7).
- Tests modelo: `GameActions.machine.test.tsx` (máquina real con cliente mock), `LobbyList.test.tsx`.

### 3. Qué implementar

1. **Ruta y enlace:** `{ path: 'my-games', element: <MyGamesPage /> }` en `appRoutes`; `<Link to="/my-games">Mis
   partidas</Link>` en `Header`.
2. **`MyGamesPage`:**
   - sin cuenta, el texto fijo;
   - con cuenta, `<MyGamesView key={address} />`, que muestra:
     - `section.my-games` con "Actualizar" (`refresh`, deshabilitado con `isFetching`);
     - `IN_FLIGHT_TEXT` una vez si `useAccountTxBusy()`;
     - el formulario "Abrir partida por ID" (`parseObjectIdInput`; inválido ⇒ "ID de partida inválido" sin navegar ni
       pedir; válido ⇒ `navigate('/game/<id>')`);
     - el enlace "Ver tu historial completo en el explorador" si `explorerAccountUrl(network, address)` no es `null`
       (`target="_blank"`, `rel="noreferrer"`);
     - la nota de ilegibles si `unreadableEvents > 0`;
     - las tres `MyGamesSection` (la 1 con la fuente `invitations`; la 2 y la 3 con `activity`).
3. **`MyGamesSection`:**
   - sin datos de su fuente (`!hasData`), `ReadState` con `retry`;
   - con datos, la nota de relectura (DL-17) y las filas;
   - el pie por `sectionFooter`: texto de vacío, alert, botón ("Cargar más actividad" en 2 **y** 3; en 1, "Buscar más
     atrás" o "Cargar más invitaciones"), "Cargando más…" y nota del piso con `FloorSince`. Reutilizar `FloorSince` y
     `CreatedAt` de `LobbyList`: extraerlos a un componente común si hace falta, sin cambiar el lobby.
4. **`MyGameRow`** (`li.my-game-row[data-game-id]`):
   - contraparte, apuesta, estado, hora (`CreatedAt` con el digest del ítem) y "Ver partida";
   - en "Terminadas", rol y `.my-game-result` (DL-14);
   - en las secciones 1 y 2, `<GameActions game={item.game} variant="row" />`;
   - las ilegibles: "Partida ilegible" con enlace si hay `gameId`.
5. **`GameActions` con `variant`:**
   - en `'row'`, sin el aviso `in_flight` ni "Conecta tu wallet…";
   - con `settled` (H-3), sin `AcceptBlock`, "Cancelar" ni "Rechazar";
   - todo lo demás igual;
   - `'detail'` idéntico a hoy.
6. **R-7:** el texto fijo en `GameDetailPage`.

### 4. Archivos a tocar / NO tocar

- **Nuevos:** `app/src/pages/MyGamesPage.tsx`, `MyGamesPage.test.tsx`, `components/MyGamesSection.tsx`,
  `MyGamesSection.test.tsx` (y `MyGameRow.tsx` si se separa).
- **Modificar:** `App.tsx`, `App.test.tsx`, `components/Header.tsx`, `Header.test.tsx`, `components/GameActions.tsx`,
  `GameActions.test.tsx`, `GameActions.machine.test.tsx` (solo agregados), `pages/GameDetailPage.tsx`,
  `GameDetailPage.test.tsx` (texto R-7). También `components/LobbyList.tsx`, solo si se extraen `FloorSince`/`CreatedAt`,
  con `LobbyList.test.tsx` sin cambios.
- **NO tocar:** `sui/`, `hooks/` (si falta algo, STOP al MID), `index.css` salvo estilos mínimos de las clases nuevas.

### 5. Tests obligatorios

**Navegación y secciones:**

- T5-1: ruta `#/my-games`; enlace "Mis partidas" en el `Header`; sin cuenta, el texto fijo y ninguna lectura.
- T5-2: con datos: las tres secciones con sus filas y textos (contraparte, estado, "Ver partida"); "Terminadas" con
  "Creaste"/"Aceptaste", "Ganaste"/"Perdiste" leído del objeto y la cancelada con su texto.

**Acciones desde las filas** (máquina real, cliente mock):

- T5-3: aceptar desde una fila de invitaciones: etapas; resultado con el `GameResolved` de la fixture; la fila **no se
  mueve** de sección y queda "Resuelta"; ningún token ("Ganaste", "Perdiste", "Recibiste", "ganó quien") en
  `.tx-status`/`.game-actions` antes de la confirmación (SEG-10).
- T5-4: cancelar desde "Tus partidas pendientes" y rechazar desde "Invitaciones recibidas", con su texto de resultado.

**Vacío honesto y relectura:**

- T5-5 (MAJOR-1): sección 2 vacía con `activity.hasNextPage` ⇒ "Sin partidas pendientes en lo revisado" y "Cargar más
  actividad" en la sección 2 **y** en la 3; sin `hasNextPage` ⇒ "No tienes partidas pendientes" y sin botón; ídem
  "Terminadas" y la sección 1 con su fuente; con la cota en el piso, el sufijo "desde <fecha>".
- T5-6 (H-1, MINOR-N1): `nextPageError` sin `stalled` ⇒ sin texto definitivo, **con** el botón (que reintenta) y el
  `role="alert"`; `stalled` ⇒ sin texto definitivo, sin botón y con el alert.
- T5-7 (MINOR-3): aceptar desde una fila con la relectura de DL-7 fallando, y en otra corrida reintentando ⇒ la fila,
  su `GameActions` y el `TransactionStatus` con digest siguen montados; aparece la nota de relectura y "Reintentar" la
  quita al tener éxito.
- T5-8 (MINOR-4): con un evento ilegible en las invitaciones ⇒ "1 evento ilegible en lo revisado" y ninguna fila por
  él.

**Candado y "sin confirmar":**

- T5-9: dos filas con `click()` en el mismo tick ⇒ 1 ejecución; durante la transacción, todos los botones de todas las
  filas deshabilitados e `IN_FLIGHT_TEXT` **una** vez en la página.
- T5-10 (H-3): una fila con `success` propio de aceptar, con el objeto todavía `Pending` (relectura fallida) ⇒ sin
  "Aceptar"/"Rechazar" y con el resultado. En `variant='detail'`, el mismo caso muestra los botones como hoy.
- T5-11: "sin confirmar" en una fila ⇒ bloquea solo esa fila; "Ya la revisé" la desbloquea.

**Cambio de cuenta (MINOR-6):**

- T5-12: A en curso → B (la página remonta: sin filas ni resultado de A) → A con la transacción todavía en curso ⇒ al
  terminar, el resultado adoptado aparece en la fila.
- T5-13: A en curso → B → A ya terminada ⇒ sin resultado; la partida con su estado leído del nodo en su sección
  natural.

**Regresión del detalle y ayudas:**

- T5-14: `variant='detail'`: los tests existentes de `GameActions` y `GameActions.machine` en verde sin cambios (solo
  agregados).
- T5-15 (DL-15): ID inválido ⇒ "ID de partida inválido" sin pedido ni navegación; ID válido (forma corta) ⇒ navega a
  `#/game/<id normalizado>`; enlace del explorador con la config de testnet y ausente en localnet.
- T5-16: texto R-7 en `GameDetailPage` para una invitación creada.

### 6. Smoke

El del ciclo, después de TASK-6.

### 7. Criterios de aceptación

- T5-1..T5-16 en verde; gate completo en verde; los tests de `LobbyList`, `GameDetail` y `GameDetailPage` (salvo R-7)
  sin cambios.
- Componentes sin lógica de negocio (ARQ-2): reglas en `sui/` (`sectionFooter`, `groupMyGames`) y `hooks/`.
- Ningún import de `@mysten/*` fuera de `/ui` en `components/`/`pages/`.

### 8. Al terminar

Reporte §5 con una captura opcional (no sustituye el reporte). Sin commits ni pushes.

---

## TASK-6: docs del ciclo — área: docs

### 1. Historia de usuario del task

**Como** desarrollador u owner que llega después, **quiero** que los READMEs digan cómo salen "Mis partidas", qué
límites tienen sin indexador y qué cambió en la máquina, **para** no redescubrirlo leyendo el código.

### 2. Contexto

`app/README.md`: "Lecturas (#10)" (`:148-194`, incluido "Listas por eventos (lo hereda #13)"), "Transacciones (#11,
#12)" (`:196-289`), mapa de `sui/` (`:92-119`) y tabla de hooks (`:121-135`). `contracts/README.md`, "Lectura desde la
app" (listas del lobby).

### 3. Qué implementar

- **`app/README.md`:**
  - **sección nueva "Mis partidas (#13)":**
    - fuentes (DL-1) con el filtro por remitente y el escaneo de invitaciones;
    - estado del objeto, invariantes e ilegibles;
    - secciones, fijado y deduplicación (versión del objeto; legible sobre ilegible);
    - pie honesto (DL-16/H-1) y relectura sin desmontar (DL-17);
    - paginación (50 / 1; 50 / 2 / 20);
    - invalidación, con su costo, el corrimiento de la ventana (RM-12) y la duración de "Actualizando datos…" con
      reintentos (H-4);
    - aviso único y acciones ocultas tras un éxito propio en la fila (H-3);
    - ayudas de D-20261103-03;
  - **"Límite sin indexador":**
    - ventana del nodo (~14,6 días);
    - **el caso del creador** (una partida creada antes de la ventana no aparece aunque se haya resuelto después);
    - costo del escaneo de invitaciones según el volumen del paquete;
    - sin filtro por campo;
    - D-20261103-03 y el seguimiento post-MVP;
  - **mapa de `sui/`:** `eventScan.ts`, `myGames.ts`, `explorerAccountUrl`;
  - **hooks:** `useMyGames`, `useAccountTxBusy`, claves `myGames`/`myActivity`/`myInvitations`;
  - **en "Transacciones":**
    - etapa por clave;
    - cuenta y `targetHash` en las variables, firma con `account` e `interpret(result, signer)`;
    - los límites de DL-11;
    - la fila nueva de la tabla de invalidación;
  - **"Listas por eventos (lo hereda #13)"** pasa a referir a la sección nueva.
- **`contracts/README.md`,** "Lectura desde la app": las listas de "mis partidas" (DNF con `sender`, V-2) y lo medido en
  S-1/S-2 (TASK-1).
- **`agents.md` §4** ("Indexado"): precisar "mis partidas: filtro por remitente; invitaciones por escaneo" si hace falta.
- **Snippet para `documents/STATUS.md`** (en el reporte; lo aplica el orquestador). `documents/DECISIONES.md` no se toca.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `app/README.md`, `contracts/README.md` y, si aplica, `agents.md`.
- **NO tocar:** código, `documents/DECISIONES.md`, `documents/STATUS.md` (va como snippet).

### 5. Tests obligatorios

No hay tests nuevos. El gate completo de la app sigue en verde (sin delta).

### 6. Smoke

Después de este task, el del ciclo.

### 7. Criterios de aceptación

- Docs coherentes con el código de TASK-2..5 (PROY-20), con números (tests, build) del último reporte.
- `git diff` solo en docs; grep de claves, rutas personales y hex de 40-64 vacío.

### 8. Al terminar

Reporte §5 con el snippet de STATUS. Sin commits ni pushes.

---

## Smoke del ciclo (después de TASK-6; runbook en la forma de AGENTE_MID §M5)

Al aprobarse TASK-6, el MID copia esta sección a `documents/SMOKE_MY_GAMES.md` (con el estado "EN CURSO") y el DEV la
completa **durante** la corrida: las columnas "Resultado obtenido" y "Estado" nunca se llenan por adelantado.

```markdown
# SMOKE_MY_GAMES
> Plan: PLAN_MY_GAMES v2 | Handoff: HANDOFF_MY_GAMES v<versión vigente> | Issue: #13 | Fecha: <día de la corrida> |
> Estado: EN CURSO
```

### Precondiciones

- **Worktree:** `<repo>`, branch `feature/issue-13-my-games` con TASK-1..6 commiteadas; `npm ci` con Node 26; gate de la
  app en verde (reporte de TASK-6). Nada de esta corrida se commitea salvo `documents/SMOKE_MY_GAMES.md`.
- **Red:** localnet **aislada** (`agents.md` §3), `env.sh` + `ids.env` + `smoke_guard`, publicación **variante B**, cierre
  del paso 7. **Una sola localnet** (`ss -ltn` sin `:9000`). **Regla B4:** todo `suic` con `PRE`, también los de lectura.
- **Testnet:** nada.
- **Cuentas:**
  - de la génesis, en `ids.env` (no se pegan): `ADMIN`, `A` (fondea las burners) y `C` (solo CLI: invitaciones y
    partidas en lote);
  - wallets de la app: **dos burners**, `AW` en `T1` y `BW` en `T2`, fondeadas con 2 SUI cada una por CLI desde `A`;
  - nunca `new-address`; nadie firma como una burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Navegador (🌐):**
  - Chrome headless + CDP con perfil desechable `<SMOKE_DIR>/chrome-profile`, con `HOME`/`XDG_*` aislados en
    `<SMOKE_DIR>/chrome-home`, `--remote-debugging-address=127.0.0.1` y el puerto 9229. Arranque (v1.1, la línea de
    #12), como comando en segundo plano del harness: `. <SMOKE_DIR>/chrome.env && echo $$ > "$SMOKE_DIR/chrome.pid" &&
    exec "$CHROME" --headless=new --no-first-run --no-default-browser-check --user-data-dir=<SMOKE_DIR>/chrome-profile
    --remote-debugging-address=127.0.0.1 --remote-debugging-port=9229 about:blank > "$SMOKE_DIR/chrome.log" 2>&1`.
    `chrome.env` exporta `CHROME` (ruta literal del binario) y `HOME`/`XDG_*` dentro de `<SMOKE_DIR>/chrome-home`;
  - en la máquina corre el Chrome del usuario: el smoke solo mata **su** PID (`chrome.pid`), nunca `pkill`/`killall`;
  - cliente CDP propio en Node 26 sin dependencias, en `<SMOKE_DIR>` (no se commitea);
  - **cada pestaña con `Target.createTarget({ url, newWindow: true })`**, todas visibles, **nunca** `Page.bringToFront`;
  - después de fondear una burner se navega solo por hash (`location.hash`): recargar cambia su dirección;
  - campos con foco + `Input.insertText`; clics con `element.click()` en `Runtime.evaluate`.
- **Archivos de entorno** (rutas literales en el archivo real; aquí placeholders):
  - `env.sh` (solo `sui`/`suic`), `app.env` (`NODE`, `VITE_JS`, `PATH` de Node 26; no toca `HOME` ni `SUI_CONFIG_DIR`) y
    `chrome.env`, nunca dos en la misma llamada;
  - procesos en segundo plano del harness con `exec` y PID en `<SMOKE_DIR>`: `sui.pid`, `vite.pid` y `chrome.pid`.
- **Pedidos en CDP** por sesión (`Network.requestWillBeSent`), por método gRPC-web: `ListEvents`, `BatchGetObjects`,
  `SimulateTransaction`, `ExecuteTransaction`, `GetTransaction`. Por acción con burner: **2** `SimulateTransaction` + **1**
  `ExecuteTransaction`. Las lecturas `net::ERR_ABORTED` del doble montaje de `StrictMode` no cuentan (se anotan).
- **Observador:** antes de cada acción, `Runtime.evaluate` instala un `MutationObserver` que guarda en `window.__txLog`
  `[performance.now(), selector, texto]` de `.tx-status` y `.game-actions` de la fila, y aparte de `.my-game-result`.
- **Tokens de resultado (SEG-10, con mayúsculas exactas):** "Ganaste", "Perdiste", "Recibiste", "ganó quien".
  - Ninguno puede aparecer en `.tx-status`/`.game-actions` mientras se vean "Verificando la transacción…", "Esperando la
    firma en la wallet…" o "Confirmando en la red…".
  - `.my-game-result` es una lectura del nodo y está permitida.
- **Textos y selectores esperados:** §1 ("Textos fijos", "Selectores estables"). Montos de referencia con 250 bps:
  - 0,2 SUI ⇒ pozo 0,4, comisión 0,01, al ganador 0,39;
  - 0,001 SUI ⇒ pozo 0,002, comisión 0,00005, al ganador 0,00195.
- **Qué se pega:** IDs y direcciones abreviados o por rol; digests completos; nunca `sender`/`owner`, archivos de
  `<SMOKE_DIR>/net` ni logs completos.

### Pasos

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| 0 | DEV: preparación (§3 paso 2) + `app.env` + `chrome.env`. Línea base: `stat -c '%y %s %n'` y `ls` de `<HOME real>/.sui/sui_config/` (nunca `cat`); `test ! -e <repo>/contracts/deployments/localnet.json`; `test ! -e <repo>/contracts/Published.toml` y ningún `<repo>/contracts/Pub.*.toml`; `ss -ltn` sin `:9000`, `:9123`, `:9184`, `:5003`, `:5173` ni `:9229`; ningún `sui start` de otra sesión; `git status --porcelain` | Línea base anotada; sin `localnet.json`, `Published.toml` ni `Pub.*.toml` (si existe alguno, se detiene y se avisa); 6 puertos libres; árbol limpio | (se llena durante la corrida) | ⏳ |
| 1 | DEV: génesis y arranque (`sui.pid`); `PRE suic chain-identifier`; `suic addresses --json` ⇒ `ADMIN`, `A`, `C` a `ids.env`; publicación variante B (`PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"`); `PKG`, `HOUSE`, `CAP` a `ids.env`; `update_fee_rate` 250 | Red arriba; `active-env` = `localnet`; exit 0; `localnet.json` ignorado por git; `Move.lock` sin delta; `FeeRateUpdated` 0 → 250 | | ⏳ |
| 2 | DEV: `vite` dev en segundo plano (`. <SMOKE_DIR>/app.env && cd "$REPO/app" && echo $$ > "$SMOKE_DIR/vite.pid" && VITE_SUI_NETWORK=localnet exec "$NODE" "$VITE_JS" --host 127.0.0.1 --port 5173 --strictPort > "$SMOKE_DIR/vite.log" 2>&1`) y, en otra llamada en segundo plano, Chrome con la línea de las precondiciones (`chrome.pid`); `curl -sf http://127.0.0.1:5173/`; `curl -sf http://127.0.0.1:9229/json/version`. 🌐 `T0` sin conectar (`newWindow`) en `#/my-games` | 200 con `<div id="root">`; CDP solo en 127.0.0.1; `T0`: "Conecta tu wallet para ver tus partidas e invitaciones"; **0** `ListEvents` en `T0` | | ⏳ |
| 3 | 🌐 `T1` y `T2` (`newWindow`, `Network.enable`); conectar `AW` en `T1` y `BW` en `T2` (burner del kit); direcciones del `title` de `.account-badge` a `ids.env`. DEV: `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c --transfer-objects "[c]" @$AW` (y `@$BW`); 🌐 `#/nada` → `#/` | `document.visibilityState === 'visible'` en `T1` y `T2`; saldo 2 SUI en el formulario de cada una; mismas direcciones (sin recarga) | | ⏳ |
| 4 | 🌐 `T1` (`AW`) crea `G1` abierta de 0,1 SUI y `G2` de 0,2 SUI invitando a `BW` desde el formulario (IDs a `ids.env`) | Navega al detalle en cada una; el aviso de `G2` dice "…guárdalo, o encuéntrala en «Mis partidas»" (R-7) | | ⏳ |
| 5 | 🌐 `T1`: clic en "Mis partidas" del encabezado | `#/my-games`; "Tus partidas pendientes" = `G1` ("Abierta") y `G2` ("Invitación a `BW`"), cada una con "Cancelar"; "Invitaciones recibidas": "No tienes invitaciones pendientes"; "Terminadas": "Todavía no hay partidas terminadas"; sin "Cargar más actividad"; "Abrir partida por ID" visible; sin enlace al explorador (localnet) | | ⏳ |
| 6 | 🌐 `T2`: "Mis partidas"; después `#/` | "Invitaciones recibidas" = `G2` ("Te invitó `AW`", 0,2 SUI) con "Aceptar", "Rechazar" y la nota de la vista previa; `G1` no está en las listas de `BW`; en el lobby (`#/`), `G1` sí aparece y `G2` no (lobby sin cambios) | | ⏳ |
| 7 | DEV: `PRE act_as "$C" && suic ptb --split-coins gas "[50000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 "some(@$AW)"` (`G3`). 🌐 "Actualizar" en `T1` y en `T2` (`#/my-games`) | `T1`: `G3` en "Invitaciones recibidas" ("Te invitó `C`", 0,05 SUI); `T2`: no aparece | | ⏳ |
| 8 | 🌐 `T2`: observador; clic en "Aceptar" de la fila de `G2` (muestreo cada 250 ms). DEV: `PRE suic tx-block <digest> --json` (`GameResolved`); `PRE suic balance $AW` y `PRE suic balance $BW` antes y después | Etapas en orden; **ningún token** en `.tx-status`/`.game-actions` durante las tres primeras etapas; después "¡Ganaste! Recibiste 0.39 SUI (pozo 0.4 SUI − comisión 0.01 SUI)" o "Perdiste: ganó quien creó la partida y recibió 0.39 SUI (…)", con el digest; 2 `SimulateTransaction` + 1 `ExecuteTransaction`; la fila de `G2` **sigue** en "Invitaciones recibidas" con "Resuelta" y sin botones; `GameResolved` `pot` 400000000, `fee` 10000000, `payout` 390000000, ganador coherente con el texto | | ⏳ |
| 9 | (RM-5) DEV: `C` crea en **un PTB** 25 invitaciones a `AW` de 1000000 MIST (`PRE act_as "$C" && suic ptb --split-coins gas "[1000000,…×25]" --assign c` + 25 `create_game` con `"some(@$AW)"`, sintaxis de TASK-1). 🌐 `T1`: marca de tiempo, "Actualizar", y espera hasta ver ≥ 25 `li.my-game-row` en `invitations`; después, clic en "Aceptar" de una de ellas (`G4`) con marca hasta "Verificando la transacción…" | ≥ 26 filas (las 25 más `G3`), cada una con `GameActions`; tiempos anotados (referencia, sin umbral bloqueante); la aceptación de `G4` termina como en el paso 8 (montos de 0,001 SUI), su fila queda sin botones (H-3) y las demás se rehabilitan al final | | ⏳ |
| 10 | 🌐 `T2`: "Actualizar" | `G2` pasa a "Terminadas" con "Aceptaste" y `.my-game-result` coherente con el paso 8; "Invitaciones recibidas": "No tienes invitaciones pendientes" | | ⏳ |
| 11 | 🌐 `T1`: "Actualizar" | "Terminadas": `G2` con "Creaste" y el resultado **complementario** del paso 8, y `G4` con "Aceptaste"; "Tus partidas pendientes" = solo `G1` | | ⏳ |
| 12 | 🌐 `T1`: clic en "Cancelar" de `G1`. DEV: `PRE suic tx-block <digest>` (`GameCancelled`) | "Partida cancelada: se devolvieron 0.1 SUI a tu cuenta"; la fila queda "Cancelada" y sin botones en "Tus partidas pendientes"; tras "Actualizar", `G1` en "Terminadas" con "Cancelada: la apuesta volvió a quien la creó" y "Tus partidas pendientes": "No tienes partidas pendientes" | | ⏳ |
| 13 | 🌐 `T1`: clic en "Rechazar" de `G3`. DEV: `PRE suic balance $C` antes y después; `PRE suic tx-block <digest>` | "Invitación rechazada: se devolvieron 0.05 SUI a quien te invitó"; `GameCancelled.refund` 50000000; tras "Actualizar", `G3` ya no está en las listas de `AW` | | ⏳ |
| 14 | DEV: dos `PRE act_as "$C" && suic ptb …`: 2 invitaciones a `BW` de 1000000 MIST (`G5`, `G6`). 🌐 `T2`: "Actualizar"; en un mismo `Runtime.evaluate`, `click()` en "Aceptar" de la fila de `G5` y de la de `G6`; después, "Aceptar" de `G6` | Primer intento: **1** `ExecuteTransaction` (la de `G5`); durante ella, el botón de `G6` deshabilitado e `IN_FLIGHT_TEXT` **1** vez en `section.my-games` (contar ocurrencias); después `G6` se acepta con su propia transacción | | ⏳ |
| 15 | DEV: `PRE act_as "$C" && suic ptb …`: 1 invitación a `BW` (`G7`); después, en uno o dos `PRE act_as "$C" && suic ptb …`, ≥ 101 partidas abiertas (`none`). 🌐 `T2`: "Actualizar" | "Invitaciones recibidas" sin `G7`: "Sin invitaciones pendientes en lo revisado" y "Buscar más atrás" (nunca "No tienes invitaciones pendientes"); tras "Actualizar", **3** `ListEvents` en total (2 de invitaciones + 1 de actividad: CDP no separa la fuente sin decodificar el cuerpo; los `net::ERR_ABORTED` del doble montaje no cuentan); al pulsar "Buscar más atrás", **+1 o +2** `ListEvents` y aparece `G7` (DL-8, DL-16) | | ⏳ |
| 16 | 🌐 `T1`: "Abrir partida por ID" con `xyz` y después con el ID de `G1` | `xyz` ⇒ "ID de partida inválido", sin pedidos nuevos; `G1` ⇒ `#/game/<G1>` con el detalle "Cancelada" | | ⏳ |
| 17 | 🌐 `T2`: recargar (burner nueva = otra cuenta), conectar y `#/my-games` | (v1.1, MINOR-2) Con > 100 `GameCreated` en la red: "Tus partidas pendientes" y "Terminadas" con el texto definitivo (la DNF de una cuenta sin actividad termina en `CHECKPOINT_BOUND`); "Invitaciones recibidas" con "Sin invitaciones pendientes en lo revisado" y "Buscar más atrás"; tras pulsarlo **una** vez, "No tienes invitaciones pendientes" y sin botón (H-1 de punta a punta); ninguna fila de `BW` (DL-9) | | ⏳ |
| 18 | DEV: cierre = §3 paso 7 de `agents.md` más la app: `kill` por PID de Chrome (`chrome.pid`), `vite` (`vite.pid`; exit 143 esperado) y `sui` (`sui.pid`; exit 144 esperado); **en otra llamada**, `kill -0` falla en los tres; `pgrep -af <SMOKE_DIR>/chrome-profile` vacío (el Chrome del usuario no se toca); `ss -ltn` con 9000, 9123, 9184, 5003, 5173 y 9229 libres; recién entonces `rm -f <repo>/contracts/deployments/localnet.json`, `rmdir <repo>/contracts/deployments 2>/dev/null \|\| true`, `rm -rf <SMOKE_DIR>` (perfil incluido) y `test ! -e`; **sin cargar `env.sh`**, `stat`/`ls` de `<HOME real>/.sui/sui_config/` idénticos a la línea base; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Published.toml` ni `contracts/Pub.*.toml`; `git status --porcelain` solo con `documents/SMOKE_MY_GAMES.md` | Todo limpio; `~/.sui/` sin cambios | | ⏳ |

### Qué no cubre este smoke (y dónde está cubierto)

- **Solo con tests:**
  - el vacío "en lo revisado" de las secciones 2 y 3 con más de 50 eventos propios (la burner no los genera por CLI):
    T2-16, T5-5;
  - el error de "cargar más" sin `stalled`: T5-6;
  - la relectura fallida: T4-6, T5-7;
  - los eventos ilegibles: T2-10, T5-8;
  - el cambio de cuenta **sin** recargar (la burner no lo permite): T3-2..T3-6, T5-12, T5-13.
- **#17 (owner, testnet):**
  - wallet de extensión con cambio de cuenta y con `account` explícito (RM-9);
  - listas con historial podado ("desde <fecha>") y el caso del creador de D-20261103-03;
  - el contenido del enlace al explorador.

### Reporte final

- Pasos PASA/TOTAL:
- Hallazgos (n.º de paso + digest / output):
- Veredicto: [PASA | NO PASA]

## Riesgos (del plan, RM-n)

| # | Riesgo | Dónde se mitiga |
|---|---|---|
| RM-1 | El nodo local no filtra por remitente | TASK-1 S-1 (STOP si falla) |
| RM-2 | El escaneo de invitaciones crece con el volumen | DL-8, DL-16; seguimiento post-MVP |
| RM-3 | Ventana de ~14,6 días y caso del creador | D-20261103-03; DL-15; TASK-6 |
| RM-4 | Cursor en medio de una transacción | TASK-1 S-2; T2-7 |
| RM-5 | Muchas filas con su máquina | Paso 9 del smoke |
| RM-6 | Una resuelta sigue un rato en "Invitaciones recibidas" | Estado visible y sin botones (H-3); "Actualizar" |
| RM-7 | Candado por pestaña (R-5 de #12) | Sin cambios |
| RM-8 | El cambio de cuenta no se reproduce con la burner | TASK-3, TASK-5; #17 |
| RM-9 | Una wallet de extensión rechaza `account` | Error honesto sin digest; #17 |
| RM-10 | Bundle | #15 |
| RM-11 | La extracción cambia el lobby | T2-18; paso 6 |
| RM-12 | `invalidate` relee en serie todas las páginas; con reintentos, "Actualizando datos…" y el candado duran hasta que terminan (H-4); la ventana de invitaciones se puede correr | `app/README.md` (TASK-6) |
| RM-13 | Tras una relectura fallida, una fila puede tener un estado viejo | Nota DL-17; H-3 oculta la acción si hubo éxito propio; la preflight frena (`game`/4) |

## Archivos que NO se tocan en todo el ciclo

`contracts/sources/`, `contracts/tests/`, `contracts/Move.lock`, `contracts/scripts/`, `contracts/fixtures/`,
`contracts/deployments/`, `package.json`, `app/package.json`, `package-lock.json`, `.npmrc`, `.github/`,
`app/eslint.config.js`, `app/scripts/`, `documents/DECISIONES.md`. El worktree de #8 no se toca.
