# PLAN_MULTIGAME v1.3.2
> **v1.3.2 (2026-11-20):** errata de **evidencia medida** en TASK-1a y TASK-1b (V-12, V-2 `additive`, V-8, V-4, V-13): corrige afirmaciones de §2.3, §2.7, §3.1 (3), §4.4, §8.2, §11, H-14, R-5, R-9, V-4, V-5, V-12, V-13, V-14 y V-15; **no cambia ninguna decisión del owner (P-1..P-14) ni ningún diseño**. Detalle abajo, en "Cambios de v1.3.1 a v1.3.2". Revisión de delta del MAYOR: **APPROVE CON CAMBIOS**, con M-1..M-5 y N-1..N-2 aplicados en la v1.3.2.
> **v1.3.1 (2026-11-19):** aplica R4-1 (causas separadas en los aborts de `record_move`: `EPhaseMismatch` = 25 nuevo y `ENotPlayer`/`ENotYourTurn`/`EBadMask` con una causa cada uno) y R4-2 (textos de cuando había STOP pendientes); no cambia ninguna decisión del owner. Re-revisión del MAYOR ronda 4: **APPROVE**.
> Issue: #73 (+ relacionados: #18, #72, #51) | Áreas: contracts / app / ci / docs | Fecha: 2026-11-19
> Branch: `feature/issue-73-multigame` (desde `master` = `88dd53b`) | Rol: MID | Estado: v1.3.2 (errata de TASK-1a/1b; revisión de delta del MAYOR: APPROVE CON CAMBIOS, con M-1..M-5 y N-1..N-2 aplicados; la v1.3.1 estaba aprobada en la ronda 4) (TODOS los STOP decididos por el owner el 2026-11-19; queda solo la **autorización explícita del upgrade en testnet (TASK-6)**, separada y vigente; re-revisión del MAYOR: ronda 3 APPROVE CON CAMBIOS (R3-1..R3-6) y ronda 4 **APPROVE**, con R4-1 y R4-2 aplicados en la v1.3.1)
> Todo lo que se afirma del código lleva `archivo:línea` sobre esta branch; las fuentes de Sui son `MystenLabs/sui` en el tag indicado. Lo que no se pudo verificar con certeza está en "A verificar" (§13), con cómo y quién. Historial: las revisiones de v1, v1.1 y v1.2 están en `documents/REVISION_PLAN_MULTIGAME.md`, `…_v1.1.md` y `…_v1.2.md`.

## Cambios de v1.3.1 a v1.3.2 (errata TASK-1b/1a)

Solo se corrigen afirmaciones que la **evidencia medida** en el sandbox desmiente o completa. **No cambia ninguna decisión del owner (P-1..P-14, D-20261119-05) ni ningún diseño** (módulos, layout, estados, controles, abort codes, funciones, INV-D1..D7 y la restricción (d)): la regla "los `typeArguments` y los filtros salen de `typeOrigins`/`definingId`" **se mantiene** y solo cambia su motivo. La evidencia está en `documents/REPORTES_MULTIGAME.md` (TASK-1a y TASK-1b, reportes del DEV y revisiones del MID).

| Dónde | Qué cambia | Evidencia |
|---|---|---|
| §4.4, 2.º punto; R-5; V-12 (§13) | Los `typeArguments` con el ID de definición **siempre** resuelven; un ID de almacenamiento de una versión ≥ la que introduce el módulo **también** resuelve (el runtime normaliza al tipo canónico, sin confusión de tipos); solo falla un ID anterior a la definición o el original (`TypeNotFound`). Antes decía que el ID de almacenamiento "apuntaría a un tipo que no existe". El **target** y la **lectura** de tipos no cambian | TASK-1b V-12 (matriz c1-c7, t1-t7, x1-x5) y V-3 |
| §3.1 punto 3 (H-e) | En la cadena `additive` no compara la lista de amigos, pero la **CLI 1.84.0 sí** (`EUC01009 friend mismatch`) y exige `--skip-verify-compatibility`; con `compatible` (D7) no ocurre; el script nunca pasa la bandera | TASK-1b V-2 `additive` |
| R-9 (H-b) | Un `init` agregado a un módulo **ya publicado** hace rechazar el upgrade (`IncompatibleUpgrade`); solo un módulo **nuevo** puede tener `init` | TASK-1a V-8 |
| §8.2 y V-4 (§13) | `ListEvents`: máximo 10 literales por filtro (cuenta literales), `eventType` sin parámetros es un prefijo, exige el ID de definición, `emitModule` no sirve para el lobby, direcciones de 64 hex | TASK-1b V-4 |
| V-13 (§13) | PV de mainnet = 142 (informativo) | TASK-1b V-13 |
| §4.4, penúltimo punto (**M-1**) | El abort informa el ID de la **versión ejecutada** (hecho medido, ya no condicional): `errors.ts` acepta `packageId`, `originalPackageId` y todos los de `upgrades`, con un test por ID | TASK-1b V-5 (a1-a5 y el abort anidado) |
| H-14 y fila V-15 (**M-2**) | El rechazo es **estático, previo a la ejecución de cualquier comando**; la transacción queda `FailedTransaction` con gas cobrado y sin efectos. V-15 marcada resuelta | TASK-1b V-15 (h1, h8, h9) |
| §2.3 y §2.7 (**M-3**) | El witness impide forjar el de **otro** juego, no que un módulo nuevo del paquete cree `Duel<SuG>` con su propio witness: es superficie de revisión de fondos con la confianza del `UpgradeCap`. La regla de §2.7 nombra también a `duel` | TASK-1b V-14 (`a1_control_own_witness`) |
| §11, paso 3 (**M-4**) | Un error de compatibilidad **local** de la CLI (p. ej. `EUC01009`) o un dry run que falle por compatibilidad es **STOP**; nunca `--skip-verify-compatibility` | TASK-1b V-2 `additive` (H-e) |
| §8.2, lobby (**M-5**) | Un solo pedido mientras el filtro tenga ≤ 10 literales; si se parte, un cursor por trozo con la misma cota y fusión por (checkpoint, transacción, índice del evento) | TASK-1b V-4 |
| §13, V-5 y V-14 (**N-1**) | Marcadas resueltas en TASK-1b con el resultado en una frase | TASK-1b V-5, V-14 |

## Historia de usuario

**Como** owner de la plataforma (y, después, jugador de Battleship), **quiero** que un segundo juego se sume al paquete que ya está
publicado en testnet reutilizando la House, las comisiones, el ciclo crear/aceptar/cancelar y **un reloj por jugada que aplica la base a todos los juegos** (si te toca mover y se acaba el plazo, tu rival reclama el pozo menos la comisión), y que la app liste y juegue varios tipos de
juego desde un lobby común, **para** lanzar Battleship (#18) sin duplicar la custodia de fondos ni las reglas de abandono, y sin republicar (que dejaría la House, las
comisiones y las partidas `Pending` del coinflip atrás).

