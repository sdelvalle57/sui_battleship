# SMOKE_RAILWAY_DEPLOY, parte A (local, antes de #8)
> Plan: PLAN_RAILWAY_DEPLOY v1.1 | Issue: #15 | Fecha: 2026-11-04 | Estado: parte 1 PASA (21/21); parte 2 pendiente (TASK-3)

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
Pendiente: se corre cuando #14 libere la localnet.

## Reporte final (parte 1)
- **Pasos PASA/TOTAL:** 21/21.
- **Hallazgos:** ninguno que haga fallar un paso. Hay 3 observaciones para el MID, detalladas en Riesgos del reporte de TASK-2:
  - V-1: el digest de caddy se publicó hace menos de 7 días;
  - E-6a: no aparecieron los errores de lectura esperados;
  - E-6b/E-6c: 403 de Slush, ícono remoto al smoke B.
- **Veredicto (parte 1):** PASA.
=====
