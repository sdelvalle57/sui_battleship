# Reportes del ciclo — #3 CI

> Reportes del DEV, evidencia de runs del orquestador y revisiones del MID, una sección por task.
> Transcritos por el orquestador (el harness no deja escribir archivos de reporte a los subagentes);
> los outputs largos idénticos a otros ya pegados se resumen con referencia.

## Task completado: HANDOFF_CI — TASK-1 (parte DEV; O1–O5 del orquestador pendientes)

`ci.yml` escrito, idéntico al bloque del handoff (`diff` exit 0). V0–V6 dan lo esperado. **El rojo de lint
funciona** (`B lint exit=1` con `ESL06010`): no hay STOP de D1. V7: el grep de secretos contra `master`
encuentra 3 líneas, todas el texto del propio grep dentro de docs del ciclo ya commiteados. Sin secretos.
Sin commits, pushes, PRs ni cambios de branch; sin tocar `documents/`, `contracts/` ni `~/.sui/`.

### Branch (con SHA corto del HEAD)
`feature/issue-3-ci` @ `d68431e`.

### Archivos modificados/creados
- Creado: `.github/workflows/ci.yml` (sin trackear; sha256 `ccf36f25a39c849ea78e249ec4fa2fa8f23c8474b575bcc7fb7cfbca13235736`).
- Temporales fuera del repo en el scratchpad `issue3/` (`keyless.sh`, `drift.sh`, `sim/`, `summary*.md`, `status-before.txt`, `red-check/`, `install/`).

### Qué se implementó (3 líneas máx)
1. Workflow `CI`: job `contracts` (CLI 1.83.0 del asset del release verificada por SHA-256 y cacheada; config sin claves en `$RUNNER_TEMP`; build, lint y test con `-e testnet --warnings-are-errors`; guardas de `Move.lock`/árbol y de cero claves) y job informativo `framework-drift` (H13).
2. `diff <(sed -n 83,281p documents/HANDOFF_CI.md) .github/workflows/ci.yml` → `diff exit=0`.
3. Verificación local V0–V7.

### Tests y gates (output pegado)
- Tests agregados: ninguno. Contracts (`sui 1.83.0-16d2dc1e05ed`): build/lint/test con `--warnings-are-errors` exit 0, 0 warnings, 0 lints, `Total tests: 26; passed: 26; failed: 0`, `Move.lock` sin delta (V5).

**V0 — estado inicial:** `## feature/issue-3-ci`, `d68431e`; untracked: `.github/workflows/ci.yml` y `documents/PLAN_GAME.md` (ajeno, no tocado).

**V1 — YAML (script del handoff con pyyaml):** `on` = `pull_request`/`push` a `master`; `permissions: contents: read`; concurrencia `pr-<N>` / `github.sha` con `cancel-in-progress` solo en PR; `env` = `SUI_BIN_SHA256`, `SUI_COMMIT`, `SUI_TGZ_SHA256`, `SUI_VERSION`; job `contracts` `ubuntu-24.04` 20 min con 14 steps (checkout, restore, install `if: cache-hit != 'true'`, verify, save `if: cache-hit != 'true'`, PATH, keyless config, version, cache Move deps, build, lint, test, `Move.lock` y árbol `if: !cancelled()`, guarda de claves `if: !cancelled()`); job `framework-drift` `ubuntu-24.04` 6 min `continue-on-error: True`, step con `timeout: 4`. `actionlint`: no disponible (`exit=1`), no instalado (SEG-8), declarado.

**V2 — instalación contra la copia local del asset (sin descargar)**
```
$ echo "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8  $asset" | sha256sum -c -
/home/santiago/.cache/suiup/releases/sui-testnet-v1.83.0-ubuntu-x86_64.tgz: OK
$ mkdir sui-release && time tar -xzf "$asset" -C sui-release ./sui && ls -la sui-release
real	0m22.139s
-rwxr-xr-x 1 santiago santiago 235884552 Oct 26 13:46 sui
$ echo "29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  sui-release/sui" | sha256sum -c -
sui-release/sui: OK
$ printf 'n\n' | ./sui-release/sui --version
sui 1.83.0-16d2dc1e05ed
```

