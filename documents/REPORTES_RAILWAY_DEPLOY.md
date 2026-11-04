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

## TASK-5

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-5 (documentación)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `f15d820` (handoff v1.3), sin commits del DEV.

### Archivos modificados/creados
- `app/README.md` (+170/−2).
- `agents.md` (+22/−6).
- `documents/STATUS.md` (+26/−4).

### Qué se implementó (3 líneas máx)
**`app/README.md`:**
- Sección nueva "Despliegue (Railway)" después de "Testnet". Cubre la imagen, la guarda de #8 con los mensajes literales, la lista blanca, la tabla de cabeceras y la CSP con el porqué de cada origen, y sin COOP por el popup de Slush.
- También documenta:
  - cómo agregar un origen a la CSP, incluido el ícono remoto de Slush, que pasa al smoke B;
  - el fallback a `Report-Only`;
  - `check-deploy-image.sh`: N1, N2a/N2b y N3, P1-P13 y la limpieza por línea base;
  - el job `deploy-image`, que no es requerido;
  - actionlint con `-no-color`;
  - el criterio DL-8: cuenta la versión, no el digest;
  - el favicon;
  - "URL pública: se completa después de #8".
- "Origen del build publicado" ahora dice que la imagen excluye `localnet.json` por construcción.
- En "Pendientes conocidos", "→ #15" pasa a **#58**.

**`agents.md`:**
- §2: el árbol y la frase del layout suman `Dockerfile`, `.dockerignore`, `app/Caddyfile`, `app/public/` y `check-deploy-image.sh`.
- §3 (App): el job `deploy-image` y el comando local, y que el job no condiciona el merge.
- §12: el texto literal del handoff.

**`documents/STATUS.md`:**
- 4 filas de baseline nuevas: TASK-1, TASK-2, TASK-4 (run 41802734452) y TASK-5.
- Fila del ciclo #15, con TASK-3 y TASK-6 pendientes.
- Checklist del owner resumido en 10 pasos, con referencia a la §9 del plan.
- Las filas históricas que antes eran `:49, :76, :82, :88` (ahora `:53, :80, :86, :92`) quedan anotadas con "(→ #58)", sin reescribirlas.
- #58 entra en "Siguiente" (post-MVP) y en los abiertos.

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ninguno.
- **Gates:** solo cambian docs, así que no corrí ninguno (indicación del orquestador). `git diff --stat -- contracts/ documents/DECISIONES.md documents/PLAN_RAILWAY_DEPLOY.md | wc -l` da 0.
- **Tablas de contrato / `app/src/sui/`:** no aplica.

**Verificaciones de §5:**

1. **Rutas personales:** `git diff | grep -cE '/home/|/Users/|/tmp/claude'` da **0**.
2. **Claves:** el grep de `suiprivkey|PRIVATE KEY|mnemonic|ghp_|github_pat_|RAILWAY_TOKEN=` sobre las líneas añadidas da **0**. El único hex de 40-64 es el digest público de actionlint (`b1934ee5…5667`), en el comando documentado del README.
3. **Referencias:**
   - Existen `app/src/sui/networks.ts` (con `fullnode.testnet.sui.io`), `app/src/sui/config.ts`, `app/public/favicon.svg`, `app/Caddyfile`, `app/scripts/check-deploy-image.sh`, `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `contracts/scripts/publish.mjs` y `documents/PLAN_RAILWAY_DEPLOY.md` (§9 en la línea 582, DL-8 y DL-11).
   - `.npmrc:3` tiene `min-release-age=7`.
   - `registerSlushWallet` está en `@mysten/slush-wallet`.
   - Con `gh`: `#58 OPEN [App] Medir y aplicar code-splitting del bundle de testnet (post-MVP)`, `PR #57 OPEN` y `run success f146097`.
   - Excepción: D-20261104-01 no está en el `DECISIONES.md` de esta branch, sino en la de #14 (ver Riesgos).
4. **Mensajes literales:**
   - El mensaje de la guarda está byte a byte igual en `Dockerfile` (1) y en `app/README.md` (1).
   - `1 despliegue(s) válidos y coherentes con Published.toml`, `deployments incoherentes:` y `≠ upgrade-capability de Published.toml` coinciden con `publish.mjs` y `deployment.mjs` de #48.
   - `.nvmrc sin versión válida` está en el `publish.mjs` de #48.
   - `OK (negativo): …` coincide con el script.
   - La CSP del README es idéntica a la que extrae `sed` del Caddyfile.
   - Los valores de `Permissions-Policy`, HSTS, `immutable` y `encode zstd gzip` coinciden con el Caddyfile.

`git diff --check` no encuentra espacios finales.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: son docs.

### Desviaciones del handoff
1. **"#N" ahora es #58.**
   - Qué cambió: en `app/README.md` y `STATUS.md` uso #58 en lugar del `#N` literal.
   - Por qué: el orquestador avisó que el issue ya existe.
   - Verificación extra: `gh issue view 58`.
2. **Las filas anotadas cambiaron de número.**
   - Qué cambió: las filas de `STATUS.md` que el handoff cita como `:49, :76, :82, :88` ahora son `:53, :80, :86, :92`.
   - Por qué: las 4 filas de baseline nuevas van arriba en la tabla. Son las mismas 4 filas y solo se les agregó "(→ #58)".
3. **Corrección propia en la tabla de cabeceras del README.**
   - Qué cambió: el porqué de `Referrer-Policy` dice "los pedidos a terceros no llevan el origen ni la ruta".
   - Por qué: un primer borrador mencionaba el `#/game/<id>`, pero el fragmento nunca viaja en el Referer.

