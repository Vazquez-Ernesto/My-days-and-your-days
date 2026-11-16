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
import InviteSheet from './components/InviteSheet.jsx';
import PartnerHome from './screens/partner/PartnerHome.jsx';
import PartnerCalendar from './screens/partner/PartnerCalendar.jsx';
import PartnerReminders from './screens/partner/PartnerReminders.jsx';
import PartnerSettings from './screens/partner/PartnerSettings.jsx';
import { buildSnapshot } from './lib/partner.js';
import { useCloudSync } from './lib/useCloudSync.js';
import Icon from './components/Icons.jsx';
import { permission, showNotification } from './lib/notifications.js';
import { isTimeReached } from './lib/reminders.js';

// Envía como notificación del sistema los recordatorios de hoy cuya hora ya llegó.
function useReminderNotifications() {
  const { state, reminders, markNotified, notificationsEnabled: enabled } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000); // revisamos cada minuto
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!enabled || permission() !== 'granted' || state.cloud.pushEnabled) return; // con push, avisa el servidor
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

const PARTNER_TABS = [
  { id: 'home', label: 'Hoy', icon: 'heart' },
  { id: 'calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'reminders', label: 'Avisos', icon: 'bell' },
];

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
  const [showInvite, setShowInvite] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useTheme(state.settings.theme);
  useReminderNotifications();
  const { syncNow, error: syncError } = useCloudSync();

  if (!state.onboarded) return <div className="app"><Onboarding /></div>;
  if (state.settings.pin && can('pinLock') && !unlocked) {
    return <div className="app"><PinLock pin={state.settings.pin} onUnlock={() => setUnlocked(true)} /></div>;
  }

  const isPartner = state.role === 'partner' && state.partner.snapshot;
  const nav = {
    onLog: setLogDate, onUpgrade: () => setShowPlans(true), onSettings: () => setShowSettings(true),
    onInvite: () => setShowInvite(true), onPreview: () => setShowPreview(true), onSync: syncNow, syncError,
  };
  const screens = isPartner ? {
    home: <PartnerHome snapshot={state.partner.snapshot} {...nav} />,
    calendar: <PartnerCalendar {...nav} />,
    reminders: <PartnerReminders {...nav} />,
  } : {
    home: <Home {...nav} />,
    calendar: <CalendarScreen {...nav} />,
    reminders: <Reminders {...nav} />,
    me: <Me {...nav} />,
  };
  const tabs = isPartner ? PARTNER_TABS : TABS;
  const SettingsScreen = isPartner ? PartnerSettings : Settings;
  let content = screens[tab] ?? screens.home;
  if (showSettings) content = <SettingsScreen {...nav} onBack={() => setShowSettings(false)} />;
  if (showPreview) content = <PartnerHome snapshot={buildSnapshot(state)} preview onClose={() => setShowPreview(false)} />;

  return (
    <div className="app">
      <main className="app__main">{content}</main>
      <nav className="tabbar" aria-label="Navegación principal">
        {tabs.map((t) => (
          <button key={t.id} aria-label={t.label}
            className={`tabbar__btn ${t.action ? 'tabbar__btn--action' : ''} ${tab === t.id && !showSettings && !showPreview ? 'is-on' : ''}`}
            onClick={() => {
              if (t.action) return setLogDate(today);
              setShowSettings(false);
              setShowPreview(false);
              setTab(t.id);
            }}>
            <span className="tabbar__icon"><Icon name={t.icon} size={t.action ? 20 : 22} strokeWidth={t.action ? 3 : 2} /></span>
            <span className="tabbar__label" aria-hidden="true">{t.short ?? t.label}</span>
          </button>
        ))}
      </nav>
      {logDate && <DayLogSheet key={logDate} date={logDate} onClose={() => setLogDate(null)} />}
      {showPlans && <Plans onClose={() => setShowPlans(false)} />}
      {showInvite && <InviteSheet onClose={() => setShowInvite(false)} />}
    </div>
  );
}
