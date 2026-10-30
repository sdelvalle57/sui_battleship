# PLAN_CI v1.1
> Issue: #3 (+ comentario H11/H13 del 2026-10-30; relacionados #8, #9) | Áreas: ci / docs | Fecha: 2026-10-30
> Branch: `feature/issue-3-ci`, al día con `master` @ `c2a1e42` (PR #26; HEAD de la branch `c454ede` = revisión del MAYOR) | Autor: MID
> Estado: v1.1 tras `documents/REVISION_PLAN_CI.md` (REQUIERE CAMBIOS: 0 🔴 · 1 🟠 · 8 🟡 · 4 🔵). STOPs resueltos en **D-20261030-13**.

## Cambios v1 → v1.1

| Hallazgo | Cambio |
|---|---|
| 1 🟠 | Base `c2a1e42`; STOPs pasan a "Decisiones resueltas" con su línea `> Decisión … (D-20261030-13)`; TASK-2 **cita** D-13 y numera decisiones nuevas desde **D-20261030-15**; orden de operación actualizado |
| 2 🟡 | Quién aplica la protección y los settings: el usuario, o el orquestador solo con autorización expresa del usuario en ese momento (texto de D-13) en plan, TASK-2 y STATUS |
| 3 🟡 | Concurrencia: grupo `pr-<N>` para PRs (cancela) y `github.sha` para push (nunca cancela ni descarta runs de `master`); comentario corregido |
| 4 🟡 | `tar` extrae solo `./sui` (~236 MB en vez de ~5,1 GB) |
| 5 🟡 | Caché de la CLI con `actions/cache/restore` + `actions/cache/save` (save justo tras instalar); greps de `uses:` ajustados a 5 |
| 6 🟡 | Procedimiento de runs rojos paso a paso: contenido literal, `git worktree` aparte, esperar cada run, el commit de lint borra `ci_red_check.move`; separado lo que prepara el DEV de lo que pushea el orquestador |
| 7 🟡 | `framework-drift`: `timeout-minutes` y `continue-on-error` en el step y `continue-on-error` en el job; "CI verde" = `gh pr checks <N> --required` (con protección) o `statusCheckRollup` de `contracts` (sin ella) |
| 8 🟡 | H13 compara por piso: `EXPECTED_PV` = clave más alta del manifest ≤ PV de testnet; aviso solo si `LOCK_REV != EXPECTED_REV`; PV máxima de la CLI desde `MAX_PROTOCOL_VERSION` (no desde el manifest, que tiene huecos) |
| 9 🟡 | TASK-2 suma `documents/agentes/AGENTE_DEV.md:50`, `documents/FLUJO_AGENTES.md:91`, `agents.md:52-54` y `agents.md:87`; grep de verificación ampliado |
| 10–13 🔵 | Aceptadas: `curl --retry-all-errors`; `SUI_BIN_SHA256` verificado en cada run; guarda `test ! -e "$HOME/.sui"`; clave de caché de `~/.move/git` incluye `SUI_VERSION` |

## Historia de usuario

**Como** owner del repo (y orquestador que mergea por D-20261030-09), **quiero** que cada PR contra
`master` y cada push a `master` compile, pase lints y tests del paquete Move en GitHub Actions con la
misma Sui CLI `1.83.0` y los mismos flags que el DEV usa en local, sin claves y sin tocar `Move.lock`,
**para** que un rojo no llegue a `master` por depender solo del output que pega el DEV, y que
"CI verde" sea una condición verificable antes de cada merge.

**Scope en una frase:** un workflow `.github/workflows/ci.yml` con el job bloqueante `contracts`
(build, lint y test con warnings como error, `Move.lock` intacto, guarda de cero claves) y un job
informativo `framework-drift` que avisa si el framework pineado quedó por detrás de la PV de testnet
(H13); docs alineadas.

**Lo que NO entrega:** el job de la app (#9, solo se deja el hueco); deploy de hosting (#15); publicar
en testnet ni repinear `Move.lock` (#8); cobertura obligatoria (sigue informativa y fuera de CI);
aplicar la protección de `master` ni los settings de Actions (D-20261030-13 (3)(4): después del merge,
los aplica el usuario, o el orquestador solo con autorización expresa del usuario en ese momento).

---

## Contexto y alcance

### Qué existe hoy (evidencia, `master` @ `c2a1e42`)

- No hay `.github/` en el árbol; STATUS lo registra: `documents/STATUS.md:46` ("CI — ⬜ no existe").
- Gates canónicos: `agents.md:63-74` (desde `contracts/`, con `-e testnet` y `printf 'n\n' |`). El lint
  figura como "informativo hasta fijar baseline" (`agents.md:68`) y el baseline ya es **0 lints**
  (`documents/STATUS.md:38-40`: build 0 warnings, lint 0, test 26 PASS con 0 warnings, CLI `1.83.0`).
- `agents.md:74`: `--warnings-are-errors` existe en `sui move build` y `sui move test` "para CI, #3".
  Confirmado con `printf 'n\n' | sui move build --help` / `sui move test --help` (CLI local
  `sui 1.83.0-16d2dc1e05ed`): `--warnings-are-errors`, `--lint`, `-e, --build-env`.
- Prerrequisito sin claves: `client.yaml` sin claves (D-20261030-07); en CI, la misma config en
  `$RUNNER_TEMP` vía `SUI_CONFIG_DIR` (`documents/STATUS.md:65`, H11, y comentario del issue #3).
- H13 (`documents/STATUS.md:67`): testnet en PV 140, lock en el piso de PV 139
  (`contracts/Move.lock:8,14`, rev `719fb2960ccfbf9f4d33041f8ea5146d30671696`); la CLI no avisa.
- PROY-17/18 (`documents/ESTANDARES.md:83-84`); D-20261030-09 (merge con CI verde); D-20261030-13
  (STOPs de este plan); D-20261030-14 (licencia Apache-2.0: cabecera en los fuentes Move).
- Repo (`gh api`, solo lectura): `master` **sin protección**, sin rulesets, `allowed_actions: all`,
  `sha_pinning_required: false`, `default_workflow_permissions: read`.

### Evidencia técnica que fija el diseño

| Punto | Evidencia | Consecuencia |
|---|---|---|
| Release exacta | `gh api repos/MystenLabs/sui/releases/tags/testnet-v1.83.0`: no prerelease, publicada 2026-10-27; tag → commit `16d2dc1e05edcf600320a82e17b9392edb0983a5` (= `sui 1.83.0-16d2dc1e05ed`) | Versión verificable por `sui --version` exacto |
| Asset Linux | `sui-testnet-v1.83.0-ubuntu-x86_64.tgz`, 1 191 250 401 B, `digest` `sha256:e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8`; trae además `sui-debug` (~4,5 GB) y otros binarios; el miembro buscado es `./sui` (verificado por el MAYOR) | Checksum fijado; extraer solo `./sui` |
| Binario | `sha256sum ~/.local/bin/sui` = `29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa`, igual al `./sui` del asset (MAYOR) | `SUI_BIN_SHA256` verificable en cada run; al subir de versión se toma del binario local instalado con `suiup` |
| `suiup` | v0.1.1 usa el mismo asset (`download.rs:175-177`, Linux → `ubuntu`; `mod.rs:313-400`), sin SHA-256 (solo MD5 si hay `.md5`, `download.rs:315-440`) | D-20261030-13 (2) |
| Sin action oficial | Org `MystenLabs` sin action de setup de la CLI | Solo actions `actions/*` |
| Prompt de claves | `crates/sui/src/sui_commands.rs` @ `testnet-v1.83.0`: `SuiCommand::Move` → `get_wallet_context` (:584) → `prompt_if_no_config` (:1630-1690): con stdin vacío la respuesta es `""` y **crea** clave; `-y/--yes` (:179-181) acepta sin preguntar | `printf 'n\n' |` en toda invocación; nunca `-y` |
| `SUI_CONFIG_DIR` | `crates/sui-config/src/lib.rs:45-59` | Config en `$RUNNER_TEMP/sui_config` |
| Forma del `client.yaml` | `crates/sui-sdk/src/sui_client_config.rs:22-32,90-98`; `crates/sui-keys/src/keystore.rs:267-275,401-430`; `SUI_TESTNET_URL` (`crates/sui-sdk/src/lib.rs:36`) | Config mínima reproducible |
| Caché de deps Move | `MOVE_HOME` = `~/.move` (`move-command-line-common/src/env.rs:28-37`), git en `$MOVE_HOME/git` (`move-package/src/git/cache.rs:26-33`) | Caché `~/.move/git` |
| PV → framework | `crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.83.0`: 108 claves **no consecutivas** (…`130,132,135,136,137,138,139,140`), `"139"` = `719fb29…`, `"140"` = `05ad86a…`; rige la clave más alta ≤ PV | Comparación por piso |
| PV máxima de la CLI | `crates/sui-protocol-config/src/lib.rs:41` @ `testnet-v1.83.0`: `const MAX_PROTOCOL_VERSION: u64 = 140;` | Aviso "CLI atrasada" sin falsos positivos por huecos del manifest |
| PV vigente | `POST https://graphql.testnet.sui.io/graphql` `{ epoch { epochId protocolConfigs { protocolVersion } } }` → `{"epochId":1269,"protocolVersion":140}`; un `curl: (35)` TLS transitorio observado por el MAYOR | `--retry-all-errors` |
| Actions | `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`; `actions/cache` v6.1.0 = `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` (trae `restore/` y `save/` con `node24` en ese SHA; la action combinada guarda con `post-if: success()`) | Fijadas por SHA; restore/save separados para la CLI |
| Docs de GitHub | `shell: bash` explícito ⇒ `bash --noprofile --norc -eo pipefail {0}`; `permissions`: lo no declarado queda en `none`; concurrencia: un run nuevo cancela el `pending` del mismo grupo aunque `cancel-in-progress` sea `false`; "Pin references to actions to a commit SHA"; caché: 10 GB/repo, 7 días sin uso, PRs restauran de base/default | Diseño de shell, permisos, concurrencia y caché |
| `gh` local | `gh 2.46.0`: `gh pr checks` tiene `--required` y `--watch`, no `--json` | Definición de "CI verde" |

### Alcance

- `.github/workflows/ci.yml` (`name: CI`) con el job **`contracts`** (bloqueante; check = `contracts`),
  el job **`framework-drift`** (informativo, nunca requerido) y el hueco documentado del job `app` (#9).
- Docs (TASK-2): `agents.md`, `documents/STATUS.md`, `documents/ESTANDARES.md`,
  `documents/agentes/ORQUESTADOR.md`, `documents/agentes/AGENTE_DEV.md`, `documents/FLUJO_AGENTES.md`.

### Fuera de alcance

- Job `app` (#9), deploy (#15), publicación y repin del lock (#8), cobertura en CI.
- Disparador `schedule` para H13 (el pre-vuelo de #8 lo cubre; si se quiere, issue aparte).
- Aplicar la protección de `master` y el setting de SHA de Actions (D-20261030-13 (3)(4), post-merge).
- `actionlint` u otra herramienta nueva (SEG-8): el propio run valida el YAML.
- **Desviación de la letra del issue a declarar en el body del PR:** el run rojo no se hace con un
  commit "revertido antes del merge" en la feature sino en una branch desechable (ver Decisiones
  internas y TASK-1 §Runs rojos), para no dejar commits rojos en `master` con merge commit.

## Contrato on-chain

Sin cambios. No se toca `contracts/sources/`, `contracts/tests/` ni `contracts/Move.toml`/`Move.lock`
en la feature; el workflow verifica que `Move.lock` no cambie. Sin impacto en `app/src/sui/` ni en
compatibilidad de upgrade. Los archivos `ci_*_check.move` solo existen en la branch desechable.

## Flujo de fondos

No aplica (CI sin transacciones, sin claves).

## Cómo encaja con D-20261030-09 (merge por el orquestador)

- "CI verde" = el check **`contracts`** del **head actual** del PR en `success`. `framework-drift` es
  informativo: hoy llevará un warning (lock en PV 139, testnet en 140) y no condiciona el merge.
- **Comando exacto** (TASK-2 lo lleva a `ORQUESTADOR.md`):
  - Con la protección de D-20261030-13 (3) activa: `gh pr checks <N> --required` (exit 0 y `contracts`
    en `pass`).
  - Antes de activarla (incluido el propio PR de #3):
    `gh pr view <N> --json headRefOid,statusCheckRollup --jq '{head: .headRefOid, contracts: [.statusCheckRollup[] | select(.name=="contracts") | .conclusion]}'`
    → `contracts` = `["SUCCESS"]` sobre el `head` actual.
- Con la protección activa y sin bypass, GitHub rechaza el merge si `contracts` no está en verde, también
  para el orquestador (sesión del owner).
- Los PRs de housekeeping (solo docs) también corren `contracts` (sin filtro por `paths`).

## Decisiones abiertas → STOP

Ninguna abierta. Las cuatro del v1 las resolvió el usuario en **D-20261030-13**. El job no necesita
secretos de GitHub (no usa `secrets.*` ni pasa `GITHUB_TOKEN` a ningún binario).

## Decisiones resueltas (D-20261030-13)

### STOP-1 — Protección de `master` con el check requerido `contracts`

> Decisión (2026-10-30): opción (a) — protección clásica de `master` con `contracts` requerido, sin reviews obligatorias, sin "require branches to be up to date", sin bypass (también admins); se aplica **después** del merge de #3 y la ejecuta el usuario, o el orquestador solo con autorización expresa del usuario en ese momento — aprobado por el usuario (D-20261030-13).

Evidencia del v1: `gh api …/branches/master` → `protected: false`; `/rulesets` → `[]`. El check debe
haber corrido en el repo para poder seleccionarlo. Queda en "Pendientes del usuario" de STATUS.

### STOP-2 — Build, lint y test bloqueantes con `--warnings-are-errors`

> Decisión (2026-10-30): opción (a) — `sui move build -e testnet --warnings-are-errors`, `sui move build -e testnet --lint --warnings-are-errors` y `sui move test -e testnet --warnings-are-errors`, los tres bloqueantes y también forma canónica local (PROY-18); si el run rojo de lint muestra que el flag no convierte los lints en error, se vuelve a este STOP — aprobado por el usuario (D-20261030-13).

El MAYOR confirmó en el código fuente que el flag promueve todo `Severity::Warning`, lints incluidos
(`move-compiler/src/diagnostics/mod.rs:442-452`); el run rojo de lint queda como confirmación empírica.

### STOP-3 — CLI en CI desde el archivo del release con SHA-256

> Decisión (2026-10-30): opción (a) — en CI, binario `sui` del asset oficial `sui-testnet-v<versión>-ubuntu-x86_64.tgz` verificado por SHA-256 y cacheado con `actions/cache`; en local sigue `suiup`; PROY-17 se reescribe en ese sentido — aprobado por el usuario (D-20261030-13).

### STOP-4 — Exigir actions fijadas por SHA completo en los settings del repo

> Decisión (2026-10-30): opción (a) — activar "Require actions to be pinned to a full-length commit SHA"; se aplica **después** del merge de #3 y la ejecuta el usuario, o el orquestador solo con autorización expresa del usuario en ese momento — aprobado por el usuario (D-20261030-13).

## Decisiones internas (actuar y reportar)

> Decisión (2026-10-30): actions de primera parte fijadas por **SHA de commit** con el tag en comentario, más estricto que el "al menos por versión mayor" del issue, porque la guía de GitHub ("Secure use") lo recomienda y D-20261030-13 (4) lo hará obligatorio.

> Decisión (2026-10-30): runner `ubuntu-24.04` fijo en lugar de `ubuntu-latest`, porque `-latest` pasará a 26.04 sin cambio en el repo.

> Decisión (2026-10-30): versión de la CLI en un único bloque `env` a nivel de workflow (`SUI_VERSION`, `SUI_COMMIT`, `SUI_TGZ_SHA256`, `SUI_BIN_SHA256`), compartido por los dos jobs (criterio del issue: "un único lugar").

> Decisión (2026-10-30): el chequeo H13 va en un **job separado** que termina en éxito y emite `::warning::` + resumen, para que nunca pueda volverse requerido ni teñir el check que gatea el merge.

> Decisión (2026-10-30): `actions/checkout` con `persist-credentials: false` en ambos jobs: ningún step necesita el token en `.git/config`.

> Decisión (2026-10-30): concurrencia con grupo por PR (`pr-<N>`, cancela runs viejos del mismo PR) y por commit en push (`github.sha`), porque con un grupo por ref un merge + housekeeping seguidos cancelaría el run `pending` del primer merge commit de `master` (hallazgo 3).

> Decisión (2026-10-30): caché de la CLI con `actions/cache/restore` + `actions/cache/save` (save justo tras instalar y verificar), porque la action combinada solo guarda si todo el job sale verde (hallazgo 5). La caché de `~/.move/git` (≈55 MB) sigue con la action combinada.

> Decisión (2026-10-30): los runs rojos se hacen en la branch desechable `ci/red-check-issue-3` dentro de un `git worktree` aparte, con PR borrador que se cierra sin mergear; el contenido de los commits rojos lo fija este plan y el DEV lo verifica en local en una copia del paquete fuera del repo; el orquestador solo lo transcribe y pushea (hallazgo 6).

> Decisión (2026-10-30): se aceptan las sugerencias 🔵 10–13 del MAYOR (`--retry-all-errors`, `SUI_BIN_SHA256` en cada run, `test ! -e "$HOME/.sui"`, `SUI_VERSION` en la clave de `~/.move/git`): costo mínimo, más robustez.

---

## Tasks (ordenados por dependencia)

### TASK-1: Workflow `CI` con el job `contracts` y el job informativo `framework-drift` — área: ci

- **Entregable:** `.github/workflows/ci.yml`; verificación local de los gates en la forma nueva y de los
  dos archivos rojos; evidencia de runs (verde, cache hit, rojo de compilación, rojo de lint).
- **Archivos afectados (feature):** crear `.github/workflows/ci.yml`. **No tocar** nada bajo
  `contracts/`, `.gitignore`, `package.json`, `.nvmrc`, ni archivos sin trackear de otros ciclos.
- **Cambios — modelo** (el handoff lo fija definitivo):

```yaml
name: CI

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

permissions:
  contents: read

concurrency:
  # PR: un grupo por PR; un push nuevo cancela el run anterior del mismo PR.
  # push a master: un grupo por commit; ningún run de master se cancela ni se descarta en cola.
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  # Única fuente de la versión de la Sui CLI en CI: debe coincidir con documents/STATUS.md (Toolchain).
  # Al subir de versión: SUI_TGZ_SHA256 = gh api repos/MystenLabs/sui/releases/tags/testnet-v<versión> --jq '.assets[] | .name + " " + .digest'
  #                      SUI_BIN_SHA256 = sha256sum del binario `sui` de esa versión instalado en local con suiup
  SUI_VERSION: "1.83.0"
  SUI_COMMIT: "16d2dc1e05ed"
  SUI_TGZ_SHA256: "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8"
  SUI_BIN_SHA256: "29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa"

jobs:
  contracts:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    defaults:
      run:
        shell: bash                 # explícito: -eo pipefail (el default implícito no trae pipefail)
        working-directory: contracts
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - name: Restore Sui CLI cache
        id: sui-cache
        uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.cache/sui-cli/${{ env.SUI_VERSION }}
          key: sui-cli-${{ runner.os }}-${{ runner.arch }}-${{ env.SUI_VERSION }}-${{ env.SUI_TGZ_SHA256 }}

      - name: Install Sui CLI (release testnet, SHA-256 verificado)
        if: steps.sui-cache.outputs.cache-hit != 'true'
        run: |
          cd "$RUNNER_TEMP"
          asset="sui-testnet-v${SUI_VERSION}-ubuntu-x86_64.tgz"
          curl -fsSL --retry 3 --retry-all-errors -o "$asset" \
            "https://github.com/MystenLabs/sui/releases/download/testnet-v${SUI_VERSION}/${asset}"
          echo "${SUI_TGZ_SHA256}  ${asset}" | sha256sum -c -
          mkdir sui-release
          tar -xzf "$asset" -C sui-release ./sui          # solo el binario `sui`
          test -f sui-release/sui || { echo "::error::el archivo no trae ./sui"; exit 1; }
          install -D -m 0755 sui-release/sui "$HOME/.cache/sui-cli/${SUI_VERSION}/sui"
          rm -rf "$asset" sui-release

      - name: Verify Sui CLI binary (SHA-256, cada run)
        run: echo "${SUI_BIN_SHA256}  $HOME/.cache/sui-cli/${SUI_VERSION}/sui" | sha256sum -c -

      - name: Save Sui CLI cache
        if: steps.sui-cache.outputs.cache-hit != 'true'
        uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.cache/sui-cli/${{ env.SUI_VERSION }}
          key: ${{ steps.sui-cache.outputs.cache-primary-key }}

      - name: Add Sui CLI to PATH
        run: echo "$HOME/.cache/sui-cli/${SUI_VERSION}" >> "$GITHUB_PATH"

      - name: Keyless Sui config (D-20261030-07, STATUS H11)
        run: |
          cfg="$RUNNER_TEMP/sui_config"
          mkdir -p "$cfg"
          printf '[]\n' > "$cfg/sui.keystore"
          cat > "$cfg/client.yaml" <<EOF
          ---
          keystore:
            File: $cfg/sui.keystore
          envs:
            - alias: testnet
              rpc: "https://fullnode.testnet.sui.io:443"
              ws: ~
              basic_auth: ~
          active_env: testnet
          active_address: ~
          EOF
          echo "SUI_CONFIG_DIR=$cfg" >> "$GITHUB_ENV"

      - name: Check Sui CLI version
        run: |
          actual="$(printf 'n\n' | sui --version)"
          echo "$actual"
          [ "$actual" = "sui ${SUI_VERSION}-${SUI_COMMIT}" ]

      - name: Cache Move git dependencies
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.move/git
          key: move-git-${{ runner.os }}-${{ env.SUI_VERSION }}-${{ hashFiles('contracts/Move.lock') }}

      - name: Build (warnings como error)
        run: printf 'n\n' | sui move build -e testnet --warnings-are-errors
      - name: Lint (warnings como error)
        run: printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors
      - name: Test (warnings como error)
        run: printf 'n\n' | sui move test -e testnet --warnings-are-errors

      - name: Move.lock y árbol sin cambios tras los gates (PROY-11)
        if: ${{ !cancelled() }}
        run: |
          git diff --exit-code -- Move.lock
          git status --porcelain --untracked-files=all
          test -z "$(git status --porcelain --untracked-files=all)"

      - name: Guarda de cero claves
        if: ${{ !cancelled() }}
        run: |
          ls -A "$SUI_CONFIG_DIR"
          test "$(tr -d '[:space:]' < "$SUI_CONFIG_DIR/sui.keystore")" = "[]" \
            || { echo "::error::el keystore de CI no está vacío"; exit 1; }
          test -z "$(find "$SUI_CONFIG_DIR" -name '*.keystore' ! -name sui.keystore)" \
            || { echo "::error::apareció otro keystore en SUI_CONFIG_DIR"; exit 1; }
          test ! -e "$HOME/.sui" \
            || { echo "::error::existe ~/.sui: la CLI ignoró SUI_CONFIG_DIR"; exit 1; }

  # TODO(#9): job `app` (Node de .nvmrc con actions/setup-node fijada por SHA; npm ci; lint, typecheck,
  # test y build -w app), sin `needs` sobre `contracts` para que corran en paralelo.

  framework-drift:
    # Informativo (STATUS H13): nunca bloquea ni será check requerido; avisa con ::warning:: y en el resumen.
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    continue-on-error: true
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: PV de testnet vs framework pineado en Move.lock
        timeout-minutes: 3
        continue-on-error: true
        shell: bash --noprofile --norc {0}     # sin -e: el script decide y termina siempre en 0
        run: |
          # ver "Lógica de framework-drift"
```

- **Lógica de `framework-drift`** (sin `sui`, sin claves; `curl -fsS --max-time 20 --retry 3 --retry-all-errors`
  y `jq` del runner; todo fallo de red o de parseo ⇒ `::warning title=H13::…` y `exit 0`):
  1. `LOCK_REV` = `rev` (40 hex) de la línea `source` de `[pinned.testnet.Sui]` en `contracts/Move.lock`;
     si `[pinned.testnet.MoveStdlib]` tiene otro rev ⇒ warning.
  2. `TESTNET_PV` y `EPOCH` = GraphQL `POST https://graphql.testnet.sui.io/graphql` con
     `{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}` →
     `.data.epoch.protocolConfigs.protocolVersion` y `.data.epoch.epochId`.
  3. `MANIFEST` = `https://raw.githubusercontent.com/MystenLabs/sui/testnet-v${SUI_VERSION}/crates/sui-framework-snapshot/manifest.json`.
     - `EXPECTED_PV` = la clave numérica más alta **≤ `TESTNET_PV`**; `EXPECTED_REV` = su `git_revision`.
     - `LOCK_PV` = la clave cuyo `git_revision` == `LOCK_REV` (los revisions son únicos); vacía ⇒
       warning "el rev del lock no está en el manifest de la CLI ${SUI_VERSION}".
  4. `CLI_MAX_PV` = número de `^const MAX_PROTOCOL_VERSION: u64 = ([0-9]+);` en
     `https://raw.githubusercontent.com/MystenLabs/sui/testnet-v${SUI_VERSION}/crates/sui-protocol-config/src/lib.rs`.
  5. Avisos:
     - `TESTNET_PV > CLI_MAX_PV` ⇒ "CLI atrasada: testnet en PV X, la CLI ${SUI_VERSION} llega a Y (pre-vuelo #8, paso 1)".
     - `LOCK_REV != EXPECTED_REV` ⇒ "Move.lock en PV `LOCK_PV` (`LOCK_REV` corto); el framework vigente en testnet (PV X) es el de PV `EXPECTED_PV` (`EXPECTED_REV` corto): repinear en el pre-vuelo de #8 (paso 2)".
  6. Tabla en `$GITHUB_STEP_SUMMARY`: época, PV testnet, `EXPECTED_PV`/rev, `LOCK_PV`/rev, `CLI_MAX_PV`, veredicto.
  7. `exit 0` siempre.
- **AuthZ:** `permissions: contents: read` (todo lo demás `none`); ningún step usa `secrets.*` ni
  `GITHUB_TOKEN`; el workflow no genera, lee ni imprime claves (keystore `[]` propio; nunca `sui client`,
  `sui keytool` ni `-y`).

#### Lo que prepara el DEV (sin commits ni pushes)

1. Escribe `.github/workflows/ci.yml` (modelo de arriba + lógica de `framework-drift`).
2. Corre los gates locales en la forma canónica nueva (TASK-1 no toca `contracts/`, debe dar el baseline:
   0 warnings, 0 lints, 26 PASS, `Move.lock` sin delta).
3. Verifica los dos commits rojos **fuera del repo**, en una copia del paquete en su scratchpad
   (p. ej. `cp -r contracts "$SCRATCH/red-check"` y `rm -rf "$SCRATCH/red-check/build"`), con el
   contenido literal de abajo, corriendo allí build y lint con los flags nuevos:
   - con solo `ci_red_check.move` agregado: build **falla** (error de tipos);
   - con `ci_red_check.move` quitado y `ci_lint_check.move` agregado: build **pasa**, lint **falla** con `WSL06010`.
   El working tree de la feature no cambia (`git status --porcelain` igual antes y después).
4. Reporta con la plantilla de FLUJO §5 y los comandos de verificación de abajo.

Contenido literal de los archivos rojos (solo en la copia del DEV y en la branch desechable; nunca en la feature):

`contracts/sources/ci_red_check.move`
```move
// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Rojo provocado de CI (#3): error de tipos a propósito. Nunca se mergea.
module battleship::ci_red_check;

public fun broken(): u64 { true }
```

`contracts/sources/ci_lint_check.move`
```move
// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Rojo provocado de CI (#3): dispara WSL06010 (prefer_mut_tx_context) sin warnings de compilación. Nunca se mergea.
module battleship::ci_lint_check;

public fun touch(_ctx: &TxContext) {}
```

#### Lo que hace el orquestador (tras la revisión MID del reporte del DEV)

1. Commitea TASK-1 en `feature/issue-3-ci`, pushea y abre el PR **borrador** contra `master`
   (dispara `pull_request`). Espera: `gh run watch <id> --exit-status` (o `gh pr checks <N> --watch`).
   Relanza una vez (`gh run rerun <id>`) para la evidencia de cache hit.
2. Runs rojos, en un worktree aparte (el working tree principal no se toca):
   1. `git worktree add /home/santiago/Projects/Battleship-ci-red-check -b ci/red-check-issue-3 feature/issue-3-ci`
   2. En el worktree: crear `contracts/sources/ci_red_check.move` (contenido literal), commit
      `ci: provoke a compile error (do not merge, #3)`, `git push -u origin ci/red-check-issue-3`,
      `gh pr create --draft --base master --head ci/red-check-issue-3 --title "[no merge] CI red check (#3)" --body "Rojo provocado para la evidencia de #3; se cierra sin mergear."`.
   3. **Esperar a que termine** el run (`gh run watch <id>`; no pushear antes, o `cancel-in-progress`
      lo cancela). Esperado: `contracts` = `failure` en el step Build.
   4. En el worktree: `git rm contracts/sources/ci_red_check.move` + crear
      `contracts/sources/ci_lint_check.move` (contenido literal), commit
      `ci: provoke a lint error (do not merge, #3)`, push. **Esperar a que termine.** Esperado: Build
      `success`, Lint `failure`, Test `skipped`.
   5. `gh pr close <N> --delete-branch`; `git worktree remove /home/santiago/Projects/Battleship-ci-red-check`;
      `git branch -D ci/red-check-issue-3`; en la feature, `git status --porcelain` sin cambios y
      `git worktree list` con un solo worktree. Los links de los runs siguen válidos.
3. Pasa al MID/DEV los ids y links de los runs para el reporte.

#### Criterio de aceptación (DoD verificable)

1. Run del PR de la feature con `contracts` en `success`: `sha256sum` "OK" del `.tgz` y del binario,
   `sui 1.83.0-16d2dc1e05ed`, build/lint/test con exit 0, `Test result: OK. Total tests: 26`,
   `git status --porcelain` vacío y la guarda de claves en verde.
2. Re-run con **cache hit** de la CLI (sin step Install) y de `~/.move/git`, y verificación del binario en verde.
3. `framework-drift` en `success` con el warning esperado hoy: lock en PV 139 (`719fb29`); vigente en
   testnet PV 140 → `EXPECTED_PV` 140 (`05ad86a`); sin warning de "CLI atrasada" (`CLI_MAX_PV` = 140).
4. Run rojo de compilación (`contracts` = `failure` en Build) y run rojo de lint (Build `success`,
   Lint `failure`) en `ci/red-check-issue-3`, cada uno terminado (no cancelado).
5. Gates locales en la forma nueva en el baseline; `Move.lock` sin delta; verificación local de los rojos
   con los resultados esperados.

#### Comandos de verificación que el DEV pega (comando + output completos)

- `git rev-parse --short HEAD && git status --porcelain --untracked-files=all` (esperado: solo
  `?? .github/workflows/ci.yml` más los sin trackear ajenos al ciclo que ya hubiera, listados).
- `printf 'n\n' | sui --version` y, desde `contracts/`, `printf 'n\n' | sui move build -e testnet --warnings-are-errors`,
  `printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors`,
  `printf 'n\n' | sui move test -e testnet --warnings-are-errors`, cada uno con `; echo "exit=$?"`.
- `git diff --exit-code -- contracts/Move.lock; echo "exit=$?"` (esperado `exit=0`).
- Los mismos build/lint en la copia roja (dos estados), con `; echo "exit=$?"` (esperado: build `exit≠0`;
  luego build `exit=0` y lint `exit≠0` con `WSL06010` en el output).
- `grep -n -E 'uses:' .github/workflows/ci.yml` (esperado: 5 líneas) y
  `grep -c -E 'uses: actions/(checkout|cache(/restore|/save)?)@[0-9a-f]{40} # v[0-9.]+$' .github/workflows/ci.yml` (esperado `5`).
- `grep -n -E '\bsui (move|client|keytool|--version|start)' .github/workflows/ci.yml` (esperado: 4
  líneas — version, build, lint, test) y `grep -c -F "printf 'n\n' | sui" .github/workflows/ci.yml` (esperado `4`).
- `grep -n -E 'sui (client|keytool)|--yes|[[:space:]]-y([[:space:]]|$)|secrets\.|GITHUB_TOKEN' .github/workflows/ci.yml; echo "exit=$?"`
  (esperado: 0 líneas, `exit=1`).
- `git diff -U0 master -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"`
  (esperado: 0 líneas, `exit=1`).
- Runs (los aporta el orquestador): `gh run list --workflow ci.yml --limit 10` y, por run citado,
  `gh run view <id> --json url,conclusion,headSha,jobs --jq '{url,conclusion,headSha,jobs:[.jobs[]|{name,conclusion}]}'`;
  fragmentos de `gh run view <id> --log --job <job-id>` (install/verify, version, build, lint, test,
  Move.lock, guarda y el warning de `framework-drift`).

- **Tests esperados:** sin tests nuevos de Move; la prueba del workflow son los runs.
- **Riesgos / rollback:**
  - El run rojo de lint sale verde ⇒ el flag no promueve lints: se reporta y se vuelve a D-20261030-13 (1).
  - El `client.yaml` mínimo no lo acepta la CLI ⇒ el DEV compara solo **nombres de campos** con su config
    local sin claves (sin pegar contenido) y ajusta; desviación declarada.
  - `pipefail` + SIGPIPE de `printf` si `sui` terminara antes de leer: improbable; si aparece, log al reporte.
  - Fallo de caché ⇒ 1,2 GB de descarga y ~236 MB en disco. Rollback: borrar `ci.yml`.

### TASK-2: Docs alineadas con la CI — área: docs

- **Entregable:** docs que describen el workflow, la forma canónica de los gates, qué es "CI verde" y
  quién aplica la configuración del repo.
- **Archivos afectados (rutas verificadas en `c2a1e42`):**
  - `agents.md`: §2 (`.github/workflows/` existe desde #3); `agents.md:52-54` (Toolchain: `suiup` en
    local; en CI, el binario del mismo release verificado por SHA-256 — D-20261030-13 (2));
    `agents.md:63-74` (tabla con las tres formas canónicas de D-20261030-13 (1), lint ya no
    "informativo"); `agents.md:87` ("Gate completo" = job `contracts`; `framework-drift` informativo);
    §11 (fila "CI": versión en el `env` del workflow = la de STATUS).
  - `documents/STATUS.md`: Toolchain (fila "CI": `ci.yml`, `ubuntu-24.04`, `SUI_VERSION`/`SUI_COMMIT`
    = local, cómo actualizar `SUI_TGZ_SHA256` y `SUI_BIN_SHA256`); Baselines (`:46`, fila CI con los
    links de los runs); H11 (`:65`, parte de #3 ✅); H13 (`:67`, aviso de `framework-drift`); "Pendientes
    del usuario" (`:114`): protección de `master` y setting de SHA de Actions, con el texto de
    D-20261030-13 (después del merge de #3; el usuario, o el orquestador solo con autorización expresa
    del usuario en ese momento); ciclo activo/backlog.
  - `documents/ESTANDARES.md:83-84`: PROY-17 (texto de D-20261030-13 (2)) y PROY-18 (`contracts` es el
    check que bloquea; el job informativo no), bump de versión del documento.
  - `documents/agentes/ORQUESTADOR.md:29`: "CI verde" con los dos comandos exactos de "Cómo encaja con
    D-20261030-09"; quién aplica la configuración del repo según D-20261030-13.
  - `documents/agentes/AGENTE_DEV.md:50`: checklist de contracts con build, lint y test en la forma
    canónica de `agents.md` §3.
  - `documents/FLUJO_AGENTES.md:91`: plantilla del reporte con build / lint / test (warnings como error).
  - `documents/DECISIONES.md`: **se cita** D-20261030-13 (no se reescribe). Solo si surge una decisión
    nueva en la implementación se agrega con ID desde **D-20261030-15** (D-20261030-14 es la licencia).
- **Cambios:** solo texto; sin snippets salvo los comandos canónicos.
- **AuthZ:** no aplica.
- **Criterio de aceptación:** las tres formas de gate de `agents.md` §3, `AGENTE_DEV.md` y
  `FLUJO_AGENTES.md` coinciden carácter a carácter con los `run:` del job `contracts`; STATUS y el `env`
  del workflow dicen la misma versión y commit; ninguna referencia a "CI no existe" ni a "lint
  informativo" queda viva; el texto de quién aplica protección/settings coincide con D-20261030-13;
  PROY-20 cumplida.
- **Verificación (comando + output completos):**
  - `grep -n -F "sui move" agents.md documents/agentes/AGENTE_DEV.md documents/FLUJO_AGENTES.md .github/workflows/ci.yml`
    (el MID compara las formas).
  - `grep -n -E 'informativo hasta|CI \| — \| ⬜' agents.md documents/STATUS.md; echo "exit=$?"` (esperado `exit=1`).
  - `grep -n -E 'CI verde|--required|statusCheckRollup|ci\.yml|framework-drift|D-20261030-13' agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/ORQUESTADOR.md documents/agentes/AGENTE_DEV.md documents/FLUJO_AGENTES.md`.
  - `grep -n -E 'D-20261030-1[3-9]' documents/DECISIONES.md` (esperado: 13 y 14 una vez cada uno; 15+ solo si hubo decisión nueva).
  - `git diff -U0 master -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"`
    (esperado `exit=1`; si una línea de prosa nueva coincide, listarla y justificarla).
- **Tests esperados:** no aplica (docs).
- **Riesgos / rollback:** desalineación doc ↔ workflow ⇒ la detecta el grep comparado; revertir el commit.

---

## Smoke

No aplica: es tooling; la evidencia son los runs de Actions (verde, cache hit, rojo de compilación y
rojo de lint) enlazados en el reporte.

## Orden y operación

1. ✅ STOPs resueltos (D-20261030-13); branch al día con `master` @ `c2a1e42` (orquestador).
2. MAYOR revisa el plan v1.1 → MID genera `HANDOFF_CI.md` (separa DEV / orquestador como arriba).
3. DEV TASK-1 (prepara y verifica en local) → MID revisa → orquestador commitea, pushea, abre el PR
   **borrador**, corre los runs rojos en el worktree y aporta los links → MID cierra la revisión de TASK-1.
4. DEV TASK-2 → MID revisa → orquestador commitea; PR listo → MAYOR integración → merge con `contracts`
   en verde (D-20261030-09, comando de "CI verde") → housekeeping.
5. Después del merge: protección de `master` y setting de SHA de Actions (D-20261030-13 (3)(4)): el
   usuario, o el orquestador solo con autorización expresa del usuario en ese momento.
