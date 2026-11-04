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

## TASK-2

## Task completado: HANDOFF_README — TASK-2

### Branch (con SHA corto del HEAD)
`feature/issue-16-readme` @ `3776c3d` (commit de TASK-1). `README.md` sin commitear.

### Archivos modificados/creados
- `README.md`: reescrito entero, +130 / −67. No queda nada del texto de 2025-03.
- Sin cambios de código, así que no corrí gates de código (handoff §5).
- El script del check de enlaces vive en `<scratchpad>/linkcheck/check-links.mjs` y no se commitea.

### Qué se implementó (3 líneas máx)
README en español en el orden de §3:
- título, `> [!WARNING]` literal, qué es, reglas, jugar en testnet con los 2 placeholders, arquitectura, estructura, desarrollo local, documentación y licencia;
- 9-11 con "Pendiente de TASK-3".

Enlaza a los READMEs de área y a `agents.md`, sin copiar sus tablas. No menciona Docker ni nada de #14/#15. La licencia no lleva la línea del fallback.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. Sin cambios de código, así que no hubo gates de contracts ni de app.
- Contracts / App: no aplica.
- Tablas de contrato y `app/src/sui/`: no aplica.

**§R-2 (placeholders):**
```
$ grep -c "se completa después de #8" README.md
2
$ tr -s '\n' ' ' < README.md | grep -o "se completa después de #8" | wc -l
2
$ grep -n "se completa después de #8" README.md
36:- **URL pública:** se completa después de #8.
47:- **IDs de testnet** (`packageId`, `houseId`): en `contracts/deployments/testnet.json`; se completa después de #8.
```

**§R-3 sobre `README.md`:**
```
$ grep -nE '[0-9a-fA-F]{40,64}' README.md; echo "e1=$?"
e1=1
$ grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' README.md; echo "e2=$?"
e2=1
$ grep -nE '0x[0-9a-fA-F]{8,}' README.md; echo "e3=$?"
e3=1
```

**§R-4 (check de enlaces)**, con el prefijo §R-6 (`v26.13.0`):
```
$ node <scratchpad>/linkcheck/check-links.mjs <repo>; echo "exit=$?"
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/18 (texto nombra #18)
OK   contracts/README.md#límites-de-apuesta (ancla encontrada)
OK   contracts/README.md#flujo-de-fondos (ancla encontrada)
OK   contracts/README.md#comisión (ancla encontrada)
OK   200 https://github.com/sdelvalle57/sui_battleship/pull/48 (texto nombra #48)
OK   contracts/README.md#estados (ancla encontrada)
OK   contracts/README.md#objeto-terminal-y-storage-d-20261030-15-d3 (ancla encontrada)
OK   app/README.md#wallet (ancla encontrada)
OK   200 https://faucet.sui.io/
OK   200 https://docs.sui.io/guides/developer/getting-started/get-coins
OK   app/README.md#mis-partidas-13 (ancla encontrada)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/51 (texto nombra #51)
OK   app/README.md#límite-sin-indexador (ancla encontrada)
OK   contracts/README.md#battleshiphouse (ancla encontrada)
OK   contracts/README.md#battleshipgame (ancla encontrada)
OK   app/README.md (archivo)
OK   agents.md#4-arquitectura-de-runtime (ancla encontrada)
OK   agents.md#2-repositorio-monorepo (ancla encontrada)
OK   200 https://github.com/MystenLabs/suiup
OK   agents.md#3-comandos-por-área-sin-makefile (ancla encontrada)
OK   app/README.md#scripts (ancla encontrada)
OK   agents.md#app-app (ancla encontrada)
OK   contracts/README.md#uso-en-localnet (ancla encontrada)
OK   app/README.md#localnet (ancla encontrada)
OK   agents.md#localnet-aislada-smokes (ancla encontrada)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/14 (texto nombra #14)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/15 (texto nombra #15)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/14 (texto nombra #14)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/15 (texto nombra #15)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/14 (texto nombra #14)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/15 (texto nombra #15)
OK   contracts/README.md (archivo)
OK   app/README.md (archivo)
OK   agents.md (archivo)
OK   agents.md#14-mapa-de-documentación (ancla encontrada)
OK   documents/FLUJO_AGENTES.md (archivo)
OK   documents/ESTANDARES.md (archivo)
OK   documents/DECISIONES.md (archivo)
OK   documents/STATUS.md (archivo)
OK   LICENSE (archivo)
OK   §R-8: #N sueltos fuera de enlaces y del placeholder = 0
RESULTADO: todos OK
exit=0
```

