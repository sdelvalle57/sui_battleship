APPROVE

## Veredicto: APROBADO — re-revisión del MAYOR (ronda 4, cierre, solo el delta) de `documents/PLAN_MULTIGAME.md` v1.3 (#73)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>`, branch `feature/issue-73-multigame`, HEAD `88dd53b`; plan v1.3 sin commitear, 663 líneas. Ronda anterior: v1.2, APPROVE CON CAMBIOS (R3-1..R3-6).
- **Resultado:** R3-1..R3-6, los riesgos 5 y 6 y el límite "sin relayers" están **resueltos**. Todos los STOP están decididos por el owner. La autorización del upgrade sigue aparte y vigente, y la compuerta de pre-upgrade está completa.
- **Quedan 2 MINOR**, que no requieren una v1.4:
  - **R4-1** (granularidad de dos abort codes de `record_move`): se resuelve **en el handoff de TASK-2b**, antes de que esos números queden estables.
  - **R4-2** (tres textos que quedaron viejos): se corrige en el próximo toque del plan o en TASK-8.
- **El plan queda aprobado para el handoff completo según §14:** PRE-1 → TASK-1 → 2 → 2b → 3 → 4 → 5 → 7 → 8 → compuerta → autorización → TASK-6 → TASK-9.

---

## 1. Resolución de la ronda 3

| Hallazgo | Estado | Dónde |
|---|---|---|
| R3-1 regla de reinicio del plazo | RESUELTO | §2.4 (187); tabla (221); §2.6 (256-257); tests (261); §9 criterios 2-3 (453-454) |
| R3-2 `collect` con authZ de jugador | RESUELTO | tabla (222); TASK-2 AuthZ y tests (587, 589); §9 criterio 5 (457) |
| R3-3 criterio de la v3 en un corte | RESUELTO | §4.3 (5) (338); R-3 (537) |
| R3-4 R-11 | RESUELTO | R-11 (545) |
| R3-5 codificación de `to_move` en (d) | RESUELTO | (d)(v) (117) |
| R3-6 (a) tabla de transiciones; (b) fase inicial | RESUELTO | compuerta punto 3 (632); §2.6 (256); §9 criterio 4 (456) |
| Riesgo 5 (congestión en la jugada ganadora) y nota de empates | RESUELTO | §2.6 riesgos 5-6 (268-269); R-10 (544) |
| Límite "sin relayers" | RESUELTO | decisión de 208; tabla (221); §9 criterio 4 |

## 2. R3-1 probado a mano (punto 1)

Bits: creador = 1, aceptante = 2; `rem = to_move & !bit(sender)`.

| Caso | `to_move` | Firma | `rem` | `next` | Resultado según 187/221 |
|---|---|---|---|---|---|
| Fase simultánea, primero A | 3 | A (1) | 2 | 2 | `to_move` = 2, plazo **sin cambio** ✓ |
| Fase simultánea, `next` distinto | 3 | A | 2 | 1, 3 o 0 | `EBadMask` ✓ (el juego no puede tocar el pendiente del otro) |
| Cierre de fase, dispara quien cerró (caso de B) | 2 | B (2) | 0 | 2 | `to_move` = 2, **plazo completo** ✓ (el defecto de la ronda 3, corregido) |
| Cierre de fase, otra fase simultánea | 2 | B | 0 | 3 | `to_move` = 3, plazo nuevo ✓ |
| Turno alternado | 1 | A | 0 | 2 | `to_move` = 2, plazo nuevo ✓ |
| El mismo jugador sigue | 1 | A | 0 | 1 | `to_move` = 1, plazo nuevo ✓ (cada jugada tiene su plazo, decisión (a) del owner) |
| `next` = 0 o > 3 con `rem == 0` | 1 | A | 0 | 0 / 4..255 | `EBadMask` ✓ |
| Jugador fuera de `to_move` | 1 | B | — | — | `ENotYourTurn` ✓ (antes que el plazo y la máscara) |
| Tercero | cualquiera | C | — | — | `ENotYourTurn` ✓ |
| Vence con 2 (después de que A cerró su parte) | 2 | — | — | — | `claim_timeout` → gana el creador ✓ (codificación de (d)(v)) |

- **Sin ambigüedad ni abuso.** El jugador no controla `next`. El juego no puede alterar a mitad de fase el plazo ni el pendiente del otro. Prolongar el turno propio requiere jugadas válidas, y eso lo acota la finitud del juego (criterio 3 de §9, con el peor caso escrito).
- **Dos llamadas a `record_move` en la misma transacción** (bug del juego): la segunda aborta con `ENotYourTurn`, o reinicia con el mismo `ahora`, que es inocuo.
- **Los tests de 261 cubren todos los casos de la tabla.** Sugerencia para el handoff: correr la fase simultánea en los dos órdenes (A primero y B primero), porque son simétricos pero tocan bits distintos.

## 3. Hallazgos nuevos

