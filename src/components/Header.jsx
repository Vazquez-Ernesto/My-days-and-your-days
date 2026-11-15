import Icon from './Icons.jsx';

/** Encabezado de cada pantalla: engranaje (Ajustes) a la izquierda, título al centro. */
export default function Header({ title, onSettings, onBack, right }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Volver"><Icon name="back" /></button>
      ) : (
        <button className="icon-btn" onClick={onSettings} aria-label="Ajustes"><Icon name="gear" /></button>
      )}
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__right">{right}</div>
    </header>
  );
}
