## Veredicto: APROBADO CON CAMBIOS (en la taxonomía del rol: REQUIERE CAMBIOS; los MAJOR se corrigen en v2 y la re-revisión se limita a ese delta)

> Revisión MAYOR del plan `documents/PLAN_TOOLCHAIN.md` **v1** (MID) · Issue #1 · Fecha: 2026-10-30
> Ref revisado: branch `feature/issue-1-toolchain` @ `5c583e8` (plan sin commitear en el working tree).
> Ronda: primera (no hay hallazgos previos que cerrar).
> Fuentes contrastadas: `gh issue view 1`, `agents.md`, `documents/STATUS.md`, `DECISIONES.md`,
> `ESTANDARES.md`, `FLUJO_AGENTES.md`, `Move.toml`, `Move.lock`, `.gitignore`; CLI instalada
> (`sui --version`, `sui move --help`, `sui move build|test|update-deps --help`, ejecutados con `HOME`
> desechable y sin crear configuración); doc oficial (*Move package management* y
> *package-manager-migration*); **código fuente de la CLI en el tag `testnet-v1.83.0`** de
> `MystenLabs/sui` (leído con `gh api`, no compilado). No se corrió ningún gate (D-20261030-02) y
> `~/.sui` sigue sin existir.

### Resumen (3 líneas máx)

El plan es sólido: HU completa, alcance correcto, la Decisión 1 (dependencias implícitas) y la 2 (canal testnet) están bien fundadas, y las afirmaciones técnicas del MID se verifican todas.
Pero el STOP-1 llega al usuario con una opción que no funciona (c), sin la opción más limpia (un `client.yaml` **sin claves**), y los gates/pin quedan atados al entorno activo del cliente (`-e testnet` ausente).
Corregir esos tres puntos (y los MINOR de redacción) antes de presentar el STOP-1 al usuario.

