# REPORTES_RAILWAY_DEPLOY
> Issue: #15 | Plan: PLAN_RAILWAY_DEPLOY v1.1 | Handoff: HANDOFF_RAILWAY_DEPLOY v1.1 | Branch: `feature/issue-15-pages-deploy`

## TASK-1

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-1 (favicon)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `6d1c786`, sin commits del DEV.

### Archivos modificados/creados
- `app/public/favicon.svg` (nuevo): 441 bytes.
- `app/index.html`: una línea, el `<link rel="icon">` en `<head>`.
- `documents/REPORTES_RAILWAY_DEPLOY.md` (nuevo): este reporte, lo escribe el orquestador.

### Qué se implementó (3 líneas máx)
Un favicon SVG propio: una diana de batalla naval sobre un cuadrado azul marino redondeado, con 2 aros (rojo y blanco), un centro rojo y una mira en cruz.
Usa `viewBox="0 0 32 32"`, colores fijos y solo `rect`, `circle` y `path`, sin texto.
`app/index.html` lo declara con `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

### Tests y gates (output pegado, por área tocada)
- **Tests agregados o modificados:** ninguno. El handoff no los pide y prohíbe tocar tests.
- **Contracts:** sin cambios en `contracts/`. `git diff --stat -- contracts/` da 0 líneas, así que el gate no se corre.
- **App:** gate canónico (`agents.md` §3) desde la raíz del worktree, con Node `v26.13.0` y npm `11.20.0`:
  - `npm ci` sale con exit 0 (293 paquetes) y hay 292 firmas verificadas;
  - 0 vulnerabilidades de producción (las 11 *moderate* de dev son las de #35);
  - lint con 0 problemas y typecheck con 0 errores;
  - **915 PASS en 57 archivos**;
  - el build da `index-Ck3iRlQ-.js` con **901.45 kB** (273.61 kB gzip) y el aviso informativo de chunk > 500 kB (issue de code-splitting, D4).
- **Delta contra el baseline de §0:** ninguno. Los conteos y el tamaño del bundle coinciden exactamente con §0. Lo único nuevo en el `dist` es `favicon.svg`, como prevé el handoff.
- **Tablas de contrato (`contracts/README.md`) y `app/src/sui/` sincronizados:** no aplica.

**Gate `app` (paso 1).** Comando:
`export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && npm --version && npm ci && npm audit signatures && npm audit --omit=dev --audit-level=high && npm run lint -w app && npm run typecheck -w app && npm test -w app && VITE_SUI_NETWORK=testnet npm run build -w app; echo "EXIT=$?"; git status --porcelain --untracked-files=all`

```text
v26.13.0
11.20.0

added 293 packages, and audited 295 packages in 24s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
audited 292 packages in 39s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

found 0 vulnerabilities

> lint
> eslint . --max-warnings 0


> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json


> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  03:18:09
   Duration  33.99s (environment 59%, tests 12%, import 11%, setup 10%, transform 7%, worker 1%)

Environment  jsdom was created 57 times · 187.92s total, 59% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.26s
EXIT=0
 M app/index.html
?? app/public/favicon.svg
```

**Paso 2: el `dist` después del build.**
```text
$ ls -l app/dist/favicon.svg
-rw-rw-r-- 1 <usuario> <usuario> 441 Nov  4 03:18 app/dist/favicon.svg
$ cmp app/dist/favicon.svg app/public/favicon.svg && echo IDENTICAL
IDENTICAL
$ grep -c 'rel="icon"' app/dist/index.html
1
$ grep 'rel="icon"' app/dist/index.html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

**El SVG contra §3:**
- Lo parseé con Python (`xml.etree`): es XML válido, la raíz es `svg` con `viewBox` `0 0 32 32` y los elementos son `['circle', 'path', 'rect', 'svg']`.
- `grep -Eci 'script|foreignObject|href|font|@import|url\('` sobre el archivo da **0**.
- No tiene recursos externos, texto ni licencias de terceros: el dibujo es propio.
- Pesa 441 bytes (≤ 1 kB).

### Verificación manual (localnet / testnet, digests de tx si hubo)
No hubo localnet, testnet ni transacciones. Este es el paso 3 del handoff, con `vite preview` y Chrome headless.

1. **Puertos libres antes de empezar.** `ss -ltn 'sport = :4174'` y `ss -ltn 'sport = :9230'` devolvieron solo la cabecera. No toqué el `:4173`.

2. **Preview.** Lo lancé como comando en segundo plano del harness, con el comando literal del handoff: `cd <repo>/app && echo $$ > <scratchpad>/preview-15.pid && exec <HOME real>/.nvm/versions/node/v26.13.0/bin/node ../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort`.
   - El PID guardado es el del servidor. `ps` muestra `node ../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort`, y `ss -ltnp` muestra `LISTEN 127.0.0.1:4174` con ese mismo PID.
   - Antes de abrir Chrome, `curl -sI http://127.0.0.1:4174/favicon.svg` dio `HTTP/1.1 200 OK`, `Content-Type: image/svg+xml` y `Content-Length: 441`.

3. **Chrome headless.** Lancé `/opt/google/chrome/chrome` con `exec` y guardé su PID en `<scratchpad>/chrome-15.pid`. Opciones:
   - `--headless=new --user-data-dir=<scratchpad>/chrome-15-task1`;
   - `HOME` y `XDG_{CONFIG,CACHE,DATA,RUNTIME}_*` aislados en `<scratchpad>`;
   - `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9230`.

   `ss -ltnp` en `:9230` muestra el PID de ese Chrome. Un script CDP en Node (en `<scratchpad>`, no se commitea) abrió una pestaña con `Target.createTarget({ newWindow: true })`, sin `Page.bringToFront`. Activó `Network.enable` y navegó a `http://127.0.0.1:4174/`. Salida:
   ```text
   REQUESTS:
      http://127.0.0.1:4174/
      http://127.0.0.1:4174/assets/index-Ck3iRlQ-.js
      http://127.0.0.1:4174/assets/index-PjfExgZ6.css
      http://127.0.0.1:4174/favicon.svg
   RESPONSES:
      200 text/html http://127.0.0.1:4174/
      200 text/css http://127.0.0.1:4174/assets/index-PjfExgZ6.css
      200 text/javascript http://127.0.0.1:4174/assets/index-Ck3iRlQ-.js
      200 image/svg+xml http://127.0.0.1:4174/favicon.svg
   LOADING_FAILED: 0
   favicon.ico requests: 0
   link[rel=icon].href: http://127.0.0.1:4174/favicon.svg
   BODY TEXT: "La app no está configurada\n\nFalta contracts/deployments/testnet.json: en localnet, generarlo con el script de #7 (agents.md §3, paso 4, variante B); en testnet lo publica #8"
   ```
   Resultado:
   - `GET /favicon.svg` da **200** con `image/svg+xml`;
   - hay **0** pedidos a `/favicon.ico` y 0 cargas fallidas;
   - la pantalla es "La app no está configurada", la esperada sin `testnet.json`.

