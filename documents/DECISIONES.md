# Registro de Decisiones — Sui Battleship

> **Versión:** 1.0 · **Fecha:** 2026-10-30
> ADR-lite. Toda decisión aprobada por el usuario (producto de un STOP, una review
> o un cambio de criterio) se registra aquí con ID `D-YYYYMMDD-N`.
> **Las decisiones registradas no se reabren** sin decisión explícita del usuario.
>
> **Formato:** Decisión / Alternativa descartada / Motivo / Aprobado por / Fecha.
> Las decisiones de Cancerbero (de donde se tomó la plantilla) **no aplican** a este proyecto.

---

### D-20261104-05 — Smoke del MVP en testnet: invitación ajena, cierre de #15 y comisiones ajenas (STOPs de producto del plan de #17, tomadas por el orquestador por delegación del usuario, D-20261104-01)
- **Decisión:** (1) **P-1 = (a):** en el paso 2 del smoke, la tercera cuenta (C) que abre por URL la invitación de A a B ve "Esta invitación es para otra dirección." (el texto de `game`/5) **sin** botón "Aceptar", como fija D-20261103-02 para el mismo criterio en #12; `game`/5 queda cubierto por la fixture real y sus tests. (2) **P-2 = (a):** TASK-6 de #15 (Node 26.13.0, camino positivo de `deploy-image` con los IDs reales, E-6 y los 🔵 de la revisión de PR #57) sale con `Refs #15`; la URL pública en `app/README.md`, el registro del smoke B de #15 y `Closes #15` van en el PR de TASK-5 de #16, que también lleva `Closes #16`. (3) **P-3 = (a):** en el paso 4, `fees_collected` = `F0` + las comisiones de los pasos 1-2 + la suma de `fee` de los `GameResolved` ajenos de la ventana, definida por checkpoint: mayor que el de la lectura de la House del paso 0 y menor o igual que el de la lectura del paso 4; en el estado final, `fees_collected` = la suma de las ajenas posteriores al retiro. Las partidas ajenas se anotan y no hacen NO PASA; el retiro saca el total. **No delegado (N-1..N-6, owner):** la publicación de #8 y cualquier republicación, Railway (conexión, dominio, publicaciones, preautorización de merges, check requerido, rollback), la custodia del `HouseCap` (N-3), fondear y firmar con las wallets, el tag `v0.1.0` + GitHub Release y todo cambio de contrato que pida un paso en rojo.
- **Alternativa descartada:** (1) forzar `game`/5 por CLI con la clave de C, o simular el `accept_game` de C por gRPC desde un agente; (2) un PR propio de cierre de #15, o dejar abierto el PR de TASK-6 hasta tener la URL (contradice la precondición del checklist de Railway); (3) igualdad estricta con las comisiones de los pasos 1-2, o contar las ajenas desde la publicación (duplica lo que ya está en `F0`).
- **Motivo:** STOPs P-1..P-3 del plan v1 de #17 (MID), con dictamen del MAYOR ("correctas"); la ventana por checkpoint de (3) sale del MINOR-1 de esa revisión. Aplicadas por delegación (D-20261104-01).
- **Aprobado por:** orquestador por delegación del usuario (D-20261104-01), pendiente de revisión del owner. **Fecha:** 2026-11-04.

### D-20261104-04 — README raíz: cierre, IDs de testnet e idioma (STOPs de producto del plan de #16, tomadas por el orquestador por delegación del usuario, D-20261104-01)
- **Decisión:** (1) **P-1 = (a):** el PR principal de #16 va con `Refs #16`; `Closes #16` va en el PR de seguimiento que completa lo que depende de #8 (URL pública de Railway, enlace a `testnet.json`), igual que #15. (2) **P-2 = (a):** el README **enlaza** `contracts/deployments/testnet.json` y no copia IDs (se puede republicar hasta #17, D-20261103-01). (3) **P-3 = (a):** el README va en español, coherente con la UI y los docs; el inglés queda fuera de alcance.
- **Alternativa descartada:** (1) `Closes #16` con un issue nuevo para lo de #8, o esperar a #8 para todo; (2) copiar el package ID con enlace a Suiscan; (3) inglés o bilingüe.
- **Motivo:** STOPs P-1..P-3 del plan v1 de #16 (MID), aprobado por el MAYOR ("correctas"). Aplicadas por delegación (D-20261104-01, que llega a `master` con #14).
- **Aprobado por:** orquestador por delegación del usuario (D-20261104-01), pendiente de revisión del owner. **Fecha:** 2026-11-04.

