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

**Fuera del MVP:** la mecánica real de batalla naval (tablero, barcos, disparos). El borrador 2025 de esos
tipos se retiró del paquete en #2; se recupera con `git show f063a0e:sources/battleship.move` (#18).

**Foco actual (oct-2026):** retomar el proyecto tras ~19 meses sin cambios (último commit 2025-03-12):
reestructurar a monorepo, terminar los módulos Move, agregar tests, CI y la UI React. Backlog en los
issues de GitHub; estado en `documents/STATUS.md`.

## 2. Repositorio (monorepo)

Un solo repo: **`sdelvalle57/sui_battleship`** (público), branch de integración `master`. Issues y PRs
se citan como `#N`.

**Layout objetivo (D-20261030-03)** — `contracts/`, `package.json` y `.nvmrc` existen desde #2;
`contracts/tests/` y `contracts/README.md` desde #4; `.github/workflows/` desde #3 (`ci.yml`: job
`contracts`; el job `app` llega con #9); `app/` (#9) y `contracts/deployments/` (#7) llegan con su issue:

```
sui_battleship/
├── agents.md                 # este archivo
├── documents/                # flujo multi-agente, estándares, decisiones, status, planes/handoffs
├── contracts/                # paquete Move (Move.toml, Move.lock, README.md, sources/, tests/)
│   └── deployments/          # <red>.json con packageId y object IDs publicados (sin secretos)
├── app/                      # cliente React (Vite + TS + SDK TypeScript de Sui + wallet kit)
├── package.json              # npm workspaces: ["app"]
├── .nvmrc                    # versión de Node (PROY-17)
└── .github/workflows/        # ci.yml: job contracts (#3); el job app llega con #9
```

| Área | Carpeta | Stack |
|---|---|---|
| Contratos | `contracts/` | Sui Move, edition `2024`, `std`/`sui` implícitas (sistema de paquetes de la CLI ≥ 1.63); framework fijado por `Move.lock` (repin con `-e testnet`; todo delta del lock se justifica) |
| Cliente web | `app/` | Vite + React + TypeScript estricto + `@mysten/sui` + wallet kit de Mysten (`@mysten/dapp-kit` o su sucesor vigente; se fija en el issue de scaffolding) + TanStack Query + Vitest |

## 3. Comandos (por área, sin Makefile)

**Toolchain:** Sui CLI instalada con `suiup` en local (versión fijada en `documents/STATUS.md`); en CI, el
binario `sui` del mismo asset del release, verificado por SHA-256 (`.github/workflows/ci.yml`, `env`),
siempre la misma versión (D-20261030-13); Node (versión en
`.nvmrc`, PROY-17), npm. El `node` por defecto de la máquina puede ser otro: correr `nvm use` antes de cada gate. Instalada el 2026-10-30:
Sui CLI `1.83.0` (release `testnet`) vía `suiup` en `~/.local/bin` (STATUS H1, sección Toolchain).

**Prerrequisito de `sui move`:** `~/.sui/sui_config/client.yaml` **sin claves**, con `active_env: testnet`
(D-20261030-07; STATUS Toolchain/H11). Sin ese archivo la CLI ofrece crear una config y genera una clave
cuya frase imprime. Toda invocación de `sui` (`sui --version`, `sui move …`, `sui client …`) va precedida
de `printf 'n\n' |` para que, si la config falta, la CLI aborte en vez de crear la clave.

### Contratos (desde `contracts/`)

Los gates se corren con `cd contracts && printf 'n\n' | sui move …` (equivalente: `--path contracts` desde la raíz).

