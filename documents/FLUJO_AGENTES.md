# Flujo de Trabajo Multi-Agente — Sui Battleship

> **Versión:** 1.0 · **Fecha:** 2026-10-30 (adaptado del flujo de Cancerbero — D-20261030-01)
> Pipeline de desarrollo con tres roles de agente coordinados por el orquestador (D-20261030-04).
> Monorepo único `sdelvalle57/sui_battleship`: ver `agents.md` §2.

## 1. Roles y permisos

| Rol | Responsabilidad |
|---|---|
| **MAYOR** | Senior revisor: redacta issues de GitHub, aprueba planes/handoffs (exige HU), hace la **revisión de integración** del PR final de cada issue (§7). No ejecuta gates (D-20261030-02). |
| **MID** | Del issue genera **plan** y **handoffs** (sin paso de spec), cada uno con historia de usuario. Revisa cada reporte de task del DEV contra `documents/ESTANDARES.md` antes de autorizar el siguiente handoff. No ejecuta gates. Genera el doc de smoke cuando aplica (§M5 de `agentes/AGENTE_MID.md`). |
| **DEV** | Implementa tasks según handoffs, ejecuta los gates (es el único que corre `sui move build/test`, lint, Vitest, build), reporta con la plantilla §5. |
| **Orquestador** | Sesión principal de Claude Code (`agentes/ORQUESTADOR.md`): pasa artefactos entre roles, crea branches, commitea, pushea y abre PRs. |
| **Usuario (owner)** | Mergea, decide STOPs y escalaciones, custodia keystore/`HouseCap`/`UpgradeCap`, publica en testnet (o autoriza cada publicación), corre los pasos de smoke que exigen su wallet. |

| Acción | MAYOR | MID | DEV | Orquestador | Usuario |
|---|---|---|---|---|---|
| Redactar issues | ✅ | a pedido | ⬜ | ⬜ | ✅ |
| Crear issues en GitHub (`gh`) | ⬜ | ⬜ | ⬜ | ✅ (transcribe el texto del MAYOR) | ✅ |
| Escribir planes/handoffs | revisa y aprueba | ✅ | ⬜ | ⬜ | revisa |
| Escribir código | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| Branches / commits / pushes / PRs | ⬜ | propone mensajes y body | ⬜ | ✅ (D-20261030-05) | ✅ |
| Merges | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Publicar en testnet | ⬜ | ⬜ | ⬜ | solo con autorización explícita | ✅ |
| Aprobar plan / PR | ✅ | ⬜ | ⬜ | ⬜ | ✅ |

**Lectura obligatoria al arrancar (los tres agentes):**
1. `agents.md` — layout, stack, comandos, contrato on-chain y reglas de negocio.
2. `documents/STATUS.md` — ciclos activos, baselines de gates y rojos conocidos.
3. `documents/DECISIONES.md` — decisiones aprobadas (no reabrir sin el usuario).
4. `documents/ESTANDARES.md` — reglas ARQ/SEG/LIM/PROY contra las que se trabaja y revisa.
5. El README del área a tocar (`contracts/README.md`, `app/README.md`, cuando existan).

## 2. Trazabilidad

```
issue #N (GitHub) → plan (documents/PLAN_<TEMA>.md)
                  → branch feature/issue-<N>-<slug> desde master
                  → handoff (documents/HANDOFF_<TEMA>.md — un solo archivo consolidado, versión en encabezado)
                  → implementación (misma branch) → un PR contra master
                  → al mergear: housekeeping (§9) + STATUS.md actualizado
```

- **Issues:** se citan `#N`. Un issue = una unidad de trabajo; las dependencias entre issues se declaran en el cuerpo (`Depende de #N`).
- **Sin paso de spec:** el issue bien escrito (contexto + problema + criterios de aceptación) es la entrada directa del plan.
- **Historia de usuario obligatoria:** todo plan y todo handoff abren con HU (Como/quiero/para + scope en una frase + lo que NO entrega).
- **Branch única por plan:** plan + handoffs + implementación viven en `feature/issue-<N>-<slug>`. Un PR por issue.
- **Cambios contracts + app:** si un issue toca ambos, los tasks de contratos van primero y la app solo consume firmas/eventos ya implementados en la misma branch (PROY-21).
- **Tooling GitHub = CLI `gh`** con la sesión del owner (`gh issue view <N>`, `gh pr create`, …).
- Todo artefacto referencia a su padre (issue, plan, PR); un artefacto huérfano es un hallazgo.