**V3 — config sin claves extraída del YAML**
```
$ RUNNER_TEMP="$WORK/sim" GITHUB_ENV="$WORK/sim/github_env" bash --noprofile --norc -eo pipefail "$WORK/keyless.sh"; echo "exit=$?"
exit=0
$ cat "$WORK/sim/github_env"; cat "$WORK/sim/sui_config/client.yaml"; cat "$WORK/sim/sui_config/sui.keystore"
SUI_CONFIG_DIR=<scratch>/issue3/sim/sui_config
---
keystore:
  File: <scratch>/issue3/sim/sui_config/sui.keystore
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: ~
    basic_auth: ~
active_env: testnet
active_address: ~
[]
$ cd "$REPO/contracts" && printf 'n\n' | SUI_CONFIG_DIR="$WORK/sim/sui_config" sui move build -e testnet --warnings-are-errors; echo "exit=$?"
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING battleship
exit=0
$ ls -A "$WORK/sim/sui_config"; test "$(tr -d '[:space:]' < "$WORK/sim/sui_config/sui.keystore")" = "[]"; echo "keystore vacío exit=$?"
client.yaml
sui.keystore
keystore vacío exit=0
```
(`test ! -e "$HOME/.sui"` no se puede simular en local.)

**V4 — `framework-drift` extraído del YAML (solo lecturas de red)**
```
$ GITHUB_STEP_SUMMARY="$WORK/summary.md" SUI_VERSION=1.83.0 bash --noprofile --norc "$WORK/drift.sh"; echo "exit=$?"
::warning title=H13::Move.lock en PV 139 (719fb2960ccf); el framework vigente en testnet (PV 140) es el de PV 140 (05ad86a3e86c): repinear en el pre-vuelo de #8 (paso 2)
exit=0
| 1269 | 140 | 140 / `05ad86a3e86c` | 139 / `719fb2960ccf` | 140 | lock atrasado: repinear en el pre-vuelo de #8 |
$ GITHUB_STEP_SUMMARY="$WORK/summary-bad.md" SUI_VERSION=9.99.9 bash --noprofile --norc "$WORK/drift.sh"; echo "exit=$?"
curl: (22) The requested URL returned error: 404   (×4: 1 intento + 3 reintentos)
::warning title=H13::no se pudo leer el manifest del framework de la CLI 9.99.9
exit=0
```
Sin warning de "CLI atrasada".

**V5 — gates canónicos nuevos (D1):** `sui move build -e testnet --warnings-are-errors` exit 0; `--lint --warnings-are-errors` exit 0; `sui move test -e testnet --warnings-are-errors` exit 0 con las mismas 26 líneas `[ PASS ]` de #4 y `Test result: OK. Total tests: 26; passed: 26; failed: 0`; `git diff --exit-code -- contracts/Move.lock` → `lock exit=0`.

**V6 — verificación roja fuera del repo (N3)**
```
$ cd "$RED" && ls sources/ && printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "A build exit=$?"
ci_red_check.move
house.move
error[EC04007]: incompatible types
  ┌─ ./sources/ci_red_check.move:7:28
7 │ public fun broken(): u64 { true }
Failed to build Move modules: Compilation error.
A build exit=1
$ cd "$RED" && ls sources/ && printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "B build exit=$?"
ci_lint_check.move
house.move
B build exit=0
$ cd "$RED" && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "B lint exit=$?"
error[ESL06010]: prefer '&mut TxContext' over '&TxContext'
  ┌─ ./sources/ci_lint_check.move:7:24
7 │ public fun touch(_ctx: &TxContext) {}
Failed to build Move modules: Compilation error.
B lint exit=1
$ cd "$REPO" && git status --porcelain --untracked-files=all | diff "$WORK/status-before.txt" - ; echo "repo intacto exit=$?"
repo intacto exit=0
```
Con `--warnings-are-errors` el lint sale como **`ESL06010`** (error), no `WSL06010`.

