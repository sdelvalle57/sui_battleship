# SMOKE_RAILWAY_DEPLOY, parte A (local, antes de #8)
> Plan: PLAN_RAILWAY_DEPLOY v1.1 | Issue: #15 | Fecha: 2026-11-04 | Estado: parte 1 PASA (21/21); parte 2 PASA (11/11); parte 3 PASA (7/7); parte B PASA (18/18); smoke B del owner pendiente (S-7)

## Precondiciones
- **Red:** en la parte 1 no hay red local. Solo descargas de imágenes públicas y, en E-6, lecturas públicas de testnet sin claves.
- **Cuentas:** ninguna.
- **Cliente:**
  - Docker 29.1.3 con el builder clásico: `docker buildx` da "unknown command";
  - Chrome headless (`/opt/google/chrome/chrome`) con perfil, `HOME` y `XDG_*` propios en `<scratchpad>`, depuración en `127.0.0.1:9230`;
  - Node `v26.13.0` en el host.
- **Directorios:** `<scratchpad>/ensayo-15/`, borrado en C-1.
- **Puertos:** 8090, 8091, 8092 y 9230 libres (`ss -ltn` sin filas) antes de usarlos. No toqué el `:4173` ni los puertos de #14.

## Parte 1: imagen, script y ensayo (TASK-2)

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| V-1 | Línea base de Docker, digests en Docker Hub, fechas de release y `docker pull` | Digests = §3.2; versiones ≥ 7×24 h; pull OK; línea base anotada | Línea base a las **2026-11-04T08:25:56Z**: **2 contenedores, 3 imágenes**. Digests de Hub iguales a §3.2 y al plan, también el de actionlint (`b1934ee5…5667`). Releases: v26.12.1 2026-10-21T10:38:29Z y v2.11.7 2026-10-03T05:58:33Z (≥ 7 días). Los 3 pulls con exit 0 a las 08:26:44Z. Observación: `tag_last_pushed` es 2026-10-28 para node y **2026-10-30 para caddy** (< 7 días, rebuild de la misma versión; riesgo 1 del reporte) | ✅ |
| V-2 | shellcheck con la imagen de actionlint | 0 hallazgos | `exit=0`, sin output (ShellCheck 0.11.0) | ✅ |
| V-3 | `bash app/scripts/check-deploy-image.sh . 8090` en el repo real | `exit=0`; `OK (negativo)`; el mensaje sale en el primer `RUN`; sin `npm ci`; anotar tiempo | `Modo negativo…` / `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`, `exit=0`, **2 s**. Log (build repetido, Desviación 2): contexto 1.103 MB; `Step 5/19 : RUN test -f …` es el primer `RUN`; stderr `ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 …`; `Removed intermediate container`; `returned a non-zero code: 1`. 0 líneas de `npm ci` / `added … packages` | ✅ |
| E-1a | `git ls-files … \| xargs -0 cp --parents -t <ctx>` | Versionados + nuevos del task; sin `node_modules`, `app/dist` ni `.env.local` | `exit=0`, 184 archivos. Están `Dockerfile`, `.dockerignore`, `app/Caddyfile`, `app/public/favicon.svg` y el script. No están `node_modules`, `app/node_modules`, `app/dist`, `app/.env.local` ni `contracts/deployments` | ✅ |
| E-1b | `publish.mjs` y `deployment.mjs` de `origin/feature/issue-8-testnet-publish` | Los dos módulos de #48 en la copia; el repo no cambia | Rama en `26f2676`. `publish.mjs` (858 líneas, distinto del de master) y `deployment.mjs` (392 líneas, igual al de master), los dos con exit 0. `git status` del repo: solo los 4 archivos del task | ✅ |
| E-1c | `testnet.json` sintético (script `node` en `<scratchpad>`) | 14 campos, solo 2 cambios | `campos 14 cambiados network,chainId`. El `diff` contra el fixture solo muestra `"network": "testnet"` y `"chainId": "4c78adac"` | ✅ |
| E-1d | `Published.toml` sintético `[published.testnet]` | Coherente con el json | Cabecera del fixture + `chain-id = "4c78adac"`, `published-at` = `original-id` = `packageId` del json, `version = 1`, `toolchain-version = "1.83.0"`, `build-config = { flavor = "sui", edition = "2024" }`, `upgrade-capability` = `upgradeCapId` del json | ✅ |
| E-1e | `node <ctx>/contracts/scripts/publish.mjs check` | `1 despliegue(s) válidos…`, `exit=0` | `v26.13.0` / `1 despliegue(s) válidos y coherentes con Published.toml` / `exit=0`; lo mismo desde `<ctx>/contracts` | ✅ |
| E-1f | Listado del contexto con busybox sobre `<ctx>`; `rmi` en el mismo paso | Exactamente la lista blanca | build exit 0, `rmi` exit 0, contexto de 1.106 MB, **148 archivos** (listado abajo). Fuera de `app/src`: `.npmrc`, `.nvmrc`, `package.json`, `package-lock.json`; `app/{Caddyfile, README.md, eslint.config.js, index.html, package.json, public/favicon.svg, tsconfig.json, tsconfig.node.json, vite.config.ts}`; `contracts/{Published.toml, deployments/testnet.json, scripts/deployment.mjs, scripts/publish.mjs}`. Más 131 de `app/src`, idénticos a los del árbol (`diff` vacío). **Sin** `app/.env.example` (existe en el ctx), `app/scripts`, `node_modules`, `dist`, `.git`, otros archivos de `contracts/`, `Dockerfile` ni `.dockerignore` | ✅ |
| E-1g | Lo mismo sobre `<repo>`, con `contracts/deployments/localnet.json` (`{}`) y `app/.env.local` de prueba, borrados después | Ni `localnet.json` ni `.env.local`; `git status` igual que antes | build exit 0, `rmi` exit 0, **146 archivos**. Es el listado de E-1f menos `contracts/Published.toml` y `contracts/deployments/testnet.json` (el `diff` muestra solo esas 2 líneas). Grep de `localnet.json\|\.env\|testnet.json\|Published.toml\|node_modules\|/dist/\|/scripts/check\|/.git/\|Dockerfile\|dockerignore`: "ninguno", aunque `app/dist`, `app/node_modules` y `node_modules` existían en el repo. Los dos archivos de prueba se borraron (también `rmdir contracts/deployments`). `git status` idéntico al de antes | ✅ |
| E-2 | `CHECK_KEEP_TAG=battleship-app:ensayo-15 bash app/scripts/check-deploy-image.sh <ctx> 8090` | `exit=0`; P1-P13 | Output abajo. `exit=0`, **98 s**. Quedan `battleship-app:ensayo-15` y ningún `deploy-image-*`; `:8090` libre | ✅ |
| E-3 | `upgrade-capability` alterado (`0xc13c…` → `0xd13c…`); build; restaurar; `rmi` | `exit≠0`; `deployments incoherentes` y `upgradeCapId`; sin `.nvmrc sin versión válida` | `exit=1`. Step 5 (guarda) pasa. `Step 6/19 : RUN node contracts/scripts/publish.mjs check` → `deployments incoherentes:` / `deployments/testnet.json: upgradeCapId (0xc13c…74b3) ≠ upgrade-capability de Published.toml (0xd13c…74b3)` → `returned a non-zero code: 1`. Conteos: `deployments incoherentes` 1, `upgradeCapId` 1, `.nvmrc sin versión válida` **0**. Archivo restaurado (`cmp` OK) | ✅ |
| E-4 | `deploy-image-e4` con `PORT=8091` | `200` en 8091; contenedor borrado | `run exit=0`; `curl` da **200**. Logs de Caddy: `using config from file`, `admin endpoint disabled`. `docker rm -f` ok, 0 restos, `:8091` libre | ✅ |
| E-5 | `caddy validate` en el log del build | `Valid configuration` y el `RUN` del runtime con exit 0 | Build `--no-cache` aparte (Desviación 1), exit 0. `Step 17/19 : RUN setcap -r /usr/bin/caddy && caddy validate … && grep -qF …` → `adapted config to JSON` → **`Valid configuration`** → `Removed intermediate container` → Step 18 `USER nobody` → `Successfully built`. En la etapa build: `1 despliegue(s) válidos…`, `added 293 packages`, `index-gXnkoRrn.js 902.23 kB`, Step 13 (4 IDs, sin localnet, origen del fullnode) sin error | ✅ |
| E-6a | `deploy-image-e6` en 8092; Chrome con `Network.enable`, `Log.enable` y listener de `securitypolicyviolation` (`addScriptToEvaluateOnNewDocument`); abrir `/` | `testnet · nodo OK`; 0 violaciones de `script-src`/`style-src`/`connect-src` | `.network-badge` = **`testnet · nodo OK`**. Pedidos: `/` 200, CSS 200, JS 200, `/favicon.svg` 200; `fullnode.testnet.sui.io` con `GetServiceInfo`, `GetCheckpoint`, `ListEvents` y `GetTransaction` (OPTIONS 200 y POST 200). `window.__cspv` = `[]`. Lobby: "No hay partidas abiertas en el historial disponible del nodo (desde 20 oct 2026, 16:00)". No hubo errores de lectura visibles (riesgo 3) | ✅ |
| E-6b | Pedido a `https://api.slush.app/api/wallet/metadata` | Sin violación de CSP; anotar status | `GET` → `net::ERR_FAILED`, `corsError: MissingAllowOriginHeader`, `blockedReason: null`. **No es CSP**: 0 violaciones. Consola: `Error fetching metadata TypeError: Failed to fetch`. Status real con `curl` público y `Origin: http://127.0.0.1:8092`: **`HTTP/2 403`**, `server: cloudflare`, sin `access-control-allow-origin` | ✅ (403) |
| E-6c | Modal de `ConnectButton` | Lista "Slush"; ícono `data:` OK; si E-6b dio 403, el ícono remoto queda sin medir | Diálogo abierto (`dialog.open = true`), título "Connect a wallet". 1 ítem: **"Slush"**, ícono `data:image/svg+xml;base64,…`, cargado (`naturalWidth` 48). 0 violaciones. **E-6b dio 403, así que el ícono remoto queda sin medir y pasa al smoke B del owner** | ✅ |
| E-6d | Elegir "Slush" | Popup a `https://my.slush.app`; `window.opener !== null` = `true`; sin login; `Target.closeTarget` | Nuevo target `page` con `openerId` = pestaña de la app: `""` → `about:blank` → `https://my.slush.app/dapp-request#…`. En el popup, `{ openerNotNull: true, origin: "https://my.slush.app", path: "/dapp-request" }`. No inicié sesión. `Target.closeTarget` → `{"success":true}`; queda solo la pestaña de la app, que sigue en `testnet · nodo OK` con `__cspv` vacío | ✅ |
| E-6e | Recorrido de toda la sesión | 0 pedidos a `*.mvr.mystenlabs.com`; 0 `securitypolicyviolation` | 53 pedidos: 21 de la app, 32 del popup. **MVR: 0.** Listener: **0** violaciones en todas las pestañas; logs "Refused to"/CSP: 0; `loadingFailed` con `blockedReason`: 0. Orígenes de la app: `127.0.0.1:8092` (4), `fullnode.testnet.sui.io` (15), `api.slush.app` (1, el CORS de E-6b), `data:` (1). Los del popup (`my.slush.app`, framer, clarity, GA, etc.) son del sitio de Slush, bajo su propia política | ✅ |
| C-1 | Cierre: Chrome, contenedor, etiqueta, limpieza por línea base sin `prune`, directorios, puertos, `git status` | Diferencias vacías; sin directorios; puertos libres; repo solo con los archivos del task | Detalle abajo | ✅ |

