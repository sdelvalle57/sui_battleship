# REPORTES_MULTIGAME

> Reportes de los DEV y revisiones del MID de #73 (plataforma multijuego), en orden. Los reportes `.txt` del DEV se transcriben **sin editar** (el orquestador los lee enteros y corre los greps §R-6 antes de agregarlos); las revisiones del MID van tal cual. Plan: `documents/PLAN_MULTIGAME.md`; handoff: `documents/HANDOFF_MULTIGAME.md`. Estos archivos se borran en el housekeeping al cerrar el ciclo (siguen en el historial de git).


---

## 1. TASK-1a (reporte del DEV)

> DEV, TASK-1a: ensayo de upgrade en la localnet aislada (puerto 19000).

~~~~text
## Task completado: HANDOFF_MULTIGAME — TASK-1a

Convenciones de este reporte: <repo> = worktree de la branch feature/issue-73-multigame; <HOME real> = home del usuario; <SMOKE_DIR> = carpeta de la corrida dentro del scratchpad (ya borrada); <scratchpad> = scratchpad de la sesion. Los comandos van tal como se corrieron salvo que las rutas absolutas literales se reemplazaron por esos placeholders. Direcciones de cuentas de la genesis: ninguna en este reporte (solo viven dentro de las fixtures nuevas). Todo comando de la CLI llevo delante el guard de entrada n por stdin (printf 'n\n' |), via suic/suic_v1 o directo. Resultado de los gates y de cada V: ver abajo. Ningun STOP, ninguna ejecucion accidental de la CLI.

### Branch (con SHA corto del HEAD)
feature/issue-73-multigame @ e13856c (worktree <repo> = Battleship-issue73). Sin commits ni git add (el orquestador commitea).

### Baseline medido y árbol de partida
- git status al inicio: limpio. HEAD e13856c. git merge-base --is-ancestor 8cc35ab HEAD -> estado 0 (PRE-1 integrado). git diff 26f2676..HEAD --stat -- contracts/sources -> vacio (cero cambios de fuentes del contrato).
- CLI de la maquina: sui 1.84.0-9dc25070cf2e (la de ci.yml). Node v26.13.0 (export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version -> v26.13.0).
- Medido en <repo> (cd contracts && printf 'n\n' | sui move ... con la forma canonica de agents.md §3):

