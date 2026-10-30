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

### D-20261030-05 — El orquestador commitea, pushea y abre PRs; el usuario mergea
- **Decisión:** el orquestador commitea un commit por task tras la revisión MID PASA (solo los archivos/hunks del task, mensaje del MID con `Co-Authored-By`), pushea la branch y abre el PR contra `master` con el body del MID. También commitea los docs de `documents/` y `agents.md`. **El merge es del usuario.** Publicar en testnet sigue requiriendo autorización explícita por publicación.
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
