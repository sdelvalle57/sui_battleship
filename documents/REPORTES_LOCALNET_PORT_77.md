# Reportes de #77 (el navegador contra otro puerto de la localnet: `VITE_LOCALNET_URL`)

> Reporte del DEV, revisiones del MID y del MAYOR y verificación del orquestador de la tarea de #77 (`documents/HANDOFF_LOCALNET_PORT_77.md`, v1.2). Los textos se transcriben **sin editar** salvo dos sustituciones declaradas:
> 1. La ruta absoluta del scratchpad de la sesión (que codifica el nombre de usuario del host) se reemplazó por `<scratchpad>`.
> 2. Los nombres de contenedores de Docker de **otros proyectos del host**, que el reporte del DEV pegó en un anexo de `docker ps` y en su cierre, se reemplazaron por "un contenedor de otro proyecto del host" o `<contenedor de otro proyecto>` (P-1 de la revisión del MAYOR: no se nombran proyectos ajenos en lo que se commitea).
>
> **Nota sobre el conteo de tests:** el reporte del DEV dice 1362 tests en 67 archivos (1246 + 116). Antes de commitear, el orquestador aplicó N-1 de la revisión del MID y **borró** un test de `loadConfig` que dependía de que no existiera `contracts/deployments/localnet.json` (el mismo caso ya lo prueba `resolveConfig` con `{}`), así que el conteo final es **1361 tests en 67 archivos (1246 + 115)**; ver la sección de verificación del orquestador.
>
> **Historia de la tarea:** el DEV implementó el núcleo, midió el bundle de testnet y **paró** con un STOP legítimo (el criterio "0 apariciones del literal `VITE_LOCALNET_URL`" era inalcanzable por diseño: el nombre es texto estático de `resolveConfig` y `loadConfig`); el MAYOR ratificó con cambios un criterio de 6 puntos y el MID publicó el handoff v1.2; el DEV retomó y completó la tarea. El reporte de abajo es el final.


---

## 1. Reporte del DEV

> DEV, #77: `VITE_LOCALNET_URL`, regla de loopback compartida con la guarda de las capturas, smoke de 8 pasos con navegador.

