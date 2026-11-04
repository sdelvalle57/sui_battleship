# contracts/ — paquete Move `battleship`

Referencia del contrato on-chain para quien lo consume sin leer el código Move: Game (#5, #6), la capa
`app/src/sui/` (#9, #11) y el panel admin (#14). Fuente canónica: `sources/*.move`; si esta tabla y el
código discrepan, manda el código y se corrige la tabla en el mismo PR (`agents.md` §5).

| Ruta | Contenido |
|---|---|
| `sources/house.move` | `battleship::house` |
| `sources/game.move` | `battleship::game` |
| `tests/house_tests.move` | Suite de `battleship::house` (`sui::test_scenario`) |
| `tests/game_tests.move` | Suite de `battleship::game` (`sui::test_scenario`) |
| `scripts/publish.mjs` | Publicación con guardas, `record` y `check` de los despliegues (#7, ver "Despliegues") |
| `scripts/deployment.mjs` | Formato de `deployments/<red>.json`: funciones puras que usan el script y la CI |
| `scripts/*.test.mjs`, `scripts/fixtures/` | Tests (`node --test`) y salidas reales de la CLI 1.83.0 en una localnet desechable |
| `deployments/<red>.json`, `Published.toml` | Datos de cada publicación (testnet desde #8) |
| `fixtures/game-reads.localnet.json` | Lecturas gRPC reales de cada variante de `Game` y de sus eventos, capturadas en una localnet desechable con `app/scripts/capture-read-fixtures.mjs` (#10, ver "Lectura desde la app") |
| `fixtures/game-tx.localnet.json` | Transacciones reales de crear, cancelar, rechazar (#11) y aceptar (#12): éxitos (con cada ganador y sobre una invitación), dos fallos `MoveAbort` ejecutados y 11 `SimulationError` de simulaciones sin firmar, y el objeto House, capturados en una localnet desechable con `app/scripts/capture-tx-fixtures.mjs` (ver "Lectura desde la app") |
| `fixtures/house-admin.localnet.json` | Panel de la House (#14): listado real del `HouseCap` por tipo (`listOwnedObjects`), su `getObject`, 4 `SimulationError` de `house`/0, 1, 1, 2 y la preflight sin el cap, las transacciones de admin ejecutadas (`update_fee_rate`, `update_bet_limits`, `withdraw_fees` + `TransferObjects`) y la House después del retiro, capturados en una localnet desechable con `app/scripts/capture-house-fixtures.mjs` (ver "Lectura desde la app") |

**Gates (build, lint, test, coverage):** forma canónica en `agents.md` §3 (desde `contracts/`, con
`-e testnet` y `printf 'n\n' |` delante). Baselines vigentes en `documents/STATUS.md`.

## `battleship::house`

Una única `House` compartida guarda la comisión, los límites de apuesta y las comisiones cobradas. La
administra quien posee el `HouseCap`.

### Objetos

| Struct | Habilidades | Campos | Nota |
|---|---|---|---|
| `House` | `key` (compartido) | `id: UID`, `version: u64`, `fee_rate: u16`, `fees_collected: Balance<SUI>`, `min_bet: u64`, `max_bet: u64` | Invariantes: `fee_rate <= 1000`, `0 < min_bet <= max_bet` |
| `HouseCap` | `key` (sin `store`) | `id: UID` | Capability de admin |
| `HOUSE` | `drop` | — | One-time witness (crea el `Publisher`) |

Valores con los que nace la House (constantes del módulo):

| Constante | Valor | Significado |
|---|---|---|
| `VERSION` | `1` | Versión del paquete que puede leer la configuración y escribir la House |
| `MAX_FEE_BPS` | `1000` | Comisión máxima (10 %) |
| `DEFAULT_FEE_BPS` | `0` | Comisión inicial (ver "Fee por defecto 0") |
| `DEFAULT_MIN_BET` | `1_000_000` MIST | 0,001 SUI |
| `DEFAULT_MAX_BET` | `50_000_000_000` MIST | 50 SUI |

### Funciones

| Firma | Visibilidad | Quién puede llamar | Abort codes | Evento |
|---|---|---|---|---|
| `init(otw: HOUSE, ctx: &mut TxContext)` | privada | runtime, al publicar | — | — (comparte la `House`, envía el `HouseCap` y el `Publisher` al publicador) |
| `update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16)` | `entry` | titular del `HouseCap` | `EWrongVersion` (3), `EFeeTooHigh` (0) | `FeeRateUpdated` |
| `update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64)` | `entry` | titular del `HouseCap` | `EWrongVersion` (3), `EInvalidBetLimits` (1) | `BetLimitsUpdated` |
| `transfer_house_cap(cap: HouseCap, recipient: address)` | `entry` | titular del `HouseCap` (por valor) | — | `HouseCapTransferred` |
| `migrate(house: &mut House, _: &HouseCap)` | `entry` | titular del `HouseCap` | `ENotUpgrade` (4) | `HouseMigrated` |
| `withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI>` | `public` | titular del `HouseCap` | `EWrongVersion` (3), `ENoFeesToWithdraw` (2) | `FeesWithdrawn` |
| `add_fees(house: &mut House, fees: Balance<SUI>)` | `public(package)` | solo módulos de `battleship` (`game::accept_game`, en el cobro) | `EWrongVersion` (3) | — (acepta valor 0) |
| `fee_rate(house: &House): u16` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `fees_collected(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `min_bet(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `max_bet(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `version(house: &House): u64` | `public` | cualquiera | — | — (lectura de diagnóstico **sin** chequeo de versión). El panel de #14 muestra el campo `version` del objeto ("Versión de la House"), leído del BCS; la app no replica `VERSION`, así que una House de otra versión se ve recién como `house`/3 al operar |

En las funciones con `EWrongVersion`, el chequeo de versión va **antes** que cualquier otro: con una versión
que no coincide, el abort es siempre `EWrongVersion`, aunque otro argumento también sea inválido. Los montos
están en MIST y la comisión en basis points (1 bp = 0,01 %).

### Eventos

Todos `has copy, drop`; tipo completo `<packageId>::house::<Evento>`.

| Evento | Campos | Emite |
|---|---|---|
| `FeeRateUpdated` | `house_id: ID`, `old_fee_rate: u16`, `new_fee_rate: u16` | `update_fee_rate` |
| `BetLimitsUpdated` | `house_id: ID`, `old_min_bet: u64`, `old_max_bet: u64`, `new_min_bet: u64`, `new_max_bet: u64` | `update_bet_limits` |
| `FeesWithdrawn` | `house_id: ID`, `amount: u64` | `withdraw_fees` |
| `HouseCapTransferred` | `cap_id: ID`, `recipient: address` | `transfer_house_cap` |
| `HouseMigrated` | `house_id: ID`, `old_version: u64`, `new_version: u64` | `migrate` |

### Abort codes

Números estables (D-20261030-11 §5): un código publicado no cambia de número ni de significado. Espejo implementado
en `app/src/sui/errors.ts` (#11): `ABORT_MESSAGES` da un mensaje en español por **módulo + código**, con el sufijo
`(código <módulo>/<n>)` (mensajes y fallbacks: `app/README.md`, "Transacciones (#11)"). Un código nuevo se agrega
aquí y en `ABORT_MESSAGES` en el mismo PR (`agents.md` §5).

| Código | Constante | Condición | Funciones |
|---|---|---|---|
| 0 | `EFeeTooHigh` | `new_fee_rate > MAX_FEE_BPS` (1000) | `update_fee_rate` |
| 1 | `EInvalidBetLimits` | `min_bet == 0` o `min_bet > max_bet` | `update_bet_limits` |
| 2 | `ENoFeesToWithdraw` | `fees_collected == 0` | `withdraw_fees` |
| 3 | `EWrongVersion` | `house.version != VERSION` | `update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `add_fees`, `fee_rate`, `fees_collected`, `min_bet`, `max_bet` |
| 4 | `ENotUpgrade` | `migrate` con `house.version >= VERSION` | `migrate` |

### Autorización

- La authZ de admin es la **posesión del `HouseCap`**: no hay campo `admin` ni comparación con
  `ctx.sender()`. Quien tiene el cap lo pasa por referencia a la función.
- El cap se transfiere **solo** con `transfer_house_cap`, no con el "Send" de la wallet: no tiene `store`, así
  que `public_transfer` no aplica, y por eso tampoco se puede congelar, compartir, envolver ni vender.
- Traza del titular: el `HouseCap` sale de los efectos de la publicación (`init`) y cada cambio de manos
  emite `HouseCapTransferred`.
- En los tests, el caso denegado no se expresa con `expected_failure` (sin el cap la llamada no compila ni
  se arma como transacción): se cubre verificando la custodia del cap antes y después de transferirlo y que
  el nuevo titular administra.

### Qué pasa si se pierde el cap

Sin `HouseCap`, las comisiones quedan **bloqueadas** y la configuración **congelada para siempre**. El caso
probable es enviarlo a un **ID de objeto** (por ejemplo, el de la House) en vez de a una dirección: queda
huérfano, porque solo `house` podría recibirlo (`transfer::receive`) y no lo expone. La app (#14) **no** transfiere el
cap (N-1): `transfer_house_cap` sigue siendo solo por CLI, igual que `migrate`. Checklist de quien lo use:

- [ ] El destinatario es una **dirección de cuenta** válida (`0x` + 64 hex), no un ID de objeto. Comprobarlo con
  `printf 'n\n' | SUI_CONFIG_DIR=<su dir> sui client object <destino>`, que tiene que fallar porque no existe un objeto con ese ID.
- [ ] La dirección se verificó **dos veces** contra la de la wallet que va a administrar (la que muestra el título de
  `.account-badge` en la app). Es irreversible.
- [ ] Si el destino es una wallet de navegador nueva, primero se conecta en la app y se toma su dirección. Después de
  transferir, `printf 'n\n' | SUI_CONFIG_DIR=<su dir> sui client object <HOUSE_CAP_ID> --json` muestra el dueño nuevo, y en `#/admin` aparece el panel
  (si dice "Sin permisos", "Volver a comprobar": el índice puede ir unos cientos de ms atrás).
- [ ] La dirección publicadora también tiene el `UpgradeCap` y el `Publisher`: importarla en una wallet de navegador
  los expone a la extensión; la alternativa es `transfer_house_cap` a la wallet del panel. Decisión del owner (N-3).
  En testnet, D-20261104-06, decidido el 2026-11-04: el cap se queda en la publicadora («lo dejo»).

### Fee por defecto 0 (D-20261030-11)

La House nace con `fee_rate = 0`. Como el `Game` copia el fee al crearse (D-20261030-06 §3), las partidas
creadas antes del primer `update_fee_rate` quedan con comisión 0 para siempre.
**Paso obligatorio post-publicación (#8):** el owner llama `update_fee_rate` antes de anunciar el juego.
En testnet, 200 bps desde la publicación (D-20261103-01, tx `BVQfjBbaCFw5tnTsY8CrpaCYGrBRHPZJrXFR2ZMX3Tqw`).

### Retiro de comisiones

`withdraw_fees` devuelve un `Coin<SUI>` (sin `drop`): la transacción decide el destino, y `sui client call`
sola falla por valor sin usar. Se usa en un PTB. Ejemplo (lo ejecuta el owner, nunca un agente):

```bash
sui client ptb --move-call <PKG>::house::withdraw_fees @<HOUSE_ID> @<CAP_ID> --assign fees --transfer-objects "[fees]" @<DESTINO>
```

El `Coin` vale exactamente `fees_collected` antes del retiro y la House queda en 0. Las comisiones solo
entran por `add_fees` y solo salen por `withdraw_fees`.

### Límites de apuesta

`min_bet`/`max_bet` solo se aplican al **crear** una partida (#5). Cambiarlos con `update_bet_limits` no
afecta a las partidas `Pending` existentes, y aceptar solo exige igualar el monto exacto del creador
(D-20261030-06 §1).

### Versionado (D-20261030-11 §7)

- Tras un upgrade, toda versión anterior del paquete sigue siendo invocable. La House guarda `version`, y las
  funciones que la escriben (`update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `add_fees`) **y** los
  accessors `fee_rate`, `fees_collected`, `min_bet` y `max_bet` exigen `version == VERSION` (`EWrongVersion`,
  chequeado antes que cualquier otro argumento). `version()` no valida (diagnóstico).
- Tras un upgrade que sube `VERSION`, el titular del cap llama al `migrate` de la **versión nueva**. Desde ahí
  el código de las versiones viejas no puede escribir ni leer la configuración de la House, y el `migrate`
  de un paquete viejo aborta con `ENotUpgrade` (no se migra hacia atrás). En la v1, `migrate` siempre aborta:
  la House nace en `VERSION`.
- `transfer_house_cap` no recibe la House y queda fuera del versionado.
- **Procedimiento de upgrade** (lo extiende el issue de upgrades; el formato de despliegue ya lo soporta): `sui client
  upgrade` → `migrate` de inmediato con el `HouseCap` → `deployments/testnet.json` actualizado en el **mismo PR** →
  la app usa el paquete nuevo. Entre el `migrate` y el deploy de la app, crear y aceptar partidas desde la app vieja
  aborta con `EWrongVersion` (cancelar y rechazar siguen funcionando: no leen la versión).
- **Modelo de confianza del `UpgradeCap` (D-20261103-01 (1)).** Su titular es de confianza total: un upgrade compatible
  puede agregar funciones que muevan el `stake` de toda partida `Pending` y las comisiones de la House. Las políticas
  `additive` y `dep_only` no lo impiden (permiten funciones nuevas); solo `make_immutable` lo cierra. Restricciones
  permanentes desde la primera publicación: (a) `cancel_game` y `reject_game` de la v1 se pueden invocar para siempre
  (no leen la versión), así que toda versión nueva mantiene `stake` como **única** custodia de fondos del `Game`, porque
  un fondo guardado en otro lado (p. ej. en dynamic fields) quedaría huérfano al cancelar desde la v1; (b) `Game`,
  `House` y `HouseCap` nunca podrán tener `store`, ni `GameState` variantes nuevas; (c) la política del cap se revisa
  antes de cualquier mainnet.

### Contención

`update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `migrate` y `add_fees` (llamado por cada
`accept_game`) toman `&mut House`: las resoluciones de partidas se serializan sobre la House. Aceptable en
el MVP.

### ID de la House

El ID de la House (y el del `HouseCap`) sale de los efectos de la publicación y lo registra el script en
`contracts/deployments/<red>.json`: ver "Despliegues" al final. La app lo lee desde ahí (`agents.md` §5); el contrato
no expone un accessor de ID (dentro del paquete, `object::id(house)`).

## `battleship::game`

Cada partida es su **propio objeto compartido** `Game` (PROY-6): guarda la apuesta del creador como
`Balance<SUI>` (sin módulo Escrow, D-20261030-15 D4) hasta que la partida se cancela, se rechaza o se
resuelve. Crear, cancelar y rechazar llegaron en #5; aceptar con el coinflip (`accept_game`), en #6.

### Objetos

| Tipo | Habilidades | Campos / variantes | Nota |
|---|---|---|---|
| `Game` | `key` (compartido, sin `store`) | `id: UID`, `version: u64`, `house_id: ID`, `creator: address`, `opponent: Option<address>`, `bet: u64`, `stake: Balance<SUI>`, `fee_rate: u16`, `state: GameState` | Solo este módulo lo comparte; nadie lo transfiere, envuelve ni congela. Invariantes: `stake == bet` en `Pending`, `stake == 0` en `Cancelled`/`Resolved` (PROY-8); `bet` no cambia nunca |
| `GameState` | `copy, drop, store` (enum `public`) | `Pending`, `Cancelled`, `Resolved { acceptor: address, winner: address }` | Solo `game` lo construye o hace `match`. `Resolved` lo construye `accept_game` |

Significado de los campos de `Game`:

| Campo | Significado |
|---|---|
| `version` | Versión del paquete que creó la partida (`house.version()` al crear). Solo `accept_game` la compara; ningún camino de reembolso la lee (ver Versionado del `Game`) |
| `house_id` | House contra la que se liquida la partida; `accept_game` exige esta (`EWrongHouse`) |
| `opponent` | `none` = partida abierta; `some(a)` = invitación directa a `a` |
| `bet` | Apuesta en MIST, fija durante toda la vida del objeto |
| `stake` | Fondos custodiados: igual a `bet` mientras está `Pending`; 0 al terminar |
| `fee_rate` | Comisión en basis points copiada de la House al crear (D-20261030-06 §3); es la que cobra `accept_game` |

Sin campos de tiempo (D-20261030-15 D6): la hora de creación es la de la transacción que emitió `GameCreated` (`timestampMs` de `getTransaction`; ver "Lectura desde la app").

### Estados

Sin estado `Active` y **sin expiración** (D-20261030-06 §1-§2): `accept_game` acepta y resuelve en la misma
transacción.

```mermaid
stateDiagram-v2
    [*] --> Pending: create_game
    Pending --> Cancelled: cancel_game (creador) o reject_game (invitado)
    Pending --> Resolved: accept_game (atómico con el coinflip)
    Cancelled --> [*]
    Resolved --> [*]
```

### Funciones

| Firma | Visibilidad | Quién puede llamar | Abort codes, **en este orden** | Evento |
|---|---|---|---|---|
| `create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext)` | `entry` | cualquiera (no puede invitarse a sí mismo) | `house::EWrongVersion` (3, módulo `house`), `EBetTooLow` (0), `EBetTooHigh` (1), `ESelfInvite` (2) | `GameCreated` |
| `cancel_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo `game.creator` | `ENotCreator` (3), `ENotPending` (4) | `GameCancelled` (`cancelled_by` = creador) |
| `reject_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo la dirección de `game.opponent` | `ENoInvitation` (6), `ENotInvited` (5), `ENotPending` (4) | `GameCancelled` (`cancelled_by` = invitado) |
| `accept_game(game: &mut Game, house: &mut House, payment: Coin<SUI>, r: &Random, ctx: &mut TxContext)` | `entry` | cualquiera menos `game.creator`; en una invitación, solo la dirección de `game.opponent` | `EVersionMismatch` (7), `EWrongHouse` (8), `ESelfPlay` (9), `ENotInvited` (5), `ENotPending` (4), `EWrongStake` (10), `house::EWrongVersion` (3, módulo `house`, en el cobro) | `GameResolved` |
| `refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext)` | privada | `cancel_game` y `reject_game` | — | `GameCancelled` |
| `is_pending(game: &Game): bool` | privada | `cancel_game`, `reject_game` y `accept_game` | — | — |
| `assert_acceptable(game: &Game, house: &House, payment: &Coin<SUI>, acceptor: address)` | privada | `accept_game` (antes del sorteo) | `EVersionMismatch` (7), `EWrongHouse` (8), `ESelfPlay` (9), `ENotInvited` (5), `ENotPending` (4), `EWrongStake` (10) | — |
| `collect_pot(game: &mut Game, house: &mut House, payment: Coin<SUI>): (Balance<SUI>, u64, u64)` | privada | `accept_game` (antes del sorteo) | `house::EWrongVersion` (3, en `house::add_fees`) | — (une las dos apuestas, envía la comisión a la House y devuelve `(pago, pozo, comisión)`) |
| `pay_winner(game: &mut Game, payout: Balance<SUI>, pot: u64, fee: u64, acceptor: address, winner_index: u64, ctx: &mut TxContext)` | privada | `accept_game` (después del sorteo) | — | `GameResolved` (marca `Resolved` y transfiere el pago al ganador) |
| `fee_amount(pot: u64, fee_rate: u16): u64` | privada | `collect_pot` | — | — (`⌊pot × fee_rate / 10_000⌋` con intermedio `u128`) |

- **Crear:** las lecturas de la House con chequeo de versión (`min_bet`, `max_bet`, `fee_rate`) van **primero**:
  con la House en otra versión el abort es siempre `house::EWrongVersion`, aunque la apuesta también sea
  inválida. Después, la apuesta (`EBetTooLow`, `EBetTooHigh`) y por último la autoinvitación (`ESelfInvite`).
  La apuesta es el valor **entero** del `Coin` recibido; los límites se comparan inclusive
  (`min_bet <= bet <= max_bet`).
- **Cancelar y rechazar:** **authZ antes que estado**. Un tercero recibe siempre `ENotCreator`/`ENotInvited`,
  aunque la partida ya no esté `Pending` (no aprende su estado: denegar por defecto). En rechazar, una partida
  abierta da `ENoInvitation` antes que cualquier otro chequeo.
- **Aceptar:** **versión y House primero**: si `game.version != house.version()` el abort es siempre
  `EVersionMismatch`, y después, si la House no es la de la partida, `EWrongHouse`. Luego **authZ antes que
  estado**: el creador recibe siempre `ESelfPlay` (también sobre su propia invitación) y un tercero sobre una
  invitación ajena `ENotInvited`, aunque la partida ya no esté `Pending`. Después el estado (`ENotPending`) y por
  último el monto: el `Coin` debe valer **exactamente** `bet` (`EWrongStake`, ni más ni menos). El **cobro de la
  comisión** (`house::add_fees`, que valida la versión de la House) va **antes del sorteo**; **tras el sorteo
  nada que dependa del resultado puede abortar** (los límites globales de la transacción y el gas afectan igual a
  ambos caminos).
- Las cuatro funciones son `entry` (no `public`, D-20261030-15 D8 y D-20261030-16 D5): no se componen desde
  otro paquete; se llaman desde transacciones (PTB). En `accept_game` es además obligatorio por recibir `Random`
  (ver Aleatoriedad).

### Eventos

Todos `has copy, drop`; tipo completo `<packageId>::game::<Evento>`.

| Evento | Campos | Emite |
|---|---|---|
| `GameCreated` | `game_id: ID`, `creator: address`, `opponent: Option<address>`, `bet: u64`, `fee_rate: u16` | `create_game` |
| `GameCancelled` | `game_id: ID`, `creator: address`, `cancelled_by: address`, `refund: u64` | `cancel_game` (`cancelled_by` = creador) y `reject_game` (`cancelled_by` = invitado) |
| `GameResolved` | `game_id: ID`, `creator: address`, `acceptor: address`, `winner: address`, `pot: u64`, `fee: u64`, `payout: u64` | `accept_game` (`pot == payout + fee`; `winner` es `creator` o `acceptor`) |

Aceptar emite un solo evento (D-20261030-16 D4): la aceptación y la resolución son la misma transacción. Las
listas de la app (partidas abiertas, mis partidas, invitaciones) salen de estos eventos (PROY-6); el estado
vigente de cada partida se lee del objeto.

### Abort codes

Números estables (D-20261030-11 §5): un código publicado no cambia de número ni de significado. Espejo implementado
en `app/src/sui/errors.ts` (#11): `ABORT_MESSAGES` da un mensaje en español por **módulo + código**, con el sufijo
`(código <módulo>/<n>)` (mensajes y fallbacks: `app/README.md`, "Transacciones (#11)"). Un código nuevo se agrega
aquí y en `ABORT_MESSAGES` en el mismo PR (`agents.md` §5).

| Código | Constante | Condición | Funciones |
|---|---|---|---|
| 0 | `EBetTooLow` | valor del `stake` < `house.min_bet()` | `create_game` |
| 1 | `EBetTooHigh` | valor del `stake` > `house.max_bet()` | `create_game` |
| 2 | `ESelfInvite` | `opponent == some(sender)` | `create_game` |
| 3 | `ENotCreator` | `sender != game.creator` | `cancel_game` |
| 4 | `ENotPending` | estado de la partida distinto de `Pending` | `cancel_game`, `reject_game`, `accept_game` |
| 5 | `ENotInvited` | `game.opponent == some(a)` y `sender != a` | `reject_game`, `accept_game` |
| 6 | `ENoInvitation` | rechazo de una partida abierta (`opponent == none`) | `reject_game` |
| 7 | `EVersionMismatch` | `game.version != house.version()` | `accept_game` |
| 8 | `EWrongHouse` | `object::id(house) != game.house_id` | `accept_game` |
| 9 | `ESelfPlay` | `sender == game.creator` | `accept_game` |
| 10 | `EWrongStake` | valor del pago `!= game.bet` | `accept_game` |

`create_game` y `accept_game` también abortan con **`house::EWrongVersion` (3, del módulo `house`)**: en
`create_game`, en las lecturas de la House (el primer chequeo); en `accept_game`, en el cobro (`add_fees` dentro
de `collect_pot`), después de todos los chequeos propios y antes del sorteo (ver Versionado del `Game`). El
número 3 existe en los dos módulos con significados distintos (`house::EWrongVersion`, `game::ENotCreator`): la app
mapea los aborts por **módulo + código**, nunca solo por número (`errors.ts`, con test de `house`/3 ≠ `game`/3).

### Autorización

- Sin capability: la authZ de partidas es la comparación de `ctx.sender()` con la dirección guardada (SEG-2).
  `create_game`: cualquiera, salvo invitarse a sí mismo. `cancel_game`: solo `game.creator`.
  `reject_game`: solo la dirección de `game.opponent`; el creador no puede rechazar su propia invitación
  (`ENotInvited`), pero sí cancelarla. `accept_game`: cualquiera salvo `game.creator` (`ESelfPlay`); en una
  invitación, solo la dirección de `game.opponent` (`ENotInvited`). Nadie juega contra sí mismo.
- Cada denegación tiene su test `expected_failure` en `tests/game_tests.move`.

### Flujo de fondos

- **Crear:** el `Coin<SUI>` entero pasa a `stake: Balance<SUI>` (`stake == bet`). No hay vuelto: el PTB
  separa antes el monto exacto.
- **Cancelar y rechazar:** `withdraw_all` del `stake` → un `Coin` por el total → **siempre a `game.creator`**
  (nunca al invitado). **100 %, sin comisión**; la House no se recibe ni se toca (`fees_collected` no cambia).
  La partida queda `Cancelled` con `stake == 0`.
- **Aceptar:** el `Coin` del aceptante (exactamente `bet`) se une al `stake` en un pozo de `2 × bet`. **Antes del
  sorteo**, la comisión (`fee`) entra a la House por `add_fees`; **después**, el ganador recibe un `Coin` por
  `payout = pot − fee`. Invariante: `payout + fee == 2 × bet`, `fees_collected` sube exactamente `fee`,
  `stake == 0` y estado `Resolved { acceptor, winner }`. Si la transacción aborta o el runtime la cancela,
  revierte entera: el aceptante conserva su `Coin` y la partida sigue `Pending`.
- Sin creación ni destrucción de valor; todo camino que recibe fondos tiene salida (cancelar, rechazar o
  aceptar). Conservación verificada en los tests (`Coin` de cada actor y `fees_collected` de la House, con ambos
  resultados del coinflip y varias partidas).

### Carreras

El consenso ordena las transacciones sobre el mismo `Game` compartido (el creador cancela o el invitado rechaza
mientras alguien acepta, o dos aceptantes a la vez). La primera gana; la segunda aborta con `ENotPending` (o con
su error de authZ, `ENotCreator`/`ENotInvited`/`ESelfPlay`, si además no está autorizada) y, al revertirse, no
pierde su `Coin`: una transacción abortada solo paga gas.

### Comisión

- El `fee_rate` de la House se **copia al crear** (D-20261030-06 §3): un `update_fee_rate` posterior no cambia
  las partidas existentes. Ver "Fee por defecto 0" en la sección House.
- **Fórmula:** `fee = ⌊pot × fee_rate / 10_000⌋` (`fee_rate` en basis points) con intermedio **`u128`**: con un
  `max_bet` alto, `pot × fee_rate` desborda `u64` (SEG-6).
- **Base:** el **pozo completo** (`2 × bet`, D-20261030-16 D3); el ganador recibe `pozo − comisión`.
- **Redondeo:** hacia abajo (D-20261030-16 D2): el resto de la división queda para el ganador y la House nunca
  cobra más que el porcentaje anunciado.
- `add_fees` se llama **siempre**, también con comisión 0 (por ejemplo, con el fee por defecto): su chequeo de
  versión aborta antes del sorteo, nunca después.
- Ejemplos: `bet` = 10 SUI con 250 bps → pozo 20 SUI, comisión 0,5 SUI, pago 19,5 SUI; `bet = 1_000_001` MIST con
  250 bps → pozo `2_000_002`, comisión `⌊50_000,05⌋ = 50_000`, pago `1_950_002`.

### Aleatoriedad (D-20261030-16 D6, SEG-5)

- `accept_game` es `entry` **no** `public`: otro paquete no puede componerla y abortar cuando pierde. El lint
  `public_random` del compilador marca toda función `public` que reciba `Random` o `RandomGenerator`, y con
  `--warnings-are-errors` corta el build.
- `Random` es el objeto compartido de sistema `0x8` y llega como `&Random`. El `RandomGenerator` se crea
  **dentro** de `accept_game` (`r.new_generator(ctx)`); nunca se recibe como parámetro.
- Sorteo **por índice, sin ramas**: `generate_u8_in_range(0, 1)` elige `[creador, aceptante][índice]`. Ambos
  resultados ejecutan el mismo cambio de estado, el mismo evento y la misma transferencia, así que gastan lo
  mismo: quien firma no puede elegir un presupuesto de gas que solo alcance para ganar.
- Orden: **validar → cobrar la comisión → sortear → pagar**. Todo lo que puede abortar va **antes** del sorteo;
  después, nada que dependa del resultado puede abortar (los límites globales de la transacción y el gas afectan
  igual a ambos caminos).
- Tests: helpers de test de `sui::random` (`create_for_testing` y `update_randomness_state_for_testing`, con
  sender `@0x0`), ambos resultados con el `Random` real y semillas fijas, y el reparto con el ganador forzado
  (`accept_with_winner_for_testing`, `#[test_only]`).

### Cancelaciones del runtime

Una transacción de `accept_game` puede no ejecutarse aunque el contrato no aborte:

- `ExecutionCancelledDueToRandomnessUnavailable`: la DKG de aleatoriedad de la época todavía no terminó (por
  ejemplo, recién arrancada la red o al cambiar de época).
- `ExecutionCancelledDueToSharedObjectCongestion`: demasiadas transacciones sobre un objeto compartido mutable (aquí,
  `&mut House`).

Ambas llegan como `effects.status = failure` con ese `kind` y **sin** `MoveAbort`
(`crates/sui-types/src/execution_status.rs:259, 270-271` @ `testnet-v1.83.0`); la partida y los fondos apostados
no cambian. La app (#12) las reconoce en `runtimeCancellation` de `app/src/sui/errors.ts`: la congestión por el
`$kind` `CongestedObjects` del SDK, y la falta de aleatoriedad por un `$kind` `Unknown` cuyo texto es el nombre de la
variante o el texto Rust ("randomness could not be generated", sin distinguir mayúsculas). Muestra un texto neutro
respecto de la acción, nunca éxito ni error del contrato (SEG-10): "La red canceló la transacción sin ejecutarla (la
aleatoriedad de la red todavía no está disponible | hay congestión en un objeto compartido): no cambió nada salvo el
costo de red; intenta de nuevo en unos segundos". El reintento es el mismo botón. En las capturas de #12 no se observó
ninguna (aceptaciones a 5,8 s y 8,2 s del arranque de la localnet).

### Versionado del `Game` (D-20261030-15 DV)

- `version = house.version()` al crear; como las lecturas previas de la House ya validaron la versión, es
  igual a `house::VERSION` del paquete que crea.
- **Cancelar y rechazar no reciben la House ni leen la versión** (invariante D-20261030-12 §4): un reembolso
  nunca queda bloqueado por un upgrade; funcionan en cualquier versión.
- `accept_game` compara `game.version` con `house.version()` (`EVersionMismatch`, su primer chequeo) y cobra con
  `house::add_fees`, que exige que la House esté en el `VERSION` del código que se ejecuta. Tras un upgrade:
  1. **Partida vieja, código nuevo** (partida creada antes del `migrate`, House migrada) → `EVersionMismatch`
     (7): solo se cancela o rechaza, salvo que la versión nueva decida aceptarla.
  2. **House migrada, código viejo** (la misma partida vieja, llamada desde el paquete viejo) →
     `EVersionMismatch` (7): el chequeo de la partida va antes que el cobro.
  3. **Código viejo con partida nueva** (partida y House en la versión nueva, llamada desde el paquete viejo) →
     pasa los chequeos y aborta con `house::EWrongVersion` (3) en el cobro, antes del sorteo.
- Tras `migrate`, `create_game` del paquete viejo aborta con `house::EWrongVersion`.
- `GameState` y el layout de `Game` se **congelan en #8** (un upgrade compatible no agrega variantes al enum
  ni campos al struct): la batalla naval real (#18) necesitará un objeto nuevo o dynamic fields.

### Contención

`accept_game` toma `&mut House` (cobra la comisión): las aceptaciones de todas las partidas se serializan sobre
la House (aceptable en el MVP; ver Contención en la sección House). `Random` es un input compartido inmutable.

### Objeto terminal y storage (D-20261030-15 D3)

La partida terminada se **conserva** como objeto compartido (`Cancelled`/`Resolved`, `stake == 0`): no hay
función de borrado. Crearla deposita storage que **no se recupera**. Medido en el smoke de #6 (localnet, precio de
storage 76 y rebate 99,99 %, iguales a testnet): `storageRebate` del `Game` = **1953200 MIST** abierta, **2196400**
con invitación y **2439600** resuelta desde abierta (≈ 2682800 desde invitación, por cálculo; sin medir) (≈ 0,0020–0,0027 SUI); la cancelada conserva el de su versión `Pending`. Al
aceptar, quien firma cobra el rebate de la versión `Pending` del objeto y paga el de la versión `Resolved`, así que
el depósito sigue inmovilizado en el objeto terminal. Es reversible en una versión futura con una función de borrado
**restringida al creador** (`sender == creator`), porque el rebate de storage va a quien firma la transacción que
borra. La UI lo muestra al crear (#11): una nota previa con lo medido aquí (`GAME_STORAGE_DEPOSIT_MIST` de
`app/src/sui/createGame.ts`: 1953200 abierta, 2196400 con invitación) y, tras el éxito, el costo real de red de la
transacción (cómputo + storage − rebate de `effects.gasUsed`).

### PTB

- **Crear:** `splitCoins(gas, [monto])` y `create_game(house, coin, opción)` con el `Coin` resultante;
  `opponent` es un `Option<address>` **puro** (`none` para una partida abierta, `some(dirección)` para una
  invitación). El builder vive en `app/src/sui/transactions/game.ts` (#11), igual que los de cancelar y rechazar.
- **Cancelar / rechazar:** `cancel_game(game)` o `reject_game(game)` con el `Game` compartido; el reembolso
  llega al creador sin pasos extra en el PTB.
- **Aceptar:** `splitCoins(gas, [bet])` y `accept_game(game, house, coin, random)` con el `Coin` resultante; en
  TypeScript, el `Random` es `tx.object.random()` (objeto `0x8`). **Después del comando que usa `Random` solo se
  admiten `TransferObjects` o `MergeCoins`**: con cualquier otro, la transacción se rechaza antes de ejecutarse
  (`crates/sui-types/src/transaction.rs:1732-1760` @ `testnet-v1.83.0`). Los comandos previos, como el
  `splitCoins`, sí se permiten. El pago llega al ganador sin pasos extra. Desde la CLI:

  ```bash
  sui client ptb --split-coins gas "[<BET>]" --assign c --move-call <PKG>::game::accept_game @<GAME_ID> @<HOUSE_ID> c.0 @0x8
  ```

### Lectura desde la app

- La partida se lee del objeto con su contenido: todos los campos llegan por RPC aunque no haya getters Move (no
  hay accessors `public` a propósito, PROY-4; agregarlos después es compatible con upgrade).
- **API de lectura: `SuiGrpcClient` (gRPC-web) de `@mysten/sui`** (D-20261102-02 (1)). El fullnode de `sui 1.83.0`
  **no sirve JSON-RPC** (H-1 del smoke de #6: todo `POST` al puerto RPC devuelve `404`; `sui-node` monta ahí solo
  `sui_rpc_api::RpcService`, `crates/sui-node/src/lib.rs:2956-3054` @ `testnet-v1.83.0`).
- **Formato de la app = BCS** (#10, DL-1): el `Game` sale de `content` de `getObjects` y cada evento de `bcs` de
  `listEvents`, con esquemas que replican el layout Move (`Game` = `id`, `version: u64`, `house_id`, `creator`,
  `opponent: Option<address>`, `bet: u64`, `stake` (`Balance` = `u64`), `fee_rate: u16`, `state`; `GameState` =
  `Pending` (0) \| `Cancelled` (1) \| `Resolved { acceptor, winner }` (2)). El parser exige el tipo exacto
  (`<originalPackageId>::game::Game`, dueño `Shared`), re-serializa y **compara los bytes**: `bcs` lanza ante una variante
  desconocida o bytes truncados, pero acepta bytes sobrantes sin error. El `json` del nodo es solo referencia: el SDK
  advierte que su forma puede variar entre fullnodes.
- **Fixtures reales:** `contracts/fixtures/game-reads.localnet.json` (5 variantes de objeto —`pendingOpen`,
  `pendingInvite`, `cancelledByCreator`, `cancelledByInvitee`, `resolved`—, sus 5 eventos, `transactions` y una página
  cruda de `ListEvents`). Guarda `content`/`bcs` en base64 y el `json`; los eventos van **sin** `sender`. Las direcciones e
  IDs son de cuentas efímeras de una génesis desechable (sin claves). Forma del `json` de gRPC de un `Game` (extracto de
  `pendingOpen`):

  ```json
  { "bet": "1000001", "creator": "0x…", "fee_rate": 250, "house_id": "0x…", "id": "0x…", "opponent": null,
    "stake": "1000001", "state": { "@variant": "Pending" }, "version": "1" }
  ```

  `u64` como string, `u16` como número, `Balance` aplanado a su valor, `Option` como `null` o la dirección y el enum
  como `{"@variant": "Resolved", "acceptor": "0x…", "winner": "0x…"}`. En los eventos, igual.
- **Recaptura:** dentro de la localnet aislada (`agents.md` §3, publicación variante B y las transacciones de partidas),
  con Node 26 (prefijo de `agents.md` §3, "App (`app/`)"): `node app/scripts/capture-read-fixtures.mjs` desde `<repo>`. El script solo
  acepta `http://127.0.0.1:9000` (con otra `--url` sale con error antes de cualquier pedido), exige que el chain id del
  nodo coincida con `contracts/deployments/localnet.json` y es determinista: dos corridas sobre la misma red dan el mismo
  archivo salvo `_meta.capturedAt`. Un cambio de la fixture al recapturar se declara en el PR.
- **Fixture de transacciones (#11, aceptar en #12):** `contracts/fixtures/game-tx.localnet.json` = `ids` (paquete, House
  y partidas: `open`, `invite`, `cancelled`, `rejected`, `acc1`, `accInvite` y las de las tres aceptaciones), `house` (el
  objeto, `content` en base64; tras las aceptaciones, con `fees_collected` > 0), `simulationErrors` (11 casos
  `{ sender: <rol>, message, executionError }` del `SimulationError` real de `build({ client })`: `game` 0 a 6 de crear,
  cancelar y rechazar, y de aceptar `acceptSelfPlay` (`game`/9), `acceptNotInvited` (`game`/5), `acceptNotPending`
  (`game`/4) y `acceptWrongStake` (`game`/10); los de aceptar abortan en `assert_acceptable`), `executed`
  (`getTransaction` con efectos, eventos y `objectTypes` de crear abierta, crear invitación, cancelar, rechazar, del
  `cancel_game` fallido (`cancelNotCreatorExecuted`, `game`/3) y de aceptar: `acceptCreatorWins`, `acceptAcceptorWins`,
  `acceptInvite` y el `accept_game` fallido (`acceptNotPendingExecuted`, `game`/4); `effects.bcs` y `bcs` de eventos en
  base64, sin `sender` ni `signatures`) y `cliErrorText` (el texto Rust del abort **del nodo**: `description` del error
  por gRPC, igual al `effects.status.error` de `sui client tx-block`; no es la línea con que la CLI presenta el error al
  ejecutar, "… aborted within function … with code N", que la app no reconoce porque nunca le llega). Una sección
  `runtimeCancelled` existe solo si una captura observó `ExecutionCancelledDueToRandomnessUnavailable` (en #12 no
  ocurrió). Las simulaciones no firman (`setSender` de una cuenta de la génesis); las direcciones de los datos son de
  cuentas efímeras (sin claves). **Roles** (los casos llevan el rol, nunca la dirección): `A` crea todas las partidas;
  `B` es el invitado de `G_INV` y `G_REJ` y el que acepta; `C` es un tercero (el script lo toma como sender del
  `accept_game` fallido); `ADMIN` publicó y tiene la `HouseCap`. Las cuatro tienen que ser cuentas distintas.
- **Recaptura de la fixture de transacciones:** dentro de la localnet aislada (génesis nueva, publicación variante B),
  después de estas transacciones por CLI, **en este orden** (`A`, `B` y `C` no hacen nada antes: `createOpen` tiene que
  ser la primera transacción de `A`, con la moneda de gas de la génesis, porque los tests de la app usan su costo):
  1. `ADMIN`: `update_fee_rate` 250;
  2. `A` crea `G_OPEN` abierta (1000001) **primero** y `G_INV` invitando a `B` (2000002);
  3. `A` crea `G_CANCEL` **abierta** (3000003) y la cancela; `A` crea `G_REJ` invitando a `B` (4000004) y `B` la
     rechaza;
  4. `B` llama `cancel_game` sobre `G_OPEN` con `--gas-budget 100000000` ⇒ fallo ejecutado `game`/3;
  5. `A` crea `G_ACC1..n` abiertas (1000001) y `B` las acepta una por una hasta tener un ganador `A` y un ganador `B`
     (tope 8);
  6. `A` crea `G_ACCINV` invitando a `B` (1000001) y `B` la acepta;
  7. `C` acepta `G_ACC1` (ya resuelta) con `--gas-budget 100000000` ⇒ fallo ejecutado `game`/4.

  Después, con el mismo prefijo de Node 26: `node app/scripts/capture-tx-fixtures.mjs` desde `<repo>`. Comparte la
  guarda con el script de #10 (`app/scripts/localnet-guard.mjs`: sin SDK ni red en el nivel superior; con otra `--url`
  sale con código 2 antes de cualquier pedido) y es determinista igual (solo cambia `_meta.capturedAt`). Selección (por
  orden de creación): `G_OPEN` = primera abierta pendiente, `G_INV` = primera invitación pendiente, `G_CANCEL` = primera
  **abierta** cancelada por su creador, `G_REJ` = primera rechazada por su invitado, `G_ACC1` = primera abierta resuelta;
  `acceptCreatorWins`/`acceptAcceptorWins` = primera `GameResolved` de una abierta con `winner` = creador/aceptante y
  `acceptInvite` = primera `GameResolved` de una invitación. Los fallos ejecutados se encuentran como la última
  transacción sobre `G_OPEN` y sobre `G_ACC1`: nada debe tocar esas partidas después. El script aborta con un mensaje
  claro si falta una partida (también si la única cancelada por su creador es una invitación), si faltan los dos
  ganadores, si el último fallo sobre `G_ACC1` no es `game`/4 o si `A`, `B`, `C` y `ADMIN` no son cuatro cuentas
  distintas.
- **Panel de la House (#14):**
  - **Detección:** el `HouseCap` se detecta **por tipo** entre los objetos de la cuenta,
    `listOwnedObjects({ owner, type: <originalPackageId>::house::HouseCap })`, sin `houseCapId` en la config; la regla
    de certeza está en `app/README.md`, "Panel de la House (#14)".
  - **Antes de cada acción,** la app relee el cap por ID (`getObject`) para confirmar el dueño.
  - **Lo que lee:** el BCS de `HouseCap` es solo el `UID`. Los eventos de admin (`FeeRateUpdated`, `BetLimitsUpdated`,
    `FeesWithdrawn`) se leen con su BCS exacto y el `house_id` de la config.
  - **Fixture:** `contracts/fixtures/house-admin.localnet.json` (`_meta`, `ids`, `houseCapListing`, `houseCapObject`,
    `simulationErrors` con `sender` por rol, `executed` sin `sender` ni `signatures`, `house`).
  - **Recaptura:** dentro de la localnet aislada (génesis nueva, variante B), después de estas transacciones por CLI,
    **en este orden** y con el cap en `ADMIN` todo el tiempo:
    1. `ADMIN`: `update_fee_rate` 250;
    2. `ADMIN`: `update_bet_limits` 2000000 10000000000;
    3. `A` crea una partida abierta de 200000000;
    4. `B` la acepta (comisión 10000000);
    5. `ADMIN`: `withdraw_fees` + `TransferObjects` a sí mismo en una PTB
       (`suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$HOUSE_CAP --assign fees --transfer-objects "[fees]" @$ADMIN`).

    Ninguna transacción más (ni `transfer_house_cap`). Después, con el prefijo de Node 26:
    `node app/scripts/capture-house-fixtures.mjs` desde `<repo>`.
  - **Qué exige el script:**
    - la misma guarda (código 2 ante otra `--url`, antes de cualquier pedido);
    - deriva los roles on-chain (`ADMIN` = dueño del cap, `A` = creador, `B` = aceptante) y aborta si no son tres
      cuentas distintas, si falta o sobra una transacción de admin, si no las firmó el dueño del cap o si la House no
      quedó en 0;
    - es determinista (solo cambia `_meta.capturedAt`).
- **Listas (lobby, #10):** las partidas se descubren por eventos con `eventType` = `<originalPackageId>::game::<Evento>`
  (dirección **completa**: con `0x3` corto el nodo responde `INVALID_ARGUMENT`). En el fullnode público, `listEvents` del
  SDK (sin rango) falla con `OUT_OF_RANGE` ("requested data below earliest available"): el historial está podado
  (≈ 14,6 días, medido en #10; `lowestAvailableCheckpoint` de `getServiceInfo`). Por eso el lobby usa el crudo
  `client.ledgerService.listEvents` descendente con `startCheckpoint` = máx(checkpoint de la publicación, piso + margen)
  (#10, D-20261102-04): el escaneo termina con `QueryEndReason.CHECKPOINT_BOUND` al
  llegar a la cota, sin eventos anteriores.
- **Listas de "Mis partidas" (#13):** dos fuentes sobre el mismo `ListEvents` crudo (`app/src/sui/eventScan.ts`):
  - **actividad propia:** el filtro del nodo es una DNF (`terms[]` en OR de `literals[]` en AND, con `negated` y
    predicados `sender`, `emitModule`, `eventType` y `eventStreamHead`; sin filtro por campo del evento):
    `[sender = cuenta ∧ eventType = GameCreated] ∨ [sender = cuenta ∧ eventType = GameResolved]`. Vale porque
    `GameCreated` lo emite el creador y `GameResolved` el aceptante (`ctx.sender()` en los dos). La app igual verifica
    `creator`/`acceptor` en el contenido del evento y no pide `sender` en el `readMask`;
  - **invitaciones recibidas:** el escaneo de todos los `GameCreated` (como el lobby) con `opponent == cuenta` en el
    cliente, porque no hay filtro por `opponent`. Un `GameCancelled` no hace falta: el estado vigente sale del objeto.
  - **Medido en la localnet aislada** (`sui` 1.83.0, TASK-1 de #13; el fullnode público de testnet, `sui-node` 1.83.1, ya
    lo había dado en el plan):
    - S-1: la DNF filtra por remitente. La cuenta que creó 3 partidas recibe sus 3 `GameCreated` y no el `GameResolved`
      que firmó otra; una dirección sin actividad recibe 0 eventos y `CHECKPOINT_BOUND`;
    - S-2: con `limit` 5 y `before` = último `watermark.cursor`, los 12 `GameCreated` de un solo PTB (mismo digest,
      `event_index` 0..11) salen 5 + 5 + 2, sin repetidos ni faltantes, también sin filtro de `sender`;
    - con exactamente `limit` eventos restantes, el pedido termina en `ITEM_LIMIT` y el siguiente llega vacío con
      `CHECKPOINT_BOUND` (fin normal);
    - `object.version` es una versión Lamport (4 → 415 al aceptar; compartida por los objetos de una misma
      transacción): solo se compara entre lecturas del mismo objeto.
  - **Límite:** en testnet cubren solo la ventana del fullnode (≈ 14,6 días, D-20261103-03): ver `app/README.md`, "Mis
    partidas (#13)" → "Límite sin indexador" (seguimiento en #51).
- El parser de #10 usa **un** formato y trata una variante desconocida como error, nunca como `Pending` (SEG-10).
- El resultado de aceptar se lee del evento `GameResolved` de la transacción o del objeto
  (`Resolved { acceptor, winner }`).
- La hora de creación es el timestamp de la transacción del evento `GameCreated` (D-20261030-15 D6):
  `client.getTransaction({ digest })` → `timestampMs` (hora del checkpoint, en ms; `null` si aún no está en un
  checkpoint). `listEvents` **no** trae hora: cada evento trae `transactionDigest` y `checkpoint`.
- `previousTransaction` del objeto es la **última transacción que lo tocó**, también una **fallida**: un `cancel_game`
  que aborta con `ENotPending` sobre una partida resuelta sube la versión del objeto y pasa a ser su
  `previousTransaction` (sonda P6 de #10; la fixture `resolved` lo muestra). Por eso el detalle lo llama "Última
  actividad".

## Despliegues (#7)

Un archivo por red en `contracts/deployments/<red>.json`: `localnet.json` (ignorado por git) y `testnet.json` (commiteado
en #8). Lo escribe **solo** `scripts/publish.mjs` (nunca a mano), con `JSON.stringify(obj, null, 2)` y salto de
línea final, a partir de la salida de la misma transacción de publicación (D-20261102-01). El script exige el Node de
`.nvmrc` (26): con otra versión sale con 1 y un mensaje (#8).

**Testnet:** publicado el 2026-11-04 (#8) desde `26f2676`,
`packageId` `0x8b7873ec06f9173d43aa6c1f093040e5237967ad2aaecece0a32070587856f51`.
IDs completos en `deployments/testnet.json`.

### Esquema (`schemaVersion: 1`)

Ejemplo con IDs **ficticios**:

```json
{
  "schemaVersion": 1,
  "network": "testnet",
  "chainId": "4c78adac",
  "packageId": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "originalPackageId": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "packageVersion": 1,
  "upgradeCapId": "0x2222222222222222222222222222222222222222222222222222222222222222",
  "houseId": "0x3333333333333333333333333333333333333333333333333333333333333333",
  "houseCapId": "0x4444444444444444444444444444444444444444444444444444444444444444",
  "publishTxDigest": "11111111111111111111111111111111",
  "publishTimestamp": "2026-11-05T14:03:12.345Z",
  "sourceCommit": "5555555555555555555555555555555555555555",
  "suiCliVersion": "1.83.0-16d2dc1e05ed",
  "frameworkRev": "05ad86a3e86c522deea116f80dc2bf2309a53363"
}
```

| Campo | Formato | Significado y origen | Describe |
|---|---|---|---|
| `schemaVersion` | entero, `1` | Versión de este esquema | — |
| `network` | `"localnet"` \| `"testnet"` | Red; igual al nombre del archivo | — |
| `chainId` | 8 hex | `.hex` de `sui client --json chain-identifier`. testnet ⇒ `4c78adac`; una localnet nunca puede tener el de testnet ni el de mainnet (`35834a8a`) | la red |
| `packageId` | `0x` + 64 hex | Última versión del paquete (= `published-at` de `Published.toml`); target de las llamadas | versión vigente |
| `originalPackageId` | `0x` + 64 hex | Paquete original (= `original-id`); en la primera publicación = `packageId`. Prefijo de los **tipos** (eventos, `HouseCap`) | publicación original |
| `packageVersion` | entero ≥ 1 | Versión del objeto paquete (= `version` de `Published.toml`); no es `house::VERSION` | versión vigente |
| `upgradeCapId` | `0x` + 64 hex | `0x2::package::UpgradeCap` creado al publicar (= `upgrade-capability`) | publicación original |
| `houseId` | `0x` + 64 hex | `house::House` compartida creada en `init` | publicación original |
| `houseCapId` | `0x` + 64 hex | `house::HouseCap` creado en `init`; el ID no cambia aunque el cap cambie de manos | publicación original |
| `publishTxDigest` | base58 (32-44) | Digest de la transacción de publicación | publicación original |
| `publishTimestamp` | ISO 8601 UTC con ms y `Z` | `timestampMs` de la transacción (hora de la red). No confundir con `published-at` de `Published.toml`, que es una dirección | publicación original |
| `sourceCommit` | 40 hex o `null` | `git rev-parse HEAD` al publicar; `null` solo en localnet con el árbol sucio | versión vigente |
| `suiCliVersion` | texto | `sui --version` sin el prefijo `sui ` | versión vigente |
| `frameworkRev` | 40 hex | `rev` de `[pinned.testnet.Sui]` en `Move.lock` al publicar (STATUS H13) | versión vigente |

"Describe": **publicación original** no cambia nunca; **versión vigente** es la del código en `packageId` (en la v1
coinciden; un upgrade reescribe estos campos y agrega el opcional `packageTxDigest`).

**Qué no va, y por qué:** ninguna dirección de cuenta (publicador, dueño del `HouseCap`/`UpgradeCap`), ni claves ni
frases (SEG-3): el script ignora `sender`/`owner` de la salida de la CLI y un test lo verifica. La dirección del
publicador es visible on-chain (desde el digest o el `HouseCap`); sacarla del repo es higiene, no secreto. Tampoco:
el `Publisher`, `0x8` (`Random`, igual en todas las redes), `initialSharedVersion` de la House (lo resuelve el SDK) ni
estado on-chain (comisión, límites, `version` de la House).

**Compatibilidad:**

1. Los 14 campos de la v1 son **obligatorios**; el script y `check` rechazan uno faltante, con formato inválido o
   una clave desconocida.
2. Los campos posteriores a la v1 son **opcionales** (se validan solo si aparecen y se registran en el validador y en
   esta tabla en el mismo PR). Hacer obligatorio un campo nuevo, renombrar, quitar o cambiar un significado ⇒
   `schemaVersion: 2` + STOP.
3. Los consumidores (la app, #9) validan lo que usan, rechazan `schemaVersion` ≠ 1 e **ignoran claves desconocidas**.
4. Contrato de formato para la app: `scripts/fixtures/localnet.deployment.json` (real, generado con `record`).

### `Published.toml` como fuente y `check` de la CI

`sui client publish` escribe `contracts/Published.toml` (`[published.<env>]` con `chain-id`, `published-at`,
`original-id`, `version`, `upgrade-capability`, …; sin direcciones de cuentas ni rutas). Se commitea: la CLI lo usa
para upgrades y para impedir una doble publicación. Es la **fuente** de los datos del paquete; el json se deriva.
`node scripts/publish.mjs check` (step del job `contracts` de la CI) falla si un json es inválido, si su nombre no es
su `network`, si una red no-localnet no tiene su `[published.<red>]` (o al revés) o si `packageId`, `originalPackageId`,
`packageVersion`, `upgradeCapId` o `chainId` no coinciden con `Published.toml`. `localnet` no se cruza (lo publica
`test-publish`, que escribe un `Pub.*.toml` efímero, no `Published.toml`).

### Uso en localnet

- **Siempre una localnet aislada en un directorio propio**, nunca `sui start` a secas ni `--force-regenesis` sin
  `SUI_CONFIG_DIR` (reescribirían `~/.sui/sui_config/client.yaml`); nada en `~/.sui/`. Variante corta para humanos:

  ```bash
  SUI_CONFIG_DIR=<dir>/net sui genesis --working-dir <dir>/net
  SUI_CONFIG_DIR=<dir>/net sui start --network.config <dir>/net      # en otra terminal
  ```

  Agentes: el procedimiento completo de `agents.md` §3 ("Localnet aislada (smokes)").
- Publicación con el script, desde `contracts/` y con un `--pubfile-path` **nuevo por génesis** (uno de otra génesis
  hace fallar a la CLI):

  ```bash
  SUI_CONFIG_DIR=<dir>/net node scripts/publish.mjs publish --network localnet --pubfile-path <dir>/Pub.localnet.toml [--out <ruta>] [--dry-run]
  ```

  `SUI_CONFIG_DIR=<dir>/net` va con ruta absoluta: el script rechaza una relativa (guarda de config).

  Sin `--out` escribe `contracts/deployments/localnet.json` (ignorado por git). `--out` existe solo para localnet
  (smokes); en testnet el script lo rechaza (#39). En localnet se usa
  `sui client test-publish --build-env testnet`: el manifest no declara un entorno localnet y `publish` no puede.

### Uso en testnet (solo el owner)

Publicado el 2026-11-04 (#8). Una republicación sigue este runbook bajo D-20261103-01 (2), con la operación previa
que registra esa decisión.

Ningún agente corre este camino, ni con `--dry-run` (D-20261102-03). No admite `--out` ni `--pubfile-path`: el json va
siempre a `deployments/testnet.json`, el que `check` cruza con `[published.testnet]`. Lo corre **solo el owner**, en su
terminal (bash o zsh, con `jq`), desde su clon del repo. Nada de lo que imprime la CLI se pega en el repo, en issues ni
en chats, salvo los digests y los IDs públicos que imprime el script. Placeholders: `<repo>` (raíz del clon), `<su dir>`
(su config propia), `<branch>` y `<head>` (la branch del PR y el SHA con la CI en verde que le pasa el orquestador).

**Modelo de confianza.** La dirección publicadora recibe el `HouseCap`, el `UpgradeCap` y el `Publisher`. Quien tiene el
`UpgradeCap` es de confianza total: puede publicar código que mueva el `stake` de las partidas `Pending` y las comisiones
(ver "Versionado" → "Modelo de confianza del `UpgradeCap`"). Ninguno de los tres se usa ni se transfiere fuera de un
procedimiento documentado; el `HouseCap` solo se mueve con `transfer_house_cap`, nunca con "Send" de la wallet.

#### 0. Config propia (una vez)

- La config vive en un `SUI_CONFIG_DIR` **absoluto y fuera de `~/.sui/`**, con la clave del owner y un env de alias
  exactamente `testnet` (RPC `https://fullnode.testnet.sui.io:443`) como env activo. La dirección activa es la
  **publicadora**: recibe el `HouseCap`, el `UpgradeCap` y el `Publisher`. Cómo llega el `HouseCap` a la wallet del
  navegador del panel admin (#14, `#/admin`) es decisión del owner (N-3): importar la publicadora en esa wallet (expone
  también el `UpgradeCap` y el `Publisher` a la extensión) o, después de verificar la custodia (paso 8), pasarle el cap
  con `transfer_house_cap` por CLI, con el checklist de "Qué pasa si se pierde el cap". En la publicación del
  2026-11-04, el `HouseCap` quedó en la publicadora (N-3: «lo dejo», D-20261104-06). Cómo crea o importa la clave es manejo
  personal del owner: la frase de recuperación nunca sale de su terminal.
- **Siempre `export SUI_CONFIG_DIR=<su dir>` antes de cualquier `sui client …` o `sui keytool …`.** Sin ese export la CLI
  usa `~/.sui/sui_config/`, que queda **sin claves para siempre** (D-20261030-07): un `new-address` o un `import` ahí
  dejaría una clave al alcance de los agentes.
- El script exige esa config (absoluta, con `client.yaml`, con su `realpath` fuera de `~/.sui`). Si no puede inspeccionar
  una ruta (permisos, symlinks en bucle), aborta con el código del error (`EACCES`, `ELOOP`), nunca con la ruta.

#### 1. Shell de publicación

```bash
cd <repo> && git switch <branch> && git pull --ff-only
git status --porcelain                  # vacío, también sin archivos sin trackear
git log -1 --format=%H                  # = <head> (será el sourceCommit del json)
test ! -e contracts/deployments/localnet.json || rm contracts/deployments/localnet.json   # resto de un smoke viejo
nvm use && node --version               # v26.x; con otra versión el script sale con 1
export SUI_CONFIG_DIR=<su dir>          # solo en esta shell
case "$(realpath -m "$SUI_CONFIG_DIR")/" in "$(realpath -m ~/.sui)"/*) echo "ABORTA: config dentro de ~/.sui";; *) echo "config fuera de ~/.sui";; esac
suio() { printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client "$@"; }
printf 'n\n' | sui --version            # sui 1.83.0-16d2dc1e05ed (= SUI_VERSION/SUI_COMMIT de ci.yml)
suio active-env                         # testnet
suio active-address                     # la dirección de su wallet; no se pega
suio gas                                # saldo; no se pega
```

`suio` es la única forma de llamar a `sui client` en este runbook: sin el `export` aborta antes de invocar `sui` (nunca
cae en `~/.sui/`), y en una shell nueva ni siquiera existe. La línea `case` debe imprimir `config fuera de ~/.sui`:
`suio` solo comprueba que la variable esté definida, y las llamadas de los pasos 6-10 no pasan por la guarda del
script. Con `ABORTA`, no se sigue. Un `contracts/deployments/localnet.json` que haya quedado de un smoke viejo pertenece
a una génesis ya borrada y git lo ignora: se borra, porque si no el paso 5 vería otra salida de `git status` y `check`
contaría 2 despliegues. Saldo necesario: el gas que estime el paso 3 más ≈ 0,05 SUI para la comisión y el smoke. El SUI
de testnet sale del faucet web vigente.

#### 2. Versión de protocolo, justo antes de publicar (STATUS H13)

```bash
curl -fsSL -X POST -H 'content-type: application/json' \
  -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' \
  https://graphql.testnet.sui.io/graphql | jq '.data.epoch'
```

`protocolVersion` debe ser la PV del framework de `Move.lock` (`documents/STATUS.md` → Toolchain → Framework). Si es
mayor: **no publicar** y avisar al orquestador. Antes hay que subir la CLI a un release `testnet` cuya PV máxima la
cubra (`ci.yml`, tests y fixtures de `scripts/`), repinear el lock, re-medir los gates y repetir el ensayo en la localnet
aislada, todo en un PR. El dry run no lo detecta: la CLI solo avisa con más de 2 versiones de diferencia.

#### 3. Dry run

```bash
cd contracts
node scripts/publish.mjs publish --network testnet --dry-run; echo "exit=$?"
```

Éxito = la línea **`Dry run ok. Gas estimado: N MIST.`** y `exit=0`; cualquier otra salida es un fallo y no se sigue.
Sin `printf` delante de `node`: el script ya le responde `n` a la CLI, y la confirmación del paso 4 necesita la
terminal. Comprueba el env activo y el chain id, la CLI contra `ci.yml`, el árbol limpio, que no haya una publicación
previa y que el dry run no cambie `Move.lock`.

#### 4. Publicación

```bash
node scripts/publish.mjs publish --network testnet
```

Repite las guardas y el dry run y pide escribir `testnet` (freno contra accidentes; la autorización es la del owner,
D-20261030-09). Imprime los 14 campos, el directorio temporal (`battleship-publish-*`, `0700`) y el bloque "Siguiente
paso obligatorio" con dos comandos: el `update_fee_rate` con 200 (paso 6) y la lectura de la House (paso 7), los dos con
el mismo prefijo que `suio`. Ante cualquier error: "Recuperación" (nunca reintentar sin buscar el digest). Después, en
la misma shell:

```bash
D=<directorio temporal que imprimió el script>
PKG="$(jq -r .packageId deployments/testnet.json)"; HOUSE="$(jq -r .houseId deployments/testnet.json)"
CAP="$(jq -r .houseCapId deployments/testnet.json)"; UCAP="$(jq -r .upgradeCapId deployments/testnet.json)"
```

#### 5. Archivos esperados

```bash
git status --porcelain
node scripts/publish.mjs check
```

`git status` debe dar **exactamente** `?? contracts/Published.toml` y `?? contracts/deployments/`, y `check` debe dar
`1 despliegue(s) válidos y coherentes con Published.toml`. Ante cualquier otro cambio (p. ej. ` M contracts/Move.lock`):
STOP; se avisa al orquestador sin commitear ni editar nada. Esto vale porque el paso 1 ya borró cualquier
`localnet.json` viejo. Si aun así aparece, git lista `?? contracts/deployments/testnet.json` en vez de la carpeta y
`check` cuenta 2: no es un STOP; se borra `contracts/deployments/localnet.json` y se repite este paso.

#### 6. Comisión: 200 bps, antes de cualquier partida (D-20261103-01)

```bash
suio call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 200 --json > "$D/fee.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/fee.json"
jq '.events[] | select(.type | endswith("::house::FeeRateUpdated")) | .parsedJson' "$D/fee.json"
```

`exit=0`, digest y `success`; `old_fee_rate` 0 y `new_fee_rate` 200 (la CLI muestra los `u16` como `0.0`/`200.0`). Es el
primer comando del bloque "Siguiente paso obligatorio" que imprimió el script en el paso 4: el mismo `call`, con el
prefijo de `suio` escrito entero, los IDs ya puestos y `200`. Aquí va con `suio`, las variables del paso 4 y `--json`,
para guardar la salida en `$D` y leer el evento. Se corre **una sola vez**, este o el impreso: una segunda corrida
emitiría otro `FeeRateUpdated` (200 → 200) y el `old_fee_rate` esperado ya no sería 0. Una partida creada antes de este
paso quedaría con comisión 0 para siempre (D-20261030-11).

#### 7. House

```bash
suio object "$HOUSE" --json > "$D/house.json"
jq '{type: .objType, owner: .owner, content: .content}' "$D/house.json"
```

`owner` `{"Shared": {"initial_shared_version": N}}`; en `content`, `fee_rate` `200.0`, `min_bet` `"1000000"`, `max_bet`
`"50000000000"`, `version` `"1"` y `fees_collected` `"0"` (formas exactas de la CLI 1.83, ensayadas en #8). Es la misma
lectura que la línea "Verificación" del bloque del script.

#### 8. Custodia, sin pegar la dirección

```bash
A="$(suio active-address)"
PUB="$(jq -r '.objectChanges[] | select(.objectType == "0x2::package::Publisher") | .objectId' "$D/publish-output.json")"
for id in "$CAP" "$UCAP" "$PUB"; do suio object "$id" --json | jq -r --arg a "$A" '[.objType, (.owner.AddressOwner == $a)] | @tsv'; done
```

Tres líneas (`<PKG>::house::HouseCap`, `0x0000…0002::package::UpgradeCap`, `0x0000…0002::package::Publisher`), cada una
con `true`. `suio object` escribe la dirección `0x2` larga (64 hex) en `objType`, mientras que `objectChanges` de la
publicación usa `0x2::…`, que es la forma que filtra la línea de `PUB`. Se entrega solo "sí/no" por objeto.

#### 9. Smoke: crear con `min_bet`

```bash
suio ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::create_game" @"$HOUSE" c.0 none --json > "$D/smoke-create.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/smoke-create.json"
jq '.events[] | select(.type | endswith("::game::GameCreated")) | .parsedJson | {bet, fee_rate, opponent}' "$D/smoke-create.json"
GAME="$(jq -r '.objectChanges[] | select(.type == "created" and (.objectType | endswith("::game::Game"))) | .objectId' "$D/smoke-create.json")"
```

`success`; `bet` `"1000000"`, **`fee_rate` `200.0`** (prueba que la partida copió la comisión nueva) y `opponent` `null`.

#### 10. Smoke: cancelar

```bash
suio call --package "$PKG" --module game --function cancel_game --args "$GAME" --json > "$D/smoke-cancel.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/smoke-cancel.json"
jq '.events[] | select(.type | endswith("::game::GameCancelled")) | .parsedJson | {refund, by_creator: (.cancelled_by == .creator)}' "$D/smoke-cancel.json"
suio object "$GAME" --json | jq '{state: .content.state, stake: .content.stake}'
```

`success`; `refund` `"1000000"` y `by_creator` `true`; `state` `{"@variant": "Cancelled"}` (así escribe la CLI 1.83 un
enum) y `stake` `"0"`.

#### 11. Entrega al orquestador

- `contracts/deployments/testnet.json` y `contracts/Published.toml` **sin editar ni commitear**: los commitea el
  orquestador en la branch del PR. Si publicó desde otro clon, se los pasa tal cual.
- Los digests de publicación (`publishTxDigest`), comisión, crear y cancelar (son públicos).
- "sí/no" de la custodia (paso 8) y la PV y la época medidas en el paso 2.
- Nada más: ni la salida de la CLI ni el contenido de `$D`, que traen la dirección.

#### 12. Cierre

- Después de publicar, la branch no se rebasea ni se squashea: el `sourceCommit` del json tiene que seguir existiendo en
  `master` (merge commit, D-20261030-09).
- Recién con la CI del PR en verde (`check` incluido): `rm -rf` de los dos `battleship-publish-*`, el del dry run y el de
  la publicación. Hasta entonces sirven para `record` ("Recuperación").

El script guarda en la config activa el cache `chain_id` del env (efecto de `chain-identifier`; inocuo y siempre en la
config propia, nunca en `~/.sui/`).

### Recuperación (nunca reintentar sin mirar el digest)

Antes de invocar la publicación, el script crea un directorio temporal (`0700`) con `meta.json` (red, chain id,
commit, CLI, `frameworkRev`) y guarda ahí la salida cruda (`publish-output.json`, `publish-stderr.txt`, `0600`). Si
la CLI falla, el script imprime ese directorio, el digest si la CLI lo reporta (en stderr o en su salida `--json`), el
stderr con las direcciones y la ruta de la config ocultas (`<SUI_CONFIG_DIR>`: el valor de `SUI_CONFIG_DIR` y su ruta
real; otra ruta que cite la CLI, p. ej. la del keystore en `client.yaml`, no se oculta) y la ruta del archivo con el motivo de
la CLI, que se revisa ahí y no se pega (puede traer la dirección del publicador). Nunca imprime el stdout. **No se
reintenta sin buscar antes el digest** (en el mensaje o en el explorador): una segunda publicación crea otro paquete.

- Si la transacción existe y solo falló el registro: `record` rearma el json **sin republicar** (`record --network
  testnet` tampoco admite `--out`):

  ```bash
  node scripts/publish.mjs record --network testnet --from <dir>/publish-output.json
  ```

  Si la salida no está en el directorio del script, el **owner** la obtiene con su config y la respuesta `n` (misma
  forma que la salida de la publicación) y pasa `--meta`:

  ```bash
  printf 'n\n' | SUI_CONFIG_DIR=<su dir> sui client --json tx-block <digest> > <dir>/tx-block.json
  node scripts/publish.mjs record --network testnet --from <dir>/tx-block.json --meta <dir>/meta.json
  ```

  Solo el owner: un agente no corre `tx-block` fuera de la localnet aislada (`agents.md` §3, B4).
- Sin `meta.json`, `record` exige los cuatro valores de la publicación, nunca derivados del estado actual del repo:
  `--source-commit <sha>`, `--sui-cli-version <versión>`, `--framework-rev <sha>` y `--chain-id <hex>` (testnet:
  `4c78adac`). Si existe `meta.json`, se usa y los flags se ignoran.
- Si falta `Published.toml` tras una publicación en testnet, reconstruirlo es STOP de #8.

### Tests

```bash
cd contracts && node --test scripts/*.test.mjs && node scripts/publish.mjs check     # Node 26 (.nvmrc)
```

Los fixtures de `contracts/scripts/fixtures/` son el stdout crudo de una localnet aislada y desechable. Contienen la
dirección y la firma de una cuenta efímera de la génesis, sin valor y con la clave destruida. Al recapturarlos (por
ejemplo al subir la CLI) se usa siempre el procedimiento de `agents.md` §3; nunca salida de testnet ni de una cuenta
del owner.
