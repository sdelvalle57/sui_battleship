# Reportes del ciclo — #1 Toolchain

> Reportes del DEV y revisiones del MID, una sección por task. Transcritos por el orquestador sin
> editar (el harness no deja escribir archivos a los subagentes; ORQUESTADOR.md "Paso de artefactos").

## Task completado: HANDOFF_TOOLCHAIN — TASK-1

Sin condiciones de parada. Build 🔴 solo por compilación de `sources/` (H6 + H8, esperado); framework
testnet pineado a `719fb2960ccfbf9f4d33041f8ea5146d30671696` (= piso de PV 139).

### Branch (con SHA corto del HEAD)
`feature/issue-1-toolchain` @ `1d59508` (cambios sin commitear; commitea el orquestador).

### Archivos modificados/creados
- `Move.toml` — reemplazado entero por el modelo del handoff (`edition = "2024"`, `[dependencies]` vacío).
- `.gitignore` — `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`.
- `Move.lock` — regenerado por la CLI (`sui move update-deps -e testnet`), sin edición a mano.
- Fuera del repo: `~/.sui/sui_config/client.yaml` creado con el bloque del paso 1, sin claves (D-20261030-07); `~/.move/` poblado por la CLI al descargar el framework.

### Qué se implementó (3 líneas máx)
Config de la CLI sin claves con `active_env: testnet`. `Move.toml` migrado al sistema de paquetes de la
CLI 1.83 (`std`/`sui` implícitas, sin `[addresses]`). `Move.lock` v4 pinea `sui`/`std` de `testnet` en
`719fb2960ccfbf9f4d33041f8ea5146d30671696` (= piso de PV 139).

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (sin código; handoff §5).
- Contracts: `sui 1.83.0-16d2dc1e05ed` / `sui move build -e testnet` exit=1: 7 errores de compilación de `sources/` (H6 + H8), 16 warnings `W09009`, 0 errores de manifest/resolución / `sui move test`: TASK-2.
- Tablas de contrato y `app/src/sui/`: no aplica.

**Paso 0**
```
$ git status -sb
## feature/issue-1-toolchain
$ git rev-parse --short HEAD
1d59508
$ test -d ~/.sui && echo existe || echo no-existe
no-existe
```
(`~/.move` tampoco existía.)

**Paso 1** — bloque pegado tal cual; guarda no disparada; rc=0. Contenido no reproducido (SEG-3).

**V1–V4 (post paso 1)**
```
$ printf 'n\n' | sui client active-env 2>&1 | tee $SCR/preflight.txt; echo "exit=${PIPESTATUS[1]}"
testnet
exit=0
--V2  (ls -A ~/.sui/sui_config/)
client.yaml
--V3
sui.keystore no existe
sui.aliases no existe
--V4  (grep -cE '^active_address: *~? *$' …/client.yaml)
1
```

**Paso 2**
```
$ sui --version
sui 1.83.0-16d2dc1e05ed
$ suiup --version
suiup 0.1.1
$ which sui
/home/santiago/.local/bin/sui
$ node --version   # tras nvm use 22
v22.23.4
```

