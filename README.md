# Sui Battleship

Apuestas 1 vs 1 en Sui, resueltas por un coinflip on-chain.

> [!WARNING]
> Proyecto en **testnet**: los SUI de testnet no tienen valor real. El contrato **no tiene auditoría externa**.
> Mainnet está fuera de alcance. No uses una wallet con fondos reales.

## Qué es

Un juego de apuestas entre dos jugadores: uno crea una partida con su apuesta y otro la acepta igualándola. En este MVP
la batalla naval se simula con un coinflip de `sui::random`, que hace de placeholder. La mecánica real de batalla naval
se diseña en [#18](https://github.com/sdelvalle57/sui_battleship/issues/18). Cada jugador puede tener varias partidas
abiertas al mismo tiempo. No hay backend propio: la app habla directamente con la red de Sui y firma con la wallet del
navegador.

## Reglas del MVP

- **Crear:** una partida abierta a cualquiera o una invitación directa a una dirección. Nadie juega contra sí mismo.
- **Límites:** la apuesta va entre `min_bet` y `max_bet` de la House (por defecto 0,001 y 50 SUI). El admin los cambia
  y la app muestra los vigentes. Se aplican al crear ([límites de apuesta](contracts/README.md#límites-de-apuesta)).
- **Aceptar:** se iguala **exactamente** la apuesta del creador. En una invitación solo acepta el invitado. Aceptar y
  resolver el coinflip pasan en la misma transacción ([flujo de fondos](contracts/README.md#flujo-de-fondos)).
- **Comisión:** `fee = ⌊pozo × fee_rate / 10 000⌋`, con `pozo = 2 × apuesta`, redondeada hacia abajo (el resto va al
  ganador). Máximo 10 % (1000 bps). La partida copia la comisión vigente al crearse y el ganador recibe `pozo − fee`
  ([comisión](contracts/README.md#comisión)). En testnet: valor inicial de 200 bps (2 %),
  D-20261103-01 ([PR #48](https://github.com/sdelvalle57/sui_battleship/pull/48)); la vigente la muestra la app.
- **Cancelar y rechazar:** el creador cancela y el invitado rechaza, solo mientras la partida está pendiente. Vuelve el
  100 % al creador, sin comisión. Las partidas no expiran.
- **Estados:** pendiente → cancelada o resuelta, sin estado intermedio ([estados](contracts/README.md#estados)).
- **Costos:** cada transacción paga gas, y crear una partida deja un depósito de storage que no se recupera
  ([objeto terminal y storage](contracts/README.md#objeto-terminal-y-storage-d-20261030-15-d3)).

## Jugar en testnet

- **URL pública:** se completa después de #8.
- **Wallet:** Slush (la ofrece la app) o una wallet de navegador compatible con Sui, en la red **testnet**
  ([wallet](app/README.md#wallet)).
- **SUI de testnet:** el faucet oficial, [faucet.sui.io](https://faucet.sui.io/) (cómo obtenerlos en la
  [documentación de Sui](https://docs.sui.io/guides/developer/getting-started/get-coins)).
- **Recorrido:** el lobby lista las partidas abiertas; desde ahí se crea una partida, se acepta otra y se ve el
  resultado. "Mis partidas" (`#/my-games`) reúne las propias y las invitaciones recibidas, y deja abrir una partida por
  su ID ([mis partidas](app/README.md#mis-partidas-13)). Cada transacción enlaza al explorador (Suiscan).
- **Límite:** en testnet las listas cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento en
  [#51](https://github.com/sdelvalle57/sui_battleship/issues/51)). Una partida más vieja se abre por su enlace o su ID
  ([límite sin indexador](app/README.md#límite-sin-indexador)).
- **IDs de testnet** (`packageId`, `houseId`): en `contracts/deployments/testnet.json`; se completa después de #8.

## Arquitectura

```
Navegador (app React) ──wallet (firma)──▶ Sui fullnode (gRPC-web) ──▶ paquete battleship
        │                                                           ├─ house::House  (compartido, una)
        └── lecturas: SuiGrpcClient ◀───────────────────────────────┤─ game::Game    (compartido, uno por partida)
                                                                    └─ Random        (objeto del sistema)
```

- **`battleship::house`:** una única `House` compartida con la comisión, los límites de apuesta y las comisiones
  cobradas. La administra quien posee el `HouseCap` ([`battleship::house`](contracts/README.md#battleshiphouse)).
- **`battleship::game`:** cada partida es su propio objeto compartido `Game`, que guarda la apuesta hasta que se
  cancela, se rechaza o se resuelve. Sin módulo Escrow ([`battleship::game`](contracts/README.md#battleshipgame)).
- **App:** Vite + React + TypeScript. Lee la red con `SuiGrpcClient` (gRPC-web) y firma con el wallet kit de Mysten; las
  listas salen de los eventos del paquete ([`app/README.md`](app/README.md)).

Más detalle en [arquitectura de runtime](agents.md#4-arquitectura-de-runtime).

## Estructura del repo

```
sui_battleship/
├── contracts/            # paquete Move battleship: fuentes, tests y scripts de despliegue
├── app/                  # cliente web React (Vite + TypeScript)
├── documents/            # flujo de trabajo, estándares, decisiones y estado del proyecto
├── .github/workflows/    # CI: jobs de contratos y de la app
├── agents.md             # guía técnica del repo: layout, comandos, arquitectura y reglas
├── LICENSE               # Apache-2.0
└── package.json          # npm workspaces (+ package-lock.json, .npmrc y .nvmrc)
```

Layout completo en [repositorio](agents.md#2-repositorio-monorepo).

## Desarrollo local

### Requisitos

- **Node 26** (`.nvmrc`, `nvm use`) y npm 11, todo desde la raíz (npm workspaces). Con otra versión `npm ci` falla con
  `EBADENGINE`.
- **Sui CLI `1.83.0`**, la misma de la CI: `suiup install sui@testnet-1.83.0`, con
  [suiup](https://github.com/MystenLabs/suiup).
- **Aviso de la CLI:** sin `~/.sui/sui_config/client.yaml`, `sui move …` ofrece crear una config y genera una clave
  cuya frase imprime. Responde `n` o antepón `printf 'n\n' |` a cada comando `sui`.

### Contratos

```bash
cd contracts
printf 'n\n' | sui move build -e testnet
printf 'n\n' | sui move test -e testnet
```

El gate completo (lint, `--warnings-are-errors`, tests de los scripts y `Move.lock` intacto) está en
[comandos](agents.md#3-comandos-por-área-sin-makefile).

### App

```bash
npm ci
VITE_SUI_NETWORK=localnet npm run dev -w app
npm test -w app
```

El gate completo de la app está en [scripts](app/README.md#scripts) y en [app](agents.md#app-app).

### Localnet + app

**Siempre una localnet aislada** en un directorio propio (`<dir>`), nunca `sui start` a secas: reescribe
`~/.sui/sui_config/client.yaml`.

1. Génesis y arranque con `SUI_CONFIG_DIR=<dir>/net`, y publicación del paquete con el script, que escribe
   `contracts/deployments/localnet.json` ([uso en localnet](contracts/README.md#uso-en-localnet)).
2. `VITE_SUI_NETWORK=localnet npm run dev -w app`, con la wallet de desarrollo de la app
   ([localnet](app/README.md#localnet)).

El procedimiento de los agentes está en [localnet aislada](agents.md#localnet-aislada-smokes).

## Despliegue

Pendiente de TASK-3 (después de [#14](https://github.com/sdelvalle57/sui_battleship/issues/14) y
[#15](https://github.com/sdelvalle57/sui_battleship/issues/15)).

## Administración de la House

Pendiente de TASK-3 (después de [#14](https://github.com/sdelvalle57/sui_battleship/issues/14) y
[#15](https://github.com/sdelvalle57/sui_battleship/issues/15)).

## Roadmap

Pendiente de TASK-3 (después de [#14](https://github.com/sdelvalle57/sui_battleship/issues/14) y
[#15](https://github.com/sdelvalle57/sui_battleship/issues/15)).

## Documentación

El contrato on-chain (funciones, eventos, abort codes, autorización y despliegues) está en
[`contracts/README.md`](contracts/README.md), y la app (scripts, redes, capas y dependencias) en
[`app/README.md`](app/README.md). [`agents.md`](agents.md) es la guía técnica del repo, con el
[mapa de documentación](agents.md#14-mapa-de-documentación). En `documents/` viven el
[flujo de trabajo](documents/FLUJO_AGENTES.md), los [estándares](documents/ESTANDARES.md), las
[decisiones](documents/DECISIONES.md) y el [estado](documents/STATUS.md) del proyecto.

## Licencia

[Apache-2.0](LICENSE). Titular: `sdelvalle57`.
