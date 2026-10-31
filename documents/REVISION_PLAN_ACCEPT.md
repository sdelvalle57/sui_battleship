## Veredicto: REQUIERE CAMBIOS (1 🔴 en el procedimiento del smoke de TASK-3, 2 🟠 en el contrato/tests; diseño on-chain sólido)

> Revisión MAYOR · 2026-10-30 · branch `feature/issue-6-accept` @ `b7ab390` (sin commits propios) · artefacto:
> `documents/PLAN_ACCEPT.md` **v1** (sin trackear, 584 líneas) · Ronda 1 (no hay hallazgos previos).
> Contrastado con `agents.md`, `documents/{STATUS,DECISIONES,ESTANDARES,FLUJO_AGENTES}.md`, `contracts/README.md`,
> `contracts/sources/{house,game}.move`, `contracts/tests/*.move`, issue #6 (+ comentarios) y fuentes de Sui
> descargadas con `gh api` (framework `@719fb29` = `719fb2960ccfbf9f4d33041f8ea5146d30671696`, CLI `@testnet-v1.83.0`).
> Nota: `documents/DECISIONES.md` tiene en el árbol (sin commitear) **D-20261030-16** con D2-D6 = (a) aprobadas por el
> usuario; el plan v1 aún las da por "pendientes" (ver m1).

### Resumen

