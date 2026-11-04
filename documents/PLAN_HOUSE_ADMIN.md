# PLAN_HOUSE_ADMIN v1.1
> Issue: #14 (+ NIT-3 de la revisión de integración de #12, comentado en #14) | Áreas: app / docs (contracts: solo
> fixture y README, **sin cambios de código Move**) | Branch: `feature/issue-14-house-admin` (desde `master` `deaadbb` +
> D-20261104-01 y su cambio a Railway (`a06ceba`) + D-20261104-02 (`1c21029`, HEAD)) | Fecha: 2026-11-04 | Autor: MID

## Changelog

**v1.1 (2026-11-04)**, sobre la revisión del MAYOR del plan v1 (REQUEST CHANGES: 1 MAJOR, 7 MINOR, 4 SUGGESTION) y
D-20261104-02:

| Hallazgo | Cambio en el plan |
|---|---|
| MAJOR-1: "0 objetos ⇒ sin permisos" sin mirar `hasNextPage` | D-1: `null` **solo** con `objects: []` y `hasNextPage: false`; si hay más páginas se sigue el cursor hasta 3 páginas juntando hasta 2 objetos, y sin certeza `ReadDataError`, nunca `null`. Tests nuevos en TASK-2 (`{[], true}`, `{[cap], true}` + segundo cap, tope de páginas) |
| MINOR-1: el error de una relectura desmonta el panel; tipo ambiguo | D-1: `useHouseCap` devuelve `cap: { kind: 'unknown' } \| { kind: 'known'; cap: HouseCap \| null }`. D-2: orden de estados con el patrón de `GameDetailPage.tsx:54-58` (`ReadState` como aviso encima del panel cuando ya hay un cap). Test en TASK-5 |
| MINOR-2: el `precheck` depende del índice de dueños | D-6: el `precheck` usa `getObject(capId)` (store de objetos), con tipo exacto, `AddressOwner` = `sender` y objeto existente; el índice queda solo para la detección. `owner` `null` de `mapOwner` ⇒ `ReadDataError` (D-1 y D-6) |
| MINOR-3: `useTxTarget` convierte un objetivo desconocido en `create` | D-5: `switch` exhaustivo sobre `target.kind` en `useTxTarget`; test en TASK-3 (clave termina en `'house'`, `targetHash` ≠ el de `create`) |
| MINOR-4: NIT-3 protegido solo por un test | D-5: `ACTION_KINDS` derivado de un objeto `satisfies Record<TxAction['kind'], true>`; `TxValueByAction` con chequeo de tipo contra `Record<TxAction['kind'], unknown>`: una acción que falte rompe el `typecheck` |
| MINOR-5: el orden de TASK-1 choca con la fixture | TASK-1: orden fijo (S-1, S-3, S-4, S-5 con la captura; S-6; S-2 **al final**, fuera de la fixture). El script de captura solo lee y simula |
| MINOR-6 (SEG-4): conservación del retiro en la app | D-4 y TASK-2: el builder del retiro tiene **exactamente 2** comandos (`MoveCall withdraw_fees(house, cap)` y `TransferObjects([Result 0], recipient)`); TASK-4: `recipient` = la cuenta capturada en el clic |
| MINOR-7 (claves): N-3 sin el `UpgradeCap` | N-3 y la checklist del owner: la dirección publicadora también tiene el `UpgradeCap`; importar esa clave en una wallet de navegador lo expone (contra el sentido de D-20261102-03); `agents.md` §12 ya indica `transfer_house_cap` por CLI |
| SUGGESTION-1: "Volver a comprobar" en "Sin permisos" | **Adoptada** (D-2): relee solo el cap, no actúa sobre la House, así que no contradice P-1 (a); cubre el atraso del índice justo después de recibir el cap (R-1) |
| SUGGESTION-2: motivo `negative` en `validateBetLimits` | **Adoptada** (D-3): `parseSuiToMist` lo devuelve (`sui/format.ts:12`) y ningún otro motivo lo cubre |
| SUGGESTION-3: el `precheck` de "cap transferido" no se ejercita en la UI | **Adoptada** (Smoke): se declara en el SMOKE; queda cubierto por los tests de TASK-4 y por S-5 |
| SUGGESTION-4: HEAD | **Adoptada** (encabezado) |
| D-20261104-02 | P-1..P-4 = (a) y N-2 ya decidido: líneas `> Decisión (2026-11-04): …` en "Decisiones abiertas"; motivo de P-3 corregido; condición de P-4 sobre el body de #17 |

**v1 (2026-11-04):** primera versión.

## Historia de usuario

**Como** titular del `HouseCap` (el owner, admin de la House), **quiero** un panel en la app que solo vea la cuenta que
tiene el cap, con la comisión, los límites de apuesta y las comisiones acumuladas, y con botones para cambiar la comisión,
cambiar los límites y retirar las comisiones a mi cuenta, **para** administrar la House desde el navegador sin armar
comandos de la CLI y con el mismo resultado honesto (solo lo que confirma el nodo) que el resto de la app.

**Scope en una frase:** ruta `#/admin` con la detección del `HouseCap` por tipo entre los objetos de la cuenta conectada,
la lectura de la House y tres acciones (`update_fee_rate`, `update_bet_limits`, `withdraw_fees` + transferencia del
`Coin` a la cuenta) sobre la máquina de transacciones de #11/#12, más el enlace "Administrar House" en el encabezado solo
para esa cuenta.

