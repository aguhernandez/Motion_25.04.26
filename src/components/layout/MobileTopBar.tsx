import { Activity, Sun, Moon, Globe, LogOut } from 'lucide-react';
import { useT } from '../../lib/LanguageContext';
import type { HubUser } from '../../contexts/AuthContext';

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  user: HubUser | null;
}

export default function MobileTopBar({ title, subtitle, darkMode, onToggleDark, onSignOut, user }: MobileTopBarProps) {
  const { language, setLanguage } = useT();

  const bg = darkMode ? '#1a1528' : '#ffffff';
  const border = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
  const titleColor = darkMode ? '#fdda36' : '#514163';
  const subColor = darkMode ? 'rgba(253,218,54,0.5)' : 'rgba(81,65,99,0.45)';
  const btnColor = darkMode ? '#94a3b8' : '#4b5563';
  const btnBg = darkMode ? 'rgba(81,65,99,0.2)' : '#f5f3f0';
  const btnBorder = darkMode ? 'rgba(81,65,99,0.3)' : 'rgba(81,65,99,0.12)';

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b"
      style={{ background: bg, borderColor: border, paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
    >
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f9a825 100%)' }}
          >
            <Activity className="w-4 h-4" style={{ color: '#514163' }} />
          </div>
          <div>
            <span className="block font-heading text-xs tracking-widest" style={{ color: titleColor }}>
              {title || 'BIOMECHANIC'}
            </span>
            {subtitle && <span className="block text-xs truncate max-w-[120px]" style={{ color: subColor }}>{subtitle}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-body transition-all"
            style={{ background: btnBg, border: `1px solid ${btnBorder}`, color: btnColor }}
          >
            <Globe className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleDark}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: btnBg, border: `1px solid ${btnBorder}`, color: btnColor }}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {user && (
            <div className="flex items-center gap-1.5 ml-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-body flex-shrink-0"
                style={{ background: '#fdda36', color: '#514163' }}
              >
                {userInitial}
              </div>
              <button
                onClick={onSignOut}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
