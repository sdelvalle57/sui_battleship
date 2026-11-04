# HANDOFF_RAILWAY_DEPLOY
> Plan: PLAN_RAILWAY_DEPLOY v1.1 (aprobado por el MAYOR en la ronda 2; commit `4e7d1a3`) | Issue: #15 |
> Branch: `feature/issue-15-pages-deploy` | Versión: v1.3 | Fecha: 2026-11-04
> Decisiones: D-20261104-03 (P-1..P-5 de este plan, tomadas por delegación), D-20261104-01 (delegación y hosting en
> Railway; llega a `master` con #14), D-20261102-02, D-20261030-13.
> Este handoff es **autocontenido**. El plan v1.1 tiene el porqué de cada decisión (DL-1..DL-13); acá está lo que hay
> que hacer.

## Changelog

- **v1.3 (2026-11-04):** surge de la revisión del MID de TASK-4 (PASA).
  - actionlint 1.7.12 no acepta `-color=never`: `-color` es booleano y ese valor sale con exit 2. El flag correcto es
    **`-no-color`**. Se corrige en TASK-4 §5.1, y TASK-5 tiene que usar `-no-color` si lo documenta.
  - **Evidencia de N2a con BuildKit:** alcanza con que `deploy-image` haya quedado verde por el camino negativo en el
    run del PR (41802734452 sobre `f146097`). El script no imprime el log de un build exitoso, y en modo negativo
    llegar a `OK (negativo)` exige que N2a coincida. Con BuildKit, la única línea que puede coincidir es la de salida
    de la guarda: el `ERROR: failed to solve …` y el extracto del Dockerfile no empiezan con `ERROR (#15)`. No se
    agrega ningún `::debug::`.
- **v1.2 (2026-11-04):** surge de la revisión del MID de TASK-2 (PASA). Afecta solo a TASK-4 y TASK-5; TASK-2 ya está
  aprobado con el contrato v1.1.
  - **MINOR-1 de TASK-2:** N2 se endurece en dos chequeos, N2a y N2b (§3.4).
    - N2a busca la línea de **salida** del error de la guarda, no la línea `RUN` que imprime el builder.
    - N2b exige que el log **no** muestre `RUN npm ci`, es decir, que el build se haya cortado en la guarda.
    - Se implementa y se prueba en **TASK-4**, porque ahí corre por primera vez con BuildKit (CI). Incluye un rojo
      provocado local: una guarda que no corta tiene que fallar en N2b.
  - **Observación 1 de TASK-2 (DL-8):** se confirma que la regla de 7 días se mide sobre la **versión**
    (`published_at` del release), no sobre el digest. Un *rebuild* de docker-library de la misma versión (por ejemplo,
    el índice de `caddy:2.11.7-alpine`, del 2026-10-30) no reinicia el plazo. Es lo que dicen el plan v1.1 (DL-8) y
    la revisión del MAYOR de la v1. TASK-5 lo documenta en el README.
  - Corrección de redacción en TASK-4 §5.1 (actionlint).
- **v1.1 (2026-11-04):** responde a la revisión del MAYOR del handoff v1 (APPROVE con 2 MINOR y 5 sugerencias) y
  agrega la coordinación de puertos con #14.
  - **MINOR-1 (capas e intermedios del builder clásico):**
    - el script pasa `--force-rm` cuando no hay buildx;
    - E-1f, E-1g y E-3 usan `--force-rm` y una etiqueta propia que se borra en el mismo paso;
    - V-1 y L-0 anotan una línea base de `docker ps -aq` y `docker images -aq`;
    - C-1 y C-2 borran **solo** los IDs nuevos respecto de esa línea base, sin `prune`, y comprueban que la diferencia
      queda vacía.
  - **MINOR-2:** Dockerfile y Caddyfile **literales**, copiados del plan v1.1 (`4e7d1a3`). `WORKDIR /repo` es el
    paso 0 y las invariantes pasan a ser un checklist de revisión.
  - **Sugerencia 1:** actionlint con el archivo explícito.
  - **Sugerencia 2:** el `dist` de localnet de L-3 va a `<SMOKE_DIR>/dist`, fuera del repo.
  - **Sugerencia 3:** el preview de TASK-1 lanza Vite con `exec` y al cerrar comprueba el puerto.
  - **Sugerencia 4:** TASK-5 no espera a TASK-3.
  - **Sugerencia 5:** el resultado esperado exacto de E-1f.
  - **Coordinación nueva:** tabla de puertos propios de #15 (preview `4174`, Chrome `9230`, contenedores
    `8090`-`8093`).
- **v1 (2026-11-04):** primera versión (`1a50cab`), aprobada por el MAYOR.

## Historia de usuario

**Como** jugador con una wallet de Sui en testnet, **quiero** abrir una URL pública y jugar sin clonar el repo,
**para** probar el juego desde cualquier navegador.
**Como** owner, **quiero** que el repo deje lista la imagen de Railway (servidor, cabeceras, guarda de #8 y chequeo en
la CI), **para** conectar el servicio y publicar en minutos cuando vuelva y exista `contracts/deployments/testnet.json`.

