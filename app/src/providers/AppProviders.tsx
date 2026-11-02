import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ConfigContext } from '../hooks/configContext';
import type { AppConfig } from '../sui/config';
import type { AppDAppKit } from '../sui/dappKit';

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: AppDAppKit;
  }
}

/**
 * Providers de la app: TanStack Query (un `QueryClient` por montaje), el wallet kit y la config resuelta. El
 * `Register` de arriba tipa los hooks del kit con la instancia de la app (`useCurrentClient()` → `SuiGrpcClient`).
 */
export function AppProviders({
  dAppKit,
  config,
  children,
}: {
  dAppKit: AppDAppKit;
  config: AppConfig;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
