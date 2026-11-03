import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { withReadTimeout } from './readPolicy';

/**
 * Saldo de SUI de una cuenta en MIST (DL-8). `balance.balance` suma monedas y saldo de dirección: en `@mysten/sui` 2.37
 * los dos pagan gas (V-10; S-4 de #11: strings, `addressBalance` "0" en una cuenta de la génesis).
 */
export async function fetchSuiBalance(
  client: Pick<SuiGrpcClient, 'getBalance'>,
  { owner, signal }: { owner: string; signal?: AbortSignal },
): Promise<bigint> {
  const { balance } = await withReadTimeout(signal, (abort) => client.getBalance({ owner, signal: abort }));
  return BigInt(balance.balance);
}