El contrato está bien diseñado: `entry` no `public` con `&Random`, generador interno, sorteo por índice sin ramas,
`u128`, floor, `add_fees` siempre, conservación y orden de aborts coherentes con #5; verificado contra el framework.
Lo que impide aprobar: (1) el aislamiento del smoke depende de `export` que el harness del DEV **no** conserva entre
llamadas → riesgo real de crear una clave en `~/.sui/`; (2) `house::EWrongVersion` aborta **después** del sorteo pese a
que el plan afirma lo contrario; (3) ningún test demuestra que el `u128` es necesario.

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| B1 | 🔴 BLOCKER | SEG-3, D-20261030-07 | `PLAN_ACCEPT.md:472-492, 504, 546-547` (TASK-3, aislamiento) | El aislamiento es "`export TMPDIR=… SUI_CONFIG_DIR=…` antes de `sui start` y en cada terminal". En el harness del DEV **cada llamada a Bash es un shell nuevo: las variables no persisten**, y `sui start` va en segundo plano (otra invocación). | El DEV exporta en una llamada y en la siguiente corre `printf 'n\n' \| sui client new-address ed25519 alice --json \| jq …`: sin `SUI_CONFIG_DIR`, `sui_config_dir()` cae en `~/.sui/sui_config` (`crates/sui-config/src/lib.rs:45-59` @v1.83.0). Como ese `client.yaml` existe (D-07), no hay prompt y **la clave se escribe en el keystore de `~/.sui`** (el que el owner usará en #8), `faucet` apunta a testnet, y `sui start --force-regenesis` reescribe ese `client.yaml` (`sui_commands.rs:1271-1273` → `update_wallet_config_rpc` → `config.save()`, `:1921-1940`). El `stat` de antes/después solo lo detecta cuando el daño ya está hecho, y un agente no puede repararlo. | (1) TASK-3 crea `"$SMOKE_DIR/env.sh"` (ruta **absoluta literal**) con `export SUI_CONFIG_DIR=… TMPDIR=…` y una guarda: `[ "$SUI_CONFIG_DIR" = "<SMOKE_DIR>/sui_config" ] && [ -f "$SUI_CONFIG_DIR/client.yaml" ] \|\| { echo GUARD-FAIL; exit 97; }`. (2) **Toda** llamada a Bash que invoque `sui` empieza con `. <SMOKE_DIR>/env.sh &&` en la **misma** línea; `sui start` se lanza en segundo plano con el env en esa misma orden. (3) Antes de cada `new-address`/`faucet`/`test-publish`, en la misma invocación: `printf 'n\n' \| sui client active-env` = `localnet` o se aborta. (4) El handoff de TASK-3 lo dice textualmente ("las variables NO persisten entre llamadas") y el `SMOKE_ACCEPT.md` lo repite en Precondiciones. Opcional y recomendable: `HOME` aislado en `env.sh` como segunda barrera (llamando a `sui` por ruta absoluta `~/.local/bin/sui` resuelta antes). |
| M1 | 🟠 MAJOR | SEG-5, coherencia del contrato (D5) | `:98-99` vs `:114`; modelo `:154-159, 172-204`; test 47 `:410-412` | El plan afirma "Todas ocurren **antes** del sorteo" (`:114`), pero `house::EWrongVersion` sale de `add_fees`, que el modelo llama **después** de `new_generator` (`:157-159` → `:191`). Hoy no es explotable (aborta igual con ambos resultados), pero la propiedad central de SEG-5 ("después del sorteo nada puede abortar") queda accidental, no diseñada, y el README documentaría un orden falso. Y la comisión **no depende** del resultado: se puede cobrar antes. | Un cambio futuro (p. ej. una v2 que condicione `add_fees` o agregue un chequeo en `settle`) introduce un abort tras el sorteo dependiente del resultado sin que nada lo marque como violación; el README le dice a #11 que todo aborto es previo al sorteo cuando no lo es. | Reestructurar: `assert_acceptable` → **cobro** (`withdraw_all` + `join` + `split(fee)` + `house.add_fees(fee)`, siempre, también con 0) → `new_generator` + `generate_u8_in_range(0, 1)` → **pago** (índice en `[creador, aceptante]`, `state = Resolved`, `GameResolved`, `public_transfer`). Tras el sorteo solo quedan operaciones que no abortan. Orden documentado: versión → House → authZ → estado → monto → `house::EWrongVersion` (cobro) → sorteo. El wrapper `#[test_only]` recorre las mismas tres piezas sustituyendo solo el índice. Ajustar el comentario del modelo (`:189-190`), el test 47 ("aborta en el cobro, antes del sorteo") y la fila del README. No contradice D-16 (que fija `add_fees` siempre, no su posición); el orquestador lo comunica al usuario como precisión de D5, sin reabrirla. |
| M2 | 🟠 MAJOR | SEG-6, PROY-9 | `:218-221` (justifica el `u128`), test 33 `:391-392` | El único test de "overflow" usa `MAX_BET` por defecto: `pot × fee_rate = 10^11 × 1000 = 10^14`, que **entra en `u64`**. El test pasa igual si el DEV escribe la fórmula en `u64`: no hay evidencia de que la razón declarada del `u128` (un `max_bet` configurado alto) esté cubierta. | Un refactor a `pot * (fee_rate as u64) / 10_000` pasa los 29 tests y aborta en producción con un `max_bet` alto (con `update_bet_limits` no hay techo). | Agregar `test_accept_huge_pot_needs_u128_intermediate`: `update_bet_limits(MIN_BET, 9_000_000_000_000_000_000)`, fee 1000 bps, `bet = 9_000_000_000_000_000_000` (`pot = 18_000_000_000_000_000_000 < u64::MAX`; `pot × 1000 ≈ 1,8 × 10^22` desborda `u64`) → `fee = 1_800_000_000_000_000_000`, `payout = 16_200_000_000_000_000_000`, conservación completa. Mantener el 33 (criterio literal del issue). |
| m1 | 🟡 MINOR | FLUJO §4, DECISIONES | `:9-11, 272-361` | Los STOPs D2-D6 ya están decididos (D-20261030-16, en el árbol). El plan los presenta como pendientes. | El handoff se genera sobre un plan que dice "pendiente" y el DEV duda de qué opción implementar. | v2: cabecera "D2-D6 decididos (D-20261030-16) = (a)"; cada STOP queda como registro de la decisión (sin el "si se elige otra"). |
| m2 | 🟡 MINOR | — (verificación) | `:428-429, 564, 572-573` | El grep `public fun (accept\|settle\|assert_acceptable\|fee_amount)` **coincide** con `public fun accept_with_winner_for_testing` (prefijo `accept`), que el propio plan exige crear (`:224`). El resultado esperado "vacío" es imposible. | El DEV reporta un falso positivo o, peor, se acostumbra a ignorar ese grep. | Regex `'public fun (accept_game\|settle\|assert_acceptable\|fee_amount)\('` y, en el último grep, esperar solo `entry fun accept_game`. |
| m3 | 🟡 MINOR | SEG-5 (evidencia) | paso 12 `:515`; `:68` | "`computationCost` igual en ambos resultados (evidencia de D6)": el costo de cómputo se redondea a pasos de 1000 unidades (`gas_rounding_step = Some(1_000)`, `crates/sui-protocol-config/src/lib.rs:3302` @v1.83.0), así que también saldría igual con la opción (b) (`if`), que difiere en unas pocas instrucciones. No prueba nada. | El smoke "confirma" D6 aunque el código tuviera una rama. | Redactarlo como "consistente con D6"; comparar el `gasUsed` completo (`computationCost`, `storageCost`, `storageRebate`, `nonRefundableStorageFee`) y basar la evidencia de D6 en el código (grep `if (` vacío y la forma del pago). Subir el máximo a 12 partidas (con 8, probabilidad de no ver ambos resultados = 2/2^8 ≈ 0,8 %; con 12 ≈ 0,05 %). |
| m4 | 🟡 MINOR | PROY-9 (orden) | tests 38-55 `:401-420` | Falta fijar ESelfPlay **antes** que ENotInvited: el creador acepta **su propia invitación** (fallan ambas condiciones). El 49 usa una partida cancelada, no una invitación. | Un DEV invierte los asserts 3-4 y ningún test lo detecta. | Agregar `test_accept_by_creator_on_own_invite_reports_self_play` (≥ 31 tests nuevos con M2). |
| m5 | 🟡 MINOR | SEG-4 | tests 35 y 37 `:394-400`; `:380-383` | La conservación "por test" usa `assert_single_coin` y "el perdedor ninguno"; en los tests con varias partidas (35, 37) el creador y el aceptante acumulan varios `Coin` y el patrón no aplica. | El 37 termina sin verificar conservación o falla por contar `Coin`s. | En los tests multipartida: suma de valores de los `Coin<SUI>` del creador + aceptante = Σ`payout`, `fees_collected` = Σ`fee`, cada `Game` con `stake == 0`. |
| m6 | 🟡 MINOR | SEG-3, D-07, FLUJO §6 | `:8, 79-80, 485-491` | El encabezado aplica D-07 "nada de claves por agentes", pero TASK-3 crea 4 claves (más la del faucet de génesis). Lo cubre FLUJO §6 ("direcciones de prueba de la CLI", `FLUJO_AGENTES.md:121`), pero el plan no lo declara como excepción acotada. Además, `… --json \| jq` sin `pipefail` no detecta un fallo, y si `--json` no aplicara, la frase se imprimiría en la transcripción. | Ambigüedad de reglas para el DEV; la frase de recuperación puede llegar a un log del agente. | Declarar la excepción (solo localnet, solo en `$SMOKE_DIR`, nunca leída ni impresa, borrada al cerrar) citando FLUJO §6. Capturar en archivo y filtrar después: `set -o pipefail; … --json > "$SMOKE_DIR/na.json" && jq '{alias,address}' "$SMOKE_DIR/na.json"; rm -f "$SMOKE_DIR/na.json"`. Alternativa sin ninguna frase en stdout (SUGERENCIA): `sui genesis --working-dir "$SMOKE_DIR/net"` crea un `client.yaml` con cuentas financiadas sin imprimir frases (solo `info!` con la ruta del keystore, `sui_commands.rs:1440-1530`), y `sui start --network.config …`. |
| m7 | 🟡 MINOR | SEG-3 | `:504, 492` | No se dice adónde va el log de `sui start` ni cómo se detiene. | Log de génesis volcado a la transcripción; `pkill` amplio mata otra red. | `sui start … > "$SMOKE_DIR/sui-start.log" 2>&1` (nunca se pega entero; solo líneas puntuales si falla), PID en `$SMOKE_DIR/sui.pid` y `kill "$(cat …)"` al cerrar. |
| m8 | 🟡 MINOR | PROY-20 | TASK-2 `:451-454` | `agents.md:74` y `FLUJO_AGENTES.md:121` recomiendan `sui start --with-faucet --force-regenesis` a secas; tal cual, reescribe `~/.sui/sui_config/client.yaml` (B1). | El próximo smoke (#8, #12, #17) repite el riesgo. | TASK-2 agrega el gotcha a `agents.md` §3/§7 (solo con `SUI_CONFIG_DIR`/`TMPDIR` aislados, en la misma invocación) y una línea en `FLUJO_AGENTES.md` §6 (agregar al alcance). |
| m9 | 🟡 MINOR | SEG-10 | `:70, 240-241` | "La transacción se cancela… no ejecuta nada": en los efectos queda `ExecutionStatus::Failure` con `ExecutionCancelledDueToRandomnessUnavailable` (`crates/sui-e2e-tests/tests/randomness_tests.rs:133-144` @v1.83.0). Con `&mut House` caliente también puede llegar `ExecutionCancelledDueToSharedObjectCongestion`. | #12 trata como éxito/no-op algo que es un `Failure`, o muestra la congestión como error del contrato. | README: ambas cancelaciones son `effects.status = failure` con ese `kind`, sin `MoveAbort`; #12 las muestra como "reintentar". |
| m10 | 🟡 MINOR | precisión | `:66` | `public_random` está en `LintLevel::Default` (`linters/mod.rs:172-179` @v1.83.0): también sale en el build sin `--lint` (con `--warnings-are-errors`, error). | — | Corregir la frase. |
| s1 | 🔵 SUGGESTION | — | paso 10 `:513` | El PTB rechazado se arma sobre G1. Si la regla no se aplicara, G1 quedaría resuelta y se rompería la secuencia de fixtures `Pending → Resolved`. | — | Usar una partida descartable (G4). |
| s2 | 🔵 SUGGESTION | — | fixtures `:520-529` | #9/#10 aún no fijan la API de lectura (el README documenta JSON-RPC y gRPC/GraphQL, `contracts/README.md:309-317`). | Fixtures de un formato que #10 no use. | Nombrar por API (`contracts/fixtures/localnet/jsonrpc/…`) y anotar en #10 que el otro formato se captura en su ciclo. |

### Validado como correcto (con evidencia)

- **Generador interno y sin ramas por resultado:** `new_generator(r: &Random, ctx)` con semilla `hmac(random_bytes, fresh_object_address)` (`random.move:143-150` @719fb29). `generate_u8_in_range(0,1)` → `uint_in_range!`: `if (min == max)` depende de constantes; con generador recién creado el buffer está vacío y `derive_next_block` corre siempre; lazo fijo de 9 bytes (`random.move:179-194, 234-252, 275-277`). Mismas instrucciones para ambos resultados.
- **Simetría de gas del pago:** la única diferencia entre resultados es la dirección destino: mismo `Coin` creado (mismo tamaño, owner de tamaño fijo), mismo evento (campos de tamaño fijo), mismo `Resolved { acceptor, winner }`; el aceptante paga el storage del `Coin` aunque gane el creador. Sin `if (` en `game.move` hoy.
- **`entry` no `public` + lint:** `public_random` marca solo `Visibility::Public` con `Random`/`RandomGenerator` (`public_random.rs:25-46`); `entry` privada y `public(package)` no lo disparan.
- **Regla de PTB:** después del primer comando que usa el input `0x8`, solo `TransferObjects`/`MergeCoins` (`transaction.rs:1730-1760` @v1.83.0); mensaje "Commands following a command with Random can only be TransferObjects or MergeCoins" (`error.rs:322-323`). `accept_game` no devuelve nada y el pago se transfiere dentro: ningún comando posterior puede condicionarse al resultado.
- **Helpers de test:** `create_for_testing` y `update_randomness_state_for_testing` exigen `sender == @0x0` (`random.move:43, 96`); primera actualización ronda 0 y luego +1 (`:98-111`); modelo `random_tests.move:14-32`. Las funciones `entry` no `public` son invocables desde `game_tests` (ya lo hacen `create_game`/`cancel_game`).
- **Aleatoriedad en localnet:** `random_beacon = true` fuera de mainnet/testnet (`sui-protocol-config/src/lib.rs:3456-3461`) y en testnet (`:3662-3667`).
- **Fondos:** pozo = `stake` (= `bet`, invariante PROY-8) + pago (= `bet`, `EWrongStake`); `pot ≤ 10^19 < u64::MAX`; `fee_rate ≤ 1000` (invariante de la House copiada al crear, `house.move:100`, `game.move:78`) ⇒ `fee ≤ pot/10`, `split` no falla, `payout ≥ 1,8 × min_bet > 0`; `split(0)` + `add_fees` de un `Balance` 0 válidos (`house.move:150-153`). Si aborta, la PTB revierte entera (incluido el `SplitCoins`). Sin SUI atrapado: el `Game` queda con `stake == 0`.
- **Versionado:** las tres combinaciones (partida vieja / House migrada / código viejo) terminan en `EVersionMismatch` o `house::EWrongVersion`, nunca en una liquidación con reglas cruzadas; cancelar/rechazar siguen libres (D-12 §4). Consistente con `agents.md:160-164` y `contracts/README.md:277-287`.
- **AuthZ y orden:** cualquiera menos el creador; con invitación, solo `opponent`; authZ antes que estado como `cancel_game`/`reject_game` (`game.move:102-118`). Reutilizar 4 y 5 respeta LIM-8 (misma condición). `EWrongHouse` solo es alcanzable en tests (`init` corre una vez por línea de paquete; otra publicación tiene otro tipo `House`). Carreras: el consenso ordena y la segunda falla con `ENotPending` o su error de authZ, conservando el `Coin`.
- **Aislamiento (afirmaciones del MID, correctas):** `sui start --force-regenesis` reescribe el `client.yaml` de `sui_config_dir()` si existe (`sui_commands.rs:1271-1273, 1921-1940`); la red va a `mysten_common::tempdir()` (`tempfile`, respeta `TMPDIR`) y con faucet escribe allí su keystore (`:924-935, 1293-1319`); `NewAddressOutput` incluye `recovery_phrase` (`client_commands.rs:2886-2891`) y el texto plano la imprime (`:2324-2325`); `test-publish --pubfile-path --build-env` existe (`:475-479, 969-1003`); faucet local `127.0.0.1:9123/v2/gas` (`:4554-4572`). Fixtures de `sui_getObject` (tipo, owner, contenido, rebate, tx previa): solo IDs/direcciones de una localnet efímera, sin secretos.
- **Decisiones internas del MID:** `assert_acceptable(…, acceptor: address)` ✔ (una sola lectura de `ctx.sender()`, evita `prefer_mut_tx_context`, `linters/mod.rs:139`); `contracts/fixtures/localnet/` ✔ (con s2); `SMOKE_ACCEPT.md` ✔ (evita el choque con el ciclo GAME de #5).
- **Tests:** los 29 nuevos (27-55) cubren todos los criterios del issue (ambos resultados con conservación, redondeo con `1_000_001`/250 bps = 50_000/1_950_002, fee 0 y 1000, `max_bet`, cada abort, notas (1)-(4) de #5); con M2 y m4 serán 31. HU completa; suma de tasks = issue; contratos antes que docs y smoke (PROY-21).

### Recomendación por STOP (ya decididos por el usuario en D-20261030-16; los ratifico)

- **D2 = (a) floor.** Estándar, auditable, la House nunca cobra más que lo anunciado; diferencia ≤ 1 MIST.
- **D3 = (a) sobre el pozo.** Es lo ya documentado (`agents.md:11-12`, `README.md:28`) y lo que el usuario entiende como "pozo menos comisión".
- **D4 = (a) un solo `GameResolved`.** Hay una sola transición; `GameAccepted` sería redundante (`acceptor` ya va en `GameResolved`).
- **D5 = (a)**, con la precisión de M1: el abort de `house::EWrongVersion` va al final de las validaciones y **antes** del sorteo. Nombre `EVersionMismatch` correcto (evita dos `EWrongVersion` con distinto número).
- **D6 = (a) índice sin ramas.** Es la forma que la documentación de Sui recomienda (gas balanceado en todos los caminos); (b) abre el ataque de presupuesto de gas y (c) reabre D-06 §1.

### Cambios exigidos para v2

1. B1: `env.sh` + guarda en **cada** invocación de `sui` de TASK-3, `sui start` con el env en la misma orden, chequeo de `active-env = localnet` antes de crear claves o pedir faucet; texto explícito en el handoff y en el `SMOKE_ACCEPT.md`.
2. M1: cobro (`add_fees`) antes del sorteo; orden de aborts y README actualizados; test 47 reescrito.
3. M2: test del intermedio `u128` con `max_bet` alto.
4. m1-m10 (s1-s2 a criterio del MID). Changelog v2 con cada ID.

---

## Revisión v2 — Veredicto: ✅ APROBADO (sin BLOCKER ni MAJOR; 4 🟡 y 3 🔵 nuevos, a resolver en el handoff sin otra ronda de plan)

> Revisión MAYOR · 2026-10-30 · branch `feature/issue-6-accept` @ `b7ab390` (sin commits) · `documents/PLAN_ACCEPT.md`
> **v2** (sin trackear, 596 líneas, Changelog v2 en `:572-594`). Delta revisado contra la ronda 1 y contra las fuentes
> `@v1.83.0`/`@719fb29` (`gh api`). Sin gates ni `sui` ejecutados.

### Estado de los hallazgos de la ronda 1

| ID | Estado | Evidencia en v2 |
|---|---|---|
| B1 | ✅ resuelto | `:431-475`: `env.sh` con rutas literales, `HOME` aislado, `MOVE_HOME` real, `smoke_guard`, `. env.sh && smoke_guard &&` en cada llamada, aviso "las variables NO persisten". Ver análisis abajo |
| M1 | ✅ resuelto | `:109-122, 156-171`: `assert_acceptable` → `collect_pot` (con `add_fees`) → `new_generator` → `pay_winner`; test 47 `:358-361` |
| M2 | ✅ resuelto | test 57 `:368-371` |
| m1 | ✅ | cabecera `:5-10` y tabla `:287-298` |
| m2 | ✅ | `:560` (nombres exactos + `\(`) |
| m3 | ✅ | paso 12 `:510` ("consistente", `gasUsed` completo, 12 partidas) |
| m4 | ✅ | test 50 `:364-365` |
| m5 | ✅ | `sum_coins` y conservación multipartida `:313-321` |
| m6 | ✅ | excepción a D-07 declarada `:425-429`; `sui genesis` sin `new-address` `:453-466` |
| m7 | ✅ (ver s6) | logs a archivo y PID `:457-472` |
| m8 | ✅ (ver n1) | TASK-2 `:403-410` |
| m9 | ✅ | `:73, 254-256` |
| m10 | ✅ | `:69` |
| s1 | ✅ | paso 10 con G4 `:508` |
| s2 | ✅ | `contracts/fixtures/localnet/jsonrpc/` `:516-524` |

### Foco 1 — Aislamiento del smoke: ¿algún comando `sui` toca `~/.sui/` o imprime una frase?

No encontré ningún camino si se sigue el procedimiento. Verificado:

- **`sui genesis --working-dir "$SUI_CONFIG_DIR"`:** con `--working-dir` usa ese directorio y **no** llama a
  `sui_config_dir()` (`sui_commands.rs:1383-1395`); exige que exista y esté vacío (`:1399-1441`, el plan lo crea vacío y
  pone `env.sh` fuera, en `$SMOKE_DIR`). Las claves salen de `network_config.account_keys` y se importan en
  `$SMOKE_DIR/net/sui.keystore` con `import` (`:1490-1495`); **no hay `println!` de frases**, solo `info!` con rutas
  (`:1500-1504, 1627`). 5 cuentas con 5 monedas de 3×10^16 MIST cada una (`genesis_config.rs:299-302, 313-318`).
  `client.yaml` con `active_env` = primer env = `localnet` (`:1596-1622`). El despacho de `Genesis` no pasa por
  `prompt_if_no_config` (`:500-521`).
- **`sui start --network.config <dir>`:** si el argumento no es un `.yml/.yaml`, `(dir/network.yaml, dir)` (`:962-976`);
  solo actualiza el `client.yaml` de **ese** dir (`:1267-1269`); la rama que reescribe el de `sui_config_dir()` exige
  `--force-regenesis` (`:1271-1273`) y no hay faucet. Incluso si se omitiera `--network.config`, la rama `None` usa
  `sui_config_dir()` = `SUI_CONFIG_DIR` del smoke (`:977-981`).
- **Se cierra en vacío:** como todo comando usa `"$SUI"` (definido solo en `env.sh`), una llamada que olvide cargar
  `env.sh` ejecuta `""` y falla sin tocar nada; si olvida `smoke_guard`, sigue aislada (`SUI_CONFIG_DIR` y `HOME`). El
  binario es un ELF real (`~/.local/bin/sui`, no un shim que dependa de `HOME`). `MOVE_HOME` se respeta
  (`move-command-line-common/src/env.rs:28-37`).
- **Salidas sin secretos:** `client addresses --json` = `active_address` + pares (alias, dirección)
  (`client_commands.rs:2860-2863`); `active-env`, `switch`, `object`, `ptb`, `test-publish --json` y `sui_getObject` no
  incluyen claves. Con `client.yaml` presente nunca se llega al prompt que crea una clave (`:1690-1717`), y además va
  `printf 'n\n'`.
- La guarda de `env.sh` (`[ "$SUI_CONFIG_DIR" = "$SMOKE_DIR/net" ]`) es tautológica (se acaba de asignar). No hace
  daño; la protección real es `"$SUI"` más `smoke_guard`.

### Foco 2 — `assert_acceptable` → `collect_pot` → `new_generator` → `pay_winner`

Correcto. Todo lo que puede abortar con independencia del resultado (los 6 asserts, `split`, `add_fees` →
`house::EWrongVersion`, `load_inner` de `new_generator`) va antes del índice. `pay_winner` solo depende del resultado
en la dirección. `borrow(i)` con `i ∈ {0,1}`, el cambio de estado, el evento (campos de tamaño fijo), `from_balance` y
`public_transfer` ejecutan lo mismo en ambos caminos. `collect_pot` devuelve `(Balance, u64, u64)`: Move admite tuplas
con valores sin `drop`. `Balance` ya está importado (`game.move:9`). El wrapper `#[test_only]` recorre las tres piezas.
Matiz en n3.

### Foco 3 — Test 57

Correcto. `bet = 9×10^18 ≤ max_bet`; `pot = 18_000_000_000_000_000_000 < u64::MAX = 18_446_744_073_709_551_615` (el `join`
no desborda); `pot × 1000 = 1,8×10^22` desborda `u64`, así que una fórmula en `u64` aborta por aritmética y el test (sin
`expected_failure`) falla; `fee = 1_800_000_000_000_000_000` y `payout = 16_200_000_000_000_000_000`, los dos `≤ u64::MAX`.
`coin::mint_for_testing` no tiene techo de suministro. Precisión en s5.

### Hallazgos nuevos (v2)

| # | Severidad | Regla | Líneas | Problema | Corrección esperada |
|---|---|---|---|---|---|
| n1 | 🟡 MINOR | PROY-20 | `:399-401` | `agents.md` §3 remite al "procedimiento de `documents/SMOKE_ACCEPT.md`", que el housekeeping **borra** al mergear (`FLUJO_AGENTES.md:165`). La referencia queda colgando para #8/#12/#17. | TASK-2 copia en `agents.md` §3/§7 (o en FLUJO §6) la plantilla de `env.sh`, `sui genesis --working-dir` + `sui start --network.config` y la regla `"$SUI"` + `smoke_guard`; o cita `git show <sha>:documents/SMOKE_ACCEPT.md` con el SHA del merge. |
| n2 | 🟡 MINOR | verificación | `:551, 562-565` | El grep `collect_pot\(\|new_generator\|pay_winner\(` también devuelve las llamadas de `accept_with_winner_for_testing`. El resultado esperado solo menciona las 3 llamadas de `accept_game` y las 2 definiciones. | Incluir en el esperado las 2 llamadas del wrapper (`collect_pot(`, `pay_winner(`), y `new_generator` una sola vez (el wrapper no lo llama). |
| n3 | 🟡 MINOR | SEG-5 (precisión) | `:194, 232-235` | "Nada aquí puede abortar" es demasiado fuerte: el evento, el objeto nuevo y la transferencia cuentan contra los límites de la transacción (`max_num_event_emit`, `max_num_new_move_object_ids`, `max_num_transferred_move_object_ids`, `sui-protocol-config/src/lib.rs:1655-1670`), y también se puede agotar el gas. Todo eso afecta igual a ambos resultados y no es explotable. | Redactar como "nada que dependa del resultado puede abortar; los límites globales de la transacción y el gas afectan por igual a ambos caminos", en el comentario, en `:232-235` y en el README. |
| n4 | 🟡 MINOR | SEG-3 | `:425-475` | Además de los logs, `$SMOKE_DIR/net` contiene `sui.keystore` y los YAML de los validadores con claves privadas, en formatos que el grep de secretos (`suiprivkey…`) **no** detecta. | Regla explícita: ningún archivo de `$SMOKE_DIR/net` se lee, se copia ni se pega (solo lo usan los comandos `sui`); las fixtures salen únicamente del `curl` a JSON-RPC. |
| s3 | 🔵 SUGGESTION | — | `:376-378` | El plan B "`collect_pot` devuelve solo el `Balance`…" es innecesario: Move admite tuplas con `Balance`. | Quitarlo o, si se usa, recalcular `pot`/`fee` en `pay_winner` desde `game.bet` y `game.fee_rate` (aritmética pura en `u128`). |
| s5 | 🔵 SUGGESTION | — | test 57 `:363` | La comisión se copia al crear: hay que fijar 1000 bps **antes** de `create`. | Decirlo en el test, como en el 34. |
| s6 | 🔵 SUGGESTION | — | `:464` | `nohup … &` dentro de una llamada normal: el harness puede terminar el proceso al cerrar la llamada. | Lanzar esa misma línea con `run_in_background` y `exec "$SUI" start …` (PID con `echo $$ > sui.pid; exec …`). El paso 1 ya verifica que la red está arriba (`chain-identifier`). |

### Conclusión

El plan v2 queda **aprobado**. n1-n4 y s3, s5 y s6 se incorporan en el handoff y no requieren v3 del plan. El orquestador
debe comunicar al usuario la precisión M1 de D5 (cobro antes del sorteo) y la desviación del comando del issue
(`sui genesis` + `sui start --network.config` en lugar de `--with-faucet --force-regenesis`, sin `new-address` ni
faucet), ambas declaradas en el plan (`:8-10, 465-466`).
