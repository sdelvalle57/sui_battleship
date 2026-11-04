# HANDOFF_README
> Plan: PLAN_README v1 (aprobado por el MAYOR, 2026-11-04) | Issue: #16 | Branch: `feature/issue-16-readme` |
> Versión: v1 | Fecha: 2026-11-04 | Autor: MID

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
| TASK-1 | contracts + app (manifiestos) | **Detallado: implementar ya** | Ninguna |
| TASK-2 | docs (`README.md`) | **Detallado: implementar ya** | TASK-1 en PASA (orden de revisión, no técnico) |
| TASK-3 | docs (`README.md`) | Especificado, **no empezar** | `master` con #14 y #15 mergeados y traído a la branch |
| TASK-4 | docs (`agents.md`, STATUS) | Especificado, **no empezar** | La misma que TASK-3, y TASK-3 en PASA |
| TASK-5 | docs (PR de seguimiento) | Especificado, **no empezar** | #8 mergeado y la URL de Railway generada por el owner |

El PR principal (TASK-1..TASK-4) se abre después de TASK-4, con `Refs #16`. TASK-5 va en otro PR, con `Closes #16`
(D-20261104-04 (1)). El housekeeping (borrar plan, handoff y reportes) se hace al mergear el PR de TASK-5, que es el que
cierra #16. Hasta entonces los artefactos del ciclo viven en `documents/`.

## 0. Baseline de gates verificado (2026-11-04, `master` `deaadbb`; branch en `0e70fbe` = `deaadbb` + plan + D-20261104-04)

Verificado con `git diff --stat` (sin cambios de código desde cada medición) y con la CI de `master`
(run 41790496035 sobre `deaadbb`: success).

