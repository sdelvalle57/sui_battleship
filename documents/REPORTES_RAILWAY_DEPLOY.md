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