~~~~text
REPORTE DEV — HANDOFF_LOCALNET_PORT_77 (#77), plantilla §R. Rutas abreviadas: <repo>, <HOME real>, <scratchpad>, <SMOKE_DIR>.

## Task completado: HANDOFF_LOCALNET_PORT_77 (v1.2)

### Branch (con SHA corto del HEAD)
`feature/issue-77-localnet-port`, HEAD `b2704a5` (= `04339cc` + el commit solo de docs del handoff v1.2). Cambios **sin commitear** en el worktree de #77 (`<repo>`); sin commits, sin `git add`, sin `git stash` (`git stash list` vacío). Historia de la sesión: el DEV paró una vez (STOP del criterio "0 coincidencias del literal `VITE_LOCALNET_URL`", inalcanzable por diseño), el MAYOR lo ratificó y el MID publicó el handoff v1.2; este reporte es **el reporte final de la tarea completa**, con el criterio de 6 puntos de v1.2.

### Baseline medido y árbol de partida
Árbol limpio, rama correcta, HEAD de solo docs sobre `master` `b0bbef8`, Node `v26.13.0`; `npm ci` hecho en el worktree (no estaba instalado). Lo medido **coincide** con el handoff (anexos siguientes): `npm ci` 293 paquetes; `npm audit signatures` 292 firmas; `npm audit --omit=dev --audit-level=high` 0 vulnerabilidades de producción; lint 0; typecheck 0; `npm test -w app` **1246 tests en 66 archivos**; build de testnet `index-B3BeMVQC.js` **917.80 kB (277.96 kB gzip)**; `check-deploy-image.sh` con `OK (positivo)`; los 90 tests de la guarda (16 `it`/`it.each`, lista de nombres guardada para el diff posterior). Docker al arrancar: **5 contenedores / 11 imágenes** (el 17 del handoff no aplica a este host; v1.2 dice que la referencia es lo medido al arrancar).

$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
exit=0
$ bash -c cd <repo> && git status -sb && git log --oneline -3 && node --version && cat .nvmrc && docker ps -aq | wc -l && docker images -q | wc -l
## feature/issue-77-localnet-port...origin/master [ahead 2]
04339cc docs: update the localnet browser port handoff to v1.1 with the MAYOR security review changes (corpus, env access, dev server, move proof) (Refs #77)
7796621 docs: add the localnet browser port handoff v1 (VITE_LOCALNET_URL, loopback-only, shared rule with the capture guard) (Refs #77)
b0bbef8 Merge pull request #80 from sdelvalle57/chore/housekeeping-75
v26.13.0
26
5
11
exit=0
$ bash -c cd <repo> && npm ci

added 293 packages, and audited 295 packages in 22s

67 packages are looking for funding
  run `npm fund` for details

9 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force

Run `npm audit` for details.
exit=0
$ bash -c cd <repo> && npm audit signatures
audited 292 packages in 21s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

exit=0
$ bash -c cd <repo> && npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
exit=0
$ bash -c cd <repo> && npm run lint -w app

> lint
> eslint . --max-warnings 0

exit=0
$ bash -c cd <repo> && npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

exit=0
$ bash -c cd <repo> && npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  66 passed (66)
      Tests  1246 passed (1246)
   Start at  12:56:45
   Duration  41.68s (environment 58%, tests 13%, import 12%, setup 9%, transform 7%, worker 1%)

Environment  jsdom was created 66 times · 232.27s total, 58% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0
$ bash -c cd <repo> && VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 607 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.02s
exit=0
$ bash -c cd <repo> && bash app/scripts/check-deploy-image.sh . 8090
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
exit=0
$ bash -c cd <repo> && grep -c 'it(\|it.each' app/src/test/localnet-guard.test.ts && grep -c ' ✓ ' <scratchpad>/t77/b06_base_guard_verbose.txt
16
90
exit=0

### Archivos modificados/creados (git diff --stat de lo versionado + archivos nuevos sin versionar)
Modificados: `agents.md`, `app/.env.example`, `app/README.md`, `app/scripts/localnet-guard.mjs`, `app/src/sui/config.ts`, `app/src/sui/config.test.ts`, `app/src/sui/networks.ts`, `app/src/sui/networks.test.ts`, `app/src/test/localnet-guard.test.ts`, `app/src/vite-env.d.ts`.
Nuevos: `app/src/sui/localnetUrl.mjs`, `app/src/sui/localnetUrl.d.mts`, `app/src/sui/localnetUrl.test.ts`, `app/src/test/localnetCorpus.ts`. Todos están en "Tocar" del handoff (el test de higiene D6 vive en `localnetUrl.test.ts`, sin archivo extra).

### Qué se implementó
1. Módulo compartido `app/src/sui/localnetUrl.mjs` (+ `.d.mts`) con `LOCALNET_URL` e `isLoopbackUrl` **movidos** desde `localnet-guard.mjs` (la regex y la constante, byte a byte; DoD 10 abajo); `localnet-guard.mjs` los importa y re-exporta (identidad de referencia probada).
2. `config.ts`: `resolveConfig` valida `VITE_LOCALNET_URL` solo con red `localnet` (`undefined` = 9000; cualquier otro valor, vacío incluido, debe pasar `isLoopbackUrl` o error D4, antes de buscar el JSON de despliegue); `loadConfig` la pasa solo si `VITE_SUI_NETWORK === 'localnet'` y lee `import.meta.env` solo por propiedad. `networks.ts`: `localnet.grpcUrl` = `LOCALNET_URL` (por defecto). `vite-env.d.ts`, `.env.example` (línea comentada, "nunca vacía") y docs.
3. Tests: corpus único extraído (`localnetCorpus.ts`, con `REJECTED_STRINGS_ENV`), `localnetUrl.test.ts` (56), ampliaciones de `config.test.ts` y `networks.test.ts`, test de higiene de fronteras.

### Tests y gates (output pegado, por capture.sh)
Tests agregados: `localnetUrl.test.ts` (nuevo, **56**: 9000 por defecto, identidad de referencia con la guarda, 4 aceptados, 33 rechazados, 6 de `REJECTED_STRINGS_ENV`, 5 no-`string`, test de longitud del corpus 4/33/5/6, 5 de higiene de fronteras por `import.meta.glob` `?raw`), `config.test.ts` (**+59**: sin variable = 9000; cada puerto aceptado con el resto de la config igual; 33 + 6 + `' '` inválidos con el mensaje D4 exacto; `''` es error; `undefined` es el único por defecto; D5 en `resolveConfig`; burner sin cambios; testnet ignora valor válido/inválido/vacío; `loadConfig` con `vi.stubEnv`: testnet ×3, localnet inválido ×2 sin `localnet.json`, localnet válido sin `localnet.json`) y `networks.test.ts` (**+1**: `NETWORKS.localnet.grpcUrl` = `LOCALNET_URL` compartido). Total nuevo **+116**: **1362 tests en 67 archivos** (1246 + 116; 66 + 1), 0 fallos. Nombres completos de los nuevos en el anexo `r02` (118 líneas, solo `✓` de los tests nuevos); conteo por archivo en `r01`. La lista `REJECTED_STRINGS_ENV` la consumen `localnetUrl.test.ts` y `config.test.ts` y **no** `localnet-guard.test.ts` (90 tests, mismos nombres: ver diff de nombres más abajo).

$ bash -c cd <repo> && git diff --stat && git diff app/scripts/localnet-guard.mjs | head -30
 agents.md                           |  13 +++-
 app/.env.example                    |   6 ++
 app/README.md                       |  49 ++++++++++++---
 app/scripts/localnet-guard.mjs      |  37 +++--------
 app/src/sui/config.test.ts          | 122 +++++++++++++++++++++++++++++++++++-
 app/src/sui/config.ts               |  42 +++++++++++--
 app/src/sui/networks.test.ts        |   5 ++
 app/src/sui/networks.ts             |   7 ++-
 app/src/test/localnet-guard.test.ts |  58 +----------------
 app/src/vite-env.d.ts               |   1 +
 10 files changed, 234 insertions(+), 106 deletions(-)
diff --git a/app/scripts/localnet-guard.mjs b/app/scripts/localnet-guard.mjs
index d25c500..8dd1fbf 100644
--- a/app/scripts/localnet-guard.mjs
+++ b/app/scripts/localnet-guard.mjs
@@ -1,36 +1,17 @@
 // Guarda de localnet compartida por los scripts de captura de fixtures (#10 `capture-read-fixtures.mjs`, #11
 // `capture-tx-fixtures.mjs`; DL-15 de #11).
 //
-// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*`, M-4 de #11): importarlo no puede
-// hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como primera instrucción, y recién después importa
-// el SDK (import dinámico), crea el cliente y lee el chain id del nodo para `assertDeployment`.
+// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*` y el módulo puro de la regla de la
+// URL, M-4 de #11): importarlo no puede hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como
+// primera instrucción, y recién después importa el SDK (import dinámico), crea el cliente y lee el chain id del nodo
+// para `assertDeployment`.
 import process from 'node:process';
+import { LOCALNET_URL, isLoopbackUrl } from '../src/sui/localnetUrl.mjs';
 
-/** URL por defecto (sin `--url`): la localnet aislada de `agents.md` §3 en el puerto por defecto de `sui start`. */
-export const LOCALNET_URL = 'http://127.0.0.1:9000';
-
-// Solo loopback IPv4 literal, `http`, puerto decimal de 4 o 5 dígitos sin ceros a la izquierda y nada más (sin
-// credenciales, path, query ni fragmento). En JavaScript `$` ancla solo al final de la cadena (sin la bandera `m`).
-const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})$/;
-
-/**
- * `true` si y solo si `url` es un `string` de la forma `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. La
- * restricción "solo loopback" se conserva: lo único que se generaliza es el puerto (una localnet aislada puede correr en
- * otro puerto con `sui start --fullnode-rpc-port`, p. ej. si el 9000 lo ocupa un servicio de otro proyecto del host).
- * Función pura: sin `process`, sin red.
exit=0
$ bash -c cd <repo>/app && npx vitest run src/sui/localnetUrl.test.ts 2>&1 | grep -E 'Test Files|Tests '
 Test Files  1 passed (1)
      Tests  56 passed (56)
exit=0
$ bash -c cd <repo>/app && npx vitest run src/sui/config.test.ts 2>&1 | grep -E 'Test Files|Tests '
 Test Files  1 passed (1)
      Tests  111 passed (111)
exit=0
$ bash -c cd <repo>/app && npx vitest run src/sui/networks.test.ts 2>&1 | grep -E 'Test Files|Tests '
 Test Files  1 passed (1)
      Tests  13 passed (13)
exit=0
$ bash -c cd <repo>/app && npx vitest run src/test/localnet-guard.test.ts 2>&1 | grep -E 'Test Files|Tests '
 Test Files  1 passed (1)
      Tests  90 passed (90)
exit=0
$ bash -c cd <repo>/app && npx vitest run src/sui/localnetUrl.test.ts src/sui/config.test.ts src/sui/networks.test.ts --reporter=verbose 2>&1 | grep -E '✓' | grep -E 'localnetUrl.test|VITE_LOCALNET_URL|loadConfig|networks.test.ts > NETWORKS > takes' | sed -E 's/ [0-9]+ms$//'
 ✓ src/sui/networks.test.ts > NETWORKS > takes the default localnet endpoint from the shared LOCALNET_URL
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > uses the default port 9000 without the variable (today behavior, real localnet fixture)
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > uses http://127.0.0.1:9000 as the endpoint and keeps the rest of the config unchanged
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > uses http://127.0.0.1:19000 as the endpoint and keeps the rest of the config unchanged
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > uses http://127.0.0.1:1024 as the endpoint and keeps the rest of the config unchanged
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > uses http://127.0.0.1:65535 as the endpoint and keeps the rest of the config unchanged
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:1023" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:0" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:65536" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:099999" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:019000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:99999" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000:1" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:١٩٠٠٠" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:１９０００" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000/" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000/x" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000?x=1" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000#x" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000 " with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value " http://127.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000\n" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "https://127.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "HTTP://127.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://localhost:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.2:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://2130706433:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://0x7f.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://0.0.0.0:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://[::1]:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://192.168.1.10:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1.evil.com:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:9000@evil.com" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000@evil.com" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://user:pw@127.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000\r" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1:19000\t" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "\"http://127.0.0.1:19000\"" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1.:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://0177.0.0.1:19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value "http://127.0.0.1%3A19000" with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > rejects the invalid value " " with the D4 message and never falls back to 9000
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > treats the empty string as an error, not as the default (an unset shell variable must not reach port 9000)
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > treats undefined as the only value that means the default
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > reports an invalid value before a missing localnet.json (D5)
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > reports the missing localnet.json as usual when the value is valid
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on localnet > does not change burnerWalletEnabled
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on testnet > ignores a valid value: same result as without it, with the testnet endpoint
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on testnet > ignores a invalid value: same result as without it, with the testnet endpoint
 ✓ src/sui/config.test.ts > resolveConfig: VITE_LOCALNET_URL on testnet > ignores a empty value: same result as without it, with the testnet endpoint
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > returns the usual testnet config on testnet even with VITE_LOCALNET_URL="http://127.0.0.1:19000"
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > returns the usual testnet config on testnet even with VITE_LOCALNET_URL="http://localhost:19000"
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > returns the usual testnet config on testnet even with VITE_LOCALNET_URL=""
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > reports the D4 error for the invalid value "http://localhost:19000" on localnet, whether or not localnet.json exists (D5)
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > reports the D4 error for the invalid value "" on localnet, whether or not localnet.json exists (D5)
 ✓ src/sui/config.test.ts > loadConfig: VITE_LOCALNET_URL > reports the usual missing localnet.json on localnet with a valid value and no deployment file
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > keeps the default URL on the default port 9000
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > is the very same function and constant the capture guard uses (one rule, not two copies)
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > accepts http://127.0.0.1:9000
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > accepts http://127.0.0.1:19000
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > accepts http://127.0.0.1:1024
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > accepts http://127.0.0.1:65535
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:1023"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:0"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:65536"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:099999"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:019000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:99999"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000:1"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:١٩٠٠٠"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:１９０００"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000/"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000/x"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000?x=1"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000#x"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000 "
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects " http://127.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000\n"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "https://127.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "HTTP://127.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://localhost:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.2:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://2130706433:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://0x7f.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://0.0.0.0:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://[::1]:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://192.168.1.10:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1.evil.com:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:9000@evil.com"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://127.0.0.1:19000@evil.com"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects "http://user:pw@127.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects ""
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "http://127.0.0.1:19000\r"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "http://127.0.0.1:19000\t"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "\"http://127.0.0.1:19000\""
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "http://127.0.0.1.:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "http://0177.0.0.1:19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects the form that can arrive from a .env file: "http://127.0.0.1%3A19000"
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects a non-string value: undefined
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects a non-string value: null
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects a non-string value: number
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects a non-string value: array with the URL (coercible)
 ✓ src/sui/localnetUrl.test.ts > localnetUrl: shared rule > rejects a non-string value: String object (coercible)
 ✓ src/sui/localnetUrl.test.ts > config boundary: where the endpoint and the environment are read > finds the source files of src without the tests
 ✓ src/sui/localnetUrl.test.ts > config boundary: where the endpoint and the environment are read > names NETWORKS next to grpcUrl only in config.ts and networks.ts
 ✓ src/sui/localnetUrl.test.ts > config boundary: where the endpoint and the environment are read > reads a grpcUrl property only in config.ts and dappKit.ts, and config.grpcUrl only in dappKit.ts
 ✓ src/sui/localnetUrl.test.ts > config boundary: where the endpoint and the environment are read > names VITE_LOCALNET_URL only in config.ts and vite-env.d.ts
 ✓ src/sui/localnetUrl.test.ts > config boundary: where the endpoint and the environment are read > reads import.meta.env only in config.ts, and only by property, never as an object
 ✓ src/sui/localnetUrl.test.ts > localnetCorpus: size > keeps every list of the shared corpus at its recorded size, so shrinking it breaks a test
exit=0
$ bash -c cd <repo> && npm run lint -w app

> lint
> eslint . --max-warnings 0

exit=0
$ bash -c cd <repo> && npm run typecheck -w app

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

exit=0
$ bash -c cd <repo> && npm test -w app

> test
> vitest run


 RUN  v5.0.5 <repo>/app


 Test Files  67 passed (67)
      Tests  1362 passed (1362)
   Start at  13:15:51
   Duration  38.73s (environment 62%, tests 15%, import 11%, setup 10%, transform 1%)

Environment  jsdom was created 67 times · 223.87s total, 62% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

exit=0
$ bash -c cd <repo> && VITE_SUI_NETWORK=testnet npm run build -w app && sha256sum app/dist/assets/index-*.js

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 608 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B5rzSWM2.js   918.31 kB │ gzip: 278.21 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 845ms
1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
exit=0

#### Bundle de testnet y los 6 puntos del paso 6 del smoke (v1.2)
**Bundle medido: `dist/assets/index-B5rzSWM2.js` 918.31 kB (278.21 kB gzip), 918314 bytes, sha256 `1b36aadbeeb8`… (completo en el anexo). Delta contra `master` (917.80 kB / 277.96 kB gzip): +0.51 kB (+0.25 kB gzip), ≪ 1 kB, el esperado de v1.2.** Lo causa el código nuevo de `resolveConfig`, que se comparte entre redes y por eso entra al bundle de testnet: la rama `network === 'localnet' && env.VITE_LOCALNET_URL !== undefined`, la llamada a `isLoopbackUrl` (la regex y el chequeo de rango, ahora en el módulo compartido) y la plantilla del mensaje D4 con su `JSON.stringify`; más la clave `VITE_LOCALNET_URL:void 0` del objeto de `loadConfig`. Nada del valor de la variable.
Con y sin la variable, los dos builds de testnet: **mismo nombre `index-B5rzSWM2.js`, mismo tamaño (918314 bytes) y mismo sha256** (anexos `h02` y `h05`).
Criterio de 6 puntos, con y sin la variable (identico en las dos corridas):
1. valor `127.0.0.1:19000` en el bundle (`grep -oF | wc -l`): **0** (con y sin la variable).
2. `index-*.js` con y sin la variable idéntico en nombre, tamaño y sha256: **sí** (`index-B5rzSWM2.js`, 918314 bytes, mismo sha256).
3. literal `VITE_LOCALNET_URL`: **4** apariciones, todas texto estático de `resolveConfig`/`loadConfig` (contexto pegado en `h03`/`h06`): (i) `e.VITE_LOCALNET_URL!==void 0` (la comparación de `resolveConfig`), (ii) `let t=e.VITE_LOCALNET_URL` (su lectura, en la misma línea de contexto que (i)), (iii) `` `VITE_LOCALNET_URL=${JSON.stringify(t)} no es válida: solo… `` (el mensaje D4) y (iv) `VITE_LOCALNET_URL:void 0` (la clave del objeto de `loadConfig` con la rama de la capa (a) ya plegada).
4. `grep` (f) del DoD 5 sobre `app/src` sin tests: **0** (anexo `d08`).
5. toda coincidencia de `VITE_LOCALNET_URL:` es exactamente `VITE_LOCALNET_URL:void 0` (una sola, anexos `h03`/`h06`): el valor **no** se embebe (con el valor sería `VITE_LOCALNET_URL:"`).
6. `grep -cF 'BASE_URL'` sobre el bundle: **0** (`exit=1` de `grep -c` sin coincidencias; centinela de acceso por objeto).
Ningún punto falló (no hay STOP).

$ bash -c cd <repo> && VITE_SUI_NETWORK=testnet npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 608 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B5rzSWM2.js   918.31 kB │ gzip: 278.21 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.27s
exit=0
$ bash -c cd <repo> && ls -l app/dist/assets && sha256sum app/dist/assets/index-*.js && /usr/bin/grep -oF '127.0.0.1:19000' app/dist/assets/*.js | wc -l && /usr/bin/grep -oF 'VITE_LOCALNET_URL' app/dist/assets/*.js | wc -l
total 904
-rw-rw-r-- 1 <user> <user> 918314 Nov 20 13:14 index-B5rzSWM2.js
-rw-rw-r-- 1 <user> <user>    389 Nov 20 13:14 index-PjfExgZ6.css
1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
0
4
exit=0
$ bash -c cd <repo> && /usr/bin/grep -oE '.{0,40}VITE_LOCALNET_URL.{0,40}' app/dist/assets/*.js; /usr/bin/grep -oE 'VITE_LOCALNET_URL:.{0,8}' app/dist/assets/*.js; /usr/bin/grep -cF 'BASE_URL' app/dist/assets/*.js
=n,i=PN[r].grpcUrl;if(r===`localnet`&&e.VITE_LOCALNET_URL!==void 0){let t=e.VITE_LOCALNET_URL;if(
!NN(t))return OR(`VITE_LOCALNET_URL=${JSON.stringify(t)} no es válida: solo
){return PR({VITE_SUI_NETWORK:`testnet`,VITE_LOCALNET_URL:void 0,DEV:!1},Object.assign({"../../..
VITE_LOCALNET_URL:void 0,D
0
exit=1
$ bash -c cd <repo> && VITE_SUI_NETWORK=testnet VITE_LOCALNET_URL=http://127.0.0.1:19000 npm run build -w app

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 608 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-B5rzSWM2.js   918.31 kB │ gzip: 278.21 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.53s
exit=0
$ bash -c cd <repo> && ls -l app/dist/assets && sha256sum app/dist/assets/index-*.js && /usr/bin/grep -oF '127.0.0.1:19000' app/dist/assets/*.js | wc -l && /usr/bin/grep -oF 'VITE_LOCALNET_URL' app/dist/assets/*.js | wc -l
total 904
-rw-rw-r-- 1 <user> <user> 918314 Nov 20 13:14 index-B5rzSWM2.js
-rw-rw-r-- 1 <user> <user>    389 Nov 20 13:14 index-PjfExgZ6.css
1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
0
4
exit=0
$ bash -c cd <repo> && /usr/bin/grep -oE '.{0,40}VITE_LOCALNET_URL.{0,40}' app/dist/assets/*.js; /usr/bin/grep -oE 'VITE_LOCALNET_URL:.{0,8}' app/dist/assets/*.js; /usr/bin/grep -cF 'BASE_URL' app/dist/assets/*.js
=n,i=PN[r].grpcUrl;if(r===`localnet`&&e.VITE_LOCALNET_URL!==void 0){let t=e.VITE_LOCALNET_URL;if(
!NN(t))return OR(`VITE_LOCALNET_URL=${JSON.stringify(t)} no es válida: solo
){return PR({VITE_SUI_NETWORK:`testnet`,VITE_LOCALNET_URL:void 0,DEV:!1},Object.assign({"../../..
VITE_LOCALNET_URL:void 0,D
0
exit=1

#### Imagen (DoD 3): `check-deploy-image.sh . 8090`, camino positivo, tras los cambios
**P1-P12 en verde y línea final `OK (positivo)`** (anexo `i02`; el bundle servido es `index-B5rzSWM2.js`). Eso demuestra que el módulo compartido está en la imagen (viaja en `app/src/sui/`, no en `app/scripts`, que el `.dockerignore` excluye) y que la guarda `network: "localnet"` sobre el bundle sigue pasando.
Docker **antes** (`i01`, al inicio de la imagen): 6 contenedores / 11 imágenes; **después** (`i03`, `q01`): 6 / 11. Contra el conteo del arranque de la sesión (5 / 11): la diferencia es **un contenedor ajeno** (`<contenedor de otro proyecto>`, `Up` pocos minutos, de otra sesión del host; no es de esta tarea: el contenedor efímero de `check-deploy-image.sh` se elimina solo y el conteo antes/después de la corrida es igual). No se tocó nada ajeno ni se hizo `prune`.

#### `git diff --exit-code` de lo que no es del task (exit 0), `git stash list` vacío y `git status`
Anexo `e04` (el `0` es el conteo de `git stash list`; la lista de `git status --porcelain --untracked-files=all` son solo los archivos de "Tocar"): `app/Caddyfile`, `Dockerfile`, `.dockerignore`, `.github`, `contracts`, `package.json`, `package-lock.json`, `app/package.json`, `app/eslint.config.js`, `app/vite.config.ts`, `app/scripts/localnet-guard.d.mts`, `app/scripts/capture-*.mjs` y `documents/`: **sin diff (exit 0)**.

$ bash -c docker ps -aq | wc -l; docker images -q | wc -l; ss -ltn | grep -c ':8090 '
6
11
0
exit=1
$ bash -c cd <repo> && bash app/scripts/check-deploy-image.sh . 8090
Modo positivo: el contexto tiene contracts/deployments/testnet.json
P1 ok: imagen construida
P2 ok: el contenedor responde en http://127.0.0.1:8090/
P3 ok: corre como 65534 con --cap-drop=ALL
P4 ok: / 200 y CSP idéntica a la del Caddyfile
P5 ok: cabeceras de seguridad y Cache-Control de / exactas
P6 ok: sin Cross-Origin-Opener-Policy ni Server
P7 ok: /assets/index-B5rzSWM2.js 200, text/javascript; charset=utf-8, public, max-age=31536000, immutable
P8 ok: /assets/index-B5rzSWM2.js comprimido (zstd)
P9 ok: /favicon.svg 200, image/svg+xml
P10 ok: /no-existe 404
P11 ok: /game/0x1 404
P12 ok: /assets/no-existe.js 404 sin immutable
OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)
exit=0
$ bash -c docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | sed -E 's/[0-9a-f]{12,}/<id>/g'; docker images -q | wc -l; ss -ltn | grep -c ':8090 '
<contenedor de otro proyecto> postgres:16-alpine Up 5 minutes
<contenedor de otro proyecto> <contenedor de otro proyecto> Exited (143) 5 days ago
<contenedor de otro proyecto> postgres:16-alpine Up 3 days
<contenedor de otro proyecto> postgres:16-alpine Up 3 days
<contenedor de otro proyecto> <id> Up 3 days
<contenedor de otro proyecto> postgres:17 Up 3 days (healthy)
11
0
exit=1
$ bash -c cd <repo> && git diff --exit-code -- app/Caddyfile Dockerfile .dockerignore .github contracts package.json package-lock.json app/package.json app/eslint.config.js app/vite.config.ts app/scripts/localnet-guard.d.mts 'app/scripts/capture-*.mjs' documents; git stash list | wc -l; git status --porcelain --untracked-files=all
0
 M agents.md
 M app/.env.example
 M app/README.md
 M app/scripts/localnet-guard.mjs
 M app/src/sui/config.test.ts
 M app/src/sui/config.ts
 M app/src/sui/networks.test.ts
 M app/src/sui/networks.ts
 M app/src/test/localnet-guard.test.ts
 M app/src/vite-env.d.ts
?? app/src/sui/localnetUrl.d.mts
?? app/src/sui/localnetUrl.mjs
?? app/src/sui/localnetUrl.test.ts
?? app/src/test/localnetCorpus.ts
exit=0

#### Greps del DoD 5 (a)-(f) y su lectura (sin tests: `--exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test`)
- (a) `VITE_LOCALNET_URL` solo en `sui/config.ts` y `vite-env.d.ts` (`d01`). **OK.**
- (b) `NETWORKS`: `sui/networks.ts`, `sui/config.ts` y `sui/explorer.ts` (este solo lee `explorerBase`); `.grpcUrl` solo lo lee `config.ts` (`d02`). **OK.**
- (c) `.grpcUrl`: solo `sui/config.ts` (línea 21, comentario, y 95, la lectura de `NETWORKS[network].grpcUrl`) y `sui/dappKit.ts` (`d03`). **OK.**
- (d) `import.meta.env`: solo `sui/config.ts` (`d04`; ARQ-8). **OK.**
- (e) `localnetUrl`: el import de la guarda, el de `config.ts` y el de `networks.ts`, y comentarios (`d05`); `http:\/\/127`: **solo el módulo compartido** (`d06`, una línea: la regex); `127.0.0.1` sin tests: el módulo compartido, la guarda (textos de ayuda), cabeceras de los `capture-*`, `check-deploy-image.sh` (Docker) y el mensaje D4 de `config.ts` (`d07`). **Ninguna segunda definición de la regex.**
- (f) `import\.meta\.env([^.]|$)` sin tests: **0** (`d08`, `exit=1` = sin coincidencias). Para lograrlo se reescribieron dos comentarios de `config.ts` (decían `` `import.meta.env` `` a secas): era el único texto que el patrón encontraba; el código ya leía solo por propiedad. El test de higiene lo comprueba (`import\.meta\.env(?![.])` = 0 archivos).

#### DoD 10: la regla se MOVIÓ tal cual (diff vacío, y el diff de la guarda)
`diff` de la línea de `LOOPBACK_URL =` y de la de `LOCALNET_URL =` (versión de `HEAD` de `localnet-guard.mjs` contra el módulo nuevo): **salida vacía** (`DIFF-VACIO`, anexo `d09`). El `git diff` de `app/scripts/localnet-guard.mjs` (`d10`) solo **quita** `LOCALNET_URL`, `LOOPBACK_URL` e `isLoopbackUrl` (con su docstring) y **agrega** el `import` y el `export { … }`, más ajustes de comentarios de cabecera (que el módulo ya no importa solo `node:*`). Los docstrings movidos cambian únicamente en la línea "Mantener en sincronía con…" (ahora `localnetUrl.d.mts` y los dos tests), no la regex, el `typeof` ni el rango. Aviso: el anexo `d10` se capturó antes de re-envolver un comentario de cabecera de tres líneas (cosmético); el diff final de las primeras líneas está en `f05`.

#### Los 90 tests de la guarda: mismos nombres, mismas aserciones
Diff de nombres de los tests (baseline `b06` contra después, ordenados como los emitió Vitest, sin duraciones): **`NOMBRES-IGUALES`**, 90 `✓` antes y después y 16 `it`/`it.each` en el archivo antes (`b07`) y después (`e02`). El diff de `localnet-guard.test.ts` es solo el borrado de las tres listas y el `import { ACCEPTED, NON_STRINGS, REJECTED_STRINGS } from './localnetCorpus'`, más un comentario; las aserciones no se tocaron.

#### Corrida hostil de los tres `capture-*.mjs` (DoD 6)
Los tres salen con **código 2**, con el mensaje de siempre y **"No se hizo ningún pedido."** (anexo `e03`): el re-export de punta a punta funciona.

$ bash -c cd <repo> && /usr/bin/grep -rn 'VITE_LOCALNET_URL' app/src --include='*.ts' --include='*.tsx' --include='*.mjs' --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/src/vite-env.d.ts:5:  readonly VITE_LOCALNET_URL?: string;
app/src/sui/config.ts:22:   * `VITE_LOCALNET_URL` definida, esa URL de loopback (#77).
app/src/sui/config.ts:75: * `VITE_LOCALNET_URL` (#77) solo se lee con `VITE_SUI_NETWORK=localnet`: `undefined` es el único valor que significa "el
app/src/sui/config.ts:80:  env: { VITE_SUI_NETWORK?: string; VITE_LOCALNET_URL?: string; DEV: boolean },
app/src/sui/config.ts:96:  if (network === 'localnet' && env.VITE_LOCALNET_URL !== undefined) {
app/src/sui/config.ts:97:    const localnetUrl = env.VITE_LOCALNET_URL;
app/src/sui/config.ts:100:        `VITE_LOCALNET_URL=${JSON.stringify(localnetUrl)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`,
app/src/sui/config.ts:168: * `VITE_LOCALNET_URL` solo se pasa con `VITE_SUI_NETWORK === 'localnet'`: Vite reemplaza cada `import.meta.env.VITE_*`
app/src/sui/config.ts:176:      VITE_LOCALNET_URL:
app/src/sui/config.ts:177:        import.meta.env.VITE_SUI_NETWORK === 'localnet' ? import.meta.env.VITE_LOCALNET_URL : undefined,
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rnE 'NETWORKS' app/src --include='*.ts' --include='*.tsx' --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/src/sui/explorer.ts:2:import { NETWORKS, type Network } from './networks';
app/src/sui/explorer.ts:12:  const base = NETWORKS[network].explorerBase;
app/src/sui/explorer.ts:24:  const base = NETWORKS[network].explorerBase;
app/src/sui/explorer.ts:38:  const base = NETWORKS[network].explorerBase;
app/src/sui/networks.ts:13:export const NETWORKS: Record<Network, { grpcUrl: string; explorerBase: string | null }> = {
app/src/sui/networks.ts:23:  return Object.hasOwn(NETWORKS, x);
app/src/sui/config.ts:3:import { isNetwork, NETWORKS, type Network } from './networks';
app/src/sui/config.ts:21:   * Endpoint **efectivo** de gRPC-web: `NETWORKS[network].grpcUrl` (el por defecto de la red) o, solo en localnet y con
app/src/sui/config.ts:95:  let grpcUrl = NETWORKS[network].grpcUrl;
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rn 'config\.grpcUrl\|\.grpcUrl' app/src --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/src/sui/config.ts:21:   * Endpoint **efectivo** de gRPC-web: `NETWORKS[network].grpcUrl` (el por defecto de la red) o, solo en localnet y con
app/src/sui/config.ts:95:  let grpcUrl = NETWORKS[network].grpcUrl;
app/src/sui/dappKit.ts:6: * Crea la instancia del wallet kit para la única red del build, con lectura por gRPC-web contra `config.grpcUrl`.
app/src/sui/dappKit.ts:13:    createClient: (network) => new SuiGrpcClient({ network, baseUrl: config.grpcUrl }),
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rn 'import.meta.env' app/src --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/src/sui/config.ts:163: * Único punto de la app que lee las variables `import.meta.env.*` y los JSON de `contracts/deployments/` (ARQ-8,
app/src/sui/config.ts:168: * `VITE_LOCALNET_URL` solo se pasa con `VITE_SUI_NETWORK === 'localnet'`: Vite reemplaza cada `import.meta.env.VITE_*`
app/src/sui/config.ts:175:      VITE_SUI_NETWORK: import.meta.env.VITE_SUI_NETWORK,
app/src/sui/config.ts:177:        import.meta.env.VITE_SUI_NETWORK === 'localnet' ? import.meta.env.VITE_LOCALNET_URL : undefined,
app/src/sui/config.ts:178:      DEV: import.meta.env.DEV,
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rn 'localnetUrl' app/scripts app/src --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/scripts/localnet-guard.mjs:8:import { LOCALNET_URL, isLoopbackUrl } from '../src/sui/localnetUrl.mjs';
app/scripts/localnet-guard.mjs:11:// en `app/src/sui/localnetUrl.mjs` y se comparte con la config de la app (#77); acá se importa y se re-exporta tal cual,
app/src/sui/networks.ts:2:import { LOCALNET_URL } from './localnetUrl.mjs';
app/src/sui/localnetUrl.mjs:21: * Mantener en sincronía con `localnetUrl.d.mts`; los tests de `app/src/sui/localnetUrl.test.ts` y de
app/src/sui/config.ts:2:import { isLoopbackUrl } from './localnetUrl.mjs';
app/src/sui/config.ts:97:    const localnetUrl = env.VITE_LOCALNET_URL;
app/src/sui/config.ts:98:    if (!isLoopbackUrl(localnetUrl)) {
app/src/sui/config.ts:100:        `VITE_LOCALNET_URL=${JSON.stringify(localnetUrl)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`,
app/src/sui/config.ts:103:    grpcUrl = localnetUrl;
app/src/sui/localnetUrl.d.mts:1:// Mantener en sincronía con `localnetUrl.mjs`; los tests de `localnetUrl.test.ts` y de `src/test/localnet-guard.test.ts`
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rnF 'http:\/\/127' app/scripts app/src
app/src/sui/localnetUrl.mjs:13:const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})$/;
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rnF '127.0.0.1' app/scripts app/src --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
app/scripts/localnet-guard.d.mts:7:/** `true` si y solo si `url` es un `string` `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. */
app/scripts/capture-read-fixtures.mjs:4://   node app/scripts/capture-read-fixtures.mjs [--url http://127.0.0.1:<puerto>]
app/scripts/capture-read-fixtures.mjs:6:// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`): con cualquier otra
app/scripts/capture-tx-fixtures.mjs:7://   node app/scripts/capture-tx-fixtures.mjs [--url http://127.0.0.1:<puerto>]
app/scripts/capture-tx-fixtures.mjs:9:// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`; guarda compartida
app/scripts/capture-house-fixtures.mjs:6://   node app/scripts/capture-house-fixtures.mjs [--url http://127.0.0.1:<puerto>]
app/scripts/capture-house-fixtures.mjs:16:// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`; guarda compartida
app/scripts/localnet-guard.mjs:10:// La regla de la URL (`LOCALNET_URL`, `isLoopbackUrl`: solo `http://127.0.0.1:<puerto>`, 1024-65535, por defecto 9000) vive
app/scripts/localnet-guard.mjs:33:        'solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); ' +
app/scripts/check-deploy-image.sh:7:#          <puerto>    entero 1024..65535: se publica en 127.0.0.1:<puerto> y es el PORT del contenedor
app/scripts/check-deploy-image.sh:124:base="http://127.0.0.1:$port"
app/scripts/check-deploy-image.sh:125:docker run -d --name "$name" --cap-drop=ALL -e "PORT=$port" -p "127.0.0.1:$port:$port" "$tag" >/dev/null ||
app/src/sui/localnetUrl.mjs:9:export const LOCALNET_URL = 'http://127.0.0.1:9000';
app/src/sui/localnetUrl.mjs:16: * `true` si y solo si `url` es un `string` de la forma `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. La
app/src/sui/config.ts:100:        `VITE_LOCALNET_URL=${JSON.stringify(localnetUrl)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`,
app/src/sui/localnetUrl.d.mts:4:/** URL por defecto de la localnet: `http://127.0.0.1:9000`, el puerto por defecto de `sui start`. */
app/src/sui/localnetUrl.d.mts:7:/** `true` si y solo si `url` es un `string` `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. */
exit=0
$ bash -c cd <repo> && /usr/bin/grep -rnE 'import\.meta\.env([^.]|$)' app/src --exclude=*.test.ts --exclude=*.test.tsx --exclude-dir=test
exit=1
$ bash -c cd <repo> && diff <(git show HEAD:app/scripts/localnet-guard.mjs | grep -F 'LOOPBACK_URL =') <(grep -F 'LOOPBACK_URL =' app/src/sui/localnetUrl.mjs) && diff <(git show HEAD:app/scripts/localnet-guard.mjs | grep -F 'LOCALNET_URL =') <(grep -F 'LOCALNET_URL =' app/src/sui/localnetUrl.mjs) && echo DIFF-VACIO
DIFF-VACIO
exit=0
$ bash -c cd <repo> && git diff app/scripts/localnet-guard.mjs
diff --git a/app/scripts/localnet-guard.mjs b/app/scripts/localnet-guard.mjs
index d25c500..61fe670 100644
--- a/app/scripts/localnet-guard.mjs
+++ b/app/scripts/localnet-guard.mjs
@@ -1,36 +1,16 @@
 // Guarda de localnet compartida por los scripts de captura de fixtures (#10 `capture-read-fixtures.mjs`, #11
 // `capture-tx-fixtures.mjs`; DL-15 de #11).
 //
-// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*`, M-4 de #11): importarlo no puede
-// hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como primera instrucción, y recién después importa
+// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*` y el módulo puro de la regla de la
+// URL, M-4 de #11): importarlo no puede hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como primera instrucción, y recién después importa
 // el SDK (import dinámico), crea el cliente y lee el chain id del nodo para `assertDeployment`.
 import process from 'node:process';
+import { LOCALNET_URL, isLoopbackUrl } from '../src/sui/localnetUrl.mjs';
 
-/** URL por defecto (sin `--url`): la localnet aislada de `agents.md` §3 en el puerto por defecto de `sui start`. */
-export const LOCALNET_URL = 'http://127.0.0.1:9000';
-
-// Solo loopback IPv4 literal, `http`, puerto decimal de 4 o 5 dígitos sin ceros a la izquierda y nada más (sin
-// credenciales, path, query ni fragmento). En JavaScript `$` ancla solo al final de la cadena (sin la bandera `m`).
-const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})$/;
-
-/**
- * `true` si y solo si `url` es un `string` de la forma `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. La
- * restricción "solo loopback" se conserva: lo único que se generaliza es el puerto (una localnet aislada puede correr en
- * otro puerto con `sui start --fullnode-rpc-port`, p. ej. si el 9000 lo ocupa un servicio de otro proyecto del host).
- * Función pura: sin `process`, sin red.
- *
- * Mantener en sincronía con `localnet-guard.d.mts`; los tests de `app/src/test/localnet-guard.test.ts` son la verificación.
- *
- * @param {unknown} url valor a validar (de cualquier tipo: solo un `string` puede ser válido)
- * @returns {boolean}
- */
-export function isLoopbackUrl(url) {
-  if (typeof url !== 'string') return false;
-  const match = LOOPBACK_URL.exec(url);
-  if (match === null) return false;
-  const port = Number(match[1]);
-  return Number.isInteger(port) && port >= 1024 && port <= 65535;
-}
+// La regla de la URL (`LOCALNET_URL`, `isLoopbackUrl`: solo `http://127.0.0.1:<puerto>`, 1024-65535, por defecto 9000) vive
+// en `app/src/sui/localnetUrl.mjs` y se comparte con la config de la app (#77); acá se importa y se re-exporta tal cual,
+// de modo que la guarda de las capturas y el endpoint de la app son la misma función.
+export { LOCALNET_URL, isLoopbackUrl };
 
 /**
  * Valida los argumentos de un script de captura: `--url <valor>` opcional (sin `--url`, la URL es `LOCALNET_URL`), el valor
exit=0
$ bash -c cd <repo> && diff <(grep ' ✓ ' <scratchpad>/t77/b06_base_guard_verbose.txt | sed -E 's/ [0-9]+ms$//') <(grep ' ✓ ' <scratchpad>/t77/e01_guard_verbose_after.txt | sed -E 's/ [0-9]+ms$//') && echo NOMBRES-IGUALES && grep -c ' ✓ ' <scratchpad>/t77/e01_guard_verbose_after.txt && grep -c 'it(\|it.each' app/src/test/localnet-guard.test.ts
NOMBRES-IGUALES
90
16
exit=0
$ bash -c cd <repo> && node app/scripts/capture-read-fixtures.mjs --url http://localhost:19000
capture-read-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2
$ bash -c cd <repo> && node app/scripts/capture-tx-fixtures.mjs --url http://localhost:19000
capture-tx-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2
$ bash -c cd <repo> && node app/scripts/capture-house-fixtures.mjs --url http://localhost:19000
capture-house-fixtures: solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); recibido --url http://localhost:19000. No se hizo ningún pedido.
exit=2

### Verificación manual / smoke 🧪 (localnet aislada en el puerto 19000; el 9000 ajeno NO se tocó)
Localnet aislada de `agents.md` §3 con `<SMOKE_DIR>` dentro del scratchpad, génesis sin ningún `suic`, `sui start --fullnode-rpc-port 19000` en segundo plano con PID guardado y recién después `smoke_guard`. La sonda (Vitest fuera del worktree, `<SMOKE_DIR>/probe`, `node_modules` enlazado dentro de `<SMOKE_DIR>`) corrió con `RPC_URL=http://127.0.0.1:19000`, con aborto si no cumple `isLoopbackUrl` o es el `:9000`, sin claves ni firmas y con un `spy` de `fetch` que registra el destino de **todo** pedido de red. El despliegue es sintético (IDs de un carácter repetido); copia de la sonda y del cliente CDP en `<scratchpad>/t77/sonda_copia` (sin direcciones). Los anexos que siguen son los de los pasos en orden.

| # | Resultado | Evidencia |
|---|---|---|
| 1 | PASA | `ss -ltn`: el 9000 ocupado por un servicio ajeno (2 sockets, IPv4 e IPv6; no se nombra ni se le habla: solo se lista el socket) y `:19000` en 0 antes de arrancar (`a02` inicia; ver `k04` y `q01`); guarda de `~/.sui` en la línea base (`a01`); Docker 5/11 al arrancar |
| 2 | PASA | génesis `genesis-exit=0` y guarda de `~/.sui` idéntica tras ella (`k01`, `k02`; `grep -c 'command not found'` = 0 y rastros vacíos sobre `genesis.log`); `sui start` con PID guardado, `smoke_guard` y `suic chain-identifier`: Hex **`d41aa467`** = `chainId` corto (`k03`); `:19000` en LISTEN (`k04`) |
| 3 | PASA | `PASO3 config.grpcUrl=http://127.0.0.1:19000 == RPC_URL: true`; `fetchNodeInfo(kit.getClient())` con **esa** config (`createAppDAppKit`): `chainId leido por el cliente de la app=d41aa467 == chainId de la genesis: true`; el único destino de red fue `127.0.0.1:19000` (`m02`) |
| 4 | PASA | `PASO4 grpcUrl sin la variable=http://127.0.0.1:9000`, solo la cadena: **0 pedidos de red nuevos**, sin cliente (`m02`) |
| 5 | PASA | testnet con la variable válida ⇒ `https://fullnode.testnet.sui.io:443` (solo la cadena); localnet con `http://localhost:19000`, `http://127.0.0.1:9000@evil.com` y `''` ⇒ el error D4 exacto, sin config; **0 pedidos nuevos**; constancia final: `pedidos totales=1; al 9000=0; destinos=127.0.0.1:19000` (`m02`) |
| 6 | PASA | los dos builds de testnet y los 6 puntos (arriba, `h01`-`h06`): valor 0, bundle idéntico (nombre, tamaño, sha256), literal solo como texto estático (4), `VITE_LOCALNET_URL:void 0`, `BASE_URL` 0, `grep` (f) 0 |
| 7 | **HECHO** (opcional; agrega valor: es la verificación de punta a punta que motivó #77) | publicación del paquete efímero por la variante B (`n01`, con los IDs enmascarados: `localnet.json` con el `chainId` de la génesis); servidor de Vite **sin `--host`** con `VITE_SUI_NETWORK=localnet VITE_LOCALNET_URL=http://127.0.0.1:19000`: `ss -ltn` muestra el 5173 **solo en `127.0.0.1`** (`p01`; el log de Vite dice "Network: use --host to expose"); Chrome headless (`google-chrome --headless=new`, perfil, `HOME` y `XDG_*` desechables en `<SMOKE_DIR>`, depuración solo en `127.0.0.1:19222`) con un cliente CDP mínimo (dominio `Network`, `Log`, `Runtime`; `Target.createTarget` con `newWindow`) abriendo `http://localhost:5173`: **el indicador dice `localnet · nodo OK`**; **9 peticiones gRPC-web, todas a `http://127.0.0.1:19000`**; **0 peticiones de cualquier tipo con destino `:9000`**; los demás orígenes, listados: `http://localhost:5173` (116, el servidor de Vite: módulos y recursos) y `null` (1, una URL `data:`); sin otros orígenes de wallets; consola: 0 errores, 0 excepciones y 0 violaciones de CSP (dev no tiene CSP, solo producción), 2 **warnings** esperados (la burner wallet de `DEV` avisa que es insegura; Lit en modo dev) (`p02`); pestaña cerrada por CDP (`Target.closeTarget`), Chrome y Vite cerrados por PID |
| 8 | PASA | cierre por PID (Chrome, Vite, `sui start`; `sui start` sale con 144 y Vite con 143, esperado): `kill -0` falla, `ss -ltn` de 19000, 5173 y 19222 = 0, el 9000 ajeno igual (2 sockets), `<SMOKE_DIR>` borrado y verificado, `contracts/deployments/localnet.json` y `Pub.*.toml` ausentes, `Move.lock`/`Published.toml` sin diff, guarda de `~/.sui` idéntica, Docker 6/11 (el contenedor extra no es mío) (`q01`, `q02`) |

$ bash -c . <scratchpad>/t77/smoke/env.sh && [ ! -e "$SUI_CONFIG_DIR/client.yaml" ] && printf 'n\n' | "$SUI" genesis --working-dir "$SUI_CONFIG_DIR" > "$SMOKE_DIR/genesis.log" 2>&1; echo genesis-exit=$?
genesis-exit=0
exit=0
$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
exit=0
$ bash -c . <scratchpad>/t77/smoke/env.sh && smoke_guard && suic chain-identifier
Base58: FGxzgFzpAvVXd6P6FbxHiUUUy2JjJttzwBTWkPtE7789
Hex: d41aa467
exit=0
$ bash -c ss -ltn | grep -c ':19000 '; ss -ltn | grep -c ':9000 '
1
2
exit=0
$ bash -c cd <scratchpad>/t77/smoke && VITE_CONFIG_NATIVE_IGNORE_WARNING=true RPC_URL=http://127.0.0.1:19000 CHAIN_SHORT=d41aa467 node <repo>/node_modules/vitest/vitest.mjs run --config <scratchpad>/t77/smoke/probe/vitest.probe.config.ts --reporter=verbose --disable-console-intercept 2>&1 | sed -E 's#<repo>#<repo>#g; s#/tmp/claude-[^ ]*/t77/smoke#<SMOKE_DIR>#g'

 RUN  v5.0.5 <SMOKE_DIR>/probe

