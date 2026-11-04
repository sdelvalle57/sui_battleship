import type { ReactNode } from 'react';
import type { TxOutcome } from '../hooks/txSession';
import type { TxStage } from '../hooks/useExecuteTransaction';
import { explorerTxUrl } from '../sui/explorer';
import { formatMist } from '../sui/format';
import type { Network } from '../sui/networks';

/** Texto de cada etapa en curso (DL-12). */
const STAGE_TEXT: Partial<Record<TxStage, string>> = {
  preflight: 'Verificando la transacción…',
  signing: 'Esperando la firma en la wallet…',
  confirming: 'Confirmando en la red…',
  indexing: 'Actualizando datos…',
};

/** Digest abreviado (completo en el `title`): link al explorador en testnet, texto en localnet (sin explorador). */
export function TxDigest({ digest, network }: { digest: string; network: Network }) {
  const url = explorerTxUrl(network, digest);
  const short = `${digest.slice(0, 6)}…${digest.slice(-4)}`;
  return (
    <span className="tx-digest">
      Transacción{' '}
      {url === null ? (
        <code title={digest}>{short}</code>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" title={digest}>
          {short}
        </a>
      )}
    </span>
  );
}

/**
 * Estado de una transacción (DL-12, SEG-10): la etapa en curso, o el resultado que decidió el nodo. `success` muestra
 * el texto de la acción, el digest y el costo de red; `unconfirmed` dice que se envió sin confirmar (sin "Reintentar":
 * hay que revisarla antes de volver a intentar); `failure`, el mensaje y, si se ejecutó, el digest y el costo.
 */
export function TransactionStatus<T>({
  stage,
  outcome,
  network,
  successText,
  costNote,
  children,
}: {
  stage: TxStage;
  outcome: TxOutcome<T> | null;
  network: Network;
  successText: ReactNode;
  costNote?: string;
  children?: ReactNode;
}) {
  if (outcome === null) {
    const text = STAGE_TEXT[stage];
    return text === undefined ? null : (
      <p role="status" className="tx-status">
        {text}
      </p>
    );
  }
  switch (outcome.kind) {
    case 'success':
      return (
        <div role="status" className="tx-status tx-success">
          <p>{successText}</p>
          <p>
            <TxDigest digest={outcome.digest} network={network} /> · Costo de red: {formatMist(outcome.cost)} SUI
            {costNote === undefined ? '' : ` ${costNote}`}
          </p>
          {!outcome.indexed && <p>La lista puede tardar unos segundos en mostrarlo</p>}
          {children}
        </div>
      );
    case 'unconfirmed':
      return (
        <div role="alert" className="tx-status tx-unconfirmed">
          <p>La transacción se envió pero la red no la confirmó todavía; revísala antes de volver a intentar</p>
          <p>
            <TxDigest digest={outcome.digest} network={network} />
          </p>
        </div>
      );
    case 'failure':
      return (
        <div role="alert" className="tx-status tx-failure">
          <p>{outcome.message}</p>
          {outcome.digest !== null && (
            <p>
              <TxDigest digest={outcome.digest} network={network} />
              {outcome.cost !== null && ` · Costo de red: ${formatMist(outcome.cost)} SUI`}
            </p>
          )}
        </div>
      );
  }
}
