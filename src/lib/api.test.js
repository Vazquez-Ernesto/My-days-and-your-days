import { describe, it, expect, vi } from 'vitest';
import { createApi, ApiError, errorText } from './api.js';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('cliente de la API', () => {
  it('manda el token y el JSON correctos', async () => {
    const fetchMock = vi.fn(() => json(200, { pairId: 'p1', status: 'ACTIVE' }));
    const api = createApi('https://srv', fetchMock);
    await api.join('tok', 'AB2C-D3EF');
    expect(fetchMock).toHaveBeenCalledWith('https://srv/api/pairs/join', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: '{"code":"AB2C-D3EF"}',
    });
  });

  it('convierte los errores del servidor en ApiError con su código', async () => {
    const api = createApi('https://srv', () => json(410, { code: 'INVITE_EXPIRED', detail: 'La invitación venció' }));
    const err = await api.join('tok', 'X').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 410, code: 'INVITE_EXPIRED' });
    expect(errorText(err)).toMatch(/dura 24 horas/);
  });

  it('sin conexión devuelve un error NETWORK entendible', async () => {
    const api = createApi('https://srv', () => Promise.reject(new TypeError('Failed to fetch')));
    const err = await api.myPair('tok').catch((e) => e);
    expect(err.code).toBe('NETWORK');
    expect(errorText(err)).toMatch(/No pudimos conectar/);
  });

  it('sin servidor configurado no intenta llamar', async () => {
    const fetchMock = vi.fn();
    const err = await createApi(null, fetchMock).registerDevice().catch((e) => e);
    expect(err.code).toBe('NO_SERVER');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('204 (sin contenido) devuelve null', async () => {
    const api = createApi('https://srv', () => Promise.resolve({ ok: true, status: 204 }));
    expect(await api.unlink('tok', 'p1')).toBeNull();
  });

  it('pide solo los mensajes nuevos con ?since', async () => {
    const fetchMock = vi.fn(() => json(200, []));
    await createApi('https://srv', fetchMock).getMessages('tok', 'p1', '2026-11-16T12:00:00Z');
    expect(fetchMock.mock.calls[0][0]).toBe('https://srv/api/pairs/p1/messages?since=2026-11-16T12%3A00%3A00Z');
  });
});
