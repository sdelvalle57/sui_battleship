# HANDOFF_TOOLCHAIN_142
> Plan: PLAN_MULTIGAME v1.3, tarea PRE-1 (§4.5, §14, V-7 y V-9; `git show edfcdc2:documents/PLAN_MULTIGAME.md`) | Issue: #75 | Branch: `feature/issue-75-toolchain-1840` (desde `master` = `88dd53b`) | Versión: v1.3.3 | Fecha: 2026-11-20

> Un solo archivo consolidado: lo es **todo** lo que el DEV necesita. Reportes del ciclo: `documents/REPORTES_TOOLCHAIN_142.md`
> (los escribe el orquestador desde los `.txt` del DEV, §2 R-3). Al mergear, housekeeping (FLUJO §9): `git rm` de este
> handoff y de los reportes.

## Cambios de v1.3.2 a v1.3.3 (preparación de TASK-4 con lo ya medido en TASK-1, 2a, 2b y 3)

| Cambio | Dónde |
|---|---|
| TASK-4: bloque "2bis. Valores medidos" con **todos** los datos que el DEV de docs necesita (CLI, hashes, lock, V-7, gas, formas, chains, puerto, V-9 concluyente, conteos, Docker, incidente), para que no invente ninguno. | TASK-4 |
| TASK-4 suma: línea de `fees_collected` en `contracts/README.md` ("Recaptura de la fixture de transacciones", `:486-501`); receta del puerto alternativo y nota de proceso R-12 en `agents.md` §3; H13 resuelto con fecha; datos para #73 (gas sin cambio). | TASK-4 3.3, 3.5 |
| "Tocar" y DoD de TASK-4 con la tabla de todos los archivos que toca el PR (incluidos `config.test.ts`, `game.test.ts`, `house.test.ts`). | TASK-4 4, 7; nueva tabla antes del cuerpo del PR |
| Snippet de STATUS reemplazado por las filas finales con valores medidos. **V-9 es concluyente** (servidor `sui-node/1.84.1`): ya no hay issue "repetir V-9"; el seguimiento es la clasificación de `ABOVE_LATEST_AVAILABLE`. | Snippet de STATUS |
| Commits propuestos y cuerpo del PR actualizados (V-9 concluyente, incidente y R-12, puerto 19000, guarda, 1246 tests en 66 archivos, issues de seguimiento con `#__`). | Commits; cuerpo del PR |

## Cambios de v1.3.1 a v1.3.2 (revisión del tramo 1 de TASK-2b: `config.test.ts` rojo por las fixtures de 2a)

| Cambio | Dónde |
|---|---|
| `app/src/sui/config.test.ts` ("resolves the real localnet fixture", `:47-60`) compara con literales de la génesis vieja y lee la fixture real `contracts/scripts/fixtures/localnet.deployment.json`, que TASK-2a ya recapturó: está rojo desde ese commit. Se corrige **ahora**, en un paso 2.4.8 y un commit propio (a0) **antes** del (a) de la guarda, con las reglas de TASK-3 3.2 (5 literales por `jq`, sin tocar matchers). | TASK-2b 2.4.8, "Tocar", DoD, commits |
| TASK-3 3.2 aclara que ese test ya se corrigió en 2.4.8 y que 3.2 cubre lo que rompa la recaptura de `contracts/fixtures/*.localnet.json` de 2b. | TASK-3 3.2 |

## Cambios de v1.3 a v1.3.1 (ronda 3 del MAYOR, `REVISION_HANDOFF_TOOLCHAIN_142_v1.3.md`: guarda de puerto aprobada)

| Hallazgo | Resolución en v1.3.1 |
|---|---|
| N-1 | TASK-2b 2.4 pasa a ser un **punto de control formal**: el DEV termina 2.4.1-2.4.6, deja `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` y **se detiene**; el MID revisa; el orquestador commitea (a) solo con la guarda, el `.d.mts`, el test y los comentarios; recién después sigue 2.5. El texto de versión de los `capture-*` (2.5) va en el commit (b). Escrito en 2.4.7, en "Al terminar" de 2b y en "Commits propuestos". |
| N-2 | El conteo nuevo de `app` ("1156 + N en 66 archivos") también en el contexto de TASK-3, en "Tests obligatorios", en el DoD de TASK-3, en el snippet de STATUS y en la tabla de gates del PR. 1156/65 queda solo como línea base de TASK-1 (§0). |
| N-3 | Cuerpo propuesto del PR y commit de TASK-4 actualizados: guarda, `.d.mts` y test; docs (`app/README.md:328, :840`, `agents.md` §3); gates con N-2; "Seguridad" con la guarda y el incidente de TASK-2a; "Pendientes" con `networks.ts:11`. Sin nombrar el servicio ajeno del host. |
| N-4 | **R-12** promovida a §2 (con los cuatro puntos del MAYOR) y **S-10** a §3. |
| N-5 | Test de la guarda: se suman `http://127.0.0.1:99999` y los valores no `string` coercibles (`['http://127.0.0.1:19000']`, `new String('http://127.0.0.1:19000')`); `// @vitest-environment node` opcional. |
| N-6 | `env.sh` con `RPC_URL=http://127.0.0.1:19000` usado por `smoke_guard` y por cada captura (`--url "$RPC_URL"`); la plantilla de `agents.md` (TASK-4) con `<puerto>` parametrizado. |
| N-7 | Línea de sincronía en el `.d.mts` y en el JSDoc de la guarda. |
| N-8 | Encabezado y dependencia de TASK-2b: "aprobado por el MAYOR (ronda 3), con N-1..N-4 aplicados"; sin "pendiente de la revisión del MAYOR". |

## Cambios de v1.2 a v1.3 (addendum de TASK-2b: puerto de las capturas; aprobado por el MAYOR en la ronda 3)

| Cambio | Dónde |
|---|---|
| **Contexto:** el puerto 9000 del host lo ocupa un contenedor de otro proyecto (no se toca). El owner autorizó la localnet en el puerto **19000** (`sui start --fullnode-rpc-port 19000`). `app/scripts/localnet-guard.mjs:10, :21-35` acepta solo `http://127.0.0.1:9000`, así que los tres `capture-*.mjs` saldrían con código 2. | TASK-2b, contexto |
| Nuevo paso **2.4**: cambio mínimo de la guarda (loopback con puerto 1024-65535, regex anclada; el valor por defecto sigue siendo `http://127.0.0.1:9000`), `app/scripts/localnet-guard.d.mts`, test nuevo `app/src/test/localnet-guard.test.ts`, comentarios de ayuda con `9000` de los tres `capture-*.mjs`. El antiguo 2.4 (textos de versión) pasa a **2.5**; G-B pasa a **2.6**, G-C a **2.7**, comparación y cierre a **2.8**. | TASK-2b |
| Arranque y capturas en el puerto 19000 con `smoke_guard` que comprueba el RPC (de la sección "Desviación autorizada" del reporte de 2a); una génesis a la vez; G-B se cierra antes de abrir G-C. | TASK-2b 2.6, 2.7 |
| Archivos a tocar/NO tocar, tests, DoD, STOP nuevo **S-10**, riesgos y regla de reportes **R-12** (incidente de 2a), todo dentro de TASK-2b. | TASK-2b |
| Consecuencia en TASK-3: el conteo esperado de `app` pasa a 1156 + los tests nuevos del test de la guarda, en 66 archivos. | TASK-3 3.1 |
| Consecuencia en TASK-4: documentar el puerto y la guarda (`agents.md` §3 paso 4 y plantilla de `env.sh`, `contracts/README.md:466`, `app/README.md:328, :840`); `app/README.md` entra en "Tocar" y la lista final de archivos del PR. | TASK-4 |
| Commits: TASK-2b se parte en dos (guarda; fixtures). | Commits propuestos |

## Cambios de v1.1 a v1.2 (ronda 2 del MAYOR, `REVISION_HANDOFF_TOOLCHAIN_142_v1.1.md`)

| Hallazgo | Resolución en v1.2 |
|---|---|
| N-1 | TASK-1 1.5: citas exactas de `publish.test.mjs` (igual a CI `:562-563`; testnet otra versión `:567`; localnet otra versión `:570-571`; rango `:562-571`). |
| N-2 | TASK-2a 2.0: `shape()` recorre todos los nodos (`paths`), ve hojas `null`/`false` y `{}`/`[]`; paréntesis corregido. Probado con `jq` sobre un JSON sintético y sobre una fixture actual. |
| N-3 | TASK-2a: `deployment.test.mjs:147` (`gasEstimate`) y el comentario de `:1` entran en la lista de literales (contexto y 2.2), con el criterio de H-4 y la nota de gas para #73. |
| N-4 | TASK-1 1.4 guarda `Move.lock.despues`, 1.6 hace `cmp` contra esa copia, y R-11 distingue TASK-1 (`cmp`) de TASK-2a en adelante (`git diff --exit-code`). |
| N-5 | TASK-4, DoD y snippet de STATUS: referencia como "las líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`"; se fijan **ambos** (los dos SHA-256 completos en la fila "CI" y la referencia); sin "y/o"; el ítem "Framework" separado. |
| N-6 | TASK-2b: 2.5 cierra G-B con 2.7 antes de 2.6; 2.6 cierra G-C con 2.7. |
| N-7 | `publish.test.mjs:574` fuera de la lista de literales de 2a (usa un yaml propio). |

## Cambios respecto de v1 (revisión del MAYOR, `REVISION_HANDOFF_TOOLCHAIN_142_v1.md`)

| Hallazgo | Resolución en v1.1 |
|---|---|
| H-1 (MAJOR) | TASK-1 paso 1.2 reordenado: ningún comando ejecuta el binario 1.84.0 antes de los tres `sha256sum` coincidentes; con un fallo, S-3, `suiup default set sui@testnet-1.83.0` y parar. S-3 ampliado. |
| H-2 (MAJOR) | `deployment.test.mjs:38` y `publish.test.mjs:562-571` pasan a TASK-1; TASK-1 corre `node --test` (104) y `check` y los lleva a su DoD; ambos archivos entran en "Tocar" de TASK-1 (solo esas líneas). TASK-2a conserva el resto de los literales. |
| H-3 | Comparación de forma por pares ruta-tipo y longitudes de arrays (TASK-2a 2.0). |
| H-4 | Literales de tests de `app` solo por `jq` con tabla ruta, viejo, nuevo; prohibido tocar matchers, aserciones o fórmulas; cambio de costos de gas explícito para #73 (TASK-3 3.2). |
| H-5 | `sha256sum` del binario 1.83.0 en TASK-1 (1.0 y 1.2); TASK-4 registra en STATUS los dos SHA-256 de la 1.83.0 como histórico. |
| H-6 | V-9 no concluyente si el fullnode público no corre 1.84 o no se sabe; issues de seguimiento (TASK-3 3.4, reporte, snippet de STATUS). |
| H-7 | Plantilla de reporte completada con los outputs pedidos. |
| H-8 | R-5: `sui move build/test/update-deps -e testnet` está permitido. |
| H-9 | R-2: `ls -la` (nombres y tamaños) y `sha256sum` opcional de `client.yaml`. |
| H-10 | TASK-2 partido en **TASK-2a** (G-A: fixtures de `scripts/` y sus tests) y **TASK-2b** (G-B y G-C: fixtures de la app). Orden: 1, 2a, 2b, 3, 4. |
| H-11 | "Referencias verificadas" declara `suiup --version`. |
| H-12 | Los mensajes de `ci.yml:246, 250-251` quedan; anotado en "Pendientes" del PR. |

## Historia de usuario

**Como** desarrollador y owner del proyecto, **quiero** subir la Sui CLI a la `1.84.0` y repinear el framework de
`Move.lock` a la PV 142 con todos los gates, fixtures y docs re-medidos, **para** que el compilador y el framework del
repo coincidan con la PV vigente de testnet (142) y exista `sui::clock::borrow()`, que necesita el contrato de #73,
sin tocar una sola línea del contrato publicado.

**Scope en una frase:** CLI `1.84.0` en `ci.yml` y en la máquina local (`suiup`), `Move.lock` repineado con la CLI,
fixtures y tests de `scripts/` recapturados con esa CLI, gates de `contracts`, `app` y `deploy-image` re-medidos sin
delta, V-7 y V-9 medidos, y docs al día.

**Lo que NO entrega:**
- Ningún cambio en `contracts/sources/` ni en `contracts/tests/` (salvo lo que exigiera un lint nuevo, y eso es STOP,
  §3).
- Ningún cambio en `contracts/deployments/testnet.json` ni en `contracts/Published.toml`: registran la publicación de
  #8 hecha con la 1.83.0 y siguen valiendo.
- Ningún código de #73: no hay `duel`, `coinflip`, reloj por jugada ni upgrade (eso es #73).
- Ninguna publicación, ningún upgrade, nada contra testnet salvo lecturas públicas sin claves.
- Ningún cambio de código de la app por V-9: es **solo medición**; si hace falta cambiar código, se abre un issue
  aparte.
- Mainnet.

## 0. Baseline de gates verificado (2026-11-19, `master` = `88dd53b`)

Fuente: `documents/STATUS.md:58` (gates idénticos a la CI de `24afcec`), `:69`, `:90-91`, `:99-101`, `:57`, `:45` y
`:158` (H13). Verificado con `git diff --stat 24afcec HEAD -- app contracts .github Dockerfile .dockerignore`: desde esa
medición solo cambiaron `.github/workflows/ci.yml` (1 línea de comentario), `Dockerfile` (4 líneas, Node 26.13.0),
`app/scripts/check-deploy-image.sh` (6 líneas) y dos READMEs; **ni `contracts/sources|tests|scripts`, ni `app/src`**.

