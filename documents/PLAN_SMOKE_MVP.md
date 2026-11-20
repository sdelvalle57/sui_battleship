# PLAN_SMOKE_MVP v1

> Issue: #17 (+ #8, #15, #16) | Áreas: docs (smoke en testnet) | Fecha: 2026-11-04 |
> Branch: `feature/issue-17-mvp-smoke` desde `master` `eb5332e` (#14, #15 y el PR principal de #16 ya mergeados)

## Historia de usuario

**Como** owner del proyecto, **quiero** recorrer con wallets reales, en testnet y sobre la URL publicada, todos los flujos
del MVP (crear, aceptar, invitar, cancelar, administrar la House) con un resultado verificable en cada paso que un
tercero sin claves pueda comprobar con lecturas públicas, **para** declarar el MVP terminado con evidencia y no con la
suma de smokes parciales en localnet.

**Scope en una frase:** el orden de lo que queda después de la vuelta del owner (#8 → #15 → Railway → #16 → #17), el
runbook del smoke integral con la aritmética esperada de cada paso y cómo verificarlo sin claves, y el cierre del MVP
(STATUS, housekeeping, tag).

**Lo que NO entrega:** la corrección de los bugs que aparezcan (issues `type:bug` propios), mainnet, auditoría externa,
cambios de contrato, de app o de CI. Tampoco ejecuta nada de #8, #15 ni #16: los enlaza y fija el orden.

## Contexto y alcance

**Estado al 2026-11-04 (`master` `eb5332e`):**

- No existen `contracts/deployments/testnet.json` ni `contracts/Published.toml`; la publicación es de #8, PR #48 en draft,
  branch congelada en `26f2676` (puerta G1 de `git show 26f2676:documents/HANDOFF_TESTNET_PUBLISH.md`, "Secuencia y
  puertas"). Su merge-base con `master` es `a6ee14c` (76 commits atrás).
- No existe la URL pública: Railway no está conectado (D-20261104-03, "No delegado"); `README.md:36` y `:47` y
  `app/README.md:71` llevan el placeholder "se completa después de #8".
- La checklist del panel de la House (#14) está en el body de #17 (D-20261104-02 (4)); los comentarios de cierre de #12
  y #13 en #17 suman observaciones para la wallet de extensión real.
- `app/README.md:464`, `:589` y `:882-893` remiten a #17 cosas que solo una wallet de extensión en testnet puede medir.

**Alcance:** criterios 1-4 del issue. El smoke completo (los 5 pasos del issue, la checklist del panel y lo heredado de
#12/#13) en `documents/SMOKE_MVP.md`, formato M5, lleno **durante** la corrida; bugs enlazados; STATUS con el MVP
cerrado; housekeeping §9 (que también cierra #15 y #16 si siguen activos).

**Regla de "nunca por adelantado":** este plan y el handoff fijan estructura, pasos, resultado esperado y comandos de
verificación. Ningún resultado se escribe antes de la corrida: `SMOKE_MVP.md` nace al empezar TASK-4, con las columnas
"Resultado obtenido" vacías (⏳) (DL-1).

## Contrato on-chain

Sin cambios. Un paso en rojo que exija tocar el contrato es STOP no delegable (N-6). Hasta cerrar #17 se puede republicar
en testnet con IDs nuevos (D-20261103-01 (2), en `26f2676`); **al cerrar #17 rige PROY-10 estricto**: solo upgrades
compatibles. Por eso el cierre de #17 lo dice en STATUS y en el body del PR.

## Flujo de fondos y aritmética esperada

Fórmula de la v1 (`contracts/README.md`, "Flujo de fondos" y "Comisión"): `pot = 2 × bet`,
`fee = ⌊pot × fee_rate / 10 000⌋` con el `fee_rate` **copiado en el `Game`** al crearse, `payout = pot − fee`.
`gas(tx) = computationCost + storageCost − storageRebate`, leído de `effects.gasUsed` de esa transacción (incluye el
depósito de storage del `Game`, que no se recupera). `Δ(cuenta, tx)` = `balanceChanges` de esa cuenta en esa
transacción. Todas las igualdades son **exactas**, en MIST, sin tolerancia.

| Camino | Transacción | Δ esperado |
|---|---|---|
| Crear (A, `bet`) | crear | `Δ(A) = −bet − gas(crear)` |
| Aceptar, gana A | aceptar (firma B) | `Δ(B) = −bet − gas(aceptar)`; `Δ(A) = +payout` |
| Aceptar, gana B | aceptar (firma B) | `Δ(B) = −bet + payout − gas(aceptar)`; A sin cambio de balance |
| Cancelar (A) | cancelar | `Δ(A) = +bet − gas(cancelar)`; `GameCancelled.refund = bet`; la House no está entre los inputs |
| Retirar (titular del cap) | retiro | `Δ(titular) = +amount − gas(retiro)`; `amount = fees_collected` justo antes |

Invariantes por partida resuelta: `payout + fee = pot = 2 × bet`, `Δ(A) + Δ(B) = −fee − gas(crear) − gas(aceptar)`,
`fees_collected` sube exactamente `fee`, el `Game` queda `Resolved { acceptor: B, winner }` con `stake = 0`.

**Montos propuestos** (DL-4), con la comisión de #8, 200 bps (D-20261103-01 (3)):

| Paso | `bet` (MIST) | `pot` | `fee` | `payout` | Qué prueba |
|---|---|---|---|---|---|
| 1 (abierta) | 100 000 000 (0,1 SUI) | 200 000 000 | 4 000 000 | 196 000 000 | división exacta |
| 2 (invitación) | 100 000 001 (0,100000001 SUI) | 200 000 002 | ⌊4 000 000,04⌋ = 4 000 000 | 196 000 002 | redondeo hacia abajo: el resto va al ganador (D-20261030-16 D2) |
| 3 (cancelar) | 1 000 000 (`min_bet`) | — | — | reembolso 1 000 000 | 100 % al creador |

Suma de comisiones de los pasos 1-2: **8 000 000 MIST (0,008 SUI)**. Saldo de faucet sugerido: A ≥ 0,5 SUI, B ≥ 0,5 SUI;
C no firma nada en el camino recomendado.

## Secuencia de vuelta del owner

🔒 = no delegable (owner). Cada fila enlaza lo ya escrito; este plan no lo copia (LIM-5).

| # | Qué | Quién | Fuente (no se duplica aquí) |
|---|---|---|---|
| 1.1 | 🔒 Publicar #8 desde `26f2676` (G2): runbook pasos 0-11, comisión 200 bps antes de cualquier partida, smoke crear/cancelar con `min_bet`, entrega de los dos archivos sin editar + 4 digests + custodia "sí ×3" | owner | `git show 26f2676:contracts/README.md`, "Uso en testnet (solo el owner)"; D-20261103-01 |
| 1.2 | G3: commit de `testnet.json` + `Published.toml` tal cual, en un commit propio | orquestador | Handoff de #8, "Secuencia y puertas" |
| 1.3 | Merge de `master` **en** la branch de #8 (merge commit; nunca rebase ni squash: `sourceCommit` = `26f2676` tiene que seguir en `master`, runbook paso 12). Conflictos esperables en `agents.md`, `contracts/README.md`, `documents/STATUS.md` y `documents/DECISIONES.md` (R-1) | orquestador | D-20261030-09 |
| 1.4 | TASK-5 de #8: verificación por lecturas gRPC públicas (Parte B, B0-B11). Con `master` adentro, el job `deploy-image` del PR corre por el camino **positivo** con los IDs reales | DEV | `git show 26f2676:documents/SMOKE_TESTNET_PUBLISH.md`, Parte B |
| 1.5 | TASK-6 de #8 (docs post-publicación), revisión del MAYOR publicada en el PR y merge con housekeeping | DEV, MAYOR, orquestador | Handoff de #8, TASK-6 |
| 1.6 | 🔒 **N-3, custodia del cap** (después de B5 de #8, que exige el cap en la dirección publicadora): `transfer_house_cap` por CLI a la cuenta A de la wallet del navegador, o importar la publicadora | owner | `contracts/README.md`, "Qué pasa si se pierde el cap" (checklist) |
| 2 | TASK-6 de #15: imagen a Node 26.13.0 (re-verificar el digest), `check-deploy-image.sh . 8090` en modo **positivo** (P1-P13) con los IDs reales, E-6 con la app real en Chrome headless sin wallet, y los 🔵 de la revisión del MAYOR de PR #57: (1) sin ID de run en `app/README.md:208`; (2) `:222` "TASK-3 de #15 (si no corrió)" ya no aplica; (3) **N2b anclado a la cabecera del paso** (`^#[0-9]+ \[build [0-9]+/[0-9]+\] RUN npm ci` / `^Step [0-9]+/[0-9]+ : RUN npm ci`) en `app/scripts/check-deploy-image.sh:101`; (4) fila "Siguiente" de STATUS. PR con `Refs #15` (P-2) | DEV, MID, MAYOR, orquestador | `documents/HANDOFF_RAILWAY_DEPLOY.md`, TASK-6; revisión de PR #57 |
| 3 | 🔒 Conectar Railway con el checklist (pasos 1-10), generar el dominio (paso 7), smoke B con su wallet (paso 9) y dejar registrada la preautorización de merges (N-2 de #15) | owner | `app/README.md`, "Conectar Railway (owner, no delegable)" |
| 4 | TASK-5 de #16: URL, enlace a `testnet.json` (sin copiar IDs), quitar "(PR #48)", roadmap, y el 🔵 de `README.md:74` (la línea de `.github/workflows/` omite `deploy-image` y `framework-drift`). Por P-2, el mismo PR lleva la URL de `app/README.md`, el registro del smoke B de #15 y cierra #15 y #16 | DEV, MID, MAYOR, orquestador | `documents/HANDOFF_README.md`, TASK-5; revisión de PR #62 |
| 5 | #17: TASK-3 a TASK-6 de este plan | DEV, owner, MID, MAYOR, orquestador | este plan |

**No delegable en toda la secuencia:** publicar (1.1), la custodia del cap (1.6), conectar Railway y cada publicación del
sitio (3), firmar con wallets y fondear las cuentas (5), el tag de release (N-5). La revisión de las decisiones tomadas
por delegación (D-20261104-02..04) también queda para el owner (STATUS, "Pendientes del usuario").

**Watch paths (N-2 de #15):** los PRs de #17 tocan solo `documents/`, `README.md` y `app/README.md` (excluido con
`!app/README.md`): ninguno publica el sitio. El de TASK-6 de #15 sí (cambia el `Dockerfile`), pero se mergea antes de
conectar Railway.

## Pasos del smoke

**Cuentas** (nunca por dirección, "Notas de implementación" del issue): **A** crea y tiene el `HouseCap` (recomendado, N-3); **B** acepta y es el
invitado; **C** es una tercera cuenta que solo mira. El agente las reconoce sin conocer las direcciones (modelo de #8,
B3/B5): `A` = `sender` del crear del paso 1, `B` = `sender` del aceptar del paso 1, `CAP` = dueño de `houseCapId`. Viven en
variables de la sonda y solo se imprimen comparaciones (`true`/`false`).

**Qué entrega el owner en cada paso:** los digests (públicos), en el orden de la tabla, y los textos que vio en la app
copiados como texto. Nada de capturas de la wallet, direcciones completas ni frases.

**Cómo verifica el agente:** sonda gRPC de solo lectura (DL-2) contra `https://fullnode.testnet.sui.io:443` y Chrome
headless sin wallet sobre la URL pública. El explorador (Suiscan) es solo un cruce humano; la evidencia es la sonda.

### Paso 0 — Precondiciones (DEV, solo lecturas; owner: dos datos)

| # | Quién | Acción | Resultado esperado |
|---|---|---|---|
| 0.1 | DEV | `master` con `testnet.json`, `Published.toml` y TASK-5 de #16 mergeados; `node scripts/publish.mjs check` | `1 despliegue(s) válidos y coherentes con Published.toml`; SHA de `master` = `M` anotado |
| 0.2 | owner + DEV | El owner informa el commit del deploy activo en Railway; el DEV baja `index.html` y el `index-*.js` de la URL con `curl` | commit del deploy = `M`; el JS contiene `packageId`, `houseId` y `publishTxDigest` de `testnet.json`; `curl -sS -o /dev/null -w '%{http_code}' <URL>` 2xx |
| 0.3 | DEV | Sonda: `getServiceInfo` | chain id `4c78adac` |
| 0.4 | DEV | Sonda: `getObject(houseId)` | `Shared`; `fee_rate` 200, `min_bet` 1 000 000, `max_bet` 50 000 000 000, `version` 1; `fees_collected` = `F0` anotado (esperado 0: el smoke de #8 solo crea y cancela) |
| 0.5 | DEV | Sonda: dueño de `houseCapId` → `CAP`; si hubo `transfer_house_cap` (N-3), su `HouseCapTransferred` | `AddressOwner`; con transferencia, `recipient == CAP` → `true` |
| 0.6 | DEV | Sonda: `ledgerService.listEvents` crudo de `GameCreated` y `GameResolved` del paquete desde la publicación | lista base de partidas ajenas (anotada por `game_id` abreviado y `fee_rate`); no hace NO PASA |
| 0.7 | owner | Wallet de extensión en testnet con A, B y C fondeadas | "sí"; saldos aproximados sin direcciones |

### Pasos 1-5 (criterios del issue)

| # | Firma (owner) | Entrega | Verificación del agente (sonda / headless) | Resultado esperado |
|---|---|---|---|---|
| 1a | A crea una partida **abierta** de 0,1 SUI desde la URL | digest `d1c`; texto "Partida creada" y la estimación "pozo · comisión · al ganador" | `getTransaction(d1c)` con efectos, eventos y `balanceChanges`; `A := sender` | `success`; `GameCreated` `bet` 100 000 000, `opponent` none, `fee_rate` 200, `creator == A`; `Δ(A) = −bet − gas(d1c)`; `G1` anotado (abreviado) |
| 1b | — (B y C miran el lobby) | "B ve G1 en el lobby": sí/no | headless: `#/` lista G1 | G1 en el lobby mientras está `Pending` |
| 1c | B la acepta desde el lobby/detalle | digest `d1a`; texto del resultado ("¡Ganaste!…" o "Perdiste…") visto por B; qué ve A en `#/game/<G1>` ("Resultado para ti") | `getTransaction(d1a)`; `B := sender`; `getObject(G1)`; datos de la transacción (`gasBudget`, comandos) | `success`; `B ≠ A`; `GameResolved` con `game_id == G1`, `creator == A`, `acceptor == B`, `winner ∈ {A, B}`, `pot` 200 000 000, `fee` 4 000 000, `payout` 196 000 000; balances de la tabla de fondos según `winner`; `G1` `Resolved { B, winner }`, `stake` 0; el `MoveCall` de `accept_game` es el último salvo `TransferObjects`/`MergeCoins`; los textos de A y B coinciden con `winner` |
| 1d | — | — | sonda: `gasBudget` de `d1a` contra `ACCEPT_GAS_RESERVE_MIST` (10 000 000, `app/README.md:582-589`) | `gasBudget ≤ 10 000 000`; si no, issue `type:bug` (la cortesía deja pasar un saldo que la wallet rechaza) |
| 2a | A crea una **invitación** a B, de 0,100000001 SUI | digest `d2c`; el aviso "Comparte el enlace…" | `getTransaction(d2c)` | `success`; `sender == A`; `GameCreated.opponent == B` → `true`; `bet` 100 000 001, `fee_rate` 200; `G2` no aparece en el lobby (headless) |
| 2b | — (C abre `#/game/<G2>` por URL con su cuenta conectada) | texto que ve C | — (C no firma) | "Esta invitación es para otra dirección." **sin** botón "Aceptar" (P-1, D-20261103-02); el texto es el de `game`/5 |
| 2c | — (B abre "Mis partidas") | "B ve G2 en «Invitaciones recibidas»": sí/no, con "Aceptar" y "Rechazar" | — | G2 en "Invitaciones recibidas" de B |
| 2d | B la acepta desde la fila de "Mis partidas" | digest `d2a`; texto del resultado | `getTransaction(d2a)`; `getObject(G2)` | `success`; `sender == B == opponent`; `pot` 200 000 002, `fee` 4 000 000, `payout` 196 000 002; balances exactos; `G2` `Resolved`, `stake` 0; `previousTransaction(G2) == d2a` (ninguna transacción de C tocó G2) |
| 3a | A crea una abierta de 0,001 SUI | digest `d3c` | `getTransaction(d3c)` | `success`, `sender == A`, `bet` 1 000 000 |
| 3b | A pulsa "Cancelar" y **rechaza** en la wallet (R-1 de #11) | texto de la app | `getObject(G3)` | "La wallet no completó la operación…" sin digest; `G3` sigue `Pending` y `previousTransaction(G3) == d3c` |
| 3c | A cancela de verdad | digest `d3x`; texto con el reembolso | `getTransaction(d3x)`; `getObject(G3)` | `success`; `GameCancelled` `refund` 1 000 000, `cancelled_by == creator == A`; `Δ(A, d3x) = +1 000 000 − gas(d3x)`; `G3` `Cancelled`, `stake` 0; `Δ(A, d3c) + Δ(A, d3x) = −gas(d3c) − gas(d3x)` (reembolso íntegro); la House no está entre los inputs de `d3x` |
| 4a | — (A, con el cap, abre `#/admin`) | "Comisiones acumuladas" que muestra el panel | sonda: `getObject(houseId)`; `GameResolved` desde 0.6 | `fees_collected = F0 + 4 000 000 + 4 000 000 + Σ fee ajenas` (P-3); con `F0 = 0` y sin ajenas, 8 000 000 MIST = 0,008 SUI, igual al panel |
| 4b | A pulsa "Retirar <monto> SUI a tu cuenta" | digest `d4w`; texto del resultado; qué mostró la wallet | `getTransaction(d4w)` | `success`; `sender == CAP == A`; dos comandos: `MoveCall house::withdraw_fees` + `TransferObjects` a `sender`; `FeesWithdrawn.amount` = valor de 4a; `Δ(A, d4w) = +amount − gas(d4w)`; House con `fees_collected` 0 después; el botón queda deshabilitado con "No hay comisiones para retirar." |
| 5a | — | badge visto por el owner con la wallet conectada | headless: `#/` | "testnet · nodo OK" en los dos |
| 5b | — (el owner abre los enlaces de digest de 1c, 2d, 3c y 4b, y "Ver en el explorador" de G1) | "abre Suiscan testnet con ese digest/objeto": sí/no por enlace | headless: `href` de "Ver en el explorador" en `#/game/<G1>` | `https://suiscan.xyz/testnet/tx/<digest>` y `…/object/<id>` (`app/src/sui/explorer.ts`), con el mismo valor |
| 5c | — (el owner recarga `#/game/<G1>`, `#/my-games` y `#/admin` con la wallet) | "OK" por ruta | headless: recarga de las tres rutas sin wallet | con wallet, la misma vista; sin wallet, `#/game/<G1>` "Resuelta", `#/my-games` "Conecta tu wallet para ver tus partidas e invitaciones", `#/admin` "Conecta la wallet que tiene el HouseCap para administrar la House"; consola sin errores ni violaciones de CSP (las cabeceras ya las cubre el smoke B de #15: no se repiten) |

**Conservación del recorrido** (la sonda la imprime al final): sobre todas las transacciones de A y B de los pasos 1-4,
`Σ Δ(A) + Σ Δ(B) = −Σ gas + (amount − 8 000 000)`; con `F0 = 0` y sin ajenas, `−Σ gas`.

### Panel de la House (checklist heredada de #14) — después del paso 4 (DL-3)

| # | Firma (owner) | Entrega | Verificación del agente | Resultado esperado |
|---|---|---|---|---|
| H1 | — (A abre la app) | textos vistos | — | "Administrar House" en el encabezado; `#/admin` con comisión 200 bps, límites 0,001/50, lo acumulado y versión 1. "Volver a comprobar" usado: n veces (si dice "Sin permisos" justo después de recibir el cap) |
| H2 | A cambia la comisión a 201 bps | digest `dh1`; resumen "De 200 bps (…) a 201 bps (…)" y "Comisión actualizada: …" | `getTransaction(dh1)` | `sender == CAP`; `FeeRateUpdated` 200 → 201 |
| H3 | A la restaura a 200, **sin anunciar nada entre H2 y H3** | digest `dh2` | `getTransaction(dh2)`; `GameCreated` entre los checkpoints de `dh1` y `dh2` | `FeeRateUpdated` 201 → 200; ninguna partida con `fee_rate` 201 (si un tercero creó una, se anota y no hace NO PASA) |
| H4 | A cambia los límites a 0,002/10 y los restaura a 0,001/50 | digests `dh3`, `dh4`; resúmenes "De … SUI a … SUI" y "Límites actualizados: …"; campos y botón tras cada uno | `getTransaction` de los dos | `BetLimitsUpdated` 1 000 000/50 000 000 000 → 2 000 000/10 000 000 000 → de vuelta; tras cada cambio los campos muestran lo nuevo y el botón queda deshabilitado (TASK-5b de #14) |
| H5 | — | lo que mostró la ventana de la wallet en H2-H4 y en 4b | sonda: comandos de cada transacción | la transacción esperada en cada acción; en el retiro, `withdraw_fees` y la transferencia a la misma cuenta que firma (4b) |
| H6 | — (B o C abre la app) | textos vistos | — | sin "Administrar House"; `#/admin` "Sin permisos: esta cuenta no tiene el HouseCap de esta House." |
| H7 | — | — | sonda: `getObject(houseId)` | estado final = el de 0.4 salvo `fees_collected` 0: `fee_rate` 200, 0,001/50, versión 1 |

### Heredado de #12 y #13 (comentarios de cierre en #17)

| # | Qué | Quién | Criterio |
|---|---|---|---|
| O-1 | Cambio de cuenta a mitad de una transacción (RM-8, RM-9; MINOR-1 de #12): con la ventana de la wallet abierta para el crear de 3a (o una acción descartable), cambiar la cuenta activa a B | owner; DEV verifica el digest si lo hubo | **Paso con PASA/NO PASA:** fallo sin digest ("La wallet no completó…") o firma de la cuenta capturada; nunca un éxito mostrado para B. Si hubo digest, `sender == A` |
| O-2 | Vista previa de la wallet al aceptar (`Random`) y el texto de error si falla | owner | observación; la nota de la app (DL-5 de #12) está presente |
| O-3 | Latencias: clic → resultado y "Actualizando datos…" (RM-12), en 1c, 2d, 3c y 4b | owner, aproximadas | observación, contra 0,6-1,5 s y 1,5-2,4 s de localnet |
| O-4 | R-3: si una aceptación se cancela por falta de aleatoriedad, su `description` real | DEV (sonda, `effects.status`) | observación; solo si ocurre. La app no la muestra como éxito ni como error del contrato |
| O-5 | "Mis partidas": texto de la cota ("desde <fecha>" solo con la cota en el piso del nodo; con la cota en la publicación, sin sufijo) y enlace "Ver tu historial completo en el explorador" | owner | observación; el enlace abre `https://suiscan.xyz/testnet/account/<la cuenta>` |
| O-6 | Caso del creador (partida creada antes de la ventana de ~14,6 días) | — | **no aplica en esta corrida**: el paquete tiene horas. Cubierto por tests y por #51 (DL-6) |

## Rol de los agentes

- **Ningún agente firma ni tiene claves.** Nada contra testnet salvo lecturas públicas: `getServiceInfo`, `getObject`,
  `getTransaction`, `ledgerService.listEvents` y lecturas de saldo. **Ni simulaciones** (`simulateTransaction`): no hacen
  falta y la regla queda simple (DL-2). Ningún `sui client` fuera de la localnet aislada (`agents.md` §3, B4).
- **Navegador:** solo Chrome headless con perfil desechable (`agents.md` §3, paso 6, 🌐), sin wallet y sin extensiones. Una
  wallet real la usa solo el owner, en su navegador.
- **Sonda (DL-2):** replica TASK-5 de #8 (`git show 26f2676:documents/HANDOFF_TESTNET_PUBLISH.md`, §3.2): vive en
  `<scratchpad>`, no se commitea, se corre por stdin con cwd `<repo>/app`; imprime solo booleanos, IDs abreviados,
  digests, checkpoints y montos; `A`/`B`/`CAP` solo en comparaciones; errores solo con `error.message` revisado. Las listas
  por eventos usan el crudo `ledgerService.listEvents` con `startCheckpoint`: el `listEvents` del SDK falla con
  `OUT_OF_RANGE` en el fullnode público (`contracts/README.md`, "Lectura desde la app", Listas).
- **En `SMOKE_MVP.md`:** digests completos (base58, públicos), IDs de objeto abreviados `0x1234…abcd` (DL-5), ninguna
  dirección. Lo que vio el owner va citado como "owner:".
- **Roles:** el DEV corre la sonda y el headless y llena el smoke; el orquestador pasa los digests y textos del owner al DEV
  tal cual; el MID revisa cada bloque; el MAYOR hace la revisión de integración con el smoke en verde.

## Bugs y re-corridas

- Todo paso en rojo: fila ❌ con la evidencia (paso, digest, salida de la sonda o texto). El MID redacta el issue
  (`type:bug` + `area:` + prioridad, "Encontrado en #17, paso N", esperado vs obtenido) y el orquestador lo crea y lo
  enlaza en la fila y en un comentario de #17.
- La corrección va en su issue (fuera de alcance de #17). Tras su merge (y el redeploy, que publica el owner), se repite
  el paso y lo que dependa de él en una fila nueva `N.r1`; la fila roja queda como historia.
- Un cambio de contrato es STOP no delegable (N-6): upgrade compatible o republicación (D-20261103-01 (2)). Con una
  republicación, el smoke se repite entero sobre el `testnet.json` nuevo.
- El MVP **no se cierra** con un paso en rojo ni con un `N.r1` pendiente. Las observaciones (O-2..O-5) no ponen rojo; si
  sugieren una mejora, van a un issue post-MVP (`type:feature`/`type:refactor`), no a `type:bug` (DL-7).

## Cierre del MVP

1. **`documents/STATUS.md`** (TASK-5): MVP cerrado con fecha y el SHA `M` de `master` sobre el que corrió el smoke (el
   deployado en Railway; DL-8); roadmap con el estado real ("Docs y despliegue" ✅, filas de #8, #15, #16 y #17); "Ciclo
   activo" y "Siguiente" con lo post-MVP (#18, #35, #51, #53, #54, #56, #58, #60 y los issues que abra la corrida);
   "Pendientes del usuario" al día (decisiones por delegación a revisar, tag, N-2, preautorización de merges); y que con
   #17 vence D-20261103-01 (2).
2. **`README.md`**, roadmap: #17 "Hecho" y la fecha del corte (R-1 de #16: "TASK-5 y #17 lo refrescan").
3. **`app/README.md`**: los ítems que remiten a #17 (`:464`, `:589`, `:882-893`) pasan a lo medido en la corrida (O-1..O-4,
   1d) o se quitan (PROY-20).
4. **Housekeeping §9** (orquestador, al mergear, en un PR propio): `git rm` de `PLAN_`, `HANDOFF_`, `SMOKE_` y
   `REPORTES_SMOKE_MVP.md`, y de los ciclos de #15 (`*_RAILWAY_DEPLOY.md`) y #16 (`*_README.md`) **si siguen activos**;
   STATUS con la fila de #17 y el SHA de merge en "Mergeadas" (y los de #15/#16 si los cierra este housekeeping). Los docs
   de #8 los borra el housekeeping de #8.
5. **Tag** `v0.1.0` + GitHub Release: N-5, del owner.

## Decisiones del MID (actuar y reportar)

> Decisión (2026-11-04) DL-1: `SMOKE_MVP.md` nace al empezar TASK-4, desde la plantilla del handoff, con las columnas de
> resultado vacías, sobre crear el archivo ya, porque el issue prohíbe completarlo por adelantado y así ningún valor
> previo (IDs, URL, montos medidos) puede colarse.

> Decisión (2026-11-04) DL-2: la verificación es una sonda gRPC de solo lectura en `<scratchpad>` (modelo de TASK-5 de #8),
> ensayada antes en la localnet aislada (TASK-2), sobre un script commiteado, porque su uso es de una corrida (LIM-3) y
> así el repo y la CI no cambian. Sin simulaciones contra testnet.

> Decisión (2026-11-04) DL-3: la checklist del panel (comisión y límites) va **después** del retiro del paso 4, sobre
> intercalarla, para que las partidas de los pasos 1-2 se creen con 200 bps y ninguna nazca con la comisión intermedia
> (D-20261030-06 §3).

> Decisión (2026-11-04) DL-4: montos de 0,1 SUI, 0,100000001 SUI (prueba el redondeo hacia abajo) y `min_bet`, sobre montos
> redondos, porque el paso 2 ejerce D-20261030-16 D2 con dinero real a un costo mínimo.

> Decisión (2026-11-04) DL-5: en el smoke, IDs de objeto abreviados y digests completos, porque un ID de 64 hex no se
> distingue a simple vista de una dirección y el digest ya los da completos.

> Decisión (2026-11-04) DL-6: el caso del creador de D-20261103-03 no aplica en esta corrida (el paquete tiene horas) y se
> declara así, sin fila roja.

> Decisión (2026-11-04) DL-7: solo los pasos con criterio PASA/NO PASA abren `type:bug`; las observaciones medidas no.

> Decisión (2026-11-04) DL-8: el SHA de cierre en STATUS es el de `master` deployado y probado (`M`); el merge del PR de
> #17 se anota en el housekeeping, porque un PR no puede contener su propio SHA de merge.

## Decisiones abiertas → STOP

### Delegables (producto; por D-20261104-01 las toma el orquestador con la recomendación)

**P-1. "C intenta aceptar" en el paso 2 frente a D-20261103-02.** El issue pide que C "intenta aceptar → mensaje de error
mapeado", pero desde #12 una invitación ajena no muestra "Aceptar" (`app/README.md:575-578`).
- (a) Aplicar la reinterpretación de D-20261103-02, que ya resolvió el mismo criterio en #12: C ve "Esta invitación es
  para otra dirección." (el texto de `game`/5) sin botón, y `game`/5 queda cubierto por la fixture real y sus tests.
- (b) El owner fuerza `game`/5 por CLI con la clave de C: transacción fallida ejecutada (gas) y la clave de C en una
  config de CLI.
- (c) Que un agente simule el `accept_game` de C por gRPC: sale de "solo lecturas" y no aporta sobre la fixture.
- **Recomendación: (a).** No reabre una decisión registrada y no expone claves. En rigor ya está decidido por
  D-20261103-02; se registra para que el owner lo vea.

**P-2. Dónde se cierra #15.** TASK-6 de #15 incluye la URL (`documents/HANDOFF_RAILWAY_DEPLOY.md`, TASK-6), pero el
checklist exige TASK-6 en PASA y `deploy-image` positivo en `master` **antes** de conectar Railway, que es lo que crea la
URL (`app/README.md:221-223`).
- (a) TASK-6 de #15 sale con `Refs #15` (Node, camino positivo, E-6 y los 🔵). La URL de `app/README.md`, el registro del
  smoke B y `Closes #15` van en el PR de TASK-5 de #16, que también lleva `Closes #16`.
- (b) Un PR propio de cierre de #15 después del dominio, aparte del de #16.
- (c) Dejar el PR de TASK-6 abierto hasta tener la URL: contradice la precondición del checklist.
- **Recomendación: (a).** Un PR de docs menos, ninguno toca watch paths y la URL entra a los dos READMEs a la vez.

**P-3. Comisiones ajenas en el paso 4.** La House es pública: un tercero puede resolver partidas entre la publicación y
el retiro. Así, `fees_collected` podría no ser solo la suma de los pasos 1-2.
- (a) El criterio es `fees_collected = F0 + fee₁ + fee₂ + Σ fee` de los `GameResolved` ajenos de la ventana, listados por
  evento; los ajenos se anotan y no hacen NO PASA. El retiro saca el total.
- (b) Igualdad estricta con `fee₁ + fee₂`: un tercero puede poner el paso en rojo sin bug.
- **Recomendación: (a).** Sigue la regla s-4 de #8 para partidas ajenas.

### No delegables (owner)

- **N-1. Publicación de #8** (G2) y cualquier republicación: autorizada para la primera por D-20261103-01; la ejecuta el
  owner con su `SUI_CONFIG_DIR`.
- **N-2. Railway:** conectar el servicio, el dominio, cada publicación del sitio, la preautorización de merges con CI
  verde, el check requerido `deploy-image` y el rollback (D-20261104-03).
- **N-3. Custodia del `HouseCap`** (heredada de #14). (a) `transfer_house_cap` por CLI a la cuenta A de la wallet del
  navegador, con el checklist de `contracts/README.md`, y **después** de B5 de #8; (b) importar la clave publicadora en la
  wallet (expone el `UpgradeCap` y el `Publisher` a la extensión). Recomendación del MID: (a). Es irreversible si se
  equivoca el destino.
- **N-4. Firmas y fondos:** fondear A/B/C desde el faucet y firmar cada paso.
- **N-5. Tag de release** (decisión abierta del issue). (a) `v0.1.0` + GitHub Release con notas al cerrar, sobre el merge
  del PR de #17; (b) no etiquetar. Recomendación: (a). Lo decide y lo ejecuta el owner; si elige (a), el MID redacta las
  notas para el owner.
- **N-6. Cambio de contrato** que pida un paso en rojo: upgrade compatible o republicación (PROY-10, D-20261103-01 (2)).

## Tasks (ordenados por dependencia)

### Ya, antes de #8

#### TASK-1: handoff y plantilla del smoke — área: docs (MID)
- **Entregable:** `documents/HANDOFF_SMOKE_MVP.md` v1 con las decisiones, la especificación de la sonda (entradas: digests
  por paso; salidas: los checks de cada fila) y, como anexo, la plantilla de `SMOKE_MVP.md` (formato M5) con todas las filas
  de este plan y las columnas de resultado vacías.
- **Criterio:** MAYOR aprueba el plan y el handoff; ninguna fila con un resultado; grep de higiene limpio.

#### TASK-2: ensayo de la sonda en la localnet aislada — área: docs (smoke de ensayo, DEV)
- **Entregable:** la sonda en `<scratchpad>`, ensayada contra un recorrido equivalente por CLI en la localnet aislada
  (`agents.md` §3: génesis con A, B, C y la publicación variante A; cap en A; comisión 200; pasos 1-4 con los montos de este
  plan, H2-H4 y un `transfer_house_cap` para 0.5). El texto final de la sonda va al handoff v1.1.
- **Qué confirma:** que `getTransaction` del SDK 2.37 devuelve `balanceChanges` (si no, el handoff define derivarlo de
  `effects` y de los eventos), que cada igualdad de la tabla de fondos da exacta, que la sonda no imprime direcciones (grep
  de hex de 64 sobre su salida = solo IDs de objeto) y el gas de referencia en localnet.
- **Resultados:** en `documents/REPORTES_SMOKE_MVP.md`, nunca en `SMOKE_MVP.md`. Cierre M-7 limpio.
- **Riesgo:** la localnet aislada es un recurso único (un DEV a la vez): si la usa otro ciclo, TASK-2 espera.

### Después de #8, del TASK-6 de #15, de Railway y del TASK-5 de #16

#### TASK-3: precondiciones públicas (paso 0) — área: docs (DEV, solo lecturas)
- **Precondición:** la branch de #17 con `master` `M` mergeado adentro (orquestador).
- **Entregable:** `SMOKE_MVP.md` creado desde la plantilla, con las Precondiciones y el paso 0 llenos.
- **Criterio:** 0.1-0.7 en verde; si alguno falla, no se le pide al owner que firme nada.

#### TASK-4: la corrida — área: docs (owner firma, DEV verifica)
- **Entregable:** `SMOKE_MVP.md` con los pasos 1-5, H1-H7 y O-1..O-6 llenos durante la corrida, bloque por bloque (el owner
  firma un bloque y entrega; el DEV verifica y registra; el MID revisa antes del bloque siguiente).
- **Criterio:** todos los pasos con criterio en ✅; conservación del recorrido exacta; issues `type:bug` creados y
  enlazados para cada ❌; "Reporte final" con PASA/TOTAL y veredicto.

#### TASK-5: cierre del MVP en los docs — área: docs (DEV)
- **Entregable:** STATUS, roadmap del `README.md` y `app/README.md` según "Cierre del MVP" (1-3).
- **Criterio:** MVP cerrado con fecha y `M`; ninguna referencia viva a "#17" pendiente en `app/README.md`; grep de higiene
  limpio.

#### TASK-6: PR, revisión y housekeeping — área: docs (MID, MAYOR, orquestador)
- **Entregable:** body del PR con `Closes #17`, la tabla de commits, el veredicto del smoke, los issues abiertos, lo que
  vence (D-20261103-01 (2)) y los pendientes del owner (N-5); revisión del MAYOR publicada con `gh pr review --comment`
  antes del merge; housekeeping "Cierre del MVP" (4).
- **Criterio:** CI verde, 0 BLOCKER/MAJOR, ningún STOP sin decidir; el owner decide N-5 después.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | La branch de #8 tiene 76 commits menos que `master`: el merge trae conflictos en docs | Paso 1.3 de la secuencia: merge (nunca rebase) después de G3 y antes de TASK-5 de #8, para que sus gates midan el árbol real |
| R-2 | N-3 hecho antes de B5 de #8 pone B5 en rojo | La secuencia pone N-3 en 1.6, después de TASK-5 de #8 |
| R-3 | Un tercero crea o resuelve partidas durante la corrida | P-3 y H3: se anotan por evento y no hacen NO PASA |
| R-4 | Cancelación del runtime en un aceptar (aleatoriedad, congestión) | No es rojo: se reintenta con el mismo botón y se anota (O-4) |
| R-5 | La wallet elige un `gasBudget` mayor que la reserva de 0,01 SUI | 1d lo mide; si pasa, `type:bug` |
| R-6 | El faucet limita los pedidos | Montos chicos (DL-4); C no necesita fondos en el camino recomendado |
| R-7 | Bug que exige republicar | N-6; el smoke se repite entero sobre el `testnet.json` nuevo |

**Smoke de este plan:** es el propio issue. TASK-2 es su ensayo en localnet.
