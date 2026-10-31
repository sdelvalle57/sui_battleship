# HANDOFF_CI
> Plan: PLAN_CI v1.1 (aprobado por el MAYOR, "Revisión v1.1" de `documents/REVISION_PLAN_CI.md`) | Issue: #3 |
> Branch: `feature/issue-3-ci` (sobre `master` @ `c2a1e42`; HEAD `0a56a29`) | Versión: v1 | Fecha: 2026-10-30
> Incorpora N1 (orden de limpieza), N2 (presupuesto de `curl`/timeouts) y N3 (comandos literales de la verificación roja).

Este handoff tiene dos actores por task:

- **DEV:** escribe archivos, verifica en local todo lo que se puede verificar y reporta. **Nunca**
  commitea, pushea, abre PRs ni toca branches/worktrees.
- **Orquestador:** commitea (tras la revisión MID), pushea, abre/cierra PRs, observa los runs
  (`gh run`, `gh pr checks`), opera la branch desechable con su worktree, limpia y devuelve la
  evidencia de los runs para el reporte.

Fuera de este ciclo: `documents/PLAN_GAME.md` (sin trackear, ciclo #5) **no se toca ni se stagea**.

---

## 0. Baseline de gates verificado (2026-10-30, `master` @ `c2a1e42`)

| Gate (forma vigente hasta este ciclo, desde `contracts/`, `printf 'n\n' |` delante) | Resultado |
|---|---|---|
| `sui --version` | `sui 1.83.0-16d2dc1e05ed` (release `testnet`, `suiup` 0.1.1) |
| `sui move build -e testnet` | exit 0 · **0 errores, 0 warnings** |
| `sui move build -e testnet --lint` | exit 0 · **0 lints** |
| `sui move test -e testnet` | exit 0 · 0 warnings · **26 tests PASS** |

Fuente: `documents/STATUS.md:38-40` (medido en `040f3c0`) y re-medido por el DEV en el PR #26
(body: "build exit 0 / 0 warnings · `--lint` exit 0 / 0 lints · test 26/26 PASS. Cero delta"). Entre
`68d1afe` y `c2a1e42` el único cambio en `contracts/` es el comentario de copyright de
`contracts/sources/house.move:1` (D-20261030-14). `Move.lock` sin cambios desde #1
(`rev = 719fb2960ccfbf9f4d33041f8ea5146d30671696`, PV 139). CI: no existe (`STATUS.md:46`).

## Decisiones del owner (no reabrir)

| # | Decisión | Origen |
|---|---|---|
| D1 | Build, `--lint` y test con `-e testnet --warnings-are-errors`, los tres **bloqueantes**, y esa es también la forma canónica local (PROY-18). Si el run rojo de lint sale verde, se vuelve al usuario | D-20261030-13 (1) |
| D2 | En CI la CLI sale del asset oficial del release verificado por SHA-256 + `actions/cache`; en local sigue `suiup`; PROY-17 se reescribe | D-20261030-13 (2) |
| D3 | Protección clásica de `master` con `contracts` requerido, sin reviews, sin "up to date", sin bypass (también admins) | D-20261030-13 (3) |
| D4 | Settings de Actions: exigir actions fijadas por SHA completo | D-20261030-13 (4) |
| D5 | D3 y D4 se aplican **después** del merge de #3; los ejecuta el usuario, o el orquestador solo con autorización expresa del usuario en ese momento | D-20261030-13 |
| D6 | Config de la CLI sin claves; nunca generar claves; `printf 'n\n' |` delante de todo `sui` | D-20261030-07, STATUS H11 |
| D7 | El orquestador mergea con merge commit cuando la CI está verde | D-20261030-09 |
| D8 | Cabecera Apache-2.0 en los fuentes Move (también en los archivos rojos desechables) | D-20261030-14 |

Decisiones nuevas que surjan en este ciclo: ID desde **D-20261030-15**.

---

## TASK-1: Workflow `CI` (`contracts` + `framework-drift`) — área: ci

### 1. Historia de usuario del task

**Como** owner que delega los merges en el orquestador, **quiero** que GitHub Actions compile, pase
lints y tests del paquete Move en cada PR contra `master` y en cada push a `master`, con la CLI
`1.83.0` verificada por SHA-256, sin claves y sin tocar `Move.lock`, y que avise (sin bloquear) si el
framework pineado quedó por detrás de testnet, **para** que un rojo nunca llegue a `master` y "CI
verde" sea un hecho verificable antes de mergear.

**Scope:** `.github/workflows/ci.yml` y la evidencia de cuatro runs (verde, cache hit, rojo de
compilación, rojo de lint). **No entrega:** docs (TASK-2), job `app` (#9), protección del repo (D5).

### 2. Contexto

- No existe `.github/` (`git ls-files`). Gates canónicos actuales: `agents.md:63-74`.
- Forma del `client.yaml` sin claves y por qué `printf 'n\n' |`: `PLAN_CI.md` v1.1, tabla "Evidencia técnica"
  (`sui_commands.rs:584,1630-1690`, `sui_client_config.rs:22-32,90-98`, `keystore.rs:267-275,401-430` @ `testnet-v1.83.0`).
- Asset `sui-testnet-v1.83.0-ubuntu-x86_64.tgz`: SHA-256 `e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8`;
  miembro `./sui` con SHA-256 `29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa`
  (= `~/.local/bin/sui`). Hay una copia local del asset en `~/.cache/suiup/releases/` (la dejó `suiup`).
- Actions: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1),
  `actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9` (v6.1.0; incluye `restore/` y `save/`).
- H13: lock en PV 139 (`719fb29…`), testnet en PV 140 (`05ad86a…`); `MAX_PROTOCOL_VERSION` de 1.83.0 = 140.
  El script de `framework-drift` de abajo lo corrió el MID en local el 2026-10-30 (solo lecturas de red):
  emitió exactamente el warning esperado en ~1 s y, con una versión inexistente, el warning de manifest
  ilegible con `exit=0`.

### 3. Qué implementar

Crear `.github/workflows/ci.yml` **con este contenido** (literal; cualquier cambio va a Desviaciones):

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
          # ~1,2 GB: hasta 5 min por intento y reintentos dentro de 10 min (job: 20 min)
          curl -fsSL --connect-timeout 20 --max-time 300 --retry 3 --retry-all-errors --retry-max-time 600 \
            -o "$asset" "https://github.com/MystenLabs/sui/releases/download/testnet-v${SUI_VERSION}/${asset}"
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
    # Presupuesto: 3 descargas × (≤15 s por intento, reintentos dentro de 40 s) ≈ 3 min < 4 min del step.
    runs-on: ubuntu-24.04
    timeout-minutes: 6
    continue-on-error: true
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: PV de testnet vs framework pineado en Move.lock
        timeout-minutes: 4
        continue-on-error: true
        shell: bash --noprofile --norc {0}     # sin -e: el script decide y termina siempre en 0
        run: |
          warn() { echo "::warning title=H13::$1"; echo "- ⚠️ $1" >> "$GITHUB_STEP_SUMMARY"; }
          finished=0
          trap '[ "$finished" = 1 ] || warn "chequeo H13 incompleto: el script terminó antes de llegar al final"' EXIT
          curl_get() { curl -fsSL --max-time 15 --retry 3 --retry-all-errors --retry-max-time 40 "$@"; }
          is_int() { [[ "$1" =~ ^[0-9]+$ ]]; }
          RAW="https://raw.githubusercontent.com/MystenLabs/sui/testnet-v${SUI_VERSION}/crates"
          lock_rev() {
            sed -n "/^\[pinned\.testnet\.$1\]\$/,/^\[/p" contracts/Move.lock \
              | grep -oE 'rev = "[0-9a-f]{40}"' | head -n 1 | grep -oE '[0-9a-f]{40}'
          }
          LOCK_REV="$(lock_rev Sui)"
          STD_REV="$(lock_rev MoveStdlib)"
          if [ -z "$LOCK_REV" ]; then warn "no se encontró el rev de [pinned.testnet.Sui] en contracts/Move.lock"; finished=1; exit 0; fi
          [ "$STD_REV" = "$LOCK_REV" ] || warn "MoveStdlib (${STD_REV:-vacío}) y Sui (${LOCK_REV}) tienen revs distintos en Move.lock"

          GQL="$(curl_get -X POST -H 'content-type: application/json' \
            -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' \
            https://graphql.testnet.sui.io/graphql)"
          TESTNET_PV="$(jq -r '.data.epoch.protocolConfigs.protocolVersion // empty' <<<"$GQL" 2>/dev/null)"
          EPOCH="$(jq -r '.data.epoch.epochId // empty' <<<"$GQL" 2>/dev/null)"
          if ! is_int "$TESTNET_PV"; then warn "no se pudo leer la PV de testnet por GraphQL"; finished=1; exit 0; fi

          MANIFEST="$(curl_get "$RAW/sui-framework-snapshot/manifest.json")"
          EXPECTED_PV="$(jq -r --argjson pv "$TESTNET_PV" '[keys[] | tonumber | select(. <= $pv)] | max // empty' <<<"$MANIFEST" 2>/dev/null)"
          EXPECTED_REV="$(jq -r --arg k "$EXPECTED_PV" '.[$k].git_revision // empty' <<<"$MANIFEST" 2>/dev/null)"
          LOCK_PV="$(jq -r --arg r "$LOCK_REV" '[to_entries[] | select(.value.git_revision == $r) | .key | tonumber] | max // empty' <<<"$MANIFEST" 2>/dev/null)"
          if [ -z "$EXPECTED_REV" ]; then warn "no se pudo leer el manifest del framework de la CLI ${SUI_VERSION}"; finished=1; exit 0; fi
          [ -n "$LOCK_PV" ] || warn "el rev del lock (${LOCK_REV:0:12}) no está en el manifest de la CLI ${SUI_VERSION}"

          CLI_MAX_PV="$(curl_get "$RAW/sui-protocol-config/src/lib.rs" | sed -nE 's/^const MAX_PROTOCOL_VERSION: u64 = ([0-9]+);.*/\1/p' | head -n 1)"
          if ! is_int "$CLI_MAX_PV"; then
            warn "no se pudo leer MAX_PROTOCOL_VERSION de la CLI ${SUI_VERSION}"
          elif [ "$TESTNET_PV" -gt "$CLI_MAX_PV" ]; then
            warn "CLI atrasada: testnet en PV ${TESTNET_PV}, la CLI ${SUI_VERSION} llega a ${CLI_MAX_PV} (pre-vuelo #8, paso 1)"
          fi

          if [ "$LOCK_REV" != "$EXPECTED_REV" ]; then
            verdict="lock atrasado: repinear en el pre-vuelo de #8"
            warn "Move.lock en PV ${LOCK_PV:-?} (${LOCK_REV:0:12}); el framework vigente en testnet (PV ${TESTNET_PV}) es el de PV ${EXPECTED_PV} (${EXPECTED_REV:0:12}): repinear en el pre-vuelo de #8 (paso 2)"
          else
            verdict="lock al día"
          fi
          {
            echo "### H13 — framework pineado vs testnet (informativo)"
            echo ""
            echo "| Época | PV testnet | Framework vigente (PV / rev) | Move.lock (PV / rev) | PV máx. CLI ${SUI_VERSION} | Veredicto |"
            echo "|---|---|---|---|---|---|"
            echo "| ${EPOCH:-?} | ${TESTNET_PV} | ${EXPECTED_PV} / \`${EXPECTED_REV:0:12}\` | ${LOCK_PV:-?} / \`${LOCK_REV:0:12}\` | ${CLI_MAX_PV:-?} | ${verdict} |"
          } >> "$GITHUB_STEP_SUMMARY"
          finished=1
          exit 0
```

AuthZ / seguridad: `permissions: contents: read` (lo demás `none`); sin `secrets.*` ni `GITHUB_TOKEN`;
`pull_request` (no `_target`); keystore `[]` propio; nunca `sui client`, `sui keytool` ni `-y`.

### 4. Archivos a tocar / NO tocar

- **DEV crea:** `.github/workflows/ci.yml`.
- **DEV crea fuera del repo** (scratchpad): la copia roja del paquete y los archivos de simulación.
- **NO tocar:** `contracts/**` (ni `Move.lock`), `.gitignore`, `package.json`, `.nvmrc`, docs (TASK-2),
  `documents/PLAN_GAME.md`, `~/.sui/` (solo se lee indirectamente vía la CLI, como en todo gate).
- **Prohibido:** instalar herramientas nuevas (SEG-8; `actionlint` solo si ya está instalado), descargar
  el asset de 1,2 GB (se usa la copia de `~/.cache/suiup/releases/`).

### 5. Verificación obligatoria del DEV (comandos literales; pegar comando + output completos)

Preparación: `WORK=<ruta absoluta de tu scratchpad>/issue3 && mkdir -p "$WORK" && echo "$WORK"`.
`REPO=/home/santiago/Projects/Battleship`. Todo `sui` con `printf 'n\n' |` delante.

**V0 — estado inicial**
```bash
cd "$REPO" && git status -sb && git rev-parse --short HEAD && git status --porcelain --untracked-files=all
```
Esperado: branch `feature/issue-3-ci`; tras escribir `ci.yml`, solo `?? .github/workflows/ci.yml` (más
`?? documents/PLAN_GAME.md` si sigue ahí, ajeno al ciclo).

**V1 — validación del YAML**
```bash
cd "$REPO" && python3 -I - .github/workflows/ci.yml <<'PY'
import sys, yaml
d = yaml.safe_load(open(sys.argv[1]))
print("on:", d.get(True, d.get("on")))
print("permissions:", d["permissions"])
print("concurrency:", d["concurrency"])
print("env:", sorted(d["env"]))
for name, job in d["jobs"].items():
    print(name, job["runs-on"], job.get("timeout-minutes"), job.get("continue-on-error", False))
    for s in job["steps"]:
        print("   ", s.get("name") or s.get("uses"), "| if:", s.get("if"), "| timeout:", s.get("timeout-minutes"))
PY
command -v actionlint && actionlint .github/workflows/ci.yml; echo "actionlint exit=$?"
```
Esperado: jobs `contracts` y `framework-drift`; 4 claves de `env`; `framework-drift` con
`continue-on-error: True` y su step con `timeout: 4`. Si `actionlint` no está, se declara "no disponible".

**V2 — comandos de instalación contra la copia local del asset** (sin descargar)
```bash
mkdir -p "$WORK/install" && cd "$WORK/install" && rm -rf sui-release
asset="$HOME/.cache/suiup/releases/sui-testnet-v1.83.0-ubuntu-x86_64.tgz"
echo "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8  $asset" | sha256sum -c -
mkdir sui-release && time tar -xzf "$asset" -C sui-release ./sui && ls -la sui-release
echo "29e1beb96434d0d2e00642929dbab1d8813039b80c3eb514bbae2751fb2648fa  sui-release/sui" | sha256sum -c -
printf 'n\n' | ./sui-release/sui --version
rm -rf sui-release
```
Esperado: dos `OK`, un único archivo `sui`, `sui 1.83.0-16d2dc1e05ed`.

**V3 — config sin claves del workflow, ejecutada tal cual y usada por la CLI**
```bash
cd "$REPO" && python3 -I -c 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); print(next(s["run"] for j in d["jobs"].values() for s in j["steps"] if s.get("name")==sys.argv[2]), end="")' .github/workflows/ci.yml "Keyless Sui config (D-20261030-07, STATUS H11)" > "$WORK/keyless.sh"
rm -rf "$WORK/sim" && mkdir -p "$WORK/sim"
RUNNER_TEMP="$WORK/sim" GITHUB_ENV="$WORK/sim/github_env" bash --noprofile --norc -eo pipefail "$WORK/keyless.sh"; echo "exit=$?"
cat "$WORK/sim/github_env"; cat "$WORK/sim/sui_config/client.yaml"; cat "$WORK/sim/sui_config/sui.keystore"
cd "$REPO/contracts" && printf 'n\n' | SUI_CONFIG_DIR="$WORK/sim/sui_config" sui move build -e testnet --warnings-are-errors; echo "exit=$?"
ls -A "$WORK/sim/sui_config"; test "$(tr -d '[:space:]' < "$WORK/sim/sui_config/sui.keystore")" = "[]"; echo "keystore vacío exit=$?"
```
Esperado: `SUI_CONFIG_DIR=<WORK>/sim/sui_config`; build exit 0 **usando esa config** (la variable va
delante de `sui`, no de `printf`); en el directorio solo `client.yaml` y `sui.keystore`; keystore `[]`.
(La comprobación `test ! -e "$HOME/.sui"` no se puede simular en local: ahí existe la config de D-20261030-07.)

**V4 — script de `framework-drift` extraído del YAML**
```bash
cd "$REPO" && python3 -I -c 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); print(next(s["run"] for j in d["jobs"].values() for s in j["steps"] if s.get("name")==sys.argv[2]), end="")' .github/workflows/ci.yml "PV de testnet vs framework pineado en Move.lock" > "$WORK/drift.sh"
: > "$WORK/summary.md" && GITHUB_STEP_SUMMARY="$WORK/summary.md" SUI_VERSION=1.83.0 bash --noprofile --norc "$WORK/drift.sh"; echo "exit=$?"; cat "$WORK/summary.md"
: > "$WORK/summary-bad.md" && GITHUB_STEP_SUMMARY="$WORK/summary-bad.md" SUI_VERSION=9.99.9 bash --noprofile --norc "$WORK/drift.sh"; echo "exit=$?"
```
Esperado: (a) `::warning title=H13::Move.lock en PV 139 (719fb2960ccf); el framework vigente en testnet (PV 140) es el de PV 140 (05ad86a3e86c): repinear …`, `exit=0`, tabla con época, `140 / 05ad86a3e86c`, `139 / 719fb2960ccf`, `140`; (b) warning "no se pudo leer el manifest…" y `exit=0`. Si testnet cambió de PV, se reporta lo observado.

**V5 — gates canónicos nuevos (D1) en la feature**
```bash
cd "$REPO/contracts" && printf 'n\n' | sui --version
printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "exit=$?"
printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "exit=$?"
printf 'n\n' | sui move test -e testnet --warnings-are-errors; echo "exit=$?"
cd "$REPO" && git diff --exit-code -- contracts/Move.lock; echo "lock exit=$?"
```
Esperado: baseline de §0 (0 warnings, 0 lints, `Test result: OK. Total tests: 26`), `lock exit=0`.

**V6 — verificación roja en una copia fuera del repo (N3)**
```bash
cd "$REPO" && git status --porcelain --untracked-files=all > "$WORK/status-before.txt"
RED="$WORK/red-check"
rm -rf "$RED" && cp -r "$REPO/contracts" "$RED" && rm -rf "$RED/build" "$RED/traces" "$RED/.coverage_map.mvcov"

# Estado A: error de compilación
cat > "$RED/sources/ci_red_check.move" <<'EOF'
// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Rojo provocado de CI (#3): error de tipos a propósito. Nunca se mergea.
module battleship::ci_red_check;

public fun broken(): u64 { true }
EOF
cd "$RED" && ls sources/ && printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "A build exit=$?"

# Estado B: compila sin warnings, pero el lint falla
rm "$RED/sources/ci_red_check.move"
cat > "$RED/sources/ci_lint_check.move" <<'EOF'
// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Rojo provocado de CI (#3): dispara WSL06010 (prefer_mut_tx_context) sin warnings de compilación. Nunca se mergea.
module battleship::ci_lint_check;

public fun touch(_ctx: &TxContext) {}
EOF
cd "$RED" && ls sources/ && printf 'n\n' | sui move build -e testnet --warnings-are-errors; echo "B build exit=$?"
cd "$RED" && printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors; echo "B lint exit=$?"

cd "$REPO" && git status --porcelain --untracked-files=all | diff "$WORK/status-before.txt" - ; echo "repo intacto exit=$?"
```
Esperado: A: `ls` = `ci_red_check.move house.move`, error de tipos en `ci_red_check.move:7`, `A build exit≠0`.
B: `ls` = `ci_lint_check.move house.move`, `B build exit=0`; `B lint exit≠0` con el diagnóstico de
`prefer_mut_tx_context` (registrado como `WSL06010`) en `ci_lint_check.move:7`. `repo intacto exit=0`.
Si B lint sale con exit 0, **parar** y reportar (D1: vuelve al usuario).

**V7 — greps de forma y secretos**
```bash
cd "$REPO"
grep -n -E 'uses:' .github/workflows/ci.yml
grep -c -E 'uses: actions/(checkout|cache(/restore|/save)?)@[0-9a-f]{40} # v[0-9.]+$' .github/workflows/ci.yml
grep -n -E '\bsui (move|client|keytool|--version|start)' .github/workflows/ci.yml
grep -c -F "printf 'n\n' | sui" .github/workflows/ci.yml
grep -n -E 'sui (client|keytool)|--yes|[[:space:]]-y([[:space:]]|$)|secrets\.|GITHUB_TOKEN' .github/workflows/ci.yml; echo "exit=$?"
git diff -U0 master -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"
git status --porcelain --untracked-files=all
```
Esperado: 5 líneas `uses:` y `5`; 4 líneas de `sui` (version, build, lint, test) y `4`; las dos
búsquedas de prohibidos/secretos con 0 líneas y `exit=1` (el `git diff` contra `master` no ve `ci.yml`
sin trackear: el MID lo cubre con el grep anterior sobre el archivo); status = V0.

### 6. Lo que hace el orquestador (tras la revisión MID del reporte local del DEV)

**O1 — Commit y PR borrador de la feature**
```bash
cd /home/santiago/Projects/Battleship
git add .github/workflows/ci.yml && git status --porcelain     # solo ci.yml staged; PLAN_GAME.md fuera
git commit   # mensaje del MID
git push -u origin feature/issue-3-ci
gh pr create --draft --base master --head feature/issue-3-ci --title "ci: contracts workflow with build, lint and test gates (#3)" --body-file <archivo con: "Borrador: CI de contratos (#3). El body final lo propone el MID.">
```

**O2 — Run verde (R1) y cache hit (R2)**
```bash
gh run list --workflow ci.yml --branch feature/issue-3-ci --limit 3 --json databaseId,headSha,event,status,conclusion
gh run watch <R1> --exit-status; echo "exit=$?"            # esperar hasta el final
gh run rerun <R1> && gh run watch <R1> --exit-status; echo "exit=$?"   # attempt 2 = R2
```

**O3 — Runs rojos en la branch desechable (worktree aparte; el working tree principal no se toca)**
```bash
git worktree add /home/santiago/Projects/Battleship-ci-red-check -b ci/red-check-issue-3 feature/issue-3-ci
cd /home/santiago/Projects/Battleship-ci-red-check
# commit A: crear contracts/sources/ci_red_check.move con el contenido literal de V6 (estado A)
git add contracts/sources/ci_red_check.move && git commit -m "ci: provoke a compile error (do not merge, #3)"
git push -u origin ci/red-check-issue-3
gh pr create --draft --base master --head ci/red-check-issue-3 --title "[no merge] CI red check (#3)" --body "Rojo provocado para la evidencia de #3; se cierra sin mergear."
gh run list --workflow ci.yml --branch ci/red-check-issue-3 --limit 1 --json databaseId,headSha,status
gh run watch <R3> --exit-status; echo "exit=$?"            # ESPERAR a que termine (esperado exit≠0)
# commit B: borrar el rojo de compilación y crear contracts/sources/ci_lint_check.move (contenido literal de V6, estado B)
git rm contracts/sources/ci_red_check.move
git add contracts/sources/ci_lint_check.move && git commit -m "ci: provoke a lint error (do not merge, #3)"
git push
gh run list --workflow ci.yml --branch ci/red-check-issue-3 --limit 1 --json databaseId,headSha,status
gh run watch <R4> --exit-status; echo "exit=$?"            # ESPERAR a que termine (esperado exit≠0)
```
No pushear el commit B antes de que R3 termine: `cancel-in-progress` lo cancelaría y se pierde la evidencia.

**O4 — Limpieza (N1: en este orden; sin `git branch -D` aparte)**
```bash
cd /home/santiago/Projects/Battleship
git worktree remove /home/santiago/Projects/Battleship-ci-red-check
gh pr close <N-desechable> --delete-branch          # desde el worktree principal: borra la local y la remota
git ls-remote --heads origin ci/red-check-issue-3   # esperado: vacío
git branch --list ci/red-check-issue-3              # esperado: vacío
git worktree prune --dry-run                        # esperado: vacío
git worktree list                                   # esperado: una sola línea (el repo principal)
git status -sb && git status --porcelain --untracked-files=all   # feature sin cambios (salvo PLAN_GAME.md ajeno)
```
Los links de R3/R4 siguen válidos tras borrar la branch.

**O5 — Evidencia que el orquestador devuelve** (la transcribe en `documents/REPORTES_CI.md`, sección
"TASK-1 — Anexo de runs", con comando + output completos):

| Run | Qué es | Comando de evidencia | Esperado |
|---|---|---|---|
| R1 | PR de la feature, attempt 1 | `gh run view <R1> --attempt 1 --json url,conclusion,headSha,event,jobs --jq '{url,conclusion,headSha,event,jobs:[.jobs[]\|{name,conclusion,databaseId,steps:[.steps[]\|{name,conclusion}]}]}'` | `contracts` success (Install success, Save success), `framework-drift` success |
| R2 | mismo run, attempt 2 | idem con `--attempt 2` | `contracts` success con Install y Save **skipped** (cache hit), Verify success |
| R3 | rojo de compilación | idem (`--attempt 1`) | `contracts` failure: Build failure; Lint/Test skipped; Move.lock y Guarda ejecutados |
| R4 | rojo de lint | idem | `contracts` failure: Build success, **Lint failure**, Test skipped |

Y por cada run, fragmentos del log del job (`databaseId` del JSON anterior):
```bash
gh run view <R> --attempt <a> --log --job <job-id> > /tmp/run-<R>-<a>.log   # o el scratchpad del orquestador
grep -n -E 'sha256sum|: OK|sui 1\.83|Cache restored|Cache saved|cache hit|Test result|error|W06010|prefer_mut|warning title=H13|##\[warning\]|git status|keystore' /tmp/run-<R>-<a>.log
```
Para `framework-drift` (R1): el grep anterior sobre su job, con el warning de H13 (lock 139 vs 140).
Más `gh pr view <N-desechable> --json state,closed,mergedAt` (esperado `CLOSED`, `mergedAt: null`) y el
output de O4.

### 7. Criterios de aceptación

1. `ci.yml` idéntico al de §3 (o desviaciones declaradas y aprobadas por el MID).
2. V1–V7 con los resultados esperados; repo intacto tras V6; ningún `sui` sin `printf 'n\n' |`.
3. R1 verde (sha256 `OK` del `.tgz` y del binario, `sui 1.83.0-16d2dc1e05ed`, build/lint/test exit 0,
   `Total tests: 26`, `git status --porcelain` vacío, guarda en verde) y `framework-drift` en success con
   el warning de H13 esperado y **sin** warning de "CLI atrasada".
4. R2 con cache hit de la CLI (Install/Save skipped) y Verify en verde.
5. R3 y R4 terminados (no cancelados) con las conclusiones de la tabla de O5. Si R4 sale verde en Lint ⇒
   STOP al usuario (D1).
6. Limpieza de O4 con todas las salidas esperadas.

### 8. Al terminar

**DEV:** reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5 en `documents/REPORTES_CI.md`
(sección "TASK-1"), con V0–V7 pegados (comando + output completos), desviaciones (o "ninguna"),
riesgos y snippet para STATUS. Sin commits ni pushes. El MID revisa la parte local; el orquestador
ejecuta O1–O5 y agrega el anexo de runs; el MID cierra la revisión de TASK-1 con el anexo.

---

## TASK-2: Docs alineadas con la CI — área: docs

### 1. Historia de usuario del task

**Como** DEV, MID, MAYOR u orquestador que arranca una sesión, **quiero** que `agents.md`, STATUS,
ESTANDARES y los prompts de rol describan la CI tal como quedó (gates bloqueantes con warnings como
error, CLI de CI desde el release, qué es "CI verde" y quién aplica la configuración del repo), **para**
correr en local exactamente el gate de CI (PROY-18) y mergear con un criterio verificable.

**Scope:** solo texto. **No entrega:** cambios al workflow ni a `contracts/`.

### 2. Contexto

TASK-1 commiteada y con los links de R1–R4 (los pasa el orquestador). Decisiones: D1–D8 de este handoff.

### 3. Qué implementar (archivo:línea en `c2a1e42`)

1. **`agents.md:30` y `:42`** (§2): `.github/workflows/` existe desde #3 (`ci.yml`: job `contracts`;
   el job `app` llega con #9).
2. **`agents.md:52-54`** (Toolchain): "Sui CLI instalada con `suiup` en local (versión fijada en
   `documents/STATUS.md`); en CI, el binario `sui` del mismo asset del release, verificado por SHA-256
   (`.github/workflows/ci.yml`, `env`), siempre la misma versión (D-20261030-13)".
3. **`agents.md:63-74`** (§3 Contratos): la tabla queda con estas filas de gate (texto literal de los comandos):
   - `sui move build -e testnet --warnings-are-errors` — Compila. Gate bloqueante: sin errores ni warnings.
   - `sui move build -e testnet --lint --warnings-are-errors` — Lints de Sui. Gate bloqueante (D-20261030-13).
   - `sui move test -e testnet --warnings-are-errors` — Tests unitarios. Gate bloqueante.
   - Tras los gates: `git diff --exit-code -- Move.lock` (el lock no cambia; PROY-11).
   - Coverage, `sui start` y `sui client publish` sin cambios. Reemplazar `agents.md:74` por: "Son
     exactamente los steps del job `contracts` de `.github/workflows/ci.yml` (PROY-18)".
4. **`agents.md:87`**: "Gate completo = el del workflow de CI: job `contracts` (build, lint y test con
   `--warnings-are-errors`, `Move.lock` intacto, cero claves); app lint + typecheck + test + build
   cuando #9 agregue el job `app`. El job `framework-drift` es informativo (H13) y no condiciona el merge."
5. **`agents.md:196`** (§11): agregar fila "CI" — `.github/workflows/ci.yml` (`ubuntu-24.04`) — "Versión
   en `env` (`SUI_VERSION`/`SUI_COMMIT`) = la de STATUS; config sin claves en `$RUNNER_TEMP`; sin secretos".
6. **`documents/ESTANDARES.md:83-84`** y encabezado (versión 1.4, citar D-20261030-13):
   - PROY-17: "… Sui CLI instalada con `suiup` en local; en CI, el binario `sui` del mismo asset del
     release, verificado por SHA-256; versión registrada en STATUS y en el `env` del workflow, siempre iguales."
   - PROY-18: "El gate local y el de CI son el mismo (`agents.md` §3 = steps del job `contracts`). Un rojo
     de `contracts` bloquea el merge; `framework-drift` es informativo."
7. **`documents/agentes/ORQUESTADOR.md:29`**: "CI verde" = check `contracts` en verde sobre el head actual
   del PR: con la protección de `master` activa, `gh pr checks <N> --required`; antes,
   `gh pr view <N> --json headRefOid,statusCheckRollup --jq '{head: .headRefOid, contracts: [.statusCheckRollup[] | select(.name=="contracts") | .conclusion]}'`
   → `["SUCCESS"]`. Y: "La protección de `master` y los settings de Actions (D-20261030-13) los aplica el
   usuario, o el orquestador solo con autorización expresa del usuario en ese momento".
8. **`documents/agentes/AGENTE_DEV.md:50`**: "Contracts: build, `--lint` y test con
   `-e testnet --warnings-are-errors` en verde y `Move.lock` sin delta (con `sui --version` en el
   reporte), en la forma canónica de `agents.md` §3 (= job `contracts` de la CI) …" (conservar la mención a H11).
9. **`documents/FLUJO_AGENTES.md:91`**: "Contracts: sui --version / sui move build (warnings) / sui move
   build --lint (lints) / sui move test (N tests, PASS/FAIL) — todos con `--warnings-are-errors`; forma
   canónica en `agents.md` §3".
10. **`documents/STATUS.md`**:
    - Toolchain (tras `:27`): fila "CI" — `.github/workflows/ci.yml`, `ubuntu-24.04`, `SUI_VERSION 1.83.0`
      / `SUI_COMMIT 16d2dc1e05ed` = local; al subir de versión se actualizan `SUI_TGZ_SHA256` (`gh api …
      --jq '.assets[] | .name + " " + .digest'`) y `SUI_BIN_SHA256` (`sha256sum` del binario local de `suiup`).
    - Fila "Gates" (`:32`): forma canónica con `--warnings-are-errors`.
    - Baselines (`:46`): fila CI con R1 (verde) y su SHA; nota de R2–R4 como evidencia de #3.
    - H11 (`:65`): la parte de #3 pasa a ✅ (config en `$RUNNER_TEMP`, `SUI_CONFIG_DIR`, guarda de cero claves).
    - H13 (`:67`): "el job `framework-drift` lo avisa en cada run (informativo)".
    - Ciclo activo / backlog: #3 en curso → (al merge lo cierra el housekeeping).
    - Pendientes del usuario (`:114-116`): "Tras el merge de #3: protección clásica de `master` con el
      check `contracts` requerido (sin reviews, sin 'up to date', sin bypass) y 'Require actions to be
      pinned to a full-length commit SHA' (D-20261030-13); los aplica el usuario, o el orquestador solo
      con autorización expresa del usuario en ese momento".
11. **`documents/DECISIONES.md`**: no se edita D-20261030-13; entradas nuevas solo si surgió una decisión
    en el ciclo, desde **D-20261030-15**.

### 4. Archivos a tocar / NO tocar

- **Tocar:** `agents.md`, `documents/STATUS.md`, `documents/ESTANDARES.md`, `documents/agentes/ORQUESTADOR.md`,
  `documents/agentes/AGENTE_DEV.md`, `documents/FLUJO_AGENTES.md` (y `documents/DECISIONES.md` solo si
  hay decisión nueva).
- **NO tocar:** `.github/workflows/ci.yml`, `contracts/**`, `documents/PLAN_GAME.md`, `PLAN_CI.md`,
  `REVISION_PLAN_CI.md`, este handoff.

### 5. Verificación obligatoria (comando + output completos)

```bash
cd /home/santiago/Projects/Battleship
grep -n -F "sui move" agents.md documents/agentes/AGENTE_DEV.md documents/FLUJO_AGENTES.md .github/workflows/ci.yml
grep -n -E 'informativo hasta|\| CI \| — \| ⬜' agents.md documents/STATUS.md; echo "exit=$?"
grep -n -E 'CI verde|--required|statusCheckRollup|ci\.yml|framework-drift|D-20261030-13' agents.md documents/STATUS.md documents/ESTANDARES.md documents/agentes/ORQUESTADOR.md documents/agentes/AGENTE_DEV.md documents/FLUJO_AGENTES.md
grep -n -E 'D-20261030-1[3-9]' documents/DECISIONES.md
git diff --stat
git diff -U0 -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"
git status --porcelain --untracked-files=all
```
Esperado: las formas de `sui move` de los tres docs coinciden carácter a carácter con los `run:` de
`contracts`; `exit=1` en el segundo grep; D-13 y D-14 una vez cada una en DECISIONES; el grep de
secretos `exit=1` (o cada línea de prosa listada y justificada); status solo con los archivos de §4.

### 6. Smoke

No aplica (docs). La evidencia de la CI es la de TASK-1.

### 7. Criterios de aceptación

- Ninguna referencia viva a "CI no existe" ni a "lint informativo".
- Las formas de gate coinciden con `ci.yml`; STATUS y el `env` del workflow dicen la misma versión y commit.
- "CI verde" y quién aplica la configuración del repo, con el texto de D-20261030-13, en `ORQUESTADOR.md`
  y STATUS. PROY-20 cumplida.

### 8. Al terminar

Reporte TASK-2 (plantilla FLUJO §5) en `documents/REPORTES_CI.md`, con la verificación de §5. Sin
commits ni pushes. Tras la revisión MID: el orquestador commitea, el CI corre sobre ese commit (debe
quedar `contracts` en verde) y el PR pasa a "ready for review" para la integración del MAYOR. El body del
PR (lo propone el MID) declara la desviación de la letra del issue: rojos en branch desechable, no
commit revertido en la feature.