**Scope en una frase:** favicon, imagen Docker con Caddy y CSP que se niega a construirse sin el `testnet.json` de #8,
un script de chequeo compartido por la CI y el ensayo local, el job `deploy-image` y la documentación.
**Lo que NO entrega:** nada en Railway ni ninguna publicación (owner); `testnet.json` (#8); la URL pública (TASK-6,
después de #8); code-splitting (issue aparte, P-3); `railway.json` (P-1: los servicios nuevos no lo leen).

## 0. Baseline de gates verificado (2026-11-04, `master` `deaadbb` = base de la branch; HEAD de la branch `4e7d1a3`, solo docs)

| Área | Gate | Baseline | Fuente |
|---|---|---|---|
| CI @ `deaadbb` | run `push` 41790496035 | 🟢 `contracts`, `app` y `framework-drift` success | `gh api …/actions/runs/41790496035/jobs` |
| app | `npm ci` / `npm audit signatures` / `npm audit --omit=dev --audit-level=high` | 🟢 293 paquetes; 292 firmas; 0 vulnerabilidades de producción (11 *moderate* solo dev, #35) | STATUS (TASK-5 de #13, `7a3b7fb`; sin cambios de app hasta `deaadbb`) |
| app | `npm run lint -w app` / `npm run typecheck -w app` | 🟢 **0 problemas** / **0 errores** | ídem |
| app | `npm test -w app` | 🟢 **915 tests PASS** en **57** archivos | ídem |
| app | `VITE_SUI_NETWORK=testnet npm run build -w app` | 🟢 `index-*.js` **901,45 kB** (273,61 kB gzip), aviso de chunk > 500 kB (informativo; → issue de code-splitting) | ídem; el MID lo volvió a medir hoy con Node `v26.13.0`: 901,49 kB, la diferencia es el comentario del `--sourcemap` |
| contracts | build / `--lint` / test / `node --test` / `check` | 🟢 0 warnings / 0 lints / 83 tests / 99 tests / "0 despliegues" | STATUS; #15 **no toca** `contracts/` |
| Toolchain | Node / npm | `v26.13.0` / `11.20.0` | STATUS |
| Docker (máquina local) | `docker --version` | `Docker version 29.1.3`; daemon accesible para el usuario (grupo `docker`); **sin `docker buildx`** (builder clásico); imágenes locales: `busybox`, `postgres:16-alpine`, `postgres:17` | medido por el MID hoy |

**Cero delta** = mismos conteos. Solo TASK-1 toca el build de la app, y suma `favicon.svg` al `dist`. Ningún task
cambia tests ni código de `app/src/`.

## Decisiones del owner (D1..D6, no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Hosting en **Railway**: el repo deja la imagen lista; crear y conectar el servicio y publicar es del owner | D-20261104-01 (2) |
| D2 | Sin `railway.json`/`railway.toml`: `Dockerfile` en la raíz y los settings de Railway en el checklist del owner | D-20261104-03 (1), P-1 = (a) |
| D3 | CSP y cabeceras aplicadas (Caddy), **sin COOP**; si una wallet real no conecta, solo la CSP pasa a `Report-Only` | D-20261104-03 (2), P-2 = (a) |
| D4 | El code-splitting sale de #15 (issue aparte: lo redacta el MAYOR y lo crea el orquestador) | D-20261104-03 (3), P-3 = (b) |
| D5 | Favicon SVG propio y simple | D-20261104-03 (4), P-4 = (a) |
| D6 | Mergear antes de #8 con `Refs #15`; `Closes #15` en el PR posterior a #8 (TASK-6) | D-20261104-03 (5), P-5 = (a) |

**No delegado (N-1..N-5): ningún task lo toca.** Railway (proyecto, GitHub App, settings), cada publicación del
sitio, #8, los checks requeridos y el rollback son del owner.

## Reglas comunes (todas las tasks)

- **Gate `app` en forma canónica** (`agents.md` §3), desde la raíz del worktree, con output pegado:
  ```bash
  export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version   # v26.13.0
  npm ci && npm audit signatures && npm audit --omit=dev --audit-level=high
  npm run lint -w app && npm run typecheck -w app && npm test -w app
  VITE_SUI_NETWORK=testnet npm run build -w app
  git status --porcelain --untracked-files=all    # solo los archivos del task
  ```
  Ningún task toca `contracts/`, así que su gate no se corre: se declara "sin cambios en `contracts/`" con
  `git diff --stat -- contracts/` vacío.
- **Testnet:** nada con claves; las lecturas públicas sí. **`~/.sui/`:** solo `stat`/`ls`.
- **#8:** el worktree de #8 está **congelado**: no se lee ni se escribe. Lo de #8 se lee **solo** con
  `git show origin/feature/issue-8-testnet-publish:<ruta>`.
- **Chrome headless:** `--headless=new --user-data-dir=<scratchpad>/chrome-15-<task>` con `HOME`/`XDG_*` aislados en
  `<scratchpad>`, `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9230`, guardar el PID al lanzarlo y cerrar **solo ese PID**
  (`kill <pid>`; nunca `pkill`/`killall`). El Chrome del usuario puede estar abierto. Con más de una pestaña:
  `Target.createTarget({ url, newWindow: true })` y nunca `Page.bringToFront`.
- **Docker:** contenedores y etiquetas propios (`deploy-image-*`, `battleship-app:*`), siempre por nombre o ID.
  Nunca `docker stop $(docker ps -q)`, `docker system prune` ni `docker rmi` de imágenes ajenas. Las imágenes base
  que se descarguen se declaran, y al final se borran las que no estaban (`busybox` y las de `postgres` se quedan).
- **Sin rutas personales** en lo que se pegue: `<repo>`, `<scratchpad>`, `<HOME real>`.
- **Sin commits ni pushes** (los hace el orquestador). Reporte con la plantilla de `FLUJO_AGENTES.md` §5, incluida
  "Desviaciones del handoff" (o "ninguna").
- **Coordinación de la localnet:** solo puede haber **una** localnet a la vez y la está usando #14. TASK-1, TASK-2,
  TASK-4 y TASK-5 **no** usan localnet y se pueden hacer ya. TASK-3 tiene precondición (ver ahí).
- **Coordinación de puertos con #14:** el DEV de #14 corre su localnet y su smoke en paralelo. #15 usa **solo** estos
  puertos locales, todos en `127.0.0.1`:

  | Uso | Puerto |
  |---|---|
  | `vite preview` (TASK-1) | **4174**, con `--strictPort`. El `:4173` puede estar ocupado por otro proyecto y **no se toca** |
  | Depuración de Chrome headless (todas las tasks) | **9230**. El 9229 lo usa #14 |
  | Script de chequeo (V-3, E-2, TASK-4 local, TASK-6) | **8090** |
  | E-4 (`PORT` distinto) | **8091** |
  | E-6 (Chrome contra la imagen del ensayo) | **8092** |
  | L-5 (Caddy con el `dist` de localnet) | **8093** |
  | Localnet aislada (TASK-3) | el `:9000` de `agents.md` §3, solo después de que lo libere #14 |

  Antes de usar cada puerto, `ss -ltn 'sport = :<puerto>'` tiene que dar sin filas. Si está ocupado, **no** se mata
  el proceso ajeno: se usa el siguiente libre y se declara. En la CI el script usa `8080` (runner efímero).

**Orden de los tasks:** TASK-1 → TASK-2 → TASK-4 → TASK-5, todas en paralelo con la localnet de #14. TASK-5 **no**
espera a TASK-3: documenta lo de TASK-1/2/4, y la fila de baseline de TASK-3 se suma a STATUS cuando TASK-3 se reporte.
TASK-3 corre cuando se libere la localnet. TASK-6, después de #8.

---

## TASK-1: favicon — área: app

### 1. Historia de usuario del task
**Como** jugador, **quiero** ver el ícono del juego en la pestaña, **para** reconocerla entre otras; y **como** DEV,
quiero que desaparezca el 404 de `/favicon.ico` de la consola en cada carga.

### 2. Contexto
- `app/index.html` no declara ícono. Los smokes de #9 registraron el 404 de `/favicon.ico` y lo derivaron a #15.
- `app/public/` no existe. Vite copia `public/` a la raíz de `dist/` tal cual, y con `base` `/` la ruta queda
  `/favicon.svg`.
- `app/vite.config.ts` **no** declara `base` (vale `/`), y así queda.

### 3. Qué implementar
- `app/public/favicon.svg`:
  - SVG estático propio: un blanco o diana de batalla naval con 2-3 círculos concéntricos y una mira, sin texto ni
    emoji;
  - `viewBox="0 0 32 32"`, colores fijos, ≤ 1 kB;
  - **sin** `<script>`, `<foreignObject>`, `href` externos ni fuentes, y sin licencias de terceros.
- `app/index.html`: en `<head>`, `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

### 4. Archivos
- **Tocar:** `app/public/favicon.svg` (nuevo) y `app/index.html`.
- **NO tocar:** `app/vite.config.ts`, `app/src/**` ni tests.

### 5. Tests / verificaciones
1. Gate `app` canónico: **915 tests en 57 archivos**, 0 problemas y 0 errores, sin delta.
2. Después del build: `app/dist/favicon.svg` existe y `grep -c 'rel="icon"' app/dist/index.html` = 1.
3. Comprobar que `:4174` está libre (`ss -ltn 'sport = :4174'` sin filas). Lanzar Vite **directo**, sin el `npm`
   intermedio, como comando en segundo plano del harness, para que el PID guardado sea el del servidor:
   `cd <repo>/app && echo $$ > <scratchpad>/preview-15.pid && exec <HOME real>/.nvm/versions/node/v26.13.0/bin/node ../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort`.
   Después, Chrome headless (reglas comunes, depuración en `9230`) con `Network.enable` en `http://127.0.0.1:4174/`:
   - `GET /favicon.svg` 200 con `content-type` `image/svg+xml`;
   - **ningún** pedido a `/favicon.ico`.
   - Pantalla esperada: "La app no está configurada" (no hay `testnet.json`), y está bien así.
   - Cerrar Chrome y el preview por sus PIDs (`kill -0` falla en los dos).
   - Al final, `ss -ltn 'sport = :4174'` y `ss -ltn 'sport = :9230'` sin filas. El `:4173` no se toca.

### 6. Smoke
No aplica aparte: se verifica en el paso 3 y en el script de TASK-2 (`/favicon.svg` 200).

### 7. Criterios de aceptación
- Los pasos 1-3 en verde, con output.
- `git status` solo con los dos archivos.

### 8. Al terminar
Reporte §5. Commit propuesto por el MID.

---

## TASK-2: imagen de Railway, script de chequeo y ensayo de los dos caminos — área: app/ci

### 1. Historia de usuario del task
**Como** owner, **quiero** una imagen que sirva el build de testnet con cabeceras de seguridad y que se **niegue** a
construirse sin el `testnet.json` real, **para** que Railway nunca publique una app rota ni con IDs inventados. **Como**
revisor, quiero que los dos caminos (sin y con `testnet.json`) estén probados antes de #8 con el mismo script que va a
usar la CI.

### 2. Contexto
- **Glob de la config:** `app/src/sui/config.ts:150-155` lo resuelve al compilar (`import: 'default'`), así que los IDs
  de `testnet.json` quedan literales en el bundle. Sin `testnet.json`, el build compila igual y muestra
  "La app no está configurada" (`config.ts:97-101`).
- **`check` de PR #48** (`git show origin/feature/issue-8-testnet-publish:contracts/scripts/publish.mjs`):
  - `main()` corre primero `checkNodeVersion` con `../.nvmrc` (`:819-821`) y falla con `.nvmrc sin versión válida`
    si no lo encuentra;
  - `commandCheck` (`:798-810`) lee solo `contracts/deployments/*.json` y `contracts/Published.toml`;
  - la coherencia (`deployment.mjs:341-361`) compara `packageId`/`published-at`, `originalPackageId`/`original-id`,
    `packageVersion`/`version`, `upgradeCapId`/`upgrade-capability` y `chainId`/`chain-id`;
  - testnet exige el chain id `4c78adac` (`deployment.mjs:6`).
- **Endpoint gRPC de testnet:** `https://fullnode.testnet.sui.io:443` (`app/src/sui/networks.ts:12`).
- **Bundle (medido):** sin `eval`/`new Function` ni `WebAssembly`. Orígenes externos: el fullnode,
  `https://api.slush.app` (`fetch` de metadata al registrar Slush), `https://my.slush.app` (navegación del popup) y
  MVR (no se usa con IDs `0x`).
- **Imagen de Caddy 2.11.7:**
  - trae `setcap cap_net_bind_service=+ep /usr/bin/caddy` y `libcap`;
  - deja `/config/caddy` y `/data/caddy` con `chmod 1777`, así que `nobody` puede escribir ahí y no hace falta mover
    `XDG_*` (sugerencia 2 de la ronda 2; se verifica, no se cambia);
  - tiene un bug de `encode` con **HEAD**, corregido en 2.11.8: las cabeceras se leen siempre con **GET**.
- **Node:** se usa 26.12.1 y no 26.13.0 por la regla de 7 días (DL-8). Las notas de la release de v26.13.0 dicen:
  *"Other than updating metadata, such as the `process.release` object, to reflect that the release is LTS, no further
  changes from Node.js 26.12.1 are included."* La subida de TASK-6 es solo de paridad.

### 3. Qué implementar

#### 3.1 `.dockerignore` (raíz). Contenido exacto
```
# Contexto de la imagen de Railway (#15): lista blanca. Todo lo demás queda fuera, incluidos
# contracts/deployments/localnet.json, .env*, node_modules, dist y .git.
*
!package.json
!package-lock.json
!.npmrc
!.nvmrc
!app/
!contracts/scripts/publish.mjs
!contracts/scripts/deployment.mjs
!contracts/Published.toml
!contracts/deployments/testnet.json
app/node_modules
app/dist
app/.env*
app/scripts
```

#### 3.2 `Dockerfile` (raíz). Contenido literal (plan v1.1, `4e7d1a3`)
Se copia **tal cual**. Cualquier cambio es una desviación declarada.
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

**Checklist de revisión del Dockerfile (invariantes):**
- [ ] Paso 0 de la etapa `build`: `WORKDIR /repo`. Sin él, `COPY --from=build /repo/app/dist` no encuentra la ruta.
- [ ] Las dos imágenes, fijadas por digest: `node:26.12.1-bookworm-slim@sha256:88e4…e28c` y
      `caddy:2.11.7-alpine@sha256:e70b…4ee5`.
- [ ] `COPY .nvmrc ./` antes de cualquier `RUN`; la guarda de Node de `publish.mjs` (#8) lo exige.
- [ ] El primer `RUN` es la guarda `test -f …testnet.json` con el mensaje **literal**, y va antes de `npm ci`. El
      script lo busca por la subcadena `falta contracts/deployments/testnet.json`.
- [ ] `RUN node contracts/scripts/publish.mjs check` antes de `npm ci`.
- [ ] `ENV VITE_SUI_NETWORK=testnet` y **ningún `ARG`**.
- [ ] El `RUN` de comprobaciones del bundle verifica los 4 IDs, la ausencia de `localnet` y el origen del fullnode.
- [ ] Runtime: `setcap -r /usr/bin/caddy`, `caddy validate` y el grep del origen en el Caddyfile, y después
      `USER nobody`.
- [ ] Prohibido: `RUN --mount`, heredocs, `COPY --chmod`/`--link`, `# syntax=` (no los admite el builder clásico
      local) y cualquier secreto. Comentarios solo con el porqué (LIM-7).

#### 3.3 `app/Caddyfile`. Contenido literal (plan v1.1, `4e7d1a3`)
Se copia **tal cual**; los tabs son parte del formato de Caddy.
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

**Checklist de revisión del Caddyfile:**
- [ ] La CSP está en una sola línea y es idéntica a la de §4.3 del plan; el script la compara con la que sirve la
      imagen (P4).
- [ ] 6 cabeceras con valor exacto y `-Server`.
- [ ] `@assets` tiene `path /assets/*` y `file`, así que `immutable` va solo a assets que existen.
- [ ] **Sin** `log`, `try_files`, fallback SPA, COOP ni `browse`.

#### 3.4 `app/scripts/check-deploy-image.sh`: contrato

```
Uso:      bash app/scripts/check-deploy-image.sh <contexto> <puerto>
          <contexto>  raíz del contexto de build (tiene Dockerfile, .dockerignore y app/Caddyfile)
          <puerto>    entero 1024..65535: se publica en 127.0.0.1:<puerto> y es el PORT del contenedor
Entorno:  CHECK_KEEP_TAG  (opcional) en modo positivo, etiqueta extra que NO se borra al salir
                          (p. ej. battleship-app:ensayo-15, para E-4 y E-6)
          GITHUB_ACTIONS, GITHUB_STEP_SUMMARY  (si existen) anotaciones ::notice::/::error:: y una línea de resumen
Modo:     positivo si existe <contexto>/contracts/deployments/testnet.json; si no, negativo
Salida:   0 = el modo detectado pasó todos sus chequeos; 1 = un chequeo falló ("FALLO: <qué>"); 2 = uso inválido
Requiere: bash, docker, curl, grep, sed, mktemp. Sin otras dependencias ni red, salvo las descargas de docker
```

**Comportamiento obligatorio:**
- `set -euo pipefail`.
- Las rutas y el puerto se validan antes de tocar Docker (uso inválido → 2).
- Etiqueta `battleship-app:check-$$` y contenedor `deploy-image-$$`.
- El log del build va a un `mktemp` **fuera** del contexto.
- `trap` en `EXIT` que hace `docker rm -f deploy-image-$$`, `docker rmi battleship-app:check-$$` y borra los
  temporales, todo con `>/dev/null 2>&1 || true`. **No** borra `CHECK_KEEP_TAG`.
- `docker build`: siempre con `-f <ctx>/Dockerfile <ctx>`. Si `docker buildx version >/dev/null 2>&1` funciona,
  agrega `--progress=plain`. Si **no** hay buildx (builder clásico, como en esta máquina), agrega **`--force-rm`**:
  así no quedan contenedores intermedios de un `RUN` fallido con datos del contexto (MINOR-1). Las imágenes
  intermedias `<none>` del builder clásico no las borra el script: las borra el cierre del ensayo por línea base
  (C-1/C-2).
- **Negativo (N1-N3).** El fallo esperado se captura **sin** que `set -e` aborte (sugerencia 4):
  `if docker build … >"$log" 2>&1; then fail "sin testnet.json la imagen no debe construirse"; fi`.
  - N1: el build falló.
  - N2 (endurecido en v1.2; se implementa en TASK-4):
    - **N2a:** `sed 's/\x1b\[[0-9;]*m//g' "$log" >"$log.plain"` y después
      `grep -qE '^(#[0-9]+ [0-9]+\.[0-9]+ )?ERROR \(#15\): falta contracts/deployments/testnet\.json' "$log.plain"`.
      Va en dos pasos, con un archivo, y no con `sed | grep -q`: con `pipefail`, el `grep -q` que corta temprano puede
      dejar a `sed` con SIGPIPE y dar un falso fallo. N2b lee el mismo `$log.plain`.
      Es la línea de **salida** del `echo` de la guarda. El builder clásico la pinta en rojo (`ESC[91m`), así que
      primero se quitan los códigos ANSI. Va sin prefijo con el builder clásico, y con el prefijo `#<n> <segundos> `
      con BuildKit `--progress=plain`. El MID ya la probó contra el log real de V-3 (línea 19, coincide) y contra una
      muestra con formato de BuildKit (coincide). **No** cuenta la línea `Step n/m : RUN test -f …` ni la de
      `[build n/m] RUN …`, que también contienen la subcadena.
    - **N2b:** `! grep -qE 'RUN npm ci' "$log.plain"`. El build se cortó en la guarda: no llegó a `npm ci`.
    - Si cualquiera de los dos falla, se imprimen las últimas 30 líneas del log y sale `FALLO: N2a…` o `FALLO: N2b…`.
  - N3: mensaje final `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`,
    con `::notice::` en Actions.
- **Positivo (P1-P13).** Las cabeceras se leen **con GET**, nunca con HEAD (sugerencia 3):
  `curl -sS -D <hdrs> -o <body> --max-time 10 <url>`. Los nombres se comparan sin distinguir mayúsculas y se recortan
  los `\r`. **No** se comprueba `Content-Length`.
  - **P1:** build verde (si no, las últimas 30 líneas del log). Con `CHECK_KEEP_TAG`, `docker tag` a esa etiqueta.
  - **P2:** `docker run -d --name deploy-image-$$ --cap-drop=ALL -e PORT=<puerto> -p 127.0.0.1:<puerto>:<puerto> <tag>`.
    Espera, sondeando cada 1 s y como mucho 30 s, a que `/` dé 200. Si no llega, `docker logs` (últimas 30 líneas)
    y FALLO.
  - **P3:** `docker exec deploy-image-$$ id -u` = `65534`.
  - **P4:** `/` 200 y la `Content-Security-Policy` es **idéntica** a la que tiene el `Caddyfile` del contexto
    (extraída con `sed` de la línea `Content-Security-Policy "…"`). Además contiene `script-src 'self'` y
    `frame-ancestors 'none'`.
  - **P5:** en `/`, valores exactos de `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
    `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`,
    `Strict-Transport-Security: max-age=31536000` y `Cache-Control: no-cache`.
  - **P6:** en `/`, **ausencia** de `Cross-Origin-Opener-Policy` y de `Server`.
  - **P7:** el asset JS que referencia el `index.html` servido (`src="/assets/…js"`) da 200, su `Content-Type` empieza
    con `text/javascript` y su `Cache-Control` contiene `immutable`.
  - **P8:** el mismo asset con `-H 'Accept-Encoding: zstd, gzip'` responde `Content-Encoding` `zstd` o `gzip`.
  - **P9:** `/favicon.svg` 200 con `Content-Type` `image/svg+xml`.
  - **P10:** `/no-existe` 404.
  - **P11:** `/game/0x1` 404 (no hay fallback SPA).
  - **P12:** `/assets/no-existe.js` 404 **sin** `immutable`.
  - **P13:** mensaje final `OK (positivo): …`, con `::notice::` en Actions.
- Cada FALLO dice qué chequeo (Nn/Pn), qué se esperaba y qué llegó.
- Sin `eval`, sin `curl | sh` y sin escribir fuera de los temporales. Comentarios en español, solo el porqué.

### 4. Archivos
- **Tocar:** `Dockerfile`, `.dockerignore`, `app/Caddyfile` y `app/scripts/check-deploy-image.sh` (todos nuevos).
- **NO tocar:** `app/src/**`, `app/vite.config.ts`, `app/package.json`, `package-lock.json`, `contracts/**`,
  `.github/**` (va en TASK-4) y los docs (van en TASK-5).

### 5. Tests / verificaciones (numeradas; cada una con output pegado)
1. **V-1 a V-3 y E-1 a E-6** del **Anexo A**. Las columnas de resultado se llenan **durante la corrida**.
2. Gate `app` canónico, sin delta (915/57; 0/0). La app no cambia en este task, pero el build tiene que seguir verde.
3. `git diff --stat -- contracts/` vacío y `git status` solo con los 4 archivos del task.
4. Greps sobre los 4 archivos nuevos:
   - claves y secretos (`suiprivkey`, `PRIVATE KEY`, `mnemonic`, `ghp_`, `github_pat_`, `RAILWAY_TOKEN=`): 0
     coincidencias;
   - `ARG` en el Dockerfile: 0;
   - hex de 40-64: solo los digests públicos de §3.2, declarados.

### 6. Smoke
Anexo A, parte 1 (V-1..V-3, E-1..E-6).

### 7. Criterios de aceptación
- El camino **negativo** (V-3) y el **positivo** (E-2) pasan con el **mismo script**.
- E-3 prueba que `.nvmrc` llega antes del `check` (falla por incoherencia, no por `.nvmrc`).
- La imagen corre como `nobody` (65534) con `--cap-drop=ALL`.
- Las 6 cabeceras, la CSP idéntica a la del Caddyfile y la ausencia de COOP y `Server` (P4-P6).
- El contexto contiene **solo** la lista blanca, también con un `localnet.json` y un `.env.local` presentes (E-1).
- Al cerrar, ninguna imagen, contenedor ni directorio del ensayo queda vivo (cierre del Anexo A).

### 8. Al terminar
Reporte §5 con el Anexo A, parte 1, lleno. Declarar las imágenes descargadas y si se borraron.

---

## TASK-3: CSP con el kit montado (localnet aislada, build de producción) — área: app (smoke)

### 1. Historia de usuario del task
**Como** jugador, **quiero** que la CSP no rompa el kit de wallet, los estilos ni las lecturas, **para** que la app
servida por Railway funcione igual que en desarrollo.

### 2. Contexto y precondición
- **PRECONDICIÓN (coordinación con #14):** la localnet aislada de #14 **terminó** y se cerró. Antes de empezar, el
  orquestador avisa que #14 liberó la localnet. El DEV comprueba, sin `sui`, que no hay nada escuchando en `:9000`
  (`ss -ltn 'sport = :9000'` sin filas) y que no quedó otro `<SMOKE_DIR>` activo de #14. Si alguna de las dos falla,
  **no empieza**: lo reporta.
- E-6 (TASK-2) mide la CSP contra testnet con IDs sintéticos (sin datos). Este task la mide **con datos reales** en la
  localnet: el kit montado, estilos de Lit, gRPC-web y rutas profundas.
- En localnet Slush está desactivado (`app/src/sui/dappKit.ts:15`), así que no se mide acá (lo cubren E-6 y TASK-6).

### 3. Qué implementar
Nada en el repo. Es una corrida de verificación, Anexo A, parte 2 (L-1..L-9):
- localnet **aislada** de `agents.md` §3, publicación variante B (escribe `contracts/deployments/localnet.json`,
  ignorado);
- build de **producción** de localnet: `VITE_SUI_NETWORK=localnet npm run build -w app` (sin burner);
- Caddy en Docker sirviendo ese `dist` con una **copia** del `app/Caddyfile` en `<SMOKE_DIR>`. La copia solo cambia
  `connect-src`: `https://fullnode.testnet.sui.io` → `http://127.0.0.1:9000`.
- El Caddyfile del repo **no se toca** y no gana variables.

### 4. Archivos
- **Ninguno en el repo.** `contracts/deployments/localnet.json` se crea y se **borra** en el cierre.

### 5. Verificaciones
Anexo A, parte 2, L-1..L-9.

### 6. Smoke
Anexo A, parte 2.

### 7. Criterios de aceptación
- **0** `securitypolicyviolation`. Si hay alguna, se registra `violatedDirective` + `blockedURI` y se aplica **solo**
  el remedio previsto (`'unsafe-inline'` en `style-src`), como desviación declarada que vuelve a revisión del MID.
- gRPC 200, estilos del kit aplicados, y la recarga de `#/game/<id>` y de `#/my-games` funciona.
- El cierre del paso 7 de `agents.md` §3 se cumple completo.

### 8. Al terminar
Reporte §5 con el Anexo A, parte 2.

---

## TASK-4: job `deploy-image` en la CI — área: ci

### 1. Historia de usuario del task
**Como** owner, **quiero** que cada PR y cada push construyan la imagen de Railway con el mismo script del ensayo,
**para** que una imagen rota se vea en la CI y, con *Wait for CI*, Railway no la despliegue.

### 2. Contexto
- `.github/workflows/ci.yml` tiene los jobs `contracts`, `app` y `framework-drift`; `permissions: contents: read` a
  nivel workflow y una `concurrency` por PR o commit (`ci.yml:9-16`).
- `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` ya está fijada (es el tag v7.0.1, verificado).
- Settings: `sha_pinning_required: true`; checks requeridos `contracts` y `app`. **No** se agrega `deploy-image` a
  los requeridos (N-4, owner).

### 3. Qué implementar
Un job nuevo, después de `app` y antes de `framework-drift`:
```yaml
  deploy-image:
    # Imagen de Railway (#15): sin testnet.json (#8) exige que el build se niegue con el mensaje esperado; con él,
    # construye, levanta y comprueba cabeceras. No es requerido; Railway lo espera vía "Wait for CI".
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    defaults:
      run:
        shell: bash
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Imagen de Railway (camino según contracts/deployments/testnet.json)
        run: bash app/scripts/check-deploy-image.sh . 8080
```
- Sin `permissions` propios (hereda `contents: read`), sin `secrets`, sin Actions nuevas, sin `if:`, sin steps de
  stop ni de limpieza (los hace el `trap` del script).

### 3 bis. N2 endurecido en `app/scripts/check-deploy-image.sh` (v1.2, MINOR-1 de TASK-2)
- Reemplazar el chequeo N2 actual (`grep -qF 'falta contracts/deployments/testnet.json'`) por **N2a** y **N2b**, como
  dice §3.4. Mensajes: `FALLO: N2a: el build falló, pero no por la guarda de testnet.json (no está la línea de salida
  'ERROR (#15): falta contracts/deployments/testnet.json')` y `FALLO: N2b: el build pasó la guarda y llegó a 'RUN npm
  ci' (la guarda no corta el build)`.
- Si BuildKit en la CI resulta tener otro formato de prefijo, se ajusta **solo** el prefijo opcional de N2a y se
  declara, con la línea real del log del run.
- El resto del script no cambia.

### 4. Archivos
- **Tocar:** `.github/workflows/ci.yml` (solo el job nuevo) y `app/scripts/check-deploy-image.sh` (solo N2, §3 bis).
- **NO tocar:** los otros jobs, `on:`, `permissions`, `concurrency` y `env`; el resto del script; `Dockerfile`,
  `.dockerignore` y `app/Caddyfile` (aprobados en TASK-2).

### 5. Tests / verificaciones
1. **actionlint** en un contenedor desechable:
   `docker run --rm -v <repo>:/repo:ro -w /repo rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -no-color .github/workflows/ci.yml`.
   Tiene que dar 0 hallazgos en todo el workflow. El archivo va explícito porque en un worktree `.git` es un archivo
   que apunta a un gitdir del host que no está montado, y la detección del proyecto podría fallar. Si aparecen hallazgos en jobs **viejos**, se declaran sin tocarlos y el delta
   tiene que ser 0. Fallback, si no se puede descargar la imagen:
   `python3 -c 'import yaml,sys; yaml.safe_load(open(".github/workflows/ci.yml"))'` más una revisión manual,
   declarado.
2. `git diff .github/workflows/ci.yml` muestra **solo** el bloque nuevo.
3. Antes de pushear, con el N2 nuevo:
   - **3a, shellcheck** (V-2) del script: 0 hallazgos.
   - **3b, negativo real:** `bash app/scripts/check-deploy-image.sh . 8090` da `exit=0`, con `OK (negativo)` (builder
     clásico).
   - **3c, rojo provocado local de N2b:**
     - en una copia del contexto en `<scratchpad>/n2-15/ctx`, armada como E-1a pero **sin** `testnet.json`, cambiar
       en el `Dockerfile` la guarda a `RUN test -f contracts/deployments/testnet.json || echo "ERROR (#15): falta
       contracts/deployments/testnet.json. …"` (sin `>&2; exit 1`);
     - `bash app/scripts/check-deploy-image.sh <scratchpad>/n2-15/ctx 8090; echo "exit=$?"` tiene que dar `exit=1`
       con `FALLO: N2b`. N1 pasa: el build igual falla más adelante, en las comprobaciones del bundle o en
       `publish.mjs`. N2a pasa porque la línea se imprime.
   - **3d, limpieza por línea base,** como C-1: línea base antes de 3b, borrar solo los IDs nuevos (intermedias
     `<none>` y las bases que no estaban), sin `prune`; `rm -rf <scratchpad>/n2-15`; `:8090` libre.
4. **En el PR**, que el orquestador pushea después de la revisión: el run tiene `deploy-image` verde **por el camino
   negativo** (el `::notice::` de N3 en el log) y `contracts`/`app` sin cambios. El orquestador anota el run ID. Que el
   camino negativo dé verde con BuildKit alcanza como evidencia de N2a (v1.3); no hace falta pegar la línea.
5. Opcional, recomendado: un rojo provocado en un PR desechable, cerrado sin merge, con el Dockerfile **sin** la
   guarda de §3.2 paso 3. Tiene que fallar en N1 o N2.

### 6. Smoke
No aplica aparte: el run del PR es la evidencia.

### 7. Criterios de aceptación
- actionlint 0 (o el fallback declarado); shellcheck 0.
- El diff es solo el job y el N2 del script.
- 3b en verde y 3c en rojo **por N2b**, con la limpieza de 3d.
- `deploy-image` verde por el camino negativo en el run del PR.

### 8. Al terminar
Reporte §5. El camino positivo de la CI es el mismo script que pasó E-2.

---

## TASK-5: documentación — área: docs

### 1. Historia de usuario del task
**Como** owner o como agente, **quiero** encontrar en los docs cómo se construye, verifica y publica la imagen, **para**
operarla sin leer el plan.

### 2. Contexto
- `app/README.md` tiene "Testnet" (`:56-65`), "Origen del build publicado" y "Pendientes conocidos" (`:550-553`, el
  code-splitting "→ #15").
- `agents.md` §2 (layout), §3 (gate) y §12 ("App: hosting estático (por definir en el backlog)").
- `documents/STATUS.md`: las filas de build con "code-splitting en #15" (`:49, :76, :82, :88`).

### 3. Qué implementar
- **`app/README.md`:** sección nueva **"Despliegue (Railway)"**, después de "Testnet", con:
  - qué es la imagen;
  - la guarda de #8 con sus mensajes literales (los de DL-3 y `check`);
  - la lista blanca del contexto;
  - las cabeceras y la CSP, con el motivo de cada origen de `connect-src` y por qué no hay COOP (popup de Slush);
  - cómo verificar en local (`bash app/scripts/check-deploy-image.sh . 8090`, y qué hace cada modo);
  - cómo agregar un origen a la CSP: una directiva por vez, como desviación declarada, incluido el caso del ícono
    remoto de Slush en `img-src`;
  - el fallback a `Report-Only`;
  - la nota "Node 26.12.1 en la imagen por la regla de 7 días; 26.13.0 en TASK-6 (#15)", con el criterio de DL-8:
    se mide sobre la **versión** (`published_at` del release) y no sobre el digest; un rebuild de docker-library de la
    misma versión no reinicia el plazo (observación 1 de TASK-2);
  - "URL pública: se completa después de #8".
  - Además: "Origen del build publicado" agrega que la imagen excluye `localnet.json` por construcción, y
    "Pendientes conocidos" cambia "→ #15" por "→ #N" (el issue de code-splitting).
- **`agents.md`:**
  - §2: en el árbol, `Dockerfile` y `.dockerignore` (raíz), `app/Caddyfile`, `app/public/` (favicon) y
    `app/scripts/check-deploy-image.sh`;
  - §3, "App": una línea sobre el job `deploy-image` (no requerido; mismo script en local) y el comando local;
  - §12: reemplazar "App: hosting estático (por definir en el backlog)" por "App: Railway (D-20261104-01,
    D-20261104-03): imagen del `Dockerfile` de la raíz (build de testnet + Caddy con CSP); el owner conecta el
    servicio, activa *Wait for CI* y publica; sin `testnet.json` la imagen no se construye".
- **`documents/STATUS.md`:**
  - fila del ciclo #15 en "Ciclo activo";
  - baselines de TASK-1/2/4 (y TASK-3 si ya corrió);
  - "Pendientes del usuario": el checklist del owner, resumido con referencia a la §9 del plan;
  - en las filas `:49, :76, :82, :88`, **anotar** "(→ #N)" sin reescribirlas.
- **Issue de code-splitting:** el MAYOR lo redacta y el orquestador lo crea. Mientras no exista, el DEV deja `#N`
  literal y el orquestador lo reemplaza al commitear.

### 4. Archivos
- **Tocar:** `app/README.md`, `agents.md`, `documents/STATUS.md`.
- **NO tocar:** `documents/DECISIONES.md` (D-20261104-03 ya está commiteada en `4e7d1a3`) ni el plan.

### 5. Verificaciones
1. Sin rutas personales: `git diff | grep -nE '/home/|/Users/|/tmp/claude'` da vacío.
2. Grep de claves limpio.
3. Cada referencia a un archivo o línea existe.
4. Los mensajes citados son idénticos a los de `Dockerfile` y `publish.mjs`.

### 6. Smoke
No aplica: son docs.

### 7. Criterios de aceptación
- Las verificaciones 1-4 OK.
- El README describe los dos modos del script y el fallback de la CSP.

### 8. Al terminar
Reporte §5 y snippet propuesto para STATUS.

---

## TASK-6 (posterior a #8; PR de seguimiento con `Closes #15`) — área: app/docs

> **No se ejecuta en este ciclo.** Se activa cuando `master` tenga el `testnet.json` y el `Published.toml` de #8 y el
> owner esté disponible. Va con su propia ronda de revisión.

- **Precondición:** #8 mergeado; la branch de seguimiento (desde `master`) incluye #15.
- **DEV (solo lecturas públicas de testnet, sin claves):**
  1. Subir la etapa `build` a `node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9`
     (cumple los 7 días desde el 2026-11-04T16:57Z), volver a verificar el digest (V-1) y cambiar la nota del README.
  2. `bash app/scripts/check-deploy-image.sh . 8090` → **modo positivo** con los IDs reales, P1-P13 OK.
  3. E-6 con la app real: badge `testnet · nodo OK`; lobby real (o vacío con texto honesto); `#/my-games`; recarga de
     una ruta profunda; `api.slush.app` sin violación; Slush en el modal; popup con `window.opener !== null`; sin
     pedidos a `*.mvr.mystenlabs.com`; 0 violaciones, o el remedio de `img-src` por ícono remoto.
- **Owner:** checklist de la §9 del plan, pasos 1-10, y el smoke B (URL pública, su wallet de extensión, `curl` de
  cabeceras con **GET**).
- **Orquestador:** la URL en `app/README.md` (y se pasa a #16), la fila de STATUS y el SMOKE B.

---

## Anexo A: runbook de verificación y ensayo (formato §M5; se llena durante la corrida)

# SMOKE_RAILWAY_DEPLOY, parte A (local, antes de #8)
> Plan: PLAN_RAILWAY_DEPLOY v1.1 | Issue: #15 | Fecha: (se llena) | Estado: EN CURSO

## Precondiciones
- Red:
  - parte 1: ninguna local (solo descargas de imágenes públicas y, en E-6, lecturas **públicas** de testnet sin
    claves);
  - parte 2: localnet **aislada** según `agents.md` §3, "Localnet aislada (smokes)", **después** de que se libere la
    de #14.
- Cuentas: parte 1, ninguna; parte 2, las de la génesis aislada, solo vía `suic` con el prefijo del paso 3.
- Cliente: Docker 29.1.3 (sin buildx) y Chrome headless con perfil propio. Node `v26.13.0` en el host.
- Directorios: `<scratchpad>/ensayo-15/` (parte 1) y `<SMOKE_DIR>` (parte 2), los dos dentro del scratchpad y
  borrados al cerrar.

## Parte 1: imagen, script y ensayo (TASK-2)

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| V-1 | Para `node:26.12.1-bookworm-slim` y `caddy:2.11.7-alpine`: `curl -fsS https://hub.docker.com/v2/repositories/library/<repo>/tags/<tag>` (`.digest`), `gh api repos/nodejs/node/releases` y `gh api repos/caddyserver/caddy/releases` (`published_at`), y `docker pull <imagen>@<digest>`. Anotar la hora UTC. **Antes del primer pull, línea base de Docker** (MINOR-1): `mkdir -p <scratchpad>/docker-base-15 && docker ps -aq --no-trunc \| sort > <scratchpad>/docker-base-15/ps.txt && docker images -aq --no-trunc \| sort -u > <scratchpad>/docker-base-15/img.txt` | Los digests coinciden con §3.2; versiones con ≥ 7×24 h (26.12.1: 2026-10-21T10:38Z; 2.11.7: 2026-10-03); pull OK; línea base guardada (anotar cuántos contenedores e imágenes tiene) | (se llena durante la corrida) | ⏳ |
| V-2 | `docker run --rm --entrypoint shellcheck -v <repo>:/repo:ro rhysd/actionlint:1.7.12@sha256:b1934ee5…5667 /repo/app/scripts/check-deploy-image.sh` | 0 hallazgos. Si la imagen no trae `shellcheck`, `bash -n` sale con 0 y se declara | (se llena durante la corrida) | ⏳ |
| V-3 | En el repo real (sin `testnet.json`): `bash app/scripts/check-deploy-image.sh . 8090; echo "exit=$?"` | `exit=0`; `OK (negativo)…`; el log muestra el mensaje de §3.2 paso 3 en el primer `RUN` y **no** se ve `npm ci` ejecutado; anotar el tiempo | (se llena durante la corrida) | ⏳ |
| E-1a | `mkdir -p <scratchpad>/ensayo-15/ctx` y `git ls-files -z --cached --others --exclude-standard \| xargs -0 cp --parents -t <scratchpad>/ensayo-15/ctx` (desde `<repo>`) | La copia tiene los archivos versionados y los nuevos del task; **sin** `node_modules`, `app/dist` ni `.env.local` | (se llena durante la corrida) | ⏳ |
| E-1b | En `<ctx>`: `git -C <repo> show origin/feature/issue-8-testnet-publish:contracts/scripts/publish.mjs > <ctx>/contracts/scripts/publish.mjs`, y lo mismo con `deployment.mjs` | Los dos módulos de PR #48 quedan en la copia; el repo no cambia (`git -C <repo> status`) | (se llena durante la corrida) | ⏳ |
| E-1c | `testnet.json` **sintético**: desde `git show origin/feature/issue-8-testnet-publish:contracts/scripts/fixtures/localnet.deployment.json`, con `network: "testnet"` y `chainId: "4c78adac"` (con `node -e` en un script dentro de `<scratchpad>`), escrito en `<ctx>/contracts/deployments/testnet.json` | Un JSON con los 14 campos del fixture y solo esos 2 cambios | (se llena durante la corrida) | ⏳ |
| E-1d | `Published.toml` **sintético** en `<ctx>/contracts/Published.toml`, con el formato de `fixtures/Published.localnet.toml` de #48 y una sección `[published.testnet]`: `chain-id = "4c78adac"`, `published-at` = `packageId`, `original-id` = `originalPackageId`, `version` = `packageVersion`, `upgrade-capability` = `upgradeCapId`, `toolchain-version` y `build-config` como en el fixture | Coherente con el json | (se llena durante la corrida) | ⏳ |
| E-1e | Con Node 26 en el host: `node <ctx>/contracts/scripts/publish.mjs check; echo "exit=$?"` | `1 despliegue(s) válidos y coherentes con Published.toml`, `exit=0` | (se llena durante la corrida) | ⏳ |
| E-1f | Listado del contexto Docker con `busybox` (ya local): Dockerfile desechable en `<scratchpad>/ensayo-15/ls/` (`FROM busybox` + `COPY . /ctx` + `RUN find /ctx -type f \| sort`), construido con el `.dockerignore` de `<ctx>`: `docker build --force-rm -t battleship-app:ls-15 -f <scratchpad>/ensayo-15/ls/Dockerfile <ctx>` y, **en el mismo paso**, `docker rmi battleship-app:ls-15` | Bajo `/ctx` aparecen **exactamente**: `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`; `app/` con `index.html`, `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `README.md`, **`app/Caddyfile`**, **`app/public/favicon.svg`** y `app/src/**` (**sin** `app/.env.example`, que excluye `app/.env*`); `contracts/scripts/publish.mjs`, `contracts/scripts/deployment.mjs`, `contracts/Published.toml` y `contracts/deployments/testnet.json`. **No** aparecen `app/node_modules`, `app/dist`, `app/scripts`, `app/.env*`, ningún otro archivo de `contracts/`, `.git`, ni el `Dockerfile` ni el `.dockerignore` de la raíz (los excluye `*`; Docker los lee aparte). Se pega el listado completo | (se llena durante la corrida) | ⏳ |
| E-1g | Lo mismo sobre `<repo>`, con un `contracts/deployments/localnet.json` (`{}`) y un `app/.env.local` (`VITE_SUI_NETWORK=localnet`) **de prueba** creados antes y **borrados** después; `docker build --force-rm -t battleship-app:ls-15 …` y `docker rmi battleship-app:ls-15` en el mismo paso | **Ni** `localnet.json` **ni** `.env.local` en el listado (y sin `testnet.json` ni `Published.toml`, que no existen en el repo); después de borrarlos, `git status` como antes | (se llena durante la corrida) | ⏳ |
| E-2 | `CHECK_KEEP_TAG=battleship-app:ensayo-15 bash app/scripts/check-deploy-image.sh <ctx> 8090; echo "exit=$?"` | `exit=0`; `OK (positivo)`; P1-P13 en verde: `id -u` 65534 con `--cap-drop=ALL`, CSP idéntica, 6 cabeceras exactas, sin COOP ni `Server`, asset `immutable` y comprimido, favicon 200, los tres 404 (el de `/assets/` sin `immutable`) | (se llena durante la corrida) | ⏳ |
| E-3 | Regresión de MAJOR-1: en `<ctx>/contracts/Published.toml`, cambiar un hex de `upgrade-capability`; `docker build --force-rm -t battleship-app:e3-15 <ctx> > <scratchpad>/ensayo-15/e3.log 2>&1; echo "exit=$?"`; en el mismo paso, restaurar el archivo y `docker rmi battleship-app:e3-15 2>/dev/null \|\| true` (con un build fallido la etiqueta no existe; las capas intermedias las borra C-1) | `exit≠0`; el log tiene `deployments incoherentes` y `upgradeCapId`; **no** tiene `.nvmrc sin versión válida` | (se llena durante la corrida) | ⏳ |
| E-4 | `docker run -d --name deploy-image-e4 --cap-drop=ALL -e PORT=8091 -p 127.0.0.1:8091:8091 battleship-app:ensayo-15`; `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8091/`; `docker rm -f deploy-image-e4` | `200` en 8091; contenedor borrado | (se llena durante la corrida) | ⏳ |
| E-5 | `caddy validate` en el log del build de E-2 | Línea `Valid configuration` (o equivalente) y el `RUN` del runtime con exit 0 | (se llena durante la corrida) | ⏳ |
| E-6a | `docker run -d --name deploy-image-e6 --cap-drop=ALL -e PORT=8092 -p 127.0.0.1:8092:8092 battleship-app:ensayo-15`; Chrome headless (reglas comunes) con `Network.enable`, `Log.enable` y un listener de `securitypolicyviolation` inyectado con `Page.addScriptToEvaluateOnNewDocument`; abrir `http://127.0.0.1:8092/` | Badge `testnet · nodo OK` (el chain id es el real). Se esperan **errores de lectura** de la House y del lobby (los IDs sintéticos no existen): no son falla. **0** violaciones de `script-src`, `style-src` y `connect-src` | (se llena durante la corrida) | ⏳ |
| E-6b | En la pestaña: el pedido a `https://api.slush.app/api/wallet/metadata` | Sin violación de CSP. Anotar el status (puede dar 403 de Cloudflare) | (se llena durante la corrida) | ⏳ |
| E-6c | Abrir el modal de `ConnectButton` | Lista "Slush". Ícono `data:` → OK. Si es `https://…` con violación de `img-src`: anotar el origen y aplicar el remedio (ese origen **solo** en `img-src`, como desviación declarada). **Si E-6b dio 403**, el ícono remoto queda **sin medir** y pasa al smoke B del owner (sugerencia 5): se anota así | (se llena durante la corrida) | ⏳ |
| E-6d | Elegir "Slush" en el modal | Se abre un target nuevo (popup) que navega a `https://my.slush.app`; `Runtime.evaluate('window.opener !== null')` en el popup da `true`. **No** se inicia sesión; el popup se cierra con `Target.closeTarget` | (se llena durante la corrida) | ⏳ |
| E-6e | Recorrido de toda la sesión de E-6 | **Ningún** pedido a `*.mvr.mystenlabs.com`; total de `securitypolicyviolation` = 0 (o solo la del ícono remoto ya remediada) | (se llena durante la corrida) | ⏳ |
| C-1 | **Cierre de la parte 1:** `kill <pid de Chrome>` (y `kill -0` falla); `docker rm -f deploy-image-e6`; `docker rmi battleship-app:ensayo-15`; **Limpieza por línea base (MINOR-1), sin `prune`:** (1) contenedores nuevos = `comm -13 <scratchpad>/docker-base-15/ps.txt <(docker ps -aq --no-trunc \| sort)`; para cada uno, `docker inspect --format '{{.Name}} {{.Config.Image}} {{.Config.Cmd}}'`; se borran con `docker rm -f` **solo** los de este ensayo (nombre `deploy-image-*`, imagen `battleship-app:*` o intermedio cuyo `Cmd` es un `RUN` de nuestro Dockerfile o del de busybox); cualquier otro se lista y **no se toca**. (2) Imágenes nuevas = `comm -13 <scratchpad>/docker-base-15/img.txt <(docker images -aq --no-trunc \| sort -u)`; se borran con `docker rmi` las `<none>` (intermedias del builder clásico), las etiquetas `battleship-app:*` y las imágenes base descargadas en V-1 (`node:26.12.1-bookworm-slim`, `caddy:2.11.7-alpine`, `rhysd/actionlint`); otra nueva se lista y no se toca. (3) Repetir los dos `comm`. (4) `rm -rf <scratchpad>/ensayo-15` (comprobar que ya no existe). (5) `ss -ltn` sin filas en `8090`-`8092` y `9230`. (6) `git -C <repo> status --porcelain --untracked-files=all` | Las dos diferencias quedan **vacías** (o solo con objetos ajenos listados y declarados); sin directorios del ensayo; puertos libres; el repo solo con los archivos del task. La línea base se conserva para C-2 si TASK-3 corre en la misma sesión; si no, se borra | (se llena durante la corrida) | ⏳ |

## Parte 2: CSP con el kit en la localnet aislada (TASK-3; solo con la localnet de #14 liberada)

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| L-0 | Precondición: aviso del orquestador de que #14 cerró su localnet; `ss -ltn 'sport = :9000'` sin filas; línea base `stat`/`ls` de `<HOME real>/.sui/sui_config/`; **línea base de Docker** igual que en V-1, en `<scratchpad>/docker-base-15-l/{ps,img}.txt`; `ss -ltn` sin filas en `8093` y `9230` | Puertos libres; líneas base anotadas. Si no se cumple, **STOP** y reporte | (se llena durante la corrida) | ⏳ |
| L-1 | Localnet aislada según `agents.md` §3, pasos 2-5 (preparación, génesis, arranque en segundo plano del harness, `ids.env`), y publicación **variante B** (sin `--out`) desde `contracts/` | `suic chain-identifier` responde; existe `contracts/deployments/localnet.json` (ignorado) | (se llena durante la corrida) | ⏳ |
| L-2 | Crear una partida abierta por CLI, con el prefijo del paso 3: `PRE act_as "$ADMIN" && suic ptb --split-coins gas "[10000000]" --assign c --move-call "$PKG::game::create_game" @"$HOUSE" c none` (si la sintaxis de `none` difiere, ajustarla con `suic ptb --help` y declararlo). Anotar el `game_id` del `GameCreated` en `ids.env` | Tx `success`; `GAME=0x…` en `ids.env` | (se llena durante la corrida) | ⏳ |
| L-3 | Build de producción **fuera del repo**: `VITE_SUI_NETWORK=localnet npm run build -w app -- --outDir <SMOKE_DIR>/dist --emptyOutDir` | Exit 0; `<SMOKE_DIR>/dist` con favicon; `<repo>/app/dist` **no** cambia (no se deja un build de localnet en el repo, riesgo de "Origen del build publicado") | (se llena durante la corrida) | ⏳ |
| L-4 | Copia del Caddyfile: `sed 's#https://fullnode.testnet.sui.io#http://127.0.0.1:9000#' <repo>/app/Caddyfile > <SMOKE_DIR>/Caddyfile` y `diff` contra el original | El `diff` muestra **solo** el cambio de `connect-src` | (se llena durante la corrida) | ⏳ |
| L-5 | Imagen desechable equivalente a la etapa runtime. En `<SMOKE_DIR>/l5/` se copian `<SMOKE_DIR>/dist` (de L-3) como `dist/` y el `Caddyfile` de L-4, y un Dockerfile con las mismas líneas de la etapa runtime: `FROM caddy:2.11.7-alpine@sha256:e70b164d…4ee5`, `COPY Caddyfile /etc/caddy/Caddyfile`, `COPY dist /srv`, `RUN setcap -r /usr/bin/caddy && caddy validate …`, `USER nobody` y el mismo `CMD`. Después `docker build --force-rm -t battleship-app:l5-15 <SMOKE_DIR>/l5` y `docker run -d --name deploy-image-l5 --cap-drop=ALL -e PORT=8093 -p 127.0.0.1:8093:8093 battleship-app:l5-15` | `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8093/` = 200. El navegador habla directo con `127.0.0.1:9000`; el contenedor solo sirve los estáticos | (se llena durante la corrida) | ⏳ |
| L-6 | Chrome headless (perfil propio, listener de `securitypolicyviolation`), `http://127.0.0.1:8093/` | Badge `localnet · nodo OK`; el lobby muestra la partida de L-2; los `POST http://127.0.0.1:9000/sui.rpc.v2.*` responden 200 | (se llena durante la corrida) | ⏳ |
| L-7 | Abrir el modal de `ConnectButton`; en su shadow root, `adoptedStyleSheets.length` | Modal visible ("No wallets installed" en headless); `adoptedStyleSheets.length > 0` | (se llena durante la corrida) | ⏳ |
| L-8 | Ir a `#/my-games`; después `#/game/$GAME` y **recargar** (`Page.reload`) | Las dos rutas cargan después de recargar; el detalle muestra la partida (`Pending`, monto) | (se llena durante la corrida) | ⏳ |
| L-9 | Total de la sesión | **0** `securitypolicyviolation`. Si hay alguna, `violatedDirective` + `blockedURI`; solo se admite el remedio de `style-src 'unsafe-inline'`, como desviación | (se llena durante la corrida) | ⏳ |
| C-2 | **Cierre de la parte 2:** `kill <pid de Chrome>`; `docker rm -f deploy-image-l5`; `docker rmi battleship-app:l5-15`; limpieza por la línea base de L-0, con las mismas reglas que C-1 (incluido `caddy:2.11.7-alpine` si se descargó de nuevo), con las dos diferencias vacías, sin `prune`, y borrar `<scratchpad>/docker-base-15-l`; `ss -ltn` sin filas en `8093` y `9230`; paso 7 de `agents.md` §3 completo (kill de la red por PID, `kill -0` falla, `rm -rf <SMOKE_DIR>`, `rm -f contracts/deployments/localnet.json`, `rmdir contracts/deployments 2>/dev/null \|\| true`, `stat`/`ls` de `~/.sui/sui_config/` idénticos a L-0, `git status`, `git diff --exit-code -- contracts/Move.lock`, sin `Pub.*.toml`) | Todo limpio; el exit 144 de `sui start` es esperado | (se llena durante la corrida) | ⏳ |

## Si algo falla
- Capturar: el output del paso (sin rutas personales), las últimas 30 líneas del log de `docker build` o de
  `docker logs`, y la lista de `securitypolicyviolation` (`violatedDirective`, `blockedURI`).
- Reportar el número de paso (V-n / E-n / L-n / C-n). Un paso fallido ⇒ **NO PASA**, salvo los remedios previstos
  (`img-src` por un ícono remoto, `style-src 'unsafe-inline'`), que se declaran como desviación y vuelven a revisión
  del MID.

## Reporte final
- Pasos PASA/TOTAL:
- Hallazgos (n.° de paso + output):
- Veredicto: [PASA | NO PASA]
