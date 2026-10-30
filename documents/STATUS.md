# Estado de Documentos y Ciclos — Sui Battleship

> Índice único de estado para planes, handoffs y smokes de `documents/`, y de los gates.
> **Convención:** ✅ Implementado · 🚧 En progreso · 🔍 Por verificar · ⛔ Bloqueado.

## Punto de partida (2026-10-30)

Proyecto retomado tras ~19 meses sin cambios (último commit `f063a0e`, 2025-03-12). Revisión inicial
del orquestador sobre `master`:

| Roadmap original (README) | Estado real |
|---|---|
| 1. Diseño de recursos | 🚧 House y Game esbozados; Escrow sin diseño |
| 2. House module | 🔍 implementado, con hallazgos H3–H5 |
| 3. Game module | ⛔ recién empezado; **no compila** (H6) |
| 4. Escrow module | ⬜ no existe (se propone absorberlo en Game: fondos como `Balance<SUI>` de la partida) |
| 5. Tests | ⬜ el único archivo de tests está comentado |
| 6. Docs y despliegue | ⬜ |
| UI React | ⬜ no existe (D-20261030-03) |

## Toolchain

Registrada el 2026-10-30 (#1, H1/H2/H11).

| Ítem | Valor |
|---|---|
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`), `suiup 0.1.1`, binarios en `~/.local/bin` |
| Node | `v22.23.4` tras `nvm use 22` |
| Prerrequisito de `sui move` | `~/.sui/sui_config/client.yaml` **sin claves** con `active_env: testnet` y `active_address: ~` (D-20261030-07). Sin ese archivo la CLI crea una clave e imprime su frase (H11). Nunca va al repo ni a logs; su contenido no se pega |
| Framework | `std`/`sui` implícitas; fijados por `Move.lock` v4 a `719fb2960ccfbf9f4d33041f8ea5146d30671696`, el piso de la versión de protocolo **139** de testnet (verificado 2026-10-30) |
| Entornos del lock | `Move.lock` v4 solo pinea `testnet`. Un gate con otro `-e` crearía una sección `[pinned.<env>]` nueva, y ese delta del lock hay que declararlo (PROY-11) |
| Gates | Siempre con `-e testnet`, con la respuesta `n` a la CLI por stdin (`printf 'n\n'` en pipe), ver agents.md §3 |

## Baselines de gates

| Área @ ref | Gate | Resultado |
|---|---|---|
| contracts (raíz) @ `master` (`e1849c6`, merge de #20; medido en `b0fb54e`, mismo código de contratos), CLI `1.83.0`, 2026-10-30 | `sui move build -e testnet` | 🔴 exit 1, compilación. **7 errores:** 6 × `EC04016` en `sources/Game/game.move:55-59` (H6) y 1 × `EC06002` en `sources/battleship.move:62` (H8). **Warnings:** 16 `WC09009`, **como mínimo** (9 en `battleship.move`, 7 en `Game/game.move`, 0 en `House/house.move`); la compilación aborta y pueden faltar pasos posteriores. `tests/battleship_tests.move`: 0 diagnósticos (está entero dentro de `/* */`). Las subcarpetas `sources/Game/` y `sources/House/` sí se compilan |
| | `sui move build -e testnet --lint` | 🔴 exit 1. Mismos 7 errores y 16 `WC09009`, más **1 lint de Sui**, **como mínimo**: `WSL06010` (`prefer_mut_tx_context`) en `sources/House/house.move:67` (`update_fee_rate` con `&TxContext`). Puede haber lints de los módulos que no compilan que aún no se emiten |
| | `sui move test -e testnet` | 🔴 exit 1. No compila: mismos 7 errores y 16 `WC09009`. **0 tests** ejecutados |
| app | — | ⬜ no existe |
| CI | — | ⬜ no existe |

Todo handoff declara en su §0 el baseline verificado del día (AGENTE_MID). Cero delta = mismos errores y
mismos conteos por archivo.

## Hallazgos de la revisión inicial (2026-10-30)

| # | Área | Hallazgo | Acción propuesta |
|---|---|---|---|
| H1 | toolchain | ✅ 2026-10-30: `suiup` 0.1.1 en `~/.local/bin`; **Sui CLI `1.83.0-16d2dc1e05ed`** (release `testnet`, default). Node 20/22/26 vía nvm. Registrado en Toolchain. | #1: fijar framework y registrar baseline con esta versión |
| H2 | contracts | ✅ 2026-10-30 (#1). Antes, `Move.toml` usaba `rev = "framework/testnet"` (branch móvil) y edition `2024.beta`. Ahora `std`/`sui` son implícitas, `edition = "2024"` y `Move.lock` v4 los pinea a `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139). | — (PROY-11 reescrita) |
| H3 | house | `initialize_house` destruye el `HouseCap`; admin validado por `ctx.sender() == house.admin` y fees pagadas a `house.admin` (`house.move:47-81`). | Requerir `&HouseCap` (PROY-3) |
| H4 | house | `EInsufficientBalance` se usa para el fee y para fees = 0 (`house.move:48,69,78`). | Abort code propio (LIM-8) |
| H5 | house | Sin `add_fees` para Game, sin accessors/setters de `min_bet`/`max_bet`, sin eventos. | `public(package) add_fees`, accessors, eventos (PROY-4, PROY-7) |
| H6 | game | `start_game` construye `GameRequest` sin la mayoría de campos: no compila (`game.move:55-59`). | Rediseño del Game module |
| H7 | game | `GamePool` con `vector<GameRequest>` compartido; `escrow: u64` sin custodia; `TurnCap` sin uso; estados `Finished`/`Resolution`/`Resolved` solapados. | Objeto compartido por partida con `Balance<SUI>`, estados `Pending/Active/Resolved/Cancelled` (PROY-6, PROY-8, SEG-4) |
| H8 | legado | `sources/battleship.move` (tablero/barcos) sin uso; `new_game` usa `player1` tras moverlo. | Decidir: mover fuera del paquete o borrar hasta la fase de batalla naval real |
| H9 | tests | `tests/battleship_tests.move` comentado entero. | Suite con `test_scenario` por módulo (PROY-9) |
| H10 | docs | README dice "2 vs 2"; el diseño es 1 vs 1. Roadmap marca el Escrow como diseñado. | Actualizar README en el issue de docs |
| H11 | toolchain | `sui move` exige `client.yaml`. Sin él, la CLI crea una clave e imprime su frase (`sui_commands.rs:584, 1630-1648` @ `testnet-v1.83.0`), y `-e` no lo evita. | ✅ 2026-10-30: resuelto con una config sin claves (D-20261030-07). **#3:** escribir la misma config en `$RUNNER_TEMP` con `SUI_CONFIG_DIR`; `--warnings-are-errors` existe en `sui move build` y en `sui move test`. **#7:** al publicar, la CLI escribe `Published.toml` (se commitea) y `Pub.*.toml` efímeros (ignorados en `.gitignore`). `Published.toml` se superpone con `contracts/deployments/<red>.json` (D-20261030-03, ARQ-6): #7 define cuál es la fuente del `packageId` y cuál se deriva. **#8:** el owner agrega su clave a este mismo `client.yaml` desde su terminal, sin agentes |
| H12 | house | Lint `WSL06010` (`prefer_mut_tx_context`): `update_fee_rate` es `public` y recibe `&TxContext` (`house.move:67`); tras publicar, la firma ya no podría pasar a `&mut` (PROY-10). Detectado por el baseline de #1. | #4: al migrar a `&HouseCap` (H3) quitar `ctx` si deja de usarse, o usar `&mut TxContext`; criterio: `sui move build -e testnet --lint` sin lints en `house.move` |

