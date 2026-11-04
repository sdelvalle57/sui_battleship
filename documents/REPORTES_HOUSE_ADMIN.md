# Reportes del DEV — HANDOFF_HOUSE_ADMIN (#14)

> Plan: `documents/PLAN_HOUSE_ADMIN.md` v1.1 · Handoff: `documents/HANDOFF_HOUSE_ADMIN.md` v1.1 · Issue: #14 · Branch:
> `feature/issue-14-house-admin`. Un reporte por task, en orden (plantilla de `documents/FLUJO_AGENTES.md` §5).

## Task completado: HANDOFF_HOUSE_ADMIN — TASK-1

### Branch (con SHA corto del HEAD)

`feature/issue-14-house-admin` @ `882f496` (sin commits del DEV; árbol de trabajo con los archivos de abajo).

### Archivos modificados/creados

- `app/scripts/capture-house-fixtures.mjs` (nuevo): script de captura, con la guarda de URL primero.
- `contracts/fixtures/house-admin.localnet.json` (nuevo): fixture real (segunda corrida).
- `documents/REPORTES_HOUSE_ADMIN.md` (nuevo): este reporte.
- Sondas S-2 y S-6 solo en `<scratchpad>` (`s2-probe.mjs`, `s6-probe.mjs`), fuera del repo.

### Qué se implementó (3 líneas máx)

En la localnet aislada (génesis nueva, variante B) corrí por CLI las 5 transacciones de admin y de partida, en el orden de §3.3.
`capture-house-fixtures.mjs` solo lee y simula: S-1, S-3, S-4, S-5, el `HouseCap` y la House, y escribe la fixture. Dos
corridas dieron el mismo archivo salvo `capturedAt`. Después medí S-6 (budgets) y S-2 (5 corridas de ida y vuelta del cap)
y cerré la red con el paso 7.

### Tests y gates (output pegado, por área tocada)

- Agregados/modificados: ninguno. El handoff no pide tests en TASK-1. La fixture la consumen TASK-2 y TASK-4, y el script no
  entra a ningún gate. ESLint (`js.configs.recommended`) sí lo cubre: `eslint .` desde `app/` incluye `scripts/`, y
  `npx eslint --max-warnings 0 scripts/capture-house-fixtures.mjs` sale con exit 0.

**Verificación del baseline (T1-1), antes de tocar nada, HEAD `882f496`:** igual a §0 del handoff. Resumen de las corridas
(con `tail`; el output completo está en el gate final, que no tiene delta):

| Gate | Baseline medido |
|---|---|
| `node --version` / `npm --version` / `printf 'n\n' \| sui --version` | `v26.13.0` / `11.20.0` / `sui 1.83.0-16d2dc1e05ed` |
| `npm ci` | exit 0; "added 293 packages, and audited 295 packages"; 11 moderate (solo dev) |
| `npm audit signatures` | exit 0; "292 packages have verified registry signatures" |
| `npm audit --omit=dev --audit-level=high` | exit 0; "found 0 vulnerabilities" |
| `npm run lint -w app` / `npm run typecheck -w app` | exit 0 / exit 0 |
| `npm test -w app` | exit 0; "Tests 915 passed (915)" |
| `VITE_SUI_NETWORK=testnet npm run build -w app` | exit 0; `index-Ck3iRlQ-.js 901.45 kB │ gzip: 273.61 kB`, con el aviso de chunk > 500 kB |
| `sui move build` / `--lint` / `test` (`-e testnet --warnings-are-errors`) | exit 0 / exit 0 / "Total tests: 83; passed: 83; failed: 0" |
| `node --test scripts/*.test.mjs` / `node scripts/publish.mjs check` | "tests 99 … pass 99 … fail 0" / "0 despliegues" |
| `git diff --exit-code -- Move.lock` / `git status --porcelain --untracked-files=all` | exit 0 / vacío |

