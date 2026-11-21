import { initial } from '../lib/avatar.js';

/** Foto de perfil o, si no hay, la inicial sobre un degradé. */
export default function Avatar({ photo, name, size = 44, className = '' }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return photo
    ? <img className={`avatar avatar--photo ${className}`} src={photo} alt={name ? `Foto de ${name}` : 'Foto de perfil'} style={style} />
    : <span className={`avatar ${className}`} style={style} aria-hidden="true">{initial(name)}</span>;
}

/** Las dos fotos superpuestas con un corazón, como "Compartiendo con…". */
export function CoupleAvatars({ me, partner, size = 44 }) {
  return (
    <span className="couple" style={{ width: size * 1.7, height: size }}>
      <Avatar photo={me?.photo} name={me?.name} size={size} className="couple__a" />
      <Avatar photo={partner?.photo} name={partner?.name} size={size} className="couple__b" />
      <span className="couple__heart" aria-hidden="true">♥</span>
    </span>
  );
}
