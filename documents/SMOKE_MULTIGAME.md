# SMOKE_MULTIGAME
> Plan: PLAN_MULTIGAME v1.3.2 | Handoff: HANDOFF_MULTIGAME v1.2.12 | Issue: #73 | Fecha: 2026-11-20 | Estado: **PARTE LOCALNET: COMPLETADA (PASA)** · **PARTE TESTNET: REDACTADA, SIN EJECUTAR** (la corre el owner en TASK-9, después de la compuerta §G, de su autorización explícita y de TASK-6) · **RECORRIDO DE UX DEL OWNER: opcional, sin ejecutar**
> Formato de `documents/agentes/AGENTE_MID.md` §M5. La parte localnet es lo que se **corrió y se aprobó** task por task (reportes en `documents/REPORTES_MULTIGAME.md`, con su número de sección); la parte testnet **no tiene resultados**: las columnas "Resultado obtenido" se llenan **durante la corrida del owner**.

## 0. Reglas que valen para todo el documento

- **Ningún agente corre nada de la parte testnet.** Ni el DEV, ni el MID, ni el MAYOR, ni el orquestador firman, publican, hacen upgrade, usan `sui client`/`sui keytool` contra testnet, ni corren `--dry-run` (D-20261102-03, `agents.md` §12). Las **firmas** las hace el **owner con su wallet**; la **sonda de solo lectura** (lecturas públicas por gRPC o GraphQL, **sin claves**, C-4) la corre el orquestador en las ventanas que el owner indique.
- **Sin autorización registrada no se ejecuta ningún paso de testnet.** La autorización del upgrade (TASK-6) es una entrada propia de `documents/DECISIONES.md` (D-20261119-05, D14) con la fecha y el **head de contrato `C`** (el commit cuyo árbol, fuera de `documents/`, revisó la compuerta; ver P1), posterior a la compuerta de pre-upgrade del MAYOR (§G de `HANDOFF_MULTIGAME.md`, `documents/COMPUERTA_PREUPGRADE_MULTIGAME.md`). Hasta entonces la parte B es solo un guion.
- **Repo público (C-6):** nada de direcciones de cuenta (se usan los roles A, B y C), claves, frases ni rutas personales (se usa `<repo>`, `<su dir>`, `<scratchpad>`); los IDs de objeto y paquete y los digests públicos sí.
- **El 9000 ajeno** del host de las corridas de localnet no se toca (Receta P de `agents.md` §3): la parte A corrió con la localnet aislada en el puerto alternativo.

---

# A. Parte localnet (COMPLETADA: PASA)

Todo corrió en la **localnet aislada** de `agents.md` §3 (puerto alternativo, `~/.sui` idéntico a su línea base en cada cierre), con el v1 = árbol `26f2676` publicado con el binario **1.83.0** (los dos SHA-256 verificados contra `ci.yml` de `88dd53b` **antes** de ejecutarlo) y el upgrade con la CLI **1.84.0** (PV 142). Cuentas de la génesis efímera por rol (A, B, C, ADMIN); sin claves ni direcciones en el repo.

