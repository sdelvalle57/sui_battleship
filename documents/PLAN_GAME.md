# PLAN_GAME v1.1
> **STOPs resueltos (D-20261030-15):** D3 (a), D4 (a), D6 (c), D8 (a) + `entry` + `reject_game` propio, DV (b).
>
> Decisión (2026-10-30): se optó por las recomendaciones del plan en D3/D4/D6/D8/DV — aprobado por el usuario.
> Issue: #5 (+ contexto de producto #6) | Áreas: contracts / docs | Fecha: 2026-10-30
> Branch: `feature/issue-5-game` (desde `master` @ `c2a1e42`; la crea el orquestador) | Autor: MID | Estado: **v1.1 para re-revisión del delta por el MAYOR**
> (aplica `documents/REVISION_PLAN_GAME.md`: MAJOR 1, MINOR 2-7, S8, S9, S11; S10 resuelto por el orquestador:
> cabecera D-14 también en los tests; cambios en §Changelog al final)
> Decisiones aplicadas sin reabrir: D-20261030-06 (§1 resolución atómica al aceptar → `Pending → Resolved | Cancelled`;
> §2 sin expiración; §3 el `Game` copia el `fee_rate` al crear; §4 el invitado puede rechazar), -11 (§5 abort codes
> clásicos `const E…: u64`; §7 versionado, "#5 replica el patrón en `Game`"), -12 (§2 accessors de la House versionados;
> §4 invariante de reembolso para `Game`), -14 (cabecera Apache-2.0 en `game.move` y, por indicación del orquestador
> —"los fuentes Move"—, también en `game_tests.move` y `house_tests.move`). Equivalen a #5 D1 = a, D2 = a,
> D5 = a, D7 = b: no se reabren.
> **STOPs pendientes del usuario:** D3 (objeto terminal), D4 (Escrow), D6 (timestamp), D8 (firma/visibilidad) y **DV**
> (mecánica de versionado de `Game`, D-12 §4). El cuerpo del plan asume las recomendaciones; cada STOP dice qué cambia
> si se elige otra opción. El handoff no se genera hasta tenerlas.

## Historia de usuario

**Como** jugador creador, **quiero** abrir una partida apostando SUI —abierta a cualquiera o como invitación a una
dirección concreta— y cancelarla cuando quiera mientras nadie la haya aceptado, recuperando el 100 % de mi apuesta;
**y como** jugador invitado, **quiero** poder rechazar una invitación que no voy a jugar, **para** que los fondos del
creador solo queden bloqueados mientras la partida espera rival, sin depender de nadie (ni del admin, ni de una
versión del contrato) para recuperarlos.

**Scope en una frase:** el módulo `battleship::game` con el objeto `Game` (uno compartido por partida, con la apuesta
custodiada dentro), su estado, y las operaciones crear, cancelar y rechazar, con su suite de tests y la documentación
del contrato; deja fijados el struct, los estados y los eventos que #6 extiende.

