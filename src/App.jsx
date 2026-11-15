import { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import CalendarScreen from './screens/CalendarScreen.jsx';
import Me from './screens/Me.jsx';
import Reminders from './screens/Reminders.jsx';
import Settings from './screens/Settings.jsx';
import Plans from './screens/Plans.jsx';
import PinLock from './screens/PinLock.jsx';
import DayLogSheet from './components/DayLogSheet.jsx';
import Icon from './components/Icons.jsx';
import { permission, showNotification } from './lib/notifications.js';
import { isTimeReached } from './lib/reminders.js';

// Envía como notificación del sistema los recordatorios de hoy cuya hora ya llegó.
function useReminderNotifications() {
  const { state, reminders, markNotified } = useStore();
  const enabled = state.settings.reminders.enabled;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000); // revisamos cada minuto
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!enabled || permission() !== 'granted') return;
    const now = new Date();
    const pending = reminders.filter((r) => !state.notified.includes(r.id) && isTimeReached(r.time, now));
    if (!pending.length) return;
    pending.forEach((r) => showNotification(r.title, { body: r.body, tag: r.type }).catch(() => {}));
    markNotified(pending.map((r) => r.id));
  }, [enabled, reminders, state.notified, markNotified, tick]);
}

function useTheme(theme) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', resolved === 'dark' ? '#0b1430' : '#fff5f8');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

const TABS = [
  { id: 'home', label: 'Hoy', icon: 'heart' },
  { id: 'calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'log', label: 'Registrar', icon: 'plus', action: true },
  { id: 'reminders', label: 'Recordatorios', short: 'Avisos', icon: 'bell' },
  { id: 'me', label: 'Yo', icon: 'user' },
];

export default function App() {
  const { state, can, today } = useStore();
  const [tab, setTab] = useState('home');
  const [logDate, setLogDate] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  useTheme(state.settings.theme);
  useReminderNotifications();

  if (!state.onboarded) return <div className="app"><Onboarding /></div>;
  if (state.settings.pin && can('pinLock') && !unlocked) {
    return <div className="app"><PinLock pin={state.settings.pin} onUnlock={() => setUnlocked(true)} /></div>;
  }

  const nav = { onLog: setLogDate, onUpgrade: () => setShowPlans(true), onSettings: () => setShowSettings(true) };
  const screens = {
    home: <Home {...nav} />,
    calendar: <CalendarScreen {...nav} />,
    reminders: <Reminders {...nav} />,
    me: <Me {...nav} />,
  };

  return (
    <div className="app">
      <main className="app__main">
        {showSettings ? <Settings {...nav} onBack={() => setShowSettings(false)} /> : screens[tab]}
      </main>
      <nav className="tabbar" aria-label="Navegación principal">
        {TABS.map((t) => (
          <button key={t.id} aria-label={t.label}
            className={`tabbar__btn ${t.action ? 'tabbar__btn--action' : ''} ${tab === t.id && !showSettings ? 'is-on' : ''}`}
            onClick={() => {
              if (t.action) return setLogDate(today);
              setShowSettings(false);
              setTab(t.id);
            }}>
            <span className="tabbar__icon"><Icon name={t.icon} size={t.action ? 20 : 22} strokeWidth={t.action ? 3 : 2} /></span>
            <span className="tabbar__label" aria-hidden="true">{t.short ?? t.label}</span>
          </button>
        ))}
      </nav>
      {logDate && <DayLogSheet key={logDate} date={logDate} onClose={() => setLogDate(null)} />}
      {showPlans && <Plans onClose={() => setShowPlans(false)} />}
    </div>
  );
}