4. **Revisión visual (extra).** Capturé `/favicon.svg` ampliado a 256×256 en una pestaña del mismo Chrome, con `Page.captureScreenshot`. La captura queda en `<scratchpad>` y no se commitea. Se ve nítido y centrado: la diana con un aro rojo y uno blanco, el centro rojo y la mira blanca sobre fondo azul marino.

5. **Cierre.** Solo `kill <pid de Chrome>` y `kill <pid del preview>`, sin `pkill` ni `killall`.
   - `kill -0` falla en los dos (`No such process`, exit 1). El preview terminó con 143 (SIGTERM, lo esperado).
   - `ps` no encuentra ningún proceso con `chrome-15-task1` ni ningún `vite.js preview … --port 4174`.
   - `ss -ltn 'sport = :4174'` y `ss -ltn 'sport = :9230'` no tienen filas.
   - No toqué el `:4173` ni los puertos de #14 (`9000`, `9123`, `9184`, `5173`, `5003`, `9229`, `9339`).

**Higiene del diff.** Armé el diff con `git add -N` + `git diff` y después hice `git reset` del archivo nuevo, así que el índice quedó como estaba. Sobre los dos archivos del task, estos tres greps dan **0** coincidencias:
- claves: `suiprivkey|private|mnemonic|secret|keystore`;
- hex de 40-64 caracteres: `(0x)?[0-9a-fA-F]{40,64}`;
- rutas personales: `/home/|<usuario>|/tmp/`.

No toqué `~/.sui/` (ni siquiera con `stat`), los worktrees `-issue8` y `-issue14`, ni nada de testnet.

### Desviaciones del handoff
1. **Binario de Chrome y revisión visual.**
   - Qué cambió: lancé `/opt/google/chrome/chrome` directo y no el `google-chrome` del `PATH`. Además agregué una captura del SVG ampliado, que el handoff no pide.
   - Por qué (motivo técnico): `google-chrome` es un symlink a un script envoltorio. Con el binario directo, `echo $$` + `exec` guarda con certeza el PID del navegador que escucha en `:9230`, y ese es el único que hay que cerrar. La captura confirma que el dibujo se lee bien.
   - Verificación extra realizada: `ss -ltnp 'sport = :9230'` mostró el mismo PID que se guardó. Ninguna de las dos cosas cambia lo que se entrega.

### Riesgos / pendientes
Ninguno del task. Además de los dos archivos de §4, el árbol tendrá este reporte (`documents/REPORTES_RAILWAY_DEPLOY.md`) cuando el orquestador lo escriba. Es un artefacto del ciclo y lo borra el housekeeping (§9).

### Documentación
- **READMEs y `agents.md` actualizados:** no en este task. El handoff asigna a TASK-5 documentar el favicon y el fin del 404 de `/favicon.ico` en `app/README.md` y STATUS. TASK-1 no cambia arquitectura, comandos, contrato ni tests.
- **Snippet propuesto para `documents/STATUS.md`:**
  > #15 TASK-1 (favicon): `app/public/favicon.svg` (SVG propio, 441 B) y `<link rel="icon">` en `app/index.html`. Gate `app` sin delta: 915 tests en 57 archivos, lint 0, typecheck 0, `index-*.js` de 901.45 kB (273.61 kB gzip); el `dist` suma `favicon.svg`. En `vite preview`, `GET /favicon.svg` da 200 `image/svg+xml` y no hay pedidos a `/favicon.ico`.
=====

## Revisión TASK-1: PASA

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.1 (`6d1c786`), TASK-1 §3-§7, y el diff real del
> worktree (`git diff` + archivo nuevo). Sin gates propios (D-20261030-02): verifiqué el output que pegó el DEV.

### Verificación contra el diff real
- **Alcance (§4).** `git status` muestra solo `M app/index.html` y `?? app/public/favicon.svg`, más este reporte,
  que es del orquestador. `git diff --stat -- contracts/` está vacío. No se tocaron `app/vite.config.ts`, `app/src/**`
  ni tests.
- **`app/index.html`.** Una sola línea agregada en `<head>`, `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`,
  literal a §3. Sin CRLF.
- **`app/public/favicon.svg`** (§3):
  - 441 B (≤ 1 kB), ASCII, con salto de línea final y sin CRLF, modo 664;
  - XML válido: raíz `svg` con `viewBox="0 0 32 32"` e hijos `rect`, `circle` ×3 y `path`;
  - es una diana con 2 aros y centro, más la mira en cruz, con colores fijos;
  - `grep -Eci 'script|foreignObject|href|font|@import|url\(|<text'` da **0**: sin texto, sin recursos externos y sin
    contenido de terceros.
- **Gate (§5.1).** El output pegado tiene `EXIT=0` con Node `v26.13.0`. Sin delta frente a §0:
  - 293 paquetes, 292 firmas y 0 vulnerabilidades de producción;
  - lint 0 y typecheck 0;
  - **915/57**;
  - `index-Ck3iRlQ-.js` con **901.45 kB** (273.61 kB gzip), el mismo hash que el baseline.
  - `dist/index.html` pasa de 0.39 a 0.46 kB, que es lo que pesa la línea del `<link>`.
- **`dist` (§5.2).** `favicon.svg` es idéntico al de `public/` (`cmp`) y `rel="icon"` aparece 1 vez. Lo confirmé:
  `app/dist/` contiene `favicon.svg`.
- **Preview + Chrome (§5.3).**
  - Puertos: `:4174` y `:9230` libres antes y después; `:4173` sin tocar.
  - Vite lanzado con `exec`, y el PID guardado es el que escucha.
  - Chrome con perfil propio y `HOME`/`XDG_*` aislados, depuración en `127.0.0.1:9230`, `newWindow: true` y sin
    `bringToFront`.
  - `GET /favicon.svg` 200 `image/svg+xml`, **0** pedidos a `/favicon.ico` y 0 cargas fallidas. Pantalla
    "La app no está configurada", la esperada.
  - Cierre solo por PID (`kill -0` falla en los dos) y sin procesos residuales.

### Checklist (FLUJO §5 / ESTANDARES)
| Regla | Estado |
|---|---|
| Implementa lo pedido, ni más ni menos; HU del task | ✅ La captura visual es verificación extra, no entregable |
| ARQ/PROY (capas, config) | ✅ No toca `src/` ni la config; `base` sigue en `/` (DL-5) |
| SEG-3 (secretos) / SEG-9 (UI segura) | ✅ Greps limpios; SVG sin script ni recursos externos |
| LIM-3/4 (código muerto o debug) | ✅ Nada; el script CDP y la captura quedaron en `<scratchpad>` |
| Tests y gates | ✅ Gate completo sin delta (§0) |
| Desviaciones declaradas | ✅ (1) binario directo de Chrome: justificado, porque `google-chrome` es un script envoltorio y con `exec` el PID guardado es el del navegador (verificado con `ss -ltnp`); (2) captura visual extra: inocua |
| Sin rutas personales en el output pegado | ✅ `<repo>`, `<HOME real>`, `<scratchpad>`, `<usuario>` |
| Docs (PROY-20) | ✅ No aplica en TASK-1; el README va en TASK-5 |

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

