// Mantener en sincronía con `localnetUrl.mjs`; los tests de `localnetUrl.test.ts` y de `src/test/localnet-guard.test.ts`
// son la verificación. Solo tipos: existe para importar el `.mjs` con tipos (la app no usa `allowJs` ni `checkJs`).

/** URL por defecto de la localnet: `http://127.0.0.1:9000`, el puerto por defecto de `sui start`. */
export const LOCALNET_URL: string;

/** `true` si y solo si `url` es un `string` `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. */
export function isLoopbackUrl(url: unknown): boolean;