| # | Sev. | Regla | Líneas | Problema | Escenario | Corrección |
|---|---|---|---|---|---|---|
| R4-1 | 🟡 MINOR | LIM-8 ("un abort code por condición"), PROY-2, ARQ-4 | 212, 221 | En `record_move`, dos códigos agrupan causas distintas. `EBadMask` (19) cubre "máscara fuera de `1..=3`" (igual que en `activate`: misma causa, bien reusada) y también "`next != rem` a mitad de fase", que es otra causa. `ENotYourTurn` (20) cubre "no es jugador" y "es jugador pero no está en `to_move`", aunque para la primera ya existe `ENotPlayer` (24), que usa `collect`. | `errors.ts` mapea por módulo + código. Con un solo código, la app no puede distinguir "esta cuenta no juega esta partida" de "no es tu turno", y un `next != rem` (bug del juego) se reporta como máscara inválida. Una vez publicados, los números no se pueden separar (PROY-2). | En el handoff de TASK-2b: código nuevo para la fase, p. ej. `EPhaseMismatch` (25: con `rem != 0`, `next != rem`). En `record_move`, el orden queda `ENotActive` (11), `ENoClock` (17), **`ENotPlayer` (24)**, `ENotYourTurn` (20, solo "jugador fuera de `to_move`"), `EDeadlinePassed` (21), `EBadMask` (19) / `EPhaseMismatch` (25), y los tests se ajustan. No cambia ningún otro número. |
| R4-2 | 🟡 MINOR | PROY-20 (coherencia del doc) | 336 y 339 (§4.3), 466, 544 (R-10) | Quedaron textos de cuando había STOP pendientes: R-10 dice "S-1..S-3 los decide el owner"; §4.3 conserva "es lo que el owner decide en P-6" y "trade-off para el MAYOR … [recomendada]"; la nota de 466 sigue hablando de delegar P-9 y P-10, que ya decidió el owner. Ninguno contradice una decisión. | Un lector del handoff duda si S-1..S-3 o P-9/P-10 siguen abiertas. | Reemplazar por "decidido (P-14 / P-6 / P-9 / P-10)" en el próximo toque del plan, o al pasar el contenido a `contracts/README.md` y `DECISIONES.md` en TASK-8. |

**Orden de aborts de `collect` (R3-2):** `ENotActive` va antes de `ENotPlayer` a propósito. El aceptante solo se conoce dentro de `Active { acceptor }`, así que la authZ de jugador necesita el estado primero (lo mismo vale para `record_move`). No contradice la regla "authZ antes que estado" de `cancel`/`reject`, cuya authZ no depende del estado. La numeración 0-24 no tiene colisiones.

## 4. Coherencia interna (punto 3)

Contrasté abort codes, nombres de funciones, estados y tasks entre §2.4, §2.5, §2.6, §4.3, §9, §10 y §14:
- `ENotPlayer` (24) aparece con el mismo significado en la tabla (222), en TASK-2 (587, 589) y en §9 criterio 5 (457).
- `EBadMask`, `EDeadlinePassed`, `ENotStalled` y `EBothPending`, coherentes.
- Las seis variantes de `DuelState` y los siete eventos coinciden entre §2.4, §2.5, §8.2 y TASK-7/8.
- `collect` está en TASK-2, con `ctx` y su test de rendición fuera de turno, que se puede probar en TASK-2 porque `activate` fija `first_to_move`.
- `record_move`, `claim_timeout` y `refund_stalled` están en TASK-2b.
- TASK-2 depende de PRE-1 (lock con `clock::borrow`).
- La restricción (d)(v) y §4.3 (5) son coherentes con S-2 (100/100 como modo de falla neutral).

Fuera de R4-1 y R4-2, no encontré contradicciones.

## 5. STOP y compuerta (punto 4)

- **§10 (467):** P-1..P-14 figuran **DECIDIDAS** por el owner el 2026-11-19, con P-14 = S-1 (i), S-2 (i) 7 días con 100/100 y S-3 (i). P-9 y P-10 las decidió el owner, no por delegación. Nada de fondos ni contrato aparece como delegado.
- **La autorización explícita del upgrade (TASK-6) figura aparte y vigente**: 467, runbook paso 1 (522) y §14 (570). P-5 no la otorga.
- **Compuerta (§14, 627-640):** completa, con 10 puntos más la tabla de transiciones generada desde los tests. Con eso puedo hacer la revisión de pre-upgrade.

## 6. Dictamen (punto 5)

**Plan aprobado para el handoff completo.**
- **Ningún hallazgo bloquea el handoff del plan.** PRE-1, TASK-1, TASK-2, TASK-3, TASK-4, TASK-5, TASK-7 y TASK-8 pueden pasar a handoff según el orden de §14.
- **TASK-2b** pasa a handoff aplicando R4-1 en el texto del propio handoff (códigos y orden de `record_move`). Su revisión por el MID tiene que verificarlo.
- **R4-2** no bloquea nada.
- **Recordatorios para la ejecución** (ya escritos en el plan; los repito porque son de fondos):
  - V-13 (`borrow()` = `0x6` en la ejecución) y V-15 (no se puede intercalar con un hot potato) tienen que estar en PASA antes de que TASK-2b se dé por cerrada;
  - la compuerta exige las 10 entradas;
  - el upgrade lo ejecuta solo el owner, con autorización explícita.

---

### §R-6 sobre esta revisión
Greps con `/usr/bin/grep -nE` sobre este archivo:
- `[0-9a-fA-F]{40,64}`: 0 coincidencias.
- `0x[0-9a-fA-F]{8,}`: 0.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: solo la línea de esta lista, que cita el patrón.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0. No hay direcciones de cuenta.
