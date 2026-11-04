APTO CON PRE-REQUISITOS

# Revisión de pre-vuelo de la publicación en testnet (#8, criterio 1)

> **Rol:** MAYOR · **Fecha:** 2026-11-03 · **Ref revisado:** `feature/issue-8-testnet-publish` @ `a6ee14c` (= `master`,
> merge de #47), sin cambios de código respecto de `master`.
> **Alcance:** (1) revisión de seguridad del paquete completo (`battleship::house` + `battleship::game`), (2) H13
> (versión de protocolo, framework y CLI), (3) validación de los pasos del owner con sus decisiones de los STOPs de #8.
> **Decisiones del owner tomadas como entrada** (registradas como `D-20261103-01` en `DECISIONES.md`, todavía sin
> commitear al cierre de esta revisión; ver P-2): (1) conserva el
> `UpgradeCap` para upgrades compatibles en testnet, a revisar antes de mainnet; (2) hasta cerrar #17 se permite
> republicar en testnet con IDs nuevos ante un cambio incompatible, después PROY-10 estricto; (3) comisión
> post-publicación = **200 bps** con `update_fee_rate`.
> **Método:** lectura completa de `contracts/` (`sources/`, `tests/`, `Move.toml`, `Move.lock`, `scripts/`, `README.md`),
> `.github/workflows/ci.yml`, el issue #8 y sus comentarios; lecturas públicas sin claves (GraphQL público de
> testnet/devnet/mainnet, código fuente de Sui en GitHub por tag, API pública de releases y de Actions). Sin
> `sui client`, sin gates (D-20261030-02), sobre `~/.sui/` solo `stat`/`ls`.

## 0. Resumen

| | |
|---|---|
| **Veredicto** | **APTO CON PRE-REQUISITOS**: el paquete no tiene hallazgos BLOCKER ni MAJOR; antes de publicar hace falta el repin del framework (H13) con sus gates, registrar las decisiones y cerrar los huecos del runbook del owner |
| **Hallazgos** | 🔴 BLOCKER **0** · 🟠 MAJOR **0** · 🟡 MINOR **7** · 🔵 SUGGESTION **5** |
| **H13** | testnet en **PV 140** (época 1273, 2026-11-03); framework de la PV 140 = `05ad86a3e86c522deea116f80dc2bf2309a53363`. La CLI **1.83.0 llega a PV 140**: **no hace falta subirla**. `Move.lock` sigue en el de la PV 139 (`719fb2960ccfbf9f4d33041f8ea5146d30671696`): **hace falta repinear** (`update-deps -e testnet`), y el repin rompe un test de los scripts que hay que ajustar en el mismo commit. Riesgo de ventana: devnet ya está en PV 141; si testnet sube a 141 antes de publicar, pasa a hacer falta subir la CLI (P-C) |
| **Pre-requisitos** | P-1 repin + ajuste del test + gates re-medidos (DEV). P-2 commitear `D-20261103-01` (con S-4 y la autorización explícita). P-3 esta revisión como comentario en #8 o en el PR. P-4 runbook del owner corregido (§3.3). P-5 re-medir la PV justo antes de publicar. P-6 árbol limpio y CI verde en el head que se publica. Lista completa en §4 |

---

## 1. Revisión de seguridad del paquete

### 1.1 Validado como correcto (con evidencia)

