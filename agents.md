# Sui Battleship — Guía para Agentes de Código

> **Versión:** 1.0 · **Fecha:** 2026-10-30
> **Proyecto:** Sui Battleship — juego de apuestas 1 vs 1 en la blockchain Sui (Move) con cliente web React.
> Documento de arranque (preload), deliberadamente conciso. Adaptado de la plantilla del workspace
> Cancerbero (D-20261030-01). Si algo de este resumen contradice el código, el código manda (y conviene
> corregir el resumen).

## 1. Resumen del Proyecto

Dos jugadores apuestan SUI en una partida. En el **MVP** la batalla naval se simula con un **coinflip**
(aleatoriedad on-chain `sui::random`): el ganador se lleva el pozo menos una comisión de la **House**.
Un jugador crea una partida bloqueando su apuesta (abierta a cualquiera o como **invitación directa**
a una dirección); otro la acepta igualando el monto; si nadie la acepta, el creador la cancela y
recupera sus fondos. Cada jugador puede tener varias partidas simultáneas.

**Fuera del MVP:** la mecánica real de batalla naval (tablero, barcos, disparos). El borrador de esos
tipos vive en `sources/battleship.move` (legado, ver §7).

**Foco actual (oct-2026):** retomar el proyecto tras ~19 meses sin cambios (último commit 2025-03-12):
reestructurar a monorepo, terminar los módulos Move, agregar tests, CI y la UI React. Backlog en los
issues de GitHub; estado en `documents/STATUS.md`.

## 2. Repositorio (monorepo)

Un solo repo: **`sdelvalle57/sui_battleship`** (público), branch de integración `master`. Issues y PRs
se citan como `#N`.

**Layout objetivo (D-20261030-03)** — la reestructura es un issue propio; hasta que se mergee, el
paquete Move sigue en la raíz (`Move.toml`, `sources/`, `tests/`):

```
sui_battleship/
├── agents.md                 # este archivo
├── documents/                # flujo multi-agente, estándares, decisiones, status, planes/handoffs
├── contracts/                # paquete Move (Move.toml, Move.lock, sources/, tests/)
│   └── deployments/          # <red>.json con packageId y object IDs publicados (sin secretos)
├── app/                      # cliente React (Vite + TS + SDK TypeScript de Sui + wallet kit)
├── package.json              # npm workspaces: ["app"]
├── .nvmrc                    # Node 22
└── .github/workflows/        # CI de contracts y app
```

| Área | Carpeta | Stack |
|---|---|---|
| Contratos | `contracts/` | Sui Move, edition `2024` (hoy `2024.beta`), framework Sui desde git con `override = true` (cómo se declara con la CLI vigente se decide en #1) |
| Cliente web | `app/` | Vite + React + TypeScript estricto + `@mysten/sui` + wallet kit de Mysten (`@mysten/dapp-kit` o su sucesor vigente; se fija en el issue de scaffolding) + TanStack Query + Vitest |

## 3. Comandos (por área, sin Makefile)

**Toolchain:** Sui CLI instalada con `suiup` (versión fijada en `documents/STATUS.md`); Node 22
(`.nvmrc`), npm. El `node` por defecto de la máquina es v26: correr `nvm use` antes de cada gate. Instalada el 2026-10-30:
Sui CLI `1.83.0` (release `testnet`) vía `suiup` en `~/.local/bin` (STATUS H1).

### Contratos (`contracts/`; hoy la raíz)

| Comando | Qué hace |
|---|---|
| `sui move build` | Compila el paquete. Gate: sin errores y **sin warnings nuevos** |
| `sui move build --lint` | Lints de Sui (informativo hasta fijar baseline) |
| `sui move test` | Gate de tests unitarios (`#[test]`, `test_scenario`) |
| `sui move test --coverage && sui move coverage summary` | Cobertura (informativo) |
| `sui start --with-faucet --force-regenesis` | Red local para smokes (localnet) |
| `sui client publish` | Publicación — **solo el owner o con su autorización explícita** (§12) |

### App (`app/`, cuando exista)

```bash
npm ci                      # desde la raíz (workspaces)
npm run lint -w app
npm run typecheck -w app    # tsc --noEmit
npm test -w app             # Vitest
npm run build -w app
```

Gate completo = el del workflow de CI (cuando exista): contracts build + test; app lint + typecheck +
test + build.

## 4. Arquitectura de Runtime

```
Navegador (app React) ──wallet (firma)──▶ Sui fullnode (RPC) ──▶ paquete battleship
        │                                                      ├─ house::House   (shared)
        └── lecturas: objetos + eventos ◀──────────────────────┤─ game::Game     (shared, una por partida)
                                                               └─ 0x8 Random     (shared, sistema)
```

- **Sin backend propio:** la app lee objetos y eventos del RPC y arma transacciones que firma la wallet.
- **Redes:** `localnet` (smokes), `testnet` (despliegue del MVP). `mainnet` fuera de alcance sin decisión.
- **Indexado:** las listas (partidas abiertas, mis partidas) salen de **eventos** del paquete; no hay
  registros globales en objetos compartidos (PROY-6).

## 5. Contrato on-chain ↔ UI

La **fuente canónica** es el paquete Move: firmas de funciones `public`/`entry`, structs con `key`/`store`,
eventos y códigos de abort. La UI los consume desde un único módulo (`app/src/sui/`): targets
`<packageId>::<modulo>::<funcion>`, tipos de eventos y mapeo de abort codes a mensajes.

| Artefacto | Dónde | Sincronización |
|---|---|---|
| Package ID / object IDs por red | `contracts/deployments/<red>.json` | Se actualiza en el mismo PR que la publicación; la app lo importa (nunca IDs hardcodeados en componentes) |
| Firmas y eventos | `contracts/sources/*.move` | Tabla en `contracts/README.md`; cambios = STOP (§6 de FLUJO) |
| Abort codes | constantes `E*` de cada módulo | Tabla en `contracts/README.md` + mapeo en `app/src/sui/errors.ts` |

**Regla:** tras la primera publicación en testnet, un cambio incompatible con upgrade (firma pública,
layout de struct con `key`/`store`, eliminar función pública) es **STOP**: se decide entre upgrade
compatible o republicación con IDs nuevos.

## 6. Reglas de Negocio Críticas (MVP)

> **Propuesta hasta los planes de #4, #5 y #6:** varias reglas de abajo (Escrow absorbido en Game,
> estados, quién cancela/resuelve, base de la comisión) son decisiones abiertas de esos issues. Al
> aprobarse se registran en `DECISIONES.md` y se reescribe esta sección (y §8, §9, PROY-7/8).