**Paso 3**
```
$ curl -sI https://fullnode.testnet.sui.io:443 | head -1
HTTP/2 200
$ printf 'n\n' | RUST_LOG=warn sui move build -e testnet 2>&1 | tee $SCR/build1.txt; echo "exit=${PIPESTATUS[1]}"
```
`build1.txt` (ANSI quitado; output completo en el anexo al final de esta sección):
```
Downloading from https://github.com/MystenLabs/sui.git
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
warning[WC09009]: unused struct field  ./sources/battleship.move:8:5   The 'x' field of the 'Coordinate' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:9:5   The 'y' field of the 'Coordinate' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:20:5  The 'start' field of the 'Ship' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:21:5  The 'orientation' field of the 'Ship' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:22:5  The 'size' field of the 'Ship' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:23:5  The 'hits' field of the 'Ship' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:32:5  The 'ships' field of the 'Board' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:39:5  The 'board' field of the 'Player' type is unused
warning[WC09009]: unused struct field  ./sources/battleship.move:40:5  The 'moves' field of the 'Player' type is unused
error[EC06002]: use of unassigned variable
   ┌─ ./sources/battleship.move:62:23
60 │         player1: player1,          The value of 'player1' was previously moved here.
62 │         current_turn: player1.addr,   Invalid usage of previously moved variable 'player1'.
warning[WC09009]: unused struct field  ./sources/Game/game.move:23:5  The 'game' field of the 'TurnCap' type is unused
warning[WC09009]: unused struct field  ./sources/Game/game.move:33:5  The 'opponent' field of the 'GameRequest' type is unused
warning[WC09009]: unused struct field  ./sources/Game/game.move:34:5  The 'state' field …
warning[WC09009]: unused struct field  ./sources/Game/game.move:35:5  The 'timestamp' field …
warning[WC09009]: unused struct field  ./sources/Game/game.move:36:5  The 'escrow' field …
warning[WC09009]: unused struct field  ./sources/Game/game.move:37:5  The 'metadata' field …
warning[WC09009]: unused struct field  ./sources/Game/game.move:38:5  The 'turn' field …
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  (55-59: let game = GameRequest { id, initiator }) Missing argument for field 'escrow'
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  … 'metadata'
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  … 'opponent'
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  … 'state'
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  … 'timestamp'
error[EC04016]: too few arguments  ./sources/Game/game.move:55:16  … 'turn'
Failed to build Move modules: Compilation error.
exit=1
```
El build abortó antes de escribir el lock (`git diff --stat Move.lock` vacío) ⇒ fallback:
```
$ printf 'n\n' | RUST_LOG=warn sui move update-deps -e testnet 2>&1 | tee $SCR/update1.txt; echo "exit=${PIPESTATUS[1]}"
exit=0
$ git diff --stat Move.lock
 Move.lock | 34 ++++++++++++++++++----------------
```
(`update1.txt`: 0 líneas — sin warnings ni errores.)

**4.1 — Manifest/resolución/Falling back**
```
$ grep -ciE 'addresses|not found|active environment is not present|Could not determine the correct dependencies|Falling back|manifest|resolution|edition' build1.txt update1.txt
update1.txt:0
build1.txt:0
$ grep -nE ' WARN | ERROR ' build1.txt update1.txt
(sin resultados)
$ grep -oE 'error\[E[A-Z0-9]+\]' build1.txt | sort | uniq -c
      6 error[EC04016]
      1 error[EC06002]
```

| Archivo | Errores | Warnings |
|---|---|---|
| `sources/battleship.move` | 1 (`EC06002` `:62:23`, H8) | 9 |
| `sources/Game/game.move` | 6 (`EC04016` `:55:16`, H6, constructor `:55-59`) | 7 |
| `sources/House/house.move` | 0 | 0 |

`sources/Game/` sí entra en la compilación.

**4.2 — Edition:** `edition = "2024"` aceptada; sin fallback a `2024.beta`.

**4.3 — Diff de `Move.lock`:** cabecera `version = 3` → `version = 4`; solo se pinea el entorno
`testnet` (`[pinned.testnet.MoveStdlib]`, `[pinned.testnet.Sui]`, `[pinned.testnet.battleship]`).
`MoveStdlib` y `Sui`: `source = { git = "https://github.com/MystenLabs/sui.git", subdir = …, rev = "719fb2960ccfbf9f4d33041f8ea5146d30671696" }`.
Desaparece `rev = "framework/testnet"`.
```
$ grep -cE 'framework/testnet|rev = "[^"]{0,39}"$' Move.lock
0
$ grep -oE 'rev = "[^"]*"' Move.lock | awk '{print length($3)-2, $3}'
40 "719fb2960ccfbf9f4d33041f8ea5146d30671696"
40 "719fb2960ccfbf9f4d33041f8ea5146d30671696"
```

**4.4 — SHA del framework**
```
$ gh api repos/MystenLabs/sui/commits/$SHA --jq .sha
719fb2960ccfbf9f4d33041f8ea5146d30671696
$ gh api repos/MystenLabs/sui/compare/$SHA...testnet-v1.83.0 --jq .status
ahead
PV=139
$ jq '[keys[]|tonumber]|max' manifest.json
140
$ jq … git_revision (piso de PV)
719fb2960ccfbf9f4d33041f8ea5146d30671696
```
PV entero; 139 ≤ 140; SHA del lock = piso = referencia del MAYOR; red disponible; sin "Falling back".

