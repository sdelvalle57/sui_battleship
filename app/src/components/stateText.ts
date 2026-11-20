/**
 * Fallback mínimo (TASK-8a) para los estados de una partida de la fuente nueva que las pantallas de hoy todavía no
 * distinguen: una línea neutra, sin ganador ni montos. TASK-8b la reemplaza por el detalle de cada estado (la vista de
 * partida activa y la distinción de "ganó por tiempo" y "nadie movió a tiempo").
 */
export const FALLBACK_STATE_TEXT = {
  active: 'En juego',
  timed_out: 'Terminada por tiempo agotado',
  expired: 'Terminada: se devolvieron las apuestas',
} as const;
