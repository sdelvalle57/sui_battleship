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
| `add_fees(house: &mut House, fees: Balance<SUI>)` | `public(package)` | solo módulos de `battleship` (Game, #6) | `EWrongVersion` (3) | — (acepta valor 0) |
| `fee_rate(house: &House): u16` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `fees_collected(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `min_bet(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `max_bet(house: &House): u64` | `public` | cualquiera | `EWrongVersion` (3) | — |
| `version(house: &House): u64` | `public` | cualquiera | — | — (lectura de diagnóstico **sin** chequeo de versión: el panel #14 la usa para detectar una House que no coincide con el paquete) |

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

Números estables (D-20261030-11 §5): un código publicado no cambia de número ni de significado. Base de
`app/src/sui/errors.ts` (#11).

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
huérfano, porque solo `house` podría recibirlo (`transfer::receive`) y no lo expone. Nota para #14: validar
el formato del destinatario (SEG-9) y que no sea un objeto existente antes de llamar a `transfer_house_cap`.

### Fee por defecto 0 (D-20261030-11)

La House nace con `fee_rate = 0`. Como el `Game` copia el fee al crearse (D-20261030-06 §3), las partidas
creadas antes del primer `update_fee_rate` quedan con comisión 0 para siempre.
**Paso obligatorio post-publicación (#8):** el owner llama `update_fee_rate` antes de anunciar el juego.

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

### Contención

`update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `migrate` y `add_fees` (llamado por cada resolución
de partida, #6) toman `&mut House`: las resoluciones de partidas se serializan sobre la House. Aceptable en
el MVP.

### ID de la House

El ID de la House (y el del `HouseCap`) sale de los efectos de la publicación y se registra en
`contracts/deployments/<red>.json` (#7). La app lo lee desde ahí (`agents.md` §5); el contrato no expone un
accessor de ID (dentro del paquete, `object::id(house)`).

## `battleship::game`

Cada partida es su **propio objeto compartido** `Game` (PROY-6): guarda la apuesta del creador como
`Balance<SUI>` (sin módulo Escrow, D-20261030-15 D4) hasta que la partida se cancela, se rechaza o se
resuelve (#6). En #5 existen crear, cancelar y rechazar; lo que agrega #6 se marca con "(#6)".

### Objetos

| Tipo | Habilidades | Campos / variantes | Nota |
|---|---|---|---|
| `Game` | `key` (compartido, sin `store`) | `id: UID`, `version: u64`, `house_id: ID`, `creator: address`, `opponent: Option<address>`, `bet: u64`, `stake: Balance<SUI>`, `fee_rate: u16`, `state: GameState` | Solo este módulo lo comparte; nadie lo transfiere, envuelve ni congela. Invariantes: `stake == bet` en `Pending`, `stake == 0` en `Cancelled`/`Resolved` (PROY-8); `bet` no cambia nunca |
| `GameState` | `copy, drop, store` (enum `public`) | `Pending`, `Cancelled`, `Resolved { acceptor: address, winner: address }` | Solo `game` lo construye o hace `match`. `Resolved` lo construye #6 |

Significado de los campos de `Game`:

| Campo | Significado |
|---|---|
| `version` | Versión del paquete que creó la partida (`house.version()` al crear). Ningún camino de reembolso la lee (ver Versionado del `Game`) |
| `house_id` | House contra la que se liquida la partida (#6: `EWrongHouse`) |
| `opponent` | `none` = partida abierta; `some(a)` = invitación directa a `a` |
| `bet` | Apuesta en MIST, fija durante toda la vida del objeto |
| `stake` | Fondos custodiados: igual a `bet` mientras está `Pending`; 0 al terminar |
| `fee_rate` | Comisión en basis points copiada de la House al crear (D-20261030-06 §3) |

Sin campos de tiempo (D-20261030-15 D6): la hora de creación es el `timestampMs` del evento `GameCreated`.

### Estados

Sin estado `Active` y **sin expiración** (D-20261030-06 §1-§2): aceptar resuelve en la misma transacción (#6).

```mermaid
stateDiagram-v2
    [*] --> Pending: create_game
    Pending --> Cancelled: cancel_game (creador) o reject_game (invitado)
    Pending --> Resolved: aceptar (#6, atómico con el coinflip)
    Cancelled --> [*]
    Resolved --> [*]
```

### Funciones

| Firma | Visibilidad | Quién puede llamar | Abort codes, **en este orden** | Evento |
|---|---|---|---|---|
| `create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext)` | `entry` | cualquiera (no puede invitarse a sí mismo) | `house::EWrongVersion` (3, módulo `house`), `EBetTooLow` (0), `EBetTooHigh` (1), `ESelfInvite` (2) | `GameCreated` |
| `cancel_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo `game.creator` | `ENotCreator` (3), `ENotPending` (4) | `GameCancelled` (`cancelled_by` = creador) |
| `reject_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo la dirección de `game.opponent` | `ENoInvitation` (6), `ENotInvited` (5), `ENotPending` (4) | `GameCancelled` (`cancelled_by` = invitado) |
| `refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext)` | privada | `cancel_game` y `reject_game` | — | `GameCancelled` |
| `is_pending(game: &Game): bool` | privada | `cancel_game`, `reject_game` y aceptar (#6) | — | — |
| aceptar (#6) | — | (#6) | (#6; sus aborts siguen desde el 7) | `GameResolved` (#6) |

- **Crear:** las lecturas de la House con chequeo de versión (`min_bet`, `max_bet`, `fee_rate`) van **primero**:
  con la House en otra versión el abort es siempre `house::EWrongVersion`, aunque la apuesta también sea
  inválida. Después, la apuesta (`EBetTooLow`, `EBetTooHigh`) y por último la autoinvitación (`ESelfInvite`).
  La apuesta es el valor **entero** del `Coin` recibido; los límites se comparan inclusive
  (`min_bet <= bet <= max_bet`).
- **Cancelar y rechazar:** **authZ antes que estado**. Un tercero recibe siempre `ENotCreator`/`ENotInvited`,
  aunque la partida ya no esté `Pending` (no aprende su estado: denegar por defecto). En rechazar, una partida
  abierta da `ENoInvitation` antes que cualquier otro chequeo.
- Las tres funciones son `entry` (no `public`, D-20261030-15 D8): no se componen desde otro paquete; se llaman
  desde transacciones (PTB).

### Eventos

Todos `has copy, drop`; tipo completo `<packageId>::game::<Evento>`.

| Evento | Campos | Emite |
|---|---|---|
| `GameCreated` | `game_id: ID`, `creator: address`, `opponent: Option<address>`, `bet: u64`, `fee_rate: u16` | `create_game` |
| `GameCancelled` | `game_id: ID`, `creator: address`, `cancelled_by: address`, `refund: u64` | `cancel_game` (`cancelled_by` = creador) y `reject_game` (`cancelled_by` = invitado) |
| `GameResolved` (#6) | (#6) | aceptar (#6) |

Las listas de la app (partidas abiertas, mis partidas, invitaciones) salen de estos eventos (PROY-6); el estado
vigente de cada partida se lee del objeto.

### Abort codes

Números estables (D-20261030-11 §5): un código publicado no cambia de número ni de significado. #6 sigue
desde el **7**. Base de `app/src/sui/errors.ts` (#11).

| Código | Constante | Condición | Funciones |
|---|---|---|---|
| 0 | `EBetTooLow` | valor del `stake` < `house.min_bet()` | `create_game` |
| 1 | `EBetTooHigh` | valor del `stake` > `house.max_bet()` | `create_game` |
| 2 | `ESelfInvite` | `opponent == some(sender)` | `create_game` |
| 3 | `ENotCreator` | `sender != game.creator` | `cancel_game` |
| 4 | `ENotPending` | estado de la partida distinto de `Pending` | `cancel_game`, `reject_game` |
| 5 | `ENotInvited` | `game.opponent == some(a)` y `sender != a` | `reject_game` |
| 6 | `ENoInvitation` | rechazo de una partida abierta (`opponent == none`) | `reject_game` |

`create_game` también aborta con **`house::EWrongVersion` (3, del módulo `house`)**. El número 3 existe en los
dos módulos con significados distintos (`house::EWrongVersion`, `game::ENotCreator`): #11 mapea los aborts
por **módulo + código**, nunca solo por número.

### Autorización

- Sin capability: la authZ de partidas es la comparación de `ctx.sender()` con la dirección guardada (SEG-2).
  `create_game`: cualquiera, salvo invitarse a sí mismo. `cancel_game`: solo `game.creator`.
  `reject_game`: solo la dirección de `game.opponent`; el creador no puede rechazar su propia invitación
  (`ENotInvited`), pero sí cancelarla.
- Cada denegación tiene su test `expected_failure` en `tests/game_tests.move`.

### Flujo de fondos

- **Crear:** el `Coin<SUI>` entero pasa a `stake: Balance<SUI>` (`stake == bet`). No hay vuelto: el PTB
  separa antes el monto exacto.
- **Cancelar y rechazar:** `withdraw_all` del `stake` → un `Coin` por el total → **siempre a `game.creator`**
  (nunca al invitado). **100 %, sin comisión**; la House no se recibe ni se toca (`fees_collected` no cambia).
  La partida queda `Cancelled` con `stake == 0`.
- Sin creación ni destrucción de valor; todo camino que recibe fondos tiene salida (cancelar, rechazar o
  aceptar #6). Conservación verificada en los tests (`Coin` del creador, invitado sin `Coin`, House sin cambios).

### Carreras

El consenso ordena las transacciones sobre el mismo `Game` compartido (por ejemplo, el creador cancela mientras
el invitado rechaza o, en #6, alguien acepta). La primera gana; la segunda aborta con `ENotPending` (o con
`ENotCreator`/`ENotInvited` si además no está autorizada) y, al revertirse, no pierde su `Coin`: una
transacción abortada solo paga gas.

### Comisión

El `fee_rate` de la House se **copia al crear** (D-20261030-06 §3): un `update_fee_rate` posterior no cambia
las partidas existentes. La base de la comisión y su cobro (`house::add_fees`) los fija #6. Ver "Fee por
defecto 0" en la sección House.

### Versionado del `Game` (D-20261030-15 DV)

- `version = house.version()` al crear; como las lecturas previas de la House ya validaron la versión, es
  igual a `house::VERSION` del paquete que crea.
- **Cancelar y rechazar no reciben la House ni leen la versión** (invariante D-20261030-12 §4): un reembolso
  nunca queda bloqueado por un upgrade; funcionan en cualquier versión.
- Aceptar (#6) compara `game.version` con `house.version()`. Tras un upgrade + `migrate`, `create_game` del
  paquete viejo aborta con `house::EWrongVersion` y las partidas `Pending` de versiones anteriores **solo se
  cancelan o rechazan**, salvo que la versión nueva decida aceptarlas.
- `GameState` y el layout de `Game` se **congelan en #8** (un upgrade compatible no agrega variantes al enum
  ni campos al struct): la batalla naval real (#18) necesitará un objeto nuevo o dynamic fields.

### Objeto terminal y storage (D-20261030-15 D3)

La partida terminada se **conserva** como objeto compartido (`Cancelled`/`Resolved`, `stake == 0`): no hay
función de borrado. Crearla deposita storage (≈ 0,002–0,003 SUI; valor exacto del smoke de #6) que **no se
recupera**. Es reversible en una versión futura con una función de borrado **restringida al creador**
(`sender == creator`), porque el rebate de storage va a quien firma la transacción que borra. La UI (#11)
muestra ese costo al crear.

### PTB

- **Crear:** `splitCoins(gas, [monto])` y `create_game(house, coin, opción)` con el `Coin` resultante;
  `opponent` es un `Option<address>` **puro** (`none` para una partida abierta, `some(dirección)` para una
  invitación). El builder vive en `app/src/sui/` (#11).
- **Cancelar / rechazar:** `cancel_game(game)` o `reject_game(game)` con el `Game` compartido; el reembolso
  llega al creador sin pasos extra en el PTB.

### Lectura desde la app

- La partida se lee con `getObject` con contenido: todos los campos llegan por RPC aunque no haya getters
  Move (no hay accessors `public` a propósito, PROY-4; agregarlos después es compatible con upgrade).
- **JSON-RPC** (`getObject`): cada variante del enum llega con **tres** claves:
  `{"type": "<pkg>::game::GameState", "variant": "Pending", "fields": {}}`; `Resolved` trae
  `"fields": {"acceptor": "0x…", "winner": "0x…"}` (`crates/sui-json-rpc-types/src/sui_move.rs:394-408,
  474-486, 510-520` @ `testnet-v1.83.0`). Los `u64` (`bet`, `version`) llegan como **string** (`:457`);
  `stake` (`Balance`) llega aplanado como su valor.
- **gRPC/GraphQL:** los campos de la variante van **al mismo nivel** que `"@variant"`:
  `{"@variant": "Resolved", "acceptor": "0x…", "winner": "0x…"}`
  (`crates/sui-types/src/object/rpc_visitor/mod.rs:247-262`).
- El parser de #10 usa **un** formato y trata una variante desconocida como error, nunca como `Pending` (SEG-10).
- La hora de creación es el `timestampMs` del evento `GameCreated` (D-20261030-15 D6;
  `crates/sui-json-rpc-types/src/sui_event.rs:62`).
