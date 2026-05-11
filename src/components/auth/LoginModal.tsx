import { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, ExternalLink, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { useT } from '../../lib/LanguageContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginWithCredentials: (email: string, password: string) => Promise<{ error?: string }>;
  onLoginWithHub: () => void;
}

export default function LoginModal({ onClose, onLoginWithCredentials, onLoginWithHub }: LoginModalProps) {
  const { language } = useT();
  const isEs = language === 'es';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const result = await onLoginWithCredentials(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
    // On success App will re-render with user, modal unmounts
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const t = {
    title: isEs ? 'Iniciar sesión' : 'Sign in',
    sub: isEs ? 'Usá tu cuenta del Hub de Asciende' : 'Use your Asciende Hub account',
    emailLabel: isEs ? 'Correo electrónico' : 'Email',
    emailPlaceholder: isEs ? 'tu@correo.com' : 'you@email.com',
    passwordLabel: isEs ? 'Contraseña' : 'Password',
    passwordPlaceholder: isEs ? 'Tu contraseña del Hub' : 'Your Hub password',
    signIn: isEs ? 'Ingresar' : 'Sign in',
    signing: isEs ? 'Ingresando…' : 'Signing in…',
    noAccount: isEs ? '¿No tenés cuenta?' : "Don't have an account?",
    register: isEs ? 'Registrate en el Hub' : 'Register on the Hub',
    orHub: isEs ? 'O ingresá desde el Hub' : 'Or sign in from the Hub',
    goHub: isEs ? 'Ir al Hub →' : 'Go to Hub →',
    errorGeneric: isEs ? 'Credenciales incorrectas. Verificá tu email y contraseña.' : 'Incorrect credentials. Check your email and password.',
  };

  const inputStyle = (field: 'email' | 'password') => ({
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focusedField === field ? 'rgba(253,218,54,0.5)' : error ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
    color: '#f1f5f9',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(253,218,54,0.08)' : 'none',
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,12,24,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden animate-fade-in"
        style={{
          background: '#0d1525',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(253,218,54,0.6), transparent)' }} />

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Brand lockup */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f9a825 100%)', boxShadow: '0 8px 24px rgba(253,218,54,0.3)' }}
            >
              <Activity className="w-7 h-7" style={{ color: '#0a0f1a' }} />
            </div>
            <h2
              className="text-xl tracking-widest mb-1.5"
              style={{ fontFamily: '"Krona One", sans-serif', color: '#fdda36' }}
            >
              BIOMECHANIC
            </h2>
            <p className="text-xs" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.35)' }}>
              Asciende Ecosystem
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8 space-y-4">
          <div className="text-center mb-5">
            <p className="text-base font-semibold" style={{ fontFamily: 'Jost, sans-serif', color: '#f1f5f9' }}>
              {t.title}
            </p>
            <p className="text-xs mt-1" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.4)' }}>
              {t.sub}
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
              {t.emailLabel}
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder={t.emailPlaceholder}
              autoComplete="email"
              required
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ ...inputStyle('email'), fontFamily: 'Jost, sans-serif' }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder={t.passwordPlaceholder}
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm"
                style={{ ...inputStyle('password'), fontFamily: 'Jost, sans-serif' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-xs leading-relaxed" style={{ fontFamily: 'Jost, sans-serif', color: '#fca5a5' }}>
                {error.toLowerCase().includes('credentials') || error.toLowerCase().includes('invalid') || error.toLowerCase().includes('401')
                  ? t.errorGeneric
                  : error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              fontFamily: 'Jost, sans-serif',
              background: loading || !email || !password ? 'rgba(253,218,54,0.3)' : '#fdda36',
              color: loading || !email || !password ? 'rgba(10,15,26,0.5)' : '#0a0f1a',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading && email && password) {
                e.currentTarget.style.filter = 'brightness(1.08)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(253,218,54,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.signing}
              </>
            ) : (
              t.signIn
            )}
          </button>

          {/* Register link */}
          <div className="text-center pt-1">
            <span className="text-xs" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.35)' }}>
              {t.noAccount}{' '}
            </span>
            <a
              href="https://hub.asciende.pro/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold inline-flex items-center gap-1 transition-all"
              style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(253,218,54,0.7)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fdda36'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(253,218,54,0.7)'; }}
            >
              {t.register}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs" style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.25)' }}>{t.orHub}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Hub redirect fallback */}
          <button
            type="button"
            onClick={onLoginWithHub}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              fontFamily: 'Jost, sans-serif',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t.goHub}
          </button>
        </form>
      </div>
    </div>
  );
}