**V7 — greps de forma y secretos**
- `uses:`: 5 líneas, todas fijadas por SHA de 40 caracteres (conteo 5).
- `sui`: 4 invocaciones, las 4 con `printf 'n\n' |` (conteo 4).
- Prohibidos (`sui client|keytool`, `--yes`, `-y`, `secrets.`, `GITHUB_TOKEN`): `exit=1` (ninguno).
- Secretos `git diff -U0 master -- . | grep '^\+' | grep -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN … PRIVATE KEY'`: **3 líneas, `exit=0`** — `HANDOFF_CI.md:417`, `HANDOFF_CI.md:597`, `PLAN_CI.md:442`, todas el propio comando de grep en docs del ciclo. Sobre `ci.yml` (untracked): secretos `exit=1`, direcciones `0x…{64}` `exit=1`. `find ~/.sui -newer ci.yml` vacío; `contracts/` limpio.

### Verificación manual
No aplica (sin transacciones; lecturas de red de V4).

**Pendiente de los runs remotos del orquestador (O1–O5):** R1 (Install/Save success, sha256 OK, versión, 26 tests, árbol vacío, guarda incl. `test ! -e "$HOME/.sui"`, `framework-drift` con warning H13 y sin "CLI atrasada"); R2 (cache hit: Install/Save skipped, Verify success); R3 (Build failure, Lint/Test skipped, `Move.lock` y Guarda ejecutados); R4 (Build success, **Lint failure**, Test skipped; si Lint verde ⇒ STOP D1); limpieza O4 y PR desechable CLOSED sin merge. Sin verificar en local: descarga real del asset (~1,2 GB), `actions/cache` v6.1.0 y `cache-primary-key`.

### Desviaciones del handoff (o "ninguna")
- `ci.yml`: ninguna (literal).
- V7: 3 líneas en vez de 0 (el propio patrón en docs del ciclo ya commiteados); justificadas, sin cambiar comandos.
- V1: `actionlint` no disponible.
- Arranque: `sui --version </dev/null` en vez de `printf 'n\n' | sui --version` (`--version` no lee config). V1–V7 con guard.

### Riesgos / pendientes (o "ninguno")
1. El grep de evidencia de O5 busca `W06010|prefer_mut`; con `--warnings-are-errors` R4 mostrará `error[ESL06010]`: agregar `SL06010` al patrón (`prefer_mut` y `error` coinciden igual).
2. En futuros handoffs, el criterio del grep de secretos debe ser "solo líneas que contienen el propio patrón".
3. `framework-drift` con fallas de GitHub: 4 líneas `curl: (22)` por descarga, dentro del presupuesto.
4. `tar` de un miembro: 22 s en local; en el runner se suma a la descarga (límite 20 min).

### Documentación
- READMEs / `agents.md`: no aplica en TASK-1 (TASK-2).
- Snippet para STATUS (lo aplica TASK-2 con links R1–R4): fila CI en Toolchain (asset y SHA-256s), baseline CI y medición H13 (época 1269, PV 140 vs lock 139, CLI máx. 140).

## Revisión TASK-1 (parte local): PASA

> Revisión del MID transcrita por el orquestador.

`diff <(sed -n 83,281p documents/HANDOFF_CI.md) .github/workflows/ci.yml` → exit 0 (sha256 `ccf36f25…235736`, 199 líneas, sin tabs/CR/espacios finales). SHAs verificados con `gh api`: `actions/checkout` `v7.0.1` → `3d3c42e5…90b1`; `actions/cache` `v6.1.0` → `55cc8345…52a9` (con `restore/` y `save/`, salidas `cache-hit` y `cache-primary-key`). Asset `testnet-v1.83.0`: `sha256:e5116805…d7d8` (1.191.250.401 bytes) = `SUI_TGZ_SHA256`. Greps de V7 reproducidos. `~/.sui/sui_config/`: solo `client.yaml` (mtime anterior a `ci.yml`), sin keystore. Seguridad: `contents: read` sin ampliaciones; `persist-credentials: false`; `pull_request` (no `_target`); sin `secrets.*`/`GITHUB_TOKEN`; sin interpolar `github.event.*` en `run:`; 4 `sui` con guard y tras la config sin claves; guarda de claves con `!cancelled()` y falla segura; binario verificado por SHA-256 antes de PATH y de guardar caché; `framework-drift` sin `sui` ni secretos.

| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | 🟡 Evidencia O5 (errata del handoff) | `HANDOFF_CI.md:487` | `W06010` no es subcadena de `WSL06010`/`ESL06010`; `prefer_mut` no aparece en el diagnóstico | Patrón de O5: `sha256sum|: OK|sui 1\.83|Cache restored|Cache saved|Cache not found|cache hit|Test result|error|SL06010|prefer_mut|prefer .&mut|warning title=H13|##\[warning\]|git status|keystore` |
| 2 | 🔵 V7 (errata del handoff) | `HANDOFF_CI.md:417,421` | 3 matches del propio patrón en docs del ciclo | Desviación aprobada; 0 en `ci.yml` |
| 3 | 🔵 SEG-8 | `HANDOFF_CI.md:293,325` | `actionlint` no disponible | Permitido; compensa V1 + R1 |
| 4 | 🟡 D6 / H11 | `HANDOFF_CI.md:42,496` | `sui --version </dev/null` en el arranque | No bloquea; desde TASK-2 forma literal de `agents.md` §3 |
| 5 | 🔵 Evidencia | V1, V5, V7 | Transcritos en resumen | No bloquea; el anexo de O5 va completo |
| 6 | 🔵 Flujo | `REPORTES_CI.md` | Untracked | Commit aparte tras el anexo y el cierre |

Siguiente paso: O1–O5 autorizados (O5 con el patrón del hallazgo 1). Mensaje de commit: `ci: add contracts workflow with build, lint and test gates (#3)` (commit `44ff83a`).

## TASK-1 — Anexo de runs (O1–O5, orquestador)

**O1:** commit `44ff83a` (solo `.github/workflows/ci.yml`), push de `feature/issue-3-ci`, PR borrador **#27**.

| Run | Qué es | Link | Conclusión | Steps relevantes |
|---|---|---|---|---|
| R1 | PR #27, attempt 1 (`44ff83a`) | https://github.com/sdelvalle57/sui_battleship/actions/runs/41148825720/attempts/1 | ✅ success | `contracts`: Restore success (miss), **Install success, Save success**, Verify, Keyless, Version, Build, Lint, Test, `Move.lock` y árbol, Guarda: success. `framework-drift`: success |
| R2 | mismo run, attempt 2 | https://github.com/sdelvalle57/sui_battleship/actions/runs/41148825720/attempts/2 | ✅ success | `contracts`: **Install skipped, Save skipped** (cache hit), Verify success, resto success. `framework-drift`: success |
| R3 | PR #28 desechable, rojo de compilación (`8653839`) | https://github.com/sdelvalle57/sui_battleship/actions/runs/41149053353/attempts/1 | ❌ failure | `contracts`: Install/Save success (otro scope de caché), **Build failure**, Lint/Test skipped, `Move.lock` y árbol success, Guarda success. `framework-drift`: success |
| R4 | PR #28 desechable, rojo de lint (`fc0a3d4`) | https://github.com/sdelvalle57/sui_battleship/actions/runs/41149200767/attempts/1 | ❌ failure | `contracts`: Install/Save skipped (cache hit), **Build success, Lint failure**, Test skipped, `Move.lock` y árbol success, Guarda success. `framework-drift`: success |