| Regla / tema | Evidencia | Resultado |
|---|---|---|
| **SEG-1** validación en el contrato | `game.move:95-102` (límites inclusivos `min_bet <= bet <= max_bet`, autoinvitación); `game.move:184-192` (versión, House, authZ, estado, monto exacto); `house.move:100` (`fee <= MAX_FEE_BPS`), `house.move:110` (`0 < min <= max`) | ✅ Un abort code por condición |
| **SEG-2** authZ por función | Cancelar: `sender == creator` (`game.move:124`). Rechazar: `opponent` = `some(sender)` (`game.move:132-134`). Aceptar: `!= creator` y, en invitación, `== opponent` (`game.move:188-189`). Admin: `&HouseCap` en `house.move:98,108,132,141`; `transfer_house_cap` por valor (`house.move:125`). Denegaciones con `expected_failure` en `game_tests.move:425-552, 928-949, 1060-1098`; custodia del cap en `house_tests.move:246-287` | ✅ Denegar por defecto; authZ antes que estado en cancelar/rechazar/aceptar |
| **SEG-3** secretos | Sin claves en fuentes ni scripts; fixtures de CLI con cuentas efímeras de génesis desechable (`contracts/README.md:639-642`); json de despliegue sin direcciones (`deployment.mjs:126-143`, test SEG-3 en `deployment.test.mjs`) | ✅ |
| **SEG-4** conservación — **crear** | El `Coin` entero pasa a `stake: Balance<SUI>` (`game.move:98,111`); sin vuelto ni destrucción | ✅ `stake == bet` |
| **SEG-4** — **cancelar / rechazar** | `withdraw_all` → un `Coin` → **siempre** `game.creator` (`game.move:163-173`); estado `Cancelled`; no recibe la House ni lee la versión. Tests `game_tests.move:380, 406, 487, 569, 599` | ✅ 100 % al creador, en cualquier versión |
| **SEG-4** — **aceptar** | `pot = stake + payment` (`game.move:198-199`); `fee = ⌊pot × fee_rate / 10 000⌋ ≤ pot` porque `fee_rate ≤ 1000` (copiado de una House que lo valida, `game.move:97`, `house.move:100`); `fee` → `add_fees` (`game.move:203`); `payout = pot − fee` → ganador (`game.move:231`). Invariante `payout + fee == 2 × bet`, `stake == 0`. Tests `game_tests.move:693-883, 1185` (ambos resultados, comisión 0 y máxima, redondeo, `u128`) | ✅ |
| **SEG-4** — **comisiones y retiro** | Entran solo por `add_fees` (`public(package)`, `house.move:150-153`) y salen solo por `withdraw_fees` (todo, con `&HouseCap`, `house.move:141-147`). Test `game_tests.move:804` | ✅ |
| **SEG-4** — sin SUI bloqueado | Toda partida `Pending` tiene salida por `cancel_game` del creador, sin House ni versión. Las comisiones solo quedan bloqueadas si se pierde el `HouseCap` (documentado, `contracts/README.md:106-111`) | ✅ |
| **SEG-4/SEG-6** overflow | `update_bet_limits` no acota `max_bet` por arriba (`house.move:110`), pero `pot ≤ 2 × bet` está acotado por la oferta total (10¹⁰ SUI = 10¹⁹ MIST < `u64::MAX` ≈ 1,8 × 10¹⁹) y, aunque no lo estuviera, `Balance::join` abortaría en `collect_pot`, **antes** del sorteo. `fee_amount` con intermedio `u128` (`game.move:237-239`) | ✅ Inalcanzable, y del lado seguro |
| **SEG-5/PROY-5** aleatoriedad | `entry` no `public` (`game.move:142`); `RandomGenerator` creado dentro (`game.move:156`); todo lo que aborta va antes (`assert_acceptable` + `collect_pot`, `game.move:150,155`); sorteo por índice (`game.move:157, 219-220`) | ✅ |
| **Simetría de gas del coinflip** | Tras el sorteo, `pay_winner` (`game.move:210-232`) ejecuta las mismas instrucciones con ambos resultados: `vector::borrow` con índice ∈ {0, 1} (nunca aborta), la misma variante `Resolved { acceptor, winner }` (mismo tamaño), el mismo evento y un `Coin` del mismo tamaño transferido a una dirección (costo independiente del destinatario). `generate_u8_in_range` consume un número fijo de bytes y reduce por módulo, sin bucle que dependa del valor (`sui-framework/sources/random.move:231-251, 275` @ `05ad86a3…`). En el PTB, después de un comando con `Random` solo se admiten `TransferObjects`/`MergeCoins` y el pago no se devuelve al PTB | ✅ Quien firma no puede elegir un presupuesto que solo alcance para ganar |
| **SEG-6** aritmética | Basis points con `u128`, redondeo hacia abajo a favor del ganador (`game.move:234-239`), tests de borde `game_tests.move:761, 774, 1185`; sin restas | ✅ |
| **SEG-7** objetos compartidos acotados | Sin vectores globales; un `Game` por partida (`game.move:116`); el único vector es `[creator, acceptor]` (`game.move:219`) | ✅ |
| **PROY-2** abort codes | `house` 0-4 y `game` 0-10, únicos por módulo (`house.move:15-19`, `game.move:16-26`); el 3 colisiona entre módulos y la app mapea por módulo + código (`contracts/README.md:275-279`) | ✅ |
| **PROY-3** capability | `HouseCap has key` sin `store` (`house.move:42`); `init` crea exactamente uno (`house.move:93`); `init_for_testing` es `#[test_only]` y no se publica | ✅ |
| **PROY-4** visibilidad | `public` solo `withdraw_fees` (devuelve `Coin`) y los accessors de lectura de `house`; todo lo demás `entry` o `public(package)`; `Game` sin accessors `public` | ✅ |
| **PROY-6/PROY-8** objeto y estados | `GameState` enum `Pending | Cancelled | Resolved` (`game.move:50-54`); cada función verifica `Pending` (`ENotPending`); terminales con `stake == 0` | ✅ |
| **PROY-7** eventos | Crear (`game.move:115`), cancelar/rechazar (`game.move:166`), aceptar (`game.move:222`); admin: `house.move:103, 115, 126, 136, 145`. `add_fees` no emite (el monto va en `GameResolved.fee`) | ✅ |
| **PROY-9** tests | 26 + 57 = 83 tests, cada abort con `expected_failure`, coverage 100 % (baseline de `STATUS.md`, `ac5a85c`, mismo código que `a6ee14c`) | ✅ (output revisado, no re-ejecutado) |
| **PROY-10** versionado | `House.version` + `EWrongVersion` chequeado primero en escrituras y accessors (`house.move:99,109,142,151,157,163,169,175,186-188`); `migrate` con `&HouseCap` y solo hacia arriba (`house.move:132-137`); `Game.version` fijada al crear (`game.move:106`) y comparada solo al aceptar (`game.move:185`); reembolsos sin versión | ✅ |
| CI de `master` @ `a6ee14c` | Run 41556534947 (`push`): `contracts`, `app` y `framework-drift` en *success*; única anotación: el warning H13 "Move.lock en PV 139 (719fb2960ccf)… repinear en el pre-vuelo de #8 (paso 2)" | ✅ (criterio "master con CI verde") |

