APPROVE CON CAMBIOS

## Veredicto: APROBADO CON CAMBIOS — revisión del MAYOR de `documents/HANDOFF_TOOLCHAIN_142.md` v1 (#75, PRE-1)

- **Fecha:** 2026-11-19. **Ref:** worktree `<repo>` de #75, branch `feature/issue-75-toolchain-1840`, HEAD `88dd53b`; handoff v1 sin commitear, 544 líneas. Primera ronda.
- **Resumen:** el handoff es sólido y ejecutable. Verifiqué las citas: `ci.yml:44-63, 94-104, 198-263`, `deployment.test.mjs:28-38, 324-328`, `publish.test.mjs:45-61, 561-576`, `execution.test.ts:281-283`, `eventScan.ts:130-140`, `capture-*.mjs:169, 267, 272, 280, 292, 301`, `README.md:93-94`, `agents.md:75-79, 382`, STATUS `:27-32, 58, 90, 93` y `contracts/README.md:15, 454, 723`. Todas coinciden.
- **Hay 2 MAJOR, ambos de orden:** se ejecuta el binario nuevo **antes** de verificar sus hashes, y TASK-1 deja deliberadamente dos tests de `scripts/` en rojo y su gate incompleto. Más 6 MINOR y 4 SUG.
- Con la v1.1 del MID que corrija los 2 MAJOR, **TASK-1 puede pasar al DEV**. Los MINOR pueden entrar en la misma v1.1.

---

## Hallazgos