### Hallazgos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| 1 | 🟠 MAJOR | SEG-3, FLUJO §4 (STOP: opciones con trade-offs reales) | `PLAN_TOOLCHAIN.md:140` (STOP-1 opción c) | La opción (c) ("probar si `sui move build -e testnet` evita el prompt") está **refutada por el código**: `SuiCommand::Move` llama a `get_wallet_context(&client_config)` **antes** de despachar cualquier subcomando (`crates/sui/src/sui_commands.rs:578-584`), y ese helper llama a `prompt_if_no_config` (`sui_commands.rs:1730-1736`), que pregunta y, con respuesta vacía (stdin cerrado ⇒ línea vacía), crea keystore + clave e imprime `secret recovery phrase` (`sui_commands.rs:1630-1648, 1703-1716`). `-e/--build-env` se resuelve después, en `find_environment` (`crates/sui-move/src/build.rs:64-65`). | Si el usuario elige (c), el DEV corre el experimento y **siempre** genera una clave y deja una frase en su output/log (SEG-3), sin aprender nada. | Eliminar (c) o reescribirla como hecho verificado: "`-e` no evita el prompt (sui_commands.rs:584)". |
| 2 | 🟠 MAJOR | FLUJO §4 (opciones completas), SEG-3, PROY-18; issue #1 "Fuera de alcance: configurar `sui client`" | `PLAN_TOOLCHAIN.md:129-147` (STOP-1) | Falta la alternativa que no genera ninguna clave: **(d) un `client.yaml` sin claves**. El prompt solo aparece si el archivo **no existe** (`sui_commands.rs:1634-1636`); `WalletContext::new` solo lo lee (`crates/sui-sdk/src/wallet_context.rs:35-52`); `active_address` es opcional (`crates/sui-sdk/src/sui_client_config.rs:22-33`); un keystore `File` inexistente o vacío carga como mapa vacío sin generar nada (`crates/sui-keys/src/keystore.rs:401-430`); la ubicación se puede mover con `SUI_CONFIG_DIR` (`crates/sui-config/src/lib.rs:45-52`; presente en el binario instalado). Contenido mínimo: `keystore: { File: <ruta absoluta>/sui.keystore }`, `envs` con `testnet` (alias + rpc), `active_env: testnet`, `active_address: ~`. | Con (a) el owner crea **ahora** la clave publicadora (decisión que pertenece a #8, y que el issue #1 deja fuera de alcance) y el DEV corre gates en una máquina con un keystore real legible. Con (b) pasa una frase por el stdout del DEV. Para CI (#3) el plan sugiere (b) (`:146-147`), cuando (d) sirve igual en local y en CI sin generar claves (PROY-18: mismo gate local y CI). | Agregar (d) a la tabla con sus trade-offs: + sin clave ni frase en ningún momento; + comandos idénticos a `agents.md` §3 si el archivo vive en `~/.sui/sui_config/` (o con `SUI_CONFIG_DIR` exportado); + mismo mecanismo para #3; + no adelanta la clave publicadora (en #8 el owner importa/crea su dirección sobre ese mismo `client.yaml`); − el archivo lo escribe a mano el owner (o el DEV con autorización registrada, porque toca `~/.sui`); − requiere que el DEV confirme en el primer run que no hubo prompt. Revisar la recomendación a la luz de (d) (ver "Preguntas"). |
| 3 | 🟠 MAJOR | PROY-11 (reproducibilidad), LIM-9/PROY-19 (gates comparables) | `PLAN_TOOLCHAIN.md:99-103` (riesgo residual), `:189-197` (verif. 3 y 5), `:219-222` (gates), `:243-246` (`agents.md` §3) | (i) El riesgo residual está mal planteado: el pin de `sui`/`std` es **siempre** un SHA de git (`GitSha::try_from(packages.git_revision)`, `crates/sui-package-alt/src/sui_flavor.rs:179-213`). (ii) El riesgo real no figura: **qué** SHA se pinea lo decide la versión de protocolo de la red del **entorno activo del cliente** (`SuiFlavor::with_client(wallet)`, `sui_flavor.rs:66-99`; `build.rs:64-71`), y si el RPC falla cae **en silencio** (`warn!`) a los paquetes más nuevos que conoce la CLI (`sui_flavor.rs:186-197`). (iii) Sin `-e`, el entorno de build sale del entorno activo (`crates/sui-package-alt/src/find_env.rs:46-61, 80-104`). Los gates de `agents.md` §3 no fijan entorno. | (a) Si el owner tiene `active_env` en `localnet` (smokes de `FLUJO_AGENTES.md` §6 / `agents.md` §3, `sui start`), `sui move build` aborta con "Could not determine the correct dependencies to use for `localnet`; pass one of `--build-env testnet`…" (`find_env.rs:147-161`) → gate rojo que no es del código. (b) Con `active_env` en `mainnet`, el gate compila contra las deps de mainnet y puede repinear esa sección del lock. (c) Sin red al repinear, el lock queda con un framework más nuevo que el protocolo de testnet y nadie lo nota. | Gates con entorno explícito en TASK-1, TASK-2 y `agents.md` §3: `sui move build -e testnet`, `sui move build -e testnet --lint`, `sui move test -e testnet` (verificado en `--help` de ambos). TASK-1: confirmar `active_env = testnet` (o `--client.env testnet`) y red **antes** del repin; reportar el `rev` de `sui`/`std` del lock y verificarlo con `gh api repos/MystenLabs/sui/commits/<sha>` (pegar el tag/branch que lo contiene); cualquier aviso "Falling back to protocol version" o lock pineado con red caída = desviación y parar. Reemplazar el texto del riesgo residual de `:99-103` por este. |
| 4 | 🟡 MINOR | — (exactitud de opciones del STOP) | `PLAN_TOOLCHAIN.md:139` (opción b, "`~/.sui` intacto") | Con `--client.config <scratch>/client.yaml`, `get_wallet_context` evalúa igual `unwrap_or(sui_config_dir()?…)` (evaluación ansiosa, `sui_commands.rs:1731-1734`) y `sui_config_dir()` **crea** `~/.sui/sui_config/` si falta (`sui-config/src/lib.rs:53-58`). | El DEV corre (b) con `--client.config` y aparece `~/.sui/sui_config/` vacío en el HOME real, contra lo que el plan promete al usuario. | Corregir el texto: la variante que deja `~/.sui` intacto es `SUI_CONFIG_DIR=<scratch>` (o `HOME` temporal, que además reubica la caché `~/.move`), no `--client.config`. |
| 5 | 🟡 MINOR | PROY-11, PROY-20 (docs exactas) | `PLAN_TOOLCHAIN.md:107-114` (PROY-11 y `agents.md` §2), `:170-171` (comentario de `Move.toml`) | "fijadas por la versión de la CLI + `Move.lock`" es inexacto: la fuente del pin es **`Move.lock`** (SHA resuelto para el protocolo de la red objetivo al repinear; la CLI aporta la tabla protocolo → SHA). Además, la CLI repinea al cambiar el manifest (doc *Move package management*: "only repins the dependencies if your manifest file changes"), así que cualquier edición futura de `Move.toml` (#2 al mover el paquete, #16 con `license`) puede mover el framework en silencio. | Un PR de #16 agrega `license`, el lock cambia de SHA y nadie lo revisa porque "lo fija la CLI". | PROY-11 (redacción propuesta): "`Move.toml` en el formato del sistema de paquetes de la CLI registrada en STATUS (≥ 1.63): `std`/`sui` implícitas (sin entrada `Sui` git ni `implicit-dependencies = false`), sin `[addresses]`/`[dev-addresses]`; deps git de terceros con `rev` = SHA de 40 caracteres. El framework queda fijado por `Move.lock` (regenerado por la CLI con `-e testnet`, nunca a mano, commiteado); todo cambio de `Move.lock` en un diff se declara y justifica en el reporte. `edition` declarada. Direcciones publicadas en `Published.toml` (commiteado); `Pub.*.toml` nunca se commitea." Mismo ajuste en `agents.md` §2 y en el comentario de `Move.toml`. |
| 6 | 🟡 MINOR | — | `PLAN_TOOLCHAIN.md:177-180` (fallback `update-deps`) | `sui move update-deps` sin `-e` resuelve el entorno **activo** (`crates/sui-move/src/update_deps.rs:30-31`), aunque su `--help` diga "all environments". | Con `active_env` ≠ testnet el fallback repinea otro entorno o aborta. | Usar `sui move update-deps -e testnet` en el fallback. |
| 7 | 🟡 MINOR | SEG-3 (registro) | `PLAN_TOOLCHAIN.md:57-62` | El propio experimento del MID (`sui move new` con `HOME` desechable y stdin cerrado) imprimió una recovery phrase en su output. Clave desechable, sin fondos y borrada: no hay nada que rotar, pero quedó una frase en un log de agente. | Se repite el patrón en la próxima exploración de la CLI. | Declararlo en el plan como incidente cerrado (sin rotación necesaria) y agregar al pre-chequeo de TASK-1 una defensa: la primera invocación de `sui move` se corre con `printf 'n\n' \|` delante, para que, si el `client.yaml` no se encuentra, la CLI aborte ("No config found, aborting", `sui_commands.rs:1644-1646`) en vez de crear una clave. |
| 8 | 🟡 MINOR | PROY-19 | `PLAN_TOOLCHAIN.md:198-199` (verif. 6), `:234-235` | (i) `git status` "solo muestra `Move.toml`, `Move.lock`, `.gitignore`" fallará mientras `documents/PLAN_TOOLCHAIN.md` (y este archivo) sigan sin commitear. (ii) `STATUS.md:25` dice "Esperado 🔴 por H6/H7", y el issue y el plan esperan H6/H8. | El DEV reporta un falso desvío por los docs del ciclo; el baseline arrastra la referencia a H7. | (i) "aparte de los artefactos del ciclo en `documents/`". (ii) TASK-2 corrige la fila a los rojos realmente observados. |
| 9 | 🔵 SUGGESTION | ARQ-6 | `PLAN_TOOLCHAIN.md:240-241` | `Published.toml` (commiteable, lo escribe la CLI al publicar) se superpone con `contracts/deployments/<red>.json` (D-20261030-03, `agents.md` §5). | #7 crea dos fuentes del `packageId`. | En la nota para #7/#8 de STATUS, decir explícitamente que #7 debe definir cuál es la fuente y cuál se deriva. |
| 10 | 🔵 SUGGESTION | — | `PLAN_TOOLCHAIN.md:87-97` | La evidencia de la Decisión 1 puede citar un argumento más fuerte: un manifest moderno **rechaza** las dependencias `Sui`/`MoveStdlib` ("legacy system name and cannot be used", `sui_flavor.rs:241-275`); la opción (a) del issue solo es posible en el formato legado (con `[addresses]`), que la CLI todavía acepta pero la guía pide migrar. | — | Añadir esa línea a la justificación. |

### Validado como correcto (con evidencia)

- **HU** completa (`PLAN_TOOLCHAIN.md:5-16`), alcance y fuera de alcance explícitos; la suma de tasks cubre los 8 criterios del issue sin scope creep (`:260-265`). El `.gitignore` está justificado dentro de #1 (`:183-185`).
- **CLI**: `sui --version` → `sui 1.83.0-16d2dc1e05ed`; binario en `~/.local/bin/sui`; `~/.sui` y `~/.move` no existen hoy.
- **Dependencias implícitas**: la doc dice "implicitly includes the `std` and `sui` packages unless you write `implicit-dependencies = false`"; el código las inyecta como overrides de sistema (`sui_flavor.rs:163-177`); la guía de migración: "Sui advises against disabling implicit dependencies". ✔
- **Plantilla**: `move-cli/src/base/new.rs:84-104` genera `edition = "2024"` y `[dependencies]` vacío; `:53-62` agrega `build/*`, `traces/*`, `.trace`, `.coverage*`, `Pub.*.toml` al `.gitignore`. ✔ (coincide con `:36-39` y `:181-182`)
- **`Move.lock`**: commitear, "never edit manually", se regenera en el primer run de la CLI nueva, repinea solo si cambia el manifest (doc + guía). El `Move.lock:4` actual es v3 y pinea `framework/testnet` (`Move.lock:13,17`). ✔
- **`Published.toml` / `Pub.<env>.toml`**: el primero se commitea, los segundos no (doc + guía); `--pubfile-path` existe en `sui move --help`. ✔
- **`[addresses]`/`[dev-addresses]`**: la guía pide quitarlos ("you can no longer provide named addresses"); el paquete se llama `battleship` (`Move.toml:2`), igual que la address que usan los módulos. ✔
- **`edition = "2024"`**: `Edition::E2024` está en `VALID` (`move-compiler/src/editions/mod.rs:208-233`); solo `development` se rechaza en manifests (`sui_flavor.rs:227-233`). ✔
- **`--warnings-are-errors`**: presente en `sui move build --help` y también en `sui move test --help` (además de `--silence-warnings`, `--json-errors`, `--lint`, `--no-lint`). ✔
- **Hallazgo del `client.yaml`**: confirmado en código (`sui_commands.rs:584, 1630-1682`); también son correctos `--client.config` y `-y` (`sui_commands.rs:170-182`). ✔
- **Decisión 2 (canal testnet)**: coherente con `agents.md` §4 y con lo instalado (H1). ✔
- Sin impacto on-chain, sin flujo de fondos, smoke "no aplica" justificado (`:74-83`). ✔

### Decisiones

- **Decisión 1 (dependencias implícitas):** ✅ aprobada. Registrar en `DECISIONES.md` con la evidencia del hallazgo 10.
- **Decisión 2 (CLI canal testnet):** ✅ aprobada tal cual.
- **Nueva redacción de PROY-11:** ✅ aprobada **con cambios** (hallazgo 5: el pin lo da `Move.lock` regenerado con `-e testnet`, y todo delta del lock se declara). La misma corrección va en `agents.md` §2 y en el comentario de `Move.toml`.

### Cambios exigidos para v2

1. Quitar o reescribir la opción (c) del STOP-1 como refutada (hallazgo 1).
2. Agregar la opción (d) "`client.yaml` sin claves" (en `~/.sui/sui_config/` o vía `SUI_CONFIG_DIR`) con sus trade-offs, revisar la recomendación y la nota de CI (hallazgo 2).
3. Gates con `-e testnet` en TASK-1, TASK-2 y en la redacción de `agents.md` §3; precondiciones del repin (entorno activo testnet + red) y verificación del SHA del lock con `gh api`; reemplazar el riesgo residual de `:99-103` (hallazgo 3).
4. Corregir la opción (b): `SUI_CONFIG_DIR` en lugar de `--client.config` para no tocar `~/.sui` (hallazgo 4).
5. Redacción de PROY-11, `agents.md` §2 y comentario de `Move.toml` según el hallazgo 5.
6. `sui move update-deps -e testnet` en el fallback (hallazgo 6).
7. Registrar el incidente de la frase del experimento y agregar la defensa `printf 'n\n' |` a la primera invocación (hallazgo 7).
8. Ajustar la verificación 6 de TASK-1 y la fila H6/H7 de STATUS (hallazgo 8).
9. (Opcionales) hallazgos 9 y 10.

### Preguntas al MID/usuario (solo las que bloquean)

- **Al usuario (STOP-1, vía v2 del plan):** elegir entre (a) inicializar `sui client` con clave real ahora y (d) `client.yaml` sin claves. Opinión del MAYOR: **(d)** para #1, porque cumple el "no configurar `sui client`" del issue, no expone ninguna frase y sirve tal cual para CI (#3); la clave publicadora se crea o importa en #8, sobre ese mismo archivo. (a) sigue siendo válida si el owner prefiere dejar resuelto ya el setup de #8. (b) queda como peor opción y (c) se descarta.

---

## Revisión v2

## Veredicto v2: APROBADO CON CAMBIOS (los cambios son puntuales, solo en la verificación 4 y el fallback de TASK-1; el STOP-1 ya puede presentarse al usuario)

> Revisión MAYOR de `documents/PLAN_TOOLCHAIN.md` **v2** · Fecha: 2026-10-30 · Ref: `feature/issue-1-toolchain`
> @ `5c583e8` (plan y revisión sin commitear). Mismo método que en v1: código de la CLI en el tag
> `testnet-v1.83.0` leído con `gh api`, sin gates y sin crear `~/.sui` (sigue sin existir). Además hice
> dos consultas de solo lectura a los endpoints públicos de testnet (JSON-RPC y GraphQL) para validar
> los comandos de la verificación 4.

### Hallazgos de v1: estado

| # v1 | Estado | Evidencia en v2 |
|---|---|---|
| 1 (opción c) | ✅ Resuelto | `PLAN_TOOLCHAIN.md:63-72, 138-139` |
| 2 (opción d) | ✅ Resuelto | `:143, 151-198`. Contenido del `client.yaml` verificado abajo |
| 3 (`-e testnet`, pin) | ✅ Resuelto en diseño; la verificación 4 tiene dos defectos (N1, N2) | `:52-59, 249-274, 298-300, 327-330` |
| 4 (`SUI_CONFIG_DIR`) | ✅ Resuelto | `:70-71, 145, 221-224` |
| 5 (PROY-11 / §2 / comentario) | ✅ Resuelto; redacción aprobada | `:106-121, 237-239` |
| 6 (`update-deps -e testnet`) | ✅ Resuelto (ver N3) | `:253` |
| 7 (incidente + `printf 'n\n'`) | ✅ Resuelto | `:74-79, 203-206` |
| 8 (`git status`, H6/H7) | ✅ Resuelto | `:275-276, 313-315` |
| 9, 10 | ✅ Incorporados | `:321-324`, `:102-105` |

### Hallazgos nuevos

| # | Severidad | Regla | Sección/Líneas | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| N1 | 🟠 MAJOR | PROY-11 (DoD de TASK-1) | `PLAN_TOOLCHAIN.md:266-267, 273-274, 280-281` | La versión de protocolo de testnet se pide por JSON-RPC (`suix_getLatestSuiSystemState`), y el fullnode público ya no sirve JSON-RPC. Consulta de hoy: `{"error":{"code":-32601,"message":"Method not found. JSON-RPC on public fullnodes has been deprecated. Please migrate to gRPC or GraphQL endpoints…"}}`. | `PV` queda vacío o `null` **siempre**: la comprobación central (SHA del lock = SHA del protocolo de testnet) nunca se ejecuta, la DoD de `:280-281` no se puede cumplir y el DEV cae siempre en "el MID decide". | Usar GraphQL (probado hoy, devuelve `139`): `PV=$(curl -s https://graphql.testnet.sui.io/graphql -H 'Content-Type: application/json' -d '{"query":"{ epoch { protocolConfigs { protocolVersion } } }"}' \| jq -r .data.epoch.protocolConfigs.protocolVersion)`. Agregar que `PV` debe ser un entero; si no, parar. |
| N2 | 🟡 MINOR | PROY-11 | `PLAN_TOOLCHAIN.md:268-269` | El `jq '.[$pv].git_revision'` busca la clave **exacta**. La CLI usa la última versión **≤ PV** (`crates/sui-package-management/src/system_package_versions.rs:51-69`, `range(..=version).next_back()`), y `manifest.json` @ `testnet-v1.83.0` tiene huecos (por ejemplo, no tiene 131, 133 ni 134). Además, si `PV` > 140 (la máxima que conoce el binario), la CLI usa 140 **sin ningún aviso** (`system_package_versions.rs:54-60`; no es el "Falling back" que busca la verificación 1). | Si testnet está en una versión que cae en un hueco, `jq` da `null` y el DEV reporta un desvío falso. Si testnet supera 140, el chequeo pasa aunque la CLI esté por detrás de la red. | Usar el piso: `jq -r --argjson pv "$PV" '[to_entries[] \| select((.key\|tonumber) <= $pv)] \| max_by(.key\|tonumber) \| .value.git_revision'`. Pegar también `jq '[keys[]\|tonumber]\|max'`: si `PV` es mayor que ese máximo, es un desvío (la CLI está detrás de testnet; actualizar con `suiup` o registrarlo). Hoy `PV = 139` → `719fb2960ccfbf9f4d33041f8ea5146d30671696`. |
| N3 | 🟡 MINOR | — | `PLAN_TOOLCHAIN.md:251-253` | El fallback `update-deps` no lleva `RUST_LOG=warn` ni `tee`, y la verificación 1 solo mira `build1.txt`. Además, con `\| tee` el `$?` es el de `tee`, no el de `sui`. | Si el lock se escribe por el fallback con la red caída, el aviso "Falling back…" no queda en ningún archivo revisado. | Fallback: `printf 'n\n' \| RUST_LOG=warn sui move update-deps -e testnet 2>&1 \| tee <scratch>/update1.txt`, y aplicarle la verificación 1. Reportar el exit code con `${PIPESTATUS[1]}`. |
| N4 | 🔵 SUGGESTION | — | `:143`, `:161` | El bloque tiene 11 líneas, no 9. `exit 1` dentro de un bloque pegado en una shell interactiva la cierra. | — | Decir "unas 11 líneas" y usar `false` / `return` o `if … then … fi` sin `exit`. |

### Validado en v2 (con evidencia)

- **`client.yaml` sin claves (`:163-175`): correcto.**
  - Los campos y los tipos coinciden con `SuiClientConfig` (`crates/sui-sdk/src/sui_client_config.rs:20-33`: `keystore`, `external_keys: Option`, `envs`, `active_env: Option`, `active_address: Option`) y con `SuiEnv` (`:89-99`: `chain_id` es opcional y puede faltar).
  - El `keystore` sigue el formato `File: <ruta>`: `Keystore` es un enum con etiqueta externa (`keystore.rs:38-43`) y la CLI usa `serde_yaml 0.8.26` (`Cargo.toml` raíz), donde `~` = `None`.
  - La URL es `SUI_TESTNET_URL` (`crates/sui-sdk/src/lib.rs:36`).
  - Con el archivo presente no hay prompt (`sui_commands.rs:1634-1636`). Un keystore inexistente carga vacío **sin escribir archivos** (`keystore.rs:401-430, 465-466`). `ensure_external_keystore_config` solo se ejecuta en `sui external-keys` (`sui_commands.rs:538-547`), así que `external_keys: ~` no se reescribe.
  - `sui client active-env` solo lee el alias (`client_commands.rs:1861-1863`).
  - Con `-e testnet` explícito, `find_environment` retorna antes de `active_environment()` (`find_env.rs:46-49`), así que no hay caché de `chain_id` ni se reescribe `client.yaml`. La verificación 5 (`active_address: ~`) es estable.
- **Verificaciones de (d) 1-5 (`:179-188`):** las cadenas `Generated new keypair` y `secret recovery phrase` coinciden con `sui_commands.rs:1712-1716`. El conteo con `python3 -I` no imprime contenido. Respondiendo `n`, la CLI aborta (`:1644-1646`).
- **TASK-1, verificaciones 1-5 (`:255-276`):**
  - Verificación 1: `RUST_LOG=warn` funciona, porque la CLI arranca con `with_log_level("error").with_env()` y un `EnvFilter::try_from_default_env()` (`crates/sui/src/main.rs:37-39`, `telemetry-subscribers/src/lib.rs:614`). Los dos textos "Falling back…" coinciden con `sui_flavor.rs:186-197`, y "Could not determine the correct dependencies" con `find_env.rs:157-160`.
  - Verificaciones 2, 3 y 5: correctas.
  - Verificación 4: `gh api …/commits/$SHA` es correcta, y `compare/$SHA...testnet-v1.83.0` da `ahead` para las revisiones de la tabla (probado con las de 130, 136, 139 y 140). Los defectos son solo N1 y N2.
- La precondición de red `curl -sI https://fullnode.testnet.sui.io:443` responde `HTTP/2 200` (`:250`).
- Opción (b) con `</dev/null >/dev/null` (`:221-224`): crea la clave y descarta la frase. Es coherente con su papel de peor opción y está declarada como excepción a `printf 'n\n'`.

### Cambios exigidos para v3

1. N1: obtener `PV` por GraphQL con el comando de arriba.
2. N2: buscar el SHA por piso (≤ PV) y comprobar `PV ≤ max(manifest)`.
3. N3: `RUST_LOG=warn` + `tee` + verificación 1 en el fallback, y exit code con `${PIPESTATUS[1]}`.

Son cambios de comando, sin efecto en el diseño ni en el STOP. No hace falta otra ronda completa del MAYOR: basta con que el orquestador confirme que v3 trae los tres comandos tal como figuran aquí. El **STOP-1 puede presentarse al usuario con la tabla de v2** (`:141-149`); recomendación: (d).