**Lo que NO entrega:** aceptar, coinflip, pago al ganador y comisión (#6); smoke en localnet (#6, con el ciclo
completo); `app/` y el mapeo de aborts de la UI (#9-#12); formato de `deployments/` y publicación (#7, #8); la
corrección del `README.md` raíz (Escrow, "2 vs 2", #16); cambios en `battleship::house` (salvo la cabecera de
licencia de `house_tests.move`, D-14); la mecánica de batalla naval (#18, que no podrá extender `GameState`: ver
§Contrato on-chain).

## Contexto y alcance

`battleship::game` no existe: el stub 2025 se retiró en #2 (STATUS H6). Diseño 2025 retirado, como contexto y no como
contrato (`git show f063a0e:sources/Game/game.move`):

| Evidencia @ `f063a0e` | Problema | Regla | Resolución en este plan |
|---|---|---|---|
| `game.move:15-18, 41-50` | `GamePool { pool: vector<GameRequest> }` compartido y creciente | SEG-7, PROY-6 | un objeto `Game` compartido por partida; listas desde eventos |
| `game.move:36` | `escrow: u64`: un número, no custodia fondos | SEG-4 | `stake: Balance<SUI>` dentro del `Game` (D4 a) |
| `game.move:21-24, 37-38` | `TurnCap`, `metadata`, `turn` sin uso | LIM-3 | no existen |
| `game.move:6-13` | `GameState` con `Active`/`Finished`/`Resolution`/`Resolved` solapados | PROY-8 | `Pending \| Cancelled \| Resolved { … }` (D-06 §1) |
| `game.move:53-62` | `start_game` no compila (H6) | — | `create_game` |
| `README.md` 2025 §1.3 | "Requesting player ID (initiator or opponent)" | — | cancelar (creador) y rechazar (invitado) separados, D-06 §4 |

Lo que ya existe y se consume (sin tocarlo): `contracts/sources/house.move` — `min_bet`/`max_bet`/`fee_rate` (`:156-177`,
validan versión primero, D-12 §2), `version()` sin chequeo (`:181-183`), `add_fees` (`:150-153`, lo usa #6) y
`object::id(house)` para `house_id`. Modelo de estilo a replicar: `house.move` (orden del módulo, abort codes con
comentario de condición `:14-19`, `///` en todo lo público, eventos `has copy, drop`, constructores de eventos
`#[test_only]` `:200-240`) y `contracts/tests/house_tests.move` (helper `publish()` `:34-39`, comparación de eventos
con `event::events_by_type<T>() == vector[expected]` `:92`, conservación con `take_from_sender<Coin<SUI>>` `:222-225`,
`expected_failure` con ruta completa `:112`). Baseline vigente (STATUS): build 0 warnings, `--lint` 0 lints,
**26 tests** PASS (todos de House).

**Alcance:** `contracts/sources/game.move` (nuevo), `contracts/tests/game_tests.move` (nuevo),
`contracts/tests/house_tests.move` (solo las 2 líneas de cabecera D-14, que hoy no tiene: `house_tests.move:1` empieza
en `#[test_only]`), `contracts/README.md` (sección Game), `agents.md` (§2 tabla, §6, §7, §8, §9),
`documents/ESTANDARES.md` (PROY-7, PROY-8, PROY-10) y `documents/STATUS.md`.

**Fuera de alcance:** ver HU. No se tocan `house.move`, el código de `house_tests.move`, `Move.toml` ni `Move.lock`
(sin repin, H13); no se crea `app/` ni `contracts/deployments/`; no se usa `sui client` salvo `active-env`; no se publica.

## Contrato on-chain

**Rutas de evidencia de la CLI:** las del compilador y del formato binario son de
`external-crates/move/crates/…` @ `testnet-v1.83.0`; las del ejecutor son de **`sui-execution/latest/`**, que es el
que rige en testnet (`execution_version = 4` desde la PV 119, `crates/sui-protocol-config/src/lib.rs:4646-4648`;
despacho en `sui-execution/src/lib.rs:41`), no de las copias `sui-execution/historical-versions/v0..v3`.

Paquete **no publicado**: todo puede cambiar hasta #8. Desde la primera publicación se congelan (PROY-10): layout y
habilidades de `Game`; **las variantes de `GameState` y sus campos** (un upgrade no puede agregar variantes:
`external-crates/move/crates/move-binary-format/src/compatibility.rs:192-193` + `compatibility_mode.rs:209-211, 273-275`);
firmas `public`; eventos; números de abort. Las funciones `entry` no `public` pueden cambiar o desaparecer en versiones
nuevas (`Compatibility::upgrade_check()` con `check_private_entry_linking: false`, `compatibility.rs:76-82`;
`compatibility_mode.rs:231-233, 270-272`), pero **toda versión anterior del paquete sigue invocable**. #5 fija ya la
variante `Resolved` que usará #6 para evitar retrabajo (#6 se mergea antes de #8 y técnicamente aún podría cambiarla;
si lo hace, lo declara).

**Impacto en #18 (batalla naval real):** como `GameState` y el layout de `Game` quedan cerrados en #8, #18 **no** podrá
agregar un estado "en juego"/`InBattle` ni campos al `Game`: necesitará un objeto nuevo (p. ej. un `Battle` ligado por
`game_id`) o dynamic fields sobre `Game.id`. Va al README (Versionado), a PROY-10 y a `agents.md` §6/§8; el
orquestador lo comenta en el issue #18 al aprobarse este plan.

Sin `app/src/sui/` todavía: #11 mapea los aborts desde la tabla de `contracts/README.md` (ojo: `create_game` también
puede abortar con `house::EWrongVersion`, código 3 **del módulo `house`**; el mapeo de #11 es por módulo + código).

### Constantes de error (D-11 §5; numeración propia del módulo, estable)

| Código | Constante | Condición | Funciones (#5) | Reuso previsto en #6 |
|---|---|---|---|---|
| 0 | `EBetTooLow` | `stake.value() < house.min_bet()` | `create_game` | — |
| 1 | `EBetTooHigh` | `stake.value() > house.max_bet()` | `create_game` | — |
| 2 | `ESelfInvite` | `opponent == option::some(sender)` | `create_game` | — |
| 3 | `ENotCreator` | `sender != game.creator` | `cancel_game` | — |
| 4 | `ENotPending` | estado ≠ `Pending` | `cancel_game`, `reject_game` | aceptar |
| 5 | `ENotInvited` | la partida tiene `opponent = some(a)` y `sender != a` | `reject_game` | aceptar |
| 6 | `ENoInvitation` | `reject_game` sobre una partida abierta (`opponent = none`) | `reject_game` | — |

#6 sigue desde el 7 (`ESelfPlay`, `EWrongStake`, `EWrongHouse`, `EWrongVersion`, numeración final de su plan). No se
declaran en #5: el compilador avisa por constante sin uso (`UnusedItem::Constant`, `diagnostics/codes.rs:369` @
`testnet-v1.83.0`), y con #3 la CI corre con `--warnings-are-errors` (D-20261030-13).

**Orden de validación** (se documenta en el README, como "versión primero" en la House): `create_game` lee los
accessors de la House primero (ellos abortan con `house::EWrongVersion` antes que cualquier otra cosa), luego
apuesta mínima, máxima y auto-invitación. `cancel_game` y `reject_game` validan **authZ antes que estado** (denegar
por defecto, SEG-2): un tercero que intenta cancelar una partida ya cancelada recibe `ENotCreator`, no `ENotPending`
(no se le filtra el estado). El orden es parte del contrato que publica el README para #11 y tiene tests propios
(TASK-1, tests 9, 24 y 25).
> Decisión (2026-10-30): `ENoInvitation` separado de `ENotInvited` porque son condiciones distintas (no hay invitación
> que rechazar vs. no eres el invitado) y la UI las explica distinto (LIM-8) — MID, detalle de diseño.

### Structs y enum

```move
/// One shared object per game. Holds the creator's stake until it is cancelled, rejected or resolved (#6).
/// No `store`: only this module can share it; nobody can transfer, wrap or freeze it.
public struct Game has key {
    id: UID,
    /// Package version that created the game (`house.version()` at creation). Never read by refund paths.
    version: u64,
    /// House the game settles against (#6: `EWrongHouse`).
    house_id: ID,
    creator: address,
    /// `none` = open game; `some(a)` = direct invitation to `a`.
    opponent: Option<address>,
    /// Bet in MIST; constant for the whole life of the object.
    bet: u64,
    /// Equals `bet` while `Pending`; 0 once `Cancelled` or `Resolved` (PROY-8).
    stake: Balance<SUI>,
    /// Fee in basis points copied from the House at creation (D-20261030-06 §3).
    fee_rate: u16,
    state: GameState,
}

/// Lifecycle (D-20261030-06 §1): Pending -> Cancelled (cancel/reject) | Resolved (accept, #6, atomic).
public enum GameState has copy, drop, store {
    Pending,
    Cancelled,
    Resolved { acceptor: address, winner: address },   // lo construye #6
}
```

- Los enums tienen que ser `public` (`parser/syntax.rs:3692-3712` @ `testnet-v1.83.0`), pero solo el módulo `game`
  puede construirlos o hacer `match` sobre ellos: los tests externos usan helpers `#[test_only]`.
- Ningún campo queda "sin uso" para el compilador: el `Pack` de `create_game` marca todos los campos como usados
  (`hlir/translate.rs:1371-1377, 3022-3060` @ `testnet-v1.83.0`); `house_id` y `version` los leerá #6. La lista de
  `UnusedItem` no tiene "variante sin uso" (`codes.rs:358-372`), así que `Resolved` sin construir en #5 no avisa.
- **Sin timestamp** (D6 c) y **sin `Active`** (D-06 §1). Con D3 (a) el objeto terminal se conserva.
- `Resolved` lleva `acceptor` y `winner` porque solo existen al resolver (estado ilegal irrepresentable) y #6 los
  pide ("estado `Resolved` con el ganador registrado"); `payout`/`fee` no se guardan: se derivan de `bet` y
  `fee_rate` y van en el evento de #6. `Cancelled` sin datos: quién canceló va en el evento.

### Funciones

| Firma | Visibilidad | Quién puede | Aborts (en orden) | Evento |
|---|---|---|---|---|
| `create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext)` | `entry` (D8) | cualquiera | `house::EWrongVersion` (3, del módulo `house`), `EBetTooLow`, `EBetTooHigh`, `ESelfInvite` | `GameCreated` |
| `cancel_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo `game.creator` (abierta o invitación) | `ENotCreator`, `ENotPending` | `GameCancelled` (`cancelled_by = creator`) |
| `reject_game(game: &mut Game, ctx: &mut TxContext)` | `entry` | solo el invitado (`game.opponent = some(sender)`) | `ENoInvitation`, `ENotInvited`, `ENotPending` | `GameCancelled` (`cancelled_by = opponent`) |

- **Sin `init` ni OTW** en `game` (no hay objeto global; PROY-6).
- **Ni `cancel_game` ni `reject_game` reciben la House ni leen versión**: es el invariante de reembolso (DV, D-12 §4).
- `create_game` modelo (el `Coin` se convierte en `Balance` en la frontera, SEG-4; `&House` solo lectura, sin
  contención de escritura):
  ```move
  entry fun create_game(house: &House, stake: Coin<SUI>, opponent: Option<address>, ctx: &mut TxContext) {
      // Version-checked House reads go first (D-20261030-12 §2): an old package aborts here after `migrate`.
      let min_bet = house.min_bet();
      let max_bet = house.max_bet();
      let fee_rate = house.fee_rate();
      let bet = stake.value();
      assert!(bet >= min_bet, EBetTooLow);
      assert!(bet <= max_bet, EBetTooHigh);
      let creator = ctx.sender();
      assert!(opponent != option::some(creator), ESelfInvite);
      let game = Game {
          id: object::new(ctx),
          version: house.version(), // == house::VERSION here: the reads above already checked it
          house_id: object::id(house),
          creator, opponent, bet,
          stake: stake.into_balance(),
          fee_rate,
          state: GameState::Pending,
      };
      event::emit(GameCreated { game_id: object::id(&game), creator, opponent, bet, fee_rate });
      transfer::share_object(game);
  }
  ```
  > Decisión (2026-10-30): `version: house.version()` en lugar de una constante `VERSION` propia de `game`: tras los
  > accessors versionados, `house.version()` es exactamente la versión del paquete en ejecución, y así hay una sola
  > fuente de verdad (LIM-5/LIM-6) sin tocar `house.move` — MID, detalle de diseño. Alternativa si el MAYOR la
  > prefiere: `const VERSION: u64 = 1;` en `game` + test que compare `game.version` con `house.version()`.
- `cancel_game`/`reject_game` comparten un helper privado (LIM-5):
  ```move
  // Refunds the whole stake to the creator, without fee. Takes no House and checks no version on purpose:
  // a refund path can never be blocked by an upgrade (D-20261030-12 §4).
  fun refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext) {
      let refund = game.stake.withdraw_all();
      game.state = GameState::Cancelled;
      event::emit(GameCancelled {
          game_id: object::id(game), creator: game.creator, cancelled_by, refund: refund.value(),
      });
      transfer::public_transfer(coin::from_balance(refund, ctx), game.creator);
  }
  ```
  y un `fun is_pending(game: &Game): bool` **privado** con `match (&game.state) { GameState::Pending => true, _ => false }`
  (lo usan `cancel_game`, `reject_game` y el aceptar de #6; si `game.state == GameState::Pending` compila sin warnings
  ni lints, el DEV puede usarlo y lo declara). Los helpers de test llevan sufijo `_for_testing` (§Helpers), así que no
  hay colisión de nombres con este helper.
- APIs del framework @ `719fb29` (verificadas en `~/.move/git/…719fb29…`): `coin::into_balance` (`coin.move:145`),
  `coin::from_balance` (`:140`), `coin::value` (`:125`), `balance::withdraw_all` (`balance.move:90`),
  `object::id` (`object.move:254`), `transfer::share_object` (`transfer.move:120`, objeto nuevo del propio módulo),
  `transfer::public_transfer` (`:63`, `Coin` tiene `store`), `option::some` (`move-stdlib/sources/option.move:26`).
- **PTB (lo consume #11):** `Option<address>` es un argumento puro válido para `entry` (`Option` de primitivo es
  primitivo: `crates/sui-types/src/lib.rs:277-303` @ `testnet-v1.83.0`; el verificador de entry lo exige en
  `sui-execution/latest/sui-verifier/src/entry_points_verifier.rs:222-260`). El `Coin` que produce `SplitCoins` en la
  misma PTB se puede pasar a una `entry` no `public`: la regla de entry solo prohíbe argumentos de un "clique
  caliente" (valores sin `drop` ni `store`, u objetos con permisos restringidos), `SplitCoins` solo fusiona cliques y
  `Coin<SUI>` tiene `store` (`sui-execution/latest/sui-adapter/src/static_programmable_transactions/typing/verify/private_entry_arguments.rs:381-395`
  regla, `:426-445` fusión de cliques, `:497-529` chequeo de la `entry` y definición de "caliente").
  La UI arma `splitCoins(gas, [monto])` + `create_game(house, coin, opcion)`; la confirmación end-to-end va en el smoke de #6.
- Los tests llaman las funciones `entry` directamente (el compilador las trata como públicas en modo test; precedente
  verde: `house_tests.move:84` llama `house::update_fee_rate`, que es `entry`).

### Eventos (PROY-7, `has copy, drop`)

| Evento | Campos | Emite |
|---|---|---|
| `GameCreated` | `game_id: ID`, `creator: address`, `opponent: Option<address>`, `bet: u64`, `fee_rate: u16` | `create_game` |
| `GameCancelled` | `game_id: ID`, `creator: address`, `cancelled_by: address`, `refund: u64` | `cancel_game` (`cancelled_by = creator`), `reject_game` (`cancelled_by = opponent`) |

- `GameCreated` trae lo que el lobby (#10) y "mis invitaciones" (#13) necesitan para listar sin leer el objeto:
  creador, invitado, apuesta y la comisión que se cobrará (D-06 §3). Sin `house_id` (una sola House; el mismo
  criterio que `HouseCapTransferred`). Sin timestamp: el evento ya lo trae en sus metadatos (`timestampMs`, D6 c).
- Un solo evento para las dos salidas a `Cancelled`: la UI resta partidas abiertas con **un** tipo de evento, y
  `cancelled_by != creator` significa "rechazada por el invitado".
  > Decisión (2026-10-30): `GameCancelled` con `cancelled_by` en lugar de un `GameRejected` aparte, porque ambas
  > transiciones llevan al mismo estado y así la UI consulta un tipo de evento menos — MID, detalle de diseño
  > (PROY-7: "toda transición emite un evento"; la transición es la misma).
- #6 agrega `GameResolved` (y `GameAccepted` según su D4).

### Helpers `#[test_only]` en `game.move` (PROY-1: acceso privado)

