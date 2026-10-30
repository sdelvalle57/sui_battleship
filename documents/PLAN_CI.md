# PLAN_CI v1
> Issue: #3 (+ comentario H11/H13 del 2026-10-30; relacionados #8, #9) | Áreas: ci / docs | Fecha: 2026-10-30
> Branch: `feature/issue-3-ci` (desde `master` @ `d729c78`) | Autor: MID | Estado: pendiente de revisión del MAYOR

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
configurar la protección de `master` ni los settings de Actions (son del usuario, STOP-1 y STOP-4).

---

## Contexto y alcance

### Qué existe hoy (evidencia)

- No hay `.github/` en el árbol (`git ls-files` @ `d729c78`); STATUS lo registra: `documents/STATUS.md:46`
  ("CI — ⬜ no existe").
- Gates canónicos: `agents.md:63-74` (desde `contracts/`, con `-e testnet` y `printf 'n\n' |`). El lint
  figura como "informativo hasta fijar baseline" (`agents.md:68`) y el baseline ya es **0 lints**
  (`documents/STATUS.md:38-40`: build 0 warnings, lint 0, test 26 PASS con 0 warnings, CLI `1.83.0`).
- `agents.md:74`: `--warnings-are-errors` existe en `sui move build` y `sui move test` "para CI, #3".
  Confirmado hoy con `printf 'n\n' | sui move build --help` / `sui move test --help` (CLI local
  `sui 1.83.0-16d2dc1e05ed`): flags `--warnings-are-errors`, `--lint`, `-e, --build-env`.