### 1.2 Qué queda congelado al publicar

Política de upgrade compatible de Sui (`Compatibility::upgrade_check()`,
`external-crates/move/crates/move-binary-format/src/compatibility.rs:77-82` @ `testnet-v1.83.0`):
`check_datatype_layout: true`, `check_private_entry_linking: false` (las `entry` no `public` se tratan como privadas),
`disallowed_new_abilities: ALL`.

| Artefacto | Qué se congela | Qué sigue libre |
|---|---|---|
| Firmas `public` | `house::withdraw_fees(&mut House, &HouseCap, &mut TxContext): Coin<SUI>`; `fee_rate`, `fees_collected`, `min_bet`, `max_bet` (`&House` → valor), `version(&House): u64` — no se pueden quitar ni cambiar de firma | Su implementación (p. ej. el chequeo de versión) |
| Funciones `entry` y `public(package)` | — | Firma, cuerpo o eliminación en un upgrade. **Pero** las de la v1 siguen invocables para siempre desde el paquete v1: `cancel_game`/`reject_game` v1 nunca se pueden cerrar (no leen versión); `create_game`/`accept_game` y las de admin v1 se cierran con `migrate` |
| Structs | `House`, `HouseCap`, `HOUSE`, `Game`: campos, orden, tipos **y habilidades** (no se puede agregar `store` a `Game`, `House` ni `HouseCap`) | Structs nuevos; dynamic fields |
| Enum | `GameState`: sin variantes nuevas ni cambios de campos | — |
| Eventos | `FeeRateUpdated`, `BetLimitsUpdated`, `FeesWithdrawn`, `HouseCapTransferred`, `HouseMigrated`, `GameCreated`, `GameCancelled`, `GameResolved`: layout fijo; el tipo queda con el `originalPackageId` | Eventos nuevos |
| Abort codes | El verificador **no** los chequea: su estabilidad es convención (PROY-2, `errors.ts`) | Códigos nuevos con número nuevo |
| Fórmula de comisión | Conservarla para las partidas resueltas con la v1 (`agents.md` §5) | — |

### 1.3 Coherencia de `contracts/README.md` con el código

Revisadas una por una las tablas de objetos, constantes, funciones (firmas, visibilidad, orden de aborts), eventos y
abort codes de ambos módulos, el flujo de fondos, el versionado, la aleatoriedad y la sección de despliegues contra
`house.move`, `game.move`, `publish.mjs` y `deployment.mjs`: **coinciden**. Lo que falta es contenido operativo y de
modelo de confianza (M-2, M-3, M-6), no discrepancias.

### 1.4 Hallazgos