| # | Sev. | Regla | Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| H-1 | 🟠 MAJOR | SEG-8, PROY-17 (verificar antes de usar) | 199-205 | El orden de 1.2 es: `suiup install` → **paso 2: `printf 'n\n' \| sui --version`** (ejecuta el binario nuevo, que ya es el `sui` por defecto) → recién en los pasos 3-5 se verifican el tgz del cache contra el digest del release y el binario contra el extraído del tgz. `suiup` solo verifica MD5 si encuentra un `.md5` (163). | Un tgz o binario alterado en la descarga de `suiup` (o un `sui` distinto en `~/.local/bin`) se **ejecuta** en la máquina del owner antes de descubrir que el SHA no coincide (S-3). La CI no tiene este problema: verifica con `sha256sum -c` antes de extraer (`ci.yml:55-57`) y antes de usar (`:62-63`). | Reordenar 1.2: (1) `suiup install` (no ejecuta `sui`); (2) **paso 3** (tgz del cache = digest del release); (3) **paso 5** (extraer `./sui` del tgz verificado en un directorio nuevo y hacer `sha256sum`); (4) **paso 4** (instalado = copia de `suiup` = extraído); (5) **recién entonces** `printf 'n\n' \| sui --version` (S-6). Agregar: "ningún comando ejecuta el binario 1.84.0 antes de los tres `sha256sum` coincidentes; si alguno falla, S-3, `suiup default set sui@testnet-1.83.0` y parar". |
| H-2 | 🟠 MAJOR | PROY-19, PROY-18 (gate completo del área), FLUJO §5 | 230, 233-237, 242-250 | TASK-1 cambia `ci.yml` y `Move.lock` pero **no corre `node --test` ni `check`** ("TASK-2: sus tests comparan el rev del lock con un literal viejo y van a fallar", 230). Verificado: rompen exactamente **dos** tests. `deployment.test.mjs:324-328` lee el `Move.lock` del repo contra `LOCK_FRAMEWORK_REV` (`:38`), y `publish.test.mjs:561-576` lee el `ci.yml` real (`CI_YAML`, `:49`) y espera que `sui 1.83.0-16d2dc1e05ed` sea la CLI de CI. El commit de TASK-1 queda con el job `contracts` en rojo y su reporte omite una parte del gate del área tocada. | El MID aprueba TASK-1 sin `node --test` y el commit queda rojo en la branch. Si se pushea antes de TASK-2 (o TASK-2 se demora), la CI está roja con un rojo "conocido" que no figura en STATUS. Además, la bisección del PR tiene un commit que no pasa sus gates. | Mover a TASK-1 los dos cambios de literales que dependen de `ci.yml` y del lock: `deployment.test.mjs:38` (`LOCK_FRAMEWORK_REV` → `e6f43880f4b65e2c1f0397583a9690b4b22c9223`, con el comentario "PV 142, repin de #75") y `publish.test.mjs:562-567` (el caso "igual a CI" pasa a `sui 1.84.0-<SUI_COMMIT>`; el caso "otra versión" pasa a `sui 1.83.0-16d2dc1e05ed`). Agregar a 1.5 y al DoD de TASK-1: `node --test scripts/*.test.mjs` = **104 PASS** y `check` = `1 despliegue(s)`. Agregar ambos archivos a "Tocar" de TASK-1 (solo esas líneas). TASK-2 conserva el resto de los literales. |
| H-3 | 🟡 MINOR | Fixtures como evidencia de forma (M-6) | 274 | La comparación de forma con `jq paths` (claves con los índices numéricos reemplazados por `*`) **no ve** cambios de tipo (`"1000"` → `1000`, `null` → objeto) ni de longitud de arrays (cantidad de eventos, de `objectChanges`, de `balanceChanges`). Son justo los cambios de la 1.84 que podrían romper parsers sin cambiar las claves. | La 1.84 serializa un `u64` como número en lugar de string en el `--json`: la lista de rutas es idéntica, la tabla dice "forma igual", las fixtures se commitean y el problema aparece en #73. | Comparar **pares ruta-tipo** y longitudes: `jq -r 'paths(scalars) as $p \| ($p \| map(if type=="number" then "*" else . end) \| join(".")) + " : " + (getpath($p) \| type)' \| sort -u`, más `[paths(arrays)] as $a \| …length` para cada array. Mantener el cotejo de valores no derivados de la génesis. |
| H-4 | 🟡 MINOR | S-9, ARQ-4 | 145, 348 | El criterio para tocar literales de tests de la app es bueno, pero conviene cerrarlo más. | Un literal "corregido" a mano con un valor equivocado hace pasar un test que ya no verifica la fixture; o se "arregla" una aserción relajándola. | Cada literal nuevo sale de la fixture por `jq` (comando pegado), con la tabla ruta → viejo → nuevo. **Prohibido** cambiar matchers (`toBe` ↔ `toMatchObject`), borrar aserciones o tocar el cálculo esperado: solo se reemplazan entradas literales y los resultados que se derivan de ellas por la fórmula del test (p. ej. `networkCost`). Si con la 1.84 cambian los costos de gas (la PV 142 puede traer otra tabla de gas), se dice explícitamente: es dato para #73 (`GAME_STORAGE_DEPOSIT_MIST`, mediciones de `contracts/README.md:410-418`). |
| H-5 | 🟡 MINOR | M-5, V-16 de #73 | 76-77, 205, 397 | M-5 protege el binario 1.83.0 contra `remove`/`cleanup`. Pero V-16 de #73 compara el tgz de la 1.83.0 con `SUI_TGZ_SHA256` "registrado en `ci.yml:24` antes de PRE-1": después de este PR ese valor desaparece de `ci.yml`, y STATUS guarda el procedimiento, no los valores (106-110). | En TASK-1 de #73, el DEV no encuentra el hash de referencia de la 1.83.0 o usa uno equivocado. | (1) En 1.2.6 sumar `sha256sum ~/.local/share/suiup/binaries/testnet/sui-v1.83.0` = `29e1beb96434…` (el de `ci.yml:25` hoy). (2) En TASK-4, que STATUS (fila "CI" o H1) registre como **histórico** los dos SHA-256 de la 1.83.0 (tgz y binario, como están hoy en `ci.yml:24-25`), o la referencia exacta `git show 88dd53b:.github/workflows/ci.yml`, para V-16. |
| H-6 | 🟡 MINOR | V-9 | 341-342, 352-356, 372 | V-9 mide el fullnode **público**, y su resultado depende de la versión que corra ese nodo. Si todavía es 1.83, la medición no dice nada de la 1.84 (`BELOW_EARLIEST_AVAILABLE`, cursores rechazados). El handoff pide imprimir la versión del servidor "si el mensaje trae el campo", pero no dice qué concluir. | El reporte dice "reconocido por `eventScan.ts:132`" medido contra un nodo 1.83, y #73 asume que la 1.84 está cubierta. | Agregar: si el servidor no es ≥ 1.84 (o no se puede saber), V-9 es **no concluyente** para la 1.84 y el orquestador abre un issue de seguimiento: "repetir V-9 cuando el fullnode público corra la 1.84". Si (d) se clasifica como "historial podado" (`ABOVE_LATEST_AVAILABLE` → `OUT_OF_RANGE`), también va un issue aparte, con la evidencia. |
| H-7 | 🟡 MINOR | FLUJO §5 (plantilla de reporte) | 424-459 | A la plantilla le faltan outputs que la revisión necesita. | El MID no puede verificar sin pedirlos de nuevo. | Agregar por task: `git diff --stat` y `git status --porcelain --untracked-files=all` al cierre. En TASK-1: `suiup show` (versiones instaladas, sin rutas personales), los **cuatro** `sha256sum` (tgz del release vía `gh api`, tgz del cache, binario instalado = copia de `suiup`, extraído) más el del binario 1.83.0 (H-5), `diff` completo de `Move.lock` y la salida de actionlint. En TASK-2: `du -s` de `~/.move` antes y después, y la salida de los `cmp`/`jq empty`. En todos: los conteos de `docker ps -aq`/`images -aq` antes y después. |
| H-8 | 🟡 MINOR | R-5 vs. instrucciones | 63, 118 | R-5 prohíbe "`sui client` contra testnet", pero 1.4 corre `sui move update-deps -e testnet`, que en #8 consultó la red para elegir el piso (lectura de la cadena con el `client.yaml` sin claves). Es legítimo, pero el DEV podría leerlo como contradicción. | El DEV duda o para sin necesidad. | Una línea en R-5: "`sui move build/test/update-deps -e testnet` está permitido (lectura del entorno testnet con el `client.yaml` sin claves; no firma ni envía transacciones)". |
| H-9 | 🔵 SUG | R-2, S-7 | 115 | La guarda de `~/.sui/sui_config/` usa `stat` (mtime y tamaño) y `ls` sin `-a`. | Un archivo oculto nuevo no aparece. | `ls -la` (solo nombres y tamaños) y, opcional, `sha256sum` de `client.yaml`: el hash no revela contenido y el archivo no tiene claves. |
| H-10 | 🔵 SUG | M3 (task completable en una sesión) | 257-327 | TASK-2 son tres génesis, la recaptura de 7 fixtures y la adaptación de tests: es largo para una sesión. | Una sesión que se corta a mitad de G-B deja localnets y fixtures a medias. | Partir en TASK-2a (G-A, fixtures de `scripts/` y sus tests) y TASK-2b (G-B y G-C, fixtures de la app), cada uno con su reporte. |
| H-11 | 🔵 SUG | Transparencia del artefacto | 163, 537 | El MID corrió una vez `suiup --version` (solo lectura, no toca `~/.sui` ni instala). No tiene impacto, pero el handoff dice "no se ejecutó" en 163 y 537. | — | Declararlo en "Referencias verificadas": "se ejecutó `suiup --version` (solo lectura)". No requiere otra acción. |
| H-12 | 🔵 SUG | (g) | `ci.yml:246, 250-251` | Los textos "pre-vuelo de #8" de `framework-drift` quedan viejos. | — | Dejarlos así en #75 (el handoff limita `ci.yml` a 4 líneas, bien). Actualizarlos en TASK-4 de #73, cuando el runbook de upgrade reemplace al pre-vuelo de #8. Anotarlo en "Pendientes" del cuerpo del PR. |

