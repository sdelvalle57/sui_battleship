# PLAN_RAILWAY_DEPLOY v1.1
> Issue: #15 (+ #8, #9, #14, #16, #17) | Áreas: app / ci / docs | Fecha: 2026-11-04
> Branch: `feature/issue-15-pages-deploy` (desde `master` `deaadbb`; el nombre quedó de la elección inicial de GitHub
> Pages). **Orden:** esta branch recibe `master` después del merge de #14, que trae D-20261104-01 y -02. Si #15
> tuviera que mergear antes, se traen a la branch los commits `2e0141a` y `a06ceba` de #14.
> Decisiones de partida:
> - D-20261104-01: (1) delegación de STOPs de producto; (2) hosting en **Railway**, cambio del owner sobre GitHub Pages
>   el mismo día. Está en la branch de #14.
> - D-20261102-02: una red por build y cadena de suministro.
> - D-20261030-13: CI y Actions por SHA.
> - D-20261102-04 y D-20261103-03: ventana del fullnode.
>
> Las decisiones nuevas de este plan se registran como **D-20261104-03** (o el siguiente ID libre al commitear).

## Changelog

**v1.1 (2026-11-04).** Responde a la revisión del MAYOR del plan v1: REQUEST CHANGES, 2 MAJOR, 6 MINOR y 7 sugerencias.

