import { useState } from 'react';
import {
  Bike, Activity, LayoutDashboard, Users, BookOpen, FileText,
  Layers, Wind, Waves, Dumbbell, MoreHorizontal, X,
} from 'lucide-react';
import type { ActiveView } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';

interface MobileBottomNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const NAV_ITEMS: { id: ActiveView; icon: React.ElementType; navKey: 'dashboard' | 'cycling' | 'running' | 'swimming' | 'weightlifting' | 'aerodynamics' | 'custom' | 'sessions' | 'athletes' | 'references' }[] = [
  { id: 'dashboard', icon: LayoutDashboard, navKey: 'dashboard' },
  { id: 'cycling-analysis', icon: Bike, navKey: 'cycling' },
  { id: 'running-analysis', icon: Activity, navKey: 'running' },
  { id: 'swimming-analysis', icon: Waves, navKey: 'swimming' },
  { id: 'weightlifting-analysis', icon: Dumbbell, navKey: 'weightlifting' },
  { id: 'aerodynamics', icon: Wind, navKey: 'aerodynamics' },
  { id: 'custom-analysis', icon: Layers, navKey: 'custom' },
  { id: 'sessions', icon: FileText, navKey: 'sessions' },
  { id: 'athletes', icon: Users, navKey: 'athletes' },
  { id: 'references', icon: BookOpen, navKey: 'references' },
];

const PRIMARY_COUNT = 4;

export default function MobileBottomNav({ activeView, onViewChange }: MobileBottomNavProps) {
  const { darkMode, t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  const bg = darkMode ? '#1a1528' : '#ffffff';
  const border = darkMode ? 'rgba(81,65,99,0.35)' : '#e5e7eb';
  const inactiveColor = darkMode ? '#94a3b8' : '#4b5563';
  const rowHover = darkMode ? 'rgba(253,218,54,0.08)' : '#f3f4f6';

  const primaryItems = NAV_ITEMS.slice(0, PRIMARY_COUNT);
  const moreItems = NAV_ITEMS.slice(PRIMARY_COUNT);
  const isMoreActive = moreItems.some((i) => i.id === activeView);

  const handleSelect = (id: ActiveView) => {
    onViewChange(id);
    setMoreOpen(false);
  };

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
      )}

      {moreOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 z-50 border-t animate-slide-up overflow-y-auto"
          style={{ bottom: '4rem', maxHeight: '60vh', background: bg, borderColor: border }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
            <span className="text-sm font-semibold font-body" style={{ color: inactiveColor }}>
              {t.nav.analysis} & {t.nav.management}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: rowHover, color: inactiveColor }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b font-body"
                style={{
                  background: active ? 'rgba(253,218,54,0.1)' : 'transparent',
                  borderColor: border,
                  color: active ? '#fdda36' : inactiveColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? '#fdda36' : rowHover }}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? '#514163' : inactiveColor }} />
                </div>
                <span className="text-sm font-medium">{t.nav[item.navKey]}</span>
                {active && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#fdda36' }} />}
              </button>
            );
          })}
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t"
        style={{
          background: bg,
          borderColor: border,
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingTop: '0.5rem',
        }}
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] transition-all font-body"
              style={{ background: active ? '#fdda36' : 'transparent', color: active ? '#514163' : inactiveColor }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{t.nav[item.navKey]}</span>
            </button>
          );
        })}

        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] transition-all font-body"
          style={{
            background: (moreOpen || isMoreActive) ? '#fdda36' : 'transparent',
            color: (moreOpen || isMoreActive) ? '#514163' : inactiveColor,
          }}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xs font-medium">Mas</span>
        </button>
      </nav>
    </>
  );
}
