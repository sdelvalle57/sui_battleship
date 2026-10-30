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

## Task completado: HANDOFF_MONOREPO — TASK-2

> Reporte del DEV transcrito por el orquestador.

TASK-2 implementado; todas las verificaciones dan lo esperado. `npm install` exit 0, sin desviación de
`workspaces`. `package-lock.json` borrado (T3); no se creó `node_modules/`.

### Branch (con SHA corto del HEAD)
`feature/issue-2-monorepo` @ `f85a7e5` (TASK-1 en `f4b437c`). Todo en el working tree, sin stage ni commit.

### Archivos modificados/creados
- `?? package.json` (nuevo) · `?? .nvmrc` (nuevo: `26` + salto de línea)
- ` M .gitignore`: sección Node/Entorno/Varios bajo la sección Move.
- ` M agents.md`: líneas 40, 51-52 y 194. ` M documents/agentes/AGENTE_DEV.md`: línea 17. ` M documents/STATUS.md`: línea 28. ` M documents/ESTANDARES.md`: líneas 3 y 83.

### Qué se implementó (3 líneas máx)
1. Raíz como workspace npm (`private`, `workspaces: ["app"]`, sin `version`/`scripts`/`engines`/dependencias); Node 26 en `.nvmrc`.
2. `.gitignore` cubre `node_modules/`, `app/dist/`, `.env*` (excepto `!.env.example`), `*.log`, `.DS_Store`.
3. El número de Node vive solo en `.nvmrc`, PROY-17 y la fila medida de STATUS; el resto dice `nvm use`. ESTANDARES v1.2.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. Contracts: no aplica (`git diff --stat HEAD -- contracts` vacío). App: no existe (va el output de `npm install`). Tablas: no aplica.

**Verif. 1 — Node vía `.nvmrc`**
```
$ source ~/.nvm/nvm.sh && nvm use
Found '/home/santiago/Projects/Battleship/.nvmrc' with version <26>
Now using node v26.13.0 (npm v11.20.0)
$ node --version
v26.13.0
$ npm --version
11.20.0
```

**Verif. 2 — `npm install` y árbol**
```
$ npm install; echo "exit=$?"

up to date, audited 1 package in 266ms

found 0 vulnerabilities
exit=0
$ ls -a
.  ..  .git  .gitignore  .nvmrc  README.md  agents.md  contracts  documents  package-lock.json  package.json
$ rm package-lock.json
$ git status --porcelain --ignored
 M .gitignore
 M agents.md
 M documents/ESTANDARES.md
 M documents/STATUS.md
 M documents/agentes/AGENTE_DEV.md
?? .nvmrc
?? package.json
!! contracts/build/
$ test -e node_modules || test -e package-lock.json || echo ok
ok
```

**Verif. 3 — Ignorados**
```
$ git check-ignore -v node_modules/x app/dist/x app/.env app/.env.local .env.production foo.log .DS_Store
.gitignore:10:node_modules/	node_modules/x
.gitignore:11:app/dist/	app/dist/x
.gitignore:14:.env	app/.env
.gitignore:15:.env.*	app/.env.local
.gitignore:15:.env.*	.env.production
.gitignore:19:*.log	foo.log
.gitignore:20:.DS_Store	.DS_Store
$ git check-ignore app/.env.example; echo $?
1
```

**Verif. 4 — JSON válido**
```
$ python3 -I -m json.tool package.json
{
    "name": "sui-battleship",
    "private": true,
    "workspaces": [
        "app"
    ]
}
```

**Verif. 5 — Coherencia de Node (N5)**
```
$ git grep -nE "nvm use 2[0-9]|Node 2[0-9]|Usar 2[0-9]" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'
documents/ESTANDARES.md:83:- **PROY-17 — Toolchain.** Node 26 (`.nvmrc`) y npm workspaces desde la raíz; Sui CLI instalada con `suiup`, versión registrada en STATUS.
documents/STATUS.md:51:| H1 | toolchain | ✅ 2026-10-30: `suiup` 0.1.1 en `~/.local/bin`; **Sui CLI `1.83.0-16d2dc1e05ed`** (release `testnet`, default). Node 20/22/26 vía nvm. Registrado en Toolchain. | #1: fijar framework y registrar baseline con esta versión |
```
(Solo PROY-17 y el histórico de H1: lo esperado.)