| Gate | Baseline vigente | Fuente |
|---|---|---|
| CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`), `suiup 0.1.1` | `ci.yml:22-23`, STATUS:27 |
| `sui move build -e testnet --warnings-are-errors` | exit 0, **0 warnings** | STATUS:58, :99 |
| `… build -e testnet --lint --warnings-are-errors` | exit 0, **0 lints** | STATUS:58, :100 |
| `… test -e testnet --warnings-are-errors` | exit 0, **83 tests PASS** (26 `house_tests` + 57 `game_tests`) | STATUS:93, :101 |
| `git diff --exit-code -- Move.lock` | sin delta (lock en `05ad86a3e86c522deea116f80dc2bf2309a53363`, PV 140) | `Move.lock:8,14`, STATUS:32 |
| `cd contracts && node --test scripts/*.test.mjs` | **104 tests PASS** (51 `deployment.test.mjs` + 53 `publish.test.mjs`) | STATUS:90 |
| `node scripts/publish.mjs check` | exit 0, `1 despliegue(s) válidos y coherentes con Published.toml` | STATUS:58; mensaje: `publish.mjs` `commandCheck` |
| App (`npm ci`, firmas, auditoría de producción) | 293 paquetes, 292 firmas, 0 vulnerabilidades de producción | STATUS:69 |
| App lint / typecheck | **0 problemas** / **0 errores** | STATUS:69 |
| App `npm test -w app` | **1156 tests PASS en 65 archivos** | STATUS:58, :69 |
| App build de testnet | `dist/assets/index-B3BeMVQC.js` 917.80 kB (277.96 kB gzip) | STATUS:58, :45 |
| Job `deploy-image` (`bash app/scripts/check-deploy-image.sh . 8080` en CI; local `… . 8090`) | camino positivo P1-P13, `OK (positivo)`, exit 0 (~100 s); existe `contracts/deployments/testnet.json` | STATUS:57, :62; `agents.md:224-229` |
| `framework-drift` (informativo) | avisa "CLI atrasada: testnet en PV 142, la CLI 1.83.0 llega a 140" y lock en PV 140 | STATUS:158, `ci.yml:246, 251` |

**El DEV re-mide esta línea base al arrancar, con la CLI vieja (1.83.0) y ANTES de cambiar nada**, y pega el output
completo (TASK-1, paso 1.0). Si lo medido difiere de la tabla, se reporta la diferencia **antes** de seguir: el
baseline vigente es el que mida el DEV, no el de esta tabla. El resto de los tasks compara contra esa medición.

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | CLI **`1.84.0`** (PV 142), en un task/PR previo y separado, mergeado antes de la base del contrato de #73. La `1.84.1` queda descartada. **No se reabre.** | D-20261119-05 P-8; issue #75 |
| D2 | `~/.sui/sui_config/` queda **sin claves para siempre**; toda invocación de `sui` lleva `printf 'n\n' \|` delante. | D-20261030-07; STATUS H11 |
| D3 | Ningún agente publica ni upgradea en testnet, ni corre `sui client` contra testnet (ni `publish.mjs publish --network testnet`, tampoco con `--dry-run`). Las recapturas usan **solo** la localnet aislada de `agents.md` §3. | D-20261102-03; `agents.md:197-202` |
| D4 | CLI de CI = CLI local, verificada por SHA-256 (tgz y binario); `Move.lock` lo regenera la CLI con `-e testnet`, nunca a mano, y todo delta se justifica. | D-20261030-13; PROY-11, PROY-17 |
| D5 | `deploy-image` es check requerido. | D-20261119-02 |

> Decisión (2026-11-19, MID): **M-1** la línea base se mide con la CLI vieja antes de instalar la nueva, porque
> `suiup install` deja la nueva como default de la máquina (§ TASK-1 1.2) y después ya no hay forma limpia de medirla.
> **M-2** cinco tasks secuenciales (1 CLI+CI+lock+gates de `contracts` / 2a fixtures de `scripts/` / 2b fixtures de la app / 3 app, `deploy-image` y V-9 / 4 docs) porque cada
> uno cierra con un reporte revisable y cabe en una sesión; los de fixtures dependen del binario instalado.
> **M-3** `README.md` (raíz, líneas 93-94) se actualiza también: nombra la versión vigente y su `suiup install`;
> el issue solo lista `contracts/README.md` y `agents.md`, pero PROY-20 y la consistencia con `ci.yml` lo exigen.
> **M-4** `Published.toml`: `PLAN_MULTIGAME` §4.5 punto 6 dice que "lo reescribe la CLI"; rige el issue (posterior y
> explícito: no cambia). `build`, `test` y `update-deps` no escriben `Published.toml` (solo publish/upgrade); si algún
> gate lo cambiara, es STOP.
> **M-5** *No se usa* `suiup remove` ni `suiup cleanup --all`: el binario 1.83.0 tiene que seguir instalado, lo exige
> TASK-1 de #73 (V-16: v1 del ensayo de upgrade publicado con el binario 1.83.0).
> **M-6** Fixtures sobre una génesis nueva: ver TASK-2a, paso 2.0 (la regla de #10 de "solo `capturedAt`" vale para dos
> corridas sobre la **misma** red; entre génesis cambian IDs, digests y BCS).

## 1. Datos de partida (verificados el 2026-11-19; el DEV los re-verifica el día de la tarea)

Release `testnet-v1.84.0` (`gh api repos/MystenLabs/sui/releases/tags/testnet-v1.84.0` y `…/git/ref/tags/testnet-v1.84.0`):

- publicado `2026-11-10T19:01:47Z`; no es draft ni prerelease;
- asset `sui-testnet-v1.84.0-ubuntu-x86_64.tgz`, 1139087251 bytes, digest
  `sha256:0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127` (coincide con el issue);
- el tag apunta al commit `9dc25070cf2ed18bcda1ebb095f39708638195a8`; el `target_commitish` del release es otro
  (`1d0b7abc0cdc…`): **no sirve para `SUI_COMMIT`** (se toma de `sui --version`);
- `MAX_PROTOCOL_VERSION = 142` (`crates/sui-protocol-config/src/lib.rs:41` @ el tag);
- `crates/sui-framework-snapshot/manifest.json` @ el tag: PV 139 → `719fb2960ccf…`, PV 140 → `05ad86a3e86c…`, **PV 141 ausente**,
  **PV 142 → `e6f43880f4b65e2c1f0397583a9690b4b22c9223`**;
- ese framework trae `sui::clock::borrow(): &Clock` (`clock.move:46-49` @ `e6f43880…`); el de `05ad86a3…` no la tiene
  (0 coincidencias de `fun borrow`);
- testnet: GraphQL público → época **1289**, PV **142**.

**Cómo se calcula cada uno de los cuatro valores de `ci.yml:22-25`** (comentario de `ci.yml:19-21`):

| Variable | Valor | Cómo se obtiene |
|---|---|---|
| `SUI_VERSION` | `"1.84.0"` | La versión decidida (D1). |
| `SUI_COMMIT` | los 12 hex que siguen a `1.84.0-` en `printf 'n\n' \| sui --version` del binario **instalado con `suiup`** | **Del binario, no del `target_commitish`.** Se espera `9dc25070cf2e` (12 primeros hex del commit del tag), pero se toma lo que imprima el binario. Si no coincide con el tag: parar y reportar (§3 S-6). El check de `ci.yml:94-98` compara `sui ${SUI_VERSION}-${SUI_COMMIT}` exacto. |
| `SUI_TGZ_SHA256` | `0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127` (sin el prefijo `sha256:`) | `gh api repos/MystenLabs/sui/releases/tags/testnet-v1.84.0 --jq '.assets[] \| .name + " " + .digest'`, **re-verificado el día de la tarea**. Además se verifica el `.tgz` que bajó `suiup` (`~/.cache/suiup/releases/sui-testnet-v1.84.0-ubuntu-x86_64.tgz`, mismo nombre que el de la 1.83.0) con `sha256sum` contra ese digest. |
| `SUI_BIN_SHA256` | `sha256sum` del binario `sui` instalado | `sha256sum "$(command -v sui)"`. Debe ser **idéntico** al de `~/.local/share/suiup/binaries/testnet/sui-v1.84.0` y al del `./sui` que se extrae del `.tgz` con el mismo comando que usa la CI (`tar -xzf <tgz> -C <dir> ./sui`, `ci.yml:57`): es el que la CI verifica en cada run (`ci.yml:62-63`). |

Cómo quedó registrada la 1.83.0 en `documents/STATUS.md` (la forma que se repite): Toolchain
fila "Sui CLI" (`:27`: `sui 1.83.0-16d2dc1e05ed` (release `testnet`), `suiup 0.1.1`, binarios en `~/.local/bin`), fila "CI"
(`:28`: `SUI_VERSION 1.83.0` / `SUI_COMMIT 16d2dc1e05ed` = local, más el procedimiento para actualizar los dos
SHA-256: **los valores de los hashes viven solo en `ci.yml`**, la tabla guarda el procedimiento), fila "Framework"
(`:32`) y los hallazgos H1 (`:146`) y H13 (`:158`).

## 2. Seguridad y proceso (valen para todos los tasks)

- **R-1 Roles.** El DEV es el **único** que corre gates y smokes. No commitea, no pushea, no mergea, no abre PRs: lo hace el orquestador con los mensajes de este handoff. Un hallazgo ajeno al alcance se propone como issue; no se arregla.
- **R-2 `sui` siempre con `printf 'n\n' |` delante** (`agents.md:81-85`), incluidos `--version`, `move build/test/update-deps` y `client`. `~/.sui/sui_config/client.yaml` **sin claves**: antes y después de cada task, solo `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml`, `ls -la <HOME real>/.sui/sui_config/` (nombres y tamaños; incluye ocultos) y, opcional, `sha256sum` de `client.yaml` (el hash no revela contenido), **nunca `cat`**. Valores medidos por el MID el 2026-11-19: mtime `2026-10-30 17:52:52.515735237 -0500`, 244 bytes, y el directorio contiene solo `client.yaml` (sin ocultos). Si cambia el mtime, el tamaño, el hash (si se tomó), o aparece cualquier otro archivo: **STOP** (§3 S-7), sin abrirlo.
- **R-3 El DEV no puede escribir `.md` de reportes.** Deja un **`.txt`** en su scratchpad (`<scratchpad>/REPORTE_TOOLCHAIN_142_TASK-<M>.txt`, ruta absoluta en su mensaje final). El orquestador lo lee **entero**, le pasa los greps R-6 y lo agrega a `documents/REPORTES_TOOLCHAIN_142.md`. Output de gates **completo** (PROY-19), sin resumir; si el orquestador resume algo, lo declara.
- **R-4 Localnet: solo la aislada de `agents.md` §3** ("Localnet aislada (smokes)", `:115-202`): `<SMOKE_DIR>` nuevo dentro del scratchpad, `env.sh` con las rutas escritas literalmente, `HOME` aislado, `smoke_guard` en cada llamada, **una localnet a la vez**, cierre con `kill "$(cat <SMOKE_DIR>/sui.pid)"` (nunca `pkill`), `rm -rf <SMOKE_DIR>` verificado, `stat`/`ls -la` de `~/.sui/` idénticos a la línea base. Nunca `sui start` a secas, ni `--force-regenesis`, ni `new-address` (su `--json` imprime la frase). Ningún archivo de `<SMOKE_DIR>/net` se lee, copia ni pega. Un `GUARD-FAIL` detiene todo y se reporta. `sui start` con la 1.83 sale con código 144 al `kill` (`agents.md:194`): **anotar el código que da la 1.84**.
- **R-5 Prohibido, sin excepciones:** `sui client`/`keytool` contra testnet, publicar, upgradear, faucet, `new-address`, `--force-regenesis`, `pkill`, `suiup remove`, `suiup cleanup --all`. Testnet solo con **lecturas públicas sin claves**: GraphQL `https://graphql.testnet.sui.io/graphql`, gRPC `https://fullnode.testnet.sui.io:443` (V-7, V-9) y `gh api`/`curl` a GitHub. **Permitido** (no es `sui client`): `sui move build/test/update-deps -e testnet` (lectura del entorno testnet con el `client.yaml` sin claves; no firma ni envía transacciones), siempre con `printf 'n\n' |`.
- **R-6 Secretos y direcciones (SEG-3).** Repo público: nunca claves, mnemónicos, keystores, tokens ni `.env`. **Ninguna dirección de cuenta** (completa o abreviada) ni ruta personal en nada commiteable ni en el reporte: placeholders `<repo>`, `<HOME real>`, `<SMOKE_DIR>`, `<scratchpad>` (también en el output pegado: sustituirlo antes de pegar). IDs de objetos/paquetes, SHAs y digests, sí. Sobre **todo el diff** (`git diff -U0`, solo líneas `+`) y sobre cada `.txt` de reporte, con `/usr/bin/grep -nE`:
  1. `[0-9a-fA-F]{40,64}`
  2. `0x[0-9a-fA-F]{8,}`
  3. `suiprivkey|mnemonic|seed phrase|/home/|/Users/`
  4. `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`

  Cada coincidencia se **clasifica** en el reporte (solo valen IDs públicos, SHAs y digests; los greps 3 y 4 tienen que dar vacío). Las fixtures regeneradas (`contracts/fixtures/*.localnet.json`, `contracts/scripts/fixtures/*`) llevan IDs, digests y direcciones de **cuentas efímeras de una génesis desechable** (precedente aceptado: `contracts/README.md:454`, `:909-912`; revisión de #7 D1): se clasifican como grupo (conteo por archivo), y además se comprueba que **ninguna** de esas direcciones aparece fuera de esos archivos: sacar con `/usr/bin/grep -oE '"(sender|owner|AddressOwner|ObjectOwner)": "0x[0-9a-f]{64}"'` sobre los dos `localnet-publish*.json`, y por cada una `git diff -- . ':(exclude)contracts/fixtures' ':(exclude)contracts/scripts/fixtures' | /usr/bin/grep -c <dirección>` = 0 (se reportan **solo los conteos**, nunca las direcciones). El resto del diff se clasifica línea por línea (p. ej. los 40 hex del `rev` de `Move.lock`, el digest del tgz, los commits).
- **R-7 Chrome:** no se usa en este handoff. Si hiciera falta, solo headless con perfil desechable (`agents.md:182-185`).
- **R-8 Docker** (línea base y actionlint en TASK-1; `deploy-image` en TASK-3): sin tocar contenedores ni imágenes de otros proyectos; línea base de `docker ps -aq` y `docker images -aq` antes y después; las intermedias `<none>` nuevas se borran **por ID**; nunca `docker system prune` (`app/README.md:219-220`).
- **R-9 Node 26:** `nvm use` o `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version` (debe dar `v26.13.0`; con otra, `npm ci` falla con `EBADENGINE` y `publish.mjs` sale con 1).
- **R-10 Sin tocar** lo no listado en "Archivos a tocar" de cada task. Todo cambio fuera de esa lista es una desviación y va en el reporte con su motivo (FLUJO §4).
- **R-11 Lock.** `Move.lock` **nunca** se edita a mano; solo lo cambia `update-deps` (TASK-1). Después de ese paso, cada gate se cierra sin delta del lock: **dentro de TASK-1**, con `cmp` contra la copia `Move.lock.despues` (el lock repineado todavía no está commiteado, así que `git diff --exit-code -- Move.lock` falla por construcción); **desde TASK-2a** (lock commiteado), con `git diff --exit-code -- Move.lock`.
- **R-12 Reportes y docs sin ejecución accidental (incidente de TASK-2a; vale para todos los tasks, con más riesgo en TASK-3 y TASK-4).** Un heredoc sin comillas con acentos graves ejecutó por sustitución de comandos un `sui start` a secas con el HOME real; lo contuvo una sola barrera (que `~/.sui/sui_config/` no estaba vacío). Por eso:
  1. Los reportes `.txt`, los borradores y las ediciones de docs se escriben **solo con las herramientas de escribir/editar archivos del harness**: nada de heredoc (ni siquiera entrecomillado), `sed -i`, `printf` ni `echo` para texto que contenga `sui`, `suiup` o acentos graves.
  2. La guarda de R-2 de `~/.sui` (`stat`, `ls -la` y, si se tomó, `sha256sum` de `client.yaml`) se corre también **después de escribir cada reporte o borrador** y **después de cerrar cada génesis**, además de al principio y al final de cada task.
  3. Sobre cada borrador: `grep -c 'command not found'` (debe dar 0) y `/usr/bin/grep -nE 'Cannot run genesis|sui_config|Address already in use'` (rastros de una ejecución accidental), sin coincidencias que no sean citas deliberadas ya revisadas.
  4. Ante **cualquier** ejecución accidental de `sui`: parar, verificar `~/.sui` (R-2) y declararlo en el reporte (S-7 si algo cambió).

## 3. STOPs: frenar de inmediato y reportar al orquestador (sin tocar nada más)

Los del issue:
- **S-1** testnet **ya no está en PV 142** el día de la tarea (la 1.84.0 no la cubriría o el lock quedaría en otra PV). Se mide en TASK-1 antes de instalar y se vuelve a medir en TASK-3 (V-7 final).
- **S-2** el repin deja `Move.lock` en un framework **distinto de `e6f43880f4b65e2c1f0397583a9690b4b22c9223`** con testnet en 142.
- **S-3** el `.tgz` o el binario no coinciden con los SHA-256 del release (`0f006fb4…` el del tgz; el del binario, entre sí: instalado = `suiup` = extraído del tgz), **o** se ejecutó el binario 1.84.0 antes de verificar los tres `sha256sum`. Ante un fallo: `suiup default set sui@testnet-1.83.0`, no ejecutar el binario nuevo, y parar.
- **S-4** cualquier lint, warning o test rojo que exija tocar `contracts/sources/` o `contracts/tests/`.
- **S-5** cualquier otra desviación del compilador o del framework respecto de lo que dice este handoff (p. ej. un `Move.lock` que cambia otra vez tras los gates, un `[move] version` distinto, un `manifest_digest` del paquete `battleship` distinto).

Los que agrega el MID (mismo criterio, "cualquier otra desviación"):
- **S-6** `SUI_COMMIT` (de `sui --version`) no coincide con los 12 primeros hex del commit del tag `9dc25070cf2e…`.
- **S-7** `~/.sui/sui_config/` cambia (mtime, tamaño o archivos nuevos) tras cualquier comando.
- **S-8** la forma del `--json` de la 1.84 obliga a cambiar `contracts/scripts/deployment.mjs` o `publish.mjs` (este handoff autoriza adaptar **tests y fixtures**, no el código de los scripts: D-20261102-01). Se reporta con el diff de formas.
- **S-9** un test de `app` falla tras recapturar y la causa **no** es un literal copiado de la fixture (ver TASK-3, 3.2), o arreglarlo exigiría cambiar un matcher, borrar una aserción o tocar una fórmula esperada.
- **S-10** (guarda de puerto de TASK-2b): el lint o el `typecheck` no se cumplen con la estructura del paso 2.4 (por ejemplo el `.d.mts` no resuelve), un test existente de la guarda falla por el cambio (hoy no hay ninguno), o algún `capture-*.mjs` usa el puerto por otro camino que la `url` devuelta por `assertLocalnetUrl` (verificado hoy: ninguno). Se frena y se reporta; no se improvisa otra solución.

La regla de "si solo cambia `_meta.capturedAt`, no se commitea" (regla de #10, recogida en el issue; la parte documentada hoy en
`contracts/README.md:468, :501, :535` es la determinista: "solo cambia `_meta.capturedAt`") se aplica en TASK-2a paso 2.0 (y 2b).

---

## TASK-1: CLI 1.84.0, `ci.yml`, repin del lock y gates de `contracts` — área: ci/contracts

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** la CLI 1.84.0 instalada y fijada en CI con sus dos SHA-256 y el framework de la PV 142 pineado en
`Move.lock`, **para** compilar y testear el paquete actual con el compilador y el framework que va a usar el upgrade de #73, con 83 tests y 0 warnings/0 lints como hoy.

### 2. Contexto (rutas reales)
- `.github/workflows/ci.yml:18-25` (`env`: `SUI_VERSION "1.83.0"`, `SUI_COMMIT "16d2dc1e05ed"`, `SUI_TGZ_SHA256 "e5116805…"`, `SUI_BIN_SHA256 "29e1beb9…"`); los usan la clave del cache de la CLI (`:44-45`), la descarga (`:51-55`), el verify del binario (`:62-63`, cada run), el PATH (`:73`), el check de versión (`:94-98`), la clave del cache de dependencias Move (`:104`, incluye `hashFiles('contracts/Move.lock')`: cambiará solo, y es esperado) y `framework-drift` (`:218`, `RAW=…/testnet-v${SUI_VERSION}/crates`; `:242-247` el aviso "CLI atrasada").
- `contracts/Move.lock:7-17`: `[pinned.testnet.MoveStdlib]` y `[pinned.testnet.Sui]` en `rev = "05ad86a3…"` (PV 140), `manifest_digest` `C4FE4C91…` y `7AFB6669…`; `[pinned.testnet.battleship]` (`:19-23`) `manifest_digest` `57457062…`. Formato `[move] version = 4` (`:5`).
- `contracts/Move.toml:1-11`: sin `[environments]` ni dependencias explícitas (framework implícito); **no se toca**.
- `contracts/Published.toml:10` (`toolchain-version = "1.83.0"`) y `contracts/deployments/testnet.json:14` (`suiCliVersion`): registro de la publicación de #8; **no cambian** (M-4).
- Tests de `scripts/` que dependen de `ci.yml` y del lock (se adaptan **en este task**, H-2): `contracts/scripts/deployment.test.mjs:38` (`LOCK_FRAMEWORK_REV`, comparado con el `Move.lock` real en `:324-328`) y `contracts/scripts/publish.test.mjs:562-571` (`checkCliVersion` contra el `ci.yml` real, `CI_YAML` `:49`). Sin adaptarlos, `node --test` queda en rojo (2 tests) con el lock y `ci.yml` nuevos.
- Instalación de la 1.83.0 (referencia): `README.md:93-94` (`suiup install sui@testnet-1.83.0`), `agents.md:75-79`. Layout de `suiup` en esta máquina (solo `ls`): binario por versión en `~/.local/share/suiup/binaries/testnet/sui-v<versión>`, default copiado a `~/.local/bin/sui`, estado en `~/.config/suiup/*.json`, descargas en `~/.cache/suiup/releases/`. Lo que **hace** `suiup install` (leído en `handlers/install.rs`, `download.rs` y `paths.rs` de `suiup` v0.1.1 en GitHub; no se ejecutó): baja el release (verifica MD5 solo si existe un `.md5`), lo coloca en esos directorios y lo fija como default; **no ejecuta `sui`** y no escribe en `~/.sui/`. El riesgo que queda es ajeno a `suiup`: cualquier invocación posterior de `sui` sin `printf 'n\n' |` si faltara el `client.yaml` (H11). Por eso R-2.
- La máquina tiene el tgz de la 1.83.0 en el cache de `suiup` y su `sha256sum` coincide con `ci.yml:24`; el binario local coincide con `ci.yml:25` (`29e1beb9…`): así se comprobó que `SUI_BIN_SHA256` = binario de `suiup` = binario que extrae la CI.

### 3. Qué implementar (procedimiento, en este orden)

**1.0 Línea base con la CLI vieja (M-1), sin cambiar nada.** Con el árbol limpio (`git status --porcelain --untracked-files=all` vacío) y `printf 'n\n' | sui --version` = `sui 1.83.0-16d2dc1e05ed`:
1. `sha256sum "$(command -v sui)"` = `ci.yml:25` (no ejecuta el binario).
2. `stat`/`ls -la` de `~/.sui/sui_config/` (R-2); `sha256sum ~/.local/share/suiup/binaries/testnet/sui-v1.83.0` (= `ci.yml:25`, y lo mismo que `sha256sum "$(command -v sui)"`); `docker ps -aq` y `docker images -aq` a archivos del scratchpad (R-8) y sus conteos; `du -s <HOME real>/.move`.
3. Gates de `contracts`, desde `contracts/` (forma canónica, `agents.md:88-98`):
   ```bash
   cd <repo>/contracts
   printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "exit=$?"
   printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
   printf 'n\n' | sui move test -e testnet --warnings-are-errors; echo "exit=$?"
   git diff --exit-code -- Move.lock Published.toml deployments/testnet.json; echo "exit=$?"
   export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version
   node --test scripts/*.test.mjs; echo "exit=$?"
   node scripts/publish.mjs check; echo "exit=$?"
   git status --porcelain --untracked-files=all
   ```
4. Gates de `app` desde `<repo>` (Node 26, `agents.md:204-221`): `npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high`, `npm run lint -w app`, `npm run typecheck -w app`, `npm test -w app`, `VITE_SUI_NETWORK=testnet npm run build -w app`, y `git status --porcelain --untracked-files=all` vacío.
5. `deploy-image`: `bash app/scripts/check-deploy-image.sh . 8090` (R-8).
6. Pegar todo en el reporte, completo, y compararlo con la tabla del §0.

**1.1 V-7 (medir la PV).** Lecturas públicas sin claves; pegar la salida:
```bash
curl -fsSL --max-time 20 -X POST -H 'content-type: application/json' \
  -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' https://graphql.testnet.sui.io/graphql
RAW=https://raw.githubusercontent.com/MystenLabs/sui/testnet-v1.84.0/crates      # la misma fuente que ci.yml:218
curl -fsSL --max-time 30 "$RAW/sui-protocol-config/src/lib.rs" | sed -nE 's/^const MAX_PROTOCOL_VERSION: u64 = ([0-9]+);.*/\1/p' | head -n 1
curl -fsSL --max-time 30 "$RAW/sui-framework-snapshot/manifest.json" | jq -r '.["142"].git_revision'
gh api repos/MystenLabs/sui/releases/tags/testnet-v1.84.0 --jq '.assets[] | select(.name=="sui-testnet-v1.84.0-ubuntu-x86_64.tgz") | .name + " " + .digest + " " + .published_at'
gh api repos/MystenLabs/sui/git/ref/tags/testnet-v1.84.0 --jq .object.sha
```
Esperado: PV `142` (época ≥ 1289), `142`, `e6f43880f4b65e2c1f0397583a9690b4b22c9223`, el digest `0f006fb4…` y el commit `9dc25070cf2e…`. Con PV ≠ 142: **S-1, parar antes de instalar**. Registrar PV, época y PV máxima de la CLI (para STATUS).

**1.2 Instalar la 1.84.0 con `suiup` y verificarla antes de ejecutarla (H-1).** **Ningún comando ejecuta el binario 1.84.0 antes de que los tres `sha256sum` coincidan**: hasta el paso 5 no se invoca `sui` (ni `sui --version`), y tampoco otra herramienta que lo llame. Solo estos comandos de `suiup`: `suiup install sui@testnet-1.84.0` (formato de `README.md:94`; no ejecuta `sui`; deja la 1.84.0 como default y **conserva la 1.83.0** en `~/.local/share/suiup/binaries/testnet/`), y de lectura `suiup show`, `suiup default get`. Si algún hash falla: **S-3**, `suiup default set sui@testnet-1.83.0`, no ejecutar el binario nuevo y parar. Orden:
1. `suiup install sui@testnet-1.84.0`; luego `suiup show` (versiones instaladas, sin rutas personales) y `stat`/`ls -la` de `~/.sui/sui_config/` iguales a la línea base (R-2; si no, S-7).
2. `sha256sum ~/.cache/suiup/releases/sui-testnet-v1.84.0-ubuntu-x86_64.tgz` = el digest del release traído por `gh api` (1.1) (S-3 si no).
3. Con el tgz ya verificado, en un directorio **nuevo y vacío** del scratchpad: `tar -xzf <tgz del cache> -C <dir> ./sui` (el mismo comando de la CI, `ci.yml:57`) y `sha256sum <dir>/sui`. El archivo extraído no se ejecuta.
4. `sha256sum "$(command -v sui)" ~/.local/share/suiup/binaries/testnet/sui-v1.84.0 <dir>/sui` → **los tres iguales** = `SUI_BIN_SHA256` (S-3 si no). Con esto se tienen los cuatro hashes de la 1.84.0 (release por `gh api`, tgz del cache, binario instalado = copia de `suiup`, extraído) y, de 1.0, el del binario 1.83.0.
5. **Recién ahora**: `printf 'n\n' | sui --version` → `sui 1.84.0-<SUI_COMMIT>` (anotar; S-6 si no es `9dc25070cf2e`).
6. Confirmar que `~/.local/share/suiup/binaries/testnet/sui-v1.83.0` sigue ahí y que su `sha256sum` sigue siendo el de `ci.yml:25` hoy (M-5, V-16 de #73).

**1.3 `ci.yml`** (solo estas líneas; ningún otro cambio de `env`, de steps ni de `framework-drift`): `ci.yml:22` `SUI_VERSION: "1.84.0"`, `:23` `SUI_COMMIT: "<los 12 hex del paso 1.2.5>"`, `:24` `SUI_TGZ_SHA256: "0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127"`, `:25` `SUI_BIN_SHA256: "<paso 1.2.4>"`. Los comentarios de `:19-21` no cambian. Como se toca `ci.yml`, **actionlint** con el comando de `app/README.md:227-231` (`-no-color`, archivo explícito; baja una imagen fijada por digest: `docker images -aq` antes/después, R-8): 0 hallazgos. `shellcheck` no aplica (no se toca ningún `.sh`). Verificación local del check de `ci.yml:94-98`: `[ "$(printf 'n\n' | sui --version)" = "sui 1.84.0-<SUI_COMMIT>" ]; echo $?` → 0.

**1.4 Repin del lock.**
```bash
cd <repo>/contracts && cp Move.lock <scratchpad>/Move.lock.antes
printf 'n\n' | sui move update-deps -e testnet; echo "exit=$?"
diff <scratchpad>/Move.lock.antes Move.lock
cp Move.lock <scratchpad>/Move.lock.despues      # el lock repineado todavía no está commiteado
```
- Esperado: `[pinned.testnet.MoveStdlib]` y `[pinned.testnet.Sui]` pasan de `05ad86a3e86c522deea116f80dc2bf2309a53363` a `e6f43880f4b65e2c1f0397583a9690b4b22c9223`; el resto igual (en el repin de #8, 139 → 140, los `manifest_digest` no cambiaron: STATUS:158). Cualquier otro delta (`manifest_digest`, `version`, secciones nuevas): se **declara y justifica** (PROY-11) y, si cambia el `[move] version` o el `manifest_digest` de `battleship`, es S-5. Rev final ≠ `e6f43880…`: **S-2**. No se edita el lock a mano.
- El framework nuevo se descarga a la caché de Move (`~/.move`, fuera del repo): declararlo, como en #8 (STATUS:92).
- Pegar el `diff` completo y la justificación del delta (por qué: PV de testnet 142 = piso `e6f43880…` del manifest de la 1.84.0, V-7).
- Pre-vuelo local de `framework-drift`: rev del lock (`ci.yml:219-223`) = rev de la PV 142 del manifest, y PV máxima de la CLI (142) ≥ PV de testnet (142): equivale a "lock al día" y sin "CLI atrasada".

**1.5 Adaptar los dos literales de `scripts/` que dependen de `ci.yml` y del lock (H-2)**, antes de correr `node --test`: `contracts/scripts/deployment.test.mjs:38` → `LOCK_FRAMEWORK_REV = 'e6f43880f4b65e2c1f0397583a9690b4b22c9223'` con el comentario "Move.lock del repo: piso de la PV 142 (repin de #75)"; `contracts/scripts/publish.test.mjs:562-571` → el caso "igual a CI" (`:562-563`) pasa a `sui 1.84.0-<SUI_COMMIT>\n` y a `suiCliVersion: '1.84.0-<SUI_COMMIT>'`, y los casos "otra versión" (testnet `:567` y localnet `:570-571`, hoy `1.84.0-aaaaaaaaaaaa`) pasan a `sui 1.83.0-16d2dc1e05ed` (la CLI vieja es, por construcción, "otra"; `local.suiCliVersion` esperado `1.83.0-16d2dc1e05ed`). Solo esas líneas; ningún test se borra ni se debilita.

**1.6 Gates de `contracts` y de `scripts/` con la 1.84.0** (el bloque de 1.0 paso 3 completo, más el chequeo de que nada cambió):
```bash
printf 'n\n' | sui --version
printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "exit=$?"
printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
printf 'n\n' | sui move test -e testnet --warnings-are-errors; echo "exit=$?"
cmp Move.lock <scratchpad>/Move.lock.despues; echo "exit=$?"    # copia hecha en 1.4, justo después del repin
git diff --exit-code -- Published.toml deployments/testnet.json; echo "exit=$?"
export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version
node --test scripts/*.test.mjs; echo "exit=$?"
node scripts/publish.mjs check; echo "exit=$?"
git diff --stat; git status --porcelain --untracked-files=all   # solo ci.yml, Move.lock y los dos tests
```
Esperado: 0 warnings, 0 lints, **83 tests PASS**, lock idéntico al repineado, `Published.toml` y `deployments/testnet.json` sin delta, **`node --test` = 104 PASS** y `check` = `1 despliegue(s) válidos y coherentes con Published.toml` (con las fixtures aún de la 1.83: el resto de los literales se adapta en TASK-2a). Un lint nuevo (el issue menciona `acquires` como identificador, que `sources/` no usa, y la deprecación de los helpers de `sui::clock`, que el paquete no usa) o un warning: se corrige **solo si no toca `sources/` ni `tests/`**; si no, **S-4**.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `.github/workflows/ci.yml` (4 líneas de `env`), `contracts/Move.lock` (solo por `update-deps`), `contracts/scripts/deployment.test.mjs` (solo la línea 38 y su comentario) y `contracts/scripts/publish.test.mjs` (solo `:562-571`).
- **NO tocar:** `contracts/sources/`, `contracts/tests/`, `contracts/Move.toml`, `contracts/Published.toml`, `contracts/deployments/testnet.json`, `contracts/scripts/*.mjs` salvo lo anterior, las fixtures, `app/`, `Dockerfile`, docs (TASK-4), `~/.sui/`.

### 5. Tests obligatorios
Ninguno nuevo. Los de `contracts` (83), `node --test` (104) y el gate de `ci.yml` (versión) son la verificación.

### 6. Smoke
No aplica (sin flujo de producto). La evidencia es la de 1.0-1.6.

### 7. Criterios de aceptación (DoD)
- [ ] Línea base re-medida con la 1.83.0 y pegada, sin cambios previos al árbol.
- [ ] V-7 registrada: PV de testnet, época, PV máxima de la CLI 1.84.0, rev de la PV 142 del manifest.
- [ ] Binario 1.84.0 **no ejecutado** antes de los tres `sha256sum` coincidentes (orden de 1.2 respetado); después `sui --version` = `sui 1.84.0-<SUI_COMMIT>`; 4 hashes coherentes (release, cache de `suiup`, binario instalado = `suiup` = extraído del tgz) y el del binario 1.83.0 registrado.
- [ ] `ci.yml` con los 4 valores; `ci.yml:94-98` pasa localmente; actionlint 0.
- [ ] `Move.lock` en `e6f43880f4b65e2c1f0397583a9690b4b22c9223` por `update-deps`, delta declarado y justificado; sin delta tras los gates.
- [ ] 0 warnings, 0 lints, 83 tests PASS; **`node --test` 104 PASS y `check` `1 despliegue(s)`**; `Published.toml` y `deployments/testnet.json` sin delta.
- [ ] `~/.sui/` idéntico a la línea base; 1.83.0 aún instalada en `suiup`.
- [ ] R-6 sobre el diff y el reporte, clasificados.

### 8. Al terminar
Reporte `.txt` con la plantilla de más abajo; **sin commits ni pushes**.

---

## TASK-2a: fixtures de `scripts/` y sus tests — área: contracts (tooling)

Depende de TASK-1 aprobado y commiteado (con `ci.yml`, el lock y los dos literales de `ci.yml`/lock ya en la 1.84.0). Una génesis aislada (G-A).

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** que las fixtures reales de la CLI (`contracts/scripts/fixtures/`) vengan de la 1.84.0 y que los tests de `scripts/` pasen contra ellas, **para** que `publish.mjs` se verifique con la forma real que va a producir la CLI del upgrade.

### 2. Contexto (rutas reales)
- Fixtures de scripts (todas salidas de la 1.83): `contracts/scripts/fixtures/localnet-publish.json` (stdout crudo de `test-publish --json`), `localnet-publish-dry-run.json` (idem `--dry-run`), `Published.localnet.toml` (`toolchain-version = "1.83.0"`, `:10`; lo escribe la CLI al publicar una **copia** del paquete) y `localnet.deployment.json` (`suiCliVersion` `:14`; es `buildDeployment` del fixture con valores fijos, `publish.test.mjs:54-61` y test `:724-728`). Receta original: `git show 9e01f99:documents/REPORTES_DEPLOY.md`, sección "Verificación manual (localnet aislada)".
- Los tests llevan literales leídos a mano del fixture (`deployment.test.mjs:1-2`): el comentario de `:1` ("salidas reales de la Sui CLI 1.83.0"), `deployment.test.mjs:28-37` (`LOCALNET_CHAIN_ID`, `PKG`, `HOUSE`, `HOUSE_CAP`, `UPGRADE_CAP`, `DIGEST`, `TIMESTAMP_MS`, `SOURCE_COMMIT`, `SUI_CLI_VERSION`, `FRAMEWORK_REV`), `:147` (`assert.equal(result.gasEstimate, 47_246_000n)`: derivado del fixture del dry run, `gasEstimate` = cómputo + storage − rebate, la fórmula de `parseDryRunOutput`), `:149-152` (IDs del dry run), `:240-251` (`Published.localnet.toml`: `publishedAt`, `originalId`, `toolchainVersion: '1.83.0'`, `upgradeCapability`), `:286` (chain id en una línea del TOML); y `publish.test.mjs:51` (chain id), `:54-61` (`FIXTURE_META`: `sourceCommit`, `suiCliVersion`, `frameworkRev`), `:498`, `:696-699` (IDs del TOML). **Ya adaptados en TASK-1** (no se vuelven a tocar): `deployment.test.mjs:38` y `publish.test.mjs:562-571`.

### 3. Qué implementar

**2.0 Comparación de forma y decisión de commit (M-6, H-3).** En una génesis nueva cambian IDs, digests, direcciones efímeras, `chainId` y los bytes BCS, así que *todas* las fixtures difieren de las de la 1.83 aunque la CLI no haya cambiado nada. Por eso:
1. **Lo que se compara para saber si la 1.84 cambió algo es la forma**, no los valores: pares **ruta-tipo** y **longitudes de arrays**, antes (`git show HEAD:<ruta>`) y después, con `diff` de las listas:
   ```bash
   shape()      { jq -r 'paths as $p | ($p | map(if type=="number" then "*" else . end | tostring) | join(".")) + " : " + (getpath($p) | type)' "$1" | sort -u; }
   arrays()     { jq -r '. as $d | [paths(arrays)] | map(. as $p | ($p | map(tostring) | join(".")) + " : " + ($d | getpath($p) | length | tostring)) | .[]' "$1"; }
   ```
   (`shape` recorre todos los nodos: detecta `"1000"` → `1000`, `null` → objeto, y también hojas `null`/`false` y `{}`/`[]`; `arrays` da la longitud exacta de cada array y detecta cambios en la cantidad de eventos, `objectChanges` o `balanceChanges`; se corren sobre el archivo viejo —`git show HEAD:<ruta> > <scratchpad>/viejo.json`— y el nuevo, y se hace `diff` de cada par de listas). Además, el cotejo de los valores **no derivados de la génesis** (costos de gas, textos de error del nodo, `@variant`, orden y cantidad de eventos, claves de `_meta`) y de las claves de `Published.localnet.toml`. Una tabla "forma igual / distinta" por archivo va en el reporte.
2. **Se commitean las fixtures recapturadas** (el issue las pide recapturadas: son la evidencia de la forma de la 1.84 que usará #73), aunque la forma sea igual. La regla de #10 ("si solo cambia `_meta.capturedAt`, no se commitea") se aplica **dentro de una génesis**: cada script de captura de la app (TASK-2b) corre **dos veces** sobre la misma red y el `diff` de las dos salidas debe mostrar **solo** `_meta.capturedAt` (el determinismo de `contracts/README.md:467-468, :501, :535`); nada que difiera solo en `capturedAt` entre corridas se commitea como cambio.
3. Si la forma cambió: se adaptan **tests y fixtures** (el issue lo autoriza); si exige cambiar `deployment.mjs`/`publish.mjs`: **S-8**.

**2.1 Génesis G-A.** Seguir `agents.md` §3 pasos 1-5 (R-4). Con el `ADMIN` = primera dirección de `suic addresses --json`, desde `<repo>/contracts` (los dos con `suic`, la función del `env.sh`, y la salida estándar a un archivo de `<SMOKE_DIR>`; los argumentos son los que arma `publish.mjs` `publishCliArgs`, `publish.mjs:109, :184-188`):
```bash
act_as "$ADMIN" && cd <repo>/contracts
suic --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.dry.toml" --dry-run > "$SMOKE_DIR/localnet-publish-dry-run.json"
suic --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"      > "$SMOKE_DIR/localnet-publish.json"
```
(un `--pubfile-path` nuevo por génesis; cada llamada con el prefijo `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`). Si la 1.84 cambió algún flag, ver `suic test-publish --help` (también con prefijo) y declararlo. `git diff --exit-code -- Move.lock` tras cada uno.
- **`Published.localnet.toml`:** copia del paquete en `<SMOKE_DIR>/pkgcopy` (sin `build/`), agregar a **la copia** de `Move.toml` `[environments]` con `localnet = "<chain id corto de G-A>"` (D6 de #7; el `Move.toml` del repo no se toca), y `suic publish` dentro de la copia como comando en segundo plano del harness, con `MOVE_HOME="$SMOKE_DIR/move"` (cache aislada, como en #7: el lock de la copia puede bajar otro framework; `~/.move` no debe cambiar: `du -s` antes/después, ambos en el reporte). Copiar el `Published.toml` resultante, **sin editar**, a `contracts/scripts/fixtures/Published.localnet.toml`.
- Los tres archivos se copian con `cp` y se verifican con `cmp`, sin editar; `jq empty` sobre los dos JSON (las salidas de `cmp` y `jq empty` van al reporte).
- **`localnet.deployment.json`** (lo genera el propio script, `record`; `publish.mjs:765-790`):
  ```bash
  node scripts/publish.mjs record --network localnet --from <ruta de localnet-publish.json copiado> \
    --chain-id <chain id corto de G-A> --source-commit "$(git rev-parse 88dd53b)" \
    --sui-cli-version 1.84.0-<SUI_COMMIT> --framework-rev e6f43880f4b65e2c1f0397583a9690b4b22c9223 \
    --out <repo>/contracts/scripts/fixtures/localnet.deployment.json
  ```
  (`--out` solo existe para localnet; el `sourceCommit` es un valor fijo de test, el SHA de `master` al abrir la branch.)
- **Smoke del script (variante A, `agents.md:164`):** `SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.scriptA.toml" --out "$SMOKE_DIR/localnet.json"` con el prefijo del paso 3: exit 0, **sin** aviso de CLI distinta de `ci.yml`, `suiCliVersion` = `1.84.0-<SUI_COMMIT>` y `frameworkRev` = `e6f43880…` en el json de salida, `Move.lock` sin delta. (Es la prueba de que `publish.mjs` funciona de punta a punta con la forma real de la 1.84.) El resumen del script no trae la dirección de la cuenta (STATUS:89); aun así se revisa antes de pegarlo.
- Comparación de forma (2.0.1) de los 4 archivos; registrar el código de salida de `sui start` al `kill` (R-4); cierre de G-A (2.3).

**2.2 Adaptar los tests de `scripts/`** (solo literales y comentarios, con los valores salidos del fixture nuevo por `jq`, como dice `deployment.test.mjs:1-2`): el comentario de `deployment.test.mjs:1` (CLI 1.84.0), las constantes de `:28-37` (y el comentario de `:37`: "registro histórico (PV 139)" pasa a PV 142; `FRAMEWORK_REV` = `e6f43880…`), `:147` (`gasEstimate`, con el mismo criterio que H-4 de TASK-3: el valor sale del fixture por `jq` —cómputo + storage − rebate del dry run— con el comando pegado; **si el gas cambia con la PV 142, se dice explícitamente en el reporte: es dato para #73**), `:149-152`, `:240-251`, `:286`; `publish.test.mjs:51, :54-61, :498, :696-699`. Ningún test se borra ni se debilita; el conteo sigue en **104** (51 + 53). `cd contracts && node --test scripts/*.test.mjs` → 104 PASS; `node scripts/publish.mjs check` → `1 despliegue(s) válidos y coherentes con Published.toml`.

**2.3 Cierre de la génesis** (R-4; `rm -f contracts/deployments/localnet.json` si la hubiera, `rmdir contracts/deployments 2>/dev/null || true` —existe `testnet.json`, así que `rmdir` no la borra—, `git status` limpio de entradas de la corrida, `git diff --exit-code -- contracts/Move.lock contracts/Published.toml`, `test ! -e contracts/deployments/localnet.json`, `! compgen -G 'contracts/Pub.*.toml'`).

### 4. Archivos a tocar / NO tocar
- **Tocar:** `contracts/scripts/fixtures/{localnet-publish.json,localnet-publish-dry-run.json,Published.localnet.toml,localnet.deployment.json}`, `contracts/scripts/deployment.test.mjs` y `contracts/scripts/publish.test.mjs` (solo literales y comentarios).
- **NO tocar:** `contracts/scripts/deployment.mjs`, `publish.mjs` (S-8), `contracts/fixtures/`, `app/`, `contracts/sources|tests`, `Move.lock`, `Move.toml`, `Published.toml`, `deployments/testnet.json`, `ci.yml`, docs.

### 5. Tests obligatorios
`node --test scripts/*.test.mjs` = **104 PASS**; `check` = `1 despliegue(s)…`.

### 6. Smoke
La variante A del script (2.1). Smoke de producto: no aplica.

### 7. Criterios de aceptación (DoD)
- [ ] Las 4 fixtures de `scripts/` recapturadas con la 1.84.0 en localnet aislada, copiadas sin editar (`cmp`, `jq empty`); tabla de forma "igual / distinta" con el cotejo de valores no derivados.
- [ ] `Published.localnet.toml` con `toolchain-version = "1.84.0"`; `localnet.deployment.json` con `suiCliVersion` `1.84.0-<SUI_COMMIT>` y `frameworkRev` `e6f43880…`.
- [ ] `node --test` 104 PASS; `check` `1 despliegue(s)`; variante A en verde.
- [ ] `Move.lock`, `Published.toml` y `deployments/testnet.json` sin delta; `~/.sui/` y `~/.move` (salvo lo declarado) en la línea base; cierre limpio.
- [ ] R-6: los 4 greps sobre el diff, con el grupo "fixtures" clasificado por conteo y las direcciones de cuenta ausentes fuera de él.

### 8. Al terminar
Reporte `.txt`; sin commits.

---

## TASK-2b: fixtures de la app — área: contracts/app (tooling)

Depende de TASK-2a aprobado y commiteado. El cambio de la guarda de puerto (paso 2.4, v1.3) está **aprobado por el MAYOR (ronda 3), con N-1..N-4 aplicados**. Dos génesis aisladas, una a la vez (G-B y G-C), en el puerto **19000**.

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** que las fixtures reales de lectura y transacciones de la app (`contracts/fixtures/*.localnet.json`) vengan de la localnet de la 1.84.0, **para** que los parsers y la máquina de transacciones de la app se verifiquen con la forma real que va a servir el nodo.

### 2. Contexto (rutas reales)
- `contracts/fixtures/game-reads.localnet.json` (`_meta.suiCliVersion`, #10), `game-tx.localnet.json` (#11-#12) y `house-admin.localnet.json` (#14), con `_meta.suiCliVersion` = `1.83.0-16d2dc1e05ed` (de `contracts/deployments/localnet.json`, que escribe el script: `capture-*.mjs:169, :292, :267`). Los scripts de captura escriben **en el lugar** (`contracts/fixtures/…`), solo hablan con `http://127.0.0.1:9000` (`app/scripts/localnet-guard.mjs:41-54`), **no firman** y son deterministas sobre la misma red. Recetas: `contracts/README.md:464-468` (lecturas), `:486-501` (transacciones), `:517-535` (panel de la House); la secuencia de CLI de #12 como modelo: `git show b6177ae:documents/REPORTES_ACCEPT.md` (tabla de transacciones 2.x).
- Textos con la versión dentro de los scripts de captura, que terminan en el `_meta` de la fixture: `app/scripts/capture-tx-fixtures.mjs:280` (comentario) y `:301` (`…hechas con la CLI 1.83; …`), `app/scripts/capture-house-fixtures.mjs:272` (`Transacciones por CLI 1.83, …`). `capture-read-fixtures.mjs` no tiene.
- `agents.md:176` y `:245` dicen que el fullnode 1.83 no sirve JSON-RPC: es una medición pasada, no se reescribe.
- **Puerto (decisión del owner, desviación del paso 4 de `agents.md` §3):** el 9000/tcp del host lo ocupa un contenedor de otro proyecto (que **no se toca**); un `sui start` sin flag muere con `Address already in use` y un `suic` con el alias apuntando al 9000 le habla al servicio ajeno. El owner autorizó correr la localnet en el **19000**. La sonda de TASK-2a (`REPORTE_TOOLCHAIN_142_SONDA_PUERTO.txt`) confirmó: `sui start --help` tiene `--fullnode-rpc-port <PUERTO>` (por defecto 9000); `sui start --network.config <dir>` **reescribe el alias `localnet`** del `client.yaml` de `<dir>` con el RPC nuevo (`crates/sui/src/sui_commands.rs:1292-1297` y `update_wallet_config_rpc` `:1951-1970` @ `testnet-v1.84.0`, según la sonda), y no hay `remove-env`; por eso el orden es génesis → `start` con el flag → recién después cualquier `suic`/`publish.mjs`. `publish.mjs` no tiene puerto (usa el alias `localnet` del `client.yaml` aislado). Las fixtures no contienen la URL (0 apariciones de `127.0.0.1` o `:9000`).
- **La guarda hoy** (`app/scripts/localnet-guard.mjs`): `LOCALNET_URL = 'http://127.0.0.1:9000'` (`:10`) y `assertLocalnetUrl` (`:21-35`) acepta **solo esa URL exacta** (`:25`); con otra `--url`, o con argumentos desconocidos, escribe el motivo por `stderr` y sale con **código 2 antes de cualquier pedido**. Los tres `capture-*.mjs` la llaman como primera instrucción y usan solo la `url` que devuelve (`capture-read-fixtures.mjs:14, :60`, `capture-tx-fixtures.mjs:18, :66`, `capture-house-fixtures.mjs:26, :77`): **ninguno usa el puerto por otro camino**. No existe test de la guarda. Vitest solo corre `app/src/**/*.test.{ts,tsx}` (`app/vite.config.ts`), y `app/tsconfig.json` no carga los tipos de Node en `src/`.
- La comparación de forma y la regla de commit son las de TASK-2a paso 2.0 (mismas funciones `jq`, mismo criterio de las dos corridas por génesis).

### 3. Qué implementar

**2.4 Cambio mínimo de la guarda de puerto (v1.3) — PUNTO DE CONTROL FORMAL.** El DEV hace 2.4.1-2.4.6, escribe `<scratchpad>/REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` (plantilla de reporte, con lint, typecheck, `npm test -w app` y la evidencia de rechazo pegados completos) y **se detiene**: no abre ninguna génesis ni sigue con 2.5. El MID revisa ese reporte, el orquestador commitea (a) y recién entonces el DEV continúa con 2.5. La restricción "solo loopback" **se conserva**; solo se generaliza el puerto.
1. `app/scripts/localnet-guard.mjs`:
   - `LOCALNET_URL` sigue siendo `'http://127.0.0.1:9000'` y es el valor por defecto **sin `--url`** (comportamiento idéntico al de hoy).
   - Nueva función pura exportada `isLoopbackUrl(url)` → `true` si y solo si `url` es un `string` que cumple la regex **anclada** `^http://127\.0\.0\.1:([1-9][0-9]{3,4})$` **y** el puerto, como entero, está entre **1024 y 65535** (sin ceros a la izquierda, sin espacios, sin `https`, sin `localhost`, sin `0.0.0.0`, sin credenciales, sin path, query ni fragmento; en JavaScript `$` solo ancla al final de la cadena).
   - Nueva función pura exportada `checkLocalnetArgs(argv)` → `{ ok: true, url }` o `{ ok: false, message }`: es la lógica que hoy está dentro de `assertLocalnetUrl` (`--url <valor>` opcional; sin `--url` la URL es `LOCALNET_URL`; el valor se valida con `isLoopbackUrl`; cualquier argumento desconocido es error; mismo texto de motivo, ajustado a "http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000").
   - JSDoc de las funciones nuevas con una línea: "Mantener en sincronía con `localnet-guard.d.mts`; los tests de `app/src/test/localnet-guard.test.ts` son la verificación" (con `skipLibCheck` y sin `checkJs`, nada más compara el `.d.mts` con el `.mjs`).
   - `assertLocalnetUrl(argv, scriptName)` sigue igual de cara afuera: usa `checkLocalnetArgs`, y ante error escribe el mensaje por `stderr` (con "No se hizo ningún pedido.") y `process.exit(2)` **antes de cualquier pedido**; la firma, el código 2 y el efecto no cambian. `assertDeployment` no cambia (segunda barrera: el chain id del nodo tiene que ser el de `contracts/deployments/localnet.json`).