| Gate | Resultado medido | §0 del handoff | Delta |
|---|---|---|---|
| sui move build -e testnet --warnings-are-errors | exit 0, 0 warnings | 0 warnings | ninguno |
| sui move build -e testnet --lint --warnings-are-errors | exit 0, 0 lints | 0 lints | ninguno |
| sui move test -e testnet --warnings-are-errors | Total tests: 83; passed: 83; failed: 0 (26 house_tests + 57 game_tests, contados por modulo) | 83 (26+57) | ninguno |
| git diff --exit-code -- Move.lock Published.toml | exit 0 | sin delta | ninguno |
| node --test scripts/*.test.mjs (contracts) | tests 104, pass 104, fail 0 | 104 | ninguno |
| node scripts/publish.mjs check | "1 despliegue(s) válidos y coherentes con Published.toml" | 1 despliegue(s) | ninguno |
| npm ci (raiz, Node 26.13.0) | ok | - | - |
| npm audit signatures | 143 packages have verified attestations | - | informativo |
| npm audit (con dev) | 1 aviso moderate (minimatch 7.0.0-11.0.0, solo dev); npm audit --audit-level=high -> exit 0 | STATUS: avisos moderate solo dev aceptados hasta #35 | ninguno |
| npm run lint -w app | exit 0 (eslint . --max-warnings 0, sin salida) | 0 problemas | ninguno |
| npm run typecheck -w app | exit 0 (tsc sin errores en los dos tsconfig) | 0 errores | ninguno |
| npm test -w app | Test Files 66 passed (66); Tests 1246 passed (1246) | 1246 en 66 | ninguno |
| VITE_SUI_NETWORK=testnet npm run build -w app | dist/assets/index-B3BeMVQC.js 917.80 kB (gzip 277.96 kB) | 917.80 kB (277.96 kB) | ninguno |
| Docker (docker ps -aq / docker images -aq) | 5 contenedores / 17 imagenes (4 corriendo; 0 imagenes <none>) | 5 / 17 | ninguno |
| Gas de publicar (medido en la localnet, PV 142) | computo 1000000 + storage 46246000 = 47246000 MIST (publicado con el binario 1.83.0) | 47246000 | ninguno |

El baseline medido coincide con la tabla de §0: sin rojos, sin delta. Es el baseline para TASK-1b en adelante.
Tras los gates se borraron los artefactos ignorados por git que crearon (contracts/build, app/dist); node_modules (ignorado) queda en el worktree.

### Archivos modificados/creados (git diff --stat / git status)
git diff --stat: vacio (solo hay archivos nuevos sin trackear; ningun archivo trackeado cambia). git status --porcelain --untracked-files=all:
?? contracts/scripts/fixtures/Published.upgrade-before.localnet.toml
?? contracts/scripts/fixtures/Published.upgrade.localnet.toml
?? contracts/scripts/fixtures/localnet-upgrade-dry-run.json
?? contracts/scripts/fixtures/localnet-upgrade-retry-error.txt
?? contracts/scripts/fixtures/localnet-upgrade.json
git diff --exit-code -- contracts/Move.lock contracts/Published.toml contracts/sources contracts/tests contracts/deployments -> exit 0. Move.lock no se modifico en ninguna corrida del worktree. test ! -e contracts/deployments/localnet.json -> 0; ! compgen -G 'contracts/Pub.*.toml' -> 0.

### Qué se implementó (3 líneas)
Ensayo en una localnet aislada (puerto 19000, Receta P): v1 = árbol 26f2676 publicado con el binario 1.83.0 verificado; v2/v3 sandbox con la CLI 1.84.0 (módulo nuevo que llama a house::add_fees, init de módulos nuevos, PTB del upgrade, reintento con pubfile viejo). Evidencias V-16, baseline, V-2 (diff de bytecode), V-1, V-8, V-10 y V-11, todas PASA. Entregable commiteable: 5 fixtures reales en contracts/scripts/fixtures/ (el orquestador commitea); cero código de producción.

### Tests y gates
No hay tests nuevos del repo (TASK-1a solo produce evidencias). Despues de agregar las fixtures: node --test scripts/*.test.mjs -> tests 104, pass 104, fail 0; node scripts/publish.mjs check -> "1 despliegue(s) válidos y coherentes con Published.toml". Tablas de contrato / app/src/sui: no aplica. git diff --exit-code de house.move, game.move y Move.lock: exit 0.

### Verificación manual / evidencias específicas (V-n con veredicto)

Entorno de la corrida (Receta P + Receta V1):
- ss -ltn | grep ':9000 ' -> 2 lineas LISTEN (0.0.0.0:9000 y [::]:9000): ocupado por un servicio de otro proyecto del host, NO se tocó (ni una llamada contra el). ss -ltn | grep -c ':19000 ' -> 0 (libre).
- env.sh en <SMOKE_DIR> con RPC_URL=http://127.0.0.1:19000, smoke_guard_pre, smoke_guard (exige RPC exacto), suic, act_as y, de la Receta V1, SUI_V1 (ruta literal del binario 1.83.0 verificado), suic_v1 y smoke_guard_v1.
- Genesis sin ningun suic: . <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?" -> exit=0.
- Arranque (comando en segundo plano del harness): . <SMOKE_DIR>/env.sh && smoke_guard_pre && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" --fullnode-rpc-port 19000 > "$SMOKE_DIR/sui-start.log" 2>&1 . El proceso (PID 2639955) mostro como linea de comando la CLI 1.84.0 con --fullnode-rpc-port 19000; el puerto 19000 paso a LISTEN; sui-start.log quedo de 0 lineas (sin ERROR/panic/Address already in use).
- Solo despues: . <SMOKE_DIR>/env.sh && smoke_guard && echo GUARD1_OK && suic chain-identifier -> GUARD1_OK, Base58 9KGee6DvLT9TsUdSC3P2xdP4q1WwLXRPBr5SVcRR2pcq, Hex 7b8ba4f1; smoke_guard_v1 -> GUARD_V1_OK.
- Con ambos binarios: active-env = localnet; suic --json envs y suic_v1 --json envs: alias localnet, rpc http://127.0.0.1:19000, chain_id 7b8ba4f1 (el alias del config aislado lo reescribio sui start con el flag, como dice agents.md §3). El cliente 1.83.0 habla sin problemas con la red levantada por la 1.84.0 (chain-identifier del 1.83.0 = 7b8ba4f1): no hay STOP de la Receta V1 paso 4; el envs --json del 1.83.0 tiene la forma que usa smoke_guard_v1.

#### V-16 — binario 1.83.0 oficial: PASA
Desviación declarada: NO se descargaron 1.1 GB. suiup conservaba en su cache el tgz y el binario del release testnet-v1.83.0, y se verificaron contra los valores de git show 88dd53b:.github/workflows/ci.yml (líneas 24-25) y contra la tabla de STATUS (misma fuente histórica) ANTES de ejecutar nada:
- Valores esperados: SUI_TGZ_SHA256 = e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8 ; SUI_BIN_SHA256 = 29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa .
- Comandos: mkdir -p <SMOKE_DIR>/dl183 <SMOKE_DIR>/bin183 ...; cp <HOME real>/.cache/suiup/releases/sui-testnet-v1.83.0-ubuntu-x86_64.tgz <SMOKE_DIR>/dl183/ && cd <SMOKE_DIR>/dl183 && sha256sum *.tgz
  -> e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8  sui-testnet-v1.83.0-ubuntu-x86_64.tgz   (= SUI_TGZ_SHA256: COINCIDE)
- cd <SMOKE_DIR>/bin183 && tar -xzf ../dl183/sui-testnet-v1.83.0-ubuntu-x86_64.tgz ./sui (solo ./sui, como ci.yml:51-59; el tgz trae ./sui en la raiz, no sui-release/) && sha256sum sui <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.83.0
  -> 29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  sui                                  (= SUI_BIN_SHA256: COINCIDE)
  -> 29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  <HOME real>/.local/share/suiup/binaries/testnet/sui-v1.83.0   (copia de suiup identica al extraido)
- Constancia: el binario 1.83.0 NO se ejecuto antes de esa verificacion; su primera ejecucion fue smoke_guard_v1 (con el prefijo aislado, ya con la red 1.84.0 arriba y los dos hashes verificados). Ninguna llamada al 1.83.0 sin el prefijo (HOME y SUI_CONFIG_DIR aislados, smoke_guard && smoke_guard_v1). suiup remove/cleanup: no se usaron.
- Version: printf 'n\n' | "$SUI_V1" --version -> sui 1.83.0-16d2dc1e05ed (= la esperada). printf 'n\n' | "$SUI" --version -> sui 1.84.0-9dc25070cf2e.

#### v1 (publicación con el binario 1.83.0): PASA
git archive 26f2676 contracts | tar -x -C <SMOKE_DIR>/v1 (arbol del sourceCommit con su Move.lock, framework rev 05ad86a3e86c522deea116f80dc2bf2309a53363 = PV 140; el Move.lock de HEAD pinea e6f43880f4b65e2c1f0397583a9690b4b22c9223 = PV 142).
Comando: . <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && smoke_guard_v1 && act_as "$ADMIN" && cd <SMOKE_DIR>/v1/contracts && suic_v1 --json test-publish --pubfile-path <SMOKE_DIR>/Pub.localnet.toml --build-env testnet > <SMOKE_DIR>/v1-publish.json 2> <SMOKE_DIR>/v1-publish.err ; exit=0. stderr: "INCLUDING DEPENDENCY MoveStdlib / INCLUDING DEPENDENCY Sui / BUILDING battleship" (no descargo el framework: estaba en la cache de MOVE_HOME).
Salida (jq sobre el --json, recortada a lo relevante; el JSON completo tiene la misma forma que localnet-publish.json):
  status success; gasUsed computationCost 1000000, storageCost 46246000, storageRebate 0 (=47246000 MIST, igual que §0); digest 2PdWdEqfzBoiCCKSKZnZQvPdiB6HKPAnGUdZquFKAsme
  created: HouseCap (0x05205559acdc66ed47a8c2dad8f0cdbc799597c2843eb2e00779816503535cec), UpgradeCap (0x599718fb636381effbc379131907ab6c6facff02c4542206c41472369d713fbd), House (0x9b97ba7d22d287be248b0bb0527a629bbb615ba057eb3651877c4d1db9297d3a), Publisher (0xb00905509f201e663ea3315b2c77d14bf6919c550651d9ae53bedc830bde6177); published packageId 0xb622ea17e78ed309ca071bfde55c8ab5829871730660f5394e0b6f5c28bce152.
Pubfile resultante (Pub.localnet.toml; el campo source tiene la ruta de la corrida, aqui con placeholder): build-env = "testnet"; chain-id = "7b8ba4f1"; [[published]] source = { local = "<SMOKE_DIR>/v1/contracts" }; published-at = original-id = 0xb622ea17...e152 (el id del paquete); version = 1; toolchain-version = "1.83.0"; build-config = { flavor = "sui", edition = "2024" }; upgrade-capability = 0x599718fb...3fbd.
House en la red: suic --json object <House> -> content: fee_rate 0.0, fees_collected "0", max_bet "50000000000", min_bet "1000000", version "1".

#### V-2 / N-7 — diff de bytecode de house y game: PASA (diferencia explicada)
Se compiló con printf 'n\n' | "$SUI_V1" move build -e testnet (v1a, con el prefijo de la Receta V1) y con printf 'n\n' | "$SUI" move build -e testnet (v1b, CLI de PRE-1), ambos sobre copias recién extraídas de git archive 26f2676 contracts; y con la CLI de PRE-1 sobre git archive HEAD contracts (v2). Los tres compilan exit 0 y el Move.lock de v1a/v1b queda igual al del arbol (sin delta). sha256sum de bytecode_modules/*.mv:
  v1  (test-publish con 1.83.0, arbol 26f2676): game.mv 6ef491fbfd54ad6cf29be7e7084cfd1b102fff52c6756fda8971fda026077933 ; house.mv 7bea0c6b4097b21b8e02461316021b706054347ea65f11bc13fdf8ed870cefb6
  v1a (build 1.83.0, 26f2676):                game.mv 6ef491fb...7933 (igual) ; house.mv 7bea0c6b...efb6 (igual)
  v1b (build 1.84.0, 26f2676, mismo Move.lock PV 140): game.mv 6ef491fb...7933 (igual) ; house.mv 7bea0c6b...efb6 (igual)
  => el compilador 1.84.0 produce EXACTAMENTE el mismo bytecode que el 1.83.0 para house y game (mismo lock).
  v2  (build 1.84.0, HEAD tal cual, con Move.lock PV 142 y su Published.toml de testnet): game.mv 477c83e52942f83e88d6cbbf4d6087b6f32cd886b0d985a1fac740b939a7a9ab ; house.mv 730ead04512db0424698fd7af8ed558af40d2f8b7b40f6e5430574a9716dc585 (DIFIEREN de v1).
Explicacion de la diferencia v1 vs v2 (desensamblado con printf 'n\n' | "$SUI" move disassemble <.mv>): el diff del desensamblado de house y de game es SOLO la linea "module 0.house {" -> "module <direccion del paquete de testnet>.house {" y "use 0000...0::house;" -> "use <direccion>::house;" (game): el HEAD trae Published.toml con la direccion de testnet, que el compilador embebe como direccion propia; el v1 publicado se compila con direccion 0 (la CLI la reemplaza al publicar). Control para aislarlo: v2c = git archive HEAD contracts SIN Published.toml, build -e testnet con la 1.84.0 -> game.mv 6ef491fb...7933 y house.mv 7bea0c6b...efb6 (IGUALES al v1), y los desensamblados de house y game iguales al v1 (house_disasm_iguales, game_disasm_iguales). => El framework PV 142 del Move.lock nuevo tampoco cambia el bytecode de house/game.
Con el modulo nuevo (v2 sandbox, ya con el upgrade hecho, build dir de <SMOKE_DIR>/v1/contracts): game.mv = 6ef491fb...7933 (IGUAL al v1); house.mv = aa3058697d4e827714ce9802ced2609dd05faae505fc6cce5da6464baf65b0bc (1802 bytes vs 1787 del v1). El unico cambio de house es la lista de amigos: disassemble --Xdebug muestra friend_decls con 1 entrada en el v1 (el modulo game, IdentifierIndex(27)) y 2 en el v2 (game + el modulo nuevo, IdentifierIndex(48)), mas el corrimiento de indices del pool de identificadores (+1 desde el nuevo identificador); ningun cuerpo ni firma cambia (add_fees sigue "public(friend) add_fees(house: &mut House, fees: Balance<SUI>)" en ambos). Esto es exactamente lo esperado por plan §3.1 (el house nuevo trae al modulo nuevo en la lista de amigos). Informado: ninguna otra diferencia.

#### V-1 — un módulo nuevo de un upgrade llama a house::add_fees: PASA
v2 sandbox = git archive HEAD contracts | tar -x -C <SMOKE_DIR>/v2 mas el modulo descartable sources/sandbox_fees.move (solo en <SMOKE_DIR>): entry fun deposit(house: &mut House, coin: Coin<SUI>) { house::add_fees(house, coin.into_balance()); } y un init que crea un objeto SandboxMarker. house.move y game.move intactos (diff -rq de sources contra v1: iguales).
Hallazgo de proceso (importante para TASK-4/5, ver Riesgos): el pubfile de test-publish se indexa por la ruta de la fuente (source.local); el upgrade debe correr desde ESA ruta. Intentos desde <SMOKE_DIR>/v2/contracts con el pubfile del v1:
  suic --json test-upgrade --pubfile-path <SMOKE_DIR>/Pub.localnet.toml --build-env testnet --dry-run   -> exit=1, stdout: "Cannot determine the publication information. Please pass the upgrade cap with `-c <UPGRADE_CAP>`."
  suic --json test-upgrade -c <UpgradeCap> --pubfile-path ... --build-env testnet --dry-run           -> exit=1, stdout: "Cannot upgrade package without having a published id " (el -c NO lo resuelve).
Dos formas que SI funcionan y dan salida identica (dry run, effects success, los mismos 3 comandos; diff de los JSON sin digests vacio): (a) pubfile con source.local apuntando al arbol del v2 (copia con la ruta cambiada: sed de una linea a un archivo nuevo, solo localnet); (b) copiar las fuentes del v2 sobre <SMOKE_DIR>/v1/contracts (la ruta del test-publish) y correr ahi con el pubfile original sin tocar. El upgrade real se hizo con (b).
Upgrade real (CLI 1.84.0): . <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard && act_as "$ADMIN" && cd <SMOKE_DIR>/v1/contracts && suic --json test-upgrade --pubfile-path <SMOKE_DIR>/Pub.localnet.toml --build-env testnet > <SMOKE_DIR>/v2-upgrade.json 2> <SMOKE_DIR>/v2-upgrade.err ; exit=0.
  Salida (jq): status success; digest A4smWEU3g79gVWWfr2AxHmuom7EHFgcZb71ovmMjDneN; gasUsed computationCost 1000000, storageCost 47234000, storageRebate 2621738, nonRefundableStorageFee 262; comandos: ["MoveCall","Upgrade","MoveCall"]; published packageId 0xc2e358707175dea52a29ca7e958e1c5738cc268fe874d9803a745c332882ccfa, version "2", modules ["game","house","sandbox_fees"]; created: <v2 pkg>::sandbox_fees::SandboxMarker (version 3); mutated: Coin<SUI> (gas) y 0x2::package::UpgradeCap.
  Compatibilidad: la CLI y la VM aceptan el upgrade (politica compatible, policy 0); el modulo nuevo llama a una public(package) de house sin cambiar su firma.
Llamada: suic --json ptb --split-coins gas "[1000000]" --assign coins --move-call "<v2 pkg>::sandbox_fees::deposit" @<House> coins.0 -> ok (digest 4xmsHrGZbbHLL52AAKAXK1YK7xe1oYpN49SjE6oc5Szb; tx-block --json: status success, comandos ["SplitCoins","MoveCall"], gas computo 1000000 / storage 2515600 / rebate 2515348). fees_collected de la House: antes "0" -> despues "1000000" (+1000000 MIST = el deposito). House.version sigue "1".
Nota: la salida de ptb con --json no es JSON (imprime la tabla); se uso tx-block --json con el digest.

#### V-8 — init de módulos nuevos: PASA (con un hallazgo que cambia la pregunta)
- Upgrade A (V-1): creo SandboxMarker, el objeto del init del modulo NUEVO sandbox_fees, con el prefijo del id del upgrade (0xc2e3...ccfa). No se creo ningun HouseCap, House ni Publisher: el init (con OTW) del modulo EXISTENTE house NO volvio a correr.
- Upgrade B (v3 sandbox, de las mismas fuentes + un segundo modulo nuevo sandbox_init2 con un init que crea SandboxMarker2): exit=0, status success, digest 8NQP4Bs6HzTNz6xkXm5WVoNR7Y5gENgavMHsRDSy9qhs, packageId 0x16738bac32f46efd846cf58facddb21806fa4410cd1bca49c2e9e6f59cb9e5ee, version "3", modules ["game","house","sandbox_fees","sandbox_init2"], gas computo 1000000 / storage 49894000 / rebate 2621738. created: SOLO <v3 pkg>::sandbox_init2::SandboxMarker2. El init de sandbox_fees (modulo que ya existia desde el upgrade A) NO corrio otra vez; el del modulo nuevo SI.
- Agregar un init a un modulo EXISTENTE que no tenia: el upgrade se RECHAZA. Se probo con game.move de la copia v1/v2 (solo en <SMOKE_DIR>): (i) upgrade real con una struct nueva + un fun init en game y el modulo nuevo -> exit=1, stdout "Error executing transaction 'CYujj4qdrPfCjG41bXe7fxUeRvBRps3C4anREWiYx8pa': PackageUpgradeError { upgrade_error: IncompatibleUpgrade } in command 1" (la transaccion se ejecuto y fallo; la UpgradeCap y el pubfile quedaron intactos, version 2); (ii) aislado con dry runs (effects.status): solo el modulo nuevo sandbox_init2 (game original) -> success; solo una struct nueva en game -> success; solo "fun init(_ctx: &mut TxContext) {}" en game -> failure IncompatibleUpgrade. Es decir: un init agregado a un modulo existente no corre ni puede publicarse (la politica compatible lo rechaza). Para #73 es consistente con "duel y coinflip no tienen init" y R-9; ningun modulo existente necesita uno.

#### V-10 — un solo PTB atómico y reintento con pubfile viejo: PASA
- Dry run (antes del upgrade real): suic --json test-upgrade --pubfile-path ... --build-env testnet --dry-run -> exit 0, effects.status success, gas computo 1000000 / storage 47234000 / rebate 1633837; input.transaction.kind = ProgrammableTransaction con exactamente 3 comandos: MoveCall 0x2::package::authorize_upgrade, Upgrade, MoveCall 0x2::package::commit_upgrade. El upgrade real (digest A4sm...) tiene los mismos 3 comandos: un solo PTB. El dry run NO modifica el pubfile (cmp igual). (La CLI sin --gas-budget hace primero un dry run interno.)
- Reintento con el pubfile viejo (copia del pubfile del v1, version 1): suic --json test-upgrade --pubfile-path <SMOKE_DIR>/Pub.retry.toml --build-env testnet (desde <SMOKE_DIR>/v1/contracts) -> exit=1; stdout (una sola linea, texto, no JSON): "Error executing transaction 'GH5sBfbPhhNwiJ4uQXgzP5agEfqx6nYgtSxRuH3trKKQ': PackageUpgradeError { upgrade_error: PackageIDDoesNotMatch { package_id: 0xb622ea17e78ed309ca071bfde55c8ab5829871730660f5394e0b6f5c28bce152, ticket_id: 0xc2e358707175dea52a29ca7e958e1c5738cc268fe874d9803a745c332882ccfa } } in command 1". La transaccion SE EJECUTA en la red y FALLA pagando gas (tx-block --json: status failure, computo 1000000 / storage 2622000 / rebate 2621738, comandos MoveCall/Upgrade/MoveCall); el pubfile queda sin cambio (cmp) y la UpgradeCap sigue en version 2 (suic --json object <UpgradeCap> -> package = <v2 pkg>, version "2", policy 0). No crea una version 3: coincide con plan R-2.

#### V-11 — forma del pubfile tras un upgrade y campos que cambian: PASA (alcance acotado)
test-upgrade reescribe el pubfile en el lugar (diff del pubfile del v1 contra el del v2, con la ruta de la corrida como placeholder):
  - published-at: 0xb622ea17...e152 -> 0xc2e35870...ccfa (el id del upgrade)
  - version: 1 -> 2
  - toolchain-version: "1.83.0" -> "1.84.0"
  - NO cambian: build-env "testnet", chain-id "7b8ba4f1", source.local, original-id (0xb622ea17...e152), build-config, upgrade-capability (0x599718fb...3fbd). Sigue habiendo UNA sola entrada [[published]] (no acumula historial: el upgrade B volvio a escribir published-at 0x16738bac...e5ee, version = 3).
Alcance: esto es la forma del pubfile EFIMERO de test-upgrade (cabecera "this file should not be committed"). El Published.toml con [published.testnet] que escribira sui client upgrade en testnet (formato de Published.toml de un paquete con el entorno en el manifest) NO se probo (solo test-upgrade esta autorizado y el manifest no declara localnet): lo verifica el owner en el upgrade real (V-11 lo preveia asi: "el de testnet lo escribe la CLI del owner"). Salidas --json reales guardadas como fixtures (abajo).

### Fixtures entregadas (contracts/scripts/fixtures/, sin commitear)
Salidas crudas de la CLI 1.84.0 en esta genesis desechable (cuenta efimera de la genesis, sin claves, clave destruida; el unico cambio es el reemplazo de la ruta absoluta de la corrida en source.local por <SMOKE_DIR>/..., declarado):
| Archivo | Que es |
|---|---|
| localnet-upgrade.json | stdout --json del upgrade A (v1 -> v2 sandbox), 7952 bytes, digest A4smWEU3g79gVWWfr2AxHmuom7EHFgcZb71ovmMjDneN |
| localnet-upgrade-dry-run.json | stdout --json del --dry-run del mismo upgrade, ANTES de ejecutarlo (clave "input" en vez de "transaction"; objectChanges con un id de paquete hipotetico), 7245 bytes |
| Published.upgrade.localnet.toml | pubfile DESPUES del upgrade A (version 2) |
| Published.upgrade-before.localnet.toml | pubfile ANTES (version 1, el de test-publish con 1.83.0): permite armar el caso "pubfile viejo" |
| localnet-upgrade-retry-error.txt | stdout real del reintento con el pubfile viejo (PackageIDDoesNotMatch, una linea) |
Nota para el MID/orquestador: las dos fixtures JSON traen el modulo y el tipo del sandbox descartable (sandbox_fees, SandboxMarker): el ensayo es el upgrade de un paquete con un modulo nuevo, y por eso la forma real de TASK-4 es la misma; no llevan el marcador SANDBOX_ en mayusculas (el control de TASK-5 §7 es sensible a mayusculas: no coincide) pero conviene documentarlo en contracts/README.md ("Tests") si se commitean. No se tocó contracts/README.md (no estaba en el alcance).

### Smoke: tabla de resultados (FLUJO §6)
| # | Acción | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Receta P (9000 ajeno intacto, 19000 libre, genesis sin suic, sui start --fullnode-rpc-port 19000, luego smoke_guard y smoke_guard_v1) | chain-identifier responde; active-env = localnet con ambos binarios; RPC exacto = RPC_URL | PASA (chain 7b8ba4f1; ambos guards OK; RPC http://127.0.0.1:19000) |
| 2 | V-16: hashes tgz y binario 1.83.0; version | coinciden con 88dd53b; 1.83.0-16d2dc1e05ed | PASA |
| 3 | suic_v1 test-publish del arbol 26f2676 | exito; House, HouseCap y UpgradeCap; pubfile escrito | PASA (47246000 MIST) |
| 4 | V-2 diff de bytecode | house/game iguales, o diff explicado | PASA (iguales con 1.83 vs 1.84; diferencia con HEAD = solo la direccion propia; con el modulo nuevo, solo friend_decls de house; game identico) |
| 5 | V-1 test-upgrade v2 con modulo nuevo | exito; el modulo llama a add_fees; fees_collected sube lo esperado | PASA (0 -> 1000000) |
| 6 | V-8 init | el init del modulo nuevo corre; el de uno existente no | PASA (+ init agregado a un existente = IncompatibleUpgrade) |
| 7 | V-10/V-11 | un solo PTB; reintento con pubfile viejo = PackageIDDoesNotMatch; salidas guardadas | PASA (3 comandos; fixtures) |
| 8 | Cierre (agents.md §3 paso 7) | kill por PID, ~/.sui identico, git status sin entradas de la corrida, Move.lock y Published.toml sin delta | PASA (abajo) |

### Desviaciones del handoff
1. V-16: el tgz y el binario 1.83.0 salieron del cache de suiup (<HOME real>/.cache/suiup/releases y <HOME real>/.local/share/suiup/binaries/testnet), no de una descarga de 1.1 GB; se verificaron los dos SHA-256 contra 88dd53b antes de ejecutar (autorizado por el encargo). El tgz trae ./sui en la raiz (extraido solo ese archivo a bin183), no sui-release/sui.
2. Receta del v1/v2: el upgrade tuvo que correr desde la misma ruta que el test-publish (pubfile indexado por ruta); el handoff pone v1 y v2 en carpetas distintas. Se resolvio copiando las fuentes del v2 sobre <SMOKE_DIR>/v1/contracts (y se verifico que un pubfile con source.local cambiado da el mismo dry run). Ver Riesgos.
3. Fixtures: 5 en vez de las 3 sugeridas (se agregaron Published.upgrade-before.localnet.toml y localnet-upgrade-retry-error.txt) y source.local sustituido por <SMOKE_DIR>/v1/contracts en los dos .toml.
4. V-8: se agrego la prueba del init en un modulo existente (rechazada) y un segundo upgrade (v3) para probar que el init de un modulo existente tampoco reaparece; el upgrade B real no incluye el cambio rechazado.
5. node_modules (ignorado) quedo en el worktree por el npm ci del baseline; contracts/build y app/dist se borraron.

### Riesgos / pendientes
- IMPORTANTE para TASK-4/TASK-5 (receta de TASK-5 paso 1): el pubfile de test-publish es por RUTA de la fuente (source.local). TASK-5 publica el v1 desde <SMOKE_DIR>/v1/contracts y hace despues publish.mjs upgrade desde <repo>/contracts: con el pubfile del v1 eso falla con "Cannot determine the publication information" (y -c no lo resuelve). Opciones para el handoff/TASK-4: (a) el script de upgrade corre sui client test-upgrade con cwd = la ruta registrada en el pubfile y la receta copia ahi el arbol del upgrade; (b) la receta corrige source.local del pubfile (archivo efimero de localnet) a <repo>/contracts antes del upgrade (probado con dry run, mismo resultado); (c) el v1 se publica desde <repo>/contracts con el arbol 26f2676 temporalmente (descartado: toca el worktree). Recomiendo (b) con un test, decidido por el MID/MAYOR; no lo decidi yo (diseño de TASK-4).
- El reintento con pubfile viejo paga gas aunque falle (V-10): ya lo contempla plan R-2.
- Si el upgrade de testnet agrega un init a un modulo existente, sera rechazado (IncompatibleUpgrade): relevante solo si #18 lo intentara.
- V-11 solo cubre el pubfile efimero (ver alcance); el Published.toml real lo ve el owner en testnet.
- Sin pendientes de seguridad ni de fondos.

### §R-6: los 4 greps (/usr/bin/grep -nE) sobre el diff y sobre este reporte
Diff = las 5 fixtures nuevas (git diff --stat vacio: todo es untracked); se corrieron sobre ellas.
Sobre el diff (fixtures):
1. [0-9a-fA-F]{40,64}: 71 coincidencias (31 dry-run, 32 upgrade, 2 retry, 3 y 3 en los dos pubfiles) = todas 0x + 64 hex. Clasificadas (11 valores unicos): ids de paquete publicados 0xb622ea17...e152 (v1 original) y 0xc2e35870...ccfa (upgrade) y el id hipotetico del dry run (0xf7e29186...); UpgradeCap 0x599718fb...3fbd; objetos creados (SandboxMarker 0x8352897b... y el del dry run 0x0a51b927...); moneda de gas 0x01500fde...; direcciones del sistema 0x...01 y 0x...02; sentinela 0xffff...ffff del dry run; y la UNICA cuenta efimera de la genesis desechable (sender/owner del gas), permitida solo dentro de fixtures (C-6, como las existentes). Ningun digest base58 coincide (no es hex).
2. 0x[0-9a-fA-F]{8,}: las mismas 71 (mismos 11 valores).
3. suiprivkey|mnemonic|seed phrase|/home/|/Users/: 0 coincidencias (exit 1).
4. [0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}: 0 coincidencias (exit 1).
Sobre este reporte (corridos con /usr/bin/grep -nE despues de escribirlo):
1. [0-9a-fA-F]{40,64}: coincidencias solo en las lineas de V-16 (los dos SHA-256 esperados y verificados, publicos, de ci.yml en 88dd53b), del v1 (rev del framework PV 140 y PV 142: SHAs de commit publicos de MystenLabs/sui), de los ids de objeto/paquete del ensayo (0x + 64 hex: House, HouseCap, UpgradeCap, Publisher, paquetes v1/v2/v3, sin cuentas), de los sha256 de los .mv (hashes de bytecode, publicos) y de los digests/ids del upgrade. Ninguna cuenta, ninguna clave.
2. 0x[0-9a-fA-F]{8,}: los mismos ids de paquete/objeto del ensayo (sin cuentas de la genesis; las cuentas no se pegaron).
3. suiprivkey|mnemonic|seed phrase|/home/|/Users/: 2 lineas, las dos son texto que enumera el propio patron de este grep (no una ruta ni un secreto); ninguna ruta personal.
4. [0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}: 25 coincidencias (conteo con grep -o), todas ids abreviados de paquete/objeto del ensayo (0xb622ea17...e152, 0xc2e35870...ccfa, 0x599718fb...3fbd, 0x16738bac...e5ee) y hashes de bytecode (6ef491fb...7933, 7bea0c6b...efb6): ids de paquete/UpgradeCap y hashes publicos, ninguna cuenta.
Ademas, sobre este borrador: el conteo de la cadena de error de comando inexistente dio 0 antes de agregar este bloque (despues da 1 solo porque este texto la nombra; ninguna salida real de ese error en toda la sesion); el grep de rastros (Cannot run genesis, config de usuario, puerto en uso) da 2 lineas, ambas texto de este reporte que nombra la condicion como algo que NO ocurrio (la del arranque y esta), no rastro de una ejecucion.

### Cierre de la localnet
- kill "$(cat <SMOKE_DIR>/sui.pid)" (PID 2639955) -> enviado (estado 0); el comando en segundo plano termino con exit code 144 (esperado: SIGTERM). kill -0 "$(cat <SMOKE_DIR>/sui.pid)" -> "No such process", estado 1. ps: 0 procesos sui start.
- ss -ltn | grep -c ':19000 ' -> 0 (queda libre); ss -ltn | grep -c ':9000 ' -> 2 (igual que al empezar: el servicio ajeno, intacto).
- rm -rf <SMOKE_DIR> verificado (test ! -e <SMOKE_DIR> -> existe=no): se borraron la genesis (con las claves desechables), los arboles v1/v1a/v1b/v1-orig/v2/v2c, el sandbox, el binario 1.83.0 (bin183/dl183), los .json de la corrida y el env.sh. rm -f contracts/deployments/localnet.json (nunca se creo); test ! -e contracts/deployments/localnet.json -> 0; ! compgen -G 'contracts/Pub.*.toml' -> 0.
- git status --porcelain --untracked-files=all: solo las 5 fixtures. git diff --exit-code de Move.lock, Published.toml, sources, tests y deployments: exit 0.
- Docker: antes 5 contenedores (4 corriendo) / 17 imagenes; despues 5 / 17, sin <none>. No se toco Docker.

### Guarda de ~/.sui (C-13, R-12)
- Inicio: mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes; ls -la: solo client.yaml en la subcarpeta de config; sha256sum de client.yaml = ef12fd09615f (primeros 12 hex) = linea base.
- Despues de la genesis: igual (mismo mtime, 244 bytes, ef12fd09615f, solo client.yaml). Despues de sui start y de las primeras llamadas: igual.
- Despues de escribir el reporte (y tras cerrar la genesis, borrar <SMOKE_DIR> y cerrar el puerto): mtime 2026-10-30 17:52:52.515735237 -0500, 244 bytes, ls -la: solo client.yaml, sha256sum ef12fd09615f = linea base. Al final (tras editar este bloque): igual (verificado en el cierre de la sesion).
- Reporte escrito solo con la herramienta de escribir archivos (Write); sin heredoc, sed -i, printf ni echo para este texto (los comandos pegados no se ejecutaron desde el reporte). Los dos .toml de fixtures se generaron con sed hacia un archivo nuevo (no -i) y cp, sin texto de la CLI.
- Ejecucion accidental de la CLI: ninguna.

### Documentación
- READMEs / agents.md actualizados: no aplica (TASK-1a no cambia arquitectura, layout, comandos, contrato ni tests; se sugiere documentar las fixtures nuevas en contracts/README.md al commitearlas).
- Snippet propuesto para documents/STATUS.md (fila "localnet aislada @ feature/issue-73-multigame (TASK-1a de #73)"): localnet aislada @ feature/issue-73-multigame (TASK-1a de #73), CLI 1.84.0-9dc25070cf2e (red y upgrade) + 1.83.0-16d2dc1e05ed (v1, SHA-256 del tgz y del binario verificados contra 88dd53b antes de ejecutar), Node v26.13.0, 2026-11-20, puerto 19000 (el 9000 lo ocupa un servicio de otro proyecto, no se tocó) | baseline: 0 warnings / 0 lints / 83 tests PASS; node --test 104; check 1 despliegue; app 1246 tests en 66 archivos; dist 917.80 kB | V-16, V-2 (bytecode de house y game identico entre 1.83 y 1.84; con el modulo nuevo cambia solo la lista de amigos de house), V-1 (modulo nuevo llama a add_fees: fees_collected 0 -> 1000000), V-8 (init del modulo nuevo corre; el de existentes no; agregar init a un existente = IncompatibleUpgrade), V-10 (upgrade = 1 PTB de 3 comandos; reintento con pubfile viejo = PackageIDDoesNotMatch y paga gas) y V-11 (pubfile: published-at, version y toolchain-version cambian) todas PASA; el pubfile se indexa por ruta de la fuente.

~~~~


---

## 2. TASK-1a (revisión del MID)

> MID, TASK-1a: PASA CON CAMBIOS (Receta U, README, V-11 acotado).

PASA CON CAMBIOS

## Revisión TASK-1a: PASA CON CAMBIOS (HANDOFF_MULTIGAME v1.2.1; reporte del DEV de 185 líneas y las 5 fixtures nuevas)

- **Fecha:** 2026-11-20. Solo lecturas (reporte, fixtures, `contracts/README.md`, `ci.yml`, `git status`); no corrí gates ni `sui`.
- **Resultado:** el task cumple lo que pedía el handoff: **V-16, V-1, V-2, V-8, V-10 y V-11 están respaldados** por salida pegada y por las fixtures reales, el baseline medido coincide con §0 (sin delta), no hay sobrealcance y el reporte cumple la plantilla §R y R-12/C-13. Los cambios que pido son **de proceso y de documentación**, ninguno bloquea TASK-1b:
  - un hallazgo real de la receta (H-a), **ya corregido en el handoff v1.2.2**;
  - la clasificación de V-11 (PASA acotado, con una parte NO CONCLUYENTE que es del owner);
  - documentar las fixtures en `contracts/README.md` al commitearlas.

## 1. Verificación de cada V (¿salida pegada y veredicto correcto?)

| V | Veredicto del DEV | Mi veredicto | Respaldo que verifiqué |
|---|---|---|---|
| **V-16** binario 1.83.0 | PASA | **PASA** | Los dos SHA-256 (tgz y binario) se verificaron **antes** de ejecutar y coinciden con `SUI_TGZ_SHA256` y `SUI_BIN_SHA256` de `git show 88dd53b:.github/workflows/ci.yml` (líneas 24-25; leí `ci.yml` actual y el histórico está citado en STATUS). El binario salió del cache de `suiup` (desviación 1) pero con ambos hashes iguales a los del release; el DEV declara que su primera ejecución fue `smoke_guard_v1`. Versión `1.83.0-16d2dc1e05ed`. El tgz trae `./sui` en la raíz (el handoff decía `sui-release/sui`: corregido en v1.2.2, `ci.yml:51-59` extrae a un directorio que se llama `sui-release`). |
| **V-1** módulo nuevo llama a `house::add_fees` | PASA | **PASA** | Upgrade real con el módulo `sandbox_fees` (que llama a la `public(package)` de `house` sin cambiar su firma): `status success`, `PackageVersion 2`, módulos `game`, `house`, `sandbox_fees`, política compatible. La fixture `localnet-upgrade.json` trae la transacción completa (3 comandos, `published` con los tres módulos, `SandboxMarker` creado). Después `deposit` ⇒ `fees_collected` **0 → 1000000**, `House.version` sigue 1. La salida pegada de la llamada es un resumen `jq` y un digest (la tabla `ptb` no es JSON y se leyó con `tx-block --json`): suficiente porque el efecto observable (el balance) está citado antes/después. Es la prueba que faltaba de plan §3.1. |
| **V-2** bytecode | PASA | **PASA** (con una precisión) | Hashes de `game.mv` y `house.mv`: publicado con 1.83 = build 1.83 = build 1.84 sobre `26f2676` (mismo lock PV 140). Con `HEAD` completo difieren, y el DEV lo **explica y lo aísla**: el desensamblado de las dos funciones cambia solo la línea `module <dirección>.house {` (el `Published.toml` de testnet del árbol de `HEAD` fija la dirección propia); el control `v2c` (HEAD **sin** `Published.toml`, lock PV 142) da los mismos hashes que el v1 ⇒ ni la CLI 1.84 ni el framework PV 142 cambian el bytecode. Con el módulo nuevo, `game.mv` idéntico y `house.mv` cambia **solo `friend_decls` (1 → 2)** más el corrimiento del pool de identificadores. Coincide con plan §3.1 (H-1). **Precisión para la compuerta:** la comparación debe hacerse en el mismo contexto de dirección propia (el control `v2c`); lo agregué al punto 4 de §G del handoff. |
| **V-8** `init` | PASA | **PASA** | (i) el `init` del módulo nuevo corre en el upgrade (crea `SandboxMarker` con el prefijo del ID del upgrade); (ii) no se recrean `HouseCap`/`House`/`Publisher` (el `init` con OTW de `house` no vuelve a correr); (iii) un segundo upgrade con otro módulo nuevo crea solo su objeto y **no** reejecuta el `init` de `sandbox_fees`; (iv) agregar un `init` a un módulo existente se **rechaza con `IncompatibleUpgrade`** (transacción ejecutada y fallida, con el digest; la `UpgradeCap` y el pubfile quedaron intactos; el dry run aislado lo reproduce con solo `fun init` en `game`). Confirma plan H-6 y R-9, y agrega el dato (iv) que el plan no tenía (ver H-b). |
| **V-10** PTB atómico y reintento | PASA | **PASA** | El `--dry-run` y el upgrade real tienen exactamente **3 comandos** (`authorize_upgrade`, `Upgrade`, `commit_upgrade`; lo verifiqué en `localnet-upgrade.json`: `ProgrammableTransaction ['MoveCall','Upgrade','MoveCall']`). El reintento con el pubfile viejo falla con `PackageIDDoesNotMatch { package_id = ID original, ticket_id = ID del upgrade }` (texto real en `localnet-upgrade-retry-error.txt`, una línea), **paga gas** (storage rebate casi igual al storage), no deja versión 3 y la `UpgradeCap` sigue en versión 2 con `policy` 0. Coincide con plan H-9/R-2. |
| **V-11** forma del pubfile | PASA (alcance acotado) | **PASA para el pubfile efímero; NO CONCLUYENTE para el `Published.toml` real de testnet** | Pubfile efímero: `published-at`, `version` y `toolchain-version` cambian; `original-id`, `upgrade-capability`, `chain-id`, `build-env` y `source.local` no; **una sola** entrada `[[published]]` (sin historial). Los dos `.toml` de las fixtures lo muestran. Pero V-11 pedía también "los campos que cambian en el json" y el archivo que escribirá `sui client upgrade` en testnet (formato `[published.testnet]` de un manifest con el entorno) **no se pudo probar** (solo `test-upgrade` está autorizado y el manifest no declara localnet). El DEV lo declara bien en "Alcance". **Qué hacer:** dejar V-11 como PASA (efímero) + **NO CONCLUYENTE (testnet)** en STATUS y en la compuerta; lo cierra el dry run y el upgrade del owner (TASK-6 pasos 3-5, `check` con versión 2). TASK-4 debe parsear el pubfile **y** tolerar el `Published.toml` real. |

**Baseline medido:** coincide fila por fila con §0 (0/0, 83 tests, scripts 104, `check` 1, app 1246/66, 917.80 kB, gas de publicar 47246000 MIST, Docker 5/17). Sin rojos, sin delta.

## 2. Los tres hallazgos

### H-a — el pubfile de `test-publish` se indexa por `source.local` (🟡 MINOR; **corregido en el handoff v1.2.2**)
- **Evidencia:** el DEV probó que `test-upgrade` desde otra ruta falla con "Cannot determine the publication information" y que `-c` no lo resuelve; con `source.local` apuntando al árbol del upgrade, el dry run es idéntico. Es consistente con el código de la CLI que ya leímos (`published_at` viene de la publicación registrada para la ruta del paquete).
- **Impacto:** la receta de TASK-5 paso 1 (publicar el v1 desde `<SMOKE_DIR>/v1/contracts` y upgradear desde `<repo>/contracts` con el script) **fallaba**, y también cualquier upgrade sandbox desde otro árbol (TASK-1b, v3 de TASK-5).
- **Corrección elegida (opción (b) del DEV, con tres precisiones):**
  1. **Receta U** nueva: antes de cada upgrade se hace una **copia** del pubfile con `source.local` = el árbol que se va a upgradear (herramienta de edición o `sed` a un archivo nuevo, nunca `-i`). TASK-5 paso 1 agrega `(b2)` `Pub.v1.repo.toml` con `<repo>/contracts` y `(c)` lo usa en `publish.mjs upgrade`.
  2. **El script no edita el pubfile**: TASK-4 suma una **guarda** que aborta antes de invocar `sui` si `source.local` ≠ `CONTRACTS_DIR` (`publish.mjs:33`), con su test y un mensaje que remite a la Receta U. Así un error de receta se ve en el script y no como un error críptico de la CLI.
  3. **Los upgrades sandbox** (TASK-1b y la v3 de TASK-5) van por la CLI directa desde su árbol con una copia del pubfile; no pasan por `publish.mjs` y no reescriben `deployments/localnet.json`.
- Se descartaron (a) (que el script cambie de cwd por el pubfile: acopla el script a una ruta ajena y rompe `CONTRACTS_DIR`) y (c) (publicar el v1 desde `<repo>/contracts`: toca el worktree).
- Sobre testnet **no aplica**: `sui client upgrade` usa el `Published.toml` de `contracts/`, sin `source.local`.

### H-b — agregar un `init` a un módulo existente rechaza el upgrade (🟡 MINOR; confirmado: el plan y el handoff no lo contradicen)
- **Evidencia:** V-8 (iv) con digest y con dry runs aislados (solo `fun init` en `game` ⇒ `IncompatibleUpgrade`; solo una struct nueva ⇒ éxito).
- **Plan/handoff:** `duel` y `coinflip` son módulos **nuevos** (`init` de módulos nuevos corre, plan H-6; y el plan decide "sin `init`" en ambos); `house.move` y `game.move` no se tocan. Ningún task de TASK-2/2b/3 necesita un `init` en un módulo existente. **No hay contradicción.**
- **Consecuencias a dejar escritas (sin cambiar ninguna decisión):**
  - handoff R.7 (hecho en v1.2.2): `duel` y `coinflip` no podrán agregar un `init` en un upgrade posterior, ni `house`/`game`;
  - plan R-9 (próximo toque del plan, o TASK-8): una frase "un `init` agregado a un módulo ya publicado hace rechazar el upgrade (`IncompatibleUpgrade`, TASK-1a V-8); solo un módulo nuevo puede tener `init`". No requiere versión nueva del plan por sí sola.

### H-c — las fixtures JSON traen `sandbox_fees`/`SandboxMarker` (🟡 MINOR; solo documentación)
- **El control anti-fuga no se rompe:** el control de TASK-5 §7 (R2-1) mira **líneas agregadas** de `contracts/sources` y `app/src`; las fixtures viven en `contracts/scripts/fixtures/`, fuera de esas carpetas. Los nombres `sandbox_fees`/`SandboxMarker` además no llevan el marcador `SANDBOX_` (el control distingue mayúsculas) y no tienen por qué: son salidas reales de un upgrade de un paquete con un módulo extra, cuya forma es la misma que la de TASK-4.
- **Sí hay que documentarlo** para que nadie lea esas fixtures como producto o como el módulo de #73. Hacerlo **al commitear** (PROY-20, un renglón junto a las fixtures): ver §5.
- **TASK-4 debe** usar las fixtures solo para la **forma** (parseo del `--json`, pubfile, error) y no codificar `sandbox_fees` como nombre de módulo de producción.

## 3. Direcciones de cuentas en las fixtures: **aceptable por precedente, no hace falta pasarlo al MAYOR ni al owner**
- La cuenta efímera de la génesis (sender y dueño de la moneda de gas, 26 apariciones; la verifiqué como **única** cuenta en las dos fixtures JSON; los demás valores son IDs de paquete/objeto, direcciones del sistema y el sentinela de dry run) es del **mismo tipo** que la de las fixtures ya mergeadas (`localnet-publish.json`, `localnet-publish-dry-run.json`, `Published.localnet.toml`).
- `contracts/README.md:918-920` ("Tests") lo documenta **expresamente** para `contracts/scripts/fixtures/`: "Contienen la dirección y la firma de una cuenta efímera de la génesis, sin valor y con la clave destruida". Las líneas 454 y 485 lo dicen para las fixtures de `contracts/fixtures/`. El handoff C-6 repite la regla.
- La regla del owner "ninguna dirección de cuenta" nace en D-20261102-01 (1) y se refiere a `deployments/<red>.json` y a docs/plan (la dirección del publicador de **testnet**, que es real); no a salidas crudas de una génesis desechable. Aquí además la génesis (con sus claves) se borró al cerrar (`<SMOKE_DIR>` verificado) y la dirección no aparece fuera de esas fixtures (control del orquestador).
- Condiciones que se cumplen y deben mantenerse: cuenta de **génesis desechable**, clave destruida, solo dentro de `contracts/scripts/fixtures/` y `contracts/fixtures/`, nunca en reportes, docs, plan ni `deployments/`. Solo pido una línea informativa en la descripción del PR ("las fixtures nuevas llevan una cuenta efímera de génesis, como las existentes, `contracts/README.md:918`").

## 4. Desviaciones declaradas y sobrealcance
- **Desv. 1 (binario/tgz del cache de `suiup`):** **aceptable.** Ambos hashes coinciden con `88dd53b` antes de ejecutar, que es lo que importa de V-16 (no se pretendía descargar 1.1 GB). Es incluso más trazable (misma fuente histórica en STATUS).
- **Desv. 2 (upgrade desde la ruta del `test-publish`):** **aceptable como adaptación del ensayo y es la causa de H-a**; resuelta con la Receta U.
- **Desv. 3 (5 fixtures en vez de 3):** **aceptable y útil** (`Published.upgrade-before.localnet.toml` permite armar el caso "pubfile viejo" en TASK-4; el `.txt` es la salida real del reintento). Los dos `.toml` y el `.txt` no traen rutas personales (`<SMOKE_DIR>/v1/contracts`, IDs públicos de localnet); `deployment.test.mjs` y `publish.test.mjs` leen **archivos nombrados** (no listan el directorio, `deployment.test.mjs:23`, `publish.test.mjs:45-48`), por lo que las nuevas no pueden romperlos; el DEV reporta `node --test` 104/104 y `check` en verde con ellas.
- **Desv. 4 y 5:** el v3 extra de V-8 y `node_modules` ignorado en el worktree: **aceptables**.
- **Sobrealcance:** ninguno. `git status` muestra solo las 5 fixtures `??`; sin deltas en `contracts/sources`, `contracts/tests`, `Move.lock`, `Published.toml`, `deployments`, `.github`, `app` (controles del orquestador, coinciden con el reporte).
- **Reporte:** cumple §R (branch, baseline, archivos, qué se implementó, tests y gates, verificación manual con V-n, desviaciones, riesgos, §R-6 clasificado, cierre de la localnet, guarda de `~/.sui`, documentación y snippet). **R-12/C-13:** guardas de `~/.sui` en los cinco momentos (inicio, tras génesis, tras `sui start`, tras escribir el reporte, final), `~/.sui` idéntico (244 B, un solo archivo, los 12 hex de línea base), reporte escrito con la herramienta de archivos, `grep -c 'command not found'` = 0 sobre el reporte entregado y el grep de rastros solo en dos líneas que nombran la condición como algo que **no** ocurrió (líneas 55 y 167). Puerto 19000 liberado, el 9000 ajeno intacto, Docker 5/17. Sin ejecución accidental.
- **Observación menor del reporte (no bloquea):** el DEV dice que el conteo de `command not found` "da 1" tras agregar un bloque, y en el archivo final da 0; es una redacción desfasada de su propio borrador, no un problema del contenido.

## 5. Qué commitear y qué editar antes (lista exacta)

**Commit 1 (TASK-1a), orquestador:**
1. Las 5 fixtures, **tal cual** (sin editar), en `contracts/scripts/fixtures/`:
   - `localnet-upgrade.json`
   - `localnet-upgrade-dry-run.json`
   - `Published.upgrade.localnet.toml`
   - `Published.upgrade-before.localnet.toml`
   - `localnet-upgrade-retry-error.txt`
2. **Un párrafo nuevo en `contracts/README.md`, sección "### Tests" (después de la línea 920, "del owner."),** para que las fixtures no queden sin documentar (PROY-20; lo hace el orquestador ahora, no el DEV, porque TASK-1a no tenía README en alcance; TASK-4 después amplía el runbook):
   > "Fixtures del upgrade (#73, TASK-1a): `localnet-upgrade.json` y `localnet-upgrade-dry-run.json` son el stdout `--json` real de `sui client test-upgrade` (1.84.0) y de su `--dry-run` sobre un paquete publicado con la 1.83.0 al que se le agrega un módulo de ensayo (`sandbox_fees`, con el tipo `SandboxMarker`); **ese módulo no es de producción**: las fixtures sirven solo por su **forma** (comandos del PTB, `published`, `UpgradeCap`). `Published.upgrade-before.localnet.toml` y `Published.upgrade.localnet.toml` son el pubfile efímero de `test-publish` antes y después del upgrade (`source.local` con el placeholder `<SMOKE_DIR>`); `localnet-upgrade-retry-error.txt` es el error real de reintentar el upgrade con el pubfile viejo (`PackageIDDoesNotMatch`). Llevan la cuenta efímera de la misma génesis desechable, sin valor y con la clave destruida."
3. `documents/HANDOFF_MULTIGAME.md` **v1.2.2** (ya editado: Receta U, guarda de TASK-4, TASK-5 paso 1 y v3, R.7, detalle de V-16, nota de `v2c` en §G punto 4).
4. **No** commitear nada más del worktree (el reporte va a `documents/REPORTES_MULTIGAME.md` por el orquestador, tras §R-6).

**Snippet para STATUS (ajustado a mi veredicto; reemplaza la última frase del DEV):** "… V-16, V-2, V-1, V-8, V-10 PASA; **V-11 PASA para el pubfile efímero y NO CONCLUYENTE para el `Published.toml` de testnet (lo cierra el owner en TASK-6)**; hallazgos: el pubfile de `test-publish` se indexa por `source.local` (Receta U, handoff v1.2.2) y agregar un `init` a un módulo existente rechaza el upgrade con `IncompatibleUpgrade` (V-8)."

**A tocar más adelante (no ahora):** plan R-9 (una frase sobre H-b) en el próximo toque del plan o en TASK-8; TASK-4 implementa la guarda del pubfile y tolera el `Published.toml` real; compuerta §G con V-11 como "PASA (efímero) / NO CONCLUYENTE (testnet)".

## 6. Siguiente paso
**Autorizo TASK-1b** (con la Receta U para sus upgrades sandbox y la receta de puerto 19000, reusando el binario 1.83.0 solo si los dos SHA-256 se vuelven a verificar antes de ejecutar). V-13 y V-15 siguen siendo condición de arranque de TASK-2/2b.

## §R-6 sobre esta revisión
Greps con `/usr/bin/grep` sobre este archivo: hex de 40-64, `0x` + 8 hex, claves/rutas y abreviaturas con puntos suspensivos. Resultado en el mensaje de entrega; esta revisión no incluye direcciones de cuenta (ni completas ni abreviadas).

