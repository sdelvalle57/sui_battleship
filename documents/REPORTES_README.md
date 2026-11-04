# REPORTES_README
> Issue: #16 | Plan: PLAN_README v1 | Handoff: HANDOFF_README v1.1 | Branch: `feature/issue-16-readme`

## TASK-1

## Task completado: HANDOFF_README — TASK-1

### Branch (con SHA corto del HEAD)
`feature/issue-16-readme` @ `937a21f`, al día con `origin`. Cambios sin commitear: no hice commits ni pushes.

### Archivos modificados/creados
- `contracts/Move.toml`: +1, `license = "Apache-2.0"` en `[package]`, después de `edition`.
- `package.json`: +1, `"license": "Apache-2.0",` después de `"private": true,`.
- `app/package.json`: +1, lo mismo, después de `"private": true,`.
- `package-lock.json`: +2 / −0, regenerado con `npm install --package-lock-only`.
- `documents/REPORTES_README.md`: este reporte. El harness del DEV no permitió crearlo, así que lo entregué como texto.

### Qué se implementó (3 líneas máx)
Agregué el campo `license = "Apache-2.0"` en los tres manifiestos sin reordenar ni reformatear nada más, y el lock lo refleja en `packages[""]` y `packages["app"]`. No agregué `author` ni `version`. La CLI 1.83.0 acepta el campo sin avisos y sin repin, así que no hizo falta el fallback de §3.4.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno, porque son metadatos (el handoff §5 dice "sin tests nuevos").

**Diff (`git diff --stat` y `--numstat`):**
```
 app/package.json    | 1 +
 contracts/Move.toml | 1 +
 package-lock.json   | 2 ++
 package.json        | 1 +
 4 files changed, 5 insertions(+)

1	0	app/package.json
1	0	contracts/Move.toml
2	0	package-lock.json
1	0	package.json
```

**Lock (§3.3)**, desde `<repo>` con el prefijo §R-6 (`node --version` da `v26.13.0` y `npm --version` da `11.20.0`):
```
$ npm install --package-lock-only > <scratchpad>/lockonly.log 2>&1; echo "exit=$?"; cat <scratchpad>/lockonly.log
exit=0

up to date, audited 295 packages in 4s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

$ git diff -- package-lock.json
diff --git a/package-lock.json b/package-lock.json
index e35ba54..24c4b71 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -5,6 +5,7 @@
   "packages": {
     "": {
       "name": "sui-battleship",
+      "license": "Apache-2.0",
       "workspaces": [
         "app"
       ],
@@ -14,6 +15,7 @@
     },
     "app": {
       "name": "sui-battleship-app",
+      "license": "Apache-2.0",
       "dependencies": {
         "@mysten/dapp-kit-core": "1.6.39",
         "@mysten/dapp-kit-react": "2.1.41",
```
El resultado es exactamente +2/−0, con solo las dos líneas esperadas. No cambian versiones, `resolved`, `integrity`, orden ni entradas.

**Contracts**, en la forma canónica de `agents.md` §3, desde `<repo>/contracts`:
```
$ printf 'n\n' | sui --version
sui 1.83.0-16d2dc1e05ed

$ printf 'n\n' | sui move build -e testnet --warnings-are-errors > <scratchpad>/build.log 2>&1; echo "exit=$?"; cat <scratchpad>/build.log
exit=0
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship

$ printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0

$ printf 'n\n' | sui move test -e testnet --warnings-are-errors > <scratchpad>/test.log 2>&1; echo "exit=$?"
exit=0
$ grep -c '^\[ PASS' <scratchpad>/test.log; grep -c 'house_tests::' <scratchpad>/test.log; grep -c 'game_tests::' <scratchpad>/test.log
83
26
57
$ grep -vE '^\[ PASS' <scratchpad>/test.log        # todo lo que no es una línea PASS
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
Running Move unit tests
Test result: OK. Total tests: 83; passed: 83; failed: 0

$ grep -c "Updating dependencies" <scratchpad>/build.log
0

$ node --test scripts/*.test.mjs          # prefijo §R-6, v26.13.0 (cola del output)
✔ interpretCliRun: salida real ⇒ el resultado del parser (0.426347ms)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 166.80182
exit=0

$ node scripts/publish.mjs check          # prefijo §R-6
0 despliegues
exit=0

$ git diff --exit-code -- Move.lock; echo "lock-exit=$?"
lock-exit=0
```
Resultado: **0 warnings / 0 lints / 83 tests PASS** (26 `house_tests` + 57 `game_tests`). `Updating dependencies` da 0, los scripts dan **99 PASS**, `check` da **0 despliegues** y `Move.lock` no tiene delta. La CLI no emitió ningún aviso por `license`, como anticipa §2 del handoff. Cero delta contra la §0.

