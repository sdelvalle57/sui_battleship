import { useAppConfig } from '../hooks/useAppConfig';
import { useNodeStatus } from '../hooks/useNodeStatus';
import type { NodeStatus } from '../sui/nodeInfo';

function NodeStatusText({ status }: { status: NodeStatus }) {
  switch (status.kind) {
    case 'loading':
      return <span>conectando…</span>;
    case 'ok':
      return <span>nodo OK</span>;
    case 'wrong_chain':
      return (
        <span>
          red equivocada (esperada {status.expected}, nodo {status.actual})
        </span>
      );
    case 'offline':
      return (
        <span title={status.reason}>
          sin conexión <small>({status.reason})</small>
        </span>
      );
  }
}

/** Indicador de red: el nombre de la red del build siempre visible y el estado del nodo en este momento. */
export function NetworkBadge() {
  const { network } = useAppConfig();
  const status = useNodeStatus();
  return (
    <p className="network-badge" aria-live="polite">
      <strong>{network}</strong> · <NodeStatusText status={status} />
    </p>
  );
}
