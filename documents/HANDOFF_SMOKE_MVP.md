# HANDOFF_SMOKE_MVP
> Plan: PLAN_SMOKE_MVP v1 (aprobado por el MAYOR con cambios, 2026-11-04) | Issue: #17 | Branch:
> `feature/issue-17-mvp-smoke` | Versión: v1.1 | Fecha: 2026-11-04 | Autor: MID

**Changelog v1.1** (revisión del MAYOR del handoff v1: APRUEBA CON CAMBIOS, 1 🟡 y 4 🔵, todos tomados):
- **MINOR-1: el corte en `checkpoint(d4w)` no es exacto.** Una aceptación ajena puede caer en el mismo checkpoint que
  `d4w`, pero después, y entonces 4b y H7 daban un NO PASA falso. Los cortes en `K0` y `K4` siguen exactos, porque todo
  `accept_game` muta la House. Opción (a):
  - en `final`, una igualdad que no depende del orden:
    `amount(d4w) + fees_collected(final) == F0 + Σ fee` de **todos** los `GameResolved` con `K0 < checkpoint ≤ kRead(final)`;
  - en 4b: `amount ≥ F4`, y `amount == F4` solo si no hay `GameResolved` con checkpoint en `(K4, checkpoint(d4w)]`; si
    los hay, se anotan como ajenas y no hacen NO PASA (P-3);
  - H7 cambia en el Anexo A, en TASK-2 (pasos 9-12, con los valores esperados) y en la nota de 4a de TASK-4.
- **🔵 1:** el filtro de salida usa el patrón de §R-6, `[0-9a-fA-F]{40,}`, con o sin `0x`.
- **🔵 2:** `kRead` reintenta con una espera acotada si la transacción todavía no trae `checkpoint`. Al vencer, el bloque
  sale con código 4 ("repetir el bloque"). Nunca falla el check ni toma el checkpoint como 0.
- **🔵 3:** TASK-2 publica en la **variante B**, no en la A que dice el plan (`PLAN_SMOKE_MVP.md:304`). Con la B, la sonda
  lee `contracts/deployments/localnet.json` por la misma ruta y en la misma forma que leerá `testnet.json`. El plan no se
  edita: manda este handoff.
- **🔵 4, S-8:**
  - el body del PR enlaza el PR de TASK-6 de #15 y su evidencia (`deploy-image` positivo, P1-P13 y E-6);
  - la revisión de integración comprueba los criterios de #15 que quedan para ese PR: la URL en `app/README.md` y en el
    README raíz, y el smoke B.

**Changelog v1:** primera versión. Incorpora la revisión del MAYOR del plan v1 (sin 🔴 ni 🟠), y estos cambios respecto
del plan:
- **MINOR-1 (comisiones ajenas por checkpoint):** las comisiones ajenas se cuentan en una ventana por checkpoint, no
  desde la publicación. En 4a, `Σ fee` de los `GameResolved` ajenos con checkpoint `> K0` (la lectura de 0.4) y
  `≤ K4` (la lectura de 4a). En H7, `fees_collected` = las ajenas con checkpoint `> checkpoint(d4w)` (**reemplazado en
  v1.1** por la igualdad independiente del orden). La sonda anota el checkpoint de cada lectura de la House (DL-9, §Sonda).
- **MINOR-2 (1d pasa a O-7):** 1d deja de ser paso y pasa a ser la observación medida **O-7** (`gasBudget` y precio de gas
  reales). Si el budget supera 0,01 SUI: issue `type:bug` `priority:P2`, que **no** bloquea el cierre. `app/README.md:589`
  se actualiza en TASK-5 con lo medido (DL-10).
