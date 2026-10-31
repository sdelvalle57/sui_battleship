# Estándares del Proyecto — Arquitectura, Seguridad y Limpieza (Sui Battleship)

> **Versión:** 1.6 · **Fecha:** 2026-10-31 (adaptado de Cancerbero — D-20261030-01; PROY-17: `.nvmrc` = 26 por D-20261030-10; SEG-2 y PROY-9 por D-20261030-11; PROY-10 por D-20261030-11 y D-20261030-12, #4; PROY-17 y PROY-18 por D-20261030-13, #3; PROY-7, PROY-8 y PROY-10 por D-20261030-15, #5; PROY-5 y PROY-7 por D-20261030-16, #6)
> Fuente única de verdad. El DEV implementa contra estas reglas; el MID y el MAYOR revisan contra ellas.
> Toda regla tiene ID: los hallazgos se citan como `SEG-4 violado en contracts/sources/game.move:120`.
> §4 (reglas PROY) tiene prioridad sobre §1–§3.
> **Código legado:** no queda código de 2025-03 en el árbol: `game.move` y `battleship.move` se retiraron en #2 y
> `house.move` se reescribió en #4 conforme a estas reglas. Las reglas aplican a todo código **nuevo o tocado**.

---

## 1. ARQUITECTURA (ARQ)

- **ARQ-1 — Dirección de dependencias.** Contratos: `game → house` (game usa la API `public(package)` de house; house no conoce a game). App: `components/pages → hooks → sui/ (config, builders de transacción, parsers de eventos, errores)`. Los componentes no importan `@mysten/sui` directamente ni arman targets `pkg::mod::fn`.
- **ARQ-2 — Componentes sin lógica de negocio.** Un componente renderiza estado y dispara acciones; validaciones, armado de transacciones y parseo de eventos viven en `app/src/sui/` o hooks, como funciones puras testeables.
- **ARQ-3 — Efectos inyectables.** RPC, wallet, reloj y aleatoriedad se acceden por dependencias sustituibles en test (cliente Sui por provider/parámetro; `Random`/`Clock` como parámetros de la función Move, nunca implícitos).
- **ARQ-4 — Un patrón por preocupación.** Errores (abort codes ↔ mensajes), eventos, formato de montos y consultas se manejan igual en todo el repo. Un patrón nuevo requiere aprobación del MAYOR.
- **ARQ-5 — Sin dependencias circulares** entre módulos Move ni entre carpetas de la app.
- **ARQ-6 — Contrato en un solo lugar.** El paquete Move es la fuente; la app lo consume desde `app/src/sui/` y `contracts/deployments/<red>.json` (agents.md §5). Cambiarlo exige plan de migración en el plan.
- **ARQ-7 — Sin abstracción prematura.** Las abstracciones nacen del segundo o tercer uso real. Sin refactors oportunistas fuera del task.
- **ARQ-8 — Config solo en el borde.** Red y IDs se leen en un único módulo de config de la app (`import.meta.env` + `deployments/*.json`); ningún componente lee env ni hardcodea IDs.
- **ARQ-9 — Datos vs comportamiento.** Structs Move y tipos TS transportan datos; las transiciones de estado viven en funciones del módulo dueño del struct.

---

## 2. SEGURIDAD (SEG)

- **SEG-1 — Validación en el contrato.** Toda función de entrada valida sus argumentos con `assert!` y un abort code propio: montos dentro de `[min_bet, max_bet]`, monto exacto al aceptar, estado esperado, oponente ≠ creador. La validación de la UI es cortesía; el contrato es la verdad.
- **SEG-2 — AuthZ en cada función.** Toda función `public`/`entry` define quién puede llamarla y lo verifica: admin ⇒ `&HouseCap`; creador/invitado ⇒ comparación de `ctx.sender()` con la dirección guardada. Denegar por defecto. Cada regla tiene un test `expected_failure` del caso denegado; con authZ por capability (`&HouseCap`) el caso denegado no se puede armar como transacción, y se cubre verificando la custodia del cap (dónde está antes y después de transferirlo, y que el nuevo titular administra).
- **SEG-3 — Secretos.** Repo público: jamás claves privadas, mnemonics, keystore (`~/.sui/sui_config/`), tokens de API ni `.env` con valores reales en código, docs, issues, logs o capturas. Un secreto en el diff = BLOCKER + rotación.
- **SEG-4 — Fondos.** Los SUI se custodian como `Balance<SUI>` dentro del objeto dueño; `Coin` solo en la frontera (entrada/salida). Todo camino que recibe fondos tiene un camino de salida (cancelar, resolver); ninguno deja SUI bloqueado ni crea/destruye valor. Conservación verificada en tests (balances antes/después de cada actor y de la House).
- **SEG-5 — Aleatoriedad.** Solo `sui::random::Random` (objeto `0x8`) con `RandomGenerator` creado dentro de la función. La función que consume aleatoriedad es `entry` **no `public`** (otro paquete no puede componerla y abortar si pierde) y su camino perdedor no consume más gas que el ganador. Nunca `ctx.epoch()`, timestamps ni IDs como fuente de azar.
- **SEG-6 — Aritmética.** Comisiones en basis points con intermedio `u128` (`amount * fee_rate / 10_000`) para evitar overflow; redondeo definido y testeado (a favor de quién va el resto). Sin restas que puedan dar underflow sin `assert!` previo.
- **SEG-7 — Objetos compartidos acotados.** Sin vectores ni loops que crezcan sin límite con input de usuarios en objetos compartidos (DoS/contención). Índices globales vía eventos o `Table`/dynamic fields.
- **SEG-8 — Dependencias nuevas justificadas.** Todo paquete npm o dependencia Move nueva: necesidad, mantenimiento activo, licencia compatible.
- **SEG-9 — UI segura.** Sin `dangerouslySetInnerHTML`; IDs/direcciones de la URL validados (`isValidSuiObjectId`/`isValidSuiAddress`) antes de usarlos; la app nunca pide ni maneja claves o seeds — todo se firma en la wallet.
- **SEG-10 — Resultado honesto de transacciones.** La UI solo muestra éxito si `effects.status` es `success`; un abort se mapea a mensaje claro con su código; nunca éxito optimista sin reconciliar.

---

## 3. LIMPIEZA (LIM)

- **LIM-1 — Naming honesto.** Move: módulos y funciones `snake_case`, structs `PascalCase`, constantes de error `EPascalCase`, otras constantes `UPPER_SNAKE_CASE`, OTW = nombre del módulo en mayúsculas. TS: `PascalCase` componentes/tipos, `camelCase` funciones/variables.
- **LIM-2 — Una responsabilidad por unidad.** Si describir una función requiere "y también", se divide.
- **LIM-3 — Cero código muerto.** Sin funciones sin llamadores ni uso previsto en el plan, imports sin uso, structs sin uso (ej. `TurnCap`) ni código comentado "por si acaso".
- **LIM-4 — Sin restos de debug.** Nada de `std::debug::print`, `console.log` ni flags de desarrollo en código entregado.
- **LIM-5 — Sin duplicación.** Dos veces = candidata a extraer; tres veces = obligatorio.
- **LIM-6 — Sin magia.** Límites, denominador de basis points, fee máximo y montos van en constantes nombradas.
- **LIM-7 — Comentarios para el POR QUÉ.** `///` doc comments en toda función/struct pública; los comentarios internos explican restricciones no obvias (por qué `entry`, por qué ese redondeo).
- **LIM-8 — Errores específicos.** Un abort code por condición; nunca reutilizar un código para otra causa. En TS, nada de `catch` que trague errores.
- **LIM-9 — Sin warnings nuevos.** `sui move build` sin warnings nuevos; ESLint y `tsc` estricto en la app. Con un rojo conocido, el criterio es **cero delta**.
- **LIM-10 — TODOs con dueño.** Todo `TODO`/`FIXME` nuevo referencia un issue (`// TODO(#12): ...`) o se elimina.
- **LIM-11 — Tests legibles y deterministas.** Nombre del test = comportamiento verificado (`test_accept_rejects_wrong_amount`). Sin red real, sin orden implícito, aleatoriedad con semilla de test.

---

## 4. REGLAS ESPECÍFICAS DEL PROYECTO (PROY)

### Contratos (`contracts/` — Sui Move 2024)

- **PROY-1 — Estructura.** Un módulo por archivo en `contracts/sources/<modulo>.move` (`battleship::house`, `battleship::game`); tests en `contracts/tests/<modulo>_tests.move`; helpers `#[test_only]` en el módulo solo si el test necesita acceso privado.
- **PROY-2 — Abort codes.** Constantes `const EAlgo: u64 = N;` únicas por módulo (o `#[error]` de Move 2024 si el plan lo adopta para todo el paquete — ARQ-4). Un código publicado no cambia de número ni de significado; la tabla de `contracts/README.md` y `app/src/sui/errors.ts` se actualizan juntas.
- **PROY-3 — Capabilities.** Las operaciones de admin reciben `&HouseCap` (no basta `ctx.sender() == admin`). Las capabilities no tienen `store` salvo decisión registrada (transferencia controlada).
- **PROY-4 — Visibilidad.** `public(package)` para lo que solo usa otro módulo del paquete (ej. `house::add_fees`); `entry` para llamadas solo desde transacciones (obligatorio con `Random`); `public` solo para API componible deliberada, porque su firma queda congelada tras publicar.
- **PROY-5 — Aleatoriedad.** Ver SEG-5. Todo lo que puede abortar va antes del sorteo; el sorteo elige por índice, sin ramas; el `Random` va en el último `MoveCall` del PTB. Tests con los helpers de test de `sui::random` y casos de ambos resultados del coinflip.
- **PROY-6 — Un objeto por partida.** Cada partida es su propio objeto compartido con su estado; sin `GamePool` ni vectores globales. Las listas para la UI salen de eventos.
- **PROY-7 — Eventos.** Toda transición de partida y toda operación de admin emiten un evento `has copy, drop` con el ID del objeto y los datos que la UI necesita (direcciones, montos, ganador). Partidas: `GameCreated` (crear), `GameCancelled` (cancelar y rechazar, con `cancelled_by`) y `GameResolved` (aceptar, con `acceptor`, `winner`, `pot`, `fee`, `payout`). Cambiar un evento = cambio de contrato.
- **PROY-8 — Estados explícitos.** Estados como `enum` Move (`GameState` = `Pending | Cancelled | Resolved`); cada función verifica el estado de entrada con un abort code propio. Un objeto terminal (cancelado/resuelto) no retiene `Balance` > 0.
- **PROY-9 — Tests de contrato.** `sui::test_scenario` con varias direcciones; por cada función: happy path, cada abort (`#[expected_failure(abort_code = battleship::<modulo>::E…)]`), authZ denegada (con capability: verificando la custodia del cap, no con `expected_failure`; ver SEG-2) y conservación de fondos. Todo fix: primero el test que reproduce el bug.
- **PROY-10 — Upgrades.** Tras la primera publicación, todo cambio se evalúa contra la compatibilidad de upgrade de Sui; si rompe, STOP (upgrade vs republicación). `UpgradeCap` y `HouseCap` los custodia el owner. La House compartida lleva `version` + `EWrongVersion` + `entry migrate` con `&HouseCap` (D-20261030-11). Invariante SEG-4 para los objetos que custodian fondos de jugadores (`Game`, #5): un camino de reembolso (cancelar/rechazar) nunca puede quedar bloqueado por la versión. Mecánica de `Game` (D-20261030-15 DV): `version` fijada al crear (`= house.version()`) y comparada solo al aceptar (#6); cancelar y rechazar no reciben la House ni leen la versión; `GameState` no admite variantes nuevas (ni `Game` campos nuevos) tras publicar (#8).
- **PROY-11 — Manifest.** `Move.toml` en el formato del sistema de paquetes de la CLI registrada en STATUS (≥ 1.63): `std`/`sui` implícitas (sin entrada `Sui` git ni `implicit-dependencies = false`), sin `[addresses]`/`[dev-addresses]`; deps git de terceros con `rev` = SHA de 40 caracteres. El framework queda fijado por `Move.lock` (regenerado por la CLI con `-e testnet`, nunca a mano, commiteado); todo cambio de `Move.lock` en un diff se declara y justifica en el reporte. `edition` declarada. Direcciones publicadas en `Published.toml` (commiteado); `Pub.*.toml` nunca se commitea.

### App (`app/` — Vite / React / TS)

- **PROY-12 — Tipado.** TS `strict`, sin `any`; montos en MIST como `bigint` (nunca `number` ni floats para SUI); conversión a SUI solo en un util de formato.
- **PROY-13 — Capa `sui/`.** Targets Move, builders de `Transaction`, tipos de eventos, parseo de objetos y mapeo de abort codes viven solo en `app/src/sui/`, con tests Vitest.
- **PROY-14 — Data fetching.** Lecturas vía hooks del wallet kit / TanStack Query sobre el cliente Sui (`useSuiClientQuery` o equivalente); nada de `fetch` manual ni `useEffect` para pedir datos. Invalidar/refrescar tras cada transacción exitosa.
- **PROY-15 — Red e IDs.** La red activa y los IDs salen de `contracts/deployments/<red>.json` vía el módulo de config (ARQ-8); la app indica claramente en qué red está.
- **PROY-16 — UX de transacciones.** Toda acción muestra estados pendiente/éxito/error, deshabilita el doble envío y enlaza el digest a un explorador de la red activa.

### Proceso

- **PROY-17 — Toolchain.** Node 26 (`.nvmrc`) y npm workspaces desde la raíz; Sui CLI instalada con `suiup` en local; en CI, el binario `sui` del mismo asset del release, verificado por SHA-256; versión registrada en STATUS y en el `env` del workflow, siempre iguales.
- **PROY-18 — CI.** El gate local y el de CI son el mismo (`agents.md` §3 = steps del job `contracts`). Un rojo de `contracts` bloquea el merge; `framework-drift` es informativo.
- **PROY-19 — Antes de entregar:** gate completo del área tocada con output pegado (agents.md §3). Rojos conocidos (STATUS.md) se reportan con su número, nunca como verdes.
- **PROY-20 — Docs viven con el código.** Si el cambio toca arquitectura, layout, comandos, contrato on-chain o tests, se actualizan README del área, `agents.md` y `documents/STATUS.md` en el mismo PR.
- **PROY-21 — Contratos primero.** Un cambio que afecte contrato y app: tasks de contrato antes que los de app; la app nunca consume una firma/evento que no esté implementado y testeado en la misma branch o en `master`. Publicación y `deployments/*.json` en el mismo PR.