- **Apuesta:** entre `min_bet` y `max_bet` de la House (hoy 0,001 y 50 SUI, en MIST). El que acepta iguala
  **exactamente** el monto del creador.
- **Fondos:** viven como `Balance<SUI>` dentro de la partida desde que se crean hasta que se cancela o se
  resuelve. Conservación: lo que entra = lo que sale al ganador/creador + comisión.
- **Comisión:** `fee_rate` en basis points (máx. 1000 = 10 %), se calcula sobre el pozo al resolver y se
  acumula en `House.fees_collected`; solo el admin la retira.
- **Estados:** `Pending → Active → Resolved` y `Pending → Cancelled`. Solo `Pending` se acepta o cancela;
  solo `Active` se resuelve.
- **Invitación directa:** si la partida tiene `opponent`, solo esa dirección puede aceptarla. Nadie juega
  contra sí mismo.
- **Cancelación:** solo el creador, solo en `Pending`; devuelve el 100 % (sin comisión).
- **Coinflip:** `sui::random` en una función `entry` no `public` (PROY-5). Quién puede disparar la
  resolución y qué pasa con una partida `Active` abandonada se define en el issue del Game module.
- **Admin:** las operaciones de la House requieren el `HouseCap` (pendiente: hoy se valida por dirección,
  STATUS H3).

## 7. Gotchas Técnicos

- **`sources/Game/game.move` no compila:** `start_game` construye `GameRequest` sin la mayoría de sus
  campos (`game.move:54-62`). Mientras no se arregle, `sui move build` del paquete está en rojo.
- **`sources/battleship.move` es legado** (tipos de tablero/barcos sin uso) y `new_game` usa `player1`
  después de moverlo; probablemente tampoco compila. Su destino se decide en el backlog.
- **`tests/battleship_tests.move` está todo comentado:** hoy no hay ningún test.
- **`GamePool { pool: vector<GameRequest> }`** es un registro global creciente en un objeto compartido:
  contención y sin IDs propios. El diseño objetivo es un objeto compartido por partida (PROY-6).
- **`escrow: u64`** solo guarda un número: no custodia fondos (PROY-4).
- **`house.move` reutiliza `EInsufficientBalance`** para validar el `fee_rate` (`house.move:48,69`).
- **Framework sin fijar:** `Move.toml` apunta a `rev = "framework/testnet"` (branch móvil). Se fija a la
  versión de la CLI instalada; `Move.lock` se commitea.