PASO3 config.grpcUrl=http://127.0.0.1:19000 == RPC_URL: true
Your application is currently using the unsafe burner wallet. Make sure that this wallet is disabled in production.
PASO3 chainId leido por el cliente de la app=d41aa467 == chainId de la genesis (d41aa467): true
PASO3 pedidos de red hasta ahora: 1; destinos distintos: 127.0.0.1:19000
PASO4 grpcUrl sin la variable=http://127.0.0.1:9000
PASO4 pedidos de red nuevos: 0
PASO5 testnet con la variable valida: grpcUrl=https://fullnode.testnet.sui.io:443
PASO5 localnet con "http://localhost:19000": VITE_LOCALNET_URL="http://localhost:19000" no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000
PASO5 localnet con "http://127.0.0.1:9000@evil.com": VITE_LOCALNET_URL="http://127.0.0.1:9000@evil.com" no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000
PASO5 localnet con "": VITE_LOCALNET_URL="" no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000
PASO5 pedidos de red nuevos: 0
CONSTANCIA pedidos totales=1; al 9000=0; destinos=127.0.0.1:19000
 ✓ localnetPort.probe.ts > probe #77 > paso 3: el cliente de la app apunta al puerto alternativo y lee el chain id de esa localnet 153ms
 ✓ localnetPort.probe.ts > probe #77 > paso 4: sin el parametro la config resuelve el 9000, solo la cadena y sin crear cliente 2ms
 ✓ localnetPort.probe.ts > probe #77 > paso 5: testnet ignora el parametro y localnet rechaza lo hostil y lo vacio, sin pedidos 2ms
 ✓ localnetPort.probe.ts > probe #77 > constancia: ningun pedido de la sonda fue al 9000 1ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  13:18:22
   Duration  2.56s (environment 69%, import 23%, tests 7%, transform 1%)