## Ciclo activo — backlog para terminar el MVP

| Paso | Estado | Nota |
|---|---|---|
| Docs del flujo adaptados (`agents.md`, `documents/`) | ✅ 2026-10-30 | D-20261030-01; PR #19 mergeado (`2b088b5`) |
| Issues del backlog en GitHub | ✅ 2026-10-30 | #1–#18 redactados por el MAYOR y creados por el orquestador |
| #1 (toolchain) | ✅ 2026-10-30 | PR #20 mergeado (`e1849c6`); MAYOR APPROVE. Artefactos del ciclo borrados en el housekeeping (`git show e1849c6:documents/PLAN_TOOLCHAIN.md`, `HANDOFF_`, `REVISION_PLAN_`, `REPORTES_TOOLCHAIN.md`) |
| Siguiente | ⏳ | #2 (monorepo, `contracts/`, retiro del legado) → plan del MID |

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

- Ratificar D-20261030-08 (framework fijado por `Move.lock` + CLI canal testnet), hallazgo 🟡 de la revisión de integración de #20.
- Resolver los STOP de los planes a medida que lleguen (el más pesado que queda: #4 D1). #5 D1/D2/D5/D7 y #4 D3 ya resueltas (D-20261030-06).
- (Resueltos 2026-10-30: P-1 → D-20261030-05; P-2 → PR de docs; P-3 → Sui CLI instalada, H1.)

## Mergeadas (histórico)

| Ciclo | PR | Fecha |
|---|---|---|
| Docs del flujo multi-agente (D-20261030-01) | #19 → `2b088b5` | 2026-10-30 |
| #1 Toolchain, manifest pineado, primer baseline | #20 → `e1849c6` | 2026-10-30 |