## 3. Pipeline

MAYOR redacta issue → orquestador lo crea → MID genera plan → MAYOR revisa plan (itera hasta aprobar) → MID genera handoffs → DEV implementa task + reporte (§5) → MID revisa vs ESTANDARES (§5) → orquestador commitea → ¿más tasks? → siguiente handoff → smoke si aplica (§6) → orquestador pushea + PR → MAYOR revisión de integración (§7) → usuario mergea + housekeeping (§9).

## 4. Parar vs. actuar y reportar

**STOP obligatorio** — no actuar sin decisión del usuario. Formato: problema concreto (evidencia `archivo:línea`) + 2-3 opciones con trade-offs + recomendación. Aplica cuando el cambio toca:

- **Contrato on-chain:** firmas de funciones `public`/`entry`, structs con `key`/`store`, eventos, abort codes que consume la UI, compatibilidad de upgrade tras una publicación, `contracts/deployments/*.json`.
- **Fondos:** cualquier camino que reciba, retenga o pague SUI (apuestas, pozo, comisión, retiro), la fórmula de la comisión o los límites de apuesta.
- **Seguridad:** capabilities y autorización (`HouseCap`, quién puede aceptar/cancelar/resolver), aleatoriedad, validación de inputs, claves/keystore.
- **Despliegue:** publicar o upgradear en testnet; cualquier cosa en mainnet.
- El alcance acordado en el plan/handoff vigente, o una decisión registrada en `DECISIONES.md`.

**Actuar y reportar** — solo detalles internos de implementación, siempre con la sección obligatoria en el reporte:

```markdown
## Desviaciones del handoff
- Qué cambió:
- Por qué (motivo técnico):
- Verificación extra realizada:
```

(Si está vacía, debe decir "ninguna" explícitamente.) Una mejora ajena al task se propone como issue nuevo, no se implementa.

## 5. Plantilla de reporte de task (DEV — obligatoria)

Sin reporte completo el MID no inicia revisión — **incluidos los tasks solo-UI** (una captura no sustituye el reporte).

```markdown
## Task completado: HANDOFF_<TEMA> — TASK-M

### Branch (con SHA corto del HEAD)
### Archivos modificados/creados
### Qué se implementó (3 líneas máx)

### Tests y gates (output pegado, por área tocada)
- Agregados/modificados: (lista)
- Contracts: sui --version / sui move build (warnings) / sui move test (N tests, PASS/FAIL)
- App: npm run lint / typecheck / npm test (archivos y tests) / npm run build
- Tablas de contrato (contracts/README.md) y app/src/sui/ sincronizados: sí / no aplica

### Verificación manual (localnet / testnet, digests de tx si hubo)
### Desviaciones del handoff (o "ninguna")
### Riesgos / pendientes (o "ninguno")

### Documentación
- READMEs / agents.md actualizados: sí / no aplica (obligatorio si cambió arquitectura, layout,
  comandos, contrato o tests — PROY-20)
- Snippet propuesto para documents/STATUS.md
```

**Revisión del MID** sobre el reporte — checklist fija contra `documents/ESTANDARES.md`, cada hallazgo cita ID de regla + `archivo:línea`: implementa lo pedido (ni más ni menos; HU cumplida) · ARQ+PROY (módulos, visibilidad, objetos por partida, eventos, capas de la app) · SEG (authZ por función con test del caso denegado, fondos conservados, aleatoriedad, sin secretos) · LIM (sin duplicación/código muerto/debug) · tests que cubren happy path + aborts + edge cases según el output reportado · gates en verde o rojos conocidos sin delta · desviaciones declaradas · docs actualizadas.

Salida:

```markdown
## Revisión TASK-M: [PASA | NO PASA]
### Hallazgos
| # | Regla | Archivo:Líneas | Problema | Corrección esperada |
### Siguiente paso: [siguiente handoff autorizado | correcciones al DEV]
### Mensaje de commit propuesto
```

NO PASA = hallazgos concretos con fix esperado, nunca "mejóralo". PASA = se autoriza el siguiente handoff.

## 6. Formato de smoke tests (localnet / testnet / navegador)

El DEV ejecuta lo que pueda (localnet con `sui start --with-faucet --force-regenesis`, direcciones de prueba de la CLI, `sui client call`/PTBs, la app en `npm run dev`). Lo que requiere la wallet del owner o testnet con fondos reales de faucet se entrega como checklist ejecutable sin contexto. El documento (`documents/SMOKE_<TEMA>.md`, formato en `agentes/AGENTE_MID.md` §M5) se completa **durante la corrida** — nunca por adelantado:

```markdown
## Smoke test: [nombre del flujo]
### Precondiciones
- Red: (localnet con comando exacto / testnet + packageId de deployments/testnet.json)
- Cuentas: (ej. dirección A creadora, dirección B oponente, con SUI de faucet)
- Cliente: (CLI / app `npm run dev -w app` + wallet)
### Pasos
| # | Acción | Resultado esperado |
### Si algo falla
- Capturar: digest de la tx + output de `sui client tx-block <digest>` / consola del navegador
- Reportar el número de paso donde falló, con output
```

Regla: pasos numerados, un resultado verificable por paso (balance, estado del objeto, evento emitido). Un paso fallado ⇒ documento NO PASA con evidencia; sin smoke en verde no hay revisión de integración.

## 7. Revisión de integración del PR final (MAYOR)

El MID revisó task por task; el MAYOR revisa **la suma**:

- [ ] Coherencia entre tasks: sin duplicación, mismo patrón de errores/eventos/estilo en todo el diff.
- [ ] Flujos completos de punta a punta (contrato + app si aplica), no solo cada task aislado.
- [ ] Todos los criterios de aceptación del issue/plan/handoff se cumplen.
- [ ] Contrato on-chain consistente con `contracts/README.md` y `app/src/sui/`; compatibilidad de upgrade si ya hay publicación.
- [ ] Fondos: conservación testeada en cada camino; ningún camino deja SUI bloqueado sin salida.
- [ ] `agents.md`, READMEs y `STATUS.md` actualizados si el cambio los toca.
- [ ] Gates en verde (o rojos conocidos sin delta) según el output reportado por el DEV.
- [ ] Sin secretos, sin TODOs sin issue, sin código comentado.

Veredicto con hallazgos 🔴 BLOCKER / 🟠 MAJOR / 🟡 MINOR / 🔵 SUGGESTION, citando `archivo:línea` y escenario de falla. Se publica con `gh pr review <N> --comment --body-file <archivo>` (GitHub no deja aprobar el PR propio del owner); el veredicto va en la primera línea del body.

## 8. Registro de decisiones

Las decisiones no viven en el chat. Toda decisión producto de un STOP, una review o un cambio de criterio se registra en dos lugares:

1. **En el artefacto afectado** (plan o handoff), una línea: `> Decisión (YYYY-MM-DD): se optó por X sobre Y porque Z — aprobado por el usuario.`
2. **En `documents/DECISIONES.md`** con formato `D-YYYYMMDD-N`.

Las decisiones registradas **no se reabren** sin decisión explícita del usuario.

## 9. `documents/STATUS.md` — índice vivo y housekeeping

- `documents/` y `agents.md` se versionan en este mismo repo (público: nada sensible en ellos).
- Al mergear el PR que implementa un plan: **housekeeping** — borrar plan/handoff/smoke/reportes del ciclo con `git rm` en un commit propio y actualizar STATUS.md (fila + fecha + SHA de merge). El histórico vive en git (`git show <sha>^:documents/<archivo>`).
- Un plan obsoleto sin implementar: sus docs se borran igualmente, con la fila "obsoleto" en STATUS.
- Los artefactos de un ciclo **activo** viven en `documents/`.