## A.1 TASK-5: el ensayo de punta a punta (REPORTES §17, revisión del MID §18, del MAYOR §19, verificación del orquestador §20)

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 1 | Receta P (9000 ajeno intacto, 19000 libre, génesis sin `suic`, `sui start --fullnode-rpc-port 19000`), `smoke_guard` y `smoke_guard_v1`; v1 con 1.83.0 (Receta V1); House con comisión fijada | chain id responde; v1 con `House`, `HouseCap` y `UpgradeCap`; comisión 500 bps | chain `a8d865ab`; v1-A publicado `D1AT2jXFm4R1cuC3tu9TojB579PGDNtaTE6fRUafTh3P` (cómputo 1 000 000 + storage 46 246 000 = 47 246 000 MIST); v1-B `DopHA9reL2AXnYNaVQViicD36s7sioKgwaVRshekFBkz`; House B versión 1 con `update_fee_rate` a 500 bps `BNeYf4aTAe7f4DKufKLSF3K4C1r47V8dr7EDLQMroQSz`; `record` sin `--out` | ✅ PASA |
| 2 | Partidas viejas: abierta, invitación, cancelada, resuelta, `Pending` | 6 `game::Game` de 10 000 000 MIST con `fee_rate` 500 copiado | GO1/GO2/GO3 abiertas `Pending`, GINV invitación a B `Pending`, GCAN cancelada por A (`Cancelled`, `stake` 0), GRES aceptada por B (`Resolved`, `fees_collected` 0 → 1 000 000) | ✅ PASA |
| 3 | `publish.mjs upgrade` variantes A y B + `check` | dry run ok; upgrade; `packageVersion` 1 → 2; 24 `typeOrigins`; House intacta | Variante A: dry run "Dry run ok. Gas estimado: 86667363 MIST", upgrade `Bv9nzv5XZyACtkkkqxZvy4oWTcPSrBZNwcRiasSHBTuV`; variante B (sin `--out`, reescribe `localnet.json`): upgrade `14oaKaode2WzE6UnV3X8CEJbQ3vW5PPjpUmuDs8JFnhG`, `upgrades[0]` con `version` 2, 24 `typeOrigins`, `suiCliVersion` 1.84.0-9dc25070cf2e; **gas real del upgrade: cómputo 1 000 000 + storage 87 301 200 − rebate 2 621 738 = 85 679 462 MIST netos**; `check` = "2 despliegue(s) válidos y coherentes con Published.toml"; House intacta (versión 1, `fee_rate` 500, `fees_collected` 1 000 000 antes y después); `git diff --exit-code -- Move.lock Published.toml` = 0 | ✅ PASA |
| 4 | Pending vieja aceptada y otra cancelada **tras** el upgrade | las viejas siguen jugables por los dos IDs | `accept_game` de GO1 por el ID **original** `FsevJCj3tBoKqy7TSGXBuqBspsTynjYTWbagjAvC6Dtz` (pozo 20 000 000 = pago 19 000 000 + comisión 1 000 000); `accept_game` de GO2 por el ID del **upgrade** `B24z3iYAJjuY1uVgDowsnqe2PDU8jSSkn8xvFCGoUi5d`; `cancel_game` de GO3 por el ID del upgrade `ECQqrEqZyLH5KuaQHxCK9cziqnKyDAX8mhtk8c2VA3k5` (reembolso 10 000 000); el tipo del evento conserva el ID original; `fees_collected` 1 000 000 → 3 000 000 | ✅ PASA |
| 5 | Coinflip nuevo: crear, cancelar, rechazar, aceptar (ambos ganadores) | `DuelCreated` control 0; `fee_rate` copiado al crear; comisión en la misma House | crear `5Kw8bWyjzRCWfX4vRvnWaTeozSCFTVPfhMzWx36u9m8J` y cancelar `r2Hx75ZQryi8iquZeAwzh3aVWSqhvokMAvdiVgcjfkM`; invitación `FNVPHYSE2R2cpwRL2UPdHsXC37R5WRCcmW5VckF3hvB7` y rechazo por B `EhhtFLbFYpTRqqudJnsC1m1LhCnVsQdLDe7KFinXwWVn`; `fee_rate` copiado (House a 300 y aceptación `FYciU3zi3GTJgUHqzSimomcfZat8cZHCyqNWqjVAYsFN` con comisión de 500 bps); invitación aceptada `456DSVoicRZwxVdG3rQA5FTPqisjqejEmkTwcX5rX6Fs`; 43 `DuelResolved<Coinflip>` con **ambos** ganadores; **`fees_collected` de la misma House suma las dos fuentes** (3 000 000 → 4 000 000 → 46 000 000) | ✅ PASA |
| 6 | Gasto por resultado (≥ 2 y ≥ 2) y barrido del presupuesto mínimo | cómputo, storage y rebate iguales entre resultados; umbral igual | A17b (6 rondas con moneda de gas fija) y A23 (42 `accept` leídos por gRPC) idénticos; barrido A18-A21: umbral **2 474 892 MIST** igual en 21 partidas | ✅ PASA |
| 7 | v3 sandbox: partida por turnos hasta `collect` + `pay` | `DuelResolved`; conservación | create `5tdoTA9CBYeL4YHmKexrhmt2w65D4sfvYYiQp3rawEFq` (control 8 = 15 s), accept `CxwZzsL4r4wiBpa1gALWB9zYRPQDiAJCkadb7x6Kt3ym`, jugadas de A y B, settle `6cvjb2yyrNHUsLX9C7ZBh2ehvQqKNWwFQSfTjXErT4tU`: A recibe 19 000 000, `fees_collected` 46 000 000 → 47 000 000, `stake` 0 | ✅ PASA |
| 8 | Reclamo por tiempo por un tercero | `TimedOut`; el pozo menos la comisión al **rival**, no a quien llama | create `5fzVB8DFr9f3bJx4DFmbVDiu9LMsqFHHNTKAS3FyM3W4`, accept (debe mover B) `F3UVLedaMTnkSopQTci1WoAUh5EwvXPneXqhWpV7SNd4`; `claim_timeout` de C (tercero) `ZeswhXAe6eaz1zo6Y1ETABVNWtxGLHv8jbdkQJXdNKH`: `TimedOut`, A cobra 19 000 000, C solo paga su gas, `fees_collected` 47 000 000 → 48 000 000 | ✅ PASA |
| 9 | Ambos pendientes vencido → `refund_stalled`; un pendiente pasada la gracia → `refund_stalled` | `Expired`, 100/100 sin comisión | ambos pendientes `EGzD7ABYqcDMKGfBDUpWXYPn954ggMoNfbZpD5pXWtVm` (A 10 000 000, B 10 000 000, `fees_collected` igual); un pendiente: antes de la gracia `ENotStalled`/23 `12qZ7RcGiHvzAUR9mhbFmdEMc2PuRSpHwULndzLMxE4w`, pasada la gracia del sandbox `Bd4dcTWPh8CAkx292QVt5MVQ7wji49YctNpmrNrS5vrf` | ✅ PASA |
| 10 | Abortes: `claim_timeout` antes del plazo; `record_move` después; `collect` de un tercero | `ENotExpired`/14; `EDeadlinePassed`/21; `ENotPlayer`/24 | `Do1wT59EZ7UGzoRotP2xNcRNBamVreJgu6RHSMee7LFE` (14); `Bqbv6hx8WFDzeUz3MKYwMdZ6fe8f55vGPw8KXvFHHLpH` (21); `GMYxbiRfrFchxQmWUfXvt6FApYnFoXjJ27VEtjbfGEvc` (24); además `EBothPending`/22 `3tZScpvJHBv5uVZvcVnn83RbqFVAzpr1xTdy1Rf45xa9` | ✅ PASA |
| 11 | `typeArguments` con IDs de upgrades distintos | el ID de **definición** pasa siempre | con el ID de definición pasa (target del paquete vigente, de otro upgrade o de la versión anterior); el de almacenamiento de una versión ≥ la que define el módulo **también** pasa; falla (`TypeArgumentError`/`TypeNotFound`) el ID anterior a la definición y el original | ✅ PASA |
| 12 | Capturas de fixtures (con `_meta.sandbox` en la de reloj) | deterministas; guarda de loopback | tres scripts con `--url "$RPC_URL"`; dos corridas iguales salvo `_meta.capturedAt`; código 2 ante `--url` no loopback antes de cualquier pedido; `duel-clock` con `_meta.sandbox = true` | ✅ PASA |
| 13 | Cierre | red caída, `~/.sui` idéntico, árbol limpio | `kill` por PID, `<SMOKE_DIR>` borrado, `~/.sui` idéntico, `localnet.json` y `contracts/build` borrados, árbol limpio | ✅ PASA |