El script sigue los pasos 1-6 de §R-4:
- ignora los bloques de código;
- el slug sigue la regla de GitHub de §R-4.3, con `-1`, `-2`… para los repetidos;
- `curl -sS -o /dev/null -w '%{http_code}' -L`;
- en §R-8, el texto del enlace a un issue o PR tiene que nombrar el mismo `N`, y después borra el literal del placeholder y los enlaces válidos y busca `#[0-9]+`.

**Las anclas de §R-4, todas, también las que el README no usa:** con el mismo script corrido sobre un README sintético con las 25 anclas listadas, salen 25 `OK`. Incluye `#autorización` y `#autorización-1`, `#retiro-de-comisiones`, `#despliegues-7`, `#uso-en-testnet-solo-el-owner` y `app/README.md#testnet`, y `RESULTADO: todos OK`. Mi slug reproduce la lista del handoff.

**Prueba negativa del script:** le agregué a una copia `Ver #99`, `[x](app/README.md#no-existe)` y `[#5](…/issues/6)`:
```
FAIL app/README.md#no-existe (ancla AUSENTE)
FAIL 200 https://github.com/sdelvalle57/sui_battleship/issues/6 (texto NO nombra #6)
FAIL §R-8: #N sueltos fuera de enlaces y del placeholder = 2 #99 #5
RESULTADO: 3 FAIL
neg-exit=1
```

**§R-5:**
```
$ for d in $(grep -oE 'D-[0-9]{8}-[0-9]+' README.md | sort -u); do grep -q "^### $d " documents/DECISIONES.md && echo "OK $d" || echo "AUSENTE $d"; done
AUSENTE D-20261103-01
OK D-20261103-03
$ grep -n 'D-20261103-01 (\[PR #48\]' README.md
27:  D-20261103-01 ([PR #48](https://github.com/sdelvalle57/sui_battleship/pull/48)); la vigente la muestra la app.
```
Solo sale `AUSENTE D-20261103-01`, y está escrito con `(PR #48)` enlazado, en el mismo renglón.

**Resto de §5:**
```
$ grep -c "Pendiente de TASK-3" README.md
3
$ grep -niE '2 vs 2|escrow|pooled|GitHub Pages' README.md
61:  cancela, se rechaza o se resuelve. Sin módulo Escrow ([`battleship::game`](contracts/README.md#battleshipgame)).
$ grep -niE 'docker|railway|hosting|tests? PASS|kB' README.md; echo "exit=$?"
exit=1
$ grep -n -m3 -E '^(> \[!WARNING\]|## )' README.md
5:> [!WARNING]
9:## Qué es
17:## Reglas del MVP
$ git status --porcelain --untracked-files=all
 M README.md
```
- La única coincidencia del grep del texto viejo es la frase "Sin módulo Escrow" de la sección 6, que el handoff permite.
- El aviso es literal y va en la línea 5, después del título (1) y de la línea de la sección 1 (3), antes del primer `##`.
- Ningún renglón pasa de 120 caracteres. `awk length` marca dos, pero cuenta bytes: los caracteres multibyte (`⌊`, `─`) los inflan, y en caracteres son 116 y 114.

**Trazabilidad (regla o número del README → fuente):**

