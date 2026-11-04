# PLAN_README v1
> Issue: #16 (resuelve STATUS H10; relacionados #8, #14, #15, #17) | Áreas: docs (+ manifiestos: `contracts/Move.toml`,
> `package.json`, `app/package.json`, `package-lock.json`) | Branch: `feature/issue-16-readme` (desde `master` `deaadbb`) |
> Fecha: 2026-11-04 | Autor: MID

## Historia de usuario

**Como** visitante del repo público (un jugador que quiere probar el juego en testnet o un desarrollador que quiere
correrlo o contribuir), **quiero** un README raíz que diga qué es el juego de verdad (1 vs 1, coinflip on-chain como
placeholder de la batalla naval), sus reglas y sus riesgos, cómo jugarlo en testnet, cómo está armado el monorepo y cómo
levantarlo en local, **para** entender y usar el proyecto sin leer el código ni los documentos internos de los agentes,
y sin que el README actual (2025-03, "2 vs 2", módulo Escrow, "pooled objects") me lleve a conclusiones falsas.

**Scope en una frase:** reescribir `README.md` (visión, reglas, aviso, guía de juego en testnet, arquitectura, estructura,
desarrollo local, despliegue, administración, roadmap real y licencia, enlazando a los READMEs de área sin copiar sus
tablas), completar los campos `license` que faltan y actualizar `agents.md` §14 y STATUS H10.