**Fragmentos de log** (`gh run view <R> --attempt <a> --log --job <id>` + grep con el patrón corregido; se omiten las líneas de eco del script `[36;1m…`):
```
# R1 contracts (job 124380192501)
Restore Sui CLI cache   Cache not found for input keys: sui-cli-Linux-X64-1.83.0-e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8
Install Sui CLI         sui-testnet-v1.83.0-ubuntu-x86_64.tgz: OK
Verify Sui CLI binary   /home/runner/.cache/sui-cli/1.83.0/sui: OK
Save Sui CLI cache      Cache saved with key: sui-cli-Linux-X64-1.83.0-e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8
Check Sui CLI version   sui 1.83.0-16d2dc1e05ed
Cache Move git deps     Cache not found for input keys: move-git-Linux-1.83.0-043a45e78ec132eb7add805a48d7ada32b2c3fcc21ceb530f86535aa800a87ec
Build                   Downloading from https://github.com/MystenLabs/sui.git / INCLUDING DEPENDENCY MoveStdlib / INCLUDING DEPENDENCY Sui / BUILDING battleship
Test                    Test result: OK. Total tests: 26; passed: 26; failed: 0
Guarda de cero claves   sui.keystore   (listado de nombres; guarda en success, incluido `test ! -e "$HOME/.sui"`)
# R1 framework-drift (job 124380192691)
##[warning]Move.lock en PV 139 (719fb2960ccf); el framework vigente en testnet (PV 140) es el de PV 140 (05ad86a3e86c): repinear en el pre-vuelo de #8 (paso 2)
(sin warning de "CLI atrasada")

# R2 contracts (job 124380668153)
Restore Sui CLI cache   Cache hit for: sui-cli-Linux-X64-1.83.0-e5116805…d7d8 / Cache restored successfully
Verify Sui CLI binary   /home/runner/.cache/sui-cli/1.83.0/sui: OK
Check Sui CLI version   sui 1.83.0-16d2dc1e05ed
Cache Move git deps     Cache hit for: move-git-Linux-1.83.0-043a45e7…87ec / Cache restored successfully
Test                    Test result: OK. Total tests: 26; passed: 26; failed: 0
Post Cache Move deps    Cache hit occurred on the primary key move-git-Linux-1.83.0-043a45e7…87ec

# R3 contracts (job 124380932103)
Build                   error[EC04007]: incompatible types
Build                   Failed to build Move modules: Compilation error.
Build                   ##[error]Process completed with exit code 1.

# R4 contracts (job 124381397030)
Lint                    error[ESL06010]: prefer '&mut TxContext' over '&TxContext'
Lint                    Failed to build Move modules: Compilation error.
Lint                    ##[error]Process completed with exit code 1.
```
Ningún `Path Validation Error` de `actions/cache` en `~/.move/git`. **D1 confirmado empíricamente** (R4: Build success, Lint failure).

**O4 — limpieza (orden N1)**
```
$ git worktree remove /home/santiago/Projects/Battleship-ci-red-check
$ gh pr close 28 --delete-branch
✓ Closed pull request sdelvalle57/sui_battleship#28 ([no merge] CI red check (#3))
✓ Deleted branch ci/red-check-issue-3
$ git ls-remote --heads origin ci/red-check-issue-3
(vacío)
$ git branch --list ci/red-check-issue-3
(vacío)
$ git worktree prune --dry-run
(vacío)
$ git worktree list
/home/santiago/Projects/Battleship 44ff83a [feature/issue-3-ci]
$ git status -sb && git status --porcelain --untracked-files=all
## feature/issue-3-ci...origin/feature/issue-3-ci
?? documents/PLAN_GAME.md          (ajeno, ciclo #5)
?? documents/REPORTES_CI.md        (este archivo)
?? documents/REVISION_PLAN_GAME.md (ajeno, ciclo #5)
$ gh pr view 28 --json state,closed,mergedAt
{"closed":true,"mergedAt":null,"state":"CLOSED"}
```
Logs completos guardados fuera del repo (scratchpad del orquestador, `runs/r{1,2,3,4}-contracts.log`, `r1-drift.log`).

## Revisión TASK-1 (cierre con el anexo de runs): PASA

> Revisión del MID transcrita por el orquestador. El MID verificó cada run con `gh run view … --json` y los 5 logs completos, los commits rojos y los PRs con `gh api`.

