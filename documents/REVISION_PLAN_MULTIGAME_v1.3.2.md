APPROVE CON CAMBIOS

## Revisión de delta del MAYOR: errata `PLAN_MULTIGAME` v1.3.1 → v1.3.2 (#73)

- **Fecha:** 2026-11-20.
- **Ref:** worktree de #73, branch `feature/issue-73-multigame`, HEAD `d938349`, plan v1.3.2 sin commitear.
- **Comprobaciones previas:**
  - el `HEAD:documents/PLAN_MULTIGAME.md` es idéntico a la copia v1.3.1 del scratchpad;
  - el `diff` real coincide con `plan73_v131_v132.diff` (52 líneas: 2 hunks de encabezado y 8 de contenido, incluida la tabla nueva de cambios).
- **Evidencia leída:** `git show HEAD:documents/REPORTES_MULTIGAME.md`:
  - TASK-1a: V-1 y V-8 (101-117) y la revisión del MID (H-b, 243-249);
  - TASK-1b: V-3 (379-409), V-12 (410-423), V-4 (425-452), V-5 (453-468), V-13 (469-516), V-14 (517-583), V-15 (585-614) y V-2 `additive` (616-632);
  - la revisión del MID de TASK-1b (724-855).
  - Contexto: plan §2.1-§2.7, §3.1, §4.4, §8.2, §11, §12 y §13, y el handoff v1.2.3 (R.7, TASK-4 y TASK-7b).
- **No leí** `contracts/sources/duel.move` ni `contracts/tests/duel_tests.move` (son el trabajo en curso de TASK-2).
- **Qué ejecuté:** solo lecturas. No corrí `sui` ni gates.

**Veredicto:**
- La errata es **correcta y se limita a la evidencia**: no cambia ninguna decisión del owner ni ningún diseño, y cada afirmación nueva tiene su respaldo medido.
- Pido **5 MINOR y 2 NIT** de coherencia. El MID los aplica **dentro de la misma v1.3.2**, sin otra ronda: alcanza con que el orquestador verifique el `diff`.
- **Ningún hallazgo bloquea TASK-2 ni cambia el modelo de amenaza de `duel`.** Para la revisión de TASK-2 dejo un control concreto (§6).

---

## 1. No-confusión de tipos y R-5 (pregunta 1): **sí alcanza**

El argumento del MID es correcto, y le sumo un quinto punto que, para los fondos, es el decisivo:

1. **Origen único por tipo.** La tabla de orígenes se hereda en cada upgrade con clave **(módulo, nombre)** (`move_package.rs:837-892`, citado por el MID), y un tipo no se puede borrar ni redefinir en un upgrade compatible (plan H-4). Entonces, para cualquier versión que lo contenga, `<idₖ>::m::T` resuelve **al mismo** tipo canónico o da `TypeNotFound`. No hay una tercera opción.
2. **Es el mismo tipo, no uno equivalente.** En V-3 (c2), el tag se escribió con el ID de v3 y el tipo resultante tiene el prefijo de definición (`<PKG2>`). En t1-t3, el **mismo** objeto se opera con tres variantes del ID sin `TypeMismatch`.
3. **Los IDs anteriores fallan cerrado:** c5, c7, t5, t6 y x4 dan `TypeNotFound`; la transacción aborta sin efectos.
4. **Entre familias de paquetes no hay colisión:** el ID de otra familia es otro tipo.
5. **(Agregado del MAYOR) El `typeArgument` de las 4 genéricas no elige qué fondos se mueven.**
   - `cancel`, `reject`, `claim_timeout` y `refund_stalled` reciben un `&mut Duel<G>` **existente**, así que `G` queda fijado por el **tipo del objeto**. Un `G` que resuelva a otro tipo se rechaza con `TypeMismatch` (V-15 h4 y h9), antes de ejecutar.
   - Ninguna `entry` genérica **crea** un `Duel<G>` a partir del `typeArgument`: `create` es por juego, regla (vi) de §2.5, y la crea el módulo dueño del witness.
   - Conclusión: el ID con que se escribe el `typeArgument` es una cuestión de **vivacidad** (si la llamada resuelve), **no de seguridad**. Un ID "equivocado" puede, como máximo, hacer fallar la llamada.