**Output de E-2:**
```text
Modo positivo: el contexto tiene contracts/deployments/testnet.json
P1 ok: imagen construida
P2 ok: el contenedor responde en http://127.0.0.1:8090/
P3 ok: corre como 65534 con --cap-drop=ALL
P4 ok: / 200 y CSP idéntica a la del Caddyfile
P5 ok: cabeceras de seguridad y Cache-Control de / exactas
P6 ok: sin Cross-Origin-Opener-Policy ni Server
P7 ok: /assets/index-gXnkoRrn.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable
P8 ok: /assets/index-gXnkoRrn.js comprimido (zstd)
P9 ok: /favicon.svg 200, image/svg+xml
P10 ok: /no-existe 404
P11 ok: /game/0x1 404
P12 ok: /assets/no-existe.js 404 sin immutable
OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)
exit=0
segundos=98
```

**Detalle de C-1:**
1. **Procesos:**
   - `kill <pid de Chrome>`; `kill -0` da exit 1 y no queda ningún proceso con el perfil `chrome-15-task2`;
   - el grabador CDP ya había salido solo al cerrarse Chrome, y `kill -0` da exit 1.
2. **Contenedor y etiqueta:**
   - `docker rm -f deploy-image-e6` → `deploy-image-e6`;
   - `docker rmi battleship-app:ensayo-15` → `Untagged` + 5 `Deleted`.
3. **Contenedores nuevos respecto de la línea base:** 0. No había nada para inspeccionar ni borrar.
4. **Imágenes nuevas respecto de la línea base: 34.** Las borré por ID con `docker rmi` y quedaron limpias en 2 pasadas. Todas eran del ensayo:
   - 31 intermedias `<none>` de la etapa build, con `Cmd [node]` heredado de `node:26.12.1`, que no estaba en la línea base;
   - las 3 bases de V-1: `node@…e28c`, `caddy@…4ee5` y `rhysd/actionlint@…5667`.
5. **`comm` repetido:**
   - contenedores nuevos: **0**, imágenes nuevas: **0**;
   - faltantes de la base: `ps=0 img=0`;
   - quedan `postgres:17`, `postgres:16-alpine` y `busybox:latest`, con los contenedores ajenos `cancerbero_back-db-1` y `backend-postgres-1` corriendo, intactos.
6. **Directorios:** `rm -rf <scratchpad>/ensayo-15`; `ls` da "No such file or directory". También borré `tmp15`, el perfil y el `HOME`/`XDG` de Chrome y `docker-base-15`: TASK-3 no corre en esta sesión y usará su propia línea base L-0.
7. **Puertos:** `:8090`, `:8091`, `:8092` y `:9230` con 0 filas.
8. **Repo:** `git status --porcelain --untracked-files=all` muestra solo `?? .dockerignore`, `?? Dockerfile`, `?? app/Caddyfile` y `?? app/scripts/check-deploy-image.sh`. No quedan `contracts/deployments/`, `app/.env.local`, `testnet.json` ni `Published.toml` en el árbol.

