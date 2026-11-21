APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS — re-revisión del MAYOR (ronda 3, solo el delta) de `documents/PLAN_MULTIGAME.md` v1.2 (#73)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>`, branch `feature/issue-73-multigame`, HEAD `88dd53b`; plan v1.2 sin commitear, 662 líneas. Ronda anterior: v1.1, APPROVE CON CAMBIOS (N-1..N-8).
- **Resultado:** N-1..N-8 quedan **resueltos**. El reloj por jugada (1c) está bien planteado como código de fondos: salidas solo de la base, comisión solo en `Resolved`/`TimedOut`, mover y reclamar disjuntos y `refund_stalled` incortable. Encontré **1 MAJOR** (la regla de reinicio del plazo es ambigua y, en su lectura literal, contradice la decisión del owner "cada jugada tiene el mismo plazo"), **4 MINOR** y **1 SUG**.
- **Qué puede pasar ya a handoff:** PRE-1 (CLI `1.84.0`), TASK-1 y **TASK-2** (base sin reloj: `create`, `cancel`, `reject`, `activate`, `activate_atomic`, `collect`, `pay`, controles). **TASK-2b** (reloj) espera la v1.3 con el MAJOR resuelto y la decisión del owner en P-14.

---

## 1. Resolución de la ronda 2

| Hallazgo | Estado | Dónde |
|---|---|---|
| N-1 abandono gratis y carrera en el borde | RESUELTO por diseño | (d)(v) (117-121); INV-D6 (205); §2.5 (229-233); §2.6 (255-266). Abandonar es perder; mover y reclamar son disjuntos; la carrera `claim_timeout` vs `refund_stalled` tras la gracia está escrita |
| N-2 `extend_lease` | RESUELTO por diseño | No existe. El plazo sale de `turn_ms` del `Duel`; `record_move` exige `ctx.sender()` ∈ `to_move` (226) |
| N-3 `clock::borrow` PV 142 | RESUELTO | H-10; §2.6 (274); TASK-2 depende de PRE-1 (§14, 568, 583) |
| N-4 estado terminal | RESUELTO | `TimedOut` y `Expired` (177-187) |
| N-5 INV-D1 y cliques calientes | RESUELTO | INV-D1 (200); H-14 (104); §2.7 (280); V-15 (564) |
| N-6 entrada de la compuerta | RESUELTO (ver R3-6 por un agregado) | §14, compuerta (627-640) |
| N-7 v1 con el binario 1.83.0 | RESUELTO | TASK-1, TASK-5, V-1, V-2, V-16, P-12 |
| N-8 accessor de `activate` | RESUELTO | `house.min_bet()` (224) |

---

## 2. Hallazgos nuevos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| R3-1 | 🟠 MAJOR | SEG-4, P-2 (decisión del owner) | 192, 226, 261, 266 | La regla "el plazo se reinicia **solo si** `next_to_move` incluye a alguien que no estaba pendiente" es ambigua: ¿"pendiente" antes o después de sacar el bit del que mueve? Con la lectura que fijan los tests ("el mismo jugador que sigue en turno no reinicia", 266, es decir, antes), falla el caso que el propio plan usa (261): en la fase simultánea, A compromete (`to_move` {A,B} → {B}, sin reinicio: bien); B compromete y le toca disparar primero (`next` = {B}). {B} ⊆ {B}, así que **no se reinicia** y B arranca su turno de disparo con lo que le quedaba del plazo de compromiso. Además contradice la decisión (a) del owner (255): "cada jugada tiene el mismo plazo". | Daily 1 día: B compromete a las 23 h 59 min del plazo de la fase y le toca disparar. Le queda 1 minuto: no llega, y A reclama el pozo menos la comisión con `claim_timeout`. Tiempo agotado = derrota, con un plazo que la regla le recortó. | Regla precisa, a nivel de bits, y coherente con "por jugada": `rem = to_move & !bit(sender)`. **Si `rem != 0`** (fase simultánea con otro pendiente): exigir `next_to_move == rem` (`EBadMask`) y **no** reiniciar; el juego no puede cambiar a mitad de fase el pendiente del otro. **Si `rem == 0`** (el que mueve cerró su turno o la fase): `to_move = next_to_move` y `deadline_ms = ahora + turn_ms`, **también** si el mismo jugador sigue (cada jugada válida tiene su plazo completo, como en chess.com daily). Reescribir 192, 226, 261 y los tests de 266 (reemplazar "el mismo jugador que sigue en turno no reinicia" por: sigue ⇒ reinicia; fase simultánea con otro pendiente ⇒ no reinicia y `next` ≠ `rem` aborta; cierre de fase con el mismo jugador primero ⇒ reinicia). Agregar a §9 el criterio "el número de jugadas de una partida está acotado por las reglas" (el reinicio por jugada solo lo frena la finitud del juego) y escribir el peor caso: duración máxima del `Active` ≤ (jugadas máximas) × `turn_ms` + `CLAIM_GRACE_MS`. |
| R3-2 | 🟡 MINOR | SEG-2 (defensa en profundidad), regla (viii) | 211, 227 | `collect` no comprueba quién firma: "el que mueve es el que firma" vale para `record_move`, pero no para liquidar. Un camino de un juego que cualquiera pueda invocar (un "finalize" mal escrito) liquidaría por jugada sin un jugador en la transacción. | Un bug en #18 deja una `entry` pública de cierre sin authZ: un tercero liquida cuando quiere, antes del plazo. | `collect` recibe `ctx: &TxContext` y exige `ctx.sender() ∈ {creator, acceptor}` (abort nuevo, después de `ENotActive`). **No** debe exigir `∈ to_move`: la rendición se hace fuera de turno. |
| R3-3 | 🟡 MINOR | PROY-10, D-20261030-12 §4 | 338-341 (§4.3 (3)-(5)), R-3 (536) | En un corte, `record_move` (no lee la House) sigue funcionando, pero `collect` y `claim_timeout` quedan cortados. Toda partida `Active` en curso termina sí o sí en `Expired` 100/100 después de la gracia, gane quien gane, salvo que la v3 rehabilite cobrar y reclamar para los `Duel` con `version = 1`. El plan deja esa decisión "para ese momento" sin un criterio por defecto. | Un bug en `coinflip` obliga a cortar: todas las partidas de Battleship en curso pierden su resultado (el que iba a ganar por tiempo recibe solo su apuesta). | Agregar a (5) el criterio por defecto: la v3 vuelve a habilitar `collect`/`claim_timeout` para los `Duel` con `version = 1` en `Active`, **salvo** que el bug esté en esos caminos o en el reloj; en ese caso, 100/100 es el modo de falla deseado (ver S-2). Escribir también que durante el corte las jugadas siguen pero no se puede liquidar. |
| R3-4 | 🟡 MINOR | M3 (claim exacto), PROY-2 | 544 (R-11) | "La tabla de controles queda congelada; cambiarla exige otro `create` en un módulo nuevo" es inexacto. La tabla vive en el **cuerpo** de `create`, que es `public(package)`: un upgrade compatible puede agregar ids en la v3, para los juegos de la v3. Lo que sí queda fijo es el significado de los ids ya publicados (el `control` de `DuelCreated` y la derivación inversa desde `turn_ms`). | Se descarta por error agregar un control nuevo, o se reasigna un id con otro valor. | Reescribir R-11: ids existentes inmutables (PROY-2) y espejo en la app; ids nuevos posibles en un upgrade, con la tabla de la app y la inyectividad id ↔ `turn_ms` mantenidas. |
| R3-5 | 🟡 MINOR | PROY-10, restricción (d) | 115-126 | `claim_timeout` y `refund_stalled` de v2 interpretan `to_move` (1 ⇒ gana el aceptante, 2 ⇒ gana el creador, 3 ⇒ 100/100) y `deadline_ms` **para todo `G` y para siempre**. (d)(iv) ("`DuelState` no cambia de significado") lo cubre de manera implícita. | Una versión futura usa `to_move` con otra codificación (p. ej. 0 = "sin turno" en una fase con reloj) y el `claim_timeout` de v2 paga al jugador equivocado. | Hacerlo explícito en (d): en todo `Active` con reloj, `to_move ∈ 1..=3` con esa codificación de bits y `deadline_ms` absoluto en ms del `Clock`, en toda versión futura. |
| R3-6 | 🔵 SUG | — | 627-640, §9 | (a) Compuerta: agregar la **tabla de transiciones generada desde los tests** (estado × función × "antes/en/después del plazo" × `to_move`), con el resultado o abort esperado en cada celda. Es la evidencia más directa de INV-D6 y R3-1. (b) Para #18: evitar la fase simultánea inicial. El creador compromete su tablero al crear (dynamic field sin valor, en `Pending`) y el aceptante dentro de la transacción de `activate`. Así el griefing de S-1 desaparece al arranque. | — | Opcional. |

---

## 3. Auditoría del reloj (puntos 1-5 y 8)

**1. Transiciones, eventos, authZ, hot potato y SEG-5.**
- **Transiciones:** `Pending → Cancelled` (cancel/reject), `Pending → Active` (activate/activate_atomic), `Active → Active` (record_move), `Active → Resolved` (pay), `Active → TimedOut` (claim_timeout) y `Active → Expired` (refund_stalled). Cada una tiene su evento: los 7 de 241-249. PROY-7 cubierto; `collect` no es transición (251).
- **Empates:** no hay transición para un empate acordado. Battleship no lo necesita. Un juego futuro con empate no podría reusar `Expired` (cambiaría su significado, (d)(vi)) y necesitaría otro tipo base. Lo dejo como dato para el owner, no como hallazgo.
- **AuthZ:** correcta en todas, salvo R3-2.
- **Hot potato:** `Collected` sin abilities, con `duel_id`, consumido solo por `pay`. `activate_atomic` cobra y devuelve el potato, así que un `Duel` de control 0 termina en `Resolved` **por construcción**. `collect`, `record_move`, `claim_timeout` y `refund_stalled` rechazan el control 0 (`ENoClock`). **Bien cerrado.**
- **SEG-5:** `entry` no `public`; `activate_atomic` (todo lo que aborta, comisión incluida) → sorteo por índice → `pay` sin aborts que dependan del resultado; `Random` último en el PTB; el reloj no interviene en el coinflip. **Intacto.**

**2. `record_move` lee `ctx.sender()` (decisión del MID): mejor.**
- Elimina la clase de bug "el juego pasa un `actor` equivocado".
- Las transacciones **patrocinadas** no se rompen: el patrocinador solo paga el gas y `sender` sigue siendo el jugador; multisig y zkLogin, igual.
- Lo que deja afuera son los **relayers o meta-transacciones** (alguien envía la jugada en nombre de otro) y las jugadas de un árbitro u oráculo. Ninguno existe en #18. Escribirlo como límite y como criterio de #18: la `entry` de jugada la firma el jugador que mueve.

**3. Regla de reinicio y abusos.**
- La regla actual tiene el defecto de R3-1; con la corrección propuesta queda bien definida.
- **Abusos:**
  - Hacerse pendiente a sí mismo: no puede el jugador, solo el juego, porque `next_to_move` lo pasa el juego.
  - Ciclos de fase: los acota solo la finitud del juego (criterio de R3-1).
  - El juego fija mal `to_move`: puede hacer perder por tiempo al jugador equivocado.
- **Daño máximo:** el pozo de las partidas afectadas por ese bug. **Es aceptable bajo (d)(v)** porque no agrega confianza: el juego ya decide el ganador con `winner_index` en `pay`, y un `to_move` mal puesto es la misma clase de poder.
- **Mitigación:**
  - criterio de #18 con tests de que `to_move` coincide con las reglas en cada transición;
  - el corte por `VERSION`: con un bug de reloj, el modo de falla del corte es 100/100 (R3-3), que es neutral.

**4. `claim_timeout` frente a `refund_stalled`, y D-20261030-12 §4 en `Active`.**
- **Garantía:** en un corte, `claim_timeout` queda bloqueado (lee la House con versión) y `refund_stalled` no (sin House ni versión). Ningún fondo queda sin salida: bloqueo máximo `turn_ms` + `CLAIM_GRACE_MS` ≤ 14 días. **Cumple D-20261030-12 §4 para `Active`.**
- **`fee_rate`:** se copia al crear (188) y `claim_timeout` cobra con el copiado (229), como `Game`. `refund_stalled` paga **100/100 sin comisión**.
- **"Pozo sin comisión al rival" en lugar de 100/100 tras la gracia: no lo recomiendo, por dos razones de fondos:**
  - **Evasión de comisión:** el ganador racional esperaría `CLAIM_GRACE_MS` para no pagarla, y el reclamo por tiempo dejaría de aportar a la House.
  - **Modo de falla del corte:** si el bug que motivó el corte está en el reloj o en `to_move`, un pago **incortable** del pozo "al rival" seguiría pagándole al equivocado mientras dure el corte. 100/100 es neutral: nadie gana por un dato que puede estar corrupto.
- **Carrera tras la gracia** (reclamo del ganador vs. reembolso de cualquiera): está documentada (233). Con S-3 (i), la app o un guardián reclaman a tiempo, y el cliff solo castiga a un ganador que nadie atendió en 7 días.

**5. Controles y riesgos on-chain.**
- 10 minutos es holgado frente a la latencia de checkpoint (segundos).
- Los riesgos reales son los escritos en 268-272: firma de la wallet cerca del plazo; cancelación por congestión en `&mut House` de la transacción final (`collect`) o del reclamo; borde fijado por el consenso. Agrego uno a 269: la jugada **ganadora** con `collect` toca la House compartida, y una cancelación por congestión cerca del plazo puede dejar que el rival reclame por tiempo. Las jugadas comunes (`record_move`) solo tocan el `Duel`.
- **Orden de tasks:** PRE-1 (lock ≥ PV 142) → TASK-1 → 2 → 2b → … es correcto. `clock::borrow` solo compila con el framework de PRE-1.
- **Layout:** alcanza para los 7 controles y para #18 (turno, fases simultáneas y plazo en `Active`; el resto en dynamic fields sin valor).

**8. Verificación en la fuente.**
- **`borrow` lee el `0x6` de la ejecución:** el nativo `native_borrow` (`sui-execution/latest/sui-move-natives/src/clock.rs:30-55` @ `testnet-v1.84.1`) llama a `ObjectRuntime::borrow_clock`, que carga **el objeto `Clock` del sistema** desde el `system_object_resolver` de la ejecución y lo cachea por transacción (`sui-move-natives/src/object_runtime/mod.rs:258-288`). La doc del framework afirma que es "el mismo `Clock`, al mismo timestamp, que uno pasado a la transacción" (`clock.move:38-43`).
- **Lo que no pude leer en la fuente** es cómo el resolver fija la versión de `0x6` para una transacción que no lo declara como entrada. Lo mide V-13 (dos transacciones en localnet: `borrow()` contra `0x6`). Todas las funciones con reloj reciben un `&mut Duel` compartido, así que son transacciones ordenadas por consenso.
- **El tipo exacto del argumento genérico ya estaba confirmado** (ronda 2: `translate.rs:794-800`).
- **Tabla de controles:** 600 000 / 1 200 000 / 1 800 000 / 3 600 000 / 86 400 000 / 259 200 000 / 604 800 000 ms. Correcta.

---

## 4. Recomendación propia para P-14

- **S-1 (ambos pendientes al vencer): de acuerdo con (i), 100/100 sin comisión.** Si nadie jugó, no hay culpable ni partida que cobrar. (ii) cobra a quien no jugó y (iii) castiga al creador que quiso jugar. El griefing queda acotado a `turn_ms` (≤ 7 días), con el control elegido por el creador. Con R3-6 (b) desaparece en el arranque de Battleship.
- **S-2 (`CLAIM_GRACE_MS`): de acuerdo con (i), 7 días, con 100/100 (no "pozo al rival").** Las razones están en §3.4: sin evasión de comisión, modo de falla neutral en un corte, bloqueo máximo de 14 días. 24 horas castigaría a ganadores de partidas daily; 30 días alargaría el bloqueo en un corte sin beneficio. (iii) viola D-20261030-12 §4.
- **S-3 (quién llama a `claim_timeout`): de acuerdo con (i), cualquiera, y el pago va siempre al rival del pendiente.** El destinatario y el monto son deterministas, no hay incentivo a ocupar el lugar del ganador y habilita un guardián, que es lo que vuelve inofensivo el cliff de S-2. `claimed_by` en `DuelTimedOut` deja el rastro.

## 5. Coherencia de (d), #18, compuerta, app y STOP (puntos 6-7)

- **(d)(i)-(vi):** coherente con (1c); falta hacer explícita la codificación de `to_move` (R3-5).
- **#18 (§9, 456-460):** coherente; sumar el criterio de jugadas acotadas (R3-1), la firma directa del jugador (punto 2) y, opcional, R3-6 (b).
- **Compuerta (627-640):** suficiente con el agregado de R3-6 (a).
- **App (§8):** coherente. Botones de reclamar y reembolsar, elegibilidad por la preflight, plazo con el tiempo de la cadena, `TimedOut`/`Expired` en el detalle.
- **§10:**
  - P-1..P-8 y P-11..P-13 figuran como DECIDIDAS, con fecha y "aprobado por el owner" (465-507).
  - Pendientes: P-9 y P-10, delegables solo con delegación nueva y explícita (494-499), y P-14, **no delegable** (509).
  - Nada de fondos ni contrato figura como delegable. **Correcto.**

## 6. Para la v1.3 (antes del handoff de TASK-2b)

1. **R3-1:** regla de reinicio a nivel de bits (`rem`/`next`), tests reescritos, criterio de jugadas acotadas y peor caso escrito.
2. **R3-2:** `collect` con `ctx` y authZ de jugador.
3. **R3-3:** criterio por defecto de la v3 para `Duel` `Active` con `version = 1`.
4. **R3-4:** R-11 corregido.
5. **R3-5:** codificación de `to_move` en (d).
6. **Riesgo nuevo en 269:** congestión de la House en la jugada ganadora (§3.5).
7. **Opcional:** R3-6 (a) y (b); el límite "sin relayers" en §2.5 y §9.

Solo reviso ese delta. **Desbloqueado ya:** handoffs de PRE-1, TASK-1 y TASK-2 (no dependen de R3-1, que es de `record_move`, TASK-2b). R3-2 entra en TASK-2: agregarlo a su handoff si la v1.3 todavía no salió.

---

### §R-6 sobre esta revisión
Greps con `/usr/bin/grep -nE` sobre este archivo:
- `[0-9a-fA-F]{40,64}`: 0 coincidencias.
- `0x[0-9a-fA-F]{8,}`: 0.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: solo la línea de esta lista, que cita el patrón.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0. No hay direcciones de cuenta.