- **Subcarpetas en `sources/`** (`House/`, `Game/`): que compilen está por verificar (baseline de #1); el layout objetivo es plano
  (`contracts/sources/<modulo>.move`).
- **Repo público:** nada de keystores (`~/.sui/sui_config/`), mnemonics ni direcciones privadas del owner
  con contexto sensible en commits, issues o logs.

## 8. API on-chain (mapa por módulo)

- **`battleship::house`** — `House` (shared: `fee_rate`, `fees_collected`, `admin`, `min_bet`, `max_bet`),
  `HouseCap`, `init` (OTW + `HouseCap` al publicador), `initialize_house`, `update_fee_rate`,
  `withdraw_fees`, accessors `fee_rate`/`fees_collected`/`admin`. Falta: `add_fees` (`public(package)`),
  accessors/setters de límites, eventos.
- **`battleship::game`** — en construcción. Objetivo: `create_game`, `accept_game`, `cancel_game`,
  `resolve_game` (coinflip) + eventos `GameCreated`/`GameAccepted`/`GameCancelled`/`GameResolved`.

## 9. Entidades Clave

`House` · `HouseCap` · `Game` (objeto compartido por partida: creador, oponente opcional, apuesta,
`Balance<SUI>`, estado, timestamps) · `GameState` · eventos de transición · (futuro) `Board`/`Ship`/
`Coordinate` de `battleship.move`.

## 10. Testing

| Área | Gate | Naturaleza |
|---|---|---|
| Contratos | `sui move test` | Unit + escenarios multi-tx con `sui::test_scenario`; `#[expected_failure(abort_code = …)]` por cada abort; aleatoriedad con los helpers de test de `sui::random` |
| App | Vitest + jsdom + Testing Library | Builders de transacción y parsers de eventos puros y testeados; componentes con el cliente Sui mockeado |

Baselines vigentes: `documents/STATUS.md`. Los tests unitarios **no** reemplazan el smoke en localnet o
testnet con una wallet real.

## 11. Setup local y secretos

| Qué | Dónde | Nota |
|---|---|---|
| Sui CLI | `suiup` (`~/.local/bin`) | `1.83.0`, release `testnet` (STATUS H1) |
| Keystore / direcciones | `~/.sui/sui_config/` | **Nunca** en el repo ni en logs |
| Node | nvm (20, 22 y 26 instalados) | Usar 22 |
| Wallet de navegador | extensión de wallet Sui | Para smokes en testnet (owner) |

**Nunca** imprimir ni copiar mnemonics, claves privadas ni el contenido del keystore (SEG-3).

## 12. Deploy

- **Contratos:** `sui client publish` desde `contracts/` a testnet. Publicar, upgradear y custodiar el
  `UpgradeCap`/`HouseCap` es del **owner** (o del orquestador con autorización explícita por publicación).
  Tras publicar: `contracts/deployments/testnet.json` en el mismo PR.
- **Dirección publicadora:** recibe el `HouseCap` (no transferible si queda sin `store`, PROY-3); debe
  ser una dirección que el owner también use en la wallet del navegador para el panel admin (#8, #14).
- **App:** hosting estático (por definir en el backlog).
- **Mainnet:** fuera de alcance sin decisión registrada.

## 13. Checklist pre-entrega

- [ ] Gate del área tocada en verde, con output pegado en el reporte (§3). Rojos conocidos sin delta.
- [ ] Contrato on-chain: si cambió una firma/struct/evento/abort code, tablas de `contracts/README.md` y
      módulo `app/src/sui/` actualizados en el mismo ciclo (§5).
- [ ] AuthZ por función: quién puede llamar (jugador, invitado, admin con `HouseCap`) y test del caso denegado.
- [ ] Fondos: conservación testeada (balances antes/después) en cada camino que mueve SUI.
- [ ] Sin claves, mnemonics ni secretos en código, docs o logs.
- [ ] Docs actualizadas si cambió arquitectura, layout, comandos, contrato o tests (PROY-20): README del
      área + este archivo + `documents/STATUS.md`.

## 14. Mapa de Documentación

| Documento | Rol |
|---|---|
| `documents/ESTANDARES.md` | Reglas ARQ/SEG/LIM/PROY — contrato de revisión (citar hallazgos por ID) |
| `documents/DECISIONES.md` | Registro de decisiones (`D-YYYYMMDD-N`). No reabrir sin el owner |
| `documents/STATUS.md` | Ciclos activos, baselines de gates, hallazgos y pendientes |
| `documents/FLUJO_AGENTES.md` | Pipeline multi-agente: roles, permisos, plantillas |
| `documents/agentes/*.md` | Prompts de rol (DEV / MID / MAYOR / ORQUESTADOR) |
| `README.md` | Visión del producto y roadmap original (2025-03) |
| `sources/House/README.md`, `sources/Game/README.md` | Notas de diseño originales por módulo (contexto, verificar contra código) |
| `contracts/README.md` | (a crear) Tablas de funciones, eventos y abort codes |
