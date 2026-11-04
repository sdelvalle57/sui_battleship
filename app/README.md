# App web (`app/`) — Sui Battleship

Cliente React + TypeScript (Vite) del juego. Lee la red con `SuiGrpcClient` (gRPC-web) y firma con la wallet del
navegador mediante el kit de Mysten (`@mysten/dapp-kit-react` + `@mysten/dapp-kit-core`). Sin backend propio.
Decisiones de base: D-20261102-02 (`documents/DECISIONES.md`).

## Requisitos

- **Node 26** (`.nvmrc`) y npm 11: `nvm use` en la raíz antes de cualquier comando. Los agentes, cuyo shell no carga
  nvm, anteponen el prefijo de Node 26 por ruta absoluta (`agents.md` §3, "App (`app/`)"). Con otra versión,
  `npm ci` falla con `EBADENGINE` (`engines` de la raíz + `engine-strict`).
- Todo se corre **desde la raíz** del repo (npm workspaces: `"workspaces": ["app"]`).

## Scripts

| Comando (desde la raíz) | Qué hace |
|---|---|
| `npm ci` | Instala exactamente lo del `package-lock.json`, sin scripts de instalación (`.npmrc`) |
| `npm run dev -w app` | Servidor de desarrollo de Vite (`http://localhost:5173`) |
| `npm run build -w app` | Build de producción en `app/dist/` (ignorado por git) |
| `npm run preview -w app` | Sirve `app/dist/` para revisarlo |
| `npm run lint -w app` | ESLint (`--max-warnings 0`), incluida la regla de capas |
| `npm run typecheck -w app` | `tsc --noEmit` de `src/` y de `vite.config.ts` |
| `npm test -w app` | Vitest + jsdom + Testing Library |

**Gate** = steps del job `app` de `.github/workflows/ci.yml` (bloqueante, PROY-18): `npm ci`, `npm audit signatures`,
`npm audit --omit=dev --audit-level=high`, lint, typecheck, test, `VITE_SUI_NETWORK=testnet npm run build -w app` y
árbol sin cambios al final.

## Red del build: `VITE_SUI_NETWORK`

Una red por build (D-20261102-02 (2)): `localnet` o `testnet`. Ausente, vacía, `mainnet` o cualquier otro valor →
la app muestra la pantalla "La app no está configurada" con la causa y la acción (no queda en blanco).

- Valor de ejemplo: `app/.env.example` (`VITE_SUI_NETWORK=localnet`). Se pasa en la línea de comandos
  (`VITE_SUI_NETWORK=localnet npm run dev -w app`) o en un `app/.env.local` propio (ignorado por git).
- **Todo `VITE_*` es público:** Vite lo embebe en el bundle. Nunca secretos en ningún `.env` (SEG-3).
- IDs y chain id salen de `contracts/deployments/<red>.json` (esquema `schemaVersion: 1`, `contracts/README.md`
  "Despliegues"), que lee **solo** `app/src/sui/config.ts`. Falta el archivo, `schemaVersion` ≠ 1, `network` distinta
  de la variable o un ID con formato inválido → pantalla de error con el campo o archivo y la acción.

### Localnet

1. Localnet **aislada** de `agents.md` §3 ("Localnet aislada (smokes)"), con la publicación del paso 4 en la
   **variante B** (sin `--out`): escribe `contracts/deployments/localnet.json` (ignorado por git).
2. `VITE_SUI_NETWORK=localnet npm run dev -w app` y abrir `http://localhost:5173`. Si `localnet.json` se crea (o se
   vuelve a crear) con `vite` dev ya arrancado, la app sigue en "La app no está configurada" aunque se recargue:
   reiniciar `npm run dev -w app` (`vite` ve los cambios y el borrado del archivo, pero no uno nuevo fuera de `app/`;
   el build no se ve afectado).
3. **Wallet de desarrollo** (burner del kit): solo en localnet **y** con `npm run dev` (D-20261102-02 (5)). Nace sin
   fondos: se fondea por CLI (ver "Wallet"). Para firmar con una wallet de navegador, esa wallet tiene que apuntar a la
   misma localnet.
4. Al cerrar: el paso 7 de `agents.md` §3, que borra también `contracts/deployments/localnet.json` (pertenece a la
   génesis que se borra).

### Testnet

`contracts/deployments/testnet.json` existe desde #8 (publicación del 2026-11-04): un build con `VITE_SUI_NETWORK=testnet`
lee la House y las partidas reales del fullnode público. Sin ese archivo (p. ej., en el PR de una republicación), el
build compila pero muestra la pantalla de error de configuración. Explorador: Suiscan (`explorer.ts`); en localnet, sin
link.

**Origen del build publicado:** el glob de `config.ts` es `eager` y se resuelve al compilar, así que un
`contracts/deployments/localnet.json` presente en la máquina entra en **cualquier** build hecho ahí, también en uno de
testnet. El build de testnet que se publica sale de la CI o de un checkout limpio, nunca de una máquina con
`localnet.json`. La imagen de Railway lo excluye por construcción: el `.dockerignore` es una lista blanca y
`localnet.json` no está en ella, y la imagen comprueba que no haya `localnet` en el bundle (ver "Despliegue (Railway)").

## Despliegue (Railway)

