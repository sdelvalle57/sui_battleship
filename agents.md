# Sui Battleship — Guía para Agentes de Código

> **Versión:** 1.0 · **Fecha:** 2026-10-30
> **Proyecto:** Sui Battleship — juego de apuestas 1 vs 1 en la blockchain Sui (Move) con cliente web React.
> Documento de arranque (preload), deliberadamente conciso. Adaptado de la plantilla del workspace
> Cancerbero (D-20261030-01). Si algo de este resumen contradice el código, el código manda (y conviene
> corregir el resumen).

## 1. Resumen del Proyecto

Dos jugadores apuestan SUI en una partida. En el **MVP** la batalla naval se simula con un **coinflip**
(aleatoriedad on-chain `sui::random`): el ganador se lleva el pozo menos una comisión de la **House**.
Un jugador crea una partida bloqueando su apuesta (abierta a cualquiera o como **invitación directa**
a una dirección); otro la acepta igualando el monto; si nadie la acepta, el creador la cancela y
recupera sus fondos. Cada jugador puede tener varias partidas simultáneas.

**Fuera del MVP:** la mecánica real de batalla naval (tablero, barcos, disparos). El borrador 2025 de esos
tipos se retiró del paquete en #2; se recupera con `git show f063a0e:sources/battleship.move` (#18).

**Foco actual (oct-2026):** retomar el proyecto tras ~19 meses sin cambios (último commit 2025-03-12):
reestructurar a monorepo, terminar los módulos Move, agregar tests, CI y la UI React. Backlog en los
issues de GitHub; estado en `documents/STATUS.md`.

## 2. Repositorio (monorepo)

Un solo repo: **`sdelvalle57/sui_battleship`** (público), branch de integración `master`. Issues y PRs
se citan como `#N`.

**Layout objetivo (D-20261030-03)** — `contracts/`, `package.json` y `.nvmrc` existen desde #2;
`contracts/tests/` y `contracts/README.md` desde #4; `.github/workflows/` desde #3 (`ci.yml`: job
`contracts`; el job `app` desde #9); `contracts/scripts/` desde #7; `app/`, `.npmrc` y `package-lock.json` desde #9; `contracts/fixtures/` y
`app/scripts/` desde #10 (D-20261031-01); `contracts/deployments/` y `contracts/Published.toml` (los escribe la primera
publicación en testnet, #8) llegan con su issue:

```
sui_battleship/
├── agents.md                 # este archivo
├── documents/                # flujo multi-agente, estándares, decisiones, status, planes/handoffs
├── contracts/                # paquete Move (Move.toml, Move.lock, README.md, sources/, tests/)
│   ├── scripts/              # (#7) publish.mjs (publish/record/check), deployment.mjs, tests y fixtures/ de la CLI
│   ├── fixtures/             # (#10) game-reads.localnet.json: lecturas gRPC reales del Game y sus eventos por variante;
│   │                         # (#11, #12) game-tx.localnet.json: House, simulaciones fallidas y transacciones ejecutadas
│   │                         #   reales de crear, cancelar, rechazar y aceptar (con cada ganador y un fallo ejecutado);
│   │                         # (#14) house-admin.localnet.json: listado del HouseCap por tipo, aborts de house y las
│   │                         #   transacciones de admin (comisión, límites, retiro)
│   ├── deployments/          # <red>.json con packageId y object IDs publicados (sin secretos); lo escribe el script
│   └── Published.toml        # (#8) lo escribe `sui client publish`: fuente de los datos del paquete
├── app/                      # cliente React (Vite + TS + SDK de Sui + wallet kit); guía en app/README.md
│   └── scripts/              # recaptura de contracts/fixtures/ en la localnet aislada: capture-read-fixtures.mjs (#10),
│                             # capture-tx-fixtures.mjs (#11), capture-house-fixtures.mjs (#14) y su guarda compartida
│                             # localnet-guard.mjs (#11: sin SDK ni red)
├── package.json              # npm workspaces: ["app"]; engines: Node 26
├── package-lock.json         # versiones exactas congeladas (D-20261102-02 (3))
├── .npmrc                    # save-exact, engine-strict, min-release-age=7, ignore-scripts
├── .nvmrc                    # versión de Node (PROY-17)
└── .github/workflows/        # ci.yml: jobs contracts (#3) y app (#9), framework-drift informativo
```

| Área | Carpeta | Stack |
|---|---|---|
| Contratos | `contracts/` | Sui Move, edition `2024`, `std`/`sui` implícitas (sistema de paquetes de la CLI ≥ 1.63); framework fijado por `Move.lock` (repin con `-e testnet`; todo delta del lock se justifica) |
| Cliente web | `app/` | Vite 8 + React 19 + TypeScript 6.0.3 estricto + `@mysten/sui` (lectura con `SuiGrpcClient`, gRPC-web) + wallet kit `@mysten/dapp-kit-react` + `@mysten/dapp-kit-core` (tren `@mysten/*` fijado por `package-lock.json`) + TanStack Query + `react-router` (router por hash) + Vitest. Detalle en `app/README.md` (D-20261102-02) |