| # | Sev. | Regla | Archivo:línea | Problema | Escenario de falla | Corrección esperada |
|---|---|---|---|---|---|---|
| M-1 | 🟡 | PROY-11, PROY-18 | `contracts/scripts/deployment.test.mjs:37, 323-325` | El test "readFrameworkRev lee el rev de `[pinned.testnet.Sui]` del Move.lock del repo" compara el lock **real** con la constante `FRAMEWORK_REV = 719fb29…`, la misma que usan los tests del fixture (`:46, :182`) | El repin de P-1 cambia el lock a `05ad86a3…` → `node --test scripts/*.test.mjs` en rojo → job `contracts` rojo (check requerido) | En el mismo commit del repin: constante propia para el lock (`05ad86a3…`) y `FRAMEWORK_REV` solo para el fixture `localnet.deployment.json` (registro histórico, no se recaptura). No tocar `publish.test.mjs:56` ni `app/src/sui/config.test.ts:28` (datos de fixture) |
| M-2 | 🟡 | SEG-3, D-20261102-03 | `contracts/scripts/publish.mjs:491-495`; `contracts/README.md:593-595` | El comando de `update_fee_rate` y su verificación (`sui client call …`, `sui client object …`) salen **sin** `SUI_CONFIG_DIR` ni `printf 'n\n' \|` y con `<bps>`, mientras el paso 3 del README usa el prefijo en línea (no `export`) | El owner pega el comando tal cual: la CLI usa `~/.sui/sui_config/` (sin claves) y falla sin dirección activa; la tentación de "arreglarlo" agregando la clave a `~/.sui/` rompería D-20261030-07/D-20261102-03 | Runbook §3.3: `export SUI_CONFIG_DIR` en la shell de publicación, `printf 'n\n' \|` y **200**. Mensaje del script: seguimiento opcional (código, fuera de #8) |
| M-3 | 🟡 | PROY-20 | `contracts/README.md:575-600` | "Uso en testnet" no incluye: el smoke mínimo del issue (crear y cancelar con `min_bet`), la verificación de custodia de `HouseCap`/`UpgradeCap`/`Publisher` sin pegar la dirección, la verificación completa de la House, ni qué archivos deben aparecer tras publicar | El owner termina el paso 6 sin smoke ni verificación de custodia, o no nota un delta inesperado (p. ej. `Move.lock`) en lo que entrega | Pasos 7-12 del runbook §3.3; pasarlos al README en el PR de #8 |
| M-4 | 🟡 | PROY-17 | `contracts/scripts/publish.mjs:805` | `if (import.meta.main)`: con Node 20 el script no corre `main()` y sale con **0** sin imprimir nada (medido con un archivo de prueba: Node 20.20.2 → nada, exit 0; 22.23.4 y 26.13.0 → corre). El README de testnet no exige Node 26 (`engines` está en el `package.json` de la raíz, que el script no consulta) | Con otro Node por defecto, el dry run "termina bien" sin haber corrido; el owner puede darlo por bueno (falla segura: nada se publica, pero el pre-vuelo queda sin hacer) | Runbook §3.3 paso 0 (`nvm use`, `node --version` = v26) y criterio de éxito explícito ("Dry run ok. Gas estimado: …"). Guarda de versión en el script: seguimiento opcional |
| M-5 | 🟡 | D-20261102-03, PROY-18 | Issue #8, "Pasos del owner" 2, 3, 4 y 6 | Redactados antes de #7: `sui client envs/new-env/switch/active-address` sin `SUI_CONFIG_DIR` propio; paso 4 `sui move build && sui move test` sin `-e testnet --warnings-are-errors` ni `printf 'n\n' \|`; paso 6 condicional a una decisión ya tomada (200 bps) | Seguirlos al pie de la letra opera sobre `~/.sui/` o corre gates en una forma distinta de la CI | Comentario en #8 que los reemplace por el runbook §3.3 (o el README actualizado) |
| M-6 | 🟡 | PROY-10, SEG-4 | `contracts/README.md:137-151, 357-373` | No declara el modelo de confianza ni las restricciones permanentes de §1.2: (a) quien tiene el `UpgradeCap` puede publicar código nuevo que mueva todo el `stake` de las partidas `Pending` y las comisiones (las políticas `additive`/`dep_only` no lo impiden: permiten funciones nuevas; solo `make_immutable` lo cierra); (b) `cancel_game`/`reject_game` v1 son irrevocables; (c) `Game`, `House` y `HouseCap` nunca podrán tener `store` | Un upgrade futuro que guarde fondos de la partida en dynamic fields: el `cancel_game` v1 (siempre invocable) reembolsa solo `stake`, marca `Cancelled` y deja el resto huérfano | Párrafo en "Versionado" del README en el PR de #8: el titular del `UpgradeCap` es de confianza total; toda v2 mantiene `stake` como única custodia del `Game`; revisar la política del cap antes de mainnet (decisión 1) |
| M-7 | 🟡 | PROY-20 | `agents.md:177` | El cierre del smoke de localnet exige que no exista `contracts/deployments/` (ya señalado en el issue) | Tras commitear `testnet.json`, todo smoke futuro "falla" su cierre | En el PR de #8: comprobar solo `contracts/deployments/localnet.json`. No bloquea publicar |
| S-1 | 🔵 | — | `contracts/sources/house.move:42` | `HouseCap { id }` no referencia a su House; queda congelado | Un diseño futuro con varias Houses necesitaría un tipo de cap nuevo | Informativo (D-20261030-11 D1: una sola House) |
| S-2 | 🔵 | PROY-11 | — | Ensayo del camino del script con el lock repineado | Confirma que `test-publish --build-env testnet` no re-resuelve el lock nuevo y que el dry run da ok con `05ad86a3…` antes de que el owner lo haga en testnet | En P-1 (recomendado): localnet aislada, variante A con `--dry-run` y real; obligatorio si se ejecuta P-C |
| S-3 | 🔵 | — | `contracts/README.md:501` | El ejemplo "con IDs ficticios" trae el `frameworkRev` real viejo | Confunde tras el repin | Actualizarlo a `05ad86a3…` en P-1 |
| S-4 | 🔵 | SEG-4 | — | Decisión 2 (republicar hasta #17) | Tras republicar, las partidas `Pending` del paquete viejo no aparecen en la app nueva (solo se cancelan por CLI contra el paquete viejo) y las comisiones de la House vieja siguen ahí | Registrar con la decisión 2: antes de republicar, `withdraw_fees` de la House vieja y cancelar/avisar las `Pending` viejas |
| S-5 | 🔵 | — | — | Verificación post-publicación independiente | — | Un agente puede repetir con lecturas públicas gRPC (`SuiGrpcClient`, sin claves) la House, sus campos y los eventos `FeeRateUpdated`/`GameCreated`/`GameCancelled` por digest, para el reporte del PR |

---

## 2. H13 — versión de protocolo, framework y CLI

### 2.1 Mediciones (2026-11-03, lecturas públicas sin claves)

| Qué | Valor | Fuente |
|---|---|---|
| PV de testnet | **140**, época **1273** (inicio 2026-11-03 21:24:42 UTC), checkpoint 402566181 | GraphQL público `https://graphql.testnet.sui.io/graphql`, consulta `epoch { epochId protocolConfigs { protocolVersion } }` (la misma del job `framework-drift`) |
| Framework de la PV 140 | `05ad86a3e86c522deea116f80dc2bf2309a53363` | `crates/sui-framework-snapshot/manifest.json` @ `testnet-v1.83.0` (clave `140`); **idéntico** en `testnet-v1.83.1` |
| Framework en `Move.lock` | `719fb2960ccfbf9f4d33041f8ea5146d30671696` = clave `139` del manifest | `contracts/Move.lock:8, 14` |
| CLI local | `sui 1.83.0-16d2dc1e05ed` (`printf 'n\n' \| sui --version`, binario local, sin red ni config) | = `ci.yml:22-23` |
| PV máxima de la CLI 1.83.0 | **140** (`const MAX_PROTOCOL_VERSION: u64 = 140;`) | `crates/sui-protocol-config/src/lib.rs:41` @ `testnet-v1.83.0` |
| `testnet-v1.83.1` | publicado 2026-11-03 19:26 UTC; PV máxima **140**, manifest idéntico; 7 commits (allocator de `sui-tool`, kvstore/indexer, settlement en Rust, RPC/GraphQL, state-sync) | API pública de releases y `compare testnet-v1.83.0...testnet-v1.83.1` |
| Próximo salto | devnet en **PV 141** (época 28); `main` con `MAX_PROTOCOL_VERSION = 141`; mainnet en 139 | GraphQL público de devnet/mainnet; `lib.rs` @ `main` |
| Cadencia observada | testnet-v1.80.0 (09-15) → v1.81.0 (09-29) → v1.82.1 (10-13) → v1.83.0 (10-27); la PV 140 se activó en testnet 3 días después (época 1269, 10-30) | Releases públicos y STATUS H13. **Estimación** (no medida): `testnet-v1.84` hacia el 2026-11-10 y PV 141 en testnet días después |
| JSON-RPC del fullnode público de testnet | `rpc.discover` → `-32601` "JSON-RPC on public fullnodes has been deprecated" | Informativo: la CLI 1.83 opera por gRPC (lo usan `sui_flavor.rs` y `client_commands.rs` abajo) |
| `~/.sui/sui_config/` | solo `client.yaml` (244 B, mtime 2026-10-30 17:52), sin keystore | `ls`/`stat` |

### 2.2 Cómo resuelve el framework la CLI 1.83.0 (código fuente @ `testnet-v1.83.0`)

- `crates/sui-package-alt/src/sui_flavor.rs:78-98, 179-199`: en modo conectado consulta la PV de la red por gRPC
  (cliente del env activo de la config) y toma del manifest los paquetes de sistema de esa PV; offline, o si la consulta
  falla, usa `ProtocolVersion::MAX` (140) con un warning; si la PV de la red no está en su manifest, cae a "los
  últimos conocidos" (140) con un warning. Hoy las tres vías dan `05ad86a3…`.
- `crates/sui-move/src/lib.rs:52` y `update_deps.rs`: `sui move update-deps` usa ese `SuiFlavor` conectado; con
  `-e testnet` el entorno sale del manifest y no escribe el cache `chain_id` de la config (`sui-package-alt/src/find_env.rs:31-49`).
- `external-crates/move/crates/move-package/src/graph/builder.rs:76-125`: si los digests de manifest coinciden, el
  grafo se carga del lock tal cual. **Ni `build` ni `publish` repinean solos**; `publish` compila contra el `rev` del lock.
- `crates/sui/src/client_commands.rs:3893-3910`: `publish` solo **avisa** si la PV de la red supera la de la CLI en más
  de 2. `:3919-3929` + `:4356-4359`: el chequeo de compatibilidad de `upgrade` **aborta** si la PV de la red supera la
  de la CLI → los upgrades futuros exigirán una CLI al día.

### 2.3 Conclusión

1. **CLI: no hace falta subirla hoy.** PV máxima 140 ≥ PV de testnet 140. Se recomienda **quedarse en 1.83.0**:
   `1.83.1` no cambia la PV ni el framework, y subir obliga a tocar `ci.yml` (4 valores), `publish.test.mjs:480-481`
   (acoplado al `ci.yml` real) y a recapturar `contracts/scripts/fixtures/`.
2. **Repin: sí hace falta** (P-1): `719fb29…` (PV 139) → `05ad86a3…` (PV 140). Técnicamente la publicación sin repin
   funcionaría (los upgrades del framework son compatibles, `publish` no repinea y la guarda "repin pendiente" no
   saltaría), pero el `frameworkRev` registrado en `testnet.json` no sería el framework de la red, el `framework-drift`
   seguiría en warning y una verificación de fuentes contra la red fallaría. Es además el plan aprobado de H13 y del
   issue (comentario del 2026-10-30).
3. **Ventana:** publicar mientras testnet siga en PV 140. Si en el momento de publicar la PV es ≥ 141, hace falta
   P-C (subir la CLI) y repinear de nuevo; el dry run del owner **no** lo detecta (solo avisa con más de 2 de
   diferencia), por eso P-5 lo mide a mano.

### 2.4 P-1 — repin (lo ejecuta un DEV en esta branch; nadie lo ejecutó en esta revisión)

1. **Línea base**, sin cargar nada de `~/.sui/`: `stat -c '%y %s %n' <HOME real>/.sui/sui_config/client.yaml` y
   `ls <HOME real>/.sui/sui_config/`; `printf 'n\n' | sui --version` = `sui 1.83.0-16d2dc1e05ed`; PV de testnet por
   GraphQL público = **140** (si no, STOP → P-C).
2. `cd contracts && printf 'n\n' | sui move update-deps -e testnet` (exit 0). Usa la config sin claves con
   `active_env: testnet`; solo hace una lectura gRPC pública de la PV.
3. `git diff -- contracts/Move.lock`: lo esperado es solo el `rev` de `[pinned.testnet.MoveStdlib]` y de
   `[pinned.testnet.Sui]` (`719fb29…` → `05ad86a3…`, iguales entre sí y = clave `140` del manifest) y, si cambian, sus
   `manifest_digest`; `[pinned.testnet.battleship]` y `[move] version = 4` sin cambios; ninguna sección
   `[pinned.<otro env>]`. Cualquier otro delta: STOP.
4. `stat`/`ls` de `~/.sui/sui_config/` idénticos a la línea base (si cambió, declararlo).
5. M-1: en `contracts/scripts/deployment.test.mjs`, el test de `:323-325` pasa a comparar con `05ad86a3…` (constante
   propia); los tests del fixture siguen con `719fb29…`. S-3: ejemplo de `contracts/README.md:501`.
6. **Gates re-medidos** (forma canónica de `agents.md` §3, desde `contracts/`, con `printf 'n\n' |`):
   `sui move build -e testnet --warnings-are-errors` (esperado 0 warnings), `… --lint …` (0 lints),
   `sui move test -e testnet --warnings-are-errors` (83 PASS), coverage (informativo, 100 %),
   `node --test scripts/*.test.mjs` (99 PASS), `node scripts/publish.mjs check` (0 despliegues),
   `git diff --exit-code -- Move.lock` tras los gates (sin delta respecto del lock repineado). Declarar la descarga del
   framework nuevo en la caché de Move.
7. Recomendado (S-2): ensayo en la localnet aislada (`agents.md` §3), variante A con `--dry-run` y real: "Dry run ok",
   sin aviso de `Move.lock`, `frameworkRev` = `05ad86a3…` en el json de salida; cierre completo del paso 7.
8. Docs (PROY-20): `STATUS.md` (fila "Framework" de Toolchain, H13 con fecha/época/PV del repin, fila de baseline
   nueva); delta del lock declarado en el reporte (PROY-11).
9. **CI del PR:** `contracts` verde (miss de la caché `move-git-…`, esperado: la clave depende del lock), `app` verde y
   `framework-drift` **sin** el warning H13 ("lock al día" en el resumen).

### 2.5 P-C — subir la CLI (condicional: solo si la PV de testnet es ≥ 141 al publicar)

1. Elegir el release `testnet-v<X>` cuyo `MAX_PROTOCOL_VERSION` (`crates/sui-protocol-config/src/lib.rs` en el tag) sea
   ≥ la PV de testnet y cuyo `manifest.json` tenga esa PV.
2. DEV: instalar ese release con `suiup` y dejarlo por defecto (sintaxis según `suiup --help` de la 0.1.1 instalada);
   `printf 'n\n' | sui --version`.
3. `ci.yml:22-25`: `SUI_VERSION`, `SUI_COMMIT`, `SUI_TGZ_SHA256`
   (`gh api repos/MystenLabs/sui/releases/tags/testnet-v<X> --jq '.assets[] | .name + " " + .digest'`, asset
   `sui-testnet-v<X>-ubuntu-x86_64.tgz`) y `SUI_BIN_SHA256` (`sha256sum` del binario local). `publish.mjs` exige
   CLI = `ci.yml` en testnet (`publish.mjs:325-336`).
4. `contracts/scripts/publish.test.mjs:480-481` a la versión nueva.
5. Recapturar `contracts/scripts/fixtures/` en la localnet aislada con la CLI nueva (`contracts/README.md:639-642`):
   `parsePublishedToml` es estricto a propósito (`deployment.mjs:276-332`) y un cambio de formato de la CLI solo se
   vería **después** de la publicación real (fallo post-publicación → `record`). S-2 pasa a obligatorio.
6. Repin (P-1, pasos 2-6) al framework de la PV nueva.
7. Gates completos de `contracts` y `app` (CI) y `STATUS.md` (Toolchain, H1, H13).

---

## 3. Pasos del owner

### 3.1 `contracts/README.md` → "Uso en testnet (solo el owner)" (`:575-600`)

| Paso | Estado | Observación |
|---|---|---|
| 1. Config propia | ✅ | Coincide con `checkConfigDirGuard` (`publish.mjs:221-254`). Env testnet con RPC `https://fullnode.testnet.sui.io:443` (el de `ci.yml:86`; gRPC). Faltan Node 26 y el `export` (M-2, M-4) |
| 2. Pre-vuelo H13 | ✅ con precisión | "Árbol limpio" = todo el repo, también archivos sin trackear (`git status --porcelain`, `publish.mjs:344`): este documento y el lock repineado deben estar commiteados; `HEAD` = el commit con CI verde, porque es el `sourceCommit` |
| 3. Dry run | ✅ | Guardas reales: env, chain id, CLI = `ci.yml`, árbol limpio, sin publicación previa, lock sin cambio (`publish.mjs:643-701`). Falta el criterio de éxito visible (M-4) |
| 4. Publicación | ✅ | Confirmación con TTY (`publish.mjs:703-706`); verifica json ↔ `Published.toml` (`:722-728`). Falta revisar `git status` después (M-3) |
| 5. Comisión | 🟡 | Sin `SUI_CONFIG_DIR`/`printf` y con `<bps>` (M-2); verificación incompleta (solo `fee_rate`) |
| 6. Entrega | 🟡 | Falta el smoke y la custodia de los caps (M-3); el directorio temporal conviene borrarlo **después** de que la CI del PR pase `check` (hasta entonces sirve para `record`) |

### 3.2 Issue #8 → "Pasos del owner"

Pasos 1, 5 y 7 vigentes. Pasos 2, 3, 4 y 6 superados por #7/#39 y por las decisiones (M-5). El criterio "HouseCap y
UpgradeCap en la dirección del owner" debe incluir también el `Publisher` (lo crea `init` con `claim_and_keep`,
`house.move:84`).

### 3.3 Runbook propuesto (completo, con las decisiones del owner)

Lo corre **solo el owner**, en su terminal. Nada de lo que imprime la CLI se pega, salvo los digests y los IDs
públicos que imprime el script. `<dir>` = un directorio privado del owner (p. ej. el `battleship-publish-*` que crea el
script, `0700`).

0. **Shell de publicación** (en `<repo>`, branch `feature/issue-8-testnet-publish`):
   - `git status --porcelain` vacío; `git log -1 --format=%H` = el head del PR con CI verde (P-6).
   - `nvm use` → `node --version` = `v26.x` (M-4). `printf 'n\n' | sui --version` = la de `ci.yml`
     (`sui 1.83.0-16d2dc1e05ed` salvo P-C).
   - `export SUI_CONFIG_DIR=<su dir>` (absoluto, fuera de `~/.sui/`), **solo en esta shell**.
   - `printf 'n\n' | sui client active-env` → `testnet`; `printf 'n\n' | sui client active-address` = la dirección que
     también usará en la wallet del navegador (recibe el `HouseCap`, que no se mueve con "Send"); no se pega.
   - Saldo suficiente (`printf 'n\n' | sui client gas`, no se pega) para el gas estimado del paso 1 más ≈ 0,05 SUI
     (comisión + smoke). Faucet de testnet: verificar la vía vigente (probablemente la web del faucet).
   - **P-5:** PV de testnet = **140** con la consulta GraphQL pública de §2.1. Si no: no publicar (STOP → P-C).
1. `cd contracts && node scripts/publish.mjs publish --network testnet --dry-run; echo "exit=$?"` → debe imprimir
   **"Dry run ok. Gas estimado: N MIST."** y `exit=0`. Sin esa línea, no seguir.
2. `node scripts/publish.mjs publish --network testnet` → escribir `testnet` → resumen con los 14 campos,
   el directorio temporal y el siguiente paso. Ante cualquier error: "Recuperación" del README (nunca reintentar sin
   buscar el digest).
3. `git status --porcelain` → **exactamente** `?? contracts/Published.toml` y `?? contracts/deployments/`. Cualquier otro
   cambio (p. ej. `M contracts/Move.lock`): STOP, se reporta sin commitear.
   `node scripts/publish.mjs check` → "1 despliegue(s) válidos y coherentes con Published.toml".
4. **Comisión = 200 bps**, antes de cualquier partida:
   `printf 'n\n' | sui client call --package <packageId> --module house --function update_fee_rate --args <houseId> <houseCapId> 200 --json > <dir>/fee.json`
   → `jq -r '.digest, .effects.status.status' <dir>/fee.json` = digest + `success`; evento `FeeRateUpdated` con
   `old_fee_rate` 0 y `new_fee_rate` 200.
5. **House:** `printf 'n\n' | sui client object <houseId> --json > <dir>/house.json` → dueño `Shared`; `fee_rate` 200,
   `min_bet` 1000000, `max_bet` 50000000000, `version` 1, `fees_collected` 0.
6. **Custodia sin pegar la dirección:** `A="$(printf 'n\n' | sui client active-address)"`; para cada ID
   (`<houseCapId>`, `<upgradeCapId>` y el `Publisher`, cuyo ID no está en el resumen del script:
   `jq -r '.objectChanges[] | select(.objectType=="0x2::package::Publisher") | .objectId' <dir>/publish-output.json`):
   `printf 'n\n' | sui client object <id> --json | grep -c "$A"` ≥ 1. Se reporta solo "sí/no" por objeto.
7. **Smoke — crear** con `min_bet`:
   `printf 'n\n' | sui client ptb --split-coins gas "[1000000]" --assign c --move-call <packageId>::game::create_game @<houseId> c.0 none --json > <dir>/smoke-create.json`
   → `success`; `GameCreated` con `bet` 1000000, **`fee_rate` 200** (prueba que la partida copió la comisión nueva) y
   `opponent` nulo. `GAME` = `jq -r '.objectChanges[] | select(.type=="created" and (.objectType|endswith("::game::Game"))) | .objectId' <dir>/smoke-create.json`.
8. **Smoke — cancelar:**
   `printf 'n\n' | sui client call --package <packageId> --module game --function cancel_game --args <GAME> --json > <dir>/smoke-cancel.json`
   → `success`; `GameCancelled` con `refund` 1000000 y `cancelled_by` = `creator`; objeto `Cancelled` con `stake` 0;
   el saldo del owner baja solo el gas de las dos transacciones.
9. **Entrega al orquestador:** `contracts/deployments/testnet.json` y `contracts/Published.toml` (sin editar), los
   digests de publicación, comisión, crear y cancelar, y "sí/no" del paso 6. Nada más del directorio.
10. El orquestador commitea en esta branch; la CI del PR debe pasar `check`. Merge con **merge commit**, sin rebase ni
    squash de esta branch después de publicar (`sourceCommit` debe seguir existiendo en `master`).
11. Recién con la CI del PR en verde: borrar `<dir>` y el `battleship-publish-*` (contienen la salida cruda con la
    dirección).

---

## 4. Pre-requisitos antes de que el owner publique

| # | Qué | Quién | Bloquea |
|---|---|---|---|
| P-1 | Repin `update-deps -e testnet` → `05ad86a3…`, ajuste de `deployment.test.mjs` (M-1), gates re-medidos y STATUS (§2.4); ensayo en localnet recomendado (S-2) | DEV (+ MID revisa, orquestador commitea) | Sí |
| P-2 | `D-20261103-01` ya recoge las tres decisiones: commitearla; agregar a la decisión 2 la operación de S-4; y, para cumplir el criterio 2 de #8 a la letra, una línea con la **autorización explícita** del owner para esta publicación (hoy dice que la autorización se da al ejecutarla) | Orquestador, con el owner | Sí |
| P-3 | Publicar esta revisión como comentario en #8 o en el PR (criterio 1 de #8) | Orquestador | Sí |
| P-4 | Runbook del owner corregido: §3.3 de este documento, o el README "Uso en testnet" actualizado con él (M-2, M-3, M-4), y un comentario en #8 que reemplace los pasos viejos (M-5) | MID/DEV (docs) | Sí (que el owner tenga el runbook correcto) |
| P-5 | Re-medir la PV de testnet justo antes de publicar: 140 → seguir; ≥ 141 → P-C y repin de nuevo | Owner (lectura pública) | Sí |
| P-6 | Todo commiteado y pusheado (incluido este documento); CI del PR verde en el head a publicar (`contracts`, `app`, `framework-drift` sin H13) | Orquestador | Sí |
| — | M-6 y M-7 (README "Versionado", `agents.md:177`), fila de despliegue en `STATUS.md`, `agents.md` §5/§12 y README "Despliegues" con el package ID | Mismo PR de #8, después de publicar | No bloquean la publicación |

---

## 5. Higiene de este documento

- Sin rutas personales (`<repo>`, `<HOME real>`, `<dir>`, `<su dir>`), sin direcciones de cuentas, sin claves.
- Hex de 40-64 caracteres presentes, todos públicos y declarados: `05ad86a3e86c522deea116f80dc2bf2309a53363` (git rev
  del framework de Sui de la PV 140) y `719fb2960ccfbf9f4d33041f8ea5146d30671696` (git rev del framework de la PV 139).
  Resto de identificadores: SHAs cortos de este repo (`a6ee14c`, `ac5a85c`), commit corto de la release de la CLI
  (`16d2dc1e05ed`) e IDs de runs de Actions.
