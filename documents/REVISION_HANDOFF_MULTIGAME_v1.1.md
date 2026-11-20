APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS — re-revisión del MAYOR (ronda 2, cierre) de `documents/HANDOFF_MULTIGAME.md` v1.1 (#73)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>` de #73, branch `feature/issue-73-multigame`, HEAD `edfcdc2`; handoff v1.1 sin commitear, 714 líneas; plan v1.3.1 sin cambios respecto de la ronda anterior. Ronda anterior: v1, APPROVE CON CAMBIOS (2 MAJOR, 8 MINOR, 3 SUG).
- **Resultado:** **H-1 (MAJOR) resuelto.** Seguí el flujo paso a paso y no queda ningún camino por el que el 1.83.0 se ejecute sin el prefijo aislado o antes de verificarse, ni por el que un agente intente publicar en testnet. De los otros once, nueve resueltos. **H-2 queda PARCIAL:** el procedimiento está bien, pero su control (el grep) **ya coincide hoy** con código existente. H-5 y H-7 quedan parciales.
- **Nuevos:** 1 MAJOR y 2 MINOR, que afectan solo a TASK-2 (la sonda) y a TASK-5/7a/7b/8.
- **Dictamen:**
  - **Listos para ejecutar** (cuando PRE-1 esté mergeado y la branch integre `master`): PRE-1 → TASK-1a → TASK-1b → TASK-3 → TASK-4, tal como están.
  - **TASK-2**, con R2-3 corregido en su handoff.
  - **TASK-2b** queda listo una vez cerrado TASK-2.
  - **TASK-5, 7a, 7b y 8:** esperan una v1.2 con R2-1 y R2-2. Es un cambio chico y no toca decisiones.

---

## 1. Resolución de la ronda 1

| Hallazgo | Estado | Dónde (v1.1) |
|---|---|---|
| H-1 (MAJOR) binario 1.83.0 | **RESUELTO** | Receta V1 (64-83): verificación del tgz y del binario contra `git show 88dd53b:.github/workflows/ci.yml` **antes** de ejecutar (68); `SUI_V1`/`suic_v1`/`smoke_guard_v1` (69-80); prefijo obligatorio, también para `move build` (81); STOP si el 1.83.0 no habla con la red (82). Aplicada en TASK-1a (225-226), TASK-1b (268, con re-verificación al reusar), TASK-5 (490, 497) y el diff de bytecode (227). Segunda fuente verificada: `git show db5442c:documents/HANDOFF_TOOLCHAIN_142.md`, TASK-4 punto 2, registra en STATUS los dos SHA-256 históricos (tgz `e5116805…`, binario `29e1beb9…`), iguales a `ci.yml:24-25` de `88dd53b`. |
| H-2 (MAJOR) sandbox v3 | **PARCIAL** | Procedimiento correcto (490-494): `git archive` fuera del worktree, id 8 sin redefinir los existentes, gracia propia, fixture aparte `duel-clock` con `_meta.sandbox`, regla de formato genérico en la app (551-552) con test (563). **El control falla:** ver R2-1. |
| H-3 gas y R.7 | RESUELTO | TASK-5 paso 5 y smoke 6; DoD de TASK-3 con el grep pegado |
| H-4 bordes de la gracia | RESUELTO | TASK-2b (382) |
| H-5 sondas de `Collected` | **PARCIAL** | TASK-1b (275) bien; la de TASK-2 (339) compila una copia **sin** el `duel.move` real: ver R2-3 |
| H-6 DECISIONES/ESTANDARES/STATUS | RESUELTO | TASK-8 (§3 y §4): el DEV redacta, el orquestador aplica |
| H-7 variante B de `upgrade` | **PARCIAL** | Especificada y con test en TASK-4. Falta de dónde salen los campos base del v1: ver R2-2 |
| H-8 §H | RESUELTO | §H: smoke testnet redactado antes de la compuerta, TASK-9 antes de la integración con build local, autorización registrada; §G punto 14 |
| H-9 citas | RESUELTO | 412 (`game_tests.move:30-38`) y TASK-4 (`publish.mjs:102-117`), verificadas |
| H-10 conservación del reembolso | RESUELTO | TASK-2b (382), balances por actor |
| H-11 partición | RESUELTO | 1a/1b y 7a/7b; orden y dependencias de datos (106-112) coherentes con el contexto de cada task |
| H-12 `self_transfer` | RESUELTO | R.4 nota (g) (177) |
| H-13 parche del navegador | RESUELTO | TASK-8, smoke 7: copia con `git archive` + `patch -p1`, nunca en el worktree ni con `stash` |

---

## 2. Hallazgos nuevos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| R2-1 | 🟠 MAJOR | Control de H-2 inefectivo; C-9 | 532, 563, 670 | El grep de control `/usr/bin/grep -rn "15_000\|15000\|testgame" contracts/sources app/src` "sin coincidencias" **ya da 4 coincidencias hoy en `master`**: `app/src/sui/gameDetail.ts:8` (`GAME_REFETCH_MS = 15_000`) y `gameDetail.test.ts:93, 94, 98`. TASK-7a además pide "en `app/src` no hay literales de 15 000" (563). | El DoD de TASK-5, el de TASK-7a y el punto 11 de §G no se pueden cumplir. O el DEV toca `GAME_REFETCH_MS` (fuera de alcance) para que el grep dé cero, o el control se ignora "porque ya fallaba" y deja de detectar una fuga real. | Cambiar el control por uno que distinga: (1) un **marcador único** en todo lo del sandbox (p. ej. `SANDBOX_` en los nombres de constantes y el módulo `testgame`), con el grep sobre ese marcador y `testgame`; (2) el grep aplicado **solo a las líneas agregadas** del ciclo: `git diff <merge-base con master>..HEAD -U0 -- contracts/sources app/src \| /usr/bin/grep '^+' \| /usr/bin/grep -n "SANDBOX\|testgame"` = 0; (3) declarar como **barrera funcional** (la que de verdad impide la fuga) los tests ya pedidos: `test_create_rejects_invalid_control` con el id 8 (`EBadControl`) y los bordes de la gracia en 604 800 000 ms de TASK-2b. Si el id 8 o la gracia de 15 s llegaran a `duel.move`, esos tests fallan. En 563, quitar "no hay literales de 15 000" y pedir solo que el valor del sandbox se lea de la fixture. **Momento de la medición** (aceptando el cambio del MID a "solo los archivos nuevos esperados"): al cierre de TASK-5, **después** de borrar el sandbox y cerrar la localnet y **antes** de escribir el reporte, con `git status --porcelain --untracked-files=all` y, como `git status` no muestra lo ignorado, `test ! -e contracts/deployments/localnet.json` y `! compgen -G 'contracts/Pub.*.toml'`. |
| R2-2 | 🟡 MINOR | Ejecutabilidad (TASK-5, 7b, 8), ARQ-6 | 497, 599, 639, TASK-4 (447-455) | La "variante B" de `agents.md` §3 (`publish.mjs publish` sin `--out`) publica el paquete del **worktree** (`CONTRACTS_DIR` = `<repo>/contracts`, `publish.mjs:33`), no el árbol `26f2676`, y con `$SUI` (1.84), no con el 1.83.0. Y `upgrade` en variante B necesita los campos base del v1 (`houseId`, `houseCapId`, `publishTxDigest`, `sourceCommit`…), que el pubfile no trae. El handoff no dice cómo se registra en `contracts/deployments/localnet.json` un v1 publicado con `suic_v1 test-publish`. | TASK-5 paso 1 se contradice ("Receta V1 desde `26f2676`" y "variante B según `agents.md` §3"). Un DEV que siga la variante B publica la v2 como v1: no hay partidas viejas, no hay upgrade y, con `packageVersion` 1, la app no muestra la fuente nueva. Las fixtures salen de un escenario que no es el de testnet. | Receta única para TASK-5, 7b y 8: (1) `suic_v1 --json test-publish --build-env testnet --pubfile-path "$SMOKE_DIR/Pub.v1.toml" > "$SMOKE_DIR/v1-publish.json"` desde `<SMOKE_DIR>/v1/contracts` (Receta V1); (2) `"$NODE" scripts/publish.mjs record --network localnet --from "$SMOKE_DIR/v1-publish.json" --chain-id <corto> --source-commit <40 hex de 26f2676> --sui-cli-version 1.83.0-16d2dc1e05ed --framework-rev 05ad86a3e86c522deea116f80dc2bf2309a53363` (sin `--out`: escribe `contracts/deployments/localnet.json`; `record` ya existe, `publish.mjs:764-797`); (3) `publish.mjs upgrade --network localnet --pubfile-path "$SMOKE_DIR/Pub.v1.toml"` variante B. TASK-4 tiene que decir que `upgrade` **lee** el `deployments/<red>.json` existente para los campos base y aborta si falta, con su test. |
| R2-3 | 🟡 MINOR | H-5 (evidencia falsa positiva) | 339, 275 | La sonda de TASK-2 se arma con `git archive HEAD contracts \| tar -x`. Pero en TASK-2 el `duel.move` real todavía **no está commiteado** (lo commitea el orquestador después de la revisión del MID), así que la copia no lo tiene: el módulo de prueba "no compila" porque `duel` no existe, no por las abilities. Pasa algo parecido en TASK-1b si el error del build no se mira. | El reporte trae "no compila" como evidencia de INV-D4 y en realidad no prueba nada. | En TASK-2: copiar el árbol **de trabajo** (`git archive HEAD contracts` y luego aplicar `git diff -- contracts` con `patch -p1`, como en TASK-8, o `cp -a` de `contracts/` sin `build/`). En TASK-1b y TASK-2: exigir el **mensaje de error esperado** (el de ability faltante, p. ej. valor sin `drop` sin usar o campo sin `store`), y un **control positivo**: la misma sonda sin la línea ofensiva compila. Pegar las dos salidas. |

---

## 3. Respuestas al encargo

**H-1, el flujo paso a paso:**
1. Descarga en un directorio nuevo (68), sin ejecutar nada.
2. `sha256sum` del tgz contra `88dd53b`.
3. Extracción a otro directorio y `sha256sum` del binario contra `88dd53b`.
4. Recién entonces el `env.sh` con `SUI_V1` (69-80).
5. Cada llamada con `env.sh` (`HOME` y `SUI_CONFIG_DIR` aislados), `smoke_guard` y `smoke_guard_v1` (`active-env` = localnet con **los dos** binarios).

El guard ejecuta el binario, pero ya verificado. `suic_v1 test-publish --build-env testnet` publica en el entorno activo (localnet): `--build-env` solo elige las dependencias. Si alguien olvidara el prefijo, `"$SUI_V1"` está vacío (sin `env.sh`) y la llamada falla sin tocar nada, la misma barrera que `agents.md` §3 da a `"$SUI"`. **No veo ningún camino por el que un agente intente publicar en testnet:** el camino testnet de `publish.mjs` exige además la confirmación por terminal.

**H-2, la pregunta del MID:**
- De acuerdo con "solo los archivos nuevos esperados", con el **momento** de la medición fijado y con los chequeos de ignorados de R2-1.
- **¿Puede llegar algo del sandbox al repo?** Por el worktree, no: el sandbox se arma con `git archive` en `<SMOKE_DIR>`. Por las fixtures, solo a `duel-clock` (marcada). A `duel.move` lo frenan los tests funcionales (id 8 rechazado y gracia de 7 días). El grep, tal como está, no sirve como control (R2-1).

**Regresiones de la v1.1:**
- Orden (106-112) correcto y completo hasta la integración y el merge.
- Las dependencias de datos coinciden con el contexto de cada task (TASK-2: V-1 de 1a y V-13 de 1b; TASK-2b: V-13 y V-15; TASK-4: salidas de 1a; TASK-7a: fixtures de TASK-5).
- No encontré acciones prohibidas habilitadas, direcciones de cuenta ni rutas personales.
- Commits solo con `(#73)`; C-11 sin palabras de cierre con número; ninguna en el handoff.
- La compuerta §G de 14 puntos cubre los 10 originales y suma H-2, H-3, H-5 y H-8. Queda completa con R2-1 (la evidencia del punto 11 pasa a la del marcador, la de las líneas agregadas y los tests funcionales) y R2-3 (salida esperada y control positivo en los puntos 4 y 13).

**Muestra de citas re-verificada:**
- `game_tests.move:30-38` (`SEED`/`RANDOM_SEEDS`);
- `publish.mjs:102-117` (`ALLOWED_SUI_VECTORS`), `:33` (`CONTRACTS_DIR`) y `:764-797` (`commandRecord`, opciones en `:61`);
- `gameDetail.ts:8` (la colisión de R2-1);
- `ci.yml:51-59` (extracción `./sui`).

**Orden y tamaño:** `PRE-1 → 1a → 1b → 2 → 2b → 3 → 4 → 5 → 7a → 7b → 8 → compuerta → autorización → 6 → 9 → integración → merge` es correcto. Con la partición, cada task cabe en una sesión. TASK-2 y TASK-2b siguen siendo los más largos (unos 60 y 45 tests): aceptable si el DEV reporta avance parcial ante un corte.

## 4. Dictamen
**APPROVE CON CAMBIOS.**
- **Nada bloquea el handoff completo**, y ninguna task de #73 arranca antes de que PRE-1 (#75) esté mergeado y la branch integre `master` por merge (C-2).
- **R2-3:** se corrige en el handoff de TASK-2 (y de paso en TASK-1b) antes de entregarlo.
- **R2-1 y R2-2:** bloquean **solo** los handoffs de TASK-5, 7a, 7b y 8. Pueden ir en una v1.2 que reviso solo en su delta.
- **TASK-1a, 1b, 3 y 4:** pueden ejecutarse tal como están.

---

### §R-6
**Sobre el handoff** (`/usr/bin/grep -nE`):
- Grep 1: 0.
- Grep 2: 0.
- Grep 3: solo la línea 57, que cita los patrones en C-7.
- Grep 4: 0.
- Palabras de cierre con número: 0.

**Sobre esta revisión:**
- Grep 1: el commit público del framework de la PV 140 (`05ad86a3…`), completo una sola vez, en R2-2.
- Greps 2-4: 0.
- Palabras de cierre: 0.
- No hay direcciones de cuenta ni rutas personales.
