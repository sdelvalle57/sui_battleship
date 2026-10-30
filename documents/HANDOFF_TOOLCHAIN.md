# HANDOFF_TOOLCHAIN
> Plan: PLAN_TOOLCHAIN v3 (aprobado, `117aa91`) | Issue: #1 | Branch: `feature/issue-1-toolchain` | Versión: v1.1 | Fecha: 2026-10-30
> v1.1: "Addendum TASK-2" al inicio de TASK-2 (líneas reales de H6/H8, warnings como mínimo, entornos del lock) — de la revisión MID de TASK-1.
> Autor: MID · Tasks: TASK-1 (contracts) → TASK-2 (docs + gates). Un task por sesión; TASK-2 arranca
> solo cuando TASK-1 tiene revisión MID PASA y el orquestador lo commiteó.

## Reglas de este ciclo (léelas antes de cualquier comando)

1. **SEG-3, sin excepciones:** ninguna recovery phrase, clave privada, contenido de keystore, contenido de
   `client.yaml` ni dirección (`0x…` de cuentas) en el reporte, en archivos del repo ni en logs que
   pegues. Los únicos hashes que se pegan son SHAs de git y la versión de protocolo.
2. **Nada de `sui client` interactivo.** No corras `sui client` a secas, `sui client new-address`,
   `sui client addresses`, `sui client switch`, `sui keytool …` ni `sui start`. El único subcomando de
   cliente permitido es `sui client active-env` (solo lee el alias del entorno).
3. **Defensa contra la creación de claves:** **toda** invocación de `sui client`/`sui move` va precedida
   de `printf 'n\n' |`. Si el `client.yaml` faltara, la CLI aborta ("No config found, aborting") en vez
   de generar una clave (`crates/sui/src/sui_commands.rs:1644-1646` @ `testnet-v1.83.0`). Si alguna
   vez ves `Generated new keypair` o `secret recovery phrase` en una salida: **para**, no pegues esa
   salida en ningún lado, borra el archivo donde la hayas guardado y reporta solo "apareció el prompt de
   creación de clave" al MID.
4. **Gates siempre con `-e testnet`.**
5. **Sin commits ni pushes** (los hace el orquestador tras la revisión del MID, D-20261030-05).
6. **Archivos temporales** (salidas de comandos) en tu scratchpad de sesión, fuera del repo. En este
   handoff: `export SCR=<tu scratchpad>` y se usa `$SCR/...`.
7. Shell: desde la raíz del repo, `source ~/.nvm/nvm.sh && nvm use 22` en la misma shell donde corres
   todo (bash: `${PIPESTATUS[1]}` da el exit code de `sui` en `printf | sui | tee`).

## 0. Baseline de gates verificado

**No existe todavía un baseline verificado: producirlo es el objeto de este issue (TASK-2).**

| Ítem | Estado al 2026-10-30, `feature/issue-1-toolchain` @ `117aa91` |
|---|---|
| CLI | `sui 1.83.0-16d2dc1e05ed` (release testnet), `suiup 0.1.1`, en `~/.local/bin` (STATUS H1 ✅) |
| `sui move build` / `--lint` / `sui move test` | **Nunca corridos con esta CLI** (STATUS "Baselines de gates": "pendiente del baseline de #1"). No pueden correrse sin el `client.yaml` de TASK-1 (STOP-1 / D-20261030-07) |
| Rojo esperado | 🔴 compilación por H6 (`sources/Game/game.move:54-62`) y probablemente H8 (`sources/battleship.move:58-65`); 0 tests (`tests/battleship_tests.move` comentado). **No se arreglan en este issue** |
| `~/.sui` / `~/.move` | No existen |
| App / CI | No existen |

**Importante para tu auto-revisión:** en este issue un `sui move build`/`test` en rojo **por errores de
compilación de `sources/`** es el resultado esperado y se registra; no es la línea roja "entregar con
gates en rojo" de tu rol. Sí es fallo del task un error de **manifest o de resolución de dependencias**.

