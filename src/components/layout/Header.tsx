import { Bell, Search, Plus } from 'lucide-react';
import { useT } from '../../lib/LanguageContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSession?: () => void;
  darkMode?: boolean;
}

const dm = {
  bg: 'rgba(26, 21, 40, 0.95)',
  border: 'rgba(81,65,99,0.35)',
  title: '#ffffff',
  subtitle: '#94a3b8',
  inputBg: 'rgba(81,65,99,0.15)',
  inputBorder: 'rgba(81,65,99,0.4)',
  inputText: '#cbd5e1',
  btnBg: 'rgba(81,65,99,0.2)',
  btnBorder: 'rgba(81,65,99,0.35)',
  btnColor: '#94a3b8',
};

const lm = {
  bg: 'rgba(245,243,240,0.95)',
  border: 'rgba(81,65,99,0.12)',
  title: '#514163',
  subtitle: 'rgba(81,65,99,0.55)',
  inputBg: '#ffffff',
  inputBorder: 'rgba(81,65,99,0.18)',
  inputText: '#514163',
  btnBg: '#ffffff',
  btnBorder: 'rgba(81,65,99,0.18)',
  btnColor: '#514163',
};

export default function Header({ title, subtitle, onNewSession, darkMode = true }: HeaderProps) {
  const { t } = useT();
  const th = darkMode ? dm : lm;

  return (
    <header
      className="hidden lg:flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm flex-shrink-0"
      style={{ background: th.bg, borderColor: th.border }}
    >
      <div>
        <h1 className="text-lg font-heading tracking-tight" style={{ color: th.title }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: th.subtitle }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: th.subtitle }}
          />
          <input
            type="text"
            placeholder={t.header.search}
            className="w-64 pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none transition-all"
            style={{
              background: th.inputBg,
              border: `1px solid ${th.inputBorder}`,
              color: th.inputText,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(253,218,54,0.6)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,218,54,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = th.inputBorder;
              e.currentTarget.style.boxShadow = '';
            }}
          />
        </div>

        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: th.btnBg,
            border: `1px solid ${th.btnBorder}`,
            color: th.btnColor,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(253,218,54,0.5)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(253,218,54,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = th.btnBorder;
            (e.currentTarget as HTMLButtonElement).style.background = th.btnBg;
          }}
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: '#fdda36' }}
          />
        </button>

        {onNewSession && (
          <button
            onClick={onNewSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: '#fdda36',
              color: '#514163',
              boxShadow: '0 1px 3px rgba(81,65,99,0.15)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(253,218,54,0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = '';
              (e.currentTarget as HTMLButtonElement).style.transform = '';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(81,65,99,0.15)';
            }}
          >
            <Plus className="w-4 h-4" />
            {t.header.newSession}
          </button>
        )}
      </div>
    </header>
  );
}