exit=0
$ bash -c . <scratchpad>/t77/smoke/env.sh && { . <scratchpad>/t77/smoke/ids.env 2>/dev/null || true; } && smoke_guard && act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" 2>&1 | sed -E 's/0x[0-9a-fA-F]{8,}/<id>/g' | tail -25
Despliegue escrito en <repo>/contracts/deployments/localnet.json:
  schemaVersion: 1
  network: localnet
  chainId: d41aa467
  packageId: <id>
  originalPackageId: <id>
  packageVersion: 1
  upgradeCapId: <id>
  houseId: <id>
  houseCapId: <id>
  publishTxDigest: 3JJUcv6gKQi1Ffu8qPGcXn9af3gPkMpMTb8PG5DVb6Du
  publishTimestamp: 2026-11-20T18:18:39.405Z
  sourceCommit: null
  suiCliVersion: 1.84.0-9dc25070cf2e
  frameworkRev: e6f43880f4b65e2c1f0397583a9690b4b22c9223
Directorio temporal con la salida cruda: <scratchpad>/t77/smoke/tmp/battleship-publish-lie0ZF (bórralo cuando termines)
Siguiente paso obligatorio (#8), no lo ejecuta este script. En la shell donde exportaste tu SUI_CONFIG_DIR
(README → "Uso en testnet", pasos 6-10):
  printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client call --package <id> --module house --function update_fee_rate --args <id> <id> <bps>
Verificación:
  printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client object <id> --json   # campo content.fee_rate
exit=0
$ bash -c ss -ltn | grep ':5173 '; ss -ltn | grep ':19222 '; ss -ltn | grep ':19000 '
LISTEN 0      511             127.0.0.1:5173       0.0.0.0:*   
LISTEN 0      10              127.0.0.1:19222      0.0.0.0:*   
LISTEN 0      128               0.0.0.0:19000      0.0.0.0:*   
exit=0
$ bash -c cd <scratchpad>/t77/smoke && node cdp.mjs 2>&1 | sed -E 's#<repo>#<repo>#g; s#0x[0-9a-fA-F]{8,}#<id>#g'
PAGINA lineas con red/nodo: ["localnet · nodo OK"]
PETICIONES total=126
ORIGEN http://localhost:5173 peticiones=116
ORIGEN null peticiones=1
ORIGEN http://127.0.0.1:19000 peticiones=9
GRPC-WEB http://127.0.0.1:19000 peticiones=9
PETICIONES con destino :9000 (cualquier tipo)=0
CONSOLA errores/warnings=2; excepciones=0; violaciones CSP=0
CONSOLA warning: Your application is currently using the unsafe burner wallet. Make sure that this wallet is disabled in production.
CONSOLA warning: Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.
exit=0
$ bash -c cd <repo> && ss -ltn | grep -c ':19000 '; ss -ltn | grep -c ':5173 '; ss -ltn | grep -c ':19222 '; ss -ltn | grep ':9000 ' | wc -l; ps -eo pid,args | grep -E 'sui start|vite.js|remote-debugging-port=19222' | grep -v grep | wc -l; test ! -e contracts/deployments/localnet.json && echo localnet.json-ausente; ! compgen -G 'contracts/Pub.*.toml' && echo sin-Pub; git status --porcelain --untracked-files=all | wc -l; git stash list | wc -l; docker ps -aq | wc -l; docker images -q | wc -l
0
0
0
2
0
localnet.json-ausente
sin-Pub
14
0
6
11
exit=0
$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
exit=0
$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
exit=0

### Desviaciones del handoff
1. **STOP previo, resuelto** (declarado arriba): el literal `VITE_LOCALNET_URL` no da 0 en el bundle (4 apariciones estáticas); se aplicó el criterio final de 6 puntos de v1.2. Código y D1..D9 intactos.
2. **Servidor de Vite del paso 7**: lanzado como `node <repo>/node_modules/vite/bin/vite.js` desde `app/` (exactamente lo que ejecuta el script `dev`, que es `vite`), **sin `--host`**, en lugar de `npm run dev -w app`, para que el PID guardado sea el del propio servidor y se pueda cerrar por PID sin dejar un hijo de `npm` huérfano. Mismas variables de entorno.
3. **Chrome headless con `--no-sandbox`** (perfil, `HOME` y `XDG_*` desechables en `<SMOKE_DIR>`, depuración solo en `127.0.0.1:19222`): necesario para correr como usuario normal dentro de este entorno; nunca el navegador ni el perfil del usuario.
4. **Test de higiene (D6)**: se dejó como test (en `localnetUrl.test.ts`, con `import.meta.glob` `?raw`), no como `grep` de DoD; además se corrieron los `grep` del DoD (a)-(f). Las rutas que da el glob dependen del archivo (`./config.ts` desde `src/sui/`), por eso el test las normaliza a rutas relativas a `src/`.
5. **Comentarios reescritos** para cumplir los `grep` del DoD: en `config.ts` (el docstring de `loadConfig` decía `` `import.meta.env` `` a secas, que el patrón (f) encuentra; ahora dice `import.meta.env.*`) y en `networks.ts` (el comentario nombraba `AppConfig.grpcUrl` y `VITE_LOCALNET_URL`, que (a) y (c) no admiten fuera de `config.ts`/`vite-env.d.ts`/`dappKit.ts`). Sin cambio de código.
6. **README**: la variable se documenta en una subsección propia ("Puerto de la localnet: `VITE_LOCALNET_URL` (#77)") entre "Red del build" y "Localnet", en vez de dentro de "Red del build"; el Aviso de #77 se retiró de "Localnet".
7. **Proceso (C-13), declarado para la auditoría mecánica:** (a) usé `echo` **solo para imprimir en pantalla** marcas de verificación dentro de comandos (`echo ok`, `echo vivo`, `echo DIFF-VACIO`, `echo NOMBRES-IGUALES`, `echo localnet.json-ausente`, `echo sin-Pub`, `echo smoke-borrado`, `echo started`) y el `echo "genesis-exit=$?"` de la Receta P: **ningún `echo`, `printf`, heredoc ni `sed -i` escribió texto en archivos** (código, tests, docs, reporte y sonda salieron de las herramientas de escribir/editar); (b) `echo $$ > …/sui.pid` (Receta P, excepción i) y, **por analogía, el mismo patrón para `vite.pid` y `chrome.pid`** (guardan solo un PID); (c) `sed` sin `-i` sobre salidas hacia archivos nuevos del scratchpad (sanitizar rutas y enmascarar IDs en la sonda y en los anexos del reporte) y sin `-i` dentro de las líneas de diff de nombres; (d) `>>` a `ids.env` solo con la salida de `jq` (el rol `ADMIN`); (e) **un `sui --version` sin el prefijo `printf 'n\n' |`** por un descuido al verificar la versión, ejecutado con el HOME real: solo imprime la versión y no lee la config; verifiqué enseguida `~/.sui` (anexo `j01`): **idéntico a la línea base**. Ninguna otra ejecución de `sui` fuera del prefijo aislado.
8. **Comandos sin `capture.sh`** (solo lectura o administración, sin salida pegada): lecturas de `ss`/`docker`/`git status`/`grep` exploratorias, `mkdir`, `ln -s` (`node_modules` de la sonda), `cp` de la sonda al scratchpad, `kill`, `rm -rf <SMOKE_DIR>` y `rm -f` de `localnet.json`, y el `ss` inicial del paso 1 (sin capturar; su resultado se repite capturado en `k04` y `q01`). El lanzamiento de `sui start`, Vite y Chrome fue en segundo plano por el harness, como pide la Receta P.
9. El anexo `d10` (diff de la guarda) se capturó antes de re-envolver un comentario de cabecera; el estado final de la cabecera está en `f05`.

### Riesgos / pendientes
- Los tests de `loadConfig` suponen que el repo tiene `contracts/deployments/testnet.json` (commiteado) y **no** tiene `contracts/deployments/localnet.json` (ignorado por git; en CI no existe). En un checkout con una localnet publicada (paso 7 de un smoke), el test "reports the usual missing localnet.json…" y los de D5 con `loadConfig` verían el archivo: se corren los gates antes o después del cierre del smoke (como en esta sesión, donde el archivo se publicó y se borró **después** de todos los gates).
- Riesgo residual declarado en el handoff (D7): un proceso local en `127.0.0.1:<puerto ≥ 1024>` se acepta como el nodo; la defensa es el chain id (`wrong_chain`). El issue de bloquear lecturas con `wrong_chain` (S-1) queda fuera de #77, lo abre el orquestador.
- Observación del smoke: `sui start` escucha en `0.0.0.0:<puerto>` (comportamiento de la CLI, igual con el 9000); no lo cambia esta tarea. Vite escucha solo en `127.0.0.1` (sin `--host`).
- `documents/STATUS.md` no se editó (lo aplica el orquestador, snippet abajo).


### §R-6: los 4 greps sobre el diff, los archivos nuevos y este reporte
Sobre **el diff versionado más los cuatro archivos nuevos** (`git diff` + `localnetUrl.mjs`, `localnetUrl.d.mts`, `localnetUrl.test.ts`, `localnetCorpus.ts`; anexo `t01`, con la salida del reporte `u01` más abajo): los **cuatro greps dan 0 coincidencias** (`exit=1` de `grep` en cada uno). Sobre **este reporte** (cuerpo armado antes de esta sección, con las rutas ya reemplazadas por `<repo>`, `<HOME real>`, `<scratchpad>`; anexo `u01`), con `/usr/bin/grep -nE`:
- grep 1 `[0-9a-fA-F]{40,64}`: **4 coincidencias, todas clasificadas**: 3 líneas con el `sha256` del bundle público de testnet (`index-B5rzSWM2.js`; huella de un build, sin secreto: líneas de `h02`, `h05` y `f04`) y 1 con `frameworkRev` (el `rev` del framework Sui que ya está en `Move.lock`/`localnet.json`, público).
- grep 2 `0x[0-9a-fA-F]{8,}`: **0** (los IDs de la publicación efímera están enmascarados como `<id>` en el anexo de la sonda de publicación; los tests usan IDs sintéticos armados con `'1'.repeat(64)` y similares, que el patrón no ve como literal).
- grep 3 `suiprivkey|mnemonic|seed phrase|/home/|/Users/|claude-[0-9]+|-home-`: **0** coincidencias en el cuerpo. Las líneas de este reporte que **citan** el patrón (el propio `grep` en las líneas `$ …` del anexo `u01`, y el texto "`grep -c 'command not found'`") se clasifican como **"el propio patrón"**; la salida cruda de `u01` y `t01` se pasa antes por `sed` para reemplazar rutas.
- grep 4 `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: **0**.
- Por separado, el grep de rastros `Cannot run genesis|sui_config|Address already in use` sobre el reporte: coincide solo en las líneas de **mis propios comandos de guarda** (`stat`/`ls` de `<HOME real>/.sui/sui_config/`, que son la verificación, no una ejecución accidental), y `grep -c 'command not found'` da **1**: la línea de la tabla del smoke que **cita** ese comando (el propio patrón); el chequeo real sobre `genesis.log` dio 0 y rastros vacíos.
Los anexos `u01` y `t01` llevan los comandos de los greps tal cual.

### Cierre de la localnet y de lo lanzado en segundo plano (C-14)
- Lanzado en segundo plano: (1) `sui start --fullnode-rpc-port 19000`, (2) el servidor de Vite (`vite.js`, sin `--host`), (3) Chrome headless, y (4) una corrida de `check-deploy-image.sh` que el harness pasó a segundo plano (ya terminada, `exit=0`). Cerrados **por PID**, nunca `pkill`: Chrome y Vite con `kill` (Vite salió con 143) y `sui start` con `kill` (salió con 144, esperado); `kill -0` falla para los tres PID y `ss -ltn` da **0** para `19000`, `5173` y `19222`; `ps` no muestra procesos de `sui start`, `vite.js` ni Chrome con el puerto de depuración. El 9000 ajeno **igual** que al empezar (2 sockets, IPv4 e IPv6). Ningún `Monitor` usado; esperas con `timeout … until` en primer plano.
- `<SMOKE_DIR>` borrado y verificado; `contracts/deployments/localnet.json` y `Pub.*.toml` ausentes; `Move.lock` y `Published.toml` sin diff; `git status` solo con los archivos de "Tocar"; `git stash list` vacío (anexo `q01`).
- Docker: al empezar 5 contenedores / 11 imágenes; al final 6 / 11 (el contenedor extra `<contenedor de otro proyecto>` es de otra sesión del host; imágenes iguales).

### Guarda de ~/.sui (C-13, R-12)
`client.yaml`: 244 bytes, mtime `2026-10-30 17:52:52.515735237 -0500`, solo `client.yaml` en el directorio, `sha256` primeros 12 hex **`ef12fd09615f`** = línea base, al inicio (`a01`), tras el `sui --version` descuidado (`j01`), tras la génesis (`k02`), tras el cierre y al final (`q02`); también tras escribir este reporte (ver la línea final de la respuesta). `grep -c 'command not found'` = 0 y rastros vacíos sobre `genesis.log` y sobre cada borrador de texto escrito (código y docs salen de las herramientas de edición). Ejecución accidental de `sui`: **ninguna** (salvo el `sui --version` sin prefijo declarado en Desviaciones 7e, sin efecto sobre `~/.sui`).

### Documentación
- `app/README.md`, `agents.md` y `app/.env.example` actualizados: **sí** (PROY-20). `app/README.md`: subsección nueva "Puerto de la localnet: `VITE_LOCALNET_URL` (#77)" (regla, error, testnet la ignora, sin `--host`), "Localnet" con el uso y **el Aviso de #77 retirado**, mapa de `sui/` (`localnetUrl.mjs`, `config.ts`, `networks.ts`), árbol de `src/test/` y de `scripts/`. `agents.md`: layout (la guarda importa la regla compartida), el apartado de capturas (§3 paso 4) con el comando del navegador y "Pasos de navegador (🌐)" con `VITE_LOCALNET_URL="$RPC_URL"`, sin `--host` y la advertencia de no apuntar al 9000 ocupado. `app/.env.example`: línea comentada con "nunca vacía (`VITE_LOCALNET_URL=` es un error, no el 9000)".
- **Snippet propuesto para `documents/STATUS.md`** (el orquestador lo aplica):
  - Fila de **Baselines de gates** (app + deploy-image): `app + deploy-image @ feature/issue-77-localnet-port (#77), Node v26.13.0, 2026-11-20 | gates de app, check-deploy-image.sh . 8090 | 🟢 293 paquetes / 292 firmas / 0 vulnerabilidades de producción; lint 0, typecheck 0; app 1362 tests en 67 archivos (1246 + 116: localnetUrl 56, config +59, networks +1); build de testnet index-B5rzSWM2.js 918.31 kB (278.21 kB gzip), +0.51 kB sobre 917.80 kB por el validador y el mensaje de VITE_LOCALNET_URL en resolveConfig; con y sin la variable el bundle es idéntico (nombre, tamaño y sha256), 0 del valor, el literal solo 4 veces como texto estático y VITE_LOCALNET_URL:void 0, BASE_URL 0; imagen OK (positivo) P1-P12.`
  - Fila de **Smokes** (localnet aislada, puerto 19000, chain `d41aa467`): `🟢 8/8 (el 7 hecho): la config de la app con VITE_LOCALNET_URL llega a la localnet del puerto alternativo (chain id leído por el cliente de la app = el de la génesis), sin la variable resuelve el 9000 sin hablarle, testnet la ignora y las URLs hostiles o vacías dan el error D4; navegador (Chrome headless + CDP, Vite sin --host): "localnet · nodo OK", 9 pedidos gRPC-web a 127.0.0.1:19000 y 0 de cualquier tipo al 9000; cierre limpio por PID, ~/.sui idéntico.`
  - Fila de **roadmap/hechos**: `#77 (el navegador contra otro puerto de localnet: VITE_LOCALNET_URL, solo localnet, regla de loopback compartida con la guarda de las capturas en app/src/sui/localnetUrl.mjs, ignorada por construcción en testnet) | ✅ (pendiente de PR y merge) |` y quitar "#77 (el navegador contra otro puerto)" de "Siguiente" y de la nota de la fila de la localnet aislada de #75 ("el navegador contra otro puerto: #77").
  - Pendiente nuevo para el orquestador: abrir el issue de S-1 (con `wrong_chain` la app no arma ni firma transacciones; fuera de #77).
$ bash -c cd <repo> && (git diff; cat app/src/sui/localnetUrl.mjs app/src/sui/localnetUrl.d.mts app/src/sui/localnetUrl.test.ts app/src/test/localnetCorpus.ts) | /usr/bin/grep -nE '[0-9a-fA-F]{40,64}'
exit=1
$ bash -c cd <repo> && (git diff; cat app/src/sui/localnetUrl.mjs app/src/sui/localnetUrl.d.mts app/src/sui/localnetUrl.test.ts app/src/test/localnetCorpus.ts) | /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}'
exit=1
$ bash -c cd <repo> && (git diff; cat app/src/sui/localnetUrl.mjs app/src/sui/localnetUrl.d.mts app/src/sui/localnetUrl.test.ts app/src/test/localnetCorpus.ts) | /usr/bin/grep -nE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/|claude-[0-9]+|-home-'
exit=1
$ bash -c cd <repo> && (git diff; cat app/src/sui/localnetUrl.mjs app/src/sui/localnetUrl.d.mts app/src/sui/localnetUrl.test.ts app/src/test/localnetCorpus.ts) | /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}'
exit=1
$ bash -c /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' <scratchpad>/t77/body1.txt | cut -c1-170
371:1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
411:1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
447:1b36aadbeeb8a49555593498cd2e61453bbf7a8b548c6d120893644fc2062f51  app/dist/assets/index-B5rzSWM2.js
747:  frameworkRev: e6f43880f4b65e2c1f0397583a9690b4b22c9223
exit=0
$ bash -c /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' <scratchpad>/t77/body1.txt | cut -c1-170
exit=0
$ bash -c /usr/bin/grep -nE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/|claude-[0-9]+|-home-' <scratchpad>/t77/body1.txt | cut -c1-170
exit=0
$ bash -c /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}' <scratchpad>/t77/body1.txt | cut -c1-170
exit=0
$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12; ss -ltn | grep -c ':19000 '; ss -ltn | grep -c ':5173 '
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
0
0
exit=1
$ bash -c stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml; ls -la <HOME real>/.sui/sui_config/; sha256sum <HOME real>/.sui/sui_config/client.yaml | cut -c1-12; ss -ltn | grep -c ':19000 '; ss -ltn | grep -c ':5173 '; ss -ltn | grep -c ':19222 '
2026-10-30 17:52:52.515735237 -0500 244 <HOME real>/.sui/sui_config/client.yaml
total 12
drwx------ 2 <user> <user> 4096 Oct 30 16:04 .
drwx------ 3 <user> <user> 4096 Oct 30 16:04 ..
-rw-rw-r-- 1 <user> <user>  244 Oct 30 17:52 client.yaml
ef12fd09615f
0
0
0
exit=1

