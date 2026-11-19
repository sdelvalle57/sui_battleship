# HANDOFF_README
> Plan: PLAN_README v1 (aprobado por el MAYOR, 2026-11-04) | Issue: #16 (TASK-5 cierra también #15) | Branch:
> `feature/issue-16-readme` (TASK-1..TASK-4, PR #62 mergeado) y `feature/issue-16-task5` (TASK-5) |
> Versión: v1.3.1 | Fecha: 2026-11-19 | Autor: MID | Estado: v1.3.1, aprobada por el MAYOR; TASK-5 autorizado

**Changelog v1.3.1** (revisión del MAYOR de la v1.3: APROBADO CON CAMBIOS, 2 🟠, 6 🟡 y 5 🔵, todos tomados sin otra ronda;
la verifica el orquestador con `git diff`):
- **🟠1:** el chequeo de `closingIssuesReferences` pasa a GraphQL con `sort` (§R-9 y §9): `gh pr view --json` no tiene ese
  campo en el `gh` 2.46.0. Esperado: `[15,16]`.
- **🟠2:** B-5 queda ✅ por el criterio de consola, y el ícono remoto de Slush queda **no concluyente**: con la extensión
  de Slush, `registerSlushWallet` (`@mysten/slush-wallet` 1.3.5) no pide la metadata, y `api.slush.app` sigue en 403. Se
  corrigen §3, D.2 (B-5) y D.3, y se suma **B.8** (`app/README.md:166-167`). El seguimiento va en #17 (observación con un
  perfil de navegador sin la extensión), no en un issue nuevo.
- **🟡3:** A.5, B.1, C.4 y E.2 separan el mecanismo (Railway publica los pushes a `master` que tocan las watch paths,
  después de *Wait for CI*) de la autorización (D-20261119-02, con la revisión del MAYOR). C.4 **reemplaza** el texto de
  `agents.md:410`.
- **🟡4:** B.6 ya no dice que la nota "sale siempre" (falta con «Sin partidas abiertas en lo revisado»), y `<fecha>` va en
  código en B.6 y en B-3.
- **🟡5:** el texto obligatorio de S-8 se cita como "igual en `1c2bb2a` (v1.2.1 de #17) y en la v1.3.1 de
  `HANDOFF_SMOKE_MVP.md`". "Historial podado (v1.3)" y DL-14 se citan de la v1.3.1 (branch `feature/issue-17-mvp-smoke`,
  sin SHA). §9 exige que esa versión esté commiteada antes del merge.
- **🟡6:** A.4 declara que se aparta del literal de S-8 ("no requerido") por D-20261119-02. TASK-5 suma **F**, el comentario
  de `.github/workflows/ci.yml:185` (solo comentario, con actionlint; no es watch path de Railway), y el grep de
  "requerido" lo incluye.
- **🟡7:** §9.3 pasa al MID de #17 el hallazgo de R-8 (`agents.md:251`) y las referencias a `HANDOFF_RAILWAY_DEPLOY.md`.
- **🟡8:** C.3 da el párrafo `agents.md:230-233` completo.
- **🔵9:** §R-9 suma una segunda pasada sin saltos de línea.
- **🔵10:** B-1 aclara que `testnet · nodo OK` lo escribió el orquestador.
- **🔵11:** nuevo B.4 bis: el paso 4 del checklist dice cómo dejar el builder y los comandos.
- **🔵12:** E.3 escribe la URL, no `<URL>`.
- **🔵13:** los cuatro greps de §R-6 corren también sobre el body del PR. La coincidencia del grep 3 con su propio patrón
  se clasifica como "el patrón". El título del PR es el asunto del commit de TASK-5.

