# REPORTES_PUBLISH_GUARDS
> Issue: #39 | Handoff: HANDOFF_PUBLISH_GUARDS v1.1 | Branch: `feature/issue-39-publish-guards`

## Task completado: HANDOFF_PUBLISH_GUARDS (v1.1) — TASK-1

> Reporte del DEV transcrito por el orquestador (resumido; los 99 nombres de test y las 83 líneas `[ PASS ]` se omiten; conteos y exit codes literales).

- Branch @ `de94de4`, sin commits. Modificados: `contracts/scripts/publish.mjs`, `contracts/scripts/publish.test.mjs`, `contracts/README.md`, `documents/STATUS.md`.
- **§3.1:** `checkOutArg` rechaza `--out` en testnet (también vacío); al final de `checkPublishArgs` (recibe `out`) y primera sentencia de `commandRecord`; comentario de uso actualizado.
- **§3.2:** `checkConfigDirGuard` envuelve `exists`, `isDir`, `hasClientYaml` y `realpath` con `guarded` (también en el bucle de homes); ante una excepción: `SUI_CONFIG_DIR inválido: no se pudo inspeccionar una ruta (<código>)…`, sin ruta, sin mensaje original, sin `cause`; falla cerrada.
- **§3.3:** `redactConfigDir` → `<SUI_CONFIG_DIR>`, aplicada en `readCliJson` y `formatCliFailure` ("direcciones y config ocultas"); `interpretCliRun` y `runAndKeep` reenvían `configDirs`; `commandPublish` arma `configDirs = [configDir, process.env.SUI_CONFIG_DIR]` y lo pasa a 2 `readCliJson` + 2 `runAndKeep`. README "Despliegues" y baseline de STATUS.
- **Fase roja** (`--test-reporter=tap`, 5 tests sin import ni cambios): `not ok` 10, 12, 15, 19, 20 → `# tests 48 / # pass 43 / # fail 5` (main y checkPublishArgs por aserción; checkConfigDirGuard por aserción `(EACCES)`; redactConfigDir `ReferenceError`; stderr por aserción).
- **Fase verde:** `publish.test.mjs` 48/48. G0 `~/.sui` idéntico (`2026-10-30 17:52:52.515735237 -0500 244`, `client.yaml`); G1/G2/G3 exit 0, `Total tests: 83; passed: 83; failed: 0`; G4 `Move.lock` exit 0; G5 `tests 99 / pass 99 / fail 0`; G6 `0 despliegues`.
- **Greps:** C1 48; C2 `:193`, `:207`; C3 `:191`, `:208`, `:740`; C4 `:626`, `:740`; C5 vacío; C6 solo los archivos del task + handoff; C7/C8 vacíos; C9 README `:521`, `:527`, `:557`, `:562`; C10 STATUS `:40`; C11 `:264`, `:286`, `:420`; C12 `:640`, `:645`, `:647`, `:691`, `:716`.
- Desviaciones: ninguna de contenido (reporter TAP adicional; reflow del README). Riesgos: ninguno (el cableado de `configDirs` en `commandPublish` se verifica por revisión y C11–C12).

## Revisión TASK-1: PASA

> Revisión del MID transcrita por el orquestador (resumida). Revisó el diff completo y el reporte; no corrió gates ni `sui`.

- **Cableado de `configDirs`** verificado leyendo el código: `commandPublish` `:640` → `readCliJson` `:645`, `:647` → `runAndKeep` `:691`, `:716` → `interpretCliRun` `:609` → `formatCliFailure` `:464` → `redactConfigDir` antes de `redactAddresses` (`:420`, `:286`). `commandRecord` no lo necesita (stderr `''`). `redactConfigDir` (`:264-274`) según la especificación.
- **`guarded` falla cerrada** (`:225-237`): las cuatro sondas de disco envueltas (también en el bucle de homes); código filtrado por `FS_ERROR_CODE_RE` o `error de fs`.
- **v2-4 en pie:** stdout nunca se imprime; la redacción nueva solo actúa sobre stderr.
- Los 5 tests prueban lo que dicen; la fase roja coincide con §5. Docs C9 y C10 correctos; sin rutas personales.

| # | Regla | Archivo:Líneas | Problema | Corrección |
|---|---|---|---|---|
| H1 | 🔵 Alcance documentado | `publish.mjs:640`; `README.md:557` | Solo se ocultan el `realpath` y el valor de `SUI_CONFIG_DIR`; otra ruta (p. ej. el keystore en `client.yaml`) no | Aplicado por el orquestador en "Recuperación" (sin cambio de código) |
| H2 | 🔵 | `publish.mjs:273` | Con una config de ruta muy corta, sobre-redacta | Ninguna |
| H3 | 🔵 | este archivo | Fase roja con reporter TAP | Ninguna |
