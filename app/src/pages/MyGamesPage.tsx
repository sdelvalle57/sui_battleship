import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MyGamesSection } from '../components/MyGamesSection';
import { IN_FLIGHT_TEXT } from '../components/txNotice';
import { useAccountTxBusy } from '../hooks/useAccountTxBusy';
import { useAppConfig } from '../hooks/useAppConfig';
import { useMyGames } from '../hooks/useMyGames';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { explorerAccountUrl } from '../sui/explorer';
import { parseObjectIdInput } from '../sui/ids';

const NO_ACCOUNT_TEXT = 'Conecta tu wallet para ver tus partidas e invitaciones';

/**
 * "Abrir partida por ID" (DL-15): la salida para una partida que ya no cubre el historial del nodo (D-20261103-03). Un ID
 * inválido se dice sin navegar ni pedir nada; uno válido, en forma corta o con mayúsculas, navega al detalle normalizado.
 */
function OpenGameById() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="open-game-by-id"
      onSubmit={(event) => {
        event.preventDefault();
        const id = parseObjectIdInput(value.trim());
        if (id === null) {
          setInvalid(true);
          return;
        }
        void navigate(`/game/${id}`);
      }}
    >
      <label>
        Abrir partida por ID{' '}
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
        />
      </label>
      <button type="submit">Abrir</button>
      {invalid && (
        <p role="alert" className="field-error">
          ID de partida inválido
        </p>
      )}
    </form>
  );
}

/**
 * Contenido de "Mis partidas" de una cuenta. La página lo monta con `key={address}` (DL-9): al cambiar de cuenta se
 * remonta, y lo que siga en curso de la cuenta anterior se adopta al volver (lo terminado se ve por el estado del objeto).
 */
function MyGamesView() {
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const myGames = useMyGames();
  const busy = useAccountTxBusy();
  if (myGames.kind === 'no_account' || address === null) return <p>{NO_ACCOUNT_TEXT}</p>;
  const { sections, activity, invitations, unreadableEvents, isFetching } = myGames;
  const explorerUrl = explorerAccountUrl(network, address);

  return (
    <>
      <button type="button" onClick={myGames.refresh} disabled={isFetching}>
        Actualizar
      </button>
      {busy && <p role="status">{IN_FLIGHT_TEXT}</p>}
      <OpenGameById />
      {explorerUrl !== null && (
        <p>
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            Ver tu historial completo en el explorador
          </a>
        </p>
      )}
      {unreadableEvents > 0 && (
        <p className="my-games-note">
          {unreadableEvents === 1 ? '1 evento ilegible en lo revisado' : `${String(unreadableEvents)} eventos ilegibles en lo revisado`}
        </p>
      )}
      <MyGamesSection
        section="invitations"
        items={sections.invitations}
        source={invitations}
        address={address}
        moreLabel="Cargar más invitaciones"
        busy={isFetching}
      />
      <MyGamesSection section="pending" items={sections.pending} source={activity} address={address} moreLabel="Cargar más actividad" busy={isFetching} />
      <MyGamesSection section="finished" items={sections.finished} source={activity} address={address} moreLabel="Cargar más actividad" busy={isFetching} />
    </>
  );
}

/**
 * Página "Mis partidas" en `#/my-games` (DL-4, DL-10): invitaciones recibidas, partidas propias pendientes y terminadas
 * de la cuenta conectada, con sus acciones por fila. Sin cuenta no consulta nada.
 */
export function MyGamesPage() {
  const { address } = useWalletAccount();
  return (
    <section className="my-games">
      <h2>Mis partidas</h2>
      {address === null ? <p>{NO_ACCOUNT_TEXT}</p> : <MyGamesView key={address} />}
    </section>
  );
}
