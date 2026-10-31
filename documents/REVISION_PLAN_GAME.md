## Veredicto: REQUIERE CAMBIOS (0 🔴 · 1 🟠 · 6 🟡 · 4 🔵): el diseño es correcto y conserva fondos; hay que completar la evidencia de D3 y precisar 6 puntos antes de presentar los STOPs

> Revisión MAYOR del plan · 2026-10-30 · `documents/PLAN_GAME.md` **v1** (archivo sin trackear en
> `feature/issue-3-ci` @ `d68431e`; `git diff --stat master HEAD -- contracts` vacío, así que el código de contratos
> es idéntico a `master` @ `c2a1e42`) · issue #5 (+ 2 comentarios) e issue #6 (+ 1 comentario) · primera ronda, sin
> hallazgos previos.
> Evidencia propia: framework en `~/.move/git/…719fb2960ccfbf9f4d33041f8ea5146d30671696` y fuentes de
> `MystenLabs/sui` @ `testnet-v1.83.0` descargadas con `gh api` (todas las rutas de la CLI citadas abajo son de
> `sui-execution/latest/`: en PV 139/140 el executor es `execution_version = 4` = `latest`, ver hallazgo 7). No
> ejecuté gates (D-20261030-02), no corrí `sui` y no toqué `~/.sui/`.

### Resumen