**4.5 — Árbol**
```
$ git status --short
 M .gitignore
 M Move.lock
 M Move.toml
$ ls Published.toml Pub.*.toml
ls: cannot access 'Published.toml': No such file or directory
ls: cannot access 'Pub.*.toml': No such file or directory
$ git diff --stat
 .gitignore |  4 ++++
 Move.lock  | 34 ++++++++++++++++++----------------
 Move.toml  | 37 +++++--------------------------------
 3 files changed, 27 insertions(+), 48 deletions(-)
```
(No se creó `build/`.)

**4.6 — V1–V5 post-build/update-deps**
```
V1: testnet  exit=0
V2: client.yaml
V3: sui.keystore no existe / sui.aliases no existe
V4: 1
V5: preflight.txt:0  build1.txt:0  update1.txt:0
```
Extra: `grep -cE '0x[0-9a-fA-F]{6,}'` sobre los tres outputs = 0.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica (tooling; sin transacciones ni `sui start`).

### Desviaciones del handoff (o "ninguna")
1. El lock lo escribió el fallback `update-deps` del paso 3 (el build abortó por compilación sin escribirlo), previsto y a declarar por el handoff.
2. V3 con `else echo "$f no existe"` para que la ausencia quede en el output (cosmético).
3. `build1.txt` pegado sin códigos ANSI (cosmético).
4. Reporte devuelto como texto: el harness bloqueó la escritura de este archivo; lo transcribe el orquestador.

### Riesgos / pendientes (o "ninguno")
- El lock solo pinea `testnet`: un `-e mainnet` u otro entorno agregaría una sección `[pinned.<env>]` nueva (delta a declarar).
- Para el baseline de TASK-2: H6 está en `game.move:55-59` (docs y handoff citan `:54-62`); H8 confirmado en `battleship.move:62:23` (corregir la mención "H7" de `STATUS.md`). Los 16 warnings pueden no ser todos, porque el compilador se detiene antes de pases posteriores.

### Documentación
- READMEs / agents.md: no aplica en TASK-1 (TASK-2).
- Snippet para STATUS.md: va en TASK-2. Datos: SHA `719fb2960ccfbf9f4d33041f8ea5146d30671696`, PV 139 (2026-10-30), `edition = "2024"`, lock v4.

### SEG-3
Ningún prompt de creación de clave. Ninguna frase, clave, contenido de `client.yaml`/keystore ni
dirección en este reporte ni en el diff. Único comando `sui client`: `active-env`, con `printf 'n\n' |`.
Sin commits, pushes ni cambios de branch; sin tocar `sources/`, `tests/` ni `documents/`.