**Scope en una frase:** decidir con ADR (alternativas, trade-offs y una recomendación por frente) cómo se arma la base común on-chain con su reloj por jugada, cómo
deposita comisiones un juego nuevo, cómo se hace el upgrade del paquete de testnet (política del `UpgradeCap`, `VERSION`, toolchain,
identificación de tipos nuevos) y cómo la app registra varios juegos y muestra los controles de tiempo; y partirlo en tasks ejecutables por el DEV, con el upgrade irreversible al final.
**Lo que NO entrega:** el juego Battleship (tablero, commit-reveal, reglas de turnos propias, UI del tablero: #18); el rediseño visual (#72); el
historial más allá de la ventana del fullnode (#51); juegos de terceros o paquetes externos; mainnet; ejecutar el upgrade (lo hace el owner
desde su terminal, nunca un agente); código (este documento es un plan: los snippets son ilustrativos).

---

## Cambios respecto de v1.2

(Los mapas de v1 → v1.1 y v1.1 → v1.2 están en las revisiones del MAYOR de las rondas 2 y 3, `documents/REVISION_PLAN_MULTIGAME_v1.1.md` y `…_v1.2.md`, §1: todo lo anterior quedó resuelto y no cambia.)

| Hallazgo / decisión | Resolución en v1.3 | Dónde |
|---|---|---|
| **R4-1 y R4-2 (ronda 4, v1.3.1)** | `record_move`: una causa por código (`EPhaseMismatch` 25 nuevo; orden `ENotActive`, `ENoClock`, `ENotPlayer`, `ENotYourTurn`, `EDeadlinePassed`, `EBadMask`/`EPhaseMismatch`); textos viejos de STOP pendientes reemplazados por "decidido" | §2.5, §2.6, §4.3, §10, R-10 |
| **P-14 decidida por el owner** | S-1 = (i) ambos pendientes → 100/100 sin comisión (`Expired`); S-2 = (i) `CLAIM_GRACE_MS` = 7 días y `refund_stalled` paga **100/100 sin comisión** (no "pozo al rival": razones del MAYOR §3.4); S-3 = (i) cualquiera llama `claim_timeout`, paga siempre al rival del pendiente | §2.5, §10 |
| **P-9 y P-10 decididas por el owner** | Aprobadas las recomendadas; **no queda ningún STOP pendiente** salvo la autorización explícita del upgrade (TASK-6) | §10 |
| **R3-1 (MAJOR)** regla de reinicio del plazo | Regla a nivel de bits: `rem = to_move & !bit(sender)`; `rem != 0` ⇒ `next_to_move == rem` (`EPhaseMismatch` desde la v1.3.1; antes `EBadMask`) y no reinicia; `rem == 0` ⇒ `to_move = next_to_move` y `deadline_ms = ahora + turn_ms`, también si el mismo jugador sigue. Tests reescritos; criterio de #18 "jugadas acotadas" y peor caso `Active` ≤ jugadas máximas × `turn_ms` + `CLAIM_GRACE_MS`; códigos de abort revisados | §2.4, §2.5, §2.6, §9 |
| **R3-2** `collect` sin authZ | `collect` recibe `ctx` y exige `ctx.sender() ∈ {creator, acceptor}` (`ENotPlayer`, 24, después de `ENotActive`); no exige estar en `to_move` (rendición fuera de turno). Va en **TASK-2** | §2.5, TASK-2 |
| **R3-3** criterio de la v3 en un corte | Por defecto la v3 rehabilita `collect`/`claim_timeout` para los `Duel` con `version = 1` en `Active`, salvo bug en esos caminos o en el reloj (entonces 100/100 es el modo de falla deseado); durante el corte las jugadas siguen y no se puede liquidar | §4.3, R-3 |
| **R3-4** R-11 inexacto | Reescrito: ids existentes inmutables y con espejo en la app; ids nuevos posibles en un upgrade compatible (la tabla vive en el cuerpo de `create`), manteniendo la inyectividad id ↔ `turn_ms` | R-11 |
| **R3-5** codificación de `to_move` | Explícita en (d)(v): `to_move ∈ 1..=3` con bits 1 = creador, 2 = aceptante, 3 = ambos (1 ⇒ gana el aceptante, 2 ⇒ el creador, 3 ⇒ 100/100) y `deadline_ms` absoluto en ms del `Clock`, en toda versión futura | §2.1 |
| **R3-6** (a) y (b) | (a) tabla de transiciones generada desde los tests como evidencia de la compuerta; (b) criterio opcional de #18: evitar la fase simultánea inicial | §14, §9 |
| Riesgo nuevo (MAYOR §3.5) | Congestión de la House en la jugada ganadora con `collect` cerca del plazo | §2.6 (riesgo 5), R-10 |
| Límite "sin relayers" | `record_move` lee `ctx.sender()`: la `entry` de jugada la firma el jugador que mueve | §2.5, §9 |
| Empates | Nota para el owner: no hay empate acordado; un juego con empate necesitaría otro tipo base | §2.6 |

---

## 0. Resumen de recomendaciones

| Frente | Recomendación (una) | STOP |
|---|---|---|
| **F1 Base común** | Tipo genérico nuevo `Duel<phantom G>` (nombre de trabajo; `match` es palabra reservada de Move 2024 y `game::Game` está ocupado) en el **mismo paquete**: custodia en un único campo `stake`, API de base `public(package)` con el witness del juego por valor, **reloj por jugada en la base**, `cancel`/`reject`/`claim_timeout`/`refund_stalled` como `entry` genéricas. Grafo `coinflip → duel → house`. `game::Game` no se toca. | P-1, P-13 (decididas) |
| **Reloj (P-2, decidida)** | (1c) del owner: controles fijos (rapid 10/20/30/60 min, daily 1/3/7 días), plazo por jugada, quien deja vencer su plazo pierde; la base guarda de quién es el turno (máscara) y hasta cuándo. Vence con ambos pendientes: reembolso 100/100 sin comisión (S-1, decidida). | P-2, P-14 (decididas) |
| **F2 Comisiones** | Juegos como **módulos del mismo paquete**; solo `duel` llama a `house::add_fees` (firma sin cambios). Sin API `public` nueva ni cap por juego. | P-4 (decidida) |
| **F3 Contrato** | **Upgrade compatible** (no republicar); `VERSION` **sin subir** (y el procedimiento de corte escrito, con la salida `refund_stalled` que el corte no alcanza); política del `UpgradeCap` **compatible**; toolchain en un PR previo separado que decide el owner. Módulos nuevos **sin `init`**. | P-5, P-6, P-7, P-8 (decididas) |
| **F4 App** | Registro estático de juegos con fuentes de tipos, alimentado por `upgrades` y `typeOrigins` (validados); el lobby muestra el control de tiempo; la vista activa muestra turno, plazo y el botón de reclamar. | P-9, P-10 (decididas) |
| **Migración** | Coinflip viejo intacto; coinflip nuevo sobre `Duel<Coinflip>` con control 0 (sin reloj, camino atómico); en la app, un juego con dos fuentes. | P-3, P-11 (decididas) |
| **#18** | Un módulo más sobre `Duel` con su estado en dynamic fields (nunca con valor); llama a `record_move` en cada jugada válida; criterios obligatorios en §9. | — |
| **Orden** | Todo contra la localnet aislada y fixtures → revisión de pre-upgrade del MAYOR → **autorización explícita del owner (única pendiente)** → upgrade → smoke de testnet. | P-12 (decidida) |

---

## 1. Contexto y alcance

### 1.1 Qué hay hoy (evidencia)

- Un solo paquete publicado en testnet el 2026-11-04 (`contracts/Published.toml:5-12`, `contracts/deployments/testnet.json`), `packageVersion` 1,
  `packageId` = `originalPackageId` = `0x8b7873ec06f9173d43aa6c1f093040e5237967ad2aaecece0a32070587856f51`, con dos módulos: `house` y `game`. Las fuentes de `contracts/sources` no cambiaron desde la publicación (`git diff 26f2676..HEAD -- contracts/sources` vacío; solo `Move.toml` suma una línea de licencia).
- `house`: `House` (`key`, sin `store`, `house.move:30-39`), `HouseCap` (`key`, sin `store`, `house.move:42`), `VERSION = 1` (`house.move:21`),
  `add_fees` `public(package)` (`house.move:150-153`) que exige `house.version == VERSION` (`house.move:186-188`), accessors con chequeo de versión
  (`house.move:156-177`) y `version()` sin chequeo (`house.move:181-183`). `migrate` siempre aborta en la v1 (`house.move:132-137`).
- `game`: `Game` (`key`, `game.move:31-47`) y `GameState` (`game.move:50-54`); `create_game`/`cancel_game`/`reject_game`/`accept_game` son `entry`
  (`game.move:88, 121, 131, 142`). Cancelar y rechazar no reciben la House ni leen la versión (`game.move:161-173`); aceptar compara `game.version`
  con `house.version()` (`game.move:185`) y cobra la comisión con `house.add_fees` antes del sorteo (`game.move:155-157, 197-205`). La fórmula de pago
  es `fee_amount` (`game.move:237-239`); el ganador sale de un índice sobre `[creator, acceptor]` (`game.move:219-220`). Una partida `Pending` no expira (D-20261030-06 §2).
- Layouts congelados: README "Versionado del `Game`" (`contracts/README.md:399-400`), PROY-10 (`ESTANDARES.md:70`) y D-20261030-15 DV.
- Restricción permanente (a) del "Modelo de confianza del `UpgradeCap`" (`contracts/README.md:165-172`): `cancel_game` y `reject_game` de la v1 se pueden
  invocar para siempre, así que `stake` es la **única** custodia de fondos del `Game` viejo. Toda versión publicada sigue invocable para siempre
  (`contracts/README.md:152`).
- App: un solo paquete en la config (`app/src/sui/config.ts:17-35`), tipos de eventos y objetos armados con `originalPackageId` y comparados con tipo
  exacto (`app/src/sui/events.ts:72-74, 88-93`; `app/src/sui/game.ts:70-81`; `app/src/sui/houseCap.ts:32-34`), lobby con **un** literal de tipo de evento
  (`app/src/sui/lobby.ts:57`), "Mis partidas" con DNF de `sender` ∧ tipo (`app/src/sui/myGames.ts:82-90`). Los comentarios de `events.ts:259` y `game.ts:78`
  dicen "los tipos conservan el ID original tras un upgrade": es cierto solo para los tipos que **ya existían** (H-2).
- `contracts/scripts/publish.mjs` solo tiene `publish | record | check` (`publish.mjs:60-62, 92`): **no hay camino de upgrade**. `deployment.mjs:33-35`
  deja `OPTIONAL_FIELDS` vacío para campos posteriores sin subir `schemaVersion`, y `check` compara cinco campos con `Published.toml` (`deployment.mjs:338-360`).
- D-20261103-01 (2) venció con #17 (`documents/STATUS.md:47`): una republicación es hoy una decisión nueva del owner (STOP).

### 1.2 Hechos verificados con fuentes públicas (lecturas, sin claves)

| # | Hecho | Evidencia |
|---|---|---|
| H-1 | `public(package)` se resuelve **al compilar el paquete completo** y se materializa como declaración de amigo en el módulo llamado; el verificador exige que el llamador esté en la lista. Un paquete externo no puede ser amigo (la dirección del llamador tiene que coincidir). | `@ testnet-v1.83.0`: `external-crates/move/crates/move-compiler/src/typing/core.rs:127-149, 1132-1134, 2308-2315`, `typing/translate.rs:210-250`; `move-bytecode-verifier/src/dependencies.rs:101-103` |
| H-2 | *Type origin*: un tipo nuevo en un upgrade recibe como ID de definición el **ID de almacenamiento del upgrade que lo introduce**; los existentes conservan el del predecesor; un tipo que desaparece es error de compatibilidad. | `crates/sui-types/src/move_package.rs:837-892` (`existing_table.remove(&mod_key).unwrap_or(storage_id)`, líneas 853 y 868) |
| H-3 | Evidencia empírica de H-2: de los últimos 50 paquetes de testnet, uno en versión 12 tiene **10** IDs de definición distintos y otro en versión 8 tiene 7; en el nuestro (versión 1) los 13 tipos tienen el ID original. | Lectura GraphQL pública `packages(last: 50) { nodes { address version typeOrigins { module struct definingId } } }` (Apéndice) |
| H-4 | Compatibilidad `compatible` (`upgrade_check`): layouts y firmas `public` fijos; **no** abilities nuevas en tipos existentes ni variantes nuevas en enums; las `entry` y `public(package)`/privadas pueden cambiar o desaparecer; la lista de amigos **no** se compara. | `compatibility.rs:77-82`, `compatibility_mode.rs:217-275` @ `testnet-v1.83.0`; doc oficial "Which changes are compatible with a package upgrade?" |
| H-5 | `additive` compara con `InclusionCheck::Subset`: todo cambio en una función existente (cuerpo incluido) rompe; `dep_only` con `Equal` y **prohíbe módulos nuevos**. Las políticas solo se endurecen. | `sui-execution/latest/sui-adapter/src/static_programmable_transactions/execution/context.rs:2534-2610` (`disallow_new_modules`, 2559); `compatibility.rs:380-450`; `inclusion_mode.rs:79-138`; doc "Upgrade policies" |
| H-6 | **El `init` de un módulo nuevo SÍ corre en un upgrade**: `enable_init_on_upgrade = true` desde el bloque `130 =>` del protocolo, sin condición de red; el adaptador llama al `init` **solo de los módulos nuevos** y, sin el flag, un módulo nuevo con `init` hace fallar el upgrade ("`init` in new modules on upgrade is not yet supported"). | `@ testnet-v1.84.1`: `crates/sui-protocol-config/src/lib.rs:4828-4830` (el campo en 1055); `sui-execution/latest/sui-adapter/.../execution/context.rs:1389-1433` (rama del flag en 1404, error en 1432). Verificado por el MID |
| H-7 | testnet está en **PV 142** (época 1289 al medir); las CLI `1.84.0` y `1.84.1` tienen `MAX_PROTOCOL_VERSION = 142`; la `1.83.0` y `1.83.1`, 140. Framework PV 140 = `05ad86a3e86c522deea116f80dc2bf2309a53363` (el del lock); PV 142 = `e6f43880f4b65e2c1f0397583a9690b4b22c9223`. | GraphQL público `epoch { epochId protocolConfigs { protocolVersion } }`; `crates/sui-protocol-config/src/lib.rs:41` en cada tag; `crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.84.1` |
| H-8 | `sui client test-upgrade` existe desde la `1.83.0` (`crates/sui/src/client_commands.rs:486`) y en la `1.84.1` (`:487-492`): ensaya un upgrade en localnet con `--pubfile-path`. | `MystenLabs/sui` @ ambos tags |
| H-9 | **Reintentar un upgrade ya ejecutado falla**: el comando `Upgrade` exige `current_package_id == ticket.package` (`PackageIDDoesNotMatch`). La CLI toma `current_package_id` de `Published.toml` y el ticket sale del `UpgradeCap` (`authorize_upgrade` toma `cap.package`; `commit_upgrade` lo mueve al ID nuevo). Con `Published.toml` viejo el reintento falla (y se paga gas); con `Published.toml` ya actualizado, correr de nuevo es un upgrade **nuevo** (v2 → v3). | `@ testnet-v1.84.1`: `sui-adapter/.../execution/interpreter.rs:366-373`; `crates/sui/src/client_commands.rs:4351-4376`; `sui-framework/packages/sui-framework/sources/package.move:289-313`. Verificado por el MID |
| H-10 | **`sui::clock::borrow(): &Clock` entra en PV 142** (no en 141; corrección de v1.1): el protocolo documenta "Version 142: … Add `sui::clock::borrow`" y fija su costo en el bloque `142 =>`. El framework de PV 140 (el del `Move.lock` actual, `05ad86a3…`) **no** la tiene; el de PV 142 (`e6f43880…`) sí. Los dos tags `1.84.0` y `1.84.1` mapean PV 142 → ese framework. Los helpers de test de `sui::clock` están deprecados a favor de `test_scenario::set_clock_timestamp(builder: TxContextBuilder, ms)`. | `@ testnet-v1.84.1`: `crates/sui-protocol-config/src/lib.rs:428-436, 4994`; `sui-framework/packages/sui-framework/sources/clock.move:45-49`; `.../sources/test/test_scenario.move:234-245`; `clock.move` @ `05ad86a3…` sin `borrow` (lectura del MID); `manifest.json` de ambos tags |
| H-11 | El lint `public_random` solo marca funciones `public` (no `public(package)`) con `Random`/`RandomGenerator` como **parámetro directo** y se puede silenciar con `#[allow(lint(public_random))]`; no ve un struct que envuelva un generador. | `external-crates/move/crates/move-compiler/src/sui_mode/linters/public_random.rs:20-70` @ `testnet-v1.84.1` |
| H-12 | Regla del OTW: un struct con el nombre del módulo en mayúsculas y **un solo campo `bool`** (un struct vacío en Move 2024 compila con un campo `bool` ficticio) es candidato a OTW y el verificador lo rechaza si se lo empaqueta fuera de `init`. | `sui-execution/latest/sui-verifier/src/one_time_witness_verifier.rs:55-110, 201-215` @ `testnet-v1.84.1` |
| H-13 | `UpgradeCap` de testnet (lectura GraphQL pública del objeto por el ID de `testnet.json`): `policy` 0 (compatible), `version` 1, `package` = `packageId`. | GraphQL público `object(address: …) { asMoveObject { contents { json } } }` |
| H-14 | Una `entry` no `public` **no acepta argumentos en un "clique caliente"**: un valor sin `drop` ni `store` (hot potato) calienta su clique y toda `entry` privada que reciba un valor de ese clique se rechaza antes de ejecutar (**medido en TASK-1b, V-15: rechazo estático, previo a la ejecución de cualquier comando; la transacción queda `FailedTransaction` con gas cobrado y sin efectos**); el tipo real del argumento debe igualar al parámetro instanciado (`cancel<A>` sobre un `Duel<B>` se rechaza). | `sui-adapter/.../static_programmable_transactions/typing/verify/private_entry_arguments.rs:380-395` y `typing/translate.rs:746-800` @ `testnet-v1.84.1` (el MID leyó el comentario de la regla en `private_entry_arguments.rs`; `translate.rs:746-800` es lectura del MAYOR, sin reverificar) |

> Decisión (2026-11-19): el plan llama al tipo base `Duel<phantom G>` (módulo `duel`) porque `match` es palabra reservada de Move 2024 y `game::Game`
> ya está ocupado. Es un nombre de trabajo: se puede cambiar en el handoff sin tocar el diseño.

---

## 2. F1 — Base común

### 2.1 Restricciones que el diseño tiene que respetar

1. `Game`, `GameState`, `House` y `HouseCap` no cambian (H-4, PROY-10, `contracts/README.md:399-400`) y ninguno tiene `store` (`game.move:31`, `house.move:30, 42`): un genérico nuevo convive, no los reemplaza.
2. **Restricción permanente (d) del `Duel` (P-13; se registra en `contracts/README.md` "Modelo de confianza" y en `DECISIONES.md`).** Más fuerte que la (a) del `Game`: las `entry` genéricas de v2 (`cancel<G>`, `reject<G>`, `claim_timeout<G>`, `refund_stalled<G>`)
   valen **para todo `G` futuro** (Battleship en v3 incluido) **para siempre**. En toda versión futura y para todo juego:
   (i) `stake` es la **única** custodia de fondos del `Duel`;
   (ii) en `Pending`, `stake` contiene **solo** la apuesta del creador (un juego futuro **no** puede hacer que el aceptante deposite mientras el estado sigue `Pending`: `cancel<G>` de v2 se llevaría su apuesta al creador);
   (iii) ningún dato con valor va a dynamic fields;
   (iv) `DuelState` no cambia de significado;
   **(v) reloj por jugada (decisión del owner, P-2):** en `Active`, cuando vence el plazo de quien debe mover, el rival puede reclamar el pozo menos la comisión (`claim_timeout`), para todo `G` y toda versión, y el plazo y esa regla los aplica **la base**, nunca el juego. La salvedad que el MAYOR tiene que mirar: el reclamo **cobra comisión y lee la House con versión**, así que un corte por `VERSION` lo bloquea; lo que **no se puede cortar nunca** es la salida mínima sin comisión `refund_stalled` (100/100, sin House ni versión), disponible a los `CLAIM_GRACE_MS` del vencimiento (§4.3, S-2). **Codificación permanente (R3-5):** en todo `Active` con reloj, `to_move ∈ 1..=3` con bits 1 = creador, 2 = aceptante, 3 = ambos (si vence con 1 gana el aceptante, con 2 el creador, con 3 hay 100/100) y `deadline_ms` es absoluto, en ms del `Clock`, en toda versión futura;
   **(vi)** los estados terminales `Resolved`, `TimedOut` y `Expired` no cambian de significado.
   Es criterio de aceptación de #18 (§9).
3. SEG-5/PROY-5: nada que reciba `Random` es `public`; todo lo que puede abortar va antes del sorteo.
4. ARQ-7/LIM-3: sin abstracción prematura ni código muerto. Tensión real con la congelación del layout: el coinflip (atómico) no usa el reloj ni el turno; los ejercen el juego de test `#[test_only]` en #73 y Battleship en #18. El owner aceptó ese costo al decidir (1c).
5. Cualquier camino de v2 que **mueve fondos, salvo los reembolsos**, lee la House con chequeo de versión **antes** de mover fondos, para que un corte por `VERSION` (§4.3) lo alcance. Los reembolsos (`cancel`, `reject`, `refund_stalled`) quedan mínimos porque no se pueden cortar nunca (D-20261030-12 §4).

### 2.2 Alternativas

| | (a) `Duel<phantom G>` genérico, mismo paquete | (b) Registro de juegos on-chain | (c) House + módulos sueltos sin tipo común | (d) Tipo único con discriminante (`kind`) |
|---|---|---|---|---|
| Qué es | Un módulo `duel` con el objeto genérico, la custodia y el reloj por jugada; cada juego es un módulo hermano con su witness `G` | Un objeto o dynamic fields con los juegos habilitados | Cada juego con su objeto; solo comparten la House | Un único `Duel` sin parámetro de tipo y un campo que dice el juego |
| Ciclo crear/cancelar/rechazar **y regla de abandono** | Una sola implementación | Depende | **Se repite por juego** (custodia, reembolso, reloj y reclamo, con tests) | Una sola |
| Aislamiento entre juegos | Por tipo y witness: solo el módulo dueño de `G` crea/activa/registra jugadas/liquida `Duel<G>` | Por registro | Cada uno el suyo | Ninguno por tipo |
| Congelación | Se congelan `Duel`, `DuelState` y eventos; la API no (`public(package)` cambia, H-4) | Igual y además el registro | Nada genérico; sí cada objeto | Se congela el discriminante |
| Lobby | Eventos genéricos `DuelCreated<phantom G>`: filtro por juego en el servidor | Idem | Eventos distintos | Un evento: filtro solo en el cliente |
| Costo de #73 | Alto | Alto, sin beneficio hoy | Bajo (casi nada on-chain) | Medio |
| Encaja con el issue y con el pedido del owner (la base aplica la regla del reloj a **todos** los juegos) | Sí | Sí | **No**: cada juego reimplementaría el reloj | Sí |

**Recomendación (una): (a).** El pedido del owner ("la base común aplica la regla para todos los juegos") solo se cumple con una base compartida. La congelación del layout es una **deuda, no un riesgo de fondos** (el peor caso: un segundo tipo base que convive). (c) queda como opción conservadora si el owner prefiere que #73 no toque el contrato (P-1); (b) y (d) se descartan.

### 2.3 Grafo de módulos y quién llama a `add_fees`

```
coinflip ──▶ duel ──▶ house        game ──▶ house   (sin cambios)
```
- `coinflip` importa `duel` y `house` (el tipo `House` en sus `entry`) y **no** llama a `add_fees` ni toca el `stake`. **Solo `duel` llama a `house::add_fees`** (en `collect`, `activate_atomic` y `claim_timeout`); cualquier módulo del paquete *podría* hacerlo (H-1),
  así que "solo `duel`" es regla de revisión y de ARQ-1 (`ESTANDARES.md` se actualiza en TASK-8: ARQ-1 pasa a `coinflip → duel → house` y `game → house`; PROY-1, PROY-7, PROY-8 y PROY-10 nombran también `duel`).
- **Alcance del witness (M-3, V-14):** el witness impide forjar el de **otro** juego (V-14 a1/a2), no que un módulo **nuevo** del paquete cree un `Duel<SuG>` con su **propio** witness (`public(package)` se lo permite: control `a1_control_own_witness`). Todo módulo nuevo que llame a la API `public(package)` de `duel` o a `add_fees` es **superficie de revisión de fondos**, con la misma confianza que el `UpgradeCap` (§3.2): la propiedad que el witness garantiza es "nadie toca un `Duel<G>` ajeno", no "solo los juegos aprobados mueven fondos", y esta última depende de la revisión de cada upgrade (la de pre-upgrade del MAYOR, §11 paso 1, se hace contra este plan).
- `duel` no conoce a ningún juego: depende de `house` y del framework (`sui::clock`). Sin dependencias circulares (ARQ-5).

### 2.4 Layout, controles de tiempo e invariantes

**Controles de tiempo (lista blanca fija en el contrato, decisión del owner).** Constantes nombradas (LIM-6), en ms; el máximo es 7 días. `create` recibe el **id** (`u8`), **nunca** milisegundos libres; un id fuera de la tabla aborta con `EBadControl`.

| Id | Control | `turn_ms` (por jugada) |
|---|---|---|
| 0 | **sin reloj** (solo juegos atómicos que nunca pasan por un `Active` persistente: el coinflip) | 0 |
| 1 | rapid 10 min | 600 000 |
| 2 | rapid 20 min | 1 200 000 |
| 3 | rapid 30 min | 1 800 000 |
| 4 | rapid 60 min | 3 600 000 |
| 5 | daily 1 día | 86 400 000 |
| 6 | daily 3 días | 259 200 000 |
| 7 | daily 7 días | 604 800 000 (= `MAX_TURN_MS`) |

> Decisión (2026-11-19): el id 0 "sin reloj" es una **entrada más de la misma lista blanca** (no un caso aparte de `create`) y fija el camino: un `Duel` de control 0 solo se activa con `activate_atomic` (que cobra la comisión y devuelve el hot potato, así que la transacción termina en `Resolved` por construcción) y uno de control > 0 solo con `activate` (reloj). Así "el coinflip no usa reloj" se vuelve un hecho estructural y no un test. En `Pending` sigue sin expiración (D-20261030-06 §2): el reloj empieza al **activar**, no al crear. Un juego con reloj que cree con control 0 deja partidas que no se pueden activar (`ENoClock`) pero sí cancelar: no se pierde nada.

**Layout (ilustrativo, congelado desde la publicación):**

```move
// ILUSTRATIVO — no es código a pegar. Mismo layout plano que `Game` (game.move:31-47), más `turn_ms`.
public struct Duel<phantom G> has key {
    id: UID, version: u64, house_id: ID, creator: address, opponent: Option<address>,
    bet: u64, stake: Balance<SUI>, fee_rate: u16, turn_ms: u64, state: DuelState,
}
public enum DuelState has copy, drop, store {
    Pending,
    Cancelled,
    Active { acceptor: address, to_move: u8, deadline_ms: u64 },   // to_move: máscara 1 = creador, 2 = aceptante, 3 = ambos
    Resolved { acceptor: address, winner: address },               // decidida por el juego (jugada, rendición)
    TimedOut { acceptor: address, winner: address },               // ganó por reloj: el rival no movió a tiempo
    Expired { acceptor: address },                                 // nadie movió a tiempo (o reclamo no hecho a tiempo): 100/100 sin comisión
}
```
- **Campos y justificación:** `turn_ms` es plano porque no cambia nunca tras crear y el lobby lo necesita antes de aceptar; `to_move` y `deadline_ms` viven **dentro de `Active`** para que "plazo sin partida activa" sea irrepresentable (sin chequeos de cero en otros estados). El id de control no se guarda: se deriva de `turn_ms` (la tabla es inyectiva) y va, de todos modos, en `DuelCreated`.
- **Variantes terminales nuevas (N-4):** `TimedOut` y `Expired` (además de `Resolved`) porque el enum se congela en TASK-6 y el objeto es lo único que sobrevive a la ventana del fullnode (#51): sin ellas el detalle de una partida vieja no puede decir "ganó por tiempo" ni que el aceptante también recibió su apuesta.
- `version` y `fee_rate` se copian al crear (D-20261030-06 §3, D-20261030-15 DV); `house_id` viene de la House pasada, nunca del juego.

**Quién debe mover (máscara) y regla del plazo.** `to_move` es un conjunto: 1 = creador, 2 = aceptante, 3 = ambos (fase simultánea, p. ej. comprometer el tablero). Reglas de la base:
- Al activar, `deadline_ms = ahora + turn_ms` y `to_move` lo fija el juego (1..=3).
- `record_move` (lo llama el juego en cada jugada válida; **la base lee `ctx.sender()`**): comprueba que el que firma es jugador y está en `to_move` y que `ahora < deadline_ms`, y calcula `rem = to_move & !bit(sender)`. **Si `rem != 0`** (fase simultánea con otro pendiente): exige `next_to_move == rem` (`EPhaseMismatch`: el juego no puede cambiar a mitad de fase el pendiente del otro), deja `to_move = rem` y **no** mueve el plazo (el otro conserva el suyo). **Si `rem == 0`** (el que mueve cierra su turno o la fase): exige `next_to_move ∈ 1..=3`, fija `to_move = next_to_move` y `deadline_ms = ahora + turn_ms`, **también si el mismo jugador sigue** (cada jugada válida tiene su plazo completo, como en chess.com daily). Consecuencia: el plazo se reinicia en cada jugada y **solo lo frena la finitud del juego** (criterio de #18 en §9; peor caso: duración máxima de `Active` ≤ jugadas máximas × `turn_ms` + `CLAIM_GRACE_MS`).
- `turn_ms` **nunca** lo pasa el juego ni el usuario: sale del `Duel` (cierra N-2).

**Qué pasa al vencer (`ahora ≥ deadline_ms`):**
- **Un solo pendiente** (`to_move` = 1 o 2): el rival gana **por tiempo** (`claim_timeout`): cobra el pozo menos la comisión; estado `TimedOut`.
- **Ambos pendientes** (`to_move` = 3): nadie movió; no hay ganador ni culpable. **Decidido por el owner (P-14 S-1 (i)): reembolso 100/100 sin comisión** (`refund_stalled`, estado `Expired`).

**Invariantes de custodia (para tests y revisión):**
- **INV-D1** el único SUI del `Duel` está en `stake`, **al inicio y al final de toda transacción**: `== bet` en `Pending`; `== 2 × bet` exacto en `Active`; `== 0` en `Cancelled`, `Resolved`, `TimedOut` y `Expired`. Dentro de una transacción, entre `collect` y `pay` el `Active` tiene `2 × bet − fee`; ningún PTB puede intercalar otra función ahí (H-14: el valor `Collected` es un hot potato y una `entry` privada no acepta argumentos de su clique; además §2.7).
- **INV-D2** `cancel`, `reject` y `refund_stalled` no reciben la House ni leen `version`, no dependen del módulo del juego y no pueden abortar por otra causa que su authZ y su estado.
- **INV-D3** (garantía de salida) en `Pending`, incondicional (`cancel`/`reject`). En `Active` con reloj, **dos salidas que solo dependen de la base**: al vencer el plazo, el rival cobra (`claim_timeout`); y a los `CLAIM_GRACE_MS` del vencimiento, cualquiera reembolsa 100/100 sin comisión (`refund_stalled`), aunque la House esté cortada. El tiempo máximo que un `Active` puede estar sin una jugada válida del jugador en turno es `turn_ms` (≤ 7 días) **más** `CLAIM_GRACE_MS` en el peor caso (ver S-2).
- **INV-D4** la comisión se cobra **solo** en una transacción que termina en `Resolved` o `TimedOut`: para `Resolved`, el valor que devuelve `collect`/`activate_atomic` no tiene abilities y solo lo consume `pay` (hot potato); para `TimedOut`, `claim_timeout` cobra y paga dentro de la misma función. `payout + fee == 2 × bet`; `fees_collected` sube exactamente `fee`.
- **INV-D5** ninguna `entry` de producción de #73 termina una transacción con un `Duel` en `Active`: para el coinflip es **estructural** (`activate_atomic` devuelve el hot potato que obliga a `pay`); para un juego con reloj, `Active` es el estado normal entre jugadas y lo cierran `collect`+`pay`, `claim_timeout` o `refund_stalled`.
- **INV-D6** el reloj lo aplica la base: antes de `deadline_ms` solo se puede mover o liquidar por jugada (`record_move`, `collect`: abortan con `EDeadlinePassed` si `ahora ≥ deadline_ms`); desde `deadline_ms` solo se puede reclamar (`claim_timeout`/`refund_stalled`: abortan con `ENotExpired`/`ENotStalled` si todavía no). Los dos conjuntos son **disjuntos**: no hay carrera en el borde del plazo.
- **INV-D7** `to_move ∈ 1..=3` y `deadline_ms` solo existen dentro de `Active` con `turn_ms > 0`.

### 2.5 API de `duel` (tabla de funciones; firmas y números ilustrativos, se fijan en TASK-2 y TASK-2b y quedan estables, PROY-2)

Reglas de diseño que la tabla cumple (M-1): **(i)** toda función de base que crea o muta un `Duel` recibe el witness `_: G` **por valor** (`G: drop`), salvo `cancel`, `reject`, `claim_timeout` y `refund_stalled`;
**(ii)** `create` lee de la House `fee_rate`, `min_bet`, `max_bet`, `version()` y `object::id(house)`: el juego nunca los pasa; **(iii)** el ganador sale de un índice 0/1 sobre `[creator, acceptor]` (o del rival del pendiente, en el reclamo), nunca de una dirección libre; **(iv)** el valor de `collect`/`activate_atomic` lleva `duel_id` y `pay` comprueba que coincide; `collect` exige `Active` y `stake == 2 × bet`; **(v)** todo cobro compara `duel.version == house.version()` y `house_id`, y llama a `add_fees` siempre (también con comisión 0, D-20261030-16 D6); **(vi)** `create` es **por juego** (cada juego valida sus parámetros): no hay `create` genérica `entry`; **(vii)** toda transición emite evento (tabla siguiente); **(viii)** la base lee `ctx.sender()` ella misma en `record_move` (no recibe un `actor` del juego: un `actor` mal pasado sería una clase de bug que la base cierra).

> Decisión (2026-11-19): `record_move` recibe `ctx: &TxContext` y usa `ctx.sender()` en lugar de un parámetro `actor: address`. Motivo: con `actor` la base dependería de que el juego pase la dirección correcta; leyéndola ella misma, "el que mueve es el que firma" es una propiedad de la base. Es una variante de lo pedido (que el juego "pase `ctx.sender()`") con la misma intención y menos superficie (revisada por el MAYOR, ronda 3: mejor). **Límite escrito:** quedan fuera los relayers o meta-transacciones y las jugadas de un árbitro u oráculo; las transacciones patrocinadas, multisig y zkLogin funcionan (el patrocinador solo paga el gas, `sender` sigue siendo el jugador). Por eso la `entry` de jugada de un juego la firma el jugador que mueve (criterio de #18, §9).

**El witness del juego (m-1):** se llama `Coinflip` (nunca el nombre del módulo en mayúsculas, que sería candidato a OTW, H-12), `has drop` únicamente (sin `copy` ni `store`), y **sin constructor `public`**: solo su módulo lo empaqueta, en sus `entry`.

Máscara: `CREATOR = 1`, `ACCEPTOR = 2`, `BOTH = 3`. `ahora` = `sui::clock::borrow().timestamp_ms()` (H-10). Abort codes (ilustrativos, estables desde TASK-2): 0 `EBetTooLow`, 1 `EBetTooHigh`, 2 `ESelfInvite`, 3 `ENotCreator`, 4 `ENotPending`, 5 `ENotInvited`, 6 `ENoInvitation`, 7 `EVersionMismatch`, 8 `EWrongHouse`, 9 `ESelfPlay`, 10 `EWrongStake`, 11 `ENotActive`, 12 `EWrongDuel`, 13 `EBadWinnerIndex`, 14 `ENotExpired`, 15 `EBrokenStake`, 16 `EBadControl`, 17 `ENoClock`, 18 `EHasClock`, 19 `EBadMask`, 20 `ENotYourTurn`, 21 `EDeadlinePassed`, 22 `EBothPending`, 23 `ENotStalled`, 24 `ENotPlayer`, 25 `EPhaseMismatch`. Una causa por código (LIM-8): `EBadMask` (19) = máscara fuera de `1..=3` (en `activate` y en `record_move`), `ENotYourTurn` (20) = jugador que no está en `to_move`, `ENotPlayer` (24) = quien firma no es jugador de la partida (en `collect` y `record_move`), `EPhaseMismatch` (25) = en fase simultánea, `next_to_move != rem`. Numeración 0-25 sin colisiones.

| Función (ilustrativa) | Visib. | Witness | Estado ent. → sal. | Aborts, **en este orden** | Evento | Destinatario / fondos |
|---|---|---|---|---|---|---|
| `create<G>(_: G, house: &House, stake: Coin<SUI>, opponent: Option<address>, control: u8, ctx)` | `public(package)` | por valor | — → `Pending` | `house::EWrongVersion` (3; en las lecturas `min_bet`/`max_bet`/`fee_rate`, primeras, como `game.move:94-97`), `EBetTooLow` (0), `EBetTooHigh` (1), `ESelfInvite` (2), `EBadControl` (16) | `DuelCreated<G>` | `Coin` entero → `stake`; `turn_ms` de la tabla; el `Duel` se comparte adentro; **sin expiración en `Pending`** |
| `cancel<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica | no | `Pending` → `Cancelled` | `ENotCreator` (3), `ENotPending` (4) | `DuelCancelled<G>` (`cancelled_by` = creador) | 100 % de `stake` **al creador**; sin House ni versión |
| `reject<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica | no | `Pending` → `Cancelled` | `ENoInvitation` (6), `ENotInvited` (5), `ENotPending` (4) | `DuelCancelled<G>` (`cancelled_by` = invitado) | 100 % **al creador**; sin House ni versión |
| `activate<G>(_: G, duel: &mut Duel<G>, house: &House, payment: Coin<SUI>, first_to_move: u8, ctx)` — juegos con reloj | `public(package)` | por valor | `Pending` → `Active { acceptor = ctx.sender(), to_move = first_to_move, deadline_ms = ahora + turn_ms }` | `house::EWrongVersion` (3; `house.min_bet()` con el valor descartado, accessor con chequeo de versión), `EVersionMismatch` (7), `EWrongHouse` (8), `ESelfPlay` (9), `ENotInvited` (5), `ENotPending` (4), `EWrongStake` (10), `ENoClock` (17: `turn_ms == 0`), `EBadMask` (19: `first_to_move ∉ 1..=3`) | `DuelActivated<G>` | `payment` (exacto `bet`) se une a `stake` (`2 × bet`) |
| `activate_atomic<G>(_: G, duel: &mut Duel<G>, house: &mut House, payment: Coin<SUI>, ctx): Collected` — juegos sin reloj (coinflip) | `public(package)` | por valor | `Pending` → `Active { acceptor, to_move = 0, deadline_ms = 0 }` (solo dentro de la transacción) | los de `activate` en el mismo orden pero con `EHasClock` (18: `turn_ms != 0`) en lugar de `ENoClock`/`EBadMask`; luego `house::EWrongVersion` (3, en `add_fees`, antes de cualquier pago) | `DuelActivated<G>` | une `payment`, cobra `fee = ⌊pozo × fee_rate / 10_000⌋` (`u128`) de `stake` → `House.fees_collected` (siempre) y devuelve `Collected { duel_id, pot, fee }` (**sin abilities**): la transacción **tiene** que pagar |
| `record_move<G>(_: G, duel: &mut Duel<G>, next_to_move: u8, ctx)` — la llama el juego en cada jugada válida; la **firma el jugador que mueve** (sin relayers) | `public(package)` | por valor | `Active` → `Active` | `ENotActive` (11), `ENoClock` (17), `ENotPlayer` (24: `ctx.sender()` no es jugador de la partida), `ENotYourTurn` (20: es jugador pero no está en `to_move`), `EDeadlinePassed` (21: `ahora ≥ deadline_ms`), luego `EBadMask` (19: con `rem == 0`, `next_to_move ∉ 1..=3`) o `EPhaseMismatch` (25: con `rem != 0`, `next_to_move != rem`) | `DuelTurn<G>` | sin fondos; regla de bits de §2.4: con `rem != 0`, `to_move = rem` sin tocar `deadline_ms`; con `rem == 0`, `to_move = next_to_move` y `deadline_ms = ahora + turn_ms` |
| `collect<G>(_: G, duel: &mut Duel<G>, house: &mut House, ctx): Collected` — liquidar por jugada o rendición con reloj | `public(package)` | por valor | `Active` → `Active` | `ENotActive` (11), `ENotPlayer` (24: `ctx.sender()` ∉ {creador, aceptante}; **no** exige estar en `to_move`: la rendición se hace fuera de turno), `ENoClock` (17: un `Active` sin reloj ya cobró), `EDeadlinePassed` (21: desde el plazo solo se reclama), `EVersionMismatch` (7), `EWrongHouse` (8), `EBrokenStake` (15: `stake != 2 × bet`), `house::EWrongVersion` (3; en `add_fees`, antes de cualquier pago) | — (no es una transición) | cobra la comisión → `fees_collected` (siempre); devuelve `Collected` (**sin abilities**) |
| `pay<G>(_: G, duel: &mut Duel<G>, c: Collected, winner_index: u8, ctx)` | `public(package)` | por valor | `Active` → `Resolved { acceptor, winner }` | `EWrongDuel` (12: `c.duel_id != id(duel)`), `ENotActive` (11), `EBadWinnerIndex` (13: `> 1`; no depende del resultado del sorteo, que ya está en `0..=1`) | `DuelResolved<G>` | el resto de `stake` (`pozo − fee`) como un `Coin` **al ganador** `[creator, acceptor][winner_index]` |
| `claim_timeout<G>(duel: &mut Duel<G>, house: &mut House, ctx)` | **`entry`** genérica | no (**cualquiera la llama**; paga siempre al rival del que no movió) | `Active` → `TimedOut { acceptor, winner }` | `house::EWrongVersion` (3; lectura de la House con versión, primera), `ENotActive` (11), `ENoClock` (17), `EVersionMismatch` (7), `EWrongHouse` (8), `ENotExpired` (14: `ahora < deadline_ms`), `EBothPending` (22: `to_move == 3`, se usa `refund_stalled`), `EBrokenStake` (15) | `DuelTimedOut<G>` | `fee = ⌊pozo × fee_rate / 10_000⌋` (`u128`, `fee_rate` copiado al crear) → `fees_collected` por `add_fees`; `pozo − fee` como un `Coin` **al ganador** (el rival de quien debía mover), **no** a quien llama |
| `refund_stalled<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica | no (cualquiera) | `Active` → `Expired { acceptor }` | `ENotActive` (11), `ENoClock` (17), `ENotStalled` (23: antes de `deadline_ms` si `to_move == 3`; antes de `deadline_ms + CLAIM_GRACE_MS` si hay un solo pendiente) | `DuelExpired<G>` | `bet` al creador y el resto de `stake` (`== bet`) al aceptante, **sin comisión**, sin House ni versión; no hace `assert` de `stake == 2 × bet` (un abort acá bloquearía fondos) |

- **Quién llama a `claim_timeout` (decidido, P-14 S-3 (i)):** **cualquiera**, y el pago va siempre al rival. Justificación: el ganador puede no tener SUI para el gas o estar desconectado; la transacción no le da nada a quien llama (el destinatario y el monto son deterministas), así que no hay incentivo a ocupar su lugar ni riesgo de authZ; permite un "guardián" que finalice partidas vencidas. Alternativa: solo el rival que espera (más estricta, pero un ganador sin gas queda sin cobrar).
- **Carreras que quedan (documentadas):** entre transacciones, desde el plazo, `claim_timeout` y `refund_stalled` (cuando ya es elegible) compiten y gana el que el consenso ordena primero; en un solo pendiente, `refund_stalled` solo es elegible **después de `CLAIM_GRACE_MS`**, para que el que perdió no pueda escapar del reclamo con el 100/100 (el ganador tiene esa ventana). La carrera "mover vs. reclamar" en el borde del plazo **no existe** (INV-D6).
- Estados terminales con `stake == 0`. Los objetos terminales se conservan (storage no recuperable, como D-20261030-15 D3).
- **Constantes** (LIM-6): `MAX_TURN_MS = 604 800 000` (7 días, implícito en la tabla de controles); `CLAIM_GRACE_MS` = **7 días** (decidido, P-14 S-2 (i)); `refund_stalled` paga 100/100 sin comisión también pasada la gracia (no "pozo al rival": evita la evasión de comisión y es neutral en un corte).
- `fee_amount` se duplica en `duel` (`game.move:237-239` es privada y el plan no toca `game.move`): duplicación mínima y documentada (LIM-5) a cambio de **cero diff en el código con fondos viejos**.
- Sin accessors ni exposición del `UID` en #73 (LIM-3); #18 los agrega como `public(package)` con witness (compatible).

**Eventos (todos `has copy, drop`, PROY-7; el tipo lleva el juego):**

| Evento | Campos | Emite |
|---|---|---|
| `DuelCreated<phantom G>` | `duel_id`, `creator`, `opponent: Option<address>`, `bet`, `fee_rate`, **`control: u8`**, **`turn_ms: u64`** (el lobby los muestra antes de aceptar) | `create` |
| `DuelCancelled<phantom G>` | `duel_id`, `creator`, `cancelled_by`, `refund` | `cancel` y `reject` |
| `DuelActivated<phantom G>` | `duel_id`, `creator`, `acceptor`, `bet`, `turn_ms`, `to_move`, `deadline_ms` | `activate` y `activate_atomic` (Pending → Active) |
| `DuelTurn<phantom G>` | `duel_id`, `actor`, `to_move`, `deadline_ms` | `record_move` |
| `DuelResolved<phantom G>` | `duel_id`, `creator`, `acceptor`, `winner`, `pot`, `fee`, `payout` | `pay` (`pot == payout + fee`) |
| `DuelTimedOut<phantom G>` | `duel_id`, `creator`, `acceptor`, `winner`, `claimed_by`, `pot`, `fee`, `payout` | `claim_timeout` (`pot == payout + fee`) |
| `DuelExpired<phantom G>` | `duel_id`, `creator`, `acceptor`, `refund_each` | `refund_stalled` |

`collect` no emite evento propio: es parte de la transición a `Resolved` (su `fee` va en `DuelResolved`).

### 2.6 Reloj por jugada (P-2, decidida por el owner: opción (1c))

> **Decisión del owner (2026-11-19, P-2):** "como se hace en chess.com: un juego puede tener juegos rapid: 10, 20, 30 o 60 minutos, daily: 1, 3 o 7 días. Si Ana hace su jugada y pasa el tiempo y Beto no responde a su jugada, Ana reclama el juego como ganadora." Confirmado: **(a)** el plazo es **por jugada** (no un reloj total por jugador): cada jugada tiene el mismo plazo y, si te toca mover y se acaba, perdés; **(b)** la **base común (`duel`) aplica la regla para todos los juegos**: guarda de quién es el turno y hasta cuándo, y el rival reclama con una función genérica de la base y cobra el pozo menos la comisión. Esto **reemplaza** a (1b) (reembolso 100/100 al vencer, `extend_lease`, `MAX_ACTIVE_MS`). **El abandono ya no es gratis.** Registrada; no se reabre.

**Garantía en términos de fondos de dos jugadores.** En `Pending`, el creador recupera su apuesta cuando quiera. En `Active`, ninguna partida con reloj queda sin salida: al vencer el plazo de quien debe mover, el rival cobra el pozo menos la comisión; si nadie reclama en `CLAIM_GRACE_MS` o el reclamo con comisión estuviera cortado por un cambio de `VERSION`, cualquiera reembolsa a cada jugador su apuesta. Ni el juego ni la UI intervienen en ninguna de las dos salidas. **Qué se reabre respecto de D-20261030-06 §1** ("ningún camino deja fondos de dos jugadores bloqueados"): nada, el motivo se cumple (con reloj, cualquier `Active` se cierra solo por el paso del tiempo); y para el coinflip no hay estado persistente (control 0, camino atómico).

**Cómo se modela cada caso:**
- **Coinflip:** control 0, `activate_atomic` → `pay` en la misma transacción; nunca persiste `Active`; `Pending` sin expiración.
- **Battleship (#18), fases simultáneas** (ambos comprometen su tablero): `activate(..., first_to_move = 3)`; cada jugador llama a la `entry` del juego, que valida su jugada y llama a `record_move`: el primero en comprometer deja `rem = {el rival}` y debe pasar `next = rem` (el plazo del rival **no** se mueve); el último en comprometer deja `rem = 0`, y el juego pasa `next = quien dispara primero`, con **plazo nuevo completo** (también si es el mismo jugador que cerró la fase). Variante opcional para #18 (R3-6 (b)): evitar la fase simultánea inicial (el creador compromete su tablero al crear, como dynamic field sin valor en `Pending`, y el aceptante dentro de la transacción de `activate`); así el griefing de S-1 desaparece al arranque.
- **Fases por turno:** cada jugada válida llama a `record_move(next = el rival)` (o `next = el mismo jugador` si las reglas del juego le dan otra jugada): el plazo se reinicia por jugada.
- **Vence con ambos pendientes** (nadie comprometió el tablero): `refund_stalled` 100/100 sin comisión (S-1).
- **Vence con uno pendiente:** el que ya jugó reclama con `claim_timeout`.

**Tests (TASK-2b):** `ahora == deadline_ms - 1`: `record_move` pasa y `claim_timeout` aborta con `ENotExpired`; `ahora == deadline_ms`: `record_move` y `collect` abortan con `EDeadlinePassed` y `claim_timeout` pasa; un tercero llama a `claim_timeout` y el `Coin` va al rival (no a quien llama); con `to_move` 1 y 2 el ganador es el rival correcto, con cada `fee_rate` (0/250/1000) y pozos impares, y `payout + fee == 2 × bet`; con `to_move == 3`, `claim_timeout` aborta con `EBothPending` y `refund_stalled` reembolsa `bet` a cada uno al vencer; con un solo pendiente `refund_stalled` aborta con `ENotStalled` antes de `deadline_ms + CLAIM_GRACE_MS` y pasa después; **`refund_stalled` funciona con la House en otra versión y `claim_timeout` aborta con `house::EWrongVersion` en ese caso** (INV-D2, el corte); reglas del plazo (bits): entrega de turno (`rem == 0`, `next` = el rival) reinicia a `ahora + turn_ms`; el mismo jugador que sigue (`rem == 0`, `next` = él) **también reinicia**; fase simultánea con otro pendiente (`rem != 0`) **no** reinicia y deja `to_move = rem`, y `next_to_move != rem` aborta con `EPhaseMismatch` (con `next` = 1, 3 y 0 cuando `rem = 2`, y con `rem = 1`); la fase simultánea se corre **en los dos órdenes** (A primero y B primero: son simétricas pero tocan bits distintos); cierre de fase con el mismo jugador primero (`rem == 0`, `next` = quien cerró) reinicia; con `rem == 0`, `next_to_move == 0` o `> 3` aborta con `EBadMask`; el caso del MAYOR (B compromete al final de la fase y le toca disparar) recibe un plazo completo; `collect` desde un tercero aborta con `ENotPlayer` y desde cualquiera de los dos jugadores **fuera de turno** pasa (rendición); un jugador que no está en `to_move` aborta con `ENotYourTurn` y un tercero (no jugador) con `ENotPlayer`, **antes** de mirar el plazo y la máscara; `turn_ms` de cada uno de los 8 ids (0 y 1..7) y el id 8 o 255 aborta con `EBadControl`; `activate` con control 0 aborta con `ENoClock` y `activate_atomic` con control > 0 con `EHasClock`; después de `pay` o `claim_timeout`, `claim_timeout`/`refund_stalled`/`record_move` abortan con `ENotActive`; ambos jugadores reciben exactamente lo previsto; con el juego `#[test_only]` en `tests/` (no publicado), una partida completa por turnos y una con fase simultánea. La no composición de `entry` con un hot potato en un PTB (H-14) no se puede probar en `test_scenario`: va a TASK-1 como sonda (V-15).

**Riesgos de producto (a dejar escritos para el owner y la UI):**
1. **El plazo mínimo es 10 minutos y la firma de la wallet cuenta:** un jugador que abre la ventana de firma cerca del plazo puede perder la partida si la transacción se ordena después del `deadline_ms`. La UI muestra el tiempo restante y no ofrece "jugar" una vez vencido; no hay período de gracia para mover.
2. **El borde lo fija el consenso:** `ahora` es el timestamp del `Clock` en la ejecución de esa transacción; entre una jugada y un reclamo cerca del plazo gana el orden de consenso, y la regla "mover si `ahora < deadline_ms`, reclamar si `ahora ≥ deadline_ms`" garantiza que solo una de las dos puede tener éxito (V-13 confirma que `borrow()` lee el mismo reloj).
3. **Griefing "ambos pendientes":** un jugador puede aceptar y no comprometer su tablero para inmovilizar al creador hasta el plazo (≤ 7 días) y recuperar su apuesta sin perder; es la contraparte de S-1 (100/100). Con reloj corto (10-60 min) el costo para el creador es bajo.
4. **Cliff de reclamo:** un ganador que no reclama en `CLAIM_GRACE_MS` pierde la ventaja de poder cobrar (cualquiera puede reembolsar 100/100 desde entonces): la UI muestra la cuenta regresiva y la app (opcionalmente un guardián) puede reclamar por él (S-3).
5. **Congestión en la jugada ganadora:** la liquidación por jugada (`collect`) toca la `House` compartida (`&mut House`), a diferencia de `record_move`, que solo toca el `Duel`. Una cancelación por congestión (`ExecutionCancelledDueToSharedObjectCongestion`, `agents.md` §7) cerca del plazo puede dejar que el rival reclame por tiempo antes de que se repita la jugada ganadora. La app reintenta y muestra el tiempo restante; el riesgo crece con plazos cortos y con contención sobre la House (R-8).
6. **Sin empate acordado (nota para el owner):** el estado terminal `Expired` significa "nadie movió a tiempo (o reclamo no hecho a tiempo): 100/100 sin comisión" y no puede cambiar de significado ((d)(vi)). Un juego futuro con tablas necesitaría otro tipo base. Battleship no lo necesita.

**Evaluación de `sui::clock::borrow()` (s-4, corregida con N-3):** a favor, no pasa un `Clock` por las `entry` (la app y los tests no arman el objeto `0x6`), y las tres funciones genéricas que usan el reloj no necesitan argumento de tiempo; los tests usan `test_scenario::set_clock_timestamp` (los helpers viejos están deprecados y con `--warnings-are-errors` romperían el build). En contra: existe **solo desde PV 142** y el framework de PV 142, que el `Move.lock` actual (PV 140) **no** tiene; por eso **TASK-2 depende de PRE-1 mergeado y con el lock repinado a un framework ≥ PV 142**. Mainnet **sin verificar** (V-13). Alternativa: `&Clock` explícito (portable, con helpers de test deprecados). **Recomendación: `clock::borrow()`**; si V-13 mostrara que no compila o no ejecuta, se cae a `&Clock`. La API de test exige `ms` creciente (no hay setter sobre `Scenario`).

### 2.7 Aleatoriedad y la base (SEG-5, m-4)

- `duel` **no recibe `Random`**; solo `coinflip` combina `Random` con la base, en una `entry` no `public` (como `game.move:142`), con el orden **validar y cobrar (`activate_atomic`) → sortear → pagar (`pay`)** (PROY-5, `game.move:149-158`). Entre el sorteo y `pay` no hay nada que dependa del resultado y pueda abortar (`EBadWinnerIndex` y `EWrongDuel` son deterministas).
- El lint `public_random` **no alcanza** (H-11): solo mira funciones `public` con `Random` como parámetro directo y se puede silenciar. Reglas de revisión, escritas en el README y en ESTANDARES (TASK-8), con un `grep` opcional en CI: **ningún** `#[allow(lint(public_random))]` en `sources/`; **ningún** struct con un campo `RandomGenerator`; **ninguna** función `public` de `duel` **ni** de un módulo de juego devuelve `Collected` ni recibe `&mut Duel<G>` (las que crean, mutan o cobran son `public(package)` con el witness por valor; las `entry` de un juego, sin `public`); toda función con `Random` es `entry` con el generador creado adentro.
- Defensa en profundidad (N-5, H-14): como `Collected` no tiene abilities, un PTB no puede retenerlo e intercalar una `entry` privada con el mismo `Duel` entre `collect`/`activate_atomic` y `pay`.
- Los juegos de terceros (F2 (b)-(d)) reabren el ataque de abortar-y-reintentar sin que la House pueda cerrarlo: STOP aparte (P-4).

---

## 3. F2 — Comisiones entre paquetes

### 3.1 Verificación: ¿puede un módulo nuevo de un upgrade llamar a `house::add_fees` sin cambiar su firma?

**Sí, por la fuente; falta el ensayo (V-1).** Cadena de razonamiento (H-1, H-4):
1. `public(package)` no es una regla de runtime por módulo: el compilador permite la llamada si el llamador comparte paquete y dirección con el llamado y **agrega al módulo llamado una declaración de amigo** (`typing/core.rs:2308-2315`, `typing/translate.rs:210-250`).
2. En un upgrade se recompila y publica **el paquete completo**: el `house` nuevo trae a `duel` en su lista de amigos y la llamada verifica (`dependencies.rs:101-103`). La firma de `add_fees` no cambia (`house.move:150`).
3. La compatibilidad `compatible` no compara la lista de amigos (`compatibility_mode.rs:264-275`); en la **cadena**, `additive` tampoco (solo `dep_only`, `inclusion_mode.rs:131-133`). **Medido en TASK-1b (V-2):** la **CLI 1.84.0 sí** verifica localmente `additive` contra la lista de amigos de `house` (`EUC01009 friend mismatch`) y exige `--skip-verify-compatibility` (la cadena lo acepta con esa bandera); con `compatible` (D7) no ocurre, y el script de upgrade nunca pasa esa bandera.
4. Un paquete **externo** no puede ser amigo de `house` (H-1).

### 3.2 Alternativas

| | (a) Módulos del mismo paquete | (b) API `public` + witness por juego registrado | (c) `GameCap` por juego emitido con el `HouseCap` | (d) Paquetes externos |
|---|---|---|---|---|
| API nueva en `house` | **Ninguna** | `public fun` nueva: firma **congelada** (H-4) | `public`/`entry` nueva + tipo nuevo | Una de (b) o (c) |
| Quién deposita | Solo módulos del paquete; agregarlos exige el `UpgradeCap` | Quien tenga un witness registrado; exige un registro con bootstrap manual | El titular del cap del juego | Autores externos |
| Riesgo de fondos | Depositar solo **suma** a `fees_collected`; retirar exige el `HouseCap`. Confianza: la del `UpgradeCap` (`contracts/README.md:165-168`) | Un witness mal registrado deposita (suma); el registro es una pieza más | Pérdida del cap = el juego no cobra | Un juego malicioso con función `public` + `Random` |
| SEG-5 | `entry` + gate de lint + reglas de §2.7 | No impide el ataque de otro paquete | Idem | **Abierto**: una `public fun` ajena con `Random` permite abortar-y-reintentar; la House no puede cerrarlo |
| Costo | Cero | Alto | Alto | Muy alto |

**Recomendación (una): (a).** Cero superficie nueva; la autoridad para agregar juegos queda donde ya está (el `UpgradeCap`). Juegos de terceros: STOP aparte (P-4).

---

## 4. F3 — Contrato: upgrade compatible o republicación

### 4.1 Comparación

| | **Upgrade compatible** | **Republicación** |
|---|---|---|
| Qué cambia | Paquete versión 2 con los módulos viejos + nuevos; `originalPackageId`, `House`, `HouseCap`, `UpgradeCap` y partidas no cambian | Paquete, House, `HouseCap` y `UpgradeCap` nuevos; historial bajo otro ID |
| Qué NO se puede cambiar | Firmas `public`, layouts y abilities de tipos existentes, variantes de enums, borrar módulos/tipos (H-4, `move_package.rs:837-892`). Sí: módulos y tipos nuevos, cuerpos, firmas `entry`/`public(package)` | Nada: es otro paquete |
| Partidas `Pending` del coinflip | **Siguen en su sitio y jugables** (`VERSION` sin subir): `accept_game`, `cancel_game`, `reject_game` desde el ID viejo o el nuevo | Quedan en el paquete viejo; solo se cancelan por CLI (D-20261103-01 (2) b) |
| Comisiones de la House vieja | Siguen en la misma House (200 bps, `fees_collected` intacto) | Hay que retirarlas antes (D-20261103-01 (2) a) |
| Operación previa | Ninguna obligatoria | La de D-20261103-01 (2) (a)-(c), **vencida con #17**: decisión nueva del owner |
| `testnet.json` / `Published.toml` | Se **actualizan** (`packageId`, `packageVersion`, `sourceCommit`, `suiCliVersion`, `frameworkRev`; el resto no cambia) más `upgrades` y `typeOrigins` (§4.4) | El script y la CLI **rechazan** publicar con ambos presentes (`contracts/README.md:682-694`) |
| Costo operativo | Un PTB de upgrade del owner | Publicar, `update_fee_rate` a 200, retirar y cancelar lo viejo, repetir el smoke |
| Camino a mainnet | Es el único real en mainnet | No sirve de precedente |
| Qué compra de más | — | Rediseño libre de `Game` y `House` (no se necesita) |

**Recomendación (una): upgrade compatible.** Si el ensayo (TASK-1) mostrara que compilador o VM lo rechazan, el plan cae a republicación como STOP nuevo (R-1).

### 4.2 (i) Política del `UpgradeCap`

- Opciones: `compatible` (hoy: `policy` 0, `version` 1, `package` = `packageId`, H-13), `additive`, `dep_only`, inmutable. **Cada restricción es irreversible**; el titular es de confianza total (`contracts/README.md:165-172`).
- **Con #73 conviene `compatible`:** `dep_only` prohíbe módulos nuevos (`context.rs:2559-2561`) e impediría este upgrade; `additive` bloquea cualquier cambio de cuerpo (H-5): no permitiría subir `VERSION` ni corregir un bug.
- **Matiz de `additive` (m-5):** `InclusionCheck` compara las funciones normalizadas con su código; "`house.move` no cambia" **no garantiza** bytecode idéntico si cambia el compilador (1.84 frente a 1.83). El criterio de mainnet "`additive` + juegos como módulos nuevos" tiene que probarse con la CLI de PRE-1 sobre un paquete publicado con la 1.83, que es el caso real (V-2, prioridad normal).
- **Decisión vigente y sin reabrir:** D-20261103-01 (1). El plan solo pide **confirmar** que no se restringe antes de #18 (P-7). Para mainnet (no se decide acá): política y multifirma/retardo del `UpgradeCap` antes de mainnet.
- **Quién firma:** el owner, desde su terminal y con su `SUI_CONFIG_DIR` propio (D-20261102-03); ningún agente publica ni hace upgrade. El `UpgradeCap` está en la dirección publicadora (D-20261104-06).
- Testnet vs mainnet: en testnet se acepta que la cuenta del navegador y la del `UpgradeCap` sean la misma (D-20261104-06); **no vale para mainnet** (`agents.md` §12).

### 4.3 (ii) `VERSION`, `migrate` y el procedimiento de corte

- **Recomendación: no subir `VERSION` en este upgrade.** Nada de la House cambia; con `VERSION` igual, v1 y v2 operan sobre la misma House, las `Pending` existentes se pueden aceptar/cancelar/rechazar como siempre y la app vieja no se rompe; no hace falta `migrate`; y no se toca el significado de `EVersionMismatch` (7) (`game.move:185`).
- **Lo que esto significa (R-3; decidido en P-6):** sin subir `VERSION`, **nada se corta**. `create_game`/`accept_game` de v1 y `create`/`activate`/`collect`/`claim_timeout` de v2 siguen operativos a la vez, y los reembolsos (`cancel`/`reject`/`refund_stalled`) no se cortan nunca, a propósito. **Una app que deja de ofrecer una función no es una barrera**: toda versión publicada sigue invocable por CLI (`contracts/README.md:152`) y un upgrade v3 con el arreglo **no desactiva** la v2.
- **Procedimiento de corte (contingencia, ante un bug de pago descubierto después):** (1) upgrade v3 con `VERSION = 2` y el arreglo; (2) `migrate` del paquete nuevo por el titular del `HouseCap` en la transacción inmediata siguiente (`house.move:132-137`); (3) desde ahí el código **v1 y v2** no puede leer ni escribir la House (`house.move:186-188`): `create_game` y `create` abortan con `house::EWrongVersion`; `accept_game` aborta con `EVersionMismatch` (partida con `version = 1`, `game.move:185`) o en el cobro; `activate`, `activate_atomic`, `collect` y **`claim_timeout`** abortan antes de mover fondos (regla de §2.1.5). (4) **No se cortan** `cancel`, `reject`, `refund_stalled` ni `cancel_game`/`reject_game` (D-20261030-12 §4). (5) Qué decide la v3 sobre las `Game`/`Duel` con `version = 1`: en `Pending`, por defecto solo se cancelan o rechazan; en `Active`, **criterio por defecto (R3-3):** la v3 vuelve a habilitar `collect` y `claim_timeout` para los `Duel` con `version = 1`, **salvo** que el bug que motivó el corte esté en esos caminos o en el reloj (`to_move`, `deadline_ms`); en ese caso **100/100 por `refund_stalled` es el modo de falla deseado**, porque es neutral (nadie gana por un dato que puede estar corrupto). **Durante el corte las jugadas siguen** (`record_move` no lee la House) **pero no se puede liquidar** ni reclamar: toda partida `Active` en curso termina en `Expired` 100/100 tras la gracia si la v3 no rehabilita esos caminos.
- **Interacción con el reloj (decidido, P-14 S-2; revisado por el MAYOR).** `claim_timeout` mueve fondos **y cobra comisión**: por la regla de §2.1.5 lee la House con versión, así que un corte lo bloquea. Un reclamo **sin** House no puede cobrar comisión (`fees_collected` vive en la House). Alternativas evaluadas: (A) cobrar siempre la comisión y que el corte bloquee el reclamo, con la salida mínima `refund_stalled` tras `CLAIM_GRACE_MS` **[elegida, P-14 S-2 (i)]**; (B) no cobrar comisión en los reclamos (nunca se bloquea, pero el owner pidió "pozo menos la comisión" y se pierde ingreso en abandonos); (C) acumular la comisión dentro del `Duel` y pagarla a la House después (rompe INV-D1: valor fuera de `stake`). Con (A): durante un corte, un `Active` vencido con un solo pendiente no puede reclamarse con comisión hasta que la v3 lo permita; a los `CLAIM_GRACE_MS` cualquiera lo reembolsa 100/100 sin comisión (el ganador pierde la ventaja, pero **ningún fondo queda bloqueado**). Costo a aceptar (S-2): ese reembolso también está disponible, pasado el cliff, **sin corte**, si el ganador no reclamó a tiempo.
- **Ventana `upgrade` → `migrate`:** el código nuevo aborta con `EWrongVersion` hasta el `migrate`; se hace inmediatamente y la app nueva no se despliega hasta verlo. Un corte **no se necesita** hoy y cortar más tarde sigue siendo posible: no subir `VERSION` ahora no lo impide.

### 4.4 (iii) Cómo identifica la app los tipos, eventos y argumentos de tipo de un upgrade

- Hoy todo se arma con `originalPackageId` (citas en 1.1): correcto para `house::*` y `game::*` (existían desde la v1), **incorrecto** para cualquier tipo de un módulo nuevo: un evento de `duel` o `coinflip` publicado en el upgrade de #73 lleva el ID del **paquete del upgrade** (H-2); uno de Battleship (#18), el de **su** upgrade. Un tipo genérico lleva varios IDs en el tag (`<id de duel>::duel::Duel<<id de coinflip>::coinflip::Coinflip>`).
- **También los `typeArguments` de las `entry` genéricas** (`cancel<G>`, `reject<G>`, `claim_timeout<G>`, `refund_stalled<G>`) se arman **por diseño** con el ID de **definición** de `G` (`typeOrigins`), que siempre resuelve. **Medido en TASK-1b (V-12):** un ID de almacenamiento de una versión **≥** la que introduce el módulo también resuelve (el runtime normaliza al ID de definición, sin confusión de tipos: el tipo resultante es el canónico); solo falla con `TypeNotFound` un ID de una versión **anterior** a la definición o el ID original para un tipo de un upgrade. El motivo de la regla es tener **una sola** forma que no dependa de ese comportamiento del runtime; el **target** de la llamada sí necesita una versión que contenga el módulo (el `packageId` vigente) y la **lectura** de tipos (eventos, objetos, filtros) sí exige el ID de definición (V-3, V-4).
- **Datos del json (campos opcionales, sin subir `schemaVersion`; la app ignora claves desconocidas, `config.ts:68-70`):**
  - `upgrades: [{ version, packageId, txDigest }]` (s-3): uno por upgrade, en orden (`version` 2..`packageVersion`); `publishTxDigest` sigue siendo el de la publicación original (`config.ts:29-31`);
  - `typeOrigins: [{ module, name, definingId }]`: la tabla de orígenes del objeto paquete (misma forma que la lectura GraphQL del Apéndice).
- **Validación (M-6; `typeOrigins` es el primer campo que no sale de `Published.toml`):**
  1. `check` offline (CI), en `deployment.mjs`: los tipos de `house` y `game` llevan `originalPackageId`; todo `definingId` es `originalPackageId` o un `packageId` de `upgrades`; `upgrades` consecutivo, con el último `packageId` = `packageId` y `version` = `packageVersion`; con `packageVersion > 1`, `upgrades` y `typeOrigins` son obligatorios;
  2. la app (tests): cada tipo del registro tiene entrada en `typeOrigins` (si falta, **error de configuración**, no "no hay partidas");
  3. verificación **contra la cadena** (no la puede hacer la CI offline): el runbook (paso 6) y el smoke de TASK-9 comparan `typeOrigins` con la tabla del paquete por lectura pública (GraphQL de solo lectura, o la CLI);
  4. una sola fuente de verdad: lo escribe el script a partir del upgrade real (V-6), nunca a mano (ARQ-6).
- `packageId` (el último) es solo el **target de llamadas** (`transactions/game.ts:16-21`); tipos y `typeArguments` salen de `typeOrigins`. `errors.ts:195-206` acepta hoy `packageId` y `originalPackageId`. **Medido en TASK-1b (V-5):** `MoveAbort.location.package` es el ID de la **versión ejecutada**, así que `errors.ts` acepta `packageId`, `originalPackageId` y **todos** los de `upgrades`, con un test por ID.
- Con `packageVersion == 1` (el `testnet.json` de hoy) el mapa puede faltar y todo cae al ID original; el registro de la app queda **sin** fuentes `duel` y el juego "Coinflip" muestra solo la fuente `legacy`. Así el build de la CI y de Railway antes del upgrade sigue válido.

### 4.5 (iv) Toolchain: PV 142 y la CLI

- **Qué release cubre la PV 142:** `1.84.0` (2026-11-10T19:01:47Z; cumplió 7 días el 2026-11-17) y `1.84.1` (2026-11-17T20:35:31Z; cumple 7 días el **2026-11-24T20:35:31Z**), ambas con `MAX_PROTOCOL_VERSION = 142` (H-7) y ambas con el framework que tiene `clock::borrow` (H-10); la `1.83.x` llega a 140. `1.84.1`: tgz `sui-testnet-v1.84.1-ubuntu-x86_64.tgz`, SHA-256 `35f714a8130f62612bb0ec4d15a5a43cd04015b52c2cc0a37d92e8e7181df06c`, commit `e83d69069e4023cce4a2dcde2b9c74384418fee1` (⇒ `SUI_COMMIT` = `e83d69069e40`, a confirmar con `sui --version`). La PV de testnet **se mueve sola** (140 en #8, 142 hoy): se mide justo antes de cada paso.
- **Qué arrastra subir la CLI** (para el task previo):
  1. `.github/workflows/ci.yml`: `SUI_VERSION`, `SUI_COMMIT`, `SUI_TGZ_SHA256`, `SUI_BIN_SHA256` (`ci.yml:20-25`; el último, `sha256sum` del binario local instalado con `suiup`), el check de versión (`ci.yml:98`) y `framework-drift` (`ci.yml:198-260`).
  2. `contracts/Move.lock`: repin con `cd contracts && printf 'n\n' | sui move update-deps -e testnet` al framework de la PV vigente (el de la PV 142 si sigue en 142; V-7). Delta justificado (PROY-11, `STATUS.md` H13). **Este repin da el framework con `clock::borrow`** (H-10) y es la **precondición de TASK-2**.
  3. `contracts/scripts/`: `publish.mjs` exige CLI = `ci.yml` (D-20261102-01 (4)); `publish.test.mjs`, `deployment.test.mjs` y `scripts/fixtures/*` son salidas reales de la 1.83: recaptura en localnet aislada.
  4. Fixtures `contracts/fixtures/*.localnet.json`: recaptura con `app/scripts/capture-*.mjs`; si solo cambia `_meta.capturedAt`, no se commitea.
  5. Re-medir gates con el compilador nuevo (lints nuevos; los helpers de `sui::clock` deprecados no se usan hoy), `node --test`, `check`, app y `dist`.
  6. Docs: `agents.md` §3/§11, `documents/STATUS.md` (Toolchain, H1, H13, baselines), `contracts/README.md`, y `Published.toml` (`toolchain-version`, lo reescribe la CLI).
  7. Pre-vuelo de #8 (PV, dry run, ensayo en localnet) antes del upgrade real.
  8. Externo a vigilar: la `1.84.0` cambia el formato de cursores de `ListEvents` y la forma de fallar bajo el piso (`BELOW_EARLIEST_AVAILABLE`); `app/src/sui/eventScan.ts:130-140` trata `OUT_OF_RANGE` como piso (V-9).
- **Decidido por el owner (P-8, 2026-11-19): task/PR previo y separado** (issue propio) con la CLI **`1.84.0`** (ya cumple 7 días), mergeado a `master` **antes** de TASK-2 y del upgrade. La CLI y el repin del lock fijan el compilador y el framework con los que se compila y enlaza el paquete del upgrade (no delegable). La `1.84.1` queda descartada por ahora (cumple 7 días el 2026-11-24T20:35:31Z; el criterio de edad no es una regla registrada para la CLI: SEG-8 es de npm y DL-8 fue del plan de #15, D-20261104-07). Si el día de PRE-1 testnet ya no está en PV 142, se revisa.
- La rama de #73 integra `master` por merge (no rebase) antes del upgrade, porque el `sourceCommit` del json tiene que seguir existiendo en `master` (`contracts/README.md:864-865`).
- **Precondición del runbook (m-7):** la CLI local del owner es **la misma** que `ci.yml` (`sui --version` = `${SUI_VERSION}-${SUI_COMMIT}`); si no, `publish.mjs` aborta.

---

## 5. Migración desde el coinflip actual

- **Convivencia, no reemplazo:** `game::Game` y sus cuatro `entry` no se tocan (ni `game.move` ni `house.move`: solo cambia el bytecode de `house` por la lista de amigos, H-1). Las partidas `Pending` siguen jugables desde cualquiera de los dos IDs.
- **"Juego 0" en la app:** un juego "Coinflip" con dos *fuentes* de tipos: `legacy` (`game::Game`, tipos con el ID original) y `duel` (`Duel<Coinflip>`, control 0 "sin reloj"). Lista, detalle, "Mis partidas" y acciones leen las dos; **crear** va solo a `duel`. On-chain, `create_game` v1 sigue invocable por CLI para siempre (inofensivo, y la app lo lista como "anterior"); recordar que **no se puede cortar** sin subir `VERSION` (§4.3).
- **Comisiones copiadas:** el `Duel` copia `fee_rate` al crear (D-20261030-06 §3); las viejas conservan la suya; la House es una sola (`fees_collected` junta las dos fuentes).
- **Fórmula de pago:** la misma (D-20261030-16 D2/D3: piso sobre el pozo completo, `u128`), también en el reclamo por tiempo. `resolutionAmounts` (`app/src/sui/game.ts:142-146`) sirve para ambas fuentes. Si un upgrade futuro la cambia, conserva la vieja para lo ya resuelto (`agents.md` §5), por fuente.
- **Ventana del fullnode (#51):** las `Pending` viejas se ven mientras el fullnode conserve su `GameCreated`; las más viejas se abren por enlace o ID.
- **Descartadas (P-3):** (M-A) sin coinflip nuevo: la base queda sin uso real hasta #18; (M-C) subir `VERSION` y retirar el viejo: bloquea `accept_game` viejo (§4.3).

---

## 6. Contrato on-chain (impacto)

**Cambios del paquete (todos aditivos; `house.move` y `game.move` no cambian):**
- módulo nuevo `duel` (§2.4-§2.5) y módulo nuevo `coinflip` (witness `Coinflip`; `entry` de crear (control 0) y aceptar con `Random` sobre `activate_atomic`, sorteo por índice sin ramas); **ninguno tiene `init`** (H-6: correría en el upgrade y transferiría objetos no planeados; si un `init` se quisiera, sería un STOP con qué crea y a quién);
- tests: `contracts/tests/duel_tests.move` (con un juego `#[test_only]` en `tests/`, no publicado) y `contracts/tests/coinflip_tests.move`;
- abort codes por módulo, estables desde el primero (PROY-2); la app mapea por **módulo + código** (`errors.ts:8-29`): `duel` y `coinflip` entran en `ABORT_MESSAGES` en el mismo PR.

**Compatibilidad (H-4):** módulos y tipos nuevos; ninguna firma `public` nueva (PROY-4); las `entry` genéricas y la API `public(package)` pueden cambiar o quitarse en upgrades futuros, **pero las versiones ya publicadas quedan invocables**; `Game`, `GameState`, `House`, `HouseCap` idénticos. `Duel`, `DuelState` (seis variantes) y los eventos **quedan congelados desde la publicación**, con la tabla de controles de tiempo (ids 0-7) como parte de su contrato.

**Documentación que cambia (PROY-20):** `contracts/README.md` (tablas de `duel`/`coinflip`, controles de tiempo, "Modelo de confianza" con la restricción (d) y la garantía de `Active`, runbook de upgrade), `agents.md` §5/§8/§9 (con un **espejo de la tabla de controles de tiempo** en `app/src/sui/`, igual que `HOUSE_MAX_FEE_BPS`), `app/README.md`, `ESTANDARES.md` (ARQ-1, PROY-1, PROY-7, PROY-8, PROY-10, regla anti-`Random` de §2.7) y `DECISIONES.md` (restricción (d), P-1..P-14).

**`deployments/<red>.json` (ARQ-6):** campos opcionales `upgrades` y `typeOrigins`, registrados en `OPTIONAL_FIELDS` y en la tabla de `contracts/README.md:610-628`, **sin** subir `schemaVersion`.

---

## 7. Flujo de fondos

| Camino | Entra | Custodia | Sale | Comisión |
|---|---|---|---|---|
| Crear | `Coin<SUI>` del creador → `stake` (`bet` entre `min_bet` y `max_bet` de la House) | `Duel.stake` | — | `fee_rate` copiado |
| Cancelar / rechazar | — | — | 100 % de `stake` al **creador** (genéricas; sin House ni versión) | ninguna |
| Aceptar coinflip (una transacción, control 0) | `Coin<SUI>` exacto → `stake` (`2 × bet`) vía `activate_atomic` | `Duel.stake` | `activate_atomic` cobra la comisión → `fees_collected`; sorteo; `pay`: `pozo − fee` al ganador | `⌊pozo × fee_rate / 10_000⌋` **antes** del sorteo |
| Aceptar un juego con reloj (#18) | `Coin<SUI>` exacto → `stake` (`2 × bet`) vía `activate` | `Duel.stake` | (se juega) | — |
| Liquidar por jugada o rendición (#18) | — | — | `collect` + `pay`: `pozo − fee` al ganador | al liquidar, en la misma transacción |
| **Reclamo por tiempo** (vence el plazo de quien debe mover, un pendiente) | — | — | `claim_timeout`: `pozo − fee` al rival del que no movió (cualquiera ejecuta) | `⌊pozo × fee_rate / 10_000⌋` a `fees_collected` |
| **Vence con ambos pendientes**, o pasados `CLAIM_GRACE_MS` sin reclamo | — | — | `refund_stalled`: `bet` al creador y `bet` al aceptante | ninguna |

Conservación: `payout + fee == 2 × bet`; `stake == 0` en terminales; Σ Δsaldos + Σ gas = 0. Tests con balances antes/después de cada actor y de la House, ambos resultados del coinflip, los dos pendientes del reclamo, `fee_rate` 0/250/1000, **pozos impares** (redondeo) y una House compartida entre `Game` y `Duel`.

---

## 8. F4 — App

Alcance de #73: la **capa de datos** y los cambios mínimos de pantalla. El rediseño es de #72; acá solo se dice **qué se acopla**.

### 8.1 Registro de juegos (`app/src/sui/gameRegistry.ts`, nombre ilustrativo)
- Un `GameDef` = clave (`coinflip`, luego `battleship`), etiqueta, si se puede **crear**, **si usa reloj** (qué controles ofrece), y una lista de **fuentes** (`legacy` = `game::Game`; `duel` = `Duel<G>` y sus eventos). Cada fuente declara: tipos con `definingId`, parsers de objeto y evento, builders (con `typeArguments` desde `typeOrigins`), los eventos que "envía" un jugador (para "Mis partidas") y la vista de detalle.
- Config por red desde `deployments/*.json` (`config.ts:147-152`): paquete vigente + `upgrades` + `typeOrigins`. Una sola lectura de config (ARQ-8); ningún componente arma tags ni targets (ARQ-1, PROY-13). La capa `sui/` no importa React (`app/README.md:314-342`).
- **Controles de tiempo:** espejo de la tabla de §2.4 (id → `turn_ms` y etiqueta "10 min por jugada", "1 día por jugada", "sin reloj") en `app/src/sui/`, igual que `HOUSE_MAX_FEE_BPS` (`agents.md` §5): solo para mostrar y validar de cortesía; el contrato aborta igual con `EBadControl`.

### 8.2 Lobby, listas y vistas de partida
- **Lobby:** muestra el **control de tiempo de cada partida** (lo trae `DuelCreated`: `control`/`turn_ms`) antes de aceptar. El lobby de hoy lee un literal (`lobby.ts:57`) con `startCheckpoint` = máx(publicación, piso + margen) (`eventScan.ts:18-60`). Propuesta: **un solo** `ListEvents` con el OR de los `*Created` de los juegos elegidos (el nodo admite DNF con varios términos: `myGames.ts:82-90`); un cursor y una cota **mientras el filtro tenga ≤ 10 literales**; si se parte en trozos (medido abajo), cada trozo lleva su cursor con la **misma** cota y la app fusiona los resultados por (checkpoint, transacción, índice del evento). El parser despacha por el tipo del evento. Filtro por juego: "Todos" o uno; el nodo no filtra por campo (`contracts/README.md:548`), por eso se filtra por **tipo**. V-4 mide `emitModule` (`contracts/README.md:546`) frente al OR de literales y **cuántos términos admite la DNF**. **Medido en TASK-1b (V-4):** `ListEvents` admite **como máximo 10 literales por filtro** (cuenta literales, no términos; con 11 responde `INVALID_ARGUMENT`), de modo que el pedido se parte en trozos si los supera; el literal `eventType` **sin parámetros de tipo** es un **prefijo** de todas las instanciaciones ("Todos" usa un literal por evento y un juego usa el tag completo); `eventType` exige el ID de **definición**; `emitModule` depende del ID de la versión emisora y **no sirve** para el lobby; las direcciones van de 64 hex.
- **Formulario de crear:** solo para los juegos que usan reloj ofrece los 7 controles (rapid 10/20/30/60, daily 1/3/7); el coinflip crea con control 0 sin mostrarlo como opción.
- **Vista de una partida activa** (juegos con reloj): muestra **de quién es el turno** (máscara `to_move`), el **plazo** (`deadline_ms`, cuenta regresiva con el tiempo de la cadena como referencia) y, vencido el plazo, el botón de **reclamar victoria** (`claim_timeout`) para el rival, o de **reembolsar** (`refund_stalled`) cuando corresponde (ambos pendientes, o pasada la gracia). La elegibilidad la decide la cadena: la **preflight** de la máquina de transacciones (simula una copia antes de firmar, `app/README.md:466-520`) ya muestra `ENotExpired`/`ENotStalled` mapeados. El detalle de una partida terminada distingue `Resolved`, `TimedOut` ("ganó por tiempo") y `Expired` por la variante del objeto.
- "Mis partidas" (#13) asume que el creador emite la creación y el aceptante la resolución (`contracts/README.md:546-549`, `myGames.ts:82-90`): vale para el coinflip; **no** para un juego por turnos donde un rival cierra la partida del otro (ni para `DuelTimedOut`, que puede emitir cualquiera): lo declara cada juego en el registro y es de #18. En #73, las dos fuentes del coinflip.

### 8.3 Máquina de transacciones, candado y ventana del fullnode
- La máquina (#12-#14) se ata a un **objetivo** (`{kind:'create'}`, `{kind:'game', gameId}`, `{kind:'house'}`, `queryKeys.txTarget`, `app/README.md:466-520`). El ID de un `Duel` es global como el de un `Game`: el candado y el "sin confirmar" **no cambian de forma**. Cambian: (1) las claves de lista (`queryKeys.ts:15`, `txInvalidation.ts:19-52`) ganan la dimensión del juego; (2) cada `build`/`interpret` viene del registro; (3) las acciones nuevas `claim`/`refundStalled` son del objetivo `game` e invalidan esa partida, el saldo de quien llama y la House (cobro de comisión), como `accept`.
- **Reloj en pantalla:** la cuenta regresiva es estado de presentación; no pide datos con `useEffect` (PROY-14); el detalle exacto va en TASK-8.
- Aceptar con `Random`: el builder del coinflip nuevo conserva "el `MoveCall` con `Random` va último" (`transactions/game.ts:69-98`); `claim_timeout` y `refund_stalled` no llevan `Random`.
- Ventana del fullnode (#51, D-20261103-03): sin cambios de fondo; cada fuente nueva empieza en el checkpoint de su upgrade. Las partidas activas viven en el **objeto**, que no se poda.
- **Acople con #72:** #72 declara `sui/` y los hooks sin cambios de contrato y deja el multijuego fuera (#72, "Restricciones" y "Fuera de alcance"); #73 los cambia. Recomendación (P-10): #73-app aterriza **antes** de implementar #72 y el plan de #72 incluye en sus wireframes el filtro por juego, el selector de control de tiempo, el turno y la cuenta regresiva; #73 entrega solo controles mínimos con los componentes existentes. No se acopla: identidad visual, layout móvil, estados de carga y textos.

---

## 9. Camino de #18 (Battleship)

| Qué necesita #18 | De dónde sale |
|---|---|
| Custodia y ciclo crear/aceptar/cancelar/rechazar | `Duel<Battleship>` (#73) |
| `Active`, turno, plazo y abandono (el rival reclama) | La base (#73): `activate` (con `first_to_move`), `record_move`, `claim_timeout`, `refund_stalled`; **el plazo lo fija la base** con `turn_ms`, nunca el juego |
| Fase simultánea (ambos comprometen el tablero) | `first_to_move = 3` y `record_move(next = el rival que falta)`; al completar, `record_move(next = quien dispara)` |
| Comisión | `collect` + `pay` desde el módulo, al liquidar (tablero hundido, rendición) |
| Compromiso del tablero, validación de disparos | Dynamic fields del `Duel` **sin valor** y lógica del módulo (#18) |
| Aleatoriedad (quién empieza) | `Random` solo en una `entry` no `public` del módulo, con las reglas de §2.7 |
| "Mis partidas" para un juego por turnos | Registro por juego (#18) |

**Criterios de aceptación obligatorios de #18 (derivan de la restricción (d)):**
1. `stake` única custodia; en `Pending` solo la apuesta del creador (el aceptante no deposita antes de `activate`); nada con valor en dynamic fields; `DuelState` sin cambios de significado.
2. **El juego llama a `record_move` en cada jugada válida** (y solo en una jugada válida del jugador en turno), define sus **conjuntos de pendientes** y sus **fases simultáneas**, y **nunca** pasa un plazo ni lee `turn_ms` para decidir vencimientos: el plazo lo fija la base. Tiene tests de que `to_move` coincide con las reglas del juego en **cada** transición (un `to_move` mal puesto hace perder por tiempo al jugador equivocado: es la misma clase de poder que decidir el ganador, pero hay que probarlo).
3. **El número de jugadas de una partida está acotado por las reglas del juego:** como el plazo se reinicia en cada jugada válida, solo la finitud del juego frena una partida. Peor caso: duración máxima de `Active` ≤ (jugadas máximas) × `turn_ms` + `CLAIM_GRACE_MS`; #18 lo calcula y lo muestra.
4. **La `entry` de jugada la firma el jugador que mueve** (la base lee `ctx.sender()`; sin relayers ni meta-transacciones). Opcional (R3-6 (b)): evitar la fase simultánea inicial (el creador compromete su tablero al crear, dynamic field sin valor en `Pending`, y el aceptante dentro de `activate`).
5. Liquidar por jugada o rendición con `collect` + `pay` solo antes del plazo y solo por un jugador (la base aborta con `EDeadlinePassed` o `ENotPlayer`).
6. Ninguna `public` de un módulo de juego que reciba `&mut Duel<G>`; `typeArguments` y tags desde `typeOrigins`.

**Qué NO hay que resolver en #73:** reglas de turnos propias, tablero, commit-reveal, costo de gas por disparo, UI del tablero, límites de apuesta por juego (la House tiene límites globales, `house.move:168-177`). **Qué entrega #73:** la base con su reloj, un juego real sobre ella (coinflip, atómico), un juego de test que ejerce turnos y fases simultáneas, el upgrade ensayado y registrado, el script y el runbook, el registro de la app con dos fuentes y los controles de tiempo, y el procedimiento para que #18 sume su módulo con otro upgrade.

---

## 10. Decisiones → STOP (estado al 2026-11-19: todas decididas)

> **Todos los STOP los decide el owner.** La delegación de D-20261104-01 (1) valía "mientras el owner está ausente … hasta su vuelta": venció cuando volvió (decidió D-20261119-01..04). **P-9 y P-10 también las decidió el owner (no hubo delegación).** Lo de fondos, contrato, seguridad, upgrade, toolchain y publicación es **no delegable** (D-20261104-01 (1), FLUJO §4).
> **Estado:** **todos los STOP están DECIDIDOS por el owner el 2026-11-19** (aprobado por el owner, tomadas en este turno, no se reabren): P-1..P-14. **No queda ningún STOP pendiente**, salvo la **autorización explícita del upgrade en testnet (TASK-6)**, que sigue vigente y separada (precedida por la **compuerta de pre-upgrade del MAYOR**; P-5 no la otorga). Al implementar, `DECISIONES.md` registra cada una con su ID `D-YYYYMMDD-N` (TASK-8).

### P-1 — Base común — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** `Duel<phantom G>` en el mismo paquete (opción (a) de §2.2), con el reloj por jugada en la base; `game::Game` no se toca. Alternativas descartadas: (c) módulos sueltos, (d) tipo único con discriminante, (b) registro on-chain.

### P-2 — `Active`, reloj por jugada y garantía de salida — **DECIDIDA (2026-11-19, aprobado por el owner): opción (1c)**
- **Decisión:** reloj por jugada aplicado por la base a todos los juegos; controles fijos rapid 10/20/30/60 min y daily 1/3/7 días; quien deja vencer su plazo pierde y el rival reclama el pozo menos la comisión (§2.6). Reemplaza a (1a), (1b) y (2). Las sub-decisiones de fondos que deja abiertas están en **P-14**.

### P-3 — Qué pasa con el coinflip — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** (M-B) coinflip nuevo sobre `Duel<Coinflip>` (control 0, camino atómico), `game::Game` viejo intacto. Descartadas: (M-A) sin coinflip nuevo; (M-C) subir `VERSION` y retirar el viejo.

### P-4 — Comisiones: quién puede depositar — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** juegos como módulos del mismo paquete; solo `duel` llama a `house::add_fees`; sin API `public` nueva ni cap por juego. **Juegos de terceros o paquetes externos = STOP aparte** (reabren SEG-5 sin que la House pueda cerrarlo).

### P-5 — Upgrade compatible o republicación — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** upgrade compatible, no republicar. **NO autoriza ejecutarlo:** el upgrade real lleva la revisión de pre-upgrade del MAYOR y la autorización explícita del owner (§11, §14).

### P-6 — `VERSION` y el corte — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** **no subir `VERSION`** en este upgrade, aceptando que **nada se corta** (§4.3) y que un bug de pago se contiene solo con el procedimiento de corte (upgrade con `VERSION = 2` + `migrate`), no con un upgrade común ni con la app; durante un corte `claim_timeout` queda bloqueado y la salida es `refund_stalled` (S-2 de P-14).

### P-7 — Política del `UpgradeCap` — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** sigue `compatible` hasta después de #18 (confirma D-20261103-01 (1), sin reabrirla); la política de mainnet es decisión aparte.

### P-8 — Task previo de toolchain y versión de la CLI — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** PR previo y separado (PRE-1) con la CLI **`1.84.0`** (publicada el 2026-11-10T19:01:47Z; ya cumple 7 días; PV 142 y framework con `clock::borrow`). Se mide la PV el día de PRE-1 (V-7); si testnet ya no está en 142, se revisa.

### P-9 — Producto de la app — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** un solo juego "Coinflip" con filas rotuladas "anteriores"/"nuevas" y creación solo en la nueva; lobby "Todos" con filtro por juego y el control de tiempo de cada partida, y selector de juego solo con más de un juego creable; el formulario ofrece los 7 controles solo para juegos con reloj; vista activa con turno, plazo y reclamo.

### P-10 — Orden con #72 — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** #73-app aterriza antes de implementar #72, y el plan de #72 incluye el multijuego en sus wireframes (filtro por juego, selector de control de tiempo, turno y cuenta regresiva).

### P-11 — Fórmula y comisión del `Duel` — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** misma fórmula de comisión (piso sobre el pozo completo, `fee_rate` copiado al crear, `add_fees` siempre), **también en el reclamo por tiempo**; la base lee comisión, límites, versión e ID de la House (§2.5 (ii)), nunca del juego; la comisión y los límites de la House no cambian.

### P-12 — `test-publish`/`test-upgrade` del DEV en la localnet aislada — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** el DEV puede correr `sui client test-publish`/`test-upgrade` con `--pubfile-path` dentro de `<SMOKE_DIR>` y con el prefijo de la localnet aislada (`agents.md` §3), nunca en testnet; el v1 del ensayo se publica con el binario **1.83.0** (el del `sourceCommit`, verificado por su SHA-256 de release, V-16) y el upgrade con la CLI de PRE-1 (N-7). Se registra en `DECISIONES.md`.

### P-13 — Restricción permanente (d) del `Duel` — **DECIDIDA (2026-11-19, aprobado por el owner)**
- **Decisión:** registrarla en `contracts/README.md` "Modelo de confianza" y en `DECISIONES.md`, y como criterio de aceptación de #18: `stake` única custodia, `Pending` solo con la apuesta del creador, sin valor en dynamic fields, estados sin cambio de significado, **(v) reloj por jugada: tiempo agotado = derrota** (el rival reclama el pozo menos la comisión; la base aplica el plazo; con la salvedad del corte y la salida `refund_stalled`) y (vi) estados terminales nuevos.

### P-14 — Sub-decisiones de fondos del reloj — **DECIDIDAS (2026-11-19, aprobado por el owner): S-1 (i), S-2 (i), S-3 (i)**. Surgían de P-2 (1c); no la reabren.
- **Decisiones:** **S-1 (i)** vence con ambos pendientes → 100/100 sin comisión, estado `Expired`. **S-2 (i)** `CLAIM_GRACE_MS` = 7 días y `refund_stalled` paga **100/100 sin comisión** (no "pozo al rival"). **S-3 (i)** cualquiera puede llamar `claim_timeout` y el pago va siempre al rival del pendiente. Lo que sigue son las opciones evaluadas, como registro.
- **S-1 — Vence con AMBOS pendientes** (nadie movió: p. ej. nadie comprometió el tablero). Opciones: **(i) reembolso 100/100 sin comisión, estado `Expired`** [recomendada]: no hay ganador ni culpable y cobrar comisión por una partida que no se jugó sería cobrar por nada; costo: un jugador puede inmovilizar los fondos del otro hasta el plazo sin perder (griefing acotado a `turn_ms`); (ii) 100/100 con la comisión repartida (cada uno recibe `bet − fee/2`): castiga a ambos por igual y a la House le da ingreso, pero cobra a quien no jugó; (iii) el pozo completo a la House: desincentiva el griefing pero es hostil con un creador que quiso jugar y no puede reclamar nada.
- **S-2 — `CLAIM_GRACE_MS` y la salida mínima.** Con un solo pendiente, `refund_stalled` (100/100 sin comisión, sin House ni versión) se habilita a los `CLAIM_GRACE_MS` del plazo. Opciones: **(i) 7 días** [recomendada]: acota el peor caso de bloqueo (plazo + gracia ≤ 14 días) y garantiza que un corte de `VERSION` no deja fondos en `Active`; costo: un ganador que no reclama en 7 días pierde el cobro y el perdedor recupera su apuesta; (ii) otro valor (p. ej. 24 h o 30 días); (iii) sin salida mínima (el reclamo cobra comisión y un corte lo bloquea hasta que la v3 lo resuelva: viola D-20261030-12 §4 para `Active`).
- **S-3 — Quién puede llamar a `claim_timeout`.** Opciones: **(i) cualquiera, paga siempre al rival** [recomendada] (el ganador puede no tener gas; no hay incentivo a ocupar su lugar; permite un guardián); (ii) solo el rival que espera.
- **Por qué 100/100 y no "pozo al rival" en S-2 (MAYOR, ronda 3 §3.4):** (1) **evasión de comisión:** un ganador racional esperaría `CLAIM_GRACE_MS` para no pagarla y el reclamo por tiempo dejaría de aportar a la House; (2) **modo de falla del corte:** si el bug que motivó el corte está en el reloj o en `to_move`, un pago incortable del pozo "al rival" seguiría pagando al equivocado mientras dure el corte; 100/100 es neutral.
- **Decisión del conjunto:** S-1 (i), S-2 (i) 7 días con 100/100, S-3 (i).

---

## 11. Runbook de upgrade (alto nivel; lo ejecuta el owner, nunca un agente)

Se define en detalle en TASK-4 y se agrega a `contracts/README.md` como "Uso en testnet → Upgrade". Esqueleto:

1. **Precondiciones:** PRE-1 mergeado; la CLI local del owner = `ci.yml` (`sui --version` = `${SUI_VERSION}-${SUI_COMMIT}`); la branch con `master` integrado y la CI en verde (head conocido); TASK-1..5, 7 y 8 en PASA contra la localnet; **la revisión de pre-upgrade del MAYOR sin 🔴/🟠 abiertos**; P-1..P-14 ya decididos y registrados en `DECISIONES.md`; **la autorización explícita del owner** del upgrade registrada (aparte de P-5, que no la otorga).
2. **Pre-vuelo:** PV de testnet vigente ≤ la PV máxima de la CLI instalada (si es mayor, **no se sigue**); `UpgradeCap` en la dirección del owner (custodia) y, por GraphQL público de solo lectura, sus valores esperados **hoy**: `policy` 0, `version` 1, `package` = `packageId` (H-13); tras el upgrade, `version` 2 y `package` = el ID nuevo; `suio` con `SUI_CONFIG_DIR` propio.
3. **Dry run** (`publish.mjs upgrade --network testnet --dry-run`): compila, verifica compatibilidad (`sui client upgrade` avisa si hay incompatibilidad), no cambia `Move.lock`. **Un error de compatibilidad local de la CLI (p. ej. `EUC01009`) o un dry run que falle por compatibilidad es STOP; nunca `--skip-verify-compatibility`** (H-e: con `compatible` la bandera solo saltea la verificación local y silencia una señal temprana; la cadena sigue aplicando la política). Esto va al runbook de TASK-4, que el gate de pre-upgrade del handoff (§G, ítem 7) recibe.
4. **Upgrade** (confirmación por terminal): un solo PTB (autorizar con el `UpgradeCap` → `Upgrade` → `commit_upgrade`); el script imprime el digest y la versión.
5. **Registro:** `contracts/Published.toml` (lo reescribe la CLI) y `deployments/testnet.json` con `packageId`, `packageVersion` 2, `upgrades` y `typeOrigins`; `check` en verde.
6. **Verificación por lectura pública:** `typeOrigins` del json = la tabla de orígenes del paquete on-chain; el `UpgradeCap` con los valores de s-2; la House intacta (`version` 1, `fee_rate` 200); una partida del coinflip nuevo y otra del viejo.
7. **Entrega al orquestador:** los dos archivos sin editar, los digests y el "sí/no" de la custodia; el orquestador los commitea en la branch del PR y se mergea (PROY-21).
8. **No se rebasea ni se squashea** después (el `sourceCommit` tiene que existir en `master`).

## 12. Riesgos y plan de recuperación

| # | Riesgo | Mitigación / recuperación |
|---|---|---|
| R-1 | El compilador o la VM rechazan el upgrade (amigo de `house` o compatibilidad) | Se descubre en TASK-1, antes de escribir la base. Si ocurre: STOP nuevo; nada se publicó |
| R-2 | El upgrade falla **a mitad** | Es un solo PTB atómico (autorizar → `Upgrade` → `commit_upgrade`, V-10): o se confirma entero o no cambia nada y el `UpgradeCap` queda intacto. Si la CLI se corta **después** de ejecutar, la transacción existe pero `Published.toml`/json no se escribieron: **buscar el digest antes de reintentar**. Reintentar con `Published.toml` viejo **falla** con `PackageIDDoesNotMatch` (H-9) y paga gas; no crea versión 3. Se rearma con el `record` de upgrade de TASK-4 a partir del digest. Si `Published.toml` ya quedó actualizado, un nuevo `upgrade` es un upgrade real (v2 → v3) |
| R-3 | **Bug de pago en `duel`/`coinflip` ya publicado** | **No hay rollback ni se corta con la app ni con un upgrade común**: toda versión publicada sigue invocable (`contracts/README.md:152`) y la v3 no desactiva la v2. Contención real: el **procedimiento de corte** de §4.3 (upgrade con `VERSION = 2` + `migrate` inmediato), que detiene los caminos que mueven fondos de v1 y v2 por la regla de §2.1.5 (incluido `claim_timeout`); `cancel`/`reject`/`refund_stalled` siguen devolviendo el 100 % (los `Active` con un solo pendiente tras `CLAIM_GRACE_MS`). La v3 aplica el criterio por defecto de §4.3 (5): rehabilita `collect`/`claim_timeout` para los `Duel` con `version = 1`, salvo bug en esos caminos o en el reloj. Mientras tanto la app deja de ofrecer crear, que **no** es una barrera |
| R-4 | Layout congelado insuficiente para #18 | Un tipo base nuevo es compatible y convive; datos sin valor en dynamic fields; la tabla de controles y las máscaras ya cubren fases simultáneas |
| R-5 | La app lee tipos o `typeArguments` con el ID equivocado | `typeOrigins` validado por `check`, por tests y por lectura pública (§4.4); error de configuración si falta una entrada; los `typeArguments` con `definingId` siempre resuelven (V-12, medido en TASK-1b) |
| R-6 | Un juego con `Random` mal escrito (SEG-5) | `entry` + lint + las reglas de §2.7 (el lint solo no alcanza, H-11); coinflip con test de ambos resultados |
| R-7 | PV de testnet sube antes del upgrade | Paso 2 del runbook: medir justo antes; si es mayor, otro task de toolchain |
| R-8 | Contención sobre `&mut House` con más juegos | Igual que hoy (`contracts/README.md:174-178`); `claim_timeout` también toma `&mut House`; se mide en el smoke |
| R-9 | **`init` en un módulo nuevo corre en el upgrade** (H-6) | `duel` y `coinflip` **no tienen `init`**; un `init` futuro es STOP con qué crea y a quién; un `init` **agregado a un módulo ya publicado** hace rechazar el upgrade (`IncompatibleUpgrade`, medido en TASK-1a V-8): solo un módulo **nuevo** puede tener `init`; V-8 comprueba el comportamiento con la CLI de PRE-1 |
| R-10 | Reloj: el timestamp del consenso decide el borde del plazo; plazo mínimo 10 min con la firma de la wallet; griefing "ambos pendientes"; cliff de reclamo | Escritos en §2.6 (riesgos de producto 1-6, incluida la congestión de la House en la jugada ganadora); la UI muestra el tiempo restante; V-13 confirma el reloj; S-1..S-3 decididos (P-14 S-1 (i), S-2 (i), S-3 (i)) |
| R-11 | Tabla de controles de tiempo (ids 0-7) | **Los ids ya publicados son inmutables** (PROY-2): su significado queda fijo en `DuelCreated.control` y en la derivación inversa desde `turn_ms`, con espejo en la app. **Ids nuevos sí se pueden agregar** en un upgrade compatible (la tabla vive en el cuerpo de `create`, que es `public(package)`), para los juegos de la versión que los agrega, manteniendo la tabla de la app y la inyectividad id ↔ `turn_ms`. Los 7 controles los eligió el owner |

## 13. A verificar

| # | Qué | Cómo (comando público o prueba) | Quién |
|---|---|---|---|
| V-1 | Un módulo nuevo de un upgrade llama a `house::add_fees` sin cambiar su firma y el upgrade pasa | Localnet aislada: `test-publish` de la fuente de `master` **con el binario 1.83.0**, módulo mínimo que llama a `add_fees`, `sui client test-upgrade --pubfile-path … --build-env testnet` con la CLI de PRE-1, llamarlo y leer `fees_collected` | DEV (TASK-1) |
| V-2 | Con `additive`, un módulo nuevo que llama a `add_fees` pasa; subir `VERSION` no; y que **otra CLI** no cambie el bytecode de `house`/`game` sin tocar su fuente | `only_additive_upgrades` sobre el `UpgradeCap` de la prueba; v1 publicado con la **1.83.0** y upgrade con la CLI de PRE-1; diferencia del bytecode desensamblado | DEV (TASK-1), **prioridad normal** |
| V-3 | Prefijo del evento y del objeto genérico de un módulo nuevo = ID del upgrade | `SuiGrpcClient` en la localnet: `listEvents`/`getObject` tras el ensayo; comparar con `typeOrigins` | DEV (TASK-1) |
| V-4 | El filtro `eventType` del nodo admite el tipo genérico sin parámetros o exige el tag completo; si `emitModule` del `duel` sustituye al OR de literales; **cuántos términos admite la DNF**. **Resuelta en TASK-1b:** sin parámetros = prefijo; `emitModule` no sirve; máximo 10 literales por filtro | `ListEvents` crudo de `eventScan.ts` en la localnet: un literal con y sin `<…>`, un literal `emitModule`, y DNF con 2, 4, 8, 16… términos hasta el rechazo | DEV (TASK-1) |
| V-5 | Qué ID informa un `MoveAbort` en un módulo nuevo (original o del upgrade). **Resuelta en TASK-1b:** el ID de la versión ejecutada | Provocar un abort de `duel`/`coinflip` en la localnet y leer `MoveAbort.location.package` (`errors.ts:195-206` acepta dos) | DEV (TASK-1) |
| V-6 | De dónde saca el script la tabla de orígenes y los IDs de `upgrades` | Tras el upgrade de localnet, mirar si `sui client object <paquete> --json` y la salida `--json` del upgrade los traen; si no, lectura pública GraphQL (testnet) | DEV (TASK-4) |
| V-7 | PV y framework vigentes el día de cada paso | `curl -fsSL -X POST -H 'content-type: application/json' -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' https://graphql.testnet.sui.io/graphql`; `MAX_PROTOCOL_VERSION` de la CLI; `manifest.json` del tag | DEV (PRE-1) y owner (pre-vuelo) |
| V-8 | El `init` de un módulo nuevo **sí** corre en el upgrade con la CLI de PRE-1 (y no corre el de un módulo existente) | Sandbox: módulo mínimo con `init` que crea un objeto; `test-upgrade`; ver el objeto en los efectos | DEV (TASK-1) |
| V-9 | Cómo falla el `ListEvents` del fullnode público bajo el piso tras su paso a la `1.84` y si `eventScan.ts:130-140` lo reconoce | Lectura gRPC pública de solo lectura con un `startCheckpoint` bajo el piso | DEV (PRE-1 o TASK-7) |
| V-10 | `sui client upgrade` ejecuta un solo PTB atómico; reintentar con `Published.toml` viejo falla con `PackageIDDoesNotMatch` | `--dry-run`/`--serialize-unsigned-transaction` en la localnet del ensayo: contar comandos; repetir un `test-upgrade` con el pubfile viejo | DEV (TASK-1) |
| V-11 | Forma de `Published.toml` tras un upgrade y los campos que cambian en el json | `test-upgrade` escribe el pubfile; el de testnet lo escribe la CLI del owner | DEV (localnet) y owner (testnet) |
| V-12 | **`typeArguments` de una `entry` genérica con IDs de definición, de almacenamiento posterior y anterior a la definición o el original.** **Resuelta en TASK-1b:** el de definición pasa siempre; uno de almacenamiento ≥ la definición también pasa; uno anterior a la definición o el original falla con `TypeNotFound` | Sandbox: genérica `entry` de un módulo introducido en el upgrade, con un tipo de un módulo introducido en **otro** upgrade; llamarla con las cuatro formas | DEV (TASK-1) |
| V-13 | `clock::borrow()` compila y ejecuta con el framework de PV 142 de PRE-1; **lee el mismo reloj que el objeto `Clock` (`0x6`) en la ejecución de esa transacción** (la base del borde del plazo); cómo se testea con `set_clock_timestamp` (exige `ms` creciente) sin warnings; **PV de mainnet** (medido en TASK-1b: **142**, informativo) | Sandbox + `sui move test`; dos transacciones consecutivas en la localnet comparando el `timestamp_ms` leído por `borrow()` y por `0x6`; PV de mainnet por GraphQL público de solo lectura | DEV (TASK-1/2b); owner decide si mainnet importa |
| V-14 | Sonda de witness: un módulo que intenta empaquetar el witness de otro juego, o llamar la API de base sin él, **no compila**. **Resuelta en TASK-1b:** (a)-(c) no compilan; un módulo del paquete sí puede usar su propio witness | Sandbox: salida de build pegada, sin commitear (m-3) | DEV (TASK-1) |
| V-15 | Un PTB **no puede** intercalar una `entry` genérica (`cancel`, `claim_timeout`) con el mismo `Duel` entre `collect`/`activate_atomic` y `pay` (clique caliente, H-14) | Sandbox en la localnet: PTB con `collect`-equivalente de un juego de prueba seguido de `cancel<G>` sobre el mismo `Duel`; esperar el rechazo antes de ejecutar. **Resuelta en TASK-1b:** rechazo estático, previo a la ejecución de cualquier comando; la transacción queda `FailedTransaction` con gas cobrado y sin efectos | DEV (TASK-1) |
| V-16 | El binario 1.83.0 del v1 del ensayo es el oficial (SHA-256 del release registrado en `ci.yml:24` antes de PRE-1) | `sha256sum` del tgz del release `testnet-v1.83.0` contra `SUI_TGZ_SHA256` y `sui --version` = `1.83.0-16d2dc1e05ed` | DEV (TASK-1) |

## 14. Tasks (tentativos; contratos primero, app después — PROY-21)

> La suma de los tasks de #73 completa el issue. **Orden:** PRE-1 (mergeado, con el lock repinado a un framework ≥ PV 142) → TASK-1 → 2 → 2b → 3 → 4 → 5 → 7 → 8 (todo contra la localnet aislada y las fixtures) → **revisión de pre-upgrade del MAYOR** (compuerta) → **autorización explícita del owner** → TASK-6 (upgrade, solo el owner) → TASK-9 (smoke de testnet). El upgrade irreversible congela `Duel`, `DuelState`, los eventos y la tabla de controles: por eso va después de que la app los consuma. **Smoke en localnet aislada:** TASK-1, 4, 5, 7, 8. **Requiere al owner:** solo la **autorización explícita** antes de TASK-6 (P-1..P-14 ya están decididas); el upgrade/publicación en testnet: **nunca un agente**.

### PRE-1 — Toolchain a `1.84.x` (issue y PR propios; área: ci/contracts/docs)
- **Entregable:** CLI y `ci.yml` subidos, lock repinado a un framework ≥ PV 142, gates re-medidos, fixtures y tests de `scripts/` recapturados (§4.5).
- **Archivos:** `.github/workflows/ci.yml`, `contracts/Move.lock`, `contracts/scripts/*.mjs` y `scripts/fixtures/`, `contracts/fixtures/*.localnet.json` (si cambian), `documents/STATUS.md`, `agents.md`, `contracts/README.md`.
- **DoD:** gates de `contracts`, `app` y `deploy-image` en verde con la CLI nueva; `framework-drift` sin "CLI atrasada"; delta del lock justificado; V-7 y V-9 medidos. **Versión decidida por el owner (P-8): `1.84.0`.**
- **Riesgos:** lints nuevos; salidas `--json` distintas; la PV se mueve. **Rollback:** revertir el PR.

### TASK-1 — Ensayo de upgrade en localnet aislada (área: contracts; smoke 🧪; requiere P-12)
- **Entregable:** evidencia de V-1, V-2, V-3, V-4, V-5, V-8, V-10, V-11, V-12, V-13, V-14, V-15 y V-16, y las salidas reales del upgrade como fixtures de `scripts/`. **El v1 se publica con el binario 1.83.0** (el de `sourceCommit`; N-7) y el upgrade se hace con la CLI de PRE-1. Módulos mínimos **descartables** (no se commitean).
- **Cambios:** ninguno de producción. Procedimiento: `agents.md` §3.
- **AuthZ:** claves desechables solo en `<SMOKE_DIR>`; nada en `~/.sui/`.
- **DoD:** cada V con su salida; si V-1 falla → se frena y vuelve a P-5 (R-1).

### TASK-2 — Base `duel`: custodia, ciclo y comisión (área: contracts; depende de PRE-1 mergeado y del lock repinado)
- **Entregable:** módulo `duel` con `create`, `cancel`, `reject`, `activate`, `activate_atomic`, `collect`, `pay` y la tabla de controles, y `contracts/tests/duel_tests.move`, con la tabla de §2.5 y las INV-D1..D5 y D7.
- **Archivos:** `contracts/sources/duel.move`, `contracts/tests/duel_tests.move` (nuevos); **no** tocar `house.move` ni `game.move`; sin `init`.
- **AuthZ:** crear: cualquiera salvo autoinvitación; cancelar: solo el creador; rechazar: solo el invitado; activar: cualquiera salvo el creador (y, con invitación, solo el invitado); `collect`: solo el módulo del juego con su witness **y** un jugador de la partida (`ctx.sender() ∈ {creador, aceptante}`, abort `ENotPlayer`; no exige estar en `to_move`, R3-2); `create`/`activate`/`activate_atomic`/`pay`: solo el módulo del juego con su witness (**por compilación**: cobertura con la sonda V-14 pegada en el reporte y la regla de revisión de §2.5, no con `expected_failure`, m-3).
- **DoD:** gates en verde; sin función `public` con `Random`; sin `allow(lint(public_random))`.
- **Tests:** happy path y cada abort **en el orden de la tabla**; authZ denegada por función; conservación con `fee_rate` 0/250/1000 y pozos impares; `cancel`/`reject` con la House en otra versión (INV-D2, como `game_tests.move:569, 599`); los 8 ids de control y el abort de los inválidos; `activate` vs `activate_atomic` según `turn_ms`; `collect` sin `pay` no ejecutable (hot potato); `collect` desde un tercero aborta con `ENotPlayer` y desde un jugador fuera de turno pasa (la rendición); `pay` con el `Collected` de otro `Duel` aborta con `EWrongDuel`; `stake == 2 × bet` exacto.
- **Riesgos:** congelar de más.

### TASK-2b — Reloj por jugada en la base (área: contracts; depende de TASK-2)
- **Entregable:** `record_move`, `claim_timeout`, `refund_stalled`, los eventos `DuelTurn`, `DuelTimedOut` y `DuelExpired`, las variantes `TimedOut`/`Expired`, `CLAIM_GRACE_MS`, y su suite (con el juego `#[test_only]` en `tests/`).
- **Archivos:** `contracts/sources/duel.move` y `contracts/tests/duel_tests.move`.
- **AuthZ:** `record_move`: solo el módulo del juego con su witness y solo un jugador en `to_move` (la base lee `ctx.sender()`); `claim_timeout` y `refund_stalled`: cualquiera, con pago determinista (el `Coin` va al rival, nunca a quien llama).
- **DoD:** INV-D2..D4 y D6; los tests de §2.6 (borde exacto del plazo, reglas de reinicio del plazo, ambos pendientes, gracia, corte por versión); `set_clock_timestamp` sin warnings (V-13).
- **Riesgos:** semántica de S-1..S-3 (P-14, decidida: (i), (i), (i)).

### TASK-3 — `coinflip` sobre `duel` (área: contracts)
- **Entregable:** módulo `coinflip` (witness `Coinflip`, `entry` de crear con control 0 y de aceptar) y su suite.
- **Archivos:** `contracts/sources/coinflip.move`, `contracts/tests/coinflip_tests.move` (nuevos); sin `init`.
- **Cambios:** replica el orden de `game.move:142-159` con la base: `activate_atomic` (valida y cobra) → sorteo por índice sin ramas → `pay`; `Random` solo acá. La transacción **nunca** termina en `Active` (estructural, INV-D5).
- **AuthZ:** como `accept_game` (cualquiera menos el creador; en invitación, solo el invitado).
- **DoD:** gates en verde; `public_random` no se dispara; mismo gasto en ambos resultados.
- **Tests:** como `game_tests.move:694-760, 845-928` (ambos resultados con `Random` real y semillas fijas, comisión, `u128`), más: un `Duel` nunca queda `Active` tras `accept`; House compartida con `Game` y `Duel`; abort de `activate_atomic` antes del sorteo.

### TASK-4 — Script y esquema de upgrade (área: contracts/ci; smoke 🧪)
- **Entregable:** `publish.mjs upgrade` y `record` de upgrade con las mismas guardas de `publish` (D-20261102-01/-03: solo owner en testnet, terminal, config fuera de `~/.sui`), `upgrades` y `typeOrigins` en `deployment.mjs` con los invariantes de `check` de §4.4, tests (`node --test`) con las salidas reales de TASK-1, y el runbook de §11 en `contracts/README.md`.
- **Archivos:** `contracts/scripts/publish.mjs`, `deployment.mjs`, `*.test.mjs`, `scripts/fixtures/`, `contracts/README.md`.
- **AuthZ:** ningún agente corre el camino testnet (ni `--dry-run`).
- **DoD:** `node --test` y `check` en verde; el `testnet.json` actual sigue siendo válido sin campos nuevos; el runbook incluye la precondición de la CLI y la verificación por lectura pública.
- **Riesgos:** formas de la CLI (V-6, V-11).

### TASK-5 — Smoke de contratos de punta a punta en localnet aislada (área: contracts; smoke 🧪)
- **Entregable:** ensayo completo: publicar la fuente de `master` (v1) **con el binario 1.83.0**, crear partidas `Pending` del coinflip viejo, upgrade con el script de TASK-4 y la CLI de PRE-1, y verificar que las viejas se aceptan/cancelan, que el coinflip nuevo juega, que las comisiones suman en la misma House, que los tipos coinciden con `typeOrigins`, y el reloj (reclamo por tiempo y reembolso con el juego de prueba). Fixtures para la app (`contracts/fixtures/duel-*.localnet.json`) con `app/scripts/capture-duel-*.mjs` bajo `localnet-guard.mjs`.
- **DoD:** `SMOKE_MULTIGAME.md` con la parte localnet en PASA; fixtures deterministas.

### TASK-7 — App: capa `sui/` (área: app)
- **Entregable:** config con `upgrades`/`typeOrigins` y error de configuración si falta una entrada, `gameRegistry.ts` con la tabla de controles espejo, esquemas BCS y parsers del `Duel` (seis variantes) y sus eventos, builders de las `entry` nuevas (`claim_timeout`, `refund_stalled`, crear con control) con `typeArguments` desde `typeOrigins`, lobby y "Mis partidas" multi-fuente, `errors.ts` con los módulos nuevos, `queryKeys` e invalidación con la dimensión del juego.
- **Archivos:** `app/src/sui/{config,gameRegistry,events,duel,lobby,myGames,errors}.ts`, `app/src/sui/transactions/`, `app/src/hooks/{queryKeys,txInvalidation}.ts` y sus tests; fixtures de TASK-5.
- **DoD:** `npm run lint/typecheck/test/build` en verde; sin `any`, montos `bigint`; ningún componente arma tags (ARQ-1); con el `testnet.json` actual (`packageVersion` 1) el build sigue válido y solo hay fuente `legacy`.
- **Tests:** parsers contra las fixtures reales (tipo exacto, BCS canónico, invariantes de `Duel`); config con y sin `typeOrigins`; DNF del lobby con varios términos; un caso por abort nuevo; etiquetas de los 8 controles.

### TASK-8 — App: hooks y componentes mínimos, y docs (área: app/docs; smoke 🌐)
- **Entregable:** filtro por juego y control de tiempo en el lobby; selector de los 7 controles al crear (solo juegos con reloj); vista activa con turno, plazo y los botones de reclamar/reembolsar; detalle de `Resolved`/`TimedOut`/`Expired`; aviso de partidas "anteriores"; smoke en Chrome headless contra la localnet aislada (como #11-#14); docs actualizados (PROY-20): `contracts/README.md` (tablas, controles de tiempo, "Modelo de confianza" con la restricción (d) y la garantía de `Active`), `app/README.md`, `agents.md` (espejo de la tabla de controles), `documents/STATUS.md`, **`documents/ESTANDARES.md`** (ARQ-1 con `coinflip → duel → house`, PROY-1, PROY-7, PROY-8, PROY-10, regla anti-`Random` de §2.7, restricción (d)) y **`documents/DECISIONES.md`** (P-1..P-14 decididos, con la decisión del owner de P-2 y su cita; entrada propia por el cambio de ESTANDARES y por la restricción (d)).
- **DoD:** gates de app en verde; candado y "sin confirmar" se comportan igual con un `Duel`; sin cambios visuales de #72.

### Compuerta — Revisión de pre-upgrade del MAYOR
**Entrada (N-6), lo que el MID entrega:**
1. head SHA de la branch con `master` (ya con PRE-1) integrado y la CI en verde;
2. diff de contrato completo (`duel`, `coinflip`, tests) y la **lista de artefactos congelados** sacada de la fuente: structs, enums y eventos con el orden de campos y las abilities, la tabla de controles de tiempo y la tabla final de abort codes;
3. salidas de los gates (build, `--lint` y test con su conteo) y la matriz test ↔ INV-D1..D7 ↔ tests de §2.6 ↔ aborts en orden, **más la tabla de transiciones generada desde los tests** (estado × función × antes/en/después del plazo × `to_move` → resultado o abort esperado en cada celda; R3-6 (a)): es la evidencia directa de INV-D6 y de la regla de bits;
4. evidencias de V-1..V-16 de TASK-1 y la diferencia del bytecode desensamblado de `house`/`game` entre el v1 compilado con 1.83 y el v2 con la CLI de PRE-1 (debería cambiar solo la lista de amigos de `house`);
5. `SMOKE_MULTIGAME.md` en PASA en la parte localnet: partidas viejas aceptadas y canceladas tras el upgrade, coinflip nuevo, reclamo por tiempo y reembolso, y comisiones en la misma House;
6. `upgrades` y `typeOrigins` reales de la localnet, y `check` en verde;
7. runbook final y la salida del dry run de localnet del script;
8. gates de app de TASK-7/8 y las fixtures;
9. decisiones P-1..P-14 registradas en `DECISIONES.md`, con `CLAIM_GRACE_MS`;
10. las revisiones del MID por task.
Sin 🔴/🟠 abiertos no hay autorización de upgrade (como el pre-vuelo de #8).

### TASK-6 — Upgrade en testnet (owner) y registro (área: contracts/docs; **owner**; después de la compuerta y de la autorización explícita)
- **Entregable:** upgrade ejecutado con el runbook de §11, `Published.toml` y `deployments/testnet.json` registrados, verificación por lecturas públicas.
- **Cambios en el repo:** solo los dos archivos (los commitea el orquestador). **No se delega.**
- **DoD:** `check` = "1 despliegue(s) válidos…" con versión 2; la House sin cambios; `typeOrigins` = cadena; una partida del coinflip nuevo y una del viejo.
- **Riesgos / recuperación:** R-2.

### TASK-9 — Smoke en testnet y cierre (área: contracts/app/docs; owner)
- **Entregable:** parte testnet de `SMOKE_MULTIGAME.md` (sonda de solo lectura + las firmas del owner con su wallet), con PASA/TOTAL; housekeeping de FLUJO §9.

## 15. Qué debe mirar el MAYOR

1. **Seguridad de fondos.** (i) El reloj como regla de fondos: que `record_move`/`collect` (antes del plazo) y `claim_timeout`/`refund_stalled` (desde el plazo) sean realmente disjuntos y que `ENotExpired`/`EDeadlinePassed` no dejen un hueco; que la regla de reinicio del plazo por bits (§2.4) dé a cada jugada su plazo completo sin permitir estirar una fase simultánea; (ii) **el trade-off del corte** (§4.3): `claim_timeout` cobra comisión y es cortable, `refund_stalled` tras `CLAIM_GRACE_MS` no; que ningún `Active` quede sin salida y que el cliff (el ganador que no reclama pierde el cobro) sea aceptable; (iii) la tabla de §2.5 con witness por valor, hot potato con `duel_id`, `ctx.sender()` leído por la base (variante de lo pedido) y el pago del reclamo al rival y no a quien llama; (iv) la restricción permanente (d)(v).
2. **Compatibilidad del upgrade.** El razonamiento de F2 sigue siendo lectura de fuente (V-1, V-3, V-5, V-10, V-12 lo prueban); que `clock::borrow` (PV 142) se pueda usar con el lock repinado; el enum con seis variantes y la tabla de controles congelados; no subir `VERSION` con el corte escrito; `init` fuera de los módulos nuevos; `typeOrigins`/`typeArguments` validados.
3. **SEG-5.** Que el coinflip sobre la base preserve validar y cobrar (`activate_atomic`) → sortear → pagar (`EBadWinnerIndex` y `EWrongDuel` no dependen del resultado) y que el camino atómico haga estructural que no quede `Active`; que el lint no alcance (H-11) y las reglas de §2.7 lo suplan; y que los juegos de terceros queden como STOP aparte.

## Apéndice — lecturas públicas hechas para este plan (solo lectura, sin claves)

- GraphQL `https://graphql.testnet.sui.io/graphql`: `epoch { epochId protocolConfigs { protocolVersion } }` (PV 142, época 1289); `package(address: <nuestro paquete>) { version typeOrigins { module struct definingId } }` (13 tipos, todos con el ID original); `packages(last: 50) { nodes { address version typeOrigins { module struct definingId } } }` (comparación de IDs de definición en paquetes con upgrades); `object(address: <ID del UpgradeCap de testnet.json>) { asMoveObject { contents { json } } }` (`policy` 0, `version` 1, `package` = `packageId`).
- `gh api repos/MystenLabs/sui/…` (releases, `contents`, `commits`) en los tags `testnet-v1.83.0`, `testnet-v1.83.1`, `testnet-v1.84.0` y `testnet-v1.84.1` y en el rev `05ad86a3…` del framework: fuentes citadas en §1.2 (v1.2 suma `lib.rs:428-436, 4994` para el PV de `clock::borrow`, `test_scenario.move:234-245` y `private_entry_arguments.rs:380-395`).
- `git diff 26f2676..HEAD -- contracts/sources` (lectura local del repo: vacío).
- WebFetch de `docs.sui.io` (compatibilidad y políticas de upgrade).
- Los IDs y hashes de este documento son públicos: el ID del paquete publicado, los `rev` de 40 hex de commits de `MystenLabs/sui` (framework y tag de la CLI) y el SHA-256 del tgz del release; no hay direcciones de cuenta, claves ni rutas personales.
