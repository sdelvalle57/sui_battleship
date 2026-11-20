APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS. Re-revisión del MAYOR (ronda 2) de `documents/HANDOFF_TOOLCHAIN_142.md` v1.1 (#75, PRE-1)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>` de #75, branch `feature/issue-75-toolchain-1840`, HEAD `88dd53b`. Handoff v1.1 sin commitear, 618 líneas. Revisé solo el delta contra `REVISION_HANDOFF_TOOLCHAIN_142_v1.md`.
- **Resumen:**
  - Los **dos MAJOR están resueltos**.
    - H-1: el orden de 1.2 es correcto. Además verifiqué en el código de `suiup` v0.1.1 que `install`, `show` y `default get/set` no lanzan ningún proceso `sui`.
    - H-2: los dos literales están en TASK-1, con 104 y `check` en el DoD. No queda ningún otro test que dependa de `ci.yml` o del lock.
  - H-4..H-12 resueltos. **H-3 queda PARCIAL**: el `shape()` propuesto no ve hojas `null` ni `false`.
  - Hay **5 MINOR nuevos y 2 SUG**. Ninguno bloquea.
  - **TASK-1 puede pasar al DEV.** N-1 y N-4 son ediciones de un minuto en TASK-1 y conviene meterlas antes de entregarlo. N-2 y N-3 van antes de TASK-2a; N-5, antes de TASK-4.
- **No ejecuté** gates, `sui` ni `suiup`, y no toqué `~/.sui`.
  - Lo que sí hice: lecturas del worktree, `jq` de solo lectura sobre las fixtures y un JSON sintético en el scratchpad (ya borrado), `ls` del cache de `suiup` (solo nombres) y `gh api` públicos al código de `suiup` v0.1.1.

---

## 1. Resolución de H-1..H-12

| # | Estado | Dónde (v1.1) | Verificación |
|---|---|---|---|
| H-1 (MAJOR) | **RESUELTO** | 217-223, S-3 154, DoD 268, plantilla 514 | Orden real de 1.2: (1) `suiup install`, `suiup show` y `stat`/`ls -la`; (2) `sha256sum` del tgz del cache = digest del release; (3) `tar -xzf … ./sui` en un directorio nuevo + `sha256sum` (no se ejecuta); (4) los tres `sha256sum` (instalado, copia de `suiup`, extraído); (5) **recién ahí** `printf 'n\n' \| sui --version`. Hasta el paso 5 ningún comando invoca `sui`. Lo confirmé en la fuente de `suiup` v0.1.1 (`gh api`, lectura pública): `handlers/install.rs` solo lanza `rustc`/`cargo` (`check_command_installed`, `:96-97`, y solo en el camino nightly). `handlers/show.rs`, `commands/default/get.rs`, `handlers/download.rs`, `handlers/mod.rs` y `handlers/release.rs` no lanzan ningún proceso; `get.rs` solo lee el JSON de defaults. El rollback `suiup default set sui@testnet-1.83.0`, "no ejecutar el binario nuevo" y "parar" están en 217 y en S-3 (154), y S-3 cubre también "se ejecutó antes de verificar". 1.0 (187-188) usa `sha256sum` sin ejecutar, y 1.1 (V-7) va antes de instalar. El nombre del tgz en el cache sigue el patrón de la 1.83 (`ls` del cache: `sui-testnet-v1.83.0-ubuntu-x86_64.tgz`). |
| H-2 (MAJOR) | **RESUELTO** (con N-1) | 180, 238, 240-253, Tocar 256, DoD 271, 2a 289 | Literales verificados en el worktree: `deployment.test.mjs:38` = `LOCK_FRAMEWORK_REV` (`05ad86a3…`, PV 140), que se compara con el `Move.lock` real en `:324-326`; `publish.test.mjs:561-577` es el test `checkCliVersion` contra `CI_YAML` (`:49`). El rango "Tocar `:562-571`" cubre todos los literales que dependen de `ci.yml`; `:574` usa un yaml mínimo propio y no depende de él. El grep de `1.83.0`, `16d2dc1e05ed`, `05ad86a3`, `LOCK_FRAMEWORK_REV`, `CI_YAML`, `ci.yml` y `Move.lock` en `contracts/scripts/*.test.mjs` y en `app/` no deja ningún otro test que lea `ci.yml` o el lock. Lo que queda son valores de las fixtures de la 1.83, que siguen siendo coherentes entre sí tras TASK-1: `deployment.test.mjs:36, :249`, `publish.test.mjs:59` y un caso sintético en `publish.test.mjs:583`. `app/src/sui/config.test.ts:27` (`1.83.0-16d2dc1e05ed`) es un deployment sintético de testnet que no lee `ci.yml`. `commandCheck` (`publish.mjs:798-810`) solo cruza `deployments/*.json` con `Published.toml`, así que `check` = `1 despliegue(s)` tras TASK-1. **El commit de TASK-1 no queda rojo.** Los números de línea dentro de 1.5 están corridos en uno: ver N-1. |
| H-3 | **PARCIAL** | 293-299, 2b 360, 370 | `arrays()` es correcta: probada sobre `localnet-publish.json` (14 arrays) y `game-tx.localnet.json` (36), da la longitud por ruta. `shape()` detecta `"1000"` → `1000` y `null` → objeto con claves. **No ve** hojas `null` ni `false` (ver N-2). En las fixtures actuales hay 1 + 4 + 104 + 15 hojas `null` y 1 + 4 + 3 `false` que quedan fuera de la comparación. |
| H-4 | **RESUELTO** | 411-416, DoD 442 | `jq` + tabla ruta → viejo → nuevo; prohibido tocar matchers, aserciones o fórmulas; los derivados por fórmula (`networkCost`, `execution.test.ts:283`) están permitidos; el cambio de gas es explícito para #73 y `GAME_STORAGE_DEPOSIT_MIST` no se toca. |
| H-5 | **RESUELTO** (con N-5) | 188, 223, 467, 483, 537 | `sha256sum` de `sui-v1.83.0` en 1.0 y 1.2.6. En STATUS, los dos SHA-256 completos de la 1.83.0: comparados contra las líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`, **coinciden** (`e5116805…`, `29e1beb9…`). Problemas de redacción y de sintaxis: N-5. |
| H-6 | **RESUELTO** | 421, 425, 441, 517, 539, 582 | "No concluyente" si el servidor no es ≥ 1.84 o no se sabe, sin decir "reconocido"; dos issues de seguimiento abiertos por el orquestador. |
| H-7 | **RESUELTO** | 510, 514-518 | `git diff --stat`/`status` y conteos de Docker en todos los tasks; en TASK-1, `suiup show`, los 4 hashes + el de la 1.83.0, el diff del lock, actionlint y `du -s ~/.move`; en TASK-2a, `cmp`/`jq empty` y `du`. |
| H-8 | **RESUELTO** | 135 | `sui move build/test/update-deps -e testnet` permitidos, con `printf`. |
| H-9 | **RESUELTO** | 132 | `ls -la` + `sha256sum` opcional de `client.yaml`; S-7 incluye el hash. |
| H-10 | **RESUELTO** (con N-6) | 21, 86, 280-390 | Ver §2. |
| H-11 | **RESUELTO** | 611 | Declarado. |
| H-12 | **RESUELTO** | 23, 600 | En "Pendientes" del PR; `ci.yml:246, 250-251` verificadas (textos "pre-vuelo de #8"). |

## 2. TASK-2a / TASK-2b (H-10)

- **Dependencias correctas y lineales:** TASK-1 (commiteado, 282) → 2a (351) → 2b (396) → 3 → 4 (453). 2a deja el árbol de `scripts/` cerrado, y 2b lo re-verifica (104 y `check`, 377) sin tocarlo (374).
- **Numeración coherente:** 2.0-2.3 en 2a y 2.4-2.7 en 2b. 2b reutiliza 2.0 por referencia (360, 366).
- **Una génesis por vez:** 2a usa solo G-A y la cierra en 2.3, con R-4, que incluye `stat`/`ls -la` de `~/.sui` contra la línea base. En 2b, "una a la vez" (351) y R-4 ("una localnet a la vez", 134) cubren G-B y G-C. Pero el texto pone el cierre de **cada** génesis en 2.7, **después** de describir G-C (2.6): ver N-6.
- **Tamaño de sesión:** 2a (una génesis, 4 fixtures, literales) entra en una sesión. 2b (dos génesis, unas 20 transacciones, 3 capturas × 2) es el más largo, pero es acotado. Aceptable.

## 3. Hallazgos nuevos (v1.1)

| # | Sev. | Líneas | Problema | Escenario de falla | Corrección |
|---|---|---|---|---|---|
| N-1 | 🟡 MINOR | 238 | En 1.5, las líneas internas del test están corridas en uno. El caso "igual a CI" está en `publish.test.mjs:562-563` (no `:563-564`), y el "localnet, otra versión" en `:570-571` (no `:569-571`). El testnet "otra versión" sí está en `:567`. El rango total `:562-571` (180, 256) es correcto. | Bajo: el DEV encuentra los literales por su contenido. Pero la cita es inexacta en el task que fija qué líneas puede tocar (R-10). | `:562-563` y `:570-571`. |
| N-2 | 🟡 MINOR | 296 | `shape()` usa `paths(scalars)`. En jq, `paths(f)` filtra con `select(f)`, y para `null` y `false` el filtro devuelve un valor falso, así que **esas hojas no aparecen**. Tampoco aparecen `{}` y `[]` vacíos (estos últimos sí salen en `arrays()`). Probado sobre un JSON sintético: `{"c":null,"e":false,"d":{}}` produce cero líneas. | La 1.84 cambia un campo `null` → ausente, `false` → `null` o `null` → `false` (p. ej. en `effects` de `game-tx`, que tiene 104 hojas `null`). La tabla dice "forma igual". | Usar **todos** los nodos: `jq -r 'paths as $p \| ($p \| map(if type=="number" then "*" else . end \| tostring) \| join(".")) + " : " + (getpath($p) \| type)' "$1" \| sort -u`. Probada: lista `c : null`, `e : boolean`, `d : object` y `a : array`. Corregir también el paréntesis de 299. |
| N-3 | 🟡 MINOR | 289, 323, 328 | `deployment.test.mjs:147` (`assert.equal(result.gasEstimate, 47_246_000n)`) es un literal derivado del fixture del dry run (gas estimado de la publicación) y **no está en la lista de 2.2**. Con la PV 142 y el bytecode del compilador 1.84, el gas puede cambiar. También falta el comentario de `deployment.test.mjs:1` ("salidas reales de la Sui CLI 1.83.0"). (Seguramente ya estaba en la v1; no es una regresión, pero el H-2 de la v1 no lo cubría.) | `node --test` da rojo en `:147`. El DEV, por R-10, para o lo arregla como desviación. | Agregar `:147` (y el comentario de `:1`) a 289 y 323. Mismo criterio que H-4: el valor sale del fixture por `jq` (`gasEstimate` = cómputo + storage − rebate del dry run, la fórmula de `parseDryRunOutput`), y si el gas cambia se dice que es dato para #73. |
| N-4 | 🟡 MINOR | 229-231, 246, 147 | 1.6 hace `cmp Move.lock <lock tras update-deps>` "copia hecha justo después del repin", pero **ningún paso crea esa copia**: 1.4 solo guarda `Move.lock.antes`. Además, R-11 (147) pide cerrar cada gate con `git diff --exit-code -- Move.lock`, que **falla por construcción** dentro de TASK-1 (el lock repineado todavía no está commiteado). | El DEV improvisa la copia o lee R-11 contra 1.6 como una contradicción. | En 1.4, después del `diff`: `cp Move.lock <scratchpad>/Move.lock.despues`. En 1.6, `cmp Move.lock <scratchpad>/Move.lock.despues`. En R-11: "dentro de TASK-1, `cmp` contra esa copia; desde TASK-2a (lock commiteado), `git diff --exit-code -- Move.lock`". |
| N-5 | 🟡 MINOR | 467, 483, 537 | (a) `git show 88dd53b:.github/workflows/ci.yml:24-25` (537) no es una sintaxis válida: git lo toma como una ruta que no existe, y es justo la referencia que va a STATUS para V-16 de #73. (b) En 467, "y/o la referencia exacta …" deja una elección abierta (DoD 483: "o") y le falta el corte antes de `"Framework" →`, así que el ítem de Framework queda pegado al histórico. | En #73, `git show …:24-25` da "path does not exist". El DEV de TASK-4 duda entre poner los hashes o la referencia. | (a) "líneas 24-25 de `git show 88dd53b:.github/workflows/ci.yml`". (b) Fijar **ambos** (los hashes completos en la fila "CI" y la referencia), y cortar la oración antes de "Framework". |
| N-6 | 🔵 SUG | 366-370 | En 2b, el cierre de G-B está escrito en 2.7, después de 2.6 (G-C). R-4 ya obliga a "una a la vez" (y el puerto 9000 lo impone), pero el orden del texto invita a cerrar todo al final. | — | En 2.5, al final: "cerrar G-B con 2.7 antes de 2.6"; en 2.6: "cerrar G-C con 2.7". |
| N-7 | 🔵 SUG | 289 | El contexto de 2a lista `publish.test.mjs:574` como literal del fixture, pero 2.2 (323) no lo incluye. Y está bien que no lo incluya: es el caso "ci.yml sin SUI_VERSION", con un yaml propio, y no depende del fixture. | — | Sacar `:574` de 289. |

## 4. Regresiones y reglas (barrido de la v1.1)

- **Citas `archivo:línea` (muestra amplia, todas correctas salvo N-1 y N-5a):**
  - `ci.yml:18-25, 44-45, 55-63, 94-98, 104, 218-223, 242-251`; `deployment.test.mjs:28-38, 147-153, 241-252, 286, 324-326`; `publish.test.mjs:49, 51-61, 498, 561-577, 694-700, 724-728`; `publish.mjs:109, 184-188, 765-768, 798-810`.
  - `agents.md:75-79, 81-85, 164-166, 176, 182-185, 194, 245, 302-305, 382`; `contracts/README.md:15, 375, 410-418, 430, 441-443, 454, 464-468, 486-501, 517-519, 535, 552, 605, 723, 816, 851, 909-912`; STATUS `:27-28, 32, 51-53, 146, 158-159`.
  - `eventScan.ts:12, 36, 104, 117, 130-140`; `execution.test.ts:281-283`; `capture-read/tx/house-fixtures.mjs:169/292/267` y `:280, :301, :272`; `app/README.md:219-220, 227-231`.
- **Nada prohibido habilitado.**
  - `sui client`/`keytool` contra testnet, publish/upgrade, faucet, `new-address`, `--force-regenesis`, `pkill`, `suiup remove/cleanup` y `docker system prune` aparecen **solo como prohibiciones** (80, 93, 134, 135, 144, 601).
  - `suic` solo dentro de la localnet aislada (2.1, 2.5) y `publish.mjs` solo con `--network localnet`, como en la v1.
  - El nuevo permiso de R-5 se limita a `sui move build/test/update-deps -e testnet` con `printf`.
  - Chrome: no se usa (R-7).
  - Docker: por línea base e ID (R-8).
- **Direcciones y rutas personales:** ninguna. Solo placeholders (`<repo>`, `<HOME real>`, `<SMOKE_DIR>`, `<scratchpad>`) y rutas genéricas con `~`.
- **Palabras de cierre:** el grep de D-20261119-01 sobre el handoff da **una sola coincidencia**, la de 603, dentro del cuerpo del PR.
  - Los commits llevan "(#75)" en el asunto y `Refs #75` en el cuerpo; el 0 y el 6 no llevan número de cierre.
  - "Relacionado: #73 (este PR no lo cierra)" (604) no tiene palabra de cierre.
  - La línea 544 nombra `Closes/Fixes/Resolves #N` con barras y sin número, así que no dispara el patrón.

## 5. Ejecutabilidad

- **TASK-1:** el DEV puede arrancarlo con este handoff sin decisiones de diseño, y el MID puede revisarlo con la plantilla (514).
  - N-1 y N-4 conviene corregirlos antes de entregarlo; son dos ediciones puntuales.
  - Si no se corrigen, no bloquean: el DEV encuentra las líneas por su contenido y la copia del lock es obvia. El costo es una desviación declarada.
- **TASK-2a:** necesita N-2 y N-3 antes de entregarse; si no, la tabla de forma es incompleta o aparece un rojo no listado.
- **TASK-4:** necesita N-5.
- **Nada de esto bloquea el handoff.** Los MINOR pueden entrar en una v1.2 sin una nueva ronda del MAYOR: alcanza con que el orquestador verifique los cinco cambios con un `diff`.

---

### §R-6 (`/usr/bin/grep -nE`)

**Sobre el handoff v1.1:**
- `[0-9a-fA-F]{40,64}`: 6 valores, todos públicos.
  - `05ad86a3…` (60) y `e6f43880…` (109 y otras): commits del framework de `MystenLabs/sui`, PV 140 y PV 142.
  - `9dc25070…` (105): commit del tag `testnet-v1.84.0`.
  - `0f006fb4…` (104 y otras): SHA-256 del tgz del release 1.84.0.
  - `e5116805…` y `29e1beb9…` (467): SHA-256 del tgz y del binario de la 1.83.0, públicos en `ci.yml` de `88dd53b`.
- `0x[0-9a-fA-F]{8,}`: 0. (El patrón literal `0x[0-9a-f]{64}` de R-6, en 142, no coincide.)
- `suiprivkey|mnemonic|seed phrase|/home/|/Users/`: solo la línea 139, que cita el patrón en R-6.
- `[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}`: 0. No hay direcciones de cuenta.

**Sobre esta revisión:**
- Grep 1: 0. Los hashes y commits van abreviados con `…`; el `47_246_000n` de N-3 no es hex de 40.
- Grep 2: 0.
- Grep 3: 1. Es la línea del §R-6 que cita el propio patrón al clasificar el handoff; no hay contenido sensible.
- Grep 4: 0.
- Palabras de cierre con número: 0. La de #75 se nombra sin la palabra.
