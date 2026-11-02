# REPORTES_LOBBY
> Issue: #10 | Plan: PLAN_LOBBY v1.1 | Handoff: HANDOFF_LOBBY v1.2 | Branch: `feature/issue-10-lobby`

## Task completado: HANDOFF_LOBBY (v1.2) — TASK-1 (fixtures reales de lectura gRPC y sondas P1–P7)

> Reporte del DEV transcrito por el orquestador (resumido; tablas de sondas y salidas clave literales; rutas con placeholders).

- Branch @ `c344d98` (el HEAD pasó de `2a6be71` a `c344d98` durante la sesión: v1.2 solo toca TASK-3/4). Sin commits. Creados: `app/scripts/capture-read-fixtures.mjs`, `contracts/fixtures/game-reads.localnet.json` (19 541 bytes). Modificado: `contracts/README.md` (+39/−12: "Lectura desde la app" y fila en la tabla de rutas).
- **STOP contingente: no salta** (causas 1–3). **Hallazgo de diseño:** en el fullnode público, el envoltorio `client.listEvents` (sin rango) falla con `OUT_OF_RANGE` ("requested data below earliest available"); solo sirve el crudo `ledgerService.listEvents` con `startCheckpoint` ≥ piso (H-1/M-4). El filtro `eventType` exige direcciones completas.
- **Gates (antes y después, iguales):** Node v26.13.0 / npm 11.20.0 / sui 1.83.0; `npm ci` 0; firmas 292 OK; audit prod 0; lint 0; typecheck 0; `Tests 142 passed (142)`; build 0 (826.07 kB); Move build/lint 0, `83 passed`; `node --test` **99/99** (Desviación 1: +5 de #39); `check` "0 despliegues"; `git diff --exit-code` de `Move.lock`, `package*.json`, `eslint.config.js` → 0. Lint del script 0 errores.
- **Localnet aislada** (chain `1f1f882e`; cuentas de génesis en `ids.env`, no se pegan): publicación variante B (`BoD3Cg79…`, checkpoint 59); `update_fee_rate` 250; partidas `G_OPEN`, `G_INVITE`, `G_CANCEL` (cancelada), `G_REJECT` (rechazada por `B`), `G_RES` (aceptada por `B`: `pot` 2000010 = `payout` 1950010 + `fee` 50000, ganó `B`); P6: `cancel_game` sobre `G_RES` → `MoveAbort` 4; P1: PTB con 60 `create_game`.
- **Guarda de URL:** con `fetch` trampa, `--url https://fullnode.testnet.sui.io:443` → mensaje "solo se captura desde la localnet aislada (http://127.0.0.1:9000)… No se hizo ningún pedido." `exit=2`.
- **Captura:** dos corridas, `diff` sin `capturedAt` → 0. Fixture: `_meta`, 5 objetos (`Shared`, tipo `<orig>::game::Game`, BCS base64), 5 eventos (`bcs` + `json`, sin `sender`), `transactions` (`gameCreatedOpen` cp 204, `publish` cp 59), `rawListEventsPage` (3 frames, último `ITEM_LIMIT`).
- **P1:** 50 + 15 = 65 únicos (5 + 60), sin duplicados, igual a la CLI. **P2/P4:** las 5 variantes re-serializan igual, `json` = BCS; bytes sobrantes no lanzan (re-serializa ≠ ⇒ DL-1 compara bytes); variante 3 lanza "Unknown value 3 for enum GameState"; eventos `pot = payout + fee`. **P3:** 6/6 `timestampMs`/`checkpoint` iguales a `tx-block`. **P6:** una tx fallida **sí** cambia `previousTransaction` (versión 108 → 109) ⇒ "Última actividad" correcta. **P7 localnet:** piso 0; 50 (`ITEM_LIMIT`) + 15 (`CHECKPOINT_BOUND`, watermark 59); `getCheckpoint` 59 con `sequence_number` y `summary.timestamp` = hora de la publicación.
- **P5/P7 testnet** (lectura pública, Node + `SuiGrpcClient`, sin claves, código en `<scratchpad>`; 21/40 pedidos, un único `limit` 1000):
  - `SystemEpochInfoEvent` (dirección completa) crudo desc `limit` 50 desde piso + 20000: 14 eventos, `CHECKPOINT_BOUND`, **1 pedido cubre 5 464 571 checkpoints ≈ 348 h (~14 épocas)**; 4,36 checkpoints/s; época ≈ 381 368 checkpoints ≈ 24,3 h.
  - `limit` 1000 sin filtro → 1000 eventos, `ITEM_LIMIT` ⇒ tope ≥ 1000.
  - Piso `lowestAvailableCheckpoint` ≈ 396 603 024; punta − piso ≈ 349,5 h ≈ **14,6 días**; el piso avanza parejo (~4 cp/s).
  - Poda: crudo con `startCheckpoint` < piso → **`OUT_OF_RANGE`** inmediato (0 frames, mensaje cita `tx_seq`); `getCheckpoint` < piso → `NOT_FOUND`; `getTransaction` podada → "Transaction … not found" (`TransactionError` `notFound`).
  - Paginación con `before` y `limit` 5: 5/5/4, `ITEM_LIMIT` ×2 + `CHECKPOINT_BOUND`, sin duplicados, el cursor siempre avanza.
- **Calibración propuesta:** `LOBBY_EVENTS_PER_REQUEST` 50; `LOBBY_MAX_REQUESTS_PER_PAGE` **2**; `LOBBY_PAGE_TARGET` 20; `LOBBY_FLOOR_MARGIN_CHECKPOINTS` **16 000** (≈ 1 h).
- **Cierre:** `sui` por PID (exit 144 esperado), puertos libres, sin `contracts/deployments/`, `<SMOKE_DIR>` borrado, `~/.sui` idéntico (`2026-10-30 17:52:52.515735237 -0500 244`), `Move.lock` sin delta.
- **Desviaciones:** (1) baseline 99 vs 94 (explicado por #39; siguió sin parar); (2) P5 (i)/(ii) unificadas en el crudo; (3) 4 pedidos sin resultado contados; (4) `limit` 1000 sin filtro; (5) P1 = 65; (6) P7 (ii) podado por deducción; (7) script: guarda como primera instrucción, `suiCliVersion` del JSON, variantes deterministas; (8) P6 antes de la captura (a propósito).
- **Riesgos:** toda lista usa el crudo con `startCheckpoint`; la poda se detecta por `OUT_OF_RANGE`. Hex de 40-64 solo en la fixture (70 líneas, IDs y direcciones efímeras de la génesis, sin claves); sin claves ni rutas personales.

## Revisión TASK-1: PASA (con 3 correcciones de una línea, aplicadas por el orquestador)

> Revisión del MID transcrita por el orquestador (resumida). No corrió localnet, `sui`, testnet ni gates; verificó historial con `git` y la fixture con lecturas locales.

Confirmado: guarda de URL antes de cargar el SDK (`:10-32`), exit 2 con cualquier otra URL; chequeo de `network` y chain id (`:70-81`); sin `console`, lint 0. Fixture con `_meta`, 5 variantes `Shared`, 5 eventos, `transactions`, `rawListEventsPage`; **`sender` 0 apariciones**; determinista. Sondas P1–P7 respondidas; M-3 respetado (21/40, un `limit` 1000). STOP contingente: no. Gates iguales antes/después; cierre limpio.

**Decisiones:**
> Decisión (2026-11-02): la desviación 1 (`node --test` 99 en vez de 94) se acepta: el §0 del handoff citaba `dfb11ce` y la base real es `bee80e5` (+#39, solo scripts/README/STATUS, nada de `app/`) — error del MID; §0 pasa a `bee80e5`/99 en la v1.3 — MID.
> Decisión (2026-11-02): calibración del lobby `LOBBY_EVENTS_PER_REQUEST` 50, `LOBBY_MAX_REQUESTS_PER_PAGE` 2, `LOBBY_PAGE_TARGET` 20, `LOBBY_FLOOR_MARGIN_CHECKPOINTS` 16 000 (origen: P5/P7) — MID.
> Decisión (2026-11-02): precisión H-5 de M-4: en `lobby.ts` paso 3b, un `RpcError` `OUT_OF_RANGE` ⇒ `HistoryPrunedError` directamente (medido en P7); el resto mantiene la relectura del piso y NIT-1 — MID.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| 1 | Proceso (§0) | `HANDOFF_LOBBY.md:50-67` | Baseline `dfb11ce`/94 ≠ base real `bee80e5`/99 | v1.3 |
| 2 | M-4 / DL-5 | `HANDOFF_LOBBY.md:403-408` | `OUT_OF_RANGE` no siempre llega como "fin del historial" | v1.3: H-5 + test; constantes en §3; nota para TASK-6 sobre `client.listEvents` |
| 3 | PROY-20 / FLUJO §9 | `contracts/README.md:440` | Citaba el handoff efímero | Aplicada: "(#10, D-20261102-04)" |
| 4 | PROY-20 | `contracts/README.md:431` | Receta dependía del `app.env` del smoke | Aplicada: Node 26 (prefijo de `agents.md` §3) + `node app/scripts/capture-read-fixtures.mjs` |
| 5 | Coherencia | `contracts/README.md:438` | "~14,5 días" | Aplicada: "≈ 14,6 días, medido en #10" |
| 6 | Info | fixture `objects.resolved` | `previousTransaction` = `cancel_game` fallido (P6) | Sin acción; TASK-2/5 no asumen que es la aceptación |

### Siguiente paso
TASK-2 arranca ya; TASK-3 espera HANDOFF_LOBBY v1.3.