**Listado completo de E-1f (148 archivos bajo `/ctx`):**
```text
/ctx/.npmrc
/ctx/.nvmrc
/ctx/app/Caddyfile
/ctx/app/README.md
/ctx/app/eslint.config.js
/ctx/app/index.html
/ctx/app/package.json
/ctx/app/public/favicon.svg
/ctx/app/src/App.test.tsx
/ctx/app/src/App.tsx
/ctx/app/src/components/AccountBadge.test.tsx
/ctx/app/src/components/AccountBadge.tsx
/ctx/app/src/components/ConfigError.test.tsx
/ctx/app/src/components/ConfigError.tsx
/ctx/app/src/components/CreateGameForm.machine.test.tsx
/ctx/app/src/components/CreateGameForm.test.tsx
/ctx/app/src/components/CreateGameForm.tsx
/ctx/app/src/components/GameActions.machine.test.tsx
/ctx/app/src/components/GameActions.test.tsx
/ctx/app/src/components/GameActions.tsx
/ctx/app/src/components/GameDetail.test.tsx
/ctx/app/src/components/GameDetail.tsx
/ctx/app/src/components/Header.test.tsx
/ctx/app/src/components/Header.tsx
/ctx/app/src/components/HistoryTime.tsx
/ctx/app/src/components/LobbyList.test.tsx
/ctx/app/src/components/LobbyList.tsx
/ctx/app/src/components/MyGamesSection.test.tsx
/ctx/app/src/components/MyGamesSection.tsx
/ctx/app/src/components/NetworkBadge.test.tsx
/ctx/app/src/components/NetworkBadge.tsx
/ctx/app/src/components/ReadState.test.tsx
/ctx/app/src/components/ReadState.tsx
/ctx/app/src/components/TransactionStatus.test.tsx
/ctx/app/src/components/TransactionStatus.tsx
/ctx/app/src/components/createdNotice.ts
/ctx/app/src/components/txNotice.ts
/ctx/app/src/hooks/configContext.ts
/ctx/app/src/hooks/queryKeys.ts
/ctx/app/src/hooks/txInvalidation.test.ts
/ctx/app/src/hooks/txInvalidation.ts
/ctx/app/src/hooks/txSession.test.ts
/ctx/app/src/hooks/txSession.ts
/ctx/app/src/hooks/useAcceptGame.test.tsx
/ctx/app/src/hooks/useAcceptGame.ts
/ctx/app/src/hooks/useAccountTxBusy.ts
/ctx/app/src/hooks/useAppConfig.ts
/ctx/app/src/hooks/useCancelGame.test.tsx
/ctx/app/src/hooks/useCancelGame.ts
/ctx/app/src/hooks/useCheckpointTime.ts
/ctx/app/src/hooks/useCreateGame.test.tsx
/ctx/app/src/hooks/useCreateGame.ts
/ctx/app/src/hooks/useExecuteTransaction.test.tsx
/ctx/app/src/hooks/useExecuteTransaction.ts
/ctx/app/src/hooks/useGame.test.tsx
/ctx/app/src/hooks/useGame.ts
/ctx/app/src/hooks/useHouse.test.tsx
/ctx/app/src/hooks/useHouse.ts
/ctx/app/src/hooks/useLobby.test.tsx
/ctx/app/src/hooks/useLobby.ts
/ctx/app/src/hooks/useMyGames.test.tsx
/ctx/app/src/hooks/useMyGames.ts
/ctx/app/src/hooks/useNodeStatus.test.tsx
/ctx/app/src/hooks/useNodeStatus.ts
/ctx/app/src/hooks/useRejectGame.ts
/ctx/app/src/hooks/useSuiBalance.ts
/ctx/app/src/hooks/useTransactionTime.test.tsx
/ctx/app/src/hooks/useTransactionTime.ts
/ctx/app/src/hooks/useTxTarget.test.tsx
/ctx/app/src/hooks/useTxTarget.ts
/ctx/app/src/hooks/useWalletAccount.ts
/ctx/app/src/index.css
/ctx/app/src/main.tsx
/ctx/app/src/pages/GameDetailPage.test.tsx
/ctx/app/src/pages/GameDetailPage.tsx
/ctx/app/src/pages/HomePage.test.tsx
/ctx/app/src/pages/HomePage.tsx
/ctx/app/src/pages/MyGamesPage.test.tsx
/ctx/app/src/pages/MyGamesPage.tsx
/ctx/app/src/pages/NotFoundPage.tsx
/ctx/app/src/providers/AppProviders.test.tsx
/ctx/app/src/providers/AppProviders.tsx
/ctx/app/src/sui/acceptGame.test.ts
/ctx/app/src/sui/acceptGame.ts
/ctx/app/src/sui/account.test.ts
/ctx/app/src/sui/account.ts
/ctx/app/src/sui/config.test.ts
/ctx/app/src/sui/config.ts
/ctx/app/src/sui/createGame.test.ts
/ctx/app/src/sui/createGame.ts
/ctx/app/src/sui/dappKit.test.ts
/ctx/app/src/sui/dappKit.ts
/ctx/app/src/sui/errors.test.ts
/ctx/app/src/sui/errors.ts
/ctx/app/src/sui/eventScan.test.ts
/ctx/app/src/sui/eventScan.ts
/ctx/app/src/sui/events.test.ts
/ctx/app/src/sui/events.ts
/ctx/app/src/sui/execution.test.ts
/ctx/app/src/sui/execution.ts
/ctx/app/src/sui/explorer.test.ts
/ctx/app/src/sui/explorer.ts
/ctx/app/src/sui/format.test.ts
/ctx/app/src/sui/format.ts
/ctx/app/src/sui/game.test.ts
/ctx/app/src/sui/game.ts
/ctx/app/src/sui/gameActions.test.ts
/ctx/app/src/sui/gameActions.ts
/ctx/app/src/sui/gameDetail.test.ts
/ctx/app/src/sui/gameDetail.ts
/ctx/app/src/sui/gameTx.test.ts
/ctx/app/src/sui/gameTx.ts
/ctx/app/src/sui/house.test.ts
/ctx/app/src/sui/house.ts
/ctx/app/src/sui/ids.test.ts
/ctx/app/src/sui/ids.ts
/ctx/app/src/sui/lobby.test.ts
/ctx/app/src/sui/lobby.ts
/ctx/app/src/sui/myGames.test.ts
/ctx/app/src/sui/myGames.ts
/ctx/app/src/sui/networks.test.ts
/ctx/app/src/sui/networks.ts
/ctx/app/src/sui/nodeInfo.test.ts
/ctx/app/src/sui/nodeInfo.ts
/ctx/app/src/sui/readErrors.test.ts
/ctx/app/src/sui/readErrors.ts
/ctx/app/src/sui/readPolicy.test.ts
/ctx/app/src/sui/readPolicy.ts
/ctx/app/src/sui/readStatus.test.ts
/ctx/app/src/sui/readStatus.ts
/ctx/app/src/sui/transactionInfo.test.ts
/ctx/app/src/sui/transactionInfo.ts
/ctx/app/src/sui/transactions/game.test.ts
/ctx/app/src/sui/transactions/game.ts
/ctx/app/src/test/queryHarness.tsx
/ctx/app/src/test/scanHarness.ts
/ctx/app/src/test/setup.ts
/ctx/app/src/test/txHarness.tsx
/ctx/app/src/vite-env.d.ts
/ctx/app/tsconfig.json
/ctx/app/tsconfig.node.json
/ctx/app/vite.config.ts
/ctx/contracts/Published.toml
/ctx/contracts/deployments/testnet.json
/ctx/contracts/scripts/deployment.mjs
/ctx/contracts/scripts/publish.mjs
/ctx/package-lock.json
/ctx/package.json
```
E-1g da el mismo listado sin `/ctx/contracts/Published.toml` ni `/ctx/contracts/deployments/testnet.json` (146 archivos).

## Parte 2: CSP con el kit en la localnet aislada (TASK-3)