2. `app/scripts/localnet-guard.d.mts` (archivo nuevo): solo declaraciones de tipos de las cuatro exportaciones (`LOCALNET_URL: string`, `isLoopbackUrl(url: unknown): boolean`, `checkLocalnetArgs(argv: string[])` con la unión de arriba, `assertLocalnetUrl(argv: string[], scriptName: string): string`, `assertDeployment(deployment: { network?: unknown; chainId?: unknown }, nodeChainIdShort: string): void`); existe para que el test de `app/src/` importe el `.mjs` con tipos (sin `allowJs`). Lleva una línea de comentario en la cabecera: "Mantener en sincronía con `localnet-guard.mjs`; los tests de `src/test/localnet-guard.test.ts` son la verificación".
3. **Test nuevo** `app/src/test/localnet-guard.test.ts` (Vitest, entra en `npm test -w app`; sin `process`, sin red, sin `console`):
   - **aceptadas** (`isLoopbackUrl` y `checkLocalnetArgs` con `--url`): `http://127.0.0.1:9000`, `http://127.0.0.1:19000`, `http://127.0.0.1:1024`, `http://127.0.0.1:65535`;
   - **rechazadas** (`isLoopbackUrl` falso y `checkLocalnetArgs` con `ok: false`), la lista hostil mínima: `http://127.0.0.1:1023`, `:0`, `:65536`, `:099999`, `:019000`, `http://127.0.0.1`, `http://127.0.0.1:`, `http://127.0.0.1:19000/`, `http://127.0.0.1:19000/x`, `http://127.0.0.1:19000?x=1`, `http://127.0.0.1:19000#x`, `https://127.0.0.1:19000`, `HTTP://127.0.0.1:19000`, `http://localhost:19000`, `http://127.0.0.2:19000`, `http://127.1:19000`, `http://2130706433:19000`, `http://0x7f.0.0.1:19000`, `http://0.0.0.0:19000`, `http://[::1]:19000`, `http://192.168.1.10:19000`, `http://127.0.0.1.evil.com:19000`, `http://127.0.0.1:9000@evil.com`, `http://127.0.0.1:19000@evil.com`, `http://user:pw@127.0.0.1:19000`, `http://127.0.0.1:19000:1`, `http://127.0.0.1:19000 ` (espacio final), ` http://127.0.0.1:19000` (espacio inicial), `http://127.0.0.1:19000\n`, un puerto con dígitos no ASCII, `http://127.0.0.1:99999` (la regex sí lo acepta; lo frena el rango), la cadena vacía, y valores que no son `string` (`undefined`, `null`, número y los **coercibles**: `['http://127.0.0.1:19000']` y `new String('http://127.0.0.1:19000')`, que solo frena el `typeof`). El archivo puede llevar `// @vitest-environment node` (opcional: no usa DOM);
   - `checkLocalnetArgs`: sin argumentos ⇒ `url` = `LOCALNET_URL`; `--url` sin valor ⇒ error; `--url` repetido ⇒ error; argumento desconocido con una URL válida ⇒ error; `--url=http://127.0.0.1:19000` (forma con `=`) ⇒ error;
   - `assertDeployment`: red distinta de `localnet` ⇒ lanza; chain id distinto ⇒ lanza; coincidencia ⇒ no lanza (comportamiento que se conserva).
   El conteo total de tests de `app` **no baja**: sube en N (el DEV informa N y los archivos: 66).