**Gate final, job `app`** (desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`; output completo):

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 16s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 12s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  03:15:10
   Duration  24.66s (environment 58%, tests 12%, import 11%, setup 10%, transform 8%, worker 1%)

Environment  jsdom was created 57 times · 135.81s total, 58% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 567ms
[exit=0]
$ git status --porcelain --untracked-files=all
?? app/scripts/capture-house-fixtures.mjs
?? contracts/fixtures/house-admin.localnet.json
```

**Gate final, job `contracts`** (desde `<repo>/contracts`, forma canónica; output completo. De `node --test` pego el
resumen: las 99 líneas `✔` no cambian respecto del baseline):

```text
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed
[exit=0]
$ printf 'n\n' | sui move build -e testnet --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
[exit=0]
$ printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
[exit=0]
$ printf 'n\n' | sui move test -e testnet --warnings-are-errors
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_cancelled_game_reports_self_play
[ PASS    ] battleship::game_tests::test_accept_by_creator_on_own_invite_reports_self_play
[ PASS    ] battleship::game_tests::test_accept_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::game_tests::test_accept_from_old_package_aborts_in_fee_collection
[ PASS    ] battleship::game_tests::test_accept_huge_pot_needs_u128_intermediate
[ PASS    ] battleship::game_tests::test_accept_invite_by_invitee_resolves
[ PASS    ] battleship::game_tests::test_accept_max_bet_with_max_fee_does_not_overflow
[ PASS    ] battleship::game_tests::test_accept_open_game_acceptor_wins_pays_payout_and_fee
[ PASS    ] battleship::game_tests::test_accept_open_game_creator_wins_pays_payout_and_fee
[ PASS    ] battleship::game_tests::test_accept_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_accept_rejects_game_of_older_version
[ PASS    ] battleship::game_tests::test_accept_rejects_higher_stake
[ PASS    ] battleship::game_tests::test_accept_rejects_house_of_newer_version
[ PASS    ] battleship::game_tests::test_accept_rejects_lower_stake
[ PASS    ] battleship::game_tests::test_accept_rejects_non_invited
[ PASS    ] battleship::game_tests::test_accept_rejects_other_house
[ PASS    ] battleship::house_tests::test_add_fees_accumulates_balance
[ PASS    ] battleship::game_tests::test_accept_rejects_own_game
[ PASS    ] battleship::house_tests::test_add_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fee_rate_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_fees_collected_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_rejects_resolved_game
[ PASS    ] battleship::house_tests::test_init_sends_single_house_cap_to_publisher
[ PASS    ] battleship::house_tests::test_init_shares_exactly_one_house_with_defaults
[ PASS    ] battleship::house_tests::test_max_bet_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_reports_house_before_authz
[ PASS    ] battleship::house_tests::test_migrate_bumps_version_and_emits_event
[ PASS    ] battleship::house_tests::test_migrate_rejects_current_version
[ PASS    ] battleship::game_tests::test_accept_reports_state_before_stake
[ PASS    ] battleship::house_tests::test_migrate_rejects_house_newer_than_package
[ PASS    ] battleship::house_tests::test_min_bet_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_reports_version_before_authz
[ PASS    ] battleship::house_tests::test_transfer_house_cap_moves_cap_and_emits_event
[ PASS    ] battleship::house_tests::test_transferred_cap_lets_new_holder_administer
[ PASS    ] battleship::house_tests::test_update_bet_limits_accepts_equal_min_and_max
[ PASS    ] battleship::game_tests::test_accept_reports_version_before_house
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_min_above_max
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_rounds_fee_down_on_indivisible_pot
[ PASS    ] battleship::house_tests::test_update_bet_limits_rejects_zero_min
[ PASS    ] battleship::house_tests::test_update_bet_limits_sets_limits_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_uses_fee_rate_copied_at_creation
[ PASS    ] battleship::house_tests::test_update_fee_rate_accepts_max_fee
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_fee_above_max
[ PASS    ] battleship::house_tests::test_update_fee_rate_rejects_wrong_version
[ PASS    ] battleship::game_tests::test_accept_with_max_fee_charges_ten_percent
[ PASS    ] battleship::house_tests::test_update_fee_rate_sets_rate_and_emits_event
[ PASS    ] battleship::house_tests::test_version_reads_house_with_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_empty_house
[ PASS    ] battleship::house_tests::test_withdraw_fees_rejects_wrong_version
[ PASS    ] battleship::house_tests::test_withdraw_fees_returns_all_fees_and_emits_event
[ PASS    ] battleship::game_tests::test_accept_with_random_reaches_both_outcomes
[ PASS    ] battleship::game_tests::test_accept_with_random_resolves_and_conserves_funds
[ PASS    ] battleship::game_tests::test_accept_with_zero_fee_pays_whole_pot
[ PASS    ] battleship::game_tests::test_cancel_by_other_on_cancelled_game_reports_not_creator
[ PASS    ] battleship::game_tests::test_cancel_invite_game_by_creator
[ PASS    ] battleship::game_tests::test_cancel_refunds_full_stake_and_emits_event
[ PASS    ] battleship::game_tests::test_cancel_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_cancel_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_cancel_rejects_invitee
[ PASS    ] battleship::game_tests::test_cancel_rejects_other_address
[ PASS    ] battleship::game_tests::test_cancel_rejects_rejected_game
[ PASS    ] battleship::game_tests::test_cancel_rejects_resolved_game
[ PASS    ] battleship::game_tests::test_create_accepts_bet_equal_to_max_bet
[ PASS    ] battleship::game_tests::test_create_accepts_bet_equal_to_min_bet
[ PASS    ] battleship::game_tests::test_create_copies_fee_rate_at_creation
[ PASS    ] battleship::game_tests::test_create_invite_game_stores_opponent
[ PASS    ] battleship::game_tests::test_create_open_game_stores_fields_and_emits_event
[ PASS    ] battleship::game_tests::test_create_rejects_bet_above_max
[ PASS    ] battleship::game_tests::test_create_rejects_bet_below_min
[ PASS    ] battleship::game_tests::test_create_rejects_house_with_wrong_version
[ PASS    ] battleship::game_tests::test_create_rejects_self_invite
[ PASS    ] battleship::game_tests::test_create_reports_bet_error_before_self_invite
[ PASS    ] battleship::game_tests::test_fees_from_two_games_accumulate_and_withdraw_exactly
[ PASS    ] battleship::game_tests::test_games_of_same_creator_are_independent
[ PASS    ] battleship::game_tests::test_reject_by_other_on_cancelled_invite_reports_not_invited
[ PASS    ] battleship::game_tests::test_reject_refunds_creator_and_emits_event
[ PASS    ] battleship::game_tests::test_reject_refunds_regardless_of_versions
[ PASS    ] battleship::game_tests::test_reject_rejects_cancelled_game
[ PASS    ] battleship::game_tests::test_reject_rejects_creator
[ PASS    ] battleship::game_tests::test_reject_rejects_open_game
[ PASS    ] battleship::game_tests::test_reject_rejects_other_address
[ PASS    ] battleship::game_tests::test_reject_rejects_resolved_game
Test result: OK. Total tests: 83; passed: 83; failed: 0
[exit=0]
$ node --test scripts/*.test.mjs (resumen)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 448.42045
[exit=0]
$ node scripts/publish.mjs check
0 despliegues
[exit=0]
$ git diff --exit-code -- Move.lock
[exit=0]
```

`git status --porcelain --untracked-files=all` final (después de escribir este reporte): `?? app/scripts/capture-house-fixtures.mjs`,
`?? contracts/fixtures/house-admin.localnet.json`, `?? documents/REPORTES_HOUSE_ADMIN.md`. `package.json`,
`app/package.json` y `package-lock.json` sin delta (SEG-8).

- Tablas de contrato (`contracts/README.md`) y `app/src/sui/` sincronizados: no aplica (TASK-1 no toca el contrato ni `app/src/`).

### Verificación manual (localnet / testnet, digests de tx si hubo)

**Red:** localnet aislada de `agents.md` §3 en `<SMOKE_DIR>` (dentro de `<scratchpad>`), con génesis nueva sin faucet ni
`--force-regenesis` y chain id `da204b86`. Publiqué con la variante B (`publish.mjs publish --network localnet --pubfile-path
"$SMOKE_DIR/Pub.localnet.toml"`, sin `--out`, como `ADMIN`): exit 0, y `Move.lock` quedó sin delta. Saqué `PKG`, `HOUSE` y
`HOUSE_CAP` de `contracts/deployments/localnet.json` con `grep`/`sed`, en una llamada sin Node. Cuentas de la génesis
(`suic addresses --json`): `ADMIN` = `0xe117…6d3a` (activa, publica), `A` = `0x59ef…9255`, `B` = `0x9318…2922`. IDs:
`PKG` = `originalPackageId` = `0x3eee…8ee3`, `HOUSE` = `0x47a4…3868`, `HOUSE_CAP` = `0xb76f…fa59`, `G` = `0x6abd…248b`.
`app.env` lo creé en la preparación, con la guarda `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL; return 97; }` en la
primera línea. Cada llamada con `node` cargó solo `app.env` (más `ids.env` si necesitaba IDs), nunca `env.sh`: no hubo
ningún `APPENV-FAIL` ni `GUARD-FAIL`.

**Transacciones por CLI (§3.3, en orden; con `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`).**
Funcionó la sintaxis del handoff tal cual, sin `--gas-budget`. Solo sumé `--json > "$SMOKE_DIR/txN.json"` para leer el
digest y los eventos con `grep` (desviación 2):

| # | Comando (después de `PRE`) | Digest | Resultado |
|---|---|---|---|
| 1 | `act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$HOUSE_CAP" 250` | `BFUSwvsX4y3MYWHMeeFjopD7pxdRGpfg8g6BmnH6V4p1` | success; `FeeRateUpdated` 0 → 250 |
| 2 | `act_as "$ADMIN" && suic call --package "$PKG" --module house --function update_bet_limits --args "$HOUSE" "$HOUSE_CAP" 2000000 10000000000` | `9bD38j9UgbFWGof1xF1VYBTi4Bsk8BF2YiEW3C66ZaHw` | success; `BetLimitsUpdated` 1000000/50000000000 → 2000000/10000000000 |
| 3 | `act_as "$A" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::create_game" @$HOUSE c.0 none` | `EdgtWq4utgf1zetu7eazdbsetQMh7G8bLeB15yYgzNbt` | success; `G` = `0x6abd…248b` (a `ids.env`) |
| 4 | `act_as "$B" && suic ptb --split-coins gas "[200000000]" --assign c --move-call "$PKG::game::accept_game" @$G @$HOUSE c.0 @0x8` | `3Xi2Gvefa5yoUirVprcGoUEp3ra6FakkDk4iCLmc6zkb` | success; `GameResolved` pot 400000000, fee 10000000, payout 390000000; sin `ExecutionCancelledDueToRandomnessUnavailable` |
| 5 | `act_as "$ADMIN" && suic ptb --move-call "$PKG::house::withdraw_fees" @$HOUSE @$HOUSE_CAP --assign fees --transfer-objects "[fees]" @$ADMIN` | `4QBXE9ZB1fk9dUnebLhYQQoG2c5bvAsQe6EJSSSVzSTi` | success; `FeesWithdrawn` amount 10000000 |

**T1-2 (guarda):** las dos corridas se hicieron sin la red de por medio y no crearon ninguna fixture:

```text
$ "$NODE" app/scripts/capture-house-fixtures.mjs --url http://127.0.0.1:9001
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:9000); recibido --url http://127.0.0.1:9001. No se hizo ningún pedido.
exit=2
$ "$NODE" app/scripts/capture-house-fixtures.mjs --bogus
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:9000); recibido --url http://127.0.0.1:9000 y argumentos desconocidos: --bogus. No se hizo ningún pedido.
exit=2
```

**Captura** (`. <SMOKE_DIR>/app.env && cd "$REPO" && "$NODE" app/scripts/capture-house-fixtures.mjs`). Salida de las dos
corridas, idénticas:

```text
nodo http://127.0.0.1:9000, chain id da204b86 = despliegue
roles: ADMIN, A y B distintos; 3 transacciones de admin de ADMIN
houseCapListing: admin 1 (hasNextPage false), nonOwner 0, adminLimit1 1 (hasNextPage false, cursor null)
simulationErrors: 5 casos; nonOwnerPreflight = SimulationError
executed: 3 transacciones
escrito contracts/fixtures/house-admin.localnet.json
exit=0
```

- **T1-3 (S-1): el nodo local sí responde `listOwnedObjects` por tipo. No hay STOP.**
  - `admin` trae 1 objeto: `objectId` = `HOUSE_CAP`, `type` = `0x3eee…8ee3::house::HouseCap`, en la forma larga normalizada
    igual a `normalizeStructTag`, `owner` = `{ "AddressOwner": "0xe117…6d3a", "$kind": "AddressOwner" }`, `version` "171",
    `digest` y `content` presentes. El `content` en base64 son los 32 bytes del UID, igual al `objectId`. Llega con
    `hasNextPage: false` y `cursor: null`.
  - `nonOwner` (`A`): `objects: []`, `hasNextPage: false`, `cursor: null`, sin error.
  - `adminLimit1` (`limit: 1`): 1 objeto, `hasNextPage: false` y `cursor: null`. Con un solo cap en `ADMIN`, la última página
    llega sin cursor aunque `limit` sea igual a la cantidad de objetos. Para la forma de un cursor real, ver S-6 extra.
- **T1-4 (S-3):** salen cuatro `SimulationError` con `executionError.$kind` `MoveAbort`, en el comando 0:
  - `feeTooHigh`: `house`/0, `update_fee_rate`, instruction 11;
  - `limitsZeroMin`: `house`/1, `update_bet_limits`, instruction 20;
  - `limitsMinAboveMax`: `house`/1, instruction 20;
  - `withdrawNoFees`: `house`/2, `withdraw_fees`, instruction 15.

  El `message` tiene la forma `"Transaction resolution failed: MoveAbort in 1st command, abort code: N, in '<pkg>::house::<fn>' (instruction I)"`,
  la misma que los aborts de `game` de `game-tx.localnet.json`. No hay STOP.
- **T1-5 (S-4):** las tres ejecutadas aparecen en `executed`, cada una con `$kind` `Transaction` y `status.success` `true`:
  - `updateFeeRate`: `FeeRateUpdated` `{ old_fee_rate: 0, new_fee_rate: 250 }`;
  - `updateBetLimits`: `BetLimitsUpdated` `{ old_min_bet: "1000000", old_max_bet: "50000000000", new_min_bet: "2000000", new_max_bet: "10000000000" }`;
  - `withdrawFees`: `FeesWithdrawn` `{ amount: "10000000" }`; su `objectTypes` incluye la moneda nueva `0x2::coin::Coin<0x2::sui::SUI>`.

  `gasUsed` de las dos de configuración: computation 1000000, storage 3807600, rebate 3807219. El retiro tiene storage
  4795600. En `house`: `fee_rate` 250, `fees_collected` "0", `min_bet` "2000000", `max_bet` "10000000000", `version`
  "1", con `content` en base64.
- **T1-6 (S-5):** `nonOwnerPreflight` = `{ sender: "A", errorName: "SimulationError", message: "Error checking transaction input objects: Transaction was not signed by the correct sender: Object 0xb76f…fa59 is owned by account address 0xe117…6d3a, but given owner/signer address is 0x59ef…9255", causeCode: "INVALID_ARGUMENT" }`.
  Trae **sin** `executionError`: es un `SimulationError` de la verificación de entradas, no un `MoveAbort`. En la fixture
  el mensaje va completo, con las direcciones efímeras (desviación 6). Esto confirma el `precheck` de D-6/H-3: sin él, la
  cuenta sin cap recibiría este texto crudo.
- **T1-7:** dos corridas seguidas sobre la misma red. El `diff` entre la primera (copiada a `<scratchpad>`) y la segunda:

  ```text
  5c5
  <     "capturedAt": "2026-11-04T08:08:19.619Z",
  ---
  >     "capturedAt": "2026-11-04T08:08:56.279Z",
  ```

  La fixture commiteable es la de la segunda corrida (29 688 bytes). No tiene claves `sender` con dirección: las 5 `sender`
  son roles (`ADMIN` ×4, `A` ×1). Tampoco tiene `signatures`: la palabra solo aparece en el texto de `_meta.method`.
- **T1-8 (S-6)** (`<scratchpad>/s6-probe.mjs`, `build({ client })` con `setSender(ADMIN)`, sin firmar):

  ```text
  update_fee_rate(260): OK budget=3000282 price=1000 payment=2 coin(s)
  update_bet_limits(3000000, 20000000000): OK budget=3000282 price=1000 payment=2 coin(s)
  withdraw_fees + transfer (House en 0): ERROR SimulationError: Transaction resolution failed: MoveAbort in 1st command, abort code: 2, in '0x3eee…8ee3::house::withdraw_
  cursor extra (Coin<SUI> de ADMIN, limit 1): objects=1 hasNextPage=true cursor=string base64 de 380 chars
    página 2: objects=1 distinto=true hasNextPage=false
  ```

  El budget de las dos acciones de configuración es **3000282 MIST** (≈ 0,003 SUI) con gas price 1000. El retiro aborta
  con `house`/2, como se esperaba con la House en 0. Las dos líneas "cursor extra" son informativas (desviación 4): con
  `hasNextPage: true`, el cursor real es un string base64 opaco de 380 caracteres, y la página siguiente con ese cursor
  devuelve otro objeto.
- **T1-9 (S-2)** (`<scratchpad>/s2-probe.mjs`). La sonda corrió en segundo plano con `exec` y su PID en
  `<SMOKE_DIR>/s2.pid`. La CLI fue `PRE … act_as … && suic call … transfer_house_cap … > /dev/null`, con
  `date +%s%3N` antes y después. Cada muestra hace los 3 pedidos en paralelo y espera 100 ms, así que hay una cada ≈ 105-125
  ms. Hice 5 corridas, cada una con ida (`a`: `ADMIN → A`) y vuelta (`b`: `A → ADMIN`). En las 10, `kill -0` del PID de
  la sonda falló después de que terminara sola con `end ok`. Los valores en ms son relativos al **fin de la CLI** (negativo
  = antes de que volviera la CLI) y se toman en el instante en que arranca la muestra que acierta:

  | Corrida | CLI (ms) | 1.er `getObject` = dueño nuevo | 1.er `listOwnedObjects(nuevo)` con el cap | `listOwnedObjects(anterior)` vacío | Atraso del índice frente a `getObject` |
  |---|---|---|---|---|---|
  | 1a | 629 | −89 | +15 | +15 | 104 |
  | 1b | 709 | −130 | −1 | −1 | 129 |
  | 2a | 1540 | −241 | −6 | −6 | 235 |
  | 2b | 1140 | −387 | −37 | −37 | 350 |
  | 3a | 1150 | −369 | +83 | +83 | 452 |
  | 3b | 1836 | −881 | −538 | −538 | 343 |
  | 4a | 736 | −29 | −29 | −29 | 0 (misma muestra) |
  | 4b | 1455 | −311 | +12 | +12 | 323 |
  | 5a | 1430 | −372 | +63 | +63 | 435 |
  | 5b | 1261 | −268 | −21 | −21 | 247 |

  - `getObject` (el store de objetos) ve al dueño nuevo **antes** que el índice de dueños en 9 de 10 casos, y en el décimo
    en la misma muestra. Su atraso es de 0 a 452 ms (mediana ≈ 300 ms, entre 0 y 4 muestras).
  - El índice cambia de forma atómica: en la misma muestra en que el dueño nuevo ve el cap, el anterior lo deja de ver.
    Ninguna muestra lo mostró en las dos cuentas ni en ninguna.
  - Respecto del fin de la CLI, el índice ya estaba al día o se actualizó a más tardar **+83 ms** después.
  - La lectura: en localnet el atraso del índice es corto pero real, y siempre va detrás de `getObject`. Esto respalda
    que el `precheck` (H-3) use `getObject` y que exista "Volver a comprobar" en la detección. En testnet no está medido.
  - Al final de la corrida 5b el cap volvió a `ADMIN` (la sonda vio `newList=1` para `ADMIN`).

**Cierre (T1-10, paso 7 de `agents.md` §3 + paso 20 del smoke):**

1. `kill 834382`, el PID de `<SMOKE_DIR>/sui.pid` (`ps`: `<HOME real>/.local/bin/sui start --network.config <SMOKE_DIR>/net`).
   El comando del harness terminó con exit 144, que es lo esperado (H14).
2. En otra llamada: `kill -0` falla en `sui` y en `s2.pid`. `ss -ltn` no lista ninguno de los puertos 9000, 9123, 9184,
   5003, 5173, 9229 ni 9339. `pgrep -af <SMOKE_DIR>` sale vacío.
3. Recién entonces, por ruta absoluta: `rm -rf <SMOKE_DIR>` y `test ! -e` (borrado); `rm -f <repo>/contracts/deployments/localnet.json`,
   `rmdir <repo>/contracts/deployments` y `test ! -e` (borrado).
4. Sin cargar `env.sh`, `stat -c '%y %s %n'` da `2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml`
   y `ls` da `client.yaml`: los dos idénticos a la línea base de la preparación.
5. `git diff --exit-code -- contracts/Move.lock` sale con exit 0. No quedan `contracts/Published.toml`, `contracts/Pub.*.toml`
   ni `contracts/deployments/`. `git status --porcelain` solo muestra los dos archivos de TASK-1 y este reporte.

El puerto 4173 no estaba ocupado al empezar, y no lo toqué. Tampoco toqué ningún Chrome, y no usé `pkill` ni `killall`.

**Grep antes de entregar,** sobre los dos archivos nuevos y el diff (vacío para archivos rastreados):

- Claves (`suiprivkey|mnemonic|BEGIN .*KEY|private.?key|secret`): vacío.
- Rutas personales (`/home/`, el nombre de usuario, `/tmp/`, `scratchpad`, `.nvm`): vacío.
- Hex de 40-64 en el script: vacío.
- Hex de 40-64 en la fixture (todos de la génesis efímera, declarados): el paquete `0x3eee…8ee3`, la House `0x47a4…3868`,
  el cap `0xb76f…fa59`, `0x2` (framework), la moneda de gas de `ADMIN` `0x0ae6…413d`, la moneda retirada `0x2d5e…b102` y
  las cuentas `ADMIN` `0xe117…6d3a` (dueño del cap y del gas) y `A` `0x59ef…9255` (solo en el mensaje de S-5).
- Los digests son base58 de transacciones y objetos, y el `content` es el BCS de House y cap: nada de eso es clave.

### Desviaciones del handoff

1. - Qué cambió: en la corrida 1b de S-2 la sonda arrancó 262 ms **después** de la marca de inicio de la CLI. Su primera
     muestra igual vio el estado viejo, porque la transacción todavía no se había ejecutado. Desde la 2a, la llamada de la
     CLI espera a que la sonda escriba su primera muestra antes de tomar su marca de tiempo (`until grep -q 'newList='`, con
     un tope de 10 s).
   - Por qué: el arranque en segundo plano del harness devuelve el control antes de que Node escriba nada.
   - Verificación extra realizada: en todas las corridas la primera muestra es `getObject=prev` con el índice en el dueño
     anterior, así que ninguna se perdió el cambio.
2. - Qué cambió: las transacciones 1-5 de §3.3 llevan `--json > "$SMOKE_DIR/txN.json"`.
   - Por qué: para leer el digest y los eventos con `grep` sin pegar la salida cruda de la CLI.
   - Verificación extra realizada: los archivos quedaron en `<SMOKE_DIR>`, que se borró en el cierre. No pegué nada salvo
     el digest, el status y los campos de los eventos.
3. - Qué cambió: `capture-house-fixtures.mjs` repite `sdkVersion()` y `plain()` de los dos scripts anteriores. Esta es la
     tercera copia, y LIM-5 pide extraerla.
   - Por qué: el handoff (§4) prohíbe tocar `capture-tx-fixtures.mjs`, `capture-read-fixtures.mjs` y `localnet-guard.mjs`,
     y extraer sin quitar las otras dos copias solo sumaría un módulo más. Propuesta: un issue chico que mueva los dos
     helpers a un módulo compartido de `app/scripts/` sin SDK en el nivel superior, como `localnet-guard.mjs`.
   - Verificación extra realizada: es una copia literal del modelo, sin cambios de comportamiento.
4. - Qué cambió: S-6 suma una medición informativa, fuera de la fixture: `listOwnedObjects` de `Coin<SUI>` de `ADMIN` con
     `limit: 1`, para ver un cursor real con `hasNextPage: true`.
   - Por qué: `adminLimit1` no lo muestra, porque `ADMIN` tiene un solo cap.
   - Verificación extra realizada: la página 2 con ese cursor devuelve otro objeto y `hasNextPage: false`.
5. - Qué cambió: el script exige más condiciones que las de §3.4, y aborta con mensajes "STOP de TASK-1" o "correr antes
     los pasos del handoff" si no se cumplen:
     - `admin` con exactamente el cap y `nonOwner` vacío (S-1);
     - las tres transacciones de admin firmadas por el dueño actual del cap: así se comprueba que "el cap está en `ADMIN`",
       ya que `ADMIN` se define como ese dueño;
     - las tres con `$kind` `Transaction`;
     - la House con `fees_collected` "0".

     Además `nonOwner` usa `limit: 2` + `content` (lo mismo que `admin`), y `house` guarda también el `json` (como
     `game-tx.localnet.json`, solo como referencia).
   - Por qué: evitar una fixture capturada sobre una red que no siguió los pasos (por ejemplo, con S-2 ya corrido).
   - Verificación extra realizada: las dos corridas pasaron todas las condiciones.
6. - Qué cambió: el `message` de `nonOwnerPreflight` (S-5) se guarda **tal cual llega**. Incluye las direcciones efímeras
     de `A` (el firmante) y de `ADMIN` (el dueño). El campo `sender` de la fixture es el rol `"A"`, nunca una dirección.
   - Por qué: el handoff pide el error "tal cual llega", y TASK-2/TASK-4 lo prueban contra datos reales. Son cuentas de una
     génesis desechable, y la de `ADMIN` ya aparece en los `owner` de la fixture.
   - Verificación extra realizada: si el MID prefiere el texto sin direcciones, la alternativa es reemplazarlas en el
     script por `<A>`/`<ADMIN>` y documentarlo en `_meta`, lo que cambia una línea y no afecta a S-3/S-4.
7. - Qué cambió: `git status` lista un tercer archivo, `documents/REPORTES_HOUSE_ADMIN.md`, que T1-10 no menciona.
   - Por qué: es la entrega de este reporte que pidió el orquestador.
   - Verificación extra realizada: no aplica.

### Riesgos / pendientes

- **S-5** llega como `SimulationError` sin `executionError`, con `cause.code` `INVALID_ARGUMENT`. TASK-4 tiene que fijar
  qué muestra la máquina si el `precheck` deja pasar este caso (por ejemplo, por el atraso de S-2 en el sentido inverso):
  según V-7, sería "No se pudo preparar la transacción: …" con el texto crudo del nodo.
- **Paginado (H-1):** la fixture no tiene un cursor no nulo del tipo `HouseCap` (con un solo cap no puede haberlo). Los
  tests de TASK-2 de `hasNextPage: true` / tope / cursor `null` con `hasNextPage: true` tienen que armarse sobre la forma
  real, que S-6 extra mide: un string base64 opaco.
- **S-2** solo está medido en localnet (atraso del índice de 0 a 452 ms). Testnet puede atrasarse más, y "Volver a
  comprobar" lo cubre.
- No observé `ExecutionCancelledDueToRandomnessUnavailable` en la aceptación (tx 4), así que la fixture no tiene esa
  sección (el handoff no la pide).

### Documentación

- READMEs / `agents.md` actualizados: no aplica en TASK-1. El layout de `agents.md` §2 y la sección "Lectura desde la app"
  de `contracts/README.md` (recaptura de fixtures) tendrán que nombrar `capture-house-fixtures.mjs` y
  `house-admin.localnet.json`. Según el handoff, eso entra en TASK-6 (PROY-20); el orden de las transacciones ya quedó
  documentado en el encabezado del script.
- Snippet propuesto para `documents/STATUS.md` (fila de #14):

  > #14 TASK-1 ✅ (2026-11-04): `app/scripts/capture-house-fixtures.mjs` + `contracts/fixtures/house-admin.localnet.json`
  > (S-1 `listOwnedObjects` por tipo responde en el fullnode 1.83 local; S-3 `house`/0, 1, 1, 2; S-4 las tres de admin;
  > S-5 `SimulationError` sin `executionError`, `INVALID_ARGUMENT`; S-6 budget 3000282; S-2 atraso del índice frente a
  > `getObject` 0-452 ms en 10 transferencias). Gates sin delta (915/57, 901.45 kB; Move 83; scripts 99).

---

## Revisión TASK-1: PASA

> MID, 2026-11-04. Revisado contra el diff real del árbol (`app/scripts/capture-house-fixtures.mjs`,
> `contracts/fixtures/house-admin.localnet.json`, sin commitear sobre `882f496`) y el output pegado. No corrí gates.

**Checklist de §5:**

- **Implementa lo pedido, ni más ni menos.** Orden de §3.3 respetado (5 transacciones con la sintaxis del handoff, sin
  `--gas-budget`). El script solo lee y simula: guarda de URL como primera instrucción (`:26`, antes de importar el SDK; T1-2
  con exit 2 y "No se hizo ningún pedido"), roles derivados on-chain y nunca escritos (`:107-115`), S-1 (`:131-155`), S-4
  por el único evento de cada tipo (`:119-128`, `:245-257`), S-3 con el `MoveAbort` exigido (`:186-206`, `:232-236`), S-5
  sin exigir abort (`:212-229`), `houseCapObject` y `house` (`:260-262`). Segunda corrida idéntica salvo `capturedAt`
  (T1-7). Sondas S-2 y S-6 fuera del repo.
- **PROY/ARQ.** Un script nuevo en `app/scripts/` con la guarda compartida sin cambios; `localnet-guard.mjs`,
  `capture-tx-fixtures.mjs`, `capture-read-fixtures.mjs` y `game-*.localnet.json` intactos (`git status` y `git diff
  --stat` vacíos para archivos rastreados). El builder del retiro del script ya tiene exactamente 2 comandos (`:175-183`),
  la forma de D-4.
- **SEG.** Fixture sin claves ni frases; las 5 claves `sender` son roles (`ADMIN` ×4, `A` ×1); `signatures` solo aparece en
  el texto de `_meta.method`; los hex de 40-64 son IDs y cuentas efímeras de la génesis borrada (declarados). Grep de rutas
  personales sobre los tres archivos: vacío (las coincidencias del reporte son placeholders y el texto de la regla). B4
  cumplido (`PRE` en cada `suic`), `app.env` con la guarda y nunca con `env.sh`, cierre completo con `kill -0` en otra
  llamada, `~/.sui/` idéntico a la línea base, sin `Published.toml`/`Pub.*.toml`/`deployments/`.
- **LIM.** Sin restos de debug (`say` = salida del script, como los anteriores). LIM-5: tercera copia de `sdkVersion()` y
  `plain()` (ver H-2).
- **Tests y gates.** No se piden tests. Gate completo antes y después sin delta: 915/57, 901.45 kB (273.61 kB gzip), lint 0,
  typecheck 0; Move 83, scripts 99, `check` "0 despliegues", `Move.lock` sin delta. `eslint` cubre `scripts/`.
- **Desviaciones.** Las 7 declaradas y justificadas; decisiones abajo.
- **Docs.** No aplica en TASK-1; el layout y la recaptura entran en TASK-6 (ya previsto).

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H-1 | — (decisión del MID sobre la desviación 6) | `contracts/fixtures/house-admin.localnet.json` (`simulationErrors.nonOwnerPreflight.message`) | El mensaje de S-5 trae las direcciones efímeras de `A` y `ADMIN` | **Ninguna: se acepta tal cual.** Son cuentas de una génesis borrada, sin claves; la de `ADMIN` ya está en los `owner` de la fixture (como las direcciones de `game-reads.localnet.json`), y T4-15 (v1.2) prueba la máquina contra el texto **real** del nodo. Reemplazarlas por `<A>`/`<ADMIN>` haría que el test no viera lo que llega |
| H-2 | LIM-5 | `app/scripts/capture-house-fixtures.mjs:43-71` | Tercera copia de `sdkVersion()` y `plain()` (con `capture-tx-fixtures.mjs:34-61` y `capture-read-fixtures.mjs`). El handoff (§4) prohibía tocar los otros dos | **No bloquea TASK-1.** Issue de seguimiento propio (no #53, que es el bucle de eventos de `app/src/sui/`): "app/scripts: extraer `sdkVersion()` y `plain()` a un módulo compartido sin SDK en el nivel superior (como `localnet-guard.mjs`) y usarlo en los tres scripts de captura; recapturar no hace falta (salida idéntica)". Lo crea el orquestador |
| H-3 | — (impacto en el handoff) | V-11 | S-5 llega sin `executionError` (`INVALID_ARGUMENT`): si el `precheck` dejara pasar ese caso, la máquina mostraría "No se pudo preparar la transacción: <texto crudo del nodo>" sin invalidar (`useExecuteTransaction.ts:151`) | Handoff **v1.2**: T4-15 fija ese comportamiento con el error real y que el siguiente intento lo corta el `precheck`; TASK-6 lo documenta como límite. Sin cambio de máquina: S-2 (V-12) muestra que `getObject` va delante del índice, así que la ventana entre el `precheck` y la preflight (las dos sobre el store de objetos) es de milisegundos |

**Desviaciones 1, 2, 4, 5 y 7:** aceptadas sin cambios. La 1 (esperar la primera muestra de la sonda) mejora la medición de
SUGGESTION-3; la 5 (condiciones extra del script) evita capturar sobre una red que no siguió los pasos y es coherente con
§3.4.

**Lo medido y el handoff:** ninguna decisión cambia (D-1..D-7, H-1..H-6). S-1 confirma la detección por tipo (sin STOP);
S-2 respalda H-3 ("Volver a comprobar" cubre el atraso del índice, que en localnet fue ≤ 83 ms desde el fin de la CLI);
S-6 da 3000282 MIST de budget (2 SUI de `W` en el smoke sobran). El handoff pasa a **v1.2** solo con §2 (V-10..V-14), la
nota del cursor opaco en T2-4, T4-15 y un punto de TASK-6.

### Siguiente paso: TASK-2 autorizado, con `HANDOFF_HOUSE_ADMIN.md` v1.2

### Mensaje de commit propuesto

```
test: capture real house admin fixture from isolated localnet (#14)

TASK-1 of the House admin panel: capture-house-fixtures.mjs (URL guard
first, reads and simulates only) and house-admin.localnet.json with
the HouseCap listing by owner and type, the three executed admin
transactions, house/0-2 simulation aborts, the non-owner preflight
error and the HouseCap and House objects. Probes S-1..S-6 in the
report: the local node filters listOwnedObjects by type, getObject
runs ahead of the owner index (0-452 ms), admin preflight budget
3000282 MIST.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

> #14 TASK-1 ✅ (2026-11-04, revisión MID PASA): `app/scripts/capture-house-fixtures.mjs` +
> `contracts/fixtures/house-admin.localnet.json`. S-1 `listOwnedObjects` por tipo responde en el fullnode 1.83 local; S-3
> `house`/0, 1, 1, 2; S-4 las tres de admin; S-5 `SimulationError` sin `executionError` (`INVALID_ARGUMENT`); S-6 budget
> 3000282 MIST; S-2 `getObject` delante del índice (0-452 ms, 10 transferencias). Gates sin delta (915/57, 901.45 kB; Move
> 83; scripts 99). Handoff v1.2. Seguimiento: issue de limpieza de `app/scripts/` (LIM-5).

## Task completado: HANDOFF_HOUSE_ADMIN — TASK-2

### Branch (con SHA corto del HEAD)

`feature/issue-14-house-admin` @ `9067ef8` (handoff v1.2; sin commits del DEV).

### Archivos modificados/creados

- Nuevos:
  - `app/src/sui/houseCap.ts` y `app/src/sui/houseCap.test.ts`;
  - `app/src/sui/houseAdmin.ts` y `app/src/sui/houseAdmin.test.ts`;
  - `app/src/sui/transactions/house.ts` y `app/src/sui/transactions/house.test.ts`.
- Cambiados:
  - `app/src/sui/readErrors.ts`: `'incomplete'` y su texto;
  - `app/src/sui/readErrors.test.ts`: +17 líneas, ninguna borrada;
  - `app/src/sui/errors.test.ts`: +31 líneas, ninguna borrada.
- No cambian: `errors.ts`, `house.ts`, `game.ts`, `gameTx.ts`, `readPolicy.ts`, `hooks/`, `components/`, `pages/` ni `contracts/`.

### Qué se implementó (3 líneas máx)

- `houseCap.ts`: detección del cap por tipo con la regla de certeza de H-1 (`null` solo con 0 objetos y fin de páginas;
  `invariant` con dos o más; `incomplete` con el tope de 3 páginas o un cursor `null`), más el parser exacto del cap y el
  `precheck` por `getObject` de H-3.
- `houseAdmin.ts`: validación espejo (comisión, límites, retiro) y los tres parsers de eventos (único evento de esa House).
- `transactions/house.ts`: tres builders puros; el del retiro tiene exactamente 2 comandos.
- `readErrors.ts`: `ReadDataError('incomplete')` con su texto propio, no transitorio.

### Tests y gates (output pegado, por área tocada)

- Agregados/modificados (130 tests nuevos; 915 → 1045, 57 → 60 archivos):
  - `houseCap.test.ts` (33):
    - T2-3 con `admin`, `nonOwner` y `adminLimit1` reales;
    - T2-4 con cursor opaco `'c1'`: el primer pedido va **sin** clave `cursor` y el segundo con `cursor: 'c1'`;
    - T2-5 (3 pedidos, `incomplete`);
    - T2-6 (dos caps en dos páginas y en una sola, esta sin segundo pedido);
    - T2-7 (cap y página final vacía ⇒ el cap; cap con más páginas hasta el tope ⇒ `incomplete`; `hasNextPage` con
      cursor `null` ⇒ `incomplete` con 1 pedido);
    - T2-8 (9 rechazos: otro paquete, dirección corta mal formada `0xg1`, otro struct, `owner` `null`, `Shared`,
      `AddressOwner` de otra cuenta, un byte de más, bytes truncados, `id` ≠ `objectId`);
    - T2-12 (`owned` con el `houseCapObject` real y `include: { content: false }`; `not_owned` con otro dueño, `null`,
      `Shared`, otro tipo, `ObjectError` `notFound` y `deleted`; se relanzan `ObjectError` `unknown`, `RpcError`
      `UNAVAILABLE` y el corte de 10 s como `ReadTimeoutError`);
    - el texto de `HOUSE_CAP_LOST_MESSAGE`;
    - un caso extra: un objeto listado de otro paquete (el nodo no filtró) ⇒ `wrong_type`.
  - `houseAdmin.test.ts` (59):
    - T2-9: los 12 rechazos y los 4 aceptados, entre ellos `'99999999999999999999'` ⇒ `too_high`, `'00250'` ⇒ 250 y `'0'`
      con la actual en 0 ⇒ `unchanged`;
    - T2-10: cada motivo por campo, `negative` incluido, `zero_min` también para `'0.000000000'`, los dos campos a la vez,
      `min == max`, `min > max`, `unchanged` escrito de otra forma (`'0.0010'`/`'50.0'`), `U64_MAX` y `U64_MAX + 1`;
    - T2-11;
    - T2-15 con `executed` real (0 → 250; los cuatro montos; 10000000; `houseId` en mayúsculas). Para cada parser, `null`
      con otra House, sin eventos, con dos eventos, con bytes truncados o con un byte de más, y con el tipo de otro
      paquete. Además, ningún parser lee el evento de otra acción.
  - `transactions/house.test.ts` (27):
    - T2-13: comandos e inputs exactos de `getData()`, `u16`/`u64` decodificados y `sender` `null`. Acepta 0, 1001 y 65535
      en `feeRate` y 0/`U64_MAX` en los montos. Lanza con IDs inválidos, `feeRate` −1, 1.5, 65536 y `NaN`, y con montos
      negativos o mayores que `U64_MAX`;
    - T2-14: exactamente 2 comandos, `MoveCall withdraw_fees [Input 0, Input 1]` y
      `TransferObjects { objects: [{ Result: 0 }], address: Input 2 (pure) }`; la dirección decodificada es `recipient`
      normalizado y hay 3 inputs; lanza con `recipient` corto, vacío o no hex.
  - `readErrors.test.ts` (+3): T2-1, T2-2 y el texto genérico para los demás motivos.
  - `errors.test.ts` (+8): T2-16. Los 4 `simulationErrors` de `house-admin.localnet.json` se mapean a `house`/0, 1, 1, 2
    con `ABORT_MESSAGES.house[n]` y el sufijo `(código house/<n>)`, tanto por la vía estructurada como solo por el mensaje.
    `findMoveAbort` reconoce ese formato, así que no hay STOP sobre `errors.ts`.
- Verificación extra: probé dos mutaciones temporales sobre `houseCap.ts` y las revertí (`houseCap.test.ts` volvió a 33/33):
  - cambiar el tope de páginas por `break` deja 2 tests rojos;
  - tratar todo `ObjectError` como `not_owned` deja 1 test rojo.
- Grep de capas (§7) sobre `app/src/sui/houseCap.ts app/src/sui/houseAdmin.ts app/src/sui/transactions/house.ts`: vacío.
- Contracts: no aplica (sin cambios en `contracts/`; `git diff --exit-code -- contracts/` sale con exit 0, ver abajo).

**Gate de la app** (desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`; output completo
de la corrida final, sobre el árbol entregado):

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 7s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  60 passed (60)
      Tests  1045 passed (1045)
   Start at  03:34:09
   Duration  16.45s (environment 61%, tests 14%, import 10%, setup 10%, transform 5%, worker 1%)

Environment  jsdom was created 60 times · 95.61s total, 61% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-s225zLE5.js   901.53 kB │ gzip: 273.65 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 540ms
[exit=0]
$ git status --porcelain --untracked-files=all
 M app/src/sui/errors.test.ts
 M app/src/sui/readErrors.test.ts
 M app/src/sui/readErrors.ts
?? app/src/sui/houseAdmin.test.ts
?? app/src/sui/houseAdmin.ts
?? app/src/sui/houseCap.test.ts
?? app/src/sui/houseCap.ts
?? app/src/sui/transactions/house.test.ts
?? app/src/sui/transactions/house.ts
$ git diff --exit-code -- contracts/ package.json app/package.json package-lock.json
[exit=0]
```

- **Build:** `index-*.js` pasa de 901.45 a **901.53 kB** (273.61 → 273.65 kB gzip), por el texto nuevo de `readErrors.ts`, que
  la app ya importa. Los módulos nuevos de `sui/` todavía no los importa nadie: entran al bundle desde TASK-4/5. El aviso
  de chunk mayor de 500 kB es el de siempre (#15).
- **Dependencias:** `package.json`, `app/package.json` y `package-lock.json` sin delta (SEG-8).
- **Sincronización:** la tabla de contrato de `contracts/README.md` y `app/src/sui/` no aplican (el contrato no cambia).
  `HOUSE_MAX_FEE_BPS` replica `house::MAX_FEE_BPS` y entra en la tabla de `agents.md` §5 en TASK-6 (ver Documentación).

### Verificación manual (localnet / testnet, digests de tx si hubo)

No aplica: sin localnet en este task (los datos reales salen de la fixture de TASK-1). No toqué puertos ni procesos del DEV
de `-issue15`, y no hay procesos propios abiertos.

### Desviaciones del handoff

1. - Qué cambió: el retiro transfiere el resultado entero del `MoveCall` (`const coin = tx.moveCall(…)` ⇒
     `{ $kind: 'Result', Result: 0 }`). El snippet de §3.4 desestructuraba `const [coin]` (`NestedResult [0, 0]`).
   - Por qué: con `noUncheckedIndexedAccess`, `const [coin]` de `moveCall` queda `… | undefined` y `transferObjects` no lo
     acepta (TS2322). `Result 0` es la forma literal de D-4 ("`TransferObjects([Result 0], recipient)`") y T2-14 acepta
     cualquiera de las dos. `withdraw_fees` devuelve un solo valor.
   - Verificación extra realizada: T2-14 fija `objects: [{ $kind: 'Result', Result: 0 }]` y exactamente 2 comandos. La PTB
     que simuló TASK-1 (S-3 `withdrawNoFees`, S-6) usaba `const [fees]`; las dos formas resuelven al mismo valor porque
     hay un solo retorno.
2. - Qué cambió: `transactions/house.ts` tiene su propio `assertObjectId` (2 líneas) y su propio `moveTarget`, igual que
     `transactions/game.ts`.
   - Por qué: allí son privados, y el task no lista `transactions/game.ts` entre los archivos a cambiar. Es la segunda
     copia: según LIM-5, "candidata a extraer", no obligatoria.
   - Verificación extra realizada: el comportamiento es el mismo (`isValidSuiObjectId`; lanza `Error`).
3. - Qué cambió: los parsers de eventos atrapan el error de parseo dentro del `map`, con la misma semántica que el
     `parseOrNull` de `gameTx.ts`. No importo ese helper.
   - Por qué: es privado de `gameTx.ts`, que está en "NO tocar".
   - Verificación extra realizada: T2-15 con bytes truncados y con un byte de más ⇒ `null`.
4. - Qué cambió (detalles que §3 dejaba abiertos):
     - el primer pedido de `fetchHouseCap` va **sin** la clave `cursor` (no `cursor: null`);
     - en `parseHouseCapObject`, el dueño ausente, no `AddressOwner` o de otra cuenta, y el `id` ≠ `objectId`, dan
       `ReadDataError('invariant')`;
     - `parseHouseCapObject` y `checkHouseCapOwnership` aceptan `owner: null` aunque el tipo del SDK diga que no puede
       serlo (V-5).
   - Por qué:
     - el pedido sin cursor es idéntico al de la forma de T2-3;
     - `invariant` está dentro del conjunto que fija §3.2 (`wrong_type`, `invariant` o `malformed`);
     - `mapOwner` devuelve `null` en runtime.
   - Verificación extra realizada: T2-4 (`not.toHaveProperty('cursor')`), T2-8 y T2-12 con `owner` `null`.
5. - Qué cambió: hay algunos tests más de los listados:
     - `houseCapType` igual al `type` real del nodo;
     - objeto listado de otro paquete ⇒ `wrong_type`;
     - un parser no lee el evento de otra acción;
     - `'+1'`/`'0x10'` ⇒ `invalid`;
     - `feeRate` `NaN`.
   - Por qué: cubren bordes de las mismas reglas.
   - Verificación extra realizada: no aplica.

### Riesgos / pendientes

- `checkHouseCapOwnership` no compara el `objectId` de la respuesta con `capId`: confía en que `getObject` devuelve lo que
  se pidió, igual que `fetchHouse`/`fetchGame`.
- `validateBetLimits` no aplica los límites actuales de la House a los nuevos (no existe esa regla en el contrato); solo
  pide `0 < min <= max` y que cambien.
- Para TASK-4: `fetchHouseCap` lanza `ReadDataError` (`invariant`/`incomplete`/`wrong_type`/`malformed`). Ninguno es
  transitorio, así que `useHouseCap` muestra "Reintentar" con el texto de `readErrorMessage`.

### Documentación

- READMEs / `agents.md` actualizados: no aplica en TASK-2. Según el handoff, TASK-6 suma:
  - el mapa de `app/src/sui/` en `app/README.md` (`houseCap.ts`, `houseAdmin.ts`, `transactions/house.ts`);
  - la fila de `HOUSE_MAX_FEE_BPS` (espejo de `house::MAX_FEE_BPS`) en la tabla de `agents.md` §5;
  - el motivo `incomplete` de `ReadDataError`.
- Snippet propuesto para `documents/STATUS.md` (fila de #14):

  > #14 TASK-2 ✅ (2026-11-04): capa `sui/` de la House: `houseCap.ts` (detección por tipo con la regla de certeza H-1:
  > `null` solo con fin de páginas; `invariant`/`incomplete`; `precheck` `checkHouseCapOwnership` por `getObject`, solo
  > `notFound`/`deleted` ⇒ cap perdido), `houseAdmin.ts` (validación espejo y parsers de `FeeRateUpdated`,
  > `BetLimitsUpdated`, `FeesWithdrawn`), `transactions/house.ts` (retiro con 2 comandos) y `ReadDataError('incomplete')`.
  > App 1045 tests en 60 archivos (+130), build 901.53 kB; lint/typecheck 0.

---

## Revisión TASK-2: NO PASA

> MID, 2026-11-04. Revisado contra el diff real (`app/src/sui/houseCap.ts`, `houseAdmin.ts`, `transactions/house.ts`,
> `readErrors.ts` y sus tests, sin commitear sobre `9067ef8`) y el output pegado. No corrí gates. Un solo hallazgo, de
> tests: el código es correcto. Con T2-17 (handoff v1.3) en verde, PASA sin otra revisión de código.

**Checklist de §5:**

- **Implementa lo pedido.** H-1 en `fetchHouseCap` (`houseCap.ts:74-108`): `null` solo con 0 objetos y `hasNextPage:
  false` (`:97`, `:107`); `invariant` al juntar 2 (`:94-96`); `incomplete` con cursor `null` (`:98-100`) o con el tope de 3
  pedidos (`:101-103`); cada pedido con `withReadTimeout` (`:83`) y el primero sin clave `cursor` (`:89`).
  `parseHouseCapObject` (`:49-66`): tipo exacto, `AddressOwner` = la cuenta (acepta `owner` `null` en runtime, V-5), BCS
  exacto e `id` = `objectId`. H-3 en `checkHouseCapOwnership` (`:116-132`): `getObject` con `content: false`, solo
  `notFound`/`deleted` ⇒ `not_owned` (SUGGESTION-1), el resto se relanza. `readErrors.ts`: `'incomplete'` y su texto (MINOR-1
  de la ronda corta). `houseAdmin.ts`: espejo de `MAX_FEE_BPS` con comparación en `bigint` (`:32-33`), `validateBetLimits`
  con los motivos de `parseSuiToMist` (incluido `negative`) y el par; parsers del único evento de esa House con BCS exacto.
  `transactions/house.ts`: rangos de `u16`/`u64` (no los del contrato, a propósito), retiro con exactamente 2 comandos.
- **Capas y PROY.** `sui/` sin React ni capas superiores (grep vacío); `@mysten/*` solo `sui`; ningún archivo de la lista
  "NO tocar" cambia; `errors.ts` sin cambios (T2-16 confirma que `findMoveAbort` reconoce los aborts de `house`).
- **SEG.** Nada de secretos ni rutas personales en el diff. El retiro no admite otro destino que el `recipient` que le
  pasa quien llama (N-2 se cierra en TASK-4 con `build(sender)`).
- **LIM.** Sin debug. LIM-5: `assertObjectId`/`moveTarget` es la **segunda** copia (con `transactions/game.ts`), candidata y
  no obligatoria: aceptada (desviación 2). `parseOrNull` en línea: aceptado (desviación 3).
- **Tests y gates.** +130 tests (1045 en 60 archivos), lint 0, typecheck 0, build 901.53 kB (+0,08 kB por el texto de
  `readErrors.ts`); sin delta en `contracts/` ni en dependencias. Los tests viejos solo suman casos. Las dos mutaciones
  temporales del reporte muestran que T2-5/T2-7 y T2-12 detectan una regla rota.
- **Desviaciones 1-5:** aceptadas. La 1 (`Result 0` entero en vez de `const [coin]`) es la forma literal de D-4; Sui acepta
  `Result(i)` como argumento cuando el comando devuelve un solo valor, y `withdraw_fees` devuelve uno. Como S-3/S-6 de
  TASK-1 simularon con `NestedResult`, el paso 16 del smoke es la ejecución real de esta forma (ya pide los 2 comandos).

### Hallazgos

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H-1 | PROY-14 / DL-5 de #10 (política común de lecturas); LIM-11 | `app/src/sui/houseCap.test.ts:99-172` (`describe('fetchHouseCap (H-1)')`) y el reporte de TASK-2, "Riesgos / pendientes", 3.er punto | **El código está bien**: `fetchHouseCap` no atrapa nada, así que un `RpcError` transitorio (`UNAVAILABLE`, …) y el `ReadTimeoutError` del corte de 10 s (`withReadTimeout`, `readPolicy.ts:31-47`) llegan tal cual a TanStack, y `shouldRetryRead` los reintenta (3 intentos, 1 s y 2 s, "Reintentando… (intento n de m)"). Pero (a) **ningún test lo fija**: los de `fetchHouseCap` solo cubren `ReadDataError` y resultados, a diferencia de `checkHouseCapOwnership` (`:211-227`); un cambio futuro que envolviera el error de red en `ReadDataError('incomplete')` (p. ej. al tocar el bucle) pasaría todos los tests y convertiría un corte de red en un "Reintentar" definitivo; (b) la frase del reporte "Ninguno es transitorio, así que `useHouseCap` muestra «Reintentar»" es inexacta: vale **solo** para los `ReadDataError` de `fetchHouseCap`, no para los errores de red | (a) **T2-17** del handoff v1.3 en `houseCap.test.ts`: `RpcError` `UNAVAILABLE` en el primer pedido y en el segundo (tras una página vacía con cursor) ⇒ la misma instancia, `isTransientReadError` y `shouldRetryRead(0, e)` en `true`; nodo colgado ⇒ `ReadTimeoutError`; contraste con `incomplete`/`invariant` no transitorios. (b) Corregir la frase del reporte: "Los `ReadDataError` de `fetchHouseCap` no son transitorios ("Reintentar"); los errores de red se relanzan tal cual y siguen la política común (DL-5)". Gate de la app completo otra vez, pegado |

**Precisión para TASK-4 (ya en el handoff v1.3, T4-16):** con `UNAVAILABLE` en los 3 intentos, `useHouseCap` pasa por
`retrying` y termina en `error` con `cap` siempre `unknown` (nunca "Sin permisos"); si el tercer intento responde, `known`.

### Siguiente paso: correcciones al DEV (H-1: T2-17 + la frase del reporte + gate). Con eso, TASK-2 PASA y se autoriza TASK-3.

### Mensaje de commit propuesto (para cuando PASE, con T2-17 incluido)

```
feat(app): add House admin pure layer in sui/ (#14)

TASK-2 of the House admin panel: houseCap.ts (detection by type with
the certainty rule: null only after the last page, invariant for two
caps, incomplete at the page cap or with a missing cursor; network
errors pass through to the shared read policy; ownership precheck by
getObject where only notFound/deleted means a lost cap), houseAdmin.ts
(fee and bet-limit validation mirroring the contract, parsers for
FeeRateUpdated, BetLimitsUpdated and FeesWithdrawn), transactions/
house.ts (withdraw PTB with exactly two commands) and the
'incomplete' ReadDataError reason with its own text.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md (para cuando PASE)

> #14 TASK-2 ✅ (2026-11-04): capa `sui/` de la House (`houseCap.ts` con la regla de certeza H-1 y el `precheck` por
> `getObject`; `houseAdmin.ts`; `transactions/house.ts` con el retiro en 2 comandos; `ReadDataError('incomplete')`). Los
> errores de red de la detección siguen la política común (T2-17). App <N> tests en 60 archivos, build 901.53 kB.

## TASK-2, corrección H-1 (addendum)

> DEV, 2026-11-04. Responde al hallazgo H-1 de "Revisión TASK-2" (handoff v1.3, T2-17). Branch
> `feature/issue-14-house-admin` @ `3786ab3`, sin commits del DEV. No cambia el código de producción: solo
> `app/src/sui/houseCap.test.ts`. El reporte de TASK-2 de arriba queda tal cual; este addendum corrige su frase de riesgos.

### H-1 (a): ✅ corregido. T2-17 en `houseCap.test.ts`

Un `describe` nuevo, `fetchHouseCap network errors (T2-17, shared read policy DL-5)`, con 4 tests. Los 33 tests anteriores
del archivo no cambian:

- **(a)** `RpcError('down', 'UNAVAILABLE')` en el primer pedido. `fetchHouseCap` rechaza con **la misma instancia**
  (`toBe`), y tanto `isTransientReadError` como `shouldRetryRead(0, e)` dan `true`. Hace 1 pedido.
- **(b)** El mismo error en el **segundo** pedido, después de `{ [], hasNextPage: true, cursor: 'c1' }`. Rechaza con la
  misma instancia, transitoria y reintentable, sin dejar un resultado parcial. Hace 2 pedidos, y el segundo lleva
  `cursor: 'c1'`.
- **(c)** Nodo colgado, con timers falsos, igual que el test del corte de `checkHouseCapOwnership`. Tras `READ_TIMEOUT_MS`
  rechaza con `ReadTimeoutError`, y `isTransientReadError` y `shouldRetryRead(0, e)` dan `true`.
- **(d)** Contraste: `ReadDataError('incomplete')` (cursor `null` con más páginas) e `invariant` (dos caps) dan
  `isTransientReadError === false`; `incomplete` también da `shouldRetryRead(0, e) === false`.

Verificación extra: probé una mutación temporal en `houseCap.ts`, envolviendo el error de `listOwnedObjects` en
`ReadDataError('incomplete')`, justo el cambio futuro que describe el hallazgo. Con ella, (a), (b) y (c) quedan en rojo
(`3 failed | 34 passed (37)`). Después restauré el archivo: `grep` no encuentra la mutación y el resultado es `37 passed
(37)`. Lint del archivo: 0.

Diff del test (el único `-` es la línea del import, que suma `isTransientReadError` y `shouldRetryRead`):

```diff
--- a/app/src/sui/houseCap.test.ts
+++ b/app/src/sui/houseCap.test.ts
@@ -12,7 +12,7 @@
   parseHouseCapObject,
   type HouseCapObjectInput,
 } from './houseCap';
-import { READ_TIMEOUT_MS } from './readPolicy';
+import { isTransientReadError, READ_TIMEOUT_MS, shouldRetryRead } from './readPolicy';
 import { ReadDataError, ReadTimeoutError } from './readErrors';
 
 type FixtureObject = { objectId: string; version: string; digest: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
@@ -171,6 +171,71 @@
   });
 });
 
+describe('fetchHouseCap network errors (T2-17, shared read policy DL-5)', () => {
+  afterEach(() => {
+    vi.useRealTimers();
+  });
+
+  /** Cliente cuyo `listOwnedObjects` responde, en orden, cada paso: una página o un rechazo. */
+  function stepClient(...steps: (Page | Error)[]) {
+    const listOwnedObjects = vi.fn<(options: unknown) => Promise<Page>>(() => {
+      const step = steps.shift() ?? page([], false);
+      return step instanceof Error ? Promise.reject(step) : Promise.resolve(step);
+    });
+    return { listOwnedObjects, client: { listOwnedObjects } as unknown as Pick<SuiGrpcClient, 'listOwnedObjects'> };
+  }
+
+  it('rethrows the same UNAVAILABLE instance of the first request, transient and retried by the policy', async () => {
+    const down = new RpcError('down', 'UNAVAILABLE');
+    const { client, listOwnedObjects } = stepClient(down);
+    const error = await fetchFor(client);
+    expect(error).toBe(down);
+    expect(isTransientReadError(error)).toBe(true);
+    expect(shouldRetryRead(0, error)).toBe(true);
+    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
+  });
+
+  it('rethrows the same UNAVAILABLE instance of the second request, without a partial result', async () => {
+    const down = new RpcError('down', 'UNAVAILABLE');
+    const { client, listOwnedObjects } = stepClient(page([], true, 'c1'), down);
+    const error = await fetchFor(client);
+    expect(error).toBe(down);
+    expect(isTransientReadError(error)).toBe(true);
+    expect(shouldRetryRead(0, error)).toBe(true);
+    expect(listOwnedObjects).toHaveBeenCalledTimes(2);
+    expect(listOwnedObjects.mock.calls[1]?.[0]).toMatchObject({ cursor: 'c1' });
+  });
+
+  it('turns a hung node into a transient ReadTimeoutError after 10 s', async () => {
+    vi.useFakeTimers();
+    const listOwnedObjects = vi.fn(
+      ({ signal }: { signal?: AbortSignal }) =>
+        new Promise<Page>((_resolve, reject) => {
+          signal?.addEventListener('abort', () => {
+            reject(signal.reason as Error);
+          });
+        }),
+    );
+    const client = { listOwnedObjects } as unknown as Pick<SuiGrpcClient, 'listOwnedObjects'>;
+    const result = fetchFor(client);
+    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
+    const error = await result;
+    expect(error).toBeInstanceOf(ReadTimeoutError);
+    expect(isTransientReadError(error)).toBe(true);
+    expect(shouldRetryRead(0, error)).toBe(true);
+  });
+
+  it('keeps incomplete and invariant as definitive (not transient), unlike the network errors', async () => {
+    const incomplete = await fetchFor(stepClient(page([], true, null)).client);
+    const invariant = await fetchFor(stepClient(page([realCap(), otherCap()], false)).client);
+    expect(incomplete).toMatchObject({ reason: 'incomplete' });
+    expect(invariant).toMatchObject({ reason: 'invariant' });
+    expect(isTransientReadError(incomplete)).toBe(false);
+    expect(isTransientReadError(invariant)).toBe(false);
+    expect(shouldRetryRead(0, incomplete)).toBe(false);
+  });
+});
+
 describe('checkHouseCapOwnership (H-3)', () => {
   afterEach(() => {
     vi.useRealTimers();
```

### H-1 (b): ✅ corregida la frase de "Riesgos / pendientes"

Este texto reemplaza el 3.er punto de "Riesgos / pendientes" del reporte de TASK-2. No edito el texto anterior:

- Para TASK-4: solo los `ReadDataError` de `fetchHouseCap` (`invariant`, `incomplete`, `wrong_type`, `malformed`) son
  definitivos. Con ellos, `useHouseCap` muestra "Reintentar" con el texto de `readErrorMessage`, sin reintento automático.
  Los errores de red se relanzan tal cual, la misma instancia sin envolver, y siguen la política común (DL-5):
  - un `RpcError` transitorio (`UNAVAILABLE`, …);
  - el `ReadTimeoutError` del corte de 10 s.

  `shouldRetryRead` los reintenta hasta 3 intentos (1 s y 2 s). T2-17 lo fija, y T4-16 del handoff v1.3 cubre el lado del
  hook (`cap` sigue `unknown` mientras dura y nunca pasa a "Sin permisos").

### Gate de la app (completo, otra vez)

Desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`, sobre el árbol entregado:

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 7s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  60 passed (60)
      Tests  1049 passed (1049)
   Start at  03:40:20
   Duration  16.42s (environment 61%, tests 14%, import 10%, setup 10%, transform 5%, worker 1%)

Environment  jsdom was created 60 times · 94.66s total, 61% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-s225zLE5.js   901.53 kB │ gzip: 273.65 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 401ms
[exit=0]
$ git status --porcelain --untracked-files=all
 M app/src/sui/errors.test.ts
 M app/src/sui/readErrors.test.ts
 M app/src/sui/readErrors.ts
 M documents/REPORTES_HOUSE_ADMIN.md
?? app/src/sui/houseAdmin.test.ts
?? app/src/sui/houseAdmin.ts
?? app/src/sui/houseCap.test.ts
?? app/src/sui/houseCap.ts
?? app/src/sui/transactions/house.test.ts
?? app/src/sui/transactions/house.ts
$ git diff --exit-code -- contracts/ package.json app/package.json package-lock.json
[exit=0]
```

Resumen del delta frente al reporte de TASK-2:

- tests: 1045 → **1049**, por los 4 de T2-17, en los mismos 60 archivos;
- lint 0 y typecheck 0;
- build igual, 901.53 kB (273.65 kB gzip), porque el código de producción no cambió;
- sin delta en `contracts/` ni en las dependencias.

En `git status` aparecen los mismos archivos de TASK-2 más este reporte.

### Desviaciones del handoff

Ninguna nueva.

### Riesgos / pendientes

Ninguno nuevo. Lo de TASK-4 queda en la frase corregida de arriba.

## Task completado: HANDOFF_HOUSE_ADMIN — TASK-3

### Branch (con SHA corto del HEAD)

`feature/issue-14-house-admin` @ `7070c0d` (handoff v1.3; sin commits del DEV).

### Archivos modificados/creados

- Código:
  - `app/src/hooks/txSession.ts`;
  - `app/src/hooks/queryKeys.ts`;
  - `app/src/hooks/txInvalidation.ts`;
  - `app/src/hooks/useTxTarget.ts`;
  - `app/src/hooks/useExecuteTransaction.ts` (3 líneas);
  - `app/src/components/GameActions.tsx` (3 líneas).
- Tests (solo casos agregados, salvo el helper de la desviación 1):
  - `app/src/hooks/txSession.test.ts`;
  - `app/src/hooks/txInvalidation.test.ts`;
  - `app/src/hooks/useTxTarget.test.tsx`;
  - `app/src/hooks/useExecuteTransaction.test.tsx`.
- No cambian:
  - `sui/`, cuyos tipos de eventos solo se importan como `import type`;
  - `useMyGames.ts` y `CreateGameForm.tsx`;
  - las cuatro acciones de partidas. Siguen pasando `build: () => …` y `precheck: async (signal) => …`, que TS acepta como
    `(sender) => …` / `(signal, sender) => …`.

### Qué se implementó (3 líneas máx)

- La máquina común reconoce el objetivo `house` y las acciones `updateFeeRate`/`updateBetLimits`/`withdrawFees` como
  propias, lo que cierra NIT-3.
- `TX_ACTION_KINDS` (`satisfies`) y `TxValueMap` quedan atados a `TxAction['kind']`. Usan `switch` exhaustivos sin
  `default`: `actionGameId` para `toTxGameEntry`, `txTarget`, la normalización de `useTxTarget`, la invalidación y
  `adoptedStatus`.
- `ExecuteInput` pasa a `build(sender)` y `precheck(signal, sender)`, con la cuenta del clic.
- La invalidación de las tres acciones sigue H-5.

### Tests y gates (output pegado, por área tocada)

- Agregados (19 tests; 1049 → 1068, mismos 60 archivos):
  - `txSession.test.ts` (5):
    - T3-2: las tres acciones se reconocen y `migrate` se rechaza;
    - T3-3: `updateFeeRate` propia en curso sobre `house`, proyectada con `toTxEntry` y la clave real, da
      `inFlightForeign: false` y `notice: null`;
    - T3-4: `withdrawFees` ajena terminada después de montar da `adopted` con `action: 'withdrawFees'` y su `outcome`;
    - T3-5: las tres dan `gameId: null` y `liveTxGameIds` queda vacío;
    - T3-7: `txTarget` de `house` da `[…, 'house']`, con `hashKey` distinto del de `create`; `houseCap` normaliza `0xA` y
      las mayúsculas.
  - `txInvalidation.test.ts` (10), T3-6:
    - `updateFeeRate`/`updateBetLimits` ⇒ `{ reset: [], invalidate: [house, houseCap] }`;
    - `withdrawFees` ⇒ `[house, balance, houseCap]`, en ese orden;
    - sin cuenta, las tres ⇒ solo `[house]`;
    - ninguna toca `lobby`, `game`, `myGames` ni claves inmutables;
    - `houseCap` va con la cuenta normalizada.

    Los tests viejos de `create`/`cancel`/`reject`/`accept` pasan sin tocarlos.
  - `useTxTarget.test.tsx` (2):
    - T3-8: `view.key` termina en `'house'`, con `target` `{ kind: 'house' }`, la misma `accountKey` y otro `targetHash`
      que `create`;
    - T3-9: un `updateFeeRate` del objetivo `house` queda "sin confirmar" (por la máquina real, con
      `confirmTransaction` rechazado). La vista `create` montada después tiene `unconfirmed: null`, `notice: null` y
      `busy: false`; otra vista `house` sí lo ve (`{ digest }`).
  - `useExecuteTransaction.test.tsx` (2):
    - T3-10: `precheck` recibe `(AbortSignal, cuenta del clic)` y las **dos** llamadas a `build` reciben la cuenta del clic,
      aunque la wallet pasa a otra cuenta durante la preflight;
    - además, una acción de la House corre sobre el objetivo `house` y la máquina invalida exactamente
      `[house, houseCap]` de la cuenta del clic, sin reset.
- **T3-1** (pruebas locales sin commitear, una por vez sobre `txSession.ts`, con `npm run typecheck -w app` y restauración
  verificada por SHA-1 `OK` y 0 errores al final):

  ```text
  === prueba 1 (quitar withdrawFees de TX_ACTION_KINDS)
  src/hooks/txSession.ts(156,3): error TS1360: Type '{ create: true; cancel: true; reject: true; accept: true; updateFeeRate: true; updateBetLimits: true; }' does not satisfy the expected type 'Record<"create" | "cancel" | "reject" | "accept" | "updateFeeRate" | "updateBetLimits" | "withdrawFees", true>'.
  npm error Lifecycle script `typecheck` failed with error:
  === prueba 2 (quitar withdrawFees de TxValueMap)
  src/hooks/txSession.ts(121,58): error TS2536: Type 'K' cannot be used to index type 'TxValueMap'.
  npm error Lifecycle script `typecheck` failed with error:
  === prueba 3 (quitar el case 'accept' de actionGameId, la función de gameId de toTxGameEntry)
  src/hooks/txSession.ts(223,42): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
  npm error Lifecycle script `typecheck` failed with error:
  app/src/hooks/txSession.ts: OK
  0
  ```

- **T3-11:** en los cuatro archivos de tests viejos el diff solo agrega casos. La única excepción es el helper `targetOf`
  de `useExecuteTransaction.test.tsx` (desviación 1), que no es una aserción. Las 290 pruebas previas de `hooks/` y
  `components/` pasan sin cambios: la suite de esas carpetas pasa de 290 a 309.
- `grep -n "from './" app/src/hooks/txSession.ts`: vacío.
- Contracts: no aplica. `git diff --exit-code -- contracts/ app/src/sui/` y las dependencias salen con exit 0 (abajo).

**Gate de la app** (desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`; output completo
sobre el árbol entregado):

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 7s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  60 passed (60)
      Tests  1068 passed (1068)
   Start at  03:49:54
   Duration  21.16s (environment 58%, tests 12%, import 10%, transform 10%, setup 9%)

Environment  jsdom was created 60 times · 116.87s total, 58% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Dw47nO8e.js   902.36 kB │ gzip: 273.84 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 424ms
[exit=0]
$ git status --porcelain --untracked-files=all
 M app/src/components/GameActions.tsx
 M app/src/hooks/queryKeys.ts
 M app/src/hooks/txInvalidation.test.ts
 M app/src/hooks/txInvalidation.ts
 M app/src/hooks/txSession.test.ts
 M app/src/hooks/txSession.ts
 M app/src/hooks/useExecuteTransaction.test.tsx
 M app/src/hooks/useExecuteTransaction.ts
 M app/src/hooks/useTxTarget.test.tsx
 M app/src/hooks/useTxTarget.ts
$ git diff --exit-code -- contracts/ app/src/sui/ package.json app/package.json package-lock.json
[exit=0]
```

- **Build:** `index-*.js` pasa de 901.53 a **902.36 kB** (273.65 → 273.84 kB gzip), por el código nuevo de la máquina, que
  la app ya importa. Ahí entran los tipos de `ACTION_KINDS`, `actionGameId`, los `switch` y las filas de H-5. El aviso de
  chunk mayor de 500 kB es el de siempre (#15).
- **Dependencias:** sin delta (SEG-8).
- **Lint:** 0, sin `eslint-disable`; tampoco hay `useRef`/`useEffect` nuevos.
- **Sincronización:** la tabla de contrato de `contracts/README.md` y `app/src/sui/` no aplican (no cambia el contrato ni
  `sui/`).

### Verificación manual (localnet / testnet, digests de tx si hubo)

No aplica: sin localnet. No toqué procesos ni puertos de `-issue15`.

### Desviaciones del handoff

1. - Qué cambió: el helper `targetOf` de `useExecuteTransaction.test.tsx` pasa de un ternario a un `switch` exhaustivo
     (`create` ⇒ `create`; `cancel`/`reject`/`accept` ⇒ `game`; las tres de la House ⇒ `house`). Es una migración
     declarada en un helper; ninguna aserción cambia.
   - Por qué: el ternario suponía `gameId` en toda acción que no fuera `create` (el mismo supuesto que V-9 señalaba en
     `toTxGameEntry`). Con las acciones nuevas, el `typecheck` daba rojo (TS2339 en la línea 107 del test).
   - Verificación extra realizada: los tests viejos que usan `render(action)` dan los mismos objetivos para las acciones
     de partidas y pasan sin cambios. T3-10 lo usa con `updateFeeRate` ⇒ `house`.
2. - Qué cambió: en `useTxTarget`, el `switch` exhaustivo vive en una función pura `normalizedTarget(kind, gameId)` que
     se llama dentro del `useMemo`, con dependencias primitivas (`network`, `address`, `kind`, `gameId`, `viewId`).
     `gameId` se normaliza fuera, como antes. El `case 'game'` lanza si `gameId` es `null`, algo inalcanzable.
   - Por qué: la regla `react-hooks/exhaustive-deps` (warning; con `--max-warnings 0` cuenta como error) no deja usar
     dentro del `useMemo` un objetivo calculado fuera sin ponerlo en las dependencias. Si se pone, la vista se
     recalcula en cada render, porque los llamadores pasan un objeto literal. TS no correlaciona `kind` y `gameId`
     sueltos, y la guarda cubre ese hueco sin un `default`.
   - Verificación extra realizada: T3-8 y T3-9; los tests de identidad de vista existentes pasan. Si se quita un `case`,
     TS2366, como en la prueba 3 de T3-1.
3. - Qué cambió:
     - `queryKeys.txTarget` pasa de un ternario con tuplas `as const` a una función con `switch` y tipo de retorno
       explícito `QueryKey`;
     - en `actionGameId`, `create` y las tres de la House tienen un `case` propio cada una (`return null`), tal como pide
       §3.1, aunque se podrían agrupar.
   - Por qué: el tipo de retorno explícito es lo que hace que un `case` faltante dé TS2366. Nadie usaba la tupla exacta
     (`TxView.key` ya es `QueryKey`).
   - Verificación extra realizada: los tests viejos de `txTarget` pasan; typecheck 0.
4. - Qué cambió: en `transactionInvalidations`, el `queryKeys.house(…)` de `accept` pasa a una constante local `house`,
     compartida con las acciones de la House. Es el mismo valor.
   - Por qué: evitar la repetición (LIM-5).
   - Verificación extra realizada: el test viejo de `accept` pasa sin tocarlo.

### Riesgos / pendientes

- Una acción de la House adoptada nunca llega a `GameActions`: la adopción exige el mismo objetivo, y la vista de partida
  usa `game`. Los tres `case` nuevos de `adoptedStatus` existen solo por la exhaustividad. TASK-5 tiene que dar el texto
  adoptado en el panel.
- El retiro todavía no usa `build(sender)`: lo arma TASK-4 (`useWithdrawFees`). T3-10 fija que la máquina pasa la cuenta
  del clic.

### Documentación

- READMEs / `agents.md` actualizados: no aplica en TASK-3. TASK-6 documenta:
  - el objetivo `house`;
  - las acciones nuevas;
  - `build(sender)`/`precheck(signal, sender)`;
  - la tabla de invalidación de H-5 en `app/README.md`.
- Snippet propuesto para `documents/STATUS.md` (fila de #14):

  > #14 TASK-3 ✅ (2026-11-04): máquina de transacciones con el objetivo `house` y las acciones `updateFeeRate`,
  > `updateBetLimits` y `withdrawFees` (NIT-3 de #12 cerrado): `TX_ACTION_KINDS satisfies Record<TxAction['kind'], true>`
  > y `TxValueMap` (una acción sin su entrada rompe el `typecheck`), `switch` exhaustivos sin `default` en
  > `toTxGameEntry`, `txTarget`, `useTxTarget`, la invalidación (H-5) y `adoptedStatus`; `build(sender)` y
  > `precheck(signal, sender)` con la cuenta del clic. App 1068 tests en 60 archivos (+19), build 902.36 kB; lint 0.

---

## Revisión TASK-3: PASA

> MID, 2026-11-04. Revisado contra el diff real (`txSession.ts`, `queryKeys.ts`, `txInvalidation.ts`, `useTxTarget.ts`,
> `useExecuteTransaction.ts`, `GameActions.tsx` y los cuatro archivos de tests, sin commitear sobre `7070c0d`) y el output
> pegado. No corrí gates.

**Checklist de §5:**

- **Implementa lo pedido (D-5, H-4, H-5, MINOR-2/3 del plan y del handoff).**
  - `TxAction` suma las tres acciones sin `gameId`; `TxTarget` suma `house` y `HouseTarget`.
  - `TX_ACTION_KINDS … satisfies Record<TxAction['kind'], true>` y `ACTION_KINDS` derivado con `Object.keys`.
    `TxValueByAction = { [K in TxAction['kind']]: TxValueMap[K] }` sobre un `TxValueMap` no exportado. T3-1 muestra las
    tres roturas reales: TS1360 (`satisfies`), TS2536 (`TxValueMap`) y TS2366 (`actionGameId`), con la restauración
    verificada.
  - `actionGameId` con un `case` por acción, sin `default` y retorno `string | null`; `toTxGameEntry` la usa.
  - `queryKeys.houseCap` con la dirección normalizada; `txTarget` con `switch` y retorno `QueryKey` (desviación 3).
  - `useExecuteTransaction`: solo cambian las tres llamadas (`precheck(signal, sender)` y `build(sender)` en la preflight y
    en la firma), con el `sender` que `run` ya capturaba.
  - `GameActions.adoptedStatus`: las tres de la House ⇒ `null`.
- **Regresión de #11-#13: intacta.**
  - **V-8 (candado en el mismo tick):** `execute` no cambia (`isMutating(accountKey)`, el "sin confirmar" del objetivo y
    `mutateAsync` en el mismo tick).
  - **SEG-10:** el resultado sigue saliendo solo de la `mutationFn` después de `classifyExecution`; `interpret` no cambió de
    firma ni de lugar.
  - **H-5/H-6 de "Mis partidas":** `toTxGameEntry` da el mismo `gameId` que antes para `cancel`/`reject`/`accept` y `null`
    para `create` (antes, el ternario; ahora `actionGameId`); `liveTxGameIds` y `useMyGames` no cambian, y las de la House
    dan `null` (T3-5).
  - **Adopción:** `mountSnapshot` y `deriveTargetState` no cambian; el cast a `AdoptedTx` ahora abarca las acciones nuevas
    por el tipo derivado. `CreateGameForm.tsx:88` sigue filtrando por `action === 'create'`, y el objetivo `house` tiene otra
    clave, así que un "sin confirmar" de la House no bloquea ni se adopta en el formulario (T3-9, con la máquina real).
    Busqué en `app/src` otros chequeos no exhaustivos de `action.kind`/`target.kind`: no hay.
  - **Tests viejos:** el diff de los cuatro archivos solo agrega casos; la única línea quitada es el helper `targetOf`
    (desviación 1), no una aserción. 290 → 309 en `hooks/` + `components/`.
- **Tabla de invalidación (H-5), exacta:** `txInvalidation.ts:38-41`. `updateFeeRate`/`updateBetLimits` ⇒ `{ reset: [],
  invalidate: [house, ...houseCap] }`; `withdrawFees` ⇒ `[house, ...balance, ...houseCap]`, en ese orden; sin cuenta, solo
  `[house]`; nunca `lobby`, `game`, `myGames` ni claves inmutables (T3-6, 10 casos). `accept` conserva su lista con la misma
  clave `house` (desviación 4) y su test viejo pasa sin tocarlo.
- **Desviación 2 (`throw` en `normalizedTarget`): no es un `default` disfrazado.** `normalizedTarget(kind, gameId):
  TxTarget` (`useTxTarget.ts:34-45`) tiene un `case` por cada `TxTarget['kind']`, ningún `default` y retorno explícito:
  un objetivo nuevo sin su `case` da TS2366 igual que `actionGameId`. El `throw` está **dentro** de `case 'game'` y solo
  estrecha el tipo de `gameId`, que es `null` únicamente cuando `kind !== 'game'` (`:81`, `normalizeSuiObjectId` siempre
  devuelve un string): es inalcanzable, no captura ningún `kind`. El motivo (deps primitivas para `exhaustive-deps` sin
  recalcular la vista por el objeto literal del llamador, M-5) es correcto.
- **Capas y LIM.** `txSession.ts` sigue sin importar nada de `./` (grep vacío) e importa de `sui/houseAdmin` solo tipos. Lint
  0 sin `eslint-disable`, sin `useRef`/`useEffect` nuevos. Desviaciones 1, 3 y 4 aceptadas (la 1 era obligatoria: el
  ternario rompía el `typecheck` con las acciones nuevas).
- **Tests y gates.** +19 (1068 en 60 archivos); typecheck 0; build 902.36 kB (+0,83 kB); `contracts/`, `sui/` y
  dependencias sin delta. T3-2..T3-11 presentes con los nombres del handoff.

### Hallazgos

Ninguno.

**Notas para los tasks siguientes (no son hallazgos):**
- TASK-5: el resultado **adoptado** de una acción de la House solo puede verse en el panel (mismo objetivo `house`);
  `adoptedStatus` de `GameActions` devuelve `null` por exhaustividad. T5-12 lo cubre.
- TASK-4: `useWithdrawFees` es el primer consumidor de `build(sender)`; T4-13 fija que el `recipient` es la cuenta del clic.

### Siguiente paso: TASK-4 autorizado (handoff v1.3)

### Mensaje de commit propuesto

```
feat(app): extend the transaction machine with the House target (#14)

TASK-3 of the House admin panel, closes NIT-3 of #12: house target and
the updateFeeRate, updateBetLimits and withdrawFees actions recognized
as own mutations. Action kinds and result values are tied to
TxAction['kind'] (satisfies and a mapped type), and toTxGameEntry,
txTarget, useTxTarget, the invalidation table and adoptedStatus use
exhaustive switches without default. ExecuteInput passes the click
account to build(sender) and precheck(signal, sender). House actions
reset nothing and invalidate the House and the account HouseCap (and
the balance on withdraw).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

> #14 TASK-3 ✅ (2026-11-04, revisión MID PASA): máquina con el objetivo `house` y las acciones `updateFeeRate`,
> `updateBetLimits`, `withdrawFees` (NIT-3 de #12 cerrado); `satisfies` + `TxValueMap` y `switch` exhaustivos sin `default`;
> `build(sender)`/`precheck(signal, sender)`; invalidación H-5. App 1068 tests en 60 archivos (+19), build 902.36 kB.

## Task completado: HANDOFF_HOUSE_ADMIN — TASK-4

### Branch (con SHA corto del HEAD)

`feature/issue-14-house-admin` @ `68514ec` (handoff v1.3; sin commits del DEV).

### Archivos modificados/creados

- Nuevos:
  - `app/src/hooks/useHouseCap.ts`;
  - `app/src/hooks/houseAdminTx.ts`;
  - `app/src/hooks/useUpdateFeeRate.ts`, `app/src/hooks/useUpdateBetLimits.ts` y `app/src/hooks/useWithdrawFees.ts`;
  - `app/src/hooks/useHouseCap.test.tsx`;
  - `app/src/hooks/useHouseAdminActions.test.tsx`, con las tres acciones en un solo archivo.
- Cambiado: `app/src/test/txHarness.tsx` (+ `useHouseView()`).
- No cambian (`git diff --exit-code` sale con exit 0, abajo):
  - lo de TASK-3 (`txSession.ts`, `queryKeys.ts`, `txInvalidation.ts`, `useTxTarget.ts`, `useExecuteTransaction.ts`);
  - `sui/`, `components/` y `pages/`;
  - `contracts/` y las dependencias.

### Qué se implementó (3 líneas máx)

- `useHouseCap` lee el `HouseCap` de la cuenta conectada con la política común. `cap` vale `unknown` hasta la primera
  lectura exitosa y `known` desde entonces, también si una relectura falla. Sin `placeholderData`, y sin cuenta usa
  `skipToken`.
- `houseCapPrecheck` es el `precheck` común: `getObject` y `HOUSE_CAP_LOST_MESSAGE` invalidando el `houseCap` de la
  cuenta que firma.
- Los tres hooks finos de acción usan la máquina común. El retiro arma la transacción con `recipient: sender`, la cuenta
  del clic.

### Tests y gates (output pegado, por área tocada)

- Agregados (33 tests; 1068 → 1101, 60 → 62 archivos).
- `useHouseCap.test.tsx` (8), con timers falsos y la política real (`createPolicyQueryClient`):
  - T4-1: sin cuenta da `no_account` y ningún `listOwnedObjects`.
  - T4-2:
    - con la cuenta en mayúsculas y el listado real de `ADMIN` ⇒ `known` con el cap. El dato queda bajo
      `queryKeys.houseCap(…, ADMIN)` normalizada, y el pedido lleva `owner` normalizado, `limit: 2` y `content`;
    - con el listado vacío real ⇒ `known` con `null`.
  - T4-16:
    - `UNAVAILABLE` en los tres intentos da `retrying` 2/3 y luego 3/3, y después `error`, con 3 pedidos. `cap` sigue
      `{ kind: 'unknown' }` en cada paso, nunca `known` con `null`;
    - si el tercer intento responde ⇒ `known` con el cap y `ready`.
  - T4-3: dos caps (`invariant`, no transitorio) ⇒ `error` con un solo pedido y `cap` `unknown`.
  - T4-4: con el cap leído, un `refetch` que falla pasa por `retrying 2/3` y luego `error`, y `cap` sigue `known` con el cap.
  - T4-5: con otra cuenta en el mismo hook, `address` nueva y `cap` `unknown` hasta su lectura (`known` `null`). El pedido
    va con el dueño nuevo.
- `useHouseAdminActions.test.tsx` (25). Las tres acciones van sobre `useHouseView()`, con la cuenta del clic igual al
  dueño real del cap de la fixture. El cliente mock tiene `getObject` del cap y un `listOwnedObjects` que **lanza** si se
  lo llama:
  - T4-6 (por acción): `getObject` con otro dueño ⇒ `failure` `HOUSE_CAP_LOST_MESSAGE`. No hay preflight
    (`SimulateTransaction`) ni wallet. Solo se invalida `houseCap` de la cuenta, y el pedido es `getObject` con
    `content: false`.
  - T4-7: `owner` `null`, otro tipo, `ObjectError` `notFound` y `deleted` ⇒ el mismo corte.
  - T4-8 (por acción): camino de éxito con un solo `getObject` y `listOwnedObjects` sin llamar.
  - T4-9:
    - `ObjectError` `unknown` ⇒ "No se pudo preparar la transacción: fallo del nodo", sin preflight ni invalidaciones;
    - `RpcError` `UNAVAILABLE` ⇒ `PREFLIGHT_NETWORK_MESSAGE`;
    - ninguno de los dos da el texto del cap perdido.
  - T4-10: los `SimulationError` reales `feeTooHigh` (`house`/0), `limitsZeroMin` (`house`/1) y `withdrawNoFees`
    (`house`/2) en la preflight ⇒ `ABORT_MESSAGES.house[n]` con el sufijo `(código house/n)`, wallet sin abrir, sin
    reset, y las invalidaciones exactas de H-5 por acción.
  - T4-11 (por acción): éxito con `executed` real. Los valores son `{ houseId, 0, 250 }`, los cuatro montos de límites y
    `10000000n`. Las invalidaciones de H-5 salen en orden y antes de `done`: se registra la etapa en cada
    `invalidateQueries`, hay una entrada por clave y ninguna es `done`.
  - T4-12: `updateFeeRate` "sin confirmar" ⇒ `target.unconfirmed` = `{ digest }`. Después, `limits` y `withdraw` no hacen
    nada: siguen 1 `getObject`, 1 preflight y 1 wallet, y sus `outcome` siguen `null`.
  - T4-13:
    - el `recipient` del `TransferObjects` es la cuenta del clic, tanto en la copia de la preflight como en la
      transacción que va a la wallet, que tiene 2 comandos;
    - si la cuenta conectada pasa a otra durante la preflight, el `recipient` de la wallet sigue siendo la del clic, y el
      `precheck` y las invalidaciones también son de esa cuenta.
  - T4-14 (por acción): éxito sin eventos ⇒ `success` con `value: null`.
  - T4-15:
    - el `precheck` da `'owned'` y la preflight lanza el `SimulationError` real de `nonOwnerPreflight`, sin
      `executionError` y con `cause` `RpcError` `INVALID_ARGUMENT` ⇒ `failure` "No se pudo preparar la transacción:
      <texto real del nodo>". No llama a `confirmTransaction` ni a la wallet ni invalida nada;
    - un segundo intento, con `getObject` ya en el dueño nuevo ⇒ corte `HOUSE_CAP_LOST_MESSAGE`, sin otra preflight y con
      el `houseCap` invalidado;
    - el test fija además que `isPreflightNetworkCause` de ese `INVALID_ARGUMENT` es `false`: la preflight real lo
      relanza tal cual y no como error de red (DL-10).
- Verificación extra: probé una mutación temporal, `recipient` fijo en otra dirección en `useWithdrawFees.ts`, y los dos
  tests de T4-13 dieron rojo. Restauré el archivo y volvió a 25/25.
- Tests viejos: sin cambios. `txHarness.tsx` solo suma `useHouseView` e imports.
- Contracts: no aplica.

**Gate de la app** (desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`; output completo
de la corrida final, sobre el árbol entregado):

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 8s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  62 passed (62)
      Tests  1101 passed (1101)
   Start at  04:00:24
   Duration  16.98s (environment 61%, tests 14%, import 10%, setup 9%, transform 5%)

Environment  jsdom was created 62 times · 97.70s total, 61% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Dw47nO8e.js   902.36 kB │ gzip: 273.84 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 402ms
[exit=0]
$ git status --porcelain --untracked-files=all
 M app/src/test/txHarness.tsx
?? app/src/hooks/houseAdminTx.ts
?? app/src/hooks/useHouseAdminActions.test.tsx
?? app/src/hooks/useHouseCap.test.tsx
?? app/src/hooks/useHouseCap.ts
?? app/src/hooks/useUpdateBetLimits.ts
?? app/src/hooks/useUpdateFeeRate.ts
?? app/src/hooks/useWithdrawFees.ts
$ git diff --exit-code -- contracts/ app/src/sui/ app/src/components/ app/src/pages/ app/src/hooks/txSession.ts app/src/hooks/queryKeys.ts app/src/hooks/txInvalidation.ts app/src/hooks/useTxTarget.ts app/src/hooks/useExecuteTransaction.ts package.json app/package.json package-lock.json
[exit=0]
```

- **Build:** igual que en TASK-3, 902.36 kB (273.84 kB gzip). Los hooks nuevos todavía no los importa ninguna página;
  entran al bundle con TASK-5.
- **Lint:** 0, sin `eslint-disable`, `useRef` ni `useEffect`. Una corrida previa del gate dio 1 error de lint en el test
  nuevo (`no-unnecessary-condition`, un `?.` de más). Lo corregí y el output pegado es el de la corrida final.
- **Dependencias:** sin delta.
- **Sincronización:** la tabla de contrato y `app/src/sui/` no aplican.

### Verificación manual (localnet / testnet, digests de tx si hubo)

No aplica: sin localnet. No toqué procesos ni puertos de `-issue15`.

### Desviaciones del handoff

1. - Qué cambió:
     - `useHouseCap` devuelve `address` **normalizada**;
     - sin cuenta, la clave usa `'0x0'` como dueño de relleno, el mismo patrón que `useSuiBalance` (la query no corre
       por `skipToken`);
     - los datos de `useUpdateBetLimits().update` tienen un tipo exportado, `UpdateBetLimitsInput`, con la misma forma
       que fija §4.
   - Por qué: la clave y el `precheck` normalizan, y la `key={address}` de TASK-5 tiene que ser estable ante
     mayúsculas.
   - Verificación extra realizada: T4-2 con la cuenta en mayúsculas ⇒ `address` normalizada.
2. - Qué cambió: los tests de las tres acciones están en un solo archivo, `useHouseAdminActions.test.tsx`, como permite
     §4, con `describe`/`it.each` por acción.
   - Por qué: comparten fixture, mocks y helpers.
   - Verificación extra realizada: no aplica.

### Riesgos / pendientes

- `useHouseCap` no fija intervalo, igual que `useHouse`: el panel relee al montar y al volver el foco, y con "Volver a
  comprobar" (TASK-5). El atraso del índice tras recibir el cap (V-12, ≤ 0,5 s en localnet) lo cubre ese botón.
- El texto de `HOUSE_CAP_LOST_MESSAGE` y el de V-11 (`PREPARE_FAILED_PREFIX` + el texto del nodo, con direcciones) son los
  que va a mostrar el panel. TASK-6 documenta el límite de T4-15.

### Documentación

- READMEs / `agents.md` actualizados: no aplica en TASK-4. TASK-6 suma a `app/README.md` `useHouseCap`/`CapKnowledge`,
  el `precheck` común y los tres hooks de acción.
- Snippet propuesto para `documents/STATUS.md` (fila de #14):

  > #14 TASK-4 ✅ (2026-11-04): hooks de la House: `useHouseCap` (`CapKnowledge` `unknown`/`known`, sin
  > `placeholderData`; con `UNAVAILABLE` reintenta y nunca da "Sin permisos"), `houseCapPrecheck` (`getObject`, nunca
  > `listOwnedObjects`; cap perdido ⇒ corte sin wallet e invalidación del `houseCap`) y `useUpdateFeeRate`,
  > `useUpdateBetLimits`, `useWithdrawFees` (retiro a la cuenta del clic por construcción). App 1101 tests en 62 archivos
  > (+33), build 902.36 kB; lint 0.

---

## Revisión TASK-4: PASA

> MID, 2026-11-04. Revisado contra el diff real (`app/src/hooks/useHouseCap.ts`, `houseAdminTx.ts`, `useUpdateFeeRate.ts`,
> `useUpdateBetLimits.ts`, `useWithdrawFees.ts`, `useHouseCap.test.tsx`, `useHouseAdminActions.test.tsx` y
> `app/src/test/txHarness.tsx`, sin commitear sobre `68514ec`) y el output pegado. No corrí gates.

**Checklist de §5, con los focos pedidos:**

- **Implementa lo pedido (D-1 hook, D-6, H-2, H-3).** `useHouseCap` (`useHouseCap.ts:26-49`): sin cuenta, `skipToken` y
  `no_account`; con cuenta, clave `houseCap(red, pkg, cuenta normalizada)`, sin opciones propias (política común) y sin
  `placeholderData`; `cap` = `unknown` ⇔ `query.data === undefined`. Las tres acciones son hooks finos sobre la máquina, con
  el `precheck` común y el `interpret` del evento; `useHouseView` en el arnés.
- **T4-16, un error de red nunca da "Sin permisos": cumplido.** `UNAVAILABLE` en los 3 intentos ⇒ `retrying` 2/3 y 3/3 y
  después `error`, con `cap` **siempre** `{ kind: 'unknown' }` y 3 pedidos (`useHouseCap.test.tsx:108-122`); si el tercer
  intento responde ⇒ `known` + `ready` (`:124-134`). T4-3 (no transitorio ⇒ `unknown` + `error`, 1 pedido) y T4-4 (con el cap
  leído, una relectura que falla deja `known` con el cap) completan H-2. Como `known` con `null` solo sale de un `null` de
  `fetchHouseCap`, y este solo lo da con la regla de certeza (T2-4..T2-7, T2-17), no hay camino de un error a "Sin permisos".
- **`precheck` = solo `getObject`: cumplido.** `houseAdminTx.ts:23-29` llama únicamente a `checkHouseCapOwnership`
  (`getObject` con `content: false`, T4-6 lo verifica). T4-8 monta un `listOwnedObjects` que lanza si se lo llama y las tres
  acciones terminan en `success` con 1 `getObject`. T4-6/T4-7: otro dueño, `owner` `null`, otro tipo, `notFound` y `deleted`
  ⇒ corte con `HOUSE_CAP_LOST_MESSAGE`, sin preflight ni wallet, invalidando **solo** `houseCap` de la cuenta. T4-9:
  `ObjectError` `unknown` ⇒ "No se pudo preparar la transacción: …" y `UNAVAILABLE` ⇒ el texto de red, nunca el de cap
  perdido (SUGGESTION-1 de la ronda corta).
- **T4-13, `recipient` = la cuenta del clic: cumplido.** `useWithdrawFees.ts:22` usa `build: (sender) => … recipient:
  sender` (N-2 por construcción). El test decodifica el input puro del `TransferObjects` en la transacción de la preflight y
  en la de la wallet (2 comandos) y da la cuenta del clic; con la cuenta conectada cambiada a otra durante la preflight, el
  `recipient` y las invalidaciones siguen siendo de la cuenta del clic.
- **T4-15, el error real de S-5: cumplido.** Usa el `message` real de `nonOwnerPreflight` (sin `executionError`, `cause`
  `INVALID_ARGUMENT`, que `isPreflightNetworkCause` no toma como red): `failure` con `PREPARE_FAILED_PREFIX` + el texto del
  nodo, sin wallet, sin `confirmTransaction` y **sin** invalidación (DL-10 de #12); el segundo intento, con `getObject` ya en
  otro dueño, corta en el `precheck` con `HOUSE_CAP_LOST_MESSAGE` e invalida `houseCap`. Es el comportamiento que fija la
  v1.2.
- **Invalidaciones exactas (H-5): cumplido.** T4-11 con los tres `executed` reales: `[house, houseCap]` para comisión y
  límites y `[house, balance, houseCap]` para el retiro, **en orden** y todas antes de `done` (la etapa registrada en cada
  invalidación nunca es `done`); T4-10: con un abort real de la preflight (`house`/0, 1, 2) el mensaje mapeado, wallet sin
  abrir, `resetQueries` nunca llamado y las mismas listas de H-5. T4-12: un "sin confirmar" de la comisión bloquea las otras
  dos (ni `getObject` ni preflight ni wallet de más).
- **Lint sin `useRef`/`useEffect`: cumplido.** `grep` de `useRef|useEffect|eslint-disable` en los cinco hooks: vacío; lint 0.
- **Capas y LIM.** `hooks/` importa de `@mysten/*` solo la raíz del kit, `@mysten/sui*` y TanStack; el `precheck` común
  evita la triple copia (LIM-5). Sin debug.
- **Tests y gates.** +33 (1101 en 62 archivos); lint 0, typecheck 0; build 902.36 kB sin cambio (los hooks todavía no los
  importa ninguna vista); `contracts/`, `sui/` y dependencias sin delta.
- **Desviaciones 1-2: aceptadas.** La 1 (`address` normalizada en el resultado y `0x0` en la clave de una consulta
  deshabilitada sin cuenta) es el patrón de `useSuiBalance` y da una `key={address}` estable para TASK-5; la 2 (un solo
  archivo para las tres acciones) comparte fixture y mocks.

### Hallazgos

Ninguno.

**Nota para TASK-5 (no es hallazgo):** el texto de T4-15 trae las direcciones del nodo (aceptado en la v1.2). El panel lo
muestra tal cual en el `TransactionStatus` de la acción; TASK-6 lo documenta como límite.

### Siguiente paso: TASK-5 autorizado (handoff v1.3)

### Mensaje de commit propuesto

```
feat(app): add House admin hooks (#14)

TASK-4 of the House admin panel: useHouseCap (unknown until a first
successful read, kept known on a failing refetch, network errors go
through the shared retry policy and never read as "no permission"),
a shared HouseCap precheck by getObject only, and useUpdateFeeRate,
useUpdateBetLimits and useWithdrawFees on the shared machine. The
withdraw recipient is the click account by construction; values come
from the confirmed events and invalidations follow H-5.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

> #14 TASK-4 ✅ (2026-11-04, revisión MID PASA): `useHouseCap` (`CapKnowledge`, política común: un error de red nunca da
> "Sin permisos"), `precheck` común por `getObject` y los tres hooks de acción (retiro a la cuenta del clic; H-5). App 1101
> tests en 62 archivos (+33), build 902.36 kB.

## Task completado: HANDOFF_HOUSE_ADMIN — TASK-5

### Branch (con SHA corto del HEAD)

`feature/issue-14-house-admin` @ `9ce0594` (handoff v1.3; sin commits del DEV).

### Archivos modificados/creados

- Nuevos:
  - `app/src/pages/HouseAdminPage.tsx` y `app/src/pages/HouseAdminPage.test.tsx`;
  - `app/src/components/HouseAdminPanel.tsx`;
  - `app/src/components/HouseAdminPanel.test.tsx` (hooks mockeados);
  - `app/src/components/HouseAdminPanel.machine.test.tsx` (hooks y máquina reales, con el kit y `sui/execution`
    mockeados, como `GameActions.machine.test.tsx`).
- Cambiados:
  - `app/src/App.tsx`: ruta `admin` antes de `*`;
  - `app/src/components/Header.tsx`: enlace "Administrar House";
  - `app/src/App.test.tsx` y `app/src/components/Header.test.tsx`: mock de `useHouseCap` y casos nuevos (desviación 4).
- No cambian: `hooks/`, `sui/`, `GameActions.tsx`, `index.css` (no hizo falta estilo), `contracts/` ni las dependencias
  (`git diff --exit-code`, abajo).

### Qué se implementó (3 líneas máx)

- `#/admin` monta `HouseAdminPage` con `<HouseAdminView key={address} />`. La vista sigue los estados de H-2: `unknown`
  muestra solo `ReadState`; `known` + `null` muestra "Sin permisos" con "Volver a comprobar"; con el cap muestra el panel,
  que una relectura fallida no desmonta.
- `HouseAdminPanel` tiene la configuración y los tres bloques `[data-house-action]` (validación espejo, resumen "De X a Y"
  junto al botón, `TransactionStatus` con el texto del evento). Usa una sola fuente de bloqueo y muestra una vez el aviso
  "en curso", el adoptado y "sin confirmar".
- El encabezado muestra "Administrar House" solo con `known` + cap.

### Tests y gates (output pegado, por área tocada)

- Agregados: 48 tests (1101 → 1149, 62 → 65 archivos).
- **`HouseAdminPage.test.tsx`** (7; `useHouseCap` mockeado y el panel sustituido por un stub):
  - T5-1: sin cuenta, el texto fijo dentro de `section.house-admin` y `useHouseCap` sin llamar.
  - T5-2:
    - `unknown` cargando ⇒ solo "Cargando…";
    - con `ReadDataError` `incomplete` ⇒ "El nodo no completó la búsqueda del HouseCap; reintenta";
    - con `invariant` ⇒ el texto genérico;
    - en los dos errores, "Reintentar" llama a `refetch` y nunca aparecen `.house-no-permission` ni el panel.
  - T5-3:
    - `known` + `null` ⇒ `.house-no-permission` con el texto fijo, sin `.house-config`, sin `[data-house-action]` y sin
      panel; "Volver a comprobar" llama a `refetch`;
    - con `isFetching`, el botón queda deshabilitado y "Reintentando… (intento 2 de 3)" aparece encima.
  - H-2 a nivel página: con el cap, el panel se monta con su `capId`; con una relectura en error, la alerta va encima y el
    panel sigue montado.
- **`HouseAdminPanel.test.tsx`** (27; hooks mockeados):
  - T5-4: "Comisión: 250 bps (2.5 %)", "Apuesta mínima: 0.002 SUI", "Apuesta máxima: 10 SUI", "Comisiones acumuladas:
    0.01 SUI", "Versión de la House: 1". "Actualizar" relee la House y el cap. Sin dato de la House se ve solo "Cargando…",
    sin acciones.
  - T5-6:
    - el campo arranca con la comisión actual, " = 2.5 %", el botón deshabilitado y sin error hasta tocarlo, y el aviso
      fijo;
    - `''`, `' 250'`, `'-1'`, `'2.5'`, `'1001'` y `'250'` muestran cada uno su texto de §1, sin resumen y con el botón
      deshabilitado;
    - con la actual en 0 y `250`: " = 2.5 %", el resumen "De 0 bps (0 %) a 250 bps (2.5 %)", y el envío
      `{ capId, feeRate: 250 }`.
  - T5-7:
    - los campos arrancan con los límites actuales y el botón deshabilitado;
    - los 8 errores por campo de §1 (incluidos `negative`, `too_many_decimals`, `too_large` y `zero_min`);
    - los dos de par, `min_above_max` y `unchanged` (`10.0` = `10`);
    - el resumen "De 0.002–10 SUI a 0.003–20 SUI", el aviso fijo y el envío en MIST.
  - T5-8: con 0, "Retirar 0 SUI a tu cuenta" deshabilitado y "No hay comisiones para retirar."; con 0.01 SUI, "Retirar
    0.01 SUI a tu cuenta", la nota fija y `withdraw({ capId })`.
  - Candado: con `busy`, los tres botones deshabilitados y sin `IN_FLIGHT_TEXT`; con `in_flight`, el texto una sola vez;
    "sin confirmar" ⇒ una alerta y "Ya la revisé", que llama a `acknowledge`.
- **`HouseAdminPanel.machine.test.tsx`** (6; `useHouseCap`, `useHouse`, `useTxTarget` y las tres acciones reales, con
  la House y el cap de la fixture). La House lleva `fees_collected` 0,01 SUI, escrito sobre los bytes reales en el offset
  del campo:
  - T5-1: sin cuenta, 0 `listOwnedObjects` y 0 `getObject`.
  - T5-5: `updateFeeRate` termina en éxito con el evento real y la invalidación de H-5 relee el cap, que esta vez llega
    con dos caps (`invariant`). Resultado: la alerta aparece encima, `.house-config` sigue montada y el bloque `fee`
    conserva el texto de éxito, el digest (`code[title=<digest>]`) y "Costo de red:".
  - T5-9 (H-6): con `deferred` en preflight, firma, confirmación y `waitForCheckpoint`, cada etapa muestra su texto y en
    ninguna aparece "Comisión actualizada", ni en el bloque ni en la página. Al final aparece "Comisión actualizada: de 0
    bps (0 %) a 250 bps (2.5 %). Las partidas ya creadas conservan la suya.", del evento real y no del valor escrito (260).
  - T5-10: dos vistas montadas con los tres botones habilitables. La primera lanza el retiro: en ella, los tres botones
    deshabilitados y **sin** `IN_FLIGHT_TEXT`; en la otra, los tres deshabilitados e `IN_FLIGHT_TEXT` una vez.
  - T5-11: un retiro "sin confirmar" ⇒ un solo "Ya la revisé" y una sola alerta "…la red no la confirmó todavía…", con los
    tres botones deshabilitados. Al pulsarlo desaparece y los tres quedan habilitados.
  - T5-12: la vista que mira, montada antes, adopta el `updateBetLimits` de la otra con su texto "Límites actualizados:
    mínimo 0.002 SUI, máximo 10 SUI (antes 0.001–50 SUI)." en su bloque `limits`, sin texto en `fee`.
- **`Header.test.tsx`** (+6), T5-13: enlace `/admin` con `known` + cap. Sin enlace con `no_account`, `unknown` cargando,
  `unknown` en error y `known` + `null`; "Mis partidas" sigue en todos. Con el cap conocido y `status` error, el enlace sigue.
- **`App.test.tsx`** (+2), T5-14: `/admin` monta la página (`h2` y el texto sin cuenta); `/nada` sigue en "Página no
  encontrada".
- T5-15: `grep -rn "@mysten/" app/src/components/HouseAdminPanel.tsx app/src/pages/HouseAdminPage.tsx` sale vacío.
- Verificación extra: probé una mutación temporal en `HouseAdminPanel.tsx`, con `adoptedHouseStatus` devolviendo `null`
  para `updateBetLimits`, y T5-12 dio rojo (`1 failed | 5 passed`). Restauré el archivo (SHA-1 `OK`).
- Tests viejos: en `Header.test.tsx` y `App.test.tsx` solo hay setup y casos agregados; la única línea quitada es el import
  de `vitest`, que ahora suma `beforeEach`. Los 1101 anteriores pasan.

**Gate de la app** (desde `<repo>`, con `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH`; output completo
de la corrida final sobre el árbol entregado):

```text
$ node --version
v26.13.0
$ npm --version
11.20.0
$ npm ci

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
[exit=0]
$ npm audit signatures
audited 292 packages in 7s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

[exit=0]
$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
[exit=0]
$ npm run lint -w app

> lint
> eslint . --max-warnings 0

[exit=0]
$ npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

[exit=0]
$ npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  65 passed (65)
      Tests  1149 passed (1149)
   Start at  04:13:39
   Duration  18.05s (environment 60%, tests 15%, import 10%, setup 9%, transform 5%)

Environment  jsdom was created 65 times · 102.79s total, 60% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[exit=0]
$ VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 606 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Bu8RVLO7.js   917.01 kB │ gzip: 277.41 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 401ms
[exit=0]
$ git status --porcelain --untracked-files=all
 M app/src/App.test.tsx
 M app/src/App.tsx
 M app/src/components/Header.test.tsx
 M app/src/components/Header.tsx
?? app/src/components/HouseAdminPanel.machine.test.tsx
?? app/src/components/HouseAdminPanel.test.tsx
?? app/src/components/HouseAdminPanel.tsx
?? app/src/pages/HouseAdminPage.test.tsx
?? app/src/pages/HouseAdminPage.tsx
$ git diff --exit-code -- contracts/ app/src/sui/ app/src/hooks/ app/src/components/GameActions.tsx package.json app/package.json package-lock.json
[exit=0]
```

- **Build:** `index-*.js` pasa de 902.36 a **917.01 kB** (273.84 → 277.41 kB gzip; +14.65 kB), porque ahora entran al
  bundle la página, el panel y los hooks de TASK-2..4. El aviso de chunk mayor de 500 kB es el de siempre (#15). Es una
  referencia, sin umbral.
- **Lint y typecheck:** lint 0, sin `eslint-disable`, `useRef`, `useEffect` ni `dangerouslySetInnerHTML`. Una corrida
  previa del gate dio typecheck rojo en el test unitario del panel: la inferencia de `txHook<T>()` daba `T` sin `| null`.
  Le pasé el genérico explícito, y lo pegado es la corrida final.
- **Dependencias:** sin delta.
- **Sincronización:** la tabla de contrato y `app/src/sui/` no aplican.

### Verificación manual (localnet / testnet, digests de tx si hubo)

No aplica: sin localnet (el smoke del ciclo va después de TASK-6). No toqué procesos ni puertos de `-issue15`.

### Desviaciones del handoff

1. - Qué cambió: los campos arrancan con los valores actuales (comisión en bps, límites en SUI con `formatMist`) y los
     errores aparecen recién al tocar el campo, como en `CreateGameForm`. El " = x %" en vivo se ve con un valor válido o
     igual al actual. El resumen aparece solo con la validación en verde, en un `<p class="house-summary">`, una clase
     nueva fuera de la lista de §1.
   - Por qué: §3 no fija el valor inicial. Con el actual precargado, el botón nace deshabilitado (`unchanged`) y cambiar un
     solo límite no obliga a reescribir el otro. La clase nueva permite a los tests y al smoke ubicar el resumen.
   - Verificación extra realizada: T5-6 y T5-7 (estado inicial, cada error y el resumen). Ningún texto ni selector de §1
     cambió.
2. - Qué cambió: el resultado adoptado se muestra dentro del bloque `[data-house-action]` de su acción, como un
     `TransactionStatus` más, y no en un lugar común del panel.
   - Por qué: así queda junto al botón y al estado de esa acción, igual que el propio.
   - Verificación extra realizada: T5-12 (adoptado en `limits` y nada en `fee`).
3. - Qué cambió: "Actualizar" de la configuración llama a `useHouseCap().refetch` desde un segundo observador dentro del
     panel, como pide §3.3, y relee también la House. El retiro es un `<div data-house-action="withdraw">` con un
     botón, no un `<form>`, porque no tiene campos.
   - Por qué: la firma del panel queda `{ capId }` (§4). Con `staleTime` 0, montar ese observador puede sumar un
     `ListOwnedObjects` al entrar al panel (el paso 3 del smoke ya dice "≥ 1, anotado").
   - Verificación extra realizada: T5-4 ("Actualizar" llama a los dos `refetch`) y T5-5.
4. - Qué cambió:
     - `Header.test.tsx` suma el mock de `useHouseCap`, con `no_account` por defecto en un `beforeEach`, y su import de
       `vitest` suma `beforeEach`;
     - `App.test.tsx` suma el mock y el default en su `beforeEach`.
   - Por qué: `Header` ahora llama a `useHouseCap` (§4 lo prevé: "mockean `useHouseCap`"). Sin el mock, los 7 tests
     viejos de esos archivos fallaban al no tener cliente.
   - Verificación extra realizada: ninguna aserción vieja cambió y los 7 tests viejos pasan.

### Riesgos / pendientes

- No hay estilos nuevos en `index.css`: el panel usa las clases de siempre (`hint`, `field-error`, `tx-status`). Si el smoke
  muestra un problema visual, se ajusta allí.
- El texto de un fallo de preflight sin el cap (V-11, T4-15) incluye direcciones del nodo. Se muestra tal cual, igual que
  el resto de "No se pudo preparar la transacción: …".

### Documentación

- READMEs / `agents.md` actualizados: no aplica en TASK-5. TASK-6 documenta en `app/README.md` la ruta `#/admin`, sus
  estados, los textos y el enlace del encabezado.
- Snippet propuesto para `documents/STATUS.md` (fila de #14):

  > #14 TASK-5 ✅ (2026-11-04): `#/admin` con `HouseAdminPage` (`key={address}`; `unknown` ⇒ solo `ReadState`, `known` +
  > `null` ⇒ "Sin permisos" con "Volver a comprobar", con cap ⇒ el panel, que una relectura fallida no desmonta),
  > `HouseAdminPanel` (configuración, comisión en bps con el % en vivo, límites, retiro total; resumen "De X a Y" y botón
  > deshabilitado si no cambia; resultado solo del evento confirmado, también el adoptado) y el enlace "Administrar House"
  > solo con el cap conocido. App 1149 tests en 65 archivos (+48), build 917.01 kB; lint 0.

---

## Revisión TASK-5: PASA

> MID, 2026-11-04. Revisado contra el diff real (`app/src/pages/HouseAdminPage.tsx`, `app/src/components/HouseAdminPanel.tsx`,
> `App.tsx`, `Header.tsx` y los tests nuevos y cambiados, sin commitear sobre `9ce0594`) y el output pegado. No corrí gates.

**Checklist de §5, con los focos pedidos:**

- **H-2, estados de la página: cumplido.** `HouseAdminView` (`HouseAdminPage.tsx:15-40`): sin cuenta ⇒ el texto fijo;
  `unknown` ⇒ **solo** `ReadState` (`:20`); `known` + `null` ⇒ `ReadState` encima + `.house-no-permission` con "Volver a
  comprobar" (`refetch`, deshabilitado con `isFetching`), sin datos de la House (P-1); `known` + cap ⇒ `ReadState` encima +
  `HouseAdminPanel`. La página monta `<HouseAdminView key={address} />`.
- **El panel no se desmonta ante una relectura fallida: cumplido.** La rama del panel depende solo de `cap.kind === 'known'`,
  que `useHouseCap` conserva aunque falle la relectura (T4-4); el error va como `ReadState` encima. T5-5 lo prueba con los
  hooks y la máquina reales: tras un éxito, la relectura del cap que falla deja el panel montado, el error encima y el
  `TransactionStatus` con su texto, digest y costo. La House sigue la misma regla dentro del panel
  (`HouseAdminPanel.tsx:314-336`: `ReadState` solo sin dato; con dato, encima de la configuración).
- **SEG-10, el texto de éxito sale solo del evento: cumplido.** Los textos de éxito se arman con `tx.outcome.value` (el
  `interpret` del evento confirmado) o, sin evento, con el texto honesto sin valores (`:67-81`); mientras no hay `outcome`,
  `TransactionStatus` solo muestra la etapa. El **adoptado** usa las mismas funciones sobre `adopted.outcome.value`
  (`adoptedHouseStatus`, `:89-103`, un `case` por acción y sin `default`). T5-9 (máquina real): ningún texto de éxito en
  `preflight`/`signing`/`confirming`/`indexing`, y después el del evento.
- **Un solo aviso o alerta por vista: cumplido.** Una sola `useTxTarget({ kind: 'house' })` en el panel; `IN_FLIGHT_TEXT` una
  vez y solo con `notice.kind === 'in_flight'` (nunca por la propia, T5-10); una sola alerta "sin confirmar" con "Ya la
  revisé" (T5-11); el adoptado se dibuja una vez, en el bloque de su acción (`AdoptedStatus` compara `action`), y la máquina
  lo descarta en cuanto la vista lanza una propia (T5-12).
- **Enlace del encabezado: cumplido.** `Header.tsx`: `isAdmin` = `account` + `known` + cap no `null`; no aparece sin cuenta,
  con `unknown` ni con `known` + `null`, y se mantiene con el cap conocido y una relectura fallida (T5-13). Los cambios de
  `Header.test.tsx`/`App.test.tsx` solo suman el mock de `useHouseCap` y casos (desviación 4); la única línea quitada es un
  `import` reescrito.
- **Capas: cumplido.** `HouseAdminPanel.tsx` y `HouseAdminPage.tsx` no importan `@mysten/*`; `Header.tsx` solo
  `@mysten/dapp-kit-react/ui`, como antes. Los componentes importan de `sui/` solo funciones puras y tipos (validaciones,
  formato), como `GameActions`.
- **Desviación 3: aceptada, con una nota para el smoke.** El panel llama otra vez a `useHouseCap()` para que "Actualizar"
  relea también el cap: es un segundo observador de la **misma** clave (sin consulta nueva), pero con `staleTime` 0 relee al
  montarse, así que entrar al panel puede sumar un `ListOwnedObjects`, y "Actualizar" suma otro. Es barato y no cambia
  ningún estado visible (la relectura con dato no desmonta nada). El smoke los cuenta como informativos (v1.4). El retiro
  como `div` (sin formulario) es correcto: no tiene campos.
- **Desviaciones 1, 2 y 4: aceptadas.** La 1 (campos precargados con los valores actuales y `.house-summary`) es mejor UX y
  hace que el botón arranque deshabilitado (`unchanged`); el error solo aparece al tocar (`touched`). Obliga a un ajuste del
  smoke: seleccionar el contenido antes de `Input.insertText` (v1.4). La 2 (adoptado en el bloque de su acción) cumple "una
  vez por vista".
- **Tests y gates.** +48 (1149 en 65 archivos): T5-1..T5-15 presentes, con un `HouseAdminPanel.machine.test.tsx` sobre la
  máquina real para T5-5, T5-9..T5-12. Lint 0 y typecheck 0; build 917.01 kB (+14,65 kB: ahora la app importa la capa de
  #14), con el aviso de chunk de siempre (#15). Sin delta en `contracts/`, `sui/`, `hooks/` ni dependencias.

### Hallazgos

Ninguno de código.

**Cambios del handoff (v1.4), por lo que trae TASK-5:**
1. Campos precargados: en el smoke, `el.focus(); el.select()` antes de `Input.insertText` (si no, "0" + "250" = "0250").
2. Conteos de `ListOwnedObjects` del smoke: informativos (encabezado y panel observan el cap).
3. Orden: el smoke corre **antes** de TASK-6 (abajo). `documents/SMOKE_HOUSE_ADMIN.md` creado con estado "EN CURSO" (copia
   de la sección del handoff v1.4, con las referencias a §1 apuntando al handoff).

### Siguiente paso

- **Smoke ahora, en la localnet aislada, y después TASK-6.** El código del ciclo está completo con TASK-5: TASK-6 es solo
  docs y no cambia nada que el smoke ejercite. Correrlo antes tiene dos ventajas: si encuentra algo, la corrección de
  código va antes de escribir los READMEs (no hay que reescribirlos), y TASK-6 puede citar lo medido (latencias de
  confirmación, cuántos "Volver a comprobar" hicieron falta, pedidos por acción). Runbook: `documents/SMOKE_HOUSE_ADMIN.md`.
- **TASK-6 autorizado**, para después del smoke (un DEV a la vez en el mismo árbol, D-20261030-04). Si el owner prefiere el
  orden del handoff v1.3, TASK-6 puede ir primero sin riesgo: solo se perderían los valores medidos en los READMEs.

### Mensaje de commit propuesto

```
feat(app): add the House admin page and header link (#14)

TASK-5 of the House admin panel: #/admin with HouseAdminPage (no
account, unknown cap only shows the read state, no permission with a
re-check button, the panel otherwise) and HouseAdminPanel (House
configuration in bps and %, fee and bet-limit forms with mirror
validation and a from/to summary, full withdraw to the signing
account). One transaction target for the three actions: one in-flight
notice, one unconfirmed alert, adopted results with the same event
texts. A failing reread never unmounts the panel. "Administrar House"
shows in the header only for a known cap holder.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Para el handoff v1.4 y el SMOKE, en un commit aparte:

```
docs: house admin handoff v1.4 and smoke runbook (#14)

Run the smoke after TASK-5 and before TASK-6, select prefilled fields
before inserting text, and treat ListOwnedObjects counts as
informative. Add documents/SMOKE_HOUSE_ADMIN.md (EN CURSO).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

### Snippet para STATUS.md

> #14 TASK-5 ✅ (2026-11-04, revisión MID PASA): `#/admin` (`HouseAdminPage` con los estados de H-2, "Volver a comprobar") y
> `HouseAdminPanel` (configuración, comisión, límites y retiro; un objetivo, un aviso, una alerta, adoptado con el texto del
> evento); enlace "Administrar House" solo con el cap conocido. App 1149 tests en 65 archivos (+48), build 917.01 kB.
> Smoke en localnet antes de TASK-6 (handoff v1.4).