## Decisiones del owner (D1..Dn — no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Framework vía **dependencias implícitas** del sistema de paquetes (`[dependencies]` vacío, sin entrada `Sui` git ni `override`, sin `[addresses]`/`[dev-addresses]`). El framework queda fijado por `Move.lock`, regenerado por la CLI con `-e testnet`, nunca editado a mano | Plan v3 Decisión 1, aprobada por el MAYOR (registro en `DECISIONES.md` a cargo del orquestador) |
| D2 | CLI del canal **testnet** (`1.83.0`, vía `suiup`) | Plan v3 Decisión 2, aprobada por el MAYOR |
| D3 | Config de la CLI **sin claves** en `~/.sui/sui_config/client.yaml` (`active_env: testnet`, `active_address: ~`, keystore vacío); **la escribe el DEV con autorización del usuario**. La clave publicadora la agrega el owner en #8, en su terminal, sin agentes | **D-20261030-07** |
| D4 | Redacción nueva de PROY-11 (texto exacto en TASK-2 §3) | Plan v3, aprobada por el MAYOR |
| D5 | MAYOR y MID no corren gates: tu output pegado es la única evidencia | D-20261030-02 |
| D6 | Commits, pushes y PR los hace el orquestador; el merge, el usuario | D-20261030-05 |

---

## TASK-1: Config sin claves, manifest al sistema de paquetes de la CLI 1.83 y `Move.lock` regenerado — área: contracts

### 1. Historia de usuario del task