**Contraejemplos que busqué, sin encontrar ninguno que rompa la conclusión:**
- **Un struct agregado en un upgrade posterior a un módulo ya existente** (p. ej., un evento nuevo en `duel` en v3) tiene su **propio** `definingId` (v3), distinto del de `Duel` (v2). No es confusión: es la razón por la que la tabla es **por tipo** (`{ module, name, definingId }`) y no por módulo. El plan ya la define así.
- **Llamar a una versión vieja del código.** V-5 (a3-a5) muestra que `PKG1::house::migrate` ejecuta el código de v1. Eso ya lo cubren la restricción (d) (las genéricas de v2 valen para todo `G` y para siempre) y el corte por `VERSION` de los caminos con comisión (§2.1.5, §4.3). V-12 no lo empeora.

**Decisión:**
- Mantener "`typeArguments` desde `typeOrigins`/`definingId`" como **regla de diseño**: una sola forma, que no depende de una normalización del runtime que podría cambiar.
- La premisa de R-5 queda cerrada **para los `typeArguments`**.
- R-5 sigue vigente para la **lectura** (eventos, objetos y filtros exigen el ID de definición: V-3 y V-4).
- Mi M-6 de la ronda 2 (validar `typeOrigins` en `check`, en los tests y contra la cadena) **sigue en pie**: se apoya en la lectura, que V-3 y V-4 confirman, no en la falla de los `typeArguments`.

## 2. DoD de TASK-5/7b (pregunta 2): **acepto**

Fijar solo "con `definingId` pasa" es correcto: que otro ID falle es comportamiento del runtime, no del contrato. Hay una consecuencia que el DoD tiene que cubrir, y la cubre:

- como el runtime es permisivo, una regresión de la app que arme el `typeArgument` con `packageId` **pasaría** en cadena y no la vería ningún smoke;
- por eso la regla se fija con un **test unitario de igualdad de cadena** en los builders. El handoff v1.2.3, TASK-7b (línea 693), lo pide: "armado siempre con `definingId` y no con `packageId`".
- Pido que ese test use un caso donde `definingId ≠ packageId` (`G` definido en una versión anterior a la vigente). Si no, el test no distingue nada.

## 3. H-e, `--skip-verify-compatibility` (pregunta 3): **sin objeción**, con una línea en el runbook

- §3.1 (3) cita H-e sin tocar P-7 ni D7. Es correcto: con `compatible` (D7) no ocurre, y el pre-vuelo del runbook (§11, paso 2) exige leer `policy` 0.
- Bajo `compatible`, la bandera **solo saltea la verificación local**: la cadena sigue aplicando la política. Pero un error de compatibilidad local es una señal temprana que no hay que silenciar.
- **Sí, el runbook tiene que decirlo:** ver M-4. El gate de pre-upgrade (§G, ítem 7, "runbook final y la salida del dry run") lo recoge sin cambios si el runbook lo dice.

## 4. Verificación del alcance (pregunta 4)

- **Ninguna decisión del owner cambia** (P-1..P-14, D-20261119-05).
- **Ningún diseño cambia:** módulos, layout, estados, controles, abort codes, funciones (tabla de §2.5 intacta), INV-D1..D7, restricción (d) y SEG-5 (§2.7 intacto).
- Los hunks tocan solo el encabezado, la tabla de cambios, §3.1 (3), §4.4 (2.º punto), §8.2 (lobby), R-5, R-9, V-4, V-12 y V-13.
- **Cada afirmación nueva tiene su respaldo:**

| Afirmación | Evidencia |
|---|---|
| V-12 | Matriz c1-c7, t1-t7 y x1-x5 (410-421), y V-3 (408) |
| H-e | V-2 (a2): `EUC01009`, y con la bandera el depósito funciona (624-632) |
| R-9 / H-b | V-8 (iv): con solo un `fun init` en `game`, `IncompatibleUpgrade`; con solo una struct nueva, éxito (113-117; MID 243-249) |
| V-4 | Prefijo (432), definición (435-437), `emitModule` (440-443), 10 literales (447-450), 64 hex (445) |
| V-13 | Mainnet en PV 142 por GraphQL público (513) |

- R-5 cambia de mitigación ("V-12" pasa a "con `definingId` siempre resuelven"): es coherente con §1.

