# HANDOFF_TESTNET_PUBLISH

> Plan: — (chore; hace de plan la revisión de pre-vuelo del MAYOR, `documents/REVISION_PREVUELO_TESTNET.md` §2.4, §3.3 y §4,
> veredicto APTO CON PRE-REQUISITOS) | Issue: #8 | Branch: `feature/issue-8-testnet-publish` | PR: #48 (draft) |
> **Versión: v1.1** | Fecha: 2026-11-03 | Autor: MID | Estado: v1 aprobada por el MAYOR (APPROVE, 0 🔴/🟠, 6 🟡,
> 5 🔵); la v1.1 solo incorpora esa revisión y no vuelve a revisión (lo aceptó el MAYOR)

## Changelog

| Versión | Fecha | Cambios |
|---|---|---|
| v1 | 2026-11-03 | Versión inicial. Aprobada por el MAYOR; TASK-1 autorizado con esta versión |
| v1.1 | 2026-11-03 | Revisión del MAYOR de la v1. **m-1** (TASK-3 (d) y A12): la regla de cierre M-7 chequea cada ruta por separado (`test ! -e` y `compgen -G`), no con un único `ls`. **m-2** (TASK-2): la verificación impresa lleva el campo en un comentario `#`, para que la línea se pueda pegar, con su test. **m-3** (TASK-3, pasos 1 y 5): un `localnet.json` viejo se detecta y se borra en el paso 1. **m-4** (TASK-5 §3.2): la sonda corre por stdin con cwd `<repo>/app`, así resuelve `@mysten/sui`. **m-5** (A5): `D` va a `ids.env`. **m-6** (G1): la branch queda congelada entre G1 y G3. **s-1** adoptado (paso 1: chequeo de que el realpath de `SUI_CONFIG_DIR` esté fuera de `~/.sui`). **s-2** hecho (PR #48 en draft, la CI ya corre). **s-3** adoptado (permalink al `<head>` en el comentario de #8, que se publica en G1). **s-4** adoptado (B7 no falla por partidas ajenas creadas antes de la comisión). **s-5** adoptado (la sonda solo imprime booleanos, IDs y montos, y sus errores solo el mensaje). Comentario de #8 con PR #48. El addendum por P-C pasa a llamarse v1.2 |

> Decisión (2026-11-03, s-1): se adopta. Las llamadas `suio` del runbook (comisión, custodia, smoke) no pasan por el
> script, así que nada comprueba que `SUI_CONFIG_DIR` apunte fuera de `~/.sui`; una línea en el paso 1 cubre ese hueco.
> El costo es nulo y no reemplaza la guarda del script.

> Decisión (2026-11-03, s-3): se adopta. El enlace del comentario de #8 pasa a ser un permalink al `<head>` publicado:
> el merge commit (D7) lo conserva en `master` aunque se borre la branch. Por eso el comentario se publica en G1, cuando
> el `<head>` ya existe y tiene la CI verde.

> Decisión (2026-11-03, s-4): se adopta. En testnet, una partida que un tercero cree antes del `update_fee_rate` queda
> con comisión 0, y eso es inocuo (D-20261030-11). B7 la anota (`game_id`, `fee_rate`) y no marca NO PASA por ella;
> sí lo marca si la partida es del owner (sender `== S`).

> Decisión (2026-11-03, s-5): se adopta. La sonda guarda en memoria la dirección del owner (`S`); si imprime un objeto o
> una transacción entera, la filtra al reporte. Por eso solo imprime booleanos, IDs, digests y montos, y ante un error
> muestra solo `error.message`.

## Historia de usuario

**Como** owner del juego, **quiero** publicar el paquete `battleship` en testnet desde mi terminal con un runbook ya
ensayado y un repo listo (framework al día con la red, un script que no pueda "terminar bien" sin haber corrido y
comandos que solo funcionen con mi config propia), **para** que la primera publicación salga a la primera: la comisión
en 2 % antes de cualquier partida, el `HouseCap`, el `UpgradeCap` y el `Publisher` en mi cuenta, y los IDs registrados
en el repo para la app.

**Scope en una frase:** cierra los pre-requisitos previos a la publicación (repin H13, guardas y mensajes del script,
runbook del owner, ensayo en localnet aislada) y deja especificada la verificación y la documentación posteriores,
condicionadas a la entrega del owner.

**Lo que NO entrega:** la publicación misma (solo el owner, D-20261102-03); subir la CLI (P-C, solo si la PV de testnet
llega a 141 o más: addendum de este handoff); cambios en el código Move; upgrades; hosting de la app (#15); mainnet.

> Decisión (2026-11-03): sin `PLAN_TESTNET_PUBLISH.md` aparte. Es un chore sin cambios de contrato, con los STOP ya
> decididos (D-20261103-01) y un plan técnico escrito y razonado por el MAYOR (pre-vuelo §2.4 = P-1, §3.3 = runbook,
> §4 = pre-requisitos). Un plan propio repetiría ese documento; la HU y el desglose en tasks van en este handoff, que el
> MAYOR revisa como revisaría un plan.

---

## 0. Baseline de gates verificado (2026-11-03, `c144d40`)

| Qué | Valor | Fuente |
|---|---|---|
| Branch | `feature/issue-8-testnet-publish` @ `c144d40`, pusheada; sin PR todavía, así que **no hay CI sobre `c144d40`**. v1.1: el orquestador ya abrió el **PR #48** en draft (s-2), así que la CI corre en cada push | `git log`, `gh pr list --head …` vacío |
| Código respecto del último baseline | `ac5a85c..c144d40` solo toca `agents.md` (+4 líneas), `documents/` (housekeeping de #11, D-20261103-01, pre-vuelo): **cero cambios en `contracts/` y `app/`** | `git diff --stat ac5a85c c144d40` |
| CI de `master` @ `a6ee14c` | run 41556534947 (`push`): `contracts`, `app` y `framework-drift` *success*; único aviso, el H13 del lock en PV 139 | `gh api …/actions/runs` + pre-vuelo §1.1 |
| CLI | `sui 1.83.0-16d2dc1e05ed` = `ci.yml` (`SUI_VERSION`/`SUI_COMMIT`) | STATUS Toolchain, `ci.yml:22-23` |
| Node | `v26.13.0` (`.nvmrc` = 26) | STATUS Toolchain |
| contracts (medido en TASK-1 de #11, mismo código) | build **0 warnings**, `--lint` **0 lints**, test **83 PASS** (26 + 57), coverage 100 %; `Move.lock` sin delta | STATUS, Baselines |
| contracts/scripts (TASK-6 de #11, mismo código) | `node --test scripts/*.test.mjs` **99 PASS** (51 `deployment` + 48 `publish`); `check` **0 despliegues** | STATUS, Baselines |
| app @ `ac5a85c` | lint 0 / typecheck 0 / **630 tests** en 46 archivos / build testnet 878 kB | STATUS, Baselines |
| `Move.lock` | `[pinned.testnet.MoveStdlib]` y `[pinned.testnet.Sui]` en `719fb2960ccfbf9f4d33041f8ea5146d30671696` (PV 139) | `contracts/Move.lock:8,14` |
| PV de testnet (medida por el MID hoy) | **140**, época **1273** (inicio 2026-11-03 21:24:42 UTC) | GraphQL público `https://graphql.testnet.sui.io/graphql` |
| Manifest del framework @ `testnet-v1.83.0` | clave `140` = `05ad86a3e86c522deea116f80dc2bf2309a53363`, clave `139` = `719fb29…`; clave máxima **140** | `crates/sui-framework-snapshot/manifest.json` (lectura pública por tag) |
| `~/.sui/sui_config/` | solo `client.yaml`, 244 B, mtime 2026-10-30 17:52:52 | `ls` / `stat` |

**Ventana:** devnet ya está en PV 141 (pre-vuelo §2.1). Con la cadencia observada, `testnet-v1.84` y la PV 141 en testnet
pueden llegar en 1-2 semanas. TASK-1 a TASK-4 conviene cerrarlos sin pausas; si la PV sube antes de publicar, rige P-C
(§"Secuencia", puerta G2).

## Decisiones del owner (no reabrir)

| # | Decisión | Fuente |
|---|---|---|
| D1 | El owner **conserva el `UpgradeCap`** (política por defecto, compatible); se revisa antes de cualquier mainnet | D-20261103-01 (1) |
| D2 | **Hasta cerrar #17** se puede republicar en testnet con IDs nuevos ante un cambio incompatible; después, PROY-10 estricto | D-20261103-01 (2) |
| D3 | `update_fee_rate` a **200 bps** inmediatamente después de publicar, antes de crear partidas o anunciar el juego, y verificado leyendo la House | D-20261103-01 (3), D-20261030-11 |
| D4 | La clave del owner vive en un `SUI_CONFIG_DIR` propio fuera de `~/.sui/`; ningún agente corre el camino testnet del script, ni con `--dry-run` | D-20261102-03 |
| D5 | `~/.sui/sui_config/` queda **sin claves para siempre** | D-20261030-07 |
| D6 | `deployments/testnet.json` (14 campos, sin direcciones) lo escribe solo el script; `Published.toml` es la fuente y se commitea | D-20261102-01 |
| D7 | Merge con **merge commit**, nunca squash: los SHAs citados (y el `sourceCommit`) siguen existiendo en `master` | D-20261030-09 |

## Decisiones del MID (actuar y reportar)

> Decisión (2026-11-03): **el ensayo en localnet aislada va en este handoff (TASK-4) y es obligatorio**, en vez de quedar
> como recomendación (S-2). Motivos: (1) el repin cambia el framework contra el que compila el paquete y, sin ensayo, la
> primera ejecución real del camino del script con el lock nuevo sería la del owner en testnet; (2) TASK-2 cambia
> `publish.mjs` y conviene verlo correr de punta a punta; (3) sobre todo, los comandos y filtros `jq` del runbook nuevo
> (comisión, House, custodia, crear, cancelar) **nunca se ejecutaron** contra la salida real de la CLI 1.83: el ensayo los
> corre tal cual (con `suic` en lugar de `suio`) y corrige el README si algún filtro no coincide. Costo: una sesión del
> DEV con un procedimiento ya probado en #7, #10 y #11.

> Decisión (2026-11-03): TASK-4 usa la **variante A** (`--out` dentro de `<SMOKE_DIR>`), no la B: no hay app en juego,
> `contracts/deployments/` no se toca y el árbol queda limpio para P-6. La **variante B** (`localnet.json` en la ruta por
> defecto) se ejerce en TASK-5, después de publicar, porque ahí es donde cambia algo: `localnet.json` convive con
> `testnet.json` y con un `Published.toml` que ya tiene `[published.testnet]`, que es la situación de los smokes de #12
> en adelante, y se prueba de verdad la regla de cierre nueva (M-7).

> Decisión (2026-11-03): **M-4 se resuelve con una guarda en el script y además con el requisito en el runbook**. Con
> Node 20 el script sale con 0 sin imprimir nada justo en el comando cuya salida el owner usa para decidir si sigue
> (`--dry-run`). Una línea del runbook depende de que el owner la lea; la guarda falla cerrada en todos los subcomandos,
> son unas 30 líneas puras y testeables, y lee la versión de `.nvmrc`, la misma fuente que la CI (como `checkCliVersion`
> lee `ci.yml`). El runbook conserva `nvm use` y el criterio de éxito explícito.

> Decisión (2026-11-03): **M-2: el comando impreso lleva `printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu
> SUI_CONFIG_DIR}" sui client …`**. En la shell de publicación, donde el owner exportó su config, funciona tal cual. En
> cualquier otra shell, la expansión `:?` aborta **antes** de invocar `sui`, así que nunca cae en `~/.sui/`. Tampoco
> imprime la ruta de la config (#39). En testnet lleva **200** (D3). En localnet lleva `<bps>`, que tampoco se ejecuta,
> porque el shell lo toma como redirección. El runbook usa la misma forma envuelta en una función `suio` (réplica de
> `suic` de los smokes).

> Decisión (2026-11-03): **M-7 va en este PR antes de publicar (TASK-3)**. La regla nueva (árbol limpio + `Move.lock` y
> `Published.toml` sin delta + ni `Pub.*.toml` ni `deployments/localnet.json`) vale igual antes de la publicación (los
> dos archivos no existen: el `git diff` de una ruta inexistente da 0) y después (están commiteados y sin cambios). Por
> eso no rompe los smokes vigentes, y TASK-4 la usa en su cierre.

> Decisión (2026-11-03): las tablas del smoke (`documents/SMOKE_TESTNET_PUBLISH.md`) las escribe el MID en este handoff
> (TASK-4 §6 y TASK-5 §6). El DEV crea el archivo copiándolas y lo completa **durante** cada corrida (FLUJO §6). Parte A =
> ensayo en localnet; Parte B = testnet (entrega del owner + verificación pública).

## Mapa de hallazgos del pre-vuelo → tasks

| Hallazgo / pre-requisito | Dónde se cierra |
|---|---|
| P-1 (repin), M-1 (test del lock), S-3 (ejemplo del README) | TASK-1 |
| M-2 (comando de `update_fee_rate` del script), M-4 (Node 26) | TASK-2 (código + tests) y TASK-3 (runbook) |
| M-3, M-5, M-6, P-4 (runbook completo, modelo de confianza) | TASK-3 + comentario de #8 (§"Comentario para #8") |
| M-7 (`agents.md:177`) | TASK-3 |
| S-2 (ensayo en localnet) | TASK-4 (obligatorio, decisión arriba) |
| P-2 (S-4 + autorización en D-20261103-01) | Owner/orquestador con el texto de §"Texto propuesto para D-20261103-01" (el MID no edita `DECISIONES.md`) |
| P-3 (pre-vuelo como comentario en #8) | ✅ ya publicado (comentario del 2026-11-04 00:23 UTC en #8) |
| P-5 (PV justo antes de publicar) | Runbook, paso 2 (owner) + puerta G2 |
| P-6 (todo commiteado, CI verde en el head publicado, sin rebase/squash) | Puertas G1/G3 (branch congelada entre ambas, m-6) + runbook pasos 1 y 12 |
| S-5 (verificación pública independiente) | TASK-5 |
| S-1 | Informativo, sin acción |

## Secuencia y puertas

```
TASK-1 repin ─▶ TASK-2 script ─▶ TASK-3 runbook/docs ─▶ TASK-4 ensayo localnet
   (cada task: reporte DEV → revisión MID → commit del orquestador)
        │
        ▼
G1  owner aplica S-4 + autorización en DECISIONES.md (P-2) → commit · push al PR #48
    · CI del head: contracts ✅ app ✅ framework-drift "lock al día", sin aviso H13 → ese SHA es <head>
    · comentario de #8 publicado con el permalink a <head> (s-3)
    · BRANCH CONGELADA (m-6): desde que se entrega <head> al owner, nadie pushea a la branch hasta el commit de
      G3. Si hace falta un commit en medio (fix, doc), se repite G1 completo con un head nuevo y su CI, y el
      owner recibe el <head> nuevo (y el comentario de #8 se corrige)
        │
        ▼
G2  owner: runbook de contracts/README.md → "Uso en testnet", pasos 0-11, sobre <head> (el SHA con CI verde
    que le pasa el orquestador). PV ≠ 140 en el paso 2 ⇒ no publica ⇒ STOP → addendum v1.2 con P-C
        │
        ▼
G3  entrega del owner (runbook paso 11) → el orquestador commitea testnet.json + Published.toml tal cual
    (commit propio, sin rebase ni squash de nada anterior)
        │
        ▼
TASK-5 verificación post-publicación ─▶ TASK-6 docs post-publicación ─▶ revisión de integración del MAYOR ─▶ merge
```

---

## TASK-1: Repin de `Move.lock` al framework de la PV 140 — área: contracts

### 1. Historia de usuario del task

**Como** owner, **quiero** que el paquete compile contra el framework que corre hoy en testnet (PV 140), **para** que el
`frameworkRev` que registra `testnet.json` sea el de la red, el `framework-drift` de la CI deje de avisar y una
verificación de fuentes contra la red coincida.

### 2. Contexto

- `contracts/Move.lock:8,14`: `rev = 719fb29…` (piso de la PV 139). Testnet está en PV 140 desde la época 1269; framework
  de la 140 = `05ad86a3e86c522deea116f80dc2bf2309a53363` (§0). La CLI no repinea sola (STATUS H13; pre-vuelo §2.2).
- `contracts/scripts/deployment.test.mjs:37` define `FRAMEWORK_REV = 719fb29…`. La usan los tests del fixture
  (`localnetDeployment()`, `:46`) **y** el test de `:323-325`, que lee el `Move.lock` **real**: tras el repin ese test queda
  en rojo (M-1).
- `contracts/README.md:501`: el ejemplo "con IDs ficticios" lleva el `frameworkRev` real viejo (S-3).
- Modelo: el pinning de #1 (H2) y el procedimiento P-1 del pre-vuelo (§2.4), que este task replica paso por paso.

### 3. Qué implementar

1. **Línea base** (sin cargar nada de `~/.sui/`): `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y
   `ls <HOME real>/.sui/sui_config/`; `printf 'n\n' | sui --version` = `sui 1.83.0-16d2dc1e05ed`; PV de testnet por
   GraphQL público (la consulta del paso 2 del runbook, TASK-3) = **140**. Si la PV no es 140: **STOP** (P-C), sin repinear.
2. Desde `contracts/`: `printf 'n\n' | sui move update-deps -e testnet; echo "exit=$?"` → `exit=0`. Es la única
   operación con red: lee la PV por gRPC con la config sin claves.
3. `git diff -- contracts/Move.lock`. Delta **esperado y único**: el `rev` de `[pinned.testnet.MoveStdlib]` y el de
   `[pinned.testnet.Sui]` pasan de `719fb29…` a `05ad86a3…` (iguales entre sí). Si cambian, también sus
   `manifest_digest`. Sin cambios en `[move] version = 4` ni en `[pinned.testnet.battleship]`, y sin ninguna sección
   `[pinned.<otro env>]`. Confirmar que el rev nuevo = clave `140` del manifest con una lectura pública:
   `curl -fsSL https://raw.githubusercontent.com/MystenLabs/sui/testnet-v1.83.0/crates/sui-framework-snapshot/manifest.json | jq -r '."140".git_revision'`.
   **Cualquier otro delta: STOP**, con el diff pegado.
4. Copiar el lock repineado a `<scratchpad>/Move.lock.repin`. Sirve de referencia para comprobar que los gates no lo
   tocan: el repin no está commiteado, así que `git diff --exit-code` no sirve todavía.
5. **M-1**, en `contracts/scripts/deployment.test.mjs`: una constante nueva, p. ej.
   `const LOCK_FRAMEWORK_REV = '05ad86a3e86c522deea116f80dc2bf2309a53363'; // Move.lock del repo: piso de la PV 140 (repin de #8)`,
   y el test de `:323-325` compara contra ella. `FRAMEWORK_REV` queda **solo** para el fixture `localnet.deployment.json`
   (registro histórico real, no se recaptura); renombrarla a `FIXTURE_FRAMEWORK_REV` es opcional si se declara.
6. **S-3**, en `contracts/README.md:501`: `frameworkRev` del ejemplo → `05ad86a3e86c522deea116f80dc2bf2309a53363`.
7. Gates (§5) y `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base (si cambió, declararlo).

### 4. Archivos

- **Tocar:** `contracts/Move.lock` (solo vía `update-deps`, nunca a mano), `contracts/scripts/deployment.test.mjs`,
  `contracts/README.md` (solo `:501`), `documents/STATUS.md`.
- **NO tocar:** `contracts/Move.toml`, `sources/`, `tests/`, `contracts/scripts/fixtures/`, `publish.test.mjs:56` y
  `app/src/sui/config.test.ts:28` (son datos del fixture, no del lock), `.github/workflows/ci.yml` (la CLI no cambia).

### 5. Tests y gates obligatorios (forma canónica, `agents.md` §3, desde `contracts/`)

```bash
printf 'n\n' | sui move build -e testnet --warnings-are-errors                 # 0 warnings
printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors          # 0 lints
printf 'n\n' | sui move test -e testnet --warnings-are-errors                  # 83 PASS (26 + 57)
printf 'n\n' | sui move test -e testnet --coverage && printf 'n\n' | sui move coverage summary -e testnet   # informativo: 100 %
node --test scripts/*.test.mjs                                                  # Node 26: 99 PASS
node scripts/publish.mjs check                                                  # 0 despliegues
cmp Move.lock <scratchpad>/Move.lock.repin; echo "cmp=$?"                       # cmp=0: los gates no tocaron el lock repineado
git status --porcelain                                                          # solo los 4 archivos del task
```

Declarar si la caché de Move descargó el framework nuevo (es esperado: rev nuevo). En la CI, el primer run del PR tendrá
un *miss* de la caché `move-git-…` (su clave depende del hash del lock): esperado.

### 6. Smoke

No aplica en este task (el ensayo es TASK-4).

### 7. Criterios de aceptación

- Delta del lock = exactamente el del paso 3, declarado en el reporte (PROY-11), con el rev = clave `140` del manifest.
- Gates como en §5: 0 / 0 / 83 / 100 % / 99 / 0 despliegues; `cmp=0`; `~/.sui/sui_config/` sin cambios.
- `STATUS.md`: fila "Framework" de Toolchain (`05ad86a3…`, piso de la PV 140, repin de #8 con fecha y época), H13 (✅
  repinado el `<fecha>`, época `<N>`, PV 140; el aviso del `framework-drift` desaparece), fila de baseline nueva
  (`contracts/ @ feature/issue-8-testnet-publish (<sha>)`, 2026-11-0X) y fila "#8 🚧" en "Ciclo activo".
- **Tras el push (lo verifica el orquestador, criterio de G1):** en la CI del PR, `contracts` verde y `framework-drift`
  con veredicto "lock al día" en el resumen y **ninguna** anotación `title=H13`. Comprobación:
  `gh api repos/sdelvalle57/sui_battleship/check-runs/<id del job framework-drift>/annotations --jq 'length'` = 0.

### 8. Al terminar

Reporte con la plantilla de `FLUJO_AGENTES.md` §5 (diff del lock pegado entero, salida de `update-deps`, gates). Sin
commits ni pushes. Mensaje de commit sugerido: `contracts: repin Move.lock to the PV 140 framework (#8)`.

---

## TASK-2: Guarda de Node 26 y comando pegable de `update_fee_rate` en `publish.mjs` — área: contracts

### 1. Historia de usuario del task

**Como** owner, **quiero** que el script de publicación se niegue a correr con un Node que no sea el del repo y que me
imprima un comando de comisión que solo funcione con mi config propia y con 200 bps, **para** no tomar por buena una
corrida que no pasó y no tener que "arreglar" a mano un comando que caería en `~/.sui/`.

### 2. Contexto

- `contracts/scripts/publish.mjs:805`: `if (import.meta.main) …`. Con Node 20, `import.meta.main` es `undefined`: el
  script no corre `main()` y sale con 0 sin imprimir nada (M-4, medido por el MAYOR: Node 20.20.2 no corre; 22.23.4 y
  26.13.0 sí). En esta máquina hay Node 20, 22 y 26 vía nvm (`agents.md` §11).
- `publish.mjs:482-497`, `formatSummary`: imprime `sui client call … update_fee_rate --args <houseId> <houseCapId> <bps>`
  y `sui client object <houseId> --json`, sin `printf 'n\n' |`, sin `SUI_CONFIG_DIR` y con `<bps>` (M-2).
- Modelo a replicar: `checkCliVersion` (`publish.mjs:315-336`) lee `ci.yml` como fuente única y es pura y testeada; el
  arnés `mainCapturingStderr` (`publish.test.mjs:216-228`) prueba `main` sin invocar la CLI.

### 3. Qué implementar

**(a) Guarda de Node (M-4).**

```js
/**
 * Guarda 0 (#8, M-4): el major de Node debe ser el de `.nvmrc` (fuente única, PROY-17). Falla cerrada en todos los
 * subcomandos: sin ella, con un Node sin `import.meta.main` el script saldría con 0 sin haber corrido.
 * @param {{ nodeVersion: string, nvmrcText: string }} args  p. ej. `process.versions.node` = '26.13.0', `.nvmrc` = '26\n'
 */
export function checkNodeVersion({ nodeVersion, nvmrcText }) { … }   // lanza Error si no coincide el major
```

- `nvmrcText` sin un major entero (`/^\s*v?(\d+)\s*$/`): error ("`.nvmrc` sin versión válida").
- Mensaje (sin rutas): `se requiere Node <N> (.nvmrc); este es v<versión>: corre "nvm use" en la raíz del repo`.
- `main(argv, { nodeVersion = process.versions.node } = {})`: la guarda es lo **primero** dentro del `try`, antes de
  `parseCliArgs`; lee `path.join(CONTRACTS_DIR, '..', '.nvmrc')`. Si falla, sale con `EXIT.FAILURE` (1).
- **Punto de entrada que no dependa de `import.meta.main`**:

  ```js
  /**
   * ¿Este módulo es el punto de entrada? `import.meta.main` si el runtime lo trae (boolean); si no (Node < 22.18),
   * compara el realpath de `process.argv[1]` con el de este archivo, para que la guarda de Node llegue a correr.
   */
  export function isEntryPoint({ importMetaMain, argv1, modulePath, realpath }) { … }

  if (isEntryPoint({ importMetaMain: import.meta.main, argv1: process.argv[1],
                     modulePath: fileURLToPath(import.meta.url), realpath: fs.realpathSync })) {
    process.exitCode = await main(process.argv.slice(2));
  }
  ```

  `importMetaMain` boolean → se devuelve tal cual (los tests que importan el módulo con Node 26 siguen sin correr
  `main`). `undefined` → `argv1` string no vacío y `realpath(path.resolve(argv1)) === realpath(modulePath)`; si `realpath`
  lanza, `false`.

**(b) Comando de comisión pegable (M-2).**

- Constantes (LIM-6): `TESTNET_FEE_BPS = 200` (comentario: D-20261103-01 (3)) y el prefijo del comando, como **string
  normal, no template literal**. En un template, `${SUI_CONFIG_DIR:?…}` se interpolaría:

  ```js
  const OWNER_CLI_PREFIX = 'printf \'n\\n\' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client';
  ```

  (el texto impreso debe ser exactamente `printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client`).
- `formatSummary` (usa `deployment.network`):

  ```
  Siguiente paso obligatorio (#8), no lo ejecuta este script. En la shell donde exportaste tu SUI_CONFIG_DIR
  (README → "Uso en testnet", pasos 6-10):
    <OWNER_CLI_PREFIX> call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> <bps>
  Verificación:
    <OWNER_CLI_PREFIX> object <houseId> --json   # campo content.fee_rate
  ```

  `<bps>` = `200` en testnet (D-20261103-01) y el literal `<bps>` en localnet (cada smoke elige su valor). Ninguna línea
  del resumen empieza con `sui client` sin el prefijo. **m-2:** cada comando va solo en su línea, sin texto de prosa
  pegado (el `(` de la v1 rompía el pegado con un error de sintaxis); la nota sobre el campo va como comentario `#`.
- `RETRY_ADVICE` y `formatPostPublishFailure` no cambian (`<tu dir>` ya es un placeholder que no se ejecuta).

### 4. Archivos

- **Tocar:** `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `documents/STATUS.md` (baseline).
- **NO tocar:** `deployment.mjs`, `fixtures/`, `contracts/README.md` (el runbook entero lo reescribe TASK-3), `ci.yml`.

### 5. Tests obligatorios (`publish.test.mjs`)

- `checkNodeVersion`: `26.13.0` + `'26\n'` ok; `'v26\n'` ok; `20.20.2`, `22.23.4` y `27.0.0` lanzan con el mensaje (sin
  rutas); `.nvmrc` vacío o `'lts/*'` lanza; y un caso con el `.nvmrc` **real** del repo + `process.versions.node` (pasa en
  la CI, que usa `.nvmrc`).
- `isEntryPoint`: `true`/`false` se devuelven tal cual sin llamar a `realpath`; `undefined` + mismo realpath → `true`;
  `undefined` + otro archivo → `false`; `undefined` + `argv1` `undefined` o `''` → `false`; `realpath` que lanza → `false`.
- `main(['check'], { nodeVersion: '20.20.2' })` → `EXIT.FAILURE` y stderr con `/se requiere Node 26/`, sin invocar la CLI
  ni git (con el arnés `mainCapturingStderr`). Los casos existentes de `main` siguen pasando.
- `formatSummary` (reemplaza el test de `:650-662`):
  - testnet: contiene la línea exacta con `OWNER_CLI_PREFIX` y `… <houseCapId> 200`, y la de verificación; **no** contiene
    `<bps>`;
  - localnet: contiene `<bps>`;
  - ambos: los 14 campos, ninguna línea `/^\s*sui client/m`, `assertNoAccountAddress`, y el texto literal
    `${SUI_CONFIG_DIR:?` (prueba de que no se interpoló);
  - **m-2, pegable:** en el resumen de testnet, las dos líneas de comando (las que empiezan con `printf 'n\n' |`) pasan
    `bash -n -c '<línea>'` (`spawnSync('bash', ['-n', '-c', línea])`, que solo parsea y no ejecuta nada) con estado 0. En
    localnet no se aplica: `<bps>` falla a propósito.
- **Verificación manual (va en el reporte, no es gate):** con las rutas absolutas de nvm,
  `<HOME real>/.nvm/versions/node/v20.<x>/bin/node scripts/publish.mjs check; echo "exit=$?"` → mensaje + `exit=1`;
  igual con v22 → `exit=1`; con v26 → `0 despliegues`, `exit=0`.

Gates: `node --test scripts/*.test.mjs` (99 + los nuevos, conteo exacto por archivo), `node scripts/publish.mjs check`
(0 despliegues), `git diff --exit-code -- Move.lock` (el lock ya commiteado en TASK-1). Sin cambios Move: los gates
`sui move` no hacen falta en este task, y la CI los corre igual.

### 6. Smoke

Se ejerce en TASK-4 (corrida real del resumen en la localnet aislada).

### 7. Criterios de aceptación

- Con Node 20 y 22 el script sale con 1 y el mensaje; con Node 26 todo igual que antes.
- El resumen imprime el comando con el prefijo guardado; en testnet con `200`.
- Tests nuevos en verde; conteos reportados; STATUS con la fila de baseline de `contracts/scripts` (`<sha>`, Node v26.13.0).

### 8. Al terminar

Reporte §5 con el output de `node --test` y de la verificación manual con Node 20/22/26. Sin commits. Commit sugerido:
`contracts: fail closed on a non-.nvmrc Node and print a guarded fee command (#8)`.

---

## TASK-3: Runbook del owner, modelo de confianza y cierre de smokes — área: docs

### 1. Historia de usuario del task

**Como** owner, **quiero** un único runbook, de la config a la entrega, con comandos que pueda pegar y un resultado
verificable por paso, **para** publicar, fijar la comisión, comprobar la custodia y hacer el smoke sin improvisar ni
pegar mi dirección en ningún lado.

### 2. Contexto

- `contracts/README.md:575-600` ("Uso en testnet (solo el owner)"): 6 pasos sin Node 26, sin `export`, sin la medición de
  la PV, sin custodia, sin smoke y sin lista de archivos (M-2, M-3, M-4, P-4). Los pasos 2, 3, 4 y 6 del issue están
  superados (M-5, se resuelve con el comentario de §"Comentario para #8").
- `contracts/README.md:137-151` ("Versionado"): falta el modelo de confianza del `UpgradeCap` y las restricciones
  permanentes (M-6; pre-vuelo §1.2).
- `agents.md:153` y `:176-177`: el cierre del smoke de localnet exige que no exista `contracts/deployments/` (M-7).
- `agents.md:368-372` ("Orden de #8"): usa `SUI_CONFIG_DIR=<su dir>` en línea y "el comando que imprime el script".
- Formas reales de la CLI 1.83 ya vistas en smokes anteriores (modelo de los filtros): `suic object <id> --json` con
  `.objType`, `.owner` y `.content.<campo>`; `u16` como `250.0`; `opponent` `null`; eventos en `.events[] | {type,
  parsedJson}`; `.effects.status.status`; `objectChanges[].objectType == "0x2::package::Publisher"` (fixture
  `scripts/fixtures/localnet-publish.json`). TASK-4 confirma cada filtro.

### 3. Qué implementar

**(a) `contracts/README.md` → "Despliegues" (intro):** una línea más: "El script exige el Node de `.nvmrc` (26): con otra
versión sale con 1 y un mensaje (#8)".

**(b) `contracts/README.md` → reemplazar "Uso en testnet (solo el owner)" entero por este texto** (el DEV puede
ajustar redacción; los comandos y valores esperados se cambian solo con evidencia de TASK-4):

~~~markdown
### Uso en testnet (solo el owner)

Ningún agente corre este camino, ni con `--dry-run` (D-20261102-03). No admite `--out` ni `--pubfile-path`: el json va
siempre a `deployments/testnet.json`, el que `check` cruza con `[published.testnet]`. Lo corre **solo el owner**, en su
terminal (bash o zsh, con `jq`), desde su clon del repo. Nada de lo que imprime la CLI se pega en el repo, en issues ni
en chats, salvo los digests y los IDs públicos que imprime el script. Placeholders: `<repo>` (raíz del clon), `<su dir>`
(su config propia), `<branch>` y `<head>` (la branch del PR y el SHA con la CI en verde que le pasa el orquestador).

**Modelo de confianza.** La dirección publicadora recibe el `HouseCap`, el `UpgradeCap` y el `Publisher`. Quien tiene el
`UpgradeCap` es de confianza total: puede publicar código que mueva el `stake` de las partidas `Pending` y las comisiones
(ver "Versionado" → "Modelo de confianza del `UpgradeCap`"). Ninguno de los tres se usa ni se transfiere fuera de un
procedimiento documentado; el `HouseCap` solo se mueve con `transfer_house_cap`, nunca con "Send" de la wallet.

#### 0. Config propia (una vez)

- La config vive en un `SUI_CONFIG_DIR` **absoluto y fuera de `~/.sui/`**, con la clave del owner y un env de alias
  exactamente `testnet` (RPC `https://fullnode.testnet.sui.io:443`) como env activo. La dirección activa es la misma que
  usa en la wallet del navegador, porque el panel admin (#14) firma con ella. Cómo crea o importa la clave es manejo
  personal del owner: la frase de recuperación nunca sale de su terminal.
- **Siempre `export SUI_CONFIG_DIR=<su dir>` antes de cualquier `sui client …` o `sui keytool …`.** Sin ese export la CLI
  usa `~/.sui/sui_config/`, que queda **sin claves para siempre** (D-20261030-07): un `new-address` o un `import` ahí
  dejaría una clave al alcance de los agentes.
- El script exige esa config (absoluta, con `client.yaml`, con su `realpath` fuera de `~/.sui`). Si no puede inspeccionar
  una ruta (permisos, symlinks en bucle), aborta con el código del error (`EACCES`, `ELOOP`), nunca con la ruta.

#### 1. Shell de publicación

```bash
cd <repo> && git switch <branch> && git pull --ff-only
git status --porcelain                  # vacío, también sin archivos sin trackear
git log -1 --format=%H                  # = <head> (será el sourceCommit del json)
test ! -e contracts/deployments/localnet.json || rm contracts/deployments/localnet.json   # resto de un smoke viejo
nvm use && node --version               # v26.x; con otra versión el script sale con 1
export SUI_CONFIG_DIR=<su dir>          # solo en esta shell
case "$(realpath -m "$SUI_CONFIG_DIR")/" in "$(realpath -m ~/.sui)"/*) echo "ABORTA: config dentro de ~/.sui";; *) echo "config fuera de ~/.sui";; esac
suio() { printf 'n\n' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client "$@"; }
printf 'n\n' | sui --version            # sui 1.83.0-16d2dc1e05ed (= SUI_VERSION/SUI_COMMIT de ci.yml)
suio active-env                         # testnet
suio active-address                     # la dirección de su wallet; no se pega
suio gas                                # saldo; no se pega
```

`suio` es la única forma de llamar a `sui client` en este runbook: sin el `export` aborta antes de invocar `sui` (nunca
cae en `~/.sui/`), y en una shell nueva ni siquiera existe. La línea `case` debe imprimir `config fuera de ~/.sui`:
`suio` solo comprueba que la variable esté definida, y las llamadas de los pasos 6-10 no pasan por la guarda del
script. Con `ABORTA`, no se sigue. Un `contracts/deployments/localnet.json` que haya quedado de un smoke viejo pertenece
a una génesis ya borrada y lo ignora git: se borra, porque si no el paso 5 vería otra salida de `git status` y `check`
contaría 2 despliegues. Saldo necesario: el gas que estime el paso 3 más ≈ 0,05 SUI para la comisión y el smoke. El SUI
de testnet sale del faucet web vigente.

#### 2. Versión de protocolo, justo antes de publicar (STATUS H13)

```bash
curl -fsSL -X POST -H 'content-type: application/json' \
  -d '{"query":"{ epoch { epochId protocolConfigs { protocolVersion } } }"}' \
  https://graphql.testnet.sui.io/graphql | jq '.data.epoch'
```

`protocolVersion` debe ser la PV del framework de `Move.lock` (`documents/STATUS.md` → Toolchain → Framework). Si es
mayor: **no publicar** y avisar al orquestador. Antes hay que subir la CLI a un release `testnet` cuya PV máxima la
cubra (`ci.yml`, tests y fixtures de `scripts/`), repinear el lock, re-medir los gates y repetir el ensayo en la localnet
aislada, todo en un PR. El dry run no lo detecta: la CLI solo avisa con más de 2 versiones de diferencia.

#### 3. Dry run

```bash
cd contracts
node scripts/publish.mjs publish --network testnet --dry-run; echo "exit=$?"
```

Éxito = la línea **`Dry run ok. Gas estimado: N MIST.`** y `exit=0`; cualquier otra salida es un fallo y no se sigue.
Sin `printf` delante de `node`: el script ya le responde `n` a la CLI, y la confirmación del paso 4 necesita la
terminal. Comprueba el env activo y el chain id, la CLI contra `ci.yml`, el árbol limpio, que no haya una publicación
previa y que el dry run no cambie `Move.lock`.

#### 4. Publicación

```bash
node scripts/publish.mjs publish --network testnet
```

Repite las guardas y el dry run y pide escribir `testnet` (freno contra accidentes; la autorización es la del owner,
D-20261030-09). Imprime los 14 campos, el directorio temporal (`battleship-publish-*`, `0700`) y el siguiente paso. Ante
cualquier error: "Recuperación" (nunca reintentar sin buscar el digest). Después, en la misma shell:

```bash
D=<directorio temporal que imprimió el script>
PKG="$(jq -r .packageId deployments/testnet.json)"; HOUSE="$(jq -r .houseId deployments/testnet.json)"
CAP="$(jq -r .houseCapId deployments/testnet.json)"; UCAP="$(jq -r .upgradeCapId deployments/testnet.json)"
```

#### 5. Archivos esperados

```bash
git status --porcelain
node scripts/publish.mjs check
```

`git status` debe dar **exactamente** `?? contracts/Published.toml` y `?? contracts/deployments/`, y `check` debe dar
`1 despliegue(s) válidos y coherentes con Published.toml`. Ante cualquier otro cambio (p. ej. ` M contracts/Move.lock`):
STOP; se avisa al orquestador sin commitear ni editar nada. Esto vale porque el paso 1 ya borró cualquier
`localnet.json` viejo. Si aun así aparece, git lista `?? contracts/deployments/testnet.json` en vez de la carpeta y
`check` cuenta 2: no es un STOP; se borra `contracts/deployments/localnet.json` y se repite este paso.

#### 6. Comisión: 200 bps, antes de cualquier partida (D-20261103-01)

```bash
suio call --package "$PKG" --module house --function update_fee_rate --args "$HOUSE" "$CAP" 200 --json > "$D/fee.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/fee.json"
jq '.events[] | select(.type | endswith("::house::FeeRateUpdated")) | .parsedJson' "$D/fee.json"
```

`exit=0`, digest y `success`; `old_fee_rate` 0 y `new_fee_rate` 200 (la CLI muestra los `u16` como `0.0`/`200.0`). Es el
mismo comando que imprime el script. Una partida creada antes de este paso quedaría con comisión 0 para siempre
(D-20261030-11).

#### 7. House

```bash
suio object "$HOUSE" --json > "$D/house.json"
jq '{type: .objType, owner: .owner, content: .content}' "$D/house.json"
```

Dueño `Shared`; `fee_rate` 200, `min_bet` `"1000000"`, `max_bet` `"50000000000"`, `version` `"1"`, `fees_collected` 0.

#### 8. Custodia, sin pegar la dirección

```bash
A="$(suio active-address)"
PUB="$(jq -r '.objectChanges[] | select(.objectType == "0x2::package::Publisher") | .objectId' "$D/publish-output.json")"
for id in "$CAP" "$UCAP" "$PUB"; do suio object "$id" --json | jq -r --arg a "$A" '[.objType, (.owner.AddressOwner == $a)] | @tsv'; done
```

Tres líneas (`…::house::HouseCap`, `0x2::package::UpgradeCap`, `0x2::package::Publisher`), cada una con `true`. Se
entrega solo "sí/no" por objeto.

#### 9. Smoke: crear con `min_bet`

```bash
suio ptb --split-coins gas "[1000000]" --assign c --move-call "$PKG::game::create_game" @"$HOUSE" c.0 none --json > "$D/smoke-create.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/smoke-create.json"
jq '.events[] | select(.type | endswith("::game::GameCreated")) | .parsedJson | {bet, fee_rate, opponent}' "$D/smoke-create.json"
GAME="$(jq -r '.objectChanges[] | select(.type == "created" and (.objectType | endswith("::game::Game"))) | .objectId' "$D/smoke-create.json")"
```

`success`; `bet` `"1000000"`, **`fee_rate` 200** (prueba que la partida copió la comisión nueva) y `opponent` `null`.

#### 10. Smoke: cancelar

```bash
suio call --package "$PKG" --module game --function cancel_game --args "$GAME" --json > "$D/smoke-cancel.json"; echo "exit=$?"
jq -r '.digest, .effects.status.status' "$D/smoke-cancel.json"
jq '.events[] | select(.type | endswith("::game::GameCancelled")) | .parsedJson | {refund, by_creator: (.cancelled_by == .creator)}' "$D/smoke-cancel.json"
suio object "$GAME" --json | jq '{state: .content.state, stake: .content.stake}'
```

`success`; `refund` `"1000000"` y `by_creator` `true`; `state` `Cancelled` y `stake` `"0"`.

#### 11. Entrega al orquestador

- `contracts/deployments/testnet.json` y `contracts/Published.toml` **sin editar ni commitear**: los commitea el
  orquestador en la branch del PR. Si publicó desde otro clon, se los pasa tal cual.
- Los digests de publicación (`publishTxDigest`), comisión, crear y cancelar (son públicos).
- "sí/no" de la custodia (paso 8) y la PV y la época medidas en el paso 2.
- Nada más: ni la salida de la CLI ni el contenido de `$D`, que traen la dirección.

#### 12. Cierre

- Después de publicar, la branch no se rebasea ni se squashea: el `sourceCommit` del json tiene que seguir existiendo en
  `master` (merge commit, D-20261030-09).
- Recién con la CI del PR en verde (`check` incluido): `rm -rf` de los dos `battleship-publish-*`, el del dry run y el de
  la publicación. Hasta entonces sirven para `record` ("Recuperación").

El script guarda en la config activa el cache `chain_id` del env (efecto de `chain-identifier`; inocuo y siempre en la
config propia, nunca en `~/.sui/`).
~~~

**(c) `contracts/README.md` → "Versionado" (M-6):** un bullet nuevo al final:

> **Modelo de confianza del `UpgradeCap` (D-20261103-01 (1)).** Su titular es de confianza total: un upgrade compatible
> puede agregar funciones que muevan el `stake` de toda partida `Pending` y las comisiones de la House. Las políticas
> `additive` y `dep_only` no lo impiden (permiten funciones nuevas); solo `make_immutable` lo cierra. Restricciones
> permanentes desde la primera publicación: (a) `cancel_game` y `reject_game` de la v1 se pueden invocar para siempre
> (no leen la versión), así que toda versión nueva mantiene `stake` como **única** custodia de fondos del `Game`, porque
> un fondo guardado en otro lado (p. ej. en dynamic fields) quedaría huérfano al cancelar desde la v1; (b) `Game`,
> `House` y `HouseCap` nunca podrán tener `store`, ni `GameState` variantes nuevas; (c) la política del cap se revisa
> antes de cualquier mainnet.

**(d) `agents.md` (M-7):**

- `:153`, variante (B): "(ignorado por git; el script crea la carpeta si falta y el cierre lo borra)".
- `:176-177`: reemplazar "`git status --porcelain`; `git diff --exit-code -- contracts/Move.lock`; ni
  `contracts/Pub.*.toml` ni `contracts/Published.toml` ni `contracts/deployments/`." por:
  "`git status --porcelain --untracked-files=all` sin entradas de la corrida; `git diff --exit-code -- contracts/Move.lock
  contracts/Published.toml` (desde #8, `Published.toml` y `deployments/testnet.json` están commiteados y no cambian; antes
  no existen); y, como los ignora `.gitignore`, cada uno por separado: `test ! -e contracts/deployments/localnet.json`
  y `! compgen -G 'contracts/Pub.*.toml'` (bash), los dos con estado 0."
  **m-1:** nunca con un único `ls` de las dos rutas. `ls` sale ≠ 0 si falta **cualquiera** de las dos, así que un
  `Pub.*.toml` sobrante pasaría por limpio.
- `:368-372`, "Orden de #8": reemplazarlo por el orden del runbook: pre-vuelo H13 → config y shell de publicación con
  `export SUI_CONFIG_DIR` y Node 26 → PV justo antes → dry run → publicación → archivos esperados → `update_fee_rate` a
  200 (D-20261103-01) → House → custodia de `HouseCap`/`UpgradeCap`/`Publisher` → smoke crear/cancelar → entrega →
  borrar los temporales con la CI verde. Detalle: `contracts/README.md` → "Uso en testnet".

**(e) `documents/STATUS.md`:** nota en la fila "#8 🚧" (runbook en README; M-7 aplicada). La fila de Toolchain "Gates" no
cambia.

### 4. Archivos

- **Tocar:** `contracts/README.md` (intro de "Despliegues", "Uso en testnet", "Versionado"), `agents.md` (`:153`,
  `:176-177`, §12), `documents/STATUS.md`.
- **NO tocar:** código, `DECISIONES.md` (lo edita el owner, P-2), "Recuperación" del README (vigente), el cuerpo del issue.

### 5. Tests / gates

Solo docs: `git diff --stat` con los 3 archivos; grep de la higiene (§"Higiene", con el patrón de este handoff) sobre el
diff; ninguna ruta personal. Sin gates de código.

### 6. Smoke

Lo valida TASK-4.

### 7. Criterios de aceptación

- El runbook cubre: `export` + Node 26, P-5 con el plan si la PV sube, dry run con criterio de éxito, publicación, archivos
  esperados, comisión 200 con su verificación, House, custodia de los tres objetos sin pegar la dirección, smoke
  crear/cancelar con `fee_rate` 200, entrega, cierre (P-6) y el modelo de confianza.
- Ningún comando del runbook llama a `sui client` sin `suio`; ninguno escribe en `~/.sui/`.
- La regla de cierre M-7 vale antes y después de publicar.

### 8. Al terminar

Reporte §5 (diff de docs). Commit sugerido: `docs: owner testnet runbook, UpgradeCap trust model and smoke close rule (#8)`.

---

## TASK-4: Ensayo en la localnet aislada con el lock repineado y el runbook nuevo — área: contracts (smoke)

### 1. Historia de usuario del task

**Como** owner, **quiero** que antes de mi publicación alguien corra en una red desechable el mismo camino del script y
los mismos comandos del runbook, **para** que el lock repineado, el resumen nuevo y cada filtro `jq` estén probados
contra la salida real de la CLI 1.83 y no los estrene yo en testnet.

### 2. Contexto

- Procedimiento: `agents.md` §3 "Localnet aislada (smokes)", pasos 1-7 y regla B4 (todo `sui client` con el prefijo del
  paso 3), con el cierre del paso 7 ya en la versión M-7 de TASK-3.
- Publicación efímera con el script: variante **A** del paso 4 (`--out "$SMOKE_DIR/localnet.json"`). En localnet el
  script usa `test-publish --build-env testnet`, no `publish`, así que no escribe `Published.toml`: los pasos 4-5 del
  runbook (publicación real y archivos esperados) solo se ensayan en su parte localnet.
- Modelo: `git show 6ff8353:documents/SMOKE_DEPLOY.md` (smoke del script de #7, variante A, pasos 3-6).
- Requiere TASK-1 a TASK-3 **commiteados** (el ensayo valida esos commits).

### 3. Qué implementar

Crear `documents/SMOKE_TESTNET_PUBLISH.md` (formato `AGENTE_MID.md` §M5) con la **Parte A** (§6) y la Parte B vacía
(§6 de TASK-5), y completar la Parte A **durante** la corrida. En los pasos 5-9 se usan los comandos y filtros del README
tal cual, con `suic` en lugar de `suio` y los IDs de `"$SMOKE_DIR/localnet.json"`. Si un filtro no coincide con la salida
real, el DEV corrige el README (filtro y valor esperado) en este task, repite el paso y lo declara en "Desviaciones del
handoff". Una cuenta, `ADMIN`, hace todo, como el owner.

### 4. Archivos

- **Crear:** `documents/SMOKE_TESTNET_PUBLISH.md`. **Tocar solo si un paso lo exige:** `contracts/README.md` ("Uso en
  testnet", declarado), `documents/STATUS.md` (fila de evidencia del ensayo).
- **NO tocar:** código, `Move.lock` (si cambia: `git checkout -- contracts/Move.lock`, STOP y declararlo: es exactamente
  lo que se prueba), `contracts/deployments/`, `~/.sui/`.

### 5. Gates

Al cierre: `git diff --exit-code -- contracts/Move.lock` = 0, árbol solo con el smoke (y el README si se corrigió), `stat`/`ls`
de `~/.sui/sui_config/` idénticos a la línea base.

### 6. Smoke — Parte A (ensayo en localnet aislada)

Prefijo `PRE` = `. <SMOKE_DIR>/env.sh && { . <SMOKE_DIR>/ids.env 2>/dev/null || true; } && smoke_guard &&` (paso 3 de §3).
`NODE` = Node v26.13.0 por ruta absoluta (en `env.sh`).

| # | Acción | Resultado esperado |
|---|---|---|
| A0 | Preparación (§3 paso 2): `<SMOKE_DIR>` nuevo, `env.sh`, línea base `stat`/`ls` de `<HOME real>/.sui/sui_config/`; `git log -1 --oneline` = head con TASK-1..3; `git diff --exit-code -- contracts/Move.lock` | línea base anotada; lock en `05ad86a3…` y sin delta |
| A1 | Paso 2 del runbook (curl GraphQL público, sin `sui`) | `protocolVersion` 140 (época anotada); si no, STOP (P-C) |
| A2 | Génesis + arranque en segundo plano + `PRE suic chain-identifier` (§3 paso 4) | red arriba; chain id ≠ `4c78adac`/`35834a8a` |
| A3 | `PRE suic addresses --json` → `ADMIN` a `ids.env` (§3 paso 5) | alias y direcciones; nunca `new-address` |
| A4 | `PRE act_as "$ADMIN" && cd <repo>/contracts && SUI_BIN="$SUI" "$NODE" scripts/publish.mjs publish --network localnet --pubfile-path "$SMOKE_DIR/Pub.localnet.toml" --out "$SMOKE_DIR/localnet.json" --dry-run; echo "exit=$?"` | `Dry run ok. Gas estimado: N MIST.`, `exit=0`; **sin** `Aviso: Move.lock cambió`; `git diff --exit-code -- contracts/Move.lock` = 0 |
| A5 | Lo mismo **sin** `--dry-run`, salida del script a `"$SMOKE_DIR/publish-run.txt"`; `D` = directorio `battleship-publish-*` impreso (dentro de `$SMOKE_DIR/tmp`), que **también va a `ids.env`** como `export D=<ruta absoluta literal>` (m-5: cada llamada es una shell nueva, y sin eso `$D` llega vacío a A6-A8); `PKG`/`HOUSE`/`CAP`/`UCAP` a `ids.env` con los `jq` del paso 4 del README sobre `"$SMOKE_DIR/localnet.json"`; antes de A6, `PRE test -d "$D" && test -f "$D/publish-output.json" && echo D-OK` | `exit=0`; json con 14 claves, `frameworkRev` = `05ad86a3…`, `suiCliVersion` `1.83.0-16d2dc1e05ed`; el resumen trae `printf 'n\n' \| SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client call … update_fee_rate … <bps>` y la verificación con el mismo prefijo en su propia línea, terminada en `# campo content.fee_rate`; `D-OK`; `grep -c "$ADMIN" "$SMOKE_DIR/publish-run.txt"` = 0; lock sin delta |
| A6 | Paso 6 del README con `suic` y `200` | `exit=0`, `success`; `FeeRateUpdated` 0 → 200 (anotar la forma exacta, p. ej. `200.0`) |
| A7 | Paso 7 del README con `suic` | `Shared`; `fee_rate` 200, `min_bet` `"1000000"`, `max_bet` `"50000000000"`, `version` `"1"`, `fees_collected` 0 (anotar la forma exacta de `fees_collected` y corregir el README si difiere) |
| A8 | Paso 8 del README con `suic` (`A="$(suic active-address)"`, `PUB` desde `"$D/publish-output.json"`) | tres líneas, `HouseCap`/`UpgradeCap`/`Publisher`, cada una `true`; la dirección no se pega |
| A9 | Paso 9 del README con `suic`; `GAME` a `ids.env` | `success`; `GameCreated` `bet` `"1000000"`, `fee_rate` 200, `opponent` `null` |
| A10 | Paso 10 del README con `suic` | `success`; `refund` `"1000000"`, `by_creator` `true`; `state` `Cancelled`, `stake` `"0"` |
| A11 | Guarda del prefijo, en una llamada **nueva sin** `env.sh`: `[ -z "${SUI_CONFIG_DIR+x}" ] && echo unset; printf 'n\n' \| SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" echo WOULD-RUN; echo "exit=$?"` (`echo` en lugar de `sui`: no se invoca la CLI) | `unset`; error `SUI_CONFIG_DIR: exporta tu SUI_CONFIG_DIR`; **sin** `WOULD-RUN`; `exit` ≠ 0 |
| A12 | Cierre (§3 paso 7 en la versión M-7): `kill` del PID, `kill -0` falla, `rm -rf <SMOKE_DIR>`; sin `env.sh`: `stat`/`ls`; `git status --porcelain --untracked-files=all`; `git diff --exit-code -- contracts/Move.lock contracts/Published.toml`; por separado (m-1): `test ! -e contracts/deployments/localnet.json; echo "loc=$?"` y `! compgen -G 'contracts/Pub.*.toml'; echo "pub=$?"` | `stat`/`ls` idénticos a A0; árbol solo con el smoke (y el README si se corrigió); diff `exit=0`; `loc=0` y `pub=0` |

Reporte final de la Parte A: PASA/TOTAL, hallazgos con número de paso, veredicto. Un paso fallido ⇒ NO PASA y no se
abre G1.

### 7. Criterios de aceptación

Parte A 13/13 PASA; cada comando del runbook ejecutado al menos una vez contra la salida real; correcciones al README
declaradas; cierre limpio.

### 8. Al terminar

Reporte §5 con la Parte A completa. Commit sugerido: `docs: rehearse the testnet runbook on an isolated localnet (#8)`.

---

## TASK-5 (después de G3): Verificación post-publicación — área: contracts + app (solo lecturas)

> **Condicionado a la entrega del owner** (runbook paso 11) y al commit del orquestador de `contracts/deployments/testnet.json`
> + `contracts/Published.toml`, **tal cual los generó el script y la CLI**, en un commit propio:
> `contracts: record the testnet deployment (#8)`. Ningún agente edita esos dos archivos.

### 1. Historia de usuario del task

**Como** owner, **quiero** que un tercero confirme, con lecturas públicas y sin claves, que lo que publiqué es lo que
dice el repo (House compartida, comisión 200, límites, caps en mi cuenta, smoke correcto), y que el repo y la app siguen
en verde con los archivos publicados, **para** cerrar #8 con evidencia y sin haber pegado mi dirección en ningún lado.

### 2. Contexto

- Lectura pública por gRPC con `SuiGrpcClient` (`@mysten/sui` 2.37.0, ya instalado por `npm ci` en el workspace) contra
  `https://fullnode.testnet.sui.io:443` (`app/src/sui/networks.ts:12`). Modelo de las llamadas:
  `app/scripts/capture-tx-fixtures.mjs:23,66,94-96,125,137,196` (`getObject` con `include: { json: true }`,
  `getTransaction` con `effects`/`events`/`objectTypes`). Sin `sui client`, sin firmar nada.
- La "cuenta del owner" se identifica **sin conocer la dirección**: es el `sender` de la transacción de publicación
  (`publishTxDigest`). Se guarda en memoria como `S` y solo se imprimen comparaciones (`true`/`false`).

### 3. Qué implementar

1. **Archivos** (`contracts/`): `git show --stat HEAD` (solo los dos archivos); `node scripts/publish.mjs check` →
   `1 despliegue(s) válidos y coherentes con Published.toml`; `jq` de `deployments/testnet.json`: 14 claves, `network`
   `testnet`, `chainId` `4c78adac`, `packageId` = `originalPackageId`, `packageVersion` 1, `suiCliVersion`
   `1.83.0-16d2dc1e05ed`, `frameworkRev` `05ad86a3…`; `git merge-base --is-ancestor <sourceCommit> HEAD` → 0, y CI verde
   en ese commit (`gh api repos/sdelvalle57/sui_battleship/commits/<sourceCommit>/check-runs`).
2. **Sonda gRPC.** El script vive en `<scratchpad>/verify-testnet.mjs` y no se commitea.
   - **Cómo se corre (m-4):** por stdin, con cwd en `<repo>/app`:
     `cd <repo>/app && "$NODE" --input-type=module < <scratchpad>/verify-testnet.mjs`. En ESM, el `import` de un
     **archivo** se resuelve desde donde vive el archivo, así que en `<scratchpad>` no encontraría `@mysten/sui`
     (`ERR_MODULE_NOT_FOUND`); con stdin o `--eval`, la resolución parte del cwd. Alternativa válida: importar con la URL
     absoluta del paquete en `<repo>/node_modules`. **Nunca** un archivo sin trackear en `app/scripts/`, que ensuciaría el
     árbol y la CI. Antes de B2, un `import('@mysten/sui/grpc')` de prueba por la misma vía tiene que dar `ok`.
   - **Qué imprime (s-5):** solo booleanos, IDs, digests, checkpoints y montos. `S` (la dirección del owner) vive en una
     variable y solo aparece en comparaciones (`=== S`). Nunca se imprime un objeto, una transacción ni una respuesta
     entera (`console.log(obj)`, `JSON.stringify(tx)`). Todo el cuerpo va en un `try/catch` que muestra solo
     `error.message`, sin `error.cause` ni la respuesta, y el DEV revisa que ese mensaje no traiga hex de 64 antes de
     pegarlo.
   - Checks: los de la Parte B (§6).
3. **Gates con los archivos publicados:** los de contracts de TASK-1 §5 (0 / 0 / 83, `node --test` N de TASK-2,
   `check` = 1 despliegue, `git diff --exit-code -- Move.lock`) y los del job `app` (`agents.md` §3: `npm ci`, audit, lint,
   typecheck, test, `VITE_SUI_NETWORK=testnet npm run build -w app`), con árbol limpio al final. Si `sui move build/test`
   cambia de comportamiento porque `Published.toml` ya trae `[published.testnet]` (warning nuevo, conteo distinto):
   STOP con el output.
4. **🌐 App de testnet, solo lectura** (cierra la rama "con `testnet.json`" del paso 15 del smoke de #9): build de testnet
   + `npm run preview -w app` en `127.0.0.1` + Chrome headless con perfil desechable (reglas de navegador de `agents.md`
   §3 paso 6; sin wallet). Sin `contracts/deployments/localnet.json` en la máquina (README de la app, "Origen del build").
5. **Localnet aislada, variante B, con los archivos publicados** (lo que van a vivir los smokes de #12): publicación
   efímera sin `--out`, `check` con los dos json y cierre con la regla M-7. Si `test-publish --build-env testnet` falla o
   toca `Published.toml` porque ya existe `[published.testnet]`: STOP. No revierte la publicación, pero bloquea los
   smokes de #12 y hay que decidirlo antes.

### 4. Archivos

- **Tocar:** `documents/SMOKE_TESTNET_PUBLISH.md` (Parte B), `documents/STATUS.md` (filas de baseline/evidencia).
- **NO tocar:** `contracts/deployments/testnet.json`, `contracts/Published.toml`, código.

### 5. Gates

Los del punto 3, con output pegado; `git status --porcelain --untracked-files=all` vacío salvo el smoke y STATUS.

### 6. Smoke — Parte B (testnet: entrega del owner + verificación pública)

| # | Acción | Resultado esperado |
|---|---|---|
| B0 | Entrega del owner (runbook paso 11) | 2 archivos sin editar; 4 digests; custodia "sí" ×3; PV 140 + época del paso 2 |
| B1 | Punto 1 de §3 (archivos, `check`, `sourceCommit`, CI) | todo como en §3.1 |
| B2 | gRPC: chain id del servicio | `4c78adac` |
| B3 | gRPC: `getTransaction(publishTxDigest)` | `success`; objetos creados: el paquete `packageId`, la House `houseId` (compartida), `houseCapId`, `upgradeCapId` y un `0x2::package::Publisher`; `S` = sender (no se imprime) |
| B4 | gRPC: `getObject(houseId)` con `json` | dueño `Shared`; `fee_rate` 200, `min_bet` 1000000, `max_bet` 50000000000, `version` 1, `fees_collected` 0 (o el acumulado si ya hubo partidas aceptadas: anotarlo) |
| B5 | gRPC: dueño de `houseCapId`, `upgradeCapId` y del `Publisher` | `AddressOwner == S` → `true` ×3 (la dirección no se imprime) |
| B6 | gRPC: `getTransaction(<digest comisión>)` | `success`; sender `== S`; `FeeRateUpdated` `old_fee_rate` 0 → `new_fee_rate` 200; checkpoint > el de la publicación y < el de la creación |
| B7 | gRPC: `getTransaction(<digest crear>)` + todos los `GameCreated` del paquete (`ListEvents` por tipo `<originalPackageId>::game::GameCreated`) | `success`; sender `== S`; `bet` 1000000, `fee_rate` 200, `opponent` none; todos los `GameCreated` con creador `== S` tienen `fee_rate` 200 (ninguna partida del owner nació con comisión 0). **s-4:** una partida de otro creador con `fee_rate` ≠ 200 (creada por un tercero antes de la comisión) se anota en la tabla con su `game_id` y su `fee_rate` (es inocua en testnet, D-20261030-11) y **no** hace NO PASA; solo se imprime `creador == S` → `false`, no su creador |
| B8 | gRPC: `getTransaction(<digest cancelar>)` + `getObject(GAME)` | `success`; `GameCancelled` `refund` 1000000 y `cancelled_by == creator == S`; `Game` en `Cancelled` con `stake` 0; `balanceChanges` de `S`: crear = −(1000000 + gas neto), cancelar = +1000000 − gas neto |
| B9 | Gates de §3.3 | verdes, conteos anotados |
| B10 | 🌐 §3.4: `#/`, `#/game/<GAME>` | indicador "testnet · nodo OK"; lobby con el texto honesto de "sin partidas abiertas" (salvo que alguien haya creado una); detalle de `GAME` "Cancelada" con comisión 2 %; sin wallet de desarrollo; consola sin errores |
| B11 | §3.5: localnet aislada, variante B (`agents.md` §3 paso 4 (B)), `"$NODE" scripts/publish.mjs check` con la red arriba, cierre M-7 | publicación `exit=0`; `check` = `2 despliegue(s) válidos y coherentes con Published.toml`; `Published.toml` y `testnet.json` sin cambios; lock sin delta; cierre limpio (`localnet.json` borrado, `deployments/` sigue con `testnet.json`) |

### 7. Criterios de aceptación

Parte B 12/12 PASA (criterios 3, 4 y 5 de #8 con evidencia); ningún archivo publicado editado; ninguna dirección en el
smoke, el reporte ni STATUS.

### 8. Al terminar

Reporte §5 con la Parte B y la salida de la sonda (solo booleanos y valores públicos). Commit sugerido:
`docs: verify the testnet deployment with public reads (#8)`.

---

## TASK-6 (después de TASK-5): Docs post-publicación — área: docs

### 1. Historia de usuario del task

**Como** cualquier agente o colaborador que llegue después, **quiero** encontrar en los docs de siempre que el paquete
está publicado en testnet, con qué IDs, con qué comisión y cómo se republica, **para** no reabrir #8 ni buscar los IDs en
el historial.

### 2. Contexto

Criterio 6 de #8: STATUS (fila de despliegue), `agents.md` §5/§12 y `contracts/README.md` → "Despliegues". Los IDs salen
de `deployments/testnet.json` (fuente: `Published.toml`; si un doc discrepa del json, manda el json).

### 3. Qué implementar

- **`documents/STATUS.md`:** sección nueva **"Despliegues"** (tras "Toolchain"): `| Red | Fecha | packageId | Digest de
  publicación | sourceCommit | CLI / framework | Comisión | Smoke |` con la fila de testnet (`200 bps` + digest de la
  comisión; digests de crear/cancelar). H13 cerrado ("publicado con PV 140"). "Pendientes del usuario": el ítem
  "Post-publicación (#8)" pasa a ✅ con fecha y 200 bps. Fila de #9: rama "con `testnet.json`" del paso 15 ✅ (B10).
  "Siguiente": #12 y #14 (desbloqueado por #8). "Ciclo activo": #8 sigue 🚧 hasta el merge (el housekeeping lo cierra).
- **`agents.md`:** §2, `contracts/deployments/` y `contracts/Published.toml` "existen desde #8" (también en los
  comentarios del árbol); §5, en la fila "Package ID / object IDs por red", "testnet: `deployments/testnet.json` (#8)";
  §12, "Orden de #8" pasa a "**Testnet: publicado el `<fecha>` (#8)**, `packageId` `<…>`; runbook: `contracts/README.md` →
  'Uso en testnet'; republicar solo bajo D-20261103-01 (2)" y "Post-publicación (#8)" ✅ con 200 bps.
- **`contracts/README.md`:** tabla inicial (fila `deployments/<red>.json`, `Published.toml`: "testnet desde #8");
  "Fee por defecto 0": "En testnet, 200 bps desde la publicación (D-20261103-01, tx `<digest>`)"; "Despliegues": párrafo
  "Testnet" con `packageId`, fecha y "IDs completos en `deployments/testnet.json`"; "Uso en testnet": una línea al inicio,
  "Publicado el `<fecha>` (#8). Una republicación sigue este runbook bajo D-20261103-01 (2), con la operación previa que
  registra esa decisión".
- **`app/README.md` → "Testnet":** "`contracts/deployments/testnet.json` existe desde #8: un build con
  `VITE_SUI_NETWORK=testnet` lee la House y las partidas reales del fullnode público" (en lugar de "lo publica #8…
  muestra la pantalla de error").

### 4. Archivos

- **Tocar:** `documents/STATUS.md`, `agents.md`, `contracts/README.md`, `app/README.md`.
- **NO tocar:** los archivos publicados, código, `DECISIONES.md`.

### 5. Gates

Solo docs (`git diff --stat`, grep de higiene sobre el diff). La CI del PR corre completa.

### 6. Smoke

No aplica (docs).

### 7. Criterios de aceptación

Criterio 6 de #8 cumplido; IDs idénticos a `testnet.json`; sin direcciones de cuenta.

### 8. Al terminar

Reporte §5. Commit sugerido: `docs: record the testnet deployment in STATUS, agents.md and READMEs (#8)`. Después: body
del PR (lo propone el MID) y revisión de integración del MAYOR.

---

## Texto propuesto para D-20261103-01 (P-2; lo aplica el owner, el MID no edita `DECISIONES.md`)

**Para agregar al final de la decisión (2), S-4 del pre-vuelo:**

> **Operación de una republicación (S-4 de la revisión de pre-vuelo de #8):** antes de republicar, el owner (a) retira
> las comisiones de la House vieja con `withdraw_fees` (`contracts/README.md` → "Retiro de comisiones"); (b) cancela sus
> partidas `Pending` del paquete viejo y avisa a los demás creadores que cancelen las suyas por CLI contra el paquete
> viejo (`cancel_game`, y `reject_game` si los invitaron), porque esas funciones de la v1 siguen invocables para siempre
> pero la app nueva no lista las partidas del paquete viejo; (c) conserva el `HouseCap` y el `UpgradeCap` viejos (lo que
> entre después a la House vieja solo sale con ese cap). Una republicación es una publicación nueva: lleva su
> autorización explícita, su pre-vuelo (H13) y el runbook de `contracts/README.md` → "Uso en testnet". Como el script y
> la CLI rechazan publicar si ya existen `deployments/testnet.json` o `[published.testnet]`, el PR de la republicación
> define cómo retirarlos; los IDs viejos quedan en el historial de git y en `STATUS.md` → "Despliegues".

**Línea de autorización (criterio 2 de #8; solo si el owner la da, con sus palabras y su fecha):**

> **Autorización de la publicación (#8, criterio 2):** el owner autoriza la primera publicación del paquete en testnet,
> desde el head del PR de #8 con la CI en verde y siguiendo `contracts/README.md` → "Uso en testnet" ("<cita del
> owner>", `<fecha>`).

---

## Comentario para #8 (lo publica el orquestador en G1)

Se publica en G1, cuando TASK-3 y TASK-4 están commiteados y pusheados y el `<head>` tiene la CI en verde. Antes de
publicarlo, reemplazar las **dos** apariciones de `<head>`: el SHA completo de 40 caracteres en el permalink y el corto en
el texto. El enlace es un permalink al commit (s-3): sigue funcionando cuando se borre la branch, porque el merge commit
conserva el commit en `master`. Si G1 se repite con un head nuevo (m-6), se edita el comentario. Sin menciones con arroba.

~~~markdown
**Pasos del owner actualizados: reemplazan los pasos 2, 3, 4 y 6 del cuerpo del issue**

Esos pasos se escribieron antes de #7/#39 y de D-20261103-01. Seguidos al pie de la letra, los pasos 2 y 3 operan sobre
`~/.sui/`, el 4 corre los gates de otra forma que la CI y el 6 deja la comisión como condicional. Quedan **reemplazados**
por el runbook de `contracts/README.md` → [Uso en testnet (solo el owner)](https://github.com/sdelvalle57/sui_battleship/blob/<head>/contracts/README.md#uso-en-testnet-solo-el-owner),
ya ensayado en una localnet aislada (`documents/SMOKE_TESTNET_PUBLISH.md`, Parte A). Se publica desde el head `<head>`
del PR #48, con la CI en verde. Hasta que el orquestador commitee lo que entregue el owner, nadie pushea a la branch: si
hiciera falta, habría un head nuevo con su CI y este comentario se corrige. Los pasos 1, 5 y 7 siguen vigentes, con las precisiones de abajo.

Resumen (los comandos exactos están en el README):

0. **Una vez:** config propia en un `SUI_CONFIG_DIR` absoluto fuera de `~/.sui/`, env `testnet` activo, dirección activa =
   la de la wallet del navegador. Nunca `sui client …` ni `sui keytool …` sin ese `export`: `~/.sui/` queda sin claves para
   siempre.
1. **Shell de publicación:** branch del PR, árbol limpio, `HEAD` = `<head>`; `nvm use` (Node 26: con otro el script sale
   con 1); `export SUI_CONFIG_DIR=<su dir>`; CLI `sui 1.83.0-16d2dc1e05ed`; env activo `testnet`; saldo.
2. **PV de testnet = 140** (lectura pública por GraphQL) justo antes de publicar. Si es 141 o más: no publicar y avisar
   (hay que subir la CLI y repinear antes).
3. **Dry run:** `node scripts/publish.mjs publish --network testnet --dry-run` → `Dry run ok. Gas estimado: N MIST.` y
   `exit=0`.
4. **Publicación:** lo mismo sin `--dry-run`, escribiendo `testnet` cuando lo pida.
5. **Archivos:** `git status --porcelain` = exactamente `?? contracts/Published.toml` y `?? contracts/deployments/`;
   `check` = 1 despliegue.
6. **Comisión 200 bps** (D-20261103-01) con `update_fee_rate`, antes de cualquier partida; evento `FeeRateUpdated` 0 → 200.
7. **House:** compartida, comisión 200, límites 0,001–50 SUI, versión 1, comisiones acumuladas 0.
8. **Custodia sin pegar la dirección:** `HouseCap`, `UpgradeCap` **y `Publisher`** en la dirección activa (sí/no por objeto).
9. **Smoke:** crear con `min_bet` (`GameCreated` con `fee_rate` 200) y cancelar (reembolso del 100 %).
10. **Entrega al orquestador:** `contracts/deployments/testnet.json` y `contracts/Published.toml` sin editar, los cuatro
    digests (publicación, comisión, crear, cancelar), el sí/no de la custodia y la PV medida. Nada más: la salida de la CLI
    trae la dirección.
11. **Cierre:** sin rebase ni squash de la branch después de publicar (merge commit); recién con la CI del PR en verde,
    borrar los directorios `battleship-publish-*`.

Precisiones a los criterios de aceptación:
- "El `HouseCap` y el `UpgradeCap` están en la dirección del owner": incluye también el `Publisher`, que crea `init`.
- "Los archivos de publicación que genere la CLI": son `contracts/Published.toml` (lo escribe `sui client publish`) y
  `contracts/deployments/testnet.json` (lo escribe el script). Ninguno se edita a mano.
- La verificación pública (House, comisión, límites, custodia y smoke por digest) la repite un agente con lecturas gRPC sin
  claves (TASK-5 de `documents/HANDOFF_TESTNET_PUBLISH.md`).

Ningún agente corre el camino testnet del script (D-20261102-03). Revisión de pre-vuelo: el comentario anterior (APTO CON
PRE-REQUISITOS).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
~~~

---

## STOPs

Ninguno abierto en este handoff. Puntos que **son** STOP si aparecen durante la ejecución:

- TASK-1 / G2: PV de testnet ≠ 140 → P-C (addendum v1.2: subir la CLI, `ci.yml`, `publish.test.mjs:480-481`, recaptura
  de `scripts/fixtures/`, repin, y TASK-4 de nuevo).
- TASK-1: delta del lock distinto del esperado.
- TASK-4: `Move.lock` cambia en el dry run o en la publicación efímera.
- Runbook paso 5 (owner): cualquier cambio además de los dos archivos esperados.
- TASK-5: los gates cambian con `Published.toml` presente, o `test-publish` falla con `[published.testnet]` (bloquea #12).

## Higiene de este documento

- Sin rutas personales (`<repo>`, `<HOME real>`, `<SMOKE_DIR>`, `<scratchpad>`, `<su dir>`), sin direcciones de cuenta,
  sin claves.
- Hex de 40-64 caracteres presentes, todos públicos y declarados: `05ad86a3e86c522deea116f80dc2bf2309a53363` (git rev del
  framework de Sui de la PV 140) y `719fb2960ccfbf9f4d33041f8ea5146d30671696` (git rev del framework de la PV 139). Resto:
  SHAs cortos de este repo, commit corto de la release de la CLI (`16d2dc1e05ed`), chain ids públicos de 8 hex
  (`4c78adac` testnet, `35834a8a` mainnet) e IDs de runs de Actions.