> Corrida del 2026-11-04 (10:14-10:25 UTC) sobre `d131f44` (#14 ya mergeado: localnet libre, D-20261104-03 (6)).

**Precondiciones de la corrida:**
- **Entornos.** `<SMOKE_DIR>` = `<scratchpad>/smoke-15`, con `net/`, `tmp/`, `home/`, `chrome-profile/` y
  `chrome-home/`. Hay tres archivos de entorno con rutas literales, y nunca se cargan dos en la misma llamada:
  - `env.sh`, el de `agents.md` §3, solo para `sui`/`suic`;
  - `app.env`, con la guarda `[ -z "$SUI_CONFIG_DIR" ] || { echo APPENV-FAIL; return 97; }` en la primera línea y
    después `SMOKE_DIR`, `REPO`, `NODE` y el `PATH` de Node 26, para npm y Node;
  - `chrome.env`, con `SMOKE_DIR`, `CHROME` = `/opt/google/chrome/chrome` y `HOME`/`XDG_*` en
    `<SMOKE_DIR>/chrome-home`.
- **Regla B4:** todo `suic`, también los de solo lectura, lleva
  `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&`.
- **Prohibiciones:** nada de `new-address`, faucet ni `--force-regenesis`. Ningún proceso de Node lee
  `<SMOKE_DIR>/net`.
- **Procesos:** `sui.pid`, `chrome.pid` y `recorder.pid`, todos lanzados con `exec` en segundo plano del harness.
- **Navegador:** Chrome headless en `127.0.0.1:9230` con el perfil propio. Un grabador CDP en Node, lanzado con
  `app.env`, se adjunta a cada página e instala un listener de `securitypolicyviolation` con
  `Page.addScriptToEvaluateOnNewDocument`. La pestaña se abre con `Target.createTarget({ newWindow: true })`.

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| L-0 | Precondición; línea base de `~/.sui` y de Docker; `8093`/`9230` libres | Puertos libres; líneas base anotadas | Aviso del orquestador: #14 mergeado y localnet libre. `ss -ltn` sin filas en `9000`, `9123`, `9184`, `5173`, `5003`, `9229`, `9339`, `8093` y `9230`. Ningún `sui start` corriendo y ningún `<SMOKE_DIR>` de #14 (sin `net/` ni `sui.pid` en los scratchpads de Battleship). Sin `contracts/deployments/`, `Published.toml` ni `Pub.*.toml`; `git status` vacío @ `d131f44`. `~/.sui/sui_config/` (`stat`/`ls`): `2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml` y `client.yaml`. Docker en `<scratchpad>/docker-base-15-l/`: **2 contenedores, 3 imágenes** | ✅ |
| L-1 | Localnet aislada (pasos 2-5) y publicación variante B | `suic chain-identifier` responde; existe `contracts/deployments/localnet.json` (ignorado) | `"$SUI" genesis --working-dir "$SUI_CONFIG_DIR"` exit 0 (`sui 1.83.0-16d2dc1e05ed`). `sui start --network.config "$SUI_CONFIG_DIR"` en segundo plano: `:9000` arriba en ~1 s, y el PID que escucha es el de `sui.pid`. `PRE suic active-env` ⇒ `localnet`; `PRE suic chain-identifier` ⇒ `59804278`. `PRE suic addresses --json` ⇒ 5 cuentas: `ADMIN` (la activa) y `A` a `ids.env`. `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml"` ⇒ exit 0, `Despliegue escrito en <repo>/contracts/deployments/localnet.json` (chain `59804278`, `publishTxDigest` `7pixigzm5TrGiGFtKJEWL6qVkfVcquk9u8BLP1D65FBe`). `Move.lock` sin delta; `git status` vacío. `PKG` y `HOUSE` a `ids.env` con `sed`, sin Node. `PRE suic object "$HOUSE" --json`: `fee_rate` 0, `min_bet` 1000000, `max_bet` 50000000000, `fees_collected` 0, `version` 1 | ✅ |
| L-2 | Partida abierta por CLI y `GAME` a `ids.env` | Tx `success`; `GAME=0x…` en `ids.env` | `PRE act_as "$A" && suic ptb --split-coins gas "[10000000]" --assign c --move-call "$PKG::game::create_game" @"$HOUSE" c.0 none --json` ⇒ digest `5mhTu8UJdELX96HwKPs94v9q1jruPAuoLm8yUeEhq7zu`, `status: success`, evento `game::GameCreated` con `bet` 10000000 y `opponent` `None`. `GAME` (`0xa8eb0f84…`) a `ids.env`. Hay dos ajustes respecto del texto del paso, ambos en Desviaciones: `c.0` en lugar de `c`, y firmó `A` en lugar de `ADMIN` | ✅ |
| L-3 | Build de producción fuera del repo | Exit 0; `<SMOKE_DIR>/dist` con favicon; `<repo>/app/dist` sin cambios | Con `app.env`: `VITE_SUI_NETWORK=localnet npm run build -w app -- --outDir "$SMOKE_DIR/dist" --emptyOutDir` ⇒ exit 0, `index-GeuVE8XQ.js` 917.80 kB (277.96 kB gzip). `dist/` tiene `index.html` (con `rel="icon"`), `favicon.svg` y `assets/`. Los `sha256sum` de los 4 archivos de `<repo>/app/dist` son idénticos antes y después; `git status` vacío. **Observación:** el bundle embebe `network:` + `` `localnet` `` con backticks, y el patrón del Dockerfile `network:"localnet"\|"network":"localnet"` da **0** sobre este bundle de localnet (ver Hallazgos) | ✅ |
| L-4 | Copia del Caddyfile con `sed` y `diff` | Solo cambia `connect-src` | El `diff` da una sola línea (12c12), la de la CSP; palabra por palabra, solo `https://fullnode.testnet.sui.io` → `http://127.0.0.1:9000`. `git diff --exit-code -- app/Caddyfile` limpio | ✅ |
| L-5 | Imagen desechable de la etapa runtime en `:8093` | `curl` = 200 | `<SMOKE_DIR>/l5/` con `dist/`, el `Caddyfile` de L-4 y un Dockerfile con las líneas de la etapa runtime: `FROM caddy:2.11.7-alpine@sha256:e70b…4ee5`, los dos `COPY`, `RUN setcap -r … && caddy validate …`, `USER nobody` y el mismo `CMD`. Sin el `grep` del origen de testnet (Desviaciones). `docker build --force-rm -t battleship-app:l5-15` ⇒ `Valid configuration`, `Successfully tagged`. `docker run -d --name deploy-image-l5 --cap-drop=ALL -e PORT=8093 -p 127.0.0.1:8093:8093` ⇒ `/` **200**; `id -u` = 65534; `connect-src 'self' http://127.0.0.1:9000 https://api.slush.app` | ✅ |
| L-6 | Chrome headless con listener; `http://127.0.0.1:8093/` | `localnet · nodo OK`; el lobby muestra la partida de L-2; los `POST http://127.0.0.1:9000/sui.rpc.v2.*` dan 200 | Chrome 156.0.8078.73 con `chrome.pid` = el PID que escucha en `127.0.0.1:9230`. Pestaña `visible`. `.network-badge` = **`localnet · nodo OK`**. "Partidas abiertas": `0.01 SUI · comisión 0 % · creada por 0x3cc1…3a5d · … · Ver partida`, con enlace a `#/game/<GAME>`. Red: `/`, JS, CSS y `favicon.svg` dan 200; `POST` a `:9000` `GetServiceInfo` ×2, `ListEvents` ×1, `BatchGetObjects` ×1 y `GetTransaction` ×2, **todos 200**, con sus `OPTIONS` 200. `__cspv` = `[]`; consola sin errores | ✅ |
| L-7 | Modal de `ConnectButton`; `adoptedStyleSheets` del shadow root | Modal visible ("No wallets installed"); `adoptedStyleSheets.length > 0` | `dialog.open = true`, `display: block`, `position: fixed`, fondo `oklch(1 0 0)`, radio 12px; título **"No wallets installed"** (localnet de producción: sin Slush ni burner). `adoptedStyleSheets.length`: `connect-button` **2**, `connect-modal` 4, `internal-button` 3, `wallet-list` 3. **0** `<style>` en los shadow roots. El botón "Conectar wallet" tiene fondo `oklch(0.216 0.006 56.043)` y radio 10px: los estilos del kit se aplican. 0 violaciones | ✅ |
| L-8 | `#/my-games`; después `#/game/$GAME`; recargar (`Page.reload`) | Las dos rutas cargan después de recargar; el detalle muestra la partida (`Pending`, monto) | `#/my-games`, antes y después de `Page.reload`: "Mis partidas · Conecta tu wallet para ver tus partidas e invitaciones" con `localnet · nodo OK`. `#/game/<GAME>`, antes y después de recargar (`pathname` `/`): "Estado **Abierta**" (`Pending`), "Apuesta **0.01 SUI**", "Comisión 0 %", "Pozo 0.02 SUI · comisión 0 SUI · al ganador 0.02 SUI". Cada recarga trae `/`, JS, CSS y favicon con 200 y relee por gRPC (`BatchGetObjects`, `GetTransaction`, `GetServiceInfo`, todos 200) | ✅ |
| L-9 | Total de la sesión | **0** `securitypolicyviolation` | 34 pedidos en 2 páginas (la `about:blank` inicial y la de la app): 13 `POST` gRPC a `:9000`, todos 200; **0** pedidos fuera de `127.0.0.1` (más allá de `data:`); 0 a MVR. `window.__cspv` = `[]`; listener **0**; logs "Refused to"/CSP **0**; `loadingFailed` con `blockedReason` **0**. No hizo falta `'unsafe-inline'` | ✅ |
| C-2 | Cierre de la parte 2 | Todo limpio; el exit 144 de `sui start` es esperado | Detalle abajo | ✅ |

**Detalle de C-2:**
1. **Procesos:**
   - `kill <chrome.pid>`: `kill -0` sale con 1. `pgrep -af <SMOKE_DIR>/chrome-profile` queda vacío;
   - el grabador salió al cerrarse el websocket y `kill -0` sale con 1.
2. **Contenedor e imagen:** `docker rm -f deploy-image-l5` y `docker rmi battleship-app:l5-15` (`Untagged` + 2
   `Deleted`).
3. **Docker contra la línea base de L-0:**
   - contenedores nuevos: 0;
   - imagen nueva: 1, `caddy:2.11.7-alpine@…4ee5`, que se bajó de nuevo y se borró por ID;
   - al repetir: contenedores nuevos 0, imágenes nuevas 0, faltantes `ps=0 img=0`;
   - quedan `postgres:17`, `postgres:16-alpine` y `busybox` con sus 2 contenedores ajenos, intactos;
   - `<scratchpad>/docker-base-15-l` borrado. Sin `prune`.
4. **Puertos:** `:8093` y `:9230` sin filas.
5. **Paso 7 de `agents.md` §3:**
   - `kill <sui.pid>`; en otra llamada, `kill -0` sale con 1 y `:9000` sin filas. `sui start` terminó con **144**,
     el esperado;
   - `rm -rf <SMOKE_DIR>` (comprobado: ya no existe);
   - `rm -f contracts/deployments/localnet.json` y `rmdir contracts/deployments` (comprobado: no existe);
   - `stat`/`ls` de `~/.sui/sui_config/`, sin `env.sh`, **idénticos** a L-0;
   - `git status --porcelain` vacío, salvo este SMOKE; `git diff --exit-code -- contracts/Move.lock` limpio;
   - sin `contracts/Pub.*.toml`, `contracts/Published.toml` ni `contracts/deployments/`.

**Hallazgos de la parte 2:**
- **H-1, defensa en profundidad del Dockerfile inefectiva** (no hace fallar ningún paso).
  - Qué pasa: el minificador (Vite 8 / rolldown) emite el json embebido como objeto con template literals, así:
    ``var _R={schemaVersion:1,network:`localnet`,chainId:`59804278`,…}``. La comprobación (b) del `RUN` de bundle del
    `Dockerfile` (`grep -rqE 'network:"localnet"|"network":"localnet"' app/dist/assets`) no detecta esa forma: sobre
    el bundle real de localnet de L-3 da **0** coincidencias.
  - Mitigación actual: `localnet.json` no puede entrar al contexto, por la lista blanca de `.dockerignore`, verificada
    en E-1f/E-1g. Además, (a) exige los 4 IDs de `testnet.json` en el bundle.
  - Riesgo: (b) no aporta nada como segunda barrera.
  - Corrección propuesta (fuera del alcance de TASK-3; el Dockerfile está aprobado en TASK-2): que el patrón acepte
    también la forma con backticks, ``network:`localnet` ``, además de las dos con comillas dobles. Lo decide el MID o
    el MAYOR.

## Reporte final (parte 2)
- **Pasos PASA/TOTAL:** 11/11 (L-0..L-9 y C-2).
- **Hallazgos:** H-1 (patrón de localnet del Dockerfile inefectivo; mitigado por la lista blanca). 0 violaciones de
  CSP con el kit montado: `style-src 'self'` alcanza sin `'unsafe-inline'`.
- **Veredicto (parte 2):** PASA.

## Parte 3: H-1, comprobación (b) del bundle (TASK-2b)

> Corrida del 2026-11-04 (10:26-10:40 UTC) sobre `bbb419f` (handoff v1.5), con el `Dockerfile` del repo ya en v1.5:
> `git diff Dockerfile` muestra una sola línea, la de (b), idéntica al literal de §3.2 (extraído del handoff y comparado
> con `diff`). Puertos: solo 8090. Builder clásico (sin buildx).

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| H-0 | Línea base de Docker en `<scratchpad>/docker-base-15-h/`; `ss -ltn 'sport = :8090'` sin filas | Base anotada (contenedores, imágenes); puerto libre | 2026-11-04T10:26:00Z: **2 contenedores, 3 imágenes** (`postgres:17`, `postgres:16-alpine`, `busybox:latest`). `:8090` sin filas | ✅ |
| H-1 | Contexto `<scratchpad>/h1-15/ctx` (E-1a..E-1e) más `localnet.json` literal del fixture de #48 y `!contracts/deployments/localnet.json` solo en el `.dockerignore` de la copia; `publish.mjs check` | `2 despliegue(s) válidos y coherentes con Published.toml`; el repo no cambia | Copia de 205 archivos; `publish.mjs` y `deployment.mjs` de `origin/feature/issue-8-testnet-publish`; `testnet.json` sintético (`campos 14 cambiados network,chainId`) y `Published.toml` `[published.testnet]` coherente. `localnet.json` = el fixture byte a byte (`cmp`). El `diff` del `.dockerignore` contra el del repo da solo `> !contracts/deployments/localnet.json`. El `Dockerfile` de la copia es igual al del repo (v1.5). `check` ⇒ **`2 despliegue(s) válidos y coherentes con Published.toml`**, exit 0. `git status`: solo ` M Dockerfile` | ✅ |
| H-2 | **Rojo:** la línea (b) de la copia vuelve al patrón viejo; `docker build --force-rm -t battleship-app:h2-15`; `docker rmi` | `exit=0`: la imagen se construye **con** `localnet` embebido (reproduce H-1) | El `diff` contra el repo da solo la línea 22 (patrón viejo). Build **`exit=0`** en 128 s: Step 5 (guarda), Step 12 (`npm run build`, `index-Clv0Fafr.js` 918.59 kB) y Step 13 (comprobaciones del bundle) pasan; `Successfully tagged battleship-app:h2-15`. Dentro de la imagen, `grep -rhoE 'network.{0,2}localnet.{0,14}' /srv/assets` ⇒ ``network:`localnet`,chainId:`878`` (el registro de localnet del fixture, servido por Caddy). `docker rmi` ⇒ `Untagged` | ✅ (rojo reproducido) |
| H-3 | **Verde:** la línea (b) de la copia vuelve a la del repo (v1.5); `docker build --force-rm -t battleship-app:h3-15`; `docker rmi … \|\| true` | `exit≠0`; `ERROR (#15): localnet en el bundle` en el Step de las comprobaciones; los Steps anteriores pasaron | `cmp` con el `Dockerfile` del repo: idénticos. Build **`exit=1`**: Steps 1-12 pasan (guarda, `check`, `npm ci` y build, de la caché de H-2, el mismo contexto); `Step 13/19 : RUN set -eu; for f in packageId …` ⇒ **`ERROR (#15): localnet en el bundle`** ⇒ `Removed intermediate container` ⇒ `The command '/bin/sh -c set -eu; …' returned a non-zero code: 1`. Sin etiqueta que borrar | ✅ |
| H-4 | **Sin falsos positivos:** sin `localnet.json` ni la línea `!…localnet.json` en la copia; `bash app/scripts/check-deploy-image.sh <ctx> 8090` | `exit=0`, `OK (positivo)` (P1-P13) | `.dockerignore` de la copia = repo (`cmp`); `contracts/deployments/` solo con `testnet.json`. Script: P1-P12 ok (`/assets/index-CuqwqWvp.js` 200, `immutable`, `zstd`; favicon 200; los tres 404) y **`OK (positivo): …`**, **`exit=0`**, 98 s. Con GNU grep (bookworm), el patrón nuevo no toma nada del bundle de testnet. Sin `deploy-image-*` ni `battleship-app:*` después | ✅ |
| H-5 | Negativo en el repo real: `bash app/scripts/check-deploy-image.sh . 8090` | `exit=0`, `OK (negativo)` | Sin `contracts/deployments/` en el repo. `Modo negativo…` / **`OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`**, **`exit=0`** | ✅ |
| C-3 | Cierre: limpieza por la línea base de H-0 (solo IDs nuevos, sin `prune`); `comm` vacío; `rm -rf <scratchpad>/h1-15 <scratchpad>/docker-base-15-h`; `:8090` libre; `git status` | Todo limpio | Contenedores nuevos: **0**. Imágenes nuevas: **25**, todas del ensayo y borradas por ID con `docker rmi` en 2 pasadas: 23 intermedias `<none>` con `Cmd [node]` (derivadas de `node:26.12.1`, que no estaba en la base), `node:26.12.1-bookworm-slim@…e28c` y `caddy:2.11.7-alpine@…4ee5`. `comm` repetido: contenedores 0, imágenes 0, faltantes `ps=0 img=0`; quedan `postgres:17`, `postgres:16-alpine` y `busybox:latest` con sus 2 contenedores ajenos. Borrados `<scratchpad>/h1-15` y `<scratchpad>/docker-base-15-h` (`ls`: no existen). `:8090` sin filas. `git status`: solo los archivos de TASK-2b | ✅ |

## Reporte final (parte 3)
- **Pasos PASA/TOTAL:** 7/7 (H-0..H-5 y C-3).
- **Hallazgos:** ninguno. El rojo de H-2 reproduce H-1 a propósito, y H-3 prueba que el patrón nuevo lo corta dentro
  de la imagen (GNU grep de bookworm). H-4 confirma que no hay falsos positivos en el bundle de testnet.
- **Veredicto (parte 3):** PASA.

## Reporte final (parte 1)
- **Pasos PASA/TOTAL:** 21/21.
- **Hallazgos:** ninguno que haga fallar un paso. Hay 3 observaciones para el MID, detalladas en Riesgos del reporte de TASK-2:
  - V-1: el digest de caddy se publicó hace menos de 7 días;
  - E-6a: no aparecieron los errores de lectura esperados;
  - E-6b/E-6c: 403 de Slush, ícono remoto al smoke B.
- **Veredicto (parte 1):** PASA.

# SMOKE_RAILWAY_DEPLOY, parte B (después de #8)
> Plan: PLAN_RAILWAY_DEPLOY v1.1 | Issue: #15 | Fecha: 2026-11-04 | TASK-6 del handoff v1.6.1

> Corrida del 2026-11-04 (16:26-16:45 UTC) sobre `3f510d2` (D-20261104-07), hijo de `5af2fb0` (handoff v1.6.1), que es
> hijo de `ec359ec`. La puerta de DL-8 de T6-0 la levanta **D-20261104-07** (decisión del owner): TASK-6 arrancó antes
> de 2026-11-04T16:57:41Z y eso no es STOP. El resto de T6-0 y T6-1 se cumple. Builder clásico (sin buildx).

## Precondiciones (parte B)
- **Red:** solo lecturas públicas de testnet, sin claves: la app en Chrome headless, `curl` a Docker Hub, al registry y
  a `api.slush.app`, y `SuiGrpcClient` público para leer el ID de la partida de T6-9b. Sin localnet ni `sui`.
- **Cuentas:** ninguna. Ningún agente conectó una wallet.
- **Cliente:**
  - Docker 29.1.3 con el builder clásico (`docker buildx` da "unknown command"). BuildKit solo en la CI (T6-7);
  - Chrome headless 156 (`/opt/google/chrome/chrome`) con perfil, `HOME` y `XDG_*` propios en
    `<scratchpad>/chrome-15-t6/`, depuración en `127.0.0.1:9230`, cerrado por su PID;
  - Node `v26.13.0` en el host.
- **Directorios:** `<scratchpad>/n2-15/`, `<scratchpad>/chrome-15-t6/` y `<scratchpad>/docker-base-15-t6/`, borrados en C-4.
- **Puertos:** 8090, 8092 y 9230, sin filas en `ss -ltn` antes de usarlos.

## Parte B: después de #8 (TASK-6)

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| T6-0 | Puerta y línea base: `date -u`, HEAD, `git status`, `ls contracts/deployments`, línea base de Docker en `<scratchpad>/docker-base-15-t6/` con *Build Cache*, `ss -ltn` | Hora ≥ 16:57:41Z (o D-20261104-07); HEAD hijo del handoff v1.6.1; árbol limpio; solo `testnet.json`; línea base; puertos libres | `date -u` **2026-11-04T16:26:19Z**, 31 min 22 s antes de la puerta: se sigue por **D-20261104-07** (no es STOP). Edad de v26.13.0 a esa hora: **167,48 h**. `git log -1 --format='%h %p'`: `3f510d2 5af2fb0`; `5af2fb0` (handoff v1.6.1) tiene padre `ec359ec`. `git status --porcelain --untracked-files=all` vacío. `ls contracts/deployments`: `testnet.json`. Línea base: **2 contenedores, 3 imágenes** (`postgres:17`, `postgres:16-alpine`, `busybox:latest`), *Build Cache* `0B`. 8090, 8092 y 9230 sin filas | ✅ (D-20261104-07) |
| T6-1 | V-1 de Node y Caddy: Hub, registry con token anónimo, `published_at`, Caddy en Hub, `docker pull` por el digest de §3.1 y `node --version` | Hub = registry = `bc0a2afd…c1d9`; `published_at` 2026-10-28T16:57:41Z con ≥ 168 h; Caddy sin cambios; pull OK; `v26.13.0` | 16:26:28Z. Hub `.digest` = `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9` (`last_updated` 2026-10-28T23:41:51Z). Registry (token sin imprimir): `HTTP/2 200`, `content-type: application/vnd.oci.image.index.v1+json` y el mismo `docker-content-digest`. `published_at` **2026-10-28T16:57:41Z**. Caddy en Hub: `sha256:e70b164d…4ee5`, sin cambios. `docker pull node:26.13.0-bookworm-slim@<digest de §3.1>` con exit 0, y `docker run --rm --entrypoint node … --version` → **`v26.13.0`**. A las 16:27:01Z la edad es **167,49 h** (< 168 h): se acepta por **D-20261104-07**. DL-8 se vuelve a medir al commitear | ✅ (D-20261104-07) |
| T6-2 | Aplicar §3.1 y §3.2; `git diff --stat`; `git diff Dockerfile app/scripts/check-deploy-image.sh` | `Dockerfile` con 2 líneas (3-4); script solo con el bloque de N2b | `Dockerfile \| 4 ++--` y `app/scripts/check-deploy-image.sh \| 6 ++++--`. Las líneas 3-4 del `Dockerfile` y 100-106 del script son byte a byte los literales de §3.1 y §3.2 (extraídos del handoff y comparados con `diff`). El diff va en el reporte | ✅ |
| T6-3 | shellcheck con `rhysd/actionlint:1.7.12@<digest de app/README.md:214>` | `exit=0`, sin output | ShellCheck 0.11.0, `exit=0`, sin hallazgos (solo el log del pull, en stderr). Digest `b1934ee5…5667`, el de `app/README.md:214` | ✅ |
| T6-4 | Copia sin #8 en `<scratchpad>/n2-15/ctx` (como E-1a), sin `testnet.json` ni `Published.toml`; `publish.mjs check` | `0 despliegues`, `exit=0`; sin `node_modules`, `app/dist` ni `.env.local`; `git status` igual | `check` → `0 despliegues`, `exit=0`. Sin `node_modules`, `app/dist` ni `.env.local`. `Dockerfile` y script iguales a los de T6-2 (`diff -q`). `git status`: ` M Dockerfile`, ` M app/scripts/check-deploy-image.sh` | ✅ |
| T6-5 | Clásico, verde: `bash app/scripts/check-deploy-image.sh <scratchpad>/n2-15/ctx 8090` | `exit=0`, `Modo negativo…`, `OK (negativo): …` | `Modo negativo: el contexto no tiene contracts/deployments/testnet.json` / `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`, `exit=0`, **2 s**. El patrón nuevo no da un falso rojo | ✅ |
| T6-6 | Clásico, rojo provocado: la guarda de la copia sin `>&2; exit 1`; (1) el script; (2) `docker build --force-rm` y grep con el patrón de §3.2 | (1) `exit=1` con `FALLO: N2b`; (2) `exit≠0` y 1 línea `Step <k>/<m> : RUN npm ci` | Guarda: `RUN test -f contracts/deployments/testnet.json \|\| echo "ERROR (#15): falta contracts/deployments/testnet.json. … (nunca IDs a mano)."`. (1) `exit=1` en 94 s, con **`FALLO: N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)`**. La cola del log termina en `Step 13/19 : RUN set -eu; …`, con `Error: Cannot find module './contracts/deployments/testnet.json'` (el `require` del bundle): N1 y N2a pasaron. (2) `exit=1`; el grep da **1** línea: `29:Step 9/19 : RUN npm ci`. Observación: el build (2) usó la caché de (1) en los pasos 1-12 (`Using cache` ×11), así que su log no repite el `echo` de la guarda. La línea de salida que exige N2a es la del build (1) | ✅ |
| T6-7 | BuildKit en la CI, PR desechable (lo corre y lo registra el orquestador) | Run A success con `OK (negativo)`; run B failure con `FALLO: N2b` | PR desechable #66 (draft, cerrado sin merge, branch borrada). **Run A** [41872958294](https://github.com/sdelvalle57/sui_battleship/actions/runs/41872958294) (`73cd07e`, sin `testnet.json` ni `Published.toml`): `deploy-image` success, `Modo negativo: …`, `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse` y `##[notice]`. **Run B** [41873209711](https://github.com/sdelvalle57/sui_battleship/actions/runs/41873209711) (`38680f0`, además la guarda sin `>&2; exit 1`): `deploy-image` failure, `FALLO: N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)` y `##[error]N2b: …`. Cola de BuildKit: `#21 0.172 Node.js v26.13.0` y ` > [build 12/12] RUN set -eu; …`, que prueban el builder BuildKit (la cola no trae la cabecera de `npm ci`). `contracts` y `app` de esos runs no cuentan | ✅ |
| T6-8 | Positivo real: `CHECK_KEEP_TAG=battleship-app:ensayo-15 bash app/scripts/check-deploy-image.sh . 8090` | `exit=0`; P1-P13; P7 sobre `/assets/index-B3BeMVQC.js`; P8 `zstd` o `gzip` | `exit=0` en **107 s**: `P1 ok` … `P12 ok` y `OK (positivo): …` (P13). **P7:** `/assets/index-B3BeMVQC.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable`, el mismo de la CI. **P8:** `zstd` | ✅ |
| T6-9a | E-6 con la app real: `deploy-image-e6` en 8092 (`--cap-drop=ALL`); Chrome con `Network`, `Log`, `Runtime` y el listener de `securitypolicyviolation`; abrir `/` | `testnet · nodo OK`; "Conectar wallet" y "Mis partidas", sin "Administrar House"; "Conecta tu wallet para crear una partida"; lobby honesto o partidas (solo ID abreviado y monto) | `/` 200. Listener por `Page.addScriptToEvaluateOnNewDocument` más `Runtime.addBinding`. `.network-badge` = **`testnet · nodo OK`**. Header: "Conectar wallet" y "Mis partidas" presentes, "Administrar House" ausente. "Conecta tu wallet para crear una partida": presente. Lobby: **`No hay partidas abiertas`**, 0 filas. Cada campo se leyó por separado, sin volcado del DOM | ✅ |
| T6-9b | `#/game/<GAME>` y `Page.reload`; el ID sale del `GameCreated` de la tx "crear" de "Despliegues" | "Cancelada", `2 %` y 0.001 SUI; solo el ID abreviado | `SuiGrpcClient` público, `getTransaction` con eventos: `success`, 1 evento, 1 `GameCreated` del `originalPackageId`. El script imprime solo **`0x6173…6858`**, igual que B10. Contraste sin imprimir: `git show acdc669:documents/HANDOFF_TESTNET_PUBLISH.md \| /usr/bin/grep -c -F -f <archivo con el ID>` → **1**. Después de recargar: estado **"Cancelada"**, comisión **`2 %`**, apuesta **`0.001 SUI`**; `location.hash` es la ruta pedida | ✅ |
| T6-9c | `#/my-games` y `Page.reload` | "Conecta tu wallet para ver tus partidas e invitaciones", sin listas | Después de recargar: **"Conecta tu wallet para ver tus partidas e invitaciones"**; `main ul, main ol`: 0; hash `#/my-games` | ✅ |
| T6-9d | Pedido a `https://api.slush.app/api/wallet/metadata` | Sin violación de CSP; CORS con el `console.error` exacto, o el status si responde | 4 `GET` (uno por carga de la app: 4 cargas). Todos con `loadingFailed` `net::ERR_FAILED`, `corsError: MissingAllowOriginHeader` y `blockedReason: null`, sin respuesta visible para la página. En cada carga: `Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'http://127.0.0.1:8092' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`, `Failed to load resource: net::ERR_FAILED` y el **`console.error` `Error fetching metadata TypeError: Failed to fetch`**, exacto (le sigue el stack del bundle). 0 violaciones de CSP. Status real: 403 (T6-10) | ✅ (CORS/403, SUG-2) |
| T6-9e | Abrir el modal de `ConnectButton` | "Slush"; ícono `data:`; con violación de `img-src`: STOP | Clic real (`Input.dispatchMouseEvent`) en el botón de `mysten-dapp-kit-connect-button`: `dialog.open = true`, título "Connect a wallet". 1 wallet, **"Slush"**, con 1 `img` `data:` (`alt` "Slush logo", `naturalWidth` 48). 0 violaciones de `img-src`: no hay STOP. Como T6-9d no respondió (CORS/403), **el ícono remoto queda sin medir** y sigue en el smoke B (B-5) | ✅ |
| T6-9f | Elegir "Slush" | Popup a `https://my.slush.app`; `window.opener !== null` = `true`; sin login; `Target.closeTarget` | Target `page` nuevo con `openerId` = la pestaña de la app (URL inicial vacía), que llega a `https://my.slush.app/dapp-request`: `{ openerNotNull: true, origin: "https://my.slush.app", path: "/dapp-request" }`. Sin login. `Target.closeTarget` → `{"success":true}`. La app sigue en `testnet · nodo OK`, con 0 violaciones | ✅ |
| T6-9g | Recorrido de toda la sesión | 0 pedidos a MVR; 0 `securitypolicyviolation`; solo los errores de `api.slush.app` | App: 44 pedidos (`127.0.0.1:8092` 14, `fullnode.testnet.sui.io` 22, `api.slush.app` 4, `data:` 4); gRPC `GetServiceInfo`, `GetTransaction`, `ListEvents` y `BatchGetObjects`, sin respuestas ≥ 400. Popup: 23 pedidos desde el *attach* (sitio de Slush, bajo su propia política, fuera de la app) y 9 entradas de error propias, que no se inspeccionaron porque el límite de T6-9g es el de la app, como en E-6e. **MVR: 0**, en la app y en el popup. **`securitypolicyviolation`: 0.** Errores de la app: **16, los 4 mensajes admitidos de T6-9d en cada una de las 4 cargas**; ningún otro (`exceptionThrown`, otros `console.error`, otros `loadingFailed` y respuestas ≥ 400: 0) | ✅ |
| T6-10 | `curl` público a `api.slush.app/api/wallet/metadata` con `Origin: http://127.0.0.1:8092` y con `Origin: https://example.com` | Status, `server` y ACAO de cada uno; se espera 403, `cloudflare`, sin ACAO | 16:38:39Z. Con `http://127.0.0.1:8092`: `HTTP/2 403`, `server: cloudflare`, sin `access-control-allow-origin`. Con `https://example.com`: lo mismo. Sin cambios respecto de la revisión de PR #48 | ✅ |
| C-4 | Cierre: Chrome por PID, `deploy-image-e6`, `battleship-app:ensayo-15`, limpieza por la línea base de T6-0 sin `prune`, `docker system df`, directorios, puertos y `git status` | Diferencias vacías; *Build Cache* = T6-0; sin directorios; puertos libres; solo los 5 archivos | `kill <pid de Chrome>`, solo ese PID: `kill -0` falla y no queda ningún proceso con el perfil. `docker rm -f deploy-image-e6` y `docker rmi battleship-app:ensayo-15`. Contenedores nuevos: **0**. Imágenes nuevas: **24**, todas del ensayo, borradas por ID con `docker rmi`: 21 intermedias `<none>` con `Cmd ["node"]` (derivadas de `node@bc0a2afd…c1d9`), `node:26.13.0-bookworm-slim`, `caddy:2.11.7-alpine` y `rhysd/actionlint:1.7.12`. Los padres `<none>` sin etiqueta cayeron con sus hijos en la primera pasada. `comm` repetido: contenedores 0, imágenes 0; faltantes `ps=0 img=0`. `docker system df`: 3 imágenes, 2 contenedores, *Build Cache* `0B` (= T6-0). Se borraron los 3 directorios, más los scripts de la sonda (no existen). 8090, 8092 y 9230 sin filas. `git status`: solo los 5 archivos de TASK-6 | ✅ |

### Reporte final (parte B)
- **Pasos PASA/TOTAL (T6-0..T6-10 y C-4):** **18/18** (T6-0..T6-10 y C-4, T6-7 incluido).
- **T6-7 (runs A y B, PR desechable #66):** ✅ run A 41872958294 `OK (negativo)`; run B 41873209711 `FALLO: N2b` (BuildKit). Lo registró el orquestador.
- **Hallazgos:** ninguno que haga fallar un paso. Hay tres observaciones:
  - T6-0/T6-1: se arrancó antes de la puerta por D-20261104-07 (167,48 h y 167,49 h);
  - T6-6 (2): el build usó la caché de (1);
  - T6-9d/T6-9e: el 403 de Slush se repite y el ícono remoto pasa al smoke B.
- **Veredicto:** PASA (revisión del MID en `REPORTES_RAILWAY_DEPLOY.md`, "Revisión TASK-6: PASA").

### Smoke B del owner (S-7; lo registra TASK-5 de #16, S-8)

Checklist de `app/README.md`, "Conectar Railway (owner, no delegable)", paso 9, en la URL pública (`<URL>`), con la
wallet de extensión del owner. Lo que vio el owner va como `owner: "<texto>"`, sin direcciones ni capturas de la
wallet.

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| B-1 | Abrir `<URL>` | `testnet · nodo OK` | (lo registra S-8) | ⏳ |
| B-2 | Conectar la wallet (Slush) | Conecta, sin violación de CSP. Si no conecta por la CSP: el fallback a `Report-Only`, solo para la CSP (D3), y un issue | (lo registra S-8) | ⏳ |
| B-3 | El lobby | Las partidas reales o el texto honesto | (lo registra S-8) | ⏳ |
| B-4 | Recargar `#/my-games` y `#/game/<id>` | Las dos rutas cargan después de recargar | (lo registra S-8) | ⏳ |
| B-5 | Consola | 0 violaciones de CSP, incluido el ícono remoto de Slush. Límite de SUG-2, el mismo que T6-9g (MINOR-4): se admiten **solo** los mensajes del pedido a `https://api.slush.app/api/wallet/metadata` (el bloqueo de CORS y `net::ERR_FAILED`/403) y el `console.error: Error fetching metadata TypeError: Failed to fetch`, con "Slush" en el modal. Cualquier otro error es rojo. Si esos mensajes no aparecen, el ícono remoto se mide acá | (lo registra S-8) | ⏳ |
| B-6 | `curl -sS -D - -o /dev/null <URL>` (GET) | La CSP idéntica a la del `Caddyfile`, las 5 cabeceras de seguridad y `Cache-Control: no-cache`, sin COOP y sin el `Server` de Caddy. Si el borde de Railway agrega un `Server` propio (o cabeceras `x-railway-*`), se anota su valor y no es rojo (SUG-1) | (lo registra S-8) | ⏳ |