**Changelog v1.3** (addendum S-8 de `HANDOFF_SMOKE_MVP.md` de #17, con el texto obligatorio igual en `1c2bb2a` (v1.2.1) y en
la v1.3.1: #8 mergeado, TASK-6 de #15 mergeado y S-7 hecho por el owner; autoriza TASK-5):
- **Estado:** TASK-3 y TASK-4 en PASA, mergeados con PR #62 (`eb5332e`, `Refs #16`). TASK-5 **autorizado**, en la branch
  `feature/issue-16-task5` desde `master` `b7aa568` (reemplaza a `docs/issue-16-testnet` de la v1.2).
- **§0:** baseline v1.3 de `master` `b7aa568`, leído de la CI ([run 44593441691](https://github.com/sdelvalle57/sui_battleship/actions/runs/44593441691)).
  El de la v1.2 queda como referencia.
- **Decisiones:** D-20261103-01 ya está en `master` (sin `(PR #48)`). Se suman D-20261119-01 (cierre accidental de #15:
  mergear y reabrir), D-20261119-02 (N-2 preautorizado y `deploy-image` requerido) y D-20261104-05 (2) (el cierre de #15
  va en este PR). D-20261104-05 todavía está **solo** en la branch de #17: se cita con
  `git show 1c2bb2a:documents/DECISIONES.md` y llega a `master` con #17.
- **TASK-5 reescrito** con el texto obligatorio de S-8:
  - la URL en `README.md` y en `app/README.md:71-73`;
  - el smoke B del owner en `SMOKE_RAILWAY_DEPLOY.md`;
  - el 🔵 de `README.md:74`;
  - `Closes #15` y `Closes #16`, **solo** en el body del PR.
- **Además, en TASK-5:**
  - todo lo que todavía dice que `deploy-image` no es requerido (`app/README.md`, `agents.md`);
  - el paso 10 del checklist de Railway, cumplido por D-20261119-02;
  - la falla del primer deploy de S-7 como ayuda en el paso 8;
  - la nota de la publicación podada donde los docs prometen leerla (`app/README.md:414-416`, `README.md:44-46`);
  - STATUS: filas de #15 y #16, "Siguiente", S-7 y los pendientes del owner.
- **Líneas re-medidas** en `b7aa568`. `README.md:27` ya no tiene "(PR #48)": lo quitó TASK-6 de #8 (no-op).
- **IDs (D-20261104-04 (2)):** el README no copia ninguno, tampoco el `packageId`. TASK-5 no agrega IDs completos a
  ningún archivo. Las abreviaturas de la §R-6 salen de `jq -r` sobre `testnet.json`.
- **§R-3 → §R-6 de #17 para TASK-5:** cuatro greps con `/usr/bin/grep` sobre las líneas agregadas, con la regla de
  atribución de las abreviaturas 4+4. Sin direcciones de cuenta, ni completas ni abreviadas, y sin volcados del DOM.
- **Palabras de cierre (lección de D-20261119-01):** ningún mensaje de commit lleva `close[sd]?|fix(e[sd])?|resolve[sd]?`
  delante de un issue. `Closes #15` y `Closes #16` van **solo** en el body del PR, con el chequeo antes del merge.
- **Housekeeping** del merge de TASK-5: cierra los ciclos de #15 y #16 (plan del orquestador al final de TASK-5).
- **Renombre:** la casilla de los settings "About" del repo, que en la v1.2 se llamaba N-4, pasa a **N-About**. N-4 es
  ahora el check requerido de #15 (D-20261119-02).
- **Riesgos:** N-2 resuelto por D-20261119-02; se suman R-6 (palabras de cierre), R-7 (STATUS al mergear #17) y R-8 (la
  ventana "≈ 14,6 días" es de #17, DL-14).

**Changelog v1.2** (se cumple la precondición de TASK-3: PR #59 de #14 y PR #57 de #15 `MERGED`; `master` `5e51356` traído
a la branch con el merge `7766126`):
- §0: baseline del `master` nuevo (app **1156 tests en 65 archivos**, `index-*.js` 917.02 kB) y el anterior como
  referencia de TASK-1/TASK-2;
- tabla de estado: TASK-1 y TASK-2 en PASA; TASK-3 **autorizado**;
- TASK-3: insumos verificados en `5e51356` (ruta y textos del panel, anclas, `Dockerfile`/`.dockerignore`, issue nuevo
  #60) y los hallazgos H-1/H-2 de la revisión de TASK-2;
- TASK-4: corrige la fila de #15 en STATUS si sigue sin registrar el merge de PR #57.

**Changelog v1.1** (revisión del MAYOR del handoff v1, APPROVE con 2 MINOR y 4 sugerencias, todas tomadas):
- MINOR-1: el build de TASK-1 §5 escribe a un log con `echo "exit=$?"`, sin `| tee`, para no tapar el exit code; el
  `grep "Updating dependencies"` corre sobre ese log;
- MINOR-2: nueva §R-8. Toda mención `#N` / `PR #N` del README va con URL completa y la verifica §R-4. La única excepción
  es el literal `se completa después de #8`;
- sugerencia 1: la precondición de TASK-3 verifica con `gh` que los PRs de #14 y #15 están `MERGED`, con `git fetch`;
- sugerencia 2: la lista de lo prohibido admite las cifras que fija una decisión, con la decisión citada al lado;
- sugerencia 3: las líneas de reemplazo de TASK-5 llevan su marcador de lista;
- sugerencia 4: N-3 deja TASK-1 **frenado**, no en fallback, hasta que decida el MID.

**Changelog v1:** primera versión. Incorpora la revisión del MAYOR del plan v1 (APPROVE):
- MINOR-1: el placeholder va entero en un renglón y se cuenta de dos formas (§R-2);
- sugerencia 1: N-2 nombra también `app/package.json`;
- sugerencia 2: el gas y el depósito de storage van como una línea genérica con enlace, sin cifras;
- sugerencia 3: la comisión de testnet se escribe como "valor inicial de 200 bps (D-20261103-01); la vigente la muestra
  la app". Deja de ser placeholder: quedan **2** placeholders, no 3;
- sugerencia 4: Docker solo en TASK-3.

## Historia de usuario

**Como** visitante del repo público (un jugador que quiere probar el juego en testnet o un desarrollador que quiere
correrlo o contribuir), **quiero** un README raíz que diga qué es el juego de verdad (1 vs 1, coinflip on-chain como
placeholder de la batalla naval), sus reglas y sus riesgos, cómo jugarlo en testnet, cómo está armado el monorepo y cómo
levantarlo en local, **para** entender y usar el proyecto sin leer el código ni los documentos internos de los agentes.

**Scope en una frase:** reescribir `README.md` enlazando a los READMEs de área sin copiar sus tablas, completar los
campos `license` que faltan y actualizar `agents.md` §14 y STATUS H10.

**Lo que NO entrega:** la URL pública ni los IDs de testnet (los completa TASK-5 después de #8); cambios de contrato, de
app o de CI; tablas de funciones, eventos, abort codes o capas; la batalla naval real (#18); traducciones; el smoke
end-to-end (#17).

## Qué se implementa ya y qué espera

| Task | Área | Estado de este handoff | Precondición |
|---|---|---|---|
| TASK-1 | contracts + app (manifiestos) | **PASA** (`3776c3d`) | Ninguna |
| TASK-2 | docs (`README.md`) | **PASA** (revisión en `REPORTES_README.md`) | TASK-1 en PASA |
| TASK-3 | docs (`README.md`) | **PASA** (`f125e5d`) | Cumplida: PR #59 y PR #57 `MERGED`, `master` `5e51356` en la branch (`7766126`) |
| TASK-4 | docs (`agents.md`, STATUS) | **PASA** (`fc5f004`) | La misma que TASK-3, y TASK-3 en PASA |
| TASK-5 | docs (PR de seguimiento, cierra #15 y #16) | **Autorizado** (v1.3.1, aprobada por el MAYOR) | Cumplida al 2026-11-19: #8 mergeado (`acdc669`), TASK-6 de #15 mergeado (`376412f`), S-7 hecho por el owner y D-20261119-02 en `master` (ver TASK-5) |

El PR principal (TASK-1..TASK-4) se mergeó como PR #62 (`eb5332e`, `Refs #16`). TASK-5 va en otro PR, con `Closes #15` y
`Closes #16` (D-20261104-04 (1); D-20261104-05 (2), en `git show 1c2bb2a:documents/DECISIONES.md`). El housekeeping del
merge de TASK-5 borra los artefactos de #15 y de #16 y cierra los dos ciclos. Hasta entonces viven en `documents/`.

## 0. Baseline de gates verificado

### v1.3 (2026-11-19, `master` `b7aa568`): el de TASK-5

`b7aa568` es el merge de PR #67 (D-20261119-01/02 y STATUS) sobre `376412f`, el merge de PR #65 (TASK-6 de #15).
`git diff --stat 376412f b7aa568` solo toca `documents/DECISIONES.md` y `documents/STATUS.md`. La CI del push a `master`
([run 44593441691](https://github.com/sdelvalle57/sui_battleship/actions/runs/44593441691)) da `contracts`, `app`,
`deploy-image` y `framework-drift` en success. Los valores salen de su log; el MID no corre gates.

| Área | Valor |
|---|---|
| Sui CLI / Node | `sui 1.83.0-16d2dc1e05ed` / `v26.13.0` (npm `11.20.0`) |
| contracts | `Test result: OK. Total tests: 83`; scripts `ℹ tests 104`, `ℹ fail 0`; `publish.mjs check` = `1 despliegue(s) válidos y coherentes con Published.toml` |
| app | `npm ci` 293 paquetes; 292 firmas; `found 0 vulnerabilities` (producción); **1156 tests PASS en 65 archivos**; `dist/assets/index-B3BeMVQC.js   917.80 kB │ gzip: 277.96 kB` |
| imagen (`deploy-image`, **requerido** desde D-20261119-02) | camino **positivo**: `P7 ok: /assets/index-B3BeMVQC.js 200 … immutable`, `P8 ok: … (zstd)`, `OK (positivo): …` |
| `framework-drift` (informativo) | success con `##[warning]CLI atrasada: testnet en PV 142, la CLI 1.83.0 llega a 140` (STATUS H13; no afecta al paquete publicado) |
| checks requeridos de `master` | `contracts`, `app` y `deploy-image`, `strict: false` (D-20261119-02 (2); leído por el MID con `gh api …/branches/master/protection/required_status_checks`) |

Rojos conocidos: ninguno. TASK-5 solo toca docs: no corre gates de código. La CI del PR de TASK-5 tiene que dar estos
mismos valores (sin delta) en los tres checks requeridos.

### v1.2 (2026-11-04, `master` `5e51356`; branch en `7766126`): referencia de TASK-3 y TASK-4

`5e51356` es el merge de PR #57 (#15) sobre `612821b` (housekeeping de #14, después del merge de PR #59 en `b35cb2d`).
`git diff 01d0fbc 5e51356` está vacío, así que el código es el mismo que midió la CI del head de PR #57
([run 41815198867](https://github.com/sdelvalle57/sui_battleship/actions/runs/41815198867): `contracts`, `app`,
`deploy-image` y `framework-drift` en success). `git diff 5e51356 7766126` solo toca los archivos de #16: `README.md`, los
4 manifiestos de TASK-1 y `documents/`. Valores leídos de esa CI (logs de los jobs `app` y `contracts`) y de STATUS de la
branch; el MID no corre gates.

| Área | Medido en | Valor |
|---|---|---|
| Sui CLI | STATUS → Toolchain; `ci.yml` | `sui 1.83.0-16d2dc1e05ed` (release `testnet`) |
| Node / npm | STATUS → Toolchain | `v26.13.0` / `11.20.0` |
| contracts: build / `--lint` / test | CI run 41815198867, job `contracts`; sin cambios en `contracts/sources`, `tests` ni `Move.lock` desde `8fddbda` | **0 warnings / 0 lints / 83 tests PASS**, `Move.lock` sin delta |
| contracts/scripts | La misma CI; sin cambios en `contracts/scripts` desde `380bce6` | `node --test` **99 PASS**; `publish.mjs check` **0 despliegues** |
| app | La misma CI, job `app`; STATUS, fila de TASK-5b de #14 (`72858b8`) | `npm ci` 293 paquetes; 292 firmas; 0 vulnerabilidades de producción (11 *moderate* solo dev, #35); lint **0 problemas**; typecheck **0 errores**; **1156 tests PASS en 65 archivos**; `index-*.js` **917.02 kB (277.43 kB gzip)** |
| imagen | La misma CI, job `deploy-image` (no requerido) | Camino **negativo** (sin `testnet.json`, la imagen se niega a construirse) |

Rojos conocidos: ninguno. TASK-3 y TASK-4 solo tocan docs, así que no llevan gates de código. La CI del PR principal
tiene que dar estos mismos valores más TASK-1 (que no cambia ningún conteo).

**Baseline anterior** (para TASK-1 y TASK-2, `deaadbb`): el mismo de contracts y scripts; app 915 tests en 57 archivos y
`index-*.js` 901.45 kB. Lo usaron los reportes de TASK-1 y TASK-2 y queda solo como referencia.

## Decisiones vigentes (no reabrir)

| ID | Qué fija para este handoff |
|---|---|
| D-20261030-14 | Apache-2.0: `LICENSE` en la raíz y headers SPDX en los fuentes Move (incluidos los tests). Titular `sdelvalle57` |
| D-20261030-10 (3) | Node 26 (no 22, aunque el issue diga 22) |
| D-20261030-15 (2) y (1) | Sin módulo Escrow: la apuesta vive en cada `Game`. La partida terminada se conserva y su depósito de storage no se recupera |
| D-20261030-16 | Aceptar y resolver en la misma transacción; comisión sobre el pozo completo, redondeada hacia abajo |
| D-20261103-03 | Las listas de testnet cubren la ventana del fullnode (≈ 14,6 días); seguimiento en #51 |
| D-20261103-01 (3) | Comisión inicial en testnet: 200 bps. En `master` desde #8 (`acdc669`); el README ya lo cita sin `(PR #48)` (v1.3) |
| D-20261104-04 | P-1 = (a) `Refs #16` y `Closes #16` en el seguimiento; P-2 = (a) el README enlaza `testnet.json`, nunca copia IDs; P-3 = (a) README en español. Tomadas por el orquestador por delegación (D-20261104-01) |
| D-20261104-05 (2) (v1.3) | La URL de `app/README.md`, el registro del smoke B de #15 y `Closes #15` van en el PR de TASK-5 de #16, que también lleva `Closes #16`. **Solo en la branch de #17:** `git show 1c2bb2a:documents/DECISIONES.md`; llega a `master` con #17. No se cita en el README (§R-5) |
| D-20261119-01 (v1.3) | #15 se cerró por el "Closes #15" del mensaje de `5af2fb0` y se reabrió ("mergear y reabrir"). Antes de mergear cualquier PR, el orquestador corre el grep de palabras de cierre sobre los mensajes de los commits (§R-9) |
| D-20261119-02 (v1.3) | (1) **N-2:** cada merge a `master` con la CI en verde y la revisión de integración del MAYOR publicada queda preautorizado como publicación del sitio, sin el owner presente. (2) **N-4:** `deploy-image` es check requerido junto a `contracts` y `app`. URL pública: `https://sui-battleship-app-production.up.railway.app` |
| Plan v1 | "Enlaza, no copia"; versiones con su fuente; sin conteos de tests ni tamaños de bundle; aviso como `> [!WARNING]`; `license` = `"Apache-2.0"` sin `author` ni `version`; fallback de `Move.toml` (TASK-1 §3) |

## Reglas comunes a todos los tasks

- **§R-1: rutas y secretos.** En el repo, en los reportes y en el output pegado: `<repo>` (el worktree de esta branch),
  `<scratchpad>`, `<HOME real>`, `<dir>`. Nunca una ruta real, una dirección de cuenta, un ID u hex de 40-64 caracteres,
  ni nada del keystore (SEG-3).
- **§R-2: placeholder.** El texto es literal: `se completa después de #8`, **siempre entero en un solo renglón**
  (nunca cortado por el ajuste de línea). Mientras exista, se verifica de dos formas, que tienen que dar el mismo número:
  ```bash
  grep -c "se completa después de #8" README.md                                    # renglones
  tr -s '\n' ' ' < README.md | grep -o "se completa después de #8" | wc -l           # apariciones, sin saltos de línea
  ```
  Si la segunda da más que la primera, hay una frase partida o dos en un mismo renglón: se corrige.
- **§R-3: greps de salida** (output pegado, todos vacíos sobre lo que agregó el task):
  ```bash
  grep -nE '[0-9a-fA-F]{40,64}' <archivos>
  grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <archivos>
  grep -nE '0x[0-9a-fA-F]{8,}' <archivos>
  ```
  **En TASK-5 (v1.3) rige la §R-6 de #17 en lugar de esta** (cuatro greps y atribución; ver TASK-5, §5).
- **§R-4: check de enlaces.** Un script desechable en `<scratchpad>` (no se commitea; Node 26 sin dependencias) que:
  1. extrae cada enlace `](destino)` del README (fuera de bloques de código);
  2. **relativo:** el archivo existe en `<repo>`; si lleva `#ancla`, coincide con el slug de un encabezado del destino;
  3. **slug de GitHub:** texto del encabezado en minúsculas, borrar todo lo que no sea letra (`\p{L}`), número
     (`\p{N}`), espacio, `-` o `_`, y cada espacio → `-`. Los encabezados dentro de bloques de código no cuentan. Un slug
     repetido en el mismo archivo lleva `-1`, `-2`… en orden de aparición;
  4. **absoluto (`https://`):** `curl -sS -o /dev/null -w '%{http_code}' -L <url>` da 2xx;
  5. **referencias a issues y PRs (§R-8):** borra del texto los literales `se completa después de #8` y los enlaces
     `[…](https://github.com/sdelvalle57/sui_battleship/issues/N)` o `…/pull/N` cuyo texto nombra ese mismo `N`; en lo
     que queda, `#[0-9]+` no aparece (un `#N` o `PR #N` suelto es `FAIL`). Las anclas `#…` dentro de las URLs de los
     enlaces relativos no cuentan: se borran con su enlace;
  6. imprime una línea por enlace con `OK`/`FAIL` y sale ≠ 0 si alguno falla. Se pega el output completo.

  Anclas que existen hoy en `deaadbb` (calculadas con esa regla; el script del DEV las tiene que dar igual):
  `contracts/README.md#battleshiphouse`, `#battleshipgame`, `#estados`, `#flujo-de-fondos`, `#comisión`,
  `#límites-de-apuesta`, `#autorización` (House), `#autorización-1` (Game), `#retiro-de-comisiones`,
  `#objeto-terminal-y-storage-d-20261030-15-d3`, `#despliegues-7`, `#uso-en-localnet`, `#uso-en-testnet-solo-el-owner`;
  `app/README.md#scripts`, `#localnet`, `#testnet`, `#mis-partidas-13`, `#límite-sin-indexador`, `#wallet`;
  `agents.md#2-repositorio-monorepo`, `#3-comandos-por-área-sin-makefile`, `#localnet-aislada-smokes`, `#app-app`,
  `#4-arquitectura-de-runtime`, `#14-mapa-de-documentación`.
- **§R-5: referencias a decisiones.** Cada `D-YYYYMMDD-N` citado en el README existe en `documents/DECISIONES.md` de la
  branch, **salvo** D-20261103-01 mientras #8 no mergee: entonces se escribe `D-20261103-01 (PR #48)`, con el PR enlazado (§R-8). Verificación:
  ```bash
  for d in $(grep -oE 'D-[0-9]{8}-[0-9]+' README.md | sort -u); do grep -q "^### $d " documents/DECISIONES.md && echo "OK $d" || echo "AUSENTE $d"; done
  ```
  Solo puede salir `AUSENTE D-20261103-01`, y únicamente si el README lo escribe con `(PR #48)`. **Desde la v1.3**
  (D-20261103-01 en `master`): ningún `AUSENTE`. D-20261104-05 no se cita en el README mientras no esté en `master`.
- **§R-8: issues y PRs enlazados.** En el README, toda mención `#N` o `PR #N` va como enlace con su URL completa:
  `[#N](https://github.com/sdelvalle57/sui_battleship/issues/N)` o `[PR #N](https://github.com/sdelvalle57/sui_battleship/pull/N)`
  (en un archivo del repo, GitHub no autoenlaza `#N`). La verifica §R-4 (pasos 4 y 5). **Única excepción:** el literal
  `se completa después de #8`, que no se enlaza para que §R-2 lo siga encontrando con `grep`. Vale para las citas como
  `D-20261103-01 ([PR #48](…/pull/48))` y "seguimiento [#51](…/issues/51)".
- **§R-6: Node.** Los agentes anteponen `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version &&`
  (`v26.13.0`) a todo comando de Node o npm (`agents.md` §3, "App (`app/`)").
- **§R-7: al terminar cada task:** reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5, en
  `documents/REPORTES_README.md` (un archivo, una sección por task). Sin commits ni pushes. "Desviaciones del handoff"
  obligatoria ("ninguna" si no hay).
- **§R-9: palabras de cierre (v1.3, lección de D-20261119-01).** Ningún mensaje de commit de este ciclo (TASK-5, los
  merges de `master` y el housekeeping) lleva `close[sd]?`, `fix(e[sd])?` ni `resolve[sd]?` delante de una referencia a un
  issue (`#N`, `owner/repo#N` o la URL del issue). En los commits, los issues van como `(#16)` o `Refs #15`.
  `Closes #15` y `Closes #16` van **solo** en el body del PR de TASK-5, en texto plano (no en código), un renglón cada
  uno. Chequeo, que tiene que salir vacío, antes de abrir el PR (DEV, sobre los commits propuestos) y antes del merge
  (orquestador):
  ```bash
  git log --format=%B origin/master..HEAD | /usr/bin/grep -niE '\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b:?[[:space:]]+([[:alnum:]_.-]+/[[:alnum:]_.-]+)?#[0-9]+|\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b:?[[:space:]]+https://github\.com/[^[:space:]]+/issues/[0-9]+'
  ```
  Segunda pasada (v1.3.1, 🔵9), por si el ajuste de línea separa la palabra del issue; también vacía:
  ```bash
  git log --format=%B origin/master..HEAD | tr -s '\n' ' ' | /usr/bin/grep -niE '<el mismo patrón>'
  ```
  Y, con el PR abierto (v1.3.1, 🟠1: `gh pr view --json` no tiene `closingIssuesReferences` en el `gh` 2.46.0):
  ```bash
  gh api graphql -F n=<PR> -f query='query($n:Int!){repository(owner:"sdelvalle57",name:"sui_battleship"){pullRequest(number:$n){closingIssuesReferences(first:10){nodes{number}}}}}' --jq '[.data.repository.pullRequest.closingIssuesReferences.nodes[].number] | sort'
  ```
  → `[15,16]` exacto (con `sort`: GitHub no garantiza el orden). El título del PR también va sin palabras de cierre.

---

## TASK-1: campo `license` en los manifiestos (área: contracts + app)

### 1. Historia de usuario del task

**Como** quien consume o audita el paquete (npm, GitHub o la CLI de Sui), **quiero** que los manifiestos declaren la
licencia Apache-2.0, **para** no tener que inferirla del archivo `LICENSE` o de los headers.
**Scope:** el campo `license` en `contracts/Move.toml`, `package.json` y `app/package.json`, y su reflejo en el lock.
**No entrega:** headers en `.mjs`/`.ts`, `author`, `version` ni ningún otro campo.

### 2. Contexto (qué existe hoy)

- `LICENSE` (Apache-2.0) en la raíz y headers SPDX en los 4 `.move`: cumplido (D-20261030-14). Este task solo los
  re-verifica.
- `contracts/Move.toml` (11 líneas): `[package]` con `name = "battleship"` y `edition = "2024"`, `[dependencies]` vacío y
  comentarios. Sin `license`.
- `package.json` (raíz): `name`, `private`, `workspaces`, `engines`. Sin `license`.
- `app/package.json`: `name`, `private`, `type`, `scripts`, `dependencies`, `devDependencies`. Sin `license`.
- `package-lock.json` v3: `packages[""]` = `name`, `workspaces`, `engines`; `packages["app"]` = `name` + dependencias;
  `packages["node_modules/sui-battleship-app"]` = enlace. Las otras 317 entradas ya tienen `license`.
- **CLI 1.83.0** (código del tag `testnet-v1.83.0`, verificado por el MID y el MAYOR):
  - `move-package/src/schema/manifest.rs`: `PackageMetadata` guarda los campos no reconocidos
    (`#[serde(flatten)] unrecognized_fields`) sin emitir avisos; `license` figura en el test de "ignored fields";
  - `move-package/src/package/package_impl.rs`, `compute_digest`: el `manifest_digest` del lock cubre solo
    `RepinTriggers { deps }`. Agregar `license` no cambia el digest, así que no hay repin.

### 3. Qué implementar

1. `contracts/Move.toml`, en `[package]`, después de `edition`:
   ```toml
   [package]
   name = "battleship"
   edition = "2024"
   license = "Apache-2.0"
   ```
2. `package.json` (raíz), después de `"private": true,`:
   ```json
   "license": "Apache-2.0",
   ```
   Lo mismo en `app/package.json`, después de `"private": true,`. Sin reordenar ni reformatear nada más.
3. Lock, desde `<repo>` con el prefijo §R-6 (el `.npmrc` del repo aplica `ignore-scripts`):
   ```bash
   npm install --package-lock-only
   git diff -- package-lock.json
   ```
   Resultado esperado: **exactamente 2 líneas agregadas**, `"license": "Apache-2.0",` en `packages[""]` y en
   `packages["app"]`, y nada más. Cualquier otra diferencia (versiones, `resolved`, `integrity`, orden, entradas nuevas o
   borradas): `git checkout -- package-lock.json`, se frena y se reporta. El MID decide; nunca se acepta un lock
   re-resuelto.
4. **Fallback (aprobado en el plan):** si el gate de contratos emite un warning o un error por `license`, se revierte
   `contracts/Move.toml`, se declara como desviación con el output, y TASK-2 agrega en "Licencia" una línea: "el manifest
   de la CLI 1.83 ignora `license`; la licencia del paquete la declaran `LICENSE` y los headers SPDX".

### 4. Archivos a tocar / NO tocar

- **Tocar:** `contracts/Move.toml`, `package.json`, `app/package.json`, `package-lock.json`.
- **NO tocar:** `contracts/Move.lock` (un delta es **N-3**: revertir, reportar y TASK-1 queda frenado, no en fallback; un repin es de #8),
  `contracts/sources/`, `contracts/tests/`, `contracts/scripts/`, `app/src/`, `.npmrc`, `.nvmrc`, `.github/`, y los worktrees
  de #8, #14 y #15.

### 5. Tests y gates obligatorios (output completo pegado)

Contratos, forma canónica de `agents.md` §3 (desde `contracts/`, con la config sin claves y `printf 'n\n' |`):
```bash
cd <repo>/contracts && printf 'n\n' | sui --version
printf 'n\n' | sui move build -e testnet --warnings-are-errors > <scratchpad>/build.log 2>&1; echo "exit=$?"; cat <scratchpad>/build.log
printf 'n\n' | sui move build -e testnet --lint --warnings-are-errors
printf 'n\n' | sui move test -e testnet --warnings-are-errors
grep -c "Updating dependencies" <scratchpad>/build.log        # tiene que dar 0 (sin repin)
node --test scripts/*.test.mjs                                # con el prefijo §R-6
node scripts/publish.mjs check                                # con el prefijo §R-6
git diff --exit-code -- Move.lock
```
App, steps del job `app` en orden, desde `<repo>` con el prefijo §R-6:
```bash
npm ci
npm audit signatures
npm audit --omit=dev --audit-level=high
npm run lint -w app
npm run typecheck -w app
npm test -w app
VITE_SUI_NETWORK=testnet npm run build -w app
git status --porcelain --untracked-files=all     # solo los 4 archivos de este task (y REPORTES_README.md)
```
Headers (re-verificación, los dos vacíos):
```bash
grep -L 'SPDX-License-Identifier: Apache-2.0' contracts/sources/*.move contracts/tests/*.move
grep -rn 'Your Project' contracts/
```
Sin tests nuevos (metadatos).

### 6. Smoke

No aplica: metadatos sin flujo ejecutable.

### 7. Criterios de aceptación

- [ ] Gates de contratos con `exit=0` del build (log pegado) y **0 warnings / 0 lints / 83 tests PASS**, `Updating dependencies` = 0, scripts **99 PASS**,
      `check` **0 despliegues**, `Move.lock` sin delta.
- [ ] Gate de app sin delta contra la §0: 0 problemas, 0 errores, **915 tests en 57 archivos**, build verde (el tamaño
      del bundle no cambia: `license` no entra al bundle).
- [ ] `git diff --stat`: 4 archivos; `package-lock.json` con +2 líneas y −0.
- [ ] Greps de headers vacíos.
- [ ] Greps §R-3 vacíos sobre el diff.
- [ ] Nota para el orquestador en "Riesgos / pendientes" del reporte: **N-2**. `package.json`, `app/package.json` (entra
      en `app/**`) y `package-lock.json` están en las watch paths de Railway (checklist de #15, paso 5). Si al mergear el
      PR principal Railway ya está conectado sin la preautorización del owner (paso 10 de ese checklist), el merge
      publica el sitio y espera al owner.

### 8. Al terminar

Reporte TASK-1 en `documents/REPORTES_README.md` (§R-7). Mensaje de commit que propondrá el MID:
`chore: declare the Apache-2.0 license in the package manifests (#16)`.

---

## TASK-2: README, secciones que no dependen de #14 ni de #15 (área: docs)

### 1. Historia de usuario del task

**Como** jugador o desarrollador que llega al repo, **quiero** leer en el README qué es el juego, sus reglas y riesgos,
cómo jugarlo en testnet, cómo está armado y cómo levantarlo en local, **para** usarlo sin leer el código ni los docs de
los agentes.
**Scope:** `README.md` reescrito con las secciones 1-8, 12 y 13 de la tabla de §3.
**No entrega:** Despliegue, Administración de la House y Roadmap (TASK-3, después de #14 y #15); la URL y los IDs
(TASK-5); Docker en los requisitos (TASK-3).

### 2. Contexto (qué existe hoy)

- `README.md` (89 líneas, inglés, 2025-03) está desactualizado: "2 vs 2" (`:3`), módulo Escrow (`:10, 34-38, 54-55,
  74-76`), diseño tachado como hecho (`:60-62, 65-66`), registro de partidas en la House (`:17`), "shared pooled objects"
  (`:70`), sin instalación ni uso (`:82-84`). **Se reemplaza entero**; no se conserva nada del texto viejo.
- Fuentes de cada dato (citarlas en el reporte, no en el README):
  - reglas: `agents.md` §6; `contracts/README.md` → "Estados", "Flujo de fondos", "Comisión", "Límites de apuesta";
    `contracts/sources/house.move` (`MAX_FEE_BPS` = 1000, límites por defecto 0,001 y 50 SUI);
    `contracts/sources/game.move` (`BPS_DENOMINATOR` con intermedio `u128`);
  - runtime y arquitectura: `agents.md` §4 y §8;
  - layout: `agents.md` §2;
  - comandos: `agents.md` §3, `app/package.json` → `scripts`, `contracts/README.md` → "Uso en localnet",
    `app/README.md` → "Localnet";
  - wallet: `app/src/sui/dappKit.ts:14-15` (en testnet el kit ofrece Slush; la burner solo en localnet con `npm run dev`);
  - rutas de la app: `app/src/App.tsx:29-31` (`#/game/:id`, `#/my-games`); "Abrir partida por ID" y el enlace al
    explorador: D-20261103-03.
- Modelo de estilo: `contracts/README.md` y `app/README.md` (español, prosa corta, enlaces relativos, ~120 columnas).

### 3. Qué implementar

Un `README.md` en español (D-20261104-04 (3)) con este orden de secciones (`##`, salvo el título). "Enlaza" = enlace
relativo con el ancla de §R-4, nunca copia de una tabla.

| # | Sección | Contenido obligatorio | Enlaza |
|---|---|---|---|
| 1 | `# Sui Battleship` | Una línea: apuestas 1 vs 1 en Sui, resueltas por un coinflip on-chain | — |
| 2 | Aviso | Bloque `> [!WARNING]` inmediatamente después de la línea de la sección 1, antes de cualquier `##` (texto literal abajo) | — |
| 3 | Qué es | 1 vs 1; la batalla naval se simula con un coinflip de `sui::random` (placeholder; la mecánica real es #18); varias partidas simultáneas por jugador; sin backend propio | El issue con URL completa (`https://github.com/sdelvalle57/sui_battleship/issues/18`): en un README, `#18` no se enlaza solo |
| 4 | Reglas del MVP | Una viñeta por regla (lista abajo) | `contracts/README.md#estados`, `#flujo-de-fondos`, `#comisión`, `#límites-de-apuesta`, `#objeto-terminal-y-storage-d-20261030-15-d3` |
| 5 | Jugar en testnet | Lista abajo, con los **2** placeholders | `app/README.md#mis-partidas-13`, `#límite-sin-indexador`, `#wallet` |
| 6 | Arquitectura | Diagrama corto del runtime en un bloque de texto (navegador + wallet → fullnode gRPC-web → paquete `battleship` con `House`, un `Game` por partida y `Random`); `battleship::house` y `battleship::game` en 2 líneas cada uno (sin Escrow: la apuesta vive en cada `Game`); la app en 2 líneas (Vite + React + TypeScript, lectura con `SuiGrpcClient`, firma con el wallet kit, listas desde eventos) | `agents.md#4-arquitectura-de-runtime`, `contracts/README.md#battleshiphouse`, `#battleshipgame`, `app/README.md` |
| 7 | Estructura del repo | Árbol de **primer nivel**: `contracts/`, `app/`, `documents/`, `.github/workflows/`, `agents.md`, `LICENSE`, `package.json` (+ `package-lock.json`, `.npmrc`, `.nvmrc` en una línea), una línea de rol por entrada. Sin `Dockerfile` (TASK-3) | `agents.md#2-repositorio-monorepo` |
| 8 | Desarrollo local | Subsecciones `###` Requisitos, Contratos, App, "Localnet + app" (lista abajo). Sin Docker | `agents.md#3-comandos-por-área-sin-makefile`, `#localnet-aislada-smokes`, `#app-app`, `app/README.md#scripts`, `#localnet`, `contracts/README.md#uso-en-localnet` |
| 9 | Despliegue | Solo el encabezado y la línea `Pendiente de TASK-3 (después de #14 y #15).` | — |
| 10 | Administración de la House | Ídem | — |
| 11 | Roadmap | Ídem | — |
| 12 | Documentación | 4 o 5 enlaces en prosa: `contracts/README.md`, `app/README.md`, `agents.md`, `documents/` (flujo, estándares, decisiones, status). Sin repetir la tabla de `agents.md` §14 | `agents.md#14-mapa-de-documentación` |
| 13 | Licencia | Apache-2.0, enlace a `LICENSE`, titular `sdelvalle57` (D-20261030-14). Con el fallback de TASK-1, la línea del manifest | `LICENSE` |

**Aviso (texto literal):**
```markdown
> [!WARNING]
> Proyecto en **testnet**: los SUI de testnet no tienen valor real. El contrato **no tiene auditoría externa**.
> Mainnet está fuera de alcance. No uses una wallet con fondos reales.
```

**Reglas del MVP (sección 4), una viñeta cada una:**
- crear: partida abierta o invitación directa a una dirección; nadie juega contra sí mismo;
- límites: la apuesta va entre `min_bet` y `max_bet` de la House (por defecto 0,001 y 50 SUI); el admin los cambia y la
  app muestra los vigentes; se aplican al crear;
- aceptar: iguala **exactamente** la apuesta; en una invitación solo acepta el invitado; aceptar y resolver el coinflip
  pasan en la misma transacción;
- comisión: `fee = ⌊pozo × fee_rate / 10 000⌋`, con `pozo = 2 × apuesta`, redondeada hacia abajo (el resto va al
  ganador); máximo 10 % (1000 bps); la partida copia la comisión vigente al crearse; el ganador recibe `pozo − fee`. En
  testnet: `valor inicial de 200 bps (2 %), D-20261103-01 ([PR #48](https://github.com/sdelvalle57/sui_battleship/pull/48)); la vigente la muestra la app`
  (§R-5, §R-8);
- cancelar y rechazar: el creador cancela y el invitado rechaza, solo mientras está pendiente; vuelve el 100 % al
  creador, sin comisión; no hay expiración;
- estados: pendiente → cancelada o resuelta, sin estado intermedio;
- costos: cada transacción paga gas, y crear una partida deja un depósito de storage que no se recupera, con enlace a
  `contracts/README.md#objeto-terminal-y-storage-d-20261030-15-d3`. **Sin cifras** (ni la reserva de gas de la app ni el
  monto del depósito: son detalle interno y medición, LIM-5).

**Jugar en testnet (sección 5):**
- placeholder 1, un renglón, literal:
  ```markdown
  - **URL pública:** se completa después de #8.
  ```
- wallet: Slush (la ofrece la app) o una wallet de navegador compatible con Sui, en la red **testnet**;
- SUI de testnet: el faucet oficial. La URL se toma de la documentación oficial de Sui (docs.sui.io) al implementar y se
  verifica con el check de enlaces (§R-4, 2xx). Si no hay una URL estable, se enlaza la página de docs que explica cómo
  obtener SUI de testnet. **No se inventa**;
- recorrido: lobby (partidas abiertas) → crear → aceptar → resultado → "Mis partidas" (`#/my-games`, con las
  invitaciones recibidas) y abrir una partida por su ID; cada transacción enlaza al explorador (Suiscan);
- límite honesto: en testnet las listas cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento [#51](…/issues/51), §R-8); una
  partida más vieja se abre por su enlace o su ID;
- placeholder 2, un renglón, literal (**sin enlace** todavía: el archivo no existe y el check de enlaces fallaría):
  ```markdown
  - **IDs de testnet** (`packageId`, `houseId`): en `contracts/deployments/testnet.json`; se completa después de #8.
  ```

**Desarrollo local (sección 8):**
- **Requisitos:**
  - Node 26 (`.nvmrc`, `nvm use`) y npm 11, todo desde la raíz (npm workspaces). Con otra versión `npm ci` falla con
    `EBADENGINE`;
  - Sui CLI `1.83.0`, la de `SUI_VERSION` en `.github/workflows/ci.yml` y STATUS → Toolchain:
    `suiup install sui@testnet-1.83.0`, con enlace al repo oficial de `suiup` (verificado por el check de enlaces);
  - aviso de la CLI: sin `~/.sui/sui_config/client.yaml`, `sui move …` ofrece crear una config y genera una clave cuya
    frase imprime (STATUS H11). Responder `n` o anteponer `printf 'n\n' |`.
- **Contratos:** `cd contracts && sui move build -e testnet` y `sui move test -e testnet`; el gate completo (lint,
  `--warnings-are-errors`, tests de los scripts, `Move.lock` intacto) se enlaza (`agents.md#3-comandos-por-área-sin-makefile`).
- **App:** `npm ci`, `VITE_SUI_NETWORK=localnet npm run dev -w app`, `npm test -w app`; el gate completo se enlaza
  (`app/README.md#scripts`).
- **Localnet + app:** **siempre una localnet aislada** en un directorio propio, nunca `sui start` a secas (reescribe
  `~/.sui/sui_config/client.yaml`); enlaza `contracts/README.md#uso-en-localnet` (variante corta para humanos y
  publicación con el script) y `app/README.md#localnet` (`localnet.json`, wallet de desarrollo). Placeholders `<dir>`.

**Prohibido en el README:** direcciones, IDs, hex de 40-64, rutas personales, capturas, contenido del keystore (§R-1);
conteos de tests, tamaños de bundle, baselines y cifras medidas, **salvo** las que fija una decisión, con la decisión
citada al lado (p. ej. "≈ 14,6 días, D-20261103-03"; "200 bps, D-20261103-01"); tablas copiadas de los READMEs de área; menciones de
GitHub Pages o "hosting por definir".

### 4. Archivos a tocar / NO tocar

- **Tocar:** `README.md`.
- **NO tocar:** `contracts/README.md`, `app/README.md`, `agents.md`, `documents/STATUS.md`, `documents/DECISIONES.md`,
  código, y los worktrees de #8, #14 y #15.

### 5. Verificaciones obligatorias (output pegado)

- §R-2: las dos cuentas del placeholder dan **2** y **2**.
- §R-3 sobre `README.md`: vacíos.
- §R-4: check de enlaces con todos en `OK`.
- §R-5: solo puede salir `AUSENTE D-20261103-01`, y escrito con `(PR #48)`.
- `grep -c "Pendiente de TASK-3" README.md` = **3**.
- `grep -niE '2 vs 2|escrow|pooled|GitHub Pages' README.md`: solo la frase "sin Escrow" de la sección 6 (o ninguna).
- Tabla de trazabilidad en el reporte: cada regla y cada número del README → su fuente (archivo:línea o decisión).
- Cada comando del README existe tal cual en `app/package.json` → `scripts`, `agents.md` §3 o `contracts/README.md`
  (lista en el reporte).

Sin gates de código: el diff solo toca `README.md`. Se declara "Sin cambios de código" en el reporte.

### 6. Smoke

No aplica: la guía se ejercita en #17.

### 7. Criterios de aceptación

- [ ] Secciones 1-8, 12 y 13 completas según §3, en español; 9-11 con la línea "Pendiente de TASK-3".
- [ ] Aviso literal como `> [!WARNING]`, antes de cualquier instrucción.
- [ ] Ninguna tabla copiada de los READMEs de área (el MID lo revisa contra LIM-5).
- [ ] Todas las verificaciones de §5 en verde, con output pegado.

### 8. Al terminar

Reporte TASK-2 en `documents/REPORTES_README.md` (§R-7). Mensaje de commit que propondrá el MID:
`docs: rewrite the root README with the 1 vs 1 vision, rules and local guide (#16)`.

---

## TASK-3: README, secciones posteriores a #14 y #15 (área: docs) [PASA, `f125e5d`; mergeado en PR #62]

**Precondición:** el orquestador mergeó los PRs de #14 y #15 a `master` y trajo `master` a esta branch con un merge commit
(no rebase). El DEV lo verifica (output pegado):
```bash
gh pr view 57 --json state --jq .state                                                   # #15: MERGED
gh pr view 59 --json state --jq .state                                                   # #14: MERGED
git fetch origin && git merge-base --is-ancestor origin/master HEAD; echo "exit=$?"     # 0
git log --oneline --merges -5                                                            # el merge de master
```
Si alguno no da lo esperado, no se empieza. El MID actualiza la §0 de este handoff con el baseline de ese
`master` antes de autorizar el task.

**Insumos verificados por el MID en `5e51356` (v1.2).** El DEV los vuelve a confirmar con su check de enlaces (§R-4).

| Insumo | Valor en `master` | Fuente |
|---|---|---|
| Ruta del panel | `#/admin` | `app/src/App.tsx:32` (`path: 'admin'`) |
| Enlace del encabezado | "Administrar House", visible **solo** cuando se sabe que la cuenta tiene el `HouseCap` | `app/src/components/Header.tsx:20`; título de la página `app/src/pages/HouseAdminPage.tsx:50` |
| Cuenta sin el cap | "Sin permisos: esta cuenta no tiene el HouseCap de esta House.", con "Volver a comprobar" | `app/src/pages/HouseAdminPage.tsx:7`; D-20261104-02 (1) |
| Comisión en el panel | bps enteros (0..1000) con el % al lado, sin diálogo de confirmación extra | D-20261104-02 (2) y (3) |
| Retiro | total, a la cuenta que firma | D-20261104-02 (5) |
| Solo por CLI | `migrate` y `transfer_house_cap` | `app/README.md`, "Panel de la House (#14)" |
| Ancla del panel | `app/README.md#panel-de-la-house-14` | `app/README.md:711` |
| Ancla del despliegue | `app/README.md#despliegue-railway`; el checklist del owner en `#conectar-railway-owner-no-delegable` | `app/README.md`, "Despliegue (Railway)" |
| Ancla de Docker (requisito opcional) | `app/README.md#verificar-la-imagen-appscriptscheck-deploy-imagesh` (pide `bash`, `docker`, `curl`…) | `app/README.md:172` |
| Raíz | `Dockerfile` y `.dockerignore` existen | `ls -a` de la raíz |
| "GitHub Pages" | 0 menciones en `README.md`, `agents.md`, `app/README.md` y `contracts/README.md`. Solo aparece en `documents/` como alternativa descartada (D-20261104-01) y en las reglas de este handoff | `grep -rn "GitHub Pages" --include=*.md` |
| Issues | #14 **cerrado**; #15 **abierto** (PR #57 mergeado con `Refs #15`, cierre con TASK-6 de #15 después de #8); **#60 nuevo**, post-MVP ("Panel de la House: releer la House antes de firmar para no revertir un cambio concurrente", MINOR-1 de la revisión de #14) | `gh api …/issues` |
| D-20261103-01 | Sigue fuera de `master` (#8 sin mergear): se mantiene `(PR #48)` | `documents/DECISIONES.md` |

**Además de lo de abajo, TASK-3 corrige los hallazgos de la revisión de TASK-2:**
- **H-1** (`README.md:88`): "la misma de la CI" pasa a "la de `SUI_VERSION` en
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml)";
- **H-2** (`README.md:112`): `[app](agents.md#app-app)` pasa a `[agents.md §3, App](agents.md#app-app)`.

- **HU:** **como** visitante, **quiero** saber cómo se despliega el juego, cómo se administra la House y en qué estado
  está cada parte del proyecto, **para** entender qué funciona hoy y qué falta.
- **Qué implementar:**
  - sección 9, **Despliegue**: dos líneas. Contratos: solo el owner, con enlace a
    `contracts/README.md#uso-en-testnet-solo-el-owner`. App: Railway, con enlace a `app/README.md` → "Despliegue
    (Railway)" (`app/README.md#despliegue-railway`). Sin URL: la URL sigue siendo el placeholder de la sección 5;
  - sección 10, **Administración de la House**: el titular del `HouseCap` administra comisión, límites y retiro desde el
    panel de #14 (ruta, nombre del enlace y textos **tal como queden en `master`**), o por CLI; enlaces a la sección del
    panel en `app/README.md` y a `contracts/README.md#autorización`, `#retiro-de-comisiones`;
  - sección 11, **Roadmap**: tabla `Fase | Issue | Tema | Estado`, con estados en texto ("Hecho", "En curso",
    "Pendiente", "Post-MVP"), la fecha del corte y la línea "el estado vivo está en los issues y en
    `documents/STATUS.md`". Fases: contratos y tooling (#1-#7, #39); app (#9-#14); testnet y cierre (#8, #15, #16, #17);
    post-MVP (#18, #51, #53, #54, #56, #58, #60, #35). Cada issue enlazado con su URL completa (`#N` no se enlaza solo en un
    README). Estados re-medidos con
    `gh api 'repos/sdelvalle57/sui_battleship/issues?state=all&per_page=100' --jq '.[] | [.number, .state, .title] | @tsv'`
    (output pegado);
  - sección 7: agregar `Dockerfile` y `.dockerignore` (están en la raíz: imagen de Railway, #15);
  - sección 8, Requisitos: Docker **opcional**, solo para verificar la imagen de Railway, con enlace a la sección de
    `app/README.md` que lo explica;
  - §R-5: si D-20261103-01 ya está en `documents/DECISIONES.md` (#8 mergeado), se quita `(PR #48)`;
  - borrar las 3 líneas "Pendiente de TASK-3".
- **Archivos:** `README.md`.
- **Criterios de aceptación:** `grep -c "Pendiente de TASK-3" README.md` = 0; §R-2 con 2 y 2; §R-3, §R-4 (todas las anclas
  re-verificadas contra el `master` nuevo) y §R-5 en verde; ninguna mención de "GitHub Pages" ni de "hosting por
  definir". Si #14 o #15 mergearon con otro alcance (otra ruta, otro hosting), se sigue `master` y se declara como
  desviación.
- **Commit propuesto:** `docs: add deploy, House admin and roadmap to the root README (#16)`.

## TASK-4: `agents.md` §14 y STATUS (área: docs) [PASA, `fc5f004`; mergeado en PR #62]

**Precondición:** la misma de TASK-3, y TASK-3 en PASA.

- **HU:** **como** próximo agente, **quiero** que el mapa de docs y STATUS reflejen el README nuevo, **para** no tomar el
  roadmap de 2025 como vigente.
- **Qué implementar:**
  - `agents.md` §14: la fila de `README.md` pasa a "Visión del MVP 1 vs 1, reglas, guía de juego y de desarrollo,
    arquitectura, roadmap real y licencia (#16)". **Ninguna otra línea** de `agents.md` (las mantienen #8, #14 y #15);
  - `documents/STATUS.md`:
    - H10 → `✅ <fecha> (#16)` con una línea: README reescrito (1 vs 1, sin Escrow, reglas, guía, roadmap);
    - "Punto de partida", fila "6. Docs y despliegue": README (#16), publicación (#8) y hosting (#15), cada uno con su
      estado real;
    - fila "Licencia" del ciclo activo: agrega los campos `license` de TASK-1 (`Move.toml`, los dos `package.json`);
    - fila de #16 en el ciclo activo: "🚧 en curso" con PR principal (`Refs #16`) y el pendiente TASK-5 (el cierre lo
      hace el housekeeping);
    - baselines de TASK-1 (contracts y app, sin delta) y de docs (TASK-2/3);
    - "Pendientes del usuario": revisar D-20261104-04 (tomada por delegación) y, después de #8, que TASK-5 cierra #16;
  - fila de #15 y fila "Siguiente" (v1.2): si al empezar TASK-4 todavía no registran el merge de PR #57 (`5e51356`, con
    `Refs #15`), se actualizan. #15 queda 🚧 con PR #57 mergeado y pendientes TASK-6 (después de #8) y el checklist del
    owner. En "Siguiente", se quita "listo para pasar a ready" y se suma #60 a post-MVP. Se declara como desviación
    acotada: no es de #16, pero TASK-4 ya toca STATUS y deja el archivo coherente. Si el orquestador ya lo corrigió en
    `master`, no se toca;
  - `documents/DECISIONES.md`: **no se toca**. D-20261104-04 ya está registrada (`0e70fbe`); si el merge de `master` creó
    un conflicto en la cabecera del archivo, lo resuelve el orquestador conservando el orden descendente.
- **Archivos:** `agents.md`, `documents/STATUS.md`.
- **Criterios de aceptación:** `git diff -- agents.md` limitado a la fila de §14; §R-3 vacío sobre lo agregado; ningún
  conteo de STATUS contradice los reportes de TASK-1..TASK-3.
- **Commit propuesto:** `docs: map the new README and close STATUS H10 (#16)`.

## TASK-5: URL pública, smoke B y cierre de #15 y #16 (área: docs, PR de seguimiento) [AUTORIZADO, v1.3.1]

> Reescrito en la v1.3 (addendum S-8 de `HANDOFF_SMOKE_MVP.md`; el texto obligatorio es igual en `1c2bb2a`, v1.2.1 de #17,
> y en la v1.3.1, branch `feature/issue-17-mvp-smoke`). Corregido en la v1.3.1. Lo de la v1.2 queda reemplazado. Las
> líneas son las de `master` `b7aa568`; si se mueven, el DEV las re-ubica por el texto citado y lo declara.

### 1. Historia de usuario del task

**Como** jugador, **quiero** la URL del juego y saber dónde están los IDs de testnet, **para** empezar a jugar sin buscar en
el repo. **Como** owner, **quiero** que los docs digan que el sitio está publicado, que cada merge lo publica y que
`deploy-image` bloquea el merge, y que el smoke B quede registrado, **para** cerrar #15 y #16 con evidencia.
**Scope:** la URL en `README.md` y `app/README.md`, el enlace a `testnet.json`, `deploy-image` requerido en los docs, el
smoke B de S-7 en `SMOKE_RAILWAY_DEPLOY.md`, la nota de la publicación podada, el roadmap y STATUS.
**No entrega:** código ni cambios de CI (F solo corrige un comentario de `ci.yml`); IDs copiados; el "≈ 14,6 días" (DL-14 de #17, ver R-8); `DECISIONES.md`; el housekeeping
(lo hace el orquestador después del merge, §9).

### 2. Precondición (cumplida al 2026-11-19; el DEV la re-verifica con output pegado)

- #8 mergeado (PR #48 → `acdc669`): `contracts/deployments/testnet.json`, `contracts/Published.toml` y D-20261103-01 en
  `master`.
- TASK-6 de #15 mergeado (PR #65 → `376412f`), con `deploy-image` positivo en `master`.
- **S-7 hecho por el owner (🔒):** Railway conectado, URL y smoke B en el
  [comentario de #15](https://github.com/sdelvalle57/sui_battleship/issues/15#issuecomment-7018981193) (2026-11-19T18:57:17Z).
- D-20261119-01 y D-20261119-02 en `master` (`989e53f`, `b4c7f3a`).
- La branch `feature/issue-16-task5` desde `master` `b7aa568` (la creó el orquestador).

```bash
git fetch origin && git merge-base --is-ancestor origin/master HEAD; echo "exit=$?"   # 0
gh pr view 48 --json state --jq .state                                                # MERGED
gh pr view 65 --json state --jq .state                                                # MERGED
gh pr view 62 --json state --jq .state                                                # MERGED (TASK-1..TASK-4)
gh issue view 15 --json state --jq .state                                             # OPEN (reabierto, D-20261119-01)
gh issue view 16 --json state --jq .state                                             # OPEN
/usr/bin/grep -c '^### D-20261119-0[12] ' documents/DECISIONES.md                     # 2
gh api repos/sdelvalle57/sui_battleship/issues/comments/7018981193 --jq .body > <scratchpad>/s7.md   # insumo; no se pega entero
```

Si algo no da lo esperado, no se empieza y se reporta.

### 3. Insumos verificados por el MID en `b7aa568` (v1.3)

| Insumo | Valor | Fuente |
|---|---|---|
| URL pública | `https://sui-battleship-app-production.up.railway.app` | Comentario de S-7; D-20261119-02 (Motivo). `curl` del MID: `200` (2026-11-19) |
| Smoke B | B-1..B-4 `owner: "veo todo bien"`; B-5 `owner: "Ningún error rojo"` (según el comentario, el 403 de `api.slush.app` no apareció; v1.3.1: no prueba que la metadata haya respondido, ver D.2); B-6 del orquestador (2026-11-19 18:53Z) | Comentario de S-7 |
| Ícono remoto de Slush (v1.3.1, 🟠2) | **No concluyente.** `registerSlushWallet` (`@mysten/slush-wallet` 1.3.5, `dist/wallet/index.mjs:240`) sale sin pedir la metadata si ya está registrada la extensión (`com.mystenlabs.suiwallet`); si la extensión registra después, el resultado se descarta (`:256-261`). El owner hizo el smoke B con la extensión. `curl` público a `api.slush.app/api/wallet/metadata` el 2026-11-19: `HTTP/2 403`, `server: cloudflare`, sin ACAO. La CSP servida tiene `img-src 'self' data:` | Revisión del MAYOR de la v1.3; `node_modules` de `b7aa568` |
| Primer deploy de S-7 | Falló en "Create container" con `The executable npm could not be found`: Railway arrancaba la imagen de Caddy con `npm`. El owner dejó el builder Dockerfile, sin Start command ni Pre-deploy command, y redeployó ("successful deployment") | Comentario de S-7 |
| Placeholders | `README.md:36` y `:47`; `app/README.md:72-73`: la frase arranca al final de `:72` (`**URL`) y sigue en `:73` (`pública: se completa después de #8.**`) | `/usr/bin/grep -n` |
| `deploy-image` "no requerido" | `app/README.md:218`; `agents.md:64`, `:224`, `:232-233`; `.github/workflows/ci.yml:185` (comentario, v1.3.1) | `/usr/bin/grep -n 'no requerido\|No es requerido\|no es check requerido\|no condicionan'` |
| Checklist de Railway | Encabezado y aviso N-2 `app/README.md:225-228`; paso 4 `:236-237`; paso 8 `:265-266`; paso 10 `:280-281`. El paso 1 (precondiciones) **no** cambia: sigue valiendo para reconectar | `app/README.md`, "Conectar Railway (owner, no delegable)" |
| Publicación podada | El fullnode público tiene el piso en el checkpoint 404332001 (2026-11-19) y la publicación de #8 está en el 402798973. `fetchPublishCheckpoint` da `null` (`app/src/sui/transactionInfo.ts:37-38`) y la cota del escaneo es solo piso + 16 000, `kind` `node_floor` (`app/src/sui/eventScan.ts:44-57`). El lobby y "Mis partidas" muestran la nota o el sufijo `(desde <fecha>)` (`app/src/components/LobbyList.tsx:69-85`), salvo «Sin partidas abiertas en lo revisado» (`:80`) con más páginas por revisar, o una página atascada o con error (`:68`) | v1.3.1 de `HANDOFF_SMOKE_MVP.md` (#17, branch `feature/issue-17-mvp-smoke`), "Historial podado (v1.3)": `getServiceInfo` de las 18:45:56Z (piso 404332001) y GraphQL de la publicación (checkpoint 402798973); código de `b7aa568` |
| Promesas de historial en los docs | `app/README.md:414-416` dice que la cota sale de la publicación, sin el caso podado. `README.md:44-46` no dice cómo lo avisa la app. `contracts/README.md:538-540` dice "máx(…)", que sigue siendo cierto: no se toca | Lectura del MID |
| IDs (`jq -r` sobre `testnet.json`) | `packageId` = `originalPackageId` `0x8b78…6f51` (el único ID completo en docs, ya en `agents.md` §12, `contracts/README.md` y STATUS); `houseId` `0x54ee…eb1a`; `houseCapId` `0xcf08…37fe`; `upgradeCapId` `0x3e3e…7702`; `publishTxDigest` (base58, público) | `jq -r '.packageId, .originalPackageId, .houseId, .houseCapId, .upgradeCapId, .publishTxDigest' contracts/deployments/testnet.json` |
| Issues | 26 sin PRs; ninguno nuevo desde #60. #15, #16, #17, #18, #35, #51, #53, #54, #56, #58 y #60 abiertos | `gh api 'repos/sdelvalle57/sui_battleship/issues?state=all&per_page=100'` |
| `README.md:27` | Ya sin "(PR #48)" (TASK-6 de #8): **no-op** | `/usr/bin/grep -c 'PR #48' README.md` = 0 |
| PRs de #15 y #16 sin registrar en STATUS → "Mergeadas" | PR #57 (`5e51356`), PR #62 (`eb5332e`), PR #65 (`376412f`) | `documents/STATUS.md` de `b7aa568`; los agrega el housekeeping (§9) |

### 4. Qué implementar

**A. `README.md`.** Sin copiar ningún ID, tampoco el `packageId` (D-20261104-04 (2)).
1. `:36`, con el mismo marcador de lista:
   ```markdown
   - **URL pública:** [sui-battleship-app-production.up.railway.app](https://sui-battleship-app-production.up.railway.app)
   ```
2. `:44-46` ("Límite"): se agrega que la app lo avisa. El renglón `:44`, con el literal `≈ 14,6 días, D-20261103-03`,
   **no cambia**: es de DL-14 de #17 (R-8). `<fecha>` va en código para que GitHub no lo tome como etiqueta HTML. Texto:
   ```markdown
   - **Límite:** en testnet las listas cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento en
     [#51](https://github.com/sdelvalle57/sui_battleship/issues/51)), y lo avisan con la nota
     `historial disponible del nodo (desde <fecha>)`. Una partida más vieja se abre por su enlace o su ID
     ([límite sin indexador](app/README.md#límite-sin-indexador)).
   ```
3. `:47`:
   ```markdown
   - **IDs de testnet** (`packageId`, `houseId`): en [`contracts/deployments/testnet.json`](contracts/deployments/testnet.json).
   ```
4. `:74` (🔵 de S-8), dentro del bloque del árbol:
   ```
   ├── .github/workflows/    # CI: contracts, app y deploy-image (requeridos); framework-drift (informativo)
   ```
   **Desviación declarada (v1.3.1, 🟡6):** el texto obligatorio de S-8 dice "`deploy-image`, no requerido". Se escribe
   "requeridos" por D-20261119-02, que es posterior. El DEV lo repite en "Desviaciones del handoff".
5. `:135-137` ("Despliegue", App): "Conectar el servicio y publicar es del owner" pasa a que el owner lo conectó y que cada
   merge publica. Los dos enlaces se conservan tal cual (las anclas no cambian):
   ```markdown
   - **App:** sitio estático en Railway, construido con el `Dockerfile` de la raíz. El owner conectó el servicio el
     2026-11-19. Desde entonces, cada merge a `master` que cambia la app publica el sitio cuando la CI está en verde
     (D-20261119-02)
     ([despliegue (Railway)](app/README.md#despliegue-railway), con el checklist en
     [conectar Railway](app/README.md#conectar-railway-owner-no-delegable)). La URL pública está en "Jugar en testnet".
   ```
6. `:159`: `Estado al 2026-11-04.` → `Estado al <fecha del task>.`
7. Roadmap `:177-180`, re-medido con el `gh api` de §3 (output pegado):

   | Issue | Tema | Estado |
   |---|---|---|
   | #8 | (sin cambios) | Hecho |
   | #15 | App en Railway: imagen con CSP y cabeceras, publicada desde `master` | Hecho |
   | #16 | (sin cambios) | Hecho |
   | #17 | (sin cambios) | En curso |

   #15 y #16 salen `open` en el `gh api` y se escriben "Hecho" porque este PR los cierra: se declara en el reporte, no es
   desviación.
8. `:27`: no-op (verificación en §5).

**B. `app/README.md`.** No se cambia ningún encabezado: el README raíz enlaza `#despliegue-railway` y
`#conectar-railway-owner-no-delegable`.
1. `:71-73` (placeholder de "Despliegue (Railway)"):
   ```markdown
   Hosting en Railway (D-20261104-01, D-20261104-03; #15). Conectado por el owner el 2026-11-19 (S-7). **URL pública:
   [sui-battleship-app-production.up.railway.app](https://sui-battleship-app-production.up.railway.app).** Railway
   publica cada push a `master` que toca las watch paths (paso 5 del checklist), cuando la CI termina en verde (*Wait for
   CI*). D-20261119-02 (N-2) preautoriza esos merges si llevan publicada la revisión de integración del MAYOR. El
   checklist con el que se conectó está en "Conectar Railway (owner, no delegable)", más abajo, para reconectar o para un
   servicio nuevo.
   ```
2. `:218` (bullet "CI"):
   ```markdown
     - **es check requerido** de `master` desde el 2026-11-19, junto a `contracts` y `app` (N-4, D-20261119-02); Railway
       lo espera con *Wait for CI*.
   ```
3. `:227-228` (bajo "Conectar Railway (owner, no delegable)"):
   ```markdown
   Solo el owner. **Hecho el 2026-11-19 (S-7)**; se repite para reconectar o para un servicio nuevo. **Aviso (N-2):** desde
   el paso 3, cada merge a `master` que toque las watch paths del paso 5 **publica el sitio**, preautorizado por
   D-20261119-02.
   ```
4. *(bis, v1.3.1, 🔵11)* `:236-237` (paso 4):
   ```markdown
   4. Build: Railway usa el `Dockerfile` de la raíz ("Using detected Dockerfile!"). Settings → Build: builder
      **Dockerfile**; Start command y Pre-deploy command **vacíos**. **No** definir `RAILWAY_DOCKERFILE_PATH`.
   ```
4. `:265-266` (paso 8), se agrega al final, con la sangría del paso:
   ```markdown
      Si falla en "Create container" con `The executable npm could not be found`, Railway intentó arrancar la imagen de
      Caddy con `npm`: en Settings, builder **Dockerfile** y **sin** Start command ni Pre-deploy command (paso 4), y
      redeploy. Pasó en el primer deploy de S-7.
   ```
5. `:280-281` (paso 10):
   ```markdown
   10. N-2 y N-4: ✅ D-20261119-02 (2026-11-19). Los merges a `master` con la CI en verde y la revisión del MAYOR quedan
       preautorizados como publicación del sitio, y `deploy-image` es check requerido.
   ```
6. `:414-416` ("cota inferior" del lobby), se agrega la publicación podada al final del ítem:
   ```markdown
     - **cota inferior** = máx(checkpoint de la **publicación**, piso del nodo + 16 000). La publicación sale de
       `publishTxDigest` de `contracts/deployments/<red>.json`; el piso (`lowestAvailableCheckpoint`) se relee al inicio de
       **cada** página; el margen solo se suma con piso > 0. Si el nodo ya podó la publicación, `fetchPublishCheckpoint` da
       `null` y la cota es solo piso + 16 000 (`kind` `node_floor`): las listas muestran la nota o el sufijo
       `(desde <fecha>)`, salvo «Sin partidas abiertas en lo revisado» con más páginas por revisar. En testnet pasa con
       la publicación de #8 (checkpoint 402798973; piso 404332001 el 2026-11-19);
   ```
7. **No se tocan** `:432`, `:713`, `:715` ("≈ 14,6 días"): DL-14 de #17 (R-8).
8. *(v1.3.1, 🟠2)* `:166-167` (caso previsto "Ícono remoto de Slush", "Conclusión"):
   ```markdown
       - Conclusión: el ícono remoto **sigue sin medir**. En el smoke B (S-7) el owner usó la extensión de Slush, y con
         ella el kit no pide la metadata (`registerSlushWallet`, `@mysten/slush-wallet` 1.3.5). Queda como observación de
         #17, con un perfil de navegador sin la extensión. Si aparece una violación de `img-src`, se sigue el caso
         previsto arriba.
   ```

**C. `agents.md`** (las líneas de #15; la v1.2 las dejaba a #15 y #15 cierra acá).
1. `:64-65`, en el árbol, con la columna de comentarios alineada como hoy:
   ```
   └── .github/workflows/        # ci.yml: jobs contracts (#3), app (#9) y deploy-image (#15), los tres requeridos;
                                 # framework-drift informativo
   ```
2. `:224`: `**No es requerido**;` → `**Requerido** desde el 2026-11-19 (D-20261119-02);`.
3. `:230-233` (párrafo "Gate completo"), completo (v1.3.1, 🟡8):
   ```markdown
   Gate completo = el del workflow de CI: job `contracts` (build, lint y test con `--warnings-are-errors`,
   `Move.lock` intacto, cero claves, `node --test` y `check` de los scripts), job `app` (los steps de arriba) y job
   `deploy-image` (la imagen de Railway). Los tres bloquean el merge (PROY-18; `deploy-image` desde D-20261119-02). El
   job `framework-drift` (informativo, H13) no condiciona el merge.
   ```
4. `:409-410` (§12, App): el ítem completo pasa a (v1.3.1, 🟡3: se **reemplaza** "el owner conecta el servicio, activa
   *Wait for CI* y publica"):
   ```markdown
   - **App:** Railway (D-20261104-01, D-20261104-03): imagen del `Dockerfile` de la raíz (build de testnet + Caddy con
     CSP); sin `testnet.json` la imagen no se construye. Conectado por el owner el 2026-11-19 (S-7):
     `https://sui-battleship-app-production.up.railway.app`. Railway publica cada push a `master` que toca las watch paths,
     cuando la CI termina en verde (*Wait for CI*); D-20261119-02 (N-2) preautoriza esos merges con la revisión de
     integración del MAYOR publicada.
   ```
5. **No se toca** `:251` ("≈ 14,6 días"): es de #17 (R-8).

**D. `documents/SMOKE_RAILWAY_DEPLOY.md`** (texto de S-8; formato de la §R-4 de #17: `owner: "<texto>"`, y para B-6
`orquestador: …`). Sin direcciones, sin capturas y sin volcados del DOM. La partida de B-4 va como `<GAME>`, sin
abreviatura.
1. `:2` (Estado): `smoke B del owner pendiente (S-7)` → `smoke B del owner PASA (6/6, S-7, 2026-11-19; registrado en S-8)`.
2. `:396-401`, "Resultado obtenido" y "Estado":

   | # | Resultado obtenido | Estado |
   |---|---|---|
   | B-1 | `owner: "veo todo bien"` (comentario de S-7, 2026-11-19). El indicador `testnet · nodo OK` es el de la tabla del comentario, que llenó el orquestador; el owner no copió el texto | ✅ |
   | B-2 | `owner: "veo todo bien"`: Slush conecta, sin violación de CSP (B-5); sin fallback a `Report-Only` | ✅ |
   | B-3 | `owner: "veo todo bien"`: el lobby carga. El texto exacto no se registró; con la publicación de #8 podada, lo esperado es `historial disponible del nodo (desde <fecha>)` (lo mide O-5 de #17) | ✅ |
   | B-4 | `owner: "veo todo bien"`: `#/my-games` y `#/game/<GAME>` (la partida de #8, la de T6-9b) cargan después de recargar | ✅ |
   | B-5 | `owner: "Ningún error rojo"`: 0 violaciones de CSP y ningún error fuera de lo admitido. Ícono remoto **no concluyente**: con la extensión de Slush, el kit no pide la metadata (`@mysten/slush-wallet` 1.3.5, `registerSlushWallet`), así que la falta del 403 no prueba que haya respondido; `curl` público a `api.slush.app` en 403 (2026-11-19). Seguimiento en #17 (perfil sin la extensión) | ✅ (ícono remoto sin medir) |
   | B-6 | `orquestador (2026-11-19 18:53Z):` CSP idéntica a la de `app/Caddyfile`; `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` y HSTS; `Cache-Control: no-cache` en `/`; sin COOP; `Server: railway-hikari` y `x-railway-*` del borde de Railway, anotados y no rojos (SUG-1); `/assets/index-B3BeMVQC.js` (= CI) 200 `immutable` con `zstd`; `/no-existe` 404 | ✅ |
3. Después de la tabla, `#### Reporte final (smoke B)`:
   - PASA/TOTAL: **6/6**;
   - observaciones: el primer deploy automático falló por la configuración de Railway (`npm`), no por la imagen; se
     corrigió en Settings y no es paso del smoke. B-5 no mide el ícono remoto de Slush: con la extensión, el kit no
     pide la metadata, y `api.slush.app` sigue en 403 por `curl`. Queda sin medir, con seguimiento en #17;
   - veredicto: **PASA**. Cierra el criterio de #15 "smoke B registrado" (D-20261104-05 (2)).

**E. `documents/STATUS.md`.**
1. `:18` (fila "6. Docs y despliegue"): README ✅ (#16: PR #62 `eb5332e` y el PR de TASK-5); publicación ✅ (#8);
   hosting ✅ 2026-11-19 (#15: Railway, URL, smoke B 6/6). La fila sigue en 🚧 hasta el smoke de punta a punta de #17,
   que la pasa a ✅ (TASK-5 de #17).
2. "Despliegues" (`:36-43`): una línea debajo de la tabla:
   `` **App (Railway, #15):** `https://sui-battleship-app-production.up.railway.app`, conectada el 2026-11-19 (S-7). Railway publica cada push a `master` que toca las watch paths, con la CI en verde (*Wait for CI*); D-20261119-02 (N-2) preautoriza esos merges con la revisión del MAYOR publicada. ``
3. "Baselines de gates" (`:45-48`), dos filas arriba de todo, debajo del encabezado `:47-48`:
   - `railway @ https://sui-battleship-app-production.up.railway.app (S-7, owner + orquestador), 2026-11-19` | smoke B de `SMOKE_RAILWAY_DEPLOY.md` (B-1..B-6) | 🟢 **6/6**,
     con el resumen de D.2 (B-5 con el ícono remoto sin medir);
   - `docs @ feature/issue-16-task5 (TASK-5 de #16), 2026-11-19` | `README.md`, `app/README.md`, `agents.md`,
     `SMOKE_RAILWAY_DEPLOY.md`, STATUS | 🟢 con los conteos de §5 (§R-2 0/0, §R-4 N OK, §R-5 sin `AUSENTE`, §R-6
     clasificado). Sin cambios de código.
4. `:174` (#15): se suman S-7 (URL, smoke B 6/6, falla y arreglo del primer deploy) y D-20261119-02. **Pendiente:**
   merge del PR de TASK-5 de #16, que cierra #15 según D-20261104-05 (2) (`git show 1c2bb2a:documents/DECISIONES.md`,
   llega a `master` con #17), y el housekeeping.
5. `:175` (#16): `handoff v1.2` → `v1.3`; PR #62 mergeado (`eb5332e`, `Refs #16`); TASK-5 en su PR, con `Closes #15` y
   `Closes #16`. **Pendiente:** merge y housekeeping.
6. `:176` ("Siguiente"): `#16 TASK-5 en PR (S-8; cierra #15 y #16) y housekeeping; #17 TASK-2c..6 (con la observación
   del ícono remoto de Slush sin la extensión); post-MVP: #18, #35, #51, #53, #54, #56, #58, #60`.
7. "Pendientes del usuario":
   - `:222` (Railway): `✅ 2026-11-19 (S-7)`, con la URL; N-2 y N-4 por D-20261119-02;
   - `:224-227` (#16): se conserva "revisar D-20261104-04"; el párrafo de N-2 pasa a "resuelto por D-20261119-02"; la
     última oración pasa a "TASK-5 (PR de seguimiento con `Closes #15` y `Closes #16`) completa la URL y cierra #15 y #16";
     se suma la casilla **N-About** del owner (settings "About" del repo: descripción, website con la URL, topics).
8. No se tocan H13 (ya registra la PV 142) ni "Mergeadas" (lo hace el housekeeping).

**F. `.github/workflows/ci.yml:185`** (v1.3.1, 🟡6; **solo el comentario**, ningún step, `if`, `needs` ni `env`):
```yaml
    # construye, levanta y comprueba cabeceras. Requerido desde D-20261119-02; Railway lo espera vía "Wait for CI".
```
- Se declara en el reporte y en el body del PR: `.github/` no es watch path de Railway (paso 5), así que no publica.
- actionlint con el comando de `app/README.md:221` (contenedor desechable, `-no-color`, archivo explícito): **0** hallazgos
  (output pegado). Sin shellcheck: el script no cambia.
- `git diff origin/master -- .github/workflows/ci.yml` → 1 línea `-` y 1 línea `+`, las dos de comentario.

### 5. Verificaciones obligatorias (output pegado)

- **Placeholders (§R-2), las dos formas por archivo, todas en 0:**
  ```bash
  for f in README.md app/README.md agents.md contracts/README.md; do
    printf '%s %s %s\n' "$f" "$(/usr/bin/grep -c 'se completa después de #8' "$f")" \
      "$(tr -s '\n' ' ' < "$f" | /usr/bin/grep -o 'se completa después de #8' | wc -l)"
  done
  ```
- **URL:** `curl -sS -o /dev/null -w '%{http_code}\n' https://sui-battleship-app-production.up.railway.app/` → `200`.
- **§R-4** sobre `README.md`, todos `OK`: incluye la URL (2xx) y `contracts/deployments/testnet.json` (existe). Las
  anclas se re-verifican contra la branch.
- **§R-5:** ningún `AUSENTE` (D-20261119-02 está en `master`).
- `/usr/bin/grep -c 'PR #48' README.md` → `0` (`:27`, no-op).
- **Requerido:** `/usr/bin/grep -rn 'no requerido\|No es requerido\|no es check requerido\|no condicionan' README.md app/README.md agents.md .github/workflows/ci.yml` → vacío.
- **"≈ 14,6 días" intacto (R-8):** `git diff origin/master -- README.md app/README.md agents.md | /usr/bin/grep -E '^[-+].*14,6'`
  → vacío (A.2 no cambia el renglón `README.md:44`), y `/usr/bin/grep -c '14,6' README.md app/README.md agents.md` da lo
  mismo que en `origin/master`.
- **Encabezados intactos:** `git diff origin/master -- README.md app/README.md agents.md | /usr/bin/grep -E '^[-+]#'` → vacío.
- **§R-6 de #17 (cuatro greps) sobre las líneas agregadas** de los 5 archivos:
  ```bash
  git diff -U0 origin/master -- README.md app/README.md agents.md documents/SMOKE_RAILWAY_DEPLOY.md documents/STATUS.md \
    .github/workflows/ci.yml \
    | /usr/bin/grep -E '^\+[^+]' > <scratchpad>/t5-added.txt
  /usr/bin/grep -nE '[0-9a-fA-F]{40,64}' <scratchpad>/t5-added.txt
  /usr/bin/grep -nE '0x[0-9a-fA-F]{8,}' <scratchpad>/t5-added.txt
  /usr/bin/grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' <scratchpad>/t5-added.txt
  /usr/bin/grep -nE '[0-9a-fA-F]{4}(…|\.\.\.)[0-9a-fA-F]{4}' <scratchpad>/t5-added.txt
  ```
  - Grep 3: vacío. En un archivo que contiene el propio comando (este handoff), la única coincidencia admitida es el
    patrón mismo, y se clasifica como "el patrón" (v1.3.1, 🔵13).
  - Greps 1, 2 y 4: lo esperado es vacío. Cada coincidencia se clasifica y se acepta **solo** si se atribuye, comparando
    prefijo y sufijo, a un valor conocido: los IDs de `testnet.json` (los de §3, por `jq -r`), un SHA de commit o un
    digest de imagen. Una coincidencia sin atribución se borra; no se "explica".
  - **Nunca** una dirección de cuenta, ni completa ni abreviada (ni la publicadora ni la del owner), y nunca un volcado
    del DOM. Los mismos cuatro greps corren sobre el reporte antes de entregarlo y sobre el body del PR antes de
    abrirlo (v1.3.1, 🔵13).
- **§R-9 (palabras de cierre):** las dos pasadas del grep sobre `git log --format=%B origin/master..HEAD`, vacías. Si el DEV no commitea,
  lo corre el orquestador con los commits ya hechos, antes de abrir el PR.
- Sin gates de código: se declara "Sin cambios de código" (F es solo un comentario de YAML). La CI del PR da los valores de §0 v1.3 en `contracts`, `app` y
  `deploy-image`.

### 6. Archivos a tocar / NO tocar

- **Tocar:** `README.md`, `app/README.md`, `agents.md`, `documents/SMOKE_RAILWAY_DEPLOY.md`, `documents/STATUS.md` y,
  solo en el comentario de `:185`, `.github/workflows/ci.yml` (F).
- **NO tocar:** `documents/DECISIONES.md`; `contracts/` (incluido `contracts/README.md`); `app/src/` y todo el código;
  el resto de `.github/` (ningún step ni otro comentario de `ci.yml`); los `PLAN_`, `HANDOFF_` y `REPORTES_` de #15 y #16 (los borra el housekeeping); el handoff de #17; las
  líneas "≈ 14,6 días" salvo `README.md:44` como dice A.2.

### 7. Criterios de aceptación

- [ ] Las 6 piezas de §4 (A-F), con los textos dados o equivalentes declarados; la desviación de A.4 declarada.
- [ ] §5 completa y en verde, con output pegado; §R-6 clasificado.
- [ ] Ningún ID nuevo en ningún archivo; el README solo enlaza `testnet.json`.
- [ ] Ningún mensaje de commit con palabras de cierre (§R-9).

### 8. Al terminar

Reporte TASK-5 con la plantilla de `documents/FLUJO_AGENTES.md` §5, como `.txt` en `<scratchpad>`. El orquestador lo lee
entero, corre los cuatro greps de §R-6 sobre él y lo agrega a `documents/REPORTES_README.md`. Sin commits ni pushes.
"Desviaciones del handoff" obligatoria.

- **Commits propuestos** (el MID los confirma en la revisión; ninguno con palabras de cierre):
  - handoff: `docs: add the v1.3.1 addendum for #16 TASK-5 after S-7 (#16)`, cuerpo con `Refs #15`;
  - TASK-5: `docs: publish the Railway URL, record smoke B and mark deploy-image as required (#16)`, cuerpo con
    `Refs #15`;
  - **título del PR** = el asunto del commit de TASK-5, sin palabras de cierre (v1.3.1, 🔵13).
- **Body del PR** (lo redacta el MID después de la revisión de TASK-5):
  - primer renglón `Closes #15` y segundo `Closes #16`, en texto plano. Ningún otro `close/fix/resolve` + issue en el body;
  - el PR de TASK-6 de #15 (#65, `376412f`) y su evidencia: `deploy-image` positivo en `master` (runs 44590519441 y
    44593441691), P1-P13 y E-6 (`SMOKE_RAILWAY_DEPLOY.md`, parte B, T6-8 y T6-9a..g);
  - el smoke B (6/6) y la URL, con B-5 ✅ y el ícono remoto de Slush sin medir (seguimiento en #17);
  - el cambio del comentario de `ci.yml:185` (F): no es watch path, actionlint 0;
  - D-20261104-05 (2) (con `git show 1c2bb2a:documents/DECISIONES.md`), D-20261119-01 y D-20261119-02;
  - la casilla del owner **N-About** (no delegable): settings "About" del repo (descripción, website con la URL,
    topics). Ningún agente los cambia;
  - la nota de que la revisión de integración comprueba los criterios de #15 que quedan: la URL en `app/README.md` y en
    `README.md`, y el smoke B registrado.

### 9. Merge y housekeeping (orquestador)

**Antes del merge:**
1. Revisión de integración del MAYOR publicada en el PR (`gh pr review <PR> --comment --body-file …`).
2. CI en verde en los tres checks requeridos (`contracts`, `app`, `deploy-image`).
3. §R-9: las dos pasadas del grep de los commits vacías, y la consulta GraphQL de `closingIssuesReferences` con `sort`
   = `[15,16]`.
4. N-2: preautorizado por D-20261119-02 (CI verde y revisión publicada); no hace falta el owner. Ningún archivo de TASK-5
   está en las watch paths (`app/README.md` está negado). Si Railway redeploya igual, es el mismo `dist`:
   `curl -sS -o /dev/null -w '%{http_code}' <URL>` → 200 después del merge.
5. La v1.3.1 de `HANDOFF_SMOKE_MVP.md`, con DL-14, commiteada en `feature/issue-17-mvp-smoke` (v1.3.1, 🟡5). Si no lo
   está, el merge de TASK-5 no se frena, pero R-8 se reescribe en STATUS como pendiente sin dueño.
6. Merge con merge commit (`M5`), sin squash ni rebase.

**Después del merge:**
1. `gh issue view 15 --json state,stateReason` y lo mismo con 16 → `CLOSED`/`COMPLETED`. Si alguno sigue abierto, se
   cierra a mano con un comentario que enlace el PR.
2. PR de housekeeping, `chore/housekeeping-issue-15-16`, desde `master` `M5`; sus mensajes también sin palabras de cierre:
   - `git rm` de los 7 artefactos: `documents/PLAN_RAILWAY_DEPLOY.md`, `HANDOFF_RAILWAY_DEPLOY.md`,
     `REPORTES_RAILWAY_DEPLOY.md`, `SMOKE_RAILWAY_DEPLOY.md`, `PLAN_README.md`, `HANDOFF_README.md`, `REPORTES_README.md`
     (no hay `SMOKE_README.md`);
   - STATUS:
     - filas de #15 y #16 → `✅ 2026-11-19`, con `M5` y las referencias `git show M5:documents/<archivo>`;
     - las filas de "Baselines" que citan `SMOKE_RAILWAY_DEPLOY.md` pasan a `git show M5:documents/SMOKE_RAILWAY_DEPLOY.md`;
     - "Mergeadas": PR #57 → `5e51356`, PR #62 → `eb5332e`, PR #65 → `376412f` y el PR de TASK-5 → `M5`;
     - "Siguiente": #17 TASK-2c..6 y post-MVP;
     - nota: D-20261104-05 sigue solo en la branch de #17 (`git show 1c2bb2a:documents/DECISIONES.md`) y llega a
       `master` con #17; hasta entonces STATUS la cita así.
3. Avisar al MID de #17 (v1.3.1, 🟡7), porque este handoff se borra en el paso 2:
   - S-8 cumplido (precondición de su TASK-3). Su TASK-6 ya no tiene que borrar los artefactos de #15 ni de #16;
   - R-8: agregar `agents.md:251` a la lista de DL-14;
   - las referencias de su handoff a `HANDOFF_RAILWAY_DEPLOY.md` pasan a `git show M5:documents/HANDOFF_RAILWAY_DEPLOY.md`;
   - 🟠2: el ícono remoto de Slush sigue sin medir. La observación con un perfil de navegador sin la extensión (abrir el
     modal y mirar la consola) la decide su MID.

## Riesgos y STOPs del ciclo

| # | Riesgo / STOP | Qué hacer |
|---|---|---|
| R-1 | `license` en `Move.toml` produce un warning o un error | Fallback de TASK-1 §3.4 (aprobado; se declara) |
| N-3 | Delta de `Move.lock` en TASK-1 (o `Updating dependencies` ≠ 0) | `git checkout -- contracts/Move.lock contracts/Move.toml`, frenar, reportar. TASK-1 queda **frenado**, no en fallback: el reporte lo dice así y no se pasa a TASK-2 hasta que decida el MID. **No delegable** |
| R-2 | El lock de npm cambia más que 2 líneas | `git checkout -- package-lock.json`, frenar, reportar; decide el MID |
| N-2 | El merge del PR principal publica el sitio (watch paths de Railway: `package.json`, `app/package.json`, `package-lock.json`) | **Resuelto (v1.3):** el PR #62 se mergeó antes de conectar Railway, y D-20261119-02 preautoriza los merges con CI verde y la revisión del MAYOR publicada |
| R-3 | Un placeholder partido en dos renglones | §R-2: las dos cuentas iguales, en `README.md` y `app/README.md` |
| R-4 | Anclas rotas tras los merges de #14, #15 u #8 | §R-4 en TASK-2, TASK-3 y TASK-5; TASK-5 no cambia encabezados |
| R-5 | Un ID, una dirección o una ruta personal entra al README | §R-3 (TASK-1..TASK-4) o §R-6 de #17 (TASK-5) en cada task y antes de cada PR |
| N-1 / N-About | Publicación, dominio y settings "About" del repo | N-1 hecho (#8 y S-7). N-About: del owner, como casilla en el body del PR de TASK-5 |
| R-6 (v1.3) | Un mensaje de commit con palabras de cierre cierra un issue antes de tiempo (pasó con #15, D-20261119-01) | §R-9 antes de abrir el PR y antes de cada merge. Si se cuela, no se reescribe la historia: se reabre y se registra |
| R-7 (v1.3) | Las filas de #15, #16 y "Siguiente" de STATUS chocan al mergear `master` en la branch de #17 | Mandan las filas de `master` (regla del merge de TASK-3 de #17) |
| R-8 (v1.3) | El "≈ 14,6 días" de los docs quedó viejo (11 épocas, ≈ 10-11 días, medido el 2026-11-19) | Es de DL-14 de #17 (v1.3.1 de `HANDOFF_SMOKE_MVP.md`, branch `feature/issue-17-mvp-smoke`; TASK-5 de #17): TASK-5 de #16 no lo cambia, para que la lista de #17 siga valiendo. **Hallazgo para el MID de #17:** su lista (`app/README.md:432`, `:713`, `:715`; `README.md:44`; `contracts/README.md:539`, `:561`) no incluye `agents.md:251`. Se le pasa en §9.3 |
| R-10 (v1.3.1) | El ícono remoto de Slush sigue sin medir (con la extensión, el kit no pide la metadata) | No bloquea el cierre de #15: su criterio (abrir la URL, conectar, lobby, indicador, recarga de una ruta profunda) está cumplido. Seguimiento en #17 (§9.3) |