| README | Fuente |
|---|---|
| 1 vs 1, coinflip de `sui::random` como placeholder, mecánica real en #18 | `agents.md` §1/§6:275; issue #18 "[Contracts] Diseñar la mecánica real de batalla naval que reemplace al coinflip" (OPEN) |
| Varias partidas a la vez, sin backend propio | `agents.md:221` (§4); un `Game` por partida, PROY-6 |
| Nadie juega contra sí mismo; abierta o invitación | `agents.md:269-270` (`ESelfInvite`); `contracts/README.md:209` |
| Límites 0,001 y 50 SUI, los cambia el admin, se aplican al crear | `contracts/sources/house.move:25-26` (`DEFAULT_MIN_BET`/`DEFAULT_MAX_BET`); `agents.md:255`; `contracts/README.md:131-135` |
| Aceptar iguala exactamente; solo el invitado; misma transacción | `agents.md:255-257, 269, 275`; D-20261030-16 |
| `fee = ⌊pozo × fee_rate / 10 000⌋`, pozo = 2 × apuesta, hacia abajo, resto al ganador | `contracts/sources/game.move:28` (`BPS_DENOMINATOR` `u128`), `:238`; `contracts/README.md:315-321`; D-20261030-16 D2/D3 |
| Máximo 10 % (1000 bps) | `contracts/sources/house.move:22` (`MAX_FEE_BPS`) |
| Copia la comisión al crearse; ganador `pozo − fee` | `contracts/README.md:315`; `agents.md:261-266` |
| 200 bps (2 %) en testnet | D-20261103-01 (3), en la branch de #8 (PR #48); handoff "Decisiones vigentes" |
| Cancelar y rechazar: 100 % al creador, sin comisión, sin expiración | `agents.md:271-272`; `contracts/README.md:290-296` |
| Estados pendiente → cancelada o resuelta | `agents.md:267`; `contracts/README.md:191-203` |
| Depósito de storage que no se recupera (sin cifras) | `contracts/README.md:389`; D-20261030-15 D3 |
| Slush la ofrece la app en testnet | `app/src/sui/dappKit.ts:14-15` (solo en localnet se pasa `slushWalletConfig: null`) |
| Faucet | `https://docs.sui.io/guides/developer/getting-started/get-coins`, que enlaza a `https://faucet.sui.io/` (los dos dan 200) |
| `#/my-games`, abrir por ID, Suiscan | `app/src/App.tsx:31`; `app/src/pages/MyGamesPage.tsx:36` ("Abrir partida por ID", D-20261103-03); `app/README.md:59` (Suiscan) |
| ≈ 14,6 días, seguimiento #51 | D-20261103-03; `agents.md:228`; issue #51 (OPEN) |
| Diagrama y capas | `agents.md` §4 (212-228); `contracts/README.md:25-26, 167-169`; `app/README.md:3-4` |
| Árbol de primer nivel | `agents.md` §2 (24-60) |
| Node 26, npm 11, `EBADENGINE` | `.nvmrc` = 26; `app/README.md:9-11`; STATUS → Toolchain |
| Sui CLI 1.83.0 = CI | `.github/workflows/ci.yml:22` (`SUI_VERSION: "1.83.0"`); STATUS → Toolchain |
| Aviso de la clave de la CLI | `agents.md` §3 (prerrequisito); STATUS H11 |
| Localnet aislada, nunca `sui start` a secas | `contracts/README.md:604-605`; `agents.md` §3 "Localnet aislada" |
| Apache-2.0, titular `sdelvalle57` | `LICENSE`; D-20261030-14 |

**Comandos del README → dónde existen tal cual:**
- `nvm use`: `agents.md` §3 (App) y `app/README.md:9`.
- `suiup install sui@testnet-1.83.0`: `documents/PLAN_README.md:58`. Sintaxis verificada con `suiup install --help` (suiup 0.1.1: "e.g. ... 'sui@testnet-1.39.3'"). No está en `agents.md` §3 ni en `contracts/README.md` (desviación 4).
- `cd contracts` + `printf 'n\n' | sui move build -e testnet` / `… sui move test -e testnet`: `agents.md:76` ("`cd contracts && printf 'n\n' | sui move …`"). Las formas cortas son las de §3 del handoff; las de `agents.md:80, 82` llevan además `--warnings-are-errors`, y el README enlaza ese gate completo.
- `npm ci`: `agents.md:196`.
- `npm test -w app`: `agents.md:201`; `app/package.json` → `scripts.test`.
- `VITE_SUI_NETWORK=localnet npm run dev -w app`: `app/README.md:36, 46`; `agents.md` §3 ("`npm run dev -w app` con `VITE_SUI_NETWORK`"); `app/package.json` → `scripts.dev`.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: según el handoff §6, la guía se ejercita en #17. Sin localnet, sin navegador, sin ningún `sui` y nada contra testnet. Lo único que corrí fue `curl` de solo lectura para el check de enlaces, y `gh issue view` / `gh pr view` de #8, #14, #15, #18, #48 y #51 para confirmar que existen y su tipo.

### Desviaciones del handoff
1. **Qué cambió:** las secciones 9-11 dicen `Pendiente de TASK-3 (después de [#14](…/issues/14) y [#15](…/issues/15)).`, con los issues enlazados y cortadas en dos renglones después del primer enlace, en vez del literal `(después de #14 y #15).`.
   - **Por qué:** el literal de §3 deja `#14` y `#15` sueltos, y eso es `FAIL` en §R-8 / §R-4.5, que solo exceptúa `se completa después de #8`. Además, con las URLs el renglón pasaba de 120 columnas.
   - **Verificación:** `grep -c "Pendiente de TASK-3"` = 3, porque la frase queda entera en el primer renglón; §R-4 da `OK` en las 6 URLs (2xx) y en §R-8. TASK-3 reemplaza estas líneas.
