// Cliente de la API del servidor. Cada función es una llamada HTTP.
import { API_URL } from './config.js';

export class ApiError extends Error {
  constructor(status, code, detail) {
    super(detail || code);
    this.status = status;
    this.code = code;
  }
}

/** Mensajes para mostrar en pantalla según el código de error del servidor. */
export const ERROR_TEXT = {
  NETWORK: 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
  NO_SERVER: 'El servidor todavía no está configurado.',
  INVITE_NOT_FOUND: 'No encontramos esa invitación. Pedile que te mande el link de nuevo.',
  INVITE_EXPIRED: 'La invitación venció (dura 24 horas). Pedile que genere una nueva.',
  CANNOT_JOIN_OWN_INVITE: 'Esta es tu propia invitación: tiene que abrirla tu pareja en su teléfono.',
  ALREADY_PAIRED: 'Este teléfono ya está vinculado. Desvinculalo primero.',
  BAD_LINK: 'Ese link no es una invitación de My Days. Copialo completo e intentá de nuevo.',
  PUSH_UNSUPPORTED: 'Este navegador no admite notificaciones push. En iPhone, instalá la app en el inicio (Compartir → Agregar a inicio) y abrila desde el ícono.',
  PUSH_DENIED: 'Las notificaciones están bloqueadas. Activalas en Ajustes del iPhone → Notificaciones → My Days.',
  NO_PUSH_SUBSCRIPTION: 'Las notificaciones no están activadas en este teléfono.',
  BILLING_DISABLED: 'Los pagos todavía no están habilitados. Probá de nuevo en unos días.',
  ALREADY_PREMIUM: 'Ya tenés una suscripción activa.',
  PAYMENT_PROVIDER_ERROR: 'Mercado Pago no respondió bien. Probá de nuevo en un rato.',
  NO_SUBSCRIPTION: 'No hay una suscripción activa para cancelar.',
  VALIDATION_ERROR: 'Revisá los datos e intentá de nuevo.',
};
export const errorText = (e) => ERROR_TEXT[e?.code] ?? e?.message ?? 'Algo salió mal. Intentá de nuevo.';

export function createApi(baseUrl = API_URL, fetchImpl = (...args) => fetch(...args)) {
  async function request(path, { method = 'GET', token, body } = {}) {
    if (!baseUrl) throw new ApiError(0, 'NO_SERVER', ERROR_TEXT.NO_SERVER);
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'NETWORK', ERROR_TEXT.NETWORK);
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.code ?? 'HTTP_' + res.status, data?.detail);
    return data;
  }

  return {
    registerDevice: () => request('/api/devices', { method: 'POST' }),
    createInvite: (token) => request('/api/pairs', { method: 'POST', token }),
    join: (token, code) => request('/api/pairs/join', { method: 'POST', token, body: { code } }),
    myPair: (token) => request('/api/pairs/me', { token }),
    unlink: (token, pairId) => request(`/api/pairs/${pairId}`, { method: 'DELETE', token }),
    putSnapshot: (token, pairId, payload) => request(`/api/pairs/${pairId}/snapshot`, { method: 'PUT', token, body: payload }),
    getSnapshot: (token, pairId) => request(`/api/pairs/${pairId}/snapshot`, { token }),
    postMessage: (token, pairId, payload) => request(`/api/pairs/${pairId}/messages`, { method: 'POST', token, body: payload }),
    putProfile: (token, pairId, payload) => request(`/api/pairs/${pairId}/profile`, { method: 'PUT', token, body: payload }),
    getProfiles: (token, pairId, since) =>
      request(`/api/pairs/${pairId}/profiles${since ? `?since=${encodeURIComponent(since)}` : ''}`, { token }),
    getPushKey: () => request('/api/push/public-key'),
    putSubscription: (token, sub) => request('/api/push/subscription', { method: 'PUT', token, body: sub }),
    deleteSubscription: (token) => request('/api/push/subscription', { method: 'DELETE', token }),
    putSchedule: (token, items) => request('/api/push/schedule', { method: 'PUT', token, body: { items } }),
    testPush: (token) => request('/api/push/test', { method: 'POST', token }),
    getPrices: () => request('/api/billing/prices'),
    checkout: (token, period, email) => request('/api/billing/checkout', { method: 'POST', token, body: { period, email } }),
    myBilling: (token) => request('/api/billing/me', { token }),
    cancelBilling: (token) => request('/api/billing/cancel', { method: 'POST', token }),
    getMessages: (token, pairId, since) =>
      request(`/api/pairs/${pairId}/messages${since ? `?since=${encodeURIComponent(since)}` : ''}`, { token }),
  };
}

export const api = createApi();