### Riesgos / pendientes
- **D-20261104-01:** el texto de §12 que pide el handoff la cita, pero esa decisión llega a `master` recién con el merge de #14. Si #15 mergea antes, la referencia queda colgada hasta entonces. El handoff ya lo prevé.
- **TASK-3 sigue pendiente** (espera la localnet de #14). Su fila de baseline se agrega a STATUS cuando se reporte. El README ya la marca como pendiente en `style-src`.
- **Housekeeping:** el checklist del owner en STATUS remite a la §9 del plan con `git show <merge>:documents/PLAN_RAILWAY_DEPLOY.md`. El orquestador completa el SHA del merge en ese momento.

### Documentación
- **READMEs y `agents.md` actualizados:** sí. Este task es la documentación de #15 (PROY-20).
- **Snippet propuesto para `documents/STATUS.md`:** ya está aplicado. Es la fila "docs @ `feature/issue-15-pages-deploy` (TASK-5 de #15)" de Baselines, junto con la fila del ciclo #15.
=====

## Revisión TASK-5: NO PASA (2 MINOR de docs, corrección corta)

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.3 (`f15d820`), TASK-5 §3-§7, y el diff real sin
> commitear de `app/README.md`, `agents.md` y `documents/STATUS.md`. Sin gates (docs; D-20261030-02).

### Coherencia con el código (verificada por programa)
- **CSP:** la del README coincide carácter por carácter con la línea `Content-Security-Policy` de `app/Caddyfile`
  (`grep -cF` = 1).
- **Mensaje de la guarda:** el bloque del README es idéntico al literal del `Dockerfile`.
- **Mensajes de `check` (#48)** (`1 despliegue(s) válidos…`, `deployments incoherentes:`, `.nvmrc sin versión válida`)
  y **N3** (`OK (negativo): …`): idénticos a los de `publish.mjs` y del script.
- **Cabeceras:** `nosniff`, `DENY`, `no-referrer`, `Permissions-Policy`, HSTS e `immutable` coinciden con el
  Caddyfile; también `-Server`, el matcher `file` y que no haya fallback ni COOP.
- **Script:** N1/N2a/N2b/N3 y P1-P13 coinciden con el script de `f146097` (P5 = 5 cabeceras más `Cache-Control`), y
  los códigos 0/1/2 también.
- **Comandos:** el actionlint lleva `-no-color` y el archivo explícito (v1.3). La limpieza de Docker es por línea base
  y sin `prune`.
- **DL-8:** se mide por la versión y no por el digest (v1.2), con el ejemplo de Caddy.
- **`agents.md`:** §2 layout con los 5 archivos nuevos (`app/public/`, `Caddyfile`, `check-deploy-image.sh`,
  `Dockerfile`, `.dockerignore`); §3, el job `deploy-image` como no requerido, con el comando local `. 8090`; §12,
  Railway con D-20261104-01/-03. Es coherente con `ci.yml` y con el plan.
- **STATUS:**
  - las 4 baselines (TASK-1/2/4/5) están con SHAs y run reales;
  - la fila del ciclo #15 marca 🚧 y sus pendientes;
  - "Siguiente" suma #58;
  - las 4 filas históricas están **anotadas** "(→ #58)", sin reescribirlas (sugerencia 6). "Renumeradas" (desviación
    2) quiere decir solo que se corrieron de línea porque arriba se agregaron las baselines. Lo confirmé en el diff.
- **Rutas personales:** ninguna. `grep '/home/|/Users/|/tmp/claude'` sobre los tres archivos solo encuentra el
  placeholder previo `<SMOKE_DIR>/home/.sui` de `agents.md:144`.

### Desviaciones declaradas
| # | Desviación | Dictamen |
|---|---|---|
| 1 | `#58` en lugar de `#N` | ✅ Es lo que pedía el handoff, "su número reemplaza #N"; el issue existe |
| 2 | Filas históricas corridas de línea | ✅ Solo cambió el número de línea; el contenido de cada fila tiene solo el "(→ #58)" agregado |
| 3 | Porqué de `Referrer-Policy` | ⚠️ Ver MINOR-2: la corrección quedó imprecisa |

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| MINOR-1 | PROY-20 (docs que viven con el código) / N-1 (checklist no delegable completo) | `documents/STATUS.md`, "Pendientes del usuario" (el bloque "Railway (#15…)"); `app/README.md`, "Despliegue (Railway)", el párrafo inicial | El checklist del owner vive resumido en STATUS y remite a la **§9 del plan**, que el housekeeping borra. Las watch paths, el paso más fácil de copiar mal, quedan solo en el plan. El resumen además omite partes del plan: "New Project", región y sleep (costos, decisión del owner), el puerto que propone Railway, "Deploy latest commit" y la opción de **pausar** el servicio. El defecto venía del handoff v1.3, no del DEV | **Handoff v1.4 (TASK-5 §3):** subsección permanente "Conectar Railway (owner, no delegable)" en `app/README.md`, con los 10 pasos completos y las watch paths literales (bloque idéntico a la §9 del plan), el aviso de N-2 y, en el paso 1, la precondición "TASK-3 (si no corrió en #15) y TASK-6 en PASA". El README apunta a esa subsección y STATUS deja una línea de remisión, sin pasos |
| MINOR-2 | Exactitud (LIM-7: el porqué correcto) | `app/README.md`, tabla "Cabeceras y CSP", fila `Referrer-Policy` | Dice "los pedidos a terceros (fullnode, Slush) no llevan el origen ni la ruta de la app". Es falso para el origen: `no-referrer` omite el `Referer`, pero los `fetch` CORS al fullnode y a `api.slush.app` igual llevan `Origin`, que lo pone el navegador y gRPC-web lo necesita | El texto de la v1.4 (TASK-5 §3): "Los pedidos a terceros (fullnode, Slush) y los enlaces al explorador no llevan `Referer`, es decir, ni la URL ni la ruta de la app. El `Origin` de los pedidos CORS sigue yendo: lo pone el navegador y gRPC-web lo necesita" |

### Siguiente paso
**Correcciones al DEV** con el handoff v1.4 (solo TASK-5, solo docs): MINOR-1 y MINOR-2. Para volver a revisar alcanza
con el diff corregido de `app/README.md` y `documents/STATUS.md`, sin gate.

### Mensaje de commit propuesto (cuando quede en PASA)
```
docs: document the Railway deploy (#15)

app/README.md gains "Despliegue (Railway)": the image and its #8 guard
(literal messages), the allowlist context, the CSP and headers with the
reason for each origin (no COOP, for the Slush popup), how to add an
origin, the Report-Only fallback, check-deploy-image.sh (N1-N3, P1-P13),
the non-required deploy-image job, actionlint -no-color, DL-8 by version,
the favicon, and the owner's Railway checklist. agents.md §2/§3/§12 and
STATUS (baselines, #15 row, historical rows annotated "→ #58").

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-5, correcciones (handoff v1.4)

> Base: `71d68e4` (handoff v1.4), sin commits del DEV. Solo docs, sin gate (D-20261030-02).

### Respuesta a los hallazgos
| # | Estado | Qué se hizo |
|---|---|---|
| MINOR-1 | ✅ corregido | Subsección permanente **"Conectar Railway (owner, no delegable)"** en `app/README.md`, entre "Verificar la imagen" y "Versiones de las imágenes (DL-8)". Tiene los 10 pasos de la §9 del plan **completos**, el aviso de N-2 al principio y las precondiciones en el paso 1. El párrafo inicial de "Despliegue (Railway)" remite a la subsección. En `STATUS.md`, el bloque de 14 líneas quedó en **una línea de remisión**, sin pasos |
| MINOR-2 | ✅ corregido | La fila `Referrer-Policy` de la tabla de cabeceras usa el texto exacto de la v1.4 |

Lo que pide la v1.4 para cada paso de la subsección:
- paso 1: TASK-3 (si no corrió en #15) y TASK-6 en PASA, y `deploy-image` verde por el camino positivo;
- paso 2: New Project → Deploy from GitHub repo;
- paso 5: las watch paths literales;
- paso 6: región y sleep a elección del owner;
- paso 7: el puerto que propone Railway;
- paso 8: "Deploy latest commit" si no arrancó solo;
- paso 9: rollback **o** pausa del servicio, más el detalle del smoke B (§8 del plan) y el ícono remoto de Slush;
- paso 10: N-2 y N-4.

### Diff de las correcciones

`app/README.md`, párrafo inicial de "Despliegue (Railway)":
```diff
-publicar es del owner: el checklist está en `documents/STATUS.md`, "Pendientes del usuario". **URL pública: se completa
-después de #8.**
+publicar es del owner: el checklist completo está en "Conectar Railway (owner, no delegable)", más abajo. **URL
+pública: se completa después de #8.**
```

`app/README.md`, tabla "Cabeceras y CSP":
```diff
-| `Referrer-Policy` | `no-referrer` | Los pedidos a terceros (fullnode, Slush) no llevan el origen ni la ruta de la app |
+| `Referrer-Policy` | `no-referrer` | Los pedidos a terceros (fullnode, Slush) y los enlaces al explorador no llevan `Referer`, es decir, ni la URL ni la ruta de la app. El `Origin` de los pedidos CORS sigue yendo: lo pone el navegador y gRPC-web lo necesita |
```

`app/README.md`, subsección nueva, después de la línea `  - shellcheck del script: la misma imagen con `--entrypoint shellcheck`.`:
````diff
+### Conectar Railway (owner, no delegable)
+
+Solo el owner, después de #8. **Aviso (N-2):** desde el paso 3, cada merge a `master` que toque las watch paths del
+paso 5 **publica el sitio**.
+
+1. **Precondiciones:**
+   - TASK-3 de #15 (si no corrió en #15) y TASK-6 de #15 en PASA;
+   - `deploy-image` del último run de `master` en verde **por el camino positivo**.
+2. Railway → **New Project** → **Deploy from GitHub repo**. La **GitHub App de Railway** se autoriza solo para
+   `sdelvalle57/sui_battleship`.
+3. Servicio → Settings → Source: rama **`master`**; **Wait for CI: activado**; **entornos de PR: desactivados**.
+4. Build: Railway usa el `Dockerfile` de la raíz ("Using detected Dockerfile!"). **No** definir
+   `RAILWAY_DOCKERFILE_PATH` ni comandos de build o start.
+5. Watch paths, en formato gitignore. Si las negaciones no se respetaran, un cambio de docs o tests solo redespliega
+   un `dist` idéntico.
+   ```
+   app/**
+   !app/README.md
+   !app/src/**/*.test.ts
+   !app/src/**/*.test.tsx
+   !app/src/test/**
+   !app/scripts/**
+   !app/eslint.config.js
+   !app/.env.example
+   contracts/deployments/testnet.json
+   contracts/Published.toml
+   contracts/scripts/publish.mjs
+   contracts/scripts/deployment.mjs
+   package.json
+   package-lock.json
+   .npmrc
+   .nvmrc
+   Dockerfile
+   .dockerignore
+   ```
+6. Deploy:
+   - healthcheck path **`/`**, restart `ON_FAILURE` y 1 réplica;
+   - **región y sleep a elección del owner** (afectan los costos);
+   - **Variables: ninguna.** Railway inyecta `PORT`; no definir `VITE_*`.
+7. Networking → **Generate Domain** (`<servicio>.up.railway.app`), con **el puerto que propone Railway**.
+8. Primer deploy: pasa por `WAITING` (Wait for CI), el build queda verde y el healthcheck da 2xx. Si no arrancó
+   solo, **Deploy latest commit**.
+9. Smoke B con la wallet de extensión del owner, en la URL pública:
+   - `testnet · nodo OK`, conectar la wallet (Slush), el lobby, y recargar `#/my-games` y `#/game/<id>`;
+   - consola sin violaciones de CSP, incluido el ícono remoto de Slush;
+   - `curl -sSI <URL>` con las cabeceras de la tabla de arriba.
+
+   Si la wallet no conecta por la CSP, avisar: fallback a `Report-Only`, solo para la CSP. Si algo falla,
+   **rollback** desde Deployments **o pausar** el servicio.
+10. Dejar registrado (N-2) si los merges a `master` con CI verde quedan preautorizados como publicación del sitio, y
+    opcionalmente (N-4) agregar `deploy-image` a los checks requeridos.
+
 ### Versiones de las imágenes (DL-8)
````

`documents/STATUS.md`, "Pendientes del usuario": las 14 líneas del bloque "**Railway (#15, después de #8; no delegable).** El checklist completo está en la §9 de `documents/PLAN_RAILWAY_DEPLOY.md`… Pasos: 1. … 10. …" quedan reemplazadas por una sola línea:
```diff
+- **Railway (#15, después de #8; no delegable):** conectar el servicio y publicar con el checklist de `app/README.md`, "Conectar Railway (owner, no delegable)".
```

### Verificaciones
- **Watch paths:** extraje con `sed` el bloque de código del paso 5 de la §9 del plan y el de la subsección del README. El `diff` sale vacío: son idénticos, 20 líneas con las cercas.
- **`Referrer-Policy`:** el texto de la v1.4 aparece 1 vez en el handoff (normalizando saltos de línea) y 1 vez en el README.
- **Rutas personales:** `git diff -- app/README.md documents/STATUS.md agents.md | grep -cE '/home/|/Users/|/tmp/claude'` da **0**.
- **Claves:** el diff de las correcciones no agrega claves ni hex.
- **Espacios:** `git diff --check` no encuentra espacios finales.
- **Alcance:** `agents.md` no cambia respecto de la entrega anterior. No toqué `DECISIONES.md`, el plan ni `REPORTES_RAILWAY_DEPLOY.md`.

### Desviaciones del handoff
1. **Paso 9 más completo que el plan.**
   - Qué cambió: el paso 9 del plan dice solo "Smoke B de §8 con su wallet". Como el plan se borra en el housekeeping, el README copia lo que cubre el smoke B según la §8 del plan.
   - Por qué: para que el checklist sea autosuficiente, como pide el MINOR-1.
   - Verificación extra: lo copiado son las comprobaciones de la §8 (URL, `testnet · nodo OK`, conectar la wallet, lobby, recargar `#/my-games` y `#/game/<id>`, consola sin violaciones de CSP y `curl -sSI <URL>` con las cabeceras de la tabla del README), más el ícono remoto de Slush que derivó TASK-2. No agregué ningún paso nuevo.
2. **Pasos con detalle que el plan no tiene.**
   - Qué cambió: en el paso 8 agregué "Deploy latest commit" si no arrancó solo, y en el paso 6, que región y sleep "afectan los costos". Ninguno de los dos textos está en la §9 del plan v1.1.
   - Por qué: el handoff v1.4 pide "Deploy latest commit" explícitamente, y el MID cita los costos como razón en el MINOR-1.

### Riesgos / pendientes
Ninguno nuevo. Los de la entrega anterior siguen igual: D-20261104-01 llega con #14 y TASK-3 sigue pendiente.
=====

## Re-revisión TASK-5: PASA

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.4 (`71d68e4`), TASK-5 §3, el addendum
> "TASK-5, correcciones (handoff v1.4)" y el diff real sin commitear de `app/README.md` y `documents/STATUS.md`.

- **MINOR-1: cerrado.** `app/README.md` tiene la subsección permanente **"Conectar Railway (owner, no delegable)"**,
  con los pasos 1-10 completos:
  - el paso 1 lleva la precondición "TASK-3 (si no corrió en #15) y TASK-6 en PASA" y `deploy-image` verde por el
    camino positivo;
  - el paso 2, New Project → Deploy from GitHub repo, con la GitHub App solo para el repo;
  - el paso 6, región y sleep a elección del owner y ninguna variable;
  - el paso 7, el puerto que propone Railway;
  - el paso 8, "Deploy latest commit";
  - el paso 9, el smoke B (con el ícono remoto de Slush), el fallback `Report-Only` y el rollback **o** la pausa;
  - el paso 10, N-2 y N-4.

  Además tiene el aviso de N-2 al principio. Las **watch paths** del paso 5 son **idénticas** al bloque de la §9 del
  plan (`4e7d1a3`): lo comprobé con `diff`, 18 líneas. El párrafo inicial de "Despliegue (Railway)" remite a la
  subsección, y `STATUS.md` deja una sola línea de remisión, sin pasos ni referencia al plan.
- **MINOR-2: cerrado.** La fila `Referrer-Policy` usa el texto exacto de la v1.4: `Referer` omitido, `Origin` de CORS
  presente.
- **Sin regresiones:** el resto del diff de TASK-5 no cambió desde la revisión anterior. La CSP, el mensaje de la
  guarda y las cabeceras siguen idénticos al código. No hay rutas personales.
- **DECISIONES** (cambio del orquestador, no del DEV): la línea (6) de D-20261104-03 dice que TASK-3 pasa al PR de
  seguimiento junto con TASK-6, y es coherente con el paso 1 del checklist.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

### Siguiente paso
Commit de TASK-5. El PR #57 pasa a ready **después** del merge de #14 y de que `master` entre en la branch, porque
D-20261104-01 se cita en `agents.md` §12, el README y el plan. TASK-3 corre en #57 solo si la localnet ya está libre
para entonces; si no, va al seguimiento con TASK-6, como dice D-20261104-03 (6). **Sin housekeeping** en este PR,
porque el ciclo sigue activo.

### Mensaje de commit propuesto
```
docs: document the Railway deploy (#15)

app/README.md gains "Despliegue (Railway)": the image and its #8 guard
(literal messages), the allowlist context, the CSP and headers with the
reason for each origin (no COOP, for the Slush popup), how to add an
origin, the Report-Only fallback, check-deploy-image.sh (N1-N3, P1-P13),
the non-required deploy-image job, actionlint -no-color, DL-8 by version,
the favicon, and the permanent owner checklist "Conectar Railway (owner,
no delegable)" with literal watch paths. agents.md §2/§3/§12; STATUS
baselines, #15 row, historical rows annotated "→ #58".

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-3

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-3 (CSP con el kit montado, localnet aislada)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `d131f44` (merge de `master` con #14). No hice commits.

### Archivos modificados/creados
`documents/SMOKE_RAILWAY_DEPLOY.md`: la parte 2 llena y el estado del encabezado. No cambia código ni config. `contracts/deployments/localnet.json` se creó y se borró en el cierre.

### Qué se implementó (3 líneas máx)
Corrí la localnet aislada (variante B, B4 con `PRE` en todo `suic`, `app.env` con la guarda y separado de `env.sh`) y una partida abierta por CLI. Hice el build de producción de localnet fuera del repo y lo serví con una imagen Caddy desechable en `:8093`, con la CSP real (solo cambia `connect-src` a `:9000`).
En Chrome headless (`:9230`, perfil propio): `localnet · nodo OK`, el lobby con la partida, gRPC 200, los estilos de Lit aplicados por `adoptedStyleSheets` y la recarga de `#/my-games` y `#/game/<id>` funcionando. **0** `securitypolicyviolation`; `style-src 'self'` alcanza sin `'unsafe-inline'`.
El cierre del paso 7 quedó completo, y Docker volvió a la línea base sin `prune`.

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ninguno.
- **Gates:** no se corrieron, porque el task no cambia código. `Move.lock` sin delta (`git diff --exit-code`).
- **Tablas de contrato / `app/src/sui/`:** no aplica.

### Verificación manual (localnet / testnet, digests de tx si hubo)
Detalle completo en `documents/SMOKE_RAILWAY_DEPLOY.md`, parte 2. Resumen:
- **L-0:**
  - puertos de #14 y de #15 libres, y ningún `sui start` ni `<SMOKE_DIR>` de #14;
  - línea base de `~/.sui` con `stat`/`ls`, y de Docker (2 contenedores, 3 imágenes).
- **L-1:** red levantada (chain `59804278`) y publicación variante B con exit 0 (`publishTxDigest` `7pixigzm5TrGiGFtKJEWL6qVkfVcquk9u8BLP1D65FBe`). House con fee 0 y límites 1000000 / 50000000000.
- **L-2:** `create_game` (tx `5mhTu8UJdELX96HwKPs94v9q1jruPAuoLm8yUeEhq7zu`, `success`, `GameCreated` de 0.01 SUI, abierta).
- **L-3:** `index-GeuVE8XQ.js` 917.80 kB en `<SMOKE_DIR>/dist`, y `<repo>/app/dist` idéntico por `sha256`.
- **L-4/L-5:**
  - el `diff` del Caddyfile cambia solo `connect-src`;
  - la imagen da `Valid configuration`, `/` responde 200 y `id -u` = 65534 con `--cap-drop=ALL`.
- **L-6:**
  - `localnet · nodo OK`, y la partida aparece en "Partidas abiertas";
  - gRPC: `GetServiceInfo`, `ListEvents`, `BatchGetObjects` y `GetTransaction`, todos con `POST` 200.
- **L-7:**
  - modal visible con "No wallets installed";
  - `adoptedStyleSheets`: 2 en el botón, 4 en el modal, 3 en `internal-button` y 3 en `wallet-list`;
  - 0 `<style>` inline, y estilos `oklch` aplicados.
- **L-8:**
  - las dos rutas cargan después de `Page.reload`;
  - el detalle muestra "Abierta", 0.01 SUI y comisión 0 %.
- **L-9:**
  - 34 pedidos, de los cuales 13 son `POST` gRPC, todos 200;
  - 0 pedidos fuera de `127.0.0.1` y 0 a MVR;
  - **0** violaciones (listener, logs y `blockedReason`).
- **C-2:**
  - **Procesos:** Chrome, el grabador y la red cerrados por PID; `kill -0` falla en los tres; `sui start` salió con 144, lo esperado.
  - **Docker:** `deploy-image-l5` y `battleship-app:l5-15` borrados, y la `caddy` que se volvió a descargar, borrada por ID. Las diferencias contra la base dan 0/0, y los postgres ajenos siguen intactos.
  - **Archivos:** borré `<SMOKE_DIR>` y `contracts/deployments/`.
  - **`~/.sui`:** idéntico a L-0.
  - **Puertos:** `:9000`, `:8093` y `:9230` libres.

### Desviaciones del handoff
1. **L-2: `c.0` en lugar de `c` en `--move-call`.**
   - Qué cambió: el argumento de la moneda en el comando del handoff.
   - Por qué: `--split-coins` devuelve una lista y `create_game` recibe un `Coin<SUI>`. El handoff ya preveía ajustar la sintaxis y declararlo.
   - Verificación: la tx salió `success`, con `GameCreated`.
2. **L-2: firmó `A` en lugar de `ADMIN`.**
   - Qué cambió: la cuenta que crea la partida. `A` es otra cuenta de la génesis, anotada en `ids.env` y nunca pegada; `ADMIN` publicó y conserva el cap.
   - Por qué: no cambia lo que se mide (una partida abierta en el lobby y en el detalle).
3. **L-5: el `RUN` de la imagen desechable no tiene el `grep -qF 'https://fullnode.testnet.sui.io'`.**
   - Por qué: la copia del Caddyfile de L-4 usa a propósito `http://127.0.0.1:9000`, y ese `grep` fallaría por diseño.
   - Lo demás es idéntico a la etapa runtime, con `setcap -r`, `caddy validate`, `USER nobody` y el mismo `CMD`. El `diff` contra el `Dockerfile` está en la corrida.
4. **Grabador CDP propio en segundo plano.** Lo lancé con `app.env` y `recorder.pid`, y en lugar de `:9339` habla solo con el `:9230` de Chrome. Es el mismo patrón que E-6 de TASK-2: se adjunta a cada página e instala el listener antes de navegar.

### Riesgos / pendientes
- **H-1 (hallazgo para el MID/MAYOR; no hace fallar ningún paso).**
  - Qué falla: la comprobación (b) del `RUN` de bundle del `Dockerfile` (`grep -rqE 'network:"localnet"|"network":"localnet"' app/dist/assets`) **no detecta** un `localnet.json` embebido. El minificador de Vite 8 emite el json como objeto con template literals, ``var _R={schemaVersion:1,network:`localnet`,chainId:`59804278`,…}``. Sobre el bundle real de localnet de L-3, ese patrón da **0** coincidencias.
  - Por qué no es grave hoy: la lista blanca del `.dockerignore` (E-1f/E-1g) impide que `localnet.json` entre al contexto, y la comprobación (a) exige los 4 IDs de `testnet.json`.
  - Qué queda mal: (b) no funciona como segunda barrera. La corrección que propongo es que el patrón acepte también la forma con backticks.
  - Por qué no lo corregí: el Dockerfile está aprobado en TASK-2 y queda fuera del alcance de TASK-3, así que la decisión es del MID o del MAYOR (se puede cambiar en este PR o en TASK-6).
- El ícono remoto de Slush y una wallet real siguen en el smoke B del owner. En localnet Slush está desactivado.

### Documentación
- **READMEs y `agents.md`:** no aplica, porque el task no cambia comandos ni arquitectura. El README de TASK-5 ya dice que `style-src 'self'` "se confirma en TASK-3", y ahora está confirmado. Si el MID quiere, esa línea pasa de "pendiente" a "confirmado (TASK-3, 0 violaciones)" en el commit.
- **Snippet propuesto para `documents/STATUS.md`** (fila de baseline):
  > localnet aislada @ `feature/issue-15-pages-deploy` (TASK-3 de #15, `d131f44`), CLI `1.83.0`, 2026-11-04 | parte 2 de `SMOKE_RAILWAY_DEPLOY.md` (L-0..L-9, C-2) | 🟢 **11/11**. Chain `59804278`; build de producción de localnet servido por Caddy (imagen de la etapa runtime, `--cap-drop=ALL`, 65534) con la CSP real (solo `connect-src` → `:9000`): `localnet · nodo OK`, partida en el lobby, gRPC 13 `POST` 200, `adoptedStyleSheets` > 0 sin `<style>` inline, recarga de `#/my-games` y `#/game/<id>` OK, **0** violaciones (`style-src 'self'` alcanza). Cierre limpio (`~/.sui` y Docker en la línea base). H-1: el patrón de `localnet` del Dockerfile no detecta template literals (mitigado por la lista blanca).
- **Fila del ciclo #15:** TASK-3 pasa de pendiente a ✅.
=====

## Revisión TASK-3: PASA (11/11), con H-1 a TASK-2b en este PR

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.4, TASK-3 §2-§7, y el Anexo A parte 2
> (L-0..L-9, C-2) en `documents/SMOKE_RAILWAY_DEPLOY.md`. Branch @ `d131f44` (con `master` y #14). Sin gates propios.

### Verificación
- **Precondición:** se cumplió. #14 ya está mergeado y su localnet se cerró. L-0 midió los puertos libres, sin
  `sui start` ni `<SMOKE_DIR>` de #14, y la línea base de `~/.sui` (solo `stat`/`ls`) y de Docker.
- **Localnet aislada (`agents.md` §3):** chain `59804278`, publicación variante B, y `suic` siempre con el prefijo
  `PRE` (B4). La partida se creó por CLI (`success`, `GameCreated` de 0.01 SUI). Los digests son de una localnet
  desechable; no hay claves ni direcciones pegadas.
- **Build fuera del repo (L-3):** `<SMOKE_DIR>/dist`, y `<repo>/app/dist` quedó idéntico por `sha256` (sugerencia 2
  de la v1.1, cumplida).
- **CSP real con el kit montado (L-4..L-9):**
  - la copia del Caddyfile cambia **solo** `connect-src` (con `diff`);
  - la imagen desechable equivale a la etapa runtime: `setcap -r`, `validate`, `nobody` 65534, `--cap-drop=ALL`;
  - Chrome con depuración en `:9230`, perfil propio, `localnet · nodo OK`, y la partida en el lobby;
  - 13 `POST` gRPC, todos 200;
  - `adoptedStyleSheets` en los 4 componentes del kit, 0 `<style>` inline;
  - recarga de `#/my-games` y `#/game/<id>` con el detalle correcto;
  - **0** `securitypolicyviolation`, 0 pedidos fuera de `127.0.0.1` y 0 a MVR.
  - **`style-src 'self'` alcanza.** No hace falta el remedio `'unsafe-inline'`.
- **Cierre (C-2):** el paso 7 completo.
  - Procesos por PID, con `kill -0` fallando en los tres.
  - `contracts/deployments/` borrado.
  - `~/.sui` idéntico a L-0.
  - Docker de nuevo en la línea base, sin `prune`.
  - Puertos libres.
  - Lo confirmé por mi cuenta: `docker ps -a` y `docker images -a` muestran solo los objetos ajenos (2 postgres y
    `busybox`), no existe `contracts/deployments/`, y `:9000`, `:8093` y `:9230` están sin listeners.
- **Higiene del diff:** `SMOKE` y `REPORTES` sin rutas personales ni claves, y sin IDs `0x` de 40-64 nuevos en el
  diff del SMOKE.

### Desviaciones declaradas
| # | Desviación | Dictamen |
|---|---|---|
| 1 | `c.0` en `--move-call` | ✅ El handoff lo preveía ("ajustar la sintaxis y declararlo"): `--split-coins` devuelve un vector |
| 2 | Firmó `A` en lugar de `ADMIN` | ✅ No cambia lo que se mide; es una cuenta de la génesis aislada, nunca pegada |
| 3 | L-5 sin el `grep` del origen del fullnode | ✅ Por diseño: la copia usa `:9000`. El resto de la etapa es idéntico (`diff` en la corrida) |
| 4 | Grabador CDP propio | ✅ Mismo patrón que E-6; solo `:9230`, PID propio, cerrado en C-2 |

### H-1 (encontrado por el DEV): se corrige en este PR
- **Se confirma.** El patrón (b) del `Dockerfile:22` solo acepta comillas dobles, y Vite 8 emite el registro como
  ``network:`localnet` ``. Lo comprobé con muestras: el patrón viejo da 0 coincidencias con la forma de backticks.
- **Gravedad: MINOR.** La primera barrera (lista blanca, E-1f/E-1g) y la comprobación (a) siguen firmes, y nada está
  publicado. Pero (b) es justamente la segunda barrera de "Origen del build publicado" que documenta el README, y hoy
  no cumple lo que promete.
- **Decisión: corregirlo en este PR, antes del ready.** Coincido con el orquestador: es una línea, y el PR siguiente
  existe para lo que depende de #8, no para deudas propias. Va como **TASK-2b** en el **handoff v1.5**:
  - el patrón nuevo es `network"?:[^[:alnum:]]localnet[^[:alnum:]]`;
  - el literal de §3.2 queda actualizado;
  - la parte 3 del Anexo prueba **rojo con el patrón viejo y verde con el nuevo**, con un `localnet.json` forzado en
    una copia del scratchpad (solo esa copia agrega `!contracts/deployments/localnet.json` a su `.dockerignore`);
  - después, el positivo sin falsos positivos y el negativo;
  - limpieza por línea base.
- **Comprobaciones del MID sobre el patrón nuevo:**
  - toma las 4 formas (comillas dobles, simples, sin comillas en la clave y backticks);
  - no toma ``r===`localnet` ``, ``e.network===`localnet` ``, `localnet:{grpcUrl` ni `` `sui:localnet` ``;
  - da **0** coincidencias en el bundle de testnet actual.
  - **Ojo:** mi grep es `ugrep`, y ahí `[[:punct:]]` no tomó el backtick. Por eso el patrón usa `[^[:alnum:]]` y la
    prueba definitiva es dentro de la imagen, con GNU grep (H-2, H-3 y H-4).
- **Docs que dependen del cambio**, también en TASK-2b:
  - la línea (b) de "La imagen" del README;
  - `style-src 'self'` pasa de "pendiente" a "confirmado en TASK-3";
  - las filas de TASK-3 y TASK-2b en STATUS.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| MINOR-1 (H-1) | DL-3 (b) / LIM-11 | `Dockerfile:22` (aprobado en TASK-2; origen del defecto: el plan v1.1) | La comprobación (b) no detecta el registro `localnet` con template literals, que es la forma real del bundle de Vite 8 | TASK-2b (handoff v1.5): patrón `network"?:[^[:alnum:]]localnet[^[:alnum:]]`, con rojo viejo y verde nuevo en la parte 3 del Anexo |

TASK-3 en sí no tiene hallazgos: H-1 es de TASK-2 y lo encontró TASK-3.

### Siguiente paso
**TASK-2b autorizado** (handoff v1.5). Después, la revisión del MID, el commit y el PR #57 a ready.
D-20261104-03 (6) **no aplicó**: TASK-3 corrió en #57. Conviene agregar a la línea (6) "(no aplicó: la localnet se
liberó y TASK-3 corrió en #57, `<sha>`)".

### Mensaje de commit propuesto (TASK-3: SMOKE parte 2 y reportes)
```
docs: record TASK-3, the CSP with the wallet kit mounted (#15)

Run the production localnet build behind the runtime-stage Caddy image
with the real CSP (only connect-src pointed at the isolated localnet):
localnet · nodo OK, lobby with a CLI-created game, 13 gRPC POSTs 200,
Lit styles via adoptedStyleSheets, deep-route reloads, and 0 CSP
violations, so style-src 'self' holds. SMOKE part 2 11/11; isolated
localnet closed per agents.md §3 step 7, Docker back to baseline.

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## TASK-2b

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-2b (H-1: la comprobación (b) detecta `localnet` en cualquier forma)

### Branch (con SHA corto del HEAD)
`feature/issue-15-pages-deploy` @ `bbb419f` (handoff v1.5). No hice commits.

### Archivos modificados/creados
- `Dockerfile`: 1 línea, la de (b).
- `app/README.md`: +4/−3.
- `documents/STATUS.md`: +4/−2.
- `documents/SMOKE_RAILWAY_DEPLOY.md`: parte 3 y estado del encabezado.

### Qué se implementó (3 líneas máx)
La comprobación (b) del `RUN` de bundle pasa a `grep -rqE 'network"?:[^[:alnum:]]localnet[^[:alnum:]]' app/dist/assets`, con el mismo mensaje. Lo extraje del bloque `dockerfile` de §3.2 v1.5 y el `diff` contra el Dockerfile anterior da solo la línea 22.
En el README, la línea (b) de "La imagen" describe el registro de `localnet` en cualquier forma, y `style-src 'self'` pasa a **confirmado** en TASK-3.
En STATUS agregué las filas de baseline de TASK-2b y TASK-3. En la fila del ciclo #15, TASK-3 queda ✅ con "H-1 corregido (TASK-2b)".

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ninguno.
- **Gate `app`:** no aplica (§5.3 del handoff). En `app/` solo cambia el README.
- **Contracts:** sin cambios.
- **Verificación 2:** `git diff -U0 Dockerfile` da **una** línea `-` y **una** `+`:
```diff
-    if grep -rqE 'network:"localnet"|"network":"localnet"' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \
+    if grep -rqE 'network"?:[^[:alnum:]]localnet[^[:alnum:]]' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \
```
- **Verificación 4 (greps sobre el diff):** claves 0, rutas personales 0, hex 40-64 nuevos 0. `git diff --check` limpio.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No usé localnet ni testnet. Detalle en `documents/SMOKE_RAILWAY_DEPLOY.md`, parte 3:
- **H-0:** línea base de 2 contenedores y 3 imágenes; `:8090` libre.
- **H-1:** contexto sintético armado como en E-1a..E-1e.
  - Le sumé el `localnet.json` literal del fixture de #48 (`cmp`) y `!contracts/deployments/localnet.json` solo en el `.dockerignore` de la copia.
  - `check` da `2 despliegue(s) válidos y coherentes con Published.toml`.
  - El repo queda con solo ` M Dockerfile`.
- **H-2 (rojo):** con el patrón viejo en la copia, el build sale con **`exit=0`** en 128 s.
  - `Successfully tagged battleship-app:h2-15`.
  - Dentro de la imagen, `/srv/assets` tiene ``network:`localnet`,chainId:`878…``.
  - Esto reproduce H-1.
- **H-3 (verde):** con el patrón v1.5 (copia = repo), el build sale con **`exit=1`** en el Step 13, con `ERROR (#15): localnet en el bundle`.
  - Los Steps 1-12 pasan: guarda, `check`, `npm ci` y build.
- **H-4:** sin `localnet.json` (copia = `.dockerignore` del repo), `check-deploy-image.sh <ctx> 8090` da P1-P13 y **`exit=0`** (`OK (positivo)`, 98 s). Con GNU grep de bookworm no hay falsos positivos.
- **H-5:** el negativo en el repo real da `OK (negativo)`, **`exit=0`**.
- **C-3:** 0 contenedores nuevos y 25 imágenes nuevas, todas borradas por ID.
  - Las 25 son 23 intermedias `<none>` derivadas de `node`, más `node:26.12.1` y `caddy:2.11.7`.
  - El `comm` repetido sale vacío y no falta nada de la base: los postgres ajenos y `busybox` siguen intactos.
  - Borré `h1-15` y `docker-base-15-h`; `:8090` libre.

### Desviaciones del handoff
1. **H-3: los Steps 1-12 vinieron de la caché del builder clásico.**
   - Qué pasó: H-2 y H-3 usan el mismo contexto y solo difieren en la línea del Step 13, así que esos pasos ya estaban construidos.
   - Por qué está bien: los Steps 1-12 se ejecutaron de verdad en H-2, dentro de la misma corrida, y H-3 corre en limpio el Step 13, que es lo que se mide.
2. **STATUS: dos cambios fuera de la fila del ciclo.**
   - Qué cambió:
     - en la fila del ciclo #15 actualicé "handoff v1.3" a "handoff v1.5";
     - en la fila "Siguiente", "#15 (… TASK-3/TASK-6 en el seguimiento)" pasó a "#15 (PR #57, listo para pasar a ready tras TASK-2b; TASK-6 en el seguimiento)". Esa redacción venía de la resolución del merge con `master`.
   - Por qué: con TASK-3 hecho, las dos quedaban desactualizadas.
3. **SMOKE: la parte 3 quedó después del "Reporte final (parte 2)" y antes del de la parte 1.** El archivo ya tenía los reportes finales intercalados de esa forma, así que mantuve el mismo esquema.

### Riesgos / pendientes
- **Ninguno nuevo.** La primera vez que el patrón nuevo corre con BuildKit es en el CI de PR #57. En el camino negativo no llega al Step 13, así que el patrón recién se ejerce por el camino positivo en TASK-6, después de #8. Lo que sí está probado es que el patrón es POSIX ERE y que GNU grep de la imagen lo evalúa como se espera (H-3/H-4). Como el `grep` corre dentro de la imagen, ese resultado no depende del builder.
- **TASK-6 sigue pendiente de #8.**

### Documentación
- **READMEs y `agents.md`:** sí, `app/README.md`. Los dos textos son los literales de la v1.5:
  - (b): "que no haya un registro de `localnet` embebido (`network` con valor `localnet` en cualquier forma: comillas dobles, simples o el template literal que emite Vite 8)";
  - `style-src 'self'`: "**confirmado** en TASK-3 de #15: con el kit montado (lobby, modal, rutas profundas), 0 violaciones; Lit aplica sus estilos por `adoptedStyleSheets` y no inserta `<style>`".
- **`agents.md`:** no aplica.
- **`documents/STATUS.md`:** las filas de baseline de TASK-2b (7/7) y TASK-3 (11/11) ya están aplicadas, y la fila del ciclo #15 tiene "TASK-3 ✅ … H-1 corregido (TASK-2b)".
=====

## Revisión TASK-2b: PASA (H-1 cerrado)

> Revisor: MID | Fecha: 2026-11-04 | Contra: HANDOFF_RAILWAY_DEPLOY v1.5 (`bbb419f`), TASK-2b §3-§7, Anexo A parte 3, y
> el diff real sin commitear. Sin gates propios.

- **`Dockerfile`:** `git diff` muestra **una** línea, la (b), con el patrón `network"?:[^[:alnum:]]localnet[^[:alnum:]]`
  y el mismo mensaje. El archivo entero es **idéntico** al literal de §3.2 de la v1.5 (lo comparé con `diff` contra el
  bloque del handoff).
- **`app/README.md`:** la línea (b) de "La imagen" y la de `style-src 'self'` ("confirmado en TASK-3…") usan el texto
  de la v1.5. Nada más cambió.
- **`STATUS.md`:**
  - filas de baseline de TASK-3 (11/11) y TASK-2b (7/7);
  - la fila del ciclo #15 pasa a handoff v1.5, con TASK-3 ✅ y H-1 corregido;
  - "Siguiente" actualizado.

  La desviación 2 (dos frases que habían quedado viejas, como "handoff v1.3" y "TASK-3 en el seguimiento") corrige
  información desactualizada y no cambia el alcance: ✅.
- **SMOKE, parte 3 (7/7):**
  - **H-1:** el contexto es el esperado. `localnet.json` es igual al fixture byte a byte, y el `.dockerignore` de la
    copia difiere solo en `!…localnet.json`. `check` da "2 despliegue(s)".
  - **H-2 (rojo):** con el patrón viejo, el build da `exit=0` y la imagen sirve ``network:`localnet` ``. Esto
    **reproduce H-1** dentro de la imagen, con GNU grep.
  - **H-3 (verde):** con el patrón nuevo, `exit=1` en el Step 13 con `ERROR (#15): localnet en el bundle`.
    - La desviación 1 es que H-3 reusó la caché de los Steps 1-12 de H-2: ✅. El contexto es el mismo y el Step 13 es
      el único que cambia, así que se ejecutó entero. Es lo correcto para aislar el efecto del patrón.
  - **H-4:** sin falsos positivos. El positivo da P1-P13 con `exit=0` en la imagen (GNU grep de bookworm).
  - **H-5:** el negativo da `exit=0`.
  - **C-3:** 25 imágenes nuevas, borradas por ID sin `prune`, con el `comm` vacío.

  Lo confirmé por mi cuenta: Docker está en la línea base (2 postgres ajenos y `busybox`), no existen
  `<scratchpad>/h1-15` ni `docker-base-15-h`, y `:8090` está libre. La desviación 3 (el orden de los reportes finales
  del SMOKE) es cosmética: ✅.
- **Higiene:** el diff no tiene rutas personales, claves ni hex nuevos. `.dockerignore`, `Caddyfile`, el script,
  `ci.yml`, `app/src` y `contracts` no cambiaron. El gate `app` no aplica (declarado): la CI del PR lo corre igual.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno. **H-1 (MINOR-1 de la revisión de TASK-3) cerrado** | — |

### Siguiente paso
Commit de TASK-2b y push. Con el run de CI en verde, el **PR #57 pasa a ready** para la revisión de integración del
MAYOR. Body en `<scratchpad>/pr57_body.md`, con `<sha TASK-2b>` y la sección CI pendientes.

### Mensaje de commit propuesto
```
app: catch an embedded localnet record in any quoting (#15)

The image's bundle check (b) only matched double-quoted
network:"localnet", but Vite 8 emits the deployment record with
template literals (network:`localnet`), so a leaked localnet.json would
have passed. The pattern is now network"?:[^[:alnum:]]localnet[^[:alnum:]].
SMOKE part 3 7/7: with a forced localnet.json in a scratchpad copy the
old pattern built the image and the new one fails with "localnet en el
bundle"; positive and negative paths stay green; Docker back to
baseline. README: check (b) described, style-src 'self' confirmed by
TASK-3. STATUS: TASK-3 and TASK-2b baselines.

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## TASK-6

> Reporte del DEV (texto plano en el scratchpad, copiado tal cual por el orquestador tras leerlo entero y pasar los 4 greps §R-6).

## Task completado: HANDOFF_RAILWAY_DEPLOY — TASK-6 (v1.6.1)

### Branch (con SHA corto del HEAD)
`feature/issue-15-task6`, HEAD `3f510d2` (D-20261104-07). Es hijo de `5af2fb0` (handoff v1.6.1), que es hijo de
`ec359ec`. Árbol limpio al arrancar. Sin commits ni pushes.

### Archivos modificados/creados
Solo los 5 de §4, medidos contra `3f510d2`:
```
 Dockerfile                        |  4 +--
 app/README.md                     | 38 ++++++++++++++--------
 app/scripts/check-deploy-image.sh |  6 ++--
 documents/SMOKE_RAILWAY_DEPLOY.md | 68 ++++++++++++++++++++++++++++++++++++++-
 documents/STATUS.md               |  5 +--
 5 files changed, 101 insertions(+), 20 deletions(-)
```
`git status --porcelain --untracked-files=all`: ` M` en esos 5 y nada más.
`git diff --stat -- app/src app/package.json package-lock.json contracts .github .dockerignore app/Caddyfile agents.md README.md documents/DECISIONES.md documents/HANDOFF_RAILWAY_DEPLOY.md documents/PLAN_RAILWAY_DEPLOY.md`: vacío.

### Qué se implementó (3 líneas máx)
- `Dockerfile:3-4` pasa a Node 26.13.0 por digest (§3.1).
- N2b del script queda anclado a la cabecera del paso, con una regex de dos ramas (§3.2).
- Docs de §3.3 en `app/README.md`, `STATUS.md` y la parte B del SMOKE, con T6-0..T6-10 y C-4 corridos. T6-7 queda en ⏳ (T6-7).

### Tests y gates (output pegado, por área tocada)
- **Agregados/modificados:** ningún test. Lo único de código es el bloque de N2b del script.
- **Contracts:** no aplica (sin cambios en `contracts/`; `git diff --stat -- contracts/` vacío). No se corrió ningún `sui`.
- **App:** gate no aplica (§5.1): no cambian `app/src/`, tests ni dependencias (diff vacío, arriba). El build de la app
  con Node 26.13.0 lo hizo la imagen en T6-8, con el bundle `index-B3BeMVQC.js`, el mismo de la CI.
- **shellcheck (T6-3):** ShellCheck 0.11.0 (imagen `rhysd/actionlint:1.7.12@sha256:b1934ee5…5667`, el digest de
  `app/README.md:214`), `exit=0`, sin hallazgos.
- **Tablas de contrato y `app/src/sui/`:** no aplica.

Diff de código (T6-2):
```
diff --git a/Dockerfile b/Dockerfile
@@ -1,7 +1,7 @@
 # Imagen de la app para Railway (#15): build estático de testnet + Caddy. Contexto acotado por .dockerignore.
 # Sin --mount, heredocs ni "# syntax=": sirve con BuildKit (Railway, CI) y con el builder clásico (DL-9).
-# Node 26.12.1 por la regla de 7 días (DL-8); TASK-6 sube a 26.13.0.
-FROM node:26.12.1-bookworm-slim@sha256:88e480776c6149ff1d098cd304f44bf18057fb5d284a3329b78162d29821e28c AS build
+# Node 26.13.0: la misma versión que el gate local y la CI; fijada por digest con la regla de 7 días (DL-8).
+FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
 WORKDIR /repo
diff --git a/app/scripts/check-deploy-image.sh b/app/scripts/check-deploy-image.sh
@@ -97,8 +97,10 @@ if [ ! -f "$ctx/contracts/deployments/testnet.json" ]; then
-  # N2b: el build tiene que cortarse en la guarda, sin llegar a npm ci.
-  if grep -qE 'RUN npm ci' "$log.plain"; then
+  # N2b: el build tiene que cortarse en la guarda, sin llegar a npm ci. Se busca la cabecera del paso y no el extracto
+  # del Dockerfile que BuildKit imprime alrededor del RUN que falla. BuildKit: "#<n> [build <k>/<m>] RUN npm ci", con
+  # <k> alineado con espacios; clásico: "Step <k>/<m> : RUN npm ci".
+  if grep -qE '^(#[0-9]+ \[build +[0-9]+/[0-9]+\] |Step [0-9]+/[0-9]+ : )RUN npm ci' "$log.plain"; then
     tail_log "docker build" "$log"
     fail "N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)"
```
Comparé `Dockerfile:3-4` y `check-deploy-image.sh:100-106` con los literales de §3.1 y §3.2, extraídos del handoff, con
`diff`: son idénticos.

### Verificación manual (Anexo A, parte B; la misma tabla que quedó en documents/SMOKE_RAILWAY_DEPLOY.md)

Corrida del 2026-11-04, de 16:26 a 16:45 UTC. Builder clásico. Puertos: 8090, 8092 y 9230, todos libres antes de usarlos.

- **T6-0 ✅ (D-20261104-07).**
  - `date -u` = 2026-11-04T16:26:19Z, 31 min 22 s antes de la puerta. Se sigue por D-20261104-07 (`3f510d2`), así que no
    es STOP. La edad de v26.13.0 a esa hora es de 167,48 h.
  - `git log -1 --format='%h %p'` → `3f510d2 5af2fb0`; `git log -1 --format='%h %p' 5af2fb0` → `5af2fb0 ec359ec`.
  - `git status` vacío; `ls contracts/deployments` → `testnet.json`.
  - Línea base en `<scratchpad>/docker-base-15-t6/`: 2 contenedores y 3 imágenes (`postgres:17`, `postgres:16-alpine`,
    `busybox:latest`), Build Cache `0B`, 2 volúmenes locales (ajenos).
  - `ss -ltn` sin filas en 8090, 8092 y 9230. `docker buildx` → "unknown command".
- **T6-1 ✅ (D-20261104-07).** Medido a las 16:26:28Z.
  - Hub: `.digest` = `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9`, `last_updated`
    2026-10-28T23:41:51Z.
  - Registry, con token anónimo sin imprimir: `HTTP/2 200`, `content-type: application/vnd.oci.image.index.v1+json` y
    `docker-content-digest` = el mismo.
  - `published_at` de v26.13.0 = 2026-10-28T16:57:41Z.
  - Caddy en Hub: `sha256:e70b164d…4ee5`, sin cambios.
  - `docker pull node:26.13.0-bookworm-slim@<digest de §3.1>`: exit 0, `Digest: sha256:bc0a2afd…c1d9`.
  - `docker run --rm --entrypoint node …@<el mismo digest> --version` → `v26.13.0`.
  - A las 16:27:01Z, la edad es de 167,49 h (< 168 h). Se acepta por D-20261104-07.
- **T6-2 ✅** `Dockerfile | 4 ++--` y el script `| 6 ++++--`. Diff arriba.
- **T6-3 ✅** shellcheck `exit=0`, sin output (en stderr solo sale el log del pull de la imagen).
- **T6-4 ✅** Copia de `git ls-files` a `<scratchpad>/n2-15/ctx`, con `rm` de `testnet.json` y `Published.toml`.
  - `node …/publish.mjs check` → `0 despliegues`, `exit=0`.
  - La copia no tiene `node_modules`, `app/dist` ni `.env.local`; `Dockerfile` y script son los de T6-2 (`diff -q`).
  - `git status` → ` M Dockerfile`, ` M app/scripts/check-deploy-image.sh`.
- **T6-5 ✅** `Modo negativo: el contexto no tiene contracts/deployments/testnet.json` /
  `OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse`, `exit=0`, 2 s.
- **T6-6 ✅** La guarda de la copia queda así:
  `RUN test -f contracts/deployments/testnet.json || echo "ERROR (#15): falta contracts/deployments/testnet.json. … (nunca IDs a mano)."`,
  sin `>&2; exit 1`.
  - (1) `exit=1` en 94 s. Últimas líneas:
    ```
    Step 13/19 : RUN set -eu;     for f in packageId originalPackageId houseId publishTxDigest; do …
    Error: Cannot find module './contracts/deployments/testnet.json'
    Node.js v26.13.0
    … returned a non-zero code: 1
    FALLO: N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)
    ```
    N1 y N2a pasaron.
  - (2) `docker build --force-rm -t battleship-app:n2-15 …` → `exit=1`; `docker rmi battleship-app:n2-15` no tenía nada que
    borrar. Grep con el patrón literal de §3.2 sobre `red.plain`: 1 línea, `29:Step 9/19 : RUN npm ci`.
  - Observación: el build (2) usó la caché de (1) en los pasos 1-12 (`Using cache` ×11), así que su log no repite el
    `echo` de la guarda. La línea de salida que exige N2a es la del build (1).
- **T6-7 ⏳ (T6-7).** Lo corre y lo registra el orquestador (MINOR-1).
- **T6-8 ✅** `CHECK_KEEP_TAG=battleship-app:ensayo-15 bash app/scripts/check-deploy-image.sh . 8090` → `exit=0` en 107 s:
  ```
  Modo positivo: el contexto tiene contracts/deployments/testnet.json
  P1 ok: imagen construida
  P2 ok: el contenedor responde en http://127.0.0.1:8090/
  P3 ok: corre como 65534 con --cap-drop=ALL
  P4 ok: / 200 y CSP idéntica a la del Caddyfile
  P5 ok: cabeceras de seguridad y Cache-Control de / exactas
  P6 ok: sin Cross-Origin-Opener-Policy ni Server
  P7 ok: /assets/index-B3BeMVQC.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable
  P8 ok: /assets/index-B3BeMVQC.js comprimido (zstd)
  P9 ok: /favicon.svg 200, image/svg+xml
  P10 ok: /no-existe 404
  P11 ok: /game/0x1 404
  P12 ok: /assets/no-existe.js 404 sin immutable
  OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)
  ```
  P7 da el mismo bundle que la CI (`index-B3BeMVQC.js`).
- **T6-9a ✅**
  - `docker run -d --name deploy-image-e6 --cap-drop=ALL -e PORT=8092 -p 127.0.0.1:8092:8092 battleship-app:ensayo-15`;
    `/` da 200.
  - Chrome headless 156 con perfil, `HOME` y `XDG_*` en `<scratchpad>/chrome-15-t6/` y depuración en `127.0.0.1:9230`.
    El PID se guardó al lanzarlo.
  - La sonda CDP (Node 26, `WebSocket` nativo) se conecta a nivel browser con sesiones `flatten`. Habilita `Page`,
    `Network`, `Log` y `Runtime`. El listener de `securitypolicyviolation` va por `Page.addScriptToEvaluateOnNewDocument`
    y reporta por `Runtime.addBinding`. Captura `console.error`/`assert`, `exceptionThrown`, `Log` de nivel error,
    `loadingFailed` no cancelado y respuestas ≥ 400.
  - Salida (cada campo por separado, sin volcado del DOM):
    ```
    9a.badge: testnet · nodo OK
    9a.header: {"conectarWallet":true,"misPartidas":true,"administrarHouse":false}
    9a.crearHint: true            ("Conecta tu wallet para crear una partida")
    9a.lobby: {"filas":[],"texto":["No hay partidas abiertas"]}
    ```
- **T6-9b ✅**
  - El ID sale del `GameCreated` de la tx "crear" de la fila "Despliegues" de STATUS, leído con `SuiGrpcClient` público
    (`getTransaction` con eventos), con el `@mysten/sui` 2.37.0 ya instalado en el worktree. Salida del script:
    `status=true eventos=1 GameCreated=1` y `GAME=0x6173…6858`. El ID completo quedó en un archivo con modo 600 en
    `<scratchpad>/n2-15/`, que después se borró.
  - Contraste sin imprimir: `git show acdc669:documents/HANDOFF_TESTNET_PUBLISH.md | /usr/bin/grep -c -F -f <archivo>` → 1.
    La abreviatura es igual a la de B10 (`0x6173…6858`).
  - Después de `Page.reload`:
    `9b.campos: {"id":"0x6173…6858","estado":"Cancelada","comision":"2 %","apuesta":"0.001 SUI"}`, y `hashOk: true`.
- **T6-9c ✅** Después de `Page.reload`: el texto "Conecta tu wallet para ver tus partidas e invitaciones" está presente;
  `main ul, main ol` = 0; hash `#/my-games`.
- **T6-9d ✅ (CORS/403, SUG-2)**
  - Hubo 4 `GET https://api.slush.app/api/wallet/metadata`, uno por carga de la app (4 cargas). La página no ve ninguna
    respuesta.
  - Cada uno dejó estas 4 entradas:
    ```
    log.javascript  Access to fetch at 'https://api.slush.app/api/wallet/metadata' from origin 'http://127.0.0.1:8092' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
    loadingFailed   net::ERR_FAILED blockedReason=null cors=MissingAllowOriginHeader  (https://api.slush.app/api/wallet/metadata)
    log.network     Failed to load resource: net::ERR_FAILED  (https://api.slush.app/api/wallet/metadata)
    console.error   Error fetching metadata TypeError: Failed to fetch   (exacto; le sigue el stack de /assets/index-B3BeMVQC.js)
    ```
  - 0 violaciones de CSP.
- **T6-9e ✅**
  - Clic real (`Input.dispatchMouseEvent`) en el `button` de `internal-button`, dentro de `mysten-dapp-kit-connect-button`.
  - `9e.modal: {"titulo":["Connect a wallet"],"botones":["Slush"],"imgs":[{"scheme":"data","naturalWidth":48,"alt":"Slush logo"}]}`,
    `dialogOpen: true`.
  - 0 violaciones de `img-src`, así que no hay STOP. Como la metadata no respondió, el ícono remoto queda sin medir y
    sigue en el smoke B (B-5).
- **T6-9f ✅**
  - Hubo 1 target `page` con `openerId` = la pestaña de la app (URL inicial vacía).
  - En el popup: `{"openerNotNull":true,"origin":"https://my.slush.app","path":"/dapp-request"}`. Sin login.
  - `Target.closeTarget` → `{"success":true}`. Después, la app sigue en `testnet · nodo OK` con `cspv: 0`.
- **T6-9g ✅**
  - Pedidos de la app: 44 (`127.0.0.1:8092` 14, `fullnode.testnet.sui.io` 22, `api.slush.app` 4, `data:` 4).
  - gRPC: `GetServiceInfo`, `GetTransaction`, `ListEvents` y `BatchGetObjects` (OPTIONS + POST), sin respuestas ≥ 400.
  - Popup: 23 pedidos desde el attach (sitio de Slush) y 9 entradas de error propias. No las inspeccioné: el límite de
    T6-9g es el de la app, como en E-6e.
  - Pedidos a MVR: 0, en la app y en el popup. `securitypolicyviolation`: 0 (`9g.cspv: []`).
  - Errores de la app: 16, que son las 4 entradas admitidas de T6-9d × 4 cargas. Ninguno más: 0 `exceptionThrown`,
    ningún otro `console.error`, `loadingFailed` o respuesta ≥ 400.
- **T6-10 ✅** Medido a las 16:38:39Z:
  ```
  == Origin: http://127.0.0.1:8092
  HTTP/2 403
  server: cloudflare
  acao=0
  == Origin: https://example.com
  HTTP/2 403
  server: cloudflare
  acao=0
  ```
  Sin cambios respecto de PR #48.
- **C-4 ✅**
  - Chrome: `kill <pid>`, solo el mío. `kill -0` falla, y `pgrep -f "user-data-dir=<perfil>"` da 0.
  - `docker rm -f deploy-image-e6` y `docker rmi battleship-app:ensayo-15` (Untagged + 5 capas).
  - Contenedores nuevos respecto de T6-0: 0. Imágenes nuevas: 24, todas mías. Las borré por ID con `docker rmi`: en la
    pasada 1 borré 15 explícitamente, y las otras 9 cayeron como padres `<none>` sin etiqueta. Eran:
    - 21 intermedias `<none>` con `Cmd ["node"]`, derivadas de `node@bc0a2afd…c1d9`;
    - `node:26.13.0-bookworm-slim@…c1d9`, `caddy:2.11.7-alpine@…4ee5` y `rhysd/actionlint@…5667`.
  - `comm` repetido: contenedores `[]` e imágenes `[]`; faltantes `ps=0 img=0`.
  - `docker system df`: 3 imágenes, 2 contenedores, Build Cache `0B`, igual que en T6-0. No toqué nada ajeno (`busybox`,
    `postgres:16-alpine`, `postgres:17` y sus 2 contenedores) y no usé `prune`.
  - `rm -rf` de `<scratchpad>/n2-15`, `<scratchpad>/chrome-15-t6`, `<scratchpad>/docker-base-15-t6` y de los scripts de la
    sonda (`<scratchpad>/scripts-15`). Ninguno existe ya.
  - `ss -ltn` sin filas en 8090, 8092 y 9230. `git status` solo con los 5 archivos.

**Reporte final (parte B):** 18/18 PASA sin T6-7 (18/19 con T6-7 pendiente). Queda abierto hasta T6-7.

**Imágenes descargadas y su estado:**
| Imagen | Paso | Estado |
|---|---|---|
| `node:26.13.0-bookworm-slim@sha256:bc0a2afd…c1d9` | T6-1 | borrada en C-4 |
| `rhysd/actionlint:1.7.12@sha256:b1934ee5…5667` | T6-3 | borrada en C-4 |
| `caddy:2.11.7-alpine@sha256:e70b164d…4ee5` | la bajó el builder clásico en el build de T6-6/T6-8 | borrada en C-4 |

Nada de esto estaba en la línea base de T6-0.

### Desviaciones del handoff (o "ninguna")
1. **T6-0, puerta de DL-8 levantada (ajuste 1 del orquestador, D-20261104-07).** Arranqué a las 16:26:19Z, antes de las
   16:57:41Z. La edad de v26.13.0 era de 167,48 h en T6-0 y de 167,49 h en T6-1. El resto de T6-0 y T6-1 se cumplió.
   DL-8 se vuelve a medir al commitear: después de las 16:57:41Z ya cumple las 168 h.
2. **HEAD (ajuste 2 del orquestador).** HEAD = `3f510d2` (D-07), no el commit del handoff (`5af2fb0`). Los diffs están
   medidos contra `3f510d2` y tienen solo los 5 archivos.
3. **La sonda de E-6 corrió 3 veces.** Las corridas 1 y 2 tuvieron bugs de la sonda, no de la app:
   - en la 1, el selector del botón no veía el texto, que va en el light DOM de `mysten-dapp-kit-connect-button`, y el
     manejador de `attachedToTarget` tomó el attach de mi propia pestaña como si fuera el popup y la cerró;
   - en la 2, el auto-attach de la sesión de la página no tomó el popup.

   En la 3 detecto el popup por `Target.targetCreated` con `openerId` y lo adjunto con `Target.attachToTarget`. Por eso
   los pedidos del popup se cuentan desde ese momento. Las tres corridas dieron lo mismo en T6-9a..T6-9c, 0 violaciones
   de CSP y 0 pedidos a MVR. Lo reportado es la corrida 3.
4. **T6-6 (2):** el build reutilizó la caché de (1) en los pasos 1-12 (builder clásico). Su log no tiene el `echo` de la
   guarda, pero el grep pedido (la cabecera `Step 9/19 : RUN npm ci`) da 1 línea, como se esperaba.
5. **"Reporte final (parte B)" del SMOKE.** El Anexo dice "Pasos PASA/TOTAL: (lo llena el DEV; queda abierto hasta
   T6-7)", y la tabla de MINOR-1 se lo asigna al orquestador. Puse PASA/TOTAL (18/18 sin T6-7) y dejé T6-7 y el veredicto
   como en la plantilla. El `Estado` de la cabecera queda en "parte B: EN CURSO (T6-7 pendiente); smoke B del owner
   pendiente (S-7)", según §3.3. El orquestador puede sobrescribir los dos.
6. **`app/README.md`, "Ícono remoto de Slush".** Además del texto literal de "Qué pasó en el ensayo", agregué una oración
   con el resultado de T6-9: en E-6 de TASK-6 pasó lo mismo, la metadata no respondió y el ícono siguió siendo el
   `data:`. El handoff pide decir qué pasó "si la metadata respondió". Como no respondió, lo dejé dicho igual, en una sola
   oración.
7. **STATUS, fila de baseline.** No puse el ID abreviado de la partida; se pega solo en el SMOKE (T6-9b). `<sha>` queda
   literal en la fila de #15.
8. **Chrome:** además de los flags de las reglas comunes, usé `--no-first-run --no-default-browser-check`.
9. **T6-9b:** usé el `node_modules` del worktree, que ya estaba instalado e ignorado por git (`@mysten/sui` 2.37.0, la
   versión del lock). No corrí `npm ci`.

### Riesgos / pendientes (o "ninguno")
- T6-7 (BuildKit, PR desechable): lo hace el orquestador. Hasta ese commit, el MID no da PASA.
- DL-8: volver a medir la edad de v26.13.0 al commitear (con el commit después de las 16:57:41Z, da ≥ 168 h).
- `<sha>` de TASK-6 en STATUS `:173`: lo pone el orquestador.
- El ícono remoto de Slush sigue sin medir (403 de Cloudflare con cualquier origen): queda para B-5 del smoke B (S-7).
- `app/README.md:71-73` ("URL pública: se completa después de #8") no se tocó: lo reemplaza TASK-5 de #16 (S-8).

### Documentación
- **READMEs / agents.md:** `app/README.md` actualizado (§3.3: `:80`, Slush, el negativo en una copia, N2b, CI, la
  precondición, el paso 9 con el límite de SUG-2 y GET, la nota de Node). `agents.md` no se toca (§4).
- **`documents/STATUS.md`:**
  - fila de #15: handoff v1.6, TASK-6 (`<sha>`, `Refs #15`) y el Pendiente S-7/S-8;
  - "Siguiente": arranca en "Railway (S-7, owner)";
  - fila de baseline nueva arriba, con la celda de runs del PR desechable en "⏳ (T6-7)".
- **`documents/SMOKE_RAILWAY_DEPLOY.md`:** parte B (T6-0..T6-10 y C-4, T6-7 en ⏳ (T6-7)), "Reporte final (parte B)",
  la tabla del smoke B (B-1..B-6, idéntica a la del handoff, comprobada con `diff`) y el `Estado` de la cabecera.

### §R-6 de #17 (3 greps) más el cuarto grep de MINOR-2 de PR #48
Corrí los 4 greps con `/usr/bin/grep` sobre `git diff` (que incluye las filas de la parte B) y sobre este reporte.

**Sobre `git diff` (guardado en `<scratchpad>/task6.diff`):**
```
== g1  /usr/bin/grep -nE '[0-9a-fA-F]{40,64}'
9:-FROM node:26.12.1-bookworm-slim@sha256:88e480776c6149ff1d098cd304f44bf18057fb5d284a3329b78162d29821e28c AS build
11:+FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
167:+| T6-1 | … Hub `.digest` = `sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9` …
== g2  /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}'
(vacío)
== g3  /usr/bin/grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/'
(vacío)
== g4  /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}'   (con -o)
167:2afd…c1d9  167:164d…4ee5  169:4ee5…5667  176:6173…6858  183:2afd…c1d9  216:2afd…c1d9  216:164d…4ee5
```
Clasificación (comparando prefijo y sufijo):
- g1 `:9`: el digest viejo del `FROM` de Node 26.12.1 (§2 y §3.2, `88e48077…e28c`, línea quitada). Atribuido.
- g1 `:11` y `:167`: el digest de Node 26.13.0 de §3.1 y §0 bis (`bc0a2afd…c1d9`). Atribuido.
- g4 `2afd…c1d9` (`:167`, `:183` y `:216`, de `bc0a2afd…c1d9`): el digest de Node de §3.1. Atribuido.
- g4 `164d…4ee5` (`:167` y `:216`, de `e70b164d…4ee5`): el digest de Caddy de §3.2 y §0 bis. Atribuido.
- g4 `4ee5…5667` (`:169`, de `b1934ee5…5667`): el digest de actionlint de §0 bis y `app/README.md:214`. Atribuido.
- g4 `6173…6858` (`:176`, `0x6173…6858`): el ID de `GAME` (T6-9b), que sale del `GameCreated` y es igual a la abreviatura
  de B10. Atribuido.
- Ninguna dirección de cuenta, completa o abreviada. No hubo nada que quitar.

**Sobre este reporte:** el resultado va al final (§R-6 sobre el reporte).

### Snippet propuesto para documents/STATUS.md
Ya aplicado en el diff: la fila de #15, "Siguiente" y la fila de baseline de TASK-6, con `<sha>` y "⏳ (T6-7)" para el
orquestador.

### §R-6 sobre el reporte (este archivo, antes de agregar esta sección)
```
== g1  líneas 41, 43, 72, 270, 271, 272: los digests completos de Node 26.12.1 (`88e48077…e28c`, línea quitada del
       Dockerfile) y de Node 26.13.0 (`bc0a2afd…c1d9`, §3.1), en el diff pegado y en T6-1
== g2  (vacío)
== g3  275: la línea que transcribe el propio grep 3 (exceptuada)
== g4  (con -o, conteo por valor)
      6 164d…4ee5   -> Caddy `e70b164d…4ee5` (§3.2, §0 bis)
      9 2afd…c1d9   -> Node `bc0a2afd…c1d9` (§3.1)
      5 4ee5…5667   -> actionlint `b1934ee5…5667` (§0 bis, app/README.md:214)
      6 6173…6858   -> GAME `0x6173…6858` (T6-9b, = B10)
      1 8077…e28c   -> Node 26.12.1 viejo `88e48077…e28c` (§2), en la clasificación
```
Todas las coincidencias se atribuyen. No hay direcciones de cuenta ni rutas personales: las rutas van como
`<scratchpad>`, `<repo>` y `<archivo>`. Esta sección solo agrega transcripciones de las mismas abreviaturas, ya
atribuidas.

### Archivos auxiliares que quedan en el scratchpad
- `<scratchpad>/task6.diff`: el `git diff` sobre el que corrí los greps. Se puede borrar.

---

## Revisión TASK-6 (paso 1): T6-7 pendiente

> Revisión del MID, paso 1 de la secuencia de §8 (v1.6.1, MINOR-1). Cubre T6-0..T6-6, T6-8..T6-10 y C-4 contra el
> handoff v1.6.1 (`5af2fb0`) y D-20261104-07 (`3f510d2`). **No es el veredicto:** el PASA de TASK-6 espera el commit
> del orquestador con T6-7 (BuildKit, PR desechable) y la revisión del MID sobre ese commit.

### Qué verifiqué (sin correr gates)
- **Árbol:** HEAD `3f510d2`, que solo agrega D-20261104-07 a `documents/DECISIONES.md`, y es hijo de `5af2fb0`
  (handoff v1.6.1), hijo de `ec359ec`. Sin commitear: los 5 archivos de §4 más este `REPORTES_RAILWAY_DEPLOY.md`. Nada
  fuera de alcance: `.github/`, `contracts/`, `app/src/`, `app/Caddyfile`, `.dockerignore`, `agents.md` y el handoff
  quedan sin diff.
- **Literales:**
  - `Dockerfile:3-4` contra el bloque de §3.1, con `diff`: idénticos;
  - `app/scripts/check-deploy-image.sh:100-106` contra §3.2, con `diff`: idénticos;
  - `bash -n` del script: OK. La línea de `fail` de N2b no cambia, y N2a (`:95-99`) tampoco.
- **Docs de §3.3:**
  - `app/README.md` tiene las 8 ubicaciones: `:80`, "Ícono remoto de Slush", el negativo en una copia, N2b, la CI
    sin ID de run (🔵 1), la precondición sin TASK-3 (🔵 2), el paso 9 con el límite de MINOR-4 y GET, y la nota de
    Node. `:71-73` no se tocó;
  - `documents/STATUS.md`: la fila de #15 (`<sha>` literal y el Pendiente S-7/S-8), "Siguiente" (🔵 4) y una fila de
    baseline con `⏳ (T6-7)`;
  - `documents/SMOKE_RAILWAY_DEPLOY.md`: la parte B con T6-7 en `⏳ (T6-7)`, "Reporte final (parte B)", el smoke B del
    owner idéntico al del handoff y el `Estado` "parte B: EN CURSO (T6-7 pendiente)…".
- **Contenido de las filas:**
  - **T6-0/T6-1:** arranque a las 16:26:19Z, con 167,48 h y 167,49 h: cubierto por D-20261104-07. El resto de T6-0 y
    T6-1 se cumple, y los digests de Node y Caddy son los de §0 bis.
  - **T6-6:** `FALLO: N2b` con el clásico, y la cabecera es `Step 9/19 : RUN npm ci`. Es la prueba de que la rama
    clásica del patrón funciona.
  - **T6-8:** P7 sobre `index-B3BeMVQC.js`, el mismo hash que la CI de `ec359ec`: con Node 26.13.0, el bundle no tiene
    delta.
  - **T6-9a..g:** coinciden con B10 de #8 y con el límite de SUG-2.
  - **T6-10:** 403 `cloudflare`, sin ACAO, con los dos orígenes.
  - **C-4:** Docker volvió a la línea base de T6-0 (2/3/0 B).
- **§R-6** (los 4 greps con `/usr/bin/grep` sobre el `git diff` completo de los 6 archivos):
  - **g1:** solo los digests de Node 26.12.1 (`88e48077…e28c`, la línea quitada) y 26.13.0 (`bc0a2afd…c1d9`, §3.1), en
    el `Dockerfile`, en T6-1 y en las transcripciones del reporte. Atribuidos;
  - **g2:** vacío;
  - **g3:** 1 coincidencia, la línea del reporte que transcribe el propio grep 3 (excepción de SUG-2 de v1.6.1);
  - **g4:** `2afd…c1d9` ×15 (Node, §3.1), `164d…4ee5` ×10 (Caddy, §3.2), `4ee5…5667` ×8 (actionlint,
    `app/README.md:214`), `8077…e28c` ×4 (Node 26.12.1) y `6173…6858` ×9 (`GAME`). La abreviatura de `GAME` es la
    misma que B10 (`git show acdc669:documents/SMOKE_TESTNET_PUBLISH.md`, 5 apariciones). **Todas se atribuyen.**
  - **Ninguna dirección de cuenta ni ruta personal.**

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H-1 | PROY-19 (el conteo verifica lo que dice) | `documents/SMOKE_RAILWAY_DEPLOY.md:380`; `documents/STATUS.md:49`; este reporte `:1749`, `:1777` | La parte B tiene **18** filas (T6-0..T6-8, T6-9a..g, T6-10 y C-4). Con T6-7 en ⏳ hay **17** ✅ (contadas por la columna Estado). El reporte dice "18/18 sin T6-7, o 18/19 con T6-7 pendiente": el conteo correcto es **17/17 sin T6-7, o 17/18 con T6-7 pendiente** | Corrección mecánica del orquestador antes de commitear (abajo, 1-2). El texto del DEV en este reporte queda como está, y esta revisión lo corrige |
| H-2 | PROY-20 | `documents/STATUS.md:174` (fila de #15) | Dice "handoff v1.6": §3.3 se escribió antes de la v1.6.1. Además, la fila no nombra D-20261104-07, que es parte del registro de TASK-6 | "handoff v1.6.1", y sumar "D-20261104-07 (excepción a DL-8 para Node 26.13.0)" a la lista de decisiones de la fila (abajo, 3). El error de origen está en el handoff, que no se toca |
| O-1 | DL-8 | `Dockerfile:3-4` | DL-8 se mide **al commitear**, y D-20261104-07 levanta solo la puerta de arranque (T6-0). A las 16:48:39Z de esta revisión, la versión todavía no tiene 168 h | El commit de TASK-6 va **a partir de las 2026-11-04T16:57:41Z**, con el `date -u` en el cuerpo (abajo, 4). Así no hace falta ampliar D-07 |
| O-2 | — | T6-9g | El DEV no inspeccionó las 9 entradas de error del popup | Se acepta: el límite de T6-9g es el de la app, y el popup es `https://my.slush.app`, bajo su propia política. Es el mismo criterio que E-6e de TASK-2 |

Sin 🔴 ni 🟠. H-1 y H-2 son de texto y se corrigen mecánicamente en el mismo commit.

### Dictamen de las desviaciones 1-9
| # | Desviación | Dictamen |
|---|---|---|
| 1 | La puerta de DL-8 de T6-0 se levantó (16:26:19Z, 167,48/167,49 h) | ✅ Cubierta por D-20261104-07 (decisión del owner), que deja en pie el resto de T6-0 y T6-1, y se cumplió. Queda O-1: el commit va desde las 16:57:41Z |
| 2 | HEAD `3f510d2` (D-07) y no `5af2fb0` (handoff) | ✅ `3f510d2` solo toca `DECISIONES.md` y es nieto de `ec359ec`. Los diffs contra `3f510d2` tienen los 5 archivos. Cumple la intención de MINOR-2 |
| 3 | La sonda de E-6 corrió 3 veces (bugs de la sonda) | ✅ Las fallas fueron del selector y del *attach* del popup, no de la app. Las tres corridas dieron lo mismo en T6-9a..c, 0 violaciones y 0 MVR. Vale la corrida 3. Cerrar la pestaña propia en la corrida 1 no tocó nada ajeno |
| 4 | T6-6 (2) usó la caché de (1) | ✅ El grep pedido es la cabecera `Step 9/19`, que el log trae igual. La línea de salida de la guarda que exige N2a está probada en (1): N2a se evalúa antes que N2b, y (1) llegó a `FALLO: N2b` |
| 5 | El DEV llenó PASA/TOTAL del "Reporte final (parte B)" y el `Estado` | ✅ con corrección. El handoff se contradice: el Anexo dice "lo llena el DEV" y la tabla de MINOR-1 se lo da al orquestador. Vale lo que hizo el DEV (el conteo es dato de la corrida), pero con el número de H-1. El `Estado` ("parte B: EN CURSO (T6-7 pendiente); smoke B del owner pendiente (S-7)") es el literal de §3.3, y el veredicto quedó para el MID, como manda MINOR-1. En el commit de T6-7, el orquestador completa la fila T6-7, la línea de T6-7 del reporte final, la celda de runs de STATUS y el `Estado`. El veredicto lo escribe el MID después |
| 6 | Oración extra en `app/README.md`, "Ícono remoto de Slush" | ✅ Se acepta. §3.3 pedía decir qué pasó si la metadata respondía. La oración dice, con exactitud, que en TASK-6 no respondió y que el ícono siguió siendo `data:`, que es la evidencia de T6-9d/T6-9e/T6-10. Es una sola oración, no contradice la "Conclusión" y evita que el README parezca no haber medido E-6 |
| 7 | La fila de baseline de STATUS no lleva el ID de `GAME` | ✅ Menos superficie en `master`. El ID abreviado queda en el SMOKE (T6-9b), atribuido |
| 8 | Chrome con `--no-first-run --no-default-browser-check` | ✅ Flags inocuos que no tocan el aislamiento (perfil, `HOME`/`XDG_*` propios, depuración en `127.0.0.1`) |
| 9 | T6-9b con el `node_modules` ya instalado del worktree | ✅ Está ignorado por git, es `@mysten/sui` 2.37.0 del lock, y solo hizo lecturas públicas. No hacía falta `npm ci` |

### Cambios mecánicos antes de commitear (orquestador)
1. `documents/SMOKE_RAILWAY_DEPLOY.md:380`: `**18/18** sin T6-7, o 18/19 con T6-7 pendiente` →
   `**17/17** sin T6-7, o 17/18 con T6-7 pendiente` (H-1).
2. `documents/STATUS.md:49`: `🟢 local **18/18** sin T6-7` → `🟢 local **17/17** sin T6-7` (H-1).
3. `documents/STATUS.md:174`, fila de #15: `plan v1.1 y handoff v1.6; D-20261104-03 (P-1..P-5)` →
   `plan v1.1 y handoff v1.6.1; D-20261104-03 (P-1..P-5) y D-20261104-07 (excepción a DL-8 para Node 26.13.0)` (H-2).
4. Commitear **a partir de las 2026-11-04T16:57:41Z** y poner en el cuerpo la línea `DL-8 al commitear: date -u = <hora>`
   (O-1).
5. El `<sha>` de "TASK-6 (`<sha>`, `Refs #15`)" en `STATUS.md:174` sale de este commit: se pone en el commit de T6-7,
   junto con sus celdas.
6. Opcional, fuera del repo: borrar `<scratchpad>/task6.diff` del DEV.

### Siguiente paso
1. El orquestador aplica 1-4 y commitea los 6 archivos con el mensaje de abajo.
2. Corre T6-7 (el PR desechable, con las condiciones de §8) y llena sus celdas, y el `<sha>`, en un commit propio.
3. El MID revisa ese commit y da el veredicto de TASK-6 (paso 4 de §8). Hasta entonces, **TASK-6 no tiene PASA**.

### Mensaje de commit propuesto (TASK-6: los 5 archivos más este reporte)
```
app: bump the image to Node 26.13.0 and anchor N2b to the step header (#15)

TASK-6 of #15 (handoff v1.6.1, S-6 of #17). The build stage moves to
node:26.13.0-bookworm-slim, pinned by its index digest: the same Node as
the local gate and CI. The run started before the 7-day mark under
D-20261104-07; DL-8 is measured again at commit time.
DL-8 al commitear: date -u = <hora>

N2b now matches only the step header of each builder ("Step k/m : RUN
npm ci" on the classic builder, "#n [build  k/m] RUN npm ci" on
BuildKit, which pads k with spaces). The old grep also hit the Dockerfile
excerpt BuildKit prints around a failing RUN, and a single-space anchor
would never match BuildKit's padded header.

Local evidence, classic builder (SMOKE_RAILWAY_DEPLOY.md, part B):
negative path green and induced N2b red on a context copy without
testnet.json and Published.toml; positive path with the real IDs, P1-P13,
same bundle as CI (index-B3BeMVQC.js); E-6 on the real app with 0 CSP
violations, 0 MVR requests and only the known api.slush.app 403. The
BuildKit runs (T6-7) follow in a separate commit.

Docs: app/README.md (Node, negative path on a copy, N2b, CI without run
ID, checklist precondition, smoke B console limit and GET), STATUS and
the DEV report with the MID review (step 1).

Refs #15

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## Revisión TASK-6: PASA

> Revisión del MID, paso 4 de la secuencia de §8 (v1.6.1, MINOR-1). Cubre el commit del orquestador con T6-7
> (`0fef440`) sobre el commit de TASK-6 (`34ba273`), y cierra la revisión del paso 1 (más arriba).

### Qué verifiqué (sin correr gates)
- **`34ba273` (TASK-6):**
  - trae los 6 archivos esperados (los 5 de §4 más este reporte);
  - las correcciones mecánicas 1-3 del paso 1 están aplicadas: 17/17 en el SMOKE y en STATUS, y la fila de #15 con
    "handoff v1.6.1" y D-20261104-07;
  - el cuerpo dice `DL-8 at commit time: date -u = 2026-11-04T16:58:15Z`, ≥ 168 h desde el `published_at` de v26.13.0
    (2026-10-28T16:57:41Z). DL-8 queda cumplida al commitear, y D-20261104-07 cubrió solo el arranque (O-1, cerrada);
  - `Refs #15`, sin `Closes`.
- **`0fef440` (T6-7):** toca solo `documents/SMOKE_RAILWAY_DEPLOY.md` y `documents/STATUS.md`:
  - la fila T6-7, "Reporte final (parte B)" en 18/18, el `Estado` de la cabecera, la celda de runs de la baseline y el
    `<sha>` = `34ba273` en la fila de #15;
  - además marca ✅ el paso 12 del runbook de #8 en "Pendientes del usuario", porque el owner borró los directorios
    temporales. Está fuera del alcance de TASK-6, pero es un hecho del owner en un archivo permitido. Se acepta.
- **PR desechable #66:** `[no mergear] #15 TASK-6: N2b con BuildKit`, draft, `CLOSED`, sin merge (`mergedAt` nulo). La
  branch ya no existe en `origin` (`git ls-remote`: 0). Se cumplen las condiciones de §8: draft, antes de S-7, sin merge
  y branch borrada.
- **Run A [41872958294](https://github.com/sdelvalle57/sui_battleship/actions/runs/41872958294)** (`pull_request`,
  `73cd07e`): `deploy-image` success, con `Modo negativo…`, `OK (negativo): …` y `##[notice]`. `contracts`, `app` y
  `framework-drift` también en success. **Con BuildKit, el patrón anclado no da un falso rojo.**
- **Run B [41873209711](https://github.com/sdelvalle57/sui_battleship/actions/runs/41873209711)** (`pull_request`,
  `38680f0`): `deploy-image` failure, con `FALLO: N2b: …` y `##[error]N2b: …`; los otros 3 jobs en success. Leí el log
  crudo entero (223 líneas):
  - el build es **BuildKit**: hay líneas `#21 0.172 …` y el resumen ` > [build 12/12] RUN set -eu; …`;
  - el `[build 12/12]` confirma que la etapa `build` tiene **12** pasos, el `cmdTotal` de la v1.6. Con ancho 2, la
    cabecera de `npm ci` es `[build  9/12]`, con dos espacios;
  - el build cayó en `Dockerfile:17`, el `require` de `testnet.json`, y el extracto de BuildKit muestra las líneas
    16-24. `RUN npm ci`, que está en `:13`, **no** aparece en el extracto, y el resumen ` > [build 12/12] …` empieza con
    espacio;
  - N2b se evalúa sobre el log completo del build (no sobre la cola), y su patrón está anclado a `^#[0-9]+ \[build +…`
    o a `^Step …`. La única línea que podía coincidir es la cabecera `#<n> [build  9/12] RUN npm ci`. El
    `FALLO: N2b` prueba, por eso, que la rama BuildKit coincide con la cabecera **con relleno**, y que el ` +` era
    necesario: el literal con un solo espacio habría dado `OK (negativo)`;
  - N1 y N2a pasaron, porque `fail` de N2b solo se alcanza después de los dos.
  - En el log no hay claves ni secretos: las únicas rutas son las del runner de Actions, y no se pegan en ningún doc.
- **CI del PR #65** en el head `0fef440`, [run 41873683751](https://github.com/sdelvalle57/sui_battleship/actions/runs/41873683751)
  (`pull_request`): los 4 jobs en success.
  - `deploy-image`: `Modo positivo…`, `P1 ok` … `P12 ok` y `OK (positivo): …` (P13) con `##[notice]`; P7 sobre
    `/assets/index-B3BeMVQC.js` y P8 `zstd`. Es el **camino positivo con los IDs reales y Node 26.13.0 en la imagen**,
    ya con BuildKit;
  - `app`: 292 firmas, `found 0 vulnerabilities`, `Test Files 65 passed`, `Tests 1156 passed`,
    `dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB`. Sin delta contra §0 bis;
  - `contracts`: 83/83, `node --test` 104/104, `check` = `1 despliegue(s) válidos y coherentes con Published.toml`.
- **§R-6** sobre las líneas agregadas en `0fef440`:
  - g1, g2 y g3: vacíos (los run IDs son decimales);
  - g4: solo `2afd…c1d9` (Node, §3.1) y `164d…4ee5` (Caddy, §3.2), atribuidos;
  - ninguna cuenta ni ruta personal.

### Revisión TASK-6: PASA
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Sin hallazgos nuevos. H-1 y H-2 del paso 1 quedaron corregidos en `34ba273`, y O-1 se cerró con el commit a las 16:58:15Z | — |

Checklist de M4:
- **Alcance:** lo que pedía el handoff, ni más ni menos, salvo el ✅ del paso 12 de #8, aceptado. La HU de TASK-6 se
  cumple.
- **Seguridad:** sin secretos ni cuentas. La imagen sigue como `nobody`, con `--cap-drop=ALL`, y la CSP no cambia.
- **Limpieza:** el script cambia solo en el bloque de N2b. Sin código muerto ni debug.
- **Pruebas de N2b en los dos builders:**
  - clásico (local): verde en T6-5 y rojo en T6-6;
  - BuildKit (CI): verde en el run A y rojo en el run B.
- **Positivo con los IDs reales:** P1-P13, en local (T6-8) y en la CI del PR.
- **E-6 (T6-9a..g):** 0 violaciones de CSP, 0 pedidos a MVR y solo los errores de SUG-2.
- **Gates de la CI del PR:** en verde y sin delta.
- **Desviaciones:** las 9 están declaradas y aceptadas (paso 1).
- **Docs (PROY-20):** `app/README.md`, STATUS y SMOKE parte B.

**Precondición del checklist de Railway:** con este PASA, la mitad "TASK-6 de #15 en PASA" queda cumplida. La otra,
"`deploy-image` del último run de `master` en verde por el camino positivo", se cumple con el run `push` del merge del
PR #65. El orquestador la comprueba y anota el run ID en STATUS. **Recién ahí puede empezar S-7.**

### Cambios mecánicos (orquestador, antes del merge o en el housekeeping)
1. `documents/SMOKE_RAILWAY_DEPLOY.md:2`, en el `Estado`: `parte B: 18/18, veredicto del MID pendiente` →
   `parte B PASA (18/18)`.
2. `documents/SMOKE_RAILWAY_DEPLOY.md:386`: `- **Veredicto:** lo da el MID después del commit de T6-7 (MINOR-1).` →
   `- **Veredicto:** PASA (revisión del MID en \`REPORTES_RAILWAY_DEPLOY.md\`, "Revisión TASK-6: PASA").`
3. Commit propuesto para 1-2 y esta revisión, en la misma branch:
   ```
   docs: record the MID verdict for TASK-6 (#15)

   TASK-6 passes: the BuildKit runs of the throwaway PR #66 show the
   anchored N2b green on the negative path (run 41872958294) and red on
   the induced failure (run 41873209711), and the CI of PR #65 runs the
   positive path with Node 26.13.0 in the image. Sets the part B verdict
   of the smoke.

   Refs #15

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. **Después del merge (housekeeping):** anotar en STATUS el run `push` de `master` con `deploy-image` positivo, que es
   la precondición de S-7. El run ID va en STATUS, no en el README. Este ciclo **no** se cierra: #15 sigue abierto hasta
   S-8, y los artefactos `*_RAILWAY_DEPLOY.md` los borra el housekeeping de S-8 (o el de #17, TASK-6).

### Siguiente paso
- El body final del PR #65 está en `<scratchpad>/pr65_body.md`.
- Después vienen la revisión de integración del MAYOR, publicada en el PR, el ready y el merge con merge commit.
- El merge no publica nada, porque Railway todavía no está conectado (S-7).
