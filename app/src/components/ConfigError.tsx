/**
 * Pantalla de configuración inválida: se muestra en lugar de la app cuando `loadConfig` falla, para no dejar una
 * pantalla en blanco ni operar con IDs de otra red. El mensaje se renderiza como texto plano.
 */
export function ConfigError({ message }: { message: string }) {
  return (
    <main>
      <div role="alert">
        <h1>La app no está configurada</h1>
        <p>{message}</p>
      </div>
    </main>
  );
}
