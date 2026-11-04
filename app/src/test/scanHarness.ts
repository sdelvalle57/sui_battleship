import { vi } from 'vitest';
import type { EventScanClient } from '../sui/eventScan';

// Cliente falso del escaneo crudo de eventos (`ListEvents` + `GetServiceInfo` + `getObjects`) para los tests de
// `eventScan.ts` y `myGames.ts` (#13). Sin imports de `@mysten/*` (regla de capas de `src/**`): los eventos y objetos los
// arma cada test con el SDK.

/** Un frame del stream crudo, con la forma que mide V-9 (TASK-1 de #13). */
export type ScanFrame = {
  event?: { eventType: string; contents: { value: Uint8Array }; transactionDigest: string; checkpoint: bigint };
  watermark?: { cursor: Uint8Array; checkpoint: bigint };
  end?: { reason: number };
};
/** Lo que responde un pedido: sus frames, o un error del stream. */
export type ScanScript = ScanFrame[] | Error;
/** Lo que recibe el `listEvents` falso. */
export type ListRequest = {
  readMask: { paths: string[] };
  startCheckpoint: bigint;
  filter: unknown;
  options: { limit: number; ordering: number; before?: Uint8Array };
};
/** Evento de un frame: tipo, BCS, digest y checkpoint. */
export type ScanEvent = NonNullable<ScanFrame['event']>;

/** Cursor de prueba con una etiqueta legible. */
export const cursor = (label: string): Uint8Array => new TextEncoder().encode(label);
/** El mismo cursor en base64, como lo devuelve el escaneo. */
export const b64 = (label: string): string => btoa(label);
/** Bytes como array: los `Uint8Array` de jsdom y de Node no se comparan bien con `toEqual`. */
export const bytesOf = (value: Uint8Array | undefined): number[] | undefined => (value === undefined ? undefined : Array.from(value));

/**
 * Frames de un pedido con la forma de V-9: cada frame trae el watermark `label`; con `ITEM_LIMIT` (`itemLimit`) y al menos
 * un evento, el `QueryEnd` va en el frame del último evento; si no, en un frame extra sin evento. `reason: null` = stream
 * sin `QueryEnd`.
 */
export function scanFrames(
  events: readonly ScanEvent[],
  reason: number | null,
  label: string | null,
  { itemLimit = false }: { itemLimit?: boolean } = {},
): ScanFrame[] {
  const watermark = label === null ? undefined : { cursor: cursor(label), checkpoint: 100n };
  const frames: ScanFrame[] = events.map((event) => ({ event, ...(watermark ? { watermark } : {}) }));
  if (reason === null) return frames;
  const last = frames.at(-1);
  if (itemLimit && last !== undefined) last.end = { reason };
  else frames.push({ ...(watermark ? { watermark } : {}), end: { reason } });
  return frames;
}

function failingStream(error: Error): AsyncIterable<ScanFrame> {
  return { [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(error) }) };
}
async function* frameStream(frames: ScanFrame[]): AsyncIterable<ScanFrame> {
  for (const frame of frames) {
    await Promise.resolve();
    yield frame;
  }
}

/**
 * Cliente falso: el pedido `i` responde `scripts[i]` (el último se repite), la consulta `i` del nodo informa el piso
 * `floors[i]` (o falla si es un `Error`) y `getObjects` devuelve `objects.get(id)`, o un `Error` si el ID no está.
 */
export function makeScanClient({
  scripts,
  floors = [0n],
  objects = new Map(),
}: {
  scripts: ScanScript[];
  floors?: (bigint | null | Error)[];
  objects?: ReadonlyMap<string, unknown>;
}) {
  let call = 0;
  const listEvents = vi.fn((request: ListRequest) => {
    const script = scripts[Math.min(call, scripts.length - 1)] ?? [];
    call++;
    return { request, responses: script instanceof Error ? failingStream(script) : frameStream(script) };
  });
  let infoCall = 0;
  const getServiceInfo = vi.fn(() => {
    const floor = floors[Math.min(infoCall, floors.length - 1)] ?? null;
    infoCall++;
    if (floor instanceof Error) return Promise.reject(floor);
    return Promise.resolve({ response: { chainId: '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD', checkpointHeight: 1n, lowestAvailableCheckpoint: floor ?? undefined } });
  });
  const getObjects = vi.fn(({ objectIds }: { objectIds: string[] }) =>
    Promise.resolve({ objects: objectIds.map((id) => objects.get(id) ?? new Error(`${id} not found`)) }),
  );
  const client = { ledgerService: { listEvents, getServiceInfo }, getObjects } as unknown as EventScanClient;
  return { client, listEvents, getServiceInfo, getObjects };
}

/** El pedido `i` que recibió el `listEvents` falso. */
export function listRequest(mock: ReturnType<typeof makeScanClient>['listEvents'], i: number): ListRequest {
  const args = mock.mock.calls[i];
  if (!args) throw new Error(`no hubo pedido ${String(i)}`);
  return args[0];
}