| Criterio | Evidencia verificada | Resultado |
|---|---|---|
| 3. R1 verde (41148825720/1, `44ff83a7`) | `contracts`: 14 steps success; cache miss + Install; `.tgz: OK` y `sui: OK`; `Cache saved`; `sui 1.83.0-16d2dc1e05ed`; build/lint/test exit 0; 26/26; `SUI_CONFIG_DIR=/home/runner/work/_temp/sui_config` en los 4 `sui`; árbol vacío; guarda (solo `client.yaml` y `sui.keystore`, `test ! -e "$HOME/.sui"` OK); 56 s (Install 31 s). `framework-drift`: success 5 s con el warning H13; sin "CLI atrasada" | ✅ |
| 4. R2 cache hit (attempt 2) | Install/Save skipped; `Cache restored from key: sui-cli-…`; Verify OK; caché Move también acierta (sin `Downloading from …sui.git`: `~/.move/git` es la ruta correcta); 26/26; 14 s | ✅ |
| 5. R3 y R4 terminados | R3 (41149053353, `86538398`): Build failure `error[EC04007]` en `ci_red_check.move:7:28`; Lint/Test skipped; `Move.lock` y Guarda success. R4 (41149200767, `fc0a3d42`): Build success, **Lint failure** `error[ESL06010]` en `ci_lint_check.move:7:24`; Test skipped; Guarda success. Commits rojos con el contenido literal de V6 | ✅ D1 confirmado |
| 6. Limpieza O4 | Sin branch local/remota, prune vacío, un worktree; PR #28 `CLOSED`, `mergedAt: null`; PR #27 borrador con head `44ff83a` = HEAD | ✅ |

### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
|---|---|---|---|---|
| 1 | 🔵 Errata del MID | revisión local, hallazgo 1 | `prefer_mut` sí aparece en la nota del diagnóstico (`prefer_mut_tx_context`); el DEV tenía razón; `W06010` sí era incorrecto | Ninguna |
| 2 | 🔵 Evidencia | anexo, "Fragmentos de log" | Fragmentos editados, no literales | No bloquea (coinciden con los logs); a futuro, literal |
| 3 | 🔵 `actions/cache` | `ci.yml:101-104` | R3 no guardó la caché Move (post-step solo en éxito) | Esperado |
| 4 | 🔵 Higiene | cachés del PR #28 | Dos cachés en `refs/pull/28/merge` | Opcional: `gh cache delete` o expiración a 7 días |

### Siguiente paso: TASK-2 autorizada, con ajustes
1. Commitear este archivo antes de TASK-2; en §5 de TASK-2 se esperan también `?? documents/PLAN_GAME.md` y `?? documents/REVISION_PLAN_GAME.md` (ciclo #5).
2. STATUS (punto 10): R1 https://github.com/sdelvalle57/sui_battleship/actions/runs/41148825720/attempts/1 sobre `44ff83a` (`contracts` 56 s, Install 31 s, 26/26; `framework-drift` 5 s con warning H13); R2 attempt 2 (14 s, cache hit); R3 run 41149053353 (`8653839`); R4 run 41149200767 (`fc0a3d4`); PR #28 cerrado sin merge; época H13 = 1269 (medición V4).
3. `agents.md` (punto 3), fila del lint: "con `--warnings-are-errors` un lint sale como `error[ESL…]` y corta el build (R4 de #3)". > Decisión (2026-10-30): detalle interno registrado por el MID.
4. `ORQUESTADOR.md` (punto 7): consulta de "CI verde" validada sobre #27 (`{"contracts":["SUCCESS"],"head":"44ff83a7…"}`); añadir que el rollup refleja el último attempt; check requerido = `contracts` (workflow `CI`).
5. DEV: `printf 'n\n' |` literal delante de todo `sui`, también en el arranque.
6. Body final del PR #27 (lo propone el MID al cerrar TASK-2): rojos en la branch desechable (#28); warning H13 esperado hasta el pre-vuelo de #8; protección de `master` y settings de Actions pendientes del usuario tras el merge.