~~~~


---

## 2. Revisión del MID

> MID, #77: PASA CON CAMBIOS (un test de `loadConfig` y un retoque del reporte).

PASA CON CAMBIOS

# Revisión del MID: #77 (`VITE_LOCALNET_URL`, el navegador contra otro puerto de la localnet aislada)

Rama `feature/issue-77-localnet-port` sobre `b2704a5` (handoff v1.2), cambios sin commitear: 10 modificados y 4 nuevos. Revisado contra `documents/HANDOFF_LOCALNET_PORT_77.md` v1.2 (D1..D9, "Qué implementar", tests, smoke, DoD 1-10 y la lista final del MAYOR) y FLUJO §5. Solo lecturas: no corrí gates ni `sui`. Leí el reporte completo (884 líneas, anexos incluidos), el `git diff` de lo versionado y los 4 archivos nuevos enteros, y verifiqué por mi cuenta el corpus y las fronteras.

## Veredicto

**PASA CON CAMBIOS.** Sin 🔴 ni 🟠. El código, la regla compartida, los tests de `config`, el smoke y los docs están bien. El cambio que pido es **uno solo y de un test**: hay una prueba de `loadConfig` que falla en una máquina con un `contracts/deployments/localnet.json` presente (ver N-1), que es justo el flujo que esta tarea habilita (levantar la app contra una localnet y correr `npm test`). Se arregla borrando ese test (su comportamiento ya lo cubre otro de `resolveConfig`). Además hay un retoque del reporte antes de agregarlo a `REPORTES` (N-5: el nombre de un contenedor de otro proyecto). Con esas dos cosas se commitea sin otra ronda del DEV de revisión.

