# PLAN_MONOREPO v1.1
> Issue: #2 | Áreas: contracts (layout), tooling, docs | Fecha: 2026-10-30 | Branch: `feature/issue-2-monorepo` (desde `master` @ `c9536b4`)
> Autor: MID · Estado: v1 **aprobado con cambios** por el MAYOR (`documents/REVISION_PLAN_MONOREPO.md`, sin
> BLOCKER/MAJOR). v1.1 aplica los MINOR 1-8 y las sugerencias 9-11 (la 11 como nota para #3). **T1-T5 aprobadas.**
> **STOPs resueltos (D-20261030-10):** STOP-1 = (a) borrar `battleship.move`; STOP-2 = (a) borrar los READMEs de
> 2025; STOP-3 = (b) Node 26.
>
> Decisión (2026-10-30): se optó por las recomendaciones del plan en STOP-1/2/3 — aprobado por el usuario ("sí a todo lo recomendado").

## Historia de usuario

**Como** desarrollador del proyecto (DEV que implementa House y Game, y owner que revisa los PRs),
**quiero** que el paquete Move viva en `contracts/` con un layout plano, sin código legado ni código que no
compila, y que la raíz del repo sea un workspace npm con la versión de Node fijada, **para** tener por
primera vez un `sui move build` / `sui move test` en verde en `master`, que la CI (#3) pueda gatear cada PR
de House (#4) y Game (#5, #6), y que la app (#9) tenga dónde nacer.

**Scope en una frase:** mover el paquete a `contracts/` con historial (rename puro de `house.move`),
retirar el legado y lo que no compila según lo que decida el usuario, crear `package.json` raíz + `.nvmrc`,
completar el `.gitignore` del monorepo, registrar el primer baseline verde y actualizar la documentación que
cita el layout viejo.
**Lo que NO entrega:** cambios de lógica en `house.move` ni arreglo de sus warnings/lints (#4); el módulo
`battleship::game` (#5); `contracts/README.md` (#4); `contracts/tests/` (#4) ni `contracts/deployments/` (#7);
`app/` (#9); CI (#3); dependencias npm; actualizar el framework a una versión de protocolo nueva (T1/H13 → pre-vuelo de #8).

## Contexto y alcance

**Estado verificado el 2026-10-30 (inspección, sin compilar):**

| Hecho | Evidencia |
|---|---|
| El paquete vive en la raíz | `Move.toml`, `Move.lock`, `sources/`, `tests/` en `/`; `agents.md:29-30` |
| Subcarpetas contra el layout plano de PROY-1 | `sources/House/house.move`, `sources/Game/game.move`; `ESTANDARES.md:61` |
| `game.move` no compila (H6) y todo su diseño se reemplaza (H7) | `sources/Game/game.move:54-62` (`GameRequest` sin campos); `GamePool` 15-18, `TurnCap` 21-24, `GameRequest` 30-39, `init` 41-50 |
| `battleship.move` legado sin uso y no compila (H8) | tipos `battleship.move:7-55`; `new_game` (`:58-65`) mueve `player1` (60) y lee `player1.addr` (62) → `EC06002` en el baseline de #1 (`STATUS.md:38`) |
| Test comentado (H9) | `tests/battleship_tests.move:1-18` dentro de `/* */` |
| READMEs de diseño 2025 contradicen los estándares | pools por estado `sources/Game/README.md:91-96` (y "Pool Management" en 18-19, 31-32, 44-45, 57-58) vs PROY-6; "store under the admin's address" `sources/House/README.md:37` vs House compartida |
| `house.move` no depende de los módulos a retirar | `sources/House/house.move:8-11` (solo `sui::*`) |
| `.gitignore` con patrones **anclados a la raíz** | `.gitignore:1-2` (`build/*`, `traces/*` llevan `/` en medio ⇒ git los ancla al directorio del `.gitignore`: tras la mudanza **no** cubren `contracts/build/`; comprobado por el MAYOR con `git check-ignore`) |
| No hay `package.json` ni `.nvmrc` | `ls -a` de la raíz |
| El diseño 2025 es recuperable | `f063a0e` contiene `sources/{battleship.move,Game/*,House/*}` y `tests/battleship_tests.move` (`git ls-tree f063a0e`); #18 ya cita `git show f063a0e:sources/battleship.move` "retirado del paquete en #2" |
| Node instalados: 20.20.2, 22.23.4, 26.13.0 (default de la máquina: 26) | `ls ~/.nvm/versions/node/`; `agents.md:52` |

**Qué hace la CLI 1.83 con `Move.lock` (código del tag `testnet-v1.83.0`, leído con `gh api`; validado por el MAYOR):**

- Al cargar, la CLI compara el `manifest_digest` de cada pin del lock con el recalculado; si coinciden, usa
  el lock tal cual y **no repinea** (`external-crates/move/crates/move-package/src/graph/builder.rs:100-131`;
  si no coinciden emite la nota "Updating dependencies for `testnet` environment because … has been changed").
- El digest se calcula **solo sobre las dependencias del manifest**: `[dependencies]` + `[dep-replacements]` +
  las implícitas (`package/package_impl.rs:327-348`, `RepinTriggers { deps }`; conversión en
  `dependency/combine.rs:208-221`). Las implícitas entran como `{ system = "sui" }` / `{ system = "std" }` con
  override (`schema/manifest.rs:160-173`): **ni la ruta del paquete ni el SHA del framework** forman parte del
  digest. El pin del root es `[pinned.testnet.battleship]` / `source = { root = true }` (`Move.lock:19-20`),
  también independiente de la ruta.
- **Únicos disparadores de repin:** cambiar las dependencias del manifest; un digest de manifest de dependencia
  que no coincide (`graph/builder.rs:122-129`); un `-e` de otro entorno (sección `[pinned.<env>]` nueva); o
  `sui move update-deps` (`cli/update_deps.rs:48-55`, `force_repin`). Editar `[package]` (`license`, `edition`,
  `authors`) **no** repinea (corrige el supuesto de que `license` en #16 podía repinear).
- **La CLI nunca avisa de que el lock va atrasado:** con un lock válido, build/test no consultan la versión de
  protocolo (`system_deps` solo se llama al pinear, `sui-package-alt/src/sui_flavor.rs:179-199`); publish/upgrade
  solo avisan si la PV máxima de la CLI + 2 < la PV de la red (`crates/sui/src/client_commands.rs:3892-3913`),
  nunca comparan el lock con la red.
- **Consecuencia para #2:** mover `Move.toml`/`Move.lock` sin cambiar su contenido **no** repinea: el lock
  esperado es **byte a byte idéntico** (rename 100 %, pin `719fb2960ccfbf9f4d33041f8ea5146d30671696`).
- **Hecho nuevo (→ T1 y H13):** testnet está hoy en la **versión de protocolo 140** (GraphQL
  `graphql.testnet.sui.io`: época 1269, inicio 2026-10-30 21:24 UTC; las épocas 1266-1268 estaban en 139). Su
  piso en `crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.83.0` es
  `05ad86a3e86c522deea116f80dc2bf2309a53363`; **140 es también la PV máxima que conoce la CLI 1.83**. Si testnet
  pasa de 140, un repin con esta CLI tomaría en silencio el SHA de la 140 (`system_package_versions.rs:61-69`,
  `range(..=version).next_back()`).

**Artefactos de coverage/trace (criterio del `.gitignore`)** — `move-cli/src/base/test.rs:230-256` @ `testnet-v1.83.0`:
`--coverage` escribe trazas en `<paquete>/traces/` (`move-unit-test/src/lib.rs:35`, `TRACE_DIR = "traces"`)
y el mapa en `<paquete>/.coverage_map.mvcov` (`move-command-line-common/src/files.rs:63`). **Con 0 tests la
CLI no escribe el mapa** (`test.rs:253`, `if compute_coverage && !no_tests`).

> **Desviación del criterio del issue (declarada):** el issue pide "verificar nombres reales con
> `sui move test --coverage`". Con 0 tests eso no es posible; en #2 los nombres se toman del código citado y la
> corrida de `--coverage` solo comprueba que nada aparezca como `??`. **Gancho en #4** (comentario del
> orquestador en el issue): "tras la primera corrida de `sui move test -e testnet --coverage` con tests,
> `git status --porcelain --ignored` muestra `contracts/.coverage_map.mvcov` y `contracts/traces/` solo como `!!`".
> Esta desviación se repite en el body del PR.

**Alcance:** `Move.toml`, `Move.lock`, `sources/**`, `tests/**` (mudanza y retiros), `.gitignore`,
`package.json` y `.nvmrc` nuevos, y docs: `agents.md`, `documents/STATUS.md`, `documents/agentes/AGENTE_MAYOR.md`,
`documents/agentes/AGENTE_MID.md` (1 línea), `documents/agentes/AGENTE_DEV.md` (1 línea), `documents/ESTANDARES.md`
(línea 7 y, si STOP-3 ≠ (a), PROY-17 + versión).
**Fuera de alcance:** lógica de `house.move` (#4, incluido H12 y cualquier warning nuevo), `contracts/README.md`
(#4), carpetas vacías `contracts/tests/` y `contracts/deployments/` (#4, #7), `app/` (#9), CI (#3), dependencias
npm, `package-lock.json` (T3), repin del framework (T1/H13 → pre-vuelo de #8), `README.md` raíz (H10 → #16).
**Smoke: no aplica** — reestructura sin flujo ejecutable; la verificación es build/test y `npm install`.

## Contrato on-chain

- **`battleship::house`:** sin cambios (rename puro, cero líneas tocadas).
- **`battleship::game` (`sources/Game/game.move`):** se elimina del paquete; renace desde cero en #5.
- **`battleship::battleship`:** depende de STOP-1: con (a) o (b) sale del paquete; con (c) queda en
  `contracts/sources/` con el fix de `new_game`.
- **Impacto:** el paquete **no está publicado** (no hay `Published.toml` ni `deployments/`), así que no hay
  compatibilidad de upgrade que cuidar (PROY-10). `app/src/sui/` no existe. Lo que sí define este issue es
  **qué módulos llegarían a la primera publicación**; por eso STOP-1 es del usuario.

## Flujo de fondos

No aplica (ningún camino de SUI cambia; `house.move` no se toca).

## Decisiones abiertas → STOP (usuario)

### STOP-1 — Destino de `sources/battleship.move` (Decisión abierta 1 del issue) — **decide el usuario**

**Problema:** legado sin uso (`battleship.move:7-55`) que no compila (`:60-62`, `EC06002`, H8) y aporta
9 de los 16 `WC09009` del baseline (`STATUS.md:38`). Decide qué módulos quedan en el paquete que se publicará.

| Opción | A favor | En contra |
|---|---|---|
| (a) Borrarlo (`git rm`) | LIM-3 (cero código muerto); build verde sin tocar el código; recuperable con `git show f063a0e:sources/battleship.move`, que #18 ya cita como "retirado del paquete en #2" | El diseño 2025 deja de verse en el árbol (solo en git) |
| (b) Moverlo sin arreglar a una carpeta no compilada (`contracts/future/battleship.move`) | Queda visible para #18 | Código muerto en el árbol (LIM-3); no compila, así que nadie detecta que se pudre; un `git mv` futuro a `sources/` rompería el build |
| (c) Arreglar `new_game` y dejarlo en `contracts/sources/` | Tipos disponibles en el paquete | Al publicar en #8 se **congelan** los layouts de `Coordinate`, `Ship`, `Board`, `Player` y `Game` (todos con `store`) y la firma `public fun new_game`: con upgrades compatibles, #18 no podría agregarles campos y tendría que crear tipos nuevos (PROY-10). Además, ~9 `WC09009` en el baseline y es trabajo de #18 (fuera de alcance) |

**Recomendación (MID y MAYOR): (a).**

### STOP-2 — Destino de `sources/House/README.md` y `sources/Game/README.md` (Decisión abierta 2 del issue) — **a ratificar por el usuario**

**Problema:** notas de diseño 2025 que contradicen los estándares vigentes: pools por estado
(`sources/Game/README.md:91-96`, y la "Pool Management" de 18-19, 31-32, 44-45, 57-58) vs PROY-6/SEG-7;
"store under the admin's address" (`sources/House/README.md:37`) vs House compartida (D-20261030-06,
`agents.md` §4). Su contenido útil ya está en los criterios de #4–#6.

| Opción | A favor | En contra |
|---|---|---|
| (a) Borrarlos | Una sola fuente de verdad (issues + `contracts/README.md` de #4); nada que contradiga PROY-6 en el árbol; recuperables con `git show f063a0e:sources/{House,Game}/README.md` | Se pierde la referencia rápida al diseño original |
| (b) Moverlos a `contracts/docs/design-2025/` | Histórico a mano | Documentación que contradice los estándares en el árbol; hay que marcarla como obsoleta y mantener ese aviso |

**Recomendación (MID y MAYOR): (a)** — respuesta técnica clara (sin efecto on-chain, fondos ni seguridad), pero
el issue la declara STOP: **a ratificar por el usuario**.

### STOP-3 — Confirmar las convenciones que D-20261030-03 dejó para este plan (carpetas, npm, **versión de Node**) — **decide el usuario**

**Problema:** D-20261030-03 dice: "Nombres de carpetas, npm y Node 22 propuestos por el orquestador; se
confirman en el plan del issue de reestructura". Carpetas (`contracts/`, `app/`) y npm workspaces no tienen
objeción: todo el backlog (#3–#18) ya los usa. **Node 22 sí:** según el calendario oficial
(`nodejs/Release/schedule.json`, consultado 2026-10-30) Node 22 está en *maintenance* y llega a **EOL el
2027-04-30** (dentro de 6 meses); Node 24 es *maintenance* desde 2026-10-20 hasta 2028-04-30; Node 26 entró en
**Active LTS el 2026-10-28** (maintenance 2027-10-20, EOL 2029-04-30) y es el `node` por defecto de esta máquina
(`agents.md:52`). `engines` vigentes verificados por el MAYOR (vite 8.3.5 `^20.19.0||>=22.12.0`, vitest 5.0.5
`^22.12.0||^24.0.0||>=26.0.0`, `@mysten/sui` 2.38.0 `>=22`): las tres opciones son viables. Ningún issue de
contratos (#2–#8) usa Node; el riesgo empieza en #9. El criterio del issue fija `.nvmrc` = `22`: cambiarlo es
alcance → usuario.

| Opción | A favor | En contra |
|---|---|---|
| (a) **Node 22** (lo que dice el issue) | Cero desvío del issue; PROY-17 y STATUS sin cambio de versión | EOL en abril de 2027: la app de #9 nace sobre un runtime a punto de vencer; migrar antes de 2027-04-30 |
| (b) **Node 26** (Active LTS) | Soporte hasta 2029-04; ya instalado y es el default de la máquina | LTS de hace 2 días; PROY-17 cambia (ESTANDARES → v1.2) y se registra una decisión que enmienda D-03 |
| (c) **Node 24** (maintenance LTS) | Muy probado; soporte hasta 2028-04 | Hay que instalarlo (`nvm install 24`); mismo costo de docs que (b) sin sus ventajas |

**Recomendación (MID; el MAYOR la considera la técnicamente más sana): (b) Node 26**, confirmando `contracts/`,
`app/` y npm workspaces tal cual. (a) sigue siendo válida si el usuario prefiere no desviarse del issue.

**Para presentar junto a los STOP (información, no STOP):** H13 (lock en el framework de la PV 139, testnet en
140; repin en el pre-vuelo de #8) es consecuencia directa de D-20261030-08, que sigue pendiente de ratificación
del usuario (`STATUS.md:108`).

## Decisiones técnicas (✅ aprobadas por el MAYOR)

> Decisión (2026-10-30) **T1:** `Move.lock` se mueve sin repin (rename 100 %, pin `719fb29…` = piso de PV 139)
> sobre forzar `sui move update-deps -e testnet` a PV 140 (`05ad86a…`), porque la mudanza no cambia el digest
> (§Contexto) y D-20261030-08 fija el framework por el lock; un bump de framework en el mismo PR quitaría lo
> binario a la verificación "rename puro". Regla precisa: **la CLI no repinea ni avisa por sí sola**; el
> framework solo se actualiza con `printf 'n\n' | sui move update-deps -e testnet` (o al cambiar las
> dependencias del manifest), y ese delta del lock se declara (PROY-11). Repinear exige una CLI del canal
> testnet cuya PV máxima sea ≥ la PV de testnet. **Contingencia:** si un gate de #2 **sí** repinea (nota
> "Updating dependencies…" o `cmp` distinto), el DEV no revierte: corre la verificación 4 de TASK-1 con la guarda
> `PV ≤ MAX`, declara el delta (PROY-11) y para hasta la revisión del MID; si `PV > MAX`, lo declara como "CLI
> desactualizada" y también para.

> **H13 (dueño: pre-vuelo de #8; el MAYOR lo comenta en #8):** "(1) CLI del canal testnet con PV máxima ≥ la
> PV de testnet (si no, `suiup` y registrar en Toolchain); (2) `cd contracts && printf 'n\n' | sui move
> update-deps -e testnet`; (3) delta del lock declarado y gates re-medidos."

> Decisión (2026-10-30) **T2:** los patrones del paquete en el `.gitignore` se anclan a `contracts/`
> (`contracts/build/`, `contracts/traces/`) y se quitan `build/*` y `traces/*` de la raíz, porque un patrón
> con `/` intermedio se ancla al directorio del `.gitignore` y tras la mudanza no existe paquete en la raíz.
> `.trace`, `.coverage*` y `Pub.*.toml` se mantienen sin anclar (plantilla de la CLI 1.83, `move-cli/src/base/new.rs:62`).

> Decisión (2026-10-30) **T3:** no se commitea `package-lock.json` en #2, porque sin dependencias no fija nada y
> #9 lo regenera con las primeras dependencias (`npm ci` de `agents.md` §3 recién aplica con `app/`). `npm install`
> lo crea (comprobado por el MAYOR con Node 22 y 26): se borra y se declara.

> Decisión (2026-10-30) **T4:** además de lo que lista el issue, TASK-3 quita de `agents.md` §7 los gotchas
> de `GamePool` y `escrow: u64` (líneas 147-149) y ajusta `agents.md` §8/§9, `ESTANDARES.md:7` y
> `AGENTE_MID.md:66`, porque citan código que deja de existir (PROY-20). Los antipatrones siguen cubiertos por
> PROY-6/SEG-4/SEG-7 y por H7 en STATUS.

> Decisión (2026-10-30) **T5:** forma canónica de los gates de contratos = `cd contracts && printf 'n\n' | sui move …`
> (como piden el issue y #3) sobre `--path contracts` desde la raíz; `--path` se menciona en `agents.md` §3 como
> equivalente (`reroot_path` hace `set_current_dir` a la raíz del paquete, `move-cli/src/base/mod.rs:21-30`).

## Tasks (ordenados por dependencia)

**Precondiciones comunes:** STOP-1, STOP-2 y STOP-3 resueltos y registrados (el handoff fija la opción de
cada uno; **ningún task se ejecuta con un STOP abierto**). Shell en la raíz del repo, branch
`feature/issue-2-monorepo`. **Artefactos del ciclo:** `documents/*_MONOREPO.md` (plan, revisión, handoff,
reportes) pueden aparecer como `??` o modificados en cualquier `git status`; no son desvíos. Toda invocación de
`sui` con `printf 'n\n' |` delante; nada de `sui client` salvo `active-env`; nunca leer ni pegar `client.yaml`,
`sui.keystore` ni `sui.aliases`. Gates siempre con `-e testnet`; exit code con `${PIPESTATUS[1]}`. Outputs a
`<scratch>/` del DEV (fuera del repo).

### TASK-1: Mover el paquete a `contracts/`, resolver el legado según STOP-1/STOP-2 y medir el primer verde — área: contracts

**Depende de:** STOP-1 y STOP-2.

- **Entregable:** paquete en `contracts/` con layout plano (`Move.toml`, `Move.lock`, `sources/house.move` y,
  solo con STOP-1 (c), `sources/battleship.move`), sin `game.move` ni test comentado; legado y READMEs según la
  opción elegida; `.gitignore` con los patrones Move del monorepo; los gates corridos desde `contracts/`.
- **Cambios comunes (cualquier opción):**
  1. `printf 'n\n' | sui client active-env` → `testnet` (si aborta, parar).
  2. ```bash
     mkdir -p contracts/sources
     git mv Move.toml contracts/Move.toml
     git mv Move.lock contracts/Move.lock
     git mv sources/House/house.move contracts/sources/house.move
     git rm sources/Game/game.move tests/battleship_tests.move
     ```
     Sin carpetas placeholder (`contracts/tests/`, `contracts/deployments/` no se crean; sin `.gitkeep`).
     **No tocar** el contenido de `house.move`, `Move.toml` ni `Move.lock`; docs (TASK-3).
  3. `.gitignore` — reemplazar `build/*` y `traces/*` por la sección Move (la sección raíz la completa TASK-2):
     ```gitignore
     # Paquete Move (contracts/) — plantilla de `sui move new` 1.83 adaptada al monorepo
     contracts/build/
     contracts/traces/
     .trace
     .coverage*
     Pub.*.toml
     contracts/deployments/localnet.json
     ```
- **Cambios según STOP-1 (aplicar solo la fila elegida):**

  | Opción | Comandos | Efecto esperado |
  |---|---|---|
  | (a) | `git rm sources/battleship.move` | Sale del paquete |
  | (b) | `mkdir -p contracts/future && git mv sources/battleship.move contracts/future/battleship.move` | Rename 100 %; `contracts/future/` no es carpeta de fuentes del paquete: el build no debe mencionarla |
  | (c) | `git mv sources/battleship.move contracts/sources/battleship.move` y, en `new_game`, leer la dirección antes de mover `player1`: agregar `let current_turn = player1.addr;` como primera línea del cuerpo y usar `current_turn,` en el literal (únicos cambios) | Rename con modificación (2 líneas); el módulo compila y entra en el paquete |

- **Cambios según STOP-2 (aplicar solo la fila elegida):**

  | Opción | Comandos |
  |---|---|
  | (a) | `git rm sources/House/README.md sources/Game/README.md` |
  | (b) | `mkdir -p contracts/docs/design-2025 && git mv sources/House/README.md contracts/docs/design-2025/house.md && git mv sources/Game/README.md contracts/docs/design-2025/game.md` (sin editar contenido; el aviso de obsolescencia va en `agents.md` §14, TASK-3) |

- **Verificaciones (output pegado en el reporte):**
  1. Layout: `git ls-files | grep -v '^documents/'` → `.gitignore`, `README.md`, `agents.md`,
     `contracts/Move.toml`, `contracts/Move.lock`, `contracts/sources/house.move` **más** lo que agregue la opción:
     STOP-1 (b) `contracts/future/battleship.move`, (c) `contracts/sources/battleship.move`; STOP-2 (b)
     `contracts/docs/design-2025/{house,game}.md`. Y `test -e sources || test -e tests || echo ok` → `ok`.
  2. Renames: `git diff -M --stat master` y `git diff -M --summary master | grep rename` → `rename … (100%)` para
     `Move.toml`, `Move.lock` y `{sources/House => contracts/sources}/house.move` (con `| 0` en `--stat`), más:
     STOP-1 (b) `battleship.move` (100 %), (c) `battleship.move` con similitud < 100 % y su diff de 2 líneas pegado;
     STOP-2 (b) los 2 READMEs (100 %).
  3. Gates, desde `contracts/`:
     ```bash
     cd contracts
     printf 'n\n' | sui move build -e testnet 2>&1 | tee <scratch>/build.txt; echo "exit=${PIPESTATUS[1]}"
     printf 'n\n' | sui move build -e testnet --lint 2>&1 | tee <scratch>/lint.txt; echo "exit=${PIPESTATUS[1]}"
     printf 'n\n' | sui move test -e testnet 2>&1 | tee <scratch>/test.txt; echo "exit=${PIPESTATUS[1]}"
     printf 'n\n' | sui move test -e testnet --coverage 2>&1 | tee <scratch>/cov.txt; echo "exit=${PIPESTATUS[1]}"
     cd ..
     ```
     Pegar los 4 outputs íntegros. Contar errores y warnings **por archivo y código** (`WC…`, `WSL…`). Con STOP-1
     (b): `grep -c future <scratch>/build.txt` → `0`.
  4. Lock sin delta y registro del día para H13:
     ```bash
     cmp <(git show master:Move.lock) contracts/Move.lock && echo identico
     grep -c "Updating dependencies" <scratch>/build.txt                  # 0
     PV=$(curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' \
       -d '{"query":"{ epoch { protocolConfigs { protocolVersion } } }"}' | jq -r .data.epoch.protocolConfigs.protocolVersion)
     echo "$PV"                                                            # entero (hoy 140)
     gh api "repos/MystenLabs/sui/contents/crates/sui-framework-snapshot/manifest.json?ref=testnet-v1.83.0" \
       -H "Accept: application/vnd.github.raw" > <scratch>/manifest.json
     MAX=$(jq 'keys|map(tonumber)|max' <scratch>/manifest.json); echo "$MAX"   # PV máxima de la CLI (140)
     [ "$PV" -le "$MAX" ] || echo "CLI desactualizada: PV $PV > $MAX"
     jq -r --argjson pv "$PV" '[to_entries[] | select((.key|tonumber) <= $pv)] | max_by(.key|tonumber) | .value.git_revision' <scratch>/manifest.json
     ```
     Si el lock cambió o salta la guarda: contingencia de T1 (declarar y parar).
  5. Ignorados: `git status --porcelain --ignored` → aparte de los artefactos del ciclo en `documents/`, solo
     `!! contracts/build/` (y lo que haya generado `--coverage`, siempre como `!!`, nunca como `??`).
     `git check-ignore -v contracts/build/x contracts/traces/x contracts/.coverage_map.mvcov contracts/Pub.testnet.toml contracts/deployments/localnet.json`
     → los 5 ignorados; `git check-ignore contracts/Published.toml contracts/deployments/testnet.json; echo $?` → `1`.
  6. SEG-3: `grep -ciE 'recovery phrase|Generated new keypair' <scratch>/*.txt` → `0` en cada uno; no existen
     `contracts/Published.toml` ni `Pub.*.toml`.
- **AuthZ:** no aplica.
- **Criterio de aceptación (DoD):** verificaciones 1-6 en el reporte; `sui move build` exit 0 **sin errores**;
  `sui move test` exit 0 con **0 tests**; `--lint` exit 0 con sus lints contados; lock idéntico (o contingencia
  de T1 aplicada); la desviación del criterio de coverage declarada en "Desviaciones del handoff".
- **Baseline esperado (pronóstico; lo que se registra es lo medido):** build 🟢 sin errores. Desaparecen los 7
  errores de #1 y los 7 `WC09009` de `game.move`. Con STOP-1 (a)/(b) desaparecen también los 9 `WC09009` de
  `battleship.move` (warnings esperados: 0); con (c) se esperan ~9 `WC09009` en `contracts/sources/battleship.move`
  (inferencia: campos nunca leídos). Lint: al menos `WSL06010` en `contracts/sources/house.move:67` (H12); puede
  aparecer alguno más ahora que el paquete compila entero. Test 🟢 0 tests. **Cualquier warning o lint de
  `house.move` se registra, no se arregla** (#4).
- **Tests esperados:** ninguno (0 tests es el estado correcto hasta #4).
- **Riesgos / rollback:** (i) build en rojo con un error no previsto ⇒ parar y reportar (no tocar código salvo el
  fix de STOP-1 (c)). (ii) Sin red no se obtiene la PV del día: el gate igual corre (no repinea); reportarlo.
  (iii) Rollback: `git reset --hard HEAD` en la branch (el task aún no está commiteado; los artefactos del ciclo
  sin commitear se respaldan antes).
- **Commit propuesto (tras revisión):** `contracts: move package to contracts/ and retire legacy code (#2)` —
  cuerpo: rename puro de `house.move`/manifest/lock (lock sin repin, T1); retiro de `game.move` (H6/H7, renace en
  #5) y del test comentado (H9); `battleship.move` y READMEs 2025 según STOP-1/STOP-2; primer build verde.

### TASK-2: Raíz del monorepo — `package.json`, `.nvmrc`, `.gitignore` general y docs de Node — área: tooling

**Depende de:** STOP-3 (`<NODE>` = `22` con (a), `26` con (b), `24` con (c)).

- **Entregable:** workspace npm raíz sin dependencias, `.nvmrc` con `<NODE>`, `.gitignore` completo y la versión
  de Node escrita en un solo lugar operativo (`.nvmrc`), más PROY-17 y la fila Node de STATUS.
- **Archivos afectados:** `package.json` (nuevo), `.nvmrc` (nuevo), `.gitignore`, `agents.md` (líneas 40, 51-52,
  194), `documents/agentes/AGENTE_DEV.md:17`, `documents/STATUS.md:28`; solo si STOP-3 ≠ (a):
  `documents/ESTANDARES.md` (línea 3 y PROY-17, línea 83). **No tocar:** `contracts/**`; no crear `app/`.
- **Cambios comunes (cualquier opción):**
  - `package.json`:
    ```json
    {
      "name": "sui-battleship",
      "private": true,
      "workspaces": ["app"]
    }
    ```
    > Decisión (2026-10-30): `name` se agrega para que `npm` identifique el workspace raíz; sin `version`,
    > `scripts`, `engines` ni dependencias (las define #9).
  - `.nvmrc`: una línea con `<NODE>` y salto de línea final.
  - `.gitignore` — agregar debajo de la sección Move de TASK-1:
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
  - **`nvm use` sin versión** en los docs operativos, para que el número viva solo en `.nvmrc`, PROY-17 y la fila
    Node de STATUS:
    - `AGENTE_DEV.md:17`: "… y Node (`nvm use`, lee `.nvmrc`)".
    - `agents.md:51-52`: "Node (versión en `.nvmrc`, PROY-17), npm. El `node` por defecto de la máquina puede ser
      otro: correr `nvm use` antes de cada gate".
    - `agents.md:40`: comentario del árbol `.nvmrc # versión de Node (PROY-17)`.
    - `agents.md:194` (§11, fila Node): "Usar la de `.nvmrc` (`nvm use`)".
    - `STATUS.md:28`: "`v<versión medida>` tras `nvm use`" (valor de `node --version` del paso 1).
- **Cambios solo si STOP-3 ≠ (a):** `ESTANDARES.md:83` PROY-17 "Node `<NODE>` (`.nvmrc`)…" y encabezado
  (`ESTANDARES.md:3`) a **v1.2** con fecha y la decisión nueva citada (la que registre STOP-3).
- **Verificaciones (output pegado):**
  1. `source ~/.nvm/nvm.sh && nvm use` (lee `.nvmrc`) y `node --version`, `npm --version` → mayor = `<NODE>`.
  2. `npm install; echo "exit=$?"` desde la raíz **sin** `app/`. **Esperado** (comprobado por el MAYOR con Node 22 y
     26): exit 0, "up to date", sin aviso por el workspace inexistente, **crea `package-lock.json` y no crea
     `node_modules/`**. Después: `rm package-lock.json` (T3, declararlo) y `git status --porcelain --ignored` →
     aparte de los artefactos del ciclo en `documents/`, solo los archivos de este task. **Si `npm install`
     falla** por el workspace: quitar `"workspaces"`, volver a correr (exit 0) y declararlo como desviación
     "`workspaces` se agrega en #9" (nota del issue).
  3. `git check-ignore -v node_modules/x app/dist/x app/.env app/.env.local .env.production foo.log .DS_Store`
     → los 7 ignorados; `git check-ignore app/.env.example; echo $?` → `1`.
  4. `python3 -I -m json.tool package.json` → JSON válido.
  5. `git grep -nE "nvm use 2[0-9]|Node 2[0-9]" -- agents.md documents/ ':!documents/*_MONOREPO.md' ':!documents/DECISIONES.md'`
     → solo PROY-17 y la fila Node de STATUS (y el histórico de H1). Pegar el output.
- **AuthZ:** no aplica.
- **Criterio de aceptación (DoD):** `package.json` con `"private": true` y `"workspaces": ["app"]` (o la
  desviación declarada), `.nvmrc` = `<NODE>`, `npm install` exit 0, sin `package-lock.json` ni dependencias,
  `.gitignore` cubre todos los patrones del criterio del issue (verificaciones 5 de TASK-1 y 3 de TASK-2), docs de
  Node coherentes (verif. 5) y, si STOP-3 ≠ (a), ESTANDARES en v1.2.
- **Tests esperados:** ninguno.
- **Riesgos / rollback:** `git checkout -- .gitignore agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/AGENTE_DEV.md && rm -f package.json .nvmrc package-lock.json`.
- **Commit propuesto:** `tooling: add npm workspaces root and .nvmrc (#2)`.

### TASK-3: Baseline verde y documentación del layout nuevo — área: docs (+ gates de contracts)

**Depende de:** TASK-1 y TASK-2 commiteados; el texto de §1, §9, §14 y H8 depende de STOP-1/STOP-2.

- **Entregable:** baseline del primer verde registrado con SHA; docs sin referencias al layout viejo; H13
  registrado con dueño.
- **Archivos afectados:** `documents/STATUS.md`, `agents.md`, `documents/agentes/AGENTE_MAYOR.md`,
  `documents/agentes/AGENTE_MID.md`, `documents/ESTANDARES.md` (línea 7). **No tocar:** código, `contracts/**`,
  `package.json`, `.nvmrc`, `README.md` raíz (H10 → #16), `documents/DECISIONES.md` (lo registra el orquestador).
- **Gates:** anotar `git rev-parse --short HEAD`, repetir los 3 gates de TASK-1 verif. 3 (sin `--coverage`) desde
  `contracts/` y pegar outputs íntegros. Tras los gates: `git status --porcelain` → aparte de los artefactos del
  ciclo en `documents/`, solo los docs de este task (si un gate modifica `contracts/Move.lock`, es un hallazgo:
  contingencia de T1).
- **Cambios en docs:**
  - `documents/STATUS.md`:
    - **Baselines de gates:** la fila `contracts (raíz) @ e1849c6` (líneas 38-40) se reemplaza por
      `contracts/ @ <SHA de HEAD>` con los 3 gates medidos (exit, errores, warnings y lints por archivo y código;
      "0 tests"). Mantener la frase "Cero delta = mismos errores y mismos conteos por archivo".
    - **Toolchain:** fila "Framework" (línea 30) → "`std`/`sui` implícitas; fijados por `Move.lock` v4 a
      `719fb29…`, el piso de la PV **139**; testnet en **140** desde la época 1269 (2026-10-30 21:24 UTC) → H13.
      Sin repin en #2 (rename puro)"; fila "Gates" → "desde `contracts/`".
    - **Hallazgos:** H6 "✅ 2026-10-30 (#2): archivo retirado; `battleship::game` se crea desde cero en #5"; H7
      "→ #5 (diseño 2025 retirado con el archivo; `git show f063a0e:sources/Game/game.move`)"; H8 según STOP-1:
      (a) "✅ 2026-10-30 (#2): retirado (`git show f063a0e:sources/battleship.move`, #18)", (b) "✅ (#2): fuera del
      paquete en `contracts/future/battleship.move`, sin arreglar (#18)", (c) "✅ (#2): `new_game` arreglado; el
      módulo queda en el paquete (sus tipos se congelan al publicar, #8/#18)"; H9 "🚧 parcial (#2): archivo
      comentado retirado; suites en #4–#6"; H12: ruta `contracts/sources/house.move:67`; **H13** nuevo
      (toolchain): "testnet en PV 140 (`05ad86a…`) y el lock en el piso de 139 (`719fb29…`); la CLI no repinea ni
      avisa por sí sola (repin solo con `update-deps` o al cambiar las dependencias del manifest) | Pre-vuelo de
      #8: (1) CLI del canal testnet con PV máxima ≥ PV de testnet (si no, `suiup` y registrar en Toolchain); (2)
      `cd contracts && printf 'n\n' | sui move update-deps -e testnet`; (3) delta del lock declarado y gates
      re-medidos", con PV y SHA medidos por el DEV en TASK-1.
    - **Punto de partida** (tabla roadmap): fila 3 "⛔ … no compila (H6)" → "⬜ retirado en #2; se crea en #5";
      fila 5 → "⬜ sin tests (el archivo comentado se retiró en #2)".
  - `agents.md`:
    - §1 (líneas 17-18) según STOP-1: (a) "El borrador 2025 de esos tipos se retiró del paquete en #2; se recupera
      con `git show f063a0e:sources/battleship.move` (#18)"; (b) "vive fuera del paquete en
      `contracts/future/battleship.move` (no compila, #18)"; (c) "vive en `contracts/sources/battleship.move`
      (en el paquete; se publica con él)".
    - §2 (líneas 29-30): quitar "la reestructura es un issue propio; hasta que se mergee, el paquete Move sigue
      en la raíz…"; aclarar que `contracts/`, `package.json` y `.nvmrc` existen desde #2 y que `app/` (#9),
      `.github/workflows/` (#3), `contracts/tests/` (#4) y `contracts/deployments/` (#7) llegan con su issue.
    - §3: título "### Contratos (`contracts/`; hoy la raíz)" → "### Contratos (desde `contracts/`)"; una línea:
      "Los gates se corren con `cd contracts && printf 'n\n' | sui move …` (equivalente: `--path contracts` desde
      la raíz)" (T5).
    - §7: quitar los gotchas de líneas 142-146 (`game.move`, `battleship.move`, test comentado), 147-149
      (`GamePool`, `escrow: u64`, T4) y 157-158 (subcarpetas). El de `EInsufficientBalance` (línea 150) queda,
      con ruta `contracts/sources/house.move:48,69`. El de "Framework fijado por `Move.lock`" (líneas 151-153)
      pasa a: "los pinea al SHA del piso de la PV de testnet vigente **al repinear**; la CLI no repinea ni avisa
      por sí sola (ver STATUS H13)".
    - §8 (línea 168): "`battleship::game` — no existe hasta #5 (el stub 2025 se retiró en #2). Objetivo: …".
    - §9 (líneas 174-175) según STOP-1: "(futuro, #18) `Board`/`Ship`/`Coordinate` del borrador 2025" + la
      ubicación de §1.
    - §14 (línea 230) según STOP-2: (a) quitar la fila de `sources/*/README.md`; (b) cambiarla a
      `contracts/docs/design-2025/{house,game}.md` — "histórico 2025, **obsoleto**: contradice PROY-6 y la House
      compartida". Fila `contracts/README.md` → "(a crear en #4)".
  - `documents/agentes/AGENTE_MAYOR.md:76-78`: (a) "Los READMEs de diseño de 2025 se retiraron en #2
    (recuperables con `git show f063a0e:sources/{House,Game}/README.md`); si se consultan, son contexto, no
    contrato: …"; (b) misma frase con la ruta `contracts/docs/design-2025/`. Resto igual.
  - `documents/agentes/AGENTE_MID.md:66`: misma idea en una línea (T4).
  - `documents/ESTANDARES.md:7`: "el código de 2025-03 que sigue en el árbol (`house.move`) no cumple varias
    reglas (`game.move` se retiró en #2; `battleship.move`: según STOP-1)" (T4). Este cambio no toca reglas y no
    sube la versión por sí solo (si TASK-2 ya la subió a v1.2, queda en v1.2).
  - Verificación de coherencia: `git grep -nE "sources/(House|Game)|sources/battleship|tests/battleship|hoy la raíz|hasta que se mergee" -- agents.md documents/ ':!documents/*_MONOREPO.md'`
    → solo menciones con `git show f063a0e:` y las históricas de STATUS (H6-H9, baseline de #1 si se conserva en
    texto). Pegar el output.
- **AuthZ:** no aplica.
- **Criterio de aceptación (DoD):** gates repetidos sobre el SHA anotado, en verde y sin delta respecto de
  TASK-1; STATUS con baseline nuevo, Toolchain/Framework corregida, H6/H7/H8/H9/H12 actualizados y H13 con dueño;
  `agents.md` §1/§2/§3/§7/§8/§9/§14, `AGENTE_MAYOR.md` §M2, `AGENTE_MID.md` y `ESTANDARES.md:7` coherentes con el
  árbol y con las opciones de STOP-1/STOP-2; `git grep` de coherencia pegado; `git diff` sin secretos (SEG-3, el
  DEV lo afirma).
- **Tests esperados:** ninguno; `sui move test` reporta 0 tests.
- **Riesgos / rollback:** `git checkout -- agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/` (no toca los artefactos del ciclo).
- **Commit propuesto:** `docs: record first green baseline and contracts/ layout (#2)`.

**Cobertura del issue:** `git mv` y rename puro → TASK-1 (verif. 2); `game.move` eliminado → TASK-1;
`battleship.move` y READMEs → TASK-1 según STOP-1/STOP-2; test eliminado sin placeholder → TASK-1; build/test en
verde desde `contracts/` → TASK-1 (medición) y TASK-3 (baseline con SHA en STATUS); `Move.lock` regenerado si
cambia → TASK-1 verif. 4 + T1 (no cambia); `package.json` + `.nvmrc` → TASK-2 (+ STOP-3); `.gitignore` →
TASK-1 (Move) y TASK-2 (raíz); nombres de coverage/trace → **desviación declarada** (código citado + gancho en
#4); docs PROY-20 → TASK-2 (Node) y TASK-3 (layout); SEG-3 → TASK-1 verif. 6 y TASK-3. Notas del issue:
`npm install` sin `app/` → TASK-2 verif. 2; sin dependencias npm → TASK-2; warnings de `house.move` se registran,
no se arreglan → TASK-1/3.

## Notas para otros issues (las deja el orquestador o el MAYOR como comentario; sin cambios en #2)

- **#8 (pre-vuelo):** H13 — los 3 pasos de T1 (el MAYOR lo comenta en #8).
- **#4:** gancho de coverage (§Contexto, desviación declarada).
- **#3:** paso informativo de CI que compare el `rev` del lock con el piso de la PV de testnet (el `jq` de
  TASK-1 verif. 4, con la guarda `PV ≤ MAX`), para que H13 sea visible sin depender de nadie (sugerencia 11).

## Decisiones a registrar en `DECISIONES.md` (al cerrar los STOP)

1. STOP-1 (destino de `battleship.move`) — opción elegida por el usuario.
2. STOP-2 (READMEs 2025) — propuesta (a) del MID/MAYOR, ratificada (o no) por el usuario.
3. STOP-3 — confirmación de `contracts/`, `app/`, npm workspaces y la versión de Node (enmienda la nota de
   D-20261030-03); si ≠ (a), cita de la nueva versión de ESTANDARES (v1.2).
4. T1 — `Move.lock` sin repin en la mudanza; la CLI no repinea ni avisa sola; el framework se actualiza en el
   pre-vuelo de #8 (H13). Corrige el supuesto de la revisión de #1 de que `license` (#16) podía repinear.
5. T2-T5 — aprobadas por el MAYOR (detalles internos de tooling y docs; registrar en una sola entrada).

## Snippet para `documents/STATUS.md` (orquestador, "Planes pendientes de aprobación")

| `documents/PLAN_MONOREPO.md` v1.1 (#2) | ⏳ STOP-1/2/3 al usuario; v1 aprobado con cambios por el MAYOR, re-revisión del delta v1→v1.1 | lock sin repin (T1); testnet en PV 140 (H13 → pre-vuelo #8) | 2026-10-30 |

## Cambios v1 → v1.1

- MINOR 1: `AGENTE_DEV.md:17` agregado; `nvm use` sin versión en `AGENTE_DEV.md:17`, `agents.md:40/51-52/194` y `STATUS.md:28` para cualquier opción (TASK-2).
- MINOR 2: si STOP-3 ≠ (a), `ESTANDARES.md` sube a v1.2 con fecha y decisión citada (TASK-2); TASK-3 ya no dice "no cambia la versión" en general.
- MINOR 3: T1/H13 con los disparadores reales del repin (dependencias del manifest, digest de dependencia, otro `-e`, `update-deps`) y "la CLI no repinea ni avisa"; `[package]` no repinea.
- MINOR 4: guarda `PV ≤ MAX` en TASK-1 verif. 4 y en la contingencia de T1; H13 exige CLI con PV máxima ≥ PV de testnet.
- MINOR 5: H13 con dueño (pre-vuelo de #8, 3 pasos); TASK-3 corrige `agents.md:151-153` y `STATUS.md:30`.
- MINOR 6: artefactos del ciclo excluidos en todas las verificaciones de status y en los `git grep` (`':!documents/*_MONOREPO.md'`).
- MINOR 7: desviación del criterio de coverage declarada en §Contexto, DoD de TASK-1 y cobertura; gancho para #4.
- MINOR 8: cita del pin del root corregida a `Move.lock:19-20`.
- Sugerencia 9: STOP-1 (c) explica el congelamiento de layouts con `store` y de `public fun new_game`.
- Sugerencia 10: H13 se presenta junto a los STOP con la ratificación pendiente de D-20261030-08 (información).
- Sugerencia 11: chequeo del pin en CI como nota para #3, sin task.
- Pedido del orquestador: TASK-1 y TASK-2 dependen explícitamente de STOP-1/2 y STOP-3 (tablas de comandos por opción, verificaciones y baseline por opción); el plan ya no asume ninguna recomendación.
- Evidencia validada por el MAYOR incorporada (época 1269, `engines`, `npm install` crea el lock y no `node_modules/`, equivalencia de `--path`).
