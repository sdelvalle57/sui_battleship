# HANDOFF_HOUSE
> Plan: PLAN_HOUSE v1.1 (APROBADO por el MAYOR, "Revisión v1.1" en `documents/REVISION_PLAN_HOUSE.md`) | Issue: #4 |
> Branch: `feature/issue-4-house` | Versión: v1.2 | Fecha: 2026-10-30 | Autor: MID
> Aplica las decisiones del usuario (D-20261030-11) y los MINOR N1 (D7 b ⇒ 6 tests más, total ≥ 20) y N2
> (alcance incluye `agents.md` §13 y SEG-2/PROY-9 de `ESTANDARES.md`) de la revisión v1.1.
> **v1.1:** aplica la revisión del MAYOR sobre el handoff v1 (M1 opción a, m1, m2, m3); ver §Changelog al final.
> Tasks: **TASK-1** (contracts) → revisión MID → commit → **TASK-2** (docs). Un task por sesión; sin commits ni pushes del DEV.

## 0. Baseline de gates verificado (2026-10-30)

| Ítem | Valor |
|---|---|
| Ref de partida | branch `feature/issue-4-house` @ `519079e` (sobre `master` @ `f303ef9`). `git diff --stat 8325126 519079e -- contracts/ .gitignore` vacío: el código de contratos es el del baseline |
| Baseline registrado | `documents/STATUS.md` §Baselines: `master` @ `48df3b4` (merge de #22), medido en `8325126`, CLI `sui 1.83.0-16d2dc1e05ed` |
| `sui move build -e testnet` | 🟢 exit 0 · 0 errores · **0 warnings** |
| `sui move build -e testnet --lint` | 🟢 exit 0 · **1 lint**: `WSL06010` (`prefer_mut_tx_context`) en `contracts/sources/house.move:67` (H12) — este handoff lo elimina |
| `sui move test -e testnet` | 🟢 exit 0 · **0 tests** (`Test result: OK. Total tests: 0`) |
| Framework | `Move.lock` v4 pinea `std`/`sui` a `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139). **No repinear** (H13 es de #8) |
| Prerrequisito | `~/.sui/sui_config/client.yaml` sin claves (`active_env: testnet`, D-20261030-07). Toda invocación `sui move …` con `printf 'n\n' |` delante. Nunca leer, pegar ni crear claves; nada de `sui client` salvo `sui client active-env` |
| App / CI | no existen (no se tocan) |

Objetivo al cerrar TASK-1: build 0 warnings · **lint 0** (delta −1, cierra H12) · **≥ 25 tests PASS**, 0 warnings.

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | `init` crea y comparte **una** House con valores por defecto y entrega el `HouseCap` al publicador; no existe `initialize_house`. **Fee por defecto = 0 bps** (el owner la ajusta con `update_fee_rate` tras publicar) | D-20261030-11 §1 |
| D2 | Sin campo `admin` ni accessor `admin()`: la authZ es la posesión del `HouseCap` | D-20261030-11 §2 |
| D3 | `HouseCap has key` (sin `store`); se transfiere solo con `entry fun transfer_house_cap`, que emite `HouseCapTransferred` | D-20261030-11 §3, D-20261030-06 §5 |
| D4 | `public fun withdraw_fees(...): Coin<SUI>` (la PTB decide el destino); aborta con `ENoFeesToWithdraw` si no hay fees | D-20261030-11 §4 |
| D5 | Abort codes clásicos `const E…: u64` con número estable | D-20261030-11 §5 |
| D6 | Límites por defecto 0,001 SUI (`1_000_000` MIST) / 50 SUI (`50_000_000_000` MIST) | D-20261030-11 §6 |
| D7 | La House lleva `version` desde la v1: `VERSION`, `EWrongVersion`, `ENotUpgrade`, `entry migrate` con `&HouseCap`, chequeo de versión en toda función que escriba la House (y, por M1 de la revisión del handoff, en los accessors de configuración y fondos). La mecánica en `Game` la decide el plan de #5, con el invariante SEG-4 de §TASK-2 (ningún reembolso bloqueado por la versión) | D-20261030-11 §7 |
| — | El `Game` copia el `fee_rate` al crear; aceptar resuelve en la misma tx | D-20261030-06 §1, §3 |
| — | Visibilidad: `entry` para `update_fee_rate`, `update_bet_limits`, `transfer_house_cap`, `migrate`; `public` solo para `withdraw_fees` y accessors | PLAN_HOUSE v1.1 (Decisión de diseño aprobada por el MAYOR) |

**Consecuencia registrada (D-20261030-11):** con fee por defecto 0 y D-06 §3, las partidas creadas entre la
publicación y el primer `update_fee_rate` quedan con comisión 0 para siempre. El post-publicación de #8
debe ajustar el fee antes de anunciar el juego. TASK-2 lo documenta en `contracts/README.md`, `agents.md`
§12 y `documents/STATUS.md`.

---

## TASK-1: Módulo `battleship::house` final + suite de tests + gancho de coverage — área: contracts

### 1. Historia de usuario del task

**Como** owner/administrador de la House, **quiero** que cambiar la comisión o los límites, retirar las
comisiones, migrar la House y pasar el `HouseCap` a otra wallet exija tener el `HouseCap`, y que las
comisiones solo entren desde el propio paquete, **para** que nadie más pueda tocar la configuración ni los
fondos de la House, poder cerrar versiones viejas del paquete tras un upgrade, y que Game (#5, #6) se
construya sobre una API estable y testeada.

**Scope en una frase:** `contracts/sources/house.move` reescrito y `contracts/tests/house_tests.move` con 25 tests.
**Lo que NO entrega:** docs (TASK-2), Game (#5/#6), CI (#3), app (#9+), publicación (#8), repin (H13).

### 2. Contexto (qué existe hoy)

`contracts/sources/house.move` @ `519079e` (idéntico al de `f303ef9`):
- `:14-15` `ECallerNotHouse = 0`, `EInsufficientBalance = 1` (este último para dos causas, `:48,69,78`: H4).
- `:18-25` `House has key` con `admin: address` (`:22`); `:28-30` `HouseCap has key`; `:33` OTW `HOUSE`.
- `:36-44` `init`: `claim_and_keep(otw, ctx)` (**se conserva**) + `HouseCap` al sender.
- `:47-64` `initialize_house` consume el cap (H3); `:67-71` `update_fee_rate` autoriza por
  `ctx.sender() == house.admin` y recibe `&TxContext` (H12); `:74-82` `withdraw_fees` transfiere a `house.admin`.
- `:87-99` accessors `fee_rate`, `fees_collected`, `admin`; `:101-104` `#[test_only] init_for_testing`.
- `contracts/tests/` no existe.

Referencias del framework (`MystenLabs/sui` @ `719fb29`, verificadas por MID y MAYOR):
`transfer.move:54` (`transfer` solo en el módulo definidor), `object.move:254` (`object::id<T: key>`),
`balance.move:76` (`join`), `:90` (`withdraw_all`), `:174` (`create_for_testing`), `coin.move:140`
(`from_balance`), `:578` (`burn_for_testing`), `event.move:65-68` (`#[test_only] events_by_type<T>()`, eventos
de la tx en curso: consultar **antes** de `next_tx`), `test_scenario.move:283` (`next_tx` devuelve
`TransactionEffects`), `:436` (`shared`), `:446` (`num_user_events`), `:464` (`ids_for_address`), `:467`
(`has_most_recent_for_address`), `:473`/`:482` (`take_from_address`/`return_to_address`), `:576`/`:583`
(`take_shared`/`return_shared`). En modo test, las funciones `entry` de otro módulo son llamables
(`typing/core.rs:2262-2270, 2388-2409` @ `testnet-v1.83.0`).

### 3. Qué implementar

**Orden del módulo:** `use` → constantes de error → constantes de configuración → structs → eventos →
`init` → funciones `entry` de admin → `withdraw_fees` → `add_fees` → accessors → helper privado →
`#[test_only]`. `///` en toda función `public`/`entry` y en todo struct público; comentarios internos solo
para el porqué (LIM-7). Sin `TODO` sin issue, sin debug, sin código comentado.

**Constantes:**
```move
// Abort codes (número estable, D5). Ninguno se reutiliza.
const EFeeTooHigh: u64 = 0;        // new_fee_rate > MAX_FEE_BPS
const EInvalidBetLimits: u64 = 1;  // min_bet == 0 || min_bet > max_bet
const ENoFeesToWithdraw: u64 = 2;  // fees_collected == 0
const EWrongVersion: u64 = 3;      // house.version != VERSION
const ENotUpgrade: u64 = 4;        // migrate con house.version >= VERSION

const VERSION: u64 = 1;
const MAX_FEE_BPS: u16 = 1000;               // 10 %
const DEFAULT_FEE_BPS: u16 = 0;              // D1: el owner la fija tras publicar (#8)
const DEFAULT_MIN_BET: u64 = 1_000_000;      // 0,001 SUI
const DEFAULT_MAX_BET: u64 = 50_000_000_000; // 50 SUI
```
Se eliminan `ECallerNotHouse` y `EInsufficientBalance`. El denominador `10_000` **no** va aquí (#6).

**Structs:**
```move
public struct House has key {
    id: UID,
    version: u64,                 // D7: == VERSION del paquete que puede escribirla
    fee_rate: u16,                // basis points, <= MAX_FEE_BPS
    fees_collected: Balance<SUI>,
    min_bet: u64,
    max_bet: u64,                 // invariante: 0 < min_bet <= max_bet
}

public struct HouseCap has key { id: UID }   // sin `store` (D3)
public struct HOUSE has drop {}              // OTW, sin cambios
```

**Eventos** (`has copy, drop`, PROY-7):

| Evento | Campos | Emite |
|---|---|---|
| `FeeRateUpdated` | `house_id: ID`, `old_fee_rate: u16`, `new_fee_rate: u16` | `update_fee_rate` |
| `BetLimitsUpdated` | `house_id: ID`, `old_min_bet: u64`, `old_max_bet: u64`, `new_min_bet: u64`, `new_max_bet: u64` | `update_bet_limits` |
| `FeesWithdrawn` | `house_id: ID`, `amount: u64` | `withdraw_fees` |
| `HouseCapTransferred` | `cap_id: ID`, `recipient: address` | `transfer_house_cap` |
| `HouseMigrated` | `house_id: ID`, `old_version: u64`, `new_version: u64` | `migrate` |

**Funciones (firmas exactas):**

| Firma | Visibilidad | AuthZ | Cuerpo |
|---|---|---|---|
| `fun init(otw: HOUSE, ctx: &mut TxContext)` | privada | runtime al publicar | ver modelo abajo |
| `entry fun update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16)` | `entry` | titular del cap | `assert_current_version(house)`; `assert!(new_fee_rate <= MAX_FEE_BPS, EFeeTooHigh)`; guarda; emite `FeeRateUpdated`. **Sin `ctx`** (H12) |
| `entry fun update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64)` | `entry` | titular del cap | `assert_current_version(house)`; `assert!(min_bet > 0 && min_bet <= max_bet, EInvalidBetLimits)`; guarda; emite `BetLimitsUpdated` |
| `entry fun transfer_house_cap(cap: HouseCap, recipient: address)` | `entry` | titular del cap (por valor) | emite `HouseCapTransferred { cap_id: object::id(&cap), recipient }`; `transfer::transfer(cap, recipient)`. Sin chequeo de versión (no recibe la House) |
| `entry fun migrate(house: &mut House, _: &HouseCap)` | `entry` | titular del cap | `assert!(house.version < VERSION, ENotUpgrade)`; `old = house.version`; `house.version = VERSION`; emite `HouseMigrated`. En la v1 siempre aborta (la House nace en `VERSION`); existe para fijar el patrón y la firma |
| `public fun withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI>` | `public` (devuelve `Coin`) | titular del cap | `assert_current_version(house)`; `assert!(house.fees_collected.value() > 0, ENoFeesToWithdraw)`; `let fees = house.fees_collected.withdraw_all()`; emite `FeesWithdrawn { amount }`; `coin::from_balance(fees, ctx)` |
| `public(package) fun add_fees(house: &mut House, fees: Balance<SUI>)` | `public(package)` | solo módulos de `battleship` | `assert_current_version(house)`; `house.fees_collected.join(fees)`. Acepta valor 0. Sin evento |
| `public fun fee_rate(house: &House): u16` | `public` | cualquiera | `assert_current_version(house)`; devuelve el valor |
| `public fun fees_collected(house: &House): u64` | `public` | cualquiera | `assert_current_version(house)`; devuelve el valor |
| `public fun min_bet(house: &House): u64` / `public fun max_bet(house: &House): u64` | `public` | cualquiera | `assert_current_version(house)`; devuelve el valor |
| `public fun version(house: &House): u64` | `public` | cualquiera | **sin** chequeo de versión (diagnóstico: el panel #14 y los tests de `migrate` lo leen justamente cuando la versión no coincide) |
| `fun assert_current_version(house: &House)` | privada | — | `assert!(house.version == VERSION, EWrongVersion)` (un solo lugar, LIM-5) |

- **El chequeo de versión va primero** en cada función que escribe la House (antes de validar argumentos),
  así una versión vieja del paquete aborta siempre con `EWrongVersion`.
- **Los accessors `fee_rate`, `fees_collected`, `min_bet` y `max_bet` también validan la versión** (M1 de
  la revisión del handoff): así el código de `game` de un paquete viejo (#5 lee `fee_rate`/`min_bet`/
  `max_bet` al crear una partida) aborta con `EWrongVersion` en vez de crear partidas con reglas de una
  House ya migrada. `version()` es la única lectura sin chequeo.
  > Decisión (2026-10-30): accessor público `version()` sin chequeo de versión, para que el panel (#14) y
  > los tests de `migrate` puedan leer la versión de una House que no coincide con el paquete; no estaba
  > en el plan ni en D-20261030-11 y no amplía la authZ (solo lectura) — MID.
- `ctx.sender()` aparece **solo** en `init`. Ninguna función `public`/`entry` recibe `&TxContext`
  inmutable. No usar `public entry` (lint `public_entry`).
- El ID de la House para #5 sale de `object::id(house)`: no agregar accessor de ID.

**Modelo de `init`:**
```move
fun init(otw: HOUSE, ctx: &mut TxContext) {
    claim_and_keep(otw, ctx);
    transfer::share_object(House {
        id: object::new(ctx),
        version: VERSION,
        fee_rate: DEFAULT_FEE_BPS,
        fees_collected: balance::zero(),
        min_bet: DEFAULT_MIN_BET,
        max_bet: DEFAULT_MAX_BET,
    });
    transfer::transfer(HouseCap { id: object::new(ctx) }, ctx.sender());
}
```

**Helpers `#[test_only]` en `house.move`** (PROY-1: el test necesita acceso privado):
- `init_for_testing(ctx: &mut TxContext)` (ya existe, se conserva).
- `set_version_for_testing(house: &mut House, version: u64)` para simular una House migrada por un
  paquete más nuevo (`VERSION + 1`) o una House vieja (`0`).
- Constructores de los eventos esperados (`new_fee_rate_updated_for_testing(...)`, etc., uno por evento),
  para comparar por igualdad con `event::events_by_type<T>()` desde el módulo de test (los campos son
  privados al módulo). Si el DEV encuentra una forma más simple, la declara como desviación.
- `add_fees` es `public(package)`: el módulo `battleship::house_tests` (mismo paquete) debería poder
  llamarlo. Si no compila, agregar `#[test_only] public fun add_fees_for_testing` y declararlo.

**Flujo de fondos e invariante (SEG-4):** entrada solo por `add_fees` (`Balance<SUI>`), custodia en
`fees_collected`, salida solo por `withdraw_fees` (un `Coin` por el total). `fees_collected` después =
antes + Σ `add_fees` − retirado; el `Coin` vale exactamente `fees_collected` antes y deja 0.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/sources/house.move` (reescribir); `contracts/tests/house_tests.move` (crear).
- **NO tocar:** `contracts/Move.toml`, `contracts/Move.lock` (sin repin), `.gitignore`, `agents.md`,
  `documents/**`, `README.md`. Nada fuera de `contracts/sources/` y `contracts/tests/`.

### 5. Tests obligatorios (`contracts/tests/house_tests.move`)

`#[test_only] module battleship::house_tests;` con direcciones `PUBLISHER`, `NEW_ADMIN`, `OTHER` y
constantes propias del test para los valores esperados (`0`, `1_000_000`, `50_000_000_000`, versión `1`).
`sui::test_scenario` multi-tx (PROY-9). Nombres = comportamiento (LIM-11). Los `expected_failure` usan
`abort_code = battleship::house::E…`.

| # | Test | Verifica |
|---|---|---|
| 1 | `test_init_shares_exactly_one_house_with_defaults` | Con los `TransactionEffects` del primer `next_tx` tras `init_for_testing`: `test_scenario::shared(&effects).length() == 1`. Luego `take_shared<House>`: `version` = 1, `fee_rate` = 0, `min_bet` = 1_000_000, `max_bet` = 50_000_000_000, `fees_collected` = 0. El `Publisher` (`sui::package::Publisher`) está en `PUBLISHER` |
| 2 | `test_init_sends_single_house_cap_to_publisher` | `ids_for_address<HouseCap>(PUBLISHER).length() == 1`; `has_most_recent_for_address<HouseCap>(OTHER)` = false |
| 3 | `test_update_fee_rate_sets_rate_and_emits_event` | nuevo valor + `FeeRateUpdated` (anterior 0, nuevo) |
| 4 | `test_update_fee_rate_accepts_max_fee` | 1000 OK |
| 5 | `test_update_fee_rate_rejects_fee_above_max` | 1001 → `EFeeTooHigh` |
| 6 | `test_update_bet_limits_sets_limits_and_emits_event` | valores + `BetLimitsUpdated` con anteriores y nuevos |
| 7 | `test_update_bet_limits_accepts_equal_min_and_max` | `min == max` OK |
| 8 | `test_update_bet_limits_rejects_zero_min` | → `EInvalidBetLimits` |
| 9 | `test_update_bet_limits_rejects_min_above_max` | → `EInvalidBetLimits` |
| 10 | `test_add_fees_accumulates_balance` | dos depósitos (uno de valor 0); `fees_collected` = suma |
| 11 | `test_withdraw_fees_returns_all_fees_and_emits_event` | conservación: valor del `Coin` = `fees_collected` antes; después 0; `FeesWithdrawn { amount }` |
| 12 | `test_withdraw_fees_rejects_empty_house` | → `ENoFeesToWithdraw` |
| 13 | `test_transfer_house_cap_moves_cap_and_emits_event` | después: `PUBLISHER` sin `HouseCap`, `NEW_ADMIN` con uno; `HouseCapTransferred { cap_id, recipient }` |
| 14 | `test_transferred_cap_lets_new_holder_administer` | `NEW_ADMIN` actualiza el fee y retira fees (con conservación) |
| 15 | `test_update_fee_rate_rejects_wrong_version` | `set_version_for_testing(house, 2)` y fee **1001** (argumento también inválido) → `EWrongVersion`: demuestra que el chequeo de versión se reporta primero |
| 16 | `test_update_bet_limits_rejects_wrong_version` | ídem → `EWrongVersion` |
| 17 | `test_withdraw_fees_rejects_wrong_version` | con fees > 0, versión 2 → `EWrongVersion` (el chequeo de versión va primero) |
| 18 | `test_add_fees_rejects_wrong_version` | versión 2 → `EWrongVersion` |
| 19 | `test_migrate_bumps_version_and_emits_event` | `set_version_for_testing(house, 0)`; `migrate` → `version()` = 1 + `HouseMigrated { old_version: 0, new_version: 1 }`; después `update_fee_rate` vuelve a funcionar (valor nuevo guardado) |
| 20 | `test_migrate_rejects_current_version` | House recién creada → `ENotUpgrade` |
| 21 | `test_migrate_rejects_house_newer_than_package` | `set_version_for_testing(house, 2)`; `migrate` de este paquete (v1) → `ENotUpgrade` (un paquete viejo no puede "migrar" hacia atrás) |
| 22 | `test_fee_rate_rejects_wrong_version` | versión 2 → `EWrongVersion` |
| 23 | `test_fees_collected_rejects_wrong_version` | versión 2 → `EWrongVersion` |
| 24 | `test_min_bet_rejects_wrong_version` | versión 2 → `EWrongVersion` |
| 25 | `test_max_bet_rejects_wrong_version` | versión 2 → `EWrongVersion` |

**AuthZ denegada (SEG-2):** con capability, el caso denegado no se puede expresar como `expected_failure`
(sin el cap la llamada no compila ni se arma como transacción). Se cubre con la **custodia** del cap: tests
2 y 13 (dónde está antes y después de transferirlo) y 14 (el nuevo titular administra).

### 6. Smoke

No aplica: el issue lo excluye; el flujo de admin end-to-end se verifica en el smoke de #6 y en #14.

### 7. Criterios de aceptación

- [ ] Firmas, visibilidades, structs, eventos, constantes y abort codes **exactamente** como §3.
- [ ] `sui move build -e testnet`: exit 0, 0 warnings.
- [ ] `sui move build -e testnet --lint`: exit 0, **0 lints** (desaparece `WSL06010`, H12).
- [ ] `sui move test -e testnet`: exit 0, 0 warnings, **≥ 25 tests**, todos PASS (lista de §5 completa).
- [ ] Gancho de coverage: output de `--coverage` + `coverage summary` pegado (informativo); `ls -A contracts`
      pegado; `git status --porcelain` sin artefactos de coverage; `git status --porcelain --ignored contracts/`
      los lista como `!!`. Si alguno aparece sin ignorar, **no** tocar `.gitignore`: declararlo en
      "Riesgos / pendientes" con el nombre exacto y el patrón propuesto (lo aplica TASK-2).
- [ ] `git diff --stat master -- contracts/Move.toml contracts/Move.lock` vacío.
- [ ] `ctx.sender()` una sola vez (en `init`); sin `ECallerNotHouse`, `EInsufficientBalance`,
      `initialize_house` ni `admin`.
- [ ] Greps de secretos con los matches esperados de §8 y ninguno en `contracts/`.

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 (branch + SHA corto, archivos, qué se
implementó, gates con **comando + output completo**, desviaciones o "ninguna", riesgos o "ninguno",
documentación: "no aplica en TASK-1", snippet propuesto para STATUS). **Sin commits ni pushes.** Comandos,
desde la raíz del repo:

```bash
sui --version
(cd contracts && printf 'n\n' | sui move build -e testnet); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move build -e testnet --lint); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet); echo "exit=$?"
(cd contracts && printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet); echo "exit=$?"
ls -A contracts
git status --porcelain
git status --porcelain --ignored contracts/
git diff --stat master -- contracts/Move.toml contracts/Move.lock
grep -n "ctx.sender()" contracts/sources/house.move
grep -nE "ECallerNotHouse|EInsufficientBalance|initialize_house|admin:|fun admin|\.admin" contracts/sources/house.move
grep -nE "fun [a-z_]+\(" contracts/sources/house.move   # visibilidades contra la tabla de §3
# secretos: líneas agregadas del diff + archivos nuevos sin trackear (lección de #2)
git diff -U0 master | grep -E '^\+' | grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
git ls-files --others --exclude-standard -z | xargs -0 -r grep -inE 'suiprivkey|mnemonic|recovery|private.?key|keystore'
```

**Matches esperados de los greps de secretos** (no se excluyen rutas; se declaran): artefactos de proceso
de `documents/` que contienen el propio patrón o hablan de claves (`PLAN_HOUSE.md`,
`REVISION_PLAN_HOUSE.md`, este handoff, reportes y revisiones del ciclo) y líneas ya existentes de
`documents/DECISIONES.md` si aparecen en el diff contra `master`. En `contracts/`: **ninguno**. El DEV
clasifica cada match; cualquier otro es **BLOCKER** (SEG-3).

---

## TASK-2: `contracts/README.md` y docs del contrato — área: docs

> Se autoriza solo tras la revisión MID PASA de TASK-1 y su commit. Las tablas se copian del `house.move`
> **commiteado** en TASK-1, no de este handoff.

### 1. Historia de usuario del task

**Como** desarrollador de Game (#5, #6), de la capa `app/src/sui/` (#9, #11) y del panel admin (#14),
**quiero** una referencia única del contrato de la House (funciones, eventos, abort codes, authZ, versionado
y operación) y docs del repo alineadas con el código, **para** consumir la API sin leer el código Move y
para que el owner sepa qué hacer al publicar (fijar el fee).

**Scope en una frase:** `contracts/README.md` con la sección House y docs del repo actualizadas (PROY-20).
**Lo que NO entrega:** cambios de código; `documents/DECISIONES.md` (lo mantiene el orquestador); secciones de Game.

### 2. Contexto

- `contracts/README.md` no existe; `agents.md` §14 lo anuncia "(a crear en #4)".
- `agents.md`: §2 (`:30`, `contracts/tests/` "llega con #4"), §6 (`:119-140`, nota "Propuesta hasta los
  planes…" y "Admin … pendiente"), §7 (`:144`, gotcha de `EInsufficientBalance`), §8 (`:156-159`, API
  vieja de house), §9 (`:165`), §12 (`:196-197`, "no transferible si queda sin `store`"), §13 (`:206`),
  §14 (`:222`).
- `documents/ESTANDARES.md`: `:7` (encabezado "Código legado"), `:50` (LIM-8 cita `EInsufficientBalance`),
  SEG-2, PROY-9, PROY-10 (`:63-72` aprox.).
- `documents/STATUS.md`: H3, H4, H5, H9, H12, baselines, ciclo activo, pendientes del usuario.

### 3. Qué implementar

**`contracts/README.md`** (sección House; Game la agregan #5/#6):
1. Gates: remite a `agents.md` §3 (sin duplicar comandos).
2. **Tabla de funciones**: firma, visibilidad, quién puede llamar, abort codes posibles, evento emitido.
3. **Tabla de eventos**: nombre y campos con tipos.
4. **Tabla de abort codes**: número, constante, condición, función(es). Base de `app/src/sui/errors.ts` (#11).
5. **Autorización:** la authZ de admin es la posesión del `HouseCap`; se transfiere solo con
   `transfer_house_cap` (no con "Send" de la wallet: no tiene `store`, y por eso tampoco se puede
   congelar, compartir, envolver ni vender); `init` + `HouseCapTransferred` dan la traza del titular.
6. **Qué pasa si se pierde el cap:** comisiones bloqueadas y configuración congelada para siempre. El caso
   probable es enviarlo a un **ID de objeto** (p. ej. el de la House): queda huérfano porque solo `house`
   podría recibirlo (`transfer::receive`) y no lo expone. Nota para #14: validar el formato (SEG-9) y que el
   destinatario no sea un objeto existente.
7. **Fee por defecto 0 (D-20261030-11):** la House nace con `fee_rate = 0`; como el `Game` copia el fee al
   crearse (D-06 §3), las partidas creadas antes del primer `update_fee_rate` quedan con comisión 0 para
   siempre. **Paso obligatorio post-publicación (#8):** `update_fee_rate` antes de anunciar el juego.
8. **Retiro:** `withdraw_fees` devuelve un `Coin` sin `drop`, así que `sui client call` sola falla por valor
   sin usar. Ejemplo (lo ejecuta el owner, nunca un agente):
   `sui client ptb --move-call <PKG>::house::withdraw_fees @<HOUSE_ID> @<CAP_ID> --assign fees --transfer-objects "[fees]" @<DESTINO>`.
9. **Límites:** `min_bet`/`max_bet` solo se aplican al crear una partida (#5); cambiarlos no afecta a las
   `Pending` existentes, y aceptar solo exige el monto exacto (D-06 §1).
10. **Versionado (D7):** toda versión anterior de un paquete sigue invocable tras un upgrade; la House
    guarda `version` y exigen `version == VERSION` (`EWrongVersion`, chequeado antes que cualquier otro
    argumento) las funciones que la escriben (`update_fee_rate`, `update_bet_limits`, `withdraw_fees`,
    `add_fees`) **y** los accessors `fee_rate`, `fees_collected`, `min_bet`, `max_bet`. `version()` no
    valida (diagnóstico). Tras un upgrade que sube `VERSION`, el titular del cap llama `migrate` de la
    versión nueva; desde ahí el código de las versiones viejas no puede escribir ni leer la configuración
    de la House, y el `migrate` de un paquete viejo aborta con `ENotUpgrade`. `transfer_house_cap` no
    recibe la House y queda fuera del versionado. La tabla de funciones incluye la fila de `version()`
    con su propósito, y la columna de abort codes lista `EWrongVersion` en cada accessor que lo valida.
11. **Contención:** setters, `withdraw_fees`, `migrate` y `add_fees` (#6) toman `&mut House`: las
    resoluciones de partidas se serializan sobre la House (aceptable en el MVP).
12. **ID de la House:** sale de los efectos de la publicación (#7, `deployments/<red>.json`).

**`agents.md`:** §2 (`contracts/tests/` existe desde #4); §6 (nota de cabecera: las reglas de House quedan
confirmadas por D-20261030-11; "Admin": `HouseCap` transferible con `transfer_house_cap`; fee por defecto
0 y quién la cambia; límites por defecto y `update_bet_limits`); §7 (quitar el gotcha de
`EInsufficientBalance`; si suma, un gotcha de versionado: "una función que escribe la House en un paquete
viejo aborta con `EWrongVersion` tras `migrate`"); §8 (API real de `battleship::house`, incluidos
`version`/`migrate`); §9 (entidades, si cambia algo); §12 ("Dirección publicadora": el cap se puede pasar a
la wallet del panel con `transfer_house_cap`; post-publicación: `update_fee_rate` antes de anunciar); §13
(línea: "authZ por capability ⇒ el caso denegado se cubre verificando la custodia del cap, no con
`expected_failure`"); §14 (`contracts/README.md` existe).

**`documents/ESTANDARES.md`** (redacción sujeta a revisión del MAYOR; versión del encabezado +0.1):
`:7` (`house.move` ya cumple las reglas); `:50` LIM-8 (quitar el ejemplo vigente de `EInsufficientBalance`);
**SEG-2 y PROY-9:** la misma línea de authZ por capability; **PROY-10:** "La House compartida lleva
`version` + `EWrongVersion` + `entry migrate` con `&HouseCap` (D-20261030-11). Invariante SEG-4 para los
objetos que custodian fondos de jugadores (`Game`, #5): un camino de reembolso (cancelar/rechazar) nunca
puede quedar bloqueado por la versión; la mecánica de versionado de `Game` la decide el plan de #5".
PROY-3 no cambia (D3 c no usa `store`).

**`documents/STATUS.md`:** H3, H4, H5 y H12 ✅ (#4); H9 🚧 parcial (suite de House: N tests); nueva fila
de baseline de contracts (build 0 warnings, lint 0, N tests) con el SHA del commit de TASK-1 que indique el
orquestador; resultado del gancho de coverage (nombres reales de los artefactos y si `.gitignore` los
cubre); en "Pendientes del usuario" o en el backlog de #8: "post-publicación: `update_fee_rate` antes de
anunciar (fee por defecto 0, D-20261030-11)"; en "Pendientes del usuario" también: "licencia del repo: cabecera
placeholder `// Copyright (c) Your Project` + SPDX Apache-2.0 en `contracts/sources/house.move:1-2`, sin `LICENSE`
en el repo; decidir antes de #5"; fila del ciclo activo. Baseline TASK-1 = build 0 warnings, lint 0, **26** tests.

**`.gitignore`:** solo si TASK-1 reportó un artefacto de coverage sin cubrir, con el patrón aprobado por el MID.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/README.md` (crear), `agents.md`, `documents/ESTANDARES.md`, `documents/STATUS.md`,
  `.gitignore` (solo en el caso anterior).
- **NO tocar:** `contracts/sources/`, `contracts/tests/`, `contracts/Move.*`, `documents/DECISIONES.md`,
  `documents/PLAN_HOUSE.md`, `documents/REVISION_PLAN_HOUSE.md`, este handoff.

### 5. Tests obligatorios

No hay tests nuevos (docs). El DEV re-corre build, lint y test para confirmar **cero delta** respecto de
TASK-1 (mismos conteos).

### 6. Smoke

No aplica (docs).

### 7. Criterios de aceptación

- [ ] Las tablas del README coinciden 1:1 con `house.move` commiteado (el MID lo contrasta función por
      función, evento por evento y código por código).
- [ ] El README cubre los puntos 1-12 de §3, incluida la consecuencia del fee 0 y el paso de #8.
- [ ] `grep -nE "EInsufficientBalance|initialize_house|ECallerNotHouse" agents.md documents/ESTANDARES.md contracts/README.md`
      solo devuelve menciones históricas explícitas (o nada).
- [ ] `agents.md` §13, SEG-2 y PROY-9 llevan la línea de authZ por capability; PROY-10 el patrón de versionado.
- [ ] Gates sin delta; sin cambios de código; greps de secretos con los matches esperados (abajo).

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 (documentación: "sí", con la lista de
secciones tocadas). Sin commits ni pushes. Comandos: los tres gates de TASK-1 (sin coverage), `git diff
--stat`, y los dos greps de secretos de TASK-1. **Matches esperados**, además de los de TASK-1: las líneas
de `agents.md` y `documents/ESTANDARES.md` que nombran `keystore`/`recovery` a propósito (SEG-3, §7, §11),
solo si el diff las toca. En `contracts/README.md`: ninguno. Cualquier otro match es **BLOCKER**.

---

## Trazabilidad

Issue #4 → `documents/PLAN_HOUSE.md` v1.1 (APROBADO) → este handoff → TASK-1 (commit `contracts: …
(#4)`) → TASK-2 (commit `docs: … (#4)`) → PR único contra `master` con `Closes #4`. Suma de tasks = criterios
1-12 del issue: 1-9 y 11 en TASK-1; 10 (`contracts/README.md`) y 12 (docs) en TASK-2; 11 (gates) también en
TASK-2. "CI verde": si #3 se mergea antes del PR, la CI gatea el PR; #4 no crea CI.

## Changelog

- **v1.2 (2026-10-30):** revisión MID de TASK-1 (PASA, commit de TASK-1 en la branch): TASK-2 suma a "Pendientes del
  usuario" la licencia del repo (cabecera de `house.move:1-2`) y fija el baseline en 26 tests. Línea transcrita por el orquestador.

- **v1.1 (2026-10-30)**, revisión del MAYOR sobre el handoff v1:
  - M1 (opción a): `fee_rate`, `fees_collected`, `min_bet`, `max_bet` validan la versión; `version()` no.
    4 tests nuevos (22-25); README punto 10 y tabla de funciones ajustados.
  - m1: test 15 con fee 1001 + versión incorrecta (orden de los chequeos); test 19 verifica que un setter
    vuelve a funcionar tras `migrate`; test 21 nuevo (House más nueva que el paquete ⇒ `ENotUpgrade`).
    Total ≥ 25 (20 + 4 de M1 + 1 de m1).
  - m2: línea `> Decisión` del accessor `version()` (FLUJO §8) y su fila en la tabla del README.
  - m3: PROY-10 se limita a la House y suma el invariante SEG-4 para `Game` (#5 decide la mecánica).
- **v1 (2026-10-30):** primera versión.
