import { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import CalendarScreen from './screens/CalendarScreen.jsx';
import Stats from './screens/Stats.jsx';
import Settings from './screens/Settings.jsx';
import Plans from './screens/Plans.jsx';
import PinLock from './screens/PinLock.jsx';
import DayLogSheet from './components/DayLogSheet.jsx';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const TABS = [
  { id: 'home', label: 'Hoy', icon: 'M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9z' },
  { id: 'calendar', label: 'Calendario', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { id: 'stats', label: 'Análisis', icon: 'M5 20V12M12 20V5M19 20v-9' },
  { id: 'settings', label: 'Ajustes', icon: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4' },
];

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

export default function App() {
  const { state, can } = useStore();
  const [tab, setTab] = useState('home');
  const [logDate, setLogDate] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  useTheme(state.settings.theme);

  if (!state.onboarded) return <div className="app"><Onboarding /></div>;
  if (state.settings.pin && can('pinLock') && !unlocked) {
    return <div className="app"><PinLock pin={state.settings.pin} onUnlock={() => setUnlocked(true)} /></div>;
  }

  const upgrade = () => setShowPlans(true);
  const screens = {
    home: <Home onLog={setLogDate} onUpgrade={upgrade} />,
    calendar: <CalendarScreen onLog={setLogDate} />,
    stats: <Stats onUpgrade={upgrade} />,
    settings: <Settings onUpgrade={upgrade} />,
  };

  return (
    <div className="app">
      <main className="app__main">{screens[tab]}</main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            <Icon d={t.icon} />{t.label}
          </button>
        ))}
      </nav>
      {logDate && <DayLogSheet key={logDate} date={logDate} onClose={() => setLogDate(null)} />}
      {showPlans && <Plans onClose={() => setShowPlans(false)} />}
    </div>
  );
}
