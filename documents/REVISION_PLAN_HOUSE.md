## Veredicto: 🟠 REQUIERE CAMBIOS (1 MAJOR, 6 MINOR; 0 BLOCKER) — PLAN_HOUSE v1

> Revisión MAYOR · 2026-10-30 · branch `feature/issue-4-house` @ `f303ef9` (el plan está sin trackear en
> el working tree) · documento revisado: `documents/PLAN_HOUSE.md` **v1** (407 líneas) · primera ronda,
> no hay hallazgos anteriores.
> Contrastado con: issue #4 (cuerpo y 3 comentarios), #5, #6, `agents.md`, `documents/STATUS.md`,
> `documents/DECISIONES.md` (D-20261030-06), `documents/ESTANDARES.md`, `documents/FLUJO_AGENTES.md`,
> `contracts/sources/house.move` @ `f303ef9`. Framework: `MystenLabs/sui` @ `719fb2960ccfbf9f4d33041f8ea5146d30671696`
> (Move) y `testnet-v1.83.0` (lints, adapter y natives), leídos con `gh api`; docs oficiales
> (docs.sui.io/guides/developer/packages/upgrade); `sui move coverage --help` (CLI 1.83.0). No se corrió ningún gate (D-20261030-02).

### Resumen
El plan es sólido: la HU está completa, cubre los 12 criterios del issue, las citas de `house.move` y del
framework son exactas, y la propuesta de D3 (c) está bien fundada. Falta elevar una decisión irreversible
de layout: el versionado de la House compartida, que queda congelado en #8 aunque el issue deje fuera la
política de upgrades. El resto son precisiones (D4 (b), "puerta abierta" de D3, visibilidad según PROY-4, greps de secretos, test de "exactamente una House").

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| 1 | 🟠 MAJOR | PROY-10, FLUJO §4 (layout de structs con `key`), ARQ-6 | `PLAN_HOUSE.md:53-62` (Contrato on-chain), `:93-99` (struct `House`), `:22` ("política de upgrades" fuera) | El plan fija el layout **final** de la `House` compartida sin decidir si lleva campo de versión. En Sui, **todas las versiones anteriores de un paquete siguen siendo invocables** tras un upgrade ("any transaction or package that references an old version's package ID can still call it", docs.sui.io/.../upgrade), y el layout y las habilidades no cambian en un upgrade compatible (`compatibility.rs:77-83, 283-292` @ `testnet-v1.83.0`; el adapter usa `Compatibility::upgrade_check()` en `static_programmable_transactions/execution/context.rs:2605-2606`). Sin `version` en la House, un fix publicado como upgrade **no** cierra el camino viejo. "Política de upgrades" puede quedar fuera, pero esta pieza de layout se decide ahora o no se decide nunca | Tras #8 aparece un bug en `update_bet_limits` v1, o en `game` v1 (#6), que escribe la House por `add_fees`. Se publica v2 con el fix, pero cualquiera sigue llamando las funciones v1 contra la misma House compartida; la única salida es republicar (House e IDs nuevos, retirar fees antes, #7/#8 de nuevo) | Agregar un **STOP D7 — Versionado de objetos compartidos** con evidencia y opciones: (a) sin campo `version`: el camino de corrección es republicar, documentado en `contracts/README.md` y en DECISIONES, y se revisa antes de mainnet; (b) `version: u64` en `House` + `const VERSION` + abort propio (`EWrongVersion`) + `assert!` en toda función que reciba la House + `migrate(&mut House, &HouseCap)` (y lo mismo para `Game` en #5). Indicar el impacto en tasks/tests de cada una. Mi recomendación está en §STOPs |
| 2 | 🟡 MINOR | Exactitud de evidencia (M3) | `:234-236` (D4 "Si elige (b)") | `self_transfer` solo se dispara en funciones **no `entry`** (y fuera de `init` y tests) que transfieren a `ctx.sender()` un tipo `key + store` (`self_transfer.rs:80-93, 152, 184-192` @ `testnet-v1.83.0`). La afirmación vale para un (b) `public`, pero (b) también puede escribirse como `entry fun` sin retorno, y entonces el lint **no** aparece y no hace falta `#[allow]` | El usuario descarta (b) por un costo (allow de lint) que una variante `entry` no tiene | Precisar: "(b) `public` ⇒ lint `self_transfer`; (b) `entry` ⇒ sin lint, pero no componible (no puede devolver el `Coin` ni encadenarse con otras llamadas Move)". La recomendación (a) no cambia |
| 3 | 🟡 MINOR | Exactitud de evidencia (M3), PROY-10 | `:216-217` (D3 (c) "deja la puerta abierta…") y `:211-212` | (i) "Agregar en un upgrade un traspaso en dos pasos" es **aditivo**: `transfer_house_cap` v1 sigue invocable para siempre (hallazgo 1), sea `public` o `entry`, porque no toca la House. (ii) La "dApp de phishing" figura como contra de (b), pero el robo con una transacción firmada por el titular es igual de posible en (c) (`transfer_house_cap(cap, atacante)`). Lo que solo existe en (b) es el escalamiento a "**cualquiera** usa el cap" (freeze) y el envolverlo, meterlo en un Kiosk o en dynamic fields | El usuario ratifica (c) creyendo que protege contra phishing, o que el paso único se podrá retirar más adelante | Reescribir los pros y contras de D3 con esa distinción (ver §Validado, D3) |
| 4 | 🟡 MINOR | PROY-4 | `:110-117` (columna Visibilidad) | PROY-4: "`public` solo para API componible deliberada, porque su firma queda congelada". El plan declara `public` para `update_fee_rate`, `update_bet_limits` y `transfer_house_cap` sin justificar la componibilidad. Con un `HouseCap` sin `store`, ningún otro paquete puede custodiarlo, así que componer esas tres desde Move no aporta casi nada; `entry` (no `public`) se puede cambiar o quitar en versiones nuevas (`compatibility.rs:35, 80`). `withdraw_fees` sí es `public` deliberadamente (devuelve `Coin`, D4 a) | Tras #8 hay que conservar las firmas de esas tres funciones en cada versión futura, sin ningún consumidor que lo justifique | Justificar `public` por función, o pasar esas tres a `entry` (también se llaman desde una PTB o con `sui client call`). Decisión del plan; no requiere STOP nuevo |
| 5 | 🟡 MINOR | PROY-9, criterio 2 del issue | `:304-307` (tests 1 y 2) | El criterio pide que "exista **exactamente** la House". El test 1 hace `take_shared` (prueba que hay **al menos** una) y el test 2 cubre el cap, pero no la unicidad de la House | Un `init` que comparta dos Houses pasa la suite | En el test 1 (o en uno nuevo), usar los `TransactionEffects` del primer `next_tx`: `shared(&effects).length() == 1` (`test_scenario.move:436`), y opcionalmente comprobar que el `Publisher` llegó a `PUBLISHER` |
| 6 | 🟡 MINOR | SEG-3, verificación | `:400-401, :404-406` | "Los greps de secretos vacíos" no puede cumplirse: el patrón literal `suiprivkey\|mnemonic\|recovery\|private.?key\|keystore` está en el propio plan (`:400-401`), y lo copiarán el handoff, los reportes y esta revisión, todos en `documents/` (sin trackear o ya en el diff). Además, TASK-2 toca `agents.md` y `ESTANDARES.md`, que nombran `keystore`/`recovery` | El DEV reporta "no vacío" en cada task, o lo "arregla" filtrando de más | Declarar los matches esperados: los artefactos de proceso de `documents/` que contienen el patrón y las líneas de docs que nombran `keystore` a propósito. Cualquier otro match es BLOCKER. No excluir rutas del grep |
| 7 | 🟡 MINOR | SEG-2, PROY-9, agents.md §13 | `:298-301` (AuthZ), `:363-365` (TASK-2, ESTANDARES) | SEG-2 exige "un test `expected_failure` del caso denegado", y con un `&HouseCap` eso no se puede expresar: el caso denegado ni compila ni se puede armar como transacción. El plan lo resuelve bien en los tests, pero no deja asentada la interpretación en la regla | El MID o el MAYOR de #6 o #14 marcan NO PASA por falta de `expected_failure` en las funciones de admin | TASK-2: una línea en SEG-2/PROY-9 (y en agents.md §13): "authZ por capability ⇒ el caso denegado se cubre verificando la custodia del cap (dónde está antes y después), no con `expected_failure`" |

