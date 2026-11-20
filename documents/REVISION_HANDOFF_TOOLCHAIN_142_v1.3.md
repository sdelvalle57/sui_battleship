APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS. Revisión del MAYOR (ronda 3) del delta v1.2 → v1.3 de `documents/HANDOFF_TOOLCHAIN_142.md` (#75, addendum de TASK-2b: puerto de las capturas)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>`, branch `feature/issue-75-toolchain-1840`, HEAD `051c131` (TASK-2a). Handoff v1.3 sin commitear, 686 líneas. El `diff` contra la v1.2 da 86 líneas cambiadas. Revisé solo el delta.
- **Resumen:**
  - **El cambio de diseño de la guarda es seguro.** La regex anclada más la verificación numérica del rango cubren todas las variantes hostiles que probé. El `chainId` sigue siendo la barrera que impide capturar de un servicio ajeno.
  - La estructura del test (`app/src/test/` + `.d.mts`) es compatible con el lint, el typecheck, Vitest y la imagen de Docker.
  - El alcance es correcto y **el diff no toca ninguna watch path de Railway**.
  - Coincido con la severidad del incidente (🟠 MAJOR de proceso, sin impacto, sin S-7).
  - Hay **4 MINOR** y **4 SUG**. Ninguno bloquea el diseño. Antes de entregar TASK-2b hay que corregir **N-1** (el commit intermedio no se puede hacer tal como está escrito) y **N-2** (los conteos de `app` se contradicen dentro del handoff). N-3 y N-4 pueden ir en la misma edición.
- **Ejecuté solo:** lecturas del worktree; `node` (v26.13.0) sobre un script propio del scratchpad que emula `isLoopbackUrl` con la regex y el rango del handoff (sin red, sin importar código del repo); y la lectura de las líneas del código de la CLI (`sui_commands.rs`) que bajó la sonda. No corrí gates, `sui`, `suiup` ni Docker, y no toqué `~/.sui`.

---

## 1. ¿La guarda relajada es segura? Sí

**Regex `^http://127\.0\.0\.1:([1-9][0-9]{3,4})$` + `typeof url === 'string'` + entero entre 1024 y 65535** (2.4.1). La emulé y la corrí contra 47 entradas.

- **Aceptadas (las únicas):** `:9000`, `:19000`, `:1024`, `:10000`, `:65535`.
- **Rechazadas:**
  - Rango y forma del puerto: `:1023`, `:0`, `:65536`, `:99999`, `:099999`, `:019000`, sin puerto, `:` vacío, `:19000:1`.
  - Path, query y fragmento: `/`, `/x`, `?x=1`, `#x`.
  - Esquema: `https`, `HTTP`.
  - Host: `localhost`, `127.0.0.2`, `127.1`, `2130706433`, `0x7f.0.0.1`, `0.0.0.0`, `[::1]`, `192.168.1.10`, `127.0.0.1.evil.com`, `127。0。0。1`, `http:/\127.0.0.1`.
  - Credenciales: `127.0.0.1:9000@evil.com`, `user:pw@127.0.0.1`.
  - Espacios y caracteres al borde: espacio inicial o final, `\n`, `\r`, `\t`, `U+2028`, `\u0000` finales.
  - Dígitos no ASCII: de ancho completo y arábigo-índicos.
  - Otros: la cadena vacía, `undefined`, `null` y un número.
- **`\n` final:** confirmado que en JS `$` sin la bandera `m` **no** matchea antes de un `\n` final, tampoco ante `\r` ni `U+2028`.
- **El rango:** `[1-9][0-9]{3,4}` **sí** admite 1000-1023 y 65536-99999. Esos valores los rechaza la verificación numérica, que el handoff exige aparte ("como entero, entre 1024 y 65535"). Verificado: `:1023`, `:65536` y `:99999` dan `regex = true` y resultado `false`.
- **Lo único que la regex sola deja pasar:** valores no `string`. `RegExp.prototype.test` convierte el argumento a cadena, así que `['http://127.0.0.1:19000']`, `new String(…)` y un objeto con `toString` dan `true` en la regex. Ahí el `typeof` del handoff es imprescindible (ver N-5).

**¿Se le puede hablar a un servicio ajeno del host?** Solo si el DEV pasa un puerto equivocado. Lo que se arriesga es acotado, y las barreras alcanzan contra el error accidental, que es el riesgo real:

1. **El pedido a un servicio ajeno:** cada `capture-*` hace un **único** POST gRPC-web, `getServiceInfo({})`, sin cuerpo ni credenciales.
   - Orden verificado: `capture-read-fixtures.mjs:60-64`, `capture-tx-fixtures.mjs:66-70` y `capture-house-fixtures.mjs:77-81` crean el cliente, piden `getServiceInfo` y llaman a `assertDeployment`; recién después viene cualquier otra lectura.
   - Un servicio que no habla Sui gRPC falla en la decodificación. Si respondiera, el chain id corto tendría que coincidir con el de `contracts/deployments/localnet.json`, que escribe `publish.mjs` desde **esta** génesis. Por accidente eso es imposible.
2. **No se escribe nada:** cada script escribe la fixture una sola vez, **al final** (`writeFile` en `:207`, `:342` y `:297`). Ante un error no queda ninguna fixture a medias.
3. **Nada se firma:** las simulaciones usan `setSender` + `build({ client })`, sin claves.
4. **La cadena del puerto es coherente:**
   - `ss -ltn` comprueba que el 19000 está libre;
   - `sui start --fullnode-rpc-port 19000` lo toma y reescribe el alias `localnet` del config **aislado**. Verificado en las líneas de la sonda: `sui_commands.rs:1292-1297` y `update_wallet_config_rpc` `:1951-1968` usan el `config_dir` de `--network.config`;
   - `smoke_guard` exige RPC = 19000;
   - la captura usa `--url http://127.0.0.1:19000`;
   - `assertDeployment` cierra con el chain id.
5. **Sin `--url`:** la regla de no correr una captura sin `--url` mientras el 9000 esté ocupado está en 2.4.6, y 2.6/2.7 dicen "siempre con `--url`". Alcanza, con N-6 como refuerzo.

**¿Hace falta pedir algo más?** No como requisito: `assertDeployment` ya va antes de cualquier otra lectura. Lo de N-6 (atar el `--url` a la misma variable que verifica `smoke_guard`) es una mejora.

**El valor por defecto en 9000:** está bien conservarlo, porque cambiarlo cambia la interfaz y la documentación. No veo motivo para exigir `--url` siempre.

## 2. Estructura del test y de los tipos: correcta

- **Vitest:** `app/vite.config.ts` → `include: ['src/**/*.test.{ts,tsx}']`, `environment: 'jsdom'`. El test entra en `npm test -w app`. Importar `node:process` en el entorno `jsdom` funciona, porque Vitest corre en Node.
- **TypeScript:** `app/tsconfig.json` tiene `include: ["src"]`, `types: ["vite/client"]` (sin Node), `moduleResolution: "bundler"` y sin `allowJs`. Un `import … from '../../scripts/localnet-guard.mjs'` resuelve al `localnet-guard.d.mts` hermano y lo suma al programa por la importación, aunque esté fuera del `include`. `tsconfig.node.json` solo incluye `vite.config.ts`, así que no se afecta.
  - **Ojo:** `skipLibCheck: true` también omite los `.d.mts`, y sin `checkJs` **nada verifica que el `.d.mts` coincida con el `.mjs`**. La comprobación real son los tests en tiempo de ejecución (ver N-7).
- **ESLint:**
  - `eslint .` aplica `strictTypeChecked` a `**/*.{ts,tsx}`, con `projectService` sobre `tsconfig.json`; el test queda tipado.
  - La regla de capas `no-restricted-imports` de `src/**` solo restringe `^@mysten/(?!dapp-kit-react/ui$)`, y las de `src/sui|hooks|providers` no aplican a `src/test/`. **Ninguna regla de capas se rompe.**
  - Ningún bloque de configuración matchea el `.d.mts`, así que ESLint no lo analiza. No falla, pero tampoco lo revisa.
  - `no-console` aplica a todo: el handoff ya pide "sin `console`".
- **Precedente:** no hay tests de `app/scripts/`. El precedente más cercano de un test de `src/` que lee fuera de `src/` es `app/src/sui/config.test.ts:4`, que con `import.meta.glob` lee `contracts/scripts/fixtures/localnet.deployment.json`. `app/src/test/` ya existe (`setup.ts` y los harness). **No veo un lugar mejor:** `src/sui/` tiene reglas de capas, y en `app/scripts/` no corre ningún runner de CI.
- **Docker/`deploy-image`:**
  - `.dockerignore` excluye `app/scripts`, así que el `.d.mts` y el `.mjs` no entran en la imagen; el test sí entra, con `app/`.
  - El `Dockerfile` solo corre `npm run build -w app` (`vite build`, que parte de `index.html`), sin `tsc` ni Vitest. Un test que importa un archivo ausente en la imagen **no** rompe el build.

## 3. Alcance: correcto

- Tocar `localnet-guard.mjs`, el `.d.mts`, el test y **solo comentarios** de los tres `capture-*`; no tocar `app/src/sui/networks.ts`. De acuerdo.
  - Comentarios verificados: `read:4, :6`, `tx:7, :9`, `house:6, :16`. Los tres scripts usan solo la `url` devuelta (`:14/:60`, `:18/:66`, `:26/:77`).
  - El encabezado de la guarda (`localnet-guard.mjs:1-10`, "Única URL aceptada") también cambia y entra en "Tocar".
- **Otros `9000` del repo** (grep completo):
  - `app/src/sui/networks.ts:11` y sus tests (`networks.test.ts:6`, `dappKit.test.ts:26`, `config.test.ts:52`): navegador y tests unitarios. TASK-2b y TASK-3 no los ejercitan contra una red, así que no cambian.
  - `check-deploy-image.sh` usa el 8080/8090; el `Caddyfile` no menciona el 9000.
  - `agents.md:176` es una medición histórica.
  - `contracts/README.md:466` y `app/README.md:328, :840` ya están en TASK-4.
  - **No falta nada.**
- **Railway, el merge no publica el sitio.**
  - Watch paths (`app/README.md:248-267`): `app/scripts/**`, `app/src/test/**`, `app/src/**/*.test.ts` y `app/README.md` están negados; `contracts/fixtures/`, `contracts/scripts/*.test.mjs`, `contracts/scripts/fixtures/`, `Move.lock`, `ci.yml` y los docs no figuran.
  - El diff actual de la branch (`git diff --stat 88dd53b HEAD`) no toca `contracts/scripts/publish.mjs`, `deployment.mjs`, `Published.toml`, `deployments/testnet.json`, `package*.json`, `Dockerfile` ni `.dockerignore`.
  - **No se usa la preautorización de D-20261119-02 para un redeploy.**

## 4. Consecuencias en TASK-3/TASK-4, commits, DoD y S-10

- **TASK-3:** el cambio a "1156 + N en 66" está solo en 3.1 (469). En el resto del handoff sigue el número viejo: ver N-2.
- **TASK-4:** el alcance de los docs del puerto es correcto. La plantilla de `env.sh` de `agents.md` no debe fijar el `19000` en el código (ver N-6).
- **Commits:** el tipo `app:` es la convención del repo (24 commits en `master`). Ambos llevan `Refs #75`. La división, sin embargo, no se puede ejecutar como está escrita: ver N-1.
- **DoD de 2b (437-438):** completo.
- **S-10:** bien definido ("no se improvisa otra ubicación del test"). Está dentro de TASK-2b y dice "se suma a §3": conviene moverlo físicamente a §3 (N-4).

## 5. Incidente del DEV y R-12

- **Severidad: coincido con 🟠 MAJOR de proceso, sin impacto y sin S-7.**
  - La CLI rechazó `sui start` porque `~/.sui/sui_config/` **no está vacío**. Es la barrera que diseñó D-20261030-07 (el `client.yaml` sin claves existe a propósito), y funcionó.
  - Con el directorio vacío o ausente, ese `sui start` habría corrido la génesis en el HOME real, con un keystore con claves: una violación directa de D2 (`~/.sui` sin claves para siempre). Además, el 9000 ajeno lo habría hecho fallar **después** de escribir las claves.
  - No lo subo a CRITICAL porque lo contuvo la barrera de diseño y la verificación posterior es completa (`stat`, `sha256sum`, `ls -la`, `ps`, `ss`).
- **R-12 es necesario, pero no alcanza tal como está** (N-4):
  1. **Pasarlo a §2 ya.** El riesgo es **mayor en TASK-4**, cuyo contenido son líneas de docs con `sui start …`, `suiup install sui@testnet-1.84.0` y `sui move update-deps` entre acentos graves. Un heredoc sin comillas ahí **instala** o **arranca** cosas. TASK-3 también escribe un reporte con comandos.
  2. **Barrera técnica de herramienta:** los reportes y las ediciones de docs se escriben **solo con las herramientas de escribir y editar archivos** del harness. Nada de heredoc, ni siquiera entrecomillado, para texto que contenga `sui`, `suiup` o acentos graves. Tampoco `sed -i`, `printf` ni `echo` para editar docs. El heredoc `<<'EOF'` es correcto, pero depende de no olvidar las comillas, que es justo el error que pasó.
  3. **Verificación de `~/.sui` entre pasos, no solo al inicio y al final del task:** la guarda R-2 (`stat`, `ls -la` y `sha256sum` de `client.yaml`) se corre también después de escribir cada reporte o borrador y después de cerrar cada génesis. Así un incidente así se detecta en el paso en que ocurre.
  4. **Mantener el `grep -c 'command not found'`** sobre el borrador. Sumar `/usr/bin/grep -nE 'Cannot run genesis|sui_config|Address already in use'`, que son los rastros típicos de una ejecución accidental.
- **¿Mencionarlo en el PR?** Sí, una línea en "Seguridad": "Incidente de proceso en TASK-2a: un `sui start` accidental (heredoc sin comillas) con el HOME real, rechazado por la CLI; `~/.sui` verificado sin cambios; regla R-12. Detalle en `REPORTES_TOOLCHAIN_142.md`". Es transparencia sin datos sensibles.

## 6. Seguridad general del delta

- **Nada prohibido habilitado.**
  - Los `suic` siguen solo dentro de la localnet aislada y después de `smoke_guard`.
  - El arranque mantiene `smoke_guard_pre` + `exec "$SUI" start --network.config "$SUI_CONFIG_DIR"`: no es `sui start` a secas, y no usa `--force-regenesis`, faucet ni `new-address`.
  - Cierre con `kill` del PID (sin `pkill`).
  - El contenedor ajeno del 9000 **no se toca**: solo se lo registra con `ss`; no hay ningún comando de Docker sobre él.
  - Sin Chrome.
- **Direcciones y rutas personales:** ninguna. El handoff tampoco nombra el contenedor ajeno, y conviene seguir así en los docs de TASK-4: "un servicio de otro proyecto" alcanza.
- **Palabras de cierre:**
  - El grep de D-20261119-01 da una sola coincidencia, la palabra de cierre de #75 en 671, dentro del cuerpo del PR.
  - Los commits nuevos (617-620) llevan `Refs #75`.
  - "Relacionado: #73" (672) no tiene palabra de cierre.

---

## Hallazgos (v1.3)

| # | Sev. | Líneas | Problema | Escenario de falla | Corrección |
|---|---|---|---|---|---|
| N-1 | 🟡 MINOR (corregir antes de 2b) | 407, 617-620 | 2.4.7 pide un "commit propio de este paso, antes de abrir ninguna génesis", pero por R-1 el DEV no commitea, y no hay ningún punto de control definido a mitad del task. Además, `capture-tx-fixtures.mjs` y `capture-house-fixtures.mjs` reciben cambios de los **dos** commits: comentarios en (a) (2.4.4) y texto de versión en (b) (2.5). Si el DEV hace los dos y el orquestador quiere separarlos al final, necesita staging por hunk, y `git add -p` es interactivo y no está soportado en este entorno. | El DEV sigue de largo hasta las génesis sin commit (y los dos commits quedan imposibles de separar limpiamente), o se detiene sin un reporte definido. | Hacer de 2.4 un **punto de control formal**: el DEV termina 2.4.1-2.4.6, deja `REPORTE_TOOLCHAIN_142_TASK-2b-guarda.txt` y **se detiene**; el MID revisa; el orquestador hace el commit (a); recién después el DEV sigue con 2.5. Escribirlo en 2.4.7 y en "Al terminar" de 2b. |
| N-2 | 🟡 MINOR (corregir antes de 2b) | 462, 493, 499, 605, 658 | El conteo nuevo de `app` solo cambió en 3.1 (469). Siguen con "1156 en 65" el contexto de TASK-3 (462), "Tests obligatorios" (493, "sin delta"), **el DoD de TASK-3** (499), el snippet de STATUS (605) y la tabla de gates del PR (658, `<igual>`). | El MID de TASK-3 marca como incumplido un DoD que dice "1156 en 65" cuando el resultado correcto es 1156 + N en 66, o el PR publica una tabla falsa. | En todos esos lugares: "1156 + N en 66 (N = tests de `localnet-guard.test.ts`, informado en 2b)". Dejar 1156/65 solo como línea base de TASK-1 (§0, 89). |
| N-3 | 🟡 MINOR | 637-672, 622-623 | El cuerpo del PR y el commit de TASK-4 no se actualizaron con la v1.3. A "Qué cambia" le falta la guarda, el `.d.mts` y el test nuevo. A "Docs" le faltan `app/README.md` (`:328`, `:840`) y `agents.md` §3 (puerto y `smoke_guard`). En "Gates" vale N-2. En "Seguridad" faltan la guarda ("solo loopback, puerto 1024-65535, exit 2 antes de pedir nada") y la línea del incidente (§5). En "Pendientes" falta que `networks.ts:11` sigue fijo en el 9000 para el navegador (#73 TASK-8 o un issue). El cuerpo del commit de TASK-4 no menciona `app/README.md` ni la documentación del puerto. | El PR describe menos de lo que cambia, en un repo público, y el revisor de integración tiene que reconstruirlo desde los reportes. | Agregar esos puntos al cuerpo del PR y al commit 5. |
| N-4 | 🟡 MINOR | 422, 444 | R-12 y S-10 viven dentro de TASK-2b, pero el riesgo de R-12 es transversal y es **mayor en TASK-4** (docs llenos de comandos `sui` y `suiup` entre acentos graves). Como está escrito, R-12 permite el heredoc entrecomillado, que depende de no olvidar las comillas, y la guarda de `~/.sui` se corre solo al inicio y al final del task. | Un TASK-4 que edita docs con un heredoc o `sed` ejecuta `suiup install …` o `sui start` en el HOME real. | Mover R-12 a §2 (todos los tasks) y S-10 a §3, con los cuatro puntos de §5: solo las herramientas de escribir y editar archivos para reportes y docs (sin heredoc ni `sed`/`printf`/`echo` para texto con `sui`, `suiup` o acentos graves); la guarda R-2 de `~/.sui` después de cada reporte o borrador y de cada cierre de génesis; y los `grep` de rastros. |
| N-5 | 🔵 SUG | 400-401 | A la lista hostil del test le faltan dos casos que ejercitan ramas distintas: `http://127.0.0.1:99999` (la regex lo admite y solo lo rechaza el rango; hoy esa rama la cubre `:65536`, pero conviene tener el extremo de 5 dígitos) y valores no `string` coercibles, como `['http://127.0.0.1:19000']` o `new String('http://127.0.0.1:19000')`. Verificado: `RegExp.test` los convierte y da `true`, así que solo el `typeof` los frena. | Una implementación que olvide el `typeof` pasa los tests actuales. | Sumar esos tres casos a "rechazadas". Opcional: `// @vitest-environment node` al principio del test (no usa el DOM). |
| N-6 | 🔵 SUG | 412-418, 532 | El `19000` está escrito a mano en `smoke_guard`, en cada `--url` y (en TASK-4) en la plantilla de `agents.md`. | Un puerto distinto en una de las tres partes deja `smoke_guard` en verde y la captura apuntando a otro lado (que `assertDeployment` igual frenaría). | En `env.sh`: `RPC_URL=http://127.0.0.1:19000`, usado por `smoke_guard` y por las capturas (`smoke_guard && "$NODE" app/scripts/capture-…mjs --url "$RPC_URL"`, con el prefijo `smoke_guard` también en las llamadas de Node). En la plantilla de `agents.md` (TASK-4), un `<puerto>` parametrizado, no el 19000. Si por error se corre una captura sin `--url`, se declara (habría hecho un pedido al servicio ajeno). |
| N-7 | 🔵 SUG | 398 | Con `skipLibCheck: true` y sin `checkJs`, nadie verifica que el `.d.mts` coincida con el `.mjs`. | El `.d.mts` se desactualiza en un cambio futuro de la guarda y el typecheck no lo detecta. | Una línea en el `.d.mts` y en el JSDoc de la guarda: "mantener en sincronía con `localnet-guard.mjs`; los tests de `src/test/localnet-guard.test.ts` son la verificación". |
| N-8 | 🔵 SUG | 8, 376 | El encabezado "Cambios de v1.2 a v1.3 (… pendiente de la revisión del MAYOR)" y la dependencia de 2b ("y de que el MAYOR apruebe…") quedan desactualizados con esta revisión. | — | En la v1.3.1: "aprobado por el MAYOR (ronda 3), con N-1..N-4 aplicados". |

## Dictamen final

- **El DEV puede ejecutar TASK-2b con la v1.3, después de que el MID aplique N-1 y N-2.** N-3 y N-4 conviene meterlos en la misma edición: N-4 antes de TASK-3 y TASK-4 a más tardar.
- Los SUG quedan a criterio del MID.
- No hace falta otra ronda del MAYOR: alcanza con que el orquestador verifique con `diff` que N-1..N-4 están aplicados.
- **El diseño de seguridad de la guarda queda aprobado tal como está especificado** (regex anclada + `typeof` + rango 1024-65535, valor por defecto sin cambios, `exit 2` antes de cualquier pedido, `assertDeployment` como segunda barrera).

---

### §R-6 (`/usr/bin/grep -nE`)

**Sobre el handoff v1.3:**
- `[0-9a-fA-F]{40,64}`: 6 valores distintos (líneas 84, 128, 129, 133, 144, 177, 239, 249, 258, 263, 295, 341, 527, 528 y 633), todos públicos:
  - `05ad86a3…` y `e6f43880…`: commits del framework de `MystenLabs/sui`, PV 140 y PV 142;
  - `9dc25070…`: commit del tag `testnet-v1.84.0`;
  - `0f006fb4…`: SHA-256 del tgz del release 1.84.0;
  - `e5116805…` y `29e1beb9…`: SHA-256 de la 1.83.0, de `ci.yml` en `88dd53b`.
- `0x[0-9a-fA-F]{8,}`: 0. El `0x7f.0.0.1` de la lista hostil no coincide.
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: solo la línea 163, que cita el patrón en R-6.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0. Sin direcciones de cuenta.
- `evil.com` (400, 406): son URLs de prueba de la lista hostil, no datos.

**Sobre esta revisión:**
- Grep 1: 0. Los hashes van abreviados con `…`.
- Grep 2: 0. Solo aparece `0x7f.0.0.1`, que no coincide.
- Grep 3: 1. Es la línea de este §R-6 que cita el propio patrón al clasificar el handoff; no hay contenido sensible.
- Grep 4: 0.
- No nombra el contenedor ajeno ni rutas personales. Palabras de cierre con número: 0 (la de #75 se nombra sin la palabra).