**Como** DEV del paquete Move, **quiero** que la CLI tenga un entorno testnet sin claves y que
`Move.toml`/`Move.lock` usen el formato del sistema de paquetes de la CLI 1.83 con el framework pineado
al SHA del protocolo de testnet, **para** poder correr gates reproducibles sin que la CLI genere claves
ni dependa de una branch móvil.
**Scope:** `client.yaml` sin claves (fuera del repo), `Move.toml`, `Move.lock` (vía CLI), `.gitignore`.
**No entrega:** baseline ni docs (TASK-2); arreglos de compilación (H6/H8); mover archivos (#2).

### 2. Contexto

- `Move.toml:7-8` declara `Sui = { git = …, rev = "framework/testnet", override = true }` (branch
  móvil); `Move.toml:3` `edition = "2024.beta"`; `Move.toml:21-22` `[addresses] battleship = "0x0"`;
  `Move.toml:28` `[dev-dependencies]`, `Move.toml:33` `[dev-addresses]` (vacías). `Move.lock:4` es
  formato v3 de 2025 y pinea `framework/testnet` (`Move.lock:13,17`). `.gitignore:1` solo `build/*`.
- El código usa la address `battleship` = `name` del paquete (`Move.toml:2`;
  `sources/House/house.move:6`, `sources/Game/game.move:1`, `sources/battleship.move:1`), así que quitar
  `[addresses]` no cambia nada en `sources/`.
- **Modelo a replicar:** la plantilla de `sui move new` de la CLI 1.83 (`[dependencies]` vacío,
  `edition = "2024"`, `.gitignore` con `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`) y la
  doc oficial *Move package management* + guía de migración (quitar `[addresses]`/`[dev-addresses]`;
  `Move.lock` lo regenera la CLI y se commitea; nunca editarlo a mano).
- **Por qué hace falta el `client.yaml`:** la CLI 1.83 carga la config del cliente antes de cualquier
  subcomando de `sui move` (`sui_commands.rs:578-584`); si no existe, ofrece crearla y con stdin vacío
  genera una clave e imprime su frase (`sui_commands.rs:1630-1648`). `-e testnet` no lo evita. Además
  el SHA del framework que se pinea sale de la versión de protocolo de la red del **entorno activo**
  (`crates/sui-package-alt/src/sui_flavor.rs:66-99, 179-213`); si la consulta falla, cae a la máxima
  versión conocida con un `warn!` que solo se ve con `RUST_LOG=warn`.

### 3. Qué implementar

**Paso 0 — arranque.** `git status -sb` (branch `feature/issue-1-toolchain`, HEAD `117aa91` o
posterior, árbol limpio). `export SCR=<tu scratchpad>`. `test -d ~/.sui && echo existe || echo no-existe`
(se espera `no-existe`; si existe, ver la guarda del paso 1).

**Paso 1 — `client.yaml` sin claves (D3).** Pegar este bloque tal cual en bash. La guarda impide
sobrescribir un `client.yaml` existente (sin `exit`, para no cerrar la shell):

```bash
if test -e ~/.sui/sui_config/client.yaml; then
  echo "client.yaml ya existe: no se sobrescribe"
else
  mkdir -p ~/.sui/sui_config && chmod 700 ~/.sui ~/.sui/sui_config
  cat > ~/.sui/sui_config/client.yaml <<EOF
---
keystore:
  File: $HOME/.sui/sui_config/sui.keystore
external_keys: ~
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: ~
    basic_auth: ~
active_env: testnet
active_address: ~
EOF
fi
```

- Si imprime "client.yaml ya existe: no se sobrescribe": **para** y reporta al MID (alguien creó una
  config; puede tener claves). No la leas ni la modifiques.
- `$HOME` se expande al escribir (la ruta del keystore debe ser absoluta). El archivo no lleva claves
  ni direcciones; el keystore no se crea (la CLI lo carga vacío si no existe).
- Formato verificado contra `crates/sui-sdk/src/sui_client_config.rs:20-33, 89-99` y
  `crates/sui-keys/src/keystore.rs:267-276, 401-430` @ `testnet-v1.83.0`.

**Verificaciones de que no se creó ninguna clave** (ninguna imprime contenido de keystore):

```bash
printf 'n\n' | sui client active-env 2>&1 | tee $SCR/preflight.txt      # (V1) debe imprimir: testnet
ls -A ~/.sui/sui_config/                                                 # (V2) solo client.yaml (como mucho sui.keystore / sui.aliases)
for f in sui.keystore sui.aliases; do                                     # (V3) si existen, deben ser listas vacías
  p=~/.sui/sui_config/$f
  if test -e "$p"; then python3 -I -c 'import json,sys; sys.exit(len(json.load(open(sys.argv[1]))))' "$p"; echo "$f len-exit=$?"; fi
done
grep -cE '^active_address: *~? *$' ~/.sui/sui_config/client.yaml        # (V4) 1 (sigue sin dirección)
```

V1 con "No config found, aborting" ⇒ parar. V3 con `len-exit` ≠ 0 ⇒ parar y reportar solo el número.
(V5, tras el paso 3: `grep -ciE 'recovery phrase|Generated new keypair' $SCR/preflight.txt $SCR/build1.txt`
→ `0` en ambos.)

**Paso 2 — versiones.** `sui --version`, `suiup --version`, `which sui`, `node --version` (debe ser v22).

**Paso 3 — cambios en el repo.**

- `Move.toml` → reemplazar el archivo entero por:
  ```toml
  [package]
  name = "battleship"
  edition = "2024"

  [dependencies]

  # Sistema de paquetes de la CLI >= 1.63: std y sui son dependencias implícitas.
  # El framework queda fijado por Move.lock (regenerado por la CLI con `-e testnet`, nunca a mano);
  # todo cambio de Move.lock en un diff se declara y justifica.
  # https://docs.sui.io/guides/developer/packages/move-package-management
  ```
  (Desaparecen la entrada `Sui` con `override`, `[addresses]`, `[dev-dependencies]`, `[dev-addresses]`
  y los comentarios de plantilla de 2025. No agregar `license`/`authors`: es #16.)
- `.gitignore` → queda:
  ```
  build/*
  traces/*
  .trace
  .coverage*
  Pub.*.toml
  ```
- `Move.lock` → **no se edita a mano.** Precondiciones del repin: V1 = `testnet` y red disponible:
  `curl -sI https://fullnode.testnet.sui.io:443 | head -1` (esperado `HTTP/2 200`). Repin con el primer
  build:
  ```bash
  printf 'n\n' | RUST_LOG=warn sui move build -e testnet 2>&1 | tee $SCR/build1.txt; echo "exit=${PIPESTATUS[1]}"
  ```
  Si el build aborta por compilación **antes** de escribir el lock (`git diff --stat Move.lock` vacío),
  fallback:
  ```bash
  printf 'n\n' | RUST_LOG=warn sui move update-deps -e testnet 2>&1 | tee $SCR/update1.txt; echo "exit=${PIPESTATUS[1]}"
  ```
  y declararlo en Desviaciones.

**Paso 4 — verificaciones del lock y del manifest.**

1. `build1.txt` (y `update1.txt` si se usó) **sin** errores de manifest/resolución (`[addresses]` no
   soportado, `sui`/`std` no encontrados, "Your active environment is not present in Move.toml",
   "Could not determine the correct dependencies") y **sin** "Falling back to protocol version" ni
   "Falling back to latest known packages". Los errores de compilación de `sources/` son esperados.
2. Sin error de edición. Si la CLI rechaza `edition = "2024"`: volver a `"2024.beta"`, re-correr el
   build y justificar con el output en Desviaciones.
3. `git diff Move.lock`: pegar la cabecera (`version`) y las entradas de `sui`/`std` (`source`/`rev`)
   por entorno. Ninguna branch (`framework/testnet` ni otra): solo SHAs de 40 caracteres.
4. **SHA del framework** (`SHA` = `rev` de `sui` para `testnet` en el lock nuevo):
   ```bash
   SHA=<rev de sui/testnet en Move.lock>
   gh api repos/MystenLabs/sui/commits/$SHA --jq .sha                                  # existe, 40 chars
   gh api repos/MystenLabs/sui/compare/$SHA...testnet-v1.83.0 --jq .status             # "ahead" o "identical"
   PV=$(curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' \
     -d '{"query":"{ epoch { protocolConfigs { protocolVersion } } }"}' | jq -r .data.epoch.protocolConfigs.protocolVersion)
   echo "$PV"                                                                          # debe ser un entero
   gh api "repos/MystenLabs/sui/contents/crates/sui-framework-snapshot/manifest.json?ref=testnet-v1.83.0" \
     -H "Accept: application/vnd.github.raw" > $SCR/manifest.json
   jq '[keys[]|tonumber]|max' $SCR/manifest.json                                       # máximo que conoce la CLI (hoy 140)
   jq -r --argjson pv "$PV" '[to_entries[] | select((.key|tonumber) <= $pv)] | max_by(.key|tonumber) | .value.git_revision' \
     $SCR/manifest.json                                                                # == $SHA
   ```
   Referencia del MAYOR (2026-10-30): `PV = 139` → `719fb2960ccfbf9f4d33041f8ea5146d30671696`.
   **Desviación, parar** hasta la revisión del MID si: `PV` no es un entero; `PV` > máximo de la tabla;
   el SHA del lock ≠ el del piso; o el lock se escribió con la red caída.
5. `git status --short`: solo `Move.toml`, `Move.lock`, `.gitignore` (más artefactos del ciclo en
   `documents/` si los hubiera). Sin `Published.toml` ni `Pub.*.toml`.
6. V2–V5 de nuevo después del build (que siga sin haber clave).

**AuthZ:** no aplica (sin código on-chain). **Flujo de fondos:** no aplica.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `Move.toml`, `.gitignore`, `Move.lock` (solo vía CLI), `~/.sui/sui_config/client.yaml`
  (crear, fuera del repo, autorizado por D-20261030-07).
- **NO tocar:** `sources/**`, `tests/**`, `README.md`, `agents.md`, `documents/**` (eso es TASK-2),
  cualquier otro archivo bajo `~/.sui/`, `~/.move/` (solo lo llena la CLI).

### 5. Tests obligatorios

Ninguno nuevo (no hay código). El build queda en rojo por compilación (H6/H8): es el estado conocido
y lo mide TASK-2.

### 6. Smoke

No aplica (tooling; la evidencia es el output de los comandos).

### 7. Criterios de aceptación

- [ ] `client.yaml` creado por el bloque del paso 1; V1 = `testnet`; V2–V5 sin clave ni dirección.
- [ ] `Move.toml` igual al modelo (o `2024.beta` justificado); sin entrada `Sui` git ni `override`.
- [ ] `Move.lock` regenerado por la CLI; `sui`/`std` pineados al SHA del piso de la versión de protocolo
      de testnet, verificado con los comandos del paso 4.4.
- [ ] `.gitignore` con las 5 entradas.
- [ ] Sin errores de manifest/resolución ni "Falling back…".
- [ ] Ningún archivo de `sources/`/`tests/` ni de `documents/` modificado.
- [ ] Reporte sin frases, claves, contenido de `client.yaml`/keystore ni direcciones.

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5. En "Tests y gates" pega: paso 0, V1–V5, paso 2,
`build1.txt` completo (y `update1.txt` si aplica) con su `exit=`, y los resultados del paso 4 (1–5).
En "Documentación": "no aplica en TASK-1 (va en TASK-2)". Sin commits ni pushes.

---

## TASK-2: Baseline de gates y documentación de la toolchain — área: docs (+ gates de contracts)

### Addendum TASK-2 (v1.1, 2026-10-30 — de la revisión MID de TASK-1; prevalece sobre §2-§7 donde difiera)

TASK-1 está commiteado en `b2e98e6` (`Move.lock` v4, `MoveStdlib`/`Sui` pineados a
`719fb2960ccfbf9f4d33041f8ea5146d30671696`, PV 139). El build de TASK-1 confirmó las líneas reales de
los rojos. Precisiones:

1. **H6, líneas reales:** `sources/Game/game.move:55-59` (constructor de `GameRequest`; el compilador
   lo marca en `:55:16`, 6 × `EC04016`), no `:54-62`. Corregir la cita en STATUS (fila H6,
   `STATUS.md:42`, y en el baseline) y en `agents.md` §7 (`agents.md:135`, dentro de la sección §7
   que este task ya toca).
2. **H8, líneas reales:** `sources/battleship.move:62` (`EC06002`: uso de `player1` después de moverlo
   en `:60`). Citarlo así en el baseline. En la fila de `STATUS.md:25`, "H6/H7" pasa a "H6/H8".
3. **Warnings como mínimo, no como total:** registrar "16 `W09009` (9 en `battleship.move`, 7 en
   `Game/game.move`, 0 en `House/house.move`), **mínimo**: la compilación aborta y pueden faltar pasos
   posteriores" (ajustar el número si tus gates dan otro). Si el output de `--lint` no trae lints de
   Sui, ese gate se registra como "no medible hasta que compile", no como 0.
4. **Entornos del lock:** en la sección Toolchain de STATUS agregar: "`Move.lock` v4 solo pinea
   `testnet`; un gate con otro `-e` crearía una sección `[pinned.<env>]` nueva = delta del lock a
   declarar (PROY-11)".
5. **Nada que corregir:** el §0 de este handoff cita `:54-62` y `:58-65`; quedan como antecedente. No se edita.

### 1. Historia de usuario del task

**Como** owner y como los agentes que revisan los próximos issues, **quiero** el primer baseline real de
`sui move build`/`--lint`/`test` por archivo, con ref y SHA, y la toolchain documentada (incluido el
`client.yaml` sin claves y el pin del framework), **para** que todo cambio posterior se compare contra un
rojo conocido (cero delta) y nadie vuelva a toparse con el prompt de creación de clave.
**Scope:** correr los 3 gates y actualizar `documents/STATUS.md`, `agents.md`, `documents/ESTANDARES.md`.
**No entrega:** arreglos de compilación, CI (#3), `Published.toml`/publicación (#7/#8).

### 2. Contexto

- Arranca sobre el HEAD con TASK-1 commiteado por el orquestador.
- `documents/STATUS.md` hoy: sección "Baselines de gates" con la fila
  `contracts (raíz) @ master (f063a0e)` "pendiente del baseline de #1 … Esperado 🔴 por H6/H7"
  (`STATUS.md:25`) y `sui move test` "pendiente de #1; 0 tests"; hallazgos H1 (✅) y H2 (pendiente);
  P-3 ya figura cerrado en "Pendientes del usuario".
- `agents.md`: §2 tabla de áreas (fila Contratos, "framework Sui desde git con `override = true`…"),
  §3 "Toolchain" y tabla de comandos de contratos (sin `-e testnet`), §7 gotcha "Framework sin fijar",
  §11 fila "Sui CLI" (`1.83.0`).
- `documents/ESTANDARES.md` PROY-11 (línea 71) con la redacción vieja; encabezado versión 1.0.

### 3. Qué implementar

**Gates** (árbol limpio; anotar `git rev-parse --short HEAD`; antes, V1 de TASK-1 = `testnet`):

```bash
printf 'n\n' | sui move build -e testnet 2>&1 | tee $SCR/g1.txt;        echo "exit=${PIPESTATUS[1]}"
printf 'n\n' | sui move build -e testnet --lint 2>&1 | tee $SCR/g2.txt; echo "exit=${PIPESTATUS[1]}"
printf 'n\n' | sui move test -e testnet 2>&1 | tee $SCR/g3.txt;         echo "exit=${PIPESTATUS[1]}"
git diff --stat Move.lock                                               # vacío; si no, git checkout -- Move.lock y reportarlo
grep -ciE 'recovery phrase|Generated new keypair' $SCR/g1.txt $SCR/g2.txt $SCR/g3.txt   # 0
```

Para cada gate: exit code y errores/warnings **por archivo** (`sources/battleship.move`,
`sources/Game/game.move`, `sources/House/house.move`, `tests/battleship_tests.move`). Puedes repetir
con `--json-errors` para contar (declararlo). Anota si se compilan las subcarpetas `sources/House/` y
`sources/Game/` (si los errores las citan) y si el compilador se detiene antes de emitir
warnings/lints: en ese caso el baseline de warnings/lint es "no medible hasta que compile", no 0.

**`documents/STATUS.md`:**
- Nueva sección **"Toolchain"** (antes de "Baselines de gates"): `sui 1.83.0-16d2dc1e05ed` (release
  testnet), `suiup 0.1.1`, `~/.local/bin`, `node --version` tras `nvm use 22`; prerrequisito:
  `~/.sui/sui_config/client.yaml` **sin claves** con `active_env: testnet` (D-20261030-07) — ubicación y
  tipo, nunca contenido ni dirección; framework pineado: SHA del lock + `PV` del día; fecha.
- **"Baselines de gates"**: reemplazar la fila de `STATUS.md:25` y la de `sui move test` por los 3 gates
  con ref + SHA corto, conteos por archivo y los rojos **realmente observados** (citando H6/H8 según
  corresponda; corregir la mención a H7).
- **H2** → ✅ 2026-10-30 con resumen (implícitas, `edition` final, lock pineado a `<SHA>`). **H1**:
  agregar "registrado en Toolchain". **P-3**: ya cerrado; verificar, no duplicar.
- Nuevo hallazgo **H11** (toolchain): "`sui move` exige `client.yaml`; sin él crea una clave e imprime
  su frase (`sui_commands.rs:584, 1630-1648`); `-e` no lo evita" → "Resuelto con config sin claves
  (D-20261030-07). #3: escribir la misma config en `$RUNNER_TEMP` con `SUI_CONFIG_DIR`".
- Notas para **#7/#8** (en H11 o en la fila del backlog): la CLI escribe `Published.toml` (commiteable)
  al publicar y `Pub.*.toml` efímeros (ignorados); `Published.toml` se superpone con
  `contracts/deployments/<red>.json` (D-20261030-03, ARQ-6): **#7 define cuál es la fuente del
  `packageId` y cuál se deriva**; en #8 el owner agrega su clave a este mismo `client.yaml` desde su
  terminal, sin agentes.
- Nota para **#3**: `--warnings-are-errors` existe en `sui move build` y `sui move test`.
- "Ciclo activo": fila de #1 actualizada (plan aprobado, TASK-1 commiteado, TASK-2 en revisión).

**`agents.md`:**
- §2, fila Contratos de la tabla → "Sui Move, edition `2024`, `std`/`sui` implícitas (sistema de
  paquetes de la CLI ≥ 1.63); framework fijado por `Move.lock` (repin con `-e testnet`; todo delta del
  lock se justifica)" (con `2024.beta` si así quedó en TASK-1).
- §3: en "Toolchain", prerrequisito `client.yaml` sin claves con `active_env: testnet` (D-20261030-07);
  en la tabla de contratos, los gates como `sui move build -e testnet`, `sui move build -e testnet --lint`,
  `sui move test -e testnet`, coverage con `-e testnet`; mencionar `--warnings-are-errors`.
- §7: reemplazar el gotcha "Framework sin fijar" por "Framework fijado por `Move.lock`; todo delta del
  lock se declara" y agregar el gotcha del `client.yaml` (sin config la CLI crea una clave; nunca correr
  `sui move` sin ella).