2. **Qué cambió:** en Contratos los comandos llevan `printf 'n\n' |` delante (`printf 'n\n' | sui move build -e testnet`), en vez de `sui move build -e testnet` a secas.
   - **Por qué:** es la guarda de H11 que el mismo README recomienda en Requisitos, y es la forma de `agents.md:76`.
   - **Verificación:** lista de comandos de arriba.
3. **Qué cambió:** "Localnet + app" no copia los comandos de génesis, arranque y publicación. Va en dos pasos en prosa (`SUI_CONFIG_DIR=<dir>/net`, publicación con el script y `VITE_SUI_NETWORK=localnet npm run dev -w app`) con enlaces a `contracts/README.md#uso-en-localnet`, `app/README.md#localnet` y `agents.md#localnet-aislada-smokes`.
   - **Por qué:** es la regla "enlaza, no copia" del plan y LIM-5. La variante corta ya vive en `contracts/README.md` y una copia se desincronizaría.
   - **Verificación:** las tres anclas dan `OK`.
4. **Qué cambió:** el comando `suiup install sui@testnet-1.83.0` sale del handoff y del plan, no de `agents.md` §3.
   - **Por qué:** ninguna de las tres fuentes que lista §5 trae un comando de instalación.
   - **Verificación:** `suiup install --help` (suiup 0.1.1) acepta `sui@testnet-<versión>`. No instalé nada.
5. **Qué cambió:**
   - en el diagrama, `Random (objeto del sistema)` en lugar de `0x8 Random`;
   - en "SUI de testnet", el enlace directo al faucet (`faucet.sui.io`) y además la página de docs.sui.io que explica cómo obtenerlos.
   - **Por qué:** en el diagrama, para no meter ninguna dirección de objeto en el README (§R-1). En el faucet, docs.sui.io enlaza a `https://faucet.sui.io/`, así que la URL es estable y no está inventada.
   - **Verificación:** los dos dan 200 y §R-3 sale vacío.
6. El fallback de licencia **no** se aplicó, porque TASK-1 no lo necesitó: "Licencia" es solo `[Apache-2.0](LICENSE). Titular: \`sdelvalle57\`.`