### Anexo — `build1.txt` completo (ANSI quitado)
```
Downloading from https://github.com/MystenLabs/sui.git
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
warning[WC09009]: unused struct field
  ┌─ ./sources/battleship.move:8:5
  │
8 │     x: u8,
  │     ^ The 'x' field of the 'Coordinate' type is unused
  │
  = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
  ┌─ ./sources/battleship.move:9:5
  │
9 │     y: u8,
  │     ^ The 'y' field of the 'Coordinate' type is unused
  │
  = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:20:5
   │
20 │     start: Coordinate,
   │     ^^^^^ The 'start' field of the 'Ship' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:21:5
   │
21 │     orientation: Orientation,
   │     ^^^^^^^^^^^ The 'orientation' field of the 'Ship' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:22:5
   │
22 │     size: u8,
   │     ^^^^ The 'size' field of the 'Ship' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:23:5
   │
23 │     hits: u8, // number of segments hit
   │     ^^^^ The 'hits' field of the 'Ship' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:32:5
   │
32 │     ships: vector<Ship>,
   │     ^^^^^ The 'ships' field of the 'Board' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:39:5
   │
39 │     board: Board,
   │     ^^^^^ The 'board' field of the 'Player' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/battleship.move:40:5
   │
40 │     moves: vector<Coordinate>,
   │     ^^^^^ The 'moves' field of the 'Player' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

error[EC06002]: use of unassigned variable
   ┌─ ./sources/battleship.move:62:23
   │
60 │         player1: player1,
   │                  -------
   │                  │
   │                  The value of 'player1' was previously moved here.
   │                  Suggestion: use 'copy player1' to avoid the move.
61 │         player2: player2,
62 │         current_turn: player1.addr,
   │                       ^^^^^^^^^^^^ Invalid usage of previously moved variable 'player1'.

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:23:5
   │
23 │     game: ID,
   │     ^^^^ The 'game' field of the 'TurnCap' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:33:5
   │
33 │     opponent: Option<address>, // Optional opponent for direct invitations.
   │     ^^^^^^^^ The 'opponent' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:34:5
   │
34 │     state: GameState,
   │     ^^^^^ The 'state' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:35:5
   │
35 │     timestamp: u64,
   │     ^^^^^^^^^ The 'timestamp' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:36:5
   │
36 │     escrow: u64, // Bet amount in SUI.
   │     ^^^^^^ The 'escrow' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:37:5
   │
37 │     metadata: vector<u8>, // Arbitrary metadata (e.g., game settings).
   │     ^^^^^^^^ The 'metadata' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

warning[WC09009]: unused struct field
   ┌─ ./sources/Game/game.move:38:5
   │
38 │     turn: u64, // Current turn number.
   │     ^^^^ The 'turn' field of the 'GameRequest' type is unused
   │
   = This warning can be suppressed with '#[allow(unused_field)]' applied to the 'module' or module member ('const', 'fun', or 'struct')

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'escrow' in 'battleship::game::GameRequest'

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'metadata' in 'battleship::game::GameRequest'

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'opponent' in 'battleship::game::GameRequest'

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'state' in 'battleship::game::GameRequest'

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'timestamp' in 'battleship::game::GameRequest'

error[EC04016]: too few arguments
   ┌─ ./sources/Game/game.move:55:16
   │  
55 │       let game = GameRequest {
   │ ╭────────────────^
56 │ │         id: object::new(ctx),
57 │ │         initiator: ctx.sender(),
58 │ │         
59 │ │     };
   │ ╰─────^ Missing argument for field 'turn' in 'battleship::game::GameRequest'

Failed to build Move modules: Compilation error.
```

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador.

Checklist M4: implementa lo pedido (solo `Move.toml`, `Move.lock`, `.gitignore` + `client.yaml` autorizado) ✅ · `Move.toml` = modelo, sin `Sui` git/`override`/`[addresses]`/`[dev-*]`, `edition = "2024"` aceptada (PROY-11, D1) ✅ · `Move.lock` v4 regenerado por la CLI (`update-deps -e testnet`, fallback previsto y declarado), `[pinned.testnet.{MoveStdlib,Sui,battleship}]`, `rev` = `719fb2960ccfbf9f4d33041f8ea5146d30671696` (40 chars), sin `framework/testnet`, verificación 4.4 completa (existe, `ahead` vs `testnet-v1.83.0`, PV 139 ≤ 140, SHA = piso = referencia del MAYOR), sin "Falling back" ✅ · `.gitignore` con las 5 entradas ✅ · SEG-3 / D-20261030-07: `active-env` testnet, solo `client.yaml`, sin keystore/aliases, `active_address: ~`, sin prompts, 0 direcciones `0x…`, guarda no disparada, único subcomando `active-env` ✅ · Gates: build exit=1 solo por compilación de `sources/` (6 × `EC04016` en `sources/Game/game.move:55:16` = H6; 1 × `EC06002` en `sources/battleship.move:62:23` = H8), rojo conocido ✅ · LIM-9: 16 `W09009` todos del legado sin tocar ✅ · Desviaciones: 4, declaradas y justificadas ✅ · Docs: no aplica (TASK-2) ✅.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

### Siguiente paso: TASK-2 autorizado
Tras el commit de TASK-1. Precisiones para TASK-2 (addendum del handoff v1.1):
1. H6 real: `sources/Game/game.move:55-59` (constructor de `GameRequest`, error en `:55:16`), no `:54-62`; corregir STATUS (fila H6 y baseline) y `agents.md` §7.
2. H8 real: `sources/battleship.move:62` (uso de `player1` movido en `:60`); `STATUS.md:25` "H6/H7" → "H6/H8".
3. Warnings como **mínimo**: "16 `W09009` (9 en `battleship.move`, 7 en `Game/game.move`, 0 en `House/house.move`), mínimo: la compilación aborta y pueden faltar pases". Si `--lint` no trae lints de Sui, el gate es "no medible hasta que compile", no 0.
4. Nota en Toolchain de STATUS: "`Move.lock` v4 solo pinea `testnet`; un gate con otro `-e` crearía `[pinned.<env>]` nuevo = delta del lock a declarar (PROY-11)".
5. El §0 del handoff cita `:54-62`/`:58-65`: queda como antecedente, sin corrección.

