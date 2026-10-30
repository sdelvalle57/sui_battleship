# Registro de Decisiones — Sui Battleship

> **Versión:** 1.0 · **Fecha:** 2026-10-30
> ADR-lite. Toda decisión aprobada por el usuario (producto de un STOP, una review
> o un cambio de criterio) se registra aquí con ID `D-YYYYMMDD-N`.
> **Las decisiones registradas no se reabren** sin decisión explícita del usuario.
>
> **Formato:** Decisión / Alternativa descartada / Motivo / Aprobado por / Fecha.
> Las decisiones de Cancerbero (de donde se tomó la plantilla) **no aplican** a este proyecto.

---

## Recientes

### D-20261030-12 — Decisiones de diseño de `battleship::house` aprobadas en revisión (#4)
- **Decisión:** dentro del alcance de D-20261030-11, quedan fijadas (y se congelan al publicar en #8):
  1. `update_fee_rate`, `update_bet_limits`, `transfer_house_cap` y `migrate` son `entry` (no `public`): sin consumidor componible, su firma puede cambiar o eliminarse en un upgrade; `withdraw_fees` es `public` porque devuelve un `Coin<SUI>` (una `entry` no puede devolver valores sin `drop`).
  2. Los accessors `fee_rate`, `fees_collected`, `min_bet` y `max_bet` validan la versión primero (`EWrongVersion`), igual que las escrituras: así el código de un paquete viejo (p. ej. `game` v1) aborta en vez de crear partidas con reglas de una House ya migrada.
  3. `version()` es público y **no** valida la versión (lectura de diagnóstico para el panel #14 y los tests de `migrate`).
  4. Invariante PROY-10/SEG-4 para `Game` (#5): ningún camino de reembolso (cancelar/rechazar) puede quedar bloqueado por la versión; la mecánica de versionado de `Game` la decide el plan de #5.
- **Alternativa descartada:** setters `public`; accessors sin chequeo de versión (con el chequeo delegado a `game`); PROY-10 con `migrate` por capability para todo objeto compartido (bloquearía reembolsos de partidas).
- **Motivo:** revisiones del MAYOR del plan v1 (H4) y del handoff v1 (M1, m2, m3) de #4; guía oficial de Sui de objetos compartidos versionados ("guard the entry of all functions that access the shared object").
- **Aprobado por:** MAYOR (revisiones de plan y handoff de #4; registro pedido en la revisión de integración de #24, hallazgo 🟡 1). Detalles de diseño dentro de D-20261030-11, sin STOP de usuario; el usuario puede reabrirlos antes de #8. **Fecha:** 2026-10-30.

### D-20261030-11 — Diseño del módulo House (STOPs de #4)
- **Decisión:**
  1. **D1 = (a)** `init` crea y comparte una única House con valores por defecto y entrega el `HouseCap` al publicador; se elimina `initialize_house`. **Fee por defecto = 0 bps**: el owner la ajusta con `update_fee_rate` (CLI o panel admin #14) después de publicar.
  2. **D2 = (a)** se eliminan el campo `admin` y su accessor: la authZ es la posesión del `HouseCap`.
  3. **D3 = (c)** `HouseCap` con `key` sin `store`; se transfiere solo con `entry fun transfer_house_cap` que emite `HouseCapTransferred` (concreta D-20261030-06 §5).
  4. **D4 = (a)** `public fun withdraw_fees(...): Coin<SUI>` (la PTB decide el destino); aborta con código propio si no hay fees.
  5. **D5 = (a)** abort codes clásicos `const E…: u64` con número estable.
  6. **D6** límites por defecto 0,001 SUI / 50 SUI.
  7. **D7 = (b)** la House lleva campo `version` desde la v1 (constante `VERSION`, `EWrongVersion`, `ENotUpgrade`, `entry migrate` con `&HouseCap`), para poder cerrar versiones viejas tras un upgrade; #5 replica el patrón en `Game`.
- **Alternativa descartada:** House en dos pasos o múltiples Houses; fee por defecto 200 bps; campo `admin` informativo; `HouseCap` con `key, store` (congelable: cualquiera podría usarlo); retiro a `ctx.sender()` o con `recipient`; `#[error]` (el código cambia al mover líneas); sin `version` en el MVP.
- **Motivo:** plan v1.1 de #4 aprobado por el MAYOR (`documents/PLAN_HOUSE.md`). El usuario se apartó de la recomendación en el fee por defecto (0 en lugar de 200 bps) y en D7 (versionado desde ya en lugar de diferirlo).
- **Consecuencia a vigilar:** con fee por defecto 0 y D-20261030-06 §3 (el `Game` copia el fee al crear), las partidas creadas entre la publicación y el primer `update_fee_rate` quedan con comisión 0. El pre-vuelo/post-vuelo de #8 debe ajustar el fee antes de anunciar el juego.
- **Aprobado por:** usuario ("1. a; 2. 0 % y la ajustas desde el panel admin; 3. a; 4. a; 5. números fijos clásicos; 6. se mantienen en 0,001–50 SUI; 7. b de una vez" + D3 (c) por pregunta directa, 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-10 — Reestructura a monorepo: legado fuera y Node 26 (STOPs de #2)
- **Decisión:** (1) `sources/battleship.move` se **borra** (STOP-1 a); recuperable con `git show f063a0e:sources/battleship.move` para #18. (2) `sources/House/README.md` y `sources/Game/README.md` (diseño 2025) se **borran** (STOP-2 a); recuperables con `git show f063a0e:`. (3) El proyecto usa **Node 26** (Active LTS, EOL 2029-04) en `.nvmrc` y PROY-17, en lugar de Node 22 (STOP-3 b); confirma `contracts/`, `app/` y npm workspaces de D-20261030-03.
- **Alternativa descartada:** mover o arreglar `battleship.move` (publicaría y congelaría layouts sin uso, PROY-10); mover los READMEs a `contracts/docs/`; Node 22 (EOL 2027-04-30) o Node 24.
- **Motivo:** recomendaciones del plan v1.1 de #2 aprobadas por el MAYOR (`documents/PLAN_MONOREPO.md`).
- **Aprobado por:** usuario ("sí a todo lo recomendado", 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-09 — El orquestador también mergea (amplía D-20261030-05)
- **Decisión:** el orquestador mergea los PRs contra `master` con merge commit (no squash: conserva los SHAs citados en STATUS y reportes) cuando la revisión de integración del MAYOR no tiene 🔴 BLOCKER ni 🟠 MAJOR abiertos, la CI está en verde (cuando exista, PROY-18) y no queda ningún STOP sin decidir. Tras el merge hace el housekeeping (FLUJO §9) en un PR propio que también mergea. Publicar o upgradear en testnet sigue requiriendo autorización explícita por publicación; mainnet nunca sin decisión registrada.
- **Alternativa descartada:** que el usuario mergee cada PR (D-20261030-05).
- **Aprobado por:** usuario ("encárgate de los merges también", 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-08 — Framework por dependencias implícitas y CLI del canal testnet (#1)
- **Decisión:** (1) `Move.toml` en el formato del sistema de paquetes de la CLI ≥ 1.63: `std`/`sui` implícitas, sin `[addresses]`/`[dev-addresses]`; el framework queda fijado por `Move.lock`, regenerado por la CLI con `-e testnet` y nunca a mano. PROY-11 se reescribe con la redacción de `documents/PLAN_TOOLCHAIN.md` (Decisión 1). (2) Sui CLI del canal testnet (`1.83.0` vía `suiup`).
- **Alternativa descartada:** dependencia `Sui` explícita con `rev` a un tag (solo posible en el formato viejo, que la CLI pide migrar); CLI del canal mainnet.
- **Motivo:** es el formato vigente de la CLI instalada (la plantilla de `sui move new` 1.83 deja `[dependencies]` vacío) y testnet es la red del MVP.
- **Aprobado por:** MAYOR en la revisión del plan de #1 (`git show e1849c6:documents/REVISION_PLAN_TOOLCHAIN.md`) y **ratificado por el usuario** ("sí a todo lo recomendado", 2026-10-30; hallazgo 🟡 1 de la revisión de integración de #20). **Fecha:** 2026-10-30.

### D-20261030-07 — Config de la Sui CLI sin claves para correr gates (STOP-1 de #1)
- **Decisión:** opción (d) de `documents/PLAN_TOOLCHAIN.md` §STOP-1: `~/.sui/sui_config/client.yaml` sin claves (`active_env: testnet`, `active_address: ~`, keystore vacío). Lo escribe el DEV con autorización del usuario para escribir en `~/.sui/`. Los gates corren con `-e testnet`. La clave publicadora la agrega el owner en #8 desde su propia terminal, sin agentes.
- **Alternativa descartada:** (a) inicializar ya `sui client` con clave real; (b) config desechable con clave descartable (la frase pasa por stdout); (c) `-e testnet` sin config (refutada: la CLI pide crear la config antes de leer `-e`).
- **Motivo:** ninguna clave ni recovery phrase pasa por agentes ni logs (SEG-3); el mismo mecanismo sirve para CI (#3).
- **Aprobado por:** usuario ("opción d, la crea el dev, yo te doy el permiso", 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-06 — Reglas de producto de partidas y del `HouseCap` (adelantadas a los planes de #4 y #5)
- **Decisión:**
  1. **Resolución atómica al aceptar** (#5 D1 = a): aceptar ejecuta el coinflip en la misma transacción; `Pending → Resolved | Cancelled`, sin estado `Active` persistente.
  2. **Sin expiración** (#5 D2 = a): una partida `Pending` la cancela el creador cuando quiera.
  3. **Comisión fijada al crear** (#5 D5 = a): el `Game` copia el `fee_rate` de la House en la creación y es el que se aplica al resolver.
  4. **El invitado puede rechazar una invitación** (#5 D7 = b): reembolso íntegro al creador, sin comisión. El creador sigue pudiendo cancelar.
  5. **El `HouseCap` es transferible a otra wallet** (#4 D3 ≠ a): el mecanismo (`key, store` con `public_transfer` o función explícita `transfer_house_cap`) lo propone el plan de #4.
- **Alternativa descartada:** resolución separada con `Active` persistente (#5 D1 b/c/d); expiración con `&Clock`; tarifa leída al resolver; solo el creador cancela; `HouseCap` no transferible.
- **Motivo:** (1)–(3) siguen la recomendación de los issues: ningún camino deja fondos de dos jugadores bloqueados y los jugadores conocen la tarifa al apostar. (4) y (5) los pidió el usuario explícitamente, en contra de la recomendación de MVP.
- **Interpretación registrada:** el usuario respondió "todas sí, menos: el invitado puede rechazar una invitación, sí se puede pasar la llave de admin a otra wallet" al informe de alcance, cuyas preguntas llevaban recomendación; "sí" se registra como "acepto la recomendación" (por eso la expiración queda en "no").
- **Aprobado por:** usuario (2026-10-30). **Fecha:** 2026-10-30. Los planes de #4 y #5 aplican estas decisiones sin reabrirlas; las demás decisiones abiertas de esos issues siguen siendo STOP.

### D-20261030-05 — El orquestador commitea, pushea y abre PRs; el usuario mergea
- **Decisión:** el orquestador commitea un commit por task tras la revisión MID PASA (solo los archivos/hunks del task, mensaje del MID con `Co-Authored-By`), pushea la branch y abre el PR contra `master` con el body del MID. También commitea los docs de `documents/` y `agents.md`. **El merge es del usuario** (reemplazado por D-20261030-09: mergea el orquestador). Publicar en testnet sigue requiriendo autorización explícita por publicación.
- **Alternativa descartada:** que el usuario commitee y pushee cada task.
- **Aprobado por:** usuario ("haz tú todos los pendientes", 2026-10-30, sobre la propuesta P-1). **Fecha:** 2026-10-30.

### D-20261030-04 — Orquestación delegada a la sesión de Claude Code
- **Decisión:** la sesión principal de Claude Code orquesta el pipeline según `documents/agentes/ORQUESTADOR.md`: cada rol corre como subagente con su prompt; las revisiones corren en un subagente distinto del que produjo el artefacto; un solo DEV a la vez (working tree compartido). Primer encargo: crear en GitHub los issues del backlog para terminar el juego.
- **Alternativa descartada:** que el usuario pase los artefactos a mano entre agentes.
- **Aprobado por:** usuario ("luego tú harás de orquestador, primero para que crees los issues en gh", 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-03 — Monorepo con contratos y app React
- **Decisión:** el repo `sdelvalle57/sui_battleship` pasa a monorepo: paquete Move en `contracts/` (con `contracts/deployments/<red>.json`), cliente React en `app/` (Vite + TS + SDK de Sui), npm workspaces en la raíz y Node 22. La reestructura se ejecuta como un issue propio.
- **Alternativa descartada:** repos separados para contratos y UI (duplica CI, issues y sincronización de IDs).
- **Motivo:** un solo lugar para el contrato y su consumidor; los IDs publicados y las tablas de eventos/abort codes cambian en el mismo PR que el código.
- **Aprobado por:** usuario ("esto será un monorepo y agregaremos el UI usando react", 2026-10-30). Nombres de carpetas, npm y Node 22 propuestos por el orquestador; se confirman en el plan del issue de reestructura. **Fecha:** 2026-10-30.

### D-20261030-02 — MAYOR y MID no ejecutan gates; solo el DEV
- **Decisión:** MAYOR y MID revisan exclusivamente el output de los gates pegado en el reporte del DEV; no reproducen `sui move build/test`, Vitest, lint ni build.
- **Alternativa descartada:** que cada revisor re-ejecute las suites.
- **Motivo:** evita costo duplicado y fuerza reportes completos.
- **Aprobado por:** usuario (adopción del flujo, 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-01 — Adopción del flujo multi-agente de Cancerbero, adaptado a Sui Battleship
- **Decisión:** `agents.md`, `documents/FLUJO_AGENTES.md`, `ESTANDARES.md`, `STATUS.md`, este registro y `documents/agentes/` se reescriben para Battleship. Se conservan: roles MAYOR/MID/DEV + orquestador, sin paso de spec, HU obligatoria, branch única por plan, plantillas de reporte/revisión/smoke, `gh` CLI. Se adaptan: repo único con `master` como integración, issues `#N`, gates de Move (`sui move build/test`) y de la app, STOP sobre contrato on-chain, fondos, aleatoriedad y publicación, reglas PROY de Sui Move y React. Los docs de proceso quedan en `documents/` y los prompts de rol en `documents/agentes/`.
- **Alternativa descartada:** copiar los documentos de Cancerbero sin adaptar (stack, repos y decisiones de otro producto).
- **Aprobado por:** usuario ("modifiques los archivos en documents/ y agents.md para este proyecto", 2026-10-30). **Fecha:** 2026-10-30.
