import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { AppConfig } from './config';

/**
 * Crea la instancia del wallet kit para la única red del build, con lectura por gRPC-web contra `config.grpcUrl`.
 * La burner wallet solo se habilita con `config.burnerWalletEnabled` (localnet y `npm run dev`, D5); en localnet se
 * desactiva Slush, que no puede firmar contra una red local.
 */
export function createAppDAppKit(config: AppConfig) {
  return createDAppKit({
    networks: [config.network],
    createClient: (network) => new SuiGrpcClient({ network, baseUrl: config.grpcUrl }),
    enableBurnerWallet: config.burnerWalletEnabled,
    ...(config.network === 'localnet' ? { slushWalletConfig: null } : {}),
  });
}

/** Tipo de la instancia del kit de la app; se registra en `Register` para tipar los hooks del kit. */
export type AppDAppKit = ReturnType<typeof createAppDAppKit>;
