# HANDOFF_MULTIGAME
> Plan: PLAN_MULTIGAME v1.3.1 (aprobado por el MAYOR, ronda 4) | Issue: #73 | Branch: `feature/issue-73-multigame` | Versión: v1.2.1 | Fecha: 2026-11-20
> Un solo archivo consolidado. Lo que el DEV ve de #73 está acá: si algo del plan y de este handoff discrepan, **manda el plan** y la duda es un STOP (§C-9).
> Alcance: TASK-1a, TASK-1b, TASK-2, TASK-2b, TASK-3, TASK-4, TASK-5, TASK-7a, TASK-7b y TASK-8. **PRE-1 (toolchain a la CLI `1.84.0`) NO va acá:** es un issue y un PR propios, sobre `master`, con su propio handoff. TASK-6 (upgrade) y TASK-9 (smoke de testnet) son **del owner** (§H, sin handoff de implementación).

## Historia de usuario

**Como** desarrollador del equipo (DEV) que implementa la plataforma multijuego, **quiero** un handoff autocontenido con la API exacta de la base común `duel` (con su reloj por jugada), el orden de los tasks, los tests y las evidencias que pide el MAYOR, **para** construir la base, el coinflip nuevo, el script de upgrade, el ensayo en localnet y la capa de la app de #73 sin decidir nada de contrato, fondos ni seguridad, y dejar todo listo para la revisión de pre-upgrade del MAYOR y el upgrade del owner.