## Controles del orquestador: coinciden

- 14 entradas (10 M + 4 ??), stash vacío; `git diff --exit-code` sobre `app/Caddyfile`, `Dockerfile`, `.dockerignore`, `.github`, `contracts`, `package*.json`, `app/package.json`, `app/eslint.config.js`, `app/vite.config.ts`, `localnet-guard.d.mts`, los tres `capture-*.mjs` y `documents/` = 0 (lo reconfirmo por el estado del árbol: ninguno aparece modificado).
- `numstat` que verifiqué: `localnet-guard.mjs` +9/−28, `localnet-guard.test.ts` +2/−56, `config.ts` +36/−6, `networks.ts` +5/−2, `vite-env.d.ts` +1/0.
- Bundle de testnet con y sin la variable: mismo `index-B5rzSWM2.js` 918.31 kB (278.21 gzip), mismo sha256 (`1b36aadbeeb8…`), delta +0.51 kB sobre 917.80 kB (≪ 1 kB, el esperado de v1.2), y el criterio de 6 puntos del orquestador y del reporte (anexos `h01`-`h06`).
- Tus números de tests (1362 en 67 archivos = 1246 + 116: `localnetUrl` 56, `config` +59, `networks` +1) y los de lint/typecheck coinciden con el reporte.

## 1. Conformidad con D1..D9 y con "Qué implementar" (todo OK)

- **D1 (testnet ignora el parámetro, dos capas):** `loadConfig` pasa `VITE_LOCALNET_URL` solo si `import.meta.env.VITE_SUI_NETWORK === 'localnet'` y `resolveConfig` no lo lee fuera de localnet. `import.meta.env` se lee **solo por propiedad** (`VITE_SUI_NETWORK`, `VITE_LOCALNET_URL`, `DEV`); el docstring de `loadConfig` lo dice y mi grep de la forma "objeto" da 0.
- **D2 (una sola regla):** `localnetUrl.mjs` (sin imports, puro) con `LOCALNET_URL` y `isLoopbackUrl`; la regex y la constante son las movidas (el orquestador y el reporte lo prueban con `diff` vacío, DoD 10). `localnet-guard.mjs` quita solo las tres definiciones y agrega el import y el re-export; los tres `capture-*` y `localnet-guard.d.mts` intactos. `config.ts` y `networks.ts` importan del módulo nuevo; la identidad de referencia con la guarda está en `localnetUrl.test.ts`.
- **D3/D4 (`undefined` es el único valor por defecto; mensaje literal):** `if (network === 'localnet' && env.VITE_LOCALNET_URL !== undefined)` y, si no pasa `isLoopbackUrl`, `fail(...)` con el texto de D4 al carácter (`VITE_LOCALNET_URL=${JSON.stringify(valor)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`); sin `trim` ni normalización. La cadena vacía es error.
- **D5 (orden):** la validación va justo después de validar la red y **antes** de buscar el JSON de despliegue.
- **D6:** `NETWORKS.localnet.grpcUrl` = `LOCALNET_URL` (el único lugar con el 9000 en `src/` fuera de tests), comentario "por defecto; el efectivo es `AppConfig.grpcUrl`".
- **D7/D8/D9:** sin cambios de UI; `.env.example` con la línea comentada y "nunca vacía"; la variable vale en dev y en builds de localnet; el burner sigue `localnet && DEV` (test: `burnerWalletEnabled` no cambia).
- Nada más: no hay código de más ni de menos.

## 2. La regla es la misma función y no se aflojó ni se duplicó

Identidad de referencia (`guard.isLoopbackUrl === isLoopbackUrl`, `guard.LOCALNET_URL === LOCALNET_URL`) y un solo corpus. **Verifiqué por mi cuenta que el corpus extraído es idéntico al que estaba dentro de `localnet-guard.test.ts` en `HEAD`** (diff de las listas `ACCEPTED`, `REJECTED_STRINGS` y `NON_STRINGS`: sin diferencias). No hay segunda regex: la única `LOOPBACK_URL` está en el módulo compartido.

## 3. Corpus único y tests de la guarda

- `localnetCorpus.ts`: `ACCEPTED` 4, `REJECTED_STRINGS` 33, `NON_STRINGS` 5 y `REJECTED_STRINGS_ENV` 6 (`\r`, `\t` finales, comillas literales, punto final, octal y `%3A`), con el test de longitud en `localnetUrl.test.ts`.
- `REJECTED_STRINGS_ENV` la consumen `localnetUrl.test.ts` y `config.test.ts` (la última, junto con `REJECTED_STRINGS` y un valor de solo un espacio) y **no** `localnet-guard.test.ts`.
- `localnet-guard.test.ts`: el diff solo quita las tres listas y agrega el import y un comentario; las aserciones y los nombres no cambian (el reporte pega `NOMBRES-IGUALES` del `diff` de los nombres de los tests; el diff de código lo confirma: ninguna línea `it`/`expect` modificada).

## 4. Tests de `config.test.ts` y mutaciones mentales

Cubren: sin parámetro = `http://127.0.0.1:9000` con la fixture real; cada puerto aceptado, con el resto de la config igual (`toEqual({ ...without.config, grpcUrl })`); **cada forma inválida** de `REJECTED_STRINGS`, de `REJECTED_STRINGS_ENV` y un espacio, con el mensaje D4 exacto (`toEqual({ ok: false, error })`); `''` como error y `undefined` como único "por defecto"; D5 (valor inválido con `deployments` vacío da el error del parámetro; valor válido sin JSON da el de siempre); testnet con valor válido, inválido y vacío da el mismo resultado que sin parámetro, con el endpoint de testnet y sin mencionar la variable; `loadConfig` con `vi.stubEnv` en testnet y en localnet con valor inválido.

Mutaciones mentales (¿mueren?):
- Quitar `isLoopbackUrl` (aceptar cualquier valor): mueren los tests de rechazo (más de 40 casos).
- Quitar el orden D5 (validar después de buscar el JSON): muere "reports an invalid value before a missing localnet.json" y los dos de `loadConfig`.
- Leer el parámetro también en testnet: mueren los tres casos de testnet (el inválido y el vacío darían error) y el de `loadConfig` de testnet.
- Tratar `''` como "por defecto": muere el test de la cadena vacía.
- Cambiar el mensaje D4: mueren todos los de rechazo (comparan el texto exacto).
- **Quitar solo la capa (a)** (que `loadConfig` pase siempre el valor): **no muere en Vitest**, porque la capa (b) de `resolveConfig` ya lo ignora en testnet. Es correcto: la capa (a) es una propiedad del **build** (el valor no se embebe) y la prueba es el criterio del bundle (puntos 1, 2, 5 y 6 del paso 6 del smoke, con los dos builds idénticos). Lo anoto como 🔵 N-3, sin acción.

### N-1 🟡 (a corregir): un test de `loadConfig` depende de que NO exista `localnet.json`

El reporte lo declara: "reports the usual missing localnet.json on localnet with a valid value and no deployment file" (el último `it` del `describe('loadConfig: VITE_LOCALNET_URL')`) supone que `contracts/deployments/localnet.json` (ignorado por git) no existe. En CI no existe y el test pasa; pero **en el checkout de quien acaba de levantar una localnet y corre `npm test` ese archivo sí existe y el test falla**, en un error que no dice por qué. Ese es exactamente el flujo que esta tarea habilita, y el DEV lo esquivó corriendo los gates antes de publicar. **Severidad: 🟡 y se corrige** (no es 🔵). Los demás tests de `loadConfig` **no** dependen del archivo: los de testnet usan el `testnet.json` commiteado y los de localnet con valor inválido devuelven el error D4 antes de mirar el JSON (D5), con o sin `localnet.json`.

**Corrección (mínima):** borrar ese `it`. No pierde cobertura: `resolveConfig` ya prueba lo mismo con `{}` ("reports the missing localnet.json as usual when the value is valid"), y lo único que el test de `loadConfig` agregaba (que el glob del build está vacío) es el comportamiento de siempre de `loadConfig`. Si el DEV prefiere conservarlo, tiene que tolerar la presencia del archivo (aceptar `ok` o el error de archivo ausente), pero entonces ya no prueba nada. Borrarlo es lo limpio; el "Riesgos / pendientes" del reporte pasa a "ninguno" en ese punto.

## 5. Test de higiene (D6) y greps (a)-(f)

- **Test de higiene por `import.meta.glob` con `?raw`:** funciona y está bien acotado (sin tests ni `src/test/**`). Es **algo frágil** por diseño (🔵 N-2): `NETWORKS(?=[\s\S]*grpcUrl)` falla si un archivo de `src/` que no sea `config.ts` ni `networks.ts` menciona las dos palabras **en cualquier parte, comentarios incluidos**, y `import.meta.env(?![.])` falla ante un comentario que nombre el objeto sin punto (el DEV ya reescribió dos comentarios por eso). Aceptable: el fallo es ruidoso y dice qué archivo, y es una valla deliberada contra una regresión de seguridad (el endpoint solo se resuelve en `config.ts`). Sin acción.
- **Greps (a)-(f)** con su salida pegada, coinciden con lo esperado: `VITE_LOCALNET_URL` solo en `sui/config.ts` y `vite-env.d.ts`; `NETWORKS` solo en `networks.ts`, `config.ts` y `explorer.ts` (que solo lee `explorerBase`); `.grpcUrl` solo en `config.ts` y `dappKit.ts`; `import.meta.env` solo en `config.ts` y **solo por propiedad** (el mío: 0); y ninguna segunda definición de la regex.

## 6. Smoke (8 pasos): respaldado y sin tocar el 9000

- **Paso 3:** la config resuelta con `VITE_LOCALNET_URL` da `http://127.0.0.1:19000` y el **cliente de la app** (`createAppDAppKit` + `fetchNodeInfo`) lee el chain id `d41aa467` = el de la génesis (`suic chain-identifier`).
- **Paso 4:** sin la variable la config resuelve el 9000 **solo como cadena**, sin crear cliente.
- **Paso 5:** testnet ignora la variable (solo la cadena) y las URLs hostiles o vacía dan el error D4; **0 pedidos de red nuevos**; el `spy` de `fetch` cierra con "pedidos totales=1; al 9000=0; destinos=127.0.0.1:19000".
- **Paso 6:** los dos builds de testnet (con y sin la variable) con el criterio final de 6 puntos: valor = 0; mismo nombre, tamaño y sha256; el literal `VITE_LOCALNET_URL` 4 veces como texto estático (con su contexto pegado); la única coincidencia de `VITE_LOCALNET_URL:` es `VITE_LOCALNET_URL:void 0` (la rama de la capa (a) plegada); `BASE_URL` = 0.
- **Paso 7 (opcional, hecho):** Vite **sin `--host`** (el `ss` muestra el 5173 solo en `127.0.0.1`, el log dice "use --host to expose"), Chrome headless con perfil, `HOME` y `XDG_*` desechables y depuración solo en `127.0.0.1:19222`, cliente CDP con dominio `Network`: el indicador dice `localnet · nodo OK`, **9 peticiones gRPC-web todas a `127.0.0.1:19000`**, **0 peticiones de cualquier tipo a `:9000`**, los demás orígenes **listados** (el servidor de Vite en `localhost:5173` y una URL `data:`), consola con 0 errores, 0 excepciones y 0 violaciones de CSP (en dev no hay CSP: solo producción) y 2 warnings esperados (la burner de `DEV` y Lit en modo dev). Cierre por PID del Chrome, Vite y `sui start`, `kill -0` falla, 19000/5173/19222 en 0, el 9000 ajeno igual, `~/.sui` idéntico (244 bytes, mismo hash), Docker sin cambios propios.
- **Rotulado:** el baseline, los gates y cada comando cuya salida se pega pasan por `capture.sh`; los sin rotular son de solo lectura o administración y el DEV los declara (desviación 8). La sonda y el cliente CDP quedan **fuera de `<SMOKE_DIR>`** (en `<scratchpad>/t77/sonda_copia`), auditables.
- **Dos desviaciones del paso 7, aceptables y declaradas:** el servidor se lanzó como `node …/vite.js` (lo que ejecuta el script `dev`) y no con `npm run dev`, para que el PID guardado sea el del servidor y se cierre sin dejar un hijo huérfano de `npm` (C-14); y Chrome con `--no-sandbox` (perfil y `HOME` desechables, depuración solo en loopback), necesario para correr como usuario normal en este entorno. 🔵, sin acción.

## 7. `check-deploy-image.sh`

Camino positivo con P1-P12 y la línea final `OK (positivo)`, con el bundle servido `index-B5rzSWM2.js`: demuestra que `localnetUrl.mjs` entra a la imagen (vive en `src/sui/`, no en `app/scripts`, que el `.dockerignore` excluye) y que la guarda `network: "localnet"` del `Dockerfile` sigue pasando. Docker 6/11 antes y después (el contenedor extra es de otra sesión).

## 8. Docs (PROY-20)

