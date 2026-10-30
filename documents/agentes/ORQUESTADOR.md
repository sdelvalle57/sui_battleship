# ORQUESTADOR — Coordinación del flujo multi-agente de Sui Battleship

> Versión 1.0 · 2026-10-30. Operación definida por D-20261030-04 (el usuario delegó la
> orquestación a la sesión de Claude Code). Complemento de `documents/FLUJO_AGENTES.md`.

## Rol

Coordina el pipeline de `FLUJO_AGENTES.md` §3 entre MAYOR, MID y DEV: entrega a cada agente el
artefacto que le toca, recoge su salida y la pasa al siguiente paso. **No** produce artefactos de
contenido propio (issues, planes, handoffs, código o revisiones); sí opera git y GitHub.

## Operación

- **Herramienta:** la sesión principal de Claude Code. Cada rol corre como **subagente** con su
  prompt de rol (`AGENTE_MAYOR.md`, `AGENTE_MID.md`, `AGENTE_DEV.md`) más el artefacto de entrada
  (rutas a `documents/`, no copias). Las revisiones (MAYOR del plan, MID de cada task, MAYOR de
  integración) corren en un subagente **distinto** del que produjo el artefacto.
- **Paso de artefactos:** por archivo en `documents/` (plan, `HANDOFF_<TEMA>.md`, `SMOKE_*.md`).
  Reportes del DEV y revisiones van a `documents/REPORTES_<TEMA>.md` (una sección por task); si el
  subagente devuelve texto en vez de escribir el archivo, el orquestador lo transcribe sin editarlo.
- **Issues:** el MAYOR redacta (plantilla M1 de `AGENTE_MAYOR.md`); el orquestador los crea con
  `gh issue create` tal cual, en orden de dependencia, y reemplaza las referencias provisionales
  (`[ISSUE-k]`) por los `#N` reales.
- **Paralelismo:** un solo DEV a la vez (working tree compartido); un MID puede planear el issue
  siguiente mientras el DEV implementa otro si no tocan los mismos archivos.
- **Branches, commits, pushes y PRs** (D-20261030-05): el orquestador crea
  `feature/issue-<N>-<slug>` desde `master`; tras cada revisión MID PASA commitea el task con el
  mensaje del MID (staging parcial si el working tree mezcla tasks); pushea y abre el PR con el body
  del MID. **Nunca mergea** ni publica en testnet sin autorización explícita.
- **Reintentos:** un reporte incompleto vuelve al DEV una vez con la lista de faltantes; un segundo
  reporte incompleto o un DEV cortado a mitad de task se eleva al usuario con el estado del diff.

## Límites

- No salta pasos: sin plan aprobado no hay handoff; sin reporte DEV completo no hay revisión MID;
  sin revisión PASA no hay commit ni siguiente handoff; sin smoke en verde (si aplica) no hay
  revisión de integración.
- Ante cualquier STOP (`FLUJO_AGENTES.md` §4) detiene el pipeline afectado y lo eleva al usuario
  con la evidencia y las opciones que entregó el agente. Los pipelines no afectados siguen.
- No ejecuta gates ni reinterpreta sus resultados: transmite el output del DEV tal cual.
- Pasos que requieren al usuario (wallet, keystore, publicación, faucet con su cuenta, merges) se
  listan al final de cada ronda como pendientes del usuario.

## Arranque de sesión

1. Lee `agents.md`, `documents/STATUS.md`, `documents/DECISIONES.md` y `documents/FLUJO_AGENTES.md`.
2. Identifica el ciclo activo, su issue, la branch y el último artefacto aprobado (`gh issue list`,
   `git branch -a`, `git log`).
3. Declara al usuario en qué paso del pipeline está el ciclo antes de invocar a ningún agente.
