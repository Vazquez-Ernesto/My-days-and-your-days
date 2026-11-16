// Dirección del servidor. En producción se define al compilar (VITE_API_URL).
// Sin servidor configurado, el modo pareja funciona en "modo prueba" (datos de ejemplo).
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : null);
export const SYNC_INTERVAL_MS = 20_000;
