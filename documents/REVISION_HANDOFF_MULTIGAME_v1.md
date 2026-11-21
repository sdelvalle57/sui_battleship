APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS — revisión del MAYOR de `documents/HANDOFF_MULTIGAME.md` v1 (#73)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>` de #73, branch `feature/issue-73-multigame`, HEAD `edfcdc2`; handoff v1 sin commitear, 594 líneas; plan v1.3.1 (665 líneas, modificado sin commitear).
- **Plan v1.3.1 contra lo aprobado:** `git diff edfcdc2 -- documents/PLAN_MULTIGAME.md` da 13 inserciones y 11 borrados, todos de R4-1 (`EPhaseMismatch` = 25, el orden y las causas de `record_move`, los dos órdenes de la fase simultánea en los tests) y R4-2 (textos "decidido"). **No cambia ninguna decisión del owner.**
- **Resumen:** el handoff reproduce fielmente el plan. Coinciden la tabla de `duel` (R.4), los aborts 0-25 en orden con una causa por código (R.3), los 7 eventos (R.5), INV-D1..D7, los controles 0-7 (R.2), la regla de bits, `activate_atomic`, `Collected` sin abilities con `duel_id`, `ctx.sender()` leído por la base, `CLAIM_GRACE_MS` = 7 días y `refund_stalled` 100/100 sin `assert`. Las firmas compilan en Move 2024 con el framework de la PV 142 (detalle en §2).
- **Hallazgos:** 2 MAJOR de proceso y datos (cómo se invoca el binario 1.83.0 en la localnet, y el sandbox v3 con constantes acortadas que alimenta las fixtures de la app), 8 MINOR y 3 SUG.
- **Qué hace falta:** una v1.1 que corrija los 2 MAJOR **antes de entregar TASK-1**. Los MINOR pueden ir en esa misma v1.1.

---

## 1. Hallazgos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| H-1 | 🟠 MAJOR | P-12 (solo localnet aislada), D-20261102-03, C-3, SEG-3 | 183-184, 414 | El v1 del ensayo se publica "con el binario 1.83.0" (`sui client test-publish …`), pero el `env.sh` de `agents.md` §3 define **un solo** `SUI`, y `suic`/`smoke_guard` lo usan (`agents.md:132-145`). El handoff no dice cómo invocar el segundo binario dentro del prefijo aislado. | El DEV corre `<ruta>/sui-1.83.0 client test-publish …` sin `. env.sh`: sin `SUI_CONFIG_DIR` ni `HOME` aislados, el binario lee el `client.yaml` real (`active_env: testnet`, sin claves) y **intenta publicar en testnet** (falla sin dirección, pero un agente intentó publicar en testnet), o escribe en `~/.sui`. | Fijar la receta: en `env.sh`, `SUI_V1=<ruta absoluta del 1.83.0 verificado>` y `suic_v1() { printf 'n\n' \| "$SUI_V1" client "$@"; }`, y un `smoke_guard_v1` que compruebe `[ "$(printf 'n\n' \| "$SUI_V1" client active-env)" = localnet ]`. Toda llamada al 1.83.0 va con el mismo prefijo del paso 3 (`. env.sh && … && smoke_guard && smoke_guard_v1 &&`); **nunca** el binario sin el prefijo. El binario se ejecuta solo **después** de verificar el SHA-256 del tgz **y del binario** contra `git show 88dd53b:.github/workflows/ci.yml` (`SUI_TGZ_SHA256` y `SUI_BIN_SHA256`). Aplica igual a TASK-5 (414) y al `sui move build` del diff de bytecode (185). |
| H-2 | 🟠 MAJOR | PROY-2/R-11 (ids publicados inmutables), C-9, SEG-10, ARQ-6 (fixtures reales) | 411, 418-419, 463-471, 529 | El sandbox v3 de TASK-5 "acorta constantes (el **control 1** a ~15 s y `CLAIM_GRACE_MS` a ~15 s)", y de ahí salen las fixtures commiteadas `duel-reads`/`duel-tx` con `Active`, `TimedOut` y `Expired`. Problemas: (a) quedan objetos y eventos imposibles en producción (`control = 1` con `turn_ms = 15000`), que contradicen la tabla R.2 y la derivación `turn_ms → id` (plan §2.4); (b) TASK-7 tiene que decidir cómo muestra un `turn_ms` fuera de la tabla, una decisión de producto que el handoff no da (C-9: STOP o improvisación); (c) no dice **cómo** se garantiza que el sandbox no toque el árbol. | Los tests de la app cementan "control 1 = 15 s" o relajan la validación para que las fixtures pasen. O un `duel.move` con constantes acortadas queda en el árbol de trabajo y entra en un commit: el upgrade de testnet saldría con plazos de 15 s. | (1) En el sandbox, **no redefinir ids existentes**: agregar un id nuevo (p. ej. 8 = 15 s) y una constante de gracia del sandbox (lo que R-11 permite en un upgrade). (2) Las fixtures salidas del sandbox llevan `_meta.sandbox = true` y las constantes usadas. (3) Definir en el handoff la regla de la app para un `turn_ms`/`control` fuera del espejo: se muestra el plazo en formato genérico ("15 s por jugada"), nunca es error (la cadena manda), con su test. (4) El sandbox se arma con `git archive HEAD contracts \| tar -x -C <SMOKE_DIR>/v3`, **nunca** en el worktree. DoD de TASK-5: `git status --porcelain` vacío, `git diff --exit-code -- contracts/sources`, `/usr/bin/grep -rn "15_000\|15000\|testgame" contracts/sources app/src` sin coincidencias, y la evidencia de estos tres puntos en la compuerta (§G). |
| H-3 | 🟡 MINOR | SEG-5, PROY-5 | 345, 351, 417, 436 | "Mismo gasto en ambos resultados" queda en un comentario. TASK-3 no tiene un test que lo mida, y su DoD no repite las verificaciones de R.7 (ningún `allow(lint(public_random))`, ningún struct con `RandomGenerator`). | Una rama por resultado que agrega un objeto o un evento solo para un lado (diferencia de gas) pasa desapercibida. | En TASK-5, paso 5: registrar `gasUsed` (computación, storage y rebate) de un `accept` ganado por el creador y de uno ganado por el aceptante, y exigir **cómputo igual** y storage igual salvo ±0 (mismo camino). Sumar al DoD de TASK-3 el grep de R.7 sobre `contracts/sources` con su salida pegada. |
| H-4 | 🟡 MINOR | Tests de bordes (punto 2 del encargo) | 303-305 | Los bordes del plazo están en el ms exacto para `record_move`/`collect`/`claim_timeout`, pero no para la **gracia** ni para "ambos pendientes". Tampoco hay test de que el ganador **todavía** puede reclamar pasada la gracia (la carrera documentada en el plan §2.5). | Un `>` en lugar de `≥` en `ENotStalled` adelanta o atrasa 1 ms la salida 100/100 y nadie lo ve. | Agregar `test_refund_stalled_one_pending_rejects_one_ms_before_grace` / `…_succeeds_at_deadline_plus_grace`, `test_refund_stalled_both_pending_rejects_one_ms_before_deadline` y `test_claim_timeout_still_succeeds_after_grace` (y, tras un `refund_stalled`, `claim_timeout` → `ENotActive`). |
| H-5 | 🟡 MINOR | INV-D4, evidencia de compilación | 263, 191 | El plan pide "`collect` sin `pay` no ejecutable". En el handoff ese caso queda implícito: no se puede escribir un test (no compila). Lo mismo con "pagar sin cobrar". | No hay evidencia de que `Collected` realmente no tenga `drop`: un `has drop` agregado por error compilaría y rompería INV-D4 en silencio. | Sumar a la sonda V-14 (TASK-1) y repetir en TASK-2 contra el `duel` real: un módulo de prueba que descarta un `Collected` o lo guarda en un struct **no compila** (salida pegada, sin commitear). Y que el reporte de TASK-2 pegue la declaración real de `Collected`, sin abilities. |
| H-6 | 🟡 MINOR | FLUJO §8, ESTANDARES (fuente única) | 511 | TASK-8 hace que el DEV escriba en `DECISIONES.md` ("entrada de la restricción (d) y del cambio de ESTANDARES"). La restricción (d) ya está en D-20261119-05 (P-13), y los registros de decisiones los escribe el orquestador o el MID, no el DEV. | Entradas duplicadas o redactadas por quien no decide; un cambio de ESTANDARES sin revisión del MAYOR. | El DEV **redacta** los cambios de `ESTANDARES.md` en su reporte. El orquestador los aplica con una entrada de `DECISIONES.md` que referencia D-20261119-05 (sin duplicar la (d)), y el MAYOR los revisa en la integración. |
| H-7 | 🟡 MINOR | Ejecutabilidad (TASK-8 depende de TASK-4) | 371, 523 | El smoke de TASK-8 usa la "publicación variante B + upgrade", pero TASK-4 define `--pubfile-path`/`--out` solo para localnet y no dice si `upgrade --network localnet` **sin** `--out` reescribe `contracts/deployments/localnet.json`, que es lo que lee la app en `npm run dev`. | En TASK-8 la app arranca con el `localnet.json` del v1 (sin `typeOrigins`) y no ve las fuentes nuevas, o el DEV edita el json a mano (ARQ-6). | Especificar en TASK-4 la "variante B" de `upgrade`: sin `--out`, reescribe `contracts/deployments/localnet.json` (ignorado por git), con su test; el cierre lo borra como hoy. |
| H-8 | 🟡 MINOR | FLUJO §6-§7, D-20261103-01 (autorización registrada) | 555-558 | §H no dice **cuándo ni contra qué app** corre TASK-9. Sin smoke en verde no hay revisión de integración, y Railway solo publica `master`. Tampoco dice quién escribe la parte testnet de `SMOKE_MULTIGAME.md`, ni que la autorización del owner se **registra** en `DECISIONES.md`. | El smoke de testnet se hace después del merge (orden invertido) o sin documento; la autorización queda en el chat. | §H: (1) el MID redacta la parte testnet de `SMOKE_MULTIGAME.md` antes de la compuerta y es entrada de §G; (2) TASK-9 corre **antes** de la revisión de integración, con el build local de testnet (`VITE_SUI_NETWORK=testnet`, `npm run dev`/`preview`) y el json ya actualizado en la branch, más un chequeo posterior en Railway; (3) la autorización explícita del upgrade se registra como entrada propia de `DECISIONES.md`. |
| H-9 | 🟡 MINOR | Citas (M3) | 333, 366 | Dos citas corridas. `game_tests.move:27-32` no son las semillas: la 27 es `HUGE_BET`, `SEED` está en 30 y `RANDOM_SEEDS` en 33. `publish.mjs` 101 es `FORBIDDEN_SUI_ARGS`: `ALLOWED_SUI_VECTORS` empieza en 102. El resto de la muestra coincide: `game_tests.move:41, 50, 99, 109, 118, 127, 156, 774, 845, 884, 1014, 1042, 1141, 1185`, `deployment.mjs:36, 222, 283, 341`, `publish.mjs:59, 83, 109, 184, 648, 764, 798`, y `test_scenario` `ctx_builder_from_sender`/`set_clock_timestamp`/`next_with_context` @ `testnet-v1.84.1` (`test_scenario.move:141, 234, 344`). | El DEV pierde tiempo o copia la constante equivocada. | Corregir a `game_tests.move:30-38` (`SEED` y `RANDOM_SEEDS`) y `publish.mjs:102-117`. |
| H-10 | 🟡 MINOR | Tests de `refund_stalled` | 305 | "Ambos jugadores reciben exactamente lo previsto" está en el plan, pero en el handoff no hay un test de **conservación** del reembolso con balances antes y después por actor, ni con un tercero que llama. | Un error de destinatario (ambos `bet` al creador) pasa si el test solo mira el estado `Expired`. | En `test_refund_stalled_refunds_both_*` y `…_by_third_party_pays_only_the_players`: `Coin` del creador = `bet`, del aceptante = `bet`, del tercero = 0, `fees_collected` sin cambio, `stake == 0`. |
| H-11 | 🔵 SUG | M3 (una sesión por task) | 181-192, 255-262, 302-309, 466-473 | TASK-1 (10 sondas y dos upgrades sandbox), TASK-2 (~60 tests), TASK-2b (~45) y TASK-7 son grandes para una sesión. | Una sesión cortada a mitad deja localnets o archivos a medias. | Partir TASK-1 en 1a (V-16, V-2, V-1, V-8, V-10, V-11) y 1b (V-3, V-12, V-4, V-5, V-13, V-14, V-15, V-2 additive), y TASK-7 en 7a (config, registro, parsers, errores) y 7b (builders, lobby, Mis partidas, claves). TASK-2 y 2b pueden quedar enteros si el DEV reporta avance parcial. |
| H-12 | 🔵 SUG | Lint `self_transfer` | 125, 131-133 | El lint `self_transfer` (`sui_mode/linters/self_transfer.rs:80-104` @ `testnet-v1.84.0`) marca funciones no `entry` que transfieren a `ctx.sender()`. | Si `pay` transfiriera a `ctx.sender()` en lugar de a la dirección guardada, `--lint --warnings-are-errors` corta el build. | Escribir en R.4: los pagos van siempre a direcciones **guardadas** (`creator`, `acceptor` del estado), nunca a `ctx.sender()`, como `game.move:219-231`. |
| H-13 | 🔵 SUG | TASK-8, paso 7 | 529 | El parche opcional que registra `testgame` en la app: si se cuela al PR, el `typeOrigins` de testnet no tiene ese tipo y la app de producción falla cerrada (error de configuración para todos). | Error de configuración en Railway después del merge. | Hacer el parche en una **copia** de `app/` dentro de `<SMOKE_DIR>`, no en el worktree, o con `git stash` verificado. DoD: `git diff --exit-code`, `git stash list` vacío y `grep -rn testgame app/src` = 0. |

---

## 2. Revisión por foco

**1. Fidelidad y compilación.**
- R.1-R.6 coinciden con el plan v1.3.1 §2.4-§2.6, incluido el orden de R4-1 en `record_move` (129, 290).
- **Compila (revisión de las firmas, sin correr gates):**
  - `Duel<phantom G> has key` (lo comparte su módulo: `share_object` interno);
  - `DuelState` con variantes con campos y `copy, drop, store`;
  - `Collected` sin abilities, devuelto por `public(package)` y consumido por `pay` dentro de `duel`;
  - `entry` genéricas sobre `&mut Duel<G>`;
  - eventos `…<phantom G> has copy, drop` emitidos desde `duel`;
  - `sui::clock::borrow().timestamp_ms()` en el framework de la PV 142;
  - el witness `Coinflip` (no es candidato a OTW).
- **Lints:** `public_mut_tx_context` solo mira funciones `public` (`public_mut_tx_context.rs:31`), así que `&TxContext` en `public(package)` no lo dispara. `self_transfer`: ver H-12.
- **No encontré** un struct sin `drop` que se descarte, un `Coin` sin consumir ni un `public_transfer` de un tipo sin `store`. Los pagos son `Coin<SUI>` con `public_transfer`, como `game.move`.
- **El DEV no tiene que improvisar diseño**, salvo en H-2 (cómo muestra la app un `turn_ms` fuera de la tabla) y H-7 (variante B de `upgrade`).

**2. Fondos.**
- **Conservación:** `payout + fee == 2 × bet` en `pay` y en `claim_timeout`; `fee` con piso y `u128` (tests con 0/250/1000, pozos impares y `HUGE_BET`).
- **Orden de chequeos:** todos los aborts van antes de mover fondos. `add_fees` es el último chequeo antes de pagar, en `activate_atomic`, `collect` y `claim_timeout`.
- **Doble cobro:** un segundo `collect` sobre el mismo `Duel` aborta con `EBrokenStake` (`stake = 2 × bet − fee`), y el `Collected` de otro `Duel` aborta con `EWrongDuel` (test 261).
- **Destinatarios:** índice sobre direcciones guardadas, el rival en el reclamo, los dos jugadores en el reembolso.
- **`fee_rate`:** copiado al crear (test 262).
- **INV-D1:** cubierta al inicio y al final de cada transacción.
- **`refund_stalled`:** sin `assert` de `stake` (133, 295).
- **`cancel`/`reject`/`refund_stalled`:** no leen la House ni la versión (tests de corte en 258 y 305).
- **AuthZ:** cada función tiene su caso denegado con test.
- **Faltan:** los bordes exactos de la gracia (H-4) y la conservación explícita del reembolso (H-10).

**3. SEG-5 (TASK-3).**
- `accept` es `entry` no `public`, con el orden `activate_atomic` (valida y cobra) → generador creado adentro → `generate_u8_in_range(0, 1)` → `pay`.
- Tiene tests de ambos resultados con `Random` real y semillas, el ganador forzado y el abort antes del sorteo con la House en otra versión.
- `Random` último en el PTB: test del builder en TASK-7 (480).
- **Falta:** la medición del gasto por resultado y el grep de R.7 en el DoD (H-3).

**4. Proceso.**
- **C-1..C-12 son correctas:** el DEV corre gates y no commitea, reportes `.txt`, `printf 'n\n'`, localnet aislada, las prohibiciones, sin direcciones ni rutas personales.
- **TASK-1 y TASK-5:** respetan P-12 en la intención; el agujero es H-1.
- **Sandbox v3:** aceptable solo con el aislamiento y la semántica de H-2.
- **Parche del navegador:** H-13.

**5. Compuerta (§G) y pasos del owner (§H).**
- **§G** reproduce los 10 puntos aprobados. Sumar:
  - la evidencia del sandbox aislado (H-2 (4));
  - las medidas de gasto por resultado (H-3);
  - las sondas de compilación de `Collected` (H-5);
  - la parte testnet de `SMOKE_MULTIGAME.md` redactada (H-8).
- **§H:** ver H-8. El upgrade solo lo ejecuta el owner, después de la compuerta y con autorización explícita: correcto.

**6. Ejecutabilidad.**
- **Orden:** PRE-1 → 1 → 2 → 2b → 3 → 4 → 5 → 7 → 8 → compuerta → autorización → 6 → 9. Correcto (C-2 lo verifica con `merge-base --is-ancestor`).
- **DoD y archivos:** los DoD son verificables y los archivos exactos. `house.move` y `game.move` figuran como intocables en cada task, con `git diff --exit-code` en el reporte.
- **Commits:** solo `(#73)` y ninguna palabra de cierre (C-11). El grep de D-20261119-01 sobre el handoff no encuentra ninguna con número. No hay cuerpo de PR en el handoff: lo propone el MID al final (la palabra de cierre de #73 solo ahí).
- **Tamaño:** H-11.

**7. Citas y comandos.** Muestra verificada (H-9): coinciden salvo dos. Los comandos de `agents.md` §3 (`env.sh`, `smoke_guard`, `suic`, `act_as`, variantes A y B, cierre) son los vigentes (`agents.md:115-202`).

## 3. Cambios para la v1.1 del handoff
1. **H-1:** `SUI_V1`/`suic_v1`/`smoke_guard_v1` en el `env.sh`; verificar tgz **y** binario 1.83.0 antes de ejecutarlo; aplicarlo a TASK-1 (pasos 1-3) y TASK-5 (paso 1).
2. **H-2:** sandbox con un id nuevo (sin redefinir el 1), `_meta.sandbox`, regla de la app para `turn_ms`/`control` fuera de la tabla con su test, armado por `git archive` fuera del worktree y DoD con los greps.
3. **H-3..H-10:** gasto por resultado y grep de R.7 en TASK-3; bordes exactos de la gracia y reclamo pasada la gracia; sondas de compilación de `Collected`; ESTANDARES y DECISIONES por el orquestador; variante B de `upgrade`; orden y documento de TASK-9 y registro de la autorización; dos citas; conservación del reembolso.
4. **Opcionales:** H-11..H-13.

---

### §R-6
**Sobre el handoff** (`/usr/bin/grep -nE`):
- Grep 1: 0.
- Grep 2: 0.
- Grep 3: solo la línea 37, que cita los patrones en C-7.
- Grep 4: 0.
- Palabras de cierre: la única mención es la regla de C-11 ("Closes/Fixes/Resolves #N", sin número). 0 coincidencias del grep de D-20261119-01.

**Sobre esta revisión:** los cuatro greps en 0. No hay direcciones de cuenta ni rutas personales.
