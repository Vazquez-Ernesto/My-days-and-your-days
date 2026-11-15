import { useState } from 'react';

export default function PinLock({ pin, onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const press = (d) => {
    const next = (value + d).slice(0, 4);
    setValue(next);
    setError(false);
    if (next.length === 4) {
      if (next === pin) onUnlock();
      else { setError(true); setValue(''); }
    }
  };
  return (
    <div className="pin">
      <div className="hero-emoji">🔒</div>
      <h2>Ingresá tu PIN</h2>
      <div className={`pin__dots ${error ? 'is-error' : ''}`}>
        {[0, 1, 2, 3].map((i) => <i key={i} className={i < value.length ? 'is-on' : ''} />)}
      </div>
      <div className="pin__pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
          k === '' ? <span key={i} /> :
          <button key={i} onClick={() => (k === '⌫' ? setValue((v) => v.slice(0, -1)) : press(k))}>{k}</button>
        ))}
      </div>
    </div>
  );
}
