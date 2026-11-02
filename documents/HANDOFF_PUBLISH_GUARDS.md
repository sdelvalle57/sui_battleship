# HANDOFF_PUBLISH_GUARDS
> Plan + handoff consolidado (issue chico, seguimiento de #7) | Issue: #39 (MINOR-2 y NIT-2 de la revisión de
> integración del MAYOR sobre el PR #38) | Prerrequisito de #8 | Branch: `feature/issue-39-publish-guards` (desde
> `master` @ `dfb11ce`) | Versión: v1 | Fecha: 2026-11-02
> Un solo task. Sin commits ni pushes (los hace el orquestador tras la revisión MID). Reporte con la plantilla de
> `documents/FLUJO_AGENTES.md` §5.

## Historia de usuario

**Como** owner que va a publicar el paquete en testnet (#8) desde su terminal, **quiero** que
`contracts/scripts/publish.mjs` rechace en el acto un `--out` en testnet y que la guarda de `SUI_CONFIG_DIR` nunca
muestre la ruta de mi config, ni siquiera cuando falla el sistema de archivos, **para** no enterarme recién en la CI
de que el json canónico quedó sin escribir, y poder pegar cualquier error del script en un issue sin revelar dónde
vive mi clave.

**Scope en una frase:** dos guardas más estrictas en el script de publicación (`--out` prohibido con
`--network testnet`; excepciones de `fs` de la guarda de config convertidas en un error sin ruta), con sus tests y la
documentación de "Despliegues".

**Lo que NO entrega:**
- Ninguna publicación ni dry run en testnet (#8, solo el owner, D-20261102-03).
- Cambios en `deployment.mjs`, el esquema del json, `check`, la CI, los fixtures, el paquete Move o la app.
- Cambios en lo que el script muestra del stderr de la CLI (ya oculta direcciones; puede traer rutas de la config
  propia en la terminal del owner, y el README ya pide no pegar la salida cruda). Si se quiere endurecer, issue nuevo.
- `--out` en localnet sigue igual (lo usa el smoke de `agents.md` §3, receta A).

## 0. Baseline de gates verificado (2026-11-02, `master` @ `dfb11ce`)

| Ítem | Valor | Fuente |
|---|---|---|
| Sui CLI | `sui 1.83.0-16d2dc1e05ed` (release `testnet`) | `documents/STATUS.md` Toolchain |
| Node | `v26.13.0` (`.nvmrc` = 26) | STATUS Toolchain |
| `sui move build -e testnet --warnings-are-errors` | 🟢 exit 0, **0 warnings** | STATUS Baselines (medido en `1630eaa`); `git log 8fddbda..dfb11ce -- contracts/sources contracts/tests contracts/Move.toml contracts/Move.lock` vacío |
| `sui move build -e testnet --lint --warnings-are-errors` | 🟢 exit 0, **0 lints** | idem |
| `sui move test -e testnet --warnings-are-errors` | 🟢 exit 0, **83 tests PASS** (26 + 57), `Move.lock` sin delta | idem |
| `node --test scripts/*.test.mjs` | 🟢 exit 0, **94 tests PASS** (51 `deployment.test.mjs` + 43 `publish.test.mjs`) | STATUS Baselines (#7); `git diff --stat 6ff8353 dfb11ce -- contracts/scripts` vacío |
| `node scripts/publish.mjs check` | 🟢 exit 0, **0 despliegues** | idem |
| CI en `master` | 🟢 run `41486789729` @ `dfb11ce` (`success`) | `gh run list --branch master` |
| `~/.sui/sui_config/` | `stat -c '%y %s'` de `client.yaml` = `2026-10-30 17:52:52.515735237 -0500 244`; `ls` = `client.yaml` | `stat`/`ls` del MID (sin leer el contenido) |

## Decisiones del owner (no reabrir)

| ID | Decisión |
|---|---|
| D-A | D-20261102-03: ningún agente corre `publish --network testnet`, ni con `--dry-run`. El camino testnet se prueba solo con funciones puras y con `main` cortado en la guarda 1 |
| D-B | D-20261102-01 §3: `deployments/testnet.json` es el json que `check` cruza con `[published.testnet]`; se escribe solo con el script |
| D-C | D-20261030-02: el MID no corre gates; los corre el DEV y pega el output |

### Decisión pendiente del usuario (STOP de alcance)

| ID | Pregunta | Recomendación |
|---|---|---|
| D1 | El issue pide rechazar `--out` en `publish --network testnet`. `record --network testnet --out <otra ruta>` tiene el mismo defecto: el json canónico no se escribe y `check` falla recién en la CI. ¿Se extiende la guarda a `record`? | **Sí.** `record` es la vía de recuperación de #8 y el owner la correría bajo presión. Cuesta 1 llamada y 1 caso de test; ninguna receta documentada usa `record … --out` en testnet |

> Decisión (2026-11-02): D1 = **sí** — resuelta por el orquestador, sin STOP: el título de #39 es "rechazar --out en testnet" (no solo en `publish`) y `record` es la vía de recuperación de #8; es el sentido restrictivo y no cambia ninguna receta documentada.

> Si D1 = **no**, el DEV omite todo lo marcado **[D1]**: no crea `checkOutArg` y pone la comprobación en línea dentro de
> `checkPublishArgs` (un solo uso, ARQ-7), y el test de `main` queda solo con el caso `publish`. El conteo de tests no
> cambia (46 en `publish.test.mjs`).

Decisiones internas del MID (detalle de implementación, sin STOP):

> Decisión (2026-11-02): en testnet se rechaza la **presencia** de `--out` (también vacío o igual a la ruta por defecto)
> en vez de comparar rutas, porque comparar exige resolver symlinks y no aporta nada: sin `--out` el script ya escribe la
> ruta canónica.

> Decisión (2026-11-02): las excepciones de `fs` se capturan **dentro** de `checkConfigDirGuard` (no en el cableado de
> `commandPublish`), porque es la función que promete mensajes sin ruta y se testea con sondas inyectadas. Se informa
> solo el `code` del error (`EACCES`, `ELOOP`…), sin el mensaje original y sin `cause` (un `cause` lo mostraría
> cualquier `console.error(err)` futuro). Falla cerrada: si no se puede inspeccionar `~/.sui` de un home, no se puede
> demostrar que la config esté fuera, así que se aborta.

> Decisión (2026-11-02): **smoke: no aplica.** Las dos correcciones ocurren antes de cualquier I/O de red (guarda 1) o
> dentro de una función pura con `fs` inyectado (guarda 2); el cableado de `main` se cubre con un test que corta antes
> de la config y de la CLI. El camino localnet no cambia salvo por la llamada a la guarda, cubierta por el test de
> `checkPublishArgs` en localnet. Una localnet aislada no probaría nada que los tests no prueben.

## Reglas transversales

- **Nunca** `node scripts/publish.mjs publish --network testnet` (con o sin `--dry-run`) desde una shell; el camino
  testnet solo se ejerce dentro de `node --test`, cortado en la guarda 1 (D-A).
- **Ninguna** llamada `sui client …` (no hace falta ninguna en este task). Solo los gates `sui move …` con su forma
  canónica (`agents.md` §3).
- La shell de los gates **no** exporta `SUI_CONFIG_DIR` (el test nuevo de `main` además lo borra mientras corre).
- Sobre `~/.sui/`: solo `stat`/`ls`, al empezar y al terminar (deben coincidir con §0).
- Sin rutas personales en lo que se escriba o se pegue: `<repo>`, `<HOME real>`.
- **No tocar:** `contracts/scripts/deployment.mjs`, `contracts/scripts/deployment.test.mjs`, `contracts/scripts/fixtures/`,
  `contracts/sources/`, `contracts/tests/`, `contracts/Move.toml`, `contracts/Move.lock`, `.github/`, `app/`,
  `agents.md`, `documents/DECISIONES.md`, `documents/ESTANDARES.md`.

---

## TASK-1: guardas de `--out` en testnet y de excepciones de `fs` — área: contracts (tooling) + docs

### 1. Historia de usuario del task

**Como** owner, **quiero** que `publish` (y `record`, [D1]) con `--network testnet --out …` termine con exit 1 antes de
leer la config o invocar la CLI, y que un `EACCES`/`ELOOP` de la guarda de config salga como
`SUI_CONFIG_DIR inválido: …` con solo el código del error, **para** que el error aparezca en mi terminal y no en la CI,
y nunca con la ruta de mi config.

### 2. Contexto (código real, `dfb11ce`)

- `contracts/scripts/publish.mjs:187-193` `checkPublishArgs({ network, pubfilePath })`: guarda 1 (red válida;
  `--pubfile-path` obligatorio en localnet y prohibido en testnet con `'--pubfile-path no se admite en testnet'`). Es el
  modelo a replicar para `--out`.
- `publish.mjs:557-559` `commandPublish`: llama a `checkPublishArgs` antes que nada y resuelve
  `outPath = path.resolve(values.out ?? defaultOut(network))`. La guarda 5 (`checkTestnetPreconditions`, `:590-596`)
  solo mira `defaultOut('testnet')`: con `--out /otra/ruta` el json canónico no se escribe (MINOR-2).
- `publish.mjs:665-696` `commandRecord`: acepta `--out` en cualquier red (`:693`).
- `publish.mjs:195-223` `checkConfigDirGuard`: el JSDoc promete "Los mensajes no incluyen la ruta", pero llama sin
  protección a `exists`, `isDir`, `hasClientYaml` y `realpath`, también sobre los homes (`:213-221`). El cableado real
  (`:561-569`) pasa `isDir: (p) => fs.statSync(p).isDirectory()` y `realpath: fs.realpathSync`, que lanzan errores con la
  ruta en el mensaje (`EACCES: permission denied, stat '<ruta>'`); `main` (`:724-726`) imprime `error.message` (NIT-2).
- Tests: `contracts/scripts/publish.test.mjs` — `checkPublishArgs` en `:245-252`, `fakeFs`/`FS`/`HOME` en `:254-275`,
  `checkConfigDirGuard` en `:277-305`, `mainCapturingStderr` en `:213-226`, test de `main` en `:228-241`, patrón de
  guardar/restaurar `process.env` en `:391-405`. Ningún test invoca `sui` ni git ni escribe archivos (`:1-2`).

### 3. Qué implementar

#### 3.1 `--out` prohibido en testnet (MINOR-2)

En `contracts/scripts/publish.mjs`:

1. Comentario de uso (`:3` y, [D1], `:6`): `[--out <ruta>]` → `[--out <ruta>, solo localnet]`.
2. **[D1]** Nueva función exportada, justo antes de `checkPublishArgs`:

   ```js
   /**
    * Guarda de `--out` (#39): en testnet el json va siempre a `deployments/testnet.json`, el que `check` cruza con
    * `[published.testnet]`; con otra ruta el json canónico no se escribiría y la CI fallaría recién en `check`. Se
    * rechaza la presencia de la opción (también vacía). En localnet se admite (smokes, agents.md §3).
    * @param {{ network: unknown, out: unknown }} args
    */
   export function checkOutArg({ network, out }) {
     if (network === 'testnet' && out !== undefined) {
       throw new Error('--out no se admite en testnet (el json va siempre a deployments/testnet.json)');
     }
   }
   ```

3. `checkPublishArgs({ network, pubfilePath, out })`: JSDoc "Guarda 1: … y `--out` prohibido en testnet (#39)"; tipo
   `{ network: unknown, pubfilePath: unknown, out: unknown }`; como **última** línea, `checkOutArg({ network, out });`
   (sin D1: la misma condición y el mismo mensaje en línea). El orden de las comprobaciones existentes no cambia.
4. `commandPublish` (`:557`): `checkPublishArgs({ network, pubfilePath: values['pubfile-path'], out: values.out });`
5. **[D1]** `commandRecord` (`:665`): primera sentencia, antes de la de `--from`:
   `checkOutArg({ network: values.network, out: values.out });`

#### 3.2 Excepciones de `fs` sin ruta en `checkConfigDirGuard` (NIT-2)

Reemplazar el cuerpo de `checkConfigDirGuard` (`:204-223`) manteniendo firma, mensajes existentes, orden de las
comprobaciones y valor de retorno:

```js
const FS_ERROR_CODE_RE = /^E[A-Z0-9_]+$/;

export function checkConfigDirGuard({ value, isAbsolute, exists, isDir, hasClientYaml, realpath, homes }) {
  const invalid = (reason) => new Error(`SUI_CONFIG_DIR inválido: ${reason}`);
  // Una excepción de fs trae la ruta en su mensaje (`EACCES: permission denied, stat '<ruta>'`): se descarta el
  // mensaje, sin `cause`, y solo se informa el código. Falla cerrada (#39, NIT-2).
  const guarded = (probe) => (p) => {
    try {
      return probe(p);
    } catch (error) {
      const code = typeof error?.code === 'string' && FS_ERROR_CODE_RE.test(error.code) ? error.code : 'error de fs';
      throw invalid(`no se pudo inspeccionar una ruta (${code}); revisa permisos y symlinks de la config y de ~/.sui`);
    }
  };
  const safeExists = guarded(exists);
  const safeIsDir = guarded(isDir);
  const safeHasClientYaml = guarded(hasClientYaml);
  const safeRealpath = guarded(realpath);
  // … el cuerpo actual (`:206-222`) sin cambios, con `safe*` en lugar de las sondas originales (también en el bucle
  // de homes).
}
```

- `FS_ERROR_CODE_RE` va con las demás constantes del módulo (fuera de la función) si el DEV lo prefiere; no se exporta.
- JSDoc: "Los mensajes no incluyen la ruta, tampoco ante una excepción de `fs` (solo su código, #39)".
- `isAbsolute` queda sin envolver (es `path.isAbsolute`, no toca el disco). El cableado de `commandPublish`
  (`:561-569`) **no cambia**.

### 4. Archivos a tocar / NO tocar

| Archivo | Cambio |
|---|---|
| `contracts/scripts/publish.mjs` | §3.1 y §3.2. Sin I/O nueva (ningún `fs.*`, `spawn` ni `runSui`/`runGit` añadido) |
| `contracts/scripts/publish.test.mjs` | 3 tests nuevos (§5) y `checkOutArg` en el import [D1] |
| `contracts/README.md` | "Despliegues" (§7, C9) |
| `documents/STATUS.md` | Baseline de `contracts/scripts` (§7, C10) |

NO tocar: lo listado en "Reglas transversales".

### 5. Tests obligatorios (en `contracts/scripts/publish.test.mjs`)

**Fase roja primero** (PROY-9): escribir los tres tests, correr `node --test scripts/publish.test.mjs` **antes** del
cambio en `publish.mjs` y pegar en el reporte solo los nombres de los tests que fallan (los tres nuevos). Es seguro: el
test de `main` borra `SUI_CONFIG_DIR` y apunta `SUI_BIN` a un binario inexistente, así que sin la guarda nueva `main`
corta en la guarda de config (`no está definido`) y nunca llega a la CLI.

1. **`checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet`**, junto al
   test de `checkPublishArgs` (`:245`):
   - `checkPublishArgs({ network: 'testnet', out: '/tmp/battleship-test/testnet.json' })` y con `out: ''` ⇒ lanza
     `/--out no se admite en testnet/`.
   - `checkPublishArgs({ network: 'testnet', pubfilePath: 'P', out: 'x' })` ⇒ sigue lanzando
     `/--pubfile-path no se admite en testnet/` (el orden de las guardas no cambia).
   - `checkPublishArgs({ network: 'localnet', pubfilePath: 'P', out: '/tmp/battleship-test/localnet.json' })` y
     `checkPublishArgs({ network: 'testnet', out: undefined })` ⇒ no lanzan.
   - [D1] `checkOutArg`: `testnet` + `'x'` lanza; `localnet` + `'x'`, `testnet` + `undefined` no lanzan.
2. **`main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI`**, junto al test de `main`
   (`:228`): guardar `process.env.SUI_CONFIG_DIR` y `process.env.SUI_BIN`; en el `try`, `delete` del primero y
   `SUI_BIN = '/nonexistent/sui-bin-de-test'`; en el `finally`, restaurar con el patrón de `:400-403`. Casos, cada uno
   con `mainCapturingStderr` ⇒ `code === EXIT.FAILURE` y `stderr` que matchea `/^--out no se admite en testnet/`:
   - `['publish', '--network', 'testnet', '--out', '/tmp/battleship-test/testnet.json']`
   - [D1] `['record', '--network', 'testnet', '--from', '/nonexistent/publish-output.json', '--out', '/tmp/battleship-test/testnet.json']`
3. **`checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original`**,
   junto a los tests de `checkConfigDirGuard` (`:277-305`). Helper local:
   `` const fsThrow = (code) => (p) => { throw Object.assign(new Error(`${code}: permission denied, stat '${p}'`), { code }); }; ``
   Con `value = '/srv/battleship/net'`, `homes: [HOME]` y `...FS` más un override por caso:

   | Caso | Override | Código esperado |
   |---|---|---|
   | `isDir` lanza | `isDir: fsThrow('EACCES')` | `(EACCES)` |
   | `exists` lanza | `exists: fsThrow('EACCES')` | `(EACCES)` |
   | `hasClientYaml` lanza | `hasClientYaml: fsThrow('EACCES')` | `(EACCES)` |
   | `realpath` del config lanza | `realpath: (p) => (p === value ? fsThrow('ELOOP')(p) : FS.realpath(p))` | `(ELOOP)` |
   | `realpath` de `<home>/.sui` lanza | `` realpath: (p) => (p === `${HOME}/.sui` ? fsThrow('EACCES')(p) : FS.realpath(p)) `` | `(EACCES)` |
   | error sin `code` | `` isDir: (p) => { throw new Error(`boom ${p}`); } `` | `(error de fs)` |

   En cada caso `assert.throws` con una función validadora: el mensaje empieza con
   `'SUI_CONFIG_DIR inválido: no se pudo inspeccionar una ruta ('`, contiene el código esperado y **no** contiene
   `value`, `HOME`, `'/srv'`, `'permission denied'` ni `'boom'`; y `error.cause === undefined`.

Los 43 tests existentes de `publish.test.mjs` y los 51 de `deployment.test.mjs` pasan sin cambios (ningún test
existente se modifica, salvo agregar `checkOutArg` al import [D1]). Total esperado: **97** (51 + 46).

### 6. Smoke

No aplica (ver la decisión de arriba).

### 7. Criterios de aceptación

Gates (el DEV pega el output; desde `<repo>/contracts`, Node 26 por `nvm use` o con el prefijo
`export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version &&` de `agents.md` §3):

| # | Comando | Esperado |
|---|---|---|
| G0 | `stat -c '%y %s' ~/.sui/sui_config/client.yaml && ls ~/.sui/sui_config/` (al empezar y al terminar) | idénticos a §0 |
| G1 | `cd contracts && printf 'n\n' \| sui move build -e testnet --warnings-are-errors` | exit 0, 0 warnings |
| G2 | `cd contracts && printf 'n\n' \| sui move build -e testnet --lint --warnings-are-errors` | exit 0, 0 lints |
| G3 | `cd contracts && printf 'n\n' \| sui move test -e testnet --warnings-are-errors` | exit 0, **83** PASS |
| G4 | `cd contracts && git diff --exit-code -- Move.lock` | exit 0 |
| G5 | `cd contracts && node --test scripts/*.test.mjs` | exit 0, **97** PASS, 0 fail (`# tests 97`, `# pass 97`) |
| G6 | `cd contracts && node scripts/publish.mjs check` | exit 0, `0 despliegues` |

Greps (desde `<repo>`, output pegado):

| # | Comando | Esperado |
|---|---|---|
| C1 | `grep -c '^test(' contracts/scripts/publish.test.mjs` | `46` |
| C2 | `grep -n 'no se admite en testnet' contracts/scripts/publish.mjs` | 2 líneas: la de `--pubfile-path` y la de `--out` |
| C3 | [D1] `grep -n 'checkOutArg(' contracts/scripts/publish.mjs` | 3 líneas: definición, `checkPublishArgs`, `commandRecord` |
| C4 | `grep -n 'out: values.out' contracts/scripts/publish.mjs` | la llamada de `commandPublish` (y la de `commandRecord` [D1]) |
| C5 | `git diff master -- contracts/scripts/publish.mjs \| grep -nE '^\+.*(fs\.\|spawn\|runSui\(\|runGit\()'` | vacío (sin I/O nueva) |
| C6 | `git diff --name-only master` | solo `contracts/README.md`, `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `documents/STATUS.md` y este handoff |
| C7 | `git diff master -- . ':!documents/HANDOFF_PUBLISH_GUARDS.md' \| grep -nE '^\+.*(suiprivkey\|mnemonic\|PRIVATE KEY\|[0-9a-fA-F]{40,64})'` | vacío (el handoff se excluye: cita los patrones) |
| C8 | `git diff master \| grep -nE '^\+.*/(home\|Users)/' \| grep -v '/home/owner'` | vacío (`/home/owner` es el home ficticio de los tests) |
| C9 | `grep -n -- '--out' contracts/README.md` | además de la línea de localnet existente: "Uso en localnet" dice que `--out` es solo para localnet; "Uso en testnet" dice que no admite `--out` ni `--pubfile-path` y por qué; [D1] "Recuperación" dice que `record --network testnet` tampoco admite `--out` |
| C10 | `grep -n 'issue-39' documents/STATUS.md` | fila(s) nuevas de baseline de `contracts/scripts` (abajo) |

**C9 — texto para `contracts/README.md` "Despliegues"** (el DEV puede ajustar la redacción, no el contenido):

- "Uso en localnet", tras "Sin `--out` escribe `contracts/deployments/localnet.json` …": "`--out` existe solo para
  localnet (smokes); en testnet el script lo rechaza (#39)."
- "Uso en testnet", tras "Ningún agente corre este camino …": "No admite `--out` ni `--pubfile-path`: el json va
  siempre a `deployments/testnet.json`, el que `check` cruza con `[published.testnet]` (con otra ruta, la CI fallaría
  recién en `check`)."
- "Uso en testnet", paso 1, tras "El script lo exige (…)": "Si la guarda no puede inspeccionar una ruta (permisos,
  symlinks en bucle), aborta con el código del error (`EACCES`, `ELOOP`), nunca con la ruta."
- [D1] "Recuperación", en la viñeta de `record`: "`record --network testnet` tampoco admite `--out`."

**C10 — filas nuevas en `documents/STATUS.md` → "Baselines de gates"**, **encima** de las de #7 (que se conservan):

| Área @ ref | Gate | Resultado |
|---|---|---|
| contracts/scripts @ `feature/issue-39-publish-guards` (TASK-1 de #39), Node `v26.13.0`, <fecha> | `cd contracts && node --test scripts/*.test.mjs` | 🟢 exit 0. **97 tests PASS** (51 `deployment.test.mjs` + 46 `publish.test.mjs`); step del job `contracts` de la CI |
| | `node scripts/publish.mjs check` | 🟢 exit 0. **0 despliegues** |

La fila "Siguiente" y la tabla del ciclo las actualiza el orquestador al mergear (housekeeping), no el DEV.
`agents.md`: no aplica (no describe `--out` en testnet; §3 y §12 siguen correctos).

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5, con: fase roja (nombres de los 3 tests que fallaban),
G0-G6 y C1-C10 pegados, "Desviaciones del handoff" (o "ninguna") y el snippet de STATUS. Sin commits ni pushes.

Mensaje de commit propuesto (lo usa el orquestador tras la revisión MID):

```
contracts: reject --out on testnet and hide fs paths in the config guard (#39)

publish (and record) with --network testnet --out left deployments/testnet.json
unwritten, and the error only surfaced in CI's check (MINOR-2 of #38). An fs
exception in checkConfigDirGuard (EACCES, ELOOP) carried the owner's config path
to stderr; it now fails closed with only the error code (NIT-2).
```