**Extra — contracts intacto y SEG-3**
```
$ git diff --stat HEAD -- contracts
$ git diff HEAD | grep -E "^\+" | grep -ciE "recovery phrase|suiprivkey|mnemonic"
0
```
(Sin `+`, la única coincidencia es una línea de contexto preexistente de `agents.md` §11.) No se invocó `sui`; `~/.sui/` no se tocó.

**Diffs (líneas cambiadas)**
```
.gitignore  +# Node / app · node_modules/ · app/dist/ · # Entorno: nunca valores reales en el repo (SEG-3) · .env · .env.* · !.env.example · # Varios · *.log · .DS_Store
agents.md:40   -├── .nvmrc  # Node 22                 +├── .nvmrc  # versión de Node (PROY-17)
agents.md:51-52 -…; Node 22 (`.nvmrc`), npm. El `node` por defecto de la máquina es v26: correr `nvm use` …
               +…; Node (versión en `.nvmrc`, PROY-17), npm. El `node` por defecto de la máquina puede ser otro: correr `nvm use` …
agents.md:194  -| Node | nvm (20, 22 y 26 instalados) | Usar 22 |   +| … | Usar la de `.nvmrc` (`nvm use`) |
ESTANDARES:3   -Versión 1.1 …                        +Versión 1.2 … ; PROY-17: `.nvmrc` = 26 por D-20261030-10)
ESTANDARES:83  -PROY-17 … Node 22 (`.nvmrc`) …       +PROY-17 … Node 26 (`.nvmrc`) …
STATUS:28      -| Node | `v22.23.4` tras `nvm use 22` |  +| Node | `v26.13.0` tras `nvm use` (`.nvmrc` = 26, D-20261030-10) |
AGENTE_DEV:17  -… y Node 22 (`nvm use 22`).          +… y Node (`nvm use`, lee `.nvmrc`).
```

### Verificación manual
No aplica (§6 del handoff).

### Desviaciones del handoff (o "ninguna")
1. `package-lock.json` creado por `npm install` y borrado (T3, previsto).
2. Forma, `ESTANDARES.md:3`: texto del handoff en una sola línea para que PROY-17 siga en la 83 (verif. 5). Mismo texto.
3. Forma, `agents.md:51-52`: el salto de línea cae tras "versión en"; texto literal del handoff; el párrafo sigue en 51-52.

### Riesgos / pendientes (o "ninguno")
- `"workspaces": ["app"]` apunta a una carpeta inexistente hasta #9; npm 11.20.0 / Node 26 no da error ni aviso.
- `contracts/build/` ignorado en el working tree.
- Incluir `package.json` y `.nvmrc` (untracked) en el commit.

### Documentación
- Actualizados: `agents.md` 40/51-52/194; `AGENTE_DEV.md:17`; `ESTANDARES.md:3,83`; `STATUS.md:28`. Resto para TASK-3.

Commit propuesto por el handoff: `tooling: add npm workspaces root and .nvmrc with Node 26 (#2)`.

## Revisión TASK-2: PASA

> Revisión del MID transcrita por el orquestador.

Contraste propio (git y lectura, sin `sui`/`npm`): `package.json` exacto (sin `version`/`scripts`/`engines`/deps); `.nvmrc` = `26` + salto de línea; `.gitignore` con 13 líneas nuevas = §3.3, sección de TASK-1 intacta, 7 patrones ignorados y `app/.env.example` no ignorado; sin `package-lock.json` ni `node_modules/` (T3); docs editadas con el texto del handoff y diffs balanceados (4/4, 2/2, 1/1, 1/1), así que las líneas citadas por TASK-3 siguen valiendo; grep N5 = `ESTANDARES.md:83` y `STATUS.md:51` (un grep más amplio encuentra `agents.md:194` "nvm (20, 22 y 26 instalados)", descripción de lo instalado, correcto); `contracts/` intacto.