**Scope en una frase:** implementar, por tasks de una sesión cada uno, la base `duel` (custodia, ciclo y reloj por jugada), el coinflip nuevo sobre ella, el script y el esquema de upgrade, el ensayo de punta a punta en la localnet aislada y la capa `sui/` y los componentes mínimos de la app, sin tocar `house.move` ni `game.move`.
**Lo que NO entrega:** el juego Battleship (#18), el rediseño visual (#72), el historial más allá de la ventana del fullnode (#51), juegos de terceros, mainnet, el toolchain a la CLI `1.84.0` (PRE-1) ni el upgrade y el smoke de testnet (del owner).

## Cambios de v1.2 a v1.2.1

Pedido del MAYOR en la revisión de integración de #80 (S-1), con PRE-1 (#75) ya mergeado a `master` (PR #79 = `8cc35ab`; housekeeping #80 = `b0bbef8`) y la branch de #73 con `master` integrado (`fd91d66`). **Solo estos cambios; no cambia el diseño, el plan (v1.3.1) ni ninguna decisión del owner.**

| Pedido | Resolución en v1.2.1 | Dónde |
|---|---|---|
| **R-12** (regla de proceso de #75) | Nueva **C-13**: los reportes `.txt`, borradores y ediciones de docs con comandos de `sui`/`suiup` se escriben solo con las herramientas de escribir/editar archivos del harness (nunca heredoc ni `sed -i`/`printf`/`echo`); guarda de `~/.sui` al inicio, tras cada reporte/borrador, tras cada génesis y al final; `grep` de rastros sobre cada borrador; ante una ejecución accidental de `sui`, parar y declararlo; remite a `agents.md` §3 paso 8 y a `documents/agentes/AGENTE_DEV.md` ("Reporte de task") | C-13, §R |
| **Localnet con puerto alternativo** | Nueva **Receta P** (`RPC_URL`, `smoke_guard_pre` solo para el arranque, `smoke_guard` con el RPC exacto, `ss -ltn` filtrado por el puerto 9000 antes de nada, génesis sin `suic`, `sui start --fullnode-rpc-port <puerto>` en segundo plano, recién después `smoke_guard`/`suic`/`publish.mjs`, capturas con `--url "$RPC_URL"`, cierre con el puerto libre); puerto de ejemplo **19000**; la Receta V1 suma `RPC_URL` al `smoke_guard_v1`; C-3 y TASK-1a/1b/4/5/7b/8 la usan; el 9000 del host está ocupado por un servicio ajeno que no se toca | C-3, Receta P, Receta V1, TASK-1a/1b/4/5/7b/8 |
| **STOP de TASK-8 (navegador en el 9000)** | El navegador de la app sigue fijo en el 9000 (`app/src/sui/networks.ts:11`, issue #77): TASK-8 declara el **STOP para el orquestador** del smoke con navegador (dejar el 9000 libre en esa ventana con autorización del owner, o decidir #77 antes); el DEV no lo improvisa | TASK-8 |
| **C-2 y §0** | SHA de PRE-1 en `master`: `8cc35ab` (`git merge-base --is-ancestor 8cc35ab HEAD`); §0 actualizado con la línea base medida en PRE-1 (CLI `1.84.0-9dc25070cf2e`, app 1246 tests en 66 archivos, gas de publicar y de las 12 transacciones, Docker de referencia); el DEV de TASK-1a igual la re-mide | C-2, §0 |

## Cambios de v1.1 a v1.2

Re-revisión del MAYOR de la v1.1: `documents/REVISION_HANDOFF_MULTIGAME_v1.1.md` (APPROVE CON CAMBIOS; H-1 y 9 más resueltos; H-2, H-5 y H-7 parciales por R2-1..R2-3). **Solo estos cambios; no cambia el plan ni ninguna decisión del owner.**

| Hallazgo | Resolución en v1.2 | Dónde |
|---|---|---|
| **R2-1 (MAJOR)** control anti-fuga del sandbox | Marcador único **`SANDBOX_`** en todas las constantes del sandbox y el módulo `testgame`; el grep pasa a correr **solo sobre las líneas agregadas del ciclo** (diff contra el merge-base con `master` + archivos nuevos sin trackear), no sobre el árbol (que ya tiene `15_000` en `gameDetail.ts`); los tests de TASK-2/2b (`EBadControl` con el id 8 y los bordes de la gracia en el literal 604 800 000 ms) quedan declarados como **barrera funcional**; TASK-7a ya no pide "sin literales de 15 000"; momento de la medición: al cierre de TASK-5, después de borrar el sandbox y cerrar la localnet y antes del reporte (con `test ! -e` de lo ignorado) | TASK-5 §2/§7, TASK-2, TASK-2b, TASK-7a, TASK-7b, TASK-8, §G punto 11 |
| **R2-2 (MINOR)** registrar el v1 en la localnet | Receta única en TASK-5 paso 1: `suic_v1 --json test-publish` desde `<SMOKE_DIR>/v1/contracts` → `publish.mjs record` (sin `--out`, con los metadatos de `26f2676`) → `publish.mjs upgrade` variante B; TASK-4: `upgrade` **lee** el `deployments/<red>.json` existente para los campos base y aborta si falta, con su test; TASK-7b y TASK-8 remiten a esa receta; se quita la contradicción con la variante B del worktree | TASK-5 paso 1, TASK-4, TASK-7b, TASK-8 |
| **R2-3 (MINOR)** sondas de compilación | TASK-2 copia el árbol **de trabajo** (con el `duel.move` aún sin commitear), exige el **mensaje de error esperado** (ability faltante) y un **control positivo** (la misma sonda sin la línea ofensiva compila), con las dos salidas pegadas; lo mismo en TASK-1b; reflejado en §G puntos 4 y 13 | TASK-1b, TASK-2, §G |

## Cambios de v1 a v1.1

Revisión del MAYOR de la v1 (APPROVE CON CAMBIOS: 2 MAJOR, 8 MINOR, 3 SUG): `documents/REVISION_HANDOFF_MULTIGAME_v1.md`. **No cambia ninguna decisión del owner ni el plan** (v1.3.1).

| Hallazgo | Resolución en v1.1 | Dónde |
|---|---|---|
| **H-1 (MAJOR)** binario 1.83.0 dentro de la localnet aislada | Receta nueva: `SUI_V1`, `suic_v1()` y `smoke_guard_v1` en el `env.sh`; SHA-256 del tgz **y** del binario verificados contra `git show 88dd53b:.github/workflows/ci.yml` (y la tabla de STATUS que deja PRE-1 / #75) **antes** de ejecutarlo; toda llamada al 1.83.0 con el prefijo del paso 3 de `agents.md` §3; aplicada a TASK-1a, TASK-1b, TASK-5 y al `sui move build` del diff de bytecode | Receta V1, TASK-1a, TASK-5 |
| **H-2 (MAJOR)** sandbox v3 con constantes acortadas | El sandbox **no redefine ids existentes**: agrega el id 8 = 15 s y una constante de gracia propia; se arma con `git archive HEAD contracts \| tar -x -C <SMOKE_DIR>/v3`, nunca en el worktree; fixtures con `_meta.sandbox = true` y las constantes; regla de la app para un `turn_ms`/`control` fuera del espejo (formato genérico, nunca error de configuración) con su test en TASK-7a; DoD con `git status`, `git diff --exit-code` y el grep sin coincidencias; evidencia en la compuerta §G | TASK-5, TASK-7a, §G |
| **H-3** gasto por resultado y R.7 | TASK-5 registra `gasUsed` de un `accept` ganado por el creador y de otro ganado por el aceptante y exige cómputo y storage iguales; el DoD de TASK-3 suma el grep de R.7 con salida pegada | TASK-5, TASK-3 |
| **H-4** bordes de la gracia | Tests al ms de `refund_stalled` (un pendiente y ambos pendientes), `claim_timeout` aún posible pasada la gracia y `ENotActive` tras `refund_stalled` | TASK-2b |
| **H-5** `Collected` sin abilities | Sondas de compilación (descartar un `Collected` y guardarlo en un struct no compila) en TASK-1b contra el stand-in y en TASK-2 contra el `duel` real, salida pegada, sin commitear; el reporte de TASK-2 pega la declaración real | TASK-1b, TASK-2 |
| **H-6** quién escribe DECISIONES y ESTANDARES | El DEV **no** edita `DECISIONES.md` ni `ESTANDARES.md`: redacta los cambios de ESTANDARES en su reporte; el orquestador los aplica con una entrada de DECISIONES que referencia D-20261119-05 (sin duplicar la (d)); el MAYOR los revisa en la integración | TASK-8 |
| **H-7** variante B de `upgrade` | Especificada y con test: sin `--out`, reescribe `contracts/deployments/localnet.json` (ignorado por git); el cierre lo borra | TASK-4, TASK-8 |
| **H-8** TASK-9 y SMOKE | El MID redacta la parte testnet de `SMOKE_MULTIGAME.md` antes de la compuerta (entrada de §G); TASK-9 corre **antes** de la revisión de integración con el build local de testnet y el json ya actualizado; chequeo posterior en Railway; la autorización del upgrade se registra en `DECISIONES.md` (la escribe el orquestador) | §G, §H |
| **H-9** dos citas | `game_tests.move:30-38` (`SEED` y `RANDOM_SEEDS`) y `publish.mjs:102-117` | TASK-3, TASK-4 |
| **H-10** conservación del reembolso | Balances por actor (creador `bet`, aceptante `bet`, tercero 0, `fees_collected` sin cambio, `stake == 0`) | TASK-2b |
| **H-11** tamaño de los tasks | **Partido:** TASK-1 → **1a** (V-16, V-2 diff, V-1, V-8, V-10, V-11) y **1b** (V-3, V-12, V-4, V-5, V-13, V-14, V-15, V-2 additive); TASK-7 → **7a** (config, registro, parsers, errores) y **7b** (builders, lobby, Mis partidas, claves e invalidación); orden, dependencias, §0 y compuerta actualizados | todo el documento |
| **H-12** `self_transfer` | R.4: los pagos van siempre a direcciones **guardadas** (`creator`, `acceptor` del estado), nunca a `ctx.sender()` | R.4 |
| **H-13** parche opcional del navegador | Se hace en una **copia** del repo dentro de `<SMOKE_DIR>`, con DoD `git diff --exit-code`, `git stash list` vacío y `grep -rn testgame app/src` = 0 | TASK-8 |

---

## 0. Baseline de gates verificado (2026-11-20, con PRE-1 mergeado)

Fuente: `documents/STATUS.md` ("Baselines de gates", filas de #75: toolchain, localnet aislada y app + deploy-image) y el árbol de la branch de #73 con `master` integrado (`fd91d66`; PRE-1 = PR #79, `8cc35ab`). `git diff 26f2676..HEAD -- contracts/sources` sigue vacío.

| Área | Gate | Baseline (CLI `1.84.0-9dc25070cf2e`, Node `v26.13.0`, `Move.lock` en el framework de la PV 142) |
|---|---|---|
| contracts | `sui move build -e testnet --warnings-are-errors` / `--lint` | 0 warnings / 0 lints |
| contracts | `sui move test -e testnet --warnings-are-errors` | **83 tests PASS** (26 `house_tests` + 57 `game_tests`); `Move.lock` sin delta |
| contracts/scripts | `node --test scripts/*.test.mjs` / `node scripts/publish.mjs check` | **104 tests PASS** / **1 despliegue(s)** |
| app | `npm run lint -w app` / `typecheck` / `npm test -w app` | **0 problemas** / **0 errores** / **1246 tests PASS en 66 archivos** |
| app | `VITE_SUI_NETWORK=testnet npm run build -w app` | `dist/assets/index-B3BeMVQC.js` ≈ 917.80 kB (277.96 kB gzip), idéntico al de la 1.83.0 |
| gas (localnet, PV 142) | publicar el paquete y las 12 transacciones de las fixtures | **47246000 MIST** al publicar; las 12 transacciones, **sin cambio** respecto de la 1.83.0 (`GAME_STORAGE_DEPOSIT_MIST` y las mediciones del contrato siguen valiendo) |
| Docker (referencia) | contenedores / imágenes al terminar `check-deploy-image.sh` | 5 contenedores / 17 imágenes, sin `<none>` residuales: no se toca otra cosa ni se hace `prune` |

**Este es el baseline de referencia que dejó PRE-1 (#75) en STATUS.** **El DEV de TASK-1a igual lo re-mide al arrancar** sobre la branch de #73 (gates de `contracts`, `scripts`, `app`) y lo escribe en su reporte (sección "Baseline medido"); ese medido es el baseline de todos los tasks siguientes (cero delta contra él, salvo los tests nuevos). Si el medido difiere de esta tabla o tiene un rojo, se reporta y es STOP antes de seguir.

## Reglas comunes del DEV (valen para todos los tasks)

- **C-1 Quién hace qué.** El DEV es el **único** que corre gates y smokes. **No escribe `.md` de reportes:** deja un `.txt` en el scratchpad de la sesión (`<scratchpad>/REPORTE_MULTIGAME_TASK-<M>.txt`, ruta absoluta completa en su respuesta) que el orquestador lee **entero**, pasa por los greps §R-6 y agrega a `documents/REPORTES_MULTIGAME.md`. **Commits, pushes y PRs son del orquestador: el DEV no commitea.** El MID revisa el reporte (no corre gates) y propone el mensaje de commit.
- **C-2 Orden y dependencias.** Todo task desde TASK-1a depende de **PRE-1 mergeado a `master`** y de la **branch de #73 con `master` integrado por merge** (no rebase), con `Move.lock` repineado a un framework ≥ PV 142 (trae `clock::borrow`, plan H-10). PRE-1 (#75) ya está mergeado: PR #79 = **`8cc35ab`** en `master` (housekeeping #80 = `b0bbef8`) y la branch de #73 lo integra desde `fd91d66`. Antes de empezar: `git log --oneline -3` y `git merge-base --is-ancestor 8cc35ab HEAD` (debe salir con estado 0); si no, **STOP**.
- **C-3 `sui` y la red.** Toda invocación de `sui` lleva `printf 'n\n' |` delante. Los gates `sui move …` van desde `contracts/` con la forma canónica de `agents.md` §3 (`-e testnet --warnings-are-errors`). Todo smoke usa **la localnet aislada** de `agents.md` §3 ("Localnet aislada (smokes)", pasos 1-8, con `env.sh`, `RPC_URL`, `smoke_guard_pre`, `smoke_guard`, `suic`, `act_as`, `ids.env`, cierre y verificación de `~/.sui/`), **una a la vez**, **con el puerto alternativo de la Receta P** (el 9000 del host lo ocupa un servicio ajeno que no se toca); el binario 1.83.0 se invoca **solo** con la Receta V1 (abajo), nunca suelto. **Prohibido:** `sui client`/`sui keytool` contra testnet o sin el prefijo de la localnet aislada, publicar o hacer upgrade en testnet (ni `--dry-run`), faucet, `new-address`, `--force-regenesis`, `sui start` a secas, `pkill`. `~/.sui/` queda sin claves: solo `stat`/`ls` de la línea base y del cierre, nunca `cat`. Nada de `<SMOKE_DIR>/net` se lee ni se pega (`agents.md` §3, paso 6).
- **C-4 Testnet.** Solo lecturas públicas sin claves (GraphQL `https://graphql.testnet.sui.io/graphql` o gRPC público). Nunca la clave del owner.
- **C-5 Navegador y Docker.** Chrome solo headless con perfil desechable en `<SMOKE_DIR>` (`agents.md` §3, "Pasos de navegador"); nunca el del usuario. Docker: no tocar otros contenedores ni hacer `prune`.
- **C-6 Repo público.** Ninguna dirección de cuenta (completa ni abreviada), clave, frase ni ruta personal en nada commiteable (código, fixtures, tests, output pegado en el reporte): usar `<repo>`, `<HOME real>`, `<SMOKE_DIR>`, `<scratchpad>`. Los IDs de paquete/objeto y los digests públicos sí. Las fixtures de localnet traen direcciones **efímeras** de una génesis desechable (sin claves), como las existentes (`contracts/README.md`, "Lectura desde la app"). Los tests Move usan direcciones de prueba cortas (`@0xA`…).
- **C-7 Greps §R-6** (4, con `/usr/bin/grep`) sobre **todo el diff** y **todo reporte**: `[0-9a-fA-F]{40,64}` · `0x[0-9a-fA-F]{8,}` · `suiprivkey|mnemonic|seed phrase|/home/|/Users/` · `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`. Cada coincidencia se clasifica (ID/digest/commit público conocido) o se corrige.
- **C-8 Node.** Node 26 con `nvm use` o `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version` (`v26.13.0`); `npm ci` con otra versión falla por `EBADENGINE`.
- **C-9 El DEV no decide diseño.** Toda duda de **contrato, fondos, seguridad o alcance** es **STOP al orquestador** con evidencia `archivo:línea` y 2-3 opciones; no se improvisa. Lo que sí puede decidir (y declara en "Desviaciones del handoff"): nombres internos de helpers `#[test_only]`, estructura interna de funciones privadas y detalles de TypeScript que no cambien contratos de `sui/`.
- **C-10 Estándares.** Se trabaja contra `documents/ESTANDARES.md` (ARQ/SEG/LIM/PROY): `///` en toda función/struct pública (LIM-7), constantes nombradas (LIM-6), un abort code por condición (LIM-8), sin código muerto ni debug (LIM-3, LIM-4), tests con nombre = comportamiento (LIM-11), montos `bigint` (PROY-12). Fuentes Move con la cabecera `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0` (D-20261030-14, también `tests/`).
- **C-11 Mensajes de commit** (los propone el MID; el orquestador commitea): `<área>: <imperativo> (#73)`. **Nunca** `Closes/Fixes/Resolves #N` en commits ni PRs hasta el PR final (los cierra el orquestador con la decisión del owner).
- **C-12 Inicio de sesión.** `git status` limpio, rama correcta, `agents.md`, `documents/STATUS.md`, `documents/DECISIONES.md` (D-20261119-05), `documents/ESTANDARES.md`, `documents/PLAN_MULTIGAME.md` y este archivo leídos; baseline medido (§0) antes de tocar nada.
- **C-13 Cómo se escriben los reportes (R-12, #75).** Los reportes `.txt`, los borradores y las ediciones de docs con comandos de `sui` o `suiup` se escriben **solo con las herramientas de escribir/editar archivos** del harness. **Nunca** con un heredoc (ni entrecomillado), `sed -i`, `printf` ni `echo` para texto que contenga `sui`, `suiup` o acentos graves: un heredoc sin comillas ejecutó por sustitución de comandos un `sui start` a secas con el HOME real en TASK-2a de #75 (lo contuvo solo que `~/.sui/sui_config/` no estaba vacío). **Guarda de `~/.sui`** (`stat -c '%y %s %n'` y `ls -la` de `<HOME real>/.sui/sui_config/` y `sha256sum` de `client.yaml`, **nunca `cat`**; del hash alcanzan los primeros 12 hex o "igual a la línea base"): se corre **al inicio, después de escribir cada reporte o borrador, después de cerrar cada génesis y al final**. Sobre **cada borrador**: `grep -c 'command not found'` (debe dar 0) y `/usr/bin/grep -nE 'Cannot run genesis|sui_config|Address already in use'` (rastros de una ejecución accidental). **Ante cualquier ejecución accidental de `sui`: parar, verificar `~/.sui/` y declararlo en el reporte.** Detalle: `agents.md` §3, paso 8, y `documents/agentes/AGENTE_DEV.md` ("Reporte de task").

## Receta P: localnet aislada con puerto alternativo (vale para todo smoke de este handoff; fuente: `agents.md` §3 vigente)

El **9000 del host lo ocupa un servicio de otro proyecto**: no se toca (ni se nombra en nada commiteable). Los smokes corren en otro puerto libre; el ejemplo de este handoff es **19000** (`<puerto>`).

1. **Antes de nada:** `ss -ltn` filtrando el puerto 9000 (para ver que está ocupado y no tocarlo) y `ss -ltn` filtrando `<puerto>` con conteo 0 (libre).
2. **`env.sh`** de `agents.md` §3 con `RPC_URL=http://127.0.0.1:<puerto>`, `smoke_guard_pre` (solo para el arranque: lee únicamente el config aislado, sin red) y `smoke_guard` (además exige que el RPC del env activo sea **exactamente** `$RPC_URL`), `suic` y `act_as`. Con otro puerto, `smoke_guard` falla (`GUARD-FAIL`) hasta que `sui start` reescribe el alias `localnet` del config aislado; así nunca se le habla al servicio del 9000.
3. **Génesis sin ningún `suic`** → **`sui start` con `--fullnode-rpc-port <puerto>`** como comando en segundo plano del harness: `. <SMOKE_DIR>/env.sh && smoke_guard_pre && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port <puerto> > "$SMOKE_DIR/sui-start.log" 2>&1` (nunca `nohup … &`) → **recién después** `smoke_guard`, `suic` y `publish.mjs`. Cualquier `suic` anterior iría al 9000.
4. **Capturas de `app/scripts/capture-*.mjs` siempre con `--url "$RPC_URL"`**: la guarda (`localnet-guard.mjs`) acepta solo `http://127.0.0.1:<puerto>` (loopback, 1024-65535; por defecto el 9000). **Nunca una captura sin `--url` con el 9000 ocupado.** Las sondas de `SuiGrpcClient` también usan `$RPC_URL`.
5. **Cierre** (`agents.md` §3, paso 7): `kill` por PID, `kill -0` falla, `~/.sui/` idéntico a la línea base, y con el puerto alternativo, `ss -ltn` filtrando `<puerto>` con conteo 0 (queda libre) y el 9000 ajeno **igual que al empezar**. `sui start` sale con 144 ante SIGTERM (esperado).
6. Toda la receta se escribe y se corre respetando C-13 (R-12).

## Receta V1: invocar el binario 1.83.0 dentro de la localnet aislada (H-1; vale para TASK-1a, TASK-1b, TASK-5 y el `sui move build` del diff de bytecode)

El v1 del ensayo se publica con el binario **1.83.0** (el que compiló el paquete de testnet) y la red y el upgrade usan la CLI de PRE-1 (`1.84.0`). El `env.sh` de `agents.md` §3 define un solo `SUI`; **el segundo binario nunca se ejecuta fuera del prefijo aislado** (sin `SUI_CONFIG_DIR` ni `HOME` aislados leería el `client.yaml` real y podría intentar publicar en testnet).

1. **Obtener y verificar, sin ejecutar nada todavía.** En un directorio **nuevo y vacío** `<SMOKE_DIR>/dl183` (los scripts van en otro): `gh release download testnet-v1.83.0 --repo MystenLabs/sui --pattern 'sui-testnet-v1.83.0-ubuntu-x86_64.tgz'`. Leer los valores esperados de `git show 88dd53b:.github/workflows/ci.yml` (`SUI_TGZ_SHA256` y `SUI_BIN_SHA256`; la tabla de STATUS con esos SHA-256 históricos que registra PRE-1 (#75) sirve de segunda fuente). `sha256sum` del tgz = `SUI_TGZ_SHA256`; extraer a otro directorio nuevo `<SMOKE_DIR>/bin183` (el binario queda en `sui-release/sui`, como en `ci.yml:51-59`); `sha256sum` del binario = `SUI_BIN_SHA256`. **Recién entonces** se puede ejecutar. Si algún hash no coincide: **STOP**, no se ejecuta.
2. **`env.sh`** (además de lo de `agents.md` §3, con la ruta **escrita literal**):
   ```sh
   # ILUSTRATIVO — se agrega al <SMOKE_DIR>/env.sh de agents.md §3
   SUI_V1=<ruta absoluta literal del binario 1.83.0 verificado>
   [ -x "$SUI_V1" ] || { echo GUARD-FAIL; return 97; }
   suic_v1() { printf 'n\n' | "$SUI_V1" client "$@"; }
   # Igual que smoke_guard (Receta P): config aislado, env activo = localnet y su RPC es EXACTAMENTE $RPC_URL
   # (RPC_URL=http://127.0.0.1:<puerto> ya está definido en el env.sh de la Receta P; ejemplo 19000).
   smoke_guard_v1() {
     [ -f "$SUI_CONFIG_DIR/client.yaml" ] \
       && [ "$(printf 'n\n' | "$SUI_V1" client active-env)" = localnet ] \
       && [ "$(printf 'n\n' | "$SUI_V1" client --json envs | jq -r '.[1] as $a | .[0][] | select(.alias==$a) | .rpc')" = "$RPC_URL" ] \
       || { echo GUARD-FAIL; return 97; }
   }
   ```
3. **Prefijo de toda llamada al 1.83.0:** `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && smoke_guard_v1 && suic_v1 …` (con la red ya arrancada según la Receta P: el binario 1.83.0, como cualquier `suic`, **nunca** corre antes de `sui start --fullnode-rpc-port <puerto>`) (o `printf 'n\n' | "$SUI_V1" move build -e testnet …` desde el árbol `<SMOKE_DIR>/v1/contracts`, con el mismo prefijo: `HOME` y `SUI_CONFIG_DIR` aislados, `MOVE_HOME` real para la caché del framework; si la CLI tiene que descargar el framework, se declara). **Nunca** el binario sin el prefijo; un `GUARD-FAIL` detiene el smoke y se reporta.
4. Si el cliente 1.83.0 no puede hablar con la red levantada por la CLI de PRE-1, se declara con la salida y es **STOP** (no se cambia la CLI de la red por cuenta propia). Si el `envs --json` del 1.83.0 no tiene la forma que usa `smoke_guard_v1`, se declara y el guarda usa el equivalente que verifique el RPC **exacto** (nunca se omite esa condición).
5. El binario y los directorios `dl183`/`bin183` viven en `<SMOKE_DIR>` y se borran al cerrar; el reporte cita los **dos hashes verificados** (son públicos).

## Decisiones del owner (D1..Dn — **no reabrir**; 2026-11-19, `documents/DECISIONES.md` D-20261119-05)

| # | Decisión |
|---|---|
| D1 (P-1) | Base común: `Duel<phantom G>` en el **mismo paquete**; `game::Game` no se toca |
| D2 (P-2) | **Reloj por jugada (1c)** aplicado por la base a todos los juegos; controles fijos rapid 10/20/30/60 min y daily 1/3/7 días; quien deja vencer su plazo **pierde** y el rival reclama el pozo menos la comisión |
| D3 (P-3) | Coinflip nuevo sobre `Duel<Coinflip>` (control 0, camino atómico); `game::Game` viejo intacto |
| D4 (P-4) | Juegos como módulos del mismo paquete; **solo `duel` llama a `house::add_fees`**; terceros = STOP aparte |
| D5 (P-5) | Upgrade compatible (no republicar); **no** autoriza ejecutarlo |
| D6 (P-6) | `VERSION` **no se sube**; "nada se corta" aceptado; procedimiento de corte escrito (plan §4.3) |
| D7 (P-7) | `UpgradeCap` sigue `compatible` hasta después de #18 |
| D8 (P-8) | PRE-1 separado con la CLI `1.84.0` |
| D9 (P-9, P-10) | Un solo juego "Coinflip" con filas "anteriores"/"nuevas" (crear solo en la nueva); lobby "Todos" con filtro por juego; selector de juego solo con más de uno creable; los 7 controles solo para juegos con reloj; #73-app antes de implementar #72 |
| D10 (P-11) | Misma fórmula de comisión (piso sobre el pozo completo, `u128`, `fee_rate` copiado al crear, `add_fees` siempre), también en el reclamo por tiempo; la base lee comisión, límites, versión e ID de la House |
| D11 (P-12) | El DEV puede correr `test-publish`/`test-upgrade` en la localnet aislada (v1 del ensayo con el binario 1.83.0) |
| D12 (P-13) | Restricción permanente (d): `stake` única custodia, `Pending` solo con la apuesta del creador, sin valor en dynamic fields, estados sin cambio de significado, **tiempo agotado = derrota**, codificación de `to_move` fija |
| D13 (P-14) | S-1 (i) ambos pendientes al vencer → 100/100 sin comisión (`Expired`); S-2 (i) `CLAIM_GRACE_MS` = 7 días y `refund_stalled` paga 100/100 sin comisión; S-3 (i) cualquiera llama `claim_timeout` y se paga siempre al rival |
| D14 | **La autorización del upgrade en testnet (TASK-6) sigue pendiente, aparte y vigente**; antes, la compuerta del MAYOR (§G) |

## Orden, dependencias y smokes

```
PRE-1 (issue/PR propios; mergeado a master) ─▶ branch de #73 con master integrado por merge
  ─▶ TASK-1a 🧪 ─▶ TASK-1b 🧪 ─▶ TASK-2 ─▶ TASK-2b ─▶ TASK-3 ─▶ TASK-4 🧪 ─▶ TASK-5 🧪 ─▶ TASK-7a ─▶ TASK-7b 🧪 ─▶ TASK-8 🧪🌐
  ─▶ COMPUERTA de pre-upgrade del MAYOR (§G) ─▶ AUTORIZACIÓN explícita del owner ─▶ TASK-6 (owner) ─▶ TASK-9 (owner)
  ─▶ revisión de integración del MAYOR ─▶ merge (orquestador)
```
🧪 = smoke/ensayo en la localnet aislada (`agents.md` §3). 🌐 = pasos de navegador headless. Un task por sesión del DEV (TASK-1 y TASK-7 van partidos en a/b por tamaño); el MID revisa cada reporte antes de autorizar el siguiente. Dependencias de datos: TASK-2 necesita V-1 (1a) y V-13 (1b); TASK-2b necesita V-13 y V-15 (1b); TASK-4 necesita las salidas reales de 1a; TASK-7a necesita las fixtures de TASK-5; TASK-7b depende de 7a.

---

# Referencia canónica de `duel` (la usan TASK-2, 2b, 3, 5, 7 y 8)

Todo lo de esta sección está **fijado por el plan** (§2.4-§2.6, v1.3.1). Los números de abort quedan **estables desde TASK-2** (PROY-2). Firmas ilustrativas: nombres y orden de parámetros son los del plan; el DEV no los cambia sin STOP.

## R.1 Layout y estado (congelados al upgrade)

```move
// ILUSTRATIVO — layout fijado por el plan; el orden de campos y de variantes NO se cambia.
public struct Duel<phantom G> has key {
    id: UID, version: u64, house_id: ID, creator: address, opponent: Option<address>,
    bet: u64, stake: Balance<SUI>, fee_rate: u16, turn_ms: u64, state: DuelState,
}
public enum DuelState has copy, drop, store {
    Pending,
    Cancelled,
    Active { acceptor: address, to_move: u8, deadline_ms: u64 },
    Resolved { acceptor: address, winner: address },
    TimedOut { acceptor: address, winner: address },
    Expired { acceptor: address },
}
public struct Collected { duel_id: ID, pot: u64, fee: u64 }   // hot potato: SIN abilities
```
`Duel` y `DuelState` sin `store` el primero y con `copy, drop, store` el segundo (como `Game`/`GameState`, `game.move:31, 50`). `Balance<SUI>` se serializa como su `u64`. Máscara de `to_move`: `CREATOR = 1`, `ACCEPTOR = 2`, `BOTH = 3`; `0` solo dentro de la transacción de un `activate_atomic`.

## R.2 Controles de tiempo (constantes nombradas, LIM-6)

| Id | Control | `turn_ms` | | Id | Control | `turn_ms` |
|---|---|---|---|---|---|---|
| 0 | sin reloj (solo juegos atómicos) | 0 | | 4 | rapid 60 min | 3 600 000 |
| 1 | rapid 10 min | 600 000 | | 5 | daily 1 día | 86 400 000 |
| 2 | rapid 20 min | 1 200 000 | | 6 | daily 3 días | 259 200 000 |
| 3 | rapid 30 min | 1 800 000 | | 7 | daily 7 días (`MAX_TURN_MS`) | 604 800 000 |

`create` recibe el **id** (`u8`), nunca ms libres; id > 7 aborta `EBadControl`. `CLAIM_GRACE_MS` = 604 800 000 (7 días). La tabla vive en el **cuerpo** de `create` (no en un `public`); los ids publicados son inmutables (PROY-2). `ahora` = `sui::clock::borrow().timestamp_ms()`.

## R.3 Abort codes de `duel` (0-25, sin colisiones; una causa por código, LIM-8)

| 0 `EBetTooLow` | 1 `EBetTooHigh` | 2 `ESelfInvite` | 3 `ENotCreator` | 4 `ENotPending` | 5 `ENotInvited` |
|---|---|---|---|---|---|
| 6 `ENoInvitation` | 7 `EVersionMismatch` | 8 `EWrongHouse` | 9 `ESelfPlay` | 10 `EWrongStake` | 11 `ENotActive` |
| 12 `EWrongDuel` | 13 `EBadWinnerIndex` | 14 `ENotExpired` | 15 `EBrokenStake` | 16 `EBadControl` | 17 `ENoClock` |
| 18 `EHasClock` | 19 `EBadMask` (máscara fuera de `1..=3`) | 20 `ENotYourTurn` (jugador fuera de `to_move`) | 21 `EDeadlinePassed` | 22 `EBothPending` | 23 `ENotStalled` |
| 24 `ENotPlayer` (quien firma no es jugador de la partida) | 25 `EPhaseMismatch` (fase simultánea: `next_to_move != rem`) | | | | |

`house::EWrongVersion` (3, módulo `house`) también aborta en `create`, `activate`, `activate_atomic`, `collect` y `claim_timeout` (el número 3 existe en los dos módulos: la app mapea por **módulo + código**).

## R.4 Funciones de `duel` (aborts **en este orden**; witness `_: G` por valor, `G: drop`)

| Función (ilustrativa) | Visib. | Estado ent. → sal. | Aborts, en orden | Evento | Fondos / destinatario |
|---|---|---|---|---|---|
| `create<G>(_: G, house: &House, stake: Coin<SUI>, opponent: Option<address>, control: u8, ctx)` | `public(package)` | — → `Pending` | `house::EWrongVersion` (3; lecturas `min_bet`/`max_bet`/`fee_rate` primero, como `game.move:94-97`), `EBetTooLow`, `EBetTooHigh`, `ESelfInvite`, `EBadControl` | `DuelCreated<G>` | `Coin` entero → `stake`; copia `version`, `house_id`, `fee_rate` y `turn_ms` (de la tabla); comparte el `Duel` adentro; **`Pending` no expira** |
| `cancel<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica, sin witness | `Pending` → `Cancelled` | `ENotCreator`, `ENotPending` | `DuelCancelled<G>` (`cancelled_by` = creador) | 100 % de `stake` **al creador**; sin House ni versión |
| `reject<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica | `Pending` → `Cancelled` | `ENoInvitation`, `ENotInvited`, `ENotPending` | `DuelCancelled<G>` (`cancelled_by` = invitado) | 100 % **al creador**; sin House ni versión |
| `activate<G>(_: G, duel: &mut Duel<G>, house: &House, payment: Coin<SUI>, first_to_move: u8, ctx)` — juegos con reloj | `public(package)` | `Pending` → `Active { acceptor = sender, to_move = first_to_move, deadline_ms = ahora + turn_ms }` | `house::EWrongVersion` (`house.min_bet()` con el valor descartado), `EVersionMismatch`, `EWrongHouse`, `ESelfPlay`, `ENotInvited`, `ENotPending`, `EWrongStake`, `ENoClock` (`turn_ms == 0`), `EBadMask` (`first_to_move ∉ 1..=3`) | `DuelActivated<G>` | `payment` (exacto `bet`) se une a `stake` (`2 × bet`) |
| `activate_atomic<G>(_: G, duel: &mut Duel<G>, house: &mut House, payment: Coin<SUI>, ctx): Collected` — juegos sin reloj | `public(package)` | `Pending` → `Active { acceptor, to_move = 0, deadline_ms = 0 }` (solo dentro de la tx) | los de `activate` en el mismo orden pero `EHasClock` (`turn_ms != 0`) en lugar de `ENoClock`/`EBadMask`; luego `house::EWrongVersion` (en `add_fees`) | `DuelActivated<G>` | une `payment`, cobra `fee = ⌊pozo × fee_rate / 10_000⌋` (`u128`) de `stake` → `fees_collected` (siempre, también con 0) y devuelve `Collected { duel_id, pot, fee }` |
| `record_move<G>(_: G, duel: &mut Duel<G>, next_to_move: u8, ctx)` | `public(package)` | `Active` → `Active` | `ENotActive`, `ENoClock`, `ENotPlayer`, `ENotYourTurn`, `EDeadlinePassed`, luego `EBadMask` (con `rem == 0`, `next ∉ 1..=3`) o `EPhaseMismatch` (con `rem != 0`, `next != rem`) | `DuelTurn<G>` | sin fondos. `rem = to_move & !bit(sender)`: con `rem != 0`, `to_move = rem` **sin tocar** `deadline_ms`; con `rem == 0`, `to_move = next_to_move` y `deadline_ms = ahora + turn_ms` (también si el mismo jugador sigue) |
| `collect<G>(_: G, duel: &mut Duel<G>, house: &mut House, ctx): Collected` — liquidar por jugada o rendición | `public(package)` | `Active` → `Active` | `ENotActive`, `ENotPlayer` (`sender ∉ {creator, acceptor}`; **no** exige estar en `to_move`: la rendición es fuera de turno), `ENoClock`, `EDeadlinePassed`, `EVersionMismatch`, `EWrongHouse`, `EBrokenStake` (`stake != 2 × bet`), `house::EWrongVersion` (en `add_fees`) | — | cobra la comisión → `fees_collected` (siempre); devuelve `Collected` |
| `pay<G>(_: G, duel: &mut Duel<G>, c: Collected, winner_index: u8, ctx)` | `public(package)` | `Active` → `Resolved { acceptor, winner }` | `EWrongDuel` (`c.duel_id != id(duel)`), `ENotActive`, `EBadWinnerIndex` (`> 1`) | `DuelResolved<G>` | el resto de `stake` (`pozo − fee`) como `Coin` **al ganador** `[creator, acceptor][winner_index]` |
| `claim_timeout<G>(duel: &mut Duel<G>, house: &mut House, ctx)` | **`entry`** genérica; **cualquiera** la llama | `Active` → `TimedOut { acceptor, winner }` | `house::EWrongVersion` (lectura de la House con versión, primera), `ENotActive`, `ENoClock`, `EVersionMismatch`, `EWrongHouse`, `ENotExpired` (`ahora < deadline_ms`), `EBothPending` (`to_move == 3`), `EBrokenStake` | `DuelTimedOut<G>` | `fee` (`fee_rate` copiado) → `fees_collected` por `add_fees`; `pozo − fee` como `Coin` **al rival del que debía mover** (nunca a quien llama); `to_move = 1` ⇒ gana el aceptante, `2` ⇒ el creador |
| `refund_stalled<G>(duel: &mut Duel<G>, ctx)` | **`entry`** genérica; cualquiera | `Active` → `Expired { acceptor }` | `ENotActive`, `ENoClock`, `ENotStalled` (con `to_move == 3`: `ahora < deadline_ms`; con un pendiente: `ahora < deadline_ms + CLAIM_GRACE_MS`) | `DuelExpired<G>` | `bet` al creador y el resto de `stake` (`== bet`) al aceptante, **sin comisión**, sin House ni versión; **sin `assert` de `stake == 2 × bet`** (un abort acá bloquearía fondos) |

Notas: (a) `collect`, `activate_atomic` y `claim_timeout` son las **únicas** funciones que llaman a `house::add_fees` (D4). (b) `ENotActive` va antes de `ENotPlayer` a propósito: el aceptante solo se conoce dentro de `Active { acceptor }`. (c) `record_move` lee `ctx.sender()` ella misma (no recibe un `actor`); la `entry` de jugada de un juego la firma el jugador que mueve (sin relayers). (d) Antes de `deadline_ms` solo se puede mover o liquidar por jugada; desde `deadline_ms` solo reclamar (INV-D6): **no hay carrera en el borde**. (e) `fee_amount` se **duplica** en `duel` (`game.move:237-239` es privada y no se toca): LIM-5 aceptado y documentado en un comentario. (f) Sin `init`, sin accessors del `UID`, sin `public fun` nuevas (PROY-4); toda función de test es `#[test_only]` (`*_for_testing`). (g) **Los pagos van siempre a direcciones guardadas** (`creator` y `acceptor` del `Duel`/del estado, o el ganador elegido por índice sobre ellas), **nunca a `ctx.sender()`**, como `game.move:219-231`: el lint `self_transfer` marca una función no `entry` que transfiere a `ctx.sender()` y con `--lint --warnings-are-errors` corta el build.

## R.5 Eventos (`has copy, drop`; el tipo lleva el juego; el orden de campos es el del BCS)

| Evento | Campos | Emite |
|---|---|---|
| `DuelCreated<phantom G>` | `duel_id: ID`, `creator`, `opponent: Option<address>`, `bet: u64`, `fee_rate: u16`, `control: u8`, `turn_ms: u64` | `create` |
| `DuelCancelled<phantom G>` | `duel_id`, `creator`, `cancelled_by`, `refund: u64` | `cancel`, `reject` |
| `DuelActivated<phantom G>` | `duel_id`, `creator`, `acceptor`, `bet`, `turn_ms`, `to_move: u8`, `deadline_ms: u64` | `activate`, `activate_atomic` |
| `DuelTurn<phantom G>` | `duel_id`, `actor`, `to_move: u8`, `deadline_ms: u64` | `record_move` |
| `DuelResolved<phantom G>` | `duel_id`, `creator`, `acceptor`, `winner`, `pot`, `fee`, `payout` (`pot == payout + fee`) | `pay` |
| `DuelTimedOut<phantom G>` | `duel_id`, `creator`, `acceptor`, `winner`, `claimed_by`, `pot`, `fee`, `payout` | `claim_timeout` |
| `DuelExpired<phantom G>` | `duel_id`, `creator`, `acceptor`, `refund_each: u64` | `refund_stalled` |

## R.6 Invariantes (cada una tiene al menos un test; la matriz va al reporte de TASK-2b)

- **INV-D1** el único SUI del `Duel` está en `stake`, **al inicio y al final de toda transacción**: `== bet` (`Pending`), `== 2 × bet` exacto (`Active`), `== 0` (`Cancelled`, `Resolved`, `TimedOut`, `Expired`). Entre `collect`/`activate_atomic` y `pay` hay `2 × bet − fee` (intra-tx).
- **INV-D2** `cancel`, `reject` y `refund_stalled` no reciben la House ni leen `version`, no dependen del juego y solo abortan por su authZ y su estado.
- **INV-D3** salidas: `Pending` incondicional; `Active` con reloj: al vencer, el rival cobra (`claim_timeout`); a los `CLAIM_GRACE_MS`, cualquiera reembolsa 100/100 (`refund_stalled`), aunque la House esté cortada.
- **INV-D4** la comisión se cobra **solo** en una tx que termina en `Resolved` o `TimedOut` (el `Collected` sin abilities solo lo consume `pay`); `payout + fee == 2 × bet`; `fees_collected` sube exactamente `fee`.
- **INV-D5** ninguna `entry` de producción de #73 termina una tx con un `Duel` en `Active` (estructural en el coinflip por `activate_atomic`).
- **INV-D6** el reloj lo aplica la base: `record_move`/`collect` abortan con `EDeadlinePassed` si `ahora ≥ deadline_ms`; `claim_timeout`/`refund_stalled` abortan con `ENotExpired`/`ENotStalled` si todavía no: **conjuntos disjuntos**.
- **INV-D7** `to_move ∈ 1..=3` y `deadline_ms` solo existen dentro de `Active` con `turn_ms > 0`.

## R.7 Reglas de revisión de seguridad (SEG-5 y witness)

- `duel` **no recibe `Random`**. Solo `coinflip` combina `Random` con la base, en una `entry` no `public`, con el orden **validar y cobrar (`activate_atomic`) → sortear → pagar (`pay`)**; el sorteo es por índice sin ramas (`generate_u8_in_range(0, 1)`); entre el sorteo y `pay` nada que dependa del resultado puede abortar.
- Ningún `#[allow(lint(public_random))]` en `sources/`; ningún struct con un campo `RandomGenerator`; ninguna `public` de un módulo de juego que reciba `&mut Duel<G>`.
- El witness del juego se llama **`Coinflip`** (nunca `COINFLIP`: sería candidato a OTW y el verificador lo rechazaría), `has drop` solamente, sin constructor `public`, sin `copy`/`store`.
- Ninguno de los módulos nuevos tiene `init` (el `init` de un módulo nuevo **sí corre** en un upgrade, plan H-6).

---

# TASK-1a: Binario 1.83.0, v1/v2 de ensayo y evidencias de upgrade (parte 1) — área: contracts (smoke 🧪)

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** publicar en la localnet aislada el paquete real de testnet (v1 compilado con la CLI 1.83.0) y hacer un upgrade a una v2 con un módulo nuevo con la CLI de PRE-1, **para** probar con evidencia que un módulo nuevo llama a `house::add_fees`, que el `init` de un módulo nuevo corre y cómo es el upgrade (un solo PTB, reintento, pubfile).

**Scope:** V-16, baseline, V-2 (diff de bytecode), V-1, V-8, V-10 y V-11, más las fixtures de `scripts/`; **ningún archivo de producción**. **NO entrega:** las sondas de tipos, reloj, witness y hot potato (TASK-1b), la base `duel` ni el coinflip, el script de upgrade (TASK-4).

### 2. Contexto
- Plan: §3.1 (F2), §4.4, §12 (R-1, R-2), §13 (V-1, V-2, V-8, V-10, V-11, V-16), P-12 (autorización de `test-publish`/`test-upgrade`) y la **Receta V1** de este handoff.
- Hoy: `contracts/sources/house.move` (`add_fees` `public(package)`, línea 150) y `game.move`; `contracts/scripts/publish.mjs` solo tiene `publish | record | check` (líneas 59-62).
- El paquete de testnet se compiló con la CLI **1.83.0** desde `sourceCommit` `26f2676`; `git diff 26f2676..HEAD -- contracts/sources` está vacío. El v1 se publica **con el binario 1.83.0** (Receta V1); el upgrade, con la CLI de PRE-1 (`1.84.0`).
- Procedimiento de localnet: `agents.md` §3 completo. `HOME` aislado, `SUI_CONFIG_DIR=<SMOKE_DIR>/net`, claves desechables solo ahí.

### 3. Qué implementar (todo en `<SMOKE_DIR>`; nada se commitea salvo las fixtures de §4)
0. **Baseline medido** de PRE-1 (gates de `contracts`, scripts y app) y `sui --version` = el de `ci.yml`.
1. **V-16 (Receta V1, pasos 1-2):** binario 1.83.0 descargado, hashes del tgz **y** del binario verificados, `env.sh` con `SUI_V1`/`suic_v1`/`smoke_guard_v1`, y `sui --version` del binario = `1.83.0-16d2dc1e05ed` **solo después** de la verificación.
2. **v1:** `git archive 26f2676 contracts | tar -x -C <SMOKE_DIR>/v1` (árbol del `sourceCommit`, con su `Move.lock`). Publicar con `suic_v1 test-publish --pubfile-path <SMOKE_DIR>/Pub.localnet.toml --build-env testnet` (prefijo de la Receta V1, localnet aislada levantada con la CLI de PRE-1).
3. **V-2 / N-7 (diff de bytecode):** compilar el mismo árbol `26f2676` con el binario 1.83.0 (Receta V1, paso 3) y con la CLI de PRE-1 y comparar los `.mv` de `house` y `game` (`sha256sum`; si difieren, desensamblar con el subcomando de `sui move` disponible y mostrar el diff). Debería cambiar, a lo sumo, nada o la lista de amigos de `house` en la v2; informar cualquier otra diferencia. **Es entregable** (§G punto 4).
4. **V-1:** v2 = `git archive HEAD contracts | tar -x -C <SMOKE_DIR>/v2` (**nunca en el worktree**) **más un módulo mínimo descartable** (p. ej. `sandbox_fees`) que llama a `house::add_fees` con un `Balance` de un `Coin` creado en la prueba, sin tocar `house.move` ni `game.move`. `sui client test-upgrade --pubfile-path … --build-env testnet` con la CLI de PRE-1. Llamarlo y leer `fees_collected` de la House.
5. **V-8:** el módulo nuevo con un `init` que cree un objeto: comprobar que **sí corre** en el upgrade y que no corre el de un módulo existente al que se le agregue uno.
6. **V-10 / V-11:** contar los comandos del PTB del upgrade (`--serialize-unsigned-transaction` o `--dry-run` en la localnet); repetir un `test-upgrade` con el pubfile viejo y comprobar `PackageIDDoesNotMatch`; guardar las salidas `--json` reales y el pubfile resultante.

### 4. Archivos a tocar / NO tocar
- **Se commitea (lo hace el orquestador):** solo salidas reales **sin direcciones de cuentas reales** como fixtures de `contracts/scripts/fixtures/` (p. ej. `localnet-upgrade.json`, `localnet-upgrade-dry-run.json`, `Published.upgrade.localnet.toml`), con el formato y las reglas de `contracts/README.md` ("Tests": salida cruda de una localnet aislada y desechable, cuenta efímera de la génesis, clave destruida).
- **NO tocar:** `contracts/sources/*`, `contracts/tests/*`, `Move.toml`, `Move.lock` (si una corrida lo modifica: `git checkout -- contracts/Move.lock` y declararlo), `contracts/deployments/*`, `contracts/Published.toml`, `.github/*`, `app/*`. Árboles `v1`/`v2`, módulos sandbox, binario 1.83.0 y todo el output viven en `<SMOKE_DIR>` o el scratchpad y **se borran al cerrar**.

### 5. Tests obligatorios
No hay tests nuevos del repo. Las **sondas** son las evidencias V-n (salida pegada, sin direcciones). Los gates solo se corren para el **baseline** y para comprobar que el árbol quedó limpio.

### 6. Smoke (formato FLUJO §6; localnet aislada, `agents.md` §3 con la **Receta P** (puerto alternativo, ejemplo 19000) y la Receta V1)
| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Receta P: el puerto 9000 ajeno **no se toca**, `<puerto>` libre; génesis **sin ningún `suic`**; `sui start --fullnode-rpc-port <puerto>` en segundo plano con la CLI de PRE-1; recién después `smoke_guard` y `smoke_guard_v1` (RPC exacto = `$RPC_URL`) | `chain-identifier` responde; `active-env` = localnet con **ambos** binarios y el RPC del env activo es `$RPC_URL` |
| 2 | V-16: hashes del tgz y del binario 1.83.0 | coinciden con `SUI_TGZ_SHA256` y `SUI_BIN_SHA256` de `88dd53b`; `sui --version` = `1.83.0-16d2dc1e05ed` |
| 3 | `suic_v1 test-publish` del árbol `26f2676` | éxito; `House`, `HouseCap` y `UpgradeCap` creados; pubfile escrito |
| 4 | V-2 diff de bytecode | hashes de `house`/`game` iguales, o diff explicado |
| 5 | V-1 `test-upgrade` v2 con módulo nuevo | éxito; el módulo llama a `add_fees`; `fees_collected` sube lo esperado |
| 6 | V-8 `init` | el `init` del módulo nuevo corre; el de uno existente no |
| 7 | V-10/V-11 | un solo PTB; reintento con pubfile viejo = `PackageIDDoesNotMatch`; salidas guardadas |
| 8 | Cierre (`agents.md` §3, paso 7) | `kill` por PID, `~/.sui/` idéntico a la línea base, `git status` sin entradas de la corrida, `Move.lock` y `Published.toml` sin delta |

### 7. Criterios de aceptación (DoD)
Cada V con su salida y veredicto PASA / NO PASA / NO CONCLUYENTE; **si V-1 falla** (el módulo nuevo no puede llamar a `add_fees` o el upgrade se rechaza): **STOP** (el plan cae a P-5: R-1), no se sigue; los dos hashes del 1.83.0 verificados **antes** de ejecutarlo y citados; ninguna llamada al 1.83.0 sin el prefijo; fixtures reales listas para TASK-4; diff de bytecode entregado; baseline escrito; árbol limpio y cierre verificado.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-1a.txt`; sin commits. Snippet para STATUS: fila "localnet aislada @ `feature/issue-73-multigame` (TASK-1a de #73)".

---

# TASK-1b: Sondas de tipos, reloj, witness y hot potato (parte 2) — área: contracts (smoke 🧪)

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** probar en la localnet aislada cómo se identifican los tipos de un upgrade, que `clock::borrow()` lee el mismo reloj que `0x6`, y que un witness ajeno o un `Collected` descartado no compilan y un PTB no puede intercalar una `entry` con un hot potato, **para** tener evidencia antes de escribir la base.

**Scope:** V-3, V-12, V-4, V-5, V-13, V-14, V-15 y V-2 (`additive`); **ningún archivo de producción**. **NO entrega:** `duel`, `coinflip`, el script (TASK-4).

### 2. Contexto
- Depende de TASK-1a (receta del binario, v1/v2 de ensayo, fixtures). Plan §13 (V-3, V-4, V-5, V-12, V-13, V-14, V-15, V-2), §2.4-§2.7, H-14 del plan. **Como todavía no existe `duel`**, V-14 y V-15 usan un **stand-in** de la base (módulo sandbox con un objeto compartido genérico `Thing<phantom G>`, una `public(package)` con witness que devuelve un struct **sin abilities**, una función que lo consume y una `entry` genérica `cancel<G>(&mut Thing<G>)`).
- 1b repite génesis y v1/v2 con la receta de 1a; el binario 1.83.0 ya descargado se **reusa** solo si sigue en el scratchpad, **re-verificando sus dos SHA-256 antes de ejecutarlo** (Receta V1).
- Todos los sandbox se arman con `git archive HEAD contracts | tar -x -C <SMOKE_DIR>/<v2|v3>`, nunca en el worktree.

### 3. Qué implementar (todo en `<SMOKE_DIR>`)
0. Baseline: el medido en 1a (si el árbol cambió, se vuelve a medir y se declara).
1. **V-3 / V-12 / V-4 / V-5** sobre tipos introducidos en el upgrade (un struct genérico `Probe<phantom G>`, un witness, un evento genérico y un abort propio, en un módulo v2 sandbox; y un segundo upgrade **v3** sandbox con otro tipo `G`): (V-3) con `SuiGrpcClient`/`listEvents`/`getObject`, el prefijo del evento y del objeto es el ID del **upgrade** y coincide con la tabla de orígenes (`typeOrigins`); (V-12) una `entry` genérica llamada con el `typeArguments` armado con el ID de almacenamiento falla y con el de definición pasa (con un `G` de un módulo introducido en **otro** upgrade); (V-4) filtro `eventType` del `ListEvents` crudo de `app/src/sui/eventScan.ts` con y sin parámetros de tipo, con un literal `emitModule`, y una DNF de 2, 4, 8, 16… términos hasta el rechazo; (V-5) qué ID informa `MoveAbort.location.package` en un abort del módulo nuevo.
2. **V-13:** `sui::clock::borrow()` con el framework de PRE-1 (compila y ejecuta); comparar su `timestamp_ms` con el del objeto `Clock` (`0x6`) pasado a otra función **en la misma transacción** (dos transacciones consecutivas); en `sui move test`, la API `test_scenario::set_clock_timestamp` (exige `ms` creciente; sin ella cada tx avanza 1 ms) **sin warnings** con `--warnings-are-errors`. PV de mainnet por GraphQL público de solo lectura (informativo).
3. **V-14 (witness y `Collected`) con el stand-in:** (a) un módulo que intenta empaquetar el witness de otro módulo, o llamar a la función con witness sin él, **no compila**; (b) un módulo que **descarta** el struct sin abilities devuelto (`let _ = …`/dejarlo sin usar) **no compila**; (c) un módulo que lo **guarda en un struct** no compila. **Cada caso pega el mensaje de error esperado** (falta de `drop` o `store`, o witness no construible; no vale un error por otra causa) **y un control positivo** (la misma sonda sin la línea ofensiva compila, con su salida), sin commitear (H-5, R2-3).
4. **V-15 (hot potato):** un PTB que llama a la función que devuelve el hot potato y después a la `entry` genérica con el mismo objeto es **rechazado antes de ejecutar** (regla de "clique caliente", plan H-14); un `cancel<A>` sobre un `Thing<B>` se rechaza por tipo.
5. **V-2 (`additive`), prioridad normal:** sobre el `UpgradeCap` de la prueba, `sui::package::only_additive_upgrades` y repetir el upgrade (a) con el módulo nuevo y (b) con un cambio de cuerpo en `house`; informar qué pasa y si la CLI nueva rompe `additive` sobre un paquete publicado con la 1.83.

### 4. Archivos a tocar / NO tocar
Igual que TASK-1a: se commitea (el orquestador) solo lo que sirva como fixture real de `contracts/scripts/fixtures/`; **NO tocar** `contracts/sources/*`, `contracts/tests/*`, `Move.lock` (si cambia: `git checkout --` y declararlo), `contracts/deployments/*`, `Published.toml`, `app/*`.

### 5. Tests obligatorios
Ninguno del repo; las sondas son las evidencias V-n.

### 6. Smoke (localnet aislada, `agents.md` §3 con la **Receta P** y la Receta V1)
| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Receta P (puerto alternativo, génesis sin `suic`, `sui start --fullnode-rpc-port <puerto>`), v1 (1.83.0) y v2 sandbox; las sondas de `SuiGrpcClient` y de `ListEvents` usan `$RPC_URL` | como en TASK-1a |
| 2 | V-3, V-12 con el upgrade v3 sandbox | prefijos = IDs de definición; `typeArguments` con el ID de definición pasa y con el de almacenamiento falla |
| 3 | V-4 | resultados de filtro con/sin parámetros de tipo, con `emitModule` y límite de términos de la DNF |
| 4 | V-5 | ID de `MoveAbort.location.package` informado |
| 5 | V-13 | `borrow()` = `0x6`; `set_clock_timestamp` sin warnings |
| 6 | V-14 (a, b, c) | los tres casos no compilan; salida pegada |
| 7 | V-15 | PTB con hot potato + `entry` rechazado antes de ejecutar; `cancel<A>` sobre `Thing<B>` rechazado |
| 8 | V-2 `additive` | resultado informado |
| 9 | Cierre | como en TASK-1a |

### 7. Criterios de aceptación (DoD)
Cada V con salida y veredicto; **V-13 y V-15 en PASA** (TASK-2/2b dependen de ellos: sin PASA, STOP); V-14 (a)-(c) con la salida de build; sin llamadas al 1.83.0 sin prefijo; árbol limpio.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-1b.txt`; sin commits.

---

# TASK-2: Base `duel`: custodia, ciclo y comisión — área: contracts

### 1. Historia de usuario del task
**Como** desarrollador de juegos, **quiero** una base genérica `Duel<phantom G>` con la custodia del pozo, el ciclo crear/cancelar/rechazar/activar, los controles de tiempo y el cobro de la comisión con un hot potato, **para** que cada juego nuevo reutilice una única implementación auditada de los fondos.

**Scope:** layout y estado completos (las 6 variantes), `create`, `cancel`, `reject`, `activate`, `activate_atomic`, `collect`, `pay`, la tabla de controles, eventos `DuelCreated`/`DuelCancelled`/`DuelActivated`/`DuelResolved` y sus tests. **NO entrega:** `record_move`, `claim_timeout`, `refund_stalled` ni los eventos `DuelTurn`/`DuelTimedOut`/`DuelExpired` (TASK-2b), el coinflip (TASK-3), ni cambios a `house.move`/`game.move`.

### 2. Contexto
- Depende de **PRE-1 mergeado y lock repinado** (C-2), de TASK-1a con **V-1 en PASA** y de TASK-1b con **V-13 en PASA**.
- Modelo a **replicar, no reinventar:** `contracts/sources/game.move` (`create_game` 88-117, `cancel_game`/`reject_game` 121-137, `refund_creator` 163-173, `assert_acceptable` 184-192, `collect_pot` 197-205, `pay_winner` 210-232, `fee_amount` 237-239) y `contracts/tests/game_tests.move` (helpers `publish` 41, `create` 50, `random_ready` 99, `other_house` 118, `accept_on_house` 127; aborts de orden 1014-1141; `test_cancel_refunds_regardless_of_versions` 569, `test_accept_huge_pot_needs_u128_intermediate` 1185). `house.move`: `add_fees` 150, accessors 156-177, `version` 181, `set_version_for_testing` 196.
- Referencia canónica: R.1-R.7 de este handoff. La tabla de R.4 es la del plan §2.5.
- `sui::clock::borrow()` (framework PV 142). En tests: `test_scenario::ctx_builder_from_sender(addr).set_clock_timestamp(ms)` con `scenario.next_with_context(builder)`; sin él, cada tx avanza el reloj 1 ms (V-13).

### 3. Qué implementar
- Módulo `battleship::duel` en `contracts/sources/duel.move`: R.1 (struct, enum de 6 variantes, `Collected`), R.2 (constantes y tabla de controles en el cuerpo de `create`), R.3 (constantes `E…` con los números exactos), R.5 (estos 4 eventos: `DuelCreated`, `DuelCancelled`, `DuelActivated`, `DuelResolved`; los otros 3 en 2b) y las funciones `create`, `cancel`, `reject`, `activate`, `activate_atomic`, `collect`, `pay` de R.4.
- Las variantes `TimedOut` y `Expired` y el campo `to_move`/`deadline_ms` se **declaran** ya (el enum se congela con las 6); las construyen funciones de 2b.
- Comisión: `fee_amount(pot, fee_rate)` privada duplicada, `u128` intermedio, piso; `collect` y `activate_atomic` llaman a `house::add_fees` **siempre**.
- `ctx.sender()` para `acceptor` y para la authZ de `collect` (`ENotPlayer`).
- Helpers `#[test_only]` en `duel.move` (`*_for_testing`) para leer campos y estado y para fabricar escenarios que la API no permite (p. ej. alterar `stake` para el test de `EBrokenStake`, fijar `version`).
- **Comentarios:** `///` en todo lo público; los internos explican el POR QUÉ (por qué `public(package)`, por qué el orden de aborts, por qué `ENotActive` antes de `ENotPlayer`, por qué `fee_amount` duplicado).

### 4. Archivos a tocar / NO tocar
- **Tocar (nuevos):** `contracts/sources/duel.move`, `contracts/tests/duel_tests.move` (con witnesses `#[test_only]` `TestGame` y `OtherGame`, definidos en el módulo de tests; **no se publican**).
- **NO tocar:** `contracts/sources/house.move`, `contracts/sources/game.move`, `contracts/tests/house_tests.move`, `contracts/tests/game_tests.move`, `Move.toml`, `Move.lock` (delta ⇒ declarar y justificar), `contracts/deployments/*`, `contracts/Published.toml`, `app/*`, `.github/*`.

### 5. Tests obligatorios (`contracts/tests/duel_tests.move`, `test_scenario`; direcciones de prueba cortas)
authZ por función con test del caso denegado; conservación (`Coin` de cada actor y `fees_collected` antes/después); cada abort con `#[expected_failure(abort_code = battleship::duel::E…)]` en **el orden de la tabla**:
- **create:** `test_create_open_duel_stores_fields_and_emits_event`, `test_create_invite_duel_stores_opponent`, `test_create_copies_fee_rate_and_turn_ms`, `test_create_sets_turn_ms_for_each_control` (ids 0..7 ⇒ tabla R.2), `test_create_rejects_invalid_control` (8 y 255, `EBadControl`; **barrera funcional** contra un id 8 del sandbox, R2-1), `test_create_accepts_bet_equal_to_min_bet` / `…_max_bet`, `test_create_rejects_bet_below_min` / `…_above_max`, `test_create_rejects_self_invite`, `test_create_rejects_house_with_wrong_version`, `test_create_reports_version_before_bet`, `test_create_reports_bet_error_before_self_invite`, `test_create_reports_self_invite_before_control`, `test_duels_of_same_creator_are_independent`.
- **cancel / reject:** `test_cancel_refunds_full_stake_and_emits_event`, `test_cancel_invite_duel_by_creator`, `test_cancel_rejects_other_address` (`ENotCreator`), `test_cancel_rejects_invitee`, `test_cancel_rejects_cancelled_duel` (`ENotPending`), `test_cancel_rejects_active_duel`, `test_cancel_by_other_on_cancelled_duel_reports_not_creator`, `test_reject_refunds_creator_and_emits_event`, `test_reject_rejects_other_address` (`ENotInvited`), `test_reject_rejects_creator`, `test_reject_rejects_open_duel` (`ENoInvitation`), `test_reject_rejects_cancelled_duel`, `test_reject_by_other_on_cancelled_invite_reports_not_invited`, **`test_cancel_refunds_regardless_of_versions`** y **`test_reject_refunds_regardless_of_versions`** (INV-D2: House y `Duel` en otra versión; como `game_tests.move:569, 599`).
- **activate:** `test_activate_joins_stake_and_sets_clock_state` (`Active { acceptor, to_move, deadline_ms = ahora + turn_ms }`, `stake == 2 × bet`, evento), `test_activate_invite_by_invitee`, `test_activate_rejects_own_duel` (`ESelfPlay`), `test_activate_rejects_non_invited` (`ENotInvited`), `test_activate_rejects_cancelled_duel` (`ENotPending`), `test_activate_rejects_lower_stake` / `…_higher_stake` (`EWrongStake`), `test_activate_rejects_other_house` (`EWrongHouse`), `test_activate_rejects_duel_of_older_version` (`EVersionMismatch`), `test_activate_rejects_house_of_newer_version` (`house::EWrongVersion`), `test_activate_rejects_clockless_duel` (`ENoClock`), `test_activate_rejects_invalid_first_to_move` (0 y 4, `EBadMask`), y los de orden (`…reports_version_before_house`, `…reports_house_before_authz`, `…reports_state_before_stake`, `…reports_stake_before_no_clock`).
- **activate_atomic:** `test_activate_atomic_collects_fee_and_pay_conserves_funds` (con una función de test que encadena `activate_atomic` + `pay` para cada `winner_index`), `test_activate_atomic_rejects_clocked_duel` (`EHasClock`), `test_activate_atomic_aborts_with_house_of_other_version` (`house::EWrongVersion`), más los mismos chequeos de authZ/estado/monto que `activate`.
- **collect / pay:** `test_collect_then_pay_resolves_by_play_and_conserves_funds`, **`test_collect_rejects_third_party`** (`ENotPlayer`), **`test_collect_by_player_out_of_turn_succeeds`** (rendición), `test_collect_rejects_clockless_duel` (`ENoClock`), `test_collect_rejects_after_deadline` (`EDeadlinePassed`), `test_collect_rejects_not_active` (`ENotActive`), `test_collect_rejects_other_house` (`EWrongHouse`), `test_collect_rejects_duel_of_older_version` (`EVersionMismatch`), `test_collect_rejects_broken_stake` (`EBrokenStake`, con el helper de test), `test_collect_aborts_in_fee_collection_with_house_of_other_version` (`house::EWrongVersion`, como `game_tests.move:1042`), `test_pay_pays_creator_when_index_is_zero` / `…_acceptor_when_index_is_one`, **`test_pay_rejects_collected_of_other_duel`** (`EWrongDuel`, dos `Duel` en la misma tx), `test_pay_rejects_bad_winner_index` (`EBadWinnerIndex`), `test_pay_rejects_not_active`.
- **Comisión y fondos:** `test_fee_is_floor_of_pot_times_rate` (fee_rate 0, 250 y 1000; pozos impares, p. ej. `bet = 1_000_001`), `test_fee_with_max_bet_and_max_fee_does_not_overflow` (`u128`, como `game_tests.move:774, 1185`), `test_fee_rate_copied_at_creation_is_the_one_charged`, `test_fees_from_duel_and_game_accumulate_in_same_house` (un `Game` y un `Duel` sobre la misma House: `fees_collected` suma ambos), `test_terminal_states_hold_no_stake`, `test_stake_is_two_bets_after_activate`.
- **Sonda de compilación contra el `duel` real (H-5, R2-3; sin commitear):** en una copia **del árbol de trabajo** en `<SMOKE_DIR>/probe` (el `duel.move` real todavía no está commiteado: `cp -a <repo>/contracts <SMOKE_DIR>/probe` sin `build/`, o `git archive HEAD contracts` más `git diff -- contracts` aplicado con `patch -p1` **y los archivos nuevos sin trackear**), un módulo de prueba que (a) **descarta** un `Collected` (`let _ = …`/sin usar) o (b) lo **guarda** en un struct con `key`/`store`/`drop` **no compila**, y (c) uno que llama a `pay` sin haber cobrado no puede construir el `Collected`. **Hay que pegar el mensaje de error esperado** (falta de la ability `drop` o `store`; un error por módulo inexistente o por otra causa **no vale**) y un **control positivo**: la misma sonda sin la línea ofensiva (consumiendo el `Collected` con `pay`) **compila**; se pegan las dos salidas y **la declaración real de `Collected`** (sin abilities) tal como está en `duel.move`.
- **No se puede probar en `test_scenario`** (va a TASK-1b/TASK-5 como sonda): que un PTB no pueda intercalar una `entry` entre `collect` y `pay` (V-15) y el aislamiento por witness entre módulos (V-14): el reporte cita esas sondas de TASK-1b y, para el witness, un test con `OtherGame` que **no** puede liquidar un `Duel<TestGame>` por tipo (no compila: se documenta en un comentario y en la salida de V-14, no se commitea código que no compile).

### 6. Smoke
No aplica (unit tests con `test_scenario`); el smoke de punta a punta es TASK-5.

### 7. Criterios de aceptación (DoD)
- `sui move build -e testnet --warnings-are-errors`, `--lint` y `sui move test -e testnet --warnings-are-errors` en verde (**83 + N tests**, N nuevos); `Move.lock` sin delta; `house.move` y `game.move` **sin diff**.
- Ninguna `public fun` nueva; ninguna función con `Random`; ningún `init`; sin `allow(lint(public_random))`; pagos solo a direcciones guardadas (R.4 (g)); la sonda de compilación de `Collected` y su declaración real pegadas en el reporte.
- Cada abort de R.3 usado por estas funciones tiene su test; los números coinciden con R.3 (el reporte pega la lista `constante = número` leída del fuente).
- INV-D1, D2, D4 y D7 cubiertos (matriz test ↔ INV en el reporte); cobertura informativa (`sui move test --coverage`) de `duel` sin ramas sin cubrir salvo las de 2b.
- Greps §R-6 vacíos o clasificados.

### 8. Al terminar
Reporte (plantilla §R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-2.txt`; sin commits. Incluye el output **pegado** de los tres gates (con su conteo), `git diff --stat`, `git diff --exit-code -- contracts/sources/house.move contracts/sources/game.move contracts/Move.lock` (exit 0) y la lista de abort codes.

---

# TASK-2b: Reloj por jugada en la base — área: contracts

### 1. Historia de usuario del task
**Como** jugador (y desarrollador de #18), **quiero** que la base aplique un reloj por jugada (quién debe mover, hasta cuándo, qué pasa al vencer), **para** que abandonar una partida sea perder y ningún juego tenga que reimplementar el abandono.

**Scope:** `record_move`, `claim_timeout`, `refund_stalled`, eventos `DuelTurn`/`DuelTimedOut`/`DuelExpired`, `CLAIM_GRACE_MS`, la tabla de transiciones generada desde los tests y la suite del reloj. **NO entrega:** reglas de turnos de ningún juego (#18), el coinflip (TASK-3).

### 2. Contexto
- Depende de TASK-2 (layout, `activate`, `collect`, `pay`, helpers). **Condición de arranque:** el reporte de TASK-1b tiene **V-13 y V-15 en PASA** (recordatorio del MAYOR: sin ellos, TASK-2b no se cierra; si faltan, STOP).
- Referencia: R.1-R.7, en especial R.4 (`record_move`, `claim_timeout`, `refund_stalled`), INV-D2, D3, D6, D7.
- **Corrección R4-1 (aplicada, plan v1.3.1) — causas separadas en `record_move`:** `ENotYourTurn` (20) = solo "jugador fuera de `to_move`"; `ENotPlayer` (24) = "no es jugador"; `EBadMask` (19) = solo máscara fuera de `1..=3`; `EPhaseMismatch` (25, **nuevo**) = con `rem != 0`, `next != rem`. **Orden de aborts de `record_move`:** `ENotActive` (11), `ENoClock` (17), `ENotPlayer` (24), `ENotYourTurn` (20), `EDeadlinePassed` (21), `EBadMask` (19) / `EPhaseMismatch` (25). La numeración 0-25 no tiene colisiones (R.3): el DEV lo verifica leyendo las constantes y lo pega en el reporte. **El MID lo comprueba al revisar el reporte.**

### 3. Qué implementar
- **`record_move<G>`** con la regla de bits de R.4: `rem = to_move & !bit(sender)` donde `bit(creator) = 1` y `bit(acceptor) = 2`. Con `rem != 0` (fase simultánea con otro pendiente): `next_to_move` debe ser `rem` (si no, `EPhaseMismatch`), `to_move = rem` y `deadline_ms` **no cambia**. Con `rem == 0`: `next_to_move ∈ 1..=3` (si no, `EBadMask`), `to_move = next_to_move` y `deadline_ms = ahora + turn_ms` — **también si sigue el mismo jugador** (cada jugada válida tiene su plazo completo). `turn_ms` sale **siempre** del `Duel`. Emite `DuelTurn`.
- **`claim_timeout<G>`:** `entry` genérica; si `to_move ∈ {1, 2}` y `ahora ≥ deadline_ms`: `fee` con el `fee_rate` copiado → `add_fees`; `pozo − fee` al rival (`to_move = 1` ⇒ el aceptante; `2` ⇒ el creador), **no a quien llama**; estado `TimedOut { acceptor, winner }`; evento `DuelTimedOut` con `claimed_by = ctx.sender()`. Con `to_move == 3`: `EBothPending`.
- **`refund_stalled<G>`:** `entry` genérica sin House ni versión; elegibilidad: `to_move == 3` y `ahora ≥ deadline_ms`, o un pendiente y `ahora ≥ deadline_ms + CLAIM_GRACE_MS`; paga `bet` al creador y el resto (`stake − bet`) al aceptante **sin `assert` de `stake == 2 × bet`**; estado `Expired { acceptor }`; evento `DuelExpired`.
- **Tabla de transiciones generada desde los tests (entregable, R3-6 (a)):** estado × función × {antes, en, después} del plazo × `to_move` ⇒ resultado o abort, con una celda por combinación relevante; se genera **ejecutando** los tests (cada test aporta su celda) y se pega en el reporte como tabla de texto (el MID la transcribe a la compuerta). Cubre INV-D6 y la regla de bits.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `contracts/sources/duel.move` (agregar las 3 funciones, 3 eventos y constantes), `contracts/tests/duel_tests.move` (+ un juego de test `#[test_only]` con jugadas por turnos y con fase simultánea, en el módulo de tests).
- **NO tocar:** `house.move`, `game.move`, `Move.lock` (delta ⇒ declarar), los números de abort ya fijados en TASK-2 (solo se **agrega** el 25), `app/*`.

### 5. Tests obligatorios (nombres; reloj con `ctx_builder_from_sender(..).set_clock_timestamp(ms)`)
- **Borde exacto:** `test_record_move_passes_one_ms_before_deadline`, `test_claim_timeout_rejects_one_ms_before_deadline` (`ENotExpired`), `test_record_move_rejects_at_deadline` (`EDeadlinePassed`), `test_collect_rejects_at_deadline` (`EDeadlinePassed`), `test_claim_timeout_succeeds_at_deadline`.
- **Reclamo:** `test_claim_timeout_pays_acceptor_when_creator_pending` y `…_creator_when_acceptor_pending` (con `fee_rate` 0/250/1000 y pozos impares; `payout + fee == 2 × bet`; `fees_collected` sube `fee`), `test_claim_timeout_by_third_party_pays_the_rival_not_the_caller`, `test_claim_timeout_rejects_both_pending` (`EBothPending`), `test_claim_timeout_rejects_not_active`, `test_claim_timeout_rejects_clockless_duel` (`ENoClock`), `test_claim_timeout_rejects_other_house` (`EWrongHouse`), **`test_claim_timeout_aborts_with_house_of_other_version`** (`house::EWrongVersion`: el corte la bloquea) y `test_claim_timeout_stores_timed_out_state_and_event`.
- **Reembolso:** `test_refund_stalled_refunds_both_when_both_pending_at_deadline` (**con conservación por actor**: `Coin` del creador = `bet`, del aceptante = `bet`, del tercero que llama = 0, `fees_collected` sin cambio, `stake == 0`), `test_refund_stalled_rejects_one_pending_before_grace` (`ENotStalled`), **`test_refund_stalled_one_pending_rejects_one_ms_before_grace`** y **`test_refund_stalled_one_pending_succeeds_at_deadline_plus_grace`** (borde exacto de la gracia, **escritos con el literal 604 800 000 ms y no con el nombre de la constante**: son la barrera funcional contra una gracia acortada del sandbox, R2-1), **`test_refund_stalled_both_pending_rejects_one_ms_before_deadline`**, **`test_claim_timeout_still_succeeds_after_grace`** (el ganador aún puede reclamar pasada la gracia: la carrera documentada), **`test_claim_timeout_after_refund_stalled_aborts_not_active`** (`ENotActive`), `test_refund_stalled_refunds_both_after_grace_with_one_pending` (con la misma conservación por actor), `test_refund_stalled_rejects_both_pending_before_deadline`, **`test_refund_stalled_works_with_house_of_other_version`** (INV-D2: el corte no la alcanza), `test_refund_stalled_charges_no_fee`, `test_refund_stalled_by_third_party_pays_only_the_players` (tercero 0, creador `bet`, aceptante `bet`), `test_refund_stalled_rejects_not_active` / `…_clockless_duel`.
- **`record_move` (regla de bits y aborts, en el orden R4-1):** `test_record_move_turn_handoff_resets_deadline` (`rem == 0`, `next` = el rival), `test_record_move_same_player_continuing_also_resets_deadline`, `test_record_move_simultaneous_phase_first_a_keeps_deadline` y **`test_record_move_simultaneous_phase_first_b_keeps_deadline`** (la fase simultánea en **los dos órdenes**: A primero y B primero), `test_record_move_phase_close_resets_deadline_even_if_closer_moves_next` (el caso del MAYOR: el último en comprometer recibe plazo completo), `test_record_move_rejects_next_other_than_rem_in_simultaneous_phase` (`EPhaseMismatch`, con `next` = 1, 3 y 0 cuando `rem = 2`, y con `rem = 1`), `test_record_move_rejects_next_zero_or_above_three` (`EBadMask`, con `rem == 0`), `test_record_move_rejects_player_outside_to_move` (`ENotYourTurn`), `test_record_move_rejects_third_party` (`ENotPlayer`), `test_record_move_rejects_not_active`, `test_record_move_rejects_clockless_duel` (`ENoClock`), `test_record_move_reports_not_player_before_not_your_turn`, `test_record_move_reports_not_your_turn_before_deadline`, `test_record_move_reports_deadline_before_mask`.
- **Partidas completas con el juego de test:** `test_turn_based_game_runs_to_resolution_by_collect_and_pay`, `test_simultaneous_phase_then_turns_then_claim_timeout`, `test_surrender_out_of_turn_before_deadline_resolves`.
- **Cierres (después de un estado terminal):** `claim_timeout`/`refund_stalled`/`record_move`/`collect` sobre un `Duel` ya `Resolved`, `TimedOut` o `Expired` abortan con `ENotActive`.
- **Controles:** el `turn_ms` guardado nunca cambia tras `record_move` (`test_turn_ms_is_never_changed_by_record_move`).

### 6. Smoke
No aplica aquí (unit tests). Las sondas V-13 y V-15 **ya** están en TASK-1b; TASK-5 repite el reloj de punta a punta en la localnet.

### 7. Criterios de aceptación (DoD)
- Gates de `contracts` en verde (83 + N de 2 + N de 2b); `Move.lock` sin delta; `house.move`/`game.move` sin diff; numeración de aborts 0-25 sin colisiones (lista pegada); R4-1 aplicado tal cual (orden y causas).
- INV-D2, D3, D6 y D7 con test; la **tabla de transiciones** generada desde los tests, pegada en el reporte.
- **V-13 y V-15 en PASA** (citadas del reporte de TASK-1b) — sin eso no se cierra el task.
- Sin función `public` nueva, sin `Random`, sin `init`.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-2b.txt` con: output de los gates, la matriz test ↔ INV-D1..D7 y la tabla de transiciones; sin commits.

---

# TASK-3: `coinflip` sobre `duel` — área: contracts

### 1. Historia de usuario del task
**Como** jugador, **quiero** un coinflip nuevo que use la base común (con la misma fórmula de pago y el mismo sorteo seguro) y no use reloj, **para** que la base se pruebe de punta a punta con fondos reales antes de #18 y el coinflip viejo siga intacto.

**Scope:** módulo `coinflip` (witness `Coinflip`, `entry` `create` y `accept`) y su suite. **NO entrega:** reloj (control 0), cambios a `game.move`, juegos nuevos.

### 2. Contexto
- Modelo: `game.move` (`create_game` 88-117, `accept_game` 142-159, comentarios SEG-5), `game_tests.move` (aleatoriedad: `random_ready` 99, `random_round` 109, `accept_forced` 156, `test_accept_with_random_resolves_and_conserves_funds` 845, `test_accept_with_random_reaches_both_outcomes` 884, `SEED` y `RANDOM_SEEDS` 30-38).
- Plan: R.7 (SEG-5), §2.7, §5 (migración), D3.

### 3. Qué implementar
- `contracts/sources/coinflip.move`: `public struct Coinflip has drop {}` (nombre **`Coinflip`**, sin constructor `public`); `entry fun create(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx)` → `duel::create(Coinflip {}, house, stake, opponent, 0 /* sin reloj */, ctx)`; `entry fun accept(duel: &mut Duel<Coinflip>, house: &mut House, payment: Coin<SUI>, r: &Random, ctx)` con el orden **`duel::activate_atomic` (valida y cobra) → `r.new_generator(ctx)` → `generate_u8_in_range(0, 1)` → `duel::pay(…, índice, ctx)`** (como `game.move:149-158`). `accept` **no** es `public` (lint `public_random`); el generador se crea adentro; nada que pueda abortar entre el sorteo y `pay`.
- Sin `init`. Helper `#[test_only] accept_with_winner_for_testing` (como `game.move:316-327`) para fijar el ganador sin `Random`.

### 4. Archivos a tocar / NO tocar
- **Tocar (nuevos):** `contracts/sources/coinflip.move`, `contracts/tests/coinflip_tests.move`.
- **NO tocar:** `house.move`, `game.move`, `duel.move` (si hace falta algo de la base, STOP), `Move.lock` (delta ⇒ declarar), tests existentes.

### 5. Tests obligatorios (`contracts/tests/coinflip_tests.move`)
`test_create_makes_clockless_pending_duel_and_emits_event` (control 0, `turn_ms == 0`), `test_create_invite_duel`, `test_accept_with_random_resolves_and_conserves_funds`, `test_accept_with_random_reaches_both_outcomes` (4 semillas, ambos resultados), `test_accept_creator_wins_pays_payout_and_fee` / `…_acceptor_wins_…` (con el ganador forzado), `test_accept_with_zero_fee_pays_whole_pot`, `test_accept_with_max_fee_charges_ten_percent`, `test_accept_rounds_fee_down_on_indivisible_pot`, `test_accept_huge_pot_needs_u128_intermediate`, `test_accept_uses_fee_rate_copied_at_creation`, **`test_accept_never_leaves_duel_active`** (INV-D5: tras `accept` el `Duel` está `Resolved` y `stake == 0`), `test_accept_rejects_own_duel` (`ESelfPlay`), `test_accept_rejects_non_invited` (`ENotInvited`), `test_accept_rejects_lower_stake` / `…_higher_stake` (`EWrongStake`), `test_accept_rejects_cancelled_duel` / `…_resolved_duel` (`ENotPending`), `test_accept_rejects_other_house` (`EWrongHouse`), `test_accept_from_other_house_version_aborts_before_the_draw` (`house::EWrongVersion` en `activate_atomic`, antes del sorteo), `test_cancel_and_reject_work_on_coinflip_duels` (usando las `entry` genéricas con el tipo `Duel<Coinflip>`), `test_fees_from_coinflip_and_legacy_game_accumulate_in_same_house`.

### 6. Smoke
No aplica (unit); TASK-5 lo juega en la localnet.

### 7. Criterios de aceptación (DoD)
Gates de `contracts` en verde (`--lint` incluido: `public_random` no dispara); **grep de R.7 sobre `contracts/sources` con la salida pegada** (`/usr/bin/grep -rn "allow(lint(public_random))\|RandomGenerator" contracts/sources`: solo la creación del generador dentro de `accept`, ningún `allow` y ningún struct con un campo `RandomGenerator`); `accept` es `entry` no `public`; `Coinflip` sin `copy`/`store` ni nombre en mayúsculas del módulo; el gasto es el mismo en ambos resultados (mismo camino; se explica en un comentario como `game.move:207-209`); `house.move`/`game.move`/`duel.move` sin diff de este task; greps §R-6.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-3.txt`; sin commits.

---

# TASK-4: Script y esquema de upgrade — área: contracts/ci (smoke 🧪)

### 1. Historia de usuario del task
**Como** owner, **quiero** un script que haga y registre un upgrade del paquete con las mismas guardas que la publicación, y un esquema de despliegue que sepa de upgrades y de los ID de definición de los tipos, **para** actualizar `testnet.json`/`Published.toml` sin editar nada a mano y que la app y la CI verifiquen el resultado.

**Scope:** subcomandos `upgrade` y `record` de upgrade, campos opcionales `upgrades` y `typeOrigins`, `check` con invariantes nuevos y el runbook de upgrade en `contracts/README.md`. **NO entrega:** ejecutar un upgrade en testnet (del owner, nunca un agente, ni `--dry-run`), cambios de contrato.

### 2. Contexto
- Hoy: `contracts/scripts/publish.mjs` (subcomandos `publish | record | check`, `SUBCOMMAND_OPTIONS` 59-62, `parseCliArgs` 83-99, allowlist de `sui` `ALLOWED_SUI_VECTORS` 102-117 y `TEST_PUBLISH_PREFIX` 109, `publishCliArgs` 184, guardas 207-420, `commandPublish` 648, `commandRecord` 764, `commandCheck` 798) y `deployment.mjs` (`DEPLOYMENT_FIELDS` 15-30, **`OPTIONAL_FIELDS` vacío, 36**, `validateDeployment` 222, `parsePublishedToml` 283, `checkConsistency` 341-360). Tests: `publish.test.mjs`, `deployment.test.mjs`; fixtures `contracts/scripts/fixtures/`.
- Plan: §4.4 (datos del json y validación), §11 (runbook), §12 (R-2), V-6 y V-11 (se resuelven acá), H-8/H-9.
- Depende de TASK-1a (salidas reales de `test-upgrade`, tabla de orígenes). El plan define el **comportamiento**; la forma exacta de las opciones es del DEV dentro de este marco (desviaciones declaradas):

### 3. Qué implementar
- **Subcomando `upgrade`** (`--network`, `--pubfile-path` y `--out` **solo localnet**, `--dry-run`), con **las mismas guardas** que `publish` (Node de `.nvmrc`, config fuera de `~/.sui`, red y chain id, CLI = `ci.yml`, árbol limpio, `Move.lock` sin delta, confirmación escrita por terminal para testnet sin forma de saltarla, nunca imprimir direcciones). Testnet: exige que **existan** `deployments/testnet.json` y `[published.testnet]` y usa `sui client upgrade`; localnet: `sui client test-upgrade --pubfile-path … --build-env testnet` (agregar a la allowlist de `runSui` solo esos vectores). Un solo PTB (V-10). El owner además comprueba antes que el `UpgradeCap` sigue en su dirección (runbook).
- **Variante B en localnet (H-7):** `upgrade --network localnet --pubfile-path <…>` **sin `--out`** reescribe `contracts/deployments/localnet.json` (ignorado por git; el script crea la carpeta si falta y el cierre de `agents.md` §3 lo borra), con el mismo contenido que con `--out` (variante A, salida dentro de `<SMOKE_DIR>`). Es lo que lee la app en `npm run dev` (TASK-8); **nada se edita a mano** (ARQ-6). Tiene su test.
- **Campos base (R2-2):** `upgrade` **lee** el `deployments/<red>.json` **existente** para los campos de la publicación original (`originalPackageId`, `upgradeCapId`, `houseId`, `houseCapId`, `publishTxDigest`, `publishTimestamp`, `chainId`) y **aborta con un mensaje claro si falta** (no inventa ni publica); en localnet ese json lo deja `record` sobre la salida de `test-publish` del v1 (receta de TASK-5 paso 1). Tiene su test.
- **Registro:** reescribe en `deployments/<red>.json` los campos "versión vigente" (`packageId`, `packageVersion`, `sourceCommit`, `suiCliVersion`, `frameworkRev`) y **agrega** `upgrades: [{ version, packageId, txDigest }]` (uno por upgrade, orden ascendente, `version` 2..`packageVersion`) y `typeOrigins: [{ module, name, definingId }]` (la tabla de orígenes del paquete; fuente según V-6: la salida del upgrade o la CLI, o lectura pública GraphQL de solo lectura). `publishTxDigest` **no cambia** (es el de la publicación original). Nada se escribe a mano.
- **`record` de upgrade** (`record --upgrade` o equivalente): rearma el json **sin repetir el upgrade** a partir del digest/salida (R-2: nunca reintentar sin buscar el digest; con `Published.toml` viejo un reintento falla con `PackageIDDoesNotMatch`).
- **`deployment.mjs`:** registrar `upgrades` y `typeOrigins` en `OPTIONAL_FIELDS` con sus validadores (se validan solo si aparecen); **sin subir `schemaVersion`** (sigue 1); un `testnet.json` actual (sin los campos nuevos, `packageVersion` 1) sigue siendo válido.
- **`check` (CI, offline):** invariantes del plan §4.4: los tipos de `house` y `game` llevan `originalPackageId`; todo `definingId` es `originalPackageId` o un `packageId` de `upgrades`; `upgrades` consecutivo, con el último `packageId` = `packageId` y `version` = `packageVersion`; con `packageVersion > 1`, `upgrades` y `typeOrigins` son **obligatorios**; y la coherencia con `Published.toml` ya existente (`checkConsistency`, que además compara `version`).
- **Runbook** "Uso en testnet → Upgrade" en `contracts/README.md` con el esqueleto de plan §11 (precondiciones incluida la **CLI local del owner = `ci.yml`**, pre-vuelo de PV y del `UpgradeCap` con los valores esperados, dry run, upgrade, registro, **verificación por lectura pública de `typeOrigins` contra la cadena**, entrega al orquestador, no rebasear) y la tabla de campos nuevos en la sección "Esquema" (`contracts/README.md:610-628`).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `contracts/scripts/publish.mjs`, `contracts/scripts/deployment.mjs`, `contracts/scripts/publish.test.mjs`, `contracts/scripts/deployment.test.mjs`, `contracts/scripts/fixtures/*` (nuevas, de TASK-1a), `contracts/README.md` (sección de despliegues y runbook), `agents.md` §3 (tabla "Quién corre qué": `upgrade` solo owner en testnet).
- **NO tocar:** `contracts/deployments/testnet.json` y `contracts/Published.toml` (**nunca a mano**; los reescribe el owner en TASK-6), `contracts/sources/*`, `contracts/tests/*`, `.github/*`, `app/*`.

### 5. Tests obligatorios (`node --test`)
- Parseo de la salida **real** de `test-upgrade` y de `upgrade` (fixtures de TASK-1a): ID nuevo, versión, digest, `UpgradeCap`.
- `validateDeployment`: acepta el `testnet.json` actual sin campos nuevos; rechaza `upgrades`/`typeOrigins` mal formados; con `packageVersion > 1` y sin `upgrades` o `typeOrigins` rechaza; un `definingId` ajeno rechaza; un tipo de `house`/`game` con otro ID rechaza; `upgrades` no consecutivo rechaza; el último `packageId` ≠ `packageId` rechaza.
- `checkConsistency` con `Published.toml` de un upgrade (versión 2).
- Guardas de `upgrade` (cada una con su test, como las de `publish`): sin config fuera de `~/.sui`, red/chain id, CLI ≠ `ci.yml`, árbol sucio, `Move.lock` con delta, testnet sin `testnet.json` o sin `[published.testnet]`, flags solo-localnet rechazados en testnet, **ningún camino sin confirmación por terminal**, `--dry-run` también exige confirmación donde corresponda, ninguna dirección en la salida (test de redacción).
- `record` de upgrade rearma sin ejecutar nada; ante un digest de upgrade inexistente falla con mensaje claro.
- **Campos base:** `upgrade` sin `deployments/<red>.json` aborta con el mensaje claro y sin invocar `sui`; con el json del v1 conserva los campos de la publicación original y solo cambia los de "versión vigente".
- **Variante B:** `upgrade` sin `--out` escribe `contracts/deployments/localnet.json` con `upgrades` y `typeOrigins`; con `--out` escribe solo ahí; en testnet ambos flags se rechazan.
- Un test explícito de que **ningún test ni código** invoca `upgrade` contra testnet (los tests usan spawns inyectados, como los de `publish`).

### 6. Smoke (localnet aislada, `agents.md` §3)
Con la **Receta P** (puerto alternativo) y el prefijo de la localnet aislada, con el script (variante A: salidas dentro de `<SMOKE_DIR>`; después, la **variante B** sin `--out`, comprobando que `contracts/deployments/localnet.json` se escribe con `upgrades` y `typeOrigins` y que el cierre lo borra), el v1 registrado con la receta de TASK-5 paso 1 (`suic_v1 --json test-publish` y `record`; Receta V1) y `upgrade --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json"`: el json resultante pasa `check`, trae `upgrades` y `typeOrigins` reales y no trae direcciones; el `record` de upgrade reproduce el mismo json desde la salida cruda; un reintento con el pubfile viejo falla como en V-10. Cierre y limpieza de `agents.md` §3 (paso 7).

### 7. Criterios de aceptación (DoD)
`node --test scripts/*.test.mjs` y `node scripts/publish.mjs check` en verde (104 + N tests; `check` = "1 despliegue(s)" con el `testnet.json` actual); sin cambios en `contracts/deployments/testnet.json` ni `Published.toml`; el runbook y la tabla de campos documentados; V-6 y V-11 resueltos con evidencia; ningún camino testnet ejecutable por un agente; greps §R-6.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-4.txt` con el output pegado de `node --test` y `check`; sin commits.

---

# TASK-5: Smoke de contratos de punta a punta en la localnet aislada — área: contracts (smoke 🧪)

### 1. Historia de usuario del task
**Como** owner, **quiero** ver el upgrade completo en una localnet descartable (el paquete real v1, partidas viejas `Pending`, el upgrade con el script, el coinflip nuevo y el reloj), **para** autorizar el upgrade de testnet con evidencia y dejar fixtures reales para la app.

**Scope:** ensayo + fixtures + scripts de captura. **NO entrega:** cambios de contrato (si algo falla: STOP), ni el smoke de testnet.

### 2. Contexto
- Plan: §5 (migración), §11, V-1…V-16, TASK-5 del plan; `agents.md` §3 (variante B del script cuando la app necesita la ruta por defecto); modelo de capturas: `app/scripts/capture-read-fixtures.mjs`, `capture-tx-fixtures.mjs`, `capture-house-fixtures.mjs` y la guarda `localnet-guard.mjs`; fixtures existentes y su descripción en `contracts/README.md` ("Lectura desde la app"). Depende de TASK-1a…4. **El v1 se publica con el binario 1.83.0 con la Receta V1** (prefijo completo, `suic_v1`, nunca suelto).
- **Limitación a conocer:** el coinflip no persiste `Active`, así que el reloj no se puede ejercer con la producción. Para eso, una **v3 sandbox** (no se commitea) con un módulo `testgame` mínimo con reloj (`entry` crear con control, aceptar con `activate`, jugada con `record_move`, rendición con `collect`+`pay`).
- **Reglas del sandbox v3 (H-2):**
  1. Se arma **fuera del worktree**: `git archive HEAD contracts | tar -x -C <SMOKE_DIR>/v3`. **Nunca** se edita `contracts/sources` del repo.
  2. **No se redefine ningún id existente** de la tabla de controles (el 1 sigue en 10 min): el sandbox **agrega el id 8 = 15 000 ms** en el cuerpo de `create` (lo que R-11 permite en un upgrade compatible) y una **constante de gracia propia del sandbox** (15 000 ms, `SANDBOX_CLAIM_GRACE_MS`) en su copia de `refund_stalled`. Los valores reales ya los cubren los tests de TASK-2b; el ensayo prueba el *mecanismo* (eventos, objetos, BCS, tipos con IDs de upgrades distintos).
  3. Toda fixture que salga del sandbox va en un archivo **aparte** (`contracts/fixtures/duel-clock.localnet.json`) con `_meta.sandbox = true` y `_meta.sandboxConstants` (con los nombres `SANDBOX_…`: id 8 y su `turn_ms`, la gracia del sandbox). Las fixtures de producción (`duel-reads`, `duel-tx`: coinflip nuevo y partidas viejas) **no** llevan nada del sandbox.
  4. **Marcador único `SANDBOX_` (R2-1):** todas las constantes del sandbox se llaman `SANDBOX_…` (p. ej. `SANDBOX_CONTROL_8_TURN_MS`, `SANDBOX_CLAIM_GRACE_MS`) y el módulo se llama `testgame`; así una fuga es detectable por el control del DoD sin confundirse con código existente. **Barrera funcional:** si el id 8 o una gracia de 15 s llegaran a `duel.move`, fallan `test_create_rejects_invalid_control` (el id 8 debe abortar con `EBadControl`) y los tests de borde de la gracia de TASK-2b (escritos con el literal 604 800 000 ms).
  5. El sandbox se borra al cerrar; el árbol de trabajo queda sin rastro (DoD).

### 3. Qué implementar / ejecutar
1. Localnet aislada (`agents.md` §3) con la **Receta P** (puerto alternativo, ejemplo 19000; génesis sin `suic` y `sui start --fullnode-rpc-port <puerto>` antes de cualquier `suic`/`publish.mjs`), CLI de PRE-1 para la red. **Registrar el v1 (receta única, R2-2; la "variante B" de `agents.md` §3 publica el paquete del worktree y acá el v1 es el árbol `26f2676`):** (a) desde `<SMOKE_DIR>/v1/contracts` (`git archive 26f2676 contracts | tar -x -C <SMOKE_DIR>/v1`), con el prefijo de la Receta V1: `suic_v1 --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.v1.toml" > "$SMOKE_DIR/v1-publish.json"`; (b) desde `<repo>/contracts`: `"$NODE" scripts/publish.mjs record --network localnet --from "$SMOKE_DIR/v1-publish.json" --chain-id <hex corto de la localnet> --source-commit "$(git rev-parse 26f2676)" --sui-cli-version 1.83.0-16d2dc1e05ed --framework-rev <rev de [pinned.testnet.Sui] en `git show 26f2676:contracts/Move.lock`>` **sin `--out`**: escribe `contracts/deployments/localnet.json` (ignorado por git; `record` ya existe, `publish.mjs:764-797`); (c) el upgrade de TASK-4 variante B: `publish.mjs upgrade --network localnet --pubfile-path "$SMOKE_DIR/Pub.v1.toml"`, que **lee** ese `localnet.json` para los campos base. TASK-7b y TASK-8 reusan esta receta.
2. Con el v1: crear (CLI) partidas del coinflip **viejo**: una abierta, una invitación, una cancelada, una aceptada/resuelta, y una `Pending` que quede para después del upgrade.
3. Upgrade a la v2 (branch con `duel` y `coinflip`) con **`publish.mjs upgrade`** (TASK-4, variante A y luego B, sobre el `localnet.json` que dejó el paso 1(b)). `check` en verde; `upgrades` y `typeOrigins` reales; comparar con la tabla de orígenes por lectura (CLI o `SuiGrpcClient`).
4. Tras el upgrade: la `Pending` vieja **se acepta** (desde el ID viejo y desde el nuevo) y otra se **cancela**; el coinflip nuevo: crear abierta e invitación, cancelar, rechazar, aceptar con ambos ganadores (`Random`); `fees_collected` de la **misma** House suma las dos fuentes; `fee_rate` copiado al crear.
5. **Gasto por resultado (H-3, SEG-5):** de un `accept` del coinflip nuevo **ganado por el creador** y de otro **ganado por el aceptante** (mismo `bet` y `fee_rate`), registrar `gasUsed` (computación, storage y rebate; `suic tx-block <digest>` o `getTransaction` por gRPC) y exigir **cómputo igual** y storage igual (mismo camino); si difieren, es STOP (diferencia observable entre ganar y perder).
6. **v3 sandbox** (reglas de §2): `testgame` con reloj: partida por turnos hasta resolver con `collect`+`pay`; vencimiento con un pendiente → `claim_timeout` (por un tercero: el pago va al rival); ambos pendientes vencido → `refund_stalled`; un pendiente pasada la gracia del sandbox → `refund_stalled`; `claim_timeout` antes del plazo, `record_move` después del plazo y `collect` de un tercero abortan con el abort esperado; `typeArguments` de las genéricas con IDs de definición de upgrades distintos (V-12).
7. **Fixtures para la app** (scripts nuevos `app/scripts/capture-duel-*.mjs` bajo `localnet-guard.mjs`, deterministas salvo `_meta.capturedAt`): `contracts/fixtures/duel-reads.localnet.json` y `contracts/fixtures/duel-tx.localnet.json` (producción: objetos `Duel` `Pending`/`Cancelled`/`Resolved` del coinflip nuevo, sus eventos, la tabla de orígenes y las transacciones/simulaciones de crear, cancelar, rechazar y aceptar) y `contracts/fixtures/duel-clock.localnet.json` (**sandbox**: objetos `Active`/`TimedOut`/`Expired` y los eventos `DuelActivated`/`DuelTurn`/`DuelTimedOut`/`DuelExpired`, y las transacciones y aborts de reclamar y reembolsar; con `_meta.sandbox = true` y sus constantes). Direcciones: efímeras de la génesis, por rol (`A`, `B`, `C`, `ADMIN`), sin claves. **Cada captura se corre con `--url "$RPC_URL"`** (con el 9000 ajeno ocupado, una captura sin `--url` le hablaría a ese servicio: nunca).
8. Tabla de **resultados** del smoke en el reporte `.txt` (el MID/orquestador la pasan a `documents/SMOKE_MULTIGAME.md`, parte localnet). Cierre de `agents.md` §3 (paso 7).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/scripts/capture-duel-reads.mjs`, `app/scripts/capture-duel-tx.mjs` (y, si hace falta, `capture-duel-clock.mjs`; nuevos, sin SDK ni red en el nivel superior), `contracts/fixtures/duel-*.localnet.json` (nuevas), `contracts/README.md` ("Fixtures" y su recaptura) si hace falta.
- **NO tocar:** `contracts/sources/*`, `contracts/tests/*`, `contracts/deployments/testnet.json`, `Published.toml`, `Move.lock` (si cambia: `git checkout --` y declarar), `app/src/*`.

### 5. Tests obligatorios
Los scripts de captura son deterministas (dos capturas consecutivas dan el mismo archivo salvo `_meta.capturedAt`); salen con código 2 ante una `--url` que no sea `http://127.0.0.1:<puerto>` (loopback, 1024-65535; por defecto el 9000) antes de cualquier pedido (la guarda de PRE-1, `localnet-guard.mjs`, como las existentes). `node --test` sigue en verde.

### 6. Smoke (formato FLUJO §6; resultados en el reporte)
| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Receta P (puerto alternativo, génesis sin `suic`, `sui start --fullnode-rpc-port <puerto>`), luego `smoke_guard` y `smoke_guard_v1`; v1 con 1.83.0 (Receta V1) | publicado; `House` con comisión vigente fijada |
| 2 | Partidas viejas creadas (abierta, invitación, cancelada, resuelta, `Pending`) | estados esperados en los objetos |
| 3 | `publish.mjs upgrade` (variantes A y B) + `check` | exit 0; `packageVersion` 2; `upgrades`/`typeOrigins` reales; `House` intacta (`version` 1, `fee_rate` y `fees_collected` iguales) |
| 4 | `Pending` vieja aceptada y otra cancelada tras el upgrade | éxito; fondos conservados |
| 5 | Coinflip nuevo: crear, cancelar, rechazar, aceptar (ambos ganadores) | `DuelResolved` con `pot == payout + fee`; `fees_collected` suma viejas y nuevas |
| 6 | **Gasto por resultado** (creador gana vs aceptante gana) | cómputo igual; storage igual; valores pegados |
| 7 | v3 sandbox: partida por turnos hasta `collect`+`pay` | `Resolved`; conservación |
| 8 | Reclamo por tiempo por un tercero | `TimedOut`; el `Coin` llegó al rival, no al tercero; `fee` a la House |
| 9 | Ambos pendientes vencido → `refund_stalled`; un pendiente pasada la gracia → `refund_stalled` | `Expired`; 100/100 sin comisión |
| 10 | Abortes: `claim_timeout` antes del plazo; `record_move` después; `collect` de un tercero | `ENotExpired`; `EDeadlinePassed`; `ENotPlayer` |
| 11 | `typeArguments` con IDs de upgrades distintos | la genérica con el ID de definición pasa |
| 12 | Capturas (con `_meta.sandbox` en la de reloj) | dos corridas iguales salvo `capturedAt` |
| 13 | Cierre | `~/.sui/` idéntico; `contracts/deployments/localnet.json` borrado; **árbol limpio** (DoD) |

### 7. Criterios de aceptación (DoD)
- Todos los pasos en PASA con evidencia (digest/estado por paso) o STOP; fixtures deterministas, con `_meta.sandbox = true` y constantes en la de reloj; ninguna dirección real.
- **El sandbox no tocó el árbol (H-2, R2-1):** al **cierre de TASK-5, después de borrar el sandbox y de cerrar la localnet y antes de escribir el reporte**: (1) `git status --porcelain --untracked-files=all` lista **solo** los archivos nuevos esperados (`app/scripts/capture-duel-*.mjs`, `contracts/fixtures/duel-*.localnet.json`, y `contracts/README.md` si se tocó) y nada más; (2) como `git status` no muestra lo ignorado: `test ! -e contracts/deployments/localnet.json` y `! compgen -G 'contracts/Pub.*.toml'` (bash), los dos con estado 0; (3) `git diff --exit-code -- contracts/sources` (exit 0); (4) el control de líneas agregadas (más abajo), con su salida pegada. **Barrera funcional declarada:** `test_create_rejects_invalid_control` (id 8) y los bordes de la gracia en 604 800 000 ms de TASK-2b. Esta evidencia (no un grep sobre el árbol completo, que ya tiene `15_000` en `app/src/sui/gameDetail.ts`) entra a la compuerta §G.
```sh
# Control anti-fuga del sandbox (R2-1): solo sobre lo AGREGADO por el ciclo, no sobre lo que ya existe en master
BASE="$(git merge-base master HEAD)"
git diff "$BASE" -U0 -- contracts/sources app/src | /usr/bin/grep '^+' | /usr/bin/grep -n "SANDBOX\|testgame"   # = 0 (líneas agregadas, tracked)
git ls-files --others --exclude-standard -- contracts/sources app/src | xargs -r /usr/bin/grep -n "SANDBOX\|testgame"   # = 0 (archivos nuevos sin trackear)
```
- Medidas de gasto por resultado pegadas (H-3).

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-5.txt` con la tabla de resultados; sin commits.

---

# TASK-7a: App — capa `sui/` (parte 1: config, registro, parsers y errores) — área: app

### 1. Historia de usuario del task
**Como** jugador, **quiero** que la app lea las partidas de las dos fuentes de coinflip (anteriores y nuevas) y muestre bien los controles de tiempo, con los tipos correctos tras el upgrade, **para** ver las partidas de ambas fuentes sin errores de lectura.

**Scope:** config con `upgrades`/`typeOrigins`, registro de juegos con la tabla de controles espejo y su regla de formato, esquemas y parsers del `Duel` y sus 7 eventos, y mapeo de aborts. **NO entrega:** builders, lobby, "Mis partidas", claves e invalidación (TASK-7b), componentes (TASK-8), cambios de contrato.

### 2. Contexto
- Plan: §4.4, §8 (F4), §5, D9. Mapa de `app/src/sui/` (`app/README.md:343-376`): `config.ts` (17-35 `AppConfig`, 111-126 lectura, 147-152 `loadConfig`), `events.ts` (72-74 `gameEventType`, 88-93 `assertEventType`, parsers), `game.ts` (70-81, `parseGameObject` 89), `errors.ts` (8-29 `ABORT_MESSAGES`, 195-206). Capas: ESLint `no-restricted-imports` (`app/README.md:314-342`).
- Hoy los tags usan `originalPackageId`: **incorrecto para tipos de módulos nuevos** (plan H-2, §4.4). Depende de TASK-5 (fixtures reales: `duel-reads`, `duel-tx` de producción y `duel-clock` del **sandbox**, con `_meta.sandbox = true`).
- **Regla para un `turn_ms`/`control` fuera del espejo (H-2; decisión de este handoff, sin diseño de producto):** la **cadena manda**. La app muestra el control con la tabla espejo si el `turn_ms` coincide con un id de R.2; si no (p. ej. el id 8 = 15 s de las fixtures del sandbox, o un id agregado en un upgrade futuro), lo muestra en **formato genérico** ("15 s por jugada", "N min por jugada", "N h por jugada", "N días por jugada") y **nunca** es un error de configuración ni de lectura. El parser del `Duel` **no valida `turn_ms` contra la tabla** (solo contra las invariantes de R.6).

### 3. Qué implementar
- **Config (`config.ts`):** leer y validar `upgrades` y `typeOrigins` (opcionales); con `packageVersion == 1` el mapa puede faltar y todo cae al ID original (el `testnet.json` de hoy sigue válido: solo fuente `legacy`); con `packageVersion > 1`, **error de configuración** si faltan o si falta una entrada de un tipo del registro (nunca "no hay partidas"). `packageId` solo para targets de llamadas.
- **`gameRegistry.ts`** (ilustrativo): un `GameDef` = clave (`coinflip`), etiqueta, si se puede crear, si usa reloj y qué controles ofrece, y fuentes (`legacy` = `game::Game`; `duel` = `Duel<Coinflip>` y eventos), cada una con sus tipos (desde `typeOrigins`), parsers y los eventos que "envía" un jugador. **Espejo de la tabla de controles** (R.2: id → `turn_ms` y etiqueta) más la función de formato genérico de la regla de arriba; se documenta en `agents.md` §5 como espejo (como `HOUSE_MAX_FEE_BPS`).
- **Parsers (`duel.ts`/`events.ts`):** esquema BCS del `Duel` (campos y orden de R.1; `stake` como `u64`; `DuelState` enum de 6 variantes en el orden `Pending`, `Cancelled`, `Active`, `Resolved`, `TimedOut`, `Expired`) con tipo exacto, dueño `Shared`, bytes canónicos e invariantes (`stake == bet` en `Pending`, `== 2 × bet` en `Active`, `0` en terminales, `to_move ∈ 1..=3` en `Active` con `turn_ms > 0`, `winner ∈ {creator, acceptor}`); parsers de los 7 eventos (R.5) con tipo exacto (`<defId de duel>::duel::<Evento><<defId de G>::<módulo>::<G>>`) e invariantes (`pot == payout + fee`).
- **Errores:** `ABORT_MESSAGES` suma el módulo **`duel`** con **un mensaje por código** (R.3, 0-25) y un test por código (el módulo `coinflip` no define códigos propios; si TASK-3 llegó a definir alguno, también); el número 3 sigue mapeado por **módulo + código** (`house`/3 ≠ `game`/3 ≠ `duel`/3); si V-5 (TASK-1b) mostró otro ID de abort, `transactionErrorMessage` lo acepta.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/{config,gameRegistry,events,duel,errors}.ts` (+ tests `*.test.ts`), `app/README.md` (mapa de `sui/`) y `agents.md` §5 (espejo de controles, layout BCS de `Duel` y sus eventos); fixtures de TASK-5 en `contracts/fixtures/` (solo lectura).
- **NO tocar:** `contracts/*` (salvo lectura), componentes y páginas (TASK-8), `lobby.ts`, `myGames.ts`, `transactions/`, `hooks/` (TASK-7b), `app/eslint.config.js`, dependencias (ninguna nueva), `contracts/deployments/*`.

### 5. Tests obligatorios (Vitest)
Parsers de objeto y de los 7 eventos contra las **fixtures reales** (tipo exacto, BCS canónico, variante desconocida = error, invariantes); config con y sin `typeOrigins`, con entrada faltante (error de configuración) y con `packageVersion == 1` (solo `legacy`); **etiquetas de los 8 controles** (0-7) y **`turn_ms` fuera del espejo ⇒ formato genérico, nunca error** (con valores como 45 000 ms y 90 000 ms escritos en el test, y otro **leído de la fixture del sandbox** (`_meta.sandboxConstants`), sin copiar su valor al código); un test por abort de `duel`; el sandbox aparece solo en tests marcados como tales (`_meta.sandbox`). `resolutionAmounts` sigue válida para ambas fuentes.

### 6. Smoke
No aplica aquí (sin red); el smoke de lectura es el de TASK-7b.

### 7. Criterios de aceptación (DoD)
`npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high`, `npm run lint -w app`, `npm run typecheck -w app`, `npm test -w app` (1156 + N tests, 0 fallos), `VITE_SUI_NETWORK=testnet npm run build -w app` y `git status --porcelain --untracked-files=all` solo con los archivos del task; con el `testnet.json` actual (`packageVersion` 1) el build es válido y solo hay fuente `legacy`; sin `any`; montos `bigint`; ningún componente arma tags ni targets (ARQ-1); el control de líneas agregadas del sandbox (TASK-5 §7: `SANDBOX\|testgame`) en 0; greps §R-6.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-7a.txt` con el output pegado de los gates y el tamaño del bundle; sin commits.

---

# TASK-7b: App — capa `sui/` (parte 2: builders, lobby, "Mis partidas", claves e invalidación) — área: app (smoke 🧪)

### 1. Historia de usuario del task
**Como** jugador, **quiero** que la app arme las transacciones de las dos fuentes de coinflip y liste partidas de ambas en el lobby y en "Mis partidas", **para** jugar y reclamar sin errores de tipos ni argumentos de tipo.

**Scope:** builders de las `entry` nuevas, lobby y "Mis partidas" multi-fuente, claves de consulta e invalidación con la dimensión del juego. **NO entrega:** config, registro, parsers y errores (TASK-7a), componentes (TASK-8).

### 2. Contexto
- Depende de TASK-7a. Plan §8.2-§8.3. `lobby.ts` (57 filtro de un literal), `eventScan.ts` (`eventTypeFilter` 60, `requestEvents` 69, `isHistoryPruned` 130-140), `myGames.ts` (82-90 DNF), `transactions/game.ts` (16-21 `moveTarget`, 76-98 aceptar con `Random` último), `hooks/queryKeys.ts` (15), `hooks/txInvalidation.ts` (19-52).

### 3. Qué implementar
- **Builders (`transactions/`):** crear coinflip nuevo (control 0), aceptar (`splitCoins` + `accept` con `tx.object.random()` **último**), cancelar y rechazar (genéricas con `typeArguments` desde `typeOrigins`), `claim_timeout` (lleva la House) y `refund_stalled` (genéricas). Validan IDs y montos y lanzan ante datos inválidos (como `transactions/game.ts`).
- **Lobby y "Mis partidas":** un solo `ListEvents` con el **OR** de los `*Created` de los juegos elegidos (DNF de varios términos, como `myGames.ts:82-90`; el límite de términos de V-4 manda); el parser despacha por el tipo del evento; filtro por juego ("Todos" por defecto); el control de tiempo de cada fila sale de `DuelCreated` (`control`/`turn_ms`, con la regla de formato de TASK-7a); "Mis partidas" suma las dos fuentes del coinflip.
- **Claves e invalidación:** `queryKeys.lobby` y las de "Mis partidas" ganan la dimensión del juego; `txInvalidation` suma las acciones `claim` y `refundStalled` (invalidan la partida, el saldo del que llama y la House por el cobro de comisión) como la de aceptar.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/{lobby,myGames}.ts`, `app/src/sui/transactions/*`, `app/src/hooks/{queryKeys,txInvalidation}.ts` (+ tests) y `app/README.md` (mapa de `sui/` y de hooks).
- **NO tocar:** lo que TASK-7a dejó (si hace falta un cambio ahí, STOP), componentes y páginas, `contracts/*`, dependencias, `app/eslint.config.js`.

### 5. Tests obligatorios (Vitest)
Builders (targets con `packageId`, `typeArguments` con `definingId`, `Random` último en aceptar, `claim_timeout` con la House, validación de entradas, un `typeArguments` con IDs de upgrades distintos); DNF del lobby con varios términos y despacho por tipo; filtro por juego; "Mis partidas" con las dos fuentes; claves de consulta e invalidación para `claim`/`refundStalled`; el control de tiempo de cada fila (con la regla de formato).

### 6. Smoke 🧪
Con la localnet aislada del TASK-5 reconstruida con la **Receta P** (puerto alternativo; v1 registrado y `upgrade` variante B con la receta de TASK-5 paso 1), una sonda de **solo lectura** por gRPC (`SuiGrpcClient`, sin claves): el lobby con las dos fuentes devuelve las partidas esperadas y los tipos parseados coinciden con `typeOrigins`; recaptura de las fixtures de `sui/` si cambia el layout (determinismo: solo `capturedAt`). Cierre de `agents.md` §3.

### 7. Criterios de aceptación (DoD)
Los gates de TASK-7a (más los tests nuevos: 0 fallos) y `git status --porcelain --untracked-files=all` solo con los archivos del task; builders con `Random` último; ningún componente arma tags ni targets; sin dependencias nuevas; `app/README.md` y `agents.md` §5 coherentes; el control de líneas agregadas del sandbox (TASK-5 §7) en 0; greps §R-6.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-7b.txt` con el output pegado de los gates; sin commits.

---

# TASK-8: App — hooks y componentes mínimos, y docs — área: app/docs (smoke 🧪🌐)

### 1. Historia de usuario del task
**Como** jugador, **quiero** ver el control de tiempo de cada partida en el lobby, elegirlo al crear (en juegos con reloj), ver de quién es el turno y cuánto queda, y reclamar la victoria por tiempo o pedir el reembolso, **para** jugar con las reglas del reloj sin leer el contrato. **Como** equipo, **quiero** que la documentación y los estándares reflejen la base común.

**Scope:** filtro por juego y control de tiempo en el lobby; selector de los 7 controles al crear (solo juegos con reloj); vista de partida activa (turno, plazo, botones de reclamar/reembolsar); detalle de `Resolved`/`TimedOut`/`Expired`; filas "anteriores"/"nuevas"; docs y estándares. **NO entrega:** rediseño visual (#72: sin identidad, layout móvil ni textos nuevos fuera de lo mínimo), ningún cambio de `sui/` más allá de lo que TASK-7a/7b ya dejó (si falta algo ahí, STOP), ninguna pantalla de Battleship.

### 2. Contexto
- Plan: §8.2-§8.3, §9, D9 (producto decidido). Componentes y páginas actuales: `app/README.md:377-410` (hooks y componentes), `GameActions` (`variant='row'`), `LobbyList`, `CreateGameForm`, `GameDetail`, `MyGamesSection`, `TransactionStatus`; la máquina de transacciones (`app/README.md:466-520`): preflight, candado y "sin confirmar" **no cambian de forma**.
- **#72** (rediseño) declara `sui/` y hooks sin cambios de contrato y deja el multijuego fuera; #73-app aterriza antes (D9). El DEV usa los componentes existentes.
- El coinflip no usa reloj: **la vista del reloj no se puede jugar con la producción**; se cubre con fixtures (Vitest/RTL) y, opcionalmente, con un parche temporal (§6 paso opcional).

### 3. Qué implementar
- **Lobby:** muestra por fila el **control de tiempo** ("10 min por jugada"… "sin reloj") y la rotulación "anterior"/"nueva" de la fuente; filtro por juego ("Todos" por defecto, OR de los registrados); el selector de juego en el formulario de crear aparece **solo si hay más de un juego creable** (hoy no: crear va solo a la fuente nueva del coinflip, sin selector).
- **Formulario de crear:** para un juego **con reloj** ofrece los 7 controles (rapid 10/20/30/60 min, daily 1/3/7 días) con el valor por defecto que defina el registro; el coinflip crea con control 0 y no muestra la opción.
- **Vista de partida activa (juegos con reloj):** de quién es el turno (`to_move`), el plazo (`deadline_ms`, cuenta regresiva con el tiempo de la cadena como referencia; sin pedir datos con `useEffect`, PROY-14), y, vencido el plazo, **"Reclamar victoria"** (`claim_timeout`: cualquiera puede ejecutarlo y paga al rival) o **"Reembolsar"** (`refund_stalled`: ambos pendientes o pasada la gracia). La elegibilidad la decide la cadena: la **preflight** ya muestra `ENotExpired`/`ENotStalled` con sus mensajes. Un plazo vencido no ofrece "jugar".
- **Detalle de partida terminada:** distingue `Resolved`, `TimedOut` ("ganó por tiempo") y `Expired` ("nadie movió a tiempo: cada jugador recuperó su apuesta") por la variante del **objeto**.
- **Acciones nuevas** `claim` y `refundStalled` por la **misma máquina** (objetivo `{kind:'game', gameId}`), con `TransactionStatus`, candado y "sin confirmar" como las demás.
- **Docs (PROY-20) que el DEV edita:** `contracts/README.md` (tablas de `duel`/`coinflip`, controles de tiempo, "Modelo de confianza" con la restricción (d) —incluido (v) "tiempo agotado = derrota"— y la garantía de `Active`), `app/README.md` y `agents.md` (§5, §8, §9). **Lo que el DEV NO edita (H-6):** `documents/ESTANDARES.md`, `documents/DECISIONES.md` y `documents/STATUS.md`: en su reporte **redacta** (a) los cambios propuestos a `ESTANDARES.md` (ARQ-1 con `coinflip → duel → house` y `game → house`; PROY-1, PROY-7, PROY-8, PROY-10; regla anti-`Random` de R.7; restricción (d)) y (b) el snippet de STATUS; el orquestador los aplica con **una entrada de `DECISIONES.md` que referencia D-20261119-05** (sin duplicar la restricción (d)) y el MAYOR los revisa en la integración.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/components/{LobbyList,CreateGameForm,GameActions,GameDetail,MyGamesSection,…}.tsx` y sus tests, `app/src/pages/*` si hace falta, `app/src/hooks/*` finos para `claim`/`refundStalled` y el reloj de pantalla (+ tests), y los docs de arriba.
- **NO tocar:** `contracts/*`, `documents/ESTANDARES.md`, `documents/DECISIONES.md`, `documents/STATUS.md`, la lógica de `app/src/sui/*` (salvo un bug que TASK-7a/7b haya dejado, declarado), `app/eslint.config.js`, dependencias, estilos globales (#72), `Caddyfile`, `Dockerfile`.

### 5. Tests obligatorios (Vitest + Testing Library, cliente Sui mockeado, fixtures de TASK-5)
Lobby: fila con control, rótulo y filtro por juego; formulario: 7 controles solo con reloj y control 0 en el coinflip, sin selector de juego con un solo creable; vista activa: turno, cuenta regresiva (reloj inyectable, ARQ-3), botón de reclamar solo vencido y para un pendiente, botón de reembolsar con ambos pendientes o tras la gracia, sin botón de jugar vencido; detalle de los tres terminales; `claim`/`refundStalled` por la máquina (candado, "sin confirmar", invalidación); el candado y el "sin confirmar" se comportan igual con un `Duel`; accesibilidad básica de los controles nuevos (rol y nombre).

### 6. Smoke 🧪🌐 (localnet aislada + Chrome headless con perfil desechable, `agents.md` §3)

> **STOP de TASK-8 para el orquestador (no se improvisa):** la app en el navegador tiene el RPC de localnet **fijo en el 9000** (`app/src/sui/networks.ts:11`, issue #77) y el 9000 del host lo ocupa un servicio ajeno que no se toca. Con la localnet en el puerto alternativo (Receta P) el navegador **no la alcanza**. Antes del smoke con navegador el orquestador decide **con evidencia** (el DEV pide la decisión y no avanza en los pasos 🌐 hasta recibirla): (a) el owner **libera el 9000 en esa ventana, con autorización explícita**, y esa corrida usa el 9000 por defecto (sin `--fullnode-rpc-port`, `RPC_URL=http://127.0.0.1:9000`); (b) se **decide #77 antes** (puerto del RPC de localnet configurable en la app) y recién entonces el smoke corre con el puerto alternativo; (c) se **difiere** el smoke con navegador, declarado en el reporte, con la cobertura de componentes en Vitest. Lo que **no** necesita navegador (gates, tests, localnet, `upgrade` variante B, lecturas por `SuiGrpcClient` con `$RPC_URL`) se hace igual con la Receta P.

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Localnet aislada (Receta P, o el 9000 si la decisión del STOP fue (a)) + v1 registrado y **`upgrade` variante B** con la **receta de TASK-5 paso 1** (`record` sin `--out` deja `contracts/deployments/localnet.json`; `upgrade` lo lee y lo reescribe; TASK-4); `npm run dev -w app` con `VITE_SUI_NETWORK=localnet` y la burner del kit | `localnet · nodo OK` |
| 2 | Lobby con partidas viejas y nuevas | filas con rótulo "anterior"/"nueva" y el control de tiempo; filtro "Todos"/"Coinflip" |
| 3 | Crear un coinflip nuevo | sin selector de juego ni de control; aparece en el lobby con "sin reloj" |
| 4 | Aceptar desde otra cuenta; ver el resultado | `Resolved`; "Resultado para ti"; candado y estado "Actualizando datos…" como siempre |
| 5 | Cancelar y rechazar una partida nueva | éxito con la misma máquina |
| 6 | "Mis partidas" | las dos fuentes y las invitaciones |
| 7 | (opcional, H-13) parche **en una copia del repo dentro de `<SMOKE_DIR>`** (`git archive HEAD | tar -x -C <SMOKE_DIR>/web`, el diff de TASK-8 aplicado con `patch -p1`, y ahí el registro del juego sandbox `testgame` de TASK-5), **nunca en el worktree ni con `git stash`** | vista activa con turno y plazo; "Reclamar victoria" tras el vencimiento; la copia se borra al cerrar |
| 8 | Consola | 0 violaciones de CSP; sin errores rojos nuevos |
| 9 | Cierre (`agents.md` §3, paso 7, incluido Chrome; con puerto alternativo, `<puerto>` libre y el 9000 ajeno como estaba; si se liberó el 9000 por autorización del owner, restituido como estaba al empezar) | línea base de `~/.sui/` y `git status` sin entradas |

### 7. Criterios de aceptación (DoD)
Gates de app completos como en TASK-7a/7b (más los tests nuevos) con el build de testnet válido con el `testnet.json` actual; smoke en PASA (el 7 es opcional y se declara; los pasos 🌐 según la decisión del STOP de TASK-8); candado y "sin confirmar" sin regresión; **docs del DEV actualizados** (`contracts/README.md`, `app/README.md`, `agents.md`) y, en el reporte, los cambios de `ESTANDARES.md` redactados y el snippet de STATUS (el orquestador los aplica); sin cambios visuales de #72; `git diff --exit-code` sobre lo que no es del task, `git stash list` vacío y el control de líneas agregadas del sandbox (TASK-5 §7) en 0; greps §R-6.

### 8. Al terminar
Reporte (§R) en `<scratchpad>/REPORTE_MULTIGAME_TASK-8.txt` con output pegado, resultados del smoke (con la decisión del STOP de TASK-8 y cómo se resolvió el navegador) y la lista de docs tocados; sin commits.

---

# §G. Compuerta — Revisión de pre-upgrade del MAYOR (entre TASK-8 y TASK-6)

El upgrade irreversible congela `Duel`, `DuelState` (6 variantes), los eventos, la tabla de controles y los abort codes. **Sin 🔴/🟠 abiertos del MAYOR no hay autorización de upgrade.** El MID entrega:
1. head SHA de la branch con `master` (ya con PRE-1) integrado y la CI en verde;
2. diff de contrato completo (`duel`, `coinflip`, tests) y la **lista de artefactos congelados** sacada de la fuente: structs, enums y eventos con el orden de campos y las abilities, la tabla de controles y la tabla final de abort codes (0-25);
3. salidas de los gates (build, `--lint` y test con su conteo) y la matriz test ↔ INV-D1..D7 ↔ tests de §2.6 ↔ aborts en orden, **más la tabla de transiciones generada desde los tests** (TASK-2b);
4. evidencias de V-1…V-16 de TASK-1a y TASK-1b (incluidas las sondas de compilación de `Collected` y del witness, **cada una con su mensaje de error esperado y su control positivo**) y la diferencia de bytecode de `house`/`game` entre el v1 compilado con 1.83 y el v2 con la CLI de PRE-1 (TASK-1a, paso 3), con los **dos SHA-256 verificados del binario 1.83.0**;
5. `SMOKE_MULTIGAME.md` en PASA en la parte localnet (TASK-5): partidas viejas aceptadas y canceladas tras el upgrade, coinflip nuevo, reclamo por tiempo y reembolso, comisiones en la misma House;
6. `upgrades` y `typeOrigins` reales de la localnet, y `check` en verde (TASK-4/5);
7. runbook final y la salida del dry run de localnet del script (TASK-4);
8. gates de app de TASK-7a/7b/8 y las fixtures;
9. decisiones P-1..P-14 registradas en `DECISIONES.md` (D-20261119-05), con `CLAIM_GRACE_MS`;
10. las revisiones del MID por task;
11. **(handoff, H-2, R2-1)** la evidencia de que el sandbox no tocó el árbol, tomada al cierre de TASK-5 (después de borrar el sandbox y cerrar la localnet): `git status --porcelain --untracked-files=all` con solo los archivos nuevos esperados, `test ! -e contracts/deployments/localnet.json` y `! compgen -G 'contracts/Pub.*.toml'`, `git diff --exit-code -- contracts/sources`, el control de líneas agregadas `SANDBOX\|testgame` en 0 (TASK-5 §7) y las fixtures del sandbox con `_meta.sandbox = true`; más la barrera funcional (`test_create_rejects_invalid_control` y los bordes de la gracia en 604 800 000 ms, en verde en los gates);
12. **(handoff, H-3)** las medidas de `gasUsed` por resultado del coinflip (cómputo y storage iguales) y el grep de R.7 de TASK-3;
13. **(handoff, H-5, R2-3)** las sondas de compilación de `Collected` contra el `duel` real (copia del árbol de trabajo), cada una con su mensaje de error esperado y su control positivo, y la declaración sin abilities (TASK-2);
14. **(handoff, H-8)** la parte testnet de `SMOKE_MULTIGAME.md` **redactada por el MID** (precondiciones, pasos y criterios; sin resultados).

# §H. Pasos del owner (NO-DEV; sin handoff de implementación)

- **Antes de la compuerta (H-8):** el MID redacta la parte testnet de `documents/SMOKE_MULTIGAME.md` (formato de `agentes/AGENTE_MID.md` §M5; entrada de §G punto 14) con los pasos del owner y de la sonda de solo lectura.
- **TASK-6 — upgrade en testnet (solo el owner, nunca un agente; después de la compuerta y de su autorización explícita):** runbook de `PLAN_MULTIGAME.md` §11 / `contracts/README.md` "Uso en testnet → Upgrade" (TASK-4): precondiciones (PRE-1 mergeado; CLI local = `ci.yml`; CI verde en el head conocido; la compuerta sin 🔴/🟠; la autorización), pre-vuelo (PV de testnet ≤ la de la CLI; `UpgradeCap` con los valores esperados por lectura pública), dry run, upgrade (un solo PTB), registro (`Published.toml` y `deployments/testnet.json` con `upgrades` y `typeOrigins`; `check`), verificación por lectura pública, entrega al orquestador (los dos archivos **sin editar**, digests y el "sí/no" de custodia), y no rebasear ni squashear después. **La autorización explícita se registra como entrada propia de `DECISIONES.md`** (la escribe el orquestador, con la fecha y el head autorizado).
- **TASK-9 — smoke en testnet y cierre (owner con sonda de solo lectura):** corre **antes de la revisión de integración** del MAYOR (sin smoke en verde no hay integración, FLUJO §6-§7), con el **build local de testnet** (`VITE_SUI_NETWORK=testnet`, `npm run dev -w app` o `vite preview`) y el `deployments/testnet.json` **ya actualizado en la branch** (Railway solo publica `master`); completa la parte testnet de `SMOKE_MULTIGAME.md` durante la corrida. **Después del merge**, un chequeo posterior en la app de Railway (carga, lobby con las dos fuentes y `typeOrigins` coherentes). Housekeeping de FLUJO §9.
---

# §R. Plantilla de reporte del DEV (FLUJO §5; obligatoria, también para tasks solo-UI)

Archivo `.txt` en el scratchpad (ruta absoluta completa en la respuesta del DEV); **no** `.md`. Contenido:

```
## Task completado: HANDOFF_MULTIGAME — TASK-<M>

### Branch (con SHA corto del HEAD)
### Baseline medido (solo TASK-1a) y árbol de partida (git status limpio, rama, merge de PRE-1 verificado)
### Archivos modificados/creados (git diff --stat)
### Qué se implementó (3 líneas máx)

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: (lista de tests con sus nombres)
- Contracts: sui --version / sui move build / build --lint / sui move test (N tests, PASS/FAIL) — todos con --warnings-are-errors, forma canónica de agents.md §3
- Scripts: node --test / publish.mjs check
- App: npm ci / audit signatures / audit / lint / typecheck / npm test (archivos y tests) / build de testnet
- Tablas de contrato (contracts/README.md) y app/src/sui/ sincronizados: sí / no aplica
- git diff --exit-code de house.move, game.move y Move.lock (exit 0) / delta justificado

### Verificación manual (localnet / lecturas públicas; digests de tx si hubo)
### Evidencias específicas del task (TASK-1a/1b: V-n con veredicto y salida, hashes verificados del binario 1.83.0; TASK-2/2b: matriz test↔INV y lista de abort codes; 2b: tabla de transiciones; TASK-5: tabla de resultados del smoke, gasUsed por resultado y evidencia de árbol limpio)
### Desviaciones del handoff (o "ninguna")
### Riesgos / pendientes (o "ninguno")
### §R-6: los 4 greps sobre el diff y sobre este reporte, con la clasificación de cada coincidencia
### Cierre de la localnet (si hubo): kill por PID, ~/.sui/ idéntico a la línea base, git status sin entradas, <puerto> libre y el 9000 ajeno como estaba
### Guarda de ~/.sui (C-13, R-12): stat/ls/primeros 12 hex del sha256sum de client.yaml al inicio, tras cada reporte/borrador, tras cada génesis y al final (igual a la línea base); grep -c 'command not found' = 0 y grep de rastros ('Cannot run genesis|sui_config|Address already in use') vacío sobre cada borrador; ejecución accidental de sui: "ninguna" o declarada

### Documentación
- READMEs / agents.md actualizados: sí / no aplica (obligatorio si cambió arquitectura, layout, comandos, contrato o tests — PROY-20)
- Snippet propuesto para documents/STATUS.md
```

**Revisión del MID** (checklist de `documents/agentes/AGENTE_MID.md` M4 + los puntos de este handoff): implementa lo pedido ni más ni menos; `house.move`/`game.move` intactos; aborts en el orden y con los números de R.3/R.4 (incluido R4-1 en TASK-2b); INV con test; V-13 y V-15 en PASA antes de cerrar TASK-2b; tabla de transiciones y diff de bytecode entregados; §R-6 clasificado; sin direcciones ni rutas personales; el DEV no commiteó.
