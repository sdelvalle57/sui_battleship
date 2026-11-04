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
