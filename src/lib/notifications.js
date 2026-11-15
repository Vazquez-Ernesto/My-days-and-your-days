// Envoltorio de la API de notificaciones del navegador.

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function showNotification(title, options) {
  const icon = new URL('icons/icon-192.png', document.baseURI).href;
  const opts = { icon, badge: icon, lang: 'es', ...options };
  // Con service worker la notificación funciona también en Android instalada como app
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  if (reg) return reg.showNotification(title, opts);
  return new Notification(title, opts);
}
