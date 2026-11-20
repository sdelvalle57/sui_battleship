// Regla única de la URL de una localnet (#77): la comparten la guarda de los scripts de captura
// (`app/scripts/localnet-guard.mjs`, que la importa y la re-exporta) y la config de la app (`config.ts`, `networks.ts`).
//
// Vive en `src/sui/` y no en `scripts/` porque `app/scripts` está en el `.dockerignore` (la imagen no lo trae) y porque
// `localnet-guard.mjs` importa `node:process`, que no puede entrar al bundle del navegador. Este módulo es puro: no
// importa nada (ni `node:*` ni el SDK), no usa `process` y no hace ningún pedido.

/** URL por defecto (sin `--url`): la localnet aislada de `agents.md` §3 en el puerto por defecto de `sui start`. */
export const LOCALNET_URL = 'http://127.0.0.1:9000';

// Solo loopback IPv4 literal, `http`, puerto decimal de 4 o 5 dígitos sin ceros a la izquierda y nada más (sin
// credenciales, path, query ni fragmento). En JavaScript `$` ancla solo al final de la cadena (sin la bandera `m`).
const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})$/;

/**
 * `true` si y solo si `url` es un `string` de la forma `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. La
 * restricción "solo loopback" se conserva: lo único que se generaliza es el puerto (una localnet aislada puede correr en
 * otro puerto con `sui start --fullnode-rpc-port`, p. ej. si el 9000 lo ocupa un servicio de otro proyecto del host).
 * Función pura: sin `process`, sin red.
 *
 * Mantener en sincronía con `localnetUrl.d.mts`; los tests de `app/src/sui/localnetUrl.test.ts` y de
 * `app/src/test/localnet-guard.test.ts` son la verificación.
 *
 * @param {unknown} url valor a validar (de cualquier tipo: solo un `string` puede ser válido)
 * @returns {boolean}
 */
export function isLoopbackUrl(url) {
  if (typeof url !== 'string') return false;
  const match = LOOPBACK_URL.exec(url);
  if (match === null) return false;
  const port = Number(match[1]);
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}