---

## Respuestas al foco

**1. Cadena de suministro y claves.**
- Los cuatro hashes **alcanzan** (PROY-17, SEG-8): el digest del release (fuente: GitHub, la misma de la CI), el tgz que bajó `suiup`, el binario instalado (= la copia de `suiup`) y el binario extraído del tgz con el mismo `tar` de la CI (`ci.yml:57`). El defecto es solo de **orden** (H-1).
- **`suiup install`:** según la lectura de su fuente (163), no ejecuta `sui` ni escribe en `~/.sui`. **Sí cambia el `sui` por defecto de la máquina del owner**: está declarado, con el rollback (`suiup default set sui@testnet-1.83.0`) y en "Pendientes" del PR (526-527). Es aceptable: el owner va a necesitar la 1.84.0 para el upgrade de #73.
- **La guarda de `~/.sui` es adecuada** (con H-9 como mejora). La línea base de mtime y tamaño está escrita (115) y S-7 frena sin abrir el archivo.
- **Ninguna orden prohibida:** no hay `sui client` contra testnet, publish/upgrade en testnet, faucet, `new-address`, `--force-regenesis` ni `pkill`; Docker se maneja por línea base y por ID. `suic` solo dentro de la localnet aislada y `publish.mjs` solo con `--network localnet`: permitido por `agents.md` §3.
- **`suiup --version` del MID:** no importa para la seguridad; solo hay que declararlo (H-11).

**2. Corrección técnica.**
- **Orden general:** línea base con la 1.83 antes de tocar nada (M-1, bien) → V-7 → instalación → `ci.yml` → repin → gates. Correcto, salvo H-1 y H-2.
- **Repin:** `update-deps -e testnet` con el lock copiado antes y `diff` después es correcto.
- **STOPs S-1..S-9:** bien definidos. Agregaría dos al S-3 de H-1: binario ejecutado antes de verificarlo, y rollback si un hash falla.
- **Claves de cache de la CI:** cambian solas (`ci.yml:45` por `SUI_TGZ_SHA256`; `:104` por `hashFiles('contracts/Move.lock')`). Esperado y bien anotado (159).

