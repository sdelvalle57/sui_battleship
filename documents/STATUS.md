# Estado de Documentos y Ciclos — Sui Battleship

> Índice único de estado para planes, handoffs y smokes de `documents/`, y de los gates.
> **Convención:** ✅ Implementado · 🚧 En progreso · 🔍 Por verificar · ⛔ Bloqueado.

## Punto de partida (2026-10-30)

Proyecto retomado tras ~19 meses sin cambios (último commit `f063a0e`, 2025-03-12). Revisión inicial
del orquestador sobre `master`:

| Roadmap original (README) | Estado real |
|---|---|
| 1. Diseño de recursos | ✅ House (#4); Game: crear/cancelar/rechazar (#5) y aceptar + coinflip (#6, `1630eaa`); Escrow absorbido en Game (D-20261030-15) |
| 2. House module | ✅ reescrito en #4 (`040f3c0`): `HouseCap`, límites, `add_fees`, eventos, versionado |
| 3. Game module | ✅ `battleship::game`: crear/cancelar/rechazar en #5 (`67fa60d`); `accept_game` con coinflip, comisión y `GameResolved` en #6 (`1630eaa`) |
| 4. Escrow module | ✅ absorbido en Game (D-20261030-15): la apuesta es `stake: Balance<SUI>` de cada `Game` |
| 5. Tests | ✅ suites de House (26 tests, #4) y Game (57 tests: 26 de #5 + 31 de aceptar/coinflip en #6, `1630eaa`); coverage 100 % |
| 6. Docs y despliegue | ⬜ |
| UI React | ⬜ no existe (D-20261030-03) |

## Toolchain

Registrada el 2026-10-30 (#1, H1/H2/H11).

| Ítem | Valor |
|---|---|
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`), `suiup 0.1.1`, binarios en `~/.local/bin` |
| CI | `.github/workflows/ci.yml`, `ubuntu-24.04`, `SUI_VERSION 1.83.0` / `SUI_COMMIT 16d2dc1e05ed` = local (#3, D-20261030-13). Al subir de versión se actualizan `SUI_TGZ_SHA256` (`gh api repos/MystenLabs/sui/releases/tags/testnet-v<versión> --jq '.assets[] \| .name + " " + .digest'`) y `SUI_BIN_SHA256` (`sha256sum` del binario local de `suiup`) |
| Node | `v26.13.0` tras `nvm use` (`.nvmrc` = 26, D-20261030-10) |
| Prerrequisito de `sui move` | `~/.sui/sui_config/client.yaml` **sin claves** con `active_env: testnet` y `active_address: ~` (D-20261030-07). Sin ese archivo la CLI crea una clave e imprime su frase (H11). Nunca va al repo ni a logs; su contenido no se pega |
| Framework | `std`/`sui` implícitas; fijados por `Move.lock` v4 a `719fb2960ccfbf9f4d33041f8ea5146d30671696`, el piso de la PV **139**; testnet en **140** desde la época 1269 (2026-10-30 21:24 UTC) → H13. Sin repin en #2 (rename puro) |
| Entornos del lock | `Move.lock` v4 solo pinea `testnet`. Un gate con otro `-e` crearía una sección `[pinned.<env>]` nueva, y ese delta del lock hay que declararlo (PROY-11) |
| Gates | Siempre desde `contracts/` (`cd contracts && …`), con `-e testnet --warnings-are-errors` (build, `--lint` y test, los tres bloqueantes, D-20261030-13) y `Move.lock` sin delta, con la respuesta `n` a la CLI por stdin (`printf 'n\n'` en pipe): forma canónica de agents.md §3 = steps del job `contracts` de la CI (PROY-18) |

## Baselines de gates

| Área @ ref | Gate | Resultado |
|---|---|---|
| contracts/ @ `feature/issue-6-accept` (`1630eaa`, TASK-1 de #6), CLI `1.83.0`, 2026-10-31 | `sui move build -e testnet --warnings-are-errors` | 🟢 exit 0. **0 warnings**. Módulos: `contracts/sources/house.move`, `contracts/sources/game.move` |
| | `sui move build -e testnet --lint --warnings-are-errors` | 🟢 exit 0. **0 lints** |
| | `sui move test -e testnet --warnings-are-errors` | 🟢 exit 0. **83 tests PASS** (26 `house_tests` + 57 `game_tests`); `Move.lock` sin delta |
| | `sui move test -e testnet --coverage` + `sui move coverage summary -e testnet` | Informativo: `battleship::house` **100 %**, `battleship::game` **100 %**, total 100 % |
| contracts/ @ `master` (`a69fe7c`, merge de #30; medido en `67fa60d`, mismo código), CLI `1.83.0`, 2026-10-30 | `sui move build -e testnet --warnings-are-errors` | 🟢 exit 0. **0 warnings**. Módulos: `contracts/sources/house.move`, `contracts/sources/game.move` |
| | `sui move build -e testnet --lint --warnings-are-errors` | 🟢 exit 0. **0 lints** |
| | `sui move test -e testnet --warnings-are-errors` | 🟢 exit 0. **52 tests PASS** (26 `house_tests` + 26 `game_tests`); `Move.lock` sin delta |
| | `sui move test -e testnet --coverage` + `sui move coverage summary -e testnet` | Informativo: `battleship::house` **100 %**, `battleship::game` **98,02 %** (sin cubrir solo el brazo `Resolved` de `is_pending`, alcanzable desde #6), total 99,03 % |
| contracts/ @ `master` (`68d1afe`, merge de #24; medido en `040f3c0`, mismo código), CLI `1.83.0`, 2026-10-30 | `sui move build -e testnet` | 🟢 exit 0. **0 errores, 0 warnings** de compilación. Único módulo: `contracts/sources/house.move` |
| | `sui move build -e testnet --lint` | 🟢 exit 0. **0 lints** (delta −1: `WSL06010` cerrado, H12) |
| | `sui move test -e testnet` | 🟢 exit 0. 0 warnings. **26 tests PASS** (`contracts/tests/house_tests.move`) |
| | `sui move test -e testnet --coverage` + `sui move coverage summary -e testnet` | Informativo: **100 %** de `battleship::house`. Artefactos `contracts/.coverage_map.mvcov` y `contracts/traces/`, ya ignorados por `.coverage*` y `contracts/traces/` en `.gitignore` (sin cambios) |
| contracts/ @ `master` (anterior a #4: `48df3b4`, merge de #22; medido en `8325126`, mismo código de contratos que `f4b437c`), CLI `1.83.0`, 2026-10-30 | `sui move build -e testnet` | 🟢 exit 0. **0 errores, 0 warnings** de compilación. Único módulo: `contracts/sources/house.move` |
| | `sui move build -e testnet --lint` | 🟢 exit 0. 0 errores, 0 warnings; **1 lint de Sui:** `WSL06010` (`prefer_mut_tx_context`) en `contracts/sources/house.move:67` (`update_fee_rate` con `&TxContext`, H12 → #4) |
| | `sui move test -e testnet` | 🟢 exit 0. 0 errores, 0 warnings. **0 tests** (`Test result: OK. Total tests: 0`) |
| app | — | ⬜ no existe |
| CI @ `master` (`ae89cd5`, merge de #27), 2026-10-30 | Primer run `push` ([run 41150550292](https://github.com/sdelvalle57/sui_battleship/actions/runs/41150550292)) | 🟢 `contracts` y `framework-drift` success (baseline de CI en `master`) |
| CI @ `feature/issue-3-ci` (`44ff83a`, PR #27), 2026-10-30 (evidencia de #3) | R1: job `contracts` ([run 41148825720, attempt 1](https://github.com/sdelvalle57/sui_battleship/actions/runs/41148825720/attempts/1)) | 🟢 success en 56 s (Install 31 s, cache miss): `.tgz` y binario `OK` (SHA-256), `sui 1.83.0-16d2dc1e05ed`, build, `--lint` y test con `--warnings-are-errors` exit 0, **26/26**, `Move.lock` y árbol sin cambios, guarda de cero claves en verde |
| | R1: job `framework-drift` | 🟢 success en 5 s con el warning H13 esperado (lock PV 139 vs testnet PV 140; época 1269 en la medición local V4); sin "CLI atrasada" |
| | R2: mismo run, [attempt 2](https://github.com/sdelvalle57/sui_battleship/actions/runs/41148825720/attempts/2) | 🟢 success en 14 s: cache hit de la CLI (Install y Save skipped) y de `~/.move/git`; Verify OK; 26/26 |
| | R3 y R4: rojos provocados en el PR desechable #28 (cerrado sin merge) | Evidencia de #3, no baseline: R3 ([run 41149053353](https://github.com/sdelvalle57/sui_battleship/actions/runs/41149053353/attempts/1), `8653839`) Build failure `error[EC04007]`; R4 ([run 41149200767](https://github.com/sdelvalle57/sui_battleship/actions/runs/41149200767/attempts/1), `fc0a3d4`) Build success y **Lint failure** `error[ESL06010]` (D-20261030-13 confirmada) |

Todo handoff declara en su §0 el baseline verificado del día (AGENTE_MID). Cero delta = mismos errores y
mismos conteos por archivo.

## Hallazgos de la revisión inicial (2026-10-30)

| # | Área | Hallazgo | Acción propuesta |
|---|---|---|---|
| H1 | toolchain | ✅ 2026-10-30: `suiup` 0.1.1 en `~/.local/bin`; **Sui CLI `1.83.0-16d2dc1e05ed`** (release `testnet`, default). Node 20/22/26 vía nvm. Registrado en Toolchain. | #1: fijar framework y registrar baseline con esta versión |
| H2 | contracts | ✅ 2026-10-30 (#1). Antes, `Move.toml` usaba `rev = "framework/testnet"` (branch móvil) y edition `2024.beta`. Ahora `std`/`sui` son implícitas, `edition = "2024"` y `Move.lock` v4 los pinea a `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139). | — (PROY-11 reescrita) |
| H3 | house | ✅ 2026-10-30 (#4, `040f3c0`). Antes, `initialize_house` destruía el `HouseCap`; admin validado por `ctx.sender() == house.admin` y fees pagadas a `house.admin`. Ahora toda operación de admin recibe `&HouseCap`, sin campo `admin` (D-20261030-11). | — |
| H4 | house | ✅ 2026-10-30 (#4, `040f3c0`). Antes, `EInsufficientBalance` se usaba para el fee y para fees = 0. Ahora un abort code por condición (0–4, `contracts/README.md`). | — |
| H5 | house | ✅ 2026-10-30 (#4, `040f3c0`): `public(package) add_fees`, `update_bet_limits`, accessors `min_bet`/`max_bet` y 5 eventos. | — |
| H6 | game | `start_game` construye `GameRequest` sin la mayoría de campos: no compila (`game.move:55-59`). | ✅ 2026-10-30 (#2): archivo retirado; `battleship::game` se crea desde cero en #5 |
| H7 | game | `GamePool` con `vector<GameRequest>` compartido; `escrow: u64` sin custodia; `TurnCap` sin uso; estados `Finished`/`Resolution`/`Resolved` solapados. | ✅ 2026-10-31: #5 (`67fa60d`): un `Game` compartido por partida (sin pool), apuesta en `stake: Balance<SUI>` (sin escrow), sin `TurnCap`, `GameState` = `Pending \| Cancelled \| Resolved`; #6 (`1630eaa`): `accept_game` resuelve de forma atómica con `sui::random` (D-20261030-16). Diseño 2025: `git show f063a0e:sources/Game/game.move` |
| H8 | legado | Borrador 2025 de tablero/barcos sin uso; `new_game` usaba `player1` tras moverlo (no compilaba). | ✅ 2026-10-30 (#2): borrado (D-20261030-10); se recupera con `git show f063a0e:sources/battleship.move` (#18) |
| H9 | tests | El único archivo de tests estaba comentado entero. | ✅ 2026-10-31: el test comentado se retiró en #2 (`git show f063a0e:tests/battleship_tests.move`); suite de House en #4 (26 tests, `040f3c0`); suite de Game en #5 (26 tests, `67fa60d`) y #6 (+31: aceptar, ambos resultados del coinflip con `sui::random`, comisión y conservación, `1630eaa`): 83 tests, coverage 100 % |
| H10 | docs | README dice "2 vs 2"; el diseño es 1 vs 1. Roadmap marca el Escrow como diseñado. | Actualizar README en el issue de docs |
| H11 | toolchain | `sui move` exige `client.yaml`. Sin él, la CLI crea una clave e imprime su frase (`sui_commands.rs:584, 1630-1648` @ `testnet-v1.83.0`), y `-e` no lo evita. | ✅ 2026-10-30: resuelto con una config sin claves (D-20261030-07). **#3:** ✅ 2026-10-30: el job `contracts` escribe la misma config sin claves en `$RUNNER_TEMP/sui_config`, exporta `SUI_CONFIG_DIR` y corre una guarda de cero claves (keystore `[]`, ningún otro keystore, sin `~/.sui`) en cada run (R1 de #3). **#7:** al publicar, la CLI escribe `Published.toml` (se commitea) y `Pub.*.toml` efímeros (ignorados en `.gitignore`). `Published.toml` se superpone con `contracts/deployments/<red>.json` (D-20261030-03, ARQ-6): #7 define cuál es la fuente del `packageId` y cuál se deriva. **#8:** el owner agrega su clave a este mismo `client.yaml` desde su terminal, sin agentes |
| H12 | house | ✅ 2026-10-30 (#4, `040f3c0`). Antes, lint `WSL06010` (`prefer_mut_tx_context`): `update_fee_rate` era `public` y recibía `&TxContext`. Ahora es `entry` sin `ctx` y ninguna función recibe `&TxContext` inmutable; `sui move build -e testnet --lint` da 0 lints. | — |
| H13 | toolchain | testnet en PV `140` (medida 2026-10-30, época 1269; `05ad86a3e86c522deea116f80dc2bf2309a53363` para 140) y el lock en el piso de 139 (`719fb29…`). La CLI no repinea ni avisa por sí sola (solo con `update-deps`, al cambiar las dependencias del manifest, con un digest de dependencia distinto o con otro `-e`; publish solo compara la CLI con la red). Desde #3, el job `framework-drift` lo avisa en cada run (informativo). | Pre-vuelo de #8 (comentado en el issue): (1) CLI del canal testnet con PV máxima ≥ PV de testnet (si no, `suiup` y registrar en Toolchain); (2) `cd contracts && printf 'n\n' \| sui move update-deps -e testnet`; (3) delta del lock declarado y gates re-medidos |

## Ciclo activo — backlog para terminar el MVP

| Paso | Estado | Nota |
|---|---|---|
| Docs del flujo adaptados (`agents.md`, `documents/`) | ✅ 2026-10-30 | D-20261030-01; PR #19 mergeado (`2b088b5`) |
| Issues del backlog en GitHub | ✅ 2026-10-30 | #1–#18 redactados por el MAYOR y creados por el orquestador |
| #1 (toolchain) | ✅ 2026-10-30 | PR #20 mergeado (`e1849c6`); MAYOR APPROVE. Artefactos del ciclo borrados en el housekeeping (`git show e1849c6:documents/PLAN_TOOLCHAIN.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_TOOLCHAIN.md`) |
| #2 (monorepo) | ✅ 2026-10-30 | PR #22 mergeado (`48df3b4`); MAYOR APPROVE; primer baseline verde. Artefactos borrados en el housekeeping (`git show 48df3b4:documents/PLAN_MONOREPO.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_MONOREPO.md`) |
| #4 (House) | ✅ 2026-10-30 | PR #24 mergeado (`68d1afe`); MAYOR APPROVE. 26 tests, coverage 100 %. Artefactos borrados en el housekeeping (`git show 68d1afe:documents/PLAN_HOUSE.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_HOUSE.md`) |
| Licencia | ✅ 2026-10-30 | Apache-2.0 (D-20261030-14): `LICENSE` en la raíz y cabecera `// Copyright (c) 2025-2026 sdelvalle57` + SPDX en los fuentes Move |
| #3 (CI) | ✅ 2026-10-30 | PR #27 mergeado (`ae89cd5`); MAYOR APPROVE; run `push` en `master` verde. Artefactos borrados en el housekeeping (`git show ae89cd5:documents/PLAN_CI.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_CI.md`) |
| #5 (Game: crear/cancelar/rechazar) | ✅ 2026-10-31 | PR #30 mergeado (`a69fe7c`); MAYOR APPROVE; CI `contracts` verde (52/52). Artefactos borrados en el housekeeping (`git show a69fe7c:documents/PLAN_GAME.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_GAME.md`) |
| #6 (Game: aceptar + coinflip, pago y comisión) | 🚧 2026-10-31 | Branch `feature/issue-6-accept`. Plan v2 aprobado por el MAYOR (D-20261030-16); `documents/PLAN_ACCEPT.md`, `REVISION_PLAN_ACCEPT.md`, `HANDOFF_ACCEPT.md`, `SMOKE_ACCEPT.md`, `REPORTES_ACCEPT.md`. TASK-1 ✅ (`1630eaa`, MID PASA: `accept_game`, `GameResolved`, aborts 7-10, 83 tests); TASK-2 ✅ (docs, MID PASA); TASK-3 (smoke en localnet aislada, storage, fixtures) pendiente |

## Backlog (issues de GitHub, 2026-10-30)

Camino crítico: **#1 → #2 → #4 → #5 → #6 → #7 → #9 → #10 → #11 → #12 → #13 → #16 → #17**. #3 (CI)
apenas mergea #2; #8 (publicación en testnet, owner) en paralelo con #9–#12 tras #7; #13 y #14 en
paralelo; #15 después de #12; #18 fuera del MVP.

| # | Tema | Prioridad | Depende de |
|---|---|---|---|
| #1 | Sui CLI con suiup, framework fijado, primer baseline | P0 | — |
| #2 | Monorepo (`contracts/`), retiro del legado | P0 | #1 |
| #3 | CI de contratos | P1 | #1, #2 |
| #4 | House: `HouseCap`, límites, `add_fees`, eventos, tests | P0 | #2 |
| #5 | Game: objeto por partida, crear/cancelar (STOPs D1–D8) | P0 | #4 |
| #6 | Game: aceptar + coinflip `sui::random`, pago y comisión | P0 | #4, #5 |
| #7 | Formato `deployments/<red>.json` + script de publicación | P0 | #6 |
| #8 | Publicación en testnet (owner) | P0 | #3, #6, #7 |
| #9 | Scaffolding de `app/` + capa `sui/` + job de CI | P0 | #2, #3, #7 |
| #10 | Lobby y detalle de partida | P0 | #6, #9 |
| #11 | Crear/cancelar desde la app + mapeo de aborts | P0 | #5, #10 |
| #12 | Aceptar, coinflip y resultado | P0 | #6, #11 |
| #13 | Mis partidas e invitaciones | P1 | #12 |
| #14 | Panel admin de la House | P1 | #4, #8, #11 |
| #15 | Hosting estático de la app | P1 | #8, #9 |
| #16 | README y guía de uso | P1 | #13, #14, #15 |
| #17 | Smoke end-to-end en testnet, cierre del MVP | P1 | #8, #15, #16 |
| #18 | Mecánica real de batalla naval (future) | P2 | #17 |

## Planes pendientes de aprobación

| Plan | Estado | Nota | Fecha |
|---|---|---|---|
| — | | | |

## Pendientes del usuario

- Resolver los STOP de los planes a medida que lleguen. #4 resuelto (D-20261030-11); #3 resuelto (D-20261030-13; protección de `master` y SHA-pinning de Actions aplicados el 2026-10-30); #5 resuelto (D-20261030-15); #5 D1/D2/D5/D7 ya resueltas (D-20261030-06); #6 resuelto (D-20261030-16).
- **Post-publicación (#8):** `update_fee_rate` antes de anunciar el juego (fee por defecto 0, D-20261030-11): las partidas creadas antes quedan con comisión 0 para siempre.
- (Resueltos 2026-10-30: P-1 → D-20261030-05; P-2 → PR de docs; P-3 → Sui CLI instalada, H1.)

## Mergeadas (histórico)

| Ciclo | PR | Fecha |
|---|---|---|
| Docs del flujo multi-agente (D-20261030-01) | #19 → `2b088b5` | 2026-10-30 |
| #1 Toolchain, manifest pineado, primer baseline | #20 → `e1849c6` | 2026-10-30 |
| #2 Monorepo (`contracts/`), legado retirado, Node 26 | #22 → `48df3b4` | 2026-10-30 |
| #4 House: `HouseCap`, límites, `add_fees`, eventos, versionado, 26 tests | #24 → `68d1afe` | 2026-10-30 |
| #3 CI de contratos (`ci.yml`: `contracts` + `framework-drift`) | #27 → `ae89cd5` | 2026-10-30 |
| #5 Game: crear/cancelar/rechazar, 26 tests | #30 → `a69fe7c` | 2026-10-31 |