| Comando | Qué hace |
|---|---|
| `sui move build -e testnet --warnings-are-errors` | Compila. Gate bloqueante: sin errores ni warnings |
| `sui move build -e testnet --lint --warnings-are-errors` | Lints de Sui. Gate bloqueante (D-20261030-13): con `--warnings-are-errors` un lint sale como `error[ESL…]` y corta el build (R4 de #3) |
| `sui move test -e testnet --warnings-are-errors` | Tests unitarios (`#[test]`, `test_scenario`). Gate bloqueante |
| `git diff --exit-code -- Move.lock` | Tras los gates: el lock no cambia (PROY-11) |
| `sui move test -e testnet --coverage && sui move coverage summary -e testnet` | Cobertura (informativo) |
| `sui start --with-faucet --force-regenesis` | Red local para smokes (localnet) |
| `sui client publish` | Publicación — **solo el owner o con su autorización explícita** (§12) |

Las cuatro primeras filas son exactamente los steps de gate del job `contracts` de
`.github/workflows/ci.yml` (PROY-18); el job además exige árbol limpio y cero claves. Baseline vigente
de los tres gates: `documents/STATUS.md`.

### App (`app/`, cuando exista)

```bash
npm ci                      # desde la raíz (workspaces)
npm run lint -w app
npm run typecheck -w app    # tsc --noEmit
npm test -w app             # Vitest
npm run build -w app
```

Gate completo = el del workflow de CI: job `contracts` (build, lint y test con `--warnings-are-errors`,
`Move.lock` intacto, cero claves); app lint + typecheck + test + build cuando #9 agregue el job `app`.
El job `framework-drift` es informativo (H13) y no condiciona el merge.

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

> **Reglas de la House confirmadas** por D-20261030-11 (#4; contrato en `contracts/README.md`). Las de
> partidas son **propuesta hasta los planes de #5 y #6**, salvo lo ya decidido en D-20261030-06, que
> **prevalece sobre los bullets de abajo**: aceptar resuelve el coinflip en la misma transacción
> (`Pending → Resolved | Cancelled`, sin estado `Active` persistente), sin expiración, el `Game` copia el
> `fee_rate` al crearse y el invitado puede rechazar (reembolso íntegro al creador, sin comisión). Siguen
> abiertas (Escrow absorbido en Game, base de la comisión…). Los bullets Estados, Cancelación y Coinflip,
> §8 `battleship::game`, §9 y PROY-7/8 se reescriben en #5 al aprobarse su plan.


- **Apuesta:** entre `min_bet` y `max_bet` de la House (por defecto 0,001 y 50 SUI, en MIST; el titular del
  `HouseCap` los cambia con `update_bet_limits`). Los límites se aplican solo al crear la partida; el que
  acepta iguala **exactamente** el monto del creador.
- **Fondos:** viven como `Balance<SUI>` dentro de la partida desde que se crean hasta que se cancela o se
  resuelve. Conservación: lo que entra = lo que sale al ganador/creador + comisión.
- **Comisión:** `fee_rate` en basis points (máx. 1000 = 10 %), **por defecto 0**: el titular del `HouseCap`
  la fija con `update_fee_rate` tras publicar (#8), antes de anunciar el juego. Se calcula sobre el pozo al
  resolver, entra a `House.fees_collected` por `add_fees` (`public(package)`) y solo el titular del
  `HouseCap` la retira (`withdraw_fees`).
- **Estados:** `Pending → Active → Resolved` y `Pending → Cancelled`. Solo `Pending` se acepta o cancela;
  solo `Active` se resuelve.
- **Invitación directa:** si la partida tiene `opponent`, solo esa dirección puede aceptarla. Nadie juega
  contra sí mismo.
- **Cancelación:** solo el creador, solo en `Pending`; devuelve el 100 % (sin comisión).
- **Coinflip:** `sui::random` en una función `entry` no `public` (PROY-5). Quién puede disparar la
  resolución y qué pasa con una partida `Active` abandonada se define en el issue del Game module.
- **Admin:** las operaciones de la House requieren el `HouseCap` (`key` sin `store`); se pasa a otra wallet
  solo con `transfer_house_cap`, que emite `HouseCapTransferred`.

## 7. Gotchas Técnicos

- **Versionado de la House:** tras un upgrade y `migrate`, una función que escribe la House (o lee su
  configuración) desde un paquete viejo aborta con `EWrongVersion`; `version()` es la única lectura sin
  chequeo (`contracts/README.md`, Versionado).
- **Framework fijado por `Move.lock`:** `std`/`sui` son implícitas y el lock (regenerado por la CLI con
  `-e testnet`, nunca a mano) los pinea al SHA del piso de la PV de testnet vigente **al repinear**; la CLI no
  repinea ni avisa por sí sola (STATUS H13). Todo delta del lock en un diff se declara y justifica (PROY-11).
- **`sui move` sin `client.yaml` crea una clave:** si falta `~/.sui/sui_config/client.yaml`, la CLI
  ofrece crear la config y genera una clave cuya frase imprime; `-e` no lo evita (STATUS H11). Nunca
  correr `sui move` sin esa config sin claves, y siempre con `printf 'n\n' |` delante (§3).
- **Repo público:** nada de keystores (`~/.sui/sui_config/`), mnemonics ni direcciones privadas del owner
  con contexto sensible en commits, issues o logs.

## 8. API on-chain (mapa por módulo)

- **`battleship::house`** — `House` (shared: `version`, `fee_rate`, `fees_collected`, `min_bet`, `max_bet`),
  `HouseCap` (`key` sin `store`), `init` (comparte la House con valores por defecto y entrega el `HouseCap`
  al publicador); `entry` con `&HouseCap`: `update_fee_rate`, `update_bet_limits`, `transfer_house_cap`,
  `migrate`; `public withdraw_fees` (devuelve `Coin<SUI>`); `public(package) add_fees`; accessors
  `fee_rate`/`fees_collected`/`min_bet`/`max_bet` (validan versión) y `version`; eventos `FeeRateUpdated`,
  `BetLimitsUpdated`, `FeesWithdrawn`, `HouseCapTransferred`, `HouseMigrated`; abort codes 0–4. Tablas en
  `contracts/README.md`.
- **`battleship::game`** — no existe hasta #5 (el stub 2025 se retiró en #2). Objetivo: `create_game`, `accept_game`, `cancel_game`,
  `resolve_game` (coinflip) + eventos `GameCreated`/`GameAccepted`/`GameCancelled`/`GameResolved`.

## 9. Entidades Clave

`House` · `HouseCap` · `Game` (objeto compartido por partida: creador, oponente opcional, apuesta,
`Balance<SUI>`, estado, timestamps) · `GameState` · eventos de transición · (futuro, #18) `Board`/`Ship`/
`Coordinate` del borrador 2025 (`git show f063a0e:sources/battleship.move`).

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
| Sui CLI | `suiup` (`~/.local/bin`) | `1.83.0-16d2dc1e05ed`, release `testnet` (STATUS H1, Toolchain) |
| CI | `.github/workflows/ci.yml` (`ubuntu-24.04`) | Versión en `env` (`SUI_VERSION`/`SUI_COMMIT`) = la de STATUS; config sin claves en `$RUNNER_TEMP`; sin secretos |
| `client.yaml` | `~/.sui/sui_config/` | Sin claves hasta #8 (`active_env: testnet`, D-20261030-07). **Nunca** en el repo ni en logs |
| Keystore / direcciones | `~/.sui/sui_config/` | **Nunca** en el repo ni en logs |
| Node | nvm (20, 22 y 26 instalados) | Usar la de `.nvmrc` (`nvm use`) |
| Wallet de navegador | extensión de wallet Sui | Para smokes en testnet (owner) |

**Nunca** imprimir ni copiar mnemonics, claves privadas ni el contenido del keystore (SEG-3).

## 12. Deploy

- **Contratos:** `sui client publish` desde `contracts/` a testnet. Publicar, upgradear y custodiar el
  `UpgradeCap`/`HouseCap` es del **owner** (o del orquestador con autorización explícita por publicación).
  Tras publicar: `contracts/deployments/testnet.json` en el mismo PR.
- **Dirección publicadora:** recibe el `HouseCap` (`key` sin `store`, PROY-3). Si no es la wallet del
  navegador del panel admin (#14), el owner le pasa el cap con `transfer_house_cap` (no con "Send" de la
  wallet).
- **Post-publicación (#8):** la House nace con fee 0 (D-20261030-11); `update_fee_rate` antes de anunciar el
  juego, o las partidas creadas antes quedan con comisión 0 para siempre.
- **App:** hosting estático (por definir en el backlog).
- **Mainnet:** fuera de alcance sin decisión registrada.

## 13. Checklist pre-entrega

- [ ] Gate del área tocada en verde, con output pegado en el reporte (§3). Rojos conocidos sin delta.
- [ ] Contrato on-chain: si cambió una firma/struct/evento/abort code, tablas de `contracts/README.md` y
      módulo `app/src/sui/` actualizados en el mismo ciclo (§5).
- [ ] AuthZ por función: quién puede llamar (jugador, invitado, admin con `HouseCap`) y test del caso denegado.
      AuthZ por capability ⇒ el caso denegado se cubre verificando la custodia del cap, no con `expected_failure`.
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
| `contracts/README.md` | Contrato on-chain: tablas de funciones, eventos y abort codes, authZ, versionado y operación |