### Mensaje de commit propuesto
`contracts: migrate manifest to CLI 1.83 package system (#1)` (commit `b2e98e6`).

## Task completado: HANDOFF_TOOLCHAIN — TASK-2

> Reporte del DEV transcrito por el orquestador (devuelto como texto).

TASK-2 hecho: tres gates con `-e testnet`; `documents/STATUS.md`, `agents.md` y `documents/ESTANDARES.md`
actualizados. `Move.lock` intacto en todos los gates; ningún prompt de creación de clave. Nuevo frente a
TASK-1: `--lint` emite `WSL06010` en `sources/House/house.move:67`, así que ese gate se registra como
conteo **mínimo** y no como "no medible".

### Branch (con SHA corto del HEAD)
`feature/issue-1-toolchain` @ `b0fb54e` (árbol limpio al correr los gates; cambios de docs sin commitear).

### Archivos modificados/creados
- `documents/STATUS.md`: sección "Toolchain" nueva antes de "Baselines de gates"; tres filas del baseline; H1 ("Registrado en Toolchain"); H2 ✅; H6 → `:55-59`; H11 nuevo con notas #3/#7/#8; fila #1 en "Ciclo activo".
- `agents.md`: §2 fila Contratos; §3 (prerrequisito `client.yaml`, gates con `-e testnet`, nota `--warnings-are-errors`); §7 (líneas H6/H8, gotcha del framework fijado, gotcha del `client.yaml`, subcarpetas verificadas); §11 (fila Sui CLI y fila nueva `client.yaml`).
- `documents/ESTANDARES.md`: encabezado `1.1 · 2026-10-30` y PROY-11 con el texto aprobado, literal.
- `git diff --stat`: 3 archivos, +50 −22. Sin tocar `Move.toml`, `Move.lock`, `.gitignore`, `sources/`, `tests/`, `~/.sui/`, `DECISIONES.md` ni `REPORTES_TOOLCHAIN.md`.

### Qué se implementó (3 líneas máx)
Primer baseline real de build, lint y test con `-e testnet`, con ref, SHA y conteo por archivo. Toolchain
documentada en STATUS (CLI, `client.yaml` sin claves, framework `719fb29…` PV 139, entornos del lock, H11).
`agents.md` y PROY-11 alineados con el `Move.toml` de TASK-1.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno (handoff §5).
- Contracts: `sui 1.83.0-16d2dc1e05ed`; los tres gates exit 1 por compilación (H6 + H8), sin delta vs TASK-1; 0 tests.
- Tablas de contrato y `app/src/sui/`: no aplica.

**Preflight**
```
$ git status --short
(vacío)
$ git rev-parse --short HEAD
b0fb54e
$ printf 'n\n' | sui client active-env 2>&1; echo "exit=${PIPESTATUS[1]}"
testnet
exit=0
```

**Gates** (output a `$SCR/g{1,2,3}.txt`, ANSI quitado con `sed 's/\x1b\[[0-9;]*m//g'`)
```
$ printf 'n\n' | sui move build -e testnet 2>&1 | sed … > $SCR/g1.txt;        echo "g1 exit=${PIPESTATUS[1]}"
g1 exit=1
$ printf 'n\n' | sui move build -e testnet --lint 2>&1 | sed … > $SCR/g2.txt; echo "g2 exit=${PIPESTATUS[1]}"
g2 exit=1
$ printf 'n\n' | sui move test -e testnet 2>&1 | sed … > $SCR/g3.txt;         echo "g3 exit=${PIPESTATUS[1]}"
g3 exit=1
$ git diff --stat Move.lock
(vacío)
$ git status --short --ignored
(vacío: no hay build/)
$ grep -ciE 'recovery phrase|Generated new keypair' g1.txt g2.txt g3.txt
g2.txt:0
g3.txt:0
g1.txt:0
$ wc -l g1.txt g2.txt g3.txt
210 / 219 / 209
```

