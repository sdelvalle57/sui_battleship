# Reportes del ciclo — #2 Monorepo

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador sin
> editar el contenido (el harness no deja escribir archivos de reporte a los subagentes).

## Task completado: HANDOFF_MONOREPO — TASK-1

El paquete compila y testea desde `contracts/`: los 4 gates dan exit 0; único diagnóstico, el lint
`WSL06010` ya conocido en `house.move:67`; `Move.lock` idéntico byte a byte; ninguna condición de parada.

### Branch (con SHA corto del HEAD)
`feature/issue-2-monorepo` @ `36a1ae9`. Cambios en el working tree, sin commitear (`git mv`/`git rm` staged; `.gitignore` modificado sin stage).

### Archivos modificados/creados
- `R  Move.lock -> contracts/Move.lock` (100 %)
- `R  Move.toml -> contracts/Move.toml` (100 %)
- `R  sources/House/house.move -> contracts/sources/house.move` (100 %)
- `D  sources/Game/game.move`, `D  sources/battleship.move`, `D  sources/House/README.md`, `D  sources/Game/README.md`, `D  tests/battleship_tests.move`
- ` M .gitignore`: reemplazado por la sección Move del handoff §3.3.

`sources/` y `tests/` ya no existen (`find … -empty -delete`, N1). No se crearon `contracts/tests/` ni `contracts/deployments/`. No se tocó `documents/`.

