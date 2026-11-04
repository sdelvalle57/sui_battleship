# HANDOFF_SMOKE_MVP
> Plan: PLAN_SMOKE_MVP v1 (aprobado por el MAYOR con cambios, 2026-11-04) | Issue: #17 | Branch:
> `feature/issue-17-mvp-smoke` | Versión: v1.2 | Fecha: 2026-11-04 | Autor: MID

**Changelog v1.2** (TASK-2 en **PASA**: sonda ensayada en la localnet aislada, variante B, 8 bloques, 99 PASA / 0 NO PASA;
revisión del MID en `REPORTES_SMOKE_MVP.md`). Es la precondición de TASK-3 junto con TASK-2b:
- **Texto final de la sonda:** el **Anexo B**, tal cual. Es el que ensayó TASK-2 con C-1..C-4 aplicados, y TASK-2b lo
  re-ensaya.
- **Ubicación:** `<scratchpad>/smoke17-probe/verify-mvp.mjs` (desviación 1 de TASK-2). `<SMOKE_DIR>` se borra al cerrar y la
  sonda tiene que sobrevivir. Los digests auxiliares van a `<SMOKE_DIR>/aux.json` (desviación 2).
- **Códigos de salida 0-5** (§Sonda, "Códigos de salida"), con los agregados del DEV adoptados (desviación 3):
  - exit 5 = error de lectura o dato faltante;
  - exit 2 = guarda de red y `chainId`, antes de pedir nada;
  - `--selftest`;
  - re-serialización BCS de cada evento;
  - los checks extra.
- **C-1 (H-1, R-1 del DEV):** la conservación de `final` suma sobre `{A, B, W}` sin repetir, con `W = sender(d4w)` (el
  titular del cap). Funciona con las dos custodias de N-3; con el cap en A, la suma no cambia. S-5 **no** exige transferir
  el cap a A.
- **C-2 (H-2, R-2):** la cota de 0.6 es `máx(publicación, piso + 16000)`, como `historyLowerBound` de `eventScan.ts`, con el
  margen solo si el piso es > 0. Con la publicación podada, la cota sale del piso. Se imprime de dónde salió.
- **C-3 (H-2):** `scanEvents` sale con exit 5 y "historial podado…" si la ventana empieza debajo del piso. Nueva regla de
  ventana para TASK-3/4 (§Sonda).
- **C-4 (H-3):** `checkpointOf` también reintenta el "not found" (`TransactionError`) del fullnode durante 30 s, y `tx()`
  espera el checkpoint antes de leer.
- **R-3 (O-7):** en TASK-4, `OBS O-7` lee el `gasData` de la transacción firmada por la wallet del owner, que es lo que hay
  que medir. El valor de localnet (4462748) es el de la CLI y no cuenta.
- **R-4 (volumen):** sin cambio de código. Las ventanas de `4a`, `4b`, `h` y `final` empiezan dentro de la corrida, y 0.6
  queda acotada por C-2.
- **Nuevo TASK-2b:** re-ensayo corto con la custodia "cap en otra cuenta" y la autoprueba de C-4.

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
| TASK-2 | ensayo de la sonda en la localnet aislada | **PASA** (revisión en `REPORTES_SMOKE_MVP.md`) | — |
| TASK-2b | re-ensayo de la sonda v1.2 (C-1..C-4) | **Autorizable antes de #8** (v1.2) | La localnet aislada libre (un DEV a la vez, sin otro smoke en curso) |
| TASK-3 | precondiciones públicas (paso 0) | Especificado, **no empezar** | S-1..S-8 de la secuencia cumplidos; TASK-2b en PASA (con la sonda del Anexo B sin cambios, o la versión que fije un handoff posterior) |
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