## 3. Comandos (por área, sin Makefile)

**Toolchain:** Sui CLI instalada con `suiup` en local (versión fijada en `documents/STATUS.md`); en CI, el
binario `sui` del mismo asset del release, verificado por SHA-256 (`.github/workflows/ci.yml`, `env`),
siempre la misma versión (D-20261030-13); Node (versión en
`.nvmrc`, PROY-17), npm. El `node` por defecto de la máquina puede ser otro: correr `nvm use` antes de cada gate. Instalada el 2026-10-30:
Sui CLI `1.83.0` (release `testnet`) vía `suiup` en `~/.local/bin` (STATUS H1, sección Toolchain).

**Prerrequisito de `sui move`:** `~/.sui/sui_config/client.yaml` **sin claves**, con `active_env: testnet`
(D-20261030-07; STATUS Toolchain/H11). Sin ese archivo la CLI ofrece crear una config y genera una clave
cuya frase imprime. Toda invocación de `sui` (`sui --version`, `sui move …`, `sui client …`) va precedida
de `printf 'n\n' |` para que, si la config falta, la CLI aborte en vez de crear la clave.

### Contratos (desde `contracts/`)

Los gates se corren con `cd contracts && printf 'n\n' | sui move …` (equivalente: `--path contracts` desde la raíz).