**Nota para TASK-5 (no es hallazgo):** el snippet de STATUS del DEV sirve tal cual. En `app/README.md` alcanza con
mencionar el favicon en "Despliegue (Railway)" (P9 del script) y quitar el 404 de `/favicon.ico` de cualquier nota
que lo cite.

### Siguiente paso
**TASK-2 autorizado** (handoff v1.1, TASK-2 y Anexo A parte 1: V-1..V-3, E-1a..E-6e, C-1), con la coordinación de
puertos (8090-8092, Chrome 9230) y la línea base de Docker antes del primer pull.

### Mensaje de commit propuesto
```
app: add own SVG favicon (#15)

Add app/public/favicon.svg (target glyph, 441 B, no text or external
refs) and declare it in index.html, removing the /favicon.ico 404 seen
since #9. App gate unchanged: 915 tests in 57 files, bundle 901.45 kB.

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-2

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-2 (imagen de Railway, script de chequeo y ensayo)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `53054e8`. No hice commits.

### Archivos modificados/creados
- `Dockerfile` (nuevo, 2045 B): copia literal de §3.2 del handoff.
- `.dockerignore` (nuevo, 399 B): copia literal de §3.1.
- `app/Caddyfile` (nuevo, 920 B, con tabs): copia literal de §3.3.
- `app/scripts/check-deploy-image.sh` (nuevo, 8813 B): implementa el contrato de §3.4. Tiene modo 664, como los demás scripts de `app/scripts/`; se invoca con `bash`.

Saqué los tres literales con un parser de los bloques de código del handoff:
- `cmp` da idénticos los tres archivos contra sus bloques;
- el Dockerfile y el Caddyfile son además idénticos byte a byte a los bloques del plan v1.1;
- el `.dockerignore` literal solo está en el handoff.

### Qué se implementó (3 líneas máx)
La imagen: build estático de testnet + Caddy 2.11.7 como `nobody`. Se niega a construirse sin `contracts/deployments/testnet.json` y corre `publish.mjs check` antes de `npm ci`.
El script elige el modo según el contexto: negativo con N1-N3, positivo con P1-P13, siempre con GET. Tiene trap de limpieza, `--force-rm` cuando no hay buildx y anotaciones de Actions.
Probé los dos caminos con el mismo script: V-3 (negativo) en el repo real y E-2 (positivo) en un contexto sintético en `<scratchpad>/ensayo-15/`.

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ninguno en Vitest ni en Move. El task no toca `app/src/**`.
- **Contracts:** sin cambios. `git diff --stat -- contracts/ | wc -l` da 0, así que no corrí su gate.
- **App:** gate canónico desde `<repo>` con Node `v26.13.0` y npm `11.20.0`:
  - `npm ci` 293 paquetes; 292 firmas; 0 vulnerabilidades de producción (las 11 *moderate* de dev son las de #35);
  - lint 0 y typecheck 0;
  - **915 PASS en 57 archivos**;
  - el build da `index-Ck3iRlQ-.js` **901.45 kB** (273.61 kB gzip) y el aviso de chunk > 500 kB (D4).
  - **Delta contra §0: ninguno.**
- **Tablas de contrato / `app/src/sui/`:** no aplica.

Comando: `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && npm --version && npm ci && npm audit signatures && npm audit --omit=dev --audit-level=high && npm run lint -w app && npm run typecheck -w app && npm test -w app && VITE_SUI_NETWORK=testnet npm run build -w app; echo "EXIT=$?"; git status --porcelain --untracked-files=all; git diff --stat -- contracts/ | wc -l`
```text
v26.13.0
11.20.0

added 293 packages, and audited 295 packages in 7s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
audited 292 packages in 8s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

found 0 vulnerabilities

> lint
> eslint . --max-warnings 0


> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json


> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  03:36:59
   Duration  15.93s (environment 61%, tests 14%, import 10%, setup 9%, transform 5%)

Environment  jsdom was created 57 times · 91.51s total, 61% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 398ms
EXIT=0
?? .dockerignore
?? Dockerfile
?? app/Caddyfile
?? app/scripts/check-deploy-image.sh
0
```

**Verificación 4: greps sobre los 4 archivos nuevos.**

| Grep | Resultado |
|---|---|
| `suiprivkey\|PRIVATE KEY\|mnemonic\|ghp_\|github_pat_\|RAILWAY_TOKEN=` | **0** |
| `^\s*ARG\b` en el Dockerfile | **0** |
| hex de 40-64 | solo los 2 digests públicos de §3.2: `Dockerfile:4` (`node … 88e4…e28c`) y `Dockerfile:25` (`caddy … e70b…4ee5`) |
| rutas personales | **0** |
| `RUN --mount\|<<\|--chmod\|--link\|# syntax=` | 1 hit en `Dockerfile:2`: es el comentario literal que dice que **no** se usan |
| `log\|try_files\|Cross-Origin-Opener\|browse` en el Caddyfile | **0** |
| `eval` o `curl … \| sh` en el script | **0** |

**Checklists de §3.2 y §3.3:** todo marcado, porque los archivos son literales:
- `WORKDIR /repo` es el paso 0;
- los dos digests están fijados;
- `.nvmrc` se copia antes de cualquier `RUN`;
- la guarda es el primer `RUN`, con el mensaje literal, y va antes de `npm ci`;
- `check` va antes de `npm ci`;
- `ENV` sin `ARG`;
- hay comprobaciones del bundle;
- en el runtime: `setcap -r`, `validate` y el grep del origen, y después `USER nobody`;
- la CSP va en una línea, con 6 cabeceras y `-Server`;
- `@assets` tiene `path` y `file`.

**Validación del script antes de tocar Docker:** sin argumentos, con `. ` (puerto vacío), `. 80`, `. 1023`, `. 65536`, `. 08090`, `. abc`, `/no/existe 8090`, `app 8090` (sin Dockerfile) y `. 8090 extra` sale con **exit 2** y no se crea ningún contenedor.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No usé localnet ni hice transacciones. Hay lecturas públicas de testnet (E-6) sin claves. Todo el detalle está en el Anexo A parte 1, abajo.

**Verificación extra: el script falla cuando debe.** En una copia del contexto (`ctx-mut`, ya borrada) agregué `Cross-Origin-Opener-Policy "same-origin"` al Caddyfile:
- P1-P5 ok, después `FALLO: P6: / no debe llevar Cross-Origin-Opener-Policy (D3)` y **exit=1**;
- el trap borró el contenedor y la etiqueta `check-$$`, y `battleship-app:ensayo-15` siguió viva.

### Desviaciones del handoff
1. **E-5 sale de un build aparte, no del log de E-2.**
   - Qué cambió: el contrato §3.4 manda que el trap borre el log temporal del build, así que después de E-2 ese log ya no existe. Para E-5 hice `docker build --force-rm --no-cache -t battleship-app:e5-15 -f <ctx>/Dockerfile <ctx>` sobre el mismo contexto y después `docker rmi`.
   - Por qué: sin `--no-cache`, el builder clásico mostraría `Using cache` y no el output de `caddy validate`.
   - Verificación extra: el bundle resultante es `index-gXnkoRrn.js`, el mismo hash que sirvió E-2, así que el build es reproducible.
2. **Log de V-3.**
   - Qué cambió: por la misma razón, el log que pego en V-3 viene de repetir el mismo `docker build --force-rm` (etiqueta `battleship-app:v3-15`) justo después de correr el script. El script en sí dio `exit=0 OK (negativo)`.
3. **`TMPDIR=<scratchpad>/tmp15` en las corridas locales del script.**
   - Por qué: para que el `mktemp` caiga dentro del scratchpad y fuera del contexto. El script no lo exige; en la CI usa el `TMPDIR` del runner. Al terminar, el directorio quedó vacío y lo borré.
4. **Chrome.**
   - Qué cambió: lancé el binario directo `/opt/google/chrome/chrome` (como en TASK-1), para que el PID guardado sea el del navegador.
   - Agregué un grabador CDP propio en Node (`<scratchpad>`, no se commitea). Se adjunta a cada pestaña y popup nuevos y escribe red, logs y CSP en un JSONL.

### Riesgos / pendientes
1. **Regla de 7 días y digests reconstruidos.** Las *versiones* cumplen: Node 26.12.1 es del 2026-10-21T10:38:29Z y Caddy 2.11.7 del 2026-10-03T05:58:33Z. Pero Docker Hub muestra que los *digests* fijados se publicaron después, por rebuilds de la misma versión:
   - `node:26.12.1-bookworm-slim` tiene `tag_last_pushed` 2026-10-28T05:41Z (7 días y unas horas, cumple);
   - `caddy:2.11.7-alpine` tiene `tag_last_pushed` 2026-10-30T11:52Z, **unos 5 días, menos de 7×24 h**.

   El handoff mide la regla por versión, así que no es fallo. Lo dejo para que lo decida el MID: hay que aclarar si DL-8 se aplica a la versión o al digest.
2. **N2 es una subcadena laxa.** `falta contracts/deployments/testnet.json` también aparece en la línea `Step 5/19 : RUN test -f … echo "ERROR (#15): falta …"`, que el builder clásico imprime aunque el mensaje no se haya emitido. En la práctica no da falsos positivos: ese `RUN` solo falla si falta el archivo, y un fallo anterior (pull, `COPY`) no llega a imprimir esa línea. En el log de V-3 se ve el stderr real. Si el MID quiere un N2 más estricto, es un cambio de contrato; no lo implementé.
3. **E-6a: no aparecieron los "errores de lectura" que el handoff anticipaba.**
   - Sin wallet, la app no lee la House.
   - El lobby muestra "No hay partidas abiertas en el historial disponible del nodo (desde 20 oct 2026, 16:00)": `ListEvents` da 200 vacío para el paquete sintético.
   - Hubo un `GetTransaction` con `net::ERR_ABORTED` (una query cancelada), que no tiene relación con la CSP.
4. **Ícono remoto de Slush sin medir.** E-6b dio 403 de Cloudflare, así que el kit usa el ícono `data:` por defecto (E-6c). La medición pasa al smoke B del owner, como prevé el handoff.
5. **Imágenes descargadas (V-1):** `node:26.12.1-bookworm-slim@…e28c`, `caddy:2.11.7-alpine@…4ee5` y `rhysd/actionlint:1.7.12@…5667`. Las tres **se borraron** en C-1. `busybox` y las dos de `postgres` siguen, igual que sus 2 contenedores ajenos (`cancerbero_back-db-1`, `backend-postgres-1`), que no toqué.
6. **El contexto de la etapa build incluye los tests de `app/src`** (`*.test.tsx`, `src/test/`), porque la lista blanca toma `app/` entero. No llegan a la imagen final, que solo lleva `dist`. Lo anoto como información.

### Documentación
- **READMEs y `agents.md`:** no en este task. El handoff asigna los docs a TASK-5: comandos del script, checklist del owner y la observación 1.
- **Snippet propuesto para `documents/STATUS.md`:**
  > #15 TASK-2: `Dockerfile` + `.dockerignore` (lista blanca) + `app/Caddyfile` + `app/scripts/check-deploy-image.sh`. Parte 1 del ensayo (V-1..E-6, C-1) con 21/21 PASA. Negativo (V-3, repo real): `exit=0`, ~2 s, se corta en el primer `RUN` sin `npm ci`. Positivo (E-2, contexto sintético): P1-P13, 98 s; `nobody` 65534 con `--cap-drop=ALL`; CSP idéntica; asset con zstd; 3 404. E-3: `deployments incoherentes … upgradeCapId`, sin error de `.nvmrc`. E-6: `testnet · nodo OK`, popup de Slush con `opener`, 0 violaciones de CSP, 0 pedidos a MVR; `api.slush.app` da 403 de Cloudflare (ícono remoto al smoke B). Gate `app` sin delta (915/57, 901.45 kB). Docker sin restos respecto de la línea base.

## Revisión TASK-2: PASA

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.1 (`6d1c786`), TASK-2 §3-§7, el diff real del
> worktree y `documents/SMOKE_RAILWAY_DEPLOY.md`, parte 1. Sin gates propios (D-20261030-02): las comprobaciones de
> abajo son de solo lectura (diff, grep, `docker ps`/`images`).

### Verificación contra el diff real
- **Los tres literales son idénticos al handoff.** Extraje los bloques de §3.1, §3.2 y §3.3 del handoff y los comparé
  con `diff` contra `.dockerignore`, `Dockerfile` y `app/Caddyfile`: **IDENTICAL** los tres, con los tabs del
  Caddyfile incluidos. Por lo tanto el checklist de §3.2 y §3.3 se cumple:
  - `WORKDIR /repo` es el paso 0;
  - los dos digests están fijados;
  - `.nvmrc` va antes del `check`;
  - la guarda es el primer `RUN`;
  - sin `ARG`;
  - `setcap -r` va antes de `USER nobody`;
  - `@assets` lleva `file`;
  - sin COOP, `log` ni fallback.
- **Script (`app/scripts/check-deploy-image.sh`, 235 líneas) contra el contrato de §3.4:**
  - **Uso y validación:** 2 argumentos; directorio con `Dockerfile`, `.dockerignore` y `app/Caddyfile`; puerto con
    regex más rango 1024..65535. Todo se valida **antes** de Docker y del `trap`, y sale con **2** (`:49-58`). El DEV
    probó 10 casos inválidos, todos con exit 2 y sin contenedores.
  - **Salida 1:** `fail` hace `exit 1` y el `trap EXIT` limpia sin pisar el código, porque `cleanup` no llama a
    `exit`. **Salida 0** solo con `ok` al final de cada modo (`:96-97`, `:235`).
  - **Etiqueta y contenedor `-$$` y temporales en `mktemp -d`** (`:60-63`), fuera del contexto.
  - **`trap`** con `rm -f`, `rmi` y `rm -rf` con `|| true`; no toca `CHECK_KEEP_TAG` (`:65-70`, `:107-109`).
  - **`--progress=plain` solo con buildx, y `--force-rm` sin él** (`:72-79`), como dice la v1.1 (MINOR-1).
  - **Negativo:** el fallo esperado se captura en el `if` sin que aborte `set -e` (`:89-91`); después N2 y N3.
  - **Positivo, P1-P13:**
    - todo por **GET** (`curl -D … -o …`, sin `-I`) y sin `Content-Length` (`:135-141`);
    - CSP idéntica a la extraída del Caddyfile del contexto (`:171-174`);
    - las 6 cabeceras exactas (`:181-186`) y las ausencias de COOP y `Server` (`:190-191`);
    - asset, compresión, favicon y los 3 404, con P12 sin `immutable`;
    - `--cap-drop=ALL` y `id -u` = 65534.
  - **Anotaciones de Actions** escapadas (`%`, CR, LF) y una línea de resumen.
  - Sin `eval` ni `curl | sh`. shellcheck da 0 (V-2).
  - **Robustez con `pipefail`:**
    - `uid=$(… | sed) || fail` y `grep … | sed … || true` (`:195`) están bien;
    - `! has_header … || fail` es correcto con `set -e`, porque los `!` no disparan errexit;
    - el DEV además provocó un fallo de P6 (COOP agregado) y salió con exit 1, con el trap limpiando bien.
- **Ensayo sin restos.** Lo verifiqué por mi cuenta:
  - **Árbol:** `git status` muestra solo los 4 archivos del task (más los docs del ciclo). No hay
    `contracts/deployments/`, `testnet.json`, `Published.toml` ni `.env.local`.
  - **Docker:** `docker ps -a` tiene solo los 2 contenedores ajenos (`postgres:17`, `postgres:16-alpine`), y
    `docker images -a` solo `postgres:17`, `postgres:16-alpine` y `busybox`: es la línea base de V-1 (2 y 3). Las 34
    imágenes nuevas (31 intermedias `<none>` y las 3 bases) se borraron por ID, sin `prune`.
  - **Puertos:** `8090`-`8092`, `9230` y `4174` sin listeners.
  - **Scratchpad:** no existe `ensayo-15`, y un grep del `packageId` sintético en el scratchpad no encontró nada de
    #15 (incluido el JSONL de E-6).
- **SMOKE, parte 1:** 21/21 con resultados concretos.
  - V-3 se corta en el primer `RUN`, sin `npm ci`.
  - E-2 da P1-P13 en 98 s.
  - E-3 falla por `upgradeCapId` sin el error de `.nvmrc` (MAJOR-1 del plan, cerrado).
  - E-6 confirma la CSP en la práctica: 0 violaciones en 53 pedidos, popup de Slush con `opener`, 0 pedidos a MVR.
- **Gate `app`:** `EXIT=0`, 915/57, 0/0, 901.45 kB, mismo hash. Sin delta. `contracts/` sin cambios.

### Decisiones sobre las observaciones del DEV
1. **DL-8 se aplica a la versión, no al digest.** El plan v1.1 (DL-8) dice que la regla se mide sobre la **versión**
   (`published_at` del release) y que *"las reconstrucciones de docker-library … no reinician el plazo"*. El MAYOR lo
   aceptó en la revisión del plan v1 (MINOR-1). El índice de `caddy:2.11.7-alpine` del 2026-10-30 es un rebuild de
   Caddy v2.11.7 (2026-10-03, 32 días), así que **cumple**. No cambia nada; la v1.2 del handoff le pide a TASK-5 que
   lo escriba en el README.
2. **N2 se endurece, en TASK-4 (MINOR-1 de abajo).** El DEV tiene razón en que con el Dockerfile actual no hay falsos
   positivos: en modo negativo la guarda solo se alcanza si falta el archivo, y entonces corta. Pero N2 no detecta la
   regresión que justamente debería detectar: si alguien rompe la guarda para que **no corte** (`|| echo …` sin
   `exit 1`), el build igual falla más adelante (N1 pasa), la subcadena aparece en el `Step …: RUN` (N2 pasa) y el
   chequeo da verde. Comprobé contra el `v3.log` real que el builder clásico pinta el stderr con `ESC[91m`, así que
   una regex anclada necesita quitar los códigos ANSI. Va en TASK-4 porque ahí corre por primera vez con BuildKit,
   y el prefijo se valida en el run real.
3. **Sin errores de lectura en E-6a:** es correcto. Sin wallet la app no lee la House, y el lobby muestra el texto
   honesto de la ventana del nodo. La previsión del handoff era conservadora; no hay hallazgo.
4. **403 de `api.slush.app`:** el ícono remoto pasa al smoke B del owner, como prevé el handoff (E-6c). Queda en los
   pendientes de TASK-6.
5. **Tests de `app/src` en el contexto:** se aceptan. Salen de `!app/` en el `.dockerignore` literal aprobado,
   `vite build` no los importa y no llegan a la imagen final, que solo lleva `dist`. Excluirlos cambiaría un literal
   aprobado sin ninguna ganancia de seguridad.

### Desviaciones declaradas
| # | Desviación | Dictamen |
|---|---|---|
| 1 | E-5 con un build aparte, `--no-cache` | ✅ Lo fuerza el contrato: el trap borra el log de E-2. Con el mismo contexto da el mismo hash de bundle (`index-gXnkoRrn.js`), y la limpieza la cubrió C-1 |
| 2 | Log de V-3 de un build repetido | ✅ Mismo motivo; el script dio `exit=0` por sí solo |
| 3 | `TMPDIR` en el scratchpad | ✅ Inocuo; el contrato no lo fija y la CI usa el del runner |
| 4 | Binario directo de Chrome + grabador CDP en el scratchpad | ✅ Mismo motivo que en TASK-1; el grabador no se commitea |

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| MINOR-1 | LIM-11 (chequeo que verifica lo que dice) / DL-3 | `app/scripts/check-deploy-image.sh:92-95` | N2 (`grep -qF` de la subcadena) también coincide con la línea `Step n/m : RUN test -f …` que imprime el builder. Una guarda que no corta (`\|\| echo …` sin `exit 1`) daría N1 y N2 en verde | **En TASK-4** (handoff v1.2, §3.4 y TASK-4 §3 bis): N2a sobre la línea de salida, con los códigos ANSI quitados en `$log.plain` (sin `sed \| grep -q` por `pipefail`), más N2b `! grep -qE 'RUN npm ci'`. Se prueba con el rojo provocado local 3c (`FALLO: N2b`) y con el run de BuildKit en la CI |
| NIT-1 | Higiene del ensayo | `<scratchpad>` (fuera del repo) | Quedan restos de #15 fuera del repo, sin datos sintéticos: el perfil de Chrome de TASK-1 (`chrome-15-task1`, 54 MB), `home-15`, `xdg-15`, `cdp/`, `cdp2/` (con `e6.jsonl`), `chrome-15*.pid`, `preview-15.pid`, `recorder-15.pid`, `v3.log`, `v3.trace` y `favicon-256.png` | Borrarlos con `rm -rf` (los PIDs ya no existen). Puede hacerlo el orquestador o el DEV al empezar TASK-4. No bloquea |

### Siguiente paso
**TASK-4 autorizado** con el **handoff v1.2**: el job `deploy-image` y el N2 endurecido del script, con 3a-3d antes
del push. Después, TASK-5. TASK-3 sigue esperando a que se libere la localnet de #14.

### Mensaje de commit propuesto
Commit de `Dockerfile`, `.dockerignore`, `app/Caddyfile` y `app/scripts/check-deploy-image.sh`. Los docs del ciclo
van a criterio del orquestador.
```
app: add Railway image, Caddy config and image check script (#15)

Root Dockerfile builds the testnet static app (node 26.12.1, digest
pinned) and serves it with Caddy 2.11.7 as nobody, without
cap_net_bind_service. The build refuses to run without the testnet.json
from #8, and validates it with publish.mjs check before npm ci.
Allowlist .dockerignore keeps localnet.json and .env files out.
app/Caddyfile serves the CSP and security headers (no COOP, for the
Slush popup). check-deploy-image.sh runs the negative or the positive
path, the same locally and in CI. Local rehearsal 21/21: negative on the
repo, positive on a synthetic context in the scratchpad, Docker cleaned
back to baseline.

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-4

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-4 (job `deploy-image` en la CI + N2 endurecido)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `78b1a50` (handoff v1.2). No hice commits.

### Archivos modificados/creados
- `.github/workflows/ci.yml`: +15 líneas. Solo el job `deploy-image`, entre `app` y `framework-drift`. Lo copié del bloque YAML de §3 del handoff con un parser e insertado antes de `  framework-drift:`.
- `app/scripts/check-deploy-image.sh`: +11/−2. Solo N2, que pasa a ser N2a + N2b (§3 bis / §3.4 v1.2).

### Qué se implementé (3 líneas máx)
El job `deploy-image` (ubuntu-24.04, 15 min, `bash`) hace checkout fijado con `persist-credentials: false` y corre `bash app/scripts/check-deploy-image.sh . 8080`. No tiene `permissions` propios, `secrets`, Actions nuevas ni `if:`.
N2a quita los códigos ANSI y deja el log en `$log.plain`, en dos pasos y sin pipe. Después busca la línea de **salida** de la guarda, con el prefijo opcional `#<n> <s> ` de BuildKit.
N2b falla si `$log.plain` contiene `RUN npm ci`. Los mensajes `FALLO: N2a…` y `FALLO: N2b…` son los literales de §3 bis.

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ninguno en Vitest ni en Move.
- **Contracts:** sin cambios; `git diff --stat -- contracts/ | wc -l` da 0.
- **CI:** resultados de la verificación 1 (actionlint).
- **App:** gate canónico con Node `v26.13.0` / npm `11.20.0`. **Sin delta contra §0.**
  - `npm ci` 293 paquetes, 292 firmas;
  - 0 vulnerabilidades de producción (11 *moderate* de dev, #35);
  - lint 0 y typecheck 0;
  - **915 PASS en 57 archivos**;
  - el build da `index-Ck3iRlQ-.js` **901.45 kB** (273.61 kB gzip) y el aviso de chunk > 500 kB (D4).
- **Tablas de contrato / `app/src/sui/`:** no aplica.

**Gate `app`.** Comando: `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version && npm --version && npm ci && npm audit signatures && npm audit --omit=dev --audit-level=high && npm run lint -w app && npm run typecheck -w app && npm test -w app && VITE_SUI_NETWORK=testnet npm run build -w app; echo "EXIT=$?"; git status --porcelain --untracked-files=all; git diff --stat -- contracts/ | wc -l`
```text
v26.13.0
11.20.0

added 293 packages, and audited 295 packages in 8s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
audited 292 packages in 8s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

found 0 vulnerabilities

> lint
> eslint . --max-warnings 0


> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json


> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  03:49:42
   Duration  21.25s (environment 61%, tests 13%, import 10%, setup 10%, transform 5%, worker 1%)

Environment  jsdom was created 57 times · 118.99s total, 61% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.09s
EXIT=0
 M .github/workflows/ci.yml
 M app/scripts/check-deploy-image.sh
0
```

**1. actionlint.** Imagen `rhysd/actionlint:1.7.12@sha256:b1934ee5…5667`, con el archivo explícito.
- Con `-color=never`, tal como dice el handoff, sale con **exit 2**: `invalid boolean value "never" for -color: parse error`.
- Lo repetí con `-no-color` (Desviación 1): `docker run --rm -v <repo>:/repo:ro -w /repo rhysd/actionlint:1.7.12@sha256:b1934ee5…5667 -no-color .github/workflows/ci.yml` da **exit=0, 0 hallazgos**.
- En `-verbose` dice `Using project at /repo`, `Found 0 parse errors`, `Found total 0 errors in 89 ms`, y no avisa que shellcheck esté deshabilitado, así que también revisó los `run:`.
- Baseline: el `ci.yml` de HEAD, en un directorio aparte, también da exit=0. **Delta 0.**

**2. `git diff .github/workflows/ci.yml`:** solo el bloque nuevo, 15 líneas `+` y ninguna `-`:
```diff
@@ -180,6 +180,21 @@ jobs:
           git status --porcelain --untracked-files=all
           test -z "$(git status --porcelain --untracked-files=all)"
 
+  deploy-image:
+    # Imagen de Railway (#15): sin testnet.json (#8) exige que el build se niegue con el mensaje esperado; con él,
+    # construye, levanta y comprueba cabeceras. No es requerido; Railway lo espera vía "Wait for CI".
+    runs-on: ubuntu-24.04
+    timeout-minutes: 15
+    defaults:
+      run:
+        shell: bash
+    steps:
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
+        with:
+          persist-credentials: false
+      - name: Imagen de Railway (camino según contracts/deployments/testnet.json)
+        run: bash app/scripts/check-deploy-image.sh . 8080
+
   framework-drift:
```

**Diff del script** (solo el bloque N2; el resto del script no cambia):
```diff
-  if ! grep -qF 'falta contracts/deployments/testnet.json' "$log"; then
+  # N2a: la línea de salida del echo de la guarda, no la línea "Step n/m : RUN …" que también tiene la subcadena.
+  # El builder clásico la pinta con códigos ANSI y BuildKit le antepone "#<n> <segundos> ". En dos pasos con un
+  # archivo: con pipefail, un grep -q que corta temprano puede matar a sed con SIGPIPE y dar un falso fallo.
+  sed 's/\x1b\[[0-9;]*m//g' "$log" >"$log.plain"
+  if ! grep -qE '^(#[0-9]+ [0-9]+\.[0-9]+ )?ERROR \(#15\): falta contracts/deployments/testnet\.json' "$log.plain"; then
     tail_log "docker build" "$log"
-    fail "N2: el build falló, pero no por la guarda de testnet.json (se esperaba 'falta contracts/deployments/testnet.json' en el log)"
+    fail "N2a: el build falló, pero no por la guarda de testnet.json (no está la línea de salida 'ERROR (#15): falta contracts/deployments/testnet.json')"
+  fi
+  # N2b: el build tiene que cortarse en la guarda, sin llegar a npm ci.
+  if grep -qE 'RUN npm ci' "$log.plain"; then
+    tail_log "docker build" "$log"
+    fail "N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)"
   fi
```
N2b se escribe `if grep -qE …; then fail`, que equivale a la condición `! grep -qE 'RUN npm ci'` del handoff. `$log.plain` vive en el `mktemp -d` del script y lo borra el trap.

**3a. shellcheck** (binario de la imagen de actionlint, ShellCheck 0.11.0): `exit=0`, sin output. `bash -n` ok.

**3d, línea base.** La tomé **antes** de cualquier pull, a las 2026-11-04T08:45:38Z: **2 contenedores, 3 imágenes** (`postgres:17`, `postgres:16-alpine`, `busybox:latest`).

**3b. Negativo real** (`TMPDIR=<scratchpad>/tmp15t4 bash app/scripts/check-deploy-image.sh . 8090`; `:8090` libre antes de empezar):
```text
Modo negativo: el contexto no tiene contracts/deployments/testnet.json
OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse
exit=0
segundos=20
```
Los 20 s incluyen volver a bajar `node:26.12.1`, que se había borrado en C-1. No quedan `battleship-app:*` ni `deploy-image-*`.

Para ver qué línea cumple N2a repetí el mismo build (etiqueta propia `b3-15`, borrada después) y le apliqué los mismos `sed`/`grep`:
```text
--- N2a (líneas que coinciden)
19:ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicación del owner en testnet; sin él no se construye la app (nunca IDs a mano).
--- subcadena laxa vieja (para comparar)
17:Step 5/19 : RUN test -f contracts/deployments/testnet.json || { echo "ERROR (#15): falt
19:ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicaci
21:The command '/bin/sh -c test -f contracts/deployments/testnet.json || { echo "ERROR (#1
--- N2b
0
```
- La línea cruda empieza con `033 [ 9 1 m ERROR (#…`: confirma que antes de buscar hay que quitar los códigos ANSI.
- N2a coincide **solo** con la línea de salida (19). Ya no acepta la `Step 5/19 : RUN …` (17) ni la `The command …` (21).

**3c. Rojo provocado de N2b.**
- Preparación: copia como en E-1a en `<scratchpad>/n2-15/ctx` (185 archivos, **sin** `contracts/deployments`). En su `Dockerfile` cambié la guarda (`diff` contra el original):
```text
< RUN test -f contracts/deployments/testnet.json || { echo "ERROR (#15): falta … (nunca IDs a mano)." >&2; exit 1; }
> RUN test -f contracts/deployments/testnet.json || echo "ERROR (#15): falta … (nunca IDs a mano)."
```
- Corrida: `bash app/scripts/check-deploy-image.sh <scratchpad>/n2-15/ctx 8090` (`:8090` libre). Últimas líneas del output:
```text
Modo negativo: el contexto no tiene contracts/deployments/testnet.json
--- últimas 30 líneas de docker build ---
…
Step 13/19 : RUN set -eu;     for f in packageId originalPackageId houseId publishTxDigest; do …
 ---> Running in 0aabd65d192b
node:internal/modules/cjs/loader:1607
…
Error: Cannot find module './contracts/deployments/testnet.json'
…
Node.js v26.12.1
 ---> Removed intermediate container 0aabd65d192b
The command '/bin/sh -c set -eu; …' returned a non-zero code: 1
FALLO: N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)
exit=1
segundos=100
```
- Resultado: **`exit=1` por N2b**.
  - N1 pasó: el build falló más adelante, en el Step 13, la comprobación del bundle.
  - N2a pasó: se llegó a N2b porque la línea de la guarda se imprime.
  - El trap no dejó etiqueta `check-$$` ni contenedor.

**3d. Limpieza por línea base** (como C-1, sin `prune`):
1. Contenedores nuevos: **0**.
2. Imágenes nuevas: **13**, todas mías, borradas por ID con `docker rmi` en 2 pasadas:
   - 11 intermedias `<none>` con `Cmd [node]`, derivadas de `node:26.12.1`, que no estaba en la base;
   - `node:26.12.1-bookworm-slim@…e28c`;
   - `rhysd/actionlint@…5667`.

   Caddy no se descargó, porque ningún build llegó a la etapa runtime.
3. `comm` repetido: contenedores nuevos 0, imágenes nuevas 0, faltantes de la base `ps=0 img=0`. Quedan `postgres:17`, `postgres:16-alpine` y `busybox:latest`, y los contenedores ajenos `cancerbero_back-db-1` y `backend-postgres-1` corriendo, sin tocar.
4. `rm -rf <scratchpad>/n2-15`, junto con `tmp15t4` y la línea base; `ls` da "No such file or directory".
5. `:8090` y `:9230` con 0 filas. No usé ningún puerto de #14.

**Greps sobre el diff:**
- claves y secretos: 0;
- rutas personales: 0;
- en el job: 0 `secrets.`, 0 `permissions:`, 0 `if:`;
- hex de 40-64 en líneas añadidas: solo el SHA público de `actions/checkout@3d3c42e5…0b1 # v7.0.1`, ya fijado en los otros jobs. No hay `uses:` nuevos fuera de ese checkout.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: sin localnet, sin testnet y sin transacciones. La verificación 4 queda para el orquestador:
- después del push, el run del PR tiene que dar `deploy-image` verde **por el camino negativo** (`::notice::OK (negativo)…`), con `contracts` y `app` sin cambios;
- hay que anotar el run ID y pegar la línea del log de BuildKit que cumplió N2a. Esperada: `#<n> <s> ERROR (#15): falta contracts/deployments/testnet.json. …`.
- Si BuildKit en el runner usa otro prefijo, §3 bis permite ajustar **solo** el prefijo opcional de N2a.

La verificación 5 (rojo en un PR desechable) es opcional y no la hice.

### Desviaciones del handoff
1. **actionlint con `-no-color` en lugar de `-color=never`.**
   - Qué cambió: el flag de la verificación 1.
   - Por qué: en actionlint 1.7.12, `-color` es booleano y `-color=never` sale con exit 2 por parse error. El flag equivalente para desactivar el color es `-no-color`, según el `-help` de la imagen.
   - Verificación extra: corrí el mismo comando sobre el `ci.yml` de HEAD, que da exit 0, así que el delta es 0. Confirmé además que shellcheck estuvo activo dentro de actionlint.
   - Sugerencia: corregir el comando en el handoff y en lo que documente TASK-5.
2. **`TMPDIR=<scratchpad>/tmp15t4` en las corridas locales y build repetido para mostrar la línea de N2a.** Es el mismo criterio que las desviaciones 2 y 3 de TASK-2, ya aceptadas. El script no cambia por esto.

### Riesgos / pendientes
- El prefijo de BuildKit en la CI solo se va a confirmar con el run del PR (verificación 4). El ensayo local usa el builder clásico, porque esta máquina no tiene buildx.
- `deploy-image` no es check requerido (N-4, owner).
- Las imágenes descargadas (`node`, `actionlint`) se borraron en 3d.

### Documentación
- **READMEs y `agents.md`:** no en este task; va en TASK-5. Habría que documentar el job `deploy-image`, N2a/N2b y el flag `-no-color` de actionlint (Desviación 1).
- **Snippet propuesto para `documents/STATUS.md`:**
  > #15 TASK-4: job `deploy-image` en `ci.yml`. Corre `bash app/scripts/check-deploy-image.sh . 8080`, sin Actions nuevas, sin `permissions`/`secrets`/`if:`, no requerido; actionlint 1.7.12 da 0 hallazgos (con `-no-color`). Además, N2 del script endurecido en N2a (línea de salida de la guarda, sin ANSI, prefijo opcional de BuildKit) y N2b (sin `RUN npm ci`). shellcheck 0; negativo real `exit=0`; rojo provocado `exit=1` por N2b; Docker limpio por línea base. Gate `app` sin delta (915/57, 901.45 kB). Pendiente: run del PR con `deploy-image` verde por el camino negativo y la línea de N2a con BuildKit.
=====

## Revisión TASK-4: PASA

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.2 (`78b1a50`), TASK-4 §3, §3 bis, §5 y §7, el
> diff real de `f146097` y la CI del draft PR #57. Sin gates propios (D-20261030-02); las lecturas de la CI son con
> `gh api`.

### Verificación contra el diff real (`git show f146097`)
- **`.github/workflows/ci.yml`:** +15/−0, solo el job `deploy-image` entre `app` y `framework-drift`, idéntico al YAML
  de §3:
  - `ubuntu-24.04`, 15 min, `bash`;
  - `actions/checkout@3d3c42e5…0b1 # v7.0.1` (el mismo SHA que los otros jobs) con `persist-credentials: false`;
  - un solo step `bash app/scripts/check-deploy-image.sh . 8080`;
  - sin `permissions`, `secrets` ni `if:`, y sin Actions nuevas.
  - `on:`, `permissions`, `concurrency`, `env` y los otros jobs no cambiaron.
- **`app/scripts/check-deploy-image.sh`:** +11/−2, solo N2, idéntico al contrato v1.2:
  - `sed` de los códigos ANSI a `$log.plain` en un paso propio (sin `sed | grep -q`, por `pipefail`);
  - N2a, con la regex del handoff y el prefijo opcional `#<n> <s> `;
  - N2b como `if grep -qE 'RUN npm ci' …; then fail`, equivalente a `! grep -qE`;
  - mensajes literales de §3 bis;
  - `$log.plain` vive en el `mktemp -d` que borra el trap.
  - El resto del script no cambió.
- **Verificaciones de §5:**
  - **1, actionlint:** exit 0 y 0 hallazgos, con `-no-color` (ver desviación). El `ci.yml` de HEAD también da 0, así
    que el delta es 0, y shellcheck estuvo activo dentro de actionlint.
  - **2, diff:** solo el bloque.
  - **3a, shellcheck:** 0.
  - **3b, negativo real:** `exit=0`. N2a coincide **solo** con la línea 19, la de salida. Ya no acepta la 17
    (`Step 5/19 : RUN …`) ni la 21 (`The command …`), y N2b da 0.
  - **3c, rojo provocado:** `exit=1` por **`FALLO: N2b`**. N1 pasa porque el build cae en el Step 13, y N2a pasa
    porque la guarda imprime. Es justo la regresión que el N2 viejo dejaba pasar (MINOR-1 de TASK-2: **cerrado**).
  - **3d, limpieza:** por línea base, 13 imágenes nuevas borradas por ID, sin `prune`. Lo confirmé por mi cuenta:
    `docker ps -a` muestra solo los 2 contenedores ajenos y `docker images -a` solo `postgres` ×2 y `busybox`.
- **Verificación 4, la CI.** Lo leí con `gh api`: run **41802734452** (`pull_request` sobre `f146097`, PR #57 en
  draft) con `contracts`, `app`, `framework-drift` y **`deploy-image` en success**. `deploy-image` duró 10 s: la
  guarda corta en el primer `RUN`. El log del job dice `Modo negativo…`, después `OK (negativo): …` y la anotación
  `##[notice]`.
- **Gate `app`:** `EXIT=0`, 915/57, 0/0, 901.45 kB con el mismo hash. Sin delta. `contracts/` sin cambios.
- **NIT-1 de TASK-2:** resuelto. Ya no existen los restos de #15 en el scratchpad (perfil de Chrome, `home-15`,
  `xdg-15`, `cdp*`, PIDs, `v3.*`).

### La línea literal de BuildKit (pregunta del orquestador)
**Con esto alcanza; no hace falta ajustar el script.** En modo negativo, el script solo llega a `OK (negativo)` si
**N2a coincidió** y **N2b no**. Con BuildKit `--progress=plain`, las únicas líneas que contienen la subcadena son:
- la del vértice (`#n [build k/m] RUN test -f … echo "ERROR (#15)…"`), que empieza con `#n [`;
- la de salida (`#n <s> ERROR (#15): falta …`);
- el `ERROR: failed to solve: process "… echo \"ERROR (#15)…"`;
- el extracto del Dockerfile (`  9 | >>> RUN …`).

De esas, solo la de salida cumple el ancla `^(#n <s> )?ERROR \(#15\)`. Por lo tanto el verde del run 41802734452
**es** la prueba de que BuildKit emitió la línea de salida de la guarda y cortó antes de `npm ci`. Agregar un
`::debug::` sumaría código a un camino que deja de correr cuando llegue #8; no aporta. Queda registrado en el handoff
v1.3, en el changelog y en TASK-4 §5.4.

### Desviaciones declaradas
| # | Desviación | Dictamen |
|---|---|---|
| 1 | actionlint con `-no-color` en lugar de `-color=never` | ✅ Error del handoff: en actionlint 1.7.12, `-color` es booleano y `-color=never` sale con exit 2. Se corrige en el **handoff v1.3** (TASK-4 §5.1), y TASK-5 tiene que usar `-no-color` si lo documenta |
| 2 | `TMPDIR` en el scratchpad y build repetido para mostrar la línea de N2a | ✅ El mismo criterio ya aceptado en TASK-2; el build repetido se limpió en 3d |

### Nota de proceso (no es hallazgo)
El orquestador commiteó `f146097` antes de esta revisión para obtener la verificación 4, que solo existe con el run
real del PR. Es razonable: el commit lo dice ("pending MID review"), el PR está en draft y la revisión da PASA, así
que no hace falta ningún commit de corrección. El PR #57 sigue en draft hasta que terminen TASK-5 y TASK-3.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno en el entregable | — |

### Siguiente paso
**TASK-5 autorizado** (docs) con el **handoff v1.3**, sin esperar a TASK-3:
- usar `-no-color` en cualquier mención de actionlint;
- documentar N2a/N2b como los dos chequeos del modo negativo;
- incluir el criterio de DL-8 (versión, no digest) que pidió la v1.2;
- **anotar** (no reescribir) las filas históricas de STATUS con "→ #N".

TASK-3 sigue esperando a que se libere la localnet de #14.

### Mensaje de commit propuesto (handoff v1.3; TASK-4 ya está en `f146097`)
```
docs: Railway deploy handoff v1.3 (#15)

From the MID review of TASK-4 (PASA): actionlint 1.7.12 takes -no-color,
not -color=never; and the green negative path on BuildKit (run
41802734452) is the N2a evidence, since only the guard's output line can
satisfy the anchored regex, so no extra debug output is added.

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
