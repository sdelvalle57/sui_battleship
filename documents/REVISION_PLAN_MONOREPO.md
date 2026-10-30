## Veredicto: APROBADO CON CAMBIOS (en la taxonomía del rol: REQUIERE CAMBIOS menores. No hay 🔴 BLOCKER ni 🟠 MAJOR. Los 8 MINOR se corrigen en una v1.1 del plan o directamente en el handoff, y la re-revisión se limita a ese delta. STOP-1/2/3 ya se pueden presentar al usuario.)

> Revisión MAYOR del plan `documents/PLAN_MONOREPO.md` **v1** (MID) · Issue #2 · Fecha: 2026-10-30
> Ref revisado: branch `feature/issue-2-monorepo` @ `c9536b4` (= `master`; el plan está sin commitear en el working tree).
> Ronda: primera (no hay hallazgos previos que cerrar).
> Fuentes contrastadas: `gh issue view 2` (y #8), `agents.md`, `documents/STATUS.md`, `DECISIONES.md` (D-03, -07, -08, -09),
> `ESTANDARES.md`, `FLUJO_AGENTES.md`, `documents/agentes/*.md`, `Move.toml`, `Move.lock`, `.gitignore`, `sources/**`,
> `tests/**`, `README.md`, y el ciclo anterior (`git show e1849c6:documents/{PLAN,REVISION_PLAN}_TOOLCHAIN.md`).
> Evidencia propia: código de la CLI en el tag `testnet-v1.83.0` (`16d2dc1`), leído con `gh api`; `--help` del binario
> instalado; GraphQL público de testnet; `nodejs/Release/schedule.json`; `npm view`; simulaciones en el scratchpad
> (clon desechable para los `git mv`/`git rm`, un repo vacío para el `.gitignore` y un directorio aparte para `npm install`).
> No corrí ningún gate (D-20261030-02). No hice nada que creara o leyera claves en `~/.sui/`. Todo `sui` llevó `printf 'n\n' |` delante y solo con `--help`.

### Resumen (3 líneas máx)

El plan es sólido: la HU está completa, el alcance coincide con el issue y la afirmación central es correcta (mover el paquete no repinea y el lock queda byte a byte idéntico), y la verifiqué en el código.
También es correcto no repinear en #2 (H13), pero hay que precisar el texto de T1/H13: la CLI nunca avisa ni repinea sola, y un repin con la CLI 1.83 deja de ser fiable si testnet pasa de la PV 140. Además, H13 necesita un dueño concreto (pre-vuelo de #8).
Los demás MINOR son de exactitud: un archivo que falta en la lista de STOP-3, el versionado de ESTANDARES, los artefactos del ciclo en las verificaciones, la trazabilidad del criterio de coverage y una referencia de línea.

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| 1 | 🟡 MINOR | PROY-20, PROY-18 | `PLAN_MONOREPO.md:135` (STOP-3 b, "5 archivos") y `:263-266` (TASK-2, menciones de Node) | La lista de menciones de la versión de Node omite `documents/agentes/AGENTE_DEV.md:17`: "Verifica … Node 22 (`nvm use 22`)". | El usuario elige (b). El prompt del DEV sigue ordenando `nvm use 22` al arrancar cada sesión, mientras `.nvmrc` = 26. En #9 los gates de la app corren con Node 22 y la CI (`node-version-file: .nvmrc`) con 26, así que el gate local deja de ser el de CI. | Agregar `AGENTE_DEV.md:17` a la lista. Mejor todavía, sea cual sea la opción: escribir `nvm use` sin versión (lee `.nvmrc`) en `AGENTE_DEV.md:17`, `agents.md:52` y `STATUS.md:28`, para que el número de versión viva solo en `.nvmrc`, PROY-17 y la fila Node de STATUS. |
| 2 | 🟡 MINOR | Versionado de ESTANDARES | `PLAN_MONOREPO.md:263-266` (`ESTANDARES.md:83`) vs `:355-357` ("No cambia la versión del documento") | Con STOP-3 ≠ 22 cambia el texto de una **regla** (PROY-17). Lo de "no cambia la versión" solo vale para la línea 7. | `ESTANDARES.md:3` sigue diciendo v1.1 con una regla distinta. En las próximas revisiones no queda claro contra qué versión se citó PROY-17. | Si STOP-3 ≠ (a), TASK-2 sube `ESTANDARES.md` a v1.2 (con fecha) y cita la decisión nueva en el encabezado. |
| 3 | 🟡 MINOR | PROY-11, exactitud de decisiones | `PLAN_MONOREPO.md:146-147` (T1: "repin solo al cambiar el manifest"), `:148-150` (texto de H13) y `:382-383` | La regla real es más estrecha, y H13 debe decirlo. El digest que dispara el repin cubre **solo las dependencias**: `[dependencies]` + `[dep-replacements]` + las implícitas `{system=…, override}` (`package/package_impl.rs:327-348`; la conversión en `dependency/combine.rs:208-221` lleva `dep_info`, `is_override`, `rename_from`, `modes`, `addresses` y `use_environment`, pero no lleva ruta ni SHA). Fuera de eso solo repinean: el digest de un manifest de dependencia que no coincide (`graph/builder.rs:122-129`), un `-e` de otro entorno (sección nueva) o `update-deps` (`cli/update_deps.rs:48-55`, `force_repin`). Editar `[package]` (`license`, `edition`, `authors`) **no** repinea. Y la CLI **nunca avisa** de que el lock va atrasado: con un lock válido, build/test ni consultan la PV (`system_deps` solo se llama al pinear, `sui_flavor.rs:179-199`), y publish/upgrade solo avisan si la PV máxima de la CLI + 2 < la PV de la red (`crates/sui/src/client_commands.rs:3892-3913`, llamado en `:4208` y `:4297`). Esto también corrige mi hallazgo 5 de la revisión de #1, que daba por hecho que agregar `license` en #16 podía repinear. | Alguien espera que el framework "se ponga al día solo" al tocar `Move.toml`, o que la CLI avise antes de publicar. El paquete llega a #8 compilado y testeado contra un framework de varias PV atrás y nadie lo nota. | Redactar T1/H13 así: "la CLI no repinea ni avisa por sí sola. El framework solo se actualiza con `printf 'n\n' \| sui move update-deps -e testnet` (o al cambiar las dependencias declaradas), y ese delta del lock se declara (PROY-11)". Corregir "repin solo al cambiar el manifest" a "repin solo al cambiar las dependencias del manifest". |
| 4 | 🟡 MINOR | PROY-11 (verificación del pin) | `PLAN_MONOREPO.md:229-236` (TASK-1 verif. 4) y `:150-152` (contingencia de T1) | El piso se calcula con `manifest.json` @ `testnet-v1.83.0`, cuya clave máxima es **140**. Si la PV de testnet es > 140, el `jq` devuelve igual el SHA de la 140 y la "verificación" pasa. La CLI 1.83 haría lo mismo en silencio al repinear (`system_packages_for_protocol` toma `range(..=version).next_back()`, `crates/sui-package-management/src/system_package_versions.rs:61-69`). | Testnet sube a la 141 antes de que corra el DEV (la 140 entró hoy) y un repin inesperado pinea `05ad86a…`. El DEV lo "verifica" como el piso del día y lo da por bueno, aunque el framework real de la 141 es otro. | En la verif. 4, agregar `MAX=$(jq 'keys\|map(tonumber)\|max' <scratch>/manifest.json); [ "$PV" -le "$MAX" ] \|\| echo "CLI desactualizada: PV $PV > $MAX"`. Si salta, se declara y se para. H13 debe decir que repinear exige una CLI del canal testnet cuya PV máxima sea ≥ la PV de testnet. |
| 5 | 🟡 MINOR | PROY-20, trazabilidad | `PLAN_MONOREPO.md:148-150` ("decidir cuándo … a más tardar antes de publicar en #8") | H13 no tiene dueño ni gancho. El "Pre-vuelo" de #8 (`gh issue view 8`) no menciona el repin. Además, `agents.md:151-153` ("los pinea al SHA del framework de testnet") y `STATUS.md:30` quedan inexactos desde hoy. | El repin se olvida y #8 publica con el lock de la PV 139 (o anterior). Mientras tanto, los docs siguen diciendo que el lock es "el framework de testnet". | Acción de H13: "pre-vuelo de #8: (1) CLI del canal testnet con PV máxima ≥ la PV de testnet (si no, `suiup` y registrar en Toolchain); (2) `cd contracts && printf 'n\n' \| sui move update-deps -e testnet`; (3) delta del lock declarado y gates re-medidos". El orquestador lo deja como comentario en #8. TASK-3 ajusta `agents.md:151-153` ("al SHA del piso de la PV de testnet vigente al repinear; ver STATUS H13") y la fila Framework de `STATUS.md:30` ("piso de la PV 139; testnet en 140 desde la época 1269, 2026-10-30 21:24 UTC → H13"). |
| 6 | 🟡 MINOR | PROY-19 (verificaciones reproducibles) | `PLAN_MONOREPO.md:237-238` (verif. 5: "solo `!! contracts/build/`"), `:320` ("vacío salvo los docs de este task") y `:358` (el `git grep` solo excluye PLAN y HANDOFF) | Los artefactos del ciclo (`documents/PLAN_MONOREPO.md`, esta revisión, `HANDOFF_MONOREPO.md`, reportes) aparecen como `??` mientras no estén commiteados. Además, este archivo cita `sources/House/…` y `sources/Game/…`, así que el `git grep` de coherencia los encuentra. Es la misma falla que el hallazgo 8 de #1. | El DEV reporta desvíos falsos, o el MID devuelve un NO PASA por coincidencias que salen de los artefactos del ciclo. | Escribir "aparte de los artefactos del ciclo en `documents/`" en las verificaciones de status, y excluir `':!documents/*_MONOREPO.md'` en el `git grep`. |
| 7 | 🟡 MINOR | Criterio del issue (cobertura) | `PLAN_MONOREPO.md:59-63` y `:373` | El issue pide "verificar nombres reales con `sui move test --coverage`". Con 0 tests no es posible (`move-cli/src/base/test.rs:253`, `if compute_coverage && !no_tests`). El reemplazo por evidencia de código es válido, pero no figura como **desviación del criterio** ni queda enganchado a #4 ("#4 los confirma" no lo dice ningún issue). | En la revisión de integración de #2 el criterio queda sin cumplir tal como está escrito, y en #4 nadie mira si `.coverage_map.mvcov` y `traces/` salen como `!!`. | Declararlo como desviación del criterio en el plan y en el body del PR. El orquestador agrega a #4 (comentario): "tras la primera corrida de `sui move test -e testnet --coverage` con tests, `git status --porcelain --ignored` muestra `contracts/.coverage_map.mvcov` y `contracts/traces/` solo como `!!`". |
| 8 | 🟡 MINOR | Regla de evidencia | `PLAN_MONOREPO.md:49` | El pin del root está en `Move.lock:19-20` (`[pinned.testnet.battleship]` / `source = { root = true }`). Las líneas 15-16 son `use_environment`/`manifest_digest` del pin `Sui`. | Un revisor sigue la cita y no encuentra lo que se afirma. | Corregir a `Move.lock:19-20`. |
| 9 | 🔵 SUGGESTION | PROY-10 | `PLAN_MONOREPO.md:99` (STOP-1 c) | El argumento más fuerte contra (c) no aparece explícito. Publicar `battleship::battleship` congela los layouts de `Coordinate`, `Ship`, `Board`, `Player` y `Game` (tienen `store`) y la firma `public fun new_game`. Con upgrades compatibles, #18 no podría agregarles campos y tendría que crear tipos nuevos. | — | Agregar ese "en contra" a la opción (c): ayuda al usuario a decidir. |
| 10 | 🔵 SUGGESTION | — | `STATUS.md:108` | D-20261030-08 (framework fijado por el lock) sigue pendiente de ratificación del usuario, y H13 es su consecuencia directa. | — | Presentar H13 al usuario en el mismo paquete que los STOP, junto a esa ratificación pendiente (como información, no como STOP). |
| 11 | 🔵 SUGGESTION | PROY-18 | (para #3) | La CI podría mostrar H13 sola: un paso informativo que compare el `rev` del lock con el piso de la PV de testnet (el mismo `jq` de la verif. 4, con la guarda del hallazgo 4). | — | Nota para el plan de #3, sin cambios en #2. |

### Validado como correcto (con evidencia)

- **Afirmación central: mover no repinea y el lock queda idéntico.**
  - `PackageGraph::load` usa el lock si `load_from_lockfile` devuelve un grafo (`graph/mod.rs:61-76`). Solo cae a manifests si algún `manifest_digest` no coincide, y en ese caso emite la nota "Updating dependencies…" (`graph/builder.rs:100-131`).
  - El digest sale de `RepinTriggers { deps }` (`package/package_impl.rs:327-348`). Las implícitas son `override_system_dep("sui"/"std")` (`sui_flavor.rs:163-177`, `schema/manifest.rs:160-173`), sin SHA y sin ruta.
  - El root es `source = { root = true }` (`Move.lock:20`).
  - `force_repin` solo llega desde `update-deps` (`root_package.rs:112-120`, `cli/update_deps.rs:48-55`).
  - El lock lo reescribe la misma CLI 1.83 que lo generó en #1, así que `cmp` debe dar idéntico. ✔
- **Verificaciones 1-2 de TASK-1** (simuladas en un clon desechable @ `c9536b4`): los `git mv`/`git rm` del plan dejan `test -e sources || test -e tests || echo ok` → `ok` (git borra los directorios que quedan vacíos). `git diff -M --summary` da exactamente 3 renames 100 % (`Move.lock`, `Move.toml`, `{sources/House => contracts/sources}/house.move`) y `--stat` "8 files changed, 299 deletions(-)". ✔
- **H13, los hechos:**
  - GraphQL de testnet: época 1269, inicio `2026-10-30T21:24:42Z`, `protocolVersion: 140`. Las épocas 1266-1268 están en 139, así que la PV 140 entró hoy, después de la verificación de #1.
  - `manifest.json` @ `testnet-v1.83.0`: 139 → `719fb2960c…` y 140 → `05ad86a3e8…`; la clave máxima es 140. Los dos SHAs existen en `MystenLabs/sui` (commits del 2026-10-08 y del 2026-10-22).
  - El piso se calcula con `range(..=pv).next_back()` (`system_package_versions.rs:61-69`), el mismo criterio que el `jq` del plan. ✔
- **H13, comportamiento de la CLI:** no avisa y no repinea sola (detalle en el hallazgo 3).
  - `sui move build/test` con un lock válido no consulta la red para el framework.
  - `find_env.rs` solo imprime la nota de entorno.
  - El único aviso de versión está en publish/upgrade y compara la CLI con la red, nunca el lock con la red.
- **T2 (`.gitignore` anclado):** probado con `git check-ignore -v` en un repo vacío del scratchpad.
  - `build/*` **no** cubre `contracts/build/x`.
  - Los 5 caminos de TASK-1 y los 7 de TASK-2 quedan ignorados.
  - `contracts/Published.toml`, `contracts/deployments/testnet.json` y `app/.env.example` no quedan ignorados (exit 1).
  - La plantilla de la CLI (`move-cli/src/base/new.rs:62`) es `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml`. ✔
- **Nombres de coverage/trace:**
  - `traces/` sale de `TRACE_DIR` (`move-unit-test/src/lib.rs:35`) y `.coverage_map.mvcov` de `files.rs:63`, ambos relativos a la raíz del paquete (`test.rs:230-233`).
  - `--coverage` exige que la CLI esté compilada con la feature `tracing` (`crates/sui-move/src/unit_test.rs:61-64`). El binario instalado no contiene el mensaje de error de esa rama y sí el help de `--coverage`, así que fue compilado con `tracing` y la corrida de TASK-1 no debería fallar por eso. ✔
- **T3 y `npm install` sin `app/`:** probado en un directorio del scratchpad con el `package.json` exacto del plan.
  - Node 22.23.4 / npm 10.9.9 y Node 26.13.0 / npm 11.20.0 dan exit 0, "up to date" y ningún aviso por el workspace inexistente.
  - En los dos casos **crea `package-lock.json`** y **no crea `node_modules/`**. TASK-2 verif. 2 puede decir directamente que eso es lo esperado; el plan ya prevé borrar el lock. ✔
- **T5:** `reroot_path` hace `set_current_dir` a la raíz del paquete (`move-cli/src/base/mod.rs:21-30`), así que `--path contracts` desde la raíz también escribe `contracts/build/` y es equivalente de verdad. `-p, --path` aparece en `sui move --help`. ✔
- **T4:** las líneas citadas existen: `agents.md:142-149, 157-158, 168, 174-175, 230`, `ESTANDARES.md:7` y `AGENTE_MID.md:66`. Si no se tocan, citan código que deja de existir (PROY-20). El antipatrón sigue cubierto por PROY-6, SEG-4, SEG-7 y H7. ✔
- **STOP-3, evidencia:**
  - `schedule.json`: v22 EOL 2027-04-30; v24 maintenance desde 2026-10-20 y EOL 2028-04-30; v26 LTS desde 2026-10-28 y EOL 2029-04-30.
  - `engines` vigentes: vite 8.3.5 `^20.19.0||>=22.12.0`; vitest 5.0.5 `^22.12.0||^24.0.0||>=26.0.0`; `@mysten/sui` 2.38.0 `>=22`; `@vitejs/plugin-react` 6.1.2 igual que vite.
  - Las tres opciones son viables con lo instalado (22.23.4 y 26.13.0). ✔
- **STOP-1 y STOP-2, evidencia:** `battleship.move:7-55` (tipos), `:58-65` (`new_game`: mueve `player1` en la 60 y lee `.addr` en la 62); el fix de (c) es correcto. `sources/Game/README.md:18-19, 31-32, 44-45, 57-58, 91-96` y `sources/House/README.md:37` dicen lo que el plan cita. `f063a0e` contiene los seis archivos a retirar. ✔
- **Pronóstico del baseline:** está bien acotado ("lo que se registra es lo medido"), y el 0 `WC09009` de `house.move` es consistente. Lo que sigue es inferencia mía, no lo verifiqué en el compilador: los 9 `WC09009` de `battleship.move` coinciden con los campos que nunca se empaquetan ni se leen (`Coordinate.x/y`, los 4 de `Ship`, `Board.ships`, `Player.board/moves`), y todos los campos de `House` se empaquetan en `house.move:50-57`. H12 queda en `contracts/sources/house.move:67`, porque el rename no cambia líneas. ✔
- **Estructura del plan:**
  - HU completa (`:7-20`).
  - Tasks en orden de dependencia (contratos → raíz npm → docs), cada uno de una sesión.
  - La cobertura del issue cierra sin scope creep (`:369-375`).
  - Sin impacto on-chain ni de fondos (el paquete no está publicado); smoke "no aplica" justificado.
  - Todos los comandos con `-e testnet`, `printf 'n\n' |` y `${PIPESTATUS[1]}`; no se lee ni se pega `client.yaml` (D-07).
  - `README.md` no cita el layout (`git grep`): bien dejarlo para #16. ✔

### Decisiones técnicas (aprobación del MAYOR)

- **T1 (lock sin repin en la mudanza):** ✅ aprobada, con la redacción de los hallazgos 3-5.
- **T2 (`.gitignore` anclado a `contracts/`):** ✅ aprobada tal cual.
- **T3 (sin `package-lock.json` en #2):** ✅ aprobada. Lo esperado es que `npm install` lo cree; se borra y se declara.
- **T4 (limpieza extra de docs):** ✅ aprobada.
- **T5 (`cd contracts && printf 'n\n' | sui move …` como forma canónica; `--path contracts` como equivalente):** ✅ aprobada.

### Posición sobre H13 (¿repinear en #2?)

**No repinear en #2 es lo correcto.**
1. El issue solo pide regenerar el lock "si cambia por la mudanza", y no cambia.
2. Con un bump de framework en el mismo PR, la verificación de rename puro deja de ser binaria.
3. El paquete no está publicado. Al publicar, los paquetes de sistema no viajan con el nuestro: se enlaza contra `0x1`/`0x2` on-chain, y lo que usa `house.move` existe sin cambios entre PV 139 y 140, porque las actualizaciones del framework son compatibles. Así que hoy el atraso no tiene efecto on-chain.
4. La PV avanza seguido: entró la 140 el 2026-10-30, tras al menos tres épocas en la 139. Repinear ahora habría que repetirlo antes de publicar de todos modos.

El momento correcto es el **pre-vuelo de #8**: CLI al día respecto de la PV de testnet, `update-deps -e testnet`, delta declarado y gates re-medidos (hallazgos 4 y 5).
Repinear en #2 como commit separado sería defendible técnicamente, pero es scope creep sobre el issue y no ahorra el repin previo a #8.

### Posición sobre los STOP (decide el usuario; aquí solo la evaluación)

- **STOP-1:** las opciones son correctas y completas (son las del issue) y la evidencia se verifica. Opinión del MAYOR: **(a)**. Sugerencia 9 para reforzar el "en contra" de (c).
- **STOP-2:** está bien planteado y es correcto ratificarlo con el usuario, porque el issue lo declaró STOP aunque no tenga efecto on-chain. Opinión del MAYOR: **(a)**.
- **STOP-3:** la evidencia es correcta (fechas y `engines` verificados). Antes de presentarlo, corregir la lista de archivos (hallazgo 1) y el versionado de ESTANDARES (hallazgo 2). Opinión del MAYOR: **(b) Node 26** es la opción técnicamente más sana. **(a)** sigue siendo válida: ningún issue de contratos (#2–#8) usa Node, el riesgo real empieza en #9, y el costo de (a) es migrar antes de 2027-04-30.

### Cambios exigidos para v1.1 (o para el handoff)

1. Agregar `AGENTE_DEV.md:17` a las menciones de Node; de preferencia, `nvm use` sin versión en los docs operativos (hallazgo 1).
2. Si STOP-3 ≠ (a), subir `ESTANDARES.md` a v1.2 (hallazgo 2).
3. Redactar T1/H13 con los disparadores reales del repin y el "no avisa" (hallazgo 3).
4. Agregar la guarda "PV ≤ PV máxima de la CLI" en la verif. 4 y en la contingencia de T1 (hallazgo 4).
5. Darle a H13 un dueño (pre-vuelo de #8, con comentario en el issue) y corregir `agents.md:151-153` y `STATUS.md:30` en TASK-3 (hallazgo 5).
6. Excluir los artefactos del ciclo en las verificaciones de status y en el `git grep` (hallazgo 6).
7. Declarar la desviación del criterio de coverage y dejarla enganchada en #4 (hallazgo 7).
8. Corregir la cita `Move.lock:15-16` → `19-20` (hallazgo 8).
9. (Opcionales) sugerencias 9-11.

### Preguntas al MID/usuario (solo las que bloquean)

- **Al usuario (vía el orquestador):** STOP-1, STOP-2 (ratificación) y STOP-3, tal como están en el plan, más la sugerencia 9 en STOP-1 y la corrección del hallazgo 1 en STOP-3. No hay preguntas bloqueantes para el MID.

---

## Revisión v1.1

## Veredicto v1.1: APROBADO (sin BLOCKER ni MAJOR. Los 8 MINOR y las 3 sugerencias de v1 están resueltos. Aparecen 3 MINOR nuevos, todos en verificaciones, que se corrigen en el handoff sin otra ronda de plan; el MID los comprueba en la revisión del reporte de cada task.)

> Revisión MAYOR del delta `documents/PLAN_MONOREPO.md` **v1 → v1.1** · Fecha: 2026-10-30 · Ref: `feature/issue-2-monorepo`
> @ `c9536b4` (plan y revisión sin commitear). Mismo método y mismas reglas que en v1: sin gates y sin tocar `~/.sui`.
> Evidencia nueva:
> - simulé en clones desechables las combinaciones STOP-1/STOP-2 (b/b), (c/a) y (a/b), aplicando el fix de (c) con un script;
> - layout de paquete de la CLI (`move-package/src/package/layout.rs` @ `testnet-v1.83.0`);
> - los `git grep` del plan corridos sobre el árbol actual;
> - comentarios de #3, #4 y #8 vía `gh api`.

### Hallazgos de v1: estado

| # v1 | Estado | Evidencia en v1.1 |
|---|---|---|
| 1 | ✅ | `AGENTE_DEV.md:17` está en TASK-2, con `nvm use` sin versión para cualquier opción (`PLAN:315-317, 345-352`) |
| 2 | ✅ | v1.2 de ESTANDARES solo si STOP-3 ≠ (a) (`PLAN:353-354`); TASK-3 ya no niega el cambio de versión (`:437-439`) |
| 3 | ✅ | Disparadores reales y "no avisa" (`PLAN:54-61`, T1 `:164-173`, decisión 4 `:475-476`) |
| 4 | ✅ con observación | Guarda `PV ≤ MAX` (`PLAN:279-280`) y contingencia (`:170-173`). Ver el MINOR nuevo N3 |
| 5 | ✅ | H13 con dueño (`PLAN:175-177`); `agents.md:151-153` y `STATUS.md:30` en TASK-3 (`:395-397, 424-426`). Comentario en #8 publicado el 2026-10-30 a las 22:05 UTC |
| 6 | ✅ con observación | Precondición común sobre los artefactos del ciclo (`PLAN:201-202`) y exclusiones en verif. 5 de TASK-1, en TASK-2/3 y en los `git grep`. Ver el MINOR nuevo N2 |
| 7 | ✅ | Desviación declarada (`PLAN:76-81, 293, 457`). Gancho comentado en #4 el 2026-10-30 a las 22:08 UTC |
| 8 | ✅ | `Move.lock:19-20` (`PLAN:52`) |
| Sug. 9-11 | ✅ | `PLAN:117`, `:158-160`, `:466-467`. La nota para #3 todavía no está comentada en el issue; no bloquea |

### Hallazgos nuevos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| N1 | 🟡 MINOR | PROY-19 (verificación reproducible) | `PLAN_MONOREPO.md:243-248` (tabla STOP-2 b) vs `:254` (verif. 1: `test -e sources \|\| test -e tests \|\| echo ok`) | `git mv` no borra los directorios de origen que quedan vacíos; `git rm` sí. Lo simulé: con STOP-2 (b), combinado con STOP-1 (a) o (b), queda `sources/` vacío (con `House/` y `Game/` vacíos adentro) y la verificación no imprime `ok`. Con (a/a) y (c/a) sí da `ok`. | El usuario elige STOP-2 (b). El DEV ve fallar la verif. 1 en un árbol correcto (git no versiona directorios vacíos) y reporta un desvío falso, o lo "arregla" sin declararlo. | Después de las filas de STOP-1/STOP-2, agregar como paso común: `find sources tests -depth -type d -empty -delete 2>/dev/null; true`. La verif. 1 queda como está. |
| N2 | 🟡 MINOR | PROY-20 (coherencia verificable) | `PLAN_MONOREPO.md:440-442` (`git grep` de coherencia de TASK-3) | El `git grep` da falsos positivos en dos casos. (i) No excluye `documents/DECISIONES.md`, y el orquestador registra las decisiones de STOP-1/2 **antes** de TASK-3 (`:469-472`); esas entradas van a citar `sources/battleship.move` y `sources/{House,Game}/README.md`. La verif. 5 de TASK-2 sí excluye DECISIONES (`:366`). (ii) Con STOP-1 (c), `agents.md` §1/§9 citan `contracts/sources/battleship.move`, que coincide con `sources/battleship`. | El output no es el "esperado" y el DEV o el MID abren un desvío falso por texto que es correcto. | Agregar `':!documents/DECISIONES.md'` y anclar el patrón para que no coincida con rutas bajo `contracts/`: `(^\|[^/])sources/(House\|Game\|battleship)\|tests/battleship\|hoy la raíz\|hasta que se mergee`. Así `git show f063a0e:sources/…` sigue apareciendo (va precedido de `:`) y `contracts/sources/…` no. |
| N3 | 🟡 MINOR | PROY-11 (verificación del pin) | `PLAN_MONOREPO.md:274-283` (verif. 4) vs `:302` (riesgo ii) | Si `curl` falla o el GraphQL devuelve un error, `PV` queda vacío o en `null`. Entonces `[ "$PV" -le "$MAX" ]` falla con "integer expression expected" y el `\|\|` imprime **"CLI desactualizada: PV  > 140"**, y `jq --argjson pv ""` aborta. | Sin red (el caso que el riesgo ii manda **reportar y seguir**), el DEV ve el mensaje de la guarda, aplica la contingencia de T1 y **para**, o reporta mal la causa. | Antes de la guarda: `[[ "$PV" =~ ^[0-9]+$ ]] \|\| echo "PV no obtenida (sin red o error de GraphQL): riesgo ii"`. Evaluar la guarda y el `jq` del piso solo si `PV` es un entero. |
| N4 | 🔵 SUGGESTION | Exactitud | `PLAN_MONOREPO.md:175, 464` | Dice "el MAYOR lo comenta en #8", pero el comentario lo publicó el orquestador (#8, 2026-10-30 22:05 UTC). | — | "Comentado en #8 por el orquestador (2026-10-30)". Lo mismo para el gancho de #4 (22:08 UTC). |
| N5 | 🔵 SUGGESTION | — | `PLAN_MONOREPO.md:366-367` (verif. 5 de TASK-2) | El patrón no detecta `agents.md:194` ("Usar 22"), que TASK-2 también cambia. Además, el esperado menciona "la fila Node de STATUS", que tras el cambio (`v… tras nvm use`) ya no coincide. Hoy coinciden `agents.md:40,51`, `ESTANDARES.md:83`, `STATUS.md:28,51` y `AGENTE_DEV.md:17`. | — | Agregar `\|Usar 2[0-9]` al patrón. Esperado: "solo PROY-17 (`ESTANDARES.md:83`) y el histórico de H1 (`STATUS.md:51`)". |

### Validado como correcto en el delta (con evidencia)

- **Tablas por opción de STOP-1/STOP-2** (simuladas en clones @ `c9536b4`):
  - (b/b): renames 100 % de `Move.lock`, `Move.toml`, `house.move`, `{sources => contracts/future}/battleship.move` y los dos READMEs → `contracts/docs/design-2025/{house,game}.md`.
  - (c/a): `{sources => contracts/sources}/battleship.move (97%)`, con un diff exacto de `+    let current_turn = player1.addr;` / `-        current_turn: player1.addr,` / `+        current_turn,`, que es el fix que describe `PLAN:241`. Lee el campo `address` (copiable) antes de mover `player1`. Es Move válido por inspección; el compilador lo confirmará en el gate.
  - Las verificaciones 1-2 por opción (`PLAN:251-258`) describen bien ese resultado, salvo N1.
- **`contracts/future/` y `contracts/docs/` no se compilan:** las carpetas de layout del paquete son `sources`, `tests`, `scripts`, `examples`, `specifications` y `doc_templates` (`move-package/src/package/layout.rs:54-61`). El chequeo `grep -c future build.txt` → `0` de STOP-1 (b) (`PLAN:268-269`) es una red de seguridad razonable.
- **Guarda de PV:** `jq 'keys|map(tonumber)|max'` sobre `manifest.json` @ `testnet-v1.83.0` da `140` (comprobado). La comparación y el piso son correctos cuando `PV` es un entero (salvo N3).
- **Dependencias explícitas de los STOP:** el plan ya no asume ninguna recomendación (`PLAN:199-200, 209, 311, 379`). El baseline está desglosado por opción (`:294-299`), y la fila H8 y los textos de §1/§9/§14 de `agents.md` y de `AGENTE_MAYOR.md` también (`:398-435`). ✔
- **Tablas de STOP-3:** fechas y `engines` iguales a los que verifiqué en v1. Los "en contra" de (b) y (c) reflejan el costo real que queda, porque el `nvm use` sin versión ahora es común a las tres opciones. ✔
- **Ganchos fuera de #2:** el comentario en #8 cubre los pasos del pre-vuelo de H13. El de #4 contiene el chequeo de `!!`. Falta la nota para #3 (sugerencia 11, opcional).

### Para el handoff

Incorporar N1, N2 y N3 (y, si se quiere, N4 y N5) directamente en `HANDOFF_MONOREPO.md`. No hace falta otra versión del plan. STOP-1, STOP-2 y STOP-3 están listos para el usuario.