**Lo que NO entrega:** la URL pública ni los IDs de testnet (no existen hasta #8 y la conexión de Railway; quedan como
placeholder explícito y los completa TASK-5, en un PR de seguimiento); cambios de contrato, de app o de CI; tablas de
funciones, eventos, abort codes o capas (viven en `contracts/README.md` y `app/README.md`); docs de diseño de la batalla
naval real (#18); traducciones; el smoke end-to-end (#17).

## Contexto y alcance

### El README actual (evidencia en `master` `deaadbb`; el archivo no cambió desde `f063a0e`)

| Problema | Evidencia | Realidad |
|---|---|---|
| "2 vs 2" | `README.md:3` | 1 vs 1 (`agents.md` §1) |
| Módulo Escrow separado | `README.md:10, 34-38, 54-55, 74-76` | Absorbido en `Game`: la apuesta es `stake: Balance<SUI>` (D-20261030-15 (2), "D4 = (a)") |
| Diseño tachado como hecho, incluido el Escrow que nunca existió | `README.md:60-62, 65-66` | Estado real en `documents/STATUS.md:11-19` |
| Registro de partidas en la House | `README.md:17` | Contra PROY-6/SEG-7: las listas salen de eventos |
| "shared pooled objects" | `README.md:70` | Un objeto compartido por partida (PROY-6) |
| Sin instalación, uso ni despliegue | `README.md:82-84` | Comandos en `agents.md` §3, guías en `contracts/README.md` y `app/README.md` |

### Criterios del issue: qué está cumplido y qué falta (verificado hoy)

| Criterio | Estado en `deaadbb` | Task |
|---|---|---|
| Visión 1 vs 1 y reglas del MVP | Falta | TASK-2 |
| Módulos reales con link a `contracts/README.md` | Falta | TASK-2 |
| Estructura, requisitos, comandos por área, localnet + app | Falta | TASK-2 |
| "Cómo jugar en testnet": URL, wallet, faucet, package ID | Falta. La wallet y el faucet se pueden escribir ya; la URL y los IDs dependen de #8 y de Railway | TASK-2 (wallet, faucet, placeholders) → TASK-5 (URL, IDs) |
| Roadmap real con links, batalla naval → #18 | Falta | TASK-3 (con los estados posteriores a #14 y #15) → TASK-5 |
| Aviso visible: testnet, sin valor real, sin auditoría externa | Falta | TASK-2 |
| Licencia: archivo `LICENSE` | **Cumplido** (D-20261030-14; `LICENSE` en la raíz, Apache-2.0) | — |
| Licencia: headers de los `.move` consistentes | **Cumplido**: los 4 archivos (`contracts/sources/{house,game}.move`, `contracts/tests/{house,game}_tests.move`) abren con `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0`. El "Your Project" de `house.move:1` desapareció con la reescritura de #4 | — (TASK-1 lo re-verifica con grep) |
| Licencia: campo `license` en `Move.toml` | **Falta**: `contracts/Move.toml` no tiene `license` (ni la línea comentada que cita el issue) | TASK-1 |
| Licencia: campo `license` en los `package.json` | **Falta** en `package.json` y en `app/package.json` | TASK-1 |
| `agents.md` §14 y STATUS H10 | Falta: `agents.md:405` describe el README como "roadmap original (2025-03)"; `STATUS.md:113` (H10) abierto | TASK-4 |

### Discrepancias del issue con decisiones posteriores (resueltas, sin STOP)

- **Node:** el issue pide "Node 22". Rige **Node 26**: `.nvmrc` = `26`, `package.json` `engines` `>=26 <27` con
  `engine-strict` y D-20261030-10 (3), posterior a la redacción del issue. Con Node 22, `npm ci` falla con `EBADENGINE`
  (STATUS, Toolchain). El README dice Node 26 y npm 11.
- **Sui CLI:** la versión de STATUS (Toolchain) y de `ci.yml` (`SUI_VERSION` `1.83.0`, `SUI_COMMIT` `16d2dc1e05ed`),
  instalada con `suiup install sui@testnet-1.83.0` (sintaxis verificada con `suiup install --help`, suiup 0.1.1).
- **Escrow "según #5 D4":** ya decidido, absorbido en `Game` (D-20261030-15 (2)).

### Alcance

- **Dentro:** `README.md` (reescritura completa); `contracts/Move.toml`, `package.json`, `app/package.json` y
  `package-lock.json` (solo el campo `license`); `agents.md` §14; `documents/STATUS.md` (H10, fila 6 de "Punto de
  partida", fila de licencia y fila del ciclo); `documents/DECISIONES.md` (las STOPs delegadas de este plan).
- **Fuera:** `contracts/README.md` y `app/README.md` no se tocan (el README raíz los enlaza; sus anclas se verifican, no
  se cambian); código de `app/` y `contracts/`; CI; headers en los `.mjs`/`.ts` (D-20261030-14 los pide solo en los
  fuentes Move); settings del repo en GitHub (About, website, topics: N-4).

## Contrato on-chain

Sin cambios. `license` en `[package]` de `Move.toml` no entra al bytecode. Verificado en el código de la CLI en el tag
`testnet-v1.83.0`:

- `external-crates/move/crates/move-package/src/schema/manifest.rs`: `PackageMetadata` acepta campos no reconocidos
  (`#[serde(flatten)] unrecognized_fields`) y el test `test_all_package_fields` lista `license` entre los "ignored
  fields"; el test `parse_unrecognized_package_fields` está `#[ignore]` con el comentario "we're not actually producing
  these warnings!".
- `external-crates/move/crates/move-package/src/package/package_impl.rs`, `compute_digest`: el `manifest_digest` que
  guarda `Move.lock` se calcula solo sobre `RepinTriggers { deps }`. Agregar `license` **no** cambia el digest del paquete
  raíz, así que no debería disparar el repin ("Updating dependencies … because Move.toml has been changed").

Las dos cosas las confirma el DEV con los gates (TASK-1): build, lint y test con `--warnings-are-errors` y
`git diff --exit-code -- contracts/Move.lock`. Un delta del lock es **N-3** (no delegable).

## Flujo de fondos

No aplica (sin código). El README **describe** el flujo vigente sin cambiarlo (apuesta en el `Game`, comisión, pago,
reembolsos) y enlaza a `contracts/README.md` → "Flujo de fondos" y "Comisión".

## Secuencia respecto de #14, #15 y #8

`#16` depende de #13 (mergeado), #14 y #15. Los PRs de #14 y #15 se mergean antes que el de #16. Lo que depende de #8
(publicación del owner) todavía no existe.

| Fase | Cuándo | Tasks | Por qué |
|---|---|---|---|
| **A: ya** | Desde `deaadbb`, sin esperar | TASK-1, TASK-2 | Tocan archivos que ninguna branch abierta toca: `README.md`, `contracts/Move.toml`, `package.json`, `app/package.json` y `package-lock.json` (verificado con `git diff --stat master...origin/<branch>` de `feature/issue-14-house-admin`, `feature/issue-15-pages-deploy` y `feature/issue-8-testnet-publish`). TASK-2 escribe solo las secciones que no dependen de #14 ni de #15 |
| **B: después de los merges de #14 y #15** | El orquestador trae `master` a la branch con un **merge** (no rebase) | TASK-3, TASK-4 | TASK-3 escribe "Despliegue", "Administración de la House" y "Roadmap", que describen lo que #14 y #15 dejan en `master`, y re-verifica todos los enlaces y anclas contra el `master` nuevo (#15 agrega "Despliegue (Railway)" a `app/README.md` y #14 una sección del panel). TASK-4 toca `agents.md` y `documents/STATUS.md`, que modifican las tres branches abiertas (#8: §3 y §12; #15: §2, §3 y §12; #14 TASK-6: §2, §5 y §12): hacerlo antes generaría conflictos sin necesidad |
| **C: después de #8 y del dominio de Railway** | PR de seguimiento desde `master` | TASK-5 | La URL pública y `contracts/deployments/testnet.json` no existen hasta entonces. Nunca IDs ni URLs inventados |

- **PR principal** (TASK-1..TASK-4): se abre después de la fase B, con `Refs #16` (P-1).
- **PR de seguimiento** (TASK-5): branch `docs/issue-16-testnet` desde `master`, con `Closes #16`.
- Si #14 o #15 cambian su alcance antes de mergear (otra ruta, otro hosting), TASK-3 sigue lo que haya en `master`, no
  este plan, y lo declara como desviación.
- `#16` no requiere actualizar el PR #48 (#8), congelado en `26f2676`: el owner publica desde su head
  (D-20261103-01) y TASK-1 no toca nada de lo que publica. Al mergear #8 después de #16, `Move.lock` (repineado por #8)
  y `Move.toml` (con `license`) conviven: el digest del raíz no depende de `license`.

## Decisiones internas del plan (actuar y reportar)

> Decisión (2026-11-04): el README **enlaza** y no copia. Copia solo lo que un lector necesita para decidir si juega o
> clona (reglas en prosa, requisitos, 3 o 4 comandos por área); cada tabla de referencia (funciones, eventos, abort
> codes, campos de `deployments`, capas, mapa de `sui/`, gates completos, checklist de Railway) se enlaza (LIM-5).

> Decisión (2026-11-04): las versiones de herramientas aparecen una vez y con su fuente: "Sui CLI `1.83.0` (la de
> `SUI_VERSION` en `.github/workflows/ci.yml` y STATUS → Toolchain)" y "Node 26 (`.nvmrc`)". Sin conteos de tests ni
> tamaños de bundle en el README: cambian en cada issue y viven en STATUS (baselines).

> Decisión (2026-11-04): el texto del placeholder es literal y el mismo que usa #15 en `app/README.md`:
> **"se completa después de #8"**. Así `grep -rn "se completa después de #8" README.md app/README.md` encuentra todos los
> pendientes y TASK-5 tiene un criterio verificable (0 coincidencias en `README.md`).

> Decisión (2026-11-04): el aviso va primero, como alerta de GitHub (`> [!WARNING]`), antes de cualquier instrucción.

> Decisión (2026-11-04): `license` en `Move.toml` y en los dos `package.json` = `"Apache-2.0"` (SPDX, D-20261030-14).
> Sin campo `author` ni `version`: fuera del criterio. El lock se actualiza con `npm install --package-lock-only` y su diff
> tiene que ser exactamente las dos líneas `"license": "Apache-2.0"` (entradas `""` y `app`). Si sale cualquier otra cosa,
> `git checkout -- package-lock.json`, se reporta y el MID decide; nunca un lock re-resuelto.

> Decisión (2026-11-04): si la CLI 1.83.0 emitiera un warning o un error por `license` en `Move.toml` (contra lo leído
> en el código), el campo **no** se agrega y el README dice por qué en una línea ("el manifest de la CLI 1.83 ignora
> `license`; la licencia del paquete la declaran `LICENSE` y los headers SPDX"). Queda aprobado con este plan, sin STOP.

## Decisiones abiertas → STOP

El owner está ausente. Por D-20261104-01 (en la branch de #14; llega a `master` con su merge), los STOPs de **producto**
los toma el orquestador con la opción recomendada y los registra como "tomada por el orquestador por delegación del
usuario (D-20261104-01)", para que el owner los revise a su vuelta. Lo que toca fondos, contrato on-chain,
publicaciones, claves o settings del repo **no se delega**.

### Delegables (producto / docs)

**P-1: cómo se cierra #16 si una parte depende de #8.**
Problema: el criterio "Cómo jugar en testnet" pide la URL de #15 y el package ID de testnet, y ninguno existe hasta que
el owner publica (#8) y conecta Railway (#15, checklist del owner en `app/README.md` de la branch de #15, "Conectar
Railway (owner, no delegable)", pasos 2-7).
- (a) PR principal con `Refs #16` y placeholders literales; #16 se cierra con el PR de seguimiento (TASK-5,
  `Closes #16`). Es el mismo patrón que #15 (D-20261104-03 (5)). Pro: ningún criterio queda cerrado a medias. Contra:
  #16 sigue abierto unas horas más.
- (b) PR principal con `Closes #16` y un issue nuevo "completar el README tras #8". Pro: cierra antes. Contra: cierra un
  issue con un criterio sin cumplir, y suma un issue más.
- (c) Esperar a #8 para todo el PR. Contra: frena lo que se puede escribir ya y deja a #17 sin guía.
**Recomendación: (a).**

**P-2: cómo aparece el package ID de testnet en el README.**
Problema: el criterio pide "package ID de testnet". D-20261103-01 (2) permite republicar en testnet con IDs nuevos hasta
cerrar #17, y la fuente única de los IDs es `contracts/deployments/testnet.json` (ARQ-6, `agents.md` §5).
- (a) El README enlaza a `contracts/deployments/testnet.json` y nombra los campos (`packageId`, `houseId`), sin copiar
  ningún ID. Pro: nunca queda viejo tras una republicación; ningún hex en el README. Contra: un clic más.
- (b) Copiar el `packageId` en el README como enlace a Suiscan. Pro: visible de inmediato. Contra: duplica la fuente
  (LIM-5); una republicación lo deja viejo sin que nada lo detecte.
**Recomendación: (a).** Cumple el criterio (dice dónde está el ID y qué campo mirar) sin duplicarlo.

**P-3: idioma del README.**
Problema: el README actual está en inglés; la documentación del repo y la UI de la app están en español ("Conectar
wallet", D-20261102-04 (2)); el issue deja las traducciones fuera de alcance.
- (a) Español. Pro: coherente con la UI y con todos los docs; un solo idioma que mantener. Contra: menos alcance para
  la comunidad de Sui en inglés.
- (b) Inglés. Pro: alcance público. Contra: el jugador que lo lee ve después una app en español; hay que mantener la
  terminología en dos idiomas.
- (c) Bilingüe. Contra: es una traducción, fuera de alcance del issue.
**Recomendación: (a).** Si el owner quiere inglés a su vuelta, es un issue aparte.

### No delegables (owner)

- **N-1: publicación y dominio.** La URL y los IDs dependen de que el owner publique (#8, D-20261102-03) y genere el
  dominio en Railway (checklist de #15, paso 7; D-20261104-03 "No delegado"). #16 no decide nada de eso: TASK-5 espera.
- **N-2: un merge que toca las watch paths de Railway publica el sitio.** TASK-1 cambia `package.json` y
  `package-lock.json`, que están en las watch paths del checklist de #15 (paso 5). Si cuando se mergea el PR principal
  Railway **ya está conectado** y el owner no dejó registrado que los merges con CI verde quedan preautorizados como
  publicación (paso 10 de ese checklist, N-2 de #15), el merge espera al owner. Si Railway todavía no está conectado (lo
  esperado: el owner lo conecta después de #8), no aplica.
- **N-3: delta de `Move.lock` en TASK-1.** Si los gates cambian `contracts/Move.lock`, el DEV revierte, frena y lo
  reporta: un repin es territorio de #8 (H13) y afecta la publicación. No se resuelve en #16.
- **N-4: settings del repo en GitHub** ("About": descripción, website con la URL de Railway, topics). Son settings: el
  owner, opcional, como casilla en el body del PR de seguimiento. Ningún agente los cambia.

## Contenido del README (contrato de TASK-2 y TASK-3)

Orden y contenido de cada sección. "Enlaza" = enlace relativo con ancla verificada, nunca copia de la tabla.

1. **Título y una línea:** "Sui Battleship: apuestas 1 vs 1 en Sui, resueltas por un coinflip on-chain".
2. **Aviso** (`> [!WARNING]`): solo testnet; los SUI de testnet no tienen valor real; el contrato no tiene auditoría
   externa; mainnet fuera de alcance; no usar una wallet con fondos reales.
3. **Qué es:** 1 vs 1; la batalla naval se simula con un coinflip de `sui::random` (placeholder; la mecánica real es
   #18); varias partidas simultáneas por jugador; sin backend propio.
4. **Reglas del MVP** (prosa, una viñeta por regla; enlaza `contracts/README.md` → "Estados", "Flujo de fondos",
   "Comisión", "Límites de apuesta"):
   - crear: abierta o invitación directa a una dirección; nadie juega contra sí mismo;
   - límites: entre `min_bet` y `max_bet` de la House (por defecto 0,001 y 50 SUI; el admin los cambia; la app muestra
     los vigentes); se aplican al crear;
   - aceptar: iguala **exactamente** la apuesta; en una invitación solo acepta el invitado; acepta y resuelve en la misma
     transacción;
   - comisión: `fee = ⌊2 × apuesta × fee_rate / 10 000⌋` sobre el pozo completo, redondeada hacia abajo (el resto va al
     ganador), máximo 10 % (1000 bps); la partida copia la comisión vigente al crearse; el ganador recibe
     `pozo − fee`. Valor en testnet: se completa después de #8 (D-20261103-01 está en la branch de #8);
   - cancelar y rechazar: el creador cancela y el invitado rechaza, solo mientras está pendiente; 100 % al creador, sin
     comisión; sin expiración;
   - estados: pendiente → cancelada | resuelta, sin estado intermedio;
   - costos: gas de cada transacción y el depósito de storage del objeto de la partida (≈ 0,002 SUI, lo paga el creador
     y no se recupera, D-20261030-15 (1)); la app reserva 0,01 SUI de gas al aceptar.
5. **Jugar en testnet:**
   - URL pública: "se completa después de #8";
   - wallet: Slush (la ofrece el kit) o una wallet de navegador compatible con Sui, en **testnet**;
   - SUI de testnet: faucet oficial. El DEV toma la URL de la documentación oficial de Sui al implementar y la verifica
     (`curl -sI`); no se inventa;
   - recorrido: lobby → crear → aceptar → resultado → "Mis partidas" (`#/my-games`) y abrir una partida por ID; el
     explorador (Suiscan) desde cada transacción;
   - límite honesto: en testnet las listas cubren la ventana del fullnode (≈ 14,6 días, D-20261103-03; seguimiento #51);
     una partida más vieja se abre por su enlace o su ID;
   - IDs de testnet: "en `contracts/deployments/testnet.json` (`packageId`, `houseId`): se completa después de #8" (P-2).
6. **Arquitectura:** diagrama corto del runtime (navegador + wallet → fullnode gRPC-web → paquete `battleship`, sin
   backend; enlaza `agents.md` §4); módulos `battleship::house` y `battleship::game` en dos líneas cada uno (sin Escrow:
   la apuesta vive en cada `Game`), enlazando las secciones de `contracts/README.md`; la app en dos líneas (Vite +
   React + TS, `SuiGrpcClient`, wallet kit; listas desde eventos), enlazando `app/README.md`.
7. **Estructura del repo:** árbol de **primer nivel** (`contracts/`, `app/`, `documents/`, `.github/workflows/`,
   `agents.md`, `LICENSE`, `package.json`; y `Dockerfile` desde #15) con una línea por entrada; el árbol detallado
   se enlaza (`agents.md` §2).
8. **Desarrollo local:**
   - requisitos: Node 26 (`.nvmrc`, `nvm use`) y npm 11; Sui CLI `1.83.0` con `suiup install sui@testnet-1.83.0`;
     Docker solo para verificar la imagen de Railway (opcional, desde #15);
   - aviso de la CLI: sin `~/.sui/sui_config/client.yaml`, `sui move …` ofrece crear una config y genera una clave cuya
     frase imprime (STATUS H11); responder `n` o anteponer `printf 'n\n' |`;
   - contratos: `cd contracts && sui move build -e testnet` y `sui move test -e testnet`; el gate completo (lint,
     `--warnings-are-errors`, scripts, `Move.lock`) se enlaza (`agents.md` §3);
   - app: `npm ci`, `VITE_SUI_NETWORK=localnet npm run dev -w app`, `npm test -w app`; el gate completo se enlaza
     (`app/README.md` → "Scripts");
   - localnet + app: **siempre una localnet aislada** en un directorio propio, nunca `sui start` a secas; enlaza
     `contracts/README.md` → "Uso en localnet" (variante corta para humanos y publicación con el script) y
     `app/README.md` → "Localnet" (variante B, `localnet.json`, burner wallet). Placeholders `<dir>`, nunca rutas reales.
9. **Despliegue** (TASK-3): contratos, solo el owner, enlaza `contracts/README.md` → "Uso en testnet (solo el owner)";
   app en Railway, enlaza `app/README.md` → "Despliegue (Railway)". Una línea cada uno.
10. **Administración de la House** (TASK-3): el titular del `HouseCap` administra comisión, límites y retiro desde el
    panel de #14 (ruta y textos tal como queden en `master`), o por CLI; enlaza `app/README.md` (sección del panel) y
    `contracts/README.md` → "Autorización", "Retiro de comisiones".
11. **Roadmap** (TASK-3): tabla por fase, cada issue con link y estado en texto ("Hecho", "En curso", "Pendiente",
    "Post-MVP"), con la fecha del corte y "el estado vivo está en los issues y en `documents/STATUS.md`". Estado medido
    hoy (TASK-3 lo re-mide después de los merges):
    - **Contratos y tooling:** #1, #2, #3, #4, #5, #6, #7 (y #39) hechos;
    - **App:** #9, #10, #11, #12, #13 hechos; #14 en curso (branch, sin PR todavía);
    - **Testnet y cierre del MVP:** #8 en curso (PR #48 en draft; publica el owner); #15 en curso (PR #57, `Refs #15`,
      cierre después de #8); #16 en curso; #17 pendiente (smoke end-to-end en testnet, cierre del MVP);
    - **Post-MVP:** #18 (batalla naval real, `future`), #51 (historial completo en testnet, `future`), #53 (bucle de
      eventos único en `eventScan.ts`), #54 ("Actualizar" de Mis partidas con una transacción en curso, bug), #56
      (`sdkVersion()`/`plain()` de los scripts de captura), #58 (code-splitting, `future`), #35 (dependencias de dev con
      `minimatch`).
12. **Documentación:** cuatro o cinco enlaces en prosa (`contracts/README.md`, `app/README.md`, `agents.md`,
    `documents/`), sin repetir la tabla de `agents.md` §14.
13. **Licencia:** Apache-2.0, `LICENSE`, titular `sdelvalle57` (D-20261030-14).

**Prohibido en el README:** direcciones de cuentas, IDs u hex de 40-64 caracteres, rutas personales, capturas con datos
de wallet, contenido del keystore (SEG-3); conteos de tests, tamaños de bundle y baselines (viven en STATUS).

## Tasks (ordenados por dependencia)

### TASK-1: campo `license` en los manifiestos (área: contracts + app) [fase A, ya]
- **Entregable:** `license = "Apache-2.0"` en `[package]` de `contracts/Move.toml` (después de `edition`);
  `"license": "Apache-2.0"` en `package.json` y `app/package.json` (después de `private`); `package-lock.json` con
  solo esas dos líneas nuevas.
- **Archivos:** `contracts/Move.toml`, `package.json`, `app/package.json`, `package-lock.json`. No tocar `Move.lock`.
- **Cambios:** el lock con `npm install --package-lock-only` desde la raíz, con Node 26 y el `.npmrc` del repo.
- **Criterio de aceptación:**
  - gate completo del job `contracts` en forma canónica (`agents.md` §3): build, `--lint` y test con
    `-e testnet --warnings-are-errors`, **0 warnings / 0 lints / 83 tests** (sin delta contra STATUS),
    `node --test scripts/*.test.mjs` 99 y `publish.mjs check` "0 despliegues"; `git diff --exit-code -- contracts/Move.lock`;
  - gate completo del job `app` (`npm ci`, `npm audit signatures`, `npm audit --omit=dev --audit-level=high`, lint,
    typecheck, test, build de testnet) sin delta contra el baseline de `deaadbb` (915 tests en 57 archivos);
  - `git diff -- package-lock.json` = exactamente `+"license": "Apache-2.0"` en las entradas `""` y `app`;
  - grep de headers: `grep -L 'SPDX-License-Identifier: Apache-2.0' contracts/sources/*.move contracts/tests/*.move`
    vacío y `grep -rn 'Your Project' contracts/` vacío.
- **Tests:** ninguno nuevo (metadatos).
- **Riesgos / rollback:** warning de la CLI por `license` → fallback ya aprobado (decisión interna); delta del lock → N-3;
  lock con otras líneas → revertir el lock y reportar.

### TASK-2: README, secciones independientes de #14 y #15 (área: docs) [fase A, ya]
- **Entregable:** `README.md` reescrito con las secciones 1-8, 12 y 13 del contrato de arriba; las secciones 9, 10 y 11
  quedan como encabezado con una línea "pendiente de TASK-3" (no se mergea así: el PR se abre después de TASK-3).
- **Archivos:** `README.md`. No tocar los READMEs de área.
- **Criterio de aceptación:**
  - cada regla y cada número del README tiene fuente en el repo (decisión, `contracts/README.md` o código), citada en el
    reporte, no en el README;
  - cada comando existe tal cual (`app/package.json` → `scripts`, `agents.md` §3, `contracts/README.md`);
  - check de enlaces con un script desechable en el scratchpad (no se commitea): cada enlace relativo apunta a un archivo
    existente y cada `#ancla` coincide con un encabezado del destino según las reglas de slug de GitHub (minúsculas,
    sin puntuación salvo `-`, espacios → `-`, letras con acento se conservan; un encabezado repetido lleva `-1`, `-2`…
    en orden: en `contracts/README.md`, "Autorización", "Objetos", "Funciones", "Eventos", "Abort codes"
    y "Contención" aparecen en House y en Game, así que el de Game es `#autorización-1`, etc.). Output pegado;
  - greps de salida, todos vacíos: `grep -nE '[0-9a-fA-F]{40,64}' README.md`,
    `grep -niE 'suiprivkey|mnemonic|seed phrase|/home/|/Users/' README.md`;
  - "se completa después de #8" aparece en la URL, en los IDs y en el valor de la comisión de testnet.
- **Tests:** no aplica (docs). Smoke: no aplica (la guía se ejercita en #17).
- **Riesgos:** duplicar tablas de área (LIM-5): el MID lo revisa contra la lista "enlaza, no copia".

### TASK-3: README, secciones posteriores a #14 y #15 (área: docs) [fase B]
- **Precondición:** `master` con #14 y #15 mergeados, traído a la branch por el orquestador (merge commit).
- **Entregable:** secciones 9 (Despliegue), 10 (Administración de la House) y 11 (Roadmap) según lo que haya en `master`;
  sección 7 con `Dockerfile` si #15 lo dejó en la raíz; requisitos con Docker opcional si aplica; re-verificación de
  **todos** los enlaces y anclas del README contra el `master` nuevo.
- **Archivos:** `README.md`.
- **Criterio de aceptación:** el mismo check de enlaces y los mismos greps de TASK-2; el roadmap con los estados re-medidos
  con `gh api repos/sdelvalle57/sui_battleship/issues?state=all` (output pegado) y la fecha del corte; ninguna mención de
  "GitHub Pages" ni de "hosting por definir".
- **Riesgos:** #14 o #15 mergean con otro alcance → se sigue `master` y se declara.

### TASK-4: `agents.md` §14, STATUS y DECISIONES (área: docs) [fase B]
- **Entregable:**
  - `agents.md` §14: la fila de `README.md` pasa a "Visión del MVP 1 vs 1, reglas, guía de juego y de desarrollo,
    arquitectura, roadmap real y licencia (#16)". Sin tocar otras secciones (las mantienen #8, #14 y #15);
  - `documents/STATUS.md`: H10 → ✅ con fecha y ref; fila "6. Docs y despliegue" de "Punto de partida" con README (#16),
    publicación (#8) y hosting (#15); fila "Licencia" con los campos `license` de TASK-1; fila del ciclo de #16
    "en curso" (el cierre lo hace el housekeeping); baseline de docs de TASK-2/3;
  - `documents/DECISIONES.md`: si el orquestador no registró antes P-1..P-3, la entrada con el siguiente ID libre (hoy
    sería `D-20261104-04`: #14 usa `-01` y `-02`, #15 usa `-03`; se confirma con `git grep` en `master` al escribirla).
- **Archivos:** `agents.md`, `documents/STATUS.md`, `documents/DECISIONES.md`.
- **Criterio de aceptación:** diff de `agents.md` limitado a la fila de §14; greps de TASK-2 sobre los tres archivos
  vacíos para lo agregado.

### TASK-5: completar lo que depende de #8 (área: docs) [fase C, PR de seguimiento]
- **Precondición:** #8 mergeado (`contracts/deployments/testnet.json` y `Published.toml` en `master`) y el owner generó el
  dominio de Railway (checklist de #15, paso 7) y lo comunicó. Si el cierre de #15 (TASK-6 de #15) completa en el mismo
  momento la URL de `app/README.md`, se usa la misma.
- **Entregable:** en `README.md`: la URL pública; el enlace a `contracts/deployments/testnet.json` (P-2 (a)); el valor de
  la comisión configurada en testnet según D-20261103-01 (3) (que llega a `master` con #8), con la nota "la vigente la
  muestra la app"; roadmap con #8 y #15 actualizados; `documents/STATUS.md` (fila de #16). Body del PR con `Closes #16`
  y la casilla opcional N-4 para el owner.
- **Archivos:** `README.md`, `documents/STATUS.md`.
- **Criterio de aceptación:** `grep -n "se completa después de #8" README.md` sin resultados; la URL responde
  (`curl -sI <URL>` → 2xx, output pegado); greps de TASK-2 vacíos (ningún ID copiado: el README enlaza el json); check
  de enlaces en verde.

## Smoke

No aplica: documentación sin flujo ejecutable nuevo. La guía se ejercita en #17 (pasos 1-5 de su `SMOKE_MVP.md`), que
depende de este issue.

## Baseline de referencia (para el handoff)

En `master` `deaadbb` (STATUS): contracts 0 warnings / 0 lints / 83 tests; scripts 99 tests, `check` "0 despliegues"; app
0 problemas / 0 errores / 915 tests en 57 archivos, build de testnet 901.45 kB. El handoff declara en su §0 el baseline
del día: el de `deaadbb` para TASK-1 y TASK-2, y el de `master` después de #14 y #15 para TASK-3 y TASK-4.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | El README queda viejo (roadmap, versiones) | Fecha del corte en el roadmap y puntero a STATUS; versiones con su fuente; TASK-5 y #17 lo refrescan |
| R-2 | Anclas rotas cuando un README de área renombra un encabezado | Check de enlaces en TASK-2, TASK-3 y TASK-5 |
| R-3 | Conflictos con #8, #14 y #15 | Fases A/B/C: lo compartido (`agents.md`, STATUS, DECISIONES) se toca después de los merges |
| R-4 | `license` en `Move.toml` produce un warning o mueve el lock | Verificado en el código de la CLI; gates en TASK-1; fallback aprobado; N-3 |
| R-5 | Un ID, una dirección o una ruta personal entra al README | Greps obligatorios en cada task y antes del PR |