### SUGGESTIONS (🔵, informativas)
- **S1 — Destinatario del cap.** El destinatario irrecuperable más probable no es `@0x0` sino un **ID de objeto**, por ejemplo el ID de la House que el panel muestra. Un cap enviado a un objeto queda huérfano: `HouseCap` sin `store` solo se recupera con `transfer::receive`, restringido al módulo `house` (`transfer.move:136-139`), y `house` no lo expone. Mantener la decisión de no poner guard en el contrato, pero agregarlo a `contracts/README.md` ("qué pasa si se pierde") y como nota para #14: validar que el destinatario no sea un objeto existente (`getObject`) además del formato (SEG-9).
- **S2 — Smoke de #6 y README.** `withdraw_fees` devuelve un `Coin` sin `drop`, así que `sui client call` sola falla por valor sin usar. Poner en el README un ejemplo con `sui client ptb` (`--move-call … --assign`, luego `--transfer-objects`).
- **S3 — Límites y partidas existentes.** Documentar en el README que `min_bet`/`max_bet` solo se aplican al **crear** la partida (#5). Cambiarlos no afecta a las `Pending` existentes, y con resolución atómica (D-06 §1) aceptar solo exige el monto exacto.
- **S4 — D1 (b) incompleta.** Si el usuario eligiera D1 (b), `HouseCapTransferred` también tendría que llevar `house_id`. Agregarlo a "Si el usuario elige (b)" (`:178-180`).

### Validado como correcto (con evidencia)
- **HU y alcance:** HU completa (`:8-22`), alcance y fuera de alcance explícitos; la suma TASK-1 + TASK-2 cubre los criterios 1-12 del issue (`:375-378`); contratos antes que docs.
- **Citas de `house.move`:** todas exactas (`:31-39` ↔ `house.move:14-15, 22, 28-30, 36-44, 47-64, 67-82, 84-99, 101-104`).
- **Citas del framework @ `719fb29`:** `transfer.move:54, 63, 109, 129` (las variantes `public_*` exigen `key + store`; `transfer`/`freeze_object`/`share_object` están restringidas al módulo definidor, `:51-53, 99-101, 117-119`); `object.move:254` (`id<T: key>`); `balance.move:90` (`withdraw_all`), `:174` (`create_for_testing`); `coin.move:140` (`from_balance`), `:578` (`burn_for_testing`); `event.move:65-68` (`events_by_type`, `#[test_only]`); `test_scenario.move:283, 446, 464, 467, 473, 576, 583` (`next_tx`, `num_user_events`, `ids_for_address`, `has_most_recent_for_address`, `take_from_address`, `take_shared`, `return_shared`). Lints @ `testnet-v1.83.0`: `linters/mod.rs:95-99` (`custom_state_change`) y `:130-134` (`freezing_capability`).
- **D3, el mecanismo de congelamiento (afirmación central del MID): correcto.** Con `key + store`, cualquier PTB firmada por el titular puede llamar `0x2::transfer::public_freeze_object<…::HouseCap>` (`transfer.move:109`). Un objeto inmutable lo puede pasar como `&T` cualquier transacción, así que cualquiera aprobaría `update_*` y `withdraw_fees`. El lint lo describe ("might … open access to operations that otherwise should be restricted", `freezing_capability.rs:79`), pero el lint solo mira el código del paquete y **no** impide la llamada desde una PTB. Riesgos de `store` que el MID no listó: `public_party_transfer` (`transfer.move:91`) hoy está limitado a un dueño único (`:45, 92`), y `public_share_object` hoy aborta con objetos no nuevos (`:19-21, 126-127`: "This restriction may be relaxed in the future"). Es decir, la superficie de `store` **crece con el framework**, mientras que las habilidades no se pueden quitar nunca (`compatibility.rs:283-292`). Con (c), `HouseCap` sin `store` no se puede congelar, compartir, envolver, guardar en dynamic fields ni en un Kiosk, ni recibir fuera de `house`. La única salida del valor es `transfer_house_cap`, así que `HouseCapTransferred` + `init` forman una traza **completa** del titular, algo que (b) no da. `custom_state_change` no aplica a (c): solo marca parámetros con `store` (`custom_state_change.rs:4-8, 192-201`). Wrapping: un campo de otro objeto `key` exige `store`, de modo que (c) lo impide. Upgrade: irreversible tras #8, como dice el plan.
- **`events_by_type` antes de `next_tx`: correcto.** `end_transaction` vacía el estado del runtime (`take_state()`, `sui-move-natives/src/test_scenario.rs:252` @ `testnet-v1.83.0`), y `events_by_type` lee los eventos de la tx en curso (`event.rs:253-285`). Los constructores `#[test_only]` de eventos son el caso "acceso privado" de PROY-1, porque los campos son privados al módulo.
- **`claim_and_keep` desde `init_for_testing`:** `claim` hace `assert!(types::is_one_time_witness(&otw))` (`package.move:143-144`), un chequeo nativo **estructural** que un `HOUSE {}` construido en test satisface (es el patrón habitual de `init_for_testing`). El STOP de rollback (`:336-337`) es prudente y no estorba.
- **`public(package)` desde `tests/`:** los módulos de `tests/` se compilan como parte del paquete raíz en modo test. El plan lo deja como verificación del DEV con fallback `#[test_only]` declarado (`:291-293`), que es correcto.
- **Aritmética:** en `house` solo hay `balance::join` (suma `u64`, `balance.move:76-80`) y `withdraw_all` (sin resta propia). `fees_collected` no puede desbordar: la oferta total de SUI es 10^19 MIST, por debajo de `u64::MAX` (≈ 1,84 × 10^19). `max_bet` sin tope tampoco es un riesgo: dos apuestas mayores que `u64::MAX / 2` exigirían más SUI del que existe. Sin bps aquí (SEG-6 vive en #6, `:73`).
- **Abort codes:** uno por condición, 0-2 estables, sin reutilizar `EInsufficientBalance` (LIM-8). Renumerar desde 0 es válido porque nunca se publicó (`:84-85`).
- **Eventos:** los tres de admin llevan `house_id` (criterio 8 del issue, PROY-7). `HouseCapTransferred` con `cap_id` está bien justificado con D1 (a) (`:138-140`).
- **Conservación (SEG-4):** el invariante (`:159-163`) y el test 11 (valor del `Coin` = `fees_collected` antes; 0 después; evento con `amount`) cubren `withdraw_fees`. El test 10 cubre `add_fees`, incluido un depósito de 0. Ninguna otra función mueve `Balance`.
- **API para #5/#6** (`:142-150`): `min_bet`, `max_bet`, `fee_rate` (D-06 §3), `object::id(house)` (`house_id` y `EWrongHouse` de #6), `add_fees` (#6). Cubre lo que piden #5 y #6.
- **H12:** sin `ctx` en `update_fee_rate`, y `withdraw_fees` con `&mut` (`:113, :127`). Sin `share_owned` (la House es nueva en `init`) y sin `self_transfer` (`init` está exento, `self_transfer.rs:94-99`).
- **Verificación:** `-e` existe en `sui move coverage summary` (CLI 1.83.0, `--help`). `.gitignore:2-5` cubre `contracts/traces/`, `.trace` y `.coverage*`. El secret-grep con `-U0` + `^\+` + archivos sin trackear corrige la lección de #2 (salvo el hallazgo 6). Los comandos de `sui move` llevan `printf 'n\n' |` y van en subshell.

### Recomendación por STOP (decide el usuario)
- **D1 — (a), con fee por defecto fijo (ii): 200 bps salvo que el usuario quiera otro.** El argumento del MID es correcto pero mal ponderado. La ventana entre publicar y `update_fee_rate` es corta (son dos transacciones del owner), aunque real: con D-06 §3, las partidas creadas en ella **y aceptadas** cobran 0 % para siempre. El riesgo de verdad es **olvidar** el paso post-publicación, que deja fee 0 indefinidamente. `init` no recibe parámetros, así que no hay otra forma de evitar ese paso que la constante.
- **D2 — (a)** eliminar `admin`. El titular se deduce de los objetos de la wallet, y con D3 (c) también de la traza de eventos.
- **D3 — ratificar (c)**: `key` sin `store` + `transfer_house_cap` + `HouseCapTransferred`, con las precisiones de los hallazgos 3 y 4 (visibilidad `entry` recomendada) y S1. La evidencia del MID sobre el congelamiento es correcta.
- **D4 — (a)** devolver `Coin<SUI>` + abortar en 0 (`ENoFeesToWithdraw`), con la corrección del hallazgo 2.
- **D5 — (a)** `const E…: u64`. Evidencia adicional: el código de un `#[error]` codifica el **número de línea** (`move-command-line-common/src/error_bitset.rs:17` @ `testnet-v1.83.0`). El u64 crudo cambia cuando se mueven líneas, contra el "número estable" de PROY-2, salvo que #11 decodifique siempre por nombre.
- **D6 — mantener** 0,001 SUI / 50 SUI.
- **D7 (nuevo, hallazgo 1) — (a)** sin campo `version` para el MVP en testnet: la corrección de bugs tras #8 es republicar, documentado en el README y en DECISIONES, con revisión obligatoria antes de cualquier mainnet. Usar (b) si el usuario prevé upgrades en testnet con fees reales acumuladas.

### Cambios exigidos para v1.1
1. Agregar el STOP D7 (hallazgo 1) con evidencia, opciones, impacto por opción y recomendación. Reflejarlo en el encabezado (`:6`) y en "Contrato on-chain" (`:61-62`).
2. Corregir D4 (b) (hallazgo 2) y los pros y contras de D3 (hallazgo 3).
3. Justificar `public` o pasar a `entry` `update_fee_rate`, `update_bet_limits` y `transfer_house_cap` (hallazgo 4); actualizar la tabla de funciones y el texto de D3 (c).
4. Test de unicidad de la House con `shared(&effects)` (hallazgo 5).
5. Resultados esperados del secret-grep con los matches de proceso y de docs declarados (hallazgo 6).
6. TASK-2: aclarar SEG-2/PROY-9/agents.md §13 para la authZ por capability (hallazgo 7). Incorporar S1-S3 en el contenido del README.

### Preguntas al usuario (bloquean el handoff)
- D1-D6 (como están en el plan) y **D7** (nuevo). Con las recomendaciones aceptadas y los cambios 1-6 aplicados, el plan queda en condiciones de APROBADO sin otra ronda de fondo (re-revisión de forma de v1.1).

---

## Revisión v1.1 — Veredicto: ✅ APROBADO (revisión técnica; el handoff sigue condicionado a que el usuario decida D1-D7)

> Re-revisión de forma · 2026-10-30 · branch `feature/issue-4-house` @ `f303ef9` (plan sin trackear) ·
> documento: `documents/PLAN_HOUSE.md` **v1.1** (533 líneas, §Changelog `:516-533`). Sin gates (D-20261030-02).

### Estado de los hallazgos de v1
| # | Estado | Evidencia en v1.1 |
|---|---|---|
| 1 🟠 | ✅ Resuelto | STOP D7 en `:301-326`, con evidencia, opciones (a)/(b), impacto y recomendación. Se refleja en el encabezado (`:7`), en la HU "Lo que NO entrega" (`:22-24`), en §Contrato on-chain (`:57-69`) y en el struct (`:107`). TASK-2 lo lleva al README (`:446-449`) |
| 2 🟡 | ✅ Resuelto | `:275-279`: (b) como `public` dispara el lint y como `entry` no lo dispara (aunque no es componible) |
| 3 🟡 | ✅ Resuelto | `:238-240`: el phishing afecta a (b) y a (c). `:242-250`: lo exclusivo de (b). `:257-258`: el traspaso en dos pasos sería aditivo |
| 4 🟡 | ✅ Resuelto | `:121-124, :131-140`: las tres funciones pasan a `entry`, y `withdraw_fees` queda `public` con justificación. DoD en `:417-419` |
| 5 🟡 | ✅ Resuelto | Test 1 (`:381-385`): `shared(&effects).length() == 1` + `Publisher` |
| 6 🟡 | ✅ Resuelto | `:504-514`: matches esperados declarados por categoría; ningún match en `contracts/`; cualquier otro es BLOCKER |
| 7 🟡 | ✅ Resuelto | `:375-378` (AuthZ) y `:460-462` (SEG-2, PROY-9, `agents.md` §13) |
| S1-S4 | ✅ Incorporadas | S1 `:185-187, :261-264, :436-439`; S2 `:441-445`; S3 `:146-148, :445-446`; S4 `:205` |
| STOPs | ✅ | D1 (`:215-219`) y D5 (`:289-291`) incorporan la ponderación y la evidencia del MAYOR |

### Verificación del delta (afirmaciones nuevas)
- **Tests que llaman funciones `entry` de otro módulo:** correcto. En modo test, una función `entry` se trata como pública para el llamador (`public_testing_visibility` → `PublicForTesting::Entry`, `typing/core.rs:2262-2270, 2387-2409` @ `testnet-v1.83.0`).
- **"`entry` no puede devolver un valor sin `drop`"** (`:132`): correcto (`sui-verifier/src/entry_points_verifier.rs:211-216` @ `testnet-v1.83.0`). Justifica que `withdraw_fees` sea `public`.
- **PTB del panel (#14) que mezcle `withdraw_fees` (`public`) con setters `entry`:** sin problema. La regla de argumentos de `entry` privada solo rechaza cliques "calientes", es decir, valores sin `drop` y sin `store` **devueltos** por un comando. Los inputs no calientan (`input_value`, `heats: false`), y el `Coin` devuelto tiene `store` (`static_programmable_transactions/typing/verify_private_entry_arguments.rs:183-189, 380-395, 526-529`).
- **Sintaxis de `sui client ptb`** (`:444-445`): coincide con `sui client ptb --help` de la CLI 1.83.0 (`--move-call`, `--assign`, `--transfer-objects "[…]" <TO>`).
- **`test_scenario::shared`** (`:368, :382`): existe (`test_scenario.move:436` @ `719fb29`). **D7 (b):** el versionado cubre `add_fees` y los setters; `transfer_house_cap` no recibe la House y queda fuera del versionado, algo coherente con lo que dice D3 (`:257-258`).

### Hallazgos nuevos
| # | Severidad | Regla | Sección/Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| N1 | 🟡 MINOR | PROY-9, coherencia | `:321-323` vs `:402-403, :408, :501` | Con D7 (b), el plan dice "~4 tests" y "≥ 18", pero su propia lista suma **6**: versión incorrecta en cada una de las 4 funciones de escritura (`update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `add_fees`) más 2 de `migrate`. Eso da **≥ 20** | Solo aplica si el usuario elige D7 (b). Corregir a "6 tests / ≥ 20" en el handoff. No requiere otra ronda |
| N2 | 🟡 MINOR | Coherencia de alcance | `:48-49` (Alcance) vs `:454, :460-462` (TASK-2) | La línea de Alcance no lista `agents.md` §13 ni SEG-2/PROY-9 de `ESTANDARES.md`, que TASK-2 sí modifica | Ajustar el Alcance en el handoff (es texto, no cambia el diseño) |

Ningún BLOCKER ni MAJOR nuevo. N1 y N2 se corrigen en el handoff sin otra revisión del plan.

### Recomendación por STOP: sin cambios respecto de v1
D1 (a) + fee fijo de 200 bps · D2 (a) · D3 ratificar (c) con `transfer_house_cap` `entry` · D4 (a) + abortar en 0 · D5 (a) · D6 mantener · D7 (a).
