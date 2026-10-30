# Reportes del ciclo — #4 House

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador sin
> editar el contenido (el harness no deja escribir archivos de reporte a los subagentes).

## Task completado: HANDOFF_HOUSE — TASK-1

### Branch (con SHA corto del HEAD)
`feature/issue-4-house` @ `e1c7a3d` (sin commits nuevos; trabajo sin commitear en el working tree).

### Archivos modificados/creados
- `contracts/sources/house.move`: reescrito (240 líneas; `git diff --stat`: +191 / −55)
- `contracts/tests/house_tests.move`: creado (451 líneas, 26 tests)
- Sin tocar: `Move.toml`, `Move.lock`, `.gitignore`, `documents/`, `agents.md`, `README.md`.

### Qué se implementó (3 líneas máx)
`battleship::house` según §3 del handoff v1.1: House compartida creada en `init` (versión 1, fee 0, 0,001–50 SUI)
y `HouseCap` (`key` sin `store`) al publicador. 4 `entry` de admin con `&HouseCap`, `public withdraw_fees` que
devuelve `Coin<SUI>`, `public(package) add_fees`, accessors con chequeo de versión (`version()` sin chequeo),
5 eventos y abort codes 0–4. Helpers `#[test_only]`: `init_for_testing`, `set_version_for_testing` y un
constructor por evento. Ya no existen `ECallerNotHouse`, `EInsufficientBalance`, `initialize_house` ni `admin`;
ninguna función recibe `&TxContext` inmutable (H12 cerrado).

### Tests y gates (output pegado, por área tocada)
- **Agregados:** los 25 tests de §5 con los nombres exactos + `test_version_reads_house_with_wrong_version` (ver Desviaciones).
- **Comprobación de mutaciones** (copia en `<scratch>/issue4/mut`, no en el repo): (1) validar fee antes que versión en `update_fee_rate` → falla `test_update_fee_rate_rejects_wrong_version`; (2) quitar el chequeo de versión de `min_bet` → falla `test_min_bet_rejects_wrong_version`; (3) `migrate` con `!=` en vez de `<` → falla `test_migrate_rejects_house_newer_than_package`. Resultado: `Test result: FAILED. Total tests: 26; passed: 23; failed: 3`.

**Contracts** (desde la raíz; `sui client active-env` → `testnet`):
```
$ sui --version
sui 1.83.0-16d2dc1e05ed

$ (cd contracts && printf 'n\n' | sui move build -e testnet); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ (cd contracts && printf 'n\n' | sui move build -e testnet --lint); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
```
Build: 0 errores, 0 warnings. Lint: **0 lints** (delta −1 vs baseline: desaparece `WSL06010`, H12).

```
$ (cd contracts && printf 'n\n' | sui move test -e testnet); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[ PASS    ] battleship::house_tests::test_add_fees_accumulates_balance
[ PASS    ] battleship::house_tests::test_add_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fees_collected_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_init_sends_single_house_cap_to_publisher
[ PASS    ] battleship::house_tests::test_init_shares_exactly_one_house_with_defaults
[ PASS    ] battleship::house_tests::test_max_bet_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_migrate_bumps_version_and_emits_event
[ PASS    ] battleship::house_tests::test_migrate_rejects_current_version
[ PASS    ] battleship::house_tests::test_migrate_rejects_house_newer_than_package
[ PASS    ] battleship::house_tests::test_min_bet_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_transfer_house_cap_moves_cap_and_emits_event
[ PASS    ] battleship::house_tests::test_transferred_cap_lets_new_holder_administer
[ PASS    ] battleship::house_tests::test_update_bet_limits_accepts_equal_min_and_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_min_above_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
Test result: OK. Total tests: 26; passed: 26; failed: 0
exit=0
```
Tests: **26/26 PASS**, 0 warnings.

