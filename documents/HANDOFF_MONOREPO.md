# HANDOFF_MONOREPO
> Plan: PLAN_MONOREPO v1.1 (aprobado por el MAYOR, `documents/REVISION_PLAN_MONOREPO.md` §"Revisión v1.1") | Issue: #2 |
> Branch: `feature/issue-2-monorepo` | Versión: v1 | Fecha: 2026-10-30
> Autor: MID. Incorpora los MINOR N1–N3 y las sugerencias N4–N5 de la revisión v1.1. Opciones fijadas por el
> usuario en D-20261030-10: STOP-1 = (a), STOP-2 = (a), STOP-3 = (b) Node 26.

**Meta del handoff (HU):** **Como** desarrollador del proyecto (DEV de House/Game y owner que revisa los PRs),
**quiero** el paquete Move en `contracts/` con layout plano, sin legado ni código que no compila, y la raíz como
workspace npm con Node 26 fijado, **para** tener el primer `sui move build` / `sui move test` en verde en
`master`, que #3 pueda gatear los PRs de #4–#6 y que #9 tenga dónde crear `app/`.
**Lo que NO entrega:** cambios en `house.move` (ni sus warnings/lints, #4), `battleship::game` (#5),
`contracts/README.md` / `contracts/tests/` (#4), `contracts/deployments/` (#7), `app/` (#9), CI (#3),
dependencias npm, repin del framework (H13 → pre-vuelo de #8).

**Tasks, en orden y uno por sesión:** TASK-1 (contracts) → TASK-2 (tooling) → TASK-3 (docs + baseline). Cada uno
termina con reporte (FLUJO_AGENTES §5); el siguiente empieza solo con la revisión del MID en PASA y el commit
del orquestador.

## 0. Baseline de gates verificado (2026-10-30)

Verificado por el MID con `git log` + `documents/STATUS.md` (el MID no corre gates, D-20261030-02):

- **Ref vigente:** `master` @ `e1849c6` (merge de #20); medido por el DEV de #1 en `b0fb54e`. Branch
  `feature/issue-2-monorepo` @ `cd31bcb`: desde `b0fb54e` solo hubo commits de docs
  (`git diff --stat b0fb54e cd31bcb -- Move.toml Move.lock sources tests .gitignore` → vacío), así que el baseline
  sigue vigente para el código de contratos.
- **Toolchain:** Sui CLI `1.83.0-16d2dc1e05ed` (release `testnet`, `suiup` 0.1.1, `~/.local/bin`); Node instalados
  20.20.2 / 22.23.4 / 26.13.0 vía nvm; `~/.sui/sui_config/client.yaml` **sin claves**, `active_env: testnet`
  (D-20261030-07). Framework fijado por `Move.lock` v4 a `719fb2960ccfbf9f4d33041f8ea5146d30671696` (piso de la
  PV 139); testnet está en la PV **140** desde la época 1269 (2026-10-30 21:24 UTC) → H13.
- **Gates (raíz, `-e testnet`):**

| Gate | Resultado vigente |
|---|---|
| `sui move build -e testnet` | 🔴 exit 1. 7 errores: 6 × `EC04016` en `sources/Game/game.move:55-59` (H6), 1 × `EC06002` en `sources/battleship.move:62` (H8). Warnings: ≥ 16 `WC09009` (9 `battleship.move`, 7 `Game/game.move`, 0 `House/house.move`) |
| `sui move build -e testnet --lint` | 🔴 exit 1. Lo mismo + ≥ 1 lint: `WSL06010` en `sources/House/house.move:67` (H12) |
| `sui move test -e testnet` | 🔴 exit 1, no compila. 0 tests |
| app / CI | ⬜ no existen |

- **Baseline esperado al terminar #2** (pronóstico; se registra lo medido): build 🟢 exit 0 sin errores y
  0 warnings de compilación esperados (todos los errores y los 16 `WC09009` venían de los archivos que se
  retiran); lint 🟢 exit 0 con al menos `WSL06010` en `contracts/sources/house.move:67`; test 🟢 exit 0, 0 tests.
  Todo warning/lint de `house.move` se **registra, no se arregla** (#4).

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | `sources/battleship.move` se **borra** (`git rm`); recuperable con `git show f063a0e:sources/battleship.move` (#18) | D-20261030-10 (STOP-1 a) |
| D2 | `sources/House/README.md` y `sources/Game/README.md` se **borran**; recuperables con `git show f063a0e:` | D-20261030-10 (STOP-2 a) |
| D3 | **Node 26** en `.nvmrc` y PROY-17 (ESTANDARES → v1.2); `contracts/`, `app/` y npm workspaces confirmados | D-20261030-10 (STOP-3 b), enmienda D-20261030-03 |
| D4 | Framework fijado por `Move.lock`, regenerado solo por la CLI con `-e testnet`; todo delta se declara (PROY-11) | D-20261030-08 (ratificada por el usuario) |
| D5 | `client.yaml` sin claves; toda invocación de `sui` con `printf 'n\n' |` delante | D-20261030-07 |
| D6 | El DEV es el único que corre gates; MID/MAYOR revisan el output pegado | D-20261030-02 |
| T1 | `Move.lock` se mueve **sin repin** (rename 100 %). La CLI no repinea ni avisa por sí sola: solo repinea con `update-deps`, al cambiar las dependencias del manifest, con un digest de dependencia distinto o con otro `-e`. Repin del framework → pre-vuelo de #8 (H13) | Plan v1.1, aprobada por el MAYOR |
| T2 | `.gitignore`: patrones del paquete anclados a `contracts/`; se quitan `build/*` y `traces/*` de la raíz | ídem |
| T3 | `package-lock.json` **no** se commitea en #2 (`npm install` lo crea: se borra y se declara) | ídem |
| T4 | TASK-3 limpia también los gotchas `GamePool`/`escrow: u64`, `agents.md` §8/§9, `ESTANDARES.md:7` y `AGENTE_MID.md:66` | ídem |
| T5 | Gates de contratos = `cd contracts && printf 'n\n' | sui move …`; `--path contracts` desde la raíz es equivalente | ídem |

**Ya hecho fuera del handoff (N4):** los comentarios en #8 (pre-vuelo H13), #4 (gancho de coverage) y #3 (chequeo
informativo del pin en CI) los publicó el orquestador. No hay que tocarlos.

## Reglas comunes a los tres tasks

- Shell en la raíz del repo, branch `feature/issue-2-monorepo`. **Artefactos del ciclo:** `documents/*_MONOREPO.md`
  (plan, revisión, este handoff, reportes) pueden aparecer en cualquier `git status`; no son desvíos.
- Toda invocación de `sui` con `printf 'n\n' |` delante; de `sui client` solo `active-env`. Nunca leer, listar ni
  pegar `client.yaml`, `sui.keystore` ni `sui.aliases`. Gates siempre con `-e testnet`; exit code con
  `${PIPESTATUS[1]}`. Outputs a un directorio `<scratch>/` tuyo, fuera del repo.
- Sin commits ni pushes (los hace el orquestador). Sin carpetas placeholder ni `.gitkeep`.

---

## TASK-1: Mover el paquete a `contracts/`, retirar el legado y medir el primer verde — área: contracts

### 1. Historia de usuario del task

**Como** DEV de los módulos Move, **quiero** que el paquete compile desde `contracts/` con solo `house.move`
(sin legado ni stubs rotos), **para** tener un build y un test en verde contra los que medir cero delta en #3–#6.

### 2. Contexto

- Hoy el paquete vive en la raíz: `Move.toml`, `Move.lock`, `sources/House/house.move`,
  `sources/Game/game.move` (no compila, H6; diseño descartado, H7), `sources/battleship.move` (legado, no compila,
  H8), `sources/{House,Game}/README.md` (diseño 2025) y `tests/battleship_tests.move` (todo comentado, H9).
- `house.move` solo importa `sui::*` (`sources/House/house.move:8-11`): no depende de nada que se retire.
- `.gitignore` actual: `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`. `build/*` y `traces/*` están
  anclados a la raíz (tienen `/` en medio) y no cubrirían `contracts/build/` (T2).
- **Lock:** el digest que dispara el repin depende solo de las dependencias del manifest, no de la ruta ni del SHA
  (`move-package/src/package/package_impl.rs:327-348`, `schema/manifest.rs:160-173`, `graph/builder.rs:100-131`
  @ `testnet-v1.83.0`). Mover sin cambiar contenido ⇒ lock **byte a byte idéntico** y sin la nota "Updating
  dependencies…".
- **Coverage:** `--coverage` escribe `contracts/traces/` y `contracts/.coverage_map.mvcov`
  (`move-cli/src/base/test.rs:230-256`), pero **con 0 tests no escribe el mapa** (`test.rs:253`). El criterio del
  issue "verificar nombres reales con `--coverage`" no se puede cumplir en #2: es una **desviación ya aprobada**
  (los nombres salen del código; el gancho de verificación está comentado en #4). Declárala en tu reporte.

### 3. Qué implementar

1. Precondición: `printf 'n\n' | sui client active-env` → debe imprimir `testnet`. Si imprime "No config found,
   aborting" u otra cosa, parar y reportar.
2. Mudanza y retiros:
   ```bash
   mkdir -p contracts/sources
   git mv Move.toml contracts/Move.toml
   git mv Move.lock contracts/Move.lock
   git mv sources/House/house.move contracts/sources/house.move
   git rm sources/Game/game.move sources/battleship.move \
          sources/House/README.md sources/Game/README.md \
          tests/battleship_tests.move
   find sources tests -depth -type d -empty -delete 2>/dev/null; true   # N1: borra directorios que quedaron vacíos
   ```
3. `.gitignore`: **reemplazar** su contenido actual por la sección Move (TASK-2 agrega la sección raíz debajo):
   ```gitignore
   # Paquete Move (contracts/) — plantilla de `sui move new` 1.83 adaptada al monorepo
   contracts/build/
   contracts/traces/
   .trace
   .coverage*
   Pub.*.toml
   contracts/deployments/localnet.json
   ```
- AuthZ, eventos, aborts, fondos: no aplica (sin cambios de código).

### 4. Archivos a tocar / NO tocar

- **Tocar:** `Move.toml`, `Move.lock`, `sources/House/house.move` (solo `git mv`); `sources/Game/game.move`,
  `sources/battleship.move`, `sources/House/README.md`, `sources/Game/README.md`, `tests/battleship_tests.move`
  (`git rm`); `.gitignore`.
- **NO tocar:** el **contenido** de `house.move`, `Move.toml` y `Move.lock`; docs (`agents.md`, `documents/**`,
  TASK-3); `package.json`/`.nvmrc` (TASK-2). No crear `contracts/tests/` ni `contracts/deployments/`.

### 5. Tests / verificaciones obligatorias (output pegado)

1. **Layout:** `git ls-files | grep -v '^documents/'` → exactamente `.gitignore`, `README.md`, `agents.md`,
   `contracts/Move.lock`, `contracts/Move.toml`, `contracts/sources/house.move`. Y
   `test -e sources || test -e tests || echo ok` → `ok`.
2. **Rename puro:** `git diff -M --stat master` y `git diff -M --summary master | grep rename` → exactamente 3
   `rename … (100%)`: `Move.lock`, `Move.toml`, `{sources/House => contracts/sources}/house.move` (con `| 0` en el
   `--stat`).
3. **Gates, desde `contracts/`:**
   ```bash
   cd contracts
   printf 'n\n' | sui move build -e testnet 2>&1 | tee <scratch>/build.txt; echo "exit=${PIPESTATUS[1]}"
   printf 'n\n' | sui move build -e testnet --lint 2>&1 | tee <scratch>/lint.txt; echo "exit=${PIPESTATUS[1]}"
   printf 'n\n' | sui move test -e testnet 2>&1 | tee <scratch>/test.txt; echo "exit=${PIPESTATUS[1]}"
   printf 'n\n' | sui move test -e testnet --coverage 2>&1 | tee <scratch>/cov.txt; echo "exit=${PIPESTATUS[1]}"
   cd ..
   ```
   Pegar los 4 outputs **íntegros**. Contar errores, warnings y lints **por archivo y código** (`WC…`, `WSL…`).
4. **Lock sin delta y registro del día para H13 (N3):**
   ```bash
   cmp <(git show master:Move.lock) contracts/Move.lock && echo identico
   grep -c "Updating dependencies" <scratch>/build.txt                       # 0
   PV=$(curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' \
     -d '{"query":"{ epoch { protocolConfigs { protocolVersion } } }"}' | jq -r .data.epoch.protocolConfigs.protocolVersion)
   echo "PV=$PV"
   gh api "repos/MystenLabs/sui/contents/crates/sui-framework-snapshot/manifest.json?ref=testnet-v1.83.0" \
     -H "Accept: application/vnd.github.raw" > <scratch>/manifest.json
   MAX=$(jq 'keys|map(tonumber)|max' <scratch>/manifest.json); echo "MAX=$MAX"     # 140
   if [[ "$PV" =~ ^[0-9]+$ ]]; then
     [ "$PV" -le "$MAX" ] || echo "CLI desactualizada: PV $PV > $MAX"
     jq -r --argjson pv "$PV" '[to_entries[] | select((.key|tonumber) <= $pv)] | max_by(.key|tonumber) | .value.git_revision' <scratch>/manifest.json
   else
     echo "PV no obtenida (sin red o error de GraphQL): reportar y seguir"
   fi
   ```
   - Si el lock **no** es idéntico o hay nota "Updating dependencies": no revertir; declarar el delta (PROY-11),
     correr el bloque de arriba y **parar** hasta la revisión del MID (contingencia de T1).
   - Si imprime "CLI desactualizada": declararlo y **parar**.
   - Si la PV no se obtuvo: reportarlo y **seguir** (los gates no la necesitan; no hay repin).
5. **Ignorados:** `git status --porcelain --ignored` → aparte de los artefactos del ciclo en `documents/`, los
   cambios del task y `!! contracts/build/` (más lo que genere `--coverage`, siempre como `!!`, nunca `??`).
   `git check-ignore -v contracts/build/x contracts/traces/x contracts/.coverage_map.mvcov contracts/Pub.testnet.toml contracts/deployments/localnet.json`
   → los 5 ignorados; `git check-ignore contracts/Published.toml contracts/deployments/testnet.json; echo $?` → `1`.
6. **SEG-3:** `grep -ciE 'recovery phrase|Generated new keypair' <scratch>/*.txt` → `0` en cada archivo; no existen
   `contracts/Published.toml` ni `Pub.*.toml` (`ls contracts/`).

Tests nuevos: ninguno (0 tests es el estado correcto hasta #4).

### 6. Smoke

No aplica (reestructura sin flujo ejecutable; la verificación son los gates).

### 7. Criterios de aceptación

- Verificaciones 1-6 pegadas. `sui move build` exit 0 **sin errores**; `--lint` exit 0 con sus lints contados;
  `sui move test` exit 0 con **0 tests**; lock idéntico (o contingencia de T1 declarada).
- Ningún cambio de contenido en `house.move`, `Move.toml` ni `Move.lock`.
- Desviación del criterio de coverage declarada en "Desviaciones del handoff".
- **Rollback** si algo sale mal antes del commit: respaldar los artefactos del ciclo sin commitear y
  `git reset --hard HEAD`. Si el build falla con un error no previsto en `house.move`: parar y reportar, sin tocar código.

### 8. Al terminar

Reporte con la plantilla de FLUJO_AGENTES §5 (branch + SHA corto, archivos, gates pegados, desviaciones —incluida
la de coverage—, riesgos, snippet de STATUS). Sin commits ni pushes. Commit que propondrá el MID:
`contracts: move package to contracts/ and retire legacy code (#2)`.

---

## TASK-2: Raíz del monorepo — `package.json`, `.nvmrc` (Node 26), `.gitignore` general y docs de Node — área: tooling

### 1. Historia de usuario del task

**Como** desarrollador que va a crear la app en #9, **quiero** un workspace npm en la raíz y la versión de Node
fijada en un solo lugar (`.nvmrc` = 26), **para** que local y CI usen el mismo runtime con `nvm use` y la app
nazca sobre un LTS vigente.

### 2. Contexto

- No hay `package.json` ni `.nvmrc`. D3 fija Node 26 (Active LTS desde 2026-10-28, EOL 2029-04-30).
- La versión 22 hoy está escrita en `agents.md:40` (`.nvmrc # Node 22`), `agents.md:51-52` (§3 Toolchain),
  `agents.md:194` (§11, "Usar 22"), `documents/agentes/AGENTE_DEV.md:17` ("Node 22 (`nvm use 22`)"),
  `documents/STATUS.md:28` (fila Node) y `documents/ESTANDARES.md:83` (PROY-17). Objetivo: el número vive solo en
  `.nvmrc`, PROY-17 y el valor medido de la fila Node de STATUS; el resto dice `nvm use` sin versión.
- Comprobado por el MAYOR: con este `package.json` y sin `app/`, `npm install` (Node 22 y 26) da exit 0, "up to
  date", sin aviso de workspace, **crea `package-lock.json` y no crea `node_modules/`**.

### 3. Qué implementar

1. `package.json` (nuevo):
   ```json
   {
     "name": "sui-battleship",
     "private": true,
     "workspaces": ["app"]
   }
   ```
   Sin `version`, `scripts`, `engines` ni dependencias (los define #9).
2. `.nvmrc` (nuevo): `26` y salto de línea final.
3. `.gitignore`: agregar **debajo** de la sección Move de TASK-1:
   ```gitignore

   # Node / app
   node_modules/
   app/dist/

   # Entorno: nunca valores reales en el repo (SEG-3)
   .env
   .env.*
   !.env.example

   # Varios
   *.log
   .DS_Store
   ```
4. Docs de Node (`nvm use` sin versión):
   - `agents.md:40`: `├── .nvmrc                    # versión de Node (PROY-17)`.
   - `agents.md:51-52`: "… Node (versión en `.nvmrc`, PROY-17), npm. El `node` por defecto de la máquina puede ser
     otro: correr `nvm use` antes de cada gate. …" (resto de la frase igual).
   - `agents.md:194` (§11, fila Node): última columna "Usar la de `.nvmrc` (`nvm use`)".
   - `documents/agentes/AGENTE_DEV.md:17`: "… y Node (`nvm use`, lee `.nvmrc`)."
   - `documents/STATUS.md:28`: "| Node | `<salida de node --version>` tras `nvm use` (`.nvmrc` = 26, D-20261030-10) |".
   - `documents/ESTANDARES.md:83` (PROY-17): "Node 26 (`.nvmrc`) y npm workspaces desde la raíz; …" (resto igual).
   - `documents/ESTANDARES.md:3`: "> **Versión:** 1.2 · **Fecha:** 2026-10-30 (adaptado de Cancerbero —
     D-20261030-01; PROY-17: `.nvmrc` = 26 por D-20261030-10)".

### 4. Archivos a tocar / NO tocar

- **Tocar:** `package.json`, `.nvmrc`, `.gitignore`, `agents.md` (solo líneas 40, 51-52, 194),
  `documents/agentes/AGENTE_DEV.md` (línea 17), `documents/STATUS.md` (línea 28), `documents/ESTANDARES.md`
  (líneas 3 y 83).
- **NO tocar:** `contracts/**`; el resto de `agents.md`/STATUS (TASK-3); `documents/DECISIONES.md`. No crear `app/`.
  No commitear `package-lock.json` (T3).

### 5. Tests / verificaciones obligatorias (output pegado)

1. `source ~/.nvm/nvm.sh && nvm use` (lee `.nvmrc`), `node --version` (mayor 26), `npm --version`.
2. `npm install; echo "exit=$?"` desde la raíz → exit 0 esperado. Luego `rm package-lock.json` (declararlo, T3) y
   `git status --porcelain --ignored` → aparte de los artefactos del ciclo en `documents/`, solo los archivos de
   este task (y `!! contracts/build/` si quedó de TASK-1). **Si `npm install` falla** por el workspace inexistente:
   quitar `"workspaces"`, volver a correr (exit 0) y declarar la desviación "`workspaces` se agrega en #9".
3. `git check-ignore -v node_modules/x app/dist/x app/.env app/.env.local .env.production foo.log .DS_Store` → los 7
   ignorados; `git check-ignore app/.env.example; echo $?` → `1`.
4. `python3 -I -m json.tool package.json` → JSON válido.
5. Coherencia de Node (N5):
   `git grep -nE "nvm use 2[0-9]|Node 2[0-9]|Usar 2[0-9]" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'`
   → **solo** `documents/ESTANDARES.md:83` (PROY-17) y `documents/STATUS.md:51` (histórico de H1). Pegar el output.

Tests nuevos: ninguno.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- `package.json` con `"private": true` y `"workspaces": ["app"]` (o la desviación declarada); `.nvmrc` = `26`;
  `npm install` exit 0; sin `package-lock.json` ni dependencias en el diff.
- `.gitignore` cubre todos los patrones del issue (verif. 5 de TASK-1 + verif. 3 de este task).
- Verif. 5 con el output esperado; ESTANDARES en v1.2.
- Rollback: `git checkout -- .gitignore agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/AGENTE_DEV.md && rm -f package.json .nvmrc package-lock.json`.

### 8. Al terminar

Reporte FLUJO_AGENTES §5 (gates de contratos: no aplica, no se toca `contracts/`; output de `npm install` en su
lugar). Sin commits. Commit que propondrá el MID: `tooling: add npm workspaces root and .nvmrc with Node 26 (#2)`.

---

## TASK-3: Baseline verde y documentación del layout nuevo — área: docs (+ gates de contracts)

### 1. Historia de usuario del task

**Como** agente o persona que arranca una sesión en el repo, **quiero** que `agents.md`, STATUS y los prompts de
rol describan el layout real (`contracts/`) y el primer baseline verde con su SHA, **para** no seguir
instrucciones de archivos que ya no existen y poder medir cero delta desde #3.

### 2. Contexto

Tras TASK-1/TASK-2 (commiteados por el orquestador), los docs siguen citando el layout viejo (salida actual del
`git grep` de coherencia): `agents.md:18, 29, 60, 142, 144, 146, 230` y `STATUS.md:38-39, 58, 59`; además
`AGENTE_MAYOR.md:76` (`sources/*/README.md`), `AGENTE_MID.md:66`, `ESTANDARES.md:7`, los gotchas `GamePool`/`escrow`
(`agents.md:147-149`) y las subcarpetas (`agents.md:157-158`). La fila Framework (`STATUS.md:30`) y el gotcha de
`agents.md:151-153` dicen "el framework de testnet", inexacto desde que testnet pasó a la PV 140 (H13).

### 3. Qué implementar

**Gates primero:** anotar `git rev-parse --short HEAD` (con TASK-1 y TASK-2 commiteados) y repetir los 3 gates de
TASK-1 §5.3 **sin** `--coverage` desde `contracts/`. Pegar outputs íntegros. Tras los gates, `git status --porcelain`
→ aparte de los artefactos del ciclo en `documents/`, nada (si `contracts/Move.lock` aparece modificado: contingencia
de T1, declarar y parar). Si los conteos difieren de TASK-1, es un hallazgo: reportarlo.

**Regla de redacción:** las rutas viejas solo se citan dentro de `git show f063a0e:<ruta>`.

`documents/STATUS.md`:
- **Baselines de gates:** reemplazar las filas de `contracts (raíz) @ e1849c6` (líneas 38-40) por
  `contracts/ @ <SHA anotado>` (`master` tras #2), CLI `1.83.0`, fecha, con los 3 gates medidos (exit, errores,
  warnings y lints por archivo y código, "0 tests"). Conservar la frase "Cero delta = mismos errores y mismos
  conteos por archivo".
- **Toolchain:** fila "Framework" (línea 30) → "`std`/`sui` implícitas; fijados por `Move.lock` v4 a
  `719fb2960ccfbf9f4d33041f8ea5146d30671696`, el piso de la PV **139**; testnet en **140** desde la época 1269
  (2026-10-30 21:24 UTC) → H13. Sin repin en #2 (rename puro)". Fila "Gates" (línea 32): agregar "desde
  `contracts/` (`cd contracts && …`)".
- **Punto de partida:** fila 3 (línea 15) → "⬜ stub retirado en #2; se crea en #5"; fila 5 (línea 17) → "⬜ sin
  tests (el archivo comentado se retiró en #2)".
- **Hallazgos:**
  - H6 (línea 56): acción → "✅ 2026-10-30 (#2): archivo retirado; `battleship::game` se crea desde cero en #5".
  - H7 (línea 57): acción → "→ #5 (diseño 2025 retirado con el archivo; `git show f063a0e:sources/Game/game.move`)".
  - H8 (línea 58): reescribir como "✅ 2026-10-30 (#2): borrado (D-20261030-10); se recupera con
    `git show f063a0e:sources/battleship.move` (#18)".
  - H9 (línea 59): "🚧 parcial (#2): el test comentado se retiró (`git show f063a0e:tests/battleship_tests.move`);
    suites en #4–#6".
  - H12 (línea 62): ruta → `contracts/sources/house.move:67`.
  - **H13** (nueva fila, área toolchain): "testnet en PV `<PV medida>` (`05ad86a3e86c522deea116f80dc2bf2309a53363`
    para 140) y el lock en el piso de 139 (`719fb29…`). La CLI no repinea ni avisa por sí sola (solo con
    `update-deps`, al cambiar las dependencias del manifest, con un digest de dependencia distinto o con otro `-e`;
    publish solo compara la CLI con la red). | Pre-vuelo de #8 (comentado en el issue): (1) CLI del canal testnet
    con PV máxima ≥ PV de testnet (si no, `suiup` y registrar en Toolchain); (2) `cd contracts && printf 'n\n' |
    sui move update-deps -e testnet`; (3) delta del lock declarado y gates re-medidos".

`agents.md`:
- §1 (líneas 17-18): "… El borrador 2025 de esos tipos se retiró del paquete en #2; se recupera con
  `git show f063a0e:sources/battleship.move` (#18)."
- §2 (líneas 29-30): quitar "la reestructura es un issue propio; hasta que se mergee, el paquete Move sigue en la
  raíz (…)" y decir: "`contracts/`, `package.json` y `.nvmrc` existen desde #2; `app/` (#9), `.github/workflows/`
  (#3), `contracts/tests/` (#4) y `contracts/deployments/` (#7) llegan con su issue".
- §3 (línea 60): "### Contratos (desde `contracts/`)" + una línea debajo: "Los gates se corren con
  `cd contracts && printf 'n\n' | sui move …` (equivalente: `--path contracts` desde la raíz)."
- §7: borrar las viñetas de las líneas 142-146 (`game.move`, `battleship.move`, test comentado), 147-149
  (`GamePool`, `escrow: u64`) y 157-158 (subcarpetas). La de `EInsufficientBalance` (línea 150) queda con la ruta
  `contracts/sources/house.move:48,69`. La de "Framework fijado por `Move.lock`" (151-153): "… los pinea al SHA del
  piso de la PV de testnet vigente **al repinear**; la CLI no repinea ni avisa por sí sola (STATUS H13). Todo delta
  del lock en un diff se declara y justifica (PROY-11)."
- §8 (línea 168): "**`battleship::game`** — no existe hasta #5 (el stub 2025 se retiró en #2). Objetivo: …" (resto igual).
- §9 (líneas 174-175): "… · (futuro, #18) `Board`/`Ship`/`Coordinate` del borrador 2025
  (`git show f063a0e:sources/battleship.move`)."
- §14: borrar la fila de la línea 230 (`sources/House/README.md`, `sources/Game/README.md`); fila de
  `contracts/README.md` → "(a crear en #4) Tablas de funciones, eventos y abort codes".

`documents/agentes/AGENTE_MAYOR.md:76-78`: "No se generan specs. Los READMEs de diseño de 2025 se retiraron en #2
(recuperables con `git show f063a0e:sources/House/README.md` y `…/Game/README.md`); si se consultan, son contexto,
no contrato: se verifican contra el código y contra `ESTANDARES.md` antes de citarlos (p. ej. sus "pools" de
estados contradicen PROY-6)."

`documents/agentes/AGENTE_MID.md:66`: "Del issue se pasa directo al plan. Los READMEs de diseño de 2025 se retiraron
en #2 (`git show f063a0e:`); si se consultan, son contexto a verificar."

`documents/ESTANDARES.md:7`: "> **Código legado:** el código de 2025-03 que sigue en el árbol (`house.move`) no
cumple varias reglas (STATUS §Hallazgos); `game.move` y `battleship.move` se retiraron en #2. Las reglas aplican a
todo código **nuevo o tocado**." (No cambia la versión: queda en la v1.2 de TASK-2.)

### 4. Archivos a tocar / NO tocar

- **Tocar:** `documents/STATUS.md`, `agents.md`, `documents/agentes/AGENTE_MAYOR.md`,
  `documents/agentes/AGENTE_MID.md`, `documents/ESTANDARES.md` (línea 7).
- **NO tocar:** código, `contracts/**`, `package.json`, `.nvmrc`, `README.md` raíz (H10 → #16),
  `documents/DECISIONES.md`, las secciones de STATUS que mantiene el orquestador (ciclo activo, planes pendientes,
  pendientes del usuario, mergeadas).

### 5. Tests / verificaciones obligatorias (output pegado)

1. Los 3 gates con el SHA anotado (ver §3), en verde y con los mismos conteos que TASK-1.
2. Coherencia del layout (N2):
   `git grep -nE "(^|[^/])sources/(House|Game|battleship|\*)|tests/battleship|hoy la raíz|hasta que se mergee" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'`
   → **cada línea** que salga contiene `f063a0e:` (citas de recuperación). Pegar el output.
3. Coherencia de Node: repetir la verif. 5 de TASK-2 → mismo resultado (solo `ESTANDARES.md:83` y `STATUS.md:51`).
4. SEG-3: `git diff HEAD | grep -ciE 'recovery phrase|suiprivkey|mnemonic'` → `0`.

Tests nuevos: ninguno; `sui move test` reporta 0 tests.

### 6. Smoke

No aplica.

### 7. Criterios de aceptación

- Gates repetidos sobre el SHA anotado, en verde y sin delta respecto de TASK-1.
- STATUS: baseline nuevo con SHA; Toolchain (Framework, Gates) corregida; roadmap filas 3 y 5; H6/H7/H8/H9/H12
  actualizados; H13 con dueño (pre-vuelo de #8).
- `agents.md` §1/§2/§3/§7/§8/§9/§14, `AGENTE_MAYOR.md` §M2, `AGENTE_MID.md:66` y `ESTANDARES.md:7` coherentes con
  el árbol; verificaciones 2-4 con el output esperado.
- Rollback: `git checkout -- agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/`.

### 8. Al terminar

Reporte FLUJO_AGENTES §5, con el snippet de STATUS ya aplicado (indicar las filas cambiadas). Sin commits. Commit
que propondrá el MID: `docs: record first green baseline and contracts/ layout (#2)`. Con este task cerrado, el MID
propone el body del PR (`Closes #2`, D-20261030-10, T1–T5, desviación de coverage, H13 → #8).
