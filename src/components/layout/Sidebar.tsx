import { useState } from 'react';
import {
  Bike, Activity, LayoutDashboard, Users, BookOpen, FileText,
  Layers, Globe, Sun, Moon, Wind, Waves, Dumbbell, LogOut,
} from 'lucide-react';
import type { ActiveView } from '../../lib/types';
import { useT } from '../../lib/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import type { HubUser } from '../../contexts/AuthContext';

const NAV_ITEMS: {
  id: ActiveView;
  key: 'dashboard' | 'cycling' | 'running' | 'swimming' | 'weightlifting' | 'custom' | 'aerodynamics' | 'sessions' | 'athletes' | 'references';
  icon: React.ElementType;
  group?: 'analysis' | 'management';
}[] = [
  { id: 'dashboard', key: 'dashboard', icon: LayoutDashboard },
  { id: 'cycling-analysis', key: 'cycling', icon: Bike, group: 'analysis' },
  { id: 'running-analysis', key: 'running', icon: Activity, group: 'analysis' },
  { id: 'swimming-analysis', key: 'swimming', icon: Waves, group: 'analysis' },
  { id: 'weightlifting-analysis', key: 'weightlifting', icon: Dumbbell, group: 'analysis' },
  { id: 'aerodynamics', key: 'aerodynamics', icon: Wind, group: 'analysis' },
  { id: 'custom-analysis', key: 'custom', icon: Layers, group: 'analysis' },
  { id: 'sessions', key: 'sessions', icon: FileText, group: 'management' },
  { id: 'athletes', key: 'athletes', icon: Users, group: 'management' },
  { id: 'references', key: 'references', icon: BookOpen, group: 'management' },
];

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  user: HubUser | null;
  onSignOut: () => void;
}

const dm = {
  bg: '#1a1528',
  border: 'rgba(81,65,99,0.35)',
  text: '#94a3b8',
  textSecondary: 'rgba(253,218,54,0.5)',
  hoverBg: 'rgba(253,218,54,0.12)',
  hoverText: '#fdda36',
  statusBg: 'rgba(253,218,54,0.08)',
};

const lm = {
  bg: '#ffffff',
  border: '#e5e7eb',
  text: '#4b5563',
  textSecondary: '#9ca3af',
  hoverBg: '#f3f4f6',
  hoverText: '#514163',
  statusBg: 'rgba(81,65,99,0.05)',
};

export default function Sidebar({ activeView, onViewChange, darkMode, onToggleDark, user, onSignOut }: SidebarProps) {
  const [hovered, setHovered] = useState(false);
  const { t, language, setLanguage } = useT();

  const expanded = hovered;
  const th = darkMode ? dm : lm;
  const groups = ['', 'analysis', 'management'] as const;

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden lg:flex relative flex-col border-r transition-all duration-300 z-20 flex-shrink-0"
      style={{
        width: expanded ? '16rem' : '5rem',
        background: th.bg,
        borderColor: th.border,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-5 border-b overflow-hidden"
        style={{ borderColor: th.border, minHeight: '72px' }}
      >
        {/* Collapsed: show favicon; Expanded: show full logo */}
        {expanded ? (
          <img
            src="/asciende_the_athletes_support_platform.png"
            alt="Asciende"
            className="flex-shrink-0 h-8 w-auto object-contain transition-all duration-300"
            style={{ filter: darkMode ? 'brightness(0) invert(1)' : 'none', maxWidth: '140px' }}
          />
        ) : (
          <img
            src="/Asciendefavicon.png"
            alt="Asciende"
            className="flex-shrink-0 w-9 h-9 object-contain transition-all duration-300"
          />
        )}
        <div
          className="overflow-hidden transition-all duration-300 flex-shrink-0"
          style={{ width: expanded ? 'auto' : '0', opacity: expanded ? 1 : 0 }}
        >
          <span
            className="block font-heading text-xs tracking-widest whitespace-nowrap"
            style={{ color: darkMode ? '#fdda36' : '#514163' }}
          >
            BIOMECHANIC
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => (i.group ?? '') === group);
          if (items.length === 0) return null;
          const groupLabel = group === 'analysis' ? t.nav.analysis : group === 'management' ? t.nav.management : '';
          return (
            <div key={group} className="mb-3">
              {groupLabel && expanded && (
                <p
                  className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
                  style={{ color: th.textSecondary }}
                >
                  {groupLabel}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                const label = t.nav[item.key];
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    title={!expanded ? label : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-body transition-all duration-150 overflow-hidden"
                    style={active ? { background: '#fdda36', color: '#514163', fontWeight: 700 } : { color: th.text }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = th.hoverBg;
                        (e.currentTarget as HTMLButtonElement).style.color = th.hoverText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = '';
                        (e.currentTarget as HTMLButtonElement).style.color = th.text;
                      }
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span
                      className="whitespace-nowrap transition-all duration-300 overflow-hidden"
                      style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, maxWidth: expanded ? '160px' : '0' }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-1" style={{ borderColor: th.border }}>
        <button
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          title={t.common.language}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 overflow-hidden font-body"
          style={{ color: th.text }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = th.hoverBg;
            (e.currentTarget as HTMLButtonElement).style.color = th.hoverText;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
            (e.currentTarget as HTMLButtonElement).style.color = th.text;
          }}
        >
          <Globe className="w-4 h-4 flex-shrink-0" />
          <span
            className="whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden"
            style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, maxWidth: expanded ? '120px' : '0' }}
          >
            {language === 'es' ? 'Español' : 'English'}
          </span>
          <span
            className="text-xs font-bold transition-all duration-300"
            style={{
              marginLeft: expanded ? 'auto' : undefined,
              opacity: expanded ? 1 : 0,
              color: darkMode ? '#fdda36' : '#514163',
              width: expanded ? 'auto' : 0,
              overflow: 'hidden',
            }}
          >
            {language.toUpperCase()}
          </span>
        </button>

        <button
          onClick={onToggleDark}
          title="Toggle theme"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 overflow-hidden font-body"
          style={{ color: th.text }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = th.hoverBg;
            (e.currentTarget as HTMLButtonElement).style.color = th.hoverText;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
            (e.currentTarget as HTMLButtonElement).style.color = th.text;
          }}
        >
          {darkMode ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span
            className="whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden"
            style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, maxWidth: expanded ? '160px' : '0' }}
          >
            {darkMode ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        {user && (
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl overflow-hidden border"
            style={{ borderColor: th.border, background: th.statusBg }}
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold font-body"
              style={{ background: '#fdda36', color: '#514163' }}
            >
              {userInitial}
            </div>
            <span
              className="whitespace-nowrap text-xs font-medium transition-all duration-300 overflow-hidden truncate"
              style={{
                opacity: expanded ? 1 : 0,
                width: expanded ? 'auto' : 0,
                maxWidth: expanded ? '100px' : '0',
                color: th.text,
              }}
            >
              {user.email}
            </span>
          </div>
        )}

        <button
          onClick={onSignOut}
          title={language === 'es' ? 'Cerrar sesion' : 'Sign out'}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 overflow-hidden font-body"
          style={{ color: '#ef4444' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span
            className="whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden"
            style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, maxWidth: expanded ? '160px' : '0' }}
          >
            {language === 'es' ? 'Cerrar sesion' : 'Sign out'}
          </span>
        </button>
      </div>
    </aside>
  );
}