| Hallazgo | Resolución | Dónde |
|---|---|---|
| MAJOR-1: con el `publish.mjs` de PR #48, `check` exige `.nvmrc` y el Dockerfile lo copiaba después | **Resuelto.** `.nvmrc` se copia **antes** del `check`. Volví a verificar `check` contra PR #48: `main()` corre `checkNodeVersion` primero (`publish.mjs:819-821` de esa branch), lee solo `deployments/*.json` y `Published.toml` (`:798-810`) e importa solo `./deployment.mjs` y módulos de Node. El ensayo E-3 prueba que la imagen llega al `check` con `.nvmrc` | §1, DL-3, TASK-2 (modelo), TASK-2 E-3 |
| MAJOR-2: el Dockerfile real y el camino positivo no se ejecutaban antes de #8 | **Resuelto.** Nuevo **ensayo del camino positivo** (TASK-2, E-1..E-6): contexto copiado en `<scratchpad>` con un `testnet.json` y un `Published.toml` **sintéticos**, coherentes entre sí y nunca en el repo, y el `publish.mjs` de PR #48. Corre la imagen real, que tiene que dar `id -u` = 65534 (nobody). Tomé también lo opcional: el camino positivo y el negativo viven en un script versionado (`app/scripts/check-deploy-image.sh`) que corren **igual** la CI y el ensayo | DL-7, DL-13, TASK-2, TASK-4 |
| MINOR-1: Node 26.13.0 cumple los 7 días recién el 2026-11-04T16:57Z | **Resuelto.** Criterio exacto: 7×24 h desde el `published_at` de la versión, medidas al commitear el Dockerfile. TASK-2 se implementa antes de esa hora, así que usa **`node:26.12.1-bookworm-slim`** (Node v26.12.1, 2026-10-21) y lo declara. TASK-6 (después de #8, cuando 26.13.0 ya cumple) sube a 26.13.0, la versión de local y de la CI | DL-8, TASK-2, TASK-6 |
| MINOR-2: el `setcap cap_net_bind_service=+ep` de la imagen de Caddy impide arrancar sin esa capability | **Resuelto.** `RUN setcap -r /usr/bin/caddy` antes de `USER nobody` (con `PORT` ≥ 1024 no hace falta). El script de chequeo corre el contenedor con `--cap-drop=ALL` | DL-10, TASK-2, R-1 |
| MINOR-3: el `docker stop` con `if: always()` ponía rojo el camino negativo | **Resuelto.** Ya no hay step de stop: el script limpia con `trap … docker rm -f … \|\| true`, y en el camino negativo no hay contenedor | TASK-4, DL-13 |
| MINOR-4: la CI no comprobaba todas las cabeceras | **Resuelto.** El script compara la CSP servida con la del `app/Caddyfile`, comprueba las 6 cabeceras de §4.3 con valor exacto y las **ausencias** de `Cross-Origin-Opener-Policy` y `Server`. También el 404 de un asset sin `immutable` | DL-13 |
| MINOR-5: faltaba la tabla de criterios del issue | **Resuelto.** Nueva §2, con la reinterpretación de "solo si la CI pasó" como *Wait for CI* | §2 |
| MINOR-6: choque de IDs de decisión y dependencia de D-20261104-01 | **Resuelto.** Este plan registra **D-20261104-03**; el orden con #14 está en la cabecera | cabecera, TASK-5 |
| Sug. 1: R-4 con la cita oficial | **Tomada.** R-4 se reescribe con la doc oficial | §11 |
| Sug. 2: `--progress=plain` | **Tomada**, con una condición: el script lo pasa solo si existe `docker buildx`. El builder clásico de esta máquina no lo admite y ya imprime en plano | DL-13 |
| Sug. 3: watch paths con negaciones y preautorización | **Tomada.** Lista acotada con negaciones al estilo gitignore. La doc dice "gitignore-style" pero no documenta `!` explícitamente: si Railway lo ignorara, el efecto sería un redeploy con un `dist` idéntico. La preautorización entra en N-2 y en el checklist | §6 (N-2), §9 |
| Sug. 4: `immutable` también en un 404 de `/assets/*` | **Tomada.** El matcher `@assets` suma `file`, así que solo aplica si el archivo existe; el script lo comprueba | §4.3, modelo |
| Sug. 5: ícono remoto de Slush | **Tomada.** El remedio queda definido: agregar ese origen **solo** a `img-src`, como desviación declarada. Se mide en E-6 y en TASK-6 | §4.3, TASK-2 E-6, TASK-6 |
| Sug. 6: no reescribir las filas históricas de STATUS | **Tomada.** Se anotan con "→ #N", no se reescriben | TASK-5 |
| Sug. 7: quién redacta el issue de code-splitting | **Tomada.** Lo redacta el MAYOR y lo crea el orquestador | P-3, TASK-5 |

## Historia de usuario

**Como** jugador con una wallet de Sui en testnet, **quiero** abrir una URL pública y jugar (ver el lobby y el
indicador de red, conectar la wallet, crear y aceptar partidas) sin clonar el repo, **para** probar el juego desde
cualquier navegador.
**Como** owner, **quiero** que el repo deje lista la configuración de Railway (imagen, servidor, cabeceras y chequeo en
CI), **para** conectar el servicio y publicar en minutos cuando vuelva y exista `contracts/deployments/testnet.json` (#8).

**Scope en una frase:** el repo construye una imagen que sirve el build estático de testnet con un servidor de
producción y cabeceras de seguridad, se niega a construirse sin el `testnet.json` de #8, y la CI y un ensayo local
prueban los dos caminos.
**Lo que NO entrega:** crear el proyecto en Railway, conectarlo, configurar el dominio ni publicar (owner, checklist
de §9); la publicación del paquete (#8); el README raíz con la URL (#16); el smoke end-to-end con apuestas reales
(#17); dominio propio, mainnet y analítica (fuera de alcance del issue); code-splitting del bundle (recomendado aparte,
P-3).

## 1. Contexto y alcance

### Lo que ya existe (verificado en `deaadbb`, y `publish.mjs` también contra PR #48)

- **Sitio estático sin backend** (`agents.md` §4). `npm run build -w app` deja `app/dist/` con `index.html`, un JS y un
  CSS. El `index.html` del build no tiene scripts inline (`<script type="module" src="/assets/index-*.js">`).
- **Router por hash:** `app/src/App.tsx:41` usa `createHashRouter`, y su comentario (`App.tsx:43-47`) ya anticipa el
  hosting estático. **No hace falta fallback a `index.html` ni reescrituras.**
- **`base` de Vite:** `app/vite.config.ts` no lo declara, así que vale `/`, que es lo correcto para Railway (sirve en
  la raíz del dominio). **No cambia nada en `vite.config.ts`.**
- **Red e IDs:** `app/src/sui/config.ts:150-155` (`loadConfig`) lee `VITE_SUI_NETWORK` y
  `import.meta.glob('../../../contracts/deployments/*.json', { eager: true, import: 'default' })`. El glob se resuelve
  **al compilar**. Sin `testnet.json`, un build de testnet **compila** y muestra "La app no está configurada"
  (`config.ts:97-101`). Ese build no debe publicarse jamás.
- **Riesgo conocido del glob** (`app/README.md`, "Origen del build publicado"): un `localnet.json` presente en la
  máquina entra en **cualquier** build hecho ahí.
- **Validador de despliegues (`check`):**
  - En `master` (`publish.mjs:536-584, 774-784`) valida cada `deployments/<red>.json` y su coherencia con
    `Published.toml`. Con 0 archivos imprime "0 despliegues" y sale con 0: por sí solo **no** detecta que falte
    `testnet.json`.
  - **En PR #48 (#8), que es la versión que habrá en `master` cuando corra el camino positivo:** `main()` llama
    primero a `checkNodeVersion` con `.nvmrc` (`publish.mjs:819-821` de `origin/feature/issue-8-testnet-publish`).
    Sin `.nvmrc` falla con `.nvmrc sin versión válida`, en **todos** los subcomandos.
  - `commandCheck` (`:798-810`) lee solo `contracts/deployments/*.json` y `contracts/Published.toml`, y el script
    importa solo `./deployment.mjs` y módulos de Node.
  - La coherencia compara `packageId`/`published-at`, `originalPackageId`/`original-id`, `packageVersion`/`version`,
    `upgradeCapId`/`upgrade-capability` y `chainId`/`chain-id` (`deployment.mjs:341-361`). Testnet exige el chain id
    `4c78adac` (`deployment.mjs:6, 207`).
- **CI:** `.github/workflows/ci.yml` con los jobs `contracts` y `app` (requeridos), más `framework-drift`
  (informativo). Permisos `contents: read`. `actions/checkout` está fijada por SHA
  (`3d3c42e5aac5ba805825da76410c181273ba90b1`, v7.0.1, verificado con `gh api`).
- **Settings leídos (solo lectura con `gh api`):** `allowed_actions: all`, `sha_pinning_required: true`,
  `default_workflow_permissions: read`, sin environments.
- **Favicon:** la app no declara ninguno. El 404 de `/favicon.ico` se vio en los smokes de #9 y quedó derivado a #15.
- **Bundle de testnet** (medido con `--sourcemap`, Node `v26.13.0`): `index-*.js` 901,49 kB (273,65 kB gzip), aviso de
  chunk > 500 kB. El detalle está en P-3.

### Hechos de Railway (docs oficiales, 2026-11-04; el MAYOR los verificó textualmente)

1. *"New services cannot opt into Config as Code."* y *"Existing Config as Code files stop being read on 2026-12-01
   (hard cutoff)."* (`docs.railway.com/infrastructure-as-code`). Un `railway.json`/`railway.toml` no le sirve a un
   servicio nuevo.
2. El reemplazo es `.railway/railway.ts` (IaC). Necesita el paquete npm `railway` y `railway config plan/apply`, o la
   Action `railwayapp/config` con `RAILWAY_TOKEN`. No se aplica solo al hacer push.
3. Railway usa el `Dockerfile` (D mayúscula) de la raíz; en el log aparece "Using detected Dockerfile!". Una ruta
   distinta exige `RAILWAY_DOCKERFILE_PATH`. Las variables de servicio entran al build **solo** con `ARG`.
4. Railway inyecta `PORT` y el healthcheck lo usa. El healthcheck llega desde `healthcheck.railway.app`, tiene 300 s
   por defecto y corre solo durante el deploy.
5. *Wait for CI* (`docs.railway.com/guides/github-autodeploys`):
   - *"new deployments sit in a `WAITING` state until every GitHub Actions check suite on the commit has finished"*;
   - *"Railway looks at the conclusion of each workflow run, not at individual jobs"*;
   - *"Checks from other GitHub apps are ignored"*;
   - un workflow que falla salta el deploy; uno *skipped* o *neutral* no bloquea;
   - después de 2 h sin terminar, el deploy se salta;
   - el workflow tiene que correr en `push`.
6. Las watch paths son *"gitignore-style patterns"* (`docs.railway.com/deployments/monorepo`). La negación con `!` no
   está documentada explícitamente.

### Alcance

- Imagen Docker multi-etapa en la raíz (build de testnet + Caddy).
- `.dockerignore` en lista blanca.
- `app/Caddyfile` con cabeceras y CSP.
- Favicon.
- Script de chequeo de la imagen, compartido por la CI y el ensayo local.
- Job de CI que construye la imagen.
- Verificación local con Docker y Chrome headless.
- Docs y checklist del owner.

**Fuera de alcance:** activar o configurar Railway (owner); deploy desde la CI; `.railway/railway.ts` (P-1);
code-splitting (P-3); dominio propio; mainnet.

## 2. Criterios de aceptación del issue → task y evidencia (MINOR-5)

| # | Criterio de #15 | Cómo se cumple con Railway | Task | Evidencia | PR |
|---|---|---|---|---|---|
| 1 | "Workflow de deploy … al hacer push a `master`, solo si los jobs de CI pasaron" | **Reinterpretado:** el deploy lo dispara Railway (autodeploy de `master`, no un workflow de GitHub). "Solo si la CI pasó" lo da **Wait for CI**: Railway espera todas las check suites de Actions del commit y salta el deploy si un workflow falla (§1, hecho 5). La CI aporta el job `deploy-image`, así que una imagen rota también frena el deploy | TASK-4; owner §9 pasos 3 y 8 | Run de la CI con `deploy-image`; en Railway, un deploy que pasa por `WAITING` y después `SUCCESS` | #15 (CI); TASK-6 (deploy) |
| 2 | Recargar una ruta profunda funciona | Router por hash (ya existe) y el servidor entrega `/` | TASK-3, TASK-6 | Recarga de `#/game/<id>` y `#/my-games` (localnet; después en la URL pública) | #15 y TASK-6 |
| 3 | Base path correcta para el proveedor | `base` = `/` (DL-5): Railway sirve en la raíz | TASK-2 | `index.html` referencia `/assets/…` y el asset responde 200 en el script | #15 |
| 4 | El build sin secretos; si hay token, es un secret que carga el owner | Sin `ARG`, contexto en lista blanca, sin variables (DL-4, DL-6). **No hace falta ningún token:** Railway usa su GitHub App | TASK-2 | Listado del contexto (E-1), grep del `dist`, Dockerfile sin `ARG` | #15 |
| 5 | Permisos mínimos del workflow de deploy | No hay workflow de deploy. `deploy-image` hereda `contents: read`, sin secretos ni Actions nuevas. La GitHub App de Railway se instala solo en este repo (§9, paso 2) | TASK-4; owner | Diff de `ci.yml` y actionlint | #15 |
| 6 | URL documentada en `app/README.md` (y en el README raíz vía #16); `agents.md` §12 actualizado | La descripción del deploy va en #15; la URL, cuando exista | TASK-5, TASK-6 | Diffs de los docs | #15 y TASK-6 |
| 7 | Smoke: abrir la URL, conectar la wallet, ver el lobby y el indicador de red, recargar una ruta profunda | Smoke B, con la wallet de extensión del owner | TASK-6; owner | `SMOKE_RAILWAY_DEPLOY.md`, parte B | TASK-6 |

## 3. Contrato on-chain

**Sin cambios.** #15 solo **lee** `contracts/deployments/testnet.json` y `contracts/Published.toml`, sin escribirlos ni
generarlos. No toca `contracts/sources/`, `Move.lock` ni `app/src/sui/`.

## 4. Diseño

### 4.1 Archivos nuevos o tocados

| Archivo | Rol |
|---|---|
| `Dockerfile` (raíz) | Multi-etapa: (1) `build` en `node:26.12.1-bookworm-slim` (DL-8) con la guarda de `testnet.json`, `.nvmrc` + `publish.mjs check`, `npm ci`, el build de testnet y las comprobaciones del bundle; (2) runtime `caddy:2.11.7-alpine`, sin `setcap`, como `nobody` |
| `.dockerignore` (raíz) | Lista blanca (DL-4) |
| `app/Caddyfile` | Servidor: `:{$PORT}`, `file_server`, compresión, cabeceras y CSP, caché por tipo, admin y HTTPS automático apagados |
| `app/scripts/check-deploy-image.sh` | Chequeo de la imagen, camino negativo o positivo según el contexto (DL-13). Lo usan la CI y el ensayo local |
| `app/public/favicon.svg`, `app/index.html` | Favicon (P-4) |
| `.github/workflows/ci.yml` | Job `deploy-image` (TASK-4) |
| Docs | `app/README.md`, `agents.md` (§2, §3, §12), `documents/STATUS.md`, `documents/DECISIONES.md` (D-20261104-03) |

### 4.2 Decisiones de diseño internas (DL; las revisa el MAYOR)

- **DL-1, builder = Dockerfile.** Railpack no se reproduce en local sin instalar su CLI y BuildKit. Con él, la guarda y
  las cabeceras quedarían en settings del dashboard (sin `railway.json` para servicios nuevos), y falta confirmar que
  soporte Node 26 con workspaces. Nixpacks está deprecado. Un Dockerfile en la raíz se detecta solo, se verifica en
  local y en la CI, y deja todo en el repo.
- **DL-2, servidor = Caddy** (imagen oficial, Apache-2.0):

  | Opción | Producción | `$PORT` | Cabeceras/CSP | Runtime | Mantenimiento propio |
  |---|---|---|---|---|---|
  | **Caddy** (elegida) | sí | nativo (`{$PORT}`) | `header`; `encode zstd gzip` | ≈ 50 MB, sin Node | un Caddyfile de ~30 líneas |
  | nginx oficial | sí | plantilla `envsubst` | `add_header` (no se hereda entre bloques) | ≈ 50 MB | config más verbosa |
  | Servidor Node propio | depende de nosotros | trivial | trivial | ≈ 200 MB | MIME, path traversal, compresión (LIM, SEG) |
  | `vite preview` | **no** (lo dice la doc de Vite) | `--port` | `preview.headers` | ≈ 400 MB con `node_modules` de desarrollo | `preview.allowedHosts` para el dominio y el host del healthcheck |
  | busybox `httpd` | limitado | `-p` | sin cabeceras arbitrarias | mínimo | — |

  **Sin dependencias nuevas en `package.json`.** Las imágenes base se justifican como pide SEG-8: oficiales, con
  mantenimiento activo, licencias MIT y Apache-2.0, fijadas por digest (DL-8).
- **DL-3, guarda de #8 en el build:**
  1. **`COPY .nvmrc ./` junto con `contracts/`, antes de cualquier `RUN`** (MAJOR-1).
  2. Primer `RUN`: falla en segundos, antes de `npm ci`, con
     `ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicación del owner en testnet;
     sin él no se construye la app (nunca IDs a mano).`
  3. `node contracts/scripts/publish.mjs check`: guarda de Node con `.nvmrc`, esquema y coherencia con
     `Published.toml`.
  4. Después del build: (a) `packageId`, `originalPackageId`, `houseId` y `publishTxDigest` aparecen en
     `app/dist/assets/`; (b) no hay `network:"localnet"`; (c) el origen del fullnode de testnet está en el bundle y en
     el `connect-src` del Caddyfile.
  - Si algo falla, no hay imagen y Railway no despliega: **nunca se publica una app rota ni con IDs inventados.**
- **DL-4, `.dockerignore` en lista blanca:**
  - Empieza con `*` y vuelve a incluir `!package.json`, `!package-lock.json`, `!.npmrc`, `!.nvmrc`, `!app/`,
    `!contracts/scripts/publish.mjs`, `!contracts/scripts/deployment.mjs`, `!contracts/Published.toml` y
    `!contracts/deployments/testnet.json`.
  - Al final se excluyen de nuevo `app/node_modules`, `app/dist`, `app/.env*` y `app/scripts`, que no hacen falta para
    el build.
  - `localnet.json` no puede entrar.
- **DL-5, `base` = `/`** (el default) con router por hash. Una ruta sin hash da 404; no hay fallback SPA a propósito
  (un `/assets/x.js` faltante no debe responder `index.html`).
- **DL-6, red fija en la imagen y sin variables:** `ENV VITE_SUI_NETWORK=testnet` en la etapa `build` y **ningún
  `ARG`**. En runtime Caddy lee solo `PORT`. El owner no configura variables. Sin secretos.
- **DL-7, CI = job `deploy-image`, no requerido.** Corre `bash app/scripts/check-deploy-image.sh . 8080` (DL-13) con
  `docker` del runner, **sin Actions nuevas**. Como Railway espera las check suites, una imagen rota frena el deploy.
- **DL-8, imágenes fijadas por digest.**
  - **Criterio:** la **versión** tiene ≥ 7×24 h desde su `published_at` (`gh api repos/<org>/<repo>/releases`), medidas
    al commitear el Dockerfile. Se fija el digest del índice multi-arquitectura.
  - Las reconstrucciones de docker-library (parches de la imagen base, Dockerfiles públicos) no reinician el plazo.
  - Digests leídos de Docker Hub el 2026-11-04; el DEV los vuelve a verificar:

  | Imagen | Versión publicada | ¿Cumple al implementar TASK-2 (2026-11-04, antes de las 16:57Z)? | Digest (índice) |
  |---|---|---|---|
  | `node:26.12.1-bookworm-slim` | Node v26.12.1, 2026-10-21T10:38Z | **sí** (14 días) | `sha256:88e480776c6149ff1d098cd304f44bf18057fb5d284a3329b78162d29821e28c` |
  | `caddy:2.11.7-alpine` | Caddy v2.11.7, 2026-10-03 | sí (v2.11.8, del 2026-11-04T01:16Z, no) | `sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5` |
  | `node:26.13.0-bookworm-slim` (TASK-6) | Node v26.13.0, 2026-10-28T16:57Z | desde el **2026-11-04T16:57Z** | `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9` |

  - **26.12.1 frente a 26.13.0 de local y la CI:** es el mismo major, que es lo que exigen `.nvmrc` (26), `engines`
    (`>=26 <27`) y la guarda de `publish.mjs`. El gate de la app no cambia, porque corre en el host y en la CI con
    26.13.0. Es una desviación temporal y declarada; TASK-6 la cierra.
- **DL-9, Dockerfile compatible con el builder clásico.** Esta máquina no tiene `docker buildx` (Docker 29.1.3). Por
  eso no se usan `RUN --mount`, heredocs, `COPY --chmod` ni `# syntax=`.
- **DL-10, Caddy sin privilegios:**
  - `admin off`, `persist_config off`, `auto_https off`, sin log de acceso;
  - **`RUN setcap -r /usr/bin/caddy`** (MINOR-2): la imagen oficial trae `cap_net_bind_service=+ep`, y con el bit
    *effective* el `execve` falla si el runtime quita esa capability. Con `PORT` ≥ 1024 no hace falta;
  - `USER nobody`;
  - si Caddy necesita escribir en `XDG_*`, se apunta a `/tmp` y se declara.
- **DL-11, sin COOP.** El wallet web de Slush abre un popup (`about:blank` → `my.slush.app`) y exige `window.opener`
  (`@mysten/window-wallet-core`, `dapp-post-message-channel.mjs:21`, `wallet-post-message-channel.mjs:10,42`). El
  script comprueba que **no** haya COOP.
- **DL-12, sin Actions nuevas.** El job nuevo usa `actions/checkout` ya fijada.
- **DL-13, `app/scripts/check-deploy-image.sh <contexto> <puerto>`** (bash con `set -euo pipefail`; solo `docker`,
  `curl`, `grep` y `sed`):
  - **Modo:** positivo si existe `<contexto>/contracts/deployments/testnet.json`, negativo si no.
  - **`docker build`:** con `--progress=plain` solo si `docker buildx version` funciona. Etiqueta
    `battleship-app:check-<pid>`; contenedor `deploy-image-<pid>`.
  - **Limpieza:** `trap` que hace `docker rm -f` y `docker rmi` con `|| true`, sin steps aparte (MINOR-3).
  - **Negativo:** el build **debe** fallar y el log (en un archivo temporal fuera del contexto) **debe** contener
    `falta contracts/deployments/testnet.json`. En GitHub Actions emite `::notice::`.
  - **Positivo:**
    - Build verde. `docker run -d --cap-drop=ALL -e PORT=<puerto> -p 127.0.0.1:<puerto>:<puerto>` y espera ≤ 30 s a
      `/` 200.
    - `docker exec … id -u` = `65534`.
    - **`/`:** 200; `Content-Security-Policy` **idéntica** a la del `app/Caddyfile` del contexto (extraída con `sed`)
      y con `script-src 'self'` y `frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`;
      `X-Frame-Options: DENY`; `Referrer-Policy: no-referrer`;
      `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`;
      `Strict-Transport-Security: max-age=31536000`; `Cache-Control: no-cache`. **Sin** `Cross-Origin-Opener-Policy`
      y **sin** `Server`.
    - **El asset JS de `index.html`:** 200, `text/javascript`, `immutable`, y `Content-Encoding` zstd o gzip con
      `Accept-Encoding`.
    - **`/favicon.svg`:** 200 `image/svg+xml`.
    - **404:** `/no-existe`, `/game/0x1` y `/assets/no-existe.js`, este último **sin** `immutable`.
  - Termina con 0 solo si pasa todo. Cada fallo imprime qué cabecera o ruta falló.

### 4.3 Cabeceras y CSP propuestas (P-2)

Se derivan del bundle: sin `eval`/`new Function` y sin `WebAssembly`; Lit usa `adoptedStyleSheets`. Los orígenes
externos que hay en el JS son:
- `https://fullnode.testnet.sui.io`;
- `https://api.slush.app/api/wallet/metadata`: el `fetch` que hace `registerSlushWallet` al arrancar
  (`@mysten/slush-wallet/dist/wallet/index.mjs:13,234`);
- `https://my.slush.app`: la navegación del popup, que la CSP no gobierna;
- los endpoints MVR: solo se usan con nombres `@org/pkg`, y la app usa IDs `0x`. Se mide que no haya pedidos.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
  font-src 'self'; connect-src 'self' https://fullnode.testnet.sui.io https://api.slush.app; frame-src 'none';
  worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000
Cache-Control: public, max-age=31536000, immutable   (solo /assets/* que existan: matcher `file`)
Cache-Control: no-cache                              (/ y /index.html)
```

- `img-src data:`: los íconos de wallet-standard son `data:` por tipo. **Ícono remoto de Slush (sugerencia 5):**
  `updateMetadata` reemplaza el ícono con el que llega de `api.slush.app`. Si llega como `https://…` y aparece una
  violación de `img-src`, el remedio es agregar **ese origen solo a `img-src`**, como desviación declarada (E-6,
  TASK-6).
- `style-src 'self'` sin `'unsafe-inline'` se mide (TASK-3). Si aparece una violación real, se agrega `'unsafe-inline'`
  solo a `style-src` y se declara.
- `frame-ancestors` solo funciona por cabecera, no por `<meta>`: protege contra clickjacking.
- **Fallback** (P-2): si una wallet de extensión real no puede inyectarse, **solo** la CSP pasa a
  `Content-Security-Policy-Report-Only` y se abre un issue.

## 5. Flujo de fondos

No aplica. El sitio sirve archivos estáticos; las lecturas van del navegador al fullnode y la wallet del usuario firma
(SEG-9).

## 6. Decisiones abiertas → STOP

### STOPs delegables (producto; el orquestador aplica la recomendada por D-20261104-01 y la registra en D-20261104-03)

**P-1. Configuración de Railway en el repo** (§1, hechos 1-2).
- (a) **`Dockerfile` en la raíz**, más los settings del servicio en el checklist del owner. Sin archivo de config de
  Railway. Cero dependencias nuevas.
- (b) Lo de (a) más `.railway/railway.ts`: suma el paquete npm `railway`, `plan/apply` por CLI y un token si se
  automatiza (claves: no delegable).
- (c) Un `railway.json`: un servicio nuevo no lo lee (LIM-3).
- **Recomendación: (a).**

**P-2. Cabeceras y CSP** (hoy el sitio no tiene ninguna; cualquier opción mejora).
- (a) **Las de §4.3, aplicadas**, verificadas en headless (TASK-3, E-6, TASK-6), con el smoke del owner con su wallet de
  extensión como compuerta. Si falla, fallback a `Report-Only` solo para la CSP.
- (b) La CSP en `Report-Only` hasta #17.
- (c) Sin CSP.
- **Recomendación: (a).** El bundle no necesita excepciones (medido). Las wallets MV3 de Chrome inyectan fuera de la
  CSP de la página. El fallback cuesta una línea.

**P-3. Code-splitting.** Bytes por paquete, medidos con el sourcemap (848 de 901 kB atribuidos):

| Paquete | kB min | Paquete | kB min |
|---|---|---|---|
| `@mysten/sui` | 223,6 | `@protobuf-ts/runtime` | 30,7 |
| `react-dom` | 202,4 | `@mysten/dapp-kit-core` | 26,1 |
| `react-router` | 92,1 | `@noble/curves` + `@noble/hashes` | 40,9 |
| código de la app (`app/src`) | 67,5 | `@mysten/bcs` | 12,4 |
| `@tanstack/query-core` | 33,0 | resto (Lit, floating-ui, valibot…) | ≈ 119 |

La portada ya necesita casi todo: el kit y el badge en el encabezado, el lobby con BCS y "Crear partida" con
`Transaction`. Separar vendors quita el aviso y mejora la caché entre deploys, pero no baja la primera carga
(≈ 274 kB gzip).
- (a) Separar vendors en #15.
- (b) **Issue aparte post-MVP:** lo redacta el MAYOR y lo crea el orquestador (sugerencia 7). Las notas de
  README/STATUS que lo asignaban a #15 se anotan con "→ #N".
- (c) Subir `chunkSizeWarningLimit`.
- **Recomendación: (b).**

**P-4. Favicon.**
- (a) **SVG propio y simple** (un blanco o diana con formas básicas, sin texto ni emoji y sin licencias de terceros).
- (b) Un emoji dentro de un SVG.
- (c) Ninguno.
- **Recomendación: (a).**

**P-5. Cuándo mergear y cerrar #15.**
- (a) **Antes de #8, con `Refs #15`.** TASK-6, después de #8, cierra con `Closes #15`.
- (b) Dejar el PR abierto hasta #8.
- **Recomendación: (a).** Con el ensayo de MAJOR-2, el camino positivo ya queda probado antes de #8.

### STOPs NO delegables (owner)

- **N-1, Railway:**
  - cuenta, proyecto y servicio;
  - instalar la GitHub App de Railway en el repo (integración = setting del repo);
  - rama `master`, Wait for CI, entornos de PR, healthcheck, watch paths y dominio;
  - plan, región y sleep.
  - Pasos en §9.
- **N-2, publicar el sitio:** el primer deploy y cada uno después.
  - Con el servicio conectado, **un merge a `master` que toque las watch paths publica el sitio**.
  - Al conectar, el owner deja registrado si los merges con CI verde quedan **preautorizados** como publicación
    (sugerencia 3). Si no, el orquestador consulta antes de cada merge que toque las watch paths.
- **N-3, #8:** publicar el paquete y mergear `testnet.json` + `Published.toml`.
- **N-4, protección de `master`:** si `deploy-image` pasa a ser check requerido después de #8 (opcional;
  recomendado sí).
- **N-5, rollback del sitio en Railway.**

## 7. Tasks (ordenados por dependencia)

**Gate de cada task con código:** el del job `app` (`agents.md` §3), con output pegado. `contracts` no cambia.

**Reglas de verificación local (todas las tasks):**
- nada contra testnet con claves; las lecturas públicas sí;
- sobre `~/.sui/`, solo `stat`/`ls`;
- Chrome headless con `--user-data-dir` propio en `<scratchpad>`, `HOME`/`XDG_*` aislados, depuración solo en
  `127.0.0.1`, y cierre **solo por su PID** (el Chrome del usuario puede estar abierto);
- contenedores por su nombre o ID, nunca `docker stop $(docker ps -q)`;
- las imágenes base públicas que se descarguen se declaran, y se borran al final si no estaban;
- sin rutas personales en lo que se pegue (`<repo>`, `<scratchpad>`);
- el worktree de #8 está congelado: lo de #8 se lee solo con `git show origin/feature/issue-8-testnet-publish:<ruta>`.

### TASK-1: favicon — área: app
- **Entregable:** `app/public/favicon.svg` (P-4) y `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` en
  `app/index.html`. **No tocar:** `app/vite.config.ts` ni `app/src/`.
- **DoD:**
  - gate `app` verde, sin delta;
  - `app/dist/favicon.svg` existe y está enlazado;
  - en `vite preview` (Chrome headless): `/favicon.svg` 200 `image/svg+xml` y ningún pedido a `/favicon.ico`.

### TASK-2: imagen de Railway + script de chequeo + ensayo de los dos caminos — área: app/ci
- **Entregable:** `Dockerfile`, `.dockerignore`, `app/Caddyfile` y `app/scripts/check-deploy-image.sh` (DL-1..DL-13,
  §4.3).
- **Modelo (el DEV lo ajusta y declara cada desviación):**

  ```dockerfile
  # Imagen de la app para Railway (#15): build estático de testnet + Caddy. Contexto acotado por .dockerignore.
  # Sin --mount, heredocs ni "# syntax=": sirve con BuildKit (Railway, CI) y con el builder clásico (DL-9).
  # Node 26.12.1 por la regla de 7 días (DL-8); TASK-6 sube a 26.13.0.
  FROM node:26.12.1-bookworm-slim@sha256:88e480776c6149ff1d098cd304f44bf18057fb5d284a3329b78162d29821e28c AS build
  WORKDIR /repo
  # .nvmrc antes del check: la guarda de Node de publish.mjs (#8) lo exige en todos los subcomandos (MAJOR-1).
  COPY .nvmrc ./
  COPY contracts/ contracts/
  RUN test -f contracts/deployments/testnet.json || { echo "ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicación del owner en testnet; sin él no se construye la app (nunca IDs a mano)." >&2; exit 1; }
  RUN node contracts/scripts/publish.mjs check
  COPY package.json package-lock.json .npmrc ./
  COPY app/package.json app/
  RUN npm ci
  COPY app/ app/
  ENV VITE_SUI_NETWORK=testnet
  RUN npm run build -w app
  RUN set -eu; \
      for f in packageId originalPackageId houseId publishTxDigest; do \
        v="$(node -p "require('./contracts/deployments/testnet.json').$f")"; \
        grep -rqF "$v" app/dist/assets || { echo "ERROR (#15): $f de testnet.json no está en el bundle" >&2; exit 1; }; \
      done; \
      if grep -rqE 'network:"localnet"|"network":"localnet"' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \
      grep -rqF 'https://fullnode.testnet.sui.io' app/dist/assets

  FROM caddy:2.11.7-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5
  COPY app/Caddyfile /etc/caddy/Caddyfile
  COPY --from=build /repo/app/dist /srv
  # Sin cap_net_bind_service (MINOR-2): PORT >= 1024; así arranca también con --cap-drop=ALL.
  RUN setcap -r /usr/bin/caddy \
      && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
      && grep -qF 'https://fullnode.testnet.sui.io' /etc/caddy/Caddyfile
  USER nobody
  CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
  ```

  ```caddyfile
  {
  	admin off
  	persist_config off
  	auto_https off
  }

  # Railway inyecta PORT y termina TLS en su borde; 8080 es solo el default local.
  :{$PORT:8080} {
  	root * /srv
  	encode zstd gzip
  	header {
  		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://fullnode.testnet.sui.io https://api.slush.app; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  		X-Content-Type-Options "nosniff"
  		X-Frame-Options "DENY"
  		Referrer-Policy "no-referrer"
  		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  		Strict-Transport-Security "max-age=31536000"
  		-Server
  	}
  	@assets {
  		path /assets/*
  		file
  	}
  	header @assets Cache-Control "public, max-age=31536000, immutable"
  	@entry path / /index.html
  	header @entry Cache-Control "no-cache"
  	file_server
  }
  ```

- **Verificación local** (Docker 29.1.3 ya instalado, sin buildx). Cada paso con output pegado:
  - **V-1, digests:** `docker pull <imagen>@<digest>`, comparar con `.digest` de
    `https://hub.docker.com/v2/repositories/library/<repo>/tags/<tag>` y con el `published_at` de la versión (DL-8).
    Anotar la hora UTC del chequeo.
  - **V-2, shellcheck del script:** con el binario que trae la imagen de actionlint fijada por digest
    (`docker run --rm --entrypoint shellcheck -v <repo>:/repo:ro rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 /repo/app/scripts/check-deploy-image.sh`),
    0 hallazgos. Si esa imagen no trae shellcheck, se declara y se usa `bash -n` más revisión.
  - **V-3, camino negativo sobre el repo real** (sin `testnet.json`): `bash app/scripts/check-deploy-image.sh . 18080`
    sale con 0, en modo negativo, y el log muestra el mensaje de DL-3 en el primer `RUN`, antes de `npm ci`.
  - **Ensayo del camino positivo (MAJOR-2)**, en `<scratchpad>/ensayo-15/` y nunca en el árbol del repo:
    - **E-1, contexto:** `git ls-files -z --cached --others --exclude-standard | xargs -0 cp --parents -t <ctx>`.
      Copia los archivos versionados y los nuevos sin commitear, pero no los ignorados: ni `.env.local`, ni
      `localnet.json`, ni `node_modules`. Sobre esa copia:
      - `git show origin/feature/issue-8-testnet-publish:contracts/scripts/publish.mjs > <ctx>/contracts/scripts/publish.mjs`,
        y lo mismo con `deployment.mjs`: es el script de PR #48;
      - `<ctx>/contracts/deployments/testnet.json` **sintético**, derivado de
        `contracts/scripts/fixtures/localnet.deployment.json` de esa branch con `network: "testnet"` y
        `chainId: "4c78adac"`;
      - `<ctx>/contracts/Published.toml` con `[published.testnet]` **coherente** con ese json: `chain-id`,
        `published-at` = `packageId`, `original-id`, `version` = `packageVersion` y `upgrade-capability` =
        `upgradeCapId`, siguiendo el formato de `fixtures/Published.localnet.toml`;
      - comprobar antes con `node <ctx>/contracts/scripts/publish.mjs check` en el host (Node 26) →
        "1 despliegue(s) válidos…".
      - **Lista del contexto Docker:** un build desechable con `busybox`, que ya está en local
        (`FROM busybox` + `COPY . /ctx` + `RUN find /ctx -type f | sort`), sobre `<ctx>` y sobre el repo con un
        `contracts/deployments/localnet.json` y un `app/.env.local` de prueba con contenido inocuo, que se borran
        después. Esperado: solo la lista blanca.
    - **E-2, positivo literal:** `bash app/scripts/check-deploy-image.sh <ctx> 18080` sale con 0. Esto incluye
      `--cap-drop=ALL`, `id -u` = 65534, todas las cabeceras y ausencias, compresión, favicon y los 404, igual que en
      la CI.
    - **E-3, regresión de MAJOR-1:** sobre `<ctx>`, cambiar `upgrade-capability` en `Published.toml` y correr
      `docker build`. Debe fallar **en el `check`** con `deployments incoherentes` y **no** con
      `.nvmrc sin versión válida`. Restaurar el archivo.
    - **E-4, `PORT` distinto:** con la imagen de E-2, `-e PORT=9123 -p 127.0.0.1:9123:9123`; responde en 9123.
    - **E-5, `caddy validate`** dentro de la imagen sale con 0 (está en el Dockerfile; anotar la línea del log).
    - **E-6 (recomendado), CSP y Slush en Chrome headless contra la imagen de E-2:**
      - La app lee el fullnode **público** de testnet sin claves. Los IDs sintéticos no existen, así que se esperan
        errores de lectura de la House y del lobby: aquí solo se mide la CSP.
      - Badge `testnet · nodo OK` (el chain id es el real).
      - `GET https://api.slush.app/api/wallet/metadata` sin violación de CSP; registrar el status, porque puede dar 403
        a clientes sin navegador.
      - Modal de conexión con "Slush"; ícono `data:` o, si es remoto, la violación de `img-src` y el remedio de §4.3.
      - Al elegir Slush, el popup de `https://my.slush.app` con `window.opener !== null` evaluado por CDP; no se
        inicia sesión y el popup se cierra.
      - Ningún pedido a `*.mvr.mystenlabs.com`.
      - 0 `securitypolicyviolation`, salvo la de un ícono remoto si aparece.
      - Esta imagen no se publica, no se sube a ningún registry y su etiqueta es `battleship-app:ensayo-15`.
    - **Cierre:** `docker rmi battleship-app:ensayo-15` y las de `check-*` si quedaran, `rm -rf <scratchpad>/ensayo-15`
      (comprobar que ya no existe), kill del Chrome por su PID, y `git status` limpio salvo los archivos del task.
- **DoD:** V-1..V-3 y E-1..E-6 con output pegado. Gate `app` sin delta.
- **Riesgos / rollback:** R-1, R-2, R-3. Rollback: borrar los archivos nuevos; nada depende de ellos hasta TASK-4.

### TASK-3: el kit bajo la CSP (localnet aislada, build de producción) — área: app (smoke)
- **Por qué:** E-6 mide la CSP con testnet, pero con IDs que no existen: el lobby y la House no muestran datos. Hace
  falta probar la CSP también con datos reales: kit, estilos de Lit, gRPC-web y rutas profundas.
- **Cómo:**
  - localnet **aislada** de `agents.md` §3 (variante B);
  - `VITE_SUI_NETWORK=localnet npm run build -w app` (producción, sin burner);
  - Caddy en Docker sirviendo ese `dist`, con una **copia** del Caddyfile en `<scratchpad>` que solo cambia
    `connect-src` (fullnode de testnet → `http://127.0.0.1:9000`); el Caddyfile del repo no se toca ni gana variables;
  - Chrome headless con perfil propio.
  - **Pasos:** portada (`localnet · nodo OK`, lobby con una partida creada por CLI), modal de `ConnectButton`,
    `#/my-games` y **recarga** de `#/game/<id>`.
- **Esperado:**
  - 0 `securitypolicyviolation`; si hay alguna, registrar `violatedDirective`;
  - gRPC 200;
  - estilos del kit aplicados (`adoptedStyleSheets.length > 0` en su shadow root);
  - si `style-src 'self'` da violaciones reales: `'unsafe-inline'` solo ahí, como desviación declarada.
- **Límite declarado:** en localnet Slush está desactivado (`app/src/sui/dappKit.ts:15`); lo cubre E-6.
- **Cierre:** paso 7 de `agents.md` §3, contenedor por nombre, `localnet.json` borrado y Chrome por su PID.

### TASK-4: job `deploy-image` en la CI — área: ci
- **Entregable:** un job en `.github/workflows/ci.yml`, para PR y push (hereda la `concurrency`):
  - `runs-on: ubuntu-24.04`, `timeout-minutes: 15`, `shell: bash`;
  - `actions/checkout` con el SHA ya fijado y `persist-credentials: false`;
  - permisos heredados (`contents: read`), sin secretos y sin Actions nuevas;
  - **un solo step:** `bash app/scripts/check-deploy-image.sh . 8080`.
  - No hay step de stop ni de limpieza: lo hace el `trap` del script (MINOR-3).
- **Verificación:**
  - actionlint en un contenedor desechable (`rhysd/actionlint:1.7.12@sha256:b1934ee5…5667`, el repo montado solo
    lectura), 0 hallazgos. Fallback: PyYAML 6.0.3 (`python3 -c 'import yaml; …'`) y revisión manual.
  - En el PR: el run real con `deploy-image` verde **por el camino negativo** (el `::notice::` del script) y
    `contracts`/`app` sin cambios.
  - El camino positivo de la CI es **el mismo script** que el DEV ya corrió en E-2.
  - Opcional: un rojo provocado en un PR desechable (el Dockerfile sin la guarda), cerrado sin merge.

### TASK-5: documentación — área: docs
- **`app/README.md`:** sección **"Despliegue (Railway)"** con:
  - la imagen;
  - la guarda de #8 y sus mensajes;
  - la lista blanca;
  - cabeceras y CSP, con el motivo de cada origen y por qué no hay COOP;
  - el script de chequeo y cómo correrlo en local (`bash app/scripts/check-deploy-image.sh . 18080`);
  - cómo agregar un origen a la CSP (incluido el caso del ícono remoto);
  - el fallback a `Report-Only`;
  - la nota de Node 26.12.1 → 26.13.0 (TASK-6);
  - la URL ("se completa en TASK-6").
  - Además: "Origen del build publicado" pasa a decir que la imagen excluye `localnet.json` por construcción, y
    "Pendientes conocidos" lleva el code-splitting con "→ #N".
- **`agents.md`:**
  - §2 layout: `Dockerfile`, `.dockerignore`, `app/Caddyfile`, `app/public/` y `app/scripts/check-deploy-image.sh`;
  - §3: `deploy-image` (no requerido) y el comando local;
  - §12: "App: Railway (D-20261104-01): imagen del `Dockerfile` raíz; el owner conecta y publica; Wait for CI".
- **`documents/STATUS.md`:**
  - fila del ciclo y baseline de TASK-2/4;
  - pendientes del owner (§9);
  - las filas históricas de build que decían "code-splitting en #15" (`STATUS.md:49,76,82,88`) se **anotan** con
    "→ #N", no se reescriben (sugerencia 6).
- **`documents/DECISIONES.md`:** **D-20261104-03**, con P-1..P-5 como "tomadas por el orquestador por delegación del
  usuario (D-20261104-01)", y el criterio de edad de imágenes de DL-8.
- **Code-splitting (P-3 b):** el MAYOR redacta el issue y el orquestador lo crea; su número reemplaza "#N".
- **DoD:** sin rutas personales; grep de claves limpio; los enlaces existen.

### TASK-6 (después de #8, PR de seguimiento con `Closes #15`): camino positivo real, Node 26.13.0 y URL — área: app/docs
- **Precondición:** `testnet.json` y `Published.toml` de #8 en `master`; la branch de seguimiento recibe `master`.
- **DEV (solo lecturas públicas de testnet, sin claves):**
  - subir el `FROM` de la etapa `build` a `node:26.13.0-bookworm-slim@sha256:bc0a2afd…c1d9`, que ya cumple los 7 días,
    y volver a verificar el digest (V-1);
  - `bash app/scripts/check-deploy-image.sh . 18080` en modo positivo, ahora con los IDs reales;
  - repetir E-6 con la app real: lobby real, `#/my-games`, recarga de una ruta profunda, `api.slush.app`, popup con
    `window.opener`, sin MVR y 0 violaciones (con el remedio de `img-src` si aparece un ícono remoto).
- **Owner:** §9, pasos 7-10.
- **Orquestador:** la URL en `app/README.md` (y se pasa a #16), el smoke y la fila de STATUS.

## 8. Smoke

`documents/SMOKE_RAILWAY_DEPLOY.md` (lo escribe el MID cuando TASK-4 queda aprobado):
- **A, local antes de #8 (DEV):** V-1..V-3, E-1..E-6 y TASK-3.
- **B, después de #8:**
  - TASK-6 (DEV);
  - el owner en la URL pública: abrir la URL; `testnet · nodo OK`; conectar **su wallet de extensión** (Slush); lobby;
    recargar `#/my-games` y `#/game/<id>`; consola sin violaciones de CSP;
  - `curl -sSI <URL>` con las cabeceras de §4.3.

## 9. Checklist del owner (no delegable)

1. Después de #8, verificar que `deploy-image` del último run de `master` está verde **por el camino positivo**.
2. Railway → New Project → Deploy from GitHub repo → autorizar la **GitHub App de Railway** solo para
   `sdelvalle57/sui_battleship`.
3. Servicio → Settings → Source: rama **`master`**; **Wait for CI: activado**; **entornos de PR: desactivados**.
4. Build: Railway usa el `Dockerfile` de la raíz ("Using detected Dockerfile!"). **No** definir
   `RAILWAY_DOCKERFILE_PATH` ni comandos de build o start.
5. Watch paths (gitignore-style; si las negaciones no se respetaran, un cambio de docs o tests solo redespliega un
   `dist` idéntico):
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
6. Deploy: healthcheck path **`/`**; restart `ON_FAILURE`; 1 réplica; región y sleep a elección del owner.
   **Variables: ninguna** (Railway inyecta `PORT`; no definir `VITE_*`).
7. Networking → **Generate Domain** (`<servicio>.up.railway.app`), con el puerto que propone Railway.
8. Primer deploy: pasa por `WAITING` (Wait for CI), el build queda verde y el healthcheck da 2xx.
9. Smoke B de §8 con su wallet. Si la wallet no conecta por la CSP, avisar (fallback `Report-Only`). Si algo falla:
   rollback desde Deployments o pausar el servicio.
10. Dejar registrado (N-2) si los merges a `master` con CI verde quedan preautorizados como publicación del sitio, y
    opcionalmente (N-4) agregar `deploy-image` a los checks requeridos.

## 10. Qué se puede mergear antes de #8

**Todo el PR de TASK-1..5** (P-5 = (a), `Refs #15`), después del merge de #14 (cabecera):
- CI verde por el camino negativo de `deploy-image`; `contracts`/`app` sin cambios;
- el camino positivo ya ensayado con la imagen real (E-2..E-6);
- no se publica nada: Railway no está conectado. Si se conectara antes de tiempo, el build falla con el mensaje de
  DL-3;
- destraba #16.

**Solo después de #8:** TASK-6 (IDs reales, Node 26.13.0, URL) y el checklist del owner. Cierran #15.

## 11. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | Caddy como `nobody`: no puede escribir `/data` o `/config`, o no arranca si el runtime quita capabilities (MINOR-2) | `setcap -r` y prueba con `--cap-drop=ALL` (DL-10, DL-13); `persist_config off`; `XDG_*=/tmp` si hace falta |
| R-2 | Diferencias entre el builder clásico (local) y BuildKit (Railway/CI) | Sin sintaxis exclusiva de BuildKit (DL-9); `--progress=plain` solo con buildx; la CI construye con BuildKit en cada PR |
| R-3 | Rate limit anónimo de Docker Hub en los runners | Mismas imágenes y mismo digest en `public.ecr.aws/docker/library/*`; cambiar el `FROM` y declararlo |
| R-4 | Wait for CI | Doc oficial: *"every GitHub Actions check suite on the commit"*, *"Checks from other GitHub apps are ignored"*; un workflow fallido salta el deploy; *skipped*/*neutral* no bloquea; sin terminar en 2 h, se salta. `framework-drift` (`continue-on-error`) no hace fallar el run, y `deploy-image` está verde en los dos caminos |
| R-5 | Una wallet de extensión inyecta un script que `script-src 'self'` bloquea | Las MV3 de Chrome inyectan fuera de la CSP de la página; compuerta: smoke del owner; fallback `Report-Only` (P-2) |
| R-6 | El kit agrega orígenes (MVR, metadata, ícono remoto) | Aparece como `securitypolicyviolation`; remedio acotado por directiva (§4.3); el tren `@mysten/*` ya pide revisión al subirlo |
| R-7 | Config as Code deja de leerse el 2026-12-01 | No se usa (P-1) |
| R-8 | Node 26.12.1 en la imagen frente a 26.13.0 en local y la CI | Mismo major (`.nvmrc`, `engines`, guarda de `publish.mjs`); temporal y declarado; TASK-6 lo cierra |
| R-9 | Los datos sintéticos del ensayo se filtran al repo o a una imagen publicada | Solo en `<scratchpad>/ensayo-15/`, imagen `ensayo-15` local, borrada al cierre, con `git status` limpio comprobado. La guarda real (DL-3) nunca ve esos archivos en Railway |
