import { CreateGameForm } from '../components/CreateGameForm';
import { LobbyList } from '../components/LobbyList';

/** Página de inicio: presentación, formulario de creación (#11) y lobby de partidas abiertas. */
export function HomePage() {
  return (
    <section>
      <h2>Apuestas 1 vs 1 en Sui</h2>
      <p>Crea una partida apostando SUI o acepta la de otro jugador: el ganador se lleva el pozo menos la comisión.</p>
      <CreateGameForm />
      <LobbyList />
    </section>
  );
}