Es el plan más sólido del ciclo hasta ahora. Las afirmaciones técnicas del MID se sostienen contra el código: `Option<address>`
como argumento puro, el `Coin` de `SplitCoins` hacia una `entry` privada, que los enums tienen que ser `public` y no aceptan variantes nuevas, el borrado de objetos compartidos y
los avisos del compilador. Los fondos se conservan en crear, cancelar y rechazar, y ningún reembolso depende de la House ni de la versión
(D-12 §4 se cumple por construcción). La authZ deniega por defecto y cada caso denegado tiene su test. Lo que impide aprobar es que la evidencia de D3 subestima ("monto
pequeño") un costo que es del orden de 2 veces `min_bet`, y el usuario va a decidir con esa evidencia. El resto son precisiones.

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| 1 | 🟠 MAJOR | SEG-4 (fondos del usuario), FLUJO §4 (STOP con evidencia), M3 | `PLAN_GAME.md:258-267` (D3) | La contra de (a) dice que el storage "no se reembolsa (…monto pequeño, no se fija aquí)". No es pequeño en relación con la apuesta. Con 100 unidades por byte de datos (`crates/sui-protocol-config/src/lib.rs:2788`, más 50 no reembolsables `:2789`) por el precio de storage de la época (lo fija el system state; históricamente 76 MIST, valor no medido en esta revisión), un `Game` de unos 250–350 B (UID, 3 direcciones, `Option`, 3 `u64`, `u16`, tag del enum, más los metadatos del objeto) cuesta **≈ 0,002–0,003 SUI de depósito**, es decir unas **2–3 veces `min_bet`** (0,001 SUI, `house.move:25`). Con (a) ese depósito no se recupera nunca. Con (b) vuelve el 99,99 % (`storage_rebate_rate = 9999` desde PV 139, `lib.rs:4907`) a quien firma la transacción que borra: el creador al cancelar, el **invitado** al rechazar y el **aceptante** al resolver (#6). Falta además el argumento más fuerte a favor de (a): **es reversible**. Una versión futura puede agregar una `entry` que borre partidas terminales (agregar funciones es compatible, y borrar un compartido tomado por valor está permitido, `execution/context.rs:2311-2337`). (b), en cambio, no tiene vuelta atrás: se pierden el enum y la lectura por ID. | El usuario elige D3 creyendo que el costo es despreciable. En el MVP, cada partida de 0,001 SUI deja al creador unos 0,002+ SUI inmovilizados para siempre, un costo que nadie le comunicó y que la UI (#11) no muestra. | En D3: (1) poner la fórmula y el orden de magnitud con estas citas, y aclarar que el valor exacto se mide en el smoke de #6 (`storageCost`/`storageRebate` de crear y cancelar en el gas summary). (2) Decir quién recibe el rebate en (b) en cada camino. (3) Agregar a (a) el pro "reversible: una versión futura puede agregar el borrado de partidas terminales con rebate al creador (issue de seguimiento si el usuario lo quiere)". (4) Agregar una nota para #11: mostrar el costo de crear. La recomendación (a) se mantiene. |
| 2 | 🟡 MINOR | LIM-1, build | `:181` vs `:216` | El plan define un `fun is_pending(game: &Game): bool` privado **y** una lectura `#[test_only]` llamada `is_pending` (y `is_cancelled`). Son dos funciones con el mismo nombre en el mismo módulo. | `sui move build` falla por función duplicada. Tal como está escrito, el plan no compila y el DEV tiene que improvisar un nombre que después queda en la tabla del README. | Fijar los nombres. Propuesta: el helper privado `is_pending` (lo usan `cancel_game`, `reject_game` y #6) y, para los tests, `#[test_only] public fun is_pending_for_testing` / `is_cancelled_for_testing`, o bien el sufijo `_for_testing` en todas las lecturas `#[test_only]`, que es más uniforme. |
| 3 | 🟡 MINOR | D-11 §7, D-12 §4, LIM-5 (nota para #6) | `:229`, `:327-333` | DV (b) dice que #6 agrega `assert!(game.version == <versión del paquete>, EWrongVersion)`, pero `game` no tiene acceso a la versión del paquete: `house::VERSION` es una constante privada (`house.move:21`) y `house.version()` no hace chequeo (`:181-183`). Además, el plan no dice qué consecuencia tiene la igualdad estricta para el producto. | #6 agrega un `const VERSION` propio en `game` (dos fuentes de verdad que pueden divergir en la v2, LIM-5) o toca `house.move`. Después de un upgrade y `migrate`, toda partida `Pending` de la versión anterior deja de poder aceptarse: la v vieja aborta en `add_fees` y la nueva en el `assert`. Solo se puede cancelar, y la UI la seguiría mostrando como abierta. | En DV (b) y en la tabla "Lo que #6 extiende": #6 compara `game.version == house.version()` **después** de una lectura con chequeo de versión (`fee_rate()`/`add_fees`), que es el mismo argumento de `:164-167`. En el README (Versionado) y en `agents.md` §7: "tras un upgrade, las partidas pendientes de versiones anteriores solo se cancelan o rechazan, salvo que la versión nueva decida aceptarlas". |
| 4 | 🟡 MINOR | ARQ-6, PROY-13, PROY-20 | `:218-219`, TASK-2 `:427-435` | La decisión "lecturas solo `#[test_only]`" es correcta: la app lee el objeto por RPC y ve todos los campos, sin importar la visibilidad en Move. Pero TASK-2 no documenta **cómo** llega el estado al cliente, y #10 lo necesita para el parser. Lo verifiqué: en JSON-RPC un enum se serializa como `{"variant": "Pending", "fields": {}}` (`crates/sui-json-rpc-types/src/sui_move.rs:513-534`), y en gRPC/GraphQL como un objeto con `"@variant"` (`crates/sui-types/src/object/rpc_visitor/mod.rs:247-256`). `stake` llega como el valor del `Balance`. | Sin esa documentación, #10 tiene que leer el código Move o probar contra un nodo para saber cómo viene `state`. Si mezcla los dos formatos, el parser falla en silencio y muestra una partida resuelta como abierta, lo que va contra SEG-10. | En el README, dentro de la sección Game, agregar una subsección "Lectura desde la app": `getObject` con contenido, campos del `Game`, la forma de `state` en JSON-RPC y en gRPC/GraphQL, y la aclaración de que no hay getters `public` a propósito (PROY-4: se pueden agregar después de forma compatible). |
| 5 | 🟡 MINOR | PROY-10, impacto en #18 | `:61-67` | (a) El plan no dice cómo afecta a #18 que `GameState` quede cerrado. Verificado: un upgrade no puede agregar variantes (`compatibility.rs:192-193` + `compatibility_mode.rs:209-211, 273-275`) ni campos a `Game`. La batalla naval real necesita un estado "en juego" que persista entre transacciones, así que #18 tendrá que usar un tipo nuevo o dynamic fields sobre `Game.id`. (b) La frase "Por eso #5 fija ahora también la variante `Resolved`" atribuye la decisión a la compatibilidad, pero #6 se mergea antes de publicar (#8), así que todavía podría cambiarla. El motivo real es evitar retrabajo. | Alguien planifica #18 suponiendo que puede agregar `Active`/`InBattle` a `GameState` y lo descubre recién al hacer `sui client upgrade`. | Corregir la justificación de `:66-67`. Agregar al README (Versionado), a PROY-10 y a la nota de §6/§8 de `agents.md`: "`GameState` y el layout de `Game` se congelan en #8; #18 requiere un objeto nuevo o dynamic fields". Comentarlo en el issue #18 al aprobar el plan. |
| 6 | 🟡 MINOR | PROY-9, SEG-2, LIM-8 | `:87-90`, tests `:372-405` | El orden de los aborts es parte del contrato: el README lo publica "en orden" para #11 (`:430`) y el plan fija "authZ antes que estado". Sin embargo, solo el orden "versión primero" de crear tiene un test que lo fije (test 9). | Si una refactorización invierte los `assert!` de `cancel_game`, un tercero que cancela una partida ya cancelada recibe `ENotPending` en lugar de `ENotCreator`. Eso filtra el estado al no autorizado y desalinea el mapeo de #11, y los 23 tests siguen en verde. | Agregar 2 tests (el total pasa de ≥ 23 a ≥ 25; el DoD, de ≥ 49 a ≥ 51): `test_cancel_by_other_on_cancelled_game_reports_not_creator` (`ENotCreator`) y `test_create_reports_bet_error_before_self_invite` (apuesta < mínima con auto-invitación da `EBetTooLow`). |
| 7 | 🟡 MINOR | Regla de evidencia (M3) | `:63-65`, `:118`, `:121-122`, `:188-191`, `:256`, `:299-301` | Las rutas de la CLI se citan sin el prefijo. `entry_points_verifier.rs`, `private_entry_arguments.rs` y `execution/context.rs` existen en **5 copias** (`sui-execution/historical-versions/v0..v3` y `latest`) con distinto número de líneas. El código que rige en testnet es `latest`: `execution_version = 4` desde PV 119 (`crates/sui-protocol-config/src/lib.rs:4646-4648`, despacho en `sui-execution/src/lib.rs:41`). Además, `entry_points_verifier.rs:222-262` no existe: el archivo termina en la línea 260. | Un revisor o #11 abre otra copia (por ejemplo, `v3/…/context.rs` tiene 1539 líneas) y no encuentra la evidencia. | Citar `sui-execution/latest/sui-verifier/src/entry_points_verifier.rs:222-260`, `sui-execution/latest/sui-adapter/src/static_programmable_transactions/typing/verify/private_entry_arguments.rs:381-395, 426-445, 497-529` y `…/execution/context.rs:2311-2337`, con una línea que explique por qué rige `latest`. |
| 8 | 🔵 SUGGESTION | Robustez de verificación | `:412`, `:479`, `:487` | `git diff master` compara contra la punta de `master`. Si #3 se mergea antes del PR de #5 y la branch no se actualiza, el diff incluye cambios ajenos. Por ahora solo aparecen como líneas `-`, así que no hay falso positivo de secretos, pero `--stat` sí puede mostrar archivos. | El DEV reporta un `--stat` con deltas que no son suyos. | Usar `B=$(git merge-base master HEAD)` y `git diff $B …`, o pedir al orquestador que actualice la branch con `master` antes de cada reporte. |
| 9 | 🔵 SUGGESTION | LIM-7, estilo de `house.move:32-34` | `:98-107` | En el modelo, los campos del struct llevan comentarios `//` al final de la línea, mientras que la House documenta sus campos con `///`. | Hay inconsistencia de estilo entre módulos, y `//` no aparece en la documentación generada. | En `game.move`, `///` sobre los campos que lo necesiten (`version`, `opponent`, `stake`, `fee_rate`). |
| 10 | 🔵 SUGGESTION | D-20261030-14 | `:360` | El plan deja `game_tests.move` sin cabecera para seguir el modelo (`house_tests.move:1`). D-14 dice "los fuentes Move (`house.move` y los que vengan)", lo que no zanja si los tests cuentan como fuentes. | Que se interprete distinto en cada PR. | Mantener lo que propone el plan (sin cabecera en los tests, igual que el modelo) y pedir al orquestador que lo pregunte al usuario en el mismo informe de STOPs (una línea: "¿cabecera también en `tests/*.move`?"). Si la respuesta es sí, se hace en un PR de chore que cubra los dos archivos de tests. |
| 11 | 🔵 SUGGESTION | Tests 21-22 | `:401-403` | Con la House en `NEWER_VERSION`, `house.fees_collected()` aborta con `house::EWrongVersion`. | Si el DEV copia la verificación "`fees_collected` sin cambios" del test 10, el test aborta con otro código. | En 21-22, la House solo se lee con `version()`, o no se lee. Basta con verificar el `Coin` del creador, `stake` = 0 y el estado. Anotarlo en el handoff. |

### Validado como correcto (con evidencia)

- **`Option<address>` como argumento puro de una `entry`:** `is_primitive` acepta `0x1::option::Option<T>` con `T`
  primitivo (`crates/sui-types/src/lib.rs:277-303`), y el verificador de entry lo exige así
  (`sui-execution/latest/sui-verifier/src/entry_points_verifier.rs:222-260`).
- **`Coin` de `SplitCoins` hacia una `entry` no `public`:** una `entry` privada rechaza solo argumentos de un clique
  "caliente" (`private_entry_arguments.rs:381-395`, chequeo en `:497-523`). Un clique se calienta por un valor sin
  `drop` ni `store` (`:526-529`) o por consumir un objeto con permisos restringidos
  (`typing/translate.rs:1381-1421`: solo inputs con `refined_permissions != ALL`). `SplitCoins` solo fusiona cliques
  (`:426-445`), y `Coin<SUI>` tiene `store`, así que la PTB `splitCoins(gas,[m])` + `create_game(house, coin, opt)` pasa.
- **Enums:** tienen que ser `public` (`external-crates/move/crates/move-compiler/src/parser/syntax.rs:3692-3712`). Un
  upgrade no puede agregar variantes (`compatibility.rs:192-193`, `compatibility_mode.rs:209-211, 273-275`) ni
  habilidades (`upgrade_check`: `disallowed_new_abilities: ALL`, `compatibility.rs:76-82`). Las `entry` no
  `public` pueden cambiar (`check_private_entry_linking: false`, mismas líneas; `compatibility_mode.rs:231-233, 270-272`).
  Impacto: #6 no está restringido (va antes de #8). Sobre #18, ver el hallazgo 5.
- **Borrado de compartidos:** un compartido tomado por valor tiene que terminar re-compartido o borrado
  (`sui-execution/latest/…/execution/context.rs:2311-2337`).
- **Avisos del compilador:** existe `UnusedItem::Constant` (`diagnostics/codes.rs:369`), así que es correcto no
  declarar en #5 los aborts de #6. `Pack` marca todos los campos como usados (`hlir/translate.rs:1371-1377`), y
  `gen_unused_warnings` solo recorre structs (`:3021-3061`). No hay aviso de variante sin uso (`codes.rs:358-372`):
  `Resolved` sin construir no avisa, y `version`/`house_id` no avisan en el build sin tests.
- **APIs del framework @ `719fb29`:** `coin.move:125, 140, 145, 572`; `balance.move:90, 96`; `object.move:248, 254`;
  `transfer.move:63, 120`; `test_scenario.move:436, 473, 509, 564, 567`; `event.move:63, 68`; `option.move:26`;
  `tx_context.move:128-131` (inicio de época); `clock.move:30, 60, 79`. Todas coinciden.
- **Citas del repo:** `house.move:14-19, 150-153, 156-177, 181-183, 195-198, 200-240` y
  `house_tests.move:34-39, 84, 92, 112, 222-225`. Todas coinciden. `entry` llamada desde un test: el precedente de `:84` está en verde.
- **Fondos (SEG-4):** crear consume el `Coin` entero y lo convierte en `Balance` (`bet = stake.value()`, sin vuelto). Cancelar y
  rechazar hacen `withdraw_all` → `from_balance` → `public_transfer` a `game.creator`, con monto y destino fijos y sin
  parámetros. No se crea ni se destruye valor, y el `Balance` vacío que queda en el objeto terminal cumple PROY-8. Los dos caminos
  de salida (`:133-134`, `:168-180`) no reciben la House ni leen `version`, y el DoD (`:413`) junto con los greps (`:484-485`)
  lo hacen verificable. Por eso, que la House esté migrada o que el `HouseCap` se haya perdido no bloquea ningún reembolso (D-12 §4, tests 21-22).
  No hay SUI atrapado: el creador siempre es un firmante (`ctx.sender()`), no hay expiración que cierre la salida, y
  un `opponent` inalcanzable no bloquea nada porque el creador cancela. Carreras: el consenso serializa el
  `&mut Game`. La segunda transacción aborta con `ENotPending` y se revierte entera, incluido el `SplitCoins`, así que
  el aceptante de #6 no pierde su `Coin`. Cancelar y rechazar al mismo tiempo dan el mismo resultado (reembolso al
  creador una sola vez).
- **AuthZ (SEG-2):** cancelar exige `sender == creator`. Rechazar exige `opponent.is_some()` (`ENoInvitation`) y
  `opponent == some(sender)` (`ENotInvited`). Crear rechaza `opponent == some(sender)` (`ESelfInvite`). En los dos caminos la authZ va antes que el estado. Hay tests de los casos denegados: 12, 13, 17, 18 y 19, más 8 para auto-invitación. `ENoInvitation` y `ENotInvited` como códigos separados es correcto (LIM-8).
- **Extensibilidad para #6:** el aceptar con `&Random` en una `entry` no `public` no toca nada de lo que se congela (PROY-4, SEG-5). El estado
  `Resolved { acceptor, winner }` y la numeración desde el 7 están bien. `ENotPending` (4) y `ENotInvited` (5) se reutilizan
  con la misma condición, sin romper PROY-2. `fee_rate: u16` copiado al crear (D-06 §3) se aplica con intermedio `u128` en #6.
  `house_id` permite el `EWrongHouse` antes de `add_fees`, que paga a la House correcta. Hoy solo puede existir una House,
  porque `init` no se vuelve a ejecutar en los upgrades, así que es defensa en profundidad.
- **Decisiones internas del MID:** (1) `version = house.version()`: correcto, porque después de las lecturas con chequeo equivale
  a la versión del paquete en ejecución y hay una sola fuente de verdad (ver la nota del hallazgo 3 para #6). (2) Lecturas
  solo `#[test_only]`: correcto (la app lee el objeto por RPC, que expone todos los campos; agregar getters más adelante es
  compatible). Falta documentar la forma del enum en el RPC (hallazgo 4). (3) Un solo `GameCancelled` con `cancelled_by`: correcto,
  porque es la misma transición. Para #13 da igual: los filtros de eventos del RPC no filtran por campo, así que en los dos
  diseños hay que filtrar en el cliente.
- **D6:** `SuiEvent.timestamp_ms` existe (`crates/sui-json-rpc-types/src/sui_event.rs:62`), y
  `epoch_timestamp_ms` devuelve el inicio de la época (`tx_context.move:128-131`).
- **Proceso:** la HU está completa con scope y lo que no entrega. Respeta D-06 (que prevalece sobre `agents.md` §6) sin reabrirlo. El orden es contratos y después docs.
  Todos los `sui` llevan `printf 'n\n' |`, y no hay `sui client` salvo `active-env`. El grep de secretos usa `-U0 | grep '^\+'` más los archivos
  sin trackear. Se verifica la cabecera D-14 con `head -2`. No toca `house.move`, `Move.toml` ni `Move.lock`. La suma de los tasks cubre
  los criterios 1-9 del issue.

### Recomendación por STOP (decide el usuario)

| STOP | Recomendación MAYOR | Por qué |
|---|---|---|
| **D3** objeto terminal | **(a) conservar**, después de corregir la evidencia (hallazgo 1) | Lectura del resultado por ID, carrera con abort code, y es **reversible**: una versión futura puede agregar el borrado de partidas terminales con rebate. (b) es irreversible y deja el historial solo en eventos. Hay que decirle al usuario que cada partida inmoviliza ≈ 0,002–0,003 SUI de storage. |
| **D4** Escrow | **(a) absorberlo en Game** | Un módulo aparte no aporta seguridad (el `Balance` ya es privado del módulo) y no tiene un segundo uso (ARQ-7). |
| **D6** timestamp | **(c) sin campo** | No hay expiración (D-06 §2) y el evento trae `timestampMs`. Un input y un campo congelado menos. |
| **D8** firma/visibilidad | **(a) `create_game(…, Option<address>, …)` + `entry` en las tres + (i) `reject_game` propio** | `Option<address>` como argumento puro y el `Coin` de `SplitCoins` están verificados. No hay consumidor componible. Con `entry`, la firma puede cambiar en un upgrade. (i) deja cada regla de authZ con su propio test. |
| **DV** versionado de `Game` | **(b) `version` fijada al crear, nunca leída en cancelar/rechazar** | Cumple D-12 §4 por construcción y conserva la procedencia, que no se puede agregar después del congelamiento del layout. Cuesta 8 B por partida. Con la nota del hallazgo 3 para #6. |

### Cambios exigidos para v1.1 (el MAYOR revisa solo el delta)

1. D3 con el costo cuantificado, el destinatario del rebate en (b) y la reversibilidad de (a) (hallazgo 1).
2. Nombres sin colisión para `is_pending`/`is_cancelled` (hallazgo 2).
3. Nota para #6 sobre `game.version == house.version()` y consecuencia de producto en README y §7 (hallazgo 3).
4. Subsección "Lectura desde la app" en el README de TASK-2 (hallazgo 4).
5. Impacto en #18 y corrección de `:66-67` (hallazgo 5).
6. Dos tests de orden de aborts y DoD ≥ 51 (hallazgo 6).
7. Rutas de evidencia con `sui-execution/latest/` y rangos corregidos (hallazgo 7).
8. Opcionales: hallazgos 8-11.

---

## Revisión v1.1

## Veredicto: APROBADO (revisión técnica; 0 🔴 · 0 🟠 · 2 🟡 · 3 🔵) — condicionado a que el usuario decida D3, D4, D6, D8 y DV; los 2 🟡 se corrigen al redactar el handoff, sin otra ronda

> Re-revisión MAYOR del delta · 2026-10-30 · `documents/PLAN_GAME.md` **v1.1** (sin trackear, 615 líneas, en
> `feature/issue-3-ci` @ `44ff83a`; `git diff --stat master HEAD -- contracts` vacío, así que el código de contratos sigue idéntico a
> `master` @ `c2a1e42`) · leí el plan completo, no solo el Changelog. Sin gates, sin `sui`, sin `~/.sui/`.

### Hallazgos de la v1: estado

| v1 | Estado | Evidencia en v1.1 |
|---|---|---|
| 🟠 1 D3 sin cuantificar | ✅ Resuelto | `:296-302`: fórmula, citas `lib.rs:2788-2789` y precio de storage marcado como **no medido**; ≈ 0,002–0,003 SUI = 2–3 × `min_bet`; valor exacto en el smoke de #6. `:305-309`: (a) es reversible. `:310-313`: el rebate de (b) va a quien firma, en cada camino, y (b) es irreversible. `:317-318`: nota para #11. `:282-284` (flujo de fondos) y `:508-509` (README) lo reflejan. La recomendación sigue siendo (a) "informando al usuario". |
| 🟡 2 colisión `is_pending` | ✅ | `:208-211`: `is_pending` es solo privado. `:246-251`: todos los helpers `#[test_only]` llevan `_for_testing`, e `is_pending_for_testing` delega en `is_pending`. `:251` aclara que en §Tests los nombres cortos se refieren a esos helpers. |
| 🟡 3 versión en #6 | ✅ (ver 🔵 v1.1-3) | `:264`, `:380-389`: `game.version == house.version()` en la misma transacción que una lectura versionada, sin una segunda constante. La consecuencia de producto (las pendientes de versiones anteriores solo se cancelan o rechazan, y #10 deja de ofrecerlas) está en DV, en el README `:504-506` y en `agents.md` §7 `:523-525`. |
| 🟡 4 lectura desde la app | ✅ (ver 🟡 v1.1-2) | `:510-517`: `getObject`, campos sin getters, `stake`, forma de `state`, una variante desconocida se trata como error (SEG-10) y `timestampMs`. |
| 🟡 5 impacto en #18 | ✅ | `:81-84`, `:31-32`, `:505-506`, `:526`, `:530`, `:541-542`. La justificación de `Resolved` está corregida (`:77-79`: es para evitar retrabajo, #6 todavía podría cambiarla y lo declara). |
| 🟡 6 orden de aborts | ✅ | Tests 24-25 (`:470-473`). `:109-110` remite a los tests 9, 24 y 25. DoD con ≥ 25 de Game y ≥ 51 en total (`:477-478`, `:581`). |
| 🟡 7 rutas de evidencia | ✅ | `:67-70` explica por qué rige `latest`. Están corregidas `:218`, `:221-222`, `:294`, `:351-354` y `:74-77` (`compatibility_mode.rs:209-211, 273-275, 231-233, 270-272`). Volví a comprobarlas contra las fuentes descargadas y coinciden. |
| 🔵 8 merge-base | ✅ | `:566-577`: `B=$(git merge-base master HEAD)` en `--stat`, `--numstat` y el grep de secretos. Como `git diff "$B"` compara contra el working tree, también entran los cambios sin commitear. |
| 🔵 9 `///` en campos | ✅ | `:117-135`. |
| 🔵 10 cabecera en los tests | ✅, la resolvió el orquestador | `:9-10`, `:57-60`, `:410-413`, `:420-422`, `:480-482`, `:571`. Es un cambio solo de comentario en `house_tests.move`, sin delta de tests, y es coherente con "los fuentes Move" de D-14. Ver 🟡 v1.1-1 y 🔵 v1.1-2. |
| 🔵 11 tests 21-22 | ✅ | `:464-467`, más el traslado al handoff en `:490`. |

No se introdujeron regresiones: el contrato (structs, enum, firmas, aborts y eventos), el flujo de fondos, la authZ y el
invariante D-12 §4 están igual que en la v1 aprobada en lo técnico. `.github/` y `*_CI.md` quedan como "no tocar" (`:413`).

### Hallazgos nuevos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| v1.1-1 | 🟡 MINOR | Verificabilidad del DoD, estilo D-14 | `:480-481`, `:569`, `:582` | El resultado esperado del `--numstat` de `house_tests.move` es `2	0`, pero el modelo de cabecera en `house.move:1-3` son las 2 líneas de comentario **más una línea en blanco** antes del código. | Si el DEV copia la cabecera tal cual está en `house.move` (lo natural), el diff da `3	0`, el DoD queda en rojo y se abre una ronda MID/DEV por una línea en blanco. Si no la copia, la cabecera de los tests queda pegada a `#[test_only]` y es distinta de la de `house.move`. | Fijar una sola forma en el handoff. Recomiendo las 2 líneas de D-14 + 1 línea en blanco, igual que `house.move:1-3`: esperado `3	0` y "ninguna línea quitada". La misma forma en `game.move` y `game_tests.move`. |
| v1.1-2 | 🟡 MINOR | ARQ-6, SEG-10 (precisión de la doc para #10) | `:512-515` | La forma de `state` está incompleta, y el error viene de **mi** hallazgo 4 de la v1. (a) En `getObject` de JSON-RPC, `SuiMoveValue` es `#[serde(untagged)]` y `SuiMoveVariant` se serializa con **tres** claves: `{"type": "<pkg>::game::GameState", "variant": "Pending", "fields": {}}` (`crates/sui-json-rpc-types/src/sui_move.rs:394-408, 474-486, 510-520`). El objeto sin `type` que describe el plan sale de `to_json_value` (`:522-534`), que es la forma de `parsedJson`, no la del contenido del objeto. (b) En gRPC/GraphQL, los campos de la variante van **al mismo nivel** que `"@variant"`: `{"@variant": "Resolved", "acceptor": "0x…", "winner": "0x…"}` (`crates/sui-types/src/object/rpc_visitor/mod.rs:247-262`), no anidados en `fields`. | Un parser de #10 que espera `fields` en gRPC, o que compara el objeto completo en JSON-RPC, no reconoce `Resolved` y, si cae en un default, muestra la partida mal (SEG-10). | Corregir `:512-515` en el handoff de TASK-2 con las dos formas exactas: JSON-RPC `{type, variant, fields}`, gRPC/GraphQL `{"@variant", ...campos}`. Agregar que `u64` llega como string en JSON-RPC (`sui_move.rs:457`) y que `Balance` se presenta aplanado como su valor. |
| v1.1-3 | 🔵 SUGGESTION | Claridad para #6 (SEG-5) | `:264`, `:381-384` | "**después** de una lectura con chequeo" es más estricto de lo necesario. Como la transacción es atómica, alcanza con que `game.version == house.version()` y el `assert` de `add_fees` ocurran en la **misma** transacción: juntos garantizan `game.version == house::VERSION` en cualquier orden. Y en #6 la única lectura con chequeo es `add_fees`, que va **después** del sorteo. | Si #6 lo lee al pie de la letra, pone el `assert` de versión después del coinflip. No es explotable (el abort no depende del resultado), pero gasta el sorteo y el gas antes de abortar, y cambia qué código de abort ve la UI (`game::EWrongVersion` o `house::EWrongVersion`). | Redactarlo como "en la misma transacción que una lectura con chequeo de versión de la House (`add_fees`); recomendado al principio de aceptar, antes del sorteo". El orden final de los aborts lo fija el plan de #6. |
| v1.1-4 | 🔵 SUGGESTION | Precisión de D3 (a) | `:305-307` | "una `entry` que borre partidas terminales y devuelva el rebate al creador": el rebate siempre va a quien paga el gas de la transacción que borra. | Una v2 que implemente un borrado sin permisos le daría el rebate a cualquiera, no al creador. | Agregar "restringida al creador (`sender == creator`), para que el rebate le vuelva a él". |
| v1.1-5 | 🔵 SUGGESTION | FLUJO (toda decisión se registra) | `:9-10`, `:421-422` | Que D-14 alcanza a los tests es una interpretación del orquestador ("indicación del orquestador"), y por ahora solo consta en el plan. | En #6 o #18 alguien vuelve a preguntarse si los `tests/*.move` llevan cabecera. | Cuando el orquestador registre las decisiones de #5, agregar una línea de aclaración a D-20261030-14 en `DECISIONES.md`: "incluye `contracts/tests/*.move`". |

### Recomendación por STOP (sin cambios respecto de la v1)

D3 = **(a)**, presentándole al usuario el depósito de ≈ 0,002–0,003 SUI por partida (`:296-302`) · D4 = **(a)** · D6 = **(c)** · D8 = **(a)
+ `entry` en las tres + (i)** · DV = **(b)**.

### Para el handoff

Trasladar v1.1-1 (forma de la cabecera y `numstat` esperado) y v1.1-2 (formas exactas del enum en el RPC). v1.1-3 se
traslada como nota para el plan de #6. v1.1-4 y v1.1-5 son opcionales.
