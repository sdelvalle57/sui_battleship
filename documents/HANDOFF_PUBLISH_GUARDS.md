# HANDOFF_PUBLISH_GUARDS
> Plan + handoff consolidado (issue chico, seguimiento de #7) | Issue: #39 (MINOR-2 y NIT-2 de la revisión de
> integración del MAYOR sobre el PR #38) | Prerrequisito de #8 | Branch: `feature/issue-39-publish-guards` (desde
> `master` @ `dfb11ce`) | Versión: v1.1 | Fecha: 2026-11-02
> Un solo task. Sin commits ni pushes (los hace el orquestador tras la revisión MID). Reporte con la plantilla de
> `documents/FLUJO_AGENTES.md` §5.

**Changelog**

- **v1.1** — Revisión MAYOR v1: APPROVE (2026-11-02), 0 BLOCKER/MAJOR. Cambios: MINOR-1 (fase roja: los imports
  nuevos se agregan recién en la fase verde y el rojo esperado queda exacto, §5); NIT-1 (HU acotada a lo que el task
  oculta de verdad); NIT-2 (el test de `main` en testnet cita el precedente de #38, no D-20261102-03); NIT-3 (grep C5 con
  `fs\.[a-zA-Z]+\(`); opcional del MAYOR incluido: el stderr de la CLI que reimprime el script oculta la ruta de la
  config (`<SUI_CONFIG_DIR>`, §3.3) con 2 tests. D1 resuelta (= sí): se quitan las marcas `[D1]` y el camino alternativo.
  Conteo: `publish.test.mjs` 43 → **48**; total 94 → **99**.
- **v1** — Plan + handoff inicial (`3b98241`).

## Historia de usuario