4. **Comentarios de ayuda** (solo comentarios, ningún código): `app/scripts/capture-read-fixtures.mjs:4, :6`, `capture-tx-fixtures.mjs:7, :9` y `capture-house-fixtures.mjs:6, :16`: `[--url http://127.0.0.1:<puerto>]` y "solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`)".
5. **Gates de la guarda antes de seguir** (R-9; con `npm ci` hecho): `npm run lint -w app` (0 problemas), `npm run typecheck -w app` (0 errores), `npm test -w app` (1156 + N, 66 archivos), pegados completos. Si el lint o el `typecheck` no se pueden cumplir con esta estructura (p. ej. el `.d.mts` no resuelve): **S-10**, sin improvisar otra ubicación del test.
6. **Evidencia de rechazo antes de cualquier pedido** (no requiere localnet; **nunca** correr un `capture-*.mjs` **sin `--url`** mientras el 9000 lo ocupe un servicio ajeno: pediría a ese servicio): para cada uno de los tres scripts, con Node 26, `node app/scripts/capture-<x>-fixtures.mjs --url <URL hostil>; echo "exit=$?"` con al menos `http://127.0.0.2:19000`, `http://localhost:19000`, `http://127.0.0.1:19000/x` y `http://127.0.0.1:9000@evil.com`: `exit=2` y el mensaje con "No se hizo ningún pedido." (9 a 12 corridas; el nombre del script va en el mensaje).
7. **Punto de control (N-1).** El DEV **no commitea** (R-1) y los cambios de este paso y los del 2.5 caen en archivos comunes (`capture-tx-fixtures.mjs`, `capture-house-fixtures.mjs`) que no se pueden separar sin staging por hunk (`git add -p` no está soportado): por eso el DEV termina 2.4.1-2.4.6, deja `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` y se detiene. El MID lo revisa; el orquestador commitea el commit **(a)** con **solo** la guarda, el `.d.mts`, el test y los comentarios de ayuda; recién después el DEV sigue con 2.5. El texto de versión de los `capture-*` (2.5) va en el commit **(b)** junto con las fixtures. Antes del (a), el orquestador commitea el **(a0)** del paso 2.4.8.
8. **Ajuste previo de `config.test.ts` (v1.3.2; commit (a0)).** El test "resolves the real localnet fixture" de `app/src/sui/config.test.ts` (`:47-60`) lee la fixture real `contracts/scripts/fixtures/localnet.deployment.json` (`:4-8`), que TASK-2a ya recapturó (commit `051c131`), y compara con los literales de la génesis vieja: `chainId` (`:53`), `packageId` y `originalPackageId` (`:54-55`, el mismo valor), `houseId` (`:56`) y `publishTxDigest` (`:57`); está rojo desde 2a y, sin corregirlo, ningún commit posterior deja `npm test -w app` en verde. El DEV lo corrige **ahora**, con las reglas de TASK-3 3.2: cada valor nuevo sale de la fixture por `jq` (comando y salida pegados, p. ej. `jq -r '[.chainId,.packageId,.originalPackageId,.houseId,.publishTxDigest] | @tsv' contracts/scripts/fixtures/localnet.deployment.json`), tabla **ruta → viejo → nuevo** en "Desviaciones", **prohibido** cambiar matchers, borrar o relajar aserciones; solo esos 5 literales, solo ese archivo. Los otros tres archivos que contienen la génesis vieja (`App.test.tsx`, `components/NetworkBadge.test.tsx`, `sui/transactionInfo.test.ts`) **no** se tocan: no leen la fixture real y pasan. Después repite lint, typecheck y `npm test -w app` (esperado: **1246 PASS en 66 archivos**, 1156 + 90) y entrega un **anexo** al reporte del tramo 1 (`REPORTE_TOOLCHAIN_142_TASK-2b-guarda-anexo.txt`). Orden de commits: **(a0)** solo `config.test.ts`, luego **(a)**; archivos disjuntos, sin staging por hunk.