**Dónde y cómo (v1.2).** Un solo archivo, `<scratchpad>/smoke17-probe/verify-mvp.mjs`, que **no se commitea** (DL-2). Su
texto es el del **Anexo B**: el DEV lo extrae del handoff tal cual, y el `diff` contra el bloque tiene que salir vacío. Va en
una carpeta propia, fuera de `<SMOKE_DIR>`, que se borra al cerrar. Se corre por stdin con cwd `<repo>/app`, así resuelve
`@mysten/sui` (m-4 de #8). Si el worktree no tiene `node_modules`, antes va `npm ci` con Node 26 (ignorado por git):

```bash
cd <repo>/app && "$NODE" --input-type=module - <args> < <scratchpad>/smoke17-probe/verify-mvp.mjs
```

Antes de la primera corrida, `import('@mysten/sui/grpc')` por la misma vía tiene que dar `ok`.

**Códigos de salida (v1.2).** Solo el 0 y el 1 son resultados de un paso; del 2 al 5 se repite o es STOP al MID, nunca ❌.

| Código | Qué significa | Qué se hace |
|---|---|---|
| 0 | todos los checks del bloque PASA | se llenan las filas |
| 1 | algún NO PASA | fila ❌ y §R-5 (issue `type:bug` si no es un error del recorrido) |
| 2 | argumento, URL, red, `chainId` o ruta no permitidos (antes de pedir nada) | corregir la invocación |
| 3 | el filtro de salida cortó una línea con hex de 40 o más | STOP al MID: la línea no se pega |
| 4 | un digest sin checkpoint, o inexistente, tras 30 s | revisar el digest y repetir el bloque |
| 5 | error de lectura, dato faltante (`--digests`/`--state`) o **historial podado** | repetir; si es poda, STOP al MID (regla de ventana) |

**Regla de ventana (v1.2, C-3):** los bloques `4a`, `4b`, `h` y `final` escanean desde `K0`, `K4` o `checkpoint(dh1)`.
TASK-3 y TASK-4 corren en la **misma sesión** del owner (en la práctica, el mismo día). Así `K0` queda muy por encima del
piso del fullnode público, que cubre ≈ 14,6 días. Si un bloque sale con "historial podado", la corrida se detiene y el
MID decide: lo más probable es volver a correr desde TASK-3 con un `K0` nuevo.

Modelos que replica la sonda (referencia; el texto que manda es el del Anexo B):
- el cliente y `getServiceInfo`: `app/scripts/capture-tx-fixtures.mjs:64-70`;
- `getObject`/`getTransaction` con `include`: el mismo script, `:97`, `:145`, `:178` y `:251`;
- `ListEvents` crudo con `startCheckpoint`, filtro por `eventType`, `readMask` y fin `CHECKPOINT_BOUND`/`OUT_OF_RANGE`:
  `app/src/sui/eventScan.ts:59-80` (el `listEvents` del SDK falla con `OUT_OF_RANGE` en el fullnode público).

**Argumentos.**

| Argumento | Valor |
|---|---|
| `--deployment <ruta>` | `<repo>/contracts/deployments/testnet.json` (TASK-3/4) o `localnet.json` (TASK-2) |
| `--url <url>` | `https://fullnode.testnet.sui.io:443` o `http://127.0.0.1:9000`. Con otra URL, sale con código 2 antes de pedir nada |
| `--digests <ruta>` | `<scratchpad>/smoke17-probe/digests.json`: `{ "dcap"?, "d1c", "d1a", "d2c", "d2a", "d3c", "d3x", "d4w", "dh1", "dh2", "dh3", "dh4", "dO1"? }`. Faltan las de los bloques no corridos |
| `--state <ruta>` | `<scratchpad>/smoke17-probe/state.json`: solo valores públicos (`K0`, `F0`, `K4`, `amount4a`, IDs de `G1`/`G2`/`G3` completos, checkpoint de `d4w`). **Nunca** direcciones |
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
| `pre` | 0.3 chain id = `chainId` del json (testnet `4c78adac`). 0.4 House `Shared`; `fee_rate` 200; `min_bet` 1000000; `max_bet` 50000000000; `version` 1; `F0 := fees_collected`; `K0 := kRead(House)`. 0.5 dueño del cap; con `dcap`: `success`, `HouseCapTransferred.cap_id == houseCapId` y `recipient == CAP` → `true`. 0.6 `GameCreated`/`GameResolved` del paquete desde la cota `máx(publicación, piso + 16000)` (C-2; con la publicación podada, desde el piso + margen), con el origen impreso: cantidades y lista de ajenas (`abbr(game_id)`, `fee_rate`, checkpoint) |
| `1` | `d1c`: `success`; `GameCreated` con `creator == A`, `bet` 100000000, `opponent` none, `fee_rate` 200; `Δ(A,d1c) == −bet − gas(d1c)`; `G1 := game_id`. `d1a`: `success`; `B ≠ A`; `GameResolved` con `game_id == G1`, `creator == A`, `acceptor == B`, `winner ∈ {A,B}` (se imprime `winner == A` o `winner == B`); `pot == 2·bet`; `fee == ⌊pot·r/10000⌋`; `payout == pot − fee`. Balances según `winner` (tabla del plan); el último `MoveCall` es `accept_game` y después solo hay `TransferObjects`/`MergeCoins`. `G1`: `Resolved`, `acceptor == B`, `winner` igual al del evento, `stake` "0". **O-7:** `gasBudget` y `gasPrice` de `d1a` impresos; `gasBudget ≤ 10000000` → `true`/`false` (observación, no cuenta en el resumen) |
| `2` | `d2c`: `success`; `sender == A`; `GameCreated.opponent == B`; `bet` 100000001; `fee_rate` 200; `G2 := game_id`. `d2a`: `success`; `sender == B`; `pot` 200000002; `fee` 4000000; `payout` 196000002; balances exactos; `G2` `Resolved` con `stake` "0"; `previousTransaction(G2) == d2a`. O-7 también para `d2a` |
| `3` | `d3c`: `success`; `sender == A`; `bet` 1000000; `G3 := game_id`. `d3x`: `success`; `GameCancelled` con `refund` 1000000 y `cancelled_by == creator == A`; `Δ(A,d3x) == refund − gas(d3x)`; `Δ(A,d3c) + Δ(A,d3x) == −gas(d3c) − gas(d3x)`; la House **no** está entre los inputs de `d3x`; `G3` `Cancelled` con `stake` "0". Con `dO1`: `sender == A` |
| `4a` | House: `F4 := fees_collected`, `K4 := kRead(House)`; ajenas = los `GameResolved` con `game_id ∉ {G1,G2}` y `K0 < checkpoint ≤ K4` (lista y `Σ`); `F4 == F0 + fee(d1a) + fee(d2a) + Σ ajenas` (D-20261104-05 (3)); `amount4a := F4` |
| `4b` | `d4w`: `success`; `sender == CAP` (y `CAP == A` como dato); dos comandos: `MoveCall` `house::withdraw_fees` y `TransferObjects` con destino `== sender` (la dirección pura del input se decodifica con `bcs.Address`); `amount := FeesWithdrawn.amount`; `amount ≥ F4`; con `GameResolved` en `(K4, checkpoint(d4w)]` = ninguno, `amount == F4`; si hay alguno, se lista como ajeno (puede ir antes o después de `d4w` dentro del checkpoint) y no hace NO PASA (D-20261104-05 (3)), porque la igualdad exacta la da `final`; `Δ(CAP,d4w) == amount − gas(d4w)` |
| `h` | `dh1`: `FeeRateUpdated` 200 → 201, `sender == CAP`. `dh2`: 201 → 200; `GameCreated` con checkpoint en `[checkpoint(dh1), checkpoint(dh2)]`: lista (con `fee_rate` 201 se anota y no hace NO PASA). `dh3`: `BetLimitsUpdated` 1000000/50000000000 → 2000000/10000000000. `dh4`: de vuelta. En los cuatro, `Δ(CAP,tx) == −gas(tx)` |
| `final` | H7: House con `fee_rate` 200, 1000000/50000000000 y `version` 1; `Kf := kRead(House)`, `Ff := fees_collected`; **igualdad independiente del orden:** `amount + Ff == F0 + Σ fee` de **todos** los `GameResolved` con `K0 < checkpoint ≤ Kf` (los de G1 y G2 más los ajenos, listados). Sin ajenas, `Ff == 0`. Conservación (C-1): con las partes `{A, B, W}` sin repetir (`W = sender(d4w)`, el titular del cap), sobre `d1c, d1a, d2c, d2a, d3c, d3x, d4w`: `Σ Δ(partes) == −Σ gas + (amount − fee(d1a) − fee(d2a))`. Se imprime `A, B (CAP == A)` o `A, B, CAP` |

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
   `jq -r .digest` y se escribe en `<scratchpad>/smoke17-probe/digests.json`, y los IDs de partida van a `ids.env` (filtro
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
- El texto final de la sonda queda en el reporte, para que el MID lo copie al handoff (hecho en la v1.2, Anexo B).

### 7. Al terminar
Reporte con la plantilla de FLUJO §5, sin commits. Commit sugerido:
`docs: rehearse the MVP smoke probe on an isolated localnet (#17)`.

## TASK-2b: re-ensayo de la sonda v1.2 (autorizable antes de #8) — área: docs (DEV)

### 1. Historia de usuario del task
**Como** DEV que verificará la corrida real, **quiero** ensayar el texto final de la sonda, con la custodia del cap en una
cuenta que no juega, **para** que la conservación y la espera del checkpoint estén probadas con las dos decisiones
posibles del owner sobre N-3.

### 2. Contexto
TASK-2 (PASA) ensayó la custodia "cap en A". La v1.2 cambia la conservación (C-1), la cota y la guarda de poda (C-2, C-3) y
la lectura de cada transacción (C-4). La guarda de poda no se puede ejercitar en localnet, donde el piso es 0: se verifica
leyendo el código, y en TASK-3 por el origen de la cota que imprime 0.6.

### 3. Qué implementar
1. Extraer el Anexo B a `<scratchpad>/smoke17-probe/verify-mvp.mjs` y verificar que el `diff` contra el bloque del handoff
   sale vacío (output pegado).
2. Localnet aislada **nueva**, variante B y B4, como TASK-2 §3.2, **con un solo cambio de custodia**: **sin**
   `transfer_house_cap` (no hay `dcap`). El cap queda en `ADMIN` (`CAP ∉ {A, B}`), así que `d4w` y `dh1`..`dh4` los
   firma `ADMIN`. El resto del recorrido no cambia: los mismos montos y las dos ajenas (creadas por `C` y aceptadas por
   `ADMIN`).
3. Los 8 bloques. Esperados:
   - `pre` con "sin dcap" y la cota de 0.6 con origen "publicación";
   - `4b` con `sender == CAP: true` y `CAP == A: false`;
   - `final` con `Σ Δ(A, B, CAP)` exacta, `amount + Ff == 8080000` y `Ff == 40000`;
   - todo en PASA.
4. Autoprueba: (a) y (b) como en TASK-2; **(c)**, con el bloque `1` y `d1c` cambiado por un digest bien formado que no
   existe (uno real con un carácter distinto), sale con **exit 4** tras ≈ 30 s (C-4).
5. Cierre M-7.

### 4. Archivos
- **Tocar:** `documents/REPORTES_SMOKE_MVP.md` (sección TASK-2b).
- **NO tocar:** el resto.

### 5. Criterios de aceptación
- `diff` vacío.
- Los 8 bloques en PASA con la custodia en `ADMIN`.
- La autoprueba da exit 1, exit 3 (×2) y exit 4.
- Cierre limpio.
- Si hace falta tocar la sonda, se reporta el diff y el MID saca una v1.3. El DEV no la cambia por su cuenta.

### 6. Al terminar
Reporte de la plantilla de FLUJO §5, sin commits. Commit sugerido:
`docs: re-rehearse the v1.2 MVP smoke probe with the cap outside the players (#17)`.

## TASK-3: precondiciones públicas (paso 0) — área: docs (DEV, solo lecturas)

- **Precondición:**
  - S-1..S-8 cumplidos;
  - TASK-2b en PASA;
  - la branch de #17 con `master` `M` mergeado (orquestador);
  - la sonda del Anexo B en `<scratchpad>/smoke17-probe/` con `diff` vacío (otro scratchpad o sesión la extrae de nuevo).
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
| 1 | 1a-1c, O-7 (`d1a`: el `gasData` que eligió la wallet del owner, R-3) | `1` | N-b (si da tiempo) |
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

## Anexo B: texto final de la sonda (v1.2)

Se extrae tal cual a `<scratchpad>/smoke17-probe/verify-mvp.mjs` (TASK-2b, TASK-3). Es el archivo ensayado en TASK-2,
idéntico al bloque de `REPORTES_SMOKE_MVP.md`, con C-1..C-4 aplicados. No lleva rutas, direcciones ni claves.

```js
// verify-mvp.mjs: sonda de verificación del smoke del MVP (#17, HANDOFF_SMOKE_MVP v1.2 §Sonda). Solo lecturas gRPC.
// Vive en <scratchpad> y no se commitea (DL-2). Uso, con cwd <repo>/app para resolver @mysten/sui:
//   cd <repo>/app && "$NODE" --input-type=module - --deployment <json> --url <url> --digests <json> --state <json> \
//     --block pre|1|2|3|4a|4b|h|final < <scratchpad>/smoke17-probe/verify-mvp.mjs
// Autoprueba del filtro (b): --selftest filter-0x | filter-raw (sale con código 3, sin red).
// Códigos: 0 todo PASA · 1 algún NO PASA · 2 URL/red/ruta no permitida (antes de pedir nada) · 3 filtro de salida ·
// 4 SIN CHECKPOINT (repetir el bloque) · 5 error de lectura, datos faltantes o historial podado.
// Nunca imprime direcciones: las identidades A, B y CAP viven solo en memoria; se imprimen comparaciones.
import process from 'node:process';

// ---------- Filtro de salida (§R-6): toda línea pasa por aquí. ----------
const LONG_HEX = /[0-9a-fA-F]{40,}/;
function emit(line) {
  if (LONG_HEX.test(line)) {
    process.stdout.write('FILTRO: línea cortada (hex de 40 o más caracteres)\n');
    process.exit(3);
  }
  process.stdout.write(`${line}\n`);
}

// ---------- Argumentos y guarda de URL: nada de red ni de SDK antes de esto. ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      emit(`argumento inválido: ${key ?? ''}`);
      process.exit(2);
    }
    out[key.slice(2)] = value;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const ALLOWED = new Map([
  ['https://fullnode.testnet.sui.io:443', 'testnet'],
  ['http://127.0.0.1:9000', 'localnet'],
]);
const network = ALLOWED.get(args.url);
if (!network) {
  emit('URL no permitida: solo https://fullnode.testnet.sui.io:443 o http://127.0.0.1:9000');
  process.exit(2);
}

if (args.selftest !== undefined) {
  // Autoprueba (b): la línea se arma en memoria con 64 hex y nunca se imprime (el filtro la corta y sale con 3).
  const hex = Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(i * 7 + 3) % 16]).join('');
  if (args.selftest === 'filter-0x') emit(`CHECK selftest PASA id 0x${hex}`);
  else if (args.selftest === 'filter-raw') emit(`CHECK selftest PASA id ${hex}`);
  emit('selftest desconocido');
  process.exit(5);
}

for (const key of ['deployment', 'digests', 'state', 'block']) {
  if (!args[key]) {
    emit(`falta --${key}`);
    process.exit(2);
  }
}
// Ningún archivo de la red local (keystore, client.yaml…) ni de una config de la CLI.
for (const key of ['deployment', 'digests', 'state']) {
  if (/(^|\/)net(\/|$)|sui_config|\.sui(\/|$)|keystore|client\.yaml/.test(args[key])) {
    emit(`ruta no permitida en --${key}`);
    process.exit(2);
  }
}

const { readFile, writeFile } = await import('node:fs/promises');
const deployment = JSON.parse(await readFile(args.deployment, 'utf8'));
if (deployment.network !== network || (network === 'testnet' && deployment.chainId !== '4c78adac')) {
  emit(`el despliegue (${String(deployment.network)}) no corresponde a la URL (${network})`);
  process.exit(2);
}

const { SuiGrpcClient, GrpcTypes } = await import('@mysten/sui/grpc');
const { TransactionError } = await import('@mysten/sui/client');
const { bcs } = await import('@mysten/sui/bcs');
const { fromBase58, fromBase64, toBase64, toHex, normalizeSuiAddress, normalizeStructTag } = await import(
  '@mysten/sui/utils'
);

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
};
const digests = await readJson(args.digests);
const state = await readJson(args.state);
const saveState = (patch) => {
  Object.assign(state, patch);
  return writeFile(args.state, `${JSON.stringify(state, null, 2)}\n`);
};

const client = new SuiGrpcClient({ network, baseUrl: args.url });
const PKG = normalizeSuiAddress(deployment.packageId);
const ORIG = normalizeSuiAddress(deployment.originalPackageId);
const HOUSE = normalizeSuiAddress(deployment.houseId);
const CAP_ID = normalizeSuiAddress(deployment.houseCapId);
const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');

// ---------- Salida ----------
let passed = 0;
let failed = 0;
function check(id, ok, detail = '') {
  if (ok) passed += 1;
  else failed += 1;
  emit(`CHECK ${id} ${ok ? 'PASA' : 'NO PASA'}${detail ? ` ${detail}` : ''}`);
}
const info = (line) => emit(`INFO ${line}`);
const obs = (line) => emit(`OBS ${line}`);
class Missing extends Error {}

// ---------- Auxiliares ----------
const norm = (a) => normalizeSuiAddress(a);
const abbr = (id) => {
  const h = norm(id);
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
};
const sameType = (a, b) => normalizeStructTag(a) === normalizeStructTag(b);
const need = (key) => {
  if (!digests[key]) throw new Missing(`falta el digest ${key} en --digests`);
  return digests[key];
};
const needState = (key, block) => {
  if (state[key] === undefined) throw new Missing(`falta ${key} en --state: correr antes el bloque ${block}`);
  return state[key];
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const txCache = new Map();
async function tx(digest) {
  if (!txCache.has(digest)) {
    await checkpointOf(digest); // C-4: espera a que esté en un checkpoint antes de leerla entera
    const result = await client.getTransaction({
      digest,
      include: { effects: true, events: true, transaction: true, balanceChanges: true },
    });
    const body = result[result.$kind];
    if (!Array.isArray(body.balanceChanges)) throw new Missing('STOP: el SDK no devolvió balanceChanges');
    txCache.set(digest, result);
  }
  return txCache.get(digest);
}
const body = (r) => r[r.$kind];
const isSuccess = (r) => r.$kind === 'Transaction' && body(r).effects?.status?.success === true;
const senderOf = (r) => norm(body(r).transaction.sender);
function gas(r) {
  const g = body(r).effects.gasUsed;
  return BigInt(g.computationCost) + BigInt(g.storageCost) - BigInt(g.storageRebate);
}
function delta(address, r) {
  return body(r)
    .balanceChanges.filter((c) => norm(c.address) === address && normalizeStructTag(c.coinType) === SUI_TYPE)
    .reduce((sum, c) => sum + BigInt(c.amount), 0n);
}
function gasLine(key, r) {
  const g = body(r).effects.gasUsed;
  info(
    `gas ${key} ${body(r).digest}: ${gas(r)} (computation ${g.computationCost}, storage ${g.storageCost}, rebate ${g.storageRebate})`,
  );
}

/**
 * Checkpoint de un digest, con reintento cada 500 ms hasta 30 s (TX_INDEX_TIMEOUT_MS). Nunca 0. C-4 (v1.2): el
 * fullnode responde "not found" (`TransactionError`) hasta que la transacción está en un checkpoint
 * (app/README.md, "Indexación"), así que ese error también se reintenta.
 */
async function checkpointOf(digest) {
  const start = Date.now();
  for (;;) {
    let cp = null;
    try {
      const r = await client.getTransaction({ digest, include: {} });
      cp = body(r).checkpoint ?? null;
    } catch (error) {
      if (!(error instanceof TransactionError)) throw error;
    }
    if (cp !== null) return BigInt(cp);
    if (Date.now() - start >= 30_000) {
      emit(`SIN CHECKPOINT: ${digest} sin checkpoint (o inexistente) tras 30 s; revisar el digest y repetir el bloque`);
      process.exit(4);
    }
    await sleep(500);
  }
}
/** kRead (DL-9): checkpoint de la previousTransaction del objeto leído. */
const kRead = (object) => checkpointOf(object.previousTransaction);

// ---------- BCS de eventos (contracts/README.md, "Eventos") ----------
const Addr = bcs.Address;
const SCHEMAS = {
  'game::GameCreated': bcs.struct('GameCreated', {
    game_id: Addr,
    creator: Addr,
    opponent: bcs.option(Addr),
    bet: bcs.u64(),
    fee_rate: bcs.u16(),
  }),
  'game::GameCancelled': bcs.struct('GameCancelled', {
    game_id: Addr,
    creator: Addr,
    cancelled_by: Addr,
    refund: bcs.u64(),
  }),
  'game::GameResolved': bcs.struct('GameResolved', {
    game_id: Addr,
    creator: Addr,
    acceptor: Addr,
    winner: Addr,
    pot: bcs.u64(),
    fee: bcs.u64(),
    payout: bcs.u64(),
  }),
  'house::FeeRateUpdated': bcs.struct('FeeRateUpdated', { house_id: Addr, old_fee_rate: bcs.u16(), new_fee_rate: bcs.u16() }),
  'house::BetLimitsUpdated': bcs.struct('BetLimitsUpdated', {
    house_id: Addr,
    old_min_bet: bcs.u64(),
    old_max_bet: bcs.u64(),
    new_min_bet: bcs.u64(),
    new_max_bet: bcs.u64(),
  }),
  'house::FeesWithdrawn': bcs.struct('FeesWithdrawn', { house_id: Addr, amount: bcs.u64() }),
  'house::HouseCapTransferred': bcs.struct('HouseCapTransferred', { cap_id: Addr, recipient: Addr }),
};
function decode(name, bytes) {
  const schema = SCHEMAS[name];
  const value = schema.parse(bytes);
  if (toBase64(schema.serialize(value).toBytes()) !== toBase64(bytes)) throw new Error(`BCS de ${name} con bytes sobrantes`);
  return value;
}
const eventType = (name) => `${ORIG}::${name}`;
/** Eventos de un tipo exacto en una transacción, decodificados. */
const txEvents = (r, name) =>
  (body(r).events ?? []).filter((e) => sameType(e.eventType, eventType(name))).map((e) => decode(name, e.bcs));

const { Ordering, QueryEndReason } = GrpcTypes;
/** Piso de historial del nodo (`lowestAvailableCheckpoint`), o `null` si no lo informa (nodo sin poda). */
async function nodeFloor() {
  const { response } = await client.ledgerService.getServiceInfo({});
  const floor = response.lowestAvailableCheckpoint;
  return floor === undefined || floor === null ? null : BigInt(floor);
}
const HISTORY_FLOOR_MARGIN_CHECKPOINTS = 16_000n; // el mismo margen que app/src/sui/eventScan.ts
/** ListEvents crudo descendente desde el tope hasta la cota `startCheckpoint` (app/src/sui/eventScan.ts). */
async function scanEvents(name, startCheckpoint) {
  const type = eventType(name);
  const filter = {
    terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType: type } } }] }],
  };
  // C-3 (v1.2): una ventana que empieza debajo del piso no se escanea: error explícito, nunca una lista incompleta.
  const floor = await nodeFloor();
  if (floor !== null && floor > startCheckpoint) {
    throw new Error(`historial podado: la ventana empieza en ${startCheckpoint} y el piso del nodo es ${floor}`);
  }
  const out = [];
  let before;
  for (let page = 0; page < 10_000; page += 1) {
    const call = client.ledgerService.listEvents({
      readMask: { paths: ['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index'] },
      startCheckpoint,
      filter,
      options: { limit: 100, ordering: Ordering.DESCENDING, before },
    });
    let cursor;
    let reason;
    for await (const frame of call.responses) {
      if (frame.watermark?.cursor) cursor = frame.watermark.cursor;
      if (frame.event) {
        if (!sameType(frame.event.eventType ?? '', type)) throw new Error('ListEvents devolvió otro tipo de evento');
        out.push({
          v: decode(name, frame.event.contents?.value ?? new Uint8Array()),
          checkpoint: BigInt(frame.event.checkpoint),
          digest: frame.event.transactionDigest,
        });
      }
      if (frame.end) reason = frame.end.reason;
    }
    if (reason === undefined) throw new Error('ListEvents terminó sin QueryEnd');
    if (reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT) {
      before = cursor;
      continue;
    }
    if (
      reason === QueryEndReason.CHECKPOINT_BOUND ||
      reason === QueryEndReason.LEDGER_TIP ||
      reason === QueryEndReason.CURSOR_BOUND
    ) {
      return out.filter((e) => e.checkpoint >= startCheckpoint).reverse();
    }
    throw new Error(`ListEvents terminó con un reason no reconocido (${String(reason)})`);
  }
  throw new Error('ListEvents: demasiadas páginas');
}

// ---------- Objetos ----------
async function readObject(objectId) {
  const { object } = await client.getObject({ objectId, include: { json: true, previousTransaction: true } });
  return object;
}
const u64 = (v) => String(typeof v === 'object' && v !== null && 'value' in v ? v.value : v);
async function readHouse() {
  const house = await readObject(HOUSE);
  const j = house.json;
  return {
    object: house,
    shared: house.owner?.$kind === 'Shared' && sameType(house.type, `${ORIG}::house::House`),
    feeRate: Number(j.fee_rate),
    minBet: u64(j.min_bet),
    maxBet: u64(j.max_bet),
    version: u64(j.version),
    fees: BigInt(u64(j.fees_collected)),
  };
}
async function capOwner() {
  const { object } = await client.getObject({ objectId: CAP_ID });
  if (!sameType(object.type, `${ORIG}::house::HouseCap`)) throw new Error('houseCapId no es un HouseCap del paquete');
  if (object.owner?.$kind !== 'AddressOwner') throw new Error(`el HouseCap no tiene dueño de dirección (${object.owner?.$kind})`);
  return norm(object.owner.AddressOwner);
}

// ---------- Identidades (solo en memoria) ----------
const idA = async () => senderOf(await tx(need('d1c')));
const idB = async () => senderOf(await tx(need('d1a')));

/** Un único evento del tipo en la transacción; si no hay exactamente uno, NO PASA y `null`. */
function single(id, r, name) {
  const events = txEvents(r, name);
  if (events.length !== 1) {
    check(id, false, `${events.length} eventos ${name}`);
    return null;
  }
  return events[0];
}

// ---------- Bloques ----------
async function blockPre() {
  const { response: serviceInfo } = await client.ledgerService.getServiceInfo({});
  const chainHex = toHex(fromBase58(serviceInfo.chainId)).slice(0, 8);
  check('0.3', chainHex === deployment.chainId, `chain id ${chainHex}, json ${deployment.chainId}`);

  const h = await readHouse();
  check('0.4.shared', h.shared, `House ${abbr(HOUSE)} Shared y tipo exacto: ${h.shared}`);
  check('0.4.fee_rate', h.feeRate === 200, `fee_rate ${h.feeRate}`);
  check('0.4.min_bet', h.minBet === '1000000', `min_bet ${h.minBet}`);
  check('0.4.max_bet', h.maxBet === '50000000000', `max_bet ${h.maxBet}`);
  check('0.4.version', h.version === '1', `version ${h.version}`);
  const K0 = await kRead(h.object);
  info(`F0 = ${h.fees} · K0 = ${K0} (checkpoint de previousTransaction ${h.object.previousTransaction})`);
  await saveState({ F0: h.fees.toString(), K0: K0.toString() });

  const cap = await capOwner();
  check('0.5.cap', true, `HouseCap ${abbr(CAP_ID)} con dueño AddressOwner (CAP)`);
  if (digests.dcap) {
    const r = await tx(digests.dcap);
    gasLine('dcap', r);
    check('0.5.dcap.success', isSuccess(r), digests.dcap);
    const e = single('0.5.dcap.event', r, 'house::HouseCapTransferred');
    if (e) {
      check('0.5.dcap.cap_id', norm(e.cap_id) === CAP_ID, `cap_id == houseCapId: ${norm(e.cap_id) === CAP_ID}`);
      check('0.5.dcap.recipient', norm(e.recipient) === cap, `recipient == CAP: ${norm(e.recipient) === cap}`);
    }
  } else {
    info('sin dcap: 0.5 solo con el dueño actual');
  }

  // C-2 (v1.2): cota = máx(publicación, piso + margen), como historyLowerBound de app/src/sui/eventScan.ts; el margen
  // solo con piso > 0. Si la publicación ya está podada, la cota es la del piso.
  let kp = null;
  try {
    const r = await client.getTransaction({ digest: deployment.publishTxDigest, include: {} });
    kp = body(r).checkpoint === null || body(r).checkpoint === undefined ? null : BigInt(body(r).checkpoint);
  } catch (error) {
    if (!(error instanceof TransactionError)) throw error;
  }
  const floor = await nodeFloor();
  const floorBound = floor !== null && floor > 0n ? floor + HISTORY_FLOOR_MARGIN_CHECKPOINTS : null;
  if (kp === null && floorBound === null) throw new Error('sin checkpoint de la publicación ni piso del nodo para acotar 0.6');
  const bound = kp === null ? floorBound : floorBound === null || kp >= floorBound ? kp : floorBound;
  const origin = bound === kp ? 'publicación' : 'piso + 16000: lo anterior no es visible';
  const created = await scanEvents('game::GameCreated', bound);
  const resolved = await scanEvents('game::GameResolved', bound);
  check('0.6', true, `desde el checkpoint ${bound} (${origin}): ${created.length} GameCreated, ${resolved.length} GameResolved`);
  for (const e of created) emit(`AJENA GameCreated ${abbr(e.v.game_id)} fee_rate ${e.v.fee_rate} checkpoint ${e.checkpoint}`);
  for (const e of resolved) emit(`AJENA GameResolved ${abbr(e.v.game_id)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
}

/** Crear: `success`, un `GameCreated` exacto y `Δ(A) == −bet − gas`. Devuelve el evento o `null`. */
async function verifyCreate(p, key, A, expect) {
  const r = await tx(need(key));
  gasLine(key, r);
  check(`${p}.success`, isSuccess(r), digests[key]);
  check(`${p}.sender`, senderOf(r) === A, `sender == A: ${senderOf(r) === A}`);
  const e = single(`${p}.event`, r, 'game::GameCreated');
  if (!e) return null;
  const opponentOk = expect.opponent === null ? e.opponent === null : e.opponent !== null && norm(e.opponent) === expect.opponent;
  check(`${p}.creator`, norm(e.creator) === A, `creator == A: ${norm(e.creator) === A}`);
  check(`${p}.bet`, e.bet === expect.bet, `bet ${e.bet}`);
  check(`${p}.opponent`, opponentOk, expect.opponent === null ? `opponent none: ${e.opponent === null}` : `opponent == B: ${opponentOk}`);
  check(`${p}.fee_rate`, e.fee_rate === expect.feeRate, `fee_rate ${e.fee_rate}`);
  const d = delta(A, r);
  const want = -BigInt(e.bet) - gas(r);
  check(`${p}.delta`, d === want, `Δ(A) ${d} == −bet − gas ${want}`);
  info(`${p}: game_id ${abbr(e.game_id)}`);
  return e;
}

/** Aceptar: evento, montos, balances según `winner`, forma del PTB, objeto y O-7. Devuelve el `GameResolved` o `null`. */
async function verifyAccept(p, key, { A, B, created, expect }) {
  const r = await tx(need(key));
  gasLine(key, r);
  const G = norm(created.game_id);
  check(`${p}.success`, isSuccess(r), digests[key]);
  const e = single(`${p}.event`, r, 'game::GameResolved');
  if (!e) return null;
  const bet = BigInt(created.bet);
  const pot = BigInt(e.pot);
  const fee = BigInt(e.fee);
  const payout = BigInt(e.payout);
  const winner = norm(e.winner);
  check(`${p}.game_id`, norm(e.game_id) === G, `game_id == ${abbr(G)}: ${norm(e.game_id) === G}`);
  check(`${p}.creator`, norm(e.creator) === A, `creator == A: ${norm(e.creator) === A}`);
  check(`${p}.acceptor`, norm(e.acceptor) === B, `acceptor == B: ${norm(e.acceptor) === B}`);
  check(`${p}.winner`, winner === A || winner === B, winner === A ? 'winner == A' : winner === B ? 'winner == B' : 'winner ∉ {A,B}');
  check(`${p}.pot`, pot === 2n * bet && e.pot === expect.pot, `pot ${e.pot} (2·bet ${2n * bet})`);
  const feeWant = (pot * BigInt(created.fee_rate)) / 10_000n;
  check(`${p}.fee`, fee === feeWant && e.fee === expect.fee, `fee ${e.fee} (⌊pot·${created.fee_rate}/10000⌋ = ${feeWant})`);
  check(`${p}.payout`, payout === pot - fee && e.payout === expect.payout, `payout ${e.payout} (pot − fee ${pot - fee})`);
  const dA = delta(A, r);
  const dB = delta(B, r);
  const g = gas(r);
  if (winner === A) {
    check(`${p}.delta.B`, dB === -bet - g, `gana A: Δ(B) ${dB} == −bet − gas ${-bet - g}`);
    check(`${p}.delta.A`, dA === payout, `gana A: Δ(A) ${dA} == +payout ${payout}`);
  } else {
    check(`${p}.delta.B`, dB === -bet + payout - g, `gana B: Δ(B) ${dB} == −bet + payout − gas ${-bet + payout - g}`);
    check(`${p}.delta.A`, dA === 0n, `gana B: Δ(A) ${dA} == 0`);
  }
  const commands = body(r).transaction.commands;
  const lastCall = commands.map((c) => c.$kind).lastIndexOf('MoveCall');
  const call = commands[lastCall]?.MoveCall;
  const shapeOk =
    lastCall >= 0 &&
    norm(call.package) === PKG &&
    call.module === 'game' &&
    call.function === 'accept_game' &&
    commands.slice(lastCall + 1).every((c) => c.$kind === 'TransferObjects' || c.$kind === 'MergeCoins');
  check(`${p}.ptb`, shapeOk, `comandos ${commands.map((c) => c.$kind).join(',')}; accept_game último MoveCall: ${shapeOk}`);
  const game = await readObject(G);
  const s = game.json.state;
  const objOk =
    sameType(game.type, `${ORIG}::game::Game`) &&
    s['@variant'] === 'Resolved' &&
    norm(s.acceptor) === B &&
    norm(s.winner) === winner &&
    u64(game.json.stake) === '0';
  check(`${p}.object`, objOk, `${abbr(G)} ${s['@variant']}, acceptor == B y winner == evento: ${objOk}, stake ${u64(game.json.stake)}`);
  if (expect.previousIsAccept) {
    check(`${p}.previousTransaction`, game.previousTransaction === digests[key], `previousTransaction == ${key}: ${game.previousTransaction === digests[key]}`);
  }
  const gd = body(r).transaction.gasData;
  obs(`O-7 ${key}: gasBudget ${gd.budget}, gasPrice ${gd.price}, gasBudget ≤ 10000000: ${BigInt(gd.budget) <= 10_000_000n}`);
  return e;
}

async function block1() {
  const A = await idA();
  const B = await idB();
  check('1.B≠A', A !== B, `B ≠ A: ${A !== B}`);
  const created = await verifyCreate('1.d1c', 'd1c', A, { bet: '100000000', opponent: null, feeRate: 200 });
  if (!created) return;
  await saveState({ G1: norm(created.game_id) });
  await verifyAccept('1.d1a', 'd1a', {
    A,
    B,
    created,
    expect: { pot: '200000000', fee: '4000000', payout: '196000000', previousIsAccept: false },
  });
}

async function block2() {
  const A = await idA();
  const B = await idB();
  const created = await verifyCreate('2.d2c', 'd2c', A, { bet: '100000001', opponent: B, feeRate: 200 });
  if (!created) return;
  await saveState({ G2: norm(created.game_id) });
  const r = await tx(need('d2a'));
  check('2.d2a.sender', senderOf(r) === B, `sender == B: ${senderOf(r) === B}`);
  await verifyAccept('2.d2a', 'd2a', {
    A,
    B,
    created,
    expect: { pot: '200000002', fee: '4000000', payout: '196000002', previousIsAccept: true },
  });
}

async function block3() {
  const A = await idA();
  const created = await verifyCreate('3.d3c', 'd3c', A, { bet: '1000000', opponent: null, feeRate: 200 });
  if (!created) return;
  const G3 = norm(created.game_id);
  await saveState({ G3 });
  const rc = await tx(need('d3c'));
  const r = await tx(need('d3x'));
  gasLine('d3x', r);
  check('3.d3x.success', isSuccess(r), digests.d3x);
  check('3.d3x.sender', senderOf(r) === A, `sender == A: ${senderOf(r) === A}`);
  const e = single('3.d3x.event', r, 'game::GameCancelled');
  if (e) {
    check('3.d3x.game_id', norm(e.game_id) === G3, `game_id == ${abbr(G3)}: ${norm(e.game_id) === G3}`);
    check('3.d3x.refund', e.refund === '1000000', `refund ${e.refund}`);
    const byOk = norm(e.cancelled_by) === norm(e.creator) && norm(e.creator) === A;
    check('3.d3x.cancelled_by', byOk, `cancelled_by == creator == A: ${byOk}`);
    const dx = delta(A, r);
    check('3.d3x.delta', dx === BigInt(e.refund) - gas(r), `Δ(A,d3x) ${dx} == refund − gas ${BigInt(e.refund) - gas(r)}`);
    const sum = delta(A, rc) + dx;
    const want = -gas(rc) - gas(r);
    check('3.refund_integro', sum === want, `Δ(A,d3c) + Δ(A,d3x) ${sum} == −gas(d3c) − gas(d3x) ${want}`);
  }
  const inputIds = body(r)
    .transaction.inputs.filter((i) => i.$kind === 'Object')
    .map((i) => norm(i.Object[i.Object.$kind].objectId));
  const changed = body(r).effects.changedObjects.map((c) => norm(c.objectId));
  const houseOut = !inputIds.includes(HOUSE) && !changed.includes(HOUSE);
  check('3.d3x.sin_house', houseOut, `la House no está entre los inputs ni los objetos cambiados: ${houseOut}`);
  const game = await readObject(G3);
  const objOk = game.json.state['@variant'] === 'Cancelled' && u64(game.json.stake) === '0';
  check('3.G3', objOk, `${abbr(G3)} ${game.json.state['@variant']}, stake ${u64(game.json.stake)}`);
  if (digests.dO1) {
    const ro = await tx(digests.dO1);
    check('3.dO1.sender', senderOf(ro) === A, `sender(dO1) == A: ${senderOf(ro) === A}`);
  }
}

async function resolvedFee(key) {
  const e = txEvents(await tx(need(key)), 'game::GameResolved');
  if (e.length !== 1) throw new Error(`${key} no tiene exactamente un GameResolved`);
  return e[0];
}
async function createdGame(key) {
  const e = txEvents(await tx(need(key)), 'game::GameCreated');
  if (e.length !== 1) throw new Error(`${key} no tiene exactamente un GameCreated`);
  return norm(e[0].game_id);
}

async function block4a() {
  const K0 = BigInt(needState('K0', 'pre'));
  const F0 = BigInt(needState('F0', 'pre'));
  const G1 = await createdGame('d1c');
  const G2 = await createdGame('d2c');
  const fee1 = BigInt((await resolvedFee('d1a')).fee);
  const fee2 = BigInt((await resolvedFee('d2a')).fee);
  const h = await readHouse();
  const F4 = h.fees;
  const K4 = await kRead(h.object);
  info(`F4 = ${F4} · K4 = ${K4}`);
  const c1 = await checkpointOf(need('d1a'));
  const c2 = await checkpointOf(need('d2a'));
  const inWindow = c1 > K0 && c1 <= K4 && c2 > K0 && c2 <= K4;
  check('4a.ventana', inWindow, `checkpoint(d1a) ${c1} y checkpoint(d2a) ${c2} en (K0 ${K0}, K4 ${K4}]: ${inWindow}`);
  const resolved = await scanEvents('game::GameResolved', K0 + 1n);
  const others = resolved.filter((e) => e.checkpoint > K0 && e.checkpoint <= K4 && ![G1, G2].includes(norm(e.v.game_id)));
  let sum = 0n;
  for (const e of others) {
    sum += BigInt(e.v.fee);
    emit(`AJENA GameResolved ${abbr(e.v.game_id)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
  }
  info(`ajenas en (K0, K4]: ${others.length}, Σ fee ${sum}`);
  const want = F0 + fee1 + fee2 + sum;
  check('4a.F4', F4 === want, `F4 ${F4} == F0 ${F0} + fee(d1a) ${fee1} + fee(d2a) ${fee2} + Σ ajenas ${sum} = ${want}`);
  await saveState({ K4: K4.toString(), amount4a: F4.toString() });
}

async function block4b() {
  const K4 = BigInt(needState('K4', '4a'));
  const F4 = BigInt(needState('amount4a', '4a'));
  const cap = await capOwner();
  const r = await tx(need('d4w'));
  gasLine('d4w', r);
  check('4b.success', isSuccess(r), digests.d4w);
  const sender = senderOf(r);
  check('4b.sender', sender === cap, `sender == CAP: ${sender === cap}`);
  if (digests.d1c) info(`CAP == A: ${cap === (await idA())}`);
  const { commands, inputs } = body(r).transaction;
  const [c0, c1] = commands;
  let shapeOk =
    commands.length === 2 &&
    c0.$kind === 'MoveCall' &&
    norm(c0.MoveCall.package) === PKG &&
    c0.MoveCall.module === 'house' &&
    c0.MoveCall.function === 'withdraw_fees' &&
    c1.$kind === 'TransferObjects' &&
    c1.TransferObjects.objects.every((o) => (o.$kind === 'NestedResult' && o.NestedResult[0] === 0) || (o.$kind === 'Result' && o.Result === 0));
  let toSender = false;
  if (shapeOk && c1.TransferObjects.address.$kind === 'Input') {
    const input = inputs[c1.TransferObjects.address.Input];
    if (input?.$kind === 'Pure') toSender = norm(Addr.parse(fromBase64(input.Pure.bytes))) === sender;
  }
  shapeOk = shapeOk && toSender;
  check('4b.ptb', shapeOk, `comandos ${commands.map((c) => c.$kind).join(',')}; withdraw_fees + TransferObjects a quien firma: ${shapeOk}`);
  const e = single('4b.event', r, 'house::FeesWithdrawn');
  if (!e) return;
  const amount = BigInt(e.amount);
  check('4b.house_id', norm(e.house_id) === HOUSE, `house_id == houseId: ${norm(e.house_id) === HOUSE}`);
  check('4b.amount≥F4', amount >= F4, `amount ${amount} ≥ F4 ${F4}`);
  const kw = await checkpointOf(digests.d4w);
  info(`checkpoint(d4w) = ${kw}`);
  const window = (await scanEvents('game::GameResolved', K4 + 1n)).filter((x) => x.checkpoint > K4 && x.checkpoint <= kw);
  for (const x of window) {
    emit(`AJENA GameResolved ${abbr(x.v.game_id)} fee ${x.v.fee} checkpoint ${x.checkpoint}${x.checkpoint === kw ? ' (mismo checkpoint que d4w)' : ''}`);
  }
  if (window.length === 0) {
    check('4b.amount==F4', amount === F4, `sin GameResolved en (K4 ${K4}, ${kw}]: amount ${amount} == F4 ${F4}`);
  } else {
    info(`${window.length} GameResolved ajenos en (K4 ${K4}, ${kw}]: amount == F4 no se exige (la igualdad exacta la da final)`);
  }
  const d = delta(cap, r);
  check('4b.delta', d === amount - gas(r), `Δ(CAP,d4w) ${d} == amount − gas ${amount - gas(r)}`);
  await saveState({ kd4w: kw.toString() });
}

async function adminTx(id, key, cap, name, expectFields) {
  const r = await tx(need(key));
  gasLine(key, r);
  check(`${id}.success`, isSuccess(r), digests[key]);
  check(`${id}.sender`, senderOf(r) === cap, `sender == CAP: ${senderOf(r) === cap}`);
  const e = single(`${id}.event`, r, name);
  if (e) {
    const ok = norm(e.house_id) === HOUSE && Object.entries(expectFields).every(([k, v]) => String(e[k]) === v);
    const shown = Object.keys(expectFields).map((k) => `${k} ${e[k]}`).join(', ');
    check(`${id}.valores`, ok, `${name.split('::')[1]}: ${shown}; house_id == houseId: ${norm(e.house_id) === HOUSE}`);
  }
  const d = delta(cap, r);
  check(`${id}.delta`, d === -gas(r), `Δ(CAP) ${d} == −gas ${-gas(r)}`);
}

async function blockH() {
  const cap = await capOwner();
  await adminTx('h.dh1', 'dh1', cap, 'house::FeeRateUpdated', { old_fee_rate: '200', new_fee_rate: '201' });
  await adminTx('h.dh2', 'dh2', cap, 'house::FeeRateUpdated', { old_fee_rate: '201', new_fee_rate: '200' });
  const k1 = await checkpointOf(need('dh1'));
  const k2 = await checkpointOf(need('dh2'));
  const created = (await scanEvents('game::GameCreated', k1)).filter((e) => e.checkpoint >= k1 && e.checkpoint <= k2);
  for (const e of created) {
    emit(`AJENA GameCreated ${abbr(e.v.game_id)} fee_rate ${e.v.fee_rate} checkpoint ${e.checkpoint}${e.v.fee_rate === 201 ? ' (con 201: se anota)' : ''}`);
  }
  info(`GameCreated en [checkpoint(dh1) ${k1}, checkpoint(dh2) ${k2}]: ${created.length}`);
  await adminTx('h.dh3', 'dh3', cap, 'house::BetLimitsUpdated', {
    old_min_bet: '1000000',
    old_max_bet: '50000000000',
    new_min_bet: '2000000',
    new_max_bet: '10000000000',
  });
  await adminTx('h.dh4', 'dh4', cap, 'house::BetLimitsUpdated', {
    old_min_bet: '2000000',
    old_max_bet: '10000000000',
    new_min_bet: '1000000',
    new_max_bet: '50000000000',
  });
}

async function blockFinal() {
  const K0 = BigInt(needState('K0', 'pre'));
  const F0 = BigInt(needState('F0', 'pre'));
  const G1 = await createdGame('d1c');
  const G2 = await createdGame('d2c');
  const fee1 = BigInt((await resolvedFee('d1a')).fee);
  const fee2 = BigInt((await resolvedFee('d2a')).fee);
  const withdrawn = txEvents(await tx(need('d4w')), 'house::FeesWithdrawn');
  if (withdrawn.length !== 1) throw new Error('d4w no tiene exactamente un FeesWithdrawn');
  const amount = BigInt(withdrawn[0].amount);

  const h = await readHouse();
  check('H7.shared', h.shared, `House Shared y tipo exacto: ${h.shared}`);
  check('H7.fee_rate', h.feeRate === 200, `fee_rate ${h.feeRate}`);
  check('H7.limites', h.minBet === '1000000' && h.maxBet === '50000000000', `${h.minBet}/${h.maxBet}`);
  check('H7.version', h.version === '1', `version ${h.version}`);
  const Kf = await kRead(h.object);
  const Ff = h.fees;
  info(`Ff = fees_collected ${Ff} · Kf = ${Kf}`);
  const all = (await scanEvents('game::GameResolved', K0 + 1n)).filter((e) => e.checkpoint > K0 && e.checkpoint <= Kf);
  let sum = 0n;
  let others = 0;
  for (const e of all) {
    sum += BigInt(e.v.fee);
    const g = norm(e.v.game_id);
    const tag = g === G1 ? 'G1' : g === G2 ? 'G2' : 'ajena';
    if (tag === 'ajena') others += 1;
    emit(`RESUELTA ${tag} ${abbr(g)} fee ${e.v.fee} checkpoint ${e.checkpoint}`);
  }
  check(
    'H7.comisiones',
    amount + Ff === F0 + sum,
    `amount ${amount} + Ff ${Ff} = ${amount + Ff} == F0 ${F0} + Σ fee ${sum} (${all.length} GameResolved en (K0 ${K0}, Kf ${Kf}], ${others} ajenas)`,
  );
  if (others === 0) check('H7.sin_ajenas', Ff === 0n, `sin ajenas: Ff ${Ff} == 0`);

  // C-1 (v1.2): las partes son A, B y quien retiró (W = sender(d4w) = CAP), sin repetir. Vale con las dos custodias de
  // N-3: con el cap en A, W == A y la suma es la de la v1.1; con el cap en otra cuenta, se suma su Δ.
  const A = await idA();
  const B = await idB();
  const W = senderOf(await tx(need('d4w')));
  const parties = [...new Set([A, B, W])];
  const who = W === A ? 'A, B (CAP == A)' : W === B ? 'A, B (CAP == B)' : 'A, B, CAP';
  const keys = ['d1c', 'd1a', 'd2c', 'd2a', 'd3c', 'd3x', 'd4w'];
  let dSum = 0n;
  let gSum = 0n;
  for (const key of keys) {
    const r = await tx(need(key));
    for (const p of parties) dSum += delta(p, r);
    gSum += gas(r);
  }
  const want = -gSum + (amount - fee1 - fee2);
  check('H7.conservacion', dSum === want, `Σ Δ(${who}) ${dSum} == −Σ gas ${-gSum} + (amount − fee(d1a) − fee(d2a)) ${amount - fee1 - fee2} = ${want}`);
}

const BLOCKS = { pre: blockPre, 1: block1, 2: block2, 3: block3, '4a': block4a, '4b': block4b, h: blockH, final: blockFinal };
const run = BLOCKS[args.block];
if (!run) {
  emit(`bloque desconocido: ${args.block}`);
  process.exit(2);
}
emit(`BLOQUE ${args.block} · red ${network} · paquete ${abbr(PKG)}`);
try {
  await run();
} catch (error) {
  emit(`ERROR ${error instanceof Error ? error.message : String(error)}`);
  process.exit(5);
}
emit(`RESUMEN ${passed} PASA / ${failed} NO PASA`);
process.exit(failed === 0 ? 0 : 1);
```
