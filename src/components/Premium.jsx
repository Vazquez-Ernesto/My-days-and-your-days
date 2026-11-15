import { useStore } from '../state/store.jsx';

/** Muestra el contenido si el plan lo permite; si no, una tarjeta con candado. */
export function PremiumGate({ feature, title, onUpgrade, children }) {
  const { can } = useStore();
  if (can(feature)) return children;
  return (
    <div className="card locked">
      <span className="locked__icon">🔒</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">Disponible en Premium</p>
      </div>
      <button className="btn btn--small" onClick={onUpgrade}>Ver</button>
    </div>
  );
}

/** Banner "publicitario" del plan gratis. En producción iría AdMob/AdSense; acá promociona Premium. */
export function AdBanner({ onUpgrade }) {
  const { can } = useStore();
  if (can('noAds')) return null;
  return (
    <button className="ad" onClick={onUpgrade}>
      <small>Anuncio</small>
      <span>✨ Probá Premium 7 días gratis: sin anuncios, gráficos y modo pareja</span>
    </button>
  );
}

export function PremiumBadge() {
  return <span className="badge">PREMIUM</span>;
}