**Como** owner que va a publicar el paquete en testnet (#8) desde su terminal, **quiero** que
`contracts/scripts/publish.mjs` rechace en el acto un `--out` en testnet, y que ni los errores de la guarda de
`SUI_CONFIG_DIR` (tampoco cuando falla el sistema de archivos) ni el stderr de la CLI que el script reimprime muestren la
ruta de mi config, **para** no enterarme recién en la CI de que el json canónico quedó sin escribir, y poder pegar esos
errores en un issue sin revelar dónde vive mi clave.

**Scope en una frase:** tres cambios en el script de publicación (`--out` prohibido con `--network testnet` en `publish`
y `record`; excepciones de `fs` de la guarda de config convertidas en un error sin ruta; ruta de la config reemplazada
por `<SUI_CONFIG_DIR>` en el stderr de la CLI que se reimprime), con sus tests y la documentación de "Despliegues".

**Lo que NO entrega:**
- Ninguna publicación ni dry run en testnet (#8, solo el owner, D-20261102-03).
- Cambios en `deployment.mjs`, el esquema del json, `check`, la CI, los fixtures, el paquete Move o la app.
- Ocultar las rutas que el script imprime a propósito: `outPath` (destino del json), el directorio temporal
  (`battleship-publish-*` bajo `os.tmpdir()`), los archivos de salida cruda y `--from`/`--meta` de `record`. Ninguna es
  la config. El stdout de la CLI no se imprime nunca (ya era así, H-1 de #7).
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

La branch lleva además `3b98241` (solo este handoff, v1).

## Decisiones (no reabrir)

| ID | Decisión |
|---|---|
| D-A | D-20261102-03: ningún agente corre `publish --network testnet`, ni con `--dry-run`. El camino testnet se prueba con funciones puras |
| D-B | D-20261102-01 §3: `deployments/testnet.json` es el json que `check` cruza con `[published.testnet]`; se escribe solo con el script |
| D-C | D-20261030-02: el MID no corre gates; los corre el DEV y pega el output |
| D1 | `--out` también se rechaza en `record --network testnet`, no solo en `publish` |

> Decisión (2026-11-02): D1 = **sí** — resuelta por el orquestador, sin STOP: el título de #39 es "rechazar --out en testnet" (no solo en `publish`) y `record` es la vía de recuperación de #8; es el sentido restrictivo y no cambia ninguna receta documentada.

> Precedente (no decisión del owner): llamar a `main` con `--network testnet` dentro de `node --test`, cortado antes de
> leer la config y de invocar la CLI, ya está en el test de `main` aprobado en #38 (`publish.test.mjs:228-241`, caso
> `['publish', '--network', 'testnet', '--yes']`). El test nuevo de §5 (2) sigue ese precedente y añade dos barreras
> (sin `SUI_CONFIG_DIR` y con `SUI_BIN` inexistente).

Decisiones internas del MID (detalle de implementación, sin STOP):

> Decisión (2026-11-02): en testnet se rechaza la **presencia** de `--out` (también vacío o igual a la ruta por defecto)
> en vez de comparar rutas, porque comparar exige resolver symlinks y no aporta nada: sin `--out` el script ya escribe la
> ruta canónica.

> Decisión (2026-11-02): las excepciones de `fs` se capturan **dentro** de `checkConfigDirGuard` (no en el cableado de
> `commandPublish`), porque es la función que promete mensajes sin ruta y se testea con sondas inyectadas. Se informa
> solo el `code` del error (`EACCES`, `ELOOP`…), sin el mensaje original y sin `cause` (un `cause` lo mostraría
> cualquier `console.error(err)` futuro). Falla cerrada: si no se puede inspeccionar `~/.sui` de un home, no se puede
> demostrar que la config esté fuera, así que se aborta.

> Decisión (2026-11-02): el stderr de la CLI se redacta en las dos funciones puras que lo reimprimen (`readCliJson` y
> `formatCliFailure`, esta vía `interpretCliRun`) con una lista `configDirs` = [realpath validado, valor original de
> `SUI_CONFIG_DIR`]: la CLI puede mostrar cualquiera de las dos formas. El reemplazo es literal (sin regex: una ruta
> puede traer metacaracteres), de la ruta más larga a la más corta, y antes de `redactAddresses`. El parámetro es
> opcional (`[]` por defecto), así que `record` y los tests existentes no cambian.

> Decisión (2026-11-02): **smoke: no aplica.** Las tres correcciones ocurren antes de cualquier I/O de red (guarda 1)
> o dentro de funciones puras (guarda de config con `fs` inyectado; redacción del stderr). El cableado de `main` para
> `--out` se cubre con un test que corta antes de la config y de la CLI. El paso de `configDirs` en `commandPublish`
> solo se ejercería con un fallo real de la CLI; se verifica en la revisión MID del diff y con los greps C11-C12. Una
> localnet aislada no probaría nada que los tests y esos greps no prueben.

## Reglas transversales

- **Nunca** `node scripts/publish.mjs publish --network testnet` (con o sin `--dry-run`) desde una shell (D-A). Dentro de
  `node --test`, `main` con `--network testnet` solo en el test de §5 (2), que corta antes de la config y de la CLI
  (precedente de #38).
- **Ninguna** llamada `sui client …` (no hace falta ninguna en este task). Solo los gates `sui move …` con su forma
  canónica (`agents.md` §3).
- La shell de los gates **no** exporta `SUI_CONFIG_DIR` (el test nuevo de `main` además lo borra mientras corre).
- Sobre `~/.sui/`: solo `stat`/`ls`, al empezar y al terminar (deben coincidir con §0).
- Sin rutas personales en lo que se escriba o se pegue: `<repo>`, `<HOME real>`.
- **No tocar:** `contracts/scripts/deployment.mjs`, `contracts/scripts/deployment.test.mjs`, `contracts/scripts/fixtures/`,
  `contracts/sources/`, `contracts/tests/`, `contracts/Move.toml`, `contracts/Move.lock`, `.github/`, `app/`,
  `agents.md`, `documents/DECISIONES.md`, `documents/ESTANDARES.md`.

---

## TASK-1: `--out` en testnet, excepciones de `fs` y ruta de la config en el stderr — área: contracts (tooling) + docs

### 1. Historia de usuario del task

**Como** owner, **quiero** que `publish` y `record` con `--network testnet --out …` terminen con exit 1 antes de leer la
config o invocar la CLI; que un `EACCES`/`ELOOP` de la guarda de config salga como `SUI_CONFIG_DIR inválido: …` con
solo el código del error; y que el stderr de la CLI que el script reimprime traiga `<SUI_CONFIG_DIR>` en lugar de la
ruta de mi config, **para** que el error de `--out` aparezca en mi terminal y no en la CI, y que ni la guarda ni el
stderr reimpreso revelen dónde vive mi clave.

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
- Stderr de la CLI reimpreso: `readCliJson` (`:232-241`, al fallar `active-env`/`chain-identifier`, llamado en
  `:574-575`) y `formatCliFailure` (`:345-357`, línea `stderr de la CLI (direcciones ocultas):`), al que llega por
  `interpretCliRun` (`:386-410`) desde `runAndKeep` (`:535-543`). Ambos aplican solo `redactAddresses`: un error de la CLI
  sobre su keystore o su `client.yaml` mostraría la ruta de la config.
- Tests: `contracts/scripts/publish.test.mjs` — import en `:10-36`, `CONFIG_DIR = '/srv/battleship/net'` en `:56`,
  `ACCOUNT_ADDRESSES`/`assertNoAccountAddress` en `:61-71`, `checkPublishArgs` en `:245-252`, `fakeFs`/`FS`/`HOME` en
  `:254-275`, `checkConfigDirGuard` en `:277-305`, `readCliJson` en `:328-339`, `mainCapturingStderr` en `:213-226`, test
  de `main` en `:228-241`, patrón de guardar/restaurar `process.env` en `:391-405`, `formatCliFailure`/`interpretCliRun`
  en `:527-672`. Ningún test invoca `sui` ni git ni escribe archivos (`:1-2`).

### 3. Qué implementar

#### 3.1 `--out` prohibido en testnet (MINOR-2 + D1)

En `contracts/scripts/publish.mjs`:

1. Comentario de uso (`:3` y `:6`): `[--out <ruta>]` → `[--out <ruta>, solo localnet]`.
2. Nueva función exportada, justo antes de `checkPublishArgs`:

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
   `{ network: unknown, pubfilePath: unknown, out: unknown }`; como **última** línea, `checkOutArg({ network, out });`.
   El orden de las comprobaciones existentes no cambia.
4. `commandPublish` (`:557`): `checkPublishArgs({ network, pubfilePath: values['pubfile-path'], out: values.out });`
5. `commandRecord` (`:665`): primera sentencia, antes de la de `--from`:
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

- `FS_ERROR_CODE_RE` va con las demás constantes del módulo (fuera de la función); no se exporta.
- JSDoc: "Los mensajes no incluyen la ruta, tampoco ante una excepción de `fs` (solo su código, #39)".
- `isAbsolute` queda sin envolver (es `path.isAbsolute`, no toca el disco). El cableado de la guarda en
  `commandPublish` (`:561-569`) **no cambia**.

#### 3.3 Ruta de la config oculta en el stderr reimpreso de la CLI (opcional del MAYOR, incluido)

1. Nueva función exportada, junto a `readCliJson`:

   ```js
   const CONFIG_DIR_PLACEHOLDER = '<SUI_CONFIG_DIR>';

   /**
    * Reemplaza la ruta de la config (realpath validado y valor original de `SUI_CONFIG_DIR`) por `<SUI_CONFIG_DIR>` en un
    * texto de la CLI (#39): un error sobre el keystore o `client.yaml` la mostraría. Reemplazo literal (sin regex), de la
    * ruta más larga a la más corta; sin separadores finales; ignora valores que no sean texto, vacíos o la raíz.
    * @param {string} text
    * @param {unknown[]} configDirs
    * @returns {string}
    */
   export function redactConfigDir(text, configDirs) {
     const dirs = [
       ...new Set(
         configDirs
           .filter((d) => typeof d === 'string')
           .map((d) => d.replace(/[\\/]+$/, ''))
           .filter((d) => d.length > 0),
       ),
     ].sort((a, b) => b.length - a.length);
     return dirs.reduce((acc, dir) => acc.split(dir).join(CONFIG_DIR_PLACEHOLDER), text);
   }
   ```

   (Quitar los separadores finales convierte la raíz `/` en `''`, que el segundo `filter` descarta.)
2. `readCliJson(result, what, configDirs = [])`: el mensaje de fallo usa
   `redactAddresses(redactConfigDir(result.stderr, configDirs)).trim()`. JSDoc: "con las direcciones y la ruta de la
   config ocultas".
3. `formatCliFailure({ …, configDirs = [] })`: la línea del stderr pasa a
   `'stderr de la CLI (direcciones y config ocultas):', redactAddresses(redactConfigDir(stderr, configDirs)).trimEnd()`.
   Agregar `configDirs?: unknown[]` al tipo del JSDoc.
4. `interpretCliRun({ …, configDirs = [] })`: lo reenvía a `formatCliFailure`. JSDoc actualizado.
5. `runAndKeep({ …, configDirs })`: lo reenvía a `interpretCliRun`.
6. `commandPublish`, justo después de la guarda de config:
   `const configDirs = [configDir, process.env.SUI_CONFIG_DIR];`, y pasarlo como tercer argumento a las dos llamadas a
   `readCliJson` (`:574-575`) y como `configDirs` a las dos llamadas a `runAndKeep` (`:612-619`, `:636-643`).
7. `commandRecord` **no cambia** en esto (su `stderr` es `''`).

### 4. Archivos a tocar / NO tocar

| Archivo | Cambio |
|---|---|
| `contracts/scripts/publish.mjs` | §3.1, §3.2 y §3.3. Sin I/O nueva (ningún `fs.*(`, `spawn` ni `runSui`/`runGit` añadido; la única lectura nueva es `process.env.SUI_CONFIG_DIR` en `commandPublish`) |
| `contracts/scripts/publish.test.mjs` | 5 tests nuevos (§5) y `checkOutArg`, `redactConfigDir` en el import (solo en la fase verde) |
| `contracts/README.md` | "Despliegues" (§7, C9) |
| `documents/STATUS.md` | Baseline de `contracts/scripts` (§7, C10) |

NO tocar: lo listado en "Reglas transversales".

### 5. Tests obligatorios (en `contracts/scripts/publish.test.mjs`)

**Fase roja primero (PROY-9), sin ambigüedad:**

1. Escribir los 5 tests de abajo **sin** tocar todavía el import de `publish.test.mjs` (`:10-36`): `checkOutArg` y
   `redactConfigDir` **no** se importan en esta fase. Si se importaran, el enlace ESM fallaría
   (`does not provide an export named …`), el archivo entero no cargaría y no habría rojo por test.
2. Correr `cd contracts && node --test scripts/publish.test.mjs` sin tocar `publish.mjs`. **Rojo esperado exacto:**
   `# tests 48`, `# pass 43`, `# fail 5`. Fallan solo los 5 nuevos: (1) y (4) con `ReferenceError` (`checkOutArg`/
   `redactConfigDir` sin importar; en (1) puede fallar antes una aserción de `checkPublishArgs`), y (2), (3) y (5) por
   aserción. Pegar en el reporte esas tres líneas del resumen y los 5 nombres que fallan. Si el resultado es otro (por
   ejemplo, el archivo no carga), el DEV para y lo reporta.
3. Fase verde: implementar §3, agregar `checkOutArg` y `redactConfigDir` al import (orden alfabético dentro del bloque)
   y correr los gates de §7.

Es seguro: en la fase roja el test (2) borra `SUI_CONFIG_DIR` y apunta `SUI_BIN` a un binario inexistente. `publish`
corta en la guarda de config (`no está definido`); `record` corta en `resolveRecordMeta` (`sin meta.json se exigen …`)
sin leer `--from` ni escribir nada. Ninguno llega a la CLI.

**Tests:**

1. **`checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet`**, junto al
   test de `checkPublishArgs` (`:245`):
   - `checkPublishArgs({ network: 'testnet', out: '/tmp/battleship-test/testnet.json' })` y con `out: ''` ⇒ lanza
     `/--out no se admite en testnet/`.
   - `checkPublishArgs({ network: 'testnet', pubfilePath: 'P', out: 'x' })` ⇒ sigue lanzando
     `/--pubfile-path no se admite en testnet/` (el orden de las guardas no cambia).
   - `checkPublishArgs({ network: 'localnet', pubfilePath: 'P', out: '/tmp/battleship-test/localnet.json' })` y
     `checkPublishArgs({ network: 'testnet', out: undefined })` ⇒ no lanzan.
   - `checkOutArg`: `testnet` + `'x'` lanza; `localnet` + `'x'` y `testnet` + `undefined` no lanzan.
2. **`main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI`**, junto al test de `main`
   (`:228`): guardar `process.env.SUI_CONFIG_DIR` y `process.env.SUI_BIN`; en el `try`, `delete` del primero y
   `SUI_BIN = '/nonexistent/sui-bin-de-test'`; en el `finally`, restaurar con el patrón de `:400-403`. Casos, cada uno
   con `mainCapturingStderr` ⇒ `code === EXIT.FAILURE` y `stderr` que matchea `/^--out no se admite en testnet/`:
   - `['publish', '--network', 'testnet', '--out', '/tmp/battleship-test/testnet.json']`
   - `['record', '--network', 'testnet', '--from', '/nonexistent/publish-output.json', '--out', '/tmp/battleship-test/testnet.json']`
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
4. **`redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto`**,
   junto al test de `readCliJson` (`:328`). Con `CONFIG_DIR` (`:56`) y `'/srv/own-link'` (el symlink de `FS`):
   - `redactConfigDir('open /srv/battleship/net/sui.keystore; /srv/own-link/client.yaml', [CONFIG_DIR, '/srv/own-link'])`
     ⇒ `'open <SUI_CONFIG_DIR>/sui.keystore; <SUI_CONFIG_DIR>/client.yaml'`.
   - Valor con `/` final: `redactConfigDir('/srv/battleship/net/x', ['/srv/battleship/net/'])` ⇒ `'<SUI_CONFIG_DIR>/x'`.
   - Anidadas, en cualquier orden: `redactConfigDir('/srv/a/b/x y /srv/a/y', ['/srv/a', '/srv/a/b'])` ⇒
     `'<SUI_CONFIG_DIR>/x y <SUI_CONFIG_DIR>/y'`.
   - Metacaracteres literales: `redactConfigDir('/srv/c.d+e/x /srv/cXd+e/x', ['/srv/c.d+e'])` ⇒
     `'<SUI_CONFIG_DIR>/x /srv/cXd+e/x'`.
   - Ignorados: `redactConfigDir('/srv/x', [undefined, '', '/', 42])` ⇒ `'/srv/x'`; `redactConfigDir('sin rutas', [CONFIG_DIR])`
     ⇒ `'sin rutas'`.
5. **`readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones`**,
   a continuación del (4). Con `const [address] = ACCOUNT_ADDRESSES;`,
   `` const stderr = `cannot open /srv/own-link/sui.keystore (real ${CONFIG_DIR}) for 0x${address}\n`; `` y
   `const configDirs = [CONFIG_DIR, '/srv/own-link'];`:
   - `readCliJson({ status: 1, stdout: '', stderr }, 'active-env', configDirs)` lanza un error cuyo mensaje contiene
     `'<SUI_CONFIG_DIR>/sui.keystore'` y `'(real <SUI_CONFIG_DIR>)'`, y no contiene `'/srv'`; `assertNoAccountAddress`.
   - `formatCliFailure({ reason: 'x', status: 1, stdout: '', stderr, dir: '/tmp/d', outputPath: '/tmp/d/publish-output.json', configDirs })`:
     contiene `'stderr de la CLI (direcciones y config ocultas):'` y `'<SUI_CONFIG_DIR>/sui.keystore'`, no contiene
     `'/srv'`; `assertNoAccountAddress`; sigue conteniendo `'/tmp/d/publish-output.json'` (las rutas propias del script
     no se tocan).
   - `interpretCliRun({ result: { status: 1, stdout: '', stderr }, parse: (json) => json, dir: '/tmp/d', outputPath: '/tmp/d/publish-output.json', configDirs })`
     ⇒ `'error' in outcome`, con `'<SUI_CONFIG_DIR>'` y sin `'/srv'`.
   - Compatibilidad: `formatCliFailure` **sin** `configDirs` y el mismo `stderr` conserva `'/srv/own-link/sui.keystore'`
     (el parámetro es opcional; los tests existentes no cambian).

Los 43 tests existentes de `publish.test.mjs` y los 51 de `deployment.test.mjs` pasan sin cambios (ningún test
existente se modifica; solo crece el import). Total esperado: **99** (51 + 48).

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
| G5 | `cd contracts && node --test scripts/*.test.mjs` | exit 0, **99** PASS, 0 fail (`# tests 99`, `# pass 99`) |
| G6 | `cd contracts && node scripts/publish.mjs check` | exit 0, `0 despliegues` |

Greps (desde `<repo>`, output pegado):

| # | Comando | Esperado |
|---|---|---|
| C1 | `grep -c '^test(' contracts/scripts/publish.test.mjs` | `48` |
| C2 | `grep -n 'no se admite en testnet' contracts/scripts/publish.mjs` | 2 líneas: la de `--pubfile-path` y la de `--out` |
| C3 | `grep -n 'checkOutArg(' contracts/scripts/publish.mjs` | 3 líneas: definición, `checkPublishArgs`, `commandRecord` |
| C4 | `grep -n 'out: values.out' contracts/scripts/publish.mjs` | 2 líneas: las llamadas de `commandPublish` y `commandRecord` |
| C5 | `git diff master -- contracts/scripts/publish.mjs \| grep -nE '^\+.*(fs\.[a-zA-Z]+\(\|spawn\|runSui\(\|runGit\()'` | vacío (sin I/O nueva) |
| C6 | `git diff --name-only master` | solo `contracts/README.md`, `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `documents/STATUS.md` y este handoff |
| C7 | `git diff master -- . ':!documents/HANDOFF_PUBLISH_GUARDS.md' \| grep -nE '^\+.*(suiprivkey\|mnemonic\|PRIVATE KEY\|[0-9a-fA-F]{40,64})'` | vacío (el handoff se excluye: cita los patrones) |
| C8 | `git diff master \| grep -nE '^\+.*/(home\|Users)/' \| grep -v '/home/owner'` | vacío (`/home/owner` es el home ficticio de los tests) |
| C9 | `grep -n -- '--out' contracts/README.md` y `grep -n 'SUI_CONFIG_DIR>' contracts/README.md` | los textos de abajo |
| C10 | `grep -n 'issue-39' documents/STATUS.md` | fila(s) nuevas de baseline de `contracts/scripts` (abajo) |
| C11 | `grep -n 'redactConfigDir(' contracts/scripts/publish.mjs` | 3 líneas: definición, `readCliJson`, `formatCliFailure` |
| C12 | `grep -n 'configDirs' contracts/scripts/publish.mjs` | incluye la definición en `commandPublish`, las 2 llamadas a `readCliJson` y las 2 a `runAndKeep` |

**C9 — texto para `contracts/README.md` "Despliegues"** (el DEV puede ajustar la redacción, no el contenido):

- "Uso en localnet", tras "Sin `--out` escribe `contracts/deployments/localnet.json` …": "`--out` existe solo para
  localnet (smokes); en testnet el script lo rechaza (#39)."
- "Uso en testnet", tras "Ningún agente corre este camino …": "No admite `--out` ni `--pubfile-path`: el json va
  siempre a `deployments/testnet.json`, el que `check` cruza con `[published.testnet]` (con otra ruta, la CI fallaría
  recién en `check`)."
- "Uso en testnet", paso 1, tras "El script lo exige (…)": "Si la guarda no puede inspeccionar una ruta (permisos,
  symlinks en bucle), aborta con el código del error (`EACCES`, `ELOOP`), nunca con la ruta."
- "Recuperación", primer párrafo: "el stderr con las direcciones ocultas" → "el stderr con las direcciones y la ruta
  de la config ocultas (`<SUI_CONFIG_DIR>`)".
- "Recuperación", en la viñeta de `record`: "`record --network testnet` tampoco admite `--out`."

**C10 — filas nuevas en `documents/STATUS.md` → "Baselines de gates"**, **encima** de las de #7 (que se conservan):

| Área @ ref | Gate | Resultado |
|---|---|---|
| contracts/scripts @ `feature/issue-39-publish-guards` (TASK-1 de #39), Node `v26.13.0`, <fecha> | `cd contracts && node --test scripts/*.test.mjs` | 🟢 exit 0. **99 tests PASS** (51 `deployment.test.mjs` + 48 `publish.test.mjs`); step del job `contracts` de la CI |
| | `node scripts/publish.mjs check` | 🟢 exit 0. **0 despliegues** |

La fila "Siguiente" y la tabla del ciclo las actualiza el orquestador al mergear (housekeeping), no el DEV.
`agents.md`: no aplica (no describe `--out` en testnet ni el formato de los errores; §3 y §12 siguen correctos).

### 8. Al terminar

Reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5, con: fase roja (las tres líneas `# tests`/`# pass`/
`# fail` y los 5 nombres que fallaban), G0-G6 y C1-C12 pegados, "Desviaciones del handoff" (o "ninguna") y el snippet
de STATUS. Sin commits ni pushes.

Mensaje de commit propuesto (lo usa el orquestador tras la revisión MID):

```
contracts: reject --out on testnet and hide the config path in errors (#39)

publish and record with --network testnet --out left deployments/testnet.json
unwritten, and the error only surfaced in CI's check (MINOR-2 of #38). An fs
exception in checkConfigDirGuard (EACCES, ELOOP) carried the owner's config
path to stderr; it now fails closed with only the error code (NIT-2). The CLI
stderr the script reprints now shows <SUI_CONFIG_DIR> instead of that path.
```