### D-20261104-03 — Deploy de la app en Railway: STOPs de producto del plan de #15 (tomadas por el orquestador por delegación del usuario, D-20261104-01)
- **Decisión:** (1) **P-1 = (a):** sin `railway.json`/`railway.toml` (Config as Code está deprecado y los servicios nuevos no pueden usarlo, doc oficial de Railway verificada por el MAYOR); el repo trae un `Dockerfile` en la raíz, que Railway detecta solo, y los settings que solo existen en Railway van al checklist del owner. (2) **P-2 = (a):** el sitio sirve CSP y cabeceras de seguridad (Caddy), sin COOP por el popup de Slush; si una wallet real no conecta en el smoke del owner, solo la CSP pasa a `Report-Only`. (3) **P-3 = (b):** el code-splitting sale de #15 a un issue post-MVP (medido: la portada necesita casi todo el bundle, separar no baja la primera carga). (4) **P-4 = (a):** favicon SVG propio y simple. (5) **P-5 = (a):** #15 se mergea antes de #8 con `Refs #15` (la imagen se niega a construirse sin `testnet.json` y Railway no está conectado); el cierre (`Closes #15`) va en un PR posterior a #8. (6) **TASK-3 (CSP con el kit en la localnet aislada) pasa al PR de seguimiento, junto con TASK-6**, si la localnet sigue ocupada por #14 al momento del ready de #57: el ensayo E-6 ya probó el kit bajo la CSP real de testnet (0 violaciones), nada se publica antes de TASK-6, y el paso 1 del checklist del owner exige TASK-3 y TASK-6 en PASA antes del primer deploy (recomendación del MID en la revisión de TASK-5). **No aplicó:** la localnet quedó libre al mergearse #14 y TASK-3 corrió en el PR #57. **No delegado (N-1..N-5, owner):** crear y conectar el proyecto en Railway (GitHub App, branch, *Wait for CI*, watch paths, healthcheck, dominio), cada publicación del sitio y si los merges con CI verde quedan preautorizados como publicación, #8, el check requerido y el rollback.
- **Alternativa descartada:** (1) IaC `.railway/railway.ts` (dependencia y token nuevos) o un `railway.json` que no se leería; (2) sin cabeceras; (3) code-splitting dentro de #15; (4) favicon genérico; (5) dejar #15 abierto hasta #8.
- **Motivo:** STOPs P-1..P-5 del plan de #15 (MID) con dictamen del MAYOR ("correctas y delegables"), aprobado en la segunda ronda. Aplicadas por delegación (D-20261104-01, que está en la branch de #14 y llega a `master` con su merge).
- **Aprobado por:** orquestador por delegación del usuario (D-20261104-01), pendiente de revisión del owner. **Fecha:** 2026-11-04.

### D-20261104-02 — Panel de administración de la House: STOPs de producto del plan de #14 (P-1..P-4 tomadas por el orquestador por delegación del usuario, D-20261104-01; N-2: ya decidido por D-20261030-11 D4)
- **Decisión:** (1) **P-1 = (a):** una cuenta sin `HouseCap` que abre `#/admin` ve solo "Sin permisos…", sin datos de la House, y no hay enlace en el encabezado. (2) **P-2 = (a):** la comisión se ingresa en **bps enteros** (0..1000) con el % equivalente al lado. (3) **P-3 = (a):** sin diálogo de confirmación extra; junto al botón, un resumen "de X bps (x %) a Y bps (y %)" (y equivalente para los límites), más la ventana de la wallet. El cambio de comisión no es del todo reversible: las partidas creadas mientras rige una comisión la conservan (D-20261030-06 §3). (4) **P-4 = (a):** #14 se mergea con el smoke completo en localnet; la checklist del owner en testnet (cap en la wallet, cambio de comisión y de límites, retiro) va como casillas al **body** de #17 y lo dice el comentario de cierre de #14. (5) **N-2, retiro de comisiones desde la UI:** no es una decisión nueva de fondos; ya lo decide D-20261030-11 D4 ("`withdraw_fees` devuelve `Coin<SUI>`, la PTB decide el destino") más el criterio de #14 ("la PTB lo transfiere a la cuenta conectada"). Alcance: retiro **total** a la cuenta que firma, por construcción; cualquier variante (otro destino, parcial, automático) es STOP no delegable. **Marcado para revisión del owner a su vuelta.**
- **Alternativa descartada:** (1) mostrar la configuración en solo lectura; (2) % con decimales; (3) diálogo de confirmación; (4) dejar el PR abierto hasta el smoke de testnet.
- **Motivo:** STOPs P-1..P-4 del plan v1 de #14 (MID) con dictamen del MAYOR ("correctas"; N-2 "ya decidido"). Aplicadas por delegación (D-20261104-01).
- **Aprobado por:** orquestador por delegación del usuario (D-20261104-01), pendiente de revisión del owner. **Fecha:** 2026-11-04.