- Prerrequisito sin claves: `client.yaml` sin claves (D-20261030-07); en CI, la misma config en
  `$RUNNER_TEMP` vía `SUI_CONFIG_DIR` (`documents/STATUS.md:65`, H11, y comentario del issue #3).
- H13 (`documents/STATUS.md:67`): testnet en PV 140, lock en el piso de PV 139
  (`contracts/Move.lock:8,14`, rev `719fb2960ccfbf9f4d33041f8ea5146d30671696`); la CLI no avisa.
- PROY-18 (`documents/ESTANDARES.md:84`): gate local = gate de CI; un rojo de CI bloquea el merge.
- D-20261030-09: el orquestador mergea "cuando la CI está en verde (cuando exista)".
- Repo (consultado con `gh api`, solo lectura): `master` **sin protección** (`protected: false`,
  `required_status_checks.enforcement_level: off`), sin rulesets, Actions habilitadas con
  `allowed_actions: all`, `sha_pinning_required: false`, `default_workflow_permissions: read`.

### Evidencia técnica que fija el diseño

| Punto | Evidencia | Consecuencia |
|---|---|---|
| Release exacta | `gh api repos/MystenLabs/sui/releases/tags/testnet-v1.83.0`: no prerelease, publicada 2026-10-27; tag → commit `16d2dc1e05edcf600320a82e17b9392edb0983a5` (= `sui 1.83.0-16d2dc1e05ed` de STATUS) | Versión verificable por `sui --version` exacto |
| Asset Linux | `sui-testnet-v1.83.0-ubuntu-x86_64.tgz`, 1 191 250 401 B, `digest` de la API `sha256:e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8` | Descarga con checksum fijado en el workflow; ~1,2 GB ⇒ cachear **solo** el binario `sui` |
| `suiup` usa el mismo asset | `suiup` v0.1.1 `src/handlers/download.rs:175-177` (`Linux => "ubuntu"`) y `src/handlers/mod.rs:313-400` (extrae la entrada cuyo nombre de archivo es `sui`) | El binario de CI es byte a byte el que `suiup` instala en local |
| `suiup` no verifica SHA-256 | `suiup` v0.1.1 `src/handlers/download.rs:315-440`: solo compara MD5 si existe un `.md5` junto al archivo; el release de Sui no publica `.md5`. Además consulta la API de GitHub (README de `suiup`, "Using it in CI": recomienda `GITHUB_TOKEN` por rate limits) | Ver STOP-3 |
| Sin action oficial | Org `MystenLabs`: no hay action de setup de la CLI (solo `move-formatter-action`, `cargo-deny-action`, `walrus-sites-github-actions`); en el buscador de GitHub `setup-sui` no hay nada mantenido | Solo actions de primera parte (`actions/*`) |
| Prompt de claves | `crates/sui/src/sui_commands.rs` @ `testnet-v1.83.0`: `SuiCommand::Move` llama `get_wallet_context` (:584) → `prompt_if_no_config` (:1636-1690) crea keystore + clave salvo que la respuesta no sea vacía/"y"; `-y/--yes` acepta sin preguntar (:179-181) | `printf 'n\n' |` en toda invocación; **nunca** `-y` |
| `SUI_CONFIG_DIR` | `crates/sui-config/src/lib.rs:45-59` @ `testnet-v1.83.0` | La config en `$RUNNER_TEMP/sui_config` se respeta |
| Forma del `client.yaml` | `crates/sui-sdk/src/sui_client_config.rs:22-32,90-98` (campos `keystore`, `external_keys?`, `envs`, `active_env?`, `active_address?`; `SuiEnv{alias,rpc,ws?,basic_auth?,chain_id?}`); `crates/sui-keys/src/keystore.rs:267-275,401-430` (`File: <ruta>` carga un JSON `[]` de claves) ; `SUI_TESTNET_URL = https://fullnode.testnet.sui.io:443` (`crates/sui-sdk/src/lib.rs:36`) | Config mínima reproducible (TASK-1) |
| Caché de deps Move | `MOVE_HOME` = `~/.move` (`external-crates/move/crates/move-command-line-common/src/env.rs:28-37`), git en `$MOVE_HOME/git` (`move-package/src/git/cache.rs:26-33`); local: `~/.move/git/https___github_com_MystenLabs_sui_git_719fb29…` (55 MB) | Caché `~/.move/git` con clave = hash de `contracts/Move.lock` |
| PV → SHA del framework | `crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.83.0`: `"139": 719fb29…`, `"140": 05ad86a…`, máxima = 140 | El job H13 traduce el rev del lock a PV y obtiene la PV máxima de la CLI |
| PV vigente | `POST https://graphql.testnet.sui.io/graphql` `{ epoch { epochId protocolConfigs { protocolVersion } } }` → `{"epochId":1269,"protocolVersion":140}` (2026-10-30); endpoint en `crates/sui-data-store/src/node.rs:16`; campo en `crates/sui-indexer-alt-graphql/schema.graphql` (`Query.epoch` "latest epoch if no ID", `ProtocolConfigs.protocolVersion`) | Chequeo sin CLI ni claves |
| Actions de primera parte | `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1` (node24; v7 bloquea checkout de forks en `pull_request_target`); `actions/cache` v6.1.0 = `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` (node24) — SHAs por `gh api repos/<r>/git/ref/tags/<tag>` (objeto `commit`) | Fijadas por SHA con el tag en comentario |
| Runner | `actions/runner-images` README: `ubuntu-latest` = 24.04; 26.04 ya existe | Fijar `ubuntu-24.04` (no `-latest`, que cambiará a 26.04 sin aviso) |
| Docs de GitHub | Workflow syntax: `shell: bash` explícito ⇒ `bash --noprofile --norc -eo pipefail {0}` (el default implícito es `bash -e {0}`, **sin** pipefail); `permissions`: lo no declarado queda en `none`; `cancel-in-progress` admite expresiones. Secure use: "Pin references to actions to a commit SHA" y `GITHUB_TOKEN` con mínimo privilegio. Dependency caching: un PR restaura cachés de su rama, de la base y de la default; los de un PR quedan en su merge ref; 10 GB por repo; desalojo a los 7 días sin uso | Diseño de shell, permisos, concurrencia y caché de TASK-1 |

### Alcance

- `.github/workflows/ci.yml` (nombre confirmado: `ci.yml`, `name: CI`) con:
  - **Job `contracts`** (bloqueante; nombre del check = `contracts`).
  - **Job `framework-drift`** (informativo, nunca falla, nunca será check requerido).
  - Hueco documentado para el job `app` de #9.
- Docs: `agents.md` §2/§3/§11, `documents/STATUS.md`, `documents/ESTANDARES.md` (PROY-17/18 según
  STOP-2/3), `documents/agentes/ORQUESTADOR.md` (qué significa "CI verde" para mergear),
  `documents/DECISIONES.md` (registro de los STOPs resueltos).

### Fuera de alcance

- Job `app` (#9), deploy (#15), publicación y repin del lock (#8), cobertura en CI.
- Disparador `schedule` para H13 (avisaría de un cambio de PV sin PRs). El pre-vuelo de #8 ya lo
  cubre; si el usuario lo quiere, issue aparte.
- Configurar la protección de `master` y los settings de Actions: los hace el usuario (STOP-1, STOP-4).
- `actionlint` u otra herramienta nueva de validación (SEG-8): el propio run valida el YAML.

## Contrato on-chain

Sin cambios. No se toca `contracts/sources/`, `contracts/tests/` ni `contracts/Move.toml`/`Move.lock`;
el workflow verifica justamente que `Move.lock` no cambie. Sin impacto en `app/src/sui/` ni en
compatibilidad de upgrade.

## Flujo de fondos

No aplica (CI sin red de escritura, sin claves, sin transacciones).

## Cómo encaja con D-20261030-09 (merge por el orquestador)

- "CI verde" = el check **`contracts`** del último commit del PR en `success`. `framework-drift`
  es informativo: puede llevar un warning (hoy lo llevará: lock en PV 139 < testnet 140) y no
  condiciona el merge.
- Sin protección de rama (estado actual), el único cerrojo es la disciplina del orquestador:
  `gh pr checks <N>` antes de `gh pr merge`. Con la protección de STOP-1, GitHub rechaza el merge si
  `contracts` no está en verde, también para el orquestador (que opera con la sesión del owner) si se
  activa "no permitir bypass / incluir administradores".
- Los PRs de housekeeping (solo docs) también corren `contracts` (sin filtro por `paths`, como
  recomienda el issue para no dejar un check requerido en "pendiente").

## Decisiones internas (actuar y reportar)

> Decisión (2026-10-30): actions de primera parte fijadas por **SHA de commit** con el tag en comentario (`actions/checkout@3d3c42e… # v7.0.1`, `actions/cache@55cc834… # v6.1.0`), más estricto que el "al menos por versión mayor" del issue, porque la guía de GitHub ("Secure use") lo recomienda y el encargo lo exige.

> Decisión (2026-10-30): runner `ubuntu-24.04` fijo en lugar de `ubuntu-latest`, porque `-latest` pasará a 26.04 sin cambio en el repo y el binario de Sui se valida sobre una imagen conocida.

> Decisión (2026-10-30): versión de la CLI en un único bloque `env` a nivel de workflow (`SUI_VERSION`, `SUI_COMMIT`, `SUI_TGZ_SHA256`), compartido por `contracts` y `framework-drift` (criterio del issue: "un único lugar").

> Decisión (2026-10-30): el chequeo H13 va en un **job separado** que siempre termina en éxito y emite `::warning::` + resumen en `$GITHUB_STEP_SUMMARY`, en lugar de un step del job `contracts`, para que nunca pueda volverse requerido ni teñir de rojo el check que gatea el merge.

> Decisión (2026-10-30): `actions/checkout` con `persist-credentials: false` en ambos jobs: ningún step necesita el `GITHUB_TOKEN` en `.git/config`.

> Decisión (2026-10-30): la evidencia del run rojo se obtiene en una branch desechable (`ci/red-check-issue-3`, desde el HEAD de la feature + un commit que rompe), con un PR borrador contra `master` que se cierra sin mergear y se borra, en lugar de commit rojo + revert en la feature, porque el merge commit de D-20261030-09 dejaría ambos commits en la historia de `master`. Lo opera el orquestador (PRs y branches son de su rol).

---

## Decisiones abiertas → STOP

El issue declara "Decisiones abiertas: Ninguna". Las siguientes son STOP porque tocan configuración del
repo, una regla registrada (`agents.md`, ESTANDARES) o el alcance del gate. El job no necesita
**secretos** de GitHub (no usa `secrets.*` ni pasa `GITHUB_TOKEN` a ningún binario): no hay STOP de
secretos.

### STOP-1 — Protección de `master` con el check requerido `contracts` (config del repo; a ratificar y ejecutar por el usuario)

- **Problema:** el issue lo lista como paso del owner; hoy `master` no tiene protección ni rulesets
  (`gh api repos/sdelvalle57/sui_battleship/branches/master` → `protected: false`; `/rulesets` → `[]`).
  Sin ella, D-20261030-09 y PROY-18 dependen solo de que el orquestador mire los checks.
- **Opciones:**
  - **(a)** Protección clásica (Settings → Branches → `master`): "Require status checks to pass" con
    `contracts`; **sin** "require branches to be up to date" (evita rebases en cadena con merge commit);
    **sin** reviews requeridas (GitHub no deja aprobar el PR propio del owner: FLUJO §7); "Do not allow
    bypassing the above settings" activado. Pro: lo que pide el issue, simple. Contra: el orquestador
    (sesión del owner) tampoco puede saltarla en una emergencia sin desactivarla.
  - **(b)** Ruleset de repo equivalente (Require status checks `contracts` + bloquear force push y
    borrado de `master`). Pro: mecanismo nuevo de GitHub, más granular. Contra: igual efecto para este
    repo, se aparta del texto del issue.
  - **(c)** Sin protección; el orquestador verifica `gh pr checks <N>` (se documenta en
    `ORQUESTADOR.md` en todo caso). Pro: cero config. Contra: un error de proceso deja pasar un rojo.
- **Recomendación: (a)**, activada **después** de mergear el PR de #3 (el check `contracts` debe haber
  corrido en el repo para poder seleccionarlo). Queda en "Pendientes del usuario" de STATUS.

### STOP-2 — Qué es bloqueante: lint y test con `--warnings-are-errors` (cambia `agents.md` §3; a ratificar por el usuario)

- **Problema:** `agents.md:68` dice que el lint es "informativo hasta fijar baseline"; el baseline ya es
  0 lints, 0 warnings de build y 0 de test (`documents/STATUS.md:38-40`). PROY-18 exige gate local =
  gate de CI, así que lo que se decida cambia también el gate local del DEV. El issue pide como mínimo
  el flag en el build (LIM-9).
- **Opciones:**
  - **(a)** Los tres bloqueantes con `--warnings-are-errors`: `build`, `build --lint` y `test`.
    Pro: LIM-9 automático en todo, cero delta trivial (baseline 0). Contra: un lint nuevo de una CLI
    futura rompe el CI al subir de versión (se ve en el PR del upgrade de CLI, que es donde corresponde).
  - **(b)** `build` y `test` bloqueantes con el flag; `build --lint` informativo (step con
    `continue-on-error` y warning). Pro: tolera lints nuevos. Contra: los lints pueden acumularse, como
    pasó con `WSL06010` (H12).
  - **(c)** Solo `build --warnings-are-errors` bloqueante (mínimo del issue); lint y warnings de test,
    por revisión humana. Contra: el MID/MAYOR vuelven a contar warnings a mano.
- **Recomendación: (a)**, y `agents.md` §3 pasa a la forma canónica con esos flags. Riesgo a verificar
  en TASK-1: que `--warnings-are-errors` convierta en error los lints de `--lint` (los lints de Sui se
  emiten como warnings, p. ej. `WSL06010`); se prueba con el run rojo de lint. Si no los convierte, el
  DEV lo reporta y se vuelve a este STOP.

### STOP-3 — Cómo instalar la CLI en el runner (se aparta de la letra de PROY-17; a ratificar por el usuario)

- **Problema:** PROY-17 (`documents/ESTANDARES.md:83`) dice "Sui CLI instalada con `suiup`". En CI hay
  que elegir entre `suiup` y el asset del release, y el issue pide versión exacta + caché.
- **Opciones:**
  - **(a)** Asset `sui-testnet-v1.83.0-ubuntu-x86_64.tgz` del release de `MystenLabs/sui`, verificado con
    `sha256sum -c` contra el digest fijado en el workflow; se extrae solo `sui` y se cachea con
    `actions/cache` (clave = versión + SHA-256). Pro: integridad verificada; sin API de GitHub ni token;
    es el mismo archivo que `suiup` descarga en local (`download.rs:175-177`). Contra: ~1,2 GB por cada
    fallo de caché (una vez por versión cada 7 días sin uso); hay que actualizar a mano el SHA-256 al
    subir de versión (se obtiene con `gh api …/releases/tags/<tag> --jq '.assets[].digest'`).
  - **(b)** `suiup` v0.1.1 (su tgz trae `.sha256`) + `suiup install sui@testnet-1.83.0`, cacheando
    `XDG_DATA_HOME`/`XDG_CACHE_HOME`. Pro: paridad literal con PROY-17. Contra: el archivo de la CLI
    **no** se verifica por SHA-256 (`download.rs:315-440`, solo MD5 si hay `.md5`, que el release no
    publica); necesita `GITHUB_TOKEN` en el entorno de un binario de terceros por los rate limits de la
    API; dos versiones que fijar (suiup y sui).
  - **(c)** Imagen Docker de herramientas de Sui (la nombra el issue). No evaluada a fondo: habría que
    fijar la imagen por digest y no aporta sobre (a); descartada salvo pedido del usuario.
- **Recomendación: (a)**, con PROY-17 reescrita como: "Sui CLI instalada con `suiup` en local; en CI, el
  binario `sui` del mismo asset del release, verificado por SHA-256; versión registrada en STATUS y en
  el `env` del workflow, siempre iguales".

### STOP-4 — Endurecer los settings de Actions del repo (opcional; config del repo, la ejecuta el usuario)

- **Problema:** `gh api repos/sdelvalle57/sui_battleship/actions/permissions` → `allowed_actions: all`,
  `sha_pinning_required: false`. El workflow de #3 ya fija por SHA, pero nada impide que un PR futuro
  use una action por tag.
- **Opciones:** **(a)** activar "Require actions to be pinned to a full-length commit SHA";
  **(b)** (a) + permitir solo actions de GitHub (`actions/*`; #9 solo necesita `actions/setup-node`;
  #15 lo revisaría); **(c)** dejarlo como está.
- **Recomendación: (a)** (cero costo hoy, hace cumplir la regla de SHA). Puede hacerse cuando quiera el
  usuario; no bloquea el merge de #3. Se lista en "Pendientes del usuario".

---

## Tasks (ordenados por dependencia)

### TASK-1: Workflow `CI` con el job `contracts` y el job informativo `framework-drift` — área: ci

- **Entregable:** `.github/workflows/ci.yml` y evidencia de un run verde (PR de la feature) y de los
  runs rojos provocados (compilación; lint si STOP-2 = a).
- **Archivos afectados:** crear `.github/workflows/ci.yml`. **No tocar** nada bajo `contracts/`,
  `.gitignore`, `package.json`, `.nvmrc`.
- **Cambios — modelo** (con STOP-2 = a y STOP-3 = a; el handoff lo fija definitivo):

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
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}   # nunca cancela runs de master

env:
  # Única fuente de la versión de la Sui CLI en CI: debe coincidir con documents/STATUS.md (Toolchain).
  # SHA-256: gh api repos/MystenLabs/sui/releases/tags/testnet-v<versión> --jq '.assets[] | .name + " " + .digest'
  SUI_VERSION: "1.83.0"
  SUI_COMMIT: "16d2dc1e05ed"
  SUI_TGZ_SHA256: "e51168051bca14f1500de9a81520c927dfd583092628bc36582d01f9d2c1d7d8"

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

      - name: Cache Sui CLI
        id: sui-cache
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.cache/sui-cli/${{ env.SUI_VERSION }}
          key: sui-cli-${{ runner.os }}-${{ runner.arch }}-${{ env.SUI_VERSION }}-${{ env.SUI_TGZ_SHA256 }}

      - name: Install Sui CLI (release testnet, SHA-256 verificado)
        if: steps.sui-cache.outputs.cache-hit != 'true'
        run: |
          cd "$RUNNER_TEMP"
          asset="sui-testnet-v${SUI_VERSION}-ubuntu-x86_64.tgz"
          curl -fsSL --retry 3 -o "$asset" \
            "https://github.com/MystenLabs/sui/releases/download/testnet-v${SUI_VERSION}/${asset}"
          echo "${SUI_TGZ_SHA256}  ${asset}" | sha256sum -c -
          mkdir sui-release && tar -xzf "$asset" -C sui-release
          mapfile -t found < <(find sui-release -type f -name sui)
          [ "${#found[@]}" -eq 1 ] || { echo "::error::se esperaba 1 binario 'sui' y hay ${#found[@]}"; exit 1; }
          install -D -m 0755 "${found[0]}" "$HOME/.cache/sui-cli/${SUI_VERSION}/sui"
          rm -rf "$asset" sui-release

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
          key: move-git-${{ runner.os }}-${{ hashFiles('contracts/Move.lock') }}

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
          test "$(tr -d '[:space:]' < "$SUI_CONFIG_DIR/sui.keystore")" = "[]"
          test -z "$(find "$SUI_CONFIG_DIR" -name '*.keystore' ! -name sui.keystore)"

  # TODO(#9): job `app` (Node de .nvmrc con actions/setup-node fijada por SHA; npm ci; lint, typecheck,
  # test y build -w app), sin needs sobre `contracts` para que corran en paralelo.

  framework-drift:
    # Informativo (STATUS H13): nunca falla ni será check requerido; avisa con ::warning:: y en el resumen.
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: PV de testnet vs framework pineado en Move.lock
        continue-on-error: true
        shell: bash --noprofile --norc {0}     # sin -e: el script decide y termina siempre en 0
        run: |
          # ver "Lógica de framework-drift" en el plan
```

- **Lógica de `framework-drift`** (el DEV la implementa en el `run`; sin `sui`, sin claves, con `curl`
  y `jq` del runner; cada fallo de red o de parseo ⇒ `::warning::` y `exit 0`):
  1. `LOCK_REV` = `rev` de la línea `source` de `[pinned.testnet.Sui]` en `contracts/Move.lock`
     (40 hex); comprobar que `[pinned.testnet.MoveStdlib]` tenga el mismo rev (si no, warning).
  2. `TESTNET_PV` = `curl -fsS --max-time 20 --retry 2 -X POST https://graphql.testnet.sui.io/graphql -H 'content-type: application/json' -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}'` → `jq -r '.data.epoch.protocolConfigs.protocolVersion'` (y `epochId` para el resumen).
  3. Manifest de la CLI fijada: `curl -fsSL --max-time 20 --retry 2 https://raw.githubusercontent.com/MystenLabs/sui/testnet-v${SUI_VERSION}/crates/sui-framework-snapshot/manifest.json`.
     `CLI_MAX_PV` = mayor clave numérica; `LOCK_PV` = mayor clave cuyo `git_revision` == `LOCK_REV`;
     `TESTNET_REV` = `git_revision` de la clave `TESTNET_PV` (si existe).
  4. Avisos (`::warning title=H13::…`):
     - `LOCK_PV` vacío ⇒ "el rev del lock no está en el manifest de la CLI ${SUI_VERSION}".
     - `TESTNET_PV > CLI_MAX_PV` ⇒ "CLI atrasada: testnet en PV X, la CLI llega a Y (pre-vuelo #8, paso 1)".
     - `LOCK_PV < TESTNET_PV` ⇒ "Move.lock en PV X (rev corto), testnet en PV Y (rev esperado corto): repinear en el pre-vuelo de #8 (paso 2)".
  5. Tabla en `$GITHUB_STEP_SUMMARY`: época, PV testnet, PV/rev del lock, PV máxima de la CLI, veredicto.
  6. `exit 0` siempre.
- **AuthZ:** `permissions: contents: read` a nivel de workflow (todo lo demás `none`); ningún step usa
  `secrets.*` ni `GITHUB_TOKEN`; el workflow no genera, lee ni imprime claves (keystore `[]` creado por el
  propio job, nunca `sui client`, `sui keytool` ni `-y`).
- **Criterio de aceptación (DoD verificable):**
  1. Run del PR de la feature (borrador, lo abre el orquestador tras commitear este task) con
     `contracts` en `success` y, en su log: `sha256sum` "OK" (o cache hit), `sui 1.83.0-16d2dc1e05ed`,
     build/lint/test con exit 0, `Test result: OK. Total tests: 26`, `git status --porcelain` vacío y la
     guarda de claves en verde.
  2. Segundo run del mismo PR con **cache hit** de la CLI y de `~/.move/git` (mismo SHA o re-run).
  3. `framework-drift` en `success` con el warning esperado hoy: lock en PV 139 (`719fb29`) < testnet
     PV 140 (`05ad86a`), y sin warning de "CLI atrasada" (PV máxima de 1.83.0 = 140).
  4. Run rojo de compilación en la branch desechable `ci/red-check-issue-3` (PR borrador contra
     `master`, cerrado sin merge y borrado): `contracts` en `failure` en el step Build. Ejemplo de commit
     rojo: `contracts/sources/ci_red_check.move` con `module battleship::ci_red_check; public fun broken(): u64 { true }`.
  5. (Si STOP-2 = a) Run rojo de lint en la misma branch desechable, con un commit que compila sin
     warnings pero dispara `WSL06010` (patrón de H12): `module battleship::ci_lint_check; public fun touch(_ctx: &TxContext) {}`.
     Esperado: Build en verde y Lint en `failure`.
  6. Los gates locales, en la forma canónica nueva, siguen en el baseline (0 warnings, 0 lints, 26 PASS)
     y `Move.lock` sin delta.
- **Comandos de verificación que el DEV pega (comando + output completos):**
  - `git rev-parse --short HEAD && git status --porcelain --untracked-files=all` (esperado: solo
    `?? .github/workflows/ci.yml` antes del commit).
  - `printf 'n\n' | sui --version` y, desde `contracts/`, `printf 'n\n' | sui move build -e testnet --warnings-are-errors`,
    `printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors`,
    `printf 'n\n' | sui move test -e testnet --warnings-are-errors`, cada uno con `; echo "exit=$?"`.
  - `git diff --exit-code -- contracts/Move.lock; echo "exit=$?"` (esperado `exit=0`).
  - `grep -n -E 'uses:' .github/workflows/ci.yml` (esperado: 4 líneas, todas `@<40 hex> # v…`) y
    `grep -c -E 'uses: actions/(checkout|cache)@[0-9a-f]{40} # v[0-9.]+$' .github/workflows/ci.yml` (esperado `4`).
  - `grep -n -E '\bsui (move|client|keytool|--version|start)' .github/workflows/ci.yml` (esperado: 4
    líneas — version, build, lint, test — todas con `printf 'n\n' | sui`) y
    `grep -c -F "printf 'n\n' | sui" .github/workflows/ci.yml` (esperado `4`).
  - `grep -n -E 'sui (client|keytool)|--yes|[[:space:]]-y([[:space:]]|$)|secrets\.|GITHUB_TOKEN' .github/workflows/ci.yml; echo "exit=$?"`
    (esperado: 0 líneas, `exit=1`).
  - `git diff -U0 master -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"`
    (esperado: 0 líneas, `exit=1`).
  - Runs (los aporta el orquestador tras pushear; el DEV o el MID los pegan en el reporte):
    `gh run list --workflow ci.yml --limit 10` y, por run citado,
    `gh run view <id> --json url,conclusion,headSha,jobs --jq '{url,conclusion,headSha,jobs:[.jobs[]|{name,conclusion}]}'`;
    log del job relevante con `gh run view <id> --log --job <job-id>` (fragmentos de install/version,
    build, lint, test, Move.lock, guarda y el warning de `framework-drift`).
- **Tests esperados:** sin tests nuevos de Move; la "prueba" del workflow son los runs verde/rojo/cache hit.
- **Riesgos / rollback:**
  - `--warnings-are-errors` no convierte lints en error ⇒ el run rojo de lint sale verde: el DEV lo
    reporta y se vuelve a STOP-2 (alternativa: fallar el step si la salida contiene un código `W…`).
  - El `client.yaml` mínimo no lo acepta la CLI (campo faltante) ⇒ el DEV compara solo **nombres de
    campos** con su config local sin claves (sin pegar contenido) y ajusta; desviación declarada.
  - Con `pipefail`, si `sui` terminara antes de que `printf` escriba, `printf` recibiría SIGPIPE (141)
    y el step fallaría con `sui` en verde: improbable (2 bytes, la CLI tarda segundos); si aparece, se
    reporta con el log.
  - `curl` del asset falla (red de GitHub) ⇒ run rojo, re-run. Fallo de caché ⇒ ~1,2 GB de descarga.
  - Rollback: borrar `.github/workflows/ci.yml` (sin efecto en contratos).

### TASK-2: Docs alineadas con la CI — área: docs

- **Entregable:** docs que describen el workflow, la forma canónica de los gates y qué significa
  "CI verde" para mergear.
- **Archivos afectados (rutas verificadas):**
  - `agents.md`: §2 (`.github/workflows/` existe desde #3), §3 (tabla de contratos con la forma
    canónica de STOP-2, `agents.md:63-74`; "Gate completo = el del workflow de CI" con el job
    `contracts` y nota de que `framework-drift` es informativo, `agents.md:87`), §11 (fila "CI": versión
    en el `env` del workflow = la de STATUS).
  - `documents/STATUS.md`: Toolchain (fila nueva "CI": `ci.yml`, `ubuntu-24.04`, `SUI_VERSION`
    1.83.0 = local, cómo actualizar versión + SHA-256), Baselines (fila CI con los links de los runs),
    H11 (parte de #3 ✅), H13 (aviso informativo de `framework-drift`), "Pendientes del usuario"
    (STOP-1 y, si se acepta, STOP-4), backlog/ciclo activo.
  - `documents/ESTANDARES.md`: PROY-17 (texto de STOP-3) y PROY-18 (`contracts` es el check que
    bloquea; el job informativo no), con bump de versión del documento.
  - `documents/agentes/ORQUESTADOR.md:29`: "CI verde" = `gh pr checks <N>` con `contracts` en `pass`
    sobre el último commit; `framework-drift` no condiciona.
  - `documents/DECISIONES.md`: entradas `D-20261030-13…` con lo que el usuario resuelva en los STOPs
    (las redacta el MID en el handoff; el DEV las transcribe).
- **Cambios:** solo texto; sin snippets de código salvo los comandos canónicos.
- **AuthZ:** no aplica.
- **Criterio de aceptación:** las cuatro formas de gate de `agents.md` §3 coinciden carácter a carácter
  con los `run:` del job `contracts`; STATUS y el `env` del workflow dicen la misma versión y commit;
  ninguna referencia a "CI no existe" queda viva; PROY-20 cumplida.
- **Verificación (comando + output completos):**
  - `grep -n -F "sui move" agents.md` y `grep -n -F "sui move" .github/workflows/ci.yml` (el MID compara
    las formas).
  - `grep -n -E 'CI|ci\.yml|framework-drift' documents/STATUS.md agents.md documents/ESTANDARES.md documents/agentes/ORQUESTADOR.md`.
  - `grep -n -E 'no existe' documents/STATUS.md` (esperado: sin la fila "CI ⬜ no existe"; la de `app`
    sigue).
  - `git diff -U0 master -- . | grep -E '^\+' | grep -n -i -E 'suiprivkey|mnemonic|recovery phrase|private[ _-]?key|BEGIN [A-Z ]*PRIVATE KEY'; echo "exit=$?"`
    (esperado `exit=1`; si alguna línea de prosa nueva coincide, listarla y justificarla).
- **Tests esperados:** no aplica (docs); los gates locales de TASK-1 siguen valiendo (sin cambios de código).
- **Riesgos / rollback:** desalineación doc ↔ workflow ⇒ la detecta el grep comparado; revertir el commit.

---

## Smoke

No aplica: es tooling; la evidencia son los runs de Actions (verde, cache hit, rojo de compilación y
rojo de lint) enlazados en el reporte.

## Orden y operación

1. Usuario resuelve STOP-2 y STOP-3 (bloquean el handoff); STOP-1 y STOP-4 se ejecutan después del merge.
2. MAYOR revisa el plan → MID genera `HANDOFF_CI.md`.
3. DEV TASK-1 → MID revisa → orquestador commitea, pushea y abre el PR **borrador** (dispara la CI) →
   orquestador hace la branch desechable para los rojos y aporta los links → MID cierra la revisión.
4. DEV TASK-2 → MID revisa → orquestador commitea; PR listo para revisión → MAYOR integración →
   merge con `contracts` en verde (D-20261030-09) → housekeeping → usuario activa STOP-1 (y STOP-4).
