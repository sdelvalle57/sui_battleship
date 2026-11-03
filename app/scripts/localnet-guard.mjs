// Guarda de localnet compartida por los scripts de captura de fixtures (#10 `capture-read-fixtures.mjs`, #11
// `capture-tx-fixtures.mjs`; DL-15 de #11).
//
// Este módulo **no** importa el SDK ni nada de red en el nivel superior (solo `node:*`, M-4 de #11): importarlo no puede
// hacer ningún pedido. El script que lo usa llama a `assertLocalnetUrl` como primera instrucción, y recién después importa
// el SDK (import dinámico), crea el cliente y lee el chain id del nodo para `assertDeployment`.
import process from 'node:process';

/** Única URL aceptada: la localnet aislada de `agents.md` §3. */
export const LOCALNET_URL = 'http://127.0.0.1:9000';

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
  const urlFlag = argv.indexOf('--url');
  const url = urlFlag === -1 ? LOCALNET_URL : argv[urlFlag + 1];
  const unknownArgs = urlFlag === -1 ? argv : argv.filter((_arg, i) => i !== urlFlag && i !== urlFlag + 1);
  if (url !== LOCALNET_URL || unknownArgs.length > 0) {
    process.stderr.write(
      `${scriptName}: solo se captura desde la localnet aislada (${LOCALNET_URL}); ` +
        `recibido --url ${String(url)}${unknownArgs.length > 0 ? ` y argumentos desconocidos: ${unknownArgs.join(' ')}` : ''}. ` +
        'No se hizo ningún pedido.\n',
    );
    process.exit(2);
  }
  return url;
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