**g1.txt** (`sui move build -e testnet`): `diff g1.txt build1.clean.txt` → única diferencia, la línea
inicial `Downloading from https://github.com/MystenLabs/sui.git` de TASK-1 (caché `~/.move` ya poblada).
El resto es idéntico línea por línea al anexo `build1.txt` de TASK-1 en este archivo: 9 `WC09009` en
`battleship.move` (`:8,9,20,21,22,23,32,39,40`), `EC06002` en `battleship.move:62:23`, 7 `WC09009` en
`Game/game.move` (`:23,33-38`), 6 `EC04016` en `Game/game.move:55:16`, "Failed to build Move modules:
Compilation error.", exit=1.

**g2.txt** (`sui move build -e testnet --lint`) = g1 + un bloque (`diff g1.txt g2.txt`):
```
206a207,215
> warning[WSL06010]: prefer '&mut TxContext' over '&TxContext'
>    ┌─ ./sources/House/house.move:67:71
>    │
> 67 │ public fun update_fee_rate(house: &mut House, new_fee_rate: u16, ctx: &TxContext) {
>    │                                                                       ^^^^^^^^^^ 'public' functions should prefer '&mut TxContext' over '&TxContext' for better upgradability.
>    │
>    = When upgrading, the public function cannot be modified to take '&mut TxContext' instead of '&TxContext'. As such, it is recommended to consider using '&mut TxContext' to future-proof the function.
>    = This warning can be suppressed with '#[allow(lint(prefer_mut_tx_context))]' applied to the 'module' or module member ('const', 'fun', or 'struct')
>
exit=1
```

**g3.txt** (`sui move test -e testnet`) = g1 sin la línea final (`diff g1.txt g3.txt` → `210d209 < Failed to build Move modules: Compilation error.`). Sin "Running Move unit tests" ni "Test result": 0 tests. exit=1.

**Conteo por archivo**

| Archivo | g1 build | g2 build --lint | g3 test |
|---|---|---|---|
| `sources/battleship.move` | 1 `EC06002` (`:62`, H8) + 9 `WC09009` | igual | igual |
| `sources/Game/game.move` | 6 `EC04016` (`:55-59`, H6) + 7 `WC09009` | igual | igual |
| `sources/House/house.move` | 0 | 1 `WSL06010` (`:67`) | 0 |
| `tests/battleship_tests.move` | 0 (entero dentro de `/* */`) | 0 | 0, sin tests |

`sources/Game/` y `sources/House/` se compilan (hay diagnósticos de ambas). El compilador aborta tras el
tipado: los 16 `WC09009` y el lint son **mínimos**.

**Comprobaciones de la CLI para las notas de docs**
```
$ printf 'n\n' | sui move build --help | grep -n 'warnings-are-errors\|--lint\|json-errors'
41:      --warnings-are-errors
43:      --json-errors
47:      --lint
$ printf 'n\n' | sui move test --help | grep -n 'warnings-are-errors\|--coverage'
29:      --coverage
53:      --warnings-are-errors
$ printf 'n\n' | sui move coverage summary --help | grep -n -- '-e,'
44:  -e, --build-env <ENVIRONMENT>
```

**Verificaciones finales**
```
$ git diff --stat Move.lock Move.toml .gitignore sources tests
(vacío)
$ git diff | grep -E '^\+' | grep -ciE '0x[0-9a-f]{6,}|recovery phrase|mnemonic|suiprivkey|BEGIN .*KEY'
0
```

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica (sin transacciones ni `sui start`).