| Comando | Qué hace |
|---|---|
| `sui move build -e testnet --warnings-are-errors` | Compila. Gate bloqueante: sin errores ni warnings |
| `sui move build -e testnet --lint --warnings-are-errors` | Lints de Sui. Gate bloqueante (D-20261030-13): con `--warnings-are-errors` un lint sale como `error[ESL…]` y corta el build (R4 de #3) |
| `sui move test -e testnet --warnings-are-errors` | Tests unitarios (`#[test]`, `test_scenario`). Gate bloqueante |
| `node --test scripts/*.test.mjs` | Tests de los scripts de despliegue (Node 26: `nvm use` o ruta absoluta). Gate bloqueante (#7) |
| `node scripts/publish.mjs check` | Valida `deployments/*.json` y su coherencia con `Published.toml` (Node 26). Gate bloqueante (#7, ARQ-6) |
| `git diff --exit-code -- Move.lock` | Tras los gates: el lock no cambia (PROY-11) |
| `sui move test -e testnet --coverage && sui move coverage summary -e testnet` | Cobertura (informativo) |
| Red local para smokes: **solo aislada** | Ver "Localnet aislada (smokes)" abajo; nunca `sui start` a secas |
| `node scripts/publish.mjs publish --network testnet` | Publicación — **solo el owner, con su `SUI_CONFIG_DIR` propio** (§12, D-20261102-03); agentes: solo `--network localnet` dentro de la localnet aislada |

Las seis primeras filas son exactamente los steps de gate del job `contracts` de
`.github/workflows/ci.yml` (PROY-18); el job además exige árbol limpio y cero claves. Baseline vigente
de los gates: `documents/STATUS.md`.

**Quién corre qué** (`contracts/scripts/publish.mjs`, D-20261102-01 y D-20261102-03):

| Comando | Agentes (DEV, MID, MAYOR, orquestador) | Owner |
|---|---|---|
| `node --test scripts/*.test.mjs`, `node scripts/publish.mjs check` | sí (gate) | sí |
| `node scripts/publish.mjs record …` | sí (con salidas de localnet) | sí |
| `node scripts/publish.mjs publish --network localnet …` | **solo** con el prefijo de la localnet aislada (`. env.sh && smoke_guard &&`, abajo) | sí, con su localnet aislada |
| `node scripts/publish.mjs publish --network testnet …` (con o sin `--dry-run`) | **nunca** (D4) | sí, con `SUI_CONFIG_DIR` propio |

#### Localnet aislada (smokes)

**Motivo:** con `--force-regenesis` y sin `SUI_CONFIG_DIR`, `sui start` reescribe
`~/.sui/sui_config/client.yaml` (`crates/sui/src/sui_commands.rs:1271-1273, 1921-1940` @ `testnet-v1.83.0`), y con
`--with-faucet` crea claves en el directorio temporal. Por eso una localnet de smoke corre **solo aislada**:
génesis y red en un directorio propio, nunca `sui start` a secas. Es la excepción acotada a D-20261030-07
(FLUJO §6): claves desechables de localnet **solo** dentro de `<SMOKE_DIR>`, nunca leídas, impresas ni pegadas, y
borradas al cerrar. Nada en `~/.sui/`.

1. **Las variables NO persisten entre llamadas del agente.** Cada llamada es un shell nuevo: un `export` hecho en
   una llamada no existe en la siguiente. Todo se recarga desde archivos en cada llamada (pasos 2-3).
2. **Preparación** (una llamada **sin** `sui`): elegir `<SMOKE_DIR>` = directorio nuevo dentro del scratchpad del
   agente (ruta absoluta literal); resolver `command -v sui` (ruta absoluta literal); anotar el HOME real; como
   línea base, `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y `ls <HOME real>/.sui/sui_config/`
   (nunca `cat`); crear `<SMOKE_DIR>/{net,tmp,home}` vacíos y `<SMOKE_DIR>/env.sh` con las rutas **escritas
   literalmente**:

   ```sh
   # <SMOKE_DIR>/env.sh — cargar al principio de CADA llamada que invoque sui: `. <SMOKE_DIR>/env.sh && …`
   SMOKE_DIR=<SMOKE_DIR>
   SUI=<ruta absoluta del binario sui>
   NODE=<ruta absoluta de Node 26>     # p. ej. ~/.nvm/versions/node/v26.13.0/bin/node, escrita literal (HOME aislado: sin nvm)
   export SUI_CONFIG_DIR="$SMOKE_DIR/net" TMPDIR="$SMOKE_DIR/tmp" HOME="$SMOKE_DIR/home" MOVE_HOME=<HOME real>/.move
   [ -x "$SUI" ] && [ -d "$SUI_CONFIG_DIR" ] || { echo GUARD-FAIL; return 97; }
   smoke_guard() {
     [ -f "$SUI_CONFIG_DIR/client.yaml" ] \
       && [ "$(printf 'n\n' | "$SUI" client active-env)" = localnet ] \
       || { echo GUARD-FAIL; return 97; }
   }
   suic() { printf 'n\n' | "$SUI" client "$@"; }
   act_as() { suic switch --address "$1" > /dev/null; }
   ```

   `HOME` aislado es la segunda barrera (si un camino de la CLI ignorara `SUI_CONFIG_DIR`, caería en
   `<SMOKE_DIR>/home/.sui`, nunca en `~/.sui/`); `MOVE_HOME` conserva la caché de dependencias Move
   (`move-command-line-common/src/env.rs:28-37`). Si aun así se descargaran de nuevo, se declara.
3. **Prefijo de cada llamada con `sui`:** `. <SMOKE_DIR>/env.sh &&` y, salvo la de génesis,
   `{ . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`. Siempre `"$SUI"` o `suic`, nunca `sui` a
   secas: sin `env.sh`, `"$SUI"` está vacío y la llamada falla sin tocar nada. Un `GUARD-FAIL` detiene el smoke y
   se reporta.
4. **Génesis y arranque** (sin `--force-regenesis` ni faucet; la génesis crea 5 cuentas con fondos y un
   `client.yaml` con `active_env = localnet`, sin imprimir frases):
   - Génesis: `. <SMOKE_DIR>/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo "exit=$?"`
   - Arranque como **comando en segundo plano del harness** (`run_in_background`), con el env en la misma orden y
     `exec` (así el PID guardado es el de la red): `. <SMOKE_DIR>/env.sh && smoke_guard && echo $$ > "$SMOKE_DIR/sui.pid" && exec "$SUI" start --network.config "$SUI_CONFIG_DIR" > "$SMOKE_DIR/sui-start.log" 2>&1`.
     Nunca `nohup … &` dentro de una llamada normal.
   - Comprobar que está arriba, en otra llamada: `. <SMOKE_DIR>/env.sh && smoke_guard && suic chain-identifier`.
   - Publicación efímera del paquete con el script (#7), **después** del paso 5 (necesita `ADMIN` en `ids.env`), con
     el prefijo del paso 3 y desde `contracts/`. Un `--pubfile-path` nuevo por génesis (uno viejo hace fallar a la CLI):
     - (A) smoke del script, salida dentro de `<SMOKE_DIR>`: `act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json"`;
     - (B) cuando la app necesita la ruta por defecto: lo mismo **sin `--out`**, que escribe
       `contracts/deployments/localnet.json` (ignorado por git; el script crea la carpeta y el cierre la borra).
     Si modifica `Move.lock`: `git checkout -- contracts/Move.lock` y declararlo.
5. **Cuentas:** `suic addresses --json` (solo alias y direcciones); las que se usen se anotan en
   `<SMOKE_DIR>/ids.env` (`export ADMIN=0x…`), que también acumula los IDs (`PKG`, `HOUSE`, …). **Nunca**
   `new-address`: su `--json` incluye la frase de recuperación (`crates/sui/src/client_commands.rs:2886-2891`).
6. **Archivos prohibidos:** ningún archivo de `<SMOKE_DIR>/net` (keystore, `client.yaml`, `network.yaml`,
   `genesis.blob`, YAML de validadores y fullnode, todos con claves en formatos que el grep de secretos no
   detecta) se lee, copia, muestra ni pega; solo los usan los comandos `sui`. Los logs (`genesis.log`,
   `sui-start.log`) no se pegan (solo líneas puntuales revisadas antes). Lo que vaya a docs o fixtures sale
   **únicamente** de lecturas de la red local por la CLI (`suic object`, `suic tx-block`) o por `SuiGrpcClient` (D-20261102-02 (1));
   el fullnode de `sui 1.83.0` no sirve JSON-RPC (`POST` a `:9000` → `404`, H-1 de #6, D-20261031-01).
   **Firmar como una cuenta de la génesis** desde fuera de la CLI (p. ej. `suic ptb … --serialize-signed-transaction`
   y ejecutar esos bytes por gRPC desde Node para medir el camino de una wallet, S-1 bis de #11): permitido **solo** en
   esta localnet aislada y con tres condiciones: (1) la firma la hace la CLI bajo el prefijo del paso 3 (`suic …`,
   regla B4); (2) ningún proceso de Node (sondas, scripts, la app) lee nada de `<SMOKE_DIR>/net`; (3) ninguna clave se
   imprime ni se pega. Las sondas en Node solo hablan con la red por gRPC.
   **Pasos de navegador (🌐):** Chrome headless + CDP con perfil desechable en `<SMOKE_DIR>` (`--user-data-dir`,
   `HOME`/`XDG_*` aislados, depuración solo en `127.0.0.1`), nunca el navegador ni el perfil del usuario. Con más de
   una pestaña, cada una se abre con `Target.createTarget({ url, newWindow: true })`, todas visibles, y nunca
   `Page.bringToFront`: las pestañas de fondo quedan `hidden` y no corren intervalos ni remontajes (regla del smoke de #11).
7. **Cierre:** `kill "$(cat <SMOKE_DIR>/sui.pid)"` (nunca `pkill`); en otra llamada, confirmar que terminó (`kill -0 "$(cat <SMOKE_DIR>/sui.pid)"` falla) y solo entonces `rm -rf <SMOKE_DIR>` (comprobar que ya no existe);
   `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments 2>/dev/null || true` (pertenece a la
   génesis que se borra); sin cargar `env.sh`, `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base;
   `git status --porcelain`; `git diff --exit-code -- contracts/Move.lock`; ni `contracts/Pub.*.toml` ni
   `contracts/Published.toml` ni `contracts/deployments/`.
   `sui start` 1.83 sale con código 144 ante SIGTERM; el harness marca el comando como fallido: es esperado, lo que
   vale es que `kill -0` falle.

**Reglas del script de publicación para agentes (D-20261102-03):** ningún agente corre
`publish.mjs publish --network testnet`, ni con `--dry-run`. Un agente solo define `SUI_CONFIG_DIR` como
`$SMOKE_DIR/net`; la ruta de la config del owner nunca se escribe en el repo, issues, handoffs ni reportes. **Ninguna**
llamada `sui client …` (ni `publish.mjs publish`) sin el prefijo del paso 3, tampoco las de solo lectura
(`active-env`, `chain-identifier`, `addresses`): la única forma de ver la salida real de un `sui client` es esta
localnet. Los gates `sui move …` siguen con su forma canónica.

### App (`app/`)

Desde la raíz (npm workspaces), con Node 26: `nvm use`, o en agentes el prefijo
`export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && …` (`node --version` debe dar
`v26.13.0`; con otra versión `npm ci` falla con `EBADENGINE`). Steps del job `app` de la CI, en orden:

```bash
npm ci                                          # lockfile; sin scripts de instalación (.npmrc)
npm audit signatures                            # firmas del registry
npm audit --omit=dev --audit-level=high         # high/critical de producción: bloqueante
npm run lint -w app                             # ESLint --max-warnings 0, regla de capas
npm run typecheck -w app                        # tsc --noEmit (src/ y vite.config.ts)
npm test -w app                                 # Vitest
VITE_SUI_NETWORK=testnet npm run build -w app   # build de testnet
```

y al final `git status --porcelain --untracked-files=all` vacío. Desarrollo: `npm run dev -w app` con
`VITE_SUI_NETWORK` (`app/README.md`). Procedimiento ante un aviso de seguridad: `app/README.md`.

Gate completo = el del workflow de CI: job `contracts` (build, lint y test con `--warnings-are-errors`,
`Move.lock` intacto, cero claves, `node --test` y `check` de los scripts) y job `app` (los steps de arriba); ambos
bloquean el merge (PROY-18). El job `framework-drift` es informativo (H13) y no condiciona el merge.

## 4. Arquitectura de Runtime

```
Navegador (app React) ──wallet (firma)──▶ Sui fullnode (gRPC-web) ──▶ paquete battleship
        │                                                           ├─ house::House   (shared)
        └── lecturas: SuiGrpcClient ◀───────────────────────────────┤─ game::Game     (shared, una por partida)
            (objetos, eventos, estado del nodo)                     └─ 0x8 Random     (shared, sistema)
```

- **Sin backend propio:** la app lee objetos y eventos del fullnode por gRPC-web (`SuiGrpcClient`; el fullnode 1.83
  no sirve JSON-RPC y responde al preflight CORS con comodines, TASK-4 de #9) y arma transacciones que firma la
  wallet.
- **Redes:** `localnet` (smokes), `testnet` (despliegue del MVP). `mainnet` fuera de alcance sin decisión.
- **Indexado:** las listas (partidas abiertas, mis partidas) salen de **eventos** del paquete; no hay
  registros globales en objetos compartidos (PROY-6). "Mis partidas" (#13): la actividad propia con el filtro por
  remitente del nodo y las invitaciones por escaneo de `GameCreated`, con el estado vigente leído del objeto. En testnet
  solo cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento en #51).

## 5. Contrato on-chain ↔ UI

La **fuente canónica** es el paquete Move: firmas de funciones `public`/`entry`, structs con `key`/`store`,
eventos y códigos de abort. La UI los consume desde un único módulo (`app/src/sui/`): targets
`<packageId>::<modulo>::<funcion>`, tipos de eventos y mapeo de abort codes a mensajes.

| Artefacto | Dónde | Sincronización |
|---|---|---|
| Package ID / object IDs por red | `contracts/deployments/<red>.json` | Lo escribe `contracts/scripts/publish.mjs` (nunca a mano), en el mismo PR que la publicación; `Published.toml` es la fuente de los datos del paquete y la CI verifica la coherencia (`publish.mjs check`). La app lo importa (nunca IDs hardcodeados en componentes) |
| Firmas y eventos | `contracts/sources/*.move` | Tabla en `contracts/README.md`; cambios = STOP (§6 de FLUJO) |
| Abort codes | constantes `E*` de cada módulo | Tabla en `contracts/README.md` + `ABORT_MESSAGES` (módulo + código → mensaje) en `app/src/sui/errors.ts` (#11), con un test por código; un código nuevo entra en los dos en el mismo PR |
| Layout BCS de `Game` y de sus eventos | `contracts/sources/game.move` | Esquemas en `app/src/sui/game.ts` y `events.ts`; fixtures en `contracts/fixtures/game-reads.localnet.json` (se recapturan si cambia el layout) |
| Layout BCS de la `House` | `contracts/sources/house.move` | Esquema en `app/src/sui/house.ts` (#11; lo reutiliza #14); fixtures en `contracts/fixtures/game-tx.localnet.json` y `house-admin.localnet.json` (se recapturan si cambia el layout) |
| Layout BCS del `HouseCap` y de los eventos de admin (`FeeRateUpdated`, `BetLimitsUpdated`, `FeesWithdrawn`) | `contracts/sources/house.move` | Esquemas en `app/src/sui/houseCap.ts` y `houseAdmin.ts` (#14); fixture en `contracts/fixtures/house-admin.localnet.json` (se recaptura si cambia el layout) |
| Comisión máxima | `house::MAX_FEE_BPS` (`house.move`) | Espejo `HOUSE_MAX_FEE_BPS` = 1000 en `app/src/sui/houseAdmin.ts` (#14), solo para la validación de cortesía del panel; el contrato aborta igual con `house`/0. **Se revisa en todo upgrade que toque `MAX_FEE_BPS`**, en el mismo PR |
| Fórmula de la comisión y del pago | `game.move` (`accept_game`) | `resolutionAmounts` de `app/src/sui/game.ts` = fórmula de la v1 (D-20261030-16 D2/D3). Un upgrade que la cambie conserva la vieja para las partidas resueltas con el código viejo (por versión del `Game` o leyendo `GameResolved`) en el mismo PR. El panel de #14 replica `house::MAX_FEE_BPS` (fila "Comisión máxima") |

**Regla:** tras la primera publicación en testnet, un cambio incompatible con upgrade (firma pública,
layout de struct con `key`/`store`, eliminar función pública) es **STOP**: se decide entre upgrade
compatible o republicación con IDs nuevos.

## 6. Reglas de Negocio Críticas (MVP)

> **Reglas de la House confirmadas** por D-20261030-11 (#4), **de partidas** por D-20261030-06 y
> D-20261030-15 (#5), y **comisión y aceptar/coinflip** por D-20261030-16 (#6); contrato en
> `contracts/README.md`.

- **Apuesta:** entre `min_bet` y `max_bet` de la House (por defecto 0,001 y 50 SUI, en MIST; el titular del
  `HouseCap` los cambia con `update_bet_limits`). Los límites se aplican solo al crear la partida; el que
  acepta iguala **exactamente** el monto del creador.
- **Fondos:** la apuesta vive como `stake: Balance<SUI>` dentro de cada `Game` (sin módulo Escrow,
  D-20261030-15) desde que se crea hasta que se cancela, se rechaza o se resuelve; la partida terminada queda
  con `stake == 0`. Conservación: lo que entra = lo que sale al ganador/creador + comisión.
- **Comisión:** `fee_rate` en basis points (máx. 1000 = 10 %), **por defecto 0**: el titular del `HouseCap`
  la fija con `update_fee_rate` tras publicar (#8), antes de anunciar el juego. El `Game` **copia el
  `fee_rate` al crearse** (D-20261030-06 §3). Al aceptar, `fee = ⌊pozo × fee_rate / 10_000⌋` (intermedio
  `u128`) sobre el **pozo completo** (`2 × bet`, D-20261030-16 D3), redondeada **hacia abajo** (el resto queda
  para el ganador, D2); el ganador recibe `pozo − fee`. Entra a `House.fees_collected` por `add_fees`
  (`public(package)`, siempre, también con 0) y solo el titular del `HouseCap` la retira (`withdraw_fees`).
- **Estados:** `Pending → Cancelled | Resolved` (`GameState`), sin estado intermedio y sin expiración. Solo
  `Pending` se acepta, cancela o rechaza; `Cancelled` y `Resolved` son terminales (el objeto se conserva).
- **Invitación directa:** si la partida tiene `opponent`, solo esa dirección puede aceptarla (`accept_game`) y esa
  dirección también puede **rechazarla** (`reject_game`). Nadie juega contra sí mismo (`ESelfInvite`).
- **Cancelación:** el creador cancela (`cancel_game`) y el invitado rechaza (`reject_game`), solo en
  `Pending`; en ambos casos vuelve el **100 % al creador**, sin comisión y sin tocar la House. Sin expiración.
  Nunca queda bloqueada por la versión: cancelar y rechazar no reciben la House ni leen la versión
  (D-20261030-12 §4).
- **Coinflip:** `accept_game` acepta y resuelve en la **misma transacción**: `sui::random` en una función
  `entry` no `public` (PROY-5), en el orden **validar → cobrar la comisión → sortear → pagar**: todo lo que puede
  abortar va antes del sorteo, que elige por índice y sin ramas (D-20261030-16 D6). En el PTB, el `MoveCall` con
  `Random` va **al final**: después solo `TransferObjects`/`MergeCoins`.
- **Admin:** las operaciones de la House requieren el `HouseCap` (`key` sin `store`); se pasa a otra wallet
  solo con `transfer_house_cap`, que emite `HouseCapTransferred`.

## 7. Gotchas Técnicos

- **Versionado de la House:** tras un upgrade y `migrate`, una función que escribe la House (o lee su
  configuración) desde un paquete viejo aborta con `EWrongVersion`; `version()` es la única lectura sin
  chequeo (`contracts/README.md`, Versionado).
- **Versionado de `Game`:** cada partida guarda `version = house.version()` al crearse. Tras `migrate` de la
  House, `create_game` del paquete viejo aborta con `house::EWrongVersion` y las partidas `Pending` de
  versiones anteriores solo se cancelan o rechazan, salvo que la versión nueva decida aceptarlas: `accept_game`
  aborta con `EVersionMismatch` si la versión de la partida no es la de la House, y desde el paquete viejo con
  partida y House nuevas, con `house::EWrongVersion` en el cobro (antes del sorteo). Cancelar y rechazar
  funcionan en cualquier versión: no reciben la House ni leen la versión (`contracts/README.md`, Versionado del
  `Game`).
- **PTB con `Random`:** después del comando que usa `Random` (`accept_game`) solo se admiten `TransferObjects` o
  `MergeCoins`; con cualquier otro, la transacción se rechaza **antes de ejecutarse**
  (`crates/sui-types/src/transaction.rs:1732-1760` @ `testnet-v1.83.0`). En TypeScript, `tx.object.random()`.
- **Cancelaciones del runtime:** `ExecutionCancelledDueToRandomnessUnavailable` (DKG de la época sin terminar,
  típico al arrancar una localnet) y `ExecutionCancelledDueToSharedObjectCongestion` (`&mut House` congestionada)
  llegan como `effects.status = failure` con ese `kind` y **sin** `MoveAbort`. Se reintenta; la app nunca las
  muestra como éxito ni como error del contrato (SEG-10).
- **Localnet sin aislar:** `sui start --with-faucet --force-regenesis` sin `SUI_CONFIG_DIR` reescribe
  `~/.sui/sui_config/client.yaml` y crea claves; `sui client new-address --json` imprime la frase. Solo la
  localnet aislada de §3.
- **Framework fijado por `Move.lock`:** `std`/`sui` son implícitas y el lock (regenerado por la CLI con
  `-e testnet`, nunca a mano) los pinea al SHA del piso de la PV de testnet vigente **al repinear**; la CLI no
  repinea ni avisa por sí sola (STATUS H13). Todo delta del lock en un diff se declara y justifica (PROY-11).
- **`sui move` sin `client.yaml` crea una clave:** si falta `~/.sui/sui_config/client.yaml`, la CLI
  ofrece crear la config y genera una clave cuya frase imprime; `-e` no lo evita (STATUS H11). Nunca
  correr `sui move` sin esa config sin claves, y siempre con `printf 'n\n' |` delante (§3).
- **Repo público:** nada de keystores (`~/.sui/sui_config/`), mnemonics ni direcciones privadas del owner
  con contexto sensible en commits, issues o logs.

## 8. API on-chain (mapa por módulo)

- **`battleship::house`** — `House` (shared: `version`, `fee_rate`, `fees_collected`, `min_bet`, `max_bet`),
  `HouseCap` (`key` sin `store`), `init` (comparte la House con valores por defecto y entrega el `HouseCap`
  al publicador); `entry` con `&HouseCap`: `update_fee_rate`, `update_bet_limits`, `transfer_house_cap`,
  `migrate`; `public withdraw_fees` (devuelve `Coin<SUI>`); `public(package) add_fees`; accessors
  `fee_rate`/`fees_collected`/`min_bet`/`max_bet` (validan versión) y `version`; eventos `FeeRateUpdated`,
  `BetLimitsUpdated`, `FeesWithdrawn`, `HouseCapTransferred`, `HouseMigrated`; abort codes 0–4. Tablas en
  `contracts/README.md`.
- **`battleship::game`** (#5, #6) — `Game` (shared, uno por partida, `key` sin `store`: `version`, `house_id`,
  `creator`, `opponent: Option<address>`, `bet`, `stake: Balance<SUI>`, `fee_rate`, `state`), enum
  `GameState` (`Pending | Cancelled | Resolved { acceptor, winner }`); `entry` (no `public`): `create_game`
  (abierta o invitación, copia el `fee_rate`), `cancel_game` (creador), `reject_game` (invitado), ambas con
  reembolso del 100 % al creador, y `accept_game(game, house, payment, r: &Random, ctx)` (cualquiera menos el
  creador; en una invitación, solo el invitado): iguala la apuesta exacta, cobra la comisión a la House y paga
  `pozo − fee` al ganador del coinflip, todo en la misma transacción; eventos `GameCreated`, `GameCancelled`
  (con `cancelled_by`) y `GameResolved` (`acceptor`, `winner`, `pot`, `fee`, `payout`); abort codes 0–10 (más
  `house::EWrongVersion` en `create_game` y en el cobro de `accept_game`). `GameState` y el layout de `Game`
  quedan cerrados en #8: #18 usa un objeto nuevo o dynamic fields. Tablas en `contracts/README.md`.

## 9. Entidades Clave

`House` · `HouseCap` · `Game` (objeto compartido por partida: `version`, `house_id`, `creator`, `opponent`
opcional, `bet`, `stake: Balance<SUI>`, `fee_rate`, `state`; sin timestamps) · `GameState` (`Pending`,
`Cancelled`, `Resolved { acceptor, winner }`) · eventos de transición (`GameCreated`, `GameCancelled`,
`GameResolved` con el ganador, el pozo, la comisión y el pago) · (futuro, #18) `Board`/`Ship`/
`Coordinate` del borrador 2025 (`git show f063a0e:sources/battleship.move`).

## 10. Testing

| Área | Gate | Naturaleza |
|---|---|---|
| Contratos | `sui move test` | Unit + escenarios multi-tx con `sui::test_scenario`; `#[expected_failure(abort_code = …)]` por cada abort; aleatoriedad con los helpers de test de `sui::random` |
| App | Vitest + jsdom + Testing Library | Builders de transacción y parsers de eventos puros y testeados; componentes con el cliente Sui mockeado |

Baselines vigentes: `documents/STATUS.md`. Los tests unitarios **no** reemplazan el smoke en localnet o
testnet con una wallet real.

## 11. Setup local y secretos

| Qué | Dónde | Nota |
|---|---|---|
| Sui CLI | `suiup` (`~/.local/bin`) | `1.83.0-16d2dc1e05ed`, release `testnet` (STATUS H1, Toolchain) |
| CI | `.github/workflows/ci.yml` (`ubuntu-24.04`) | Versión en `env` (`SUI_VERSION`/`SUI_COMMIT`) = la de STATUS; config sin claves en `$RUNNER_TEMP`; sin secretos |
| `client.yaml` | `~/.sui/sui_config/` | Sin claves **siempre** (`active_env: testnet`, D-20261030-07); la clave del owner vive en su `SUI_CONFIG_DIR` propio (D-20261102-03). **Nunca** en el repo ni en logs |
| Keystore / direcciones | `~/.sui/sui_config/` | **Nunca** en el repo ni en logs |
| Node | nvm (20, 22 y 26 instalados) | Usar la de `.nvmrc` (`nvm use`) |
| Wallet de navegador | extensión de wallet Sui | Para smokes en testnet (owner) |
| Wallet de desarrollo | burner del kit (`app/`) | Solo en localnet **y** con `npm run dev` (D-20261102-02 (5)); nunca en un build de testnet. Sin claves del owner |

**Nunca** imprimir ni copiar mnemonics, claves privadas ni el contenido del keystore (SEG-3).

## 12. Deploy

- **Contratos:** `node scripts/publish.mjs publish --network testnet` desde `contracts/`, **solo el owner**, en su
  terminal y con su `SUI_CONFIG_DIR` propio (fuera de `~/.sui/`, D-20261102-03); ningún agente corre el camino testnet.
  Publicar, upgradear y custodiar el `UpgradeCap`/`HouseCap` es del owner. Detalle y recuperación:
  `contracts/README.md` → "Despliegues".
- **Orden de #8:** pre-vuelo H13 (repin si hace falta, gates re-medidos y commiteados) →
  `SUI_CONFIG_DIR=<su dir> node scripts/publish.mjs publish --network testnet --dry-run` → lo mismo sin `--dry-run`
  (dry run interno + confirmación escribiendo `testnet`; escribe `deployments/testnet.json` y la CLI,
  `Published.toml`) → `update_fee_rate` con el comando que imprime el script → entrega de `testnet.json` +
  `Published.toml` + digest (sin direcciones) en el mismo PR → borrar el directorio temporal del script.
- **Dirección publicadora:** recibe el `HouseCap` (`key` sin `store`, PROY-3). Si no es la wallet del
  navegador del panel admin (#14, `#/admin`), el owner le pasa el cap con `transfer_house_cap` por CLI (no con "Send"
  de la wallet; la app no lo transfiere), con el checklist de `contracts/README.md`, "Qué pasa si se pierde el cap".
  La dirección publicadora también tiene el `UpgradeCap` (N-3): importar su clave en una wallet de navegador va contra
  D-20261102-03.
- **Post-publicación (#8):** la House nace con fee 0 (D-20261030-11); `update_fee_rate` antes de anunciar el
  juego, o las partidas creadas antes quedan con comisión 0 para siempre.
- **App:** hosting estático (por definir en el backlog).
- **Mainnet:** fuera de alcance sin decisión registrada.

## 13. Checklist pre-entrega

- [ ] Gate del área tocada en verde, con output pegado en el reporte (§3). Rojos conocidos sin delta.
- [ ] Contrato on-chain: si cambió una firma/struct/evento/abort code, tablas de `contracts/README.md` y
      módulo `app/src/sui/` actualizados en el mismo ciclo (§5).
- [ ] AuthZ por función: quién puede llamar (jugador, invitado, admin con `HouseCap`) y test del caso denegado.
      AuthZ por capability ⇒ el caso denegado se cubre verificando la custodia del cap, no con `expected_failure`.
- [ ] Fondos: conservación testeada (balances antes/después) en cada camino que mueve SUI.
- [ ] Sin claves, mnemonics ni secretos en código, docs o logs.
- [ ] Docs actualizadas si cambió arquitectura, layout, comandos, contrato o tests (PROY-20): README del
      área + este archivo + `documents/STATUS.md`.

## 14. Mapa de Documentación

| Documento | Rol |
|---|---|
| `documents/ESTANDARES.md` | Reglas ARQ/SEG/LIM/PROY — contrato de revisión (citar hallazgos por ID) |
| `documents/DECISIONES.md` | Registro de decisiones (`D-YYYYMMDD-N`). No reabrir sin el owner |
| `documents/STATUS.md` | Ciclos activos, baselines de gates, hallazgos y pendientes |
| `documents/FLUJO_AGENTES.md` | Pipeline multi-agente: roles, permisos, plantillas |
| `documents/agentes/*.md` | Prompts de rol (DEV / MID / MAYOR / ORQUESTADOR) |
| `README.md` | Visión del producto y roadmap original (2025-03) |
| `contracts/README.md` | Contrato on-chain: tablas de funciones, eventos y abort codes, authZ, versionado y operación |
| `app/README.md` | App web: requisitos, scripts, red del build, localnet/testnet, capas, mapa de `app/src/sui/`, dependencias y avisos de seguridad |
