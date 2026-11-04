# HANDOFF_RAILWAY_DEPLOY
> Plan: PLAN_RAILWAY_DEPLOY v1.1 (aprobado por el MAYOR en la ronda 2; commit `4e7d1a3`) | Issue: #15 |
> Branch: `feature/issue-15-pages-deploy` (TASK-1..TASK-5 y TASK-2b, PR #57 → `5e51356`); `feature/issue-15-task6`
> desde `master` `ec359ec` (TASK-6, v1.6) | Versión: v1.6.1 | Fecha: 2026-11-04
> Estado: v1.6.1, aprobada por el MAYOR; TASK-6 autorizado desde T6-0 (16:57:41Z).
> Decisiones: D-20261104-03 (P-1..P-5 de este plan, tomadas por delegación), D-20261104-01 (delegación y hosting en
> Railway; en `master` desde #14), D-20261104-05 (2) (cierre de #15; en `git show 1c2bb2a:documents/DECISIONES.md`,
> llega a `master` con #17; ver v1.6.1), D-20261102-02, D-20261030-13.
> Este handoff es **autocontenido**. El plan v1.1 tiene el porqué de cada decisión (DL-1..DL-13); acá está lo que hay
> que hacer.

## Changelog

- **v1.6.1 (2026-11-04):** revisión del MAYOR de la v1.6: APPROVE con cambios (0 🔴/🟠, 5 🟡, 9 🔵). Se aplican todos,
  sin otra ronda; el orquestador los verifica con `diff`.
  - **MINOR-1 (quién llena qué):** T6-7 lo corre el orquestador. El DEV deja `⏳ (T6-7)` en tres lugares: la fila T6-7,
    la celda de run IDs de la baseline de STATUS y el `Estado` del SMOKE ("parte B: EN CURSO"). El orquestador las
    llena en un commit propio, y el SHA de STATUS `:173` también lo pone él. El MID da PASA a TASK-6 **recién** después
    de revisar ese commit (§3.3, T6-7, §7, §8).
  - **MINOR-2 (HEAD):** la v1.6.1 se commitea en `feature/issue-15-task6` antes de autorizar al DEV. T6-0 espera
    HEAD = el commit del handoff, hijo de `ec359ec` (se anota el SHA), y árbol limpio. Los 5 archivos de §4 se cuentan
    contra ese commit (§2, §5.2, T6-0).
  - **MINOR-3 (§R-6):**
    - el rótulo exacto es "§R-6 de #17 (3 greps) más el cuarto grep de MINOR-2 de PR #48";
    - una coincidencia se acepta **solo si se atribuye** a un valor conocido, comparando prefijo y sufijo. Si no se
      atribuye, se quita;
    - en T6-9a/T6-9b se pegan solo los campos pedidos, **nunca** creador, oponente, `title` ni un volcado del DOM. El
      script que lee el `GameCreated` imprime solo el ID abreviado.
  - **MINOR-4 (límite para el owner):** el paso 9 del README y B-5 usan el mismo límite que T6-9g: los mensajes del
    pedido a `api.slush.app` y el `console.error` exacto.
  - **MINOR-5 (`img-src`):** un ícono remoto con violación pasa a ser **STOP**. El DEV no toca `app/Caddyfile`: anota
    `violatedDirective` y `blockedURI`, y el MID emite un addendum (T6-9e, T6-9g).
  - **Punto 6 (D-20261104-05 fuera de `master`):** las condiciones (a)-(d) del MAYOR están en §2 y §8.
  - **SUG-1:** en B-6, un `Server` que agregue el borde de Railway se anota y no es rojo.
  - **SUG-2:** el grep 3 da vacío, salvo la línea que transcribe el propio grep.
  - **SUG-3:** T6-1 y T6-3 citan de dónde sale el digest completo.
  - **SUG-4:** del run B se pega una línea `#<n> …` de la cola de BuildKit, más la de `FALLO: N2b`.
  - **SUG-5:** en el checklist del Dockerfile, renombrar la etapa `build` obliga a tocar N2b.
  - **SUG-6:** D-20261104-01 está "en `master` desde #14" (cabecera).
  - **SUG-7:** la parte B tiene "Reporte final (parte B)".
  - **SUG-8:** T6-9b contrasta el ID de `GAME` sin imprimirlo.
  - **SUG-9 (aviso para el orquestador):** el literal de N2b del texto obligatorio de S-6
    (`HANDOFF_SMOKE_MVP.md:189-190` @ `1c2bb2a`) usa `\[build [0-9]+/…`, que falla abierto. El orquestador le avisa al
    MID de #17 para que lo anote como "corregido en la v1.6 de #15". Este handoff no toca #17.
- **v1.6 (2026-11-04):** addendum **S-6** de la secuencia de #17 (`HANDOFF_SMOKE_MVP.md` de
  `feature/issue-17-mvp-smoke`, "Texto obligatorio del addendum de #15 (S-6, v1.6)"). Autoriza **TASK-6**, que se
  reescribe entera, y se trabaja en una branch nueva, `feature/issue-15-task6`, desde `master` `ec359ec`.
  - **Cierre de #15 (D-20261104-05 (2)):**
    - TASK-6 sale con **`Refs #15`**, sin la URL y sin `Closes #15`. Esto reemplaza a D6 y a la TASK-6 de v1..v1.5.
    - La URL de `app/README.md`, el registro del smoke B y `Closes #15` van en TASK-5 de #16 (S-8).
    - La decisión está registrada en `documents/DECISIONES.md` de `feature/issue-17-mvp-smoke` (`1c2bb2a`). Llega a
      `master` con #17.
  - **Node 26.13.0 en la imagen (DL-8),** con los dos digests fijados:
    - el MID lo verificó hoy con consultas públicas y sin credenciales: Docker Hub y el registry dan el mismo índice,
      `bc0a2afd…c1d9`;
    - la release v26.13.0 tiene `published_at` 2026-10-28T16:57:41Z, así que la regla se cumple **desde
      2026-11-04T16:57:41Z**. A las 15:36Z, la hora de la medición del MID, todavía no se cumplía;
    - Caddy no cambia (`e70b164d…4ee5`, el mismo de Hub hoy);
    - puerta **T6-0**: el DEV no empieza antes de esa hora, y la regla se vuelve a medir al commitear (DL-8).
  - **`deploy-image` positivo con los IDs reales:** ya corre así en `master`, P1-P13, en los runs 41858653878
    (`acdc669`) y 41859161302 (`ec359ec`). TASK-6 lo mide en local con el Node nuevo y lo registra. El run del PR y el
    del merge también lo registran.
  - **E-6 con la app real,** contra la imagen construida desde `.` (T6-9). Incluye el límite de **SUG-2** de la
    revisión de integración de PR #48:
    - el 403 de Cloudflare de `api.slush.app/api/wallet/metadata` sale igual con `Origin: https://example.com`, así
      que no depende del origen `127.0.0.1`;
    - E-6 y el smoke B del owner (S-7) pueden ver el mismo
      `console.error: Error fetching metadata TypeError: Failed to fetch`;
    - se acepta con la firma exacta, sin ningún otro error y con "Slush" listado en el modal;
    - si no aparece, el ícono remoto se mide en ese momento (E-6c y `app/README.md`, "Ícono remoto de Slush").
  - **Los 4 🔵 de la revisión del MAYOR de PR #57.** El MID verificó las líneas contra `ec359ec`. `app/README.md` se
    corrió 2 líneas desde `01d0fbc` (`:208` → `:210`, `:222` → `:224`), y el script sigue en `:101`.
    1. `app/README.md:210`, sin ID de run.
    2. `app/README.md:224`: se quita "TASK-3 de #15 (si no corrió en #15)".
    3. **N2b anclado a la cabecera del paso** en `app/scripts/check-deploy-image.sh:101`, con el rojo provocado
       repetido en los dos builders.
       - **Corrección del MID al literal del texto obligatorio:** BuildKit alinea el número de paso con espacios.
         `prefixCommand` de `moby/buildkit`, `frontend/dockerfile/dockerfile2llb/convert.go`, hace
         `fmt.Sprintf("%*d/%d] ", int(1+math.Log10(float64(ds.cmdTotal))), …)`.
       - La etapa `build` tiene 12 pasos (`FROM`, `WORKDIR`, 5 `COPY` y 5 `RUN`; `ENV` no cuenta), así que la
         cabecera es `#<n> [build  9/12] RUN npm ci`, **con dos espacios**.
       - Con `\[build [0-9]+/[0-9]+\]`, N2b nunca encontraría esa cabecera y con BuildKit pasaría siempre: fallaría
         **abierto**.
       - El patrón pasa a ser `\[build +[0-9]+/[0-9]+\]`. El rojo provocado en BuildKit es justo lo que lo
         comprueba (T6-7).
    4. **La fila "Siguiente" de STATUS:** el housekeeping de #8 (`ec359ec`) ya le quitó "listo para pasar a ready".
       TASK-6 la actualiza al terminar y saca "#15 TASK-6".
  - **El camino negativo ya no corre en `master`** (desde #8, `.` tiene `testnet.json`). N2a y N2b se ensayan en una
    copia del contexto **sin `testnet.json` ni `Published.toml`**:
    - si solo se borra el json, el negativo normal pasa igual, porque corta la guarda;
    - pero en el rojo provocado (la guarda sin `exit`), `publish.mjs check` falla por
      `[published.testnet] de Published.toml no tiene deployments/testnet.json` (`contracts/scripts/publish.mjs:599-601`)
      **antes** de `npm ci`, y N2b no se pone en rojo.
  - **BuildKit:** esta máquina sigue sin buildx (`docker buildx` da "unknown command"). La parte BuildKit del rojo va en
    un **PR desechable** que se cierra sin merge (T6-7).
    > Decisión (2026-11-04): BuildKit por PR desechable y no con un plugin buildx local, porque el plugin suma una
    > descarga binaria y deja caché de BuildKit en el daemon compartido, que solo se limpia con `prune`.
  - **Nuevo 🔵 del MID:** el paso 9 del checklist del owner (`app/README.md:263`) usa `curl -sSI <URL>`, que es un
    **HEAD**. Caddy 2.11.7 tiene el bug de `encode` con HEAD (TASK-2 §2), así que pasa a GET:
    `curl -sS -D - -o /dev/null <URL>`.
  - **§0 bis:** el baseline de `master` después de #8, leído de la CI de `ec359ec` y `acdc669`.
  - **§R-6 de #17 con el cuarto grep** (MINOR-2 de la revisión de PR #48), para todo reporte y doc de TASK-6.
  - **Reglas comunes que no aplican a TASK-6:** el worktree congelado de #8 (ahora está en `master`), la localnet de
    #14 y la coordinación de puertos con #14 (mergeado). Los puertos propios de #15 siguen.
  - El MID no tocó ningún otro archivo. Las líneas de `app/README.md` y `STATUS.md` que TASK-6 cambia están en TASK-6
    §3.3.
- **v1.5 (2026-11-04):** surge de la revisión del MID de TASK-3 (PASA, 11/11) y del hallazgo **H-1** del DEV.
  - **H-1:** la comprobación (b) del `RUN` de bundle no detecta un `localnet.json` embebido. Vite 8 emite el JSON como
    objeto con template literals (``network:`localnet` ``), y el patrón solo aceptaba comillas dobles.
  - Se corrige **en este PR** con el nuevo **TASK-2b**: el patrón pasa a ser
    `network"?:[^[:alnum:]]localnet[^[:alnum:]]`, que acepta cualquier delimitador y no tiene comillas que escapar.
  - El literal del Dockerfile de §3.2 queda actualizado.
  - Se agrega la **parte 3** del Anexo A (H-1..H-5), con rojo antes y verde después.
  - TASK-2b también cubre los docs que dependen del cambio: la línea (b) del README, `style-src` confirmado por
    TASK-3, y la fila de TASK-3 y H-1 en STATUS.
- **v1.4 (2026-11-04):** surge de la revisión del MID de TASK-5 (NO PASA, 2 MINOR de docs). Afecta solo a TASK-5.
  - **MINOR-1:** el checklist del owner pasa a un lugar **permanente**, una subsección
    "Conectar Railway (owner, no delegable)" de `app/README.md`, con los 10 pasos completos de la §9 del plan, las
    watch paths **literales** incluidas. `STATUS.md` remite a esa subsección y no a la §9 del plan, que desaparece en
    el housekeeping.
  - **MINOR-2:** el porqué de `Referrer-Policy` dice lo que la cabecera hace de verdad. Se omite el `Referer`; el
    `Origin` de los pedidos CORS sigue yendo, porque lo pone el navegador y gRPC-web lo necesita.
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
**Lo que NO entrega:** nada en Railway ni ninguna publicación (owner); `testnet.json` (#8); la URL pública, el
registro del smoke B y `Closes #15` (v1.6: van en TASK-5 de #16, S-8; D-20261104-05 (2)); code-splitting (#58, P-3);
`railway.json` (P-1: los servicios nuevos no lo leen).

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

### 0 bis. Baseline para TASK-6 (v1.6): `master` `ec359ec` después de #8

El MID lo leyó de la CI con `gh run view <run> --log` el 2026-11-04 a las 15:36Z. `acdc669` es el merge de #8
(PR #48), y `ec359ec`, su housekeeping (solo docs). Los dos runs dan los mismos valores.

| Área | Gate | Baseline | Fuente |
|---|---|---|---|
| CI @ `ec359ec` | run `push` 41859161302 | 🟢 `contracts`, `app`, `deploy-image` y `framework-drift` success | `gh run view 41859161302 --json jobs` |
| CI @ `acdc669` | run `push` 41858653878 | 🟢 los mismos 4 jobs en success | `gh run view 41858653878 --json jobs` |
| app | `npm ci` / `npm audit signatures` / `npm audit --omit=dev --audit-level=high` | 🟢 293 paquetes (11 *moderate* solo dev, #35); 292 firmas verificadas (143 *attestations*); `found 0 vulnerabilities` | log del job `app`, los dos runs |
| app | lint / typecheck / `npm test -w app` | 🟢 exit 0 / exit 0 / **1156 tests** en **65 archivos** | ídem |
| app | `VITE_SUI_NETWORK=testnet npm run build -w app` | 🟢 `dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB` | ídem (Node `v26.13.0` del `setup-node`, resuelto desde `.nvmrc` = 26) |
| contracts | test / `node --test` / `check` | 🟢 `Total tests: 83; passed: 83; failed: 0` / `tests 104`, `pass 104`, `fail 0` / **`1 despliegue(s) válidos y coherentes con Published.toml`** | log del job `contracts`, los dos runs |
| `deploy-image` | `bash app/scripts/check-deploy-image.sh . 8080` (BuildKit) | 🟢 **camino positivo**: `P1 ok` … `P12 ok` y `OK (positivo): …` (P13) con `::notice::`; P7 sobre `/assets/index-B3BeMVQC.js` (el mismo hash que el job `app`), P8 `zstd`. La imagen todavía usa Node 26.12.1 | log del job `deploy-image`, los dos runs |
| Imágenes (DL-8) | Docker Hub y registry, sin credenciales | `node:26.13.0-bookworm-slim` → índice `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9` (Hub `last_updated` 2026-10-28T23:41:51Z; el registry da el mismo `docker-content-digest`); release v26.13.0 `published_at` **2026-10-28T16:57:41Z**, así que cumple 7×24 h **desde 2026-11-04T16:57:41Z**. `caddy:2.11.7-alpine` → `sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5`, sin cambios. `rhysd/actionlint:1.7.12` → `sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667`, sin cambios | `curl https://hub.docker.com/v2/repositories/library/<repo>/tags/<tag>`, `registry-1.docker.io/v2/library/node/manifests/…` con token anónimo, `gh api repos/nodejs/node/releases` |
| Docker (máquina local) | `docker --version`, `docker buildx version`, `docker system df` | `Docker version 29.1.3`; **sin buildx**; 2 contenedores y 3 imágenes ajenos (`busybox`, `postgres:16-alpine`, `postgres:17`); **Build Cache 0 B** | medido por el MID hoy |
| Puertos | `ss -ltn` | 8090-8093, 9230 y 4174 libres | medido por el MID hoy |

**Cero delta en TASK-6:** no cambia `app/src/`, tests, `contracts/` ni `.github/`. El bundle que arma la imagen con
Node 26.13.0 tiene que ser `index-B3BeMVQC.js`, el mismo de la CI (T6-8).

## Decisiones del owner (D1..D6, no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Hosting en **Railway**: el repo deja la imagen lista; crear y conectar el servicio y publicar es del owner | D-20261104-01 (2) |
| D2 | Sin `railway.json`/`railway.toml`: `Dockerfile` en la raíz y los settings de Railway en el checklist del owner | D-20261104-03 (1), P-1 = (a) |
| D3 | CSP y cabeceras aplicadas (Caddy), **sin COOP**; si una wallet real no conecta, solo la CSP pasa a `Report-Only` | D-20261104-03 (2), P-2 = (a) |
| D4 | El code-splitting sale de #15 (issue aparte: lo redacta el MAYOR y lo crea el orquestador) | D-20261104-03 (3), P-3 = (b) |
| D5 | Favicon SVG propio y simple | D-20261104-03 (4), P-4 = (a) |
| D6 | Mergear antes de #8 con `Refs #15`; `Closes #15` en el PR posterior a #8 (TASK-6). **v1.6:** la segunda mitad la reemplaza D-20261104-05 (2): TASK-6 también va con `Refs #15`, y `Closes #15` va en TASK-5 de #16 | D-20261104-03 (5), P-5 = (a); D-20261104-05 (2) |

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
- **Greps de salida: §R-6 de #17 (3 greps, `HANDOFF_SMOKE_MVP.md:149-153` @ `1c2bb2a`) más el cuarto grep de MINOR-2
  de PR #48 (v1.6.1),** sobre todo archivo del diff, el reporte y cada salida que se pegue. Va `/usr/bin/grep`, con el
  output pegado:
  ```bash
  /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' <archivos>
  /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' <archivos>
  /usr/bin/grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <archivos>
  /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}' <archivos>
  ```
  - El cuarto viene de MINOR-2 de la revisión de PR #48: una abreviatura 4+4 de una cuenta pasó los otros tres. #17
    todavía no lo incorporó a su §R-6.
  - Cada coincidencia de los greps 1, 2 y 4 se **clasifica** en el reporte, y se acepta **solo si se atribuye** a un
    valor conocido. Para atribuirla se compara el prefijo y el sufijo con:
    - los IDs de `contracts/deployments/testnet.json` (completos solo si ya están ahí; si no, abreviados);
    - el ID de `GAME` (T6-9b);
    - los digests de imagen de §3.1, §3.2 y §0 bis;
    - un SHA de commit.

    Lo que no se puede atribuir a ninguno **se quita**, aunque parezca un ID de objeto: una cuenta abreviada, como
    `0x1234…abcd`, no se distingue de un objeto a simple vista. Una **dirección de cuenta**, completa o abreviada,
    **siempre se quita**.
  - **Nunca** se pega un volcado del DOM (`innerText`, `outerHTML`) del lobby ni del detalle: muestran el creador y el
    oponente con `shortAddress` y la dirección completa en `title` (`LobbyList.tsx:29`, `GameDetail.tsx:10`). Solo se
    pegan los campos que pide cada paso.
  - El grep 3 tiene que dar vacío, salvo la línea que transcribe el propio grep (este handoff, o un doc que lo copie).
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

**v1.6:** TASK-1..TASK-5 y TASK-2b están en PASA y mergeados (PR #57). #8 está mergeado (PR #48). TASK-6 está
**autorizado** y corre solo, en `feature/issue-15-task6`, con las reglas propias de su §2.

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
    if grep -rqE 'network"?:[^[:alnum:]]localnet[^[:alnum:]]' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \
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
      `caddy:2.11.7-alpine@sha256:e70b…4ee5`. (v1.6: TASK-6 sube la de Node a
      `node:26.13.0-bookworm-slim@sha256:bc0a…c1d9`; la de Caddy no cambia.)
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
- [ ] (v1.6.1, SUG-5) La etapa se llama `build` (`AS build`). Si se le cambia el nombre, hay que cambiar también N2b
      de `app/scripts/check-deploy-image.sh`, que se ancla a `[build …]`: si no, con BuildKit vuelve a fallar abierto.

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
      (v1.6: TASK-6 lo ancla a la cabecera del paso de cada builder; ver TASK-6 §3.2.)
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
  - las cabeceras y la CSP, con el motivo de cada origen de `connect-src` y por qué no hay COOP (popup de Slush).
    Para `Referrer-Policy: no-referrer`, el porqué es: "los pedidos a terceros (fullnode, Slush) y los enlaces al
    explorador no llevan `Referer`, es decir, ni la URL ni la ruta de la app. El `Origin` de los pedidos CORS sigue
    yendo: lo pone el navegador y gRPC-web lo necesita" (v1.4);
  - **subsección "Conectar Railway (owner, no delegable)"** (v1.4), con los pasos 1-10 de la §9 del plan **completos
    y literales**:
    - el paso 2 con New Project → Deploy from GitHub repo;
    - las watch paths del paso 5, en un bloque de código idéntico al del plan;
    - en el paso 6, región y sleep a elección del owner;
    - en el paso 7, el puerto que propone Railway;
    - en el paso 8, "Deploy latest commit" si no arrancó solo;
    - en el paso 9, el rollback **o** la pausa del servicio;
    - el aviso de que, desde el paso 3, cada merge a `master` que toque las watch paths publica el sitio (N-2).
    - El paso 1 agrega como precondición que TASK-3 (si no corrió en #15) y TASK-6 estén en PASA;
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
  - "Pendientes del usuario": una línea que remite a `app/README.md`, "Conectar Railway (owner, no delegable)"
    (v1.4), sin copiar los pasos;
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

## TASK-2b: la comprobación (b) del bundle detecta `localnet` en cualquier forma (H-1) — área: app/ci + docs

### 1. Historia de usuario del task
**Como** owner, **quiero** que la imagen se niegue a construirse si por cualquier vía entra un `localnet.json` al
bundle, **para** que la segunda barrera de "Origen del build publicado" funcione de verdad y no dependa solo de la
lista blanca del `.dockerignore`.

### 2. Contexto
- **Qué falla:** `Dockerfile:22` busca `network:"localnet"|"network":"localnet"`. El DEV midió en TASK-3 (L-3, bundle
  real de localnet) que Vite 8 emite el registro como
  ``var _R={schemaVersion:1,network:`localnet`,chainId:`…`,…}``, con template literals, y el patrón da 0 coincidencias.
- **Por qué no es grave hoy:**
  - la lista blanca (E-1f/E-1g) impide que `localnet.json` entre al contexto;
  - la comprobación (a) exige los 4 IDs de `testnet.json`;
  - el Dockerfile y la imagen todavía no se publicaron.
- **Patrón nuevo:** `network"?:[^[:alnum:]]localnet[^[:alnum:]]`.
  - Acepta `"network":"localnet"`, `network:"localnet"`, ``network:`localnet` `` y `network:'localnet'`.
  - **No** toma `r===`localnet`` (el `burnerWalletEnabled` de `config.ts`), ``e.network===`localnet` `` (`dappKit.ts`),
    `localnet:{grpcUrl…}` (`networks.ts`) ni `` `sui:localnet` `` (wallet-standard). El MID lo comprobó contra el bundle
    de testnet actual, con 0 coincidencias, y contra muestras de las 4 formas.
  - Es POSIX ERE y no lleva comillas simples ni backticks, así que no hay que escaparlo dentro del `RUN '…'`.
  - El grep del host del MID es `ugrep`, y en él `[[:punct:]]` no tomó el backtick. Por eso se usa
    `[^[:alnum:]]`, y por eso **hay que probarlo dentro de la imagen** (GNU grep de bookworm), que es lo que hacen
    H-2 y H-3.

### 3. Qué implementar
- **`Dockerfile`, línea de (b):** reemplazar solo el patrón:
  `if grep -rqE 'network"?:[^[:alnum:]]localnet[^[:alnum:]]' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \`
  Es idéntico al literal de §3.2 v1.5; el mensaje no cambia. Nada más del Dockerfile cambia.
- **`app/README.md`:**
  - en "La imagen", el ítem "que no haya `network:"localnet"`" pasa a ser "que no haya un registro de `localnet`
    embebido (`network` con valor `localnet` en cualquier forma: comillas dobles, simples o el template literal que
    emite Vite 8)";
  - en la CSP, el ítem de `style-src 'self'` pasa de "se confirma en TASK-3 … pendiente" a "**confirmado** en TASK-3
    de #15: con el kit montado (lobby, modal, rutas profundas), 0 violaciones; Lit aplica sus estilos por
    `adoptedStyleSheets` y no inserta `<style>`".
- **`documents/STATUS.md`:**
  - fila de baseline de TASK-3 (el snippet del DEV), más una fila de TASK-2b con el resultado de la parte 3;
  - en la fila del ciclo #15, TASK-3 pasa a ✅ y se agrega "H-1 corregido (TASK-2b)".
- **`documents/SMOKE_RAILWAY_DEPLOY.md`:** la parte 3 llena (Anexo A, parte 3).

### 4. Archivos
- **Tocar:** `Dockerfile` (solo esa línea), `app/README.md`, `documents/STATUS.md`, `documents/SMOKE_RAILWAY_DEPLOY.md`.
- **NO tocar:** `.dockerignore`, `app/Caddyfile`, `app/scripts/check-deploy-image.sh`, `ci.yml`, `app/src/**`,
  `contracts/**`.

### 5. Verificaciones
1. **Anexo A, parte 3 (H-1..H-5),** con resultados pegados.
2. `git diff Dockerfile` muestra **una** línea cambiada, la de (b).
3. Gate `app`: **no aplica**, porque no cambia `app/` salvo el README. Se declara.
4. Greps sobre el diff: claves 0, rutas personales 0, hex nuevos 0.

### 6. Smoke
Anexo A, parte 3.

### 7. Criterios de aceptación
- **H-2 (rojo):** con el patrón **viejo**, un contexto con `localnet.json` forzado **construye la imagen**. Esto
  reproduce H-1.
- **H-3 (verde):** con el patrón **nuevo**, el mismo contexto **falla** en (b) con `ERROR (#15): localnet en el bundle`.
- **H-4:** el camino positivo sin `localnet.json` sigue en verde (`check-deploy-image.sh` con `exit=0`), sin falsos
  positivos con GNU grep.
- **H-5:** el camino negativo sigue en verde.
- **Cierre:** Docker vuelve a la línea base y el scratchpad queda sin el ensayo.

### 8. Al terminar
Reporte §5. Lo revisa el MID; el commit va antes del ready del PR #57.

---

## TASK-6: Node 26.13.0, N2b anclado, camino positivo real y E-6 con la app real — área: app/ci + docs

> **v1.6: autorizado** por el addendum S-6 de #17. Reemplaza a la TASK-6 de v1..v1.5
> (`git show 5e51356:documents/HANDOFF_RAILWAY_DEPLOY.md`). El PR va con **`Refs #15`**, sin la URL y sin `Closes #15`
> (D-20261104-05 (2)).

### 1. Historia de usuario del task
**Como** owner, **quiero** que la imagen de Railway use el mismo Node que el gate local y la CI, que el chequeo de la
guarda no dependa de cómo imprime cada builder, y que la app real servida por la imagen funcione con la CSP contra
testnet, **para** conectar Railway (S-7) sabiendo que lo que se va a publicar ya se probó con los IDs reales.

**Lo que NO entrega:**
- la URL pública, el registro del smoke B y `Closes #15`: van en TASK-5 de #16 (S-8);
- conectar Railway ni publicar (S-7, owner, no delegable);
- Caddy 2.11.8: no se pide, porque P1-P13 y el smoke leen las cabeceras con GET;
- cambios en `ci.yml`, `.dockerignore`, `app/Caddyfile` o `app/src/`.

### 2. Contexto y reglas propias (verificado por el MID sobre `master` `ec359ec`)

**Precondiciones:**
- #8 está mergeado (PR #48 → `acdc669`): `contracts/deployments/testnet.json` y `contracts/Published.toml` están en
  `master`, y `contracts/deployments/` tiene solo `testnet.json`.
- El orquestador crea la branch `feature/issue-15-task6` desde `master` `ec359ec`, con el worktree aparte.
- **(v1.6.1, MINOR-2)** El orquestador commitea este handoff (v1.6.1) en `feature/issue-15-task6` **antes** de
  autorizar al DEV. Por eso el HEAD que ve el DEV es ese commit, hijo de `ec359ec`, y no `ec359ec`. Los diffs de TASK-6
  (§5.2, C-4) se cuentan contra ese commit y tienen los 5 archivos de §4, sin el handoff.
- **(v1.6.1, punto 6 del MAYOR) D-20261104-05 fuera de `master`:** se cita como
  `git show 1c2bb2a:documents/DECISIONES.md`, el head pusheado de `origin/feature/issue-17-mvp-smoke`. Condiciones:
  - (a) el body del PR de TASK-6 la cita así;
  - (b) TASK-6 **no** la copia a `documents/DECISIONES.md` de `master`: chocaría con #17, y SUG-5 de PR #48 ya fija el
    orden 06 > 05;
  - (c) #17 se integra con merge commit, nunca con rebase ni squash, para que `1c2bb2a` siga siendo alcanzable;
  - (d) #15 se cierra en S-8, antes de que #17 llegue a `master`. La revisión de integración de S-8 comprueba que la
    cita se pueda resolver, y el housekeeping de ese cierre dice que D-20261104-05 llega con #17.
- **Puerta de DL-8 (T6-0):** el DEV no empieza antes de **2026-11-04T16:57:41Z** (`date -u`). Es la hora en que la
  release v26.13.0 cumple 7×24 h. Si la mide antes, es STOP: espera y no avanza.

**Qué hay hoy:**
- **`Dockerfile:3-4`:** el comentario `# Node 26.12.1 por la regla de 7 días (DL-8); TASK-6 sube a 26.13.0.` y
  `FROM node:26.12.1-bookworm-slim@sha256:88e480776c6149ff1d098cd304f44bf18057fb5d284a3329b78162d29821e28c AS build`.
  Las líneas 5-33 son las de §3.2 con el patrón (b) de TASK-2b, y no cambian.
- **`app/scripts/check-deploy-image.sh:100-104`:** N2b es `if grep -qE 'RUN npm ci' "$log.plain"; then … fail "N2b: …"`
  y busca en todo el log.
  - Con BuildKit, el error de un `RUN` imprime un extracto del Dockerfile alrededor de la línea que falla
    (`  13 | >>> RUN npm ci`). Hoy hay margen, porque la guarda está en `:9` y `npm ci` en `:13`, pero si se juntan
    líneas el extracto daría un rojo falso (🔵 3 de PR #57).
  - El resto del script no cambia.
- **`.github/workflows/ci.yml:183-196`:** el job `deploy-image` es el de TASK-4 §3. **No se toca.**
- **`deploy-image` en `master`** ya corre por el camino positivo con los IDs reales (§0 bis): P1-P13, con P7 sobre
  `/assets/index-B3BeMVQC.js`.
- **El negativo ya no corre en `.` ni en la CI.** Se ensaya en una copia del contexto **sin `testnet.json` ni
  `Published.toml`**, que es el estado de `master` antes de #8:
  - en el rojo provocado, la guarda sin `exit` deja seguir el build;
  - con `Published.toml` presente y sin el json, `publish.mjs check` falla en el paso siguiente
    (`[published.testnet] de Published.toml no tiene deployments/testnet.json`, `contracts/scripts/publish.mjs:599-601`),
    **antes** de `npm ci`, y el rojo de N2b no se produciría;
  - sin los dos archivos, `check` da `0 despliegues` y el build llega a `npm ci`.
- **Cabeceras de paso de cada builder** (el log que lee N2b ya pasó por el `sed` de ANSI de N2a):
  - **clásico:** `Step <k>/<m> : RUN npm ci`, sin relleno (en TASK-4 de #15 fue `Step 9/19`);
  - **BuildKit `--progress=plain`:** `#<n> [build <k>/<m>] RUN npm ci`, con `<k>` **alineado con espacios** al ancho
    de `<m>`. `prefixCommand` de `moby/buildkit` (`frontend/dockerfile/dockerfile2llb/convert.go`) hace
    `fmt.Sprintf("%*d/%d] ", int(1+math.Log10(float64(ds.cmdTotal))), …)`.
  - La etapa `build` tiene 12 pasos (`FROM`, `WORKDIR`, 5 `COPY` y 5 `RUN`; `ENV` no cuenta), así que la cabecera es
    `#<n> [build  9/12] RUN npm ci`, con **dos** espacios.
  - Con un solo espacio en el patrón, N2b no vería nunca esa cabecera y con BuildKit pasaría siempre. Por eso el
    patrón lleva ` +`.
  - El extracto del Dockerfile empieza con espacios y número (`  13 | …`), así que ningún patrón anclado lo toma.
- **Docs que cambian** (las líneas son de `ec359ec`):
  - `app/README.md:80` (imagen de build);
  - `:161-163` (el 403 de Slush, SUG-2 de PR #48);
  - `:180-181` (cómo se ensaya el negativo);
  - `:186` (N2b);
  - `:209-210` (🔵 1);
  - `:224` (🔵 2);
  - `:262-263` (el paso 9 del checklist: SUG-2 y GET);
  - `:280-281` (la nota de Node);
  - `documents/STATUS.md:173` (fila de #15) y `:175` ("Siguiente", 🔵 4), más una fila de baseline;
  - `documents/SMOKE_RAILWAY_DEPLOY.md`: parte B nueva.
- **Watch paths:** el `Dockerfile` es una watch path de Railway (checklist, paso 5). Este merge no publica nada,
  porque Railway se conecta recién en S-7.

**Reglas propias de TASK-6** (reemplazan a estas reglas comunes):
- **#8:** está en `master`; ya no hay branch congelada que leer. Todo se lee del worktree de TASK-6.
- **Localnet:** TASK-6 no usa localnet, ni `sui` de ningún tipo.
- **Puertos:** los propios de #15, 8090 (script), 8092 (E-6) y 9230 (Chrome), con el `ss -ltn` previo. La
  coordinación con #14 ya no aplica, pero si un puerto está ocupado **no** se toca el proceso ajeno: se usa el
  siguiente libre y se declara.
- **Testnet:** solo lecturas públicas sin claves (la app en Chrome headless y `curl` a orígenes públicos). Nunca
  `sui client` ni `sui keytool`, y nada en `~/.sui/`.
- Todas las demás reglas comunes siguen: Docker por nombre o ID y sin `prune`, Chrome con perfil propio y cierre por
  PID, sin rutas personales, §R-6 con los 4 greps, y sin commits ni pushes.

### 3. Qué implementar

#### 3.1 `Dockerfile`: solo las líneas 3 y 4
```dockerfile
# Node 26.13.0: la misma versión que el gate local y la CI; fijada por digest con la regla de 7 días (DL-8).
FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
```
El checklist de §3.2 sigue valiendo, con la imagen de Node nueva. `git diff Dockerfile` muestra 2 líneas cambiadas.

#### 3.2 `app/scripts/check-deploy-image.sh`: solo el bloque de N2b (`:100-104`)
```bash
  # N2b: el build tiene que cortarse en la guarda, sin llegar a npm ci. Se busca la cabecera del paso y no el extracto
  # del Dockerfile que BuildKit imprime alrededor del RUN que falla. BuildKit: "#<n> [build <k>/<m>] RUN npm ci", con
  # <k> alineado con espacios; clásico: "Step <k>/<m> : RUN npm ci".
  if grep -qE '^(#[0-9]+ \[build +[0-9]+/[0-9]+\] |Step [0-9]+/[0-9]+ : )RUN npm ci' "$log.plain"; then
    tail_log "docker build" "$log"
    fail "N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)"
  fi
```
- El mensaje de FALLO no cambia.
- Es **una** regex con las dos ramas del texto obligatorio: `^#[0-9]+ \[build +[0-9]+/[0-9]+\] RUN npm ci` para
  BuildKit, con ` +` en lugar del espacio único (§2), y `^Step [0-9]+/[0-9]+ : RUN npm ci` para el clásico.
- `git diff app/scripts/check-deploy-image.sh` muestra solo este bloque.

#### 3.3 Docs
- **`app/README.md`:**
  - `:80`: `- **build** (\`node:26.13.0-bookworm-slim\`):`.
  - `:161-163`, "Ícono remoto de Slush":
    - "Qué pasó en el ensayo" queda así: "`api.slush.app` respondió 403 de Cloudflare (en el navegador, un error de
      CORS, no de CSP). El kit se quedó con el ícono `data:` por defecto. El 403 no depende del origen: con `curl`
      público sale igual con `Origin: https://example.com` (revisión de PR #48), así que puede repetirse en la URL
      pública";
    - la "Conclusión" agrega que, si en el smoke B no aparece el error, el ícono remoto se mide ahí;
    - con el resultado de T6-9: si en E-6 la metadata respondió y el ícono se pudo medir, se dice qué pasó.
  - `:180-181`, el modo negativo: "**Negativo**, sin `contracts/deployments/testnet.json`. Desde #8, `master` lo
    tiene, así que en el repo `. 8090` corre el **positivo**. El negativo se ensaya en una copia del contexto sin
    `testnet.json` **ni** `Published.toml`, como el `master` anterior a #8:
    `bash app/scripts/check-deploy-image.sh <copia> 8090`".
  - `:186`, N2b: "el log no tiene la cabecera del paso `RUN npm ci` (BuildKit: `#<n> [build  9/12] RUN npm ci`, con
    el número alineado con espacios; clásico: `Step <k>/<m> : RUN npm ci`), es decir, el build se cortó en la
    guarda. El extracto del Dockerfile que BuildKit imprime alrededor del `RUN` que falla no cuenta".
  - `:209-210` (🔵 1): "corre el mismo script (`. 8080`) en cada PR y en cada push a `master`; desde #8, por el
    camino positivo con los IDs reales". Sin ID de run ni PR.
  - `:224` (🔵 2): "TASK-6 de #15 en PASA;".
  - `:262-263`, el paso 9:
    - (v1.6.1, MINOR-4: el mismo límite que T6-9g) "consola sin violaciones de CSP, incluido el ícono remoto de
      Slush. Por el 403 de Cloudflare de `api.slush.app`, se admiten **solo** los mensajes del pedido a
      `https://api.slush.app/api/wallet/metadata` (el bloqueo de CORS y `net::ERR_FAILED`/403) y el
      `console.error: Error fetching metadata TypeError: Failed to fetch` del kit, con "Slush" listado en el modal.
      Cualquier otro error de consola o de red es rojo. Si esos mensajes no aparecen, el ícono remoto se mide ahí";
    - "`curl -sS -D - -o /dev/null <URL>` (GET: con HEAD, el `encode` de Caddy 2.11.7 falla) con las cabeceras de la
      tabla de arriba".
  - `:280-281`: "Node 26.13.0 en la imagen (TASK-6 de #15): la misma versión que el gate local y la CI (`.nvmrc` =
    26, `engines`, la guarda de `publish.mjs`)".
  - **No** se toca `:71-73` ("URL pública: se completa después de #8"): lo reemplaza TASK-5 de #16 (S-8).
- **`documents/STATUS.md`:**
  - `:173`, fila de #15:
    - "handoff v1.5" pasa a "handoff v1.6";
    - agrega "TASK-6 (`<sha>`, `Refs #15`): Node 26.13.0, N2b anclado (rojo provocado en los dos builders), camino
      positivo local con los IDs reales y E-6 con la app real";
    - "**Pendiente:**" queda así: "S-7 (owner: conectar Railway con el checklist y el smoke B) y S-8 (TASK-5 de #16:
      URL, registro del smoke B y `Closes #15`)". Se quita "URL y `Closes #15`" de TASK-6.
    - El DEV deja `<sha>` literal: lo pone el orquestador al commitear, como en los tasks anteriores (v1.6.1, MINOR-1).
  - `:175`, "Siguiente" (🔵 4): se quita "#15 TASK-6 (S-6, …);". La fila empieza en "Railway (S-7, owner)".
  - Baselines: una fila nueva arriba, "imagen @ `feature/issue-15-task6` (TASK-6 de #15), Docker 29.1.3 sin buildx +
    CI con BuildKit, 2026-11-04", con el resultado de T6-1..T6-6 y T6-8..T6-10. En la celda de los runs del PR
    desechable, el DEV deja **`⏳ (T6-7)`** (v1.6.1, MINOR-1).
- **`documents/SMOKE_RAILWAY_DEPLOY.md`:**
  - al final, la **parte B** del Anexo A con las filas T6-0..T6-10 y C-4, llenas durante la corrida. La fila T6-7
    queda en **`⏳ (T6-7)`**;
  - "Reporte final (parte B)" (v1.6.1, SUG-7), con PASA/TOTAL de T6-0..T6-10 y C-4, que se cierra después de T6-7;
  - la tabla "Smoke B del owner" (B-1..B-6), con ⏳: la llena TASK-5 de #16 (S-8) con lo que dé el owner;
  - en la cabecera, `Estado` suma **"parte B: EN CURSO (T6-7 pendiente); smoke B del owner pendiente (S-7)"**. Nunca
    "PASA": el veredicto es del MID (v1.6.1, MINOR-1).
- **(v1.6.1, MINOR-1) Quién llena qué:**

  | Celda | La llena | Cuándo |
  |---|---|---|
  | Todo lo de §3.3 menos lo de abajo | DEV | durante la corrida |
  | Fila T6-7, la celda de runs de la baseline de STATUS, el `Estado` del SMOKE y el "Reporte final (parte B)" | orquestador | en un commit propio de `feature/issue-15-task6`, después de correr T6-7 |
  | `<sha>` de TASK-6 en STATUS `:173` | orquestador | al commitear TASK-6 |
  | Veredicto PASA de TASK-6 | MID | **después** de revisar el commit de T6-7 |

### 4. Archivos
- **Tocar:** `Dockerfile` (líneas 3-4), `app/scripts/check-deploy-image.sh` (bloque de N2b), `app/README.md`,
  `documents/STATUS.md` y `documents/SMOKE_RAILWAY_DEPLOY.md`.
- **NO tocar:**
  - `.github/**`, `.dockerignore`, `app/Caddyfile`, `app/src/**`, `app/package.json`, `package-lock.json` ni
    `contracts/**`;
  - `agents.md`, `README.md` raíz y `documents/DECISIONES.md` (D-20261104-05 llega con #17);
  - este handoff y el plan.

### 5. Verificaciones
Anexo A, **parte B**: T6-0..T6-10 y C-4, con el output pegado y las columnas llenas durante la corrida. Además:
1. **Gate `app`: no aplica,** porque no cambia `app/src/`, tests ni dependencias. Se declara con
   `git diff --stat -- app/src app/package.json package-lock.json contracts .github` vacío. El build de la app con
   Node 26.13.0 lo hace la imagen en T6-8, y su bundle tiene que coincidir con el de la CI.
2. `git diff --stat` (contra el commit del handoff v1.6.1, MINOR-2) muestra solo los 5 archivos de §4.
3. §R-6: los 4 greps sobre el diff (`git diff`), el reporte y las filas de la parte B, con cada coincidencia
   atribuida a un valor conocido o quitada (reglas comunes, v1.6.1).

### 6. Smoke
Anexo A, parte B, va a `documents/SMOKE_RAILWAY_DEPLOY.md`. El smoke B del owner es S-7, y su registro, S-8.

### 7. Criterios de aceptación
- T6-0: la hora UTC es igual o posterior a 2026-11-04T16:57:41Z, y la edad de v26.13.0, ≥ 168 h, medida en T6-1.
- T6-1: el digest de Node (`bc0a…c1d9`) es el mismo en Hub, el registry y el pull, y `node --version` en la imagen da
  `v26.13.0`. Caddy no cambia.
- El diff del `Dockerfile` son 2 líneas, y el del script, solo el bloque de N2b. shellcheck da 0 hallazgos.
- **Los dos builders:**
  - **clásico (local):** verde en el negativo (T6-5) y rojo **por N2b** con la guarda sin `exit` (T6-6);
  - **BuildKit (CI, PR desechable):** run A verde con `OK (negativo)` y run B en rojo con `FALLO: N2b` (T6-7). Lo
    corre y lo registra el orquestador; el MID no da PASA sin ese commit (v1.6.1, MINOR-1).
- T6-8: positivo local con los IDs reales, P1-P13, y P7 sobre `index-B3BeMVQC.js`.
- T6-9: E-6 con la app real, con 0 `securitypolicyviolation`.
  - Los únicos errores admitidos son los del límite de SUG-2: el pedido a `api.slush.app` y el `console.error` con
    esa firma exacta.
  - Una violación de `img-src` por un ícono remoto es **STOP**, no un remedio (v1.6.1, MINOR-5).
  - "Slush" aparece en el modal, y el popup tiene `window.opener`.
  - 0 pedidos a MVR.
- C-4: Docker vuelve a la línea base de T6-0 (contenedores, imágenes y *Build Cache*) sin `prune`. Los directorios
  quedan borrados, los puertos libres y el repo solo con los 5 archivos.
- **Precondición del checklist, sin cambios:** TASK-6 en PASA y `deploy-image` positivo en `master` **antes** de S-7.
  Después del merge, el orquestador comprueba que el run `push` de `master` dio `deploy-image` positivo y anota el run
  ID en STATUS, no en el README.

### 8. Al terminar
- El reporte va con la plantilla de `FLUJO_AGENTES.md` §5 y la parte B llena, en un `.txt` del scratchpad. El
  orquestador lo lee completo, corre los greps de §R-6 y lo agrega a `REPORTES_RAILWAY_DEPLOY.md`.
- Hay que declarar las imágenes que se descargaron y si se borraron.
- En el reporte, T6-7 va como `⏳ (T6-7)`: lo corre el orquestador (v1.6.1, MINOR-1).
- **Secuencia (v1.6.1, MINOR-1):**
  1. el MID revisa T6-0..T6-6 y T6-8..T6-10 y propone el commit;
  2. el orquestador commitea TASK-6 y pone el `<sha>`;
  3. el orquestador corre T6-7 y llena sus celdas en un commit propio;
  4. el MID revisa ese commit y **recién ahí** da PASA a TASK-6;
  5. el PR de TASK-6 pasa a ready.
- El MID propone el body del PR:
  - `Refs #15` y D-20261104-05 (2), citada como `git show 1c2bb2a:documents/DECISIONES.md` (condición (a) de §2);
  - el run del PR, con `deploy-image` positivo;
  - los dos runs del PR desechable;
  - P1-P13 y E-6.
- El body **no** lleva `Closes`. La revisión de integración del MAYOR va publicada en el PR antes del merge.
- El PR desechable de T6-7 lo abre, cierra y borra el orquestador. **Nunca** se mergea. Condiciones del MAYOR:
  - draft;
  - **antes de S-7**, con Railway sin conectar;
  - el body dice que es desechable y enlaza el PR de TASK-6;
  - la branch se borra al cerrarlo.

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

## Parte 3: H-1, comprobación (b) del bundle (TASK-2b)

Puertos: 8090 (script) y nada más. Línea base de Docker al empezar (`docker ps -aq`/`docker images -aq` en
`<scratchpad>/docker-base-15-h/`), como en V-1.

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| H-0 | Línea base de Docker; `ss -ltn 'sport = :8090'` sin filas | Base anotada (contenedores, imágenes); puerto libre | (se llena durante la corrida) | ⏳ |
| H-1 | Contexto `<scratchpad>/h1-15/ctx` igual que E-1a..E-1e: archivos versionados y nuevos, `publish.mjs`/`deployment.mjs` de #48, y `testnet.json` y `Published.toml` sintéticos coherentes. **Además, solo en esta copia:** `contracts/deployments/localnet.json`, copiado **literal** de `git show origin/feature/issue-8-testnet-publish:contracts/scripts/fixtures/localnet.deployment.json`, y la línea `!contracts/deployments/localnet.json` agregada al final del `.dockerignore` de **la copia**. `node <ctx>/contracts/scripts/publish.mjs check` | `2 despliegue(s) válidos y coherentes con Published.toml` (localnet no exige `[published.localnet]`); el repo no cambia (`git status`) | (se llena durante la corrida) | ⏳ |
| H-2 | **Rojo, el patrón viejo:** en la copia, volver la línea (b) del `Dockerfile` al patrón viejo (`'network:"localnet"\|"network":"localnet"'`); `docker build --force-rm -t battleship-app:h2-15 <ctx> > <scratchpad>/h1-15/h2.log 2>&1; echo "exit=$?"`; mostrar del log el Step de (b) y el `grep -o` del registro localnet en el bundle si hace falta; `docker rmi battleship-app:h2-15` | `exit=0`: la imagen se construye **con** `localnet` embebido, lo que reproduce H-1 | (se llena durante la corrida) | ⏳ |
| H-3 | **Verde, el patrón nuevo:** restaurar la línea (b) del `Dockerfile` de la copia a la del repo (v1.5); `docker build --force-rm -t battleship-app:h3-15 <ctx> > <scratchpad>/h1-15/h3.log 2>&1; echo "exit=$?"`; `docker rmi battleship-app:h3-15 2>/dev/null \|\| true` | `exit≠0`; el log tiene `ERROR (#15): localnet en el bundle` en el Step de las comprobaciones del bundle; los Steps anteriores (guarda, `check`, `npm ci`, build) pasaron | (se llena durante la corrida) | ⏳ |
| H-4 | **Sin falsos positivos:** borrar `localnet.json` y la línea `!…localnet.json` de la copia; `bash app/scripts/check-deploy-image.sh <ctx> 8090; echo "exit=$?"` | `exit=0`, `OK (positivo)` (P1-P13): con GNU grep, el patrón nuevo no toma nada del bundle de testnet | (se llena durante la corrida) | ⏳ |
| H-5 | Negativo en el repo real: `bash app/scripts/check-deploy-image.sh . 8090; echo "exit=$?"` | `exit=0`, `OK (negativo)` | (se llena durante la corrida) | ⏳ |
| C-3 | **Cierre:** limpieza por la línea base de H-0 con las reglas de C-1 (solo IDs nuevos: `<none>`, `battleship-app:*` y las bases descargadas; sin `prune`); repetir el `comm` (vacío); `rm -rf <scratchpad>/h1-15 <scratchpad>/docker-base-15-h`; `:8090` libre; `git status` solo con los archivos de TASK-2b | Todo limpio | (se llena durante la corrida) | ⏳ |

## Parte B: después de #8 (TASK-6, v1.6; y el smoke B del owner)

> Va a `documents/SMOKE_RAILWAY_DEPLOY.md` como `# SMOKE_RAILWAY_DEPLOY, parte B (después de #8)`, con la misma
> cabecera de plan, issue y fecha.

**Precondiciones:**
- Red: solo lecturas **públicas** de testnet, sin claves (la app en Chrome headless; `curl` a Docker Hub, al registry y
  a `api.slush.app`). Sin localnet ni `sui`.
- Cuentas: ninguna. Ningún agente conecta una wallet.
- Cliente: Docker 29.1.3 sin buildx (builder clásico) en local; BuildKit solo en la CI (T6-7). Chrome headless con
  perfil propio (reglas comunes). Node `v26.13.0` en el host.
- Directorios: `<scratchpad>/n2-15/`, `<scratchpad>/chrome-15-t6/` y `<scratchpad>/docker-base-15-t6/`, todos
  borrados en C-4.
- Puertos: 8090, 8092 y 9230.
- En las tablas, `\|` es el `|` del shell o de `jq`, como en las partes 1-3.

| # | Acción | Resultado esperado | Resultado obtenido | Estado |
|---|--------|--------------------|--------------------|--------|
| T6-0 | **Puerta y línea base:** `date -u`; `git -C <repo> log -1 --format=%h` y `git -C <repo> status --porcelain --untracked-files=all`; `ls <repo>/contracts/deployments`; línea base de Docker como en V-1, en `<scratchpad>/docker-base-15-t6/{ps,img}.txt`, más la fila *Build Cache* de `docker system df`; `ss -ltn` en 8090, 8092 y 9230 | Hora ≥ **2026-11-04T16:57:41Z**: si es antes, **STOP** y se espera. HEAD = el commit del handoff v1.6.1, hijo de `ec359ec` (`git log -1 --format='%h %p'`; se anota el SHA; MINOR-2), y árbol limpio, o solo con lo de TASK-6 si se retoma. `testnet.json` y nada más. Línea base anotada (el MID midió 2 contenedores, 3 imágenes y *Build Cache* 0 B). Puertos libres | (se llena durante la corrida) | ⏳ |
| T6-1 | **V-1 de Node y Caddy:** `.digest` de `https://hub.docker.com/v2/repositories/library/node/tags/26.13.0-bookworm-slim`; `docker-content-digest` del registry con token anónimo (`auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull`, sin imprimir el token, y `curl -I` a `registry-1.docker.io/v2/library/node/manifests/26.13.0-bookworm-slim` con `Accept: application/vnd.oci.image.index.v1+json`); `gh api repos/nodejs/node/releases --paginate --jq '.[] \| select(.tag_name=="v26.13.0") \| .published_at'`; `.digest` de Hub para `caddy:2.11.7-alpine`; `docker pull node:26.13.0-bookworm-slim@<digest completo del FROM de §3.1>`; `docker run --rm --entrypoint node node:26.13.0-bookworm-slim@<el mismo digest> --version` (SUG-3: el digest se copia de §3.1, no de otra fuente). Anotar la hora UTC | Hub = registry = `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9`; `published_at` `2026-10-28T16:57:41Z`, con edad ≥ 168 h a la hora anotada; Caddy `sha256:e70b164d…4ee5` sin cambios; pull OK; `v26.13.0`. Si un digest difiere: **STOP** | (se llena durante la corrida) | ⏳ |
| T6-2 | Aplicar §3.1 y §3.2; `git diff --stat`; `git diff Dockerfile app/scripts/check-deploy-image.sh` | El `Dockerfile` con 2 líneas cambiadas (3-4) y el script con solo el bloque de N2b; se pega el diff | (se llena durante la corrida) | ⏳ |
| T6-3 | **shellcheck** (V-2): `docker run --rm --entrypoint shellcheck -v <repo>:/repo:ro rhysd/actionlint:1.7.12@<digest completo de app/README.md:214> /repo/app/scripts/check-deploy-image.sh; echo "exit=$?"` (SUG-3: el digest se copia de esa línea) | `exit=0`, sin output | (se llena durante la corrida) | ⏳ |
| T6-4 | **Copia sin #8:** desde `<repo>`, `mkdir -p <scratchpad>/n2-15/ctx && git ls-files -z --cached --others --exclude-standard \| xargs -0 cp --parents -t <scratchpad>/n2-15/ctx`, como E-1a; `rm <scratchpad>/n2-15/ctx/contracts/deployments/testnet.json <scratchpad>/n2-15/ctx/contracts/Published.toml`; con Node 26, `node <scratchpad>/n2-15/ctx/contracts/scripts/publish.mjs check; echo "exit=$?"` | `0 despliegues`, `exit=0`. La copia trae el `Dockerfile` y el script de T6-2, sin `node_modules`, `app/dist` ni `.env.local`. `git -C <repo> status` igual que en T6-2 | (se llena durante la corrida) | ⏳ |
| T6-5 | **Clásico, verde:** `bash app/scripts/check-deploy-image.sh <scratchpad>/n2-15/ctx 8090; echo "exit=$?"` | `exit=0`, `Modo negativo…` y `OK (negativo): …`: el patrón nuevo no da un falso rojo | (se llena durante la corrida) | ⏳ |
| T6-6 | **Clásico, rojo provocado de N2b:** en `<scratchpad>/n2-15/ctx/Dockerfile`, la guarda (línea 9) pasa a `RUN test -f contracts/deployments/testnet.json \|\| echo "ERROR (#15): falta contracts/deployments/testnet.json. …"`, sin `>&2; exit 1`, como en 3c de TASK-4. Después: (1) `bash app/scripts/check-deploy-image.sh <scratchpad>/n2-15/ctx 8090; echo "exit=$?"`; (2) para ver la cabecera, `docker build --force-rm -t battleship-app:n2-15 <scratchpad>/n2-15/ctx > <scratchpad>/n2-15/red.log 2>&1; echo "exit=$?"`, `docker rmi battleship-app:n2-15 2>/dev/null \|\| true`, `sed 's/\x1b\[[0-9;]*m//g' <scratchpad>/n2-15/red.log > <scratchpad>/n2-15/red.plain` y `/usr/bin/grep -nE '<patrón de N2b de §3.2, literal>' <scratchpad>/n2-15/red.plain` | (1) `exit=1` con **`FALLO: N2b`**. N1 y N2a pasan: la línea de la guarda se imprime y el build cae más adelante, en las comprobaciones del bundle (sin `testnet.json`, el `require` falla). (2) `exit≠0`, y el grep da **1** línea, `Step <k>/<m> : RUN npm ci`, que se pega | (se llena durante la corrida) | ⏳ |
| T6-7 | **BuildKit, en la CI (PR desechable). Lo corre y lo registra el orquestador; el DEV deja la fila en `⏳ (T6-7)` (MINOR-1).** Va **después** de commitear TASK-6 en `feature/issue-15-task6` y **antes** del ready del PR de TASK-6: (A) una branch desechable desde ese head, con un commit que borra `contracts/deployments/testnet.json` y `contracts/Published.toml`, y un PR **draft** a `master` titulado "[no mergear] #15 TASK-6: N2b con BuildKit". Se espera a que termine el run A: la `concurrency` del PR cancela un run en curso si llega otro push. (B) Un segundo commit con la guarda de T6-6 dispara el run B. Después se cierra el PR **sin merge** y se borra la branch. Los logs se leen con `gh run view <run> --log \| /usr/bin/grep -a -e 'Modo negativo' -e 'OK (negativo)' -e 'FALLO: N2' -e 'RUN npm ci'` | **Run A:** `deploy-image` en success, con `OK (negativo): …` y `::notice::`: con BuildKit, el patrón nuevo no da un falso rojo. **Run B:** `deploy-image` en failure, con **`FALLO: N2b: …`** (`::error::`). Se pegan esa línea y una línea `#<n> …` de la cola del log, que prueba que el build fue BuildKit (SUG-4); si la cola trae la cabecera `#<n> [build  9/12] RUN npm ci`, se pega también. Con eso alcanza: el run A corre en el mismo runner y con el mismo script. Si el run B sale verde, N2b falla abierto con BuildKit: **NO PASA**. `contracts` y `app` de esos runs no cuentan. Se anotan los dos run IDs y el número del PR. El orquestador llena esta fila, la celda de runs de la baseline de STATUS, el `Estado` y el "Reporte final (parte B)" en un commit propio de la branch de TASK-6. El MID da PASA a TASK-6 después de revisar ese commit | ⏳ (T6-7) | ⏳ |
| T6-8 | **Positivo real**, desde `<repo>`: `CHECK_KEEP_TAG=battleship-app:ensayo-15 bash app/scripts/check-deploy-image.sh . 8090; echo "exit=$?"`. Anotar el tiempo | `exit=0`; `P1 ok` … `P12 ok` y `OK (positivo): …` (P13). P7 sobre **`/assets/index-B3BeMVQC.js`**, el mismo de la CI: si difiere, **STOP** y se reportan los dos nombres. P8 `zstd` o `gzip` | (se llena durante la corrida) | ⏳ |
| T6-9a | **E-6 con la app real:** `docker run -d --name deploy-image-e6 --cap-drop=ALL -e PORT=8092 -p 127.0.0.1:8092:8092 battleship-app:ensayo-15`. Chrome headless (reglas comunes) con `Network.enable`, `Log.enable` y `Runtime.enable`, un listener de `securitypolicyviolation` con `Page.addScriptToEvaluateOnNewDocument`, y captura de `console.error`/`assert`, `exceptionThrown`, `Log` de nivel error, `loadingFailed` no cancelado y respuestas HTTP ≥ 400 (como la sonda de B10 de #8). Abrir `http://127.0.0.1:8092/` | `.network-badge` = `testnet · nodo OK`. En el header, "Conectar wallet" y "Mis partidas", sin "Administrar House". "Conecta tu wallet para crear una partida". Lobby con el texto honesto (`No hay partidas abiertas` o `… en el historial disponible del nodo (desde <fecha>)`) o con las partidas reales: de cada una se pegan **solo** el ID de la partida abreviado y el monto. **Nunca** creador, oponente, `title` ni un volcado del DOM (`innerText`/`outerHTML`): la fila muestra al creador con `shortAddress` y la dirección completa en `title` (`LobbyList.tsx:29`; MINOR-3) | (se llena durante la corrida) | ⏳ |
| T6-9b | Ruta profunda: `#/game/<GAME>`, la partida del smoke de #8 (fila B10 de `git show acdc669:documents/SMOKE_TESTNET_PUBLISH.md`), y después `Page.reload`. El ID completo sale del `GameCreated` de la transacción "crear" de la fila "Despliegues" de STATUS, leída con `SuiGrpcClient` público y sin claves. El script que lo lee imprime **solo** el ID abreviado (`0x` + 4 + `…` + 4), nunca `creator` ni `sender` (MINOR-3). Contraste sin imprimir (SUG-8): el ID completo aparece 1 vez en `git show acdc669:documents/HANDOFF_TESTNET_PUBLISH.md` (se cuenta con `/usr/bin/grep -c`, sin mostrar la línea), y su abreviatura coincide con la de B10 | Después de recargar: estado "Cancelada", comisión `2 %` y 0.001 SUI. Se pegan **solo** el ID abreviado y esos tres campos. **Nunca** creador, oponente, `title` ni un volcado del DOM: el detalle muestra creador y oponente con `shortAddress` y `title` (`GameDetail.tsx:10`), y en `GAME` el creador es la publicadora (MINOR-3) | (se llena durante la corrida) | ⏳ |
| T6-9c | `#/my-games` y `Page.reload` | Después de recargar: "Conecta tu wallet para ver tus partidas e invitaciones", sin listas | (se llena durante la corrida) | ⏳ |
| T6-9d | El pedido a `https://api.slush.app/api/wallet/metadata` | **Sin** violación de CSP. Si falla por CORS (`MissingAllowOriginHeader`) con el `console.error: Error fetching metadata TypeError: Failed to fetch` **exacto**, se acepta (SUG-2 de PR #48). Si responde, se anota el status | (se llena durante la corrida) | ⏳ |
| T6-9e | Abrir el modal de `ConnectButton` | Lista **"Slush"**. Ícono `data:` → OK. Si la metadata respondió y el ícono es `https://…` con violación de `img-src`: **STOP** (MINOR-5). El DEV **no** aplica el remedio, porque TASK-6 no toca `app/Caddyfile`: anota `violatedDirective` y `blockedURI`, lo reporta, y el MID emite un addendum. Si T6-9d dio 403, el ícono remoto queda sin medir y sigue en el smoke B (B-5) | (se llena durante la corrida) | ⏳ |
| T6-9f | Elegir "Slush" | Target nuevo (popup) hacia `https://my.slush.app`; en el popup, `window.opener !== null` da `true`. Sin login; `Target.closeTarget` | (se llena durante la corrida) | ⏳ |
| T6-9g | Recorrido de toda la sesión | **0** pedidos a `*.mvr.mystenlabs.com`; **0** `securitypolicyviolation`. Una de `img-src` por un ícono remoto es el STOP de T6-9e, no un remedio (MINOR-5). Errores de consola y de red: **solo** los del pedido a `api.slush.app` (el log de CORS, `net::ERR_FAILED`, `Failed to load resource`) y el `console.error` con la firma exacta. **Cualquier otro error es NO PASA** | (se llena durante la corrida) | ⏳ |
| T6-10 | **SUG-2, con `curl` público:** `curl -sS -o /dev/null -D - -H 'Origin: http://127.0.0.1:8092' https://api.slush.app/api/wallet/metadata \| /usr/bin/grep -i -e '^HTTP' -e '^server:' -e '^access-control-allow-origin:'`, y lo mismo con `-H 'Origin: https://example.com'` | Se anotan el status, el `server` y la presencia de `access-control-allow-origin` de cada uno. Se espera lo mismo con los dos orígenes (403, `cloudflare`, sin ACAO). Si cambió, se anota: es dato para el smoke B, no un rojo | (se llena durante la corrida) | ⏳ |
| C-4 | **Cierre:** `kill <pid de Chrome>` (`kill -0` falla); `docker rm -f deploy-image-e6`; `docker rmi battleship-app:ensayo-15`; limpieza por la línea base de T6-0 con las reglas de C-1 (solo IDs nuevos: `<none>`, `battleship-app:*` y las bases descargadas, como `node:26.13.0-bookworm-slim`, `caddy:2.11.7-alpine` y `rhysd/actionlint`; sin `prune`); repetir los `comm` (vacíos) y `docker system df` (*Build Cache* = T6-0); `rm -rf <scratchpad>/n2-15 <scratchpad>/chrome-15-t6 <scratchpad>/docker-base-15-t6` (comprobar que no existen); `ss -ltn` sin filas en 8090, 8092 y 9230; `git -C <repo> status --porcelain --untracked-files=all` | Las diferencias quedan vacías, o solo con objetos ajenos listados y no tocados. Sin directorios del ensayo, puertos libres, y el repo solo con los 5 archivos de TASK-6 | (se llena durante la corrida) | ⏳ |

### Reporte final (parte B) (v1.6.1, SUG-7)
- Pasos PASA/TOTAL (T6-0..T6-10 y C-4): (lo llena el DEV; queda abierto hasta T6-7)
- T6-7 (runs A y B, PR desechable): ⏳ (T6-7), lo llena el orquestador
- Hallazgos (n.° de paso + output):
- Veredicto: lo da el MID después del commit de T6-7 (MINOR-1)

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

## Si algo falla
- Capturar: el output del paso (sin rutas personales), las últimas 30 líneas del log de `docker build` o de
  `docker logs`, y la lista de `securitypolicyviolation` (`violatedDirective`, `blockedURI`).
- Reportar el número de paso (V-n / E-n / L-n / H-n / T6-n / C-n). Un paso fallido ⇒ **NO PASA**, salvo los remedios previstos
  (`img-src` por un ícono remoto, `style-src 'unsafe-inline'`), que se declaran como desviación y vuelven a revisión
  del MID. **En TASK-6 no hay remedios:** una violación de `img-src` es STOP (v1.6.1, MINOR-5).

## Reporte final
- Pasos PASA/TOTAL:
- Hallazgos (n.° de paso + output):
- Veredicto: [PASA | NO PASA]