**Lo que NO entrega:** transferir el `HouseCap` desde la UI (fuera de alcance por el issue; sigue por CLI); `migrate` ni
upgrades desde la UI (fuera de alcance; en la v1 `migrate` siempre aborta con `ENotUpgrade`); retiro parcial o a otra
dirección; métricas o historial de comisiones; el smoke en testnet con la cuenta del owner (paso del owner, después de
#8: ver STOP P-4); cambios en el contrato.

---

## Contexto y alcance

### Qué existe hoy (rutas reales)

- **Contrato** (`contracts/sources/house.move`, sin cambios en este issue):
  - `entry update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16)` (`:98`): versión (`house`/3) y luego
    `new_fee_rate <= MAX_FEE_BPS` (1000, `house`/0). Acepta el mismo valor que ya tiene (emite el evento igual).
  - `entry update_bet_limits(house, _: &HouseCap, min_bet: u64, max_bet: u64)` (`:108`): versión y luego
    `min_bet > 0 && min_bet <= max_bet` (`house`/1). Sin tope superior propio (solo `u64`).
  - `public withdraw_fees(house, _: &HouseCap, ctx): Coin<SUI>` (`:141`): versión y `fees_collected > 0` (`house`/2);
    retira **todo** y emite `FeesWithdrawn { house_id, amount }`. El `Coin` no tiene `drop`: la PTB tiene que
    transferirlo (D-20261030-11 D4).
  - `entry transfer_house_cap(cap: HouseCap, recipient: address)` (`:125`) y `entry migrate(house, _: &HouseCap)`
    (`:132`). `HouseCap has key` sin `store` (`:42`): solo se mueve con `transfer_house_cap`.
  - Eventos `FeeRateUpdated { house_id, old_fee_rate, new_fee_rate }`, `BetLimitsUpdated { house_id, old_min_bet,
    old_max_bet, new_min_bet, new_max_bet }`, `FeesWithdrawn { house_id, amount }` (`:48-67`).
  - La authZ es la **posesión** del cap (SEG-2, `contracts/README.md` "Autorización"): el panel no es un control de
    seguridad.
- **App:**
  - `app/src/sui/house.ts`: esquema BCS de la `House`, `houseType`, `parseHouseObject` (no valida `fee_rate <= 1000` a
    propósito, `:40-41`) y `fetchHouse`. `app/src/hooks/useHouse.ts`: la House de la config (al montar y al foco).
  - `app/src/sui/errors.ts:22-28`: `ABORT_MESSAGES.house` 0-4 ya existen (#11) con su test por código.
  - Máquina de transacciones: `app/src/hooks/useExecuteTransaction.ts` (preflight, firma con la cuenta capturada,
    confirmación por el nodo, invalidación), `useTxTarget.ts` (una vista por objetivo), `txSession.ts` (tipos y lógica
    pura), `txInvalidation.ts` (tabla de invalidación), `queryKeys.ts` (claves).
  - **NIT-3 de #12** (comentario del issue): `ACTION_KINDS` (`txSession.ts:129`) es la lista blanca que reconoce una
    mutación como propia. Una acción nueva que falte ahí, en `TxValueByAction`/`AdoptedTx` (`:99-109`) o en la tabla de
    `txInvalidation.ts` hace que la vista vea su propia mutación como ajena (aviso "en curso" y bloqueo de sí misma).
  - Otros puntos que tocan las acciones nuevas: `toTxGameEntry` (`txSession.ts:194-198`) supone que toda acción que no es
    `create` tiene `gameId`; `adoptedStatus` de `GameActions.tsx:38-49` es un `switch` exhaustivo sobre `AdoptedTx`;
    `transactionInvalidations` (`txInvalidation.ts:17-36`) siempre reinicia el lobby.
  - `app/src/sui/config.ts` no lee `houseCapId` de `deployments/<red>.json` (el campo existe y es obligatorio en el
    esquema de #7, pero la app no lo usa).
  - Encabezado (`components/Header.tsx`) con el enlace "Mis partidas"; rutas en `App.tsx:24-34`.
- **Despliegue:** el `HouseCap` lo recibe el publicador en `init` (`house.move:93`). En localnet es `ADMIN` (cuenta de la
  génesis); en testnet, la dirección con la que el owner publique en #8.

### Verificación contra el SDK instalado (`@mysten/sui` 2.37.0, `npm ci` con Node 26 en este worktree)

- `SuiGrpcClient.listOwnedObjects({ owner, type?, limit?, cursor?, include? })` →
  `{ objects: Object<Include>[], hasNextPage, cursor }` (`dist/client/types.d.mts:89-122`). En gRPC llama a
  `stateService.listOwnedObjects` con `objectType` (`dist/grpc/core.mjs:101-140`); el `readMask` siempre trae `owner`,
  `object_type`, `digest`, `version` y `object_id`, y `include: { content: true }` agrega `contents` (BCS). El tipo pasa
  por `mvr.resolveType`, que con una dirección `0x…` lo devuelve tal cual sin pedir nada (`dist/client/mvr.mjs:100-102`).
- Proto (`ListOwnedObjectsRequest`, `state_service.d.mts:533-578`): `page_size` por defecto 50 (máx. 1000); el filtro de
  tipo sin parámetros de tipo trae cualquier instanciación.
- **Sonda pública en testnet, sin claves** (MID, 2026-11-04; solo lecturas, `fullnode.testnet.sui.io`):
  - V-1: `listOwnedObjects` de `0x0` sin filtro → 20 objetos, todos `owner.$kind = AddressOwner`, `hasNextPage: true`;
  - V-2: con `type` = un tipo de la lista (forma larga) → solo objetos de ese tipo exacto; `content` llega en BCS;
  - V-3: con la forma corta de la dirección del paquete (`0x2::bag::Bag`) → mismo resultado (el nodo normaliza);
  - V-4: con un tipo **inexistente** (paquete ficticio `0x1…1::house::HouseCap`) → `objects: []`, `hasNextPage: false`,
    sin error. Un dueño sin objetos, igual. Es lo que verá una cuenta sin cap en testnet;
  - V-5: con un tipo mal formado → `INVALID_ARGUMENT` ("invalid object_type …"): la app nunca lo arma (el tipo sale de
    `originalPackageId` validado por `config.ts`).
- Lo que no se puede medir sin una localnet (TASK-1): el índice de dueños del fullnode de `sui start` 1.83, el retraso
  del índice tras `transfer_house_cap`, el error de una preflight cuyo `sender` no posee el cap y la forma real de los
  aborts y eventos de `house`.

### Alcance

1. Detección del `HouseCap` de la cuenta conectada por tipo (`<originalPackageId>::house::HouseCap`).
2. Ruta `#/admin`: estados sin cuenta / leyendo / error / sin permisos / panel.
3. Panel: `fee_rate` (bps y %), `fees_collected`, `min_bet`, `max_bet` y `version` (diagnóstico) leídos del objeto.
4. Tres acciones con builders puros, validación espejo, preflight, mapeo de aborts y relectura de la House.
5. Integración con la máquina (NIT-3): `ACTION_KINDS`, `TxValueByAction`/`AdoptedTx`, tabla de invalidación,
   `toTxGameEntry`, `adoptedStatus`.
6. Enlace "Administrar House" en el encabezado solo con el cap.
7. Fixture real de las operaciones de la House (localnet aislada) y docs.

**Fuera de alcance:** ver "Lo que NO entrega".

---

## Contrato on-chain

**Sin cambios** de firmas, structs, eventos ni abort codes. Darle el cap a la burner del smoke usa
`transfer_house_cap`, que ya existe (ver "Smoke"): no cambia el contrato.

Impacto en `app/src/sui/` y en la tabla de `agents.md` §5:

- **Espejo nuevo de `house::MAX_FEE_BPS`** (1000) para la validación de la UI (criterio del issue). `agents.md` §5 dice
  "La app no replica `house::MAX_FEE_BPS`; si una vista lo replica (#14), entra en esta tabla": TASK-6 agrega la fila
  (fuente `house.move:22`, espejo `HOUSE_MAX_FEE_BPS` en `sui/houseAdmin.ts`, se revisa en todo upgrade que toque la
  constante). `parseHouseObject` sigue sin validarlo (una House con más de 1000 tras un upgrade se lee igual).
- **Esquemas BCS nuevos:** `HouseCap` (`{ id }`) y los tres eventos de admin, con el mismo patrón que `house.ts` y
  `events.ts` (tipo exacto, bytes canónicos). Entran en la fila "Layout BCS de la `House`" de §5.
- **Abort codes:** `house` 0-4 ya mapeados; sin códigos nuevos.
- **Compatibilidad de upgrade:** nada nuevo. Los tipos del cap y de los eventos usan `originalPackageId`; los targets,
  `packageId` (DL-9 de #10).

---

## Flujo de fondos

Solo `withdraw_fees` mueve SUI:

- **Entrada:** ninguna desde la app (las comisiones entran por `add_fees` en cada `accept_game`).
- **Salida:** la PTB es `withdraw_fees(house, cap)` → `Coin<SUI>` con **todo** `fees_collected` → `transferObjects([coin],
  <cuenta que firma>)`. El destino es siempre la cuenta conectada que firma y que tiene el cap (criterio del issue,
  D-20261030-11 D4). No hay campo de destino ni monto parcial.
- **Conservación:** `amount` del `FeesWithdrawn` = `fees_collected` antes del retiro; la House queda en 0; el saldo de la
  cuenta sube `amount − costo de red`. El smoke lo verifica con lecturas del nodo (paso 11).
- `update_fee_rate` y `update_bet_limits` no mueven fondos: cambian reglas de las partidas **futuras** (el `Game` copia
  la comisión al crearse, D-20261030-06 §3; los límites solo se aplican al crear, `contracts/README.md` "Límites").

---

## Diseño

### D-1. Detección del `HouseCap` (`sui/houseCap.ts`, `hooks/useHouseCap.ts`)

- `houseCapType(originalPackageId)` = `normalizeStructTag(\`${originalPackageId}::house::HouseCap\`)`.
- `fetchHouseCap(client, { owner, originalPackageId, signal })`: `listOwnedObjects({ owner, type: houseCapType(…), limit:
  2, include: { content: true } })` con `withReadTimeout` por pedido (política común de lecturas, DL-5 de #10).
  - **Regla de certeza (MAJOR-1):** el proto permite que el nodo devuelva menos que `page_size` ("The service may return
    fewer than this value", `state_service.d.mts:541`; V-1 lo mostró: 20 objetos con `hasNextPage: true`), también una
    página vacía con cursor. Por eso se sigue el `cursor` mientras `hasNextPage` sea `true`, hasta
    `HOUSE_CAP_MAX_PAGES = 3` páginas, juntando como mucho 2 objetos.
  - 0 objetos **y** `hasNextPage: false` en la última página ⇒ `null` (sin permisos; V-4). Es el **único** camino a
    `null`.
  - Tope de páginas alcanzado con `hasNextPage: true` y sin la respuesta completa ⇒ `ReadDataError('incomplete', …)`:
    una lectura incompleta nunca es "sin permisos".
  - Exactamente 1 objeto con la lectura completa ⇒ `parseHouseCapObject`: tipo exacto (`isExactType`, que normaliza el
    `type` que llega sin normalizar, `core.mjs:127`), `owner` no `null` (`mapOwner` puede dar `null`, `core.mjs:599`) y
    `owner.$kind === 'AddressOwner'` con la dirección = `owner` pedido (`sameAddress`), BCS exacto de `{ id: Address }` e
    `id` = `objectId`. Si no, `ReadDataError`.
  - 2 objetos juntados (en una página o entre varias) ⇒ `ReadDataError('invariant', …)`: `init` crea un solo cap y no
    hay otro constructor.
- **Por tipo y no por `houseCapId`:** es el criterio del issue, funciona sin tocar `config.ts` y el tipo es único del
  paquete. `config.ts` no suma `houseCapId` (ARQ-7). El ID que va a la PTB es el del objeto detectado.
- `useHouseCap()`: sin cuenta, `{ kind: 'no_account' }` y ninguna consulta (`skipToken`); con cuenta,
  `useQuery({ queryKey: queryKeys.houseCap(red, originalPackageId, cuenta) })` → `{ kind: 'account', cap: CapKnowledge,
  status: ReadStatus, isFetching, refetch }`, con `CapKnowledge = { kind: 'unknown' } | { kind: 'known'; cap: HouseCap |
  null }` (MINOR-1). `unknown` = todavía no hubo una lectura exitosa (cargando, reintentando o error sin dato previo);
  `known` = el dato de la última lectura exitosa, que se conserva aunque una relectura posterior falle (`query.data` de
  TanStack). Sin intervalo; al montar y al foco (como `useHouse`). La clave lleva la cuenta normalizada: cambiar de cuenta
  cambia la consulta.
- **Qué ve una cuenta sin cap:** ningún enlace en el encabezado; en `#/admin` directo, "Sin permisos: esta cuenta no
  tiene el HouseCap de esta House." sin datos ni acciones sobre la House (STOP P-1), con el botón "Volver a comprobar"
  (SUGGESTION-1). Mientras se lee, o con error de lectura sin dato previo, el enlace no aparece y la página muestra
  `ReadState` con "Reintentar": un error de lectura **nunca** se presenta como "sin permisos".

### D-2. Página y panel

- Ruta `admin` → `pages/HouseAdminPage.tsx`; la página monta `<HouseAdminView key={address} />` (como "Mis partidas",
  DL-9 de #13): cambiar de cuenta remonta la vista. Enlace "Administrar House" en `Header.tsx` solo con
  `cap.kind === 'known' && cap.cap !== null` (lo pide el issue; no es STOP).
- **Estados de la página** (MINOR-1, patrón de `GameDetailPage.tsx:54-58`: el `ReadState` es un aviso y no reemplaza lo
  ya leído):
  - sin cuenta ⇒ "Conecta la wallet que tiene el HouseCap para administrar la House";
  - `cap.kind === 'unknown'` ⇒ solo `ReadState` (cargando, "Reintentando… (intento n de m)" o error con "Reintentar");
  - `known` con `null` ⇒ "Sin permisos…" con "Volver a comprobar" (deshabilitado mientras relee). Una relectura que falla
    deja "Sin permisos" con el `ReadState` encima: el último dato exitoso sigue siendo "sin cap";
  - `known` con cap ⇒ el panel, con el `ReadState` del cap **encima** cuando una relectura reintenta o falla. El panel
    **no se desmonta** por un error de relectura. Pasa en la práctica: la ventana de una wallet de extensión quita el foco
    y al volver TanStack relee, y la invalidación de D-5 también relee `houseCap` antes de `done`. Así no se pierden el
    texto del resultado, el digest ni el costo (PROY-16), que el panel no podría adoptar al remontarse (`mountSnapshot`:
    lo terminado antes de montar no se adopta);
  - el panel lee la House con `useHouse` (misma clave que el formulario de creación) con la misma regla: `ReadState`
    solo sin dato; con dato, aviso encima de la configuración.
- **Panel** (`components/HouseAdminPanel.tsx`, sin lógica de negocio, ARQ-2):
  - "Configuración": comisión `<bps> bps (<formatBps>)`, mínimo y máximo en SUI, comisiones acumuladas en SUI, versión
    de la House. Botón "Actualizar" (relee House y cap).
  - "Comisión": campo en **bps enteros** con el equivalente en % en vivo (STOP P-2), el aviso fijo "Las partidas ya
    creadas conservan la comisión con que se crearon; la nueva se aplica a las que se creen desde ahora." y el resumen
    "de X a Y" junto al botón "Actualizar comisión" (STOP P-3).
  - "Límites de apuesta": mínimo y máximo en SUI (`parseSuiToMist`, como el formulario de creación), el aviso "Los límites
    solo se aplican al crear partidas: las pendientes no cambian." y "Actualizar límites".
  - "Comisiones": "Retirar `<fees>` SUI a tu cuenta"; con `fees_collected == 0`, deshabilitado con "No hay comisiones
    para retirar" (mismo texto que `house`/2). Nota: "Se retira todo lo acumulado al momento de ejecutarse; el monto
    real sale de la transacción."
  - Un `TransactionStatus` por acción, el aviso "en curso", el resultado adoptado y **una** alerta "sin confirmar" con
    "Ya la revisé" (patrón de `GameActions`).
- **Un solo objetivo para las tres acciones:** `useTxTarget({ kind: 'house' })` una vez en el panel. Es un solo objeto
  (la House): un "sin confirmar" de cualquiera de las tres bloquea las tres hasta "Ya la revisé"; el candado global por
  cuenta (DL-7 de #12) sigue igual (una transacción de la cuenta deshabilita todo, también el formulario y las partidas).

### D-3. Validación espejo (`sui/houseAdmin.ts`, puras, motivos tipados como `validateCreateGame`)

- `HOUSE_MAX_FEE_BPS = 1000` (espejo de `house::MAX_FEE_BPS`, `agents.md` §5).
- `validateFeeRate(text, current)` → `{ ok: true, bps }` o `{ ok: false, reason: 'empty' | 'invalid' | 'too_high' |
  'unchanged' }`. Solo dígitos (sin recortar, sin signo, sin decimales, sin exponente), `0..HOUSE_MAX_FEE_BPS`
  inclusive. `unchanged` (igual a la actual) deshabilita el botón: el contrato lo acepta, pero sería una transacción sin
  efecto que paga gas (DL, no STOP).
- `validateBetLimits(minText, maxText, current)` → `{ ok: true, minBet, maxBet }` o errores por campo (`empty`,
  `negative`, `invalid`, `too_many_decimals`, `too_large` de `parseSuiToMist` (`sui/format.ts:12`; `negative` por
  SUGGESTION-2); `zero_min`; `min_above_max`; `unchanged` si los dos son iguales a los actuales). Espejo exacto de
  `min_bet > 0 && min_bet <= max_bet`.
- `canWithdraw(house)` = `house.feesCollected > 0n`.
- La validación es cortesía (SEG-1): el contrato decide; la preflight lo confirma antes de abrir la wallet.

### D-4. Builders puros (`sui/transactions/house.ts`, modelo `transactions/game.ts`)

- `buildUpdateFeeRateTx({ packageId, houseId, capId, feeRate })`: `house::update_fee_rate(house, cap, u16)`. Lanza si
  un ID es inválido o `feeRate` no es entero en `0..65535` (rango del `u16`; el tope de negocio es de la validación y del
  contrato, así un test puede armar 1001 y ver el abort real en la preflight).
- `buildUpdateBetLimitsTx({ packageId, houseId, capId, minBet, maxBet })`: `update_bet_limits(house, cap, u64, u64)`.
  Lanza fuera de `0..U64_MAX`.
- `buildWithdrawFeesTx({ packageId, houseId, capId, recipient })`: `const [coin] = withdraw_fees(house, cap)` y
  `transferObjects([coin], recipient)`. Exactamente **2** comandos (MINOR-6, SEG-4): `MoveCall
  <packageId>::house::withdraw_fees(house, cap)` y `TransferObjects([Result 0], recipient)`. Así el `Coin` que se
  transfiere es el que devolvió el retiro y no hay otros comandos. Lanza si `recipient` no es una dirección válida. Sin
  `Random`. El hook pasa como `recipient` el `sender` que `run` le da a `build(sender)` (D-5).
- `tx.object(capId)`: el SDK resuelve versión y digest del objeto propio; sin `sender` ni gas (los pone la preflight y la
  wallet).

### D-5. Integración con la máquina (NIT-3)

- `txSession.ts`:
  - `TxTarget` suma `{ kind: 'house' }` (`HouseTarget`); `queryKeys.txTarget` → `[...txAccount, 'house']`.
  - `TxAction` suma `{ kind: 'updateFeeRate' }`, `{ kind: 'updateBetLimits' }` y `{ kind: 'withdrawFees' }` (sin
    `gameId`: el objetivo es la House de la config).
  - `ACTION_KINDS` suma las tres; `TxValueByAction` suma `updateFeeRate: FeeRateUpdatedEvent | null`,
    `updateBetLimits: BetLimitsUpdatedEvent | null`, `withdrawFees: bigint | null` (el `amount` del evento). `AdoptedTx` se
    deriva solo.
  - **Atados al tipo (MINOR-4):** `ACTION_KINDS` se deriva de un objeto `{ create: true, cancel: true, …,
    withdrawFees: true } satisfies Record<TxAction['kind'], true>` (`new Set(Object.keys(…))`), y `TxValueByAction` lleva
    un chequeo de tipo contra `Record<TxAction['kind'], unknown>` (p. ej. un tipo auxiliar que falle si las claves no son
    exactamente `TxAction['kind']`). Una acción futura que falte en cualquiera de los dos rompe el `typecheck`, no solo un
    test.
  - `toTxGameEntry`: `gameId` solo para `cancel`/`reject`/`accept` (`switch` exhaustivo); las de la House dan `null`,
    como `create`. Test: una mutación de la House no fija ninguna fila de "Mis partidas".
- `ExecuteInput` (DL-11 de #13, "una sola captura de la cuenta"): `build: (sender: string) => Transaction` y
  `precheck?: (signal, sender) => …`. `run` pasa el `sender` capturado en las dos llamadas a `build` y al `precheck`. Los
  hooks existentes no cambian (una función con menos parámetros es asignable). El retiro usa `sender` como destinatario:
  la cuenta que firma y la que recibe son la misma por construcción.
- `useTxTarget`: sobrecarga para `HouseTarget` y normalización del objetivo con un `switch` **exhaustivo** sobre
  `target.kind` (MINOR-3). Hoy `useTxTarget.ts:60-62` convierte en `create` todo lo que no es `game`, sin error de
  compilación: con `house` así, el formulario de `#/` vería como suyo el "sin confirmar" de una acción de la House y se
  bloquearía. `house` no lleva ID.
- `GameActions.adoptedStatus`: las tres acciones nuevas devuelven `null` (no son de una partida; nunca comparten
  objetivo con una partida, así que no se adoptan ahí).
- `txInvalidation.ts`, filas nuevas (sin `reset` del lobby, sin `game` ni `myGames`: no cambian):

  | Acción | `resetQueries` | `invalidateQueries` (en este orden) |
  |---|---|---|
  | `updateFeeRate` / `updateBetLimits` | — | `house`, `houseCap` de la cuenta |
  | `withdrawFees` | — | `house`, `balance` de la cuenta, `houseCap` de la cuenta |

  `house` también refresca el formulario de creación (sus términos) en la misma pestaña. `houseCap` va siempre: si la
  acción falló porque el cap ya no está en la cuenta, el panel pasa a "sin permisos".

### D-6. Acciones (`hooks/useUpdateFeeRate.ts`, `useUpdateBetLimits.ts`, `useWithdrawFees.ts`)

- Hooks finos sobre `useExecuteTransaction(view)` (modelo `useCancelGame`), con la `view` de `useTxTarget({ kind:
  'house' })` y el `capId` del cap detectado al hacer clic.
- **`precheck` común (MINOR-2):** `getObject(capId)` sobre el store de objetos, que es autoritativo y no depende del
  índice de dueños que mide S-2, con `withReadTimeout`. Exige que el objeto exista, tipo exacto `houseCapType`, `owner` no
  `null` y `AddressOwner` = `sender` (`sameAddress`). Si no se cumple (también con un `ObjectError` de "no existe"), corta
  con "Esta cuenta ya no tiene el HouseCap: no puede administrar la House." e invalida `houseCap` (patrón M-2 de #11).
  Así el caso "el cap se transfirió en otra pestaña o por CLI" no llega a la preflight con un error de objeto ajeno sin
  traducir (S-5 mide qué daría sin el `precheck`), aunque el índice todavía lo liste. Un error transitorio o el corte ⇒
  texto de red (M-3 (a)). El índice (`fetchHouseCap`) queda solo para la detección.
- **Preflight** (la de siempre): simula la copia con `sender`; un abort `house`/0-3 sale mapeado por `errors.ts` sin abrir
  la wallet e invalida lo de la acción (el estado mostrado estaba viejo).
- **`interpret`** (lee solo de la transacción confirmada por el nodo, SEG-10):
  - `parseFeeRateUpdated(result, { originalPackageId, houseId })` → único `FeeRateUpdated` de esa House (`old`, `new`);
  - `parseBetLimitsUpdated(…)` → único `BetLimitsUpdated` de esa House;
  - `parseFeesWithdrawn(…)` → `amount` del único `FeesWithdrawn` de esa House.
  - Cero o más de uno, ilegible o de otra House ⇒ `null`: éxito honesto sin valor ("Comisión actualizada; no se pudo leer
    el evento: la configuración de arriba muestra el valor vigente").
- **Textos de éxito:** "Comisión actualizada: de X bps (x %) a Y bps (y %). Las partidas ya creadas conservan la suya.";
  "Límites actualizados: mínimo X SUI, máximo Y SUI (antes X′ – Y′)."; "Retiraste `<amount>` SUI de comisiones a tu
  cuenta." (más digest y costo de red de `TransactionStatus`).
- **Relectura de la House:** la invalidación de D-5 corre antes de `done` (patrón de #11): al terminar, la configuración
  de arriba ya muestra lo nuevo.

### D-7. `migrate` y `transfer_house_cap`

- **`migrate`: solo CLI.** En la v1 siempre aborta (`ENotUpgrade`, la House nace en `VERSION`); solo tiene sentido en el
  procedimiento de upgrade (`contracts/README.md`, "Versionado"), que es del owner y fuera de alcance del issue. El panel
  muestra `version` como dato; una House migrada por un paquete más nuevo se ve porque toda acción aborta en la preflight
  con `house`/3 ("hay que actualizar la app"). La app **no** replica `VERSION` (sin espejo nuevo).
- **`transfer_house_cap`: fuera del MVP en la UI** (el issue lo excluye). Es irreversible y su error típico (mandarlo a
  un ID de objeto) deja comisiones y configuración bloqueadas para siempre (`contracts/README.md`, "Qué pasa si se pierde
  el cap"). Sigue por CLI con el procedimiento del README. TASK-6 reescribe la "Nota para #14" de ese README: la
  validación del destinatario queda como checklist para quien lo haga por CLI. Reabrirlo es un STOP **no delegable**
  (N-1).

---

## Decisiones abiertas → STOP

Por D-20261104-01, el orquestador aplica la recomendada en los STOPs de **producto** (P-n) y la registra como "tomada por
el orquestador por delegación del usuario". Los **no delegables** (N-n) quedan para el owner. **Estado v1.1:** P-1..P-4 y
N-2 están resueltos por D-20261104-02 (pendiente de revisión del owner a su vuelta); N-1 y N-3 no bloquean. **No queda
ningún STOP abierto.**

### STOPs de producto (delegables)

**P-1. Qué ve en `#/admin` una cuenta conectada sin cap.**
- (a) Solo "Sin permisos: esta cuenta no tiene el HouseCap de esta House.", sin datos ni acciones sobre la House (con
  "Volver a comprobar", que solo relee el cap: SUGGESTION-1). Literal del criterio del issue; nada que confunda a un
  jugador.
- (b) "Sin permisos" más la configuración de la House en solo lectura (comisión, límites, acumulado). Útil, pero los
  términos ya están en el formulario de creación y el acumulado no le sirve a un jugador.
- **Recomendación: (a).**

> Decisión (2026-11-04): se optó por (a), solo "Sin permisos" sin datos de la House, sobre (b) configuración en solo
> lectura, porque es el literal del criterio del issue — tomada por el orquestador por delegación del usuario
> (D-20261104-01), D-20261104-02 (1), pendiente de revisión del owner.

**P-2. Unidad del campo de comisión.**
- (a) Basis points enteros (0..1000), con el equivalente en % en vivo al lado. Es la unidad del contrato, de los eventos
  y de la CLI; sin decimales ni conversión que redondear.
- (b) Porcentaje con hasta 2 decimales (0..10 %), convertido a bps. Más natural, pero suma una conversión y un caso de
  redondeo.
- **Recomendación: (a).**

> Decisión (2026-11-04): se optó por (a), bps enteros con el % equivalente al lado, sobre (b) % con decimales, porque es
> la unidad del contrato, de los eventos y de la CLI — tomada por el orquestador por delegación del usuario
> (D-20261104-01), D-20261104-02 (2), pendiente de revisión del owner.

**P-3. Confirmación antes de firmar.**
- (a) Sin paso extra: junto al botón, el resumen "de X bps (x %) a Y bps (y %)" (el equivalente para los límites, y el
  monto para el retiro); la wallet muestra su aprobación. **Motivo (corregido en v1.1):** el cambio de comisión **no** es
  del todo reversible, porque las partidas creadas mientras rige una comisión equivocada la conservan para siempre
  (D-20261030-06 §3). Aun así alcanzan el resumen explícito junto al botón y el tope de 10 % del contrato: un diálogo
  más repetiría el mismo dato. Los límites sí se vuelven a cambiar sin efecto sobre las pendientes, y el retiro va a la
  cuenta del propio admin.
- (b) Un diálogo "¿Confirmas…?" antes de la preflight. Un clic más que repite el resumen (con la burner no hay ventana,
  con una wallet ya existe la de la wallet).
- **Recomendación: (a).**

> Decisión (2026-11-04): se optó por (a), resumen "de X bps (x %) a Y bps (y %)" junto al botón y la ventana de la
> wallet, sobre (b) un diálogo de confirmación, porque el resumen y el tope de 10 % del contrato bastan aunque el cambio
> de comisión no sea del todo reversible (D-20261030-06 §3) — tomada por el orquestador por delegación del usuario
> (D-20261104-01), D-20261104-02 (3), pendiente de revisión del owner.

**P-4. Smoke de testnet del issue (paso del owner) y merge.** El criterio "Smoke en testnet con la cuenta del owner" no se
puede correr hasta #8 (publicación del owner, PR #48 congelado).
- (a) Mergear #14 con el smoke completo en la localnet aislada (todas las operaciones, con la burner como titular). La
  checklist de testnet del owner (sección "Checklist del owner en testnet": cap en la wallet, cambio de comisión y de
  límites, retiro) va como **casillas en el body de #17**, no solo en un comentario, y en el SMOKE; el comentario de
  cierre de #14 dice que ese criterio pasa a #17. Precedente: #9, #12 y #13.
- (b) Dejar el PR abierto hasta que el owner corra el smoke en testnet.
- **Recomendación: (a).** No cambia quién hace el smoke de testnet ni qué verifica; solo saca a #14 del camino de
  #15/#16 mientras el owner no está.

> Decisión (2026-11-04): se optó por (a), merge con el smoke completo en localnet y la checklist del owner como casillas
> en el body de #17 (y dicho en el comentario de cierre de #14), sobre (b) PR abierto hasta el smoke de testnet, porque es
> proceso, no publica, no mueve fondos ni toca claves — tomada por el orquestador por delegación del usuario
> (D-20261104-01), D-20261104-02 (4), pendiente de revisión del owner.

**Descartados como STOP (detalles internos, registrados en el plan):** enlace del encabezado solo con cap (lo pide el
issue); ruta `#/admin` y texto "Administrar House"; botón deshabilitado con la comisión o los límites iguales a los
actuales; un solo objetivo de transacción para las tres acciones; `precheck` del cap; "Volver a comprobar".

### STOPs no delegables (fondos, capabilities, claves)

**N-1. Transferir el `HouseCap` desde la UI.** No entra: el issue lo deja fuera de alcance y el plan no lo propone. Lo
registro como no delegable por si alguien lo quiere reabrir: toca capabilities y es irreversible.
- **Recomendación:** dejarlo fuera del MVP. Si se reabre post-MVP: validar el destinatario con `parseAddressInput`,
  rechazar una dirección que sea un objeto existente (`getObject` encuentra algo ⇒ no), pedir que se escriba la dirección
  dos veces, y mostrar el aviso de irreversibilidad.
- **No bloquea** este plan.

**N-2. Retiro de comisiones desde la UI: ya decidido.** No es una decisión nueva de fondos: la función y su forma las
decide D-20261030-11 D4 (`public withdraw_fees` devuelve el `Coin` y "la PTB decide el destino"; D1 ya contaba con el
panel de #14 para ajustar la comisión), y el destino, el criterio del issue #14 ("la PTB lo transfiere a la cuenta
conectada", sin decisiones abiertas). El merge no mueve fondos reales: no hay nada publicado en testnet hasta #8 ni
alojado hasta #15.
- **Condiciones (se cumplen en D-4/D-5/D-6):** retiro **total**; destino = la cuenta que firma **por construcción**
  (`build(sender)`); sin campo de destino ni monto parcial. Cualquier variante (otra dirección, retiro parcial, retiro
  automático) es un STOP no delegable.

> Decisión (2026-11-04): el retiro de comisiones desde la UI no es una decisión nueva de fondos; ya lo deciden
> D-20261030-11 D4 y el criterio de #14 — retiro total a la cuenta que firma, por construcción; cualquier variante es STOP
> no delegable — D-20261104-02 (5), marcado para revisión del owner a su vuelta.

**N-3. Cómo llega el cap a la wallet del navegador en testnet (paso del owner).** Si la dirección publicadora de #8 no es
la de su wallet de navegador, el owner decide entre:
- `transfer_house_cap` por CLI desde su `SUI_CONFIG_DIR` (irreversible: verificar la dirección dos veces). Es el camino
  que ya indica `agents.md` §12;
- importar la clave publicadora en una wallet de navegador. **Ojo (MINOR-7):** la dirección publicadora también tiene el
  `UpgradeCap` (lo recibe el `sender` de `publish`). Importar esa clave expone el `UpgradeCap` a la wallet de extensión, lo
  que va contra el sentido de D-20261102-03 (clave de publicación en un `SUI_CONFIG_DIR` propio).

Es una decisión de claves y custodia: solo el owner. El plan no la toma; deja la checklist y el comando. No bloquea el
merge.

---

## Smoke en la localnet aislada (variante B, regla B4)

- **Cómo recibe el cap la burner:** el publicador (`ADMIN`, cuenta de la génesis) recibe el `HouseCap` en `init`. El
  smoke lo pasa a la burner del navegador con `transfer_house_cap` por CLI, con el prefijo `PRE` (B4), después de leer la
  dirección de la burner del encabezado:
  `PRE act_as "$ADMIN" && suic call --package "$PKG" --module house --function transfer_house_cap --args "$HOUSE_CAP"
  <burner>`. `HOUSE_CAP` sale de `contracts/deployments/localnet.json` (`houseCapId`, lo escribe el script en la variante
  B) y se anota en `ids.env`.
- **¿Cambia el contrato?** No: `transfer_house_cap` es una función `entry` publicada desde #4. Ninguna cuenta firma como
  la burner por CLI ni lee `<SMOKE_DIR>/net` desde Node.
- **Consecuencia:** después de la transferencia, `ADMIN` ya no administra (sirve como verificación de custodia, SEG-2). La
  burner es una clave por carga de página: tras fondearla y darle el cap se navega **solo por hash**; si se recarga, el
  cap queda en una clave perdida y la corrida se reinicia con génesis nueva (o se termina). Se pierde con la génesis al
  cerrar, sin efecto fuera de `<SMOKE_DIR>`.
- **Comisiones para retirar:** `A` crea y `B` acepta por CLI después de que la burner fija la comisión desde la UI.
- **Lo que el smoke no puede ejercitar (SUGGESTION-3):** el `precheck` de "cap transferido" (D-6). Para que la burner
  pierda el cap habría que firmar como ella por CLI, y eso está prohibido. Queda cubierto por los tests de TASK-4 y por
  S-5 de TASK-1; el SMOKE lo declara en sus precondiciones.
- **Navegador (🌐):** Chrome headless + CDP con `--user-data-dir` en `<SMOKE_DIR>/chrome-profile`, `HOME`/`XDG_*` en
  `<SMOKE_DIR>/chrome-home`, depuración solo en `127.0.0.1`, arranque como comando en segundo plano del harness con
  `exec` y el PID en `<SMOKE_DIR>/chrome.pid`; cierre **solo** con `kill "$(cat <SMOKE_DIR>/chrome.pid)"` y verificación
  con `pgrep -af <SMOKE_DIR>/chrome-profile` vacío. Nunca el Chrome ni el perfil del usuario, nunca `pkill`/`killall`.
  Cada pestaña con `Target.createTarget({ url, newWindow: true })`, todas visibles, nunca `Page.bringToFront`. `vite`
  igual, con `vite.pid`.
- **Lecciones de #13 que entran al runbook:** `app.env` con la guarda `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL;
  return 97; }` (SUGGESTION-1); en CDP se cuentan solo los `POST` de gRPC-web, no los preflight CORS (SUGGESTION-3);
  `env.sh`, `app.env` y `chrome.env` nunca en la misma llamada.

**Pasos previstos** (el MID escribe `documents/SMOKE_HOUSE_ADMIN.md` con el formato de §M5 cuando el último task quede
aprobado; los resultados se llenan durante la corrida):

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Génesis, arranque, publicación B; `ADMIN`, `A`, `B` en `ids.env`; `PRE suic object "$HOUSE_CAP"` | Dueño del cap = `ADMIN` (por rol); House con fee 0, 0,001 / 50 SUI |
| 2 | 🌐 T1, burner `W` conectada | Sin enlace "Administrar House"; 1 `ListOwnedObjects` |
| 3 | 🌐 `#/admin` | "Sin permisos…", sin datos ni acciones sobre la House, con "Volver a comprobar" (P-1) |
| 4 | `A` fondea `W` (2 SUI) y crea `G0` abierta de 0,2 SUI | `G0.fee_rate` = 0 |
| 5 | `ADMIN`: `transfer_house_cap` → `W` | Evento `HouseCapTransferred`; `suic object` del cap: dueño `W` |
| 6 | 🌐 navegar a `#/` y a `#/admin` (por hash); si sigue "Sin permisos" por el atraso del índice (S-2), "Volver a comprobar" | Aparece el enlace; panel con 0 bps (0 %), 0 SUI acumulado, 0,001 / 50 SUI, versión 1; "Retirar" deshabilitado con "No hay comisiones para retirar" |
| 7 | 🌐 comisión `1001`, `abc`, `0` (igual a la actual) | Errores de validación y botón deshabilitado; 0 `SimulateTransaction` |
| 8 | 🌐 comisión 250 | Etapas en orden; éxito "de 0 bps (0 %) a 250 bps (2.5 %)" solo tras la confirmación (observador); 2 `SimulateTransaction` + 1 `ExecuteTransaction`; `suic object "$HOUSE"`: `fee_rate` 250; `G0` sigue en 0; el formulario de `#/` muestra 2.5 % |
| 9 | 🌐 límites `0`/`10`, `5`/`1`, luego `0.002`/`10` | Los dos primeros, errores sin pedidos; el tercero, éxito con evento; `suic object`: 2000000 / 10000000000 |
| 10 | `A` crea `G1` de 0,2 SUI y `B` la acepta; `B` acepta `G0` | `G1.fee_rate` 250; `GameResolved` con comisión 0,01 y 0; `fees_collected` = 10000000 |
| 11 | 🌐 "Actualizar" y "Retirar" | Muestra 0,01 SUI antes; éxito "Retiraste 0.01 SUI…"; `FeesWithdrawn.amount` = 10000000 = `fees_collected` previo; House en 0; saldo de `W` = antes + 0,01 − costo de red; "Retirar" vuelve a deshabilitarse |
| 12 | 🌐 durante el paso 8 u 11 | El candado: los otros botones del panel deshabilitados; ningún aviso "en curso" sobre la propia vista (NIT-3) |
| 13 | 🌐 T2 nueva (burner `W2`, sin cap) | Sin enlace; `#/admin` "Sin permisos…" |
| 14 | `ADMIN`: `update_fee_rate` 300 por CLI con el cap que ya no tiene | Falla al armar o ejecutar (objeto de otro dueño); la House sigue en 250: custodia verificada (SEG-2) |
| 15 | Cierre (paso 7 de `agents.md` §3) | Chrome, `vite` y `sui` cerrados por su PID; `~/.sui/` igual a la línea base; árbol limpio salvo el SMOKE |

**Checklist del owner en testnet** (va al SMOKE y como **casillas en el body de #17**, P-4 / D-20261104-02 (4); no la
corre ningún agente):
1. Tras #8, con `deployments/testnet.json` mergeado: si la dirección publicadora no es la de la wallet del navegador,
   resolver N-3. Si usa `transfer_house_cap` por CLI, verificar la dirección de destino dos veces. Si piensa importar la
   clave publicadora en una wallet de navegador, tener en cuenta que esa dirección también tiene el `UpgradeCap`.
2. Abrir la app de testnet con la wallet del cap: aparece "Administrar House" y el panel muestra la comisión fijada en #8.
3. Cambiar la comisión (p. ej. +1 bps) y restaurarla al valor de #8; verificar `FeeRateUpdated` en el explorador. Entre
   las dos transacciones, no anunciar el juego: una partida creada en ese intervalo conserva la comisión intermedia.
4. Cambiar los límites y restaurarlos; verificar `BetLimitsUpdated`.
5. Tras al menos una partida resuelta con comisión: anotar `fees_collected`, retirar y comparar el `amount` del
   `FeesWithdrawn` y lo recibido con ese valor.
6. Con otra cuenta: sin enlace y "Sin permisos" en `#/admin`.

---

## Tasks (ordenados por dependencia)

### TASK-1: Sondas en la localnet aislada y fixture real de la House — área: app/scripts + contracts/fixtures
- **Entregable:** `app/scripts/capture-house-fixtures.mjs` y `contracts/fixtures/house-admin.localnet.json`, con el
  resultado de las sondas en el reporte.
- **Archivos:** nuevos `app/scripts/capture-house-fixtures.mjs` y `contracts/fixtures/house-admin.localnet.json`;
  reutiliza `app/scripts/localnet-guard.mjs` sin cambios. **No** toca `capture-tx-fixtures.mjs` ni
  `game-tx.localnet.json`: retirar las comisiones dejaría su `house` con `fees_collected` 0, del que dependen los tests de
  #12.
- **Orden fijo (MINOR-5)** en la localnet aislada de `agents.md` §3 (génesis nueva, variante B, B4; los valores se pegan
  en el reporte). El cap tiene que seguir en `ADMIN` durante toda la parte de la fixture:
  1. **Transacciones por CLI**, en este orden y con el prefijo `PRE` (S-4): `ADMIN` `update_fee_rate` 250; `ADMIN`
     `update_bet_limits` (p. ej. 2000000 / 10000000000); `A` crea una partida abierta (dentro de los límites nuevos) y `B`
     la acepta (comisión > 0); `ADMIN` `withdraw_fees` + `transferObjects` a sí mismo en una PTB. Si hace falta medir el
     camino de la wallet, el de S-1 bis de #11 (`suic ptb … --serialize-signed-transaction` y ejecución por gRPC).
  2. **Captura** con `node app/scripts/capture-house-fixtures.mjs` (prefijo de Node 26). El script **solo lee y simula**:
     - S-1: `listOwnedObjects` por dueño y tipo contra el fullnode de `sui start` 1.83 (el índice de dueños responde;
       forma de `owner`, `type` y `content`; `ADMIN` ve 1 cap y `A` 0, V-4 en localnet). También el paginado: con
       `limit: 1`, `hasNextPage` y `cursor` reales;
     - S-4 (lectura): las tres transacciones ejecutadas, encontradas por los eventos de admin del paquete (`ListEvents`
       por tipo `FeeRateUpdated`, `BetLimitsUpdated`, `FeesWithdrawn`) y leídas con `getTransaction` (efectos y eventos);
     - S-3: simulaciones sin firmar (`setSender` de `ADMIN`, como `capture-tx-fixtures.mjs`) de `update_fee_rate(1001)`
       (`house`/0), `update_bet_limits(0, x)` y `(5, 1)` (`house`/1) y `withdraw_fees` con la House ya en 0
       (`house`/2): `SimulationError` real con `executionError`;
     - S-5: la preflight de `update_fee_rate` con `sender` = `A` (sin el cap): qué error llega (`SimulationError` con o
       sin `executionError`, código gRPC, texto). Justifica el `precheck` (D-6) y fija su test;
     - `getObject` del cap (dueño `ADMIN`): la forma que usa el `precheck` de D-6.
  3. **Segunda captura**, idéntica salvo `_meta.capturedAt` (determinismo).
  4. S-6 (sonda, fuera de la fixture): budget que el nodo elige en la preflight de cada acción. Es la referencia para el
     gas del smoke; no hay reserva de cortesía nueva salvo que S-6 lo pida.
  5. **S-2 al final, fuera de la fixture:** `transfer_house_cap` de `ADMIN` a `A` por CLI; cuánto tarda
     `listOwnedObjects` en reflejar el dueño nuevo frente a `getObject` (`waitForTransaction` + sondeo cada 100 ms; hasta
     5 corridas con devolución `A → ADMIN` por CLI entre una y otra, declarada) y que el dueño anterior deja de verlo. Si
     el índice se atrasa respecto de `getObject`, se declara: el panel lo sufre después de recibir el cap ("Volver a
     comprobar") y por eso el `precheck` usa `getObject`.
- **Fixture:** `ids` (paquete, House, cap), `houseCapListing` (la respuesta de `listOwnedObjects` de `ADMIN`, la vacía de
  `A` y la página de `limit: 1`), `houseCapObject` (el `getObject` del cap), `simulationErrors` (S-3 y S-5, con `sender`
  por rol), `executed` (S-4, sin `sender` ni `signatures`) y `house` (el objeto después del retiro; el monto retirado sale
  del `FeesWithdrawn`). Roles: `ADMIN` (publica y tiene el cap), `A` (crea), `B` (acepta). Determinista salvo
  `_meta.capturedAt`. El orden del paso 1 va documentado en el encabezado del script, que aborta con un mensaje claro si
  falta una de las tres transacciones o si el cap no está en `ADMIN`.
- **AuthZ:** la custodia del cap (S-1, S-2) es la verificación de SEG-2.
- **DoD:** script con la guarda primero (sale con código 2 ante otra `--url` antes de pedir nada); dos capturas iguales
  salvo `capturedAt`; sondas S-1..S-6 con valores; cierre limpio (paso 7); gates de la app y `node --test` de
  `contracts/scripts/` sin delta (el script nuevo no entra a ningún gate).
- **Tests:** ninguno nuevo en este task (la fixture la consumen TASK-2 y TASK-4).
- **Riesgos:** si S-1 muestra que el fullnode local no indexa dueños, STOP técnico al MID (habría que detectar por
  `getObject(houseCapId)`, que exige sumar `houseCapId` a `config.ts`). Con V-1..V-5, testnet sí lo sirve.

### TASK-2: Capa pura `sui/` de la House — área: app
- **Entregable:** detección, validación, builders y lectura de eventos de admin, todo puro y testeado.
- **Archivos:** nuevos `app/src/sui/houseCap.ts` (+ test), `app/src/sui/houseAdmin.ts` (+ test),
  `app/src/sui/transactions/house.ts` (+ test). Sin cambios en `house.ts` ni `errors.ts` salvo que S-3 muestre otra cosa.
- **Cambios:** D-1 (`houseCapType`, `parseHouseCapObject`, `fetchHouseCap`), D-3 (`HOUSE_MAX_FEE_BPS`,
  `validateFeeRate`, `validateBetLimits`, `canWithdraw`), D-4 (los tres builders) y los parsers de D-6
  (`parseFeeRateUpdated`, `parseBetLimitsUpdated`, `parseFeesWithdrawn`, con esquemas BCS de los eventos y tipo exacto
  `<originalPackageId>::house::<Evento>`; modelo `gameTx.ts`).
- **AuthZ:** `parseHouseCapObject` exige `AddressOwner` = la cuenta pedida.
- **DoD / tests (Vitest):**
  - detección con la fixture real: 1 cap ⇒ cap; vacío con `hasNextPage: false` ⇒ `null`; 2 ⇒ `ReadDataError`; tipo de
    otro paquete, dueño `Shared`/otra dirección/`null`, bytes no canónicos ⇒ `ReadDataError`; la consulta pide `type`
    normalizado, `limit: 2` y `content` (cliente mockeado);
  - paginado (MAJOR-1, cliente mockeado): `{ objects: [], hasNextPage: true }` y luego `{ [], false }` ⇒ `null` tras
    seguir el cursor; `{ [], true }` en las 3 páginas ⇒ `ReadDataError('incomplete')`, **nunca** `null`;
    `{ [cap], true }` + una segunda página con otro cap ⇒ `ReadDataError('invariant')`; `{ [cap], true }` + `{ [], false }`
    ⇒ el cap; cada página siguiente se pide con el `cursor` de la anterior;
  - validaciones: cada motivo, bordes 0, 1000, 1001, espacios, decimales, `unchanged`, `min == max`, `U64_MAX`;
  - builders: target con `packageId`, argumentos en orden y tipo (`u16`, `u64`); el del retiro con **exactamente 2**
    comandos (MINOR-6): `MoveCall <packageId>::house::withdraw_fees(house, cap)` y `TransferObjects([Result 0],
    recipient)`, con `recipient` = la dirección recibida; lanzan con IDs, montos o dirección inválidos;
  - eventos con la fixture real (S-4): valores; cero, dos, ilegible u otra House ⇒ `null`;
  - `errors.ts` con los `SimulationError` reales de `house`/0, 1 y 2 (S-3) ⇒ mensaje mapeado con el sufijo
    `(código house/<n>)`.
- **Riesgos:** ninguno de contrato; si S-5 llega como `INVALID_ARGUMENT` sin `executionError`, el texto sin `precheck`
  sería "No se pudo preparar…" (lo cubre D-6).

### TASK-3: Máquina de transacciones para el objetivo House (NIT-3) — área: app
- **Entregable:** las tres acciones reconocidas como propias, con su invalidación, sin cambiar el comportamiento de las de
  partidas.
- **Archivos:** `app/src/hooks/txSession.ts`, `queryKeys.ts` (`houseCap`, `txTarget` con `house`), `txInvalidation.ts`,
  `useExecuteTransaction.ts` (`build(sender)`, `precheck(signal, sender)`), `useTxTarget.ts` (sobrecarga
  `HouseTarget`), `app/src/components/GameActions.tsx` (`adoptedStatus` exhaustivo), y sus tests.
- **Cambios:** D-5 completo.
- **DoD / tests:**
  - `ACTION_KINDS` y `TxValueByAction` atados a `TxAction['kind']` (MINOR-4): quitar una clave de cualquiera de los dos
    rompe el `typecheck` (el reporte lo demuestra con una prueba local que no se commitea);
  - `txVariablesOf` reconoce las tres acciones;
  - `useTxTarget({ kind: 'house' })` (MINOR-3): `view.key` termina en `'house'` y su `targetHash` es distinto del de
    `{ kind: 'create' }`; un "sin confirmar" de la House no bloquea el formulario de creación ni lo adopta;
  - `deriveTargetState`: una mutación propia de la House **no** da `in_flight` en su vista (el caso de NIT-3) y una ajena
    terminada del mismo objetivo se adopta con su tipo;
  - `toTxGameEntry` da `gameId: null` para las tres; `liveTxGameIds` no fija filas por ellas;
  - `transactionInvalidations`: filas de D-5 exactas y sin `lobby`; las filas de partidas sin cambios (sus tests viejos
    pasan sin tocarlos);
  - `useExecuteTransaction`: `build` y `precheck` reciben la dirección capturada en el clic (también si la cuenta
    conectada cambia antes de terminar); las aserciones existentes no cambian;
  - `queryKeys.txTarget` con `house` y `houseCap` con la dirección normalizada.
- **Riesgos:** regresión en "Mis partidas" o en el detalle; se mide con la suite completa sin delta en los tests viejos.

### TASK-4: Hooks de detección y de acciones — área: app
- **Entregable:** `useHouseCap`, `useUpdateFeeRate`, `useUpdateBetLimits`, `useWithdrawFees`.
- **Archivos:** nuevos `app/src/hooks/useHouseCap.ts`, `useUpdateFeeRate.ts`, `useUpdateBetLimits.ts`,
  `useWithdrawFees.ts` (+ tests); posible arnés en `app/src/test/txHarness.tsx` (`useHouseView`).
- **Cambios:** D-1 (hook) y D-6.
- **DoD / tests:**
  - `useHouseCap`: sin cuenta, ninguna consulta; con cuenta, la clave lleva la cuenta normalizada; cambio de cuenta ⇒ otra
    consulta; primera lectura fallida ⇒ `cap: { kind: 'unknown' }` con `status` error, nunca `known` con `null`; con un
    cap ya leído, una relectura fallida ⇒ sigue `known` con el cap y `status` error o reintentando (MINOR-1);
  - por acción, `precheck` con `getObject(capId)` (MINOR-2, cliente mockeado y forma de `houseCapObject` de la fixture):
    cap de otra dirección, `owner` `null`, tipo distinto u `ObjectError` "no existe" ⇒ corte con el texto e invalidación
    de `houseCap`, sin preflight ni wallet; un error transitorio ⇒ texto de red; el `precheck` **no** llama a
    `listOwnedObjects`;
  - abort en la preflight ⇒ mensaje mapeado, wallet sin abrir, invalidación; éxito ⇒ valor del evento e invalidaciones de
    D-5 en orden; "sin confirmar" bloquea las tres acciones del panel;
  - retiro (MINOR-6): el `recipient` del `TransferObjects` es la cuenta capturada en el clic (la que `run` pasa a
    `build(sender)`), también si la cuenta conectada cambia antes de que termine.
- **Riesgos:** los mocks del cliente tienen que sumar `listOwnedObjects` y `getObject` del cap.

### TASK-5: Página, panel y enlace del encabezado — área: app
- **Entregable:** ruta `#/admin`, `HouseAdminPage`, `HouseAdminPanel` y el enlace "Administrar House".
- **Archivos:** nuevos `app/src/pages/HouseAdminPage.tsx`, `app/src/components/HouseAdminPanel.tsx` (+ tests);
  `app/src/App.tsx` (ruta), `app/src/components/Header.tsx` (enlace) y sus tests (`Header.test.tsx` y `App.test.tsx`
  mockean `useHouseCap`).
- **Cambios:** D-2 con los textos fijos de D-2/D-6 y selectores estables para el smoke (`section.house-admin`,
  `[data-house-action="fee" | "limits" | "withdraw"]`, `.house-config`, `.tx-status`).
- **AuthZ (UI):** sin cap no hay acciones; el contrato decide igual (SEG-2).
- **DoD / tests:**
  - página: sin cuenta, `unknown` (leyendo, reintentando, error con "Reintentar", nunca "sin permisos"), `known` sin cap
    (sin datos ni acciones, con "Volver a comprobar" que relee solo el cap) y con cap; remonta con `key={address}`;
  - **con un cap en caché, una relectura que falla no desmonta el panel** (MINOR-1): el `ReadState` aparece encima y el
    `TransactionStatus` de una acción terminada sigue a la vista con su texto, digest y costo;
  - panel: datos de la House en bps y %, SUI; validaciones con su texto y el botón deshabilitado; "Retirar" deshabilitado
    con 0; resumen "de X a Y"; aviso de la copia de la comisión y de los límites; un `TransactionStatus` por acción, el
    aviso "en curso", el adoptado y una sola alerta "sin confirmar";
  - encabezado: enlace solo con `known` y un cap (no con `no_account`, `unknown` ni `known` con `null`); con el cap
    conocido y una relectura fallida, el enlace se mantiene;
  - ningún componente importa `@mysten/*` salvo `/ui` (lint de capas).
- **Riesgos:** el encabezado consulta el cap en toda página con cuenta: 1 `ListOwnedObjects` por cuenta y al foco. Costo
  aceptado (V-1: ~0,8 s el primero en testnet, en paralelo con el resto).

### TASK-6: Documentación — área: docs
- **Entregable:** docs coherentes con el código (PROY-20).
- **Archivos:** `app/README.md` (sección "Panel de la House (#14)": detección, estados, acciones, textos, invalidación;
  mapas de `sui/`, hooks y componentes; tabla de invalidación de "Transacciones" con las filas nuevas y el cambio de
  `build(sender)`/`precheck(signal, sender)`; fixture nueva en "Fixtures de lectura"), `contracts/README.md` (fixture
  nueva en la tabla de rutas; "Qué pasa si se pierde el cap": la nota para #14 pasa a checklist de la CLI; `version()`
  como dato del panel; detección por tipo en "Lectura desde la app"), `agents.md` (§2 layout de `fixtures/` y
  `scripts/`; §5 filas de `MAX_FEE_BPS` y de los layouts BCS del cap y los eventos; §12 la checklist del cap para el
  panel), `documents/STATUS.md` (baselines y ciclo).
- **DoD:** sin rutas personales ni hex de 40-64 en lo agregado; los conteos de tests y el tamaño del build coinciden con
  el último reporte de código.

**Suma de tasks = issue completo:** detección (TASK-2/4/5), lectura (TASK-5), acciones con builders testeados (TASK-2/4),
máquina e invalidación (TASK-3), tests y gates (todos), smoke (localnet en el ciclo; testnet según P-4).

---

## Baseline de referencia (STATUS, a re-verificar en el §0 del handoff)

- App @ `feature/issue-13-my-games` TASK-5 (`7a3b7fb`, mergeado en `ab1e2d5`): lint 0, typecheck 0, **915 tests** en 57
  archivos, build de testnet 901.45 kB (273.61 kB gzip); `npm audit --omit=dev --audit-level=high` 0.
- Contracts @ `master`: 83 tests Move, 0 warnings, 0 lints; scripts 99 tests, `check` "0 despliegues". Este ciclo no toca
  `contracts/sources/` ni `contracts/scripts/`.
- Toolchain: Sui CLI 1.83.0, Node v26.13.0, tren `@mysten/*` 2.37.0 / 1.6.39 / 2.1.41. Sin dependencias nuevas.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | El índice de dueños del fullnode local no existe o se atrasa tras `transfer_house_cap` | S-1/S-2 en TASK-1; si falta, STOP técnico (detección por `getObject(houseCapId)`). El atraso lo cubren "Volver a comprobar" (detección) y el `precheck` por `getObject` (acciones) |
| R-7 | Una página parcial del nodo leída como "sin permisos" (MAJOR-1) | Regla de certeza de D-1 (cursor con tope; sin certeza, `ReadDataError`) y sus tests en TASK-2 |
| R-2 | Una acción de la House vista como ajena (NIT-3) | Test explícito en TASK-3 y paso 12 del smoke |
| R-3 | Regresión en las acciones de partidas al tocar `ExecuteInput` y `toTxGameEntry` | Firmas compatibles; tests viejos sin cambios |
| R-4 | El espejo de `MAX_FEE_BPS` queda viejo tras un upgrade | Fila en `agents.md` §5; la preflight y el contrato deciden igual |
| R-5 | La burner pierde el cap al recargar durante el smoke | Navegar solo por hash; si pasa, génesis nueva |
| R-6 | El owner no tiene el cap en su wallet de navegador en testnet | N-3 y checklist del owner; no bloquea el merge |
