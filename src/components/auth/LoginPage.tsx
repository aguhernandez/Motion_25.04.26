import { Activity, Sun, Moon, Globe, ExternalLink } from 'lucide-react';
import { useT } from '../../lib/LanguageContext';

interface LoginPageProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onLogin: () => void;
}

export default function LoginPage({ darkMode, onToggleDark, onLogin }: LoginPageProps) {
  const { language, setLanguage } = useT();
  const isEs = language === 'es';

  const bg = darkMode ? '#0a0f1a' : '#f5f3f0';
  const cardBg = darkMode ? '#1a1528' : '#ffffff';
  const cardBorder = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
  const titleColor = darkMode ? '#fdda36' : '#514163';
  const subColor = darkMode ? 'rgba(253,218,54,0.5)' : 'rgba(81,65,99,0.45)';
  const textColor = darkMode ? '#e2e8f0' : '#1f2937';
  const labelColor = darkMode ? '#94a3b8' : '#4b5563';
  const controlBg = darkMode ? 'rgba(81,65,99,0.2)' : '#f5f3f0';
  const controlBorder = darkMode ? 'rgba(81,65,99,0.35)' : 'rgba(81,65,99,0.12)';
  const dotColor = darkMode ? 'rgba(253,218,54,0.08)' : 'rgba(81,65,99,0.05)';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: bg }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: darkMode ? 'radial-gradient(circle, rgba(253,218,54,0.05) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(81,65,99,0.04) 0%, transparent 70%)' }}
      />

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all"
          style={{ background: controlBg, border: `1px solid ${controlBorder}`, color: labelColor }}
          onMouseEnter={(e) => { e.currentTarget.style.color = titleColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = labelColor; }}
        >
          <Globe className="w-3.5 h-3.5" />
          {language === 'es' ? 'EN' : 'ES'}
        </button>
        <button
          onClick={onToggleDark}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: controlBg, border: `1px solid ${controlBorder}`, color: labelColor }}
          onMouseEnter={(e) => { e.currentTarget.style.color = titleColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = labelColor; }}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div
        className="relative w-full max-w-md rounded-2xl border p-8 animate-fade-in"
        style={{
          background: cardBg,
          borderColor: cardBorder,
          boxShadow: darkMode ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(81,65,99,0.08)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f9a825 100%)' }}
          >
            <Activity className="w-8 h-8" style={{ color: '#514163' }} />
          </div>
          <h1 className="font-heading text-lg tracking-widest" style={{ color: titleColor }}>
            BIOMECHANIC LAB
          </h1>
          <p className="text-xs mt-1" style={{ color: subColor }}>
            Asciende Ecosystem
          </p>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold font-heading mb-3" style={{ color: textColor }}>
            {isEs ? 'Acceso requerido' : 'Authentication required'}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: labelColor }}>
            {isEs
              ? 'Esta aplicacion forma parte del ecosistema Asciende. Para acceder, inicia sesion desde el HUB central.'
              : 'This app is part of the Asciende ecosystem. To access it, sign in through the central HUB.'}
          </p>
        </div>

        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-body font-bold text-sm transition-all duration-200"
          style={{ background: '#fdda36', color: '#514163' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.05)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(253,218,54,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = '';
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <ExternalLink className="w-4 h-4" />
          {isEs ? 'Ir al HUB para iniciar sesion' : 'Go to HUB to sign in'}
        </button>

        <p className="text-center text-xs mt-5" style={{ color: labelColor }}>
          {isEs ? 'Seras redirigido a ' : 'You will be redirected to '}
          <span style={{ color: titleColor, fontWeight: 600 }}>hub.asciende.pro</span>
        </p>
      </div>
    </div>
  );
}
