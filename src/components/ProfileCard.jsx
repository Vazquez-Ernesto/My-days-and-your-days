import { useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import Avatar from './Avatar.jsx';
import { resizeImage } from '../lib/avatar.js';

/** Ajustes: mi foto y mi nombre (los ve mi pareja). */
export default function ProfileCard() {
  const { state, setPhoto, updateSharing, updatePartner } = useStore();
  const isPartner = state.role === 'partner';
  const name = isPartner ? state.partner.myName : state.sharing.name;
  const setName = (v) => (isPartner ? updatePartner({ myName: v }) : updateSharing({ name: v }));
  const input = useRef(null);
  const [error, setError] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
      setError(null);
    } catch {
      setError('No pudimos abrir esa imagen. Probá con otra.');
    }
  };

  return (
    <div className="card profile-card">
      <button className="profile-card__photo" onClick={() => input.current?.click()} aria-label="Cambiar foto de perfil">
        <Avatar photo={state.profile.photo} name={name} size={76} />
        <span className="profile-card__edit" aria-hidden="true">📷</span>
      </button>
      <div className="grow stack-sm">
        <label htmlFor="profile-name" className="small"><strong>Tu nombre</strong> <span className="muted">(lo ve tu pareja)</span></label>
        <input id="profile-name" className="input" placeholder={isPartner ? 'Ej.: Ernesto' : 'Ej.: Ana'} maxLength={30} value={name}
          onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <button className="btn btn--soft btn--small" onClick={() => input.current?.click()}>{state.profile.photo ? 'Cambiar foto' : 'Agregar foto'}</button>
          {state.profile.photo && <button className="btn btn--link btn--small" onClick={() => setPhoto(null)}>Quitar</button>}
        </div>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <p className="muted small">🔒 Tu foto viaja cifrada: solo la ve tu pareja.</p>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} aria-label="Elegir foto de perfil" />
    </div>
  );
}