**App**, steps del job `app` en orden, desde `<repo>` con el prefijo §R-6 (`node --version` da `v26.13.0`). Antes del `npm ci` el worktree no tenía `node_modules`.
```
$ npm ci > <scratchpad>/ci.log 2>&1; echo "ci exit=$?"; cat <scratchpad>/ci.log
ci exit=0

added 293 packages, and audited 295 packages in 7s

67 packages are looking for funding
  run `npm fund` for details

11 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

$ npm audit signatures; echo "exit=$?"
audited 292 packages in 8s

292 packages have verified registry signatures

143 packages have verified attestations
(use --json --include-attestations to view attestation details)

exit=0

$ npm audit --omit=dev --audit-level=high; echo "exit=$?"
found 0 vulnerabilities
exit=0

$ npm run lint -w app; echo "exit=$?"

> lint
> eslint . --max-warnings 0

exit=0

$ npm run typecheck -w app; echo "exit=$?"

> typecheck
> tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

exit=0

$ npm test -w app > <scratchpad>/apptest.log 2>&1; echo "test exit=$?"; grep "Test Files" <scratchpad>/apptest.log; tail -8 <scratchpad>/apptest.log
test exit=0
 Test Files  57 passed (57)
      Tests  915 passed (915)
   Start at  04:33:58
   Duration  22.41s (environment 60%, tests 12%, import 10%, setup 10%, transform 8%, worker 1%)

Environment  jsdom was created 57 times · 125.85s total, 60% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

$ VITE_SUI_NETWORK=testnet npm run build -w app > <scratchpad>/appbuild.log 2>&1; echo "build exit=$?"; cat <scratchpad>/appbuild.log
build exit=0

> build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 596 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.39 kB │ gzip:   0.26 kB
dist/assets/index-PjfExgZ6.css    0.38 kB │ gzip:   0.22 kB
dist/assets/index-Ck3iRlQ-.js   901.45 kB │ gzip: 273.61 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 563ms

$ git status --porcelain --untracked-files=all
 M app/package.json
 M contracts/Move.toml
 M package-lock.json
 M package.json
```
Resultado:
- `npm ci`: 293 paquetes.
- Firmas: 292.
- Vulnerabilidades de producción: 0. Las 11 *moderate* son solo de dev (#35).
- Lint: **0 problemas**. Typecheck: **0 errores**.
- Tests: **915 PASS en 57 archivos**.
- Build: `index-*.js` de **901.45 kB (273.61 kB gzip)**, igual que en la §0. El aviso de chunk > 500 kB es el informativo que ya se conocía.

Cero delta. `app/dist/` está ignorado por git.

**Headers (re-verificación, los dos vacíos):**
```
$ grep -L 'SPDX-License-Identifier: Apache-2.0' contracts/sources/*.move contracts/tests/*.move; echo "grepL-exit=$?"
grepL-exit=1
$ grep -rn 'Your Project' contracts/; echo "grep-exit=$?"
grep-exit=1
```
Ninguno de los dos da salida, así que los 4 `.move` llevan el header.

**§R-3 sobre el diff de TASK-1** (`git diff > <scratchpad>/task1.diff`):
```
$ grep -nE '[0-9a-fA-F]{40,64}' <scratchpad>/task1.diff; echo "e1=$?"
e1=1
$ grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <scratchpad>/task1.diff; echo "e2=$?"
e2=1
$ grep -nE '0x[0-9a-fA-F]{8,}' <scratchpad>/task1.diff; echo "e3=$?"
e3=1
```
Los tres dan vacío, y los mismos greps sobre el texto de este reporte también. Uso `<scratchpad>` y `<repo>` como placeholders (§R-1).

- Tablas de contrato (`contracts/README.md`) y `app/src/sui/` sincronizados: no aplica, porque el contrato no cambia.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: según el handoff §6, son metadatos sin flujo ejecutable. No usé localnet, navegador ni `sui client`, y no corrí nada contra testnet. En `~/.sui/sui_config/` solo usé `stat` y `ls`, con el mismo resultado antes y después: `client.yaml` es el único archivo (244 bytes, mtime 2026-10-30 17:52:52).

### Desviaciones del handoff
- Qué cambió: nada en el código. En el procedimiento, `npm install --package-lock-only` se corrió dos veces. La primera fue con `| tail`, que no deja ver el exit code de npm. La segunda va redirigida a un log, con `echo "exit=$?"`.
- Por qué (motivo técnico): para pegar el exit code real de npm, igual que en el build (MINOR-1 de la v1.1).
- Verificación extra realizada: la segunda corrida da `up to date` y el diff del lock sigue en +2/−0, sin cambios.
- Fallback de `Move.toml` (§3.4): **no aplicado**, porque la CLI no avisó nada. TASK-2 **no** tiene que agregar en "Licencia" la línea "el manifest de la CLI 1.83 ignora `license`…".

### Riesgos / pendientes
- **N-2 (no delegable, para el orquestador):** `package.json`, `app/package.json` (que entra en `app/**`) y `package-lock.json` están en las watch paths de Railway (checklist de #15, paso 5). Si cuando se mergee el PR principal Railway ya está conectado sin la preautorización del owner (paso 10 de ese checklist), el merge publica el sitio. En ese caso el merge espera al owner.
- N-3 / R-2: no ocurrieron. `Move.lock` no tiene delta, `Updating dependencies` da 0 y el lock de npm queda en +2/−0.

### Documentación
- READMEs / `agents.md` actualizados: no aplica en este task, porque son metadatos. El README raíz es TASK-2 y `agents.md` §14 es TASK-4.
- Snippet propuesto para `documents/STATUS.md`:
  `| contracts/ + app @ feature/issue-16-readme (TASK-1 de #16), CLI 1.83.0, Node v26.13.0, 2026-11-04 | gates completos de contracts y app | 🟢 exit 0. license = "Apache-2.0" en Move.toml, package.json y app/package.json (lock +2/−0). 0 warnings / 0 lints / 83 tests PASS; Updating dependencies 0; Move.lock sin delta; scripts 99 PASS; check 0 despliegues; npm ci 293; 292 firmas; 0 vulnerabilidades de producción; lint 0 / typecheck 0 / 915 tests en 57 archivos; index-*.js 901.45 kB (273.61 kB gzip). Cero delta; sin fallback |`

El mensaje de commit lo propone el MID (handoff §8): `chore: declare the Apache-2.0 license in the package manifests (#16)`.

---

## Revisión TASK-1: PASA

Revisión del MID (2026-11-04) contra `documents/ESTANDARES.md` y el handoff v1.1 §3-§7. El diff lo leí yo con
`git diff`, no lo tomé del reporte: 4 archivos, +5/−0, y coincide línea por línea con lo reportado.

### Checklist
- [x] **Implementa lo pedido, ni más ni menos:** `license = "Apache-2.0"` en `[package]` de `contracts/Move.toml`, después
      de `edition`; `"license": "Apache-2.0",` en `package.json` y `app/package.json`, después de `"private": true,`.
      Sin `author`, sin `version`, sin reordenar nada. HU del task cumplida.
- [x] **Lock (SEG-8):** `package-lock.json` +2/−0, solo en `packages[""]` y `packages["app"]`. Las versiones,
      `resolved`, `integrity` y entradas no cambian. El exit code de `npm install --package-lock-only` está pegado.
- [x] **Contracts (PROY-11, PROY-18, LIM-9):** con la forma canónica:
      - build con `exit=0` y su log pegado, sin `| tee` (MINOR-1 de la v1.1);
      - 0 warnings y 0 lints;
      - 83 tests (26 + 57), igual que en STATUS;
      - `Updating dependencies` da 0 y `Move.lock` no tiene delta, así que no hubo repin (N-3 no ocurrió);
      - scripts 99 PASS y `check` con 0 despliegues.
      Cero delta contra la §0. El fallback §3.4 no aplica, porque la CLI no avisó.
- [x] **App (PROY-18):** los 7 steps del job, en orden y con exit 0:
      - `npm ci` instala 293 paquetes;
      - 292 firmas verificadas;
      - 0 vulnerabilidades de producción (las 11 *moderate* de dev son #35, ya conocidas);
      - lint 0 y typecheck 0;
      - 915 tests en 57 archivos;
      - `index-*.js` de 901.45 kB (273.61 kB gzip).
      Cero delta. El árbol queda con solo los 4 archivos del task.
- [x] **Licencia (D-20261030-14):** los 4 `.move` llevan el header SPDX (lo re-verifiqué: 4 de 4) y no hay "Your
      Project" en `contracts/`.
- [x] **SEG-3, §R-1, §R-3:** el diff y el reporte no tienen hex de 40-64, claves, rutas personales ni `0x…`. El reporte
      usa `<repo>` y `<scratchpad>`. Lo de `~/.sui/sui_config/` quedó en `stat`/`ls`, sin cambios.
- [x] **Desviaciones declaradas:** el lock se regeneró una segunda vez para pegar el exit code real. Queda justificado y
      sin efecto: `up to date` y el mismo +2/−0.
- [x] **Docs (PROY-20):** no aplica (metadatos). El snippet de STATUS se usa en TASK-4.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno bloqueante | — |

Observación, sin acción del DEV: este archivo terminaba con un separador `=====` suelto (no lo escribió el DEV). Lo
reemplacé por esta sección.

### Siguiente paso: **TASK-2 autorizado**
- Baseline: el mismo de la §0. TASK-2 solo toca `README.md`, así que no lleva gates de código.
- Como el fallback §3.4 no se aplicó, la sección "Licencia" del README **no** lleva la línea sobre el manifest de la CLI.
- Se aplica tal cual §3 de TASK-2 en la v1.1:
  - 2 placeholders en ítem de lista, cada uno en un solo renglón (§R-2: 2 y 2);
  - todo `#N` y `PR #N` enlazado (§R-8), salvo el literal del placeholder;
  - comisión `D-20261103-01 ([PR #48](…))` (§R-5);
  - sin Docker ni `Dockerfile`;
  - las secciones 9-11 con "Pendiente de TASK-3" (3).
- **N-2** queda anotado para el orquestador al mergear el PR principal.

### Mensaje de commit propuesto
```
chore: declare the Apache-2.0 license in the package manifests (#16)

Add license = "Apache-2.0" to contracts/Move.toml and "license": "Apache-2.0"
to package.json and app/package.json (D-20261030-14). The lockfile only gains
the two matching lines. The Sui CLI 1.83 manifest ignores the field without
warnings and its manifest digest covers dependencies only, so Move.lock is
unchanged. Contracts and app gates show zero delta. Includes the TASK-1 report
and the MID review.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