### D-20261104-01 — Delegación de STOPs durante la ausencia del owner y hosting de la app en Railway (#14-#16, #15)
- **Decisión:** (1) Mientras el owner está ausente (desde el 2026-11-04, ~12 h, hasta su vuelta), el orquestador avanza #14, #15, #16 y lo que haga falta del MVP, y ante un STOP de **producto** en un plan aplica la opción recomendada por el MID/MAYOR. Cada una se registra en este archivo como "tomada por el orquestador por delegación del usuario (D-20261104-01)" para que el owner la revise al volver. **No se delega** nada que toque fondos, el contrato on-chain, publicaciones o upgrades (testnet o mainnet), claves o settings del repo: eso sigue frenándose hasta que vuelva el owner. (2) #15 aloja la app en **Railway** (cambio del owner sobre la elección inicial de GitHub Pages, el mismo día): el repo deja lista la configuración de Railway para servir el build estático de testnet; crear el proyecto/servicio en Railway, conectarlo al repo y publicar lo hace el owner a su vuelta, junto con #8.
- **Alternativa descartada:** (1) frenar cada issue con STOP hasta la vuelta del owner; (2) GitHub Pages (elegida primero y reemplazada por el owner); Vercel o Netlify.
- **Motivo:** el owner publica en testnet (#8) dentro de ~12 h y pidió adelantar lo máximo posible.
- **Aprobado por:** usuario ("sigues con #14 y los siguientes necesarios … encargate de adelantar lo maximo posible"; "Tomar la recomendada"; "usaremos railway, dejalo lista la configuracion hasta que vuelva y podamos publicar", 2026-11-04). **Fecha:** 2026-11-04.

### D-20261103-03 — Historial de "Mis partidas" en testnet: la ventana del fullnode (STOP P-1 de #13)
- **Decisión:** las listas de "Mis partidas" (invitaciones recibidas, partidas pendientes propias y terminadas) leen, como el lobby, solo el historial que conserva el fullnode público de testnet (~14,6 días, piso `lowestAvailableCheckpoint`), con un texto honesto que lo dice. Se suman dos ayudas: un campo "Abrir partida por ID" y, solo en testnet, un enlace "Ver tu historial completo en el explorador". Una partida más vieja sigue abriéndose por su enlace o su ID, o por la CLI. Confirma D-20261102-04 (1) para las listas de #13; queda un issue de seguimiento post-MVP con la medición de GraphQL.
- **Alternativa descartada:** GraphQL de Mysten solo en testnet (dos caminos de lectura, el de testnet sin prueba en localnet, dependencia de otro servicio; reabre D-20261102-02 (1)); recordar las partidas propias en el navegador (no cubre invitaciones recibidas ni otros dispositivos).
- **Motivo:** STOP P-1 del plan v1 de #13; mediciones públicas del MID y del MAYOR (ventana de 14,56 días; GraphQL sin OR ni filtro por campo, así que no abarata el escaneo de invitaciones).
- **Aprobado por:** usuario ("Aceptar la ventana", 2026-11-03). **Fecha:** 2026-11-03.

### D-20261103-02 — Invitación ajena en el detalle: aviso sin botón (STOP P-1 de #12)
- **Decisión:** una cuenta conectada que abre una invitación dirigida a otra dirección **no ve el botón "Aceptar"**; ve el aviso "Esta invitación es para otra dirección." (el mismo sentido que `ENotInvited`). Nunca se muestra el aviso sin cuenta conectada. El criterio del smoke de #12 "intento con una tercera cuenta (abriendo el detalle por URL) que muestra el error mapeado" se reinterpreta así: en la app, la tercera cuenta recibe el error mapeado `game`/4 al aceptar una partida abierta que otro aceptó antes (carrera); `game`/5 (`ENotInvited`) se cubre por CLI en el smoke y con el test sobre la fixture real.
- **Alternativa descartada:** mostrar el botón a la tercera cuenta para que falle al pulsarlo (contradice el criterio de visibilidad y ofrece una acción que siempre falla); ocultarlo sin aviso.
- **Motivo:** contradicción del issue #12 entre el criterio del botón y el del smoke (STOP P-1 del plan v1; la revisión del MAYOR confirmó la recomendación).
- **Aprobado por:** usuario ("Aviso, sin botón", 2026-11-03). **Fecha:** 2026-11-03.

### D-20261102-05 — "Rechazar invitación" en la app va en #11
- **Decisión:** el botón "Rechazar invitación" (llamada `reject_game`, D-20261030-06 (4)) se entrega en #11, junto a "Cancelar", en el detalle de la partida: visible solo para el invitado y solo en `Pending`; usa la misma maquinaria de transacciones (preflight, confirmación por el nodo, mapeo de aborts, invalidación).
- **Alternativa descartada:** dejarlo para #13 (lista de invitaciones recibidas) o sacarlo del MVP.
- **Motivo:** STOP P-1 del plan de #11 (ningún issue tenía la pantalla); misma página y maquinaria que "Cancelar", costo ~medio task.
- **Aprobado por:** usuario ("Sumarlo a #11", 2026-11-02). **Fecha:** 2026-11-02.

### D-20261102-04 — Historial del lobby en testnet y textos del kit de wallet (#10)
- **Decisión:** (1) Para el MVP se acepta que el lobby de testnet solo cubra el historial que conserva el fullnode público (~14 días, piso `lowestAvailableCheckpoint`): las partidas abiertas más viejas no aparecen en la lista (el detalle por enlace sigue funcionando y se pueden cancelar por CLI). El lobby lo dice con un texto honesto ("No hay partidas abiertas en el historial disponible del nodo (desde <fecha>)") y queda documentado en `app/README.md`; se reevalúa en el plan de #13. (2) Se acepta la UI de conexión mixta: el botón dice "Conectar wallet" y el modal y el menú del kit quedan en inglés (el kit solo permite cambiar el texto del botón); documentado en `app/README.md`.
- **Alternativa descartada:** (1) GraphQL para las listas en testnet (reabre D-20261102-02 (1); habría que medir la retención del indexer) o un indexador propio (fuera del MVP). (2) Una ventana de conexión propia en español.
- **Motivo:** revisión del MAYOR del handoff v1 de #10 (MAJOR-1: poda del fullnode público medida con lecturas públicas) y del plan v1 (MINOR-2, DL-11).
- **Aprobado por:** usuario ("Aceptar para el MVP", "Aceptar la mezcla", 2026-11-02). **Fecha:** 2026-11-02.

## Recientes

### D-20261102-03 — Clave del owner fuera de `~/.sui/` y publicación de prueba en localnet (revisión del plan de #7)
- **Decisión:** (1) la clave de publicación del owner (#8) vive en un **`SUI_CONFIG_DIR` propio**, separado de `~/.sui/`; `~/.sui/sui_config/` queda **sin claves para siempre** (D-20261030-07), de modo que ningún agente que use la CLI pueda firmar como el owner. El script de #7 exige esa config separada en testnet. La confirmación por terminal de D-20261102-01 (4) queda solo como freno contra accidentes (se puede saltar con un pseudo-TTY), sin flag ni variable que la omita; ningún agente corre el camino testnet del script, ni con `--dry-run`. (2) Se autoriza al DEV a ejecutar `sui client publish` de una copia del paquete en la **localnet aislada y desechable** (procedimiento de `agents.md` §3) para obtener un `Published.toml` real como fixture de TASK-1 de #7.
- **Alternativa descartada:** clave del owner en `~/.sui/` (H11 original); fixture sintético de `Published.toml`.
- **Motivo:** revisión del MAYOR del plan v1 de #7 (MAJOR 1-2: `sui client chain-identifier` reescribe el `client.yaml` activo; la confirmación por terminal se salta con `script -qec … /dev/null`).
- **Aprobado por:** usuario ("Config propia, separada", "Sí, autorizo", 2026-11-02). **Fecha:** 2026-11-02. Precisa D-20261102-01 (4) y reemplaza la nota de H11 sobre la clave de #8.
- **Precisión (2026-11-02, housekeeping de #7, MINOR-1 del MAYOR):** el orquestador es un agente: **no publica ni upgradea en testnet**. La cláusula "publicar en testnet sigue requiriendo autorización explícita por publicación" de D-20261030-05/-09 queda como la autorización que el owner se da a sí mismo para cada publicación que corre desde su terminal (`FLUJO_AGENTES.md` §2, `agentes/ORQUESTADOR.md`, `agents.md` §12).

### D-20261102-02 — Base de la app (STOPs de #9)
- **Decisión:** (1) wallet kit `@mysten/dapp-kit-react` (con `@mysten/dapp-kit-core`) y lectura con `SuiGrpcClient` (gRPC-web), por D-20261031-01; `@mysten/dapp-kit` (solo JSON-RPC, deprecado) descartado. (2) Una red por build (`VITE_SUI_NETWORK`); mainnet da error; sin selector en runtime. (3) Cadena de suministro: versiones exactas, `package-lock.json` commiteado, `.npmrc` con `min-release-age` de 7 días, `ignore-scripts`, `save-exact` y `engine-strict`; `npm audit signatures` y `npm audit --omit=dev --audit-level=high` **bloqueantes** en CI (puede poner la CI en rojo ante un aviso nuevo sin cambio de código). (4) Lista de paquetes del plan de #9 con `react-router` (router por hash) y TypeScript 6.0.3 (compatible con `typescript-eslint`); versiones re-verificadas en el handoff. (5) Burner wallet del kit solo en localnet y solo en `npm run dev`; nunca en un build de testnet. (6) Links de transacciones a Suiscan en testnet; sin link en localnet. (7) El check `app` de la CI pasa a ser requerido en la protección de `master` tras el merge de #9; **autorización expresa del usuario** para que lo aplique el orquestador.
- **Alternativa descartada:** GraphQL (en localnet exige indexer + PostgreSQL); kit viejo con JSON-RPC; selector de red en runtime; rangos `^` o auditoría informativa; `wouter`; TypeScript 7 sin linter tipado; sin burner wallet; SuiVision; check `app` informativo.
- **Motivo:** recomendaciones del plan v1 de #9 (`documents/PLAN_APP.md`), con evidencia de npm, `ts-sdks` y `sui-node` 1.83.
- **Aprobado por:** usuario ("Todo lo recomendado", 2026-11-02). **Fecha:** 2026-11-02. Sujeto a la revisión del MAYOR del plan; si cambia una recomendación, se vuelve a consultar.

### D-20261102-01 — Deployments y script de publicación (STOPs de #7)
- **Decisión:** (1) `contracts/deployments/<red>.json` público con 14 campos, incluidos los IDs del `UpgradeCap` y del `HouseCap`, y **ninguna dirección de cuenta** (la del publicador sigue visible on-chain por el digest: sacarla del repo es higiene, no secreto). (2) Script en Node 26 (JavaScript, sin dependencias, tests con `node --test`) en `contracts/scripts/`. (3) `contracts/Published.toml` (lo escribe la CLI y lo usa para upgrades y para impedir doble publicación) es la fuente de verdad de los datos del paquete; el JSON se genera desde la misma transacción con el script, nunca a mano, y la CI falla si no coinciden (ARQ-6). (4) El script publica, pero en testnet exige que el owner escriba "testnet" en su propia terminal (un agente sin TTY aborta), comprueba red, chain id, versión de la CLI = la de `ci.yml`, árbol limpio y que no exista publicación previa; ofrece `--dry-run` y `record` (recuperar sin republicar). La autorización formal de cada publicación sigue siendo del owner (D-20261030-09). (5) Validación (`node --test` + `check`) como pasos del job `contracts` de la CI, con `actions/setup-node` fijada por SHA (v7.1.0), coordinada con #9.
- **Alternativa descartada:** sin ID del `HouseCap` o solo 8 campos; TypeScript ejecutado por Node o bash + `jq`; el JSON como fuente de verdad o no commitear `Published.toml`; script que nunca publica o que publica sin confirmación; job de CI separado o sin CI.
- **Motivo:** recomendaciones del plan v1 de #7 (`documents/PLAN_DEPLOY.md`), con evidencia del código de la CLI 1.83.0.
- **Aprobado por:** usuario ("Todo lo recomendado", 2026-11-02). **Fecha:** 2026-11-02. Sujeto a la revisión del MAYOR del plan; si cambia una recomendación, se vuelve a consultar.

### D-20261031-01 — Fixtures de lectura diferidas a #10 (H-1 del smoke de #6)
- **Decisión:** las fixtures de `getObject` de un `Game` no se capturan en #6. El fullnode de `sui 1.83.0` no sirve JSON-RPC (404 en localnet, H-1 del smoke de #6), así que #10 elige la API de lectura (gRPC o GraphQL) y captura ahí las fixtures reales. En #6, `contracts/README.md` ("Lectura desde la app") deja de presentar JSON-RPC como vía de lectura; `contracts/fixtures/` no se crea.
- **Alternativa descartada:** commitear ahora fixtures en el formato de `sui client object --json` (no es el formato que usará la app); capturar JSON-RPC con indexer + PostgreSQL.
- **Motivo:** H-1 del smoke de #6 (`documents/REPORTES_ACCEPT.md`, TASK-3): todo `POST` al JSON-RPC local da 404 y `sui-node` 1.83 monta solo `sui_rpc_api::RpcService`.
- **Aprobado por:** usuario ("Diferir al #10", 2026-10-31). **Fecha:** 2026-10-31.

### D-20261030-16 — Aceptar, sorteo, pago y comisión (STOPs de #6)
- **Decisión:** (1) **D2 = (a)** comisión redondeada hacia abajo (floor, intermedio `u128`): el resto queda para el ganador; nunca se cobra más que el porcentaje anunciado. (2) **D3 = (a)** la comisión se calcula sobre el **pozo completo** (`2 × bet`): ganador recibe `pozo − comisión`. (3) **D4 = (a)** un solo evento `GameResolved { game_id, creator, acceptor, winner, pot, fee, payout }` (sin `GameAccepted`). (4) **D5 = (a)** `entry fun accept_game(game, house, payment, r: &Random, ctx)` (no `public`); aborts nuevos 7 `EVersionMismatch`, 8 `EWrongHouse`, 9 `ESelfPlay`, 10 `EWrongStake`, reuso de 4 `ENotPending` y 5 `ENotInvited`; orden versión → House → authZ → estado → monto. (5) **D6 = (a)** sorteo sin ramas: índice `generate_u8_in_range(0, 1)` sobre `[creador, aceptante]`, mismo camino y gas para ambos resultados; `add_fees` siempre (también con comisión 0).
- **Alternativa descartada:** redondeo hacia arriba; comisión sobre la ganancia; `GameAccepted` + `GameResolved`; estado antes que authZ; reutilizar el nombre `EWrongVersion`; `generate_bool` + `if` (gas distinto por resultado, ataque de presupuesto de gas); commit-reveal en dos transacciones (reabre D-06 §1).
- **Motivo:** recomendaciones del plan v1 de #6 (`documents/PLAN_ACCEPT.md`); documentación oficial de aleatoriedad de Sui; D-06 §1 (resolución atómica).
- **Aprobado por:** usuario (2026-10-30: "Sobre el pozo", "Hacia abajo", "Uno solo", "Sí, ambas"). **Fecha:** 2026-10-30.

### D-20261030-15 — Diseño de `battleship::game` (STOPs de #5)
- **Decisión:** (1) **D3 = (a)** la partida terminada se conserva como objeto compartido en estado `Cancelled`/`Resolved` con `Balance` 0; el depósito de storage (≈ 0,002–0,003 SUI por partida, a medir en el smoke de #6) no se recupera; es reversible con un borrado futuro restringido al creador. (2) **D4 = (a)** sin módulo Escrow: la apuesta vive como `Balance<SUI>` dentro de cada `Game`. (3) **D6 = (c)** sin timestamp en el contrato: la app usa el `timestampMs` del evento `GameCreated`. (4) **D8 = (a)** una sola `create_game(..., opponent: Option<address>, ...)`; `create_game`, `cancel_game` y `reject_game` son `entry` (no `public`); el rechazo del invitado es una función propia. (5) **DV = (b)** el `Game` guarda `version` al crearse (= `house.version()`); se compara solo al aceptar (#6); cancelar y rechazar nunca la leen (invariante D-20261030-12 §4).
- **Alternativa descartada:** borrar el objeto terminal; módulo Escrow separado; `&Clock` o `epoch_timestamp_ms`; dos funciones de creación o visibilidad `public`; un único cancelar para creador e invitado; `Game` sin versión o con `migrate` propio.
- **Motivo:** recomendaciones del plan v1.1 de #5 aprobado por el MAYOR (`documents/PLAN_GAME.md`).
- **Aprobado por:** usuario ("Todo lo recomendado", 2026-10-30). **Fecha:** 2026-10-30.

### D-20261030-14 — Licencia del repo: Apache-2.0
- **Decisión:** el repo se publica bajo **Apache-2.0** (la misma del framework de Sui): `LICENSE` con el texto oficial en la raíz y cabecera `// Copyright (c) 2025-2026 sdelvalle57` + `// SPDX-License-Identifier: Apache-2.0` en los fuentes Move (`house.move` y los que vengan, empezando por `game.move` en #5). Titular: el handle de GitHub del owner (`sdelvalle57`), modificable si el usuario prefiere su nombre legal.
- **Alternativa descartada:** MIT; quitar la cabecera.
- **Motivo:** misma licencia que el framework de Sui; la cabecera SPDX Apache-2.0 ya estaba en los fuentes.
- **Aclaración (2026-10-30, orquestador; revisión v1.1 del plan de #5, v1.1-5):** "fuentes Move" incluye los módulos de test (`contracts/tests/*.move`); `house_tests.move` se alinea en #5.
- **Aprobado por:** usuario ("vamos con todas las recomendadas", 2026-10-30; titular tomado del usuario git/GitHub del owner). **Fecha:** 2026-10-30.

### D-20261030-13 — CI de contratos (STOPs de #3)
- **Decisión:** (1) STOP-2 = (a) build, `--lint` y test con `-e testnet --warnings-are-errors`, los tres **bloqueantes** (si el run rojo de prueba muestra que el flag no convierte los lints en error, se vuelve a este STOP). (2) STOP-3 = (a) en CI la CLI se instala desde el archivo oficial del release verificado por SHA-256 (+ `actions/cache`); en local sigue `suiup`; PROY-17 se reescribe en ese sentido. (3) STOP-1 = (a) protección clásica de `master` con el check `contracts` requerido, sin reviews obligatorias, sin "up to date", sin bypass (también admins). (4) STOP-4 = (a) exigir actions fijadas por SHA completo en los settings de Actions del repo. (3) y (4) cambian la configuración del repo: se aplican **después** del merge de #3 y los ejecuta el usuario, o el orquestador solo con autorización expresa del usuario en ese momento. **Aplicadas el 2026-10-30 por el orquestador** con autorización expresa del usuario ("Sí, aplícalos tú"): protección clásica de `master` (check `contracts` requerido, `strict: false`, `enforce_admins: true`, sin reviews) y `sha_pinning_required: true` en los settings de Actions.
- **Alternativa descartada:** lint informativo o solo build; `suiup` en CI (MD5 opcional, rate limits); sin protección de `master`; settings de Actions sin cambios.
- **Motivo:** recomendaciones (a) de `documents/PLAN_CI.md` v1: el baseline ya está en 0 warnings / 0 lints, el archivo del release con SHA-256 es la verificación más fuerte disponible y la protección hace cumplir D-20261030-09 (mergear solo con CI verde).
- **Aprobado por:** usuario ("vamos con todas las recomendadas", 2026-10-30), sobre `documents/PLAN_CI.md` v1. **Fecha:** 2026-10-30.

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
