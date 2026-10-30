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

## Baselines de gates

| Área @ ref | Gate | Resultado |
|---|---|---|
| contracts (raíz) @ `master` (`f063a0e`) | `sui move build` | 🔍 pendiente del baseline de #1 (CLI instalada 2026-10-30). Esperado 🔴 por H6/H7 |
| | `sui move test` | 🔍 pendiente de #1; 0 tests |
| app | — | ⬜ no existe |
| CI | — | ⬜ no existe |

Todo handoff declara en su §0 el baseline verificado del día (AGENTE_MID). El primer baseline real
sale del issue de toolchain.

## Hallazgos de la revisión inicial (2026-10-30)

| # | Área | Hallazgo | Acción propuesta |
|---|---|---|---|
| H1 | toolchain | ✅ 2026-10-30: `suiup` 0.1.1 en `~/.local/bin`; **Sui CLI `1.83.0-16d2dc1e05ed`** (release `testnet`, default). Node 20/22/26 vía nvm. | #1: fijar framework y registrar baseline con esta versión |
| H2 | contracts | `Move.toml` usa `rev = "framework/testnet"` (branch móvil); edition `2024.beta`. | Fijar framework a la versión de la CLI (PROY-11) |
| H3 | house | `initialize_house` destruye el `HouseCap`; admin validado por `ctx.sender() == house.admin` y fees pagadas a `house.admin` (`house.move:47-81`). | Requerir `&HouseCap` (PROY-3) |
| H4 | house | `EInsufficientBalance` se usa para el fee y para fees = 0 (`house.move:48,69,78`). | Abort code propio (LIM-8) |
| H5 | house | Sin `add_fees` para Game, sin accessors/setters de `min_bet`/`max_bet`, sin eventos. | `public(package) add_fees`, accessors, eventos (PROY-4, PROY-7) |
| H6 | game | `start_game` construye `GameRequest` sin la mayoría de campos: no compila (`game.move:54-62`). | Rediseño del Game module |
| H7 | game | `GamePool` con `vector<GameRequest>` compartido; `escrow: u64` sin custodia; `TurnCap` sin uso; estados `Finished`/`Resolution`/`Resolved` solapados. | Objeto compartido por partida con `Balance<SUI>`, estados `Pending/Active/Resolved/Cancelled` (PROY-6, PROY-8, SEG-4) |
| H8 | legado | `sources/battleship.move` (tablero/barcos) sin uso; `new_game` usa `player1` tras moverlo. | Decidir: mover fuera del paquete o borrar hasta la fase de batalla naval real |
| H9 | tests | `tests/battleship_tests.move` comentado entero. | Suite con `test_scenario` por módulo (PROY-9) |
| H10 | docs | README dice "2 vs 2"; el diseño es 1 vs 1. Roadmap marca el Escrow como diseñado. | Actualizar README en el issue de docs |

## Ciclo activo — backlog para terminar el MVP

| Paso | Estado | Nota |
|---|---|---|
| Docs del flujo adaptados (`agents.md`, `documents/`) | 🔍 2026-10-30 | D-20261030-01; PR `docs/agent-workflow` pendiente de merge del usuario |
| Issues del backlog en GitHub | ✅ 2026-10-30 | #1–#18 redactados por el MAYOR y creados por el orquestador |
| Siguiente | ⏳ | #1 (toolchain) → plan del MID |

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

- Mergear el PR de docs del flujo (`docs/agent-workflow`).
- Resolver los STOP de los planes a medida que lleguen (los más pesados: #4 D1/D3 y #5 D1).
- (Resueltos 2026-10-30: P-1 → D-20261030-05; P-2 → PR de docs; P-3 → Sui CLI instalada, H1.)

## Mergeadas (histórico)

| Ciclo | PR | Fecha |
|---|---|---|
| — | | |
