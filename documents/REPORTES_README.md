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

---

## TASK-3

## Task completado: HANDOFF_README — TASK-3

### Branch (con SHA corto del HEAD)
`feature/issue-16-readme` @ `764bf06` (handoff v1.2). `README.md` sin commitear.

### Archivos modificados/creados
- `README.md`: +58 / −9. No toqué nada más.
- El script del check de enlaces sigue en `<scratchpad>/linkcheck/check-links.mjs`, el mismo de TASK-2, y no se commitea.

### Qué se implementó (3 líneas máx)
- **Secciones nuevas:** 9 (Despliegue: contratos por el owner, app en Railway), 10 (Administración de la House con los textos de `master`) y 11 (Roadmap: tabla `Fase | Issue | Tema | Estado` con corte al 2026-11-04 y #60 en post-MVP).
- **Secciones 7 y 8:** `Dockerfile` y `.dockerignore` en el árbol; Docker como requisito opcional.
- **Revisión de TASK-2:** H-1 y H-2 corregidos. Las 3 líneas "Pendiente de TASK-3" quedaron borradas.

### Precondición (output pegado)
```
$ gh pr view 57 --json state --jq .state
MERGED
$ gh pr view 59 --json state --jq .state
MERGED
$ timeout 60 git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch -q https://github.com/sdelvalle57/sui_battleship.git master:refs/remotes/origin/master; echo "fetch-exit=$?"
fetch-exit=0
$ git rev-parse --short origin/master
5e51356
$ git merge-base --is-ancestor origin/master HEAD; echo "exit=$?"
exit=0
$ git log --oneline --merges -5
7766126 Merge master into feature/issue-16-readme (#14, #15)
5e51356 Merge pull request #57 from sdelvalle57/feature/issue-15-pages-deploy
d131f44 Merge remote-tracking branch 'origin/master' into feature/issue-15-pages-deploy
612821b Merge pull request #61 from sdelvalle57/chore/housekeeping-issue-14
b35cb2d Merge pull request #59 from sdelvalle57/feature/issue-14-house-admin
```
El `git fetch origin` por SSH lo reemplacé por el fetch HTTPS con `gh`, como indicó el orquestador.

### Insumos re-confirmados en `master` `5e51356`
| Insumo | Confirmado en |
|---|---|
| Ruta `#/admin` | `app/src/App.tsx:32` (`{ path: 'admin', element: <HouseAdminPage /> }`) |
| Enlace "Administrar House", solo si se sabe que la cuenta tiene el cap | `app/src/components/Header.tsx:20` (`{isAdmin && <Link to="/admin">Administrar House</Link>}`), `:9-10`; título en `app/src/pages/HouseAdminPage.tsx:50` |
| "Sin permisos: esta cuenta no tiene el HouseCap de esta House." + "Volver a comprobar" | `app/src/pages/HouseAdminPage.tsx:7, :28`; D-20261104-02 (1) |
| Comisión en bps enteros 0..1000 con %, sin diálogo extra, resumen "De X a Y" | D-20261104-02 (2) y (3); `app/README.md`, "Panel de la House (#14)" → Acciones |
| Cada partida copia la comisión; los límites solo se aplican al crear | `app/README.md`, "Panel de la House (#14)", avisos fijos; D-20261030-06 §3 |
| Retiro total, a la cuenta que firma | D-20261104-02 (5); `app/README.md`, "Panel de la House (#14)" → Retiro |
| `migrate` y `transfer_house_cap` solo por CLI, transferir es irreversible | `app/README.md`, "Panel de la House (#14)" → "Solo por CLI"; `contracts/README.md`, "Qué pasa si se pierde el cap" |
| Railway con `Dockerfile` en la raíz; conectar y publicar es del owner | `app/README.md:67-71`; D-20261104-03 (1); `Dockerfile:1` |
| `.dockerignore` como lista blanca | `.dockerignore:1-3` |
| Docker opcional para verificar la imagen | `app/README.md:169-172` ("Requiere `bash`, `docker`, `curl`…") |
| Contratos: publicación solo del owner | `contracts/README.md`, "Uso en testnet (solo el owner)"; issue #8 |
| D-20261103-01 sigue fuera de `master` | `grep "^### D-20261103-01" documents/DECISIONES.md` → exit 1, así que se mantiene `(PR #48)` |

**Estados del roadmap**, re-medidos con `gh api` (output completo):
```
$ gh api 'repos/sdelvalle57/sui_battleship/issues?state=all&per_page=100' --jq '.[] | [.number, .state, .title] | @tsv'
61	closed	docs: housekeeping after #14 merge
60	open	[App] Panel de la House: releer la House antes de firmar para no revertir un cambio concurrente
59	closed	Add the House admin panel for the HouseCap holder: fee, bet limits and fee withdrawal (#14)
58	open	[App] Medir y aplicar code-splitting del bundle de testnet (post-MVP)
57	closed	#15: Railway deploy of the testnet app (Dockerfile, Caddy, image check job)
56	open	[App] Extraer sdkVersion() y plain() de los scripts de captura a un módulo compartido
55	closed	docs: housekeeping after #13 merge
54	open	[App] "Actualizar" de Mis partidas deshabilitado con una transacción de la cuenta en curso
53	open	[App] Unificar en `eventScan.ts` el bucle de página de eventos duplicado entre el lobby y "Mis partidas"
52	closed	Show my games and received invitations with per-row actions; sign with the captured account (#13)
51	open	[App] Mostrar en las listas de testnet el historial completo, más allá de la ventana de ~14,6 días del fullnode
50	closed	docs: housekeeping after #12 merge
49	closed	Accept games with the on-chain coinflip and a verified result; global transaction lock (#12)
48	open	#8: first testnet publication (owner) — prerequisites, runbook and verification
47	closed	docs: housekeeping after #11 merge
46	closed	Create, cancel and reject games from the app: shared transaction machinery (#11)
45	closed	docs: housekeeping after #10 merge
44	closed	Lobby and game detail: exact BCS reads, bounded paging and shared retry policy (#10)
43	closed	docs: housekeeping after #39 merge
42	closed	#39: publish script guards before #8 (--out on testnet, config path in errors)
41	closed	docs: housekeeping after #9 merge
40	closed	docs: housekeeping after #7 merge
39	closed	contracts: rechazar --out en testnet y ocultar la ruta en errores de fs del script de publicación (seguimiento #7)
38	closed	#7: deployments json, guarded publish script and CI check
37	closed	[no merge] app CI red check (#9)
36	closed	App scaffolding: Vite + React + TS strict, Sui SDK, wallet kit and CI job (#9)
35	open	app: subir eslint/typescript-eslint cuando dependan de minimatch ≥ 11.0.1 (GHSA-g3hv-75wg-m249)
34	closed	docs: register decisions for #7 and #9
33	closed	docs: housekeeping after #6
32	closed	Game: accept with on-chain coinflip, fee and payout (#6)
31	closed	docs: housekeeping after #5
30	closed	Game: create, cancel and reject with refund invariant (#5)
29	closed	docs: housekeeping after #3
28	closed	[no merge] CI red check (#3)
27	closed	ci: contracts workflow with build, lint and test gates (#3)
26	closed	chore: license the repo under Apache-2.0 (D-20261030-14)
25	closed	docs: housekeeping after #4 (D-20261030-12)
24	closed	House: HouseCap authZ, bet limits, add_fees, events, versioning and tests (#4)
23	closed	docs: housekeeping after #2
22	closed	Monorepo: Move package in contracts/, legacy retired, npm root with Node 26 (#2)
21	closed	docs: housekeeping after #1 and orchestrator merges (D-20261030-09)
20	closed	Toolchain: Sui CLI 1.83, manifest pinned and first gate baseline (#1)
19	closed	docs: adopt multi-agent workflow docs for Sui Battleship
18	open	[Contracts] Diseñar la mecánica real de batalla naval que reemplace al coinflip
17	open	[Docs] Ejecutar el smoke end-to-end del MVP en testnet con wallets reales y cerrar el MVP
16	open	[Docs] Actualizar el README con la visión 1 vs 1, la arquitectura del monorepo y la guía de uso
15	open	[CI] Desplegar la app como sitio estático apuntando a testnet
14	closed	[App] Agregar el panel de administración de la House para la cuenta que posee el HouseCap
13	closed	[App] Listar mis partidas y las invitaciones recibidas para la cuenta conectada
12	closed	[App] Aceptar partidas, disparar el coinflip y mostrar el resultado
11	closed	[App] Crear partidas abiertas o por invitación y cancelarlas, con UX de transacción y mapeo de abort codes
10	closed	[App] Mostrar el lobby de partidas abiertas y el detalle de una partida a partir de eventos y objetos
9	closed	[App] Crear el scaffolding de app/ con Vite, React, TS estricto, SDK de Sui, wallet kit y la capa app/src/sui/
8	open	[Contracts] Publicar el paquete en testnet y registrar contracts/deployments/testnet.json
7	closed	[Contracts] Definir el formato de contracts/deployments/<red>.json y un script de publicación que lo genere
6	closed	[Contracts] Implementar la aceptación y la resolución por coinflip con sui::random, con pago al ganador y comisión
5	closed	[Contracts] Rediseñar battleship::game como un objeto compartido por partida con crear y cancelar
4	closed	[Contracts] Autorizar la administración de la House con HouseCap y completar límites, add_fees, eventos y tests
3	closed	[CI] Agregar el workflow de GitHub Actions con build y test del paquete Move
2	closed	[Tooling] Reestructurar el repo a monorepo con el paquete Move en contracts/ y retirar el código legado
1	closed	[Tooling] Instalar la Sui CLI con suiup, fijar el framework en Move.toml y registrar el primer baseline de gates
```

El listado de `issues` incluye PRs, así que confirmé el tipo de cada número del roadmap:
```
$ for n in 1 … 60; do gh api repos/sdelvalle57/sui_battleship/issues/$n --jq '"\(.number) \(.state) \(if .pull_request then "PR" else "issue" end) \(.state_reason // "-")"'; done
1 closed issue completed      2 closed issue completed      3 closed issue completed      4 closed issue completed
5 closed issue completed      6 closed issue completed      7 closed issue completed      8 open issue -
9 closed issue completed      10 closed issue completed     11 closed issue completed     12 closed issue completed
13 closed issue completed     14 closed issue completed     15 open issue -               16 open issue -
17 open issue -               18 open issue -               35 open issue -               39 closed issue completed
51 open issue -               53 open issue -               54 open issue -               56 open issue -
58 open issue -               60 open issue -
```
Los 26 números son issues (ninguno es PR).

Cómo asigné los estados:
- `closed` + `completed` da "Hecho".
- #8 y #17 están abiertos y esperan al owner o a #8, así que van como "Pendiente".
- #15 va como "En curso": PR #57 mergeado con `Refs #15`, y el cierre llega con TASK-6 de #15 después de #8.
- #16 va como "En curso".
- #18, #51, #53, #54, #56, #58, #60 y #35 son "Post-MVP".

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. Sin cambios de código, así que no corrí gates de contracts ni de app (handoff §0: "TASK-3 y TASK-4 solo tocan docs").
- Tablas de contrato y `app/src/sui/`: no aplica.

**Diff:**
```
$ git diff --stat
 README.md | 67 ++++++++++++++++++++++++++++++++++++++++++++++++++++++---------
 1 file changed, 58 insertions(+), 9 deletions(-)
```
```diff
@@ -73,6 +73,8 @@ sui_battleship/
 ├── agents.md             # guía técnica del repo: layout, comandos, arquitectura y reglas
+├── Dockerfile            # imagen de la app para Railway: build estático de testnet + Caddy
+├── .dockerignore         # contexto de esa imagen, como lista blanca
 ├── LICENSE               # Apache-2.0
@@ -85,8 +87,10 @@
-- **Sui CLI `1.83.0`**, la misma de la CI: `suiup install sui@testnet-1.83.0`, con
-  [suiup](https://github.com/MystenLabs/suiup).
+- **Sui CLI `1.83.0`**, la de `SUI_VERSION` en [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
+  `suiup install sui@testnet-1.83.0`, con [suiup](https://github.com/MystenLabs/suiup).
+- **Docker (opcional):** solo para verificar en local la imagen de Railway
+  ([verificar la imagen](app/README.md#verificar-la-imagen-appscriptscheck-deploy-imagesh)).
@@ -109,7 +113,7 @@
-El gate completo de la app está en [scripts](app/README.md#scripts) y en [app](agents.md#app-app).
+El gate completo de la app está en [scripts](app/README.md#scripts) y en [agents.md §3, App](agents.md#app-app).
@@ -125,18 +129,63 @@
 ## Despliegue
-Pendiente de TASK-3 (después de [#14](…/issues/14) y
-[#15](…/issues/15)).
+- **Contratos:** la publicación en testnet la hace solo el owner, con su propia config de la CLI
+  ([#8](https://github.com/sdelvalle57/sui_battleship/issues/8);
+  [uso en testnet](contracts/README.md#uso-en-testnet-solo-el-owner)).
+- **App:** sitio estático en Railway, construido con el `Dockerfile` de la raíz. Conectar el servicio y publicar es del
+  owner ([despliegue (Railway)](app/README.md#despliegue-railway), con el checklist en
+  [conectar Railway](app/README.md#conectar-railway-owner-no-delegable)). La URL pública está en "Jugar en testnet".

 ## Administración de la House
-Pendiente de TASK-3 (…)
+Quien tiene el `HouseCap` administra la House desde el panel de la app, en `#/admin`. El enlace "Administrar House" del
+encabezado aparece solo cuando se sabe que la cuenta conectada tiene el cap. Con otra cuenta, la página dice "Sin
+permisos: esta cuenta no tiene el HouseCap de esta House." y ofrece "Volver a comprobar".
+
+- **Comisión:** en bps enteros (0 a 1000), con el % al lado. Cada partida copia la comisión al crearse, así que las ya
+  creadas conservan la suya.
+- **Límites de apuesta:** mínimo y máximo en SUI. Solo se aplican a las partidas que se crean después.
+- **Retiro:** siempre el total de las comisiones acumuladas, a la cuenta que firma.
+- **Confirmación:** sin diálogo extra. Junto a cada botón va el resumen del cambio ("de X a Y") y después la ventana de
+  la wallet.
+- **Solo por CLI:** `migrate` y `transfer_house_cap`. Transferir el cap es irreversible
+  ([qué pasa si se pierde el cap](contracts/README.md#qué-pasa-si-se-pierde-el-cap)).
+
+Detalle en [panel de la House](app/README.md#panel-de-la-house-14), [autorización](contracts/README.md#autorización)
+y [retiro de comisiones](contracts/README.md#retiro-de-comisiones).

 ## Roadmap
-Pendiente de TASK-3 (…)
+Estado al 2026-11-04. El estado vivo está en los issues y en [`documents/STATUS.md`](documents/STATUS.md).
+
+| Fase | Issue | Tema | Estado |
+|---|---|---|---|
+| Contratos y tooling | [#1](https://github.com/sdelvalle57/sui_battleship/issues/1) | Sui CLI con `suiup`, framework fijado y primer baseline de gates | Hecho |
+| Contratos y tooling | [#2](…/issues/2) | Monorepo: paquete Move en `contracts/` y código legado retirado | Hecho |
+| Contratos y tooling | [#3](…/issues/3) | CI de GitHub Actions: build, lint y test del paquete Move | Hecho |
+| Contratos y tooling | [#4](…/issues/4) | House: `HouseCap`, límites, comisiones, eventos y tests | Hecho |
+| Contratos y tooling | [#5](…/issues/5) | Game: un objeto compartido por partida; crear, cancelar y rechazar | Hecho |
+| Contratos y tooling | [#6](…/issues/6) | Aceptar y resolver con `sui::random`: pago al ganador y comisión | Hecho |
+| Contratos y tooling | [#7](…/issues/7) | Formato de `contracts/deployments/<red>.json` y script de publicación | Hecho |
+| Contratos y tooling | [#39](…/issues/39) | Guardas del script de publicación antes de testnet | Hecho |
+| App | [#9](…/issues/9) | Base de `app/`: Vite, React, TypeScript estricto, SDK de Sui y wallet kit | Hecho |
+| App | [#10](…/issues/10) | Lobby de partidas abiertas y detalle de una partida | Hecho |
+| App | [#11](…/issues/11) | Crear partidas abiertas o por invitación; cancelar y rechazar | Hecho |
+| App | [#12](…/issues/12) | Aceptar, coinflip y resultado | Hecho |
+| App | [#13](…/issues/13) | Mis partidas e invitaciones recibidas | Hecho |
+| App | [#14](…/issues/14) | Panel de administración de la House | Hecho |
+| Testnet y cierre | [#8](…/issues/8) | Publicación del paquete en testnet (owner) y `testnet.json` | Pendiente |
+| Testnet y cierre | [#15](…/issues/15) | App en Railway: la imagen está lista; falta conectar y publicar | En curso |
+| Testnet y cierre | [#16](…/issues/16) | Este README | En curso |
+| Testnet y cierre | [#17](…/issues/17) | Smoke de punta a punta en testnet con wallets reales | Pendiente |
+| Post-MVP | [#18](…/issues/18) | Mecánica real de batalla naval en lugar del coinflip | Post-MVP |
+| Post-MVP | [#51](…/issues/51) | Historial completo en las listas de testnet, más allá de la ventana del fullnode | Post-MVP |
+| Post-MVP | [#53](…/issues/53) | Un solo bucle de páginas de eventos para el lobby y Mis partidas | Post-MVP |
+| Post-MVP | [#54](…/issues/54) | "Actualizar" de Mis partidas con una transacción de la cuenta en curso | Post-MVP |
+| Post-MVP | [#56](…/issues/56) | Módulo compartido para los scripts de captura de fixtures | Post-MVP |
+| Post-MVP | [#58](…/issues/58) | Code-splitting del bundle de testnet | Post-MVP |
+| Post-MVP | [#60](…/issues/60) | Panel de la House: releer la House antes de firmar | Post-MVP |
+| Post-MVP | [#35](…/issues/35) | Actualizar ESLint por el aviso de `minimatch` (solo desarrollo) | Post-MVP |
```
En este diff pegado acorté `…/issues/N` y las líneas borradas para que se lea mejor. En el archivo, cada URL está completa (`https://github.com/sdelvalle57/sui_battleship/issues/N`), como muestra el check de enlaces.

**§R-2:**
```
$ /usr/bin/grep -c "se completa después de #8" README.md
2
$ tr -s '\n' ' ' < README.md | /usr/bin/grep -o "se completa después de #8" | wc -l
2
$ /usr/bin/grep -n "se completa después de #8" README.md
36:- **URL pública:** se completa después de #8.
47:- **IDs de testnet** (`packageId`, `houseId`): en `contracts/deployments/testnet.json`; se completa después de #8.
```

**§R-3 sobre `README.md`:**
```
$ /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' README.md; echo "e1=$?"
e1=1
$ /usr/bin/grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' README.md; echo "e2=$?"
e2=1
$ /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' README.md; echo "e3=$?"
e3=1
```

**§R-5:**
```
$ for d in $(/usr/bin/grep -oE 'D-[0-9]{8}-[0-9]+' README.md | sort -u); do /usr/bin/grep -q "^### $d " documents/DECISIONES.md && echo "OK $d" || echo "AUSENTE $d"; done
AUSENTE D-20261103-01
OK D-20261103-03
$ /usr/bin/grep -n 'D-20261103-01 (\[PR #48\]' README.md
27:  D-20261103-01 ([PR #48](https://github.com/sdelvalle57/sui_battleship/pull/48)); la vigente la muestra la app.
```
#8 no mergeó, así que D-20261103-01 conserva `(PR #48)`.

**Criterios de aceptación:**
```
$ /usr/bin/grep -c "Pendiente de TASK-3" README.md
0
$ /usr/bin/grep -niE 'GitHub Pages|hosting por definir' README.md; echo "exit=$?"
exit=1
$ /usr/bin/grep -niE '2 vs 2|escrow|pooled' README.md
61:  cancela, se rechaza o se resuelve. Sin módulo Escrow ([`battleship::game`](contracts/README.md#battleshipgame)).
$ /usr/bin/grep -niE 'tests? PASS|[0-9] kB|[0-9]+ tests' README.md; echo "exit=$?"
exit=1
$ git status --porcelain --untracked-files=all
 M README.md
```

**§R-4 completo, contra el `master` nuevo** (la branch ya contiene `5e51356`), con el prefijo §R-6 (`v26.13.0`):
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
OK   .github/workflows/ci.yml (archivo)
OK   200 https://github.com/MystenLabs/suiup
OK   app/README.md#verificar-la-imagen-appscriptscheck-deploy-imagesh (ancla encontrada)
OK   agents.md#3-comandos-por-área-sin-makefile (ancla encontrada)
OK   app/README.md#scripts (ancla encontrada)
OK   agents.md#app-app (ancla encontrada)
OK   contracts/README.md#uso-en-localnet (ancla encontrada)
OK   app/README.md#localnet (ancla encontrada)
OK   agents.md#localnet-aislada-smokes (ancla encontrada)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/8 (texto nombra #8)
OK   contracts/README.md#uso-en-testnet-solo-el-owner (ancla encontrada)
OK   app/README.md#despliegue-railway (ancla encontrada)
OK   app/README.md#conectar-railway-owner-no-delegable (ancla encontrada)
OK   contracts/README.md#qué-pasa-si-se-pierde-el-cap (ancla encontrada)
OK   app/README.md#panel-de-la-house-14 (ancla encontrada)
OK   contracts/README.md#autorización (ancla encontrada)
OK   contracts/README.md#retiro-de-comisiones (ancla encontrada)
OK   documents/STATUS.md (archivo)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/1 (texto nombra #1)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/2 (texto nombra #2)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/3 (texto nombra #3)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/4 (texto nombra #4)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/5 (texto nombra #5)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/6 (texto nombra #6)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/7 (texto nombra #7)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/39 (texto nombra #39)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/9 (texto nombra #9)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/10 (texto nombra #10)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/11 (texto nombra #11)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/12 (texto nombra #12)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/13 (texto nombra #13)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/14 (texto nombra #14)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/8 (texto nombra #8)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/15 (texto nombra #15)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/16 (texto nombra #16)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/17 (texto nombra #17)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/18 (texto nombra #18)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/51 (texto nombra #51)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/53 (texto nombra #53)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/54 (texto nombra #54)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/56 (texto nombra #56)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/58 (texto nombra #58)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/60 (texto nombra #60)
OK   200 https://github.com/sdelvalle57/sui_battleship/issues/35 (texto nombra #35)
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

**Re-verificación de anclas contra el `master` nuevo:** armé un README sintético con las 25 anclas de §R-4, más las 6 que agregan TASK-3 y el handoff v1.2:
- `contracts/README.md#qué-pasa-si-se-pierde-el-cap`;
- `app/README.md#panel-de-la-house-14`, `#despliegue-railway`, `#conectar-railway-owner-no-delegable` y `#verificar-la-imagen-appscriptscheck-deploy-imagesh`;
- `app/README.md#testnet`, que el README no usa.

Las 31 dan `OK` y el resultado es `RESULTADO: todos OK`, `exit=0`. El merge de #14 y #15 no rompió ninguna ancla (R-4 del ciclo).

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica: son docs y el smoke va en #17. No corrí localnet, ni navegador, ni ningún `sui`, ni nada contra testnet. Solo hice lecturas: `gh pr view`, `gh api`, el fetch HTTPS y los `curl` del check de enlaces.

### Desviaciones del handoff
1. **Qué cambió:** las 26 filas de la tabla del roadmap (líneas 163-188) pasan de 120 columnas: miden entre 127 y 171 caracteres. El resto del archivo queda en ≤ 120.
 - **Por qué:** una fila de tabla en Markdown no se puede partir en renglones, y §R-8 exige la URL completa en cada `#N`. No usé enlaces de estilo referencia (`[#1][i1]`) porque §R-8 y el paso 5 de §R-4 definen el enlace como `[…](https://…/issues/N)` inline.
 - **Verificación extra realizada:** §R-4 da `OK` en las 26 URLs, y el paso 5 da 0 `#N` sueltos.
2. **Qué cambió:** la sección 10 suma un enlace que el handoff no pide: `contracts/README.md#qué-pasa-si-se-pierde-el-cap`, junto a "Transferir el cap es irreversible".
 - **Por qué:** el aviso de irreversibilidad viene de `app/README.md` → "Solo por CLI", y ese texto remite justamente a esa sección. Es el único lugar con el checklist de transferencia.
 - **Verificación extra realizada:** el ancla da `OK`.
3. **Qué cambió:** en la sección 9 la URL no se repite ni se enlaza. Dice "La URL pública está en 'Jugar en testnet'", sin enlace interno.
 - **Por qué:** el handoff pide que la URL siga siendo el placeholder de la sección 5, y repetir el literal subiría §R-2 a 3. Un ancla interna del propio README (`#jugar-en-testnet`) no está en el alcance de §R-4.2, que verifica archivos destino.
 - **Verificación extra realizada:** §R-2 sigue en 2 y 2.
4. **Qué cambió:** el fetch de la precondición usa HTTPS con `gh auth git-credential` en vez de `git fetch origin`.
 - **Por qué:** el fetch por SSH cuelga en este entorno; así lo indicó el orquestador.
 - **Verificación extra realizada:** `origin/master` = `5e51356`, el mismo SHA que la §0 v1.2, y `merge-base --is-ancestor` da `exit=0`.

No hay desviaciones de alcance: #14 y #15 mergearon con la ruta (`#/admin`) y el hosting (Railway) que dice el handoff.

### Riesgos / pendientes
- **Roadmap:** los estados son una foto del 2026-11-04. Cuando cierren #8, #15, #16 y #17, el README queda viejo hasta que alguien lo actualice; el README remite a los issues y a `documents/STATUS.md` como estado vivo. TASK-5 podría actualizar la fila de #8 y la de #15.
- **TASK-5:** los dos placeholders siguen pendientes de #8 y de TASK-6 de #15, y D-20261103-01 conserva `(PR #48)` hasta que #8 mergee (§R-5).
- **N-2 (no delegable):** sigue vigente para el merge del PR principal, por las watch paths de Railway que tocó TASK-1.

### Documentación
- **READMEs / `agents.md` actualizados:** este task es el README raíz. `agents.md` §14 y STATUS quedan para TASK-4.
- **Snippet propuesto para `documents/STATUS.md`:**
`| docs @ feature/issue-16-readme (TASK-3 de #16), 2026-11-04 | README.md raíz | 🟢 Despliegue (contratos por el owner, app en Railway), Administración de la House (#/admin, "Administrar House", textos de master 5e51356) y Roadmap (corte 2026-11-04, estados por gh api, #60 post-MVP); Dockerfile/.dockerignore en el árbol; Docker opcional; H-1/H-2 de TASK-2 corregidos. §R-2 2/2, §R-3 vacío, §R-4 68 OK (31 anclas re-verificadas contra master), §R-5 solo D-20261103-01 (PR #48). Sin cambios de código |`

**Commit propuesto (handoff):** `docs: add deploy, House admin and roadmap to the root README (#16)`.

---

## Revisión TASK-3: PASA

Revisión del MID (2026-11-04) contra `documents/ESTANDARES.md` y el handoff v1.2, TASK-3. Leí el diff real con
`git diff -- README.md` (+58/−9; el árbol tiene solo `README.md` y este archivo) y lo contrasté con `master` `5e51356`.

### Checklist
- [x] **Lo pedido, ni más ni menos:**
      - sección 9: contratos por el owner y app en Railway, sin URL;
      - sección 10: panel `#/admin` con los textos literales de `master`
        (`HouseAdminPage.tsx:7`, `Header.tsx:20`) y las reglas de D-20261104-02 (1), (2), (3) y (5);
      - sección 11: roadmap con fecha de corte y puntero a STATUS;
      - `Dockerfile` y `.dockerignore` en el árbol;
      - Docker opcional;
      - H-1 y H-2 corregidos (`README.md:90`, `:116`);
      - 0 "Pendiente de TASK-3".
- [x] **Hechos:**
      - "cada partida copia la comisión" y "los límites solo se aplican al crear" coinciden con `agents.md` §6 y con
        D-20261030-06 §3;
      - "retiro total a la cuenta que firma" coincide con D-20261104-02 (5);
      - `migrate` y `transfer_house_cap` solo por CLI, y "es irreversible", coinciden con `contracts/README.md`, "Qué pasa
        si se pierde el cap" (desviación 2, abajo);
      - estados del roadmap: re-medidos con `gh api`, con el tipo de cada número verificado (26 issues, ningún PR).
- [x] **SEG-3 y fondos:** el retiro y la comisión se describen sin cambiar nada; la nota de irreversibilidad sirve para
      no perder fondos de la House. §R-3 vacío.
- [x] **LIM-5:** sin copiar el checklist de Railway ni la tabla del panel; las dos se enlazan.
- [x] **§R-2:** 2 y 2. **§R-4:** 68 `OK` y 31 anclas re-verificadas contra el `master` nuevo. **§R-8:** 0 sueltos.
      **§R-5:** solo D-20261103-01, con `(PR #48)`. Tampoco hay "GitHub Pages", "hosting por definir" ni cifras de
      tests o bundle.
- [x] **Desviaciones declaradas** (decisiones abajo).

### Decisión sobre las desviaciones
> Decisión (2026-11-04, MID): **desviación 1 aceptada.** Las filas de la tabla del roadmap pasan de 120 columnas. El
> corte a ~120 es una convención de estilo de los docs, no una regla de `ESTANDARES.md`, y una fila de tabla Markdown
> no se puede partir. Los enlaces de estilo referencia (`[#1][i1]`) acortarían las filas, pero agregarían 26
> definiciones al final y un segundo formato que §R-4 y §R-8 no cubren. Lo verifiqué: fuera de la tabla, ningún renglón
> pasa de 120 **caracteres**. `awk length` marca 5 porque cuenta bytes (`⌊`, `─`, `á`).

Las desviaciones 2-4 también quedan **aceptadas**:
- **2:** el enlace a "qué pasa si se pierde el cap" respalda la advertencia de irreversibilidad con su checklist.
- **3:** la URL no se repite en la sección 9, así que §R-2 queda en 2 y TASK-5 tiene un solo lugar que completar.
- **4:** el fetch por HTTPS con `gh` da el mismo `origin/master` (`5e51356`).

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

**Observación para TASK-5, sin acción ahora:** #8 figura como "Pendiente" aunque el PR #48 tiene el runbook y el
ensayo listos y solo espera la publicación del owner; el plan lo daba como "en curso". El criterio del DEV ("abierto y
esperando al owner") es coherente para #8 y #17, y TASK-5 lo pasa a "Hecho" de todos modos. TASK-5 también actualiza
la fila de #15.

### Siguiente paso: **TASK-4 autorizado**
Precondición cumplida: `master` con #14 y #15 en la branch y TASK-3 en PASA. Además de lo que ya está en TASK-4 del
handoff v1.2:
1. **Fila de #15 y fila "Siguiente" de STATUS:** en la branch (`764bf06`, con el STATUS de `5e51356`) **siguen sin
   registrar el merge de PR #57**: `STATUS.md:153` dice "PR #57 (`Refs #15`)" sin el merge, y `:154` dice "listo para
   pasar a ready" y no tiene #60. Se aplica la corrección condicional de v1.2:
   - #15 queda en 🚧 con "PR #57 mergeado (`5e51356`, `Refs #15`)" y pendientes TASK-6 (después de #8) y el
     checklist del owner;
   - "Siguiente": #8 (PR #48); #15 (TASK-6 después de #8); #16 (PR principal con `Refs #16`; TASK-5 después de #8);
     post-MVP con #60.
   Se declara como desviación acotada. Si el orquestador ya lo corrigió en `master` antes de que empiece TASK-4, no se
   toca.
2. **Baselines:** tres filas nuevas con los snippets de los reportes de TASK-1, TASK-2 y TASK-3.
   - La de TASK-1 dice "medido sobre `deaadbb` + TASK-1" (915 tests en 57 archivos), porque se midió antes de los
     merges.
   - Las de TASK-2 y TASK-3 dicen "Sin cambios de código".
   - No se inventa una medición sobre `5e51356`: la CI del PR principal es la que la da.
3. **Pendientes del usuario:**
   - revisar D-20261104-04 (tomada por delegación, D-20261104-01);
   - **N-2**: el merge del PR principal toca las watch paths de Railway, así que si Railway ya está conectado espera al
     owner;
   - después de #8, TASK-5 cierra #16.
4. **`agents.md`:** solo la fila de §14 (`agents.md:428`). Nada más, aunque §1 ("Foco actual (oct-2026)") esté viejo:
   eso queda fuera del alcance de #16.
5. Greps §R-3 sobre lo agregado a `agents.md` y STATUS, con el output pegado.

### Mensaje de commit propuesto
```
docs: add deploy, House admin and roadmap to the root README (#16)

Fill the three sections that waited for #14 and #15: deploy (contracts by the
owner, the app on Railway from the root Dockerfile), House administration
(#/admin panel with the texts on master and the D-20261104-02 rules; migrate
and transfer_house_cap stay CLI-only) and a dated roadmap with every issue
linked (#60 added as post-MVP). Add Dockerfile/.dockerignore to the tree and
Docker as an optional requirement, and fix H-1/H-2 from the TASK-2 review.
Includes the TASK-3 report and the MID review.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

## TASK-4

## Task completado: HANDOFF_README — TASK-4

### Branch (con SHA corto del HEAD)
`feature/issue-16-readme` @ `f125e5d` (TASK-3 commiteado). `agents.md` y `documents/STATUS.md` sin commitear.

### Archivos modificados/creados
- `agents.md`: 1 línea, la fila `README.md` de §14 (`:428`).
- `documents/STATUS.md`: +13 / −5.
- Punto de partida, fila "6. Docs y despliegue".
- 3 baselines nuevas: TASK-3, TASK-2 y TASK-1.
- H10 cerrado.
- Fila "Licencia".
- Fila de #15 (corrección condicional).
- Fila nueva de #16 y fila "Siguiente".
- Viñeta de #16 en "Pendientes del usuario".

### Qué se implementó (3 líneas máx)
- `agents.md` §14 describe el README nuevo.
- STATUS:
- cierra H10;
- registra #16 en el ciclo activo y en el punto de partida;
- suma los campos `license` a la fila Licencia y las baselines de TASK-1..TASK-3;
- registra el merge de PR #57 en las filas de #15 y "Siguiente";
- agrega en "Pendientes del usuario" los de #16: revisar D-20261104-04, N-2 y el cierre de #16 con TASK-5.

### Precondición y verificación de la corrección condicional
```
$ timeout 60 git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch -q https://github.com/sdelvalle57/sui_battleship.git master:refs/remotes/origin/master; echo "fetch-exit=$?"
fetch-exit=0
$ git rev-parse --short origin/master
5e51356
$ git merge-base --is-ancestor origin/master HEAD; echo "anc=$?"
anc=0
```
Precondición cumplida: TASK-3 en PASA y `master` dentro de la branch.

`git show origin/master:documents/STATUS.md` todavía trae la fila de #15 con "Branch `feature/issue-15-pages-deploy`, PR #57 (`Refs #15`)", sin el merge. "Siguiente" sigue diciendo "listo para pasar a ready tras TASK-2b". El orquestador no lo corrigió en `master`, así que la corrección se aplica.

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: ninguno. Sin cambios de código, así que no hubo gates (handoff §0).
- Tablas de contrato y `app/src/sui/`: no aplica.

**Diff:**
```
$ git status --porcelain --untracked-files=all
 M agents.md
 M documents/STATUS.md
$ git diff --stat
 agents.md           |  2 +-
 documents/STATUS.md | 18 +++++++++++++-----
 2 files changed, 14 insertions(+), 6 deletions(-)
```
```diff
--- a/agents.md
+++ b/agents.md
@@ -428 +428 @@
-| `README.md` | Visión del producto y roadmap original (2025-03) |
+| `README.md` | Visión del MVP 1 vs 1, reglas, guía de juego y de desarrollo, arquitectura, roadmap real y licencia (#16) |
```
`git diff -- agents.md` toca solo la fila de §14, como pide el criterio de aceptación.

```diff
--- a/documents/STATUS.md
+++ b/documents/STATUS.md
@@ -18 +18 @@
-| 6. Docs y despliegue | ⬜ |
+| 6. Docs y despliegue | 🚧 README raíz reescrito en #16 (🚧: TASK-1..TASK-3 en la branch, PR principal con `Refs #16`; TASK-5 completa URL e IDs después de #8). Publicación en testnet: #8, pendiente del owner (PR #48). Hosting en Railway: #15, imagen lista (PR #57 mergeado, `5e51356`); conectar y publicar después de #8 (owner) |
@@ -39,0 +40,3 @@   (al principio de "Baselines de gates", lo más reciente primero)
+| docs @ `feature/issue-16-readme` (TASK-3 de #16, `f125e5d`), 2026-11-04 | `README.md` raíz | 🟢 Despliegue (contratos por el owner, app en Railway), Administración de la House (`#/admin`, "Administrar House", textos de `master` `5e51356`) y Roadmap (corte 2026-11-04, estados por `gh api`, #60 post-MVP); `Dockerfile`/`.dockerignore` en el árbol; Docker opcional; H-1/H-2 de TASK-2 corregidos. §R-2 2/2, §R-3 vacío, §R-4 68 OK (31 anclas re-verificadas contra `master`), §R-5 solo D-20261103-01 (PR #48). Sin cambios de código |
+| docs @ `feature/issue-16-readme` (TASK-2 de #16, `93a0661`), 2026-11-04 | `README.md` raíz | 🟢 Reescrito en español: aviso `[!WARNING]`, qué es, reglas del MVP, jugar en testnet (2 placeholders hasta #8), arquitectura, estructura, desarrollo local, documentación y licencia. §R-2 2/2, §R-3 vacío, §R-4 41 OK (anclas de §R-4 verificadas), §R-5 solo D-20261103-01 (PR #48). Sin cambios de código |
+| contracts/ + app @ `feature/issue-16-readme` (TASK-1 de #16, `3776c3d`; medido sobre `deaadbb` + TASK-1, antes del merge de #14 y #15), CLI `1.83.0`, Node `v26.13.0`, 2026-11-04 | gates completos de `contracts` y `app` | 🟢 exit 0. `license = "Apache-2.0"` en `Move.toml`, `package.json` y `app/package.json` (lock +2/−0). 0 warnings / 0 lints / 83 tests PASS; `Updating dependencies` 0; `Move.lock` sin delta; scripts 99 PASS; `check` 0 despliegues; `npm ci` 293; 292 firmas; 0 vulnerabilidades de producción; lint 0 / typecheck 0 / **915 tests** en 57 archivos; `index-*.js` 901.45 kB (273.61 kB gzip). Cero delta contra `deaadbb`; sin fallback. La medición sobre `5e51356` + #16 la da la CI del PR principal |
@@ -127 +130 @@
-| H10 | docs | README dice "2 vs 2"; el diseño es 1 vs 1. Roadmap marca el Escrow como diseñado. | Actualizar README en el issue de docs |
+| H10 | docs | README dice "2 vs 2"; el diseño es 1 vs 1. Roadmap marca el Escrow como diseñado. | ✅ 2026-11-04 (#16): README reescrito (1 vs 1, sin Escrow, reglas, guía, roadmap) |
@@ -142 +145 @@
-| Licencia | ✅ 2026-10-30 | Apache-2.0 (D-20261030-14): `LICENSE` en la raíz y cabecera `// Copyright (c) 2025-2026 sdelvalle57` + SPDX en los fuentes Move |
+| Licencia | ✅ 2026-10-30 | Apache-2.0 (D-20261030-14): `LICENSE` en la raíz y cabecera `// Copyright (c) 2025-2026 sdelvalle57` + SPDX en los fuentes Move. #16 (TASK-1, `3776c3d`): campo `license = "Apache-2.0"` en `contracts/Move.toml`, `package.json` y `app/package.json` (y su reflejo en `package-lock.json`) |
@@ -153,2 +156,3 @@
-| #15 (hosting de la app en Railway) | 🚧 2026-11-04 | Branch `feature/issue-15-pages-deploy`, PR #57 (`Refs #15`); plan v1.1 y handoff v1.5; … (resto sin cambios)
+| #15 (hosting de la app en Railway) | 🚧 2026-11-04 | PR #57 mergeado (`5e51356`, `Refs #15`); plan v1.1 y handoff v1.5; … (resto sin cambios: Hecho TASK-1..TASK-5 y TASK-2b; **Pendiente:** TASK-6 después de #8 (camino positivo real, Node 26.13.0, URL y `Closes #15`); checklist del owner; code-splitting → #58)
+| #16 (README raíz) | 🚧 2026-11-04 | Branch `feature/issue-16-readme`; plan v1 y handoff v1.2; D-20261104-04 (P-1..P-3 por delegación). Hecho: TASK-1, campo `license` en los manifiestos (`3776c3d`); TASK-2, README en español (`93a0661`); TASK-3, despliegue, administración de la House y roadmap (`f125e5d`); TASK-4, `agents.md` §14 y este STATUS. **Pendiente:** PR principal con `Refs #16`; TASK-5 después de #8 (URL pública e IDs de testnet, PR de seguimiento con `Closes #16`). El cierre lo hace el housekeeping de ese PR |
-| Siguiente | ⏳ | #8 (PR #48 en draft, congelado en `26f2676`: publicación en testnet por el owner); #15 (PR #57, listo para pasar a ready tras TASK-2b; TASK-6 en el seguimiento); #16 (TASK-3/TASK-4 tras #15; TASK-5 tras #8); post-MVP: #51, #53, #54, #56, #58, #60 |
+| Siguiente | ⏳ | #8 (PR #48 en draft, congelado en `26f2676`: publicación en testnet por el owner); #15 (TASK-6 después de #8); #16 (PR principal con `Refs #16`; TASK-5 después de #8); post-MVP: #51, #53, #54, #56, #58, #60 |
@@ -200,0 +205,4 @@   (al final de "Pendientes del usuario")
+- **#16:** revisar D-20261104-04 (P-1..P-3, tomada por delegación, D-20261104-01; también en la lista de arriba).
+  **N-2 (no delegable):** el merge del PR principal toca las watch paths de Railway (`package.json`, `app/package.json`,
+  `package-lock.json`): si Railway ya está conectado sin la preautorización del owner, el merge publica el sitio y espera
+  al owner. Después de #8, TASK-5 (PR de seguimiento con `Closes #16`) completa la URL y los IDs y cierra #16.
```
La fila de #15 aparece recortada en el diff pegado. En el archivo, el único cambio de esa fila es el prefijo: "Branch `feature/issue-15-pages-deploy`, PR #57 (`Refs #15`);" pasa a "PR #57 mergeado (`5e51356`, `Refs #15`);". El estado 🚧 y los pendientes ya estaban y quedan iguales: TASK-6 después de #8 y el checklist del owner.

**§R-3 sobre lo agregado** (las 14 líneas `+` del diff de los dos archivos, en `<scratchpad>/task4.added`):
```
$ git diff -U0 -- agents.md documents/STATUS.md | /usr/bin/grep '^+' | /usr/bin/grep -v '^+++' > <scratchpad>/task4.added; wc -l < <scratchpad>/task4.added
14
$ /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' <scratchpad>/task4.added; echo "e1=$?"
e1=1
$ /usr/bin/grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <scratchpad>/task4.added; echo "e2=$?"
e2=1
$ /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' <scratchpad>/task4.added; echo "e3=$?"
e3=1
```
Los tres salen vacíos. Los únicos hex que agregué son SHAs cortos de 7 caracteres: `3776c3d`, `93a0661`, `f125e5d`, `5e51356` y `deaadbb`.

**Coherencia con los reportes de TASK-1..TASK-3** (criterio de aceptación):

| Valor en STATUS | Reporte |
|---|---|
| contracts 0 / 0 / 83, `Updating dependencies` 0, `Move.lock` sin delta, scripts 99, `check` 0 | TASK-1 |
| `npm ci` 293, 292 firmas, 0 de producción, lint 0, typecheck 0, 915 tests en 57 archivos, 901.45 kB (273.61 kB gzip) | TASK-1 |
| lock +2/−0, sin fallback | TASK-1 |
| §R-4 41 OK, §R-2 2/2, §R-5 solo D-20261103-01 (PR #48) | TASK-2 |
| §R-4 68 OK, 31 anclas re-verificadas, #60 post-MVP | TASK-3 |

Ningún conteo contradice los reportes. No hay medición sobre `5e51356`: esa la da la CI del PR principal.

### Verificación manual (localnet / testnet, digests de tx si hubo)
No aplica. No corrí ningún `sui`, ni localnet, ni nada contra testnet. Solo el fetch HTTPS y `git show` de solo lectura.

### Desviaciones del handoff
1. **Qué cambió:** las filas de #15 y "Siguiente" de STATUS, que no son de #16.
 - **Por qué:** es la corrección condicional que piden el handoff v1.2 y el ajuste 1 del MID. `master` `5e51356` todavía no registra el merge de PR #57, y TASK-4 ya toca STATUS, así que deja el archivo coherente.
 - **Verificación extra realizada:** con `git show origin/master:documents/STATUS.md` confirmé que el texto viejo sigue en `master`.
 - **Qué tocó, acotado:**
   - en #15, solo el prefijo ("PR #57 mergeado (`5e51356`, `Refs #15`)");
   - en "Siguiente", se quitó "listo para pasar a ready" y quedaron #15 (TASK-6 después de #8) y #16 (PR principal + TASK-5);
   - #60 ya estaba en post-MVP y se conserva.
2. **Qué cambió:** STATUS no tenía una fila de #16 en el ciclo activo, así que la agregué entre #15 y "Siguiente".
 - **Por qué:** el handoff pide "fila de #16 en el ciclo activo: 🚧 en curso con PR principal y el pendiente TASK-5".
 - **Verificación extra realizada:** la fila sigue el formato de las de #14 y #15.
3. **Qué cambió:** D-20261104-04 ya estaba en "Pendientes del usuario" (`STATUS.md:195`, "A revisar por el owner a su vuelta"). La viñeta nueva de #16 la nombra y remite a esa línea, sin duplicar el texto.
 - **Por qué:** cumple el ajuste 3 del MID sin repetir el texto de esa línea.
 - **Verificación extra realizada:** ninguna.
4. **Qué cambió:** la fila de #16 da TASK-4 como hecho y el punto de partida pone #16 en 🚧, aunque esos cambios todavía no están commiteados.
 - **Por qué:** STATUS describe el estado que queda al commitear este task, igual que en los ciclos anteriores.
 - **Verificación extra realizada:** ninguna.

### Riesgos / pendientes
- **N-2 (no delegable):** sigue vigente para el merge del PR principal y quedó registrado en "Pendientes del usuario".
- **TASK-5 (después de #8):**
- completa los dos placeholders del README;
- pasa D-20261103-01 sin `(PR #48)` si #8 mergeó;
- pone #8 en "Hecho" y actualiza #15 en el roadmap;
- cierra #16 con su housekeeping.
- `agents.md` §1 ("Foco actual (oct-2026)") está viejo, pero queda fuera del alcance de #16 (ajuste 4 del MID).

### Documentación
- READMEs / `agents.md` actualizados: sí, `agents.md` §14, la fila `README.md`.
- Snippet para `documents/STATUS.md`: ya va en este task. Las filas de baselines usan los snippets de los reportes de TASK-1..TASK-3.

**Commit propuesto (handoff):** `docs: map the new README and close STATUS H10 (#16)`.

---

## Revisión TASK-4: PASA

Revisión del MID (2026-11-04) contra `documents/ESTANDARES.md` y el handoff v1.2, TASK-4, más los ajustes de la
revisión de TASK-3. Leí el diff real con `git diff -- agents.md documents/STATUS.md` (2 archivos, +14/−6).

### Checklist
- [x] **`agents.md`:** cambia **solo** la fila de `README.md` en §14 (`agents.md:428`), con el texto del handoff. No
      toca ninguna otra sección (PROY-20).
- [x] **STATUS, lo pedido:**
      - H10 queda ✅ 2026-11-04 (#16);
      - fila "6. Docs y despliegue" con README (#16), publicación (#8) y hosting (#15), cada uno con su estado real;
      - fila "Licencia" con los campos `license` de TASK-1 (`3776c3d`);
      - fila nueva de #16 en 🚧, con los SHAs reales de TASK-1..TASK-3 y TASK-5 pendiente;
      - 3 baselines (TASK-1 marcado "medido sobre `deaadbb` + TASK-1", con 915/57, sin inventar una medición sobre
        `5e51356`; TASK-2 y TASK-3 "Sin cambios de código");
      - "Pendientes del usuario" con D-20261104-04, N-2 y el cierre por TASK-5.
- [x] **Ajuste de la revisión de TASK-3:**
      - la fila de #15 registra el merge de PR #57 (`5e51356`, `Refs #15`) y mantiene sus pendientes;
      - en "Siguiente" se quitó "listo para pasar a ready" y se sumó #60 a post-MVP.
- [x] **Coherencia:** los SHAs citados (`3776c3d`, `93a0661`, `f125e5d`, `5e51356`) coinciden con
      `git log --oneline origin/master..HEAD`. Los conteos coinciden con los reportes de TASK-1..TASK-3. No hay filas
      duplicadas.
- [x] **§R-3** sobre las 14 líneas agregadas: vacío (output pegado).
- [x] **Desviaciones declaradas.**

### Decisión sobre las desviaciones (las 4 aceptadas)
1. **Filas de #15 y "Siguiente":** es la corrección condicional que pidió la v1.2. `master` no la tenía, así que se
   aplicó y quedó acotada a esas dos filas.
2. **Fila nueva de #16:** la pedía TASK-4 ("fila del ciclo de #16 en curso"). No es una desviación real.
3. **La viñeta de #16 remite a la línea 195:** evita duplicar la lista de decisiones delegadas (LIM-5) y deja N-2 y el
   cierre en un solo lugar.
4. **STATUS describe el estado posterior al commit:** es la convención del repo. STATUS viaja en el mismo commit que el
   cambio que describe (PROY-20), igual que en los ciclos anteriores.

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| — | — | — | Ninguno | — |

### Siguiente paso
- **TASK-4 aprobado.** Con eso se completan TASK-1..TASK-4. El orquestador abre el PR principal con `Refs #16`
  (D-20261104-04 (1)); el body propuesto está en el scratchpad del orquestador.
- Antes del merge: **N-2** (Railway todavía no está conectado, así que hoy no aplica) y la revisión de integración
  del MAYOR (FLUJO §7).
- TASK-5 queda en **NO EMPEZAR** hasta #8 y el dominio de Railway.
- **Sin housekeeping en este PR:** el ciclo sigue activo hasta TASK-5 (FLUJO §9).

### Mensaje de commit propuesto
```
docs: map the new README and close STATUS H10 (#16)

agents.md §14 now describes the rewritten root README. STATUS closes H10,
updates the "Docs y despliegue" and license rows, adds the #16 cycle row and
the TASK-1..TASK-3 baselines, and lists D-20261104-04 and the N-2 Railway
watch-path warning among the owner's pending items. It also records the PR #57
merge in the #15 row and refreshes "Siguiente" (#60 added). Includes the
TASK-4 report and the MID review.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