| Área | Medido en | Valor |
|---|---|---|
| Sui CLI | STATUS → Toolchain | `sui 1.83.0-16d2dc1e05ed` (release `testnet`), igual a `SUI_VERSION`/`SUI_COMMIT` de `ci.yml` |
| Node / npm | STATUS → Toolchain | `v26.13.0` / `11.20.0` |
| contracts: build / `--lint` / test | `8fddbda`; sin cambios en `contracts/sources`, `tests`, `Move.toml` ni `Move.lock` hasta `deaadbb` | **0 warnings / 0 lints / 83 tests PASS** (26 `house_tests` + 57 `game_tests`), `Move.lock` sin delta |
| contracts/scripts | `380bce6`; sin cambios en `contracts/scripts` hasta `deaadbb` | `node --test scripts/*.test.mjs` **99 PASS**; `publish.mjs check` **0 despliegues** |
| app | `7a3b7fb` (TASK-5 de #13); hasta `deaadbb` solo cambia `app/README.md` | `npm ci` 293 paquetes; `audit signatures` 292 firmas; 0 vulnerabilidades de producción (11 *moderate* solo dev, #35); lint **0 problemas**; typecheck **0 errores**; **915 tests PASS en 57 archivos**; build de testnet `index-*.js` 901.45 kB (273.61 kB gzip) |

Rojos conocidos: ninguno. Criterio de TASK-1: **cero delta** en todo lo anterior.

## Decisiones vigentes (no reabrir)

| ID | Qué fija para este handoff |
|---|---|
| D-20261030-14 | Apache-2.0: `LICENSE` en la raíz y headers SPDX en los fuentes Move (incluidos los tests). Titular `sdelvalle57` |
| D-20261030-10 (3) | Node 26 (no 22, aunque el issue diga 22) |
| D-20261030-15 (2) y (1) | Sin módulo Escrow: la apuesta vive en cada `Game`. La partida terminada se conserva y su depósito de storage no se recupera |
| D-20261030-16 | Aceptar y resolver en la misma transacción; comisión sobre el pozo completo, redondeada hacia abajo |
| D-20261103-03 | Las listas de testnet cubren la ventana del fullnode (≈ 14,6 días); seguimiento en #51 |
| D-20261103-01 (3) | Comisión inicial en testnet: 200 bps. **Está en la branch de #8 (PR #48), no en `master`** (ver §R-5) |
| D-20261104-04 | P-1 = (a) `Refs #16` y `Closes #16` en el seguimiento; P-2 = (a) el README enlaza `testnet.json`, nunca copia IDs; P-3 = (a) README en español. Tomadas por el orquestador por delegación (D-20261104-01) |
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
- **§R-4: check de enlaces.** Un script desechable en `<scratchpad>` (no se commitea; Node 26 sin dependencias) que:
  1. extrae cada enlace `](destino)` del README (fuera de bloques de código);
  2. **relativo:** el archivo existe en `<repo>`; si lleva `#ancla`, coincide con el slug de un encabezado del destino;
  3. **slug de GitHub:** texto del encabezado en minúsculas, borrar todo lo que no sea letra (`\p{L}`), número
     (`\p{N}`), espacio, `-` o `_`, y cada espacio → `-`. Los encabezados dentro de bloques de código no cuentan. Un slug
     repetido en el mismo archivo lleva `-1`, `-2`… en orden de aparición;
  4. **absoluto (`https://`):** `curl -sS -o /dev/null -w '%{http_code}' -L <url>` da 2xx;
  5. imprime una línea por enlace con `OK`/`FAIL` y sale ≠ 0 si alguno falla. Se pega el output completo.

  Anclas que existen hoy en `deaadbb` (calculadas con esa regla; el script del DEV las tiene que dar igual):
  `contracts/README.md#battleshiphouse`, `#battleshipgame`, `#estados`, `#flujo-de-fondos`, `#comisión`,
  `#límites-de-apuesta`, `#autorización` (House), `#autorización-1` (Game), `#retiro-de-comisiones`,
  `#objeto-terminal-y-storage-d-20261030-15-d3`, `#despliegues-7`, `#uso-en-localnet`, `#uso-en-testnet-solo-el-owner`;
  `app/README.md#scripts`, `#localnet`, `#testnet`, `#mis-partidas-13`, `#límite-sin-indexador`, `#wallet`;
  `agents.md#2-repositorio-monorepo`, `#3-comandos-por-área-sin-makefile`, `#localnet-aislada-smokes`, `#app-app`,
  `#4-arquitectura-de-runtime`, `#14-mapa-de-documentación`.
- **§R-5: referencias a decisiones.** Cada `D-YYYYMMDD-N` citado en el README existe en `documents/DECISIONES.md` de la
  branch, **salvo** D-20261103-01 mientras #8 no mergee: entonces se escribe `D-20261103-01 (PR #48)`. Verificación:
  ```bash
  for d in $(grep -oE 'D-[0-9]{8}-[0-9]+' README.md | sort -u); do grep -q "^### $d " documents/DECISIONES.md && echo "OK $d" || echo "AUSENTE $d"; done
  ```
  Solo puede salir `AUSENTE D-20261103-01`, y únicamente si el README lo escribe con `(PR #48)`.
- **§R-6: Node.** Los agentes anteponen `export PATH=<HOME real>/.nvm/versions/node/v26.13.0/bin:$PATH && node --version &&`
  (`v26.13.0`) a todo comando de Node o npm (`agents.md` §3, "App (`app/`)").
- **§R-7: al terminar cada task:** reporte con la plantilla de `documents/FLUJO_AGENTES.md` §5, en
  `documents/REPORTES_README.md` (un archivo, una sección por task). Sin commits ni pushes. "Desviaciones del handoff"
  obligatoria ("ninguna" si no hay).

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
- **NO tocar:** `contracts/Move.lock` (un delta es **N-3**: revertir, frenar, reportar; un repin es de #8),
  `contracts/sources/`, `contracts/tests/`, `contracts/scripts/`, `app/src/`, `.npmrc`, `.nvmrc`, `.github/`, y los worktrees
  de #8, #14 y #15.

### 5. Tests y gates obligatorios (output completo pegado)

Contratos, forma canónica de `agents.md` §3 (desde `contracts/`, con la config sin claves y `printf 'n\n' |`):
```bash
cd <repo>/contracts && printf 'n\n' | sui --version
printf 'n\n' | sui move build -e testnet --warnings-are-errors 2>&1 | tee <scratchpad>/build.log
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

- [ ] Gates de contratos con **0 warnings / 0 lints / 83 tests PASS**, `Updating dependencies` = 0, scripts **99 PASS**,
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
  testnet: `valor inicial de 200 bps (2 %), D-20261103-01 (PR #48); la vigente la muestra la app` (§R-5);
- cancelar y rechazar: el creador cancela y el invitado rechaza, solo mientras está pendiente; vuelve el 100 % al
  creador, sin comisión; no hay expiración;
- estados: pendiente → cancelada o resuelta, sin estado intermedio;
- costos: cada transacción paga gas, y crear una partida deja un depósito de storage que no se recupera, con enlace a
  `contracts/README.md#objeto-terminal-y-storage-d-20261030-15-d3`. **Sin cifras** (ni la reserva de gas de la app ni el
  monto del depósito: son detalle interno y medición, LIM-5).

**Jugar en testnet (sección 5):**
- placeholder 1, un renglón, literal:
  ```markdown
  **URL pública:** se completa después de #8.
  ```
- wallet: Slush (la ofrece la app) o una wallet de navegador compatible con Sui, en la red **testnet**;
- SUI de testnet: el faucet oficial. La URL se toma de la documentación oficial de Sui (docs.sui.io) al implementar y se
  verifica con el check de enlaces (§R-4, 2xx). Si no hay una URL estable, se enlaza la página de docs que explica cómo
  obtener SUI de testnet. **No se inventa**;
- recorrido: lobby (partidas abiertas) → crear → aceptar → resultado → "Mis partidas" (`#/my-games`, con las
  invitaciones recibidas) y abrir una partida por su ID; cada transacción enlaza al explorador (Suiscan);
- límite honesto: en testnet las listas cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento #51); una
  partida más vieja se abre por su enlace o su ID;
- placeholder 2, un renglón, literal (**sin enlace** todavía: el archivo no existe y el check de enlaces fallaría):
  ```markdown
  **IDs de testnet** (`packageId`, `houseId`): en `contracts/deployments/testnet.json`; se completa después de #8.
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
conteos de tests, tamaños de bundle, baselines y cifras medidas; tablas copiadas de los READMEs de área; menciones de
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

## TASK-3: README, secciones posteriores a #14 y #15 (área: docs) [NO EMPEZAR]

**Precondición:** el orquestador mergeó los PRs de #14 y #15 a `master` y trajo `master` a esta branch con un merge commit
(no rebase). El DEV lo verifica: `git log --oneline --merges -5` muestra el merge de `master` y
`git merge-base --is-ancestor origin/master HEAD` da 0. El MID actualiza la §0 de este handoff con el baseline de ese
`master` antes de autorizar el task.

- **HU:** **como** visitante, **quiero** saber cómo se despliega el juego, cómo se administra la House y en qué estado
  está cada parte del proyecto, **para** entender qué funciona hoy y qué falta.
- **Qué implementar:**
  - sección 9, **Despliegue**: dos líneas. Contratos: solo el owner, con enlace a
    `contracts/README.md#uso-en-testnet-solo-el-owner`. App: Railway, con enlace a `app/README.md` → "Despliegue
    (Railway)" (el ancla se calcula sobre el `master` nuevo; hoy, en la branch de #15, sería `#despliegue-railway`);
  - sección 10, **Administración de la House**: el titular del `HouseCap` administra comisión, límites y retiro desde el
    panel de #14 (ruta, nombre del enlace y textos **tal como queden en `master`**), o por CLI; enlaces a la sección del
    panel en `app/README.md` y a `contracts/README.md#autorización`, `#retiro-de-comisiones`;
  - sección 11, **Roadmap**: tabla `Fase | Issue | Tema | Estado`, con estados en texto ("Hecho", "En curso",
    "Pendiente", "Post-MVP"), la fecha del corte y la línea "el estado vivo está en los issues y en
    `documents/STATUS.md`". Fases: contratos y tooling (#1-#7, #39); app (#9-#14); testnet y cierre (#8, #15, #16, #17);
    post-MVP (#18, #51, #53, #54, #56, #58, #35). Cada issue enlazado con su URL completa (`#N` no se enlaza solo en un
    README). Estados re-medidos con
    `gh api 'repos/sdelvalle57/sui_battleship/issues?state=all&per_page=100' --jq '.[] | [.number, .state, .title] | @tsv'`
    (output pegado);
  - sección 7: agregar `Dockerfile` (y `.dockerignore`) si #15 los dejó en la raíz;
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

## TASK-4: `agents.md` §14 y STATUS (área: docs) [NO EMPEZAR]

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
  - `documents/DECISIONES.md`: **no se toca**. D-20261104-04 ya está registrada (`0e70fbe`); si el merge de `master` creó
    un conflicto en la cabecera del archivo, lo resuelve el orquestador conservando el orden descendente.
- **Archivos:** `agents.md`, `documents/STATUS.md`.
- **Criterios de aceptación:** `git diff -- agents.md` limitado a la fila de §14; §R-3 vacío sobre lo agregado; ningún
  conteo de STATUS contradice los reportes de TASK-1..TASK-3.
- **Commit propuesto:** `docs: map the new README and close STATUS H10 (#16)`.

## TASK-5: completar lo que depende de #8 (área: docs, PR de seguimiento) [NO EMPEZAR]

**Precondición (N-1, no delegable):** #8 mergeado (`contracts/deployments/testnet.json`, `contracts/Published.toml` y
D-20261103-01 en `master`), y el owner generó el dominio de Railway (checklist de #15, paso 7) y lo comunicó. El
orquestador crea `docs/issue-16-testnet` desde ese `master`. Si el cierre de #15 (su TASK-6) completa la URL de
`app/README.md` en el mismo momento, se usa la misma URL.

- **HU:** **como** jugador, **quiero** la URL del juego y saber dónde están los IDs de testnet, **para** empezar a jugar sin
  buscar en el repo.
- **Qué implementar en `README.md`:**
  - los dos placeholders pasan a (la URL, la que dio el owner; sin copiar ningún ID, D-20261104-04 (2)):
    ```markdown
    **URL pública:** <URL de Railway>
    **IDs de testnet** (`packageId`, `houseId`): en [`contracts/deployments/testnet.json`](contracts/deployments/testnet.json).
    ```
  - comisión: quitar `(PR #48)` si quedó;
  - roadmap: #8 y #15 con su estado real, #16 "Hecho" al mergear este PR, y la fecha del corte;
  - `documents/STATUS.md`: fila de #16.
- **Archivos:** `README.md`, `documents/STATUS.md`.
- **Criterios de aceptación:**
  - `grep -c "se completa después de #8" README.md` = 0 **y**
    `tr -s '\n' ' ' < README.md | grep -o "se completa después de #8" | wc -l` = 0;
  - `curl -sS -o /dev/null -w '%{http_code}' <URL>` → 2xx (output pegado);
  - §R-3 vacío (ningún ID copiado), §R-4 en verde (incluido el enlace a `testnet.json`), §R-5 sin `AUSENTE`.
- **Body del PR:** `Closes #16`; casilla opcional para el owner (**N-4**, no delegable): settings de "About" del repo
  (descripción, website con la URL, topics). Ningún agente los cambia.
- **Commit propuesto:** `docs: fill the testnet URL and deployment link in the root README (#16)`.

## Riesgos y STOPs del ciclo

| # | Riesgo / STOP | Qué hacer |
|---|---|---|
| R-1 | `license` en `Move.toml` produce un warning o un error | Fallback de TASK-1 §3.4 (aprobado; se declara) |
| N-3 | Delta de `Move.lock` en TASK-1 (o `Updating dependencies` ≠ 0) | `git checkout -- contracts/Move.lock contracts/Move.toml`, frenar, reportar. **No delegable** |
| R-2 | El lock de npm cambia más que 2 líneas | `git checkout -- package-lock.json`, frenar, reportar; decide el MID |
| N-2 | El merge del PR principal publica el sitio (watch paths de Railway: `package.json`, `app/package.json`, `package-lock.json`) | Si Railway ya está conectado sin preautorización, el merge espera al owner. **No delegable** |
| R-3 | Un placeholder partido en dos renglones | §R-2: las dos cuentas iguales |
| R-4 | Anclas rotas tras los merges de #14, #15 u #8 | §R-4 en TASK-2, TASK-3 y TASK-5 |
| R-5 | Un ID, una dirección o una ruta personal entra al README | §R-3 en cada task y antes de cada PR |
| N-1 / N-4 | Publicación, dominio y settings del repo | Del owner; TASK-5 espera y el PR lleva la casilla |