**TASK-5: 13/13.** Evidencia adicional de TASK-5 que el MAYOR pidió para la compuerta (SEG-5, S-1/S-2/N-3): REPORTES §17 y §19.

## A.2 TASK-7b: lectura de las dos fuentes por la app (REPORTES §24; revisión del MID §25; verificación del orquestador §26)

Localnet reconstruida con la Receta P (v1 con 1.83.0 `6fX3is3mPFriCAyHrSrg8urX3KRTuhAas4KUupiM4TPV`, `update_fee_rate` a 500 bps `6GWdGAM3mcdgrjptp7qSn4fKR9YyFSxi1LZC76fvkLiN`, upgrade variante B `HrQJ8MAwYdTGgvnBCoq5KtxZjPm9tTwJBNJgmeW1KRdG`) y una **sonda de solo lectura** (funciones reales de `app/src` contra el nodo, sin claves ni firmas, con aborto si la URL no es loopback o es el 9000):

| # | Qué se verificó | Resultado | Estado |
|---|---|---|---|
| 1-8 | v1 publicado, `record`, comisión, partidas anteriores (2 abiertas, 1 invitación, 1 cancelada, 1 resuelta), `upgrade` variante B, `check` en verde, `typeOrigins` = cadena **24/24**, partidas nuevas (2 abiertas, 1 invitación, 1 cancelada, 1 rechazada, 1 aceptada) | PASA, todas `success` | ✅ |
| 9-10 | Lobby "Todos" y "Coinflip" con las dos fuentes (4 abiertas); tipos parseados = `typeOrigins` | PASA; el prefijo devolvió 8 `DuelCreated` de **una** instanciación de `G` | ✅ |
| 11 | "Mis partidas" de A, B y C | roles y secciones esperados, 0 eventos ilegibles; C sin filas | ✅ |
| 12 | **Partición de 11 literales contra el nodo real** | 11 literales = `INVALID_ARGUMENT` ("at most 10"); los dos trozos son válidos; la fusión da 17 eventos sin duplicados y paginando de a 3 por trozo se recuperan los mismos 17 | ✅ |
| 13-15 | Builders simulados sin firmar: crear, aceptar con `Random` último, `cancel<G>`/`reject<G>` con `definingId`; `claim_timeout` y `refund_stalled` sobre un `Pending` = `duel/11` traducido; `cancel<G>` con el ID original = `TypeNotFound` | PASA | ✅ |

**TASK-7b: 15/15** (el paso 16, fixtures, declara que el layout no cambió y no se recapturó).

## A.3 TASK-8a: plomería de la app, smoke sin navegador (REPORTES §27; revisión §28; verificación §29)