Checklist M4: alcance y HU (D3 / D-20261030-10) ✅ · PROY-17 Node 26, ESTANDARES v1.2 ✅ · SEG-3 (`.env*` ignorados salvo `.env.example`; 0 coincidencias en líneas agregadas; sin `sui` ni `~/.sui/`) ✅ · T3 declarado ✅ · Gates: contratos no aplican; `npm install` exit 0, 0 vulnerabilidades, Node v26.13.0 / npm 11.20.0 ✅ · 3 desviaciones de forma declaradas ✅ · PROY-20 ✅.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | Operativo (D-20261030-05) | `package.json`, `.nvmrc` | Untracked | `git add` en el commit (hecho) |
| 2 | Operativo (D-20261030-05) | `documents/REPORTES_MONOREPO.md` | Artefacto del ciclo modificado | Commit de docs aparte (hecho) |
| 3 | Informativo | `package.json` (`"workspaces": ["app"]`) | Apunta a `app/`, inexistente hasta #9; sin error ni aviso con npm 11.20.0 | Nada en #2; #9 crea `app/package.json` |

### Siguiente paso: TASK-3 autorizado
Sin ajustes al handoff (las líneas citadas siguen siendo correctas). Opcional: en la fila H13, PV medida = 140. El SHA anotado en TASK-3 puede ser el de TASK-2 o el commit de docs posterior; `contracts/` es el mismo.

### Mensaje de commit propuesto
`tooling: add npm workspaces root and .nvmrc with Node 26 (#2)` (commit `1c2d6b9`).

## Task completado: HANDOFF_MONOREPO — TASK-3

> Reporte del DEV transcrito por el orquestador.

TASK-3 listo: 3 gates verdes sobre `8325126` con los mismos conteos que TASK-1; docs con el layout
`contracts/` y el baseline nuevo. Verif. 2 y 3 dan lo esperado; la 4 da `1` en vez de `0` por una línea de
contexto preexistente de `agents.md` (con `-U0` da `0`). Ninguna condición de parada.

### Branch (con SHA corto del HEAD)
`feature/issue-2-monorepo` @ `8325126` (SHA del baseline; TASK-1 `f4b437c`, TASK-2 `1c2d6b9`). Cambios sin stage ni commit.

### Archivos modificados/creados
- `M agents.md` (§1, §2, §3, §7, §8, §9, §14)
- `M documents/STATUS.md` (roadmap filas 3 y 5; Toolchain Framework y Gates; 3 filas de baseline; H6, H7, H8, H9, H12; H13 nueva)
- `M documents/agentes/AGENTE_MAYOR.md` (§M2, 76-79) · `M documents/agentes/AGENTE_MID.md` (66) · `M documents/ESTANDARES.md` (7-8, en 2 líneas para que PROY-17 siga en la 83)
- Sin tocar: código, `contracts/**`, `package.json`, `.nvmrc`, `README.md`, `DECISIONES.md`, `REPORTES_MONOREPO.md`, secciones de STATUS del orquestador.