### Riesgos / pendientes
- La desviación 1 va contra el literal de §3: el MID decide si la acepta o si prefiere relajar §R-8 para esa línea.
- Cuando TASK-3 cambie el texto de 9-11 hay que volver a correr §R-4, por los enlaces a #14 y #15.
- Los dos placeholders siguen hasta TASK-5 (#8). Hoy dan 2 y 2.
- N-2 sigue vigente para el merge del PR principal (ver TASK-1).

### Documentación
- READMEs / `agents.md` actualizados: este task es el README raíz. `agents.md` §14 (la fila de `README.md` que dice "roadmap original (2025-03)") queda para TASK-4, como dice el handoff.
- Snippet propuesto para `documents/STATUS.md`:
  `| docs @ feature/issue-16-readme (TASK-2 de #16), 2026-11-04 | README.md raíz | 🟢 reescrito en español: aviso [!WARNING], qué es, reglas del MVP, jugar en testnet (2 placeholders hasta #8), arquitectura, estructura, desarrollo local, documentación y licencia; 9-11 pendientes de TASK-3. §R-2 2/2, §R-3 vacío, §R-4 41 OK (anclas de §R-4 verificadas), §R-5 solo D-20261103-01 (PR #48). Sin cambios de código |`

El mensaje de commit lo propone el MID (handoff §8): `docs: rewrite the root README with the 1 vs 1 vision, rules and local guide (#16)`.

---

## Revisión TASK-2: PASA

Revisión del MID (2026-11-04) contra `documents/ESTANDARES.md` y el handoff v1.1, TASK-2 §3-§7. Leí `README.md` entero en
el árbol, no en el reporte. `git status`: solo `README.md` (más este archivo).

### Checklist
- [x] **Lo pedido, ni más ni menos.** Orden de §3: título, aviso, qué es, reglas, jugar en testnet, arquitectura,
      estructura, desarrollo local, 9-11 pendientes, documentación y licencia. En español (D-20261104-04 (3)), sin texto de
      2025. No adelanta nada de #14/#15 (sin Docker, Railway, panel ni hosting). HU del task cumplida.
- [x] **Aviso.** `> [!WARNING]` literal en `README.md:5-7`, antes del primer `##`.
- [x] **Reglas (fondos y authZ descritos sin cambiar nada).** Coinciden con el código y las decisiones:
      - fórmula de la comisión, redondeo hacia abajo y máximo de 1000 bps (`README.md:24-27`);
      - apuesta exacta y solo el invitado acepta (`:22-23`);
      - 100 % al creador y sin expiración (`:28-29`);
      - estados (`:30`);
      - costos sin cifras, con enlace (`:31-32`), según la sugerencia 2 del plan.
      La trazabilidad del reporte cubre cada número.
- [x] **Placeholders (§R-2).** `:36` y `:47`, cada uno entero en un renglón y como ítem de lista: 2 y 2.
- [x] **Comisión de testnet (§R-5).** `D-20261103-01 ([PR #48](…))` en `:27`. El único `AUSENTE` es el permitido.
- [x] **LIM-5.** Ninguna tabla copiada:
      - el árbol es de primer nivel y enlaza `agents.md` §2;
      - 2 comandos de contratos y 3 de la app, con el gate enlazado;
      - localnet en prosa, con enlaces (desviación 3).
- [x] **SEG-3, §R-1, §R-3.** Sin hex de 40-64, `0x…`, claves ni rutas personales. `<dir>` como placeholder. `Random`
      sin dirección (desviación 5).
- [x] **Enlaces (§R-4, §R-8).**
      - 41 `OK`: anclas, archivos y URLs externas con 200;
      - 0 `#N` sueltos;
      - las 25 anclas del handoff reproducidas;
      - la prueba negativa da 3 `FAIL` y `exit=1`, así que el script detecta lo que tiene que detectar.
- [x] **Resto de §5.** `Pendiente de TASK-3` = 3. Lo único del texto viejo es "Sin módulo Escrow" (`:61`), que está
      permitido. Sin conteos, tamaños ni Docker.
- [x] **Desviaciones declaradas y justificadas** (decisiones abajo).

### Decisión sobre las desviaciones
> Decisión (2026-11-04, MID): **desviación 1 aceptada.** §R-8 (todo `#N` enlazado salvo el placeholder de #8) prevalece
> sobre el literal de §3, que se escribió antes de §R-8. El criterio de §3 sigue verificable
> (`grep -c "Pendiente de TASK-3"` = 3, con la frase entera en el primer renglón). No se relaja §R-8: una excepción más
> le resta valor al check, y TASK-3 borra esas líneas igual.

Las desviaciones 2-5 también quedan **aceptadas**:
- **2:** el `printf 'n
' |` es la forma de `agents.md` §3 y la guarda H11 que el propio README recomienda.
- **3:** aplica "enlaza, no copia".
- **4:** la sintaxis `sui@testnet-<versión>` está verificada con `suiup install --help`.
- **5:** sin dirección de objeto en el diagrama; el faucet es la URL a la que enlaza docs.sui.io, con 200.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| H-1 | Plan, decisión "versiones con su fuente"; handoff TASK-2 §3, Requisitos | `README.md:88` | "la misma de la CI" no dice dónde está fijada la versión. El handoff pedía "la de `SUI_VERSION` en `.github/workflows/ci.yml` y STATUS → Toolchain". Quien suba la CLI no sabe qué mirar. No es bloqueante | **En TASK-3**, que reescribe Requisitos de todas formas (Docker): "la de `SUI_VERSION` en [`.github/workflows/ci.yml`](.github/workflows/ci.yml)" (el check de §R-4 la valida) |
| H-2 | LIM-1 (naming honesto), NIT | `README.md:112` | El texto del enlace `[app](agents.md#app-app)` no dice adónde lleva | **En TASK-3:** `[agents.md §3, App](agents.md#app-app)` |

Los dos se corrigen en TASK-3 y no bloquean este task: el README no se mergea antes de TASK-3.

### Siguiente paso
- **TASK-2 aprobado.**
- TASK-3 y TASK-4 siguen en **NO EMPEZAR** hasta que se cumpla su precondición (PRs de #14 y #15 `MERGED`, `master`
  traído con un merge commit, y el baseline nuevo en la §0).
- TASK-3 incorpora H-1 y H-2, vuelve a correr §R-4 completo y reemplaza las líneas de la desviación 1.

### Mensaje de commit propuesto
```
docs: rewrite the root README with the 1 vs 1 vision, rules and local guide (#16)

Replace the 2025 README (2 vs 2, Escrow module, pooled objects) with the real
MVP, in Spanish: testnet warning, what the game is, rules (limits, exact bet,
fee formula and rounding, refunds, states), how to play on testnet with two
placeholders until #8, architecture, top-level layout, local development and
the license. It links to the area READMEs instead of copying their tables
(LIM-5). Deploy, House admin and roadmap wait for #14 and #15 (TASK-3).
Includes the TASK-2 report and the MID review.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