Todos con sufijo `_for_testing` (uniforme, sin colisión con el `is_pending` privado): constructores de eventos
`new_game_created_for_testing(...)` y `new_game_cancelled_for_testing(...)` (patrón `house.move:200-240`); lecturas
`creator_for_testing`, `opponent_for_testing`, `bet_for_testing`, `stake_value_for_testing`, `fee_rate_for_testing`,
`house_id_for_testing`, `version_for_testing`, `is_pending_for_testing` (delega en `is_pending`) e
`is_cancelled_for_testing`; y `set_version_for_testing(game: &mut Game, version: u64)` (patrón `house.move:195-198`).
En §Tests los nombres cortos (`stake_value`, `is_pending`…) se refieren a estas variantes `_for_testing`.
> Decisión (2026-10-30): lecturas de `Game` solo `#[test_only]`, no `public`: no hay consumidor Move (la app lee el
> objeto por RPC, que expone todos los campos sin importar la visibilidad Move; ver "Lectura desde la app" en TASK-2),
> una función `public` queda congelada al publicar (PROY-4) y agregarla después es compatible — MID.

### Lo que #6 extiende sobre este modelo

| #6 necesita | Lo deja #5 |
|---|---|
| Liquidar contra la misma House (`EWrongHouse`) | `house_id` |
| Comisión fijada al crear (D-06 §3) | `fee_rate` |
| Pozo = 2 × `bet`; igualar la apuesta exacta (`EWrongStake`) | `bet` + `stake` |
| Invitación (`ENotInvited`), estado (`ENotPending`) | `opponent`, `is_pending`, códigos 4 y 5 |
| Cerrar el código viejo en caminos que no son reembolso (DV) | `version`; #6 compara `game.version == house.version()` **después** de una lectura con chequeo de versión de la House (`fee_rate()`/`add_fees`), igual que `create_game`: `game` no ve `house::VERSION` (constante privada, `house.move:21`) y no debe declarar otra (LIM-5) |
| Estado final con ganador | variante `Resolved { acceptor, winner }` |
| Funciones `entry` no `public` con `&Random` (SEG-5) | mismo estilo de visibilidad (D8) |