**3. Decisiones del MID.**
- **(a) M-6, de acuerdo.** Además, ni siquiera es una excepción: con la 1.84, `_meta.suiCliVersion` cambia en las tres fixtures de la app, así que la regla de "solo `capturedAt`" no aplicaría aunque la génesis fuera la misma. El determinismo dentro de cada génesis (dos corridas) es el control correcto. Para que el cambio no esconda una regresión de forma, falta H-3 (tipos y longitudes).
- **(b) M-3, aceptable dentro del alcance.** El criterio de docs del issue dice "solo las líneas que describen la toolchain vigente", y `README.md:93-94` es exactamente eso. No hace falta tocar el issue: va declarado como desviación en el reporte de TASK-4 y ya figura en "Docs" del cuerpo del PR (502).
- **(c) S-9, suficiente con H-4** (literales sacados por `jq`, sin tocar matchers ni fórmulas).
- **(d) M-4, correcto.** Rige el issue, que es posterior y explícito. `build`/`test`/`update-deps` no escriben `Published.toml`; si cambiara, S-5.
- **(e) M-5:** falta lo de H-5 (el SHA del binario 1.83.0 instalado y los hashes históricos de la 1.83.0 en STATUS para V-16).
- **(f) V-9:** falta la regla de "no concluyente" y los issues de seguimiento (H-6).
- **(g) De acuerdo con dejarlo** (H-12).

**4. PR y commits.**
- El cuerpo del PR (485-533) lleva la palabra de cierre de #75 **solo** ahí (529). "Relacionado: #73 (este PR no lo cierra)" no tiene palabra de cierre en inglés.
- Los commits (469-481) llevan solo `Refs #75`.
- El grep de D-20261119-01 (`\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b:? *#[0-9]+`) sobre el handoff da **una sola** coincidencia: la del cuerpo del PR en 529. **Correcto.**
- Sumar a "Pendientes" la nota de H-12.

**5. Plantilla y snippet de STATUS.**
- **Plantilla:** completa en la estructura de FLUJO §5. Faltan los outputs de H-7.
- **Snippet:** correcto en forma. Sumar los hashes históricos de la 1.83.0 (H-5) y la conclusión de V-9 con la versión del servidor (H-6).

**6. Ejecutabilidad y merge.**
- **Ejecutable por un DEV sin contexto:** sí. Los DoD son verificables, no hay decisiones de diseño y los STOPs son claros. El orden y las dependencias de los 4 tasks son correctos, con H-2 y opcionalmente H-10.
- **Mergeabilidad:** el PR puede mergearse. Los checks requeridos (`contracts`, `app`, `deploy-image`) se re-miden y `framework-drift` es informativo (`continue-on-error`).
- **Railway: el merge NO publica el sitio.** El diff previsto no toca ninguna watch path (`app/README.md:246-266`): `app/scripts/**` y los `*.test.ts(x)` están negados, y `contracts/fixtures/`, `contracts/scripts/*.test.mjs`, `contracts/scripts/fixtures/`, `Move.lock`, `ci.yml` y los docs no están en la lista. No se usa la preautorización de D-20261119-02. Si un cambio tocara `contracts/scripts/publish.mjs` o `deployment.mjs` (watch paths), ya sería S-8.

## Cambios para la v1.1 del handoff
1. **H-1:** reordenar 1.2 (verificar los tres hashes antes de ejecutar `sui`) y agregar el rollback si falla.
2. **H-2:** mover a TASK-1 los literales de `deployment.test.mjs:38` y `publish.test.mjs:562-567`, y correr `node --test` (104) y `check` en TASK-1.
3. **H-3..H-8:** comparación de forma con tipos y longitudes; criterio de S-9 con `jq`; hash del 1.83.0 y hashes históricos en STATUS; V-9 no concluyente y sus issues; outputs de la plantilla; aclaración de `update-deps` en R-5.
4. **Opcionales:** H-9..H-12.

---

### §R-6
**Sobre el handoff** (`/usr/bin/grep -nE`):
- `[0-9a-fA-F]{40,64}`: `05ad86a3…` (PV 140) y `e6f43880…` (PV 142), commits del framework de `MystenLabs/sui`; `0f006fb4…` (SHA-256 del tgz del release 1.84.0); `9dc25070…` (commit del tag `testnet-v1.84.0`). Todos públicos.
- `0x[0-9a-fA-F]{8,}`: 0.
- Grep 3: solo la línea 122, que cita el patrón en R-6.
- Grep 4: 0. No hay direcciones de cuenta.

**Sobre esta revisión:**
- Grep 1: el commit público del framework de la PV 142 (`e6f43880…`, completo una sola vez, en H-2).
- Grep 2: 0.
- Grep 3: 0.
- Grep 4: 0.
- Palabras de cierre con número: 0 (la de #75 se nombra sin la palabra).
