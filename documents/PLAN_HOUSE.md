# PLAN_HOUSE v1.1
> Issue: #4 (+ contexto de producto #5, #6) | Áreas: contracts / docs | Fecha: 2026-10-30
> Branch: `feature/issue-4-house` (desde `master` @ `f303ef9`) | Autor: MID | Estado: **v1.1 para re-revisión de forma del MAYOR**
> (aplica `documents/REVISION_PLAN_HOUSE.md`: MAJOR 1, MINOR 2-7, S1-S4; cambios en §Changelog al final)
> Decisiones aplicadas sin reabrir: D-20261030-06 (§5: `HouseCap` transferible; §3: el `Game` copia el
> `fee_rate` al crear; §1: resolución atómica al aceptar), -07 (config sin claves), -08 (framework por
> `Move.lock`), -10 (monorepo). **STOP pendientes:** D1, D2, D3-mecanismo, D4, D5, D6, D7 (§Decisiones abiertas).

## Historia de usuario

**Como** owner/administrador de la House, **quiero** que cambiar la comisión, cambiar los límites de
apuesta y retirar las comisiones acumuladas exija tener el `HouseCap`, que ese `HouseCap` lo pueda pasar
a otra wallet mía, y que las comisiones solo puedan entrar a la House desde el propio paquete, **para**
que nadie más pueda tocar la configuración ni los fondos de la House y para que el módulo Game (#5, #6)
se construya sobre una API de House estable y testeada.

**Scope en una frase:** el módulo `battleship::house` final del MVP (una House compartida creada al
publicar, administración por `&HouseCap` transferible, límites configurables y validados, `add_fees`
solo para el paquete, eventos de admin, abort codes propios), su suite de tests y `contracts/README.md`.

**Lo que NO entrega:** el módulo Game, el cálculo de la comisión y el denominador de basis points (#5,
#6); la CI (#3); la app y el panel admin (#9, #14); el formato de `deployments/` y la publicación (#7,
#8); el repin del framework (H13, pre-vuelo de #8); la política de upgrades (salvo la pieza de layout
que no se puede decidir después: el campo de versión de la House, STOP D7).

## Contexto y alcance

Estado actual de `contracts/sources/house.move` (único módulo del paquete, baseline verde de
`documents/STATUS.md`: build 0 warnings, 1 lint, 0 tests):

| # | Evidencia | Problema | Regla |
|---|---|---|---|
| H3 | `house.move:47,59-61` | `initialize_house` recibe el `HouseCap` por valor y lo destruye: el cap creado en `init` (`:36-44`) solo sirve una vez | PROY-3, SEG-2 |
| H3 | `house.move:54,68,75` | la authZ de admin es `ctx.sender() == house.admin` | PROY-3, SEG-2 |
| H3 | `house.move:81` | `withdraw_fees` transfiere siempre a `house.admin` | SEG-4 (diseño de salida) |
| H4 | `house.move:14-15,48,69,78` | `EInsufficientBalance` cubre fee > 1000 y fees = 0; `ECallerNotHouse` deja de tener sentido con el cap | LIM-8, PROY-2, LIM-3 |
| LIM-6 | `house.move:48,55-56,69` | `1000`, `50_000_000_000`, `1_000_000` literales | LIM-6 |
| H5 | `house.move:84-99` | sin `add_fees`, sin accessors/setters de `min_bet`/`max_bet`, sin eventos | PROY-4, PROY-7 |
| H12 | `house.move:67` | lint `WSL06010` (`prefer_mut_tx_context`): `update_fee_rate` es `public` con `&TxContext`; tras #8 la firma queda congelada (PROY-10) | PROY-10, LIM-9 |
| H9 | `house.move:101-104` | `init_for_testing` sin llamadores; 0 tests | PROY-9 |
| D-06 §5 | `house.move:28-30` | `HouseCap has key`: hoy solo `init` lo transfiere; el usuario pidió que sea transferible | PROY-3 |

Gancho de coverage heredado de #2 (comentario del issue, 2026-10-30): con 0 tests la CLI no escribía el
mapa de coverage; #4 verifica los nombres reales de los artefactos de `--coverage` y que `.gitignore`
(`contracts/build/`, `contracts/traces/`, `.trace`, `.coverage*`, líneas 2-5) los cubre.

**Alcance:** `contracts/sources/house.move` (reescritura), `contracts/tests/house_tests.move` (nuevo),
`contracts/README.md` (nuevo), y docs: `agents.md` (§2, §6, §7, §8, §9, §12, §14), `documents/STATUS.md`,
`documents/ESTANDARES.md` (texto que cita `EInsufficientBalance`/legado de `house.move`).
`.gitignore` solo si el gancho de coverage encuentra un artefacto sin cubrir.

**Fuera de alcance:** ver HU. No se tocan `Move.toml` ni `Move.lock` (sin repin, H13); no se crea
`app/`, `.github/` ni `contracts/deployments/`; no se corre `sui client` (salvo `active-env`) ni se publica.

## Contrato on-chain

Paquete **no publicado**: el layout y las firmas pueden cambiar libremente hasta #8; desde la primera
publicación quedan congelados (PROY-10): firmas `public`, layout y **habilidades** de `House`/`HouseCap`
(las habilidades de un struct no cambian en un upgrade, `compatibility.rs:283-292` @ `testnet-v1.83.0`;
por eso D3 es irreversible tras #8), eventos y números de abort code. Las funciones `entry` no `public`
sí pueden cambiar o desaparecer en versiones nuevas (`compatibility.rs:35,80`), pero **toda versión
anterior del paquete sigue siendo invocable** tras un upgrade (docs.sui.io, guía de upgrades): un fix
publicado como upgrade no cierra el camino viejo sobre la misma House compartida salvo con versionado
(STOP D7). No hay `app/src/sui/` todavía: el mapeo de aborts llega en #11 desde la tabla de
`contracts/README.md`.

Lo que sigue asume las **recomendaciones** (D1 a + fee por defecto 200 bps, D2 a, D3 c con
`transfer_house_cap` `entry`, D4 a + abortar en 0, D5 a, D6 mantener, D7 a sin `version`).
§Decisiones abiertas dice qué cambia con cada alternativa.

### Constantes (LIM-6)

```move
const MAX_FEE_BPS: u16 = 1000;               // 10 %
const DEFAULT_FEE_BPS: u16 = 200;            // D1: 2 % (o 0, según el usuario)
const DEFAULT_MIN_BET: u64 = 1_000_000;      // 0,001 SUI (D6)
const DEFAULT_MAX_BET: u64 = 50_000_000_000; // 50 SUI (D6)
```

El denominador `10_000` **no** se define aquí: vive donde se calcula la comisión (#6, LIM-5/LIM-6).

### Abort codes (D5 a: `const E…: u64`)

| Código | Constante | Condición | Función |
|---|---|---|---|
| 0 | `EFeeTooHigh` | `new_fee_rate > MAX_FEE_BPS` | `update_fee_rate` |
| 1 | `EInvalidBetLimits` | `min_bet == 0` o `min_bet > max_bet` | `update_bet_limits` |
| 2 | `ENoFeesToWithdraw` | `fees_collected == 0` (D4: abortar en 0) | `withdraw_fees` |

Se eliminan `ECallerNotHouse` y `EInsufficientBalance` (LIM-3).
> Decisión (2026-10-30): la numeración arranca en 0 aunque reutilice los números de las constantes
> legadas, porque el paquete nunca se publicó y no hay consumidor de los códigos viejos — MID, detalle interno.

`EInvalidBetLimits` agrupa `min_bet == 0` y `min_bet > max_bet` como una sola condición ("límites
inválidos"), tal como lo redacta el criterio del issue.

### Structs

```move
public struct House has key {          // compartida; sin `store`
    id: UID,
    fee_rate: u16,                     // basis points; <= MAX_FEE_BPS
    fees_collected: Balance<SUI>,
    min_bet: u64,
    max_bet: u64,                      // invariante: 0 < min_bet <= max_bet
}                                      // D2 a: se elimina `admin: address` (house.move:22)
                                       // D7 a: sin campo `version` (con D7 b: `version: u64`)

public struct HouseCap has key {       // D3 c: sin `store`; se transfiere solo con transfer_house_cap
    id: UID,
}

public struct HOUSE has drop {}        // OTW, sin cambios
```

### Funciones

| Función | Visibilidad | Quién puede | Notas |
|---|---|---|---|
| `fun init(otw: HOUSE, ctx: &mut TxContext)` | privada | runtime al publicar | `claim_and_keep` (sin cambios, `house.move:37`); crea y **comparte** la House con los `DEFAULT_*`; transfiere el único `HouseCap` al publicador |
| `update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16)` | `entry` | titular del `HouseCap` | `assert!(new_fee_rate <= MAX_FEE_BPS, EFeeTooHigh)`; emite `FeeRateUpdated`. **Sin `ctx`** (cierra H12) |
| `update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64)` | `entry` | titular del `HouseCap` | `assert!(min_bet > 0 && min_bet <= max_bet, EInvalidBetLimits)`; emite `BetLimitsUpdated` |
| `withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI>` | `public` (deliberado) | titular del `HouseCap` | `assert!(value > 0, ENoFeesToWithdraw)`; `coin::from_balance(house.fees_collected.withdraw_all(), ctx)`; emite `FeesWithdrawn`; devuelve el `Coin` (la PTB decide el destino) |
| `transfer_house_cap(cap: HouseCap, recipient: address)` | `entry` | titular del `HouseCap` (lo pasa por valor) | emite `HouseCapTransferred` y llama `transfer::transfer(cap, recipient)` (único lugar fuera de `init` que mueve el cap) |
| `add_fees(house: &mut House, fees: Balance<SUI>)` | `public(package)` | solo módulos del paquete (`game`, #6) | `house.fees_collected.join(fees)`; única vía de ingreso de fondos (SEG-4, ARQ-1). Acepta `Balance` de valor 0 (fee 0 en #6). Sin evento: `GameResolved` (#6) lleva la comisión |
| `fee_rate(house: &House): u16` | `public` | cualquiera | lo copia el `Game` al crear (D-20261030-06 §3) |
| `fees_collected(house: &House): u64` | `public` | cualquiera | |
| `min_bet(house: &House): u64` / `max_bet(house: &House): u64` | `public` | cualquiera | validación de la apuesta en #5 |
| `init_for_testing(ctx: &mut TxContext)` | `#[test_only] public` | tests | ya existe (`house.move:101-104`) |

- **Visibilidad (PROY-4):** `withdraw_fees` es `public` a propósito: devuelve un `Coin` que la PTB
  encadena (`TransferObjects`, o en el futuro otro MoveCall), y una función `entry` no puede devolver un
  valor sin `drop`. Las otras tres de admin no tienen consumidor componible: con un `HouseCap` sin
  `store` ningún otro paquete puede custodiarlo, así que componerlas desde Move no aporta nada; como
  `entry` (no `public`) se llaman igual desde una PTB o con `sui client call`, y su firma no queda
  congelada en versiones nuevas (`compatibility.rs:35,80`). Los tests pueden llamar funciones `entry` de
  otro módulo en modo test (`typing/core.rs:2262-2270, 2388-2409` @ `testnet-v1.83.0`).
  > Decisión (2026-10-30): `entry` sobre `public` para `update_fee_rate`, `update_bet_limits` y
  > `transfer_house_cap` porque no hay consumidor componible y así su firma no se congela (hallazgo 4 del
  > MAYOR) — MID, detalle de diseño del plan.
- Se eliminan `initialize_house` (`house.move:47-64`, D1 a) y `admin()` (`house.move:96-99`, D2 a).
- El ID de la House para #5 (`house_id`) sale de `object::id(house)` (`sui::object::id<T: key>`,
  `object.move:254` @ `719fb29`): no hace falta accessor propio (ARQ-7).
- `ctx.sender()` queda solo en `init` (destino del cap), nunca para autorizar.
- Ninguna función `public` nueva o tocada recibe `&TxContext` (H12); `withdraw_fees` usa `&mut`.
- Límites y partidas existentes: `min_bet`/`max_bet` solo se aplican al **crear** una partida (#5);
  cambiarlos no afecta a las `Pending` ya creadas, y con resolución atómica (D-06 §1) aceptar solo exige
  el monto exacto. Va al README (S3).

### Eventos (PROY-7, `has copy, drop`)

| Evento | Campos | Emite |
|---|---|---|
| `FeeRateUpdated` | `house_id: ID`, `old_fee_rate: u16`, `new_fee_rate: u16` | `update_fee_rate` |
| `BetLimitsUpdated` | `house_id: ID`, `old_min_bet: u64`, `old_max_bet: u64`, `new_min_bet: u64`, `new_max_bet: u64` | `update_bet_limits` |
| `FeesWithdrawn` | `house_id: ID`, `amount: u64` | `withdraw_fees` |
| `HouseCapTransferred` | `cap_id: ID`, `recipient: address` | `transfer_house_cap` |

El remitente del cap no va en el evento: es el sender de la transacción, visible en los metadatos del
evento. `HouseCapTransferred` no lleva `house_id` porque el cap no está ligado a un objeto House (con D1
a hay una sola House por paquete).

### Lo que #5 y #6 consumen de esta API

| Necesidad | API |
|---|---|
| Validar apuesta (#5) | `min_bet(&House)`, `max_bet(&House)` (lectura con `&House`, sin contención) |
| Copiar la comisión al crear (#5, D-06 §3) | `fee_rate(&House): u16` |
| Fijar la House de la partida (#5, `EWrongHouse` en #6) | `object::id(house)` |
| Depositar la comisión al aceptar/resolver (#6, D-06 §1) | `add_fees(&mut House, Balance<SUI>)` |
| Retiro por el admin en el smoke de #6 y en #14 | `withdraw_fees` + `TransferObjects` en la PTB |

## Flujo de fondos

| Camino | Entrada | Custodia | Salida | Comisión |
|---|---|---|---|---|
| Comisión de una partida (#6) | `Balance<SUI>` vía `add_fees` (solo `battleship::game`) | `House.fees_collected: Balance<SUI>` | — | ya descontada en #6 |
| Retiro de comisiones | — | `fees_collected` | `Coin<SUI>` devuelto al llamador con el `HouseCap` (D4 a), por el total | ninguna |

**Invariante:** `fees_collected` después = antes + Σ `add_fees` − monto retirado; el `Coin` retirado vale
exactamente `fees_collected` antes del retiro y deja 0. Ninguna otra función crea, destruye ni mueve
`Balance<SUI>`. La House nunca custodia apuestas (viven en el `Game`, #5). Si el `HouseCap` se pierde,
las comisiones quedan bloqueadas para siempre y la configuración ya no se puede cambiar: es inherente a
cualquier capability y se documenta en `contracts/README.md` (§TASK-2, "Qué pasa si se pierde el cap").
El caso más probable no es `@0x0` sino enviarlo a un **ID de objeto** (p. ej. el ID de la House que
muestra el panel): un `HouseCap` sin `store` solo se recupera con `transfer::receive`, restringido al
módulo `house` (`transfer.move:136-139` @ `719fb29`), y `house` no lo expone, así que queda huérfano.

## Decisiones abiertas → STOP

> El orquestador presenta D1, D2, D4, D5, D6 y D7 al usuario. Este plan asume las recomendaciones
> (del issue para D1-D6, del MAYOR para D7); **cada una queda STOP pendiente de confirmación del
> usuario** y el handoff no se genera hasta tenerlas. D3 (transferible) ya está resuelta
> (D-20261030-06 §5); lo pendiente es el **mecanismo**, que propone este plan, ya revisado por el MAYOR
> (`documents/REVISION_PLAN_HOUSE.md`: "ratificar (c)"), y que necesita la ratificación del usuario.

### D1 — Creación de la House + fee por defecto — STOP pendiente de confirmación del usuario
- **Evidencia:** `house.move:36-44` (`init` solo crea el cap) y `:47-64` (`initialize_house` lo consume).
- **Opciones:** (a) `init` crea y comparte la House con valores por defecto y entrega el `HouseCap`; se
  elimina `initialize_house`. (b) `initialize_house(&HouseCap, fee, ctx)` sin consumir el cap: varias
  Houses. (c) cap de inicialización separado que se consume.
- **Recomendación:** (a) (una House, sin paso post-publicación ni estado "no inicializada").
- **Si el usuario elige (b):** `HouseCap` gana `house_id: ID` y `initialize_house` crea un cap por House;
  cada función de admin agrega `assert!(cap.house_id == object::id(house), EWrongHouseCap)` + test del cap
  de otra House (aborto nuevo); `HouseCapTransferred` gana `house_id: ID`; #5 tiene que exigir
  `house_id` y #7/#8 registran N IDs. TASK-1 crece ~30 %.
- **Si elige (c):** struct `HouseInitCap` nuevo, consumido por `initialize_house(init_cap, fee, ctx)` que
  crea House + `HouseCap`; paso extra obligatorio en #8 y tests del camino de inicialización.
- **Sub-decisión: fee por defecto** (solo con a):
  - (i) `DEFAULT_FEE_BPS = 0` y el owner ejecuta `update_fee_rate` tras publicar. Pro: no fija hoy un
    número de producto. Contra: reintroduce un paso post-publicación (lo que (a) quería evitar) y las
    partidas creadas antes de ese paso copian fee 0 para siempre (D-06 §3).
  - (ii) Valor fijo, p. ej. `DEFAULT_FEE_BPS = 200` (2 %). Pro: la House queda operativa al publicar,
    sin ventana con fee 0. Contra: el número lo decide el usuario hoy (ajustable después con `update_fee_rate`).
  - **Recomendación:** (ii) con el valor que elija el usuario (200 bps si no tiene otro en mente). La
    ventana de (i) es corta (dos transacciones del owner), pero las partidas creadas y aceptadas en ella
    cobran 0 % para siempre, y el riesgo real es **olvidar** el paso y dejar fee 0 indefinidamente; como
    `init` no recibe parámetros, la constante es la única forma de evitar ese paso. Cambiar el valor solo
    toca la constante, el test de estado inicial y el README.

### D2 — Campo `admin` y accessor `admin()` — STOP pendiente de confirmación del usuario
- **Evidencia:** `house.move:22,54,97-99`.
- **Opciones:** (a) eliminarlos; (b) mantenerlos como dato informativo.
- **Recomendación:** (a). Con un `HouseCap` transferible (D-06 §5), `admin` se desincroniza en la primera
  transferencia salvo que `transfer_house_cap` también reciba `&mut House` (otro parámetro y una
  escritura sobre el objeto compartido). El titular se deduce de los objetos de la wallet (#14) y, con
  D3 (c), de la traza `init` + `HouseCapTransferred`.
- **Si elige (b):** se conserva el campo y el accessor; hay que elegir entre `transfer_house_cap(cap,
  house: &mut House, recipient)` que lo actualiza (y test de sincronía) o documentarlo como "dirección
  publicadora" sin valor de autorización (renombrar a `publisher` para no confundir).

### D3 — Mecanismo de transferencia del `HouseCap` — propuesta del MID, pendiente de MAYOR + usuario
- **Evidencia:** `house.move:28-30` (`has key`); `transfer.move:54,63,109,129` @ `719fb29` (`transfer`
  restringido al módulo definidor; `public_transfer`, `public_freeze_object`, `public_share_object`
  exigen `key + store`); lints de la CLI 1.83 `freezing_capability` y `custom_state_change`
  (`sui_mode/linters/mod.rs:97,133` @ `testnet-v1.83.0`). Tras #8 las habilidades de `HouseCap` no se
  pueden cambiar (`compatibility.rs:283-292`).
- **Lo que ninguna opción evita:** si el titular firma una transacción maliciosa (p. ej. una dApp de
  phishing), el cap se puede robar en ambas: en (b) con `TransferObjects`, en (c) con
  `transfer_house_cap(cap, atacante)`. La diferencia está en lo que se puede hacer **además** de transferirlo.
- **(b) `HouseCap has key, store`.** Pros: cero código; cualquier wallet lo envía con "Send"
  (`TransferObjects` en la PTB). Contras exclusivos de (b): una PTB del titular puede llamar
  `transfer::public_freeze_object<HouseCap>` (`transfer.move:109`) y un objeto congelado lo puede pasar
  como `&HouseCap` **cualquiera** ⇒ cualquiera actualiza fees/límites y retira las comisiones (compromiso
  total e irreversible; el lint `freezing_capability` solo mira el código del paquete, no una PTB);
  además se puede envolver en otros objetos, guardar en dynamic fields, listar en un Kiosk o venderse; la
  superficie de `store` **crece con el framework** (`public_party_transfer`, `transfer.move:91`, hoy
  limitado a un dueño único; `public_share_object` hoy aborta con objetos no nuevos y "this restriction
  may be relaxed in the future", `:126-127`) mientras que la habilidad no se puede quitar nunca; no hay
  evento propio; exige excepción registrada a PROY-3.
- **(c) `has key` + `entry fun transfer_house_cap(cap: HouseCap, recipient: address)`.** Pros: el cap no
  se puede congelar, compartir, envolver, guardar en dynamic fields ni en un Kiosk, ni recibir fuera de
  `house`; la única salida es `transfer_house_cap`, así que `init` + `HouseCapTransferred` dan una traza
  **completa** del titular; cumple PROY-3 tal como está ("transferencia controlada"); `custom_state_change`
  no aplica (solo marca tipos con `store`). Contras: una función `entry` más, un evento y dos tests; las
  wallets no lo envían con "Send": se transfiere con `sui client call` o desde el panel admin (#14).
  Agregar más adelante un traspaso en dos pasos es **aditivo**: la `transfer_house_cap` de la v1 sigue
  invocable para siempre en el paquete original (§Contrato on-chain), así que el paso único no se puede retirar.
- **Variante descartada (d):** traspaso en dos pasos (ofrecer + aceptar) que evita perderlo por una
  dirección equivocada: más estado y más API sin necesidad en el MVP (ARQ-7).
- **Guard de destinatario:** no se propone `assert!` en el contrato: una dirección equivocada cualquiera
  es igual de irrecuperable. El caso probable es un **ID de objeto** (§Flujo de fondos); queda en el README
  y como nota para #14: validar formato (SEG-9) **y** que el destinatario no sea un objeto existente
  (`getObject` devuelve un objeto ⇒ rechazar).
- **Recomendación del MID (ratificada por el MAYOR):** (c), con `transfer_house_cap` `entry`.
- **Si se elige (b):** `HouseCap has key, store`; sin `transfer_house_cap` ni `HouseCapTransferred`; el
  test de transferencia usa `transfer::public_transfer`; README con la advertencia de congelamiento;
  DECISIONES registra la excepción a PROY-3; `agents.md` §12 lo refleja.

### D4 — Retiro de fees — STOP pendiente de confirmación del usuario
- **Evidencia:** `house.move:74-82`.
- **Opciones:** (a) devuelve `Coin<SUI>` (componible); (b) transfiere a `ctx.sender()`; (c) parámetro
  `recipient: address`. Con fees = 0: abortar con `ENoFeesToWithdraw` o devolver un `Coin` de valor 0.
- **Recomendación:** (a) + abortar en 0 (un retiro vacío es un error del admin y no crea objetos `Coin` de 0).
- **Si elige (b):** sin valor de retorno. Como `public`, la CLI 1.83 emite el lint `self_transfer`
  (transferir un `key + store` a `ctx.sender()` fuera de `init`, de tests y de funciones `entry`,
  `self_transfer.rs:80-93` @ `testnet-v1.83.0`), lo que choca con el criterio H12 "sin lints" y exigiría
  `#[allow(lint(self_transfer))]` justificado. Como `entry fun` no hay lint, pero no es componible: no
  devuelve el `Coin` ni se encadena con otras llamadas Move. La recomendación (a) no cambia.
- **Si elige (c):** firma `withdraw_fees(house, _: &HouseCap, recipient: address, ctx: &mut TxContext)`;
  `FeesWithdrawn` gana `recipient: address`.
- **Si elige Coin de 0:** desaparece `ENoFeesToWithdraw` (los códigos quedan 0 y 1); el test de fees = 0
  verifica un `Coin` de valor 0 y un evento con `amount: 0`.

### D5 — Estilo de abort codes del paquete — STOP pendiente de confirmación del usuario
- **Evidencia:** `house.move:14-15`; aplica también a `game` (#5, #6), ARQ-4, PROY-2.
- **Opciones:** (a) `const EAlgo: u64 = N;`; (b) `#[error] const EAlgo: vector<u8> = b"...";` (Move 2024).
- **Recomendación:** (a): mapeo trivial y estable en `app/src/sui/errors.ts` (#11).
- **Evidencia adicional (MAYOR):** el u64 de un `#[error]` codifica el **número de línea**
  (`move-command-line-common/src/error_bitset.rs:17` @ `testnet-v1.83.0`): cambia al mover código, contra
  el "número estable" de PROY-2, salvo que #11 decodifique siempre por nombre.
- **Si elige (b):** las constantes pasan a `vector<u8>` con mensaje; hay que verificar en TASK-1 cómo lo
  expone el SDK de TypeScript y cómo se escribe `#[expected_failure]` contra esas constantes; la tabla del
  README lista nombres y mensajes en lugar de números; el plan de #11 cambia a decodificar por nombre.

### D6 — Límites por defecto — STOP pendiente de confirmación del usuario
- **Evidencia:** `house.move:55-56`, `agents.md` §6.
- **Recomendación:** mantener 0,001 SUI (`1_000_000` MIST) y 50 SUI (`50_000_000_000` MIST).
- **Si cambian:** solo las dos constantes, el test de estado inicial, el README y `agents.md` §6.

### D7 — Versionado de la House compartida (nuevo en v1.1, MAJOR 1 del MAYOR) — STOP pendiente de confirmación del usuario
- **Problema:** tras un upgrade, toda versión anterior del paquete sigue invocable ("any transaction or
  package that references an old version's package ID can still call it", docs.sui.io, guía de
  upgrades), y el layout de `House` no puede cambiar en un upgrade compatible (`compatibility.rs:77-83,
  283-292` @ `testnet-v1.83.0`; el adapter aplica `Compatibility::upgrade_check()`,
  `static_programmable_transactions/execution/context.rs:2605-2606`). Sin un campo de versión en la
  House, un fix publicado como upgrade **no** cierra el camino viejo: si aparece un bug en
  `update_bet_limits` v1 o en `game` v1 (#6, que escribe la House por `add_fees`), cualquiera sigue
  llamando a v1 contra la misma House. La política de upgrades queda fuera de #4, pero esta pieza de
  layout se decide ahora o no se decide nunca.
- **(a) Sin campo `version` (MVP en testnet).** El camino de corrección tras #8 es **republicar**: House
  e IDs nuevos, retirar antes las fees de la House vieja, repetir #7/#8; las partidas `Pending` del
  paquete viejo siguen en él (el creador las cancela allí). Pros: layout y API mínimos, sin abort ni
  función extra. Contras: un bug grave en producción no se arregla con upgrade. Se documenta en
  `contracts/README.md` y en DECISIONES, con **revisión obligatoria antes de cualquier mainnet**.
- **(b) `version: u64` en `House`.** `const VERSION: u64 = 1;`, abort `EWrongVersion` (código 3),
  `assert!(house.version == VERSION, EWrongVersion)` en toda función que reciba `&mut House`
  (`update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `add_fees`), y `entry fun migrate(house: &mut
  House, _: &HouseCap)` con su propio abort si `house.version >= VERSION` (`ENotUpgrade`, código 4) y
  evento. Las lecturas con `&House` de #5 tendrían que validar también vía un `public(package) fun
  assert_version(house: &House)` (decisión de #5). Impacto: `Game` en #5 replica el patrón; TASK-1 suma 2
  abort codes, 1 función, 1 evento, un helper `#[test_only]` para simular una House de versión distinta
  y ~4 tests (versión incorrecta por función de escritura + `migrate` happy/abort); README y #11 suman
  los códigos.
- **Recomendación (MAYOR y MID):** (a) para el MVP en testnet. Elegir (b) si el usuario prevé upgrades
  en testnet con fees reales acumuladas o un paso cercano a mainnet.

## Tasks (ordenados por dependencia; contratos antes que docs)

### TASK-1: Módulo `battleship::house` final + suite de tests + gancho de coverage — área: contracts
- **Entregable:** `house.move` reescrito según §Contrato on-chain y `house_tests.move` con la suite;
  gates verdes y gancho de coverage verificado.
- **Archivos afectados:** `contracts/sources/house.move` (modificar); `contracts/tests/house_tests.move`
  (crear; el directorio `contracts/tests/` no existe aún). **No tocar:** `contracts/Move.toml`,
  `contracts/Move.lock`, `.gitignore`, `agents.md`, `documents/`.
- **Cambios:**
  - Orden del módulo: `use`, constantes de error, constantes de configuración, structs, eventos, `init`,
    funciones de admin, `add_fees`, accessors, `#[test_only]`. `///` en toda función `public`/`entry` y en todo struct público (LIM-7).
  - `init` modelo (conserva `claim_and_keep`, `house.move:37`):
    ```move
    fun init(otw: HOUSE, ctx: &mut TxContext) {
        claim_and_keep(otw, ctx);
        transfer::share_object(House {
            id: object::new(ctx),
            fee_rate: DEFAULT_FEE_BPS,
            fees_collected: balance::zero(),
            min_bet: DEFAULT_MIN_BET,
            max_bet: DEFAULT_MAX_BET,
        });
        transfer::transfer(HouseCap { id: object::new(ctx) }, ctx.sender());
    }
    ```
  - Setters con el patrón `let old = house.fee_rate; …; event::emit(FeeRateUpdated { house_id:
    object::id(house), old_fee_rate: old, new_fee_rate })`.
  - `withdraw_fees`: `withdraw_all` + `coin::from_balance` (helpers en `balance.move:90`,
    `coin.move:140` @ `719fb29`).
  - Para comprobar eventos desde el módulo de test (los campos de un struct son privados a su módulo):
    constructores `#[test_only]` en `house.move` que armen el evento esperado (p. ej.
    `new_fee_rate_updated_for_testing(...)`), comparados por igualdad con `sui::event::events_by_type<T>()`
    (`event.move:65-68` @ `719fb29`, `#[test_only]`), consultado **antes** del `next_tx`. Es el caso
    "acceso privado" que PROY-1 admite. Si el DEV encuentra una forma más simple sin helpers, la declara
    como desviación.
  - Verificar que `contracts/tests/house_tests.move` puede llamar `add_fees` (`public(package)`) por ser
    del mismo paquete; si no compila, wrapper `#[test_only] public fun add_fees_for_testing` en `house.move`
    y declararlo (nota del issue).
  - Helpers de test disponibles @ `719fb29` (`test_scenario.move`): `begin`, `next_tx`, `take_shared`,
    `return_shared`, `take_from_address`, `return_to_address`, `has_most_recent_for_address`,
    `ids_for_address`, `shared` (`:436`), `num_user_events`, `end`; `balance::create_for_testing`
    (`balance.move:174`), `coin::burn_for_testing` (`coin.move:578`).
  - Las funciones `entry` (`update_fee_rate`, `update_bet_limits`, `transfer_house_cap`) se llaman
    directamente desde el módulo de test: el compilador las trata como públicas en modo test
    (`typing/core.rs:2262-2270, 2388-2409` @ `testnet-v1.83.0`).
- **AuthZ:** `update_fee_rate`, `update_bet_limits`, `withdraw_fees`, `transfer_house_cap`: solo quien
  posee el `HouseCap` (la tx no se puede armar sin él). `add_fees`: solo módulos de `battleship`. `init`:
  runtime. Accessors: cualquiera. El caso denegado es estructural (no hay abort ni `expected_failure`
  posible: sin el cap la llamada ni compila ni se arma como transacción): se testea la **custodia** del
  cap, es decir que existe solo en la dirección que corresponde antes y después de transferirlo (nota
  del issue, SEG-2; TASK-2 deja asentada esta interpretación en SEG-2/PROY-9).
- **Tests esperados** (`#[test_only] module battleship::house_tests;`, direcciones `PUBLISHER`,
  `NEW_ADMIN`, `OTHER`; constantes del test con los valores esperados; nombres = comportamiento, LIM-11):
  1. `test_init_shares_exactly_one_house_with_defaults` — con los `TransactionEffects` del primer
     `next_tx` tras `init_for_testing`: `test_scenario::shared(&effects).length() == 1` (criterio "existe
     **exactamente** la House"); luego `take_shared<House>`: `fee_rate` = 200 (o el valor de D1),
     `min_bet` = 1_000_000, `max_bet` = 50_000_000_000, `fees_collected` = 0; y el `Publisher`
     (`sui::package::Publisher`) en `PUBLISHER`.
  2. `test_init_sends_single_house_cap_to_publisher` — `ids_for_address<HouseCap>(PUBLISHER)` largo 1;
     `has_most_recent_for_address<HouseCap>(OTHER)` = false.
  3. `test_update_fee_rate_sets_rate_and_emits_event`
  4. `test_update_fee_rate_accepts_max_fee` (1000)
  5. `test_update_fee_rate_rejects_fee_above_max` (1001) — `#[expected_failure(abort_code = battleship::house::EFeeTooHigh)]`
  6. `test_update_bet_limits_sets_limits_and_emits_event`
  7. `test_update_bet_limits_accepts_equal_min_and_max`
  8. `test_update_bet_limits_rejects_zero_min` — `EInvalidBetLimits`
  9. `test_update_bet_limits_rejects_min_above_max` — `EInvalidBetLimits`
  10. `test_add_fees_accumulates_balance` (dos depósitos, incluido uno de valor 0)
  11. `test_withdraw_fees_returns_all_fees_and_emits_event` — conservación: valor del `Coin` = `fees_collected`
      antes; `fees_collected` después = 0; evento con `amount`.
  12. `test_withdraw_fees_rejects_empty_house` — `ENoFeesToWithdraw`
  13. `test_transfer_house_cap_moves_cap_and_emits_event` — después: `PUBLISHER` sin cap, `NEW_ADMIN` con
      uno; evento con `cap_id` y `recipient`.
  14. `test_transferred_cap_lets_new_holder_administer` — `NEW_ADMIN` actualiza el fee y retira fees.
  - Con D7 (b) se suman: `test_<función>_rejects_wrong_version` por cada función de escritura,
    `test_migrate_bumps_version_and_emits_event` y `test_migrate_rejects_current_version`.
- **Criterio de aceptación (DoD):**
  - Firmas, structs, eventos, constantes y abort codes exactamente como §Contrato on-chain (con las
    decisiones que confirme el usuario).
  - `sui move build -e testnet`: exit 0, 0 warnings. `--lint`: **0 lints en `house.move`** (cierra H12; delta −1).
  - `sui move test -e testnet`: exit 0, 0 warnings, ≥ 14 tests (≥ 18 con D7 b), todos PASS.
  - Gancho de coverage: `sui move test -e testnet --coverage` + `sui move coverage summary -e testnet`
    con output pegado (informativo); `ls -A contracts` pegado (nombres reales de los artefactos);
    `git status --porcelain` sin artefactos de coverage; `git status --porcelain --ignored contracts/` los
    lista como `!!`. Si alguno aparece sin ignorar, no se toca `.gitignore` en este task: se declara en
    "Riesgos / pendientes" con el nombre exacto y el patrón propuesto (lo aplica TASK-2).
  - `git diff master -- contracts/Move.toml contracts/Move.lock` vacío (sin repin, H13).
  - `ctx.sender()` aparece solo en `init`; no quedan `ECallerNotHouse`, `EInsufficientBalance`,
    `initialize_house` ni `admin`.
  - Visibilidades exactamente como la tabla de funciones: `entry` (sin `public`) para `update_fee_rate`,
    `update_bet_limits` y `transfer_house_cap`; `public` solo para `withdraw_fees` y los accessors;
    `public(package)` para `add_fees`.
- **Riesgos / rollback:** si `events_by_type` no se comporta como se describe en `test_scenario`, el DEV
  usa `num_user_events(&effects)` del `next_tx` + accessors de estado y lo declara; si `claim_and_keep`
  aborta desde `init_for_testing`, STOP al MID con el output. Rollback: `git checkout master -- contracts/`.

### TASK-2: `contracts/README.md` y docs del contrato — área: docs
- **Entregable:** `contracts/README.md` creado; `agents.md`, `documents/STATUS.md` y
  `documents/ESTANDARES.md` alineados con el módulo de TASK-1.
- **Archivos afectados:** `contracts/README.md` (crear); `agents.md`; `documents/STATUS.md`;
  `documents/ESTANDARES.md`; `.gitignore` solo si TASK-1 reportó un artefacto de coverage sin cubrir.
  **No tocar:** `contracts/sources/`, `contracts/tests/`, `documents/DECISIONES.md` (las decisiones las
  registra el orquestador al aprobarlas el usuario; el DEV solo cita sus IDs).
- **Cambios:**
  - `contracts/README.md` (sección House; Game la agregan #5/#6): cómo correr los gates (remite a
    `agents.md` §3); **tabla de funciones** (firma, visibilidad, quién puede llamar); **tabla de eventos**
    (campos); **tabla de abort codes** (número, constante, condición); párrafo "La autorización de admin
    es la posesión del `HouseCap`" con cómo se transfiere (`transfer_house_cap`, D3); subsección **"Qué
    pasa si se pierde el cap"** (S1): comisiones bloqueadas y configuración congelada para siempre; el
    caso probable es enviarlo a un ID de objeto (p. ej. el de la House), donde queda huérfano porque solo
    `house` podría recibirlo con `transfer::receive` y no lo expone; nota para #14: validar formato (SEG-9)
    y que el destinatario no sea un objeto existente; nota de contención: setters, `withdraw_fees` y
    `add_fees` (#6) toman `&mut House`, así que las resoluciones de partidas se serializan sobre la House
    (aceptable en el MVP); **retiro** (S2): `withdraw_fees` devuelve un `Coin` sin `drop`, así que
    `sui client call` sola falla por valor sin usar; ejemplo con PTB (sintaxis de `sui client ptb --help`,
    CLI 1.83; lo ejecuta el owner, nunca un agente):
    `sui client ptb --move-call <PKG>::house::withdraw_fees @<HOUSE_ID> @<CAP_ID> --assign fees
    --transfer-objects "[fees]" @<DESTINO>`; **límites** (S3): `min_bet`/`max_bet` solo se aplican al
    crear una partida (#5) y no afectan a las `Pending` existentes; **versionado** (D7): con (a), el
    camino de corrección tras publicar es republicar (House e IDs nuevos, retirar antes las fees),
    revisar antes de mainnet; con (b), cómo se usa `migrate`; ID de la House: se obtiene de los efectos de
    la publicación (#7).
  - `agents.md`: §2 (`contracts/tests/` ya existe), §6 "Admin" (HouseCap transferible por
    `transfer_house_cap`, fee por defecto, límites por defecto y quién los cambia), §7 (quitar el gotcha de
    `EInsufficientBalance`), §8 (API real de `battleship::house`), §9 (entidades si cambia algo), §12
    ("Dirección publicadora": el cap se puede pasar a la wallet del panel admin con `transfer_house_cap`),
    §13 (línea de authZ por capability, igual que SEG-2), §14 (`contracts/README.md` existe).
  - `documents/STATUS.md`: H3, H4, H5, H12 ✅ con referencia a #4; H9 parcial (suite de House); baseline
    nuevo de contracts (build/lint/test con N tests) con el SHA que indique el orquestador; resultado del
    gancho de coverage (nombres de artefactos); fila del ciclo activo.
  - `documents/ESTANDARES.md`: encabezado "Código legado" (`house.move` ya cumple) y ejemplo de LIM-8 (ya
    no se reutiliza `EInsufficientBalance`); con D3 (c) PROY-3 no cambia; con D3 (b), PROY-3 cita la
    excepción registrada; **SEG-2 y PROY-9** (y `agents.md` §13): una línea "authZ por capability ⇒ el
    caso denegado se cubre verificando la custodia del cap (dónde está antes y después), no con
    `expected_failure`" (hallazgo 7 del MAYOR). Redacción sujeta a revisión del MAYOR.
- **AuthZ:** no aplica (docs).
- **Criterio de aceptación:** las tres tablas del README coinciden 1:1 con `house.move` de TASK-1 (el
  MID lo contrasta función por función); `grep -n "EInsufficientBalance\|initialize_house\|ECallerNotHouse"
  agents.md documents/ESTANDARES.md contracts/README.md` solo devuelve menciones históricas explícitas
  (o nada); sin secretos; sin cambios en código.
- **Tests esperados:** no aplica (docs); el DEV re-corre `sui move build -e testnet` y `sui move test -e
  testnet` para confirmar cero delta respecto de TASK-1.
- **Riesgos / rollback:** desalineación tabla ↔ código (mitigado por la revisión 1:1). Rollback: revertir los archivos de docs.

**Suma de tasks = issue #4:** criterios 1-9 del issue en TASK-1, criterio 10 (`contracts/README.md`) y 12
(docs) en TASK-2; criterio 11 (gates) en ambos. "CI verde": si #3 se mergea antes del PR, la CI gatea el
PR; #4 no crea CI. Las decisiones aprobadas se registran en `documents/DECISIONES.md` por el orquestador.
**Smoke: no aplica** (el issue lo excluye: el flujo de admin end-to-end se verifica en el smoke de #6 y en #14).

## Verificación que el DEV pega en cada reporte (comando + output completo)

Desde la raíz del repo (cada `cd` va en subshell para no arrastrar el directorio), con la config sin claves de D-07:

```bash
sui --version
(cd contracts && printf 'n\n' | sui move build -e testnet); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet); echo "exit=$?"
# solo TASK-1 (gancho de coverage, informativo):
(cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
ls -A contracts
git status --porcelain
git status --porcelain --ignored contracts/
# sin repin:
git diff --stat master -- contracts/Move.toml contracts/Move.lock
# authZ: ctx.sender() solo en init; símbolos legados eliminados
grep -n "ctx.sender()" contracts/sources/house.move
grep -nE "ECallerNotHouse|EInsufficientBalance|initialize_house|admin:|fun admin|\.admin" contracts/sources/house.move
# secretos: solo líneas agregadas del diff + archivos nuevos sin trackear (lección de #2)
git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
```

Resultados esperados: exits 0; 0 warnings; 0 lints; N ≥ 14 tests PASS (≥ 18 con D7 b); `git diff
--stat` de manifest/lock vacío; `ctx.sender()` una sola vez (en `init`); el grep de legados vacío.

**Greps de secretos: matches esperados** (no se excluyen rutas del grep; se declaran):
- Artefactos de proceso de `documents/` que contienen el propio patrón o hablan de claves: este plan,
  `documents/REVISION_PLAN_HOUSE.md`, el handoff, los reportes y las revisiones de este ciclo (sin
  trackear o en el diff).
- En TASK-2, las líneas de `agents.md` y `documents/ESTANDARES.md` que nombran `keystore`/`recovery` a
  propósito (SEG-3, §7, §11), solo si el diff las toca.
- En `contracts/` (código, tests y README): **ningún** match.

El DEV pega el output completo y clasifica cada match en una de esas categorías. **Cualquier otro match
es BLOCKER** (SEG-3). Nada de `sui client` salvo `sui client active-env`; nunca leer ni pegar
`client.yaml` ni claves.

## Changelog

- **v1.1 (2026-10-30)**, aplica `documents/REVISION_PLAN_HOUSE.md`:
  - MAJOR 1: STOP **D7** (campo `version` en la House) con evidencia, opciones e impacto; encabezado,
    HU y §Contrato on-chain lo reflejan.
  - MINOR 2: D4 (b) precisa `public` (lint `self_transfer`) frente a `entry` (sin lint, no componible).
  - MINOR 3: D3 reescrita: el phishing afecta a (b) y a (c); lo exclusivo de (b) es freeze, envoltura y
    la superficie de `store` que crece con el framework; el traspaso en dos pasos sería aditivo.
  - MINOR 4: `update_fee_rate`, `update_bet_limits` y `transfer_house_cap` pasan a `entry`;
    `withdraw_fees` queda `public` con su justificación.
  - MINOR 5: el test 1 verifica la unicidad de la House con `shared(&effects)` y el `Publisher`.
  - MINOR 6: matches esperados de los greps de secretos declarados.
  - MINOR 7: TASK-2 asienta en SEG-2, PROY-9 y `agents.md` §13 la authZ por capability.
  - S1-S3: pérdida del cap hacia un ID de objeto (flujo de fondos, D3, README, nota para #14),
    ejemplo de retiro con `sui client ptb`, límites solo al crear. S4: D1 (b) suma `house_id` en
    `HouseCapTransferred`. D1 incorpora la ponderación del MAYOR (riesgo de olvidar el paso) y D5 la
    evidencia de `error_bitset.rs`.
- **v1 (2026-10-30):** primera versión.