### Qué se implementó (3 líneas máx)
1. Paquete Move movido a `contracts/` con layout plano, sin cambiar contenido.
2. Borrados el legado y los stubs que no compilaban (D1, D2).
3. `.gitignore` con patrones anclados a `contracts/` (T2); primer verde de los 3 gates.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (0 tests es el estado correcto hasta #4).

Precondición (§3.1):
```
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ printf 'n\n' | sui client active-env; echo "exit=${PIPESTATUS[1]}"
testnet
exit=0
```

**Verif. 1 — Layout**
```
$ git ls-files | grep -v ^documents/
.gitignore
README.md
agents.md
contracts/Move.lock
contracts/Move.toml
contracts/sources/house.move
$ test -e sources || test -e tests || echo ok
ok
```

**Verif. 2 — Rename puro**
```
$ git diff -M --stat master
 .gitignore                                      |   6 +-
 Move.lock => contracts/Move.lock                |   0
 Move.toml => contracts/Move.toml                |   0
 {sources/House => contracts/sources}/house.move |   0
 documents/DECISIONES.md                         |   8 +-
 documents/HANDOFF_MONOREPO.md                   | 421 ++++++++++++++++++++
 documents/PLAN_MONOREPO.md                      | 498 ++++++++++++++++++++++++
 documents/REVISION_PLAN_MONOREPO.md             | 173 ++++++++
 documents/STATUS.md                             |   1 -
 sources/Game/README.md                          | 105 -----
 sources/Game/game.move                          |  62 ---
 sources/House/README.md                         |  48 ---
 sources/battleship.move                         |  66 ----
 tests/battleship_tests.move                     |  18 -
 14 files changed, 1103 insertions(+), 303 deletions(-)
$ git diff -M --summary master | grep rename
 rename Move.lock => contracts/Move.lock (100%)
 rename Move.toml => contracts/Move.toml (100%)
 rename {sources/House => contracts/sources}/house.move (100%)
```
(Las líneas de `documents/` son commits de docs del ciclo ya en la branch, no de este task.)
```
$ cmp <(git show master:Move.toml) contracts/Move.toml && echo "Move.toml identico"
Move.toml identico
$ cmp <(git show master:Move.lock) contracts/Move.lock && echo "Move.lock identico"
Move.lock identico
$ cmp <(git show master:sources/House/house.move) contracts/sources/house.move && echo "house.move identico"
house.move identico
```

**Verif. 3 — Gates, desde `contracts/`** (íntegros, sin ANSI)
```
$ cd contracts
$ printf 'n\n' | sui move build -e testnet 2>&1 | tee <scratch>/build.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ printf 'n\n' | sui move build -e testnet --lint 2>&1 | tee <scratch>/lint.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
warning[WSL06010]: prefer '&mut TxContext' over '&TxContext'
   ┌─ ./sources/house.move:67:71
   │
67 │ public fun update_fee_rate(house: &mut House, new_fee_rate: u16, ctx: &TxContext) {
   │                                                                       ^^^^^^^^^^ 'public' functions should prefer '&mut TxContext' over '&TxContext' for better upgradability.
   │
   = When upgrading, the public function cannot be modified to take '&mut TxContext' instead of '&TxContext'. As such, it is recommended to consider using '&mut TxContext' to future-proof the function.
   = This warning can be suppressed with '#[allow(lint(prefer_mut_tx_context))]' applied to the 'module' or module member ('const', 'fun', or 'struct')

Please report feedback on the linter warnings at https://forums.sui.io

exit=0

$ printf 'n\n' | sui move test -e testnet 2>&1 | tee <scratch>/test.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
Test result: OK. Total tests: 0; passed: 0; failed: 0
exit=0

$ printf 'n\n' | sui move test -e testnet --coverage 2>&1 | tee <scratch>/cov.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
Test result: OK. Total tests: 0; passed: 0; failed: 0
exit=0
```

| Gate | exit | Errores | Warnings `WC…` | Lints `WSL…` | Tests |
|---|---|---|---|---|---|
| build | 0 | 0 | 0 | — | — |
| build --lint | 0 | 0 | 0 | 1 × `WSL06010` en `contracts/sources/house.move:67` (H12) | — |
| test | 0 | 0 | 0 | — | 0 (OK) |
| test --coverage | 0 | 0 | 0 | — | 0 (OK) |

Coincide con el pronóstico del §0 del handoff. El lint se registra y no se arregla (#4).
- App: no aplica (no existe). Tablas de contrato y `app/src/sui/`: no aplica.

**Verif. 4 — Lock sin delta y PV para H13**
```
$ cmp <(git show master:Move.lock) contracts/Move.lock && echo identico
identico
$ grep -c "Updating dependencies" <scratch>/build.txt
0
  (lint.txt, test.txt, cov.txt: también 0)
PV=140
MAX=140
05ad86a3e86c522deea116f80dc2bf2309a53363
```
Sin "CLI desactualizada" (140 ≤ 140). Referencia: `jq -r '."139".git_revision' manifest.json` = `719fb2960ccfbf9f4d33041f8ea5146d30671696` (pin actual). Contingencia de T1 no activada.

**Verif. 5 — Ignorados**
```
$ git status --porcelain --ignored
 M .gitignore
R  Move.lock -> contracts/Move.lock
R  Move.toml -> contracts/Move.toml
R  sources/House/house.move -> contracts/sources/house.move
D  sources/Game/README.md
D  sources/Game/game.move
D  sources/House/README.md
D  sources/battleship.move
D  tests/battleship_tests.move
!! contracts/build/
$ git check-ignore -v contracts/build/x contracts/traces/x contracts/.coverage_map.mvcov contracts/Pub.testnet.toml contracts/deployments/localnet.json
.gitignore:2:contracts/build/	contracts/build/x
.gitignore:3:contracts/traces/	contracts/traces/x
.gitignore:5:.coverage*	contracts/.coverage_map.mvcov
.gitignore:6:Pub.*.toml	contracts/Pub.testnet.toml
.gitignore:7:contracts/deployments/localnet.json	contracts/deployments/localnet.json
$ git check-ignore contracts/Published.toml contracts/deployments/testnet.json; echo $?
1
```
Con 0 tests, `--coverage` no creó `contracts/traces/` ni `contracts/.coverage_map.mvcov`.
```
-build/*
-traces/*
+# Paquete Move (contracts/) — plantilla de `sui move new` 1.83 adaptada al monorepo
+contracts/build/
+contracts/traces/
 .trace
 .coverage*
 Pub.*.toml
+contracts/deployments/localnet.json
```

**Verif. 6 — SEG-3**
```
$ grep -ciE 'recovery phrase|Generated new keypair' <scratch>/*.txt
lint.txt:0
test.txt:0
build.txt:0
cov.txt:0
$ ls -a contracts/
.
..
Move.lock
Move.toml
build
sources
```
Sin `Published.toml` ni `Pub.*.toml`; sin prompt de clave; de `sui client` solo `active-env`; `client.yaml` no leído ni modificado.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica (§6 del handoff). Única consulta a testnet: lectura de la PV por GraphQL.

### Desviaciones del handoff (o "ninguna")
1. Coverage (desviación ya aprobada en §2 del handoff): con 0 tests, `--coverage` da exit 0 pero no escribe artefactos (`move-cli/src/base/test.rs:253` @ `testnet-v1.83.0`); patrones verificados con `git check-ignore`; la comprobación real queda para #4 (gancho comentado en el issue).
2. Outputs pegados sin códigos ANSI; crudos en `<scratch>/*.txt`.

### Riesgos / pendientes (o "ninguno")
- H13 abierto: testnet en PV 140 (`05ad86a…`), lock en el piso de la 139 (`719fb29…`); CLI 1.83.0 soporta hasta 140. Repin en el pre-vuelo de #8.
- `contracts/build/` en el working tree, ignorado.
- `.gitignore` sin stage: incluirlo en el commit.

### Documentación
- READMEs / agents.md: no aplica en TASK-1 (TASK-2/TASK-3).
- Snippet para STATUS (TASK-3, con el SHA del commit): build 🟢 0/0; `--lint` 🟢 con 1 `WSL06010` en `contracts/sources/house.move:67` (H12, #4); test 🟢 0 tests. H13: PV medida 140 (2026-10-30), máx. CLI 140, lock sin delta.

Commit propuesto por el handoff: `contracts: move package to contracts/ and retire legacy code (#2)`.

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador.

Comprobación propia (git de solo lectura): 3 `rename … (100%)` + 5 `delete mode`; `cmp` idéntico contra `master` en los 3 archivos (PROY-11, D4, T1); `git ls-files` con los 6 archivos esperados; sin `sources/`/`tests/` (N1); `.gitignore` = §3.3 byte a byte, `check-ignore` correcto (líneas 2/3/5/6/7; `Published.toml` y `deployments/testnet.json` no ignorados).

Checklist M4: alcance y HU ✅ · PROY-1/PROY-11 (layout plano, lock sin delta) ✅ · SEG-3 (0 coincidencias, sin `Published.toml`/`Pub.*.toml`, solo `active-env`) ✅ · LIM-9 (0 `WC…`; único lint `WSL06010` en `contracts/sources/house.move:67`, H12 → #4) ✅ · Gates 4 × exit 0 = pronóstico del §0 ✅ · Desviación de coverage declarada (aprobada) ✅ · H13: PV 140 = máx. CLI, contingencia T1 no activada ✅ · PROY-20: docs en TASK-3 por diseño ✅.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | Informativo (FLUJO §5) | `documents/REPORTES_MONOREPO.md`, Verif. 4 | Del bloque PV/manifest solo se pegaron resultados; conteos de "Updating dependencies" resumidos | No bloquea; en TASK-3 pegar comando + output completos |
| 2 | Operativo (D-20261030-05) | `.gitignore` | Modificado sin stage | Orquestador lo agrega al commit (hecho) |
| 3 | Operativo (D-20261030-05) | `documents/REPORTES_MONOREPO.md` | Untracked | Commit de docs aparte (hecho) |

### Siguiente paso: TASK-2 autorizado
Sin ajustes obligatorios al handoff. Opcionales: en TASK-3 la fila H13 puede fijar PV = 140 (medida 2026-10-30 en TASK-1); los números de línea de `agents.md` citados en TASK-3 pueden correrse tras TASK-2: ubicar los pasajes por contenido (el `git grep` N2 cubre el riesgo).

### Mensaje de commit propuesto
`contracts: move package to contracts/ and retire legacy code (#2)` (commit `f4b437c`).