Hosting en Railway (D-20261104-01, D-20261104-03; #15). El repo deja la imagen lista. Crear y conectar el servicio y
publicar es del owner: el checklist completo está en "Conectar Railway (owner, no delegable)", más abajo. **URL
pública: se completa después de #8.**

### La imagen

`Dockerfile` en la raíz, sin `railway.json` (Railway detecta el Dockerfile solo). Tiene dos etapas, cada una con su
imagen base fijada por digest:

- **build** (`node:26.13.0-bookworm-slim`):
  1. copia `.nvmrc` y `contracts/`;
  2. corre la guarda de #8 y `publish.mjs check`;
  3. hace `npm ci` y `npm run build -w app`. La red es fija: `ENV VITE_SUI_NETWORK=testnet`, sin `ARG` y sin
     variables en Railway;
  4. al final comprueba tres cosas sobre `app/dist/assets/`:
     - que estén el `packageId`, el `originalPackageId`, el `houseId` y el `publishTxDigest` de `testnet.json`;
     - que no haya un registro de `localnet` embebido (`network` con valor `localnet` en cualquier forma: comillas
       dobles, simples o el template literal que emite Vite 8);
     - que esté el origen `https://fullnode.testnet.sui.io`.
- **runtime** (`caddy:2.11.7-alpine`):
  - sirve `app/dist` desde `/srv` con `app/Caddyfile`, como `nobody` (65534);
  - corre sin `cap_net_bind_service` (`setcap -r`): por eso `PORT` tiene que ser ≥ 1024, y arranca también con
    `--cap-drop=ALL`;
  - escucha en `$PORT` (Railway lo inyecta; el default local es 8080);
  - sin admin, sin log de acceso y sin TLS: el TLS lo termina Railway en su borde;
  - antes de `USER nobody`, el build corre `caddy validate`.

**Guarda de #8 (nunca IDs a mano).** Sin `contracts/deployments/testnet.json` la imagen no se construye: el primer
`RUN`, antes de `npm ci`, falla en segundos con este mensaje.

```text
ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicación del owner en testnet; sin él no se construye la app (nunca IDs a mano).
```

Con el archivo presente, `node contracts/scripts/publish.mjs check` valida el esquema y la coherencia con
`contracts/Published.toml` antes de `npm ci`:
- en verde imprime `1 despliegue(s) válidos y coherentes con Published.toml`;
- si divergen, falla con `deployments incoherentes:` y una línea por campo, por ejemplo
  `upgradeCapId (…) ≠ upgrade-capability de Published.toml (…)`;
- el `check` de #8 corre primero la guarda de Node, que lee `.nvmrc` (`.nvmrc sin versión válida`). Por eso el
  Dockerfile copia `.nvmrc` antes del `check`.

Si la imagen falla, no se genera y Railway no despliega.

**Contexto en lista blanca (`.dockerignore`).** Solo entran:
- `package.json`, `package-lock.json`, `.npmrc` y `.nvmrc`;
- `app/`, sin `app/node_modules`, `app/dist`, `app/.env*` ni `app/scripts`;
- de `contracts/`: `scripts/publish.mjs`, `scripts/deployment.mjs`, `Published.toml` y `deployments/testnet.json`.

Quedan afuera `localnet.json`, cualquier `.env*`, `node_modules`, `.git` y el resto de `contracts/`. El ensayo de #15
lo verificó con un `localnet.json` y un `.env.local` presentes.

### Cabeceras y CSP (`app/Caddyfile`)

| Cabecera o regla | Valor | Por qué |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://fullnode.testnet.sui.io https://api.slush.app; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` | Derivada del bundle. Ver la lista de abajo |
| `X-Content-Type-Options` | `nosniff` | Sin *sniffing* de MIME |
| `X-Frame-Options` | `DENY` | Antiencuadre para navegadores viejos; `frame-ancestors` solo funciona por cabecera |
| `Referrer-Policy` | `no-referrer` | Los pedidos a terceros (fullnode, Slush) y los enlaces al explorador no llevan `Referer`, es decir, ni la URL ni la ruta de la app. El `Origin` de los pedidos CORS sigue yendo: lo pone el navegador y gRPC-web lo necesita |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | La app no usa ninguna |
| `Strict-Transport-Security` | `max-age=31536000` | Solo HTTPS (el borde de Railway) |
| `Server` | se quita (`-Server`) | No anuncia el servidor |
| `Cache-Control` | `public, max-age=31536000, immutable` solo en `/assets/*` que **existen** (matcher `file`); `no-cache` en `/` y `/index.html` | Los assets llevan hash; `index.html` siempre se revalida |
| Compresión | `encode zstd gzip` | — |
| Sin fallback SPA | rutas desconocidas → 404 | El router es por hash; un `/assets/x.js` faltante da 404 sin `immutable`, nunca `index.html` |

La CSP, directiva por directiva:
- **`connect-src`:**
  - `https://fullnode.testnet.sui.io` es el gRPC-web del `SuiGrpcClient` (`sui/networks.ts`);
  - `https://api.slush.app` es el `fetch` de metadata que hace `registerSlushWallet` al arrancar;
  - `https://my.slush.app` **no** va: es la navegación del popup de Slush, que la CSP no gobierna;
  - MVR no hace falta, porque la app usa IDs `0x`. El ensayo midió 0 pedidos.
- **`script-src 'self'`:** el bundle no usa `eval`, `new Function` ni `WebAssembly`.
- **`img-src 'self' data:`:** los íconos de wallet-standard son `data:`.
- **`style-src 'self'`:** **confirmado** en TASK-3 de #15: con el kit montado (lobby, modal, rutas profundas), 0
  violaciones; Lit aplica sus estilos por `adoptedStyleSheets` y no inserta `<style>`.

**Sin COOP (DL-11).** El wallet web de Slush abre un popup (`about:blank` → `https://my.slush.app`) y necesita
`window.opener`; un `Cross-Origin-Opener-Policy` lo cortaría. El ensayo de #15 abrió el popup con `window.opener`
presente, y el script verifica que la cabecera no esté.

**Agregar un origen a la CSP:**
- Se agrega una directiva por vez y solo el origen necesario, como **desviación declarada** en el reporte del task y
  revisada por el MID.
- El script compara la CSP servida con la del `Caddyfile` del contexto, así que no hay que tocarlo.
- Casos previstos:
  - **Ícono remoto de Slush.**
    - Qué puede pasar: la metadata de `api.slush.app` puede reemplazar el ícono `data:` por uno `https://…`. Si aparece
      una violación de `img-src`, ese origen va **solo** a `img-src`.
    - Qué pasó en el ensayo: `api.slush.app` respondió 403 de Cloudflare (en el navegador, un error de CORS, no de
      CSP). El kit se quedó con el ícono `data:` por defecto. El 403 no depende del origen: con `curl` público sale
      igual con `Origin: https://example.com` (revisión de PR #48), así que puede repetirse en la URL pública. En E-6
      de TASK-6 de #15, con la app real y los IDs de testnet, pasó lo mismo: la metadata no respondió y el ícono
      siguió siendo el `data:`.
    - Conclusión: el ícono remoto **quedó sin medir** y pasa al **smoke B** del owner, en la URL pública. Si en el
      smoke B no aparece el error, el ícono remoto se mide ahí.
  - `'unsafe-inline'` solo en `style-src`, y solo si TASK-3 mide una violación real.

**Fallback a `Report-Only`** (P-2, D-20261104-03 (2)):
- Cuándo: si una wallet de extensión real no puede conectar por la CSP (smoke B del owner).
- Qué cambia: **solo** la CSP pasa a `Content-Security-Policy-Report-Only`; las demás cabeceras quedan igual.
- Además se abre un issue.

### Verificar la imagen: `app/scripts/check-deploy-image.sh`

`bash app/scripts/check-deploy-image.sh <contexto> <puerto>`
- Requiere `bash`, `docker`, `curl`, `grep`, `sed` y `mktemp`.
- Salida: 0 si el modo pasó; 1 con `FALLO: <chequeo>: <qué se esperaba y qué llegó>`; 2 si el uso es inválido (se
  valida antes de tocar Docker).
- El puerto, entre 1024 y 65535, tiene que estar libre (`ss -ltn 'sport = :<puerto>'` sin filas).
- El modo sale del contexto:

- **Negativo**, sin `contracts/deployments/testnet.json`. Desde #8, `master` lo tiene, así que en el repo `. 8090`
  corre el **positivo**. El negativo se ensaya en una copia del contexto sin `testnet.json` **ni** `Published.toml`,
  como el `master` anterior a #8: `bash app/scripts/check-deploy-image.sh <copia> 8090`.
  - **N1:** el build tiene que fallar.
  - **N2a:** el log, sin códigos ANSI, tiene la línea de **salida** de la guarda,
    `ERROR (#15): falta contracts/deployments/testnet.json…`, con o sin el prefijo `#<n> <segundos> ` de BuildKit. No
    cuenta la línea `RUN …` que imprime el builder.
  - **N2b:** el log no tiene la cabecera del paso `RUN npm ci` (BuildKit: `#<n> [build  9/12] RUN npm ci`, con el
    número alineado con espacios; clásico: `Step <k>/<m> : RUN npm ci`), es decir, el build se cortó en la guarda. El
    extracto del Dockerfile que BuildKit imprime alrededor del `RUN` que falla no cuenta.
  - **N3:** `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`.
- **Positivo**, con `testnet.json`. Las cabeceras se leen con GET, porque Caddy 2.11.7 tiene un bug de `encode` con
  HEAD.
  - **P1:** build verde. Con `CHECK_KEEP_TAG=<etiqueta>`, la imagen queda además con esa etiqueta, que el script no
    borra.
  - **P2:** contenedor con `--cap-drop=ALL` y `PORT=<puerto>`, publicado en `127.0.0.1:<puerto>`; `/` responde 200
    en ≤ 30 s.
  - **P3:** `id -u` = 65534.
  - **P4:** la CSP es idéntica a la del `Caddyfile` del contexto.
  - **P5:** las 5 cabeceras de seguridad y `Cache-Control: no-cache` en `/`.
  - **P6:** sin COOP ni `Server`.
  - **P7:** el JS que referencia `index.html` da 200, `text/javascript` e `immutable`.
  - **P8:** ese mismo JS llega comprimido (zstd o gzip).
  - **P9:** `/favicon.svg` da 200 `image/svg+xml`.
  - **P10-P12:** 404 en `/no-existe`, `/game/0x1` y `/assets/no-existe.js`, este último sin `immutable`.
  - **P13:** `OK (positivo): …`.
- **Limpieza:**
  - un `trap` borra la etiqueta `battleship-app:check-<pid>`, el contenedor `deploy-image-<pid>` y los temporales;
  - sin `buildx` (builder clásico) el script usa `--force-rm`, pero las imágenes intermedias `<none>` quedan;
  - esas intermedias se borran a mano y por ID, comparando con una línea base de `docker images -aq` tomada antes.
    Nunca `docker system prune`, que borra imágenes ajenas.
- **CI:**
  - el job `deploy-image` de `.github/workflows/ci.yml` corre el mismo script (`. 8080`) en cada PR y en cada push a
    `master`; desde #8, por el camino positivo con los IDs reales;
  - **no es check requerido** (N-4 es decisión del owner); Railway lo espera con *Wait for CI*.
- **Al tocar `ci.yml`:**
  - actionlint en un contenedor desechable, con el archivo explícito:
    `docker run --rm -v <repo>:/repo:ro -w /repo rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -no-color .github/workflows/ci.yml`.
    En un worktree, `.git` apunta fuera del montaje. La 1.7.12 no acepta `-color=never`;
  - shellcheck del script: la misma imagen con `--entrypoint shellcheck`.

### Conectar Railway (owner, no delegable)

Solo el owner, después de #8. **Aviso (N-2):** desde el paso 3, cada merge a `master` que toque las watch paths del
paso 5 **publica el sitio**.

1. **Precondiciones:**
   - TASK-6 de #15 en PASA;
   - `deploy-image` del último run de `master` en verde **por el camino positivo**.
2. Railway → **New Project** → **Deploy from GitHub repo**. La **GitHub App de Railway** se autoriza solo para
   `sdelvalle57/sui_battleship`.
3. Servicio → Settings → Source: rama **`master`**; **Wait for CI: activado**; **entornos de PR: desactivados**.
4. Build: Railway usa el `Dockerfile` de la raíz ("Using detected Dockerfile!"). **No** definir
   `RAILWAY_DOCKERFILE_PATH` ni comandos de build o start.
5. Watch paths, en formato gitignore. Si las negaciones no se respetaran, un cambio de docs o tests solo redespliega
   un `dist` idéntico.
   ```
   app/**
   !app/README.md
   !app/src/**/*.test.ts
   !app/src/**/*.test.tsx
   !app/src/test/**
   !app/scripts/**
   !app/eslint.config.js
   !app/.env.example
   contracts/deployments/testnet.json
   contracts/Published.toml
   contracts/scripts/publish.mjs
   contracts/scripts/deployment.mjs
   package.json
   package-lock.json
   .npmrc
   .nvmrc
   Dockerfile
   .dockerignore
   ```
6. Deploy:
   - healthcheck path **`/`**, restart `ON_FAILURE` y 1 réplica;
   - **región y sleep a elección del owner** (afectan los costos);
   - **Variables: ninguna.** Railway inyecta `PORT`; no definir `VITE_*`.
7. Networking → **Generate Domain** (`<servicio>.up.railway.app`), con **el puerto que propone Railway**.
8. Primer deploy: pasa por `WAITING` (Wait for CI), el build queda verde y el healthcheck da 2xx. Si no arrancó
   solo, **Deploy latest commit**.
9. Smoke B con la wallet de extensión del owner, en la URL pública:
   - `testnet · nodo OK`, conectar la wallet (Slush), el lobby, y recargar `#/my-games` y `#/game/<id>`;
   - consola sin violaciones de CSP, incluido el ícono remoto de Slush. Por el 403 de Cloudflare de `api.slush.app`,
     se admiten **solo** los mensajes del pedido a `https://api.slush.app/api/wallet/metadata` (el bloqueo de CORS y
     `net::ERR_FAILED`/403) y el `console.error: Error fetching metadata TypeError: Failed to fetch` del kit, con
     "Slush" listado en el modal. Cualquier otro error de consola o de red es rojo. Si esos mensajes no aparecen, el
     ícono remoto se mide ahí;
   - `curl -sS -D - -o /dev/null <URL>` (GET: con HEAD, el `encode` de Caddy 2.11.7 falla) con las cabeceras de la
     tabla de arriba.

   Si la wallet no conecta por la CSP, avisar: fallback a `Report-Only`, solo para la CSP. Si algo falla,
   **rollback** desde Deployments **o pausar** el servicio.
10. Dejar registrado (N-2) si los merges a `master` con CI verde quedan preautorizados como publicación del sitio, y
    opcionalmente (N-4) agregar `deploy-image` a los checks requeridos.

### Versiones de las imágenes (DL-8)

Las dos imágenes base van fijadas por el digest del índice multi-arquitectura. La regla de 7 días es la misma de
`min-release-age=7` de `.npmrc`:
- **Qué se mide:** la **versión** tiene que tener ≥ 7×24 h desde el `published_at` de su release
  (`gh api repos/nodejs/node/releases`, `gh api repos/caddyserver/caddy/releases`).
- **Cuándo:** al commitear el Dockerfile.
- **Sobre qué:** sobre la versión, **no** sobre el digest. Un *rebuild* de docker-library de la misma versión no
  reinicia el plazo (por ejemplo, el índice de `caddy:2.11.7-alpine` del 2026-10-30, observación 1 de TASK-2 de #15).

Node 26.13.0 en la imagen (TASK-6 de #15): la misma versión que el gate local y la CI (`.nvmrc` = 26, `engines`, la
guarda de `publish.mjs`).

### Favicon

`app/public/favicon.svg` es un SVG propio de 32×32, sin recursos externos. `index.html` lo declara con
`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` y Vite lo copia a la raíz de `dist/`. El 404 de
`/favicon.ico` que registraron los smokes de #9 ya no aparece.

## Estructura y capas (ARQ-1, PROY-13)

```
src/
├── sui/         # funciones puras sobre el SDK (sin React): red, config, montos, lecturas, parsers, política
├── hooks/       # hooks de React sobre el kit y TanStack Query (+ ConfigContext, queryKeys)
├── providers/   # QueryClientProvider (política común) > DAppKitProvider > ConfigContext
├── components/  # UI sin lógica de negocio (LobbyList, GameDetail, ReadState, Header, CreateGameForm, GameActions,
│                #   MyGamesSection, HouseAdminPanel, HistoryTime…)
├── pages/       # páginas del router por hash: HomePage (#/), GameDetailPage (#/game/:id), MyGamesPage (#/my-games),
│                #   HouseAdminPage (#/admin), NotFoundPage
├── test/        # setup de Vitest, arneses de TanStack Query, de la máquina de transacciones y del escaneo de eventos
└── App.tsx      # rutas (appRoutes) + RouterProvider
scripts/
├── localnet-guard.mjs          # guarda compartida de las capturas: solo http://127.0.0.1:9000 y la génesis del despliegue
├── capture-read-fixtures.mjs   # captura de las fixtures reales de lectura (ver "Fixtures de lectura")
├── capture-tx-fixtures.mjs     # captura de las fixtures reales de transacciones (ver "Fixtures de lectura")
└── capture-house-fixtures.mjs  # (#14) captura de la fixture real del panel de la House (ver "Fixtures de lectura")
```

La regla de capas la hace cumplir ESLint (`app/eslint.config.js`, `no-restricted-imports` en lista blanca):

| Carpeta | `@mysten/*` permitido | Además prohíbe |
|---|---|---|
| `src/sui/` | `@mysten/sui*`, `@mysten/dapp-kit-core*` | React y las capas superiores (`hooks`, `components`, `pages`, `providers`) |
| `src/hooks/` | `@mysten/sui*`, `@mysten/dapp-kit-react` (raíz) | `components`, `pages`, `providers` |
| `src/providers/` | `@mysten/dapp-kit-react` (raíz) | — |
| resto (`components/`, `pages/`, raíz de `src/`) | solo `@mysten/dapp-kit-react/ui` | — |

### Mapa de `app/src/sui/`

| Archivo | Contenido | Issue |
|---|---|---|
| `networks.ts` | `Network`, URL gRPC y base del explorador por red, `isNetwork`, `shortChainId` | #9 |
| `config.ts` | **único** lector de `import.meta.env` y de `contracts/deployments/*.json`; valida el esquema de #7 (incluido `publishTxDigest`, cota del lobby) | #9, #10 |
| `format.ts` | SUI ↔ MIST con `bigint` (`parseSuiToMist`, `formatMist`), `shortAddress`, `formatBps`, `formatTimestamp` | #9, #10 |
| `explorer.ts` | links a transacción, objeto y cuenta (`explorerAccountUrl`, "Ver tu historial completo en el explorador"; Suiscan en testnet; `null` en localnet); validan antes de mirar la red | #9, #13 |
| `nodeInfo.ts` | `fetchNodeInfo` (consulta viva con el corte común; trae el piso `lowestAvailableCheckpoint`) y `deriveNodeStatus` (con `retrying`) | #9, #10 |
| `dappKit.ts` | instancia del kit con `createDAppKit` y `SuiGrpcClient` | #9 |
| `game.ts` | esquema BCS del `Game`, `gameType`, `parseGameObject` (tipo exacto, dueño compartido, bytes canónicos, invariantes) y `resolutionAmounts` | #10 |
| `events.ts` | `RawGameEvent`, esquemas BCS y parsers de `GameCreated`/`GameCancelled`/`GameResolved` | #10 |
| `readErrors.ts` | errores de lectura (`ReadDataError`, `GameNotFoundError`, `NotAGameError`, `PaginationStalledError`, `ReadTimeoutError`, `NotYetCheckpointedError`, `HistoryPrunedError`) y `readErrorMessage`. `ReadDataError` suma en #14 el motivo `incomplete` (la búsqueda del `HouseCap` no llegó a una respuesta cierta), con su texto propio "El nodo no completó la búsqueda del HouseCap; reintenta" y no transitorio | #10, #14 |
| `readPolicy.ts` | `withReadTimeout` (corte de 10 s), `isTransientReadError`, `shouldRetryRead`, `readRetryDelay` | #10 |
| `readStatus.ts` | `ReadStatus` y `deriveReadStatus` (cargando, reintentando n de m, en pausa, error, lista) | #10 |
| `ids.ts` | `parseObjectIdInput` y `parseAddressInput` (validan y normalizan en el borde, mismo helper) y `sameAddress` | #10, #11 |
| `transactionInfo.ts` | hora/checkpoint de una transacción, checkpoint de la publicación (`null` = podada) y hora de un checkpoint | #10 |
| `gameDetail.ts` | `fetchGame` (detalle por ID), `GAME_REFETCH_MS` y `gameRefetchInterval` (corta el intervalo ante un error definitivo, DL-7) | #10, #11 |
| `eventScan.ts` | escaneo crudo común (DL-2 de #13, extraído del lobby sin cambiar su comportamiento): `historyLowerBound` y `HISTORY_FLOOR_MARGIN_CHECKPOINTS`, `eventTypeFilter`, `requestEvents` (cualquier `EventFilter` y `limit`; `readMask` **sin `sender`**; último `watermark.cursor`) y `requestOrPruned` (`OUT_OF_RANGE`/piso ⇒ `HistoryPrunedError`) | #10, #13 |
| `lobby.ts` | `fetchLobbyPage` (lobby por eventos sobre `eventScan.ts`) y las constantes calibradas (50 / 2 / 20) | #10, #13 |
| `myGames.ts` | "Mis partidas" (ver esa sección): `myActivityFilter`, `fetchMyActivityPage`, `fetchInvitationsPage`, `naturalSection`, `mergeMyGames`, `extendPins`, `groupMyGames`, `myGameKey`, `sectionFooter` y `MY_ACTIVITY_*` (50 / 1) | #13 |
| `transactions/game.ts` | builders puros de PTB: `buildCreateGameTx` (`splitCoins(gas)` + `create_game`), `buildCancelGameTx`, `buildRejectGameTx` y `buildAcceptGameTx` (`splitCoins(gas, [bet])` + `accept_game(game, house, coin, random)` con `tx.object.random()`, **último** comando: después de un comando con `Random` el nodo solo admite `TransferObjects`/`MergeCoins`); lanzan ante un ID o un monto inválidos; sin `sender` ni gas | #11, #12 |
| `errors.ts` | `ABORT_MESSAGES` (módulo + código → mensaje), `findMoveAbort` (estructurado, formato del SDK y formato Rust del nodo; `cause` hasta 5 niveles), `abortCodeSuffix`, `runtimeCancellation` + `RUNTIME_CANCELLED_MESSAGES` (cancelaciones del runtime, DL-11) y `transactionErrorMessage` con sus fallbacks | #11, #12 |
| `execution.ts` | `preflightTransaction` (simulación de una copia, corte de 20 s, `PreflightNetworkError`; DL-10: un `SimulationError` sin `executionError` cuyo `cause` es un corte de red, según `isPreflightNetworkCause` = `isTransientReadError`, también es `PreflightNetworkError`), `confirmTransaction` (30 s), `waitForCheckpoint` (30 s), `classifyExecution`, `digestFromError`, `networkCost` | #11, #12 |
| `gameTx.ts` | `parseCreatedGame` (único `GameCreated` del firmante), `cancelledRefund` (`refund` del `GameCancelled` de esa partida) y `parseResolvedGame` (único `GameResolved` de esa partida con `acceptor` = la cuenta; si no, `null`) | #11, #12 |
| `house.ts` | esquema BCS de la `House`, `houseType`, `parseHouseObject` (tipo exacto, compartida, bytes canónicos, `0 < min_bet <= max_bet`) y `fetchHouse` | #11 |
| `account.ts` | `fetchSuiBalance` (`balance.balance` de `getBalance`: monedas + saldo de dirección) | #11 |
| `createGame.ts` | `validateCreateGame` (motivos tipados), `houseTermsChanges`/`houseChangeMessage` (M-2), `CREATE_GAS_RESERVE_MIST`, `GAME_STORAGE_DEPOSIT_MIST` | #11 |
| `gameActions.ts` | `canCancel` (creador, `Pending`), `canReject` (invitado, `Pending`), `acceptState` (en orden: `not_pending` → `no_account` → `creator` → `not_invited` → `available`) y `NOT_INVITED_HINT` (= el texto de `game`/5) | #11, #12 |
| `acceptGame.ts` | `ACCEPT_GAS_RESERVE_MIST` (0,01 SUI; ver "Aceptar y resultado"), `acceptBalanceCheck` (`ok`/`insufficient`/`unknown`), `wonBy` y `playerResult` (`won`/`lost` para el creador o el aceptante de una partida resuelta) | #12 |
| `houseCap.ts` | detección del `HouseCap` (ver "Panel de la House (#14)"): `houseCapType`, `parseHouseCapObject` (tipo exacto, `AddressOwner` = la cuenta, BCS canónico, `id` = `objectId`), `fetchHouseCap` (regla de certeza, `HOUSE_CAP_MAX_PAGES` = 3), `checkHouseCapOwnership` (`getObject`, el `precheck` de las acciones) y `HOUSE_CAP_LOST_MESSAGE` | #14 |
| `houseAdmin.ts` | validación espejo del contrato: `HOUSE_MAX_FEE_BPS` (= `house::MAX_FEE_BPS`, `agents.md` §5), `validateFeeRate`, `validateBetLimits` (motivos de `parseSuiToMist` por campo, `zero_min`, `min_above_max`, `unchanged`) y `canWithdraw`; `houseEventType` y los parsers del **único** evento de esa House: `parseFeeRateUpdated`, `parseBetLimitsUpdated`, `parseFeesWithdrawn` | #14 |
| `transactions/house.ts` | builders puros de admin: `buildUpdateFeeRateTx` (`u16`), `buildUpdateBetLimitsTx` (`u64`, `u64`) y `buildWithdrawFeesTx` (**exactamente 2** comandos: `withdraw_fees(house, cap)` y `TransferObjects([Result 0], recipient)`); rangos del tipo Move, no del contrato (una comisión de 1001 llega a la red y aborta con `house`/0); sin `sender` ni gas | #14 |

### Hooks (`app/src/hooks/`)

| Hook | Qué devuelve |
|---|---|
| `queryKeys.ts` | **únicas** claves de TanStack Query: `['sui', red, recurso, …]` (`nodeInfo`, `lobby`, `game`, `txInfo`, `publishCheckpoint`, `checkpointTime`, `house`, `balance` con la dirección normalizada; #13: `myGames(red, pkg, cuenta)` = `['sui', red, 'myGames', pkg, <cuenta normalizada>]` y sus sub-claves `myActivity` = `[...myGames, 'activity']` y `myInvitations` = `[...myGames, 'invitations']`); los `bigint` como string. Claves de **mutación** (#12): `txAccount(red, cuenta)` = `['sui', red, 'tx', <cuenta normalizada> \| 'none']` y `txTarget(red, cuenta, objetivo)` = `[...txAccount, 'create']`, `[...txAccount, 'game', <id normalizado>]` o (#14) `[...txAccount, 'house']`, con un `case` por objetivo. #14: `houseCap(red, pkg, cuenta)` = `['sui', red, 'houseCap', pkg, <cuenta normalizada>]` |
| `txInvalidation.ts` | `transactionInvalidations`: la tabla única de qué reiniciar/invalidar tras una transacción propia (DL-6) |
| `txSession.ts` | lo puro de la máquina (#12, sin React; no importa nada de `hooks/`, DL-12 de #13): los tipos de la máquina (`TxAction`, `TxOutcome`, `TxResult`, `TxPrecheckStop`, `ExecuteInput`, `TxVariables` con `account` y `targetHash`, `TxTarget`, `TxView`, `TxNotice`, `AdoptedTx`), `toTxEntry`, `mountSnapshot` (foto de **todo** el `MutationCache` al montar), `deriveTargetState` (en curso ajena, "sin confirmar" del objetivo, adopción) y, para "Mis partidas", `toTxGameEntry`/`liveTxGameIds` (H-6) |
| `useTxTarget` | **una** llamada por vista con acciones sobre un objetivo (`{ kind: 'create' }`, `{ kind: 'game', gameId }` o, #14, `{ kind: 'house' }`): `view` (para los hooks de acción), `busy`, `notice` (`in_flight` / `adopted`), `unconfirmed` y `acknowledge` ("Ya la revisé"). Ver "Transacciones (#11, #12)" |
| `useExecuteTransaction` | máquina común de transacciones: `useExecuteTransaction(view)` → `stage` (ligada al objetivo con que se lanzó; otra cuenta ve `idle`), `outcome` (`success`/`failure` de **su** última ejecución, leído del caché por `runId`; nunca `unconfirmed`, que muestra la vista) y `execute` |
| `useCreateGame` / `useCancelGame` / `useRejectGame` / `useAcceptGame` | hooks finos sobre la máquina, que reciben la `view` de la vista (la partida sale de `view.target`): builder, relectura de la House (crear), y lo que se lee del resultado (partida creada y `feeChanged`; reembolso; el `GameResolved` de la aceptación) |
| `useHouse` / `useSuiBalance` | la House de la config (sin intervalo; al montar y al foco) y el saldo de la cuenta conectada (sin cuenta no consulta) |
| `useHouseCap` | (#14) el `HouseCap` de la cuenta conectada: sin cuenta `{ kind: 'no_account' }` y ninguna consulta; con cuenta, `address` (normalizada), `cap` (`CapKnowledge`: `unknown` hasta la primera lectura exitosa, `known` con el cap o `null` desde entonces), `status`, `isFetching` y `refetch`. Ver "Panel de la House (#14)" |
| `houseAdminTx.ts` / `useUpdateFeeRate` / `useUpdateBetLimits` / `useWithdrawFees` | (#14) `houseCapPrecheck` (el `precheck` común de las tres acciones, por `getObject`) y los tres hooks finos sobre la máquina, que reciben la `view` del panel (`update` / `update` / `withdraw`); el valor es el evento de la transacción (`null` si no se pudo leer) |
| `useMyGames` | "Mis partidas" de la cuenta conectada: sin cuenta `{ kind: 'no_account' }` y ninguna consulta; con cuenta, `sections` (las tres, ya fijadas y deduplicadas), `unreadableEvents`, `activity` e `invitations` (`MyGamesSource`: `status` de la primera carga, `hasData`, `refreshRetrying`, `refreshError`, `hasNextPage`, `isFetchingNextPage`, `nextPageError`, `stalled`, `lowerBound`, `end`, `loadMore`, `retry`), `isFetching` y `refresh`. Ver "Mis partidas (#13)" |
| `useAccountTxBusy` | hay una transacción de la cuenta conectada en curso, de cualquier objetivo (`useIsMutating` con `txAccount`); sin cuenta, `false`. El aviso "en curso" único de "Mis partidas" |
| `useLobby` (+ `usePublishCheckpoint`) | filas con `isMine`, `ReadStatus` combinado con la publicación, `hasNextPage`, `isFetchingNextPage`, `nextPageError`, `stalled`, `lowerBound`, `end`, `loadMore`, `refresh` |
| `useGame` | `invalid_id` sin consulta, o la partida con su `ReadStatus`; refresco cada 15 s y al foco, salvo tras un error definitivo (DL-7) |
| `useTransactionTime` / `useCheckpointTime` | hora inmutable (`staleTime: Infinity`); sin digest (`null`/`''`) o sin número no consultan |
| `useNodeStatus`, `useWalletAccount`, `useAppConfig` | indicador de red, cuenta conectada y config |

### Componentes de transacción y listas (#11, #12, #13)

| Componente | Qué hace |
|---|---|
| `TransactionStatus` | etapa en curso o resultado del nodo: éxito con digest (link solo en testnet), costo de red y nota si no se indexó; "sin confirmar" con digest y sin "Reintentar"; fallo con mensaje y, si se ejecutó, digest y costo |
| `CreateGameForm` | formulario de la portada (ver "Formulario de creación"); `useTxTarget({ kind: 'create' })`; navega al detalle con el aviso en el `state` del router |
| `GameActions` | "Aceptar" (ver "Aceptar y resultado"), "Cancelar" (creador) y "Rechazar" (invitado) en el detalle, con **una** `useTxTarget` de la partida y un `TransactionStatus` por acción, más el aviso "en curso", el resultado adoptado y **una** alerta "sin confirmar" con "Ya la revisé". `variant='row'` (#13) es la fila de "Mis partidas": sin "Conecta tu wallet…" ni el aviso "en curso" (los da la página), y sin acciones después de un `success` propio o adoptado en la fila (H-3) |
| `MyGamesSection` / `MyGameRow` | una sección de "Mis partidas" con su pie (`sectionFooter`), las notas de relectura y las filas (`li.my-game-row[data-game-id]`; en "Terminadas", el rol y `.my-game-result`; en las otras dos, `GameActions variant='row'`) |
| `HistoryTime` | `CreatedAt` (hora de la transacción de una fila, "—" si no llega) y `FloorSince` (" (desde <fecha>)" del piso del nodo), comunes al lobby y a "Mis partidas" |
| `GameDetail` | el detalle de la partida; con la partida resuelta y la cuenta conectada como creador o aceptante, "Resultado para ti: ganaste/perdiste" (DL-12, leído del objeto) |
| `createdNotice.ts` | escribe y lee el aviso de creación del `state` del router (costo como string: react-router serializa la ubicación con `JSON.stringify`) |
| `txNotice.ts` | el texto "Hay una transacción en curso desde esta cuenta; espera a que termine", común al formulario, al detalle, a "Mis partidas" (una vez por página) y al panel de la House |
| `HouseAdminPanel` | (#14) el panel de la cuenta con el cap: `.house-config` y los tres bloques `[data-house-action]` (`fee`, `limits`, `withdraw`), cada uno con su `TransactionStatus`; **una** `useTxTarget({ kind: 'house' })`. Ver "Panel de la House (#14)" |

### Lecturas (#10)

- **Formato = BCS exacto** (DL-1): `Game` desde `content` y eventos desde `bcs`, con esquemas que replican el layout
  Move; tipo exacto `<originalPackageId>::game::Game` (DL-9: `originalPackageId`, no `packageId`), dueño compartido,
  re-serialización comparada byte a byte e invariantes de `game.move`. Lo que no encaja es `ReadDataError`: en el lobby
  queda como fila "Partida ilegible" sin ocultar las sanas; nunca se muestra como `Pending` (SEG-10). El `json` del nodo
  no se usa. Fixtures reales en `contracts/fixtures/game-reads.localnet.json`.
- **Montos de una partida resuelta** = `resolutionAmounts` (pozo `2 × bet`, comisión `⌊pozo × fee_rate / 10 000⌋`, pago
  `pozo − comisión`): fórmula de la v1 del contrato (D-20261030-16 D2/D3). Un upgrade que la cambie conserva la vieja para
  las partidas resueltas con el código viejo (por versión del `Game` o leyendo el evento), en el mismo PR (`agents.md`
  §5). La lectura de partidas no replica `MAX_FEE_BPS`; solo la validación de cortesía del panel de la House lo hace
  (`HOUSE_MAX_FEE_BPS`, #14; `agents.md` §5).
- **Lobby (DL-2, DL-3, M-1, M-2, M-4):**
  - descubre las partidas por `GameCreated` (eventos del paquete original) y lee los objetos en lote; solo muestra las
    abiertas en `Pending`; las más recientes primero;
  - **cota inferior** = máx(checkpoint de la **publicación**, piso del nodo + 16 000). La publicación sale de
    `publishTxDigest` de `contracts/deployments/<red>.json`; el piso (`lowestAvailableCheckpoint`) se relee al inicio de
    **cada** página; el margen solo se suma con piso > 0;
  - paginación acotada y calibrada en #10 (sondas P5/P7): **50** eventos por pedido, hasta **2** pedidos por página,
    objetivo de **20** abiertas por página, margen de **16 000** checkpoints (≈ 1 h a ≈ 4,36 checkpoints/s);
  - un cursor que no avanza es un error visible (`PaginationStalledError`, M-2) y solo deja "Actualizar";
  - **sin refresco automático:** "Actualizar" vuelve a la primera página; sin intervalo ni refetch al volver el foco (sí se
    vuelve a pedir al volver a la portada, por el montaje).
- **Detalle (`#/game/:id`):** lee el objeto; se refresca cada **15 s** y al volver el foco, salvo tras un error
  definitivo (no existe, no es una partida, datos ilegibles: `gameRefetchInterval`, DL-7); con la red caída sigue.
  "Última actividad" es la hora de `previousTransaction`, que es la **última** transacción que tocó el objeto, también
  una **fallida** (sonda P6 de #10): nunca se presenta como "la que la resolvió".
- **Política común de lecturas** (`QueryClient` de `AppProviders`, DL-5): corte de **10 s** por intento, decidido por la
  señal que se disparó (corte propio ⇒ transitorio; cancelación de TanStack ⇒ no); solo se reintenta lo transitorio
  (`UNAVAILABLE`, `INTERNAL`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `UNKNOWN`, `ABORTED`, el corte propio y la
  transacción sin checkpoint), **2 reintentos** a 1 s y 2 s; la UI muestra "Reintentando… (intento n de m)". "No
  existe", datos ilegibles, historial podado y cancelación no se reintentan.
- **Historial del nodo** (D-20261102-04 (1), P-1 (a)): en testnet el lobby solo cubre lo que conserva el fullnode
  público (≈ **14,6 días**; piso `lowestAvailableCheckpoint`). Una partida abierta más vieja no aparece en la lista aunque
  siga `Pending`: se ve por su ID en `#/game/:id`, que lee el objeto. Sin filas, el lobby dice "No hay partidas abiertas
  en el historial disponible del nodo (desde <fecha>)" y, con filas, deja esa nota al pie; la fecha es la del
  checkpoint de la cota, una aproximación de hasta ~1 h. La hora de una transacción podada sale como "—".
- **Listas por eventos (lobby y "Mis partidas"):** en el fullnode público de testnet, `client.listEvents` del SDK (sin
  rango de checkpoints) falla con `OUT_OF_RANGE` (sonda P7 de #10). Toda lista por eventos usa el crudo
  `client.ledgerService.listEvents` de `sui/eventScan.ts`, con `startCheckpoint` (la cota de arriba, `historyLowerBound`),
  y trata `OUT_OF_RANGE` como **fin del historial disponible** (`HistoryPrunedError`), no como error. La paginación del
  SDK solo vale contra un nodo sin poda (p. ej. la localnet). El filtro `eventType` exige direcciones completas. "Mis
  partidas" suma el filtro por remitente: ver "Mis partidas (#13)".
- **IDs de entrada** (D12, SEG-9): implementado en `ids.ts` (`parseObjectIdInput`) y usado por `useGame`: un ID de la
  URL se valida y normaliza antes de consultar; uno inválido no consulta la red. Todo ID o dirección que entre por
  formulario pasa por el mismo borde antes de consultar o armar un PTB (la invitación usa `parseAddressInput`, #11). `explorer.ts` valida
  pero no normaliza; los IDs de config ya llegan normalizados.
- Lecturas solo con TanStack Query sobre `useCurrentClient()` y claves de `queryKeys.ts`; nada de `useEffect` para pedir
  datos (PROY-14). La hora de un evento no viene en `listEvents`: sale de la transacción (`timestampMs`).

### Transacciones (#11, #12)

Una sola máquina para crear, cancelar, rechazar y aceptar (y para el panel de #14): `useExecuteTransaction`. Corre
entera dentro de la `mutationFn` de TanStack (`retry: false`: una transacción nunca se reintenta sola), así que termina
aunque el componente se desmonte, y nunca lanza hacia el componente (LIM-8). Cada mutación vive en el `MutationCache`
del `QueryClient` de la pestaña, con la clave de mutación de su objetivo (`queryKeys.txTarget`), `gcTime: Infinity`
(se conserva durante la carga de la página) y `networkMode: 'always'` (sin red no queda en pausa: la preflight falla con
el texto de red).

| Etapa | Texto | Qué pasa |
|---|---|---|
| `preflight` | "Verificando la transacción…" | sin cuenta (en las variables) ⇒ "Conecta tu wallet". `precheck` de la acción (crear: **relee la House** y la compara con lo mostrado, M-2). Después, **preflight propia**: simula una **copia** con `sender` (`build({ client })`). Nada de esto abre la wallet |
| `signing` | "Esperando la firma en la wallet…" | a la wallet va el `Transaction` **sin construir** (la wallet resuelve gas y pago) |
| `confirming` | "Confirmando en la red…" | `waitForTransaction` por digest con efectos y eventos. **El nodo es la única fuente de éxito o fallo** (DL-2, SEG-10): de la wallet solo se toma el digest |
| `indexing` | "Actualizando datos…" | si la confirmación no trae `checkpoint`, `waitForCheckpoint`; después, las invalidaciones de la acción |
| `done` | — | queda el `outcome` |

- **`build(sender)` y `precheck(signal, sender)` (#14, D-5):** la máquina pasa la dirección de la cuenta del clic al
  `precheck` y a las **dos** llamadas a `build` (la preflight y la firma). Las acciones de partidas la ignoran; el retiro
  de la House la usa como destino (`recipient`) y el `precheck` del `HouseCap` como dueño esperado.
- **Cuenta capturada (DL-11 de #13, MINOR-1 de #12):** `execute` guarda en las variables de la mutación (`TxVariables`)
  la cuenta del clic (el `UiWalletAccount` de `useCurrentAccount()`) y el `targetHash` del objetivo. `run` usa **esa**
  cuenta para la preflight, para firmar (`signAndExecuteTransaction({ transaction, account })`), para interpretar el
  resultado (`ExecuteInput.interpret(nodeResult, signer)` recibe la dirección que firmó; crear y aceptar la usan para
  reconocer su evento) y para la invalidación. Si la wallet ya no expone esa cuenta, el kit lanza antes de abrirla: sin
  digest, "La wallet no completó la operación…". La **etapa** queda ligada al `targetHash` con que se lanzó: si la vista
  pasa a otra cuenta, ve `idle` y `outcome: null`; al volver, la etapa y el resultado de la cuenta original.
  **Límites:** en "Mis partidas" el cambio de cuenta remonta la página (`key={address}`), así que esto rinde en el
  detalle y en el formulario; si después del cambio la **misma** instancia lanza una acción con la otra cuenta, su etapa
  y su `runId` pasan a ser de esa ejecución y, al volver, ya no muestra el resultado anterior (su "sin confirmar" sigue
  bloqueando el objetivo). La burner no permite reproducirlo; se verifica con una wallet de extensión en #17.
- **Resultados:** `success` (digest, valor leído del resultado, `indexed`, costo de red = cómputo + storage − rebate);
  `failure` (mensaje y, si se ejecutó, digest y costo); `unconfirmed` (digest), **solo** cuando el nodo no respondió o
  venció el corte. Un error de la wallet o del SDK con digest, o cualquier error después de tenerlo, nunca es `failure`
  (M-3 (b)): se consulta al nodo y, si no confirma, queda "sin confirmar" con el digest e invalida igual. Un
  `status.success: false` del nodo sí es `failure`. Si el nodo confirmó el éxito y no se pudo interpretar el resultado,
  es `success` con `value: null`.
- **"Sin confirmar":** "La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a
  intentar", sin "Reintentar". Bloquea su **objetivo** (el formulario de creación, o esa partida) durante la carga de
  la página, aunque se salga de la pantalla y se vuelva, hasta que la vista lo reconoce: "Ya la revisé: crear otra
  partida" en el formulario y "Ya la revisé" en el detalle (`acknowledge` borra esa mutación del caché). La alerta la
  dibuja **solo** la vista, desde `useTxTarget().unconfirmed`: una por vista, nunca una por acción (el `outcome` de los
  hooks de acción nunca es `unconfirmed`).
- **Indexación (S-1 bis de #11):** en el fullnode 1.83, después de ejecutar, `getTransaction` responde "not found" hasta
  que la transacción está en un checkpoint (≈ 0,44 s en localnet) y `getObject` puede devolver un momento la versión
  vieja; `waitForTransaction` vuelve ya con `checkpoint` (≈ 0,6 s). Por eso `indexing` normalmente no pide nada; si hace
  falta, `waitForCheckpoint` repite `getTransaction` cada 500 ms y cuenta el "not found" como intento fallido.
- **Cortes** (topes, no latencias esperadas; S-1 no los cambió): preflight **20 s** (`TX_PREFLIGHT_TIMEOUT_MS`),
  confirmación **30 s** (`TX_CONFIRM_TIMEOUT_MS`), indexación **30 s** (`TX_INDEX_TIMEOUT_MS`); si vence la indexación,
  éxito con "La lista puede tardar unos segundos en mostrarlo". La firma no tiene corte (es del usuario). Un error de
  red o el corte en la relectura de la House o en la preflight ⇒ "No se pudo verificar la transacción (red); intenta
  de nuevo", sin pasar por `errors.ts` (M-3 (a)).
- **Candado global por cuenta (DL-7 de #12):** `execute` no hace nada si hay una mutación de la cuenta en curso
  (`queryClient.isMutating` con la clave `txAccount`, de cualquier objetivo y de cualquier vista) o si el objetivo
  tiene un "sin confirmar". Como `mutateAsync` despacha `pending` antes de su primer `await`, dos clics en el mismo tick,
  de una o de dos vistas, ejecutan una sola vez. Los botones se deshabilitan con `useTxTarget().busy`
  (`useIsMutating` de la cuenta) o con un `unconfirmed` del objetivo.
- **Avisos de la vista (`useTxTarget().notice`):** `in_flight` = hay una transacción de la cuenta en curso que **no**
  lanzó esta vista ("Hay una transacción en curso desde esta cuenta; espera a que termine"); la propia nunca la avisa.
  `adopted` = el resultado de una mutación **ajena** del mismo objetivo que empezó después de montar la vista o estaba
  en curso al montar (foto `mountSnapshot` de **todo** el caché, así un cambio de cuenta sin desmontar no adopta
  mutaciones viejas de la otra cuenta); se muestra con el texto de su acción, y un crear adoptado con la partida
  identificada navega como el propio. Lo que terminó antes de montar no se adopta (no se navega dos veces), y el
  `adopted` se descarta en cuanto la vista lanza una propia o adopta otra más nueva. La identidad de cada montaje
  (`viewId`) y de cada ejecución (`runId`) sale de contadores de módulo: ni `crypto.randomUUID()` ni `useId()`.
- **Límite conocido (R-5):** el candado es **por pestaña** (un `QueryClient` por pestaña). Entre dos pestañas con la
  misma cuenta, una segunda aceptación, cancelación o rechazo que pasa las dos preflights se **ejecuta** y aborta con
  `game`/4 (cuesta gas); crear dos veces deja una segunda apuesta (se recupera cancelando) y un depósito de storage que
  no se recupera.
- **Errores al preparar (DL-10 de #12):** un `SimulationError` **sin** abort ni `executionError` es un rechazo del nodo
  antes de simular (p. ej. un comando después del de `Random`, o la selección de gas por saldo insuficiente, ambos con
  `INVALID_ARGUMENT`): "No se pudo preparar la transacción: …", sin abrir la wallet. Si su `cause` es un corte de red
  transitorio (`UNAVAILABLE`, …), la preflight lo convierte en `PreflightNetworkError` (texto de red). Con
  `executionError` y sin abort (p. ej. `InsufficientCoinBalance`): "La red no ejecutó la transacción: …".
- **NIT-2:** si la wallet rechaza **sin** digest pero el error trae un abort (una wallet que simula por su cuenta), se
  muestra el abort mapeado y se aplican las invalidaciones de la acción (el estado mostrado está viejo).
- **Invalidación (DL-6, `txInvalidation.ts`):**

  | Acción | `resetQueries` | `invalidateQueries` (en este orden) |
  |---|---|---|
  | crear | `lobby` (vuelve a la primera página) | `balance` de la cuenta, `myGames` de la cuenta |
  | cancelar / rechazar | `lobby` | `game` de esa partida, `balance` de la cuenta, `myGames` de la cuenta |
  | aceptar | `lobby` | `game` de esa partida, `balance` de la cuenta, `house` (cobró la comisión), `myGames` de la cuenta |
  | cambiar comisión / cambiar límites (#14) | — | `house`, `houseCap` de la cuenta |
  | retirar comisiones (#14) | — | `house`, `balance` de la cuenta (recibió el `Coin`), `houseCap` de la cuenta |

  `myGames` (#13, DL-7) es el prefijo de las dos fuentes de "Mis partidas" de la cuenta que firmó, y va **al final**:
  relee en serie todas sus páginas cargadas (ver "Mis partidas (#13)"). Sin cuenta, ni `balance` ni `myGames`. Nunca
  `nodeInfo`, `txInfo`, `publishCheckpoint` ni `checkpointTime`. Se aplica también tras un abort en la preflight, un
  fallo del nodo y un "sin confirmar" (el estado pudo cambiar). `done` llega **después** de la relectura: con el lobby o
  "Mis partidas" montados, "Actualizando datos…" dura lo que tarde esa lectura. Las acciones de la House (H-5 de #14) no
  reinician nada ni tocan partidas, `lobby` o `myGames`; sin cuenta, solo `house`.
- **Mensajes de abort** (`errors.ts`, M-5): por **módulo + código**, solo si el abort viene de nuestro `packageId` u
  `originalPackageId` (normalizados), con el sufijo de diagnóstico fijo `(código <módulo>/<n>)`, p. ej. "Solo quien creó
  la partida puede cancelarla. (código game/3)". Los textos de `game` 0–10 y `house` 0–4 viven solo en
  `ABORT_MESSAGES` (tabla de `contracts/README.md`, "Abort codes"). Fallbacks:

  | Caso | Mensaje |
  |---|---|
  | código desconocido de `game`/`house` | "El contrato rechazó la operación (código game/99)" |
  | abort de otro paquete | "La transacción abortó en `0x1234…abcd::<módulo>` (código N)", sin traducir |
  | cancelación del runtime sin abort: falta de aleatoriedad (`Unknown` con `ExecutionCancelledDueToRandomnessUnavailable` o "randomness could not be generated") | "La red canceló la transacción sin ejecutarla (la aleatoriedad de la red todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos" |
  | cancelación del runtime sin abort: congestión (`CongestedObjects`) | "La red canceló la transacción sin ejecutarla (hay congestión en un objeto compartido): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos" |
  | otro fallo sin abort (gas, objetos, `InsufficientCoinBalance`) | "La red no ejecutó la transacción: …" |
  | error de la wallet sin abort | "La wallet no completó la operación: …" o "La wallet no completó la operación (sin detalle del error)" |
  | `SimulationError` sin abort ni `executionError`, u otro error al preparar (ni simulación ni red) | "No se pudo preparar la transacción: …" |
  | red o corte al verificar | "No se pudo verificar la transacción (red); intenta de nuevo" |

  `findMoveAbort` reconoce el abort estructurado y, por texto, **dos** formatos: el del SDK (`abort code: N, in
  '0x…::<módulo>::…'`) y el Rust del nodo (`MoveAbort(MoveLocation { module: ModuleId { address: …, name:
  Identifier("<módulo>") } … }, N)`). La forma en que la CLI **presenta** un abort ("… aborted within function … with
  code N") no se reconoce: nunca llega a la app (R-1 de #11). Los aborts de aceptar se ubican en
  `game::assert_acceptable`; el mapeo es por módulo y código, así que no cambia.

### Formulario de creación

- **Términos de la House** (`useHouse`): "Mínimo X SUI · máximo Y SUI" y "Comisión Z (la partida guarda esta
  comisión)"; sin la House leída no se puede crear (estado de lectura con "Reintentar"). Antes de firmar se relee: si la
  comisión o los límites cambiaron, se detiene con "La comisión cambió de X a Y; revisa y vuelve a confirmar" (y/o los
  límites) sin abrir la wallet (M-2). Si igual la partida guarda otra comisión, el aviso de creación lo dice
  (`feeChanged`).
- **Monto:** `parseSuiToMist`, **sin recortar** (un espacio es "Monto inválido: solo números y punto decimal, sin
  espacios ni separador de miles"); límites **inclusive**; saldo ≥ apuesta + **0,01 SUI** de reserva de gas de
  cortesía (`CREATE_GAS_RESERVE_MIST`). Si el saldo no se pudo leer no bloquea y se avisa: la wallet lo verifica.
- **Invitación (opcional):** se recorta y se normaliza con `parseAddressInput` (valen la forma corta y las mayúsculas);
  la propia cuenta ⇒ "No puedes invitarte a ti mismo".
- **Estimación** "Si alguien acepta: pozo · comisión · al ganador", con `resolutionAmounts` y la comisión de la House.
- **Costo:** nota previa con el depósito de almacenamiento, que **no se recupera** (D-20261030-15 D3; medido en #6 al
  precio de testnet: **1 953 200** MIST abierta y **2 196 400** MIST con invitación, `GAME_STORAGE_DEPOSIT_MIST`), y la
  reserva de gas; tras el éxito, el costo real de red de esa transacción.
- **Después de crear:** con la partida identificada (único `GameCreated` del firmante) navega a `#/game/<id>` con el
  aviso "Partida creada", digest y costo; en una invitación, "Comparte el enlace de esta página con el invitado;
  guárdalo, o encuéntrala en «Mis partidas»" (R-7 de #13; las invitaciones no aparecen en el lobby). Sin identificarla, queda en la
  portada con "Partida creada" y el digest.
- **Detalle:** "Cancelar" solo para el creador y "Rechazar" solo para el invitado, en `Pending`; el reembolso que se
  muestra sale del `GameCancelled` de la transacción. Sin cuenta, el formulario dice "Conecta tu wallet para crear una
  partida" y el detalle no muestra botones: en una partida `Pending` dice "Conecta tu wallet para aceptar la partida,
  cancelarla si es tuya o rechazarla si te invitaron", y en una terminada, nada.

### Aceptar y resultado (#12)

- **Quién ve "Aceptar"** (`acceptState`, M-3): solo en `Pending`, con cuenta conectada, si la cuenta no es el creador
  y, en una invitación, si es el invitado (el invitado ve "Aceptar" y "Rechazar"). El creador no ve "Aceptar" (no se
  juega contra uno mismo). Una cuenta conectada que abre una invitación ajena ve "Esta invitación es para otra
  dirección." sin botón (D-20261103-02; el mismo texto que el abort `game`/5). El contrato valida igual (SEG-2).
- **Antes de aceptar:** "Apuestas `<bet>` SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la
  transacción (50 % cada uno) y pagas su gas." y la nota "Si tu wallet muestra una vista previa con un ganador o un
  cambio de saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción." (DL-5).
- **Saldo** (`acceptBalanceCheck`): hace falta la apuesta más **≈ 0,01 SUI** de reserva para el gas
  (`ACCEPT_GAS_RESERVE_MIST` = 10 000 000 MIST). Si no alcanza, "Aceptar" se deshabilita con "Saldo insuficiente:
  necesitas `<bet>` SUI de apuesta más ≈ 0.01 SUI de reserva para el gas". Si el saldo no se pudo leer, no bloquea: "No
  se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al firmar)". **Medición** (TASK-1 de #12, S-4, en
  localnet con precio de gas 1000): el budget que el nodo elige en la preflight de aceptar fue **3 474 748** MIST con
  una moneda de gas y **4 474 748** con dos; con margen 2× y redondeado hacia arriba a 0,005 SUI, 0,01 SUI (cubre también
  el costo sin ningún rebate, 1 000 000 + 6 186 400 MIST). Es cortesía: entre `bet` + budget y `bet` + reserva la app
  marca "insuficiente" un saldo que el nodo aceptaría. El budget escala con el precio de gas de la red: se revisa en #17.
- **Transacción** (`useAcceptGame`, DL-1/DL-3): `splitCoins(gas, [bet])` con la apuesta del `Game` leído y
  `accept_game(game, house, coin, random)` como **último** comando; sin `precheck` (la preflight ya valida estado,
  versión y House). El nodo simula con `Random` (S-1 de #12), así que un abort (`game`/4, 5, 9, 10) sale en la preflight
  sin abrir la wallet. Por el camino de la wallet, la confirmación de una aceptación tardó 0,6-1,4 s en localnet (S-3).
- **Resultado (SEG-10):** solo con la confirmación del nodo y del `GameResolved` de **esa** partida con la cuenta como
  aceptante (`parseResolvedGame`). Mientras tanto, solo los textos neutros de las etapas: ningún ganador anticipado ni
  animación. Ganaste: "¡Ganaste! Recibiste `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; perdiste:
  "Perdiste: ganó quien creó la partida y recibió `<payout>` SUI (pozo `<pot>` SUI − comisión `<fee>` SUI)"; sin el
  evento: "Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador". El mismo
  texto para una aceptación adoptada. El resultado sigue a la vista cuando la partida pasa a "Resuelta" y el botón
  desaparece.
- **"Resultado para ti"** (DL-12): en el detalle de una partida resuelta, para el creador y el aceptante, "ganaste" o
  "perdiste", leído del objeto (`playerResult`); nada para un tercero ni sin cuenta.
- **Cancelaciones del runtime** (DL-11): una aceptación cancelada por falta de aleatoriedad o por congestión no es éxito
  ni error del contrato; se muestra el texto de "intenta de nuevo" (ver "Mensajes de abort"), y el reintento es el
  mismo botón.

### Mis partidas (#13)

Página `#/my-games`, con el enlace "Mis partidas" en el encabezado. Sin cuenta dice "Conecta tu wallet para ver tus
partidas e invitaciones" y no consulta nada. Con cuenta muestra `<MyGamesView key={address} />`: al cambiar de cuenta la
vista se remonta (DL-9). Todo sale de `sui/myGames.ts` y `hooks/useMyGames.ts`; los componentes solo dibujan.

- **Dos fuentes (DL-1), con el `ListEvents` crudo de `eventScan.ts`:**
  - **(A) actividad propia:** la DNF `[sender = cuenta ∧ tipo = GameCreated] ∨ [sender = cuenta ∧ tipo = GameResolved]`
    (`myActivityFilter`, tipos del paquete original, `sender` normalizado). El nodo la resuelve por índice: medido en el
    fullnode público de testnet (`sui-node` 1.83.1, V-2) y en la localnet (`sui` 1.83.0, TASK-1 de #13, S-1);
  - **(B) invitaciones recibidas:** el escaneo de todos los `GameCreated` del paquete (como el lobby) con el filtro
    `opponent == cuenta` en el cliente: no hay filtro por campo del evento (V-1). Su costo crece con el volumen del
    paquete (ver "Límite sin indexador").
  - El `readMask` es el del lobby, **sin `sender`**: el remitente se verifica en el contenido del evento.
- **Estado del objeto e invariantes (DL-3):** los IDs salen de los eventos y el estado de `getObjects` en lote, con
  `parseGameObject`; cada fila guarda la versión del objeto (`objectVersion`). En (A), `GameCreated.creator` y
  `GameResolved.acceptor` tienen que ser la cuenta; si no, la fila es **ilegible**: nunca se muestra como propia
  (SEG-10). Un objeto que ya no existe se omite.
- **Ilegibles:** en (A), un evento o un objeto ilegible da una fila "Partida ilegible" en "Terminadas". En (B), un
  **evento** ilegible no da fila (no se sabe a quién invita): se cuenta y la página dice "N eventos ilegibles en lo
  revisado". Un **objeto** ilegible de una invitación a la cuenta sí da fila, en "Invitaciones recibidas".
- **Secciones (DL-4):** "Invitaciones recibidas" (pendientes, con "Aceptar" y "Rechazar"), "Tus partidas pendientes"
  (creadas por la cuenta, en `Pending`, con "Cancelar") y "Terminadas" (resueltas con la cuenta como creador o
  aceptante, con "Creaste"/"Aceptaste" y "Ganaste"/"Perdiste" leídos del objeto, más pozo y pago "según la fórmula del
  contrato"; las canceladas propias dicen "Cancelada: la apuesta volvió a quien la creó"). Una invitación terminada en
  la que la cuenta no fue el aceptante (rechazada o cancelada por el creador) no tiene sección. Orden: la más nueva
  primero, por el checkpoint del evento.
- **Deduplicación (`mergeMyGames`, H-2):** una invitación aceptada llega por las dos fuentes y es **una** fila. Gana la
  lectura legible; entre dos legibles, la de mayor `objectVersion`, con rol "Aceptaste" si alguna fuente lo trae y el
  evento más nuevo. `objectVersion` es una versión **Lamport** (sube a la del último commit del objeto, p. ej. 4 → 415 al
  aceptar, y la comparten objetos de la misma transacción, V-10): solo se compara entre lecturas del **mismo** objeto.
- **Fijado (DL-5, H-5, H-6):** cada partida queda en la sección donde se fijó hasta "Actualizar", hasta que la página se
  remonta (volver a ella, cambiar de cuenta) o hasta que cambia la cuenta (los pins guardan su cuenta). Así, tras una
  acción propia la fila **no salta** de sección: queda con su estado nuevo ("Resuelta", "Cancelada"), sin botones y con
  su `TransactionStatus` (digest, montos).
  - **H-5:** se fija solo con las **dos** fuentes quietas (`!isFetching`). Mientras alguna pide, las filas sin pin se
    muestran en su sección natural y las fijadas no se mueven. Al remontar, la caché puede traer datos que la
    invalidación de DL-7 marcó viejos y que TanStack relee recién ahora: el fijado espera a la relectura, así "volver a
    la página" reagrupa con datos frescos.
  - **H-6:** las partidas con una transacción **viva** de la cuenta (en curso, en curso al montar o empezada después de
    montar: el criterio de adopción de #12, `liveTxGameIds`) se fijan **en seguida** con los datos que haya. La
    transacción ya se ejecutó cuando la UI dice "Confirmando en la red…", y la relectura traería el estado nuevo: sin
    H-6, la fila pasaría a "Terminadas" y perdería su resultado. Así una fila con una transacción en curso no se mueve
    aunque se vuelva a la página o se cambie de cuenta, y el resultado adoptado aparece en ella. Esto cierra **RM-14**.
    Lo único que queda: la primera visita sin caché con una transacción ya en curso; esa fila nunca se vio con
    acciones, así que no se pierde nada a la vista.
- **Pie honesto por fuente (DL-16, H-1, `sectionFooter`):**
  - texto de vacío definitivo ("No tienes invitaciones pendientes", "No tienes partidas pendientes", "Todavía no hay
    partidas terminadas") **solo** sin más páginas, sin `stalled` y sin error de "cargar más"; si no, "Sin … en lo
    revisado";
  - botón visible con más páginas y sin `stalled`, **también** con un error de "cargar más" (sirve de reintento), y
    deshabilitado mientras carga ("Cargando más…"): "Cargar más actividad" al pie de "Tus partidas pendientes" **y** de
    "Terminadas" (comparten la fuente (A)); en "Invitaciones recibidas", "Buscar más atrás" sin filas o "Cargar más
    invitaciones" con filas;
  - con un error de "cargar más", `role="alert"` con el mensaje, también con `stalled`;
  - con la cota en el piso del nodo, el sufijo "en el historial disponible del nodo (desde <fecha>)" en el vacío, o la
    nota "Solo se muestra el historial disponible del nodo (desde <fecha>)" con filas.
- **Página vacía tras `ITEM_LIMIT` (V-9):** si lo revisado terminaba justo en el tope de un pedido, el nodo responde
  `ITEM_LIMIT` y el pedido siguiente llega **vacío** con `CHECKPOINT_BOUND`. Es un fin normal, no un error: "Cargar más"
  no trae filas y recién entonces aparece el texto definitivo. Forma de los frames medida en localnet (TASK-1 de #13):
  con `ITEM_LIMIT`, el `QueryEnd` llega en el frame del último evento; con `CHECKPOINT_BOUND`, en un frame extra; cada
  frame trae `watermark.cursor`, y el cursor final de un `CHECKPOINT_BOUND` es el de la cota.
- **Relectura sin desmontar (DL-17):** por fuente, la primera carga (`status`: cargando, reintentando, error) reemplaza
  las filas con `ReadState`; con datos, una relectura en reintento o fallida **no** las reemplaza: va como nota arriba de
  la sección ("Reintentando… (intento n de m)" o "No se pudo actualizar la lista: …; los datos pueden estar
  desactualizados" con "Reintentar"). "Reintentar" de una fuente cuya cota (la publicación) falló relee la publicación,
  no el escaneo.
- **Paginación (DL-8):** actividad, **50** eventos por pedido y **1** pedido por página; invitaciones, las constantes del
  lobby (**50** / **2** / **20** candidatas). Objetos en lote (≤ 50 por pedido del SDK). Cota común:
  `historyLowerBound`. Sin refresco automático ni al foco (DL-13): "Actualizar" vuelve a la primera página de las dos
  fuentes y reinicia los pins.
- **Invalidación (DL-7) y su costo:** cada transacción propia invalida `myGames` de la cuenta al final de su lista (tabla
  de "Transacciones"). Con la página montada, las dos fuentes se releen **antes** de `done`, en serie y página por
  página: con muchas páginas cargadas, "Actualizando datos…" y el candado global duran más (RM-12). Con reintentos, eso
  dura hasta que terminan los de la política común: hasta 3 intentos con corte de 10 s y esperas de 1 s y 2 s, **por
  cada pedido** de las páginas cargadas (H-4). `invalidateQueries` no lanza: `done` llega igual, y una relectura fallida
  queda como nota (DL-17). Al releer, la primera página empieza en el tope actual: si llegaron eventos nuevos, las
  mismas páginas cubren un tramo más reciente y una fila vieja puede quedar fuera hasta "cargar más" (la ventana se
  corre).
- **Acciones en las filas (DL-6, H-3):** una `useTxTarget` por fila (`GameActions variant='row'`), con el candado global
  por cuenta: durante una transacción, todos los botones de todas las filas se deshabilitan y la página muestra el
  aviso "Hay una transacción en curso desde esta cuenta; espera a que termine" **una** sola vez (`useAccountTxBusy`). Un
  "sin confirmar" bloquea solo su fila hasta "Ya la revisé". Con un `success` propio o adoptado en la fila, sus acciones
  desaparecen aunque el objeto leído siga viejo.
- **Ayudas (D-20261103-03, DL-15):** "Abrir partida por ID" (`parseObjectIdInput`: forma corta y mayúsculas valen; un
  ID inválido dice "ID de partida inválido" sin navegar ni pedir) y, solo en testnet, el enlace "Ver tu historial
  completo en el explorador" (`explorerAccountUrl`, Suiscan, en otra pestaña).

#### Límite sin indexador

- **Ventana del nodo:** en testnet, las tres secciones cubren solo el historial que conserva el fullnode público
  (≈ **14,6 días**, piso `lowestAvailableCheckpoint`; D-20261103-03, como el lobby por D-20261102-04 (1)). Lo dicen con
  el sufijo o la nota "desde <fecha>".
- **El caso del creador:** una partida creada hace más de ~14,6 días y resuelta después **no** aparece en "Terminadas"
  del creador. El `GameResolved` tiene como remitente al aceptante, y el `GameCreated` del creador ya está podado. Se ve
  por su enlace, por "Abrir partida por ID" o por el explorador.
- **Costo del escaneo de invitaciones:** (B) recorre **todos** los `GameCreated` del paquete; con muchas partidas ajenas,
  encontrar una invitación vieja puede pedir varios "Buscar más atrás". Está acotado (50 / 2 / 20 por página) y dice
  "en lo revisado" (RM-2).
- **Sin filtro por campo:** ni el `ListEvents` del fullnode ni GraphQL filtran por `opponent`: (B) no se puede
  abaratar sin un indexador propio.
- **Seguimiento post-MVP:** mostrar en testnet el historial completo, más allá de la ventana, queda en **#51**
  (D-20261103-03: GraphQL u otro índice, con su medición).

### Panel de la House (#14)

`#/admin` ("Administrar House") es para el titular del `HouseCap`: muestra la configuración de la House y permite
cambiar la comisión, cambiar los límites y retirar las comisiones con la máquina común. El enlace "Administrar House"
del encabezado aparece **solo** cuando se sabe que la cuenta tiene el cap.

- **Detección por tipo (D-1):** `fetchHouseCap` busca en el índice de dueños del nodo `listOwnedObjects({ owner, type:
  <originalPackageId>::house::HouseCap, limit: 2, include: { content: true } })`, sin `houseCapId` en la config. La
  **regla de certeza (H-1)** es la siguiente:
  - "esta cuenta no tiene el cap" (`null`) **solo** con 0 objetos y la última página con `hasNextPage: false`;
  - dos o más ⇒ `ReadDataError('invariant')`;
  - si el tope de 3 pedidos (`HOUSE_CAP_MAX_PAGES`) o un cursor `null` cortan la búsqueda sin esa respuesta ⇒
    `ReadDataError('incomplete')`, nunca `null`;
  - los errores de red se relanzan tal cual y siguen la política común (DL-5: 3 intentos, "Reintentando…").

  Medido en la localnet (TASK-1, S-1): el nodo 1.83 filtra por tipo exacto, y una cuenta sin cap recibe `[]` sin error.
- **`CapKnowledge` (H-2):** `useHouseCap` da `unknown` mientras no hubo una lectura exitosa (cargando, reintentando o con
  error) y `known` (con el cap o con `null`) desde la primera, aunque una relectura posterior falle. Sin
  `placeholderData`: otra cuenta es otra clave y arranca `unknown`. La página se monta con `key={address}`, como "Mis
  partidas". Estados de la página:

  | Estado | Qué se ve |
  |---|---|
  | sin cuenta | "Conecta la wallet que tiene el HouseCap para administrar la House" (ninguna consulta) |
  | `unknown` | solo `ReadState` ("Cargando…", "Reintentando… (intento n de m)" o el error con "Reintentar"); nunca "Sin permisos" |
  | `known` + `null` | `.house-no-permission`: "Sin permisos: esta cuenta no tiene el HouseCap de esta House." y "Volver a comprobar" (deshabilitado mientras relee), sin datos de la House (P-1); el `ReadState` encima si relee o falla |
  | `known` + cap | el panel, con el `ReadState` encima si una relectura falla: el panel **no** se desmonta (sus resultados siguen a la vista) |

- **"Volver a comprobar":** el índice de dueños va detrás del store de objetos. En la localnet (TASK-1, S-2, 10
  transferencias), `getObject` vio al dueño nuevo antes que el índice; el atraso del índice fue de 0 a 452 ms y,
  respecto del fin de la CLI, ≤ 83 ms. En el smoke hicieron falta **0** "Volver a comprobar" tras recibir el cap. En
  testnet no está medido: si el panel dice "Sin permisos" justo después de recibir el cap, el botón vuelve a buscar.
- **Costo:** el encabezado y el panel observan la misma consulta del cap. Cada cuenta conectada cuesta 1
  `ListOwnedObjects`, más una relectura al montar la página o el panel, "Actualizar", "Volver a comprobar" y las
  invalidaciones de las acciones.
- **Configuración (`.house-config`):** "Comisión: <bps> bps (<%>)", mínimo y máximo de apuesta, "Comisiones acumuladas",
  "Versión de la House" (el campo `version` del objeto; la app no replica `house::VERSION`) y "Actualizar", que relee
  la House y el cap. Para la House rige lo mismo que H-2: `ReadState` solo sin dato, y con dato el aviso va encima.
- **Acciones** (`[data-house-action]`), cada una con validación espejo (cortesía: el contrato es la verdad), el resumen
  "De X a Y" junto al botón (P-3: sin diálogo de confirmación) y su `TransactionStatus`:
  - **Comisión** (`fee`): bps enteros 0..1000 con el % en vivo (" = 2.5 %"). El aviso fijo recuerda que **cada partida
    copia la comisión al crearse** (D-20261030-06 §3): las ya creadas conservan la suya. Por eso cambiarla no es del todo
    reversible.
  - **Límites** (`limits`): mínimo y máximo en SUI, con errores por campo y del par (`0 < min <= max`). El aviso fijo
    recuerda que solo se aplican al **crear** partidas: las pendientes no cambian.
  - **Retiro** (`withdraw`): siempre **total** y siempre a la **cuenta que firma**, por construcción (N-2,
    D-20261104-02 (5)): `build(sender)` arma `withdraw_fees` + `TransferObjects([Result 0], sender)`, sin campo de destino
    ni monto parcial. Con 0 acumulado, el botón está deshabilitado y dice "No hay comisiones para retirar.". El monto que
    se muestra al terminar es el del `FeesWithdrawn`, no lo leído antes.
  - Los textos de éxito salen **solo** del evento de la transacción que confirmó el nodo (H-6, SEG-10), también en el
    resultado adoptado de otra vista. Sin evento legible, se muestra un éxito honesto que remite a la configuración o a
    la transacción.
- **Campos con borrador (TASK-5b, SM-1 del smoke):** cada campo de comisión y de límites guarda solo lo que el admin
  escribe y muestra `borrador ?? valor vigente`:
  - un campo **sin editar** sigue a la House en cada render, así el panel nunca ofrece, con el botón habilitado, revertir
    un cambio que la House ya tiene (pasaba al remontar el panel con la House en caché);
  - los errores solo aparecen con un borrador;
  - al **lanzar** la acción, los borradores se vacían: los campos muestran la House vigente (la de antes mientras corre y
    la nueva cuando la invalidación la relee);
  - **si la transacción falla**, el error queda en el bloque y el admin tiene que volver a escribir el valor;
  - un campo editado conserva su texto aunque la House cambie, y el resumen compara contra la vigente.
- **`precheck` común (H-3):** antes de la preflight, `checkHouseCapOwnership` lee el cap **por ID** con `getObject` (el
  store de objetos, no el índice de dueños):
  - si ya no es de la cuenta que firma, o el nodo dice que no existe (`notFound`/`deleted`), la acción corta **sin abrir
    la wallet** con "Esta cuenta ya no tiene el HouseCap: no puede administrar la House." e invalida el `houseCap` de esa
    cuenta;
  - otro error de lectura se muestra como texto de red o como "No se pudo preparar la transacción: …".
- **Límite (T4-15, V-11):** si el cap cambia de manos en los milisegundos entre el `precheck` y la preflight, la preflight
  de una cuenta sin el cap falla con un `SimulationError` **sin** `executionError` (`INVALID_ARGUMENT`).
  - El panel muestra "No se pudo preparar la transacción: …" con el **texto del nodo**, que incluye las direcciones del
    dueño y del firmante ("Object … is owned by account address …, but given owner/signer address is …").
  - No abre la wallet y no invalida nada. El siguiente intento lo corta el `precheck`.
- **Solo por CLI (D-7, N-1):** `migrate` y `transfer_house_cap` no están en la app. Transferir el cap es irreversible y
  tiene su checklist en `contracts/README.md`, "Qué pasa si se pierde el cap".
- **Candado y avisos:** la misma máquina y la misma `useTxTarget` que en el resto de la app. Mientras corre una acción,
  los tres botones están deshabilitados y el aviso "en curso" aparece solo para una transacción ajena (NIT-3 de #12,
  cerrado). "Sin confirmar" muestra una sola alerta con "Ya la revisé".
- **Medido en el smoke (localnet, burner, `sui` 1.83):**
  - del clic al resultado: **0,86-1,08 s**;
  - de "Confirmando en la red…" al resultado: **0,34-0,62 s**;
  - cada acción hace 2 `SimulateTransaction` + 1 `ExecuteTransaction`.

### Fixtures de lectura

`contracts/fixtures/game-reads.localnet.json` (5 variantes de `Game`, sus eventos y una página cruda de `ListEvents`,
capturadas en una localnet desechable) la usan los tests de `sui/`. Cómo recapturarla:
`contracts/README.md`, "Lectura desde la app" (`node app/scripts/capture-read-fixtures.mjs` dentro de la localnet
aislada; solo acepta `http://127.0.0.1:9000`).

`contracts/fixtures/game-tx.localnet.json` (#11 y #12: House, 11 `SimulationError` reales, 9 transacciones ejecutadas
con dos `MoveAbort` reales, entre ellas aceptaciones con cada ganador y sobre una invitación, y el texto Rust del abort)
la usan los tests de `sui/`, `hooks/` y `components/`; se recaptura con
`node app/scripts/capture-tx-fixtures.mjs`, con la misma guarda (`app/scripts/localnet-guard.mjs`).

`contracts/fixtures/house-admin.localnet.json` (#14) la usan los tests de `sui/`, `hooks/` y `components/` del panel. Trae:
- el listado real del `HouseCap` por tipo: `ADMIN`, una cuenta sin cap y `limit: 1`;
- el `getObject` del cap;
- 4 `SimulationError` de `house`/0, 1, 1, 2 y la preflight sin el cap (`SimulationError` sin `executionError`, V-11);
- las tres transacciones de admin ejecutadas;
- la House después del retiro.

Se recaptura con `node app/scripts/capture-house-fixtures.mjs` (misma guarda), después de las transacciones por CLI que
lista `contracts/README.md`, "Lectura desde la app". No se toca `game-tx.localnet.json`: el retiro la dejaría con la
House en 0.

## Indicador de red

El encabezado muestra siempre la red del build y el estado del nodo: "conectando…", "reconectando… (intento n de m)",
"nodo OK", "red equivocada (esperada X, nodo Y)" (chain id del nodo distinto del de `<red>.json`) o "sin conexión" con
el motivo.

- Consulta `getServiceInfo` cada 20 s (`NODE_STATUS_REFETCH_MS`) con el corte común de 10 s (`READ_TIMEOUT_MS`): un
  nodo colgado cuenta como error, no deja el último "nodo OK".
- Usa la política común de lecturas: mientras reintenta muestra **"reconectando… (intento n de m)"**, nunca "nodo OK".
- **Latencia de "sin conexión":** ≤ ~25 s con el nodo caído (20 s de intervalo + 1 s + 2 s de espera entre los 3
  intentos) y ≤ ~55 s con el nodo colgado (20 s + 3 intentos de 10 s + 3 s de espera).

## Wallet

`ConnectButton` del kit con el texto **"Conectar wallet"** y la dirección abreviada de la cuenta conectada. El kit solo
deja cambiar el texto del botón: su modal ("Connect a wallet", "No wallets installed"…) y su menú de cuenta quedan en
inglés (DL-11, D-20261102-04 (2)). La **burner wallet** se habilita solo en
localnet + `npm run dev`; su código igual está en el bundle de testnet (el kit lo importa siempre), pero nunca se
habilita ni se ofrece.

- **La burner nace sin fondos** y es una clave nueva **por carga de página** (no se guarda): al recargar cambia de
  dirección y la anterior queda inaccesible. Después de fondearla, navegar por hash (`#/…`) sin recargar.
- **Fondearla en la localnet aislada** (`agents.md` §3): conectar la burner, tomar su dirección (el `title` de la
  dirección abreviada del encabezado) y, desde una cuenta de la génesis con el prefijo `PRE` (`env.sh` + `ids.env` +
  `smoke_guard`, regla B4): `PRE act_as "$A" && suic ptb --split-coins gas "[2000000000]" --assign c
  --transfer-objects "[c]" @<burner>` (2 SUI). El saldo del formulario se actualiza al volver a la portada.
- La burner firma sin ventana de aprobación (simula y ejecuta con su cliente); una wallet de navegador muestra la suya.

## Dependencias y avisos de seguridad (SEG-8, D-20261102-02 (3))

- Versiones **exactas** en `app/package.json`, `package-lock.json` commiteado y `.npmrc` en la raíz:
  `save-exact`, `engine-strict`, `min-release-age=7` (ninguna versión con menos de 7 días) e `ignore-scripts`.
- Los `@mysten/*` acoplados van **por tren** (hoy `@mysten/sui` 2.37.0, `@mysten/dapp-kit-core` 1.6.39,
  `@mysten/dapp-kit-react` 2.1.41, con una sola versión de cada uno en el árbol); se suben juntos.
- **Al subir el tren `@mysten/*`:** revisar `TransactionErrorReason` y `ObjectErrorReason` de `@mysten/sui/client`.
  `fetchPublishCheckpoint` trata todo `TransactionError` como "podada" porque en 2.37 su único motivo es `notFound`, y
  `fetchGame` mapea `ObjectError` `notFound`/`deleted` a "no existe"; un motivo nuevo cambia esa lectura. Revisar
  también los `$kind` de `ExecutionError` (`errors.ts` los usa para distinguir "la red no ejecutó" de un error de la
  wallet) y los formatos de `formatMoveAbortMessage` y del texto Rust del nodo (las dos regex de `findMoveAbort`; la
  fixture `game-tx.localnet.json` y sus tests lo detectan).
- **`build()` sin `signal` (SDK 2.37):** la preflight corta la **espera** a los 20 s, no la simulación, que puede seguir
  en segundo plano (solo lectura; su resultado se descarta). Si una versión futura del SDK acepta `signal` en
  `build()`, pasárselo.
- Un paquete nuevo necesita justificación (necesidad, mantenimiento, licencia) y pasa por plan.
- Licencias del árbol (#9, TASK-1): en producción, todo MIT/Apache-2.0/BSD/ISC salvo `@protobuf-ts/runtime`
  (Apache-2.0 AND BSD-3-Clause); en desarrollo además BlueOak-1.0.0, MIT-0, CC-BY-4.0, CC0-1.0 y MPL-2.0
  (`lightningcss`, herramienta de build, no entra al bundle).

**Procedimiento ante un aviso:**

- El job `app` falla solo con *high*/*critical* de **producción** (`npm audit --omit=dev --audit-level=high`), además
  de firmas inválidas (`npm audit signatures`). Ojo: en el árbol de producción del lock quedan también `typescript`,
  `gql.tada`, `@0no-co/graphqlsp`, `@0no-co/graphql.web`, `graphql`, `chalk` y `commander` (los arrastra el peer de
  `gql.tada`, dependencia de `@mysten/sui`): un *high* en cualquiera de ellos pone `app` en rojo aunque no lleguen al
  navegador.
- Salida: PR de actualización. Si el arreglo tiene menos de 7 días, `min-release-age-exclude` **temporal** solo para
  ese paquete, con un issue que lo retire (LIM-10). Un `EBADENGINE` transitivo es STOP: nunca `--force`,
  `--legacy-peer-deps` ni quitar `ignore-scripts`.
- Aceptados: los 11 *moderate* solo de desarrollo (`minimatch` < 11.0.1 vía eslint), hasta **#35**. El `npm audit`
  completo no es paso bloqueante de la CI.

## Pendientes conocidos

- El build de testnet pesa ≈ 917 kB (≈ 277 kB gzip; desde #11 entra el SDK de transacciones, desde #13 "Mis
  partidas" y desde #14 el panel de la House) y Vite avisa de un chunk mayor de 500 kB: el code-splitting queda para #58
  (issue aparte, P-3 de #15).
- Panel de la House en testnet con la wallet del owner (cap en la wallet, comisión, límites, retiro): checklist en el
  body de #17 (P-4, D-20261104-02 (4)).
- `done` espera la relectura del lobby y de "Mis partidas" si están montados (DL-6, DL-7): con una red lenta o con
  muchas páginas cargadas, "Actualizando datos…" puede durar varios segundos (RM-12, H-4). Se mide en los smokes de
  #11, #12 y #13 (localnet) y en testnet en #17.
- El cambio de cuenta a mitad de una transacción (DL-11 de #13) y el historial podado de "Mis partidas" ("desde
  <fecha>", el caso del creador) se verifican con una wallet de extensión en testnet en #17.
- Lo que no prueba el smoke de localnet (una wallet de extensión real y su texto de error, R-1 de #11; su vista previa de
  aceptar; la latencia de testnet) queda para el owner en #17.
- `runtimeCancellation` lee el error estructurado; con digest, la app lo toma de la confirmación del nodo. Solo una
  wallet que rechazara **sin** digest ante una cancelación caería en "La wallet no completó…" (no observado; se verifica
  en #17). R-3: la `description` real de la falta de aleatoriedad no se observó en localnet.