**Gancho de coverage** (informativo; el paso `--coverage` repite las mismas 26 líneas `[ PASS ]`):
```
$ (cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[... 26 líneas [ PASS ] idénticas a las del gate de test ...]
Test result: OK. Total tests: 26; passed: 26; failed: 0
+-------------------------+
| Move Coverage Summary   |
+-------------------------+
Module 0000000000000000000000000000000000000000000000000000000000000000::house
>>> % Module coverage: 100.00
+-------------------------+
| % Move Coverage: 100.00  |
+-------------------------+
exit=0

$ ls -A contracts
.coverage_map.mvcov
Move.lock
Move.toml
build
sources
tests
traces

$ git status --porcelain
 M contracts/sources/house.move
?? contracts/tests/

$ git status --porcelain --ignored contracts/
 M contracts/sources/house.move
?? contracts/tests/
!! contracts/.coverage_map.mvcov
!! contracts/build/
!! contracts/traces/
```
Artefactos de coverage: `contracts/.coverage_map.mvcov` y `contracts/traces/`, ignorados por `.coverage*` y
`contracts/traces/`; TASK-2 no necesita tocar `.gitignore`.

**Manifest y lock sin cambios:**
```
$ git diff --stat master -- contracts/Move.toml contracts/Move.lock
(sin output)
```

**Greps de §8:**
```
$ grep -n "ctx.sender()" contracts/sources/house.move
93:    transfer::transfer(HouseCap { id: object::new(ctx) }, ctx.sender());

$ grep -nE "ECallerNotHouse|EInsufficientBalance|initialize_house|admin:|fun admin|\.admin" contracts/sources/house.move
(sin output, exit=1)

$ grep -nE "fun [a-z_]+\(" contracts/sources/house.move
83:fun init(otw: HOUSE, ctx: &mut TxContext) {
98:entry fun update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16) {
108:entry fun update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64) {
125:entry fun transfer_house_cap(cap: HouseCap, recipient: address) {
132:entry fun migrate(house: &mut House, _: &HouseCap) {
141:public fun withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI> {
150:public(package) fun add_fees(house: &mut House, fees: Balance<SUI>) {
156:public fun fee_rate(house: &House): u16 {
162:public fun fees_collected(house: &House): u64 {
168:public fun min_bet(house: &House): u64 {
174:public fun max_bet(house: &House): u64 {
181:public fun version(house: &House): u64 {
186:fun assert_current_version(house: &House) {
191:public fun init_for_testing(ctx: &mut TxContext) {
196:public fun set_version_for_testing(house: &mut House, version: u64) {
201:public fun new_fee_rate_updated_for_testing(
210:public fun new_bet_limits_updated_for_testing(
221:public fun new_fees_withdrawn_for_testing(house_id: ID, amount: u64): FeesWithdrawn {
226:public fun new_house_cap_transferred_for_testing(
234:public fun new_house_migrated_for_testing(
```
`ctx.sender()` solo en `init`. Visibilidades `:83-186` = tabla de §3 (1:1); `:191-234` son los helpers `#[test_only]` previstos.

**Secretos:**
```
$ git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
481:+git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
482:+git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
611:+de `agents.md` y `documents/ESTANDARES.md` que nombran `keystore`/`recovery` a propósito (SEG-3, §7, §11),
1136:+git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
1137:+git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
1147:+- En TASK-2, las líneas de `agents.md` y `documents/ESTANDARES.md` que nombran `keystore`/`recovery` a
1200:+| 6 | 🟡 MINOR | SEG-3, verificación | … (fila de la revisión del plan que cita el patrón) |

$ git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
(sin output, exit=123 = sin matches)
```
Matches por archivo: `HANDOFF_HOUSE.md` 3 (481, 482, 611), `PLAN_HOUSE.md` 3 (1136, 1137, 1147),
`REVISION_PLAN_HOUSE.md` 1 (1200): los 7 son artefactos de proceso = **matches esperados** del handoff §8.
**0** en `contracts/` (`grep -inE` sobre `house.move` y `house_tests.move` → exit 1). Únicas direcciones en
código: literales de test `@0xA`, `@0xB`, `@0xC` (`house_tests.move:21-23`).

