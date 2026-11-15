// Captura el evento del navegador que permite mostrar "Instalar app" con nuestro propio botón.
import { useEffect, useState } from 'react';

let deferred = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => fn(false));
  });
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(Boolean(deferred));
  useEffect(() => {
    listeners.add(setAvailable);
    return () => listeners.delete(setAvailable);
  }, []);
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setAvailable(false);
  };
  return { available, install };
}