- **`app/README.md`:** el **Aviso de #77 retirado**; subsección nueva "Puerto de la localnet: `VITE_LOCALNET_URL` (#77)" exacta contra el código (la regla, "sin la variable = 9000" como único caso por defecto, vacía o inválida = error D4 antes de buscar el JSON, testnet la ignora por construcción y el bundle no la embebe, vale en dev y en builds de localnet, el chain id como defensa y el riesgo residual, y `npm run dev`/`vite preview` sin `--host` con la nota de que la CSP vive solo en producción); "Localnet" con el comando de uso; mapa de `sui/` (`networks.ts`, `localnetUrl.mjs`, `config.ts`) y árbol de `src/test` y de `scripts`.
- **`agents.md`:** layout (la guarda importa la regla compartida), la frase de las capturas en el paso 4 con el comando del navegador y "Pasos de navegador (🌐)" con `VITE_LOCALNET_URL="$RPC_URL"`, sin `--host` y la advertencia de no apuntar el navegador al 9000 ocupado.
- **`app/.env.example`:** línea comentada con "Nunca vacía: `VITE_LOCALNET_URL=` es un error de configuración, no el 9000".
- Sin rutas personales ni cuentas. Exactitud verificada.
- **Snippet de STATUS (bien, con un ajuste):** las cifras (1362/67, 918.31 kB, +0.51 kB, imagen P1-P12) coinciden. Ajuste: en la fila de "Hechos", #77 va como "✅ (pendiente de PR y merge)" hasta el merge y el housekeeping lo deja "Hecho"; el resto está bien.

## 9. Hallazgos con severidad

- 🔴/🟠: **ninguno.**
- **N-1 🟡 (a corregir):** el test de `loadConfig` que depende de la ausencia de `localnet.json`; se borra (sección 4).
- **N-2 🔵:** el test de higiene por `?raw` es algo frágil ante comentarios; aceptable y deliberado.
- **N-3 🔵:** la capa (a) de D1 solo se prueba por el bundle (build-time), no en Vitest; correcto.
- **N-4 🟡 (proceso, C-13/C-3):** juzgo la auditoría mecánica (224 líneas Bash; 0 heredocs, 0 `sed -i`, 0 `tee`, 0 `cat >`, 0 `printf` ajeno; 14 `echo`; 35 Edit y 19 Write) como **🟡, no 🟠**: no hay código, tests, docs ni texto de reporte escrito por una vía prohibida. Tres puntos puntuales:
  - **`sui --version` con el HOME real y sin el prefijo `printf 'n\n' |`** (C-3: "toda invocación de `sui` lleva `printf 'n\n' |` delante"). Es un **incumplimiento de la regla**, aunque en un comando de solo lectura de la versión que no lee la config ni puede ejecutar nada sobre `~/.sui` (lo verificó al instante: idéntico a la línea base). Lo declaró. **🟡**, no sube a 🟠 porque no hubo efecto ni riesgo real; sí queda registrado y la regla se mantiene.
  - **`echo $$ > vite.pid` y `echo $$ > chrome.pid` por analogía con la excepción (i)** (`sui.pid` de la Receta P). Guardan solo un PID y no escriben texto de reporte ni de código, así que son 🟡 y la extensión es razonable; **propongo formalizarla** en la regla común C-13 (i) de los próximos handoffs: "`echo $$ > <SMOKE_DIR>/<nombre>.pid` para guardar el PID de **cualquier** proceso en segundo plano de la tarea".
  - Los 14 `echo` restantes son marcas de verificación a pantalla dentro de comandos (`echo ok`, `echo DIFF-VACIO`…) y el `echo "genesis-exit=$?"` de la Receta P: no escriben archivos.
- **N-5 🟡 (retoque del reporte, antes de agregarlo a `REPORTES`):** el anexo del paso 7 pega la salida de un `docker ps` con el **nombre de un contenedor de otro proyecto del host** (y la sección "Cierre" lo vuelve a nombrar). No es una cuenta ni una ruta, pero es dato de otro proyecto del usuario en un archivo que se commitea. **El orquestador lo reemplaza por "un contenedor de otra sesión del host"** (dos lugares: el anexo y el texto del "Cierre") antes del commit; el resto de la línea (imagen y estado) no hace falta.
- **N-6 🔵:** Vite se lanzó con `node …/vite.js` y Chrome con `--no-sandbox` (sección 6); declarado, sin acción.
- **N-7 🟡 (§R-6, aceptado):** el reporte tiene el grep 1 en 4 líneas (3 con el sha256 del bundle público de testnet y 1 con el `frameworkRev` del framework Sui que ya está en `Move.lock`: públicos) y el grep 3 solo en las líneas que citan el propio patrón; el diff y los 4 archivos nuevos dan 0 en los cuatro. Aceptado como clasificado.

## Mensajes de commit y agrupación (sin palabras de cierre; `Refs #77`)

Tres commits en la branch (más los de docs del handoff que ya están):

1. **Código y tests** (tras borrar el test de N-1):
   `app: add VITE_LOCALNET_URL to point the browser at a localnet on another loopback port, with the URL rule shared with the capture guard (Refs #77)`
   Incluye `app/scripts/localnet-guard.mjs`, `app/src/sui/{localnetUrl.mjs,localnetUrl.d.mts,localnetUrl.test.ts,config.ts,config.test.ts,networks.ts,networks.test.ts}`, `app/src/test/{localnetCorpus.ts,localnet-guard.test.ts}` y `app/src/vite-env.d.ts`.
2. **Docs:**
   `docs: document VITE_LOCALNET_URL in app/README.md, agents.md and app/.env.example, and retire the #77 notice (Refs #77)`
   Incluye `app/README.md`, `agents.md` y `app/.env.example`.
3. **Reportes, estado y decisión:**
   `docs: add the #77 DEV report and MID review, record #77 in STATUS and the owner decision in DECISIONES (Refs #77)`
   Incluye el reporte del DEV (ya redactado como en N-5 y con su §R-6 hecho), esta revisión, `documents/STATUS.md` (el snippet) y `documents/DECISIONES.md` (la entrada del orquestador: la opción "tarea aparte antes de 8b" del owner y el diseño D1..D9 sin duplicar el handoff).

## Housekeeping tras el merge (un commit aparte, como #75)

- **Retira** `documents/HANDOFF_LOCALNET_PORT_77.md`, `documents/REPORTES_LOCALNET_PORT_77.md` y las revisiones de #77.
- **STATUS:** deja #77 en "Hecho", quita #77 de "Siguiente" y de la nota de la fila de la localnet aislada de #75 ("el navegador contra otro puerto: #77"), y conserva las filas de baselines y de smoke.
- **`documents/agentes/AGENTE_DEV.md`:** si el orquestador quiere, la mención de la excepción (i) ampliada a cualquier PID de proceso en segundo plano (N-4).
- **Issue aparte (lo abre el orquestador):** S-1, "con `wrong_chain` la app no arma ni firma transacciones" (prioridad baja).
- **#73 después del merge:** integrar `master` en la branch de #73 por merge (C-2 de #73) y actualizar el handoff de #73 con **v1.2.12**: el STOP del navegador de TASK-8b queda **resuelto** (el smoke usa `VITE_SUI_NETWORK=localnet VITE_LOCALNET_URL="$RPC_URL" npm run dev -w app`, sin `--host`, con la Receta P); `app/src/sui/networks.ts` y `config.ts` siguen en el "NO tocar" de 8b, porque ya traen #77. Lo redacto cuando me lo pidas, después del merge.

## Cuerpo del PR propuesto (con `Closes #77` solo acá)

**Título:** `app: VITE_LOCALNET_URL to reach a localnet on another loopback port (#77)`

```
## Qué
El navegador (`npm run dev`) solo hablaba con el puerto 9000 de la localnet (`app/src/sui/networks.ts`), mientras que las
capturas ya aceptaban `http://127.0.0.1:<puerto>`. Con el 9000 ocupado por otro servicio del host, los smokes con navegador
no podían usar la localnet aislada. Esta PR agrega `VITE_LOCALNET_URL`, solo para localnet.

## Cómo
- Regla única de la URL en `app/src/sui/localnetUrl.mjs` (`isLoopbackUrl`, `LOCALNET_URL`), movida de `app/scripts/localnet-guard.mjs`
  y re-exportada por él: la guarda de las capturas y el endpoint de la app son la misma función. Solo `http://127.0.0.1:<puerto>`,
  1024-65535, nada más. Vive en `src/sui/` (no en `scripts/`) porque la imagen no trae `app/scripts`.
- `resolveConfig`: sin la variable, el 9000 de siempre; cualquier valor definido, incluida la cadena vacía, debe pasar la regla o
  es un error de configuración claro (nunca un regreso silencioso al 9000). Se valida antes de buscar `localnet.json`.
- Con `VITE_SUI_NETWORK=testnet` se ignora por construcción, en dos capas: `loadConfig` no la pasa (Vite pliega la rama y el
  valor no se embebe) y `resolveConfig` no la lee. `import.meta.env` se lee solo por propiedad.
- La CSP, el `Dockerfile`, el `.dockerignore`, los contratos y los scripts de captura no cambian.

## Seguridad
Un parámetro que apunta el cliente a un host es superficie de seguridad: se acota a loopback IPv4 con puerto >= 1024 (misma regla
y mismo corpus que la guarda), se ignora en testnet y no cambia ninguna CSP. Riesgo residual declarado: un proceso local en un
puerto de loopback se acepta como el nodo; la app compara el chain id con el del `localnet.json` (`wrong_chain`). Revisión de
seguridad del MAYOR del handoff y ratificación del criterio del bundle: aprobadas.

## Verificación (output en el reporte)
- app: lint 0, typecheck 0, 1362 tests en 67 archivos (1246 + 116), 0 vulnerabilidades de producción.
- Bundle de testnet 918.31 kB (+0.51 kB): con y sin la variable idéntico (nombre, tamaño, sha256), 0 del valor, la clave solo
  como `VITE_LOCALNET_URL:void 0`, `BASE_URL` = 0.
- Imagen: `check-deploy-image.sh` en verde (P1-P12, OK positivo).
- Smoke en la localnet aislada del puerto 19000: el cliente de la app lee el chain id de la génesis; Chrome headless por CDP
  contra `npm run dev` sin `--host`: 9 peticiones gRPC-web a 127.0.0.1:19000 y ninguna a :9000.

## Fuera de alcance
Que con `wrong_chain` la app no arme ni firme transacciones: issue aparte.