### Qué se implementó (3 líneas máx)
1. Gates re-medidos sobre `8325126`: verdes, mismos conteos que TASK-1, árbol limpio después.
2. STATUS: baseline verde con SHA, Toolchain corregida, roadmap y H6–H9/H12 actualizados, H13 con dueño (pre-vuelo de #8).
3. `agents.md`, prompts MAYOR/MID y `ESTANDARES.md:7` sin el layout viejo; rutas retiradas solo dentro de `git show f063a0e:`.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (0 tests). Tablas de contrato / `app/src/sui/`: no aplica.
```
$ git rev-parse --short HEAD
8325126
$ git diff --stat f4b437c HEAD -- contracts
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
$ printf 'n\n' | sui client active-env
testnet
```

**Verif. 1 — Gates desde `contracts/`** (íntegros, sin ANSI; crudos en `<scratch>/t3/`)
```
$ cd contracts
$ printf 'n\n' | sui move build -e testnet 2>&1 | tee <scratch>/t3/build.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ printf 'n\n' | sui move build -e testnet --lint 2>&1 | tee <scratch>/t3/lint.txt; echo "exit=${PIPESTATUS[1]}"
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
$ printf 'n\n' | sui move test -e testnet 2>&1 | tee <scratch>/t3/test.txt; echo "exit=${PIPESTATUS[1]}"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
Test result: OK. Total tests: 0; passed: 0; failed: 0
exit=0
$ cd ..
$ git status --porcelain
$
```
(`Move.lock` sin modificar: contingencia T1 no activada.)

| Gate | exit | Errores | Warnings `WC…` | Lints `WSL…` | Tests |
|---|---|---|---|---|---|
| build | 0 | 0 | 0 | — | — |
| build --lint | 0 | 0 | 0 | 1 × `WSL06010` en `contracts/sources/house.move:67` | — |
| test | 0 | 0 | 0 | — | 0 (OK) |

`grep -ciE 'recovery phrase|Generated new keypair|Updating dependencies'` = 0 en los 3 outputs.
```
$ curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}'
{"data":{"epoch":{"epochId":1269,"protocolConfigs":{"protocolVersion":140}}}}
PV=140
$ date -u
Fri Oct 30 10:25:36 PM UTC 2026
```

**Verif. 2 — Coherencia del layout (N2)**
```
$ git grep -nE "(^|[^/])sources/(House|Game|battleship|\*)|tests/battleship|hoy la raíz|hasta que se mergee" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'
agents.md:18:tipos se retiró del paquete en #2; se recupera con `git show f063a0e:sources/battleship.move` (#18).
agents.md:167:`Coordinate` del borrador 2025 (`git show f063a0e:sources/battleship.move`).
documents/STATUS.md:57:| H7 | game | … | → #5 (diseño 2025 retirado con el archivo; `git show f063a0e:sources/Game/game.move`) |
documents/STATUS.md:58:| H8 | legado | … | ✅ 2026-10-30 (#2): borrado (D-20261030-10); se recupera con `git show f063a0e:sources/battleship.move` (#18) |
documents/STATUS.md:59:| H9 | tests | … | 🚧 parcial (#2): el test comentado se retiró (`git show f063a0e:tests/battleship_tests.move`); suites en #4–#6 |
documents/agentes/AGENTE_MAYOR.md:77:`git show f063a0e:sources/House/README.md` y `…/Game/README.md`); si se consultan, son contexto, no contrato:
$ git grep -nE "…mismo patrón…" -- … | grep -v 'f063a0e:'
$
```

**Verif. 3 — Coherencia de Node**
```
$ git grep -nE "nvm use 2[0-9]|Node 2[0-9]|Usar 2[0-9]" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'
documents/ESTANDARES.md:83:- **PROY-17 — Toolchain.** Node 26 (`.nvmrc`) …
documents/STATUS.md:51:| H1 | toolchain | … Node 20/22/26 vía nvm. …
```

**Verif. 4 — SEG-3**
```
$ git diff HEAD | grep -ciE 'recovery phrase|suiprivkey|mnemonic'
1
$ git diff HEAD | grep -niE 'recovery phrase|suiprivkey|mnemonic'
62: - **Repo público:** nada de keystores (`~/.sui/sui_config/`), mnemonics ni direcciones privadas del owner
$ git diff -U0 HEAD | grep -ciE 'recovery phrase|suiprivkey|mnemonic'
0
```
(Línea de contexto preexistente de `agents.md` §7; ninguna línea agregada coincide.) Diff: 5 archivos, +32 −39 (`git diff 8325126` sobre el commit de TASK-3).

### Verificación manual
No aplica (solo lectura de la PV por GraphQL).

### Desviaciones del handoff (o "ninguna")
1. H8/H9: texto pedido en la columna Acción; la columna Hallazgo se reescribió sin la ruta vieja (regla: rutas viejas solo dentro de `git show f063a0e:`).
2. H6/H7: solo se reemplazó Acción; en H7 se pierde la guía anterior (sigue cubierta por PROY-6/PROY-8/SEG-4). H6 conserva `game.move:55-59` como dato histórico.
3. Forma: ref del baseline "contracts/ @ `8325126` (branch de #2 …; `master` tras el merge de #2, mismo código de contratos que `f4b437c`)"; `\|` escapado en H13; línea nueva de §3 entre líneas en blanco.
4. Verif. 4 da `1` (línea de contexto); con `-U0`, `0`.

### Riesgos / pendientes (o "ninguno")
- H13 abierto (pre-vuelo de #8): testnet PV 140, lock en piso de la 139; CLI soporta hasta 140.
- `contracts/build/` ignorado en el working tree.
- Tras el merge, el baseline cita el SHA de la branch (mismo código de contratos).

### Documentación
- Actualizados (PROY-20): ver "Archivos modificados/creados". STATUS: roadmap (15, 17), Toolchain (30, 32), baseline (38-40), H6 (56), H7 (57), H8 (58), H9 (59), H12 (62), H13 (63); "Cero delta …" conservada (44-45).

### Datos para el body del PR
Commits `f4b437c`, `1c2d6b9` y el de TASK-3 (`docs: record first green baseline and contracts/ layout (#2)`). Decisiones D-20261030-10 y D-08 ratificada. T1–T5 cumplidos. Antes (`e1849c6`): build 🔴 7 errores, ≥16 `WC09009`; test 🔴. Después (`8325126`): build 🟢 0/0; lint 🟢 1 `WSL06010` (H12 → #4); test 🟢 0 tests. Desviación de coverage aprobada (→ #4). H13 → #8. Legado recuperable con `git show f063a0e:…`. Fuera de alcance: #3, #4, #5, #7, #9, #16. `Closes #2`.

## Revisión TASK-3: PASA

> Revisión del MID transcrita por el orquestador.

Contraste (git y `gh` de lectura): diff limitado a los 5 archivos permitidos (`agents.md` +14 −23, `STATUS.md` +13 −12, `AGENTE_MAYOR.md` +2 −1, `AGENTE_MID.md` +1 −1, `ESTANDARES.md` +2 −2); rutas viejas solo dentro de `git show f063a0e:…` (quedan menciones correctas: layout objetivo `agents.md:36`, PROY-1/6/11, ejemplo de `ESTANDARES.md:5`, histórico `game.move:55-59` de H6); STATUS con baseline (38-40), Framework (30), Gates (32), roadmap (15, 17), H6–H9, H12 y H13 con dueño; PROY-17 sigue en la línea 83.

Checklist M4: alcance y HU ✅ · PROY-20 (todos los ítems de docs del issue) ✅ · Gates verdes sin delta vs TASK-1; `git status` vacío tras los gates (lock intacto, T1 no activada) ✅ · SEG-3: 0 en líneas agregadas; sin frase ni "Updating dependencies" ✅ · 4 desviaciones declaradas y justificadas ✅.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | Informativo | `documents/HANDOFF_MONOREPO.md:400` (TASK-3 §5.4) | `git diff HEAD \| grep -ci …` cuenta líneas de contexto (da 1 sin secretos) | En handoffs futuros usar `git diff -U0` o filtrar `^\+` |
| 2 | Operativo (STATUS) | `documents/STATUS.md:38` | Baseline con SHAs de la branch | Mergear con merge commit (D-20261030-09) |
| 3 | Operativo (D-20261030-05) | `documents/REPORTES_MONOREPO.md` | Artefacto del ciclo | Commit de docs aparte (hecho) |

### Siguiente paso: abrir el PR de #2 contra `master`
Smoke: no aplica (reestructura sin flujo ejecutable).

### Mensaje de commit propuesto
`docs: record first green baseline and contracts/ layout (#2)` (commit `059f1ce`).