- **Sugerencia 1 (addendum de #8):** después de mergear `master` en #8, un addendum del handoff de #8 con el baseline
  nuevo, antes de autorizar su TASK-5. Va como paso obligatorio S-3, con su texto.
- **Sugerencia 2 (addendum de #15):** P-2 exige addenda de los handoffs de #15 (S-6) y de #16 (S-8), con su texto. No se
  escriben ahora: el de #8 está en una branch congelada, y los otros dos se escriben al empezar su task.
- **Sugerencia 3:** P-1..P-3 quedan registradas como **D-20261104-05**.
- **Sugerencia 4:** el merge de S-8 exige la preautorización N-2 registrada o al owner presente. La doc no garantiza que
  Railway respete `!app/README.md`.
- **Sugerencia 5:** el monto 0,100000001 SUI entra en el formulario: `app/src/sui/format.ts:30` admite hasta 9 decimales.

## Historia de usuario

**Como** owner, **quiero** recorrer con mis wallets, en testnet y sobre la URL publicada, todos los flujos del MVP, y que
un agente sin claves confirme cada paso con lecturas públicas y con la aritmética exacta de fondos, **para** declarar el
MVP terminado con evidencia.

**Scope en una frase:** dejar escritos la sonda de verificación, su ensayo en la localnet aislada, el runbook de la
corrida, la plantilla de `SMOKE_MVP.md` y el cierre del MVP.

**Lo que NO entrega:** la corrección de bugs (issues propios), cambios de contrato, de app o de CI, mainnet. No ejecuta
#8, #15 ni #16: fija qué tiene que pasar en cada uno antes de #17.

## Qué se implementa ya y qué espera

| Task | Área | Estado | Precondición |
|---|---|---|---|
| TASK-1 | docs (este handoff) | **PASA** (v1 aprobado con cambios por el MAYOR; v1.1 los aplica) | Plan v1 aprobado (cumplida) |
| TASK-2 | ensayo de la sonda en la localnet aislada | **Autorizable antes de #8** (v1.1) | La localnet aislada libre (un DEV a la vez, sin otro smoke en curso) |
| TASK-3 | precondiciones públicas (paso 0) | Especificado, **no empezar** | S-1..S-8 de la secuencia cumplidos; TASK-2 en PASA; handoff v1.1 con la sonda ensayada |
| TASK-4 | la corrida (owner firma, DEV verifica) | Especificado, **no empezar** | TASK-3 en PASA |
| TASK-5 | docs de cierre del MVP | Especificado, **no empezar** | TASK-4 con veredicto PASA |
| TASK-6 | PR, revisión y housekeeping | Especificado, **no empezar** | TASK-5 en PASA |

## 0. Baseline de gates verificado (2026-11-04, `master` `eb5332e`)

`eb5332e` es el merge de PR #62 (#16). `git diff fc5f004 eb5332e` está vacío. La CI de `master`
([run 41819936013](https://github.com/sdelvalle57/sui_battleship/actions/runs/41819936013)) da `contracts`, `app`,
`deploy-image` y `framework-drift` en success. Los valores salen del run del head de PR #62 (41818964452, mismo árbol) y
de STATUS. El MID no corre gates.

| Área | Valor |
|---|---|
| Sui CLI / Node | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` (npm `11.20.0`) |
| contracts | 0 warnings / 0 lints / **83 tests PASS**; `Move.lock` sin delta; scripts **99 PASS**; `publish.mjs check` **0 despliegues** |
| app | lint 0 / typecheck 0 / **1156 tests PASS en 65 archivos**; `index-*.js` 917.02 kB |
| imagen | `deploy-image` por el camino **negativo** (sin `testnet.json`) |

Rojos conocidos: ninguno. Ningún task de este handoff toca código, así que ninguno corre gates de código. TASK-2 cierra
con `git diff --exit-code -- contracts/Move.lock` y el árbol limpio. TASK-3 re-declara el baseline de `master` `M`, con el
`check` en "1 despliegue(s)…" y `deploy-image` por el camino positivo.

## Decisiones vigentes (no reabrir)

| ID | Qué fija aquí |
|---|---|
| D-20261104-05 | P-1 = (a): C ve el aviso sin botón. P-2 = (a): el cierre de #15 va en el PR de TASK-5 de #16. P-3 = (a): las comisiones ajenas por ventana de checkpoint. Por delegación |
| D-20261103-02 | La invitación ajena muestra "Esta invitación es para otra dirección." sin "Aceptar" |
| D-20261103-01 | Comisión de 200 bps desde la publicación. Se puede republicar hasta cerrar #17; **después, PROY-10 estricto**. Vive en la branch de #8 (`26f2676`) hasta su merge |
| D-20261030-16 D2/D3 | Comisión sobre el pozo completo, redondeada hacia abajo |
| D-20261030-06 §3 | El `Game` copia el `fee_rate` al crearse |
| D-20261104-02 (5) | Retiro total, a la cuenta que firma |
| D-20261102-03 | Ningún agente firma en testnet; la clave del owner vive en su `SUI_CONFIG_DIR` |
| Plan v1, DL-1..DL-8 | `SMOKE_MVP.md` nace en TASK-3; la sonda vive en `<scratchpad>` y no hay simulaciones; el panel va después del retiro; los montos de la tabla; IDs abreviados y digests completos; el caso del creador no aplica; solo los pasos abren `type:bug`; el SHA de cierre es `M` |
| DL-9 (este handoff, MINOR-1) | Checkpoint de una lectura de la House = checkpoint de su `previousTransaction`. Es exacto: toda aceptación muta la House, así que las que están en `fees_collected` tienen checkpoint `≤` ese y las que no, `>` |
| DL-11 (v1.1, MINOR-1 del handoff) | El corte en `checkpoint(d4w)` no es exacto: dentro de un checkpoint, una aceptación ajena puede ir antes o después del retiro. La igualdad exacta de comisiones es la de `final`: `amount + fees_collected(final) == F0 + Σ fee` de todos los `GameResolved` en `(K0, Kf]`. 4b solo exige `amount ≥ F4`, con igualdad si la ventana `(K4, checkpoint(d4w)]` está vacía. Precisa D-20261104-05 (3) |
| DL-10 (este handoff, MINOR-2) | 1d pasa a ser la observación O-7: un `gasBudget` mayor que la reserva da `type:bug` P2 no bloqueante |

## Reglas comunes

- **§R-1 Rutas y secretos.** Placeholders `<repo>`, `<scratchpad>`, `<SMOKE_DIR>`, `<HOME real>`, `<URL>` (la de Railway).
  Nunca una ruta real, una dirección de cuenta, un ID completo de objeto (DL-5: `0x1234…abcd`) ni nada del keystore.
  Digests completos sí (base58, públicos).
- **§R-2 Ningún agente firma.** Contra testnet, solo las lecturas de §Sonda y el navegador de §Navegador. Ningún
  `sui client` fuera de la localnet aislada (`agents.md` §3, B4). Ni `simulateTransaction` ni `dryRun`.
- **§R-3 Lo que trae el owner** (lo pasa el orquestador tal cual): digests por clave (`d1c`, …), los textos que vio
  copiados como texto y "sí/no" por chequeo. Nada de capturas de la wallet ni de direcciones.
- **§R-4 `SMOKE_MVP.md` se llena durante la corrida.** Cada fila se escribe cuando su verificación terminó, nunca antes.
  Lo que vio el owner va como `owner: "<texto>"`; lo que dio la sonda, como `sonda: <línea>`.
- **§R-5 Bugs.** Un paso en rojo es ❌ con su evidencia. El MID redacta el issue (`type:bug`, `area:`, prioridad,
  "Encontrado en #17, paso N", esperado vs obtenido) y el orquestador lo crea y lo enlaza en la fila y en #17. Al
  repetirlo después del fix va una fila `N.r1`, y la ❌ queda.
- **§R-6 Greps de salida** sobre todo archivo o salida que se pegue, con output pegado y vacíos:
  ```bash
  grep -nE '[0-9a-fA-F]{40,64}' <archivos>
  grep -nE '0x[0-9a-fA-F]{8,}' <archivos>
  grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <archivos>
  ```

## Secuencia previa obligatoria (S-1..S-8)

El plan explica el porqué de cada paso ("Secuencia de vuelta del owner"). 🔒 = no delegable.

| # | Paso | Quién | Hecho cuando |
|---|---|---|---|
| S-1 | 🔒 G2 de #8: el owner publica desde `26f2676` con el runbook (`git show 26f2676:contracts/README.md`, "Uso en testnet") y entrega los archivos y los 4 digests | owner | Entrega del paso 11 del runbook recibida |
| S-2 | G3 y merge de `master` en `feature/issue-8-testnet-publish`, **con merge commit** (sin rebase ni squash: el `sourceCommit` es `26f2676`) | orquestador | CI del head nuevo con `contracts`, `app` y `deploy-image` (este, **positivo**) en verde |
| S-3 | **Addendum del handoff de #8** (v1.2, o v1.3 si ya se usó el addendum de P-C), antes de autorizar su TASK-5 | MID de #8 | Revisado por el MAYOR |
| S-4 | TASK-5 y TASK-6 de #8, revisión del MAYOR publicada, merge y housekeeping | DEV, MAYOR, orquestador | #8 mergeado; `testnet.json` en `master` |
| S-5 | 🔒 N-3, la custodia del cap, **después de B5 de #8**: `transfer_house_cap` por CLI a la cuenta A (checklist de `contracts/README.md`, "Qué pasa si se pierde el cap"), o importar la publicadora | owner | El owner dice qué eligió y, si transfirió, da el digest `dcap` |
| S-6 | **Addendum del handoff de #15** (v1.6) y TASK-6 de #15, con `Refs #15` | MID, DEV, MAYOR, orquestador | Mergeado; `deploy-image` positivo en `master` |
| S-7 | 🔒 Railway: checklist de `app/README.md`, "Conectar Railway (owner, no delegable)", pasos 1-10, con el dominio y el smoke B | owner | El owner da la URL y los resultados del smoke B |
| S-8 | **Addendum del handoff de #16** (v1.3) y TASK-5 de #16, con `Closes #15` y `Closes #16` | MID, DEV, MAYOR, orquestador | Mergeado. **Antes del merge:** la preautorización N-2 registrada o el owner presente (sugerencia 4) |

**Texto obligatorio del addendum de #8 (S-3):**
- §0 con el baseline del head mergeado, leído de su CI: app 1156/65 y 917.02 kB (o lo que dé), contracts 83, scripts 99,
  `check` en **1 despliegue(s)**, `deploy-image` positivo con P1-P13, y el delta contra `26f2676` declarado (lo que trajo
  `master`).
- B9 con esos conteos. B10, además de `#/` y `#/game/<GAME>`: `#/my-games` y `#/admin` sin wallet, con sus textos de
  "conecta tu wallet".
- B11: en lugar de "los smokes de #12", dice "los smokes en localnet posteriores (TASK-2 de #17)".
- TASK-6: los docs de `master` ya traen las secciones de #14, #15 y #16. `agents.md` §12 conserva las líneas de Railway, y
  `README.md:27` quita "(PR #48)" **solo** si TASK-5 de #16 todavía no lo hizo (coordinar con S-8).
- Recordatorio: la custodia N-3 va después de B5 (S-5).

**Texto obligatorio del addendum de #15 (S-6, v1.6):**
- TASK-6 sale con `Refs #15`, sin la URL y sin `Closes #15` (D-20261104-05 (2)).
- Suma los 🔵 de la revisión de PR #57:
  1. `app/README.md:208`, sin ID de run;
  2. `:222`, se quita "TASK-3 de #15 (si no corrió en #15)";
  3. `app/scripts/check-deploy-image.sh:101`, N2b anclado a la cabecera del paso:
     `^#[0-9]+ \[build [0-9]+/[0-9]+\] RUN npm ci` (BuildKit) o `^Step [0-9]+/[0-9]+ : RUN npm ci` (clásico), con el rojo
     provocado de N2b repetido en los dos builders;
  4. la fila "Siguiente" de STATUS.
- El shellcheck del script se repite (`app/README.md`, "Al tocar `ci.yml`", la misma imagen).
- Precondición del checklist sin cambios: TASK-6 en PASA y `deploy-image` positivo en `master` **antes** de S-7.

**Texto obligatorio del addendum de #16 (S-8, v1.3):**
- TASK-5 suma la URL en `app/README.md:71` (el placeholder de "Despliegue (Railway)"), la parte B de
  `SMOKE_RAILWAY_DEPLOY.md` con los resultados del smoke B que dio el owner (como `owner:`) y el 🔵 de `README.md:74` (la
  línea de `.github/workflows/` nombra `deploy-image`, no requerido, y `framework-drift`, informativo).
- El body lleva `Closes #15` y `Closes #16`.
- El housekeeping de ese merge cierra los ciclos de #15 y #16. Si no lo hace, lo hace el de #17 (TASK-6).
- Sugerencia 4 del MAYOR: el merge requiere la preautorización N-2 registrada o al owner presente.
- El body del PR enlaza el PR de TASK-6 de #15 y su evidencia: `deploy-image` positivo en `master`, P1-P13 y E-6 (v1.1).
- La revisión de integración del MAYOR comprueba en ese PR los criterios de #15 que quedan pendientes: la URL en
  `app/README.md` y en el `README.md` raíz, y el smoke B registrado (v1.1).

## Sonda de verificación (especificación completa)

**Dónde y cómo.** Un solo archivo, `<scratchpad>/verify-mvp.mjs`, que **no se commitea** (DL-2). Se corre por stdin con cwd
`<repo>/app`, así resuelve `@mysten/sui` (m-4 de #8):

```bash
cd <repo>/app && "$NODE" --input-type=module - <args> < <scratchpad>/verify-mvp.mjs
```

Antes de la primera corrida, `import('@mysten/sui/grpc')` por la misma vía tiene que dar `ok`. Modelos a replicar:
- el cliente y `getServiceInfo`: `app/scripts/capture-tx-fixtures.mjs:64-70`;
- `getObject`/`getTransaction` con `include`: el mismo script, `:97`, `:145`, `:178` y `:251`;
- `ListEvents` crudo con `startCheckpoint`, filtro por `eventType`, `readMask` y fin `CHECKPOINT_BOUND`/`OUT_OF_RANGE`:
  `app/src/sui/eventScan.ts:59-80` (el `listEvents` del SDK falla con `OUT_OF_RANGE` en el fullnode público).

**Argumentos.**

| Argumento | Valor |
|---|---|
| `--deployment <ruta>` | `<repo>/contracts/deployments/testnet.json` (TASK-3/4) o `localnet.json` (TASK-2) |
| `--url <url>` | `https://fullnode.testnet.sui.io:443` o `http://127.0.0.1:9000`. Con otra URL, sale con código 2 antes de pedir nada |
| `--digests <ruta>` | `<scratchpad>/digests.json`: `{ "dcap"?, "d1c", "d1a", "d2c", "d2a", "d3c", "d3x", "d4w", "dh1", "dh2", "dh3", "dh4", "dO1"? }`. Faltan las de los bloques no corridos |
| `--state <ruta>` | `<scratchpad>/state.json`: solo valores públicos (`K0`, `F0`, `K4`, `amount4a`, IDs de `G1`/`G2`/`G3` completos, checkpoint de `d4w`). **Nunca** direcciones |
| `--block <b>` | `pre` (0.3-0.6) · `1` · `2` · `3` · `4a` · `4b` · `h` · `final` (H7 + conservación) |

**Lecturas permitidas (y ninguna más):** `ledgerService.getServiceInfo`; `getObject` con `include: { json: true,
previousTransaction: true }`; `getTransaction` con `include: { effects: true, events: true, transaction: true,
balanceChanges: true }`; `ledgerService.listEvents` crudo. Si el SDK 2.37 no da `balanceChanges`, TASK-2 lo reporta como
STOP al MID con la alternativa: derivarlos de `effects` y de los eventos.

**Identidades sin direcciones.** En cada corrida se derivan de nuevo y quedan solo en memoria:
- `A` = `sender(d1c)`, `B` = `sender(d1a)`, `CAP` = `AddressOwner` del `houseCapId`;
- todas con `normalizeSuiAddress`;
- se imprimen solo comparaciones.

**Auxiliares:**
- `gas(tx) = computationCost + storageCost − storageRebate` de `effects.gasUsed`, en `bigint`;
- `Δ(x, tx)` = suma de los `balanceChanges` de `x` con `coinType` SUI normalizado, o 0 si no hay entrada;
- `abbr(id)` = `0x` + 4 + `…` + 4;
- los eventos se decodifican con `@mysten/sui/bcs`, con los structs de las tablas de `contracts/README.md` ("Eventos" de
  `house` y `game`; `ID` y `address` = `bcs.Address`, `Option<address>` = `bcs.option(bcs.Address)`), y el tipo tiene que
  ser exacto: `<originalPackageId>::<módulo>::<Evento>`;
- los objetos se leen con `json`, con la forma de `contracts/README.md`, "Lectura desde la app": `u64` como string y el
  enum como `{"@variant": …}`;
- `kRead(obj)` = checkpoint de `getTransaction(previousTransaction)` del objeto leído (DL-9). Si la transacción todavía
  no trae `checkpoint` (recién ejecutada), se reintenta cada 500 ms hasta 30 s, el mismo tope que `TX_INDEX_TIMEOUT_MS`.
  Al vencer, la sonda sale con **código 4** y `SIN CHECKPOINT: repetir el bloque`: nunca toma 0 y nunca da NO PASA por
  eso. El mismo reintento vale para el checkpoint de cualquier digest (`d4w`, `dh1`, …).

**Salida.** Una línea por check, `CHECK <id> PASA|NO PASA <detalle>`. El detalle lleva solo booleanos, montos en MIST,
digests, checkpoints e IDs con `abbr`. Al final, `RESUMEN <n> PASA / <m> NO PASA` y exit 0 o 1. Los errores muestran solo
`error.message`, sin `cause` ni la respuesta. Antes de escribir cada línea, un filtro la corta y sale con código 3 si
encuentra `[0-9a-fA-F]{40,}`, con o sin `0x` (el patrón de §R-6): nada largo se imprime nunca. Los montos (≤ 20 dígitos),
los checkpoints y los digests base58 no llegan a ese largo.

**Checks por bloque.** Los montos esperados salen de la tabla del plan, con `r` = `fee_rate` del `GameCreated` de cada
partida.

| Bloque | Checks |
|---|---|
| `pre` | 0.3 chain id = `chainId` del json (testnet `4c78adac`). 0.4 House `Shared`; `fee_rate` 200; `min_bet` 1000000; `max_bet` 50000000000; `version` 1; `F0 := fees_collected`; `K0 := kRead(House)`. 0.5 dueño del cap; con `dcap`: `success`, `HouseCapTransferred.cap_id == houseCapId` y `recipient == CAP` → `true`. 0.6 `GameCreated`/`GameResolved` del paquete desde el checkpoint de `publishTxDigest`: cantidades y lista de ajenas (`abbr(game_id)`, `fee_rate`, checkpoint) |
| `1` | `d1c`: `success`; `GameCreated` con `creator == A`, `bet` 100000000, `opponent` none, `fee_rate` 200; `Δ(A,d1c) == −bet − gas(d1c)`; `G1 := game_id`. `d1a`: `success`; `B ≠ A`; `GameResolved` con `game_id == G1`, `creator == A`, `acceptor == B`, `winner ∈ {A,B}` (se imprime `winner == A` o `winner == B`); `pot == 2·bet`; `fee == ⌊pot·r/10000⌋`; `payout == pot − fee`. Balances según `winner` (tabla del plan); el último `MoveCall` es `accept_game` y después solo hay `TransferObjects`/`MergeCoins`. `G1`: `Resolved`, `acceptor == B`, `winner` igual al del evento, `stake` "0". **O-7:** `gasBudget` y `gasPrice` de `d1a` impresos; `gasBudget ≤ 10000000` → `true`/`false` (observación, no cuenta en el resumen) |
| `2` | `d2c`: `success`; `sender == A`; `GameCreated.opponent == B`; `bet` 100000001; `fee_rate` 200; `G2 := game_id`. `d2a`: `success`; `sender == B`; `pot` 200000002; `fee` 4000000; `payout` 196000002; balances exactos; `G2` `Resolved` con `stake` "0"; `previousTransaction(G2) == d2a`. O-7 también para `d2a` |
| `3` | `d3c`: `success`; `sender == A`; `bet` 1000000; `G3 := game_id`. `d3x`: `success`; `GameCancelled` con `refund` 1000000 y `cancelled_by == creator == A`; `Δ(A,d3x) == refund − gas(d3x)`; `Δ(A,d3c) + Δ(A,d3x) == −gas(d3c) − gas(d3x)`; la House **no** está entre los inputs de `d3x`; `G3` `Cancelled` con `stake` "0". Con `dO1`: `sender == A` |
| `4a` | House: `F4 := fees_collected`, `K4 := kRead(House)`; ajenas = los `GameResolved` con `game_id ∉ {G1,G2}` y `K0 < checkpoint ≤ K4` (lista y `Σ`); `F4 == F0 + fee(d1a) + fee(d2a) + Σ ajenas` (D-20261104-05 (3)); `amount4a := F4` |
| `4b` | `d4w`: `success`; `sender == CAP` (y `CAP == A` como dato); dos comandos: `MoveCall` `house::withdraw_fees` y `TransferObjects` con destino `== sender` (la dirección pura del input se decodifica con `bcs.Address`); `amount := FeesWithdrawn.amount`; `amount ≥ F4`; con `GameResolved` en `(K4, checkpoint(d4w)]` = ninguno, `amount == F4`; si hay alguno, se lista como ajeno (puede ir antes o después de `d4w` dentro del checkpoint) y no hace NO PASA (D-20261104-05 (3)), porque la igualdad exacta la da `final`; `Δ(CAP,d4w) == amount − gas(d4w)` |
| `h` | `dh1`: `FeeRateUpdated` 200 → 201, `sender == CAP`. `dh2`: 201 → 200; `GameCreated` con checkpoint en `[checkpoint(dh1), checkpoint(dh2)]`: lista (con `fee_rate` 201 se anota y no hace NO PASA). `dh3`: `BetLimitsUpdated` 1000000/50000000000 → 2000000/10000000000. `dh4`: de vuelta. En los cuatro, `Δ(CAP,tx) == −gas(tx)` |
| `final` | H7: House con `fee_rate` 200, 1000000/50000000000 y `version` 1; `Kf := kRead(House)`, `Ff := fees_collected`; **igualdad independiente del orden:** `amount + Ff == F0 + Σ fee` de **todos** los `GameResolved` con `K0 < checkpoint ≤ Kf` (los de G1 y G2 más los ajenos, listados). Sin ajenas, `Ff == 0`. Conservación: sobre `d1c, d1a, d2c, d2a, d3c, d3x, d4w`, `Σ Δ(A) + Σ Δ(B) == −Σ gas + (amount − fee(d1a) − fee(d2a))` |

**Autoprueba negativa** (TASK-2, obligatoria): (a) el bloque `1` con `d1a` cambiado por `d2a` da `NO PASA` y exit 1;
(b) el filtro de salida, alimentado con una línea de prueba que lleva 64 hex (una vez con `0x` y otra sin él), sale con
código 3 (la línea de prueba
se arma en memoria y nunca se pega).

## Navegador (Chrome headless, sin wallet)

Reglas de `agents.md` §3, paso 6 (🌐):
- perfil desechable en `<scratchpad>/chrome-<n>` (`--user-data-dir`, `HOME` y `XDG_*` aislados);
- CDP solo en `127.0.0.1`;
- `--disable-extensions`;
- con más de una pestaña, `Target.createTarget({ url, newWindow: true })` y nunca `Page.bringToFront`;
- nunca el navegador ni el perfil del usuario.

El script vive en `<scratchpad>` y no se commitea. Imprime solo booleanos y textos de la app (sin IDs completos).

| Id | Ruta | Esperado |
|---|---|---|
| N-a | `<URL>/#/` | el badge tiene "testnet" y "nodo OK" en ≤ 30 s |
| N-b | `<URL>/#/` (con el bloque 1) | un enlace a `#/game/<G1>` en el lobby mientras `G1` está `Pending`. Si `d1a` ya pasó, "no medible" (la verificación de 1b es la del owner) |
| N-c | `<URL>/#/` (con el bloque 2) | sin enlace a `G2` (las invitaciones no van al lobby) |
| N-d | `<URL>/#/game/<Gk>`, k = 1, 2, 3 | estado "Resuelta"/"Cancelada"; el `href` de "Ver en el explorador" es `https://suiscan.xyz/testnet/object/<Gk>` (se compara en el script, `true`) |
| N-e | recarga (`Page.reload`) de `#/game/<G1>`, `#/my-games` y `#/admin` | la misma vista; "Conecta tu wallet para ver tus partidas e invitaciones" y "Conecta la wallet que tiene el HouseCap para administrar la House" |
| N-f | todas | 0 violaciones de CSP (`securitypolicyviolation`); los errores de consola, listados. Un 403/CORS de `api.slush.app` es conocido (E-6 de #15) y no es rojo. Las cabeceras ya las cubre el smoke B de #15 y **no se repiten** |

`curl` del paso 0.2: `curl -sS <URL>/` → la ruta del `index-*.js` → `curl -sS <URL><ruta>` a un archivo en `<scratchpad>`.
Después, `grep -c` de `packageId`, `houseId` y `publishTxDigest` (leídos con `jq` del json a variables, nunca impresos):
solo se pegan los tres conteos (≥ 1) y el código HTTP.

## TASK-2: ensayo de la sonda en la localnet aislada (autorizable antes de #8) — área: docs (DEV)

### 1. Historia de usuario del task
**Como** DEV que verificará la corrida real, **quiero** probar la sonda contra un recorrido equivalente en una red
desechable, con las mismas igualdades y una partida ajena, **para** llegar a testnet con la verificación probada y sin
improvisar delante del owner.

### 2. Contexto
- Localnet aislada de `agents.md` §3, publicación en la **variante B** (sin `--out`: escribe
  `contracts/deployments/localnet.json`, la misma forma que leerá la sonda con `testnet.json`). Todas las firmas las hace la
  CLI bajo el prefijo `PRE` (B4).
- Cuentas de la génesis, 4 distintas en `ids.env`: `ADMIN` (publica), `A`, `B` y `C`.

### 3. Qué implementar
1. La sonda y el script de navegador de este handoff, en `<scratchpad>`.
2. Recorrido por CLI, en este orden. Cada salida va a `"$SMOKE_DIR/tx-<clave>.json"` con `--json`; el digest se saca con
   `jq -r .digest` y se escribe en `<scratchpad>/digests.json`, y los IDs de partida van a `ids.env` (filtro
   `.objectChanges[] | select(.type=="created" and (.objectType|endswith("::game::Game"))) | .objectId`). Nada se imprime.
   1. `ADMIN` publica (variante B); `ADMIN`: `suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 200 --json`.
   2. `ADMIN`: `transfer_house_cap` de `$CAP` a `$A` (`dcap`).
   3. Sonda `pre`.
   4. `A`: `suic ptb --split-coins gas "[100000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none --json` (`d1c`).
      `B`: `suic ptb --split-coins gas "[100000000]" --assign c --move-call "$PKG::game::accept_game" @$G1 @$HOUSE c.0 @0x8 --json` (`d1a`).
      Sonda `1`.
   5. `A`: lo mismo con `"[100000001]"` y `"some(@$B)"` (`d2c`); `B` acepta (`d2a`). Sonda `2`.
   6. **Ajena 1**: `C` crea una abierta de 1000000 y `ADMIN` la acepta (comisión 40000).
   7. `A`: crea una de 1000000 (`d3c`) y la cancela con `suic call --package "$PKG" --module game --function cancel_game --args "$G3" --json` (`d3x`). Sonda `3`.
   8. Sonda `4a`. Tiene que dar `F4 == 8040000`, con la ajena 1 listada.
   9. `A`: `suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$CAP --assign fees --transfer-objects "[fees]" @$A --json` (`d4w`).
   10. **Ajena 2**: `C` crea una de 1000000 y `ADMIN` la acepta, en seguida, para que pueda caer en el checkpoint de `d4w`
       (el caso de MINOR-1 de la v1.1). Después, sonda `4b`: `amount == 8040000` y `amount ≥ F4`. Si la ajena 2 quedó en
       `(K4, checkpoint(d4w)]`, aparece listada como ajena sin NO PASA; se anota si cayó o no en el mismo checkpoint.
   11. `A`: `update_fee_rate` 201 (`dh1`) y 200 (`dh2`); `update_bet_limits` 2000000 10000000000 (`dh3`) y 1000000 50000000000 (`dh4`). Sonda `h`.
   12. Sonda `final`. Tiene que dar `amount + fees_collected == 8080000` (4000000 + 4000000 + 40000 + 40000, con
       `F0 == 0`), `fees_collected == 40000` (la ajena 2, que se ejecutó después de `d4w`) y la conservación exacta.

   Si la CLI pide otra forma para el `Option` de `create_game`, se usa la de la recaptura de `capture-tx-fixtures` (#11)
   y se declara como desviación.
3. La autoprueba negativa (a) y (b).
4. Navegador: no aplica en localnet (el build de testnet necesita `testnet.json`). N-a..N-f se ensayan recién en TASK-3.

### 4. Archivos
- **Tocar:** `documents/REPORTES_SMOKE_MVP.md` (reporte del task con las salidas de la sonda, pasadas por los greps de
  §R-6).
- **NO tocar:** `SMOKE_MVP.md` (no existe hasta TASK-3), código, `contracts/`.

### 5. Verificaciones
Cierre M-7 de `agents.md` §3, paso 7: `localnet.json` borrado, `~/.sui` igual que la línea base,
`git diff --exit-code -- contracts/Move.lock` y `git status --porcelain --untracked-files=all` solo con el reporte.

### 6. Criterios de aceptación
- Todos los checks en `PASA`, con los montos de la tabla del plan.
- La autoprueba negativa da exit 1 y exit 3.
- `balanceChanges` disponible (o el STOP reportado).
- El gas de cada transacción anotado.
- El texto final de la sonda queda en el reporte, para que el MID lo copie al handoff v1.1.

### 7. Al terminar
Reporte con la plantilla de FLUJO §5, sin commits. Commit sugerido:
`docs: rehearse the MVP smoke probe on an isolated localnet (#17)`.

## TASK-3: precondiciones públicas (paso 0) — área: docs (DEV, solo lecturas)

- **Precondición:** S-1..S-8 cumplidos; la branch de #17 con `master` `M` mergeado (orquestador); handoff v1.1.
- **Qué hacer:**
  1. Crear `documents/SMOKE_MVP.md` desde el Anexo A (DL-1).
  2. Llenar las Precondiciones con `M`, la URL y el `packageId` abreviado.
  3. Correr 0.1-0.7: 0.1 con `check`; 0.2 con `curl` y el commit que da el owner; 0.3-0.6 con la sonda `pre`; 0.7 con el
     owner. Después, N-a.
  4. Re-declarar el baseline de `M` (CI de `master`).
- **Criterio:** 0.1-0.7 y N-a en ✅. Con cualquier ❌, al owner no se le pide que firme nada.

## TASK-4: la corrida — área: docs (owner firma, DEV verifica)

Por bloques. El owner firma un bloque y entrega con esta forma (el orquestador la pasa tal cual):

```text
Bloque <n>: d…=<digest>, d…=<digest>; textos: "<lo que vio>"; chequeos: <id> sí/no; O-x: <medida>
```

El DEV corre la sonda del bloque y el navegador que toque, llena las filas y el MID revisa antes del bloque siguiente.

| Bloque | Filas del Anexo A | Sonda | Navegador |
|---|---|---|---|
| 1 | 1a-1c, O-7 (`d1a`) | `1` | N-b (si da tiempo) |
| 2 | 2a-2d, O-7 (`d2a`) | `2` | N-c |
| 3 | 3a-3c, O-1 | `3` | — |
| 4 | 4a, 4b | `4a`, después `4b` | — |
| H | H1-H7 | `h`, después `final` | — |
| 5 | 5a-5c, O-2..O-6 | — | N-a, N-d, N-e, N-f |

**4a antes del retiro:** el owner anota "Comisiones acumuladas" y **espera** a que la sonda `4a` termine antes de pulsar
"Retirar". Si la lectura de 4a quedó después de `d4w` (`K4 ≥ checkpoint(d4w)`), 4a se marca "no medible" y se anota.
La comparación del panel queda en 4b (`FeesWithdrawn.amount` frente a lo que anotó el owner), y la igualdad exacta de
comisiones queda en `final` (v1.1).

**Criterio:** los pasos con criterio en ✅; conservación exacta; issues creados y enlazados por cada ❌ (§R-5); "Reporte
final" con PASA/TOTAL y veredicto.

## TASK-5: cierre del MVP en los docs — área: docs (DEV)

- **`documents/STATUS.md`:**
  - el MVP cerrado con la fecha y `M` (DL-8);
  - "Punto de partida": la fila 6 en ✅;
  - las filas de #8, #15, #16 y #17;
  - "Siguiente": lo post-MVP (#18, #35, #51, #53, #54, #56, #58, #60 y los issues de la corrida);
  - "Pendientes del usuario": D-20261104-05 en la lista "A revisar por el owner", la decisión del tag (N-5) y la
    preautorización N-2;
  - nota: con #17 vence D-20261103-01 (2), y desde ahí solo hay upgrades compatibles.
- **`README.md`:** en el roadmap, #17 "Hecho" y la fecha del corte.
- **`app/README.md`:**
  - `:464` (cambio de cuenta): lo de O-1;
  - `:589` (reserva de aceptar): el `gasBudget` y el precio de gas de O-7 y, si superó la reserva, el issue P2 (MINOR-2);
  - `:882-893` ("Pendientes conocidos"): se quitan los ítems que remiten a #17 o pasan a lo medido (O-2..O-4; RM-12 con
    las latencias de O-3).
- **Criterio:** `grep -n '#17' app/README.md` sin pendientes vivos; §R-6 vacío.

## TASK-6: PR, revisión y housekeeping — área: docs (MID, MAYOR, orquestador)

- **Body (MID):**
  - `Closes #17`;
  - la tabla de commits;
  - el veredicto del smoke (PASA/TOTAL) y los issues abiertos;
  - D-20261104-05;
  - lo que vence (D-20261103-01 (2));
  - lo que queda pendiente del owner: N-5, el tag `v0.1.0` + Release. Si elige (a), el MID redacta las notas.
- **Antes del merge:** la revisión del MAYOR publicada con `gh pr review --comment --body-file`.
- **Housekeeping (orquestador, PR propio):**
  - `git rm` de `PLAN_`, `HANDOFF_`, `SMOKE_` y `REPORTES_SMOKE_MVP.md`;
  - también los de #15 (`*_RAILWAY_DEPLOY.md`) y #16 (`*_README.md`) si S-8 no los borró;
  - STATUS: la fila de #17 y su SHA de merge en "Mergeadas".
- **Criterio:** CI verde, 0 BLOCKER/MAJOR y ningún STOP delegable sin decidir.

## Anexo A: plantilla de `SMOKE_MVP.md` (sin resultados)

Se copia tal cual al empezar TASK-3. Todas las celdas de "Resultado obtenido" quedan vacías y todos los estados en ⏳
hasta su verificación.

~~~markdown
# SMOKE_MVP
> Plan: PLAN_SMOKE_MVP v1 | Handoff: HANDOFF_SMOKE_MVP v1.<n> | Issue: #17 | Fecha: <AAAA-MM-DD> | Estado: EN CURSO

## Precondiciones
- Red: testnet; `master` `<M>`; `packageId` `<abbr>` de `contracts/deployments/testnet.json`; House `<abbr>`.
- URL: `<URL>` (deploy activo en Railway del commit `<M>`).
- Cuentas: A (crea y tiene el `HouseCap`; custodia por `<transfer_house_cap | publicadora importada>`), B (acepta e
  invitado), C (tercera, no firma). Wallet de extensión `<nombre>` en testnet. Sin direcciones.
- Cliente: la app publicada + la wallet del owner. Verificación: sonda gRPC de solo lectura y Chrome headless sin wallet.
- Montos: 0,1 SUI · 0,100000001 SUI · 0,001 SUI; comisión 200 bps.

## Paso 0
| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 0.1 | `check` en `master` `<M>` | `1 despliegue(s) válidos y coherentes con Published.toml` | | ⏳ |
| 0.2 | commit del deploy y `curl` del bundle | commit = `<M>`; conteos ≥ 1 de `packageId`, `houseId`, `publishTxDigest`; HTTP 2xx | | ⏳ |
| 0.3 | sonda `pre`: chain id | `4c78adac` | | ⏳ |
| 0.4 | sonda `pre`: House | `Shared`, 200, 1000000/50000000000, versión 1; `F0` y `K0` anotados | | ⏳ |
| 0.5 | sonda `pre`: cap | dueño `CAP`; con `dcap`, `recipient == CAP` | | ⏳ |
| 0.6 | sonda `pre`: partidas desde la publicación | cantidades y ajenas listadas | | ⏳ |
| 0.7 | owner: A, B y C fondeadas en testnet | sí | | ⏳ |
| N-a | headless `#/` | "testnet" y "nodo OK" | | ⏳ |

## Pasos 1-5
| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 1a | A crea una abierta de 0,1 SUI (`d1c`) | `GameCreated` 100000000, sin oponente, 200 bps; `Δ(A) = −bet − gas` | | ⏳ |
| 1b | B y C ven G1 en el lobby | owner: sí; N-b | | ⏳ |
| 1c | B acepta (`d1a`) | pozo 200000000, comisión 4000000, pago 196000000; balances según `winner`; G1 `Resolved`, `stake` 0; `Random` último; textos de A y B coherentes con `winner` | | ⏳ |
| 2a | A invita a B con 0,100000001 SUI (`d2c`) | `opponent == B`; 100000001; 200 bps; no está en el lobby (N-c) | | ⏳ |
| 2b | C abre G2 por URL | "Esta invitación es para otra dirección." sin "Aceptar" (D-20261104-05 (1)) | | ⏳ |
| 2c | B ve G2 en "Invitaciones recibidas" | con "Aceptar" y "Rechazar" | | ⏳ |
| 2d | B acepta desde "Mis partidas" (`d2a`) | pozo 200000002, comisión 4000000, pago 196000002; balances exactos; `previousTransaction(G2) == d2a` | | ⏳ |
| 3a | A crea una de 0,001 SUI (`d3c`) | 1000000 | | ⏳ |
| 3b | A pulsa "Cancelar" y rechaza en la wallet | "La wallet no completó la operación…" sin digest; G3 sigue `Pending` | | ⏳ |
| 3c | A cancela (`d3x`) | `refund` 1000000; `Δ(A,d3c) + Δ(A,d3x) = −gas(d3c) − gas(d3x)`; G3 `Cancelled`, `stake` 0; sin la House | | ⏳ |
| 4a | A abre `#/admin` | `F4 = F0 + 8000000 + Σ ajenas en (K0, K4]`; igual al panel | | ⏳ |
| 4b | A retira (`d4w`) | `withdraw_fees` + `TransferObjects` a quien firma; `amount ≥ F4` (`= F4` sin `GameResolved` en `(K4, checkpoint(d4w)]`); `Δ = amount − gas`; "No hay comisiones para retirar." | | ⏳ |
| 5a | badge | owner y N-a: "testnet · nodo OK" | | ⏳ |
| 5b | enlaces al explorador | owner: abren Suiscan testnet con el mismo digest/objeto; N-d | | ⏳ |
| 5c | recarga de rutas profundas | owner con wallet; N-e y N-f sin wallet | | ⏳ |

## Panel de la House
| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| H1 | A abre la app | "Administrar House"; `#/admin` con 200 bps, 0,001/50, lo acumulado, versión 1; "Volver a comprobar": n | | ⏳ |
| H2 | comisión a 201 (`dh1`) | resumen "De 200 bps (…) a 201 bps (…)"; "Comisión actualizada: …"; `FeeRateUpdated` 200 → 201 | | ⏳ |
| H3 | comisión a 200 (`dh2`) | `FeeRateUpdated` 201 → 200; partidas en el intervalo listadas | | ⏳ |
| H4 | límites a 0,002/10 y de vuelta (`dh3`, `dh4`) | resúmenes y "Límites actualizados: …"; eventos; campos nuevos y botón deshabilitado | | ⏳ |
| H5 | ventana de la wallet en H2-H4 y 4b | la transacción esperada; en el retiro, a la misma cuenta | | ⏳ |
| H6 | B o C en `#/admin` | sin enlace; "Sin permisos: esta cuenta no tiene el HouseCap de esta House." | | ⏳ |
| H7 | sonda `final` | estado de 0.4; `amount + fees_collected = F0 + Σ fee` de todos los `GameResolved` en `(K0, Kf]` (sin ajenas, `fees_collected` 0); conservación exacta | | ⏳ |

## Heredado de #12 y #13
| # | Qué | Criterio | Resultado obtenido | Estado |
|---|---|---|---|---|
| O-1 | cambio de cuenta con la wallet abierta | fallo sin digest o firma de A; nunca éxito para B (PASA/NO PASA) | | ⏳ |
| O-2 | vista previa de la wallet al aceptar | observación | | ⏳ |
| O-3 | latencias en 1c, 2d, 3c y 4b | observación (localnet: 0,6-1,5 s y 1,5-2,4 s) | | ⏳ |
| O-4 | cancelación del runtime (si ocurre) | observación: `description` | | ⏳ |
| O-5 | "Mis partidas": texto de la cota y enlace al historial | observación; `…/testnet/account/<cuenta>` | | ⏳ |
| O-6 | caso del creador | no aplica en esta corrida (DL-6) | | ⏳ |
| O-7 | `gasBudget` y precio de gas de `d1a` y `d2a` | observación; `> 10000000` ⇒ `type:bug` P2 no bloqueante | | ⏳ |

## Si algo falla
- Capturar el digest, la línea `CHECK` de la sonda y el texto de la app; nunca direcciones ni capturas de la wallet.
- Fila ❌ y el issue `type:bug` enlazado; al repetir, una fila `N.r1`.

## Reporte final
- Pasos PASA/TOTAL:
- Hallazgos (n° de paso + digest / output):
- Issues abiertos:
- Veredicto: [PASA | NO PASA]
~~~
