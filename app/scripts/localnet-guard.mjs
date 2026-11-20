// Guarda de localnet compartida por los scripts de captura de fixtures (#10 `capture-read-fixtures.mjs`, #11
// `capture-tx-fixtures.mjs`; DL-15 de #11).
//
// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*` y el módulo puro de la regla de la
// URL, M-4 de #11): importarlo no puede hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como
// primera instrucción, y recién después importa el SDK (import dinámico), crea el cliente y lee el chain id del nodo
// para `assertDeployment`.
import process from 'node:process';
import { LOCALNET_URL, isLoopbackUrl } from '../src/sui/localnetUrl.mjs';

// La regla de la URL (`LOCALNET_URL`, `isLoopbackUrl`: solo `http://127.0.0.1:<puerto>`, 1024-65535, por defecto 9000) vive
// en `app/src/sui/localnetUrl.mjs` y se comparte con la config de la app (#77); acá se importa y se re-exporta tal cual,
// de modo que la guarda de las capturas y el endpoint de la app son la misma función.
export { LOCALNET_URL, isLoopbackUrl };

/**
 * Valida los argumentos de un script de captura: `--url <valor>` opcional (sin `--url`, la URL es `LOCALNET_URL`), el valor
 * tiene que cumplir `isLoopbackUrl` y cualquier otro argumento es un error (`--url` repetido, `--url=<valor>`, etc.).
 * Función pura: devuelve el resultado en vez de escribir por `stderr` o salir.
 *
 * Mantener en sincronía con `localnet-guard.d.mts`; los tests de `app/src/test/localnet-guard.test.ts` son la verificación.
 *
 * @param {string[]} argv argumentos del proceso sin `node` ni el script (`process.argv.slice(2)`)
 * @returns {{ ok: true, url: string } | { ok: false, message: string }}
 */
export function checkLocalnetArgs(argv) {
  const urlFlag = argv.indexOf('--url');
  const url = urlFlag === -1 ? LOCALNET_URL : argv[urlFlag + 1];
  const unknownArgs = urlFlag === -1 ? argv : argv.filter((_arg, i) => i !== urlFlag && i !== urlFlag + 1);
  if (!isLoopbackUrl(url) || unknownArgs.length > 0) {
    return {
      ok: false,
      message:
        'solo se captura desde la localnet aislada (http://127.0.0.1:<puerto>, 1024-65535, por defecto 9000); ' +
        `recibido --url ${String(url)}${unknownArgs.length > 0 ? ` y argumentos desconocidos: ${unknownArgs.join(' ')}` : ''}.`,
    };
  }
  return { ok: true, url };
}

/**
 * Valida los argumentos de un script de captura y devuelve la URL. Con otra URL o con argumentos desconocidos escribe el
 * motivo por `stderr` y sale con código 2 **sin** haber hecho ningún pedido: así una captura nunca puede apuntar a
 * testnet ni a mainnet por error.
 *
 * @param {string[]} argv argumentos del proceso sin `node` ni el script (`process.argv.slice(2)`)
 * @param {string} scriptName nombre del script para el mensaje (p. ej. `capture-read-fixtures`)
 * @returns {string} la URL de la localnet
 */
export function assertLocalnetUrl(argv, scriptName) {
  const result = checkLocalnetArgs(argv);
  if (!result.ok) {
    process.stderr.write(`${scriptName}: ${result.message} No se hizo ningún pedido.\n`);
    process.exit(2);
  }
  return result.url;
}

/**
 * Exige que `contracts/deployments/localnet.json` sea de localnet y de **esta** génesis: el chain id corto del nodo
 * (primeros 8 hex del digest del checkpoint génesis) tiene que coincidir con el del despliegue. Evita capturar contra
 * un despliegue viejo de otra génesis. Recibe el chain id ya leído para no necesitar cliente ni red.
 *
 * @param {{ network?: unknown; chainId?: unknown }} deployment contenido de `contracts/deployments/localnet.json`
 * @param {string} nodeChainIdShort chain id corto del nodo
 * @throws {Error} si la red declarada no es `localnet` o el chain id no coincide
 */
export function assertDeployment(deployment, nodeChainIdShort) {
  if (deployment.network !== 'localnet') {
    throw new Error(`contracts/deployments/localnet.json declara network ${JSON.stringify(deployment.network)}`);
  }
  if (nodeChainIdShort !== deployment.chainId) {
    throw new Error(
      `chain id del nodo ${nodeChainIdShort} ≠ chainId del despliegue ${String(deployment.chainId)}: otra génesis`,
    );
  }
}