Closes #77
```

## §R-6 de esta salida

Los cuatro greps (`/usr/bin/grep -nE`, el patrón 3 con las rutas de sesión y su slug) sobre este archivo: 0 coincidencias en cada uno. Sin direcciones de cuenta, sin rutas personales (`<scratchpad>`), sin el nombre del servicio del 9000 ni el de ningún otro proyecto del host.


---

## 3. Revisión de seguridad del MAYOR

> MAYOR, #77: APPROVE CON CAMBIOS (de proceso; el código no cambia).

APPROVE CON CAMBIOS

## Revisión de seguridad del MAYOR: implementación de #77 (`VITE_LOCALNET_URL`)

- **Fecha:** 2026-11-20.
- **Ref:** worktree de #77, branch `feature/issue-77-localnet-port`, HEAD `b2704a5` + los cambios del DEV sin commitear (10 archivos modificados y 4 nuevos).
- **Leído:**
  - `app/src/sui/localnetUrl.mjs` y `.d.mts` enteros;
  - los diffs de `config.ts`, `networks.ts`, `localnet-guard.mjs` y `localnet-guard.test.ts`;
  - `localnetCorpus.ts` y `localnetUrl.test.ts` enteros;
  - los casos nuevos de `config.test.ts`;
  - el diff de `agents.md` y `app/.env.example`;
  - del reporte del DEV: bundle, imagen, nombres de los tests, corrida hostil, smoke, desviaciones, riesgos, §R-6 y cierre.
- **Qué ejecuté:** solo lecturas y greps. No corrí `sui` ni builds.

**Veredicto:**
- **La implementación es la que aprobé:** D1..D9 sin cambios, las dos capas de testnet, D3 y D5 tal como están en el handoff, y el criterio de 6 puntos del bundle en verde.
- **El código no tiene nada que cambiar.**
- Los dos 🟡 son de **proceso**:
  - el reporte del DEV nombra el contenedor de otro proyecto del host, y hay que sacarlo antes de transcribirlo;
  - el `sui --version` sin prefijo.
- 3 🔵 y el texto del issue de seguimiento (S-1).

---

## Los 9 puntos

1. **Diff de `localnet-guard.mjs` (M-4): correcto.**
   - Quita las tres definiciones (`LOCALNET_URL`, `LOOPBACK_URL`, `isLoopbackUrl` con su docstring) y agrega `import { LOCALNET_URL, isLoopbackUrl } from '../src/sui/localnetUrl.mjs'` y `export { LOCALNET_URL, isLoopbackUrl }`; además reescribe el comentario de cabecera.
   - El módulo nuevo tiene la regex y el `LOCALNET_URL` **byte a byte** iguales a los de `HEAD` (`diff` vacío, verificado por el orquestador).
   - El cuerpo de `isLoopbackUrl` es idéntico (el `typeof`, el `exec` y el rango 1024-65535).
   - `localnet-guard.d.mts` y los tres `capture-*` no cambian (`git diff --exit-code` = 0).
2. **Diff de `localnet-guard.test.ts`: correcto.** Solo cambia el import de las tres listas desde `./localnetCorpus` y un comentario: las listas eliminadas son las mismas que ahora vive en el corpus. `NOMBRES-IGUALES`: los mismos 90 `✓` antes y después.
3. **Corpus: correcto.**
   - `localnetCorpus.ts` tiene `ACCEPTED` (4), `REJECTED_STRINGS` (33), `NON_STRINGS` (5) y `REJECTED_STRINGS_ENV` (6: `\r`, `\t`, comillas literales, punto final, octal y `%3A`).
   - Hay aserciones de longitud en `localnetUrl.test.ts` (`localnetCorpus: size`).
   - `REJECTED_STRINGS_ENV` la consumen `localnetUrl.test.ts` y `config.test.ts` (junto con `' '`), y **no** el test de la guarda.
   - La identidad de referencia (`guard.isLoopbackUrl === isLoopbackUrl` y `guard.LOCALNET_URL === LOCALNET_URL`) hace que también valga para la guarda.
4. **Bundle (los 6 puntos, con los dos builds pegados):**
   1. el valor `127.0.0.1:19000` aparece 0 veces;
   2. `index-B5rzSWM2.js` es idéntico en nombre, tamaño (918.31 kB) y sha256 con y sin la variable;
   3. `VITE_LOCALNET_URL` aparece 4 veces, todas texto estático (pegadas con contexto: la comparación de `resolveConfig`, su lectura, el mensaje de D4 y la clave de `loadConfig`);
   4. el grep (f) sobre `src` da 0;
   5. la única aparición de `VITE_LOCALNET_URL:` es `VITE_LOCALNET_URL:void 0`, y el contexto pegado muestra `PR({VITE_SUI_NETWORK:\`testnet\`,VITE_LOCALNET_URL:void 0,DEV:!1}, …)`, que es la prueba directa del plegado;
   6. `BASE_URL` aparece 0 veces.
   - **El delta de +0.51 kB** (validador, mensaje de D4 y la rama) es el esperado y está bajo el umbral de 1 kB.
5. **Greps (a)-(f): correctos, y además están convertidos en test.** El test de higiene de `localnetUrl.test.ts` (glob `?raw` de `src` sin tests) comprueba:
   - `NETWORKS` junto a `grpcUrl` solo en `config.ts`/`networks.ts`;
   - `.grpcUrl` solo en `config.ts`/`dappKit.ts`, y `config.grpcUrl` solo en `dappKit.ts`;
   - `VITE_LOCALNET_URL` solo en `config.ts`/`vite-env.d.ts`;
   - `import.meta.env` solo en `config.ts` y **nunca** sin `.` detrás.
   - Eso es mejor que el grep: se rompe en CI. Ver S-2 para el alcance del glob.
6. **`check-deploy-image.sh`:** camino positivo P1-P12 y `OK (positivo)`, con la CSP idéntica a la del `Caddyfile` (P4). El módulo nuevo entra a la imagen y la guarda `localnet` del `Dockerfile` sigue pasando.
7. **Corrida hostil:** los tres `capture-*` con `--url http://localhost:19000` salen con `exit=2` y "No se hizo ningún pedido.", con el re-export de punta a punta.
8. **Smoke:**
   - paso 3: `config.grpcUrl = http://127.0.0.1:19000` y el chain id leído por `fetchNodeInfo` con el **cliente de la app** (`createAppDAppKit`) es igual al de la génesis;
   - pasos 4 y 5: solo cadenas, **0 pedidos**;
   - **paso 7 hecho:**
     - Vite sin `--host`, con el 5173 solo en `127.0.0.1` según `ss`;
     - Chrome headless con perfil, `HOME` y `XDG_*` desechables y depuración en `127.0.0.1:19222`;
     - **9 peticiones gRPC-web, todas a `127.0.0.1:19000`, y 0 de cualquier tipo a `:9000`**;
     - los demás orígenes listados (Vite y un `data:`);
     - 0 errores y 0 violaciones de CSP;
     - cierre por PID de Chrome, Vite y `sui start`;
     - `ss` en 0 para 19000, 5173 y 19222, y el 9000 ajeno igual que al empezar.
   - La observación de que `sui start` escucha en `0.0.0.0:<puerto>` es de la CLI (igual con el 9000) y no de esta tarea: queda en S-3.
9. **C-13 y `~/.sui`:**
   - la guarda está pegada al inicio, después del `sui --version`, después de la génesis, al cierre y al final (los 12 hex de la línea base);
   - los `echo` declarados son **solo de pantalla** (marcas de verificación), y ninguno escribió archivos de código, tests, docs ni reporte;
   - la auditoría mecánica la corre el orquestador; con lo declarado, no hay 🟠.

**Las dos capas de testnet, D3 y D5 están implementadas como las aprobé:**
- `loadConfig` pasa `VITE_LOCALNET_URL` solo con `import.meta.env.VITE_SUI_NETWORK === 'localnet'`, leyendo por propiedad.
- `resolveConfig` solo lo lee con `network === 'localnet'`: con testnet no se valida ni da error, y los tests con un valor válido, uno inválido y uno vacío dan un resultado igual al de sin variable.
- `undefined` es el único valor por defecto. `''` y `' '` dan el error de D4.
- La validación va **después** de la de la red y **antes** de buscar `<red>.json` (D5, con test).

**Efectos laterales:** ninguno.
- `NETWORKS.localnet.grpcUrl` es ahora `LOCALNET_URL`, el mismo string (`networks.test.ts` lo afirma).
- `AppConfig.grpcUrl` está documentado como el endpoint efectivo.
- `dappKit.ts` sigue siendo el único consumidor (test de higiene).
- `burnerWalletEnabled` no cambia (con test).

## Las dos cosas que declara el DEV

- **(a) Los tests de `loadConfig` suponen que no existe `contracts/deployments/localnet.json`: es comodidad, no riesgo de seguridad.**
  - Si el archivo existe, el test "missing localnet.json" **falla en rojo**; no pasa en falso.
  - Los de D5 siguen pasando con o sin el archivo, porque el error del parámetro va antes.
  - En CI el archivo no existe (está ignorado por git).
  - Lo único que pido es dejarlo escrito (S-1).
- **(b) `sui --version` sin `printf 'n\n' |` y con el HOME real: 🟡 de proceso, no grave.**
  - `--version` lo resuelve el parser de argumentos antes de cualquier lógica de configuración: no lee ni crea `~/.sui`, y la guarda inmediata lo confirma (`j01`, igual a la línea base).
  - Pero la regla R-2/C-3 es **sin excepciones** precisamente para no tener que razonar caso por caso, y el descuido es del mismo tipo que el incidente de #75.
  - Bien declarado y bien verificado. Que conste en la revisión del MID como 🟡 y que el DEV lo tenga presente.

---

## Hallazgos

| # | Sev. | Dónde | Problema | Corrección (quién) |
|---|---|---|---|---|
| P-1 | 🟡 MINOR (proceso, repo público) | `REPORTE_LOCALNET_PORT_77.txt` (`<scratchpad>`), en el anexo de Docker y en el cierre | El reporte **nombra el contenedor de otro proyecto del host** (3 apariciones). La regla del owner prohíbe nombrar otros proyectos en lo que se commitea. El diff no lo trae (0). | **El orquestador**, al transcribir a `documents/REPORTES_LOCALNET_PORT_77.md`, reemplaza esas 3 apariciones por "un contenedor de otro proyecto del host" (como en #75) y lo declara en el prefacio. En el próximo handoff, C-6 dice explícitamente que **no se nombran contenedores ni proyectos ajenos**, tampoco en los anexos de `docker ps`: se cuentan o se enmascaran. |
| P-2 | 🟡 MINOR (proceso) | Desviación 7 (e) del reporte | Un `sui --version` sin el prefijo y con el HOME real. Sin efecto (verificado), pero contra C-3, que es "toda invocación". | Registrarlo en la revisión del MID como 🟡; ninguna acción sobre el código. |
| S-1 | 🔵 SUG | `config.test.ts` (tests de `loadConfig`) y `app/README.md` (Tests) | Los tests dependen de que **no** exista `localnet.json`. | Una línea en `app/README.md` (y en el comentario del `describe`): "con una localnet publicada (`contracts/deployments/localnet.json`), el test de 'missing localnet.json' falla: correr los gates antes de publicar o después de borrarlo". Opcional, en el mismo PR o en uno de docs. |
| S-2 | 🔵 SUG | `localnetUrl.test.ts`, glob de higiene | El glob es `../**/*.{ts,tsx}` y no ve un `.mjs` en `src/` (hoy el único es `localnetUrl.mjs`, sin `import.meta.env`). | Extenderlo a `{ts,tsx,mjs}` para que un `.mjs` futuro en `src` no escape a la regla del acceso a `import.meta.env`. Se puede dejar para el próximo toque. |
| S-3 | 🔵 SUG | `agents.md` §3 (localnet aislada) | `sui start` escucha en `0.0.0.0:<puerto>` (la observación del DEV): la localnet aislada queda expuesta en la red local mientras corre. Es la CLI, no #77, y ya pasaba con el 9000. | Anotarlo en `agents.md` §3 como riesgo conocido (las cuentas de la génesis son efímeras y sin valor) y evaluar en un issue aparte si `sui start` admite una dirección de escucha de loopback. No es de este PR. |

**El código no se cambia.** El commit puede hacerse con P-1 resuelto en la transcripción del reporte.

## Texto propuesto para el issue de seguimiento (S-1 de mi revisión del handoff)

> **app: con el nodo en `wrong_chain`, no armar ni firmar transacciones.**
> **Contexto:** `nodeInfo.ts` (`deriveNodeStatus`) ya detecta que el chain id del nodo no coincide con el `chainId` del despliegue, pero solo lo muestra en el indicador. Con `VITE_LOCALNET_URL` (#77), cualquier proceso en un puerto de loopback ≥ 1024 puede atender como "el nodo"; en testnet el endpoint es fijo, pero el mismo control protege ante un fullnode equivocado.
> **Pedido:**
> - (1) con `wrong_chain` (y mientras el estado sea desconocido), los builders y los hooks de transacción **no arman ni piden firma**, y muestran el motivo;
> - (2) las **lecturas siguen**, para diagnosticar;
> - (3) un test por cada acción que firma (crear, aceptar, cancelar, rechazar, reclamar y el panel de la House).
>
> **Prioridad:** baja (sin fondos reales en localnet; en testnet el endpoint es fijo). **Sin cambios de contrato.**

---

### §R-6 sobre esta revisión (`/usr/bin/grep -nE`, grep 3 con `claude-[0-9]+|-home-`)

- `[0-9a-fA-F]{40,64}`: 0.
- `0x[0-9a-fA-F]{8,}`: 0.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/|claude-[0-9]+|-home-`: 2. Esta línea y el título de esta sección, que citan el patrón.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0.
- Sin direcciones de cuenta, sin rutas personales y **sin el nombre del otro proyecto ni de su contenedor**.


---

## 4. Verificación del orquestador

> Controles independientes sobre el árbol final y cambios aplicados antes de commitear.

## Verificación independiente del orquestador (#77)

Hecha sobre el árbol sin commitear (HEAD `b2704a5`) cuando el DEV entregó el reporte, y repetida antes de commitear.

| Control | Resultado |
|---|---|
| Estado del DEV al entregar | `completed`; sin procesos de la tarea en marcha (`sui start`, Vite, Chrome: ninguno; los `vite` y `vitest` que ve `ps` son de otros proyectos del host); puertos 19000, 5173, 19222 y 8090 en 0; el del servicio de otro proyecto igual que al empezar |
| `git status --porcelain --untracked-files=all` | 14 entradas: 10 modificadas (`agents.md`, `app/.env.example`, `app/README.md`, `app/scripts/localnet-guard.mjs`, `app/src/sui/{config,networks}.ts` y sus tests, `app/src/test/localnet-guard.test.ts`, `app/src/vite-env.d.ts`) y 4 nuevas (`app/src/sui/localnetUrl.{mjs,d.mts,test.ts}`, `app/src/test/localnetCorpus.ts`); stash vacío |
| `git diff --exit-code` sobre `app/Caddyfile`, `Dockerfile`, `.dockerignore`, `.github`, `contracts`, `package.json`, `package-lock.json`, `app/package.json`, `app/eslint.config.js`, `app/vite.config.ts`, `app/scripts/localnet-guard.d.mts`, los tres `capture-*.mjs` y `documents/` | 0 |
| `contracts/deployments/localnet.json` y `contracts/Pub.*.toml` | ausentes |
| Lint, typecheck y `npm test -w app` | 0; 0; **1362 tests en 67 archivos** antes de N-1 y **1361** después de borrar el test que dependía de la ausencia de `localnet.json` (1246 + 115) |
| Dos builds de testnet, sin y con `VITE_LOCALNET_URL=http://127.0.0.1:19000` | ambos `index-B5rzSWM2.js`, 918,31 kB (gzip 278,21 kB), mismo sha256 (`1b36aadbeeb8…`); +0,51 kB sobre 917,80 kB |
| Criterio de 6 puntos del bundle (v1.2), por el orquestador | (1) el valor `127.0.0.1:19000` = 0; (2) los dos builds idénticos en nombre, tamaño y sha256; (3) `VITE_LOCALNET_URL` aparece 4 veces, texto estático; (4) el `grep` de `import.meta.env` por objeto sin tests = 0; (5) la única coincidencia de `VITE_LOCALNET_URL:` es `VITE_LOCALNET_URL:void 0`; (6) `BASE_URL` = 0 |
| La regla se movió tal cual (DoD 10) | `diff` de las líneas `LOOPBACK_URL =` y `LOCALNET_URL =` entre `HEAD:app/scripts/localnet-guard.mjs` y `app/src/sui/localnetUrl.mjs` vacíos; el cuerpo de `isLoopbackUrl` es idéntico; `localnet-guard.mjs` +9/−28 (solo quita las tres definiciones y agrega el import y el re-export) y `localnet-guard.test.ts` +2/−56 (solo el import de las listas) |
| §R-6 (4 greps, grep 3 con `claude-[0-9]+\|-home-`) sobre el diff y los 4 archivos nuevos | 0 en los cuatro |
| `~/.sui`; Docker | 244 bytes, mtime 2026-10-30 17:52:52, solo `client.yaml`, `ef12fd09615f`; el conteo de contenedores e imágenes varía por otras sesiones del host y la tarea no los tocó |
| Auditoría mecánica de la transcripción (`audit_dev.sh`, P-2) | 224 líneas Bash; 0 heredocs, 0 `sed -i`, 0 `tee`, 0 `cat >`, 0 `printf` ajeno a `sui`; 14 `echo` (marcas de verificación a pantalla y `echo $$ > <nombre>.pid`, donde el DEV extendió por analogía la excepción de la Receta P a `vite.pid` y `chrome.pid`); 35 `Edit` y 19 `Write`. **Un `sui --version` con el HOME real y sin el prefijo `printf 'n\n' \|`**, declarado por el DEV y verificado enseguida (`~/.sui` idéntico): 🟡 de proceso para el MID y el MAYOR |
| Código de producción leído por el orquestador | `localnetUrl.mjs` entero y los diffs de `config.ts`, `networks.ts` y `localnet-guard.mjs`; el resto (tests, corpus, docs) lo leyeron el MID y el MAYOR |

**Aplicado por el orquestador antes de commitear:** (1) N-1 del MID, el test de `loadConfig` que dependía de que no existiera `localnet.json` se reemplazó por un comentario que remite al caso equivalente de `resolveConfig`; (2) P-1 del MAYOR, los nombres de contenedores de otros proyectos del host se sustituyen al transcribir el reporte (ver el prefacio). **No se aplicaron** S-2 (extender el glob del test de higiene a `.mjs`) ni S-3 (nota en `agents.md` de que `sui start` escucha en `0.0.0.0`): quedan para el issue de seguimiento o un toque próximo; S-3 y la observación de `sui start` en `0.0.0.0:<puerto>` se registran en el issue de seguimiento.

**Pendientes después del merge:** housekeeping (retirar el handoff y estos reportes; registrar #77 en `STATUS.md` y la decisión del owner en `DECISIONES.md`, con el snippet del DEV), formalizar en C-13 (i) el patrón `echo $$ > <SMOKE_DIR>/<nombre>.pid` para cualquier proceso en segundo plano de la tarea (N-4 del MID), y abrir el issue de seguimiento de `wrong_chain` (la app no arma ni firma transacciones con el nodo en `wrong_chain`; prioridad baja).