## 5. Incoherencias que el MID listó (pregunta 5): **se corrigen ya, en v1.3.2**

Son de minutos y dejan el plan coherente (PROY-20). Las tres del MID son M-1, M-3 y N-1. Agrego M-2 y M-5 (de mi lectura), M-4 (de la pregunta 3) y el NIT N-2.

| # | Sev. | Dónde (v1.3.2) | Problema | Corrección |
|---|---|---|---|---|
| M-1 | 🟡 MINOR | §4.4, penúltimo punto (`errors.ts:195-206`, ~línea 368) | "si el abort informara otro ID (V-5) se suman los de `upgrades`": V-5 ya lo midió (`location.package` = ID de la **versión ejecutada**: a1-a5 y el anidado h7), y TASK-7a lo exige. | Hecho medido: "`MoveAbort.location.package` es el ID de la versión ejecutada (V-5, TASK-1b): `errors.ts` acepta `packageId`, `originalPackageId` y todos los de `upgrades`, con un test por ID". |
| M-2 | 🟡 MINOR | H-14 (§1.2, línea 114) y fila V-15 (§13, línea 580) | Dicen "se rechaza antes de ejecutar" o "esperar el rechazo antes de ejecutar". H-h precisó que el rechazo es **estático** (ningún comando corre: h8 y h9, con un comando 0 que abortaría), pero la transacción **se secuencia** como `FailedTransaction`, con el gas cobrado y sin efectos. El handoff R.7 ya lo dice así; el plan no. | En H-14 y en V-15: "rechazo estático, previo a la ejecución de cualquier comando; la transacción queda `FailedTransaction` con el gas cobrado y sin efectos (V-15, H-h)". Marcar V-15 "resuelta en TASK-1b". |
| M-3 | 🟡 MINOR | §2.3 (regla de revisión) y §2.7 | (iii) del MID: `public(package)` permite que **cualquier** módulo del mismo paquete cree un `Duel<G>` con **su propio** witness (control `a1_control_own_witness`) y deposite en la House. El plan lo dice para `add_fees` ("solo `duel`" es regla de revisión), pero no para la API de la base. Además, la regla de §2.7 ("ninguna función `public` de un módulo **de juego** que reciba `&mut Duel<G>`") no nombra al propio `duel`. | En §2.3, una frase: "el witness impide forjar el de **otro** juego (V-14 a1/a2), no que un módulo nuevo del paquete cree `Duel<SuG>` con su propio witness: todo módulo nuevo que llame a la API `public(package)` de `duel` o a `add_fees` es superficie de revisión de fondos, con la misma confianza que el `UpgradeCap` (§3.2)". En §2.7: extender la regla a `duel` (ver §6). |
| M-4 | 🟡 MINOR | §11, paso 3 (dry run) | No dice qué hacer ante un error de compatibilidad **local**. | Agregar: "un error de compatibilidad local de la CLI (p. ej. `EUC01009`) o un dry run que falle por compatibilidad es **STOP**; **nunca** `--skip-verify-compatibility` (H-e)". Va al runbook de TASK-4, que el gate §G recibe en su ítem 7. |
| M-5 | 🟡 MINOR | §8.2, lobby | El mismo punto dice "**un solo** `ListEvents` … un cursor y una cota" y, en la parte nueva, "el pedido se parte en trozos si los supera" (10 literales). Con varios trozos hay varios cursores. | "Mientras el filtro tenga ≤ 10 literales, un solo pedido; si se parte, cada trozo lleva su cursor con la **misma** cota y la app fusiona los resultados por (checkpoint, transacción, índice del evento)". El test de TASK-7b (11 ⇒ 2 pedidos) tiene que cubrir esa fusión. |
| N-1 | ⚪ NIT | §13, filas V-5 y V-14 | Les falta "resuelta en TASK-1b" (V-15 ya entra por M-2). | Agregar la marca con el resultado en una frase: V-5 "ID de la versión ejecutada"; V-14 "(a)-(c) no compilan; un módulo del paquete sí puede usar su propio witness". |
| N-2 | ⚪ NIT | Encabezado (líneas 2 y 5) | "Pendiente: revisión de delta del MAYOR". | "Revisión de delta del MAYOR: APPROVE CON CAMBIOS, con M-1..M-5 y N-1..N-2 aplicados en la v1.3.2". |