- §11: fila "Sui CLI" con `1.83.0-16d2dc1e05ed`; nueva fila `client.yaml` (`~/.sui/sui_config/`, sin
  claves hasta #8; nunca en el repo ni en logs).

**`documents/ESTANDARES.md`:** encabezado a `1.1 · 2026-10-30`; PROY-11 reemplazado por (texto aprobado):

> **PROY-11 — Manifest.** `Move.toml` en el formato del sistema de paquetes de la CLI registrada en
> STATUS (≥ 1.63): `std`/`sui` implícitas (sin entrada `Sui` git ni `implicit-dependencies = false`),
> sin `[addresses]`/`[dev-addresses]`; deps git de terceros con `rev` = SHA de 40 caracteres. El
> framework queda fijado por `Move.lock` (regenerado por la CLI con `-e testnet`, nunca a mano,
> commiteado); todo cambio de `Move.lock` en un diff se declara y justifica en el reporte. `edition`
> declarada. Direcciones publicadas en `Published.toml` (commiteado); `Pub.*.toml` nunca se commitea.

**AuthZ / fondos:** no aplica.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `documents/STATUS.md`, `agents.md`, `documents/ESTANDARES.md`.
- **NO tocar:** `Move.toml`, `Move.lock`, `.gitignore`, `sources/**`, `tests/**`, `~/.sui/**`,
  `documents/DECISIONES.md` (lo registra el orquestador), plan/handoff/revisión.

### 5. Tests obligatorios

Ninguno nuevo. `sui move test -e testnet` se registra tal cual (fallo de compilación o 0 tests).

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- [ ] Los 3 gates corridos con `-e testnet`, output íntegro pegado con `exit=` y conteo por archivo.
- [ ] `Move.lock` sin delta tras los gates; 0 apariciones de prompt de clave.
- [ ] STATUS: Toolchain, baseline con SHA, H2 ✅, H11, notas #3/#7/#8, fila H6/H7 corregida.
- [ ] `agents.md` §2/§3/§7/§11 y PROY-11 coherentes entre sí y con el `Move.toml` de TASK-1.
- [ ] `git diff` sin frases, claves, contenido de `client.yaml`/keystore ni direcciones (afirmarlo
      explícitamente en el reporte).

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5: gates con output completo, SHA del HEAD, conteos por
archivo, la afirmación SEG-3 y el snippet de STATUS (que es parte del diff). Sin commits ni pushes.
