// Cifrado de extremo a extremo con la Web Crypto API del navegador (AES-GCM de 256 bits).
// La clave se genera en el teléfono de ella y viaja SOLO dentro del link de invitación (después del #),
// que el navegador nunca envía al servidor. El servidor guarda bytes que no puede leer.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const toBase64Url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function importKey(keyB64Url) {
  const raw = fromBase64(keyB64Url);
  if (raw.length !== 32) throw new Error('Clave inválida');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Nueva clave aleatoria de 256 bits, en base64url (43 caracteres, apta para un link). */
export function generateKey() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Cifra un objeto. Cada mensaje usa un IV (número único) nuevo: nunca reutilizar con la misma clave. */
export async function encryptJSON(keyB64Url, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(keyB64Url), data);
  return { ciphertext: toBase64(new Uint8Array(cipher)), iv: toBase64(iv) };
}

/** Descifra. Si la clave no es la correcta o alguien modificó los datos, falla (AES-GCM lo detecta). */
export async function decryptJSON(keyB64Url, { ciphertext, iv }) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await importKey(keyB64Url), fromBase64(ciphertext));
  return JSON.parse(dec.decode(plain));
}

/** Huella corta de un texto, para saber si algo cambió sin guardar el texto entero. */
export async function fingerprint(text) {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return toBase64Url(new Uint8Array(hash)).slice(0, 22);
}