**Sobre (iii) / M-3 como regla del plan:**
- Sí, tiene que ir al plan (§2.3), no solo al handoff.
- La propiedad que el witness garantiza es "nadie toca un `Duel<G>` ajeno". La que **no** garantiza es "solo los juegos aprobados mueven fondos": esa depende de la revisión de cada upgrade.
- La revisión de pre-upgrade (§G) se hace contra el plan, así que la regla tiene que estar escrita ahí.

## 6. H-h / V-15 y V-14 frente a INV-D1, INV-D5 y SEG-5 (pregunta 6): **se sostienen; el modelo de amenaza no cambia**

- **INV-D1/INV-D4:**
  - La garantía **principal** en el diseño de producción no es H-14, sino que `Collected` **nunca llega a un PTB**: `activate_atomic`, `collect` y `pay` son `public(package)` (no se pueden llamar desde un PTB) y se encadenan **dentro de una sola `entry`** del juego.
  - V-14 (b, c) confirma que `Collected` no se puede descartar, guardar ni transferir: solo `pay` lo consume, y `pay` exige el witness y que `duel_id` coincida (regla (iv)).
  - H-14 (V-15 h1/h8) es la **segunda** línea: protege si algún día una función `public` devolviera `Collected`.
  - El clique es por objeto (h3), lo que es correcto: otro `Duel` no comparte fondos.
- **INV-D5:** sin cambios. Para el coinflip sigue siendo estructural (el potato obliga a `pay` en la misma `entry`).
- **SEG-5:** sin cambios. Que el PTB fallido cobre gas y no tenga efectos (H-h) es lo esperado: el que intenta el ataque paga, y nada del estado de otros cambia. No abre ninguna vía de abortar-y-reintentar: el `Random` sigue en una `entry` no `public`, con el orden validar → cobrar → sortear → pagar.
- **El matiz que importa, para la revisión de TASK-2 (en curso).** Las dos líneas de defensa dependen de **visibilidades**, no del compilador. Para cerrar TASK-2, el MID verifica en la fuente (o con un `grep` en el gate):
  1. `cancel`, `reject`, `claim_timeout` y `refund_stalled` son `entry` **sin `public`**. Con `public entry`, H-14 no aplica.
  2. **Ninguna** función `public` de `duel` (ni de un juego) devuelve `Collected` ni recibe `&mut Duel<G>`. Las de la tabla de §2.5 que crean, mutan o cobran son `public(package)` con el witness por valor.
  3. `Collected` no tiene abilities.
  4. `#[allow(lint(public_random))]` no aparece en `sources/`.
  - Si alguno falla: 🟠 en la revisión del task, no del plan.

## 7. Sugerencias (no bloquean; para el handoff y los tasks)

- **S-1 (TASK-7b):** con el literal **prefijo** ("Todos" = `<def>::duel::DuelCreated` sin parámetros), el nodo devuelve **todas** las instanciaciones de `G`, también las de un juego futuro que la app todavía no registra (Battleship antes de su soporte en la app). El parser tiene que **ignorar** un `G` desconocido, no tomarlo como error ni como "partida rota". Hace falta un test con un `G` fuera del registro.
- **S-2 (TASK-4/7a):** la búsqueda en `typeOrigins` se hace por **(módulo, nombre)**, nunca solo por módulo. Hace falta un test con dos tipos del mismo módulo con `definingId` distintos (por el struct agregado en un upgrade posterior, §1).
- **S-3:** la medición de V-4 (10 literales, prefijo) se hizo en la localnet 1.84.0. Como dice el MID, se confirma en el smoke de testnet (TASK-9), contra el fullnode público (`sui-node 1.84.1`).

---

### §R-6 sobre esta revisión (`/usr/bin/grep -nE`)

- `[0-9a-fA-F]{40,64}`: 0.
- `0x[0-9a-fA-F]{8,}`: 0. Los paquetes van como `<PKG1>`..`<PKG5>`.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: 1. Es esta misma línea, que cita el patrón.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0.
- Sin direcciones de cuenta, sin rutas personales, sin nombres de otros proyectos del host y sin palabras de cierre con número.