**2.5 Textos de captura.** Cambiar `1.83` por `1.84` **solo** en `app/scripts/capture-tx-fixtures.mjs:280, :301` y `app/scripts/capture-house-fixtures.mjs:272` (la versión que dice el `_meta`), **antes** de capturar. Nada más en `app/scripts/`.

**2.6 Génesis G-B (lecturas y transacciones), en el puerto 19000.** Antes de arrancar: `ss -ltn | grep -c ':19000 '` = 0 (puerto libre) y registrar `ss -ltn | grep ':9000 '` (el servicio ajeno, que no se toca). `<SMOKE_DIR>/env.sh` como el de `agents.md` §3 paso 2 **más** estas funciones (el arranque usa `smoke_guard_pre`; el resto de las llamadas, `smoke_guard`, que exige que el RPC del env activo sea exactamente el 19000):
```sh
RPC_URL=http://127.0.0.1:19000      # en env.sh: lo usan smoke_guard y cada captura (--url "$RPC_URL")
smoke_guard_pre() { [ -f "$SUI_CONFIG_DIR/client.yaml" ] && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] || { echo GUARD-FAIL; return 97; }; }
smoke_guard()     { smoke_guard_pre || return 97; [ "$(printf 'n\n' | "$SUI" client --json envs | jq -r '.[1] as $a | .[0][] | select(.alias==$a) | .rpc')" = "$RPC_URL" ] || { echo GUARD-FAIL; return 97; }; }
```
Orden: génesis (sin `suic`) → arranque como comando en segundo plano del harness: `. <SMOKE_DIR>/env.sh && smoke_guard_pre && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000 > "$SMOKE_DIR/sui-start.log" 2>&1` → **recién** entonces `smoke_guard` (porque `start` reescribe el alias `localnet`) y `suic`/`publish.mjs`; un `GUARD-FAIL` detiene todo y se reporta. Las capturas se corren **siempre con `--url "$RPC_URL"`** (= `http://127.0.0.1:19000`); si por error se corriera una captura sin `--url`, se declara. Publicación **variante B** (`agents.md:165-166`, sin `--out`, escribe `contracts/deployments/localnet.json`, ignorado por git) con `ADMIN`; `node scripts/publish.mjs check` → `2 despliegue(s) válidos y coherentes con Published.toml` (la de localnet no tiene entrada en `Published.toml`, es válido). Roles: `ADMIN` (publica y tiene el `HouseCap`), `A` (crea todas las partidas), `B` (invitado y quien acepta), `C` (tercero); cuatro cuentas distintas de la génesis. Seguir **exactamente** la receta de `contracts/README.md:486-499` (`update_fee_rate` 250; `G_OPEN` 1000001 **primera** transacción de `A`; `G_INV` 2000002; `G_CANCEL` abierta 3000003 cancelada; `G_REJ` 4000004 rechazada; `cancel_game` de `B` sobre `G_OPEN` con `--gas-budget 100000000` ⇒ `game`/3; `G_ACC1..n` 1000001 aceptadas por `B` hasta tener un ganador `A` y uno `B` (tope 8); `G_ACCINV` 1000001 aceptada por `B`; `C` acepta `G_ACC1` con `--gas-budget 100000000` ⇒ `game`/4). El `accept_game` lleva `0x8` (`Random`) y es el **último** `MoveCall` del PTB (`agents.md:302-305`). Después, con `"$NODE"` (con el `env.sh` cargado) y desde `<repo>`: `app/scripts/capture-read-fixtures.mjs` y `app/scripts/capture-tx-fixtures.mjs`, cada uno **dos veces** (2a, 2.0.2) y con `--url "$RPC_URL"`. Si `capture-read-fixtures` aborta con "no hay una partida de esta variante…", reportarlo (la fixture de #10 usó otra secuencia: apuestas 1000001-1000005; fallback: G-B' con esa secuencia solo para las lecturas, declarado). Al terminar las capturas, **cerrar G-B con 2.8 antes de 2.7**.

**2.7 Génesis G-C (panel de la House), en el puerto 19000.** **Solo después de cerrar G-B con 2.8** (una génesis a la vez; el puerto se libera). Génesis nueva, mismo arranque y `smoke_guard` que en 2.6, variante B, receta de `contracts/README.md:519-535` (los 5 pasos, **sin** ninguna otra transacción de admin), `capture-house-fixtures.mjs --url "$RPC_URL"` dos veces. Al terminar, **cerrar G-C con 2.8**.

**2.8 Comparación y cierre.** Comparación de forma (pares ruta-tipo y longitudes, más el cotejo de valores no derivados, **incluidos los costos de gas** de `effects.gasUsed`: si cambian con la PV 142, decirlo explícitamente, es dato para #73) de las 3 fixtures. Cierre de **cada** génesis (R-4; `rm -f contracts/deployments/localnet.json`, `rmdir contracts/deployments 2>/dev/null || true`, `git status` limpio de entradas de la corrida, `git diff --exit-code -- contracts/Move.lock contracts/Published.toml`, `test ! -e contracts/deployments/localnet.json`, `! compgen -G 'contracts/Pub.*.toml'`). Registrar el código de salida de `sui start` al `kill` (R-4) y comprobar que el 19000 queda libre (`ss -ltn | grep -c ':19000 '` = 0) y que el 9000 sigue como estaba.

**R-12 (§2)** rige todo este task: reportes y borradores solo con las herramientas de escribir/editar archivos, y la guarda de `~/.sui` también después de escribir cada reporte y de cerrar cada génesis.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `app/src/sui/config.test.ts` (solo los 5 literales de 2.4.8), `app/scripts/localnet-guard.mjs`, `app/scripts/localnet-guard.d.mts` (nuevo), `app/src/test/localnet-guard.test.ts` (nuevo), los comentarios de ayuda de `app/scripts/capture-read-fixtures.mjs`, `capture-tx-fixtures.mjs` y `capture-house-fixtures.mjs`, `contracts/fixtures/{game-reads,game-tx,house-admin}.localnet.json` (los escriben los scripts, sin editar a mano), y el texto de la versión de `app/scripts/capture-tx-fixtures.mjs` y `capture-house-fixtures.mjs`.
- **NO tocar:** `contracts/scripts/` (incluidos `publish.mjs` y `deployment.mjs`), `contracts/scripts/fixtures/`, `app/src/sui/networks.ts` (el navegador contra otro puerto va en #73 TASK-8 o en un issue aparte), el resto de `app/src/`, el código (no los comentarios) de los `capture-*.mjs`, `contracts/sources|tests`, `Move.lock`, `Move.toml`, `Published.toml`, `deployments/testnet.json`, `ci.yml`, docs.

### 5. Tests obligatorios
Los tests nuevos de la guarda (lista de URLs hostiles del paso 2.4.3) y el rechazo con código 2 de los tres scripts (2.4.6); determinismo de las tres capturas (2 corridas por génesis, solo `capturedAt`); `node --test scripts/*.test.mjs` sigue en 104 y `check` en `1 despliegue(s)` (el árbol de `scripts/` no cambia). Los de `app` se corren en TASK-3.

### 6. Smoke
La variante B del script + `check` (2.6). Smoke de producto: no aplica.

### 7. Criterios de aceptación (DoD)
- [ ] Las 3 fixtures de la app recapturadas con la 1.84.0 en localnet aislada (2 génesis, una a la vez), sin editar; tabla de forma "igual / distinta" por archivo con el cotejo de valores no derivados y la nota de costos de gas.
- [ ] `_meta.suiCliVersion` de las tres = `1.84.0-<SUI_COMMIT>`.
- [ ] `config.test.ts` corregido en 2.4.8 (5 literales por `jq`, tabla ruta/viejo/nuevo, sin tocar matchers) y `npm test -w app` en verde antes de los commits (a0) y (a).
- [ ] Guarda: `isLoopbackUrl`/`checkLocalnetArgs` con la lista aceptada y la hostil (tests PASS); lint 0, typecheck 0, `npm test -w app` = 1156 + N en 66 archivos (el conteo **no baja**); los tres `capture-*.mjs` rechazan una URL hostil con **exit 2 antes de pedir nada** y capturan con `--url http://127.0.0.1:19000`; sin `--url` el comportamiento por defecto sigue siendo `http://127.0.0.1:9000`; la restricción "solo loopback" se conserva.
- [ ] `smoke_guard` con la comprobación del RPC en cada llamada, ningún `GUARD-FAIL`; una génesis a la vez, G-B cerrada antes de abrir G-C; el 9000 ajeno sin tocar.
- [ ] Cada captura corrida dos veces y determinista (solo `capturedAt`).
- [ ] `Move.lock`, `Published.toml` y `deployments/testnet.json` sin delta; `~/.sui/` en la línea base; cierre limpio de las dos génesis.
- [ ] R-6: los 4 greps sobre el diff, con el grupo "fixtures" clasificado por conteo.

### Riesgos (v1.3)
- **S-10** (§3): el lint o el `typecheck` no se cumplen con la estructura del paso 2.4, un test existente de la guarda falla, o algún `capture-*.mjs` usa el puerto por otro camino.
- **Riesgo:** un puerto de loopback puede estar ocupado por un servicio de otro proyecto (como el 9000 hoy). Barreras: las capturas **no firman** (solo leen y simulan); `assertDeployment` exige que el chain id del nodo sea el de `contracts/deployments/localnet.json` (un servicio ajeno falla en `getServiceInfo` antes de capturar nada); `ss -ltn` antes de arrancar; el `smoke_guard` con el RPC exacto; y la regla de no correr una captura sin `--url` mientras el 9000 esté ocupado.
- **Railway:** el diff de este task no toca ninguna watch path (`app/scripts/**`, `app/src/test/**` y los `*.test.ts` están negados; `contracts/fixtures/` no figura: `app/README.md:246-266`); el merge no publica el sitio.
- **Navegador:** `app/src/sui/networks.ts:11` sigue fijo en `http://127.0.0.1:9000`; los smokes con navegador contra una localnet en otro puerto no se resuelven aquí.

### 8. Al terminar
Dos entregas, ambas con la plantilla de reporte y **sin commits**: (1) al cerrar 2.4.1-2.4.6, `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` y **detenerse** hasta que el MID lo revise y el orquestador commitee (a); (2) al cerrar 2.5-2.8, `REPORTE_TOOLCHAIN_142_TASK-2b.txt` para el commit (b).

---

## TASK-3: gates de `app`, `deploy-image` y V-9 — área: app/ci (solo medición)

Depende de TASK-2b aprobado y commiteado.

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** comprobar que `app` y la imagen de Railway siguen en verde con las fixtures de la 1.84.0 y saber cómo falla el fullnode público al leer eventos bajo su piso de historial, **para** llegar a #73 sabiendo que la app y el despliegue no se mueven y qué habría que ajustar en la lectura de eventos.

### 2. Contexto (rutas reales)
- Gates de `app`: `agents.md:204-221` (steps del job `app`, `ci.yml:142-181`); línea base de TASK-1: 1156 tests en 65 archivos; **esperado en este task: 1156 + N tests en 66 archivos**, con N = los tests de `app/src/test/localnet-guard.test.ts` informados en el reporte de TASK-2b (commit (a)).
- `app/src/sui/execution.test.ts:281-283` y otros tests (25 archivos importan fixtures `*.localnet.json`) tienen literales derivados de las fixtures (p. ej. `computationCost: '1000000'`, `storageCost: '2941200'`, `networkCost … 3_941_200n`): si la nueva génesis o la 1.84 cambian un valor real, hay que verlo.
- V-9 (`PLAN_MULTIGAME` §13): cómo falla `ListEvents` bajo el piso tras la 1.84 y si `app/src/sui/eventScan.ts:130-140` lo reconoce. Lo que dice el código de la 1.84.0 (leído, no medido): un descendente que llega al piso falla con `OutOfRange` + `ErrorInfo.reason = BELOW_EARLIEST_AVAILABLE` (`crates/sui-rpc-api/src/error.rs:207-224` @ `testnet-v1.84.0`), y las notas del release agregan que un descendente con `start_checkpoint` bajo el piso falla igual (PR 28527 en las notas del release). En la app, `isHistoryPruned` (`eventScan.ts:130-140`) devuelve `true` ante **`OUT_OF_RANGE`** sin releer el piso (`:132`); ante otro `RpcError` que no sea `CANCELLED` relee el piso por `fetchNodeInfo` (`:135`) y compara `piso > startCheckpoint` (`:139`); `requestEvents` lanza `ReadDataError('malformed')` si el stream termina sin `QueryEnd` (`:104`) o con un `reason` desconocido (`:117`). Riesgo a descartar: `ABOVE_LATEST_AVAILABLE` es **también** `OutOfRange` (`error.rs:226-262`): un `OUT_OF_RANGE` por estar por encima de lo indexado se clasificaría como "historial podado".
- Las notas del release 1.84.0 (gRPC) además: los cursores de `ListEvents` de servidores anteriores a la 1.83 (y los de 1.83) se rechazan con `INVALID_ARGUMENT` (PR 28541); `Watermark` trae `cursor_position`. La app no persiste cursores entre sesiones; solo importa si un cursor vivo cruza el cambio de versión del nodo.

### 3. Qué implementar

**3.1 Gates de `app`** (R-9; mismos comandos y orden que 1.0 paso 4, **con las fixtures de TASK-2a y 2b**): `npm ci`, firmas, auditoría de producción, lint, typecheck, `npm test -w app`, build de testnet, `git status --porcelain --untracked-files=all` vacío. Esperado: sin delta contra la línea base medida en TASK-1 **salvo** los N tests y el archivo nuevos de la guarda de TASK-2b (1156 + N tests en 66 archivos; N informado en el reporte de 2b). El tamaño del bundle no depende de las fixtures: `index-*.js` igual. Al cierre: `git diff --stat` y `git status --porcelain --untracked-files=all`.

**3.2 Si fallan tests por las fixtures (H-4).** (`app/src/sui/config.test.ts` ya se corrigió en TASK-2b 2.4.8; 3.2 cubre lo que rompa la recaptura de `contracts/fixtures/*.localnet.json` de 2b.) Diagnosticar primero. Si la causa es **un literal copiado de la fixture** que cambió porque el valor real es otro con la 1.84 o con la génesis nueva: se reemplaza **solo ese literal de entrada** en el `*.test.ts(x)` correspondiente (y los resultados que el propio test deriva de él por su fórmula, p. ej. `networkCost`), uno por uno, con estas condiciones:
- cada valor nuevo **sale de la fixture por `jq`**, con el comando y su salida pegados en el reporte, y una tabla **ruta → valor viejo → valor nuevo** (en "Desviaciones");
- **prohibido** cambiar matchers (`toBe` ↔ `toMatchObject`, etc.), borrar o relajar aserciones, o tocar el cálculo esperado; nada más de `app/src`;
- si cambian los costos de gas con la PV 142 (`computationCost`, `storageCost`, `storageRebate`: p. ej. `execution.test.ts:281-283`), se dice **explícitamente** en el reporte: es dato para #73 (`GAME_STORAGE_DEPOSIT_MIST` de `app/src/sui/createGame.ts` y las mediciones de `contracts/README.md:410-418`); **no** se cambia `GAME_STORAGE_DEPOSIT_MIST` aquí (no es un test).

Si la causa es **otra** (forma, BCS, texto de error del nodo, orden de eventos, un comportamiento) o si arreglarlo exigiría tocar un matcher, una aserción o una fórmula: **S-9**, con la lista de tests rojos y el diff de la fixture, sin tocar código.

**3.3 `deploy-image`** (R-8; `agents.md:223-229`): `bash app/scripts/check-deploy-image.sh . 8090`; camino positivo (existe `contracts/deployments/testnet.json`), P1-P13 y `OK (positivo)`; limpieza por línea base de `docker images -aq`. Sin delta contra la línea base (mismo `index-*.js`).

**3.4 V-9 (solo medición, lecturas públicas sin claves).** Con `npm ci` hecho. Un script desechable **en un directorio nuevo del scratchpad** (nunca en el repo), con un enlace simbólico `node_modules` → `<repo>/node_modules` en ese directorio para que resuelva `@mysten/sui`, ejecutado con Node 26 por ruta absoluta; no importa código de la app; solo habla con `https://fullnode.testnet.sui.io:443` (`app/src/sui/networks.ts:12`). Qué hace (espejo de `requestEvents`, `eventScan.ts:65-100`):
1. `ledgerService.getServiceInfo({})`: imprime `chainId` corto, `checkpointHeight`, `lowestAvailableCheckpoint` (el piso `F`), `epoch` y, si el mensaje trae el campo, la versión del servidor (`server`): dice si el nodo público ya es 1.84.
2. `ledgerService.listEvents` descendente, `limit` 50, filtro de un literal `eventType` = `<packageId de contracts/deployments/testnet.json>::game::GameCreated` (ID público), `readMask` como `EVENT_READ_MASK` (`eventScan.ts:36`), sin `before`, con `startCheckpoint` = **(a)** `1`, **(b)** `F - 1`, **(c)** `F + 16000` (la cota normal de la app, `HISTORY_FLOOR_MARGIN_CHECKPOINTS`, `eventScan.ts:12`: control, debe responder) y **(d, opcional)** `checkpointHeight + 1000000` (para ver si "por encima de lo indexado" también sale como `OUT_OF_RANGE`).
3. Por cada caso imprime: cantidad de frames recibidos y si hubo un `watermark` en el piso, el `end.reason` si lo hubo, **o** la excepción: `error.name`, `error.code` (`RpcError.code`), `error.message`, y si `error.meta` trae `grpc-status-details-bin` (solo presencia y longitud; decodificar el `ErrorInfo` (`reason`, metadatos) si el SDK lo permite, sin pegar nada sensible: no hay).
4. Conclusión en el reporte, por caso: **cómo falla** (`OUT_OF_RANGE` con `BELOW_EARLIEST_AVAILABLE`, otro código, o stream sin `QueryEnd`) y **si `eventScan.ts:130-140` lo reconoce** (rama de `OUT_OF_RANGE` en `:132`, rama de relectura del piso en `:135-139`, o ninguna ⇒ `ReadDataError('malformed')` en `:104`/`:117`), con una frase por cada una. Anotar además si (d) se clasifica mal (`OUT_OF_RANGE` ≠ piso). **No se cambia código de la app**: si hay algo que ajustar, el reporte lo dice y el orquestador abre un issue aparte (no es de este PR).
5. **V-9 es no concluyente para la 1.84** si el fullnode público no corre ≥ 1.84 o no se puede saber qué versión corre (el campo `server` ausente o de la 1.83): se dice así en el reporte, **sin** decir "reconocido" como si valiera para la 1.84, y el orquestador abre un issue de seguimiento "repetir V-9 cuando el fullnode público corra la 1.84". Si el caso (d) (`ABOVE_LATEST_AVAILABLE`, `OUT_OF_RANGE`) se clasifica como "historial podado", también va un issue aparte con la evidencia. Ambos issues los abre el orquestador; este PR no cambia código de la app.
6. V-7 final: repetir la lectura de la PV de testnet (1.1). Si ya no es 142, **S-1**.

### 4. Archivos a tocar / NO tocar
- **Tocar:** ninguno, salvo literales de `app/src/**/*.test.ts(x)` bajo 3.2.
- **NO tocar:** código de `app/src` que no sea un test, `app/scripts/`, `Dockerfile`, `.dockerignore`, `app/Caddyfile`, `package-lock.json`, `.npmrc`, `contracts/`.

### 5. Tests obligatorios
Los de `app` (1156 + N en 66 archivos: la línea base de TASK-1 más los de la guarda de TASK-2b, sin otro delta) y el `deploy-image`. V-9 no agrega tests (es medición).

### 6. Smoke
No aplica (la medición V-9 es de solo lectura; sin navegador).

### 7. Criterios de aceptación (DoD)
- [ ] `npm ci`/firmas/auditoría/lint 0/typecheck 0/**1156 + N tests en 66 archivos** (N = los de la guarda de TASK-2b)/build sin otro delta, o cada literal cambiado justificado (3.2); si los costos de gas cambiaron, dicho explícitamente.
- [ ] `deploy-image` verde por el camino positivo; Docker en la línea base.
- [ ] V-9 documentado: servidor (versión) y piso, los casos (a)-(c) (y (d) si se corrió) con código, mensaje y detalle; reconocimiento por `eventScan.ts:130-140`; marcado **concluyente / no concluyente** según la versión del servidor, con los issues de seguimiento que correspondan.
- [ ] Cada literal de test de `app` cambiado (si hubo) con su `jq`, su tabla ruta, viejo, nuevo y sin tocar matchers ni aserciones.
- [ ] V-7 final: PV 142.
- [ ] R-6 sobre el reporte.

### 8. Al terminar
Reporte `.txt`; sin commits (normalmente TASK-3 no deja cambios en el árbol).

---

## TASK-4: docs — área: docs

Depende de TASK-1, 2a, 2b y 3 aprobados. Solo documentación (PROY-20); los valores salen de los reportes, **no se inventa ninguno**.

### 1. Historia de usuario del task
**Como** desarrollador, **quiero** que `agents.md`, `documents/STATUS.md` y los READMEs digan la CLI vigente, el framework pineado y la línea base nueva, **para** que quien arranque después (y #73) no trabaje con una versión vieja.

### 2. Contexto (líneas reales)
- `agents.md:75-79` (toolchain: "Instalada el 2026-10-30: Sui CLI `1.83.0` … STATUS H1"), `:382` (tabla de §11: `1.83.0-16d2dc1e05ed`), `:194` (`sui start` 1.83 sale con 144), `:118, :176, :245, :323`: citas y mediciones de la 1.83 (**no se reescriben**).
- `documents/STATUS.md`: Toolchain `:27` (CLI), `:28` (CI), `:32` (Framework), H1 `:146`, H13 `:158`, H14 `:159`, tabla de baselines (`:51-52` encabezado; filas nuevas van **arriba**, antes de la de `:53`).
- `contracts/README.md:15` (descripción de `scripts/fixtures/`: "salidas reales de la CLI 1.83.0"), `:723` (runbook: `# sui 1.83.0-16d2dc1e05ed (= SUI_VERSION/SUI_COMMIT de ci.yml)`). **No** se reescriben las citas "@ `testnet-v1.83.0`" (`:375, :430, :443`), ni `:441, :552, :816, :851` (mediciones de la 1.83) ni `:605` (ejemplo del json de la publicación de #8).
- `README.md:93-94` (raíz): "Sui CLI `1.83.0` … `suiup install sui@testnet-1.83.0`" (M-3).
- `app/README.md`: las menciones de 1.83 son mediciones pasadas (no se tocan), **pero** `:328` (árbol: "guarda compartida de las capturas: solo http://127.0.0.1:9000 y la génesis del despliegue") y `:840` ("solo acepta `http://127.0.0.1:9000`") describen la guarda y cambian con TASK-2b (v1.3); `contracts/README.md:466` ("acepta `http://127.0.0.1:9000` (con otra `--url` sale con error antes de cualquier pedido)") también. `agents.md` §3 paso 4 (`:155-166`) y la plantilla de `env.sh` (paso 2, `:132-146`) no documentan el puerto.

### 3. Qué implementar
1. **`agents.md`:** `:75-79` → "Instalada el 2026-11-19 (#75): Sui CLI `1.84.0` (release `testnet`) vía `suiup` en `~/.local/bin` (antes `1.83.0`, 2026-10-30; STATUS H1, sección Toolchain)"; `:382` → `1.84.0-<SUI_COMMIT>`. Si el `sui start` de 1.84 salió con otro código que 144 en TASK-2a/2b, `:194` pasa al código medido; si salió con 144, `:194` pasa a "`sui start` 1.83 y 1.84 salen con código 144" (y H14 de STATUS igual).
2. **`documents/STATUS.md`** (en la forma de la 1.83): Toolchain "Sui CLI" → `sui 1.84.0-<SUI_COMMIT>` (release `testnet`, 2026-11-10), `suiup 0.1.1`, binarios en `~/.local/bin`; instalada el 2026-11-19 (#75), antes `1.83.0-16d2dc1e05ed`. "CI" → `SUI_VERSION 1.84.0` / `SUI_COMMIT <12 hex>` = local, **mismo procedimiento para los dos SHA-256** (los valores viven en `ci.yml`), más "verificados el 2026-11-19: tgz del release = cache de `suiup`; binario instalado = `suiup` = extraído del tgz". **Histórico de la 1.83.0 (H-5, lo necesita V-16 de #73):** registrar sus dos SHA-256 tal como estaban en las líneas 24-25 del `ci.yml` de `88dd53b` (tgz `e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8`, binario `29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa`) **y** la referencia exacta "las líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`"; los dos van en la fila "CI" de STATUS.
   "Framework" → `Move.lock` v4 pineado a `e6f43880f4b65e2c1f0397583a9690b4b22c9223`, piso de la PV **142** = PV de testnet (repin de #75 el 2026-11-19, época `<medida>`, `sui move update-deps -e testnet`; H13); antes `05ad86a3…` (PV 140, #8) y `719fb296…` (PV 139, #1). H1 → CLI `1.84.0-<SUI_COMMIT>` (2026-11-19, #75), con la 1.83.0 como histórico. H13 → agregar "✅ **2026-11-19 (#75)**: CLI 1.84.0 (PV máx 142), lock repineado a `e6f43880…` (PV 142, época `<n>`); `framework-drift` sin 'CLI atrasada'. El paquete publicado (#8) sigue compilado con 1.83.0 (`Published.toml:10`) y un upgrade lo escribe con la 1.84.0". Fila nueva de baselines (la plantilla está más abajo) con los conteos medidos.
   **2bis. Valores medidos (v1.3.3; salen de los reportes de TASK-1, 2a, 2b y 3, que el orquestador pega a `REPORTES_TOOLCHAIN_142.md`; el DEV de docs los usa tal cual y, si ve otro valor en los reportes, lo declara):**
   - **Toolchain (TASK-1, 2026-11-19):** CLI `sui 1.84.0-9dc25070cf2e` (release `testnet-v1.84.0`, publicado el 2026-11-10; tag → commit `9dc25070cf2e`); `SUI_TGZ_SHA256` `0f006fb4408bb2f867698a193d5f22f166acb9b89e0eb027c1e1b445b3b62127` y `SUI_BIN_SHA256` `ac657ec16feafe3e1a6db93b09ae922f6e5e601cf41ea35ff9b7905781d35ab0` (tgz del release = cache de `suiup`; binario instalado = copia de `suiup` = extraído del tgz; verificados **antes** de ejecutar el binario); V-7: testnet PV **142**, época **1289**, PV máxima de la CLI 142 (repetida al final de TASK-3: igual). `Move.lock`: `05ad86a3…` (PV 140) → `e6f43880f4b65e2c1f0397583a9690b4b22c9223` (PV 142) por `sui move update-deps -e testnet`; solo cambian los dos `rev`; `[move] version` y los tres `manifest_digest` iguales; `~/.move` +57532 KB. Gates de `contracts` con la 1.84.0: **0 warnings / 0 lints / 83 tests PASS**; `Published.toml` y `deployments/testnet.json` sin delta; `node --test` **104**, `check` `1 despliegue(s)`; actionlint 0. Línea base con la 1.83.0 re-medida antes de cambiar nada: **sin delta** contra el §0. Histórico de la 1.83.0 (para V-16 de #73): los dos SHA-256 de arriba (punto 2), tgz `e5116805…` y binario `29e1beb9…`, completos en las líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`.
   - **Localnet aislada, fixtures de `scripts/` (TASK-2a, 2026-11-20):** chain `cb1e492c`; forma del `--json` **igual** (103/103 y 90/90 pares ruta-tipo y todas las longitudes de arrays; solo cambia la posición del `published` dentro de `objectChanges`); gas de publicar el paquete **47_246_000 MIST**, idéntico con la PV 142; variante A de `publish.mjs` de punta a punta sin aviso de CLI y con `Move.lock` sin delta; `node --test` 104; `check` `1 despliegue(s)`.
   - **Localnet aislada, fixtures de la app (TASK-2b):** chains `94e0f49c` (G-B: lecturas y transacciones) y `4daf3c94` (G-C: panel de la House); **puerto 19000** porque el 9000 del host lo ocupa un servicio de otro proyecto del host (`sui start --fullnode-rpc-port 19000`); `game-tx` y `house-admin` con forma **igual**; `game-reads` igual salvo **una rama de datos** (el primer frame crudo de `rawListEventsPage` es ahora una invitación: `opponent` es un `stringValue` en vez de `nullValue`; no es un cambio del nodo ni del formato); **gas idéntico en las 12 transacciones ejecutadas** (9 de `game-tx` y 3 de `house-admin`; `createOpen` 1000000/2941200/0): **dato para #73: los costos de gas y storage no cambian con la PV 142, así que `GAME_STORAGE_DEPOSIT_MIST` y las mediciones de `contracts/README.md:410-418` siguen valiendo**; cada captura corrida dos veces, solo `capturedAt` distinto; `sui start` sale con **144** (como con la 1.83); `fees_collected` 150000 → 200000 (4 aceptaciones en vez de 3, por la moneda); cierres limpios (`~/.sui`, `~/.move`, Docker).
   - **App y `deploy-image` (TASK-3):** `npm ci` 293 paquetes (295 auditados), 292 firmas, 0 vulnerabilidades de producción, **9 moderate solo de desarrollo** (la fila de Toolchain de STATUS decía 11; `package-lock.json` sin cambios en #75: deriva de la base de avisos de `npm`); lint 0, typecheck 0, **1246 tests en 66 archivos** (1156 + 90 del test de la guarda), `dist/assets/index-B3BeMVQC.js` 917.80 kB (277.96 kB gzip) idéntico; `deploy-image` por el camino positivo: **P1-P12 y la línea final `OK (positivo)`** (= P13 de `app/README.md`; el script la rotula "P1-P12"); Docker: 5 contenedores / 17 imágenes, **0 `<none>` residuales** (las dos bases nombradas del `Dockerfile`, `node:26.13.0-bookworm-slim` y `caddy:2.11.7-alpine`, quedaron tras la primera corrida y se declararon).
   - **V-9 CONCLUYENTE (TASK-3):** fullnode público `sui-node/1.84.1-e83d69069e40`, piso 404332001, altura 408571135, época 1289. Bajo el piso (`startCheckpoint` 1 y piso − 1): `OUT_OF_RANGE` con `ErrorInfo.reason = BELOW_EARLIEST_AVAILABLE`, 0 frames, **reconocido** por `eventScan.ts:132`. Con la cota normal (piso + 16000): responde, 4 frames, `CHECKPOINT_BOUND`. Por encima de lo indexado (altura + 1000000): `OUT_OF_RANGE` con `ABOVE_LATEST_AVAILABLE`, que `isHistoryPruned` **clasifica mal** como historial podado (`eventScan.ts:132`; issue de seguimiento `#__` a completar por el orquestador). **No** hay issue "repetir V-9" (el servidor ya es ≥ 1.84). El repo fija la CLI 1.84.0 por decisión del owner (D1); el servidor público corre la 1.84.1: son binarios distintos, no hay contradicción.
   - **Incidente de proceso (TASK-2a):** un `sui start` accidental sin guarda (heredoc sin comillas) con el HOME real; lo rechazó la CLI ("Cannot run genesis with non-empty Sui config directory…") sin efecto; `~/.sui` verificado idéntico; origen de la regla **R-12** (§2).
   - **H13:** resuelto el **2026-11-19** (#75): CLI 1.84.0 (PV máx 142), lock repineado a `e6f43880…` (PV 142, época 1289); sin "CLI atrasada" en `framework-drift` (lo confirma la CI del PR).
3. **`contracts/README.md`:** `:15` → "CLI 1.84.0"; `:723` → `# sui 1.84.0-<SUI_COMMIT> (= SUI_VERSION/SUI_COMMIT de ci.yml)`. Si TASK-2a/2b mostraron que alguna forma del `--json` de la CLI de los pasos 6-10 del runbook (`:795-860`) cambió (los valores esperados de `:816` y `:851` son "formas exactas de la CLI 1.83"), **medirlo** en la localnet de TASK-2b (`suic object <game> --json` sobre una partida y la House) y actualizar esos valores; si no se midió, declararlo ("no re-verificado con 1.84") en el reporte. En TASK-2a/2b **no** se midieron esas formas del runbook (solo las salidas de `test-publish`/`publish` y las lecturas de las fixtures): declararlo así ("no re-verificado con 1.84") y no cambiar `:816` ni `:851`.
   **Línea nueva (v1.3.3)** en "Recaptura de la fixture de transacciones" (`:486-501`, tras la lista de la receta): "El número de aceptaciones de las partidas `G_ACC` lo decide la moneda aleatoria (se acepta hasta tener un ganador creador y uno aceptante), así que `house.json.fees_collected` de `game-tx.localnet.json` (aceptaciones × la comisión) y el literal `feesCollected` de `app/src/sui/house.test.ts` cambian entre recapturas: se actualizan con `jq -r '.house.json.fees_collected' contracts/fixtures/game-tx.localnet.json`." (La captura de #75 dio 4 aceptaciones, 200000; la de #12, 3, 150000.)
4. **`README.md` (raíz)** `:93-94` → `1.84.0` y `suiup install sui@testnet-1.84.0`.
5. **Puerto y guarda (v1.3):**
   - `agents.md` §3: en el paso 4, `--fullnode-rpc-port <P>` (por defecto 9000) para cuando el 9000 está ocupado, el orden génesis → `start` con el flag → recién después `suic`/`publish.mjs`, que `sui start --network.config <dir>` reescribe el alias `localnet` del config aislado, y el chequeo previo `ss -ltn | grep ':9000 '`; en la plantilla de `env.sh` del paso 2, las funciones `smoke_guard_pre` y `smoke_guard` con la comprobación del RPC (las de TASK-2b 2.6) **parametrizadas**: `RPC_URL=http://127.0.0.1:<puerto>` (el puerto por defecto es 9000; el 19000 fue el de #75, no se hardcodea en la plantilla); en el paso 7 (cierre) que el puerto queda libre. Las capturas de la app se corren con `--url "$RPC_URL"`.
   - `agents.md` §3, además, una **nota de proceso** (R-12): los reportes y las ediciones de docs que contengan comandos con `sui` se escriben con las herramientas de escribir/editar archivos, nunca con un heredoc (ni `sed -i`, `printf` o `echo`) que pueda interpretar el texto; y la guarda de `~/.sui` (`stat`, `ls -la`, `sha256sum` de `client.yaml`) también después de escribir cada reporte y de cerrar cada génesis. Sin nombrar el servicio ajeno ni el incidente (el detalle vive en `REPORTES_TOOLCHAIN_142.md`).
   - `contracts/README.md:466`: "acepta `http://127.0.0.1:<puerto>` (loopback, 1024-65535; por defecto 9000) y con cualquier otra `--url` sale con error antes de cualquier pedido".
   - `app/README.md:328` y `:840`: el mismo cambio de texto (guarda de loopback con puerto; por defecto 9000). Nada más de `app/README.md`.
   - `agents.md:176` y `:245` (mediciones de la 1.83) no se reescriben.
   - Ningún texto commiteable nombra el contenedor ni el proyecto ajeno que ocupa el 9000: se dice "un servicio de otro proyecto del host".
6. **No** tocar: "Ciclo activo", "Mergeadas", "Siguiente" y "Pendientes" de STATUS (housekeeping del orquestador); el resto de `app/README.md`; las citas históricas listadas arriba.

### 4. Archivos a tocar / NO tocar
- **Tocar:** `agents.md`, `documents/STATUS.md`, `contracts/README.md`, `README.md` y, solo las líneas `:328` y `:840`, `app/README.md`.
- **NO tocar:** todo lo demás.

### 5. Tests obligatorios
Ninguno. Verificación: `git diff --stat` solo con los archivos de la lista final del PR (abajo); `/usr/bin/grep -rn "1\.83" agents.md README.md contracts/README.md documents/STATUS.md` revisado línea por línea (cada restante es histórico o medición pasada, y se declara); R-6.

### 6. Smoke
No aplica.

### 7. Criterios de aceptación (DoD)
- [ ] STATUS registra, en la fila "CI", los dos SHA-256 completos de la 1.83.0 como histórico **y** la referencia "líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`".
- [ ] Docs coherentes con `ci.yml` (`SUI_VERSION`/`SUI_COMMIT` = STATUS = `agents.md` = `README.md` = `contracts/README.md`).
- [ ] Fila de baselines con los conteos medidos (no los del §0 copiados: los del reporte).
- [ ] Ninguna cita histórica reescrita; las menciones "1.83" que quedan, justificadas.
- [ ] Diff final de TASK-4 solo en `agents.md`, `documents/STATUS.md`, `contracts/README.md`, `README.md` y `app/README.md` (solo `:328` y `:840`); y el diff **completo del PR** (`git diff master...HEAD`) solo en los archivos de la tabla "Archivos del PR" (antes del cuerpo del PR). Cualquier otro archivo es una desviación.
- [ ] STATUS con las filas finales del snippet (valores de 2bis), H13 resuelto con fecha, y V-9 marcado **concluyente** con el issue de seguimiento de la clasificación (`#__`); sin ninguna mención de "repetir V-9".
- [ ] R-6 sobre el diff completo del PR (`git diff master...HEAD`, solo líneas `+`) y sobre el reporte, clasificado.

### 8. Al terminar
Reporte `.txt`; sin commits.

---

## Plantilla del reporte del DEV (FLUJO §5; obligatoria en cada task, también los de solo docs)

```markdown
## Task completado: HANDOFF_TOOLCHAIN_142 — TASK-<M>

### Branch (con SHA corto del HEAD)
### Archivos modificados/creados
### Qué se implementó (3 líneas máx)

### Tests y gates (output pegado COMPLETO, por área tocada; paths con placeholders)
- Agregados/modificados: (lista; TASK-1/2a: las constantes de los tests tocadas)
- Contracts: `printf 'n\n' | sui --version` / `sui move build` (warnings) / `--lint` (lints) / `sui move test` (N tests, PASS/FAIL), todos con `-e testnet --warnings-are-errors`
- Scripts: `node --test scripts/*.test.mjs` (N) / `node scripts/publish.mjs check`
- App: npm ci / audit signatures / audit / lint / typecheck / npm test (archivos y tests) / build; deploy-image (P1-P13)
- Estado de `Move.lock`, `Published.toml`, `deployments/testnet.json` (`git diff --exit-code`)
- **En todos los tasks, al cierre:** `git diff --stat` y `git status --porcelain --untracked-files=all`; `docker ps -aq` y `docker images -aq` (conteos antes y después)
- Tablas de contrato (contracts/README.md) y app/src/sui/ sincronizados: no aplica (sin cambios de contrato)

### Verificación manual (localnet aislada, lecturas públicas de testnet, digests si hubo)
- TASK-1: V-7 (PV, época, PV máx de la CLI, rev del manifest); `suiup show`; los **cuatro** `sha256sum` de la 1.84.0 (release por `gh api`, tgz del cache, binario instalado = copia de `suiup`, extraído) **más el del binario 1.83.0**, en el orden de 1.2 (con la constancia de que no se ejecutó antes); `sui --version`; **diff completo de `Move.lock`** con la justificación del delta; **salida de actionlint**; `du -s <HOME real>/.move` antes y después
- TASK-2a: chain id corto de G-A, tabla de forma por fixture (con la salida de `shape`/longitudes), salidas de los `cmp` y `jq empty`, variante A, código de salida de `sui start` al `kill`, `du -s <HOME real>/.move` antes y después
- TASK-2b: chain id corto de G-B y G-C, tabla de forma por fixture, costos de gas comparados, determinismo (diff de las dos corridas), variante B + `check`, código de `sui start`
- TASK-3: V-9 (versión del servidor, casos, código, mensaje, reconocimiento por `eventScan.ts:130-140`, **concluyente o no**), V-7 final; si hubo literales cambiados, `jq` + tabla ruta, viejo, nuevo
- Guardas: `stat`/`ls -la` (y `sha256sum` opcional) de `~/.sui/sui_config/` antes y después (iguales); `~/.move`; Docker (línea base)

### Desviaciones del handoff (o "ninguna")
- Qué cambió / Por qué (motivo técnico) / Verificación extra realizada

### Riesgos / pendientes (o "ninguno")
### STOPs levantados (o "ninguno")

### Seguridad (R-6)
- Salida de los 4 greps sobre el diff y sobre este reporte, con cada coincidencia clasificada (solo IDs públicos, SHAs y digests)

### Documentación
- READMEs / agents.md actualizados: sí / no aplica (TASK-4 sí)
- Snippet propuesto para documents/STATUS.md
```

**Snippet para `documents/STATUS.md`** (v1.3.3: **filas finales con los valores medidos**; el DEV de docs las inserta arriba de la tabla de baselines, antes de la fila de `:53`, y solo ajusta la redacción; el `#__` del issue de seguimiento lo completa el orquestador):

```markdown
| toolchain @ `feature/issue-75-toolchain-1840` (#75), CLI `1.84.0-9dc25070cf2e`, Node `v26.13.0`, 2026-11-19 | `ci.yml` (`SUI_VERSION`/`SUI_COMMIT`, SHA-256 del tgz y del binario), `Move.lock`, gates de `contracts`, `node --test`, `check` | 🟢 CLI 1.84.0 (release `testnet`, 2026-11-10), V-7: testnet PV 142 (época 1289), PV máx de la CLI 142; tgz `0f006fb4…` = cache de `suiup`; binario `ac657ec1…` = `suiup` = extraído del tgz, verificados antes de ejecutarlo. `Move.lock` repineado con `update-deps -e testnet`: `05ad86a3…` (PV 140) → `e6f43880…` (PV 142), solo los dos `rev` (`version` y los tres `manifest_digest` iguales), `~/.move` +57532 KB. **0 warnings / 0 lints / 83 tests PASS**; lock, `Published.toml` y `deployments/testnet.json` sin delta; `node --test` **104**, `check` `1 despliegue(s)`; actionlint 0. Línea base con la 1.83.0 re-medida antes de cambiar nada: sin delta. Histórico de la 1.83.0 (V-16 de #73): tgz `e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8`, binario `29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa` (líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`) |
| localnet aislada @ `feature/issue-75-toolchain-1840` (TASK-2a y 2b de #75), CLI `1.84.0-9dc25070cf2e`, 2026-11-20 | recaptura de `contracts/scripts/fixtures/*` y `contracts/fixtures/*.localnet.json`; variantes A y B de `publish.mjs` | 🟢 chains `cb1e492c` (2a), `94e0f49c` y `4daf3c94` (2b), **puerto 19000** (el 9000 del host lo ocupa un servicio de otro proyecto; `sui start --fullnode-rpc-port 19000`); forma **igual** en `localnet-publish*.json`, `game-tx` y `house-admin`, y en `game-reads` salvo una rama de datos (el primer frame crudo es ahora una invitación: `opponent` como `stringValue`); **gas idéntico** en las 12 transacciones ejecutadas y al publicar (47_246_000 MIST) con la PV 142: `GAME_STORAGE_DEPOSIT_MIST` y las mediciones del contrato siguen valiendo (dato para #73); cada captura determinista (solo `capturedAt`); `publish.mjs` de punta a punta con la 1.84 (sin aviso de CLI, `Move.lock` sin delta); `sui start` sale con 144; `fees_collected` 150000 → 200000 (4 aceptaciones: depende de la moneda); cierre limpio. Incidente de proceso en 2a: un `sui start` accidental sin guarda (heredoc sin comillas) rechazado por la CLI sin efecto, `~/.sui` idéntico; regla R-12 |
| app + deploy-image @ `feature/issue-75-toolchain-1840` (TASK-3 de #75), Node `v26.13.0`, 2026-11-20 | gates de `app`, `check-deploy-image.sh . 8090`, V-9 | 🟢 293 paquetes / 292 firmas / 0 vulnerabilidades de producción (9 *moderate* solo de desarrollo: STATUS decía 11; `package-lock.json` sin cambios); lint 0 / typecheck 0 / **1246 tests en 66 archivos** (1156 + 90 del test de la guarda de las capturas; sin otro delta) / `index-B3BeMVQC.js` 917.80 kB (277.96 kB gzip), idéntico; `deploy-image` camino positivo, P1-P12 y la línea final `OK (positivo)` (= P13 de `app/README.md`); Docker 5 contenedores / 17 imágenes, 0 `<none>` residuales (+2 imágenes base nombradas del `Dockerfile` en la primera corrida). **V-9 concluyente** (fullnode público `sui-node/1.84.1`, piso 404332001, altura 408571135, época 1289): bajo el piso `OUT_OF_RANGE` + `BELOW_EARLIEST_AVAILABLE`, 0 frames, reconocido por `eventScan.ts:132`; con la cota normal (piso + 16000) responde (`CHECKPOINT_BOUND`); por encima de lo indexado `OUT_OF_RANGE` + `ABOVE_LATEST_AVAILABLE`, **clasificado mal** como historial podado (issue de seguimiento `#__`). V-7 final: PV 142 (época 1289) |
```

## Mensajes de commit propuestos (los commitea el orquestador; sin palabras de cierre con número)

El orquestador agrega el trailer de atribución vigente. Nada de `Closes/Fixes/Resolves #N` en ningún commit: `Refs #75` sí (solo el body del PR cierra el issue).

Commits reales del ciclo, en orden (v1.3.3): handoff y revisiones del MAYOR (varios commits de `docs:`, del orquestador), TASK-1, TASK-2a, TASK-2b (a0), TASK-2b (a), TASK-2b (b), TASK-4 y los reportes: **7 commits de contenido** (1, 2a, a0, a, b, 4 y el de reportes), TASK-3 sin commit.

0. Handoff (orquestador, antes de TASK-1; las versiones siguientes también van con `docs:`): `docs: add the CLI 1.84.0 toolchain handoff v1.3.3 (#75)`
1. TASK-1: `ci: bump the Sui CLI to 1.84.0 and repin Move.lock to the PV 142 framework (#75)`
   Cuerpo: "testnet runs protocol version 142 and CLI 1.83.0 stops at 140, so the lock pinned the PV 140 framework, which has no sui::clock::borrow. ci.yml now pins 1.84.0 with its commit and the SHA-256 of the release tgz and of the binary; Move.lock is regenerated by the CLI (update-deps -e testnet) from 05ad86a3 to e6f43880. Gates unchanged: 0 warnings, 0 lints, 83 tests, 104 script tests; the two script tests that read ci.yml and the lock follow them; Published.toml and deployments/testnet.json untouched. Refs #75"
2. TASK-2a: `test: recapture the script fixtures with the 1.84.0 localnet and adapt the script tests (#75)`
   Cuerpo: "Fixtures from an isolated localnet (new genesis, so IDs and digests change); script tests keep their 104 cases with literals read from the new fixtures. Shape of the CLI json: <igual | distinta>. Refs #75"
3. TASK-2b (a0), antes del (a): `test: update the localnet fixture literals of config.test.ts after the 1.84.0 script fixture recapture (#75)`
   Cuerpo: "config.test.ts compares resolveConfig with the real contracts/scripts/fixtures/localnet.deployment.json, which the previous commit recaptured on a new genesis; the five expected literals (chain id, package, original package, house, publish digest) are read from the fixture with jq and no matcher or assertion changes. Refs #75"
3. TASK-2b (a), guarda (el orquestador lo commitea en el punto de control 2.4.7, **solo** con la guarda, el `.d.mts`, el test y los comentarios de ayuda; el texto de versión de los `capture-*` queda para (b)): `app: let the localnet capture guard accept any loopback port (#75)`
   Cuerpo: "The capture scripts only accepted http://127.0.0.1:9000, but that port can be taken by another service on the host. assertLocalnetUrl now accepts exactly http://127.0.0.1:<port> with an integer port from 1024 to 65535 (anchored match: no hostnames, no https, no credentials, no path) and still rejects everything else with exit code 2 before any request; without --url the default stays port 9000. The pure checks are covered by a new test with a list of hostile URLs, and only comments change in the three capture scripts. Refs #75"
3. TASK-2b (b), fixtures + los dos tests de `app` + los textos de versión (después de 2.5-2.8; todo en uno para que ningún commit deje la app en rojo): `test: recapture the app fixtures with the 1.84.0 localnet and update the literals derived from them (#75)` (cuerpo: el aprobado en la revisión del tramo 2 de TASK-2b: chains `94e0f49c` y `4daf3c94`, puerto 19000, forma igual salvo una rama de datos de game-reads, gas idéntico en 12 transacciones, determinismo, 1246 tests en 66 archivos).
4. TASK-3: **sin commit** (no hubo cambios en el árbol; 3.2 no se activó).
5. TASK-4: `docs: record the Sui CLI 1.84.0, the PV 142 lock pin and the new baselines (#75)`
   Cuerpo: "agents.md, STATUS (Toolchain, H1, H13, baselines), contracts/README.md and README.md follow ci.yml; the isolated-localnet procedure in agents.md (section 3) documents --fullnode-rpc-port, the genesis, start, client order and the RPC check of smoke_guard, and contracts/README.md and app/README.md describe the capture guard as loopback with a port (default 9000). Historical 1.83 measurements and sources are not rewritten. Refs #75"
6. Reportes (orquestador): `docs: add the #75 DEV reports and MID reviews` (sin número de cierre).

## Archivos del PR (para el DoD de TASK-4; `git diff master...HEAD --stat` debe listar exactamente estos)

| Archivo | Commit |
|---|---|
| `.github/workflows/ci.yml` (4 líneas de `env`) | TASK-1 |
| `contracts/Move.lock` (los dos `rev`) | TASK-1 |
| `contracts/scripts/deployment.test.mjs`, `contracts/scripts/publish.test.mjs` | TASK-1 (`:38` y `:562-571`) y TASK-2a (el resto de los literales) |
| `contracts/scripts/fixtures/{localnet-publish.json,localnet-publish-dry-run.json,Published.localnet.toml,localnet.deployment.json}` | TASK-2a |
| `app/src/sui/config.test.ts` (5 literales) | TASK-2b (a0) |
| `app/scripts/localnet-guard.mjs`, `app/scripts/localnet-guard.d.mts` (nuevo), `app/src/test/localnet-guard.test.ts` (nuevo), comentarios de ayuda de `app/scripts/capture-{read,tx,house}-fixtures.mjs` | TASK-2b (a) |
| `contracts/fixtures/{game-reads,game-tx,house-admin}.localnet.json`; texto de versión de `app/scripts/capture-tx-fixtures.mjs` y `capture-house-fixtures.mjs`; `app/src/sui/game.test.ts` y `app/src/sui/house.test.ts` (literales y 1 comentario) | TASK-2b (b) |
| `agents.md`, `documents/STATUS.md`, `contracts/README.md`, `README.md`, `app/README.md` (solo `:328` y `:840`) | TASK-4 |
| `documents/HANDOFF_TOOLCHAIN_142.md`, `documents/REVISION_*.md`, `documents/REPORTES_TOOLCHAIN_142.md` (artefactos del ciclo; se borran en el housekeeping) | docs del ciclo |

No tocan: `contracts/sources/`, `contracts/tests/`, `contracts/Move.toml`, `contracts/Published.toml`, `contracts/deployments/testnet.json`, `app/src/sui/networks.ts`, `publish.mjs`, `deployment.mjs`, `Dockerfile`, `package-lock.json`. Railway: ningún archivo de la tabla cae en las watch paths (`app/scripts/**`, `app/src/test/**`, `*.test.ts`, `app/README.md` están negados; `contracts/fixtures/` no figura), así que el merge no publica el sitio.

## Cuerpo propuesto del PR (lo escribe el orquestador con los números reales de los reportes)

Título: `toolchain: Sui CLI 1.84.0 y Move.lock a la PV 142 (#75)`

```markdown
## Resumen
Sube la Sui CLI de `1.83.0` a **`1.84.0`** (D-20261119-05 P-8) y repinea el framework de `Move.lock` a la **PV 142**
(`e6f43880f4b65e2c1f0397583a9690b4b22c9223`), que trae `sui::clock::borrow()`. Es el task previo (PRE-1) de la
plataforma multijuego. **Sin cambios de código de contrato**: `contracts/sources/`, `contracts/tests/`,
`contracts/deployments/testnet.json` y `contracts/Published.toml` no cambian.

## Qué cambia
- `.github/workflows/ci.yml`: `SUI_VERSION 1.84.0`, `SUI_COMMIT 9dc25070cf2e`, `SUI_TGZ_SHA256 0f006fb4…` (digest del release,
  re-verificado el 2026-11-19), `SUI_BIN_SHA256 ac657ec1…` (binario de `suiup` = el que extrae la CI del tgz; verificado antes de ejecutarlo).
- `contracts/Move.lock`: solo `[pinned.testnet.MoveStdlib]` y `[pinned.testnet.Sui]`, de `05ad86a3…` (PV 140) a `e6f43880…`
  (PV 142), por `sui move update-deps -e testnet`; `version` y los tres `manifest_digest` iguales (PROY-11).
- Fixtures de `contracts/scripts/fixtures/` y `contracts/fixtures/*.localnet.json` recapturadas con la 1.84.0 en la
  localnet aislada (tres génesis, puerto 19000); tests de `scripts/` con los literales nuevos (104 casos, ninguno debilitado; los dos que leen `ci.yml` y el lock se adaptan en el commit de la CLI) y cinco literales de tests de `app` más `config.test.ts`.
  Forma del `--json` y de las lecturas gRPC: **igual**, salvo una rama de datos de `game-reads` (el primer frame crudo es una invitación). **Gas idéntico** en las 12 transacciones y al publicar (47_246_000 MIST) con la PV 142: `GAME_STORAGE_DEPOSIT_MIST` y las mediciones del contrato siguen valiendo (dato para #73).
- Guarda de las capturas de la app (`app/scripts/localnet-guard.mjs`): ahora acepta exactamente `http://127.0.0.1:<puerto>` con puerto entero 1024-65535 (por defecto 9000; solo loopback; todo lo demás, exit 2 antes de pedir nada), porque el 9000 del host lo ocupa un servicio de otro proyecto. Archivos nuevos: `app/scripts/localnet-guard.d.mts` y `app/src/test/localnet-guard.test.ts` (los tests de `app` pasan a 1156 + N en 66 archivos). Solo comentarios en los tres `capture-*.mjs`.
- Docs: `agents.md` (§3: puerto con `--fullnode-rpc-port`, orden génesis → `start` → `suic`, `smoke_guard` con la comprobación del RPC), `documents/STATUS.md` (Toolchain, H1, H13, baselines), `contracts/README.md`, `app/README.md` (`:328`, `:840`), `README.md`.

## Decisiones
- CLI `1.84.0` (no `1.84.1`), D-20261119-05 P-8. No se reabre.
- V-7 (2026-11-19 y de nuevo al final): testnet en PV 142, época 1289; PV máxima de la CLI 1.84.0 = 142.
- V-9 **concluyente** (solo medición, sin cambios de app; fullnode público `sui-node/1.84.1`): bajo el piso, `ListEvents` falla con `OUT_OF_RANGE` y `BELOW_EARLIEST_AVAILABLE` y `eventScan.ts:132` lo reconoce; con la cota normal responde; por encima de lo indexado falla con `OUT_OF_RANGE` y `ABOVE_LATEST_AVAILABLE`, que `isHistoryPruned` clasifica mal como historial podado: issue de seguimiento `#__` (no se cambia código de la app en este PR). No hace falta "repetir V-9": el servidor ya es ≥ 1.84.
- Issues de seguimiento (los crea el orquestador): `#__` clasificación de `ABOVE_LATEST_AVAILABLE`; `#__` (opcional) `networks.ts:11` fijo en el puerto 9000 para el navegador; `#__` (opcional) `house.test.ts` compara `feesCollected` con un literal que depende de la moneda.
- Un servicio de otro proyecto del host ocupa el 9000: por eso la localnet aislada corrió en el 19000 (autorizado por el owner) y la guarda de las capturas acepta cualquier puerto de loopback.

## Gates (output completo en `documents/REPORTES_TOOLCHAIN_142.md`)
| Gate | Línea base (1.83.0, re-medida) | Con 1.84.0 |
|---|---|---|
| build / lint / test (`-e testnet --warnings-are-errors`) | 0 / 0 / 83 | 0 / 0 / 83 |
| `Move.lock`, `Published.toml`, `deployments/testnet.json` | sin delta | `Move.lock` repineado; los otros dos sin delta |
| `node --test` / `check` | 104 / `1 despliegue(s)` | 104 / `1 despliegue(s)` |
| app lint / typecheck / tests / build | 0 / 0 / 1156 en 65 / `index-B3BeMVQC.js` 917.80 kB | 0 / 0 / **1246 en 66** (1156 + 90 de la guarda) / idéntico |
| `deploy-image` | OK (positivo) | OK (positivo): P1-P12 y la línea final |
| CI del PR: `contracts`, `app`, `deploy-image` | | verde; `framework-drift` sin "CLI atrasada" ni lock atrasado |

## Seguridad
Sin claves, mnemónicos, `.env` ni direcciones de cuenta fuera de las fixtures de una génesis desechable (cuentas efímeras,
clave destruida; precedente de #7). `~/.sui/sui_config/` sin claves y sin cambios. Greps R-6 clasificados en los reportes.
Nada contra testnet salvo lecturas públicas. La guarda de las capturas conserva "solo loopback" (puerto 1024-65535) y rechaza
todo lo demás con exit 2 antes de pedir nada. Incidente de proceso en TASK-2a: un `sui start` accidental (heredoc sin
comillas) con el HOME real, rechazado por la CLI; `~/.sui` verificado sin cambios; regla R-12; detalle en
`REPORTES_TOOLCHAIN_142.md`. La nota de proceso R-12 quedó en `agents.md` §3.

## Pendientes del usuario
Ninguno para el merge. Los mensajes de `framework-drift` en `ci.yml:246, 250-251` siguen diciendo "pre-vuelo de #8": se dejan así en este PR y se actualizan en TASK-4 de #73, cuando el runbook de upgrade reemplace al pre-vuelo de #8. Para #73: la máquina queda con la 1.84.0 como `sui` por defecto (`suiup`) y la 1.83.0 sigue instalada
(el ensayo de upgrade de #73 publica el v1 con ese binario: no correr `suiup remove`). `app/src/sui/networks.ts:11` sigue fijo en `http://127.0.0.1:9000` para el navegador: los smokes con navegador contra otro puerto se resuelven en #73 TASK-8 o en un issue aparte. Rollback del PR: revertirlo.

Closes #75
Relacionado: #73 (este PR no lo cierra).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Referencias verificadas por el MID (2026-11-19)

Leídas en el worktree (`archivo:línea`) y en GitHub público; **no se ejecutó ningún gate ni `sui`; sí se ejecutó `suiup --version` una vez (solo lectura, no instala ni toca `~/.sui`; H-11)**: `ci.yml:18-25, 44-45, 51-63, 94-98, 104, 142-181, 198-263`;
`contracts/Move.lock:1-23`, `Move.toml:1-11`, `Published.toml:10`, `deployments/testnet.json:14`;
`contracts/scripts/publish.mjs:101-109, 184-188, 340-355, 677-681, 765-790`, `deployment.mjs` (`checkConsistency`), `deployment.test.mjs:1-2, 28-38, 149-152, 240-251, 286, 324-328`, `publish.test.mjs:45-61, 498, 562-575, 696-699, 724-728`;
`app/scripts/capture-*.mjs` (`:169, :267, :272, :280, :292, :301`), `localnet-guard.mjs:41-54`; `app/src/sui/eventScan.ts:12, 36, 65-100, 104, 117, 124-140`, `networks.ts:12`;
`agents.md:75-98, 115-202, 204-229, 382`; `documents/STATUS.md:27-34, 45, 49-58, 69, 90-91, 99-101, 146, 158-159`; `contracts/README.md:15, 454, 464-468, 486-501, 517-535, 723, 737-748, 909-912`; `README.md:93-94`; `app/README.md:181-231`;
`documents/DECISIONES.md` D-20261030-07, D-20261030-13, D-20261102-01, D-20261102-03 y (en `edfcdc2`) D-20261119-05; `PLAN_MULTIGAME` v1.3 (`edfcdc2`) §4.5, §14 PRE-1, §13 V-7 y V-9, §1.2 H-7 y H-10;
GitHub público: release `testnet-v1.84.0` (fecha, digest, tag), `lib.rs:41`, `manifest.json`, `clock.move` en `e6f43880…` y `05ad86a3…`, `sui-rpc-api/src/error.rs` @ el tag, notas del release, y el código de `suiup` v0.1.1 (leído, no ejecutado); GraphQL de testnet (época 1289, PV 142).
**No verificado:** el comportamiento real de la 1.84 (flags de `test-publish`/`publish`, formas del `--json`, código de salida de `sui start`, versión del fullnode público): es lo que miden los tasks.
