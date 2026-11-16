import { describe, it, expect } from 'vitest';
import { generateKey, encryptJSON, decryptJSON, fingerprint } from './crypto.js';

describe('cifrado de extremo a extremo', () => {
  const data = { name: 'Ana', moments: [{ id: 'sensitive' }], cycle: { periodDays: ['2026-11-01'] } };

  it('genera claves de 256 bits aptas para un link', () => {
    const key = generateKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateKey()).not.toBe(key);
  });

  it('cifra y descifra (ida y vuelta)', async () => {
    const key = generateKey();
    const payload = await encryptJSON(key, data);
    expect(payload.iv).toMatch(/^[A-Za-z0-9+/=]{16}$/);
    expect(await decryptJSON(key, payload)).toEqual(data);
  });

  it('el texto cifrado no contiene nada legible', async () => {
    const payload = await encryptJSON(generateKey(), data);
    const raw = atob(payload.ciphertext);
    expect(raw).not.toContain('Ana');
    expect(raw).not.toContain('sensitive');
  });

  it('cifrar lo mismo dos veces da resultados distintos (IV nuevo)', async () => {
    const key = generateKey();
    const a = await encryptJSON(key, data);
    const b = await encryptJSON(key, data);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it('con otra clave no se puede descifrar', async () => {
    const payload = await encryptJSON(generateKey(), data);
    await expect(decryptJSON(generateKey(), payload)).rejects.toThrow();
  });

  it('si alguien modifica los datos, se detecta', async () => {
    const key = generateKey();
    const payload = await encryptJSON(key, data);
    const bytes = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0));
    bytes[5] ^= 1; // cambiar un solo bit
    const tampered = { ...payload, ciphertext: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptJSON(key, tampered)).rejects.toThrow();
  });

  it('fingerprint: igual para lo mismo, distinto si cambia', async () => {
    expect(await fingerprint('a')).toBe(await fingerprint('a'));
    expect(await fingerprint('a')).not.toBe(await fingerprint('b'));
  });
});