Localnet (v1 con 1.83.0 `3QLsAYfz6kksS8Q2xBWuWoriGjjGn3dWibsLk3REM9Hw`, `update_fee_rate` `9wyZyX3Kjs1FTWS5PJWi2C4c9fXAAFiH84c8jx8XyEE2`, upgrade `DoUy5YLV2UdCEYtTTr3xXkcjD4bVS9WhVgNqDRxytF9A`), sonda de solo lectura y partidas creadas con la CLI:

| # | Qué se verificó | Resultado | Estado |
|---|---|---|---|
| 1 | v1 + `record` + `upgrade` B + `check` | `typeOrigins` = cadena 24/24; `check` "2 despliegue(s) válidos"; `Move.lock`/`Published.toml` sin delta | ✅ |
| 2 | Partidas de las dos fuentes con la CLI | todas `success` | ✅ |
| 3 | **Detalle por tipo exacto del objeto** | `Game` y `Duel` (`Pending`, `Cancelled`, `Resolved`) correctos; la House = `NotAGameError`; un ID inexistente = `GameNotFoundError` | ✅ |
| 4 | **Intérpretes con el resultado real** | aceptar = `DuelActivated` + `DuelResolved` y el resultado es el `DuelResolved`: pozo 20 000 000 = pago 19 000 000 + comisión 1 000 000 (500 bps); con otro firmante `null`; los de la fuente anterior no cambian | ✅ |
| 5 | Modelo de fila sobre el lobby y "Mis partidas" reales | misma forma de fila para las dos fuentes, control "sin reloj", 0 ilegibles; C sin filas | ✅ |
| 6 | Hooks enrutados **simulados sin firmar** | crear/aceptar/cancelar/rechazar de cada fuente OK; `claim_timeout` y `refund_stalled` sobre un `Pending` = `duel/11` traducido | ✅ |
| 7 | Cierre y C-14 | red caída, 9000 ajeno igual, `~/.sui` idéntico, nada en segundo plano | ✅ |

**TASK-8a: 7/7.** Hallazgo medido en este smoke: el depósito de storage de crear un `Duel` (**2 409 200 / 2 652 400 MIST**, abierta / invitación) frente al del `Game` (1 953 200 / 2 196 400): +456 000 MIST.

## A.4 #77 y TASK-8b: el navegador de punta a punta (🌐) con `VITE_LOCALNET_URL`

**#77** (PR #81 → `master` `440f44e`; reporte y revisiones en `git show 316a645:documents/REPORTES_LOCALNET_PORT_77.md`): el navegador alcanza la localnet aislada del puerto alternativo con `VITE_SUI_NETWORK=localnet VITE_LOCALNET_URL="$RPC_URL" npm run dev -w app` (sin `--host`). Smoke de 8 pasos en PASA: el cliente de la app lee el chain id de la génesis (`d41aa467`); sin la variable la config resuelve el 9000 **sin hablarle**; testnet ignora la variable; los dos builds de testnet (con y sin la variable) son idénticos en nombre, tamaño y sha256 (valor = 0, `VITE_LOCALNET_URL:void 0`, `BASE_URL` = 0); Chrome headless por CDP: `localnet · nodo OK`, 9 peticiones gRPC-web a `127.0.0.1:19000` y **0 a `:9000`**.

**TASK-8b** (REPORTES §30; revisión §31; verificación §32): localnet con v1 (1.83.0), `upgrade` variante B, `typeOrigins` = cadena **24/24**, `check` verde; Vite sin `--host` (el 5173 solo en loopback); Chrome headless con perfil desechable y un grabador CDP:

| # | Qué se verificó | Resultado | Estado |
|---|---|---|---|
| 1 | Localnet + v1 + upgrade B + Vite + Chrome + grabador | `localnet · nodo OK`; **279** peticiones gRPC-web a `127.0.0.1:19000`, 265 `GET` a Vite, 5 `data:` y 2 WebSocket de HMR; **0 con destino `:9000`** | ✅ |
| 2 | Lobby con partidas viejas y nuevas | dos filas con "nueva · sin reloj" y "anterior · sin reloj"; filtro "Todos"/"Coinflip" con "2 partidas" | ✅ |
| 3 | Crear un coinflip nuevo (y medir el gas) | nota de costo "≈ 0.0024092 SUI abierta, ≈ 0.0026524 SUI con invitación"; creación `9h2YK1DWZLLDJAiK5ztDReoXLxoqJFtrfwze4A8FBm3n`: presupuesto 4 409 200 MIST; cómputo 1 000 000 + storage 3 397 200 − rebate 987 901 = **3 409 299 MIST netos**; **bruto 4 397 200 < `CREATE_GAS_RESERVE_MIST` (10 000 000)**: la constante no cambia | ✅ |
| 4 | Aceptar desde otra cuenta | "Resuelta", "Resultado para ti: ganaste", pozo 0.02 SUI = pago 0.019 + comisión 0.001 (5 %) | ✅ |
| 5 | Cancelar y rechazar una partida nueva | éxito con la misma máquina, con los reembolsos leídos del evento | ✅ |
| 6 | "Mis partidas" | las tres secciones con las dos fuentes y las invitaciones | ✅ |
| 7 | (opcional) vista activa con el sandbox `testgame` | **OMITIDO** (ver la limitación) | ➖ |
| 8 | Consola | 0 errores, 0 excepciones, 0 violaciones de CSP (en dev no hay CSP); 2 *warnings* esperados (la burner de `DEV` y Lit en modo dev) | ✅ |
| 9 | Medidas de UX por CDP | 320 px sin scroll horizontal en cada vista real (305 ≤ 305), objetivos ≥ 44 px (select del filtro 67 × 44; botones y radios sobre marcado inyectado), `achromatopsia`, recorrido con `Tab` | ✅ |
| 10 | Cierre | Chrome, Vite, grabador y `sui start` cerrados por PID; 19000/5173/19222 en 0; el 9000 ajeno igual; `~/.sui` idéntico; C-14 | ✅ |

