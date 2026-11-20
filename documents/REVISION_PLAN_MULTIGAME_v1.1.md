APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS — re-revisión del MAYOR (ronda 2) de `documents/PLAN_MULTIGAME.md` v1.1 (#73)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>`, branch `feature/issue-73-multigame`, HEAD `88dd53b`; plan v1.1 sin commitear, 578 líneas. Ronda anterior: v1, REQUEST CHANGES (8 MAJOR, 9 MINOR, 4 SUG).
- **Resultado:** los 17 hallazgos de la ronda 1 quedan **resueltos**. La parte nueva (P-2 = (1b)) es defendible y la recomiendo, pero tiene **2 MAJOR nuevos**: la semántica del vencimiento no está escrita como permanente para todo `G`, y `extend_lease` no tiene el límite que el plan le atribuye. Además hay 5 MINOR y 1 SUG.
- **Condición de la aprobación:** el owner puede decidir los STOP sobre esta v1.1 desde ya (N-1 es justamente parte de lo que decide en P-2). El MID corrige N-1 y N-2 en una v1.2 **antes del handoff de TASK-2**, y yo reviso solo ese delta. Los MINOR pueden ir en la misma v1.2 o en el handoff.

---

## 1. Resolución de la ronda 1

| Hallazgo | Estado | Dónde lo sostiene la v1.1 |
|---|---|---|
| M-1 API de fondos | RESUELTO | §2.5 (173-209): tabla con witness, estados, aborts en orden, eventos y destinatarios; reglas (i)-(vii) en 175-178 |
| M-2 INV-D3 / `Active` | RESUELTO (con N-1 y N-2 sobre la opción elegida) | §2.4 INV-D1..D5 (166-171); §2.6 (211-227); P-2 (413-416) |
| M-3 R-3 / corte | RESUELTO | §2.1.5 (124); §4.3 (288-293); R-3 (474); P-6 (428) |
| M-4 restricción (d) | RESUELTO (N-1 le agrega un punto (v)) | §2.1.2 (118-121); §9 (401); P-13 (449-451); TASK-8 (552) |
| M-5 `init` en upgrade | RESUELTO | H-6 (99); §6 (342); R-9 (480); V-8 (494) |
| M-6 `typeOrigins` / `typeArguments` | RESUELTO | §4.4 (295-308): invariantes de `check`, lectura pública y `upgrades[]`; V-12 (498); runbook paso 6 (464) |
| M-7 orden del upgrade | RESUELTO (N-6: falta definir qué entra a la compuerta) | §14 (504, 555-556) |
| M-8 delegación | RESUELTO | §10 (408); P-8 (433); P-9 y P-10 (436, 439) |
| m-1 witness `COINFLIP` | RESUELTO | §2.5 (180); H-12 (105) |
| m-2 reintento de upgrade | RESUELTO | H-9 (102); R-2 (473); V-10 (496) |
| m-3 authZ por witness | RESUELTO | TASK-2 AuthZ (521); V-14 (500) |
| m-4 lint `public_random` | RESUELTO | §2.7 (232); H-11 (104) |
| m-5 `additive` y bytecode | RESUELTO (redacción con cautela; ver §6) | §4.2 (283); V-2 (488) |
| m-6 ESTANDARES y grafo | RESUELTO | §2.3 (142-149); TASK-8 (552) |
| m-7 criterio de edad / CLI del owner | RESUELTO | §4.5 (322, 324); runbook paso 1 (459) |
| m-8 `test-upgrade` del DEV | RESUELTO | P-12 (445-447) |
| m-9 `emitModule` y DNF | RESUELTO | §8.2 (378); V-4 (490) |
| s-1..s-4 | Adoptadas | §2.4 INV-D5 (171), runbook (460), `upgrades` (300), §2.6 (225) |

---

## 2. Hallazgos nuevos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| N-1 | 🟠 MAJOR | SEG-4, PROY-10, restricción (d) | 119-121, 189-191, 217, 401 | `refund_expired<G>` de v2 es `entry`, genérica, **no se puede cortar** (§4.3 (4)) y vale **para todo `G` futuro para siempre**, igual que `cancel`. Su semántica (100 % a cada jugador al vencer, gane quien gane) se vuelve una regla permanente de todo juego por turnos. Dos consecuencias no están escritas. **(a) Abandono gratis:** el jugador que va perdiendo deja de jugar, espera `active_until_ms` y recupera el 100 %. **(b) Carrera en el borde:** `collect`/`pay` no miran el plazo (tabla 188-189). Tras el vencimiento, el cierre legítimo del ganador y el `refund_expired` de cualquiera compiten, y gana el que el consenso ordena primero. | En #18, A va a perder; deja de mover; vence el plazo; A (o un bot) llama a `refund_expired` y recupera su `bet`. Si B intenta cerrar la partida ganada en ese momento, su transacción aborta con `ENotActive`. Battleship no puede corregirlo desde su módulo: el `refund_expired` de v2 sigue disponible para `Duel<Battleship>`. | (1) Restricción (d) **(v)**: "en `Active`, al vencer `active_until_ms`, cualquiera puede reembolsar el 100 % a cada jugador, para todo `G` y toda versión; la salida por abandono propia de cada juego (forfeit) tiene que poder reclamarse **antes** de `active_until_ms`". (2) Criterio obligatorio de #18 en §9: plazo de turno + ventana de reclamo < `active_until_ms` (es decir, `lease_ms` = plazo de turno + ventana de reclamo) y una `entry` de forfeit para quien no tiene el turno. (3) Escribir que `collect`/`pay` **no** comprueban el vencimiento: la carrera es deliberada y documentada. (4) Llevarlo a la decisión del owner en P-2: (1b) = respaldo contra bloqueos con esta semántica. |
| N-2 | 🟠 MAJOR | SEG-4, SEG-2 | 190, 195, 217, R-10 (481) | `extend_lease` fija `active_until_ms = ahora + lease_ms`. No exige que el plazo nuevo sea ≥ al vigente, no tiene authZ de base y el plan dice que el bloqueo queda "acotado por `MAX_ACTIVE_MS`" (217). **Es falso:** `MAX_ACTIVE_MS` acota cada extensión, no la duración total. Lo único que lo frena es el código del juego. | (1) Un bug en #18 llama a `extend_lease` desde una `entry` que cualquiera puede invocar (p. ej., antes de comprobar el turno, en un camino que no aborta). Un tercero renueva el plazo cada 7 días y los `2 × bet` no salen nunca: ni `refund_expired` ni un cierre. (2) Un juego que pasa un `lease_ms` corto (o tomado del usuario) **adelanta** el vencimiento y habilita la fuga de N-1 (a) en mitad de la partida. | En la base, que no cuesta casi nada: `extend_lease` exige `ctx.sender() ∈ {creator, acceptor}` (abort nuevo, p. ej. `ENotPlayer` 17, después de `ENotActive`) y es **monótona**: `active_until_ms = max(actual, ahora + lease_ms)`. Corregir la garantía en §2.6: el límite es "tiempo máximo **sin una jugada de un jugador**", no un tope total. Regla para #18: `lease_ms` es una constante del juego, nunca un argumento del usuario, y solo se extiende tras una jugada válida del jugador en turno. Tests: tercero → `ENotPlayer`; plazo menor → no retrocede. |
| N-3 | 🟡 MINOR | M3 (claim verificado), PROY-17 | 103 (H-10), 225, 315 | `clock::borrow` **entra en PV 142, no en 141**. El comentario del protocolo dice "Version 142: … Add `sui::clock::borrow`" (`crates/sui-protocol-config/src/lib.rs:428-436` @ `testnet-v1.84.1`), y su costo se fija en el bloque `142 =>`, sin condición de red (`:4994`). El framework del lock actual (PV 140, `05ad86a3…`) **no** tiene `borrow` (`clock.move` en ese rev solo trae `timestamp_ms` y `set_for_testing`). El de PV 142 (`e6f43880…`) sí lo tiene (`clock.move:46-49`). Los dos tags (`1.84.0` y `1.84.1`) mapean PV 142 → `e6f43880…` en su `manifest.json`, así que P-8 es neutral en esto. | El DEV arranca TASK-2 con el lock viejo y no compila; o se cae a `&Clock` sin decisión. | Corregir H-10 (PV 142). En §14, que TASK-2 dependa de PRE-1 **mergeado y con el lock repinado a un framework ≥ PV 142**. Si al repinar testnet ya no está en 142, se revisa. V-13: la API de test es `set_clock_timestamp(builder: TxContextBuilder, ms)`, que exige `ms` creciente (`test_scenario.move:229-236` @ `testnet-v1.84.1`); no hay setter sobre `Scenario`. |
| N-4 | 🟡 MINOR | PROY-8, SEG-10 | 160, 191, 207 | `refund_expired` deja el objeto en `Cancelled`, la misma variante que un `cancel` en `Pending`. El objeto pierde quién era el aceptante y que hubo reembolso a dos. Solo lo cuenta `DuelExpired`, que se cae de la ventana del fullnode (#51). El enum se congela en TASK-6: es ahora o nunca. | Detalle de una partida vieja: la app muestra "Cancelada" y no puede decir que el aceptante también recibió su apuesta. | Variante `Expired { acceptor: address }` en `DuelState` (o justificar por qué no). Ajustar INV-D1 y PROY-8. |
| N-5 | 🟡 MINOR | PROY-8 (invariantes) | 167, 188-189 | INV-D1 dice "`stake == 2 × bet` exacto en `Active`", pero entre `collect` y `pay` el estado sigue `Active` con `stake = 2 × bet − fee` (intra-transacción). | Un test o un revisor toma la INV al pie de la letra y la contradice. | Escribirla "al inicio y al final de toda transacción". Agregar la defensa en profundidad que la sostiene: un PTB no puede meter `refund_expired`/`cancel` entre `collect` y `pay`, porque una `entry` no `public` no acepta argumentos de una "clique caliente" (`sui-adapter/.../typing/verify/private_entry_arguments.rs:380-395` @ `testnet-v1.84.1`), además de la regla de §2.7 (ninguna `public` de juego con `&mut Duel<G>`). |
| N-6 | 🟡 MINOR | FLUJO §7, M4 | 504, 555-556 | La compuerta de pre-upgrade no dice qué tiene que estar listo para revisarla. | Llega a revisión un diff sin evidencias y la compuerta se convierte en otra ronda de plan. | Lista de entrada de la compuerta (ver §5 de esta revisión). |
| N-7 | 🟡 MINOR | Fidelidad del ensayo | 487-488, 542 | TASK-5 publica "la fuente de `master` (v1)" con la CLI de PRE-1. El paquete real de testnet se compiló con la **1.83.0**. Solo V-2 (baja prioridad) ensaya "publicado con 1.83 → upgrade con 1.84". | El ensayo de punta a punta pasa con un v1 que no es el de testnet. Una diferencia de bytecode entre compiladores en `house`/`game` aparece recién en el dry run del owner. | Que TASK-5 (o TASK-1, V-1) publique el v1 con el binario **1.83.0**, el de `sourceCommit` (las fuentes de `contracts/sources` no cambiaron desde la publicación: `git diff 26f2676..HEAD -- contracts/sources` vacío; solo `Move.toml` +1 línea de licencia), y haga el upgrade con la CLI de PRE-1. Subir V-2 a prioridad normal. |
| N-8 | 🔵 SUG | ARQ-4 | 187 | `activate`: "lectura de la House con chequeo de versión, valor descartado" es ambiguo. | — | Nombrar el accessor (p. ej. `house.min_bet()`) o leer `fee_rate` y usarlo en el evento. |

---

## 3. Auditoría de (1b) como código de fondos (respuestas al punto 2)

1. **¿Quién llama a `refund_expired` y a quién paga?** Cualquiera, solo en `Active` y con `ahora ≥ active_until_ms` (191). Paga `bet` al creador y el resto (`== bet` por INV-D1 al inicio de la transacción) al aceptante (`Active { acceptor }`), sin comisión, sin House ni versión. **Correcto.** No hay `assert` de `stake == 2 × bet`. El `split(bet)` del creador abortaría solo si `stake < bet`, cosa que INV-D1/D4 hacen imposible entre transacciones (N-5).
2. **`extend_lease`: ¿bloqueo o fuga?** El jugador no la llama directamente (es `public(package)` con witness), pero hoy la base no impide ni la renovación indefinida por un camino mal escrito del juego ni el **acortamiento** del plazo. Ver N-2: authZ de jugador y monotonía en la base.
3. **¿El juego resolvió y el plazo vence en la misma transacción?** No hay problema. `pay` deja `Resolved` y `active_until_ms = 0`, y un `refund_expired` posterior aborta con `ENotActive`. Un PTB no puede intercalar `refund_expired` entre `collect` y `pay` (N-5). **Entre transacciones** hay carrera tras el vencimiento: gana el primero en consenso. Es deliberada y hay que escribirla (N-1 (b)).
4. **`clock::borrow()`:** existe solo desde el framework de PV 142 (N-3); el `Move.lock` actual (PV 140) no lo tiene. Condiciona el orden: PRE-1 mergeado y lock repinado **antes** de TASK-2. En testnet hoy (PV 142) el costo nativo está activo en todas las redes. Mainnet queda fuera de alcance (V-13).
5. **¿Alcanza el layout congelado?** Para la salida genérica, sí: `active_until_ms` + `Active { acceptor }`. Para #18, lo propio del juego (turno, tableros, compromisos y plazo de turno) va en dynamic fields sin valor, con un accessor de `UID` agregado en #18. El dato que el **objeto** no puede reconstruir es el de N-4 (`Expired`). Fuera de eso no veo un campo que #18 necesite en el layout.
6. **¿Demasiado scope frente a (2)?** Suma tres funciones, un campo, un evento y un nuevo uso del reloj, más sus tests: moderado. El costo real no es el código, es **la permanencia**. `refund_expired` de v2 es una salida de fondos que no se puede cortar y que en #73 ninguna `entry` de producción ejerce (solo el juego `#[test_only]`).

**Mi recomendación: (1b), condicionada a N-1 y N-2.**
- **Por qué no (2):** pospone a #18 la misma superficie permanente (cualquier `Active` con salida independiente del juego también es incortable), pero escrita dentro del módulo del juego. Además duplica la custodia (un segundo tipo base o P-1 (c)), que es justo lo que el issue pide evitar.
- **Por qué (1b) es defendible:** el respaldo contra bloqueos vive en la única custodia auditada y no depende de que #18 salga sin bugs. La semántica 100/100 al vencer es la única que una base puede aplicar sin conocer el juego (no sabe de quién es la culpa). Y la política de abandono queda en #18, siempre que pueda reclamarse **antes** del vencimiento (N-1).
- **Lo que (1b) le pide al owner:** aceptar explícitamente, como restricción permanente, esa semántica y la carrera en el borde, y fijar `MAX_ACTIVE_MS`. 7 días es razonable como cota **por jugada** (N-2), no total.
- **Si el owner no acepta la semántica permanente**, la alternativa coherente es (2) más P-1 (c) para #18. No recomiendo (1a).

**Falta especificar o testear antes del handoff de TASK-2 (además de N-1 y N-2):**
- **N-3:** dependencia de TASK-2 respecto de PRE-1 y la API `set_clock_timestamp`.
- **N-4:** `Expired`, sí o no.
- **Tests de `refund_expired`:**
  - en el milisegundo exacto `ahora == active_until_ms` (pasa: la condición es `ahora < active_until_ms` ⇒ `ENotExpired`), y un milisegundo antes (aborta);
  - un tercero (no jugador) puede llamarlo y no recibe nada;
  - después de `pay`: `ENotActive`.
- **Test de `extend_lease`:** monótona y con `ENotPlayer`.
- **Test con el juego `#[test_only]`:** forfeit del juego antes del vencimiento y `refund_expired` después; cubre el criterio que #18 hereda.

---

## 4. Tabla de funciones, eventos e invariantes (punto 3)

- **PROY-7:** cubierto. Hay evento en cada transición: `DuelCreated`, `DuelCancelled` (cancelar y rechazar), `DuelActivated`, `DuelResolved` y `DuelExpired` (199-207). `collect` y `extend_lease` no son transiciones de estado (209). Aceptable: el plazo se lee del objeto.
- **Abort codes:** únicos por módulo (0-16), alineados con `game` donde coinciden (`game.move:16-26`). El orden es el correcto: versión y House primero, después authZ antes que estado, después el monto y al final lo propio. Con N-2 se suma uno (17).
- **`add_fees`:** solo desde `duel::collect`, siempre (también con comisión 0) y antes de cualquier pago (178, 188). Cumple D-20261030-16 D6. "Solo `duel`" es una regla de revisión, como dice 147 (H-1).
- **Hot potato:** `Collected { duel_id, pot, fee }` **sin abilities** (188). No lleva fondos: la comisión ya está en la House y el resto queda en `stake`. Solo lo consume `pay`, que comprueba `duel_id` (`EWrongDuel`). Bien cerrado. Un PTB tampoco puede retenerlo e intercalar una `entry` privada (N-5).
- **SEG-5 en el coinflip:**
  - `entry` no `public`;
  - `activate → collect` antes del sorteo;
  - sorteo por índice `generate_u8_in_range(0, 1)`;
  - `pay` sin aborts que dependan del resultado (`EBadWinnerIndex` y `EWrongDuel` son deterministas);
  - el `MoveCall` con `Random` va último (383): la regla `PostRandomCommandRestrictions` sigue en `transaction.rs:1750-1757` @ `testnet-v1.84.1`;
  - sin parámetro `Clock` gracias a `borrow()`.
  
  **Intacto.**

## 5. Corte, restricción (d), reorden y compuerta (punto 4)

- **Procedimiento de corte (§4.3, 292):** correcto y completo. Qué corta y qué no está bien enumerado, y la regla de §2.1.5 se aplica a `activate` y `collect`.
- **Restricción (d) (118-121, P-13):** correcta. Le falta el punto (v) de N-1.
- **Reorden (§14, 504):** correcto. PROY-21 se sigue cumpliendo (la publicación y `deployments` van en el mismo PR).
- **Entrada de la compuerta de pre-upgrade (N-6).** El MID entrega:
  1. head SHA de la branch con `master` (ya con PRE-1) integrado y la CI en verde;
  2. diff de contrato completo (`duel`, `coinflip`, tests) y la **lista de artefactos congelados** sacada de la fuente: structs, enums y eventos con el orden de campos y las abilities, más la tabla final de abort codes;
  3. salidas de los gates (build, `--lint` y test con su conteo) y la matriz test ↔ INV-D1..D5 ↔ tests de §2.6 ↔ aborts en orden;
  4. evidencias de V-1..V-14 de TASK-1 y la diferencia del bytecode desensamblado de `house`/`game` entre el v1 compilado con 1.83 y el v2 con la CLI de PRE-1 (debería cambiar solo la lista de amigos de `house`; N-7);
  5. `SMOKE_MULTIGAME.md` en PASA en la parte localnet: partidas viejas aceptadas y canceladas tras el upgrade, coinflip nuevo, `refund_expired` y comisiones en la misma House;
  6. `upgrades` y `typeOrigins` reales de la localnet, y `check` en verde;
  7. runbook final y la salida del dry run de localnet del script;
  8. gates de app de TASK-7/8 y las *fixtures*;
  9. decisiones P-1..P-13 registradas, con `MAX_ACTIVE_MS`;
  10. las revisiones del MID por task.

## 6. Verificación de claims (punto 6)

- **El tipo real del objeto tiene que coincidir con el parámetro instanciado (`cancel<G>`): CONFIRMADO.** El PTB compara el tipo del argumento con el esperado por igualdad exacta, argumentos de tipo incluidos, y devuelve `CommandArgumentError::TypeMismatch` (`sui-adapter/.../static_programmable_transactions/typing/translate.rs:746-800`, `check_type` en 794-800, @ `testnet-v1.84.1`). Un `cancel<A>` sobre un `Duel<B>` se rechaza antes de ejecutar.
- **m-5 (otro compilador, otro bytecode): no hay prueba en la fuente, y el plan ya lo dice con cautela.** Lo que sí está verificado: `InclusionCheck` compara funciones normalizadas **con su código** (`normalized.rs:728-742` @ `testnet-v1.83.0`, `code_included`), y la versión del formato binario es la 7 en los dos tags (`file_format_common.rs`, `VERSION_MAX = VERSION_7`). Si el código generado cambia o no se mide en V-2 o N-7; no es un hecho.
- **`clock::borrow`:**
  - **ausente** en el framework de PV 140 (`clock.move` @ `05ad86a3…`);
  - **presente** en el de PV 142 (`clock.move:46-49` @ `e6f43880…` y @ `testnet-v1.84.1`);
  - entra en PV 142 en todas las redes (`lib.rs:433, 4994` @ `testnet-v1.84.1`);
  - `manifest.json` de `1.84.0` y de `1.84.1`: PV 142 → `e6f43880…` (N-3).

---

## 7. Dictamen final por STOP

| STOP | ¿De acuerdo? | ¿Delegable? |
|---|---|---|
| P-1 Base común | Sí, (a). Si P-2 = (2), reconsiderar (c), como dice el plan. | No |
| P-2 `Active` | **Mi recomendación: (1b)** con N-1 y N-2, y el owner acepta la semántica permanente "100/100 al vencer + carrera en el borde". `MAX_ACTIVE_MS` = 7 días como cota por jugada. Alternativa coherente: (2). (1a), no. | No |
| P-3 Coinflip | Sí, M-B. | No |
| P-4 Comisiones | Sí, (a); terceros = STOP aparte. | No |
| P-5 Upgrade | Sí, compatible. La ejecución va aparte, tras la compuerta y la autorización. | No |
| P-6 `VERSION` | Sí, no subir, con el corte escrito. | No |
| P-7 Política del `UpgradeCap` | Sí, `compatible` (confirmación). | No |
| P-8 Toolchain | Sí, PR previo. Las dos versiones traen el framework con `borrow` (N-3); `1.84.0` ya cumple 7 días y `1.84.1` desde el 2026-11-24T20:35:31Z. Elige el owner. | No |
| P-9 Producto de la app | Sí. | Solo con delegación nueva y explícita |
| P-10 Orden con #72 | Sí. | Solo con delegación nueva y explícita |
| P-11 Fórmula | Sí, confirmar. | No |
| P-12 `test-publish`/`test-upgrade` en localnet | Sí, acotado a `<SMOKE_DIR>` y a la localnet aislada. Sumar el uso del binario 1.83.0 para el v1 del ensayo (N-7). | No |
| P-13 Restricción (d) | Sí, registrarla, con el punto (v) de N-1. | No |

Todos los STOP están clasificados como corresponde: no delegables, salvo P-9 y P-10 con delegación nueva (408).

## 8. Lo que el owner tiene que decidir antes del handoff

1. P-1, P-3, P-4, P-5 (dirección), P-6, P-7, P-11 y P-12.
2. **P-2:** (1b) o (2), aceptando por escrito la semántica permanente de N-1 si elige (1b), más el valor de `MAX_ACTIVE_MS`.
3. **P-13:** la restricción (d) con el punto (v).
4. **P-8:** versión de la CLI y criterio de edad.
5. P-9 y P-10, o una delegación nueva y explícita para esos dos.

## 9. Cambios para la v1.2 (antes del handoff de TASK-2)

1. **N-1:** restricción (d)(v); criterio de forfeit de #18 antes del vencimiento en §9; carrera escrita en §2.5/§2.6; P-2 reformulada con esa semántica.
2. **N-2:** `extend_lease` con `ENotPlayer` y monotonía; garantía de §2.6 y R-10 corregidas; regla de `lease_ms` constante para #18; tests.
3. **N-3:** H-10 a PV 142; dependencia de TASK-2 respecto de PRE-1 en §14; API de test en V-13.
4. **N-4..N-7:** `Expired`, sí o no; INV-D1 intra-transacción y la regla de cliques calientes; lista de entrada de la compuerta; v1 del ensayo con el binario 1.83.0 y V-2 a prioridad normal.
5. **N-8** (opcional).

---

### §R-6 sobre esta revisión
Greps con `/usr/bin/grep -nE` sobre este archivo:
- `[0-9a-fA-F]{40,64}`: 0 coincidencias.
- `0x[0-9a-fA-F]{8,}`: 0.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: solo la línea de esta lista, que cita el patrón.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0. Los prefijos de commits públicos del framework (`05ad86a3…`, `e6f43880…`) no tienen sufijo, así que no coinciden. No hay direcciones de cuenta.