## Flujo de fondos

| Camino | Entrada | Custodia | Salida | Comisión |
|---|---|---|---|---|
| Crear | `Coin<SUI>` del creador (valor = `bet`, en `[min_bet, max_bet]`) → `into_balance` | `Game.stake` | — | — |
| Cancelar (creador) | — | `Game.stake` (= `bet`) | `Coin<SUI>` por el total → `game.creator` | ninguna |
| Rechazar (invitado) | — | `Game.stake` (= `bet`) | `Coin<SUI>` por el total → `game.creator` (no al invitado) | ninguna |
| Aceptar y resolver (#6) | `Coin` del aceptante (= `bet`) | pozo en `Game.stake` | ganador: pozo − fee; House: fee (`add_fees`) | `fee_rate` del `Game` |

**Invariantes:** en `Pending`, `stake == bet`; en `Cancelled`, `stake == 0` y el creador recibió exactamente `bet`;
cancelar y rechazar no tocan la House (`fees_collected` igual antes y después). Ningún camino crea ni destruye valor.
Todo camino que recibe fondos tiene salida (cancelar siempre disponible para el creador, sin expiración, D-06 §2), y
**ningún reembolso depende de la versión del paquete ni de la House** (DV). Carrera cancelar/rechazar/aceptar: el
consenso ordena las transacciones del mismo objeto compartido; la que llega segunda aborta con `ENotPending` y, al
revertirse, no pierde su `Coin` (se documenta en el README; no requiere código). Aparte de la apuesta, crear la
partida deposita storage (≈ 0,002–0,003 SUI) que con D3 (a) no se recupera: no es SUI custodiado por el contrato,
pero es un costo del creador que el README y la UI (#11) deben mostrar (ver D3).

## Decisiones abiertas → STOP

> El orquestador presenta D3, D4, D6, D8 y DV al usuario. Cada una queda **STOP pendiente**; el plan asume la
> recomendación. D1, D2, D5 y D7 de #5 están resueltas (D-20261030-06) y no se reabren.

### D3 — Objeto terminal — STOP pendiente
- **Evidencia:** issue #5 D3; PROY-8 ("un objeto terminal no retiene `Balance` > 0"); un objeto compartido tomado por
  valor solo puede terminar re-compartido o borrado
  (`sui-execution/latest/sui-adapter/src/static_programmable_transactions/execution/context.rs:2311-2337` @
  `testnet-v1.83.0`), así que el borrado es posible si la función recibe `game: Game` por valor.
- **Costo de storage (lo que decide el usuario):** crear un objeto deposita `bytes × unidades por byte × precio de
  storage de la época`: 100 unidades por byte de datos (`crates/sui-protocol-config/src/lib.rs:2788`, más 50 no
  reembolsables, `:2789`) × el precio de storage que fija el system state (históricamente 76 MIST; **no medido** en
  esta revisión). Un `Game` de ≈ 250–350 B (UID, tres direcciones, `Option`, tres `u64`, `u16`, tag del enum y
  metadatos del objeto) deposita **≈ 0,002–0,003 SUI por partida, unas 2–3 veces `min_bet`** (0,001 SUI,
  `house.move:25`). Lo paga el creador al crear. El valor exacto se mide en el smoke de #6 (`storageCost` /
  `storageRebate` del gas summary de crear y de cancelar) y se registra en el README.
- **(a) Conservar** el `Game` en `Cancelled`/`Resolved` con `stake` 0. Pros: la UI muestra el resultado leyendo el
  objeto por ID; la carrera cancelar/aceptar termina en un abort con código (`ENotPending`) que la UI traduce;
  coincide con el criterio del issue (enum de estados); **es reversible**: una versión futura puede agregar una
  `entry` que borre partidas terminales y devuelva el rebate al creador (agregar funciones es compatible y borrar un
  compartido tomado por valor está permitido, mismas citas); se abre un issue de seguimiento si el usuario lo quiere.
  Contras: el depósito de storage (≈ 0,002–0,003 SUI) **no se recupera nunca** mientras no exista ese borrado; queda
  inmovilizado por cada partida, incluida una de 0,001 SUI.
- **(b) Borrar** el objeto al cancelar/rechazar/resolver. Pros: vuelve el 99,99 % del depósito
  (`storage_rebate_rate = 9999` desde la PV 139, `crates/sui-protocol-config/src/lib.rs:4907`) a **quien firma la
  transacción que borra**: el creador al cancelar, **el invitado** al rechazar y **el aceptante** al resolver (#6), no
  necesariamente quien lo pagó. Contras: **irreversible** (se pierden el enum y la lectura por ID para siempre); el
  campo `state` y el enum desaparecen (un `Game` vivo siempre está `Pending`), `ENotPending` deja de existir y la
  carrera la pierde una transacción que falla **sin abort code** (objeto inexistente), que #11/#12 tienen que mapear
  aparte; el historial y "ver resultado" salen solo de eventos (#10, #13).
- **Nota para #11 (con cualquier opción):** la pantalla de crear muestra el costo de crear la partida (gas +
  depósito de storage, y si se recupera o no), no solo la apuesta.
- **Recomendación:** (a), informando al usuario del depósito no recuperable.
- **Si se elige (b):** `cancel_game`/`reject_game` (y el aceptar de #6) reciben `game: Game` por valor, hacen
  `let Game { id, stake, .. } = game`, devuelven el `stake`, `object::delete(id)` (`object.move:248`) y
  `balance::destroy_zero` cuando corresponda; se eliminan `GameState`, `is_pending`, `ENotPending` (los códigos
  siguientes se renumeran antes de publicar) y los tests de "cancelar dos veces" pasan a no aplicar; PROY-8 se
  reescribe ("un `Game` existe solo mientras está pendiente"); el README cambia el diagrama por "existe / no existe".

### D4 — Módulo Escrow — STOP pendiente
- **Evidencia:** `README.md:10, 54-55, 74` (roadmap 2025 con módulo Escrow); `documents/STATUS.md` fila 4 ("se propone
  absorberlo en Game"); `agents.md` §6 ya asume "fondos como `Balance<SUI>` dentro de la partida" sin decisión registrada.
- **(a) Absorberlo en Game:** la custodia es el campo `stake: Balance<SUI>` de cada partida. **(b) Módulo `escrow`
  separado** con su propio objeto o API `public(package)`.
- **Recomendación:** (a): un módulo aparte sería una abstracción sin segundo uso (ARQ-7) y añadiría un objeto o un
  envoltorio por partida sin beneficio de seguridad (la custodia ya es un `Balance` privado del módulo). El README raíz
  se corrige en #16.
- **Si se elige (b):** TASK-1 se parte en dos (`escrow.move` con `public(package) fun lock/release` sobre un
  `Escrow has store` embebido en `Game`, más su suite), `game` depende de `escrow` (ARQ-1 se amplía), y el flujo de
  fondos pasa por esa API.

### D6 — Timestamp de creación — STOP pendiente
- **Evidencia:** `ctx.epoch_timestamp_ms()` devuelve el **inicio de la época**, no la hora de la transacción
  (`tx_context.move:128-131` @ `719fb29`); la hora real requiere `&Clock` (`clock.move:30`, objeto `0x6`); los eventos
  ya traen `timestampMs` en sus metadatos del RPC.
- **(a) `&Clock` en `create_game`** y campo `created_at_ms: u64`. **(b)** `epoch_timestamp_ms` (no sirve para mostrar
  la hora). **(c) Sin campo**: la UI usa el `timestampMs` del evento `GameCreated`.
- **Recomendación:** (c): sin expiración (D-06 §2) el contrato no necesita la hora; un input y un campo menos.
- **Si se elige (a):** `create_game(house, stake, opponent, clock: &Clock, ctx)`, campo `created_at_ms` (congelado al
  publicar), `GameCreated` gana `created_at_ms`, los tests usan `clock::create_for_testing` (`clock.move:60`) +
  `set_for_testing` (`:79`) y verifican el valor; la UI pasa `0x6` en cada creación.

### D8 — Firma y visibilidad de crear, cancelar y rechazar — STOP pendiente
- **Evidencia:** verificaciones de §Contrato on-chain: `Option<address>` es argumento puro válido
  (`crates/sui-types/src/lib.rs:277-303`; `sui-execution/latest/sui-verifier/src/entry_points_verifier.rs:222-260`);
  el `Coin` de `SplitCoins` entra en una `entry` no `public` (`sui-execution/latest/…/private_entry_arguments.rs:381-395,
  426-445, 497-529`); una `entry` no `public` puede cambiar o eliminarse en un upgrade y una `public` no
  (`compatibility.rs:76-82`, `compatibility_mode.rs:231-233, 270-272`); precedente D-12 §1 (setters de la House `entry`).
- **Opciones de firma:** (a) una sola `create_game(…, opponent: Option<address>, …)`; (b) `create_open_game` +
  `create_invite_game(opponent: address)`.
- **Opciones de visibilidad:** `entry` (solo transacciones; la firma puede cambiar en versiones nuevas) o `public`
  (componible desde otros paquetes; firma congelada para siempre, PROY-4).
- **Sub-punto (rechazo, D-06 §4):** (i) función propia `reject_game` (authZ y aborts propios, evento con
  `cancelled_by`); (ii) un único `cancel_game` que acepta al creador o al invitado.
- **Recomendación:** (a) + `entry` en las tres + (i). Ninguna devuelve valores que otra llamada necesite y no hay
  consumidor componible real; (i) deja cada regla de authZ en una función con su test denegado.
- **Si se elige (b):** dos funciones de creación que comparten un helper privado; los tests de creación se duplican
  para la variante con invitación. **Si se elige `public`:** las firmas quedan congeladas tras #8 y cualquier paquete
  podría crear/cancelar desde su propio código (sin riesgo de fondos, porque la authZ es `ctx.sender()`); `create_game`
  podría devolver el `ID`. **Si se elige (ii):** `cancel_game` valida "creador o invitado" con un solo abort de authZ y
  el evento sigue llevando `cancelled_by`.

### DV — Mecánica de versionado de `Game` (D-11 §7 + D-12 §4) — STOP pendiente
- **Problema:** tras un upgrade, el código viejo sigue invocable para siempre. La House ya se protege: sus accessors y
  `add_fees` abortan con `EWrongVersion` tras `migrate` (D-12 §2), así que `create_game` v1 deja de crear partidas y el
  aceptar v1 (#6, que llama `add_fees`) deja de liquidar. Lo que falta decidir es si el `Game` guarda versión y qué
  funciones la miran, con la regla dura de D-12 §4: **cancelar y rechazar nunca pueden quedar bloqueados por la
  versión**. Escenario a evitar (comentario del issue): una partida `Pending` de la v1 que el cancelar nuevo rechaza
  por versión y que solo el titular del `HouseCap` podría migrar ⇒ fondos del creador atrapados.
- **(a) Sin campo `version` en `Game`.** Todo el control de versión lo hace la House: crear y aceptar la tocan;
  cancelar y rechazar no. Pros: cumple el invariante por construcción, sin campo ni chequeo. Contras: el `Game` no
  sabe qué versión lo creó, y el layout se congela en #8 (un campo no se puede agregar después; solo un dynamic field
  desde una versión futura). Se aparta de "#5 replica el patrón en `Game`" (D-11 §7).
- **(b) `version: u64` en `Game`, fijado al crear (`= house.version()`), chequeado solo en caminos que no son
  reembolso.** En #5 nadie lo lee en producción; #6 agrega en aceptar `assert!(game.version == house.version(),
  EWrongVersion)` **después** de una lectura con chequeo de versión de la House (`fee_rate()`/`add_fees`), que ya
  garantiza `house.version() == house::VERSION` (mismo argumento que `create_game`; `game` no ve la constante privada
  `house::VERSION`, `house.move:21`, y no declara otra, LIM-5). `cancel_game`/`reject_game` **no** reciben la House
  **ni** miran `version`. Sin `migrate` de partidas en la v1. **Consecuencia de producto:** tras un upgrade + `migrate`
  de la House, las partidas `Pending` de versiones anteriores **solo se cancelan o rechazan** (el aceptar viejo aborta
  en la House y el nuevo en el `assert`), salvo que la versión nueva decida aceptarlas (comparar con `<=` o agregar
  una migración sin permisos; agregar funciones es compatible). La UI (#10) debe dejar de ofrecerlas como aceptables
  (`game.version` ≠ versión de la House) y va al README y a `agents.md` §7. Pros: cumple el invariante; deja la
  procedencia de cada partida para versiones futuras (no se puede agregar después del congelamiento del layout);
  replica D-11 §7 sin el `migrate` con `HouseCap`. Contras: 8 B más por partida; el chequeo de #6 es hoy redundante
  con el de la House (defensa en profundidad, no la única barrera).
- **(c) (b) + `entry fun migrate_game(game: &mut Game)` sin permisos** (cualquiera sube la versión de una partida
  `Pending`). Pros: una v2 podría aceptar partidas v1 sin lógica especial. Contras: en la v1 siempre abortaría (no hay
  versión anterior), es código sin uso (LIM-3) y se puede agregar en la v2 si hace falta.
- **Descartada:** versión chequeada también en cancelar/rechazar con migración por `HouseCap` (viola D-12 §4).
- **Trade-off común a (a), (b) y (c):** como cancelar/rechazar no se pueden cerrar por versión, un bug futuro en
  esos caminos de la v1 no se podría cerrar con un upgrade. Se acepta porque solo devuelven el `stake` íntegro a
  `game.creator` (sin parámetros de destino ni de monto), y se testean exhaustivamente.
- **Recomendación:** (b).
- **Si se elige (a):** se quitan el campo `version`, `set_version_for_testing`, el test de versión de creación y los
  tests de invariante con versión de partida distinta (quedan los de House migrada); README y PROY-10 dicen "el `Game`
  no lleva versión; el control lo hace la House". **Si se elige (c):** se suman `migrate_game`, un abort
  (`ENotUpgrade` del módulo `game`), un evento `GameMigrated` y sus tests.

## Tasks (ordenados por dependencia; contratos antes que docs)

### TASK-1: Módulo `battleship::game` (crear, cancelar, rechazar) + suite de tests — área: contracts
- **Entregable:** `game.move` según §Contrato on-chain y `game_tests.move` con la suite; gates verdes.
- **Archivos afectados:** `contracts/sources/game.move` (crear), `contracts/tests/game_tests.move` (crear),
  `contracts/tests/house_tests.move` (**solo** anteponer las 2 líneas de cabecera D-14; comment-only, cero delta de
  tests). **No tocar:** `contracts/sources/house.move`, el resto de `house_tests.move`, `Move.toml`, `Move.lock`,
  `.gitignore`, `.github/`, `agents.md`, `documents/`, `contracts/README.md`.
- **Cambios:**
  - `game.move` abre con `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0` (D-14) y
    un `///` de módulo; orden como `house.move`: `use`, abort codes (con comentario de condición), structs, enum,
    eventos, funciones `entry`, helpers privados, `#[test_only]`. `///` en toda función `entry`, struct, enum y evento
    (LIM-7); comentario del POR QUÉ en `refund_creator` (invariante de reembolso) y en las lecturas de la House de
    `create_game` (versión primero). `use battleship::house::House;` (ARQ-1: `game → house`).
  - Cabecera D-14 (`// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0`) también en
    `game_tests.move` y, en el mismo PR, en `house_tests.move` (que hoy no la tiene): "los fuentes Move" de D-14
    incluyen los tests (indicación del orquestador, 2026-10-30).
  - `game_tests.move` replica el estilo de `house_tests.move`: `#[test_only] module battleship::game_tests;`; direcciones `PUBLISHER = @0xA` (House y `HouseCap`),
    `CREATOR = @0xB`, `INVITEE = @0xC`, `OTHER = @0xD`; constantes con los valores esperados (`MIN_BET = 1_000_000`,
    `MAX_BET = 50_000_000_000`, `BET`, etc.); helper `publish()` (`house::init_for_testing`); helper que crea una
    partida con `coin::mint_for_testing<SUI>(bet, scenario.ctx())` (`coin.move:572`) y devuelve su `ID` vía
    `test_scenario::most_recent_id_shared<Game>()` (`test_scenario.move:567`) tras el `next_tx`; varias partidas con
    `take_shared_by_id` (`:564`); conservación con `take_from_address<Coin<SUI>>`/`take_from_sender` (`:473, :509`);
    objeto compartido con `test_scenario::shared(&effects)` (`:436`); eventos con `event::events_by_type<T>()`
    (`event.move:68`) **antes** del `next_tx`.
- **AuthZ:** `create_game`: cualquiera (validado: no auto-invitarse). `cancel_game`: solo `game.creator`
  (`ctx.sender()`). `reject_game`: solo la dirección de `game.opponent`. Cada caso denegado tiene `expected_failure`
  (SEG-2).
- **Tests esperados** (nombres = comportamiento, LIM-11; `expected_failure(abort_code = battleship::game::E…)` o
  `battleship::house::EWrongVersion`):
  1. `test_create_open_game_stores_fields_and_emits_event` — `creator`, `opponent` none, `bet`, `stake_value == bet`,
     `fee_rate` = el de la House, `house_id == object::id(&house)`, `version == house.version()`, `is_pending`; el ID
     está en `shared(&effects)`; `GameCreated` igual al esperado.
  2. `test_create_invite_game_stores_opponent` — `opponent == some(INVITEE)`; evento con el invitado.
  3. `test_create_copies_fee_rate_at_creation` — fee 250 → crear → fee 500: la partida conserva 250 (D-06 §3).
  4. `test_create_accepts_bet_equal_to_min_bet`
  5. `test_create_accepts_bet_equal_to_max_bet`
  6. `test_create_rejects_bet_below_min` — `EBetTooLow`
  7. `test_create_rejects_bet_above_max` — `EBetTooHigh`
  8. `test_create_rejects_self_invite` — `ESelfInvite` (apuesta válida)
  9. `test_create_rejects_house_with_wrong_version` — `house::EWrongVersion` con House en `NEWER_VERSION` **y** apuesta
     inválida (la versión se reporta primero; documenta que un paquete viejo no crea tras `migrate`).
  10. `test_cancel_refunds_full_stake_and_emits_event` — conservación: el creador recibe un `Coin` de valor `bet`;
      `stake_value == 0`; `is_cancelled`; `fees_collected` de la House sin cambios; `GameCancelled` con
      `cancelled_by = CREATOR` y `refund = bet`.
  11. `test_cancel_invite_game_by_creator` — el creador cancela su invitación (D-06 §4: sigue pudiendo).
  12. `test_cancel_rejects_other_address` — `ENotCreator` (OTHER)
  13. `test_cancel_rejects_invitee` — `ENotCreator` (el invitado rechaza, no cancela)
  14. `test_cancel_rejects_cancelled_game` — `ENotPending` (cancelar dos veces)
  15. `test_cancel_rejects_rejected_game` — `ENotPending`
  16. `test_reject_refunds_creator_and_emits_event` — el invitado rechaza: el **creador** recibe `bet`, el invitado no
      recibe `Coin`; `stake_value == 0`; `is_cancelled`; `fees_collected` sin cambios; evento con
      `cancelled_by = INVITEE`.
  17. `test_reject_rejects_other_address` — `ENotInvited` (OTHER)
  18. `test_reject_rejects_creator` — `ENotInvited`
  19. `test_reject_rejects_open_game` — `ENoInvitation`
  20. `test_reject_rejects_cancelled_game` — `ENotPending` (el creador canceló antes)
  21. `test_cancel_refunds_regardless_of_versions` — invariante D-12 §4: partida con `set_version_for_testing(OLDER)` y
      House con `NEWER_VERSION`: cancelar devuelve `bet` igual. **Ojo:** con la House en otra versión,
      `house.fees_collected()` aborta con `house::EWrongVersion`: aquí la House solo se lee con `version()` o no se
      lee; se verifican el `Coin` del creador, `stake_value == 0` y `is_cancelled`.
  22. `test_reject_refunds_regardless_of_versions` — ídem para rechazar (misma nota).
  23. `test_games_of_same_creator_are_independent` — dos partidas del mismo creador con IDs distintos; cancelar una
      deja la otra `Pending` con su `stake` intacto.
  24. `test_cancel_by_other_on_cancelled_game_reports_not_creator` — `ENotCreator`: el creador cancela y luego OTHER
      intenta cancelar; fija "authZ antes que estado" (no se filtra el estado al no autorizado).
  25. `test_create_reports_bet_error_before_self_invite` — `EBetTooLow`: apuesta < `min_bet` **y** auto-invitación;
      fija el orden de validación de `create_game`.
- **Criterio de aceptación (DoD):**
  - Structs, enum, firmas, visibilidades (`entry` sin `public` en las tres), eventos y abort codes exactamente como
    §Contrato on-chain, con las decisiones que confirme el usuario.
  - `sui move build -e testnet`: exit 0, 0 warnings. `--lint`: 0 lints. `sui move test -e testnet`: exit 0, 0 warnings,
    **≥ 51 tests** (26 de House + ≥ 25 de Game), todos PASS. Si #3 ya está en la branch, también con
    `--warnings-are-errors` (D-20261030-13). Coverage informativo (objetivo 100 % de `battleship::game`).
  - Contra el merge-base con `master`: diff vacío en `Move.toml`, `Move.lock` y `house.move`; en `house_tests.move`
    exactamente 2 líneas agregadas (la cabecera) y ninguna quitada.
  - `head -2` de `game.move`, `game_tests.move` y `house_tests.move` = las dos líneas de D-14.
  - Las firmas de `cancel_game`/`reject_game` no mencionan `House`, y `version` no aparece en ellas ni en `refund_creator`.
  - No existen `GamePool`, `GameRequest`, `TurnCap`, `init`, OTW, `Active`, `Clock` ni `epoch_timestamp_ms`.
- **Riesgos / rollback:** si `match` sobre `&game.state` o la comparación de enums no compila como se describe, el DEV
  usa la forma que compile sin warnings y la declara; si un enum con variante con campos sin construir produjera un
  warning (no previsto, `codes.rs:358-372`), STOP al MID con el output (no se silencia con `#[allow]`). Si la
  comparación de eventos con `Option` falla, se usan las lecturas `#[test_only]` + `event::num_events()` y se declara.
  Rollback: `git checkout master -- contracts/` (más borrar los dos archivos nuevos).
- **Handoff:** trasladar la nota de los tests 21-22 (no leer `fees_collected()` con la House en otra versión).

### TASK-2: `contracts/README.md` y docs del contrato — área: docs
- **Entregable:** sección Game del README y docs alineadas con TASK-1.
- **Archivos afectados:** `contracts/README.md`, `agents.md`, `documents/ESTANDARES.md`, `documents/STATUS.md`. **No
  tocar:** `contracts/sources/`, `contracts/tests/`, `documents/DECISIONES.md` (las decisiones las registra el
  orquestador al aprobarlas el usuario; el DEV solo cita IDs), `README.md` raíz (#16).
- **Cambios:**
  - `contracts/README.md`: fila de `sources/game.move` y `tests/game_tests.move` en la tabla de rutas; sección
    `battleship::game` con el mismo formato que House: objetos (`Game`, `GameState` y sus invariantes), **diagrama de
    estados** (`Pending → Cancelled` por cancelar/rechazar; `Pending → Resolved` por aceptar en #6, atómico),
    funciones (firma, visibilidad, quién puede, aborts **en orden**, evento), eventos, abort codes (incluida la nota
    de que `create_game` también aborta con `house::EWrongVersion` y que #11 mapea por módulo + código),
    autorización, flujo de fondos (cancelar/rechazar devuelven el 100 % al creador), **versionado del `Game`** (DV y
    el invariante: reembolsos sin chequeo de versión ni House; tras un upgrade + `migrate`, las partidas pendientes
    de versiones anteriores solo se cancelan o rechazan, salvo que la versión nueva decida aceptarlas; `GameState` y
    el layout de `Game` se congelan en #8, así que #18 requiere un objeto nuevo o dynamic fields), comisión copiada
    al crear, carreras (`ENotPending` sin pérdida del `Coin`), PTB (`splitCoins` + `Option<address>` puro), hora de
    creación desde el evento (D6 c), objeto terminal conservado (D3 a) con el **depósito de storage no recuperable**
    (≈ 0,002–0,003 SUI; valor exacto del smoke de #6). Marcar lo que agrega #6.
  - Subsección **"Lectura desde la app"** (la necesita el parser de #10): se lee con `getObject` con contenido; todos
    los campos del `Game` llegan por RPC aunque no haya getters Move (no hay `public` a propósito, PROY-4: se pueden
    agregar después de forma compatible); `stake` llega como el valor del `Balance`; `state` en JSON-RPC llega como
    `{"variant": "Pending", "fields": {}}` (y `Resolved` con `fields: {acceptor, winner}`)
    (`crates/sui-json-rpc-types/src/sui_move.rs:513-534` @ `testnet-v1.83.0`) y en gRPC/GraphQL como un objeto con
    `"@variant"` (`crates/sui-types/src/object/rpc_visitor/mod.rs:247-256`); el parser de #10 usa **un** formato y
    trata una variante desconocida como error, nunca como `Pending` (SEG-10); la hora de creación es el
    `timestampMs` del evento `GameCreated` (`crates/sui-json-rpc-types/src/sui_event.rs:62`).
  - `agents.md`: §2 (sin cambios de layout, verificar); §6 — reescribir la nota de cabecera (lo de partidas queda
    confirmado por D-06 y por las decisiones de este plan; sigue abierta la base de la comisión, #6) y los bullets
    **Estados** (`Pending → Cancelled | Resolved`, sin `Active`), **Cancelación** (creador cancela, invitado rechaza,
    100 % al creador, sin comisión, sin expiración, nunca bloqueado por versión), **Coinflip** (aceptar resuelve en la
    misma transacción, #6) y **Fondos** (`stake: Balance<SUI>` en el `Game`, Escrow absorbido); §7 gotcha nuevo
    (tras `migrate` de la House, `create_game` del paquete viejo aborta con `house::EWrongVersion` y las partidas
    pendientes de versiones anteriores solo se cancelan o rechazan, salvo que la versión nueva decida aceptarlas;
    cancelar y rechazar siguen funcionando en cualquier versión); §8 API real de `battleship::game` (#5) + lo que
    agrega #6 + "`GameState` y el layout de `Game` quedan cerrados en #8: #18 usa un objeto nuevo o dynamic fields";
    §9 campos reales de `Game` (sin timestamps).
  - `documents/ESTANDARES.md`: PROY-7 (eventos `GameCreated`, `GameCancelled`; los de resolución los fija #6);
    PROY-8 (`GameState` = `Pending | Cancelled | Resolved`); PROY-10 (mecánica de `Game`: `version` fijada al crear,
    chequeada solo fuera de los reembolsos; `GameState` no admite variantes nuevas tras publicar); versión del encabezado.
  - `documents/STATUS.md`: H7 parcial (pool, escrow, `TurnCap` y estados resueltos en #5; resolución en #6), H9
    parcial (suite de Game), tabla del roadmap (Game 🚧, Escrow absorbido), baseline nuevo de contracts con el SHA que
    indique el orquestador, fila del ciclo activo.
- **AuthZ:** no aplica (docs).
- **Criterio de aceptación:** tablas del README 1:1 con `game.move` de TASK-1 (el MID lo contrasta función por
  función y código por código); `grep -nE "Active|resolve_game|GameAccepted" agents.md documents/ESTANDARES.md
  contracts/README.md` solo devuelve menciones explícitas a #6 o históricas; sin secretos; sin cambios en código.
- **Tests esperados:** no aplica (docs); el DEV re-corre build y test para confirmar cero delta respecto de TASK-1.
- **Riesgos / rollback:** desalineación tabla ↔ código (mitigada por la revisión 1:1). Rollback: revertir los archivos de docs.

**Al aprobarse el plan (orquestador):** comentar en el issue #18 que `GameState` y el layout de `Game` se congelan en
#8 y que la batalla naval real necesitará un objeto nuevo o dynamic fields.

**Suma de tasks = issue #5 (+ D-06 §4):** criterios 1-6 del issue y el rechazo del invitado en TASK-1; criterio 7
(README) y 9 (docs) en TASK-2; criterio 8 (gates) en ambos. "CI verde": si #3 se mergea antes del PR, la CI gatea el
PR; #5 no toca CI. **Smoke: no aplica** (el issue lo difiere a #6, que recorre el ciclo completo en localnet).

## Verificación que el DEV pega en cada reporte (comando + output completo)

Desde la raíz del repo (cada `cd` en subshell), con la config sin claves de D-07. Todo `sui` lleva el guard delante:

```bash
sui --version
printf 'n\n' | sui client active-env
(cd contracts && printf 'n\n' | sui move build -e testnet); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet); echo "exit=$?"
# solo si .github/workflows/ ya existe en la branch (merge de #3), el gate de CI (D-20261030-13):
(cd contracts && printf 'n\n' | sui move build -e testnet --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet --warnings-are-errors); echo "exit=$?"
# solo TASK-1 (informativo):
(cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
git status --porcelain
# base fija: merge-base con master (si #3 se mergea antes, no se cuelan cambios ajenos)
B=$(git merge-base master HEAD); echo "merge-base=$B"
# sin repin y sin tocar House (house_tests.move: solo +2 líneas de cabecera):
git diff --stat "$B" -- contracts/Move.toml contracts/Move.lock contracts/sources/house.move
git diff --numstat "$B" -- contracts/tests/house_tests.move
# licencia, legado, authZ e invariante de reembolso:
head -2 contracts/sources/game.move contracts/tests/game_tests.move contracts/tests/house_tests.move
grep -nE "GamePool|GameRequest|TurnCap|fun init|Active|Clock|epoch_timestamp_ms" contracts/sources/game.move
grep -n "ctx.sender()" contracts/sources/game.move
grep -nE "fun (cancel_game|reject_game|refund_creator)" contracts/sources/game.move
grep -n "version" contracts/sources/game.move
# secretos: solo líneas agregadas del diff + archivos nuevos sin trackear
git diff -U0 "$B" | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
```

**Resultados esperados:** `active-env` imprime `testnet`; exits 0; 0 warnings; 0 lints; ≥ 51 tests PASS (TASK-1);
`git diff --stat` vacío; `--numstat` de `house_tests.move` = `2	0` (en TASK-2, igual: viene de TASK-1); `head -2` = las
dos líneas de D-14 en los tres archivos; grep de legado vacío; `ctx.sender()` solo dentro de `create_game`,
`cancel_game` y `reject_game`; las firmas de `cancel_game`/`reject_game`/`refund_creator` sin `House`; `version` solo
en el campo del struct, en el `Pack` de `create_game` (`house.version()`), en comentarios y en los helpers
`#[test_only]` (nunca en `cancel_game`/`reject_game`/`refund_creator`). En TASK-2 se omiten los comandos de coverage.

**Greps de secretos — matches esperados** (no se excluyen rutas; se declaran):
- Artefactos de proceso de `documents/` que contienen el propio patrón o hablan de claves: este plan, su revisión,
  el handoff, los reportes y las revisiones de este ciclo (en el diff o sin trackear).
- En TASK-2, líneas de `agents.md` y `documents/ESTANDARES.md` que nombran `keystore`/`recovery` a propósito (SEG-3,
  §7, §11), solo si el diff las toca.
- En `contracts/` (código, tests y README): **ningún** match.

El DEV pega el output completo y clasifica cada match. **Cualquier otro match es BLOCKER** (SEG-3). Nada de
`sui client` salvo `printf 'n\n' | sui client active-env`; nunca leer, crear ni pegar `client.yaml` ni claves.

## Changelog

- **v1.1 (2026-10-30)**, aplica `documents/REVISION_PLAN_GAME.md`:
  - MAJOR 1: D3 cuantifica el depósito de storage (≈ 0,002–0,003 SUI, 2–3 × `min_bet`, con fórmula y citas de
    `sui-protocol-config`), dice quién cobra el rebate en (b) por camino, agrega la reversibilidad de (a) e
    irreversibilidad de (b), la medición en el smoke de #6 y la nota para #11; flujo de fondos y README lo reflejan.
  - MINOR 2: helpers `#[test_only]` con sufijo `_for_testing`; `is_pending` queda solo como helper privado.
  - MINOR 3: #6 compara `game.version == house.version()` tras una lectura versionada de la House; consecuencia de
    producto (pendientes viejas solo se cancelan/rechazan) en DV, tabla para #6, README y `agents.md` §7.
  - MINOR 4: subsección "Lectura desde la app" en el README (forma del enum en JSON-RPC y gRPC/GraphQL, sin getters).
  - MINOR 5: impacto en #18 (`GameState`/layout cerrados) en §Contrato on-chain, README, PROY-10, `agents.md` §8 y
    comentario en el issue #18; corregida la justificación de fijar `Resolved` ahora.
  - MINOR 6: tests 24-25 de orden de aborts; DoD ≥ 25 tests de Game / ≥ 51 en total.
  - MINOR 7: rutas del ejecutor con `sui-execution/latest/` (y por qué rige), `entry_points_verifier.rs:222-260`,
    `private_entry_arguments.rs:381-395, 426-445, 497-529`, `compatibility*.rs` con rangos corregidos.
  - S8: diffs contra `git merge-base master HEAD`. S9: `///` en los campos de `Game`. S11: nota de tests 21-22.
  - S10 (resuelto por el orquestador): cabecera D-14 en `game_tests.move` y, en el mismo PR, en `house_tests.move`.
- **v1 (2026-10-30):** primera versión.
