import { Link } from 'react-router';

/** Página para rutas inexistentes, con un link de vuelta al inicio. */
export function NotFoundPage() {
  return (
    <section>
      <h2>Página no encontrada</h2>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </section>
  );
}
