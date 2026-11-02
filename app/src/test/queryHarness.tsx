import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { readRetryDelay, shouldRetryRead } from '../sui/readPolicy';

/** `QueryClient` de test con la política real de lecturas (la misma que `AppProviders`). */
export function createPolicyQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetryRead, retryDelay: readRetryDelay } } });
}

/** Wrapper de `renderHook` con el `QueryClient` dado. */
export function queryWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * Avanza los timers falsos `ms` y luego 1 ms más. TanStack Query notifica los cambios de estado en un lote con
 * `setTimeout(0)`; los timers falsos de Vitest (`@sinonjs/fake-timers`) agendan un timer de 0 ms creado durante un
 * avance en `ahora + 1 ms`, así que sin ese milisegundo el resultado del intento nunca llega al hook.
 */
export async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  await act(() => vi.advanceTimersByTimeAsync(1));
}
