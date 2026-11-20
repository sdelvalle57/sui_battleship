// Mantener en sincronía con `localnet-guard.mjs`; los tests de `src/test/localnet-guard.test.ts` son la verificación.
// Solo tipos: existe para que ese test importe el `.mjs` con tipos (la app no usa `allowJs` ni `checkJs`).

/** URL por defecto (sin `--url`): la localnet aislada en el puerto por defecto de `sui start`. */
export const LOCALNET_URL: string;

/** `true` si y solo si `url` es un `string` `http://127.0.0.1:<puerto>` con el puerto entre 1024 y 65535. */
export function isLoopbackUrl(url: unknown): boolean;

/** Valida `--url <valor>` (opcional) y rechaza todo argumento desconocido; función pura. */
export function checkLocalnetArgs(argv: string[]): { ok: true; url: string } | { ok: false; message: string };

/** Como `checkLocalnetArgs`, pero ante un error escribe el motivo por `stderr` y sale con código 2 antes de cualquier pedido. */
export function assertLocalnetUrl(argv: string[], scriptName: string): string;

/** Exige que el despliegue sea de `localnet` y que su chain id sea el corto del nodo; lanza si no. */
export function assertDeployment(deployment: { network?: unknown; chainId?: unknown }, nodeChainIdShort: string): void;