### Desviaciones del handoff (o "ninguna")
1. Output con `| sed (quitar ANSI) >` en vez de `| tee`; exit con `${PIPESTATUS[1]}`. g2/g3 como diff exacto contra g1; g1 resumido con referencia al `build1` íntegro de TASK-1. Sin `--json-errors`.
2. Lint registrado como "1, mínimo" y no "no medible": el Addendum §3 solo pide "no medible" si `--lint` no trae lints de Sui, y trae `WSL06010`.
3. En STATUS se usa `WC09009` (código que imprime el compilador); el addendum dice `W09009`.
4. Fuera de la lista literal, en `agents.md` §7: gotcha de `battleship.move` "probablemente tampoco compila" → "tampoco compila (`battleship.move:62`)"; subcarpetas "por verificar" → "se compilan"; tabla de §3 con coverage `-e testnet` también en `sui move coverage summary`. Hechos verificados por este baseline.
5. Fila "Gates" de "Toolchain" en STATUS sin el carácter `|` (rompe la tabla); el comando literal está en `agents.md` §3.

### Riesgos / pendientes (o "ninguno")
- Lint en código vivo: `WSL06010` en `house.move:67` (`update_fee_rate` es `public` y recibe `&TxContext`) afecta compatibilidad de upgrade (PROY-10). Propuesto para el alcance de #4 o como hallazgo nuevo; no se convirtió en H porque el handoff no lo pide.
- Baseline medido en `b0fb54e`; el código de contratos es idéntico al de `b2e98e6` (los commits posteriores solo tocan docs).

### Documentación
- READMEs / agents.md actualizados: sí (`agents.md` §2/§3/§7/§11; `ESTANDARES.md` PROY-11 y v1.1).
- Snippet de STATUS: ya forma parte del diff (Toolchain, baseline, H2 ✅, H11, fila #1). P-3 sigue cerrado, sin duplicar.

### SEG-3
`git diff` sin frases, claves, contenido de `client.yaml`/keystore ni direcciones (grep = 0); solo SHAs de
git/framework y la versión de protocolo. Sin prompt de creación de clave. Comandos usados: `sui client
active-env`, `sui move build`, `sui move test`, `sui move coverage summary --help` y las ayudas de build y
test, todos con `printf 'n\n' |`. Sin commits, pushes ni cambios de branch.

## Revisión TASK-2: PASA

> Revisión del MID transcrita por el orquestador.

Checklist M4: implementa lo pedido con el Addendum (STATUS: Toolchain, 3 filas de baseline con ref `b0fb54e` y conteo por archivo, H1, H2 ✅, H6 `:55-59`, H8 `:62`, H7 fuera del baseline, H11, P-3 sin duplicar; `agents.md` §2/§3/§7/§11; `ESTANDARES.md` v1.1 con PROY-11 literal) ✅ · Gates con `-e testnet`, exit 1 solo por H6/H8, sin delta vs TASK-1; `Move.lock` intacto; sin `build/` ✅ · LIM-9/PROY-19: errores y warnings como mínimos; `WC09009` es el código correcto; lint "1, mínimo" justificado ✅ · SEG-3: grep = 0, sin prompts, solo `active-env`, todo con `printf 'n\n' |` ✅ · 5 desviaciones declaradas y justificadas ✅ · Los 8 criterios del issue #1 se cumplen con TASK-1 (`b2e98e6`) + TASK-2 ✅.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | 🔵 PROY-20 | `documents/STATUS.md` (fila "#1 (toolchain)"; "Pendientes del usuario") | "TASK-2 en revisión" queda desactualizado al commitear; falta el merge del PR de #1 y su orden respecto de #19 | Commit de docs del orquestador; no vuelve al DEV |
| 2 | 🔵 — | `agents.md` §3 (prerrequisito de `sui move`) | El guard `printf 'n\n' \|` pasa a regla permanente | Ninguna (inocuo con la config sin claves) |

**Riesgo `WSL06010` (`sources/House/house.move:67`):** fuera de #1 (no toca código). Se registra como **H12**
en STATUS y se traza en #4, que reescribe `update_fee_rate` con `&HouseCap` (H3): quitar `ctx` si deja de
usarse o recibirlo `&mut`; criterio `sui move build -e testnet --lint` sin lints en `house.move`. Resolver
antes de la primera publicación (#8, PROY-10).

### Siguiente paso: ciclo de #1 completo
Sin tasks pendientes; smoke no aplica. Commit de TASK-2, commit de docs (H12 y estado), push, PR contra
`master`, revisión de integración del MAYOR y merge del usuario después de #19.

### Mensaje de commit propuesto
`docs: record toolchain and first gate baseline (#1)` (commit `edb64ef`).