**TASK-8b: 9 de 10 en PASA, con el paso 7 omitido y declarado.**

## A.5 Limitación declarada de la parte localnet

**El paso 7 de TASK-8b no se hizo.** La vista **activa con la cuenta regresiva real**, `TimedOut` y `Expired` en pantalla, y el claim/refund **firmados desde el navegador** sobre una partida activa real **no se ejercieron en navegador**: obligan a reconstruir el sandbox `testgame` de TASK-5 (que se borró con su `<SMOKE_DIR>`). Quedan cubiertos por Vitest con la máquina real, un reloj de pantalla inyectable y **objetos reales** de la fixture `duel-clock` (`_meta.sandbox === true`), y por el contrato en el ensayo de TASK-5 (filas 7-10). **No son alcanzables en producción** hasta el primer juego con reloj (#18): el coinflip no persiste `Active`. Decisión del MID (REPORTES §31): el paso 7 **no se exige antes de la compuerta §G** y **es obligatorio en el smoke del primer juego con reloj (#18)**. Otras salvedades menores de la parte localnet: los controles de tiempo de 8b y los botones de reclamar y reembolsar se midieron (UX-11) sobre marcado inyectado con las mismas clases; el vacío del filtro por juego no se probó en navegador (un solo juego registrado).

## A.6 Reporte final de la parte localnet

- Pasos PASA/TOTAL: **TASK-5 13/13 · TASK-7b 15/15 · TASK-8a 7/7 · #77 8/8 · TASK-8b 9/10 (el 7 omitido y declarado)**. Los ensayos de TASK-1a (8/8) y TASK-1b (V-1..V-16) y los de TASK-4 (script de upgrade, variantes A y B) están en REPORTES §1, §3 y §13.
- Hallazgos: ninguno abierto. Los hallazgos de cada tarea (H-1..H-5 de TASK-5, el depósito del `Duel` de 8a, el gas de crear de 8b) están en sus revisiones del MID.
- **Veredicto de la parte localnet: PASA** (con la limitación A.5).

---

# B. Parte testnet (SIN RESULTADOS: la ejecuta el owner en TASK-9)

> **ADVERTENCIA.** Ningún agente corre nada de esta parte. **Sin la autorización del upgrade registrada en `DECISIONES.md` no se ejecuta ningún paso**, incluido el B.0. Esta parte se llena **durante la corrida**: las columnas "Resultado obtenido" y "Estado" quedan en ⏳ hasta que el owner o la sonda las completen. Un paso en NO PASA detiene la corrida y se reporta (no se reintenta nada sin mirar el digest).

## B.1 Precondiciones

| # | Precondición | Cómo se comprueba | Estado |
|---|---|---|---|
| P1 | **Compuerta §G del MAYOR sin 🔴/🟠** y **autorización explícita del owner registrada** en `DECISIONES.md` (entrada propia con la fecha y el **head de contrato `C`**). **Qué es "el head autorizado" (M-1 de la compuerta):** la entrada es un commit de la misma branch, así que el head de la branch cambia al registrarla y con cada commit de docs posterior; por eso la entrada nombra `C` (el commit cuyo árbol fuera de `documents/` revisó la compuerta) y el upgrade corre desde el head `H` de la branch que **contiene** la entrada, con (1) `git diff C..H -- . ':(exclude)documents' ':(exclude,glob)**/*.md'` **vacío** (comando y salida pegados, U1 de `contracts/README.md`; solo la documentación puede diferir) y (2) la **CI en verde sobre `H`**. El `sourceCommit` del json será `H`. **Para los pasos posteriores al upgrade** (T1 en adelante), el head que se prueba es `H'` = `H` más el commit de `testnet.json` y `Published.toml` actualizados (y los docs): se exige `git diff C..H' -- . ':(exclude)documents' ':(exclude,glob)**/*.md' ':(exclude)contracts/deployments/testnet.json' ':(exclude)contracts/Published.toml'` **vacío** | la entrada existe y nombra `C`; `H` contiene la entrada y cumple (1) y (2); `H'` cumple la condición de arriba | ⏳ |
| P2 | **TASK-6 ejecutada por el owner** con el runbook de `contracts/README.md`, "Uso en testnet → Upgrade" (U0-U8): pre-vuelo (PV de testnet ≤ la de la CLI; `UpgradeCap` con los valores esperados), dry run, upgrade en **un solo PTB**, `git diff` de `Published.toml` (**solo** `published-at`, `version` y `toolchain-version`), registro, `check` y verificación independiente (U7: `typeOrigins` del json = cadena) | el owner entrega `deployments/testnet.json` y `Published.toml` **sin editar** y los digests (U8); si el `git diff` de `Published.toml` trae otra cosa, STOP sin registrar | ⏳ |
| P3 | `contracts/deployments/testnet.json` (con `packageVersion` 2, `upgrades[0]` y los 24 `typeOrigins`) y `contracts/Published.toml` **commiteados en la branch** del PR (Railway solo publica `master`, así que el build local usa la branch) | `git status` limpio; `node contracts/scripts/publish.mjs check` = "1 despliegue(s) válidos y coherentes con Published.toml" | ⏳ |
| P4 | CLI local del owner **= `ci.yml`** (`printf 'n\n' \| sui --version` = `1.84.0-9dc25070cf2e`) y Node de `.nvmrc` | las dos versiones | ⏳ |
| P5 | **Build local de testnet** de la branch: `VITE_SUI_NETWORK=testnet npm run build -w app` (o `npm run dev -w app` / `vite preview` con esa variable), **sin** `VITE_LOCALNET_URL` (se ignora en testnet) y **sin `--host`** | el build es válido; `grep -rqF` de `packageId`, `originalPackageId`, `houseId` y `publishTxDigest` de `testnet.json` en `app/dist/assets` y **ningún** `network: "localnet"` | ⏳ |
| P6 | **Wallets del owner con SUI de testnet:** A (crea; puede ser la publicadora) y B (acepta, invitada), más C (tercera, **no firma**). Saldo orientativo para esta corrida: ≥ 0,05 SUI por cuenta que firma (apuestas de 0,001 SUI, el depósito de storage de crear ≈ 0,0024 SUI abierta y ≈ 0,0027 SUI con invitación y el gas) | el owner lo confirma por rol; sin direcciones | ⏳ |
| P7 | **(Recomendada, ANTES del upgrade)** el owner crea con la app **actual** de Railway **una partida abierta anterior** de 0,001 SUI y la deja `Pending`, para probar después que una `Pending` anterior se acepta tras el upgrade (fila 4 de TASK-5 en testnet). Si no se hizo, los pasos B.2 T3b y T3c se marcan "no aplica" y se declaran | el ID de esa partida (o "no se creó") | ⏳ |
| P8 | **Línea base por lectura pública, ANTES del upgrade** (la toma el owner en U2 o el orquestador con la sonda): House (`version` 1, `fee_rate`, `min_bet`, `max_bet`, `fees_collected` = `F_pre`) y `UpgradeCap` (`version` 1); chain id `4c78adac` | los valores anotados | ⏳ |

## B.2 Pasos

Montos: apuestas de **0,001 SUI** (1 000 000 MIST, el mínimo de la House de testnet según el último dato público: confirmar `min_bet` en T0). La **sonda** es de solo lectura (gRPC `SuiGrpcClient` a `https://fullnode.testnet.sui.io:443` o GraphQL público, sin claves); cada paso anota su digest y la altura del checkpoint. Referencias: `K0` = altura del nodo anotada en T0 antes de cualquier firma; `F0` = `fees_collected` de la House en T0.

| # | Acción (quién) | Resultado esperado (criterio PASA) | Resultado obtenido | Estado |
|---|---|---|---|---|
| **T0** | **Sonda `pre`** (orquestador, lectura pública): chain id; `testnet.json`; House; `UpgradeCap`; `typeOrigins` de la cadena | chain id `4c78adac` = el del json; `packageVersion` 2; `typeOrigins` del json = tabla del paquete on-chain (**0 diferencias**, 24 tipos: `house` y `game` con el ID original, `duel` y `coinflip` con el del upgrade); `UpgradeCap` con `version` "2", `package` = `packageId` del json y **`policy` 0 (`compatible`)** (D7: se mantiene hasta después de #18), y la **custodia repetida**: el `UpgradeCap` sigue en la dirección del owner (el "sí/no" de U2.2 repetido tras el upgrade; también se entrega en B.3); **House intacta**: `Shared`, `version` 1, `fee_rate`, `min_bet`, `max_bet` y `fees_collected` **iguales** a los de P8 (el upgrade no tocó la House); se anotan `F0` y `K0` | ⏳ | ⏳ |
| **T1** | **Coherencia del registro** (owner/orquestador): `check`; `git diff` de `Published.toml` contra el estado pre-upgrade; `sourceCommit` del json existe en `master` o en la branch (no se rebaseó ni se squasheó) | `check` verde; el diff de `Published.toml` es **solo** `published-at`, `version` y `toolchain-version`; el `sourceCommit` resuelve | ⏳ | ⏳ |
| **T2** | **App local de testnet** (owner, build de P5; sonda opcional con Chrome headless sin wallet): abrir la app | el indicador dice `testnet · nodo OK`; sin pantalla de configuración; la consola sin errores nuevos; el chain id del nodo = el del json (sin `wrong_chain`) | ⏳ | ⏳ |
| **T3a** | **Lobby con las dos fuentes** (owner): abrir "Partidas abiertas" | con la fuente nueva en el registro aparecen el filtro `Juego` ("Todos" por defecto, "Coinflip"), el rótulo **"anterior"/"nueva"** y el control de tiempo ("sin reloj") de cada fila; si hay una anterior abierta de P7, sale como "anterior · sin reloj"; **0 filas ilegibles** | ⏳ | ⏳ |
| **T3b** | **Una partida anterior terminal** (owner): abrir `#/game/<id>` de una partida resuelta o cancelada del MVP (#17) | el detalle dice "Resuelta"/"Cancelada" con los textos de siempre (sin la fila "Reloj"); el tipo del objeto es `game::Game` del paquete **original** | ⏳ | ⏳ |
| **T3c** | **Aceptar la `Pending` anterior de P7 con B** (owner; solo si P7 se hizo) | éxito; el evento `GameResolved` conserva el tipo del ID **original**; pozo = 2 × apuesta; comisión = ⌊pozo × `fee_rate` / 10 000⌋; pago = pozo − comisión; "Resultado para ti" coherente con el ganador del objeto; `Game` `Resolved` con `stake` 0; `fees_collected` sube exactamente la comisión | ⏳ | ⏳ |
| **T4** | **Crear un coinflip nuevo con A** (owner), abierta, 0,001 SUI | la nota de costo dice "≈ 0.0024092 SUI abierta, ≈ 0.0026524 SUI con invitación"; éxito; `DuelCreated<Coinflip>` con `control` 0, `turn_ms` 0 y `fee_rate` = el vigente de la House; la partida aparece en el lobby como "nueva · sin reloj" y su detalle dice "Reloj: sin reloj"; el costo de red real (cómputo + storage − rebate) del `effects.gasUsed` anotado | ⏳ | ⏳ |
| **T5** | **Cancelar** (A sobre una nueva abierta) | `DuelCancelled` con `refund` = la apuesta, `Cancelled`, `stake` 0; sin tocar la House | ⏳ | ⏳ |
| **T6** | **Invitar y rechazar**: A invita a B (0,001 SUI); B la ve en "Invitaciones recibidas"; una tercera cuenta (C, o A mirando con otra) la ve "para otra cuenta" **sin "Aceptar"**; B rechaza | `DuelCancelled` con `cancelled_by` = B y reembolso a A; `Cancelled`, `stake` 0 | ⏳ | ⏳ |
| **T7** | **Aceptar un coinflip nuevo con B** (owner), sobre una abierta de A | **una sola transacción** con `DuelActivated` y `DuelResolved` (el resultado es el `DuelResolved`, con `acceptor` = B); pozo = 2 × apuesta; comisión = ⌊pozo × `fee_rate` / 10 000⌋; pago = pozo − comisión; ganador ∈ {A, B}; `Duel` `Resolved`, `stake` 0; `Random` en el último comando (lo arma la app); "Resultado para ti" coherente; balances según el ganador (sonda: Δ del ganador = pago − apuesta − gas) | ⏳ | ⏳ |
| **T8** | **`fees_collected` suma las dos fuentes** (sonda, al final): sumar `fee` de **todos** los `GameResolved` (tipo original) y `DuelResolved<Coinflip>` en `(K0, Kf]`, incluidas las ajenas (se listan) | `fees_collected(Kf) = F0 + Σ fee` **exacto**; la House es la misma (`Shared`, `version` 1, mismos `fee_rate`/límites); las comisiones de la fuente anterior y de la nueva se acumulan en el mismo campo | ⏳ | ⏳ |
| **T9** | **Conservación y estado final** (sonda): releer todos los objetos tocados | cada `Duel`/`Game` terminal con `stake` 0; la House sin cambios de `version`/límites; ninguna transacción con `status` distinto de `success` salvo las que se pidieron fallar | ⏳ | ⏳ |
| **T10** | **(OPCIONAL, solo el owner) El nodo rechaza el PTB atacante** `[coinflip::accept, house::fees_collected]` con `--dry-run`, **sin firmar ni mover fondos**: el par de PTB de S-2 de TASK-5 (REPORTES §17 y §19.3) es la referencia de la forma | el nodo **rechaza en la validación de entrada** (`PostRandomCommandRestrictions`: sin digest, sin gas, sin efectos); **NO PASA** si lo simula con éxito o llega a ejecutarse. Nunca lo corre un agente | ⏳ | ⏳ |
| **T11** | **Chequeo posterior al merge** (owner/orquestador, **solo después** del merge y del deploy de Railway; housekeeping de FLUJO §9): abrir la app de Railway | carga sin errores; el lobby con las dos fuentes; el bundle trae el `packageId` del upgrade y los `typeOrigins` coherentes con `testnet.json` | ⏳ | ⏳ |

## B.3 Qué recopila el owner para el orquestador (nada de claves, frases ni rutas)

- Los **digests** de cada firma (T3c, T4, T5, T6, T7) y de la creación de P7, y el del upgrade (`upgrades[0].txDigest` de TASK-6).
- El "sí/no" de **custodia** del `UpgradeCap` (repetido tras el upgrade, U2.2) y la PV y la época medidas en U2.
- Lo que muestra la UI en T3a, T4 y T7 (los textos, copiados; las cuentas por rol o en forma corta) y cualquier mensaje de la wallet (la vista previa de Slush no muestra el nombre de la función: es un dato conocido de #17).
- El resultado de T10 si lo corrió (texto del rechazo del nodo).
- Cualquier desvío: un paso en NO PASA, un mensaje de error o una cancelación del runtime con su `description`.
- Nada más: ni la salida cruda de la CLI, ni el contenido de los directorios temporales del script, ni la ruta de su `SUI_CONFIG_DIR`.

## B.4 Reporte final (se llena al terminar la corrida)

- Pasos PASA/TOTAL: ⏳
- Hallazgos (n.° de paso + digest / output): ⏳
- Veredicto: ⏳ (**PASA** solo si T0-T9 pasan; T10 es opcional y T3b/T3c pueden quedar "no aplica" declarados; **sin PASA no hay revisión de integración** del MAYOR, FLUJO §6-§7)

---

# C. Recorrido de UX del owner (OPCIONAL; separado del smoke; no es PASA/NO PASA)

> Propuesto en la revisión del MID de TASK-8b (REPORTES §31): el DEV de 8b solo vio dos capturas reales y las demás medidas son de DOM; para una tarea cuyo pedido fue "usa un buen ui/ux", el owner juzga lo que los criterios no miden. Son **~15 minutos** sobre `npm run dev` contra la **localnet aislada** (nada de testnet). **Lo prepara el orquestador o el DEV** (localnet de la Receta P en el puerto alternativo, v1 con el 1.83.0, `upgrade` variante B, algunas partidas de las dos fuentes y una burner financiada por CLI); el owner solo abre el navegador. El servidor de desarrollo corre **sin `--host`** y el 9000 ajeno no se toca.

| # | Qué mira el owner | Qué juzga (observaciones, no PASA/NO PASA) |
|---|---|---|
| C1 | Lobby con las dos fuentes y el filtro por juego | ¿se entiende "anterior"/"nueva" y "sin reloj"? ¿se encuentra el filtro? ¿la cantidad ayuda? |
| C2 | Formulario de crear con la nota de costo | ¿la nota de costo es clara antes de pulsar? ¿el orden de la información es el que esperaba? |
| C3 | Detalle de una partida pendiente y de una resuelta | ¿el resumen "estado → qué sigue" responde lo que uno quiere saber? ¿los textos son naturales en español? |
| C4 | "Mis partidas" con invitaciones y terminadas | ¿se distinguen las secciones y las acciones? |
| C5 | Aceptar, cancelar y rechazar desde la UI | ¿el feedback de cada acción (en curso, éxito, costo) es suficiente? |
| C6 | Pantalla angosta (320-360 px, con las herramientas de desarrollo del navegador) | ¿algo se corta, se pisa o cuesta tocarlo? |
| C7 | (si se reconstruyó el sandbox `testgame`, paso 7 de 8b) vista activa con cuenta regresiva, reclamar y reembolsar | ¿el turno, el plazo y los textos de lo que pasará con los fondos se entienden? **Esto es lo que no se pudo ver y es obligatorio en el smoke de #18.** |

Cierre: el servidor de desarrollo y la localnet se cierran por PID (C-14), `~/.sui` queda idéntico y `contracts/deployments/localnet.json` se borra (`agents.md` §3, paso 7). Las observaciones del owner se pegan en este documento (sin cuentas) y, si piden cambios de aspecto, van a #72.