- App: no aplica. Tablas de `contracts/README.md` y `app/src/sui/`: no aplica en TASK-1 (README en TASK-2).

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica (§6: sin smoke en #4). Sin transacciones.

### Desviaciones del handoff (o "ninguna")
Ninguna toca firmas, structs, eventos, constantes ni abort codes. Detalles internos:
1. Un test extra (26 en vez de 25): `test_version_reads_house_with_wrong_version`, fija que `version()` no valida la versión (línea `> Decisión` de §3).
2. Helpers privados del módulo de test: `publish()` y `publish_with_fees(amount)` (LIM-5).
3. `add_fees` (`public(package)`) se llama directamente desde `battleship::house_tests`: compila; no hizo falta `add_fees_for_testing`.
4. Algunos tests verifican algo más en la misma línea: test 2 (NEW_ADMIN sin cap), test 11 (el `Coin` llega a `OTHER` con exactamente `fees_before`), test 13 (`ids_for_address<HouseCap>(NEW_ADMIN) == vector[cap_id]`), test 16 (límites `(0, 0)` con versión 2: versión primero).
5. Comentarios `///` en inglés, como el archivo original.
6. Procedimiento: `sui client active-env` corrido una vez sin el guard `printf 'n\n' |` (config existente; imprimió `testnet`). Todas las invocaciones de `sui move` con guard y `-e testnet`.

### Riesgos / pendientes (o "ninguno")
- Cabecera heredada `// Copyright (c) Your Project` en `house.move:1` (placeholder 2025), fuera de alcance; propone issue aparte.
- Copia de mutación en `<scratch>/issue4/mut` (fuera del repo, descartable).
- AuthZ denegada (SEG-2): cubierta por custodia del cap (tests 2, 13, 14), como prevé §5.

### Documentación
- READMEs / `agents.md`: no aplica en TASK-1 (TASK-2).
- Snippet para STATUS: build 🟢 0/0; `--lint` 🟢 0 lints (`WSL06010` cerrado, H12); test 🟢 26 PASS, coverage 100 % de `battleship::house`. H3, H4, H5, H12 ✅ (#4 TASK-1); H9 🚧 parcial (26 tests de House). Artefactos de coverage ya ignorados (sin cambios en `.gitignore`).

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador.

Revisión línea por línea de `contracts/sources/house.move` (240) y `contracts/tests/house_tests.move` (451) contra el handoff v1.1, el plan, ESTANDARES y D-20261030-11/-06.

- **Superficie on-chain = §3 (1:1):** abort codes 0–4 (`house.move:15-26`), `VERSION` 1, `MAX_FEE_BPS` 1000, fee 0, límites `1_000_000`/`50_000_000_000`, sin `10_000`; `House has key` (campos en orden), `HouseCap has key` sin `store`, `HOUSE has drop` (`:30-45`); 5 eventos `copy, drop` con campos exactos y `house_id` (`:48-80`); visibilidades = tabla (`:83-186`), sin `public entry`, `ctx.sender()` solo en `init` (`:93`), sin `&TxContext` inmutable (H12 cerrado).
- **Versión primero:** `:99→100`, `:109→110`, `:142→143`, `:151`; accessors `:157/163/169/175`; excepciones correctas (`version()`, `migrate` con `ENotUpgrade`, `transfer_house_cap`).
- **Conservación (SEG-4):** entrada solo por `add_fees` (`:152`), salida solo por `withdraw_fees` (`:144-146`); `House` sin `drop` ni borrado.
- **LIM:** sin imports sin uso, debug, TODO ni código comentado; 7 helpers `#[test_only]` usados.
- **Tests:** 25 de §5 con nombres exactos + test 26 justificado; eventos comparados por igualdad antes de `next_tx`; conservación en `Coin` y destinatario; orden de chequeos fijado (15, 16); `migrate` en ambos sentidos (19, 21); las 3 mutaciones caen. Gates: build 0 warnings, lint 0 (−1), 26/26 PASS, coverage 100 %, artefactos ignorados; `Move.toml`/`Move.lock`/`.gitignore` sin cambios. Secretos: 7 matches esperados en documentos de proceso, 0 en `contracts/`.

### Hallazgos
| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| 1 | 🔵 SUGGESTION | PROY-9 / §5 test 17 | `house_tests.move:316-329`; `house.move:142-143` | Con fees > 0 el test 17 no prueba que la versión vaya antes de `ENoFeesToWithdraw` (el orden en el código es correcto) | Opcional a futuro: test con House vacía y versión 2 → `EWrongVersion` |
| 2 | 🔵 SUGGESTION | LIM-7 | `house.move:190-240` | Helpers `#[test_only]` sin `///` | No se exige |
| 3 | 🟡 MINOR (fuera de alcance, usuario) | SEG-8 / PROY-20 | `house.move:1-2` | Cabecera heredada `// Copyright (c) Your Project` + SPDX Apache-2.0 sin `LICENSE` en el repo | No tocar en #4; pendiente del usuario a decidir antes de #5 (Apache-2.0 recomendada / otra / quitar), en un PR propio |

Desviaciones declaradas (6): internas y justificadas, ninguna toca §3.

### Siguiente paso: TASK-2 autorizado
Ajuste del handoff (v1.2): en TASK-2 §3, viñeta de STATUS, añadir a "Pendientes del usuario" la licencia del repo (decidir antes de #5). Baseline del cero delta de TASK-2: build 0, lint 0, **26** tests.

### Mensaje de commit propuesto
`contracts: rewrite House with HouseCap authZ, versioning and tests (#4)` (commit `040f3c0`).

## Task completado: HANDOFF_HOUSE — TASK-2

> Reporte del DEV transcrito por el orquestador. Los outputs que repiten literalmente los de TASK-1 se
> resumen con referencia; el resto va íntegro.

TASK-2 terminado, sin commitear. Gates idénticos a TASK-1 (build 0 warnings, lint 0, 26 PASS); el diff no toca código.

### Branch (con SHA corto del HEAD)
`feature/issue-4-house` @ `7917fa4` (TASK-1 en `040f3c0`). Sin commits.

### Archivos modificados/creados
- `contracts/README.md`: creado.
- `agents.md` (+35/−20) · `documents/ESTANDARES.md` (+7/−7; encabezado 1.2 → 1.3) · `documents/STATUS.md` (+17/−10).
- Sin tocar: `contracts/sources/`, `contracts/tests/`, `Move.toml`, `Move.lock`, `.gitignore`, `DECISIONES.md`, `REPORTES_HOUSE.md`, handoff, plan, cabecera de licencia.

### Qué se implementó (3 líneas máx)
`contracts/README.md` documenta `battleship::house` (objetos, constantes, funciones, eventos, abort codes) copiado de
`house.move` @ `040f3c0`, más los 12 puntos de §3. `agents.md` (§2, §6, §7, §8, §12, §13, §14), `ESTANDARES.md`
("Código legado", SEG-2, LIM-8, PROY-9, PROY-10) y `STATUS.md` (baseline `040f3c0`, H3/H4/H5/H12 ✅, H9 parcial, ciclo, 2 pendientes nuevos) alineados.

| Punto §3 | Dónde en `contracts/README.md` |
|---|---|
| 1 Gates | Remite a `agents.md` §3 |
| 2 Funciones | Firma, visibilidad, quién llama, aborts, evento; `version()` y `EWrongVersion` por accessor |
| 3 Eventos | Tabla |
| 4 Abort codes | Número, constante, condición, funciones |
| 5 AuthZ | Posesión del cap; sin `store`: sin "Send", congelar, compartir, envolver ni vender; custodia en tests |
| 6 Cap perdido | Enviado a un ID de objeto queda huérfano; nota SEG-9 para #14 |
| 7 Fee 0 | Paso obligatorio de #8 |
| 8 Retiro | Ejemplo `sui client ptb` (solo owner) |
| 9 Límites | Solo al crear la partida |
| 10 Versionado | Chequeo primero, `migrate`, `ENotUpgrade`, `transfer_house_cap` fuera |
| 11 Contención | Sección propia |
| 12 ID de la House | De `deployments/<red>.json` (#7) |

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (docs). `sui client active-env` → `testnet`.
```
$ git rev-parse --short HEAD
7917fa4
$ sui --version
sui 1.83.0-16d2dc1e05ed

$ (cd contracts && printf 'n\n' | sui move build -e testnet); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ (cd contracts && printf 'n\n' | sui move build -e testnet --lint); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ (cd contracts && printf 'n\n' | sui move test -e testnet); echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[... las mismas 26 líneas [ PASS ] de TASK-1, en el mismo orden ...]
Test result: OK. Total tests: 26; passed: 26; failed: 0
exit=0
```

**Diff y alcance**
```
$ git status --porcelain
 M agents.md
 M documents/ESTANDARES.md
 M documents/STATUS.md
?? contracts/README.md

$ git diff --stat
 agents.md               | 55 +++++++++++++++++++++++++++++++------------------
 documents/ESTANDARES.md | 14 ++++++-------
 documents/STATUS.md     | 27 +++++++++++++++---------
 3 files changed, 59 insertions(+), 37 deletions(-)

$ git diff --stat -- contracts/sources contracts/tests contracts/Move.toml contracts/Move.lock .gitignore documents/DECISIONES.md documents/REPORTES_HOUSE.md
(sin output)
```

**§7 — nombres viejos**
```
$ grep -nE "EInsufficientBalance|initialize_house|ECallerNotHouse" agents.md documents/ESTANDARES.md contracts/README.md
(sin output, exit=1)
```

**§7 — authZ por capability**
```
$ grep -nE "custodia del cap" agents.md documents/ESTANDARES.md
documents/ESTANDARES.md:29:- **SEG-2 — AuthZ en cada función.** ... con authZ por capability (`&HouseCap`) el caso denegado no se puede armar como transacción, y se cubre verificando la custodia del cap (dónde está antes y después de transferirlo, y que el nuevo titular administra).
documents/ESTANDARES.md:69:- **PROY-9 — Tests de contrato.** ... authZ denegada (con capability: verificando la custodia del cap, no con `expected_failure`; ver SEG-2) y conservación de fondos. ...
agents.md:221:      AuthZ por capability ⇒ el caso denegado se cubre verificando la custodia del cap, no con `expected_failure`.
```

**Contraste 1:1 de tablas vs `git show 040f3c0:contracts/sources/house.move`** (script)
```
---FIRMAS
OK  init(otw: HOUSE, ctx: &mut TxContext)
OK  update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16)
OK  update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64)
OK  transfer_house_cap(cap: HouseCap, recipient: address)
OK  migrate(house: &mut House, _: &HouseCap)
OK  withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI>
OK  add_fees(house: &mut House, fees: Balance<SUI>)
OK  fee_rate(house: &House): u16
OK  fees_collected(house: &House): u64
OK  min_bet(house: &House): u64
OK  max_bet(house: &House): u64
OK  version(house: &House): u64
FALTA assert_current_version(house: &House)
---ABORTS
OK  0 EFeeTooHigh
OK  1 EInvalidBetLimits
OK  2 ENoFeesToWithdraw
OK  3 EWrongVersion
OK  4 ENotUpgrade
---EVENTOS (campos)
OK  FeeRateUpdated: `house_id: ID`, `old_fee_rate: u16`, `new_fee_rate: u16`
OK  BetLimitsUpdated: `house_id: ID`, `old_min_bet: u64`, `old_max_bet: u64`, `new_min_bet: u64`, `new_max_bet: u64`
OK  FeesWithdrawn: `house_id: ID`, `amount: u64`
OK  HouseCapTransferred: `cap_id: ID`, `recipient: address`
OK  HouseMigrated: `house_id: ID`, `old_version: u64`, `new_version: u64`
---CONSTANTES
const VERSION: u64 = 1;
const MAX_FEE_BPS: u16 = 1000; // 10 %
const DEFAULT_FEE_BPS: u16 = 0;
const DEFAULT_MIN_BET: u64 = 1_000_000; // 0.001 SUI
const DEFAULT_MAX_BET: u64 = 50_000_000_000; // 50 SUI
```
(`assert_current_version` es el helper privado, fuera a propósito; constantes = tabla "Valores con los que nace la House".)

**Secretos**
```
$ git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
[15 matches; ver clasificación]
$ git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
(sin output, exit=123; incluye contracts/README.md)
```
Clasificación: `HANDOFF_HOUSE.md` 3, `PLAN_HOUSE.md` 3, `REPORTES_HOUSE.md` 8 (transcripción de los greps de
TASK-1), `REVISION_PLAN_HOUSE.md` 1 — todos artefactos de proceso que citan el patrón (esperados). 0 en
`agents.md`, `ESTANDARES.md`, `STATUS.md` y `contracts/README.md`.

- App: no aplica. Tablas de `contracts/README.md` sincronizadas con el código: sí.

### Verificación manual
No aplica (docs).

### Desviaciones del handoff (o "ninguna")
1. README más allá de los 12 puntos: tablas de objetos, de constantes (valores iniciales, útiles para #9/#14) y de rutas del paquete; `Publisher` en la fila de `init`.
2. `agents.md` §6: la nota de cabecera dice que las reglas de partidas siguen siendo propuesta "salvo lo ya decidido en D-20261030-06". La viñeta "Estados: `Pending → Active → Resolved`" queda como estaba aunque D-06 §1 la contradice: regla de Game, de #5.
3. `STATUS.md` más allá de lo pedido: roadmap "2. House module" ✅ y "5. Tests" 🚧; la fila de baseline de `master` queda como histórica ("anterior a #4"); la primera viñeta de Pendientes ya no cita "#4 D1".

### Riesgos / pendientes (o "ninguno")
- `agents.md` §6 "Estados" y §8 `battleship::game` siguen con el modelo previo a D-20261030-06 §1: los reescribe #5.
- Pendientes del usuario en STATUS: licencia (antes de #5) y fee post-publicación (#8).

### Documentación
- Actualizados: `contracts/README.md` (nuevo); `agents.md` §2/§6/§7/§8/§12/§13/§14; `ESTANDARES.md` v1.3; `STATUS.md`.
- Al mergear, el orquestador pasa la fila "#4 (House)" a ✅ con PR y SHA de merge.

### Datos para el body del PR
Título sugerido `House: HouseCap authZ, bet limits, add_fees, events, versioning and tests (#4)`. Commits `040f3c0`
(TASK-1) + docs del ciclo + TASK-2. Cierra H3, H4, H5, H12; H9 avanza (26 tests). Decisiones D-20261030-11 y -06 §5.
Gates @ `040f3c0`: build 0 · lint 0 (−1) · 26/26 · coverage 100 %. Post-merge owner: fee en #8; licencia antes de #5. `Closes #4`.

## Revisión TASK-2: NO PASA

> Revisión del MID transcrita por el orquestador.

Bien: código idéntico a `040f3c0`; diff fuera de `sources/`, `tests/`, `Move.*`, `.gitignore`, `DECISIONES.md` y handoff; tablas de `contracts/README.md` 1:1 con `house.move` (funciones `:42-53` ↔ `:83-183`, eventos `:65-69` ↔ `:48-80`, aborts `:78-82` ↔ `:15-19`, objetos/constantes `:24-36` ↔ `:21-45`); 12 puntos de §3 cubiertos; ESTANDARES v1.3 y STATUS correctos; `agents.md` §2/§7/§8 house/§12/§13/§14 correctos; gates cero delta; secretos solo en documentos de proceso.

### Hallazgos
| # | Sev. | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| 1 | 🟡 MINOR (requerido) | PROY-20; handoff TASK-2 §3; D-20261030-06 | `agents.md:121-125` (vs `:138-139`, `:142`, `:143-144`) | La nota de §6 lista "estados, quién cancela/resuelve" como abiertas, aunque D-06 §1/§4 las cerró; los bullets Coinflip (`Active` abandonada) y Cancelación (sin rechazo del invitado) también chocan con D-06 y no se declararon | Reemplazar solo la nota de `:121-125` por el texto literal de abajo |
| 2 | 🔵 SUGGESTION | ARQ-6 / PROY-15 | `contracts/README.md:61` | El tipo de los eventos conserva el ID del paquete **original** tras un upgrade | Precisar en #7 o #11 |
| 3 | 🔵 SUGGESTION | — | `contracts/README.md:149` | `object::id` es público, no "dentro del paquete" | Opcional: "(en Move, `object::id(house)`)" |
| 4 | 🔵 Nota | PROY-19 | `REPORTES_HOUSE.md` (gate de test de TASK-2) | Las 26 líneas `[ PASS ]` resumidas (conteo pegado) | Aceptado; en la re-entrega pegar el output íntegro |

**Texto esperado para el hallazgo 1** (reemplaza `agents.md:121-125`):

> **Reglas de la House confirmadas** por D-20261030-11 (#4; contrato en `contracts/README.md`). Las de partidas son **propuesta hasta los planes de #5 y #6**, salvo lo ya decidido en D-20261030-06, que **prevalece sobre los bullets de abajo**: aceptar resuelve el coinflip en la misma transacción (`Pending → Resolved | Cancelled`, sin estado `Active` persistente), sin expiración, el `Game` copia el `fee_rate` al crearse y el invitado puede rechazar (reembolso íntegro al creador, sin comisión). Siguen abiertas (Escrow absorbido en Game, base de la comisión…). Los bullets Estados, Cancelación y Coinflip, §8 `battleship::game`, §9 y PROY-7/8 se reescriben en #5 al aprobarse su plan.

Desviaciones declaradas (3): aceptadas (la 2 la completa el hallazgo 1).

### Siguiente paso: correcciones al DEV
El DEV aplica el hallazgo 1 (texto literal) y re-entrega: hunk de §6, 3 gates con output íntegro (cero delta: build 0, lint 0, 26) y los 2 greps de secretos. Re-revisión limitada a eso.

### Mensaje de commit propuesto (para cuando pase)
`docs: document House contract and align repo docs (#4)`.

## Re-entrega TASK-2 (hallazgo 1 del MID)

> Reporte del DEV transcrito por el orquestador.

- Nota de cabecera de `agents.md` §6 reemplazada por el texto literal del MID (blockquote y negritas conservados), con reemplazo exacto de una única coincidencia. Bullets de Game y resto del archivo sin cambios.
- Gates (output íntegro, `7917fa4`, `sui 1.83.0-16d2dc1e05ed`, `active-env` testnet): build exit 0 (0 warnings); `--lint` exit 0 (0 lints); test exit 0 con las 26 líneas `[ PASS ]` (mismas de TASK-1) y `Test result: OK. Total tests: 26; passed: 26; failed: 0`. Cero delta.
- `git diff --stat`: `agents.md` +37/−20 (antes +35/−20: la nota tiene 2 líneas más), `ESTANDARES.md` 14, `STATUS.md` 27, `REPORTES_HOUSE.md` (orquestador); `contracts/README.md` untracked.
- Secretos: `git diff -U0 master | grep '^\+' | grep -inE …` → 17 matches, todos en documentos del ciclo que citan el patrón (`HANDOFF_HOUSE` 3, `PLAN_HOUSE` 3, `REPORTES_HOUSE` 10, `REVISION_PLAN_HOUSE` 1); 0 en `agents.md`, `ESTANDARES.md`, `STATUS.md`, `contracts/README.md`. Untracked: sin matches (exit 123).
- Desviaciones: ninguna. Riesgos: sin cambios.

## Re-revisión TASK-2: PASA

> Revisión del MID transcrita por el orquestador.

La nota de `agents.md:121-127` coincide literalmente con el texto pedido y es el único cambio respecto de la entrega anterior (+35/−20 → +37/−20). Gates cero delta (build 0, lint 0, 26/26, output íntegro). Secretos: 17 matches, todos en documentos del ciclo; 0 en los archivos de TASK-2. Mensaje de commit y body del PR sin cambios.

### Mensaje de commit propuesto
`docs: document House contract and align repo docs (#4)` (commit `667c088`).
